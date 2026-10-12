/* build.js — turns the script (js/script.js) and the voice (js/voice.js, js/pacing.js) into the film's timing.
 *
 * js/script.js holds the words and the plan:   { slug, title, beat, cuts, captions, chapters, scenes: [ … ] }
 *
 * A scene is a lead-in, a list of narration cues and a tail. Cues are laid out one after another:
 *   id        the name js/scenes.js refers to (c.<id>)
 *   dur       your guess of how long the line takes (seconds). The first voice replaces the guess (narration.py --as-plan);
 *             from then on the line lasts as long as it is really spoken
 *   gap       pause before the next cue (default 0.4)
 *   en        the caption text (and any other caption language listed in `captions`, e.g. zh)
 *   say       how a voice should say it, where that differs: "Zero X Claw", "ninety-three percent"
 *   caps:'each'  one caption per sentence/item (default: split long lines by length)
 *   breath    the pause this line needs between its sentences, in seconds, when each sentence brings a new
 *             picture that has to be seen (tools/narration.py lengthens shorter pauses of the voice)
 *   cut:'full'   only in that cut;   full: {…}   field overrides for that cut (only if `cuts` lists several)
 * Scene lengths are rounded up to a multiple of `beat` (0.6 s), so every scene change lands on the grid.
 *
 * build(cut) returns { duration, scenes, cues, captions, voice, plan } — js/lib/stage.js anchors every
 * animation to it, the sound follows the animations, and captions/.srt/.vtt/narration script are exported from it.
 */
(function (root) {
  const NODE = typeof module !== 'undefined' && module.exports;
  const load = (file, name) => { try { return NODE ? require(file) : root[name]; } catch (e) { return null; } };
  const FILM = load('../script.js', 'OXFILM');
  if (!FILM || !FILM.scenes) throw new Error('js/script.js has to define the film: { scenes: [...] }');
  const BEAT = FILM.beat || 0.6, SCENES = FILM.scenes, CHAPTERS = FILM.chapters || [], CUTS = FILM.cuts || ['full'], LANGS = FILM.captions || ['en'];

  /* Long narration lines are shown as several short captions (at most about two lines on screen). */
  function splitCaption(text, max, hard, soft) {
    if (text.length <= max) return [text];
    let parts = text.split(hard).map((x) => x.trim()).filter(Boolean);
    parts = parts.flatMap((part) => {                       // a sentence that is still too long: break at a comma near the middle
      if (part.length <= max) return [part];
      const cuts = [];
      let m;
      const re = new RegExp(soft.source, 'g');
      while ((m = re.exec(part))) { cuts.push(m.index + m[0].length); if (!m[0].length) re.lastIndex++; }
      if (!cuts.length) return [part];
      const mid = cuts.reduce((best, x) => (Math.abs(x - part.length / 2) < Math.abs(best - part.length / 2) ? x : best), cuts[0]);
      return [part.slice(0, mid).trim(), part.slice(mid).trim()];
    });
    const out = [];
    for (const part of parts) {
      const last = out[out.length - 1];
      const joined = last === undefined ? part : last + (/[\u4e00-\u9fff]$/.test(last) || /^[\u4e00-\u9fff]/.test(part) ? '' : ' ') + part;
      if (last !== undefined && joined.length <= max) out[out.length - 1] = joined;
      else out.push(part);
    }
    return out;
  }
  const CAPTION = {
    en: (t) => splitCaption(t, 92, /(?<=[.?!:])\s+|(?<=\s—)\s+/, /,\s+/),
    zh: (t) => splitCaption(t, 36, /(?<=[\u3002\uff1f\uff01\uff1b\uff1a])|(?<=——)/, /(?<=\uff0c)/).map((x) => x.replace(/[\uff1b\uff0c]$/, '')),
  };
  const EACH = {
    en: (t) => t.split(/(?<=[.?!])\s+/).filter(Boolean),
    zh: (t) => t.split(/(?<=[\u3001\u3002\uff1f])/).map((x) => x.replace(/[\u3001\u3002]$/, '')).filter(Boolean),
  };

  /* Two clocks.
   *   the plan   the windows in js/script.js, and js/pacing.js: when each word was expected to be said when the
   *              scenes were timed. js/scenes.js is written on this clock.
   *   the film   what is rendered. Without a voice it is the plan. With one (js/voice.js: when each word
   *              is really said) every line lasts as long as it is spoken, plus the breathing room the
   *              plan gave it, and each scene gets a map from plan time to film time that runs through
   *              every word — so a picture timed to a word stays on that word, whoever speaks.
   * Both files are written by tools/narration.py. */
  const VOICE = load('../voice.js', 'OXVOICE'), PACING = load('../pacing.js', 'OXPACING');
  const LEAD = 0.06, HOLD = 0.5;                            // a caption comes in just before its first word and stays a moment after the last
  const plain = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
  /** piecewise-linear map through the knots xs -> ys (both increasing); it runs on at slope 1 outside them */
  function warp(xs, ys, x) {
    const n = xs.length;
    if (!n) return x;
    if (x <= xs[0]) return ys[0] + (x - xs[0]);
    if (x >= xs[n - 1]) return ys[n - 1] + (x - xs[n - 1]);
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) lo = mid; else hi = mid; }
    return ys[lo] + ((x - xs[lo]) * (ys[hi] - ys[lo])) / (xs[hi] - xs[lo]);
  }
  /** When each word of the caption text starts, given when each spoken word starts. The two texts differ
   *  only where a word is spelled out for the voice ("0xClaw" / "Zero X Claw", "93%" / "ninety-three percent"). */
  function alignWords(en, say, times) {
    const A = en.split(/\s+/).filter(Boolean), B = say.split(/\s+/).filter(Boolean);
    if (!times || B.length !== times.length) return null;
    const a = A.map(plain), b = B.map(plain), n = A.length, m = B.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));   // longest common subsequence
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] && a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const pairs = [];
    for (let i = 0, j = 0; i < n && j < m;) {
      if (a[i] && a[i] === b[j]) pairs.push([i++, j++]);
      else if (L[i + 1][j] >= L[i][j + 1]) i++;
      else j++;
    }
    const t = new Array(n);
    let pi = -1, pj = -1;
    for (const [qi, qj] of pairs.concat([[n, m]])) {         // words between two matches share the spoken words between them
      const ea = qi - pi - 1, sb = qj - pj - 1;
      for (let k = 0; k < ea; k++) t[pi + 1 + k] = times[Math.min(m - 1, pj + 1 + (sb ? Math.floor((k * sb) / ea) : 0))];
      if (qi < n) t[qi] = times[qj];
      pi = qi; pj = qj;
    }
    return { words: A, t };
  }

  function build(cut, opts) {
    if (CUTS.indexOf(cut) < 0) throw new Error('unknown cut: ' + cut);
    const r1 = (v) => Math.round(v * 1000) / 1000;
    const beats = (v) => r1(Math.ceil(v / BEAT - 1e-6) * BEAT);
    const voice = opts && opts.voice === false ? null : (VOICE && VOICE.cut === cut && VOICE.cues && Object.keys(VOICE.cues).length ? VOICE : null);
    const pacing = PACING && PACING.cut === cut && PACING.cues ? PACING.cues : {};
    const out = { cut, slug: FILM.slug || 'film', title: FILM.title || '', fps: 30, beat: BEAT, chapters: CHAPTERS, posters: FILM.posters || [], scenes: [], cues: [], captions: Object.fromEntries(LANGS.map((l) => [l, []])),
      voice: voice ? { name: voice.name, engine: voice.voice, lines: 0, stale: [] } : null, plan: { duration: 0 } };
    let t = 0;                                                // film time
    for (const src of SCENES) {
      const sv = src[cut] && typeof src[cut] === 'object' ? Object.assign({}, src, src[cut]) : src;        // a cut may override fields: full: { tail: 5.2 }
      // c, d, w and plan.dur are on the plan's clock (what js/scenes.js is written against); start, dur and cues[].at are film time
      const sc = { id: sv.id, title: sv.title || sv.id, chapter: sv.chapter, start: r1(t), cues: [], c: {}, d: {}, w: {}, plan: {}, map: { p: [0], a: [0] } };
      const knot = (p, a) => {                                // keep the map strictly increasing, and deaf to glitches in the word times
        const P = sc.map.p, A = sc.map.a, dp = p - P[P.length - 1], da = a - A[A.length - 1];
        if (dp > 0.04 && da > 0.04 && da / dp > 0.2 && da / dp < 5) { P.push(r1(p)); A.push(r1(a)); return true; }
        return false;
      };
      const later = [];                                       // words that have no planned time: placed once the map is complete
      let at = sv.lead, end = sv.lead;                        // plan
      let bt = sv.lead, bend = sv.lead;                       // film
      const list = sv.cues.filter((raw) => !raw.cut || raw.cut === cut);
      list.forEach((raw, idx) => {
        const c = raw[cut] && typeof raw[cut] === 'object' ? Object.assign({}, raw, raw[cut]) : raw;
        const say = c.say || c.en, key = sv.id + '/' + c.id;
        const pause = idx === list.length - 1 ? sv.tail : (c.gap === undefined ? 0.4 : c.gap);   // silence after this line
        const v = voice && voice.cues[key], ref = pacing[key];
        const spoken = v && v.say === say ? alignWords(c.en, say, v.w) : null;        // this line, as the voice says it
        const planned = ref && ref.say === say ? alignWords(c.en, say, ref.w) : null; // … and as the scenes expect it
        if (v && !spoken) out.voice.stale.push(key);
        const win = planned && ref.dur ? ref.dur : c.dur;     // the planned window: the first voice's own, once it has been laid in with --as-plan
        // how long the line lasts in the film: as long as it is spoken, plus the room the plan left after it
        const dur = spoken ? r1(v.len + (planned ? Math.max(0.1, win - ref.len) : 0.5)) : win;
        knot(at, bt);
        if (spoken && planned) {
          for (let k = 0; k < ref.w.length; k++) knot(at + ref.w[k], bt + v.w[k]);
          knot(at + ref.len, bt + v.len);
        }
        if (!knot(at + win, bt + dur)) { sc.map.p.pop(); sc.map.a.pop(); knot(at + win, bt + dur); }
        if (planned) sc.w[c.id] = { words: planned.words, t: planned.t.map((x) => r1(at + x)), end: r1(at + ref.len) };
        else if (spoken) later.push({ id: c.id, words: spoken.words, t: spoken.t.map((x) => bt + x), end: bt + v.len });
        if (spoken) out.voice.lines++;
        sc.cues.push({ id: c.id, at: r1(bt), dur, en: c.en, zh: c.zh, say, speech: spoken ? v.len : null });
        sc.c[c.id] = r1(at);
        sc.d[c.id] = win;
        out.cues.push({ scene: sv.id, id: c.id, start: r1(t + bt), end: r1(t + bt + dur), en: c.en, zh: c.zh, say, speech: spoken ? v.len : null, planned: win, breath: c.breath || 0 });
        const span = spoken ? Math.min(v.len + HOLD, dur + pause - 0.12) : dur;   // how long this line's captions are up
        for (const lang of LANGS) {
          if (!c[lang]) continue;                             // this line has no text in that language
          const each = c.caps === 'each';                     // one caption per sentence/item
          const segs = each ? (EACH[lang] || EACH.en)(c[lang]) : (CAPTION[lang] || CAPTION.en)(c[lang]);
          const total = segs.reduce((n, x) => n + x.length, 0);
          let u = t + bt, word = 0;
          segs.forEach((text, k) => {
            let stop;
            if (k === segs.length - 1) stop = t + bt + span;
            else if (spoken && lang === 'en') {               // … changes when the voice reaches the next segment's first word
              word += text.split(/\s+/).filter(Boolean).length;
              stop = t + bt + Math.max(spoken.t[Math.min(word, spoken.t.length - 1)] - LEAD, 0);
            } else stop = u + (each ? span / segs.length : (span * text.length) / total);   // … or shares the time by length
            out.captions[lang].push({ start: r1(u), end: r1(stop), text });
            u = stop;
          });
        }
        end = at + win; at = end + pause;
        bend = bt + dur; bt = bend + pause;
      });
      sc.plan.dur = beats(end + sv.tail);                     // scene lengths stay on the beat on both clocks
      sc.dur = beats(bend + sv.tail);
      if (!knot(sc.plan.dur, sc.dur)) { sc.map.p.pop(); sc.map.a.pop(); knot(sc.plan.dur, sc.dur); }
      for (const w of later) sc.w[w.id] = { words: w.words, t: w.t.map((x) => r1(warp(sc.map.a, sc.map.p, x))), end: r1(warp(sc.map.a, sc.map.p, w.end)) };
      out.scenes.push(sc);
      t += sc.dur;
      out.plan.duration = r1(out.plan.duration + sc.plan.dur);
    }
    out.duration = r1(t);
    return out;
  }

  if (NODE) module.exports = { build, CUTS, warp, FILM };
  else {
    const q = new URLSearchParams(root.location.search);
    root.OXWARP = warp;
    root.OXSCRIPT = build(q.get('cut') || CUTS[CUTS.length - 1], { voice: q.get('voice') !== 'off' });   // ?voice=off: the plan, without a voice
  }
})(typeof window !== 'undefined' ? window : globalThis);
