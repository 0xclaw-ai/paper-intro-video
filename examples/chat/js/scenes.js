/* scenes.js — what happens in the CHAT film, on which word (js/script.js has the words, js/data.js the numbers).
 *
 * window.OXBUILD() is called once by js/lib/player.js after the fonts have loaded, with every scene laid out.
 * Times are seconds from the scene start on the plan's clock: c.<cue> is when a line starts,
 * S.w('<cue>', 'word', fb) when a word is said, S.said('<cue>', fb) when the line is over.
 * Clips (js/media.js) run in film time from the moment they are started.
 * Contract (the skill's): every narrated phrase is acted out on its words, something meaningful moves every
 * second, the camera never parks. Nothing here animates by itself: the timeline owns every frame.
 */
(function () {
  'use strict';

  window.OXBUILD = function () {
    const ST = window.OXSTAGE();
    const { tl, stage, $, $$, el, T, splitDeep, layout, scene, camera, words, chapter, draw, mark, counter, MK } = ST;
    const D = window.OXDATA, M = window.OXMEDIA;
    const fmt = (d) => (v) => Number(v.toFixed(d)).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

    /* ══════════════ 1 · DOM that comes from data ══════════════ */
    D.authors.forEach(([name, a]) => $('#tt-authors').appendChild(el('span', 'au', `${name}<sup>${a}</sup>`)));
    D.affiliations.forEach((name, i) => $('#tt-affils').appendChild(el('span', 'af', `<sup>${i + 1}</sup> ${name}`)));
    // the script: who speaks when (shape only; the generated dialogue's words are not shown, so none are invented)
    [['A', 330], ['B', 250], ['A', 380], ['B', 290], ['A', 220], ['B', 340]].forEach(([s, w]) =>
      $('#script-lines').appendChild(el('div', 'ln', `<span>${s}</span><i style="width:${w}px"></i>`)));
    D.table1.metrics.forEach(([m, better, v, rank]) => {
      const unit = /^FR/.test(m) ? ' ×10<sup>−2</sup>' : '';        // the paper reports FRCorr and FRDiv in units of 1e-2
      const t = el('div', 'tile', `<p class="m">${m}<small>${better === 'lower' ? '↓' : '↑'}${unit}</small></p><p class="v" data-v="${v}">${v}</p>` +
        `<span class="tag rank ${rank === 1 ? 'first' : 'ghost'}">${rank === 1 ? '1st' : '2nd'}</span>`);
      t.dataset.rank = rank;
      $('#tiles').appendChild(t);
    });
    D.study.aspects.forEach(([n, v]) => {
      const r = el('div', 'r', `<span class="n">${n}</span><span class="track"><b></b></span><span class="val">${v}</span>`);
      r.querySelector('.track').style.setProperty('--v', v);
      $('#bars').appendChild(r);
    });
    $('#bars').appendChild(el('p', 'scale', 'mean opinion score, out of 5'));
    [['#dn-1', D.downstream.PerFRDiff], ['#dn-2', D.downstream.ReactDiff]].forEach(([id, [a, b]]) => {
      const tr = $(id + ' .track');
      tr.style.setProperty('--a', a); tr.style.setProperty('--b', b);
      $(id + ' .val').innerHTML = `${a}<i data-ph="arrow-right" data-w="regular"></i><b>${b}</b>`;
    });
    $('#dn-foot').textContent = 'Fine-tuned and tested on REACT 2024. ' + D.downstream.caveat;
    D.table1 && ['cafe', 'hallway', 'office', 'studio', 'living', 'quiet', 'backyard', 'festival'].forEach((n) =>
      $('#wall').appendChild(el('div', 't', `<img class="clip" data-clip="tile_${n}" alt="" />`)));

    /* ══════════════ 2 · stations, icons, words, marks ══════════════ */
    const L = {
      open: layout('s-open', [['main', ['.pf', '#open-ink', '.open-row', '.open-note'], true]], []),
      title: layout('s-title', [['main', [], true]], []),
      need: layout('s-need', [['need', ['.need-row']], ['cost', ['.cost-col', '.so-small']]]),
      fence: layout('s-fence', [['fence', ['.sec-head', '.fence']], ['task', ['.task']]], []),
      pipe: layout('s-pipe', [['main', ['.stages']]]),
      listen: layout('s-listen', [['ask', ['.ask', '.answer']], ['demo', ['#listen-win', '#listen-win-b', '#listen-ink', '.listen-notes', '#seg-strip', '#demo-b-label']]], []),
      audio: layout('s-audio', [['main', ['.mu']]]),
      results: layout('s-results', [['tiles', ['.vs', '.tiles']], ['study', ['.study']]]),
      surprise: layout('s-surprise', [['main', ['.race', '.viewers']]]),
      styles: layout('s-styles', [['main', ['#styles-win', '.styles-label']]]),
      data: layout('s-data', [['nums', ['.ds-name', '.ds-nums']], ['down', ['.down']]], []),
      release: layout('s-release', [['main', [], true]], []),
      end: layout('s-end', [['main', [], true]], []),
    };
    window.OXICON.hydrate(document);
    $$('[data-split], .sec-title').forEach(splitDeep);
    MK.prepare(stage);

    // free-standing ink, measured once everything has its final box: exact strokes (window.OXCLEAN), solid colours
    // only, so a shaft and its chevron never overlap as two layers of a translucent colour
    const inkOpen = [[384, 455], [960, 455], [1536, 455]].map((b, i) => MK.arrow($('#open-ink'), [960 + (i - 1) * 40, 318], b, { color: '#A9AFC0', width: 2.5, head: 12, bend: (i - 1) * -30 }));
    const inkNeed = MK.arrow($('#need-ink'), [884, 205], [600, 205], { color: 'blue', width: 3, head: 14, bend: 0 });
    const inkPipe = [MK.arrow($('#pipe-ink'), [516, 190], [574, 190], { color: 'ink-3', width: 3, head: 12, bend: 0 }),
      MK.arrow($('#pipe-ink'), [1106, 190], [1164, 190], { color: 'ink-3', width: 3, head: 12, bend: 0 })];
    const inkCircle = MK.circle($('#listen-ink'), 424, 450, 540, { color: 'blue', width: 4, squash: 1.0 });
    const inkPartner = [MK.arrow($('#listen-ink'), [960, 300], [530, 300], { color: 'blue', width: 4, head: 16, bend: -46 }),
      MK.arrow($('#listen-ink'), [530, 610], [960, 610], { color: 'blue', width: 4, head: 16, bend: -46 })];

    /* ══════════════ 3 · HUD, captions ══════════════ */
    ST.hud({ from: T('s-need').start + 0.3, until: T('s-release').start - 0.45 });
    ST.captions({ dark: [[0, T('s-need').start - 0.25], [T('s-release').start - 0.25, Infinity]] });

    /* ═════════════════ COLD OPEN ═════════════════ */
    {
      const S = scene('s-open'), c = S.c;
      camera(S, L.open, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.004 }, { at: S.w('promise', 'two-person', 2.6) - 0.4, x: 960, y: 560, s: 1.05, dur: 1.6 }]);
      // the first frame is already composed: the empty prompt field, a caret waiting
      const caret = $('#open-caret');
      S.call((p, lt) => { const on = lt < 0.3 || (lt > 2.7 && Math.floor(lt * 2.2) % 2 === 1) ? 0.15 : 1; if (caret._o !== on) { caret.style.opacity = on; caret._o = on; } }, { at: 0, dur: c.out + 0.5 });
      const typed = S.type('#open-typed', D.prompt, { at: 0.3, dur: 2.4 });
      S.sfx('type', 0.3, { dur: typed, n: 26, g: 0.35 });
      S.fromTo('#open-enter', { scale: 1, opacity: 0.55 }, { scale: 0.86, opacity: 1 }, { at: S.w('input', 'in.', 1.0) - 0.1, dur: 0.12, ease: 'outQuad' });
      S.to('#open-enter', { scale: 1 }, { at: S.w('input', 'in.', 1.0) + 0.05, dur: 0.25, ease: 'outBack' });
      S.sfx('pop', S.w('input', 'in.', 1.0), { n: 2, g: 0.45 });
      // three different conversations come out of the one sentence: once sent, the prompt rises out of the way,
      // and only when it has settled do the arrows leave it (none may cross the field while it moves)
      const tOut = Math.min(S.w('input', 'in.', 1.0) + 0.45, S.w('out', 'three', 0.4) - 1.0);
      S.to('#open-field', { y: -258, scale: 0.78 }, { at: tOut, dur: 0.85, ease: 'inOutCubic' });
      S.to('#open-caret', { opacity: 0 }, { at: tOut, dur: 0.2 });
      [['#open-a', 'pairA', 'three'], ['#open-b', 'pairB', 'different'], ['#open-c', 'pairC1', 'conversations.']].forEach(([id, clip, word], i) => {
        const tt = S.w('out', word, 0.8 + i * 0.5) - 0.15;
        draw(S, inkOpen[i], Math.max(tt - 0.35, tOut + 0.9), 0.4, { quiet: true });
        S.fromTo(id, { opacity: 0, y: 70, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, { at: tt, dur: 0.75, ease: 'outCubic' });
        M.play(S, $(id + ' img'), clip, { at: tt });
        S.sfx('pop', tt, { n: i, g: 0.4, pan: -0.5 + i * 0.5 });
      });
      S.rise('.open-note', { at: S.w('out', 'speak,', 3.4) - 0.2, dist: 16, dur: 0.6 });
      // … each of them one conversation between two people: the middle one comes forward
      const tFocus = S.w('promise', 'two-person', 2.6) - 0.2;
      S.to('#open-a, #open-c', { opacity: 0.32 }, { at: tFocus, dur: 0.6 });
      S.to('#open-b', { scale: 1.07 }, { at: tFocus, dur: 0.8, ease: 'inOutCubic' });
      S.to('#open-ink', { opacity: 0 }, { at: tFocus, dur: 0.5 });
    }

    /* ═════════════════ TITLE ═════════════════ */
    {
      const S = scene('s-title'), c = S.c;
      camera(S, L.title, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.005 }]);
      S.rise('.tt-brand', { at: 0.05, dist: 18, dur: 0.6 });
      S.rise('.tt-eccv', { at: 0.2, dist: 18, dur: 0.6 });
      words(S, S.$('.tt-h'), c.name + 0.05, { stagger: 0.06 });
      S.rise('.tt-venue', { at: S.w('name', '2026.', 1.6) - 0.1, dist: 14, dur: 0.5 });
      const sw = S.ws('slogan');
      words(S, S.$('.tt-slogan'), sw ? sw.map((x) => x - 0.08) : c.slogan + 0.1, { stagger: 0.24, dur: 0.6 });
      S.sfx('bell', c.slogan + 0.05, { g: 0.45 });
      S.fromTo('.tt-authors .au', { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { at: c.slogan + 0.3, dur: 0.45, stagger: 0.05 });
      S.fromTo('.tt-affils .af', { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, { at: c.slogan + 1.0, dur: 0.4, stagger: 0.05 });
    }

    /* ═════════════════ WHY IT MATTERS ═════════════════ */
    {
      const S = scene('s-need'), c = S.c, lay = L.need;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.5 });
      // the recordings stay in view while "collecting them" is said; the page turns to the costs just before "slow"
      camera(S, lay, [{ at: 0, k: 'need', x: 960, y: 540, s: 1.0 }, { at: S.w('cost', 'slow,', 0.9) - 0.95, k: 'cost', x: 960, y: 540, s: 1.0 }]);
      S.rise('#need-agent', { at: Math.max(S.w('need', 'Virtual', 0.1) - 0.15, 1.3), dist: 30, dur: 0.6 });
      S.rise('#need-human', { at: Math.max(S.w('need', 'digital', 1.0) - 0.15, 1.6), dist: 30, dur: 0.6 });
      // the data arrives first (on "data"), then it flows to the learners; the recording fills on "recordings"
      const tCard = S.w('need', 'data:', 3.2) - 0.35, tRec = S.w('need', 'recordings', 3.6) - 0.1;
      S.fromTo('#need-rec', { opacity: 0, x: 60 }, { opacity: 1, x: 0 }, { at: tCard, dur: 0.6 });
      draw(S, inkNeed, tCard + 0.5, 0.5, { quiet: true });
      $$('#need-rec .lane b').forEach((b, i) => S.fromTo(b, { scaleX: 0 }, { scaleX: 1 }, { at: tRec + i * 0.35, dur: 0.6, ease: 'outCubic' }));
      $$('#need-rec .lane b').forEach((b) => (b.style.transformOrigin = '0 50%'));
      S.call((p, lt) => { const d = $('#need-rec .dot'), o = Math.floor(lt * 1.6) % 2 ? 0.25 : 1; if (d._o !== o) { d.style.opacity = o; d._o = o; } }, { at: tCard, dur: 8 });
      // slow, costly, ethically sensitive … so the datasets stay small
      [['#cost-1', 'slow,'], ['#cost-2', 'costly'], ['#cost-3', 'ethically']].forEach(([id, w], i) => words(S, $(id), S.w('cost', w, 0.9 + i * 0.6) - 0.12, { stagger: 0.05 }));
      mark(S, '#cost-3 .mk', S.w('cost', 'sensitive,', 2.6) + 0.15);
      words(S, $('#so-small'), S.w('cost', 'so', 3.4) - 0.1, { stagger: 0.07 });
      mark(S, '#so-small .mk', S.w('cost', 'small.', 4.4) + 0.05);
      S.sfx('low', S.w('cost', 'small.', 4.4) - 0.1, { g: 0.4 });
    }

    /* ═════════════════ WHAT OTHERS NEED ═════════════════ */
    {
      const S = scene('s-fence'), c = S.c, lay = L.fence;
      chapter(S, lay.at('fence').querySelector('.sec-head'), { hold: 0.8 });
      // the table stays in view while "we call this task" is said; the camera arrives as the acronym does
      camera(S, lay, [{ at: 0, k: 'fence', x: 960, y: 540, s: 1.0 }, { at: S.w('task', 'DIADG:', 1.0) - 0.95, k: 'task', x: 960, y: 540, s: 1.0 }]);
      [['#f1', 'face'], ['#f2', 'speaker'], ['#f3', 'conversation']].forEach(([id, w], i) => {
        const tt = S.w('fence', w, 2.6 + i * 1.6) - 0.35;
        S.fromTo(id + ' .what', { opacity: 0, x: -24 }, { opacity: 1, x: 0 }, { at: tt, dur: 0.5 });
        S.fromTo(id + ' .needs', { opacity: 0, x: 24 }, { opacity: 1, x: 0 }, { at: tt + 0.15, dur: 0.5 });
        S.sfx('pop', tt + 0.15, { n: i, g: 0.35 });
      });
      const tOurs = S.w('only', 'CHAT', 0.05) - 0.2;
      S.to('#f1, #f2, #f3', { opacity: 0.4 }, { at: tOurs, dur: 0.5 });
      S.fromTo('#f4 .what', { opacity: 0, x: -24 }, { opacity: 1, x: 0 }, { at: tOurs, dur: 0.5 });
      S.fromTo('#f4 .needs', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { at: S.w('only', 'text', 1.0) - 0.15, dur: 0.55, ease: 'outBack' });
      S.sfx('bell', S.w('only', 'text', 1.0), { g: 0.45 });
      // the task, in the paper's own notation
      const tAcr = S.w('task', 'DIADG:', 1.0) - 0.25;
      S.fromTo('#task-acr span', { opacity: 0, y: 60 }, { opacity: 1, y: 0 }, { at: tAcr, dur: 0.6, stagger: 0.07, ease: 'outExpo' });
      S.fromTo('#task-full', { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { at: tAcr + 0.6, dur: 0.5 });
      S.fromTo('#task-eq', { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: S.w('task', 'prompt,', 2.4) - 0.2, dur: 0.6 });
      S.fromTo('#task-eq .legend > *', { opacity: 0 }, { opacity: 1 }, { at: S.w('task', 'generate', 2.9), dur: 0.4, stagger: 0.12 });
      S.to('#task-acr span:nth-child(3)', { color: '#0071E3' }, { at: S.w('task', 'respond', 5.4), dur: 0.4 });
    }

    /* ═════════════════ THREE STAGES ═════════════════ */
    {
      const S = scene('s-pipe'), c = S.c, lay = L.pipe;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.55 });
      camera(S, lay, [{ at: 0, x: 960, y: 560, s: 1.0 },
        { at: S.w('text', 'First,', 0.1) - 0.3, x: 925, y: 565, s: 1.02, dur: 1.2 },
        { at: S.w('voice', 'Next,', 0.1) - 0.3, x: 960, y: 565, s: 1.02, dur: 1.2 },
        { at: S.w('faces', 'Last,', 0.1) - 0.3, x: 995, y: 565, s: 1.02, dur: 1.2 }]);
      S.fromTo('#st-1, #st-2, #st-3', { opacity: 0, y: 50 }, { opacity: 0.35, y: 0 }, { at: Math.max(c.stages + 0.2, 1.35), dur: 0.6, stagger: 0.12 });
      // the baton: one frame handed from stage to stage, on the word that names it
      const t1 = S.w('text', 'First,', 0.1) - 0.15, t2 = S.w('voice', 'Next,', 0.1) - 0.15, t3 = S.w('faces', 'Last,', 0.1) - 0.15;
      S.fromTo('#baton', { opacity: 0, x: 0, scale: 0.97 }, { opacity: 1, x: 0, scale: 1 }, { at: t1, dur: 0.45 });
      S.to('#baton', { x: 590 }, { at: t2, dur: 0.7, ease: 'inOutCubic' });
      S.to('#baton', { x: 1180 }, { at: t3, dur: 0.7, ease: 'inOutCubic' });
      S.to('#st-1', { opacity: 1 }, { at: t1, dur: 0.4 });
      S.to('#st-2', { opacity: 1 }, { at: t2, dur: 0.4 });
      S.to('#st-3', { opacity: 1 }, { at: t3, dur: 0.4 });
      draw(S, inkPipe[0], t2 - 0.1, 0.35, { quiet: true });
      draw(S, inkPipe[1], t3 - 0.1, 0.35, { quiet: true });
      [t1, t2, t3].forEach((tt, i) => S.sfx('pop', tt, { n: i + 1, g: 0.35 }));
      // stage 1: a script of alternating turns, and a description of each speaker
      const lines = $$('#script-lines .ln i');
      lines.forEach((b) => (b.style.transformOrigin = '0 50%'));
      S.fromTo(lines, { scaleX: 0 }, { scaleX: 1 }, { at: S.w('text', 'dialogue,', 1.6) - 0.2, dur: 0.45, stagger: 0.12 });
      S.fromTo('#st-1 .id-txt span', { opacity: 0, x: -12 }, { opacity: 1, x: 0 }, { at: S.w('text', 'describes', 4.0) - 0.15, dur: 0.4, stagger: 0.3 });
      S.fromTo('#st-1 .turns-note', { opacity: 0 }, { opacity: 1 }, { at: S.w('text', 'turns,', 3.0) - 0.1, dur: 0.4 });
      // stage 2: two voices placed on one shared timeline
      const segs = $$('#st-2 .lane b');
      segs.forEach((b) => (b.style.transformOrigin = '0 50%'));
      S.fromTo(segs, { scaleX: 0 }, { scaleX: 1 }, { at: S.w('voice', 'speech:', 1.3) - 0.1, dur: 0.4, stagger: 0.18 });
      S.fromTo('#st-2 .axis', { scaleX: 0 }, { scaleX: 1 }, { at: S.w('voice', 'shared', 2.9) - 0.2, dur: 0.7, ease: 'inOutCubic' });
      $('#st-2 .axis').style.transformOrigin = '0 50%';
      S.fromTo('#st-2 .axis-note', { opacity: 0 }, { opacity: 1 }, { at: S.w('voice', 'timeline.', 3.4), dur: 0.4 });
      // stage 3: the two faces, generated and moving
      M.play(S, $('#pipe-faces'), 'pairB', { at: t3 + 0.2, from: 1.0 });
      S.fromTo('#st-3 .faces2', { opacity: 0.25, scale: 0.97 }, { opacity: 1, scale: 1 }, { at: S.w('faces', 'generated,', 1.4) - 0.2, dur: 0.6 });
      S.fromTo('#st-3 .note', { opacity: 0 }, { opacity: 1 }, { at: S.w('faces', 'refined', 2.3) - 0.1, dur: 0.4 });
    }

    /* ═════════════════ THE LISTENER ═════════════════ */
    {
      const S = scene('s-listen'), c = S.c, lay = L.listen;
      const tDemo = S.said('seams', 3.6) + 0.35;
      camera(S, lay, [{ at: 0, k: 'ask', x: 960, y: 540, s: 1.0, push: 0.006 },
        { at: c.silent - 0.6, k: 'demo', x: 960, y: 540, s: 1.0 },
        { at: tDemo - 0.2, k: 'demo', x: 930, y: 500, s: 1.02, dur: 1.4 }]);
      // the question, a real pause, the answer
      words(S, $('#ask-h'), c.ask + 0.02, { stagger: 0.06 });
      S.to('#ask-h', { opacity: 0, y: -60 }, { at: c.answer - 0.55, dur: 0.38, ease: 'inQuad' });   // gone before the answer arrives: no double exposure
      words(S, $('#answer-h'), S.w('answer', 'Listening.', 0.05) - 0.12, { stagger: 0.05 });
      mark(S, '#answer-h .mk', S.w('answer', 'Listening.', 0.05) + 0.55);
      S.rise('#answer-sub', { at: S.w('answer', 'And', 1.0) - 0.15, dist: 18, dur: 0.55 });
      // a generated pair: the woman on the left listens for most of this stretch, and still behaves
      S.fromTo('#listen-win', { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1 }, { at: c.silent - 0.3, dur: 0.7 });
      M.play(S, $('#listen-win img'), 'pairD', { at: c.silent - 0.3, from: 2.0 });
      draw(S, inkCircle, S.w('silent', 'listener’s', 1.6) - 0.1, 0.7);
      S.rise('#ln-1', { at: S.w('silent', 'generates', 0.9) - 0.2, dist: 20, dur: 0.55 });
      S.rise('#ln-2', { at: S.w('partner', 'partner,', 2.0) - 0.25, dist: 20, dur: 0.55 });
      S.to(inkCircle, { opacity: 0 }, { at: S.w('partner', 'partner,', 2.0) - 0.3, dur: 0.35 });      // the ring gives way to the exchange
      draw(S, inkPartner[0], S.w('partner', 'partner,', 2.0) - 0.05, 0.45, { quiet: true });
      draw(S, inkPartner[1], S.w('partner', 'answer', 3.6) - 0.1, 0.45);
      S.rise('#ln-3', { at: S.w('seams', 'blends', 1.0) - 0.25, dist: 20, dur: 0.55 });
      S.fromTo('#seg-strip', { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { at: S.w('seams', 'seams', 1.6) - 0.3, dur: 0.5 });
      S.fromTo('#seg-strip .blend', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { at: S.w('seams', 'between', 2.2) - 0.1, dur: 0.45, stagger: 0.12, ease: 'outBack' });
      // then the generated dialogue itself, heard with its own sound (tools/demo_audio.py places it at this mark)
      S.mark('demoB', tDemo);
      S.to('#listen-ink, .listen-notes, #seg-strip', { opacity: 0 }, { at: tDemo - 0.4, dur: 0.4 });
      S.fromTo('#listen-win-b', { opacity: 0 }, { opacity: 1 }, { at: tDemo - 0.25, dur: 0.25 });
      M.play(S, $('#listen-win-b img'), 'pairB', { at: tDemo, from: 7.6 });
      S.rise('#demo-b-label', { at: tDemo + 0.2, dist: 18, dur: 0.6 });
    }

    /* ═════════════════ MARKING UP THE SCRIPT ═════════════════ */
    {
      const S = scene('s-audio'), c = S.c, lay = L.audio;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.5 });
      camera(S, lay, [{ at: 0, x: 960, y: 560, s: 1.0 }, { at: c.why - 0.4, x: 1010, y: 560, s: 1.03, dur: 1.2 }]);
      S.fromTo('#mu-sheet', { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: Math.max(c.markup + 0.2, 1.3), dur: 0.6 });
      const bars = $$('#mu-sheet .row i');
      bars.forEach((b) => (b.style.transformOrigin = '0 50%'));
      S.fromTo(bars, { scaleX: 0 }, { scaleX: 1 }, { at: Math.max(c.markup + 0.5, 1.6), dur: 0.45, stagger: 0.1 });
      // a reading bar steps down the script while it is marked up, landing on each row as its mark arrives
      const ROW = [104, 196, 288, 380], t0 = Math.max(c.markup + 0.2, 1.3) + 0.9;
      S.fromTo('#mu-scan', { opacity: 0, y: ROW[0] - 2 }, { opacity: 1, y: ROW[0] - 2 }, { at: t0, dur: 0.3 });
      [1, 2, 3, 0].forEach((r, i) => S.to('#mu-scan', { y: ROW[r] - 2 }, { at: t0 + 0.75 * (i + 1), dur: 0.4, ease: 'inOutCubic' }));
      S.to('#mu-scan', { y: ROW[1] - 2 }, { at: S.w('marks', 'uh-huh', 0.9) - 0.45, dur: 0.35, ease: 'inOutCubic' });
      [0, 2, 3].forEach((r, i) => S.to('#mu-scan', { y: ROW[r] - 2 }, { at: S.w('marks', 'emotion', 1.6) - 0.35 + i * 0.55, dur: 0.3, ease: 'inOutCubic' }));
      S.to('#mu-scan', { opacity: 0 }, { at: S.w('marks', 'timing,', 3.4) - 0.2, dur: 0.3 });
      // the four kinds of mark-up, each on its word
      S.fromTo('#mu-bc', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { at: S.w('marks', 'uh-huh', 0.9) - 0.15, dur: 0.5, ease: 'outBack' });
      S.fromTo('#mu-e1, #mu-e2, #mu-e3', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1 }, { at: S.w('marks', 'emotion', 1.6) - 0.15, dur: 0.45, stagger: 0.55, ease: 'outBack' });
      S.fromTo('#mu-ticks > *', { opacity: 0, y: -8 }, { opacity: 1, y: 0 }, { at: S.w('marks', 'timing,', 3.4) - 0.15, dur: 0.35, stagger: 0.08 });
      S.fromTo('#mu-room', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1 }, { at: S.w('marks', 'environment.', 5.6) - 0.3, dur: 0.5, ease: 'outBack' });
      ['uh-huh', 'emotion', 'timing,', 'environment.'].forEach((w, i) => S.sfx('pop', S.w('marks', w, 1 + i) - 0.1, { n: i, g: 0.3 }));
      // why: the listener answers in a short overlap, without taking the turn
      S.fromTo('#mu-tl', { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: c.why - 0.2, dur: 0.6 });
      const ab = $('#mu-tl .lane.a b');
      ab.style.transformOrigin = '0 50%';
      S.fromTo(ab, { scaleX: 0 }, { scaleX: 1 }, { at: c.why + 0.1, dur: 1.6, ease: 'linear' });
      S.fromTo('#mu-bub', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { at: S.w('why', 'react', 1.6) - 0.1, dur: 0.5, ease: 'outBack' });
      S.rise('#mu-tl .cap', { at: S.w('why', 'without', 2.4) - 0.1, dist: 14, dur: 0.5 });
    }

    /* ═════════════════ RESULTS ═════════════════ */
    {
      const S = scene('s-results'), c = S.c, lay = L.results;
      chapter(S, lay.chrome.querySelector('.sec-head'), { at: c.does - 0.1, hold: 0.7 });
      camera(S, lay, [{ at: 0, k: 'tiles', x: 960, y: 540, s: 1.0 }, { at: c.people - 0.5, k: 'study', x: 960, y: 540, s: 1.0 }]);
      S.rise('#vs', { at: S.w('metrics', 'five', 0.6) - 0.2, dist: 12, dur: 0.5 });
      const tiles = $$('#tiles .tile');
      S.fromTo(tiles, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: S.w('metrics', 'related', 1.6) - 0.2, dur: 0.5, stagger: 0.07 });
      const first = tiles.filter((t) => t.dataset.rank === '1').map((t) => t.querySelector('.rank'));
      const second = tiles.filter((t) => t.dataset.rank === '2').map((t) => t.querySelector('.rank'));
      S.fromTo(first, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }, { at: S.w('metrics', 'six', 3.4) - 0.1, dur: 0.45, stagger: 0.08, ease: 'outBack' });
      S.fromTo(second, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }, { at: S.w('metrics', 'second', 5.4) - 0.1, dur: 0.45, stagger: 0.1, ease: 'outBack' });
      S.sfx('bell', S.w('metrics', 'six', 3.4), { g: 0.4 });
      // sixty people, five aspects
      // the number and its label arrive as the count starts (no "0 participants" before it)
      const tSixty = S.w('people', 'Sixty', 0.05) - 0.1;
      S.fromTo('.study .hero', { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { at: tSixty - 0.05, dur: 0.35 });
      counter(S, $('#study-n'), D.study.participants, tSixty, 0.9, (v) => String(Math.round(v)));
      $$('#bars .r').forEach((r, i) => {
        const tt = S.w('people', 'highest', 3.0) - 0.2 + i * 0.12;
        S.fromTo(r, { opacity: 0 }, { opacity: 1 }, { at: tt - 0.2, dur: 0.3 });
        S.fromTo(r.querySelector('.track'), { '--k': 0 }, { '--k': 1 }, { at: tt, dur: 0.8, ease: 'outCubic' });
      });
      S.fromTo('#bars .scale', { opacity: 0 }, { opacity: 1 }, { at: S.w('people', 'aspects.', 3.8), dur: 0.4 });
    }

    /* ═════════════════ REMOVE ONE MODULE ═════════════════ */
    {
      const S = scene('s-surprise'), c = S.c, lay = L.surprise;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.4 });
      camera(S, lay, [{ at: 0, x: 960, y: 540, s: 1.0 }, { at: c.viewers - 0.3, x: 960, y: 560, s: 1.02, dur: 1.2 }]);   // a small push: the bars stay clear of the headline
      const full = Number(D.ablation.full), cut = Number(D.ablation.noRFBG);
      $('#race-full .track').style.setProperty('--v', full);
      $('#race-cut .track').style.setProperty('--v', cut);
      const tRace = Math.max(S.w('remove', 'partner', 1.0) - 0.2, 1.35), speed = 1.8 / full;     // same speed: the short one simply stops
      S.fromTo('#race-full, #race-cut', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, { at: Math.max(c.remove - 0.1, 1.1), dur: 0.5, stagger: 0.12 });
      S.fromTo('#race-full .track', { '--k': 0 }, { '--k': 1 }, { at: tRace, dur: full * speed, ease: 'linear' });
      S.fromTo('#race-cut .track', { '--k': 0 }, { '--k': 1 }, { at: tRace, dur: cut * speed, ease: 'linear' });
      S.fromTo('#race-full-v, #race-cut-v', { opacity: 0 }, { opacity: 1 }, { at: tRace, dur: 0.2 });     // no "0.00" before the race
      counter(S, $('#race-full-v'), full, tRace, full * speed, fmt(2));
      counter(S, $('#race-cut-v'), cut, tRace, cut * speed, fmt(2));
      S.fromTo('.race .unit', { opacity: 0 }, { opacity: 1 }, { at: tRace + 0.6, dur: 0.4 });
      S.sfx('low', tRace + cut * speed, { g: 0.45 });
      // viewers notice too
      S.fromTo('#viewers', { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, { at: c.viewers - 0.1, dur: 0.5 });
      S.fromTo('#vw-hi', { opacity: 0 }, { opacity: 1 }, { at: S.w('viewers', '4.8', 2.4) - 0.15, dur: 0.3 });
      S.fromTo('#viewers .arrow', { opacity: 0, x: -14 }, { opacity: 1, x: 0 }, { at: S.w('viewers', '2.1.', 3.4) - 0.4, dur: 0.3 });
      S.fromTo('#vw-lo', { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1 }, { at: S.w('viewers', '2.1.', 3.4) - 0.15, dur: 0.45, ease: 'outBack' });
    }

    /* ═════════════════ STYLISED ═════════════════ */
    {
      const S = scene('s-styles'), c = S.c, lay = L.styles;
      const tDemo = S.said('styles', 3.0) + 0.3;
      chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.6 });
      camera(S, lay, [{ at: 0, x: 960, y: 520, s: 1.0, push: 0.006 }]);
      // the stylised pair comes up as soon as the headline has settled ("the same pipeline works …"), not a second later
      S.fromTo('#styles-win', { opacity: 0, y: 50, scale: 0.96 }, { opacity: 1, y: 0, scale: 1 }, { at: Math.min(S.w('styles', 'stylised', 1.4) - 0.3, Math.max(S.w('styles', 'pipeline', 0.5) - 0.1, 1.4)), dur: 0.7 });
      M.play(S, $('#styles-win img'), 'pairC2', { at: tDemo });
      S.mark('demoC', tDemo);
      S.rise('#styles-label', { at: tDemo + 0.1, dist: 14, dur: 0.5 });
    }

    /* ═════════════════ DATASET ═════════════════ */
    {
      const S = scene('s-data'), c = S.c, lay = L.data;
      camera(S, lay, [{ at: 0, k: 'nums', x: 960, y: 540, s: 1.0 }, { at: c.transfer - 0.55, k: 'down', x: 960, y: 540, s: 1.0 }]);
      // the dataset's name heads the page as the line begins (no empty page while it is introduced); its numbers come on their words
      S.fromTo('#ds-name', { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: Math.max(S.w('scale', 'Run', 0.1) + 0.2, 0.6), dur: 0.6 });
      // each number counts from the moment it starts to appear, so none is ever seen standing at 0
      counter(S, $('#ds-pairs'), D.dataset.pairs, S.w('scale', '50,000', 3.0) - 0.3, 1.1, fmt(0));
      counter(S, $('#ds-ids'), D.dataset.identities, S.w('scale', '100,000', 4.6) - 0.3, 1.1, fmt(0));
      counter(S, $('#ds-hours'), Number(D.dataset.hours), S.w('hours', '1,400', 0.9) - 0.3, 1.1, fmt(1));
      const nums = $$('.ds-nums > div');
      [['scale', '50,000', 3.0], ['scale', '100,000', 4.6], ['hours', '1,400', 0.9]].forEach(([q, w, fb], i) => S.fromTo(nums[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: S.w(q, w, fb) - 0.3, dur: 0.5 }));
      S.sfx('bell', S.w('hours', '1,400', 0.9), { g: 0.35 });
      // pre-training on it helps two reaction models
      S.fromTo('#dn-1, #dn-2', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, { at: c.transfer - 0.1, dur: 0.5, stagger: 0.12 });
      S.fromTo('#dn-1 .track, #dn-2 .track', { '--k': 0 }, { '--k': 1 }, { at: S.w('transfer', 'improves', 1.6) - 0.1, dur: 0.9, stagger: 0.15, ease: 'outCubic' });
      S.fromTo('.down .legend', { opacity: 0 }, { opacity: 1 }, { at: S.w('transfer', 'models', 3.0), dur: 0.4 });
      S.fromTo('#dn-foot', { opacity: 0 }, { opacity: 1 }, { at: S.w('transfer', 'REACT', 3.8), dur: 0.5 });
    }

    /* ═════════════════ THE PUBLIC RELEASE ═════════════════ */
    {
      const S = scene('s-release'), c = S.c, lay = L.release;
      camera(S, lay, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.008 }]);
      const cuts = [[0, 'cafe', 0.1], [1, 'studio', S.w('release', 'weights', 1.4) - 0.1], [2, 'festival', S.w('release', 'These', 2.4) - 0.1], [3, 'backyard', S.w('release', 'release.', 3.6) - 0.2]];
      cuts.forEach(([i, n, at]) => {
        S.set('#hero-' + i, { opacity: 0 }, { at: 0 });
        S.set('#hero-' + i, { opacity: 1 }, { at });
        if (i < 3) S.set('#hero-' + i, { opacity: 0 }, { at: cuts[i + 1][2] });
        M.play(S, $('#hero-' + i), 'rel_' + n, { at });
        if (i) S.sfx('whoosh', at, { dur: 0.3, g: 0.25 });
      });
      S.fromTo('#rel-src', { opacity: 0 }, { opacity: 1 }, { at: 0.05, dur: 0.4 });     // the provenance is on screen whenever this footage is
      const tWall = S.said('release', 4.4) + 0.15;
      S.to('#hero-clip', { opacity: 0, scale: 0.92 }, { at: tWall, dur: 0.6, ease: 'inOutCubic' });
      const tiles = $$('#wall .t');
      S.fromTo(tiles, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { at: tWall + 0.1, dur: 0.5, stagger: 0.06 });
      tiles.forEach((t, i) => M.play(S, t.querySelector('img'), t.querySelector('img').dataset.clip, { at: tWall + 0.1 + i * 0.06 }));
      S.to('#rel-src', { opacity: 0 }, { at: tWall + 0.4, dur: 0.3 });
      S.rise('#rel-label', { at: tWall + 0.5, dist: 20, dur: 0.6 });
    }

    /* ═════════════════ END CARD ═════════════════ */
    {
      const S = scene('s-end'), c = S.c, lay = L.end;
      camera(S, lay, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.004 }]);
      const rows = $$('#sum .r');
      [['new', 0.1], ['framework', 1.4], ['dataset', 4.0]].forEach(([w, fb], i) => S.fromTo(rows[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: S.w('sum', w, fb) - 0.25, dur: 0.55 }));
      S.to('#sum', { opacity: 0, y: -30 }, { at: c.what - 0.35, dur: 0.35, ease: 'inQuad' });
      // the one sentence, word by word as it is spoken, then where to find the work
      const said = S.ws('what'), tSaid = S.said('what', 5.4);
      words(S, $('#end-h'), said ? said.map((x) => x - 0.08) : c.what + 0.1, { stagger: 0.3, dur: 0.55 });
      S.to('#end-h', { y: -170, scale: 0.84 }, { at: tSaid + 0.35, dur: 0.8, ease: 'inOutCubic' });
      $('#end-h').style.transformOrigin = '0 0';
      S.fromTo('#end-links > *', { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { at: tSaid + 0.8, dur: 0.45, stagger: 0.06 });
      S.fromTo('#end-qr', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { at: tSaid + 1.0, dur: 0.5 });
      S.rise('#end-venue', { at: tSaid + 1.3, dist: 12, dur: 0.5 });
      S.rise('#end-disc', { at: tSaid + 1.6, dist: 10, dur: 0.5 });
      S.sfx('bell', tSaid - 0.3, { g: 0.55 });
    }

    return tl;
  };
})();
