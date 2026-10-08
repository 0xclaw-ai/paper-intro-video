// Poster frames (cover images), with the camera at rest on one station.
//   node tools/poster.mjs [--cut full] [--out out]
// Which frames: `posters` in js/script.js —
//   posters: [{ name: 'poster_title', scene: 's-title', station: 0, at: -0.9 }]      at: seconds from the scene's start, or from its end if negative
import { launch } from './cdp.mjs';
import { findPython } from './env.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const cut = arg('cut', 'full');
const out = resolve(root, arg('out', 'out'));
const GAP = 2400;                                    // distance between stations, as in js/lib/stage.js
const timing = JSON.parse(readFileSync(join(root, 'build', cut, 'timing.json'), 'utf8'));
if (!timing.posters.length) { console.log('no posters listed in js/script.js'); process.exit(0); }
mkdirSync(out, { recursive: true });
const browser = await launch({ width: 1920, height: 1080 });
const files = [];
try {
  const page = await browser.newPage('about:blank', { dpr: 1 });
  await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=off&cut=${cut}`);
  const info = await page.eval('window.__ready');
  for (const p of timing.posters) {
    const sc = info.scenes.find((s) => s.id === p.scene);
    if (!sc) throw new Error('poster: no scene ' + p.scene);
    const t = p.at < 0 ? sc.start + sc.dur + p.at : sc.start + p.at;
    await page.eval(`window.__seek(${t})`);
    await page.eval(`{ const w = document.querySelector('#${p.scene} .world'); if (w) w.style.transform = 'translate(${-(p.station || 0) * GAP}px, 0px) scale(1)'; document.getElementById('curtain').style.opacity = 0; } new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const file = join(out, p.name + '.png');
    writeFileSync(file, await page.screenshot());
    files.push(file);
    console.log('wrote', file);
  }
} finally {
  await browser.close();
}
const py = findPython('pil', { must: false });
if (py) spawnSync(py, ['-c', 'import sys\nfrom PIL import Image\nfor f in sys.argv[1:]:\n    Image.open(f).convert("RGB").save(f[:-4] + ".jpg", quality=90)', ...files], { stdio: 'inherit' });
