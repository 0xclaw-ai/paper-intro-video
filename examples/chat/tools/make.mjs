// The whole pipeline in one command: voice → timing → sound → picture → checks.
//
//   node tools/make.mjs                              render with the voice that is already laid in (or without one)
//   node tools/make.mjs --voice kokoro:af_heart      synthesize with Kokoro, lay it in, render
//   node tools/make.mjs --voice sapi:zira            a voice that ships with Windows (synthetic)
//   node tools/make.mjs --voice clips:voice/full/me  clips that already exist (a recording, or an earlier synthesis)
//   node tools/make.mjs --voice none                 take the voice out again
//
//   --pause 0.8      pauses between sentences at least this long (default 0.8 with --voice; 0 = leave the clips alone)
//   --max-pause 1.2  … and at most this long
//   --speed 1.0      speaking rate for Kokoro           --only 4,17   re-synthesize just these lines (Kokoro)
//   --as-plan        make this voice's pacing the plan the scenes are timed to (do it once, for the first voice,
//                    before timing the scenes to its words — see the README, "Two clocks")
//   --no-render      stop after the sound (to look at stills and contact sheets first)
//   --range 75-110   render only these seconds, without sound  --web   also write the small copies to out/web/
//
//   node tools/make.mjs --samples af_bella,am_michael,bm_george [--lines 4,21,29]
//                    only write a short audition file per Kokoro voice to out/extras/voice_samples/ (you cannot
//                    hear them; the user chooses)
//
// Every step is an ordinary tool in this folder; this file only runs them in the right order with the right Python.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { findPython, root, ttsDir } from './env.mjs';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const flag = (n) => argv.includes('--' + n);
const cut = arg('cut', 'full');
const tool = (f) => join(root, 'tools', f);
function run(what, cmd, args) {
  console.log(`\n── ${what}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root });
  if (r.status !== 0) { console.error(`\n"${what}" failed (exit ${r.status}).`); process.exit(r.status || 1); }
}
const node = (what, f, ...a) => run(what, process.execPath, [tool(f), ...a]);
const timing = () => JSON.parse(readFileSync(join(root, 'build', cut, 'timing.json'), 'utf8'));

node('script → timing', 'export_script.mjs', '--cut', cut);
node('preflight', 'preflight.mjs');

if (arg('samples', null)) {
  if (!ttsDir()) { console.error('Kokoro is not set up on this machine: see the top of tools/voice_kokoro.py (a one-time download — ask first).'); process.exit(1); }
  const lines = arg('lines', timing().cues.length >= 3 ? `1,${Math.ceil(timing().cues.length / 2)},${timing().cues.length}` : '1');
  for (const v of arg('samples').split(',')) run(`sample: ${v}`, findPython('tts'), [tool('voice_kokoro.py'), '--cut', cut, '--voice', v, '--speed', arg('speed', '1.0'), '--models', ttsDir(), '--sample', lines]);
  process.exit(0);
}

const voice = arg('voice', null);
if (voice) {
  const [kind, name = ''] = voice.split(/:(.*)/s);
  let clips = null;
  if (kind === 'none') run('remove the voice', findPython('sci'), [tool('narration.py'), '--cut', cut, '--none']);
  else if (kind === 'kokoro') {
    if (!ttsDir()) { console.error('Kokoro is not set up on this machine: see the top of tools/voice_kokoro.py (a one-time download — ask first).'); process.exit(1); }
    const a = [tool('voice_kokoro.py'), '--cut', cut, '--voice', name || 'af_heart', '--speed', arg('speed', '1.0'), '--models', ttsDir()];
    if (arg('only', null)) a.push('--only', arg('only'));
    run(`voice: Kokoro ${name || 'af_heart'}`, findPython('tts'), a);
    clips = join('voice', cut, name || 'af_heart');
  } else if (kind === 'sapi') {
    run(`voice: Windows ${name || 'zira'}`, 'powershell', ['-ExecutionPolicy', 'Bypass', '-File', tool('voice_sapi.ps1'), '-Cut', cut, '-Name', name || 'zira']);
    clips = join('voice', cut, name || 'zira');
  } else if (kind === 'clips') clips = name;
  else { console.error('--voice kokoro:<voice> | sapi:<name> | clips:<folder> | none'); process.exit(1); }
  if (clips) {
    const a = [tool('narration.py'), '--cut', cut, '--clips', resolve(root, clips), '--pause', arg('pause', '0.8')];
    if (arg('max-pause', null)) a.push('--max-pause', arg('max-pause'));
    if (flag('as-plan')) a.push('--as-plan');
    run('lay the voice on the film', findPython('sci'), a);
    run('look at the clips', findPython('sci'), [tool('check_clips.py'), resolve(root, clips), '--cut', cut]);
  }
}

if (!voice && timing().voice && !existsSync(join(root, 'build', cut, 'narration.wav'))) {
  // a fresh copy: the clips and js/voice.js are there, the voice track (build/) is not — lay it in again, as it was
  const V = createRequire(import.meta.url)(join(root, 'js', 'voice.js'));
  const clips = resolve(root, V.clips || join('voice', cut, V.name));
  if (!existsSync(clips)) { console.error(`js/voice.js names the voice "${V.name}", but its clips (${clips}) are missing: synthesize it again (--voice …) or remove it (--voice none).`); process.exit(1); }
  const a = [tool('narration.py'), '--cut', cut, '--clips', clips, '--pause', String(V.pause || 0)];
  if (V.max_pause) a.push('--max-pause', String(V.max_pause));
  run('lay the voice on the film again', findPython('sci'), a);
}

node('cue sheet', 'export_sfx.mjs', '--cut', cut);
run('sound bed', findPython('sci'), [tool('music.py'), '--cut', cut]);
if (flag('no-render')) { console.log('\nStopped before the render (--no-render). Look at it:  node tools/sheet.mjs --step 3'); process.exit(0); }

const range = arg('range', null);
if (range) {
  const [a, b] = range.split('-');
  node(`render ${a}–${b} s`, 'render.mjs', '--cut', cut, '--from', a, '--to', b);
  process.exit(0);
}
// frames to check the encoded film against: two per scene
const t = timing();
const vdir = join(root, 'build', 'verify', cut);
if (existsSync(vdir)) for (const f of readdirSync(vdir)) if (f.endsWith('.png')) rmSync(join(vdir, f));
mkdirSync(vdir, { recursive: true });
const times = t.scenes.flatMap((s) => [s.start + s.dur * 0.35, s.start + s.dur * 0.8]).map((x) => (Math.round(x * 10) / 10).toFixed(1));   // on the frame grid
node('reference stills', 'still.mjs', '--cut', cut, '--lang', 'off', '--out', vdir, '--t', times.join(','));
node('glyph fonts', 'audit_fonts.mjs', '--cut', cut, '--step', arg('font-step', '0.25'));
node('render', 'render.mjs', '--cut', cut, ...(flag('allow-font-fallback') ? ['--allow-font-fallback'] : []));
run('verify', findPython('av'), [tool('verify.py'), '--cut', cut]);
run('sound check', findPython('av'), [tool('check_audio.py'), '--cut', cut, '--strict']);
run('encoded frames', findPython('av'), [tool('audit_video.py'), join(root, 'out', t.slug + (t.cuts.length > 1 ? `_${cut}` : '') + '.mp4'), '--fail', 'seams']);
if (timing().scenes.some((s) => s.youtube)) node('YouTube chapters', 'chapters.mjs', '--cut', cut);
node('poster frames', 'poster.mjs', '--cut', cut);
if (flag('web')) {
  const name = t.slug + (t.cuts.length > 1 ? `_${cut}` : '');
  for (const suffix of ['', '_captions_en']) run(`web copy${suffix}`, findPython('av'), [tool('transcode.py'), join(root, 'out', `${name}${suffix}.mp4`)]);
}
console.log('\nDone → out/');
