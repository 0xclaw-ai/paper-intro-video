#!/usr/bin/env python
"""Make a smaller copy of a rendered MP4 for self-hosting (website, README upload limits).

    python tools/transcode.py out/<film>_captions_en.mp4 [--crf 24] [--height 1080] [--audio-kbps 128]
        -> out/web/<film>_captions_en_web.mp4
The video is re-encoded with x264 (slow preset); audio is re-encoded to AAC at a lower bitrate.
Needs: av (PyAV).
"""
import argparse, os
import av


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--out')
    ap.add_argument('--crf', default='24')
    ap.add_argument('--height', type=int, default=1080)
    ap.add_argument('--audio-kbps', type=int, default=128)
    ap.add_argument('--preset', default='slow')
    args = ap.parse_args()
    out = args.out or os.path.join(os.path.dirname(os.path.abspath(args.src)), 'web', os.path.splitext(os.path.basename(args.src))[0] + '_web.mp4')
    os.makedirs(os.path.dirname(out), exist_ok=True)

    src = av.open(args.src)
    vin = src.streams.video[0]
    ain = src.streams.audio[0] if src.streams.audio else None
    dst = av.open(out, 'w', options={'movflags': '+faststart'})
    for k, v in src.metadata.items():
        dst.metadata[k] = v
    vout = dst.add_stream('libx264', rate=vin.average_rate)
    h = min(args.height, vin.codec_context.height)
    w = int(round(vin.codec_context.width * h / vin.codec_context.height / 2)) * 2
    vout.width, vout.height, vout.pix_fmt = w, h, 'yuv420p'
    vout.options = {'crf': str(args.crf), 'preset': args.preset, 'profile': 'high', 'x264-params': 'aq-mode=3'}
    cc = vout.codec_context
    cc.color_primaries, cc.color_trc, cc.colorspace, cc.color_range = 1, 1, 1, 1
    aout = None
    if ain is not None:
        aout = dst.add_stream('aac', rate=ain.codec_context.sample_rate)
        aout.layout = 'stereo'
        aout.bit_rate = args.audio_kbps * 1000
    n = 0
    for packet in src.demux(*[s for s in (vin, ain) if s is not None]):
        for frame in packet.decode():
            if packet.stream is vin:
                if (frame.width, frame.height) != (w, h):
                    frame = frame.reformat(width=w, height=h)
                frame.pict_type = 0
                for p in vout.encode(frame):
                    dst.mux(p)
                n += 1
            else:
                frame.pts = None
                for p in aout.encode(frame):
                    dst.mux(p)
    for p in vout.encode(None):
        dst.mux(p)
    if aout is not None:
        for p in aout.encode(None):
            dst.mux(p)
    dst.close()
    src.close()
    print(f'{out}: {n} frames, {os.path.getsize(args.src) / 1e6:.1f} MB -> {os.path.getsize(out) / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
