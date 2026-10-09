// What does this machine have, and what is missing? Run it first on a new machine or in a new project.
//   node tools/doctor.mjs
// It only looks; it installs nothing. Anything that needs a download (a Python package, the speech model, a browser)
// is the user's decision — ask before fetching it.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBrowser, launch } from './cdp.mjs';
import { NEEDS, findPython, root, ttsDir } from './env.mjs';

const ok = (b) => (b ? 'ok     ' : 'MISSING');
let missing = 0;
const line = (good, what, detail) => { if (!good) missing++; console.log(`${ok(good)}  ${what.padEnd(34)} ${detail}`); };

const major = Number(process.versions.node.split('.')[0]);
line(major >= 22, 'Node.js 22 or newer', `found ${process.versions.node}` + (major >= 22 ? '' : ' — the tools use the built-in WebSocket of Node 22'));
let browser = null;
try { browser = findBrowser(); } catch (e) { /* none */ }
line(Boolean(browser), 'a Chromium to render with', browser || 'none — install Chrome/Edge, or `npx playwright install chromium`, or set CHROME_PATH');
for (const kind of ['av', 'sci', 'pil']) {
  const py = findPython(kind, { must: false });
  line(Boolean(py), `Python: ${NEEDS[kind].what.split(' (')[0]}`, py ? py : `none — ${NEEDS[kind].fix}, or set ${NEEDS[kind].env}`);
}
const tts = ttsDir();
const ttsPy = findPython('tts', { must: false });
const voiceReady = Boolean(tts && ttsPy);
console.log(`${voiceReady ? 'ok     ' : 'optional'}  ${'a natural voice (Kokoro-82M)'.padEnd(34)} ${voiceReady ? `${tts}  ·  ${ttsPy}` : (tts ? `model files in ${tts}, but no Python with kokoro-onnx` : 'not set up — the included demo still builds; tools/voice_kokoro.py explains the one-time download (about 400 MB); ask before downloading')}`);
if (process.platform === 'win32') {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + " [" + $_.VoiceInfo.Culture + "]" }'], { encoding: 'utf8' });
  const voices = (r.stdout || '').split(/\r?\n/).filter((v) => /en-/i.test(v));
  console.log(`${voices.length ? 'ok     ' : 'none   '}  ${'built-in Windows voices (English)'.padEnd(34)} ${voices.join(', ') || '—'}  (synthetic; good for timing, not for the final film)`);
}
// the page's typefaces come from Google Fonts: ask the browser itself, it is the one that has to reach them
if (browser && existsSync(join(root, 'index.html'))) {
  let fonts = null;
  const b = await launch({ width: 1920, height: 1080 });
  try {
    const page = await b.newPage();
    await page.goto(pathToFileURL(join(root, 'index.html')).href + '?capture=1&lang=off');
    fonts = (await page.eval('window.__ready')).fonts;
  } catch (e) { fonts = null; } finally { await b.close(); }
  const all = fonts && Object.values(fonts).every(Boolean);
  line(Boolean(all), 'the page loads with its typefaces', fonts ? Object.entries(fonts).map(([k, v]) => `${k}=${v}`).join(' ') + (all ? '' : ' — offline? the page falls back to local fonts and the marks are measured against those') : 'the page did not load: open index.html in a browser and read the console');
}

const timing = join(root, 'build', 'full', 'timing.json');
if (existsSync(timing)) {
  const t = JSON.parse(readFileSync(timing, 'utf8'));
  console.log(`\nthis film: "${t.title || t.slug}" · ${Math.floor(t.duration / 60)}:${(t.duration % 60).toFixed(1).padStart(4, '0')} · ` + (t.voice ? `voice "${t.voice.name}", ${t.voice.lines}/${t.cues.length} lines` : 'no voice yet'));
}
// A film folder that iCloud Drive syncs (a synced ~/Documents or ~/Desktop counts) collects conflict copies named
// "… 2" while the tools write thousands of frames: in media/, in build/, even inside .git. Say so once.
if (process.platform === 'darwin') {
  let synced = /\/Library\/Mobile Documents\//.test(root);
  for (let d = root; !synced && d !== dirname(d); d = dirname(d)) {
    const r = spawnSync('xattr', ['-p', 'com.apple.file-provider-domain-id', d], { encoding: 'utf8' });
    synced = r.status === 0 && /CloudDocs/.test(r.stdout || '');
  }
  if (synced) console.log('\nnote: iCloud Drive syncs this folder. Sync conflicts leave copies named "… 2" (media/, build/, .git);'
    + ' a folder outside ~/Documents and ~/Desktop avoids them.');
}
console.log(missing ? `\n${missing} required thing(s) missing. Nothing was installed.` : '\nEverything required is here.');
process.exit(missing ? 1 : 0);
