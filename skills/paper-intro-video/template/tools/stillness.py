#!/usr/bin/env python
"""Second half of tools/stillness.mjs: compare consecutive frames and list the still stretches.
    python tools/stillness.py build/<cut>/stillness [min]
Needs: numpy, pillow."""
import glob, json, os, sys
import numpy as np
from PIL import Image


def main():
    d = sys.argv[1]
    lo = float(sys.argv[2]) if len(sys.argv) > 2 else 0.001
    meta = json.load(open(os.path.join(d, 'times.json'), encoding='utf-8'))
    times, step = meta['times'], meta['step']
    files = sorted(glob.glob(os.path.join(d, 'f_*.png')))[:len(times)]
    prev, diffs = None, []
    for f in files:
        a = np.asarray(Image.open(f).convert('L'), dtype=np.float32) / 255.0
        if prev is not None:
            diffs.append(float(np.abs(a - prev).mean()))
        prev = a
    diffs = np.array(diffs)
    still = diffs < lo
    scene_at = lambda t: next((s['id'][2:] for s in reversed(meta['scenes']) if t >= s['start']), '?')
    runs, i = [], 0
    while i < len(still):
        if still[i]:
            j = i
            while j + 1 < len(still) and still[j + 1]:
                j += 1
            runs.append((times[i], times[j + 1]))
            i = j + 1
        else:
            i += 1
    total = sum(b - a for a, b in runs)
    span = times[-1] - times[0]
    print('%s: %d pairs, %.1f s apart · median change %.4f · still %.1f s of %.1f s (%.0f%%) in %d stretch(es)' % (
        meta['cut'], len(diffs), step, float(np.median(diffs)), total, span, 100 * total / span, len(runs)))
    for a, b in sorted(runs, key=lambda r: r[0] - r[1])[:60]:
        if b - a >= step * 2 - 1e-6:
            print('   %6.1f – %6.1f s  (%4.1f s)  %s' % (a, b, b - a, scene_at(a)))
    long_runs = [r for r in runs if r[1] - r[0] >= 2.0 - 1e-6]
    json.dump({'diffs': diffs.tolist(), 'runs': runs}, open(os.path.join(d, 'report.json'), 'w'))
    sys.exit(1 if long_runs else 0)


if __name__ == '__main__':
    main()
