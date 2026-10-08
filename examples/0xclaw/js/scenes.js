/* scenes.js — builds the data-driven DOM of the 0xClaw film and registers every animation on the timeline.
 *
 * window.OXBUILD() is called once by js/lib/player.js, after the web fonts have loaded and while every
 * scene is laid out, so hand-drawn marks and arrows can be measured. It returns the timeline.
 *
 * It is a performed explainer: every narrated phrase is acted out on its words, something meaningful
 * is in motion every second, and the camera never parks. The stagecraft (stations, camera, kinetic
 * type, marks on cue, the two clocks) is js/lib/stage.js; this file is only what this film shows.
 *
 * Times are seconds relative to the scene start, on the plan's clock: offsets from a narration cue
 * (c.<cue id>, see js/script.js), or S.w(cue, 'word', fallback) for the moment a word is said.
 * S.sfx(...) declares a sound next to its visual; S.mark(...) names a moment for the sound bed.
 */
(function () {
  'use strict';

  window.OXBUILD = function () {
    const ST = window.OXSTAGE();
    const { tl, stage, W, H, GAP, TURN, clamp01, EASE, MK, SCRIPT, $, $$, el, svgEl, ico, setText, pad2, lerp, T, filmTime, plain, boxIn, splitDeep, layout,
      scene, camera, words, wordsOut, chapter, draw, mark, jot, pop, counter, num } = ST;
    const D = window.OXDATA;
    const FULL = SCRIPT.cut === 'full';

    /* ══════════════════════════ 1 · DOM that comes from data ══════════════════════════ */
    const FULL_ONLY = ['.pb-h', '.br-data', '.br-weak', '.br-phase', '.rs-eval', '.rs-cheap', '.rs-stats', '.rs-lim'];
    if (!FULL) for (const sel of FULL_ONLY) $(sel).remove();
    const has = (sceneId, cue) => T(sceneId).c[cue] !== undefined;

    // cold open: the seven phases under the prompt
    const hps = D.phases.map((p) => {
      const n = el('span', 'hp', `<i class="hp-box"><span class="mk" data-mark="tick" data-color="gold"></span></i><span class="hp-t">${p.name}</span>`);
      $('#hook-phases').appendChild(n);
      return n;
    });
    // problem: the two questions, drawn
    const SPLIT = [0.6, 0.5, 0.45, 1.3, 2.4, 1.1, 0.65];
    SPLIT.forEach((b) => { const s = el('i'); s.style.setProperty('--b', b); $('#q-split').appendChild(s); });
    const scopeChips = Array.from({ length: 9 }, (_, i) => { const b = el('b', i >= 5 ? 'late' : ''); $('#q-scope').appendChild(b); return b; });

    // workflow: the seven phases and what each hands on
    const tks = D.phases.map((p, i) => {
      const n = el('div', 'tk', `<span class="tk-n">${pad2(i + 1)}</span><span class="tk-i">${ico(p.icon)}</span><span class="tk-t">${p.name}</span><span class="tk-f">${p.files.map((f) => `<b>${f}</b>`).join('')}</span>`);
      $('#pl-track').appendChild(n);
      return n;
    });
    const ctxHist = $('.ctx-hist');

    // router
    const twoTicks = D.phases.map((p) => { const s = el('span', '', p.name.toLowerCase()); $('#two-track').appendChild(s); return s; });
    const twoDot = el('i', 'two-dot');
    $('#two-track').appendChild(twoDot);
    const blocks = Array.from({ length: 51 }, () => { const b = el('i'); $('#br-blocks').appendChild(b); return b; });
    D.control.example.forEach((t) => $('#br-raw').appendChild(el('span', '', `&lt;${t}&gt;`)));
    const flds = D.control.fields.map((f) => {
      const n = el('div', 'fld', `${ico(f.icon, 'regular')}<span class="fld-key">${f.label}</span><span class="fld-opts"><i class="sel"></i>${f.options.map((o, k) => `<span class="opt${k === f.pick ? ' pick' : ''}">${o}</span>`).join('')}</span>`);
      $('#br-fields').appendChild(n);
      return n;
    });
    const scan = el('i', 'scan');
    $('.br-reads').appendChild(scan);
    $('#br-ticket').appendChild(el('i', 't-edge'));
    const askSpans = D.phases.map((p) => { const s = el('span', '', p.name); $('#ask-opts').appendChild(s); return s; });
    const askRing = el('i', 'ask-ring');
    $('#ask-opts').appendChild(askRing);
    const dvs = D.tokenTier.map((r, i) => {
      const lab = (v) => (v >= 10 ? `<b>${v}%</b>` : '');
      const note = r.phase === 'research' ? '<p class="hand l">least</p>' : r.phase === 'coding' ? '<p class="hand r">most</p>' : '';
      const n = el('div', 'dv', `<div class="dv-l" style="--v:${r.t075}"><i></i>${lab(r.t075)}</div><div class="dv-name">${D.phases[i].name}</div><div class="dv-r" style="--v:${r.t125}"><i></i>${lab(r.t125)}</div>${note}`);
      $('#br-div').appendChild(n);
      return n;
    });
    const abs = D.accuracy.map((r) => {
      const n = el('div', 'ab' + (r.ours ? ' ours' : ''), `<span class="ab-name">${r.name}</span><div class="ab-track" style="--v:${r.exact}"><i></i><b>${Math.round(r.exact * 100)}%</b></div>`);
      $('#br-acc-bars').appendChild(n);
      return n;
    });
    const gapLine = el('i', 'gap-line');
    $('#br-acc-bars').appendChild(gapLine);
    let cens = [];
    if (FULL) {
      const mean = D.centering.reduce((s, x) => s + x.h, 0) / D.centering.length;
      cens = D.centering.map((x) => {
        const n = el('div', 'cen-bar', `<span>${x.label}</span>`);
        n.style.setProperty('--h', x.h);
        n.style.setProperty('--c', x.h >= mean ? 'var(--violet)' : 'transparent');
        $('#cen-bars').appendChild(n);
        return n;
      });
      $('.cen-line').style.setProperty('--m', mean.toFixed(3));
      const Y = (v) => ((v - 0.5) / 0.5).toFixed(4);                  // axis runs from 0.5 to 1.0
      D.perPhase.forEach((r, i) => {
        const n = el('div', 'db', `<i></i><em class="d0"></em><em class="d1"></em><b>${r.ours.toFixed(2).slice(1)}</b><span>${D.phases[i].name}</span>`);
        n.style.setProperty('--b', Y(r.base));
        n.style.setProperty('--v', Y(r.ours));
        $('#br-dumb').appendChild(n);
      });
      const line = el('div', 'dumb-line', '<span>0.91</span>');
      line.style.bottom = `calc(${Y(0.91)} * 480px)`;
      $('#br-dumb').appendChild(line);
      $('#br-dumb').appendChild(el('span', 'dumb-y top', '1.0'));
      $('#br-dumb').appendChild(el('span', 'dumb-y bot', '0.5'));
    }

    // framer: the pressure gauge
    const GC = { x: 230, y: 240, r: 186 };
    const TIER_COL = ['#B9B5A8', '#D9C48A', '#F2B32C', '#E27A2B', '#CF4326'];
    const gpt = (deg) => [GC.x + GC.r * Math.cos((deg * Math.PI) / 180), GC.y - GC.r * Math.sin((deg * Math.PI) / 180)];
    const gsvg = $('#df-gauge-svg');
    const segs = TIER_COL.map((col, k) => {
      const p0 = gpt(180 - k * 36 - 1.2), p1 = gpt(180 - (k + 1) * 36 + 1.2);
      const p = svgEl('path', { class: 'g-seg', d: `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${GC.r} ${GC.r} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}` });
      p.style.stroke = col;
      gsvg.appendChild(p);
      return p;
    });
    const needle = svgEl('g', { class: 'g-needle' });
    needle.appendChild(svgEl('path', { class: 'g-hand', d: `M${GC.x} ${GC.y} L${GC.x} ${GC.y - 148}` }));
    gsvg.appendChild(needle);
    gsvg.appendChild(svgEl('circle', { class: 'g-hub', cx: GC.x, cy: GC.y, r: 13 }));
    [['no rush', 44], ['urgent', 416]].forEach(([txt, x]) => { const t = svgEl('text', { class: 'g-end', x, y: 270, 'text-anchor': 'middle' }); t.textContent = txt; gsvg.appendChild(t); });
    const needleAt = (tier) => (tier + 0.5) * 36 - 90;
    // the slogan's two figures, wherever the slogan appears: a budget split seven ways, a pressure strip with its marker
    $$('.sg-fig.bud').forEach((f) => SPLIT.forEach((b) => { const seg = el('i'); seg.style.setProperty('--b', b); f.appendChild(seg); }));
    $$('.sg-fig.prs').forEach((f) => { TIER_COL.forEach((col) => { const seg = el('i'); seg.style.background = col; f.appendChild(seg); }); f.appendChild(el('b')); });
    const loopTok = el('i', 'loop-tok');
    $('.loop').insertBefore(loopTok, $('.loop .loop-node'));

    // results
    const RT = { setup: 'Does it work?', eval: 'How we score it.', pass: 'It ships on the first run.', tokens: 'Same quality, far fewer tokens.', stats: 'Is the gap real?', ablation: 'Each controller earns its place.', tradeoff: 'The price is time.', limits: 'What is still missing.' };
    const rts = {};
    for (const k in RT) if (has('s-results', k)) { rts[k] = el('span', '', RT[k]); $('#res-title').appendChild(rts[k]); }
    const suHacks = Array.from({ length: 20 }, () => { const i = el('i'); $('#su-hacks').appendChild(i); return i; });
    const suAgents = Array.from({ length: 11 }, (_, k) => { const i = el('i', k === 10 ? 'o' : ''); $('#su-agents').appendChild(i); return i; });
    const dts = D.agents.slice().sort((a, b) => (b.ours ? 1 : 0) - (a.ours ? 1 : 0) || b.pass1 - a.pass1).map((a) => {
      const n = el('div', 'pb' + (a.ours ? ' ours' : ''), `<span class="pb-name">${a.name}</span><div class="pb-track" style="--v:${a.pass1}"><i></i></div><b>${a.pass1.toFixed(2)}</b>`);
      n._v = a.pass1;
      $('#rs-dots').appendChild(n);
      return n;
    });
    const A = {};
    D.ablation.forEach((a) => { A[`${+a.br}${+a.df}`] = a; });
    const NOTE = { '01': '−21% tokens', '10': '+1.9 quality', '11': 'best of both' };
    const cell = (br, df) => {
      const a = A[`${br}${df}`], k = `${br}${df}`;
      return `<div class="ag-c${df ? ' r' : ''}${br ? ' b' : ''}${a.ours ? ' ours' : ''}" data-k="${k}" data-q="${a.quality}"><p class="ag-q">${a.quality.toFixed(1)}</p><p class="ag-m">${a.tokens.toFixed(2)}M tokens · pass@1 ${a.pass1.toFixed(2)}</p>${NOTE[k] ? `<p class="hand ag-note">${NOTE[k]}</p>` : ''}</div>`;
    };
    $('#abl-grid').innerHTML = '<div class="ag-k">quality</div><div class="ag-h">Deadline Framer <b>off</b></div><div class="ag-h">Deadline Framer <b>on</b></div>'
      + [0, 1].map((br) => `<div class="ag-v">Budget Router <b>${br ? 'on' : 'off'}</b></div>${cell(br, 0)}${cell(br, 1)}`).join('');
    let sps = [];
    if (FULL) {
      // scatter: tokens (0–10 M) against quality (64–78)
      const SW = 1180, SH = 470, X = (v) => (v / 10) * SW, Yq = (v) => SH - ((v - 64) / 14) * SH;
      const plot = $('#sc-plot'), svg = $('#sc-svg');
      svg.appendChild(svgEl('path', { class: 'sc-ax', d: `M0 0 V${SH} H${SW}` }));
      [0, 2, 4, 6, 8, 10].forEach((v) => { const t = el('span', 'sc-tick x', String(v)); t.style.left = X(v) + 'px'; plot.appendChild(t); });
      [65, 70, 75].forEach((v) => { const t = el('span', 'sc-tick y', String(v)); t.style.top = Yq(v) + 'px'; plot.appendChild(t); svg.appendChild(svgEl('path', { class: 'sc-grid', d: `M0 ${Yq(v)} H${SW}` })); });
      const LABEL = { '0xClaw': 'ours', 'Claude Code': 'cc', 'OpenCode': 'lab', 'Copilot CLI': 'lab', 'ARIS': 'lab r' };
      sps = D.agents.map((a) => {
        const n = el('div', 'sp ' + (LABEL[a.name] || ''), `<i></i>${LABEL[a.name] ? `<span>${a.name}</span>` : ''}`);
        n.style.left = X(a.tokens) + 'px'; n.style.top = Yq(a.quality) + 'px';
        plot.appendChild(n);
        return n;
      });
      for (let i = 0; i < 20; i++) {
        const s = el('i');
        s.style.setProperty('--c', i < D.vsAris.wins ? 'var(--violet)' : i < D.vsAris.wins + D.vsAris.ties ? '#B9B5A8' : 'var(--red)');
        $('#wtl').appendChild(s);
      }
      $$('.rs-eval .ev')[0].appendChild(el('div', 'ev-fig', '<div id="ev-1">' + [0.82, 0.6, 0.95, 0.7].map((v) => `<i style="--v:${v}"><u></u></i>`).join('') + '</div>'));
      $$('.rs-eval .ev')[1].appendChild(el('div', 'ev-fig', '<div id="ev-2">' + ['builds', 'smoke test'].map((t) => `<p><span class="cb"><span class="mk" data-mark="tick" data-color="violet"></span></span>${t}</p>`).join('') + '</div>'));
      $$('.rs-eval .ev')[2].appendChild(el('div', 'ev-fig', '<div id="ev-3"><b>run 1</b><b>run 2</b><b>run 3</b></div>'));
      $('.rs-eval').appendChild(el('p', 'hand ev-note', '+ two hard checks'));
      $('#j2').innerHTML = D.secondJudge.map((j) => `<div class="${j.ours ? 'o' : ''}"><p class="hero-n sm">${j.quality.toFixed(1)}</p><p class="kicker">${j.name}</p></div>`).join('');
    }

    // showcase: tabs, frames, wall
    const projects = D.projects.slice(0, FULL ? 8 : 6);
    const tabs = projects.map((p) => { const s = el('span', '', p.name); $('#show-tabs').appendChild(s); return s; });
    const shows = projects.map((p, i) => {
      const frame = el('div', 'frame', `<div class="frame-bar"><i></i><i></i><i></i><span>${p.name}</span></div><div class="frame-shot"><img src="${p.img}" alt="" /></div>`);
      const info = el('div', 'show-info', `<p class="show-n">${pad2(i + 1)} / ${pad2(projects.length)}</p><h3 class="show-name">${p.name}</h3><p class="show-what">${p.what}</p>`);
      $('#show-stage').appendChild(frame);
      $('#show-stage').appendChild(info);
      return { frame, info, img: frame.querySelector('img') };
    });
    const perRow = projects.length / 2, tileW = perRow === 4 ? 400 : 470, tileGap = (W - perRow * tileW) / (perRow + 1);
    const tiles = projects.map((p, i) => {
      const row = i < perRow ? 0 : 1, col = i % perRow;
      const node = el('div', 'tile', `<img src="${p.img}" alt="" />`);
      node.style.left = (tileGap + col * (tileW + tileGap)).toFixed(0) + 'px';
      node.style.top = (row ? 684 : 96) + 'px';
      node.style.width = tileW + 'px';
      $('#wall').appendChild(node);
      return { node, row, col, rot: [-2.2, 1.5, -1.3, 2.1][col] * (row ? -1 : 1) };
    });

    // outro: the /status table, and a miniature for each contribution
    const trows = D.phases.map((p, i) => {
      const n = el('div', 'tp-row', `<span class="n">${i + 1}</span><span class="p">${p.name}</span><span class="s"></span>`);
      $('#term-rows').appendChild(n);
      return n.querySelector('.s');
    });
    $('#cf-1').innerHTML = '<i class="cf-line"></i>' + D.phases.map(() => '<i class="cf-dot"></i>').join('') + '<i class="cf-hop"></i>';
    $('#cf-2').innerHTML = '<i class="cf-ticket"><b></b><b></b><b></b></i><svg class="cf-gauge" viewBox="0 0 120 70"></svg>';
    {
      const g = $('#cf-2 .cf-gauge'), q = (deg) => [60 + 46 * Math.cos((deg * Math.PI) / 180), 60 - 46 * Math.sin((deg * Math.PI) / 180)];
      TIER_COL.forEach((col, k) => { const a = q(180 - k * 36 - 2), b = q(180 - (k + 1) * 36 + 2); const p = svgEl('path', { d: `M${a[0].toFixed(1)} ${a[1].toFixed(1)} A46 46 0 0 1 ${b[0].toFixed(1)} ${b[1].toFixed(1)}`, fill: 'none', 'stroke-width': 11 }); p.style.stroke = col; g.appendChild(p); });
      const nd = svgEl('g', { class: 'cf-needle' });
      nd.appendChild(svgEl('path', { d: 'M60 60 L60 22', stroke: '#191713', 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
      g.appendChild(nd);
      g.appendChild(svgEl('circle', { cx: 60, cy: 60, r: 5, fill: '#191713' }));
    }
    $('#cf-3').innerHTML = '<i class="cf-bar a"></i><i class="cf-bar b"></i><span class="cf-lab">−59%</span>';

    /* ══════════════════════════ 2 · stations, icons, words, marks, arrows ══════════════════════════ */
    const L = {
      hook: layout('s-hook', [['a', ['.hook-a']], ['b', ['.hook-b']], ['c', ['.hook-c']]], []),
      title: layout('s-title', [['a', []]], []),
      problem: layout('s-problem', [['a', ['.pb-a']], ['q', ['.pb-q']], ['f', ['.pb-f']]].concat(FULL ? [['h', ['.pb-h']]] : [])),
      pipeline: layout('s-pipeline', [['a', []]]),
      router: layout('s-router', [['two', ['.two']], ['model', ['.br-model']], ['token', ['.br-token']]]
        .concat(FULL ? [['data', ['.br-data']], ['weak', ['.br-weak']]] : [])
        .concat([['ask', ['.br-ask']], ['learn', ['.br-learn']], ['acc', ['.br-acc']]])
        .concat(FULL ? [['phase', ['.br-phase']]] : [])),
      framer: layout('s-framer', [['main', ['.df-main']], ['loop', ['.loop']], ['slogan', ['.slogan']]], ['.df-head']),
      results: layout('s-results', [['setup', ['.rs-setup']]]
        .concat(FULL ? [['eval', ['.rs-eval']]] : [])
        .concat([['pass', ['.rs-pass']], ['tokens', ['.rs-tok']]])
        .concat(FULL ? [['cheaper', ['.rs-cheap']], ['stats', ['.rs-stats']]] : [])
        .concat([['ablation', ['.rs-abl']], ['tradeoff', ['.rs-trade']]])
        .concat(FULL ? [['limits', ['.rs-lim']]] : [])),
      showcase: layout('s-showcase', [['a', ['.tabs', '.show-stage']], ['wall', ['.show-wall']]]),
      outro: layout('s-outro', [['use', ['.use']], ['contrib', ['.contrib']], ['end', ['.end'], true]], []),
    };

    window.OXICON.hydrate(document);
    $$('[data-split], .pp-a, .pp-b, .sec-title:not(.multi), #res-title > span, .fence-row h3, .hard-col h3, .show-name, .show-what, .two-col .stmt, .cen-side .stmt').forEach(splitDeep);
    $('#res-title').style.width = rts.setup.offsetWidth + 'px';
    MK.prepare(stage);

    const INK = { color: 'ink', width: 3.5 };
    const stA = L.pipeline.st[0];
    const fbs = tks.map((n) => boxIn(n.querySelector('.tk-f'), stA));
    const hopY = Math.max(...fbs.map((b) => b.b)) + 12;
    const hops = fbs.slice(0, -1).map((a, i) => MK.arrow($('#pl-ink'), [a.cx + 26, hopY], [fbs[i + 1].cx - 26, hopY], { color: 'violet', width: 3, head: 15, bend: 26 }));
    const stTok = L.router.at('token');
    const rb = boxIn($('.br-reads'), stTok), tb = boxIn($('#br-ticket'), stTok);
    const brArrow = MK.arrow($('#br-ink'), [rb.r + 18, rb.cy], [tb.x - 18, rb.cy], { ...INK, head: 22, bend: -8 });
    const stMain = L.framer.at('main');
    const ib = boxIn($('.df-in'), stMain), gb = boxIn($('.df-gauge'), stMain), pb = boxIn($('.df-prompt'), stMain);
    const dfArrow1 = MK.arrow($('#df-ink'), [ib.r - 6, gb.y + 170], [gb.x + 28, gb.y + 170], { ...INK, head: 20, bend: -8 });
    const dfArrow2 = MK.arrow($('#df-ink'), [gb.r - 28, gb.y + 170], [pb.x - 14, gb.y + 170], { ...INK, head: 20, bend: -8 });
    const stLoop = L.framer.at('loop');
    const LN = ['.n-br', '.n-df', '.n-ag', '.n-ws'].map((s) => $(s));
    const lb = LN.map((n) => boxIn(n, stLoop));
    const loopSvg = $('#loop-svg');
    const LO = { ...INK, head: 24, bend: -26 };
    const loopArrows = [
      MK.arrow(loopSvg, [lb[0].r + 16, lb[0].cy], [lb[1].x - 16, lb[1].cy], LO),
      MK.arrow(loopSvg, [lb[1].cx, lb[1].b + 14], [lb[2].cx, lb[2].y - 14], LO),
      MK.arrow(loopSvg, [lb[2].x - 16, lb[2].cy], [lb[3].r + 16, lb[3].cy], LO),
      MK.arrow(loopSvg, [lb[3].cx, lb[3].y - 14], [lb[0].cx, lb[0].b + 14], LO),
    ];
    // the bus under the agents: one model line, a riser to every agent
    const setup = $('.rs-setup'), suInk = $('#su-ink');
    const chipB = boxIn($('#su-chip'), setup), agB = suAgents.map((n) => boxIn(n, setup));
    const busY = Math.max(...agB.map((b) => b.b)) + 34;
    const busPaths = [svgEl('path', { class: 'bus', pathLength: 1, d: `M${chipB.cx} ${chipB.b + 6} V${busY} H${agB[0].cx}` })]
      .concat(agB.map((b) => svgEl('path', { class: 'bus', pathLength: 1, d: `M${b.cx} ${busY} V${b.b + 6}` })).reverse());
    busPaths.forEach((p) => suInk.appendChild(p));
    // the missing length between the two token bars
    const stTokens = L.results.at('tokens');
    const tbT = $$('.tb-track').map((n) => boxIn(n, stTokens));
    const tokGap = [tbT[1].x + 0.4057 * 0.54 * tbT[1].w + 150, tbT[0].x + 0.54 * tbT[0].w];
    const tokBrace = MK.line($('#tok-ink'), [tokGap[0], tbT[1].cy], [tokGap[1], tbT[1].cy], { color: 'violet', width: 3.5, roughness: 0.8 })
      .concat(MK.line($('#tok-ink'), [tokGap[0], tbT[1].cy - 16], [tokGap[0], tbT[1].cy + 16], { color: 'violet', width: 3.5, roughness: 0.6 }))
      .concat(MK.line($('#tok-ink'), [tokGap[1], tbT[1].cy + 16], [tokGap[1], tbT[0].cy + 24], { color: 'violet', width: 3.5, roughness: 0.6 }));
    // a pen outline for the winning cell of the ablation
    const stAbl = L.results.at('ablation');
    const oursCell = boxIn($('.ag-c.ours'), stAbl);
    const ablBox = MK.rect($('#abl-ink'), oursCell.x - 6, oursCell.y - 6, oursCell.w + 12, oursCell.h + 12, { color: 'violet', width: 4, roughness: 1.1 });
    let cheapMark = [], cheapArrow = [];
    if (FULL) {
      const stC = L.results.at('cheaper'), svg = $('#sc-ink'), pb2 = boxIn($('#sc-plot'), stC);
      const pts = sps.filter((n) => n.classList.contains('lab') && !n.classList.contains('r')).map((n) => [pb2.x + parseFloat(n.style.left), pb2.y + parseFloat(n.style.top)]);
      cheapMark = pts.flatMap((p) => MK.circle(svg, p[0], p[1], 52, { color: 'red', width: 3.5 }));
      const nb = boxIn($('.cheap-note'), stC);
      cheapArrow = MK.arrow(svg, [nb.x - 14, nb.cy], [pts[1][0] + 40, pts[1][1] + 34], { color: 'red', width: 3.5, head: 20, bend: -18 });
    }

    /* ══════════════════════════ 3 · what only this film has ══════════════════════════ */
    /** one line of the slogan: the words rise, the figure acts the line out (the bar splits / the marker moves), then the mark */
    const sloganLine = (S, row, at, o = {}) => {
      const fig = row.querySelector('.sg-fig'), kicker = row.querySelector('.kicker'), mk = row.querySelector('.mk');
      if (kicker) S.rise(kicker, { at: at - 0.1, dist: 12, dur: 0.4 });
      words(S, row.querySelector('.stmt'), at, { stagger: 0.1 });
      if (fig.classList.contains('bud')) {
        S.fromTo(fig, { opacity: 0, '--m': 0 }, { opacity: 1, '--m': 0 }, { at: at + 0.3, dur: 0.3 });
        S.to(fig, { '--m': 1 }, { at: at + 0.6, dur: 0.9, ease: 'inOutCubic' });
      } else {
        S.fromTo(fig, { opacity: 0, '--k': 0.1 }, { opacity: 1, '--k': 0.1 }, { at: at + 0.3, dur: 0.3 });
        S.to(fig, { '--k': 0.7 }, { at: at + 0.6, dur: 0.8, ease: 'outBack' });
      }
      S.sfx('pop', at + 0.6, { n: o.n || 2, g: 0.5 });
      if (mk) mark(S, mk, at + (o.mark === undefined ? 1.1 : o.mark));
    };

    /* ══════════════════════════ 4 · HUD, captions ══════════════════════════ */
    ST.hud({ until: filmTime('s-showcase', T('s-showcase').c.each - 0.6) });   // out before the full-bleed wall
    ST.captions({ dark: [[0, T('s-problem').start - 0.5], [filmTime('s-outro', T('s-outro').c.ships - 0.25), Infinity]] });   // the cold open, the title and the end card are dark

    /* ═════════════════════════════ S1 · COLD OPEN — a link goes in, the rest happens ═════════════════════════════ */
    {
      const S = scene('s-hook'), c = S.c, lay = L.hook;
      const URL = 'research https://dorahacks.io/hackathon/1985';   // the README's input form, and the hackathon it was built for
      const tType = c.give + 0.35, tEnter = c.give + 2.45, tRun = c.give + 2.75;
      const kb = boxIn(S.$('#hook-key'), lay.at('a'));
      camera(S, lay, [
        { at: 0, k: 'a', x: 960, y: 470, s: 1.04 },
        { at: c.give + 1.55, k: 'a', x: kb.cx - 150, y: kb.cy, s: 2.1, dur: 0.85 },   // close on the Enter key
        { at: tEnter + 0.12, k: 'a', x: 960, y: 500, s: 1.0, dur: 0.85 },
        { at: c.won - 0.55, k: 'b', x: 900, y: 520, s: 1.0, dur: 0.9 },
        { at: c.promise - 0.55, k: 'c', x: 960, y: 520, s: 1.0, dur: 0.9 },
      ]);
      // t = 0 is already a frame: the prompt is waiting
      words(S, S.$('.hook-a .l1'), c.give - 0.45, { stagger: 0.075 });
      const cmd = S.$('#hook-cmd'), caret = S.$('#hook-caret'), key = S.$('#hook-key');
      S.type(cmd, URL, { at: tType, dur: 1.55 });
      S.sfx('type', tType, { dur: 1.55, n: 30, g: 0.8 });
      S.call((p, lt, t) => { const local = S.now(t); caret.style.opacity = local > tEnter + 0.1 ? 0 : (local > tType && local < tType + 1.6 ? 1 : (Math.floor(Math.max(0, local) * 2.6) % 2 ? 0.15 : 1)); }, { at: 0, dur: S.dur });
      S.fromTo(key, { scale: 1, backgroundColor: 'rgba(243,240,231,0.08)', color: 'rgba(243,240,231,0.7)' }, { scale: 0.9, backgroundColor: 'rgba(242,179,44,1)', color: 'rgba(21,19,15,1)' }, { at: tEnter, dur: 0.1, ease: 'outQuad' });
      S.to(key, { scale: 1 }, { at: tEnter + 0.12, dur: 0.35, ease: 'outBack' });
      S.sfx('pop', tEnter, { n: 4, g: 0.9 });
      words(S, S.$('.hook-a .l2'), tRun, { stagger: 0.085 });
      S.fromTo('#hook-phases', { '--run': 0 }, { '--run': 1 }, { at: tRun + 0.15, dur: 7 * 0.2, ease: 'linear' });
      hps.forEach((n, i) => {
        const tt = tRun + 0.2 + i * 0.2;
        S.fromTo(n, { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { at: tRun - 0.1 + i * 0.05, dur: 0.35 });
        mark(S, n.querySelector('.mk'), tt, { quiet: true });
        S.fromTo(n, { '--on': 0 }, { '--on': 1 }, { at: tt, dur: 0.2 });
        S.sfx('pop', tt, { n: i, g: 0.45, pan: -0.5 + i / 6 });
      });

      // the story: first place in its track
      S.fromTo('.place-n', { opacity: 0, scale: 2.3, rotate: -9 }, { opacity: 1, scale: 1, rotate: -3 }, { at: c.won - 0.05, dur: 0.3, ease: 'inQuad' });
      S.fromTo('.place-n', { y: 0 }, { y: 10 }, { at: c.won + 0.25, dur: 0.08 });
      S.to('.place-n', { y: 0 }, { at: c.won + 0.33, dur: 0.3, ease: 'outBack' });
      S.fromTo('.place-n .ring', { opacity: 0.7, scale: 0.4 }, { opacity: 0, scale: 1.7 }, { at: c.won + 0.25, dur: 0.8, ease: 'outCubic' });
      S.sfx('low', c.won + 0.25, { g: 0.9 }).sfx('bell', c.won + 0.3, { g: 0.7 });
      words(S, S.$('.place-t .stmt'), c.won + 0.45, { stagger: 0.09 });
      S.rise('.place-t .k1', { at: c.won + 0.95, dist: 14, dur: 0.45 });
      S.rise('.place-t .k2', { at: c.won + 1.15, dist: 14, dur: 0.45 });

      // the promise, with the time that is really left
      const left = S.$('#hook-left');
      tl.ambient((t) => { const r = Math.max(0, Math.round(tl.duration - t)); setText(left, `${Math.floor(r / 60)}:${pad2(r % 60)}`); });
      S.rise('#hook-promise-k', { at: c.promise - 0.1, dist: 14, dur: 0.5 });
      words(S, S.$('.hook-c .stmt'), c.promise + 0.75, { stagger: 0.075 });
      const mks = S.$$('.hook-c .mk');
      mark(S, mks[0], S.w('promise', 'time', 3.4) - 0.15);
      mark(S, mks[1], S.w('promise', 'budget.', 4.1) - 0.15);
      S.mark('hook.promise', c.promise);
    }

    /* ═════════════════════════════ S2 · TITLE — the slogan, first time ═════════════════════════════ */
    {
      const S = scene('s-title'), c = S.c;
      camera(S, L.title, [{ at: 0, x: 960, y: 540, s: 1.0, push: 0.005 }, { at: c.name + 2.4, x: 960, y: 552, s: 1.03, dur: 1.2, push: 0.004 }]);
      S.fromTo('.tt-brand', { opacity: 0, x: -40 }, { opacity: 1, x: 0 }, { at: 0.15, dur: 0.6 });
      S.fromTo('.tt-venue', { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: 0.3, dur: 0.6 });
      words(S, S.$('.tt-paper'), 0.45, { stagger: 0.04, dur: 0.55 });
      S.rise('.tt-authors', { at: 1.0, dist: 14, dur: 0.5 });
      S.rise('.tt-aff', { at: 1.15, dist: 14, dur: 0.5 });
      S.rise('.tt-conf', { at: 1.3, dist: 14, dur: 0.5 });
      S.fromTo('.tt-rule', { scaleX: 0 }, { scaleX: 1 }, { at: 1.2, dur: 1.0, ease: 'inOutCubic' });
      // a budget for every phase · a deadline it can feel — each line with the figure that acts it out
      const tA = S.w('name', 'budget', 3.2) - 0.35, tB = S.w('name', 'deadline', 5.2) - 0.3;
      sloganLine(S, S.$('.tt-slogan .sg-a'), tA, { n: 2 });
      sloganLine(S, S.$('.tt-slogan .sg-b'), tB, { n: 4, mark: 1.4 });
      S.mark('title.slogan', tA);
    }

    /* ═════════════════════════════ S3 · PROBLEM — and the fence around the idea ═════════════════════════════ */
    {
      const S = scene('s-problem'), c = S.c, lay = L.problem;
      const t0 = chapter(S, lay.chrome.querySelector('.sec-head'));
      camera(S, lay, [
        { at: 0, k: 'a', x: 960, y: 540, s: 1.0 },
        { at: c.harder + 2.3, k: 'a', x: 800, y: 470, s: 1.16, dur: 1.0 },        // toward the hackathon
        { at: c.four - 0.5, k: 'a', x: 1040, y: 556, s: 1.04, dur: 1.0 },         // across to the list
        { at: c.decide - 0.55, k: 'q', x: 960, y: 560, s: 1.0 },
        { at: c.decide + 1.7, k: 'q', x: 930, y: 520, s: 1.05, dur: 1.2 },
        { at: c.decide + 3.3, k: 'q', x: 930, y: 562, s: 1.05, dur: 1.0 },
        { at: c.neither - 0.2, k: 'q', x: 960, y: 580, s: 1.0, dur: 0.8 },
        { at: c.fence - 0.55, k: 'f', x: 960, y: 500, s: 1.04 },
        { at: c.fence + 2.2, k: 'f', x: 960, y: 560, s: 1.04, dur: 1.0 },
        { at: c.fence + 4.6, k: 'f', x: 970, y: 580, s: 1.06, dur: 1.0 },
      ].concat(S.has('hard') ? [{ at: c.hard - 0.55, k: 'h', x: 960, y: 560, s: 1.0 }, { at: c.hard + 7.6, k: 'h', x: 960, y: 590, s: 1.04, dur: 1.0 }] : []));

      // where a hackathon sits (paper Figure 2)
      S.fromTo(S.$$('.plot-ax .ax'), { strokeDashoffset: 1 }, { strokeDashoffset: 0 }, { at: t0 - 0.5, dur: 0.7, stagger: 0.12, ease: 'inOutCubic' });
      S.fadeIn('.plot-ax .ax-head', { at: t0 + 0.1, dur: 0.3 });
      S.fadeIn(S.$$('#pb-plot .ax-t'), { at: t0, dur: 0.4 });
      const others = S.$$('#pb-plot .pt:not(.hack)');
      others.forEach((n, i) => {
        const tt = c.harder + 1.05 + i * 0.3;
        S.fromTo(n, { opacity: 0, y: -70 }, { opacity: 1, y: 0 }, { at: tt, dur: 0.45, ease: 'outBack' });
        S.sfx('pop', tt + 0.2, { n: i, g: 0.4 });
      });
      const hack = S.$('#pb-plot .pt.hack');
      const tHack = S.w('harder', 'hackathon', 2.9) - 0.3;
      S.fromTo(hack, { opacity: 0, x: 260, y: -160, scale: 0.7 }, { opacity: 1, x: 0, y: 0, scale: 1 }, { at: tHack, dur: 0.6, ease: 'outBackSoft' });
      mark(S, hack.querySelector('.mk'), tHack + 0.7, { dur: 0.9 });
      S.to(others, { opacity: 0.4 }, { at: tHack + 0.7, dur: 0.5 });
      const lis = S.$$('.four li');
      [['open', 0.3], ['hard', 1.3], ['several', 2.4], ['one', 3.7]].forEach(([word, fb], i) => {   // each item on its words
        const tt = S.w('four', word, fb) - 0.2;
        S.fromTo(lis[i], { opacity: 0, x: 80 }, { opacity: 1, x: 0 }, { at: tt, dur: 0.5 });
        S.fromTo(lis[i].querySelector('.ph'), { rotate: -50, scale: 0.5 }, { rotate: 0, scale: 1 }, { at: tt, dur: 0.6, ease: 'outBack' });
        S.sfx('pop', tt, { n: i + 1, g: 0.45 });
      });
      mark(S, lis[3].querySelector('.mk'), S.w('four', 'budget.', 4.05) - 0.05);

      // the two questions, each acted out underneath
      S.rise('.pb-q .kicker', { at: c.decide - 0.05, dist: 14, dur: 0.5 });
      ['.q1', '.q2'].forEach((q, i) => {
        const h = S.$('.pb-q ' + q);
        S.fromTo(h.querySelector('b'), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1 }, { at: c.decide + 0.55 + i * 0.4, dur: 0.45, ease: 'outBack' });
        S.fromTo(h.children[1], { opacity: 0, x: 50 }, { opacity: 1, x: 0 }, { at: [S.w('decide', 'how', 2.2), S.w('decide', 'when', 3.85)][i] - 0.2, dur: 0.55 });
        S.sfx('pop', c.decide + 0.55 + i * 0.4, { n: i + 2, g: 0.5 });
      });
      S.fromTo('#q-split', { opacity: 0, scaleX: 0.3 }, { opacity: 1, scaleX: 1 }, { at: c.decide + 2.3, dur: 0.6 });
      [[2.8, 1, 0.8], [3.7, 0.25, 0.7], [4.5, 0.85, 0.7], [5.3, 0.4, 0.7], [6.1, 0.7, 0.6]].forEach(([d, m, dur], i) => (i ? S.to('#q-split', { '--m': m }, { at: c.decide + d, dur, ease: 'inOutCubic' }) : S.fromTo('#q-split', { '--m': 0 }, { '--m': m }, { at: c.decide + d, dur, ease: 'inOutCubic' })));
      S.fadeIn('#q-scope .q-dead', { at: c.decide + 3.9, dur: 0.4 });
      scopeChips.forEach((b, i) => { const tt = c.decide + 4.0 + i * 0.3; pop(S, b, tt, { dur: 0.3 }); if (i >= 5) S.sfx('pop', tt, { n: 8 - i, g: 0.3 }); });
      mark(S, '.pb-q .q1 .mk', c.neither + 0.45);
      mark(S, '.pb-q .q2 .mk', c.neither + 0.9);
      S.to('#q-split, #q-scope', { opacity: 0.35 }, { at: c.neither + 0.5, dur: 0.5 });
      jot(S, '.neither', c.neither + 1.25, { rot: -3 });

      // the fence: what others do, and what this is
      const rows = S.$$('.fence-row'), ft = [0.0, S.w('fence', 'Multi-agent', 2.5) - c.fence, S.w('fence', 'Nobody', 5.2) - 0.2 - c.fence];   // one row per sentence
      rows.forEach((r, i) => {
        S.fromTo(r, { opacity: 0 }, { opacity: 1 }, { at: c.fence + ft[i] - 0.1, dur: 0.3 });
        S.fromTo(r.querySelector('.kicker'), { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, { at: c.fence + ft[i], dur: 0.45 });
        words(S, r.querySelector('h3'), c.fence + ft[i] + 0.15, { stagger: 0.08 });
        S.fromTo(r.querySelector('.ph'), { opacity: 0, scale: 0.3, rotate: -40 }, { opacity: 1, scale: 1, rotate: 0 }, { at: c.fence + ft[i] + (i < 2 ? 1.3 : 1.0), dur: 0.45, ease: 'outBack' });
        if (i < 2) S.to(r, { opacity: 0.45 }, { at: c.fence + ft[2], dur: 0.5 });
      });
      mark(S, rows[2].querySelector('.mk'), S.w('fence', 'whole', 6.3));
      S.mark('problem.fence', c.fence);

      if (S.has('hard')) {
        const cols = S.$$('.hard-col');
        [['Context', 2.2], ['Budgets', 4.4], ['agents', 6.8]].forEach(([word, fb], i) => {
          const d = S.w('hard', word, fb) - 0.1 - c.hard;
          S.fromTo(cols[i], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: c.hard + d - 0.2, dur: 0.5 });
          S.fromTo(cols[i].querySelector('.ph'), { rotate: -40, scale: 0.5 }, { rotate: 0, scale: 1 }, { at: c.hard + d - 0.2, dur: 0.6, ease: 'outBack' });
          words(S, cols[i].querySelector('h3'), c.hard + d, { stagger: 0.08 });
          jot(S, cols[i].querySelector('.hand'), c.hard + 7.9 + i * 0.32, { rot: -4 });
        });
      }
    }

    /* ═════════════════════════════ S4 · WORKFLOW — the baton ═════════════════════════════ */
    {
      const S = scene('s-pipeline'), c = S.c, lay = L.pipeline;
      const t0 = chapter(S, lay.chrome.querySelector('.sec-head'), { hold: 0.9 });
      const step = (S.d.names - 0.7) / 7;
      const tn = ['research,', 'idea,', 'selection,', 'planning,', 'coding,', 'testing,', 'documentation.'].map((w, i) => S.w('names', w, 0.05 + i * step));
      const tName = (i) => tn[i];                                   // each phase lights up on its name
      const cx = fbs.map((b) => b.cx);
      camera(S, lay, [{ at: 0, x: 960, y: 540, s: 1.0 }]
        .concat(cx.map((x, i) => ({ at: tName(i) - 0.35, x: 936 + i * 8, y: 520, s: 1.04, dur: i ? tn[i] - tn[i - 1] : 1.0, ease: i ? 'inOutSine' : 'inOutCubic', push: 0 })))
        .concat([{ at: c.handoff - 0.3, x: 960, y: 560, s: 1.0, dur: 1.1 }]));
      S.fromTo('#pl-track', { '--line': 0 }, { '--line': 1 }, { at: t0 - 0.4, dur: 1.0, ease: 'inOutCubic' });
      tks.forEach((n, i) => {
        const tt = t0 - 0.2 + i * 0.1;
        S.fadeIn(n.querySelector('.tk-n'), { at: tt, dur: 0.3 });
        S.fromTo(n.querySelector('.tk-i'), { opacity: 0, scale: 0.5, rotate: -30 }, { opacity: 1, scale: 1, rotate: 0 }, { at: tt, dur: 0.45, ease: 'outBack' });
        S.rise(n.querySelector('.tk-t'), { at: tt + 0.08, dist: 10, dur: 0.35 });
      });
      tks.forEach((n, i) => {                                      // … seven: counted off
        const numEl = n.querySelector('.tk-n'), tt = c.seven + 2.0 + i * 0.18;
        S.fromTo(numEl, { scale: 1 }, { scale: 1.8 }, { at: tt, dur: 0.12, ease: 'outQuad' });
        S.to(numEl, { scale: 1 }, { at: tt + 0.12, dur: 0.3, ease: 'outBack' });
        S.fromTo(n.querySelector('.tk-i > .ph'), { rotate: 0 }, { rotate: -14 }, { at: tt, dur: 0.12, ease: 'outQuad' });
        S.to(n.querySelector('.tk-i > .ph'), { rotate: 0 }, { at: tt + 0.12, dur: 0.35, ease: 'outBack' });
        S.sfx('pop', tt, { n: i, g: 0.3, pan: -0.5 + i / 6 });
      });
      // the baton: one frame that travels from artifact to artifact, on each phase's name
      const baton = S.$('#pl-baton'), PADX = 16, PADY = 8;
      const bx = (i) => ({ x: fbs[i].x - PADX, y: fbs[i].y - PADY, w: fbs[i].w + 2 * PADX, h: fbs[i].h + 2 * PADY });
      S.fromTo(baton, { opacity: 0, x: bx(0).x, y: bx(0).y - 40, width: bx(0).w + 'px', height: bx(0).h + 'px' }, { opacity: 1, x: bx(0).x, y: bx(0).y, width: bx(0).w + 'px', height: bx(0).h + 'px' }, { at: tName(0) - 0.1, dur: 0.35, ease: 'outBack' });
      tks.forEach((n, i) => {
        const tt = tName(i), icon = n.querySelector('.tk-i > .ph');
        S.fromTo(n, { '--on': 0 }, { '--on': 1 }, { at: tt, dur: 0.3 });
        S.fromTo(n.querySelector('.tk-f'), { opacity: 0, '--hot': 1 }, { opacity: 1, '--hot': 1 }, { at: tt + 0.12, dur: 0.3 });
        S.fromTo(icon, { y: 0 }, { y: -12 }, { at: tt, dur: 0.14, ease: 'outQuad' });
        S.to(icon, { y: 0 }, { at: tt + 0.14, dur: 0.4, ease: 'outBack' });
        if (i > 0) {
          const a = bx(i - 1), b = bx(i), tm = tt - 0.3;
          S.to(baton, { x: b.x, width: b.w + 'px', height: b.h + 'px' }, { at: tm, dur: 0.42, ease: 'inOutCubic' });
          S.to(baton, { y: Math.max(a.y, b.y) + 34 }, { at: tm, dur: 0.2, ease: 'outQuad' });      // it dips as it is handed over
          S.to(baton, { y: b.y }, { at: tm + 0.2, dur: 0.24, ease: 'outBack' });
          draw(S, hops[i - 1], tm, 0.4, { quiet: true });
          S.to(tks[i - 1].querySelector('.tk-f'), { '--hot': 0 }, { at: tm, dur: 0.3 });
        }
        S.sfx('pop', tt, { n: i, g: 0.5, pan: -0.5 + i / 6 });
      });
      S.mark('pipeline.names', c.names);
      // what the next phase has to read, growing in step with the baton
      const rows = S.$$('.ctx-row');
      S.rise('.ctx-k', { at: c.names - 0.3, dist: 12, dur: 0.4 });
      S.rise(rows[0], { at: c.names - 0.2, dist: 16, dur: 0.45 });
      S.rise(rows[1], { at: c.names - 0.1, dist: 16, dur: 0.45 });
      S.fromTo('.ctx-one', { scaleX: 0 }, { scaleX: 1 }, { at: tName(0), dur: 0.4, ease: 'outBack' });
      tks.forEach((n, i) => {
        const tt = tName(i);
        if (i) { S.to('.ctx-one', { scaleX: 0.86 }, { at: tt - 0.12, dur: 0.12 }); S.to('.ctx-one', { scaleX: 1 }, { at: tt, dur: 0.3, ease: 'outBack' }); }
        if (i) S.to(ctxHist, { '--w': ((i + 1) / 7) * 100 }, { at: tt, dur: 0.45, ease: 'outCubic' });
        else S.fromTo(ctxHist, { '--w': 0 }, { '--w': 100 / 7 }, { at: tt, dur: 0.45, ease: 'outCubic' });
      });
      S.fadeIn('.ctx-src', { at: c.names + 1.0, dur: 0.5 });
      mark(S, lay.chrome.querySelector('.sec-title .mk'), c.handoff + 1.0);
      S.to(baton, { opacity: 0 }, { at: c.handoff + 0.2, dur: 0.4 });
      S.to(tks[6].querySelector('.tk-f'), { '--hot': 0 }, { at: c.handoff + 0.2, dur: 0.4 });
      S.fromTo('.ctx-one', { '--pulse': 0 }, { '--pulse': 1 }, { at: c.handoff + 0.9, dur: 0.25 });
      S.to('.ctx-one', { '--pulse': 0 }, { at: c.handoff + 1.15, dur: 0.5 });
      jot(S, '.ctx-n2', c.handoff + 1.6, { rot: -3 });
      S.fromTo(ctxHist, { '--pulse': 0 }, { '--pulse': 1 }, { at: c.handoff + 2.9, dur: 0.25 });
      S.to(ctxHist, { '--pulse': 0 }, { at: c.handoff + 3.15, dur: 0.5 });
      jot(S, '.ctx-n1', c.handoff + 3.2, { rot: -3 });
    }

    /* ═════════════════════════════ S5 · BUDGET ROUTER ═════════════════════════════ */
    {
      const S = scene('s-router'), c = S.c, lay = L.router;
      camera(S, lay, [
        { at: 0, k: 'two', x: 960, y: 540, s: 1.0 },
        { at: c.two + 2.2, k: 'two', x: 900, y: 510, s: 1.06, dur: 1.0 },
        { at: c.two + 3.7, k: 'two', x: 1020, y: 510, s: 1.06, dur: 1.0 },
        { at: c.model - 0.55, k: 'model', x: 960, y: 540, s: 1.0 },
        { at: c.model + 1.4, k: 'model', x: 560, y: 520, s: 1.2, dur: 1.0 },
        { at: c.model + 4.0, k: 'model', x: 1140, y: 560, s: 1.05, dur: 1.0 },
        { at: c.model + 6.1, k: 'model', x: 960, y: 560, s: 1.02, dur: 1.0 },
        { at: c.token - 0.55, k: 'token', x: 600, y: 540, s: 1.16 },
        { at: c.token + 1.6, k: 'token', x: 1000, y: 520, s: 1.04, dur: 1.0 },
        { at: c.token + 4.6, k: 'token', x: 1010, y: 560, s: 1.05, dur: 1.2 },
      ].concat(S.has('data') ? [
        { at: c.data - 0.55, k: 'data', x: 960, y: 520, s: 1.0 },
        { at: c.data + 4.8, k: 'data', x: 1000, y: 500, s: 1.04, dur: 1.2 },
        { at: c.weak - 0.55, k: 'weak', x: 760, y: 540, s: 1.1 },
        { at: c.weak + 4.5, k: 'weak', x: 1040, y: 560, s: 1.02, dur: 1.2 },
      ] : []).concat([
        { at: c.ask - 0.55, k: 'ask', x: 960, y: 560, s: 1.0 },
        { at: c.ask + 2.9, k: 'ask', x: 930, y: 572, s: 1.06, dur: 1.2 },
        { at: c.learned - 0.5, k: 'learn', x: 960, y: 540, s: 1.0 },
        { at: c.learned + 1.0, k: 'learn', x: 900, y: 470, s: 1.08, dur: 0.9 },
        { at: c.learned + 2.8, k: 'learn', x: 990, y: 560, s: 1.04, dur: 0.9 },
        { at: c.acc - 0.55, k: 'acc', x: 480, y: 500, s: 1.3 },                  // close on the number
        { at: c.acc + 3.0, k: 'acc', x: 960, y: 540, s: 1.0, dur: 1.1 },
        { at: c.acc + 5.1, k: 'acc', x: 1000, y: 575, s: 1.04, dur: 1.0 },
      ]).concat(S.has('perphase') ? [{ at: c.perphase - 0.55, k: 'phase', x: 960, y: 540, s: 1.0 }, { at: c.perphase + 2.3, k: 'phase', x: 960, y: 520, s: 1.06, dur: 1.1 }] : []));

      // the salient idea: two small controllers, two questions
      const twoHead = lay.chrome.querySelector('.two-head'), brHead = lay.chrome.querySelector('.br-head');
      chapter(S, twoHead, { hold: 0.9 });
      S.to(twoHead, { opacity: 0 }, { at: c.model - 0.5, dur: 0.35, ease: 'inQuad' });
      words(S, brHead.querySelector('.sec-title'), c.model - 0.1, { stagger: 0.06 });
      S.fromTo('#two-track', { opacity: 0, scaleX: 0.2 }, { opacity: 1, scaleX: 1 }, { at: 1.5, dur: 0.7, ease: 'inOutCubic' });
      S.fadeIn('.two-note', { at: 2.0, dur: 0.5 });
      // a playhead walks the seven phases while the two questions arrive: they are asked once per phase
      const stTwo = lay.at('two'), tw = boxIn(S.$('#two-track'), stTwo), tx = twoTicks.map((n) => boxIn(n, stTwo).cx - tw.x);
      S.fromTo(twoDot, { opacity: 0, x: tx[0] }, { opacity: 1, x: tx[0] }, { at: 2.1, dur: 0.3 });
      twoTicks.forEach((n, i) => {
        const tt = 2.4 + i * 0.5;
        if (i) S.to(twoDot, { x: tx[i] }, { at: tt - 0.3, dur: 0.3, ease: 'inOutCubic' });
        S.fromTo(n, { '--on': 0 }, { '--on': 1 }, { at: tt, dur: 0.15 });
        S.to(n, { '--on': 0 }, { at: tt + 0.4, dur: 0.3 });
      });
      S.$$('.two-col').forEach((col, i) => {
        const tt = S.w('two', 'one', [2.5, 3.9][i], i);              // "one for how much, one for how to behave"
        S.fromTo(col.querySelector('.ph'), { opacity: 0, scale: 0.4, rotate: -40 }, { opacity: 1, scale: 1, rotate: 0 }, { at: tt, dur: 0.5, ease: 'outBack' });
        words(S, col.querySelector('.stmt'), tt + 0.08, { stagger: 0.1 });
        S.rise(col.querySelector('.kicker'), { at: tt + 0.5, dist: 12, dur: 0.4 });
        S.sfx('pop', tt, { n: i * 2, g: 0.6, pan: i ? 0.3 : -0.3 });
      });

      // the model, and what it learned from
      const heroes = S.$$('.br-model .hero'), n2b = heroes[0].querySelector('.hero-n');
      const tM = S.w('model', 'two-billion-parameter', 2.2) - 0.3;
      S.fromTo(heroes[0], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: tM, dur: 0.6 });
      S.fromTo(n2b, { scale: 0.8 }, { scale: 1 }, { at: tM, dur: 0.7, ease: 'outBack' });
      S.type(heroes[0].querySelector('.hero-s'), 'Qwen3.5-2B + LoRA', { at: tM + 0.8, dur: 0.8 });
      S.sfx('type', tM + 0.8, { dur: 0.8, n: 10, g: 0.4 });
      S.fromTo('.hero-rule', { scaleY: 0 }, { scaleY: 1 }, { at: c.model + 4.0, dur: 0.5 });
      S.fromTo(heroes[1], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: c.model + 4.3, dur: 0.6 });
      S.count('#br-n', 0, D.routerFacts.trainProjects, { at: c.model + 4.3, dur: 1.7, sep: true });
      S.sfx('low', tM, { g: 0.45 }).sfx('low', c.model + 4.3, { g: 0.45 });
      // 51 squares fill with the count, then stream into the model
      const stM = lay.at('model'), target = boxIn(n2b, stM);
      blocks.forEach((b, i) => {
        const bb = boxIn(b, stM), tt = c.model + 4.35 + (i / 51) * 1.6;
        S.fromTo(b, { opacity: 0, scale: 0.2 }, { opacity: 1, scale: 1 }, { at: tt, dur: 0.2, ease: 'outBack' });
        const fly = c.model + 6.25 + (i % 17) * 0.035 + Math.floor(i / 17) * 0.12;
        S.fromTo(b, { x: 0, y: 0 }, { x: target.cx - bb.cx, y: target.cy - bb.cy }, { at: fly, dur: 0.6, ease: 'inCubic' });
        S.to(b, { opacity: 0, scale: 0.4 }, { at: fly + 0.42, dur: 0.18 });
      });
      S.fadeIn('.blocks-k', { at: c.model + 5.0, dur: 0.4 });
      S.to('.blocks-k', { opacity: 0 }, { at: c.model + 6.3, dur: 0.3 });
      S.fromTo(n2b, { color: 'rgba(25,23,19,1)' }, { color: 'rgba(90,51,214,1)' }, { at: c.model + 6.7, dur: 0.6 });
      S.to(n2b, { scale: 1.07 }, { at: c.model + 6.75, dur: 0.25, ease: 'outQuad' });
      S.to(n2b, { scale: 1 }, { at: c.model + 7.0, dur: 0.5, ease: 'outBack' });
      S.sfx('type', c.model + 6.3, { dur: 0.9, n: 14, g: 0.4 });

      // it reads the workspace …
      S.fromTo('.br-reads', { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: c.token - 0.1, dur: 0.5 });
      const reads = S.$$('.br-reads .tree-row'), ry = reads.map((r) => r.offsetTop);
      S.rise(reads, { at: c.token + 0.2, dist: 10, dur: 0.3, stagger: 0.08 });
      const tScan = S.w('token', 'reads', 1.2) - 0.25, tWrite = S.w('token', 'writes', 2.5) - 0.35;   // "it reads the workspace and writes …"
      S.fromTo(scan, { opacity: 0, y: ry[0] }, { opacity: 1, y: ry[0] }, { at: tScan, dur: 0.2 });
      reads.forEach((r, i) => { if (i) S.to(scan, { y: ry[i] }, { at: tScan + i * 0.3, dur: 0.22, ease: 'inOutCubic' }); S.sfx('type', tScan + 0.05 + i * 0.3, { dur: 0.1, n: 2, g: 0.4 }); });
      S.to(scan, { opacity: 0 }, { at: tScan + 0.3 * reads.length + 0.1, dur: 0.3 });
      S.fadeIn('.br-reads .next', { at: tScan + 0.9, dur: 0.4 });
      draw(S, brArrow, tWrite - 0.3, 0.45);
      // … and writes one control token: the ticket prints line by line, each field on its word
      const ticket = S.$('#br-ticket'), PR = [0.283, 0.463, 0.625, 0.788, 1.0];
      const tf = ['tokens,', 'time,', 'thinking,', 'repairs.'].map((w, i) => S.w('token', w, [4.8, 5.6, 6.3, 7.1][i]) + 0.2 - c.token);
      S.fromTo(ticket, { opacity: 0, x: 40, '--print': PR[0] }, { opacity: 1, x: 0, '--print': PR[0] }, { at: tWrite, dur: 0.6 });
      S.fromTo('.stamp', { opacity: 0, scale: 1.9, rotate: -18 }, { opacity: 1, scale: 1, rotate: -4 }, { at: tWrite + 0.7, dur: 0.24, ease: 'inQuad' });
      S.sfx('low', tWrite + 0.9, { g: 0.5 });
      S.fromTo($$('#br-raw span'), { opacity: 0, y: 10 }, { opacity: 1, y: 0 }, { at: tWrite + 1.0, dur: 0.2, stagger: 0.2 });
      S.sfx('type', tWrite + 1.0, { dur: 1.0, n: 12, g: 0.6 });
      tf.forEach((d, i) => {
        const f = flds[i], opts = Array.from(f.querySelectorAll('.opt')), pick = f.querySelector('.opt.pick'), sel = f.querySelector('.sel');
        S.to(ticket, { '--print': PR[i + 1] }, { at: c.token + d - 0.45, dur: 0.4, ease: 'outCubic' });
        S.fromTo(f, { opacity: 0, y: -16 }, { opacity: 1, y: 0 }, { at: c.token + d - 0.3, dur: 0.35 });
        // the selector runs along the options and stops on the choice
        S.fromTo(sel, { opacity: 0, x: opts[0].offsetLeft, width: opts[0].offsetWidth + 'px' }, { opacity: 1, x: opts[0].offsetLeft, width: opts[0].offsetWidth + 'px' }, { at: c.token + d - 0.15, dur: 0.12 });
        S.to(sel, { x: pick.offsetLeft, width: pick.offsetWidth + 'px' }, { at: c.token + d - 0.02, dur: 0.38, ease: 'inOutCubic' });
        S.fromTo(pick, { '--on': 0 }, { '--on': 1 }, { at: c.token + d + 0.25, dur: 0.15 });
        S.sfx('pop', c.token + d + 0.3, { n: i + 2, g: 0.5 });
      });

      if (S.has('data')) {
        const hs = S.$$('.br-data .hero'), ar = S.$$('.br-data .fun-arrow');
        S.fadeIn('.br-data .src', { at: c.data + 0.3, dur: 0.5 });
        S.fromTo(hs[0], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: c.data + 2.2, dur: 0.5 });
        S.count('#fun-1', 0, D.hackrep.repos, { at: c.data + 2.2, dur: 1.6, sep: true });
        S.fromTo(ar[0], { opacity: 0, x: -40 }, { opacity: 1, x: 0 }, { at: c.data + 4.9, dur: 0.4 });
        S.fromTo(hs[1], { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: c.data + 5.2, dur: 0.5 });
        S.count('#fun-2', D.hackrep.repos, D.hackrep.valid, { at: c.data + 5.2, dur: 1.6, sep: true });
        S.fromTo(ar[1], { opacity: 0, x: -40 }, { opacity: 1, x: 0 }, { at: c.data + 7.7, dur: 0.4 });
        S.fromTo(hs[2], { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { at: c.data + 8.0, dur: 0.5, ease: 'outBack' });
        S.sfx('low', c.data + 2.2, { g: 0.4 }).sfx('low', c.data + 5.2, { g: 0.4 }).sfx('pop', c.data + 8.0, { n: 6, g: 0.6 });

        jot(S, '.cen-n0', c.weak + 0.3, { rot: -3 });
        S.fadeIn('.cen-k', { at: c.weak + 2.0, dur: 0.4 });
        S.fadeIn('.cen-bars', { at: c.weak + 1.9, dur: 0.3 });
        S.fromTo(cens, { '--p': 0 }, { '--p': 1 }, { at: c.weak + 2.1, dur: 0.7, stagger: 0.12, ease: 'outBack' });
        S.fromTo('.cen-line', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, { at: c.weak + 4.9, dur: 0.7 });
        S.fromTo(cens, { '--k': 0 }, { '--k': 1 }, { at: c.weak + 5.7, dur: 0.4, stagger: 0.08 });
        words(S, S.$('.cen-side .stmt'), c.weak + 4.9, { stagger: 0.09 });
        mark(S, '.cen-side .mk', c.weak + 6.4);
        jot(S, '.cen-side .hand', c.weak + 8.4, { rot: -3 });
        S.fadeIn('.cen-side .src', { at: c.weak + 2.4, dur: 0.5 });
      }

      // ask, wait, answer
      S.rise('.br-ask .kicker', { at: c.ask, dist: 12, dur: 0.4 });
      words(S, S.$('.br-ask .stmt'), S.w('ask', 'which', 1.0) - 0.2, { stagger: 0.085 });
      mark(S, '.br-ask .mk', S.w('ask', 'most?', 2.3) + 0.1);
      S.fromTo(askSpans, { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, { at: c.ask + 2.6, dur: 0.3, stagger: 0.05 });
      // a cursor that cannot make up its mind, until the answer
      const ab = askSpans.map((n) => boxIn(n, S.$('#ask-opts')));
      const hop = [0, 2, 4, 6, 3, 5, 4], t1 = c.ask + 3.0, each = (c.learned - 0.5 - t1) / hop.length;
      S.fromTo(askRing, { opacity: 0, x: ab[0].x - 14, width: ab[0].w + 28 + 'px' }, { opacity: 1, x: ab[0].x - 14, width: ab[0].w + 28 + 'px' }, { at: t1 - 0.15, dur: 0.15 });
      hop.forEach((h, i) => { if (i) { S.to(askRing, { x: ab[h].x - 14, width: ab[h].w + 28 + 'px' }, { at: t1 + i * each - each * 0.4, dur: each * 0.8, ease: 'inOutCubic' }); S.sfx('pop', t1 + i * each, { n: h, g: 0.3 }); } });
      S.mark('router.ask', c.ask).mark('router.answer', c.learned);

      S.fadeIn('.div-head', { at: c.learned - 0.1, dur: 0.4 });
      dvs.forEach((n, i) => {
        const phase = D.tokenTier[i].phase;
        S.fromTo(n, { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, { at: c.learned - 0.05 + i * 0.06, dur: 0.3 });
        S.fromTo(n, { '--p': 0 }, { '--p': 1 }, { at: c.learned + 0.1 + i * 0.07, dur: 0.9, ease: 'outBack' });
        if (phase !== 'research') S.to(n, { opacity: 0.3 }, { at: c.learned + 1.3, dur: 0.3 });
        if (phase === 'coding') S.to(n, { opacity: 1 }, { at: c.learned + 3.0, dur: 0.3 });
      });
      jot(S, '#br-div .hand.l', c.learned + 1.6, { rot: -5 });
      jot(S, '#br-div .hand.r', c.learned + 3.3, { rot: -5 });
      S.fadeIn('.br-learn .src', { at: c.learned + 0.6, dur: 0.5 });

      // the surprise
      S.fromTo('.br-acc .hero', { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: c.acc + 0.5, dur: 0.5 });
      S.count('#br-em', 0, 93, { at: c.acc + 0.7, dur: 1.7, suffix: '%' });
      S.fromTo('#br-em', { scale: 1 }, { scale: 1.06 }, { at: c.acc + 2.4, dur: 0.15, ease: 'outQuad' });
      S.to('#br-em', { scale: 1 }, { at: c.acc + 2.55, dur: 0.5, ease: 'outBack' });
      S.sfx('bell', c.acc + 2.4, { g: 0.6 });
      abs.forEach((n, i) => {
        const tt = c.acc + (i === 0 ? 3.1 : 3.6 + i * 0.45);
        S.fromTo(n, { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: tt, dur: 0.4 });
        S.fromTo(n, { '--p': 0 }, { '--p': 1 }, { at: tt + 0.1, dur: i ? 0.7 : 0.9, ease: i ? 'outCubic' : 'outBack' });
        if (i) S.sfx('pop', tt + 0.6, { n: 3 - i, g: 0.35 });
      });
      S.fromTo(gapLine, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1 }, { at: c.acc + 4.0, dur: 0.9, ease: 'inOutCubic' });
      S.rise('.acc-note', { at: c.acc + 5.5, dist: 12, dur: 0.45 });
      S.mark('router.acc', c.acc);

      if (S.has('perphase')) {
        const dbs = S.$$('.db');
        S.fadeIn(dbs, { at: c.perphase + 0.1, dur: 0.3, stagger: 0.06 });
        S.fromTo(dbs, { '--p': 0 }, { '--p': 1 }, { at: c.perphase + 0.5, dur: 0.9, stagger: 0.12, ease: 'outBack' });
        dbs.forEach((n, i) => S.sfx('pop', c.perphase + 1.1 + i * 0.12, { n: i, g: 0.3 }));
        S.fromTo('.dumb-line', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, { at: c.perphase + 2.6, dur: 0.8 });
        S.fadeIn('.br-phase .src', { at: c.perphase + 0.8, dur: 0.5 });
      }
    }

    /* ═════════════════════════════ S6 · DEADLINE FRAMER ═════════════════════════════ */
    {
      const S = scene('s-framer'), c = S.c, lay = L.framer;
      const dfHead = lay.chrome.querySelector('.df-head');
      chapter(S, dfHead, { hold: 0.85 });
      S.to(dfHead, { opacity: 0 }, { at: c.loop - 0.5, dur: 0.35, ease: 'inQuad' });
      camera(S, lay, [
        { at: 0, k: 'main', x: 960, y: 540, s: 1.0 },
        { at: c.second + 0.7, k: 'main', x: 940, y: 520, s: 1.3, dur: 1.1 },      // the gauge is the symbol
        { at: c.combine - 0.4, k: 'main', x: 900, y: 545, s: 1.03, dur: 1.1 },
        { at: c.combine + 3.2, k: 'main', x: 930, y: 530, s: 1.06, dur: 1.0 },
        { at: c.write - 0.2, k: 'main', x: 1020, y: 556, s: 1.05, dur: 1.1 },
        { at: c.narrow - 0.3, k: 'main', x: 960, y: 560, s: 1.0, dur: 1.0 },
        { at: c.narrow + 3.0, k: 'main', x: 1000, y: 575, s: 1.05, dur: 1.2 },
        { at: c.loop - 0.55, k: 'loop', x: 960, y: 560, s: 1.0 },
        { at: c.slogan - 0.6, k: 'slogan', x: 960, y: 540, s: 1.0 },
      ]);
      // the gauge sweeps once — this is what "pressure" will mean — then waits
      const tSet = c.combine + 3.9, tUp = c.narrow + 1.4, tScope = c.narrow + 4.3;
      S.fromTo('.df-gauge', { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, { at: c.second + 0.6, dur: 0.5 });
      S.fromTo(needle, { rotate: needleAt(0) }, { rotate: needleAt(4) }, { at: c.second + 1.0, dur: 0.75, ease: 'inOutCubic' });
      S.to(needle, { rotate: needleAt(0) }, { at: c.second + 1.8, dur: 0.75, ease: 'inOutCubic' });
      S.to(needle, { rotate: needleAt(2) }, { at: tSet, dur: 0.7, ease: 'outBack' });
      S.to(needle, { rotate: needleAt(3) }, { at: tUp, dur: 0.6, ease: 'outBack' });
      segs.forEach((sg, k) => {
        S.fromTo(sg, { opacity: 0.3 }, { opacity: 1 }, { at: c.second + 1.0 + k * 0.15, dur: 0.12 });
        S.to(sg, { opacity: 0.3 }, { at: c.second + 1.85 + (4 - k) * 0.15, dur: 0.25 });
        if (k === 2) { S.to(sg, { opacity: 1 }, { at: tSet + 0.2, dur: 0.3 }); S.to(sg, { opacity: 0.3 }, { at: tUp + 0.1, dur: 0.3 }); }
        if (k === 3) S.to(sg, { opacity: 1 }, { at: tUp + 0.1, dur: 0.3 });
      });
      const tN1 = S.w('second', 'No', 2.9) - 0.15, tN2 = S.w('second', 'No', 4.5, 1) - 0.15;   // "No training. No model call."
      jot(S, '.df-n1', tN1, { rot: -4 });
      mark(S, '.df-n1 .mk', tN1 + 0.25, { quiet: true });
      jot(S, '.df-n2', tN2, { rot: 3 });
      mark(S, '.df-n2 .mk', tN2 + 0.25, { quiet: true });
      S.to('.df-n1, .df-n2', { opacity: 0, y: 30 }, { at: c.combine + 0.15, dur: 0.35, ease: 'inQuad' });   // make room for the prompt and the reading
      S.fadeIn('.g-tier', { at: tSet + 0.3, dur: 0.4 });
      const tierN = S.$('#g-tier-n');
      S.call((p, lt, t) => setText(tierN, S.now(t) < tUp + 0.2 ? '2' : '3'), { at: 0, dur: S.dur });
      S.rise('.g-scope.a', { at: tSet + 0.4, dist: 14, dur: 0.45 });
      mark(S, '.g-scope.a .mk', c.narrow + 3.1);
      S.to('.g-scope.a', { opacity: 0, y: -14 }, { at: tScope - 0.25, dur: 0.25, ease: 'inQuad' });
      S.fromTo('.g-scope.b', { opacity: 0, y: 16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, { at: tScope, dur: 0.45, ease: 'outBack' });
      S.sfx('pop', tSet, { n: 2, g: 0.6 }).sfx('low', tUp, { g: 0.5 });

      // inputs: the token, against the spend log, phase by phase
      S.rise('.df-in .k-tok', { at: c.combine + 0.1, dist: 12, dur: 0.4 });
      const tokEl = S.$('.df-tok'), tokLines = ['<PHASE_CODING><TOKEN_1.25X>', '<TIME_HIGH><THINK_LOW><REPAIR_1>'];
      S.call((p) => { const n = Math.round(p * (tokLines[0].length + tokLines[1].length)); setText(tokEl, tokLines[0].slice(0, n) + (n > tokLines[0].length ? '\n' + tokLines[1].slice(0, n - tokLines[0].length) : '')); }, { at: c.combine + 0.25, dur: 0.9 });
      S.sfx('type', c.combine + 0.25, { dur: 0.9, n: 12, g: 0.5 });
      S.rise('.df-in .log-k', { at: c.combine + 1.3, dist: 12, dur: 0.4 });
      const logs = S.$$('.log-row'), used = [0.86, 1.0, 0.92, 1.0], over = [0.86, 1.0, 1.22, 1.5];
      logs.forEach((r, i) => {
        const bar = r.querySelector('.log-used'), tt = c.combine + 1.5 + i * 0.42;
        S.fromTo(r, { opacity: 0, x: -20 }, { opacity: 1, x: 0 }, { at: tt, dur: 0.3 });
        S.fromTo(bar, { '--u': 0 }, { '--u': used[i] }, { at: tt + 0.1, dur: 0.4, ease: 'outCubic' });
        S.sfx('pop', tt + 0.45, { n: i, g: 0.3 });
        if (over[i] !== used[i]) {
          S.to(bar, { '--u': over[i] }, { at: c.narrow + 0.2 + i * 0.1, dur: 0.7, ease: 'outBack' });
          S.fromTo(bar, { backgroundColor: '#8F8A7C' }, { backgroundColor: '#CF4326' }, { at: c.narrow + 0.3 + i * 0.1, dur: 0.5 });
        }
      });
      S.rise('.log-sum.a', { at: c.combine + 3.2, dist: 10, dur: 0.4 });
      S.to('.log-sum.a', { opacity: 0 }, { at: c.narrow + 0.5, dur: 0.2 });
      S.fromTo('.log-sum.b', { opacity: 0, scale: 0.8, rotate: -6 }, { opacity: 1, scale: 1, rotate: -2 }, { at: c.narrow + 0.7, dur: 0.35, ease: 'outBack' });
      draw(S, dfArrow1, c.combine + 3.4, 0.4);

      // output: a plain sentence in the prompt, typed
      S.fromTo('.df-prompt', { opacity: 0, x: 30 }, { opacity: 1, x: 0 }, { at: c.combine + 0.6, dur: 0.6 });
      const dots = S.$('.pp-wait span');
      S.call((p, lt, t) => setText(dots, '.'.repeat(1 + (Math.floor(Math.max(0, t - S.sc.start) * 2.5) % 3))), { at: 0, dur: S.dur });
      draw(S, dfArrow2, c.write + 0.3, 0.4);
      S.to('.pp-wait', { opacity: 0 }, { at: c.write + 0.7, dur: 0.2 });
      const reveal = (node, at, each) => splitDeep(node).forEach((w, i) => S.fromTo(w, { opacity: 0 }, { opacity: 1 }, { at: at + i * each, dur: 0.06 }));
      reveal(S.$('.pp-a'), c.write + 0.95, 0.075);
      S.sfx('type', c.write + 0.95, { dur: 1.6, n: 22, g: 0.5 });
      S.fadeIn('.pp-cmd', { at: c.write + 2.9, dur: 0.3 });
      jot(S, '.df-n3', S.w('write', 'No', 3.6) - 0.2, { rot: -2 });        // "No numbers."
      mark(S, '.df-n3 .mk', S.w('write', 'numbers.', 4.25) + 0.25);
      S.to('.pp-a', { opacity: 0 }, { at: c.narrow + 4.4, dur: 0.25 });
      reveal(S.$('.pp-b'), c.narrow + 4.65, 0.06);
      S.sfx('type', c.narrow + 4.65, { dur: 1.0, n: 14, g: 0.5 });

      // together: one loop per phase — a token goes round, faster and faster
      const loopHead = S.$('.loop-head');
      words(S, loopHead.querySelector('.sec-title'), c.loop, { stagger: 0.08 });
      LN.forEach((n, i) => {
        S.fromTo(n, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, { at: c.loop + 0.1 + i * 0.12, dur: 0.4, ease: 'outBack' });
        draw(S, loopArrows[i], c.loop + 0.4 + i * 0.18, 0.3, { quiet: i > 0 });
      });
      S.fromTo('.loop-center', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, { at: c.loop + 0.5, dur: 0.5, ease: 'outBack' });
      const pts = lb.map((b) => [b.cx, b.cy]), laps = [1.0, 0.8, 0.62, 0.5, 0.42, 0.36, 0.3], lap0 = c.loop + 1.0;
      const lapStart = laps.reduce((acc, d) => acc.concat(acc[acc.length - 1] + d), [lap0]);
      const loopN = S.$('#loop-n'), loopP = S.$('#loop-p');
      S.fromTo(loopTok, { opacity: 0 }, { opacity: 1 }, { at: lap0 - 0.15, dur: 0.15 });
      S.call((p, lt, t) => {
        const local = S.now(t);
        let k = 0;
        while (k < 6 && local >= lapStart[k + 1]) k++;
        const u = clamp01((local - lapStart[k]) / laps[k]), seg = Math.min(3, Math.floor(u * 4)), f = u * 4 - seg;
        const a = pts[seg], b = pts[(seg + 1) % 4], e = EASE.inOutSine(clamp01(f));
        loopTok.style.transform = `translate(${(lerp(a[0], b[0], e) - 13).toFixed(1)}px,${(lerp(a[1], b[1], e) - 13).toFixed(1)}px)`;
        setText(loopN, String(k + 1));
        setText(loopP, D.phases[k].key);
        LN.forEach((n, i) => { const on = seg === i && local >= lap0 ? Math.max(0, 1 - f * 2.2).toFixed(2) : '0'; if (n._on !== on) { n.style.setProperty('--on', on); n._on = on; } });
      }, { at: 0, dur: S.dur });
      S.set(loopN, { scale: 1 }, { at: 0 });
      lapStart.slice(1, 7).forEach((tt, k) => { S.sfx('pop', tt, { n: k + 1, g: 0.4 }); S.fromTo(loopN, { scale: 1.18 }, { scale: 1 }, { at: tt, dur: 0.28, ease: 'outCubic' }); });
      jot(S, '.loop-note', c.loop + 2.5, { rot: -2 });
      S.mark('framer.loop', c.loop);

      // the slogan, second time — now each line names the controller that does it
      sloganLine(S, S.$('.slogan .sg-a'), c.slogan + 0.05, { n: 2 });
      sloganLine(S, S.$('.slogan .sg-b'), c.slogan + 2.2, { n: 4 });
      S.mark('framer.slogan', c.slogan);
    }

    /* ═════════════════════════════ S7 · RESULTS ═════════════════════════════ */
    {
      const S = scene('s-results'), c = S.c, lay = L.results;
      const head = lay.chrome.querySelector('.sec-head');
      chapter(S, head, { hold: 0.9, scale: 1.4 });
      // one headline per finding, swapped word by word
      const titles = Object.keys(rts);
      titles.forEach((k, i) => {
        words(S, rts[k], i === 0 ? 0.15 : c[k] - 0.25, { stagger: 0.06 });
        if (i < titles.length - 1) wordsOut(S, rts[k], c[titles[i + 1]] - 0.6);
      });
      const q4 = S.d.setup / 4, su = ['Twenty', 'Ten', 'One'].map((w, i) => S.w('setup', w, (i + 1) * q4));   // "Twenty real hackathons. Ten other agents. One shared model …"
      camera(S, lay, [
        { at: 0, k: 'setup', x: 960, y: 560, s: 1.0 },
        { at: su[0] - 0.5, k: 'setup', x: 900, y: 560, s: 1.04, dur: 1.0 },
        { at: su[1] - 0.5, k: 'setup', x: 960, y: 565, s: 1.04, dur: 1.0 },
        { at: su[2] - 0.5, k: 'setup', x: 1010, y: 570, s: 1.03, dur: 1.0 },
      ].concat(S.has('eval') ? [{ at: c.eval - 0.55, k: 'eval', x: 860, y: 540, s: 1.06 }, { at: c.eval + 4.9, k: 'eval', x: 960, y: 545, s: 1.04, dur: 1.2 }, { at: c.eval + 7.6, k: 'eval', x: 1000, y: 550, s: 1.03, dur: 1.2 }] : []).concat([
        { at: c.pass - 0.55, k: 'pass', x: 1240, y: 560, s: 1.1 },
        { at: c.pass + 4.2, k: 'pass', x: 900, y: 545, s: 1.04, dur: 1.1 },
        { at: c.tokens - 0.55, k: 'tokens', x: 760, y: 520, s: 1.1 },
        { at: c.tokens + 3.9, k: 'tokens', x: 1000, y: 510, s: 1.03, dur: 1.1 },
        { at: c.novelty - 0.2, k: 'tokens', x: 960, y: 585, s: 1.03, dur: 1.0 },
      ]).concat(S.has('cheaper') ? [{ at: c.cheaper - 0.55, k: 'cheaper', x: 960, y: 540, s: 1.0 }, { at: c.cheaper + 1.6, k: 'cheaper', x: 760, y: 560, s: 1.1, dur: 1.1 }] : [])
        .concat(S.has('stats') ? [{ at: c.stats - 0.55, k: 'stats', x: 880, y: 460, s: 1.08 }, { at: c.stats + 5.3, k: 'stats', x: 840, y: 580, s: 1.06, dur: 1.2 }] : []).concat([
          { at: c.ablation - 0.55, k: 'ablation', x: 880, y: 500, s: 1.1 },
          { at: c.ablation + 2.4, k: 'ablation', x: 1040, y: 570, s: 1.08, dur: 1.0 },
          { at: c.tradeoff - 0.55, k: 'tradeoff', x: 600, y: 540, s: 1.12 },
          { at: c.tradeoff + 4.4, k: 'tradeoff', x: 1040, y: 530, s: 1.02, dur: 1.1 },
        ]).concat(S.has('limits') ? [{ at: c.limits - 0.55, k: 'limits', x: 860, y: 560, s: 1.04 }, { at: c.limits + 5.2, k: 'limits', x: 1000, y: 580, s: 1.04, dur: 1.2 }] : []));

      // twenty hackathons · ten other agents · one model underneath — as things, not only numbers
      const sus = S.$$('.rs-setup .su');
      [1, 2, 3].forEach((k, i) => {
        const tt = su[i] - 0.15;
        S.fromTo(sus[i].querySelector('.hero-n'), { opacity: 0, y: 50, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, { at: tt, dur: 0.5, ease: 'outBack' });
        S.rise(sus[i].querySelector('.kicker'), { at: tt + 0.25, dist: 12, dur: 0.4 });
        S.sfx('low', tt + 0.1, { g: 0.45 });
      });
      S.count('#st-1', 0, 20, { at: su[0] - 0.15, dur: 1.1 });
      suHacks.forEach((n, i) => pop(S, n, su[0] + i * 0.055, { dur: 0.25 }));
      S.sfx('type', su[0], { dur: 1.1, n: 20, g: 0.35 });
      S.count('#st-2', 0, 10, { at: su[1] - 0.15, dur: 0.9 });
      suAgents.forEach((n, i) => pop(S, n, su[1] + (i < 10 ? i * 0.08 : 1.05), { dur: 0.3 }));
      S.sfx('type', su[1], { dur: 0.8, n: 10, g: 0.35 });
      pop(S, '#su-chip', su[2] + 0.2, { from: 0.7 });
      S.fromTo(busPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0 }, { at: su[2] + 0.5, dur: 0.5, stagger: 0.05, ease: 'outCubic' });
      S.fadeIn('.rs-setup .src', { at: su[2] + 1.0, dur: 0.5 });

      if (S.has('eval')) {
        S.$$('.ev').forEach((n, i) => {
          const tt = c.eval + [0.3, 5.3, 8.0][i];
          S.fromTo(n, { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, { at: tt, dur: 0.5 });
          S.fromTo(n.querySelector('.ph'), { rotate: -40, scale: 0.5 }, { rotate: 0, scale: 1 }, { at: tt, dur: 0.6, ease: 'outBack' });
          S.sfx('pop', tt, { n: i * 2, g: 0.5 });
        });
        // blind: the submissions lose their names and get shuffled before they are scored
        const cards = S.$$('#ev-1 i'), slot = (k) => k * 84;
        cards.forEach((cd, k) => S.fromTo(cd, { opacity: 0, x: slot(k), y: 20 }, { opacity: 1, x: slot(k), y: 0 }, { at: c.eval + 0.6 + k * 0.08, dur: 0.3 }));
        [[1.3, [2, 3, 0, 1]], [2.0, [3, 1, 2, 0]]].forEach(([d, order]) => cards.forEach((cd, k) => S.to(cd, { x: slot(order[k]) }, { at: c.eval + d, dur: 0.5, ease: 'inOutCubic' })));
        S.fromTo(cards, { '--p': 0 }, { '--p': 1 }, { at: c.eval + 2.7, dur: 0.6, stagger: 0.1, ease: 'outBack' });
        S.sfx('type', c.eval + 1.3, { dur: 1.2, n: 8, g: 0.35 });
        jot(S, '.ev-note', c.eval + 3.5, { rot: -3 });
        // the gate: two checks, ticked on their words
        S.$$('#ev-2 p').forEach((row, k) => { S.fromTo(row, { opacity: 0, x: -20 }, { opacity: 1, x: 0 }, { at: c.eval + 5.5 + k * 0.15, dur: 0.3 }); mark(S, row.querySelector('.mk'), c.eval + [6.0, 7.3][k]); });
        // pass@1: only the first run counts
        const runs = S.$$('#ev-3 b');
        S.fromTo(runs, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1 }, { at: c.eval + 8.3, dur: 0.3, stagger: 0.1, ease: 'outBack' });
        S.fromTo(runs[0], { '--on': 0 }, { '--on': 1 }, { at: c.eval + 9.5, dur: 0.25 });
        S.to(runs.slice(1), { opacity: 0.3 }, { at: c.eval + 9.8, dur: 0.4 });
        S.sfx('pop', c.eval + 9.5, { n: 5, g: 0.5 });
      }

      // reliability: every agent's first-run pass rate, as bars
      dts.forEach((n, i) => {
        S.fromTo(n, { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: c.pass + 0.2 + i * 0.05, dur: 0.3 });
        S.fromTo(n, { '--p': 0 }, { '--p': 1 }, { at: c.pass + 1.7 + i * 0.07, dur: 0.9, ease: 'outCubic' });
        counter(S, n.querySelector('b'), n._v, c.pass + 1.7 + i * 0.07, 0.9, (x) => x.toFixed(2));
      });
      S.sfx('type', c.pass + 1.7, { dur: 1.4, n: 11, g: 0.35 });
      const tPass = S.w('pass', 'twenty', 5.0) - 0.3;                // "twenty times out of twenty"
      S.fromTo('.rs-pass .hero', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, { at: tPass, dur: 0.5, ease: 'outBack' });
      S.sfx('bell', tPass + 0.2, { g: 0.6 });
      S.mark('results.pass', c.pass);

      // cost: the two bars grow at the same speed; one of them simply stops
      const tbs = S.$$('.tb'), RACE = 2.3, vOurs = 3.72 / 9.17, tRace = c.tokens + 0.9;
      S.fadeIn('.tok-bars > .kicker', { at: c.tokens + 0.2, dur: 0.4 });
      tbs.forEach((n, i) => S.fromTo(n, { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, { at: c.tokens + 0.35 + i * 0.15, dur: 0.35 }));
      const vals = tbs.map((n) => n.querySelector('.tb-val'));
      S.call((p) => {
        const u = p, uo = Math.min(1, u / vOurs);
        tbs[0].style.setProperty('--p', u.toFixed(4)); tbs[1].style.setProperty('--p', uo.toFixed(4));
        setText(vals[0], (9.17 * u).toFixed(2) + 'M'); setText(vals[1], (3.72 * uo).toFixed(2) + 'M');
      }, { at: tRace, dur: RACE });
      S.sfx('pop', tRace + RACE * vOurs, { n: 5, g: 0.6 }).sfx('type', tRace, { dur: RACE, n: 16, g: 0.3 });
      tbs.forEach((n, i) => S.fromTo(n.querySelector('.tb-q'), { opacity: 0, x: 20 }, { opacity: 1, x: 0 }, { at: c.tokens + 2.1 + i * 0.25, dur: 0.35 }));
      jot(S, '.tok-bars .same', c.tokens + 2.9, { rot: -4 });
      draw(S, tokBrace, tRace + RACE + 0.1, 0.6);
      const m59 = S.$('#rs-59');
      S.fromTo('.rs-tok .hero', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, { at: c.tokens + 4.3, dur: 0.5, ease: 'outBack' });
      S.call((p) => setText(m59, '−' + Math.round(59 * p) + '%'), { at: c.tokens + 4.3, dur: 1.2, ease: 'outCubic' });
      S.sfx('bell', c.tokens + 4.7, { g: 0.7 });
      S.fromTo('.nov', { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, { at: c.novelty + 0.2, dur: 0.5 });
      S.fromTo('.nov .ph', { rotate: -90, scale: 0.4 }, { rotate: 0, scale: 1 }, { at: c.novelty + 0.2, dur: 0.6, ease: 'outBack' });
      S.mark('results.tokens', c.tokens);

      if (S.has('cheaper')) {
        S.fadeIn('#sc-svg', { at: c.cheaper + 0.1, dur: 0.4 });
        S.fadeIn(S.$$('#sc-plot .sc-tick, #sc-plot .ax-t'), { at: c.cheaper + 0.2, dur: 0.4 });
        S.fromTo(sps, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1 }, { at: c.cheaper + 0.35, dur: 0.35, stagger: 0.07, ease: 'outBack' });
        draw(S, cheapMark, c.cheaper + 1.8, 0.8);
        jot(S, '.cheap-note', c.cheaper + 3.2, { rot: -2 });
        draw(S, cheapArrow, c.cheaper + 3.5, 0.4, { quiet: true });
      }
      if (S.has('stats')) {
        const sq = S.$$('#wtl i');
        S.fromTo(sq, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 }, { at: c.stats + 0.3, dur: 0.25, stagger: 0.035, ease: 'outBack' });
        S.fromTo(sq, { '--k': 0 }, { '--k': 1 }, { at: c.stats + 3.1, dur: 0.2, stagger: 0.09 });
        S.sfx('type', c.stats + 3.1, { dur: 1.8, n: 20, g: 0.35 });
        S.rise('.rs-stats .stmt', { at: c.stats + 3.2, dist: 20, dur: 0.55 });
        S.fadeIn('.rs-stats > .src', { at: c.stats + 4.8, dur: 0.5 });
        const tJ = S.w('stats', 'Under', 5.9) - 0.3;                 // "Under a second judge …"
        S.fadeIn('.j2', { at: tJ, dur: 0.4 });
        S.fromTo(S.$$('#j2 > div'), { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: tJ + 0.6, dur: 0.45, stagger: 0.6, ease: 'outBack' });
      }

      // ablation: the four cells fill in, each counting up to its score
      S.fadeIn(S.$$('#abl-grid .ag-h, #abl-grid .ag-v, #abl-grid .ag-k'), { at: c.ablation + 0.05, dur: 0.4 });
      [['00', 0.3], ['01', 0.8], ['10', 1.3], ['11', 2.7]].forEach(([k, d]) => {
        const cellNode = S.$(`.ag-c[data-k="${k}"]`), note = cellNode.querySelector('.ag-note'), q = +cellNode.dataset.q, qEl = cellNode.querySelector('.ag-q');
        S.fromTo(cellNode, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }, { at: c.ablation + d, dur: 0.4, ease: 'outBack' });
        S.call((p) => setText(qEl, (70 + (q - 70) * p).toFixed(1)), { at: c.ablation + d, dur: 0.7, ease: 'outCubic' });
        if (note) jot(S, note, c.ablation + d + 0.5, { rot: -5 });
        S.sfx('pop', c.ablation + d, { n: +k[0] * 2 + +k[1], g: 0.45 });
      });
      draw(S, ablBox, c.ablation + 3.0, 0.9);
      S.fadeIn('.rs-abl .src', { at: c.ablation + 0.6, dur: 0.5 });

      // the price is time: two stopwatches, one keeps running
      const clk = S.$$('.clk-row'), cA = S.$('#clk-a'), cB = S.$('#clk-b'), CLK = 2.4, tClk = c.tradeoff + 1.1;
      clk.forEach((n, i) => S.fromTo(n, { opacity: 0, x: -30 }, { opacity: 1, x: 0 }, { at: c.tradeoff + 0.5 + i * 0.15, dur: 0.35 }));
      S.call((p) => {
        const u = p, ua = Math.min(1, u / 0.388);
        clk[0].style.setProperty('--p', ua.toFixed(4)); clk[1].style.setProperty('--p', u.toFixed(4));
        setText(cA, num(458 * ua) + ' s'); setText(cB, num(1180 * u) + ' s');
      }, { at: tClk, dur: CLK });
      S.sfx('type', tClk, { dur: CLK, n: 18, g: 0.3 }).sfx('pop', tClk + CLK * 0.388, { n: 2, g: 0.5 });
      S.fromTo('.rs-trade .hero-n', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, { at: tClk + CLK - 0.3, dur: 0.5, ease: 'outBack' });
      S.rise('.rs-trade .hero > .kicker', { at: c.tradeoff + 0.3, dist: 12, dur: 0.4 });
      S.sfx('low', tClk + CLK - 0.2, { g: 0.5 });
      S.fromTo('.xfer', { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: c.tradeoff + 4.6, dur: 0.5 });
      S.$$('.xfer-row > div').forEach((n, i) => {
        const tt = c.tradeoff + 5.0 + i * 0.3, v = [1.0, 0.8, 0.9][i];
        S.fromTo(n, { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, { at: tt, dur: 0.4 });
        counter(S, n.querySelector('.hero-n'), v, tt, 0.7, (x) => x.toFixed(2));
        S.sfx('pop', tt + 0.6, { n: i + 3, g: 0.4 });
      });
      jot(S, '.xfer-note', c.tradeoff + 6.8, { rot: -3 });
      S.fadeIn('.xfer .src', { at: c.tradeoff + 7.2, dur: 0.5 });
      S.mark('results.tradeoff', c.tradeoff);

      if (S.has('limits')) {
        const tl3 = [['weak', 1.2], ['twenty', 2.4], ['fixed', 3.8]].map(([w, fb]) => S.w('limits', w, fb) - 0.15);
        S.$$('.rs-lim .stmt').forEach((n, i) => { S.fromTo(n, { opacity: 0, x: -50 }, { opacity: 1, x: 0 }, { at: tl3[i], dur: 0.5 }); S.sfx('pop', tl3[i], { n: i, g: 0.4 }); });
        mark(S, '.rs-lim .mk', c.limits + 4.4);
        jot(S, '.lim-note', c.limits + 5.7, { rot: -3 });
      }
    }

    /* ═════════════════════════════ S8 · SHOWCASE ═════════════════════════════ */
    {
      const S = scene('s-showcase'), c = S.c, lay = L.showcase;
      const head = lay.chrome.querySelector('.sec-head');
      chapter(S, head, { hold: 0.7 });
      const each = S.d.list / shows.length;
      const SAY = ['token', 'cloud', 'Code', 'medical', 'trip', 'moonquake', 'meme', 'note-taking'];   // the word each project is announced with
      const ts = shows.map((sh, i) => S.w('list', SAY[i], i * each + 0.15) - 0.15);
      camera(S, lay, [
        { at: 0, k: 'a', x: 960, y: 540, s: 1.0, push: 0.004 },
        { at: c.each - 0.6, k: 'wall', x: 960, y: 572, s: 1.09, dur: 1.0, push: -0.009 },  // then pull back over the wall
      ]);
      // a tab per project; the pill slides to the one on screen
      const tabsEl = S.$('#show-tabs'), pill = S.$('#tab-pill'), tbx = tabs.map((n) => boxIn(n, tabsEl));
      S.fromTo(tabs, { opacity: 0, y: -14 }, { opacity: 1, y: 0 }, { at: c.list - 0.5, dur: 0.3, stagger: 0.04 });
      S.fromTo(pill, { opacity: 0, x: tbx[0].x, width: tbx[0].w + 'px' }, { opacity: 1, x: tbx[0].x, width: tbx[0].w + 'px' }, { at: c.list - 0.15, dur: 0.2 });
      shows.forEach((sh, i) => {
        const lastOne = i === shows.length - 1, tt = ts[i], out = lastOne ? c.each - 0.6 : ts[i + 1] - 0.3, stay = (lastOne ? c.each - 0.3 : ts[i + 1]) - tt;
        if (i) S.to(pill, { x: tbx[i].x, width: tbx[i].w + 'px' }, { at: tt - 0.3, dur: 0.4, ease: 'inOutCubic' });
        S.fromTo(tabs[i], { '--on': 0 }, { '--on': 1 }, { at: tt - 0.12, dur: 0.2 });
        S.to(tabs[i], { '--on': 0 }, { at: out + 0.05, dur: 0.2 });
        S.fromTo(sh.frame, { opacity: 0, x: 120, rotate: 1.5 }, { opacity: 1, x: 0, rotate: 0 }, { at: tt - 0.08, dur: 0.5, ease: 'outCubic' });
        S.to(sh.frame, { opacity: 0, x: -120 }, { at: out, dur: 0.3, ease: 'inQuad' });
        S.fromTo(sh.img, { y: 0 }, { y: -105 }, { at: tt + 0.25, dur: stay - 0.35, ease: 'inOutSine' });   // the page scrolls
        const kids = Array.from(sh.info.children);
        S.fromTo(kids[0], { opacity: 0 }, { opacity: 1 }, { at: tt + 0.05, dur: 0.3 });
        words(S, kids[1], tt + 0.1, { stagger: 0.07, dur: 0.55 });
        words(S, kids[2], tt + 0.3, { stagger: 0.035, dur: 0.5 });
        S.to(sh.info, { opacity: 0, x: -40 }, { at: out, dur: 0.25, ease: 'inQuad' });
        S.sfx('pop', tt, { n: i, g: 0.45, pan: -0.3 });
      });
      S.to('#show-tabs', { opacity: 0, y: -20 }, { at: c.each - 0.6, dur: 0.3 });
      S.to(head, { opacity: 0 }, { at: c.each - 0.6, dur: 0.3, ease: 'inQuad' });
      // every project on one wall, drifting apart
      tiles.forEach((tile, i) => {
        const dx = (tile.col - (perRow - 1) / 2) * 26, dy = tile.row ? 6 : -14, tt = c.each - 0.2 + i * 0.07;
        S.fromTo(tile.node, { opacity: 0, y: tile.row ? 160 : -160, rotate: tile.rot * 3, scale: 0.9 }, { opacity: 1, y: 0, rotate: tile.rot, scale: 1 }, { at: tt, dur: 0.6, ease: 'outBackSoft' });
        S.fromTo(tile.node, { x: 0 }, { x: dx }, { at: tt + 0.6, dur: S.dur - (tt + 0.6), ease: 'linear' });
        S.to(tile.node, { y: dy }, { at: tt + 0.6, dur: S.dur - (tt + 0.6), ease: 'linear' });
      });
      S.fromTo('.wall-text', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }, { at: c.each + 0.45, dur: 0.5, ease: 'outBack' });
      words(S, S.$('.wall-text .stmt'), c.each + 0.65, { stagger: 0.12 });
      S.mark('showcase.wall', c.each);
    }

    /* ═════════════════════════════ S9 · USE IT · CONTRIBUTIONS · END CARD ═════════════════════════════ */
    {
      const S = scene('s-outro'), c = S.c, lay = L.outro;
      const ct = [S.w('contrib', 'seven-phase', 0.75) - 0.25, S.w('contrib', 'two', 2.95) - 0.15, S.w('contrib', 'evidence', 5.55) - 0.25].map((x) => x - c.contrib);   // one contribution per clause
      camera(S, lay, [
        { at: 0, k: 'use', x: 960, y: 540, s: 1.0 },
        { at: c.open + 1.2, k: 'use', x: 930, y: 556, s: 1.03, dur: 1.0 },          // toward the terminal
        { at: c.open + 3.0, k: 'use', x: 990, y: 556, s: 1.03, dur: 1.0 },          // toward the chat
        { at: c.open + 4.6, k: 'use', x: 960, y: 548, s: 1.02, dur: 1.0 },
        { at: c.contrib - 0.55, k: 'contrib', x: 960, y: 420, s: 1.08 },
        { at: c.contrib + ct[1] - 0.3, k: 'contrib', x: 960, y: 520, s: 1.08, dur: 1.0 },
        { at: c.contrib + ct[2] - 0.3, k: 'contrib', x: 960, y: 600, s: 1.08, dur: 1.0 },
        { at: c.contrib + 7.0, k: 'contrib', x: 960, y: 520, s: 1.0, dur: 1.0 },
        { at: c.ships - 0.6, k: 'end', x: 960, y: 540, s: 1.0, push: 0.004 },
      ]);
      // the product, as you would meet it
      chapter(S, S.$('.use .sec-head'), { hold: 0.55, scale: 1.3 });
      S.fromTo('.use-term', { opacity: 0, y: 60 }, { opacity: 1, y: 0 }, { at: 0.5, dur: 0.6 });
      S.fromTo('.chat', { opacity: 0, y: 60 }, { opacity: 1, y: 0 }, { at: 0.7, dur: 0.6 });
      S.fadeIn('.use-note', { at: 1.2, dur: 0.4 });
      S.fromTo(S.$$('.use-note .ph'), { scale: 0.4 }, { scale: 1 }, { at: 1.3, dur: 0.35, stagger: 0.1, ease: 'outBack' });
      S.type('#term-cmd', '/status', { at: c.open + 0.9, dur: 0.45 });
      S.sfx('type', c.open + 0.9, { dur: 0.45, n: 7, g: 0.7 });
      S.fadeIn('.term-pipe', { at: c.open + 1.5, dur: 0.25 });
      S.fadeIn('.term-foot', { at: c.open + 1.7, dur: 0.25 });
      const doneAt = [2.0, 2.5, 3.0, 3.5].map((d) => c.open + d), count = S.$('#term-count');
      S.call((p, lt, t) => {
        const local = S.now(t), k = doneAt.filter((x) => local >= x).length, dotsN = '.'.repeat(1 + (Math.floor(Math.max(0, local) * 4) % 3));
        trows.forEach((s, i) => {
          const st = i < k ? 'done' : i === k ? 'run' : 'wait';
          if (s._st !== st) { s._st = st; s.className = 's ' + st; }
          setText(s, st === 'done' ? '✓ done' : st === 'run' ? '● running' + dotsN : '○ pending');
        });
        setText(count, `${k}/7 phases done`);
      }, { at: 0, dur: S.dur });
      doneAt.forEach((d, i) => S.sfx('pop', d, { n: i, g: 0.4, pan: -0.4 }));
      [2.2, 3.2, 4.0, 5.0].forEach((d, i) => {
        S.fromTo(`.msg.m${i + 1}`, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, { at: c.open + d, dur: 0.4, ease: 'outBack' });
        S.sfx('pop', c.open + d, { n: i + 3, g: 0.4, pan: 0.4 });
      });
      S.fromTo('.m3 .bar', { '--p': 0 }, { '--p': 1 }, { at: c.open + 4.2, dur: 1.4, ease: 'outCubic' });

      // contributions — the last thing said — each with a miniature of what the film showed
      words(S, S.$('.contrib .sec-title'), c.contrib - 0.15, { stagger: 0.07 });
      const lis = S.$$('.contrib li');
      ct.forEach((d, i) => {
        const tt = c.contrib + d;
        S.fromTo(lis[i], { opacity: 0, x: -60 }, { opacity: 1, x: 0 }, { at: tt, dur: 0.5 });
        S.fromTo(lis[i].querySelector('b'), { scale: 0.5 }, { scale: 1 }, { at: tt, dur: 0.6, ease: 'outBack' });
        lis[i].querySelectorAll('.mk').forEach((m, j) => mark(S, m, tt + 0.7 + j * 0.6, { quiet: j > 0 }));
        S.fromTo(lis[i].querySelector('.cf'), { opacity: 0, x: 40 }, { opacity: 1, x: 0 }, { at: tt + 0.3, dur: 0.45 });
        S.sfx('pop', tt, { n: i * 2, g: 0.5 });
      });
      for (let k = 1; k < 7; k++) S.fromTo('#cf-1 .cf-hop', k === 1 ? { '--k': 0 } : null, { '--k': k }, { at: c.contrib + ct[0] + 0.5 + k * 0.28, dur: 0.22, ease: 'inOutCubic' });
      S.fromTo('#cf-2 .cf-needle', { rotate: -72 }, { rotate: 36 }, { at: c.contrib + ct[1] + 0.9, dur: 1.2, ease: 'inOutCubic' });
      S.fromTo($$('#cf-2 .cf-ticket b'), { scaleX: 0 }, { scaleX: 1 }, { at: c.contrib + ct[1] + 0.5, dur: 0.3, stagger: 0.18 });
      S.fromTo('#cf-3 .cf-bar.a', { scaleX: 0 }, { scaleX: 1 }, { at: c.contrib + ct[2] + 0.5, dur: 1.2, ease: 'linear' });
      S.fromTo('#cf-3 .cf-bar.b', { scaleX: 0 }, { scaleX: 1 }, { at: c.contrib + ct[2] + 0.5, dur: 1.2 * 0.41, ease: 'linear' });
      S.fromTo('#cf-3 .cf-lab', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, { at: c.contrib + ct[2] + 1.6, dur: 0.4, ease: 'outBack' });
      S.mark('outro.contrib', c.contrib);

      // end card — one sentence that says what this work is; every word comes up as it is spoken
      S.fromTo('.end-brand', { opacity: 0, y: -30 }, { opacity: 1, y: 0 }, { at: c.ships - 0.1, dur: 0.6 });
      const said = S.ws('ships'), tSaid = S.said('ships', 6.0);
      words(S, S.$('.end-claim'), said ? said.map((x) => x - 0.08) : c.ships + 0.2, { stagger: 0.4, dur: 0.6 });
      // it is said in the middle of the card, then moves up to make room for where to find the work
      S.fromTo('.end-claim', { y: 168 }, { y: 0 }, { at: tSaid + 0.1, dur: 0.8, ease: 'inOutCubic' });
      S.fadeIn('.end-links', { at: tSaid + 0.5, dur: 0.4 });
      S.fromTo(S.$$('.end-links p'), { opacity: 0, y: 24 }, { opacity: 1, y: 0 }, { at: tSaid + 0.6, dur: 0.45, stagger: 0.14, ease: 'outBack' });
      S.rise('.end-credit', { at: tSaid + 1.15, dist: 14, dur: 0.5 });
      S.rise('.end-aff', { at: tSaid + 1.3, dist: 14, dur: 0.5 });
      S.fromTo('.end-venue', { opacity: 0, y: 14 }, { opacity: 1, y: 0 }, { at: tSaid + 1.55, dur: 0.5 });
      S.sfx('bell', tSaid - 0.25, { g: 0.7 });
      S.mark('outro.end', c.ships);
    }

    return tl;
  };
})();
