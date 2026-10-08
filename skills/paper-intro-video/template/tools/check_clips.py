#!/usr/bin/env python
"""Checks on narration clips that need no ears.

    python tools/check_clips.py voice/full/<name>

For every clip: how fast it is spoken (phonemes per second where the engine wrote them, else
letters per second) against the median of all lines — an outlier is usually a garbled or
mispronounced line; the longest pause inside it; clipping; and whether it was made for the words
the script has now. Needs: numpy (scipy optional) — the same Python as tools/narration.py.
"""
import glob, json, os, re, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import narration as N


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    folder = sys.argv[1]
    cut = sys.argv[sys.argv.index('--cut') + 1] if '--cut' in sys.argv else 'full'
    cues = json.load(open(os.path.join(ROOT, 'build', cut, 'timing.json'), encoding='utf-8'))['cues']
    files = sorted(glob.glob(os.path.join(folder, '[0-9]*.wav')))
    if len(files) != len(cues):
        print(f'{len(files)} clips, but the script has {len(cues)} lines')
    rows = []
    for f, c in zip(files, cues):
        x, _ = N.read_wav(f)
        a, b, pauses, _ = N.analyse(x)
        side = f[:-4] + '.json'
        info = json.load(open(side, encoding='utf-8')) if os.path.exists(side) else {}
        units = re.sub(r"[\sˈˌ.,;:!?—]", '', info['phonemes']) if info.get('phonemes') else re.sub(r'[^A-Za-z0-9]', '', c['say'])
        speech = max((b - a) - sum(p1 - p0 for p0, p1 in pauses), 1e-3)
        rows.append({'n': os.path.basename(f)[:-4], 'len': b - a, 'rate': len(units) / speech, 'peak': float(np.abs(x).max()),
                     'pause': max([p1 - p0 for p0, p1 in pauses], default=0.0), 'stale': bool(info) and info.get('say') not in (None, c['say']), 'say': c['say']})
    rate = np.array([r['rate'] for r in rows])
    med = float(np.median(rate))
    print(f'{len(rows)} clips · speaking rate median {med:.1f}/s (min {rate.min():.1f}, max {rate.max():.1f}) · highest peak {max(r["peak"] for r in rows):.2f}')
    bad = 0
    for r in rows:
        flags = []
        if r['stale']:
            flags.append('made for other words')
        if abs(r['rate'] / med - 1) > 0.2:
            flags.append(f'rate {100 * (r["rate"] / med - 1):+.0f}% off the median')
        if r['pause'] > 1.0:
            flags.append(f'a pause of {r["pause"]:.2f}s')
        if r['peak'] > 0.98:
            flags.append('clipped')
        if r['len'] < 0.3:
            flags.append('almost empty')
        if flags:
            bad += 1
            print(f'  {r["n"]}  {r["len"]:5.2f}s  {", ".join(flags)}  | {r["say"][:70]}')
    print('nothing stands out' if not bad else f'{bad} line(s) to look at: read their phonemes, synthesize them again, or listen')


if __name__ == '__main__':
    main()
