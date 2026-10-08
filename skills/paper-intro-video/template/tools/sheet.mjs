// Contact sheets for quick visual QA.
//   node tools/sheet.mjs [--step 2.5] [--from 0] [--to END] [--t 1,2,3] [--lang en] [--cols 6] [--rows 5]
// Captures small frames with the headless browser, then lays them out with Pillow (tools/sheet.py).
import { launch } from './cdp.mjs';
import { findPython } from './env.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const out = resolve(root, arg('out', 'build/sheets'));
const thumbs = join(out, 'thumbs');
mkdirSync(thumbs, { recursive: true });
const browser = await launch({ width: 1920, height: 1080 });
const files = [];
try {
  const page = await browser.newPage('about:blank', { dpr: 1 / 3 });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=${arg('lang', 'en')}&cut=${arg('cut', 'full')}${arg('query', '') ? '&' + arg('query', '') : ''}`);
  const info = await page.eval('window.__ready');
  const step = Number(arg('step', '2.5')), from = Number(arg('from', '0')), to = Number(arg('to', String(info.duration)));
  const list = arg('t', null);
  const times = list ? list.split(',').map(Number) : [];
  if (!list) for (let t = from; t < to - 1e-6; t += step) times.push(+t.toFixed(3));
  for (const t of times) {
    await page.eval(`window.__seek(${t}); new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const f = join(thumbs, `t_${t.toFixed(2).padStart(7, '0')}.png`);
    writeFileSync(f, await page.screenshot());
    files.push(f);
  }
} finally {
  await browser.close();
}
const py = findPython('pil', { must: false }) || 'python';
writeFileSync(join(thumbs, 'list.txt'), files.join('\n'));       // a long film is more file names than a command line can carry
const r = spawnSync(py, [join(root, 'tools', 'sheet.py'), out, arg('cols', '6'), arg('rows', '5'), '@' + join(thumbs, 'list.txt')], { stdio: 'inherit' });
if (r.status !== 0) console.log(`thumbnails are in ${thumbs} (no Python with Pillow was found for the contact sheets: node tools/doctor.mjs)`);
