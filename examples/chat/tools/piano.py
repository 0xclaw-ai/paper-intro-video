#!/usr/bin/env python
"""A soft piano over the skill's 40 Hz bed, synthesized here without external music samples.

    python tools/music.py --cut full        # first: the 40 Hz binaural bed and the cues -> audio/full/soundtrack.wav
    python tools/piano.py --cut full        # then:  audio/full/piano.wav and audio/full/bed.wav (piano + bed + cues)

Tuning. Every note is a ratio of the 40 Hz harmonic series (just intonation), so the piano is consonant with the
bed's 200 Hz / 240 Hz pair (harmonics 5 and 6 of 40 Hz) and with the cues, which tools/music.py tunes the same
way. The 40 Hz beat itself stays the bed's: a 200 Hz tone in the left ear and 240 Hz in the right, heard as a
beat only on headphones. The piano adds no amplitude modulation of its own.

Harmony and rhythm. I, vi, IV, V on a 160 Hz root, one chord every 2.4 s (four beats of the film's 0.6 s grid),
arpeggiated softly. The cold open starts with single notes, the two demo dialogues get no new notes (their own
sound carries them), and the end card resolves to I and rings out.

Timbre. Additive partials with slight string inharmonicity, two strings per note detuned by 1.4 cents, a
two-stage decay (faster for higher partials and higher notes), a soft hammer, and the room tools/music.py uses.
"""
import argparse, json, os, sys, wave
import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import SR, db, lp, reverb_ir, k_weighted_lufs     # the skill's own helpers, unchanged

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rng = np.random.default_rng(2026)
BEAT, BAR = 0.6, 2.4
# root, chord tones (voiced one octave up), a melody tone: all ratios of 40 Hz
CHORDS = {
    'I':  (160.0, [320.0, 400.0, 480.0], 640.0),
    'vi': (400.0 / 3, [800.0 / 3, 320.0, 400.0], 1600.0 / 3),
    'IV': (320.0 / 3, [640.0 / 3, 800.0 / 3, 320.0], 1600.0 / 3),
    'V':  (120.0, [480.0, 600.0, 720.0], 960.0),     # voiced high, so the piano does not sit on the bed's 240 Hz
}
PROGRESSION = ['I', 'vi', 'IV', 'V']
OPEN_NOTES = [480.0, 400.0, 640.0, 533.0 + 1 / 3, 480.0, 400.0]   # the cold open: single notes, I-pentatonic


def note(f, vel):
    dur = 4.6 if f < 300 else 3.4
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k in range(1, 15):
        fk = k * f * np.sqrt(1 + 0.00025 * k * k)                  # a stiff string's partials run slightly sharp
        if fk > 9000:
            break
        amp = (vel ** (0.6 + 0.12 * k)) / k ** 1.25                  # softer notes are darker
        env = 0.62 * np.exp(-(1.2 + 0.55 * k + f / 500) * t) + 0.38 * np.exp(-(0.22 + 0.05 * k + f / 2400) * t)
        for cents in (-0.7, 0.7):
            y += 0.5 * amp * env * np.sin(2 * np.pi * fk * 2 ** (cents / 1200) * t + rng.uniform(0, 2 * np.pi))
    y *= np.minimum(1.0, t / 0.003)
    y += lp(rng.standard_normal(n).astype(np.float32), 2800) * np.exp(-t / 0.010) * 0.025 * vel   # the hammer
    y *= np.clip((dur - t) / 0.5, 0, 1)
    return (y * vel ** 1.6).astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    ap.add_argument('--piano-lufs', type=float, default=-23.0, help='loudness of the piano alone')
    ap.add_argument('--bed-gain', type=float, default=-5.0, help='gain of the 40 Hz bed and cues under the piano (dB)')
    a = ap.parse_args()
    timing = json.load(open(os.path.join(ROOT, 'build', a.cut, 'timing.json')))
    cues = json.load(open(os.path.join(ROOT, 'build', a.cut, 'sfx.json')))
    D = timing['duration']
    n = int(D * SR)
    out = np.zeros((n + 6 * SR, 2), np.float32)
    # quiet windows: the two dialogues that are heard with their own sound
    man = json.loads(open(os.path.join(ROOT, 'media', 'manifest.js')).read().split('=', 1)[1].rsplit(';', 1)[0])
    quiet = [(cues['marks'][m] - 0.3, cues['marks'][m] + man[c]['sound']['length'] + 0.4) for m, c in (('demoB', 'pairB'), ('demoC', 'pairC2')) if m in cues['marks'] and 'sound' in man.get(c, {})]
    end_scene = next(s for s in timing['scenes'] if s['id'] == 's-end')
    last_line = [c for c in timing['cues'] if c['scene'] == 's-end'][-1]
    t_final = round(last_line['end'] / BEAT) * BEAT                # the final chord lands on the end sentence

    def put(f, t, vel):
        if t < 0 or t >= D - 0.2 or any(lo <= t < hi for lo, hi in quiet):
            return
        x = note(f, vel)
        pan = float(np.clip((np.log2(f / 300.0)) * 0.22, -0.35, 0.35))   # low strings left, high strings right
        i = int(round(t * SR))
        m = min(len(x), len(out) - i)
        out[i:i + m, 0] += x[:m] * np.cos((pan + 1) * np.pi / 4)
        out[i:i + m, 1] += x[:m] * np.sin((pan + 1) * np.pi / 4)

    open_end = next(s for s in timing['scenes'] if s['id'] == 's-open')['dur']
    # the cold open: single notes, one a bar, until the three conversations appear
    t = 1.2
    for f in OPEN_NOTES:
        if t > open_end - BAR * 2:
            break
        put(f, t, 0.30)
        t += BAR
    # from then on: I vi IV V, arpeggiated, until the end card resolves
    bar = 0
    t = round((open_end - BAR * 2) / BEAT) * BEAT
    while t < t_final - BAR * 2 - 1e-6:
        name = PROGRESSION[bar % 4]
        root, tones, mel = CHORDS[name]
        accent = 1.12 if any(abs(t - s['start']) < BAR / 2 for s in timing['scenes']) else 1.0
        put(root, t, 0.42 * accent)
        put(tones[2], t, 0.26 * accent)
        put(tones[0], t + BEAT * 0.5, 0.22)
        put(tones[1], t + BEAT, 0.22)
        if bar % 2 == 1:
            put(mel, t + BEAT * 2, 0.27)
        put(tones[1], t + BEAT * 3, 0.19)
        bar += 1
        t += BAR
    # the close: IV, V, then I on the last sentence, held
    for name, tt in (('IV', t_final - BAR * 2), ('V', t_final - BAR)):
        root, tones, _ = CHORDS[name]
        put(root, tt, 0.40); put(tones[0], tt + BEAT * 0.5, 0.22); put(tones[1], tt + BEAT, 0.22); put(tones[2], tt + BEAT * 2, 0.22)
    root, tones, mel = CHORDS['I']
    for f, v in ((root / 2 * 2, 0.46), (tones[0], 0.30), (tones[1], 0.28), (tones[2], 0.28), (mel, 0.24)):
        put(f, t_final, v)

    out = out[:n]
    ir = reverb_ir(2.4)
    wet = np.stack([signal.fftconvolve(out[:, c], ir)[:n] for c in (0, 1)], axis=1)
    piano = out + wet * db(-6)
    fade = np.clip((D - np.arange(n) / SR) / 3.0, 0, 1)[:, None]
    piano *= fade
    piano *= db(a.piano_lufs - k_weighted_lufs(piano))
    with wave.open(os.path.join(ROOT, 'audio', a.cut, 'soundtrack.wav'), 'rb') as w:
        bed = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(np.float32) / 32768.0
    m = min(len(bed), n)
    mix = piano.copy()
    mix[:m] += bed[:m] * db(a.bed_gain)
    pk = np.abs(mix).max()
    if pk > db(-1.0):
        mix *= db(-1.0) / pk
    for name, x in (('piano.wav', piano), ('bed.wav', mix)):
        with wave.open(os.path.join(ROOT, 'audio', a.cut, name), 'wb') as w:
            w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    print(f'piano: {bar + 3} chords, final I at {t_final:.1f}s, quiet during the demos {[(round(lo, 1), round(hi, 1)) for lo, hi in quiet]}')
    print(f'audio/{a.cut}/bed.wav: piano {a.piano_lufs} LUFS + 40 Hz bed and cues at {a.bed_gain} dB · {k_weighted_lufs(mix):.1f} LUFS')


if __name__ == '__main__':
    main()
