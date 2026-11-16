/* EDITOR DE FOTOS 2.0 (16/11/2026, Claude) — tudo roda no aparelho (canvas). Nada vai para a nuvem (regra 24 / vigia 7.8a).
   Preferências em ui_* (localStorage) e o kit MINHA MARCA no IndexedDB do aparelho (exportável em .json). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function lerUi(k, p) { try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? p : v; } catch (e) { return p; } }
  function gravarUi(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function uid(p) { return (p || "i") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600); }

  (async function () {   // selo LOGADO no topo
    var el = $("userBox"); if (!el) return;
    try { var sb = window.BWSync && BWSync.cliente(); var s = sb ? await sb.auth.getSession() : null; var u = s && s.data && s.data.session && s.data.session.user;
      el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; } catch (e) { }
  })();

  /* ================= CONFIGURAÇÕES ================= */
  var AJ = [["exposicao", "Exposição", -100, 100], ["contraste", "Contraste", -100, 100], ["realces", "Realces", -100, 100], ["sombras", "Sombras", -100, 100],
    ["temperatura", "Temperatura", -100, 100], ["saturacao", "Saturação", -100, 100], ["desbotar", "Desbotar", 0, 100], ["nitidez", "Nitidez", 0, 100], ["vinheta", "Vinheta", 0, 100]];
  var FILTROS = {
    original: { nome: "ORIGINAL", p: {} },
    cinema: { nome: "CINEMA", p: { contraste: 15, saturacao: -10, temperatura: 5, vinheta: 25 }, split: { s: [0, 70, 90], sf: .22, h: [255, 170, 90], hf: .14 } },
    pb: { nome: "P&B EVENTO", p: { saturacao: -100, contraste: 25, sombras: -10, vinheta: 15 } },
    pbsuave: { nome: "P&B SUAVE", p: { saturacao: -100, contraste: -10, desbotar: 25 } },
    palco: { nome: "PALCO", p: { contraste: 22, sombras: -18, realces: 8, saturacao: 18, vinheta: 35 } },
    dourado: { nome: "DOURADO", p: { temperatura: 18, contraste: 10, saturacao: 5 }, split: { s: [40, 30, 20], sf: .1, h: [255, 181, 71], hf: .18 } },
    quente: { nome: "QUENTE", p: { temperatura: 35, saturacao: 10, exposicao: 5 } },
    frio: { nome: "FRIO", p: { temperatura: -30, contraste: 5 } },
    vibrante: { nome: "VIBRANTE", p: { saturacao: 35, contraste: 12 } },
    suave: { nome: "SUAVE", p: { contraste: -18, desbotar: 18, realces: -10, saturacao: -8 } },
    retro: { nome: "RETRÔ", p: { desbotar: 30, temperatura: 25, saturacao: -20, vinheta: 30 }, split: { s: [40, 60, 80], sf: .12, h: [255, 220, 150], hf: .16 } },
    noite: { nome: "NOITE", p: { temperatura: -15, contraste: 18, sombras: -12, saturacao: -15, vinheta: 30 }, split: { s: [10, 30, 70], sf: .2, h: [240, 230, 220], hf: .05 } }
  };
  var FORMATOS = [["original", "ORIGINAL", 0], ["4:5", "FEED 4:5", 4 / 5], ["1:1", "QUADRADO", 1], ["9:16", "STORY 9:16", 9 / 16], ["16:9", "16:9", 16 / 9],
    ["yt", "CAPA YOUTUBE", 16 / 9, [1280, 720]], ["3:2", "FOTO 3:2", 3 / 2], ["2:3", "FOTO 2:3", 2 / 3]];
  var TAMANHOS = [["insta", "REDES (1080)"], ["alta", "ALTA (2048)"], ["max", "MÁXIMA (4096)"]];
  var FONTES = [["Inter", "INTER", 700], ["Montserrat", "MONTSERRAT", 800], ["Bebas Neue", "BEBAS", 400], ["Oswald", "OSWALD", 500], ["Playfair Display", "PLAYFAIR", 700], ["Pacifico", "Pacifico", 400], ["Michroma", "MICHROMA", 400]];
  var BORDAS = [["nenhuma", "SEM BORDA"], ["solida", "MOLDURA"], ["dupla", "DUPLA"], ["polaroid", "POLAROID"], ["faixa", "FAIXA"], ["cinema", "CINEMA"], ["cantos", "CANTOS"], ["sombra", "SOMBRA"]];
  var POS9 = [["tl", 0, 0], ["tc", .5, 0], ["tr", 1, 0], ["ml", 0, .5], ["mc", .5, .5], ["mr", 1, .5], ["bl", 0, 1], ["bc", .5, 1], ["br", 1, 1]];
  var CORES_BASE = ["#ffffff", "#000000", "#F5F1EA", "#FFB547", "#06080D", "#1C97A6"];
  var PADRAO = {
    formato: "original", encaixe: "cortar", encaixeCor: "#06080D", aj: {}, filtro: "original", intens: 100,
    logo: { on: false, id: "", pos: "br", cor: "auto", tam: 18, op: 90, mar: 4, x: null, y: null },
    borda: { est: "nenhuma", esp: 4, raio: 0, cor: "#ffffff", cor2: "#FFB547", txt: "", png: "" },
    textos: [], vars: { evento: "" },
    car: { n: 0, parte: "4:5" },
    saida: { tam: "alta", qual: 90, nome: "{evento}-{n}", fmt: "jpg" }
  };
  function normalizar(g) {
    var o = Object.assign(clone(PADRAO), clone(g || {}));
    ["logo", "borda", "saida", "vars", "car"].forEach(function (k) { o[k] = Object.assign(clone(PADRAO[k]), (g && g[k]) || {}); });
    o.aj = Object.assign({}, (g && g.aj) || {}); o.textos = Array.isArray(o.textos) ? o.textos : [];
    if (!FILTROS[o.filtro]) o.filtro = "original";
    return o;
  }
  var G = normalizar(lerUi("ui_fotos_ultimo", {}));
  var FOTOS = [], ATUAL = -1, ABA = "foto", ESCOPO = "todas", TXT = null, COMPARAR = false, DIV = 0.5;
  var LOGOS = {}, MOLDS = {};   // id -> HTMLImageElement
  function fotoNova(file, im) {
    return { file: file, nome: file.name.replace(/\.[^.]+$/, ""), prev: reduzir(im, 1400), w: im.naturalWidth, h: im.naturalHeight,
      rot: 0, incl: 0, esp: false, cx: 0, cy: 0, zoom: 100, aj: {}, filtro: null, fundo: { modo: "nenhum", cor: "#ffffff", blur: 18 }, mask: null };
  }

  /* ================= MINHA MARCA (IndexedDB do aparelho) ================= */
  var KIT = { empresa: "", arroba: "", site: "", cores: ["#FFB547", "#06080D", "#F5F1EA"], logos: [], molduras: [], textos: [], padroes: [], bordas: [] };
  var idb = null;
  function abrirDB() {
    if (idb) return Promise.resolve(idb);
    return new Promise(function (ok, erro) {
      if (!window.indexedDB) return erro(new Error("sem IndexedDB"));
      var r = indexedDB.open("bw_fotos_marca", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kit"); };
      r.onsuccess = function () { idb = r.result; ok(idb); }; r.onerror = function () { erro(r.error); };
    });
  }
  async function lerKit() {
    try { var db = await abrirDB(); var v = await new Promise(function (ok) { var q = db.transaction("kit").objectStore("kit").get("kit"); q.onsuccess = function () { ok(q.result); }; q.onerror = function () { ok(null); }; });
      if (v) KIT = Object.assign(KIT, v); } catch (e) { }
    ["cores", "logos", "molduras", "textos", "padroes", "bordas"].forEach(function (k) { if (!Array.isArray(KIT[k])) KIT[k] = []; });
  }
  async function gravarKit() {
    try { var db = await abrirDB(); await new Promise(function (ok, erro) { var t = db.transaction("kit", "readwrite"); t.objectStore("kit").put(clone(KIT), "kit"); t.oncomplete = ok; t.onerror = function () { erro(t.error); }; }); return true; }
    catch (e) { toast("Não deu para guardar no aparelho (espaço cheio?)."); return false; }
  }
  function carregarImgs() {
    var ps = [];
    KIT.logos.forEach(function (l) { if (!LOGOS[l.id] || LOGOS[l.id].src !== l.url) { ps.push(imgDeUrl(l.url).then(function (im) { LOGOS[l.id] = im; tingidas = {}; })); } });
    KIT.molduras.forEach(function (m) { if (!MOLDS[m.id] || MOLDS[m.id].src !== m.url) { ps.push(imgDeUrl(m.url).then(function (im) { MOLDS[m.id] = im; })); } });
    return Promise.all(ps.map(function (p) { return p.catch(function () { }); }));
  }
  function imgDeUrl(url) { return new Promise(function (ok, erro) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = erro; im.src = url; }); }
  async function migrarAntigo() {   // editor 1.0 guardava logo e padrões no localStorage
    var mudou = false;
    try { var d = localStorage.getItem("ui_fotos_logo"); if (d && !KIT.logos.length) { KIT.logos.push({ id: uid("lg"), nome: "Logo", url: d }); mudou = true; } } catch (e) { }
    var ps = lerUi("ui_fotos_padroes", []);
    if (ps.length && !KIT.padroes.length) { ps.forEach(function (p) { KIT.padroes.push({ id: uid("pd"), nome: p.nome, g: p.o }); }); mudou = true; }
    if (mudou) { await gravarKit(); try { localStorage.removeItem("ui_fotos_logo"); localStorage.removeItem("ui_fotos_padroes"); } catch (e) { } }
  }
  function logoAtual() { var id = G.logo.id; if (!LOGOS[id]) { id = KIT.logos[0] && KIT.logos[0].id; } return id ? LOGOS[id] : null; }

  /* ================= ABRIR FOTOS ================= */
  function carregarScript(src) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); }); }
  function decodificar(blob) {
    return new Promise(function (ok, erro) {
      var url = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { ok(im); setTimeout(function () { URL.revokeObjectURL(url); }, 1000); };
      im.onerror = function () { URL.revokeObjectURL(url); erro(new Error("decod")); };
      im.src = url;
    });
  }
  async function abrirImagem(f) {
    try { return await decodificar(f); }
    catch (e) {
      if (/heic|heif/i.test(f.type + f.name)) {
        if (!window.heic2any) await carregarScript("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js");
        var b = await window.heic2any({ blob: f, toType: "image/jpeg", quality: 0.95 }); return decodificar(Array.isArray(b) ? b[0] : b);
      }
      throw e;
    }
  }
  function reduzir(img, lado) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height, s = Math.min(1, lado / Math.max(W, H));
    var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(W * s)); c.height = Math.max(1, Math.round(H * s));
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height); return c;
  }
  async function adicionar(files, abrir) {
    files = [].filter.call(files || [], function (f) { return /^image\//.test(f.type) || /\.(heic|heif)$/i.test(f.name); });
    if (!files.length) return;
    for (var i = 0; i < files.length; i++) {
      $("lista").insertAdjacentHTML("beforeend", '<span id="carregando" class="tf-nota" style="margin:0;align-self:center">abrindo ' + (i + 1) + "/" + files.length + "…</span>");
      try { var im = await abrirImagem(files[i]); FOTOS.push(fotoNova(files[i], im)); }
      catch (e) { toast("Não deu para abrir " + files[i].name + "."); }
      var c = $("carregando"); if (c) c.remove();
    }
    if (ATUAL < 0 && FOTOS.length) ATUAL = 0;
    desenharLista();
    if (abrir !== false && FOTOS.length) abrirEditor(); else if (!$("ed").hidden) { desenharTiras(); painel(); agendar(); }
  }
  function miniUrl(f) { if (!f.mini) f.mini = reduzir(f.prev, 120).toDataURL("image/jpeg", 0.6); return f.mini; }
  function desenharLista() {
    $("lista").innerHTML = FOTOS.map(function (f) { return '<img alt="" src="' + miniUrl(f) + '">'; }).join("");
    $("abrirEd").hidden = !FOTOS.length;
    $("abrirEd").textContent = "ABRIR O EDITOR · " + FOTOS.length + " FOTO" + (FOTOS.length > 1 ? "S" : "");
  }
  function desenharTiras() {
    if (FOTOS.length < 2) { $("edFotos").innerHTML = ""; return; }
    $("edFotos").innerHTML = (FOTOS.length > 1 ? FOTOS.map(function (f, i) { return '<button type="button" data-i="' + i + '" class="' + (i === ATUAL ? "on" : "") + '" aria-label="Foto ' + (i + 1) + '"><img alt="" src="' + miniUrl(f) + '"></button>'; }).join("") : "") +
      '<button type="button" id="maisFotos" aria-label="Adicionar fotos" title="Adicionar fotos" style="border:1.5px dashed rgba(255,181,71,.5);color:var(--bw-ambar);font-size:20px">+</button>';
  }

  /* ================= PROCESSAMENTO DE COR ================= */
  function efetivo(f, sem) {
    var a = {}; if (sem) { AJ.forEach(function (x) { a[x[0]] = 0; }); a.split = null; return a; }
    var fk = (f && f.filtro) || G.filtro, flt = FILTROS[fk] || FILTROS.original, k = G.intens / 100;
    AJ.forEach(function (x) { a[x[0]] = lim((G.aj[x[0]] || 0) + ((f && f.aj[x[0]]) || 0) + (flt.p[x[0]] || 0) * k, x[2], x[3] + 60); });
    a.split = flt.split ? { s: flt.split.s, sf: flt.split.sf * k, h: flt.split.h, hf: flt.split.hf * k } : null;
    return a;
  }
  function lutTom(a) {
    var L = new Uint8ClampedArray(256), ex = Math.pow(2, a.exposicao / 100), ct = a.contraste >= 0 ? 1 + a.contraste / 60 : 1 + a.contraste / 130, fd = a.desbotar * 0.6;
    for (var v = 0; v < 256; v++) {
      var x = v * ex; x = (x - 128) * ct + 128;
      var n = Math.max(0, Math.min(1, x / 255));
      x += a.sombras / 100 * 70 * Math.pow(1 - n, 2) + a.realces / 100 * 70 * Math.pow(n, 2);
      x = fd + x * (1 - fd / 255);
      L[v] = x;
    }
    return L;
  }
  function aplicarPixels(ctx, w, h, a) {
    var nulo = !a.exposicao && !a.contraste && !a.saturacao && !a.temperatura && !a.sombras && !a.realces && !a.desbotar && !a.vinheta && !a.split;
    if (nulo && !a.nitidez) return;
    var id = ctx.getImageData(0, 0, w, h), d = id.data;
    if (a.nitidez > 0) nitidez(d, w, h, a.nitidez / 100 * 0.7);
    if (!nulo) {
      var L = lutTom(a), sat = 1 + a.saturacao / 100, t = a.temperatura * 0.35, sp = a.split, vg = a.vinheta / 100 * 0.65, cx = w / 2, cy = h / 2, rmax = Math.sqrt(cx * cx + cy * cy);
      for (var y = 0; y < h; y++) {
        var dy = (y - cy) * (y - cy);
        for (var x = 0; x < w; x++) {
          var i = (y * w + x) * 4, r = L[d[i]], g = L[d[i + 1]], b = L[d[i + 2]];
          if (t) { r += t; b -= t; }
          if (sat !== 1) { var cz = 0.299 * r + 0.587 * g + 0.114 * b; r = cz + (r - cz) * sat; g = cz + (g - cz) * sat; b = cz + (b - cz) * sat; }
          if (sp) { var lum = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255)), ws = (1 - lum) * (1 - lum) * sp.sf, wh = lum * lum * sp.hf;
            r += (sp.s[0] - r) * ws + (sp.h[0] - r) * wh; g += (sp.s[1] - g) * ws + (sp.h[1] - g) * wh; b += (sp.s[2] - b) * ws + (sp.h[2] - b) * wh; }
          if (vg) { var dd = Math.sqrt((x - cx) * (x - cx) + dy) / rmax, f = dd < 0.45 ? 1 : 1 - vg * Math.pow((dd - 0.45) / 0.55, 1.6); r *= f; g *= f; b *= f; }
          d[i] = r; d[i + 1] = g; d[i + 2] = b;
        }
      }
    }
    ctx.putImageData(id, 0, 0);
  }
  function nitidez(d, w, h, k) {
    var o = new Uint8ClampedArray(d), c = 1 + 4 * k;
    for (var y = 1; y < h - 1; y++) for (var x = 1; x < w - 1; x++) {
      var i = (y * w + x) * 4, u = i - w * 4, dn = i + w * 4;
      for (var ch = 0; ch < 3; ch++) d[i + ch] = o[i + ch] * c - k * (o[u + ch] + o[dn + ch] + o[i - 4 + ch] + o[i + 4 + ch]);
    }
  }
  /* AUTO: lê o histograma da foto e acerta luz, contraste, cor e saturação (vai para os ajustes da própria foto) */
  function autoDe(f) {
    var c = reduzir(f.prev, 256), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, hist = new Uint32Array(256), n = 0, sr = 0, sg = 0, sb = 0, ss = 0;
    for (var i = 0; i < d.length; i += 4) {
      var r = d[i], g = d[i + 1], b = d[i + 2], l = Math.round(0.299 * r + 0.587 * g + 0.114 * b), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      hist[l]++; n++; sr += r; sg += g; sb += b; ss += mx ? (mx - mn) / mx : 0;
    }
    function pct(p) { var alvo = n * p, s = 0; for (var v = 0; v < 256; v++) { s += hist[v]; if (s >= alvo) return v; } return 255; }
    var p2 = pct(0.02), p10 = pct(0.1), p50 = pct(0.5), p90 = pct(0.9), p98 = pct(0.98), a = {};
    a.exposicao = Math.round(lim(Math.log2(118 / Math.max(12, p50)) * 100 * 0.75, -60, 70));
    var spread = p98 - p2; a.contraste = Math.round(lim((215 - spread) / 3, -10, 35));
    if (p10 < 22) a.sombras = Math.round(lim((22 - p10) * 1.2, 0, 30));
    if (p90 > 238) a.realces = -Math.round(lim((p90 - 238) * 1.5, 0, 30));
    var mr = sr / n, mb = sb / n, dt = (mb - mr) / 2;
    if (Math.abs(dt) > 4) a.temperatura = Math.round(lim(dt / 0.35 * 0.55, -35, 35));
    var sat = ss / n; if (sat < 0.3) a.saturacao = Math.round(lim((0.3 - sat) * 60, 0, 18));
    a.nitidez = 12;
    Object.keys(a).forEach(function (k) { if (!a[k]) delete a[k]; });
    return a;
  }

  /* ================= COMPOSIÇÃO ================= */
  var tingidas = {};
  function logoNaCor(img, cor) {
    if (cor === "original") return img;
    var k = img.src.length + "|" + img.src.slice(-40) + "|" + cor; if (tingidas[k]) return tingidas[k];
    var c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = cor === "branca" ? "#fff" : cor === "preta" ? "#000" : cor; x.fillRect(0, 0, c.width, c.height);
    return (tingidas[k] = c);
  }
  function luminancia(ctx, x, y, w, h) {
    try { var d = ctx.getImageData(Math.max(0, x | 0), Math.max(0, y | 0), Math.max(1, w | 0), Math.max(1, h | 0)).data, s = 0, n = 0;
      for (var i = 0; i < d.length; i += 16) { s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++; } return n ? s / n / 255 : 0; } catch (e) { return 0; }
  }
  function corContraste(hex) { var m = /^#?([0-9a-f]{6})$/i.exec(hex || ""); if (!m) return "#111"; var n = parseInt(m[1], 16), l = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; return l > 0.55 ? "#141414" : "#F5F1EA"; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (!r) { ctx.rect(x, y, w, h); return; } if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); } }
  function hojeBR() { var d = new Date(); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function variaveis(s, i) {
    return String(s || "").replace(/\{evento\}/g, G.vars.evento || "").replace(/\{data\}/g, hojeBR()).replace(/\{n\}/g, String((i || 0) + 1))
      .replace(/\{@\}/g, (KIT.arroba || "").replace(/^@?/, KIT.arroba ? "@" : "")).replace(/\{empresa\}/g, KIT.empresa || "").replace(/\{site\}/g, KIT.site || "");
  }
  function razao(f) {
    if (G.car.n > 0) { var p = (FORMATOS.filter(function (x) { return x[0] === G.car.parte; })[0] || FORMATOS[1])[2]; return p * G.car.n; }
    var fm = FORMATOS.filter(function (x) { return x[0] === G.formato; })[0] || FORMATOS[0];
    if (fm[2]) return fm[2];
    var rw = f.rot % 180 ? f.h : f.w, rh = f.rot % 180 ? f.w : f.h; return rw / rh;
  }
  /* tamanho final (antes das bordas por fora) */
  function tamanhoSaida(f, alvo, R) {
    var fm = FORMATOS.filter(function (x) { return x[0] === G.formato; })[0];
    if (!alvo.lado && fm && fm[3] && !G.car.n) return { W: fm[3][0], H: fm[3][1] };
    var W, H;
    if (alvo.lado) { if (R >= 1) { W = alvo.lado; H = W / R; } else { H = alvo.lado; W = H * R; } }
    else if (alvo.tam === "insta") { W = 1080 * (G.car.n || 1); H = W / R; }
    else { var lado = alvo.tam === "max" ? 4096 : 2048, nat = Math.max(f.w, f.h) * (G.formato === "original" ? 1 : 1.0); lado = Math.min(lado, Math.max(nat, 1080)); if (R >= 1) { W = lado; H = W / R; } else { H = lado; W = H * R; } }
    return { W: Math.max(1, Math.round(W)), H: Math.max(1, Math.round(H)) };
  }
  function insetsBorda(W, H) {
    var B = G.borda, b = Math.round(Math.min(W, H) * B.esp / 100), z = { l: 0, t: 0, r: 0, b: 0 };
    if (B.est === "solida" || B.est === "dupla") z.l = z.t = z.r = z.b = b;
    else if (B.est === "polaroid") { z.l = z.t = z.r = b; z.b = Math.round(Math.max(b * 4.2, H * 0.12)); }
    else if (B.est === "faixa") z.b = Math.round(Math.max(H * 0.085, b * 2));
    else if (B.est === "cinema") z.t = z.b = Math.round(H * 0.1);
    else if (B.est === "sombra") z.l = z.t = z.r = z.b = Math.round(b * 1.8);
    return z;
  }
  /* desenha a foto (com corte/zoom/giro) numa área w×h */
  function geometria(fonte, f, w, h) {
    var sw = fonte.width || fonte.naturalWidth, sh = fonte.height || fonte.naturalHeight, r90 = f.rot % 180 !== 0;
    var rw = r90 ? sh : sw, rh = r90 ? sw : sh, caber = G.encaixe !== "cortar" && !!G.formato && G.formato !== "original";
    var base = caber ? Math.min(w / rw, h / rh) : Math.max(w / rw, h / rh), ang = (f.incl || 0) * Math.PI / 180;
    var kz = caber || !ang ? 1 : Math.abs(Math.cos(ang)) + Math.abs(Math.sin(ang)) * Math.max(w / h, h / w);
    var s = base * (f.zoom / 100) * kz, dw = rw * s, dh = rh * s;
    var x0 = dw > w ? -(dw - w) / 2 * (1 + f.cx / 100) : (w - dw) / 2, y0 = dh > h ? -(dh - h) / 2 * (1 + f.cy / 100) : (h - dh) / 2;
    return { sw: sw, sh: sh, s: s, dw: dw, dh: dh, x0: x0, y0: y0, ang: f.rot * Math.PI / 180 + ang, caber: caber };
  }
  function desenharFonte(ctx, img, g, f) {
    ctx.save(); ctx.translate(g.x0 + g.dw / 2, g.y0 + g.dh / 2); ctx.rotate(g.ang); if (f.esp) ctx.scale(-1, 1); ctx.scale(g.s, g.s);
    ctx.drawImage(img, -g.sw / 2, -g.sh / 2, g.sw, g.sh); ctx.restore();
  }
  function camadaFoto(fonte, f, w, h, sem) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high";
    var g = geometria(fonte, f, w, h);
    if (g.caber && (g.dw < w - 1 || g.dh < h - 1)) {   // encaixe: fundo desfocado ou cor
      if (G.encaixe === "cor") { x.fillStyle = G.encaixeCor; x.fillRect(0, 0, w, h); }
      else { var cov = Math.max(w / (g.dw / g.s * 1), h / (g.dh / g.s)); x.save(); x.filter = "blur(" + Math.round(Math.max(w, h) / 40) + "px) brightness(.8)";
        var gc = { sw: g.sw, sh: g.sh, s: cov * 1.08, dw: g.dw / g.s * cov * 1.08, dh: g.dh / g.s * cov * 1.08, ang: g.ang };
        gc.x0 = (w - gc.dw) / 2; gc.y0 = (h - gc.dh) / 2; desenharFonte(x, fonte, gc, f); x.restore(); }
    }
    desenharFonte(x, fonte, g, f);
    if (!sem) aplicarPixels(x, w, h, efetivo(f));
    if (sem || !f.mask || f.fundo.modo === "nenhum") return c;
    /* recorte: aplica a máscara da IA e troca o fundo */
    var m = document.createElement("canvas"); m.width = w; m.height = h; var mx = m.getContext("2d");
    desenharFonte(mx, f.mask, { sw: g.sw, sh: g.sh, s: g.s, dw: g.dw, dh: g.dh, x0: g.x0, y0: g.y0, ang: g.ang }, f);
    var suj = document.createElement("canvas"); suj.width = w; suj.height = h; var sx = suj.getContext("2d");
    sx.drawImage(c, 0, 0); sx.globalCompositeOperation = "destination-in"; sx.drawImage(m, 0, 0);
    var o = document.createElement("canvas"); o.width = w; o.height = h; var ox = o.getContext("2d");
    if (f.fundo.modo === "cor") { ox.fillStyle = f.fundo.cor; ox.fillRect(0, 0, w, h); }
    else if (f.fundo.modo === "desfoque") { ox.filter = "blur(" + Math.round(Math.max(w, h) * f.fundo.blur / 900) + "px)"; ox.drawImage(c, 0, 0); ox.filter = "none"; }
    ox.drawImage(suj, 0, 0);
    return o;
  }
  function fonteCss(t, px) { var fo = FONTES.filter(function (x) { return x[0] === t.fonte; })[0] || FONTES[0]; return fo[2] + " " + Math.round(px) + "px '" + fo[0] + "', system-ui, sans-serif"; }
  function desenharTexto(ctx, t, P, i, lay) {
    var txt = variaveis(t.txt, i); if (!txt.trim()) return;
    var fs = Math.max(8, P.w * t.tam / 100), linhas = txt.split("\n"), lh = fs * 1.18;
    ctx.save(); ctx.font = fonteCss(t, fs); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    var lw = Math.max.apply(null, linhas.map(function (l) { return ctx.measureText(l).width; })), th = lh * linhas.length;
    var cx = P.x + t.cx * P.w, cy = P.y + t.cy * P.h, pad = fs * 0.35;
    cx = lim(cx, P.x + lw / 2 + pad, P.x + P.w - lw / 2 - pad); cy = lim(cy, P.y + th / 2 + pad, P.y + P.h - th / 2 - pad);
    if (t.estilo === "caixa") { ctx.fillStyle = t.fundo || corContraste(t.cor); ctx.globalAlpha = 0.82; rr(ctx, cx - lw / 2 - pad, cy - th / 2 - pad * 0.7, lw + pad * 2, th + pad * 1.4, pad * 0.8); ctx.fill(); ctx.globalAlpha = 1; }
    if (t.estilo === "sombra") { ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = fs * 0.3; ctx.shadowOffsetY = fs * 0.06; }
    linhas.forEach(function (l, k) {
      var y = cy - th / 2 + lh * (k + 0.5);
      if (t.estilo === "contorno") { ctx.lineWidth = Math.max(1.5, fs * 0.09); ctx.strokeStyle = corContraste(t.cor); ctx.lineJoin = "round"; ctx.strokeText(l, cx, y); }
      ctx.fillStyle = t.cor; ctx.fillText(l, cx, y);
    });
    ctx.restore();
    if (lay) lay.textos.push({ id: t.id, x: cx - lw / 2 - pad, y: cy - th / 2 - pad, w: lw + pad * 2, h: th + pad * 2 });
  }
  /* monta a foto final: área da foto → texto → logo → borda/moldura. Devolve canvas (e o desenho das áreas para arrastar) */
  function montar(fonte, f, alvo) {
    alvo = alvo || {}; var i = FOTOS.indexOf(f), R = razao(f), sz = tamanhoSaida(f, alvo, R), W = sz.W, H = sz.H, B = G.borda;
    var z = insetsBorda(W, H);
    if (G.formato === "original" && !G.car.n) { W += z.l + z.r; H += z.t + z.b; }   // original: a borda cresce para fora
    var P = { x: z.l, y: z.t, w: Math.max(1, W - z.l - z.r), h: Math.max(1, H - z.t - z.b) }, lay = { W: W, H: H, P: P, textos: [], logo: null };
    var o = document.createElement("canvas"); o.width = W; o.height = H; var ox = o.getContext("2d", { willReadFrequently: true });
    if (B.est !== "nenhuma" && B.est !== "cantos") { ox.fillStyle = B.est === "cinema" ? "#000" : B.cor || "#fff"; ox.fillRect(0, 0, W, H); }
    var foto = camadaFoto(fonte, f, Math.round(P.w), Math.round(P.h), alvo.semAjustes), raio = Math.min(P.w, P.h) * B.raio / 100;
    if (B.est === "sombra") { ox.save(); ox.shadowColor = "rgba(0,0,0,.45)"; ox.shadowBlur = Math.min(W, H) * 0.035; ox.shadowOffsetY = Math.min(W, H) * 0.012; ox.fillStyle = "#000"; rr(ox, P.x, P.y, P.w, P.h, raio); ox.fill(); ox.restore(); }
    ox.save(); rr(ox, P.x, P.y, P.w, P.h, raio); ox.clip(); ox.drawImage(foto, P.x, P.y, P.w, P.h); ox.restore();
    foto.width = foto.height = 1;
    if (B.est === "dupla") { var e2 = Math.max(1, Math.round(z.l * 0.18)); ox.strokeStyle = B.cor2; ox.lineWidth = e2; rr(ox, P.x - z.l * 0.45, P.y - z.t * 0.45, P.w + z.l * 0.9, P.h + z.t * 0.9, raio ? raio + z.l * 0.45 : 0); ox.stroke(); }
    if (B.est === "cantos") { var cm = Math.min(W, H), m = cm * Math.max(0.025, B.esp / 100), L = cm * 0.09; ox.strokeStyle = B.cor; ox.lineWidth = Math.max(2, cm * 0.008); ox.lineCap = "square";
      [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(function (k) { ox.beginPath(); ox.moveTo(k[0], k[1] + L * k[3]); ox.lineTo(k[0], k[1]); ox.lineTo(k[0] + L * k[2], k[1]); ox.stroke(); }); }
    /* textos */
    if (!alvo.semSobre) G.textos.forEach(function (t) { desenharTexto(ox, t, P, i, lay); });
    /* logo */
    var LG = logoAtual();
    if (!alvo.semSobre && G.logo.on && LG) {
      var lw = P.w * G.logo.tam / 100, lh = lw * LG.naturalHeight / LG.naturalWidth, mg = Math.min(P.w, P.h) * G.logo.mar / 100, lx, ly;
      if (G.logo.x != null) { lx = P.x + G.logo.x * P.w - lw / 2; ly = P.y + G.logo.y * P.h - lh / 2; }
      else { var p = POS9.filter(function (q) { return q[0] === G.logo.pos; })[0] || POS9[8]; lx = P.x + mg + (P.w - lw - 2 * mg) * p[1]; ly = P.y + mg + (P.h - lh - 2 * mg) * p[2]; }
      lx = lim(lx, P.x, P.x + P.w - lw); ly = lim(ly, P.y, P.y + P.h - lh);
      var cor = G.logo.cor; if (cor === "auto") cor = luminancia(ox, lx, ly, lw, lh) > 0.55 ? "preta" : "branca";
      ox.globalAlpha = G.logo.op / 100; ox.drawImage(logoNaCor(LG, cor), lx, ly, lw, lh); ox.globalAlpha = 1;
      lay.logo = { x: lx, y: ly, w: lw, h: lh };
    }
    /* texto da borda */
    if (B.txt && (B.est === "polaroid" || B.est === "faixa" || B.est === "cinema")) {
      var faixa = B.est === "cinema" ? z.b : z.b, fs = Math.max(10, Math.round(faixa * (B.est === "polaroid" ? 0.26 : 0.36)));
      ox.fillStyle = B.est === "cinema" ? "#F5F1EA" : corContraste(B.cor); ox.font = (B.est === "polaroid" ? "500 " : "600 ") + fs + "px Inter, system-ui, sans-serif"; ox.textAlign = "center"; ox.textBaseline = "middle";
      var tx = variaveis(B.txt, i); while (ox.measureText(tx).width > W * 0.9 && tx.length > 4) tx = tx.slice(0, -2);
      ox.fillText(tx, W / 2, H - faixa / 2);
    }
    /* moldura própria (PNG) por cima de tudo */
    if (B.png && MOLDS[B.png]) ox.drawImage(MOLDS[B.png], 0, 0, W, H);
    o.__lay = lay;
    return o;
  }

  /* ================= PRÉVIA ================= */
  var cv = $("cv"), LAY = null, pedido = 0, tFull = 0, RAPIDO = false;
  function agendar(rapido) {
    if (rapido) { RAPIDO = true; clearTimeout(tFull); tFull = setTimeout(function () { RAPIDO = false; agendar(); }, 220); }
    if (!pedido) pedido = requestAnimationFrame(function () { pedido = 0; previa(); });
    marcarHist();
    gravarUi("ui_fotos_ultimo", G);
  }
  function previa() {
    if ($("ed").hidden) return;
    var f = FOTOS[ATUAL], palco = $("palco");
    if (!f) { cv.width = cv.height = 1; $("dica").textContent = "Adicione fotos para começar."; return; }
    var pw = Math.max(200, palco.clientWidth - 24), ph = Math.max(160, palco.clientHeight - 24), dpr = Math.min(2, window.devicePixelRatio || 1);
    var lado = Math.round(Math.min(1400, Math.max(pw, ph) * dpr) * (RAPIDO ? 0.55 : 1));
    var c = montar(f.prev, f, { lado: lado }), W = c.width, H = c.height;
    LAY = c.__lay;
    cv.width = W; cv.height = H; var x = cv.getContext("2d"); x.drawImage(c, 0, 0);
    if (COMPARAR) {
      var a = montar(f.prev, f, { lado: lado, semAjustes: true }), sx = Math.round(W * DIV);
      x.save(); x.beginPath(); x.rect(0, 0, sx, H); x.clip(); x.drawImage(a, 0, 0, W, H); x.restore();
      x.fillStyle = "#FFB547"; x.fillRect(sx - 1.5 * dpr, 0, 3 * dpr, H);
      x.beginPath(); x.arc(sx, H / 2, 14 * dpr, 0, 7); x.fill();
      x.font = "700 " + Math.round(11 * dpr) + "px Inter, sans-serif"; x.textBaseline = "top";
      [["ANTES", 10 * dpr, "left"], ["DEPOIS", W - 10 * dpr, "right"]].forEach(function (k) { x.textAlign = k[2]; x.fillStyle = "rgba(0,0,0,.55)"; var m = x.measureText(k[0]).width; x.fillRect(k[2] === "left" ? k[1] - 6 : k[1] - m - 6, 10 * dpr - 4, m + 12, 14 * dpr + 6); x.fillStyle = "#fff"; x.fillText(k[0], k[1], 10 * dpr); });
      a.width = a.height = 1;
    }
    if (G.car.n > 1) { x.save(); x.setLineDash([8 * dpr, 6 * dpr]); x.strokeStyle = "rgba(255,181,71,.9)"; x.lineWidth = 2 * dpr; for (var k = 1; k < G.car.n; k++) { x.beginPath(); x.moveTo(W * k / G.car.n, 0); x.lineTo(W * k / G.car.n, H); x.stroke(); } x.restore(); }
    if (ABA === "texto" && TXT) { var tb = LAY.textos.filter(function (t) { return t.id === TXT; })[0]; if (tb) { x.save(); x.setLineDash([6 * dpr, 4 * dpr]); x.strokeStyle = "#FFB547"; x.lineWidth = 1.5 * dpr; x.strokeRect(tb.x, tb.y, tb.w, tb.h); x.restore(); } }
    c.width = c.height = 1;
    var s = Math.min(pw / W, ph / H); cv.style.width = Math.round(W * s) + "px"; cv.style.height = Math.round(H * s) + "px";
    var dicas = { foto: "Arraste a foto para escolher o corte · pinça ou roda do mouse = zoom", texto: G.textos.length ? "Arraste o texto na foto para mudar de lugar" : "", logo: G.logo.on ? "Arraste a logo na foto para mudar de lugar" : "" };
    $("dica").textContent = COMPARAR ? "Arraste para comparar antes e depois" : (dicas[ABA] || (FOTOS.length > 1 ? (ATUAL + 1) + " de " + FOTOS.length + " · " + f.nome : ""));
  }

  /* ---------- arrastar na prévia (corte, texto, logo, comparar) ---------- */
  var ptrs = {}, gesto = null;
  function noCanvas(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) * cv.width / r.width, y: (ev.clientY - r.top) * cv.height / r.height, r: r }; }
  function dentro(p, b) { return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }
  cv.addEventListener("pointerdown", function (ev) {
    var f = FOTOS[ATUAL]; if (!f || !LAY) return;
    cv.setPointerCapture(ev.pointerId); ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var p = noCanvas(ev), ids = Object.keys(ptrs);
    if (ids.length === 2 && ABA === "foto") { var a = ptrs[ids[0]], b = ptrs[ids[1]]; gesto = { tipo: "pinca", d0: Math.hypot(a.x - b.x, a.y - b.y), z0: f.zoom }; return; }
    if (COMPARAR) { gesto = { tipo: "div" }; DIV = lim(p.x / cv.width, 0.02, 0.98); agendar(true); return; }
    if (ABA === "texto") {
      var t = LAY.textos.slice().reverse().filter(function (k) { return dentro(p, k); })[0];
      if (t) { var tt = G.textos.filter(function (k) { return k.id === t.id; })[0]; if (TXT !== t.id) { TXT = t.id; painel(); } gesto = { tipo: "txt", t: tt, p0: p, cx: tt.cx, cy: tt.cy }; agendar(true); return; }
    }
    if (ABA === "logo" && dentro(p, LAY.logo)) { gesto = { tipo: "logo", p0: p, x: (LAY.logo.x + LAY.logo.w / 2 - LAY.P.x) / LAY.P.w, y: (LAY.logo.y + LAY.logo.h / 2 - LAY.P.y) / LAY.P.h }; return; }
    if (ABA === "foto" || ABA === "ajustes" || ABA === "filtros") gesto = { tipo: "pan", p0: p, cx: f.cx, cy: f.cy };
  });
  cv.addEventListener("pointermove", function (ev) {
    if (!ptrs[ev.pointerId] || !gesto) return; ptrs[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var f = FOTOS[ATUAL], p = noCanvas(ev);
    if (gesto.tipo === "pinca") { var ids = Object.keys(ptrs); if (ids.length < 2) return; var a = ptrs[ids[0]], b = ptrs[ids[1]]; f.zoom = Math.round(lim(gesto.z0 * Math.hypot(a.x - b.x, a.y - b.y) / gesto.d0, 100, 400)); sincSlider("zoom", f.zoom); agendar(true); return; }
    if (gesto.tipo === "div") { DIV = lim(p.x / cv.width, 0.02, 0.98); agendar(true); return; }
    var dx = p.x - gesto.p0.x, dy = p.y - gesto.p0.y, P = LAY.P;
    if (gesto.tipo === "txt") { gesto.t.cx = lim(gesto.cx + dx / P.w, 0, 1); gesto.t.cy = lim(gesto.cy + dy / P.h, 0, 1); agendar(true); }
    else if (gesto.tipo === "logo") { G.logo.x = lim(gesto.x + dx / P.w, 0, 1); G.logo.y = lim(gesto.y + dy / P.h, 0, 1); agendar(true); }
    else if (gesto.tipo === "pan") {
      var g = geometria(f.prev, f, P.w, P.h), fx = g.dw > P.w ? (g.dw - P.w) / 2 : 0, fy = g.dh > P.h ? (g.dh - P.h) / 2 : 0;
      if (fx) f.cx = Math.round(lim(gesto.cx - dx / fx * 100, -100, 100)); if (fy) f.cy = Math.round(lim(gesto.cy - dy / fy * 100, -100, 100));
      if (fx || fy) agendar(true);
    }
  });
  function soltar(ev) { delete ptrs[ev.pointerId]; if (!Object.keys(ptrs).length) { if (gesto) agendar(); gesto = null; } }
  cv.addEventListener("pointerup", soltar); cv.addEventListener("pointercancel", soltar);
  $("palco").addEventListener("wheel", function (ev) {
    var f = FOTOS[ATUAL]; if (!f || ABA !== "foto") return; ev.preventDefault();
    f.zoom = Math.round(lim(f.zoom * (ev.deltaY < 0 ? 1.08 : 1 / 1.08), 100, 400)); sincSlider("zoom", f.zoom); agendar(true);
  }, { passive: false });

  /* ================= HISTÓRICO (desfazer / refazer) ================= */
  var HIST = [], HPOS = -1, tHist = 0;
  function foto2(f) { return { rot: f.rot, incl: f.incl, esp: f.esp, cx: f.cx, cy: f.cy, zoom: f.zoom, aj: clone(f.aj), filtro: f.filtro, fundo: clone(f.fundo) }; }
  function snap() { return { g: JSON.stringify(G), f: JSON.stringify(FOTOS.map(foto2)), m: FOTOS.map(function (f) { return f.mask; }) }; }
  function igual(a, b) { return a && b && a.g === b.g && a.f === b.f && a.m.length === b.m.length && a.m.every(function (m, i) { return m === b.m[i]; }); }
  function marcarHist() { clearTimeout(tHist); tHist = setTimeout(gravarHist, 450); }
  function gravarHist() {
    clearTimeout(tHist); var s = snap(); if (igual(s, HIST[HPOS])) return botoesHist();
    HIST = HIST.slice(0, HPOS + 1); HIST.push(s); if (HIST.length > 40) HIST.shift(); HPOS = HIST.length - 1; botoesHist();
  }
  function restaurar(s) {
    G = normalizar(JSON.parse(s.g)); var fs = JSON.parse(s.f);
    FOTOS.forEach(function (f, i) { if (fs[i]) { Object.assign(f, fs[i]); f.mask = s.m[i] || null; } });
    if (TXT && !G.textos.some(function (t) { return t.id === TXT; })) TXT = null;
    painel(); pedido || (pedido = requestAnimationFrame(function () { pedido = 0; previa(); })); gravarUi("ui_fotos_ultimo", G); botoesHist();
  }
  function desfazer() { gravarHist(); if (HPOS > 0) { HPOS--; restaurar(HIST[HPOS]); } }
  function refazer() { if (HPOS < HIST.length - 1) { HPOS++; restaurar(HIST[HPOS]); } }
  function botoesHist() { $("edDesfazer").disabled = HPOS <= 0; $("edRefazer").disabled = HPOS >= HIST.length - 1; }

  /* ================= PAINEL DE CONTROLES ================= */
  var ICONES = {
    foto: '<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>',
    ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    filtros: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>',
    texto: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    logo: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    borda: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10"/>',
    fundo: '<path d="M4 20 10 9l4 7 2-3 4 7z"/><circle cx="17" cy="6" r="2"/><path d="M3 3l18 18" stroke-dasharray="2 2"/>',
    salvar: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>'
  };
  var ABAS = [["foto", "CORTE"], ["ajustes", "AJUSTES"], ["filtros", "FILTROS"], ["texto", "TEXTO"], ["logo", "LOGO"], ["borda", "BORDA"], ["fundo", "FUNDO IA"], ["salvar", "SALVAR"]];
  function desenharAbas() {
    $("abas").innerHTML = ABAS.map(function (a) { return '<button type="button" data-aba="' + a[0] + '" class="' + (a[0] === ABA ? "on" : "") + '" aria-pressed="' + (a[0] === ABA) + '"><svg viewBox="0 0 24 24">' + ICONES[a[0]] + "</svg>" + a[1] + "</button>"; }).join("");
  }
  function irAba(a) { ABA = a; desenharAbas(); painel(); if (a === "filtros") prevFiltros(); agendar(); var b = $("abas").querySelector('[data-aba="' + a + '"]'); if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest", inline: "center" }); }
  function chips(k, lista, atual, extra) { return '<div class="c-rolar">' + lista.map(function (x) { return '<button type="button" class="chip' + (x[0] === atual ? " on" : "") + '" data-k="' + k + '" data-v="' + esc(x[0]) + '"' + (extra ? extra(x) : "") + ">" + x[1] + "</button>"; }).join("") + "</div>"; }
  function sl(k, rot, min, max, v, suf, passo) { return '<label class="sl' + (v && min < 0 ? " mexido" : "") + '"><span>' + rot + '</span><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + v + '"><output>' + v + (suf || "") + "</output></label>"; }
  function sincSlider(k, v) { var el = $("ctrl").querySelector('input[data-k="' + k + '"]'); if (el) { el.value = v; el.nextElementSibling.textContent = v + (el.dataset.suf || ""); } }
  function coresHtml(k, atual, comPicker) {
    var lista = []; (KIT.cores || []).concat(CORES_BASE).forEach(function (c) { c = String(c).toLowerCase(); if (lista.indexOf(c) < 0) lista.push(c); });
    return '<div class="cores">' + lista.map(function (c) { return '<button type="button" data-k="' + k + '" data-v="' + c + '" style="background:' + c + '" class="' + (String(atual).toLowerCase() === c ? "on" : "") + '" aria-label="Cor ' + c + '"></button>'; }).join("") +
      (comPicker !== false ? '<input type="color" data-k="' + k + '" value="' + esc(/^#[0-9a-f]{6}$/i.test(atual) ? atual : "#ffffff") + '" aria-label="Outra cor">' : "") + "</div>";
  }
  function escopoHtml() { return '<div class="c-linha" style="justify-content:space-between;margin-bottom:6px"><div class="escopo" role="group" aria-label="Aplicar em"><button type="button" data-k="escopo" data-v="todas" class="' + (ESCOPO === "todas" ? "on" : "") + '">TODAS AS FOTOS</button><button type="button" data-k="escopo" data-v="esta" class="' + (ESCOPO === "esta" ? "on" : "") + '">SÓ ESTA</button></div></div>'; }
  function painel() {
    var f = FOTOS[ATUAL], h = "";
    if (!f) { $("ctrl").innerHTML = '<p class="c-nota">Adicione fotos para começar.</p>'; return; }
    if (ABA === "foto") {
      h += '<div class="c-tit">FORMATO</div>' + chips("formato", FORMATOS, G.car.n ? "" : G.formato);
      if (G.formato !== "original" && !G.car.n) h += '<div class="c-tit">ENCAIXE</div>' + chips("encaixe", [["cortar", "PREENCHER (CORTA)"], ["desfoque", "FOTO INTEIRA + FUNDO DESFOCADO"], ["cor", "FOTO INTEIRA + COR"]], G.encaixe) + (G.encaixe === "cor" ? coresHtml("encaixeCor", G.encaixeCor) : "");
      if (G.car.n) h += '<p class="c-nota">Carrossel ligado (' + G.car.n + ' partes) — mude em SALVAR.</p>';
      h += '<div class="c-tit">ESTA FOTO</div><div class="c-linha"><button type="button" class="chip" data-k="girar">↻ GIRAR</button><button type="button" class="chip" data-k="espelhar">⇋ ESPELHAR</button><button type="button" class="chip" data-k="centro">⊙ CENTRALIZAR</button><button type="button" class="chip" data-k="corteTodas">USAR ESTE CORTE EM TODAS</button><button type="button" class="chip ok" data-k="maisFotos">+ MAIS FOTOS</button></div>';
      h += sl("zoom", "Zoom", 100, 400, f.zoom, "%") + sl("incl", "Endireitar", -15, 15, f.incl || 0, "°", 0.5);
    } else if (ABA === "ajustes") {
      var ver = function (k) { return ESCOPO === "esta" ? (G.aj[k] || 0) + (f.aj[k] || 0) : (G.aj[k] || 0); };
      h += escopoHtml() + '<div class="c-linha" style="margin-bottom:6px"><button type="button" class="chip ok" data-k="auto1">✦ AUTO NESTA</button><button type="button" class="chip ok" data-k="autoTodas">✦ AUTO EM TODAS</button><button type="button" class="chip" data-k="zerarAj">ZERAR</button></div>';
      h += AJ.map(function (a) { return sl("aj:" + a[0], a[1], a[2], a[3], ver(a[0])); }).join("");
      if (ESCOPO === "todas" && Object.keys(f.aj).length) h += '<p class="c-nota">Esta foto também tem ajustes próprios (AUTO ou SÓ ESTA), somados aos de todas. <button type="button" class="chip" data-k="limparFoto">LIMPAR OS DESTA FOTO</button></p>';
    } else if (ABA === "filtros") {
      var fa = (ESCOPO === "esta" && f.filtro) || (ESCOPO === "esta" ? f.filtro || G.filtro : G.filtro);
      h += escopoHtml() + '<div class="c-rolar" id="flts">' + Object.keys(FILTROS).map(function (k) { return '<button type="button" class="flt' + (k === fa ? " on" : "") + '" data-k="filtro" data-v="' + k + '"><canvas data-f="' + k + '" width="1" height="1"></canvas><span>' + FILTROS[k].nome + "</span></button>"; }).join("") + "</div>";
      h += sl("intens", "Intensidade", 0, 100, G.intens, "%");
    } else if (ABA === "texto") {
      h += '<label class="c-tit" for="vEvento">NOME DO EVENTO <span style="text-transform:none;letter-spacing:0;font-weight:500">— usado em {evento}</span></label><input class="c-campo" id="vEvento" data-k="evento" value="' + esc(G.vars.evento) + '" placeholder="ex.: Congresso Sicoob 2026" maxlength="80">';
      var prontos = [["{evento}", "+ {evento}"], ["{@}", "+ @"], ["Foto: {@}", "+ FOTO: @"], ["{data}", "+ DATA"]].concat((KIT.textos || []).map(function (t) { return [t, "+ " + (t.length > 18 ? t.slice(0, 18) + "…" : t)]; }));
      h += '<div class="c-tit">ADICIONAR</div><div class="c-rolar"><button type="button" class="chip on" data-k="novoTxt" data-v="">+ TEXTO</button>' + prontos.map(function (p) { return '<button type="button" class="chip" data-k="novoTxt" data-v="' + esc(p[0]) + '">' + esc(p[1]) + "</button>"; }).join("") + "</div>";
      if (G.textos.length) h += '<div class="c-tit">TEXTOS NA FOTO</div>' + chips("selTxt", G.textos.map(function (t, k) { return [t.id, esc((variaveis(t.txt, ATUAL) || "(vazio)").slice(0, 16)) || "Texto " + (k + 1)]; }), TXT);
      var t = G.textos.filter(function (x) { return x.id === TXT; })[0];
      if (t) {
        h += '<textarea class="c-campo" data-k="txt" rows="2" style="margin-top:8px" aria-label="Texto">' + esc(t.txt) + "</textarea>";
        h += '<div class="c-tit">FONTE</div><div class="c-rolar">' + FONTES.map(function (fo) { return '<button type="button" class="chip' + (fo[0] === t.fonte ? " on" : "") + '" data-k="fonte" data-v="' + fo[0] + '" style="font-family:\'' + fo[0] + '\';font-weight:' + fo[2] + ';letter-spacing:0">' + fo[1] + "</button>"; }).join("") + "</div>";
        h += sl("ttam", "Tamanho", 2, 30, t.tam, "", 0.5) + '<div class="c-tit">ESTILO</div>' + chips("testilo", [["simples", "SIMPLES"], ["sombra", "SOMBRA"], ["caixa", "CAIXA"], ["contorno", "CONTORNO"]], t.estilo);
        h += '<div class="c-tit">COR</div>' + coresHtml("tcor", t.cor) + (t.estilo === "caixa" ? '<div class="c-tit">COR DA CAIXA</div>' + coresHtml("tfundo", t.fundo || corContraste(t.cor)) : "");
        h += '<div class="c-tit">POSIÇÃO</div><div class="c-linha" style="gap:14px"><div class="grade9">' + POS9.map(function (p) { return '<button type="button" data-k="tpos" data-v="' + p[0] + '" style="--x:' + (8 + p[1] * 16) + 'px;--y:' + (8 + p[2] * 16) + 'px" aria-label="Posição"></button>'; }).join("") + '</div><button type="button" class="chip perigo" data-k="apagaTxt">APAGAR TEXTO</button></div>';
      }
      h += '<p class="c-nota">Variáveis: {evento} {data} {n} (número da foto) {@} {empresa} {site} — o @ e a empresa vêm de ★ MINHA MARCA.</p>';
    } else if (ABA === "logo") {
      h += '<div class="c-linha"><button type="button" class="chip' + (G.logo.on ? " on" : "") + '" data-k="logoOn">' + (G.logo.on ? "LOGO LIGADA" : "LOGO DESLIGADA") + '</button><button type="button" class="chip" data-k="marca">★ MINHA MARCA</button></div>';
      h += '<div class="c-tit">SUAS LOGOS</div><div class="c-rolar">' + KIT.logos.map(function (l) { return '<button type="button" class="mini-img' + ((logoAtual() === LOGOS[l.id]) ? " on" : "") + '" data-k="logoSel" data-v="' + l.id + '" aria-label="Usar ' + esc(l.nome) + '"><img alt="" src="' + l.url + '"></button>'; }).join("") + '<button type="button" class="mini-add" data-k="addLogo" aria-label="Enviar logo">+</button></div>';
      if (KIT.logos.length) {
        h += '<div class="c-tit">TIRAR O FUNDO DA LOGO</div><div class="c-linha"><button type="button" class="chip ok" data-k="tirarFundoLogo" data-v="borda">TIRAR FUNDO</button><button type="button" class="chip ok" data-k="tirarFundoLogo" data-v="tudo">TIRAR FUNDO + BURACOS (O, A, B…)</button></div>' + sl("tolLogo", "Tolerância", 5, 120, TOL_LOGO);
        h += '<div class="c-tit">COR DA LOGO</div>' + chips("logoCor", [["auto", "AUTOMÁTICA"], ["original", "ORIGINAL"], ["branca", "BRANCA"], ["preta", "PRETA"]].concat((KIT.cores || []).slice(0, 4).map(function (c) { return [c, '<i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:' + c + ';vertical-align:-1px"></i>']; })), G.logo.cor);
        h += sl("logoTam", "Tamanho", 4, 60, G.logo.tam, "%") + sl("logoOp", "Opacidade", 10, 100, G.logo.op, "%") + sl("logoMar", "Margem", 0, 15, G.logo.mar, "%");
        h += '<div class="c-tit">POSIÇÃO</div><div class="grade9">' + POS9.map(function (p) { return '<button type="button" data-k="logoPos" data-v="' + p[0] + '" class="' + (G.logo.x == null && p[0] === G.logo.pos ? "on" : "") + '" style="--x:' + (8 + p[1] * 16) + 'px;--y:' + (8 + p[2] * 16) + 'px" aria-label="Posição"></button>'; }).join("") + "</div>";
      } else h += '<p class="c-nota">Envie a logo (PNG com fundo transparente fica melhor — se tiver fundo, use TIRAR FUNDO depois). Ela fica guardada em MINHA MARCA, só neste aparelho.</p>';
    } else if (ABA === "borda") {
      var B = G.borda;
      h += '<div class="c-tit">ESTILO</div>' + chips("bEst", BORDAS, B.est);
      if (B.est !== "nenhuma") h += sl("bEsp", "Espessura", 1, 15, B.esp, "%");
      h += sl("bRaio", "Cantos", 0, 20, B.raio, "%");
      if (B.est !== "nenhuma" && B.est !== "cinema") h += '<div class="c-tit">COR</div>' + coresHtml("bCor", B.cor);
      if (B.est === "dupla") h += '<div class="c-tit">COR DA LINHA</div>' + coresHtml("bCor2", B.cor2);
      if (B.est === "polaroid" || B.est === "faixa" || B.est === "cinema") h += '<label class="c-tit" for="bTxt">TEXTO NA BORDA</label><input class="c-campo" id="bTxt" data-k="bTxt" value="' + esc(B.txt) + '" placeholder="ex.: {evento} · {data}" maxlength="90">';
      h += '<div class="c-tit">MINHAS MOLDURAS (PNG)</div><div class="c-rolar"><button type="button" class="mini-img' + (!B.png ? " on" : "") + '" data-k="mold" data-v="" aria-label="Sem moldura" style="font-size:10px;color:var(--bw-texto-3)">NENHUMA</button>' +
        KIT.molduras.map(function (m) { return '<button type="button" class="mini-img' + (B.png === m.id ? " on" : "") + '" data-k="mold" data-v="' + m.id + '" aria-label="' + esc(m.nome) + '"><img alt="" src="' + m.url + '"></button>'; }).join("") + '<button type="button" class="mini-add" data-k="addMold" aria-label="Enviar moldura">+</button></div>';
      h += '<p class="c-nota">Moldura própria = um PNG com o meio transparente (feito no Canva, por exemplo). Ela cobre a foto inteira.</p>';
      h += '<div class="c-tit">MINHAS BORDAS</div><div class="c-rolar">' + KIT.bordas.map(function (b) { return '<button type="button" class="chip" data-k="bordaSalva" data-v="' + b.id + '">' + esc(b.nome) + "</button>"; }).join("") + '<button type="button" class="chip ok" data-k="salvarBorda">+ GUARDAR ESTA BORDA</button></div>';
    } else if (ABA === "fundo") {
      h += '<p class="c-nota" style="margin-top:0">A IA separa a pessoa/objeto principal do fundo. Roda <b>no seu aparelho</b> (baixa ~25 MB na primeira vez) — a foto não é enviada. Funciona melhor com pessoas.</p>';
      h += '<div class="c-linha"><button type="button" class="chip ok" data-k="recortar" data-v="esta">✂ REMOVER FUNDO DESTA</button>' + (FOTOS.length > 1 ? '<button type="button" class="chip ok" data-k="recortar" data-v="todas">✂ DE TODAS (' + FOTOS.length + ")</button>" : "") + "</div>";
      h += '<div class="c-prog" id="iaProg" hidden><i></i></div><p class="c-nota" id="iaMsg"></p>';
      if (f.mask) {
        h += '<div class="c-tit">NOVO FUNDO</div>' + chips("fundoModo", [["nenhum", "ORIGINAL"], ["transparente", "TRANSPARENTE (PNG)"], ["cor", "COR"], ["desfoque", "DESFOCADO"]], f.fundo.modo);
        if (f.fundo.modo === "cor") h += coresHtml("fundoCor", f.fundo.cor);
        if (f.fundo.modo === "desfoque") h += sl("fundoBlur", "Desfoque", 4, 60, f.fundo.blur);
        h += '<div class="c-linha" style="margin-top:8px"><button type="button" class="chip" data-k="fundoTodas">USAR ESTE FUNDO EM TODAS</button><button type="button" class="chip perigo" data-k="semRecorte">DESCARTAR RECORTE</button></div>';
      }
    } else if (ABA === "salvar") {
      var S = G.saida;
      h += '<label class="c-tit" for="sEvento">NOME DO EVENTO</label><input class="c-campo" id="sEvento" data-k="evento" value="' + esc(G.vars.evento) + '" placeholder="ex.: Congresso Sicoob 2026" maxlength="80">';
      h += '<label class="c-tit" for="sNome">NOME DOS ARQUIVOS</label><input class="c-campo" id="sNome" data-k="sNome" value="' + esc(S.nome) + '" placeholder="{evento}-{n}" maxlength="80"><p class="c-nota">Fica: <b>' + esc(nomeArquivo(ATUAL, "")) + "</b></p>";
      h += '<div class="c-tit">TAMANHO</div>' + chips("sTam", TAMANHOS, S.tam) + '<div class="c-tit">ARQUIVO</div>' + chips("sFmt", [["jpg", "JPG (menor)"], ["png", "PNG (transparência)"]], S.fmt);
      if (S.fmt === "jpg") h += sl("sQual", "Qualidade", 50, 100, S.qual);
      h += '<div class="c-tit">CARROSSEL (FOTO PANORÂMICA EM PARTES)</div>' + chips("car", [["0", "DESLIGADO"], ["2", "2 PARTES"], ["3", "3 PARTES"]], String(G.car.n)) + (G.car.n ? chips("carParte", [["4:5", "CADA PARTE 4:5"], ["1:1", "CADA PARTE 1:1"]], G.car.parte) : "");
      h += '<div class="c-linha" style="margin-top:12px"><button type="button" class="chip on" data-k="baixarUma">⇩ BAIXAR ESTA</button><button type="button" class="chip on" data-k="baixarTodas">⇩ TODAS (ZIP · ' + FOTOS.length + ')</button><button type="button" class="chip" data-k="compartilhar">COMPARTILHAR</button><button type="button" class="chip ok" data-k="pacote">PACOTE REDES (FEED + STORY + QUADRADO)</button></div>';
      h += '<p class="c-nota" id="prog" role="status"></p>';
      h += '<div class="c-tit">MEUS PADRÕES</div><div class="c-rolar">' + KIT.padroes.map(function (p) { return '<button type="button" class="chip" data-k="padrao" data-v="' + p.id + '">' + esc(p.nome) + "</button>"; }).join("") + '<button type="button" class="chip ok" data-k="salvarPadrao">+ GUARDAR ESTE PADRÃO</button><button type="button" class="chip perigo" data-k="zerarTudo">↺ TUDO DO ZERO</button></div>';
      h += '<p class="c-nota">Padrão = formato, ajustes, filtro, textos, logo e borda juntos. Fica em ★ MINHA MARCA.</p>';
    }
    $("ctrl").innerHTML = h;
    $("ctrl").querySelectorAll('input[type=range][data-k]').forEach(function (el) { var o = el.nextElementSibling; if (o && /%|°/.test(o.textContent)) el.dataset.suf = o.textContent.replace(/^-?[\d.]+/, ""); });
    if (ABA === "filtros") prevFiltros();
  }
  function prevFiltros() {
    var f = FOTOS[ATUAL], box = $("flts"); if (!f || !box) return;
    var mini = reduzir(f.prev, 150), s = Math.min(mini.width, mini.height);
    box.querySelectorAll("canvas[data-f]").forEach(function (c) {
      c.width = c.height = s; var x = c.getContext("2d", { willReadFrequently: true });
      x.drawImage(mini, (mini.width - s) / 2, (mini.height - s) / 2, s, s, 0, 0, s, s);
      var flt = FILTROS[c.dataset.f], a = {}; AJ.forEach(function (q) { a[q[0]] = (flt.p[q[0]] || 0); }); a.split = flt.split || null;
      aplicarPixels(x, s, s, a);
    });
  }

  /* ---------- ações dos controles ---------- */
  var TOL_LOGO = 40;
  function fotoAtual() { return FOTOS[ATUAL]; }
  var ACOES = {
    escopo: function (v) { ESCOPO = v; painel(); },
    formato: function (v) { G.formato = v; G.car.n = 0; FOTOS.forEach(function (f) { f.cx = f.cy = 0; }); painel(); },
    encaixe: function (v) { G.encaixe = v; painel(); },
    encaixeCor: function (v) { G.encaixeCor = v; },
    girar: function () { var f = fotoAtual(); f.rot = (f.rot + 90) % 360; f.cx = f.cy = 0; },
    espelhar: function () { var f = fotoAtual(); f.esp = !f.esp; },
    maisFotos: function () { $("arquivos").click(); },
    zerarTudo: function () { if (!confirm("Voltar tudo ao começo (formato, ajustes, textos, logo e borda)? Suas logos e padrões continuam guardados.")) return; var S = G.saida; G = normalizar({}); G.saida = S; TXT = null; FOTOS.forEach(function (f) { Object.assign(f, { rot: 0, incl: 0, esp: false, cx: 0, cy: 0, zoom: 100, aj: {}, filtro: null }); }); painel(); },
    centro: function () { var f = fotoAtual(); f.cx = f.cy = 0; f.zoom = 100; f.incl = 0; painel(); },
    corteTodas: function () { var f = fotoAtual(); FOTOS.forEach(function (o) { if (o !== f && o.rot === f.rot) { o.cx = f.cx; o.cy = f.cy; o.zoom = f.zoom; o.incl = f.incl; } }); toast("Corte copiado para as outras fotos (mesma orientação)."); },
    zoom: function (v) { fotoAtual().zoom = +v; },
    incl: function (v) { fotoAtual().incl = +v; },
    auto1: function () { var f = fotoAtual(); f.aj = autoDe(f); ESCOPO = "esta"; painel(); toast("✦ AUTO aplicado nesta foto (desfazer: ↶)"); },
    autoTodas: function () { FOTOS.forEach(function (f) { f.aj = autoDe(f); }); painel(); toast("✦ AUTO aplicado em " + FOTOS.length + " foto(s)"); },
    zerarAj: function () { if (ESCOPO === "esta") fotoAtual().aj = {}; else G.aj = {}; painel(); },
    limparFoto: function () { fotoAtual().aj = {}; painel(); },
    filtro: function (v) { if (ESCOPO === "esta") fotoAtual().filtro = v; else { G.filtro = v; FOTOS.forEach(function (f) { f.filtro = null; }); } $("flts").querySelectorAll(".flt").forEach(function (b) { b.classList.toggle("on", b.dataset.v === v); }); },
    intens: function (v) { G.intens = +v; },
    evento: function (v) { G.vars.evento = v; var n = $("ctrl").querySelector(".c-nota b"); if (n && ABA === "salvar") n.textContent = nomeArquivo(ATUAL, ""); },
    novoTxt: function (v) {
      var cor = (KIT.cores && KIT.cores[2]) || "#ffffff", t = { id: uid("t"), txt: v || "Seu texto", fonte: G.textos.length ? "Inter" : "Montserrat", tam: v ? 4.5 : 7, cor: "#ffffff", fundo: "", estilo: "sombra", cx: 0.5, cy: G.textos.length % 2 ? 0.14 : 0.86 };
      if (v === "Foto: {@}") { t.tam = 3; t.cx = 0.03; t.cy = 0.97; t.estilo = "simples"; }
      void cor; G.textos.push(t); TXT = t.id; carregarFonte(t.fonte); painel();
      if (!v) setTimeout(function () { var ta = $("ctrl").querySelector('textarea[data-k="txt"]'); if (ta) { ta.focus(); ta.select(); } }, 30);
    },
    selTxt: function (v) { TXT = v; painel(); },
    txt: function (v) { var t = txtSel(); if (t) t.txt = v; },
    fonte: function (v) { var t = txtSel(); if (t) { t.fonte = v; carregarFonte(v); } painel(); },
    ttam: function (v) { var t = txtSel(); if (t) t.tam = +v; },
    testilo: function (v) { var t = txtSel(); if (t) t.estilo = v; painel(); },
    tcor: function (v) { var t = txtSel(); if (t) t.cor = v; },
    tfundo: function (v) { var t = txtSel(); if (t) t.fundo = v; },
    tpos: function (v) { var t = txtSel(), p = POS9.filter(function (q) { return q[0] === v; })[0]; if (t && p) { t.cx = 0.04 + p[1] * 0.92; t.cy = 0.05 + p[2] * 0.9; } },
    apagaTxt: function () { G.textos = G.textos.filter(function (t) { return t.id !== TXT; }); TXT = G.textos.length ? G.textos[G.textos.length - 1].id : null; painel(); },
    logoOn: function () { if (!KIT.logos.length) { $("arqImg").dataset.para = "logo"; $("arqImg").click(); return; } G.logo.on = !G.logo.on; painel(); },
    marca: function () { abrirMarca(); },
    logoSel: function (v) { G.logo.id = v; G.logo.on = true; painel(); },
    addLogo: function () { $("arqImg").dataset.para = "logo"; $("arqImg").click(); },
    tirarFundoLogo: function (v) { tirarFundoLogo(v === "tudo"); },
    tolLogo: function (v) { TOL_LOGO = +v; },
    logoCor: function (v) { G.logo.cor = v; },
    logoTam: function (v) { G.logo.tam = +v; }, logoOp: function (v) { G.logo.op = +v; }, logoMar: function (v) { G.logo.mar = +v; },
    logoPos: function (v) { G.logo.pos = v; G.logo.x = G.logo.y = null; G.logo.on = true; painel(); },
    bEst: function (v) { G.borda.est = v; if (v !== "nenhuma" && !G.borda.esp) G.borda.esp = 4; painel(); },
    bEsp: function (v) { G.borda.esp = +v; }, bRaio: function (v) { G.borda.raio = +v; },
    bCor: function (v) { G.borda.cor = v; }, bCor2: function (v) { G.borda.cor2 = v; }, bTxt: function (v) { G.borda.txt = v; },
    mold: function (v) { G.borda.png = v; painel(); },
    addMold: function () { $("arqImg").dataset.para = "moldura"; $("arqImg").click(); },
    bordaSalva: function (v) { var b = KIT.bordas.filter(function (x) { return x.id === v; })[0]; if (b) { G.borda = Object.assign(clone(PADRAO.borda), clone(b.borda)); painel(); toast("Borda “" + b.nome + "” aplicada"); } },
    salvarBorda: async function () { var n = prompt("Nome desta borda:", "Minha borda " + (KIT.bordas.length + 1)); if (!n) return; KIT.bordas.push({ id: uid("bd"), nome: n.slice(0, 40), borda: clone(G.borda) }); await gravarKit(); painel(); toast("✓ Borda guardada em MINHA MARCA"); },
    recortar: function (v) { recortar(v === "todas"); },
    fundoModo: function (v) { fotoAtual().fundo.modo = v; if (v === "transparente" && G.saida.fmt !== "png") { G.saida.fmt = "png"; toast("Arquivo trocado para PNG (guarda a transparência)."); } painel(); },
    fundoCor: function (v) { fotoAtual().fundo.cor = v; }, fundoBlur: function (v) { fotoAtual().fundo.blur = +v; },
    fundoTodas: function () { var fu = fotoAtual().fundo, sem = 0; FOTOS.forEach(function (f) { f.fundo = clone(fu); if (!f.mask) sem++; }); toast(sem ? "Fundo copiado. " + sem + " foto(s) ainda sem recorte — use ✂ DE TODAS." : "Fundo copiado para todas."); },
    semRecorte: function () { var f = fotoAtual(); f.mask = null; f.fundo.modo = "nenhum"; painel(); },
    sNome: function (v) { G.saida.nome = v; var n = $("ctrl").querySelector(".c-nota b"); if (n) n.textContent = nomeArquivo(ATUAL, ""); },
    sTam: function (v) { G.saida.tam = v; }, sFmt: function (v) { G.saida.fmt = v; painel(); }, sQual: function (v) { G.saida.qual = +v; },
    car: function (v) { G.car.n = +v; FOTOS.forEach(function (f) { f.cx = f.cy = 0; }); painel(); },
    carParte: function (v) { G.car.parte = v; },
    baixarUma: function () { exportar("uma"); }, baixarTodas: function () { exportar("zip"); }, compartilhar: function () { exportar("share"); }, pacote: function () { exportar("pacote"); },
    padrao: function (v) { var p = KIT.padroes.filter(function (x) { return x.id === v; })[0]; if (!p) return; var S = G.saida, ev = G.vars; G = normalizar(p.g); G.saida = S; G.vars = ev; TXT = null; G.textos.forEach(function (t) { carregarFonte(t.fonte); }); painel(); toast("✓ Padrão “" + p.nome + "” aplicado"); },
    salvarPadrao: async function () { var n = prompt("Nome do padrão:", "Padrão " + (KIT.padroes.length + 1)); if (!n) return; var g = clone(G); delete g.saida; delete g.vars; KIT.padroes = KIT.padroes.filter(function (p) { return p.nome !== n; }); KIT.padroes.push({ id: uid("pd"), nome: n.slice(0, 40), g: g }); await gravarKit(); painel(); toast("✓ Padrão guardado em MINHA MARCA"); }
  };
  function txtSel() { return G.textos.filter(function (t) { return t.id === TXT; })[0]; }
  function aplicarAcao(el, ehInput) {
    var k = el.dataset.k; if (!k) return;
    var v = el.dataset.v != null ? el.dataset.v : el.value;
    if (k.indexOf("aj:") === 0) {
      var c = k.slice(3), f = fotoAtual();
      if (ESCOPO === "esta") f.aj[c] = +v - (G.aj[c] || 0); else G.aj[c] = +v;
      if (!f.aj[c]) delete f.aj[c];
    } else if (ACOES[k]) ACOES[k](v);
    else return;
    if (el.type === "range") { var o = el.nextElementSibling; if (o) o.textContent = v + (el.dataset.suf || ""); el.parentNode.classList.toggle("mexido", +v !== 0 && +el.min < 0); }
    if (el.classList.contains("chip") && el.parentNode && !/^(girar|espelhar|centro|corteTodas|auto1|autoTodas|zerarAj|novoTxt|apagaTxt|baixar|compart|pacote|salvar|recortar|fundoTodas|semRecorte|tirarFundoLogo|marca|limparFoto|addLogo|addMold|maisFotos|zerarTudo)/.test(k)) {
      el.parentNode.querySelectorAll('.chip[data-k="' + k + '"]').forEach(function (b) { b.classList.toggle("on", b === el); });
    }
    if (el.parentNode && el.parentNode.classList.contains("cores")) el.parentNode.querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", b === el); });
    if (/^(baixar|compart|pacote|marca|addLogo|addMold|salvarPadrao|salvarBorda|recortar|tirarFundoLogo)/.test(k)) return;
    agendar(ehInput);
  }
  $("ctrl").addEventListener("click", function (ev) { var el = ev.target.closest("button[data-k]"); if (el) aplicarAcao(el, false); });
  $("ctrl").addEventListener("input", function (ev) { var el = ev.target; if (el.dataset && el.dataset.k) aplicarAcao(el, el.type === "range"); });
  $("ctrl").addEventListener("change", function (ev) { if (ev.target.type === "range") agendar(); });
  $("abas").addEventListener("click", function (ev) { var b = ev.target.closest("[data-aba]"); if (b) irAba(b.dataset.aba); });
  $("edFotos").addEventListener("click", function (ev) {
    if (ev.target.closest("#maisFotos")) { $("arquivos").click(); return; }
    var b = ev.target.closest("[data-i]"); if (!b) return; ATUAL = +b.dataset.i; desenharTiras(); painel(); agendar();
  });
  var fontesOk = {};
  function carregarFonte(fam) { if (fontesOk[fam] || !document.fonts) return Promise.resolve(); var fo = FONTES.filter(function (x) { return x[0] === fam; })[0] || FONTES[0]; return document.fonts.load(fo[2] + " 40px '" + fo[0] + "'").then(function () { fontesOk[fam] = 1; agendar(); }).catch(function () { }); }

  /* ================= LOGO: tirar fundo por cor (sem internet) ================= */
  async function tirarFundoLogo(tudo) {
    var id = (logoAtual() && KIT.logos.filter(function (l) { return LOGOS[l.id] === logoAtual(); })[0] || {}).id; if (!id) return;
    var im = LOGOS[id], c = reduzir(im, 1200), w = c.width, h = c.height, x = c.getContext("2d", { willReadFrequently: true }), id2 = x.getImageData(0, 0, w, h), d = id2.data;
    var amostras = [], k; for (k = 0; k < w; k += Math.max(1, w >> 5)) { amostras.push((k) * 4, ((h - 1) * w + k) * 4); } for (k = 0; k < h; k += Math.max(1, h >> 5)) { amostras.push((k * w) * 4, (k * w + w - 1) * 4); }
    var op = amostras.filter(function (i) { return d[i + 3] > 200; }); if (!op.length) { toast("Esta logo já tem fundo transparente."); return; }
    var br = 0, bg = 0, bb = 0; op.forEach(function (i) { br += d[i]; bg += d[i + 1]; bb += d[i + 2]; }); br /= op.length; bg /= op.length; bb /= op.length;
    var tol = TOL_LOGO, dist = function (i) { return Math.sqrt((d[i] - br) * (d[i] - br) + (d[i + 1] - bg) * (d[i + 1] - bg) + (d[i + 2] - bb) * (d[i + 2] - bb)); };
    var vis = new Uint8Array(w * h), fila = [];
    function tenta(p) { if (p < 0 || p >= w * h || vis[p]) return; vis[p] = 1; var dd = dist(p * 4); if (dd < tol * 1.6) { fila.push(p); d[p * 4 + 3] = dd < tol ? 0 : Math.min(d[p * 4 + 3], Math.round(255 * (dd - tol) / (tol * 0.6))); } }
    if (tudo) { for (var p = 0; p < w * h; p++) { var dd = dist(p * 4); if (dd < tol * 1.6) d[p * 4 + 3] = dd < tol ? 0 : Math.min(d[p * 4 + 3], Math.round(255 * (dd - tol) / (tol * 0.6))); } }
    else {
      for (k = 0; k < w; k++) { tenta(k); tenta((h - 1) * w + k); } for (k = 0; k < h; k++) { tenta(k * w); tenta(k * w + w - 1); }
      while (fila.length) { var q = fila.pop(), dq = dist(q * 4); if (dq >= tol) continue; var qx = q % w; if (qx > 0) tenta(q - 1); if (qx < w - 1) tenta(q + 1); tenta(q - w); tenta(q + w); }
    }
    x.putImageData(id2, 0, 0);
    var url = c.toDataURL("image/png"), l = KIT.logos.filter(function (o) { return o.id === id; })[0];
    l.url = url; await gravarKit(); LOGOS[id] = await imgDeUrl(url); tingidas = {}; G.logo.on = true; painel(); agendar(); toast("✓ Fundo da logo removido (desfazer: envie a logo de novo)");
  }

  /* ================= FUNDO COM IA (transformers.js no aparelho) ================= */
  var TF = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2", worker = null, esperando = {}, nPed = 0;
  function iaMsg(t, pct) { var m = $("iaMsg"), p = $("iaProg"); if (m) m.innerHTML = t; if (p) { p.hidden = pct == null; if (pct != null) p.firstChild.style.width = Math.round(pct * 100) + "%"; } var o = $("ocup"); if (o && !o.hidden) o.innerHTML = t; }
  function iniciarWorker() {
    if (worker) return worker;
    var codigo = [
      'import { pipeline, RawImage } from "' + TF + '";',
      'let seg = null; const vistos = {};',
      'const prog = (p) => { if (p.status === "progress" && p.total) { vistos[p.file] = [p.loaded, p.total]; let l = 0, t = 0; for (const k in vistos) { l += vistos[k][0]; t += vistos[k][1]; } postMessage({ tipo: "baixando", pct: t ? l / t : 0, mb: Math.round(t / 1048576) }); } };',
      'async function carregar() {',
      '  if (seg) return seg;',
      '  if (self.navigator && navigator.gpu) { try { seg = await pipeline("background-removal", "Xenova/modnet", { device: "webgpu", dtype: "fp32", progress_callback: prog }); return seg; } catch (e) { seg = null; } }',
      '  seg = await pipeline("background-removal", "Xenova/modnet", { device: "wasm", dtype: "fp32", progress_callback: prog }); return seg;',
      '}',
      'self.onmessage = async (ev) => {',
      '  const d = ev.data;',
      '  try {',
      '    const s = await carregar();',
      '    const img = new RawImage(new Uint8ClampedArray(d.buf), d.w, d.h, 4);',
      '    let out = await s(img); if (Array.isArray(out)) out = out[0];',
      '    const n = out.width * out.height, a = new Uint8ClampedArray(n);',
      '    for (let i = 0; i < n; i++) a[i] = out.channels === 4 ? out.data[i * 4 + 3] : out.data[i * out.channels];',
      '    postMessage({ tipo: "mascara", id: d.id, w: out.width, h: out.height, buf: a.buffer }, [a.buffer]);',
      '  } catch (e) { postMessage({ tipo: "erro", id: d.id, msg: String(e && e.message || e) }); }',
      '};'
    ].join("\n");
    worker = new Worker(URL.createObjectURL(new Blob([codigo], { type: "text/javascript" })), { type: "module" });
    worker.onmessage = function (ev) {
      var d = ev.data;
      if (d.tipo === "baixando") { iaMsg("Baixando a IA de recorte: " + Math.round(d.pct * 100) + "% de " + d.mb + " MB (só na primeira vez)…", d.pct); return; }
      var cb = esperando[d.id]; if (!cb) return; delete esperando[d.id];
      if (d.tipo === "erro") cb.erro(new Error(d.msg)); else cb.ok(d);
    };
    worker.onerror = function (e) { Object.keys(esperando).forEach(function (k) { esperando[k].erro(new Error(e.message || "worker")); delete esperando[k]; }); worker = null; };
    return worker;
  }
  function mascaraDe(f) {
    var c = reduzir(f.prev, 1024), w = c.width, h = c.height, buf = c.getContext("2d").getImageData(0, 0, w, h).data.buffer, id = ++nPed;
    return new Promise(function (ok, erro) {
      esperando[id] = { ok: ok, erro: erro };
      iniciarWorker().postMessage({ tipo: "recortar", id: id, w: w, h: h, buf: buf }, [buf]);
    }).then(function (d) {
      var m = document.createElement("canvas"); m.width = d.w; m.height = d.h; var x = m.getContext("2d"), im = x.createImageData(d.w, d.h), a = new Uint8ClampedArray(d.buf);
      for (var i = 0; i < a.length; i++) { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = 255; im.data[i * 4 + 3] = a[i]; }
      x.putImageData(im, 0, 0); return m;
    });
  }
  var recortando = false;
  async function recortar(todas) {
    if (recortando) return; recortando = true;
    var lista = todas ? FOTOS.filter(function (f) { return !f.mask; }) : [fotoAtual()], feitas = 0;
    if (!lista.length) { recortando = false; toast("Todas as fotos já estão recortadas."); return; }
    $("ocup").hidden = false; iaMsg("Preparando a IA de recorte…", 0);
    try {
      for (var i = 0; i < lista.length; i++) {
        iaMsg("Recortando " + (i + 1) + " de " + lista.length + "…", i / lista.length);
        lista[i].mask = await mascaraDe(lista[i]);
        if (lista[i].fundo.modo === "nenhum") lista[i].fundo.modo = "transparente";
        feitas++;
      }
      if (G.saida.fmt !== "png" && lista.some(function (f) { return f.fundo.modo === "transparente"; })) G.saida.fmt = "png";
      $("ocup").hidden = true; painel(); iaMsg("✓ " + feitas + " foto(s) recortada(s). Escolha o novo fundo abaixo."); agendar();
    } catch (e) {
      $("ocup").hidden = true; painel();
      iaMsg("Não deu para usar a IA de recorte neste aparelho (" + esc(String(e.message || e)).slice(0, 120) + "). Tente no Chrome atualizado ou no computador.");
    }
    recortando = false;
  }

  /* ================= EXPORTAR ================= */
  function slug(s) { return String(s || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function extensao(f) { return G.saida.fmt === "png" || (f && f.mask && f.fundo.modo === "transparente") ? "png" : "jpg"; }
  function nomeArquivo(i, sufixo) {
    var f = FOTOS[i]; if (!f) return "";
    var nn = String(i + 1).padStart(2, "0"), mod = G.saida.nome || "{evento}-{n}";
    var base = slug(variaveis(mod.replace(/\{n\}/g, nn), i));
    if (!/[a-z]/.test(base)) base = slug(f.nome) + "-bw";
    else if (mod.indexOf("{n}") < 0) base += "-" + nn;
    return base + (sufixo ? "-" + sufixo : "") + "." + extensao(f);
  }
  async function fontesProntas() { if (!document.fonts) return; await Promise.all(G.textos.map(function (t) { return carregarFonte(t.fonte); })); try { await document.fonts.ready; } catch (e) { } }
  function paraBlob(c, tipo, q) { return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, tipo, q); }); }
  /* gera os arquivos de uma foto (1, ou N partes se for carrossel) */
  async function gerar(i, sufixo) {
    var f = FOTOS[i], im = await abrirImagem(f.file), c = montar(im, f, { tam: G.saida.tam }), ext = extensao(f), tipo = ext === "png" ? "image/png" : "image/jpeg", q = G.saida.qual / 100, out = [];
    if (ext === "jpg") { var b = document.createElement("canvas"); b.width = c.width; b.height = c.height; var bx = b.getContext("2d"); bx.fillStyle = "#fff"; bx.fillRect(0, 0, b.width, b.height); bx.drawImage(c, 0, 0); c.width = 1; c = b; }
    if (G.car.n > 1) {
      for (var k = 0; k < G.car.n; k++) {
        var pw = Math.round(c.width / G.car.n), p = document.createElement("canvas"); p.width = pw; p.height = c.height;
        p.getContext("2d").drawImage(c, k * pw, 0, pw, c.height, 0, 0, pw, c.height);
        out.push({ nome: nomeArquivo(i, (sufixo ? sufixo + "-" : "") + "parte" + (k + 1)), blob: await paraBlob(p, tipo, q) }); p.width = 1;
      }
    } else out.push({ nome: nomeArquivo(i, sufixo), blob: await paraBlob(c, tipo, q) });
    c.width = c.height = 1;
    return out;
  }
  function baixarBlob(blob, nome) {
    var a = document.createElement("a"), url = URL.createObjectURL(blob); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(arqs) {   // ZIP sem compressão (JPG/PNG já são comprimidos) — sem biblioteca externa
    var partes = [], central = [], ofs = 0, enc = new TextEncoder(), agora = new Date();
    var dt = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate(), tm = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1);
    arqs.forEach(function (a) {
      var nome = enc.encode(a.nome), crc = crc32(a.dados), n = a.dados.length;
      var h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
      h.setUint16(10, tm, true); h.setUint16(12, dt, true); h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, nome.length, true); h.setUint16(28, 0, true);
      partes.push(h.buffer, nome, a.dados);
      var c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, tm, true); c.setUint16(14, dt, true); c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, nome.length, true);
      c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true); c.setUint32(38, 0, true); c.setUint32(42, ofs, true);
      central.push(c.buffer, nome); ofs += 30 + nome.length + n;
    });
    var tamC = central.reduce(function (s, p) { return s + (p.byteLength || p.length); }, 0);
    var e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, arqs.length, true); e.setUint16(10, arqs.length, true); e.setUint32(12, tamC, true); e.setUint32(16, ofs, true);
    return new Blob(partes.concat(central).concat([e.buffer]), { type: "application/zip" });
  }
  var exportando = false;
  function prog(t) { var p = $("prog"); if (p) p.textContent = t; }
  function mb(n) { return (n / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  async function exportar(modo) {
    if (exportando || !FOTOS.length) return; exportando = true; await fontesProntas();
    var arqs = [], idx = modo === "uma" ? [ATUAL] : FOTOS.map(function (_, i) { return i; });
    try {
      if (modo === "pacote") {
        var salvo = { f: G.formato, car: clone(G.car) }; G.car.n = 0;
        var pac = [["4:5", "feed"], ["9:16", "story"], ["1:1", "quadrado"]];
        for (var i = 0; i < idx.length; i++) for (var p = 0; p < pac.length; p++) {
          prog("Gerando " + (i + 1) + " de " + idx.length + " (" + pac[p][1] + ")…"); await new Promise(function (r) { setTimeout(r, 20); });
          G.formato = pac[p][0]; arqs = arqs.concat(await gerar(idx[i], pac[p][1]));
        }
        G.formato = salvo.f; G.car = salvo.car;
      } else {
        for (var j = 0; j < idx.length; j++) { prog("Gerando " + (j + 1) + " de " + idx.length + "…"); await new Promise(function (r) { setTimeout(r, 20); }); arqs = arqs.concat(await gerar(idx[j])); }
      }
      if (modo === "share") {
        var files = arqs.map(function (a) { return new File([a.blob], a.nome, { type: a.blob.type }); });
        if (!navigator.canShare || !navigator.canShare({ files: files })) prog("Este navegador não compartilha " + files.length + " arquivo(s) de uma vez — use BAIXAR.");
        else { try { await navigator.share({ files: files, title: G.vars.evento || "Fotos" }); prog("✓ Enviado para o menu de compartilhar"); } catch (e) { prog(e && e.name === "AbortError" ? "Compartilhamento cancelado." : "Não deu para compartilhar — tente menos fotos ou use BAIXAR."); } }
      } else if (arqs.length === 1) { baixarBlob(arqs[0].blob, arqs[0].nome); prog("✓ " + arqs[0].nome + " (" + mb(arqs[0].blob.size) + ")"); }
      else {
        var lista = []; for (var k = 0; k < arqs.length; k++) lista.push({ nome: arqs[k].nome, dados: new Uint8Array(await arqs[k].blob.arrayBuffer()) });
        var z = zip(lista), base = slug(variaveis(G.vars.evento || "fotos")) || "fotos";
        baixarBlob(z, base + (modo === "pacote" ? "-redes" : "") + "-brightway.zip");
        prog("✓ " + lista.length + " arquivo(s) no ZIP (" + mb(z.size) + ")");
        window.__fotosZip = { n: lista.length, bytes: z.size, nomes: lista.map(function (a) { return a.nome; }) };
      }
    } catch (e) { prog("Não deu para gerar: " + (e && e.message || e)); }
    exportando = false;
  }

  /* ================= MINHA MARCA (janela) ================= */
  function abrirMarca() { desenharMarca(); $("mk").hidden = false; }
  function fecharMarca() { $("mk").hidden = true; if (!$("ed").hidden) { painel(); agendar(); } }
  function desenharMarca() {
    var h = '<button type="button" class="mk-x" data-m="fechar" aria-label="Fechar">×</button><h3>★ MINHA MARCA</h3><p class="tf-sub" style="margin:0">Seu banco de marketing: logos, cores, molduras, textos e padrões da empresa. Fica guardado <b>neste aparelho</b> — use EXPORTAR KIT para levar a outro.</p>';
    h += '<div class="mk-sec"><h4>EMPRESA</h4><div class="mk-duas"><input class="c-campo" data-m="empresa" placeholder="Nome da empresa" value="' + esc(KIT.empresa) + '" aria-label="Nome da empresa"><input class="c-campo" data-m="arroba" placeholder="@ do Instagram" value="' + esc(KIT.arroba) + '" aria-label="@ do Instagram"><input class="c-campo" data-m="site" placeholder="Site" value="' + esc(KIT.site) + '" aria-label="Site"></div></div>';
    h += '<div class="mk-sec"><h4>CORES DA MARCA</h4><div class="cores">' + KIT.cores.map(function (c, i) { return '<span style="position:relative;display:inline-block"><button type="button" style="background:' + c + '" aria-label="Cor ' + c + '" data-m="corDel" data-i="' + i + '" title="Tocar para apagar"></button></span>'; }).join("") + (KIT.cores.length < 8 ? '<input type="color" data-m="corNova" value="#1C97A6" aria-label="Escolher cor"><button type="button" class="chip" data-m="corAdd">+ ADICIONAR</button>' : "") + '</div><p class="c-nota">Toque numa cor para apagar.</p></div>';
    h += '<div class="mk-sec"><h4>LOGOS</h4><div class="mk-grid">' + KIT.logos.map(function (l) { return '<div class="mini-img"><img alt="' + esc(l.nome) + '" src="' + l.url + '"><button type="button" class="x" data-m="logoDel" data-v="' + l.id + '" aria-label="Apagar">✕</button></div>'; }).join("") + '<button type="button" class="mini-add" data-m="logoAdd" aria-label="Enviar logo">+</button></div><p class="c-nota">PNG transparente é o ideal. Logo com fundo branco? No editor, aba LOGO → TIRAR FUNDO.</p></div>';
    h += '<div class="mk-sec"><h4>MOLDURAS (PNG)</h4><div class="mk-grid">' + KIT.molduras.map(function (m) { return '<div class="mini-img"><img alt="' + esc(m.nome) + '" src="' + m.url + '"><button type="button" class="x" data-m="moldDel" data-v="' + m.id + '" aria-label="Apagar">✕</button></div>'; }).join("") + '<button type="button" class="mini-add" data-m="moldAdd" aria-label="Enviar moldura">+</button></div></div>';
    h += '<div class="mk-sec"><h4>TEXTOS PRONTOS</h4><div class="c-rolar" style="flex-wrap:wrap">' + KIT.textos.map(function (t, i) { return '<button type="button" class="chip" data-m="txtDel" data-i="' + i + '" title="Tocar para apagar">' + esc(t) + " ✕</button>"; }).join("") + '</div><div class="c-linha" style="margin-top:6px;flex-wrap:nowrap"><input class="c-campo" id="mkTxt" placeholder="ex.: Transmissão ao vivo · BW Produções" maxlength="80"><button type="button" class="chip ok" data-m="txtAdd">+</button></div></div>';
    h += '<div class="mk-sec"><h4>MEUS PADRÕES</h4><div class="c-rolar" style="flex-wrap:wrap">' + (KIT.padroes.length ? KIT.padroes.map(function (p) { return '<button type="button" class="chip" data-m="padDel" data-v="' + p.id + '">' + esc(p.nome) + " ✕</button>"; }).join("") : '<span class="c-nota">Guarde um padrão no editor (aba SALVAR).</span>') + "</div></div>";
    h += '<div class="mk-sec"><h4>MINHAS BORDAS</h4><div class="c-rolar" style="flex-wrap:wrap">' + (KIT.bordas.length ? KIT.bordas.map(function (b) { return '<button type="button" class="chip" data-m="bdDel" data-v="' + b.id + '">' + esc(b.nome) + " ✕</button>"; }).join("") : '<span class="c-nota">Guarde uma borda no editor (aba BORDA).</span>') + "</div></div>";
    h += '<div class="mk-sec"><h4>LEVAR PARA OUTRO APARELHO</h4><div class="c-linha"><button type="button" class="bw-btn bw-btn--vidro" data-m="exportar">⇩ EXPORTAR KIT</button><button type="button" class="bw-btn bw-btn--vidro" data-m="importar">⇧ IMPORTAR KIT</button></div></div>';
    $("mkCx").innerHTML = h;
  }
  $("mk").addEventListener("click", async function (ev) {
    if (ev.target === $("mk")) return fecharMarca();
    var b = ev.target.closest("[data-m]"); if (!b || b.tagName === "INPUT") return; var m = b.dataset.m, v = b.dataset.v, i = +b.dataset.i;
    if (m === "fechar") return fecharMarca();
    if (m === "corAdd") { var c = $("mkCx").querySelector('[data-m="corNova"]').value.toLowerCase(); if (KIT.cores.indexOf(c) < 0) KIT.cores.push(c); }
    else if (m === "corDel") KIT.cores.splice(i, 1);
    else if (m === "logoAdd" || m === "moldAdd") { $("arqImg").dataset.para = m === "logoAdd" ? "logo" : "moldura"; $("arqImg").click(); return; }
    else if (m === "logoDel") { if (!confirm("Apagar esta logo?")) return; KIT.logos = KIT.logos.filter(function (l) { return l.id !== v; }); delete LOGOS[v]; if (G.logo.id === v) G.logo.id = ""; }
    else if (m === "moldDel") { if (!confirm("Apagar esta moldura?")) return; KIT.molduras = KIT.molduras.filter(function (l) { return l.id !== v; }); delete MOLDS[v]; if (G.borda.png === v) G.borda.png = ""; }
    else if (m === "txtAdd") { var t = $("mkTxt").value.trim(); if (!t) return; KIT.textos.push(t.slice(0, 80)); }
    else if (m === "txtDel") KIT.textos.splice(i, 1);
    else if (m === "padDel") { if (!confirm("Apagar este padrão?")) return; KIT.padroes = KIT.padroes.filter(function (p) { return p.id !== v; }); }
    else if (m === "bdDel") { if (!confirm("Apagar esta borda?")) return; KIT.bordas = KIT.bordas.filter(function (p) { return p.id !== v; }); }
    else if (m === "exportar") { baixarBlob(new Blob([JSON.stringify({ tipo: "brightway-minha-marca", versao: 1, kit: KIT })], { type: "application/json" }), "minha-marca-" + (slug(KIT.empresa) || "brightway") + ".json"); return; }
    else if (m === "importar") { $("arqKit").click(); return; }
    else return;
    await gravarKit(); desenharMarca();
  });
  $("mk").addEventListener("change", async function (ev) { var m = ev.target.dataset.m; if (m === "empresa" || m === "arroba" || m === "site") { KIT[m] = ev.target.value.trim().slice(0, 80); await gravarKit(); } });
  $("arqKit").onchange = async function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    try { var j = JSON.parse(await f.text()); if (!j || j.tipo !== "brightway-minha-marca" || !j.kit) throw new Error("x");
      if (!confirm("Importar o kit? Ele SOMA ao que já está aqui (logos, molduras, cores, textos e padrões).")) return;
      var k = j.kit; ["empresa", "arroba", "site"].forEach(function (c) { if (k[c] && !KIT[c]) KIT[c] = String(k[c]).slice(0, 80); });
      (k.cores || []).forEach(function (c) { if (/^#[0-9a-f]{6}$/i.test(c) && KIT.cores.indexOf(c) < 0) KIT.cores.push(c); });
      ["logos", "molduras", "padroes", "bordas"].forEach(function (c) { (k[c] || []).forEach(function (x) { if (x && x.id && !KIT[c].some(function (y) { return y.id === x.id; })) { if ((c === "logos" || c === "molduras") && !/^data:image\/(png|jpeg|webp);base64,/.test(x.url || "")) return; KIT[c].push(x); } }); });
      (k.textos || []).forEach(function (t) { if (typeof t === "string" && KIT.textos.indexOf(t) < 0) KIT.textos.push(t.slice(0, 80)); });
      await gravarKit(); await carregarImgs(); desenharMarca(); toast("✓ Kit importado");
    } catch (e) { toast("Este arquivo não é um kit MINHA MARCA."); }
  };
  $("arqImg").onchange = async function () {
    var f = this.files && this.files[0], para = this.dataset.para; this.value = ""; if (!f) return;
    try {
      var im = await decodificar(f), c = reduzir(im, para === "moldura" ? 2400 : 1200), url = c.toDataURL("image/png"), item = { id: uid(para === "moldura" ? "md" : "lg"), nome: f.name.replace(/\.[^.]+$/, "").slice(0, 40), url: url };
      if (para === "moldura") { KIT.molduras.push(item); MOLDS[item.id] = await imgDeUrl(url); G.borda.png = item.id; }
      else { KIT.logos.push(item); LOGOS[item.id] = await imgDeUrl(url); G.logo.id = item.id; G.logo.on = true; }
      await gravarKit();
      if (!$("mk").hidden) desenharMarca();
      if (!$("ed").hidden) { painel(); agendar(); }
      toast("✓ " + (para === "moldura" ? "Moldura" : "Logo") + " guardada em MINHA MARCA");
    } catch (e) { toast("Não deu para abrir esta imagem."); }
  };

  /* ================= ABRIR / FECHAR O EDITOR ================= */
  function abrirEditor() {
    if (!FOTOS.length) return;
    if (ATUAL < 0) ATUAL = 0;
    $("ed").hidden = false; document.documentElement.style.overflow = "hidden";
    if (!history.state || !history.state.bwEd) history.pushState({ bwEd: 1 }, "");
    desenharAbas(); desenharTiras(); painel(); G.textos.forEach(function (t) { carregarFonte(t.fonte); });
    if (HPOS < 0) gravarHist(); botoesHist();
    requestAnimationFrame(function () { previa(); });
  }
  function fecharEditor(doHistorico) {
    $("ed").hidden = true; document.documentElement.style.overflow = ""; COMPARAR = false; $("edComparar").classList.remove("on");
    if (!doHistorico && history.state && history.state.bwEd) history.back();
  }
  window.addEventListener("popstate", function () { if (!$("mk").hidden) { fecharMarca(); if (!$("ed").hidden) history.pushState({ bwEd: 1 }, ""); return; } if (!$("ed").hidden) fecharEditor(true); });
  $("edFechar").onclick = function () { fecharEditor(false); };
  $("edDesfazer").onclick = desfazer; $("edRefazer").onclick = refazer;
  $("edAuto").onclick = function () { if (!FOTOS[ATUAL]) return; ACOES.auto1(); agendar(); };
  $("edComparar").onclick = function () { COMPARAR = !COMPARAR; DIV = 0.5; this.classList.toggle("on", COMPARAR); agendar(); };
  $("edSalvar").onclick = function () { if (ABA !== "salvar") irAba("salvar"); else exportar("uma"); };
  $("abrirEd").onclick = abrirEditor;
  $("abrirMarca").onclick = abrirMarca;
  document.addEventListener("keydown", function (ev) {
    if ($("ed").hidden) return; var tag = (ev.target.tagName || "").toLowerCase(); if (tag === "input" || tag === "textarea") return;
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); if (ev.shiftKey) refazer(); else desfazer(); }
    else if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "y") { ev.preventDefault(); refazer(); }
    else if (ev.key === "Escape") { if (!$("mk").hidden) fecharMarca(); else fecharEditor(false); }
  });

  /* ---------- entrada de arquivos ---------- */
  $("arquivos").onchange = function () { adicionar(this.files); this.value = ""; };
  var solta = $("solta");
  ["dragenter", "dragover"].forEach(function (t) { solta.addEventListener(t, function (ev) { ev.preventDefault(); solta.classList.add("sobre"); }); });
  ["dragleave", "drop"].forEach(function (t) { solta.addEventListener(t, function () { solta.classList.remove("sobre"); }); });
  solta.addEventListener("drop", function (ev) { ev.preventDefault(); adicionar(ev.dataTransfer.files); });
  window.addEventListener("resize", function () { if (!$("ed").hidden) agendar(); });

  (async function () { await lerKit(); await migrarAntigo(); await carregarImgs(); if (!$("ed").hidden) { painel(); agendar(); } })();
  window.__fotos = {   // usado nos testes automáticos
    adicionar: adicionar, montar: montar, G: function () { return G; }, FOTOS: FOTOS, abrir: abrirEditor, fechar: fecharEditor, aba: irAba, auto: autoDe,
    desfazer: desfazer, refazer: refazer, gravarHist: gravarHist, hist: function () { return { n: HIST.length, pos: HPOS }; }, acao: function (k, v) { ACOES[k](v); agendar(); },
    kit: function () { return KIT; }, gravarKit: gravarKit, carregarImgs: carregarImgs, LOGOS: LOGOS, exportar: exportar, nomeArquivo: nomeArquivo, mascaraDe: mascaraDe, tirarFundoLogo: tirarFundoLogo,
    lay: function () { return LAY; }, comparar: function (v) { COMPARAR = v; agendar(); }
  };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
