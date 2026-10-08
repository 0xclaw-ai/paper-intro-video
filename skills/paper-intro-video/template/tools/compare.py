#!/usr/bin/env python
"""Did the picture change? Compare two folders of frames (from tools/sheet.mjs or tools/still.mjs).

    node tools/sheet.mjs --step 1.3 --lang off --out build/cmp/a          # before a change (or: the archived version)
    node tools/sheet.mjs --step 1.3 --lang off --out build/cmp/b          # after
    python tools/compare.py build/cmp/a/thumbs build/cmp/b/thumbs [--pairs] [--sheet build/cmp/worst.png]

Frames are matched by file name; with --pairs, by position in the sorted list (for two films of
different length whose k-th frames show the same moment). Prints how many frames are equal and the
ones that differ most; --sheet lays the six worst pairs side by side. Use it after refactoring
(nothing should differ), after changing shared code or styles (only what you meant to change
should), and to see what a round of edits really touched. Needs: numpy, pillow.
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) < 2:
        raise SystemExit(__doc__)
    a, b = args[0], args[1]
    by_pos = '--pairs' in sys.argv
    sheet = sys.argv[sys.argv.index('--sheet') + 1] if '--sheet' in sys.argv else None
    thr = float(sys.argv[sys.argv.index('--threshold') + 1]) if '--threshold' in sys.argv else 0.05
    fa, fb = sorted(glob.glob(os.path.join(a, '*.png'))), sorted(glob.glob(os.path.join(b, '*.png')))
    if by_pos:
        pairs = list(zip(fa, fb))
    else:
        names = {os.path.basename(f): f for f in fb}
        pairs = [(f, names[os.path.basename(f)]) for f in fa if os.path.basename(f) in names]
        if len(pairs) < len(fa):
            print(f'{len(fa) - len(pairs)} frame(s) of A have no partner in B')
    same, worst = 0, []
    for x, y in pairs:
        ia, ib = Image.open(x).convert('RGB'), Image.open(y).convert('RGB')
        if ia.size != ib.size:
            print('size differs:', os.path.basename(x)); continue
        d = np.abs(np.asarray(ia, np.int16) - np.asarray(ib, np.int16))
        m = float(d.mean())
        if m <= thr:
            same += 1
        else:
            worst.append((m, float((d.max(axis=2) > 40).mean() * 100), x, y))
    worst.sort(reverse=True)
    print(f'{len(pairs)} frames: {same} equal (mean |difference| <= {thr}), {len(worst)} differ')
    for m, pct, x, y in worst[:20]:
        print(f'  {os.path.basename(x)}' + (f' / {os.path.basename(y)}' if by_pos else '') + f'   mean {m:5.2f}   {pct:4.1f}% of the pixels changed')
    if sheet and worst:
        pick = worst[:6]
        w, h = Image.open(pick[0][2]).size
        im = Image.new('RGB', (2 * w + 30, len(pick) * (h + 10) + 10), (40, 40, 40))
        d = ImageDraw.Draw(im)
        for k, (_, _, x, y) in enumerate(pick):
            top = 10 + k * (h + 10)
            im.paste(Image.open(x).convert('RGB'), (10, top)); im.paste(Image.open(y).convert('RGB'), (20 + w, top))
            d.text((14, top + 4), 'A ' + os.path.basename(x), fill=(255, 80, 80)); d.text((24 + w, top + 4), 'B ' + os.path.basename(y), fill=(255, 80, 80))
        os.makedirs(os.path.dirname(os.path.abspath(sheet)), exist_ok=True)
        im.save(sheet)
        print('wrote', sheet)


if __name__ == '__main__':
    main()
