#!/usr/bin/env python
"""Sanity report for a WAV file when you cannot listen to it: band balance, loudness over time
and a log-frequency spectrogram written as a PNG.   python tools/audio_report.py audio/soundtrack.wav"""
import sys, os, wave, json
import numpy as np
from PIL import Image, ImageDraw


def read(path):
    with wave.open(path, 'rb') as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        x = np.frombuffer(w.readframes(n), '<i2').astype(np.float32) / 32768.0
    return x.reshape(-1, ch), sr


def main():
    path = sys.argv[1]
    x, sr = read(path)
    mono = x.mean(axis=1)
    print(f'{os.path.basename(path)}: {len(x) / sr:.2f}s  sr={sr}  peak={20 * np.log10(np.abs(x).max() + 1e-9):.1f} dBFS  '
          f'rms={20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9):.1f} dB  dc={mono.mean():+.5f}  '
          f'L/R corr={np.corrcoef(x[:, 0], x[:, -1])[0, 1]:.2f}  clipped samples={(np.abs(x) > 0.999).sum()}')

    # band balance (share of total energy)
    N = 1 << 15
    hop = N // 2
    win = np.hanning(N)
    spec = np.zeros(N // 2 + 1)
    frames = 0
    for i in range(0, len(mono) - N, hop):
        spec += np.abs(np.fft.rfft(mono[i:i + N] * win)) ** 2
        frames += 1
    f = np.fft.rfftfreq(N, 1 / sr)
    tot = spec.sum()
    bands = [('sub <60', 0, 60), ('bass 60-250', 60, 250), ('low-mid 250-1k', 250, 1000), ('mid 1-4k', 1000, 4000), ('high 4-10k', 4000, 10000), ('air >10k', 10000, sr / 2)]
    print('  band balance: ' + ' | '.join(f'{n} {10 * np.log10(spec[(f >= a) & (f < b)].sum() / tot + 1e-12):.1f} dB' for n, a, b in bands))

    # short-term level every second
    sec = int(len(mono) / sr)
    lv = np.array([20 * np.log10(np.sqrt((x[i * sr:(i + 1) * sr] ** 2).mean()) + 1e-9) for i in range(sec)])
    print('  level per 10 s (dB rms): ' + ' '.join(f'{lv[i:i + 10].mean():.0f}' for i in range(0, sec, 10)))
    print(f'  quietest second {lv.min():.1f} dB at {lv.argmin()}s · loudest second {lv.max():.1f} dB at {lv.argmax()}s')

    if len(sys.argv) > 2:
        # log-frequency spectrogram, 8 px per second
        n, hop2 = 4096, sr // 8
        w2 = np.hanning(n)
        cols = []
        ff = np.fft.rfftfreq(n, 1 / sr)
        edges = np.geomspace(30, 16000, 241)
        for i in range(0, len(mono) - n, hop2):
            mag = np.abs(np.fft.rfft(mono[i:i + n] * w2)) ** 2
            idx = np.searchsorted(ff, edges)
            col = np.array([mag[idx[k]:max(idx[k] + 1, idx[k + 1])].mean() for k in range(240)])
            cols.append(10 * np.log10(col + 1e-10))
        S = np.array(cols).T[::-1]
        S = np.clip((S - S.max() + 80) / 80, 0, 1)
        img = Image.fromarray((S ** 1.2 * 255).astype(np.uint8)).convert('RGB')
        img = img.resize((img.width, 480), Image.BILINEAR)
        d = ImageDraw.Draw(img)
        cut = os.path.basename(os.path.dirname(os.path.abspath(path)))   # audio/<cut>/soundtrack.wav
        timing = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build', cut, 'timing.json')
        if os.path.exists(timing):
            for s in json.load(open(timing, encoding='utf-8'))['scenes']:
                xpx = int(s['start'] * 8)
                d.line([(xpx, 0), (xpx, 480)], fill=(255, 190, 40))
                d.text((xpx + 3, 3), s['id'][2:], fill=(255, 190, 40))
        for fq in (100, 1000, 10000):
            y = int(480 * (1 - np.log(fq / 30) / np.log(16000 / 30)))
            d.line([(0, y), (img.width, y)], fill=(90, 90, 160))
            d.text((2, y - 11), f'{fq} Hz', fill=(150, 150, 220))
        img.save(sys.argv[2])
        print('  spectrogram ->', sys.argv[2], img.size)


if __name__ == '__main__':
    main()
