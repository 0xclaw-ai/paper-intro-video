// Checks of the harness that need no footage and no speech model:  node --test tests/harness.test.mjs
// (tests/test_media.py covers the Python tools). Tests that drive a browser skip themselves where no Chromium is found.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const template = join(here, '../skills/paper-intro-video/template');
const chat = join(here, '../examples/chat');
const mediaSource = readFileSync(join(template, 'js/media.js'), 'utf8');
function media(manifest = {}) {
  const context = { window: { OXMEDIA_MANIFEST: manifest }, console: { warn() {} } };
  vm.runInNewContext(mediaSource, context);
  return context.window.OXMEDIA;
}
const clip = { dir: 'media/demo', fps: 30, frames: 60 };

test('clip frame selection clamps, seeks backwards and waits for decode', async () => {
  const m = media({ demo: clip });
  let complete, callback;
  const img = { decode: () => new Promise((resolve) => { complete = resolve; }) };
  m.play({ call(fn) { callback = fn; } }, img, 'demo', { from: 0.5 });
  assert.equal(img.src, 'media/demo/00016.jpg');
  let settled = false;
  const waiting = m.settle().then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  complete(); await waiting;
  img.decode = () => Promise.resolve();
  callback(0, 100); await m.settle(); assert.equal(img.src, 'media/demo/00060.jpg');
  callback(0, 0); await m.settle(); assert.equal(img.src, 'media/demo/00016.jpg');
  assert.equal(m.url('demo', -10), 'media/demo/00001.jpg');
  assert.equal(m.length('demo', 4), 0);
});

test('missing clip is a labelled plate, without registering animation', async () => {
  const m = media();
  const img = { decode: () => Promise.resolve() };
  m.play({ call() { assert.fail('missing clip must not register motion'); } }, img, 'omitted');
  await m.settle();
  assert.match(decodeURIComponent(img.src), /clip: omitted/);
  assert.equal(m.length('omitted'), 0);
});

test('broken frames fail capture instead of silently producing an empty image', async () => {
  const m = media({ demo: clip });
  const img = { decode: () => Promise.reject(new Error('decode failed')) };
  m.show(img, 'demo', 0);
  await assert.rejects(m.settle(), /could not decode media\/demo\/00001.jpg/);
  img.decode = () => Promise.resolve();
  m.show(img, 'demo', 1);
  await m.settle();
});

test('invalid manifest fails explicitly', () => {
  assert.throws(() => media({ demo: { ...clip, frames: 0 } }).url('demo', 0), /invalid manifest/);
});

function chapters(starts, duration, cues = [], titles) {
  const dir = mkdtempSync(join(tmpdir(), 'chapters-test-'));
  try {
    mkdirSync(join(dir, 'tools'));
    mkdirSync(join(dir, 'build/full'), { recursive: true });
    copyFileSync(join(template, 'tools/chapters.mjs'), join(dir, 'tools/chapters.mjs'));
    const scenes = starts.map((start, i) => ({ id: `s${i}`, start, dur: (starts[i + 1] ?? duration) - start, youtube: titles?.[i] ?? `Chapter ${i}` }));
    writeFileSync(join(dir, 'build/full/timing.json'), JSON.stringify({ scenes, cues, duration }));
    const result = spawnSync(process.execPath, [join(dir, 'tools/chapters.mjs')], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.signal, null, result.error?.message);
    return result;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('chapters accept three ten-second segments', () => {
  const r = chapters([0, 10, 20], 30);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0:00 Chapter 0/);
});

test('short final chapter moves into a speech gap', () => {
  const r = chapters([0, 12, 23], 32);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0:22 Chapter 2/);
});

test('chapters reject a film too short for three chapters', () => {
  assert.equal(chapters([0, 3, 6], 8).status, 1);
});

test('chapter adjustment does not cut a spoken line', () => {
  const r = chapters([0, 10, 25, 36], 44, [{ scene: 's3', start: 25, end: 40 }]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /joins/);
  assert.match(r.stdout, /3 chapters/);
});

test('initial rounding into a previous spoken line is rejected', () => {
  const r = chapters([0, 10.7, 22], 35, [
    { scene: 's0', start: 9, end: 10.5 }, { scene: 's1', start: 10.8, end: 12 },
  ]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /inside a spoken line/);
});

test('template preflight passes and a broken scene contract fails', () => {
  const ok = spawnSync(process.execPath, [join(template, 'tools/preflight.mjs')], { encoding: 'utf8', timeout: 5000 });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const dir = mkdtempSync(join(tmpdir(), 'preflight-bad-'));
  try {
    mkdirSync(join(dir, 'tools'));
    mkdirSync(join(dir, 'js/lib'), { recursive: true });
    mkdirSync(join(dir, 'css'));
    for (const file of ['package.json', 'index.html', 'js/script.js', 'js/scenes.js', 'js/data.js', 'css/base.css', 'css/film.css']) {
      copyFileSync(join(template, file), join(dir, file));
    }
    copyFileSync(join(template, 'tools/preflight.mjs'), join(dir, 'tools/preflight.mjs'));
    writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace('id="s-end"', 'id="s-missing"'));
    const bad = spawnSync(process.execPath, [join(dir, 'tools/preflight.mjs')], { encoding: 'utf8', timeout: 5000 });
    assert.equal(bad.status, 1);
    assert.match(bad.stderr, /s-end/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('invalid audit step fails rather than hanging', () => {
  const r = spawnSync(process.execPath, [join(template, 'tools/audit_fonts.mjs'), '--step', '0'], { encoding: 'utf8', timeout: 5000 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /positive number/);
});

// the CHAT example runs on the current harness; 0xClaw keeps the harness it was delivered with
test('the CHAT example carries the template harness unchanged', () => {
  const files = (root, dir) => readdirSync(join(root, dir)).filter((n) => !n.startsWith('.') && statSync(join(root, dir, n)).isFile()).sort();
  const own = { tools: ['make_logos.py', 'piano.py'], 'js/lib': [], 'vendor/roughjs': [] };   // the example's own tools
  for (const [dir, extra] of Object.entries(own)) {
    assert.deepEqual(files(chat, dir), [...files(template, dir), ...extra].sort(), `examples/chat/${dir} has other files than the template`);
  }
  for (const file of ['js/media.js', ...Object.keys(own).flatMap((dir) => files(template, dir).map((n) => `${dir}/${n}`))]) {
    assert.ok(readFileSync(join(chat, file)).equals(readFileSync(join(template, file))), `examples/chat/${file} differs from the template`);
  }
});

