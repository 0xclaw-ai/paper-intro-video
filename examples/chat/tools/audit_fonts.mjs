// Which fonts actually drew the film's text: a glyph the film's own fonts lack (×, →, ₀, a CJK name, an
// arrow in a caption) is drawn by a system font, looks wrong on the frame and differs between machines.
//   node tools/audit_fonts.mjs [--cut full] [--step 0.25] [--allow "Segoe UI,Apple Color Emoji"]
//
// Steps through the film; every element with text is asked once per distinct text which fonts Chromium used
// (CSS.getPlatformFontsForNode). Any glyph drawn with a font that is not a web font the page loads is listed,
// unless --allow names it. Output: build/audit/fonts.json and a summary; exits 1 if anything is listed.
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const step = Number(arg('step', '0.25'));
if (!Number.isFinite(step) || step <= 0) throw new Error('--step must be a positive number');
const allow = new Set(arg('allow', '').split(',').map((s) => s.trim()).filter(Boolean));
const out = resolve(root, 'build', 'audit');
mkdirSync(out, { recursive: true });

// tag every element that holds text of its own (captions and counters appear on the way, so this runs at each step)
const TAG = `(() => {
  let n = document.querySelectorAll('[data-fa]').length;
  const roots = [...document.querySelectorAll('#stage > .scene'), document.getElementById('hud'), document.getElementById('captions')].filter(Boolean);
  for (const r of roots) for (const el of [r, ...r.querySelectorAll('*')]) {
    if (!el.dataset.fa && [...el.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) el.dataset.fa = String(n++);
  }
  return n;
})()`;
const LIST = `JSON.stringify([...document.querySelectorAll('[data-fa]')].map((el) => {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), sc = el.closest('.scene');
  const own = [...el.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join('').replace(/\\s+/g, ' ').trim();
  const on = r.width > 0 && r.height > 0 && cs.display !== 'none' && (!sc || sc.style.display === 'block');
  return [el.dataset.fa, own, on, sc ? sc.id : (el.closest('#hud') ? 'hud' : 'captions')];
}))`;

const browser = await launch({ width: 1920, height: 1080 });
const seen = new Map(), used = new Map(), flagged = [];
try {
  const page = await browser.newPage('about:blank', { dpr: 1 });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=en&cut=${arg('cut', 'full')}`);
  const info = await page.eval('window.__ready');
  await page.send('DOM.enable'); await page.send('CSS.enable');
  for (let t = 0; t <= info.duration + 1e-6; t += step) {
    await page.eval(`Promise.resolve(window.__seek(${t.toFixed(3)})).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    await page.eval(TAG);
    const { root: doc } = await page.send('DOM.getDocument', { depth: 0 });
    for (const [id, text, on, where] of JSON.parse(await page.eval(LIST))) {
      if (!on || !text || seen.has(id + '|' + text)) continue;
      const { nodeId } = await page.send('DOM.querySelector', { nodeId: doc.nodeId, selector: `[data-fa="${id}"]` });
      if (!nodeId) continue;
      const { fonts } = await page.send('CSS.getPlatformFontsForNode', { nodeId });
      const rec = { t: +t.toFixed(2), where, text: text.slice(0, 80), fonts: fonts.map((f) => ({ family: f.familyName, web: f.isCustomFont, glyphs: f.glyphCount })) };
      seen.set(id + '|' + text, rec);
      for (const f of rec.fonts) used.set(f.family + (f.web ? '' : ' (system)'), (used.get(f.family + (f.web ? '' : ' (system)')) || 0) + f.glyphs);
      const bad = rec.fonts.filter((f) => !f.web && !allow.has(f.family));
      if (bad.length) flagged.push({ ...rec, system: bad.map((f) => `${f.family}: ${f.glyphs} glyph(s)`) });
    }
  }
  writeFileSync(join(out, 'fonts.json'), JSON.stringify({ used: Object.fromEntries(used), flagged, texts: [...seen.values()] }, null, 1));
  console.log(`${seen.size} pieces of text · fonts (glyphs): ${[...used].map(([f, n]) => `${f} ${n}`).join(', ')}`);
  console.log(flagged.length ? `${flagged.length} drawn partly with a system font:` : 'no glyph falls back to a system font');
  for (const x of flagged) console.log(`  ${x.t}s ${x.where} ${JSON.stringify(x.text)} — ${x.system.join(', ')}`);
  // CSS.enable makes Chromium log one 'Unsafe attempt to load URL file:' line about the page itself; it means nothing here
  const log = page.consoleLog.filter((l) => !/Unsafe attempt to load URL file:/.test(l));
  if (log.length) console.log('--- page console ---\n' + log.join('\n'));
} finally {
  await browser.close();
}
process.exit(flagged.length ? 1 : 0);
