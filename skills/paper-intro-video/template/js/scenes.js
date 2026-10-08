/* scenes.js — what happens in this film: the data-driven DOM, and every animation on the timeline.
 *
 * window.OXBUILD() is called once by js/lib/player.js, after the web fonts have loaded and while every
 * scene is laid out, so hand-drawn marks and arrows can be measured. It returns the timeline.
 *
 * The contract of a performed explainer: every narrated phrase is acted out on its words, something
 * meaningful moves every second, and the camera never parks (node tools/stillness.mjs measures it).
 *
 * Times are seconds from the scene start, on the plan's clock (js/lib/build.js, "Two clocks"):
 *   c.<cue>                       when a narration line starts
 *   S.w('<cue>', 'word', 1.2)     when a word of that line is said (1.2 = fallback offset while there is no voice)
 *   S.said('<cue>', 4.0)          when the line has been said
 * Use S.w for whatever belongs to a word — an item of a list, a number — and plain offsets in between.
 * S.sfx(kind, at, {…}) declares a sound next to its picture: whoosh | pen | pop | bell | low | type.
 */
(function () {
  'use strict';

  window.OXBUILD = function () {
    const ST = window.OXSTAGE();
    const { tl, stage, $, $$, el, T, boxIn, splitDeep, layout, scene, camera, words, chapter, draw, mark, jot, counter, MK } = ST;
    const D = window.OXDATA;

    /* ══════════════ 1 · DOM that comes from data ══════════════ */
    D.ticks.plan.forEach((p, i) => {
      for (const id of ['#track-plan', '#track-film']) {
        const tick = el('i');
        tick.style.setProperty('--a', p);                    // where the plan has the word …
        tick.style.setProperty('--b', id === '#track-film' ? D.ticks.voice[i] : p);   // … and where the voice puts it
        $(id).appendChild(tick);
      }
    });

    /* ══════════════ 2 · stations, icons, words, marks, arrows ══════════════ */
    // layout(scene id, [[station name, [selectors of the scene's children that live there], dark?], …], [selectors that stay put])
    const L = {
      title: layout('s-title', [['card', []]], []),
      how: layout('s-how', [['steps', ['.steps', '#how-ink', '.how-note', '.clocks']], ['rule', ['.rule-card']]]),
      end: layout('s-end', [['card', []]], []),
    };
    window.OXICON.hydrate(document);                         // <i data-ph="name" data-w="light"> → the icon
    $$('[data-split], .sec-title').forEach(splitDeep);       // statements become words that can rise one by one
    MK.prepare(stage);                                       // measure every .mk and build its pen strokes
    // free-standing ink is measured here too, once everything has its final box
    const steps = $$('.step'), sb = steps.map((n) => boxIn(n, L.how.at('steps')));
    const arrows = sb.slice(0, -1).map((b, i) => MK.arrow($('#how-ink'), [b.r + 18, b.y + 70], [sb[i + 1].x - 18, b.y + 70], { color: 'ink', width: 3.5, head: 22, bend: -10 }));

    /* ══════════════ 3 · HUD, captions ══════════════ */
    ST.hud();                                                // the chapter bar; comes in with the first chapter
    ST.captions({ dark: [[0, T('s-how').start - 0.5], [T('s-end').start - 0.5, Infinity]] });   // where the ground is a dark card

    /* ═════════════════ S1 · TITLE ═════════════════ */
    {
      const S = scene('s-title'), c = S.c;
      camera(S, L.title, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.006 }]);     // one key: it still pushes in
      // t = 0 is already a frame somebody may see as the thumbnail: the kicker is simply there
      words(S, S.$('.tt-h'), c.open - 0.35, { stagger: 0.12 });
      mark(S, '.tt-h .mk', S.w('open', 'page.', 1.3));
      S.rise('.tt-sub', { at: S.w('open', 'Every', 2.3) - 0.15, dist: 14, dur: 0.5 });
      S.sfx('bell', c.open + 0.1, { g: 0.5 });
    }

    /* ═════════════════ S2 · HOW IT WORKS ═════════════════ */
    {
      const S = scene('s-how'), c = S.c, lay = L.how;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.8 });           // the headline opens centred, then settles top-left
      camera(S, lay, [
        { at: 0, k: 'steps', x: 960, y: 540, s: 1.0 },
        { at: c.follow - 0.5, k: 'steps', x: 960, y: 590, s: 1.04, dur: 1.1 },    // lean toward the two tracks (a key must never push a figure into the headline or off the frame: check with tools/sheet.mjs)
        { at: c.rule - 0.55, k: 'rule', x: 960, y: 540, s: 1.0 },                 // travel to the next station
        { at: S.w('rule', '12', 2.2) - 0.4, k: 'rule', x: 700, y: 540, s: 1.12, dur: 1.0 },   // close on the number
      ]);

      // three steps, each on the word that names it
      [['words.', 1.1], ['voice.', 2.6], ['pictures,', 3.9]].forEach(([word, fb], i) => {
        const tt = S.w('steps', word, fb) - 0.3;
        S.fromTo(steps[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: tt, dur: 0.5 });
        S.fromTo(steps[i].querySelector('.ph'), { rotate: -40, scale: 0.5 }, { rotate: 0, scale: 1 }, { at: tt, dur: 0.6, ease: 'outBack' });
        S.sfx('pop', tt, { n: i, g: 0.5, pan: -0.4 + i * 0.4 });
        if (i) draw(S, arrows[i - 1], tt - 0.3, 0.4, { quiet: true });
      });
      jot(S, '.how-note', S.w('steps', 'timed', 4.7) + 0.1, { rot: -4 });

      // the plan, and a voice that says the same words at its own pace: the ticks slide, nothing else changes
      S.fromTo('.clocks', { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: c.follow - 0.2, dur: 0.5 });
      S.fromTo('#track-film', { '--k': 0 }, { '--k': 1 }, { at: S.w('follow', 'voice,', 0.9), dur: 1.1, ease: 'inOutCubic' });
      S.sfx('type', S.w('follow', 'voice,', 0.9), { dur: 1.0, n: 7, g: 0.4 });
      S.to('#track-film', { '--k': 0 }, { at: S.said('follow', 4.0) + 0.3, dur: 0.8, ease: 'inOutCubic' });

      // the rule of thumb, with the number counting up on its word
      const tN = S.w('rule', '12', 2.2) - 0.2;
      words(S, S.$('.rule-h'), c.rule + 0.05, { stagger: 0.11 });
      mark(S, '.rule-h .mk', S.w('rule', 'screen.', 1.0) + 0.1);
      S.fromTo('.rule-card .hero', { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: tN, dur: 0.5 });
      counter(S, S.$('#rule-n'), D.rule.words, tN, 0.9, (v) => String(Math.round(v)));
      S.sfx('low', tN + 0.1, { g: 0.5 });
    }

    /* ═════════════════ S3 · END CARD ═════════════════ */
    {
      const S = scene('s-end'), c = S.c;
      camera(S, L.end, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.004 }]);
      // the sentence comes up word by word as it is spoken (S.ws = when each word is said), then the rest
      const said = S.ws('yours'), tSaid = S.said('yours', 3.0);
      words(S, S.$('.end-h'), said ? said.map((x) => x - 0.08) : c.yours + 0.1, { stagger: 0.35, dur: 0.6 });
      S.rise('.end-files', { at: tSaid + 0.3, dist: 14, dur: 0.5 });
      S.sfx('bell', tSaid - 0.2, { g: 0.7 });
    }

    return tl;
  };
})();
