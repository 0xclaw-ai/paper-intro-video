#!/usr/bin/env python
"""Combine a rendered video-only MP4 with one or more WAV tracks into the final MP4.

The video stream is copied untouched; the WAVs are mixed (each with its own gain),
optionally ducked while narration cues are active, encoded to AAC and interleaved with
the video. Swapping the music or adding a voice-over therefore never needs a re-render.

    python tools/mux.py --video build/full/video_en.mp4 --out out/final.mp4 \
        --audio audio/full/soundtrack.wav,-3 --audio build/full/narration.wav,0 \
        --duck build/full/voice.json,-8 --lufs -16

    --audio PATH[,GAIN_DB[,OFFSET_SECONDS]]   repeatable; the first one is the music bed
    --duck  JSON[,DEPTH_DB]                   lower the bed while somebody speaks ({"cues": [{start, end}, ...]},
                                              build/<cut>/voice.json); it stays down across pauses shorter than 1.4 s
    --lufs  TARGET                            bring the finished mix to this loudness (BS.1770), peaks kept below -1 dBFS
Needs: av (PyAV), numpy.
"""
import argparse, json, wave
from fractions import Fraction
import av
import numpy as np

SR = 48000


def read_wav(path):
    with wave.open(path, 'rb') as w:
        sr, ch, sw, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    if sw != 2:
        raise SystemExit(f'{path}: only 16-bit PCM WAV is supported')
    x = np.frombuffer(raw, '<i2').astype(np.float32).reshape(-1, ch) / 32768.0
    if ch == 1:
        x = np.repeat(x, 2, axis=1)
    if sr != SR:   # linear interpolation is fine for a one-off conform
        t = np.arange(int(len(x) * SR / sr)) * (sr / SR)
        x = np.stack([np.interp(t, np.arange(len(x)), x[:, c]) for c in (0, 1)], axis=1).astype(np.float32)
    return x[:, :2]


def lufs(x):
    """Integrated loudness (ITU-R BS.1770 K-weighting, 400 ms blocks, absolute and relative gate); numpy only."""
    n = len(x)
    w = np.exp(-2j * np.pi * np.fft.rfftfreq(n))                    # z^-1 on the unit circle
    k = np.ones(len(w), complex)
    for b, a in (([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
                 ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])):
        k *= (b[0] + b[1] * w + b[2] * w * w) / (a[0] + a[1] * w + a[2] * w * w)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    idx = np.arange(0, n - blk, hop)
    p = np.zeros(len(idx))
    for c in range(x.shape[1]):
        y = np.fft.irfft(np.fft.rfft(x[:, c].astype(np.float64)) * k, n)
        cs = np.concatenate([[0.0], np.cumsum(y * y)])
        p += (cs[idx + blk] - cs[idx]) / blk
    l = -0.691 + 10 * np.log10(np.maximum(p, 1e-12))
    g = l > -70
    if not g.any():
        return -70.0
    rel = -0.691 + 10 * np.log10(p[g].mean()) - 10
    return float(-0.691 + 10 * np.log10(p[l > rel].mean()))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--video', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--audio', action='append', default=[])
    ap.add_argument('--duck')
    ap.add_argument('--lufs', type=float)
    ap.add_argument('--bitrate', type=int, default=256, help='AAC kbit/s')
    ap.add_argument('--title', default='', help='title tag of the MP4')
    args = ap.parse_args()

    src = av.open(args.video)
    vin = src.streams.video[0]
    duration = float(vin.duration * vin.time_base) if vin.duration else float(src.duration) / av.time_base
    n = int(round(duration * SR))
    mix = np.zeros((n, 2), np.float32)
    for k, spec in enumerate(args.audio):
        bits = spec.split(',')
        x = read_wav(bits[0]) * (10 ** ((float(bits[1]) if len(bits) > 1 else 0.0) / 20))
        offset = float(bits[2]) if len(bits) > 2 else 0.0
        if k == 0 and args.duck:
            db = args.duck.split(',')
            depth = float(db[1]) if len(db) > 1 else -7.0
            data = json.load(open(db[0], encoding='utf-8'))
            env = np.zeros(len(x), np.float32)
            spans = []
            for c in sorted((data['cues'] if isinstance(data, dict) else data), key=lambda c: c['start']):
                if spans and c['start'] - spans[-1][1] < 1.4:    # the bed does not come up for a breath between two lines
                    spans[-1][1] = max(spans[-1][1], c['end'])
                else:
                    spans.append([c['start'], c['end']])
            for a, b in spans:
                env[int(max(0.0, a - 0.25) * SR):int((b + 0.2) * SR)] = 1.0
            win = int(0.3 * SR)                                  # two moving averages = a smooth ~0.6 s ramp, in linear time
            for _ in range(2):
                cs = np.cumsum(np.concatenate([np.zeros(win // 2 + 1), env, np.zeros(win - win // 2)]))
                env = ((cs[win:] - cs[:-win]) / win)[:len(x)]
            x = x * (10 ** (depth * np.clip(env, 0, 1) / 20))[:, None].astype(np.float32)
        i = int(round(offset * SR))
        if i < 0:
            x, i = x[-i:], 0
        m = min(len(x), n - i)
        if m > 0:
            mix[i:i + m] += x[:m]
    loud = None
    if args.lufs is not None and args.audio:
        mix *= 10 ** ((args.lufs - lufs(mix)) / 20)
        over = np.abs(mix).max() / 0.85                          # -1.4 dBFS ceiling: AAC overshoots by ~0.2 dB, so the decoded file's true peak stays near -1.2 dBTP
        if over > 1.0:                                           # bend the few peaks above the knee (it never exceeds 0.68 + 0.17), do not turn everything down
            hot = np.abs(mix) > 0.68
            mix[hot] = np.sign(mix[hot]) * (0.68 + 0.17 * np.tanh((np.abs(mix[hot]) - 0.68) / 0.17))
        loud = lufs(mix)
    peak = float(np.abs(mix).max()) if n else 0.0
    if peak > 0.98:
        mix *= 0.98 / peak
    pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')

    out = av.open(args.out, 'w', options={'movflags': '+faststart'})
    if args.title:
        out.metadata['title'] = args.title
    vout = out.add_stream_from_template(vin)
    aout = fifo = None
    if args.audio:
        aout = out.add_stream('aac', rate=SR)
        aout.layout = 'stereo'
        aout.bit_rate = args.bitrate * 1000
        fifo = av.AudioFifo()
    state = {'pos': 0, 'pts': 0}

    def push_audio(until):
        end = n if until is None else min(n, int(until * SR))
        if end > state['pos']:
            fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(pcm[state['pos']:end]).reshape(1, -1), format='s16', layout='stereo')
            fr.sample_rate = SR
            fifo.write(fr)
            state['pos'] = end
        size = aout.codec_context.frame_size or 1024
        while fifo.samples >= size or (until is None and fifo.samples > 0):
            fr = fifo.read(min(size, fifo.samples))
            fr.pts = state['pts']
            fr.time_base = Fraction(1, SR)
            state['pts'] += fr.samples
            for pkt in aout.encode(fr):
                out.mux(pkt)

    for packet in src.demux(vin):
        if packet.dts is None:
            continue
        if aout is not None:
            push_audio(float(packet.dts * vin.time_base) + 0.5)
        packet.stream = vout
        out.mux(packet)
    if aout is not None:
        push_audio(None)
        for pkt in aout.encode(None):
            out.mux(pkt)
    out.close()
    src.close()
    print(f'{args.out}: {duration:.2f}s · {len(args.audio)} audio track(s) mixed · mix peak {20 * np.log10(peak + 1e-9):.1f} dBFS'
          + (f' · {loud:.1f} LUFS' if loud is not None else ''))


if __name__ == '__main__':
    main()
