// When is it said? Film times of lines and words, for looking at the right frame.
//
//   node tools/when.mjs                               every line: when it starts, how long it is spoken
//   node tools/when.mjs s-how/steps                   every word of that line: seconds into the line, and film time
//   node tools/when.mjs s-how/steps voice. --plus 0.3 one film time (0.3 s after the word starts) — e.g.
//   node tools/still.mjs --t $(node tools/when.mjs s-how/steps voice. --plus 0.3)
//
// A word is matched like S.w() matches it: case and punctuation are ignored; add --n 1 for its second occurrence.
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { build, CUTS, warp } = createRequire(import.meta.url)(join(root, 'js', 'lib', 'build.js'));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
const S = build(opt('cut', CUTS[CUTS.length - 1]));
const plain = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

if (!pos.length) {
  for (const sc of S.scenes) {
    console.log(`\n${sc.id}  ${mmss(sc.start)} – ${mmss(sc.start + sc.dur)}  ${sc.title}`);
    for (const c of sc.cues) console.log(`  ${(sc.id + '/' + c.id).padEnd(22)} ${(sc.start + c.at).toFixed(2).padStart(7)}s  window ${c.dur.toFixed(1)}  ${c.speech ? 'spoken ' + c.speech.toFixed(1) : 'no voice '}  ${c.en.slice(0, 70)}`);
  }
  console.log(`\nfilm ${mmss(S.duration)}` + (S.voice ? ` · voice "${S.voice.name}"` : ' · no voice') + ` · the plan ${mmss(S.plan.duration)}`);
} else {
  const [sid, cid] = pos[0].split('/');
  const sc = S.scenes.find((s) => s.id === sid);
  const w = sc && sc.w[cid];
  if (!sc || sc.c[cid] === undefined) { console.error(`no line ${pos[0]} (lines are written scene/cue, e.g. ${S.scenes[0].id}/${S.scenes[0].cues[0].id})`); process.exit(1); }
  if (!w) { console.error(`${pos[0]} has no word times yet: lay a voice in first (node tools/make.mjs --voice … --as-plan)`); process.exit(1); }
  const film = (t) => sc.start + warp(sc.map.p, sc.map.a, t);
  if (pos.length === 1) {
    w.words.forEach((x, i) => console.log(`${x.padEnd(24)} +${(w.t[i] - sc.c[cid]).toFixed(2).padStart(5)} in the plan   film ${film(w.t[i]).toFixed(2)}s`));
    console.log(`${'(the line has been said)'.padEnd(24)} +${(w.end - sc.c[cid]).toFixed(2).padStart(5)} in the plan   film ${film(w.end).toFixed(2)}s`);
  } else {
    const want = Number(opt('n', 0));
    let seen = 0, hit = -1;
    w.words.forEach((x, i) => { if (hit < 0 && plain(x) === plain(pos[1]) && seen++ === want) hit = i; });
    if (hit < 0) { console.error(`"${pos[1]}" is not in ${pos[0]}: ${w.words.join(' ')}`); process.exit(1); }
    console.log((film(w.t[hit]) + Number(opt('plus', 0))).toFixed(2));
  }
}
