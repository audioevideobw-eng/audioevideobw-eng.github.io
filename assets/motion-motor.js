/* ESTÚDIO DE MOTION — motor (20/11/2026, Claude).
   Um projeto = itens da biblioteca (texto, cartão, chat, foto, antes/depois, lupa, contador…) sobre um fundo. Cada item tem:
   tempo (ini/fim), posição/escala/giro/opacidade (fixos ou por KEYFRAMES), efeito de ENTRADA, de SAÍDA e DURANTE (loop).
   Cada quadro depende SÓ do tempo t (seek), por isso o mesmo projeto sai igual na prévia, no vídeo feito no aparelho
   (BWReelsCelular) e no app BW do PC (motor/animar.mjs, com fundo normal, chroma key ou transparente).
   Este arquivo só desenha: não grava nada, não envia nada. Uma cópia idêntica vai no app BW (motor/motion-motor.js). */
(function () {
  "use strict";
  var VERSAO = 1;
  var cl = function (x, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, x)); };
  var prog = function (t, a, b) { return b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)); };
  var EASE = {
    linear: function (x) { return x; },
    suave: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    entra: function (x) { return x * x * x; },
    sai: function (x) { return 1 - Math.pow(1 - x, 3); },
    pulo: function (x) { var c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    elastico: function (x) { return x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1; },
    quique: function (x) { var n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; },
    degrau: function (x) { return x < 1 ? 0 : 1; }
  };
  var NOMES_EASE = { linear: "Linear", suave: "Suave", entra: "Acelera", sai: "Freia", pulo: "Pulo", elastico: "Elástico", quique: "Quique", degrau: "Corte seco" };

  /* ---------- EFEITOS de entrada (p: 0 = começando, 1 = no lugar). A saída usa o mesmo efeito ao contrário. ---------- */
  function o3(p) { return Math.min(1, p * 3); }
  var EFEITOS = {
    nenhum:   { nome: "Sem efeito", f: function () { return {}; } },
    aparecer: { nome: "Aparecer", f: function (p) { return { o: p }; } },
    subir:    { nome: "Subir", f: function (p) { var e = EASE.sai(p); return { dy: (1 - e) * 160, o: o3(p) }; } },
    descer:   { nome: "Descer", f: function (p) { var e = EASE.sai(p); return { dy: -(1 - e) * 160, o: o3(p) }; } },
    esquerda: { nome: "Vem da esquerda", f: function (p) { var e = EASE.sai(p); return { dx: -(1 - e) * 320, o: o3(p) }; } },
    direita:  { nome: "Vem da direita", f: function (p) { var e = EASE.sai(p); return { dx: (1 - e) * 320, o: o3(p) }; } },
    zoom:     { nome: "Zoom", f: function (p) { var e = EASE.sai(p); return { s: 0.5 + 0.5 * e, o: o3(p) }; } },
    pulo:     { nome: "Pulo", f: function (p) { return { s: 0.3 + 0.7 * EASE.pulo(p), o: o3(p) }; } },
    girar:    { nome: "Girando", f: function (p) { var e = EASE.sai(p); return { r: -140 * (1 - e), s: 0.55 + 0.45 * e, o: o3(p) }; } },
    desfocar: { nome: "Desfoque", f: function (p) { var e = EASE.sai(p); return { b: (1 - p) * 24, s: 1.15 - 0.15 * e, o: p }; } },
    elastico: { nome: "Elástico", f: function (p) { return { s: Math.max(0.01, EASE.elastico(p)), o: o3(p) }; } },
    flip:     { nome: "Virar (3D)", f: function (p) { var e = EASE.sai(p); return { ry: 90 * (1 - e), o: o3(p) }; } },
    quicar:   { nome: "Cai quicando", f: function (p) { return { dy: -(1 - EASE.quique(p)) * 640, o: Math.min(1, p * 5) }; } },
    tombar:   { nome: "Tombar (3D)", f: function (p) { var e = EASE.sai(p); return { rx: -85 * (1 - e), dy: -(1 - e) * 60, o: o3(p) }; } },
    deslizar: { nome: "Desliza de longe", f: function (p) { var e = EASE.suave(p); return { dx: (1 - e) * 1300 }; } },
    maquina:  { nome: "Máquina de escrever", soTexto: true, f: function (p) { return { o: p > 0 ? 1 : 0 }; } },
    palavras: { nome: "Palavra por palavra", soTexto: true, f: function () { return {}; } }
  };
  var LOOPS = {
    nenhum:  { nome: "Parado", f: function () { return {}; } },
    flutuar: { nome: "Flutuar", f: function (t, k) { return { dy: Math.sin(t * 2.1) * 14 * k }; } },
    pulsar:  { nome: "Pulsar", f: function (t, k) { return { s: 1 + 0.045 * k * Math.sin(t * 4.2) }; } },
    balancar:{ nome: "Balançar", f: function (t, k) { return { r: 4.5 * k * Math.sin(t * 2.6) }; } },
    girar:   { nome: "Girar sem parar", f: function (t, k) { return { r: t * 45 * k }; } },
    brilho:  { nome: "Piscar", f: function (t, k) { return { o: 1 - 0.3 * k * (0.5 + 0.5 * Math.sin(t * 5)) }; } },
    tremer:  { nome: "Tremer", f: function (t, k) { return { dx: Math.sin(t * 43) * 3.5 * k, dy: Math.cos(t * 37) * 3.5 * k }; } }
  };

  // valor de uma lista de keyframes [{t, v, e}] no tempo t (a curva de cada trecho é a do keyframe de chegada)
  function valorKeys(lista, t, padrao) {
    if (!lista || !lista.length) return padrao;
    if (t <= lista[0].t) return lista[0].v;
    for (var i = 1; i < lista.length; i++) {
      var a = lista[i - 1], b = lista[i];
      if (t <= b.t) { var f = (EASE[b.e] || EASE.suave)(prog(t, a.t, b.t)); return a.v + (b.v - a.v) * f; }
    }
    return lista[lista.length - 1].v;
  }
  // efeito próprio (criado pela pessoa ou pela IA): chaves por propriedade, tempo p de 0 a 1
  function efeitoProprio(ef, p) {
    var r = {}, ch = ef.chaves || {};
    Object.keys(ch).forEach(function (k) { var l = (ch[k] || []).map(function (q) { return { t: +q[0], v: +q[1], e: q[2] || "suave" }; }); r[k] = valorKeys(l, p, k === "s" || k === "o" ? 1 : 0); });
    return r;
  }
  function soma(a, b) {
    return { dx: (a.dx || 0) + (b.dx || 0), dy: (a.dy || 0) + (b.dy || 0), r: (a.r || 0) + (b.r || 0), rx: (a.rx || 0) + (b.rx || 0), ry: (a.ry || 0) + (b.ry || 0),
      b: (a.b || 0) + (b.b || 0), s: (a.s === undefined ? 1 : a.s) * (b.s === undefined ? 1 : b.s), o: (a.o === undefined ? 1 : a.o) * (b.o === undefined ? 1 : b.o) };
  }

  /* ---------- BIBLIOTECA DE ITENS ---------- */
  var FONTES = {
    titulo: "Anton,'Bebas Neue',Impact,'Inter Display','Arial Black',sans-serif",
    texto: "Inter,'Segoe UI',Arial,sans-serif",
    mono: "'JetBrains Mono',Consolas,monospace",
    mao: "Caveat,'Segoe Print','Comic Sans MS',cursive",
    serif: "'Playfair Display',Georgia,serif"
  };
  var LINK_FONTES = "https://fonts.googleapis.com/css2?family=Anton&family=Caveat:wght@700&family=Inter:wght@500;700;900&family=JetBrains+Mono:wght@500;800&family=Playfair+Display:ital,wght@0,800;1,800&display=block";
  var ITENS = {
    texto:       { nome: "Título / texto", icone: "Aa", grupo: "Textos", padrao: { texto: "SEU *TÍTULO*", estilo: "neon", fonte: "titulo", tamanho: 130, cor: "#FFFFFF", destaque: "#B6FF3B", larg: 960, alinhar: "center" }, entrada: "palavras", saida: "aparecer" },
    chip:        { nome: "Etiqueta / contador de passos", icone: "▭", grupo: "Textos", padrao: { texto: "CÓDIGO 01 / 05", cor: "#B6FF3B" }, entrada: "pulo", saida: "aparecer" },
    contador:    { nome: "Número contando", icone: "123", grupo: "Textos", padrao: { de: 0, ate: 1000, prefixo: "+", sufixo: "", casas: 0, tamanho: 180, cor: "#FFFFFF" }, entrada: "zoom", saida: "aparecer" },
    selo:        { nome: "Selo", icone: "◆", grupo: "Textos", padrao: { texto: "0:07 · −42%", cor: "#E5383B" }, entrada: "pulo", saida: "aparecer", loop: "pulsar" },
    cartao:      { nome: "Cartão", icone: "▤", grupo: "Interface", padrao: { titulo: "RETENÇÃO PREVISTA", texto: "Seu texto aqui, curto e direto.", cor: "#E5383B", larg: 860 }, entrada: "subir", saida: "descer" },
    chat:        { nome: "Janela de chat (IA)", icone: "💬", grupo: "Interface", padrao: { nome: "Chat IA", comando: "/upscale", src: "", larg: 900, alt: 760, cor: "#B6FF3B" }, entrada: "subir", saida: "aparecer" },
    grafico:     { nome: "Gráfico de linha", icone: "📈", grupo: "Interface", padrao: { titulo: "RETENÇÃO", pontos: "100, 95, 90, 86, 60, 55, 50, 46", cor: "#E5383B", larg: 860 }, entrada: "subir", saida: "aparecer" },
    notificacao: { nome: "Notificação / DM", icone: "🔔", grupo: "Interface", padrao: { titulo: "DIRECT · @suamarca", texto: "Seus códigos chegaram ✓", icone: "✉", cor: "#B6FF3B" }, entrada: "direita", saida: "aparecer" },
    foto:        { nome: "Foto / imagem", icone: "🖼", grupo: "Imagens", padrao: { src: "", larg: 520, alt: 680, raio: 28, borda: "", legenda: "" }, entrada: "zoom", saida: "aparecer" },
    antesdepois: { nome: "Antes e depois", icone: "◐", grupo: "Imagens", padrao: { src: "", src2: "", larg: 600, alt: 780, cor: "#B6FF3B" }, entrada: "zoom", saida: "aparecer" },
    lupa:        { nome: "Lupa (zoom no detalhe)", icone: "🔍", grupo: "Imagens", padrao: { src: "", larg: 600, alt: 780, zoom: 2.4, cor: "#B6FF3B" }, entrada: "zoom", saida: "aparecer" },
    emoji:       { nome: "Emoji / ícone", icone: "😀", grupo: "Enfeites", padrao: { emoji: "🔥", tamanho: 200 }, entrada: "quicar", saida: "aparecer", loop: "balancar" },
    forma:       { nome: "Forma", icone: "■", grupo: "Enfeites", padrao: { forma: "circulo", larg: 300, alt: 300, cor: "#B6FF3B", contorno: false, espessura: 10 }, entrada: "pulo", saida: "aparecer" },
    piso:        { nome: "Piso 3D de luzes", icone: "▦", grupo: "Enfeites", padrao: { cor: "#7CFF3B", velocidade: 1 }, entrada: "aparecer", saida: "aparecer", fundo: true },
    /* 22/11 — biblioteca maior (desenho próprio) */
    nomecargo:   { nome: "Nome e cargo", icone: "▁", grupo: "Textos", padrao: { nome: "MARCOS BONFÁ", cargo: "Produtor audiovisual", cor: "#B6FF3B" }, entrada: "esquerda", saida: "aparecer" },
    legenda:     { nome: "Legenda que acende", icone: "💬", grupo: "Textos", padrao: { texto: "CADA PALAVRA ACENDE NA HORA CERTA", cor: "#FFD23F", tamanho: 70 }, entrada: "aparecer", saida: "aparecer" },
    citacao:     { nome: "Citação", icone: "❝", grupo: "Textos", padrao: { texto: "O melhor evento é aquele que ninguém esquece.", autor: "— sua marca", cor: "#B6FF3B" }, entrada: "subir", saida: "aparecer" },
    marcatexto:  { nome: "Marca-texto", icone: "🖍", grupo: "Textos", padrao: { texto: "ISSO MUDA TUDO", cor: "#FFD23F", tamanho: 110 }, entrada: "aparecer", saida: "aparecer" },
    botao:       { nome: "Botão com clique", icone: "👆", grupo: "Textos", padrao: { texto: "SIGA @SUAMARCA", cor: "#FF3D7F" }, entrada: "pulo", saida: "aparecer" },
    lista:       { nome: "Lista com ✓", icone: "☑", grupo: "Interface", padrao: { titulo: "CHECKLIST DO EVENTO", texto: "Som e luz | Telão de LED | Transmissão | Fotos", cor: "#B6FF3B" }, entrada: "subir", saida: "aparecer" },
    barras:      { nome: "Gráfico de barras", icone: "📊", grupo: "Interface", padrao: { titulo: "PÚBLICO POR DIA", pontos: "40, 65, 90, 120", rotulos: "SEX, SÁB, DOM, SEG", cor: "#2E9BFF", larg: 860 }, entrada: "subir", saida: "aparecer" },
    rosca:       { nome: "Gráfico de rosca", icone: "◔", grupo: "Interface", padrao: { valor: 72, titulo: "DE SATISFAÇÃO", cor: "#22C58B" }, entrada: "zoom", saida: "aparecer" },
    progresso:   { nome: "Barra de progresso", icone: "▰", grupo: "Interface", padrao: { titulo: "CARREGANDO A FESTA…", valor: 100, cor: "#B6FF3B" }, entrada: "subir", saida: "aparecer" },
    busca:       { nome: "Barra de pesquisa", icone: "🔎", grupo: "Interface", padrao: { texto: "melhor produtora de eventos", cor: "#2E9BFF" }, entrada: "subir", saida: "aparecer" },
    post:        { nome: "Post de rede social", icone: "♡", grupo: "Interface", padrao: { nome: "@suamarca", texto: "Que noite! Obrigado a todos 🎉", src: "", curtidas: 1280, cor: "#FF3D7F" }, entrada: "subir", saida: "aparecer" },
    estrelas:    { nome: "Avaliação ★★★★★", icone: "★", grupo: "Interface", padrao: { nota: 5, texto: "“Atendimento impecável!”", cor: "#FFD23F" }, entrada: "pulo", saida: "aparecer" },
    pino:        { nome: "Pino de local", icone: "📍", grupo: "Interface", padrao: { texto: "BELO HORIZONTE · MG", cor: "#FF3D7F" }, entrada: "quicar", saida: "aparecer" },
    onda:        { nome: "Onda de áudio", icone: "〰", grupo: "Enfeites", padrao: { cor: "#B6FF3B", larg: 700 }, entrada: "aparecer", saida: "aparecer" },
    brilhos:     { nome: "Brilhos", icone: "✨", grupo: "Enfeites", padrao: { cor: "#FFE58A", larg: 600 }, entrada: "aparecer", saida: "aparecer" },
    raios:       { nome: "Raios de luz", icone: "☀", grupo: "Enfeites", padrao: { cor: "#FFD23F", larg: 1400 }, entrada: "zoom", saida: "aparecer", loop: "girar" },
    confete:     { nome: "Explosão de confete", icone: "🎉", grupo: "Enfeites", padrao: { larg: 900 }, entrada: "nenhum", saida: "aparecer" },
    circulomao:  { nome: "Círculo à mão", icone: "◯", grupo: "Enfeites", padrao: { cor: "#FF3D3D", larg: 420, alt: 260 }, entrada: "nenhum", saida: "aparecer" },
    setamao:     { nome: "Seta à mão", icone: "↪", grupo: "Enfeites", padrao: { cor: "#FFFFFF", larg: 360 }, entrada: "nenhum", saida: "aparecer" },
    mira:        { nome: "Cantos de mira", icone: "⌜", grupo: "Enfeites", padrao: { cor: "#B6FF3B", larg: 600, alt: 600 }, entrada: "zoom", saida: "aparecer", loop: "pulsar" }
  };
  var FUNDOS = {
    escuro: "Escuro com luz", cor: "Cor lisa", degrade: "Degradê", papel: "Papel claro", grade: "Grade escura", nenhum: "Transparente (recorte)"
  };
  var CHROMA = { verde: "#00B140", azul: "#0047BB", magenta: "#FF00FF" };
  var FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "4k-v": [2160, 3840], "4k-h": [3840, 2160] };

  function uid() { return "i" + Math.random().toString(36).slice(2, 9); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function imgOk(s) { return typeof s === "string" && /^(data:image\/(png|jpe?g|webp|gif|svg\+xml)[;,]|blob:|https:\/\/)/i.test(s); }

  function novoItem(tipo, projeto, t) {
    var d = ITENS[tipo]; if (!d) throw new Error("item desconhecido: " + tipo);
    var W = projeto ? projeto.w : 1080, H = projeto ? projeto.h : 1920, ini = Math.max(0, +(t || 0));
    return { id: uid(), tipo: tipo, nome: d.nome, ini: ini, fim: projeto ? Math.max(ini + 1, projeto.dur) : ini + 4,
      x: W / 2, y: d.fundo ? H * 0.78 : H / 2, escala: +(Math.min(W, H) / 1080).toFixed(3), giro: 0, opac: 1, props: clone(d.padrao),
      entrada: { efeito: d.entrada || "aparecer", dur: 0.6 }, saida: { efeito: d.saida || "aparecer", dur: 0.35 }, loop: { efeito: d.loop || "nenhum", forca: 1 }, keys: {} };
  }
  function novoProjeto(formato) {
    var f = FORMATOS[formato] || FORMATOS["9:16"];
    return { v: VERSAO, nome: "Meu motion", formato: formato || "9:16", w: f[0], h: f[1], fps: 30, dur: 8, fundo: { tipo: "escuro", cor1: "#0B1A0B", cor2: "#060806" }, itens: [], meusEfeitos: [] };
  }

  /* ---------- DESENHO ---------- */
  function el(tag, css, pai) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (pai) pai.appendChild(e); return e; }
  function txt(tag, texto, css, pai) { var e = el(tag, css, pai); e.textContent = texto; return e; }
  // *palavra* = destaque; devolve [{w, d}] por palavra
  function palavrasDe(s) {
    var out = [], dest = false; String(s || "").split(/(\*)/).forEach(function (p) { if (p === "*") { dest = !dest; return; } p.split(/(\s+|\n)/).forEach(function (w) { if (w === "\n") out.push({ br: true }); else if (w && !/^\s+$/.test(w)) out.push({ w: w, d: dest }); }); });
    return out;
  }
  function fmtNum(n, casas) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: casas || 0, maximumFractionDigits: casas || 0 }); }

  var DESENHO = {
    texto: function (box, it) {
      var p = it.props, est = p.estilo || "branco", f = FONTES[p.fonte] || FONTES.titulo;
      var w = el("div", "max-width:" + (+p.larg || 960) + "px;text-align:" + (p.alinhar || "center") + ";font-family:" + f + ";font-size:" + (+p.tamanho || 100) + "px;line-height:1.02;font-weight:" + (p.fonte === "texto" ? 900 : p.fonte === "mono" ? 800 : 400) + ";color:" + p.cor + (p.fonte === "titulo" || p.fonte === "mono" ? ";text-transform:uppercase" : ""), box);
      if (est === "etiqueta") { w.style.background = "#151515"; w.style.padding = "0.16em 0.32em"; w.style.borderRadius = "0.14em"; }
      if (est === "contorno") { w.style.webkitTextStroke = Math.max(2, (+p.tamanho || 100) / 28) + "px " + p.cor; w.style.color = "transparent"; }
      if (est === "sombra") w.style.textShadow = "0 0.06em 0.18em rgba(0,0,0,.65)";
      var spans = [];
      palavrasDe(p.texto).forEach(function (q) {
        if (q.br) { el("br", "", w); return; }
        var s = el("span", "display:inline-block;margin:0 .09em;will-change:transform,opacity,filter", w);
        if (q.d) { s.style.color = p.destaque; if (est === "contorno") { s.style.webkitTextStroke = "0"; } }
        if (q.d && est === "neon") s.style.textShadow = "0 0 .22em " + p.destaque + "aa,0 0 .6em " + p.destaque + "66";
        if (est === "neon" && !q.d) s.style.textShadow = "0 0 .2em rgba(255,255,255,.25)";
        var letras = []; Array.from(q.w).forEach(function (c) { var l = txt("span", c, "", s); letras.push(l); });
        spans.push({ s: s, letras: letras });
      });
      box._palavras = spans;
    },
    chip: function (box, it) {
      var p = it.props; txt("div", p.texto, "font:800 34px/1 " + FONTES.mono + ";letter-spacing:5px;color:" + p.cor + ";border:3px solid " + p.cor + "99;background:" + p.cor + "18;padding:14px 24px;border-radius:12px;white-space:nowrap", box);
    },
    contador: function (box, it) {
      var p = it.props; box._num = txt("div", "", "font-family:" + FONTES.titulo + ";font-size:" + (+p.tamanho || 160) + "px;line-height:1;color:" + p.cor + ";white-space:nowrap;font-variant-numeric:tabular-nums", box);
    },
    selo: function (box, it) {
      var p = it.props; txt("div", p.texto, "font:800 36px/1 " + FONTES.mono + ";color:#fff;background:" + p.cor + ";padding:14px 22px;border-radius:12px;white-space:nowrap", box);
    },
    cartao: function (box, it) {
      var p = it.props, c = el("div", "width:" + (+p.larg || 860) + "px;background:#fff;color:#151515;border-radius:34px;padding:38px 44px;box-sizing:border-box;box-shadow:0 0 0 3px rgba(0,0,0,.06),0 30px 70px rgba(0,0,0,.18)", box);
      var t = el("div", "display:flex;align-items:center;gap:16px;font:800 30px/1 " + FONTES.mono + ";letter-spacing:2px;margin-bottom:22px", c);
      el("i", "width:30px;height:30px;border-radius:50%;background:" + p.cor, t); txt("span", p.titulo, "", t);
      txt("div", p.texto, "font:700 46px/1.25 " + FONTES.texto, c);
    },
    chat: function (box, it) {
      var p = it.props, W = +p.larg || 900, H = +p.alt || 760;
      var j = el("div", "width:" + W + "px;height:" + H + "px;border-radius:34px;background:rgba(18,24,18,.94);box-shadow:0 0 0 3px " + p.cor + "44,0 40px 100px rgba(0,0,0,.55);overflow:hidden;position:relative;color:#e9f1e4", box);
      var b = el("div", "height:76px;display:flex;align-items:center;gap:12px;padding:0 28px;border-bottom:2px solid rgba(255,255,255,.07);font:500 24px " + FONTES.mono + ";color:#9aa69a", j);
      ["#ff5f57", "#febc2e", "#28c840"].forEach(function (c) { el("b", "width:18px;height:18px;border-radius:50%;background:" + c, b); });
      txt("span", p.nome, "color:#e3ecdd;font-weight:800;margin-left:8px", b); txt("span", "· nova conversa", "", b);
      if (imgOk(p.src)) {
        box._foto = el("div", "position:absolute;right:36px;top:110px;width:" + Math.round(W * 0.3) + "px;height:" + Math.round(W * 0.39) + "px;border-radius:22px;overflow:hidden;background:#222", j);
        el("img", "width:100%;height:100%;object-fit:cover", box._foto).src = p.src;
      }
      var e = el("div", "position:absolute;left:28px;right:28px;bottom:24px;height:66px;border-radius:33px;background:rgba(255,255,255,.06);display:flex;align-items:center;padding:0 28px;font:500 30px " + FONTES.mono, j);
      box._dig = txt("span", "", "", e); box._entrada = e; box._cor = p.cor;
      box._send = txt("em", "↑", "margin-left:auto;width:46px;height:46px;border-radius:50%;background:#2a332a;display:grid;place-items:center;color:#0a120a;font-style:normal;font-weight:900", e);
    },
    grafico: function (box, it) {
      var p = it.props, W = +p.larg || 860, c = el("div", "width:" + W + "px;background:#fff;color:#151515;border-radius:34px;padding:30px 34px;box-sizing:border-box;box-shadow:0 0 0 3px rgba(0,0,0,.06),0 30px 70px rgba(0,0,0,.18)", box);
      txt("div", p.titulo, "font:800 30px/1 " + FONTES.mono + ";letter-spacing:2px;margin-bottom:14px", c);
      var ns = "http://www.w3.org/2000/svg", Wg = W - 68, Hg = Math.round(Wg * 0.56), sv = document.createElementNS(ns, "svg");
      sv.setAttribute("width", Wg); sv.setAttribute("height", Hg); sv.setAttribute("viewBox", "0 0 " + Wg + " " + Hg); c.appendChild(sv);
      [0.1, 0.5, 0.9].forEach(function (y) { var l = document.createElementNS(ns, "line"); l.setAttribute("x1", 0); l.setAttribute("x2", Wg); l.setAttribute("y1", Hg * y); l.setAttribute("y2", Hg * y); l.setAttribute("stroke", "#eee"); l.setAttribute("stroke-width", 2); sv.appendChild(l); });
      var area = document.createElementNS(ns, "path"); area.setAttribute("fill", p.cor + "22"); sv.appendChild(area);
      var lin = document.createElementNS(ns, "path"); lin.setAttribute("fill", "none"); lin.setAttribute("stroke", p.cor); lin.setAttribute("stroke-width", 7); lin.setAttribute("stroke-linejoin", "round"); lin.setAttribute("stroke-linecap", "round"); sv.appendChild(lin);
      var pt = document.createElementNS(ns, "circle"); pt.setAttribute("r", 14); pt.setAttribute("fill", "#fff"); pt.setAttribute("stroke", p.cor); pt.setAttribute("stroke-width", 7); sv.appendChild(pt);
      var vals = String(p.pontos || "").split(/[,;\s]+/).map(Number).filter(function (n) { return isFinite(n); }); if (vals.length < 2) vals = [100, 50];
      var mx = Math.max.apply(null, vals), mn = Math.min(0, Math.min.apply(null, vals));
      box._g = { area: area, lin: lin, pt: pt, xy: vals.map(function (v, i) { return [Wg * 0.02 + (Wg * 0.96) * i / (vals.length - 1), Hg * 0.9 - (Hg * 0.8) * (v - mn) / ((mx - mn) || 1)]; }), Hg: Hg };
    },
    notificacao: function (box, it) {
      var p = it.props, c = el("div", "width:860px;box-sizing:border-box;border-radius:24px;background:#0f1a0d;box-shadow:0 0 0 3px " + p.cor + ",0 0 50px " + p.cor + "55;padding:26px 30px;display:flex;gap:22px;align-items:center;color:#fff", box);
      txt("i", p.icone, "width:78px;height:78px;flex:none;border-radius:18px;background:" + p.cor + ";display:grid;place-items:center;font-style:normal;font-size:40px;color:#0a120a", c);
      var d = el("div", "", c); txt("small", p.titulo, "display:block;font:500 24px " + FONTES.texto + ";color:#a7b6a2;margin-bottom:6px", d); txt("div", p.texto, "font:800 38px/1.15 " + FONTES.texto, d);
    },
    foto: function (box, it) {
      var p = it.props, c = el("div", "width:" + (+p.larg || 520) + "px;height:" + (+p.alt || 680) + "px;border-radius:" + (+p.raio || 0) + "px;overflow:hidden;background:" + (p.semFundo ? "transparent" : "#2a2a2a") + ";position:relative" + (p.borda ? ";box-shadow:0 0 0 6px " + p.borda : ""), box);
      if (imgOk(p.src)) el("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:" + (p.encaixe === "inteira" ? "contain" : "cover") + (p.semFundo ? ";filter:drop-shadow(0 18px 24px rgba(0,0,0,.35))" : ""), c).src = p.src;
      else txt("div", "TOQUE PARA ESCOLHER A FOTO", "position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:30px;font:800 30px " + FONTES.texto + ";color:#9a9a9a", c);
      if (p.legenda) txt("div", p.legenda, "position:absolute;left:16px;top:16px;font:800 22px/1 " + FONTES.mono + ";background:rgba(0,0,0,.65);color:#fff;padding:8px 12px;border-radius:8px;letter-spacing:2px", c);
    },
    antesdepois: function (box, it) {
      var p = it.props, W = +p.larg || 600, H = +p.alt || 780, c = el("div", "width:" + W + "px;height:" + H + "px;border-radius:26px;overflow:hidden;background:#2a2a2a;position:relative", box);
      var ok = imgOk(p.src), dep = el("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover" + (imgOk(p.src2) ? "" : ";filter:contrast(1.08) saturate(1.12)"), c);
      if (ok) dep.src = imgOk(p.src2) ? p.src2 : p.src;
      var av = el("div", "position:absolute;inset:0", c), ai = el("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:grayscale(.75) sepia(.3) blur(3px) contrast(.8) brightness(.9)", av);
      if (ok) ai.src = p.src; else txt("div", "ESCOLHA A FOTO", "position:absolute;inset:0;display:grid;place-items:center;font:800 30px " + FONTES.texto + ";color:#9a9a9a", c);
      var r = el("div", "position:absolute;top:0;bottom:0;width:6px;background:" + p.cor + ";box-shadow:0 0 18px " + p.cor, c);
      txt("div", "‹›", "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;border-radius:50%;background:" + p.cor + ";color:#0a120a;font:900 26px/56px " + FONTES.texto + ";text-align:center", r);
      txt("span", "ANTES", "position:absolute;left:16px;top:16px;font:800 22px/1 " + FONTES.mono + ";background:rgba(0,0,0,.65);color:#fff;padding:8px 12px;border-radius:8px;letter-spacing:2px", c);
      txt("span", "DEPOIS", "position:absolute;right:16px;top:16px;font:800 22px/1 " + FONTES.mono + ";background:" + p.cor + ";color:#0a120a;padding:8px 12px;border-radius:8px;letter-spacing:2px", c);
      box._ad = { av: av, r: r, W: W };
    },
    lupa: function (box, it) {
      var p = it.props, W = +p.larg || 600, H = +p.alt || 780, k = +p.zoom || 2.4, c = el("div", "width:" + W + "px;height:" + H + "px;border-radius:26px;background:#2a2a2a;position:relative", box);
      var fundo = el("div", "position:absolute;inset:0;border-radius:26px;overflow:hidden", c);
      if (imgOk(p.src)) el("img", "width:100%;height:100%;object-fit:cover", fundo).src = p.src;
      else txt("div", "ESCOLHA A FOTO", "position:absolute;inset:0;display:grid;place-items:center;font:800 30px " + FONTES.texto + ";color:#9a9a9a", fundo);
      var R = Math.round(W * 0.42), l = el("div", "position:absolute;width:" + R + "px;height:" + R + "px;border-radius:50%;overflow:hidden;background:#111;box-shadow:0 0 0 6px " + p.cor + ",0 20px 40px rgba(0,0,0,.6)", c);
      var li = el("img", "position:absolute;width:" + W * k + "px;height:" + H * k + "px;object-fit:cover;max-width:none;filter:contrast(1.12) saturate(1.15)", l); if (imgOk(p.src)) li.src = p.src;
      var z = txt("span", String(k).replace(".", ",") + "×", "position:absolute;font:800 26px/1 " + FONTES.mono + ";background:" + p.cor + ";color:#0a120a;padding:8px 12px;border-radius:10px", c);
      box._lupa = { l: l, li: li, z: z, W: W, H: H, k: k, R: R };
    },
    emoji: function (box, it) { txt("div", it.props.emoji, "font-size:" + (+it.props.tamanho || 180) + "px;line-height:1", box); },
    forma: function (box, it) {
      var p = it.props, W = +p.larg || 300, H = +p.alt || 300, c = p.cor, e = +p.espessura || 10, css = "width:" + W + "px;height:" + H + "px;";
      if (p.forma === "linha") css = "width:" + W + "px;height:" + e + "px;border-radius:" + e + "px;background:" + c;
      else if (p.forma === "seta") { var s = el("div", "position:relative;width:" + W + "px;height:" + Math.max(60, e * 6) + "px", box); el("div", "position:absolute;left:0;right:" + e * 4 + "px;top:50%;height:" + e + "px;margin-top:" + (-e / 2) + "px;background:" + c + ";border-radius:" + e + "px", s); el("div", "position:absolute;right:0;top:50%;width:0;height:0;margin-top:" + (-e * 3) + "px;border-left:" + e * 5 + "px solid " + c + ";border-top:" + e * 3 + "px solid transparent;border-bottom:" + e * 3 + "px solid transparent", s); return; }
      else css += (p.forma === "circulo" ? "border-radius:50%;" : "border-radius:" + Math.round(Math.min(W, H) * 0.12) + "px;") + (p.contorno ? "border:" + e + "px solid " + c + ";box-sizing:border-box" : "background:" + c);
      el("div", css, box);
    },
    piso: function (box, it, P) {
      box.setAttribute("data-fundo", ""); var W = P.w * 2, wrap = el("div", "width:" + W + "px;height:" + P.h * 0.6 + "px;perspective:900px;perspective-origin:50% -10%", box);
      var g = el("div", "width:100%;height:" + P.h * 0.75 + "px;transform:rotateX(64deg);transform-origin:50% 0;display:grid;grid-template-columns:repeat(17,1fr);gap:16px", wrap);
      var cs = []; for (var i = 0; i < 136; i++) cs.push(el("i", "display:block;height:" + Math.round(P.h * 0.06) + "px;border-radius:16px;background:#0d1f0b", g));
      box._piso = cs;
    },
    /* 22/11 — itens novos */
    nomecargo: function (box, it) {
      var p = it.props, c = el("div", "position:relative;padding:26px 44px 26px 64px;min-width:640px;box-sizing:border-box", box);
      box._barra = el("div", "position:absolute;left:0;top:0;bottom:0;width:100%;background:rgba(10,12,10,.88);border-radius:10px;transform-origin:0 50%", c);
      box._acento = el("div", "position:absolute;left:0;top:0;bottom:0;width:16px;background:" + p.cor + ";border-radius:10px 0 0 10px", c);
      box._n = txt("div", p.nome, "position:relative;font:400 76px/1 " + FONTES.titulo + ";letter-spacing:1px;color:#fff;white-space:nowrap", c);
      box._c = txt("div", p.cargo, "position:relative;font:700 34px/1.2 " + FONTES.texto + ";color:" + p.cor + ";margin-top:8px;white-space:nowrap", c);
    },
    legenda: function (box, it) {
      var p = it.props, c = el("div", "max-width:960px;text-align:center;font:400 " + (+p.tamanho || 70) + "px/1.15 " + FONTES.titulo + ";color:#fff;text-shadow:0 4px 0 rgba(0,0,0,.6)", box);
      box._ws = String(p.texto || "").split(/\s+/).filter(Boolean).map(function (w) { var s = txt("span", w, "display:inline-block;margin:0 .16em;padding:0 .1em;border-radius:.12em", c); c.appendChild(document.createTextNode(" ")); return s; });
    },
    citacao: function (box, it) {
      var p = it.props, c = el("div", "width:900px;box-sizing:border-box;padding:40px 50px;position:relative", box);
      txt("div", "“", "position:absolute;left:-10px;top:-70px;font:900 260px/1 " + FONTES.serif + ";color:" + p.cor, c);
      txt("div", p.texto, "font:italic 800 58px/1.22 " + FONTES.serif + ";color:#fff", c);
      txt("div", p.autor, "margin-top:24px;font:700 32px " + FONTES.texto + ";color:" + p.cor, c);
    },
    marcatexto: function (box, it) {
      var p = it.props, c = el("div", "position:relative;display:inline-block;padding:0 24px", box);
      box._mk = el("div", "position:absolute;left:0;bottom:8%;height:46%;width:100%;background:" + p.cor + ";border-radius:10px;transform-origin:0 50%;transform:scaleX(0);opacity:.9", c);
      txt("div", p.texto, "position:relative;font:400 " + (+p.tamanho || 110) + "px/1.05 " + FONTES.titulo + ";color:#fff;white-space:nowrap", c);
    },
    botao: function (box, it) {
      var p = it.props, c = el("div", "position:relative;padding:20px 30px", box);
      box._bt = txt("div", p.texto, "font:900 50px/1 " + FONTES.texto + ";letter-spacing:1px;color:#fff;background:" + p.cor + ";padding:30px 56px;border-radius:999px;white-space:nowrap;box-shadow:0 14px 40px " + p.cor + "77", c);
      box._onda = el("div", "position:absolute;right:30px;bottom:0;width:90px;height:90px;border-radius:50%;border:5px solid #fff;opacity:0", c);
      box._mao = txt("div", "👆", "position:absolute;right:10px;bottom:-60px;font-size:96px;line-height:1", c);
    },
    lista: function (box, it) {
      var p = it.props, c = el("div", "width:860px;box-sizing:border-box;background:rgba(14,18,14,.92);border-radius:30px;padding:34px 40px;box-shadow:0 0 0 3px " + p.cor + "55", box);
      txt("div", p.titulo, "font:800 30px/1 " + FONTES.mono + ";letter-spacing:3px;color:" + p.cor + ";margin-bottom:22px", c);
      box._ls = String(p.texto || "").split("|").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8).map(function (s) {
        var l = el("div", "display:flex;align-items:center;gap:20px;margin:14px 0;font:700 42px/1.2 " + FONTES.texto + ";color:#fff", c);
        var b = txt("i", "✓", "width:52px;height:52px;flex:none;border-radius:14px;border:4px solid " + p.cor + ";display:grid;place-items:center;font-style:normal;font-weight:900;font-size:34px;color:#0a120a", l);
        txt("span", s, "", l); return { l: l, b: b, cor: p.cor };
      });
    },
    barras: function (box, it) {
      var p = it.props, W = +p.larg || 860, c = el("div", "width:" + W + "px;box-sizing:border-box;background:#fff;color:#151515;border-radius:34px;padding:30px 36px;box-shadow:0 30px 70px rgba(0,0,0,.2)", box);
      txt("div", p.titulo, "font:800 30px/1 " + FONTES.mono + ";letter-spacing:2px;margin-bottom:18px", c);
      var vals = String(p.pontos || "").split(/[,;\s]+/).map(Number).filter(isFinite).slice(0, 10), rot = String(p.rotulos || "").split(",").map(function (s) { return s.trim(); });
      if (!vals.length) vals = [50, 100]; var mx = Math.max.apply(null, vals) || 1, area = el("div", "display:flex;align-items:flex-end;gap:18px;height:" + Math.round(W * 0.5) + "px", c);
      box._bs = vals.map(function (v, i) {
        var col = el("div", "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%", area);
        var n = txt("div", "0", "font:800 32px " + FONTES.texto + ";margin-bottom:8px", col), b = el("div", "width:100%;border-radius:14px 14px 4px 4px;background:" + p.cor + ";height:0", col);
        txt("div", rot[i] || "", "font:700 24px " + FONTES.mono + ";margin-top:10px;color:#777", col); return { b: b, n: n, v: v, h: (v / mx) * (W * 0.5 - 100) };
      });
    },
    rosca: function (box, it) {
      var p = it.props, ns = "http://www.w3.org/2000/svg", c = el("div", "position:relative;width:440px;height:440px", box), sv = document.createElementNS(ns, "svg");
      sv.setAttribute("width", 440); sv.setAttribute("height", 440); sv.setAttribute("viewBox", "0 0 440 440"); c.appendChild(sv);
      var a = document.createElementNS(ns, "circle"); a.setAttribute("cx", 220); a.setAttribute("cy", 220); a.setAttribute("r", 180); a.setAttribute("fill", "none"); a.setAttribute("stroke", "rgba(255,255,255,.12)"); a.setAttribute("stroke-width", 40); sv.appendChild(a);
      var b = document.createElementNS(ns, "circle"); b.setAttribute("cx", 220); b.setAttribute("cy", 220); b.setAttribute("r", 180); b.setAttribute("fill", "none"); b.setAttribute("stroke", p.cor); b.setAttribute("stroke-width", 40); b.setAttribute("stroke-linecap", "round");
      b.setAttribute("transform", "rotate(-90 220 220)"); b.setAttribute("stroke-dasharray", "0 1131"); sv.appendChild(b);
      box._r = { b: b, n: txt("div", "0%", "position:absolute;left:0;right:0;top:140px;text-align:center;font:400 116px/1 " + FONTES.titulo + ";color:#fff", c), v: cl(+p.valor || 0, 0, 100) };
      txt("div", p.titulo, "position:absolute;left:0;right:0;top:272px;text-align:center;font:800 24px " + FONTES.mono + ";letter-spacing:2px;color:" + p.cor, c);
    },
    progresso: function (box, it) {
      var p = it.props, c = el("div", "width:860px", box);
      var t = el("div", "display:flex;justify-content:space-between;font:800 34px " + FONTES.mono + ";color:#fff;margin-bottom:16px", c); txt("span", p.titulo, "", t); box._pn = txt("span", "0%", "color:" + p.cor, t);
      var tr = el("div", "height:44px;border-radius:22px;background:rgba(255,255,255,.12);overflow:hidden;box-shadow:inset 0 0 0 3px rgba(255,255,255,.08)", c);
      box._pb = el("div", "height:100%;width:0;border-radius:22px;background:repeating-linear-gradient(135deg," + p.cor + " 0 26px," + p.cor + "cc 26px 52px)", tr); box._pv = cl(+p.valor || 0, 0, 100);
    },
    busca: function (box, it) {
      var p = it.props, c = el("div", "width:900px;height:120px;border-radius:60px;background:#fff;display:flex;align-items:center;gap:24px;padding:0 40px;box-sizing:border-box;box-shadow:0 0 0 4px " + p.cor + "55,0 30px 70px rgba(0,0,0,.3)", box);
      txt("i", "🔎", "font-style:normal;font-size:50px;line-height:1", c);
      box._q = txt("span", "", "font:600 44px " + FONTES.texto + ";color:#151515;white-space:nowrap;overflow:hidden", c);
    },
    post: function (box, it) {
      var p = it.props, c = el("div", "width:760px;background:#fff;color:#151515;border-radius:30px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35)", box);
      var t = el("div", "display:flex;align-items:center;gap:16px;padding:22px 26px", c); el("i", "width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#FFD23F," + p.cor + ")", t);
      txt("b", p.nome, "font:800 32px " + FONTES.texto, t);
      var f = el("div", "height:640px;background:linear-gradient(135deg,#2a2a2a,#444);position:relative", c);
      if (imgOk(p.src)) el("img", "position:absolute;inset:0;width:100%;height:100%;object-fit:cover", f).src = p.src;
      box._co = txt("div", "♥", "position:absolute;left:50%;top:50%;font-size:220px;line-height:1;color:#fff;transform:translate(-50%,-50%) scale(0);text-shadow:0 10px 40px rgba(0,0,0,.4)", f);
      var b = el("div", "padding:20px 26px 28px", c), a = el("div", "display:flex;align-items:center;gap:14px;font:800 34px " + FONTES.texto, b);
      box._ch = txt("span", "♡", "font-size:46px;color:#151515", a); box._cn = txt("span", "0 curtidas", "", a); box._cv = +p.curtidas || 0;
      txt("div", p.texto, "font:500 32px/1.3 " + FONTES.texto + ";margin-top:12px", b);
    },
    estrelas: function (box, it) {
      var p = it.props, c = el("div", "text-align:center", box), l = el("div", "white-space:nowrap", c);
      box._es = []; for (var i = 0; i < 5; i++) box._es.push(txt("span", "★", "display:inline-block;font-size:130px;line-height:1;margin:0 6px;color:" + (i < Math.round(+p.nota || 5) ? p.cor : "rgba(255,255,255,.18)") + ";transform:scale(0)", l));
      txt("div", p.texto, "margin-top:22px;font:italic 800 50px/1.2 " + FONTES.serif + ";color:#fff", c);
    },
    pino: function (box, it) {
      var p = it.props, c = el("div", "position:relative;display:flex;flex-direction:column;align-items:center", box);
      box._an = el("div", "position:absolute;top:150px;width:120px;height:44px;border-radius:50%;border:5px solid " + p.cor, c);
      txt("div", "📍", "position:relative;font-size:180px;line-height:1", c);
      txt("div", p.texto, "margin-top:26px;font:800 40px " + FONTES.mono + ";letter-spacing:3px;color:#fff;background:rgba(0,0,0,.6);padding:14px 26px;border-radius:14px;white-space:nowrap", c);
    },
    onda: function (box, it) {
      var p = it.props, W = +p.larg || 700, n = 28, c = el("div", "display:flex;align-items:center;gap:" + Math.round(W / n * 0.35) + "px;height:260px", box);
      box._ond = []; for (var i = 0; i < n; i++) box._ond.push(el("i", "display:block;width:" + Math.round(W / n * 0.65) + "px;height:20px;border-radius:99px;background:" + p.cor, c));
    },
    brilhos: function (box, it) {
      var p = it.props, W = +p.larg || 600, c = el("div", "position:relative;width:" + W + "px;height:" + W + "px", box); box._br = [];
      for (var i = 0; i < 12; i++) { var a = i * 2.4, r = W * (0.15 + 0.33 * ((i * 37) % 10) / 10), s = 40 + (i * 53) % 70;
        box._br.push(txt("span", "✦", "position:absolute;left:" + (W / 2 + Math.cos(a) * r - s / 2).toFixed(0) + "px;top:" + (W / 2 + Math.sin(a) * r - s / 2).toFixed(0) + "px;font-size:" + s + "px;line-height:1;color:" + p.cor + ";text-shadow:0 0 20px " + p.cor, c)); }
    },
    raios: function (box, it) {
      var p = it.props, W = +p.larg || 1400;
      el("div", "width:" + W + "px;height:" + W + "px;border-radius:50%;background:repeating-conic-gradient(" + p.cor + "55 0deg 9deg,transparent 9deg 20deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 70%);mask:radial-gradient(circle,#000 18%,transparent 70%)", box);
    },
    confete: function (box, it) {
      var W = +it.props.larg || 900, c = el("div", "position:relative;width:" + W + "px;height:" + W + "px", box), cs = ["#FFD23F", "#FF3D7F", "#2E9BFF", "#22C58B", "#B6FF3B", "#FFFFFF", "#7C5CFF"]; box._cf = [];
      for (var i = 0; i < 60; i++) { var e = el("i", "position:absolute;left:" + W / 2 + "px;top:" + W / 2 + "px;width:" + (14 + i % 3 * 6) + "px;height:" + (24 + i % 4 * 6) + "px;border-radius:3px;background:" + cs[i % 7], c);
        var h1 = Math.sin(i * 127.1) * 43758.5453, h2 = Math.sin(i * 311.7) * 43758.5453; box._cf.push({ e: e, a: (h1 - Math.floor(h1)) * Math.PI * 2, v: 0.25 + 0.3 * (h2 - Math.floor(h2)), W: W }); }
    },
    circulomao: function (box, it) {
      var p = it.props, W = +p.larg || 420, H = +p.alt || 260, ns = "http://www.w3.org/2000/svg", sv = document.createElementNS(ns, "svg"); sv.setAttribute("width", W); sv.setAttribute("height", H); sv.setAttribute("viewBox", "0 0 " + W + " " + H); sv.style.overflow = "visible"; box.appendChild(sv);
      var pa = document.createElementNS(ns, "path"), cx = W / 2, cy = H / 2, rx = W / 2 - 12, ry = H / 2 - 12, d = "";
      for (var i = 0; i <= 64; i++) { var a = -Math.PI * 0.6 + Math.PI * 2.15 * i / 64, k = 1 + 0.04 * Math.sin(i * 0.7); d += (i ? "L" : "M") + (cx + Math.cos(a) * rx * k).toFixed(1) + " " + (cy + Math.sin(a) * ry * k).toFixed(1); }
      pa.setAttribute("d", d); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", p.cor); pa.setAttribute("stroke-width", 12); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); sv.appendChild(pa);
      box._tr = { p: pa, L: 0 };
    },
    setamao: function (box, it) {
      var p = it.props, W = +p.larg || 360, ns = "http://www.w3.org/2000/svg", sv = document.createElementNS(ns, "svg"); sv.setAttribute("width", W); sv.setAttribute("height", W * 0.7); sv.setAttribute("viewBox", "0 0 100 70"); sv.style.overflow = "visible"; box.appendChild(sv);
      var pa = document.createElementNS(ns, "path"); pa.setAttribute("d", "M6 60 C 20 20, 60 6, 88 24 M76 12 L 90 25 L 74 34"); pa.setAttribute("fill", "none"); pa.setAttribute("stroke", p.cor); pa.setAttribute("stroke-width", 4.5); pa.setAttribute("stroke-linecap", "round"); pa.setAttribute("stroke-linejoin", "round"); sv.appendChild(pa);
      box._tr = { p: pa, L: 0 };
    },
    mira: function (box, it) {
      var p = it.props, W = +p.larg || 600, H = +p.alt || 600, c = el("div", "position:relative;width:" + W + "px;height:" + H + "px", box), L = Math.round(Math.min(W, H) * 0.22);
      [["left:0;top:0", "border-left", "border-top"], ["right:0;top:0", "border-right", "border-top"], ["left:0;bottom:0", "border-left", "border-bottom"], ["right:0;bottom:0", "border-right", "border-bottom"]].forEach(function (q) {
        el("i", "position:absolute;" + q[0] + ";width:" + L + "px;height:" + L + "px;" + q[1] + ":12px solid " + p.cor + ";" + q[2] + ":12px solid " + p.cor + ";border-radius:6px;filter:drop-shadow(0 0 10px " + p.cor + ")", c); });
    }
  };

  // partes que mudam com o tempo do item (lt = segundos desde o início do item, d = duração do item)
  function hexRgb(h) { var m = /^#?([0-9a-f]{6})/i.exec(h || ""); var n = m ? parseInt(m[1], 16) : 0x7cff3b; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  var VIVO = {
    contador: function (box, it, lt, d) { var p = it.props, f = EASE.sai(prog(lt, 0.15, 0.15 + Math.min(1.8, d * 0.6))); box._num.textContent = (p.prefixo || "") + fmtNum((+p.de || 0) + ((+p.ate || 0) - (+p.de || 0)) * f, +p.casas || 0) + (p.sufixo || ""); },
    chat: function (box, it, lt) {
      var p = it.props, c = String(p.comando || ""), n = Math.floor(cl((lt - 0.7) / 0.08, 0, c.length)), viva = lt > 0.55;
      box._dig.textContent = viva ? c.slice(0, n) + ((Math.floor(lt * 2.5) % 2 === 0 || n < c.length) ? "▏" : "") : "Pergunte alguma coisa";
      box._entrada.style.color = viva ? p.cor : "#7d877d"; box._entrada.style.boxShadow = viva ? "inset 0 0 0 3px " + p.cor + "99" : "none";
      box._send.style.background = viva && n >= c.length ? p.cor : "#2a332a";
      if (box._foto) { var e = EASE.pulo(prog(lt, 0.15, 0.6)); box._foto.style.opacity = prog(lt, 0.15, 0.3); box._foto.style.transform = "translateX(" + ((1 - e) * 120).toFixed(1) + "px) scale(" + (0.8 + 0.2 * e).toFixed(3) + ")"; }
    },
    grafico: function (box, it, lt) {
      var g = box._g, P = EASE.sai(prog(lt, 0.4, 2.2)) * (g.xy.length - 1), i0 = Math.floor(P), f = P - i0, pts = g.xy.slice(0, i0 + 1);
      if (i0 < g.xy.length - 1 && f > 0) pts.push([g.xy[i0][0] + (g.xy[i0 + 1][0] - g.xy[i0][0]) * f, g.xy[i0][1] + (g.xy[i0 + 1][1] - g.xy[i0][1]) * f]);
      var d = pts.map(function (q, k) { return (k ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" "), u = pts[pts.length - 1];
      g.lin.setAttribute("d", d); g.area.setAttribute("d", d + " L" + u[0].toFixed(1) + " " + g.Hg + " L" + pts[0][0].toFixed(1) + " " + g.Hg + " Z");
      g.pt.setAttribute("cx", u[0]); g.pt.setAttribute("cy", u[1]);
    },
    antesdepois: function (box, it, lt, d) {
      var a = box._ad, ida = Math.max(0.8, (d - 0.9) * 0.55), x = a.W * (0.92 - 0.84 * EASE.suave(prog(lt, 0.4, 0.4 + ida)) + 0.42 * EASE.suave(prog(lt, 0.5 + ida, 0.5 + ida + 0.7)));
      a.av.style.clipPath = "inset(0 " + (a.W - x).toFixed(1) + "px 0 0)"; a.r.style.left = (x - 3).toFixed(1) + "px";
    },
    lupa: function (box, it, lt, d) {
      var L = box._lupa, q = EASE.suave(prog(lt, 0.3, Math.max(1.2, d - 0.4))), px = L.W * (0.25 + 0.5 * q), py = L.H * (0.35 + 0.12 * Math.sin(q * Math.PI)), s = EASE.pulo(prog(lt, 0.25, 0.6));
      L.l.style.left = (px - L.R / 2).toFixed(1) + "px"; L.l.style.top = (py - L.R / 2).toFixed(1) + "px"; L.l.style.transform = "scale(" + s.toFixed(3) + ")";
      L.li.style.left = (L.R / 2 - px * L.k).toFixed(1) + "px"; L.li.style.top = (L.R / 2 - py * L.k).toFixed(1) + "px";
      L.z.style.left = (px - 40).toFixed(1) + "px"; L.z.style.top = (py + L.R / 2 + 12).toFixed(1) + "px"; L.z.style.opacity = prog(lt, 0.5, 0.7);
    },
    piso: function (box, it, lt) {
      var rgb = hexRgb(it.props.cor), v0 = +it.props.velocidade || 1;
      box._piso.forEach(function (c, i) {
        var lin = Math.floor(i / 17), col = i % 17, onda = 0.5 + 0.5 * Math.sin(lt * 2.2 * v0 - lin * 0.9 + Math.abs(col - 8) * 0.35), v = cl(0.1 + 0.6 * Math.pow(onda, 3));
        c.style.background = "rgb(" + Math.round(10 + rgb[0] * 0.85 * v) + "," + Math.round(16 + rgb[1] * 0.85 * v) + "," + Math.round(10 + rgb[2] * 0.85 * v) + ")";
      });
    },
    nomecargo: function (box, it, lt) { var e = EASE.sai(prog(lt, 0, 0.55)); box._barra.style.transform = "scaleX(" + e.toFixed(3) + ")"; box._n.style.opacity = prog(lt, 0.25, 0.5); box._c.style.opacity = prog(lt, 0.4, 0.65); box._c.style.transform = "translateY(" + ((1 - EASE.sai(prog(lt, 0.4, 0.8))) * 20).toFixed(1) + "px)"; },
    legenda: function (box, it, lt, d) { var n = box._ws.length, por = Math.max(0.18, Math.min(0.6, (d - 0.4) / Math.max(1, n))), k = Math.floor((lt - 0.2) / por);
      box._ws.forEach(function (s, i) { var on = i === k; s.style.color = on ? "#111" : "#fff"; s.style.background = on ? it.props.cor : "transparent"; s.style.textShadow = on ? "none" : ""; s.style.transform = on ? "scale(1.08)" : "none"; s.style.opacity = i <= k ? 1 : 0.55; }); },
    marcatexto: function (box, it, lt) { box._mk.style.transform = "scaleX(" + EASE.suave(prog(lt, 0.25, 0.85)).toFixed(3) + ")"; },
    botao: function (box, it, lt) { var c = (lt % 3) / 3, mv = EASE.suave(prog(c, 0, 0.35)), clique = prog(c, 0.35, 0.42) * (1 - prog(c, 0.42, 0.5));
      box._mao.style.transform = "translate(" + ((1 - mv) * 140).toFixed(1) + "px," + ((1 - mv) * 120 - clique * 14).toFixed(1) + "px)"; box._mao.style.opacity = prog(lt, 0.1, 0.3);
      box._bt.style.transform = "scale(" + (1 - clique * 0.08).toFixed(3) + ")"; var o = prog(c, 0.4, 0.75); box._onda.style.opacity = (o > 0 ? 1 - o : 0).toFixed(2); box._onda.style.transform = "scale(" + (0.4 + o * 1.6).toFixed(2) + ")"; },
    lista: function (box, it, lt) { box._ls.forEach(function (q, i) { var p0 = 0.4 + i * 0.45, on = lt >= p0 + 0.25; q.l.style.opacity = prog(lt, p0, p0 + 0.2); q.l.style.transform = "translateX(" + ((1 - EASE.sai(prog(lt, p0, p0 + 0.35))) * -40).toFixed(1) + "px)";
      q.b.style.background = on ? q.cor : "transparent"; q.b.style.color = on ? "#0a120a" : "transparent"; q.b.style.transform = "scale(" + (on ? EASE.pulo(prog(lt, p0 + 0.25, p0 + 0.5)) : 1).toFixed(3) + ")"; }); },
    barras: function (box, it, lt) { box._bs.forEach(function (q, i) { var e = EASE.sai(prog(lt, 0.3 + i * 0.18, 1.1 + i * 0.18)); q.b.style.height = (q.h * e).toFixed(1) + "px"; q.n.textContent = fmtNum(q.v * e, 0); }); },
    rosca: function (box, it, lt) { var e = EASE.sai(prog(lt, 0.25, 1.8)), v = box._r.v * e; box._r.b.setAttribute("stroke-dasharray", (1131 * v / 100).toFixed(1) + " 1131"); box._r.n.textContent = Math.round(v) + "%"; },
    progresso: function (box, it, lt) { var e = EASE.suave(prog(lt, 0.3, 2.2)) * box._pv; box._pb.style.width = e.toFixed(1) + "%"; box._pn.textContent = Math.round(e) + "%"; },
    busca: function (box, it, lt) { var s = String(it.props.texto || ""), n = Math.floor(cl((lt - 0.5) / 0.07, 0, s.length)); box._q.textContent = s.slice(0, n) + (Math.floor(lt * 2.5) % 2 === 0 || n < s.length ? "|" : ""); },
    post: function (box, it, lt) { var c = prog(lt, 1.0, 1.6), on = lt >= 1.1; box._co.style.transform = "translate(-50%,-50%) scale(" + (c > 0 && c < 1 ? EASE.pulo(Math.min(1, c * 2)) * (1 - prog(c, 0.6, 1)) : 0).toFixed(3) + ")";
      box._ch.textContent = on ? "♥" : "♡"; box._ch.style.color = on ? it.props.cor : "#151515"; box._cn.textContent = fmtNum(box._cv * EASE.sai(prog(lt, 1.1, 2.6)), 0) + " curtidas"; },
    estrelas: function (box, it, lt) { box._es.forEach(function (s, i) { s.style.transform = "scale(" + EASE.pulo(prog(lt, 0.2 + i * 0.16, 0.5 + i * 0.16)).toFixed(3) + ") rotate(" + ((1 - prog(lt, 0.2 + i * 0.16, 0.6 + i * 0.16)) * -60).toFixed(0) + "deg)"; }); },
    pino: function (box, it, lt) { var c = (lt % 1.6) / 1.6; box._an.style.opacity = (1 - c).toFixed(2); box._an.style.transform = "scale(" + (0.4 + c * 1.6).toFixed(2) + ")"; },
    onda: function (box, it, lt) { box._ond.forEach(function (b, i) { var v = 0.15 + 0.85 * Math.abs(Math.sin(lt * (3 + (i % 5) * 0.7) + i * 0.6)) * (0.55 + 0.45 * Math.sin(lt * 1.3 + i * 0.25)); b.style.height = Math.round(20 + v * 220) + "px"; }); },
    brilhos: function (box, it, lt) { box._br.forEach(function (s, i) { var a = Math.max(0, Math.sin(lt * (2 + (i % 4) * 0.6) + i * 1.9)); s.style.opacity = a.toFixed(2); s.style.transform = "scale(" + (0.4 + a * 0.8).toFixed(2) + ") rotate(" + (lt * 40 + i * 30).toFixed(0) + "deg)"; }); },
    confete: function (box, it, lt) { box._cf.forEach(function (q, i) { var u = Math.min(lt, 3), r = q.W * q.v * (1 - Math.exp(-u * 3)), x = Math.cos(q.a) * r, y = Math.sin(q.a) * r + u * u * 60;
      q.e.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) rotate(" + (lt * 400 + i * 40).toFixed(0) + "deg)"; q.e.style.opacity = (1 - prog(lt, 1.8, 3)).toFixed(2); }); },
    circulomao: function (box, it, lt) { var tr = box._tr; if (!tr.L) { try { tr.L = tr.p.getTotalLength() || 1500; } catch (e) { tr.L = 1500; } tr.p.setAttribute("stroke-dasharray", tr.L); } tr.p.setAttribute("stroke-dashoffset", (tr.L * (1 - EASE.suave(prog(lt, 0.1, 0.9)))).toFixed(1)); },
    setamao: function (box, it, lt) { var tr = box._tr; if (!tr.L) { try { tr.L = tr.p.getTotalLength() || 200; } catch (e) { tr.L = 200; } tr.p.setAttribute("stroke-dasharray", tr.L); } tr.p.setAttribute("stroke-dashoffset", (tr.L * (1 - EASE.suave(prog(lt, 0.1, 0.8)))).toFixed(1)); }
  };

  function desenharFundo(f, P, recorte) {
    var d = el("div", "position:absolute;inset:0");
    d.setAttribute("data-fundo", "");
    if (recorte && CHROMA[recorte]) { d.style.background = CHROMA[recorte]; return d; }
    if (recorte === "alfa" || f.tipo === "nenhum") { d.style.background = "transparent"; return d; }
    var c1 = f.cor1 || "#0B1A0B", c2 = f.cor2 || "#060806";
    if (f.tipo === "cor") d.style.background = c1;
    else if (f.tipo === "degrade") d.style.background = "linear-gradient(170deg," + c1 + "," + c2 + ")";
    else if (f.tipo === "papel") d.style.background = "linear-gradient(rgba(0,0,0,.035) 1px,transparent 1px) 0 0/54px 54px,linear-gradient(90deg,rgba(0,0,0,.035) 1px,transparent 1px) 0 0/54px 54px,radial-gradient(90% 60% at 50% 25%,#FBF8F2,#EFEAE0 70%,#E4DDCF)";
    else if (f.tipo === "grade") d.style.background = "linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px) 0 0/90px 90px,linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px) 0 0/90px 90px,radial-gradient(70% 50% at 50% 40%," + c1 + ",#05060a)";
    else d.style.background = "radial-gradient(70% 45% at 50% 48%," + c1 + " 0%," + c2 + " 70%,#040504 100%)";
    return d;
  }

  /* montar(palco, projeto, {recorte}) → { seek(t), dur, caixas }  — o palco recebe uma <div> do tamanho do vídeo (w × h) */
  /* 22/11: COR por item (como no editor de vídeo): exposição, contraste, saturação, matiz, temperatura, preto e branco, desfoque — filtro CSS,
     igual na prévia, no vídeo feito no aparelho e no render do PC */
  function corFiltro(c) { if (!c) return ""; var f = [], n = function (k) { return +c[k] || 0; };
    if (n("exp")) f.push("brightness(" + (1 + n("exp") / 100).toFixed(3) + ")"); if (n("contraste")) f.push("contrast(" + (1 + n("contraste") / 100).toFixed(3) + ")");
    if (n("sat")) f.push("saturate(" + Math.max(0, 1 + n("sat") / 100).toFixed(3) + ")"); if (n("temp") > 0) f.push("sepia(" + (n("temp") / 250).toFixed(3) + ")");
    if (n("matiz") || n("temp") < 0) f.push("hue-rotate(" + (n("matiz") + (n("temp") < 0 ? n("temp") * 0.3 : 0)).toFixed(1) + "deg)");
    if (n("pb")) f.push("grayscale(" + Math.min(1, n("pb") / 100).toFixed(3) + ")"); if (n("desfoque") > 0) f.push("blur(" + (n("desfoque") / 10).toFixed(1) + "px)");
    return f.join(" "); }
  function montar(palco, P, op) {
    op = op || {};
    palco.innerHTML = "";
    var raiz = el("div", "position:relative;width:" + P.w + "px;height:" + P.h + "px;overflow:hidden;color:#fff;font-family:" + FONTES.texto, palco);
    raiz.className = "bwm-raiz"; raiz.appendChild(desenharFundo(P.fundo || {}, P, op.recorte));
    var meus = {}; (P.meusEfeitos || []).forEach(function (e) { meus["m:" + e.id] = e; });
    var caixas = P.itens.map(function (it) {
      var b = el("div", "position:absolute;left:0;top:0;transform-origin:50% 50%;will-change:transform,opacity,filter", raiz);
      b.setAttribute("data-item", it.id);
      try { (DESENHO[it.tipo] || function () {})(b, it, P); } catch (e) { b.textContent = "⚠ " + it.tipo; }
      return { b: b, it: it, w: 0, h: 0 };
    });
    caixas.forEach(function (c) { c.w = c.b.offsetWidth; c.h = c.b.offsetHeight; }); // medida sem transformação
    function efeito(id, p) { if (meus[id]) return efeitoProprio(meus[id], p); var e = EFEITOS[id] || EFEITOS.aparecer; return e.f(p); }
    function seek(t) {
      caixas.forEach(function (c) {
        var it = c.it, b = c.b, vis = t >= it.ini && t < it.fim && !it.oculto && !(op.recorte && ITENS[it.tipo] && ITENS[it.tipo].fundo);
        b.style.display = vis ? "" : "none"; if (!vis) return;
        var lt = t - it.ini, d = it.fim - it.ini, K = it.keys || {};
        var x = valorKeys(K.x, t, +it.x), y = valorKeys(K.y, t, +it.y), s = valorKeys(K.escala, t, +it.escala || 1), r = valorKeys(K.giro, t, +it.giro || 0), o = valorKeys(K.opac, t, it.opac === undefined ? 1 : +it.opac);
        var en = it.entrada || {}, sa = it.saida || {}, lo = it.loop || {}, de = Math.max(0.01, +en.dur || 0.6), ds = Math.max(0.01, +sa.dur || 0.35);
        var fx = {};
        var pals = b._palavras, porPalavra = en.efeito === "palavras" && pals, maq = en.efeito === "maquina" && pals;
        if (!porPalavra && !maq && en.efeito && en.efeito !== "nenhum" && lt < de) fx = soma(fx, efeito(en.efeito, prog(lt, 0, de)));
        if (sa.efeito && sa.efeito !== "nenhum" && t > it.fim - ds && (it.fim < P.dur - 0.01 || sa.noFim)) { // quem vai até o fim do vídeo não sai (a não ser que peça)
          var q = prog(t, it.fim - ds, it.fim), ex = efeito(sa.efeito, 1 - q); if (ex.dx) ex.dx = -ex.dx; if (ex.dy) ex.dy = -ex.dy; fx = soma(fx, ex);
        }
        if (lo.efeito && lo.efeito !== "nenhum" && LOOPS[lo.efeito]) fx = soma(fx, LOOPS[lo.efeito].f(lt, lo.forca === undefined ? 1 : +lo.forca));
        var S = s * (fx.s === undefined ? 1 : fx.s), O = cl(o * (fx.o === undefined ? 1 : fx.o));
        var tr = "translate(" + (x + (fx.dx || 0) - c.w / 2).toFixed(2) + "px," + (y + (fx.dy || 0) - c.h / 2).toFixed(2) + "px)";
        if (fx.rx || fx.ry) tr += " perspective(1200px) rotateX(" + (fx.rx || 0).toFixed(2) + "deg) rotateY(" + (fx.ry || 0).toFixed(2) + "deg)";
        var EX = it.ex == null ? 1 : +it.ex, EY = it.ey == null ? 1 : +it.ey;   /* 28/11: largura (X) e altura (Y) soltas */
        tr += " rotate(" + (r + (fx.r || 0)).toFixed(2) + "deg) scale(" + Math.max(0, S * EX).toFixed(4) + "," + Math.max(0, S * EY).toFixed(4) + ")";
        b.style.transform = tr; b.style.opacity = O.toFixed(3); var cf = corFiltro(it.cor); b.style.filter = (fx.b > 0.05 ? "blur(" + fx.b.toFixed(1) + "px) " : "") + cf;
        // textos: palavra por palavra / máquina de escrever
        if (pals) {
          var nP = pals.length, total = 0; pals.forEach(function (w) { total += w.letras.length; });
          var passo = Math.min(0.16, de / Math.max(1, nP)), feitas = 0, nL = maq ? Math.floor(prog(lt, 0, de) * total + 1e-6) : total;
          pals.forEach(function (w, k) {
            if (porPalavra) { var p0 = prog(lt, k * passo, k * passo + 0.35), e = EASE.pulo(p0), oo = prog(lt, k * passo, k * passo + 0.12);
              w.s.style.opacity = oo.toFixed(3); w.s.style.transform = "translateY(" + ((1 - e) * 40).toFixed(1) + "px) scale(" + (0.7 + 0.3 * e).toFixed(3) + ")"; w.s.style.filter = oo < 1 ? "blur(" + ((1 - oo) * 8).toFixed(1) + "px)" : ""; }
            else { w.s.style.opacity = ""; w.s.style.transform = ""; w.s.style.filter = ""; }
            w.letras.forEach(function (l) { l.style.visibility = maq && feitas >= nL ? "hidden" : ""; feitas++; });
          });
        }
        if (VIVO[it.tipo]) VIVO[it.tipo](b, it, lt, d, P);
      });
    }
    return { seek: seek, dur: P.dur, caixas: caixas, raiz: raiz };
  }

  /* motion AUTOMÁTICO: escolhe entrada/saída/durante por tipo (e espalha os tempos se todos começam juntos) */
  var ESTILOS_AUTO = {
    dinamico: { texto: "palavras", chip: "pulo", contador: "zoom", selo: "pulo", cartao: "subir", chat: "subir", grafico: "subir", notificacao: "direita", foto: "zoom", antesdepois: "zoom", lupa: "zoom", emoji: "quicar", forma: "pulo", piso: "aparecer" },
    suave:    { texto: "desfocar", chip: "aparecer", contador: "desfocar", selo: "aparecer", cartao: "subir", chat: "desfocar", grafico: "subir", notificacao: "subir", foto: "desfocar", antesdepois: "aparecer", lupa: "aparecer", emoji: "aparecer", forma: "aparecer", piso: "aparecer" },
    impacto:  { texto: "pulo", chip: "elastico", contador: "elastico", selo: "girar", cartao: "tombar", chat: "flip", grafico: "tombar", notificacao: "deslizar", foto: "girar", antesdepois: "flip", lupa: "pulo", emoji: "elastico", forma: "elastico", piso: "aparecer" }
  };
  function auto(P, estilo) {
    var m = ESTILOS_AUTO[estilo] || ESTILOS_AUTO.dinamico, its = P.itens.filter(function (i) { return i.tipo !== "piso"; });
    var juntos = its.length > 1 && its.every(function (i) { return Math.abs(i.ini - its[0].ini) < 0.01; });
    var ordem = its.slice().sort(function (a, b) { return a.y - b.y; });
    ordem.forEach(function (it, k) {
      if (juntos) it.ini = +(its[0].ini + k * 0.25).toFixed(2);
      it.entrada = { efeito: m[it.tipo] || "aparecer", dur: it.tipo === "texto" ? 0.7 : 0.6 };
      it.saida = { efeito: estilo === "impacto" ? "zoom" : "aparecer", dur: 0.3 };
      var loop = { selo: "pulsar", emoji: "balancar", notificacao: "flutuar", cartao: "flutuar", chat: "flutuar" }[it.tipo] || "nenhum";
      it.loop = { efeito: estilo === "suave" && loop !== "nenhum" ? "flutuar" : loop, forca: estilo === "impacto" ? 1 : 0.6 };
    });
    return P;
  }

  /* efeito descrito em palavras → chaves (sem internet). A IA da plataforma faz melhor; isto é a reserva. */
  function efeitoPorTexto(frase) {
    var s = " " + String(frase || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + " ", ch = { o: [[0, 0, "linear"], [0.25, 1, "sai"]] };
    var curva = /quic|pul/.test(s) ? "quique" : /elast|mola/.test(s) ? "elastico" : /devag|suav|leve/.test(s) ? "suave" : "sai";
    var dist = /longe|fora da tela/.test(s) ? 1200 : /pouco|leve/.test(s) ? 120 : 420;
    if (/de cima|do alto|cai|descendo/.test(s)) ch.dy = [[0, -dist, "linear"], [1, 0, curva]];
    if (/de baixo|subindo|sobe/.test(s)) ch.dy = [[0, dist, "linear"], [1, 0, curva]];
    if (/da esquerda/.test(s)) ch.dx = [[0, -dist, "linear"], [1, 0, curva]];
    if (/da direita/.test(s)) ch.dx = [[0, dist, "linear"], [1, 0, curva]];
    if (/gir|rod/.test(s)) ch.r = [[0, /duas voltas|2 voltas/.test(s) ? -720 : -360, "linear"], [1, 0, "sai"]];
    if (/cresc|zoom|aument|explod/.test(s)) ch.s = [[0, 0.2, "linear"], [1, 1, /explod|pul/.test(s) ? "pulo" : curva]];
    if (/encolh|diminu|de perto/.test(s)) ch.s = [[0, 2.2, "linear"], [1, 1, curva]];
    if (/desfo|borr/.test(s)) ch.b = [[0, 24, "linear"], [1, 0, "sai"]];
    if (/vir|flip/.test(s) && !ch.r) ch.r = [[0, 90, "linear"], [1, 0, "sai"]];
    if (Object.keys(ch).length === 1) ch.s = [[0, 0.4, "linear"], [1, 1, curva]];
    return { nome: String(frase || "Meu efeito").slice(0, 40), chaves: ch };
  }
  // confere um efeito que veio da IA: só propriedades e números conhecidos
  function limparEfeito(e) {
    if (!e || typeof e !== "object") return null;
    var ok = { dx: [-3000, 3000], dy: [-3000, 3000], s: [0, 8], r: [-1440, 1440], o: [0, 1], b: [0, 60], rx: [-180, 180], ry: [-180, 180] }, ch = {}, src = e.chaves || e.keys || e;
    Object.keys(ok).forEach(function (k) {
      if (!Array.isArray(src[k])) return;
      var l = src[k].map(function (q) { return Array.isArray(q) ? [cl(+q[0]), cl(+q[1], ok[k][0], ok[k][1]), EASE[q[2]] ? q[2] : "suave"] : null; })
        .filter(function (q) { return q && isFinite(q[0]) && isFinite(q[1]); }).sort(function (a, b) { return a[0] - b[0]; });
      if (l.length >= 2) ch[k] = l.slice(0, 12);
    });
    if (!Object.keys(ch).length) return null;
    return { nome: String(e.nome || "Meu efeito").replace(/[<>]/g, "").slice(0, 40), chaves: ch };
  }

  /* HTML completo para o render (app BW: motor/animar.mjs · aparelho: BWReelsCelular). src = endereço deste arquivo. */
  function html(P, op) {
    op = op || {};
    var dados = JSON.stringify(P).replace(/</g, "\\u003c");
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link href="' + LINK_FONTES + '" rel="stylesheet">' +
      '<style>html,body{margin:0;width:' + P.w + 'px;height:' + P.h + 'px;overflow:hidden;background:transparent}</style></head><body><div id="palco"></div>' +
      '<script src="' + (op.src || "assets/motion-motor.js") + '"><\/script><script>(function(){var P=' + dados + ';' +
      'window.__DUR=P.dur;window.__W=P.w;window.__H=P.h;window.__FPS=P.fps||30;' +
      'var imgs=[].slice.call(document.images||[]);' +
      'var m=BWMotion.montar(document.getElementById("palco"),P,{recorte:' + JSON.stringify(op.recorte || "") + '});' +
      'window.__seek=function(t){m.seek(t)};m.seek(0);' +
      'window.__pronto=Promise.all([Promise.race([document.fonts.ready,new Promise(function(r){setTimeout(r,3000)})])].concat([].slice.call(document.images).map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r})}))).then(function(){m=BWMotion.montar(document.getElementById("palco"),P,{recorte:' + JSON.stringify(op.recorte || "") + '});m.seek(0)});' +
      '})();<\/script></body></html>';
  }

  window.BWMotion = { corFiltro: corFiltro, VERSAO: VERSAO, ITENS: ITENS, EFEITOS: EFEITOS, LOOPS: LOOPS, EASE: EASE, NOMES_EASE: NOMES_EASE, FUNDOS: FUNDOS, CHROMA: CHROMA, FORMATOS: FORMATOS,
    LINK_FONTES: LINK_FONTES, novoProjeto: novoProjeto, novoItem: novoItem, montar: montar, valorKeys: valorKeys, auto: auto, efeitoPorTexto: efeitoPorTexto,
    limparEfeito: limparEfeito, efeitoProprio: efeitoProprio, html: html, imgOk: imgOk, uid: uid, clone: clone };
})();
