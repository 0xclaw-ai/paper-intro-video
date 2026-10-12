// Catch authoring faults before a render spends minutes on a wrong film.
//   node tools/preflight.mjs
//
// This checks the files, not taste and not spoken pronunciation. A passing result means the page can
// be rebuilt from time alone, scene ids agree, and a strong on-screen claim has a ledger. It does not
// mean the film is finished.
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const faults = [];
const notes = [];
const fail = (message) => faults.push(message);
const read = (path) => readFileSync(join(root, path), 'utf8');
const code = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
/** the file a reference names, as the page would load it: null for a URL with a scheme, //host or an absolute path */
const local = (ref) => {
  const path = ref.trim().replace(/[?#].*$/, '');
  if (!path || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path)) return null;
  try { return decodeURI(path); } catch { return path; }
};

const pkg = JSON.parse(read('package.json'));
if (pkg.type !== 'commonjs') fail('package.json must keep "type": "commonjs", or a parent package can break js/script.js.');

let film;
try { film = require(join(root, 'js/script.js')); }
catch (error) { fail(`js/script.js did not load: ${error.message}`); }
if (film) {
  if (!/^[A-Za-z0-9_-]+$/.test(film.slug || '')) fail('FILM.slug must be a plain file name (letters, numbers, _ or -).');
  const ids = (film.scenes || []).map((scene) => scene.id);
  if (new Set(ids).size !== ids.length) fail('scene ids in js/script.js must be unique.');
  for (const scene of film.scenes || []) {
    const cues = scene.cues || [];
    if (!cues.length) fail(`${scene.id} has no narration cues.`);
    const cueIds = cues.map((cue) => cue.id);
    if (new Set(cueIds).size !== cueIds.length) fail(`${scene.id} has a repeated cue id.`);
    for (const cue of cues) if (typeof cue.en !== 'string' || !cue.en.trim()) fail(`${scene.id}/${cue.id} needs an en line.`);
  }
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const sceneIds = [...html.matchAll(/<section\b[^>]*>/g)].map((match) => match[0])
    .filter((tag) => /\bscene\b/.test(tag)).map((tag) => tag.match(/\bid="([^"]+)"/)?.[1]).filter(Boolean);
  for (const id of ids) if (!sceneIds.includes(id)) fail(`${id} is in js/script.js but has no <section class="scene"> in index.html.`);
  for (const id of sceneIds) if (!ids.includes(id)) fail(`${id} is a scene in index.html but not in js/script.js.`);
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
  if (scripts.at(-1) !== 'js/lib/player.js') fail('js/lib/player.js must be the last script in index.html.');
  if (/<video\b/i.test(html)) fail('use js/media.js frame sequences, not a <video> element: a video seek is not frame-accurate.');
  if (/<script[^>]+src="media\/manifest.js"/.test(html) && !existsSync(join(root, 'media/manifest.js'))) {
    fail('index.html loads media/manifest.js, but that file does not exist.');
  }
  for (const url of html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)) {
    if (!/fonts\.(googleapis|gstatic)\.com/.test(url[1])) fail(`unexpected remote URL in index.html: ${url[1]}`);
  }
  // a local file the page names has to be there: a missing picture renders as a broken image, a missing script as no film
  for (const [, ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const file = local(ref);
    if (file && file !== 'media/manifest.js' && !existsSync(join(root, file))) fail(`index.html names ${ref}, which does not exist.`);
  }
  const claim = /\b(?:state of the art|state-of-the-art|sota|seamless|novel|the first|first to|best|outperforms)\b/i;
  const claimed = [];
  for (const scene of film.scenes || []) for (const cue of scene.cues || []) {
    if (claim.test(`${cue.en || ''} ${cue.say || ''}`)) claimed.push(`${scene.id}/${cue.id}`);
  }
  if (claim.test(html.replace(/<[^>]+>/g, ' '))) claimed.push('index.html');
  if (claimed.length && !existsSync(join(root, 'CLAIMS.md'))) {
    fail(`strong claim without CLAIMS.md (${claimed.join(', ')}). Record the source, or use a qualified sentence.`);
  }
  const scenes = code(read('js/scenes.js'));
  const manifestLoaded = /<script[^>]+src="media\/manifest.js"/.test(html);
  let manifest = null;
  if (manifestLoaded) {
    try { manifest = new Function('window', `${read('media/manifest.js')}; return window.OXMEDIA_MANIFEST;`)({}); }
    catch (error) { fail(`media/manifest.js did not load: ${error.message}`); }
  }
  for (const match of scenes.matchAll(/(?:OXMEDIA|[A-Za-z_$][\w$]*)\.play\(\s*[^,]+,\s*[^,]+,\s*([^,)]+)/g)) {
    const literal = match[1].trim().match(/^['"]([A-Za-z0-9_-]+)['"]$/);
    if (!literal) { notes.push('a clip name is computed in js/scenes.js; confirm it against media/manifest.js.'); continue; }
    const name = literal[1];
    if (!manifestLoaded || !manifest) notes.push(`clip "${name}" has no manifest and will render as a labelled plate.`);
    else if (!Object.hasOwn(manifest, name) && Object.keys(manifest).length) fail(`OXMEDIA.play asks for "${name}", which is not in media/manifest.js.`);
    else if (!Object.hasOwn(manifest, name)) notes.push(`clip "${name}" is a labelled plate; media/manifest.js has no prepared clips.`);
  }
}

for (const path of ['js/script.js', 'js/scenes.js', 'js/data.js']) {
  if (/\b(?:setTimeout|setInterval|requestAnimationFrame)\b/.test(code(read(path)))) {
    fail(`${path} uses a timer. Drive every change from the timeline, or parallel renders disagree.`);
  }
}
for (const path of ['css/base.css', 'css/film.css']) {
  // a quoted url( ) is read whole, so a data: URL that contains url(#id) is one reference
  for (const [, quoted, single, bare] of read(path).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^'")\s][^)]*?))\s*\)/g)) {
    const ref = quoted ?? single ?? bare, file = local(ref);
    if (file && !existsSync(join(root, 'css', file))) fail(`${path} names ${ref}, which does not exist.`);
  }
  const css = code(read(path)).replace(/\b(?:animation|transition)\s*:\s*none\b/g, '');
  if (/@keyframes|\banimation\s*:|\btransition\s*:/.test(css)) {
    fail(`${path} has CSS animation or transition. A frame must depend only on the seek time.`);
  }
}

for (const note of [...new Set(notes)]) console.log(`note: ${note}`);
if (faults.length) {
  for (const fault of faults) console.error(`preflight: ${fault}`);
  process.exit(1);
}
console.log('preflight: scene contract, reproducible motion, and claim ledger checked');
