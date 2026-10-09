// YouTube chapters from the film's own timing, checked against YouTube's rules.
//   node tools/chapters.mjs [--cut full]        ->  build/<cut>/chapters.txt (paste into the video description)
//
// A scene starts a chapter when js/script.js gives it a `youtube: 'Title'`; the scenes after it, up to the
// next such scene, belong to it. A chapter starts at the whole second at or before its first spoken line
// (the scene's start if it has none), the first one at 0:00. YouTube shows chapters only if the first is at
// 0:00, there are at least three and every one lasts at least 10 s — one short chapter switches off all of
// them, without a warning. A chapter under 10 s is first moved earlier (never into the middle of a spoken
// line, never leaving the one before it under 10 s); if that cannot work, it joins the chapter before it.
// Exits 1 if the result still breaks a rule.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const cut = arg('cut', 'full');
const T = JSON.parse(readFileSync(join(root, 'build', cut, 'timing.json'), 'utf8'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const MIN = 10;

const marked = T.scenes.filter((s) => s.youtube);
if (!marked.length) {
  console.log('No scene has a `youtube:` title in js/script.js. Scenes, to choose from:');
  for (const s of T.scenes) console.log(`  ${mmss(s.start)}  ${s.id}  ${s.title}`);
  process.exit(0);
}
const firstLine = (s) => Math.min(...T.cues.filter((c) => c.scene === s.id).map((c) => c.start), s.start + s.dur);
let ch = marked.map((s, i) => ({ title: s.youtube, at: i === 0 ? 0 : Math.floor(T.cues.some((c) => c.scene === s.id) ? firstLine(s) : s.start) }));
const inLine = (t) => T.cues.some((c) => c.start < t && t < c.end);
const len = (i) => (i + 1 < ch.length ? ch[i + 1].at : T.duration) - ch[i].at;

for (let i = 0; i < ch.length; i++) {
  if (len(i) >= MIN) continue;
  if (i === 0) {                                              // the opening chapter is short: start the next one later
    if (ch.length < 2) break;
    let ok = false;
    for (let at = MIN; at <= MIN + 5 && (ch.length < 3 || at <= ch[2].at - MIN); at++) if (!inLine(at)) { ch[1].at = at; ok = true; break; }
    if (!ok) { console.log(`  "${ch[1].title}" joins "${ch[0].title}"`); ch.splice(1, 1); }
    i = -1; continue;
  }
  const end = i + 1 < ch.length ? ch[i + 1].at : T.duration;  // a later chapter is short: start it earlier
  let moved = false;
  for (let at = Math.floor(end - MIN); at >= ch[i - 1].at + MIN && at > end - MIN - 5; at--) if (!inLine(at)) { ch[i].at = at; moved = true; break; }
  if (!moved) { console.log(`  "${ch[i].title}" would last ${len(i).toFixed(1)} s: it joins "${ch[i - 1].title}"`); ch.splice(i, 1); }
  i = Math.max(-1, i - 2);                                    // look at its neighbours again
}
const bad = [];
if (ch.length < 3) bad.push(`only ${ch.length} chapters (YouTube needs at least 3)`);
ch.forEach((c, i) => { if (len(i) < MIN) bad.push(`"${c.title}" lasts ${len(i).toFixed(1)} s`); });
const lines = ch.map((c) => `${mmss(c.at)} ${c.title}`);
writeFileSync(join(root, 'build', cut, 'chapters.txt'), lines.join('\n') + '\n', 'utf8');
ch.forEach((c, i) => console.log(`${lines[i].padEnd(40)} ${len(i).toFixed(1)} s`));
if (bad.length) { console.log('YouTube will not show these chapters: ' + bad.join('; ')); process.exit(1); }
console.log(`build/${cut}/chapters.txt: ${ch.length} chapters, each at least ${MIN} s`);
