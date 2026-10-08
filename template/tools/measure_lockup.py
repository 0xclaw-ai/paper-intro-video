#!/usr/bin/env python
"""Is a mark + lettering lockup aligned? Measure it on a rendered frame instead of arguing about it.

    python tools/measure_lockup.py build/stills/t_0100.00.png 40 14 250 86 [out.png]
                                   frame                      x0 y0 x1 y1   (a region that holds only the lockup)

Splits the region at its widest empty column gap into the mark (left) and the lettering (right)
and reports, for each: the bounding box, its centre, and its visual centre (the centre of mass of
everything that is not ground). Boxes that are centred on each other can still look crooked when
one part has a light protrusion — a crown, a tail, a shadow: align on the visual centres. Also
reports the tilt of the mark's axis and of the lettering's baseline. With out.png, writes an
enlarged crop with both visual centre lines drawn. Needs: numpy, pillow.
"""
import sys
import numpy as np
from PIL import Image, ImageDraw


def main():
    if len(sys.argv) < 6:
        raise SystemExit(__doc__)
    frame = sys.argv[1]
    x0, y0, x1, y1 = map(int, sys.argv[2:6])
    out = sys.argv[6] if len(sys.argv) > 6 else None
    crop = Image.open(frame).convert('RGB').crop((x0, y0, x1, y1))
    a = np.asarray(crop, np.float64)
    ground = np.median(a.reshape(-1, 3), axis=0)
    dist = np.abs(a - ground).sum(axis=2)
    ink = dist > 60
    xs = np.nonzero(ink.any(axis=0))[0]
    if len(xs) < 4:
        raise SystemExit('nothing but ground in that region')
    k = int(np.argmax(np.diff(xs)))
    res = {}
    for name, (c0, c1) in {'mark': (xs[0], xs[k]), 'lettering': (xs[k + 1], xs[-1])}.items():
        sub = ink[:, c0:c1 + 1]
        w = np.minimum(dist[:, c0:c1 + 1], 255.0) * sub
        rows = np.nonzero(sub.any(axis=1))[0]
        top, bot = int(rows[0]), int(rows[-1])
        mass = float((w.sum(axis=1) * (np.arange(sub.shape[0]) + 0.5)).sum() / w.sum())
        res[name] = {'x': (c0 + x0, c1 + x0), 'y': (top + y0, bot + y0), 'box': (top + bot + 1) / 2 + y0, 'mass': mass + y0, 'cols': (c0, c1), 'rows': (top, bot)}
        print(f"{name:10s} x {c0 + x0}..{c1 + x0}  y {top + y0}..{bot + y0}  box centre {res[name]['box']:.1f}  visual centre {res[name]['mass']:.1f}")
    # tilt: the mark's symmetry axis (mid-point of each row's extent) and the lettering's baseline (bottom of each column)
    c0, c1 = res['mark']['cols']
    cy, cx = [], []
    for y in range(res['mark']['rows'][0], res['mark']['rows'][1] + 1):
        r = np.nonzero(ink[y, c0:c1 + 1])[0]
        if len(r) > 6:
            cy.append(y); cx.append((r[0] + r[-1]) / 2)
    c0, c1 = res['lettering']['cols']
    bx, by = [], []
    for x in range(c0, c1 + 1):
        r = np.nonzero(ink[:, x])[0]
        if len(r):
            bx.append(x); by.append(r[-1])
    bx, by = np.array(bx), np.array(by)
    on = by >= np.percentile(by, 90) - 1
    axis = np.degrees(np.arctan(np.polyfit(cy, cx, 1)[0])) if len(cy) > 3 else 0.0
    base = np.degrees(np.arctan(np.polyfit(bx[on], by[on], 1)[0])) if on.sum() > 3 else 0.0
    m, t = res['mark'], res['lettering']
    print(f'tilt: mark axis {axis:+.2f} deg · lettering baseline {base:+.2f} deg   (under 0.3 deg is level)')
    print(f"lettering minus mark: box centres {t['box'] - m['box']:+.1f} px · visual centres {t['mass'] - m['mass']:+.1f} px"
          + ('   — aligned by eye' if abs(t['mass'] - m['mass']) < 1.0 else f"   — to align by eye, move the lettering {m['mass'] - t['mass']:+.0f} px (down is +)"))
    if out:
        S = max(2, 1400 // crop.width)
        big = crop.resize((crop.width * S, crop.height * S), Image.LANCZOS if S < 4 else Image.NEAREST)
        d = ImageDraw.Draw(big)
        for name, col in (('mark', (225, 45, 45)), ('lettering', (45, 110, 235))):
            r = res[name]
            d.line([((r['x'][0] - x0 - 6) * S, (r['mass'] - y0) * S), ((r['x'][1] - x0 + 7) * S, (r['mass'] - y0) * S)], fill=col, width=max(2, S // 3))
        big.save(out)
        print('wrote', out)


if __name__ == '__main__':
    main()
