/* =====================================================================
   Script de Vendas Sapion — motor da apresentação
   Navegação: → ↓ espaço PageDown (avança) · ← ↑ PageUp (volta)
   N notas · M sumário · F tela cheia · B tela preta · nº + Enter
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  // ?shot = modo de captura estática (sem animações), usado para gerar imagens dos slides
  const shotMode = /[?&]shot\b/.test(location.search);
  if (shotMode) document.documentElement.classList.add('shot');
  const reduce = shotMode || matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.documentElement.lang) document.documentElement.lang = 'pt-BR';
  const stage = $('#stage');
  const slides = $$('.slide');
  const N = slides.length;
  const hud = $('#hud'), hudLeft = $('#hudLeft'), hudStage = $('#hudStage'), hudTitle = $('#hudTitle'), hudTime = $('#hudTime');
  const counter = $('#counter'), progressBar = $('#progressBar');
  const notesPanel = $('#notesPanel'), navigator = $('#navigator'), blackout = $('#blackout');

  /* ---------------- Estrutura do script (10 etapas) ---------------- */
  const STAGES = [
    { n: 1, name: 'Introdução', min: 2, max: 3, act: 0 },
    { n: 2, name: 'Introdução ao questionário', min: 1, max: 2, act: 0 },
    { n: 3, name: 'Questionário', min: 5, max: 5, act: 1 },
    { n: 4, name: 'Transição — Pacto', min: 1, max: 2, act: 1 },
    { n: 5, name: 'Diagnóstico', min: 4, max: 5, act: 2 },
    { n: 6, name: 'Nossas realizações', min: 5, max: 6, act: 3 },
    { n: 7, name: 'Método, produto e plataforma', min: 10, max: 12, act: 3 },
    { n: 8, name: 'Ancoragem', min: 2, max: 3, act: 4 },
    { n: 9, name: 'Pacto final', min: 2, max: 3, act: 4 },
    { n: 10, name: 'Fechamento', min: 8, max: 12, act: 4 }
  ];
  const ACTS = [
    { name: 'Conexão', c: '#B6D2F5' },
    { name: 'Descoberta', c: '#8F95F7' },
    { name: 'Consciência', c: '#FFD014' },
    { name: 'Solução', c: '#A260FF' },
    { name: 'Decisão', c: '#05F29B' }
  ];
  const pad2 = n => String(n).padStart(2, '0');
  const fmtTime = s => (s.min === s.max ? `${s.min} min` : `${s.min} a ${s.max} min`);
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  /* ---------------- Encaixe do palco 1920×1080 ---------------- */
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--scale', s);
  }
  addEventListener('resize', fit);
  fit();

  /* ---------------- Ícones oficiais (icons.js) ---------------- */
  function paintIcons(root = document) {
    const lib = window.BRAND_ICONS || {};
    $$('[data-icon]', root).forEach(el => {
      if (el.dataset.painted) return;
      const ic = lib[el.dataset.icon];
      if (!ic) return;
      el.innerHTML = `<svg viewBox="${ic.vb}" aria-hidden="true" focusable="false">${ic.d}</svg>`;
      el.classList.add('ico');
      el.dataset.painted = '1';
    });
  }
  paintIcons();

  /* ---------------- Texto palavra a palavra ---------------- */
  function splitWords(el) {
    let wi = 0;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          // quebra só em espaços comuns (o espaço não separável mantém palavras juntas)
          ch.textContent.split(/([ \t\n\r]+)/).forEach(part => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const i = document.createElement('span');
            i.className = 'wi';
            i.style.setProperty('--wi', wi++);
            i.textContent = part;
            w.appendChild(i);
            frag.appendChild(w);
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) {
          walk(ch);
        }
      });
    };
    walk(el);
  }
  $$('[data-split]').forEach(splitWords);

  /* ---------------- Utilidades de animação ---------------- */
  function drawPaths(root) {
    $$('[data-draw]', root).forEach(p => {
      const L = p.getTotalLength ? p.getTotalLength() : 0;
      if (!L) return;
      p.style.transition = 'none';
      p.style.strokeDasharray = `${L} ${L}`;
      p.style.strokeDashoffset = reduce ? 0 : L;
      p.getBoundingClientRect();
      const delay = +(p.dataset.delay || 300);
      const dur = +(p.dataset.dur || 2000);
      p.style.transition = `stroke-dashoffset ${dur}ms cubic-bezier(.65,0,.35,1) ${delay}ms`;
      p.style.strokeDashoffset = 0;
    });
  }

  function runCounters(root) {
    $$('[data-count]', root).forEach(el => {
      if (el.closest('.frag:not(.is-on)')) return;
      const target = parseFloat(el.dataset.count);
      const dec = +(el.dataset.dec || 0);
      const thousands = el.hasAttribute('data-thousands');
      const fmt = v => (thousands ? Math.round(v).toLocaleString('pt-BR') : v.toFixed(dec).replace('.', ','));
      if (reduce) { el.textContent = fmt(target); return; }
      const start = performance.now() + 450;
      const dur = 1500;
      el.textContent = fmt(0);
      const tick = now => {
        const p = Math.min(1, Math.max(0, (now - start) / dur));
        el.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function burst(host, x, y, n = 18, spread = 260) {
    if (reduce || !host) return;
    const colors = ['#FFEE80', '#FFFFFF', '#BE90FF', '#FFD014', '#B6D2F5', '#05F29B'];
    for (let i = 0; i < n; i++) {
      const p = document.createElementNS(SVGNS, 'svg');
      p.setAttribute('class', 'burst-p');
      p.setAttribute('viewBox', '0 0 450 450');
      p.innerHTML = '<use href="#sp"/>';
      const size = 12 + Math.random() * 26;
      p.style.cssText = `left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; fill:${colors[i % colors.length]};`;
      host.appendChild(p);
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const r = spread * (0.45 + Math.random() * 0.75);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        p.style.transform = `translate(${Math.cos(a) * r}px, ${Math.sin(a) * r}px) rotate(${Math.random() * 220 - 110}deg) scale(.5)`;
        p.style.opacity = '0';
      }));
      setTimeout(() => p.remove(), 1600);
    }
  }

  function svgEl(tag, attrs = {}, parent) {
    const el = document.createElementNS(SVGNS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (parent) parent.appendChild(el);
    return el;
  }

  // Curva suave (Catmull-Rom → Bézier) passando por todos os pontos
  function smoothPath(pts) {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  const timers = new Map();
  function later(slide, fn, ms) {
    const t = setTimeout(fn, ms);
    if (!timers.has(slide)) timers.set(slide, []);
    timers.get(slide).push(t);
  }
  function clearLater(slide) {
    (timers.get(slide) || []).forEach(clearTimeout);
    timers.set(slide, []);
  }

  /* =================================================================
     EFEITOS POR SLIDE
     ================================================================= */
  const FX = {};

  /* Capa — a reunião como uma trilha de 10 etapas */
  FX.route = {
    init(s) {
      const host = $('#coverRoute', s);
      const P = [[70, 770], [236, 744], [398, 690], [510, 592], [466, 474], [318, 410], [262, 294], [372, 194], [534, 160], [694, 88]]
        .map(([x, y]) => [x, Math.round(96 + (y - 88) * 0.86)]);
      const d = smoothPath(P);
      const svg = svgEl('svg', { viewBox: '0 0 760 760', width: 760, height: 760 }, host);
      const defs = svgEl('defs', {}, svg);
      const lg = svgEl('linearGradient', { id: 'routeG', x1: '0', y1: '1', x2: '1', y2: '0' }, defs);
      [['0', '#B6D2F5'], ['.35', '#8F95F7'], ['.7', '#A260FF'], ['1', '#05F29B']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, lg));
      svgEl('path', { d, fill: 'none', stroke: 'rgba(182,210,245,.09)', 'stroke-width': 16, 'stroke-linecap': 'round' }, svg);
      svgEl('path', { id: 'routePath', d, fill: 'none', stroke: 'url(#routeG)', 'stroke-width': 4, 'stroke-linecap': 'round', 'data-draw': '', 'data-delay': 500, 'data-dur': 2400 }, svg);
      P.forEach((p, i) => {
        const g = svgEl('g', { class: 'route-node', style: `--n:${i}` }, svg);
        svgEl('circle', { cx: p[0], cy: p[1], r: 25, stroke: ACTS[STAGES[i].act].c }, g);
        const t = svgEl('text', { x: p[0], y: p[1] + 1 }, g);
        t.textContent = pad2(i + 1);
      });
      const trav = svgEl('g', {}, svg);
      svgEl('use', { href: '#sp', x: -17, y: -17, width: 34, height: 34, fill: '#FFEE80' }, trav);
      const am = svgEl('animateMotion', { dur: '2.6s', begin: 'indefinite', fill: 'freeze', calcMode: 'spline', keyPoints: '0;1', keyTimes: '0;1', keySplines: '.65 0 .35 1' }, trav);
      svgEl('mpath', { href: '#routePath' }, am);
      trav.style.opacity = 0;
      this.am = am; this.trav = trav;
      host.insertAdjacentHTML('beforeend',
        '<div class="route-label" style="left:0; top:704px; width:320px"><b>Início</b>“Olá, eu me chamo…”</div>' +
        '<div class="route-label" style="left:290px; top:-8px; width:360px; text-align:right"><b>Fim</b>“Seja muito bem-vindo ao nosso ecossistema.”</div>');
      $$('.route-label', host).forEach((l, i) => { l.classList.add('rv', 'rv-f'); l.style.setProperty('--i', i ? 14 : 8); });
    },
    enter(s) {
      drawPaths(s);
      this.trav.style.opacity = 0;
      later(s, () => { this.trav.style.opacity = 1; try { this.am.beginElement(); } catch (e) { /* SMIL indisponível */ } }, reduce ? 0 : 500);
    }
  };

  /* Sumário — o relógio da reunião */
  FX.gantt = {
    init(s) {
      const g = $('#gantt', s);
      const DOMAIN = 50;
      const TRACK_W = 874;
      let t = 0;
      const rows = STAGES.map((S, i) => {
        const avg = (S.min + S.max) / 2;
        const start = t; t += avg;
        const A = ACTS[S.act];
        const first = i === 0 || STAGES[i - 1].act !== S.act;
        return `<button type="button" class="gantt-row" data-go="${S.n}" aria-label="Ir para a etapa ${S.n}: ${S.name}">
          <span class="gantt-act" style="--c:${A.c}; color:${first ? A.c : 'transparent'}"><i></i>${A.name}</span>
          <span class="gantt-num">${pad2(S.n)}</span>
          <span class="gantt-name">${S.name}</span>
          <span class="gantt-time">${fmtTime(S)}</span>
          <span class="gantt-track"><span class="gantt-bar" style="--c:${A.c}; --s:${(start / DOMAIN).toFixed(4)}; --w:${(avg / DOMAIN).toFixed(4)}"></span></span>
        </button>`;
      }).join('');
      const ticks = [0, 10, 20, 30, 40, 50].map(m => `<span style="--x:${m / DOMAIN}"></span><em style="--x:${m / DOMAIN}">${m} min</em>`).join('');
      g.innerHTML = `<div class="gantt-grid">${ticks}</div>${rows}<div class="gantt-axis"></div>
        <div class="playhead" style="--sweep:${Math.round((t / DOMAIN) * TRACK_W)}px"></div>
        <div class="sum-total">Média ≈ ${Math.round(t)} min · de 40 a 53 min</div>`;
      g.classList.add('rv', 'rv-f');
      g.style.setProperty('--i', 2);
    }
  };

  /* Diagnóstico — dominó */
  FX.dominoes = {
    step(s, k) { $('#dominoes', s).classList.toggle('fall', k >= 1); },
    leave(s) { $('#dominoes', s).classList.remove('fall'); }
  };

  /* A pergunta muda */
  FX.reframe = {
    step(s, k) { $('#reframe', s).classList.toggle('is-shift', k >= 1); }
  };

  /* Jornada contínua × capacitação pontual (gráfico conceitual) */
  FX.journey = {
    init(s) {
      const svg = $('#journeyChart', s);
      const defs = svgEl('defs', {}, svg);
      const ag = svgEl('linearGradient', { id: 'jArea', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svgEl('stop', { offset: 0, 'stop-color': '#444DF2', 'stop-opacity': '.55' }, ag);
      svgEl('stop', { offset: 1, 'stop-color': '#444DF2', 'stop-opacity': '0' }, ag);
      const lg = svgEl('linearGradient', { id: 'jLine', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      svgEl('stop', { offset: 0, 'stop-color': '#B6D2F5' }, lg);
      svgEl('stop', { offset: 1, 'stop-color': '#FFFFFF' }, lg);

      // Grade e eixos
      [320, 600].forEach(x => svgEl('line', { x1: x, x2: x, y1: 70, y2: 500, stroke: 'rgba(182,210,245,.12)', 'stroke-dasharray': '4 8' }, svg));
      svgEl('line', { x1: 60, x2: 860, y1: 500, y2: 500, stroke: 'rgba(182,210,245,.35)', 'stroke-width': 1.5 }, svg);
      svgEl('line', { x1: 60, x2: 60, y1: 70, y2: 500, stroke: 'rgba(182,210,245,.2)' }, svg);
      [['Antes', 190], ['Durante', 460], ['Depois', 730]].forEach(([t, x]) => {
        const e = svgEl('text', { x, y: 540, 'text-anchor': 'middle', fill: '#CDD6F4', 'font-size': 20, 'font-weight': 500 }, svg); e.textContent = t;
      });
      const yl = svgEl('text', { x: 30, y: 285, 'text-anchor': 'middle', fill: '#8E96C4', 'font-size': 15, transform: 'rotate(-90 30 285)', 'letter-spacing': '2' }, svg);
      yl.textContent = 'DESENVOLVIMENTO DO EDUCADOR';
      const note = svgEl('text', { x: 860, y: 40, 'text-anchor': 'end', class: 'chart-note' }, svg); note.textContent = 'Ilustrativo';

      // Legenda
      const lgd = svgEl('g', { transform: 'translate(80 34)' }, svg);
      svgEl('line', { x1: 0, x2: 26, y1: 0, y2: 0, stroke: '#FFFFFF', 'stroke-width': 4, 'stroke-linecap': 'round' }, lgd);
      const t1 = svgEl('text', { x: 36, y: 5, fill: '#CDD6F4', 'font-size': 15 }, lgd); t1.textContent = 'Jornada contínua Sapion';
      svgEl('line', { x1: 250, x2: 276, y1: 0, y2: 0, stroke: '#8E96C4', 'stroke-width': 3, 'stroke-dasharray': '6 6' }, lgd);
      const t2 = svgEl('text', { x: 286, y: 5, fill: '#CDD6F4', 'font-size': 15 }, lgd); t2.textContent = 'Capacitação pontual';

      // Séries
      const cont = 'M60,470 C170,452 250,424 330,384 C420,338 470,326 545,282 C630,230 710,186 860,118';
      const area = svgEl('path', { d: `${cont} L860,500 L60,500 Z`, fill: 'url(#jArea)', class: 'j-area' }, svg);
      area.style.opacity = 0;
      const pont = svgEl('path', { d: 'M60,452 L176,452 C212,452 228,250 256,250 C288,250 308,418 396,438 C470,452 610,456 860,456', fill: 'none', stroke: '#8E96C4', 'stroke-width': 3, 'stroke-dasharray': '7 7', class: 'j-pont' }, svg);
      pont.style.opacity = 0;
      svgEl('path', { d: cont, fill: 'none', stroke: 'url(#jLine)', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'data-draw': '', 'data-delay': 700, 'data-dur': 2200 }, svg);

      // Marcos da jornada
      const marks = [[122, 458, 'Diagnóstico', 0], [330, 384, 'Trilhas', 0], [545, 282, 'Comunidade', -48], [760, 162, 'Dados', -30]];
      marks.forEach(([x, y, label, dx], i) => {
        const g = svgEl('g', { class: 'j-mark' }, svg);
        g.style.opacity = 0;
        g.style.transition = `opacity .5s ease ${1200 + i * 380}ms`;
        svgEl('circle', { cx: x, cy: y, r: 8, fill: '#0B0C27', stroke: '#FFFFFF', 'stroke-width': 3 }, g);
        const t = svgEl('text', { x: x + dx, y: y - 22, 'text-anchor': 'middle', fill: '#FFFFFF', 'font-size': 16, 'font-weight': 600 }, g); t.textContent = label;
      });
      const spike = svgEl('text', { x: 256, y: 234, 'text-anchor': 'middle', fill: '#8E96C4', 'font-size': 15 }, svg); spike.textContent = 'evento isolado';
      spike.setAttribute('class', 'j-spike'); spike.style.opacity = 0;
      const endLbl = svgEl('text', { x: 856, y: 486, 'text-anchor': 'end', fill: '#8E96C4', 'font-size': 16 }, svg); endLbl.textContent = 'o efeito se perde';
      endLbl.setAttribute('class', 'j-spike'); endLbl.style.opacity = 0;
    },
    enter(s) {
      const svg = $('#journeyChart', s);
      drawPaths(svg);
      [['.j-pont', 200], ['.j-spike', 900], ['.j-area', 1400]].forEach(([sel, d]) => $$(sel, svg).forEach(e => {
        e.style.transition = 'none'; e.style.opacity = 0; e.getBoundingClientRect();
        e.style.transition = `opacity .8s ease ${d}ms`; e.style.opacity = 1;
      }));
      $$('.j-mark', svg).forEach(g => { g.style.opacity = 1; });
    },
    leave(s) { $$('.j-mark', s).forEach(g => { g.style.opacity = 0; }); }
  };

  /* Cases no Ideb (dados em dados.js) */
  FX.ideb = {
    init(s) {
      const grid = $('#idebGrid', s);
      const data = window.IDEB_CASOS || [];
      const years = [2021, 2023, 2025];
      let pending = 0;
      grid.innerHTML = '';
      data.forEach((d, idx) => {
        const vals = years.map(y => (d.serie && typeof d.serie[y] === 'number' ? d.serie[y] : null));
        pending += vals.filter(v => v === null).length;
        const known = vals.filter(v => v !== null);
        const lo = known.length ? Math.min(4, Math.floor(Math.min(...known)) - 1) : 4;
        const hi = known.length ? Math.max(10, Math.ceil(Math.max(...known))) : 10;
        const X = [70, 240, 410];
        const Y = v => 206 - ((v - lo) / (hi - lo)) * 170;
        const card = document.createElement('article');
        card.className = 'ideb-card card rv';
        card.style.setProperty('--i', 3 + idx);
        card.innerHTML = `<header><h4>${d.municipio}<small>ESPÍRITO SANTO</small></h4><span class="badge ${d.seloTipo === 'client' ? 'client' : ''}">${d.selo}</span></header>`;
        const svg = svgEl('svg', { class: 'ideb-svg', viewBox: '0 0 460 250', role: 'img', 'aria-label': `Ideb de ${d.municipio}: ` + years.map((y, i) => `${y} ${vals[i] === null ? 'a inserir' : vals[i].toString().replace('.', ',')}`).join(', ') }, card);
        const defs = svgEl('defs', {}, svg);
        const lg = svgEl('linearGradient', { id: `idebFill${idx}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
        svgEl('stop', { offset: 0, 'stop-color': '#B6D2F5', 'stop-opacity': '.28' }, lg);
        svgEl('stop', { offset: 1, 'stop-color': '#B6D2F5', 'stop-opacity': '0' }, lg);
        const grd = svgEl('g', { class: 'grid' }, svg);
        for (let v = Math.ceil(lo / 2) * 2; v <= hi; v += 2) {
          svgEl('line', { x1: 40, x2: 450, y1: Y(v), y2: Y(v) }, grd);
          const t = svgEl('text', { x: 30, y: Y(v) + 5, 'text-anchor': 'end' }, grd); t.textContent = v;
        }
        years.forEach((y, i) => { const t = svgEl('text', { x: X[i], y: 240, 'text-anchor': 'middle', class: 'xlab' }, svg); t.textContent = y; });
        // Segmentos entre valores conhecidos consecutivos
        const pts = vals.map((v, i) => (v === null ? null : [X[i], Y(v)]));
        const runs = [];
        let run = [];
        pts.forEach(p => { if (p) run.push(p); else { if (run.length) runs.push(run); run = []; } });
        if (run.length) runs.push(run);
        runs.filter(r => r.length > 1).forEach(r => {
          const dLine = r.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1].toFixed(1)}`).join(' ');
          svgEl('path', { d: `${dLine} L${r[r.length - 1][0]},206 L${r[0][0]},206 Z`, fill: `url(#idebFill${idx})` }, svg);
          svgEl('path', { d: dLine, class: 'ln', 'data-draw': '', 'data-delay': 700 + idx * 200, 'data-dur': 1300 }, svg);
        });
        const missing = vals.filter(v => v === null).length;
        if (missing) {
          const t = svgEl('text', { x: 240, y: 180, class: 'pending-t' }, svg);
          t.textContent = missing === vals.length ? 'série a inserir' : 'valor a inserir';
        }
        vals.forEach((v, i) => {
          const last = i === vals.length - 1;
          if (v === null) {
            svgEl('circle', { cx: X[i], cy: 126, r: 12, class: 'pending' }, svg);
          } else {
            svgEl('circle', { cx: X[i], cy: Y(v), r: last ? 9 : 7, class: `pt${last ? ' last' : ''}` }, svg);
            const t = svgEl('text', { x: X[i], y: Y(v) - 18, class: `val${last ? ' last' : ''}` }, svg);
            t.textContent = v.toFixed(1).replace('.', ',');
          }
        });
        const note = document.createElement('p');
        note.className = 'ideb-note';
        note.innerHTML = d.destaque || '';
        card.appendChild(note);
        grid.appendChild(card);
      });
      $('#idebPending', s).textContent = pending ? 'Série histórica 2021–2025 a inserir' : '';
    },
    enter(s) { drawPaths($('#idebGrid', s)); }
  };

  /* Abertura Magister — explosão de brilhos na troca de marca */
  FX.burst = {
    enter(s) {
      const host = $('.mag-visual', s);
      later(s, () => burst(host, host.clientWidth * 0.55, host.clientHeight * 0.45, 22, 340), 650);
    }
  };

  /* Metodologia — 5 estações sobre uma trilha */
  FX.metodo = {
    init(s) {
      const host = $('#metodo', s);
      const W = 1624;
      const P = [[150, 110], [487, 64], [812, 110], [1137, 64], [1474, 110]];
      const d = smoothPath([[0, 132], ...P, [W, 70]]);
      const svg = svgEl('svg', { viewBox: `0 0 ${W} 200`, width: W, height: 200 });
      host.prepend(svg);
      const defs = svgEl('defs', {}, svg);
      const lg = svgEl('linearGradient', { id: 'metG', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
      [['0', '#BE90FF'], ['.5', '#FFFFFF'], ['1', '#FFD014']].forEach(([o, c]) => svgEl('stop', { offset: o, 'stop-color': c }, lg));
      svgEl('path', { d, fill: 'none', stroke: 'rgba(190,144,255,.12)', 'stroke-width': 18, 'stroke-linecap': 'round' }, svg);
      svgEl('path', { id: 'metPath', d, fill: 'none', stroke: 'url(#metG)', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '2 10', class: 'met-dots' }, svg);
      svgEl('path', { d, fill: 'none', stroke: 'url(#metG)', 'stroke-width': 3, 'stroke-linecap': 'round', 'data-draw': '', 'data-delay': 300, 'data-dur': 2600 }, svg);
      const trav = svgEl('g', {}, svg);
      svgEl('use', { href: '#sp', x: -16, y: -16, width: 32, height: 32, fill: '#FFEE80' }, trav);
      const am = svgEl('animateMotion', { dur: '2.6s', begin: 'indefinite', fill: 'freeze', calcMode: 'spline', keyPoints: '0;1', keyTimes: '0;1', keySplines: '.65 0 .35 1' }, trav);
      svgEl('mpath', { href: '#metPath' }, am);
      trav.style.opacity = 0;
      this.am = am; this.trav = trav;
      $$('.station', host).forEach((st, i) => {
        const [x, y] = P[+st.dataset.p];
        st.style.left = x + 'px';
        st.style.top = (y - 48) + 'px';
        const inner = document.createElement('div');
        inner.className = 'rv';
        inner.style.cssText = `--i:${2 + i * 3}; display:flex; flex-direction:column; align-items:center; gap:14px;`;
        while (st.firstChild) inner.appendChild(st.firstChild);
        st.appendChild(inner);
      });
    },
    enter(s) {
      drawPaths(s);
      this.trav.style.opacity = 0;
      later(s, () => { this.trav.style.opacity = 1; try { this.am.beginElement(); } catch (e) { /* ok */ } }, reduce ? 0 : 300);
    }
  };

  /* Gamificação — níveis acendendo até o 9 (Magister Bronze) */
  FX.xp = {
    enter(s) {
      const bars = $$('#xpLevels i', s);
      bars.forEach(b => b.classList.remove('on'));
      bars.slice(0, 9).forEach((b, i) => later(s, () => b.classList.add('on'), reduce ? 0 : 900 + i * 140));
    }
  };

  /* Magister Labs — demonstração do exemplo do script */
  FX.labs = {
    enter(s) {
      const demo = $('#labsDemo', s), out = $('#labsPrompt', s);
      const text = 'youtube.com/… · Elabore 8 questões objetivas';
      demo.classList.remove('done');
      out.textContent = '';
      if (reduce) { out.textContent = text; demo.classList.add('done'); return; }
      [...text].forEach((ch, i) => later(s, () => { out.textContent += ch; }, 1300 + i * 38));
      later(s, () => demo.classList.add('done'), 1300 + text.length * 38 + 350);
    }
  };

  /* Dashboard do gestor (dados ilustrativos) */
  FX.dash = {
    init(s) {
      const tip = $('#dashTip', s);
      const dash = $('#dash', s);
      const showTip = (evt, html) => {
        const r = dash.getBoundingClientRect();
        const k = r.width / dash.offsetWidth;
        tip.innerHTML = html;
        tip.style.left = ((evt.clientX - r.left) / k) + 'px';
        tip.style.top = ((evt.clientY - r.top) / k) + 'px';
        tip.classList.add('on');
      };
      const hideTip = () => tip.classList.remove('on');

      // Área: acessos por mês
      const months = ['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];
      const vals = [320, 780, 1240, 1510, 1380, 990, 1620, 1840, 1760, 1930];
      const svg = $('#dashArea', s);
      svg.setAttribute('viewBox', '0 0 600 430');
      svg.setAttribute('height', 430);
      const x0 = 46, x1 = 584, y0 = 380, y1 = 20, max = 2000;
      const X = i => x0 + (i / (months.length - 1)) * (x1 - x0);
      const Y = v => y0 - (v / max) * (y0 - y1);
      const defs = svgEl('defs', {}, svg);
      const lg = svgEl('linearGradient', { id: 'dashFill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svgEl('stop', { offset: 0, 'stop-color': '#A260FF', 'stop-opacity': '.35' }, lg);
      svgEl('stop', { offset: 1, 'stop-color': '#A260FF', 'stop-opacity': '0' }, lg);
      [0, 500, 1000, 1500, 2000].forEach(v => {
        svgEl('line', { x1: x0, x2: x1, y1: Y(v), y2: Y(v), stroke: '#EFEDF7', 'stroke-width': 1 }, svg);
        const t = svgEl('text', { x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg); t.textContent = v.toLocaleString('pt-BR');
      });
      months.forEach((m, i) => { const t = svgEl('text', { x: X(i), y: y0 + 24, 'text-anchor': 'middle' }, svg); t.textContent = m; });
      const line = vals.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
      svgEl('path', { d: `${line} L${x1},${y0} L${x0},${y0} Z`, fill: 'url(#dashFill)' }, svg);
      svgEl('path', { d: line, fill: 'none', stroke: '#8A3FF0', 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'data-draw': '', 'data-delay': 700, 'data-dur': 1600 }, svg);
      const li = vals.length - 1;
      svgEl('circle', { cx: X(li), cy: Y(vals[li]), r: 6, fill: '#8A3FF0', stroke: '#fff', 'stroke-width': 2 }, svg);
      const lab = svgEl('text', { x: X(li) - 4, y: Y(vals[li]) - 14, 'text-anchor': 'end', style: 'fill:#22256F; font-weight:700; font-size:14px' }, svg);
      lab.textContent = vals[li].toLocaleString('pt-BR');
      const jul = svgEl('text', { x: X(5), y: Y(vals[5]) + 26, 'text-anchor': 'middle', style: 'fill:#7B7599; font-size:12px' }, svg);
      jul.textContent = 'férias';
      const cross = svgEl('line', { x1: 0, x2: 0, y1: y1, y2: y0, stroke: '#22256F', 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 }, svg);
      const dot = svgEl('circle', { r: 5, fill: '#fff', stroke: '#8A3FF0', 'stroke-width': 2.5, opacity: 0 }, svg);
      const hit = svgEl('rect', { x: x0 - 20, y: y1, width: x1 - x0 + 40, height: y0 - y1, fill: 'transparent' }, svg);
      hit.addEventListener('mousemove', e => {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const i = Math.max(0, Math.min(months.length - 1, Math.round(((p.x - x0) / (x1 - x0)) * (months.length - 1))));
        cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('opacity', 1);
        dot.setAttribute('cx', X(i)); dot.setAttribute('cy', Y(vals[i])); dot.setAttribute('opacity', 1);
        showTip(e, `<b>${months[i]}</b> · ${vals[i].toLocaleString('pt-BR')} acessos`);
      });
      hit.addEventListener('mouseleave', () => { cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); hideTip(); });

      // Mapa de calor: dias × turnos (escala sequencial de um só tom)
      const heat = $('#dashHeat', s);
      heat.setAttribute('viewBox', '0 0 280 430');
      heat.setAttribute('height', 430);
      const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const shifts = ['Manhã', 'Tarde', 'Noite'];
      const H = [[.35, .55, .8], [.4, .6, .85], [.45, .62, .95], [.38, .58, .88], [.3, .45, .6], [.25, .3, .4], [.18, .22, .5]];
      const ramp = ['#EFEDF7', '#D4B8FF', '#B17DFF', '#8A3FF0', '#5A20A3'];
      const col = v => ramp[Math.min(ramp.length - 1, Math.floor(v * ramp.length))];
      const cw = 66, ch = 48, hx = 46, hy = 34;
      shifts.forEach((sh, j) => { const t = svgEl('text', { x: hx + j * (cw + 6) + cw / 2, y: 20, 'text-anchor': 'middle' }, heat); t.textContent = sh; });
      days.forEach((dname, i) => {
        const t = svgEl('text', { x: hx - 8, y: hy + i * (ch + 6) + ch / 2 + 4, 'text-anchor': 'end' }, heat); t.textContent = dname;
        shifts.forEach((sh, j) => {
          const v = H[i][j];
          const r = svgEl('rect', { x: hx + j * (cw + 6), y: hy + i * (ch + 6), width: cw, height: ch, rx: 6, fill: col(v), class: 'hm-cell' }, heat);
          const nivel = v >= 0.8 ? 'muito alto' : v >= 0.6 ? 'alto' : v >= 0.4 ? 'médio' : 'baixo';
          r.addEventListener('mousemove', e => showTip(e, `<b>${dname} · ${sh}</b> · acesso ${nivel}`));
          r.addEventListener('mouseleave', hideTip);
        });
      });
      const leg = svgEl('g', { transform: `translate(${hx} ${hy + 7 * (ch + 6) + 6})` }, heat);
      const lt = svgEl('text', { x: 0, y: 12 }, leg); lt.textContent = 'menos';
      ramp.forEach((c, i) => svgEl('rect', { x: 44 + i * 22, y: 2, width: 18, height: 12, rx: 3, fill: c }, leg));
      const lt2 = svgEl('text', { x: 44 + ramp.length * 22 + 4, y: 12 }, leg); lt2.textContent = 'mais';
    },
    enter(s) { drawPaths($('#dash', s)); }
  };

  /* Mini-pacto — brilho no último "sim" */
  FX.mini = {
    step(s, k) {
      if (k === 3) { const d = $('.mini-done', s); later(s, () => burst(d.parentElement, 180, d.offsetTop + 30, 16, 200), 300); }
    }
  };

  /* Ancoragem — ao revelar o "tudo em 1", as soluções separadas recuam */
  FX.anchor = {
    step(s, k) {
      const left = $('.anc-left', s);
      left.style.transition = 'opacity .8s ease, filter .8s ease';
      left.style.opacity = k >= 1 ? '.55' : '';
      left.style.filter = k >= 1 ? 'saturate(.5)' : '';
      if (k >= 1) { const r = $('.anc-right', s); later(s, () => burst(r, r.clientWidth / 2, 60, 14, 220), 500); }
    }
  };

  /* Pacto final — escala de 0 a 10 */
  FX.scale = {
    init(s) {
      const host = $('#scale', s), out = $('#scaleOut', s);
      for (let v = 0; v <= 10; v++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = v;
        b.setAttribute('aria-pressed', 'false');
        if (v === 10) b.classList.add('ten');
        b.addEventListener('click', () => {
          $$('button', host).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
          if (v < 10) {
            out.innerHTML = `<b>${v}.</b> “E o que está faltando para ser 10?” — trate o ponto e reconfirme.`;
          } else {
            out.innerHTML = '<b class="hl-mint">10!</b> “Então, hoje a necessidade é 10?” — siga para o pacto final.';
            const r = b.getBoundingClientRect(), hr = s.getBoundingClientRect(), k = hr.width / s.offsetWidth;
            burst(s, (r.left - hr.left + r.width / 2) / k, (r.top - hr.top + r.height / 2) / k, 22, 240);
          }
          b.blur();
        });
        host.appendChild(b);
      }
      this.reset = () => {
        $$('button', host).forEach(x => x.setAttribute('aria-pressed', 'false'));
        out.innerHTML = '<span class="muted">Clique na nota que o Secretário disser.</span>';
      };
    },
    enter() { this.reset(); }
  };

  /* Seminário diluído nas licenças */
  FX.dilute = {
    init(s) {
      const grid = $('#diluteGrid', s);
      const html = [];
      for (let i = 0; i < 20; i++) {
        const row = Math.floor(i / 10);
        html.push(`<div class="lic-tile"><span class="sliver" style="--k:${i}; --from:${row ? -275 : -145}px"></span></div>`);
      }
      grid.innerHTML = html.join('');
    },
    step(s, k) { $('#dilute', s).classList.toggle('split', k >= 1); },
    leave(s) { $('#dilute', s).classList.remove('split'); }
  };

  /* Calculadora de investimento */
  FX.calc = {
    init(s) {
      const input = $('#calcN', s), total = $('#calcTotal', s), month = $('#calcMonth', s);
      const PRICE = 1188;
      const update = () => {
        let n = Math.round(Number(input.value));
        if (!Number.isFinite(n) || n < 0) n = 0;
        total.textContent = brl.format(n * PRICE);
        month.textContent = brl.format((n * PRICE) / 12);
      };
      input.addEventListener('input', update);
      $$('[data-calc]', s).forEach(b => b.addEventListener('click', () => {
        input.value = Math.max(1, Math.round(Number(input.value) || 0) + Number(b.dataset.calc));
        update();
      }));
      $$('[data-set]', s).forEach(b => b.addEventListener('click', () => { input.value = b.dataset.set; update(); }));
      update();
    }
  };

  /* Ciclo virtuoso */
  FX.cycle = {
    init(s) {
      const host = $('#cycle', s);
      const cx = 410, cy = 390, R = 250;
      const nodes = [
        ['Recurso investido em formação', '#FFD014'],
        ['Conhecimento', '#B6D2F5'],
        ['Prática em sala de aula', '#BE90FF'],
        ['Melhores resultados e indicadores', '#05F29B'],
        ['Mais acesso a recursos', '#FFEE80']
      ];
      const ang = i => (-90 + i * 72) * Math.PI / 180;
      const pos = (a, r = R) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
      const svg = svgEl('svg', { viewBox: '0 0 820 760', width: 820, height: 760 }, host);
      const defs = svgEl('defs', {}, svg);
      const mk = svgEl('marker', { id: 'cycArrow', viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#FFFFFF' }, mk);
      svgEl('circle', { cx, cy, r: R, fill: 'none', stroke: 'rgba(182,210,245,.1)', 'stroke-width': 26 }, svg);
      svgEl('circle', { cx, cy, r: R - 70, fill: 'none', stroke: 'rgba(182,210,245,.06)', 'stroke-width': 1 }, svg);
      const gap = 17 * Math.PI / 180;
      nodes.forEach((n, i) => {
        const a1 = ang(i) + gap, a2 = ang(i + 1) - gap;
        const [x1, y1] = pos(a1), [x2, y2] = pos(a2);
        svgEl('path', { d: `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 0 1 ${x2.toFixed(1)},${y2.toFixed(1)}`, fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, 'stroke-linecap': 'round', 'marker-end': 'url(#cycArrow)', 'data-draw': '', 'data-delay': 900 + i * 420, 'data-dur': 520 }, svg);
      });
      svgEl('path', { id: 'cycPath', d: `M${cx},${cy - R} A${R},${R} 0 1 1 ${cx - 0.01},${cy - R}`, fill: 'none', stroke: 'none' }, svg);
      const trav = svgEl('g', {}, svg);
      svgEl('use', { href: '#sp', x: -18, y: -18, width: 36, height: 36, fill: '#FFEE80' }, trav);
      const am = svgEl('animateMotion', { dur: '3.4s', begin: 'indefinite', fill: 'freeze', calcMode: 'spline', keyPoints: '0;1', keyTimes: '0;1', keySplines: '.5 0 .5 1' }, trav);
      svgEl('mpath', { href: '#cycPath' }, am);
      trav.style.opacity = 0;
      this.am = am; this.trav = trav;
      nodes.forEach(([label, c], i) => {
        const a = ang(i);
        const [x, y] = pos(a);
        const badge = document.createElement('div');
        badge.className = 'cyc-node';
        badge.style.cssText = `left:${x}px; top:${y}px; --c:${c}`;
        badge.innerHTML = `<div class="rv rv-s" style="--i:${3 + i * 2}"><span class="b">${i + 1}</span></div>`;
        host.appendChild(badge);
        // rótulo para fora do anel: mais longe nas laterais, mais perto no topo/base
        const d = R + 78 + 74 * Math.abs(Math.cos(a));
        const [lx, ly] = pos(a, d);
        const lbl = document.createElement('div');
        lbl.className = 'cyc-node';
        lbl.style.cssText = `left:${lx}px; top:${ly}px; width:210px`;
        lbl.innerHTML = `<div class="rv" style="--i:${4 + i * 2}"><p>${label}</p></div>`;
        host.appendChild(lbl);
      });
      host.insertAdjacentHTML('beforeend', '<div class="cyc-center rv rv-f" style="--i:12"><small>O dinheiro volta para a rede</small><b>Ciclo virtuoso</b></div>');
    },
    enter(s) {
      drawPaths(s);
      this.trav.style.opacity = 0;
      later(s, () => { this.trav.style.opacity = 1; try { this.am.beginElement(); } catch (e) { /* ok */ } }, reduce ? 0 : 3200);
    }
  };

  /* Boas-vindas */
  FX.welcome = {
    enter(s) {
      const c = $('#welcomeCard', s);
      later(s, () => burst(c, c.clientWidth / 2, 70, 20, 240), 1500);
    }
  };

  function fx(s, fn, arg) {
    (s.dataset.fx || '').split(/\s+/).filter(Boolean).forEach(k => {
      const f = FX[k];
      if (f && typeof f[fn] === 'function') f[fn](s, arg);
    });
  }
  slides.forEach(s => fx(s, 'init'));
  paintIcons();

  /* =================================================================
     NAVEGAÇÃO
     ================================================================= */
  const railTicks = $('#railTicks');
  const ticks = STAGES.map(S => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rail-tick';
    b.setAttribute('aria-label', `Etapa ${S.n}: ${S.name}`);
    b.innerHTML = `<i></i><b>${pad2(S.n)} · ${S.name}</b>`;
    b.addEventListener('click', () => goStage(S.n));
    railTicks.appendChild(b);
    return b;
  });
  function goStage(n) {
    const i = slides.findIndex(s => +s.dataset.stage === n);
    if (i >= 0) go(i);
  }

  const MARK = { sapion: 'sapion', magister: 'magister', fusion: 'magister', summit: 'summit' };
  let cur = -1;
  let step = 0;
  const maxStep = s => $$('[data-frag]', s).reduce((m, e) => Math.max(m, +e.dataset.frag), 0);

  function applyChrome(s) {
    const theme = s.dataset.theme || 'sapion';
    stage.dataset.theme = theme;
    const [gx, gy] = (s.dataset.glow || '88% 92%').split(' ');
    stage.style.setProperty('--gx', gx);
    stage.style.setProperty('--gy', gy);
    $$('.rail-mark > *').forEach(e => e.classList.toggle('is-on', e.dataset.mark === MARK[theme]));
    $$('.rail-word span').forEach(e => e.classList.toggle('is-on', e.dataset.word === MARK[theme]));

    const st = +s.dataset.stage || 0;
    ticks.forEach((t, i) => {
      t.classList.toggle('is-active', i + 1 === st);
      t.classList.toggle('is-done', st > 0 && i + 1 < st);
    });

    const mode = s.dataset.hud || '';
    hud.classList.toggle('is-hidden', mode === 'off');
    let label = '', title = '', time = '';
    if (st && mode !== 'logos') {
      const S = STAGES[st - 1];
      label = `Etapa ${pad2(st)}`; title = S.name; time = fmtTime(S);
    } else if (mode && mode !== 'off' && mode !== 'logos') {
      title = mode;
    }
    hudLeft.style.opacity = title ? 1 : 0;
    if (title && (title !== hudTitle.textContent || label !== hudStage.textContent)) {
      hudStage.textContent = label;
      hudTitle.textContent = title;
      hudTime.textContent = time;
      hudLeft.classList.remove('swap');
      void hudLeft.offsetWidth;
      hudLeft.classList.add('swap');
    }
    counter.innerHTML = `<b>${pad2(cur + 1)}</b> / ${N}`;
    progressBar.style.setProperty('--p', (cur + 1) / N);
  }

  function applyStep(s, k) {
    $$('[data-frag]', s).forEach(e => e.classList.toggle('is-on', +e.dataset.frag <= k));
    fx(s, 'step', k);
    runCounters(s);
  }

  function go(n, opts = {}) {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === cur) return;
    const prev = slides[cur];
    if (prev) {
      prev.classList.remove('is-active');
      clearLater(prev);
      fx(prev, 'leave');
    }
    cur = n;
    const s = slides[n];
    step = opts.toEnd ? maxStep(s) : 0;
    applyChrome(s);
    s.classList.add('is-active');
    $$('[data-frag]', s).forEach(e => e.classList.toggle('is-on', +e.dataset.frag <= step));
    fx(s, 'enter');
    if (step) fx(s, 'step', step);
    runCounters(s);
    try { history.replaceState(null, '', `#${n + 1}`); } catch (e) { /* iframe isolado: segue sem atualizar o endereço */ }
    updateNotes();
    if (!navigator.hidden) buildNav();
    $('#live').textContent = `Slide ${n + 1} de ${N}: ${s.dataset.title || ''}`;
    const a = document.activeElement;
    if (a && a !== document.body && !s.contains(a) && !a.closest('.overlay')) a.blur();
  }

  function nextStep() {
    const s = slides[cur];
    if (step < maxStep(s)) { step++; applyStep(s, step); }
    else go(cur + 1);
  }
  function prevStep() {
    const s = slides[cur];
    if (step > 0) { step--; applyStep(s, step); }
    else if (cur > 0) go(cur - 1, { toEnd: true });
  }

  /* ---------------- Sobreposições ---------------- */
  function toggle(el, force) {
    const show = typeof force === 'boolean' ? force : el.hidden;
    el.hidden = !show;
    if (show && el === navigator) buildNav();
    if (show && el === notesPanel) updateNotes();
  }
  function closeOverlays() { [notesPanel, navigator, blackout].forEach(el => { el.hidden = true; }); }

  function buildNav() {
    const list = $('#navList');
    list.innerHTML = '';
    const groups = [];
    slides.forEach((s, i) => {
      const st = +s.dataset.stage || 0;
      const key = st ? `Etapa ${pad2(st)} · ${STAGES[st - 1].name}` : (i < 2 ? 'Abertura' : 'Para levar');
      let g = groups.find(x => x.key === key);
      if (!g) { g = { key, items: [] }; groups.push(g); }
      g.items.push(i);
    });
    groups.forEach(g => {
      const box = document.createElement('div');
      box.className = 'nav-group';
      box.innerHTML = `<span>${g.key}</span>`;
      g.items.forEach(i => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<em>${pad2(i + 1)}</em>${slides[i].dataset.title || ''}`;
        if (i === cur) b.classList.add('is-current');
        b.addEventListener('click', () => { go(i); toggle(navigator, false); });
        box.appendChild(b);
      });
      list.appendChild(box);
    });
  }

  const t0 = Date.now();
  function updateNotes() {
    const s = slides[cur];
    if (!s) return;
    $('#notesTitle').textContent = `${cur + 1}. ${s.dataset.title || ''}`;
    $('#notesNext').textContent = slides[cur + 1] ? slides[cur + 1].dataset.title : '—';
    const n = $('.notes', s);
    $('#notesBody').innerHTML = n ? n.innerHTML : '<p>Sem notas para este slide.</p>';
  }
  setInterval(() => {
    const sec = Math.floor((Date.now() - t0) / 1000);
    $('#notesTimer').textContent = `${pad2(Math.floor(sec / 60))}:${pad2(sec % 60)}`;
  }, 1000);

  function toggleFull() {
    try {
      const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(() => { /* tela cheia bloqueada pelo navegador */ });
    } catch (e) { /* navegador sem suporte */ }
  }

  /* ---------------- Teclado, toque e mouse ---------------- */
  let numBuf = '', numTimer = null;
  addEventListener('keydown', e => {
    const t = e.target;
    const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    const onButton = t && t.tagName === 'BUTTON';
    if (e.key === 'Escape') { closeOverlays(); return; }
    if (typing) {
      if (e.key === 'PageDown') { e.preventDefault(); t.blur(); nextStep(); }
      else if (e.key === 'PageUp') { e.preventDefault(); t.blur(); prevStep(); }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown':
        e.preventDefault(); nextStep(); break;
      case ' ':
        if (onButton) return;
        e.preventDefault(); if (e.shiftKey) prevStep(); else nextStep(); break;
      case 'Enter':
        if (onButton) return;
        e.preventDefault();
        if (numBuf) { go(Number(numBuf) - 1); numBuf = ''; } else nextStep();
        break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
        e.preventDefault(); prevStep(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(N - 1); break;
      case 'f': case 'F': toggleFull(); break;
      case 'n': case 'N': toggle(notesPanel); break;
      case 'm': case 'M': case 'g': case 'G': toggle(navigator); break;
      case 'b': case 'B': case '.': toggle(blackout); break;
      default:
        if (/^\d$/.test(e.key)) {
          numBuf += e.key;
          clearTimeout(numTimer);
          numTimer = setTimeout(() => { numBuf = ''; }, 1600);
        }
    }
  });

  let tx = null, ty = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) nextStep(); else prevStep(); }
    tx = null;
  });

  let uiTimer = null;
  addEventListener('mousemove', () => {
    stage.classList.add('show-ui');
    document.body.classList.remove('idle');
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => { stage.classList.remove('show-ui'); document.body.classList.add('idle'); }, 2400);
  });

  $('#btnNext').addEventListener('click', e => { e.currentTarget.blur(); nextStep(); });
  $('#btnPrev').addEventListener('click', e => { e.currentTarget.blur(); prevStep(); });
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) goStage(Number(g.dataset.go));
  });
  blackout.addEventListener('click', () => toggle(blackout, false));

  /* ---------------- Início ---------------- */
  // #12 abre o slide 12; #12.2 abre o slide 12 já no passo 2
  function fromHash() {
    const [hSlide, hStep] = location.hash.slice(1).split('.').map(v => parseInt(v, 10));
    if (!Number.isFinite(hSlide)) return false;
    if (hSlide - 1 !== cur) go(hSlide - 1);
    if (Number.isFinite(hStep)) while (step < Math.min(hStep, maxStep(slides[cur]))) nextStep();
    return true;
  }
  if (!fromHash()) go(0);
  addEventListener('hashchange', () => {
    const h = location.hash.slice(1);
    if (h !== String(cur + 1)) fromHash();
  });
})();
