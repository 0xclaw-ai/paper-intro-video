// Where things are on this machine: a Python for each job, the speech model. Nothing is installed from here —
// `node tools/doctor.mjs` prints what was found and what is missing.
//
//   OX_PYTHON       a Python with av (PyAV), numpy, pillow      — encoding, muxing, verifying
//   OX_PYTHON_SCI   a Python with numpy, scipy                  — narration, sound bed (defaults to OX_PYTHON)
//   OX_PYTHON_TTS   a Python with kokoro-onnx                   — the Kokoro voice (defaults to <tts>/venv)
//   OX_TTS          the folder with kokoro-v1.0.onnx and voices-v1.0.bin (default: .tts/ in the project, then ~/.ox-tts)
//   CHROME_PATH     a Chromium / Chrome / Edge executable       (default: Playwright's, then an installed browser)
//
// Without those variables the interpreters are looked for on the PATH and in the user's conda environments.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const NEEDS = {
  av: { test: 'import av, numpy, PIL', what: 'encoding and muxing (av, numpy, pillow)', fix: 'pip install av numpy pillow', env: 'OX_PYTHON' },
  sci: { test: 'import numpy, scipy', what: 'narration and the sound bed (numpy, scipy)', fix: 'pip install numpy scipy', env: 'OX_PYTHON_SCI' },
  pil: { test: 'import numpy, PIL', what: 'contact sheets and the stillness report (numpy, pillow)', fix: 'pip install numpy pillow', env: 'OX_PYTHON' },
  tts: { test: 'import kokoro_onnx', what: 'the Kokoro voice (kokoro-onnx)', fix: 'see the setup at the top of tools/voice_kokoro.py', env: 'OX_PYTHON_TTS' },
};

const ttsFolders = () => [process.env.OX_TTS, join(root, '.tts'), join(homedir(), '.ox-tts')].filter(Boolean);

/** the folder that holds the Kokoro model files, or null */
export function ttsDir() {
  return ttsFolders().find((d) => existsSync(join(d, 'kokoro-v1.0.onnx')) && existsSync(join(d, 'voices-v1.0.bin'))) || null;
}

/** every conda installation and environment this user has: the active one, the ones conda has recorded, the usual homes */
function condaPrefixes() {
  const home = homedir(), env = process.env, list = [];
  if (env.CONDA_PREFIX) list.push(env.CONDA_PREFIX);
  if (env.CONDA_EXE) list.push(resolve(dirname(env.CONDA_EXE), '..'));
  const recorded = join(home, '.conda', 'environments.txt');           // conda appends every environment it creates here
  if (existsSync(recorded)) list.push(...readFileSync(recorded, 'utf8').split(/\r?\n/).map((x) => x.trim()).filter(Boolean));
  const bases = ['miniconda3', 'anaconda3', 'miniforge3', 'mambaforge'].map((n) => join(home, n));
  if (env.ProgramData) bases.push(join(env.ProgramData, 'miniconda3'), join(env.ProgramData, 'anaconda3'));
  for (const base of [...bases, ...list.slice()]) {
    list.push(base);
    const envs = join(base, 'envs');
    if (existsSync(envs)) for (const d of readdirSync(envs)) list.push(join(envs, d));
  }
  const user = join(home, '.conda', 'envs');
  if (existsSync(user)) for (const d of readdirSync(user)) list.push(join(user, d));
  return list;
}

function candidates(kind) {
  const list = [process.env[NEEDS[kind].env], process.env.OX_PYTHON];
  for (const d of ttsFolders()) list.push(join(d, 'venv', 'Scripts', 'python.exe'), join(d, 'venv', 'bin', 'python'));
  list.push('python', 'python3');
  for (const p of condaPrefixes()) list.push(join(p, 'python.exe'), join(p, 'bin', 'python'));
  // a bare command is tried as it is; a path only if it exists
  return [...new Set(list.filter(Boolean))].filter((c) => !/[\\/]/.test(c) || existsSync(c));
}

const found = {};
/** a Python that can do the job (kind: av | sci | pil | tts); throws with advice unless must is false */
export function findPython(kind = 'av', { must = true } = {}) {
  if (!(kind in found)) {
    found[kind] = null;
    for (const c of candidates(kind)) {
      const r = spawnSync(c, ['-c', NEEDS[kind].test + '; print("ok")'], { encoding: 'utf8' });
      if (r.status === 0 && /ok/.test(r.stdout || '')) { found[kind] = c; break; }
    }
  }
  if (!found[kind] && must) {
    throw new Error(`No Python found for ${NEEDS[kind].what}. Fix: ${NEEDS[kind].fix} — or set ${NEEDS[kind].env} to an interpreter that has them (node tools/doctor.mjs shows what was found).`);
  }
  return found[kind];
}
