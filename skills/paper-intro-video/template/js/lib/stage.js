/* stage.js — the stagecraft every film shares, on top of the timeline (engine.js).
 *
 *   const ST = window.OXSTAGE();      once, at the top of window.OXBUILD in js/scenes.js
 *
 *   layout(id, stations, chrome)   a scene becomes a strip of 1920-wide stations (the world) + chrome that stays put
 *   scene(id)                      the scene's builder S: S.c (cue starts), S.d (windows), S.dur — all on the plan's
 *                                  clock — plus S.w / S.ws / S.said (when words are spoken) and the page turn
 *   camera(S, lay, keys)           keys {at, k: station, x, y, s, dur, ease, push}; it never parks, it keeps pushing in
 *   words(S, node, at)             kinetic type: every word rises out of its mask (at: a time, or one time per word)
 *   chapter(S, head)               a headline opens in the middle of the page and settles top-left
 *   mark(S, el, at) · draw(S, paths, at, dur) · jot(S, el, at)     hand-drawn emphasis (annotate.js), drawn on cue
 *   pop(S, el, at) · counter(S, node, to, at, dur, fmt)
 *   hud({from, until})             the chapter bar at the bottom      captions({dark})   the caption line
 *
 * Two clocks (js/lib/build.js): everything a scene registers is written on the plan's clock and mapped
 * onto the film word by word once a voice exists, so nothing in js/scenes.js knows how fast anyone speaks.
 * S.w(cue, 'word', fallback) is the moment a word is said — use it for whatever belongs to a word.
 */
(function () {
  'use strict';

  window.OXSTAGE = function (o = {}) {
    const { Timeline, clamp01, EASE, easing } = window.OX;
    const SCRIPT = window.OXSCRIPT, MK = window.OXMARK, WARP = window.OXWARP;
    const W = 1920, H = 1080, GAP = o.gap || 2400;                  // stage size; distance between stations
    const TURN = o.turn === undefined ? 0.5 : o.turn;               // half a page turn, on each side of a cut
    const tl = new Timeline();
    const stage = document.getElementById('stage');
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
    const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
    const svgEl = (tag, attrs) => { const e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    const ico = (name, w) => `<i data-ph="${name}" data-w="${w || 'light'}"></i>`;
    const setText = (node, s) => { if (node._s !== s) { node.textContent = s; node._s = s; } };
    const pad2 = (n) => String(n).padStart(2, '0');
    const lerp = (a, b, u) => a + (b - a) * u;
    const T = (id) => SCRIPT.scenes.find((s) => s.id === id);
    /** a moment of a scene, given on the clock the scene is written against, as film time */
    const filmTime = (id, at) => { const sc = T(id); return sc.start + WARP(sc.map.p, sc.map.a, at); };
    const plain = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    /** an element's layout box relative to a positioned ancestor (transforms are ignored) */
    const boxIn = (node, container) => {
      let x = 0, y = 0;
      for (let n = node; n && n !== container; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
      const w = node.offsetWidth, h = node.offsetHeight;
      return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, r: x + w, b: y + h };
    };
    /** wrap the words of a statement in mask + inner spans, keeping nested elements; a hand-drawn mark stays one unit */
    function splitDeep(node) {
      if (node._words) return node._words;
      const out = [];
      (function walk(n) {
        for (const ch of Array.from(n.childNodes)) {
          if (ch.nodeType === 3) {
            const frag = document.createDocumentFragment();
            for (const part of ch.textContent.split(/(\s+)/)) {
              if (!part) continue;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); continue; }
              const sp = el('span', 'w'), inner = el('span', 'wi');
              inner.textContent = part; sp.appendChild(inner); frag.appendChild(sp); out.push(sp);
            }
            n.replaceChild(frag, ch);
          } else if (ch.nodeType === 1 && ch.classList.contains('mk')) {
            const wrap = el('span', 'w nomask');
            n.insertBefore(wrap, ch); wrap.appendChild(ch);
            const nx = wrap.nextSibling;                              // keep trailing punctuation on the same line
            if (nx && nx.nodeType === 3) { const m = /^[.,;:!?]+/.exec(nx.textContent); if (m) { wrap.appendChild(document.createTextNode(m[0])); nx.textContent = nx.textContent.slice(m[0].length); } }
            out.push(wrap);
          } else if (ch.nodeType === 1 && ch.tagName !== 'BR') walk(ch);
        }
      })(node);
      node._words = out;
      return out;
    }
    /** a scene becomes a strip of stations (the world the camera looks at) plus chrome that stays put */
    function layout(id, stations, chrome = ['.sec-head']) {
      const root = document.getElementById(id);
      const world = el('div', 'world'), chromeEl = el('div', 'chrome');
      const keys = {}, st = [];
      for (const [key, sels, dark] of stations) {
        const s = el('div', 'station' + (dark ? ' dark' : ''));
        s.style.left = st.length * GAP + 'px';
        for (const sel of sels) for (const n of root.querySelectorAll(':scope > ' + sel)) s.appendChild(n);
        world.appendChild(s);
        keys[key] = st.length;
        st.push(s);
      }
      for (const sel of chrome) for (const n of root.querySelectorAll(':scope > ' + sel)) chromeEl.appendChild(n);
      while (root.firstChild) st[0].appendChild(root.firstChild);     // anything not named stays on the first station
      root.appendChild(world);
      root.appendChild(chromeEl);
      return { root, world, chrome: chromeEl, st, k: keys, at: (key) => st[keys[key]] };
    }


    const scene = (id) => {
      const sc = SCRIPT.scenes.find((s) => s.id === id), first = sc.start === 0, last = sc === SCRIPT.scenes[SCRIPT.scenes.length - 1];
      const S = tl.scene(id, sc.start, sc.dur, { pre: first ? 0 : TURN, post: last ? 0 : TURN,
        map: (x) => WARP(sc.map.p, sc.map.a, x), inv: (x) => WARP(sc.map.a, sc.map.p, x) });
      S.c = sc.c; S.d = sc.d; S.dur = sc.plan.dur;                  // the plan's clock: cue starts, windows, scene length
      S.has = (k) => sc.c[k] !== undefined;
      /** film time -> the plan's clock, for callbacks that watch the time themselves */
      S.now = (t) => S.inv(t - sc.start);
      /** when a word of a line is said — S.w('token', 'thinking,', 6.4); n picks a later match when the word repeats.
       *  The fallback (seconds into the line) is used for a line whose pacing is not known. */
      S.w = (cue, key, fb, n = 0) => {
        const v = sc.w[cue];
        if (!v) return sc.c[cue] + fb;
        const ks = key.split(/\s+/).map(plain), ws = v.words.map(plain);
        for (let i = 0, seen = 0; i + ks.length <= ws.length; i++) if (ks.every((k, j) => ws[i + j] === k) && seen++ === n) return v.t[i];
        throw new Error(`S.w: "${key}" (match ${n}) is not in the line ${id}/${cue}: ${v.words.join(' ')}`);
      };
      /** when each word of a line is said (null for a line whose pacing is not known) */
      S.ws = (cue) => (sc.w[cue] ? sc.w[cue].t : null);
      /** when a line has been said */
      S.said = (cue, fb) => (sc.w[cue] ? sc.w[cue].end : sc.c[cue] + fb);
      // the page turns to the right: the old scene leaves on the left while this one arrives
      if (!first) { S.fromTo(S.root, { x: W }, { x: 0 }, { at: -TURN, dur: 2 * TURN, ease: 'inOutCubic', raw: true }); S.sfx('whoosh', -TURN, { dur: 1.0, g: 0.5 }); }
      if (!last) S.to(S.root, { x: -W }, { at: sc.dur - TURN, dur: 2 * TURN, ease: 'inOutCubic', raw: true });
      S.mark(id.slice(2), 0);
      return S;
    };
    /** the camera: looks at point (x, y) of station k at zoom s; after arriving it keeps pushing in, so it never parks */
    const camera = (S, lay, keys, o = {}) => {
      const push = o.push === undefined ? 0.0045 : o.push;
      const ks = keys.map((k) => ({
        at: k.at, dur: k.dur === undefined ? 0.9 : k.dur, st: typeof k.k === 'string' ? lay.k[k.k] : (k.k || 0),
        y: k.y === undefined ? 540 : k.y, s: k.s || 1, ease: easing(k.ease || 'inOutCubic'), push: k.push === undefined ? push : k.push, lx: k.x === undefined ? 960 : k.x,
      })).sort((a, b) => a.at - b.at);
      ks.forEach((k, i) => { k.x = k.st * GAP + k.lx; if (i && ks[i - 1].st !== k.st) S.sfx('whoosh', k.at, { dur: k.dur, g: 0.4 }); });
      ks.forEach((k) => { const a = S.map(k.at); k.dur = S.map(k.at + k.dur) - a; k.at = a; });   // from here on the keys are in film time
      const drift = (k, until) => ({ x: k.x, y: k.y, s: k.s * (1 + k.push * Math.max(0, until - (k.at + k.dur))) });
      ks.forEach((k, i) => { k.from = i ? drift(ks[i - 1], k.at) : { x: k.x, y: k.y, s: k.s }; });
      S.call((p, lt, t) => {
        const local = t - S.sc.start;
        let i = 0;
        while (i + 1 < ks.length && ks[i + 1].at <= local) i++;
        const k = ks[i], u = k.ease(clamp01((local - k.at) / (k.dur || 1e-6))), end = drift(k, local);
        const x = lerp(k.from.x, end.x, u), y = lerp(k.from.y, end.y, u), s = lerp(k.from.s, end.s, u);
        lay.world.style.transform = `translate(${(W / 2 - x * s).toFixed(2)}px,${(H / 2 - y * s).toFixed(2)}px) scale(${s.toFixed(5)})`;
      }, { at: 0, dur: S.dur });
    };
    /** kinetic type: every word rises out of its mask, one after another (or on the times given) */
    const words = (S, node, at, o = {}) => {
      const ws = splitDeep(node), st = o.stagger === undefined ? 0.07 : o.stagger, dur = o.dur || 0.65;
      ws.forEach((w, i) => {
        const tt = Array.isArray(at) ? at[Math.min(i, at.length - 1)] + (i >= at.length ? (i - at.length + 1) * st : 0) : at + i * st;
        if (w.classList.contains('nomask')) S.fromTo(w, { opacity: 0, y: 26 }, { opacity: 1, y: 0 }, { at: tt, dur: dur * 0.8 });
        else S.fromTo(w.firstChild, { y: Math.ceil(w.offsetHeight * 1.12) }, { y: 0 }, { at: tt, dur, ease: 'outExpo' });
      });
      return ws.length * st;
    };
    const wordsOut = (S, node, at) => splitDeep(node).forEach((w) => {
      if (w.classList.contains('nomask')) S.to(w, { opacity: 0 }, { at, dur: 0.25, ease: 'inQuad' });
      else S.to(w.firstChild, { y: -Math.ceil(w.offsetHeight * 1.12) }, { at, dur: 0.3, ease: 'inCubic' });
    });
    /** a chapter opens with its headline in the middle of the page, which then settles top-left */
    const chapter = (S, head, o = {}) => {
      const label = head.querySelector('.sec-label'), title = head.querySelector('.sec-title');
      const w = head.offsetWidth, h = head.offsetHeight, k = Math.min(o.scale || 1.5, 1640 / w);
      const at = o.at === undefined ? 0.05 : o.at, hold = o.hold === undefined ? 0.95 : o.hold;
      S.fromTo(head, { x: (W - w * k) / 2 - 120, y: (H - h * k) / 2 - 150, scale: k }, { x: 0, y: 0, scale: 1 }, { at: at + hold, dur: 0.7, ease: 'inOutCubic' });
      if (label) S.fromTo(label, { opacity: 0 }, { opacity: 1 }, { at, dur: 0.4 });
      if (title && !title.classList.contains('multi')) words(S, title, at + 0.08, { stagger: 0.055 });
      return at + hold + 0.7;
    };
    /** pen strokes, one after another */
    const draw = (S, paths, at, dur, o = {}) => {
      if (!paths.length) return;
      const each = dur / paths.length;
      S.fromTo(paths, { strokeDashoffset: MK.HIDDEN }, { strokeDashoffset: 0 }, { at, dur: each, stagger: each, ease: 'inOutQuad' });
      if (!o.quiet && !MK.CLEAN) S.sfx('pen', at, { dur, g: o.g || 0.8 });          // geometric strokes (OXCLEAN) are drawn without the pen's scratch
    };
    const MARK_DUR = { underline: 0.55, highlight: 0.6, circle: 0.85, cross: 0.4, strike: 0.4, tick: 0.3 };
    const mark = (S, target, at, o = {}) => {
      const node = typeof target === 'string' ? S.$(target) : target;
      draw(S, MK.strokes(node), at, o.dur || MARK_DUR[node._kind] || 0.5, o);
    };
    /** a handwritten note lands, slightly askew */
    const jot = (S, target, at, o = {}) => {
      const rot = o.rot === undefined ? -4 : o.rot;
      S.fromTo(target, { opacity: 0, scale: 0.86, rotate: rot - 5 }, { opacity: 1, scale: 1, rotate: rot }, { at, dur: 0.4, ease: 'outBack' });
      if (!o.quiet) S.sfx('pen', at, { dur: 0.3, g: 0.6 });
    };
    const pop = (S, target, at, o = {}) => S.fromTo(target, { opacity: 0, scale: o.from === undefined ? 0.5 : o.from }, { opacity: 1, scale: 1 }, { at, dur: o.dur || 0.4, ease: 'outBack', stagger: o.stagger || 0 });
    const counter = (S, node, to, at, dur, fmt) => S.call((p) => setText(node, fmt(to * p)), { at, dur, ease: 'outCubic' });
    const num = (v) => Math.round(v).toLocaleString('en-US');


    /** the chapter bar: one segment per chapter of js/script.js, filling while its scenes play.
     *  from / until: film times at which the whole HUD fades in and out (default: with the first chapter; never out) */
    function hud(h = {}) {
      const chapters = SCRIPT.chapters.map((name, i) => {
        const node = el('div', 'hud-ch', `<span><em>(${i + 1})</em>${name}</span><i><b></b></i>`);
        $('#hud-chapters').appendChild(node);
        const scs = SCRIPT.scenes.filter((s) => s.chapter === i);
        return { node, bar: node.querySelector('b'), start: scs[0].start, end: scs[scs.length - 1].start + scs[scs.length - 1].dur };
      });
      tl.fromTo('#hud', { opacity: 0 }, { opacity: 1 }, { at: h.from === undefined ? (chapters.length ? chapters[0].start : 0) + 0.3 : h.from, dur: 0.5 });
      if (h.until !== undefined) tl.to('#hud', { opacity: 0 }, { at: h.until, dur: 0.35 });
      tl.ambient((t) => {
        for (const c of chapters) {
          const w = (clamp01((t - c.start) / (c.end - c.start)) * 100).toFixed(2) + '%';
          if (c._w !== w) { c.bar.style.width = w; c._w = w; }
          const state = t >= c.end ? 'done' : t >= c.start ? 'on' : '';
          if (c._st !== state) { c.node.className = 'hud-ch ' + state; c._st = state; }
        }
      });
      return chapters;
    }
    /** the caption line: words only, in the ground's contrast colour. dark: film-time ranges [from, to] where the
     *  ground is a dark card (the caption turns light there). The offline renderer composites captions itself
     *  (tools/encode.py) with the same 0.16 s fade. */
    function captions(c = {}) {
      const capBox = $('#captions'), capText = $('#cap-text'), ranges = c.dark || [];
      window.OXLANG = window.OXLANG || 'en';
      tl.ambient((t) => {
        const lang = window.OXLANG;
        let cue = null;
        if (lang !== 'off') for (const k of SCRIPT.captions[lang] || SCRIPT.captions.en) { if (t >= k.start && t < k.end) { cue = k; break; } }
        if (!cue) { if (capBox._o !== 0) { capBox.style.opacity = 0; capBox._o = 0; } return; }
        const a = Math.min(1, (t - cue.start) / 0.16, (cue.end - t) / 0.16);
        if (capText._s !== cue.text) { capText.textContent = cue.text; capText._s = cue.text; capText.classList.toggle('zh', lang === 'zh'); }
        const dark = ranges.some(([from, to]) => t >= from && t < to);
        if (capText._d !== dark) { capText.classList.toggle('on-dark', dark); capText._d = dark; }
        const op = +Math.max(0, a).toFixed(3);
        if (capBox._o !== op) { capBox.style.opacity = op; capBox._o = op; }
      });
    }

    return { tl, stage, W, H, GAP, TURN, Timeline, clamp01, EASE, MK, SCRIPT, $, $$, el, svgEl, ico, setText, pad2, lerp, T, filmTime, plain, boxIn, splitDeep, layout,
      scene, camera, words, wordsOut, chapter, draw, mark, jot, pop, counter, num, hud, captions };
  };
})();
