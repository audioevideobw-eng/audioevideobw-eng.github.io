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
  gancho: 'zoom', texto: 'deslize', midia: 'corte', dado: 'zoom', lista: 'deslize', citacao: 'fade', cta: 'zoom',
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
      default:
        throw new Error(`cena ${i + 1}: tipo desconhecido "${c.tipo}"`);
    }

    // Transição de entrada da cena
    const tr = c.transicao || (i === 0 ? 'zoom' : TRANSICAO_PADRAO[c.tipo]);
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
        const oculta = cena.legenda === false || (cena.tipo === 'gancho' && cena.legenda !== true);
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
    if (n.tweens?.length || n.inicio !== undefined || n.contador || n.tag === 'video') {
      acc.push({ id: n.id, tweens: n.tweens || [], inicio: n.inicio, fim: n.fim, contador: n.contador,
        video: n.tag === 'video', inicioNoArquivo: n.inicioNoArquivo });
    }
    if (n.filhos) coletar(n.filhos, acc);
  }
  return acc;
}

const RUNTIME = (sabor) => `
${ANIM}
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
<script>window.__PLANO = ${JSON.stringify(dados)};</script>
<script>${RUNTIME(sabor)}</script>
</div></body></html>`;
}

// Validação barata ANTES do render (evita gastar tempo e tokens renderizando roteiro quebrado).
// Uso direto: node motor/validar.mjs projetos/<slug>/roteiro.json


const TIPOS = ['gancho', 'texto', 'midia', 'dado', 'lista', 'citacao', 'cta'];
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
    // leitura confortável: ~3,2 palavras/s de texto na tela
    const txt = [c.texto, c.titulo, c.subtitulo, c.rotulo, ...(c.itens || [])].filter(Boolean).join(' ');
    if (d && palavras(txt) / d > 3.2) avisos.push(`${n}: ${palavras(txt)} palavras em ${d}s — difícil de ler; aumente a duração ou corte texto`);
    if (c.fala && d && palavras(c.fala) / d > 3.6) avisos.push(`${n}: fala rápida demais (${palavras(c.fala)} palavras em ${d}s)`);
  });

  if (r.cenas[0].tipo !== 'gancho') avisos.push('a 1ª cena não é "gancho" — o vídeo perde força nos 3 primeiros segundos');
  else if (r.cenas[0].duracao > 3.5) avisos.push('gancho com mais de 3,5s — encurte para segurar a retenção');
  if (total > 90) avisos.push(`duração total ${total.toFixed(1)}s — acima de 90s fica fora do formato Reels`);
  if (r.cenas.some((c) => c.tipo === 'dado') && !(r.fontes || []).length) e.push('há dados no roteiro mas a lista "fontes" está vazia — rode a pesquisa validada');
  for (const f of r.fontes || []) if (!f.url || !f.afirmacao) e.push(`fonte incompleta: ${JSON.stringify(f)} (precisa de "afirmacao" e "url")`);

  const au = r.audio || {};
  for (const k of ['musica', 'narracao']) if (au[k] && proj && !(typeof existsSync === 'function' ? existsSync : () => true)(join(proj, au[k]))) e.push(`áudio não encontrado: ${au[k]}`);
  return e;
}

window.BWReelsMotor = { criarPlano: criarPlano, validarRoteiro: validarRoteiro, construirHtml: construirHtml, css: css, ESTILOS: ESTILOS, FORMATOS: FORMATOS,
  estadoEm: estadoEm, legendaEm: legendaEm, versao: 1 };
})();
