// Render the video.
//
//   node tools/render.mjs                         the film, without captions and with English captions, 1080p30
//   node tools/render.mjs --variants en           one variant only (clean | en | any other caption language of the script)
//   node tools/render.mjs --from 75 --to 110      a time range, for quick checks (no sound)
//   node tools/render.mjs --dpr 2                 3840×2160 master
//   node tools/render.mjs --audio audio/full/soundtrack.wav,-3 --audio build/full/narration.wav,0 --duck build/full/voice.json,-8 --lufs -16
//
// Sound: with a narration (tools/narration.py has written js/voice.js and build/<cut>/narration.wav) the
// default mix is the voice over the bed, the bed lowered while somebody speaks, at -16 LUFS; without one it
// is the bed alone. Either way the bed has to be made for the current timing first (tools/music.py).
//
// How it works: several headless-Chromium tabs load index.html?capture=1 and render frames in
// parallel (every frame is a pure function of time, see js/lib/engine.js). Frames are captured once,
// without captions, and streamed in order to one encoder per variant; the caption variants
// composite pre-rendered caption overlays, so three videos cost one capture pass. Audio is muxed last.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cpus } from 'node:os';
import { launch } from './cdp.mjs';
import { findPython } from './env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? argv[i + 1] : def; };
const args = (name) => argv.flatMap((a, i) => (a === '--' + name ? [argv[i + 1]] : []));
const cut = arg('cut', 'full');
const variants = arg('variants', 'clean,en').split(',');
const workers = Number(arg('workers', Math.max(2, Math.min(8, Math.floor(cpus().length / 3)))));
const dpr = Number(arg('dpr', '1'));
const crf = arg('crf', '15');
const preset = arg('preset', 'slow');
const outDir = resolve(root, arg('out', 'out'));
const tag = arg('tag', dpr > 1 ? `_${Math.round(1080 * dpr)}p` : '');
const bdir = join(root, 'build', cut);
const defaultAudio = join(root, 'audio', cut, 'soundtrack.wav');
const wavSeconds = (file) => { const b = readFileSync(file); return (b.length - 44) / b.readUInt32LE(28); };   // canonical PCM header

mkdirSync(join(bdir, 'captions'), { recursive: true });
mkdirSync(outDir, { recursive: true });
const ex = spawnSync(process.execPath, [join(root, 'tools', 'export_script.mjs'), '--cut', cut, '--quiet'], { stdio: 'inherit' });
if (ex.status !== 0) throw new Error('export_script failed');
const timing = JSON.parse(readFileSync(join(bdir, 'timing.json'), 'utf8'));
const narration = join(bdir, 'narration.wav');
const spoken = Boolean(timing.voice);
if (spoken && !(existsSync(narration) && Math.abs(wavSeconds(narration) - timing.duration) < 0.05)) throw new Error('build/' + cut + '/narration.wav does not belong to js/voice.js: run tools/narration.py again');
const audio = args('audio').length ? args('audio') : !existsSync(defaultAudio) ? [] : spoken ? [defaultAudio + ',-3', narration + ',0'] : [defaultAudio + ',0'];
const duck = arg('duck', spoken && !args('audio').length ? join(bdir, 'voice.json') + ',-8' : null);
const loud = arg('lufs', spoken && !args('audio').length ? '-16' : null);
if (!args('audio').length && existsSync(defaultAudio) && Math.abs(wavSeconds(defaultAudio) - timing.duration) > 0.2) {
  throw new Error(`audio/${cut}/soundtrack.wav is ${wavSeconds(defaultAudio).toFixed(1)}s long but the film is ${timing.duration}s: run  node tools/export_sfx.mjs && python tools/music.py  first`);
}
const fps = timing.fps;
const t0 = Number(arg('from', '0')), t1 = Number(arg('to', String(timing.duration)));
const first = Math.round(t0 * fps), last = Math.round(t1 * fps);
const total = last - first;
const partial = t0 > 0 || t1 < timing.duration;
const python = findPython('av');
const pageUrl = (q) => pathToFileURL(join(root, 'index.html')).href + `?capture=1&cut=${cut}&` + q;

const started = Date.now();
const browser = await launch({ width: 1920, height: 1080 });
console.log(`cut     : ${cut} (${timing.duration}s) · ${spoken ? `voice "${timing.voice.name}", ${timing.voice.lines} lines` : 'no voice'}\nbrowser : ${browser.exe}\npython  : ${python}\nrender  : ${total} frames (${t0}s – ${t1}s) @ ${fps} fps, ${1920 * dpr}×${1080 * dpr}, ${workers} tabs, variants: ${variants.join(', ')}`);

try {
  /* 1 — caption overlays (transparent PNGs, one per caption segment and language) */
  const capFiles = {};
  for (const lang of variants.filter((v) => v !== 'clean')) {
    const page = await browser.newPage('about:blank', { dpr });
    await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await page.goto(pageUrl(`lang=${lang}&caponly=1`));
    await page.eval('window.__ready');
    const list = [];
    const segs = timing.captions[lang];
    for (let i = 0; i < segs.length; i++) {
      const c = segs[i];
      await page.eval(`Promise.resolve(window.__seek(${(c.start + c.end) / 2})).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
      const box = await page.eval(`(() => { const r = document.getElementById('cap-text').getBoundingClientRect(); const m = 40; return { x: Math.max(0, Math.floor(r.left) - m), y: Math.max(0, Math.floor(r.top) - m), width: Math.ceil(r.width) + 2 * m, height: Math.min(1080 - Math.max(0, Math.floor(r.top) - m), Math.ceil(r.height) + 2 * m) }; })()`);
      const file = join(bdir, 'captions', `${lang}_${String(i).padStart(2, '0')}.png`);
      writeFileSync(file, await page.screenshot({ clip: box }));
      list.push({ start: c.start, end: c.end, png: file, x: box.x, y: box.y });
    }
    capFiles[lang] = join(bdir, 'captions', `${lang}.json`);
    writeFileSync(capFiles[lang], JSON.stringify(list));
    await page.close();
  }

  /* 2 — encoders, one per variant */
  const encoders = variants.map((v) => {
    const file = join(bdir, `video_${v}${tag}${partial ? '_part' : ''}.mp4`);
    const a = [join(root, 'tools', 'encode.py'), '--out', file, '--fps', String(fps), '--crf', crf, '--preset', preset, '--scale', String(dpr), '--start', String(first / fps)];
    if (v !== 'clean') a.push('--captions', capFiles[v]);
    const proc = spawn(python, a, { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => proc.on('exit', (code) => (code === 0 ? res() : rej(new Error(`encoder ${v} exited with ${code}`)))));
    return { v, file, proc, done };
  });
  const feed = async (buf) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(buf.length);
    await Promise.all(encoders.map((e) => new Promise((res) => {
      e.proc.stdin.write(head);
      if (e.proc.stdin.write(buf)) res(); else e.proc.stdin.once('drain', res);
    })));
  };

  /* 3 — capture: tabs pull frame numbers from a shared counter, a writer restores the order */
  const pages = [];
  for (let w = 0; w < workers; w++) {
    const p = await browser.newPage('about:blank', { dpr });
    await p.goto(pageUrl('lang=off'));
    const info = await p.eval('window.__ready');
    if (w === 0) console.log(`fonts   : ${Object.entries(info.fonts).map(([k, v]) => `${k}=${v}`).join(' ')}${Object.values(info.fonts).every(Boolean) ? '' : '  (falling back to local fonts)'}`);
    pages.push(p);
  }
  let next = first, written = first;
  const ready = new Map();
  let flushing = Promise.resolve();
  const flush = () => (flushing = flushing.then(async () => {
    while (ready.has(written)) {
      const buf = ready.get(written);
      ready.delete(written);
      await feed(buf);
      written++;
      if ((written - first) % 300 === 0 || written === last) {
        const el = (Date.now() - started) / 1000, done = written - first;
        console.log(`  ${String(done).padStart(5)}/${total} frames  ${(done / el).toFixed(1)} fps  eta ${Math.max(0, Math.round((total - done) / (done / el)))}s`);
      }
    }
  }));
  await Promise.all(pages.map(async (p) => {
    for (;;) {
      const i = next++;
      if (i >= last) return;
      while (ready.size > workers * 6) await new Promise((r) => setTimeout(r, 15));   // back-pressure
      await p.eval(`Promise.resolve(window.__seek(${i / fps})).then(() => new Promise(r => requestAnimationFrame(() => r(1))))`);
      ready.set(i, await p.screenshot());
      flush();
    }
  }));
  await flush();
  const bad = pages.flatMap((p) => p.consoleLog.filter((l) => /exception|error/i.test(l) && !/swiftshader|GroupMarker/i.test(l)));
  if (bad.length) console.log('page console:\n' + [...new Set(bad)].slice(0, 10).join('\n'));
  for (const e of encoders) e.proc.stdin.end(Buffer.alloc(4));
  await Promise.all(encoders.map((e) => e.done));
  console.log(`captured + encoded in ${((Date.now() - started) / 1000).toFixed(0)}s`);

  /* 4 — mux audio */
  const SUFFIX = { clean: '', en: '_captions_en', zh: '_captions_zh' };
  for (const e of encoders) {
    const name = timing.slug + (timing.cuts.length > 1 ? `_${cut}` : '');                 // <slug>.mp4, <slug>_captions_en.mp4
    const out = join(outDir, `${name}${SUFFIX[e.v] ?? '_captions_' + e.v}${tag}${partial ? `_${t0}-${t1}` : ''}.mp4`);
    const a = [join(root, 'tools', 'mux.py'), '--video', e.file, '--out', out];
    if (!partial) for (const s of audio) a.push('--audio', resolve(root, s.split(',')[0]) + (s.includes(',') ? s.slice(s.indexOf(',')) : ''));
    if (duck && !partial) a.push('--duck', duck);
    if (loud && !partial) a.push('--lufs', loud);
    if (timing.title) a.push('--title', timing.title);
    const r = spawnSync(python, a, { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('mux failed for ' + e.v);
  }
} finally {
  await browser.close();
}
console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
