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

const PADRAO = { opacity: 1, x: 0, y: 0, scale: 1, rot: 0, blur: 0, ls: 0, p: 0 };   // p = progresso 0..1 (vira a variável CSS --p)

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
    p: s.p,
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
  cinegrafista: { nome: 'Cinegrafista', desenho: 'pessoa', cabelo: 'curto', barba: 'cavanhaque', roupa: 'jaqueta', acessorio: 'camera', bone: true, cores: { pele: '#d8a07a', cabelo: '#2b1d14', roupa: '#24272f', calca: '#3b4250', sapato: '#111', detalhe: '#FFB547' } },
  tecnico: { nome: 'Técnico de som', desenho: 'pessoa', cabelo: 'curto', barba: 'cheia', roupa: 'camiseta', acessorio: 'headset', cores: { pele: '#b97d55', cabelo: '#1a1410', roupa: '#1d1f26', calca: '#2c3446', sapato: '#111', detalhe: '#FFB547' } },
  dj: { nome: 'DJ', desenho: 'pessoa', cabelo: 'moicano', oculos: 'escuro', roupa: 'jaqueta', acessorio: 'headset', cores: { pele: '#7a4a2e', cabelo: '#ff3db8', roupa: '#3a1f6b', calca: '#18181f', sapato: '#f5f1ea', detalhe: '#7cf7ff' } },
  palestrante: { nome: 'Palestrante', desenho: 'pessoa', cabelo: 'franja', roupa: 'social', acessorio: 'microfone', cores: { pele: '#f0c4a2', cabelo: '#7a4b2a', roupa: '#f4f4f4', calca: '#2b2f3a', sapato: '#1a1a1a', detalhe: '#c8102e' } },
  executivo: { nome: 'Executivo', desenho: 'pessoa', cabelo: 'curto', roupa: 'terno', cores: { pele: '#e9b996', cabelo: '#3b2a1d', roupa: '#1f2a44', calca: '#1f2a44', sapato: '#111', detalhe: '#c8102e' } },
  executiva: { nome: 'Executiva', desenho: 'pessoa', cabelo: 'coque', oculos: 'quadrado', roupa: 'terno', cores: { pele: '#9b6343', cabelo: '#1c120c', roupa: '#2b2b33', calca: '#2b2b33', sapato: '#111', detalhe: '#FFB547' } },
  noiva: { nome: 'Noiva', desenho: 'pessoa', cabelo: 'longo', roupa: 'vestido', acessorio: 'veu', cores: { pele: '#f2cdb0', cabelo: '#4a2c1a', roupa: '#fbf8f2', calca: '#fbf8f2', sapato: '#efe6d6', detalhe: '#e8c26a' } },
  noivo: { nome: 'Noivo', desenho: 'pessoa', cabelo: 'curto', barba: 'bigode', roupa: 'terno', cores: { pele: '#c48a64', cabelo: '#16110d', roupa: '#121218', calca: '#121218', sapato: '#0a0a0a', detalhe: '#f4f4f4' } },
  fotografa: { nome: 'Fotógrafa', desenho: 'pessoa', cabelo: 'cacheado', roupa: 'jaqueta', acessorio: 'camera', cores: { pele: '#6e432b', cabelo: '#1b120c', roupa: '#c9772f', calca: '#2a3142', sapato: '#111', detalhe: '#111' } },
  cliente: { nome: 'Cliente', desenho: 'pessoa', cabelo: 'rabo', roupa: 'camiseta', acessorio: 'cracha', cores: { pele: '#f3cfb3', cabelo: '#c98a2f', roupa: '#7b5cff', calca: '#2b3550', sapato: '#1b1f2a', detalhe: '#ff4d6d' } },
  garcom: { nome: 'Garçom', desenho: 'pessoa', cabelo: 'curto', barba: 'bigode', roupa: 'avental', cores: { pele: '#d9a47f', cabelo: '#222', roupa: '#f4f4f4', calca: '#151515', sapato: '#0a0a0a', detalhe: '#1b1b1b' } },
  cachorro: { nome: 'Cachorro', desenho: 'pessoa', bicho: 'cachorro', roupa: 'camiseta', cores: { pele: '#c08a55', cabelo: '#7a4f2a', roupa: '#2f80ed', calca: '#c08a55', sapato: '#7a4f2a', detalhe: '#ff4d6d' } },
  gato: { nome: 'Gato', desenho: 'pessoa', bicho: 'gato', roupa: 'camiseta', cores: { pele: '#9aa3ad', cabelo: '#5f6873', roupa: '#22b07d', calca: '#9aa3ad', sapato: '#5f6873', detalhe: '#ffb3c7' } },
};

/** Opções do CRIAR PERSONAGEM (montador). Um personagem montado vai no roteiro como {personagem:'meu', look:{…}}. */
const MONTADOR = {
  bicho: { nenhum: 'Pessoa', cachorro: 'Cachorro', gato: 'Gato' },
  cabelo: { curto: 'Curto', longo: 'Longo', coque: 'Coque', cacheado: 'Cacheado', rabo: 'Rabo de cavalo', franja: 'Franja', moicano: 'Moicano', careca: 'Careca' },
  barba: { nenhuma: 'Sem barba', cheia: 'Barba cheia', bigode: 'Bigode', cavanhaque: 'Cavanhaque' },
  oculos: { nenhum: 'Sem óculos', redondo: 'Redondo', quadrado: 'Quadrado', escuro: 'Escuro' },
  roupa: { camiseta: 'Camiseta', social: 'Camisa e gravata', terno: 'Terno', jaqueta: 'Jaqueta', vestido: 'Vestido', avental: 'Avental' },
  acessorio: { nenhum: 'Nenhum', headset: 'Headset', camera: 'Câmera na mão', microfone: 'Microfone', cracha: 'Crachá', veu: 'Véu' },
  bone: { nao: 'Sem boné', sim: 'Com boné' },
  peles: ['#f6d7bf', '#f0c4a2', '#e3b08e', '#d8a07a', '#c48a64', '#a86e4a', '#8a5a3b', '#6e432b', '#4e2f1f'],
};

const ACOES = ['parado', 'acena', 'fala', 'aponta', 'comemora', 'pensa', 'surpresa'];
// "foto" = personagem do PRÓPRIO usuário (PNG recortado): {personagem:'foto', imagem:'midia/avatar.png', contorno:true, espelhar:false}
const FOTO = 'foto';

const L = '#0b0d12'; // contorno (estilo desenho animado)

function membro(id, x1, y1, x2, y2, cor, mao, extra = '') {
  return `<g data-p="${id}" data-ox="${x1}" data-oy="${y1}">
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${L}" stroke-width="40" stroke-linecap="round"/>
    <path d="M${x1} ${y1} L${x2} ${y2}" stroke="${cor}" stroke-width="26" stroke-linecap="round"/>
    ${extra}<circle cx="${x2}" cy="${y2 + 6}" r="20" fill="${mao}" stroke="${L}" stroke-width="7"/></g>`;
}
const sorriso = (cx, cy, w) => `M${cx - w / 2} ${cy} Q${cx} ${cy + w * 0.42} ${cx + w / 2} ${cy} Q${cx} ${cy + w * 0.15} ${cx - w / 2} ${cy}Z`;
function olho(cx, cy, r, rp) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.12}" fill="#fff" stroke="${L}" stroke-width="6"/>
    <g data-p="pupila" data-cx="${cx}" data-cy="${cy}"><circle cx="${cx}" cy="${cy}" r="${rp}" fill="${L}"/><circle cx="${cx - rp * .35}" cy="${cy - rp * .4}" r="${rp * .35}" fill="#fff"/></g>`;
}

/** SVG do personagem. `p` = chave de PERSONAGENS ou objeto {desenho, cabelo, cores}. viewBox 400×640, pés em y≈615. */
function svgPersonagem(p, coresExtra) {
  const base = typeof p === 'string' ? (PERSONAGENS[p] || PERSONAGENS.be) : { desenho: 'pessoa', ...p, cores: { ...PERSONAGENS.leo.cores, ...(p && p.cores) } };
  const c = { ...base.cores, ...(coresExtra || {}) };
  let corpo = '';
  if (base.desenho === 'pessoa') {
    const bicho = base.bicho && base.bicho !== 'nenhum' ? base.bicho : null;
    const cab = bicho ? 'nenhum' : (base.cabelo || 'curto');
    const roupa = base.roupa || 'camiseta', ac = base.acessorio || 'nenhum', det = c.detalhe || '#c8102e';
    const barbaT = base.barba === true ? 'cheia' : (base.barba || 'nenhuma');
    const manga = roupa === 'social' || roupa === 'avental' ? '#f4f4f4' : c.roupa;
    const atras = {
      longo: `<path d="M105 190 Q100 330 140 395 L262 395 Q300 330 295 190 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      rabo: `<path d="M286 150 Q352 190 330 300 Q322 340 300 352 Q312 290 280 200 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      franja: `<path d="M104 196 Q100 300 130 330 L270 330 Q300 300 296 196 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
    }[cab] || '';
    const veuAtras = ac === 'veu' ? `<path d="M112 130 Q60 330 92 520 L308 520 Q340 330 288 130 Z" fill="#ffffff" opacity=".55" stroke="${L}" stroke-width="5"/>` : '';
    const topo = {
      curto: `<path d="M108 190 Q110 92 200 88 Q292 92 292 190 Q270 140 200 140 Q140 140 108 190Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      longo: `<path d="M104 200 Q100 90 200 86 Q300 90 296 200 Q262 128 200 138 Q160 130 128 168 Q116 186 104 200Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      coque: `<circle cx="200" cy="74" r="40" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/><path d="M108 188 Q110 96 200 92 Q290 96 292 188 Q262 132 200 134 Q138 132 108 188Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      careca: `<path d="M110 178 Q112 162 120 152" stroke="${c.cabelo}" stroke-width="14" stroke-linecap="round" fill="none"/><path d="M290 178 Q288 162 280 152" stroke="${c.cabelo}" stroke-width="14" stroke-linecap="round" fill="none"/>`,
      cacheado: [[120, 150, 34], [150, 110, 36], [200, 96, 38], [250, 110, 36], [280, 150, 34], [102, 196, 26], [298, 196, 26]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.cabelo}" stroke="${L}" stroke-width="7"/>`).join('') +
        [[150, 110, 30], [200, 98, 32], [250, 110, 30]].map(([x, y, r]) => `<circle cx="${x}" cy="${y + 6}" r="${r}" fill="${c.cabelo}"/>`).join(''),
      rabo: `<path d="M106 192 Q108 92 200 88 Q292 92 294 192 Q268 132 200 136 Q140 132 106 192Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      franja: `<path d="M104 210 Q98 90 200 86 Q302 90 296 210 L282 214 Q276 160 240 150 L232 172 Q196 150 168 168 L160 150 Q124 160 118 214 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
      moicano: `<path d="M176 160 Q170 70 200 40 Q230 70 224 160 Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`,
    }[cab] || '';
    const barba = {
      cheia: `<path d="M128 236 Q140 318 200 322 Q260 318 272 236 Q250 286 200 288 Q150 286 128 236Z" fill="${c.cabelo}" stroke="${L}" stroke-width="6"/>`,
      bigode: `<path d="M168 246 Q184 234 200 244 Q216 234 232 246 Q216 256 200 250 Q184 256 168 246Z" fill="${c.cabelo}" stroke="${L}" stroke-width="5"/>`,
      cavanhaque: `<path d="M180 286 Q200 312 220 286 Q210 296 200 296 Q190 296 180 286Z" fill="${c.cabelo}" stroke="${L}" stroke-width="5"/><path d="M174 248 Q200 238 226 248" stroke="${c.cabelo}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
    }[barbaT] || '';
    const oc = base.oculos || 'nenhum';
    const oculos = oc === 'redondo' ? `<g fill="none" stroke="${L}" stroke-width="7"><circle cx="162" cy="196" r="30"/><circle cx="238" cy="196" r="30"/><path d="M192 194 Q200 186 208 194"/></g>`
      : oc === 'quadrado' ? `<g fill="none" stroke="${L}" stroke-width="7"><rect x="130" y="172" width="64" height="48" rx="10"/><rect x="206" y="172" width="64" height="48" rx="10"/><path d="M194 192 L206 192"/></g>`
      : oc === 'escuro' ? `<g stroke="${L}" stroke-width="7"><rect x="128" y="174" width="68" height="44" rx="16" fill="#111"/><rect x="204" y="174" width="68" height="44" rx="16" fill="#111"/><path d="M196 190 L204 190"/></g><path d="M140 182 L160 182" stroke="#fff" stroke-width="5" opacity=".5"/>` : '';
    const orelhas = bicho === 'cachorro' ? `<path d="M112 130 Q70 150 84 250 Q100 280 124 240 Q122 180 140 140Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/><path d="M288 130 Q330 150 316 250 Q300 280 276 240 Q278 180 260 140Z" fill="${c.cabelo}" stroke="${L}" stroke-width="8"/>`
      : bicho === 'gato' ? `<path d="M118 150 L120 72 L176 112 Z" fill="${c.pele}" stroke="${L}" stroke-width="8" stroke-linejoin="round"/><path d="M282 150 L280 72 L224 112 Z" fill="${c.pele}" stroke="${L}" stroke-width="8" stroke-linejoin="round"/><path d="M128 128 L130 92 L160 112Z" fill="${det}"/><path d="M272 128 L270 92 L240 112Z" fill="${det}"/>` : '';
    const focinho = bicho ? `<ellipse cx="200" cy="246" rx="${bicho === 'gato' ? 40 : 50}" ry="${bicho === 'gato' ? 28 : 34}" fill="#f4ece2" stroke="${L}" stroke-width="6"/><ellipse cx="200" cy="232" rx="${bicho === 'gato' ? 10 : 16}" ry="${bicho === 'gato' ? 7 : 11}" fill="${bicho === 'gato' ? det : L}"/>` +
      (bicho === 'gato' ? `<g stroke="${L}" stroke-width="3"><path d="M150 240 L104 232"/><path d="M150 250 L104 256"/><path d="M250 240 L296 232"/><path d="M250 250 L296 256"/></g>` : '') : '';
    const bone = base.bone ? `<path d="M110 150 Q120 78 200 76 Q280 78 290 150 Z" fill="${det === '#111' ? '#333' : c.roupa}" stroke="${L}" stroke-width="8"/><path d="M200 140 Q290 136 330 150 Q300 162 200 156Z" fill="${det}" stroke="${L}" stroke-width="7"/>` : '';
    const headset = ac === 'headset' ? `<path d="M100 200 Q100 70 200 66 Q300 70 300 200" fill="none" stroke="${L}" stroke-width="16"/><path d="M100 200 Q100 70 200 66 Q300 70 300 200" fill="none" stroke="${det}" stroke-width="7"/>
      <rect x="82" y="168" width="34" height="60" rx="12" fill="${det}" stroke="${L}" stroke-width="7"/><rect x="284" y="168" width="34" height="60" rx="12" fill="${det}" stroke="${L}" stroke-width="7"/><path d="M100 226 Q110 280 160 270" fill="none" stroke="${L}" stroke-width="7"/><circle cx="162" cy="270" r="9" fill="${L}"/>` : '';
    const veuTopo = ac === 'veu' ? `<path d="M130 118 Q200 92 270 118" fill="none" stroke="${det}" stroke-width="10" stroke-linecap="round"/>` : '';
    // tronco por tipo de roupa
    const corpoRoupa = roupa === 'vestido'
      ? `<path d="M138 322 Q200 300 262 322 L300 548 Q200 568 100 548 Z" fill="${c.roupa}" stroke="${L}" stroke-width="8" stroke-linejoin="round"/><path d="M146 420 Q200 432 254 420" stroke="${det}" stroke-width="8" fill="none"/>`
      : `<path d="M128 322 Q200 296 272 322 L284 488 Q200 504 116 488 Z" fill="${roupa === 'social' ? '#f4f4f4' : c.roupa}" stroke="${L}" stroke-width="8" stroke-linejoin="round"/>` +
        (roupa === 'camiseta' ? `<path d="M176 312 L200 352 L224 312" fill="none" stroke="${L}" stroke-width="6" opacity=".55"/>` : '') +
        (roupa === 'social' ? `<path d="M178 310 L200 336 L222 310" fill="#fff" stroke="${L}" stroke-width="5"/><path d="M192 336 L208 336 L214 430 L200 446 L186 430 Z" fill="${det}" stroke="${L}" stroke-width="5"/>` : '') +
        (roupa === 'terno' ? `<path d="M168 306 L200 380 L232 306 Z" fill="#f4f4f4" stroke="${L}" stroke-width="5"/><path d="M193 330 L207 330 L211 384 L200 396 L189 384 Z" fill="${det}" stroke="${L}" stroke-width="4"/><path d="M168 306 L200 396 L156 488" fill="none" stroke="${L}" stroke-width="6"/><path d="M232 306 L200 396 L244 488" fill="none" stroke="${L}" stroke-width="6"/>` : '') +
        (roupa === 'jaqueta' ? `<path d="M200 316 L200 494" stroke="${L}" stroke-width="6"/><path d="M160 308 L186 360 L200 316 L214 360 L240 308" fill="none" stroke="${L}" stroke-width="6"/><circle cx="214" cy="410" r="5" fill="${det}"/>` : '') +
        (roupa === 'avental' ? `<path d="M150 360 L250 360 L262 500 L138 500 Z" fill="${det}" stroke="${L}" stroke-width="6"/><path d="M150 360 Q200 320 250 360" fill="none" stroke="${det}" stroke-width="8"/><path d="M190 330 L200 342 L210 330 L200 320Z" fill="${L}"/>` : '');
    const cracha = ac === 'cracha' ? `<path d="M170 316 L200 400 L230 316" fill="none" stroke="${det}" stroke-width="6"/><rect x="182" y="398" width="36" height="48" rx="5" fill="#fff" stroke="${L}" stroke-width="5"/><rect x="188" y="406" width="24" height="10" fill="${det}"/>` : '';
    const naMao = ac === 'camera' ? `<g transform="translate(296 450)"><rect x="-34" y="-26" width="68" height="44" rx="8" fill="#222" stroke="${L}" stroke-width="6"/><circle cx="6" cy="-4" r="15" fill="#4aa8e8" stroke="${L}" stroke-width="5"/><rect x="-26" y="-36" width="20" height="12" rx="3" fill="${det}" stroke="${L}" stroke-width="4"/></g>`
      : ac === 'microfone' ? `<g transform="translate(300 440) rotate(-28)"><rect x="-8" y="-6" width="16" height="70" rx="6" fill="#222" stroke="${L}" stroke-width="5"/><circle cx="0" cy="-14" r="20" fill="#9aa3ad" stroke="${L}" stroke-width="6"/></g>` : '';
    const pernas = roupa === 'vestido'
      ? `<path d="M172 540 L168 590" stroke="${L}" stroke-width="30" stroke-linecap="round"/><path d="M172 540 L168 590" stroke="${c.pele}" stroke-width="18" stroke-linecap="round"/><path d="M228 540 L232 590" stroke="${L}" stroke-width="30" stroke-linecap="round"/><path d="M228 540 L232 590" stroke="${c.pele}" stroke-width="18" stroke-linecap="round"/>`
      : `<path d="M172 470 L166 590" stroke="${L}" stroke-width="44" stroke-linecap="round"/><path d="M172 470 L166 590" stroke="${c.calca}" stroke-width="30" stroke-linecap="round"/><path d="M228 470 L234 590" stroke="${L}" stroke-width="44" stroke-linecap="round"/><path d="M228 470 L234 590" stroke="${c.calca}" stroke-width="30" stroke-linecap="round"/>`;
    corpo = `
      ${veuAtras}
      <g data-p="pernas">${pernas}
        <ellipse cx="158" cy="604" rx="40" ry="18" fill="${c.sapato}" stroke="${L}" stroke-width="6"/><ellipse cx="242" cy="604" rx="40" ry="18" fill="${c.sapato}" stroke="${L}" stroke-width="6"/>
      </g>
      ${membro('bracoE', 140, 330, 104, 448, manga, c.pele)}
      ${corpoRoupa}${cracha}
      ${membro('bracoD', 260, 330, 296, 448, manga, c.pele, naMao)}
      <g data-p="cabeca" data-ox="200" data-oy="300">
        ${atras}${orelhas}
        <rect x="178" y="270" width="44" height="46" fill="${c.pele}" stroke="${L}" stroke-width="6"/>
        <ellipse cx="200" cy="198" rx="98" ry="108" fill="${c.pele}" stroke="${L}" stroke-width="8"/>
        ${barba}
        ${bicho ? '' : `<circle cx="140" cy="236" r="16" fill="#ff7a7a" opacity=".35"/><circle cx="260" cy="236" r="16" fill="#ff7a7a" opacity=".35"/>`}
        ${olho(162, 196, 20, 10)}${olho(238, 196, 20, 10)}
        <rect data-p="palpebra" data-h="48" x="138" y="170" width="48" height="0" fill="${c.pele}"/>
        <rect data-p="palpebra" data-h="48" x="214" y="170" width="48" height="0" fill="${c.pele}"/>
        <path data-p="sobrancelha" data-oy="160" d="M140 164 Q162 150 184 162" stroke="${L}" stroke-width="8" fill="none" stroke-linecap="round"/>
        <path data-p="sobrancelha" data-oy="160" d="M216 162 Q238 150 260 164" stroke="${L}" stroke-width="8" fill="none" stroke-linecap="round"/>
        ${focinho}
        <path data-p="boca" data-cx="200" data-cy="${bicho ? 270 : 258}" data-w="${bicho ? 40 : 52}" d="${sorriso(200, bicho ? 270 : 258, bicho ? 40 : 52)}" fill="#6e1b23" stroke="${L}" stroke-width="7" stroke-linejoin="round"/>
        ${oculos}${topo}${bone}${headset}${veuTopo}
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
        <path data-p="boca" data-cx="${robo ? 200 : 228}" data-cy="${robo ? 388 : 468}" data-w="${robo ? 60 : 50}" d="${sorriso(robo ? 200 : 228, robo ? 388 : 468, robo ? 60 : 50)}" fill="${robo ? c.lente : '#7a1d1d'}" stroke="${robo ? c.lente : '#F5F1EA'}" stroke-width="7" stroke-linejoin="round"/>
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
  if (r.foto) return animarRecorte(raiz, r, t);
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

/** Recorte animado (foto/PNG do usuário): a peça inteira se mexe — entra, respira, quica ao falar, acena balançando,
 *  comemora pulando, pensa inclinando, se assusta dando um pulo. Só depende de t (mesmo t = mesma imagem). */
function animarRecorte(raiz, r, t) {
  if (!raiz.__p) raiz.__p = { corpo: raiz.querySelector('.foto-corpo'), sombra: raiz.querySelector('.foto-sombra') };
  const P = raiz.__p; if (!P.corpo) return;
  const lt = t - r.t0, dur = r.t1 - r.t0, sd = r.semente || 0, acao = r.acao || 'parado';
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const fx = (a, b) => cl((lt - a) / (b - a));
  const eOut = (x) => 1 - (1 - x) ** 3;
  const eBack = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };
  const h = raiz.offsetHeight || 600, k = h / 640;           // valores pensados para 640 px de altura
  let y = 0, x = 0, sx = 1, sy = 1, rot = 0, op = 1;
  if (r.entrada === 'pula') { y = (1 - eBack(fx(0, 0.6))) * -700 * k; const q = Math.sin(fx(0.38, 0.62) * Math.PI) * 0.12; sx += q; sy -= q; }
  else if (r.entrada === 'desliza') x = (1 - eOut(fx(0, 0.55))) * (r.lado < 0 ? -1 : 1) * 700 * k;
  else if (r.entrada === 'surge') { const e = eBack(fx(0, 0.45)); sx *= 0.4 + 0.6 * e; sy *= 0.4 + 0.6 * e; op = cl(fx(0, 0.2)); }
  sy *= 1 + Math.sin(lt * 2.3 + sd) * 0.012;                 // respiração
  const falando = (r.falas || []).some(([a, b]) => t >= a && t < b - 0.12) || (acao === 'fala' && lt > 0.3 && lt < dur - 0.2 && !(r.falas || []).length);
  if (falando) { y -= Math.abs(Math.sin(lt * 12.5 + sd)) * 9 * k; rot += Math.sin(lt * 5.5 + sd) * 1.8; }
  if (acao === 'acena') rot += Math.sin(lt * 9) * 6 * fx(0.25, 0.45);
  if (acao === 'aponta') rot += (r.olhar || 1) * 7 * eOut(fx(0.2, 0.5));
  if (acao === 'comemora') { y -= Math.abs(Math.sin(lt * 6.5)) * 50 * k * fx(0.2, 0.4); rot += Math.sin(lt * 13) * 4; }
  if (acao === 'pensa') { rot += -5 * eOut(fx(0.2, 0.7)) + Math.sin(lt * 1.4) * 1.5; }
  if (acao === 'surpresa') { const q = fx(0.15, 0.5); y -= Math.sin(q * Math.PI) * 70 * k; const p = Math.sin(q * Math.PI) * 0.1; sx += p; sy += p; }
  if (acao === 'parado') rot += Math.sin(lt * 1.3 + sd) * 1.2;
  if (r.espelhar) sx = -sx;
  P.corpo.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sx}, ${sy})`;
  P.corpo.style.opacity = op;
  if (P.sombra) { P.sombra.style.transform = `translateX(${x}px) scale(${1 + Math.min(0, y) / (500 * k)})`; P.sombra.style.opacity = String(0.45 * op * (r.entrada === 'pula' ? fx(0.1, 0.55) : 1)); }
}

// Som automático do motor (sem direito autoral): TRILHA de fundo composta por código para cada estilo e EFEITOS
// que acompanham a animação (balão, fala, pulo, confete, lista, contador, botão, transições).
// Funções puras, determinísticas (mesmo plano = mesmo som), sem dependências: rodam no Node (render) e no navegador (prévia).

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Progressões (MIDI) e instrumentos por estilo. Cada acorde dura 2 compassos (8 tempos).
const TRILHAS = {
  cinema:      { nome: 'Cinema (épica suave)', bpm: 84,  acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], pad: 1, baixo: 'pulso', bumbo: [0], chimbal: false, palma: false, arpejo: false, sino: false },
  corporativo: { nome: 'Corporativa (leve e confiante)', bpm: 112, acordes: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], pad: 0.6, baixo: 'tempo', bumbo: [0, 2], chimbal: true, palma: true, arpejo: 8, sino: false },
  neon:        { nome: 'Neon (eletrônica)', bpm: 124, acordes: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], pad: 0.7, baixo: 'contra', bumbo: [0, 1, 2, 3], chimbal: true, palma: true, arpejo: 16, sino: false },
  editorial:   { nome: 'Editorial (lo-fi)', bpm: 88,  acordes: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]], pad: 0.5, baixo: 'tempo', bumbo: [0, 2.5], chimbal: true, palma: true, arpejo: false, sino: true },
  tech:        { nome: 'Tech (eletrônica leve)', bpm: 118, acordes: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]], pad: 0.55, baixo: 'contra', bumbo: [0, 2], chimbal: true, palma: false, arpejo: 16, sino: false },
  impacto:     { nome: 'Impacto (batida forte)', bpm: 128, acordes: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], pad: 0.5, baixo: 'contra', bumbo: [0, 1, 2, 3], chimbal: true, palma: true, arpejo: false, sino: false },
  luxo:        { nome: 'Luxo (piano e cordas)', bpm: 72,  acordes: [[60, 64, 67, 71], [53, 57, 60, 64], [57, 60, 64, 67], [55, 59, 62, 64]], pad: 0.8, baixo: 'pulso', bumbo: false, chimbal: false, palma: false, arpejo: false, sino: true },
};

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/** Trilha de fundo do estilo `nome`, `dur` segundos. Devolve {L, R}. */
function sintetizarTrilha(nome, dur, sr = 44100) {
  const T = TRILHAS[nome] || TRILHAS.cinema;
  const N = Math.ceil(dur * sr), L = new Float32Array(N), R = new Float32Array(N);
  const tempo = 60 / T.bpm, acordeDur = tempo * 8;
  const rnd = rng(7 + T.bpm);
  const acordeEm = (t) => T.acordes[Math.floor(t / acordeDur) % T.acordes.length];
  // PAD: dente-de-serra suave (4 harmônicos) levemente desafinado entre L e R, com filtro passa-baixa
  if (T.pad) {
    let yl = 0, yr = 0; const a = 1 - Math.exp(-TAU * 1300 / sr);
    for (let i = 0; i < N; i++) {
      const t = i / sr, ci = Math.floor(t / acordeDur), tc = t - ci * acordeDur, ac = acordeEm(t);
      const env = Math.min(1, tc / 0.7) * (tc > acordeDur - 0.35 ? Math.max(0, (acordeDur - tc) / 0.35) : 1);
      let sl = 0, sr2 = 0;
      for (const m of ac) {
        const f = mtof(m);
        for (let k = 1; k <= 4; k++) { sl += Math.sin(TAU * f * k * t) / k; sr2 += Math.sin(TAU * f * 1.0025 * k * t) / k; }
      }
      yl += a * (sl - yl); yr += a * (sr2 - yr);
      L[i] += yl * env * 0.045 * T.pad; R[i] += yr * env * 0.045 * T.pad;
    }
  }
  const nota = (t0, d, gera) => { const i0 = Math.floor(t0 * sr), n = Math.min(N - i0, Math.floor(d * sr)); for (let j = 0; j < n; j++) { const v = gera(j / sr); L[i0 + j] += v[0]; R[i0 + j] += v[1]; } };
  const batidas = Math.ceil(dur / tempo);
  for (let b = 0; b < batidas; b++) {
    const t0 = b * tempo, compasso = b % 4, ac = acordeEm(t0 + 0.01), raiz = mtof(ac[0] - 24);
    // BAIXO
    const tocaBaixo = T.baixo === 'tempo' || (T.baixo === 'pulso' && compasso % 2 === 0) || T.baixo === 'contra';
    if (tocaBaixo) {
      const tb = T.baixo === 'contra' ? t0 + tempo / 2 : t0, db = T.baixo === 'pulso' ? tempo * 2 : tempo * 0.9;
      let ph = 0; nota(tb, db, (t) => { ph += TAU * raiz / sr; const v = (Math.sin(ph) + 0.35 * Math.sin(2 * ph)) * Math.exp(-t * (T.baixo === 'pulso' ? 1.6 : 4)) * 0.2; return [v, v]; });
    }
    // BUMBO
    if (T.bumbo) for (const p of T.bumbo) if (Math.floor(p) === compasso) {
      let ph = 0; nota(t0 + (p - Math.floor(p)) * tempo, 0.4, (t) => { ph += TAU * (45 + 80 * Math.exp(-t * 32)) / sr; const v = Math.sin(ph) * Math.exp(-t * 7.5) * 0.5; return [v, v]; });
    }
    // CHIMBAL (contratempo) e PALMA (2 e 4)
    if (T.chimbal) { let p0 = 0; nota(t0 + tempo / 2, 0.07, (t) => { const n = rnd() * 2 - 1, v = (n - p0) * Math.exp(-t * 70) * 0.05; p0 = n; return [v * 0.8, v]; }); }
    if (T.palma && (compasso === 1 || compasso === 3)) nota(t0, 0.25, (t) => { const v = ((rnd() * 2 - 1) * Math.exp(-t * 22) * 0.16 + Math.sin(TAU * 190 * t) * Math.exp(-t * 25) * 0.08); return [v, v]; });
    // ARPEJO (notas do acorde, uma oitava acima)
    if (T.arpejo) {
      const passos = T.arpejo / 4, dp = tempo / passos;
      for (let s = 0; s < passos; s++) {
        const m = ac[(b * passos + s) % ac.length] + 12, f = mtof(m), pan = ((b * passos + s) % 3 - 1) * 0.35;
        nota(t0 + s * dp, dp * 1.6, (t) => { const v = (Math.sin(TAU * f * t) + Math.sin(TAU * 3 * f * t) / 9) * Math.exp(-t * 9) * 0.05; return [v * (1 - pan), v * (1 + pan)]; });
      }
    }
    // SINO / TECLADO (a cada 2 tempos, notas do acorde espalhadas)
    if (T.sino && b % 2 === 0) ac.forEach((m, k) => {
      const f = mtof(m + 12), atraso = k * 0.07 + (rnd() * 0.02);
      nota(t0 + atraso, tempo * 2.2, (t) => { const v = (Math.sin(TAU * f * t + 0.8 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-t * 3))) * Math.exp(-t * 2.4) * 0.05; return [v * (1 - k * 0.12), v * (0.7 + k * 0.12)]; });
    });
  }
  // entrada e saída suaves + saturação leve (sem estourar)
  for (let i = 0; i < N; i++) {
    const t = i / sr, g = Math.min(1, t / 0.8) * Math.min(1, (dur - t) / 1.6);
    L[i] = Math.tanh(L[i] * 1.6 * g) * 0.7; R[i] = Math.tanh(R[i] * 1.6 * g) * 0.7;
  }
  return { L, R };
}

/** Efeitos sonoros a partir de plano.sfx ({tipo, inicio, fim?, dur?, voz?}). Devolve {L, R}. */
function sintetizarEfeitos(eventos, dur, sr = 44100) {
  const N = Math.ceil(dur * sr) + sr, L = new Float32Array(N), R = new Float32Array(N);
  const rnd = rng(99);
  const som = (t0, d, gera, pan = 0) => { const i0 = Math.max(0, Math.floor(t0 * sr)), n = Math.min(N - i0, Math.floor(d * sr)); for (let j = 0; j < n; j++) { const v = gera(j / sr); L[i0 + j] += v * (1 - pan); R[i0 + j] += v * (1 + pan); } };
  const sino = (t0, f, amp, decai = 5) => som(t0, 1.2, (t) => Math.sin(TAU * f * t + 0.6 * Math.sin(TAU * f * 2.76 * t) * Math.exp(-t * 6)) * Math.exp(-t * decai) * amp);
  for (const e of eventos || []) {
    const t0 = e.inicio || 0;
    if (e.tipo === 'whoosh') { let y = 0; som(t0, 0.55, (t) => { const fc = 300 + 3800 * (t / 0.55), a = 1 - Math.exp(-TAU * fc / sr); y += a * ((rnd() * 2 - 1) - y); return y * Math.sin(Math.PI * t / 0.55) * 0.26; }); }
    else if (e.tipo === 'impacto') { let ph = 0; som(t0, 1.2, (t) => { ph += TAU * (30 + 45 * Math.exp(-t * 6)) / sr; return Math.sin(ph) * Math.exp(-t * 3.2) * 0.5 + (rnd() * 2 - 1) * Math.exp(-t * 28) * 0.1; }); }
    else if (e.tipo === 'pop') { let ph = 0; som(t0, 0.1, (t) => { ph += TAU * (480 + 700 * (t / 0.1)) / sr; return Math.sin(ph) * Math.exp(-t * 38) * 0.32; }); }
    else if (e.tipo === 'fala') {
      const base = e.voz || 420, fim = e.fim || t0 + 1;
      for (let t = t0, k = 0; t < fim - 0.05; t += 0.105 + rnd() * 0.03, k++) {
        const f = base * (0.85 + rnd() * 0.35);
        som(t, 0.06, (x) => (Math.sin(TAU * f * x) + 0.3 * Math.sin(TAU * 3 * f * x)) * Math.sin(Math.PI * x / 0.06) * 0.075, (k % 2 ? 0.1 : -0.1));
      }
    }
    else if (e.tipo === 'boing') { let ph = 0; som(t0, 0.5, (t) => { ph += TAU * (150 + 230 * (1 - Math.exp(-t * 7)) + 30 * Math.sin(TAU * 13 * t) * Math.exp(-t * 4)) / sr; return Math.sin(ph) * Math.exp(-t * 5) * 0.3; }); }
    else if (e.tipo === 'confete') { for (let k = 0; k < 14; k++) sino(t0 + rnd() * 0.7, 1700 + rnd() * 1700, 0.05, 14); som(t0, 0.5, (t) => (rnd() * 2 - 1) * Math.exp(-t * 9) * 0.05); }
    else if (e.tipo === 'susto') { let ph = 0; som(t0, 0.38, (t) => { ph += TAU * (320 + 900 * (t / 0.38) ** 1.5) / sr; return Math.sin(ph) * Math.sin(Math.PI * t / 0.38) * 0.22; }); }
    else if (e.tipo === 'clique') som(t0, 0.04, (t) => ((rnd() * 2 - 1) * 0.5 + Math.sin(TAU * 2100 * t)) * Math.exp(-t * 160) * 0.28);
    else if (e.tipo === 'contador') {
      const d = e.dur || 1.2; let t = 0;
      while (t < d) { som(t0 + t, 0.03, (x) => Math.sin(TAU * 1650 * x) * Math.exp(-x * 120) * 0.13); t += 0.045 + 0.2 * (t / d) ** 2; }
      sino(t0 + d, 1320, 0.14); sino(t0 + d + 0.07, 1760, 0.1);
    }
    else if (e.tipo === 'brilho') { sino(t0, 1318.5, 0.13, 4); sino(t0 + 0.09, 1975.5, 0.1, 4); }
  }
  return { L, R };
}

/** Trilha + efeitos do plano (o que o render e a prévia tocam). opcoes: {sr} */
function sintetizarSons(plano, opcoes = {}) {
  const sr = opcoes.sr || 44100, dur = Math.max(0.5, plano.duracao);
  const nomeTrilha = plano.trilha && plano.trilha !== 'nenhuma' ? plano.trilha : null;
  const trilha = nomeTrilha ? sintetizarTrilha(nomeTrilha, dur, sr) : null;
  if (trilha) { const v = plano.volumeTrilha ?? 0.5; for (let i = 0; i < trilha.L.length; i++) { trilha.L[i] *= v; trilha.R[i] *= v; } }
  const efeitos = plano.sfx && plano.sfx.length ? sintetizarEfeitos(plano.sfx, dur, sr) : null;
  if (efeitos) { const N = Math.ceil(dur * sr); efeitos.L = efeitos.L.subarray(0, N); efeitos.R = efeitos.R.subarray(0, N); }
  return { sr, trilha, efeitos };
}

/** Junta faixas {L,R} (mesma taxa) somando e limitando. */
function misturar(...faixas) {
  const fs = faixas.filter(Boolean); if (!fs.length) return null;
  const N = Math.max(...fs.map((f) => f.L.length)), L = new Float32Array(N), R = new Float32Array(N);
  for (const f of fs) for (let i = 0; i < f.L.length; i++) { L[i] += f.L[i]; R[i] += f.R[i]; }
  for (let i = 0; i < N; i++) { L[i] = Math.max(-1, Math.min(1, L[i])); R[i] = Math.max(-1, Math.min(1, R[i])); }
  return { L, R };
}

/** WAV estéreo 16 bits (Uint8Array) a partir de {L, R}. */
function wavDe(f, sr = 44100) {
  const N = f.L.length, buf = new ArrayBuffer(44 + N * 4), v = new DataView(buf);
  const txt = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + N * 4, true); txt(8, 'WAVE'); txt(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  txt(36, 'data'); v.setUint32(40, N * 4, true);
  for (let i = 0, o = 44; i < N; i++, o += 4) { v.setInt16(o, Math.max(-1, Math.min(1, f.L[i])) * 32767, true); v.setInt16(o + 2, Math.max(-1, Math.min(1, f.R[i])) * 32767, true); }
  return new Uint8Array(buf);
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
  tech: {
    fundo: '#07090f', texto: '#f2f5fa', destaque: '#8be36a', suave: '#8790a3',
    fonteTitulo: "'Inter', 'BWPesada', sans-serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 900, caixaAlta: false, enfaseItalica: true, grade: true,
    gradiente: 'radial-gradient(90% 60% at 50% 35%, #121826 0%, #07090f 75%)',
  },
  impacto: {
    fundo: '#0a0a0c', texto: '#ffffff', destaque: '#ff2d6f', suave: '#b9b3bd',
    fonteTitulo: "'Anton', 'Bebas Neue', 'BWPesada', sans-serif",
    fonteTexto: "'Inter', sans-serif",
    pesoTitulo: 400, caixaAlta: true, brilho: true,
    gradiente: 'radial-gradient(100% 60% at 50% 100%, #4a0b22 0%, #0a0a0c 65%)',
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
  nome: 'corte', logo: 'fade', contagem: 'corte', grafico: 'deslize', linha: 'deslize', checklist: 'deslize', ranking: 'zoom',
  antesdepois: 'fade', depoimento: 'fade', local: 'zoom', oferta: 'zoom', aovivo: 'flash', celular: 'deslize', dividida: 'fade',
  terminal: 'deslize', passo: 'zoom', painel: 'deslize', medidor: 'zoom', catalogo: 'fade', comenta: 'zoom',
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
    estiloNome: roteiro.estilo || 'cinema',
  };
  const au0 = roteiro.audio || {};
  // trilha de fundo gerada pelo motor: 'auto' = a do estilo; com música própria, fica desligada (a não ser que peçam)
  const tr0 = au0.trilha ?? (au0.musica ? 'nenhuma' : 'auto');
  plano.trilha = tr0 === 'auto' ? plano.estiloNome : tr0;
  const temFala = !!au0.narracao || (roteiro.cenas || []).some((c) => c.somDoVideo && /\.(mp4|mov|webm|m4v|mkv)$/i.test(c.midia || ''));
  plano.volumeTrilha = au0.volumeTrilha ?? (temFala ? 0.22 : 0.45);
  const som = (ev) => { if (fx.sfx) plano.sfx.push(ev); };

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
    const MIDIA_PROPRIA = ['antesdepois', 'dividida', 'celular', 'logo'];   // nesses a mídia não é o fundo da cena
    const m = MIDIA_PROPRIA.includes(c.tipo) ? null : midiaNo(c, a, d);
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
        som({ tipo: 'contador', inicio: a + 0.15, dur: Math.min(1.6, d * 0.6) });
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
        c.itens.forEach((_, k) => som({ tipo: 'clique', inicio: a + 0.45 + k * passo }));
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
        if (c.acao) som({ tipo: 'brilho', inicio: a + 0.62 });
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
        // elenco [] (vazio de propósito) + mídia = cena só com a imagem (ex.: cena criada por IA a partir da foto do personagem)
        const elenco = (Array.isArray(c.elenco) && !c.elenco.length && c.midia ? [] : c.elenco && c.elenco.length ? c.elenco : [{ personagem: c.personagem || 'be', acao: c.acao }]).slice(0, 2);
        const falas = (c.falas && c.falas.length ? c.falas : (c.balao ? [{ quem: 0, texto: c.balao }] : []))
          .filter((f) => f && f.texto).map((f) => ({ quem: Math.max(0, Math.min(elenco.length - 1, Number(f.quem) || 0)), texto: String(f.texto) }));
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
          const foto = ator.personagem === 'foto' && ator.imagem;
          const pid = ator.personagem === 'meu' && ator.look ? ator.look : ator.personagem && PERSONAGENS[ator.personagem] ? ator.personagem : 'be';
          const lado = dois ? (k === 0 ? -1 : 1) : (c.posicao === 'esquerda' ? -1 : c.posicao === 'direita' ? 1 : 0);
          const minhas = tempos.filter((_, j) => falas[j].quem === k);
          const outro = tempos.filter((_, j) => falas[j].quem !== k).length ? (dois ? -lado : 0) : 0;
          const rig = { t0: a, t1: a + d, acao: ator.acao || (minhas.length ? 'fala' : 'parado'), entrada: c.entrada || 'pula', lado: lado || 1, falas: minhas, olhar: outro, semente: i * 3 + k * 7 + 1 };
          if (foto) {
            rig.foto = true; rig.espelhar = !!ator.espelhar;
            filhos.push({ id: novoId('at'), tag: 'div', classe: `ator foto ${dois ? 'duplo' : 'solo'} lado${lado}${ator.contorno === false ? '' : ' contorno'}`, rig,
              filhos: [{ id: novoId('as'), tag: 'i', classe: 'foto-sombra' }, { id: novoId('ac'), tag: 'div', classe: 'foto-corpo', filhos: [{ id: novoId('ai'), tag: 'img', classe: 'foto-img', src: ator.imagem }] }] });
          } else {
            filhos.push({ id: novoId('at'), tag: 'div', classe: `ator ${dois ? 'duplo' : 'solo'} lado${lado}`, html: svgPersonagem(pid, ator.cores), rig });
          }
        });
        const temNarr = !!(roteiro.audio && roteiro.audio.narracao);
        if ((c.entrada || 'pula') === 'pula' && elenco.length) som({ tipo: 'boing', inicio: a + 0.42 });
        elenco.forEach((at) => { if (at.acao === 'comemora') som({ tipo: 'confete', inicio: a + 0.3 }); if (at.acao === 'surpresa') som({ tipo: 'susto', inicio: a + 0.12 }); });
        falas.forEach((f, k) => {
          const [t0b, t1b] = tempos[k];
          som({ tipo: 'pop', inicio: t0b });
          if (!temNarr) { const quem = elenco[f.quem] || {}; const nome = String(quem.personagem === 'foto' ? quem.imagem : quem.personagem || 'be');
            let h = 0; for (const ch of nome) h = (h * 31 + ch.charCodeAt(0)) % 997;
            som({ tipo: 'fala', inicio: t0b + 0.15, fim: t1b - 0.25, voz: 300 + (h % 7) * 45 }); }
          const lado = dois ? (f.quem === 0 ? -1 : 1) : 0;
          filhos.push({ id: novoId('bl'), tag: 'div', classe: `balao lado${lado}${dois ? ' duplo' : ''}`, html: esc(f.texto),
            tweens: [tw(t0b, 0.35, { opacity: 0, scale: 0.6, y: 30 * u }, { opacity: 1, scale: 1, y: 0 }, 'back.out'),
              tw(Math.max(t0b + 0.4, t1b - 0.2), 0.2, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }, 'power2.out')] });
        });
        break;
      }
      case 'nome': {   // faixa com nome e cargo (lower third)
        filhos.push({ id: novoId('lt'), tag: 'div', classe: 'lt', tweens: [tw(a + 0.2, 0.6, { x: -W * 0.9 }, { x: 0 }, 'expo.out')],
          filhos: [{ id: novoId('lb'), tag: 'i', classe: 'lt-barra', tweens: [tw(a + 0.1, 0.5, { scale: 0 }, { scale: 1 }, 'expo.out')] },
            { id: novoId('ln'), tag: 'b', classe: 'lt-nome', html: esc(c.titulo || c.texto || ''), tweens: [tw(a + 0.45, 0.5, { opacity: 0, x: 40 * u }, { opacity: 1, x: 0 })] },
            ...(c.subtitulo ? [{ id: novoId('lc'), tag: 'span', classe: 'lt-cargo', html: esc(c.subtitulo), tweens: [tw(a + 0.7, 0.5, { opacity: 0, x: 40 * u }, { opacity: 1, x: 0 })] }] : [])] });
        som({ tipo: 'whoosh', inicio: a + 0.1 });
        break;
      }
      case 'logo': {   // logo animado: entra com zoom + desfoque, brilho passa por cima, frase embaixo
        const logoFilhos = c.midia ? [{ id: novoId('lg'), tag: 'img', classe: 'logo-img', src: c.midia }] : [];
        filhos.push({ id: novoId('lo'), tag: 'div', classe: 'logo-box', html: c.midia ? undefined : `<span class="logo-txt" style="font-size:${(Math.min(150, 1300 / Math.max(6, Math.max(...String(c.texto || 'SUA MARCA').split(/\s+/).map((w) => w.length)) + 2)) * u).toFixed(0)}px">${esc(c.texto || 'SUA MARCA')}</span>`,
          filhos: logoFilhos.length ? logoFilhos : undefined,
          tweens: [tw(a + 0.1, 0.9, { scale: 1.6, blur: 22, opacity: 0 }, { scale: 1, blur: 0, opacity: 1 }, 'expo.out'), tw(a + 1, d - 1, { scale: 1 }, { scale: 1.05 }, 'linear')] });
        filhos.push({ id: novoId('lr'), tag: 'div', classe: 'logo-raio', tweens: [tw(a + 0.9, 0.9, { x: -W, opacity: 1 }, { x: W, opacity: 1 }, 'power2.inOut')] });
        if (c.subtitulo) filhos.push({ id: novoId('ls'), tag: 'p', classe: 'sub logo-slogan', html: esc(c.subtitulo), tweens: [tw(a + 1.2, 0.6, { opacity: 0, y: 24 * u, ls: 0.3 }, { opacity: 1, y: 0, ls: 0.12 })] });
        som({ tipo: 'impacto', inicio: a + 0.15 }); som({ tipo: 'brilho', inicio: a + 1.0 });
        break;
      }
      case 'contagem': {   // 3, 2, 1… e o texto
        const n = Math.max(1, Math.min(10, Math.round(Number(c.valor) || 3)));
        const fimTexto = c.texto ? 1.2 : 0, passo = Math.max(0.45, (d - fimTexto - 0.2) / n);
        for (let k = 0; k < n; k++) {
          const t0 = a + 0.1 + k * passo;
          filhos.push({ id: novoId('cg'), tag: 'div', classe: 'cg-num', html: String(n - k), tweens: [tw(t0, passo * 0.5, { opacity: 0, scale: 2.2, blur: 12 }, { opacity: 1, scale: 1, blur: 0 }, 'expo.out'), tw(t0 + passo * 0.82, passo * 0.18, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.6 }, 'power2.out')] });
          som({ tipo: 'clique', inicio: t0 });
        }
        filhos.push({ id: novoId('cr'), tag: 'div', classe: 'cg-anel', tweens: [tw(a + 0.1, n * passo, { p: 0 }, { p: 1 }, 'linear'), tw(a + 0.1 + n * passo, 0.3, { opacity: 1, scale: 1 }, { opacity: 0, scale: 1.4 }, 'power2.out')] });
        if (c.texto) { const t0 = a + 0.1 + n * passo; filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo gigante cg-txt', filhos: palavras(c.texto, t0, { enfase: c.enfase }) }); som({ tipo: 'impacto', inicio: t0 }); }
        break;
      }
      case 'grafico': {   // barras ou rosca, com valores contando e fonte
        const itens = (c.itens || []).map((it) => { const m2 = String(it).match(/^(.*?)[:=–-]\s*([\d.,]+)\s*$/); return m2 ? { r: m2[1].trim(), v: Number(m2[2].replace(/\./g, '').replace(',', '.')) || 0 } : { r: String(it), v: 0 }; }).slice(0, 6);
        const max = Math.max(1, ...itens.map((i) => i.v)), tot = itens.reduce((s2, i) => s2 + i.v, 0) || 1;
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.titulo, a, { y: 40 * u, enfase: c.enfase }) });
        const CORES = ['var(--destaque)', 'var(--texto)', 'var(--suave)', '#5fe0a0', '#ff6b6b', '#7cb6ff'];
        if (c.forma === 'pizza') {
          let acum = 0;
          const fatias = itens.map((it, k) => { const ini = acum / tot; acum += it.v; return { ...it, ini, fr: it.v / tot, cor: CORES[k % CORES.length] }; });
          const R = 120, C = 2 * Math.PI * R;
          const svg = `<svg viewBox="-160 -160 320 320" class="gr-rosca">${fatias.map((f) => `<circle r="${R}" fill="none" stroke="${f.cor}" stroke-width="64" style="stroke-dasharray:calc(var(--p, 0) * ${(f.fr * C).toFixed(1)}px) ${C.toFixed(1)}px" transform="rotate(${(f.ini * 360 - 90).toFixed(1)})"/>`).join('')}</svg>`;
          filhos.push({ id: novoId('gp'), tag: 'div', classe: 'gr-pizza', html: svg, tweens: [tw(a + 0.4, 1.4, { p: 0 }, { p: 1 }, 'power3.out')] });
          filhos.push({ id: novoId('gl'), tag: 'ul', classe: 'gr-leg', filhos: fatias.map((f, k) => ({ id: novoId('gli'), tag: 'li', html: `<i style="background:${f.cor}"></i>${esc(f.r)} <b>${Math.round(f.fr * 100)}%</b>`, tweens: [tw(a + 0.6 + k * 0.15, 0.4, { opacity: 0, x: -30 * u }, { opacity: 1, x: 0 })] })) });
        } else {
          filhos.push({ id: novoId('gb'), tag: 'div', classe: 'gr-barras', filhos: itens.map((it, k) => ({ id: novoId('gbi'), tag: 'div', classe: 'gr-linha', tweens: [tw(a + 0.35 + k * 0.18, 0.4, { opacity: 0 }, { opacity: 1 })],
            filhos: [{ id: novoId('gr'), tag: 'span', classe: 'gr-rot', html: esc(it.r) },
              { id: novoId('gt'), tag: 'div', classe: 'gr-trilho', filhos: [{ id: novoId('gbb'), tag: 'i', classe: 'gr-barra' + (k === 0 ? ' prim' : ''), html: '', tweens: [tw(a + 0.45 + k * 0.18, 1.1, { p: 0 }, { p: it.v / max }, 'expo.out')] }] },
              { id: novoId('gv'), tag: 'b', classe: 'gr-val', html: '0', contador: { de: 0, para: it.v, t0: a + 0.45 + k * 0.18, dur: 1.1, sufixo: c.sufixo, prefixo: c.prefixo, casas: c.casas } }] })) });
          itens.forEach((_, k) => som({ tipo: 'clique', inicio: a + 0.45 + k * 0.18 }));
        }
        if (c.fonte) filhos.push({ id: novoId('f'), tag: 'p', classe: 'fonte', html: `Fonte: ${esc(c.fonte)}`, tweens: [tw(a + 1.2, 0.5, { opacity: 0 }, { opacity: 0.85 })] });
        break;
      }
      case 'linha': {   // linha do tempo: a linha desenha e os marcos aparecem
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.titulo, a, { y: 40 * u, enfase: c.enfase }) });
        const itens = (c.itens || []).slice(0, 5), passo = Math.min(0.7, (d - 1.2) / Math.max(1, itens.length));
        filhos.push({ id: novoId('tl'), tag: 'div', classe: 'tl', filhos: [{ id: novoId('tlr'), tag: 'i', classe: 'tl-reta', tweens: [tw(a + 0.3, itens.length * passo, { p: 0 }, { p: 1 }, 'linear')] }].concat(itens.map((it, k) => {
          const m2 = String(it).match(/^(.{1,14}?)\s*[—–:-]\s+(.*)$/); const quando = m2 ? m2[1] : '', oque = m2 ? m2[2] : String(it);
          return { id: novoId('tli'), tag: 'div', classe: 'tl-item', html: `<i></i><b>${esc(quando)}</b><span>${esc(oque)}</span>`, tweens: [tw(a + 0.35 + k * passo, 0.5, { opacity: 0, x: 50 * u, scale: 0.9 }, { opacity: 1, x: 0, scale: 1 }, 'back.out')] };
        })) });
        itens.forEach((_, k) => som({ tipo: 'pop', inicio: a + 0.35 + k * passo }));
        break;
      }
      case 'checklist': {   // itens sendo marcados um a um
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.titulo, a, { y: 40 * u, enfase: c.enfase }) });
        const itens = (c.itens || []).slice(0, 5), passo = Math.min(0.75, (d - 1) / Math.max(1, itens.length));
        filhos.push({ id: novoId('ck'), tag: 'ul', classe: 'ck', filhos: itens.map((it, k) => ({ id: novoId('cki'), tag: 'li', classe: 'ck-item', tweens: [tw(a + 0.3 + k * passo * 0.5, 0.4, { opacity: 0, x: -40 * u }, { opacity: 1, x: 0 })],
          filhos: [{ id: novoId('ckb'), tag: 'i', classe: 'ck-box', filhos: [{ id: novoId('ckv'), tag: 'b', classe: 'ck-v', html: '✓', tweens: [tw(a + 0.6 + k * passo, 0.35, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1 }, 'back.out')] }] },
            { id: novoId('ckt'), tag: 'span', html: esc(it), classe: 'ck-txt', tweens: [tw(a + 0.6 + k * passo, 0.35, { p: 0 }, { p: 1 }, 'power2.out')] }] })) });
        itens.forEach((_, k) => som({ tipo: 'clique', inicio: a + 0.6 + k * passo }));
        break;
      }
      case 'ranking': {   // top N: do último para o primeiro, número gigante
        const itens = (c.itens || []).slice(0, 5), n = itens.length, passo = (d - 0.3) / Math.max(1, n);
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno rk-tit', filhos: palavras(c.titulo, a, { y: 30 * u, enfase: c.enfase }) });
        itens.slice().reverse().forEach((it, k) => {
          const pos = n - k, t0 = a + 0.2 + k * passo, fim = k === n - 1 ? d : (k + 1) * passo + 0.2;
          filhos.push({ id: novoId('rk'), tag: 'div', classe: 'rk' + (pos === 1 ? ' rk1' : ''), html: `<b>${pos}º</b><span>${esc(it)}</span>`,
            tweens: [tw(t0, 0.5, { opacity: 0, scale: 1.8, blur: 10 }, { opacity: 1, scale: 1, blur: 0 }, 'expo.out')].concat(k < n - 1 ? [tw(a + fim - 0.15, 0.15, { opacity: 1 }, { opacity: 0 }, 'linear')] : []) });
          som({ tipo: pos === 1 ? 'impacto' : 'whoosh', inicio: t0 });
        });
        if (n) som({ tipo: 'confete', inicio: a + 0.25 + (n - 1) * passo });
        break;
      }
      case 'antesdepois': {   // cortina revelando o depois
        const A2 = c.midia ? midiaNo({ midia: c.midia, movimento: 'fixo' }, a, d) : null, B2 = c.midia2 ? midiaNo({ midia: c.midia2, movimento: 'fixo' }, a, d) : null;
        filhos.push({ id: novoId('ad'), tag: 'div', classe: 'ad', filhos: [
          { id: novoId('ada'), tag: 'div', classe: 'ad-camada', filhos: A2 ? [A2] : undefined, html: A2 ? undefined : '<span class="ad-vazio">ANTES</span>' },
          { id: novoId('adb'), tag: 'div', classe: 'ad-camada ad-depois', filhos: B2 ? [B2] : undefined, html: B2 ? undefined : '<span class="ad-vazio">DEPOIS</span>', tweens: [tw(a + 0.8, Math.max(0.8, d - 1.6), { p: 0 }, { p: 1 }, 'sine.inOut')] },
          { id: novoId('adl'), tag: 'i', classe: 'ad-linha', tweens: [tw(a + 0.8, Math.max(0.8, d - 1.6), { p: 0 }, { p: 1 }, 'sine.inOut')] },
          { id: novoId('adt'), tag: 'b', classe: 'ad-tag a', html: esc(c.rotulo || 'ANTES') }, { id: novoId('adt2'), tag: 'b', classe: 'ad-tag b', html: esc(c.rotulo2 || 'DEPOIS') }] });
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno ad-txt', filhos: palavras(c.texto, a + 0.2, { y: 30 * u, enfase: c.enfase }) });
        som({ tipo: 'whoosh', inicio: a + 0.75 });
        break;
      }
      case 'depoimento': {   // estrelas + frase do cliente (sempre real, escrita pelo usuário)
        const n = Math.max(1, Math.min(5, Math.round(Number(c.estrelas) || 5)));
        filhos.push({ id: novoId('ds'), tag: 'div', classe: 'dp-estrelas', filhos: Array.from({ length: 5 }, (_, k) => ({ id: novoId('de'), tag: 'i', classe: k < n ? 'on' : '', html: '★', tweens: [tw(a + 0.15 + k * 0.12, 0.4, { opacity: 0, scale: 0.2, rot: -40 }, { opacity: 1, scale: 1, rot: 0 }, 'back.out')] })) });
        for (let k = 0; k < n; k++) som({ tipo: 'pop', inicio: a + 0.15 + k * 0.12 });
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo citacao dp-txt', filhos: palavras(`“${c.texto || ''}”`, a + 0.8, { passo: 0.06, y: 0, blur: 6, dur: 0.5, enfase: c.enfase }) });
        if (c.autor) filhos.push({ id: novoId('au'), tag: 'p', classe: 'sub', html: `— ${esc(c.autor)}`, tweens: [tw(a + 1.4, 0.6, { opacity: 0 }, { opacity: 1 })] });
        break;
      }
      case 'local': {   // onde e quando: alfinete cai no mapa
        filhos.push({ id: novoId('mp'), tag: 'div', classe: 'mapa', tweens: [tw(a, d, { scale: 1.15, rot: -2 }, { scale: 1.3, rot: 2 }, 'linear')] });
        filhos.push({ id: novoId('pin'), tag: 'div', classe: 'pino', html: '<i></i>', tweens: [tw(a + 0.2, 0.7, { y: -H * 0.4, opacity: 0 }, { y: 0, opacity: 1 }, 'back.out')] });
        filhos.push({ id: novoId('pr'), tag: 'i', classe: 'pino-onda', tweens: [tw(a + 0.85, 1.2, { scale: 0.2, opacity: 0.9 }, { scale: 2.6, opacity: 0 }, 'power2.out')] });
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo lc-txt', filhos: palavras(c.texto || '', a + 0.9, { y: 40 * u, enfase: c.enfase }) });
        if (c.subtitulo) filhos.push({ id: novoId('p'), tag: 'p', classe: 'sub lc-sub', html: esc(c.subtitulo), tweens: [tw(a + 1.3, 0.6, { opacity: 0, y: 20 * u }, { opacity: 1, y: 0 })] });
        som({ tipo: 'boing', inicio: a + 0.6 });
        break;
      }
      case 'oferta': {   // preço com selo
        if (c.chamada) filhos.push({ id: novoId('of'), tag: 'div', classe: 'of-selo', html: esc(c.chamada), tweens: [tw(a + 0.1, 0.6, { opacity: 0, scale: 0, rot: -30 }, { opacity: 1, scale: 1, rot: -8 }, 'back.out')] });
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.texto, a + 0.2, { y: 40 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('n'), tag: 'div', classe: 'numero of-preco', html: '0',
          contador: { de: 0, para: Number(c.valor) || 0, t0: a + 0.5, dur: 1.1, prefixo: c.prefixo ?? 'R$ ', sufixo: c.sufixo, casas: c.casas ?? 0 },
          tweens: [tw(a + 0.4, 0.6, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1 }, 'back.out'), tw(a + 1.7, 0.3, { scale: 1 }, { scale: 1.08 }, 'sine.inOut'), tw(a + 2.0, 0.3, { scale: 1.08 }, { scale: 1 }, 'sine.inOut')] });
        if (c.rotulo) filhos.push({ id: novoId('r'), tag: 'p', classe: 'rotulo', html: esc(c.rotulo), tweens: [tw(a + 1.1, 0.5, { opacity: 0, y: 20 * u }, { opacity: 1, y: 0 })] });
        som({ tipo: 'contador', inicio: a + 0.5, dur: 1.1 });
        break;
      }
      case 'aovivo': {   // selo AO VIVO pulsando
        filhos.push({ id: novoId('av'), tag: 'div', classe: 'av-selo', html: '<i></i>AO VIVO', tweens: [tw(a + 0.1, 0.5, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1 }, 'back.out')] });
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo', filhos: palavras(c.texto || '', a + 0.35, { y: 50 * u, enfase: c.enfase }) });
        if (c.subtitulo) filhos.push({ id: novoId('p'), tag: 'p', classe: 'sub', html: esc(c.subtitulo), tweens: [tw(a + 0.9, 0.6, { opacity: 0, y: 24 * u }, { opacity: 1, y: 0 })] });
        som({ tipo: 'brilho', inicio: a + 0.15 });
        break;
      }
      case 'celular': {   // vídeo/foto dentro de um celular
        const M2 = c.midia ? midiaNo({ midia: c.midia, inicioNoArquivo: c.inicioNoArquivo, movimento: 'fixo' }, a, d) : null;
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.texto, a, { y: 40 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('cel'), tag: 'div', classe: 'cel', tweens: [tw(a + 0.1, 0.8, { y: H * 0.5, rot: 8, opacity: 0 }, { y: 0, rot: -3, opacity: 1 }, 'expo.out'), tw(a + 0.9, d - 0.9, { rot: -3 }, { rot: 2 }, 'sine.inOut')],
          filhos: [{ id: novoId('celt'), tag: 'div', classe: 'cel-tela', filhos: M2 ? [M2] : undefined, html: M2 ? undefined : '<span>seu vídeo aqui</span>' }, { id: novoId('celn'), tag: 'i', classe: 'cel-notch' }] });
        som({ tipo: 'whoosh', inicio: a + 0.05 });
        break;
      }
      case 'dividida': {   // tela dividida (em cima / embaixo)
        const A2 = c.midia ? midiaNo({ midia: c.midia, inicioNoArquivo: c.inicioNoArquivo }, a, d) : null, B2 = c.midia2 ? midiaNo({ midia: c.midia2 }, a, d) : null;
        filhos.push({ id: novoId('dv'), tag: 'div', classe: 'dv', filhos: [
          { id: novoId('dva'), tag: 'div', classe: 'dv-parte', filhos: A2 ? [A2] : undefined, html: A2 ? undefined : '<span class="ad-vazio">MÍDIA 1</span>', tweens: [tw(a, 0.6, { x: -W }, { x: 0 }, 'expo.out')] },
          { id: novoId('dvb'), tag: 'div', classe: 'dv-parte', filhos: B2 ? [B2] : undefined, html: B2 ? undefined : '<span class="ad-vazio">MÍDIA 2</span>', tweens: [tw(a + 0.15, 0.6, { x: W }, { x: 0 }, 'expo.out')] }] });
        if (c.texto) filhos.push({ id: novoId('dt'), tag: 'b', classe: 'dv-tag a', html: esc(c.texto), tweens: [tw(a + 0.6, 0.4, { opacity: 0, x: -30 * u }, { opacity: 1, x: 0 })] });
        if (c.subtitulo) filhos.push({ id: novoId('dt2'), tag: 'b', classe: 'dv-tag b', html: esc(c.subtitulo), tweens: [tw(a + 0.75, 0.4, { opacity: 0, x: 30 * u }, { opacity: 1, x: 0 })] });
        som({ tipo: 'whoosh', inicio: a });
        break;
      }
      /* ---- reels que explicam (22/11): terminal, passo, painel, medidor, catálogo, comenta ---- */
      case 'terminal': {   // janela de terminal: o comando é digitado e as linhas de saída aparecem com ✓
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.texto, a, { y: 40 * u, enfase: c.enfase }) });
        const cmd = String(c.comando || 'bw criar reel');
        const tDig = Math.min(Math.max(0.6, cmd.length * 0.045), Math.max(0.8, d * 0.45)), t0 = a + 0.45;
        const saida = (c.itens || []).slice(0, 4), passoS = Math.min(0.45, Math.max(0.2, (d - (t0 - a) - tDig - 0.6) / Math.max(1, saida.length)));
        filhos.push({ id: novoId('tm'), tag: 'div', classe: 'tm', tweens: [tw(a + 0.1, 0.6, { opacity: 0, y: 60 * u, scale: 0.94 }, { opacity: 1, y: 0, scale: 1 }, 'expo.out')],
          filhos: [{ id: novoId('tmb'), tag: 'div', classe: 'tm-barra', html: `<i></i><i></i><i></i><span>${esc(c.titulo || 'terminal')}</span>` },
            { id: novoId('tml'), tag: 'div', classe: 'tm-linha', html: `<b>›</b>`, filhos: [{ id: novoId('tmc'), tag: 'span', classe: 'tm-cmd', html: esc(cmd), estilo: `--n:${cmd.length}`, tweens: [tw(t0, tDig, { p: 0 }, { p: 1 }, 'linear')] }, { id: novoId('tmk'), tag: 'i', classe: 'tm-cursor' }] }]
            .concat(saida.map((s, k) => ({ id: novoId('tmo'), tag: 'div', classe: 'tm-out', html: `<b>✓</b> ${esc(s)}`, tweens: [tw(t0 + tDig + 0.25 + k * passoS, 0.3, { opacity: 0, x: -20 * u }, { opacity: 1, x: 0 })] }))) });
        for (let k = 0; k < cmd.length; k += 3) som({ tipo: 'clique', inicio: t0 + (k / cmd.length) * tDig });
        saida.forEach((_, k) => som({ tipo: 'pop', inicio: t0 + tDig + 0.25 + k * passoS }));
        break;
      }
      case 'passo': {   // "1. NOME" + ícone grande com brilho, cada passo com a sua cor
        const num = c.numero ?? '', tot = c.total ? ` <small>/ ${esc(c.total)}</small>` : '';
        filhos.push({ id: novoId('ps'), tag: 'div', classe: 'ps-num', html: `${esc(String(num))}${tot}`, tweens: [tw(a, 0.5, { opacity: 0, y: -30 * u }, { opacity: 1, y: 0 })] });
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno ps-tit', filhos: palavras(c.titulo, a + 0.1, { y: 30 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('pf'), tag: 'i', classe: 'ps-feixe', tweens: [tw(a + 0.15, 0.7, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1 }, 'expo.out')] });
        filhos.push({ id: novoId('pi'), tag: 'div', classe: 'ps-icone', html: esc(c.icone || '★'), tweens: [tw(a + 0.25, 0.7, { opacity: 0, scale: 0.2, rot: -25 }, { opacity: 1, scale: 1, rot: 0 }, 'back.out'), tw(a + 1, Math.max(0.2, d - 1), { y: 0 }, { y: -18 * u }, 'sine.inOut')] });
        if (c.subtitulo) filhos.push({ id: novoId('p'), tag: 'p', classe: 'sub ps-sub', html: esc(c.subtitulo), tweens: [tw(a + 0.8, 0.5, { opacity: 0, y: 24 * u }, { opacity: 1, y: 0 })] });
        som({ tipo: 'whoosh', inicio: a + 0.05 }); som({ tipo: 'brilho', inicio: a + 0.4 });
        break;
      }
      case 'painel': {   // cartão de app: número contando + linha do gráfico se desenhando
        const num = (v) => typeof v === 'number' ? v : /,/.test(String(v)) ? Number(String(v).replace(/\./g, '').replace(',', '.')) : Number(v);
        const pts = (c.itens || []).map(num).filter((v) => isFinite(v)).slice(0, 12);
        const serie = pts.length >= 2 ? pts : [2, 3, 2.6, 4, 5.2, 4.8, 7, 9];
        const mn = Math.min(...serie), mx = Math.max(...serie), rg = mx - mn || 1;
        const path = serie.map((v, k) => `${k ? 'L' : 'M'}${(k / (serie.length - 1) * 600).toFixed(1)} ${(190 - (v - mn) / rg * 170).toFixed(1)}`).join(' ');
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.texto, a, { y: 40 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('pn'), tag: 'div', classe: 'pn', tweens: [tw(a + 0.1, 0.6, { opacity: 0, y: 70 * u, scale: 0.92 }, { opacity: 1, y: 0, scale: 1 }, 'expo.out')],
          filhos: [{ id: novoId('pnr'), tag: 'div', classe: 'pn-rot', html: esc(c.rotulo || 'Visualizações') },
            { id: novoId('pnv'), tag: 'div', classe: 'pn-val', html: '0', contador: { de: 0, para: Number(c.valor) || 0, t0: a + 0.4, dur: Math.min(1.8, d * 0.6), prefixo: c.prefixo, sufixo: c.sufixo, casas: c.casas } },
            ...(c.variacao ? [{ id: novoId('pnx'), tag: 'div', classe: 'pn-var', html: esc(c.variacao), tweens: [tw(a + 1.2, 0.4, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1 }, 'back.out')] }] : []),
            { id: novoId('png'), tag: 'div', classe: 'pn-graf', html: `<svg viewBox="-10 -10 620 220"><path class="pn-area" d="${path} L600 200 L0 200 Z"/><path class="pn-traco" pathLength="1" d="${path}"/></svg>`, tweens: [tw(a + 0.4, Math.min(1.8, d * 0.6), { p: 0 }, { p: 1 }, 'power2.out')] }] });
        if (c.fonte) filhos.push({ id: novoId('f'), tag: 'p', classe: 'fonte', html: `Fonte: ${esc(c.fonte)}`, tweens: [tw(a + 1.0, 0.5, { opacity: 0 }, { opacity: 0.85 })] });
        som({ tipo: 'contador', inicio: a + 0.4, dur: Math.min(1.8, d * 0.6) });
        break;
      }
      case 'medidor': {   // velocímetro: o ponteiro sobe até o valor
        const max = Number(c.maximo) || 100, fr = Math.max(0, Math.min(1, (Number(c.valor) || 0) / max));
        if (c.texto) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno', filhos: palavras(c.texto, a, { y: 40 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('md'), tag: 'div', classe: 'md', tweens: [tw(a + 0.1, 0.6, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, 'expo.out')],
          filhos: [{ id: novoId('mda'), tag: 'div', classe: 'md-arco', tweens: [tw(a + 0.4, 1.4, { p: 0 }, { p: fr }, 'expo.out')] },
            { id: novoId('mdp'), tag: 'i', classe: 'md-ponteiro', tweens: [tw(a + 0.4, 1.4, { rot: -120 }, { rot: -120 + 240 * fr }, 'expo.out')] },
            { id: novoId('mdv'), tag: 'b', classe: 'md-val', html: '0', contador: { de: 0, para: Number(c.valor) || 0, t0: a + 0.4, dur: 1.4, sufixo: c.sufixo, casas: c.casas } },
            { id: novoId('mdr'), tag: 'span', classe: 'md-rot', html: esc(c.rotulo || '') }] });
        if (c.fonte) filhos.push({ id: novoId('f'), tag: 'p', classe: 'fonte', html: `Fonte: ${esc(c.fonte)}`, tweens: [tw(a + 1.0, 0.5, { opacity: 0 }, { opacity: 0.85 })] });
        som({ tipo: 'contador', inicio: a + 0.4, dur: 1.4 });
        break;
      }
      case 'catalogo': {   // lista numerada que vai acendendo + cartão grande do item da vez
        const itens = (c.itens || []).slice(0, 10), n = itens.length || 1, t0 = a + 0.35, passo = (d - 0.45) / n;
        const icones = c.icones || [];
        if (c.titulo) filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo pequeno ct-tit', filhos: palavras(c.titulo, a, { y: 30 * u, enfase: c.enfase }) });
        filhos.push({ id: novoId('ct'), tag: 'div', classe: 'ct', filhos: [
          { id: novoId('ctl'), tag: 'ol', classe: 'ct-lista', filhos: itens.map((it, k) => ({ id: novoId('cti'), tag: 'li', classe: 'ct-item', html: `<b>${k + 1}</b>${esc(it)}`,
            tweens: [tw(t0 + k * passo, 0.25, { opacity: 0.28, x: 0, scale: 1 }, { opacity: 1, x: 14 * u, scale: 1.04 }, 'power2.out')].concat(k < n - 1 ? [tw(t0 + (k + 1) * passo, 0.25, { x: 14 * u, scale: 1.04 }, { x: 0, scale: 1 }, 'power2.out')] : []) })) },
          { id: novoId('ctc'), tag: 'div', classe: 'ct-cartoes', filhos: itens.map((it, k) => ({ id: novoId('ctk'), tag: 'div', classe: 'ct-cartao c' + (k % 6), html: `<span class="ct-ic">${esc(icones[k] || String(k + 1))}</span><b>${esc(it)}</b>`,
            tweens: [tw(t0 + k * passo, 0.4, { opacity: 0, scale: 0.8, rot: 6, y: 40 * u }, { opacity: 1, scale: 1, rot: 0, y: 0 }, 'back.out')].concat(k < n - 1 ? [tw(t0 + (k + 1) * passo, 0.25, { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }, 'power2.out')] : []) })) }] });
        itens.forEach((_, k) => som({ tipo: k ? 'clique' : 'pop', inicio: t0 + k * passo }));
        break;
      }
      case 'comenta': {   // "Comenta PALAVRA": caixa de comentário digitando + resposta
        const pal = String(c.palavra || 'QUERO').toUpperCase();
        filhos.push({ id: novoId('h'), tag: 'h2', classe: 'titulo cm-tit', filhos: palavras(c.texto || 'Comenta', a, { y: 40 * u }) });
        filhos.push({ id: novoId('cmp'), tag: 'div', classe: 'cm-pal', html: esc(pal), tweens: [tw(a + 0.3, 0.55, { opacity: 0, scale: 1.8, rot: -6 }, { opacity: 1, scale: 1, rot: -2 }, 'back.out')] });
        filhos.push({ id: novoId('cmc'), tag: 'div', classe: 'cm-caixa', tweens: [tw(a + 0.6, 0.5, { opacity: 0, y: 50 * u }, { opacity: 1, y: 0 })],
          filhos: [{ id: novoId('cma'), tag: 'i', classe: 'cm-av' }, { id: novoId('cmt'), tag: 'span', classe: 'tm-cmd cm-txt', html: esc(pal), estilo: `--n:${pal.length}`, tweens: [tw(a + 1.0, Math.min(0.9, pal.length * 0.09), { p: 0 }, { p: 1 }, 'linear')] }, { id: novoId('cme'), tag: 'b', classe: 'cm-env', html: '➤' }] });
        if (c.resposta !== '') filhos.push({ id: novoId('cmr'), tag: 'div', classe: 'cm-resp', html: `📩 ${esc(c.resposta || 'Te mando no direct')}`, tweens: [tw(a + 2.0, 0.45, { opacity: 0, y: 30 * u, scale: 0.9 }, { opacity: 1, y: 0, scale: 1 }, 'back.out')] });
        for (let k = 0; k < pal.length; k++) som({ tipo: 'clique', inicio: a + 1.0 + k * Math.min(0.9, pal.length * 0.09) / pal.length });
        som({ tipo: 'pop', inicio: a + 1.95 }); som({ tipo: 'brilho', inicio: a + 2.05 });
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
      inicio: a, fim: a + d, tweens: trTweens, filhos, fala: c.fala, estilo: /^#[0-9a-f]{3,8}$/i.test(c.cor || '') ? `--destaque:${c.cor}` : undefined, legendaOculta: !!c.legendaOculta,
    });
    // som original da filmagem (fala de quem aparece): entra na mixagem só no trecho usado
    if (c.somDoVideo && /\.(mp4|mov|webm|m4v|mkv)$/i.test(c.midia || ''))
      plano.audios.push({ papel: 'fala', src: c.midia, inicio: a, corte: { de: c.inicioNoArquivo || 0, dur: d }, volume: c.volumeVideo ?? 1 });
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


const ANIM = "// N\u00facleo de anima\u00e7\u00e3o compartilhado pelos 3 motores (nativo, HyperFrames, Remotion).\n// Fun\u00e7\u00f5es puras: dado um tempo t (s), devolvem o estado visual de cada elemento.\n\nconst EASES = {\n  linear: (x) => x,\n  none: (x) => x,\n  'sine.inOut': (x) => -(Math.cos(Math.PI * x) - 1) / 2,\n  'power2.out': (x) => 1 - (1 - x) ** 2,\n  'power3.out': (x) => 1 - (1 - x) ** 3,\n  'power4.out': (x) => 1 - (1 - x) ** 4,\n  'power2.inOut': (x) => (x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2),\n  'expo.out': (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),\n  'expo.inOut': (x) =>\n    x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? 2 ** (20 * x - 10) / 2 : (2 - 2 ** (-20 * x + 10)) / 2,\n  'back.out': (x) => {\n    const c1 = 1.70158, c3 = c1 + 1;\n    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;\n  },\n};\n\nconst PADRAO = { opacity: 1, x: 0, y: 0, scale: 1, rot: 0, blur: 0, ls: 0, p: 0 };   // p = progresso 0..1 (vira a vari\u00e1vel CSS --p)\n\nconst lerp = (a, b, k) => a + (b - a) * k;\n\n/** Estado de um elemento no tempo t a partir da lista de tweens. */\nfunction estadoEm(tweens = [], t) {\n  const s = { ...PADRAO };\n  if (!tweens.length) return s;\n  const ord = [...tweens].sort((a, b) => a.t0 - b.t0);\n  // valores iniciais = \"de\" da primeira tween de cada propriedade\n  for (const tw of [...ord].reverse()) Object.assign(s, tw.de);\n  for (const tw of ord) {\n    if (t < tw.t0) break;\n    const k = tw.dur <= 0 ? 1 : Math.min(1, (t - tw.t0) / tw.dur);\n    const e = (EASES[tw.ease] || EASES['power3.out'])(k);\n    for (const p of Object.keys(tw.para)) {\n      const de = tw.de[p] ?? s[p];\n      s[p] = lerp(de, tw.para[p], e);\n    }\n  }\n  return s;\n}\n\nfunction estadoParaCss(s) {\n  return {\n    opacity: String(Math.max(0, Math.min(1, s.opacity))),\n    transform: `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rot}deg)`,\n    filter: s.blur > 0.05 ? `blur(${s.blur}px)` : 'none',\n    letterSpacing: s.ls ? `${s.ls}em` : '',\n    p: s.p,\n  };\n}\n\nfunction visivel(el, t) {\n  return t >= el.inicio && t < el.fim;\n}\n\n/** Valor do contador animado (cenas \"dado\"). */\nfunction contadorEm(c, t) {\n  if (t <= c.t0) return c.de;\n  const k = Math.min(1, (t - c.t0) / c.dur);\n  return lerp(c.de, c.para, EASES['expo.out'](k));\n}\n\nfunction formatarNumero(v, c) {\n  const casas = c.casas ?? 0;\n  const n = v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });\n  const pre = c.prefixo ? `<small>${c.prefixo.trim()}</small>` : '';\n  const suf = c.sufixo ? (c.sufixo.trim().length > 2 ? `<small>${c.sufixo.trim()}</small>` : c.sufixo) : '';\n  return `${pre}${n}${suf}`;\n}\n\n/** P\u00e1gina de legenda ativa e \u00edndice da palavra falada no tempo t. */\nfunction legendaEm(paginas = [], t) {\n  const p = paginas.find((pg) => t >= pg.t0 && t < pg.t1);\n  if (!p) return null;\n  let ativa = -1;\n  p.palavras.forEach((w, i) => {\n    if (t >= w.t0) ativa = i;\n  });\n  return { pagina: p, ativa };\n}\n";
const PERS = "// Personagens animados por c\u00f3digo (vetor/SVG), usados pela cena \"personagem\" nos 3 motores.\n// - svgPersonagem(): desenha o personagem (partes marcadas com data-p)\n// - animarPersonagem(): mexe as partes S\u00d3 em fun\u00e7\u00e3o do tempo t (determin\u00edstico: mesmo t = mesma imagem)\n// Para criar um personagem novo: copie um bloco de PERSONAGENS e ajuste cores/cabelo, ou um \"desenho\" novo em svgPersonagem.\n\nconst PERSONAGENS = {\n  be:  { nome: 'B\u00ea (c\u00e2mera BW)', desenho: 'camera', cores: { corpo: '#232937', detalhe: '#FFB547', lente: '#3aa7e0', pe: '#FFB547' } },\n  ana: { nome: 'Ana', desenho: 'pessoa', cabelo: 'longo', cores: { pele: '#f1c7a5', cabelo: '#5a3424', roupa: '#e8505b', calca: '#2b3550', sapato: '#1b1f2a' } },\n  leo: { nome: 'L\u00e9o', desenho: 'pessoa', cabelo: 'curto', cores: { pele: '#c98d63', cabelo: '#1d1a19', roupa: '#2f80ed', calca: '#273043', sapato: '#111' } },\n  bia: { nome: 'Bia', desenho: 'pessoa', cabelo: 'coque', cores: { pele: '#8a5a3b', cabelo: '#24160f', roupa: '#22b07d', calca: '#3a2f4f', sapato: '#161616' } },\n  rui: { nome: 'Rui', desenho: 'pessoa', cabelo: 'careca', barba: true, cores: { pele: '#e3b08e', cabelo: '#6b6b6b', roupa: '#f2b134', calca: '#2c2c34', sapato: '#121212' } },\n  robo: { nome: 'Rob\u00f4', desenho: 'robo', cores: { corpo: '#cfd6e2', detalhe: '#ff4d6d', lente: '#5ef0ff', pe: '#8a94a6' } },\n  cinegrafista: { nome: 'Cinegrafista', desenho: 'pessoa', cabelo: 'curto', barba: 'cavanhaque', roupa: 'jaqueta', acessorio: 'camera', bone: true, cores: { pele: '#d8a07a', cabelo: '#2b1d14', roupa: '#24272f', calca: '#3b4250', sapato: '#111', detalhe: '#FFB547' } },\n  tecnico: { nome: 'T\u00e9cnico de som', desenho: 'pessoa', cabelo: 'curto', barba: 'cheia', roupa: 'camiseta', acessorio: 'headset', cores: { pele: '#b97d55', cabelo: '#1a1410', roupa: '#1d1f26', calca: '#2c3446', sapato: '#111', detalhe: '#FFB547' } },\n  dj: { nome: 'DJ', desenho: 'pessoa', cabelo: 'moicano', oculos: 'escuro', roupa: 'jaqueta', acessorio: 'headset', cores: { pele: '#7a4a2e', cabelo: '#ff3db8', roupa: '#3a1f6b', calca: '#18181f', sapato: '#f5f1ea', detalhe: '#7cf7ff' } },\n  palestrante: { nome: 'Palestrante', desenho: 'pessoa', cabelo: 'franja', roupa: 'social', acessorio: 'microfone', cores: { pele: '#f0c4a2', cabelo: '#7a4b2a', roupa: '#f4f4f4', calca: '#2b2f3a', sapato: '#1a1a1a', detalhe: '#c8102e' } },\n  executivo: { nome: 'Executivo', desenho: 'pessoa', cabelo: 'curto', roupa: 'terno', cores: { pele: '#e9b996', cabelo: '#3b2a1d', roupa: '#1f2a44', calca: '#1f2a44', sapato: '#111', detalhe: '#c8102e' } },\n  executiva: { nome: 'Executiva', desenho: 'pessoa', cabelo: 'coque', oculos: 'quadrado', roupa: 'terno', cores: { pele: '#9b6343', cabelo: '#1c120c', roupa: '#2b2b33', calca: '#2b2b33', sapato: '#111', detalhe: '#FFB547' } },\n  noiva: { nome: 'Noiva', desenho: 'pessoa', cabelo: 'longo', roupa: 'vestido', acessorio: 'veu', cores: { pele: '#f2cdb0', cabelo: '#4a2c1a', roupa: '#fbf8f2', calca: '#fbf8f2', sapato: '#efe6d6', detalhe: '#e8c26a' } },\n  noivo: { nome: 'Noivo', desenho: 'pessoa', cabelo: 'curto', barba: 'bigode', roupa: 'terno', cores: { pele: '#c48a64', cabelo: '#16110d', roupa: '#121218', calca: '#121218', sapato: '#0a0a0a', detalhe: '#f4f4f4' } },\n  fotografa: { nome: 'Fot\u00f3grafa', desenho: 'pessoa', cabelo: 'cacheado', roupa: 'jaqueta', acessorio: 'camera', cores: { pele: '#6e432b', cabelo: '#1b120c', roupa: '#c9772f', calca: '#2a3142', sapato: '#111', detalhe: '#111' } },\n  cliente: { nome: 'Cliente', desenho: 'pessoa', cabelo: 'rabo', roupa: 'camiseta', acessorio: 'cracha', cores: { pele: '#f3cfb3', cabelo: '#c98a2f', roupa: '#7b5cff', calca: '#2b3550', sapato: '#1b1f2a', detalhe: '#ff4d6d' } },\n  garcom: { nome: 'Gar\u00e7om', desenho: 'pessoa', cabelo: 'curto', barba: 'bigode', roupa: 'avental', cores: { pele: '#d9a47f', cabelo: '#222', roupa: '#f4f4f4', calca: '#151515', sapato: '#0a0a0a', detalhe: '#1b1b1b' } },\n  cachorro: { nome: 'Cachorro', desenho: 'pessoa', bicho: 'cachorro', roupa: 'camiseta', cores: { pele: '#c08a55', cabelo: '#7a4f2a', roupa: '#2f80ed', calca: '#c08a55', sapato: '#7a4f2a', detalhe: '#ff4d6d' } },\n  gato: { nome: 'Gato', desenho: 'pessoa', bicho: 'gato', roupa: 'camiseta', cores: { pele: '#9aa3ad', cabelo: '#5f6873', roupa: '#22b07d', calca: '#9aa3ad', sapato: '#5f6873', detalhe: '#ffb3c7' } },\n};\n\n/** Op\u00e7\u00f5es do CRIAR PERSONAGEM (montador). Um personagem montado vai no roteiro como {personagem:'meu', look:{\u2026}}. */\nconst MONTADOR = {\n  bicho: { nenhum: 'Pessoa', cachorro: 'Cachorro', gato: 'Gato' },\n  cabelo: { curto: 'Curto', longo: 'Longo', coque: 'Coque', cacheado: 'Cacheado', rabo: 'Rabo de cavalo', franja: 'Franja', moicano: 'Moicano', careca: 'Careca' },\n  barba: { nenhuma: 'Sem barba', cheia: 'Barba cheia', bigode: 'Bigode', cavanhaque: 'Cavanhaque' },\n  oculos: { nenhum: 'Sem \u00f3culos', redondo: 'Redondo', quadrado: 'Quadrado', escuro: 'Escuro' },\n  roupa: { camiseta: 'Camiseta', social: 'Camisa e gravata', terno: 'Terno', jaqueta: 'Jaqueta', vestido: 'Vestido', avental: 'Avental' },\n  acessorio: { nenhum: 'Nenhum', headset: 'Headset', camera: 'C\u00e2mera na m\u00e3o', microfone: 'Microfone', cracha: 'Crach\u00e1', veu: 'V\u00e9u' },\n  bone: { nao: 'Sem bon\u00e9', sim: 'Com bon\u00e9' },\n  peles: ['#f6d7bf', '#f0c4a2', '#e3b08e', '#d8a07a', '#c48a64', '#a86e4a', '#8a5a3b', '#6e432b', '#4e2f1f'],\n};\n\nconst ACOES = ['parado', 'acena', 'fala', 'aponta', 'comemora', 'pensa', 'surpresa'];\n// \"foto\" = personagem do PR\u00d3PRIO usu\u00e1rio (PNG recortado): {personagem:'foto', imagem:'midia/avatar.png', contorno:true, espelhar:false}\nconst FOTO = 'foto';\n\nconst L = '#0b0d12'; // contorno (estilo desenho animado)\n\nfunction membro(id, x1, y1, x2, y2, cor, mao, extra = '') {\n  return `<g data-p=\"${id}\" data-ox=\"${x1}\" data-oy=\"${y1}\">\n    <path d=\"M${x1} ${y1} L${x2} ${y2}\" stroke=\"${L}\" stroke-width=\"40\" stroke-linecap=\"round\"/>\n    <path d=\"M${x1} ${y1} L${x2} ${y2}\" stroke=\"${cor}\" stroke-width=\"26\" stroke-linecap=\"round\"/>\n    ${extra}<circle cx=\"${x2}\" cy=\"${y2 + 6}\" r=\"20\" fill=\"${mao}\" stroke=\"${L}\" stroke-width=\"7\"/></g>`;\n}\nconst sorriso = (cx, cy, w) => `M${cx - w / 2} ${cy} Q${cx} ${cy + w * 0.42} ${cx + w / 2} ${cy} Q${cx} ${cy + w * 0.15} ${cx - w / 2} ${cy}Z`;\nfunction olho(cx, cy, r, rp) {\n  return `<ellipse cx=\"${cx}\" cy=\"${cy}\" rx=\"${r}\" ry=\"${r * 1.12}\" fill=\"#fff\" stroke=\"${L}\" stroke-width=\"6\"/>\n    <g data-p=\"pupila\" data-cx=\"${cx}\" data-cy=\"${cy}\"><circle cx=\"${cx}\" cy=\"${cy}\" r=\"${rp}\" fill=\"${L}\"/><circle cx=\"${cx - rp * .35}\" cy=\"${cy - rp * .4}\" r=\"${rp * .35}\" fill=\"#fff\"/></g>`;\n}\n\n/** SVG do personagem. `p` = chave de PERSONAGENS ou objeto {desenho, cabelo, cores}. viewBox 400\u00d7640, p\u00e9s em y\u2248615. */\nfunction svgPersonagem(p, coresExtra) {\n  const base = typeof p === 'string' ? (PERSONAGENS[p] || PERSONAGENS.be) : { desenho: 'pessoa', ...p, cores: { ...PERSONAGENS.leo.cores, ...(p && p.cores) } };\n  const c = { ...base.cores, ...(coresExtra || {}) };\n  let corpo = '';\n  if (base.desenho === 'pessoa') {\n    const bicho = base.bicho && base.bicho !== 'nenhum' ? base.bicho : null;\n    const cab = bicho ? 'nenhum' : (base.cabelo || 'curto');\n    const roupa = base.roupa || 'camiseta', ac = base.acessorio || 'nenhum', det = c.detalhe || '#c8102e';\n    const barbaT = base.barba === true ? 'cheia' : (base.barba || 'nenhuma');\n    const manga = roupa === 'social' || roupa === 'avental' ? '#f4f4f4' : c.roupa;\n    const atras = {\n      longo: `<path d=\"M105 190 Q100 330 140 395 L262 395 Q300 330 295 190 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      rabo: `<path d=\"M286 150 Q352 190 330 300 Q322 340 300 352 Q312 290 280 200 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      franja: `<path d=\"M104 196 Q100 300 130 330 L270 330 Q300 300 296 196 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n    }[cab] || '';\n    const veuAtras = ac === 'veu' ? `<path d=\"M112 130 Q60 330 92 520 L308 520 Q340 330 288 130 Z\" fill=\"#ffffff\" opacity=\".55\" stroke=\"${L}\" stroke-width=\"5\"/>` : '';\n    const topo = {\n      curto: `<path d=\"M108 190 Q110 92 200 88 Q292 92 292 190 Q270 140 200 140 Q140 140 108 190Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      longo: `<path d=\"M104 200 Q100 90 200 86 Q300 90 296 200 Q262 128 200 138 Q160 130 128 168 Q116 186 104 200Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      coque: `<circle cx=\"200\" cy=\"74\" r=\"40\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/><path d=\"M108 188 Q110 96 200 92 Q290 96 292 188 Q262 132 200 134 Q138 132 108 188Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      careca: `<path d=\"M110 178 Q112 162 120 152\" stroke=\"${c.cabelo}\" stroke-width=\"14\" stroke-linecap=\"round\" fill=\"none\"/><path d=\"M290 178 Q288 162 280 152\" stroke=\"${c.cabelo}\" stroke-width=\"14\" stroke-linecap=\"round\" fill=\"none\"/>`,\n      cacheado: [[120, 150, 34], [150, 110, 36], [200, 96, 38], [250, 110, 36], [280, 150, 34], [102, 196, 26], [298, 196, 26]].map(([x, y, r]) => `<circle cx=\"${x}\" cy=\"${y}\" r=\"${r}\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"7\"/>`).join('') +\n        [[150, 110, 30], [200, 98, 32], [250, 110, 30]].map(([x, y, r]) => `<circle cx=\"${x}\" cy=\"${y + 6}\" r=\"${r}\" fill=\"${c.cabelo}\"/>`).join(''),\n      rabo: `<path d=\"M106 192 Q108 92 200 88 Q292 92 294 192 Q268 132 200 136 Q140 132 106 192Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      franja: `<path d=\"M104 210 Q98 90 200 86 Q302 90 296 210 L282 214 Q276 160 240 150 L232 172 Q196 150 168 168 L160 150 Q124 160 118 214 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n      moicano: `<path d=\"M176 160 Q170 70 200 40 Q230 70 224 160 Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`,\n    }[cab] || '';\n    const barba = {\n      cheia: `<path d=\"M128 236 Q140 318 200 322 Q260 318 272 236 Q250 286 200 288 Q150 286 128 236Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"6\"/>`,\n      bigode: `<path d=\"M168 246 Q184 234 200 244 Q216 234 232 246 Q216 256 200 250 Q184 256 168 246Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"5\"/>`,\n      cavanhaque: `<path d=\"M180 286 Q200 312 220 286 Q210 296 200 296 Q190 296 180 286Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"5\"/><path d=\"M174 248 Q200 238 226 248\" stroke=\"${c.cabelo}\" stroke-width=\"9\" fill=\"none\" stroke-linecap=\"round\"/>`,\n    }[barbaT] || '';\n    const oc = base.oculos || 'nenhum';\n    const oculos = oc === 'redondo' ? `<g fill=\"none\" stroke=\"${L}\" stroke-width=\"7\"><circle cx=\"162\" cy=\"196\" r=\"30\"/><circle cx=\"238\" cy=\"196\" r=\"30\"/><path d=\"M192 194 Q200 186 208 194\"/></g>`\n      : oc === 'quadrado' ? `<g fill=\"none\" stroke=\"${L}\" stroke-width=\"7\"><rect x=\"130\" y=\"172\" width=\"64\" height=\"48\" rx=\"10\"/><rect x=\"206\" y=\"172\" width=\"64\" height=\"48\" rx=\"10\"/><path d=\"M194 192 L206 192\"/></g>`\n      : oc === 'escuro' ? `<g stroke=\"${L}\" stroke-width=\"7\"><rect x=\"128\" y=\"174\" width=\"68\" height=\"44\" rx=\"16\" fill=\"#111\"/><rect x=\"204\" y=\"174\" width=\"68\" height=\"44\" rx=\"16\" fill=\"#111\"/><path d=\"M196 190 L204 190\"/></g><path d=\"M140 182 L160 182\" stroke=\"#fff\" stroke-width=\"5\" opacity=\".5\"/>` : '';\n    const orelhas = bicho === 'cachorro' ? `<path d=\"M112 130 Q70 150 84 250 Q100 280 124 240 Q122 180 140 140Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/><path d=\"M288 130 Q330 150 316 250 Q300 280 276 240 Q278 180 260 140Z\" fill=\"${c.cabelo}\" stroke=\"${L}\" stroke-width=\"8\"/>`\n      : bicho === 'gato' ? `<path d=\"M118 150 L120 72 L176 112 Z\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"8\" stroke-linejoin=\"round\"/><path d=\"M282 150 L280 72 L224 112 Z\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"8\" stroke-linejoin=\"round\"/><path d=\"M128 128 L130 92 L160 112Z\" fill=\"${det}\"/><path d=\"M272 128 L270 92 L240 112Z\" fill=\"${det}\"/>` : '';\n    const focinho = bicho ? `<ellipse cx=\"200\" cy=\"246\" rx=\"${bicho === 'gato' ? 40 : 50}\" ry=\"${bicho === 'gato' ? 28 : 34}\" fill=\"#f4ece2\" stroke=\"${L}\" stroke-width=\"6\"/><ellipse cx=\"200\" cy=\"232\" rx=\"${bicho === 'gato' ? 10 : 16}\" ry=\"${bicho === 'gato' ? 7 : 11}\" fill=\"${bicho === 'gato' ? det : L}\"/>` +\n      (bicho === 'gato' ? `<g stroke=\"${L}\" stroke-width=\"3\"><path d=\"M150 240 L104 232\"/><path d=\"M150 250 L104 256\"/><path d=\"M250 240 L296 232\"/><path d=\"M250 250 L296 256\"/></g>` : '') : '';\n    const bone = base.bone ? `<path d=\"M110 150 Q120 78 200 76 Q280 78 290 150 Z\" fill=\"${det === '#111' ? '#333' : c.roupa}\" stroke=\"${L}\" stroke-width=\"8\"/><path d=\"M200 140 Q290 136 330 150 Q300 162 200 156Z\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"7\"/>` : '';\n    const headset = ac === 'headset' ? `<path d=\"M100 200 Q100 70 200 66 Q300 70 300 200\" fill=\"none\" stroke=\"${L}\" stroke-width=\"16\"/><path d=\"M100 200 Q100 70 200 66 Q300 70 300 200\" fill=\"none\" stroke=\"${det}\" stroke-width=\"7\"/>\n      <rect x=\"82\" y=\"168\" width=\"34\" height=\"60\" rx=\"12\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"7\"/><rect x=\"284\" y=\"168\" width=\"34\" height=\"60\" rx=\"12\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"7\"/><path d=\"M100 226 Q110 280 160 270\" fill=\"none\" stroke=\"${L}\" stroke-width=\"7\"/><circle cx=\"162\" cy=\"270\" r=\"9\" fill=\"${L}\"/>` : '';\n    const veuTopo = ac === 'veu' ? `<path d=\"M130 118 Q200 92 270 118\" fill=\"none\" stroke=\"${det}\" stroke-width=\"10\" stroke-linecap=\"round\"/>` : '';\n    // tronco por tipo de roupa\n    const corpoRoupa = roupa === 'vestido'\n      ? `<path d=\"M138 322 Q200 300 262 322 L300 548 Q200 568 100 548 Z\" fill=\"${c.roupa}\" stroke=\"${L}\" stroke-width=\"8\" stroke-linejoin=\"round\"/><path d=\"M146 420 Q200 432 254 420\" stroke=\"${det}\" stroke-width=\"8\" fill=\"none\"/>`\n      : `<path d=\"M128 322 Q200 296 272 322 L284 488 Q200 504 116 488 Z\" fill=\"${roupa === 'social' ? '#f4f4f4' : c.roupa}\" stroke=\"${L}\" stroke-width=\"8\" stroke-linejoin=\"round\"/>` +\n        (roupa === 'camiseta' ? `<path d=\"M176 312 L200 352 L224 312\" fill=\"none\" stroke=\"${L}\" stroke-width=\"6\" opacity=\".55\"/>` : '') +\n        (roupa === 'social' ? `<path d=\"M178 310 L200 336 L222 310\" fill=\"#fff\" stroke=\"${L}\" stroke-width=\"5\"/><path d=\"M192 336 L208 336 L214 430 L200 446 L186 430 Z\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"5\"/>` : '') +\n        (roupa === 'terno' ? `<path d=\"M168 306 L200 380 L232 306 Z\" fill=\"#f4f4f4\" stroke=\"${L}\" stroke-width=\"5\"/><path d=\"M193 330 L207 330 L211 384 L200 396 L189 384 Z\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"4\"/><path d=\"M168 306 L200 396 L156 488\" fill=\"none\" stroke=\"${L}\" stroke-width=\"6\"/><path d=\"M232 306 L200 396 L244 488\" fill=\"none\" stroke=\"${L}\" stroke-width=\"6\"/>` : '') +\n        (roupa === 'jaqueta' ? `<path d=\"M200 316 L200 494\" stroke=\"${L}\" stroke-width=\"6\"/><path d=\"M160 308 L186 360 L200 316 L214 360 L240 308\" fill=\"none\" stroke=\"${L}\" stroke-width=\"6\"/><circle cx=\"214\" cy=\"410\" r=\"5\" fill=\"${det}\"/>` : '') +\n        (roupa === 'avental' ? `<path d=\"M150 360 L250 360 L262 500 L138 500 Z\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"6\"/><path d=\"M150 360 Q200 320 250 360\" fill=\"none\" stroke=\"${det}\" stroke-width=\"8\"/><path d=\"M190 330 L200 342 L210 330 L200 320Z\" fill=\"${L}\"/>` : '');\n    const cracha = ac === 'cracha' ? `<path d=\"M170 316 L200 400 L230 316\" fill=\"none\" stroke=\"${det}\" stroke-width=\"6\"/><rect x=\"182\" y=\"398\" width=\"36\" height=\"48\" rx=\"5\" fill=\"#fff\" stroke=\"${L}\" stroke-width=\"5\"/><rect x=\"188\" y=\"406\" width=\"24\" height=\"10\" fill=\"${det}\"/>` : '';\n    const naMao = ac === 'camera' ? `<g transform=\"translate(296 450)\"><rect x=\"-34\" y=\"-26\" width=\"68\" height=\"44\" rx=\"8\" fill=\"#222\" stroke=\"${L}\" stroke-width=\"6\"/><circle cx=\"6\" cy=\"-4\" r=\"15\" fill=\"#4aa8e8\" stroke=\"${L}\" stroke-width=\"5\"/><rect x=\"-26\" y=\"-36\" width=\"20\" height=\"12\" rx=\"3\" fill=\"${det}\" stroke=\"${L}\" stroke-width=\"4\"/></g>`\n      : ac === 'microfone' ? `<g transform=\"translate(300 440) rotate(-28)\"><rect x=\"-8\" y=\"-6\" width=\"16\" height=\"70\" rx=\"6\" fill=\"#222\" stroke=\"${L}\" stroke-width=\"5\"/><circle cx=\"0\" cy=\"-14\" r=\"20\" fill=\"#9aa3ad\" stroke=\"${L}\" stroke-width=\"6\"/></g>` : '';\n    const pernas = roupa === 'vestido'\n      ? `<path d=\"M172 540 L168 590\" stroke=\"${L}\" stroke-width=\"30\" stroke-linecap=\"round\"/><path d=\"M172 540 L168 590\" stroke=\"${c.pele}\" stroke-width=\"18\" stroke-linecap=\"round\"/><path d=\"M228 540 L232 590\" stroke=\"${L}\" stroke-width=\"30\" stroke-linecap=\"round\"/><path d=\"M228 540 L232 590\" stroke=\"${c.pele}\" stroke-width=\"18\" stroke-linecap=\"round\"/>`\n      : `<path d=\"M172 470 L166 590\" stroke=\"${L}\" stroke-width=\"44\" stroke-linecap=\"round\"/><path d=\"M172 470 L166 590\" stroke=\"${c.calca}\" stroke-width=\"30\" stroke-linecap=\"round\"/><path d=\"M228 470 L234 590\" stroke=\"${L}\" stroke-width=\"44\" stroke-linecap=\"round\"/><path d=\"M228 470 L234 590\" stroke=\"${c.calca}\" stroke-width=\"30\" stroke-linecap=\"round\"/>`;\n    corpo = `\n      ${veuAtras}\n      <g data-p=\"pernas\">${pernas}\n        <ellipse cx=\"158\" cy=\"604\" rx=\"40\" ry=\"18\" fill=\"${c.sapato}\" stroke=\"${L}\" stroke-width=\"6\"/><ellipse cx=\"242\" cy=\"604\" rx=\"40\" ry=\"18\" fill=\"${c.sapato}\" stroke=\"${L}\" stroke-width=\"6\"/>\n      </g>\n      ${membro('bracoE', 140, 330, 104, 448, manga, c.pele)}\n      ${corpoRoupa}${cracha}\n      ${membro('bracoD', 260, 330, 296, 448, manga, c.pele, naMao)}\n      <g data-p=\"cabeca\" data-ox=\"200\" data-oy=\"300\">\n        ${atras}${orelhas}\n        <rect x=\"178\" y=\"270\" width=\"44\" height=\"46\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"6\"/>\n        <ellipse cx=\"200\" cy=\"198\" rx=\"98\" ry=\"108\" fill=\"${c.pele}\" stroke=\"${L}\" stroke-width=\"8\"/>\n        ${barba}\n        ${bicho ? '' : `<circle cx=\"140\" cy=\"236\" r=\"16\" fill=\"#ff7a7a\" opacity=\".35\"/><circle cx=\"260\" cy=\"236\" r=\"16\" fill=\"#ff7a7a\" opacity=\".35\"/>`}\n        ${olho(162, 196, 20, 10)}${olho(238, 196, 20, 10)}\n        <rect data-p=\"palpebra\" data-h=\"48\" x=\"138\" y=\"170\" width=\"48\" height=\"0\" fill=\"${c.pele}\"/>\n        <rect data-p=\"palpebra\" data-h=\"48\" x=\"214\" y=\"170\" width=\"48\" height=\"0\" fill=\"${c.pele}\"/>\n        <path data-p=\"sobrancelha\" data-oy=\"160\" d=\"M140 164 Q162 150 184 162\" stroke=\"${L}\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/>\n        <path data-p=\"sobrancelha\" data-oy=\"160\" d=\"M216 162 Q238 150 260 164\" stroke=\"${L}\" stroke-width=\"8\" fill=\"none\" stroke-linecap=\"round\"/>\n        ${focinho}\n        <path data-p=\"boca\" data-cx=\"200\" data-cy=\"${bicho ? 270 : 258}\" data-w=\"${bicho ? 40 : 52}\" d=\"${sorriso(200, bicho ? 270 : 258, bicho ? 40 : 52)}\" fill=\"#6e1b23\" stroke=\"${L}\" stroke-width=\"7\" stroke-linejoin=\"round\"/>\n        ${oculos}${topo}${bone}${headset}${veuTopo}\n      </g>`;\n  } else {\n    // c\u00e2mera BW (be) e rob\u00f4: a cabe\u00e7a \u00e9 o pr\u00f3prio corpo\n    const robo = base.desenho === 'robo';\n    corpo = `\n      <g data-p=\"pernas\" stroke=\"${L}\" stroke-width=\"10\" stroke-linecap=\"round\">\n        <path d=\"M168 500 L160 596\" stroke=\"${robo ? c.pe : L}\" stroke-width=\"${robo ? 22 : 12}\"/><path d=\"M232 500 L240 596\" stroke=\"${robo ? c.pe : L}\" stroke-width=\"${robo ? 22 : 12}\"/>\n        <ellipse cx=\"152\" cy=\"604\" rx=\"42\" ry=\"18\" fill=\"${c.pe}\" stroke-width=\"7\"/><ellipse cx=\"248\" cy=\"604\" rx=\"42\" ry=\"18\" fill=\"${c.pe}\" stroke-width=\"7\"/>\n      </g>\n      ${membro('bracoE', 96, 360, 64, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}\n      ${membro('bracoD', 304, 360, 336, 470, robo ? c.pe : '#c9ced9', '#F5F1EA')}\n      <g data-p=\"cabeca\" data-ox=\"200\" data-oy=\"520\">\n        ${robo ? `<path d=\"M200 220 L200 168\" stroke=\"${L}\" stroke-width=\"8\"/><circle data-p=\"luzinha\" cx=\"200\" cy=\"160\" r=\"16\" fill=\"${c.detalhe}\" stroke=\"${L}\" stroke-width=\"6\"/>`\n          : `<rect x=\"122\" y=\"208\" width=\"104\" height=\"54\" rx=\"14\" fill=\"${c.detalhe}\" stroke=\"${L}\" stroke-width=\"8\"/>`}\n        <rect x=\"86\" y=\"236\" width=\"228\" height=\"282\" rx=\"${robo ? 70 : 46}\" fill=\"${c.corpo}\" stroke=\"${L}\" stroke-width=\"10\"/>\n        ${robo ? `<rect x=\"120\" y=\"300\" width=\"160\" height=\"110\" rx=\"40\" fill=\"#1a1f2b\" stroke=\"${L}\" stroke-width=\"6\"/>` : `<circle data-p=\"luzinha\" cx=\"276\" cy=\"276\" r=\"13\" fill=\"#ff3b3b\"/>`}\n        ${robo ? `<ellipse cx=\"166\" cy=\"352\" rx=\"24\" ry=\"26\" fill=\"${c.lente}\"/><g data-p=\"pupila\" data-cx=\"166\" data-cy=\"352\"><circle cx=\"166\" cy=\"352\" r=\"10\" fill=\"#08333a\"/></g>\n                  <ellipse cx=\"234\" cy=\"352\" rx=\"24\" ry=\"26\" fill=\"${c.lente}\"/><g data-p=\"pupila\" data-cx=\"234\" data-cy=\"352\"><circle cx=\"234\" cy=\"352\" r=\"10\" fill=\"#08333a\"/></g>\n                  <rect data-p=\"palpebra\" data-h=\"56\" x=\"138\" y=\"324\" width=\"124\" height=\"0\" fill=\"#1a1f2b\"/>`\n          : `<circle cx=\"160\" cy=\"372\" r=\"72\" fill=\"${L}\"/><circle cx=\"160\" cy=\"372\" r=\"58\" fill=\"${c.lente}\"/><circle cx=\"160\" cy=\"372\" r=\"58\" fill=\"url(#bwLente)\"/>\n             <g data-p=\"pupila\" data-cx=\"160\" data-cy=\"372\"><circle cx=\"160\" cy=\"372\" r=\"24\" fill=\"#04090f\"/><circle cx=\"146\" cy=\"356\" r=\"10\" fill=\"#fff\"/></g>\n             <circle cx=\"262\" cy=\"352\" r=\"30\" fill=\"${L}\"/><circle cx=\"262\" cy=\"352\" r=\"23\" fill=\"${c.lente}\"/>\n             <g data-p=\"pupila\" data-cx=\"262\" data-cy=\"352\"><circle cx=\"262\" cy=\"352\" r=\"10\" fill=\"#04090f\"/><circle cx=\"257\" cy=\"346\" r=\"4\" fill=\"#fff\"/></g>\n             <rect data-p=\"palpebra\" data-h=\"150\" x=\"86\" y=\"296\" width=\"228\" height=\"0\" fill=\"${c.corpo}\"/>`}\n        <path data-p=\"sobrancelha\" data-oy=\"0\" d=\"\" />\n        <path data-p=\"boca\" data-cx=\"${robo ? 200 : 228}\" data-cy=\"${robo ? 388 : 468}\" data-w=\"${robo ? 60 : 50}\" d=\"${sorriso(robo ? 200 : 228, robo ? 388 : 468, robo ? 60 : 50)}\" fill=\"${robo ? c.lente : '#7a1d1d'}\" stroke=\"${robo ? c.lente : '#F5F1EA'}\" stroke-width=\"7\" stroke-linejoin=\"round\"/>\n      </g>`;\n  }\n  return `<svg viewBox=\"0 0 400 640\" width=\"100%\" height=\"100%\" overflow=\"visible\" xmlns=\"http://www.w3.org/2000/svg\">\n    <defs><radialGradient id=\"bwLente\" cx=\"35%\" cy=\"30%\" r=\"75%\"><stop offset=\"0\" stop-color=\"#bfeaff\" stop-opacity=\".7\"/><stop offset=\".5\" stop-color=\"#1b5d86\" stop-opacity=\".1\"/><stop offset=\"1\" stop-color=\"#071824\" stop-opacity=\".8\"/></radialGradient></defs>\n    <ellipse data-p=\"sombra\" cx=\"200\" cy=\"618\" rx=\"130\" ry=\"20\" fill=\"#000\" opacity=\".45\"/>\n    <g data-p=\"tudo\">${corpo}</g></svg>`;\n}\n\n/** Anima o personagem dentro de `raiz` no tempo t. r = {t0, t1, acao, entrada, falas:[[ini,fim]], olhar, semente}. */\nfunction animarPersonagem(raiz, r, t) {\n  if (!raiz) return;\n  if (r.foto) return animarRecorte(raiz, r, t);\n  if (!raiz.__p) {\n    const q = (s) => [...raiz.querySelectorAll(`[data-p=\"${s}\"]`)];\n    raiz.__p = { tudo: q('tudo')[0], sombra: q('sombra')[0], cabeca: q('cabeca')[0], bE: q('bracoE')[0], bD: q('bracoD')[0],\n      pup: q('pupila'), palp: q('palpebra'), sob: q('sobrancelha'), boca: q('boca')[0], luz: q('luzinha')[0] };\n  }\n  const P = raiz.__p, lt = t - r.t0, dur = r.t1 - r.t0, sd = r.semente || 0;\n  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));\n  const fx = (a, b) => cl((lt - a) / (b - a));\n  const eOut = (x) => 1 - (1 - x) ** 3;\n  const eBack = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };\n  const acao = r.acao || 'parado';\n\n  // entrada\n  let y = 0, x = 0, sq = 0;\n  if (r.entrada === 'pula') { const e = fx(0, 0.6); y = (1 - eBack(e)) * -720; sq = Math.sin(fx(0.38, 0.62) * Math.PI) * 0.13; }\n  else if (r.entrada === 'desliza') { x = (1 - eOut(fx(0, 0.55))) * (r.lado < 0 ? -520 : 520); }\n  else if (r.entrada === 'surge') { sq = -0.25 * (1 - eBack(fx(0, 0.45))); }\n  // respira\u00e7\u00e3o, pulinhos, susto\n  const resp = Math.sin(lt * 2.3 + sd) * 5;\n  if (acao === 'comemora') y += -Math.abs(Math.sin(lt * 6.5)) * 46 * fx(0.3, 0.5);\n  if (acao === 'surpresa') { const k = fx(0.2, 0.45); y += -Math.sin(k * Math.PI) * 60; sq += -Math.sin(k * Math.PI) * 0.08; }\n  const inc = acao === 'pensa' ? 7 * eOut(fx(0.2, 0.7)) : Math.sin(lt * 1.3 + sd) * 2.2;\n  P.tudo.setAttribute('transform', `translate(${x} ${y + resp}) translate(200 615) scale(${1 + sq} ${1 - sq}) translate(-200 -615)`);\n  if (P.sombra) { P.sombra.setAttribute('rx', 130 + Math.min(0, y) * 0.12); P.sombra.setAttribute('opacity', 0.45 * (r.entrada === 'pula' ? fx(0.1, 0.55) : 1)); }\n  if (P.cabeca) P.cabeca.setAttribute('transform', `rotate(${inc} ${P.cabeca.dataset.ox} ${P.cabeca.dataset.oy})`);\n\n  // bra\u00e7os (graus; negativo = sobe o bra\u00e7o direito)\n  let aD = Math.sin(lt * 2.3 + sd + 1) * 4, aE = -Math.sin(lt * 2.3 + sd) * 4;\n  if (acao === 'acena') { const on = fx(0.25, 0.5) * (1 - fx(Math.max(0.6, dur - 0.5), Math.max(0.9, dur - 0.2))); aD += (-122 + Math.sin(lt * 11) * 24) * on; }\n  if (acao === 'aponta') aD += -78 * eOut(fx(0.2, 0.5));\n  if (acao === 'comemora') { const k = eOut(fx(0.15, 0.4)); aD += (-150 + Math.sin(lt * 13) * 10) * k; aE += (150 - Math.sin(lt * 13) * 10) * k; }\n  if (acao === 'pensa') aE += -145 * eOut(fx(0.2, 0.6));   // m\u00e3o no queixo\n  if (acao === 'surpresa') { const k = eOut(fx(0.15, 0.4)); aD += -60 * k; aE += 60 * k; }\n  if (acao === 'fala') aD += (-28 + Math.sin(lt * 4) * 14) * fx(0.2, 0.5);\n  const gira = (g, a) => g && g.setAttribute('transform', `rotate(${a} ${g.dataset.ox} ${g.dataset.oy})`);\n  gira(P.bD, aD); gira(P.bE, aE);\n\n  // olhos: piscadas em tempos fixos pela semente; olhar para o lado de quem fala\n  let pis = 0;\n  for (let k = 0; k < 8; k++) { const tp = 1.1 + k * 2.6 + ((sd * 7 + k * 3) % 10) / 10; const q = cl((lt - tp) / 0.16); pis = Math.max(pis, Math.sin(q * Math.PI)); }\n  if (acao === 'surpresa') pis = 0;\n  P.palp.forEach((p) => p.setAttribute('height', pis * Number(p.dataset.h)));\n  const ox = acao === 'pensa' ? 6 : (r.olhar || 0) * 9 + Math.sin(lt * 0.8 + sd) * 3;\n  const oy = acao === 'pensa' || acao === 'comemora' ? -8 : 0;\n  const esc = acao === 'surpresa' ? 0.72 + 0.28 * (1 - fx(0.15, 0.35)) : 1;\n  P.pup.forEach((p) => p.setAttribute('transform', `translate(${ox} ${oy}) translate(${p.dataset.cx} ${p.dataset.cy}) scale(${esc}) translate(${-p.dataset.cx} ${-p.dataset.cy})`));\n  const sob = acao === 'surpresa' ? -14 : acao === 'pensa' ? -6 : 0;\n  P.sob.forEach((s, i) => s.getAttribute('d') && s.setAttribute('transform', `translate(0 ${sob}) rotate(${acao === 'pensa' ? (i ? -8 : 0) : 0} 200 160)`));\n\n  // boca: fala = abre/fecha no ritmo de s\u00edlabas; sorriso, \"O\" de surpresa\n  if (P.boca) {\n    const cx = +P.boca.dataset.cx, cy = +P.boca.dataset.cy, w = +P.boca.dataset.w;\n    const falando = (r.falas || []).some(([a, b]) => t >= a && t < b - 0.12) || (acao === 'fala' && lt > 0.3 && lt < dur - 0.2 && !(r.falas || []).length);\n    let d;\n    if (falando) { const ab = (0.35 + 0.65 * Math.abs(Math.sin(lt * 12.5 + sd))) * w * 0.62; d = `M${cx - w / 2} ${cy} Q${cx} ${cy - 6} ${cx + w / 2} ${cy} Q${cx} ${cy + ab * 1.6} ${cx - w / 2} ${cy}Z`; }\n    else if (acao === 'surpresa') { const rr = w * 0.26; d = `M${cx - rr} ${cy + 6} a${rr} ${rr * 1.25} 0 1 0 ${rr * 2} 0 a${rr} ${rr * 1.25} 0 1 0 ${-rr * 2} 0Z`; }\n    else if (acao === 'pensa') d = `M${cx - w * 0.3} ${cy + 6} Q${cx} ${cy + 2} ${cx + w * 0.32} ${cy + 10} Q${cx} ${cy + 10} ${cx - w * 0.3} ${cy + 6}Z`;\n    else { const s = acao === 'comemora' ? 0.75 : 0.42; d = `M${cx - w / 2} ${cy} Q${cx} ${cy + w * s} ${cx + w / 2} ${cy} Q${cx} ${cy + w * s * 0.35} ${cx - w / 2} ${cy}Z`; }\n    P.boca.setAttribute('d', d);\n  }\n  if (P.luz) P.luz.setAttribute('opacity', Math.floor(lt * 2) % 2 ? 0.25 : 1);\n}\n\n/** Recorte animado (foto/PNG do usu\u00e1rio): a pe\u00e7a inteira se mexe \u2014 entra, respira, quica ao falar, acena balan\u00e7ando,\n *  comemora pulando, pensa inclinando, se assusta dando um pulo. S\u00f3 depende de t (mesmo t = mesma imagem). */\nfunction animarRecorte(raiz, r, t) {\n  if (!raiz.__p) raiz.__p = { corpo: raiz.querySelector('.foto-corpo'), sombra: raiz.querySelector('.foto-sombra') };\n  const P = raiz.__p; if (!P.corpo) return;\n  const lt = t - r.t0, dur = r.t1 - r.t0, sd = r.semente || 0, acao = r.acao || 'parado';\n  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));\n  const fx = (a, b) => cl((lt - a) / (b - a));\n  const eOut = (x) => 1 - (1 - x) ** 3;\n  const eBack = (x) => { const c = 1.70158; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };\n  const h = raiz.offsetHeight || 600, k = h / 640;           // valores pensados para 640 px de altura\n  let y = 0, x = 0, sx = 1, sy = 1, rot = 0, op = 1;\n  if (r.entrada === 'pula') { y = (1 - eBack(fx(0, 0.6))) * -700 * k; const q = Math.sin(fx(0.38, 0.62) * Math.PI) * 0.12; sx += q; sy -= q; }\n  else if (r.entrada === 'desliza') x = (1 - eOut(fx(0, 0.55))) * (r.lado < 0 ? -1 : 1) * 700 * k;\n  else if (r.entrada === 'surge') { const e = eBack(fx(0, 0.45)); sx *= 0.4 + 0.6 * e; sy *= 0.4 + 0.6 * e; op = cl(fx(0, 0.2)); }\n  sy *= 1 + Math.sin(lt * 2.3 + sd) * 0.012;                 // respira\u00e7\u00e3o\n  const falando = (r.falas || []).some(([a, b]) => t >= a && t < b - 0.12) || (acao === 'fala' && lt > 0.3 && lt < dur - 0.2 && !(r.falas || []).length);\n  if (falando) { y -= Math.abs(Math.sin(lt * 12.5 + sd)) * 9 * k; rot += Math.sin(lt * 5.5 + sd) * 1.8; }\n  if (acao === 'acena') rot += Math.sin(lt * 9) * 6 * fx(0.25, 0.45);\n  if (acao === 'aponta') rot += (r.olhar || 1) * 7 * eOut(fx(0.2, 0.5));\n  if (acao === 'comemora') { y -= Math.abs(Math.sin(lt * 6.5)) * 50 * k * fx(0.2, 0.4); rot += Math.sin(lt * 13) * 4; }\n  if (acao === 'pensa') { rot += -5 * eOut(fx(0.2, 0.7)) + Math.sin(lt * 1.4) * 1.5; }\n  if (acao === 'surpresa') { const q = fx(0.15, 0.5); y -= Math.sin(q * Math.PI) * 70 * k; const p = Math.sin(q * Math.PI) * 0.1; sx += p; sy += p; }\n  if (acao === 'parado') rot += Math.sin(lt * 1.3 + sd) * 1.2;\n  if (r.espelhar) sx = -sx;\n  P.corpo.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${sx}, ${sy})`;\n  P.corpo.style.opacity = op;\n  if (P.sombra) { P.sombra.style.transform = `translateX(${x}px) scale(${1 + Math.min(0, y) / (500 * k)})`; P.sombra.style.opacity = String(0.45 * op * (r.entrada === 'pula' ? fx(0.1, 0.55) : 1)); }\n}\n";

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

/* ---- motions e gráficos (17/11) ---- */
.lt{position:absolute!important;left:${W * 0.06}px;bottom:${base + 30 * u}px;display:grid;grid-template-columns:${12 * u}px auto;grid-template-rows:auto auto;column-gap:${22 * u}px;align-items:center;text-align:left;
  background:linear-gradient(90deg,rgba(0,0,0,.78),rgba(0,0,0,.45));padding:${22 * u}px ${36 * u}px ${22 * u}px ${22 * u}px;border-radius:${10 * u}px;max-width:88%}
.lt-barra{grid-row:1/3;width:${12 * u}px;height:100%;background:var(--destaque);border-radius:${6 * u}px;transform-origin:50% 100%}
.lt-nome{font-family:var(--ft);font-size:${70 * u}px;line-height:1.05;${e.caixaAlta ? 'text-transform:uppercase;' : ''}font-weight:${e.pesoTitulo}}
.lt-cargo{font-size:${40 * u}px;color:var(--destaque);font-weight:700;letter-spacing:.04em}
.logo-box{display:grid;place-items:center;max-width:78%}
.logo-img{max-width:${W * 0.7}px;max-height:${H * 0.3}px;object-fit:contain;filter:drop-shadow(0 ${10 * u}px ${30 * u}px rgba(0,0,0,.5))}
.logo-txt{font-family:var(--ft);font-size:${150 * u}px;line-height:1;${e.caixaAlta ? 'text-transform:uppercase;' : ''}font-weight:${e.pesoTitulo};color:var(--texto);letter-spacing:.01em;line-height:1.05}
.logo-raio{position:absolute!important;inset:0;z-index:4!important;pointer-events:none;background:linear-gradient(100deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);mix-blend-mode:overlay}
.logo-slogan{text-transform:uppercase;font-weight:700}
.cg-num{position:absolute!important;left:0;right:0;top:50%;margin-top:${-170 * u}px;font-family:var(--ft);font-size:${340 * u}px;line-height:1;color:var(--destaque);font-weight:${e.pesoTitulo};${brilho}opacity:0}
.cg-anel{position:absolute!important;left:50%;top:50%;width:${520 * u}px;height:${520 * u}px;margin:${-260 * u}px 0 0 ${-260 * u}px;border-radius:50%;--p:0;
  background:conic-gradient(var(--destaque) calc(var(--p) * 360deg),rgba(255,255,255,.08) 0);-webkit-mask:radial-gradient(closest-side,transparent 88%,#000 89%);mask:radial-gradient(closest-side,transparent 88%,#000 89%)}
.cg-txt{position:absolute!important;left:${W * 0.075}px;right:${W * 0.075}px;top:42%}
.gr-barras{display:flex;flex-direction:column;gap:${26 * u}px;width:100%}
.gr-linha{display:grid;grid-template-columns:minmax(0,${260 * u}px) minmax(0,1fr) ${170 * u}px;gap:${18 * u}px;align-items:center;text-align:left}
.gr-rot{font-size:${42 * u}px;font-weight:700;line-height:1.1}
.gr-trilho{height:${54 * u}px;border-radius:${27 * u}px;background:rgba(255,255,255,.08);overflow:hidden}
.gr-barra{display:block;height:100%;--p:0;width:calc(var(--p) * 100%);background:var(--suave);border-radius:inherit}
.gr-barra.prim{background:var(--destaque)}
.gr-val{font-family:var(--ft);font-size:${56 * u}px;color:var(--texto);text-align:right;font-variant-numeric:tabular-nums}
.gr-val small{font-size:.5em}
.gr-pizza{width:${560 * u}px;height:${560 * u}px;--p:0}.gr-rosca{width:100%;height:100%}
.gr-leg{list-style:none;display:flex;flex-direction:column;gap:${14 * u}px;font-size:${40 * u}px;text-align:left}
.gr-leg i{display:inline-block;width:${28 * u}px;height:${28 * u}px;border-radius:50%;margin-right:${14 * u}px;vertical-align:middle}
.gr-leg b{color:var(--destaque);margin-left:${10 * u}px}
.tl{position:relative;width:100%;display:flex;flex-direction:column;gap:${40 * u}px;padding-left:${70 * u}px;text-align:left}
.tl-reta{position:absolute;left:${24 * u}px;top:${10 * u}px;width:${8 * u}px;--p:0;height:calc(var(--p) * 100%);background:var(--destaque);border-radius:${4 * u}px}
.tl-item{position:relative;display:flex;flex-direction:column;gap:${4 * u}px}
.tl-item i{position:absolute;left:${-60 * u}px;top:${8 * u}px;width:${36 * u}px;height:${36 * u}px;border-radius:50%;background:var(--fundo);border:${8 * u}px solid var(--destaque)}
.tl-item b{font-family:var(--ft);font-size:${52 * u}px;color:var(--destaque);line-height:1}
.tl-item span{font-size:${46 * u}px;font-weight:600;line-height:1.2}
.ck{list-style:none;display:flex;flex-direction:column;gap:${30 * u}px;width:100%;text-align:left}
.ck-item{display:flex;align-items:center;gap:${28 * u}px}
.ck-box{flex:none;width:${80 * u}px;height:${80 * u}px;border-radius:${18 * u}px;border:${6 * u}px solid var(--destaque);display:grid;place-items:center}
.ck-v{font-size:${60 * u}px;color:var(--destaque);font-weight:900;line-height:1}
.ck-txt{font-size:${54 * u}px;font-weight:700;line-height:1.15;--p:0;opacity:calc(1 - var(--p) * .35)}
.rk{position:absolute!important;left:${W * 0.07}px;right:${W * 0.07}px;top:40%;display:flex;flex-direction:column;align-items:center;gap:${16 * u}px;opacity:0}
.rk b{font-family:var(--ft);font-size:${260 * u}px;line-height:.9;color:var(--destaque);${brilho}}
.rk span{font-size:${70 * u}px;font-weight:800;line-height:1.1}
.rk1 b{font-size:${320 * u}px}
.rk-tit{position:absolute!important;top:${topo + 20 * u}px;left:${W * 0.075}px;right:${W * 0.075}px}
.ad{position:absolute!important;inset:0;z-index:1!important;overflow:hidden}
.ad-camada{position:absolute;inset:0;overflow:hidden;background:#222;display:grid;place-items:center}
.ad-depois{--p:0;clip-path:inset(0 0 0 calc((1 - var(--p)) * 100%));background:#333}
.ad-vazio{font-family:var(--ft);font-size:${120 * u}px;color:rgba(255,255,255,.25)}
.ad-linha{position:absolute;top:0;bottom:0;width:${8 * u}px;margin-left:${-4 * u}px;--p:0;left:calc((1 - var(--p)) * 100%);background:#fff;box-shadow:0 0 ${20 * u}px rgba(0,0,0,.6)}
.ad-tag{position:absolute;top:${topo + 30 * u}px;padding:${8 * u}px ${22 * u}px;border-radius:999px;font-size:${34 * u}px;font-weight:900;letter-spacing:.08em;background:rgba(0,0,0,.7)}
.ad-tag.a{left:${W * 0.06}px}.ad-tag.b{right:${W * 0.06}px;background:var(--destaque);color:var(--fundo)}
.ad-txt{position:absolute!important;left:${W * 0.075}px;right:${W * 0.075}px;bottom:${base}px;text-shadow:0 ${4 * u}px ${20 * u}px rgba(0,0,0,.8)}
.dp-estrelas{display:flex;gap:${14 * u}px;font-size:${100 * u}px;line-height:1}
.dp-estrelas i{font-style:normal;color:rgba(255,255,255,.18)}.dp-estrelas i.on{color:#ffc93c;text-shadow:0 0 ${20 * u}px rgba(255,201,60,.6)}
.dp-txt{font-size:${74 * u}px}
.mapa{position:absolute!important;inset:-20%;z-index:0!important;opacity:.5;
  background:linear-gradient(transparent ${46 * u}px,rgba(255,255,255,.06) 0) 0 0/${48 * u}px ${48 * u}px,linear-gradient(90deg,transparent ${46 * u}px,rgba(255,255,255,.06) 0) 0 0/${48 * u}px ${48 * u}px,
  linear-gradient(30deg,transparent 48%,color-mix(in srgb,var(--destaque) 35%,transparent) 49% 51%,transparent 52%),linear-gradient(-60deg,transparent 46%,rgba(255,255,255,.12) 47% 49%,transparent 50%)}
.pino{width:${120 * u}px;height:${160 * u}px;margin-bottom:${10 * u}px}
.pino i{display:block;width:${120 * u}px;height:${120 * u}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--destaque);box-shadow:inset 0 0 0 ${30 * u}px var(--destaque),inset 0 0 0 ${60 * u}px var(--fundo)}
.pino-onda{position:absolute!important;left:50%;top:50%;width:${140 * u}px;height:${50 * u}px;margin:${-120 * u}px 0 0 ${-70 * u}px;border-radius:50%;border:${5 * u}px solid var(--destaque);opacity:0}
.of-selo{background:#ff3b3b;color:#fff;font-weight:900;font-size:${44 * u}px;letter-spacing:.08em;padding:${16 * u}px ${36 * u}px;border-radius:${12 * u}px;text-transform:uppercase}
.of-preco{font-size:${230 * u}px}
.av-selo{display:inline-flex;align-items:center;gap:${16 * u}px;background:#e11d2e;color:#fff;font-weight:900;font-size:${46 * u}px;letter-spacing:.12em;padding:${14 * u}px ${34 * u}px;border-radius:${12 * u}px}
.av-selo i{width:${24 * u}px;height:${24 * u}px;border-radius:50%;background:#fff;animation:none}
.cel{width:${560 * u}px;height:${1080 * u}px;border-radius:${80 * u}px;background:#0b0b0d;border:${14 * u}px solid #2a2d35;box-shadow:0 ${40 * u}px ${80 * u}px rgba(0,0,0,.6),inset 0 0 0 ${3 * u}px #444;position:relative;padding:${18 * u}px}
.cel-tela{position:relative;width:100%;height:100%;border-radius:${62 * u}px;overflow:hidden;background:#1b1e26;display:grid;place-items:center;color:rgba(255,255,255,.35);font-size:${34 * u}px}
.cel-notch{position:absolute;top:${30 * u}px;left:50%;width:${160 * u}px;height:${40 * u}px;margin-left:${-80 * u}px;border-radius:${20 * u}px;background:#000}
.dv{position:absolute!important;inset:0;z-index:1!important;display:flex;flex-direction:column;gap:${8 * u}px;background:#000}
.dv-parte{position:relative;flex:1;overflow:hidden;background:#1b1e26;display:grid;place-items:center}
.dv-tag{position:absolute!important;z-index:5!important;padding:${10 * u}px ${26 * u}px;border-radius:${10 * u}px;font-size:${40 * u}px;font-weight:900;background:rgba(0,0,0,.72)}
.dv-tag.a{top:${topo + 20 * u}px;left:${W * 0.06}px}.dv-tag.b{top:calc(50% + ${30 * u}px);left:${W * 0.06}px;background:var(--destaque);color:var(--fundo)}
.tipo-nome,.tipo-aovivo.com-midia{justify-content:flex-end}
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
.ator.foto{aspect-ratio:auto;width:${W * (p.vertical ? 0.8 : 0.42)}px;margin-left:${-W * (p.vertical ? 0.4 : 0.21)}px}
.ator.foto.duplo{width:${W * (p.vertical ? 0.5 : 0.3)}px;margin-left:${-W * (p.vertical ? 0.25 : 0.15)}px}
.foto-corpo{position:absolute;inset:0;transform-origin:50% 100%;will-change:transform,opacity}
.foto-img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 ${10 * u}px ${14 * u}px rgba(0,0,0,.45))}
.ator.contorno .foto-img{filter:drop-shadow(${4 * u}px 0 0 #fff) drop-shadow(-${4 * u}px 0 0 #fff) drop-shadow(0 ${4 * u}px 0 #fff) drop-shadow(0 -${4 * u}px 0 #fff) drop-shadow(0 ${12 * u}px ${14 * u}px rgba(0,0,0,.45))}
.foto-sombra{position:absolute;left:22%;right:22%;bottom:-${1.5 * u}%;height:${26 * u}px;border-radius:50%;background:rgba(0,0,0,.5);filter:blur(${8 * u}px);will-change:transform,opacity}
.balao{position:absolute!important;z-index:5!important;top:${p.vertical ? H * 0.2 : H * 0.12}px;left:50%;width:${W * (p.vertical ? 0.78 : 0.42)}px;margin-left:${-W * (p.vertical ? 0.39 : 0.21)}px;
  background:#fff;color:#111;border:${6 * u}px solid #0b0d12;border-radius:${40 * u}px;padding:${26 * u}px ${34 * u}px;font-family:var(--fx);font-weight:800;
  font-size:${54 * u}px;line-height:1.18;text-align:center;box-shadow:0 ${14 * u}px 0 rgba(0,0,0,.35);opacity:0}
.balao::after{content:'';position:absolute;bottom:${-34 * u}px;left:50%;margin-left:${-22 * u}px;border:${22 * u}px solid transparent;border-top:${30 * u}px solid #0b0d12}
.balao.duplo{width:${W * (p.vertical ? 0.56 : 0.34)}px;font-size:${48 * u}px}
.balao.duplo.lado-1{left:${p.vertical ? 40 : 38}%;margin-left:${-W * (p.vertical ? 0.28 : 0.17)}px}.balao.duplo.lado1{left:${p.vertical ? 60 : 62}%;margin-left:${-W * (p.vertical ? 0.28 : 0.17)}px}
.balao.duplo.lado-1::after{left:${p.vertical ? 27 : 30}%}.balao.duplo.lado1::after{left:${p.vertical ? 73 : 70}%}
/* ---- reels que explicam (22/11) ---- */
.tm{width:100%;background:rgba(12,14,20,.92);border:${2 * u}px solid rgba(255,255,255,.14);border-radius:${26 * u}px;overflow:hidden;text-align:left;box-shadow:0 ${30 * u}px ${70 * u}px rgba(0,0,0,.55)}
.tm-barra{display:flex;align-items:center;gap:${12 * u}px;padding:${18 * u}px ${24 * u}px;background:rgba(255,255,255,.06);font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:${28 * u}px;color:#8b93a7}
.tm-barra i{width:${20 * u}px;height:${20 * u}px;border-radius:50%;background:#ff5f57}.tm-barra i:nth-child(2){background:#febc2e}.tm-barra i:nth-child(3){background:#28c840}
.tm-barra span{margin-left:${14 * u}px}
.tm-linha,.tm-out{font-family:ui-monospace,'Cascadia Mono',Consolas,monospace;font-size:${42 * u}px;line-height:1.35;padding:${8 * u}px ${30 * u}px;color:#e9edf5;white-space:nowrap}
.tm-linha{padding-top:${26 * u}px}.tm-out:last-child{padding-bottom:${30 * u}px}
.tm-linha>b{color:var(--destaque);margin-right:${18 * u}px}
.tm-cmd{display:inline-block;overflow:hidden;white-space:nowrap;vertical-align:bottom;--p:0;max-width:calc(var(--p) * var(--n) * 1ch + .02ch)}
.tm-cursor{display:inline-block;width:.6ch;height:1.1em;vertical-align:text-bottom;background:var(--destaque);margin-left:${4 * u}px}
.tm-out{color:#aab3c5;font-size:${36 * u}px;white-space:normal}.tm-out b{color:#28c840}
.tipo-passo{background:radial-gradient(70% 45% at 50% 52%,color-mix(in srgb,var(--destaque) 38%,transparent),transparent 75%)}
.ps-num{z-index:3!important;text-shadow:0 0 ${30 * u}px #000;font-family:var(--ft);font-size:${64 * u}px;color:var(--destaque);line-height:1}.ps-num small{font-size:.55em;color:var(--suave)}
.ps-feixe{position:absolute!important;z-index:1!important;left:50%;top:0;width:${140 * u}px;margin-left:${-70 * u}px;height:52%;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--destaque) 70%,#fff) 85%,transparent);filter:blur(${16 * u}px);opacity:.7;transform-origin:50% 0}
.ps-icone{width:${330 * u}px;height:${330 * u}px;border-radius:${80 * u}px;display:grid;place-items:center;font-size:${180 * u}px;line-height:1;
  background:linear-gradient(160deg,color-mix(in srgb,var(--destaque) 55%,#111),#0c0d12);border:${4 * u}px solid color-mix(in srgb,var(--destaque) 70%,#fff);
  box-shadow:0 0 ${60 * u}px color-mix(in srgb,var(--destaque) 70%,transparent),0 0 ${160 * u}px color-mix(in srgb,var(--destaque) 40%,transparent)}
.ps-sub{color:var(--texto);font-weight:700}
.ps-tit{z-index:3!important;text-shadow:0 ${4 * u}px ${30 * u}px #000}
.tipo-passo .ps-icone{z-index:3!important}
.pn{width:100%;background:rgba(18,20,28,.92);border:${2 * u}px solid rgba(255,255,255,.12);border-radius:${34 * u}px;padding:${40 * u}px ${44 * u}px;text-align:left;box-shadow:0 ${30 * u}px ${70 * u}px rgba(0,0,0,.5);position:relative}
.pn-rot{font-size:${34 * u}px;color:#9aa3b5;font-weight:700;letter-spacing:.03em}
.pn-val{font-family:var(--ft);font-size:${170 * u}px;line-height:1;color:#fff;font-variant-numeric:tabular-nums;margin-top:${10 * u}px}
.pn-val small{font-size:.4em;color:#9aa3b5}
.pn-var{position:absolute;top:${40 * u}px;right:${44 * u}px;background:color-mix(in srgb,#28c840 22%,transparent);color:#5fe07a;font-weight:900;font-size:${38 * u}px;padding:${8 * u}px ${20 * u}px;border-radius:999px}
.pn-graf{height:${300 * u}px;margin-top:${24 * u}px;--p:0}.pn-graf svg{width:100%;height:100%;overflow:visible}
.pn-traco{fill:none;stroke:var(--destaque);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--p))}
.pn-area{fill:var(--destaque);opacity:calc(var(--p) * .18)}
.md{position:relative;width:${720 * u}px;height:${720 * u}px}
.md-arco{position:absolute;inset:0;border-radius:50%;--p:0;background:conic-gradient(from -120deg,var(--destaque) calc(var(--p) * 240deg),rgba(255,255,255,.1) 0 240deg,transparent 0);
  -webkit-mask:radial-gradient(closest-side,transparent 80%,#000 81%);mask:radial-gradient(closest-side,transparent 80%,#000 81%);filter:drop-shadow(0 0 ${20 * u}px var(--destaque))}
.md-ponteiro{position:absolute;left:50%;bottom:50%;width:${14 * u}px;height:${300 * u}px;margin-left:${-7 * u}px;border-radius:${7 * u}px;background:#fff;transform-origin:50% 100%}
.md-val{position:absolute;left:0;right:0;top:62%;font-family:var(--ft);font-size:${130 * u}px;line-height:1;color:#fff;font-variant-numeric:tabular-nums}
.md-val small{font-size:.38em;color:var(--suave)}
.md-rot{position:absolute;left:0;right:0;top:82%;font-size:${40 * u}px;color:var(--suave);font-weight:700}
.tipo-catalogo{justify-content:flex-start}
.ct{width:100%;flex:1;display:grid;grid-template-columns:minmax(0,40%) minmax(0,60%);gap:${30 * u}px;align-items:center;min-height:0}
.ct-lista{list-style:none;display:flex;flex-direction:column;gap:${16 * u}px;text-align:left}
.ct-item{font-size:${38 * u}px;font-weight:800;line-height:1.15;display:flex;gap:${14 * u}px;align-items:baseline;opacity:.28}
.ct-item b{flex:none;color:var(--destaque);font-family:var(--ft);font-size:1.1em;min-width:1.3em}
.ct-cartoes{position:relative;height:${H * 0.5}px}
.ct-cartao{position:absolute;inset:0;border-radius:${36 * u}px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:${24 * u}px;padding:${30 * u}px;opacity:0;
  border:${3 * u}px solid rgba(255,255,255,.18);box-shadow:0 ${30 * u}px ${70 * u}px rgba(0,0,0,.55)}
.ct-cartao b{font-family:var(--ft);font-size:${66 * u}px;line-height:1.05;color:#fff;text-shadow:0 ${4 * u}px ${20 * u}px rgba(0,0,0,.5)}
.ct-ic{font-size:${200 * u}px;line-height:1}
.ct-cartao.c0{background:linear-gradient(160deg,#3b82f6,#0b1d4a)}.ct-cartao.c1{background:linear-gradient(160deg,#ec4899,#3b0a2a)}.ct-cartao.c2{background:linear-gradient(160deg,#f59e0b,#4a2a03)}
.ct-cartao.c3{background:linear-gradient(160deg,#10b981,#06392a)}.ct-cartao.c4{background:linear-gradient(160deg,#8b5cf6,#25124d)}.ct-cartao.c5{background:linear-gradient(160deg,#ef4444,#4a0d0d)}
.cm-tit{font-size:${96 * u}px}
.cm-pal{font-family:var(--ft);font-size:${170 * u}px;line-height:1;color:var(--fundo);background:var(--destaque);padding:${14 * u}px ${44 * u}px;border-radius:${20 * u}px;${brilho}}
.cm-caixa{display:flex;align-items:center;gap:${20 * u}px;width:92%;background:rgba(255,255,255,.95);color:#111;border-radius:999px;padding:${18 * u}px ${24 * u}px;font-size:${48 * u}px;font-weight:800;text-align:left}
.cm-av{flex:none;width:${70 * u}px;height:${70 * u}px;border-radius:50%;background:linear-gradient(135deg,var(--destaque),#7c3aed)}
.cm-txt{flex:1;font-family:var(--fx);max-width:calc(var(--p) * var(--n) * 1.1ch + .02ch)}
.cm-env{flex:none;color:var(--destaque);font-size:${54 * u}px}
.cm-resp{background:#1f2937;color:#fff;border-radius:${30 * u}px;padding:${22 * u}px ${34 * u}px;font-size:${42 * u}px;font-weight:700}
${e.enfaseItalica ? `.enf{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-weight:700;text-transform:none}` : ''}
${e.grade ? `#stage::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(rgba(255,255,255,.045) ${2 * u}px,transparent 0) 0 0/${90 * u}px ${90 * u}px,linear-gradient(90deg,rgba(255,255,255,.045) ${2 * u}px,transparent 0) 0 0/${90 * u}px ${90 * u}px;-webkit-mask:radial-gradient(80% 70% at 50% 45%,#000,transparent);mask:radial-gradient(80% 70% at 50% 45%,#000,transparent)}` : ''}
`;
}

function no(n, sabor) {
  if (n.tag === 'video' && sabor === 'hyperframes') return ''; // vídeos viram clips de topo no HyperFrames
  const attrs = [`id="${n.id}"`, n.classe ? `class="${n.classe}"` : '', n.estilo ? `style="${n.estilo}"` : ''];
  if (n.tag === 'video') attrs.push(`src="${n.src}"`, 'muted', 'playsinline', 'preload="auto"');
  if (n.tag === 'img') return `<img ${attrs.join(' ')} src="${n.src}" alt="">`;
  const filhos = (n.filhos || []).map((f) => no(f, sabor)).join('');
  return `<${n.tag} ${attrs.join(' ')}>${n.html ?? ''}${filhos}</${n.tag}>`;
}

function coletar(nos, acc = []) {
  for (const n of nos) {
    if (n.tweens?.length || n.inicio !== undefined || n.contador || n.tag === 'video' || n.rig) {
      acc.push({ id: n.id, tweens: n.tweens || [], inicio: n.inicio, fim: n.fim, contador: n.contador,
        video: n.tag === 'video', inicioNoArquivo: n.inicioNoArquivo, rig: n.rig, temP: (n.tweens || []).some((t) => 'p' in t.para) });
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
    if (e.tweens.length){ const c = estadoParaCss(estadoEm(e.tweens, t)); e.el.style.opacity=c.opacity; e.el.style.transform=c.transform; e.el.style.filter=c.filter; if(c.letterSpacing) e.el.style.letterSpacing=c.letterSpacing; if(e.temP) e.el.style.setProperty('--p', c.p); }
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
${sabor === 'hyperframes' ? '<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.1/dist/gsap.min.js"></script>' : ''}
<script>window.__PLANO = ${JSON.stringify(dados)}; window.__DUR = ${plano.duracao}; window.__W = ${plano.largura}; window.__H = ${plano.altura}; window.__FPS = ${plano.fps};</script>
<script>${RUNTIME(sabor)}</script>
</div></body></html>`;
}

// Validação barata ANTES do render (evita gastar tempo e tokens renderizando roteiro quebrado).
// Uso direto: node motor/validar.mjs projetos/<slug>/roteiro.json


const TIPOS = ['gancho', 'texto', 'midia', 'dado', 'lista', 'citacao', 'cta', 'personagem', 'nome', 'logo', 'contagem', 'grafico', 'linha', 'checklist', 'ranking', 'antesdepois', 'depoimento', 'local', 'oferta', 'aovivo', 'celular', 'dividida', 'terminal', 'passo', 'painel', 'medidor', 'catalogo', 'comenta'];
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
    if (c.tipo === 'terminal' && !c.comando) e.push(`${n}: terminal sem "comando"`);
    if (c.tipo === 'catalogo' && !(Array.isArray(c.itens) && c.itens.length >= 2)) e.push(`${n}: catálogo precisa de pelo menos 2 "itens"`);
    if ((c.tipo === 'painel' || c.tipo === 'medidor') && !isFinite(Number(c.valor))) e.push(`${n}: "valor" numérico obrigatório`);
    if ((c.tipo === 'painel' || c.tipo === 'medidor') && !c.fonte) e.push(`${n}: número sem "fonte" (escreva de onde ele vem, ex.: "dados próprios")`);
    if (['lista', 'grafico', 'linha', 'checklist', 'ranking'].includes(c.tipo) && !(Array.isArray(c.itens) && c.itens.length)) e.push(`${n}: "itens" obrigatório`);
    if (c.tipo === 'grafico') {
      if (!c.fonte) e.push(`${n}: gráfico precisa de "fonte" visível (ou "dados próprios")`);
      (c.itens || []).forEach((it) => { if (!/[:=–-]\s*[\d.,]+\s*$/.test(String(it))) e.push(`${n}: item do gráfico sem número — use "Rótulo: 12"`); });
    }
    if (c.tipo === 'nome' && !(c.titulo || c.texto)) e.push(`${n}: "titulo" (nome da pessoa) obrigatório`);
    if (c.tipo === 'oferta' && !(Number(c.valor) > 0)) e.push(`${n}: "valor" (preço) obrigatório`);
    if (c.tipo === 'depoimento' && !c.texto) e.push(`${n}: depoimento sem "texto" (a frase real do cliente)`);
    if (c.midia2 && proj && !(typeof existsSync === 'function' ? existsSync : () => true)(join(proj, c.midia2))) e.push(`${n}: mídia 2 não encontrada: ${c.midia2}`);
    if (c.tipo === 'personagem') {
      const el = Array.isArray(c.elenco) && !c.elenco.length && c.midia ? [] : c.elenco && c.elenco.length ? c.elenco : [{ personagem: c.personagem || 'be', acao: c.acao }];
      if (el.length > 2) e.push(`${n}: no máximo 2 personagens por cena`);
      el.forEach((a) => {
        if (a.personagem === 'foto') { if (!a.imagem) e.push(`${n}: personagem "foto" precisa de "imagem" (PNG do personagem)`); else if (proj && !(typeof existsSync === 'function' ? existsSync : () => true)(join(proj, a.imagem))) e.push(`${n}: imagem do personagem não encontrada: ${a.imagem}`); }
        else if (a.personagem === 'meu') { if (!a.look || typeof a.look !== 'object') e.push(`${n}: personagem "meu" precisa de "look" (montado no CRIAR PERSONAGEM)`); }
        else if (a.personagem && !PERSONAGENS[a.personagem]) e.push(`${n}: personagem "${a.personagem}" não existe (${Object.keys(PERSONAGENS).join(', ')})`);
        if (a.acao && !ACOES.includes(a.acao)) e.push(`${n}: ação "${a.acao}" inválida (${ACOES.join(', ')})`);
      });
      const fs = c.falas || (c.balao ? [{ texto: c.balao }] : []);
      const pw = fs.reduce((s2, f) => s2 + palavras(f.texto), 0) + palavras(c.texto);
      if (d && pw / d > 2.8) avisos.push(`${n}: ${pw} palavras de balão em ${d}s — aumente a duração (balão precisa de tempo para ler)`);
      fs.forEach((f) => { if (palavras(f.texto) > 14) avisos.push(`${n}: balão longo (${palavras(f.texto)} palavras) — divida em duas falas`); });
    }
    // leitura confortável: ~3,2 palavras/s de texto na tela
    const txt = [c.texto, c.titulo, c.subtitulo, c.rotulo, ...(c.itens || [])].filter(Boolean).join(' ');
    if (!['personagem', 'grafico', 'catalogo', 'terminal'].includes(c.tipo) && d && palavras(txt) / d > 3.2) avisos.push(`${n}: ${palavras(txt)} palavras em ${d}s — difícil de ler; aumente a duração ou corte texto`);
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
  estadoEm: estadoEm, legendaEm: legendaEm, PERSONAGENS: PERSONAGENS, ACOES: ACOES, svgPersonagem: svgPersonagem, sintetizarSons: sintetizarSons, misturar: misturar, wavDe: wavDe, TRILHAS: TRILHAS, MONTADOR: MONTADOR, animarPersonagem: animarPersonagem, versao: 6 };
})();
