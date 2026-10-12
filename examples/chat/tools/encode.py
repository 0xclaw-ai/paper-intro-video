#!/usr/bin/env python
"""Frame encoder used by tools/render.mjs.

Reads frames from stdin as [4-byte big-endian length][PNG or JPEG bytes] records (length 0 ends
the stream), optionally composites pre-rendered caption overlays, and writes an H.264
video-only MP4 (BT.709, yuv420p). Needs: av (PyAV), numpy, pillow.
"""
import argparse, io, json, struct, sys
import av
import numpy as np
from PIL import Image
from av.video.reformatter import Colorspace, ColorRange

FADE = 0.16  # seconds, must match the caption fade in js/lib/stage.js


def read_exact(f, n):
    buf = bytearray()
    while len(buf) < n:
        chunk = f.read(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return bytes(buf)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--crf', default='15')
    ap.add_argument('--preset', default='slow')
    ap.add_argument('--captions', help='JSON list of {start,end,png,x,y} overlays (stage pixels at 1x)')
    ap.add_argument('--scale', type=float, default=1.0, help='device pixel ratio of the incoming frames')
    ap.add_argument('--start', type=float, default=0.0, help='time of the first incoming frame')
    args = ap.parse_args()

    cues = []
    if args.captions:
        for c in json.load(open(args.captions, encoding='utf-8')):
            im = Image.open(c['png']).convert('RGBA')
            cues.append((c['start'], c['end'], im.convert('RGB'), np.asarray(im.split()[3], np.float32), int(round(c['x'] * args.scale)), int(round(c['y'] * args.scale))))

    stdin = sys.stdin.buffer
    container = stream = None
    idx = 0
    while True:
        head = read_exact(stdin, 4)
        if head is None:
            break
        (n,) = struct.unpack('>I', head)
        if n == 0:
            break
        img = Image.open(io.BytesIO(read_exact(stdin, n))).convert('RGB')
        t = args.start + idx / args.fps
        for start, end, rgb, alpha, x, y in cues:
            if start <= t < end:
                a = max(0.0, min(1.0, (t - start) / FADE, (end - t) / FADE))
                if a > 0:
                    img.paste(rgb, (x, y), Image.fromarray((alpha * a).astype(np.uint8)))
                break
        if container is None:
            container = av.open(args.out, 'w', options={'movflags': '+faststart'})
            stream = container.add_stream('libx264', rate=args.fps)
            stream.width, stream.height = img.size
            stream.pix_fmt = 'yuv420p'
            stream.options = {'crf': str(args.crf), 'preset': args.preset, 'profile': 'high', 'g': str(args.fps * 2),
                              'x264-params': 'aq-mode=3:aq-strength=0.9:deblock=-1,-1'}
            cc = stream.codec_context
            cc.color_primaries, cc.color_trc, cc.colorspace, cc.color_range = 1, 1, 1, 1   # BT.709, limited range
        frame = av.VideoFrame.from_image(img).reformat(format='yuv420p', dst_colorspace=Colorspace.ITU709, dst_color_range=ColorRange.MPEG)
        frame.pts = idx
        for packet in stream.encode(frame):
            container.mux(packet)
        idx += 1
    if container is not None:
        for packet in stream.encode(None):
            container.mux(packet)
        container.close()
    print(f'encoded {idx} frames -> {args.out}', file=sys.stderr)


if __name__ == '__main__':
    main()
