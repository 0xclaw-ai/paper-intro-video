#!/usr/bin/env python
"""A smaller copy of a rendered MP4, for chats, email, slides and sites that host the file themselves.

    python tools/transcode.py out/<film>_captions_en.mp4 [--height 720] [--crf 23] [--audio-kbps 128]
        -> out/<film>_captions_en_720p.mp4
The video is scaled and re-encoded with x264 (slow preset), the audio re-encoded to AAC at a lower bitrate:
a quarter of the 1080p master's size or less. tools/make.mjs writes one per rendered film.
Needs: av (PyAV).
"""
import argparse, os
import av


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--out')
    ap.add_argument('--crf', default='23')
    ap.add_argument('--height', type=int, default=720)
    ap.add_argument('--audio-kbps', type=int, default=128)
    ap.add_argument('--preset', default='slow')
    args = ap.parse_args()

    src = av.open(args.src)
    vin = src.streams.video[0]
    ain = src.streams.audio[0] if src.streams.audio else None
    h = min(args.height, vin.codec_context.height)
    w = int(round(vin.codec_context.width * h / vin.codec_context.height / 2)) * 2
    out = args.out or os.path.join(os.path.dirname(os.path.abspath(args.src)), f'{os.path.splitext(os.path.basename(args.src))[0]}_{h}p.mp4')
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    dst = av.open(out, 'w', options={'movflags': '+faststart'})
    for k, v in src.metadata.items():
        dst.metadata[k] = v
    vout = dst.add_stream('libx264', rate=vin.average_rate)
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
