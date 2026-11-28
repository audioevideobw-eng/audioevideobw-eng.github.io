/* PRESS KIT (25/11/2026, Claude — pedido do dono: "modelos padrões profissionais para o usuário criar o seu, gera PDF e editável").
   O que é: o pacote que a empresa, o artista ou o evento entrega para imprensa, clientes e parceiros (quem é, números, serviços, fotos,
   clientes, depoimentos, release, imprensa, agenda, ficha técnica e contato).
   - 6 MODELOS profissionais (corporativo, produtora audiovisual, artista/EPK, evento, editorial, minimalista) que já abrem com um exemplo completo
     da "Produtora Exemplo" (pessoas e empresas inventadas) — a pessoa troca pelos dados dela, liga/desliga e reordena as seções.
   - UM modelo só (modelo()) alimenta o PDF (pdfMake, texto selecionável, fontes Montserrat/Playfair embutidas) e o WORD (.docx editável).
     A PRÉVIA é o próprio PDF desenhado pelo pdf.js — o que aparece na tela é o que sai no arquivo (regra 57).
   - Dados da conta: mkt_presskit (só textos, em CHAVES do bw-sync). Fotos e logo ficam no IndexedDB do aparelho E (desde 28/11) na pasta privada da conta pelo assets/presskit-nuvem.js.
   - IA: só a IA Brightway (bw-ia), recebe só o texto que a pessoa digitou; nunca troca nome, números ou datas (regra 54). Nada sai sozinho. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var FN_TXT = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var LIB = {
    pdf: ["https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js", "https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js"],
    docx: ["https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.js"],
    qr: ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"],
    zip: ["assets/jszip.min.js"]
  };
  var PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
  var CHAVE = "mkt_presskit";
  var W = 595.28, H = 841.89, MX = 50, CW = W - 2 * MX;

  /* ================= DADOS (conta) ================= */
  function lista() { try { var v = JSON.parse(localStorage.getItem("bw_" + CHAVE + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravarLista(v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(CHAVE, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + CHAVE + "_v1", JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function acharKit(id) { return lista().filter(function (k) { return k.id === id; })[0] || null; }
  function salvarKit(k) { k.atualizado = new Date().toISOString(); var l = lista(), i = l.findIndex(function (x) { return x.id === k.id; }); if (i >= 0) l[i] = k; else l.push(k); gravarLista(l); }
  function uid() { return "pk" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ================= IMAGENS (só no aparelho) ================= */
  var _db = null;
  function db() {
    if (_db) return _db;
    _db = new Promise(function (ok, erro) {
      var r = indexedDB.open("bw_presskit", 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("imgs")) d.createObjectStore("imgs"); if (!d.objectStoreNames.contains("thumbs")) d.createObjectStore("thumbs"); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); };
    });
    return _db;
  }
  async function idbGet(loja, k) { try { var d = await db(); return await new Promise(function (ok) { var t = d.transaction(loja, "readonly").objectStore(loja).get(k); t.onsuccess = function () { ok(t.result || null); }; t.onerror = function () { ok(null); }; }); } catch (e) { return null; } }
  async function idbPut(loja, k, v) { try { var d = await db(); await new Promise(function (ok, erro) { var t = d.transaction(loja, "readwrite"); t.objectStore(loja).put(v, k); t.oncomplete = ok; t.onerror = function () { erro(t.error); }; }); return true; } catch (e) { return false; } }
  async function idbDel(loja, k) { try { var d = await db(); await new Promise(function (ok) { var t = d.transaction(loja, "readwrite"); t.objectStore(loja).delete(k); t.oncomplete = ok; t.onerror = ok; }); } catch (e) { } }
  function imgsVazias() { return { logo: "", capa: "", retrato: "", fotos: [], cards: {} }; }

  function imgDe(src) { return new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { erro(new Error("imagem")); }; i.src = src; }); }
  /* arquivo escolhido → copiado na hora para a memória (regra 47) e reduzido; logo PNG fica PNG (transparência, regra 59) */
  async function arquivoParaUrl(file, max, manterPng) {
    var buf = await file.arrayBuffer(), blob = new Blob([buf], { type: file.type || "image/jpeg" }), u = URL.createObjectURL(blob);
    try {
      var im = await imgDe(u), s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      var x = c.getContext("2d"), png = manterPng && /png|webp|gif|svg/.test(file.type || "");
      if (!png) { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(im, 0, 0, c.width, c.height);
      return png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88);
    } finally { URL.revokeObjectURL(u); }
  }
  /* recorte "cobrir" no tamanho exato (o PDF não distorce) + escurecido opcional para texto por cima */
  var CORTES = {};
  async function recortar(src, w, h, op) {
    if (!src) return "";
    op = op || {};
    var k = src.length + "|" + src.slice(-48) + "|" + w + "x" + h + "|" + JSON.stringify(op);
    if (CORTES[k]) return CORTES[k];
    var im = await imgDe(src), c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h);
    var x = c.getContext("2d"), s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight) * Math.max(1, +op.z || 1), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    if (op.forma) {   /* foto redonda ou em arco: recorte no próprio canvas (o PDF não recorta imagem) */
      x.beginPath();
      if (op.forma === "circulo") x.arc(c.width / 2, c.height / 2, Math.min(c.width, c.height) / 2, 0, Math.PI * 2);
      else { var ra = c.width / 2; x.moveTo(0, c.height); x.lineTo(0, ra); x.arc(ra, ra, ra, Math.PI, 0); x.lineTo(c.width, c.height); x.closePath(); }
      x.clip();
    }
    x.drawImage(im, (c.width - dw) * (op.fx == null ? 0.5 : op.fx), (c.height - dh) * (op.fy == null ? 0.5 : op.fy), dw, dh);
    if (temAj(op.aj)) aplicarAj(x, c.width, c.height, op.aj);
    if (op.duo) duotom(x, c.width, c.height, op.duo[0], op.duo[1]);
    if (op.efx) aplicarEfx(c, x, op.efx, !!op.forma);
    if (op.escurecer) {
      var g = op.dir === "esq" ? x.createLinearGradient(0, 0, c.width, 0) : x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, "rgba(6,8,13," + (op.dir === "esq" ? op.escurecer : op.escurecer * 0.35) + ")");
      g.addColorStop(0.45, "rgba(6,8,13," + op.escurecer * 0.25 + ")");
      g.addColorStop(1, "rgba(6,8,13," + (op.dir === "esq" ? 0.05 : op.escurecer) + ")");
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    }
    var u = op.forma || op.png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", op.q || 0.86);
    var ks = Object.keys(CORTES); if (ks.length > 60) delete CORTES[ks[0]];
    return (CORTES[k] = u);
  }
  /* ENQUADRAR E AJUSTAR (posição, tamanho, exposição…): a MESMA conta vale para a prévia da janela e para o PDF.
     Feito por pixel (sem ctx.filter, que o Safari do iPhone não tem); o transparente do PNG fica como está. */
  var AJUSTES = [["ex", "☀ Exposição"], ["br", "◐ Brilho"], ["ct", "◑ Contraste"], ["sa", "🎨 Saturação"], ["te", "🌡 Temperatura"], ["so", "▾ Sombras"]];
  function temAj(aj) { return !!aj && AJUSTES.some(function (a) { return +aj[a[0]]; }); }
  function aplicarAj(x, w, h, aj) {
    var im = x.getImageData(0, 0, w, h), p = im.data, ex = Math.pow(2, (+aj.ex || 0) / 100), br = (+aj.br || 0) * 0.9, ct = (+aj.ct || 0) / 100,
      cf = ct >= 0 ? 1 + ct * 1.4 : 1 + ct * 0.85, sa = 1 + (+aj.sa || 0) / 100, te = (+aj.te || 0) * 0.32, so = (+aj.so || 0) / 100;
    for (var i = 0; i < p.length; i += 4) {
      var r = p[i] * ex + br + te, g = p[i + 1] * ex + br, b = p[i + 2] * ex + br - te;
      if (so) { var lu = (0.299 * r + 0.587 * g + 0.114 * b) / 255, pe = so * Math.pow(Math.max(0, 1 - lu), 2) * 90; r += pe; g += pe; b += pe; }
      r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; b = (b - 128) * cf + 128;
      var l = 0.299 * r + 0.587 * g + 0.114 * b; r = l + (r - l) * sa; g = l + (g - l) * sa; b = l + (b - l) * sa;
      p[i] = r < 0 ? 0 : r > 255 ? 255 : r; p[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; p[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    x.putImageData(im, 0, 0);
  }
  /* 28/11 (dono: "efeitos nas fotos da capa — mistura e máscara com o fundo, opacidade"): a foto é desenhada sobre a cor escolhida (fundo da página,
     destaque, 2ª cor, preto ou branco) com MISTURA (modos do canvas, valem no iPhone), OPACIDADE e MÁSCARA que some suave. Mesma conta na janela e no PDF. */
  var MISTURAS = { normal: ["Normal", "source-over"], mult: ["Multiplicar", "multiply"], tela: ["Tela", "screen"], sobrepor: ["Sobrepor", "overlay"], suave: ["Luz suave", "soft-light"],
    forte: ["Luz forte", "hard-light"], escurecer: ["Escurecer", "darken"], clarear: ["Clarear", "lighten"], lumi: ["Luminosidade", "luminosity"], dif: ["Diferença", "difference"] };
  var MASCARAS = { nenhuma: "Sem máscara", baixo: "Some embaixo", topo: "Some em cima", esq: "Some à esquerda", dir: "Some à direita", bordas: "Some nas bordas", circulo: "Círculo", diagonal: "Diagonal" };
  var CORES_FX = { fundo: "Fundo da página", destaque: "Cor de destaque", cor2: "2ª cor", preto: "Preto", branco: "Branco" };
  function coresDe(kit) { var mod = modeloDe(kit && kit.modelo), e = (kit && kit.est) || {}; return { fundo: /^#[0-9a-f]{6}$/i.test(e.fundo || "") ? e.fundo : mod.tema.fundo, destaque: (kit && kit.cor) || mod.cor, cor2: (kit && kit.cor2) || mod.cor2, preto: "#000000", branco: "#FFFFFF" }; }
  function fxNeutro(f) { return !f || ((!f.m || f.m === "normal") && (f.o == null || +f.o >= 100) && (!f.k || f.k === "nenhuma")); }
  function aplicarEfx(c, x, f, forma) {
    var w = c.width, h = c.height, P = document.createElement("canvas"); P.width = w; P.height = h; var px = P.getContext("2d"); px.drawImage(c, 0, 0);
    var sv = Math.max(0.05, Math.min(1, (f.s == null ? 50 : +f.s) / 100)), g = null;
    if (f.k && f.k !== "nenhuma") {
      if (f.k === "baixo") { g = px.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#000"); g.addColorStop(Math.max(0, 1 - sv), "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else if (f.k === "topo") { g = px.createLinearGradient(0, h, 0, 0); g.addColorStop(0, "#000"); g.addColorStop(Math.max(0, 1 - sv), "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else if (f.k === "esq") { g = px.createLinearGradient(w, 0, 0, 0); g.addColorStop(0, "#000"); g.addColorStop(Math.max(0, 1 - sv), "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else if (f.k === "dir") { g = px.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "#000"); g.addColorStop(Math.max(0, 1 - sv), "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else if (f.k === "diagonal") { g = px.createLinearGradient(0, 0, w, h); g.addColorStop(0, "#000"); g.addColorStop(Math.max(0, 0.5 - sv / 2), "#000"); g.addColorStop(Math.min(1, 0.5 + sv / 2), "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      else { var R = f.k === "circulo" ? Math.min(w, h) / 2 : Math.hypot(w, h) / 2; g = px.createRadialGradient(w / 2, h / 2, R * Math.max(0, 1 - sv) * (f.k === "circulo" ? 0.98 : 0.75), w / 2, h / 2, R * (f.k === "circulo" ? 1 : 0.95)); g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)"); }
      px.globalCompositeOperation = "destination-in"; px.fillStyle = g; px.fillRect(0, 0, w, h); px.globalCompositeOperation = "source-over";
    }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
    if (forma) x.clearRect(0, 0, w, h);
    x.fillStyle = f.cor || "#000000"; x.fillRect(0, 0, w, h);
    x.globalAlpha = Math.max(0.05, Math.min(1, (f.o == null ? 100 : +f.o) / 100)); x.globalCompositeOperation = (MISTURAS[f.m] || MISTURAS.normal)[1];
    x.drawImage(P, 0, 0); x.restore();
  }
  /* duotom: a luz da foto vira a mistura entre duas cores (sombra → destaque) */
  function duotom(x, w, h, c1, c2) {
    var a = hexRgb(c1), b = hexRgb(c2), im = x.getImageData(0, 0, w, h), p = im.data;
    for (var i = 0; i < p.length; i += 4) { var l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255; l = l * l * (3 - 2 * l); p[i] = a[0] + (b[0] - a[0]) * l; p[i + 1] = a[1] + (b[1] - a[1]) * l; p[i + 2] = a[2] + (b[2] - a[2]) * l; }
    x.putImageData(im, 0, 0);
  }
  /* foto inteira (a recortada, PNG) só com a cor ajustada, sem cortar */
  async function ajustarImg(src, aj) {
    if (!src || !temAj(aj)) return src;
    var k = "a" + src.length + "|" + src.slice(-48) + "|" + JSON.stringify(aj); if (CORTES[k]) return CORTES[k];
    var im = await imgDe(src), c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var x = c.getContext("2d"); x.drawImage(im, 0, 0); aplicarAj(x, c.width, c.height, aj);
    return (CORTES[k] = c.toDataURL("image/png"));
  }
  function enqOpC(cr, e, op) { op = enqOp(e, op); if (e && !fxNeutro(e.fx)) { var f = e.fx; op.efx = { m: f.m || "normal", o: f.o == null ? 100 : +f.o, k: f.k || "nenhuma", s: f.s == null ? 50 : +f.s, cor: (cr || {})[f.c || "fundo"] || "#000000" }; } return op; }
  function enqOp(e, op) { op = Object.assign({}, op || {}); if (e) { if (e.x != null) op.fx = +e.x; if (e.y != null) op.fy = +e.y; if (+e.z > 1) op.z = +e.z; if (temAj(e.aj)) op.aj = e.aj; } return op; }
  /* tamanho do corte de cada lugar (em pontos do PDF) — usado no PDF e na janela ENQUADRAR */
  function corteCapa(cap, G, t) {
    var W = G.W, H = G.H, cp = (t && t.corPura) || "#E8B54A";
    if (cap === "foto") return [W, H, { escurecer: 0.82 }];
    if (cap === "revista") return [W, H, { escurecer: 0.62 }];
    if (cap === "duotom") return [W, H, { duo: [misturar(cp, "#000000", 0.82), misturar(cp, "#FFFFFF", 0.45)] }];
    if (cap === "compcard") return [W, H, { escurecer: 0.55 }];
    if (cap === "dividida") return [250, H, {}];
    if (cap === "diagonal") return [W * 0.62, H, {}];
    if (cap === "faixa") return [W, H * 0.6, {}];
    if (cap === "circulo") return [W * 0.56, W * 0.56, { forma: "circulo" }];
    if (cap === "arco") return [W * 0.6, H * 0.54, { forma: "arco" }];
    if (cap === "moldura") return [420, 300, {}];
    if (cap === "recorte") return [W * 0.5, H, { escurecer: 0.3, dir: "esq" }];
    return [G.CW, Math.min(250, H * 0.3), {}];
  }
  function corteFoto(cap, G, i) { return cap === "compcard" ? [180, 225] : i === 0 ? [G.CW, G.CW * 0.525] : [160, 110]; }
  async function reduzir(src, max) {
    if (!src) return "";
    var k = "r" + src.length + "|" + src.slice(-48) + "|" + max; if (CORTES[k]) return CORTES[k];
    var im = await imgDe(src), s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    if (s >= 1) return (CORTES[k] = src);
    var c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    return (CORTES[k] = /^data:image\/png/.test(src) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86));
  }
  function proporcao(src) { return imgDe(src).then(function (im) { return im.naturalWidth / Math.max(1, im.naturalHeight); }).catch(function () { return 2; }); }

  /* fotos de EXEMPLO desenhadas no aparelho — palco/luzes e RETRATOS em silhueta (pessoa inventada, sem rosto real), nas cores da marca (regra 237) */
  var EXEMPLOS_IMG = {};
  function aleat(s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function fotoExemplo(seed, tons) {
    var k = seed + "|" + tons.join(","); if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 1600; c.height = 1000;
    var x = c.getContext("2d"), r = aleat(seed * 7 + 3);
    var g = x.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, "#0B1222"); g.addColorStop(1, "#142544"); x.fillStyle = g; x.fillRect(0, 0, 1600, 1000);
    x.globalCompositeOperation = "lighter";
    for (var i = 0; i < 5; i++) {   /* feixes de luz do palco */
      var cx = 180 + i * 310 + r() * 60, cor = tons[i % tons.length];
      var gr = x.createLinearGradient(cx, 0, cx + (r() - 0.5) * 300, 820); gr.addColorStop(0, cor + "cc"); gr.addColorStop(1, cor + "00");
      x.fillStyle = gr; x.beginPath(); x.moveTo(cx - 14, 0); x.lineTo(cx + 14, 0); x.lineTo(cx + 170 + (r() - 0.5) * 200, 820); x.lineTo(cx - 170 + (r() - 0.5) * 200, 820); x.closePath(); x.fill();
    }
    for (var b = 0; b < 46; b++) {   /* bokeh */
      var bx = r() * 1600, by = r() * 700, br = 10 + r() * 46, bc = tons[b % tons.length], gb = x.createRadialGradient(bx, by, 0, bx, by, br);
      gb.addColorStop(0, bc + "88"); gb.addColorStop(1, bc + "00"); x.fillStyle = gb; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
    }
    x.globalCompositeOperation = "source-over";
    var tela = x.createLinearGradient(0, 380, 0, 640); tela.addColorStop(0, tons[0] + "55"); tela.addColorStop(1, tons[1 % tons.length] + "22");
    x.fillStyle = tela; x.fillRect(470, 360, 660, 300); x.strokeStyle = "rgba(245,241,234,.35)"; x.lineWidth = 3; x.strokeRect(470, 360, 660, 300);
    x.fillStyle = "#05070c";
    for (var p = 0; p < 34; p++) { var px = p * 50 - 20 + r() * 20, py = 880 + r() * 50, pr = 34 + r() * 16; x.beginPath(); x.arc(px, py - pr * 1.4, pr * 0.62, 0, 7); x.fill(); x.beginPath(); x.ellipse(px, py + 40, pr * 1.1, pr * 1.5, 0, 0, 7); x.fill(); }
    x.fillRect(0, 940, 1600, 60);
    return (EXEMPLOS_IMG[k] = c.toDataURL("image/jpeg", 0.85));
  }
  /* pessoa em silhueta com luz de recorte (retrato de estúdio inventado). fundo = null → PNG recortado (como a foto sem fundo do "Quem sou eu?") */
  function pessoa(x, cx, base, esc, cab, roupa, luz) {
    x.save(); x.translate(cx, base); x.scale(esc, esc);
    x.fillStyle = roupa; x.beginPath(); x.moveTo(-250, 0); x.bezierCurveTo(-240, -230, -150, -300, -70, -320); x.lineTo(70, -320); x.bezierCurveTo(150, -300, 240, -230, 250, 0); x.closePath(); x.fill();
    x.fillStyle = "#2a1d17"; x.fillRect(-42, -380, 84, 80);
    x.beginPath(); x.ellipse(0, -470, 92, 118, 0, 0, 7); x.fill();
    x.fillStyle = cab; x.beginPath(); x.ellipse(0, -540, 104, 72, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(-70, -500, 40, 70, 0.3, 0, 7); x.fill();
    if (luz) { x.globalCompositeOperation = "source-atop"; var g = x.createLinearGradient(-260, 0, 260, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.72, "rgba(0,0,0,0)"); g.addColorStop(1, luz); x.fillStyle = g; x.fillRect(-300, -700, 600, 720); x.globalCompositeOperation = "source-over"; }
    x.restore();
  }
  function retratoExemplo(seed, tons, recorte) {
    var k = "ret|" + seed + "|" + tons.join(",") + "|" + !!recorte; if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 1000; c.height = 1250; var x = c.getContext("2d"), r = aleat(seed * 13 + 5);
    if (!recorte) {
      var g = x.createRadialGradient(620, 420, 60, 520, 620, 900); g.addColorStop(0, tons[0] + "aa"); g.addColorStop(0.55, "#142544"); g.addColorStop(1, "#0B1222"); x.fillStyle = g; x.fillRect(0, 0, 1000, 1250);
      x.globalCompositeOperation = "lighter";
      for (var b = 0; b < 26; b++) { var bx = r() * 1000, by = r() * 700, br = 12 + r() * 40, gb = x.createRadialGradient(bx, by, 0, bx, by, br); gb.addColorStop(0, tons[b % tons.length] + "77"); gb.addColorStop(1, tons[b % tons.length] + "00"); x.fillStyle = gb; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
      x.globalCompositeOperation = "source-over";
    }
    pessoa(x, 520, 1250, 1.75, "#1b130f", recorte ? tons[1 % tons.length] : "#0d1424", tons[0] + "dd");
    return (EXEMPLOS_IMG[k] = recorte ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86));
  }
  function logoExemplo(texto, cor) {
    var k = "logo|" + texto + cor; if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 900; c.height = 300; var x = c.getContext("2d");
    x.fillStyle = cor; x.beginPath(); x.arc(150, 150, 120, 0, 7); x.fill();
    x.fillStyle = "#0B1222"; x.font = "800 120px Inter, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto.slice(0, 2).toUpperCase(), 150, 158);
    x.fillStyle = cor; x.textAlign = "left"; x.font = "800 82px Inter, Arial, sans-serif"; x.fillText(texto.toUpperCase().slice(0, 9), 300, 158);
    return (EXEMPLOS_IMG[k] = c.toDataURL("image/png"));
  }

  /* ================= SEÇÕES E MODELOS (25/11, dono: "algo mais PESSOAL — atores, colaboradores freelancer… modelos para apresentação pessoal") =================
     Estrutura tirada do jeito que o dono monta o portfólio dele: QUEM SOU EU (com a foto recortada) → o que faço (com fotos) → galeria →
     TV, publicidade e eventos com link → PORTFÓLIO com botões (vídeos, fotos…) → contato com as redes. Nenhum conteúdo dele entra nos modelos. */
  var SECOES = {
    sobre: { nome: "Quem sou eu", ico: "👋" }, perfil: { nome: "Perfil", ico: "🪪" }, servicos: { nome: "O que eu faço", ico: "🧰" },
    numeros: { nome: "Em números", ico: "📊" }, experiencia: { nome: "Trabalhos", ico: "🎬" }, galeria: { nome: "Galeria de fotos", ico: "🖼" },
    links: { nome: "Portfólio", ico: "▶" }, clientes: { nome: "Já trabalhei com", ico: "🤝" }, depoimentos: { nome: "Recomendações", ico: "💬" },
    formacao: { nome: "Formação", ico: "🎓" }, habilidades: { nome: "Habilidades", ico: "✨" }, release: { nome: "Release", ico: "📰" },
    imprensa: { nome: "Na imprensa", ico: "🗞" }, agenda: { nome: "Agenda", ico: "📅" }, rider: { nome: "Ficha técnica", ico: "🎛" }, contato: { nome: "Contato", ico: "📞" }
  };
  var TODAS = Object.keys(SECOES);
  var FONTES_TIT = { MO: "Montserrat", PF: "Playfair", Roboto: "Roboto" };
  var FORMATOS = { a4: "A4 (impressão e e-mail)", rede: "Vertical 4:5 (celular e redes)" };
  var ANO = new Date().getFullYear();

  function base(extra) {
    return Object.assign({ marca: "", slogan: "", etiqueta: "APRESENTAÇÃO PESSOAL", cidade: "", sobreCurto: "", sobre: "", perfil: [], servicos: [], numeros: [], experiencia: [], links: [],
      clientes: "", depoimentos: [], formacao: [], habilidades: "", release: { titulo: "", data: "", texto: "" }, imprensa: [], agenda: [], rider: "", riderObs: "", galeriaLegenda: "",
      contato: { resp: "", cargo: "", tel: "", email: "", site: "", insta: "", tiktok: "", youtube: "", cidade: "" } }, extra || {});
  }
  var EX = {
    ator: function () {
      return base({ marca: "Clara Monteiro", slogan: "Atriz · Teatro, TV e publicidade", cidade: "Belo Horizonte · MG",
        sobreCurto: "Atriz com 10 anos de palco, à vontade em frente à câmera e no improviso.",
        sobre: "Clara começou no teatro de grupo e hoje divide o tempo entre peças, séries e campanhas publicitárias. Gosta de personagens com humor e emoção na mesma cena.\n\nEstudou interpretação para câmera e tem experiência com gravação de comerciais, dublagem e apresentação de eventos.",
        perfil: [{ k: "Registro profissional", v: "DRT 00000/MG (exemplo)" }, { k: "Altura", v: "1,68 m" }, { k: "Idiomas", v: "Português, inglês e espanhol" }, { k: "Disponível para", v: "Viagens e gravações noturnas" }],
        experiencia: [{ grupo: "TV e streaming", titulo: "Série Caminhos de Minas", papel: "Personagem fixa (Lúcia)", onde: "Canal Exemplo", ano: ANO - 1 + "", link: "youtube.com/exemplo" },
          { grupo: "TV e streaming", titulo: "Programa Tarde Boa", papel: "Quadro de humor", onde: "TV Exemplo", ano: ANO - 2 + "", link: "" },
          { grupo: "Publicidade", titulo: "Campanha de verão", papel: "Protagonista", onde: "Banco Aurora", ano: ANO + "", link: "youtube.com/exemplo" },
          { grupo: "Teatro", titulo: "A Casa das Janelas", papel: "Dora", onde: "Teatro Municipal", ano: ANO - 3 + "", link: "" }],
        formacao: [{ ano: "2016", curso: "Formação de atores", onde: "Escola de Teatro Exemplo" }, { ano: "2019", curso: "Interpretação para câmera", onde: "Estúdio Cena Viva" }],
        habilidades: "Improviso\nCanto (mezzo)\nDança de salão\nDublagem\nApresentação de eventos\nSotaques regionais",
        links: [{ rot: "Vídeo de apresentação", url: "youtube.com/exemplo" }, { rot: "Cenas e trabalhos", url: "vimeo.com/exemplo" }, { rot: "Book de fotos", url: "drive.google.com/exemplo" }],
        contato: { resp: "Agência Talento Exemplo", cargo: "Agenciamento", tel: "(31) 90000-0010", email: "clara@exemplo.com.br", site: "", insta: "@claramonteiro.atriz", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    vip: function () {
      return base({ marca: "Zeca Prado", slogan: "Humorista · Apresentador · Presença VIP", etiqueta: "PORTFÓLIO", cidade: "Belo Horizonte · MG",
        sobreCurto: "Humorista e apresentador que leva alegria para palcos, telas e campanhas de marcas.",
        sobre: "Radialista há 20 anos, Zeca ganhou o público com personagens próprios nas redes sociais e na TV. Hoje é presença confirmada em eventos, ações de marcas e comerciais.\n\nNo palco ou na frente da câmera, entrega naturalidade, conteúdo para as redes e muito bom humor.",
        servicos: [{ t: "Presença VIP em eventos", d: "Inaugurações, feiras, premiações e eventos corporativos: atrai público, gera conteúdo e valoriza a marca." },
          { t: "Comerciais", d: "Campanhas para TV, redes sociais e mídia impressa, com interpretação natural e entrega no prazo." },
          { t: "Marcas e lojas", d: "Conteúdo digital (fotos, vídeos e stories), divulgação nos perfis e participação em ações promocionais." }],
        numeros: [{ v: "20 anos", r: "de rádio e palco" }, { v: "+150", r: "eventos realizados" }, { v: "300 mil", r: "seguidores nas redes" }],
        experiencia: [{ grupo: "TV e publicidade", titulo: "Programa Domingo Leve", papel: "Quadro de humor", onde: "TV Exemplo", ano: "", link: "youtube.com/exemplo" },
          { grupo: "TV e publicidade", titulo: "Campanha Natal Feliz", papel: "Protagonista", onde: "Loja Exemplo", ano: "", link: "instagram.com/exemplo" },
          { grupo: "Eventos realizados", titulo: "Desfile de Carnaval", papel: "Destaque da comissão de frente", onde: "Belo Horizonte", ano: "", link: "" },
          { grupo: "Eventos realizados", titulo: "Convenção de vendas", papel: "Mestre de cerimônias", onde: "São Paulo", ano: "", link: "youtube.com/exemplo" }],
        links: [{ rot: "Apresentação", url: "youtube.com/exemplo" }, { rot: "Personagens", url: "instagram.com/exemplo" }, { rot: "Vídeos", url: "youtube.com/exemplo" }, { rot: "Fotos", url: "drive.google.com/exemplo" }],
        contato: { resp: "Zeca Prado", cargo: "Contratação direta", tel: "(31) 90000-0020", email: "contato@zecaprado.com.br", site: "", insta: "@zecaprado", tiktok: "@zecaprado", youtube: "@zecaprado", cidade: "Belo Horizonte · MG" } });
    },
    freela: function () {
      return base({ marca: "Rafael Souza", slogan: "Cinegrafista e editor de vídeo freelancer", cidade: "Belo Horizonte · MG",
        sobreCurto: "Câmera, luz e edição para eventos, marcas e produtoras — com equipamento próprio.",
        sobre: "Trabalho como cinegrafista e editor há 9 anos, cobrindo eventos corporativos, shows e campanhas. Chego com o equipamento revisado, combino o roteiro antes e entrego no prazo.\n\nAtendo produtoras que precisam reforçar a equipe e empresas que querem um profissional só para o projeto.",
        servicos: [{ t: "Câmera em eventos", d: "Operação de câmera em palco, entrevistas e bastidores." }, { t: "Edição e cor", d: "Vídeo resumo, reels e versões para redes no mesmo pacote." },
          { t: "Transmissão ao vivo", d: "Operação de câmera ou de corte em transmissões com várias câmeras." }, { t: "Drone", d: "Imagens aéreas com piloto habilitado." }],
        numeros: [{ v: "9 anos", r: "de mercado" }, { v: "+400", r: "eventos filmados" }, { v: "48 h", r: "para o vídeo resumo" }],
        experiencia: [{ grupo: "Trabalhos recentes", titulo: "Congresso de Inovação", papel: "Câmera e edição", onde: "Produtora Exemplo", ano: ANO + "", link: "vimeo.com/exemplo" },
          { grupo: "Trabalhos recentes", titulo: "Festival Exemplo", papel: "Operador de câmera", onde: "Festival Exemplo", ano: ANO + "", link: "" },
          { grupo: "Trabalhos recentes", titulo: "Lançamento de produto", papel: "Direção de fotografia", onde: "Grupo Vértice", ano: ANO - 1 + "", link: "vimeo.com/exemplo" }],
        clientes: "Produtora Exemplo\nBanco Aurora\nGrupo Vértice\nFestival Exemplo\nRede Saúde Viva\nAgência Ponto Alto",
        depoimentos: [{ texto: "O Rafael chega antes, resolve sem fazer barulho e o material sai lindo. É o primeiro que eu chamo.", autor: "Paula Martins", cargo: "Produtora · Produtora Exemplo" }],
        rider: "2 câmeras 4K com lentes de 16 a 200 mm\nEstabilizador (gimbal)\nKit de luz LED com bateria\nMicrofones sem fio (2)\nDrone com piloto habilitado",
        links: [{ rot: "Reel de trabalhos", url: "vimeo.com/exemplo" }, { rot: "Vídeos completos", url: "youtube.com/exemplo" }],
        contato: { resp: "Rafael Souza", cargo: "Cinegrafista e editor", tel: "(31) 90000-0030", email: "rafael@exemplo.com.br", site: "rafaelsouza.com.br", insta: "@rafaelsouza.video", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    musico: function () {
      return base({ marca: "DJ Luna Vale", slogan: "House e música brasileira para pistas que não param.", etiqueta: "PRESS KIT " + ANO, cidade: "Belo Horizonte · MG",
        sobreCurto: "DJ e produtora mineira que mistura house com música brasileira.",
        sobre: "Luna Vale começou tocando em festas de amigos e hoje leva o seu som para casamentos, festivais e eventos de marcas. O repertório junta clássicos da MPB em versões dançantes com o melhor do house atual.\n\nCada apresentação é pensada para o público da noite: ela conversa com o contratante antes, monta a linha do tempo da festa e ajusta o som na hora.",
        numeros: [{ v: "+150", r: "apresentações" }, { v: "35 mil", r: "ouvintes por mês" }, { v: "8", r: "festivais em " + ANO }],
        release: { titulo: "DJ Luna Vale lança set ao vivo gravado no Festival Exemplo", data: "Novembro de " + ANO, texto: "A DJ mineira Luna Vale lança nesta sexta o set gravado ao vivo no Festival Exemplo, com duas horas de house e releituras de música brasileira.\n\nO material sai em vídeo e áudio e marca o início da turnê de verão, que passa por cinco cidades." },
        imprensa: [{ veiculo: "Revista Pista", titulo: "As DJs que estão renovando a noite mineira", data: "Setembro de " + ANO, link: "" }],
        agenda: [{ data: "06/12", titulo: "Festival Exemplo", local: "Belo Horizonte · MG" }, { data: "20/12", titulo: "Réveillon na Praia", local: "Porto Seguro · BA" }, { data: "10/01", titulo: "Verão Sonoro", local: "Florianópolis · SC" }],
        rider: "Mixer de 4 canais\n2 CDJs de última geração com USB\nMonitor de retorno na cabine\nMesa firme de 1,8 m\nCamarim com água e frutas", riderObs: "Passagem de som: 1 hora antes da apresentação.",
        links: [{ rot: "Ouvir os sets", url: "soundcloud.com/exemplo" }, { rot: "Vídeo ao vivo", url: "youtube.com/exemplo" }],
        contato: { resp: "Bruno Assis", cargo: "Agenda e contratação", tel: "(31) 90000-0001", email: "agenda@lunavale.com.br", site: "lunavale.com.br", insta: "@djlunavale", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    criador: function () {
      return base({ marca: "Bia Ramos", slogan: "Criadora de conteúdo · Moda, viagem e bem-estar", etiqueta: "MÍDIA KIT " + ANO, cidade: "São Paulo · SP",
        sobreCurto: "Conteúdo leve e verdadeiro para quem gosta de moda acessível e viagens curtas.",
        sobre: "Bia cria conteúdo há 6 anos e fala com um público jovem, de 18 a 34 anos, que confia nas indicações dela. Trabalha com campanhas, presença em eventos e ensaios para marcas.\n\nCada parceria tem roteiro aprovado antes e relatório de resultados no fim.",
        numeros: [{ v: "180 mil", r: "seguidores no Instagram" }, { v: "95 mil", r: "no TikTok" }, { v: "6,2%", r: "de engajamento médio" }, { v: "72%", r: "público feminino" }, { v: "18–34", r: "faixa principal" }, { v: "SP · RJ · MG", r: "maiores cidades" }],
        perfil: [{ k: "Altura", v: "1,70 m" }, { k: "Manequim", v: "38" }, { k: "Formatos", v: "Reels, stories, TikTok, fotos" }],
        clientes: "Loja Exemplo\nMarca Bem Viver\nHotel Serra Azul\nCosméticos Aurora\nApp Viaje Mais",
        links: [{ rot: "Instagram", url: "instagram.com/exemplo" }, { rot: "TikTok", url: "tiktok.com/@exemplo" }, { rot: "Campanhas", url: "drive.google.com/exemplo" }],
        contato: { resp: "Bia Ramos", cargo: "Parcerias e publicidade", tel: "(11) 90000-0040", email: "parcerias@biaramos.com.br", site: "", insta: "@biaramos", tiktok: "@biaramos", youtube: "", cidade: "São Paulo · SP" } });
    },
    moda: function () {
      return base({ marca: "Luiza Ferraz", slogan: "Modelo · Moda e publicidade", etiqueta: "COMP CARD", cidade: "São Paulo · SP",
        perfil: [{ k: "Altura", v: "1,77 m" }, { k: "Busto", v: "84" }, { k: "Cintura", v: "62" }, { k: "Quadril", v: "90" }, { k: "Manequim", v: "36" }, { k: "Sapato", v: "38" }, { k: "Cabelo", v: "Castanho" }, { k: "Olhos", v: "Verdes" }],
        links: [{ rot: "Book completo", url: "drive.google.com/exemplo" }],
        contato: { resp: "Agência Modelo Exemplo", cargo: "Booking", tel: "(11) 90000-0060", email: "booking@exemplo.com.br", site: "", insta: "@luizaferraz", tiktok: "", youtube: "", cidade: "São Paulo · SP" } });
    },
    palestra: function () {
      return base({ marca: "Marina Duarte", slogan: "Palestrante · Liderança e comunicação em equipes", etiqueta: "PALESTRANTE", cidade: "Curitiba · PR",
        sobreCurto: "Ajuda equipes a conversarem melhor — e a decidirem mais rápido.",
        sobre: "Marina liderou times de atendimento por 15 anos antes de virar consultora. Nas palestras, mistura histórias reais com exercícios rápidos que a plateia faz na hora.\n\nFala para convenções, semanas internas e eventos de RH, presencial ou online.",
        servicos: [{ t: "Conversas que resolvem", d: "Como dar e receber retorno sem desgaste. 50 min + perguntas." }, { t: "Líder de primeira viagem", d: "Os 5 hábitos que mudam a rotina de quem acabou de assumir uma equipe." }, { t: "Equipe que decide", d: "Workshop prático de 3 horas com dinâmicas em grupo." }],
        numeros: [{ v: "+300", r: "palestras" }, { v: "60 mil", r: "pessoas na plateia" }, { v: "4,9", r: "nota média das avaliações" }],
        experiencia: [{ grupo: "Onde já palestrou", titulo: "Convenção Nacional de Vendas", papel: "Palestra de abertura", onde: "Grupo Vértice", ano: ANO + "", link: "youtube.com/exemplo" },
          { grupo: "Onde já palestrou", titulo: "Semana do RH", papel: "Workshop", onde: "Rede Saúde Viva", ano: ANO - 1 + "", link: "" }],
        depoimentos: [{ texto: "A equipe saiu falando da palestra por semanas. Prática, leve e com resultado.", autor: "Ricardo Lemos", cargo: "Diretor de marketing · Grupo Vértice" }],
        links: [{ rot: "Trecho da palestra", url: "youtube.com/exemplo" }, { rot: "Site e agenda", url: "marinaduarte.com.br" }],
        contato: { resp: "Marina Duarte", cargo: "Contratação de palestras", tel: "(41) 90000-0070", email: "contato@marinaduarte.com.br", site: "marinaduarte.com.br", insta: "@marinaduarte", tiktok: "", youtube: "", cidade: "Curitiba · PR" } });
    },
    pro: function () {
      return base({ marca: "Juliana Castro", slogan: "Produtora de eventos freelancer", etiqueta: "APRESENTAÇÃO PROFISSIONAL", cidade: "Belo Horizonte · MG",
        sobreCurto: "Produção e coordenação de eventos corporativos, do briefing à desmontagem.",
        sobre: "Sou produtora freelancer há 8 anos. Coordeno fornecedores, equipe de apoio e cronograma para que o cliente só se preocupe com os convidados.\n\nTrabalho bem sob pressão, falo com todo mundo e gosto de planilha organizada.",
        experiencia: [{ grupo: "Experiência", titulo: "Coordenadora de produção", papel: "Congresso de Inovação (1.200 pessoas)", onde: "Produtora Exemplo", ano: ANO + "", link: "" },
          { grupo: "Experiência", titulo: "Produtora", papel: "Convenções de vendas", onde: "Grupo Vértice", ano: (ANO - 2) + "–" + (ANO - 1), link: "" },
          { grupo: "Experiência", titulo: "Assistente de produção", papel: "Feiras e lançamentos", onde: "Agência Ponto Alto", ano: (ANO - 5) + "–" + (ANO - 3), link: "" }],
        habilidades: "Cronograma e roteiro\nGestão de fornecedores\nCredenciamento\nOrçamento\nEquipe de apoio\nInglês intermediário",
        formacao: [{ ano: "2017", curso: "Gestão de eventos", onde: "Faculdade Exemplo" }, { ano: "2021", curso: "Produção executiva", onde: "Curso livre" }],
        perfil: [{ k: "Disponibilidade", v: "Eventos em todo o Brasil" }, { k: "Habilitação", v: "Carro (B)" }],
        depoimentos: [{ texto: "Organizada, calma e muito clara com a equipe. O evento correu sem nenhum susto.", autor: "Ricardo Lemos", cargo: "Diretor de marketing · Grupo Vértice" }],
        contato: { resp: "Juliana Castro", cargo: "Produtora de eventos", tel: "(31) 90000-0050", email: "juliana@exemplo.com.br", site: "", insta: "", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    }
  };
  /* 25/11 (dono: "mais opções do layout… vários modelos"): mais 6 profissões, cada uma com capa própria. Pessoas e empresas inventadas. */
  Object.assign(EX, {
    foto: function () {
      return base({ marca: "Lia Fontes", slogan: "Fotógrafa de eventos e retratos", etiqueta: "PORTFÓLIO", cidade: "Belo Horizonte · MG",
        sobreCurto: "Fotografia de eventos com olhar de revista: gente de verdade, luz bonita e entrega rápida.",
        sobre: "Fotografo eventos corporativos, casamentos e retratos há 9 anos. Gosto de contar o evento pelas pessoas, sem pose forçada.\n\nEntrego a prévia em 24 horas e as fotos tratadas em até 7 dias, prontas para as redes e para impressão.",
        servicos: [{ t: "Eventos corporativos", d: "Convenções, lançamentos e feiras com cobertura completa e prévia no mesmo dia." }, { t: "Retratos profissionais", d: "Fotos para LinkedIn, sites e imprensa, em estúdio ou no local." }, { t: "Casamentos", d: "Do making of à festa, com álbum diagramado." }],
        clientes: "Grupo Vértice\nBanco Aurora\nConstrutora Horizonte\nFeira Sabor de Minas\nAgência Ponto Alto\nHotel Serra Azul",
        depoimentos: [{ texto: "As fotos chegaram no dia seguinte e ficaram melhores do que a gente imaginava.", autor: "Paula Reis", cargo: "Marketing · Construtora Horizonte" }],
        links: [{ rot: "Portfólio completo", url: "lia-fontes.exemplo.com" }, { rot: "Instagram", url: "instagram.com/exemplo" }],
        contato: { resp: "Lia Fontes", cargo: "Fotógrafa", tel: "(31) 90000-0080", email: "lia@exemplo.com.br", site: "lia-fontes.exemplo.com", insta: "@liafontes.foto", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    beleza: function () {
      return base({ marca: "Bianca Rocha", slogan: "Maquiadora e hair stylist", etiqueta: "BELEZA", cidade: "Belo Horizonte · MG",
        sobreCurto: "Maquiagem que dura a festa inteira e fica linda na foto e no vídeo.",
        sobre: "Trabalho com noivas, formaturas, ensaios e gravações há 7 anos. Cada pele recebe produto e técnica certos, com higiene profissional.\n\nAtendo em estúdio ou no local do evento, com equipe para grupos.",
        servicos: [{ t: "Noivas", d: "Teste, maquiagem e penteado no dia, com retoque para a festa." }, { t: "Fotos e vídeo", d: "Maquiagem para ensaios, comerciais e gravações com luz forte." }, { t: "Grupos e eventos", d: "Equipe para madrinhas, formandas e convidadas." }],
        numeros: [{ v: "+600", r: "noivas atendidas" }, { v: "7 anos", r: "de experiência" }, { v: "4,9/5", r: "nas avaliações" }],
        depoimentos: [{ texto: "Me senti eu mesma, só que na minha melhor versão. Durou até o fim da festa!", autor: "Camila S.", cargo: "Noiva" }],
        links: [{ rot: "Antes e depois", url: "instagram.com/exemplo" }, { rot: "Agendar", url: "wa.me/5531900000090" }],
        contato: { resp: "Bianca Rocha", cargo: "Maquiadora", tel: "(31) 90000-0090", email: "bianca@exemplo.com.br", site: "", insta: "@biancarocha.make", tiktok: "@biancarocha", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    chef: function () {
      return base({ marca: "Rafael Antunes", slogan: "Chef · Eventos e experiências gastronômicas", etiqueta: "CHEF", cidade: "Belo Horizonte · MG",
        sobreCurto: "Cozinha mineira contemporânea para eventos, jantares e marcas.",
        sobre: "Formado em gastronomia, passei por restaurantes premiados antes de criar meu serviço de eventos. Monto cardápios com ingredientes da estação e produtores locais.\n\nAtendo de jantares para 10 pessoas a eventos corporativos para 800.",
        servicos: [{ t: "Jantar com chef", d: "Menu degustação na sua casa ou num espaço reservado." }, { t: "Eventos corporativos", d: "Coquetéis, almoços e coffee breaks com a cara da marca." }, { t: "Aulas e shows", d: "Show cooking em feiras, lançamentos e programas." }],
        experiencia: [{ grupo: "Trajetória", titulo: "Chef executivo", papel: "Restaurante Fogo Brando", onde: "Belo Horizonte", ano: (ANO - 4) + "", link: "" },
          { grupo: "Trajetória", titulo: "Show cooking", papel: "Feira Sabor de Minas", onde: "Expominas", ano: ANO + "", link: "youtube.com/exemplo" }],
        imprensa: [{ veiculo: "Revista Exemplo", titulo: "O chef que leva o fogão a lenha para os eventos", data: ANO + "", link: "" }],
        links: [{ rot: "Cardápios", url: "drive.google.com/exemplo" }, { rot: "Vídeos", url: "youtube.com/exemplo" }],
        contato: { resp: "Rafael Antunes", cargo: "Chef", tel: "(31) 90000-0100", email: "chef@exemplo.com.br", site: "", insta: "@chefrafaelantunes", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    atleta: function () {
      return base({ marca: "Duda Martins", slogan: "Atleta de corrida e personal trainer", etiqueta: "ATLETA", cidade: "Belo Horizonte · MG",
        sobreCurto: "Corredora de montanha, treinadora e embaixadora de marcas esportivas.",
        sobre: "Corro há 12 anos e hoje compito em provas de trilha pelo Brasil. Como personal, ajudo iniciantes a correr os primeiros 5 km sem lesão.\n\nProduzo conteúdo de treino e equipamentos para as redes.",
        numeros: [{ v: "38", r: "pódios" }, { v: "120 mil", r: "seguidores" }, { v: "+300", r: "alunos" }],
        experiencia: [{ grupo: "Conquistas", titulo: "Ultra Trilha da Serra (50 km)", papel: "1º lugar geral feminino", onde: "MG", ano: ANO + "", link: "" },
          { grupo: "Conquistas", titulo: "Circuito de Montanha", papel: "Campeã da categoria", onde: "RJ", ano: (ANO - 1) + "", link: "" }],
        servicos: [{ t: "Treino de corrida", d: "Planilhas online e treinos em grupo." }, { t: "Marcas e eventos", d: "Embaixadora, palestras e ações em provas." }],
        links: [{ rot: "Treinos", url: "youtube.com/exemplo" }, { rot: "Instagram", url: "instagram.com/exemplo" }],
        contato: { resp: "Duda Martins", cargo: "Atleta e treinadora", tel: "(31) 90000-0110", email: "duda@exemplo.com.br", site: "", insta: "@dudacorre", tiktok: "@dudacorre", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    mc: function () {
      return base({ marca: "Henrique Vale", slogan: "Mestre de cerimônias e apresentador de eventos", etiqueta: "APRESENTADOR", cidade: "Belo Horizonte · MG",
        sobreCurto: "Voz e condução para eventos corporativos que precisam acontecer no horário.",
        sobre: "Conduzo convenções, premiações e lançamentos há 15 anos. Faço o roteiro junto com a produção e seguro o palco quando algo sai do plano.\n\nApresento em português e inglês.",
        servicos: [{ t: "Convenções e congressos", d: "Abertura, chamadas, mediação de painéis e encerramento." }, { t: "Premiações", d: "Roteiro, ritmo e interação com o público." }, { t: "Locução", d: "Vinhetas, vozes de palco e vídeos institucionais." }],
        numeros: [{ v: "15 anos", r: "de palco" }, { v: "+400", r: "eventos conduzidos" }, { v: "2", r: "idiomas" }],
        depoimentos: [{ texto: "Segurou o evento com tranquilidade quando o telão caiu. Ninguém percebeu.", autor: "Ricardo Lemos", cargo: "Diretor de marketing · Grupo Vértice" }],
        links: [{ rot: "Vídeo de apresentação", url: "youtube.com/exemplo" }],
        contato: { resp: "Henrique Vale", cargo: "Mestre de cerimônias", tel: "(31) 90000-0120", email: "henrique@exemplo.com.br", site: "", insta: "@henriquevale.mc", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    artista: function () {
      return base({ marca: "Nina Albuquerque", slogan: "Artista visual · Pintura e muralismo", etiqueta: "ARTISTA", cidade: "Belo Horizonte · MG",
        sobreCurto: "Cor, cidade e memória em telas, muros e projetos com marcas.",
        sobre: "Pinto murais e telas que falam sobre os bairros onde cresci. Já levei cor para escolas, empresas e festivais.\n\nAceito encomendas, projetos de muralismo e colaborações com marcas.",
        experiencia: [{ grupo: "Exposições", titulo: "Cores do Bairro (individual)", papel: "", onde: "Galeria Exemplo", ano: ANO + "", link: "" },
          { grupo: "Murais", titulo: "Mural da Escola Estadual", papel: "120 m²", onde: "Belo Horizonte", ano: (ANO - 1) + "", link: "instagram.com/exemplo" }],
        imprensa: [{ veiculo: "Jornal Exemplo", titulo: "Artista transforma muros do bairro em galeria", data: ANO + "", link: "" }],
        links: [{ rot: "Obras", url: "instagram.com/exemplo" }, { rot: "Encomendas", url: "wa.me/5531900000130" }],
        contato: { resp: "Nina Albuquerque", cargo: "Artista visual", tel: "(31) 90000-0130", email: "nina@exemplo.com.br", site: "", insta: "@nina.albuquerque.art", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    }
  });
  var MODELOS = [
    { id: "ator", nome: "Ator e atriz", ico: "🎭", para: "Book do artista: perfil, trabalhos, formação, habilidades e vídeo de apresentação.",
      tema: { escuro: true, fundo: "#141414", txt: "#F5F1EA", sub: "#B3ADA4", capa: "foto", caixaAlta: true }, cor: "#E8B54A", cor2: "#C9A227", fonte: "PF", formato: "a4",
      ordem: ["sobre", "perfil", "experiencia", "galeria", "formacao", "habilidades", "links", "contato"], tons: ["#E8B54A", "#C9A227", "#8A1C2B"], ex: "ator", tit: { experiencia: "Trabalhos", perfil: "Ficha" } },
    { id: "vip", nome: "Humorista e presença VIP", ico: "🎤", para: "Apresentador, humorista, influenciador: o que faz, TV, publicidade e eventos com links.",
      tema: { escuro: true, fundo: "#0E0E10", txt: "#FFFFFF", sub: "#B9B9C2", capa: "recorte", caixaAlta: true }, cor: "#FFC531", cor2: "#2F7BFF", fonte: "MO", formato: "rede",
      ordem: ["sobre", "servicos", "numeros", "galeria", "experiencia", "links", "contato"], tons: ["#FFC531", "#2F7BFF", "#FF4F6D"], ex: "vip", tit: { experiencia: "TV, publicidade e eventos", sobre: "Quem sou eu?" }, servFotos: true },
    { id: "freela", nome: "Freelancer audiovisual", ico: "🎥", para: "Cinegrafista, editor, fotógrafo, técnico: serviços, trabalhos, equipamento e reel.",
      tema: { escuro: false, fundo: "#FFFFFF", txt: "#1D222B", sub: "#5B6472", capa: "dividida", caixaAlta: true }, cor: "#1F4E8C", cor2: "#E8B54A", fonte: "MO", formato: "a4",
      ordem: ["sobre", "servicos", "numeros", "experiencia", "galeria", "clientes", "depoimentos", "rider", "links", "contato"], tons: ["#4C8DFF", "#E8B54A", "#22C7D6"], ex: "freela", tit: { rider: "Equipamento próprio" }, servFotos: true },
    { id: "musico", nome: "Músico e DJ (EPK)", ico: "🎧", para: "Bio, release, agenda de shows, imprensa, rider técnico e links para ouvir.",
      tema: { escuro: true, fundo: "#111111", txt: "#FFFFFF", sub: "#B9B9B9", capa: "foto", caixaAlta: true }, cor: "#FF4F6D", cor2: "#FFB547", fonte: "MO", formato: "a4",
      ordem: ["sobre", "release", "galeria", "numeros", "agenda", "imprensa", "rider", "links", "contato"], tons: ["#FF4F6D", "#B36BFF", "#FFB547"], ex: "musico", tit: { sobre: "Bio" } },
    { id: "criador", nome: "Modelo e criador de conteúdo", ico: "📱", para: "Mídia kit: público, números das redes, marcas parceiras e fotos.",
      tema: { escuro: false, fundo: "#FFF8F5", txt: "#2A1A1F", sub: "#7A6268", capa: "moldura", caixaAlta: false }, cor: "#D9466F", cor2: "#F2A65A", fonte: "PF", formato: "rede",
      ordem: ["sobre", "numeros", "perfil", "galeria", "clientes", "links", "contato"], tons: ["#D9466F", "#F2A65A", "#B36BFF"], ex: "criador", tit: { numeros: "Público e números", clientes: "Marcas parceiras" } },
    { id: "moda", nome: "Comp card de modelo", ico: "📸", para: "Cartão A5 das agências: foto grande, 4 fotos, medidas e contato do booking.",
      tema: { escuro: true, fundo: "#101010", txt: "#F4F1EC", sub: "#A9A39B", capa: "compcard", caixaAlta: true }, cor: "#D8C3A5", cor2: "#FFFFFF", fonte: "PF", formato: "a5",
      ordem: ["galeria", "perfil", "links", "contato"], tons: ["#D8C3A5", "#B36BFF", "#F2A65A"], ex: "moda", tit: { galeria: "Fotos", perfil: "Medidas" } },
    { id: "palestra", nome: "Palestrante", ico: "🎙", para: "Folha de palestrante: temas das palestras, onde já falou, recomendações e vídeo.",
      tema: { escuro: false, fundo: "#F6F8FB", txt: "#0E1B2E", sub: "#56657A", capa: "recorte", caixaAlta: true }, cor: "#1C6BFF", cor2: "#FFB547", fonte: "MO", formato: "a4",
      ordem: ["sobre", "servicos", "numeros", "experiencia", "depoimentos", "links", "contato"], tons: ["#1C6BFF", "#FFB547", "#22C7D6"], ex: "palestra", tit: { servicos: "Palestras", experiencia: "Onde já palestrou" } },
    { id: "pro", nome: "Profissional e colaborador", ico: "🧑‍💼", para: "Currículo visual para produtor, técnico, recepção, MC… experiência, habilidades e formação.",
      tema: { escuro: false, fundo: "#FFFFFF", txt: "#111111", sub: "#6B6B6B", capa: "tipografica", caixaAlta: true }, cor: "#111111", cor2: "#E8B54A", fonte: "Roboto", formato: "a4",
      ordem: ["sobre", "experiencia", "habilidades", "formacao", "perfil", "depoimentos", "contato"], tons: ["#E8B54A", "#4C8DFF", "#22C7D6"], ex: "pro", tit: { sobre: "Resumo profissional", experiencia: "Experiência" } },
    { id: "foto", nome: "Fotógrafo e filmmaker", ico: "📷", para: "Capa de revista: serviços com fotos, galeria grande, clientes e recomendações.",
      tema: { escuro: true, fundo: "#0D0D0F", txt: "#FFFFFF", sub: "#B7B7BD", capa: "revista", caixaAlta: true }, cor: "#FF6A3D", cor2: "#FFD166", fonte: "MO", formato: "a4", estTit: "linha",
      ordem: ["sobre", "servicos", "galeria", "clientes", "depoimentos", "links", "contato"], tons: ["#FF6A3D", "#FFD166", "#4C8DFF"], ex: "foto", servFotos: true },
    { id: "beleza", nome: "Beleza e maquiagem", ico: "💄", para: "Foto em arco, serviços, números, antes e depois e agendamento.",
      tema: { escuro: false, fundo: "#FBF3EF", txt: "#2B1B20", sub: "#7D6168", capa: "arco", caixaAlta: false }, cor: "#B4536B", cor2: "#E6B8A2", fonte: "PF", formato: "rede", estTit: "grande",
      ordem: ["sobre", "servicos", "numeros", "galeria", "depoimentos", "links", "contato"], tons: ["#B4536B", "#E6B8A2", "#F2A65A"], ex: "beleza" },
    { id: "chef", nome: "Chef e gastronomia", ico: "👨‍🍳", para: "Capa diagonal, experiências, trajetória, imprensa e cardápios.",
      tema: { escuro: false, fundo: "#FBF6EE", txt: "#2A1D15", sub: "#75655A", capa: "diagonal", caixaAlta: true }, cor: "#B4462B", cor2: "#E9A23B", fonte: "PF", formato: "a4", estTit: "barra",
      ordem: ["sobre", "servicos", "experiencia", "galeria", "imprensa", "links", "contato"], tons: ["#E9A23B", "#B4462B", "#6B8F3E"], ex: "chef", tit: { experiencia: "Trajetória" } },
    { id: "atleta", nome: "Atleta e personal", ico: "🏃", para: "Foto em duotom, números grandes, conquistas e o que você oferece às marcas.",
      tema: { escuro: true, fundo: "#0B0F14", txt: "#FFFFFF", sub: "#A9B1BC", capa: "duotom", caixaAlta: true }, cor: "#C6F432", cor2: "#2F7BFF", fonte: "MO", formato: "rede", estTit: "pilula",
      ordem: ["sobre", "numeros", "experiencia", "servicos", "galeria", "links", "contato"], tons: ["#C6F432", "#2F7BFF", "#22C7D6"], ex: "atleta", tit: { experiencia: "Conquistas" } },
    { id: "mc", nome: "Mestre de cerimônias", ico: "🎤", para: "Retrato redondo, o que você conduz, números, recomendações e vídeo.",
      tema: { escuro: true, fundo: "#0F1220", txt: "#F5F3FF", sub: "#A9A8C2", capa: "circulo", caixaAlta: true }, cor: "#8B7CFF", cor2: "#E8B54A", fonte: "MO", formato: "a4", estTit: "barra",
      ordem: ["sobre", "servicos", "numeros", "depoimentos", "links", "contato"], tons: ["#8B7CFF", "#E8B54A", "#22C7D6"], ex: "mc", tit: { servicos: "O que eu conduzo" } },
    { id: "artista", nome: "Artista visual", ico: "🎨", para: "Foto e faixa: obras, exposições, imprensa e encomendas.",
      tema: { escuro: false, fundo: "#F4F1EA", txt: "#1B2432", sub: "#5E6673", capa: "faixa", caixaAlta: false }, cor: "#1F3A5F", cor2: "#E07A5F", fonte: "PF", formato: "a4", estTit: "grande",
      ordem: ["sobre", "galeria", "experiencia", "imprensa", "links", "contato"], tons: ["#E07A5F", "#1F3A5F", "#F2CC8F"], ex: "artista", tit: { experiencia: "Exposições e murais" } }
  ];
  /* capas, títulos e cartões que a pessoa escolhe ao vivo (25/11, dono: "mais opções do layout… bonito e moderno… editar em tempo real") */
  var CAPAS = { foto: "Foto inteira", revista: "Revista", recorte: "Recorte e círculos", dividida: "Dividida", diagonal: "Diagonal", faixa: "Foto e faixa",
    circulo: "Retrato redondo", arco: "Arco", duotom: "Duotom", moldura: "Moldura", tipografica: "Tipográfica" };
  var TITULOS = { numero: "01 Numerado", barra: "▍ Barra", pilula: "● Etiqueta", linha: "— Linha", grande: "Grande." };
  var CARTOES = { suave: "Suave", forte: "Na cor", contraste: "Contraste", liso: "Sem caixa" };
  var PALETAS = [["Ouro noite", "#E8B54A", "#C9A227", "#121212"], ["Neon azul", "#2F7BFF", "#22D3EE", "#0B1020"], ["Rosé", "#D9466F", "#F2A65A", "#FFF6F3"],
    ["Esmeralda", "#10B981", "#F5C542", "#0E1714"], ["Terracota", "#C8553D", "#F2C14E", "#FBF4EC"], ["Lavanda", "#7C5CFF", "#FF7AB6", "#F7F5FF"],
    ["Preto e branco", "#111111", "#9A9A9A", "#FFFFFF"], ["Vinho", "#B0274A", "#E8B54A", "#170A0E"], ["Oceano", "#0F6E8C", "#7CD5E8", "#F2F8FA"], ["Lima", "#B6F23A", "#2F7BFF", "#0D0D0D"],
    ["Coral", "#FF6A3D", "#FFD166", "#101214"], ["Areia", "#8A6A3F", "#2F4858", "#F4EFE6"]];
  /* 📄 PÁGINAS INTERNAS (28/11, dono: "alterar o layout da página secundária, assim como a primária") */
  var PAGINAS = { padrao: "Faixa no topo", cabeca: "Cabeçalho cheio", lateral: "Barra lateral", moldura: "Moldura", rodape: "Faixa embaixo", limpa: "Limpa" };
  var SOBRES = { esq: "Foto à esquerda", dir: "Foto à direita", topo: "Foto em cima", destaque: "Frase grande", sem: "Só texto" };
  var SOB_R = { "45": [1.25, "4:5"], "34": [4 / 3, "3:4"], "11": [1, "1:1"], "23": [1.5, "2:3"], "169": [0.5625, "16:9"] };
  /* ✎ LIVRE (28/11): largura (X) e altura (Y) soltas — altura em % da largura do conteúdo, como a largura */
  function sobAltLivre(G, sh, fw) { var v = Math.max(10, Math.min(100, +sh || Math.round(fw * 1.3 / G.CW * 100))); return G.CW * v / 100; }
  var LISTAS = { linhas: "Linhas", cartoes: "Cartões", tempo: "Ano em destaque" };
  function capaDoKit(kit) { var mc = modeloDe(kit.modelo).tema.capa, e = (kit.est || {}).capa; return mc === "compcard" ? mc : CAPAS[e] ? e : mc; }
  function modeloDe(id) { return MODELOS.filter(function (m) { return m.id === id; })[0] || MODELOS[0]; }
  function imgsExemplo(mod) {
    var s = mod.id.length * 3;
    return { logo: "", capa: retratoExemplo(s, mod.tons, false), retrato: retratoExemplo(s + 1, mod.tons, true),
      fotos: [fotoExemplo(s + 2, mod.tons), retratoExemplo(s + 3, mod.tons.slice(1).concat(mod.tons.slice(0, 1)), false), fotoExemplo(s + 4, mod.tons.slice(2).concat(mod.tons.slice(0, 2))), retratoExemplo(s + 5, mod.tons.slice(2).concat(mod.tons.slice(0, 2)), false)] };
  }
  function kitNovo(modId) {
    var mod = modeloDe(modId), d = EX[mod.ex]();
    return { id: uid(), nome: "Apresentação — " + d.marca, modelo: mod.id, cor: mod.cor, cor2: mod.cor2, fonte: mod.fonte, formato: mod.formato, servFotos: !!mod.servFotos, exemplo: true,
      ordem: mod.ordem.concat(TODAS.filter(function (x) { return mod.ordem.indexOf(x) < 0; })), ocultas: TODAS.filter(function (x) { return mod.ordem.indexOf(x) < 0; }), tit: clone(mod.tit || {}), d: d,
      criado: new Date().toISOString(), atualizado: new Date().toISOString() };
  }

  /* ================= CORES ================= */
  function hexRgb(h) { h = String(h || "#000").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(a) { return "#" + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function misturar(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function lum(h) { var c = hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function sobre(h) { return lum(h) > 0.45 ? "#111111" : "#FFFFFF"; }
  function contraste(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  /* cor de destaque legível sobre o fundo da página (cor do cliente muito clara num fundo branco vira um tom mais escuro) */
  function destaqueLegivel(cor, fundo) { var c = cor, i = 0; while (contraste(c, fundo) < 3 && i < 8) { c = misturar(c, lum(fundo) > 0.5 ? "#000000" : "#FFFFFF", 0.18); i++; } return c; }

  /* ================= O MODELO (uma fonte só para prévia, PDF e Word) ================= */
  function linhas(t) { return String(t || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function paragrafos(t) { return String(t || "").split(/\n\s*\n/).map(function (s) { return s.replace(/\s*\n\s*/g, " ").trim(); }).filter(Boolean); }
  function cheio(o) { return Object.keys(o).some(function (k) { return String(o[k] || "").trim(); }); }
  function linkDe(t, tipo) {
    t = String(t || "").trim(); if (!t) return "";
    if (tipo === "email") return /@/.test(t) ? "mailto:" + t : "";
    if (tipo === "tel") { var n = t.replace(/\D/g, ""); if (n.length >= 10) return "https://wa.me/" + (n.length <= 11 ? "55" + n : n); return ""; }
    if (tipo === "insta") { var u = t.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""); return u ? "https://instagram.com/" + u : ""; }
    if (tipo === "tiktok") { var u2 = t.replace(/^https?:\/\/(www\.)?tiktok\.com\//, "").replace(/^@?/, "@").replace(/\/.*$/, ""); return u2.length > 1 ? "https://www.tiktok.com/" + u2 : ""; }
    if (tipo === "youtube") { if (/^https?:\/\//.test(t) || /youtube\.com|youtu\.be/.test(t)) return /^https?:\/\//.test(t) ? t : "https://" + t; var u3 = t.replace(/^@?/, "@"); return u3.length > 1 ? "https://www.youtube.com/" + u3 : ""; }
    return /^https?:\/\//.test(t) ? t : /\./.test(t) ? "https://" + t : "";
  }
  /* 28/11: press kit em inglês/espanhol (presskit-mais.js cria a cópia traduzida com kit.idioma) — títulos padrão e rótulos fixos do PDF/Word no idioma */
  var SEC_IDIOMA = {
    en: { sobre: "About me", perfil: "Profile", servicos: "What I do", numeros: "In numbers", experiencia: "Work", galeria: "Photo gallery", links: "Portfolio", clientes: "I have worked with", depoimentos: "Recommendations", formacao: "Education", habilidades: "Skills", release: "Press release", imprensa: "In the press", agenda: "Schedule", rider: "Technical rider", contato: "Contact" },
    es: { sobre: "Quién soy", perfil: "Perfil", servicos: "Lo que hago", numeros: "En números", experiencia: "Trabajos", galeria: "Galería de fotos", links: "Portafolio", clientes: "He trabajado con", depoimentos: "Recomendaciones", formacao: "Formación", habilidades: "Habilidades", release: "Comunicado de prensa", imprensa: "En la prensa", agenda: "Agenda", rider: "Ficha técnica", contato: "Contacto" } };
  var ROT_IDIOMA = { en: { "Cidade": "City", "VER  ↗": "VIEW  ↗", "Apresentação — ": "Press kit — " }, es: { "Cidade": "Ciudad", "VER  ↗": "VER  ↗", "Apresentação — ": "Presentación — " } };
  function rotI(kit, t) { var r = ROT_IDIOMA[kit && kit.idioma]; return (r && r[t]) || t; }
  function titulo(kit, id) { var t = kit.tit && kit.tit[id]; return t && String(t).trim() ? String(t).trim() : ((SEC_IDIOMA[kit.idioma] || {})[id] || SECOES[id].nome); }
  var GEOM = { a4: { W: 595.28, H: 841.89, MX: 50 }, rede: { W: 595.28, H: 744.1, MX: 46 }, a5: { W: 419.53, H: 595.28, MX: 30 } };
  function geom(f) { var g = GEOM[f] || GEOM.a4; return { W: g.W, H: g.H, MX: g.MX, CW: g.W - 2 * g.MX }; }
  async function qrUrl(txt) {
    try { await carregar("qr"); var q = qrcode(0, "M"); q.addData(txt); q.make(); var n = q.getModuleCount(), cel = 6, mg = 2 * cel, c = document.createElement("canvas"); c.width = c.height = n * cel + 2 * mg;
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#000";
      for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(mg + k * cel, mg + r * cel, cel, cel);
      return c.toDataURL("image/png"); } catch (e) { return ""; }
  }
  async function modelo(kit, imgs, op) {
    op = op || {}; imgs = imgs || imgsVazias();
    var mod = modeloDe(kit.modelo), tm = Object.assign({}, mod.tema), d = kit.d || {}, alta = !!op.alta, f = alta ? 2 : 1.15;
    var formato = mod.tema.capa === "compcard" ? "a5" : (GEOM[kit.formato] ? kit.formato : mod.formato), G = geom(formato);
    var cor = kit.cor || mod.cor, cor2 = kit.cor2 || mod.cor2, est = kit.est || {}, CR = coresDe(kit);
    /* 🎛 ESTILO AO VIVO: capa, fundo, títulos, cartões, tamanhos e espaço escolhidos pela pessoa por cima do modelo */
    tm.capa = capaDoKit(kit);
    if (/^#[0-9a-f]{6}$/i.test(est.fundo || "")) { tm.fundo = est.fundo; tm.escuro = lum(est.fundo) < 0.36; tm.txt = tm.escuro ? "#F5F1EA" : "#15181F"; tm.sub = misturar(tm.txt, tm.fundo, 0.36); }
    if (est.maiusc === "sim" || est.maiusc === "nao") tm.caixaAlta = est.maiusc === "sim";
    tm.estTit = TITULOS[est.tit] ? est.tit : (mod.estTit || "numero"); tm.deco = est.deco !== "nao";
    tm.escNome = Math.max(0.6, Math.min(1.5, (+est.nome || 100) / 100)); tm.escTxt = Math.max(0.8, Math.min(1.25, (+est.texto || 100) / 100));
    tm.esp = { compacto: 0.65, normal: 1, arejado: 1.4 }[est.esp] || 1;
    tm.pg = PAGINAS[est.pg] ? est.pg : "padrao"; tm.sob = SOBRES[est.sob] ? est.sob : "esq"; tm.lst = LISTAS[est.lst] ? est.lst : "linhas";
    tm.col = { "1": 1, "2": 2, "3": 3 }[est.col] || 0; tm.centro = est.alinh === "centro"; tm.quebra = est.quebra === "pagina";
    tm.cor = destaqueLegivel(cor, tm.fundo); tm.corPura = cor; tm.cor2 = cor2; tm.fTit = FONTES_TIT[kit.fonte] ? kit.fonte : mod.fonte;
    var cart = CARTOES[est.cart] ? est.cart : "suave";
    tm.cartao = cart === "liso" ? tm.fundo : cart === "forte" ? misturar(tm.fundo, tm.corPura, tm.escuro ? 0.24 : 0.15) : cart === "contraste" ? misturar(tm.fundo, tm.txt, tm.escuro ? 0.14 : 0.08)
      : tm.escuro ? misturar(tm.fundo, "#FFFFFF", 0.07) : misturar(tm.fundo, tm.corPura, 0.07);
    tm.linha = tm.escuro ? misturar(tm.fundo, "#FFFFFF", 0.16) : misturar(tm.fundo, "#000000", 0.12);
    var m = { kit: kit, tema: tm, formato: formato, G: G, marca: d.marca || "Seu nome", slogan: d.slogan || "", etiqueta: d.etiqueta || "APRESENTAÇÃO", cidade: d.cidade || "", secoes: [] };
    var TG = m.tags = {}, tg = function (u, alvo) { if (u) TG[u] = alvo; return u; };   /* qual foto é qual (toque na prévia) */
    m.logo = imgs.logo ? await reduzir(imgs.logo, alta ? 1400 : 700) : "";
    m.logoProp = m.logo ? await proporcao(m.logo) : 1;
    await elPreparar(m, kit, imgs);
    m.retrato = imgs.retrato ? await reduzir(imgs.retrato, alta ? 1800 : 900) : "";
    m.retratoProp = m.retrato ? await proporcao(m.retrato) : 0.8;
    var cap = tm.capa, W = G.W, H = G.H;
    var capaSrc = imgs.capa || imgs.retrato || (imgs.fotos || [])[0] || "", EQ = imgs.enq || {};
    if (m.retrato && EQ.retrato && temAj(EQ.retrato.aj)) m.retrato = await ajustarImg(m.retrato, EQ.retrato.aj);
    tg(m.retrato, "retrato");
    if (capaSrc && !(cap === "recorte" && imgs.retrato)) { var cc0 = corteCapa(cap, G, tm); m.capaImg = tg(await recortar(capaSrc, cc0[0] * f, cc0[1] * f, enqOpC(CR, EQ.capa, cc0[2])), "capa"); }
    var c = d.contato || {};
    m.contato = c;
    var vis = (kit.ordem || TODAS).filter(function (id) { return SECOES[id] && (kit.ocultas || []).indexOf(id) < 0; });
    TODAS.forEach(function (id) { if ((kit.ordem || []).indexOf(id) < 0 && (kit.ocultas || []).indexOf(id) < 0) vis.push(id); });
    var fotos = (imgs.fotos || []).filter(Boolean), CARDS = imgs.cards || {};
    var fotoCard = function (l, i) { return (CARDS[l] || [])[i] || ""; };
    var comIndice = function (arr, tem) { return (arr || []).map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x && tem(o.x); }); };
    for (var i = 0; i < vis.length; i++) {
      var id = vis[i], s = { id: id, tit: titulo(kit, id) };
      if (id === "sobre") { s.curto = (d.sobreCurto || "").trim(); s.pars = paragrafos(d.sobre); if (!s.curto && !s.pars.length) continue; s.retrato = cap === "recorte" || tm.sob === "sem" || tm.sob === "destaque" ? "" : m.retrato;
        if (s.retrato && imgs.retrato) {   /* ✥ foto da PÁGINA 2: largura e proporção escolhidas + reenquadrar (28/11) */
          var pS = +est.sobW ? Math.max(0.2, Math.min(0.62, +est.sobW / 100)) : 0; s.fotoW = pS ? G.CW * pS : 0;
          if (EQ.sobre || SOB_R[est.sobR] || est.sobR === "livre") { var fwS = G.CW * (pS || (tm.sob === "topo" ? 0.42 : 0.36)), rS = est.sobR === "livre" ? sobAltLivre(G, est.sobH, fwS) / fwS : SOB_R[est.sobR] ? SOB_R[est.sobR][0] : 1 / m.retratoProp, fhS = Math.min(fwS * rS, G.H * 0.62);
            var eqS = Object.assign({}, EQ.sobre || {}); if (!temAj(eqS.aj) && EQ.retrato && temAj(EQ.retrato.aj)) eqS.aj = EQ.retrato.aj;
            s.retrato = tg(await recortar(imgs.retrato, fwS * f, fhS * f, enqOp(eqS, { png: true })), "sobre"); s.fotoW = fwS; s.fotoH = fhS; s.corte = true; }
        } }
      else if (id === "numeros") { s.itens = (d.numeros || []).filter(function (x) { return x && (String(x.v || "").trim() || String(x.r || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "servicos") {
        var iS = comIndice(d.servicos, function (x) { return String(x.t || "").trim() || String(x.d || "").trim(); }); if (!iS.length) continue;
        s.itens = iS.map(function (o) { return o.x; });
        /* foto de cada cartão (25/11, dono: "não tem lugar de fazer o upload de cada foto"): a do próprio cartão; sem ela, uma da galeria (se ligado) */
        var proprias = iS.map(function (o) { return fotoCard("servicos", o.i); });
        if (proprias.some(Boolean) || (kit.servFotos && fotos.length)) { s.fotos = []; for (var a = 0; a < s.itens.length; a++) {
          if (proprias[a]) s.fotos.push(tg(await recortar(proprias[a], 240 * f, 140 * f, enqOpC(CR, EQ["c:servicos:" + iS[a].i])), "c:servicos:" + iS[a].i));
          else if (kit.servFotos && fotos.length) s.fotos.push(tg(await recortar(fotos[a % fotos.length], 240 * f, 140 * f, enqOpC(CR, EQ["f" + (a % fotos.length)])), String(a % fotos.length)));
          else s.fotos.push(""); } }
      }
      else if (id === "perfil") { s.itens = (d.perfil || []).filter(function (x) { return x && (String(x.k || "").trim() || String(x.v || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "experiencia") {
        var iE = comIndice(d.experiencia, function (x) { return String(x.titulo || "").trim() || String(x.papel || "").trim(); }); if (!iE.length) continue;
        var ex = []; for (var e0 = 0; e0 < iE.length; e0++) { var fe = fotoCard("experiencia", iE[e0].i); ex.push(fe ? Object.assign({}, iE[e0].x, { foto: tg(await recortar(fe, 150 * f, 96 * f, enqOpC(CR, EQ["c:experiencia:" + iE[e0].i])), "c:experiencia:" + iE[e0].i) }) : iE[e0].x); }
        s.grupos = []; ex.forEach(function (x) { var g = String(x.grupo || "").trim(), ult = s.grupos[s.grupos.length - 1]; if (!ult || ult.nome !== g) s.grupos.push({ nome: g, itens: [x] }); else ult.itens.push(x); });
      }
      else if (id === "formacao") { s.itens = (d.formacao || []).filter(function (x) { return x && (String(x.curso || "").trim() || String(x.onde || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "habilidades") { s.itens = linhas(d.habilidades); if (!s.itens.length) continue; }
      else if (id === "links") {
        var iL = comIndice(d.links, function (x) { return linkDe(x.url, "site"); }); if (!iL.length) continue;
        s.itens = [];
        for (var q = 0; q < iL.length; q++) { var it = Object.assign({}, iL[q].x, { href: linkDe(iL[q].x.url, "site") }); it.qr = await qrUrl(it.href);
          var fl = fotoCard("links", iL[q].i); if (fl) it.foto = tg(await recortar(fl, 320 * f, 180 * f, enqOpC(CR, EQ["c:links:" + iL[q].i])), "c:links:" + iL[q].i); s.itens.push(it); }
      }
      else if (id === "clientes") { s.itens = linhas(d.clientes); if (!s.itens.length) continue; }
      else if (id === "depoimentos") { s.itens = (d.depoimentos || []).filter(function (x) { return x && String(x.texto || "").trim(); }); if (!s.itens.length) continue; }
      else if (id === "release") { var r = d.release || {}; if (!String(r.titulo || "").trim() && !String(r.texto || "").trim()) continue; s.titulo = (r.titulo || "").trim(); s.data = (r.data || "").trim(); s.pars = paragrafos(r.texto); }
      else if (id === "imprensa") { s.itens = (d.imprensa || []).filter(function (x) { return x && (String(x.titulo || "").trim() || String(x.veiculo || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "agenda") { s.itens = (d.agenda || []).filter(function (x) { return x && (String(x.titulo || "").trim() || String(x.data || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "rider") { s.itens = linhas(d.rider); s.obs = (d.riderObs || "").trim(); if (!s.itens.length && !s.obs) continue; }
      else if (id === "galeria") {
        var fs = fotos.slice(0, 7); if (!fs.length) continue;
        if (cap === "compcard") { s.peq = []; for (var j0 = 0; j0 < Math.min(4, fs.length); j0++) s.peq.push(tg(await recortar(fs[j0], 180 * f, 225 * f, enqOpC(CR, EQ["f" + j0])), String(j0))); }
        else { s.grande = tg(await recortar(fs[0], G.CW * f, G.CW * 0.525 * f, enqOpC(CR, EQ.f0)), "0"); s.peq = []; for (var j = 1; j < fs.length; j++) s.peq.push(tg(await recortar(fs[j], 160 * f, 110 * f, enqOpC(CR, EQ["f" + j])), String(j))); }
        s.legenda = (d.galeriaLegenda || "").trim();
      }
      else if (id === "contato") { if (!cheio(c)) continue; }
      m.secoes.push(s);
    }
    m.linhaContato = [c.email, c.tel, c.insta || c.site].filter(function (x) { return String(x || "").trim(); }).join("   ·   ");
    /* PDF interativo (25/11): cada contato vira um botão que abre o lugar certo — WhatsApp, e-mail, site, Instagram, TikTok, YouTube */
    m.botoes = [["WHATSAPP", linkDe(c.tel, "tel")], ["E-MAIL", linkDe(c.email, "email")], ["SITE", linkDe(c.site, "site")], ["INSTAGRAM", linkDe(c.insta, "insta")],
      ["TIKTOK", linkDe(c.tiktok, "tiktok")], ["YOUTUBE", linkDe(c.youtube, "youtube")]].filter(function (x) { return x[1]; });
    m.rodape = [[c.email, linkDe(c.email, "email")], [c.tel, linkDe(c.tel, "tel")], [c.insta || c.site, c.insta ? linkDe(c.insta, "insta") : linkDe(c.site, "site")]]
      .filter(function (x) { return String(x[0] || "").trim(); });
    return m;
  }

  /* ================= PDF (pdfMake) ================= */
  function semGap(fundo, gap) { return { hLineWidth: function () { return gap; }, vLineWidth: function () { return gap; }, hLineColor: function () { return fundo; }, vLineColor: function () { return fundo; }, paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } }; }
  function emGrupos(l, n) { var o = []; for (var i = 0; i < l.length; i += n) o.push(l.slice(i, i + n)); return o; }
  function defPdf(m, op) {
    op = op || {};
    var G = m.G || geom("a4"), W = G.W, H = G.H, MX = G.MX, CW = G.CW, k = W / 595.28, z = function (n) { return Math.round(n * k * 10) / 10; };
    var t = m.tema, fT = t.fTit, cont = [], tituloCaixa = function (s) { return t.caixaAlta ? String(s).toUpperCase() : s; };
    var corSobreCor = sobre(t.corPura), d = (m.kit && m.kit.d) || {};
    /* ---------- CAPA (página 1) ---------- */
    var capaFundo = [], capa = [];
    var abs = function (x, y) { return { absolutePosition: { x: x, y: y } }; };
    var ret = function (x, y, w, h, cor) { return Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: w, h: h, color: cor }] }, abs(x, y)); };
    var logoNo = function (x, y, larg, alt) { if (!m.logo) return null; var w = larg, h = larg / m.logoProp; if (h > alt) { h = alt; w = alt * m.logoProp; } return Object.assign({ image: m.logo, width: w, height: h }, abs(x, y)); };
    var etiq = { text: tituloCaixa(m.etiqueta), fontSize: z(9), bold: true, characterSpacing: 2.5 * k };
    var tamNome = function (base, longo) { return z((m.marca.length > longo ? base * 0.74 : base) * (t.escNome || 1)); };
    var fixos = (d.perfil || []).filter(function (x) { return x && String(x.v || "").trim(); }).slice(0, 5);
    if (t.capa === "foto") {
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, t.fundo));
      capaFundo.push(ret(0, 0, W, 6, t.corPura));
      var lg = logoNo(MX, 56, 180, 64); if (lg) capa.push(lg);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(50, 22), color: "#FFFFFF", lineHeight: 1.02, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(15), color: "#E9E6E0", margin: [0, 12, 0, 0], lineHeight: 1.25 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 60, h: 3, color: t.corPura }], margin: [0, 20, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: "#CFCAC2", characterSpacing: 1 }], absolutePosition: { x: MX, y: H - 330 * (H / 842) }, width: CW });
    } else if (t.capa === "compcard") {   /* comp card de modelo: foto inteira, nome e medidas embaixo (A5) */
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, t.fundo));
      capa.push({ stack: [{ text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(34, 16), color: "#FFFFFF", characterSpacing: 3 * k, alignment: "center" },
        { canvas: [{ type: "rect", x: (CW - 40) / 2, y: 0, w: 40, h: 2, color: t.corPura }], margin: [0, 10, 0, 10] },
        { text: fixos.map(function (x) { return (x.k ? x.k + " " : "") + x.v; }).join("   ·   ") || m.slogan, fontSize: z(10.5), color: "#EDE8E1", alignment: "center", lineHeight: 1.4 }], absolutePosition: { x: MX, y: H - 118 }, width: CW });
    } else if (t.capa === "recorte") {   /* pessoa recortada em cima de um fundo forte (como um portfólio de apresentador) */
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: W * 0.38, r2: W * 0.38, color: t.corPura }] }, abs(W * 0.72, H * 0.64)));
      if (t.deco) capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: W * 0.16, r2: W * 0.16, color: t.cor2 }] }, abs(W * 0.96, H * 0.08)));
      if (m.retrato) { var rh = Math.min(H * 0.84, (W * 0.58) / m.retratoProp), rw = rh * m.retratoProp; capaFundo.push(Object.assign({ image: m.retrato, width: rw, height: rh }, abs(W - rw - W * 0.02, H - rh))); }
      else if (m.capaImg) capaFundo.push(Object.assign({ image: m.capaImg, width: W * 0.5, height: H }, abs(W * 0.5, 0)));
      var lg5 = logoNo(MX, 50, 150, 54); if (lg5) capa.push(lg5);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor2 }), { text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(44, 12), color: t.txt, lineHeight: 0.98, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(13), color: t.cor, bold: true, margin: [0, 14, 0, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 54, h: 4, color: t.cor2 }], margin: [0, 20, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: t.sub, characterSpacing: 1 }], absolutePosition: { x: MX, y: H * 0.11 }, width: W * 0.44 });
    } else if (t.capa === "revista") {   /* capa de revista: nome enorme no alto, por cima da foto */
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, misturar(t.corPura, "#000000", 0.7)));
      if (t.deco) capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: W - 36, h: H - 36, lineColor: "#FFFFFF", lineWidth: 0.8, strokeOpacity: 0.45 }] }, abs(18, 18)));
      capa.push({ stack: [{ table: { body: [[{ text: tituloCaixa(m.etiqueta), fontSize: z(8.5), bold: true, characterSpacing: 2 * k, color: corSobreCor, fillColor: t.corPura, margin: [8, 4, 8, 3] }]] }, layout: semGap(t.corPura, 0) },
        { text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(70, 12), color: "#FFFFFF", lineHeight: 0.92, margin: [0, 14, 0, 0], characterSpacing: -0.5 }], absolutePosition: { x: MX, y: 54 }, width: CW });
      var lgR = logoNo(W - MX - 120, H - 120, 120, 50); if (lgR) capa.push(lgR);
      capa.push({ stack: [{ canvas: [{ type: "rect", x: 0, y: 0, w: 70, h: 4, color: t.corPura }], margin: [0, 0, 0, 12] }, { text: m.slogan, fontSize: z(16), bold: true, color: "#FFFFFF", lineHeight: 1.25 },
        { text: m.cidade, fontSize: z(9.5), color: "#E2DED7", characterSpacing: 1.4, margin: [0, 10, 0, 0] }], absolutePosition: { x: MX, y: H - 190 * (H / 842) }, width: CW * 0.7 });
    } else if (t.capa === "duotom") {   /* foto inteira em duas cores + nome no centro */
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, misturar(t.corPura, "#000000", 0.7)));
      capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: W, h: H * 0.42, color: "#000000", fillOpacity: 0.32 }] }, abs(0, H * 0.58)));
      if (t.deco) { capaFundo.push(ret(W / 2 - 1, 0, 2, H * 0.1, t.cor2)); capaFundo.push(ret(W / 2 - 1, H * 0.9, 2, H * 0.1, t.cor2)); }
      var lgD = logoNo((W - 120) / 2, H * 0.12, 120, 50); if (lgD) capa.push(lgD);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor2, alignment: "center" }), { text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(56, 14), color: "#FFFFFF", alignment: "center", lineHeight: 0.95, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(14), color: "#FFFFFF", alignment: "center", margin: [20, 12, 20, 0], lineHeight: 1.3 },
        { text: m.cidade, fontSize: z(9.5), color: "#E2DED7", characterSpacing: 1.6, alignment: "center", margin: [0, 12, 0, 0] }], absolutePosition: { x: MX, y: H * 0.64 }, width: CW });
    } else if (t.capa === "diagonal") {   /* corte diagonal na cor, foto à direita */
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W * 0.62, height: H }, abs(W * 0.38, 0)) : ret(W * 0.38, 0, W * 0.62, H, misturar(t.corPura, "#000000", 0.4)));
      capaFundo.push(Object.assign({ canvas: [{ type: "polyline", closePath: true, color: t.corPura, points: [{ x: 0, y: 0 }, { x: W * 0.6, y: 0 }, { x: W * 0.44, y: H }, { x: 0, y: H }] }] }, abs(0, 0)));
      if (t.deco) capaFundo.push(Object.assign({ canvas: [{ type: "polyline", closePath: true, color: t.cor2, points: [{ x: W * 0.6, y: 0 }, { x: W * 0.635, y: 0 }, { x: W * 0.475, y: H }, { x: W * 0.44, y: H }] }] }, abs(0, 0)));
      var lgG = logoNo(MX, 56, 150, 60); if (lgG) capa.push(lgG);
      capa.push({ stack: [Object.assign({}, etiq, { color: corSobreCor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(44, 14), color: corSobreCor, lineHeight: 1.02, margin: [0, 12, 0, 0] },
        { text: m.slogan, fontSize: z(13.5), color: corSobreCor, margin: [0, 14, 0, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 50, h: 3, color: t.cor2 }], margin: [0, 20, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: corSobreCor, characterSpacing: 1 }], absolutePosition: { x: MX, y: H * 0.36 }, width: W * 0.36 });
    } else if (t.capa === "faixa") {   /* foto em cima, faixa sólida embaixo com o nome */
      var fyF = H * 0.6;
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: fyF }, abs(0, 0)) : ret(0, 0, W, fyF, misturar(t.corPura, "#000000", 0.4)));
      capaFundo.push(ret(0, fyF, W, 8, t.corPura));
      if (t.deco) capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: 26, r2: 26, color: t.cor2 }] }, abs(W - MX - 26, fyF + 4)));
      var lgF = logoNo(MX, 40, 140, 56); if (lgF) capa.push(lgF);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(48, 18), color: t.txt, lineHeight: 1, margin: [0, 8, 0, 0] },
        { text: m.slogan, fontSize: z(14), color: t.sub, margin: [0, 10, 0, 0], lineHeight: 1.3 },
        { text: m.cidade, fontSize: z(9.5), color: t.sub, characterSpacing: 1.4, margin: [0, 12, 0, 0] }], absolutePosition: { x: MX, y: fyF + 44 }, width: CW - 60 });
    } else if (t.capa === "circulo") {   /* retrato redondo com anel, nome centralizado */
      var rC = W * 0.28, cyC = H * 0.1 + rC;
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      if (t.deco) { capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: rC * 1.55, r2: rC * 1.55, color: misturar(t.fundo, t.corPura, t.escuro ? 0.16 : 0.1) }] }, abs(W / 2, cyC)));
        capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: 14, r2: 14, color: t.cor2 }] }, abs(W / 2 + rC * 0.86, cyC - rC * 0.86))); }
      capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: rC + 9, r2: rC + 9, lineColor: t.corPura, lineWidth: 3 }] }, abs(W / 2, cyC)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: rC * 2, height: rC * 2 }, abs(W / 2 - rC, cyC - rC)) : Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: rC, r2: rC, color: t.cartao }] }, abs(W / 2, cyC)));
      var lgC = logoNo(MX, 34, 110, 44); if (lgC) capa.push(lgC);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor, alignment: "center" }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(44, 18), color: t.txt, alignment: "center", lineHeight: 1.02, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(14), color: t.sub, alignment: "center", margin: [20, 10, 20, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: (CW - 46) / 2, y: 0, w: 46, h: 3, color: t.corPura }], margin: [0, 18, 0, 10] },
        { text: m.cidade, fontSize: z(9.5), color: t.sub, alignment: "center", characterSpacing: 1.5 }], absolutePosition: { x: MX, y: cyC + rC + 34 }, width: CW });
    } else if (t.capa === "arco") {   /* foto em arco, moldura deslocada e nome embaixo */
      var aw = W * 0.6, ah = H * 0.54, ax = (W - aw) / 2, ay = H * 0.07, ra = aw / 2, pts = [];
      for (var ai = 0; ai <= 24; ai++) { var an = Math.PI + Math.PI * ai / 24; pts.push({ x: ra + ra * Math.cos(an), y: ra + ra * Math.sin(an) }); }
      pts = [{ x: 0, y: ah }].concat(pts).concat([{ x: aw, y: ah }]);
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      if (t.deco) capaFundo.push(Object.assign({ canvas: [{ type: "polyline", closePath: true, lineColor: t.corPura, lineWidth: 1.4, points: pts }] }, abs(ax + 14, ay + 14)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: aw, height: ah }, abs(ax, ay)) : Object.assign({ canvas: [{ type: "polyline", closePath: true, color: t.cartao, points: pts }] }, abs(ax, ay)));
      var lgA = logoNo(MX, 30, 110, 44); if (lgA) capa.push(lgA);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor, alignment: "center" }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(42, 18), color: t.txt, alignment: "center", lineHeight: 1.02, margin: [0, 8, 0, 0] },
        { text: m.slogan, fontSize: z(13.5), color: t.sub, alignment: "center", margin: [20, 8, 20, 0], lineHeight: 1.3 },
        { text: m.cidade, fontSize: z(9.5), color: t.cor, alignment: "center", characterSpacing: 1.6, margin: [0, 12, 0, 0] }], absolutePosition: { x: MX, y: ay + ah + 36 }, width: CW });
    } else if (t.capa === "dividida") {
      var bp = W * 0.42, wb = W - bp;
      capaFundo.push(ret(0, 0, wb, H, t.corPura));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: bp, height: H }, abs(wb, 0)) : ret(wb, 0, bp, H, misturar(t.corPura, "#000000", 0.35)));
      capaFundo.push(ret(wb - 8, 0, 8, H, t.cor2));
      var lg2 = logoNo(MX, 60, 170, 70); if (lg2) capa.push(lg2);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor2 }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(40, 16), color: corSobreCor, lineHeight: 1.05, margin: [0, 12, 0, 0] },
        { text: m.slogan, fontSize: z(14), color: corSobreCor, margin: [0, 14, 0, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 54, h: 3, color: t.cor2 }], margin: [0, 22, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: corSobreCor, characterSpacing: 1 }], absolutePosition: { x: MX, y: H * 0.39 }, width: wb - MX - 34 });
    } else if (t.capa === "moldura") {
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      var lg3 = logoNo((W - 130) / 2, 64, 130, 52); if (lg3) capa.push(lg3);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor, alignment: "center" }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(44, 22), color: t.txt, alignment: "center", margin: [0, 10, 0, 0], lineHeight: 1.05 },
        { text: m.slogan, font: "PF", fontSize: z(14), color: t.sub, alignment: "center", margin: [30, 10, 30, 0], lineHeight: 1.3 }], absolutePosition: { x: MX, y: 140 }, width: CW });
      var fx = (W - 420) / 2, fy = H * 0.45;
      capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: 440, h: 320, color: "#FFFFFF", lineColor: misturar(t.fundo, "#000000", 0.14), lineWidth: 0.8 }] }, abs(fx - 10, fy - 10)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: 420, height: 300 }, abs(fx, fy)) : ret(fx, fy, 420, 300, t.cartao));
      capa.push({ stack: [{ canvas: [{ type: "line", x1: CW / 2 - 30, y1: 0, x2: CW / 2 + 30, y2: 0, lineWidth: 1, lineColor: t.cor }], margin: [0, 0, 0, 8] }, { text: m.cidade, fontSize: 9.5, color: t.sub, alignment: "center", characterSpacing: 1.5 }], absolutePosition: { x: MX, y: H - 80 }, width: CW });
    } else {   /* tipográfica */
      var fh = Math.min(250, H * 0.3);
      capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: W, h: H, color: t.fundo }, { type: "rect", x: 0, y: 0, w: W, h: 10, color: t.corPura }] }, abs(0, 0)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: CW, height: fh }, abs(MX, H - fh - 70)) : ret(MX, H - fh - 70, CW, fh, t.cartao));
      capaFundo.push(ret(MX, H - 64, 90, 6, t.cor2));
      var lg4 = logoNo(MX, 64, 160, 60); if (lg4) capa.push(lg4);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(54, 20), color: t.txt, lineHeight: 1, margin: [0, 12, 0, 0] },
        { text: m.slogan, fontSize: z(15), color: t.sub, margin: [0, 16, 0, 0], lineHeight: 1.3 }], absolutePosition: { x: MX, y: 180 }, width: CW - 30 });
      capa.push(Object.assign({ text: m.cidade, fontSize: 9.5, color: t.sub, characterSpacing: 1.5 }, abs(MX + 104, H - 66)));
    }
    /* 25/11: a capa inteira vai no FUNDO da página 1 (texto posicionado no conteúdo escapava para a página 2) e cada pilha ganha largura fixa */
    capaFundo = capaFundo.concat(capa.map(function (n) { return n.stack && n.width ? { columns: [{ width: n.width, stack: n.stack }], absolutePosition: n.absolutePosition } : n; }));
    cont.push({ text: " ", fontSize: 1, pageBreak: op.soCapa ? undefined : "after" });
    if (op.soCapa) return montar(cont);

    /* ---------- SEÇÕES ---------- */
    var cabSec = function (s, n) {
      var h0 = cabSec0(s, n); if (!t.centro) return h0;
      return h0.map(function (x) {
        if (x.canvas) { var wR = 0; x.canvas.forEach(function (c0) { if (c0.type === "rect") wR = Math.max(wR, c0.w); if (c0.type === "line") wR = CW; }); var mg = (x.margin || [0, 0, 0, 0]).slice(); mg[0] = Math.max(0, (CW - wR) / 2); return Object.assign({}, x, { margin: mg }); }
        if (x.table) return { columns: [{ width: "*", text: "" }, { width: "auto", table: x.table, layout: x.layout }, { width: "*", text: "" }], margin: x.margin };
        return Object.assign({}, x, { alignment: "center" });
      });
    };
    var cabSec0 = function (s, n) {
      var topo = n === 1 ? 0 : z(26) * (t.esp || 1), tam = z(t.caixaAlta ? 17 : 22), est = t.estTit || "numero", tt = tituloCaixa(s.tit), dep = z(14) * (t.esp || 1);
      if (est === "barra") return [{ table: { widths: [5, "*"], body: [[{ text: "", fillColor: t.corPura }, { text: tt, font: fT, bold: true, fontSize: tam, color: t.txt, characterSpacing: t.caixaAlta ? k : 0, margin: [12, 2, 0, 2] }]] }, layout: semGap(t.fundo, 0), margin: [0, topo, 0, dep] }];
      if (est === "pilula") return [{ table: { body: [[{ text: tt.toUpperCase(), bold: true, fontSize: z(11), color: sobre(t.corPura), fillColor: t.corPura, characterSpacing: 1.6 * k, margin: [12, 6, 12, 5] }]] }, layout: semGap(t.fundo, 0), margin: [0, topo, 0, dep] }];
      if (est === "linha") return [{ text: tt, font: fT, bold: true, fontSize: tam, color: t.txt, characterSpacing: t.caixaAlta ? k : 0, margin: [0, topo, 0, 0] },
        { canvas: [{ type: "line", x1: 0, y1: 1.5, x2: CW, y2: 1.5, lineWidth: 0.7, lineColor: t.linha }, { type: "rect", x: 0, y: 0, w: 64 * k, h: 3, color: t.corPura }], margin: [0, z(8), 0, dep] }];
      if (est === "grande") return [{ text: [{ text: s.tit, color: t.txt }, { text: ".", color: t.cor }], font: fT, bold: true, fontSize: z(30), lineHeight: 1.05, margin: [0, topo, 0, dep] }];
      return [{ text: [{ text: String(n).padStart(2, "0") + "   ", color: t.cor }, { text: tt, color: t.txt }], font: fT, bold: true, fontSize: tam, characterSpacing: t.caixaAlta ? k : 0, margin: [0, topo, 0, 0] },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 42 * k, h: 3, color: t.corPura }], margin: [0, z(8), 0, dep] }];
    };
    var cartao = function (pilha, pad) { return { table: { widths: ["*"], body: [[{ stack: pilha, margin: pad || [14, 12, 14, 12], fillColor: t.cartao }]] }, layout: semGap(t.fundo, 0), unbreakable: true }; };
    /* grade = uma tabela por LINHA (a página pode virar entre as linhas, e o título da seção vai junto com a primeira) */
    var grade = function (cel, n, gap) {
      var g = gap == null ? 8 : gap, ws = []; for (var i = 0; i < n; i++) ws.push("*");
      return emGrupos(cel, n).map(function (r) {
        while (r.length < n) r.push({ text: "", fillColor: t.fundo });
        return { table: { widths: ws, body: [r], dontBreakRows: true }, margin: [0, 0, 0, g], unbreakable: true,
          layout: { hLineWidth: function () { return 0; }, vLineWidth: function (i, no) { return i === 0 || i === no.table.widths.length ? 0 : g; }, vLineColor: function () { return t.fundo; },
            paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } } };
      });
    };
    var nSec = 0, secao = function (h, blocos) {   /* título + 1º bloco nunca se separam (título órfão no pé da página) */
      blocos = blocos.filter(Boolean); nSec++;
      cont.push(Object.assign({ stack: h.concat(blocos.slice(0, 1)), unbreakable: true }, t.quebra && nSec > 1 ? { pageBreak: "before" } : {}));
      cont = cont.concat(blocos.slice(1));
    };
    var linhaFina = function () { return { canvas: [{ type: "line", x1: 0, y1: 0, x2: CW, y2: 0, lineWidth: 0.6, lineColor: t.linha }], margin: [0, z(9), 0, z(9)] }; };
    var nCol = function (a4) { if (t.col) return k < 0.8 ? Math.min(t.col, 2) : t.col; return k < 0.8 ? Math.max(1, a4 - 1) : a4; };
    m.secoes.forEach(function (s, i) {
      var n = i + 1, h = cabSec(s, n), b = [];
      if (s.id === "sobre") {
        var tx = [];
        if (s.curto) tx.push({ table: { widths: [3, "*"], body: [[{ text: "", fillColor: t.corPura }, { text: s.curto, font: fT === "PF" ? "PF" : "Roboto", bold: fT !== "PF", fontSize: z(14.5), lineHeight: 1.3, color: t.txt, margin: [14, 1, 0, 1] }]] }, layout: semGap(t.fundo, 0), margin: [0, 0, 0, 14] });
        var ps = s.pars.map(function (p) { return { text: p, margin: [0, 0, 0, 9] }; });
        if (t.sob === "destaque" && s.curto) {   /* frase grande no centro + texto em duas colunas */
          tx = [{ text: "“" + s.curto + "”", font: fT, bold: true, fontSize: z(20), lineHeight: 1.25, color: t.txt, alignment: "center", margin: [z(20), 0, z(20), 6] }, { canvas: [{ type: "rect", x: 0, y: 0, w: 48 * k, h: 3, color: t.corPura }], margin: [(CW - 48 * k) / 2, 4, 0, 16] }];
          b = tx.concat(k >= 0.8 && ps.length > 1 ? [{ columns: [{ stack: ps.slice(0, Math.ceil(ps.length / 2)) }, { stack: ps.slice(Math.ceil(ps.length / 2)) }], columnGap: 22 }] : ps);
        } else if (s.retrato && t.sob === "topo") {
          var tw = s.fotoW || Math.min(CW * 0.42, 190), th = s.corte ? s.fotoH : Math.min(tw / m.retratoProp, s.fotoW ? H * 0.5 : 240);
          b = [{ stack: [s.corte ? { image: s.retrato, width: tw, height: th, alignment: "center", _bw: "sobre" } : { image: s.retrato, fit: [tw, th], alignment: "center", _bw: "sobre" }, { canvas: [{ type: "rect", x: 0, y: 0, w: tw, h: 4, color: t.corPura }], margin: [(CW - tw) / 2, 0, 0, 14] }], unbreakable: true }].concat(tx, ps);
        } else if (s.retrato && k >= 0.8) {   /* "Quem sou eu?" com a foto recortada ao lado (esquerda ou direita) */
          var fw = s.fotoW || CW * 0.36, fhh = s.corte ? s.fotoH : Math.min(fw / m.retratoProp, s.fotoW ? H * 0.55 : 300), colF = { width: fw, stack: [s.corte ? { image: s.retrato, width: fw, height: fhh, _bw: "sobre" } : { image: s.retrato, fit: [fw, fhh], alignment: "center", _bw: "sobre" }, { canvas: [{ type: "rect", x: 0, y: 0, w: fw, h: 4, color: t.corPura }] }] }, colT = { width: "*", stack: tx.concat(ps) };
          b.push({ columns: t.sob === "dir" ? [colT, colF] : [colF, colT], columnGap: 22, unbreakable: true });
        } else if (fT === "PF" && s.pars.join(" ").length > 650 && k >= 0.8) b = tx.concat([{ columns: [{ stack: ps.slice(0, Math.ceil(ps.length / 2)) }, { stack: ps.slice(Math.ceil(ps.length / 2)) }], columnGap: 22 }]);
        else b = tx.concat(ps);
      } else if (s.id === "perfil") {
        b = grade(s.itens.map(function (x) { return { stack: [{ text: String(x.k || "").toUpperCase(), fontSize: z(8), bold: true, color: t.cor, characterSpacing: 1 }, { text: String(x.v || ""), fontSize: z(11.5), bold: true, color: t.txt, margin: [0, 3, 0, 0] }], margin: [12, 10, 12, 10], fillColor: t.cartao }; }), nCol(3), 6);
      } else if (s.id === "numeros") {
        b = grade(s.itens.map(function (x) { return { stack: [{ text: String(x.v || ""), font: fT, bold: true, fontSize: z(25), color: t.cor }, { text: String(x.r || ""), fontSize: z(9.5), color: t.sub, margin: [0, 3, 0, 0] }], margin: [14, 14, 14, 14], fillColor: t.cartao }; }), nCol(3));
      } else if (s.id === "servicos") {
        var nc = nCol(s.fotos ? 3 : 2), cw0 = (CW - 8 * (nc - 1)) / nc;
        b = grade(s.itens.map(function (x, j) {
          var pil = [];
          if (s.fotos && s.fotos[j]) pil.push({ image: s.fotos[j], width: cw0, height: cw0 * 140 / 240 });
          pil.push({ stack: [{ canvas: [{ type: "rect", x: 0, y: 0, w: 18, h: 3, color: t.corPura }], margin: [0, 0, 0, 8] }, { text: String(x.t || ""), bold: true, fontSize: z(12), color: t.txt }, { text: String(x.d || ""), fontSize: z(9.5), color: t.sub, margin: [0, 4, 0, 0], lineHeight: 1.3 }], margin: [12, 12, 12, 12] });
          return { stack: pil, fillColor: t.cartao };
        }), nc);
      } else if (s.id === "experiencia") {
        s.grupos.forEach(function (g) {
          var rot = g.nome && g.nome.toLowerCase() !== String(s.tit).toLowerCase() ? { text: tituloCaixa(g.nome), bold: true, fontSize: z(10), color: t.cor, characterSpacing: k, margin: [0, b.length ? z(10) : 0, 0, z(6)] } : null;
          g.itens.forEach(function (x, gi) {
            var lk = linkDe(x.link, "site"), sub2 = [x.papel, x.onde].map(function (v) { return String(v || "").trim(); }).filter(Boolean).join("  ·  ");
            var col = [{ text: String(x.ano || ""), width: z(52), bold: true, fontSize: z(10), color: t.cor, margin: [0, 2, 0, 0] },
              { width: "*", stack: [{ text: String(x.titulo || ""), bold: true, fontSize: z(11.5), color: t.txt }].concat(sub2 ? [{ text: sub2, fontSize: z(9.5), color: t.sub, margin: [0, 2, 0, 0] }] : []) }];
            if (!String(x.ano || "").trim()) col.shift();
            else if (t.lst === "tempo") col[0] = { width: z(52), table: { body: [[{ text: String(x.ano), bold: true, fontSize: z(9.5), color: sobre(t.corPura), fillColor: t.corPura, alignment: "center", margin: [4, 3, 4, 2] }]] }, layout: semGap(t.fundo, 0) };
            if (x.foto) col.unshift({ image: x.foto, width: z(66), height: z(42), link: lk || undefined });   /* foto do trabalho (clicável quando tem link) */
            if (lk) col.push({ width: z(62), table: { body: [[{ text: rotI(m.kit, "VER  ↗"), bold: true, fontSize: z(8), color: sobre(t.corPura), fillColor: t.corPura, alignment: "center", margin: [6, 4, 6, 4], link: lk }]] }, layout: semGap(t.fundo, 0) });
            b.push({ stack: (gi === 0 && rot ? [rot] : []).concat(t.lst === "cartoes" ? [Object.assign(cartao([{ columns: col, columnGap: 10 }], [12, 10, 12, 10]), { margin: [0, 0, 0, 8] })] : [{ columns: col, columnGap: 10 }, linhaFina()]), unbreakable: true });   /* rótulo do grupo nunca fica sozinho no pé da página */
          });
        });
      } else if (s.id === "formacao") {
        b = s.itens.map(function (x) {
          var anoF = t.lst === "tempo" && String(x.ano || "").trim() ? { width: z(52), table: { body: [[{ text: String(x.ano), bold: true, fontSize: z(9.5), color: sobre(t.corPura), fillColor: t.corPura, alignment: "center", margin: [4, 3, 4, 2] }]] }, layout: semGap(t.fundo, 0) } : { text: String(x.ano || ""), width: z(52), bold: true, fontSize: z(10), color: t.cor };
          var lin = { columns: [anoF, { width: "*", stack: [{ text: String(x.curso || ""), bold: true, fontSize: z(11), color: t.txt }, { text: String(x.onde || ""), fontSize: z(9.5), color: t.sub }] }], columnGap: 10 };
          return t.lst === "cartoes" ? Object.assign(cartao([lin], [12, 10, 12, 10]), { margin: [0, 0, 0, 8] }) : { stack: [lin, linhaFina()], unbreakable: true };
        });
      } else if (s.id === "habilidades") {
        b = grade(s.itens.map(function (x) { return { text: x, bold: true, fontSize: z(10), color: t.txt, alignment: "center", margin: [8, 9, 8, 9], fillColor: t.cartao }; }), nCol(3), 6);
      } else if (s.id === "links") {   /* botões do portfólio, clicáveis no PDF + QR para quem imprimiu */
        var qw = z(54), ncL = nCol(2), lwL = (CW - 8 * (ncL - 1)) / ncL;
        b = grade(s.itens.map(function (x) {
          var txt = { width: "*", stack: [{ text: String(x.rot || "Link").toUpperCase(), bold: true, fontSize: z(11), color: t.txt, link: x.href }, { text: x.href.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), fontSize: z(8.5), color: t.cor, margin: [0, 3, 0, 0], link: x.href }, { text: "TOQUE PARA ABRIR  ↗", fontSize: z(7.5), bold: true, color: t.sub, margin: [0, 6, 0, 0], link: x.href }] };
          var corpoL = { columns: x.qr ? [txt, { image: x.qr, width: qw, height: qw, link: x.href }] : [txt], columnGap: 8, margin: [12, 12, 12, 12] };
          if (!x.foto) return Object.assign(corpoL, { fillColor: t.cartao });
          return { stack: [{ image: x.foto, width: lwL, height: lwL * 180 / 320, link: x.href }, corpoL], fillColor: t.cartao };   /* capa do vídeo/portfólio, clicável */
        }), ncL);
      } else if (s.id === "galeria") {
        if (!s.grande) b = grade(s.peq.map(function (u) { var lw = (CW - 8) / 2; return { image: u, width: lw, height: lw * 225 / 180 }; }), 2);
        else {
          var gal = [{ image: s.grande, width: CW, height: CW * 0.525, margin: [0, 0, 0, 8] }];   /* foto grande e as pequenas ficam juntas */
          if (s.peq.length) { var lw3 = (CW - 16) / 3; gal = gal.concat(grade(s.peq.map(function (u) { return { image: u, width: lw3, height: lw3 * 110 / 160 }; }), 3)); }
          b.push(gal[0]); if (gal.length > 1) b.push({ stack: gal.slice(1), unbreakable: true });
        }
        if (s.legenda) b.push({ text: s.legenda, fontSize: z(9), color: t.sub, italics: true });
      } else if (s.id === "clientes") {
        b = grade(s.itens.map(function (x) { return { text: x, bold: true, fontSize: z(10), color: t.txt, alignment: "center", margin: [8, 13, 8, 13], fillColor: t.cartao }; }), nCol(3));
      } else if (s.id === "depoimentos") {
        b = s.itens.map(function (x) {
          return Object.assign(cartao([{ text: "“", font: "PF", bold: true, fontSize: 44, color: t.cor, lineHeight: 0.62 }, { text: String(x.texto || ""), italics: true, fontSize: z(11.5), lineHeight: 1.4, color: t.txt },
            { text: String(x.autor || ""), bold: true, fontSize: z(10), color: t.txt, margin: [0, 10, 0, 0] }, { text: String(x.cargo || ""), fontSize: z(9), color: t.sub }], [18, 14, 18, 14]), { margin: [0, 0, 0, 10] });
        });
      } else if (s.id === "release") {
        var cab = []; if (s.titulo) cab.push({ text: s.titulo, font: fT, bold: true, fontSize: z(16), lineHeight: 1.2, color: t.txt, margin: [0, 0, 0, 4] });
        if (s.data) cab.push({ text: s.data, fontSize: 9, color: t.cor, bold: true, characterSpacing: 1, margin: [0, 0, 0, 10] });
        var pr = s.pars.map(function (p) { return { text: p, margin: [0, 0, 0, 9] }; });
        b.push({ stack: cab.concat(pr.slice(0, 1)) }); b = b.concat(pr.slice(1));
      } else if (s.id === "imprensa") {
        b = s.itens.map(function (x) {
          var lk = linkDe(x.link, "site");
          return { stack: [{ text: String(x.veiculo || "").toUpperCase(), bold: true, fontSize: 8.5, color: t.cor, characterSpacing: 1.2 }, { text: String(x.titulo || ""), bold: true, fontSize: z(12), color: t.txt, margin: [0, 2, 0, 2], link: lk || undefined },
            { text: [x.data || "", lk ? (x.data ? "   ·   " : "") + String(x.link).replace(/^https?:\/\//, "") : ""].join(""), fontSize: 8.5, color: t.sub, link: lk || undefined }, linhaFina()], unbreakable: true };
        });
      } else if (s.id === "agenda") {
        b = s.itens.map(function (x) {
          return { table: { widths: [z(80), "*", z(140)], body: [[{ text: String(x.data || ""), bold: true, color: t.cor, fontSize: z(10.5), margin: [0, 8, 0, 8] }, { text: String(x.titulo || ""), bold: true, color: t.txt, fontSize: z(10.5), margin: [0, 8, 0, 8] }, { text: String(x.local || ""), color: t.sub, fontSize: z(9.5), margin: [0, 8, 0, 8] }]] },
            layout: { hLineWidth: function (i) { return i === 1 ? 0.6 : 0; }, vLineWidth: function () { return 0; }, hLineColor: function () { return t.linha; } }, unbreakable: true };
        });
      } else if (s.id === "rider") {
        if (s.itens.length) { var ul = function (l) { return { ul: l, markerColor: t.cor, fontSize: z(10.5), lineHeight: 1.45 }; }; b.push(s.itens.length > 7 && k >= 0.8 ? { columns: [ul(s.itens.slice(0, Math.ceil(s.itens.length / 2))), ul(s.itens.slice(Math.ceil(s.itens.length / 2)))], columnGap: 20 } : ul(s.itens)); }
        if (s.obs) b.push({ text: s.obs, italics: true, fontSize: z(9.5), color: t.sub, margin: [0, 10, 0, 0] });
      } else if (s.id === "contato") {
        var c = m.contato, lin = [["WhatsApp", c.tel, linkDe(c.tel, "tel")], ["E-mail", c.email, linkDe(c.email, "email")], ["Site", c.site, linkDe(c.site, "site")], ["Instagram", c.insta, linkDe(c.insta, "insta")],
          ["TikTok", c.tiktok, linkDe(c.tiktok, "tiktok")], ["YouTube", c.youtube, linkDe(c.youtube, "youtube")], [rotI(m.kit, "Cidade"), c.cidade, ""]].filter(function (x) { return String(x[1] || "").trim(); });
        var esq = [{ text: String(c.resp || m.marca), font: fT, bold: true, fontSize: z(18), color: t.txt }].concat(c.cargo ? [{ text: c.cargo, fontSize: z(10), color: t.sub, margin: [0, 2, 0, 12] }] : [{ text: "", margin: [0, 0, 0, 10] }])
          .concat(lin.map(function (x) { return { columns: [{ text: x[0].toUpperCase(), width: z(74), fontSize: z(8), bold: true, color: t.cor, characterSpacing: 1, margin: [0, 2, 0, 0] }, { text: String(x[1]) + (x[2] ? "  ↗" : ""), fontSize: z(11), color: t.txt, link: x[2] || undefined, decoration: x[2] ? "underline" : undefined, decorationColor: t.cor }], margin: [0, 0, 0, 6] }; }));
        var cols = [{ stack: esq, width: "*" }];
        if (m.logo) { var lw2 = 120 * k, lh2 = lw2 / m.logoProp; if (lh2 > 70 * k) { lh2 = 70 * k; lw2 = lh2 * m.logoProp; } cols.push({ image: m.logo, width: lw2, height: lh2, margin: [10, 4, 0, 0] }); }
        b.push({ table: { widths: [5, "*"], body: [[{ text: "", fillColor: t.corPura }, { columns: cols, margin: [z(20), z(18), z(20), z(18)], fillColor: t.cartao }]] }, layout: semGap(t.fundo, 0) });
        if (m.botoes.length) b.push({ stack: grade(m.botoes.map(function (x) { return { text: x[0] + "  ↗", link: x[1], bold: true, fontSize: z(9), color: corSobreCor, fillColor: t.corPura, alignment: "center", characterSpacing: 1, margin: [6, 9, 6, 9] }; }), nCol(3), 6), margin: [0, 10, 0, 0] });
      }
      secao(h, b);
    });
    return montar(cont);

    function montar(c) {
      if (m.previa) { var vistos = [], marca = function (o) {   /* só na prévia: cada foto vira um "link" invisível que diz qual é (toque na prévia → ajustar) */
          if (!o || typeof o !== "object" || vistos.indexOf(o) >= 0) return; vistos.push(o);
          if (Array.isArray(o)) { o.forEach(marca); return; }
          if (typeof o.image === "string") { var al = o._bw || (m.tags || {})[o.image]; if (al) o.link = "https://bw.foto/?k=" + encodeURIComponent(al); }
          delete o._bw; Object.keys(o).forEach(function (q) { if (q !== "image" && o[q] && typeof o[q] === "object") marca(o[q]); }); };
        marca(c); marca(capaFundo); }
      else { var tira = function (o) { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(tira); return; } delete o._bw; Object.keys(o).forEach(function (q) { if (q !== "image" && o[q] && typeof o[q] === "object") tira(o[q]); }); }; tira(c); }
      return {
        pageSize: { width: W, height: H }, pageMargins: [MX, z(64), MX, z(60)],
        info: { title: rotI(m.kit, "Apresentação — ") + m.marca, author: m.marca, creator: "Brightway — Press kit" },
        background: function (pg) {
          if (pg === 1) return capaFundo.concat(elNos(m, 1, W, H));
          var fd = [{ type: "rect", x: 0, y: 0, w: W, h: H, color: t.fundo }];
          if (t.pg === "padrao") fd.push({ type: "rect", x: 0, y: 0, w: W, h: 4, color: t.corPura });
          else if (t.pg === "cabeca") fd.push({ type: "rect", x: 0, y: 0, w: W, h: z(44), color: t.corPura });
          else if (t.pg === "lateral") fd.push({ type: "rect", x: 0, y: 0, w: Math.max(8, MX * 0.32), h: H, color: t.corPura });
          else if (t.pg === "moldura") fd.push({ type: "rect", x: 16, y: 16, w: W - 32, h: H - 32, lineWidth: 1.2, lineColor: t.corPura });
          else if (t.pg === "rodape") fd.push({ type: "rect", x: 0, y: H - z(34), w: W, h: z(34), color: t.corPura });
          return [{ canvas: fd, absolutePosition: { x: 0, y: 0 } }].concat(elNos(m, pg, W, H));
        },
        header: function (pg) { if (pg === 1) return null; var cH = t.pg === "cabeca" ? sobre(t.corPura) : t.sub; return { columns: [{ text: m.marca.toUpperCase(), fontSize: z(7.5), bold: true, color: cH, characterSpacing: 1.6, link: (m.botoes.filter(function (x) { return x[0] === "SITE"; })[0] || m.botoes[0] || [])[1] || undefined }, { text: String(m.etiqueta).toUpperCase(), fontSize: z(7.5), color: cH, alignment: "right", characterSpacing: 1.6 }], margin: [MX, t.pg === "cabeca" ? z(18) : z(28), MX, 0] }; },
        footer: function (pg, n) { if (pg === 1) return null; var rd = []; (m.rodape || []).forEach(function (x, i) { if (i) rd.push("   ·   "); rd.push({ text: String(x[0]), link: x[1] || undefined }); }); var cF = t.pg === "rodape" ? sobre(t.corPura) : t.sub; return { columns: [{ text: rd.length ? rd : m.linhaContato, fontSize: z(7.5), color: cF }, { text: pg + " / " + n, fontSize: z(7.5), color: cF, alignment: "right", width: 50 }], margin: [MX, t.pg === "rodape" ? z(34) : z(22), MX, 0] }; },
        content: c,
        defaultStyle: { font: "Roboto", fontSize: z(10.5) * (t.escTxt || 1), lineHeight: 1.4, color: t.txt }
      };
    }
  }

  /* ================= BIBLIOTECAS ================= */
  var carregadas = {};
  function script(src) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("sem internet")); }; document.head.appendChild(s); }); }
  function carregar(nome) {
    if (carregadas[nome]) return carregadas[nome];
    if (nome === "docx" && window.docx) return (carregadas[nome] = Promise.resolve());
    if (nome === "zip" && window.JSZip) return (carregadas[nome] = Promise.resolve());
    if (nome === "qr" && window.qrcode) return (carregadas[nome] = Promise.resolve());
    var p = LIB[nome].reduce(function (q, src) { return q.then(function () { return script(src); }); }, Promise.resolve());
    if (nome === "pdf") p = p.then(fontesPdf);
    carregadas[nome] = p.catch(function (e) { delete carregadas[nome]; throw e; });
    return carregadas[nome];
  }
  function b64(buf) { var u = new Uint8Array(buf), s = "", n = 0x8000; for (var i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n)); return btoa(s); }
  async function fontesPdf() {
    /* as fontes vêm do próprio site (OFL 1.1, assets/fontes/OFL.txt); o pdfMake 0.2.20 troca o sistema de arquivos inteiro → junta com o do vfs_fonts */
    var arqs = ["Montserrat-500.ttf", "Montserrat-800.ttf", "PlayfairDisplay-400.ttf", "PlayfairDisplay-700.ttf"], minhas = {};
    for (var i = 0; i < arqs.length; i++) { try { var r = await fetch("assets/fontes/" + arqs[i]); if (r.ok) minhas[arqs[i]] = b64(await r.arrayBuffer()); } catch (e) { } }
    var tem = function (a) { return !!minhas[a]; };
    pdfMake.addVirtualFileSystem(Object.assign({}, window.vfs || {}, minhas));
    var rob = { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" };
    pdfMake.fonts = { Roboto: rob,
      MO: tem("Montserrat-800.ttf") ? { normal: "Montserrat-500.ttf", bold: "Montserrat-800.ttf", italics: "Montserrat-500.ttf", bolditalics: "Montserrat-800.ttf" } : rob,
      PF: tem("PlayfairDisplay-700.ttf") ? { normal: "PlayfairDisplay-400.ttf", bold: "PlayfairDisplay-700.ttf", italics: "PlayfairDisplay-400.ttf", bolditalics: "PlayfairDisplay-700.ttf" } : rob };
  }
  var _pdfjs = null;
  async function pdfjs() { if (!_pdfjs) { _pdfjs = await import(PDFJS + "pdf.min.mjs"); _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs"; } return _pdfjs; }
  async function pdfBytes(def) { await carregar("pdf"); window.__pkUltimoDef = def; return await new Promise(function (ok, erro) { try { pdfMake.createPdf(def).getBuffer(function (b) { ok(b); }); } catch (e) { erro(e); } }); }

  /* ================= WORD (docx editável) ================= */
  function binDe(dataUrl) { var bin = atob(dataUrl.split(",")[1]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  async function wordBlob(m) {
    await carregar("docx");
    var D = window.docx, t = m.tema, cor = destaqueLegivel(t.corPura, "#FFFFFF").replace("#", ""), txt = (t.escuro ? "1D222B" : t.txt.replace("#", "")), sub = "5B6472";
    var fonteT = t.fTit === "PF" ? "Playfair Display" : t.fTit === "MO" ? "Montserrat" : "Calibri";
    var P = function (texto, o) { o = o || {}; return new D.Paragraph({ alignment: o.al, heading: o.heading, spacing: { after: o.after == null ? 140 : o.after, before: o.before || 0 }, bullet: o.bullet ? { level: 0 } : undefined, pageBreakBefore: !!o.quebra,
      children: [new D.TextRun({ text: texto || "", bold: !!o.b, italics: !!o.i, size: o.size || 22, color: o.color || txt, font: o.font })] }); };
    var IMG = function (u, w, h) { return new D.ImageRun({ type: /^data:image\/png/.test(u) ? "png" : "jpg", data: binDe(u), transformation: { width: Math.round(w), height: Math.round(h) } }); };
    var filhos = [];
    if (m.logo) { var lw = 220, lh = lw / m.logoProp; if (lh > 90) { lh = 90; lw = 90 * m.logoProp; } filhos.push(new D.Paragraph({ children: [IMG(m.logo, lw, lh)], spacing: { after: 300 } })); }
    filhos.push(P(String(m.etiqueta).toUpperCase(), { b: true, size: 18, color: cor, after: 80 }));
    filhos.push(P(m.marca, { b: true, size: 60, font: fonteT, after: 160 }));
    if (m.slogan) filhos.push(P(m.slogan, { size: 28, color: sub, after: 240 }));
    var capaW = m.capaImg || m.retrato;
    if (capaW) { var pr = await proporcao(capaW), cw = pr < 1 ? Math.round(520 * pr) : 600, ch = pr < 1 ? 520 : Math.round(600 / pr); filhos.push(new D.Paragraph({ children: [IMG(capaW, cw, ch)], spacing: { after: 200 } })); }
    if (m.cidade) filhos.push(P(m.cidade, { size: 18, color: sub }));
    var h2 = function (s, n, primeira) { filhos.push(P(String(n).padStart(2, "0") + "  " + (t.caixaAlta ? s.tit.toUpperCase() : s.tit), { b: true, size: 32, color: cor, font: fonteT, heading: D.HeadingLevel.HEADING_1, after: 160, quebra: primeira })); };
    var tabela = function (linhasT, larguras) {
      return new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: linhasT.map(function (l) { return new D.TableRow({ children: l.map(function (cel, j) { return new D.TableCell({ width: larguras ? { size: larguras[j], type: D.WidthType.PERCENTAGE } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: cel }); }) }); }) });
    };
    m.secoes.forEach(function (s, i) {
      h2(s, i + 1, i === 0);
      if (s.id === "sobre") { if (s.retrato) { var rw = Math.round(200 * Math.min(1, m.retratoProp)), rhh = Math.round(rw / m.retratoProp); filhos.push(new D.Paragraph({ children: [IMG(s.retrato, rw, rhh)], spacing: { after: 120 } })); } if (s.curto) filhos.push(P(s.curto, { b: true, size: 28 })); s.pars.forEach(function (p) { filhos.push(P(p)); }); }
      else if (s.id === "perfil") filhos.push(tabela(s.itens.map(function (x) { return [[P(String(x.k || ""), { b: true, size: 18, color: cor, after: 0 })], [P(String(x.v || ""), { b: true, after: 0 })]]; }), [35, 65]), P("", { after: 120 }));
      else if (s.id === "experiencia") s.grupos.forEach(function (g) { if (g.nome) filhos.push(P(g.nome.toUpperCase(), { b: true, size: 20, color: cor, after: 60, before: 120 })); g.itens.forEach(function (x) {
        var lk = linkDe(x.link, "site"), ch = [new D.TextRun({ text: (x.ano ? x.ano + "  ·  " : "") + (x.titulo || ""), bold: true, size: 24, color: txt })];
        if (x.foto) filhos.push(new D.Paragraph({ children: [IMG(x.foto, 150, 96)], spacing: { after: 40 } }));
        filhos.push(new D.Paragraph({ children: ch, spacing: { after: 20 } }));
        var sb = [x.papel, x.onde].filter(function (v) { return String(v || "").trim(); }).join("  ·  ");
        var ch2 = [new D.TextRun({ text: sb, size: 20, color: sub })]; if (lk) ch2.push(new D.TextRun({ text: sb ? "   " : "", size: 20 }), new D.ExternalHyperlink({ link: lk, children: [new D.TextRun({ text: "VER ↗", bold: true, size: 18, color: cor, underline: {} })] }));
        filhos.push(new D.Paragraph({ children: ch2, spacing: { after: 140 } })); }); });
      else if (s.id === "formacao") s.itens.forEach(function (x) { filhos.push(P((x.ano ? x.ano + "  ·  " : "") + (x.curso || ""), { b: true, size: 23, after: 20 }), P(String(x.onde || ""), { size: 20, color: sub })); });
      else if (s.id === "habilidades") s.itens.forEach(function (x) { filhos.push(P(x, { bullet: true, after: 60 })); });
      else if (s.id === "links") s.itens.forEach(function (x) { if (x.foto) filhos.push(new D.Paragraph({ children: [new D.ExternalHyperlink({ link: x.href, children: [IMG(x.foto, 320, 180)] })], spacing: { after: 40 } })); filhos.push(new D.Paragraph({ spacing: { after: 100 }, children: [new D.TextRun({ text: String(x.rot || "Link") + ":  ", bold: true, size: 22, color: txt }), new D.ExternalHyperlink({ link: x.href, children: [new D.TextRun({ text: x.href.replace(/^https?:\/\/(www\.)?/, ""), size: 22, color: cor, underline: {} })] })] })); });
      else if (s.id === "numeros") filhos.push(tabela(emGrupos(s.itens, 3).map(function (r) { while (r.length < 3) r.push({ v: "", r: "" }); return r.map(function (x) { return [P(String(x.v || ""), { b: true, size: 40, color: cor, font: fonteT, after: 40 }), P(String(x.r || ""), { size: 18, color: sub, after: 0 })]; }); })), P("", { after: 120 }));
      else if (s.id === "servicos") s.itens.forEach(function (x, j) { if (s.fotos && s.fotos[j]) filhos.push(new D.Paragraph({ children: [IMG(s.fotos[j], 240, 140)], spacing: { after: 60 } })); filhos.push(P(String(x.t || ""), { b: true, size: 24, after: 40 }), P(String(x.d || ""), { size: 20, color: sub })); });
      else if (s.id === "galeria") { if (s.grande) filhos.push(new D.Paragraph({ children: [IMG(s.grande, 600, 315)], spacing: { after: 120 } })); if (s.peq.length) filhos.push(new D.Paragraph({ children: s.peq.map(function (u) { return s.grande ? IMG(u, 190, 131) : IMG(u, 140, 187); }), spacing: { after: 120 } })); if (s.legenda) filhos.push(P(s.legenda, { i: true, size: 18, color: sub })); }
      else if (s.id === "clientes") filhos.push(tabela(emGrupos(s.itens, 3).map(function (r) { while (r.length < 3) r.push(""); return r.map(function (x) { return [P(x, { b: true, al: D.AlignmentType.CENTER, after: 0 })]; }); })), P("", { after: 120 }));
      else if (s.id === "depoimentos") s.itens.forEach(function (x) { filhos.push(P("“" + String(x.texto || "") + "”", { i: true, size: 24, after: 60 }), P(String(x.autor || ""), { b: true, after: 0 }), P(String(x.cargo || ""), { size: 18, color: sub, after: 200 })); });
      else if (s.id === "release") { if (s.titulo) filhos.push(P(s.titulo, { b: true, size: 30, font: fonteT, after: 60 })); if (s.data) filhos.push(P(s.data, { b: true, size: 18, color: cor })); s.pars.forEach(function (p) { filhos.push(P(p)); }); }
      else if (s.id === "imprensa") s.itens.forEach(function (x) { filhos.push(P(String(x.veiculo || "").toUpperCase(), { b: true, size: 16, color: cor, after: 20 }), P(String(x.titulo || ""), { b: true, size: 24, after: 20 }), P([x.data, x.link].filter(Boolean).join(" · "), { size: 18, color: sub, after: 200 })); });
      else if (s.id === "agenda") filhos.push(tabela(s.itens.map(function (x) { return [[P(String(x.data || ""), { b: true, color: cor, after: 0 })], [P(String(x.titulo || ""), { b: true, after: 0 })], [P(String(x.local || ""), { size: 20, color: sub, after: 0 })]]; }), [20, 50, 30]), P("", { after: 120 }));
      else if (s.id === "rider") { s.itens.forEach(function (x) { filhos.push(P(x, { bullet: true, after: 60 })); }); if (s.obs) filhos.push(P(s.obs, { i: true, size: 20, color: sub })); }
      else if (s.id === "contato") { var c = m.contato; filhos.push(P(String(c.resp || m.marca), { b: true, size: 32, font: fonteT, after: 20 })); if (c.cargo) filhos.push(P(c.cargo, { color: sub })); [["WhatsApp", c.tel], ["E-mail", c.email], ["Site", c.site], ["Instagram", c.insta], ["TikTok", c.tiktok], ["YouTube", c.youtube], [rotI(m.kit, "Cidade"), c.cidade]].forEach(function (x) { if (String(x[1] || "").trim()) filhos.push(P(x[0] + ": " + x[1], { after: 60 })); }); }
    });
    var doc = new D.Document({ creator: "Brightway", title: rotI(m.kit, "Apresentação — ") + m.marca, styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: filhos }] });
    return await D.Packer.toBlob(doc);
  }

  /* ================= TELA ================= */
  var PK_XY = { x: 0, y: 0 }, ULT_TIRADA = "", KIT = null, IMGS = imgsVazias(), VISTA = "lista", PAGS = 0;
  function aviso(t, erro) { if (window.BWAviso) { if (erro) BWAviso.erro(t); else BWAviso(t); } }
  function andamento(t) { if (window.BWAviso) { if (t) BWAviso("⏳ " + t, "", 0); else BWAviso.fechar && BWAviso.fechar(); } }
  function baixar(b, nome) { var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 8000); }
  function nomeArq(k, ext) { return ("presskit-" + ((k.d && k.d.marca) || "marca")).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() + "." + ext; }
  function dataBR(iso) { var d = new Date(iso); return isNaN(d) ? "" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function mostrar(v) {
    VISTA = v; $("vLista").hidden = v !== "lista"; $("vModelos").hidden = v !== "modelos"; $("vEd").hidden = v !== "editor";
    try { history.replaceState(null, "", v === "editor" && KIT ? "presskit.html?k=" + encodeURIComponent(KIT.id) : "presskit.html"); } catch (e) { }
    window.scrollTo(0, 0); if (v === "editor") setTimeout(altEd, 0);
  }
  /* PC: a coluna do formulário rola sozinha (barra ao lado das opções) e cabe na tela, sem rolar a página */
  function altEd() {
    var ed = document.querySelector(".pk-ed"); if (!ed) return;
    if (window.innerWidth <= 1060) { ed.style.height = ""; return; }
    var t = ed.getBoundingClientRect().top + window.scrollY; ed.style.height = Math.max(420, window.innerHeight - t - 12) + "px";
  }

  /* ---------- LISTA ---------- */
  async function desenharLista() {
    var l = lista().sort(function (a, b) { return String(b.atualizado || "").localeCompare(String(a.atualizado || "")); });
    $("lista").innerHTML = l.length ? l.map(function (k) {
      return '<div class="pk-card" data-id="' + esc(k.id) + '"><button type="button" class="pk-mini" data-a="abrir" data-id="' + esc(k.id) + '" aria-label="Abrir ' + esc(k.nome) + '"><img alt="" data-thumb="kit-' + esc(k.id) + '"></button>' +
        '<div class="pk-info"><b>' + esc(k.nome || "Press kit") + '</b><span>' + esc(modeloDe(k.modelo).nome) + " · " + esc(dataBR(k.atualizado)) + '</span>' +
        '<div class="pk-acoes"><button type="button" class="bw-btn pri" data-a="abrir" data-id="' + esc(k.id) + '">✎ ABRIR</button><button type="button" class="bw-btn" data-a="duplicar" data-id="' + esc(k.id) + '">⧉ DUPLICAR</button><button type="button" class="bw-btn" data-a="excluir" data-id="' + esc(k.id) + '" aria-label="Excluir">✕</button></div></div></div>';
    }).join("") : '<div class="pk-vazio">Nenhuma apresentação ainda.<br>Toque em <b>＋ NOVA APRESENTAÇÃO</b> e escolha um modelo — ele já vem com um exemplo para você trocar pelos seus dados (ou é só falar).</div>';
    [].slice.call($("lista").querySelectorAll("img[data-thumb]")).forEach(async function (im) { var u = await idbGet("thumbs", im.getAttribute("data-thumb")); if (u) im.src = u; else im.parentNode.classList.add("sem"); });
  }

  /* ---------- MODELOS ---------- */
  var THUMB_V = "v2";
  async function desenharModelos() {
    $("modelos").innerHTML = MODELOS.map(function (m) {
      return '<button type="button" class="pk-mod" data-a="usarModelo" data-m="' + m.id + '"><span class="pk-mod-capa"><img alt="Capa do modelo ' + esc(m.nome) + '" data-mcapa="' + m.id + '"></span>' +
        '<span class="pk-mod-nome">' + m.ico + " " + esc(m.nome.toUpperCase()) + '</span><span class="pk-mod-para">' + esc(m.para) + "</span></button>";
    }).join("");
    for (var i = 0; i < MODELOS.length; i++) {
      var md = MODELOS[i], im = $("modelos").querySelector('[data-mcapa="' + md.id + '"]'); if (!im) continue;
      var u = await idbGet("thumbs", "mod-" + md.id + "-" + THUMB_V);
      if (!u) { try { u = await capaPng(kitNovo(md.id), imgsExemplo(md), 320); if (u) idbPut("thumbs", "mod-" + md.id + "-" + THUMB_V, u); } catch (e) { u = ""; } }
      if (u) im.src = u; else im.parentNode.classList.add("sem");
      if (VISTA !== "modelos") return;
    }
  }
  async function capaPng(kit, imgs, larg) {
    var m = await modelo(kit, imgs), bytes = await pdfBytes(defPdf(m, { soCapa: true })), J = await pdfjs();
    var doc = await J.getDocument({ data: bytes, isEvalSupported: false }).promise, pg = await doc.getPage(1), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: larg / vp0.width });
    var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; doc.destroy();
    return c.toDataURL("image/jpeg", 0.82);
  }

  /* ---------- EDITOR ---------- */
  async function abrirKit(id) {
    var k = acharKit(id); if (!k) { aviso("Esse press kit não está mais aqui.", true); mostrar("lista"); desenharLista(); return; }
    KIT = k; IMGS = (await idbGet("imgs", k.id)) || imgsVazias(); if (!Array.isArray(IMGS.fotos)) IMGS.fotos = [];
    mostrar("editor"); desenharForm(); desenharTrocar(); agendarPrevia(0); iniciarHist();
    /* fotos que estão na conta e não neste aparelho (feitas em outro aparelho) */
    if (window.BWPkNuvem) BWPkNuvem.baixar(k, IMGS).then(function (n) { if (!n || !KIT || KIT.id !== k.id) return; IMGS = n; idbPut("imgs", k.id, n); desenharForm(); agendarPrevia(0); aviso("Fotos trazidas da sua conta ✓"); }).catch(function () { });
  }
  /* 28/11 (dono: "vários press kits"): trocar de um para outro sem voltar para a lista, e duplicar o aberto */
  function desenharTrocar() {
    var sel = $("edTrocar"); if (!sel || !KIT) return;
    var l = lista().sort(function (a, b) { return String(b.atualizado || "").localeCompare(String(a.atualizado || "")); });
    sel.innerHTML = '<option value="" disabled>📁 MEUS PRESS KITS (' + l.length + ")</option>" + l.map(function (k) { return '<option value="' + esc(k.id) + '"' + (k.id === KIT.id ? " selected" : "") + ">" + esc(k.nome || "Press kit") + (k.idioma ? " · " + k.idioma.toUpperCase() : "") + "</option>"; }).join("") + '<option value="__novo">＋ Novo press kit…</option>';
  }
  async function guardarAgora() { if (!KIT) return; salvarKit(KIT); clearTimeout(tGuardarImgs); await idbPut("imgs", KIT.id, IMGS); }
  async function duplicarKit(id, nomeNovo, mexer) {
    if (KIT && KIT.id === id) await guardarAgora();
    var k = acharKit(id); if (!k) return null; var n = clone(k); n.id = uid(); n.nome = nomeNovo || (k.nome || "Press kit") + " (cópia)"; n.criado = new Date().toISOString(); delete n.pub; delete n.nuvem;
    if (mexer) mexer(n); salvarKit(n);
    var im = await idbGet("imgs", k.id); if (im) { await idbPut("imgs", n.id, im); if (window.BWPkNuvem) BWPkNuvem.subir(n.id, im); } var th = await idbGet("thumbs", "kit-" + k.id); if (th) await idbPut("thumbs", "kit-" + n.id, th);
    return n;
  }
  async function criarKit(modId) {
    var k = kitNovo(modId), mod = modeloDe(modId), im = imgsExemplo(mod);
    salvarKit(k); await idbPut("imgs", k.id, im);
    KIT = k; IMGS = im; mostrar("editor"); desenharForm(); desenharTrocar(); agendarPrevia(0);
    aviso("Modelo " + mod.nome + " aberto com um exemplo");
  }
  function guardar() { if (!KIT) return; salvarKit(KIT); marcarHist(); }
  /* ↶ ↷ DESFAZER / REFAZER (28/11, dono: "seta de refazer em cada janela de alterações + atalhos do PC iguais às outras ferramentas"):
     foto do press kit (textos, estilo, elementos, ajustes das fotos) a cada mudança; mudanças em menos de 0,4 s viram um passo só.
     As imagens não são copiadas (só as referências): desfazer é leve. Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y. */
  var HIST = { des: [], ref: [], atual: null, t: 0, volta: false };
  function fotoHist() { if (!KIT) return null; var k = Object.assign({}, KIT); delete k.atualizado; delete k.nuvem; return { j: JSON.stringify(k), enq: JSON.stringify(IMGS.enq || {}), lv: Object.assign({}, IMGS.livres || {}), lvj: Object.keys(IMGS.livres || {}).sort().join(",") }; }
  function igualHist(a, b) { return a && b && a.j === b.j && a.enq === b.enq && a.lvj === b.lvj; }
  function iniciarHist() { HIST = { des: [], ref: [], atual: fotoHist(), t: 0, volta: false }; histUi(); }
  function passarHist() { clearTimeout(HIST.t); HIST.t = 0; if (HIST.volta || !KIT) return; var f = fotoHist(); if (!HIST.atual || Date.now() < (HIST.ate || 0) || (HIST_MEXEU || 0) <= (HIST.tA || 0)) { HIST.atual = f; HIST.tA = Date.now(); return; }   /* mudança que a tela faz sozinha (sem toque/tecla da pessoa) não vira passo */ if (igualHist(f, HIST.atual)) return;
    HIST.des.push(HIST.atual); if (HIST.des.length > 60) HIST.des.shift(); HIST.ref = []; HIST.atual = f; HIST.tA = Date.now(); histUi(); }
  var HIST_MEXEU = 0; ["pointerdown", "keydown", "input", "change"].forEach(function (t) { document.addEventListener(t, function (ev) { var b = ev.target && ev.target.closest && ev.target.closest('[data-a="desfazer"],[data-a="refazer"]'); if (!b && !((ev.ctrlKey || ev.metaKey) && /^[zy]$/i.test(ev.key || ""))) HIST_MEXEU = Date.now(); }, true); });
  function marcarHist() { if (HIST.volta) return; clearTimeout(HIST.t); HIST.t = setTimeout(passarHist, 400); }
  function histUi() { [].forEach.call(document.querySelectorAll('[data-a="desfazer"]'), function (b) { b.disabled = !HIST.des.length; }); [].forEach.call(document.querySelectorAll('[data-a="refazer"]'), function (b) { b.disabled = !HIST.ref.length; }); }
  function voltarHist(dir) {
    if (!KIT) return; if (ENQ) enqGravar(); passarHist();   /* grava antes o passo que ainda estava esperando */
    var de = dir < 0 ? HIST.des : HIST.ref, para = dir < 0 ? HIST.ref : HIST.des; if (!de.length) { aviso(dir < 0 ? "Nada para desfazer" : "Nada para refazer"); return; }
    var alvoAberto = ENQ ? (ENQ.k === "sobre" || ENQ.k === "capa" || ENQ.k === "retrato" || ENQ.k.indexOf("c:") === 0 ? ENQ.k : ENQ.k.replace(/^f/, "")) : null, elAberto = EL;
    para.push(HIST.atual); var f = de.pop(); HIST.volta = true;
    try { var k = JSON.parse(f.j), id = KIT.id, nuvem = KIT.nuvem; Object.keys(KIT).forEach(function (c) { delete KIT[c]; }); Object.assign(KIT, k); KIT.id = id; if (nuvem) KIT.nuvem = nuvem;
      IMGS.enq = JSON.parse(f.enq); IMGS.livres = Object.assign({}, f.lv);
      ENQ = null; EL = null; $("modal").hidden = true; $("modal").classList.remove("lado"); $("modalCx").innerHTML = "";
      salvarKit(KIT); guardarImgs(); desenharForm(); agendarPrevia(0);
      if (alvoAberto) abrirAlvo(alvoAberto); else if (elAberto && elDe(elAberto)) abrirElemento(elAberto);
    } finally { HIST.atual = f; HIST.tA = Date.now(); HIST.volta = false; HIST.ate = Date.now() + 900; }   /* o que a tela ajeita sozinha logo depois de voltar não vira passo (apagava o refazer) */
    histUi(); aviso(dir < 0 ? "↶ Desfeito" : "↷ Refeito");
  }
  var PK_COPIA = null;
  function duplicarEl(id, mesmoLugar) { var e = elDe(id); if (!e) return null; var n2 = clone(e); n2.id = "el" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (!mesmoLugar) { n2.x = Math.min(0.9, e.x + 0.03); n2.y = Math.min(0.95, e.y + 0.03); } if (e.t === "imagem" && IMGS.livres) { IMGS.livres[n2.id] = IMGS.livres[e.id]; guardarImgs(); } livres().push(n2); return n2; }
  function atalhosPk(ev) {
    if (VISTA !== "editor" || !KIT) return; var t = ev.target, tg = (t && t.tagName) || "", campo = tg === "TEXTAREA" || tg === "SELECT" || (t && t.isContentEditable) || (tg === "INPUT" && /^(text|search|email|tel|url|number|password|)$/.test(t.type || ""));
    var ctrl = ev.ctrlKey || ev.metaKey, k = (ev.key || "").toLowerCase();
    if (ctrl && (k === "z" || k === "y")) { if (campo) return; ev.preventDefault(); voltarHist(k === "y" || ev.shiftKey ? 1 : -1); return; }
    if (campo) return;
    var e = EL && elDe(EL);
    if (ctrl && k === "d" && e) { ev.preventDefault(); var n = duplicarEl(e.id); EL = null; guardar(); agendarPrevia(0); abrirElemento(n.id); aviso("Duplicado ✓"); return; }
    if (ctrl && k === "c" && e) { PK_COPIA = { e: clone(e), img: e.t === "imagem" ? (IMGS.livres || {})[e.id] : null }; aviso("Copiado"); return; }
    if (ctrl && k === "v" && PK_COPIA) { ev.preventDefault(); var c = clone(PK_COPIA.e); c.id = "el" + Date.now().toString(36); c.x = Math.min(0.9, c.x + 0.03); c.y = Math.min(0.95, c.y + 0.03); if (PK_COPIA.img) { IMGS.livres = IMGS.livres || {}; IMGS.livres[c.id] = PK_COPIA.img; guardarImgs(); } livres().push(c); PK_COPIA.e = clone(c); EL = null; guardar(); agendarPrevia(0); abrirElemento(c.id); aviso("Colado ✓"); return; }
    if (e && /^arrow(left|right|up|down)$/.test(k)) { ev.preventDefault(); var p = ev.shiftKey ? 0.02 : 0.003; if (k === "arrowleft") e.x -= p; if (k === "arrowright") e.x += p; if (k === "arrowup") e.y -= p; if (k === "arrowdown") e.y += p;
      e.x = +Math.max(-0.2, Math.min(1, e.x)).toFixed(4); e.y = +Math.max(-0.1, Math.min(1, e.y)).toFixed(4); guardar(); clearTimeout(tEl); tEl = setTimeout(function () { agendarPrevia(0); }, 220); return; }
  }
  var tGuardarImgs = 0;
  function guardarImgs() { clearTimeout(tGuardarImgs); var id = KIT && KIT.id, im = IMGS; im._t = Date.now(); tGuardarImgs = setTimeout(function () { if (id) { idbPut("imgs", id, im); if (window.BWPkNuvem) BWPkNuvem.subir(id, im); } }, 200); }

  /* ☰ OPÇÕES PRONTAS (25/11, dono: "botões com opções em tudo, exemplos mais utilizados, até profissões"): um botão por campo
     abre a lista para tocar (regra 62: nunca chips soltos na tela). Campo de uma linha = troca o texto; "um por linha" = põe/tira. */
  var PROFISSOES = [["Arte e palco", ["Ator profissional", "Atriz profissional", "Ator e atriz", "Atriz · Teatro, TV e publicidade", "Humorista e apresentador", "Cantor e compositor", "Músico · Shows e eventos", "DJ · Festas e eventos corporativos", "Bailarina · Dança contemporânea", "Mestre de cerimônias", "Mágico e ilusionista", "Palhaço e animador de festas"]],
    ["Imagem e criação", ["Fotógrafo de eventos", "Fotógrafa de casamentos e ensaios", "Videomaker · Eventos e marcas", "Editor de vídeo", "Cinegrafista e operador de câmera", "Diretor de fotografia", "Designer gráfico", "Ilustradora", "Criador de conteúdo", "Influenciadora digital · Moda e beleza", "Modelo · Moda e publicidade", "Artista visual"]],
    ["Eventos e técnica", ["Técnico de som e luz", "Produtor de eventos", "Operador de transmissão ao vivo", "Cerimonialista", "Decoradora de festas", "Chef de cozinha e buffet", "Bartender e coquetelaria", "Locutor e voz comercial"]],
    ["Serviços e carreira", ["Palestrante · Liderança e carreira", "Consultor de marketing", "Social media", "Gestora de projetos", "Professora e instrutora", "Personal trainer", "Atleta profissional", "Maquiadora e cabeleireira", "Esteticista", "Arquiteta e designer de interiores", "Advogado", "Psicóloga", "Corretor de imóveis", "Desenvolvedor de software"]]];
  var OPC = {
    "d.slogan": PROFISSOES,
    "d.etiqueta": ["APRESENTAÇÃO PESSOAL", "PRESS KIT", "PORTFÓLIO", "BOOK", "MÍDIA KIT", "EPK", "COMP CARD", "CURRÍCULO", "APRESENTAÇÃO PROFISSIONAL", "PROPOSTA DE PARCERIA"],
    "d.cidade": ["Belo Horizonte · MG", "São Paulo · SP", "Rio de Janeiro · RJ", "Brasília · DF", "Curitiba · PR", "Porto Alegre · RS", "Salvador · BA", "Recife · PE", "Fortaleza · CE", "Goiânia · GO", "Atendo todo o Brasil", "Brasil e exterior"],
    "d.contato.cidade": "d.cidade",
    "d.sobreCurto": ["Transformo ideias em momentos que as pessoas lembram.", "Mais de 10 anos fazendo o público rir, se emocionar e voltar.", "Trabalho com cuidado em cada detalhe, do primeiro contato à entrega.", "Imagem que conta a sua história do jeito que ela aconteceu.", "Conteúdo leve, honesto e que conversa com quem assiste.", "Experiência em grandes palcos e em eventos para poucas pessoas.", "Disponível para eventos, campanhas e parcerias em todo o Brasil."],
    "d.perfil.k": ["Altura", "Idade de atuação", "Cor dos olhos", "Cor do cabelo", "Manequim", "Calçado", "Idiomas", "DRT", "CNH", "Disponibilidade", "Atende", "Formação", "Experiência", "Equipamento", "Estilo"],
    "d.perfil.v": ["Português e inglês", "Português, inglês e espanhol", "Todo o Brasil", "Fins de semana e feriados", "Disponível para viagens", "Categoria B", "10 anos de experiência", "Mais de 300 eventos"],
    "d.numeros.v": ["+10 anos", "+300", "+500", "+1.000", "+50 mil", "+1 milhão", "98%", "4,9 ★", "+20 cidades"],
    "d.numeros.r": ["anos de experiência", "eventos realizados", "clientes atendidos", "seguidores nas redes", "visualizações", "shows por ano", "avaliação dos clientes", "cidades atendidas", "casamentos fotografados", "alunos formados", "palestras"],
    "d.servicos.t": [["Arte e palco", ["Apresentação de eventos", "Show de humor (stand-up)", "Mestre de cerimônias", "Show ao vivo", "Discotecagem (DJ)", "Animação de festa", "Participação em campanha", "Gravação de vídeo para marca"]],
      ["Imagem", ["Cobertura fotográfica", "Ensaio fotográfico", "Filmagem de evento", "Aftermovie", "Vídeo institucional", "Reels e conteúdo para redes", "Transmissão ao vivo", "Edição de vídeo"]],
      ["Outros", ["Palestra", "Workshop", "Consultoria", "Mentoria", "Publi (post patrocinado)", "Presença VIP", "Locução", "Aula particular"]]],
    "d.servicos.d": ["Do roteiro à entrega, com atendimento direto comigo.", "Pacotes por hora ou por evento, sob medida.", "Entrega rápida, em até 7 dias.", "Equipamento próprio e equipe de apoio.", "Formato presencial ou on-line.", "Ideal para eventos corporativos e festas."],
    "d.experiencia.grupo": ["TV e publicidade", "Teatro", "Cinema", "Eventos", "Eventos corporativos", "Casamentos", "Shows", "Campanhas", "Redes sociais", "Palestras", "Moda", "Trabalhos recentes"],
    "d.experiencia.papel": ["Apresentador", "Apresentadora", "Ator", "Atriz", "Protagonista", "Elenco", "Mestre de cerimônias", "Fotógrafo", "Videomaker", "Diretor", "Editor", "Produtor", "Palestrante", "Modelo", "Criador de conteúdo", "DJ", "Músico"],
    "d.formacao.curso": ["Graduação em Artes Cênicas", "Curso de Teatro", "Curso de Fotografia", "Curso de Cinema e Vídeo", "Graduação em Publicidade", "Graduação em Jornalismo", "Curso de Locução", "Curso de Oratória", "MBA em Marketing", "Técnico em Produção de Eventos"],
    "d.habilidades": ["Improviso", "Comédia", "Drama", "Canto", "Dança", "Locução", "Inglês fluente", "Espanhol", "Libras", "Oratória", "Condução de palco", "Edição de vídeo", "Fotografia", "Drone", "Iluminação", "Som ao vivo", "Roteiro", "Redes sociais", "Atendimento ao cliente", "Trabalho em equipe", "Dirigir (CNH B)", "Esportes"],
    "d.links.rot": ["Vídeos", "Showreel", "Fotos", "Portfólio", "Canal no YouTube", "Instagram", "TikTok", "Site", "Spotify", "Matéria", "Agenda", "Currículo completo"],
    "d.depoimentos.cargo": ["Cliente", "Noiva", "Produtora de eventos", "Diretor de marketing", "Gerente de RH", "Organizador do evento", "Diretora de elenco", "Sócio da empresa"],
    "d.imprensa.veiculo": ["Jornal local", "Portal de notícias", "Revista", "TV aberta", "Rádio", "Podcast", "Blog especializado"],
    "d.contato.resp": ["Eu mesmo", "Eu mesma", "Minha agência", "Minha assessoria", "Produção"],
    "d.contato.cargo": ["Contato direto", "Agenciamento", "Assessoria de imprensa", "Produção e agenda", "Comercial"],
    "d.rider": ["Microfone sem fio", "Retorno de palco", "Mesa de som com 2 canais livres", "Projetor ou telão", "Ponto de energia 220 V", "Camarim com espelho", "Água no palco", "Mesa e cadeira", "Iluminação de palco", "Estacionamento para 1 carro", "Internet para transmissão"],
    "d.clientes": ["Empresas de tecnologia", "Agências de publicidade", "Produtoras de eventos", "Prefeituras", "Escolas", "Hotéis", "Restaurantes", "Marcas de moda"],
    "d.release.titulo": ["Lança novo trabalho", "Estreia espetáculo", "Anuncia turnê", "Chega à cidade", "Completa 10 anos de carreira"],
    "d.galeriaLegenda": ["Fotos de trabalhos recentes.", "Bastidores e eventos.", "Créditos das fotos: (nome do fotógrafo)."]
  };
  function chaveOpc(k) { var n = String(k).replace(/\.\d+\./g, "."), o = OPC[n]; return typeof o === "string" ? o : n; }
  function opcDe(k) { var o = OPC[chaveOpc(k)]; return Array.isArray(o) ? o : null; }
  function opcConta(o) { return o.reduce(function (s, x) { return s + (Array.isArray(x) ? x[1].length : 1); }, 0); }
  function botaoOpc(id, k) { var o = opcDe(k); return o ? '<button type="button" class="pk-opc" data-a="opcoes" data-alvo="' + id + '">☰ OPÇÕES PRONTAS <b>' + opcConta(o) + "</b></button>" : ""; }
  function abrirOpcoes(id) {
    var el = $(id); if (!el) return; var o = opcDe(el.getAttribute("data-k")); if (!o) return;
    var multi = el.tagName === "TEXTAREA" && el.getAttribute("data-lista") === "1", tem = multi ? linhas(el.value) : [String(el.value || "").trim()];
    var chip = function (t) { var on = tem.indexOf(t) >= 0; return '<button type="button" class="pk-chip' + (on ? " on" : "") + '" data-a="opcTocar" data-alvo="' + id + '" data-v="' + esc(t) + '" aria-pressed="' + on + '">' + (multi ? (on ? "✓ " : "＋ ") : "") + esc(t) + "</button>"; };
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>☰ ' + esc(el.closest(".pk-campo") ? el.closest(".pk-campo").querySelector("span").textContent : "Opções") + "</h3>" +
      '<p class="tf-sub">' + (multi ? "Toque para pôr ou tirar. Dá para escolher várias." : "Toque numa opção — depois dá para mudar o texto à vontade.") + "</p>" +
      o.map(function (x) { return Array.isArray(x) ? '<div class="pk-sub-t">' + esc(x[0]).toUpperCase() + '</div><div class="pk-chips">' + x[1].map(chip).join("") + "</div>" : ""; }).join("") +
      (o.some(function (x) { return !Array.isArray(x); }) ? '<div class="pk-chips">' + o.filter(function (x) { return !Array.isArray(x); }).map(chip).join("") + "</div>" : "") +
      (multi ? '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="fecharModal">✓ PRONTO</button></div>' : ""));
  }
  function opcTocar(btn) {
    var id = btn.getAttribute("data-alvo"), el = $(id), v = btn.getAttribute("data-v"); if (!el) return;
    if (el.tagName === "TEXTAREA" && el.getAttribute("data-lista") === "1") {
      var l = linhas(el.value), i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v);
      el.value = l.join("\n"); el.dispatchEvent(new Event("input", { bubbles: true }));
      var on = i < 0; btn.classList.toggle("on", on); btn.setAttribute("aria-pressed", String(on)); btn.textContent = (on ? "✓ " : "＋ ") + v;
    } else { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); fecharModal(); aviso("✓ " + v.slice(0, 40)); }
  }
  function campo(rot, k, v, op) {
    op = op || {};
    var id = "f_" + k.replace(/\W/g, "_");
    if (op.area) return '<div class="pk-campo' + (op.larga ? " larga" : "") + '"><label for="' + id + '"><span>' + rot + '</span></label><textarea id="' + id + '" data-k="' + k + '" data-rot="' + esc(rot) + '"' + (op.lista ? ' data-lista="1"' : "") + ' rows="' + (op.linhas || 4) + '" maxlength="' + (op.max || 4000) + '" placeholder="' + esc(op.ph || "") + '">' + esc(v) + "</textarea>" + botaoOpc(id, k) + vozBarra(id) + "</div>";
    return '<label class="pk-campo' + (op.larga ? " larga" : "") + '" for="' + id + '"><span>' + rot + '</span><input id="' + id + '" type="' + (op.tipo || "text") + '" data-k="' + k + '" value="' + esc(v) + '" maxlength="' + (op.max || 200) + '" placeholder="' + esc(op.ph || "") + '"' + (op.tipo === "url" ? ' inputmode="url"' : "") + ">" + botaoOpc(id, k) + "</label>";
  }
  /* 🎙 FALAR e ✨ CORRIGIR embaixo de todo texto longo (dono, 25/11: "falar e o texto se monta corrigido") */
  function vozBarra(id) { return '<div class="pk-voz"><button type="button" class="pk-mic" data-a="falar" data-alvo="' + id + '" aria-pressed="false">🎙 FALAR</button><button type="button" class="pk-mic" data-a="corrigir" data-alvo="' + id + '">✨ CORRIGIR</button><button type="button" class="pk-mic volta" data-a="voltarCampo" data-alvo="' + id + '" hidden>↺ COMO ESTAVA</button></div>'; }
  function upload(rot, alvo, multi) { return '<label class="bw-btn pk-up">' + rot + '<input type="file" accept="image/*" data-up="' + alvo + '"' + (multi ? " multiple" : "") + "></label>"; }
  var PASSO = 0;
  function grupo(chave, titulo, corpo, fechada, numerado) { var n = numerado ? '<i class="pk-n">' + (++PASSO) + "</i>" : ""; return '<section class="tf-card pk-grupo"><h3 data-seta="pk_' + chave + '"' + (fechada ? ' data-seta-padrao="fechada"' : "") + ">" + n + titulo + "</h3>" + corpo + "</section>"; }
  /* 📷 FOTO DO CARTÃO (25/11): cada serviço, trabalho e link do portfólio pode ter a sua foto — enviada aqui ou escolhida da galeria */
  function fotoCartao(nome, i) {
    var u = ((IMGS.cards || {})[nome] || [])[i] || "", g = (IMGS.fotos || []).length, rot = nome === "links" ? "capa do link " : nome === "servicos" ? "foto do serviço " : "foto do trabalho ";
    return '<div class="pk-cf">' + (u ? '<img src="' + u + '" alt="' + rot + (i + 1) + '">' : '<div class="pk-cf-v" aria-hidden="true">📷</div>') +
      '<div class="pk-cf-bt"><label class="pk-cf-b">' + (u ? "TROCAR" : "＋ FOTO") + '<input type="file" accept="image/*" data-up="card:' + nome + ":" + i + '" aria-label="Enviar ' + rot + (i + 1) + '"></label>' +
      (g ? '<button type="button" class="pk-cf-b" data-a="cardGal" data-l="' + nome + '" data-i="' + i + '">🖼 GALERIA</button>' : "") +
      (u ? '<button type="button" class="pk-cf-b" data-a="fotoBaixar" data-alvo="c:' + nome + ":" + i + '" aria-label="Baixar a ' + rot + (i + 1) + '">⬇</button><button type="button" class="pk-cf-b" data-a="enquadrar" data-alvo="c:' + nome + ":" + i + '" aria-label="Enquadrar a ' + rot + (i + 1) + '">✥</button><button type="button" class="pk-cf-b x" data-a="cardTira" data-l="' + nome + '" data-i="' + i + '" aria-label="Tirar a ' + rot + (i + 1) + '">✕</button>' : "") + "</div></div>";
  }
  var COM_FOTO = { servicos: 1, experiencia: 1, links: 1 };
  function listaCampos(nome, itens, cols, max, rotAdd) {
    return '<div class="pk-lista">' + itens.map(function (x, i) {
      return '<div class="pk-item' + (COM_FOTO[nome] ? " com-foto" : "") + '">' + (COM_FOTO[nome] ? fotoCartao(nome, i) : "") + '<div class="pk-item-campos">' + cols.map(function (c) { return campo(c[1], "d." + nome + "." + i + "." + c[0], x[c[0]] || "", { area: c[2] === "area", larga: c[2] === "area" || c[2] === "larga", linhas: 3, ph: c[3] || "", tipo: c[2] === "url" ? "url" : undefined }); }).join("") +
        '</div><button type="button" class="pk-x" data-a="tirarItem" data-l="' + nome + '" data-i="' + i + '" aria-label="Tirar este item">✕</button></div>';
    }).join("") + (itens.length < max ? '<button type="button" class="bw-btn pk-add" data-a="addItem" data-l="' + nome + '">＋ ' + (rotAdd || "ADICIONAR") + "</button>" : "") + "</div>";
  }
  /* ---------- ✨ IA NA FOTO (25/11, dono: "ponte no local da inserção de fotos, melhorar com IA e prompt já definido para fotos
     corporativas… ela se altera e se cria no local com um clique"): um toque no preset → a IA da plataforma (bw-ia-imagem, pela
     fotos-nuvem.js — a mesma do editor de fotos: cópia ≤ 504 px, confirmação na 1ª vez, limite do dia) devolve a foto nova e ela troca
     NO LUGAR; ↺ ORIGINAL volta. O presskit.js não fala com a internet para isso: só chama BWFotosNuvem. ---------- */
  /* 28/11 (dono: "não alterar o rosto nem inserir acessório ou modificação no corpo — o mais real possível"): a trava vem ANTES do pedido e é repetida no fim.
     A função bw-ia-imagem corta o pedido em 700 letras: MANTER + preset/pedido + FIM cabem (pedidoIA corta o meio, nunca a trava). */
  var MANTER = "REAL PERSON, UNCHANGED: identical face (same features, shape, eyes, nose, mouth, skin, marks, age, expression, hair) and identical body (same shape, weight, proportions, pose, hands). Add NO accessories (no glasses, jewelry, hats, makeup, tattoos, beard). No beautifying, slimming or reshaping. ";
  var FIM_IA = " Photorealistic, true to life, natural skin texture, no text.";
  function pedidoIA(meio) { var max = 690 - MANTER.length - FIM_IA.length; return MANTER + String(meio || "").replace(/\s+/g, " ").trim().slice(0, max) + FIM_IA; }
  var FOTO_IA = [
    { id: "corp", ico: "💼", nome: "Corporativo", p: "Professional corporate headshot: clean neutral light-gray studio background, soft even studio lighting. Change only the background, light and clothing to a well-fitted dark blazer." },
    { id: "escr", ico: "🏢", nome: "Escritório", p: "Place the person in a modern bright office with a softly blurred background, natural window light, professional business attire. Change only the background, light and clothing." },
    { id: "liso", ico: "⬜", nome: "Fundo liso", p: "Replace the background with a plain seamless pure white studio background, even soft lighting, clean edges around the person, keep the same clothes." },
    { id: "luz", ico: "💡", nome: "Luz de estúdio", p: "Keep the same composition, clothes and background. Improve only the photo quality: professional studio lighting, balanced exposure, accurate natural colors, gentle contrast, crisp details." },
    { id: "book", ico: "🎭", nome: "Book artístico", p: "Artistic actor headshot: dark charcoal studio background, dramatic soft side light with subtle rim light, cinematic but natural colors, keep the same clothes." },
    { id: "palco", ico: "🎤", nome: "No palco", p: "Place the person on a professional event stage with warm spotlights and soft blurred audience lights behind, keep the same clothes, keep the person well lit and in focus." }
  ];
  var IA_FOTO_OK = false, IA_OCUP = {};
  function chaveFoto(alvo) { return alvo === "retrato" || alvo === "capa" || alvo === "sobre" || String(alvo).indexOf("c:") === 0 ? alvo : "f" + alvo; }
  var CORTE_CARD = { servicos: [240, 140], experiencia: [150, 96], links: [320, 180] };
  function srcFoto(alvo) { if (alvo === "sobre") return IMGS.retrato; return alvo === "retrato" || alvo === "capa" ? IMGS[alvo] : (IMGS.fotos || [])[+alvo]; }
  function botoesIA(alvo) {
    var k = chaveFoto(alvo), orig = IMGS.origs && IMGS.origs[k];
    return '<div class="pk-ia" data-iaalvo="' + alvo + '"><span class="pk-ia-t">✨ MELHORAR COM IA · UM TOQUE</span><div class="pk-ia-l">' + FOTO_IA.map(function (x) {
      return '<button type="button" class="pk-iab" data-a="fotoIA" data-alvo="' + alvo + '" data-p="' + x.id + '" title="' + esc(x.nome) + '"' + (IA_OCUP[k] ? " disabled" : "") + '><i>' + x.ico + "</i>" + esc(x.nome) + "</button>";
    }).join("") + '<button type="button" class="pk-iab" data-a="fotoIAlivre" data-alvo="' + alvo + '"' + (IA_OCUP[k] ? " disabled" : "") + "><i>✎</i>Do meu jeito</button>" +
      '<button type="button" class="pk-iab" data-a="fotoIAfora" data-alvo="' + alvo + '"><i>↗</i>Em outra IA</button>' +
      (orig ? '<button type="button" class="pk-iab" data-a="fotoIAbaixar" data-alvo="' + alvo + '"><i>⬇</i>Baixar foto da IA</button><button type="button" class="pk-iab volta" data-a="fotoIAvolta" data-alvo="' + alvo + '"><i>↺</i>Original</button>' : "") + "</div></div>";
  }
  function encolher(src, max) {
    return imgDe(src).then(function (im) {
      var s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, w: c.width, h: c.height }); }, "image/jpeg", 0.9); });
    });
  }
  function blobUrl(b) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = erro; r.readAsDataURL(b); }); }
  async function fotoIA(alvo, pedido) {
    var src = srcFoto(alvo), k = chaveFoto(alvo); if (!src || IA_OCUP[k]) return;
    if (!window.BWFotosNuvem) { aviso("Recarregue a página para usar a IA", true); return; }
    if (!IA_FOTO_OK && !confirm("A IA da Brightway recebe uma cópia pequena desta foto e devolve uma versão nova, que entra no lugar (↺ ORIGINAL volta). Nada fica guardado na nuvem e conta no limite de imagens do dia.\n\nUse só fotos suas ou com autorização. Continuar?")) return;
    IA_FOTO_OK = true; IA_OCUP[k] = true; desenharForm(); andamento("A IA está criando a foto (10 a 30 s)…");
    try {
      var e = await encolher(src, 504), q = 1024 / Math.max(e.w, e.h), w = Math.max(256, Math.round(e.w * q / 16) * 16), h = Math.max(256, Math.round(e.h * q / 16) * 16);
      var r = await BWFotosNuvem.editar(e.blob, pedidoIA(pedido), w, h);
      andamento("");
      if (r.erro) { aviso(BWFotosNuvem.msg(r.erro), true); return; }
      var nova = await blobUrl(r.blob);
      if (srcFoto(alvo) !== src) { aviso("A foto mudou enquanto a IA trabalhava — tente de novo", true); return; }
      IMGS.origs = IMGS.origs || {}; if (!IMGS.origs[k]) IMGS.origs[k] = src;
      if (alvo === "retrato" || alvo === "capa") IMGS[alvo] = nova; else IMGS.fotos[+alvo] = nova;
      KIT.exemplo = false; guardar(); guardarImgs(); aviso("✨ Foto nova no lugar — ↺ ORIGINAL volta");
    } catch (er) { andamento(""); aviso("A IA não respondeu agora", true); }
    finally { delete IA_OCUP[k]; desenharForm(); agendarPrevia(0); }
  }
  function fotoIAvolta(alvo) {
    var k = chaveFoto(alvo), o = IMGS.origs && IMGS.origs[k]; if (!o) return;
    if (alvo === "retrato" || alvo === "capa") IMGS[alvo] = o; else IMGS.fotos[+alvo] = o;
    delete IMGS.origs[k]; guardarImgs(); desenharForm(); agendarPrevia(0); aviso("↺ Voltou à foto original");
  }
  function fotoIAlivre(alvo) {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Do meu jeito</h3><p class="tf-sub">Diga o que mudar na foto (ex.: "camisa social branca e fundo azul-marinho"). A pessoa continua a mesma.</p>' +
      '<textarea class="pk-in" id="iaFotoTexto" rows="3" maxlength="400" placeholder="Ex.: fundo de estúdio azul-marinho, blazer cinza, sorriso leve"></textarea>' + vozBarra("iaFotoTexto").replace(/<button[^>]*data-a="(corrigir|voltarCampo)"[^>]*>[^<]*<\/button>/g, "") +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="fotoIAlivreIr" data-alvo="' + alvo + '">✨ CRIAR NO LUGAR</button></div>');
  }
  /* ↗ EM OUTRA IA: a pessoa leva a foto + o pedido pronto para a IA dela (Gemini, ChatGPT…) e traz o resultado de volta para o mesmo lugar.
     Nada sai daqui sozinho: ela baixa, copia e envia; o site só abre a página da IA. */
  var IAS_FORA = [["Gemini", "https://gemini.google.com/app"], ["ChatGPT", "https://chatgpt.com/"], ["AI Studio", "https://aistudio.google.com/"]];
  function pedidoFora(id) {
    var x = FOTO_IA.filter(function (f) { return f.id === id; })[0] || FOTO_IA[0];
    return "Edit the ATTACHED photo — do not create a new person. " + MANTER + x.p + " Keep the original framing and resolution as much as possible." + FIM_IA;
  }
  function fotoIAfora(alvo, id) {
    id = id || (FOTO_IA[0] && FOTO_IA[0].id);
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>↗ Fazer em outra IA</h3>' +
      '<p class="tf-sub">Use a sua IA (Gemini, ChatGPT…). O pedido já pede para manter o rosto e o corpo iguais.</p>' +
      '<div class="pk-chips">' + FOTO_IA.map(function (f) { return '<button type="button" class="pk-chip' + (f.id === id ? " on" : "") + '" data-a="fotoIAforaP" data-alvo="' + alvo + '" data-p="' + f.id + '">' + f.ico + " " + esc(f.nome) + "</button>"; }).join("") + "</div>" +
      '<ol class="pk-fora"><li><button type="button" class="pk-chip" data-a="fotoBaixar" data-alvo="' + alvo + '">⬇ 1 · BAIXAR A FOTO</button></li>' +
      '<li><textarea class="pk-in" id="iaForaTexto" rows="5">' + esc(pedidoFora(id)) + '</textarea><button type="button" class="pk-chip" data-a="fotoIAforaCopiar">⧉ 2 · COPIAR O PEDIDO</button></li>' +
      '<li><span>3 · ABRIR A IA, enviar a foto e colar o pedido:</span> ' + IAS_FORA.map(function (x) { return '<a class="pk-chip" href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + " ↗</a>"; }).join(" ") + "</li>" +
      '<li><label class="bw-btn pri pk-up">＋ 4 · TRAZER A FOTO PRONTA<input type="file" accept="image/*" data-up="ia:' + alvo + '"></label><span class="tf-sub"> entra no lugar; ↺ ORIGINAL volta.</span></li></ol>');
  }
  /* galeria: o ✨ da foto abre os mesmos presets numa folha — um toque cria no lugar */
  function fotoIAmenu(i) { modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Melhorar a foto ' + (+i + 1) + '</h3><p class="tf-sub">Um toque e a foto nova entra no lugar.</p>' + botoesIA(String(i))); }
  /* ✥ ENQUADRAR E AJUSTAR: arrastar a foto dentro da moldura (posição), aproximar (tamanho) e luz/cor.
     A prévia da janela é desenhada pelo MESMO recortar() do PDF, no mesmo formato do lugar onde a foto vai. */
  var ENQ = null, ENQ_ABA = "pos";
  function formatoKit() { var mod = modeloDe(KIT.modelo); return { cap: capaDoKit(KIT), G: geom(mod.tema.capa === "compcard" ? "a5" : (GEOM[KIT.formato] ? KIT.formato : mod.formato)) }; }
  function enqTrocar(a, b) { var e = IMGS.enq || {}, x = e[a], y = e[b]; delete e[a]; delete e[b]; if (x) e[b] = x; if (y) e[a] = y; }
  function enqTirarFoto(i) { var e = IMGS.enq || {}, n = {}; Object.keys(e).forEach(function (k) { var m = /^f(\d+)$/.exec(k); if (!m) n[k] = e[k]; else if (+m[1] < i) n[k] = e[k]; else if (+m[1] > i) n["f" + (+m[1] - 1)] = e[k]; }); IMGS.enq = n; }
  function abrirEnquadrar(alvo) {
    var k = chaveFoto(alvo), fm = formatoKit(), src, cw, ch, op = {}, inteira = k === "retrato";
    if (k === "capa") { src = IMGS.capa || IMGS.retrato || (IMGS.fotos || [])[0]; var cc = corteCapa(fm.cap, fm.G, { corPura: KIT.cor || modeloDe(KIT.modelo).cor }); cw = cc[0]; ch = cc[1]; op = cc[2]; }
    else if (inteira) src = IMGS.retrato;
    else if (k === "sobre") { src = IMGS.retrato; var dS = sobreDim(fm.G); cw = dS[0]; ch = dS[1]; op = { png: true }; }
    else if (k.indexOf("c:") === 0) { var pk = k.split(":"); src = ((IMGS.cards || {})[pk[1]] || [])[+pk[2]]; cw = CORTE_CARD[pk[1]][0]; ch = CORTE_CARD[pk[1]][1]; }
    else { src = (IMGS.fotos || [])[+alvo]; var cf = corteFoto(fm.cap, fm.G, +alvo); cw = cf[0]; ch = cf[1]; }
    if (!src) return;
    var e = Object.assign({ x: 0.5, y: 0.5, z: 1, aj: {} }, clone((IMGS.enq || {})[k] || {})); e.aj = Object.assign({}, e.aj || {});
    if (k === "sobre" && !temAj(e.aj) && IMGS.enq && IMGS.enq.retrato && temAj(IMGS.enq.retrato.aj)) e.aj = Object.assign({}, IMGS.enq.retrato.aj);
    var est0 = KIT.est || {};
    var NOVO = { k: k, src: src, cw: cw, ch: ch, op: op, e: e, inteira: inteira, antes: false, G: fm.G, bk: { tem: !!(IMGS.enq && k in IMGS.enq), v: clone((IMGS.enq || {})[k] || null), sobW: est0.sobW, sobR: est0.sobR, sobH: est0.sobH } };
    var nome = k === "capa" ? "foto da capa" : k === "sobre" ? "foto da página 2" : inteira ? "foto recortada" : k.indexOf("c:") === 0 ? "foto do cartão" : "foto " + (+alvo + 1);
    var abas = inteira ? [["luz", "☀ LUZ E COR"], ["look", "✦ LOOKS"]] : k === "sobre" ? [["pos", "✥ POSIÇÃO"], ["tam", "⤢ TAMANHO"], ["luz", "☀ LUZ E COR"], ["look", "✦ LOOKS"]] : [["pos", "✥ POSIÇÃO"], ["luz", "☀ LUZ E COR"], ["look", "✦ LOOKS"], ["mix", "◑ MISTURA"], ["masc", "◌ MÁSCARA"]];
    if (!abas.some(function (x) { return x[0] === ENQ_ABA; })) ENQ_ABA = abas[0][0];
    var painel = function (id, h) { return '<div class="pk-enqp" data-p="' + id + '"' + (id === ENQ_ABA ? "" : " hidden") + ">" + h + "</div>"; };
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>' + (inteira ? "🎚 Ajustar a " : "✥ Enquadrar e ajustar a ") + nome + "</h3>" +
      '<div class="pk-enq' + (inteira || k === "sobre" ? " xadrez" : "") + (k === "sobre" ? " corte" : "") + '" id="enqPalco"><canvas id="enqCv"></canvas>' + (inteira ? "" : '<i class="pk-enq-g"></i>') + "</div>" +
      '<div class="pk-enq-abas" role="tablist">' + abas.map(function (x) { return '<button type="button" role="tab" class="pk-enq-aba' + (x[0] === ENQ_ABA ? " on" : "") + '" data-a="enqAba" data-v="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="pk-enq-corpo">' +
      (inteira ? "" : painel("pos", '<p class="tf-sub" style="margin:0 0 6px">Arraste a foto para posicionar e aproxime com a barra ou a rodinha.</p><label class="pk-aj"><span>🔍 Tamanho</span><input type="range" min="100" max="300" step="1" data-enq="z" value="' + Math.round(e.z * 100) + '"><b>' + Math.round(e.z * 100) + "%</b></label>" +
        '<div class="pk-chips pk-lin"><button type="button" class="pk-chip" data-a="enqPos" data-v="topo">⬆ MOSTRAR O TOPO</button><button type="button" class="pk-chip" data-a="enqPos" data-v="centro">⊕ CENTRALIZAR</button><button type="button" class="pk-chip" data-a="enqPos" data-v="base">⬇ MOSTRAR A BASE</button></div>')) +
      painel("luz", AJUSTES.map(function (a) { var v = +e.aj[a[0]] || 0; return '<label class="pk-aj"><span>' + a[1] + '</span><input type="range" min="-100" max="100" step="1" data-enq="' + a[0] + '" value="' + v + '"><b>' + v + "</b></label>"; }).join("")) +
      painel("look", '<div class="pk-chips pk-lin"><button type="button" class="pk-chip" data-a="enqLook" data-v="auto">✦ CLAREAR</button><button type="button" class="pk-chip" data-a="enqLook" data-v="vivo">VIVO</button><button type="button" class="pk-chip" data-a="enqLook" data-v="quente">QUENTE</button><button type="button" class="pk-chip" data-a="enqLook" data-v="frio">FRIO</button><button type="button" class="pk-chip" data-a="enqLook" data-v="pb">P&amp;B</button><button type="button" class="pk-chip" data-a="enqLook" data-v="zero">↺ ZERAR</button></div>') +
      (k === "sobre" ? painel("tam", '<p class="tf-sub" style="margin:0 0 6px">Tamanho da foto na página 2 (Quem sou eu).</p><label class="pk-aj"><span>↔ Largura (X)</span><input type="range" min="20" max="62" step="1" data-enq="sw" value="' + sobreW() + '"><b>' + sobreW() + "%</b></label>" +
        '<label class="pk-aj" id="enqAltLivre"' + ((KIT.est || {}).sobR === "livre" ? "" : " hidden") + '><span>↕ Altura (Y)</span><input type="range" min="10" max="100" step="1" data-enq="sh" value="' + sobreH(fm.G) + '"><b>' + sobreH(fm.G) + "%</b></label>" +
        '<div class="pk-sub-t">PROPORÇÃO</div><div class="pk-chips pk-lin" data-fxg="r">' + [["livre", "✎ LIVRE"], ["", "Foto inteira"]].concat(Object.keys(SOB_R).map(function (q) { return [q, SOB_R[q][1]]; })).map(function (q) { return '<button type="button" class="pk-chip' + (((KIT.est || {}).sobR || "") === q[0] ? " on" : "") + '" data-a="enqProp" data-v="' + q[0] + '">' + q[1] + "</button>"; }).join("") + "</div>" +
        '<p class="tf-sub" id="enqDimTxt" style="margin:6px 0 0"></p>') : "") +
      (inteira || k === "sobre" ? "" : fxHtml(e, painel)) + "</div>" +
      '<div class="pk-chips pk-enq-pe">' + SETAS_HIST + '<button type="button" class="pk-chip" data-a="enqAntes">◐ SEGURE: ANTES</button><button type="button" class="pk-chip" data-a="enqVoltar">↺ COMO ESTAVA</button><button type="button" class="bw-btn pri" data-a="enqPronto">✓ PRONTO</button></div>');
    ENQ = NOVO; $("modalCx").classList.add("enq-app"); dock(); marcarAtiva();
    var cv = $("enqCv"), palco = $("enqPalco");
    if (!inteira) { palco.style.aspectRatio = cw + " / " + ch; palco.style.width = "min(100%, calc(var(--enq-h, 46vh) * " + (cw / ch).toFixed(4) + "))"; }
    ligarEnquadrar(palco); if (k === "sobre") enqTam(); else enqDesenhar();
  }
  function fxHtml(e, painel) {
    var f = e.fx || {}, cr = coresDe(KIT), chip = function (c, v, rot, on, extra) { return '<button type="button" class="pk-chip' + (on ? " on" : "") + '" data-a="enqFx" data-c="' + c + '" data-v="' + v + '">' + (extra || "") + esc(rot) + "</button>"; };
    painel = painel || function (id, h) { return h; };
    return painel("mix", '<div class="pk-sub-t" style="margin-top:0">MISTURA</div><div class="pk-chips pk-lin" data-fxg="m">' + Object.keys(MISTURAS).map(function (k) { return chip("m", k, MISTURAS[k][0], (f.m || "normal") === k); }).join("") + "</div>" +
      '<div class="pk-sub-t">MISTURAR COM</div><div class="pk-chips pk-lin" data-fxg="c">' + Object.keys(CORES_FX).map(function (k) { return chip("c", k, CORES_FX[k], (f.c || "fundo") === k, '<i class="pk-bolinha" style="background:' + cr[k] + '"></i>'); }).join("") + "</div>" +
      '<label class="pk-aj"><span>◌ Opacidade</span><input type="range" min="5" max="100" step="1" data-enq="fo" value="' + (f.o == null ? 100 : f.o) + '"><b>' + (f.o == null ? 100 : f.o) + "%</b></label>") +
      painel("masc", '<div class="pk-sub-t" style="margin-top:0">MÁSCARA</div><div class="pk-chips pk-lin" data-fxg="k">' + Object.keys(MASCARAS).map(function (k) { return chip("k", k, MASCARAS[k], (f.k || "nenhuma") === k); }).join("") + "</div>" +
      '<label class="pk-aj"><span>≈ Suavidade</span><input type="range" min="5" max="100" step="1" data-enq="fs" value="' + (f.s == null ? 50 : f.s) + '"><b>' + (f.s == null ? 50 : f.s) + "</b></label>" +
      '<div class="pk-chips">' + chip("zero", "1", "↺ SEM EFEITO", false) + "</div>");
  }
  function enqFx(c, v) {
    if (!ENQ) return; ENQ.e.fx = ENQ.e.fx || {};
    if (c === "zero") { ENQ.e.fx = {}; var mc = $("modalCx"); [["fo", 100, "%"], ["fs", 50, ""]].forEach(function (a) { var r = mc.querySelector('[data-enq="' + a[0] + '"]'); if (r) { r.value = a[1]; r.parentNode.querySelector("b").textContent = a[1] + a[2]; } });
      [].forEach.call(mc.querySelectorAll("[data-fxg] .pk-chip"), function (b) { var g = b.parentNode.getAttribute("data-fxg"); b.classList.toggle("on", b.getAttribute("data-v") === ({ m: "normal", c: "fundo", k: "nenhuma" })[g]); }); }
    else { ENQ.e.fx[c] = v; var gr = $("modalCx").querySelector('[data-fxg="' + c + '"]'); if (gr) [].forEach.call(gr.children, function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); }); }
    enqDesenhar();
  }
  var tEnq = 0, enqVez = 0;
  function enqDesenhar() {
    if (!ENQ) return; cancelAnimationFrame(tEnq); enqVivo();
    tEnq = requestAnimationFrame(async function () {
      var cv = $("enqCv"); if (!cv || !ENQ) return; var vez = ++enqVez, e = ENQ.antes ? { x: ENQ.e.x, y: ENQ.e.y, z: ENQ.e.z } : ENQ.e, u;
      if (ENQ.inteira) u = ENQ.antes ? ENQ.src : await ajustarImg(await reduzir(ENQ.src, 700), e.aj);
      else { var L = Math.min(640, (cv.parentNode.clientWidth || 480) * 1.5), sc = L / ENQ.cw; u = await recortar(ENQ.src, ENQ.cw * sc, ENQ.ch * sc, enqOpC(coresDe(KIT), e, Object.assign({ q: 0.8 }, ENQ.op))); }
      if (vez !== enqVez || !ENQ) return;
      var im = await imgDe(u); if (vez !== enqVez) return;
      cv.width = im.naturalWidth; cv.height = im.naturalHeight; cv.getContext("2d").drawImage(im, 0, 0);
    });
  }
  function ligarEnquadrar(palco) {
    var cx = $("modalCx"), ini = null;
    if (!cx.__enq) { cx.__enq = 1;
      cx.addEventListener("input", function (ev) {
        var n = ev.target.getAttribute && ev.target.getAttribute("data-enq"); if (!n || !ENQ) return;
        var v = +ev.target.value; if (n === "sw" || n === "sh") { ENQ[n] = v; ev.target.parentNode.querySelector("b").textContent = v + "%"; enqTam(); return; } if (n === "z") ENQ.e.z = v / 100; else if (n === "fo") (ENQ.e.fx = ENQ.e.fx || {}).o = v; else if (n === "fs") (ENQ.e.fx = ENQ.e.fx || {}).s = v; else ENQ.e.aj[n] = v;
        var b = ev.target.parentNode.querySelector("b"); if (b) b.textContent = n === "z" || n === "fo" ? v + "%" : v; enqDesenhar();
      });
      var antes = function (on) { return function (ev) { var b = ev.target.closest && ev.target.closest('[data-a="enqAntes"]'); if (!b || !ENQ) return; if (on) ev.preventDefault(); ENQ.antes = on; enqDesenhar(); }; };
      cx.addEventListener("pointerdown", antes(true)); ["pointerup", "pointerleave", "pointercancel"].forEach(function (t) { cx.addEventListener(t, function (ev) { if (ENQ && ENQ.antes) { ENQ.antes = false; enqDesenhar(); } }, true); });
    }
    if (ENQ.inteira) return;
    palco.addEventListener("pointerdown", function (ev) { ev.preventDefault(); palco.setPointerCapture(ev.pointerId); var r = palco.getBoundingClientRect(); ini = { px: ev.clientX, py: ev.clientY, x: ENQ.e.x, y: ENQ.e.y, w: r.width, h: r.height }; palco.classList.add("pega"); });
    palco.addEventListener("pointermove", function (ev) {
      if (!ini || !ENQ) return;
      /* quanto a foto sobra para cada lado (no tamanho da moldura) — a mesma conta do recortar() */
      enqMedida().then(function (md) { if (!ini) return;
        var sobraX = md.dw - 1, sobraY = md.dh - 1;
        if (sobraX > 0.001) ENQ.e.x = Math.max(0, Math.min(1, ini.x - (ev.clientX - ini.px) / ini.w / sobraX));
        if (sobraY > 0.001) ENQ.e.y = Math.max(0, Math.min(1, ini.y - (ev.clientY - ini.py) / ini.h / sobraY));
        enqDesenhar(); });
    });
    var solta = function () { ini = null; palco.classList.remove("pega"); };
    palco.addEventListener("pointerup", solta); palco.addEventListener("pointercancel", solta);
    palco.addEventListener("wheel", function (ev) { ev.preventDefault(); ENQ.e.z = Math.max(1, Math.min(3, ENQ.e.z * (ev.deltaY < 0 ? 1.06 : 1 / 1.06))); var r = $("modalCx").querySelector('[data-enq="z"]'); if (r) { r.value = Math.round(ENQ.e.z * 100); r.parentNode.querySelector("b").textContent = r.value + "%"; } enqDesenhar(); }, { passive: false });
  }
  /* tamanho da foto desenhada em relação à moldura (1 = do tamanho da moldura) */
  var ENQ_MED = {};
  async function enqMedida() {
    var k = ENQ.src.length + "|" + ENQ.src.slice(-32), im = ENQ_MED[k] || (ENQ_MED[k] = await imgDe(ENQ.src));
    var s = Math.max(ENQ.cw / im.naturalWidth, ENQ.ch / im.naturalHeight) * Math.max(1, ENQ.e.z);
    return { dw: im.naturalWidth * s / ENQ.cw, dh: im.naturalHeight * s / ENQ.ch };
  }
  function enqLook(v) {
    var L = { auto: { ex: 18, so: 30, ct: 8, sa: 6 }, vivo: { ct: 22, sa: 32, ex: 4 }, quente: { te: 38, sa: 10, ex: 4 }, frio: { te: -36, ct: 8 }, pb: { sa: -100, ct: 22 }, zero: {} }[v] || {};
    ENQ.e.aj = Object.assign({}, L);
    AJUSTES.forEach(function (a) { var r = $("modalCx").querySelector('[data-enq="' + a[0] + '"]'); if (r) { r.value = +ENQ.e.aj[a[0]] || 0; r.parentNode.querySelector("b").textContent = r.value; } });
    enqDesenhar();
  }
  function sobreW() { var e = KIT.est || {}; return Math.round(ENQ && ENQ.sw ? ENQ.sw : +e.sobW || (e.sob === "topo" ? 42 : 36)); }
  function sobreDim(G) { var e = KIT.est || {}, w = G.CW * Math.max(0.2, Math.min(0.62, (ENQ && ENQ.sw ? ENQ.sw : +e.sobW || (e.sob === "topo" ? 42 : 36)) / 100)), q = ENQ && ENQ.sr != null ? ENQ.sr : e.sobR || "",
    r = SOB_R[q] ? SOB_R[q][0] : (ENQ_PROP_S || 1.3); if (q === "livre") return [w, Math.min(sobAltLivre(G, ENQ && ENQ.sh ? ENQ.sh : e.sobH, w), G.H * 0.62)]; return [w, Math.min(w * r, G.H * 0.62)]; }
  function sobreH(G) { var e = KIT.est || {}; if (ENQ && ENQ.sh) return Math.round(ENQ.sh); if (+e.sobH) return Math.round(+e.sobH); var d = sobreDim(G); return Math.max(10, Math.min(100, Math.round(d[1] / G.CW * 100))); }
  var ENQ_PROP_S = 0;
  /* ⤢ REENQUADRAR (28/11, dono: "não é só aumentar para um lado — mostrar o oculto da foto"): a moldura mudou de w0×h0 para w1×h1 →
     a foto fica na MESMA escala na página e a moldura revela (ou esconde) o que estava fora, preso no lado/canto puxado (q) ou no centro.
     Quando a foto acaba (não tem mais o que mostrar), aí sim ela começa a crescer para cobrir. e = {x, y, z} do recorte (cover × z). */
  function reenquadrar(e, w0, h0, w1, h1, ih, q) {
    if (!e || !(w0 > 0) || !(h0 > 0) || !(ih > 0)) return e; var iw = 1; q = q || "";
    var z0 = Math.max(1, +e.z || 1), s0 = Math.max(w0 / iw, h0 / ih) * z0, cov1 = Math.max(w1 / iw, h1 / ih), z1 = Math.max(1, Math.min(3, s0 / cov1)), s1 = cov1 * z1;
    var eixo = function (p, c0, c1, tam, a0, a1) {   /* p = posição 0..1; c = tamanho da moldura; tam = tamanho da foto em px */
      var L0 = Math.max(0, tam * s0 - c0) * p / s0, vis0 = c0 / s0, vis1 = c1 / s1, L1 = a0 ? L0 + vis0 - vis1 : a1 ? L0 : L0 + vis0 / 2 - vis1 / 2;
      L1 = Math.max(0, Math.min(tam - vis1, L1)); var sobra = tam * s1 - c1; return sobra > 0.5 ? Math.max(0, Math.min(1, L1 * s1 / sobra)) : 0.5; };
    e.x = +eixo(e.x == null ? 0.5 : +e.x, w0, w1, iw, q.indexOf("w") >= 0, q.indexOf("e") >= 0).toFixed(4);
    e.y = +eixo(e.y == null ? 0.5 : +e.y, h0, h1, ih, q.indexOf("n") >= 0, q.indexOf("s") >= 0).toFixed(4);
    e.z = +z1.toFixed(3); return e;
  }
  function zUi() { var r = $("modalCx") && $("modalCx").querySelector('[data-enq="z"]'); if (r && ENQ) { r.value = Math.round(ENQ.e.z * 100); r.parentNode.querySelector("b").textContent = r.value + "%"; } }
  /* a moldura da página 2 mostra o tamanho REAL na mesma escala: X muda só a largura, Y só a altura (antes a altura era fixa e o Y só estreitava a moldura) */
  function enqAltDisp() { var v = getComputedStyle($("modalCx")).getPropertyValue("--enq-h").trim(), n = parseFloat(v); if (!n) return window.innerHeight * 0.4; return /vh$/.test(v) ? n * window.innerHeight / 100 : /dvh$/.test(v) ? n * window.innerHeight / 100 : n; }
  function enqTam(q) { if (!ENQ || ENQ.k !== "sobre") return; var d = sobreDim(ENQ.G);
    if (ENQ.cw && ENQ.ch && (Math.abs(d[0] - ENQ.cw) > 0.5 || Math.abs(d[1] - ENQ.ch) > 0.5)) { reenquadrar(ENQ.e, ENQ.cw, ENQ.ch, d[0], d[1], ENQ_PROP_S, q); zUi(); }
    ENQ.cw = d[0]; ENQ.ch = d[1]; var pl = $("enqPalco");
    if (pl) { var G = ENQ.G, larg = Math.max(120, (pl.parentNode.clientWidth || 300) - 4), alt = Math.max(80, enqAltDisp()), maxW = G.CW * 0.62, maxH = Math.min(G.CW, G.H * 0.62), esc = Math.min(larg / maxW, alt / maxH);
      pl.style.aspectRatio = "auto"; pl.style.width = Math.round(d[0] * esc) + "px"; pl.style.height = Math.round(d[1] * esc) + "px"; }
    dimTxt(d); enqDesenhar(); }
  function dimTxt(d) { var tx = $("enqDimTxt"); if (tx && ENQ) tx.textContent = "Na página: " + Math.round(d[0] / 2.835) + " × " + Math.round(d[1] / 2.835) + " mm" + (d[1] >= ENQ.G.H * 0.62 - 0.5 ? " · altura no máximo da página" : ""); }
  function enqProp(v) { if (v === "livre" && !ENQ.sh) { var dd = sobreDim(ENQ.G); ENQ.sh = Math.max(10, Math.min(100, Math.round(dd[1] / ENQ.G.CW * 100))); var rr = $("modalCx").querySelector('[data-enq="sh"]'); if (rr) { rr.value = ENQ.sh; rr.parentNode.querySelector("b").textContent = ENQ.sh + "%"; } }
    ENQ.sr = v; var al = $("enqAltLivre"); if (al) al.hidden = v !== "livre"; [].forEach.call($("modalCx").querySelectorAll('[data-a="enqProp"]'), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); }); enqTam(); }
  function enqPos(v) { ENQ.e.y = v === "topo" ? 0 : v === "base" ? 1 : 0.5; if (v === "centro") ENQ.e.x = 0.5; enqDesenhar(); }
  /* AO VIVO: cada mudança já vai para o PDF da prévia (o layout se ajusta enquanto se mexe) */
  var tVivo = 0;
  function enqVivo() { clearTimeout(tVivo); tVivo = setTimeout(function () { if (!ENQ || ENQ.antes) return; var j = JSON.stringify([ENQ.e, ENQ.sw, ENQ.sr, ENQ.sh]); if (j === ENQ.ult) return; if (ENQ.ult == null) { ENQ.ult = j; return; } ENQ.ult = j; enqGravar(); agendarPrevia(0); }, 260); }
  function enqVoltar() {
    if (!ENQ) return; var b = ENQ.bk; IMGS.enq = IMGS.enq || {}; if (b.tem) IMGS.enq[ENQ.k] = clone(b.v); else delete IMGS.enq[ENQ.k];
    KIT.est = KIT.est || {}; if (b.sobW == null) delete KIT.est.sobW; else KIT.est.sobW = b.sobW; if (b.sobR == null) delete KIT.est.sobR; else KIT.est.sobR = b.sobR; if (b.sobH == null) delete KIT.est.sobH; else KIT.est.sobH = b.sobH;
    var alvo = ENQ.k === "sobre" || ENQ.k === "capa" || ENQ.k === "retrato" || ENQ.k.indexOf("c:") === 0 ? ENQ.k : ENQ.k.replace(/^f/, ""); ENQ = null; agendarPrevia(0); abrirAlvo(alvo); aviso("Voltou como estava");
  }
  /* fechar (✕, Esc, tocar fora na prévia) GUARDA o que já se vê na prévia */
  function enqFechar() { if (ENQ) { enqGravar(); ENQ = null; guardarImgs(); guardar(); agendarPrevia(0); } if (EL) { EL = null; guardar(); } $("modal").hidden = true; $("modal").classList.remove("lado"); $("modalCx").innerHTML = ""; marcarAtiva(); }
  function dock() { var lado = window.innerWidth > 1060 || ($("vEd") && $("vEd").getAttribute("data-aba") === "prev"); $("modal").classList.toggle("lado", !!lado); aplicarJan(); }
  /* 🪟 JANELAS FLUTUANTES (28/11, dono: "as janelas que se abrem flutuantes, arrastadas e ajustadas em tamanho e local"): puxar pelo título ou pelo ⠿
     move; o ◢ do canto muda o tamanho; dois toques no ⠿ volta ao lugar de sempre. Lugar e tamanho ficam NESTE aparelho (ui_pk_janela), um por tipo de janela. */
  var SETAS_HIST = '<button type="button" class="pk-chip pk-hist" data-a="desfazer" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">↶</button><button type="button" class="pk-chip pk-hist" data-a="refazer" title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer">↷</button>';
  var JAN_PECAS = '<i class="pk-jan-arr" title="Arraste para mover · dois toques: volta ao lugar" aria-hidden="true">⠿</i><i class="pk-jan-tam" title="Arraste para mudar o tamanho" aria-hidden="true"></i>';
  var JAN = (function () { try { return JSON.parse(localStorage.getItem("ui_pk_janela") || "{}") || {}; } catch (e) { return {}; } })();
  function chaveJan() { return ($("modal").classList.contains("lado") ? "lado" : "centro") + (window.innerWidth > 1060 ? "" : "-cel") + ($("modalCx").classList.contains("enq-app") ? "-enq" : ""); }
  function encaixarJan(cx, j) {
    var vw = window.innerWidth, vh = window.innerHeight, w = Math.max(260, Math.min(vw - 8, j.w)), h = Math.max(180, Math.min(vh - 8, j.h));
    var x = Math.max(4 - w + 80, Math.min(vw - 80, j.x)), y = Math.max(4, Math.min(vh - 44, j.y));
    cx.style.left = x + "px"; cx.style.top = y + "px"; cx.style.width = w + "px"; cx.style.height = h + "px"; cx.style.maxHeight = "none";
    if (cx.classList.contains("enq-app")) cx.style.setProperty("--enq-h", Math.max(70, Math.round(h * 0.4)) + "px"); else cx.style.removeProperty("--enq-h");
    return { x: x, y: y, w: w, h: h };
  }
  function aplicarJan() {
    var cx = $("modalCx"); if (!cx) return; var j = JAN[chaveJan()];
    ["left", "top", "width", "height", "max-height", "--enq-h"].forEach(function (p) { cx.style.removeProperty(p); });
    cx.classList.toggle("solta", !!j); if (j) encaixarJan(cx, j);
  }
  function gravarJan(cx) { var r = cx.getBoundingClientRect(); JAN[chaveJan()] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; try { localStorage.setItem("ui_pk_janela", JSON.stringify(JAN)); } catch (e) { } }
  function ligarJanelas() {
    var mo = $("modal"); if (!mo || mo.__jan) return; mo.__jan = 1; var J = null, ultToque = 0;
    mo.addEventListener("pointerdown", function (ev) {
      var cx = $("modalCx"), alca = ev.target.closest && ev.target.closest(".pk-jan-arr,.pk-jan-tam,#modalCx > h3"); if (!alca || !cx.contains(alca)) return;
      var tam = alca.classList.contains("pk-jan-tam");
      if (!tam && alca.classList.contains("pk-jan-arr") && Date.now() - ultToque < 320) { delete JAN[chaveJan()]; try { localStorage.setItem("ui_pk_janela", JSON.stringify(JAN)); } catch (e) { } aplicarJan(); aviso("Janela no lugar de sempre"); ultToque = 0; return; }
      if (alca.classList.contains("pk-jan-arr")) ultToque = Date.now();
      var r = cx.getBoundingClientRect(); ev.preventDefault();
      J = { tam: tam, px: ev.clientX, py: ev.clientY, r: { x: r.left, y: r.top, w: r.width, h: r.height }, id: ev.pointerId, mexeu: false };
      try { mo.setPointerCapture(ev.pointerId); } catch (e) { }
    });
    mo.addEventListener("pointermove", function (ev) {
      if (!J) return; var dx = ev.clientX - J.px, dy = ev.clientY - J.py; if (!J.mexeu && Math.hypot(dx, dy) < 4) return;
      var cx = $("modalCx"); if (!J.mexeu) { J.mexeu = true; cx.classList.add("solta"); } ev.preventDefault();
      encaixarJan(cx, J.tam ? { x: J.r.x, y: J.r.y, w: J.r.w + dx, h: J.r.h + dy } : { x: J.r.x + dx, y: J.r.y + dy, w: J.r.w, h: J.r.h });
    });
    var fim = function () { if (!J) return; var j = J; J = null; window.__pkJanT = Date.now(); if (j.mexeu) { gravarJan($("modalCx")); if (ENQ) { if (ENQ.k === "sobre") enqTam(); else enqDesenhar(); } } };
    mo.addEventListener("pointerup", fim); mo.addEventListener("pointercancel", fim);
    window.addEventListener("resize", function () { if (!$("modal").hidden) aplicarJan(); });
  }
  function enqGravar() {
    if (!ENQ) return; marcarHist(); var e = ENQ.e, aj = {}; AJUSTES.forEach(function (a) { if (+e.aj[a[0]]) aj[a[0]] = +e.aj[a[0]]; });
    var limpo = ENQ.inteira ? {} : { x: +(+e.x).toFixed(4), y: +(+e.y).toFixed(4), z: +(+e.z).toFixed(3) }; if (Object.keys(aj).length) limpo.aj = aj;
    if (!ENQ.inteira && !fxNeutro(e.fx)) limpo.fx = { m: e.fx.m || "normal", c: e.fx.c || "fundo", o: e.fx.o == null ? 100 : +e.fx.o, k: e.fx.k || "nenhuma", s: e.fx.s == null ? 50 : +e.fx.s };
    IMGS.enq = IMGS.enq || {};
    var neutro = !limpo.aj && !limpo.fx && (ENQ.inteira || (Math.abs(limpo.x - 0.5) < 0.001 && Math.abs(limpo.y - 0.5) < 0.001 && limpo.z <= 1.001));
    if (ENQ.k === "sobre") { KIT.est = KIT.est || {}; if (ENQ.sw) KIT.est.sobW = ENQ.sw; if (ENQ.sr != null) { if (ENQ.sr) KIT.est.sobR = ENQ.sr; else delete KIT.est.sobR; } if (KIT.est.sobR === "livre" && ENQ.sh) KIT.est.sobH = ENQ.sh; else if (KIT.est.sobR !== "livre") delete KIT.est.sobH; 
      if (neutro && !KIT.est.sobR) { delete IMGS.enq.sobre; } else IMGS.enq.sobre = limpo; }
    else if (neutro) delete IMGS.enq[ENQ.k]; else IMGS.enq[ENQ.k] = limpo;
  }
  function enqPronto() { if (!ENQ) return; enqGravar(); ENQ = null; fecharModal(); guardarImgs(); guardar(); desenharForm(); agendarPrevia(0); aviso("Foto ajustada ✓"); }
  function caixaImg(rot, chave, dica, png) {
    var u = IMGS[chave];
    return '<div class="pk-img"><span>' + rot + "</span>" + (u ? '<img src="' + u + '" alt="' + esc(rot) + '"' + (png ? ' class="xadrez"' : "") + ">" : "<i>" + esc(dica) + "</i>") + '<div class="pk-chips">' + upload(u ? "↺ TROCAR" : "＋ ESCOLHER", chave) +
      (u ? '<button type="button" class="pk-chip" data-a="fotoBaixar" data-alvo="' + chave + '">⬇ BAIXAR</button><button type="button" class="pk-chip" data-a="tirarImg" data-v="' + chave + '">✕ TIRAR</button>' : "") + (chave === "logo" ? '<button type="button" class="pk-chip" data-a="logoEmpresa">★ DA MINHA EMPRESA</button>' : u ? '<button type="button" class="pk-chip" data-a="enquadrar" data-alvo="' + chave + '">' + (chave === "retrato" ? "🎚 LUZ E COR" : "✥ ENQUADRAR E AJUSTAR") + "</button>" + (chave === "retrato" ? '<button type="button" class="pk-chip" data-a="enquadrar" data-alvo="sobre">✥ ENQUADRAR NA PÁGINA 2</button>' : "") : "") + "</div>" + (u && chave !== "logo" ? botoesIA(chave) : "") + "</div>";
  }
  /* 🎛 ESTILO AO VIVO: tudo o que muda o visual, com a prévia (o próprio PDF) se refazendo na hora */
  function grupoEstilo(k, mod) {
    var e = k.est || {}, cap = capaDoKit(k), c1 = k.cor || mod.cor, c2 = k.cor2 || mod.cor2, bg = e.fundo || mod.tema.fundo, cc = mod.tema.capa === "compcard";
    var vars = "--c1:" + c1 + ";--c2:" + c2 + ";--bg:" + bg;
    var chips = function (campo, lista, atual) { return '<div class="pk-chips">' + Object.keys(lista).map(function (v) { return '<button type="button" class="pk-chip' + (v === atual ? " on" : "") + '" data-a="est" data-c="' + campo + '" data-v="' + v + '">' + esc(lista[v]) + "</button>"; }).join("") + "</div>"; };
    var faixa = function (rot, campo, min, max, v) { return '<label class="pk-aj"><span>' + rot + '</span><input type="range" min="' + min + '" max="' + max + '" step="1" data-k="est.' + campo + '" value="' + v + '" data-mostra="1"><b>' + v + "%</b></label>"; };
    var corpo = '<p class="tf-sub">Mexa à vontade: a prévia se refaz na hora. Seus textos e fotos não mudam.</p>' +
      (cc ? "" : '<div class="pk-sub-t">CAPA</div><div class="pk-capas" style="' + vars + '">' + Object.keys(CAPAS).map(function (v) {
        return '<button type="button" class="pk-capa' + (v === cap ? " on" : "") + '" data-a="est" data-c="capa" data-v="' + v + '" title="' + CAPAS[v] + '"><i class="pk-cmini m-' + v + '"><u></u><s></s><em></em></i><span>' + CAPAS[v] + "</span></button>"; }).join("") + "</div>") +
      '<div class="pk-sub-t">PÁGINAS INTERNAS</div><div class="pk-capas" style="' + vars + '">' + Object.keys(PAGINAS).map(function (v) {
        return '<button type="button" class="pk-capa' + (v === (PAGINAS[e.pg] ? e.pg : "padrao") ? " on" : "") + '" data-a="est" data-c="pg" data-v="' + v + '" title="' + PAGINAS[v] + '"><i class="pk-cmini pk-pm p-' + v + '"><u></u><s></s><em></em><b></b></i><span>' + PAGINAS[v] + "</span></button>"; }).join("") + "</div>" +
      '<div class="pk-sub-t">QUEM SOU EU</div><div class="pk-capas" style="' + vars + '">' + Object.keys(SOBRES).map(function (v) {
        return '<button type="button" class="pk-capa' + (v === (SOBRES[e.sob] ? e.sob : "esq") ? " on" : "") + '" data-a="est" data-c="sob" data-v="' + v + '" title="' + SOBRES[v] + '"><i class="pk-cmini pk-sm s-' + v + '"><u></u><s></s><em></em><b></b></i><span>' + SOBRES[v] + "</span></button>"; }).join("") + "</div>" +
      '<div class="pk-sub-t">TRABALHOS E CURSOS</div>' + chips("lst", LISTAS, LISTAS[e.lst] ? e.lst : "linhas") +
      '<div class="pk-sub-t">CARTÕES POR LINHA</div>' + chips("col", { auto: "Automático", "1": "1 por linha", "2": "2 por linha", "3": "3 por linha" }, e.col || "auto") +
      '<div class="pk-sub-t">TÍTULOS E PARTES</div>' + chips("alinh", { esq: "⇤ Títulos à esquerda", centro: "↔ Títulos no centro" }, e.alinh || "esq") +
      chips("quebra", { seguido: "Partes seguidas", pagina: "📄 Cada parte numa página" }, e.quebra || "seguido") +
      '<div class="pk-sub-t">PALETAS PRONTAS</div><div class="pk-paletas">' + PALETAS.map(function (p, i) {
        return '<button type="button" class="pk-paleta' + (p[1] === c1 && p[3] === bg ? " on" : "") + '" data-a="estPaleta" data-i="' + i + '"><i style="background:' + p[3] + '"><b style="background:' + p[1] + '"></b><b style="background:' + p[2] + '"></b></i><span>' + esc(p[0]) + "</span></button>"; }).join("") + "</div>" +
      '<div class="pk-cores"><label class="pk-campo"><span>Cor principal</span><input type="color" data-k="cor" value="' + esc(c1) + '"></label><label class="pk-campo"><span>Cor de apoio</span><input type="color" data-k="cor2" value="' + esc(c2) + '"></label>' +
      '<label class="pk-campo"><span>Fundo das páginas</span><input type="color" data-k="est.fundo" value="' + esc(bg) + '"></label></div>' +
      '<div class="pk-chips"><button type="button" class="pk-chip" data-a="coresEmpresa">★ COR DA MINHA EMPRESA</button></div>' +
      '<div class="pk-sub-t">TÍTULOS DAS PARTES</div>' + chips("tit", TITULOS, TITULOS[e.tit] ? e.tit : (mod.estTit || "numero")) +
      '<div class="pk-sub-t">CAIXAS</div>' + chips("cart", CARTOES, CARTOES[e.cart] ? e.cart : "suave") +
      '<div class="pk-sub-t">TAMANHOS E ESPAÇO</div>' + faixa("Aa Nome na capa", "nome", 60, 150, +e.nome || 100) + faixa("Aa Textos", "texto", 80, 125, +e.texto || 100) +
      chips("esp", { compacto: "Compacto", normal: "Normal", arejado: "Arejado" }, e.esp || "normal") +
      '<div class="pk-sub-t">DETALHES</div>' + chips("maiusc", { sim: "TÍTULOS EM MAIÚSCULAS", nao: "Títulos normais" }, e.maiusc || (mod.tema.caixaAlta ? "sim" : "nao")) +
      chips("deco", { sim: "✦ Com enfeites", nao: "Sem enfeites" }, e.deco || "sim") +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn" data-a="estZerar">↺ VOLTAR AO ESTILO DO MODELO</button></div>';
    return grupo("estilo", "🎛 ESTILO AO VIVO", corpo, false);
  }
  function desenharForm() {
    var k = KIT, d = k.d, c = d.contato || (d.contato = {}), mod = modeloDe(k.modelo), cc = mod.tema.capa === "compcard";
    $("edNome").value = k.nome || ""; PASSO = 0;
    var h = "";
    /* o atalho que monta tudo: falar ou escrever do seu jeito e a IA distribui nos campos */
    h += '<div class="tf-card pk-falando"><div><b>🎙 Monte falando</b><span>Conte quem você é, o que faz, onde já trabalhou e como te encontrar. A IA corrige e coloca cada coisa no seu lugar — não inventa nada.</span></div><button type="button" class="bw-btn pri" data-a="iaSobre">🎙 CONTAR SOBRE MIM</button></div>';
    if (k.exemplo) h += '<div class="tf-card pk-exemplo"><b>Este modelo começou com um EXEMPLO</b> (pessoa inventada). Troque pelos seus dados ou comece do zero.<div class="pk-chips"><button type="button" class="bw-btn" data-a="limparExemplo">🧹 APAGAR O EXEMPLO</button><button type="button" class="bw-btn" data-a="puxarEmpresa">⇩ USAR MINHA EMPRESA</button></div></div>';
    if (ULT_TIRADA && (k.ocultas || []).indexOf(ULT_TIRADA) >= 0) h += '<div class="tf-card pk-exemplo"><b>Você tirou “' + esc(titulo(k, ULT_TIRADA)) + '”.</b> As partes tiradas voltam em 📑 PARTES E ORDEM, no fim.<div class="pk-chips"><button type="button" class="bw-btn" data-a="devolverParte">↺ DEVOLVER</button></div></div>';
    /* modelo e cores */
    h += grupo("modelo", "🎨 MODELO E VISUAL",
      '<div class="pk-chips">' + MODELOS.map(function (m) { return '<button type="button" class="pk-chip' + (m.id === k.modelo ? " on" : "") + '" data-a="trocarModelo" data-m="' + m.id + '">' + m.ico + " " + esc(m.nome) + "</button>"; }).join("") + "</div>" +
      '<p class="tf-sub">Trocar o modelo mantém todos os seus textos e fotos.</p>' +
      '<div class="pk-cores"><label class="pk-campo"><span>Letra dos títulos</span><select data-k="fonte">' + Object.keys(FONTES_TIT).map(function (f) { return '<option value="' + f + '"' + ((k.fonte || mod.fonte) === f ? " selected" : "") + ">" + FONTES_TIT[f] + "</option>"; }).join("") + "</select></label>" +
      '<label class="pk-campo"><span>Formato</span><select data-k="formato"' + (cc ? " disabled" : "") + ">" + (cc ? '<option>A5 (comp card)</option>' : Object.keys(FORMATOS).map(function (f) { return '<option value="' + f + '"' + ((k.formato || mod.formato) === f ? " selected" : "") + ">" + FORMATOS[f] + "</option>"; }).join("")) + "</select></label></div>" +
      '<p class="tf-sub">Capa, cores, títulos e tamanhos ficam em 🎛 ESTILO AO VIVO, logo abaixo.</p>', true);
    h += grupoEstilo(k, mod);
    /* 1 · quem é você */
    h += grupo("quem", "QUEM É VOCÊ",
      '<div class="pk-campos">' + campo("Seu nome (ou nome artístico)", "d.marca", d.marca, { larga: true, max: 80 }) + campo("O que você faz (uma linha)", "d.slogan", d.slogan, { larga: true, max: 160, ph: "Ex.: Atriz · Teatro, TV e publicidade" }) +
      campo("Etiqueta (em cima do nome)", "d.etiqueta", d.etiqueta, { max: 60, ph: "APRESENTAÇÃO PESSOAL" }) + campo("Cidade", "d.cidade", d.cidade, { max: 80 }) + "</div>", false, true);
    /* 2 · fotos e mídia */
    h += grupo("midia", "FOTOS E MÍDIA",
      '<div class="pk-imgs">' + caixaImg("SUA FOTO RECORTADA (sem fundo)", "retrato", "PNG sem fundo — fica ao lado do seu texto", true) + caixaImg(cc ? "FOTO PRINCIPAL" : "FOTO DA CAPA", "capa", "a foto que abre a apresentação") + caixaImg("LOGO OU ASSINATURA (opcional)", "logo", "sem logo", true) + "</div>" +
      '<div class="pk-sub-t">GALERIA <small>(' + (IMGS.fotos || []).length + "/7)</small></div>" + '<div class="pk-fotos">' + (IMGS.fotos || []).map(function (u, i) {
        return '<div class="pk-foto"><img src="' + u + '" alt="Foto ' + (i + 1) + '"><span><button type="button" class="pk-sx" data-a="fotoEsq" data-i="' + i + '" aria-label="Para a esquerda">◀</button><button type="button" class="pk-sx" data-a="fotoTira" data-i="' + i + '" aria-label="Tirar foto">✕</button><button type="button" class="pk-sx" data-a="fotoBaixar" data-alvo="' + i + '" aria-label="Baixar a foto ' + (i + 1) + '">⬇</button><button type="button" class="pk-sx" data-a="enquadrar" data-alvo="' + i + '" aria-label="Enquadrar e ajustar">✥</button><button type="button" class="pk-sx ia" data-a="fotoIAmenu" data-i="' + i + '" aria-label="Melhorar com IA"' + (IA_OCUP["f" + i] ? " disabled" : "") + '>✨</button><button type="button" class="pk-sx" data-a="fotoDir" data-i="' + i + '" aria-label="Para a direita">▶</button></span></div>';
      }).join("") + "</div>" + ((IMGS.fotos || []).length < 7 ? upload("＋ FOTOS NA GALERIA", "fotos", true) : "") +
      '<p class="tf-sub">' + (cc ? "As 4 primeiras fotos vão para o verso do comp card." : "A primeira foto da galeria sai grande; as outras, em grade.") + " Sem foto recortada? No <a href=\"fotos.html\">Editor de fotos</a> → ✨ IA → fundo transparente. Tudo fica só neste aparelho.</p>", false, true);
    /* seções ligadas, na ordem */
    var ordem = (k.ordem || TODAS).filter(function (id) { return SECOES[id]; }); TODAS.forEach(function (id) { if (ordem.indexOf(id) < 0) ordem.push(id); });
    var titSec = function (id) { return campo("Título desta parte", "tit." + id, (k.tit && k.tit[id]) || "", { ph: SECOES[id].nome, max: 50 }); };
    ordem.filter(function (id) { return (k.ocultas || []).indexOf(id) < 0; }).forEach(function (id) {
      var corpo = "", nm = SECOES[id].ico + " " + titulo(k, id).toUpperCase();
      if (id === "sobre") corpo = '<div class="pk-campos">' + titSec(id) + campo("Frase de destaque", "d.sobreCurto", d.sobreCurto, { area: true, larga: true, linhas: 2, max: 300 }) + campo("Seu texto", "d.sobre", d.sobre, { area: true, larga: true, linhas: 7, max: 3000, ph: "Fale ou escreva. Linha em branco = novo parágrafo." }) + "</div>";
      else if (id === "perfil") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("perfil", d.perfil || [], [["k", "Item", "", "Ex.: Altura, Idiomas, DRT"], ["v", "Valor"]], 12, "ITEM");
      else if (id === "numeros") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("numeros", d.numeros || [], [["v", "Número"], ["r", "O que ele mostra"]], 9, "NÚMERO") + '<p class="tf-sub">Só números que você pode provar.</p>';
      else if (id === "servicos") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("servicos", d.servicos || [], [["t", "Nome"], ["d", "Em uma frase", "area"]], 10, "ITEM") +
        '<label class="pk-liga"><input type="checkbox" data-a="servFotos"' + (k.servFotos ? " checked" : "") + "> Cartão sem foto própria usa uma foto da galeria</label>" + '<p class="tf-sub">📷 Cada cartão pode ter a sua foto: ＋ FOTO envia do aparelho, 🖼 GALERIA escolhe uma das suas.</p>';
      else if (id === "experiencia") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("experiencia", d.experiencia || [], [["grupo", "Grupo", "", "Ex.: TV e publicidade, Eventos, Teatro"], ["titulo", "Trabalho / projeto"], ["papel", "Sua função"], ["onde", "Onde / para quem"], ["ano", "Ano"], ["link", "Link do vídeo ou matéria (opcional)", "url", "youtube.com/..."]], 24, "TRABALHO") + '<p class="tf-sub">Com link, aparece o botão VER ↗ clicável no PDF (a foto do trabalho também abre o link). Itens do mesmo grupo ficam juntos.</p>';
      else if (id === "formacao") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("formacao", d.formacao || [], [["curso", "Curso"], ["onde", "Onde"], ["ano", "Ano"]], 10, "CURSO");
      else if (id === "habilidades") corpo = '<div class="pk-campos">' + titSec(id) + campo("Uma por linha", "d.habilidades", d.habilidades || "", { area: true, larga: true, linhas: 5, max: 1500, lista: true }) + "</div>";
      else if (id === "links") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("links", d.links || [], [["rot", "Nome do botão", "", "Ex.: Vídeos, Fotos, Reel"], ["url", "Link", "url", "youtube.com/..."]], 8, "LINK") + '<p class="tf-sub">Cada link vira um cartão clicável no PDF, com QR code para quem imprimir. Ponha uma foto de capa (ex.: um quadro do vídeo) — ela também abre o link.</p>';
      else if (id === "galeria") corpo = '<div class="pk-campos">' + titSec(id) + campo("Legenda (opcional)", "d.galeriaLegenda", d.galeriaLegenda || "", { larga: true, max: 160 }) + '</div><p class="tf-sub">As fotos ficam em <b>FOTOS E MÍDIA</b>, lá em cima.</p>';
      else if (id === "clientes") corpo = '<div class="pk-campos">' + titSec(id) + campo("Um por linha", "d.clientes", d.clientes, { area: true, larga: true, linhas: 6, max: 2000, lista: true }) + "</div>";
      else if (id === "depoimentos") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("depoimentos", d.depoimentos || [], [["texto", "Recomendação", "area"], ["autor", "Quem disse"], ["cargo", "Cargo e empresa"]], 4, "RECOMENDAÇÃO") + '<p class="tf-sub">Só recomendações de verdade, com autorização de quem disse.</p>';
      else if (id === "release") { var r = d.release || (d.release = {}); corpo = '<div class="pk-campos">' + titSec(id) + campo("Título do release", "d.release.titulo", r.titulo || "", { larga: true, max: 160 }) + campo("Data / local", "d.release.data", r.data || "", { max: 80 }) + campo("Texto", "d.release.texto", r.texto || "", { area: true, larga: true, linhas: 7, max: 4000 }) + '</div><div class="pk-chips"><button type="button" class="bw-btn" data-a="iaRelease">✨ ESCREVER O RELEASE COM IA</button></div>'; }
      else if (id === "imprensa") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("imprensa", d.imprensa || [], [["veiculo", "Veículo"], ["titulo", "Título da matéria"], ["data", "Data"], ["link", "Link (opcional)", "url"]], 8, "MATÉRIA");
      else if (id === "agenda") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("agenda", d.agenda || [], [["data", "Data / hora"], ["titulo", "O quê"], ["local", "Onde"]], 12, "DATA");
      else if (id === "rider") corpo = '<div class="pk-campos">' + titSec(id) + campo("Um item por linha", "d.rider", d.rider || "", { area: true, larga: true, linhas: 6, max: 2000, lista: true }) + campo("Observação", "d.riderObs", d.riderObs || "", { larga: true, max: 300 }) + "</div>";
      else if (id === "contato") corpo = '<div class="pk-campos">' + titSec(id) + campo("Quem atende (você ou agência)", "d.contato.resp", c.resp || "", { max: 80 }) + campo("Função", "d.contato.cargo", c.cargo || "", { max: 80 }) + campo("WhatsApp", "d.contato.tel", c.tel || "", { tipo: "tel", max: 40 }) +
        campo("E-mail", "d.contato.email", c.email || "", { tipo: "email", max: 120 }) + campo("Instagram", "d.contato.insta", c.insta || "", { max: 80, ph: "@seuperfil" }) + campo("TikTok", "d.contato.tiktok", c.tiktok || "", { max: 80, ph: "@seuperfil" }) +
        campo("YouTube", "d.contato.youtube", c.youtube || "", { max: 120, ph: "@seucanal" }) + campo("Site", "d.contato.site", c.site || "", { max: 120 }) + campo("Cidade", "d.contato.cidade", c.cidade || "", { max: 80 }) + "</div>";
      h += grupo("s_" + id, esc(nm), '<div class="pk-tira"><button type="button" class="pk-tira-b" data-a="tirarParte" data-s="' + id + '">✕ TIRAR ESTA PARTE</button></div>' + corpo, false, true);
    });
    /* seções e ordem (no fim: é ajuste, não é o começo) */
    h += grupo("secoes", "📑 PARTES E ORDEM", '<p class="tf-sub">Ligue só o que faz sentido para você. As setas mudam a ordem no PDF.</p><div class="pk-ordem">' + ordem.map(function (id, i) {
      var on = (k.ocultas || []).indexOf(id) < 0;
      return '<div class="pk-ord' + (on ? "" : " off") + '"><label><input type="checkbox" data-a="vis" data-s="' + id + '"' + (on ? " checked" : "") + "> " + SECOES[id].ico + " " + esc(titulo(k, id)) + '</label><span><button type="button" class="pk-sx" data-a="sobe" data-s="' + id + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Subir">▲</button><button type="button" class="pk-sx" data-a="desce" data-s="' + id + '"' + (i === ordem.length - 1 ? " disabled" : "") + ' aria-label="Descer">▼</button></span></div>';
    }).join("") + "</div>");
    $("form").innerHTML = h;
    if (window.BWDobras) { BWDobras.agrupar($("form"), ".pk-grupo .pk-sub-t", "pks_"); BWDobras.aplicar($("form")); }
    Object.keys(DIT.antes).forEach(function (id) { var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = false; });
  }

  /* ---------- 🎙 DITADO + ✨ CORREÇÃO ---------- */
  var DIT = { rec: null, grav: null, alvo: "", antes: {} };
  function botoesMic() { [].slice.call(document.querySelectorAll('[data-a="falar"]')).forEach(function (b) { var on = (DIT.rec || DIT.grav) && b.getAttribute("data-alvo") === DIT.alvo; b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", String(!!on)); b.textContent = on ? "■ PARAR" : "🎙 FALAR"; }); }
  function setCampo(el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
  function pararDit() { try { if (DIT.rec) DIT.rec.stop(); } catch (e) { } try { if (DIT.grav && DIT.grav.state === "recording") DIT.grav.stop(); } catch (e) { } }
  function juntar(base, novo) { base = String(base || "").replace(/\s+$/, ""); novo = String(novo || "").trim(); if (!novo) return base; return base ? base + (/[.!?…:]$/.test(base) || /\n$/.test(base) ? " " : " ") + novo : novo; }
  function falar(id) {
    if (DIT.rec || DIT.grav) { var mesmo = DIT.alvo === id; pararDit(); if (mesmo) return; }
    var el = $(id); if (!el) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, base = el.value, fim = "";
    DIT.alvo = id; if (!/^ia/.test(id)) DIT.antes[id] = base;
    if (!SR || navigator.standalone) { gravarDit(el, base); return; }
    var r = new SR(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = true;
    r.onresult = function (ev) { var p = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { var t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fim += t + " "; else p += t; } setCampo(el, juntar(base, fim + p)); };
    r.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") aviso("Microfone bloqueado — libere no cadeado do endereço", true);
      else if (ev.error !== "no-speech" && ev.error !== "aborted") aviso("Não consegui ouvir (" + ev.error + ")", true);
    };
    r.onend = function () { DIT.rec = null; botoesMic(); if (fim.trim() && !/^ia/.test(id)) corrigirCampo(id); };
    try { r.start(); DIT.rec = r; botoesMic(); aviso("🎙 Pode falar — toque em PARAR quando acabar"); } catch (e) { DIT.rec = null; aviso("Não consegui ligar o microfone", true); }
  }
  function wav16(am) {
    var n = am.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0, o = 44; i < n; i++, o += 2) { var x = Math.max(-1, Math.min(1, am[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], { type: "audio/wav" });
  }
  /* sem reconhecimento no navegador (iPhone no app instalado): grava e a IA Brightway transcreve */
  async function gravarDit(el, base) {
    var s = await sessao(); if (!s) { aviso("Entre na sua conta para eu transcrever a sua fala", true); DIT.alvo = ""; return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { aviso("Este aparelho não deixa gravar por aqui", true); return; }
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { aviso("Microfone bloqueado", true); return; }
    var partes = [], mr = new MediaRecorder(stream), id = el.id; DIT.grav = mr; botoesMic();
    mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    var acabou = new Promise(function (ok) { mr.onstop = ok; });
    mr.start(); aviso("🎙 Gravando — toque em PARAR quando acabar");
    var lim = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 90000);
    await acabou; clearTimeout(lim); stream.getTracks().forEach(function (t) { t.stop(); }); DIT.grav = null; botoesMic();
    andamento("Transcrevendo…");
    try {
      var blob = new Blob(partes, { type: partes[0] && partes[0].type || "audio/webm" }), Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      var buf = await blob.arrayBuffer(), a = await new Promise(function (ok, erro) { var pr = ctx.decodeAudioData(buf, ok, erro); if (pr && pr.then) pr.then(ok, erro); }); try { ctx.close(); } catch (e) { }
      var off = new OfflineAudioContext(1, Math.ceil(a.duration * 16000), 16000), src = off.createBufferSource(); src.buffer = a; src.connect(off.destination); src.start(); var r16 = await off.startRendering();
      var r = await fetch(FN_TXT + "?lang=pt", { method: "POST", headers: { "Content-Type": "audio/wav", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: wav16(r16.getChannelData(0)) });
      var j = await r.json().catch(function () { return {}; }); andamento("");
      if (!r.ok) throw new Error(r.status === 429 ? "o limite de hoje da IA acabou" : "a transcrição falhou");
      var t = String(j.texto || (j.segmentos || []).map(function (x) { return x.texto || x.text; }).join(" ") || "").trim();
      var alvo = $(id) || el; if (!t) { aviso("Não ouvi nada — tente mais perto do microfone", true); return; }
      setCampo(alvo, juntar(base, t)); if (!/^ia/.test(id)) corrigirCampo(id);
    } catch (e) { andamento(""); aviso("Não consegui transcrever: " + (e && e.message || "erro"), true); }
  }
  /* correção sem IA (sem conta): espaços, vícios de fala, maiúsculas e ponto final */
  function corrigirBasico(t, lista) {
    var f = function (s) {
      s = String(s || "").replace(/[ \t]+/g, " ").replace(/(^|[\s,])(né|tipo assim|tá|aí)(?=[\s,.!?]|$),?/gi, "$1").replace(/\s+([,.!?;:])/g, "$1").replace(/ {2,}/g, " ").trim();
      if (!s) return s; s = s.replace(/(^|[.!?]\s+)([a-zà-ú])/g, function (_, a, b) { return a + b.toUpperCase(); });
      return lista || /[.!?…:]$/.test(s) ? s : s + ".";
    };
    return lista ? String(t || "").split(/\n+/).map(f).filter(Boolean).join("\n") : String(t || "").split(/\n\s*\n/).map(f).filter(Boolean).join("\n\n");
  }
  async function corrigirCampo(id) {
    var el = $(id); if (!el) return; var t = el.value.trim(); if (t.length < 3) { aviso("Escreva ou fale algo antes", true); return; }
    if (DIT.antes[id] == null) DIT.antes[id] = el.value;
    var lista = el.hasAttribute("data-lista"), rot = el.getAttribute("data-rot") || "Texto";
    andamento("Corrigindo o texto…");
    var sistema = "Você revisa textos de apresentação pessoal em português do Brasil. Corrija ortografia, acentos, pontuação e maiúsculas; tire vícios de fala (né, tipo, então, aí, é…), repetições e frases emendadas de quem ditou. Deixe claro e profissional, na primeira ou terceira pessoa como estiver. NUNCA acrescente fatos, números, nomes ou elogios que não estejam no texto e não mude o sentido." +
      (lista ? " O campo é uma LISTA: devolva um item por linha, sem marcadores." : " Separe parágrafos com uma linha em branco.") + " Responda só com o texto corrigido, sem comentários.";
    var r = await ia(sistema, "Campo: " + rot + "\nTexto:\n" + t, 1600);
    andamento("");
    var novo = r.erro ? corrigirBasico(t, lista) : limpar(String(r.texto || r.resposta || "").replace(/^["“]|["”]$/g, ""));
    if (!novo) { aviso("A IA não respondeu agora — tente de novo", true); return; }
    setCampo(el, novo);
    var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = false;
    aviso(r.erro ? (r.erro === "sem_login" ? "Ajuste básico feito — entre na conta para a IA revisar" : "Ajuste básico feito (" + erroIA(r.erro) + ")") : "Texto corrigido ✓");
  }
  function voltarCampo(id) { var el = $(id); if (!el || DIT.antes[id] == null) return; setCampo(el, DIT.antes[id]); delete DIT.antes[id]; var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = true; aviso("↺ Voltou ao que estava"); }

  function definir(k, v) {
    var p = k.split("."), o = KIT;
    for (var i = 0; i < p.length - 1; i++) { var a = p[i]; if (o[a] == null) o[a] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[a]; }
    o[p[p.length - 1]] = v;
  }
  function aoDigitar(e) {
    var el = e.target; if (!el.getAttribute || !el.hasAttribute("data-k") || !KIT) return;
    definir(el.getAttribute("data-k"), el.value);
    guardar(); agendarPrevia();
  }

  /* ---------- PRÉVIA = o próprio PDF ---------- */
  var tPrevia = 0, GER = 0;
  function agendarPrevia(ms) { clearTimeout(tPrevia); $("prevEstado").textContent = "Atualizando…"; tPrevia = setTimeout(desenharPrevia, ms == null ? 650 : ms); }
  async function desenharPrevia() {
    if (!KIT || VISTA !== "editor") return;
    var ger = ++GER;
    try {
      var m = await modelo(KIT, IMGS); m.previa = true; var bytes = await pdfBytes(defPdf(m)); if (ger !== GER) return;
      var J = await pdfjs(), doc = await J.getDocument({ data: bytes, isEvalSupported: false }).promise; if (ger !== GER) { doc.destroy(); return; }
      var caixa = $("paginas"), larg = Math.max(260, Math.min(caixa.clientWidth || 480, 900)), dpr = Math.min(2, window.devicePixelRatio || 1), novos = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var pg = await doc.getPage(i), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: larg * dpr / vp0.width });
        var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.className = "pk-pag"; c.setAttribute("aria-label", "Página " + i + " — toque para ajustar as fotos"); c.setAttribute("data-a", "prevFoto"); c.setAttribute("data-pg", i); c.title = "Toque para ajustar as fotos desta página";
        await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; if (ger !== GER) { doc.destroy(); return; }
        try { c._fotos = (await pg.getAnnotations()).filter(function (a) { return a.url && a.url.indexOf("https://bw.foto/?k=") === 0; }).map(function (a) {
          var r = vp.convertToViewportRectangle(a.rect); return { k: decodeURIComponent(a.url.split("?k=")[1]), x0: Math.min(r[0], r[2]) / vp.width, x1: Math.max(r[0], r[2]) / vp.width, y0: Math.min(r[1], r[3]) / vp.height, y1: Math.max(r[1], r[3]) / vp.height }; }); } catch (e) { c._fotos = []; }
        livres().forEach(function (e) { if ((+e.pg || 1) !== i) return; var hF = elAlt(e, vp0.width, vp0.height); c._fotos.push({ k: "e:" + e.id, x0: e.x, y0: e.y, x1: e.x + e.w, y1: e.y + hF }); });
        novos.push(c);
      }
      PAGS = doc.numPages; doc.destroy();
      caixa.innerHTML = ""; novos.forEach(function (c) { caixa.appendChild(c); }); marcarAtiva();
      $("prevEstado").textContent = PAGS + (PAGS === 1 ? " página" : " páginas") + " · igual ao PDF";
      $("abaPrev").textContent = "👁 PRÉVIA (" + PAGS + ")";
      try { var t = document.createElement("canvas"); t.width = 240; t.height = Math.round(240 * novos[0].height / novos[0].width); t.getContext("2d").drawImage(novos[0], 0, 0, t.width, t.height); idbPut("thumbs", "kit-" + KIT.id, t.toDataURL("image/jpeg", 0.8)); } catch (e) { }
    } catch (e) {
      if (ger === GER) { window.__pkErroPrev = String(e && (e.stack || e));  $("prevEstado").textContent = "Sem prévia agora (" + (e && e.message === "sem internet" ? "sem internet" : "tente de novo") + ")."; }
    }
  }

  function abrirAlvo(alvE) { if (alvE === "sobre" && IMGS.retrato) imgDe(IMGS.retrato).then(function (im) { ENQ_PROP_S = im.naturalHeight / im.naturalWidth; abrirEnquadrar("sobre"); }); else abrirEnquadrar(alvE); }
  /* o que está debaixo do dedo numa página da prévia (a menor área que contém o ponto) */
  function alvoNoPonto(cv, x, y) {
    var r = cv.getBoundingClientRect(), fx = (x - r.left) / r.width, fy = (y - r.top) / r.height, best = null;
    (cv._fotos || []).forEach(function (f) { if (fx >= f.x0 && fx <= f.x1 && fy >= f.y0 && fy <= f.y1) { var ar = (f.x1 - f.x0) * (f.y1 - f.y0) - (f.k.indexOf("e:") === 0 ? 10 : 0); if (!best || ar < best.ar) best = { k: f.k, ar: ar, f: f }; } });
    return best;
  }
  function tocarPrevia(cv) {
    if (Date.now() - (window.__pkArrastou || 0) < 400) return;
    if (window.__pkTipo === "touch" && !INS) { var t0 = Date.now(), xy = PK_XY; setTimeout(function () { if ((window.__pkMenuT || 0) >= t0) return; PK_XY = xy; tocarPreviaJa(cv); }, 340); return; }   /* dedo: espera um 2º toque (dois toques = opções) */
    tocarPreviaJa(cv);
  }
  function tocarPreviaJa(cv) {
    var h = alvoNoPonto(cv, PK_XY.x, PK_XY.y);
    if (h && h.k.indexOf("e:") === 0) { if (ENQ) enqFechar(); abrirElemento(h.k.slice(2)); return; }
    if (h) { if (ENQ || EL) enqFechar(); abrirAlvo(h.k); return; }
    if (INS) { inserirEm(cv, PK_XY.x, PK_XY.y); return; }
    if (ENQ || EL) { enqFechar(); return; }
    abrirFotosPagina(+cv.getAttribute("data-pg") || 1);
  }
  /* contorno dourado na foto/elemento que está sendo ajustado + contorno fino ao passar o mouse */
  function marcarAtiva() {
    var cx = $("paginas"); if (!cx) return; [].forEach.call(cx.querySelectorAll(".pk-hl.on"), function (d) { d.remove(); });
    var alvo = ENQ ? (ENQ.k === "sobre" || ENQ.k === "capa" || ENQ.k === "retrato" || ENQ.k.indexOf("c:") === 0 ? ENQ.k : ENQ.k.replace(/^f/, "")) : EL ? "e:" + EL : ""; if (!alvo) return;
    var d0 = null; [].forEach.call(cx.querySelectorAll(".pk-pag"), function (cv) { (cv._fotos || []).forEach(function (f) { if (f.k === alvo) { var d = caixaHl(cv, f, "on"); porAlcas(d, cv, f); d0 = d0 || d; } }); });
    if (!d0 || !$("modal").classList.contains("lado")) return;   /* deixa à vista o que está sendo ajustado */
    var r = d0.getBoundingClientRect();
    if (window.innerWidth <= 1060) { var lim = window.innerHeight * 0.42; if (r.top < 50 || r.bottom > lim) window.scrollBy(0, r.top - Math.max(50, (lim - r.height) / 2)); }
    else { var pv = cx.closest(".pk-prev"), pr = pv && pv.getBoundingClientRect(); if (pr && (r.top < pr.top || r.bottom > pr.bottom)) pv.scrollTop += r.top - pr.top - (pr.height - r.height) / 2; }
  }
  function caixaHl(cv, f, cls) {
    var d = document.createElement("i"); d.className = "pk-hl " + cls;
    d.style.left = (cv.offsetLeft + f.x0 * cv.offsetWidth) + "px"; d.style.top = (cv.offsetTop + f.y0 * cv.offsetHeight) + "px";
    d.style.width = ((f.x1 - f.x0) * cv.offsetWidth) + "px"; d.style.height = ((f.y1 - f.y0) * cv.offsetHeight) + "px"; cv.parentNode.appendChild(d); return d;
  }
  /* toque numa página da prévia: lista as fotos (as desta página primeiro) e abre o ajuste certo */
  function fotosPagina(pg) {
    var L = [], cap = IMGS.capa || IMGS.retrato || (IMGS.fotos || [])[0];
    function p(alvo, src, nome) { if (src) L.push({ alvo: alvo, src: src, nome: nome }); }
    var capa = [], pag2 = [], resto = [];
    if (cap) capa.push({ alvo: "capa", src: cap, nome: "Foto da capa — posição e luz" });
    if (IMGS.retrato) { capa.push({ alvo: "retrato", src: IMGS.retrato, nome: "Foto recortada — luz e cor" }); pag2.push({ alvo: "sobre", src: IMGS.retrato, nome: "Foto da página 2 — tamanho e proporção" }); }
    (IMGS.fotos || []).forEach(function (u, i) { if (u) resto.push({ alvo: String(i), src: u, nome: "Galeria · foto " + (i + 1) }); });
    Object.keys(IMGS.cards || {}).forEach(function (l) { (IMGS.cards[l] || []).forEach(function (u, i) { if (u) resto.push({ alvo: "c:" + l + ":" + i, src: u, nome: "Cartão · " + l + " " + (i + 1) }); }); });
    L = pg === 1 ? capa.concat(pag2, resto) : pg === 2 ? pag2.concat(capa, resto) : resto.concat(pag2, capa);
    return L;
  }
  function abrirFotosPagina(pg) {
    var L = fotosPagina(pg);
    if (!L.length) { aviso("Esta página ainda não tem foto"); return; }
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✥ Ajustar uma foto · página ' + pg + '</h3><p class="tf-sub">Toque na foto para mudar o tamanho, a posição, a luz e os efeitos.</p><div class="pk-pf">' +
      L.map(function (f) { return '<button type="button" class="pk-pf-i" data-a="enquadrar" data-alvo="' + esc(f.alvo) + '"><img src="' + f.src + '" alt=""><span>' + esc(f.nome) + "</span></button>"; }).join("") + "</div>");
  }

  /* ✚ ELEMENTOS LIVRES (28/11): textos, ícones, imagens e formas postos em qualquer lugar da página, direto pela prévia.
     Ficam em KIT.livres (na conta, só texto/medidas); a imagem de um elemento fica só no aparelho (IMGS.livres). */
  var EL = null, INS = null, INS_IMG = null;
  var ICONES = ["⭐", "✨", "🎬", "🎤", "📷", "🎥", "🎵", "🎧", "💡", "🏆", "❤️", "👍", "✅", "📍", "📞", "✉️", "🌐", "📅", "🚀", "🔥", "💎", "🎯", "👑", "🎉", "☕", "📌", "🎭", "🎙️", "➜", "✓", "★", "♪", "●", "◆"];
  var ICO_COR = /^[➜✓★♪●◆]$/;
  var ICO_CACHE = {};
  function iconeUrl(ic, cor) {
    var ch = ic + "|" + (ICO_COR.test(ic) ? cor : ""); if (ICO_CACHE[ch]) return ICO_CACHE[ch];
    var c = document.createElement("canvas"); c.width = c.height = 256; var x = c.getContext("2d");
    x.textAlign = "center"; x.textBaseline = "middle"; x.font = "200px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',system-ui,sans-serif"; x.fillStyle = cor || "#E8B54A";
    x.fillText(ic, 128, 140); return (ICO_CACHE[ch] = c.toDataURL("image/png"));
  }
  function livres() { if (!KIT) return []; if (!Array.isArray(KIT.livres)) KIT.livres = []; return KIT.livres; }
  function elDe(id) { return livres().filter(function (x) { return x.id === id; })[0]; }
  /* altura do elemento na página (fração), a mesma conta da prévia e do toque */
  function elAlt(e, W, H) {
    var k = W / 595.28, w = e.w * W;
    if (e.t === "texto") { var fs = (+e.tam || 22) * k, n = 0; String(e.txt || " ").split("\n").forEach(function (l) { n += Math.max(1, Math.ceil(l.length * fs * 0.52 / Math.max(10, w))); }); return n * fs * 1.2 / H; }
    if (e.t === "icone") return w / (+e.prop || 1) / H;
    if (e.t === "imagem") return w / (+e.prop || 1) / H;
    return Math.max(0.004, +e.h || 0.06);
  }
  function elNos(m, pg, W, H) {
    var k = W / 595.28, cores = coresDe(m.kit);
    return (m.livres || []).filter(function (e) { return (+e.pg || 1) === pg; }).map(function (e) {
      var x = e.x * W, y = e.y * H, w = e.w * W, op = (e.op == null ? 100 : +e.op) / 100, ab = { absolutePosition: { x: x, y: y } };
      if (e.t === "texto") return Object.assign({ table: { widths: [w], body: [[{ text: String(e.txt || ""), fontSize: (+e.tam || 22) * k, color: e.cor || cores.destaque || "#E8B54A", bold: !!e.neg, italics: !!e.it, alignment: e.al || "left", font: e.fonte === "tit" ? m.tema.fTit : undefined, lineHeight: 1.08, opacity: op }]] }, layout: semGap("#ffffff", 0) }, ab);
      if ((e.t === "icone" || e.t === "imagem") && e.url) return Object.assign({ image: e.url, width: w, height: w / (+e.prop || 1), opacity: op }, ab);
      if (e.t === "forma") { var hh = Math.max(1, (+e.h || 0.06) * H), cor = e.cor || "#E8B54A", cv;
        if (e.forma === "circ") cv = { type: "ellipse", x: w / 2, y: hh / 2, r1: w / 2, r2: hh / 2, color: cor, fillOpacity: op };
        else if (e.forma === "linha") cv = { type: "line", x1: 0, y1: hh / 2, x2: w, y2: hh / 2, lineWidth: Math.max(1, hh), lineColor: cor, strokeOpacity: op };
        else cv = { type: "rect", x: 0, y: 0, w: w, h: hh, r: e.forma === "pilula" ? hh / 2 : 0, color: cor, fillOpacity: op };
        return Object.assign({ canvas: [cv] }, ab); }
      return null;
    }).filter(Boolean);
  }
  async function elPreparar(m, kit, imgs) {
    var cores = coresDe(kit); m.livres = [];
    for (var i = 0; i < (Array.isArray(kit.livres) ? kit.livres : []).length; i++) {
      var e = Object.assign({}, kit.livres[i]);
      if (e.t === "icone") e.url = iconeUrl(e.ic || "⭐", e.cor || cores.destaque);
      if (e.t === "imagem") { var u = ((imgs || {}).livres || {})[e.id]; if (!u) continue; e.url = u; }
      m.livres.push(e);
    }
  }
  function modoInserir(t) {
    INS = t; var p = $("paginas"); if (p) p.classList.toggle("inserindo", !!t);
    [].forEach.call(document.querySelectorAll("[data-ins]"), function (b) { b.classList.toggle("on", b.getAttribute("data-ins") === t); });
    if (t) { if ($("vEd").getAttribute("data-aba") !== "prev" && window.innerWidth <= 1060) acao("aba", { getAttribute: function () { return "prev"; } }); aviso("Toque na página, no lugar onde vai o " + ({ texto: "texto", icone: "ícone", imagem: "imagem", forma: "elemento" })[t]); }
  }
  function inserirEm(cv, cx, cy) {
    var r = cv.getBoundingClientRect(), fx = (cx - r.left) / r.width, fy = (cy - r.top) / r.height, pg = +cv.getAttribute("data-pg") || 1, cores = coresDe(KIT);
    var id = "el" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), e = { id: id, t: INS, pg: pg, op: 100 };
    if (INS === "texto") Object.assign(e, { txt: "Seu texto aqui", tam: 22, cor: cores.destaque, neg: true, fonte: "tit", al: "left", w: 0.45 });
    else if (INS === "icone") Object.assign(e, { ic: "⭐", w: 0.1, cor: cores.destaque });
    else if (INS === "imagem") { if (!INS_IMG) return; Object.assign(e, { w: 0.32, prop: INS_IMG.prop }); IMGS.livres = IMGS.livres || {}; IMGS.livres[id] = INS_IMG.u; INS_IMG = null; }
    else Object.assign(e, { forma: "ret", w: 0.4, h: 0.012, cor: cores.destaque });
    e.x = Math.max(0, Math.min(1 - e.w, fx - e.w / 2)); e.y = Math.max(0, Math.min(0.97, fy - 0.01));
    livres().push(e); modoInserir(null); guardar(); if (e.t === "imagem") guardarImgs(); agendarPrevia(0); abrirElemento(id);
  }
  function abrirElemento(id) {
    var e = elDe(id); if (!e) return;
    var cores = coresDe(KIT), cor = function (v) { return '<div class="pk-chips pk-lin">' + [["destaque", "Principal"], ["cor2", "Apoio"], ["#FFFFFF", "Branco"], ["#111111", "Preto"]].map(function (c) { var hx = cores[c[0]] || c[0]; return '<button type="button" class="pk-chip" data-a="elCor" data-v="' + hx + '"><i class="pk-bolinha" style="background:' + hx + '"></i>' + c[1] + "</button>"; }).join("") + '<label class="pk-chip">🎨 Outra<input type="color" data-el="cor" value="' + esc(v || "#E8B54A") + '" style="width:26px;height:20px;border:0;background:none;padding:0;margin-left:4px"></label></div>'; };
    var faixa = function (rot, campo, min, max, v, suf) { return '<label class="pk-aj"><span>' + rot + '</span><input type="range" min="' + min + '" max="' + max + '" step="1" data-el="' + campo + '" value="' + v + '"><b>' + v + (suf || "") + "</b></label>"; };
    var chips = function (campo, lista, atual) { return '<div class="pk-chips pk-lin">' + lista.map(function (x) { return '<button type="button" class="pk-chip' + (String(atual) === String(x[0]) ? " on" : "") + '" data-a="elSet" data-c="' + campo + '" data-v="' + esc(x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>"; };
    var tit = { texto: "✎ Texto", icone: "★ Ícone", imagem: "🖼 Imagem", forma: "▬ Forma" }[e.t], h = "";
    if (e.t === "texto") h += '<textarea class="pk-in" data-el="txt" rows="3" maxlength="600">' + esc(e.txt || "") + "</textarea>" +
      '<div class="pk-sub-t">LETRA</div>' + chips("fonte", [["tit", "Títulos"], ["txt", "Texto"]], e.fonte || "tit") + chips("neg", [["1", "<b>Negrito</b>"], ["", "Normal"]], e.neg ? "1" : "") + chips("al", [["left", "⇤ Esquerda"], ["center", "↔ Centro"], ["right", "⇥ Direita"]], e.al || "left") +
      faixa("Aa Tamanho", "tam", 8, 90, +e.tam || 22) + faixa("↔ Largura da caixa", "w", 10, 100, Math.round(e.w * 100), "%") + '<div class="pk-sub-t">COR</div>' + cor(e.cor);
    if (e.t === "icone") h += '<div class="pk-icones">' + ICONES.map(function (ic) { return '<button type="button" class="pk-ico' + (ic === e.ic ? " on" : "") + '" data-a="elSet" data-c="ic" data-v="' + ic + '">' + ic + "</button>"; }).join("") + "</div>" +
      faixa("⤢ Tamanho", "w", 3, 60, Math.round(e.w * 100), "%") + '<div class="pk-sub-t">COR (símbolos ➜ ✓ ★ ♪ ● ◆)</div>' + cor(e.cor);
    if (e.t === "imagem") h += '<div class="pk-chips">' + upload("↺ TROCAR IMAGEM", "livre:" + e.id) + "</div>" + faixa("⤢ Tamanho", "w", 4, 100, Math.round(e.w * 100), "%");
    if (e.t === "forma") h += chips("forma", [["ret", "▬ Faixa"], ["pilula", "⬭ Pílula"], ["circ", "● Círculo"], ["linha", "— Linha"]], e.forma || "ret") +
      faixa("↔ Largura", "w", 2, 100, Math.round(e.w * 100), "%") + faixa("↕ Altura", "h", 1, 60, Math.max(1, Math.round((+e.h || 0.06) * 100)), "%") + '<div class="pk-sub-t">COR</div>' + cor(e.cor);
    h += faixa("◌ Opacidade", "op", 5, 100, e.op == null ? 100 : e.op, "%") +
      '<div class="pk-sub-t">LUGAR</div><p class="tf-sub" style="margin:0 0 6px">Arraste o elemento na prévia para mudar de lugar.</p>' + chips("pos", [["esq", "⇤ Encostar à esquerda"], ["meio", "↔ Centralizar"], ["dir", "⇥ À direita"]], "") +
      (PAGS > 1 ? '<div class="pk-sub-t">PÁGINA</div>' + chips("pg", Array.from({ length: PAGS }, function (_, i) { return [i + 1, "Pág. " + (i + 1)]; }), e.pg || 1) : "") +
      '<div class="pk-chips pk-enq-pe">' + SETAS_HIST + '<button type="button" class="pk-chip" data-a="elDup">⧉ DUPLICAR</button><button type="button" class="pk-chip perigo" data-a="elDel">🗑 APAGAR</button><button type="button" class="bw-btn pri" data-a="fecharModal">✓ PRONTO</button></div>';
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>' + tit + '</h3><div class="pk-el-corpo">' + h + "</div>");
    EL = id; dock(); marcarAtiva();
  }
  var tEl = 0;
  function elMudou(redesenhar) { guardar(); clearTimeout(tEl); tEl = setTimeout(function () { agendarPrevia(0); }, 220); if (redesenhar && EL) abrirElemento(EL); }
  function elSet(c, v) {
    var e = elDe(EL); if (!e) return;
    if (c === "neg") e.neg = !!v; else if (c === "pg") e.pg = +v;
    else if (c === "pos") { e.x = v === "esq" ? 0.06 : v === "dir" ? Math.max(0, 0.94 - e.w) : Math.max(0, (1 - e.w) / 2); }
    else e[c] = v;
    elMudou(c !== "pos");
  }
  function elInput(t) {
    var e = elDe(EL), n = t.getAttribute("data-el"); if (!e) return; var v = t.value;
    if (n === "txt" || n === "cor") e[n] = v; else if (n === "w" || n === "h") e[n] = (+v) / 100; else e[n] = +v;
    if (n === "w") e.x = Math.max(0, Math.min(e.x, 1 - e.w));
    var b = t.parentNode && t.parentNode.querySelector("b"); if (b && t.type === "range") b.textContent = v + (n === "tam" ? "" : "%");
    elMudou(false);
  }
  /* arrastar um elemento direto na prévia (mouse ou dedo) */
  function ligarArrasteElementos() {
    var cx = $("paginas"); if (!cx || cx.__arr) return; cx.__arr = 1; var A = null;
    cx.addEventListener("pointerdown", function (ev) {
      var cv = ev.target.closest && ev.target.closest(".pk-pag"); if (!cv || INS) return; var h = alvoNoPonto(cv, ev.clientX, ev.clientY); if (!h || h.k.indexOf("e:") !== 0) return;
      var e = elDe(h.k.slice(2)); if (!e) return; A = { cv: cv, e: e, f: h.f, px: ev.clientX, py: ev.clientY, x: e.x, y: e.y, mexeu: false, box: null, id: ev.pointerId, alt: !!ev.altKey };
    });
    cx.addEventListener("pointermove", function (ev) {
      if (A) { var dx = ev.clientX - A.px, dy = ev.clientY - A.py; if (!A.mexeu && Math.hypot(dx, dy) < 5) return;
        if (!A.mexeu) { A.mexeu = true; try { cx.setPointerCapture(A.id); } catch (er) { } A.box = caixaHl(A.cv, A.f, "drag");
          if (A.alt) { var cp = duplicarEl(A.e.id, true); if (cp) { A.e = cp; aviso("Alt: arrastando uma cópia"); } } }   /* ALT + arrastar = duplica (o original fica) */
        if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }   /* SHIFT trava na horizontal/vertical */
        var w = A.cv.offsetWidth, hh = A.cv.offsetHeight; A.e.x = Math.max(-0.2, Math.min(1, A.x + dx / w)); A.e.y = Math.max(-0.1, Math.min(1, A.y + dy / hh));
        A.box.style.left = (A.cv.offsetLeft + A.e.x * w) + "px"; A.box.style.top = (A.cv.offsetTop + A.e.y * hh) + "px"; ev.preventDefault(); return; }
      if (ev.pointerType !== "mouse") return;
      var cv = ev.target.closest && ev.target.closest(".pk-pag"), hv = cx.querySelector(".pk-hl.hv"); if (hv) hv.remove();
      if (!cv || INS) return; var h = alvoNoPonto(cv, ev.clientX, ev.clientY); cv.style.cursor = h ? (h.k.indexOf("e:") === 0 ? "move" : "pointer") : "default"; if (h) caixaHl(cv, h.f, "hv");
    });
    var fim = function () { if (!A) return; var a = A; A = null; if (a.box) a.box.remove(); if (a.mexeu) { window.__pkArrastou = Date.now(); guardar(); agendarPrevia(0); } };
    cx.addEventListener("pointerup", fim); cx.addEventListener("pointercancel", fim);
    cx.addEventListener("pointerleave", function () { var hv = cx.querySelector(".pk-hl.hv"); if (hv) hv.remove(); });
    cx.addEventListener("touchmove", function (ev) { if (A && A.mexeu) ev.preventDefault(); }, { passive: false });
  }


  /* ⤢ ALÇAS (28/11, dono: "alterar o tamanho pelo clique e arraste pelas pontas; com SHIFT proporcional, sem tecla livre"):
     no item escolhido da prévia (elemento livre ou a foto da página 2) aparecem 8 alças; puxar muda largura/altura na hora e o PDF se refaz ao soltar. */
  var ALCAS = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  function porAlcas(d, cv, f) {
    if (!d || !(f.k === "sobre" || f.k.indexOf("e:") === 0)) return;
    ALCAS.forEach(function (q) { var h = document.createElement("b"); h.className = "pk-alca " + q; h.setAttribute("data-alca", q); d.appendChild(h); });
    d._cv = cv; d._f = f; d.classList.add("com-alca");
  }
  function ligarAlcas() {
    var cx = $("paginas"); if (!cx || cx.__alca) return; cx.__alca = 1; var R = null;
    cx.addEventListener("pointerdown", function (ev) {
      var h = ev.target.closest && ev.target.closest(".pk-alca"); if (!h) return; var d = h.parentNode; if (!d || !d._cv) return;
      ev.preventDefault(); ev.stopPropagation(); try { cx.setPointerCapture(ev.pointerId); } catch (er) { }
      var f = d._f; R = { q: h.getAttribute("data-alca"), d: d, cv: d._cv, k: f.k, f0: { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 }, px: ev.clientX, py: ev.clientY, n: null };
      window.__bwSegurando = true;
    }, true);
    cx.addEventListener("pointermove", function (ev) {
      if (!R) return; ev.preventDefault(); ev.stopPropagation();
      var W = R.cv.offsetWidth, H = R.cv.offsetHeight, f = R.f0, q = R.q, dx = (ev.clientX - R.px) / W, dy = (ev.clientY - R.py) / H;
      var x0 = f.x0, y0 = f.y0, x1 = f.x1, y1 = f.y1, MIN = 0.02;
      if (q.indexOf("w") >= 0) x0 = Math.min(x1 - MIN, f.x0 + dx); if (q.indexOf("e") >= 0) x1 = Math.max(x0 + MIN, f.x1 + dx);
      if (q.indexOf("n") >= 0) y0 = Math.min(y1 - MIN, f.y0 + dy); if (q.indexOf("s") >= 0) y1 = Math.max(y0 + MIN, f.y1 + dy);
      if (ev.shiftKey) {   /* SHIFT = proporcional: mantém a forma de antes, presa no canto/lado oposto */
        var w0 = (f.x1 - f.x0) * W, h0 = (f.y1 - f.y0) * H, w = (x1 - x0) * W, hh = (y1 - y0) * H, a = w0 / h0, sc;
        var hor = /[we]/.test(q), ver = /[ns]/.test(q);
        sc = hor && ver ? Math.max(w / w0, hh / h0) : hor ? w / w0 : hh / h0; w = w0 * sc; hh = w / a;
        if (hor && !ver) { var cy = (f.y0 + f.y1) / 2; y0 = cy - hh / H / 2; y1 = cy + hh / H / 2; }
        else if (ver && !hor) { var cxm = (f.x0 + f.x1) / 2; x0 = cxm - w / W / 2; x1 = cxm + w / W / 2; }
        if (hor) { if (q.indexOf("w") >= 0) x0 = f.x1 - w / W; else x1 = f.x0 + w / W; }
        if (ver) { if (q.indexOf("n") >= 0) y0 = f.y1 - hh / H; else y1 = f.y0 + hh / H; }
      }
      R.n = { x0: x0, y0: y0, x1: x1, y1: y1, prop: !!ev.shiftKey };
      var st = R.d.style; st.left = (R.cv.offsetLeft + x0 * W) + "px"; st.top = (R.cv.offsetTop + y0 * H) + "px"; st.width = ((x1 - x0) * W) + "px"; st.height = ((y1 - y0) * H) + "px";
    }, true);
    var fim = function (ev) { if (!R) return; var a = R; R = null; window.__bwSegurando = false; window.__pkArrastou = Date.now(); if (ev) ev.stopPropagation(); if (a.n) aplicarAlca(a); };
    cx.addEventListener("pointerup", fim, true); cx.addEventListener("pointercancel", fim, true);
  }
  function aplicarAlca(a) {
    var n = a.n, f = a.f0, cv = a.cv, nw = n.x1 - n.x0, nh = n.y1 - n.y0, razao = nw * cv.width / (nh * cv.height);
    if (a.k === "sobre") {
      var G = formatoKit().G; KIT.est = KIT.est || {}; var dAnt = sobreDim(G);
      var sw = Math.round(Math.max(20, Math.min(62, nw * G.W / G.CW * 100))), sh = Math.round(Math.max(10, Math.min(100, nh * G.H / G.CW * 100)));
      KIT.est.sobW = sw; if (n.prop && KIT.est.sobR && KIT.est.sobR !== "livre") { } else { KIT.est.sobR = "livre"; KIT.est.sobH = sh; }
      if (!(ENQ && ENQ.k === "sobre")) { var dNov = sobreDim(G); IMGS.enq = IMGS.enq || {}; var eS = IMGS.enq.sobre = IMGS.enq.sobre || { x: 0.5, y: 0.5, z: 1 };
        var feito = function () { reenquadrar(eS, dAnt[0], dAnt[1], dNov[0], dNov[1], ENQ_PROP_S, a.q); guardarImgs(); guardar(); agendarPrevia(0); };
        if (ENQ_PROP_S) feito(); else imgDe(IMGS.retrato).then(function (im) { ENQ_PROP_S = im.naturalHeight / im.naturalWidth; feito(); }).catch(feito); }
      if (ENQ && ENQ.k === "sobre") { ENQ.sw = sw; ENQ.sr = KIT.est.sobR; if (KIT.est.sobR === "livre") ENQ.sh = sh;
        [["sw", sw], ["sh", ENQ.sh]].forEach(function (p) { var r = $("modalCx").querySelector('[data-enq="' + p[0] + '"]'); if (r && p[1]) { r.value = p[1]; r.parentNode.querySelector("b").textContent = p[1] + "%"; } });
        var al = $("enqAltLivre"); if (al) al.hidden = ENQ.sr !== "livre";
        [].forEach.call($("modalCx").querySelectorAll('[data-a="enqProp"]'), function (b) { b.classList.toggle("on", b.getAttribute("data-v") === ENQ.sr); }); enqTam(a.q); }
      guardar(); agendarPrevia(0); aviso(KIT.est.sobR === "livre" ? "Foto da página 2: tamanho livre" : "Foto da página 2: tamanho ajustado"); return;
    }
    var e = elDe(a.k.slice(2)); if (!e) return; var hOld = Math.max(0.0001, f.y1 - f.y0);
    e.x = n.x0; e.y = n.y0;
    if (e.t === "forma") { e.w = nw; e.h = nh; }
    else if (e.t === "texto") { if (/[ns]/.test(a.q)) e.tam = Math.max(6, Math.min(120, Math.round((+e.tam || 22) * nh / hOld))); e.w = nw; }
    else { e.w = nw; e.prop = +razao.toFixed(4); }
    if (EL === e.id) abrirElemento(e.id); guardar(); agendarPrevia(0);
  }
  /* ☰ OPÇÕES na prévia: botão direito (PC) ou dois toques (dedo) — o mesmo menu dos editores de foto e vídeo */
  function ligarMenuPrevia() {
    var cx = $("paginas"); if (!cx || cx.__menu || !window.BWFerr) return; cx.__menu = 1;
    BWFerr.toqueDuplo({ pular: "#modal,.pk-form" });
    BWFerr.contexto(cx, ".pk-pag", function (cv, ev) { return menuPrevia(cv, ev.clientX, ev.clientY); });
    document.addEventListener("keydown", function (ev) {
      if ((ev.key === "Delete" || ev.key === "Backspace") && EL && !(BWFerr.digitando && BWFerr.digitando(ev))) { var t = ev.target; if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; ev.preventDefault(); acao("elDel", falsoEl({})); }
    });
  }
  function falsoEl(at) { return { getAttribute: function (n) { return at[n]; } }; }
  function menuPrevia(cv, x, y) {
    window.__pkMenuT = Date.now();
    var h = alvoNoPonto(cv, x, y), pg = +cv.getAttribute("data-pg") || 1, k = h && h.k;
    if (k && k.indexOf("e:") === 0) {
      var id = k.slice(2), e = elDe(id); if (!e) return [];
      var nome = { texto: "TEXTO", icone: "ÍCONE", imagem: "IMAGEM", forma: "FORMA" }[e.t] || "ELEMENTO";
      var mover = function (dir) { return function () { var L = livres(), i = L.indexOf(e); L.splice(i, 1); if (dir > 0) L.push(e); else L.unshift(e); guardar(); agendarPrevia(0); aviso(dir > 0 ? "Na frente ✓" : "Atrás ✓"); }; };
      return { titulo: nome, itens: [
        { icone: "✎", rot: "Editar", fn: function () { if (ENQ) enqFechar(); abrirElemento(id); } },
        { icone: "⧉", rot: "Duplicar", tecla: "", fn: function () { EL = id; acao("elDup", falsoEl({})); } },
        { icone: "⤒", rot: "Trazer para a frente", fn: mover(1) },
        { icone: "⤓", rot: "Mandar para trás", fn: mover(-1) },
        { icone: "↔", rot: "Centralizar na página", fn: function () { e.x = Math.max(0, (1 - e.w) / 2); guardar(); agendarPrevia(0); } },
        e.t === "imagem" || e.t === "icone" ? { icone: "⟲", rot: "Proporção original", fn: function () { if (e.t === "icone") delete e.prop; else { var u = (IMGS.livres || {})[e.id]; if (u) imgDe(u).then(function (im) { e.prop = im.naturalWidth / im.naturalHeight; guardar(); agendarPrevia(0); }); return; } guardar(); agendarPrevia(0); } } : null,
        "-",
        { icone: "🗑", rot: "Apagar", perigo: true, tecla: "Del", fn: function () { EL = id; acao("elDel", falsoEl({})); } }
      ].filter(Boolean) };
    }
    if (k) {
      var it = [
        { icone: "✥", rot: "Enquadrar e ajustar", fn: function () { if (ENQ || EL) enqFechar(); abrirAlvo(k); } }];
      if (k === "sobre") it.push({ icone: "⤢", rot: "Tamanho e proporção", fn: function () { if (ENQ || EL) enqFechar(); ENQ_ABA = "tam"; abrirAlvo("sobre"); } });
      it.push({ icone: "⬇", rot: "Baixar a foto", fn: function () { acao("fotoBaixar", falsoEl({ "data-alvo": k })); } });
      it.push("-", { icone: "⟲", rot: "Remover ajustes da foto", fn: function () {
        if (ENQ) { ENQ = null; $("modal").hidden = true; }
        IMGS.enq = IMGS.enq || {}; delete IMGS.enq[chaveFoto(k)]; if (k === "sobre") { KIT.est = KIT.est || {}; delete KIT.est.sobW; delete KIT.est.sobR; delete KIT.est.sobH; }
        guardarImgs(); guardar(); agendarPrevia(0); marcarAtiva(); aviso("Ajustes removidos"); } });
      return { titulo: k === "capa" ? "FOTO DA CAPA" : k === "sobre" ? "FOTO DA PÁGINA 2" : "FOTO", itens: it };
    }
    var ins = function (t) { return function () { INS = t; inserirEm(cv, x, y); }; };
    return { titulo: "PÁGINA " + pg, itens: [{ tit: "INSERIR AQUI" },
      { icone: "✎", rot: "Texto", fn: ins("texto") }, { icone: "★", rot: "Ícone", fn: ins("icone") }, { icone: "▬", rot: "Forma", fn: ins("forma") },
"-",
      { icone: "✥", rot: "Ajustar as fotos desta página", fn: function () { abrirFotosPagina(pg); } }] };
  }
  /* ---------- SAÍDAS ---------- */
  async function gerarPdf(semBaixar) {
    andamento("Gerando o PDF…");
    try { var m = await modelo(KIT, IMGS, { alta: true }), b = new Blob([await pdfBytes(defPdf(m))], { type: "application/pdf" }); andamento(""); if (!semBaixar) { baixar(b, nomeArq(KIT, "pdf")); aviso("PDF pronto ✓"); } return b; }
    catch (e) { andamento(""); aviso("Não deu para gerar o PDF (sem internet?)", true); return null; }
  }
  async function gerarWord() {
    andamento("Gerando o Word…");
    try { var m = await modelo(KIT, IMGS, { alta: true }), b = await wordBlob(m); andamento(""); baixar(b, nomeArq(KIT, "docx")); aviso("Word pronto ✓ — abre no Word e no Google Docs"); }
    catch (e) { andamento(""); aviso("Não deu para gerar o Word (sem internet?)", true); }
  }
  function textoKit(m) {
    var d = KIT.d, c = d.contato || {}, l = [m.marca, m.slogan, "", d.sobreCurto || "", "", d.sobre || ""];
    (d.links || []).forEach(function (x) { if (x && x.url) l.push((x.rot || "Link") + ": " + x.url); });
    l.push("", "CONTATO", [c.resp, c.cargo].filter(Boolean).join(" — "), c.tel || "", c.email || "", c.site || "", c.insta || "", c.tiktok || "", c.youtube || "");
    return l.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }
  async function gerarZip() {
    andamento("Montando o pacote para imprensa…");
    try {
      await carregar("zip"); var pdf = await gerarPdf(true); if (!pdf) return;
      andamento("Montando o pacote para imprensa…");
      var z = new JSZip(), m = await modelo(KIT, IMGS), base = nomeArq(KIT, "x").replace(/\.x$/, "");
      z.file(base + ".pdf", pdf);
      var add = function (nome, u) { if (u) z.file(nome, binDe(u)); };
      add("logo." + (/^data:image\/png/.test(IMGS.logo || "") ? "png" : "jpg"), IMGS.logo);
      add("fotos/capa.jpg", IMGS.capa); add("fotos/retrato.png", IMGS.retrato);
      (IMGS.fotos || []).forEach(function (u, i) { add("fotos/foto-" + String(i + 1).padStart(2, "0") + "." + (/^data:image\/png/.test(u) ? "png" : "jpg"), u); });
      Object.keys(IMGS.cards || {}).forEach(function (l) { (IMGS.cards[l] || []).forEach(function (u, i) { if (u) add("fotos/cartoes/" + l + "-" + String(i + 1).padStart(2, "0") + "." + (/^data:image\/png/.test(u) ? "png" : "jpg"), u); }); });
      z.file("textos/apresentacao.txt", textoKit(m));
      var r = KIT.d.release || {}; if (String(r.titulo || r.texto || "").trim()) z.file("textos/release.txt", [r.titulo, r.data, "", r.texto].filter(function (x) { return x != null; }).join("\n").trim() + "\n");
      var b = await z.generateAsync({ type: "blob" }); andamento(""); baixar(b, base + "-imprensa.zip"); aviso("Pacote para imprensa pronto ✓");
    } catch (e) { andamento(""); aviso("Não deu para montar o pacote.", true); }
  }
  async function compartilhar() {
    var b = await gerarPdf(true); if (!b) return;
    var f = new File([b], nomeArq(KIT, "pdf"), { type: "application/pdf" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Press kit — " + (KIT.d.marca || "") }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    baixar(b, f.name); aviso("Este aparelho não compartilha arquivos — o PDF foi baixado.");
  }

  /* ---------- MINHA EMPRESA (dados do Gerador de orçamento) ---------- */
  function cfgOrc(id) { try { var l = JSON.parse(localStorage.getItem("bw_neg_prop_config_v1") || "[]"); var c = (Array.isArray(l) ? l : []).filter(function (x) { return x.id === id; })[0]; return c ? c.valor : null; } catch (e) { return null; } }
  function puxarEmpresa() {
    var e = cfgOrc("empresa") || {}, logo = cfgOrc("logo") || "", d = KIT.d, c = d.contato || (d.contato = {}), n = 0;
    var p = function (o, k, v) { if (String(v || "").trim()) { o[k] = String(v).trim(); n++; } };
    p(d, "marca", e.fantasia || e.razao); p(c, "resp", e.resp); p(c, "tel", e.tel); p(c, "email", e.email); p(c, "site", e.site); p(c, "cidade", e.cidade); p(d, "cidade", e.cidade);
    if (logo) { IMGS.logo = logo; guardarImgs(); n++; }
    if (!n) { aviso("Preencha MINHA EMPRESA no Gerador de orçamento primeiro.", true); return; }
    guardar(); desenharForm(); agendarPrevia(0); aviso("Dados da sua empresa aplicados ✓");
  }

  /* ---------- IA (só o texto que a pessoa digitou) ---------- */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  async function ia(sistema, pedido, max) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    try { var r = await fetch(FN_TXT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: sistema, pedido: pedido, max: max || 1400, nivel: "inteligente" }) });
      var j = await r.json().catch(function () { return {}; }); if (!r.ok) return { erro: j.erro || "http_" + r.status }; return j; } catch (e) { return { erro: "rede" }; }
  }
  function jsonDe(t) { t = String(t || "").replace(/```(json)?/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function limpar(t) { return String(t || "").replace(/\*\*|__|^#+\s*/gm, "").trim(); }
  function erroIA(e) { return { sem_login: "Entre na sua conta para usar a IA.", limite: "Limite diário da IA atingido.", ocupada: "A IA está ocupada. Tente em alguns segundos.", rede: "Sem internet agora." }[e] || "A IA não respondeu agora (" + e + ")."; }
  function modal(html) { if (ENQ || EL) { var e0 = ENQ, l0 = EL; if (e0) { enqGravar(); guardarImgs(); guardar(); agendarPrevia(0); } ENQ = null; EL = null; marcarAtiva(); } $("modal").classList.remove("lado"); $("modalCx").classList.remove("enq-app"); $("modalCx").innerHTML = html + JAN_PECAS; $("modal").hidden = false; aplicarJan(); histUi(); var f = $("modalCx").querySelector("textarea,input"); if (f) setTimeout(function () { f.focus(); }, 50); }
  function fecharModal() { if (ENQ || EL) { enqFechar(); return; } $("modal").hidden = true; $("modal").classList.remove("lado"); $("modalCx").innerHTML = ""; }
  var DESFAZER_IA = null;
  function abrirIaSobre() {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>🎙 Conte sobre você</h3><p class="tf-sub">Fale ou escreva do seu jeito, sem se preocupar com a ordem: quem você é, o que faz, há quanto tempo, onde já trabalhou, cursos, habilidades, suas medidas (se for modelo). A IA corrige e coloca cada coisa no lugar certo — <b>não inventa nada</b>.</p>' +
      '<textarea class="pk-in" id="iaTexto" rows="7" maxlength="4000" placeholder="Ex.: sou atriz há 10 anos, comecei no teatro em BH, fiz a série tal na TV, campanha do banco tal, falo inglês e espanhol, canto…"></textarea>' + vozBarra("iaTexto").replace(/<button[^>]*data-a="corrigir"[^>]*>[^<]*<\/button>|<button[^>]*data-a="voltarCampo"[^>]*>[^<]*<\/button>/g, "") +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="iaSobreIr">✨ MONTAR MINHA APRESENTAÇÃO</button></div><p class="bw-msg" id="iaMsg"></p>');
  }
  var LISTAS_IA = { servicos: ["t", "d"], experiencia: ["grupo", "titulo", "papel", "onde", "ano"], formacao: ["ano", "curso", "onde"], perfil: ["k", "v"], numeros: ["v", "r"] };
  async function iaSobre() {
    var txt = ($("iaTexto").value || "").trim(); if (txt.length < 10) { $("iaMsg").textContent = "Fale ou escreva um pouco mais sobre você."; return; }
    pararDit(); $("iaMsg").textContent = "Montando…";
    var d = KIT.d, mod = modeloDe(KIT.modelo), sistema = "Você monta apresentações pessoais (press kit, book, mídia kit, currículo visual) em português do Brasil, em tom claro, confiante e sem exageros. " +
      "O texto pode ter sido DITADO: corrija ortografia, pontuação e vícios de fala. Use SÓ o que a pessoa contou: nunca invente números, trabalhos, clientes, prêmios, datas, medidas ou cidades. Não troque o nome. " +
      "Responda SÓ com JSON, deixando de fora (ou vazio) o que a pessoa não disse: {\"slogan\":\"o que faz, até 10 palavras\",\"curto\":\"frase de destaque até 30 palavras\",\"longo\":\"2 ou 3 parágrafos na primeira pessoa separados por linha em branco, até 170 palavras\"," +
      "\"servicos\":[{\"t\":\"o que faz\",\"d\":\"uma frase\"}],\"experiencia\":[{\"grupo\":\"ex.: TV e publicidade, Eventos, Teatro\",\"titulo\":\"trabalho\",\"papel\":\"função\",\"onde\":\"onde/para quem\",\"ano\":\"\"}],\"formacao\":[{\"ano\":\"\",\"curso\":\"\",\"onde\":\"\"}]," +
      "\"habilidades\":[\"uma por item\"],\"perfil\":[{\"k\":\"ex.: Altura, Idiomas, DRT\",\"v\":\"\"}],\"numeros\":[{\"v\":\"número dito\",\"r\":\"o que ele mostra\"}]}.";
    var r = await ia(sistema, "Nome: " + (d.marca || "") + "\nTipo: " + mod.nome + "\nO que a pessoa contou:\n" + txt, 2200);
    if (r.erro) { $("iaMsg").textContent = erroIA(r.erro); return; }
    var j = jsonDe(r.texto || r.resposta || ""); if (!j || !(j.longo || j.curto || j.servicos || j.experiencia)) { $("iaMsg").textContent = "A IA não respondeu no formato certo. Tente de novo."; return; }
    DESFAZER_IA = { __d: clone(KIT.d), __oc: clone(KIT.ocultas || []) };
    var mostrar = function (id) { KIT.ocultas = (KIT.ocultas || []).filter(function (x) { return x !== id; }); }, n = 0;
    if (j.slogan) { d.slogan = limpar(j.slogan); n++; } if (j.curto) { d.sobreCurto = limpar(j.curto); n++; } if (j.longo) { d.sobre = limpar(j.longo); mostrar("sobre"); n++; }
    Object.keys(LISTAS_IA).forEach(function (l) {
      var v = Array.isArray(j[l]) ? j[l].map(function (x) { var o = {}; LISTAS_IA[l].forEach(function (c) { o[c] = limpar(x && x[c] || ""); }); if (l === "experiencia") o.link = ""; return o; }).filter(function (o) { return LISTAS_IA[l].some(function (c) { return o[c]; }); }) : [];
      if (v.length) { d[l] = v; mostrar(l); n++; }
    });
    if (Array.isArray(j.habilidades) && j.habilidades.length) { d.habilidades = j.habilidades.map(limpar).filter(Boolean).join("\n"); mostrar("habilidades"); n++; }
    KIT.exemplo = false; guardar(); fecharModal(); desenharForm(); agendarPrevia(0);
    aviso("Apresentação montada ✓ — " + n + " partes preenchidas"); mostrarDesfazer();
  }
  function abrirIaRelease() {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Escrever o release com IA</h3><p class="tf-sub">Qual é a novidade? Um lançamento, um evento, um serviço novo, um prêmio… Diga o quê, quando e onde. A IA usa também o que já está no seu press kit.</p>' +
      '<textarea class="pk-in" id="iaTexto" rows="5" maxlength="2000" placeholder="Ex.: lançamos transmissão em 4K para eventos de empresas a partir de dezembro, em BH e região…"></textarea>' +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="iaReleaseIr">✨ ESCREVER O RELEASE</button></div><p class="bw-msg" id="iaMsg"></p>');
  }
  async function iaRelease() {
    var txt = ($("iaTexto").value || "").trim(); if (txt.length < 10) { $("iaMsg").textContent = "Conte qual é a novidade."; return; }
    $("iaMsg").textContent = "Escrevendo…";
    var d = KIT.d, sistema = "Você é assessor de imprensa e escreve releases em português do Brasil no padrão jornalístico (pirâmide invertida: o mais importante no primeiro parágrafo; terceira pessoa; sem adjetivos exagerados). Use SÓ as informações dadas; nunca invente números, falas, datas, preços ou nomes. Não troque o nome da marca. Responda SÓ com JSON: {\"titulo\":\"título jornalístico de até 16 palavras\",\"texto\":\"3 a 4 parágrafos separados por linha em branco, até 260 palavras\"}.";
    var base = ["Nome: " + (d.marca || ""), "Apresentação: " + (d.sobreCurto || ""), "Cidade: " + (d.cidade || "")].join("\n");
    var r = await ia(sistema, base + "\nNovidade contada pela pessoa:\n" + txt);
    if (r.erro) { $("iaMsg").textContent = erroIA(r.erro); return; }
    var j = jsonDe(r.texto || r.resposta || ""); if (!j || !j.texto) { $("iaMsg").textContent = "A IA não respondeu no formato certo. Tente de novo."; return; }
    var rel = d.release || (d.release = {}); DESFAZER_IA = { release: clone(rel) };
    rel.titulo = limpar(j.titulo || rel.titulo || ""); rel.texto = limpar(j.texto);
    if ((KIT.ocultas || []).indexOf("release") >= 0) KIT.ocultas = KIT.ocultas.filter(function (x) { return x !== "release"; });
    KIT.exemplo = false; guardar(); fecharModal(); desenharForm(); agendarPrevia(0);
    aviso("Release escrito ✓ — confira e ajuste"); mostrarDesfazer();
  }
  function mostrarDesfazer() { var b = $("btnDesfazerIA"); if (b) { b.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { b.hidden = true; DESFAZER_IA = null; }, 20000); } }
  function desfazerIA() { if (!DESFAZER_IA || !KIT) return; if (DESFAZER_IA.__d) { KIT.d = DESFAZER_IA.__d; KIT.ocultas = DESFAZER_IA.__oc; } else Object.keys(DESFAZER_IA).forEach(function (k) { KIT.d[k] = DESFAZER_IA[k]; }); DESFAZER_IA = null; $("btnDesfazerIA").hidden = true; guardar(); desenharForm(); agendarPrevia(0); aviso("↺ Voltou ao seu texto"); }

  /* ---------- AÇÕES ---------- */
  function cardPor(l, i, u) { IMGS.cards = IMGS.cards || {}; var arr = IMGS.cards[l] || (IMGS.cards[l] = []); while (arr.length <= i) arr.push(""); arr[i] = u; if (IMGS.enq) delete IMGS.enq["c:" + l + ":" + i]; guardarImgs(); desenharForm(); agendarPrevia(0); }
  /* tirar o item i da lista l leva junto a foto dele e o enquadramento; os de baixo sobem uma casa */
  function cardsTirar(l, i) {
    var arr = (IMGS.cards || {})[l]; if (!arr || !arr.length) return false; arr.splice(i, 1);
    var e = IMGS.enq || {}, n = {}, pre = "c:" + l + ":"; Object.keys(e).forEach(function (k) { if (k.indexOf(pre) !== 0) { n[k] = e[k]; return; } var j = +k.slice(pre.length); if (j < i) n[k] = e[k]; else if (j > i) n[pre + (j - 1)] = e[k]; }); IMGS.enq = n; return true;
  }
  function cardGaleria(l, i) {
    var fs = IMGS.fotos || []; if (!fs.length) { aviso("Ponha fotos na galeria primeiro", true); return; }
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>🖼 Escolha a foto deste cartão</h3><p class="tf-sub">Toque numa foto da sua galeria.</p><div class="pk-cf-gal">' +
      fs.map(function (u, g) { return '<button type="button" data-a="cardDaGal" data-l="' + l + '" data-i="' + i + '" data-g="' + g + '" aria-label="Usar a foto ' + (g + 1) + ' da galeria"><img src="' + u + '" alt=""></button>'; }).join("") + "</div>");
  }
  function mover(arr, i, j) { if (j < 0 || j >= arr.length) return; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
  var NOVOS = { perfil: { k: "", v: "" }, experiencia: { grupo: "", titulo: "", papel: "", onde: "", ano: "", link: "" }, formacao: { ano: "", curso: "", onde: "" }, links: { rot: "", url: "" }, numeros: { v: "", r: "" }, servicos: { t: "", d: "" }, depoimentos: { texto: "", autor: "", cargo: "" }, imprensa: { veiculo: "", titulo: "", data: "", link: "" }, agenda: { data: "", titulo: "", local: "" } };
  async function acao(a, el) {
    var id = el.getAttribute("data-id"), d = KIT && KIT.d;
    if (/^pm/.test(a) || a === "pkVideo" || a === "pkIdioma" || a === "pkLink") { if (window.BWPressKitMais) await BWPressKitMais.acao(a, el); else aviso("Recarregue a página", true); return; }
    if (a === "novo") { mostrar("modelos"); desenharModelos(); }
    else if (a === "voltarLista") { KIT = null; mostrar("lista"); desenharLista(); }
    else if (a === "usarModelo") await criarKit(el.getAttribute("data-m"));
    else if (a === "abrir") await abrirKit(id);
    else if (a === "duplicar") { if (await duplicarKit(id)) { desenharLista(); aviso("Cópia criada ✓"); } }
    else if (a === "duplicarEste") { if (!KIT) return; var nd = await duplicarKit(KIT.id); if (nd) { await abrirKit(nd.id); aviso("Cópia aberta — o original continua guardado"); } }
    else if (a === "excluir") { var k2 = acharKit(id); if (!k2 || !confirm("Excluir o press kit \"" + (k2.nome || "") + "\"? Isso não pode ser desfeito.")) return; gravarLista(lista().filter(function (x) { return x.id !== id; })); await idbDel("imgs", id); await idbDel("thumbs", "kit-" + id); if (window.BWPkNuvem) BWPkNuvem.apagarPasta(id); desenharLista(); aviso("Press kit excluído"); }
    else if (a === "trocarModelo") { var md = modeloDe(el.getAttribute("data-m")); KIT.modelo = md.id; KIT.cor = md.cor; KIT.cor2 = md.cor2; KIT.fonte = md.fonte; KIT.formato = md.formato; KIT.est = {}; guardar(); desenharForm(); agendarPrevia(0); aviso("Modelo " + md.nome + " ✓"); }
    else if (a === "coresModelo") { var m2 = modeloDe(KIT.modelo); KIT.cor = m2.cor; KIT.cor2 = m2.cor2; KIT.fonte = m2.fonte; guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "coresEmpresa") { var e = cfgOrc("empresa") || {}; if (!e.cor) { aviso("Sem cor salva em MINHA EMPRESA (Gerador de orçamento).", true); return; } KIT.cor = e.cor; guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "logoEmpresa") { var lg = cfgOrc("logo"); if (!lg) { aviso("Sem logo salva em MINHA EMPRESA (Gerador de orçamento).", true); return; } IMGS.logo = lg; guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "puxarEmpresa") puxarEmpresa();
    else if (a === "est") { var ec = el.getAttribute("data-c"); KIT.est = KIT.est || {}; KIT.est[ec] = el.getAttribute("data-v"); [].forEach.call(el.parentNode.children, function (b) { b.classList.toggle("on", b === el); }); guardar(); agendarPrevia(80); }
    else if (a === "estPaleta") { var pl = PALETAS[+el.getAttribute("data-i")]; KIT.cor = pl[1]; KIT.cor2 = pl[2]; KIT.est = KIT.est || {}; KIT.est.fundo = pl[3]; guardar(); desenharForm(); agendarPrevia(80); aviso("Paleta " + pl[0] + " ✓"); }
    else if (a === "estZerar") { var mz = modeloDe(KIT.modelo); KIT.est = {}; KIT.cor = mz.cor; KIT.cor2 = mz.cor2; guardar(); desenharForm(); agendarPrevia(80); aviso("Estilo do modelo de volta"); }
    else if (a === "prevFoto") tocarPrevia(el);
    else if (a === "enquadrar") abrirAlvo(el.getAttribute("data-alvo"));
    else if (a === "enqProp") enqProp(el.getAttribute("data-v"));
    else if (a === "enqPronto") enqPronto();
    else if (a === "enqVoltar") enqVoltar();
    else if (a === "ins") modoInserir(INS === el.getAttribute("data-ins") ? null : el.getAttribute("data-ins"));
    else if (a === "elSet") elSet(el.getAttribute("data-c"), el.getAttribute("data-v"));
    else if (a === "elCor") { var eC = elDe(EL); if (eC) { eC.cor = el.getAttribute("data-v"); elMudou(true); } }
    else if (a === "elDup") { var eD = elDe(EL); if (eD) { var n2 = clone(eD); n2.id = "el" + Date.now().toString(36); n2.x = Math.min(0.9, eD.x + 0.03); n2.y = Math.min(0.95, eD.y + 0.03); if (eD.t === "imagem" && IMGS.livres) { IMGS.livres[n2.id] = IMGS.livres[eD.id]; guardarImgs(); } livres().push(n2); EL = null; elMudou(false); abrirElemento(n2.id); aviso("Duplicado ✓"); } }
    else if (a === "elDel") { if (!confirm("Apagar este elemento?")) return; var idD = EL; KIT.livres = livres().filter(function (x) { return x.id !== idD; }); if (IMGS.livres) { delete IMGS.livres[idD]; guardarImgs(); } EL = null; enqFechar(); guardar(); agendarPrevia(0); aviso("Elemento apagado"); }
    else if (a === "enqLook") enqLook(el.getAttribute("data-v"));
    else if (a === "enqAba") { ENQ_ABA = el.getAttribute("data-v"); var mcx = $("modalCx"); [].forEach.call(mcx.querySelectorAll(".pk-enq-aba"), function (b) { b.classList.toggle("on", b === el); }); [].forEach.call(mcx.querySelectorAll(".pk-enqp"), function (p) { p.hidden = p.getAttribute("data-p") !== ENQ_ABA; }); el.scrollIntoView({ block: "nearest", inline: "center" }); }
    else if (a === "enqFx") enqFx(el.getAttribute("data-c"), el.getAttribute("data-v"));
    else if (a === "enqPos") enqPos(el.getAttribute("data-v"));
    else if (a === "tirarImg") { IMGS[el.getAttribute("data-v")] = ""; if (IMGS.origs) delete IMGS.origs[el.getAttribute("data-v")]; if (IMGS.enq) delete IMGS.enq[el.getAttribute("data-v")]; guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "vis") { var s = el.getAttribute("data-s"), oc = KIT.ocultas || (KIT.ocultas = []); if (el.checked) KIT.ocultas = oc.filter(function (x) { return x !== s; }); else if (oc.indexOf(s) < 0) oc.push(s); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "sobe" || a === "desce") { var o = KIT.ordem || (KIT.ordem = TODAS.slice()), i = o.indexOf(el.getAttribute("data-s")); TODAS.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); i = o.indexOf(el.getAttribute("data-s")); mover(o, i, a === "sobe" ? i - 1 : i + 1); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "opcoes") abrirOpcoes(el.getAttribute("data-alvo"));
    else if (a === "opcTocar") opcTocar(el);
    else if (a === "tirarParte") { var sp = el.getAttribute("data-s"), ocp = KIT.ocultas || (KIT.ocultas = []); if (ocp.indexOf(sp) < 0) ocp.push(sp); ULT_TIRADA = sp; guardar(); desenharForm(); agendarPrevia(0); aviso("Parte tirada — ↺ DEVOLVER no topo"); }
    else if (a === "devolverParte") { KIT.ocultas = (KIT.ocultas || []).filter(function (x) { return x !== ULT_TIRADA; }); ULT_TIRADA = ""; guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "addItem") { var l = el.getAttribute("data-l"); (d[l] || (d[l] = [])).push(clone(NOVOS[l])); guardar(); desenharForm(); var c = $("form").querySelectorAll('[data-k^="d.' + l + '."]'); if (c.length) { var alvo = c[c.length - Object.keys(NOVOS[l]).length]; if (alvo) alvo.focus(); } }
    else if (a === "tirarItem") { var tl0 = el.getAttribute("data-l"), ti0 = +el.getAttribute("data-i"); d[tl0].splice(ti0, 1); if (cardsTirar(tl0, ti0)) guardarImgs(); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "cardTira") { var ct = (IMGS.cards || {})[el.getAttribute("data-l")]; if (ct) ct[+el.getAttribute("data-i")] = ""; if (IMGS.enq) delete IMGS.enq["c:" + el.getAttribute("data-l") + ":" + el.getAttribute("data-i")]; guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "cardGal") cardGaleria(el.getAttribute("data-l"), +el.getAttribute("data-i"));
    else if (a === "cardDaGal") { var u0 = (IMGS.fotos || [])[+el.getAttribute("data-g")]; if (!u0) return; fecharModal(); cardPor(el.getAttribute("data-l"), +el.getAttribute("data-i"), u0); aviso("Foto do cartão ✓"); }
    else if (a === "fotoTira") { IMGS.origs = Object.keys(IMGS.origs || {}).filter(function (x) { return x[0] !== "f"; }).reduce(function (o, x) { o[x] = IMGS.origs[x]; return o; }, {}); enqTirarFoto(+el.getAttribute("data-i")); IMGS.fotos.splice(+el.getAttribute("data-i"), 1); guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "fotoEsq" || a === "fotoDir") { var fi = +el.getAttribute("data-i"), oo = IMGS.origs || {}, ja = oo["f" + fi], jb = oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)]; if (ja || jb) { delete oo["f" + fi]; delete oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)]; if (ja) oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)] = ja; if (jb) oo["f" + fi] = jb; } if ((a === "fotoEsq" ? fi - 1 : fi + 1) >= 0 && (a === "fotoEsq" ? fi - 1 : fi + 1) < IMGS.fotos.length) enqTrocar("f" + fi, "f" + (a === "fotoEsq" ? fi - 1 : fi + 1)); mover(IMGS.fotos, fi, a === "fotoEsq" ? fi - 1 : fi + 1); guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "limparExemplo") {
      if (!confirm("Apagar todos os textos e fotos do exemplo e começar do zero? O modelo e as cores continuam.")) return;
      var vazio = base({ etiqueta: KIT.d.etiqueta || "APRESENTAÇÃO PESSOAL" }); (modeloDe(KIT.modelo).ordem || []).forEach(function (id) { if (NOVOS[id]) vazio[id] = [clone(NOVOS[id])]; });
      KIT.d = vazio; KIT.exemplo = false; KIT.nome = "Minha apresentação"; DIT.antes = {}; IMGS = imgsVazias(); guardarImgs(); guardar(); desenharForm(); agendarPrevia(0); aviso("Exemplo apagado — agora é com você");
    }
    else if (a === "pdf") gerarPdf();
    else if (a === "word") gerarWord();
    else if (a === "zip") gerarZip();
    else if (a === "compartilhar") compartilhar();
    else if (a === "iaSobre") abrirIaSobre();
    else if (a === "iaSobreIr") iaSobre();
    else if (a === "iaRelease") abrirIaRelease();
    else if (a === "iaReleaseIr") iaRelease();
    else if (a === "desfazerIA") desfazerIA();
    else if (a === "desfazer") voltarHist(-1);
    else if (a === "refazer") voltarHist(1);
    else if (a === "falar") falar(el.getAttribute("data-alvo"));
    else if (a === "fotoIA") { var px = FOTO_IA.filter(function (x) { return x.id === el.getAttribute("data-p"); })[0]; if (!$("modal").hidden) fecharModal(); if (px) fotoIA(el.getAttribute("data-alvo"), px.p); }
    else if (a === "fotoBaixar" || a === "fotoIAbaixar") { var alv = String(el.getAttribute("data-alvo")), pcs = alv.split(":"), ub = alv === "logo" ? IMGS.logo : alv.indexOf("c:") === 0 ? ((IMGS.cards || {})[pcs[1]] || [])[+pcs[2]] : srcFoto(alv); if (!ub) return; var ehIA = !!(IMGS.origs && IMGS.origs[chaveFoto(alv)]), bb = new Blob([binDe(ub)], { type: (/^data:([^;]+)/.exec(ub) || [0, "image/jpeg"])[1] }); baixar(bb, nomeArq(KIT, "").replace(/\.$/, "") + (ehIA ? "-foto-ia-" : "-foto-") + alv.replace(/[^a-z0-9]/gi, "") + (/png/.test(bb.type) ? ".png" : ".jpg")); aviso(ehIA ? "⬇ Foto da IA baixada" : "⬇ Foto baixada"); }
    else if (a === "fotoIAbaixar_antigo") { var ub = srcFoto(el.getAttribute("data-alvo")); if (!ub) return; var bb = new Blob([binDe(ub)], { type: (/^data:([^;]+)/.exec(ub) || [0, "image/jpeg"])[1] }); baixar(bb, nomeArq(KIT, "") .replace(/\.$/, "") + "-foto-ia-" + String(el.getAttribute("data-alvo")).replace(/[^a-z0-9]/gi, "") + (/png/.test(bb.type) ? ".png" : ".jpg")); aviso("⬇ Foto da IA baixada"); }
    else if (a === "fotoIAfora") fotoIAfora(el.getAttribute("data-alvo"));
    else if (a === "fotoIAforaP") fotoIAfora(el.getAttribute("data-alvo"), el.getAttribute("data-p"));
    else if (a === "fotoIAforaCopiar") { var tf = $("iaForaTexto"); if (tf) { try { navigator.clipboard.writeText(tf.value).then(function () { aviso("⧉ Pedido copiado"); }, function () { tf.select(); aviso("Selecionado — copie com Ctrl+C", true); }); } catch (e) { tf.select(); } } }
    else if (a === "fotoIAvolta") { if (!$("modal").hidden) fecharModal(); fotoIAvolta(el.getAttribute("data-alvo")); }
    else if (a === "fotoIAlivre") fotoIAlivre(el.getAttribute("data-alvo"));
    else if (a === "fotoIAmenu") fotoIAmenu(el.getAttribute("data-i"));
    else if (a === "fotoIAlivreIr") { var tl = ($("iaFotoTexto").value || "").trim(); if (tl.length < 4) { aviso("Diga o que mudar na foto", true); return; } pararDit(); fecharModal(); fotoIA(el.getAttribute("data-alvo"), "Edit only this (request in Portuguese): " + tl); }
    else if (a === "corrigir") corrigirCampo(el.getAttribute("data-alvo"));
    else if (a === "voltarCampo") voltarCampo(el.getAttribute("data-alvo"));
    else if (a === "servFotos") { KIT.servFotos = !!el.checked; guardar(); agendarPrevia(0); }
    else if (a === "fecharModal") fecharModal();
    else if (a === "aba") { var v = el.getAttribute("data-v"); $("vEd").setAttribute("data-aba", v); [].slice.call(document.querySelectorAll(".pk-aba")).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === v)); }); if (v === "prev") agendarPrevia(0); window.scrollTo(0, 0); }
  }
  async function aoEscolherArquivo(inp) {
    var alvo = inp.getAttribute("data-up"), fs = [].slice.call(inp.files || []); if (!fs.length || !KIT) return;
    andamento("Lendo a imagem…");
    try {
      if (alvo === "logo") IMGS.logo = await arquivoParaUrl(fs[0], 1600, true);
      else if (alvo === "retrato") { IMGS.retrato = await arquivoParaUrl(fs[0], 1800, true); if (IMGS.origs) delete IMGS.origs.retrato; if (IMGS.enq) delete IMGS.enq.retrato; }
      else if (alvo === "capa") { IMGS.capa = await arquivoParaUrl(fs[0], 2400, false); if (IMGS.origs) delete IMGS.origs.capa; if (IMGS.enq) delete IMGS.enq.capa; }
      else if (alvo.indexOf("ia:") === 0) { var ax = alvo.slice(3), kx = chaveFoto(ax), ant = srcFoto(ax); if (!ant) { andamento(""); return; } var ux = await arquivoParaUrl(fs[0], ax === "retrato" ? 1800 : 2400, ax === "retrato"); IMGS.origs = IMGS.origs || {}; if (!IMGS.origs[kx]) IMGS.origs[kx] = ant; if (ax === "retrato" || ax === "capa") IMGS[ax] = ux; else IMGS.fotos[+ax] = ux; KIT.exemplo = false; andamento(""); if (!$("modal").hidden) fecharModal(); guardarImgs(); desenharForm(); agendarPrevia(0); aviso("✨ Foto da sua IA no lugar — ↺ ORIGINAL volta"); try { inp.value = ""; } catch (e) { } return; }
      else if (alvo === "livre" || alvo.indexOf("livre:") === 0) { var ul = await arquivoParaUrl(fs[0], 1600, true), pr = await proporcao(ul); andamento(""); try { inp.value = ""; } catch (e) { }
        if (alvo === "livre") { INS_IMG = { u: ul, prop: pr }; modoInserir("imagem"); }
        else { var idL = alvo.slice(6), eL = elDe(idL); IMGS.livres = IMGS.livres || {}; IMGS.livres[idL] = ul; if (eL) eL.prop = pr; guardarImgs(); guardar(); agendarPrevia(0); aviso("Imagem trocada ✓"); }
        return; }
      else if (alvo.indexOf("card:") === 0) { var pc = alvo.split(":"); var uc = await arquivoParaUrl(fs[0], 1400, false); andamento(""); cardPor(pc[1], +pc[2], uc); aviso("Foto do cartão ✓"); try { inp.value = ""; } catch (e) { } return; }
      else { for (var i = 0; i < fs.length && IMGS.fotos.length < 7; i++) IMGS.fotos.push(await arquivoParaUrl(fs[i], 2000, false)); }
      andamento(""); guardarImgs(); desenharForm(); agendarPrevia(0); aviso(alvo === "fotos" ? "Fotos na galeria ✓" : alvo === "logo" ? "Logo aplicada ✓" : alvo === "retrato" ? "Foto recortada aplicada ✓" : "Foto da capa aplicada ✓");
    } catch (e) { andamento(""); aviso("Não deu para abrir essa imagem. Tente outra (JPG ou PNG).", true); }
    try { inp.value = ""; } catch (e) { }
  }

  function iniciar() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-a]"); if (!b || b.tagName === "INPUT" || !b.closest(".wrap, #modal")) return; PK_XY = { x: e.clientX, y: e.clientY };
      if (b.disabled) return; e.preventDefault(); acao(b.getAttribute("data-a"), b);
    });
    document.addEventListener("change", function (e) {
      var t = e.target; if (!t || !t.getAttribute) return;
      if (t.hasAttribute("data-up")) { aoEscolherArquivo(t); return; }
      if (t.getAttribute("data-a") === "vis" || t.getAttribute("data-a") === "servFotos") { acao(t.getAttribute("data-a"), t); return; }
      if (t.hasAttribute("data-k")) aoDigitar(e);
    });
    document.addEventListener("input", function (e) { var t = e.target; if (t && t.hasAttribute && t.hasAttribute("data-el")) elInput(t); });
    document.addEventListener("input", function (e) {
      var t = e.target; if (!t || !t.hasAttribute || !t.hasAttribute("data-k")) return;
      if (t.hasAttribute("data-mostra")) { var b = t.parentNode.querySelector("b"); if (b) b.textContent = t.value + "%"; }
      aoDigitar(e);   /* cor também muda ao vivo (a prévia espera a pessoa parar de arrastar) */
    });
    $("edNome").addEventListener("input", function () { if (KIT) { KIT.nome = this.value; guardar(); } });
    $("edTrocar").addEventListener("change", async function () { var v = this.value; if (!KIT || !v || v === KIT.id) return; await guardarAgora(); if (v === "__novo") { KIT = null; mostrar("modelos"); desenharModelos(); } else await abrirKit(v); });
    $("modal").addEventListener("click", function (e) { if (e.target === this && Date.now() - (window.__pkJanT || 0) > 400) fecharModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && INS) { modoInserir(null); return; } if (e.key === "Escape" && !$("modal").hidden) fecharModal(); });
    ligarArrasteElementos(); ligarAlcas(); ligarMenuPrevia(); ligarJanelas();
    document.addEventListener("pointerdown", function (ev) { window.__pkTipo = ev.pointerType; }, true);
    document.addEventListener("keydown", atalhosPk);
    var t; window.addEventListener("resize", function () { altEd(); clearTimeout(t); t = setTimeout(function () { if (VISTA === "editor") agendarPrevia(200); }, 300); });
    /* dados que chegam de outro aparelho: só redesenha a lista (o editor aberto não é atropelado) */
    window.addEventListener("bw-dados", function () { if (VISTA === "lista") desenharLista(); });
    var q = new URLSearchParams(location.search), k = q.get("k"), mdl = q.get("modelo");
    if (k && acharKit(k)) abrirKit(k);
    else if (mdl && MODELOS.some(function (m) { return m.id === mdl; })) criarKit(mdl);
    else { mostrar("lista"); desenharLista(); }
  }
  window.BWPressKit = { imgsAtual: function () { return IMGS; }, lista: lista, acharKit: acharKit, salvarKit: salvarKit, abrirKit: abrirKit, duplicarKit: duplicarKit, guardarAgora: guardarAgora,
    coresDe: coresDe, ia: ia, jsonDe: jsonDe, erroIA: erroIA, modal: modal, fecharModal: fecharModal, aviso: aviso, andamento: andamento, baixar: baixar, nomeArq: nomeArq, reduzir: reduzir,
    titulo: titulo, linkDe: linkDe, secoes: SECOES, visiveis: function (k) { k = k || KIT; var o = (k.ordem || TODAS).filter(function (id) { return SECOES[id] && (k.ocultas || []).indexOf(id) < 0; }); TODAS.forEach(function (id) { if (o.indexOf(id) < 0 && (k.ocultas || []).indexOf(id) < 0) o.push(id); }); return o; },
    /* 28/11: as fotos como saem no PDF (enquadradas, com luz/cor e efeitos), para o vídeo e para o link público */
    imagensPub: async function (k, im) {
      k = k || KIT; im = im || IMGS; var EQ = im.enq || {}, CR = coresDe(k), capaSrc = im.capa || im.retrato || (im.fotos || [])[0] || "", out = { fotos: [], cards: {} };
      if (capaSrc) out.capa = await recortar(capaSrc, 1080, 1350, enqOpC(CR, EQ.capa, { q: 0.86 }));
      if (im.retrato) out.retrato = await reduzir(EQ.retrato && temAj(EQ.retrato.aj) ? await ajustarImg(im.retrato, EQ.retrato.aj) : im.retrato, 1100);
      if (im.logo) out.logo = await reduzir(im.logo, 700);
      for (var i = 0; i < (im.fotos || []).length; i++) out.fotos.push(await recortar(im.fotos[i], 1400, 1050, enqOpC(CR, EQ["f" + i], { q: 0.84 })));
      Object.keys(im.cards || {}).forEach(function (l) { out.cards[l] = []; });
      for (var l in (im.cards || {})) { var arr = im.cards[l] || []; for (var j = 0; j < arr.length; j++) out.cards[l].push(arr[j] ? await recortar(arr[j], 960, 600, enqOpC(CR, EQ["c:" + l + ":" + j], { q: 0.84 })) : ""); }
      return out;
    }, gerarPdfBytes: async function () { await guardarAgora(); return await pdfBytes(defPdf(await modelo(KIT, IMGS, { alta: true }))); }, idbGet: idbGet, idbPut: idbPut, sessao: sessao, recortar: recortar,  modelos: MODELOS, modelo: modelo, defPdf: defPdf, kitNovo: kitNovo, imgsExemplo: imgsExemplo, atual: function () { return KIT; }, previa: desenharPrevia, pdfTexto: async function () { var b = await pdfBytes(defPdf(await modelo(KIT, IMGS))), J = await pdfjs(), d = await J.getDocument({ data: b, isEvalSupported: false }).promise, t = ""; for (var i = 1; i <= d.numPages; i++) t += (await (await d.getPage(i)).getTextContent()).items.map(function (x) { return x.str; }).join(" ") + "\n"; d.destroy(); return t; }, paginas: function () { return PAGS; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
