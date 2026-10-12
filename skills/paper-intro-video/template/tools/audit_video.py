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
Prints the frames to look at. By default it exits 1 for a seam or a flat frame. `--fail seams` fails only
for seams, which is what tools/make.mjs uses: an intentional fade is flat too, so that list still has to
be read. `--no-fail` never changes the exit code.
"""
import argparse, json, os, sys
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import av
import numpy as np


def luma(frame):
    return frame.to_ndarray(format='gray').astype(np.float32)   # 0–255, straight from the Y plane (no RGB pass)


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
    ap.add_argument('--fail', default='seams,flat', help='comma list: seams, flat. Ignored with --no-fail')
    a = ap.parse_args()
    box = av.open(a.video)
    vs = box.streams.video[0]
    vs.thread_type = 'AUTO'
    fps = float(vs.average_rate)
    def look(y):
        return [(kind, s) for axis, kind in ((1, 'vertical'), (0, 'horizontal')) for s in [seams(y, axis)] if s], float(y.std()), y[::4, ::4]

    found, diffs, prev, n = [], [], None, 0
    workers = max(1, (os.cpu_count() or 2) - 1)                   # numpy releases the GIL: frames are measured in parallel
    pool, pending = ThreadPoolExecutor(max_workers=workers), deque()

    def take():                                                    # the oldest frame's result, in order
        nonlocal prev, n
        lines, std, small = pending.popleft().result()
        t = n / fps
        for kind, s in lines:
            found.append({'frame': n, 't': round(t, 3), 'kind': 'seam', 'where': kind, 'lines': s[:6]})
        if std < 2.0:
            found.append({'frame': n, 't': round(t, 3), 'kind': 'flat', 'std': round(std, 2)})
        diffs.append(float(np.abs(small - prev).mean()) if prev is not None else 0.0)
        prev = small
        n += 1

    for frame in box.decode(vs):
        pending.append(pool.submit(look, luma(frame)))
        if len(pending) > 2 * workers:
            take()
    while pending:
        take()
    pool.shutdown()
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
    if any(f['kind'] == 'flat' for f in found):
        print('flat frames are listed for inspection. Accept only an intentional fade or empty ground.')
    selected = set()
    if not a.no_fail:
        for name in a.fail.split(','):
            kind = {'seams': 'seam', 'seam': 'seam', 'flat': 'flat'}.get(name.strip())
            if not kind:
                raise SystemExit(f'unknown --fail value: {name}')
            selected.add(kind)
    sys.exit(1 if any(f['kind'] in selected for f in found) else 0)


if __name__ == '__main__':
    main()
