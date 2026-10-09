#!/usr/bin/env python
"""The ECCV 2026 logo in the two forms the film uses, made from the conference's own vector logo.

    python tools/make_logos.py --source path/to/eccv_navbar.svg

Source: the --source SVG (the ECCV 2026 site's single-colour vector logo: near-black front buildings
and lettering, grey buildings behind). Nothing is redrawn: the paths are kept as they are, only their two
fills and the visible area (viewBox) change.

    assets/img/eccv_on_dark.svg   the full lockup reversed for the navy cards: front and lettering in the
                                  film's cream, back buildings a muted cream-on-navy (the grey's role)
    assets/img/eccv_skyline.svg   the skyline alone (no lettering) in the logo's official colours, as on the
                                  poster (the conference poster logo: front #1C75BC, back #A7D6F3): the small mark in the
                                  corner, set next to the words "ECCV 2026"

Path extents measured in Chromium (getBBox): skyline y 0..159, lettering y 162.3..180.8, all x 9.5..417.5.
"""
import argparse
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'assets', 'img')

FRONT, BACK = '#231f20', '#bcbec0'                       # the source's two fills
LOCKUP, SKYLINE = (9, -1, 409, 183), (9, -1, 409, 161)   # x, y, w, h in the source's units
VARIANTS = {
    'eccv_on_dark.svg': (LOCKUP, '#F5F5F7', '#5A6480'),     # #5A6480 = 36 % of #F5F5F7 over the navy #0B1A42
    'eccv_skyline.svg': (SKYLINE, '#1C75BC', '#A7D6F3'),
}


def variant(svg, box, front, back):
    x, y, w, h = box
    head = re.search(r'<svg\b[^>]*>', svg).group(0)
    new_head = re.sub(r'\s(width|height|viewBox)="[^"]*"', '', head)
    new_head = new_head.replace('<svg', f'<svg width="{w}" height="{h}" viewBox="{x} {y} {w} {h}"', 1)
    out = svg.replace(head, new_head, 1)
    n_front, n_back = out.count('fill:' + FRONT), out.count('fill:' + BACK)
    if not n_front or not n_back:
        raise SystemExit(f'unexpected source: {n_front} front fills, {n_back} back fills')
    return out.replace('fill:' + FRONT, 'fill:' + front).replace('fill:' + BACK, 'fill:' + back)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', required=True, help='official ECCV 2026 vector logo, obtained separately')
    args = ap.parse_args()
    svg = open(args.source, encoding='utf-8').read()
    if re.search(r'<script|\son\w+=', svg, re.I):
        raise SystemExit('the source logo contains script; not using it')
    for name, (box, front, back) in VARIANTS.items():
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(variant(svg, box, front, back))
        print(f'assets/img/{name}: viewBox {box}, front {front}, back {back}')


if __name__ == '__main__':
    main()
