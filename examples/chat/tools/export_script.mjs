// Export everything that is derived from js/script.js (and js/voice.js, once the narration exists):
//   build/<cut>/timing.json                  scene starts, narration cues, caption segments — what every other tool reads
//   script/<cut>/captions_<lang>.{srt,vtt}   sidecar subtitles (on the voice, if there is one)
//   script/<cut>/narration.md                the voice-over script with timestamps
//
//   node tools/export_script.mjs [--cut full|all] [--no-voice]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { build, CUTS } = createRequire(import.meta.url)(join(root, 'js', 'lib', 'build.js'));
const i = process.argv.indexOf('--cut');
const want = i > 0 ? process.argv[i + 1] : CUTS[CUTS.length - 1];
const quiet = process.argv.includes('--quiet');
const noVoice = process.argv.includes('--no-voice');

const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (v, n = 2) => String(v).padStart(n, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
const mmss = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

for (const cut of want === 'all' ? CUTS : [want]) {
  const S = build(cut, { voice: !noVoice });
  mkdirSync(join(root, 'build', cut), { recursive: true });
  mkdirSync(join(root, 'script', cut), { recursive: true });
  writeFileSync(join(root, 'build', cut, 'timing.json'), JSON.stringify({
    cut, cuts: CUTS, slug: S.slug, title: S.title, posters: S.posters, fps: S.fps, beat: S.beat, duration: S.duration, plan: S.plan, voice: S.voice,
    scenes: S.scenes.map((s) => ({ id: s.id, title: s.title, start: s.start, dur: s.dur, c: s.c, ...(s.youtube ? { youtube: s.youtube } : {}) })),
    cues: S.cues, captions: S.captions,
  }, null, 2));
  const langs = Object.keys(S.captions);
  for (const lang of langs) {
    const L = S.captions[lang];
    writeFileSync(join(root, 'script', cut, `captions_${lang}.srt`), L.map((c, k) => `${k + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n'), 'utf8');
    writeFileSync(join(root, 'script', cut, `captions_${lang}.vtt`), 'WEBVTT\n\n' + L.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n'), 'utf8');
  }
  const words = S.cues.reduce((n, c) => n + c.en.replace(/—/g, ' ').split(/\s+/).filter(Boolean).length, 0);
  const others = langs.filter((l) => l !== 'en');
  const tick = '`';
  let md = `# ${S.title || S.slug} — narration script${CUTS.length > 1 ? ` (${cut} cut)` : ''}\n\nLength ${mmss(S.duration)} · ${S.cues.length} lines · ${words} words.\n\n`
    + 'Each line starts at **start**; **window** is the time it has in the film (with a voice: as long as it is\n'
    + 'spoken, plus the room the plan leaves after it). To record it yourself: read one line per\n'
    + `file (${tick}01.wav${tick}, ${tick}02.wav${tick}, … in this order) into a folder such as ${tick}voice/${cut}/me/${tick}, then run\n`
    + `${tick}python tools/narration.py --clips voice/${cut}/me${tick} and render again (captions and pictures follow the voice).\n`
    + `To change words or pacing, edit ${tick}js/script.js${tick} and run ${tick}node tools/export_script.mjs${tick}.\n`;
  if (S.voice) {
    md += `\nCurrent voice: **${S.voice.name}** — ${S.voice.lines} of ${S.cues.length} lines spoken`
      + (S.voice.stale.length ? `; to redo: ${S.voice.stale.join(', ')}` : '') + '. The **spoken** column is how long the voice takes.\n';
  }
  let n = 0;
  for (const sc of S.scenes) {
    md += `\n## ${sc.title}  (${mmss(sc.start)} – ${mmss(sc.start + sc.dur)})\n\n| # | start | window | spoken | English (and how it is said, where that differs) |${others.map((l) => ` ${l} |`).join('')}\n| --- | --- | --- | --- | --- |${others.map(() => ' --- |').join('')}\n`;
    for (const c of S.cues.filter((x) => x.scene === sc.id)) {
      md += `| ${String(++n).padStart(2, '0')} | ${mmss(c.start)} | ${(c.end - c.start).toFixed(1)} s | ${c.speech ? c.speech.toFixed(1) + ' s' : '—'} | ${c.en}${c.say !== c.en ? `<br>*say:* ${c.say}` : ''} |${others.map((l) => ` ${c[l] || ''} |`).join('')}\n`;
    }
  }
  writeFileSync(join(root, 'script', cut, 'narration.md'), md, 'utf8');
  if (!quiet) {
    console.log(`${cut.padEnd(5)} ${mmss(S.duration)} · ${S.cues.length} narration lines · ${words} words · ${langs.map((l) => `${S.captions[l].length} ${l.toUpperCase()}`).join(' / ')} captions`
      + (S.voice ? ` · voice "${S.voice.name}": ${S.voice.lines}/${S.cues.length} lines` : ' · no voice (js/voice.js is empty or missing)'));
  }
  if (S.voice && S.voice.stale.length) console.log(`  !! spoken with different words (even pacing used instead): ${S.voice.stale.join(', ')} — synthesise or record again, then run tools/narration.py`);
}
