// A layout audit of every frame: what a viewer would see go wrong, measured in the page itself.
//   node tools/audit_frames.mjs [--cut full] [--fps 30] [--from 0] [--to END] [--out build/audit] [--blocks SELECTOR]
//
// For each frame (the film's own 30 fps grid by default) it seeks the page and checks:
//   cut      text cut by the edge of the frame (only reported where it lasts, so camera moves and page turns,
//            which carry text across the edge on purpose, show up as short spans to look at, not as errors)
//   masked   text cut by its own word mask for longer than a word takes to rise (a clipped descender)
//   overlap  two pieces of visible text on top of each other (the caption line included)
//   covers   visible text under a visible picture or card it does not belong to (pictures, videos, canvases and
//            anything marked data-block; --blocks replaces that selector)
//   image    a visible picture that has not loaded or decoded (it would render as an empty box)
// Text counts as visible from 30 % effective opacity; everything is clipped the way the page clips it.
// Output: build/audit/frames.json (every finding, per frame), build/audit/spans.json and a summary on stdout.
// Read the spans, not the count: a camera move or a page turn shows up as a short span by design; a span that
// lasts is a fault. A five-minute film takes about as long to audit as to render.
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(root, arg('out', 'build/audit'));
const BLOCKS = arg('blocks', 'img, video, canvas, [data-block]');
mkdirSync(out, { recursive: true });

// runs in the page: findings for the frame that is on screen now
const AUDIT = `(() => {
  const W = 1920, H = 1080, stage = document.getElementById('stage');
  const sr = stage.getBoundingClientRect();
  const rel = (b) => ({ l: b.left - sr.left, t: b.top - sr.top, r: b.right - sr.left, b: b.bottom - sr.top });
  const inter = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) });
  const area = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t);
  const cache = new Map();
  // effective opacity and the clip of everything above an element, up to the stage
  function look(el) {
    if (cache.has(el)) return cache.get(el);
    let v;
    const frame = { l: 0, t: 0, r: W, b: H };
    if (!el || el === stage) v = { o: 1, clip: frame, fclip: frame, mask: false };
    else {
      const up = look(el.parentElement), cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || up.o === 0) v = { o: 0 };
      else {
        const o = up.o * parseFloat(cs.opacity);
        let clip = up.clip, fclip = up.fclip, mask = up.mask;
        if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          const r = rel(el.getBoundingClientRect());
          clip = inter(clip, r);                                   // everything that clips
          if (el.classList.contains('scene') || el.classList.contains('station')) fclip = inter(fclip, r);   // … the frame's edges only
          if (el.classList.contains('w')) mask = true;
        }
        v = { o, clip, fclip, mask };
      }
    }
    cache.set(el, v);
    return v;
  }
  const roots = [...document.querySelectorAll('#stage > .scene')].filter((s) => s.style.display === 'block')
    .concat([document.getElementById('hud'), document.getElementById('captions')]);
  const runs = [], found = [];
  const name = (el) => (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '') || el.tagName;
  const where = (el) => { const s = el.closest('.scene'); return s ? s.id : (el.closest('#hud') ? 'hud' : 'captions'); };
  for (const r0 of roots) {
    const tw = document.createTreeWalker(r0, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) {
      const text = n.textContent.trim();
      if (!text) continue;
      const el = n.parentElement, v = look(el);
      if (!v.o || v.o < 0.3) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      for (const b of range.getClientRects()) {
        const box = rel(b);
        if (area(box) < 4) continue;
        const vis = inter(box, v.clip), a0 = area(box), a1 = area(vis), af = area(inter(box, v.fclip));
        if (a1 < 1) continue;
        if (af < a0 * 0.97) found.push({ kind: 'cut', who: where(el) + ' ' + name(el), text: text.slice(0, 32), seen: +(af / a0).toFixed(2) });
        else if (a1 < a0 * 0.97) found.push({ kind: v.mask ? 'masked' : 'boxcut', who: where(el) + ' ' + name(el), text: text.slice(0, 32), seen: +(a1 / a0).toFixed(2) });
        runs.push({ el, box: vis, text, o: v.o });
      }
    }
  }
  // overlaps between pieces of text from unrelated elements (a word's own mask and its rising text are one element),
  // measured on the ink, not the line box: a big numeral's line box reaches into the label under it
  const ink = (b) => { const h = b.b - b.t; return { l: b.l, r: b.r, t: b.t + h * 0.18, b: b.b - h * 0.18 }; };
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
    const A = runs[i], B = runs[j];
    if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
    const c = area(inter(ink(A.box), ink(B.box)));
    if (c > 30 && c > 0.04 * Math.min(area(ink(A.box)), area(ink(B.box))))
      found.push({ kind: 'overlap', who: where(A.el) + ' ' + name(A.el) + ' × ' + where(B.el) + ' ' + name(B.el), text: A.text.slice(0, 24) + ' × ' + B.text.slice(0, 24), px: Math.round(c) });
  }
  // pictures and cards drawn over text they do not contain
  const blocks = [];
  for (const r0 of roots) for (const el of r0.querySelectorAll(${JSON.stringify(BLOCKS)})) {
    const v = look(el);
    if (!v.o || v.o < 0.3) continue;
    const box = inter(rel(el.getBoundingClientRect()), v.clip);
    if (area(box) < 100) continue;
    if (el.tagName === 'IMG' && (!el.complete || !el.naturalWidth)) found.push({ kind: 'image', who: where(el) + ' ' + name(el), text: (el.getAttribute('src') || '').slice(-40) });
    blocks.push({ el, box });
  }
  for (const R of runs) for (const K of blocks) {
    if (K.el.contains(R.el) || R.el.contains(K.el)) continue;
    // later in the page = drawn on top (all of these are positioned; none sets a z-index)
    if (!(R.el.compareDocumentPosition(K.el) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
    const c = area(inter(R.box, K.box));
    if (c > 30 && c > 0.04 * area(R.box)) found.push({ kind: 'covers', who: where(K.el) + ' ' + name(K.el) + ' over ' + where(R.el) + ' ' + name(R.el), text: R.text.slice(0, 32), px: Math.round(c) });
  }
  return JSON.stringify(found);
})()`;

const browser = await launch({ width: 1920, height: 1080 });
const frames = [];
try {
  const page = await browser.newPage('about:blank', { dpr: 1 });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=en&cut=${arg('cut', 'full')}`);
  const info = await page.eval('window.__ready');
  const fps = Number(arg('fps', '30')), from = Number(arg('from', '0')), to = Number(arg('to', String(info.duration)));
  const t0 = Date.now();
  for (let i = Math.round(from * fps); i / fps < to - 1e-9; i++) {
    const t = i / fps;
    await page.eval(`Promise.resolve(window.__seek(${t})).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const f = JSON.parse(await page.eval(AUDIT));
    if (f.length) frames.push({ i, t: +t.toFixed(3), f });
    if (i % (fps * 20) === 0) process.stdout.write(`  ${t.toFixed(0)}s (${((Date.now() - t0) / 1000).toFixed(0)}s)\n`);
  }
  if (page.consoleLog.length) console.log('--- page console ---\n' + page.consoleLog.join('\n'));
  writeFileSync(join(out, 'frames.json'), JSON.stringify({ fps, from, to, frames }, null, 0));
  // spans: the same finding on consecutive frames
  const spans = new Map();
  for (const { i, t, f } of frames) for (const x of f) {
    const key = x.kind + ' | ' + x.who + ' | ' + x.text;
    const s = spans.get(key);
    if (s && s.last === i - 1) { s.last = i; s.t1 = t; } else { const list = s ? s.list : []; list.push([t, t]); spans.set(key, { last: i, t1: t, list, cur: list.length - 1 }); }
    const sp = spans.get(key); sp.list[sp.list.length - 1][1] = t;
  }
  const rows = [];
  for (const [key, s] of spans) for (const [a, b] of s.list) rows.push({ a, b, d: +(b - a + 1 / fps).toFixed(2), key });
  rows.sort((x, y) => x.a - y.a);
  writeFileSync(join(out, 'spans.json'), JSON.stringify(rows, null, 1));
  console.log(`${frames.length} of ${Math.round((to - from) * fps)} frames have findings · ${rows.length} spans (${join(out, 'spans.json')})`);
} finally {
  await browser.close();
}
