/* ÁLBUM 3D E EFEITOS — editor (22/11/2026, Claude). Pedido do dono: "modelos definidos igual ao vídeo, só substitui os arquivos;
   modo álbum de fotos com várias sequências; efeitos 3D com vídeo e imagem; no celular e no PC; biblioteca vasta e fácil".
   1) escolhe o MODELO (galeria animada, já com as fotos da pessoa)  2) põe fotos e vídeos (entram no lugar dos números)  3) GERAR VÍDEO.
   Mídias, música e projetos ficam SÓ neste aparelho (IndexedDB bw_album). Este arquivo não envia nada para a internet. */
(function () {
  "use strict";
  var B = window.BWAlbum, $ = function (id) { return document.getElementById(id); };
  var FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "4k-v": [2160, 3840], "4k-h": [3840, 2160], "21:9": [2560, 1080] };
  /* 22/11: tamanho da TELA deste aparelho (preenche monitor/celular/telão inteiro) e PERSONALIZADO (largura × altura livres, 240–4096 px) */
  function telaAqui() { var r = window.devicePixelRatio || 1, w = Math.round(screen.width * r), h = Math.round(screen.height * r), k = Math.min(1, 4096 / Math.max(w, h)); return [Math.round(w * k / 2) * 2, Math.round(h * k / 2) * 2]; }
  var P = null, MID = {}, ORDEM = [], TEMPO = 0, TOCANDO = false, HIST = [], FUT = [], SALVAR_T = 0, HIST_T = 0, SOM = null, BATIDA = 0, CAT = "todos", PREVIA = null, FIXA = null;
  var CACHE = {}, ESC = 0.5;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, c) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c === undefined ? 1 : c, maximumFractionDigits: c === undefined ? 1 : c }); }
  function aviso(txt, erro) { if (window.BWAviso) BWAviso(txt, erro ? "erro" : ""); }   /* 23/11: aviso único */
  function uid() { return "a" + Math.random().toString(36).slice(2, 9); }

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() { if (DB) return DB; DB = new Promise(function (ok, erro) { var r = indexedDB.open("bw_album", 1); r.onupgradeneeded = function () { var d = r.result; d.createObjectStore("midias", { keyPath: "id" }); d.createObjectStore("projetos", { keyPath: "id" }); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); return DB; }
  async function op(loja, modo, f) { var d = await db(); return new Promise(function (ok, erro) { var tx = d.transaction(loja, modo), r = f(tx.objectStore(loja)); tx.oncomplete = function () { ok(r && r.result); }; tx.onerror = function () { erro(tx.error); }; }); }

  /* ---------- mídias ---------- */
  function abrirMidia(reg) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(reg.blob), m = { id: reg.id, nome: reg.nome, tipo: reg.tipo, url: url, w: reg.w || 0, h: reg.h || 0, dur: reg.dur || 0, thumb: null, el: null };
      var fim = function () { var th = new Image(); th.onload = function () { m.thumb = th; ok(m); }; th.onerror = function () { ok(m); }; th.src = reg.thumb || url; };
      if (reg.tipo === "video") { var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.loop = false; v.src = url;
        v.onloadedmetadata = function () { m.w = v.videoWidth; m.h = v.videoHeight; m.dur = v.duration || m.dur; }; v.onerror = function () { m.ruim = true; }; m.el = v; fim(); }
      else { var im = new Image(); im.onload = function () { m.w = im.naturalWidth; m.h = im.naturalHeight; m.el = im; fim(); }; im.onerror = function () { m.ruim = true; fim(); }; im.src = url; }
    });
  }
  function miniatura(fonte, w, h) { var c = document.createElement("canvas"), k = Math.min(1, 360 / Math.max(w, h)); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext("2d").drawImage(fonte, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.8); }
  async function importar(arquivos) {
    var n = 0, ruins = [];
    for (var i = 0; i < arquivos.length; i++) {
      var f = arquivos[i], tipo = /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name) ? "video" : /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name) ? "foto" : null;
      if (!tipo) { ruins.push(f.name); continue; }
      if (arquivos.length > 1) aviso("Trazendo " + (i + 1) + " de " + arquivos.length + "…");
      var blob = new Blob([await f.arrayBuffer()], { type: f.type || (tipo === "video" ? "video/mp4" : "image/jpeg") });   // cópia na memória (o iPhone invalida o original)
      var reg = { id: uid(), nome: f.name, tipo: tipo, blob: blob, w: 0, h: 0, dur: 0, thumb: "" };
      try {
        if (tipo === "foto") { var bmp = await createImageBitmap(blob); reg.w = bmp.width; reg.h = bmp.height; reg.thumb = miniatura(bmp, bmp.width, bmp.height); if (bmp.close) bmp.close(); }
        else { var v = document.createElement("video"), u = URL.createObjectURL(blob); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
          await new Promise(function (ok, erro) { v.onloadeddata = ok; v.onerror = function () { erro(new Error("formato")); }; setTimeout(function () { erro(new Error("demorou")); }, 15000); });
          reg.w = v.videoWidth; reg.h = v.videoHeight; reg.dur = v.duration; if (!reg.w) throw new Error("sem quadro");
          await new Promise(function (ok) { v.onseeked = ok; v.currentTime = Math.min(0.5, reg.dur / 2); setTimeout(ok, 3000); });
          reg.thumb = miniatura(v, reg.w, reg.h); try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} URL.revokeObjectURL(u); }
      } catch (e) { if (v && v.removeAttribute) { try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} } ruins.push(f.name + (tipo === "video" ? " (vídeo em formato que este navegador não abre)" : " (foto em formato que este navegador não abre)")); continue; }
      await op("midias", "readwrite", function (s) { return s.put(reg); });
      MID[reg.id] = await abrirMidia(reg); ORDEM.push(reg.id); n++; P.ordem = ORDEM.slice(); desenharMidias();
    }
    P.ordem = ORDEM.slice(); limparCache(); mudou(); desenharMidias();
    if (n) aviso("＋ " + n + " arquivo(s) no modelo. Toque em ▶ TOCAR para ver, ou troque de modelo à vontade — as fotos vão junto.");
    if (ruins.length) aviso("Não abriu: " + ruins.join(", ") + ". No iPhone: Ajustes → Câmera → Formatos → Mais compatível.", true);
  }
  function desenharMidias() {
    $("alMidias").innerHTML = ORDEM.map(function (id, i) { var m = MID[id]; if (!m) return "";
      return '<div class="al-mid' + (m.ruim ? " ruim" : "") + '" title="' + esc(m.nome) + '">' + (m.thumb ? '<img src="' + esc(m.thumb.src) + '" alt="">' : "") + '<span class="n">' + (i + 1) + "</span>" +
        (m.tipo === "video" ? '<span class="v">▶ ' + fmt(m.dur || 0) + "s</span>" : "") + '<button class="x" type="button" data-tirar="' + id + '" aria-label="Tirar">✕</button>' +
        '<span class="mv"><button type="button" data-mover="' + id + '" data-d="-1" aria-label="Antes">◀</button><button type="button" data-mover="' + id + '" data-d="1" aria-label="Depois">▶</button></span></div>'; }).join("");
  }
  async function tirarMidia(id) {
    await op("midias", "readwrite", function (s) { return s.delete(id); }); if (MID[id]) URL.revokeObjectURL(MID[id].url); delete MID[id];
    ORDEM = ORDEM.filter(function (x) { return x !== id; }); P.ordem = ORDEM.slice(); limparCache(); mudou(); desenharMidias();
  }
  function limparCache() { CACHE = {}; MINIS.forEach(function (x) { x.cache = {}; }); }
  function viva(i) { var m = MID[ORDEM[i]]; if (!m || !m.el || !m.w || m.ruim) return null; return { el: m.el, w: m.w, h: m.h }; }
  function mini(i) { var m = MID[ORDEM[i]]; if (!m || !m.thumb || !m.thumb.naturalWidth) return null; return { el: m.thumb, w: m.thumb.naturalWidth, h: m.thumb.naturalHeight }; }
  function chave(i) { var m = MID[ORDEM[i]]; return m && m.tipo === "video" && m.el ? m.el.currentTime.toFixed(2) : ""; }

  /* ---------- vídeos no quadro certo ---------- */
  function buscar(v, t) { return new Promise(function (ok) { if (Math.abs(v.currentTime - t) < 0.002 && v.readyState >= 2) return ok();
    var feito = false, f = function () { if (!feito) { feito = true; v.removeEventListener("seeked", f); ok(); } }; v.addEventListener("seeked", f); v.currentTime = t; setTimeout(f, 2000); }); }
  function videosDoQuadro(t) { var lista = []; ORDEM.forEach(function (id, i) { var m = MID[id]; if (m && m.tipo === "video" && m.el && m.dur) lista.push({ m: m, t: B.tempoMidia(P, i, t, m.dur, ORDEM.length) }); }); return lista; }
  async function videosNoTempo(t) { var l = videosDoQuadro(t); for (var i = 0; i < l.length; i++) { if (!l[i].m.el.paused) l[i].m.el.pause(); await buscar(l[i].m.el, l[i].t); } }
  function videosTocando(t) { videosDoQuadro(t).forEach(function (x) { var v = x.m.el; if (v.paused) { try { v.currentTime = x.t; } catch (e) {} v.play().catch(function () {}); } else if (Math.abs(v.currentTime - x.t) > 0.35) v.currentTime = x.t; }); }
  function pararVideos() { Object.keys(MID).forEach(function (id) { var m = MID[id]; if (m.el && m.tipo === "video" && !m.el.paused) m.el.pause(); }); }

  /* ---------- prévia ---------- */
  function medir() {
    var cv = $("alCv"), cel = innerWidth <= 1100, pal = cv.parentNode, larg = pal.clientWidth - 4, alt = cel ? innerHeight * 0.4 : FIXA && FIXA.fixo() ? Math.max(160, pal.clientHeight - 96) : Math.max(300, innerHeight - 260);
    var k = Math.min(larg / P.w, alt / P.h); ESC = Math.min(0.5, k * (window.devicePixelRatio || 1));
    cv.width = Math.round(P.w * ESC); cv.height = Math.round(P.h * ESC); cv.style.width = Math.round(P.w * k) + "px"; cv.style.height = Math.round(P.h * k) + "px";
  }
  function dur() { return B.duracao(P, ORDEM.length); }
  function desenharAgora() { var cv = $("alCv"); B.desenhar(cv.getContext("2d"), P, TEMPO, cv.width, cv.height, viva, { nMidias: ORDEM.length, cache: CACHE, chave: chave, leve: innerWidth <= 1100, textura: 700 }); }
  function relogio() { var d = dur(); $("alTempo").textContent = fmt(TEMPO) + " / " + fmt(d) + " s"; $("alScrub").max = String(Math.max(0.1, d)); if (document.activeElement !== $("alScrub")) $("alScrub").value = String(TEMPO); }
  var VER_T = 0;
  async function ver(t) { TEMPO = Math.max(0, Math.min(dur(), t)); relogio(); var meu = ++VER_T; desenharAgora(); if (!ORDEM.some(function (id) { return MID[id] && MID[id].tipo === "video"; })) return; await videosNoTempo(TEMPO); if (meu === VER_T && !TOCANDO) desenharAgora(); }
  function tocar() {
    if (TOCANDO) { TOCANDO = false; $("alTocar").textContent = "▶ TOCAR"; pararVideos(); if (SOM && SOM.el) SOM.el.pause(); ver(TEMPO); return; }
    var d = dur(); TOCANDO = true; $("alTocar").textContent = "❚❚ PAUSAR"; if (TEMPO >= d - 0.05) TEMPO = 0;
    var t0 = performance.now() - TEMPO * 1000;
    if (SOM && SOM.el) { SOM.el.currentTime = (+P.musica.inicio || 0) + TEMPO; SOM.el.volume = +P.musica.volume; SOM.el.play().catch(function () {}); }
    (function passo(agora) { if (!TOCANDO) return; var t = Math.max(0, (agora - t0) / 1000); d = dur(); if (t >= d) { t0 = agora; t = 0; if (SOM && SOM.el) SOM.el.currentTime = +P.musica.inicio || 0; }
      TEMPO = t; videosTocando(t); desenharAgora(); relogio(); requestAnimationFrame(passo); })(performance.now());
  }

  /* ---------- galeria de modelos (miniaturas animadas só quando à vista) ---------- */
  var MINIS = [], VISIVEIS = {};
  function desenharCats() { $("alCats").innerHTML = B.CATS.map(function (c) { var q = c[0] === "todos" ? B.MODELOS.length : B.MODELOS.filter(function (m) { return m.cat === c[0]; }).length; return '<button type="button" data-cat="' + c[0] + '"' + (CAT === c[0] ? ' class="on"' : "") + ">" + c[1] + " · " + q + "</button>"; }).join(""); }
  function desenharModelos() {
    var lista = B.MODELOS.filter(function (m) { return CAT === "todos" || m.cat === CAT; }), rot = { "3d": "3D", album: "ÁLBUM", efeitos: "EFEITO" };
    $("alQtd").textContent = "· " + B.MODELOS.length;
    $("alMods").innerHTML = lista.map(function (m) { return '<button class="al-md' + (P && P.modelo === m.id ? " on" : "") + '" type="button" data-mod="' + m.id + '" title="' + esc(m.desc) + '"><canvas width="96" height="150"></canvas><i>' + rot[m.cat] + "</i><span>" + esc(m.nome) + "</span></button>"; }).join("");
    MINIS = [].map.call($("alMods").querySelectorAll(".al-md"), function (b) { return { id: b.getAttribute("data-mod"), cv: b.querySelector("canvas"), cache: {}, el: b }; });
    if (window.IntersectionObserver) { var io = desenharModelos.io || (desenharModelos.io = new IntersectionObserver(function (es) { es.forEach(function (e) { VISIVEIS[e.target.getAttribute("data-mod")] = e.isIntersecting; }); }));
      io.disconnect(); MINIS.forEach(function (x) { io.observe(x.el); }); } else MINIS.forEach(function (x) { VISIVEIS[x.id] = true; });
    var ar = P ? P.w / P.h : 9 / 16; MINIS.forEach(function (x) { x.cv.height = Math.round(96 / Math.max(0.5, Math.min(1.8, ar))); x.cv.style.aspectRatio = x.cv.width + "/" + x.cv.height; desenharMini(x, 1.2); });
  }
  function desenharMini(x, t) { var Pm = { modelo: x.id, fundo: P && P.fundo, cartao: P && P.cartao, numeros: true, sombra: false, borda: P && P.borda, cantos: P && P.cantos }, D = B.duracao(Pm, ORDEM.length);
    try { B.desenhar(x.cv.getContext("2d"), Pm, t % D, x.cv.width, x.cv.height, mini, { nMidias: ORDEM.length, cache: x.cache, leve: true, textura: 120, semSombra: true }); } catch (e) {} }
  var MINI_T = 0;
  function animarMinis(agora) {
    requestAnimationFrame(animarMinis);
    if (agora - MINI_T < 70) return; MINI_T = agora;
    var aba = $("alGrade").getAttribute("data-aba"); if (innerWidth <= 1100 && aba !== "mod") return; if (document.hidden) return;
    var vis = MINIS.filter(function (x) { return VISIVEIS[x.id]; }); if (TOCANDO && vis.length > 6) vis = vis.filter(function (x, i) { return (Math.floor(agora / 70) + i) % 3 === 0; });
    vis.forEach(function (x) { desenharMini(x, agora / 1000); });
  }
  function escolherModelo(id, quieto) {
    var md = B.POR[id]; if (!md) return; P.modelo = id; P.tp = null;
    if (md.borda && !P.bordaTocada) P.borda = md.borda; else if (!md.borda && !P.bordaTocada) P.borda = "nenhuma";
    if (!P.fundoTocado) P.fundo = md.fundo || "escuro";
    limparCache(); [].forEach.call($("alMods").querySelectorAll(".al-md"), function (b) { b.classList.toggle("on", b.getAttribute("data-mod") === id); });
    TEMPO = 0; mudou(); desenharVisual(); info();
    if (!TOCANDO) tocar();
    if (!quieto) aviso("Modelo: " + md.nome + ". " + (ORDEM.length ? "" : "Agora ponha as suas fotos e vídeos (＋ FOTOS E VÍDEOS)."));
  }
  function info() { var md = B.modelo(P), n = B.quantos(P, ORDEM.length);
    $("alInfo").innerHTML = "<b>" + esc(md.nome) + "</b> — " + esc(md.desc) + "<br>" + (ORDEM.length ? n + " espaço(s) com as suas mídias" : md.nPad + " espaços numerados (exemplo)") + " · " + fmt(dur()) + " s"; }

  /* ---------- ajustes ---------- */
  var BORDAS = [["nenhuma", "Sem moldura"], ["fina", "Fio branco"], ["branca", "Branca"], ["polaroid", "Polaroid"], ["cor", "Cor"], ["neon", "Neon"]];
  var FUNDOS = [["escuro", "Escuro"], ["estudio", "Estúdio"], ["claro", "Claro"], ["cor", "Cor"], ["degrade", "Degradê"], ["foto", "1ª foto desfocada"], ["papel", "Papel"], ["madeira", "Madeira"], ["linho", "Linho"], ["verde", "Verde (chroma)"], ["azul", "Azul (chroma)"], ["magenta", "Magenta (chroma)"]];
  var CARTOES = [["auto", "Automático"], ["3:4", "3:4"], ["4:5", "4:5"], ["1:1", "1:1"], ["2:3", "2:3"], ["9:16", "9:16"], ["16:9", "16:9"]];
  function chips(nome, lista, atual) { return '<div class="al-chips" data-grupo="' + nome + '">' + lista.map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (atual === x[0] ? ' class="on"' : "") + ">" + x[1] + "</button>"; }).join("") + "</div>"; }
  function desenharVisual() {
    var md = B.modelo(P), tp = P.tp || md.tela ? (P.tp || md.tp) : (P.tp || md.tp);
    $("alVisual").innerHTML =
      '<label>Tempo por foto<input type="range" id="alTp" min="0.3" max="4" step="0.1" value="' + tp + '"><output>' + fmt(tp) + ' s</output></label>' +
      (BATIDA ? '<div class="al-linha" style="margin-top:0"><button class="al-bt mini" type="button" id="alNaBatida">♫ NA BATIDA DA MÚSICA (' + Math.round(60 / BATIDA) + ' BPM)</button></div>' : "") +
      (md.tela ? '<p class="al-dica">Efeito de tela cheia: cada foto/vídeo ocupa a tela toda.</p>' :
        "<b class=\"al-dica\" style=\"display:block;color:#B9C0CC\">Formato do cartão</b>" + chips("cartao", CARTOES, P.cartao || "auto") +
        "<b class=\"al-dica\" style=\"display:block;color:#B9C0CC\">Moldura</b>" + chips("borda", BORDAS, P.borda || "nenhuma") +
        (P.borda === "cor" || P.borda === "neon" ? '<label class="um">Cor da moldura<input type="color" id="alBordaCor" value="' + esc(P.bordaCor || "#B6FF3B") + '"></label>' : "") +
        '<label>Cantos<input type="range" id="alCantos" min="0" max="0.25" step="0.01" value="' + (P.cantos == null ? 0.06 : P.cantos) + '"><output>' + Math.round((P.cantos == null ? 0.06 : P.cantos) * 100) + '</output></label>' +
        '<label class="um">Sombra<input type="checkbox" id="alSombra"' + (P.sombra !== false ? " checked" : "") + "></label>" +
        '<label class="um">Verso do cartão<select id="alVerso"><option value="">Do modelo</option><option value="espelho"' + (P.verso === "espelho" ? " selected" : "") + '>A foto vista por trás</option><option value="papel"' + (P.verso === "papel" ? " selected" : "") + ">Papel (como foto impressa)</option></select></label>") +
      "<b class=\"al-dica\" style=\"display:block;color:#B9C0CC\">Fundo</b>" + chips("fundo", FUNDOS, P.fundo || md.fundo || "escuro") +
      (P.fundo === "cor" || P.fundo === "degrade" ? '<label class="um">Cor<input type="color" id="alFundoCor" value="' + esc(P.fundoCor || "#0B0E14") + '"></label>' : "") +
      (P.fundo === "degrade" ? '<label class="um">2ª cor<input type="color" id="alFundoCor2" value="' + esc(P.fundoCor2 || "#3B1D6B") + '"></label>' : "") +
      (/verde|azul|magenta/.test(P.fundo || "") ? '<p class="al-dica">Fundo de recorte: no editor (ou no CapCut) use CHROMA KEY nessa cor para pôr o álbum por cima de outro vídeo.</p>' : "") +
      '<label class="um">Números nos espaços vazios<input type="checkbox" id="alNumeros"' + (P.numeros !== false ? " checked" : "") + "></label>";
  }
  function desenharTitulo() {
    $("alTitulo").innerHTML = '<label class="um">Título<input type="text" id="alTit" maxlength="60" placeholder="Ex.: Casamento Ana & Léo" value="' + esc(P.titulo || "") + '"></label>' +
      '<label class="um">Subtítulo<input type="text" id="alSub" maxlength="80" placeholder="Ex.: 22 de novembro de 2026" value="' + esc(P.sub || "") + '"></label>' +
      '<label class="um">Quando<select id="alTitQ">' + [["ambos", "No começo e no fim"], ["inicio", "Só no começo"], ["fim", "Só no fim"], ["sempre", "O tempo todo"], ["nunca", "Esconder"]].map(function (x) { return '<option value="' + x[0] + '"' + ((P.tituloQuando || "ambos") === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label>" +
      '<label class="um">Onde<select id="alTitPos">' + [["topo", "Em cima"], ["meio", "No meio"], ["baixo", "Embaixo"]].map(function (x) { return '<option value="' + x[0] + '"' + ((P.tituloPos || "topo") === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select></label>" +
      '<label class="um">Cor<input type="color" id="alTitCor" value="' + esc(P.tituloCor || "#FFFFFF") + '"></label>';
  }

  /* ---------- música ---------- */
  async function abrirSom(blob) {
    var url = URL.createObjectURL(blob), el = new Audio(url); el.preload = "auto";
    var buf = null; try { var ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 48000); buf = await ac.decodeAudioData(await blob.arrayBuffer()); } catch (e) { buf = null; }
    SOM = { url: url, el: el, buf: buf }; BATIDA = buf ? acharBatida(buf) : 0;
  }
  function acharBatida(buf) {
    var d = buf.getChannelData(0), sr = buf.sampleRate, bloco = Math.round(sr * 0.01), n = Math.min(Math.floor(d.length / bloco), 6000), en = new Float32Array(n), on = new Float32Array(n);
    for (var i = 0; i < n; i++) { var s = 0; for (var j = 0; j < bloco; j++) { var x = d[i * bloco + j]; s += x * x; } en[i] = Math.sqrt(s / bloco); }
    for (i = 1; i < n; i++) on[i] = Math.max(0, en[i] - en[i - 1]);
    var melhor = 0, lag = 0; for (var L = Math.round(60 / 180 / 0.01); L <= Math.round(60 / 70 / 0.01); L++) { var c = 0; for (i = L; i < n; i++) c += on[i] * on[i - L]; if (c > melhor) { melhor = c; lag = L; } }
    return lag ? +(lag * 0.01).toFixed(3) : 0;
  }
  function desenharMusica() {
    var m = P.musica || {}, tem = !!(SOM && m.id);
    $("alMusica").innerHTML = '<div class="al-linha" style="margin-top:0"><button class="al-bt mini" type="button" id="alSomEscolher">' + (tem ? "TROCAR MÚSICA" : "＋ ESCOLHER MÚSICA") + "</button>" + (tem ? '<button class="al-bt mini perigo" type="button" id="alSomTirar">TIRAR</button>' : "") + "</div>" +
      (tem ? '<p class="al-dica">♫ ' + esc(m.nome || "música") + (BATIDA ? " · " + Math.round(60 / BATIDA) + " BPM" : "") + "</p>" +
        '<label>Volume<input type="range" id="alSomVol" min="0" max="1" step="0.05" value="' + (+m.volume) + '"><output>' + Math.round(m.volume * 100) + '%</output></label>' +
        '<label class="um">Começar em (s)<input type="text" inputmode="decimal" id="alSomIni" value="' + (+m.inicio || 0) + '"></label>' : '<p class="al-dica">Use música com licença (sua, de banco com licença ou feita por IA com direito comercial).</p>');
  }

  /* ---------- salvar / desfazer ---------- */
  function foto() { var a = P.atualizado; P.atualizado = 0; var s = JSON.stringify(P); P.atualizado = a; return s; }
  function salvarJa() { if (!P) return; P.atualizado = Date.now(); op("projetos", "readwrite", function (s) { return s.put({ id: P.id, nome: P.nome, atualizado: P.atualizado, projeto: P }); }).catch(function () {}); try { localStorage.setItem("ui_album_ultimo", P.id); } catch (e) {} }
  function mudou() {
    clearTimeout(SALVAR_T); SALVAR_T = setTimeout(function () { salvarJa(); desenharProjetos(); }, 600);
    clearTimeout(HIST_T); HIST_T = setTimeout(gravarHist, 300); relogio(); info(); if (!TOCANDO) ver(TEMPO);
  }
  function gravarHist() { clearTimeout(HIST_T); var s = foto(); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } }
  function desfazer() { gravarHist(); if (HIST.length < 2) return; FUT.push(HIST.pop()); P = JSON.parse(HIST[HIST.length - 1]); depoisDeTrocar(); }
  function refazer() { if (!FUT.length) return; var s = FUT.pop(); HIST.push(s); P = JSON.parse(s); depoisDeTrocar(); }
  function depoisDeTrocar() { ORDEM = (P.ordem || ORDEM).filter(function (id) { return MID[id]; }); limparCache(); desenharTudo(); clearTimeout(SALVAR_T); SALVAR_T = setTimeout(salvarJa, 400); }
  async function desenharProjetos() {
    var l = []; try { l = await op("projetos", "readonly", function (s) { return s.getAll(); }); } catch (e) {}
    l = (l || []).sort(function (a, b) { return b.atualizado - a.atualizado; });
    $("alProjetos").innerHTML = '<div class="al-linha" style="margin:0 0 6px"><button class="al-bt mini" type="button" data-pnovo="1">＋ NOVO PROJETO</button></div>' + l.map(function (p) {
      return '<div class="al-linha" style="margin:4px 0;align-items:center"><span style="flex:1 1 auto;min-width:0;font:700 12px Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p.id === P.id ? "▶ " : "") + esc(p.nome || "Sem nome") + '</span><button class="al-bt mini" type="button" data-pabrir="' + esc(p.id) + '" style="flex:none">ABRIR</button><button class="al-bt mini perigo" type="button" data-papagar="' + esc(p.id) + '" style="flex:none" aria-label="Apagar projeto">✕</button></div>';
    }).join("");
  }
  function livreVisivel() { var l = $("alLivre"); if (l) l.hidden = !(P && P.formato === "livre"); }
  function novoProjeto(f) { var t = FORMATOS[f] || FORMATOS["9:16"]; return { v: 1, id: uid(), nome: "Meu álbum 3D", formato: f || "9:16", w: t[0], h: t[1], modelo: "anel", tp: null, cartao: "auto", borda: "nenhuma", bordaCor: "#B6FF3B", cantos: 0.06, sombra: true, verso: "", fundo: "escuro", fundoCor: "#0B0E14", fundoCor2: "#3B1D6B", numeros: true, titulo: "", sub: "", tituloQuando: "ambos", tituloPos: "topo", tituloCor: "#FFFFFF", musica: { id: "", nome: "", volume: 0.8, inicio: 0 }, ordem: [] }; }
  async function abrirProjeto(reg) {
    salvarJa(); P = reg.projeto; ORDEM = (P.ordem || []).filter(function (id) { return MID[id]; });
    SOM = null; BATIDA = 0; if (P.musica && P.musica.id) { var r = await op("midias", "readonly", function (s) { return s.get(P.musica.id); }).catch(function () { return null; }); if (r) await abrirSom(r.blob); }
    TEMPO = 0; HIST = [foto()]; FUT = []; limparCache(); desenharTudo();
  }
  function desenharTudo() { $("alNome").value = P.nome || ""; $("alFmt").value = P.formato; if (P.formato === "livre") { $("alLarg").value = P.w; $("alAlt").value = P.h; } livreVisivel(); medir(); desenharMidias(); desenharMusica(); desenharVisual(); desenharTitulo(); desenharCats(); desenharModelos(); desenharProjetos(); info(); relogio(); ver(TEMPO); }

  /* ---------- gerar vídeo ---------- */
  var EXP = { parar: false, url: "", arquivo: null };
  async function somDoVideo(d) {
    if (!SOM || !SOM.buf) return null;
    var ini = +P.musica.inicio || 0, vol = +P.musica.volume, SR = 48000, n = Math.round(d * SR), ctx = new OfflineAudioContext(2, n, SR), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = SOM.buf; src.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(vol, 0); g.gain.setValueAtTime(vol, Math.max(0, d - 1.2)); g.gain.linearRampToValueAtTime(0, d);
    src.start(0, ini); var r = await ctx.startRendering(); return { L: r.getChannelData(0), R: r.getChannelData(1) };
  }
  async function qualidades() {
    var menor = Math.min(P.w, P.h), sel = $("alQual"), ops = [], vistos = {};
    [["Rápida", 720], ["Alta", 1080], ["Tamanho real", menor], ["4K", 2160]].forEach(function (q) { var h = Math.round(P.h * q[1] / menor / 2) * 2; if (Math.max(h, P.w * h / P.h) > 4096) return; if (!vistos[h]) { vistos[h] = 1; ops.push([q[0], h]); } });
    sel.innerHTML = ops.map(function (q) { var w = Math.round(P.w * q[1] / P.h / 2) * 2; return '<option value="' + q[1] + '">' + q[0] + " (" + w + "×" + q[1] + ")</option>"; }).join("");
    sel.value = String(ops[innerWidth <= 1100 ? 0 : Math.min(1, ops.length - 1)][1]);
    if (window.BWReelsCelular && BWReelsCelular.cabe) for (var i = 0; i < sel.options.length; i++) { var o = sel.options[i], h = +o.value, w = Math.round(P.w * h / P.h / 2) * 2;
      if (!(await BWReelsCelular.cabe(w, h))) { o.disabled = true; o.textContent += " — não cabe neste aparelho"; if (sel.value === o.value) sel.value = sel.options[0].value; } }
  }
  async function gerar() {
    var d = dur();
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) return aviso("Este navegador não grava vídeo — use o Chrome ou o app BW", true);
    if (TOCANDO) tocar();
    var actx = null; try { actx = SOM ? new (window.AudioContext || window.webkitAudioContext)() : null; } catch (e) { actx = null; }   // nasce no toque (iPhone)
    EXP.parar = false; $("alProg").hidden = false; $("alPronto").hidden = true; $("alGerar").disabled = true;
    var cx = {};
    try {
      $("alProgTxt").textContent = "Preparando o som…"; var som = await somDoVideo(d);
      var hq = Number($("alQual").value), wq = Math.round(P.w * hq / P.h / 2) * 2;
      var res = await BWReelsCelular.gerar({ largura: wq, altura: hq, fps: 30, duracao: d, som: som, audioCtx: actx, alturaSaida: Number($("alQual").value),
        desenhar: async function (t, ctx, w, h) { await videosNoTempo(t); B.desenhar(ctx, P, t, w, h, viva, { nMidias: ORDEM.length, cache: cx, chave: chave, textura: 1024 }); },
        cancelar: function () { return EXP.parar; }, aoProgredir: function (p) { $("alBarra").value = p.pct; $("alProgTxt").textContent = p.etapa + "… " + p.pct + "%"; } });
      if (EXP.url) URL.revokeObjectURL(EXP.url);
      var nome = (P.nome || "album-3d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "album-3d";
      EXP.arquivo = new File([res.blob], nome + ".mp4", { type: "video/mp4" }); EXP.url = URL.createObjectURL(res.blob);
      if (window.BWCriacoes) BWCriacoes.aoLado("alBaixar", { ferramenta: "album", arquivo: function () { return EXP.arquivo; }, nome: function () { return P.nome; }, projeto: function () { return P.id; }, tipo: "video" });
      $("alVideo").src = EXP.url; $("alBaixar").href = EXP.url; $("alBaixar").download = nome + ".mp4"; $("alPronto").hidden = false;
      $("alProgTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + fmt(d) + " s" + (som ? res.comSom ? ", com a música" : ", sem som — este aparelho não gravou o áudio" : ", sem música") + ").";
    } catch (e) { $("alProgTxt").textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); }
    finally { $("alGerar").disabled = false; if (actx) actx.close().catch(function () {}); ver(TEMPO); }
  }

  function aba(a) { $("alGrade").setAttribute("data-aba", a); [].forEach.call($("alAbas").children, function (b) { b.classList.toggle("on", b.getAttribute("data-aba") === a); }); }

  async function iniciar() {
    var regs = []; try { regs = await op("midias", "readonly", function (s) { return s.getAll(); }); } catch (e) {}
    for (var i = 0; i < regs.length; i++) if (regs[i].tipo !== "musica") MID[regs[i].id] = await abrirMidia(regs[i]);
    var ult = null, q = new URLSearchParams(location.search); try { ult = localStorage.getItem("ui_album_ultimo"); } catch (e) {}
    if (q.get("p")) ult = q.get("p");
    var r = ult ? await op("projetos", "readonly", function (s) { return s.get(ult); }).catch(function () { return null; }) : null;
    if (r && r.projeto) await abrirProjeto(r); else { P = novoProjeto("9:16"); ORDEM = Object.keys(MID); P.ordem = ORDEM.slice(); HIST = [foto()]; desenharTudo(); }
    if (q.get("m") && B.POR[q.get("m")]) escolherModelo(q.get("m"), true);
    var uw = parseInt(q.get("w"), 10), uh = parseInt(q.get("h"), 10); if (uw > 79 && uh > 79 && uw < 4097 && uh < 4097) { P.w = uw - uw % 2; P.h = uh - uh % 2; P.formato = "livre"; $("alFmt").value = "livre"; $("alLarg").value = P.w; $("alAlt").value = P.h; livreVisivel(); medir(); mudou(); }

    if (window.BWFerr && BWFerr.previa) PREVIA = BWFerr.previa({ palco: document.querySelector(".al-palco"), alvo: $("alCv"), canvas: function () { return $("alCv"); }, nome: "album", zoom: true, aviso: aviso,
      api: { tocar: function () { if (!TOCANDO) tocar(); }, parar: function () { if (TOCANDO) tocar(); }, tocando: function () { return TOCANDO; }, irPara: function (t) { if (TOCANDO) tocar(); ver(t); }, T: function () { return TEMPO; }, total: dur, desfazer: desfazer, refazer: refazer },
      extras: function () { return [{ icone: "🎲", rot: "Outro modelo (surpresa)", fn: function () { $("alSorte").click(); } }]; } });
    if (window.BWFerr) {
      FIXA = BWFerr.telaFixa({ wrap: document.querySelector(".wrap"), grade: $("alGrade"), palco: document.querySelector(".al-palco"), rola: [], painelLer: function () { try { return JSON.parse(localStorage.getItem("ui_album_paineis") || "{}"); } catch (e) { return {}; } }, painelGravar: function (S) { try { localStorage.setItem("ui_album_paineis", JSON.stringify(S)); } catch (e) {} }, some: [document.querySelector(".wrap > .al-nota")], aviso: $("alAviso"), aoMedir: function () { if (P) { medir(); if (!TOCANDO) ver(TEMPO); } } });
      BWFerr.atalhos({ "espaco, k": function () { tocar(); }, "home": function () { ver(0); }, "ctrl+z": desfazer, "ctrl+shift+z, ctrl+y": refazer, "ctrl+i": function () { $("alArq").click(); }, "ctrl+m, ctrl+e": function () { $("alExportar").click(); }, "ctrl+s": function () { salvarJa(); aviso("✓ Salvo neste aparelho."); },
        "arrowright": function () { trocarVizinho(1); }, "arrowleft": function () { trocarVizinho(-1); } });
      BWFerr.ajuda("ATALHOS DO ÁLBUM 3D", [["#", "TOCAR"], ["Espaço / K", "tocar / pausar"], ["Home", "voltar ao começo"], ["← / →", "modelo anterior / próximo"], ["#", "EDITAR"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"], ["Ctrl+I", "pôr fotos e vídeos"], ["Ctrl+S", "salvar"], ["Ctrl+M", "gerar o vídeo"], ["?", "esta lista"]]);
    }
    function trocarVizinho(d) { var l = B.MODELOS.filter(function (m) { return CAT === "todos" || m.cat === CAT; }), i = l.map(function (m) { return m.id; }).indexOf(P.modelo); escolherModelo(l[(i + d + l.length) % l.length].id); var b = $("alMods").querySelector(".al-md.on"); if (b && b.scrollIntoView) b.scrollIntoView({ block: "nearest" }); }
    if (window.BWDobras) BWDobras.aplicar(document);
    requestAnimationFrame(animarMinis);

    $("alCats").addEventListener("click", function (e) { var b = e.target.closest("[data-cat]"); if (!b) return; CAT = b.getAttribute("data-cat"); desenharCats(); desenharModelos(); });
    $("alMods").addEventListener("click", function (e) { var b = e.target.closest("[data-mod]"); if (b) escolherModelo(b.getAttribute("data-mod")); });
    $("alSorte").onclick = function () { var l = B.MODELOS.filter(function (m) { return m.id !== P.modelo; }); escolherModelo(l[Math.floor(Math.random() * l.length)].id); };
    $("alImportar").onclick = function () { $("alArq").value = ""; $("alArq").click(); };
    $("alArq").addEventListener("change", function () { if (this.files.length) importar([].slice.call(this.files)); });
    var solta = $("alSolta");
    ["dragenter", "dragover"].forEach(function (ev) { solta.addEventListener(ev, function (e) { e.preventDefault(); solta.classList.add("sobre"); }); });
    ["dragleave", "drop"].forEach(function (ev) { solta.addEventListener(ev, function (e) { e.preventDefault(); solta.classList.remove("sobre"); }); });
    solta.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) importar([].slice.call(e.dataTransfer.files)); });
    document.addEventListener("dragover", function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], "Files") >= 0) e.preventDefault(); });
    document.addEventListener("drop", function (e) { if (e.target.closest("#alSolta")) return; if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); importar([].slice.call(e.dataTransfer.files)); } });
    $("alMidias").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-tirar")) tirarMidia(b.getAttribute("data-tirar"));
      if (b.hasAttribute("data-mover")) { var id = b.getAttribute("data-mover"), i = ORDEM.indexOf(id), j = i + Number(b.getAttribute("data-d")); if (j < 0 || j >= ORDEM.length) return; ORDEM.splice(i, 1); ORDEM.splice(j, 0, id); P.ordem = ORDEM.slice(); limparCache(); desenharMidias(); mudou(); }
    });
    $("alVisual").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return;
      var g = b.parentNode.getAttribute("data-grupo");
      if (g) { var v = b.getAttribute("data-v"); P[g] = v; if (g === "borda") P.bordaTocada = true; if (g === "fundo") P.fundoTocado = true; limparCache(); desenharVisual(); mudou(); return; }
      if (b.id === "alNaBatida" && BATIDA) { var md = B.modelo(P), alvo = P.tp || md.tp, k = Math.max(1, Math.round(alvo / BATIDA)); P.tp = +(k * BATIDA).toFixed(3); desenharVisual(); mudou(); aviso("♫ " + fmt(P.tp, 2) + " s por foto = " + k + " batida(s)."); } });
    $("alVisual").addEventListener("input", function (e) { var el = e.target;
      if (el.id === "alTp") { P.tp = Number(el.value); el.nextElementSibling.textContent = fmt(P.tp) + " s"; mudou(); }
      if (el.id === "alCantos") { P.cantos = Number(el.value); el.nextElementSibling.textContent = Math.round(P.cantos * 100); limparCache(); mudou(); }
      if (el.id === "alBordaCor") { P.bordaCor = el.value; limparCache(); mudou(); }
      if (el.id === "alFundoCor") { P.fundoCor = el.value; mudou(); } if (el.id === "alFundoCor2") { P.fundoCor2 = el.value; mudou(); }
      if (el.id === "alSombra") { P.sombra = el.checked; mudou(); } if (el.id === "alNumeros") { P.numeros = el.checked; limparCache(); mudou(); }
      if (el.id === "alVerso") { P.verso = el.value; mudou(); } });
    $("alTitulo").addEventListener("input", function (e) { var el = e.target, mapa = { alTit: "titulo", alSub: "sub", alTitQ: "tituloQuando", alTitPos: "tituloPos", alTitCor: "tituloCor" }; if (mapa[el.id]) { P[mapa[el.id]] = el.value; mudou(); if (!TOCANDO && el.id !== "alTitQ") ver(Math.min(1, dur())); } });
    $("alMusica").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return;
      if (b.id === "alSomEscolher") { $("alArqSom").value = ""; $("alArqSom").click(); }
      if (b.id === "alSomTirar") { if (SOM && SOM.el) SOM.el.pause(); SOM = null; BATIDA = 0; P.musica.id = ""; P.musica.nome = ""; desenharMusica(); desenharVisual(); mudou(); } });
    $("alMusica").addEventListener("input", function (e) { var el = e.target;
      if (el.id === "alSomVol") { P.musica.volume = Number(el.value); el.nextElementSibling.textContent = Math.round(el.value * 100) + "%"; if (SOM && SOM.el) SOM.el.volume = P.musica.volume; mudou(); }
      if (el.id === "alSomIni") { P.musica.inicio = Math.max(0, Number(String(el.value).replace(",", ".")) || 0); mudou(); } });
    $("alArqSom").addEventListener("change", async function () { var f = this.files[0]; if (!f) return;
      var blob = new Blob([await f.arrayBuffer()], { type: f.type || "audio/mpeg" }), reg = { id: uid(), nome: f.name, tipo: "musica", blob: blob };
      await op("midias", "readwrite", function (s) { return s.put(reg); }); await abrirSom(blob);
      if (!SOM.buf) aviso("Não consegui ler essa música neste navegador. Tente MP3 ou M4A.", true);
      P.musica = { id: reg.id, nome: f.name, volume: P.musica ? P.musica.volume : 0.8, inicio: 0 }; desenharMusica(); desenharVisual(); mudou();
      if (BATIDA) aviso("♫ Batida encontrada: " + Math.round(60 / BATIDA) + " BPM. Em AJUSTES, toque em ♫ NA BATIDA DA MÚSICA."); });
    $("alProjetos").addEventListener("click", async function (e) { var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-pnovo")) { salvarJa(); P = novoProjeto(P.formato === "livre" ? "9:16" : P.formato); P.ordem = ORDEM.slice(); TEMPO = 0; HIST = [foto()]; FUT = []; limparCache(); desenharTudo(); }
      if (b.hasAttribute("data-pabrir")) { var r2 = await op("projetos", "readonly", function (s) { return s.get(b.getAttribute("data-pabrir")); }); if (r2) abrirProjeto(r2); }
      if (b.hasAttribute("data-papagar")) { var id = b.getAttribute("data-papagar"); if (!confirm("Apagar este projeto? As fotos e vídeos continuam no aparelho.")) return; await op("projetos", "readwrite", function (s) { return s.delete(id); }); if (id === P.id) { P = novoProjeto("9:16"); P.ordem = ORDEM.slice(); desenharTudo(); } else desenharProjetos(); } });
    $("alNome").addEventListener("input", function () { P.nome = this.value.slice(0, 40); mudou(); });
    $("alFmt").addEventListener("change", function () { var v = this.value, f = v === "tela" ? telaAqui() : FORMATOS[v];
      if (f) { P.formato = v; P.w = f[0]; P.h = f[1]; }
      if (v === "livre") { P.formato = "livre"; $("alLarg").value = P.w; $("alAlt").value = P.h; }
      livreVisivel(); medir(); limparCache(); desenharModelos(); mudou();
      if (v === "tela") aviso("Tamanho da sua tela: " + P.w + " × " + P.h + " px. Em tela cheia (⋯ da prévia) o vídeo preenche tudo."); });
    function aplicarLivre() { var w = Math.max(240, Math.min(4096, parseInt($("alLarg").value, 10) || P.w)), h = Math.max(240, Math.min(4096, parseInt($("alAlt").value, 10) || P.h));
      P.w = w - w % 2; P.h = h - h % 2; P.formato = "livre"; $("alLarg").value = P.w; $("alAlt").value = P.h; medir(); limparCache(); desenharModelos(); mudou(); }
    $("alLarg").addEventListener("change", aplicarLivre); $("alAlt").addEventListener("change", aplicarLivre); livreVisivel();
    $("alTocar").onclick = tocar;
    $("alScrub").addEventListener("input", function () { if (TOCANDO) tocar(); ver(Number(this.value)); });
    $("alExportar").onclick = function () { if (TOCANDO) tocar(); $("alFolha").hidden = false; $("alProg").hidden = true; $("alPronto").hidden = true; qualidades();
      var nv = ORDEM.some(function (id) { return MID[id] && MID[id].tipo === "video"; });
      $("alExpDica").textContent = "Vídeo de " + fmt(dur()) + " s" + (SOM ? " com a música" : "") + "." + (ORDEM.length ? "" : " Ainda sem fotos: sai o exemplo com os números.") + (nv ? " Tem vídeo dentro dos cartões: cada quadro procura o ponto certo do take, então leva mais tempo (no celular, mais ainda)." : ""); };
    $("alFechar").onclick = function () { EXP.parar = true; $("alFolha").hidden = true; };
    $("alGerar").onclick = gerar; $("alCancelar").onclick = function () { EXP.parar = true; };
    $("alCompart").onclick = async function () { if (!EXP.arquivo) return; try { if (navigator.canShare && navigator.canShare({ files: [EXP.arquivo] })) await navigator.share({ files: [EXP.arquivo], title: P.nome }); else $("alBaixar").click(); } catch (e) {} };
    $("alAbas").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) { aba(b.getAttribute("data-aba")); if (FIXA) FIXA.aplicar(); } });
    addEventListener("resize", function () { medir(); if (!TOCANDO) ver(TEMPO); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") $("alFolha").hidden = true; if (!window.BWFerr && e.key === " " && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) { e.preventDefault(); tocar(); } });
    if (!r || !r.projeto) tocar();
    window.BWAlbumEditor = { projeto: function () { return P; }, midias: function () { return MID; }, ordem: function () { return ORDEM; }, ver: ver, tempo: function () { return TEMPO; }, tocando: function () { return TOCANDO; }, escolher: escolherModelo, previa: function () { return PREVIA; }, duracao: dur }; // testes
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
