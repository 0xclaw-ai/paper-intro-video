// Dump the sound-design cue sheet that js/scenes.js declares next to its animations:
//   build/<cut>/sfx.json   { duration, marks: { name: seconds }, events: [{ t, kind, ... }] }
// tools/music.py turns it into audio, so sounds stay glued to the picture when the edit — or the voice — changes.
//
//   node tools/export_sfx.mjs [--cut full|all]
import { launch } from './cdp.mjs';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { CUTS } = createRequire(import.meta.url)(join(root, 'js', 'lib', 'build.js'));
const i = process.argv.indexOf('--cut');
const want = i > 0 ? process.argv[i + 1] : CUTS[CUTS.length - 1];
const browser = await launch({ width: 1920, height: 1080 });
try {
  for (const cut of want === 'all' ? CUTS : [want]) {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(join(root, 'index.html')).href + `?capture=1&lang=off&cut=${cut}`);
    await page.eval('window.__ready');
    const data = await page.eval('window.__sfx()');
    mkdirSync(join(root, 'build', cut), { recursive: true });
    writeFileSync(join(root, 'build', cut, 'sfx.json'), JSON.stringify(data, null, 1));
    console.log(`${cut.padEnd(5)} ${data.events.length} sound cues · ${Object.keys(data.marks).length} markers`);
    const bad = page.consoleLog.filter((l) => /exception|error/i.test(l) && !/swiftshader|GroupMarker/i.test(l));
    if (bad.length) console.log('page console:\n' + [...new Set(bad)].slice(0, 10).join('\n'));
    await page.close();
  }
} finally {
  await browser.close();
}
