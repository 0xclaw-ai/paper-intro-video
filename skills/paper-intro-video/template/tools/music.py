#!/usr/bin/env python
"""The sound bed of a film: 40 Hz binaural beats and a few soft cues, synthesized from scratch.

Nothing is sampled, so there is nothing to license. Nothing is timed by hand either:

  build/<cut>/timing.json   scene starts            (node tools/export_script.mjs)
  build/<cut>/sfx.json      the cue sheet           (node tools/export_sfx.mjs — every S.sfx(...) in js/scenes.js)

so the sound follows the edit, and the voice.

    python tools/music.py [--cut full] [--no-sfx] [--no-bed] [--lufs -20]

The bed: a 200 Hz sine in the left ear and a 240 Hz sine in the right. The 40 Hz difference only exists
once the brain puts the two ears together, so it needs headphones (on loudspeakers the tones mix in the
air into an ordinary 40 Hz flutter). The pair is kept dry and hard-panned on purpose — reverb, stereo
widening or any cross-feed would mix the ears. Underneath: a quieter pair at 80 / 120 Hz (also 40 Hz
apart) and a little decorrelated air that lifts at every scene change. The cues (pop, bell, pen, type,
whoosh, low) are tuned to the same 40 Hz series. Made at -20 LUFS: pure tones read louder than music,
and tools/render.mjs mixes it under the voice.

--no-bed writes the cues alone (to put under your own music); audio/<cut>/stem_music.wav and
stem_sfx.wav are always written next to soundtrack.wav.
Needs: numpy, scipy.
"""
import argparse, json, os, wave
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(20262)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def db(x):
    return 10.0 ** (x / 20.0)


class Mix:
    def __init__(self, dur):
        self.n = int(dur * SR)
        self.bus = {}

    def get(self, name):
        if name not in self.bus:
            self.bus[name] = np.zeros((self.n, 2), np.float32)
        return self.bus[name]

    def add(self, name, sig, t, gain=1.0, pan=0.0):
        b = self.get(name)
        i = int(round(t * SR))
        if i >= self.n:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        m = min(len(sig), self.n - i)
        if m <= 0:
            return
        if sig.ndim == 1:
            b[i:i + m, 0] += sig[:m] * (np.cos((pan + 1) * np.pi / 4) * gain)
            b[i:i + m, 1] += sig[:m] * (np.sin((pan + 1) * np.pi / 4) * gain)
        else:
            b[i:i + m] += sig[:m] * gain


# ───────────────────────── filters ─────────────────────────
def noise(n):
    return rng.standard_normal(n).astype(np.float32)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x).astype(np.float32)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='high', fs=SR, output='sos'), x, axis=0).astype(np.float32)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype='low', fs=SR, output='sos'), x, axis=0).astype(np.float32)


# ───────────────────────── the cues ─────────────────────────
def bell(f, decay=1.1):
    n = int(decay * 3.2 * SR)
    t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t / decay)
         + 0.28 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / (decay * 0.45))
         + 0.1 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t / (decay * 0.25)))
    return (s * np.minimum(1.0, t / 0.006)).astype(np.float32)


def scratch(dur):
    """A pen on paper: band-limited noise with uneven pressure."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    wob = np.abs(lp(noise(n), 22))
    wob = 0.45 + 0.55 * wob / (wob.max() + 1e-9)
    env = np.minimum(1.0, t / 0.025) * np.clip((dur - t) / 0.06, 0, 1)
    return (bp(noise(n), 1700, 4800) * wob * env).astype(np.float32)


def key_click():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return (bp(noise(n), 1500, 3800) * np.exp(-t / 0.004)).astype(np.float32)


def air(dur=0.8):
    """A page turning: a low, slow breath of noise."""
    n = int(dur * SR)
    t = np.arange(n) / dur / SR
    return (bp(noise(n), 300, 1800) * np.sin(np.pi * np.clip(t, 0, 1)) ** 2.4).astype(np.float32)


def reverb_ir(decay=2.7):
    """One mono impulse response for both channels, so the reverb keeps the stereo balance of its input."""
    g = np.random.default_rng(7)                                 # fixed: the same room for every cut
    n = int(decay * 1.6 * SR)
    t = np.arange(n) / SR
    ir = g.standard_normal(n).astype(np.float32) * np.exp(-t / (decay / 6.9))
    ir = lp(hp(ir, 200), 5200)
    ir = np.concatenate([np.zeros(int(0.025 * SR), np.float32), ir])
    return ir / np.sqrt((ir ** 2).sum() * 2)


def k_weighted_lufs(x):
    """Approximate integrated loudness (BS.1770 K-weighting, 400 ms blocks, absolute + relative gate)."""
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    y = signal.lfilter(b2, a2, signal.lfilter(b1, a1, x, axis=0), axis=0)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    p = np.array([(y[i:i + blk] ** 2).mean(axis=0).sum() for i in range(0, len(y) - blk, hop)])
    l = -0.691 + 10 * np.log10(np.maximum(p, 1e-12))
    g = l > -70
    if not g.any():
        return -70.0
    rel = -0.691 + 10 * np.log10(p[g].mean()) - 10
    return float(-0.691 + 10 * np.log10(p[l > rel].mean()))


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    pcm = (x * 32767.0 + rng.uniform(-0.5, 0.5, x.shape)).round().astype('<i2')  # TPDF-ish dither
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


BASE, BEAT = 200.0, 40.0                                         # left ear 200 Hz, right ear 240 Hz
JI = [320.0, 360.0, 400.0, 480.0, 1600.0 / 3]                    # just pentatonic on 320 Hz: consonant with 200 / 240


def ji_note(n):
    n = int(n)
    return JI[n % 5] * 2 ** (n // 5)


def drop(f, decay=0.28):
    """A soft sine drop for the cues: no attack click, no overtones that could fight the two tones."""
    n = int(decay * 6 * SR)
    t = np.arange(n) / SR
    return ((np.sin(2 * np.pi * f * t) + 0.12 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / (decay * 0.3))) * np.exp(-t / decay) * np.minimum(1.0, t / 0.008)).astype(np.float32)


def thump(f=80.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.16) * np.minimum(1.0, t / 0.01)).astype(np.float32)


def place_events(mx, events):
    """Turn the cue sheet from js/scenes.js into sound: S.sfx(kind, at, { g, pan, n, dur, decay })."""
    for e in events:
        t, kind, g, pan = e['t'], e['kind'], e.get('g', 1.0), e.get('pan', 0.0)
        if kind == 'whoosh':                                     # a page turns, the camera travels
            mx.add('air', air(e.get('dur', 0.8)), t, gain=g, pan=pan)
        elif kind == 'pen':                                      # a mark is drawn
            mx.add('pen', scratch(max(0.12, e.get('dur', 0.4))), t, gain=g, pan=pan + rng.uniform(-0.15, 0.15))
        elif kind == 'pop':                                      # something lands; n picks the note
            mx.add('mallet', drop(ji_note(e.get('n', 0))), t, gain=g, pan=pan)
        elif kind == 'bell':                                     # a result, a slogan
            mx.add('bell', bell(ji_note(e.get('n', 5)), e.get('decay', 1.1)), t, gain=g, pan=pan)
        elif kind == 'low':                                      # weight: a big number, a stamp
            mx.add('lowkey', thump(2 * BEAT), t, gain=g, pan=0.0)
        elif kind == 'type':                                     # a few soft key presses
            n, dur = int(e.get('n', 8)), e.get('dur', 0.6)
            for i in range(n):
                mx.add('keys', key_click(), t + i * dur / n + rng.uniform(-0.008, 0.008), gain=g * (0.5 + 0.4 * rng.random()), pan=pan + rng.uniform(-0.2, 0.2))
        else:
            raise SystemExit('unknown sound cue: %r (known: whoosh, pen, pop, bell, low, type)' % kind)


def build(timing, cues, sfx_on=True, bed_on=True):
    D = timing['duration']
    n = int(D * SR)
    t = np.arange(n) / SR
    breathe = 1.0 + 0.10 * np.sin(2 * np.pi * t / 29.0) + 0.05 * np.sin(2 * np.pi * t / 47.0 + 1.0)   # the same in both ears
    left = np.sin(2 * np.pi * BASE * t) + 0.45 * np.sin(2 * np.pi * 2 * BEAT * t)
    right = np.sin(2 * np.pi * (BASE + BEAT) * t) + 0.45 * np.sin(2 * np.pi * 3 * BEAT * t)
    fade = np.clip(t / 2.5, 0, 1) ** 1.5 * np.clip((D - t) / 3.5, 0, 1) ** 1.5
    tones = np.stack([left, right], axis=1) * (breathe * fade)[:, None]

    # air: low-passed noise, a different stream per ear, lifting a little at every scene change
    g = np.random.default_rng(40)
    air_n = np.stack([lp(hp(g.standard_normal(n).astype(np.float32), 150), 1100), lp(hp(g.standard_normal(n).astype(np.float32), 150), 1100)], axis=1)
    swell = np.ones(n)
    for sc in timing['scenes'][1:]:
        swell += 0.8 * np.exp(-((t - sc['start']) / 1.6) ** 2)
    air_n *= (swell * fade)[:, None]

    music = (tones * db(-21.0) + air_n * db(-33.0)).astype(np.float32) * (1.0 if bed_on else 0.0)
    mx = Mix(D + 3.0)
    if sfx_on:
        place_events(mx, cues['events'])
    z = lambda name: mx.bus.get(name, np.zeros((mx.n, 2), np.float32))
    sfx_dry = z('mallet') * db(-27) + z('bell') * db(-29) + z('lowkey') * db(-22) + z('pen') * db(-38) + z('keys') * db(-31) + z('air') * db(-36)
    send = z('mallet') * db(-36) + z('bell') * db(-33)
    ir = reverb_ir(1.8)
    wet = np.stack([signal.fftconvolve(send[:, c], ir)[:mx.n] for c in (0, 1)], axis=1).astype(np.float32)
    sfx = hp(sfx_dry + wet * db(8), 60)[:n]
    return music, sfx


def master(x, target_lufs, peak_db=-1.0):
    x = x.astype(np.float64)
    x -= x.mean(axis=0)
    g = db(target_lufs - k_weighted_lufs(x))
    x = np.tanh(x * g * 0.9) / 0.9 if np.abs(x * g).max() > 0.9 else x * g     # soft-clip only if we would hit the ceiling
    r = np.sqrt((x ** 2).mean(axis=0))                            # centre the image: equal energy left and right
    if abs(20 * np.log10(r[0] / r[1])) < 2.0:
        x *= r.mean() / r
    pk = np.abs(x).max()
    if pk > db(peak_db):
        x *= db(peak_db) / pk
    tail = int(0.12 * SR)                                         # never end on a cut-off note
    x[-tail:] *= np.linspace(1.0, 0.0, tail)[:, None] ** 2
    return x.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    ap.add_argument('--no-sfx', action='store_true', help='the bed alone')
    ap.add_argument('--no-bed', action='store_true', help='the cues alone, e.g. to go under your own music')
    ap.add_argument('--lufs', type=float, default=-20.0, help='loudness of the mix (LUFS)')
    args = ap.parse_args()
    bdir = os.path.join(ROOT, 'build', args.cut)
    timing = json.load(open(os.path.join(bdir, 'timing.json'), encoding='utf-8'))
    cues = json.load(open(os.path.join(bdir, 'sfx.json'), encoding='utf-8'))
    if abs(cues.get('duration', timing['duration']) - timing['duration']) > 0.05:
        raise SystemExit('build/%s/sfx.json is for another timing: run  node tools/export_sfx.mjs  first' % args.cut)
    out = os.path.join(ROOT, 'audio', args.cut)
    os.makedirs(out, exist_ok=True)
    music, sfx = build(timing, cues, sfx_on=not args.no_sfx, bed_on=not args.no_bed)
    mix = master(music + sfx, args.lufs)
    write_wav(os.path.join(out, 'soundtrack.wav'), mix)
    write_wav(os.path.join(out, 'stem_music.wav'), master(music, args.lufs - 0.5) if not args.no_bed else music)
    if not args.no_sfx:
        write_wav(os.path.join(out, 'stem_sfx.wav'), np.clip(sfx * db(args.lufs - k_weighted_lufs(music + sfx)), -1, 1))
    print('%s: %.2fs · %d sound cues · loudness %.1f LUFS · peak %.1f dBFS · rms L/R %.1f/%.1f dB' % (
        args.cut, len(mix) / SR, len(cues['events']), k_weighted_lufs(mix), 20 * np.log10(np.abs(mix).max() + 1e-12),
        20 * np.log10(np.sqrt((mix[:, 0] ** 2).mean()) + 1e-12), 20 * np.log10(np.sqrt((mix[:, 1] ** 2).mean()) + 1e-12)))


if __name__ == '__main__':
    main()
