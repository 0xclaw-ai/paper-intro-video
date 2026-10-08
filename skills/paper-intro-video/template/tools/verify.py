#!/usr/bin/env python
"""Check rendered MP4s against the page: stream facts, audio level, and frames compared with stills.

    python tools/verify.py     (expects stills from: node tools/still.mjs --lang off --out build/verify/full --t 3,20,40,...)
Needs: av, numpy, pillow.
"""
import argparse, glob, json, os, re
import av
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cut', default='full')
    ap.add_argument('--out', default=os.path.join(ROOT, 'out'))
    args = ap.parse_args()
    stills = sorted(glob.glob(os.path.join(ROOT, 'build', 'verify', args.cut, 't_*.png')))
    timing = json.load(open(os.path.join(ROOT, 'build', args.cut, 'timing.json'), encoding='utf-8'))
    name = timing.get('slug', 'film') + (f'_{args.cut}' if len(timing.get('cuts', [args.cut])) > 1 else '')
    for suffix in ('', '_captions_en'):
        path = os.path.join(args.out, f'{name}{suffix}.mp4')
        if not os.path.exists(path):
            print('missing', path)
            continue
        c = av.open(path)
        v, a = c.streams.video[0], (c.streams.audio[0] if c.streams.audio else None)
        dur = float(c.duration) / av.time_base
        print(f'{os.path.basename(path)}: {os.path.getsize(path) / 1e6:.1f} MB · {dur:.2f}s · {v.codec_context.width}x{v.codec_context.height} '
              f'{float(v.average_rate):.0f} fps · {v.frames} frames · video {float(v.duration * v.time_base):.2f}s'
              + (f' · audio {a.codec_context.name} {a.codec_context.sample_rate} Hz {float(a.duration * a.time_base):.2f}s' if a else ' · NO AUDIO'))
        if a is not None:
            chunks = [f.to_ndarray() for f in c.decode(a)]
            x = np.concatenate(chunks, axis=1).astype(np.float64)
            r = np.sqrt((x ** 2).mean(axis=1))
            sec = int(x.shape[1] / a.codec_context.sample_rate)
            sr = a.codec_context.sample_rate
            silent = sum(1 for i in range(sec) if np.sqrt((x[:, i * sr:(i + 1) * sr] ** 2).mean()) < 10 ** (-60 / 20))
            print(f'   audio: rms L/R {20 * np.log10(r[0] + 1e-12):.1f}/{20 * np.log10(r[-1] + 1e-12):.1f} dBFS · peak {20 * np.log10(np.abs(x).max() + 1e-12):.1f} dBFS · silent seconds {silent}')
        if suffix == '':
            for s in stills:
                t = float(re.search(r't_0*([\d.]+)\.png$', s).group(1))
                c.seek(int(max(0, t - 2.5) * av.time_base))
                for frame in c.decode(v):
                    if frame.time >= t - 1e-3:
                        got = np.asarray(frame.to_image().convert('RGB'), np.float32)
                        ref = np.asarray(Image.open(s).convert('RGB'), np.float32)
                        d = np.abs(got - ref)
                        ok = d.mean() < 4.0
                        print(f'   frame @ {t:6.1f}s (decoded {frame.time:.3f}s): mean |diff| {d.mean():.2f}, 99th pct {np.percentile(d, 99):.0f}  {"OK" if ok else "MISMATCH"}')
                        break
        c.close()


if __name__ == '__main__':
    main()
