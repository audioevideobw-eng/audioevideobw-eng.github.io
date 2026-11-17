/* BW Reels Pro — motor de vídeo (prévia no navegador). GERADO por bw-reels-studio/motor/gerar-motor-web.py
   a partir dos mesmos arquivos do BW Reels Studio: não edite aqui, edite lá e gere de novo. */
(function () {
"use strict";
// Núcleo de animação compartilhado pelos 3 motores (nativo, HyperFrames, Remotion).
// Funções puras: dado um tempo t (s), devolvem o estado visual de cada elemento.

const EASES = {
  linear: (x) => x,
  none: (x) => x,
  'sine.inOut': (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  'power2.out': (x) => 1 - (1 - x) ** 2,
  'power3.out': (x) => 1 - (1 - x) ** 3,
  'power4.out': (x) => 1 - (1 - x) ** 4,
  'power2.inOut': (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),
  'expo.out': (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),
  'expo.inOut': (x) =>
    x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2,
  'back.out': (x) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
};

const PADRAO = { opacity: 1, x: 0, y: 0, scale: 1, rot: 0, blur: 0, ls: 0 };

const lerp = (a, b, k) => a + (b - a) * k;

/** Estado de um elemento no tempo t a partir da lista de tweens. */
function estadoEm(tweens = [], t) {
  const s = { ...PADRAO };
  if (!tweens.length) return s;
  const ord = [...tweens].sort((a, b) => a.t0 - b.t0);
  // valores iniciais = "de" da primeira tween de cada propriedade
  for (const tw of [...ord].reverse()) Object.assign(s, tw.de);
  for (const tw of ord) {
    if (t < tw.t0) break;
    const k = tw.dur <= 0 ? 1 : Math.min(1, (t - tw.t0) / tw.dur);
    const e = (EASES[tw.ease] || EASES['power3.out'])(k);
    for (const p of Object.keys(tw.para)) {
      const de = tw.de[p] ?? s[p];
      s[p] = lerp(de, tw.para[p], e);
    }
  }
  return s;
}

function estadoParaCss(s) {
  return {
    opacity: String(Math.max(0, Math.min(1, s.opacity))),
    transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rot}deg)`,
    filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',
    letterSpacing: s.ls ? `${s.ls}em` : '',
  };
}

function visivel(el, t) {
  return t >= el.inicio && t < el.fim;
}

/** Valor do contador animado (cenas "dado"). */
function contadorEm(c, t) {
  if (t <= c.t0) return c.de;
  const k = Math.min(1, (t - c.t0) / c.dur);
  return lerp(c.de, c.para, EASES['expo.out'](k));
}

function formatarNumero(v, c) {
  const casas = c.casas ?? 0;
  const n = v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  const pre = c.prefixo ? `<small>${c.prefixo.trim()}</small>` : '';
  const suf = c.sufixo ? (c.sufixo.trim().length > 2 ? `<small>${c.sufixo.trim()}</small>` : c.sufixo) : '';
  return `${pre}${n}${suf}`;
}

/** Página de legenda ativa e índice da palavra falada no tempo t. */
function legendaEm(paginas = [], t) {
  const p = paginas.find((pg) => t >= pg.t0 && t < pg.t1);
  if (!p) return null;
  let ativa = -1;
  p.palavras.forEach((w, i) => {
    if (t >= w.t0) ativa = i;
  });
  return { pagina: p, ativa };
}

// Personagens animados por código (vetor/SVG), usados pela cena "personagem" nos 3 motores.
// - svgPersonagem(): desenha o personagem (partes marcadas com data-p)
// - animarPersonagem(): mexe as partes SÓ em função do tempo t (determinístico: mesmo t = mesma imagem)
// Para criar um personagem novo: copie um bloco de PERSONAGENS e ajuste cores/cabelo, ou um "desenho" novo em svgPersonagem.

const PERSONAGENS = {
  be:  { nome: 'Bê (câmera BW)', desenho: 'camera', cores: { corpo: '#232937', detalhe: '#FFB547', lente: '#3aa7e0', pe: '#FFB547' } },
  ana: { nome: 'Ana', desenho: 'pessoa', cabelo: 'longo', cores: { pele: '#f1c7a5', cabelo: '#5a3424', roupa: '#e8505b', calca: '#2b3550', sapato: '#1b1f2a' } },
  leo: { nome: 'Léo', desenho: 'pessoa', cabelo: 'curto', cores: { pele: '#c98d63', cabelo: '#1d1a19', roupa: '#2f80ed', calca: '#273043', sapato: '#111' } },
  bia: { nome: 'Bia', desenho: 'pessoa', cabelo: 'coque', cores: { pele: '#8a5a3b', cabelo: '#24160f', roupa: '#22b07d', calca: '#3a2f4f', sapato: '#161616' } },
  rui: { nome: 'Rui', desenho: 'pessoa', cabelo: 'careca', barba: true, cores: { pele: '#e3b08e', cabelo: '#6b6b6b', roupa: '#f2b134', calca: '#2c2c34', sapato: '#121212' } },
  robo: { nome: 'Robô', desenho: 'robo', cores: { corpo: '#cfd6e2', detalhe: '#ff4d6d', lente: '#5ef0ff', pe: '#8a94a6' } },
};

const ACOES = ['parado', 'acena', 'fala', 'aponta', 'comemora', 'pensa', 'surpresa'];

const L = '#0b0d12'; // contorno (estilo desenho animado)

function membro(id, x1, y1, x2, y2, cor, mao) {
  return `<g data-p="${id}" data-ox="${x1}" data-oy="${y1}">
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${L}" stroke-width="40" stroke-linecap="round"/>
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${cor}" stroke-width="26" stroke-linecap="round"/>
    <circle cx="${x2}" cy="${y2 + 6}" r="20" fill="${mao}" stroke="${L}" stroke-width="7"/></g>`;
}
function olho(cx, cy, r, rp) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="#fff" stroke="${L}" stroke-width="6"/>
    <g data-p="pupila" data-cx="${cx}" data-cy="${cy}"><circle cx="${cx}" cy="${cy}" r="${rp}" fill="${L}"/><circle cx="${cx - rp * .35}" cy="${cy - rp * .4}" r="${rp * .35}" fill="#fff"/></g>`;
}

/** SVG do personagem. `p` = chave de PERSONAGENS ou objeto {desenho, cabelo, cores}. viewBox 400×640, pés em y≈615. */
function svgPersonagem(p, coresExtra) {
  const base = typeof p === 'string' ? (PERSONAGENS[p] || PERSONAGENS.be) : p;
  const c = { ...base.cores, ...(coresExtra || {}) };
  let corpo = '';
  if (base.desenho === 'pessoa') {
    const cab = base.cabelo || 'curto';
    const atras = cab === 'longo' ? `<path d="M105 190 Q100 330 140 395 L262 395 Q300 330 295 190 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>` : '';
    const topo = {
      curto: `<path d="M108 190 Q110 92 200 88 Q292 92 292 190 Q270 140 200 140 Q140 140 108 190Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      longo: `<path d="M104 200 Q100 90 200 86 Q300 90 296 200 Q262 128 200 138 Q160 130 128 168 Q116 186 104 200Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      coque: `<circle cx="200" cy="74" r="40" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/><path d="M108 188 Q110 96 200 92 Q290 96 292 188 Q262 132 200 134 Q138 132 108 188Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      careca: `<path d="M110 178 Q112 162 120 152" stroke="${c.cabelo}" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M290 178 Q288 162 280 152" stroke="${c.cabelo}" stroke-width="14" stroke-linecap="round" fill="none"/>`,
    }[cab] || '';
    const barba = base.barba ? `<path d="M128 236 Q140 318 200 322 Q260 318 272 236 Q250 286 200 288 Q150 286 128 236Z" fill="${c.cabelo}" stroke="${L}" stroke-width="6"/>` : '';
    corpo = `
      <g data-p="pernas">
        <path d="M172 470 L166 590" stroke="${L}" stroke-width="44" stroke-linecap="round"/><path d="M172 470 L166 590" stroke="${c.calca}" stroke-width="30" stroke-linecap="round"/>
        <path d="M228 470 L234 590" stroke="${L}" stroke-width="44" stroke-linecap="round"/><path d="M228 470 L234 590" stroke="${c.calca}" stroke-width="30" stroke-linecap="round"/>
        <ellipse cx="158" cy="604" rx="40" ry="18" fill="${c.sapato}" stroke="${L}" stroke-width="6"/><ellipse cx="242" cy="604" rx="40" ry="18" fill="${c.sapato}" stroke="${L}" stroke-width="6"/>
      </g>
      ${membro('bracoE', 140, 330, 104, 448, c.roupa, c.pele)}
      <path d="M128 322 Q200 296 272 322 L284 488 Q200 504 116 488 Z" fill="${c.roupa}" stroke="${L}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M176 312 L200 352 L224 312" fill="none" stroke="${L}" stroke-width="6" opacity=".55"/>
      ${membro('bracoD', 260, 330, 296, 448, c.roupa, c.pele)}
      <g data-p="cabeca" data-ox="200" data-oy="300">
        ${atras}
        <rect x="178" y="270" width="44" height="46" fill="${c.pele}" stroke="${L}" stroke-width="6"/>
        <ellipse cx="200" cy="198" rx="98" ry="108" fill="${c.pele}" stroke="${L}" stroke-width="8"/>
        ${barba}
        <circle cx="140" cy="236" r="16" fill="#ff7a7a" opacity=".35"/><circle cx="260" cy="236" r="16" fill="#ff7a7a" opacity=".35"/>
        ${olho(162, 196, 20, 10)}${olho(238, 196, 20, 10)}
        <rect data-p="palpebra" data-h="48" x="138" y="170" width="48" height="0" fill="${c.pele}"/>
        <rect data-p="palpebra" data-h="48" x="214" y="170" width="48" height="0" fill="${c.pele}"/>
        <path data-p="sobrancelha" data-oy="160" d="M140 164 Q162 150 184 162" stroke="${L}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path data-p="sobrancelha" data-oy="160" d="M216 162 Q238 150 260 164" stroke="${L}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path data-p="boca" data-cx="200" data-cy="258" data-w="52" d="" fill="#6e1b23" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>
        ${topo}
      </g>`;
  } else {
    // câmera BW (be) e robô: a cabeça é o próprio corpo
    const robo = base.desenho === 'robo';
    corpo = `
      <g data-p="pernas" stroke="${L}" stroke-width="10" stroke-linecap="round">
        <path d="M168 500 L160 596" stroke="${robo ? c.pe : L}" stroke-width="${robo ? 22 : 12}"/><path d="M232 500 L240 596" stroke="${robo ? c.pe : L}" stroke-width="${robo ? 22 : 12}"/>
        <ellipse cx="152" cy="604" rx="42" ry="18" fill="${c.pe}" stroke-width="7"/><ellipse cx="248" cy="604" rx="42" ry="18" fill="${c.pe}" stroke-width="7"/>
      </g>
      ${membro('bracoE', 96, 360, 64, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}
      ${membro('bracoD', 304, 360, 336, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}
      <g data-p="cabeca" data-ox="200" data-oy="520">
        ${robo ? `<path d="M200 220 L200 168" stroke="${L}" stroke-width="8"/><circle data-p="luzinha" cx="200" cy="160" r="16" fill="${c.detalhe}" stroke="${L}" stroke-width="6"/>`
          : `<rect x="122" y="208" width="104" height="54" rx="14" fill="${c.detalhe}" stroke="${L}" stroke-width="8"/>`}
        <rect x="86" y="236" width="228" height="282" rx="${robo ? 70 : 46}" fill="${c.corpo}" stroke="${L}" stroke-width="10"/>
        ${robo ? `<rect x="120" y="300" width="160" height="110" rx="40" fill="#1a1f2b" stroke="${L}" stroke-width="6"/>` : `<circle data-p="luzinha" cx="276" cy="276" r="13" fill="#ff3b3b"/>`}
        ${robo ? `<ellipse cx="166" cy="352" rx="24" ry="26" fill="${c.lente}"/><g data-p="pupila" data-cx="166" data-cy="352"><circle cx="166" cy="352" r="10" fill="#08333a"/></g>
                  <ellipse cx="234" cy="352" rx="24" ry="26" fill="${c.lente}"/><g data-p="pupila" data-cx="234" data-cy="352"><circle cx="234" cy="352" r="10" fill="#08333a"/></g>
                  <rect data-p="palpebra" data-h="56" x="138" y="324" width="124" height="0" fill="#1a1f2b"/>`
          : `<circle cx="160" cy="372" r="72" fill="${L}"/><circle cx="160" cy="372" r="58" fill="${c.lente}"/><circle cx="160" cy="372" r="58" fill="url(#bwLente)"/>
             <g data-p="pupila" data-cx="160" data-cy="372"><circle cx="160" cy="372" r="24" fill="#04090f"/><circle cx="146" cy="356" r="10" fill="#fff"/></g>
             <circle cx="262" cy="352" r="30" fill="${L}"/><circle cx="262" cy="352" r="23" fill="${c.lente}"/>
             <g data-p="pupila" data-cx="262" data-cy="352"><circle cx="262" cy="352" r="10" fill="#04090f"/><circle cx="257" cy="346" r="4" fill="#fff"/></g>
             <rect data-p="palpebra" data-h="150" x="86" y="296" width="228" height="0" fill="${c.corpo}"/>`}
        <path data-p="sobrancelha" data-oy="0" d="" />
        <path data-p="boca" data-cx="${robo ? 200 : 228}" data-cy="${robo ? 388 : 468}" data-w="${robo ? 60 : 50}" d="" fill="${robo ? c.lente : '#7a1d1d'}" stroke="${robo ? c.lente : '#F5F1EA'}" stroke-width="7" stroke-linejoin="round"/>
      </g>`;
  }
  return `<svg viewBox="0 0 400 640" width="100%" height="100%" overflow="visible" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="bwLente" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#bfeaff" stop-opacity=".7"/><stop offset=".5" stop-color="#1b5d86" stop-opacity=".1"/><stop offset="1" stop-color="#071824" stop-opacity=".8"/></radialGradient></defs>
    <ellipse data-p="sombra" cx="200" cy="618" rx="130" ry="20" fill="#000" opacity=".45"/>
    <g data-p="tudo">${corpo}</g></svg>`;
}

/** Anima o personagem dentro de `raiz` no tempo t. r = {t0, t1, acao, entrada, falas:[[ini,fim]], olhar, semente}. */
function animarPersonagem(raiz, r, t) {
  if (!raiz) return;
  if (!raiz.__p) {
    const q = (s) => [...raiz.querySelectorAll(`[data-p="${s}"]`)];
    raiz.__p = { tudo: q('tudo')[0], sombra: q('sombra')[0], cabeca: q('cabeca')[0], bE: q('bracoE')[0], bD: q('bracoD')[0],
      pup: q('pupila'), palp: q('palpebra'), sob: q('sobrancelha'), boca: q('boca')[0], luz: q('luzinha')[0] };
  }
  const P = raiz.__p, lt = t - r.t0, dur = r.t1 - r.t0, sd = r.semente || 0;
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const fx = (a, b) => cl((lt - a) / (b - a));
  const eOut = (x) => 1 - (1 - x) ** 3;
  const eBack = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const acao = r.acao || 'parado';

  // entrada
  let y = 0, x = 0, sq = 0;
  if (r.entrada === 'pula') { const e = fx(0, 0.6); y = (1 - eBack(e)) * -720; sq = Math.sin(fx(0.38, 0.62) * Math.PI) * 0.13; }
  else if (r.entrada === 'desliza') { x = (1 - eOut(fx(0, 0.55))) * (r.lado < 0 ? -520 : 520); }
  else if (r.entrada === 'surge') { sq = -0.25 * (1 - eBack(fx(0, 0.45))); }
  // respiração, pulinhos, susto
  const resp = Math.sin(lt * 2.3 + sd) * 5;
  if (acao === 'comemora') y += -Math.abs(Math.sin(lt * 6.5)) * 46 * fx(0.3, 0.5);
  if (acao === 'surpresa') { const k = fx(0.2, 0.45); y += -Math.sin(k * Math.PI) * 60; sq += -Math.sin(k * Math.PI) * 0.08; }
  const inc = acao === 'pensa' ? 7 * eOut(fx(0.2, 0.7)) : Math.sin(lt * 1.3 + sd) * 2.2;
  P.tudo.setAttribute('transform', `translate(${x} ${y + resp}) translate(200 615) scale(${1 + sq} ${1 - sq}) translate(-200 -615)`);
  if (P.sombra) { P.sombra.setAttribute('rx', 130 + Math.min(0, y) * 0.12); P.sombra.setAttribute('opacity', 0.45 * (r.entrada === 'pula' ? fx(0.1, 0.55) : 1)); }
  if (P.cabeca) P.cabeca.setAttribute('transform', `rotate(${inc} ${P.cabeca.dataset.ox} ${P.cabeca.dataset.oy})`);

  // braços (graus; negativo = sobe o braço direito)
  let aD = Math.sin(lt * 2.3 + sd + 1) * 4, aE = -Math.sin(lt * 2.3 + sd) * 4;
  if (acao === 'acena') { const on = fx(0.25, 0.5) * (1 - fx(Math.max(0.6, dur - 0.5), Math.max(0.9, dur - 0.2))); aD += (-122 + Math.sin(lt * 11) * 24) * on; }
  if (acao === 'aponta') aD += -78 * eOut(fx(0.2, 0.5));
  if (acao === 'comemora') { const k = eOut(fx(0.15, 0.4)); aD += (-150 + Math.sin(lt * 13) * 10) * k; aE += (150 - Math.sin(lt * 13) * 10) * k; }
  if (acao === 'pensa') aE += -145 * eOut(fx(0.2, 0.6));   // mão no queixo
  if (acao === 'surpresa') { const k = eOut(fx(0.15, 0.4)); aD += -60 * k; aE += 60 * k; }
  if (acao === 'fala') aD += (-28 + Math.sin(lt * 4) * 14) * fx(0.2, 0.5);
  const gira = (g, a) => g && g.setAttribute('transform', `rotate(${a} ${g.dataset.ox} ${g.dataset.oy})`);
  gira(P.bD, aD); gira(P.bE, aE);

  // olhos: piscadas em tempos fixos pela semente; olhar para o lado de quem fala
  let pis = 0;
  for (let k = 0; k < 8; k++) { const tp = 1.1 + k * 2.6 + ((sd * 7 + k * 3) % 10) / 10; const q = cl((lt - tp) / 0.16); pis = Math.max(pis, Math.sin(q * Math.PI)); }
  if (acao === 'surpresa') pis = 0;
  P.palp.forEach((p) => p.setAttribute('height', pis * Number(p.dataset.h)));
  const ox = acao === 'pensa' ? 6 : (r.olhar || 0) * 9 + Math.sin(lt * 0.8 + sd) * 3;
  const oy = acao === 'pensa' || acao === 'comemora' ? -8 : 0;
  const esc = acao === 'surpresa' ? 0.72 + 0.28 * (1 - fx(0.15, 0.35)) : 1;
  P.pup.forEach((p) => p.setAttribute('transform', `translate(${ox} ${oy}) translate(${p.dataset.cx} ${p.dataset.cy}) scale(${esc}) translate(${-p.dataset.cx} ${-p.dataset.cy})`));
  const sob = acao === 'surpresa' ? -14 : acao === 'pensa' ? -6 : 0;
  P.sob.forEach((s, i) => s.getAttribute('d') && s.setAttribute('transform', `translate(0 ${sob}) rotate(${acao === 'pensa' ? (i ? -8 : 0) : 0} 200 160)`));

  // boca: fala = abre/fecha no ritmo de sílabas; sorriso, "O" de surpresa
  if (P.boca) {
    const cx = +P.boca.dataset.cx, cy = +P.boca.dataset.cy, w = +P.boca.dataset.w;
    const falando = (r.falas || []).some(([a, b]) => t >= a && t < b - 0.12) || (acao === 'fala' && lt > 0.3 && lt < dur - 0.2 && !(r.falas || []).length);
    let d;
    if (falando) { const ab = (0.35 + 0.65 * Math.abs(Math.sin(lt * 12.5 + sd))) * w * 0.62; d = `M${cx - w / 2} ${cy} Q${cx} ${cy - 6} ${cx + w / 2} ${cy} Q${cx} ${cy + ab * 1.6} ${cx - w / 2} ${cy}Z`; }
    else if (acao === 'surpresa') { const rr = w * 0.26; d = `M${cx - rr} ${cy + 6} a${rr} ${rr * 1.25} 0 1 0 ${rr * 2} 0 a${rr} ${rr * 1.25} 0 1 0 ${-rr * 2} 0Z`; }
    else if (acao === 'pensa') d = `M${cx - w * 0.3} ${cy + 6} Q${cx} ${cy + 2} ${cx + w * 0.32} ${cy + 10} Q${cx} ${cy + 10} ${cx - w * 0.3} ${cy + 6}Z`;
    else { const s = acao === 'comemora' ? 0.75 : 0.42; d = `M${cx - w / 2} ${cy} Q${cx} ${cy + w * s} ${cx + w / 2} ${cy} Q${cx} ${cy + w * s * 0.35} ${cx - w / 2} ${cy}Z`; }
    P.boca.setAttribute('d', d);
  }
  if (P.luz) P.luz.setAttribute('opacity', Math.floor(lt * 2) % 2 ? 0.25 : 1);
}

// Presets visuais. Cada estilo vira variáveis CSS usadas por todos os motores.
// Para criar um novo estilo, copie um bloco e ajuste — o roteiro só referencia o nome.

const ESTILOS = {
  cinema: {
    fundo: '#0b0b0c', texto: '#f3eee4', destaque: '#e8b04a', suave: '#9a948a',
    fonteTitulo: "'Anton', 'Bebas Neue', 'BWPesada', sans-serif",
    fonteTexto: "'Inter', 'Inter Display', sans-serif",
    pesoTitulo: 400, caixaAlta: true, gradiente: 'radial-gradient(120% 80% at 50% 30%, #1c1a17 0%, #0b0b0c 70%)',
  },
  corporativo: {
    fundo: '#0a1626', texto: '#ffffff', destaque: '#3ec7f2', suave: '#8fa3b8',
    fonteTitulo: "'Inter', 'BWPesada', sans-serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 800, caixaAlta: false, gradiente: 'linear-gradient(160deg, #10243d 0%, #0a1626 60%, #060d17 100%)',
  },
  neon: {
    fundo: '#07060d', texto: '#ffffff', destaque: '#ff3db8', suave: '#7cf7ff',
    fonteTitulo: "'Bebas Neue', 'Anton', 'BWPesada', sans-serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 400, caixaAlta: true, brilho: true,
    gradiente: 'radial-gradient(90% 60% at 50% 40%, #241046 0%, #07060d 75%)',
  },
  editorial: {
    fundo: '#f2eee6', texto: '#141210', destaque: '#d6452b', suave: '#6f6a62',
    fonteTitulo: "'Playfair Display', 'DM Serif Display', Georgia, serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 700, caixaAlta: false, gradiente: 'linear-gradient(180deg, #f6f3ec 0%, #ebe5d9 100%)',
  },
  luxo: {
    fundo: '#0e0d0b', texto: '#efe6d2', destaque: '#c9a96e', suave: '#8c826f',
    fonteTitulo: "'Cormorant Garamond', 'Playfair Display', Georgia, serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 500, caixaAlta: true, espacamento: 0.08,
    gradiente: 'radial-gradient(100% 70% at 50% 35%, #1d1a15 0%, #0e0d0b 70%)',
  },
};

const FORMATOS = {
  '9:16': { largura: 1080, altura: 1920 },
  '4:5': { largura: 1080, altura: 1350 },
  '1:1': { largura: 1080, altura: 1080 },
  '16:9': { largura: 1920, altura: 1080 },
};

const GOOGLE_FONTS =
  'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cormorant+Garamond:wght@500;700&family=Inter:wght@400;600;800;900&family=Playfair+Display:wght@700;900&display=swap';

// Converte o roteiro (JSON curto escrito pelo Claude) em um "plano de render"
// independente de motor: árvore de elementos + tweens + legendas + áudios.


const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const limpa = (w) => w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w%+]/g, '');

const TRANSICAO_PADRAO = {
  gancho: 'zoom', texto: 'deslize', midia: 'corte', dado: 'zoom', lista: 'deslize', citacao: 'fade', cta: 'zoom', personagem: 'fade',
};

function criarPlano(roteiro) {
  const fmt = FORMATOS[roteiro.formato || '9:16'];
  if (!fmt) throw new Error(`formato inválido: ${roteiro.formato}`);
  const est = ESTILOS[roteiro.estilo || 'cinema'];
  if (!est) throw new Error(`estilo inválido: ${roteiro.estilo}`);
  const W = fmt.largura, H = fmt.altura, vertical = H > W;
  const fx = { grao: true, vinheta: true, letterbox: false, barraProgresso: true, sfx: true, ...(roteiro.efeitos || {}) };
  const u = W / 1080; // unidade de escala

  const plano = {
    titulo: roteiro.titulo || 'reel', largura: W, altura: H, fps: roteiro.fps || 30,
    estilo: est, efeitos: fx, cenas: [], globais: [], legendas: [], audios: [], sfx: [], duracao: 0,
    marca: roteiro.marca || {},
  };

  let t = 0;
  let id = 0;
  const novoId = (p) => `${p}${id++}`;
  const tw = (t0, dur, de, para, ease = 'expo.out') => ({ t0, dur, de, para, ease });

  // Quebra um texto em palavras animáveis (stagger), marcando ênfases.
  function palavras(texto, a, { atraso = 0.05, passo = 0.09, y = 80 * u, blur = 14, dur = 0.6, enfase = [] } = {}) {
    const enf = new Set((enfase || []).map(limpa));
    return String(texto).split(/\s+/).filter(Boolean).map((w, i) => ({
      id: novoId('w'), tag: 'span', classe: enf.has(limpa(w)) ? 'w enf' : 'w', html: esc(w),
      tweens: [tw(a + atraso + i * passo, dur, { opacity: 0, y, blur }, { opacity: 1, y: 0, blur: 0 })],
    }));
  }

  const midiaNo = (c, a, d) => {
    if (!c.midia) return null;
    const ehVideo = /\.(mp4|mov|webm|m4v|mkv)$/i.test(c.midia);
    const mov = c.movimento || (ehVideo ? 'zoom-in-suave' : 'zoom-in');
    const mapa = {
      'zoom-in': [{ scale: 1 }, { scale: 1.18 }],
      'zoom-in-suave': [{ scale: 1.02 }, { scale: 1.08 }],
      'zoom-out': [{ scale: 1.18 }, { scale: 1 }],
      'pan-esq': [{ scale: 1.15, x: 60 * u }, { scale: 1.15, x: -60 * u }],
      'pan-dir': [{ scale: 1.15, x: -60 * u }, { scale: 1.15, x: 60 * u }],
      fixo: [{ scale: 1 }, { scale: 1 }],
    };
    const [de, para] = mapa[mov] || mapa['zoom-in'];
    return {
      id: novoId('m'), tag: 'div', classe: 'midia',
      tweens: [tw(a, d, de, para, 'linear')],
      filhos: [{
        id: novoId('mv'), tag: ehVideo ? 'video' : 'img', classe: 'midia-el', src: c.midia,
        inicioNoArquivo: c.inicioNoArquivo || 0, inicio: a, fim: a + d, video: ehVideo,
      }],
    };
  };

  roteiro.cenas.forEach((c, i) => {
    const d = Number(c.duracao) || 3;
    const a = t;
    const filhos = [];
    const m = midiaNo(c, a, d);
    if (m) {
      filhos.push(m);
      filhos.push({ id: novoId('g'), tag: 'div', classe: 'escurecer' });
    }

    switch (c.tipo) {
      case 'gancho': {
        if (c.chamada) filhos.push({ id: novoId('k'), tag: 'div', classe: 'chamada', html: esc(c.chamada),
          tweens: [tw(a, 0.4, { opacity: 0, y: -20 * u }, { opacity: 1, y: 0 })] });
        filhos.push({ id: novoId('h'), tag: 'h1', classe: 'titulo gigante', filhos: palavras(c.texto, a, { enfase: c.enfase }),
          tweens: [tw(a, d, { scale: 1 }, { scale: 1.06 }, 'linear')] });
        break;
      }
      case 'texto': {
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo', filhos: palavras(c.titulo || c.texto, a, { y: 50 * u, enfase: c.enfase }) });
        if (c.subtitulo) filhos.push({ id: novoId('p'), tag: 'p', classe: 'sub', html: esc(c.subtitulo),
          tweens: [tw(a + 0.55, 0.6, { opacity: 0, y: 24 * u }, { opacity: 1, y: 0 })] });
        break;
      }
      case 'midia': {
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo rodape', filhos: palavras(c.texto, a + 0.2, { y: 40 * u, enfase: c.enfase }) });
        break;
      }
      case 'dado': {
        filhos.push({ id: novoId('n'), tag: 'div', classe: 'numero', html: '0',
          contador: { de: 0, para: Number(c.valor), t0: a + 0.15, dur: Math.min(1.6, d * 0.6), prefixo: c.prefixo, sufixo: c.sufixo, casas: c.casas },
          tweens: [tw(a, 0.7, { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1 }, 'back.out')] });
        if (c.rotulo) filhos.push({ id: novoId('r'), tag: 'p', classe: 'rotulo', html: esc(c.rotulo),
          tweens: [tw(a + 0.6, 0.6, { opacity: 0, y: 30 * u }, { opacity: 1, y: 0 })] });
        if (c.fonte) filhos.push({ id: novoId('f'), tag: 'p', classe: 'fonte', html: `Fonte: ${esc(c.fonte)}`,
          tweens: [tw(a + 1.0, 0.5, { opacity: 0 }, { opacity: 0.85 })] });
        break;
      }
      case 'lista': {
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.titulo, a, { y: 40 * u, enfase: c.enfase }) });
        const passo = Math.min(0.5, (d - 1) / Math.max(1, c.itens.length));
        filhos.push({ id: novoId('l'), tag: 'ol', classe: 'lista', filhos: c.itens.map((it, k) => ({
          id: novoId('li'), tag: 'li', classe: 'item', html: `<b>${k + 1}</b><span>${esc(it)}</span>`,
          tweens: [tw(a + 0.45 + k * passo, 0.55, { opacity: 0, x: -70 * u, blur: 8 }, { opacity: 1, x: 0, blur: 0 })],
        })) });
        break;
      }
      case 'citacao': {
        filhos.push({ id: novoId('q'), tag: 'div', classe: 'aspas', html: '“',
          tweens: [tw(a, 0.6, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1 })] });
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo citacao', filhos: palavras(c.texto, a + 0.2, { passo: 0.06, y: 0, blur: 6, dur: 0.5, enfase: c.enfase }) });
        if (c.autor) filhos.push({ id: novoId('au'), tag: 'p', classe: 'sub', html: `— ${esc(c.autor)}`,
          tweens: [tw(a + 0.9, 0.6, { opacity: 0 }, { opacity: 1 })] });
        break;
      }
      case 'cta': {
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo', filhos: palavras(c.texto, a, { y: 50 * u, enfase: c.enfase }) });
        if (c.acao) filhos.push({ id: novoId('b'), tag: 'div', classe: 'botao', html: esc(c.acao),
          tweens: [
            tw(a + 0.6, 0.6, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, 'back.out'),
            tw(a + 1.5, 0.35, { scale: 1 }, { scale: 1.07 }, 'sine.inOut'),
            tw(a + 1.85, 0.35, { scale: 1.07 }, { scale: 1 }, 'sine.inOut'),
          ] });
        break;
      }
      case 'personagem': {
        // Elenco (1 ou 2 personagens), ação de cada um, balões de fala em sequência e cenário.
        const elenco = (c.elenco && c.elenco.length ? c.elenco : [{ personagem: c.personagem || 'be', acao: c.acao }]).slice(0, 2);
        const falas = (c.falas && c.falas.length ? c.falas : (c.balao ? [{ quem: 0, texto: c.balao }] : []))
          .filter((f) => f && f.texto).map((f) => ({ quem: Math.min(elenco.length - 1, Math.max(0, Number(f.quem) || 0)), texto: String(f.texto) }));
        const ini = a + (c.entrada === 'nenhuma' ? 0.15 : 0.6), util = Math.max(0.6, d - (ini - a) - 0.25);
        const pesos = falas.map((f) => 1.2 + f.texto.split(/\s+/).length * 0.32);
        const soma = pesos.reduce((s2, p2) => s2 + p2, 0) || 1;
        let cur = ini;
        const tempos = falas.map((f, k) => { const dd = (pesos[k] / soma) * util; const o = [cur, cur + dd]; cur += dd; return o; });
        const cen = c.cenario || (m ? 'nenhum' : 'raios');
        if (cen === 'raios') filhos.push({ id: novoId('cn'), tag: 'div', classe: 'cenario raios', tweens: [tw(a, d, { rot: 0, scale: 1.4 }, { rot: 14, scale: 1.4 }, 'linear')] });
        if (cen === 'palco') filhos.push({ id: novoId('cn'), tag: 'div', classe: 'cenario palco', html: '<i class="spot e"></i><i class="spot d"></i><b class="chao"></b>',
          tweens: [tw(a, 0.6, { opacity: 0 }, { opacity: 1 }, 'power2.out')] });
        if (cen === 'bolinhas') filhos.push({ id: novoId('cn'), tag: 'div', classe: 'cenario bolinhas', tweens: [tw(a, d, { y: 0 }, { y: -90 * u }, 'linear')] });
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno topo-pers', filhos: palavras(c.texto, a, { y: 40 * u, enfase: c.enfase }) });
        const dois = elenco.length > 1;
        elenco.forEach((ator, k) => {
          const pid = ator.personagem && PERSONAGENS[ator.personagem] ? ator.personagem : 'be';
          const lado = dois ? (k === 0 ? -1 : 1) : (c.posicao === 'esquerda' ? -1 : c.posicao === 'direita' ? 1 : 0);
          const minhas = tempos.filter((_, j) => falas[j].quem === k);
          const outro = tempos.filter((_, j) => falas[j].quem !== k).length ? (dois ? -lado : 0) : 0;
          filhos.push({ id: novoId('at'), tag: 'div', classe: `ator ${dois ? 'duplo' : 'solo'} lado${lado}`, html: svgPersonagem(pid, ator.cores),
            rig: { t0: a, t1: a + d, acao: ator.acao || (minhas.length ? 'fala' : 'parado'), entrada: c.entrada || 'pula', lado: lado || 1, falas: minhas, olhar: outro, semente: i * 3 + k * 7 + 1 } });
        });
        falas.forEach((f, k) => {
          const [t0b, t1b] = tempos[k];
          const lado = dois ? (f.quem === 0 ? -1 : 1) : 0;
          filhos.push({ id: novoId('bl'), tag: 'div', classe: `balao lado${lado}${dois ? ' duplo' : ''}`, html: esc(f.texto),
            tweens: [tw(t0b, 0.35, { opacity: 0, scale: 0.6, y: 30 * u }, { opacity: 1, scale: 1, y: 0 }, 'back.out'),
              tw(Math.max(t0b + 0.4, t1b - 0.2), 0.2, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }, 'power2.out')] });
        });
        break;
      }
      default:
        throw new Error(`cena ${i + 1}: tipo desconhecido "${c.tipo}"`);
    }

    // Transição de entrada da cena
    const ant = roteiro.cenas[i - 1];
    const continua = c.tipo === 'personagem' && ant && ant.tipo === 'personagem' && (ant.cenario || 'raios') === (c.cenario || 'raios');
    const tr = c.transicao || (i === 0 ? 'zoom' : continua ? 'corte' : TRANSICAO_PADRAO[c.tipo]);   // mesma cena de personagem continua sem piscar
    const trTweens = {
      corte: [],
      fade: [tw(a, 0.35, { opacity: 0 }, { opacity: 1 }, 'power2.out')],
      zoom: [tw(a, 0.45, { scale: 1.25, blur: 18 }, { scale: 1, blur: 0 })],
      deslize: [tw(a, 0.45, { y: H * 0.12, opacity: 0 }, { y: 0, opacity: 1 })],
      flash: [],
    }[tr] ?? [];
    if (tr === 'flash' || (tr === 'zoom' && i > 0 && fx.flashNoZoom)) {
      plano.globais.push({ id: novoId('fl'), tag: 'div', classe: 'flash', inicio: a, fim: a + 0.3,
        tweens: [tw(a, 0.3, { opacity: 0.9 }, { opacity: 0 }, 'power2.out')] });
    }
    if (fx.sfx && i > 0 && (tr === 'zoom' || tr === 'deslize')) plano.sfx.push({ tipo: 'whoosh', inicio: Math.max(0, a - 0.12) });
    if (fx.sfx && tr === 'flash') plano.sfx.push({ tipo: 'impacto', inicio: a });
    if (fx.sfx && i === 0) plano.sfx.push({ tipo: 'impacto', inicio: 0.02 });

    plano.cenas.push({
      id: `cena${i}`, tag: 'section', classe: `cena tipo-${c.tipo}${m ? ' com-midia' : ''}`,
      inicio: a, fim: a + d, tweens: trTweens, filhos, fala: c.fala, legendaOculta: !!c.legendaOculta,
    });
    t += d;
  });
  plano.duracao = +t.toFixed(3);

  // Legendas karaokê: usa timestamps reais (Whisper) se fornecidos; senão distribui a "fala" de cada cena.
  const n = roteiro.legendas?.palavrasPorPagina || 3;
  if (roteiro.legendas?.ativas !== false) {
    const enf = new Set((roteiro.legendas?.enfase || []).map(limpa));
    const paginar = (ws) => {
      for (let k = 0; k < ws.length; k += n) {
        const grupo = ws.slice(k, k + n).map((w) => ({ ...w, txt: esc(w.txt), enfase: enf.has(limpa(w.txt)) }));
        plano.legendas.push({ t0: grupo[0].t0, t1: grupo[grupo.length - 1].t1 + 0.05, palavras: grupo });
      }
    };
    if (Array.isArray(roteiro.legendas?.palavras)) {
      // timestamps reais (Whisper): quebra página também em pausas > 0,6s
      let bloco = [];
      for (const w of roteiro.legendas.palavras) {
        const ult = bloco[bloco.length - 1];
        if (ult && w.inicio - ult.t1 > 0.6) { paginar(bloco); bloco = []; }
        bloco.push({ txt: w.palavra, t0: w.inicio, t1: w.fim });
      }
      paginar(bloco);
    } else {
      // distribui a "fala" de cada cena dentro da própria cena (páginas nunca atravessam cortes)
      plano.cenas.forEach((c, i) => {
        const cena = roteiro.cenas[i];
        const oculta = cena.legenda === false || ((cena.tipo === 'gancho' || cena.tipo === 'personagem') && cena.legenda !== true);
        if (!c.fala || oculta) return;
        const lista = c.fala.split(/\s+/).filter(Boolean);
        const pesos = lista.map((w) => 0.6 + w.length * 0.12);
        const total = pesos.reduce((s, p) => s + p, 0);
        const util = (c.fim - c.inicio) - 0.3;
        let cur = c.inicio + 0.12;
        const ws = lista.map((w, k) => { const d = (pesos[k] / total) * util; const o = { txt: w, t0: cur, t1: cur + d }; cur += d; return o; });
        paginar(ws);
      });
    }
  }

  // Áudios (música + narração). Os SFX são gerados no render.
  const au = roteiro.audio || {};
  if (au.musica) plano.audios.push({ papel: 'musica', src: au.musica, inicio: 0, volume: au.volumeMusica ?? (au.narracao ? 0.25 : 0.6) });
  if (au.narracao) plano.audios.push({ papel: 'narracao', src: au.narracao, inicio: au.inicioNarracao || 0, volume: au.volumeNarracao ?? 1 });

  plano.vertical = vertical;
  return plano;
}

// Plano -> HTML. Dois sabores:
//  - "nativo": runtime próprio com window.__seek(t), renderizado por Chromium + FFmpeg (motor/nativo.mjs)
//  - "hyperframes": mesmo runtime dirigido por UMA timeline GSAP registrada em window.__timelines
//    (formato de composição documentado no README do heygen-com/hyperframes)


const ANIM = "// N\u00facleo de anima\u00e7\u00e3o compartilhado pelos 3 motores (nativo, HyperFrames, Remotion).\n// Fun\u00e7\u00f5es puras: dado um tempo t (s), devolvem o estado visual de cada elemento.\n\nconst EASES = {\n  linear: (x) => x,\n  none: (x) => x,\n  'sine.inOut': (x) => -(Math.cos(Math.PI * x) - 1) / 2,\n  'power2.out': (x) => 1 - (1 - x) ** 2,\n  'power3.out': (x) => 1 - (1 - x) ** 3,\n  'power4.out': (x) => 1 - (1 - x) ** 4,\n  'power2.inOut': (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),\n  'expo.out': (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),\n  'expo.inOut': (x) =>\n    x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2,\n  'back.out': (x) => {\n    const c1 = 1.70158, c3 = c1 + 1;\n    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;\n  },\n};\n\nconst PADRAO = { opacity: 1, x: 0, y: 0, scale: 1, rot: 0, blur: 0, ls: 0 };\n\nconst lerp = (a, b, k) => a + (b - a) * k;\n\n/** Estado de um elemento no tempo t a partir da lista de tweens. */\nfunction estadoEm(tweens = [], t) {\n  const s = { ...PADRAO };\n  if (!tweens.length) return s;\n  const ord = [...tweens].sort((a, b) => a.t0 - b.t0);\n  // valores iniciais = \"de\" da primeira tween de cada propriedade\n  for (const tw of [...ord].reverse()) Object.assign(s, tw.de);\n  for (const tw of ord) {\n    if (t < tw.t0) break;\n    const k = tw.dur <= 0 ? 1 : Math.min(1, (t - tw.t0) / tw.dur);\n    const e = (EASES[tw.ease] || EASES['power3.out'])(k);\n    for (const p of Object.keys(tw.para)) {\n      const de = tw.de[p] ?? s[p];\n      s[p] = lerp(de, tw.para[p], e);\n    }\n  }\n  return s;\n}\n\nfunction estadoParaCss(s) {\n  return {\n    opacity: String(Math.max(0, Math.min(1, s.opacity))),\n    transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rot}deg)`,\n    filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',\n    letterSpacing: s.ls ? `${s.ls}em` : '',\n  };\n}\n\nfunction visivel(el, t) {\n  return t >= el.inicio && t < el.fim;\n}\n\n/** Valor do contador animado (cenas \"dado\"). */\nfunction contadorEm(c, t) {\n  if (t <= c.t0) return c.de;\n  const k = Math.min(1, (t - c.t0) / c.dur);\n  return lerp(c.de, c.para, EASES['expo.out'](k));\n}\n\nfunction formatarNumero(v, c) {\n  const casas = c.casas ?? 0;\n  const n = v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });\n  const pre = c.prefixo ? `<small>${c.prefixo.trim()}</small>` : '';\n  const suf = c.sufixo ? (c.sufixo.trim().length > 2 ? `<small>${c.sufixo.trim()}</small>` : c.sufixo) : '';\n  return `${pre}${n}${suf}`;\n}\n\n/** P\u00e1gina de legenda ativa e \u00edndice da palavra falada no tempo t. */\nfunction legendaEm(paginas = [], t) {\n  const p = paginas.find((pg) => t >= pg.t0 && t < pg.t1);\n  if (!p) return null;\n  let ativa = -1;\n  p.palavras.forEach((w, i) => {\n    if (t >= w.t0) ativa = i;\n  });\n  return { pagina: p, ativa };\n}\n";
const PERS = "// Personagens animados por c\u00f3digo (vetor/SVG), usados pela cena \"personagem\" nos 3 motores.\n// - svgPersonagem(): desenha o personagem (partes marcadas com data-p)\n// - animarPersonagem(): mexe as partes S\u00d3 em fun\u00e7\u00e3o do tempo t (determin\u00edstico: mesmo t = mesma imagem)\n// Para criar um personagem novo: copie um bloco de PERSONAGENS e ajuste cores/cabelo, ou um \"desenho\" novo em svgPersonagem.\n\nconst PERSONAGENS = {\n  be:  { nome: 'B\u00ea (c\u00e2mera BW)', desenho: 'camera', cores: { corpo: '#232937', detalhe: '#FFB547', lente: '#3aa7e0', pe: '#FFB547' } },\n  ana: { nome: 'Ana', desenho: 'pessoa', cabelo: 'longo', cores: { pele: '#f1c7a5', cabelo: '#5a3424', roupa: '#e8505b', calca: '#2b3550', sapato: '#1b1f2a' } },\n  leo: { nome: 'L\u00e9o', desenho: 'pessoa', cabelo: 'curto', cores: { pele: '#c98d63', cabelo: '#1d1a19', roupa: '#2f80ed', calca: '#273043', sapato: '#111' } },\n  bia: { nome: 'Bia', desenho: 'pessoa', cabelo: 'coque', cores: { pele: '#8a5a3b', cabelo: '#24160f', roupa: '#22b07d', calca: '#3a2f4f', sapato: '#161616' } },\n  rui: { nome: 'Rui', desenho: 'pessoa', cabelo: 'careca', barba: true, cores: { pele: '#e3b08e', cabelo: '#6b6b6b', roupa: '#f2b134', calca: '#2c2c34', sapato: '#121212' } },\n  robo: { nome: 'Rob\u00f4', desenho: 'robo', cores: { corpo: '#cfd6e2', detalhe: '#ff4d6d', lente: '#5ef0ff', pe: '#8a94a6' } },\n};\n\nconst ACOES = ['parado', 'acena', 'fala', 'aponta', 'comemora', 'pensa', 'surpresa'];\n\nconst L = '#0b0d12'; // contorno (estilo desenho animado)\n\nfunction membro(id, x1, y1, x2, y2, cor, mao) {\n  return `<g data-p=\"${id}\" data-ox=\"${x1}\" data-oy=\"${y1}\">\n    <path d=\"M${x1} ${y1} L${x2} ${y2}\" stroke=\"${L}\" stroke-width=\"40\" stroke-linecap=\"round\"/>\n    <path d=\"M${x1} ${y1} L${x2} ${y2}\" stroke=\"${cor}\" stroke-width=\"26\" stroke-linecap=\"round\"/>\n    <circle cx=\"${x2}\" cy=\"${y2 + 6}\" r=\"20\" fill=\"${mao}\" stroke=\"${L}\" stroke-width=\"7\"/></g>`;\n}\nfunction olho(cx, cy, r, rp) {\n  return `<ellipse cx=\"${cx}\" cy=\"${cy}\" rx=\"${r}\" ry=\"${r * 1.12}\" fill=\"#fff\" stroke=\"${L}\" stroke-width=\"6\"/>\n    <g data-p=\"pupila\" data-cx=\"${cx}\" data-cy=\"${cy}\"><circle cx=\"${cx}\" cy=\"${cy}\" r=\"${rp}\" fill=\"${L}\"/><circle cx=\"${cx - rp * .35}\" cy=\"${cy - rp * .4}\" r=\"${rp * .35}\" fill=\"#fff\"/></g>`;\n}\n\n/** SVG do personagem. `p` = chave de PERSONAGENS ou objeto {desenho, cabelo, cores}. viewBox 400\u00d7640, p\u00e9s em y\u2248615. */\nfunction svgPersonagem(p, coresExtra) {\n  const base = typeof p === 'string' ? (PERSONAGENS[p] || PERSONAGENS.be) : p;\n  const c = { ...base.cores, ...(coresExtra || {}) };\n  let corpo = '';\n  if (base.desenho === 'pessoa') {\n    const cab = base.cabelo || 'curto';\n    const atras = cab === 'longo' ? `<path d=\"M105 190 Q100 330 140 395 L262 395 Q300 330 295 190 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>` : '';\n    const topo = {\n      curto: `<path d=\"M108 190 Q110 92 200 88 Q292 92 292 190 Q270 140 200 140 Q140 140 108 190Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      longo: `<path d=\"M104 200 Q100 90 200 86 Q300 90 296 200 Q262 128 200 138 Q160 130 128 168 Q116 186 104 200Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      coque: `<circle cx=\"200\" cy=\"74\" r=\"40\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/><path d=\"M108 188 Q110 96 200 92 Q290 96 292 188 Q262 132 200 134 Q138 132 108 188Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      careca: `<path d=\"M110 178 Q112 162 120 152\" stroke=\"${c.cabelo}\" stroke-width=\"14\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M290 178 Q288 162 280 152\" stroke=\"${c.cabelo}\" stroke-width=\"14\" stroke-linecap=\"round\" fill=\"none\"/>`,\n    }[cab] || '';\n    const barba = base.barba ? `<path d=\"M128 236 Q140 318 200 322 Q260 318 272 236 Q250 286 200 288 Q150 286 128 236Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"6\"/>` : '';\n    corpo = `\n      <g data-p=\"pernas\">\n        <path d=\"M172 470 L166 590\" stroke=\"${L}\" stroke-width=\"44\" stroke-linecap=\"round\"/><path d=\"M172 470 L166 590\" stroke=\"${c.calca}\" stroke-width=\"30\" stroke-linecap=\"round\"/>\n        <path d=\"M228 470 L234 590\" stroke=\"${L}\" stroke-width=\"44\" stroke-linecap=\"round\"/><path d=\"M228 470 L234 590\" stroke=\"${c.calca}\" stroke-width=\"30\" stroke-linecap=\"round\"/>\n        <ellipse cx=\"158\" cy=\"604\" rx=\"40\" ry=\"18\" fill=\"${c.sapato}\" stroke=\"${L}\" stroke-width=\"6\"/><ellipse cx=\"242\" cy=\"604\" rx=\"40\" ry=\"18\" fill=\"${c.sapato}\" stroke=\"${L}\" stroke-width=\"6\"/>\n      </g>\n      ${membro('bracoE', 140, 330, 104, 448, c.roupa, c.pele)}\n      <path d=\"M128 322 Q200 296 272 322 L284 488 Q200 504 116 488 Z\" fill=\"${c.roupa}\" stroke=\"${L}\" stroke-width=\"8\" stroke-linejoin=\"round\"/>\n      <path d=\"M176 312 L200 352 L224 312\" fill=\"none\" stroke=\"${L}\" stroke-width=\"6\" opacity=\".55\"/>\n      ${membro('bracoD', 260, 330, 296, 448, c.roupa, c.pele)}\n      <g data-p=\"cabeca\" data-ox=\"200\" data-oy=\"300\">\n        ${atras}\n        <rect x=\"178\" y=\"270\" width=\"44\" height=\"46\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"6\"/>\n        <ellipse cx=\"200\" cy=\"198\" rx=\"98\" ry=\"108\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"8\"/>\n        ${barba}\n        <circle cx=\"140\" cy=\"236\" r=\"16\" fill=\"#ff7a7a\" opacity=\".35\"/><circle cx=\"260\" cy=\"236\" r=\"16\" fill=\"#ff7a7a\" opacity=\".35\"/>\n        ${olho(162, 196, 20, 10)}${olho(238, 196, 20, 10)}\n        <rect data-p=\"palpebra\" data-h=\"48\" x=\"138\" y=\"170\" width=\"48\" height=\"0\" fill=\"${c.pele}\"/>\n        <rect data-p=\"palpebra\" data-h=\"48\" x=\"214\" y=\"170\" width=\"48\" height=\"0\" fill=\"${c.pele}\"/>\n        <path data-p=\"sobrancelha\" data-oy=\"160\" d=\"M140 164 Q162 150 184 162\" stroke=\"${L}\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path data-p=\"sobrancelha\" data-oy=\"160\" d=\"M216 162 Q238 150 260 164\" stroke=\"${L}\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path data-p=\"boca\" data-cx=\"200\" data-cy=\"258\" data-w=\"52\" d=\"\" fill=\"#6e1b23\" stroke=\"${L}\" stroke-width=\"7\" stroke-linejoin=\"round\"/>\n        ${topo}\n      </g>`;\n  } else {\n    // c\u00e2mera BW (be) e rob\u00f4: a cabe\u00e7a \u00e9 o pr\u00f3prio corpo\n    const robo = base.desenho === 'robo';\n    corpo = `\n      <g data-p=\"pernas\" stroke=\"${L}\" stroke-width=\"10\" stroke-linecap=\"round\">\n        <path d=\"M168 500 L160 596\" stroke=\"${robo ? c.pe : L}\" stroke-width=\"${robo ? 22 : 12}\"/><path d=\"M232 500 L240 596\" stroke=\"${robo ? c.pe : L}\" stroke-width=\"${robo ? 22 : 12}\"/>\n        <ellipse cx=\"152\" cy=\"604\" rx=\"42\" ry=\"18\" fill=\"${c.pe}\" stroke-width=\"7\"/><ellipse cx=\"248\" cy=\"604\" rx=\"42\" ry=\"18\" fill=\"${c.pe}\" stroke-width=\"7\"/>\n      </g>\n      ${membro('bracoE', 96, 360, 64, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}\n      ${membro('bracoD', 304, 360, 336, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}\n      <g data-p=\"cabeca\" data-ox=\"200\" data-oy=\"520\">\n        ${robo ? `<path d=\"M200 220 L200 168\" stroke=\"${L}\" stroke-width=\"8\"/><circle data-p=\"luzinha\" cx=\"200\" cy=\"160\" r=\"16\" fill=\"${c.detalhe}\" stroke=\"${L}\" stroke-width=\"6\"/>`\n          : `<rect x=\"122\" y=\"208\" width=\"104\" height=\"54\" rx=\"14\" fill=\"${c.detalhe}\" stroke=\"${L}\" stroke-width=\"8\"/>`}\n        <rect x=\"86\" y=\"236\" width=\"228\" height=\"282\" rx=\"${robo ? 70 : 46}\" fill=\"${c.corpo}\" stroke=\"${L}\" stroke-width=\"10\"/>\n        ${robo ? `<rect x=\"120\" y=\"300\" width=\"160\" height=\"110\" rx=\"40\" fill=\"#1a1f2b\" stroke=\"${L}\" stroke-width=\"6\"/>` : `<circle data-p=\"luzinha\" cx=\"276\" cy=\"276\" r=\"13\" fill=\"#ff3b3b\"/>`}\n        ${robo ? `<ellipse cx=\"166\" cy=\"352\" rx=\"24\" ry=\"26\" fill=\"${c.lente}\"/><g data-p=\"pupila\" data-cx=\"166\" data-cy=\"352\"><circle cx=\"166\" cy=\"352\" r=\"10\" fill=\"#08333a\"/></g>\n                  <ellipse cx=\"234\" cy=\"352\" rx=\"24\" ry=\"26\" fill=\"${c.lente}\"/><g data-p=\"pupila\" data-cx=\"234\" data-cy=\"352\"><circle cx=\"234\" cy=\"352\" r=\"10\" fill=\"#08333a\"/></g>\n                  <rect data-p=\"palpebra\" data-h=\"56\" x=\"138\" y=\"324\" width=\"124\" height=\"0\" fill=\"#1a1f2b\"/>`\n          : `<circle cx=\"160\" cy=\"372\" r=\"72\" fill=\"${L}\"/><circle cx=\"160\" cy=\"372\" r=\"58\" fill=\"${c.lente}\"/><circle cx=\"160\" cy=\"372\" r=\"58\" fill=\"url(#bwLente)\"/>\n             <g data-p=\"pupila\" data-cx=\"160\" data-cy=\"372\"><circle cx=\"160\" cy=\"372\" r=\"24\" fill=\"#04090f\"/><circle cx=\"146\" cy=\"356\" r=\"10\" fill=\"#fff\"/></g>\n             <circle cx=\"262\" cy=\"352\" r=\"30\" fill=\"${L}\"/><circle cx=\"262\" cy=\"352\" r=\"23\" fill=\"${c.lente}\"/>\n             <g data-p=\"pupila\" data-cx=\"262\" data-cy=\"352\"><circle cx=\"262\" cy=\"352\" r=\"10\" fill=\"#04090f\"/><circle cx=\"257\" cy=\"346\" r=\"4\" fill=\"#fff\"/></g>\n             <rect data-p=\"palpebra\" data-h=\"150\" x=\"86\" y=\"296\" width=\"228\" height=\"0\" fill=\"${c.corpo}\"/>`}\n        <path data-p=\"sobrancelha\" data-oy=\"0\" d=\"\" />\n        <path data-p=\"boca\" data-cx=\"${robo ? 200 : 228}\" data-cy=\"${robo ? 388 : 468}\" data-w=\"${robo ? 60 : 50}\" d=\"\" fill=\"${robo ? c.lente : '#7a1d1d'}\" stroke=\"${robo ? c.lente : '#F5F1EA'}\" stroke-width=\"7\" stroke-linejoin=\"round\"/>\n      </g>`;\n  }\n  return `<svg viewBox=\"0 0 400 640\" width=\"100%\" height=\"100%\" overflow=\"visible\" xmlns=\"http://www.w3.org/2000/svg\">\n    <defs><radialGradient id=\"bwLente\" cx=\"35%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#bfeaff\" stop-opacity=\".7\"/><stop offset=\".5\" stop-color=\"#1b5d86\" stop-opacity=\".1\"/><stop offset=\"1\" stop-color=\"#071824\" stop-opacity=\".8\"/></radialGradient></defs>\n    <ellipse data-p=\"sombra\" cx=\"200\" cy=\"618\" rx=\"130\" ry=\"20\" fill=\"#000\" opacity=\".45\"/>\n    <g data-p=\"tudo\">${corpo}</g></svg>`;\n}\n\n/** Anima o personagem dentro de `raiz` no tempo t. r = {t0, t1, acao, entrada, falas:[[ini,fim]], olhar, semente}. */\nfunction animarPersonagem(raiz, r, t) {\n  if (!raiz) return;\n  if (!raiz.__p) {\n    const q = (s) => [...raiz.querySelectorAll(`[data-p=\"${s}\"]`)];\n    raiz.__p = { tudo: q('tudo')[0], sombra: q('sombra')[0], cabeca: q('cabeca')[0], bE: q('bracoE')[0], bD: q('bracoD')[0],\n      pup: q('pupila'), palp: q('palpebra'), sob: q('sobrancelha'), boca: q('boca')[0], luz: q('luzinha')[0] };\n  }\n  const P = raiz.__p, lt = t - r.t0, dur = r.t1 - r.t0, sd = r.semente || 0;\n  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));\n  const fx = (a, b) => cl((lt - a) / (b - a));\n  const eOut = (x) => 1 - (1 - x) ** 3;\n  const eBack = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };\n  const acao = r.acao || 'parado';\n\n  // entrada\n  let y = 0, x = 0, sq = 0;\n  if (r.entrada === 'pula') { const e = fx(0, 0.6); y = (1 - eBack(e)) * -720; sq = Math.sin(fx(0.38, 0.62) * Math.PI) * 0.13; }\n  else if (r.entrada === 'desliza') { x = (1 - eOut(fx(0, 0.55))) * (r.lado < 0 ? -520 : 520); }\n  else if (r.entrada === 'surge') { sq = -0.25 * (1 - eBack(fx(0, 0.45))); }\n  // respira\u00e7\u00e3o, pulinhos, susto\n  const resp = Math.sin(lt * 2.3 + sd) * 5;\n  if (acao === 'comemora') y += -Math.abs(Math.sin(lt * 6.5)) * 46 * fx(0.3, 0.5);\n  if (acao === 'surpresa') { const k = fx(0.2, 0.45); y += -Math.sin(k * Math.PI) * 60; sq += -Math.sin(k * Math.PI) * 0.08; }\n  const inc = acao === 'pensa' ? 7 * eOut(fx(0.2, 0.7)) : Math.sin(lt * 1.3 + sd) * 2.2;\n  P.tudo.setAttribute('transform', `translate(${x} ${y + resp}) translate(200 615) scale(${1 + sq} ${1 - sq}) translate(-200 -615)`);\n  if (P.sombra) { P.sombra.setAttribute('rx', 130 + Math.min(0, y) * 0.12); P.sombra.setAttribute('opacity', 0.45 * (r.entrada === 'pula' ? fx(0.1, 0.55) : 1)); }\n  if (P.cabeca) P.cabeca.setAttribute('transform', `rotate(${inc} ${P.cabeca.dataset.ox} ${P.cabeca.dataset.oy})`);\n\n  // bra\u00e7os (graus; negativo = sobe o bra\u00e7o direito)\n  let aD = Math.sin(lt * 2.3 + sd + 1) * 4, aE = -Math.sin(lt * 2.3 + sd) * 4;\n  if (acao === 'acena') { const on = fx(0.25, 0.5) * (1 - fx(Math.max(0.6, dur - 0.5), Math.max(0.9, dur - 0.2))); aD += (-122 + Math.sin(lt * 11) * 24) * on; }\n  if (acao === 'aponta') aD += -78 * eOut(fx(0.2, 0.5));\n  if (acao === 'comemora') { const k = eOut(fx(0.15, 0.4)); aD += (-150 + Math.sin(lt * 13) * 10) * k; aE += (150 - Math.sin(lt * 13) * 10) * k; }\n  if (acao === 'pensa') aE += -145 * eOut(fx(0.2, 0.6));   // m\u00e3o no queixo\n  if (acao === 'surpresa') { const k = eOut(fx(0.15, 0.4)); aD += -60 * k; aE += 60 * k; }\n  if (acao === 'fala') aD += (-28 + Math.sin(lt * 4) * 14) * fx(0.2, 0.5);\n  const gira = (g, a) => g && g.setAttribute('transform', `rotate(${a} ${g.dataset.ox} ${g.dataset.oy})`);\n  gira(P.bD, aD); gira(P.bE, aE);\n\n  // olhos: piscadas em tempos fixos pela semente; olhar para o lado de quem fala\n  let pis = 0;\n  for (let k = 0; k < 8; k++) { const tp = 1.1 + k * 2.6 + ((sd * 7 + k * 3) % 10) / 10; const q = cl((lt - tp) / 0.16); pis = Math.max(pis, Math.sin(q * Math.PI)); }\n  if (acao === 'surpresa') pis = 0;\n  P.palp.forEach((p) => p.setAttribute('height', pis * Number(p.dataset.h)));\n  const ox = acao === 'pensa' ? 6 : (r.olhar || 0) * 9 + Math.sin(lt * 0.8 + sd) * 3;\n  const oy = acao === 'pensa' || acao === 'comemora' ? -8 : 0;\n  const esc = acao === 'surpresa' ? 0.72 + 0.28 * (1 - fx(0.15, 0.35)) : 1;\n  P.pup.forEach((p) => p.setAttribute('transform', `translate(${ox} ${oy}) translate(${p.dataset.cx} ${p.dataset.cy}) scale(${esc}) translate(${-p.dataset.cx} ${-p.dataset.cy})`));\n  const sob = acao === 'surpresa' ? -14 : acao === 'pensa' ? -6 : 0;\n  P.sob.forEach((s, i) => s.getAttribute('d') && s.setAttribute('transform', `translate(0 ${sob}) rotate(${acao === 'pensa' ? (i ? -8 : 0) : 0} 200 160)`));\n\n  // boca: fala = abre/fecha no ritmo de s\u00edlabas; sorriso, \"O\" de surpresa\n  if (P.boca) {\n    const cx = +P.boca.dataset.cx, cy = +P.boca.dataset.cy, w = +P.boca.dataset.w;\n    const falando = (r.falas || []).some(([a, b]) => t >= a && t < b - 0.12) || (acao === 'fala' && lt > 0.3 && lt < dur - 0.2 && !(r.falas || []).length);\n    let d;\n    if (falando) { const ab = (0.35 + 0.65 * Math.abs(Math.sin(lt * 12.5 + sd))) * w * 0.62; d = `M${cx - w / 2} ${cy} Q${cx} ${cy - 6} ${cx + w / 2} ${cy} Q${cx} ${cy + ab * 1.6} ${cx - w / 2} ${cy}Z`; }\n    else if (acao === 'surpresa') { const rr = w * 0.26; d = `M${cx - rr} ${cy + 6} a${rr} ${rr * 1.25} 0 1 0 ${rr * 2} 0 a${rr} ${rr * 1.25} 0 1 0 ${-rr * 2} 0Z`; }\n    else if (acao === 'pensa') d = `M${cx - w * 0.3} ${cy + 6} Q${cx} ${cy + 2} ${cx + w * 0.32} ${cy + 10} Q${cx} ${cy + 10} ${cx - w * 0.3} ${cy + 6}Z`;\n    else { const s = acao === 'comemora' ? 0.75 : 0.42; d = `M${cx - w / 2} ${cy} Q${cx} ${cy + w * s} ${cx + w / 2} ${cy} Q${cx} ${cy + w * s * 0.35} ${cx - w / 2} ${cy}Z`; }\n    P.boca.setAttribute('d', d);\n  }\n  if (P.luz) P.luz.setAttribute('opacity', Math.floor(lt * 2) % 2 ? 0.25 : 1);\n}\n";

function css(p) {
  const e = p.estilo, W = p.largura, H = p.altura, u = W / 1080;
  const topo = p.vertical ? H * 0.11 : H * 0.08;
  const base = p.vertical ? H * 0.25 : H * 0.12;
  const brilho = e.brilho ? `text-shadow: 0 0 ${18 * u}px var(--destaque), 0 0 ${48 * u}px var(--destaque);` : '';
  return `
@font-face{font-family:'BWPesada';src:local('Inter Display Black'),local('Inter Black'),local('Inter ExtraBold'),local('Arial Black'),local('Impact')}
:root{--fundo:${e.fundo};--texto:${e.texto};--destaque:${e.destaque};--suave:${e.suave};--ft:${e.fonteTitulo};--fx:${e.fonteTexto}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--fundo)}
#stage{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:${e.gradiente || 'var(--fundo)'};color:var(--texto);font-family:var(--fx)}
.cena{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;
  padding:${topo}px ${W * 0.075}px ${base}px;gap:${36 * u}px;visibility:hidden;will-change:transform,opacity,filter}
.cena.tipo-midia{justify-content:flex-start;padding-top:${topo + 40 * u}px}
.midia{position:absolute;inset:0;z-index:0;overflow:hidden}
.midia-el,video.clip{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.escurecer{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,.05) 35%,rgba(0,0,0,.25) 60%,rgba(0,0,0,.8) 100%)}
.cena>*:not(.midia):not(.escurecer){position:relative;z-index:2}
.titulo{font-family:var(--ft);font-weight:${e.pesoTitulo};${e.caixaAlta ? 'text-transform:uppercase;' : ''}line-height:1.0;font-size:${108 * u}px;letter-spacing:${e.espacamento || (e.caixaAlta ? 0.01 : -0.02)}em}
.titulo.gigante{font-size:${(e.caixaAlta ? 158 : 128) * u}px;line-height:.95}
.titulo.pequeno{font-size:${84 * u}px}
.titulo.citacao{font-size:${92 * u}px;line-height:1.12;text-transform:none;font-family:var(--ft)}
.w{display:inline-block;margin:0 ${0.12}em;will-change:transform,opacity,filter}
.enf{color:var(--destaque);${brilho}}
.chamada{font-size:${30 * u}px;font-weight:800;letter-spacing:.25em;text-transform:uppercase;color:var(--fundo);background:var(--destaque);padding:${10 * u}px ${24 * u}px;border-radius:999px}
.sub{font-size:${52 * u}px;line-height:1.3;color:var(--suave);max-width:92%}
.numero{font-family:var(--ft);font-size:${300 * u}px;line-height:1;color:var(--destaque);font-weight:${e.pesoTitulo};${brilho}font-variant-numeric:tabular-nums}
.rotulo{font-size:${62 * u}px;line-height:1.25;font-weight:600;max-width:90%}
.fonte{position:absolute!important;bottom:${base - 60 * u}px;left:0;right:0;font-size:${30 * u}px;color:var(--suave);letter-spacing:.02em}
.lista{list-style:none;display:flex;flex-direction:column;gap:${28 * u}px;width:100%;text-align:left}
.item{display:flex;align-items:center;gap:${30 * u}px;font-size:${60 * u}px;font-weight:600;line-height:1.2}
.item b{flex:none;width:${96 * u}px;height:${96 * u}px;border-radius:50%;display:grid;place-items:center;background:var(--destaque);color:var(--fundo);font-family:var(--ft);font-size:${44 * u}px}
.aspas{font-family:Georgia,serif;font-size:${260 * u}px;line-height:.6;color:var(--destaque);height:${130 * u}px}
.botao{background:var(--destaque);color:var(--fundo);font-weight:900;font-size:${46 * u}px;padding:${26 * u}px ${56 * u}px;border-radius:999px;letter-spacing:.02em}
.numero small{font-size:.32em;color:var(--texto);font-family:var(--fx);font-weight:800;margin:0 .15em}
#luz{z-index:0;inset:-30%;background:radial-gradient(35% 25% at 50% 50%,var(--destaque),transparent 70%);opacity:.13;filter:blur(40px)}
.rodape{margin-bottom:${20 * u}px}
#legendas{position:absolute;left:${W * 0.06}px;right:${W * 0.06}px;top:${p.vertical ? H * 0.64 : H * 0.78}px;z-index:20;text-align:center;
  font-family:var(--fx);font-weight:900;font-size:${68 * u}px;line-height:1.15;text-transform:uppercase;
  text-shadow:0 ${4 * u}px ${18 * u}px rgba(0,0,0,.85),0 0 ${3 * u}px rgba(0,0,0,.9)}
#legendas .lw{display:inline-block;margin:0 .14em;opacity:.95;transition:none}
#legendas .lw.ativa{color:var(--destaque);transform:scale(1.12)}
#legendas .lw.futura{opacity:.45}
.global{position:absolute;inset:0;pointer-events:none}
#grao{z-index:30;opacity:.10;mix-blend-mode:overlay;inset:-50%;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
#vinheta{z-index:31;background:radial-gradient(120% 90% at 50% 50%,transparent 55%,rgba(0,0,0,.55) 100%)}
.barra{position:absolute;left:0;right:0;height:${H * 0.065}px;background:#000;z-index:32}
#progresso{position:absolute;left:0;bottom:0;height:${8 * u}px;width:0;background:var(--destaque);z-index:33}
#marca{position:absolute;top:${topo * 0.45}px;left:0;right:0;text-align:center;z-index:34;font-size:${28 * u}px;font-weight:800;letter-spacing:.18em;color:var(--texto);opacity:.75}
.flash{position:absolute;inset:0;background:#fff;z-index:40;visibility:hidden}
.tipo-personagem{justify-content:flex-start}
.cenario{position:absolute!important;z-index:0!important;pointer-events:none}
.cenario.raios{inset:-40%;background:repeating-conic-gradient(from 0deg at 50% 50%,color-mix(in srgb,var(--destaque) 22%,transparent) 0deg 9deg,transparent 9deg 24deg);opacity:.55;
  -webkit-mask:radial-gradient(closest-side,#000 30%,transparent 100%);mask:radial-gradient(closest-side,#000 30%,transparent 100%)}
.cenario.palco{inset:0}
.cenario.palco .chao{position:absolute;left:-10%;right:-10%;bottom:${base - 40 * u}px;height:${H * 0.22}px;border-radius:50%;background:radial-gradient(60% 50% at 50% 40%,color-mix(in srgb,var(--destaque) 35%,#000) 0%,rgba(0,0,0,.6) 70%,transparent 100%)}
.cenario.palco .spot{position:absolute;top:-5%;width:${W * 0.55}px;height:${H * 0.9}px;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 85%);clip-path:polygon(45% 0,55% 0,100% 100%,0 100%);filter:blur(${6 * u}px)}
.cenario.palco .spot.e{left:-6%;transform:rotate(-14deg);transform-origin:50% 0}.cenario.palco .spot.d{right:-6%;transform:rotate(14deg);transform-origin:50% 0}
.cenario.bolinhas{inset:-10% 0;background-image:radial-gradient(color-mix(in srgb,var(--destaque) 40%,transparent) ${5 * u}px,transparent ${6 * u}px);background-size:${90 * u}px ${90 * u}px;opacity:.35}
.topo-pers{margin-top:${10 * u}px}
.ator{position:absolute!important;bottom:${base - 10 * u}px;height:${H * (p.vertical ? 0.46 : 0.62)}px;aspect-ratio:400/640;left:50%;margin-left:${-(H * (p.vertical ? 0.46 : 0.62) * 0.625) / 2}px;z-index:3!important}
.ator.duplo{height:${H * (p.vertical ? 0.37 : 0.54)}px;margin-left:${-(H * (p.vertical ? 0.37 : 0.54) * 0.625) / 2}px}
.ator.lado-1{left:${p.vertical ? 27 : 30}%}.ator.lado1{left:${p.vertical ? 73 : 70}%}
.ator.solo.lado-1{left:32%}.ator.solo.lado1{left:68%}
.ator svg{display:block;width:100%;height:100%}
.balao{position:absolute!important;z-index:5!important;top:${p.vertical ? H * 0.2 : H * 0.12}px;left:50%;width:${W * (p.vertical ? 0.78 : 0.42)}px;margin-left:${-W * (p.vertical ? 0.39 : 0.21)}px;
  background:#fff;color:#111;border:${6 * u}px solid #0b0d12;border-radius:${40 * u}px;padding:${26 * u}px ${34 * u}px;font-family:var(--fx);font-weight:800;
  font-size:${54 * u}px;line-height:1.18;text-align:center;box-shadow:0 ${14 * u}px 0 rgba(0,0,0,.35);opacity:0}
.balao::after{content:'';position:absolute;bottom:${-34 * u}px;left:50%;margin-left:${-22 * u}px;border:${22 * u}px solid transparent;border-top:${30 * u}px solid #0b0d12}
.balao.duplo{width:${W * (p.vertical ? 0.56 : 0.34)}px;font-size:${48 * u}px}
.balao.duplo.lado-1{left:${p.vertical ? 40 : 38}%;margin-left:${-W * (p.vertical ? 0.28 : 0.17)}px}.balao.duplo.lado1{left:${p.vertical ? 60 : 62}%;margin-left:${-W * (p.vertical ? 0.28 : 0.17)}px}
.balao.duplo.lado-1::after{left:${p.vertical ? 27 : 30}%}.balao.duplo.lado1::after{left:${p.vertical ? 73 : 70}%}
`;
}

function no(n, sabor) {
  if (n.tag === 'video' && sabor === 'hyperframes') return ''; // vídeos viram clips de topo no HyperFrames
  const attrs = [`id="${n.id}"`, n.classe ? `class="${n.classe}"` : ''];
  if (n.tag === 'video') attrs.push(`src="${n.src}"`, 'muted', 'playsinline', 'preload="auto"');
  if (n.tag === 'img') return `<img ${attrs.join(' ')} src="${n.src}" alt="">`;
  const filhos = (n.filhos || []).map((f) => no(f, sabor)).join('');
  return `<${n.tag} ${attrs.join(' ')}>${n.html ?? ''}${filhos}</${n.tag}>`;
}

function coletar(nos, acc = []) {
  for (const n of nos) {
    if (n.tweens?.length || n.inicio !== undefined || n.contador || n.tag === 'video' || n.rig) {
      acc.push({ id: n.id, tweens: n.tweens || [], inicio: n.inicio, fim: n.fim, contador: n.contador,
        video: n.tag === 'video', inicioNoArquivo: n.inicioNoArquivo, rig: n.rig });
    }
    if (n.filhos) coletar(n.filhos, acc);
  }
  return acc;
}

const RUNTIME = (sabor) => `
${ANIM}
${PERS}
const P = window.__PLANO;
const ELS = P.els.map(e => ({...e, el: document.getElementById(e.id)}));
const LEG = document.getElementById('legendas');
const GRAO = document.getElementById('grao');
const PROG = document.getElementById('progresso');
const LUZ = document.getElementById('luz');
let ultimaPagina = null;
function aplicar(t){
  for (const e of ELS){
    if (!e.el) continue;
    if (e.inicio !== undefined && !e.video){ e.el.style.visibility = (t >= e.inicio && t < e.fim) ? 'visible' : 'hidden'; }
    if (e.tweens.length){ const c = estadoParaCss(estadoEm(e.tweens, t)); e.el.style.opacity=c.opacity; e.el.style.transform=c.transform; e.el.style.filter=c.filter; if(c.letterSpacing) e.el.style.letterSpacing=c.letterSpacing; }
    if (e.contador){ e.el.innerHTML = formatarNumero(contadorEm(e.contador, t), e.contador); }
    if (e.rig && t >= e.rig.t0 - 0.05 && t < e.rig.t1 + 0.05){ animarPersonagem(e.el, e.rig, Math.max(e.rig.t0, Math.min(t, e.rig.t1))); }
  }
  if (LEG){
    const l = legendaEm(P.legendas, t);
    if (!l){ LEG.innerHTML=''; ultimaPagina=null; }
    else {
      if (ultimaPagina !== l.pagina){ LEG.innerHTML = l.pagina.palavras.map(w=>'<span class="lw">'+w.txt+'</span>').join(' '); ultimaPagina = l.pagina; }
      [...LEG.children].forEach((s,i)=>{ s.className = 'lw' + (i===l.ativa ? ' ativa' : i>l.ativa ? ' futura' : ''); if (l.pagina.palavras[i].enfase) s.style.color='var(--destaque)'; });
    }
  }
  if (GRAO){ const f = Math.floor(t*P.fps)%8; GRAO.style.transform = 'translate(' + ((f*37)%100-50) + 'px,' + ((f*61)%100-50) + 'px)'; }
  if (LUZ){ const k=t/P.duracao; LUZ.style.transform='translate('+(Math.sin(k*Math.PI*2)*18)+'%,'+(-20+k*40)+'%)'; }
  if (PROG) PROG.style.width = (Math.min(1, t/P.duracao)*100) + '%';
}
${sabor === 'nativo' ? `
window.__seek = async (t) => {
  aplicar(t);
  const espera = [];
  for (const e of ELS){
    if (!e.video || !e.el) continue;
    const on = t >= e.inicio && t < e.fim;
    if (window.__PREVIEW){   /* prévia ao vivo (Brightway): o vídeo toca sozinho e só corrige quando desvia */
      if (!on){ if (!e.el.paused) e.el.pause(); continue; }
      const alvoP = e.inicioNoArquivo + (t - e.inicio);
      if (window.__TOCANDO){
        if (e.el.paused){ try { e.el.currentTime = alvoP; } catch(_){} e.el.play().catch(()=>{}); }
        else if (Math.abs(e.el.currentTime - alvoP) > 0.35){ try { e.el.currentTime = alvoP; } catch(_){} }
      } else {
        if (!e.el.paused) e.el.pause();
        if (Math.abs(e.el.currentTime - alvoP) > 0.04){ try { e.el.currentTime = alvoP; } catch(_){} }
      }
      continue;
    }
    if (!on) continue;
    const alvo = e.inicioNoArquivo + (t - e.inicio);
    if (Math.abs(e.el.currentTime - alvo) > 0.001){
      espera.push(new Promise(r => { const ok = () => { e.el.removeEventListener('seeked', ok); r(); }; e.el.addEventListener('seeked', ok); setTimeout(r, 3000); e.el.currentTime = alvo; }));
    }
  }
  await Promise.all(espera);
};
window.__pronto = (async () => {
  try { await document.fonts.ready; } catch(e) {}
  await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
  await Promise.all([...document.querySelectorAll('video')].map(v => v.readyState >= 2 ? 0 : new Promise(r => { v.onloadeddata = v.onerror = r; setTimeout(r, 8000); })));
  aplicar(0); return true;
})();
` : `
// HyperFrames: uma única tween GSAP em um "setter" chama aplicar(t) a cada frame, inclusive em seek.
const proxy = { _t: 0, get t(){ return this._t; }, set t(v){ this._t = v; aplicar(v); } };
const tl = gsap.timeline({ paused: true });
tl.to(proxy, { t: P.duracao, duration: P.duracao, ease: 'none' }, 0);
window.__timelines = window.__timelines || {};
window.__timelines.reel = tl;
aplicar(0);
`}
`;

function construirHtml(plano, sabor = 'nativo') {
  const fx = plano.efeitos;
  const todos = [...plano.cenas, ...plano.globais];
  const dados = { fps: plano.fps, duracao: plano.duracao, legendas: plano.legendas, els: coletar(todos) };
  const cenasHtml = plano.cenas.map((c) => no(c, sabor)).join('\n');
  const globaisHtml = plano.globais.map((g) => no(g, sabor)).join('\n');

  // HyperFrames: vídeos como clips de topo (track 0) e áudios como elementos <audio>
  let clipsHf = '';
  if (sabor === 'hyperframes') {
    const vids = [];
    const busca = (ns) => ns.forEach((n) => { if (n.tag === 'video') vids.push(n); if (n.filhos) busca(n.filhos); });
    busca(plano.cenas);
    clipsHf = vids.map((v) => `<video class="clip" data-start="${v.inicio.toFixed(3)}" data-duration="${(v.fim - v.inicio).toFixed(3)}" data-track-index="0" src="${v.src}" muted playsinline></video>`).join('\n');
    clipsHf += '\n' + plano.audios.concat(plano.sfxArquivos || []).map((a, i) => `<audio data-start="${(a.inicio || 0).toFixed(3)}" data-duration="${(a.duracao || plano.duracao).toFixed(3)}" data-track-index="${10 + i}" data-volume="${a.volume ?? 1}" src="${a.src}"></audio>`).join('\n');
  }

  const raiz = sabor === 'hyperframes'
    ? `<div id="stage" data-composition-id="reel" data-start="0" data-width="${plano.largura}" data-height="${plano.altura}">`
    : `<div id="stage">`;

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${plano.titulo}</title>
<link rel="stylesheet" href="${GOOGLE_FONTS}">
<style>${css(plano)}</style></head><body>
${raiz}
${clipsHf}
${fx.luz !== false ? '<div id="luz" class="global"></div>' : ''}
${cenasHtml}
${globaisHtml}
<div id="legendas"></div>
${fx.letterbox ? '<div class="barra" style="top:0"></div><div class="barra" style="bottom:0"></div>' : ''}
${fx.vinheta ? '<div id="vinheta" class="global"></div>' : ''}
${fx.grao ? '<div id="grao" class="global"></div>' : ''}
${fx.barraProgresso ? '<div id="progresso"></div>' : ''}
${plano.marca?.handle ? `<div id="marca">${plano.marca.handle}</div>` : ''}
${sabor === 'hyperframes' ? '<script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>' : ''}
<script>window.__PLANO = ${JSON.stringify(dados)}; window.__DUR = ${plano.duracao}; window.__W = ${plano.largura}; window.__H = ${plano.altura}; window.__FPS = ${plano.fps};</script>
<script>${RUNTIME(sabor)}</script>
</div></body></html>`;
}

// Validação barata ANTES do render (evita gastar tempo e tokens renderizando roteiro quebrado).
// Uso direto: node motor/validar.mjs projetos/<slug>/roteiro.json


const TIPOS = ['gancho', 'texto', 'midia', 'dado', 'lista', 'citacao', 'cta', 'personagem'];
const palavras = (s = '') => String(s).split(/\s+/).filter(Boolean).length;

function validarRoteiro(r, proj, avisos = []) {
  const e = [];
  if (!Array.isArray(r.cenas) || !r.cenas.length) return ['"cenas" vazio'];
  if (r.formato && !FORMATOS[r.formato]) e.push(`formato "${r.formato}" inválido (${Object.keys(FORMATOS).join(', ')})`);
  if (r.estilo && !ESTILOS[r.estilo]) e.push(`estilo "${r.estilo}" inválido (${Object.keys(ESTILOS).join(', ')})`);
  if (r.motor && !['nativo', 'hyperframes', 'remotion'].includes(r.motor)) e.push(`motor "${r.motor}" inválido`);

  let total = 0;
  r.cenas.forEach((c, i) => {
    const n = `cena ${i + 1} (${c.tipo})`;
    if (!TIPOS.includes(c.tipo)) e.push(`${n}: tipo inválido — use ${TIPOS.join(', ')}`);
    const d = Number(c.duracao);
    if (!(d > 0)) e.push(`${n}: "duracao" obrigatória (segundos)`);
    total += d || 0;
    if (c.midia && proj && !(typeof existsSync === 'function' ? existsSync : () => true)(join(proj, c.midia))) e.push(`${n}: mídia não encontrada: ${c.midia}`);
    if (c.tipo === 'gancho' && !c.texto) e.push(`${n}: gancho sem "texto"`);
    if (c.tipo === 'dado') {
      if (c.valor === undefined) e.push(`${n}: "valor" obrigatório`);
      if (!c.fonte) e.push(`${n}: todo dado precisa de "fonte" visível na tela`);
    }
    if (c.tipo === 'lista' && !Array.isArray(c.itens)) e.push(`${n}: "itens" obrigatório`);
    if (c.tipo === 'personagem') {
      const el = c.elenco && c.elenco.length ? c.elenco : [{ personagem: c.personagem || 'be', acao: c.acao }];
      if (el.length > 2) e.push(`${n}: no máximo 2 personagens por cena`);
      el.forEach((a) => {
        if (a.personagem && !PERSONAGENS[a.personagem]) e.push(`${n}: personagem "${a.personagem}" não existe (${Object.keys(PERSONAGENS).join(', ')})`);
        if (a.acao && !ACOES.includes(a.acao)) e.push(`${n}: ação "${a.acao}" inválida (${ACOES.join(', ')})`);
      });
      const fs = c.falas || (c.balao ? [{ texto: c.balao }] : []);
      const pw = fs.reduce((s2, f) => s2 + palavras(f.texto), 0) + palavras(c.texto);
      if (d && pw / d > 2.8) avisos.push(`${n}: ${pw} palavras de balão em ${d}s — aumente a duração (balão precisa de tempo para ler)`);
      fs.forEach((f) => { if (palavras(f.texto) > 14) avisos.push(`${n}: balão longo (${palavras(f.texto)} palavras) — divida em duas falas`); });
    }
    // leitura confortável: ~3,2 palavras/s de texto na tela
    const txt = [c.texto, c.titulo, c.subtitulo, c.rotulo, ...(c.itens || [])].filter(Boolean).join(' ');
    if (c.tipo !== 'personagem' && d && palavras(txt) / d > 3.2) avisos.push(`${n}: ${palavras(txt)} palavras em ${d}s — difícil de ler; aumente a duração ou corte texto`);
    if (c.fala && d && palavras(c.fala) / d > 3.6) avisos.push(`${n}: fala rápida demais (${palavras(c.fala)} palavras em ${d}s)`);
  });

  if (r.cenas[0].tipo !== 'gancho' && r.cenas[0].tipo !== 'personagem') avisos.push('a 1ª cena não é "gancho" — o vídeo perde força nos 3 primeiros segundos');
  else if (r.cenas[0].duracao > 3.5) avisos.push('gancho com mais de 3,5s — encurte para segurar a retenção');
  if (total > 90) avisos.push(`duração total ${total.toFixed(1)}s — acima de 90s fica fora do formato Reels`);
  if (r.cenas.some((c) => c.tipo === 'dado') && !(r.fontes || []).length) e.push('há dados no roteiro mas a lista "fontes" está vazia — rode a pesquisa validada');
  for (const f of r.fontes || []) if (!f.url || !f.afirmacao) e.push(`fonte incompleta: ${JSON.stringify(f)} (precisa de "afirmacao" e "url")`);

  const au = r.audio || {};
  for (const k of ['musica', 'narracao']) if (au[k] && proj && !(typeof existsSync === 'function' ? existsSync : () => true)(join(proj, au[k]))) e.push(`áudio não encontrado: ${au[k]}`);
  return e;
}

window.BWReelsMotor = { criarPlano: criarPlano, validarRoteiro: validarRoteiro, construirHtml: construirHtml, css: css, ESTILOS: ESTILOS, FORMATOS: FORMATOS,
  estadoEm: estadoEm, legendaEm: legendaEm, PERSONAGENS: PERSONAGENS, ACOES: ACOES, svgPersonagem: svgPersonagem, versao: 2 };
})();
