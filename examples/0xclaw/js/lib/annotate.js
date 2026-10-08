/* annotate.js — hand-drawn emphasis, built on Rough.js (MIT, vendor/roughjs).
 *
 * Marks are the video's way of saying "this is the point": an underline, a highlighter stroke, a
 * circle or a cross, drawn with a pen instead of glowing. Every stroke is a separate <path> with
 * pathLength=1, so the timeline reveals it by tweening stroke-dashoffset from 1 to 0 — the pen
 * visibly moves. Seeds are fixed: the same frame always gets the same wobble.
 *
 *   <span class="mk" data-mark="underline|highlight|circle|cross|slash|tick|strike" data-color="gold|red|violet|ink" data-pad="12">
 *
 * OXMARK.prepare(root)            measure every [data-mark] and build its strokes (fonts must be loaded,
 *                                 scenes must be laid out — see player.js)
 * OXMARK.strokes(el)              the stroke paths of a prepared mark, in drawing order
 * OXMARK.arrow(svg, a, b, opts)   a hand-drawn arrow in an absolutely positioned <svg class="ink">
 * OXMARK.line / .circle / .rect / .path   other free-standing sketch shapes
 */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  // colour names are the tokens of css/base.css (--gold, --red, …); the values here are only the fallback
  const FALLBACK = { gold: '#F2B32C', red: '#CF4326', violet: '#5A33D6', ink: '#191713', cream: '#F3F0E7' };
  const COLORS = new Proxy({}, { get: (_, name) => (typeof name === 'string' && (getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || FALLBACK[name])) || undefined });
  const gen = window.rough.generator();
  const HIDDEN = 1.03;
  let seed = 11;

  const svgEl = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  /** rough drawable -> one <path d> per pen stroke */
  function strokesOf(drawable) {
    const out = [];
    for (const p of gen.toPaths(drawable)) for (const d of p.d.split(/(?=M)/)) if (d.trim()) out.push(d.trim());
    return out;
  }
  function addPaths(svg, ds, style) {
    return ds.map((d) => {
      const p = svgEl('path', { d, pathLength: 1 });
      p.style.stroke = style.stroke;
      p.style.strokeWidth = style.width;
      p.style.strokeDasharray = '1.02 2';                       // hidden at offset 1.03, fully drawn at 0 —
      p.style.strokeDashoffset = HIDDEN;                         // the margins keep round caps from leaving a dot
      if (style.cap) p.style.strokeLinecap = style.cap;
      if (style.opacity !== undefined) p.style.opacity = style.opacity;
      svg.appendChild(p);
      return p;
    });
  }
  const single = (o) => Object.assign({ disableMultiStroke: true, preserveVertices: false }, o);

  function build(el) {
    const kind = el.dataset.mark, w = el.offsetWidth, h = el.offsetHeight;
    if (!w || !h) return null;                                   // hidden in this cut
    const color = COLORS[el.dataset.color || (kind === 'highlight' ? 'gold' : 'red')] || el.dataset.color;
    const pad = el.dataset.pad === undefined ? null : parseFloat(el.dataset.pad);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const s = (seed += 7);

    // keep the words above a highlighter stroke and below a pen stroke
    const text = document.createElement('span');
    text.className = 'mk-t';
    while (el.firstChild) text.appendChild(el.firstChild);
    const svg = svgEl('svg', { class: 'rough', width: w, height: h, viewBox: `0 0 ${w} ${h}` });
    let ds = [], style = { stroke: color, width: Math.max(3, fs * 0.055) };

    if (kind === 'underline') {
      const y = h / 2 + fs * 0.4 + (pad || 0);                  // just under the baseline, whatever the line height
      ds = strokesOf(gen.line(-2, y, w + 2, y + 1, single({ roughness: 1.5, bowing: 1.2, seed: s })))
        .concat(strokesOf(gen.line(w + 4, y + fs * 0.07, 0, y + fs * 0.05, single({ roughness: 1.5, bowing: 1.2, seed: s + 1 }))));
      style.width = Math.max(3.5, fs * 0.06);
    } else if (kind === 'highlight') {
      const y = h * 0.56, x0 = -(pad === null ? fs * 0.12 : pad), x1 = w - x0;
      ds = strokesOf(gen.line(x0, y, x1, y - 1, single({ roughness: 0.9, bowing: 0.6, seed: s })))
        .concat(strokesOf(gen.line(x1 - 2, y + fs * 0.05, x0 + 3, y + fs * 0.04, single({ roughness: 0.9, bowing: 0.6, seed: s + 1 }))));
      style = { stroke: color, width: h * 0.62, cap: 'butt', opacity: 0.72 };
    } else if (kind === 'circle') {
      const p = pad === null ? fs * 0.3 : pad;
      ds = strokesOf(gen.ellipse(w / 2, h / 2, w + p * 2.2, h + p * 1.1, single({ roughness: 1.1, seed: s, curveFitting: 0.92, curveStepCount: 14 })));
      // a second pass, slightly off, like a pen going round twice
      ds = ds.concat(strokesOf(gen.ellipse(w / 2 + 3, h / 2 + 2, w + p * 2.2 + 8, h + p * 1.1 + 5, single({ roughness: 1.3, seed: s + 3, curveFitting: 0.9, curveStepCount: 14 }))));
      style.width = Math.max(3.5, fs * 0.05);
    } else if (kind === 'cross') {
      const m = Math.min(w, h) * 0.12;
      ds = strokesOf(gen.line(m, m, w - m, h - m, single({ roughness: 1.6, bowing: 1.5, seed: s })))
        .concat(strokesOf(gen.line(w - m, m, m, h - m, single({ roughness: 1.6, bowing: 1.5, seed: s + 1 }))));
      style.width = Math.max(5, Math.min(w, h) * 0.11);
    } else if (kind === 'slash') {
      ds = strokesOf(gen.line(w * 0.96, h * 0.04, w * 0.04, h * 0.96, single({ roughness: 1.3, bowing: 1.2, seed: s })));
      style.width = Math.max(4, Math.min(w, h) * 0.08);
    } else if (kind === 'tick') {
      ds = strokesOf(gen.line(w * 0.14, h * 0.52, w * 0.4, h * 0.8, single({ roughness: 1.0, bowing: 0.8, seed: s })))
        .concat(strokesOf(gen.line(w * 0.4, h * 0.8, w * 0.92, h * 0.16, single({ roughness: 1.0, bowing: 0.8, seed: s + 1 }))));
      style.width = Math.max(4, Math.min(w, h) * 0.13);
    } else if (kind === 'strike') {
      const y = h * 0.56;
      ds = strokesOf(gen.line(-6, y + 2, w + 6, y - 3, single({ roughness: 1.6, bowing: 1.4, seed: s })));
      style.width = Math.max(4, fs * 0.06);
    } else throw new Error('unknown mark: ' + kind);

    const paths = addPaths(svg, ds, style);
    if (kind === 'highlight') { el.appendChild(svg); el.appendChild(text); }
    else { el.appendChild(text); el.appendChild(svg); }
    el._strokes = paths;
    el._kind = kind;
    return paths;
  }

  function prepare(root) {
    let n = 0;
    for (const el of (root || document).querySelectorAll('[data-mark]')) if (!el._strokes && build(el)) n++;
    return n;
  }
  const strokes = (el) => (el && el._strokes) || [];

  /* ---- free-standing sketches, in stage coordinates ---------------------------------------- */
  function sketch(svg, drawable, opts = {}) {
    return addPaths(svg, strokesOf(drawable), { stroke: COLORS[opts.color] || opts.color || COLORS.ink, width: opts.width || 3.5, cap: opts.cap, opacity: opts.opacity });
  }
  function line(svg, a, b, opts = {}) {
    return sketch(svg, gen.line(a[0], a[1], b[0], b[1], single({ roughness: opts.roughness === undefined ? 1.2 : opts.roughness, bowing: opts.bowing === undefined ? 1.6 : opts.bowing, seed: opts.seed || (seed += 7) })), opts);
  }
  /** arrow from a to b; opts.bend bows the shaft sideways (px), opts.head = head size */
  function arrow(svg, a, b, opts = {}) {
    const s = opts.seed || (seed += 7), head = opts.head || 22, bend = opts.bend || 0;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / len) * bend, cy = my + (dx / len) * bend;
    const shaft = bend
      ? gen.path(`M${a[0]} ${a[1]} Q${cx} ${cy} ${b[0]} ${b[1]}`, single({ roughness: opts.roughness === undefined ? 0.9 : opts.roughness, seed: s }))
      : gen.line(a[0], a[1], b[0], b[1], single({ roughness: opts.roughness === undefined ? 1.1 : opts.roughness, bowing: 1.4, seed: s }));
    const ang = Math.atan2(b[1] - cy, b[0] - cx);
    const tip = (da) => [b[0] - Math.cos(ang + da) * head, b[1] - Math.sin(ang + da) * head];
    const h1 = tip(0.48), h2 = tip(-0.48);
    const paths = sketch(svg, shaft, opts)
      .concat(sketch(svg, gen.line(h1[0], h1[1], b[0], b[1], single({ roughness: 0.7, bowing: 0.6, seed: s + 1 })), opts))
      .concat(sketch(svg, gen.line(b[0], b[1], h2[0], h2[1], single({ roughness: 0.7, bowing: 0.6, seed: s + 2 })), opts));
    return paths;
  }
  function circle(svg, cx, cy, d, opts = {}) {
    return sketch(svg, gen.ellipse(cx, cy, d, d * (opts.squash || 1), single({ roughness: opts.roughness === undefined ? 1.2 : opts.roughness, seed: opts.seed || (seed += 7), curveFitting: 0.9, curveStepCount: 12 })), opts);
  }
  function rect(svg, x, y, w, h, opts = {}) {
    return sketch(svg, gen.rectangle(x, y, w, h, single({ roughness: opts.roughness === undefined ? 1.2 : opts.roughness, bowing: 1.2, seed: opts.seed || (seed += 7) })), opts);
  }
  function path(svg, d, opts = {}) {
    return sketch(svg, gen.path(d, single({ roughness: opts.roughness === undefined ? 1 : opts.roughness, seed: opts.seed || (seed += 7) })), opts);
  }

  window.OXMARK = { prepare, strokes, arrow, line, circle, rect, path, COLORS, HIDDEN };
})();
