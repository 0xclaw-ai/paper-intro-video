#!/usr/bin/env python
"""A pixel audit of every frame of the encoded film: the faults a page audit cannot see.

    python tools/audit_video.py out/<slug>.mp4 [--json build/audit/video.json]

Per frame, on the decoded picture:
    seam    a one-pixel line that differs from both neighbours while they agree with each other, across at
            least 90 % of the frame's height (vertical: two scenes meeting at a fractional pixel in a page
            turn) or 97 % of its width (horizontal: rules that span most of the frame by design stay under
            that); a real edge is a step, not a line
    flat    a frame with almost no detail (a blank or black frame)
    jump    a change from the previous frame far larger than the motion around it (a flash, a dropped or
            repeated layout); hard cuts and page turns are expected here and listed for a look
Prints the frames to look at; exits 1 if any seam or flat frame is found (--no-fail: report only). An intended
blank (a fade to black, a held ground) is reported as flat too: look at it, do not hide it.
"""
import argparse, json, sys
import av
import numpy as np


def luma(frame):
    rgb = frame.to_ndarray(format='rgb24').astype(np.float32)
    return rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722


def seams(y, axis):
    """lines one pixel wide along `axis` (1: vertical lines, a column; 0: horizontal lines, a row)"""
    a = y if axis == 1 else y.T
    left, mid, right = a[:, :-2], a[:, 1:-1], a[:, 2:]
    line = (np.abs(mid - (left + right) / 2) > 6) & (np.abs(left - right) < 4)
    frac = line.mean(axis=0)
    idx = np.nonzero(frac > (0.9 if axis == 1 else 0.97))[0]
    return [(int(i + 1), round(float(frac[i]), 3)) for i in idx]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('video')
    ap.add_argument('--json', default=None)
    ap.add_argument('--no-fail', action='store_true', help='report only; exit 0 whatever is found')
    a = ap.parse_args()
    box = av.open(a.video)
    vs = box.streams.video[0]
    vs.thread_type = 'AUTO'
    fps = float(vs.average_rate)
    found, diffs, prev, n = [], [], None, 0
    for frame in box.decode(vs):
        y = luma(frame)
        t = n / fps
        for axis, kind in ((1, 'vertical'), (0, 'horizontal')):
            s = seams(y, axis)
            if s:
                found.append({'frame': n, 't': round(t, 3), 'kind': 'seam', 'where': kind, 'lines': s[:6]})
        if y.std() < 2.0:
            found.append({'frame': n, 't': round(t, 3), 'kind': 'flat', 'std': round(float(y.std()), 2)})
        small = y[::4, ::4]
        diffs.append(float(np.abs(small - prev).mean()) if prev is not None else 0.0)
        prev = small
        n += 1
    d = np.array(diffs)
    # a jump: far above the motion in the half second around it (median), and visible in absolute terms
    k = int(fps // 2)
    for i in range(1, len(d)):
        lo, hi = max(1, i - k), min(len(d), i + k + 1)
        local = np.median(np.concatenate([d[lo:i], d[i + 1:hi]])) if hi - lo > 1 else 0
        if d[i] > 12 and d[i] > 4 * max(local, 0.5):
            found.append({'frame': i, 't': round(i / fps, 3), 'kind': 'jump', 'diff': round(float(d[i]), 2), 'around': round(float(local), 2)})
    found.sort(key=lambda x: (x['t'], x['kind']))
    print(f'{n} frames at {fps:g} fps ({n / fps:.2f} s) · {sum(f["kind"] == "seam" for f in found)} with a seam · '
          f'{sum(f["kind"] == "flat" for f in found)} flat · {sum(f["kind"] == "jump" for f in found)} jumps')
    for f in found:
        print('  ', json.dumps(f))
    if a.json:
        json.dump({'frames': n, 'fps': fps, 'found': found, 'diffs': [round(x, 3) for x in diffs]}, open(a.json, 'w'))
    sys.exit(1 if not a.no_fail and any(f['kind'] in ('seam', 'flat') for f in found) else 0)


if __name__ == '__main__':
    main()
