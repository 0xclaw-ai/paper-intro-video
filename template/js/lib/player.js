/* player.js — builds the timeline once the fonts are in, then drives it: live preview controls,
 * and the hooks the offline renderer uses.
 *
 * URL parameters
 *   ?lang=en|off      caption language (default en; any language the script has captions for)
 *   ?voice=off        the plan, as if nobody spoke
 *   ?t=42.5           start paused at a given time
 *   ?cut=<name>       a shorter cut, if js/script.js defines one
 *   ?capture=1        renderer mode: no UI, stage pinned at 1920×1080, driven by window.__seek(t)
 *   ?caponly=1        renderer mode: captions only, on a transparent page
 */
(function () {
  'use strict';
  const SCRIPT = window.OXSCRIPT;
  const q = new URLSearchParams(location.search);
  const capture = q.has('capture');
  const stage = document.getElementById('stage');
  const curtain = document.getElementById('curtain');
  let tl = null;

  function setLang(lang) {
    window.OXLANG = lang;
    document.body.classList.toggle('nocap', lang === 'off');
  }
  setLang(q.get('lang') || 'en');
  if (capture) document.body.classList.add('capture');
  if (q.has('caponly')) {   // renderer: captions only, on a transparent page
    document.body.classList.add('caponly');
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
  }
  for (const img of document.images) img.decoding = 'sync';

  // every face the page uses has to be in before anything is measured; a film with other fonts sets window.OXFACES
  const FACES = window.OXFACES || ['400 20px Newsreader', '500 20px Newsreader', '600 20px Newsreader', 'italic 400 20px Newsreader', 'italic 500 20px Newsreader',
    '400 20px "DM Sans"', '500 20px "DM Sans"', '600 20px "DM Sans"', '700 20px "DM Sans"',
    '400 20px "JetBrains Mono"', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '500 20px Caveat', '700 20px Caveat'];
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  window.__ready = (async () => {
    // Fonts first: the hand-drawn marks are measured against the real glyphs.
    const text = document.body.textContent + ' 0123456789×−·→✓●○›…%@/+—';
    await Promise.race([document.fonts.ready, wait(8000)]);
    await Promise.race([Promise.allSettled(FACES.map((f) => document.fonts.load(f, text))), wait(12000)]);
    await Promise.all(Array.from(document.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null)));

    // Build with every scene laid out, so marks and arrows can be measured.
    stage.classList.add('measuring');
    tl = window.OXTL = window.OXBUILD();
    stage.classList.remove('measuring');
    await Promise.all(Array.from(document.images).map((img) => (img.decode ? img.decode().catch(() => {}) : null)));

    // the film starts on its first composed frame; at the very end it fades to the cover colour
    tl.ambient((t) => {
      const o = Math.max((t - (tl.duration - 0.6)) / 0.55, 0);
      const v = Math.min(1, o).toFixed(3);
      if (curtain._v !== v) { curtain.style.opacity = v; curtain._v = v; }
    });
    tl.seek(parseFloat(q.get('t') || '0'));
    const has = (f) => document.fonts.check(f);
    return {
      cut: SCRIPT.cut, duration: tl.duration, fps: SCRIPT.fps,
      fonts: { serif: has('500 40px Newsreader'), sans: has('500 20px "DM Sans"'), mono: has('500 20px "JetBrains Mono"'), hand: has('700 40px Caveat') },
      scenes: SCRIPT.scenes.map((s) => ({ id: s.id, start: s.start, dur: s.dur })),
    };
  })();
  window.__seek = (t) => { tl.seek(t); return true; };
  window.__sfx = () => ({ cut: SCRIPT.cut, duration: tl.duration, marks: tl.marks, events: tl.sfx.slice().sort((x, y) => x.t - y.t) });
  window.__setLang = setLang;

  if (capture) return;

  /* ───────────── interactive preview ───────────── */
  const playBtn = document.getElementById('pl-play'), seekBar = document.getElementById('pl-seek');
  const timeLbl = document.getElementById('pl-time'), capSel = document.getElementById('pl-cap');
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = q.get('audio') || `audio/${SCRIPT.cut}/soundtrack.wav`;
  let hasAudio = false;
  audio.addEventListener('canplaythrough', () => { hasAudio = true; });
  audio.addEventListener('error', () => { hasAudio = false; });

  let playing = false, t = parseFloat(q.get('t') || '0'), last = 0;
  const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  function fit() {
    const availH = innerHeight - 54, s = Math.min(innerWidth / 1920, availH / 1080);
    stage.style.transform = `translate(${((innerWidth - 1920 * s) / 2).toFixed(1)}px,${((availH - 1080 * s) / 2).toFixed(1)}px) scale(${s.toFixed(5)})`;
  }
  function render() {
    tl.seek(t);
    timeLbl.textContent = `${fmt(t)} / ${fmt(tl.duration)}`;
    seekBar.value = Math.round((t / tl.duration) * 1000);
  }
  function frame(now) {
    if (playing) {
      if (hasAudio && !audio.paused) t = audio.currentTime;
      else t += (now - last) / 1000;
      last = now;
      if (t >= tl.duration) { t = tl.duration; pause(); }
      render();
    }
    requestAnimationFrame(frame);
  }
  function play() {
    if (t >= tl.duration - 0.05) t = 0;
    playing = true; last = performance.now(); playBtn.textContent = 'Pause';
    if (hasAudio) { audio.currentTime = t; audio.play().catch(() => {}); }
  }
  function pause() { playing = false; playBtn.textContent = 'Play'; audio.pause(); }
  function jump(to) { t = Math.max(0, Math.min(tl.duration, to)); if (hasAudio) audio.currentTime = t; render(); }

  fit();
  addEventListener('resize', fit);
  window.__ready.then(() => {
    playBtn.onclick = () => (playing ? pause() : play());
    seekBar.oninput = () => jump((seekBar.value / 1000) * tl.duration);
    capSel.value = window.OXLANG;
    capSel.onchange = () => { setLang(capSel.value); render(); };
    addEventListener('keydown', (e) => {
      if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
      else if (e.code === 'ArrowRight') jump(t + 1);
      else if (e.code === 'ArrowLeft') jump(t - 1);
      else if (e.key === '.') jump(t + 1 / SCRIPT.fps);
      else if (e.key === ',') jump(t - 1 / SCRIPT.fps);
    });
    render();
    requestAnimationFrame(frame);
  });
})();
