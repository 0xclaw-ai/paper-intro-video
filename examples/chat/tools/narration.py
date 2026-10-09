#!/usr/bin/env python
"""Lay the narration onto the timeline, and put captions and pictures on the voice.

Input: one WAV per narration line (01.wav, 02.wav, … in script order; the numbered script is
script/<cut>/narration.md) — from tools/voice_kokoro.py, tools/voice_sapi.ps1 or your own
recording. A clip may come with NN.json telling when each word starts; without it the word
times are worked out from the pauses in the clip.

    python tools/narration.py --clips voice/full/<name>

Output
    build/<cut>/narration.wav   the voice track, as long as the video (48 kHz stereo)
    build/<cut>/voice.json      when somebody is speaking (the music is lowered there), levels, fit report
    js/voice.js                 when every word of every line starts — js/script.js times the caption
                                segments with it, js/scenes.js the pictures that belong to a word

Then re-export and render (captions and pictures move, so the picture has to be rendered again):
    node tools/export_script.mjs && node tools/export_sfx.mjs --cut full && python tools/music.py
    node tools/render.mjs
Needs: numpy (scipy, if present, gives a cleaner resampler and a rumble filter).
"""
import argparse, glob, json, os, re, subprocess, wave
import numpy as np

try:
    from scipy import signal
except Exception:                                                   # pragma: no cover
    signal = None

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOP, WIN = 0.005, 0.02                                              # level envelope: 20 ms windows every 5 ms


def read_wav(path):
    with wave.open(path, 'rb') as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f'{path}: only 16-bit PCM WAV is supported (export as "WAV, signed 16-bit")')
    x = np.frombuffer(raw, '<i2').astype(np.float32).reshape(-1, ch).mean(axis=1) / 32768.0
    if sr != SR:
        if signal is not None:
            g = np.gcd(SR, sr)
            x = signal.resample_poly(x, SR // g, sr // g).astype(np.float32)
        else:
            t = np.arange(int(len(x) * SR / sr)) * (sr / SR)
            x = np.interp(t, np.arange(len(x)), x).astype(np.float32)
    return x, sr


def level_db(x):
    """Short-term level in dB, one value every HOP seconds."""
    h, w = int(HOP * SR), int(WIN * SR)
    c = np.cumsum(np.concatenate([[0.0], x.astype(np.float64) ** 2]))
    i = np.arange(0, max(1, len(x) - w), h)
    return 10 * np.log10((c[np.minimum(i + w, len(x))] - c[i]) / w + 1e-12)


def analyse(x):
    """Where the speech starts and ends in a clip, and the pauses inside it (seconds, file time)."""
    e = level_db(x)
    loud = np.percentile(e, 92)                                     # the level of voiced speech
    on = e > max(loud - 36.0, -62.0)
    idx = np.nonzero(on)[0]
    if not len(idx):
        return 0.0, 0.0, [], loud
    a = max(0.0, idx[0] * HOP - 0.02)
    b = min(len(x) / SR, idx[-1] * HOP + WIN + 0.05)
    quiet = e < max(loud - 30.0, -56.0)                             # a pause is a little stricter than "not speech"
    pauses, k = [], idx[0]
    while k < idx[-1]:
        if quiet[k]:
            j = k
            while j < idx[-1] and quiet[j]:
                j += 1
            if (j - k) * HOP >= 0.07:
                pauses.append((k * HOP + WIN / 2, j * HOP + WIN / 2))
            k = j
        else:
            k += 1
    return a, b, pauses, loud


STRENGTH = {'.': 1.0, '?': 1.0, '!': 1.0, ':': 0.75, ';': 0.75, '—': 0.75, ',': 0.5}


def weight(tok):
    n = len(re.sub(r'[^A-Za-z0-9]', '', tok))
    return 0.0 if n == 0 else 1.4 + n                               # every word costs a little, long words more


def estimate(tokens, weights, length, pauses):
    """Word start times from the pauses alone: the long pauses are matched to the punctuation they
    most plausibly belong to; between two matched pauses the words share the time by their length."""
    n = len(tokens)
    w = np.array(weights, float)
    total = max(w.sum(), 1e-6)
    silent = sum(p1 - p0 for p0, p1 in pauses)
    speech = max(length - silent, 1e-3)
    anchors = [(i, STRENGTH[t[-1]]) for i, t in enumerate(tokens[:-1]) if t[-1] in STRENGTH]
    exp = [w[:i + 1].sum() / total * speech for i, _ in anchors]    # speech time that has passed at each anchor
    pos, acc = [], 0.0
    for p0, p1 in pauses:
        pos.append(p0 - acc)
        acc += p1 - p0
    A, P = len(anchors), len(pauses)
    INF = 1e9
    # cost[j][k]: best cost using the first j anchors and the first k pauses
    cost = np.full((A + 1, P + 1), INF)
    back = np.zeros((A + 1, P + 1), np.int8)
    cost[0, :] = 0.0
    for j in range(1, A + 1):
        s = anchors[j - 1][1]
        for k in range(0, P + 1):
            best, how = cost[j - 1, k] + 1.6 * s, 1                 # this anchor has no audible pause
            if k > 0:
                if cost[j, k - 1] < best:
                    best, how = cost[j, k - 1], 2                   # this pause belongs to no anchor
                d = abs(exp[j - 1] - pos[k - 1])
                L = pauses[k - 1][1] - pauses[k - 1][0]
                c = cost[j - 1, k - 1] + d / 0.45 - 2.2 * s * min(L, 0.6) / 0.3
                if c < best:
                    best, how = c, 3
            cost[j, k], back[j, k] = best, how
    match, j, k = {}, A, P
    while j > 0:
        how = back[j, k]
        if how == 3:
            match[anchors[j - 1][0]] = pauses[k - 1]
            j, k = j - 1, k - 1
        elif how == 2:
            k -= 1
        else:
            j -= 1
    starts = np.zeros(n)
    seg0, t0 = 0, 0.0
    cuts = sorted(match.items()) + [(n - 1, (length, length))]
    for last, (p0, p1) in cuts:
        ws = w[seg0:last + 1]
        span = max(p0 - t0, 0.0)
        cum = np.concatenate([[0.0], np.cumsum(ws)])[:-1] / max(ws.sum(), 1e-6)
        starts[seg0:last + 1] = t0 + cum * span
        seg0, t0 = last + 1, p1
    return starts, len(match), A


def from_events(say, spans, events, src_sr, a, b, pauses, scale=None):
    """Word starts from an engine's own word events ([seconds, character position, length])."""
    if not events:
        return None
    ev = np.array(events, float)
    # System.Speech reports positions as if the stream were 16 kHz; pick the reading that starts
    # the first word where the sound starts, the last word before the sound ends, and the words
    # after punctuation at the end of a pause.
    ends = np.array([p1 for _, p1 in pauses]) if pauses else np.zeros(0)
    after = [k for k in range(1, len(spans)) if say[spans[k - 1][1] - 1] in STRENGTH]
    best = (None, -1e9)
    for scale in ((scale,) if scale else (1.0, 16000.0 / src_sr, 22050.0 / src_sr, 24000.0 / src_sr)):
        t = {}
        for sec, p, _ in ev:
            for k, (s0, s1) in enumerate(spans):
                if s0 <= p < s1 and k not in t:
                    t[k] = sec * scale
        if not t:
            continue
        score = sum(1 for k in after if k in t and len(ends) and np.abs(ends - t[k]).min() < 0.09)
        score += 1 if abs(min(t.values()) - a) < 0.12 else 0
        score -= 100 if max(t.values()) > b - 0.03 else 0
        if score > best[1]:
            best = ((scale, t), score)
    if best[0] is None:
        return None
    scale, t = best[0]
    starts = np.full(len(spans), np.nan)
    for k, v in t.items():
        starts[k] = v - a
    for k in range(len(spans) - 2, -1, -1):                         # a token the voice skipped ("—") starts with the next word
        if np.isnan(starts[k]):
            starts[k] = starts[k + 1]
    if np.isnan(starts).any():
        return None
    return np.maximum.accumulate(np.maximum(starts, 0.0)), scale, best[1], len(after)


def stretch_pauses(y, tokens, starts, pauses, want, most=0.0):
    """Set the pace between sentences. A pause after a sentence that is shorter than `want` seconds is
    lengthened to it, one longer than `most` (if given) is shortened to it; after a colon or a dash the
    limits are 0.7 x. Commas are left alone. Silence is added or taken out in the middle of the pause.
    Returns the new clip, the word starts, the pauses and the seconds added (negative: taken out)."""
    starts = np.array(starts, float)
    if want <= 0 and most <= 0:
        return y, starts, [tuple(p) for p in pauses], 0.0
    edits = []                                                      # (middle of the pause, seconds to add, first word after it)
    for k in range(1, len(tokens)):
        mark = tokens[k - 1][-1]
        if mark not in '.?!:;—':
            continue
        f = 1.0 if mark in '.?!' else 0.7
        hit = [p for p in pauses if abs(p[1] - starts[k]) < 0.09]   # the pause that ends where this word starts
        if not hit:
            continue
        length = hit[0][1] - hit[0][0]
        if want > 0 and f * want - length > 0.02:
            edits.append(((hit[0][0] + hit[0][1]) / 2, f * want - length, k))
        elif most > 0 and length - f * most > 0.02 and f * most >= 0.15:
            edits.append(((hit[0][0] + hit[0][1]) / 2, f * most - length, k))
    if not edits:
        return y, starts, [tuple(p) for p in pauses], 0.0
    fade = int(0.004 * SR)
    pieces, prev, total = [], 0, 0.0
    new_starts = starts.copy()
    new_pauses = [list(p) for p in pauses]
    for mid, extra, k in edits:
        a = int((mid + min(extra, 0.0) / 2) * SR)                   # taking silence out: stop early …
        b = int((mid - min(extra, 0.0) / 2) * SR)                   # … and pick up again later
        head = y[prev:a].copy()
        if len(head) > 2 * fade:
            head[-fade:] *= np.linspace(1, 0, fade)
            if prev > 0:
                head[:fade] *= np.linspace(0, 1, fade)
        pieces.append(head)
        if extra > 0:
            pieces.append(np.zeros(int(round(extra * SR)), np.float32))
        prev = b
        new_starts[k:] += extra
        for p, q in zip(pauses, new_pauses):
            if p[0] >= mid:
                q[0] += extra; q[1] += extra
            elif p[0] < mid < p[1]:
                q[1] += extra
        total += extra
    tail = y[prev:].copy()
    if len(tail) > fade and prev > 0:
        tail[:fade] *= np.linspace(0, 1, fade)
    pieces.append(tail)
    return np.concatenate(pieces), new_starts, [tuple(q) for q in new_pauses], total


def js_file(path, var, what, data):
    body = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('"s-', '\n    "s-')
    open(path, 'w', encoding='utf-8', newline='\n').write(
        f'/* {os.path.basename(path)} — GENERATED by tools/narration.py. {what} */\n'
        '(function (root) {\n  const V = ' + body + ';\n'
        f"  if (typeof module !== 'undefined' && module.exports) module.exports = V; else root.{var} = V;\n"
        "})(typeof window !== 'undefined' ? window : globalThis);\n")


def export_timing(cut):
    """js/script.js decides when every line starts once it knows how long the voice takes."""
    r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'export_script.mjs'), '--cut', cut, '--quiet'], cwd=ROOT)
    if r.returncode != 0:
        raise SystemExit('node tools/export_script.mjs failed (Node.js 22+ has to be on the PATH)')
    return json.load(open(os.path.join(ROOT, 'build', cut, 'timing.json'), encoding='utf-8'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    ap.add_argument('--clips', help='folder with one WAV per narration line, sorted in script order')
    ap.add_argument('--out')
    ap.add_argument('--level', type=float, default=-20.0, help='target speech level, dBFS RMS while speaking')
    ap.add_argument('--pause', type=float, default=0.0, help='lengthen the pauses between sentences to at least this many seconds (0 = leave the clips as they are)')
    ap.add_argument('--max-pause', type=float, default=0.0, help='shorten the pauses between sentences to at most this many seconds (0 = leave them)')
    ap.add_argument('--no-words', action='store_true', help='ignore NN.json word events and work the word times out from the pauses')
    ap.add_argument('--as-plan', action='store_true', help='also store this pacing as the plan the scenes are timed to (js/pacing.js): for the first voice of a film, before timing the scenes to its words')
    ap.add_argument('--slack', type=float, default=0.5, help='with --as-plan: room the plan leaves after each line, before the pause to the next (seconds)')
    ap.add_argument('--none', action='store_true', help='remove the voice: the film goes back to the plan')
    args = ap.parse_args()

    voice_js = os.path.join(ROOT, 'js', 'voice.js')
    if args.none:
        js_file(voice_js, 'OXVOICE', 'No voice: the film runs on the plan in js/script.js.', {'cut': args.cut, 'name': None, 'voice': None, 'cues': {}})
        export_timing(args.cut)
        print('js/voice.js emptied: the film runs on its plan again (render it with  node tools/render.mjs --no-voice)')
        return
    if not args.clips:
        raise SystemExit('--clips <folder> is required (or --none to remove the voice)')

    timing = export_timing(args.cut)                               # the lines as js/script.js has them now
    cues = timing['cues']
    files = sorted(glob.glob(os.path.join(args.clips, '[0-9]*.wav')))
    if len(files) != len(cues):
        raise SystemExit(f'{len(files)} clips in {args.clips}, but the {args.cut} cut has {len(cues)} narration lines (see script/{args.cut}/narration.md)')
    meta_path = os.path.join(args.clips, 'voice.json')
    meta = json.load(open(meta_path, encoding='utf-8')) if os.path.exists(meta_path) else {'engine': 'recording'}
    name = os.path.basename(os.path.normpath(args.clips))

    # 1 — every clip: where the speech is, where the pauses are, when each word starts
    clips, rows, votes = [], [], []
    for f, c in zip(files, cues):
        x, src_sr = read_wav(f)
        if signal is not None:                                      # take out rumble below the voice
            x = signal.sosfiltfilt(signal.butter(2, 70, 'hp', fs=SR, output='sos'), x).astype(np.float32)
        a, b, pauses, loud = analyse(x)
        y = x[int(a * SR):int(b * SR)].copy()
        fade = int(0.006 * SR)
        if len(y) > 2 * fade:
            y[:fade] *= np.linspace(0, 1, fade)
            y[-fade:] *= np.linspace(1, 0, fade)
        pauses = [(p0 - a, p1 - a) for p0, p1 in pauses]
        say = c['say']
        spans = [m.span() for m in re.finditer(r'\S+', say)]
        tokens = [say[s0:s1] for s0, s1 in spans]
        side = os.path.splitext(f)[0] + '.json'
        info = json.load(open(side, encoding='utf-8')) if os.path.exists(side) else {}
        stale = bool(info) and info.get('say') not in (None, say)
        how, starts, ev = 'pauses', None, None
        if not args.no_words and not stale:
            if info.get('words') and len(info['words']) == len(tokens):   # exact starts, seconds in the file
                starts, how = np.maximum.accumulate(np.maximum(np.array(info['words'], float) - a, 0.0)), 'engine'
            elif info.get('events'):
                ev = (say, spans, info['events'], src_sr, a, b, [(p0 + a, p1 + a) for p0, p1 in pauses])
                r = from_events(*ev)
                if r:
                    starts, how = r[0], 'engine'
                    votes.append(round(r[1] * src_sr))
                else:
                    ev = None
        if starts is None:
            weights = info.get('weights') if info.get('weights') and len(info['weights']) == len(tokens) else [weight(t) for t in tokens]
            starts, hit, of = estimate(tokens, weights, len(y) / SR, pauses)
            how = f'pauses {hit}/{of}'
        voiced = np.zeros(len(y), bool)                             # level is measured while speaking, not over the pauses
        rep = np.repeat(level_db(y) > loud - 25.0, int(HOP * SR))[:len(y)]
        voiced[:len(rep)] = rep
        rms = np.sqrt(np.mean(y[voiced] ** 2)) if voiced.any() else 1e-6
        clips.append(y)
        rows.append({'cue': c, 'tokens': tokens, 'starts': starts, 'pauses': pauses, 'how': how, 'rms': float(rms), 'stale': stale, 'ev': ev})
    if votes:                                                       # one voice, one clock: read every clip's word events the same way
        rate = max(set(votes), key=votes.count)
        for r in rows:
            if r['ev']:
                again = from_events(*r['ev'], scale=rate / r['ev'][3])
                if again:
                    r['starts'] = again[0]
    # an engine's word times have to agree with what is heard: a word after a full stop starts where a pause ends
    agree = places = 0
    for i, r in enumerate(rows):
        if r['how'] != 'engine':
            continue
        strong = [k for k in range(1, len(r['tokens'])) if r['tokens'][k - 1][-1] in '.?!:']
        ends = [p1 for _, p1 in r['pauses']]
        ok = sum(1 for k in strong if ends and min(abs(e - r['starts'][k]) for e in ends) < 0.12)
        if len(strong) >= 2 and ok < 0.5 * len(strong):             # they do not: go by the pauses for this line
            r['starts'], hit, of = estimate(r['tokens'], [weight(t) for t in r['tokens']], len(clips[i]) / SR, r['pauses'])
            r['how'] = f'pauses {hit}/{of} !'
        else:
            agree, places = agree + ok, places + len(strong)
            r['how'] = f'engine {ok}/{len(strong)}'

    # 2 — breathing room between sentences, if asked for
    added = 0.0
    for i, r in enumerate(rows):
        breath = r['cue'].get('breath') or 0.0                      # a line may ask for more room than the rest (js/script.js: breath)
        want = max(args.pause, breath) if args.pause > 0 else 0.0
        most = max(args.max_pause, want, breath) if args.max_pause > 0 else 0.0
        clips[i], r['starts'], r['pauses'], more = stretch_pauses(clips[i], r['tokens'], r['starts'], r['pauses'], want, most)
        r['len'] = len(clips[i]) / SR
        added += more

    # 3 — tell the film: js/voice.js (and js/pacing.js when this pacing becomes the plan)
    voice = {f"{r['cue']['scene']}/{r['cue']['id']}": {'say': r['cue']['say'], 'len': round(r['len'], 3), 'w': [round(float(t), 3) for t in r['starts']]}
             for r in rows if not r['stale']}
    rel = os.path.relpath(args.clips, ROOT).replace(os.sep, '/')
    js_file(voice_js, 'OXVOICE', f'When every word of every narration line starts (seconds after its line starts), from the clips in {rel}. '
            'Captions and pictures follow it; run tools/narration.py --none to go back to a film without a voice.',
            {'cut': args.cut, 'name': name, 'voice': meta, 'clips': rel, 'pause': args.pause, 'max_pause': args.max_pause, 'cues': voice})
    if args.as_plan:
        js_file(os.path.join(ROOT, 'js', 'pacing.js'), 'OXPACING', f'The plan: when each word was expected when js/scenes.js was timed (from {rel}), and how long each line is given. '
                'Any other voice is mapped onto it word by word, so do not regenerate this unless you re-time the scenes.',
                {'cut': args.cut, 'name': name, 'cues': {k: dict(v, dur=round(v['len'] + args.slack, 2)) for k, v in voice.items()}})
    timing = export_timing(args.cut)
    cues = timing['cues']

    # 4 — lay the lines on the film, every line at the same loudness (within reason) and nothing near the ceiling
    n = int(round(timing['duration'] * SR))
    mix = np.zeros(n, np.float32)
    target = 10 ** (args.level / 20)
    gains = np.array([target / max(r['rms'], 1e-6) for r in rows])
    med = np.median(gains)
    gains = np.clip(gains, med * 10 ** (-4 / 20), med * 10 ** (4 / 20))
    print(f"{'#':>2} {'start':>7} {'plan':>5} {'spoken':>6} {'room':>5} {'gain':>6}  {'words':<12} line")
    speak, tight = [], 0
    for i, (r, y, c) in enumerate(zip(rows, clips, cues)):
        g = gains[i]
        pk = np.abs(y).max() * g if len(y) else 0.0
        if pk > 0.84:
            g *= 0.84 / pk
        nxt = cues[i + 1]['start'] if i + 1 < len(cues) else timing['duration']
        room = nxt - (c['start'] + r['len'])                        # silence before the next line starts
        flag = ''
        if r['stale']:
            flag = '  <-- made for different words: synthesize/record this line again'
        elif room < 0.15:
            flag, tight = '  <-- runs into the next line', tight + 1
        print(f"{i + 1:2d} {c['start']:7.1f} {c['planned']:5.1f} {r['len']:6.2f} {room:5.2f} {20 * np.log10(g):+6.1f}  {r['how']:<12} {c['en'][:56]}{flag}")
        a0 = int(round(c['start'] * SR))
        m = min(len(y), n - a0)
        if m > 0 and not r['stale']:
            mix[a0:a0 + m] += y[:m] * g
            speak.append({'start': round(c['start'], 3), 'end': round(c['start'] + r['len'], 3)})
    spoken = sum(r['len'] for r in rows if not r['stale'])
    out = args.out or os.path.join(ROOT, 'build', args.cut, 'narration.wav')
    pcm = (np.clip(np.stack([mix, mix], axis=1), -1, 1) * 32767).astype('<i2')
    with wave.open(out, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    json.dump({'cut': args.cut, 'name': name, 'voice': meta, 'duration': timing['duration'], 'speech': round(spoken, 2), 'pause': args.pause, 'max_pause': args.max_pause, 'cues': speak},
              open(os.path.join(ROOT, 'build', args.cut, 'voice.json'), 'w', encoding='utf-8'), indent=1)
    plan = timing.get('plan', {}).get('duration', timing['duration'])
    print(f"\nvoice \"{name}\": {spoken:.1f}s of speech" + (f" (pauses between sentences set to {args.pause or 'any'}–{args.max_pause or 'any'} s: {added:+.1f}s)" if added else '')
          + f" · the film is now {int(timing['duration'] // 60)}:{timing['duration'] % 60:04.1f} (the plan: {int(plan // 60)}:{plan % 60:04.1f}) · voice peak {20 * np.log10(np.abs(mix).max() + 1e-9):.1f} dBFS"
          + (f" · {tight} line(s) leave no room before the next one" if tight else ''))
    if places:
        print(f"word times from the engine: at {agree} of {places} sentence starts they sit where a pause is heard to end"
              + ('' if agree >= 0.9 * places else '  <-- lower than expected: listen to a line, or run with --no-words to go by the pauses alone'))
    print(f'{os.path.relpath(out, ROOT)}, build/{args.cut}/voice.json, js/voice.js' + (', js/pacing.js' if args.as_plan else '') + ' written.')
    print('next:  node tools/export_sfx.mjs && python tools/music.py && node tools/render.mjs')


if __name__ == '__main__':
    main()
