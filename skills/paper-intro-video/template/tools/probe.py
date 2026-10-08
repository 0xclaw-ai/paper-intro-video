#!/usr/bin/env python
"""Inspect a rendered MP4: stream summary, and optionally dump frames for a visual check.
    python tools/probe.py out/<film>.mp4 [--frames 3.2,60,120 --dir build/check]
Needs: av (PyAV), pillow."""
import argparse, os
import av


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--frames')
    ap.add_argument('--dir', default='build/check')
    args = ap.parse_args()
    c = av.open(args.file)
    size = os.path.getsize(args.file)
    dur = float(c.duration) / av.time_base
    print(f'{os.path.basename(args.file)}: {size / 1e6:.1f} MB · {dur:.2f}s · {size * 8 / dur / 1e6:.2f} Mbit/s · format {c.format.name}')
    for s in c.streams:
        cc = s.codec_context
        if s.type == 'video':
            print(f'  video: {cc.name} {cc.profile} {cc.width}x{cc.height} {cc.pix_fmt} {float(s.average_rate):.2f} fps · {s.frames} frames · '
                  f'colorspace={cc.colorspace} primaries={cc.color_primaries} trc={cc.color_trc} range={cc.color_range} · {(s.bit_rate or 0) / 1e6:.2f} Mbit/s')
        elif s.type == 'audio':
            print(f'  audio: {cc.name} {cc.sample_rate} Hz {cc.layout.name} · {(s.bit_rate or 0) / 1e3:.0f} kbit/s · {float(s.duration * s.time_base):.2f}s')
    if args.frames:
        os.makedirs(args.dir, exist_ok=True)
        v = c.streams.video[0]
        for t in [float(x) for x in args.frames.split(',')]:
            c.seek(int(max(0, t - 2.5) * av.time_base))
            for frame in c.decode(v):
                if frame.time >= t - 1e-3:
                    path = os.path.join(args.dir, f'{os.path.splitext(os.path.basename(args.file))[0]}_{t:07.2f}.png')
                    frame.to_image().save(path)
                    print('  frame', f'{frame.time:.3f}s ->', path)
                    break
    c.close()


if __name__ == '__main__':
    main()
