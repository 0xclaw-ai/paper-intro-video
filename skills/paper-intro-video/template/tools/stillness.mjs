// Stillness check: is something moving all the time?
//
//   node tools/stillness.mjs [--step 0.5] [--min 0.001] [--from 0 --to END]
//
// Captures small caption-free frames every `step` seconds and reports every stretch where the picture does not
// change (mean |difference| below `min`, on a 0..1 scale). Aim for about 6 % still; a stretch of 2 s or more
// exits 1.
import { launch } from './cdp.mjs';
import { findPython } from './env.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const cut = arg('cut', 'full');
const dir = join(root, 'build', cut, 'stillness');
mkdirSync(dir, { recursive: true });
const browser = await launch({ width: 1920, height: 1080 });
const times = [];
try {
  const page = await browser.newPage('about:blank', { dpr: 0.25 });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=off&cut=${cut}`);
  const info = await page.eval('window.__ready');
  const step = Number(arg('step', '0.5')), from = Number(arg('from', '0.6')), to = Number(arg('to', String(info.duration - 0.8)));
  for (let t = from; t <= to + 1e-6; t += step) times.push(+t.toFixed(3));
  for (const [k, t] of times.entries()) {
    await page.eval(`Promise.resolve(window.__seek(${t})).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    writeFileSync(join(dir, `f_${String(k).padStart(4, '0')}.png`), await page.screenshot());
  }
  writeFileSync(join(dir, 'times.json'), JSON.stringify({ cut, step, times, scenes: info.scenes }));
} finally {
  await browser.close();
}
const py = findPython('pil', { must: false }) || 'python';
const r = spawnSync(py, [join(root, 'tools', 'stillness.py'), dir, arg('min', '0.001')], { stdio: 'inherit' });
process.exit(r.status ?? 1);
