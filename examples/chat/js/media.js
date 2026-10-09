/* media.js — frame-accurate video clips on a page that is rendered frame by frame.
 *
 * tools/prep_media.py cuts each clip into numbered JPEGs (media/<clip>/00001.jpg …) and writes
 * media/manifest.js; load that before this file. A clip on screen is an <img>, and js/scenes.js says
 * when it starts:
 *
 *   OXMEDIA.play(S, img, 'demo', { at: c.result + 0.2, from: 1.5 })
 *
 * From `at` (the scene's clock, mapped to the film like every other cue) the clip runs at its own frame
 * rate in film time; before `at` it shows its first frame, after its last frame it holds. Each frame is
 * decoded before the renderer captures (window.__seek awaits OXMEDIA.settle()), so a render never shows
 * a half-loaded frame and the result is the same in whatever order the tabs render. A <video> element
 * cannot promise that: it seeks inexactly and asynchronously.
 *
 * A clip that is not in the manifest (its source is not on this machine) shows a labelled plate instead,
 * so the rest of the film still renders and keeps its timing.
 */
(function () {
  'use strict';
  const MAN = window.OXMEDIA_MANIFEST || {};
  const pending = new Set();
  const failed = new Map();
  const warned = new Set();

  function plate(name) {
    if (!warned.has(name)) { warned.add(name); console.warn('media: no clip "' + name + '" (run tools/prep_media.py); showing a plate'); }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="800"><rect width="100%" height="100%" fill="#cfc9b8"/>'
      + '<text x="50%" y="50%" font-family="sans-serif" font-size="48" fill="#5f5848" text-anchor="middle" dominant-baseline="middle">clip: '
      + name.replace(/[<&>"]/g, '') + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function url(name, i) {
    const m = MAN[name];
    if (!m) return plate(name);
    if (!Number.isInteger(m.frames) || m.frames < 1 || !Number.isFinite(m.fps) || m.fps <= 0) throw new Error('media: invalid manifest for ' + name);
    const n = Math.max(1, Math.min(m.frames, i + 1));
    return m.dir + '/' + String(n).padStart(5, '0') + '.jpg';
  }
  function show(img, name, i) {
    const u = url(name, i);
    if (img._u === u) return;
    img._u = u;
    failed.delete(img);
    img.src = u;
    const p = (img.decode ? img.decode() : Promise.resolve()).catch(() => {
      if (img._u === u) failed.set(img, u);
    }).then(() => pending.delete(p));
    pending.add(p);
  }
  /** run clip `name` in `img` from scene time o.at; o.from skips that many seconds into the clip */
  function play(S, img, name, o = {}) {
    const fps = MAN[name] ? MAN[name].fps : 30, from = o.from || 0;
    show(img, name, Math.floor(from * fps));                     // the poster frame, before anything plays
    if (!MAN[name]) return;                                      // a plate does not move
    S.call((p, lt) => show(img, name, Math.floor((Math.max(0, lt) + from) * fps + 1e-6)), { at: o.at || 0, dur: o.dur || 600 });
  }
  /** seconds the clip lasts after o.from (0 for a clip that is not on this machine) */
  const length = (name, from = 0) => (MAN[name] ? Math.max(0, MAN[name].frames / MAN[name].fps - from) : 0);

  async function settle() {
    while (pending.size) await Promise.all(Array.from(pending));
    if (failed.size) throw new Error('media: could not decode ' + [...failed.values()].join(', '));
  }
  window.OXMEDIA = { manifest: MAN, url, show, play, length, settle };
})();
