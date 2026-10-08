#!/usr/bin/env python
"""Lay thumbnails out as contact sheets:  sheet.py OUT_DIR COLS ROWS thumb1.png thumb2.png ...   (or @file with one path per line)"""
import os, re, sys
from PIL import Image, ImageDraw

out, cols, rows, files = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4:]
if len(files) == 1 and files[0].startswith('@'):
    files = [x for x in open(files[0][1:], encoding='utf-8').read().splitlines() if x]
per = cols * rows
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    w, h = Image.open(chunk[0]).size
    sheet = Image.new('RGB', (cols * (w + 4) + 4, ((len(chunk) + cols - 1) // cols) * (h + 22) + 4), (48, 48, 54))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        x, y = 4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 22)
        m = re.search(r't_0*([\d.]+)\.png$', f)
        d.text((x + 2, y + 2), f't = {float(m.group(1)):.2f}s' if m else os.path.basename(f), fill=(255, 208, 60))
        sheet.paste(Image.open(f).convert('RGB'), (x, y + 18))
    path = os.path.join(out, f'sheet_{s // per + 1:02d}.png')
    sheet.save(path)
    print('wrote', path, sheet.size)
