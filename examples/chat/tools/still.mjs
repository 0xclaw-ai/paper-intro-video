// Render still frames for review.
//   node tools/still.mjs --t 3.5,12,48.2 [--out build/stills] [--lang en|zh|off] [--dpr 1] [--query voice=off]
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const times = arg('t', '0').split(',').map(Number);
const outDir = resolve(root, arg('out', 'build/stills'));
const lang = arg('lang', 'en');
const dpr = Number(arg('dpr', '1'));
mkdirSync(outDir, { recursive: true });

const browser = await launch({ width: 1920, height: 1080 });
try {
  const page = await browser.newPage('about:blank', { dpr });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=${lang}&cut=${arg('cut', 'full')}${arg('query', '') ? '&' + arg('query', '') : ''}`);
  const info = await page.eval('window.__ready');
  console.log(`duration ${info.duration.toFixed(2)}s · fonts: ${Object.entries(info.fonts).map(([k, v]) => `${k}=${v}`).join(' ')}`);
  for (const t of times) {
    await page.eval(`Promise.resolve(window.__seek(${t})).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    const file = join(outDir, `t_${t.toFixed(2).padStart(7, '0')}.png`);
    writeFileSync(file, await page.screenshot());
    console.log('wrote', file);
  }
  if (page.consoleLog.length) console.log('--- page console ---\n' + page.consoleLog.join('\n'));
} finally {
  await browser.close();
}
