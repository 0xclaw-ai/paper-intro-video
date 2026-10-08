#!/usr/bin/env python
"""Narration with Kokoro-82M, a small open text-to-speech model that runs offline on the CPU.

    model    Kokoro-82M v1.0 (hexgrad), weights under Apache-2.0
    runtime  kokoro-onnx 0.6+ (thewh1teagle), MIT; phonemes from espeak-ng

Setup, once (about 400 MB; nothing else on the machine changes). The folder can live in the project (.tts/)
or anywhere else and be shared by every film: point OX_TTS at it.

    python -m venv .tts/venv
    .tts/venv/Scripts/python -m pip install kokoro-onnx
    curl -L -o .tts/kokoro-v1.0.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/kokoro-v1.0.onnx
    curl -L -o .tts/voices-v1.0.bin  https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.1/voices-v1.0.bin

(The v1.1 model files report how long every phoneme lasts; that is where the word times come from.)
Then:

    .tts/venv/Scripts/python tools/voice_kokoro.py                       # every line, voice af_heart
    .tts/venv/Scripts/python tools/voice_kokoro.py --voice bm_george --speed 0.95
    .tts/venv/Scripts/python tools/voice_kokoro.py --only 4,17           # redo two lines after changing their words
    .tts/venv/Scripts/python tools/voice_kokoro.py --sample 4,21 --voice am_michael   # one short file to compare voices
    python tools/narration.py --clips voice/full/af_heart --pause 0.8    # lay it on the film; captions and pictures follow

It writes voice/<cut>/<name>/NN.wav (24 kHz) and NN.json per narration line: the words that were said,
when each of them starts (from the model's own phoneme durations), and the phonemes — so names and
numbers can be checked without listening (phonemes.txt has them all).
"""
import argparse, difflib, json, os, re, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# How espeak gets a word wrong -> how it is said. Applied to the phonemes before they are spoken;
# phonemes.txt shows the result, so a new entry can be checked there.
SAY = {
    'hˈækəθən': 'hˈækəθˌɑːn',   # hackathon: the last syllable is "thon", not a swallowed "thun"
}


def write_wav(path, x, sr):
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())


def word_starts(tokens, token_phonemes, spoken):
    """When each word of the text starts, from the per-phoneme timings of the whole line.

    The line is phonemized as a whole (words can merge or reduce in context), each word also on its
    own; the two phoneme strings are aligned, and a word starts where its first phoneme is spoken."""
    line = [(t.phoneme, t.start) for t in spoken if not t.phoneme.isspace()]
    whole = ''.join(p for p, _ in line)
    parts = [re.sub(r'\s', '', p or '') for p in token_phonemes]
    apart = ''.join(parts)
    to_whole = np.full(len(apart) + 1, -1)
    for a, b, n in difflib.SequenceMatcher(None, apart, whole, autojunk=False).get_matching_blocks():
        to_whole[a:a + n] = np.arange(b, b + n)
    starts, at, done = [], 0, -1                                    # done: the last phoneme of the line the words so far have used
    for part in parts:
        hit = [int(to_whole[k]) for k in range(at, at + len(part)) if to_whole[k] >= 0]
        if hit and to_whole[at] >= 0:
            j = hit[0]                                              # its first phoneme was found in the line
        else:                                                       # said differently in context ("a", "to"): it starts right after the word before
            j = min(done + 1, hit[0]) if hit else done + 1
        j = min(max(j, 0), len(line) - 1)
        starts.append(line[j][1])
        done = max(done, hit[-1] if hit else j)
        at += len(part)
    return [float(s) for s in np.maximum.accumulate(starts)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    ap.add_argument('--voice', default='af_heart', help='a Kokoro voice: af_heart, af_bella, am_michael, am_fenrir, bf_emma, bm_george, …')
    ap.add_argument('--speed', type=float, default=1.0, help='speaking rate; 0.9 is calmer, 1.1 brisker')
    ap.add_argument('--lang', default=None, help='espeak language for the phonemes (default: en-gb for b* voices, else en-us)')
    ap.add_argument('--name', help='folder name under voice/<cut>/ (default: the voice)')
    ap.add_argument('--models', default=os.environ.get('OX_TTS') or os.path.join(ROOT, '.tts'), help='folder with kokoro-v1.0.onnx and voices-v1.0.bin (default: $OX_TTS, else .tts/ in the project)')
    ap.add_argument('--only', help='line numbers to (re)do, e.g. 4,17')
    ap.add_argument('--sample', help='line numbers to read into one sample file (out/extras/voice_samples/<voice>.wav) instead')
    args = ap.parse_args()

    try:
        from kokoro_onnx import Kokoro
    except ImportError:
        raise SystemExit('kokoro-onnx is not installed in this Python — see the setup at the top of tools/voice_kokoro.py')
    model, voices = os.path.join(args.models, 'kokoro-v1.0.onnx'), os.path.join(args.models, 'voices-v1.0.bin')
    for f in (model, voices):
        if not os.path.exists(f):
            raise SystemExit(f'{f} is missing — see the setup at the top of tools/voice_kokoro.py')
    kokoro = Kokoro(model, voices)
    timed = hasattr(kokoro, 'create_timed') and getattr(kokoro, 'has_timings', False)
    lang = args.lang or ('en-gb' if args.voice[:1] == 'b' else 'en-us')
    cues = json.load(open(os.path.join(ROOT, 'build', args.cut, 'timing.json'), encoding='utf-8'))['cues']

    def phonemes(text):
        try:
            ph = kokoro.tokenizer.phonemize(text, lang)
        except Exception:
            return None
        for wrong, right in SAY.items():
            ph = ph.replace(wrong, right)
        return ph

    def say(text):
        """-> samples, sample rate, per-phoneme timings (empty when the model does not report them)"""
        ph = phonemes(text)                                         # spoken from the corrected phonemes when there are any
        spoken_as, as_ph = (ph, True) if ph else (text, False)
        if timed:                                                   # no pauses added here: tools/narration.py sets the pace for every voice alike
            return kokoro.create_timed(spoken_as, voice=args.voice, speed=args.speed, lang=lang, is_phonemes=as_ph, sentence_pause=0.0, clause_pause=0.0)
        x, sr = kokoro.create(spoken_as, voice=args.voice, speed=args.speed, lang=lang, is_phonemes=as_ph)
        return x, sr, []

    if args.sample:
        want = [int(x) for x in args.sample.split(',')]
        parts, sr = [], 24000
        for n in want:
            x, sr, _ = say(cues[n - 1]['say'])
            parts += [np.asarray(x, np.float32), np.zeros(int(0.6 * sr), np.float32)]
        out = os.path.join(ROOT, 'out', 'extras', 'voice_samples')
        os.makedirs(out, exist_ok=True)
        f = os.path.join(out, f'{args.voice}_speed{args.speed:g}.wav')
        write_wav(f, np.concatenate(parts), sr)
        print(f'{f}: lines {want}, {sum(len(p) for p in parts) / sr:.1f}s')
        return

    name = args.name or args.voice
    out = os.path.join(ROOT, 'voice', args.cut, name)
    os.makedirs(out, exist_ok=True)
    only = set(int(x) for x in args.only.split(',')) if args.only else None
    total, log = 0.0, []
    for n, c in enumerate(cues, 1):
        if only and n not in only:
            continue
        text = c['say']
        x, sr, spoken = say(text)
        x = np.asarray(x, np.float32)
        write_wav(os.path.join(out, f'{n:02d}.wav'), x, sr)
        tokens = text.split()
        each = [phonemes(tok) if re.search(r'[A-Za-z0-9]', tok) else tok for tok in tokens]
        info = {'say': text, 'voice': args.voice, 'speed': args.speed, 'phonemes': phonemes(text)}
        if spoken and all(p is not None for p in each):
            info['words'] = [round(s, 4) for s in word_starts(tokens, each, spoken)]
        elif all(p is not None for p in each):                      # no timings: at least say how long each word is, in phonemes
            info['weights'] = [float(len(re.sub(r"[\sˈˌː.,;:!?—'\-]", '', p))) if re.search(r'[A-Za-z0-9]', tok) else 0.0 for tok, p in zip(tokens, each)]
        json.dump(info, open(os.path.join(out, f'{n:02d}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        total += len(x) / sr
        log.append(f'{n:02d}  {len(x) / sr:5.2f}s  {text}\n              {info["phonemes"]}')
        print(f'{n:02d} {len(x) / sr:5.2f}s  {"words timed" if "words" in info else "no word times"}  {text[:70]}')
    json.dump({'engine': 'kokoro-onnx', 'model': 'Kokoro-82M v1.0', 'voice': args.voice, 'speed': args.speed, 'lang': lang, 'word_times': bool(timed),
               'licence': 'model weights Apache-2.0 (hexgrad/Kokoro-82M), kokoro-onnx MIT'},
              open(os.path.join(out, 'voice.json'), 'w', encoding='utf-8'), indent=1)
    open(os.path.join(out, 'phonemes.txt'), 'a' if only else 'w', encoding='utf-8').write('\n'.join(log) + '\n')
    print(f'{len(log)} line(s), {total:.1f}s with {args.voice} at speed {args.speed:g} -> {os.path.relpath(out, ROOT)}')
    print(f'next:  python tools/narration.py --clips {os.path.relpath(out, ROOT).replace(os.sep, "/")} --pause 0.8')


if __name__ == '__main__':
    main()
