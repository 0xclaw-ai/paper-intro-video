/* engine.js — a tiny deterministic timeline.
 *
 * Every frame is a pure function of time: seek(t) recomputes all animated state from
 * scratch, so frames can be rendered in any order (random access, parallel capture)
 * and the live preview and the offline render are pixel-identical.
 */
(function () {
  'use strict';

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const EASE = {
    linear: (p) => p,
    inQuad: (p) => p * p,
    outQuad: (p) => 1 - (1 - p) * (1 - p),
    inOutQuad: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    inCubic: (p) => p * p * p,
    outCubic: (p) => 1 - Math.pow(1 - p, 3),
    inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outQuart: (p) => 1 - Math.pow(1 - p, 4),
    inOutQuart: (p) => (p < 0.5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2),
    outQuint: (p) => 1 - Math.pow(1 - p, 5),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inExpo: (p) => (p <= 0 ? 0 : Math.pow(2, 10 * p - 10)),
    inOutSine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    outBack: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    outBackSoft: (p) => { const c1 = 0.9, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    inBack: (p) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * p * p * p - c1 * p * p; },
    outElastic: (p) => {
      if (p <= 0) return 0; if (p >= 1) return 1;
      return Math.pow(2, -9 * p) * Math.sin(((p * 8 - 0.75) * (2 * Math.PI)) / 3) + 1;
    },
  };

  const DEFAULTS = { opacity: 1, x: 0, y: 0, z: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, rotateX: 0, rotateY: 0, blur: 0 };
  const TRANSFORM = ['x', 'y', 'z', 'rotateX', 'rotateY', 'rotate', 'scale', 'scaleX', 'scaleY'];
  const isTransform = (p) => TRANSFORM.indexOf(p) !== -1;

  function parseColor(str) {
    let m = /^#([0-9a-f]{6})$/i.exec(str);
    if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
    m = /^rgba?\(([^)]+)\)$/i.exec(str);
    if (m) { const a = m[1].split(',').map((s) => parseFloat(s)); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; }
    return null;
  }
  function parseVal(v) {
    if (typeof v === 'number') return { n: v, u: '' };
    const c = parseColor(v);
    if (c) return { c };
    const m = /^(-?[\d.]+)(.*)$/.exec(String(v));
    return m ? { n: parseFloat(m[1]), u: m[2] } : { s: String(v) };
  }
  function lerpVal(a, b, p) {
    if (a.c && b.c) {
      const c = a.c.map((x, i) => x + (b.c[i] - x) * p);
      return `rgba(${c[0].toFixed(1)},${c[1].toFixed(1)},${c[2].toFixed(1)},${c[3].toFixed(3)})`;
    }
    if (a.n !== undefined && b.n !== undefined) {
      const n = a.n + (b.n - a.n) * p;
      return b.u || a.u ? n.toFixed(3) + (b.u || a.u) : n;
    }
    return p < 0.5 ? a.s : b.s; // discrete
  }
  const toList = (target, root) => {
    if (!target) return [];
    if (typeof target === 'string') return Array.from((root || document).querySelectorAll(target));
    if (target instanceof Element) return [target];
    return Array.from(target);
  };

  class Timeline {
    constructor() {
      this.items = new Map();   // Element -> Map(prop -> [tween])
      this.calls = [];          // { fn, t0, t1, ease, scene }
      this.scenes = [];         // { id, el, start, dur, showFrom, showTo }
      this.ambients = [];       // fn(t)
      this.sfx = [];            // { t, kind, ...opts } — sound-design cue sheet, exported for tools/music.py
      this.marks = {};          // name -> absolute time, structural markers for the music
      this.duration = 0;
      this.time = 0;
      this._sorted = false;
    }

    /* ---- scene registration ------------------------------------------------ */
    scene(id, start, dur, opts = {}) {
      const el = document.getElementById(id);
      if (!el) throw new Error('scene element not found: ' + id);
      const sc = { id, el, start, dur, end: start + dur, showFrom: start - (opts.pre || 0), showTo: start + dur + (opts.post === undefined ? 0.02 : opts.post) };
      this.scenes.push(sc);
      this.duration = Math.max(this.duration, sc.end);
      return new SceneBuilder(this, sc, opts.map, opts.inv);
    }

    /* ---- low-level tween registration (absolute time) ---------------------- */
    _tween(el, prop, from, to, t0, dur, ease) {
      let props = this.items.get(el);
      if (!props) { props = new Map(); this.items.set(el, props); }
      let list = props.get(prop);
      if (!list) { list = []; props.set(prop, list); }
      list.push({ t0, t1: t0 + dur, from, to, ease: typeof ease === 'function' ? ease : (EASE[ease] || EASE.outCubic), fromAuto: from === undefined });
      this._sorted = false;
    }
    fromTo(target, from, to, opts = {}) {
      const els = toList(target, opts.root);
      const { at = 0, dur = 0.6, ease = 'outCubic', stagger = 0 } = opts;
      els.forEach((el, i) => {
        for (const prop of Object.keys(to)) this._tween(el, prop, from ? from[prop] : undefined, to[prop], at + i * stagger, dur, ease);
      });
      return this;
    }
    to(target, to, opts) { return this.fromTo(target, null, to, opts); }
    set(target, props, opts = {}) { return this.fromTo(target, null, props, { ...opts, dur: 0 }); }
    call(fn, opts = {}) {
      const { at = 0, dur = 0, ease = 'linear', scene = null } = opts;
      this.calls.push({ fn, t0: at, t1: at + dur, ease: EASE[ease] || EASE.linear, scene });
      return this;
    }
    ambient(fn) { this.ambients.push(fn); return this; }

    _finalize() {
      for (const props of this.items.values()) {
        for (const [prop, list] of props) {
          list.sort((a, b) => a.t0 - b.t0);
          let prev;
          for (const tw of list) {
            if (tw.fromAuto) tw.from = prev !== undefined ? prev : (DEFAULTS[prop] !== undefined ? DEFAULTS[prop] : 0);
            prev = tw.to;
            tw.a = parseVal(tw.from); tw.b = parseVal(tw.to);
          }
        }
      }
      this._sorted = true;
    }

    /* ---- render one frame --------------------------------------------------- */
    seek(t) {
      if (!this._sorted) this._finalize();
      this.time = t;
      for (const sc of this.scenes) {
        const on = t >= sc.showFrom && t < sc.showTo;
        if (sc.on !== on) { sc.el.style.display = on ? 'block' : 'none'; sc.on = on; }
      }
      for (const [el, props] of this.items) {
        let hasTf = false; const cur = {};
        for (const [prop, list] of props) {
          let tw = list[0], v;
          if (t < tw.t0) v = lerpVal(tw.a, tw.b, 0);
          else {
            for (let i = list.length - 1; i > 0; i--) { if (list[i].t0 <= t) { tw = list[i]; break; } }
            const p = tw.t1 > tw.t0 ? clamp01((t - tw.t0) / (tw.t1 - tw.t0)) : 1;
            v = lerpVal(tw.a, tw.b, tw.ease(p));
          }
          if (isTransform(prop)) { hasTf = true; cur[prop] = v; }
          else if (prop === 'opacity') {
            el.style.opacity = v;
            el.style.visibility = v <= 0.001 ? 'hidden' : 'inherit';
          } else if (prop === 'blur') el.style.filter = v > 0.05 ? `blur(${v.toFixed(2)}px)` : 'none';
          else if (prop.startsWith('--')) el.style.setProperty(prop, v);
          else if (prop.startsWith('attr:')) el.setAttribute(prop.slice(5), v);
          else el.style[prop] = v;
        }
        if (hasTf) {
          let s = '';
          if ('x' in cur || 'y' in cur || 'z' in cur) s += `translate3d(${(cur.x || 0).toFixed(2)}px,${(cur.y || 0).toFixed(2)}px,${(cur.z || 0).toFixed(2)}px)`;
          if ('rotateX' in cur) s += ` rotateX(${cur.rotateX.toFixed(3)}deg)`;
          if ('rotateY' in cur) s += ` rotateY(${cur.rotateY.toFixed(3)}deg)`;
          if ('rotate' in cur) s += ` rotate(${cur.rotate.toFixed(3)}deg)`;
          if ('scale' in cur || 'scaleX' in cur || 'scaleY' in cur) {
            const sc = cur.scale === undefined ? 1 : cur.scale;
            s += ` scale(${(sc * (cur.scaleX === undefined ? 1 : cur.scaleX)).toFixed(4)},${(sc * (cur.scaleY === undefined ? 1 : cur.scaleY)).toFixed(4)})`;
          }
          el.style.transform = s;
        }
      }
      for (const c of this.calls) {
        if (c.scene && !c.scene.on) continue;
        const p = c.t1 > c.t0 ? clamp01((t - c.t0) / (c.t1 - c.t0)) : (t >= c.t0 ? 1 : 0);
        c.fn(c.ease(p), t - c.t0, t);
      }
      for (const fn of this.ambients) fn(t);
    }
  }

  /* Scene-local authoring helper: all times are relative to the scene start, on the clock the scene
   * was written against. `map` takes that clock to the film's (js/script.js builds it from the voice;
   * the identity when nobody speaks); a tween keeps its place between the words around it, so its
   * start and its end are both mapped. { raw: true } addresses the film directly. */
  class SceneBuilder {
    constructor(tl, sc, map, inv) { this.tl = tl; this.sc = sc; this.root = sc.el; this.map = map || ((x) => x); this.inv = inv || ((x) => x); }
    $(sel) { return this.root.querySelector(sel); }
    $$(sel) { return Array.from(this.root.querySelectorAll(sel)); }
    _o(opts = {}, dur) {
      const at = opts.at || 0;
      if (opts.raw) return { ...opts, at: this.sc.start + at, root: this.root };
      const a = this.map(at), d = opts.dur === undefined ? dur : opts.dur;
      return { ...opts, at: this.sc.start + a, dur: this.map(at + d) - a, root: this.root };
    }
    fromTo(target, from, to, opts = {}) {
      if (!opts.stagger) { this.tl.fromTo(target, from, to, this._o(opts, 0.6)); return this; }
      toList(target, this.root).forEach((el, i) => this.tl.fromTo(el, from, to, this._o({ ...opts, stagger: 0, at: (opts.at || 0) + i * opts.stagger }, 0.6)));
      return this;
    }
    to(target, to, opts) { return this.fromTo(target, null, to, opts); }
    set(target, props, opts = {}) { return this.fromTo(target, null, props, { ...opts, dur: 0 }); }
    call(fn, opts = {}) { this.tl.call(fn, { ...this._o(opts, 0), scene: this.sc }); return this; }
    /** declare a sound next to the visual it belongs to (see tools/music.py for the vocabulary) */
    sfx(kind, at, opts = {}) {
      const a = this.map(at), e = { t: +(this.sc.start + a).toFixed(3), kind, ...opts };
      if (opts.dur !== undefined) e.dur = +(this.map(at + opts.dur) - a).toFixed(3);
      this.tl.sfx.push(e);
      return this;
    }
    /** name a moment so the music can follow the edit */
    mark(name, at) { this.tl.marks[name] = +(this.sc.start + this.map(at)).toFixed(3); return this; }

    /* common moves ----------------------------------------------------------- */
    rise(target, opts = {}) {
      const { dist = 34, dur = 0.7, ease = 'outCubic', blur = 0 } = opts;
      this.fromTo(target, { opacity: 0, y: dist, ...(blur ? { blur } : {}) }, { opacity: 1, y: 0, ...(blur ? { blur: 0 } : {}) }, { ...opts, dur, ease });
      return this;
    }
    fadeIn(target, opts = {}) { return this.fromTo(target, { opacity: 0 }, { opacity: 1 }, { dur: 0.5, ...opts }); }
    fadeOut(target, opts = {}) { return this.to(target, { opacity: 0 }, { dur: 0.4, ease: 'inQuad', ...opts }); }
    pop(target, opts = {}) {
      return this.fromTo(target, { opacity: 0, scale: opts.from === undefined ? 0.7 : opts.from }, { opacity: 1, scale: 1 }, { dur: 0.55, ease: 'outBack', ...opts });
    }
    /** typewriter into el.textContent */
    type(el, text, opts = {}) {
      const node = typeof el === 'string' ? this.$(el) : el;
      const cps = opts.cps || 30;
      const dur = opts.dur || text.length / cps;
      this.call((p) => { const n = Math.round(p * text.length); if (node._n !== n) { node.textContent = text.slice(0, n); node._n = n; } }, { at: opts.at || 0, dur });
      return dur;
    }
    /** animated number */
    count(el, from, to, opts = {}) {
      const node = typeof el === 'string' ? this.$(el) : el;
      const { decimals = 0, prefix = '', suffix = '', dur = 1.2, ease = 'outCubic', sep = false } = opts;
      this.call((p) => {
        const v = from + (to - from) * p;
        let s = v.toFixed(decimals);
        if (sep) s = Number(s).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const out = prefix + s + suffix;
        if (node._s !== out) { node.textContent = out; node._s = out; }
      }, { at: opts.at || 0, dur, ease });
      return this;
    }
    /** standard scene exit: whole scene drifts back and dissolves as the next one starts */
    exit(opts = {}) {
      const dur = opts.dur || 0.5;
      const at = opts.at === undefined ? this.sc.dur - dur : opts.at;
      this.fromTo(this.root, { opacity: 1, scale: 1, blur: 0 }, { opacity: 0, scale: opts.scale || 1.03, blur: opts.blur === undefined ? 8 : opts.blur }, { at, dur, ease: 'inQuad' });
      return this;
    }
  }

  /** wrap each word (or char) of an element in spans for staggered reveals */
  function split(el, mode = 'words') {
    const text = el.textContent;
    el.textContent = '';
    const out = [];
    const parts = mode === 'chars' ? Array.from(text) : text.split(/(\s+)/);
    for (const part of parts) {
      if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
      if (!part) continue;
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = part;
      el.appendChild(span);
      out.push(span);
    }
    return out;
  }

  window.OX = { Timeline, EASE, split, clamp01 };
})();
