/* TELAS EM MOVIMENTO — editor (20/11/2026, Claude).
   Fotos e takes → ✨ MONTAR SOZINHO (cenas no ritmo ou na batida da música, divisões de tela e transições do pacote) → ajuste cena por cena
   → GERAR VÍDEO no próprio aparelho (BWReelsCelular.gerar com desenhar: cada quadro desenhado em canvas, vídeo procurado no quadro certo).
   Mídias, música e projetos ficam SÓ neste aparelho (IndexedDB bw_telas). Este arquivo não envia nada para a internet. */
(function () {
  "use strict";
  var T = window.BWTelas, $ = function (id) { return document.getElementById(id); };
  var FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "4k-v": [2160, 3840], "4k-h": [3840, 2160] };
  function par(v) { v = Math.round(Number(v) || 0); return Math.max(240, Math.min(4096, v - v % 2)); }
  var PREVIA = null;
  function cenaNaAgulha() { var at = P && P.cenas.length ? T.ativas(P, TEMPO) : []; return at.length ? at[at.length - 1].i : -1; }
  var P = null, MID = {}, ORDEM = [], SEL = -1, TEMPO = 0, TOCANDO = false, HIST = [], FUT = [], SALVAR_T = 0, HIST_T = 0, SOM = null, BATIDA = 0;
  var PREVIA = { esc: 0.5 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, c) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c === undefined ? 1 : c, maximumFractionDigits: c === undefined ? 1 : c }); }
  function aviso(txt, erro) { if (window.BWAviso) BWAviso(txt, erro ? "erro" : ""); }   /* 23/11: aviso único */
  function uid() { return "m" + Math.random().toString(36).slice(2, 9); }
  var dorme = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() { if (DB) return DB; DB = new Promise(function (ok, erro) { var r = indexedDB.open("bw_telas", 1); r.onupgradeneeded = function () { var d = r.result; d.createObjectStore("midias", { keyPath: "id" }); d.createObjectStore("projetos", { keyPath: "id" }); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); return DB; }
  async function op(loja, modo, f) { var d = await db(); return new Promise(function (ok, erro) { var tx = d.transaction(loja, modo), r = f(tx.objectStore(loja)); tx.oncomplete = function () { ok(r && r.result); }; tx.onerror = function () { erro(tx.error); }; }); }

  /* ---------- mídias ---------- */
  function abrirMidia(reg) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(reg.blob), m = { id: reg.id, nome: reg.nome, tipo: reg.tipo, url: url, w: reg.w || 0, h: reg.h || 0, dur: reg.dur || 0, thumb: null, el: null };
      var fim = function () { var th = new Image(); th.onload = function () { m.thumb = th; ok(m); }; th.onerror = function () { ok(m); }; th.src = reg.thumb || url; };
      if (reg.tipo === "video") {
        var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "metadata"; v.crossOrigin = "anonymous"; v.src = url;
        v.onloadedmetadata = function () { m.w = v.videoWidth; m.h = v.videoHeight; m.dur = v.duration || m.dur; }; m.el = v;
        v.onerror = function () { m.erro = true; }; fim();
      } else { var im = new Image(); im.onload = function () { m.w = im.naturalWidth; m.h = im.naturalHeight; m.el = im; fim(); }; im.onerror = function () { m.erro = true; fim(); }; im.src = url; }
    });
  }
  function miniatura(fonte, w, h) { var c = document.createElement("canvas"), k = Math.min(1, 360 / Math.max(w, h)); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext("2d").drawImage(fonte, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.8); }
  async function importar(arquivos) {
    var n = 0, ruins = [], novos = [];
    for (var i = 0; i < arquivos.length; i++) {
      var f = arquivos[i], tipo = /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name) ? "video" : /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name) ? "foto" : null;
      if (!tipo) { ruins.push(f.name); continue; }
      var blob = new Blob([await f.arrayBuffer()], { type: f.type || (tipo === "video" ? "video/mp4" : "image/jpeg") }); // cópia na memória (iPhone invalida o original)
      var nomeF = f.name;
      if (tipo === "foto" && window.BWHeic) try { var cv = await BWHeic.converterSePreciso(blob, f.name, function () { aviso("⏳ Convertendo a foto HEIC…"); }); if (cv) { blob = cv; nomeF = BWHeic.nomeJpg(f.name); } } catch (e) { }   /* 28/11: HEIC do iPhone fora do Safari */
      if (tipo === "video" && window.BWVideoIphone) try { var cvv = await BWVideoIphone.converterSePreciso(blob, f.name, function (p) { aviso("⏳ Convertendo " + String(f.name).slice(0, 24) + " · " + Math.round(p.pct || 0) + "%", "", 0); }); if (cvv) { blob = cvv.blob; nomeF = cvv.nome; aviso("✓ " + String(f.name).slice(0, 30) + " convertido"); } } catch (e) { console.warn("vídeo do iPhone", e); }   /* 28/11: HEVC/ProRes do iPhone fora do Safari */
      var reg = { id: uid(), nome: nomeF, tipo: tipo, blob: blob, w: 0, h: 0, dur: 0, thumb: "" };
      try {
        if (tipo === "foto") { var bmp = await createImageBitmap(blob); reg.w = bmp.width; reg.h = bmp.height; reg.thumb = miniatura(bmp, bmp.width, bmp.height); bmp.close && bmp.close(); }
        else {
          var v = document.createElement("video"), u = URL.createObjectURL(blob); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
          await new Promise(function (ok, erro) { v.onloadeddata = ok; v.onerror = function () { erro(new Error("formato")); }; setTimeout(function () { erro(new Error("demorou")); }, 15000); });
          reg.w = v.videoWidth; reg.h = v.videoHeight; reg.dur = v.duration;
          await new Promise(function (ok) { v.onseeked = ok; v.currentTime = Math.min(0.5, reg.dur / 2); setTimeout(ok, 3000); });
          reg.thumb = miniatura(v, reg.w, reg.h); try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} URL.revokeObjectURL(u);
        }
      } catch (e) { if (v && v.removeAttribute) { try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} } ruins.push(f.name + (tipo === "video" ? " (este navegador não abre esse formato de vídeo)" : "")); continue; }
      await op("midias", "readwrite", function (s) { return s.put(reg); });
      MID[reg.id] = await abrirMidia(reg); ORDEM.push(reg.id); novos.push(reg.id); n++;
    }
    P.ordem = ORDEM.slice(); mudou(); desenharMidias();
    if (n) aviso("＋ " + n + " arquivo(s). Toque em ✨ MONTAR SOZINHO para montar o vídeo com eles.");
    if (ruins.length) aviso("Não abriu: " + ruins.join(", ") + ". No iPhone, vídeo em HEVC abre melhor no Safari; no Windows, use MP4.", true);
    return novos;
  }
  function desenharMidias() {
    $("tlMidias").innerHTML = ORDEM.map(function (id, i) { var m = MID[id]; if (!m) return "";
      return '<div class="tl-mid" data-arr="m:' + id + '" title="' + esc(m.nome) + ' — arraste para a SEQUÊNCIA ou para uma cena">' + '<span class="tl-mais" data-mais role="button" aria-label="Opções da mídia">⋯</span>' + (m.thumb ? '<img src="' + esc(m.thumb.src) + '" alt="">' : "") + '<span class="n">' + (i + 1) + "</span>" +
        (m.tipo === "video" ? '<span class="v">▶ ' + fmt(m.dur || 0) + "s</span>" : "") + '<button class="x" type="button" data-tirar="' + id + '" aria-label="Tirar">✕</button>' +
        '<span class="mv"><button type="button" data-mover="' + id + '" data-d="-1" aria-label="Antes">◀</button><button type="button" data-mover="' + id + '" data-d="1" aria-label="Depois">▶</button></span></div>'; }).join("");
  }
  async function tirarMidia(id) {
    if (!confirm("Tirar esta mídia do aparelho? As cenas que usam ela ficam vazias.")) return;
    await op("midias", "readwrite", function (s) { return s.delete(id); }); if (MID[id]) URL.revokeObjectURL(MID[id].url); delete MID[id];
    ORDEM = ORDEM.filter(function (x) { return x !== id; }); P.ordem = ORDEM.slice();
    P.cenas.forEach(function (c) { c.midias = (c.midias || []).map(function (x) { return x === id ? "" : x; }); }); mudou(); desenharMidias();
  }
  function info(id) { var m = MID[id]; return m ? { tipo: m.tipo, dur: m.dur } : null; }
  function fonteViva(id, cena, k) { var m = MID[id]; if (!m || !m.el || !m.w) return { rotulo: id ? "carregando…" : "MÍDIA " + (k + 1) }; return { el: m.el, w: m.w, h: m.h }; }
  function fonteMini(id, cena, k) { var m = MID[id]; if (!m || !m.thumb) return { rotulo: "MÍDIA " + (k + 1) }; return { el: m.thumb, w: m.thumb.naturalWidth, h: m.thumb.naturalHeight }; }

  /* ---------- vídeos no quadro certo ---------- */
  function buscar(v, tempo) { return new Promise(function (ok) { if (Math.abs(v.currentTime - tempo) < 0.002 && v.readyState >= 2) return ok();
    var feito = false, f = function () { if (!feito) { feito = true; v.removeEventListener("seeked", f); ok(); } }; v.addEventListener("seeked", f); v.currentTime = tempo; setTimeout(f, 2000); }); }
  async function videosNoTempo(t) { var lista = T.videosEm(P, t, info); for (var i = 0; i < lista.length; i++) { var m = MID[lista[i].id]; if (m && m.el) { if (!m.el.paused) m.el.pause(); await buscar(m.el, lista[i].tempo); } } }
  function videosTocando(t) {
    var lista = T.videosEm(P, t, info), usados = {};
    lista.forEach(function (x) { var m = MID[x.id]; if (!m || !m.el) return; usados[x.id] = 1; var v = m.el;
      if (v.paused) { try { v.currentTime = x.tempo; } catch (e) {} v.play().catch(function () {}); } else if (Math.abs(v.currentTime - x.tempo) > 0.3) v.currentTime = x.tempo; });
    Object.keys(MID).forEach(function (id) { var m = MID[id]; if (m.el && m.tipo === "video" && !usados[id] && !m.el.paused) m.el.pause(); });
  }

  /* ---------- prévia ---------- */
  var FIXA = null;
  function medir() {
    var cv = $("tlCv"), cel = innerWidth <= 1100, pal = cv.parentNode, larg = pal.clientWidth - 4, alt = cel ? innerHeight * 0.36 : FIXA && FIXA.fixo() ? Math.max(160, pal.clientHeight - 62) : Math.max(300, innerHeight - 360);
    var k = Math.min(larg / P.w, alt / P.h); PREVIA.esc = Math.min(0.5, k * (window.devicePixelRatio || 1));
    cv.width = Math.round(P.w * PREVIA.esc); cv.height = Math.round(P.h * PREVIA.esc); cv.style.width = Math.round(P.w * k) + "px"; cv.style.height = Math.round(P.h * k) + "px";
    document.documentElement.style.scrollPaddingTop = cel ? Math.round(P.h * k + 70) + "px" : "";
  }
  function desenharAgora() { var cv = $("tlCv"); T.desenhar(cv.getContext("2d"), P, TEMPO, cv.width, cv.height, fonteViva); }
  function relogio() { var d = T.duracao(P); $("tlTempo").textContent = fmt(TEMPO) + " / " + fmt(d) + " s"; $("tlScrub").max = String(Math.max(0.1, d)); if (document.activeElement !== $("tlScrub")) $("tlScrub").value = String(TEMPO); }
  var VER_T = 0;
  async function ver(t) { TEMPO = Math.max(0, Math.min(T.duracao(P), t)); relogio(); var meu = ++VER_T; desenharAgora(); await videosNoTempo(TEMPO); if (meu === VER_T && !TOCANDO) desenharAgora(); }
  function tocar() {
    if (TOCANDO) { TOCANDO = false; $("tlTocar").textContent = "▶ TOCAR"; Object.keys(MID).forEach(function (id) { var m = MID[id]; if (m.el && m.tipo === "video") m.el.pause(); }); if (SOM && SOM.el) SOM.el.pause(); ver(TEMPO); return; }
    var d = T.duracao(P); if (!d) return aviso("Monte as cenas primeiro (✨ MONTAR SOZINHO).", true);
    TOCANDO = true; $("tlTocar").textContent = "❚❚ PAUSAR"; if (TEMPO >= d - 0.05) TEMPO = 0;
    var t0 = performance.now() - TEMPO * 1000;
    if (SOM && SOM.el) { SOM.el.currentTime = (+P.musica.inicio || 0) + TEMPO; SOM.el.volume = +P.musica.volume; SOM.el.play().catch(function () {}); }
    (function passo(agora) { if (!TOCANDO) return; var t = Math.max(0, (agora - t0) / 1000); if (t >= d) { t0 = agora; t = 0; if (SOM && SOM.el) SOM.el.currentTime = +P.musica.inicio || 0; }
      TEMPO = t; videosTocando(t); desenharAgora(); relogio(); requestAnimationFrame(passo); })(performance.now());
  }

  /* ---------- música: batida ---------- */
  async function abrirSom(blob) {
    var url = URL.createObjectURL(blob), el = new Audio(url); el.preload = "auto";
    var buf = null; try { var ac = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 1, 48000); buf = await ac.decodeAudioData(await blob.arrayBuffer()); } catch (e) { buf = null; }
    SOM = { url: url, el: el, buf: buf }; BATIDA = buf ? acharBatida(buf) : 0;
  }
  function acharBatida(buf) { // energia por bloco → picos → autocorrelação entre 70 e 180 BPM
    var d = buf.getChannelData(0), sr = buf.sampleRate, bloco = Math.round(sr * 0.01), n = Math.min(Math.floor(d.length / bloco), 6000), en = new Float32Array(n), on = new Float32Array(n);
    for (var i = 0; i < n; i++) { var s = 0; for (var j = 0; j < bloco; j++) { var x = d[i * bloco + j]; s += x * x; } en[i] = Math.sqrt(s / bloco); }
    for (i = 1; i < n; i++) on[i] = Math.max(0, en[i] - en[i - 1]);
    var melhor = 0, lag = 0; for (var L = Math.round(60 / 180 / 0.01); L <= Math.round(60 / 70 / 0.01); L++) { var c = 0; for (i = L; i < n; i++) c += on[i] * on[i - L]; if (c > melhor) { melhor = c; lag = L; } }
    return lag ? +(lag * 0.01).toFixed(3) : 0;
  }
  function desenharMusica() {
    var m = P.musica || {}, tem = !!(SOM && m.id);
    $("tlMusica").innerHTML = '<div class="tl-linha" style="margin-top:0"><button class="tl-bt mini" type="button" id="tlSomEscolher">' + (tem ? "TROCAR MÚSICA" : "＋ ESCOLHER MÚSICA") + "</button>" + (tem ? '<button class="tl-bt mini perigo" type="button" id="tlSomTirar">TIRAR</button>' : "") + "</div>" +
      (tem ? '<p class="tl-dica">♫ ' + esc(m.nome || "música") + (BATIDA ? " · batida a cada " + fmt(BATIDA, 2) + " s (" + Math.round(60 / BATIDA) + " BPM)" : "") + "</p>" +
        '<label>Volume<input type="range" id="tlSomVol" min="0" max="1" step="0.05" value="' + (+m.volume) + '"><output>' + Math.round(m.volume * 100) + '%</output></label>' +
        '<label class="um">Começar em (s)<input type="number" id="tlSomIni" min="0" step="0.5" value="' + (+m.inicio || 0) + '"></label>' +
        '<label class="um">Cortes na batida<input type="checkbox" id="tlSomBatida"' + (m.batida !== false ? " checked" : "") + (BATIDA ? "" : " disabled") + "></label>" : '<p class="tl-dica">Use música com licença (sua, de banco com licença ou feita por IA com direito comercial).</p>');
  }

  /* ---------- aparência ---------- */
  function desenharVisual() {
    $("tlVisual").innerHTML = '<label class="um">Cor do fundo<input type="color" id="tlFundo" value="' + esc(P.fundo || "#000000") + '"></label>' +
      '<label>Espaço entre telas<input type="range" id="tlGap" min="0" max="40" step="1" value="' + (+P.gap) + '"><output>' + (+P.gap) + "</output></label>" +
      '<p class="tl-dica">A cor e a transparência das LINHAS das transições ficam na faixa EFEITOS DE TELA, embaixo da sequência.</p>';
    desenharLinhas();
  }
  // LINHAS DAS TRANSIÇÕES: cor pronta, cor livre, SEM LINHA e transparência (pedido do dono, 20/11)
  var CORES_LINHA = [["#B6FF3B", "Verde neon"], ["#FFFFFF", "Branco"], ["#000000", "Preto"], ["#FFD166", "Dourado"], ["#FF4D8D", "Rosa"], ["#3FC1FF", "Azul"], ["#FF7A1A", "Laranja"]];
  function desenharLinhas() {
    var b = $("tlLinhas"); if (!b) return; var c = (P.contorno || "").toUpperCase(), op = P.contornoOp == null ? 100 : +P.contornoOp;
    b.innerHTML = '<span class="titulo">LINHAS</span><button type="button" class="tl-cor sem' + (!c ? " on" : "") + '" data-linha="" title="Sem linha" aria-label="Sem linha">∅</button>' +
      CORES_LINHA.map(function (k) { return '<button type="button" class="tl-cor' + (c === k[0] ? " on" : "") + '" data-linha="' + k[0] + '" style="background:' + k[0] + '" title="' + k[1] + '" aria-label="Linha ' + k[1] + '"></button>'; }).join("") +
      '<label class="tl-cor livre" title="Outra cor"><input type="color" id="tlLinhaCor" value="' + esc(P.contorno || "#B6FF3B") + '" aria-label="Outra cor de linha">🎨</label>' +
      '<label class="tl-linha-op">Transparência<input type="range" id="tlLinhaOp" min="0" max="100" step="5" value="' + (100 - op) + '"' + (!c ? " disabled" : "") + ' aria-label="Transparência da linha"><output>' + (100 - op) + '%</output></label>';
  }

  /* ---------- cena selecionada ---------- */
  var MINI = [], MINI2 = [];
  function desenharPainel() {
    var c = P.cenas[SEL], p = $("tlPainel"); MINI = [];
    $("tlSemCena").hidden = !!c; if (!c) { p.innerHTML = ""; return; }
    var n = T.LAYOUTS[c.layout || "cheia"].n, opc = function (sel) { return '<option value="">— vazio —</option>' + ORDEM.map(function (id, i) { var m = MID[id]; return '<option value="' + id + '"' + (sel === id ? " selected" : "") + ">" + (i + 1) + " · " + esc((m && m.nome || "").slice(0, 26)) + (m && m.tipo === "video" ? " ▶" : "") + "</option>"; }).join(""); };
    var h = '<div class="tl-linha" style="margin:0 0 8px"><strong style="font:800 13px Inter,sans-serif;margin-right:auto;align-self:center">CENA ' + (SEL + 1) + " de " + P.cenas.length + '</strong><button class="tl-bt mini" type="button" data-acao="antes" aria-label="Mover para antes">◀</button><button class="tl-bt mini" type="button" data-acao="depois" aria-label="Mover para depois">▶</button><button class="tl-bt mini" type="button" data-acao="dup" aria-label="Duplicar">⧉</button><button class="tl-bt mini perigo" type="button" data-acao="apagar" aria-label="Apagar cena">✕</button></div>';
    h += '<div class="tl-g"><h4 data-seta="tl_div">DIVISÃO DA TELA</h4><div><div class="tl-chips">' + Object.keys(T.LAYOUTS).map(function (k) { return '<button type="button" data-lay="' + k + '"' + (c.layout === k ? ' class="on"' : "") + ">" + esc(T.LAYOUTS[k].nome) + "</button>"; }).join("") + "</div>";
    for (var i = 0; i < n; i++) { var id = (c.midias || [])[i] || "", m = MID[id];
      h += '<label class="um">' + (n > 1 ? "Tela " + (i + 1) : "Mídia") + '<select data-mid="' + i + '">' + opc(id) + "</select></label>";
      if (m && m.tipo === "video") h += '<label>Começa no (s)<input type="range" data-desde="' + i + '" min="0" max="' + Math.max(0, (m.dur || 1) - 0.3).toFixed(1) + '" step="0.1" value="' + (+((c.desde || [])[i] || 0)) + '"><output>' + fmt(+((c.desde || [])[i] || 0)) + "</output></label>"; }
    h += "</div></div>";
    h += '<div class="tl-g"><h4 data-seta="tl_tempo">TEMPO E MOVIMENTO</h4><div><label>Duração<input type="range" id="tlDurC" min="0.3" max="8" step="0.1" value="' + c.dur + '"><output>' + fmt(c.dur) + ' s</output></label><div class="tl-chips">' +
      Object.keys(T.MOVS).map(function (k) { return '<button type="button" data-mov="' + k + '"' + (c.mov === k ? ' class="on"' : "") + ">" + esc(T.MOVS[k]) + "</button>"; }).join("") + "</div></div></div>";
    if (SEL > 0) {
      h += '<div class="tl-g"><h4 data-seta="tl_trans">TRANSIÇÃO DE ENTRADA</h4><div><div class="tl-trans">' + Object.keys(T.TRANS).map(function (k) { return '<button type="button" data-trans="' + k + '"' + (c.trans === k ? ' class="on"' : "") + '><canvas width="64" height="100" data-mini="' + k + '"></canvas><span>' + esc(T.TRANS[k].nome) + "</span></button>"; }).join("") + "</div>" +
        '<label>Duração<input type="range" id="tlTransDur" min="0.2" max="1.6" step="0.05" value="' + (c.transDur || 0.6) + '"><output>' + fmt(c.transDur || 0.6, 2) + " s</output></label>" +
        '<div class="tl-linha"><button class="tl-bt mini" type="button" data-acao="vertrans">▶ VER A TRANSIÇÃO</button><button class="tl-bt mini" type="button" data-acao="transtodas">USAR EM TODAS</button></div></div></div>';
    } else h += '<p class="tl-dica">A 1ª cena abre o vídeo (sem transição). As próximas escolhem como entram.</p>';
    p.innerHTML = h;
    [].forEach.call(p.querySelectorAll("canvas[data-mini]"), function (cv) { MINI.push({ cv: cv, k: cv.getAttribute("data-mini") }); });
  }
  // prévias das transições: peças verdes entrando sobre o escuro (como os pacotes de referência)
  var A_IMG = null, B_IMG = null;
  function quadro(c1, c2) { var c = document.createElement("canvas"); c.width = 90; c.height = 140; var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 90, 140); g.addColorStop(0, c1); g.addColorStop(1, c2); x.fillStyle = g; x.fillRect(0, 0, 90, 140); return c; }
  function animarMinis(agora) {
    var TODAS = MINI.concat(MINI2); if (TODAS.length && document.visibilityState === "visible") {
      if (!A_IMG) { A_IMG = quadro("#151a24", "#05070a"); B_IMG = quadro("#3BFF6A", "#0d8a33"); }
      var p = ((agora / 1000) % 1.8) / 1.3; p = Math.min(1, p);
      TODAS.forEach(function (m) { if (!m.cv.isConnected) return; var x = m.cv.getContext("2d"), W = m.cv.width, H = m.cv.height;
        var Pm = { fundo: "#000", contorno: P.contorno || "", contornoOp: P.contornoOp, cenas: [{ id: "a", layout: "cheia", midias: ["a"], dur: 1, mov: "nenhum" }, { id: "b" + m.k, layout: "cheia", midias: ["b"], dur: 1, mov: "nenhum", trans: m.k, transDur: 1 }] };
        T.desenhar(x, Pm, 1 + p * 0.999, W, H, function (id) { return id === "a" ? { el: A_IMG, w: 90, h: 140 } : { el: B_IMG, w: 90, h: 140 }; }); });
    }
    requestAnimationFrame(animarMinis);
  }

  /* ---------- sequência ---------- */
  function desenharFila() {
    var h = ""; P.cenas.forEach(function (c, i) {
      if (i) h += '<span class="tl-tr" data-tr="' + i + '" title="Transição — solte um efeito aqui para trocar">' + esc((T.TRANS[c.trans] || T.TRANS.corte).nome.toUpperCase()) + "</span>";
      h += '<button type="button" class="tl-cena' + (i === SEL ? " on" : "") + '" data-cena="' + i + '" data-arr="c:' + i + '"><span class="tl-mais" data-mais role="button" aria-label="Opções da cena">⋯</span><canvas width="84" height="149" data-cmini="' + i + '"></canvas><span>' + (i + 1) + " · " + esc(T.LAYOUTS[c.layout || "cheia"].nome) + " · " + fmt(c.dur) + "s</span></button>";
    });
    if (!P.cenas.length) h = '<div class="tl-vazio tl-soltaqui">Arraste fotos e vídeos para cá — ou toque em ✨ MONTAR SOZINHO.</div>';
    $("tlFila").innerHTML = h;
    [].forEach.call($("tlFila").querySelectorAll("canvas[data-cmini]"), function (cv) { var i = +cv.getAttribute("data-cmini"), c = P.cenas[i];
      var Pm = { fundo: P.fundo, gap: P.gap, contorno: P.contorno, contornoOp: P.contornoOp, cenas: [Object.assign({}, c, { trans: "corte" })] }; T.desenhar(cv.getContext("2d"), Pm, c.dur * 0.6, cv.width, cv.height, fonteMini); });
  }


  /* ---------- efeitos de tela (faixa para arrastar) ---------- */
  var EFX_ABA = "trans";
  function desenharEfx() {
    var box = $("tlEfx"); if (!box) return; MINI2 = [];
    [].forEach.call(document.querySelectorAll("[data-efxaba]"), function (b) { b.classList.toggle("on", b.getAttribute("data-efxaba") === EFX_ABA); });
    if (EFX_ABA === "trans") box.innerHTML = Object.keys(T.TRANS).map(function (k) { return '<button type="button" class="tl-efx-it" data-arr="t:' + k + '" title="Arraste para uma cena"><canvas width="54" height="84" data-mini="' + k + '"></canvas><span>' + esc(T.TRANS[k].nome) + "</span></button>"; }).join("");
    else box.innerHTML = Object.keys(T.LAYOUTS).map(function (k) { return '<button type="button" class="tl-efx-it" data-arr="l:' + k + '" title="Arraste para uma cena"><canvas width="54" height="84" data-lmini="' + k + '"></canvas><span>' + esc(T.LAYOUTS[k].nome) + "</span></button>"; }).join("");
    [].forEach.call(box.querySelectorAll("canvas[data-mini]"), function (cv) { MINI2.push({ cv: cv, k: cv.getAttribute("data-mini") }); });
    [].forEach.call(box.querySelectorAll("canvas[data-lmini]"), function (cv) { var x = cv.getContext("2d"), W = cv.width, H = cv.height, cores = ["#3BFF6A", "#7C5CFF", "#FFB547", "#3FC1FF"];
      x.fillStyle = "#000"; x.fillRect(0, 0, W, H); T.paineis(cv.getAttribute("data-lmini"), W, H, 4).forEach(function (p, i) { x.beginPath(); p.pts.forEach(function (q, j) { if (j) x.lineTo(q[0], q[1]); else x.moveTo(q[0], q[1]); }); x.closePath(); x.fillStyle = cores[i % 4]; x.globalAlpha = 0.85; x.fill(); x.globalAlpha = 1; }); });
  }
  // aplica um efeito (t:trans | l:layout) a uma cena
  function aplicarEfx(tipo, k, i, comoTrans) {
    var c = P.cenas[i]; if (!c) return;
    if (tipo === "t") { if (i === 0) return aviso("A 1ª cena abre o vídeo — solte da 2ª em diante", true);
      c.trans = k; c.transDur = c.transDur || 0.6; aviso("✓ Transição “" + T.TRANS[k].nome + "” na cena " + (i + 1) + "."); }
    else { c.layout = k; var n = T.LAYOUTS[k].n, base = ORDEM.indexOf(c.midias[0]); c.midias = (c.midias || []).slice(0, Math.max(n, 1));
      while (c.midias.length < n) c.midias.push(ORDEM[(base + c.midias.length) % Math.max(1, ORDEM.length)] || "");
      c.desde = c.midias.map(function (x, j) { return (c.desde || [])[j] || 0; }); aviso("✓ Divisão “" + T.LAYOUTS[k].nome + "” na cena " + (i + 1) + "."); }
    SEL = i; mudou({ painel: true });
    var ini = T.inicios(P)[i] || 0; if (!TOCANDO) ver(ini + (tipo === "t" ? Math.min(0.3, c.dur / 2) : Math.min(0.9, c.dur)));
  }
  // em qual tela (painel) de uma cena caiu o ponto (fx, fy em fração 0–1)
  function painelEm(c, fx, fy) {
    var W = 1000, H = Math.round(1000 * P.h / P.w), ps = T.paineis(c.layout || "cheia", W, H, 10), x = fx * W, y = fy * H, achou = 0;
    ps.forEach(function (p, i) { var dentro = false, q = p.pts; for (var a = 0, b = q.length - 1; a < q.length; b = a++) { if ((q[a][1] > y) !== (q[b][1] > y) && x < (q[b][0] - q[a][0]) * (y - q[a][1]) / (q[b][1] - q[a][1]) + q[a][0]) dentro = !dentro; } if (dentro) achou = i; });
    return achou;
  }
  function midiaNaCena(id, i, fx, fy) {
    var c = P.cenas[i]; if (!c) return; var k = painelEm(c, fx, fy); c.midias = c.midias || []; c.midias[k] = id; c.desde = c.desde || []; c.desde[k] = 0;
    SEL = i; mudou({ painel: true }); var n = T.LAYOUTS[c.layout || "cheia"].n;
    aviso("✓ Mídia trocada na cena " + (i + 1) + (n > 1 ? " (tela " + (k + 1) + ")" : "") + ".");
  }
  function novaCenaCom(id, pos) {
    var lista = (T.PACOTES[P.pacote] || T.PACOTES.geometrico).lista, bt = SOM && (P.musica || {}).batida !== false && BATIDA ? BATIDA : 0;
    var c = { id: uid(), layout: "cheia", midias: [id], dur: bt ? Math.max(0.6, Math.round(1.6 / bt) * bt) : 1.6, mov: ["zoom", "afasta", "esq", "dir"][P.cenas.length % 4], trans: pos ? lista[pos % lista.length] : "corte", transDur: 0.6, desde: [0] };
    P.cenas.splice(pos, 0, c); if (pos === 0 && P.cenas[1] && P.cenas[1].trans === "corte") P.cenas[1].trans = lista[0];
    SEL = pos; mudou({ painel: true }); aviso("＋ Cena " + (pos + 1) + " criada com a mídia. Arraste uma transição ou divisão para cima dela.");
  }

  /* ---------- arrastar (mouse e toque) ---------- */
  var ARR = null;
  function alvoEm(x, y) {
    var el = document.elementFromPoint(x, y); if (!el) return null;
    var cn = el.closest(".tl-cena[data-cena]"); if (cn) { var r = cn.getBoundingClientRect(), i = +cn.getAttribute("data-cena");
      var cv = cn.querySelector("canvas").getBoundingClientRect(); return { tipo: "cena", i: i, el: cn, fx: Math.max(0, Math.min(1, (x - cv.left) / cv.width)), fy: Math.max(0, Math.min(1, (y - cv.top) / cv.height)), meio: x < r.left + r.width / 2, borda: x < r.left + r.width * 0.18 ? -1 : x > r.right - r.width * 0.18 ? 1 : 0 }; }
    var tr = el.closest(".tl-tr[data-tr]"); if (tr) return { tipo: "tr", i: +tr.getAttribute("data-tr"), el: tr };
    if (el.closest("#tlFila")) { var fila = $("tlFila"), cs = fila.querySelectorAll(".tl-cena"), pos = cs.length;
      for (var j = 0; j < cs.length; j++) { var rr = cs[j].getBoundingClientRect(); if (x < rr.left + rr.width / 2) { pos = j; break; } } return { tipo: "fila", pos: pos, el: fila }; }
    if (el.closest("#tlCv")) { var cr = $("tlCv").getBoundingClientRect(), at = T.ativas(P, TEMPO); if (!at.length) return { tipo: "fila", pos: P.cenas.length, el: $("tlCv") };
      return { tipo: "cena", i: at[at.length - 1].i, el: $("tlCv"), fx: (x - cr.left) / cr.width, fy: (y - cr.top) / cr.height, previa: true }; }
    return null;
  }
  function marcarAlvo(a) {
    [].forEach.call(document.querySelectorAll(".tl-sobre"), function (e) { e.classList.remove("tl-sobre"); });
    var ind = $("tlInsere"); if (ind) ind.hidden = true; if (!a || !ARR) return;
    var m = ARR.tipo === "m" || ARR.tipo === "c";
    if (ARR.tipo === "c" && a.tipo === "cena" && !a.previa) { a.tipo = "fila"; a.pos = a.i + (a.meio ? 0 : 1); }
    if (ARR.tipo === "m" && a.tipo === "cena" && !a.previa && a.borda) { a.tipo = "fila"; a.pos = a.i + (a.borda > 0 ? 1 : 0); }
    if (a.tipo === "cena" && ARR.tipo !== "c" && (m || ARR.tipo !== "t" || a.i > 0)) a.el.classList.add("tl-sobre");
    else if (a.tipo === "tr" && ARR.tipo === "t") a.el.classList.add("tl-sobre");
    else if (a.tipo === "fila" && m && ind) { var fila = $("tlFila"), cs = fila.querySelectorAll(".tl-cena"), fr = fila.getBoundingClientRect(), xx;
      if (!cs.length) { fila.classList.add("tl-sobre"); return; }
      xx = a.pos < cs.length ? cs[a.pos].getBoundingClientRect().left - 4 : cs[cs.length - 1].getBoundingClientRect().right + 2;
      ind.hidden = false; ind.style.left = Math.round(xx - fr.left) + "px"; }
  }
  function soltar(a) {
    if (!a || !ARR) return; var t = ARR.tipo, k = ARR.k;
    if (t === "c") { var de = +k, para = a.tipo === "fila" ? a.pos : a.tipo === "cena" ? a.i + (a.meio ? 0 : 1) : a.tipo === "tr" ? a.i : -1; if (para < 0) return;
      if (para > de) para--; if (para === de) return; P.cenas.splice(para, 0, P.cenas.splice(de, 1)[0]); if (para === 0 && P.cenas[1] && P.cenas[1].trans === "corte") P.cenas[1].trans = (P.cenas[0].trans && P.cenas[0].trans !== "corte") ? P.cenas[0].trans : "tiras";
      SEL = para; mudou({ painel: true }); aviso("✓ Cena levada para a posição " + (para + 1) + "."); return; }
    if (t === "m") { if (a.tipo === "cena") midiaNaCena(k, a.i, a.fx, a.fy); else if (a.tipo === "fila") novaCenaCom(k, a.pos); else if (a.tipo === "tr") novaCenaCom(k, a.i); return; }
    if (a.tipo === "cena") aplicarEfx(t, k, a.i); else if (a.tipo === "tr" && t === "t") aplicarEfx("t", k, a.i);
    else if (a.tipo === "tr" && t === "l") aplicarEfx("l", k, a.i);
  }
  function fantasma(origem) {
    var g = document.createElement("div"); g.className = "tl-fantasma"; var cv = origem.querySelector("canvas"), img = origem.querySelector("img");
    if (img) { var i2 = new Image(); i2.src = img.src; g.appendChild(i2); } else if (cv) { var c2 = document.createElement("canvas"); c2.width = cv.width; c2.height = cv.height; try { c2.getContext("2d").drawImage(cv, 0, 0); } catch (e) {} g.appendChild(c2); }
    var sp = origem.querySelector("span:not(.n):not(.v):not(.mv)"); if (sp) { var s2 = document.createElement("b"); s2.textContent = sp.textContent; g.appendChild(s2); }
    document.body.appendChild(g); return g;
  }
  function mover(x, y) { if (!ARR || !ARR.ativo) return; ARR.g.style.transform = "translate(" + (x - 30) + "px," + (y - 40) + "px)"; var a = alvoEm(x, y); ARR.alvo = a; marcarAlvo(a);
    if (!ARR.rolar) ARR.rolar = requestAnimationFrame(rolarBorda); }
  // enquanto o dedo/mouse fica perto da borda, a página (e a sequência) rolam sozinhas
  function rolarBorda() {
    if (!ARR || !ARR.ativo) return; var x = ARR.x, y = ARR.y, mexeu = false, fila = $("tlFila"), fr = fila.getBoundingClientRect();
    var naBorda = y > fr.top - 20 && y < fr.bottom + 20 && (x < fr.left + 36 || x > fr.right - 36);   /* só rola de lado se ficar um instante na borda (passar por ela não conta) */
    if (!naBorda) ARR.bordaT = 0; else if (!ARR.bordaT) ARR.bordaT = performance.now();
    if (naBorda && performance.now() - ARR.bordaT > 350) { var sl = fila.scrollLeft; if (x < fr.left + 36) fila.scrollLeft -= 10; else fila.scrollLeft += 10; mexeu = sl !== fila.scrollLeft; }
    var sy = scrollY; if (y < 44) scrollBy(0, -14); else if (y > innerHeight - 44) scrollBy(0, 14); if (sy !== scrollY) mexeu = true;
    var cx2 = document.querySelector(".bwf-fixo > .tl-seq"); if (cx2) { var cr = cx2.getBoundingClientRect(), st = cx2.scrollTop; if (y > cr.top && y < cr.top + 30) cx2.scrollTop -= 10; else if (y < cr.bottom && y > cr.bottom - 30) cx2.scrollTop += 10; if (st !== cx2.scrollTop) mexeu = true; }
    if (mexeu) { var a = alvoEm(x, y); ARR.alvo = a; marcarAlvo(a); }
    ARR.rolar = requestAnimationFrame(rolarBorda);
  }
  function comecar() { ARR.ativo = true; ARR.g = fantasma(ARR.origem); ARR.origem.classList.add("tl-pego"); document.documentElement.classList.add("tl-arrastando"); if (navigator.vibrate && ARR.toque) try { navigator.vibrate(12); } catch (e) {} mover(ARR.x, ARR.y); }
  function terminar(ok) {
    if (!ARR) return; var a = ARR; clearTimeout(a.timer);
    if (a.rolar) cancelAnimationFrame(a.rolar);
    var parado = a.ativo && Math.hypot(a.x - a.x0, a.y - a.y0) < 10;
    if (a.ativo) { a.g.remove(); a.origem.classList.remove("tl-pego"); document.documentElement.classList.remove("tl-arrastando"); marcarAlvo(null); a.solto = Date.now(); if (ok && !parado) soltar(a.alvo); }
    /* 22/11 (dono): segurar e soltar sem arrastar não abre mais o menu no toque — atrapalhava o arrastar; as opções ficam no botão direito (PC) e nos ⋯ */
    ULTIMO_ARR = a.ativo ? Date.now() : 0; ARR = null;
  }
  var ULTIMO_ARR = 0;
  /* ---------- FERRAMENTAS, ATALHOS E MENUS (estilo Adobe, 20/11) ---------- */
  var MAO = null, MSEL = "", COPIA_C = null;
  // LÂMINA (C) na cena: divide a cena em duas no ponto tocado (o take continua de onde parou)
  function cortarCena(i, fr) { var c = P.cenas[i]; if (!c) return; fr = Math.max(0.15, Math.min(0.85, fr)); var d1 = Math.round(c.dur * fr * 20) / 20, d2 = Math.round((c.dur - d1) * 20) / 20; if (d1 < 0.3 || d2 < 0.3) return aviso("Cena curta demais para cortar.", true);
    var n = JSON.parse(JSON.stringify(c)); n.id = uid(); n.dur = d2; n.trans = "corte"; n.desde = (c.desde || []).map(function (x) { return +(x || 0) + d1; }); c.dur = d1; P.cenas.splice(i + 1, 0, n); SEL = i + 1; mudou({ painel: true }); aviso("✂ Cena " + (i + 1) + " cortada em duas (" + fmt(d1) + " s + " + fmt(d2) + " s)."); }
  function apagarCena(i, perguntar) { if (!P.cenas[i]) return; if (perguntar && !confirm("Apagar esta cena?")) return; P.cenas.splice(i, 1); if (i === 0 && P.cenas[0]) P.cenas[0].trans = "corte"; SEL = Math.min(i, P.cenas.length - 1); mudou({ painel: true }); aviso("🗑 Cena apagada (Ctrl+Z desfaz)."); }
  function duplicarCena(i) { var c = P.cenas[i]; if (!c) return; var cp = JSON.parse(JSON.stringify(c)); cp.id = uid(); P.cenas.splice(i + 1, 0, cp); SEL = i + 1; mudou({ painel: true }); aviso("⧉ Cena duplicada."); }
  function moverCena(i, d) { var j = i + d; if (!P.cenas[i] || j < 0 || j >= P.cenas.length) return; P.cenas.splice(j, 0, P.cenas.splice(i, 1)[0]); if (P.cenas[0].trans !== "corte") { P.cenas[0].trans = "corte"; } SEL = j; mudou({ painel: true }); }
  function substituirMidia(idVelho) { var inp = $("tlArqTroca"); inp.onchange = async function () { var f = (inp.files || [])[0]; inp.value = ""; if (!f) return; var ids = await importar([f]); if (!ids || !ids.length) return;
      var novo = ids[0], n = 0; P.cenas.forEach(function (c) { c.midias = (c.midias || []).map(function (x) { if (x === idVelho) { n++; return novo; } return x; }); });
      ORDEM = ORDEM.filter(function (x) { return x !== novo; }); ORDEM.splice(ORDEM.indexOf(idVelho) + 1, 0, novo); P.ordem = ORDEM.slice(); desenharMidias(); mudou({ painel: true }); aviso("⇄ Arquivo trocado em " + n + " tela(s). O antigo continua na lista (✕ tira)."); };
    inp.click(); }
  // opções de cada coisa (botão direito no PC, segurar e soltar sem mexer no celular)
  /* 22/11 (dono): segurar o dedo não abre mais menu (atrapalhava o arrastar) — cada cena e cada mídia têm um ⋯ discreto que abre as opções */
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-mais]"); if (!b) return; e.preventDefault(); e.stopPropagation();
    var el = b.closest("[data-arr]"), r = b.getBoundingClientRect(), its = menuDe(el); if (its && window.BWFerr) BWFerr.menu(Math.max(8, r.right - 240), r.bottom + 4, its.itens, its.titulo, false); }, true);
  function menuDe(el) {
    if (!el) return null; var v = (el.getAttribute("data-arr") || "").split(":"), tipo = v[0], k = v.slice(1).join(":");
    if (tipo === "c") { var i = +k, c = P.cenas[i]; if (!c) return null; if (SEL !== i) { SEL = i; desenharPainel(); desenharFila(); }
      return { titulo: "CENA " + (i + 1), itens: [
        { icone: "⧉", rot: "Duplicar", tecla: "Ctrl+D", fn: function () { duplicarCena(i); } },
        { icone: "✂", rot: "Cortar na metade", tecla: "C", fn: function () { cortarCena(i, 0.5); } },
        { icone: "⎘", rot: "Copiar o estilo (divisão, transição, movimento)", tecla: "Ctrl+C", fn: function () { COPIA_C = { layout: c.layout, trans: c.trans, transDur: c.transDur, mov: c.mov }; aviso("Estilo copiado. Ctrl+V cola na cena escolhida."); } },
        { icone: "📋", rot: "Colar o estilo", tecla: "Ctrl+V", off: !COPIA_C, fn: function () { colarEstilo(i); } },
        { icone: "◧", rot: "Transição", off: i === 0, sub: Object.keys(T.TRANS).map(function (t) { return { rot: T.TRANS[t].nome + (c.trans === t ? "  ✓" : ""), fn: function () { aplicarEfx("t", t, i); } }; }) },
        { icone: "▦", rot: "Divisão da tela", sub: Object.keys(T.LAYOUTS).map(function (l) { return { rot: T.LAYOUTS[l].nome + (c.layout === l ? "  ✓" : ""), fn: function () { aplicarEfx("l", l, i); } }; }) },
        { icone: "🎥", rot: "Movimento", sub: Object.keys(T.MOVS).map(function (m) { return { rot: T.MOVS[m] + (c.mov === m ? "  ✓" : ""), fn: function () { c.mov = m; mudou({ painel: true }); } }; }) },
        { icone: "◀", rot: "Mover para antes", off: i === 0, fn: function () { moverCena(i, -1); } }, { icone: "▶", rot: "Mover para depois", off: i >= P.cenas.length - 1, fn: function () { moverCena(i, 1); } },
        "-", { icone: "🗑", rot: "Apagar cena", tecla: "Delete", perigo: true, fn: function () { apagarCena(i, false); } }] }; }
    if (tipo === "m") { var m = MID[k]; if (!m) return null; MSEL = k;
      return { titulo: (m.nome || "MÍDIA").slice(0, 28).toUpperCase(), itens: [
        { icone: "＋", rot: "Nova cena com ela (no fim)", fn: function () { novaCenaCom(k, P.cenas.length); } },
        { icone: "⇄", rot: "Usar na cena escolhida", off: !P.cenas[SEL], fn: function () { midiaNaCena(k, SEL, 0.5, 0.5); } },
        { icone: "⟳", rot: "Substituir o arquivo…", fn: function () { substituirMidia(k); } },
        "-", { icone: "🗑", rot: "Tirar do projeto", perigo: true, fn: function () { tirarMidia(k); } }] }; }
    if (tipo === "t" || tipo === "l") { var nome = tipo === "t" ? T.TRANS[k].nome : T.LAYOUTS[k].nome;
      return { titulo: nome.toUpperCase(), itens: [{ icone: "✓", rot: "Aplicar na cena escolhida", off: !P.cenas[SEL], fn: function () { aplicarEfx(tipo, k, SEL); } },
        { icone: "✱", rot: "Aplicar em todas as cenas", fn: function () { P.cenas.forEach(function (c, j) { if (tipo === "t") { if (j) c.trans = k; } else aplicarEfx("l", k, j); }); mudou({ painel: true }); aviso("“" + nome + "” em todas as cenas."); } }] }; }
    return null;
  }
  function colarEstilo(i) { var c = P.cenas[i]; if (!c || !COPIA_C) return; c.layout = COPIA_C.layout; c.mov = COPIA_C.mov; if (i) { c.trans = COPIA_C.trans; c.transDur = COPIA_C.transDur; } aplicarEfx("l", c.layout, i); aviso("Estilo colado na cena " + (i + 1) + "."); }
  function ligarFerramentas() {
    if (!window.BWFerr) return; var I = BWFerr.ICONES;
    BWFerr.barra({ el: $("tlFerr"), alvos: [$("tlFila"), $("tlEfx"), $("tlMidias")], atual: "v", ferramentas: [
      { id: "v", tecla: "V", nome: "Seleção", icone: I.v, dica: "escolhe e arrasta mídias, cenas e efeitos" },
      { id: "c", tecla: "C", nome: "Lâmina", icone: I.c, dica: "clique numa cena para cortá-la em duas ali" },
      { id: "h", tecla: "H", nome: "Mão", icone: I.h, dica: "arrasta a sequência e a faixa de efeitos" }] });
    BWFerr.atalhos({
      "espaco, k": function () { tocar(); }, "delete": function () { if (MSEL && document.querySelector('.tl-mid.tl-msel')) { tirarMidia(MSEL); return; } if (SEL < 0 || !P.cenas[SEL]) return false; apagarCena(SEL, false); },
      "ctrl+d": function () { if (!P.cenas[SEL]) return false; duplicarCena(SEL); }, "ctrl+k": function () { var c = P.cenas[SEL]; if (!c) return false; var ini = T.inicios(P)[SEL] || 0; cortarCena(SEL, (TEMPO - ini) / c.dur); },
      "ctrl+c": function () { var c = P.cenas[SEL]; if (!c) return false; COPIA_C = { layout: c.layout, trans: c.trans, transDur: c.transDur, mov: c.mov }; aviso("Estilo da cena copiado."); }, "ctrl+v": function () { if (!COPIA_C || !P.cenas[SEL]) return false; colarEstilo(SEL); },
      "ctrl+z": function () { $("tlDesfazer").click(); }, "ctrl+shift+z, ctrl+y": function () { $("tlRefazer").click(); },
      "arrowleft": function () { if (SEL > 0) selecionar(SEL - 1); }, "arrowright": function () { if (SEL < P.cenas.length - 1) selecionar(SEL + 1); },
      "alt+arrowleft": function () { moverCena(SEL, -1); }, "alt+arrowright": function () { moverCena(SEL, 1); },
      "home": function () { ver(0); }, "ctrl+s": function () { salvarJa(); aviso("✓ Salvo neste aparelho."); }, "ctrl+m, ctrl+e": function () { $("tlExportar").click(); }, "ctrl+i": function () { $("tlArq").click(); },
      "escape": function () { MSEL = ""; [].forEach.call(document.querySelectorAll(".tl-msel"), function (x) { x.classList.remove("tl-msel"); }); return false; }
    });
    BWFerr.ajuda("ATALHOS DAS TELAS EM MOVIMENTO", [["#", "TOCAR E ESCOLHER"], ["Espaço / K", "tocar / pausar"], ["← / →", "cena anterior / próxima"], ["Alt+← / Alt+→", "mover a cena"], ["Home", "voltar ao começo"],
      ["#", "EDITAR"], ["Ctrl+K", "cortar a cena na agulha"], ["Ctrl+D", "duplicar a cena"], ["Delete", "apagar a cena escolhida (ou a mídia marcada)"], ["Ctrl+C / Ctrl+V", "copiar / colar o estilo da cena"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"],
      ["Botão direito", "opções da cena, da mídia ou do efeito (celular: segure e solte sem arrastar)"], ["#", "ARQUIVO"], ["Ctrl+I", "pôr fotos e vídeos"], ["Ctrl+S", "salvar"], ["Ctrl+M", "gerar o vídeo"], ["?", "esta lista"]]);
    // botão direito (no celular o "segurar e soltar" é tratado pelo arrastar)
    document.addEventListener("contextmenu", function (e) { var el = e.target.closest("[data-arr]"); if (!el) return; e.preventDefault(); var its = menuDe(el); if (its) BWFerr.menu(e.clientX, e.clientY, its.itens, its.titulo); });
    // marcar a mídia (para o Delete) com um clique
    $("tlMidias").addEventListener("click", function (e) { var m = e.target.closest(".tl-mid[data-arr]"); if (!m || e.target.closest("button")) return; [].forEach.call(document.querySelectorAll(".tl-msel"), function (x) { x.classList.remove("tl-msel"); }); m.classList.add("tl-msel"); MSEL = m.getAttribute("data-arr").slice(2); });
  }
  function ligarArrastar() {
    document.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return; var F = window.BWFerr ? BWFerr.atual() : "v";
      if (F === "h" && e.target.closest("#tlFila,#tlEfx")) { var lst = e.target.closest("#tlFila,#tlEfx"); MAO = { el: lst, x0: e.clientX, sl: lst.scrollLeft }; BWFerr.preso(true); e.preventDefault(); return; }
      if (F === "c") { var cn = e.target.closest(".tl-cena[data-cena]"); if (cn) { var cvb = cn.querySelector("canvas").getBoundingClientRect(); cortarCena(+cn.getAttribute("data-cena"), (e.clientX - cvb.left) / cvb.width); e.preventDefault(); return; } }
      var o = e.target.closest("[data-arr]"); if (!o || e.target.closest("button.x,.mv button")) return;
      var v = o.getAttribute("data-arr").split(":"), toque = e.pointerType !== "mouse";
      ARR = { tipo: v[0], k: v.slice(1).join(":"), origem: o, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, toque: toque, ativo: false, id: e.pointerId };
      if (toque) ARR.timer = setTimeout(function () { if (ARR && !ARR.ativo) comecar(); }, 220);
      else e.preventDefault();
    });
    document.addEventListener("pointermove", function (e) { if (MAO) { MAO.el.scrollLeft = MAO.sl - (e.clientX - MAO.x0); return; } if (!ARR || e.pointerId !== ARR.id) return; ARR.x = e.clientX; ARR.y = e.clientY;
      var d = Math.hypot(e.clientX - ARR.x0, e.clientY - ARR.y0);
      if (!ARR.ativo) { if (ARR.toque) { if (d > 10) { clearTimeout(ARR.timer); ARR = null; } return; } if (d > 5) comecar(); else return; }
      mover(e.clientX, e.clientY); });
    document.addEventListener("pointerup", function (e) { if (MAO) { MAO = null; BWFerr.preso(false); return; } if (ARR && e.pointerId === ARR.id) terminar(true); });
    document.addEventListener("pointercancel", function (e) { if (ARR && e.pointerId === ARR.id) { if (ARR.ativo) terminar(false); else { clearTimeout(ARR.timer); ARR = null; } } });
    document.addEventListener("touchmove", function (e) { if (ARR && ARR.ativo) e.preventDefault(); }, { passive: false });
    document.addEventListener("contextmenu", function (e) { if (ARR) e.preventDefault(); });
    document.addEventListener("click", function (e) { if (Date.now() - ULTIMO_ARR < 350) { e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && ARR) terminar(false); });
    // tocar num efeito = aplicar na cena escolhida
    $("tlEfx").addEventListener("click", function (e) { var b = e.target.closest("[data-arr]"); if (!b) return; var v = b.getAttribute("data-arr").split(":");
      if (SEL < 0 || !P.cenas[SEL]) return aviso("Escolha uma cena na SEQUÊNCIA (ou arraste o efeito para cima dela).", true); aplicarEfx(v[0], v[1], SEL); });
    [].forEach.call(document.querySelectorAll("[data-efxaba]"), function (b) { b.onclick = function () { EFX_ABA = b.getAttribute("data-efxaba"); desenharEfx(); }; });
  }

  /* ---------- salvar / desfazer ---------- */
  function salvarJa() { if (!P) return; P.atualizado = Date.now(); op("projetos", "readwrite", function (s) { return s.put({ id: P.id, nome: P.nome, atualizado: P.atualizado, projeto: P }); }).catch(function () {}); try { localStorage.setItem("ui_telas_ultimo", P.id); } catch (e) {} }
  function mudou(opt) {
    opt = opt || {};
    clearTimeout(SALVAR_T); SALVAR_T = setTimeout(function () { salvarJa(); desenharProjetos(); }, 600);
    clearTimeout(HIST_T); HIST_T = setTimeout(function () { var s = foto(); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } botoesHist(); }, 300);
    if (opt.painel) desenharPainel(); if (opt.fila !== false) desenharFila(); relogio(); if (!TOCANDO) ver(TEMPO);
  }
  function foto() { var a = P.atualizado; P.atualizado = 0; var s = JSON.stringify(P); P.atualizado = a; return s; }   /* 22/11: o carimbo do salvar não conta como mudança no desfazer */
  function gravarHist() { clearTimeout(HIST_T); var s = foto(); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } }
  function botoesHist() { $("tlDesfazer").disabled = HIST.length < 2; $("tlRefazer").disabled = !FUT.length; }
  function trocou() { if (SEL >= P.cenas.length) SEL = P.cenas.length - 1; desenharTudo(); clearTimeout(SALVAR_T); SALVAR_T = setTimeout(salvarJa, 400); botoesHist(); }
  async function desenharProjetos() {
    var l = []; try { l = await op("projetos", "readonly", function (s) { return s.getAll(); }); } catch (e) {}
    l = (l || []).sort(function (a, b) { return b.atualizado - a.atualizado; });
    $("tlProjetos").innerHTML = '<div class="tl-linha" style="margin:0 0 6px"><button class="tl-bt mini" type="button" data-pnovo="1">＋ NOVO PROJETO</button></div>' + l.map(function (p) {
      return '<div class="tl-linha" style="margin:4px 0;align-items:center"><span style="flex:1 1 auto;min-width:0;font:700 12px Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (p.id === P.id ? "▶ " : "") + esc(p.nome || "Sem nome") + '</span><button class="tl-bt mini" type="button" data-pabrir="' + esc(p.id) + '" style="flex:none">ABRIR</button><button class="tl-bt mini perigo" type="button" data-papagar="' + esc(p.id) + '" style="flex:none" aria-label="Apagar projeto">✕</button></div>';
    }).join("");
  }
  function novoProjeto(fmtp) { var f = FORMATOS[fmtp] || FORMATOS["9:16"]; return { v: 1, id: uid(), nome: "Minhas telas", formato: fmtp || "9:16", w: f[0], h: f[1], fps: 30, fundo: "#000000", gap: 10, contorno: "#B6FF3B", pacote: "geometrico", ritmo: "medio", musica: { id: "", nome: "", volume: 0.8, inicio: 0, batida: true }, ordem: [], cenas: [] }; }
  async function abrirProjeto(reg) {
    salvarJa(); P = reg.projeto; ORDEM = (P.ordem || []).filter(function (id) { return MID[id]; });
    SOM = null; BATIDA = 0; if (P.musica && P.musica.id) { var r = await op("midias", "readonly", function (s) { return s.get(P.musica.id); }).catch(function () { return null; }); if (r) await abrirSom(r.blob); }
    SEL = P.cenas.length ? 0 : -1; TEMPO = 0; HIST = [foto()]; FUT = []; trocou();
  }

  /* ---------- montar sozinho ---------- */
  function montarSozinho() {
    if (!ORDEM.length) return aviso("Coloque fotos e vídeos primeiro (＋ ESCOLHER ou arraste para a caixa).", true);
    var lista = ORDEM.map(function (id) { return { id: id }; }), m = P.musica || {};
    T.montar(P, lista, { pacote: P.pacote, ritmo: P.ritmo, batida: SOM && m.batida !== false ? BATIDA : 0 });
    SEL = 0; TEMPO = 0; mudou({ painel: true }); if (!TOCANDO) tocar();
    aviso("✨ " + P.cenas.length + " cenas montadas (" + fmt(T.duracao(P)) + " s)" + (SOM && BATIDA && m.batida !== false ? ", cortando na batida da música" : "") + ". Toque numa cena da SEQUÊNCIA para trocar divisão, mídia ou transição.");
  }

  /* ---------- gerar vídeo ---------- */
  var EXP = { parar: false, url: "", arquivo: null };
  async function somDoVideo(dur) {
    if (!SOM || !SOM.buf) return null;
    var ini = +P.musica.inicio || 0, vol = +P.musica.volume, SR = 48000, n = Math.round(dur * SR), ctx = new OfflineAudioContext(2, n, SR), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = SOM.buf; src.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(vol, 0); g.gain.setValueAtTime(vol, Math.max(0, dur - 1.2)); g.gain.linearRampToValueAtTime(0, dur);
    src.start(0, ini); var r = await ctx.startRendering(); return { L: r.getChannelData(0), R: r.getChannelData(1) };
  }
  async function gerar() {
    var d = T.duracao(P); if (!d) return aviso("Monte as cenas primeiro.", true);
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) return aviso("Este navegador não grava vídeo — use o Chrome ou o app BW", true);
    if (TOCANDO) tocar();
    var actx = null; try { actx = SOM ? new (window.AudioContext || window.webkitAudioContext)() : null; } catch (e) { actx = null; }   // nasce no toque (iPhone)
    EXP.parar = false; $("tlProg").hidden = false; $("tlPronto").hidden = true; $("tlGerar").disabled = true;
    try {
      $("tlProgTxt").textContent = "Preparando o som…"; var som = await somDoVideo(d);
      var res = await BWReelsCelular.gerar({ largura: P.w, altura: P.h, fps: 30, duracao: d, som: som, audioCtx: actx, alturaSaida: Number($("tlQual").value),
        desenhar: async function (t, ctx, w, h) { await videosNoTempo(t); T.desenhar(ctx, P, t, w, h, fonteViva); },
        cancelar: function () { return EXP.parar; }, aoProgredir: function (p) { $("tlBarra").value = p.pct; $("tlProgTxt").textContent = p.etapa + "… " + p.pct + "%"; } });
      if (EXP.url) URL.revokeObjectURL(EXP.url);
      var nome = (P.nome || "telas").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "telas";
      EXP.arquivo = new File([res.blob], nome + ".mp4", { type: "video/mp4" }); EXP.url = URL.createObjectURL(res.blob);
      if (window.BWCriacoes) BWCriacoes.aoLado("tlBaixar", { ferramenta: "telas", arquivo: function () { return EXP.arquivo; }, nome: function () { return P.nome; }, projeto: function () { return P.id; }, tipo: "video" });
      $("tlVideo").src = EXP.url; $("tlBaixar").href = EXP.url; $("tlBaixar").download = nome + ".mp4"; $("tlPronto").hidden = false;
      $("tlProgTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + fmt(d) + " s" + (som ? res.comSom ? ", com a música" : ", sem som — este aparelho não gravou o áudio" : ", sem música") + ").";
    } catch (e) { $("tlProgTxt").textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); }
    finally { $("tlGerar").disabled = false; if (actx) actx.close().catch(function () {}); ver(TEMPO); }
  }

  /* ---------- abas do celular ---------- */
  function abaCel(a) { $("tlGrade").setAttribute("data-aba", a); [].forEach.call($("tlAbasCel").children, function (b) { b.classList.toggle("on", b.getAttribute("data-aba") === a); }); }
  function selecionar(i) { SEL = i; desenharPainel(); desenharFila(); var ini = T.inicios(P)[i] || 0; if (!TOCANDO) ver(ini + Math.min(0.9, (P.cenas[i] || {}).dur || 0)); if (innerWidth <= 1100) abaCel("cena"); }

  function livre() { var l = P.formato === "livre"; $("tlLivre").hidden = !l; if (l) { $("tlLargura").value = P.w; $("tlAltura").value = P.h; } }
  // opções de qualidade conforme o tamanho do projeto (Rápida ~720p, Alta ~1080p, Tamanho real); marca o que o aparelho não aguenta
  async function qualidades() {
    var menor = Math.min(P.w, P.h), sel = $("tlQual"), ops = [], vistos = {};
    [["Rápida", 720], ["Alta", 1080], ["Tamanho real", menor]].forEach(function (q) { var h = Math.min(P.h, Math.round(P.h * q[1] / menor / 2) * 2); if (!vistos[h]) { vistos[h] = 1; ops.push([q[0], h]); } });
    sel.innerHTML = ops.map(function (q) { var w = Math.round(P.w * q[1] / P.h / 2) * 2; return '<option value="' + q[1] + '">' + q[0] + " (" + w + "×" + q[1] + ")</option>"; }).join("");
    sel.value = String(ops[innerWidth <= 1100 ? 0 : Math.min(1, ops.length - 1)][1]);
    if (window.BWReelsCelular && BWReelsCelular.cabe) for (var i = 0; i < sel.options.length; i++) { var o = sel.options[i], h = +o.value, w = Math.round(P.w * h / P.h / 2) * 2;
      if (!(await BWReelsCelular.cabe(w, h))) { o.disabled = true; o.textContent += " — não cabe neste aparelho"; if (sel.value === o.value) sel.value = sel.options[0].value; } }
  }
  function desenharTudo() {
    $("tlNome").value = P.nome || ""; $("tlFmt").value = P.formato; livre(); $("tlPacote").value = P.pacote || "geometrico"; $("tlRitmo").value = P.ritmo || "medio";
    medir(); desenharMidias(); desenharMusica(); desenharVisual(); desenharPainel(); desenharFila(); desenharProjetos(); relogio(); ver(TEMPO);
  }

  async function iniciar() {
    $("tlPacote").innerHTML = Object.keys(T.PACOTES).map(function (k) { return '<option value="' + k + '">' + esc(T.PACOTES[k].nome) + "</option>"; }).join("");
    var regs = []; try { regs = await op("midias", "readonly", function (s) { return s.getAll(); }); } catch (e) {}
    for (var i = 0; i < regs.length; i++) if (regs[i].tipo !== "musica") MID[regs[i].id] = await abrirMidia(regs[i]);
    var ult = null; try { ult = localStorage.getItem("ui_telas_ultimo"); } catch (e) {}
    /* 20/11 — vindo da LINHA DO TEMPO (?p=ID): abre o projeto daquela criação */
    try { var pq = new URLSearchParams(location.search).get("p"); if (pq) ult = pq; } catch (e) {}
    var r = ult ? await op("projetos", "readonly", function (s) { return s.get(ult); }).catch(function () { return null; }) : null;
    desenharEfx(); ligarArrastar(); ligarFerramentas();
    /* 22/11 (dono: "as mesmas ferramentas do editor de vídeo"): ⋯ da prévia, rodinha = zoom da vista, 2º monitor, tela cheia, salvar quadro, controle pelo celular */
    if (window.BWFerr && BWFerr.previa) PREVIA = BWFerr.previa({ palco: document.querySelector(".tl-palco"), alvo: $("tlCv"), canvas: function () { return $("tlCv"); }, nome: "telas", zoom: true, aviso: aviso,
      api: { tocar: function () { if (!TOCANDO) tocar(); }, parar: function () { if (TOCANDO) tocar(); }, tocando: function () { return TOCANDO; }, irPara: function (t) { if (TOCANDO) tocar(); ver(t); }, T: function () { return TEMPO; }, total: function () { return T.duracao(P); },
        dividir: function () { var i = cenaNaAgulha(); if (i < 0) return; var c = P.cenas[i], ini = T.inicios(P)[i] || 0; cortarCena(i, (TEMPO - ini) / c.dur); }, desfazer: function () { $("tlDesfazer").click(); }, refazer: function () { $("tlRefazer").click(); } },
      extras: function () { var i = cenaNaAgulha(), el = i >= 0 && document.querySelector('[data-arr="c:' + i + '"]'), m = el && menuDe(el); return m ? [{ icone: "🎬", rot: "Cena " + (i + 1) + " (na agulha)", sub: m.itens.filter(function (x) { return x !== "-"; }) }] : []; } });
    if (window.BWFerr) FIXA = BWFerr.telaFixa({ wrap: document.querySelector(".wrap"), grade: $("tlGrade"), palco: document.querySelector(".tl-palco"), rola: [document.querySelector(".tl-seq")], nomeRola: "SEQUÊNCIA E EFEITOS", painelLer: function () { return JSON.parse(localStorage.getItem("ui_telas_paineis") || "{}"); }, painelGravar: function (S) { localStorage.setItem("ui_telas_paineis", JSON.stringify(S)); }, some: [document.querySelector(".wrap > .tl-nota")], aviso: $("tlAviso"), aoMedir: function () { if (P) { medir(); if (!TOCANDO) ver(TEMPO); } } });
    if (r && r.projeto) await abrirProjeto(r); else { P = novoProjeto("9:16"); ORDEM = Object.keys(MID); P.ordem = ORDEM.slice(); HIST = [foto()]; desenharTudo(); }
    /* 20/11: tamanho vindo do ESTÚDIO 3D (resolução do telão): telas.html?w=896&h=512 */
    try { var uq = new URLSearchParams(location.search), uw = parseInt(uq.get("w"), 10), uh = parseInt(uq.get("h"), 10);
      if (uw > 79 && uh > 79 && uw < 4097 && uh < 4097) { P.formato = "livre"; P.w = uw; P.h = uh; $("tlFmt").value = "livre"; livre(); medir(); mudou();
        aviso("Tamanho do telão: " + uw + " × " + uh + " px."); } } catch (e) {}
    ORDEM = ORDEM.concat(Object.keys(MID).filter(function (id) { return ORDEM.indexOf(id) < 0; }));
    desenharMidias(); botoesHist(); if (window.BWDobras) BWDobras.aplicar(document); requestAnimationFrame(animarMinis);

    $("tlImportar").onclick = function () { $("tlArq").value = ""; $("tlArq").click(); };
    $("tlArq").addEventListener("change", function () { if (this.files.length) importar([].slice.call(this.files)); });
    var solta = $("tlSolta");
    ["dragenter", "dragover"].forEach(function (ev) { solta.addEventListener(ev, function (e) { e.preventDefault(); solta.classList.add("sobre"); }); });
    ["dragleave", "drop"].forEach(function (ev) { solta.addEventListener(ev, function (e) { e.preventDefault(); solta.classList.remove("sobre"); }); });
    solta.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) importar([].slice.call(e.dataTransfer.files)); });
    $("tlMidias").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-tirar")) tirarMidia(b.getAttribute("data-tirar"));
      if (b.hasAttribute("data-mover")) { var id = b.getAttribute("data-mover"), i = ORDEM.indexOf(id), j = i + Number(b.getAttribute("data-d")); if (j < 0 || j >= ORDEM.length) return; ORDEM.splice(i, 1); ORDEM.splice(j, 0, id); P.ordem = ORDEM.slice(); desenharMidias(); mudou(); }
    });
    $("tlMusica").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return;
      if (b.id === "tlSomEscolher") { $("tlArqSom").value = ""; $("tlArqSom").click(); }
      if (b.id === "tlSomTirar") { if (SOM && SOM.el) SOM.el.pause(); SOM = null; BATIDA = 0; P.musica.id = ""; P.musica.nome = ""; desenharMusica(); mudou(); } });
    $("tlMusica").addEventListener("input", function (e) { var el = e.target;
      if (el.id === "tlSomVol") { P.musica.volume = Number(el.value); el.nextElementSibling.textContent = Math.round(el.value * 100) + "%"; if (SOM && SOM.el) SOM.el.volume = P.musica.volume; mudou({ fila: false }); }
      if (el.id === "tlSomIni") { P.musica.inicio = Math.max(0, Number(el.value) || 0); mudou({ fila: false }); }
      if (el.id === "tlSomBatida") { P.musica.batida = el.checked; mudou({ fila: false }); } });
    $("tlArqSom").addEventListener("change", async function () { var f = this.files[0]; if (!f) return;
      var blob = new Blob([await f.arrayBuffer()], { type: f.type || "audio/mpeg" }), reg = { id: uid(), nome: f.name, tipo: "musica", blob: blob };
      await op("midias", "readwrite", function (s) { return s.put(reg); }); await abrirSom(blob);
      if (!SOM.buf) aviso("Não consegui ler essa música neste navegador. Tente MP3 ou M4A.", true);
      P.musica = { id: reg.id, nome: f.name, volume: P.musica ? P.musica.volume : 0.8, inicio: 0, batida: true }; desenharMusica(); mudou();
      if (BATIDA) aviso("♫ Batida encontrada: " + Math.round(60 / BATIDA) + " BPM. ✨ MONTAR SOZINHO corta as cenas nela."); });
    $("tlVisual").addEventListener("input", function (e) { var el = e.target;
      if (el.id === "tlFundo") P.fundo = el.value; if (el.id === "tlGap") { P.gap = Number(el.value); el.nextElementSibling.textContent = el.value; }
      mudou(); });
    $("tlLinhas").addEventListener("click", function (e) { var b = e.target.closest("[data-linha]"); if (!b) return; P.contorno = b.getAttribute("data-linha"); desenharLinhas(); mudou(); aviso(P.contorno ? "Linhas das transições nesta cor." : "Transições SEM linha."); });
    $("tlLinhas").addEventListener("input", function (e) { var el = e.target; if (el.id === "tlLinhaCor") { P.contorno = el.value; } if (el.id === "tlLinhaOp") { P.contornoOp = 100 - Number(el.value); el.nextElementSibling.textContent = el.value + "%"; } mudou(); });
    $("tlLinhas").addEventListener("change", function (e) { if (e.target.id === "tlLinhaCor") desenharLinhas(); });
    $("tlProjetos").addEventListener("click", async function (e) { var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-pnovo")) { salvarJa(); var w0 = P.w, h0 = P.h; P = novoProjeto(P.formato); if (P.formato === "livre") { P.w = w0; P.h = h0; } P.ordem = ORDEM.slice(); SEL = -1; TEMPO = 0; HIST = [foto()]; FUT = []; trocou(); }
      if (b.hasAttribute("data-pabrir")) { var r2 = await op("projetos", "readonly", function (s) { return s.get(b.getAttribute("data-pabrir")); }); if (r2) abrirProjeto(r2); }
      if (b.hasAttribute("data-papagar")) { var id = b.getAttribute("data-papagar"); if (!confirm("Apagar este projeto? As fotos e vídeos continuam no aparelho.")) return; await op("projetos", "readwrite", function (s) { return s.delete(id); }); if (id === P.id) { P = novoProjeto(P.formato); P.ordem = ORDEM.slice(); SEL = -1; trocou(); } else desenharProjetos(); } });
    $("tlNome").addEventListener("input", function () { P.nome = this.value.slice(0, 40); mudou({ fila: false }); });
    $("tlFmt").addEventListener("change", function () { P.formato = this.value; var f = FORMATOS[this.value]; if (f) { P.w = f[0]; P.h = f[1]; } livre(); medir(); mudou(); });
    ["tlLargura", "tlAltura"].forEach(function (id) { $(id).addEventListener("change", function () { if (P.formato !== "livre") return; P.w = par($("tlLargura").value); P.h = par($("tlAltura").value); livre(); medir(); mudou(); aviso("Tamanho " + P.w + " × " + P.h + " px (telão, painel de LED…)."); }); });
    $("tlPacote").addEventListener("change", function () { P.pacote = this.value; mudou({ fila: false }); aviso("Estilo escolhido. Toque em ✨ MONTAR SOZINHO para aplicar."); });
    $("tlRitmo").addEventListener("change", function () { P.ritmo = this.value; mudou({ fila: false }); });
    $("tlMontar").onclick = montarSozinho; $("tlTocar").onclick = tocar;
    $("tlScrub").addEventListener("input", function () { if (TOCANDO) tocar(); ver(Number(this.value)); });
    $("tlNovaCena").onclick = function () { var id = ORDEM[P.cenas.length % Math.max(1, ORDEM.length)] || ""; P.cenas.push({ id: uid(), layout: "cheia", midias: [id], dur: 1.6, mov: "zoom", trans: P.cenas.length ? "tiras" : "corte", transDur: 0.6, desde: [0] }); SEL = P.cenas.length - 1; mudou({ painel: true }); selecionar(SEL); };
    $("tlDesfazer").onclick = function () { gravarHist(); if (HIST.length < 2) return; FUT.push(HIST.pop()); P = JSON.parse(HIST[HIST.length - 1]); trocou(); };
    $("tlRefazer").onclick = function () { if (!FUT.length) return; var s = FUT.pop(); HIST.push(s); P = JSON.parse(s); trocou(); };
    $("tlFila").addEventListener("click", function (e) { var b = e.target.closest("[data-cena]"); if (b) selecionar(+b.getAttribute("data-cena")); });
    var pn = $("tlDir");
    pn.addEventListener("click", function (e) {
      var c = P.cenas[SEL], b = e.target.closest("button"); if (!c || !b) return;
      if (b.hasAttribute("data-lay")) { c.layout = b.getAttribute("data-lay"); var n = T.LAYOUTS[c.layout].n, k = ORDEM.indexOf(c.midias[0]);
        while (c.midias.length < n) c.midias.push(ORDEM[(k + c.midias.length) % Math.max(1, ORDEM.length)] || ""); c.desde = c.midias.map(function (x, i) { return (c.desde || [])[i] || 0; }); mudou({ painel: true }); return; }
      if (b.hasAttribute("data-mov")) { c.mov = b.getAttribute("data-mov"); mudou({ painel: true }); return; }
      if (b.hasAttribute("data-trans")) { c.trans = b.getAttribute("data-trans"); mudou({ painel: true }); verTrans(); return; }
      var a = b.getAttribute("data-acao");
      if (a === "antes" && SEL > 0) { P.cenas.splice(SEL - 1, 0, P.cenas.splice(SEL, 1)[0]); SEL--; mudou({ painel: true }); }
      else if (a === "depois" && SEL < P.cenas.length - 1) { P.cenas.splice(SEL + 1, 0, P.cenas.splice(SEL, 1)[0]); SEL++; mudou({ painel: true }); }
      else if (a === "dup") { var cp = JSON.parse(JSON.stringify(c)); cp.id = uid(); P.cenas.splice(SEL + 1, 0, cp); SEL++; mudou({ painel: true }); }
      else if (a === "apagar") { if (!confirm("Apagar esta cena?")) return; P.cenas.splice(SEL, 1); SEL = Math.min(SEL, P.cenas.length - 1); mudou({ painel: true }); }
      else if (a === "vertrans") verTrans();
      else if (a === "transtodas") { P.cenas.forEach(function (x, i) { if (i) { x.trans = c.trans; x.transDur = c.transDur; } }); mudou({ painel: true }); aviso("Transição “" + T.TRANS[c.trans].nome + "” em todas as cenas."); }
    });
    pn.addEventListener("input", function (e) { var c = P.cenas[SEL], el = e.target; if (!c) return;
      if (el.id === "tlDurC") { c.dur = Number(el.value); el.nextElementSibling.textContent = fmt(c.dur) + " s"; mudou(); }
      if (el.id === "tlTransDur") { c.transDur = Number(el.value); el.nextElementSibling.textContent = fmt(c.transDur, 2) + " s"; mudou({ fila: false }); }
      if (el.hasAttribute("data-desde")) { var i = +el.getAttribute("data-desde"); c.desde = c.desde || []; c.desde[i] = Number(el.value); el.nextElementSibling.textContent = fmt(el.value); mudou(); } });
    pn.addEventListener("change", function (e) { var c = P.cenas[SEL], el = e.target; if (!c || !el.hasAttribute("data-mid")) return; c.midias[+el.getAttribute("data-mid")] = el.value; mudou({ painel: true }); });
    function verTrans() { var ini = T.inicios(P)[SEL] || 0, c = P.cenas[SEL]; if (TOCANDO) tocar(); var t0 = performance.now(), fim = ini + (c.transDur || 0.6) + 0.4;
      (function passo(a) { var t = ini - 0.3 + (a - t0) / 1000; TEMPO = Math.max(0, t); videosTocando(TEMPO); desenharAgora(); relogio(); if (t < fim) requestAnimationFrame(passo); else ver(TEMPO); })(t0); }
    $("tlExportar").onclick = function () { if (TOCANDO) tocar(); $("tlFolha").hidden = false; $("tlProg").hidden = true; qualidades();
      var nv = P.cenas.some(function (c) { return (c.midias || []).some(function (id) { return MID[id] && MID[id].tipo === "video"; }); });
      $("tlExpDica").textContent = "Vídeo de " + fmt(T.duracao(P)) + " s" + (SOM ? " com a música" : "") + "." + (nv ? " Tem vídeo dentro das telas: cada quadro procura o ponto certo do take, então leva mais tempo (no celular, mais ainda)." : ""); };
    $("tlFechar").onclick = function () { EXP.parar = true; $("tlFolha").hidden = true; };
    $("tlGerar").onclick = gerar; $("tlCancelar").onclick = function () { EXP.parar = true; };
    $("tlCompart").onclick = async function () { if (!EXP.arquivo) return; try { if (navigator.canShare && navigator.canShare({ files: [EXP.arquivo] })) await navigator.share({ files: [EXP.arquivo], title: P.nome }); else $("tlBaixar").click(); } catch (e) {} };
    $("tlAbasCel").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) abaCel(b.getAttribute("data-aba")); });
    addEventListener("resize", function () { medir(); if (!TOCANDO) ver(TEMPO); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") { $("tlFolha").hidden = true; return; } if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return; if (e.key === " " && !window.BWFerr) { e.preventDefault(); tocar(); } });
    window.BWTelasEditor = { projeto: function () { return P; }, midias: function () { return MID; }, ordem: function () { return ORDEM; }, ver: ver, tempo: function () { return TEMPO; }, batida: function () { return BATIDA; }, previa: function () { return PREVIA; }, tocando: function () { return TOCANDO; } }; // testes
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
