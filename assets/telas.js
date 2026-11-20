/* TELAS EM MOVIMENTO — editor (20/11/2026, Claude).
   Fotos e takes → ✨ MONTAR SOZINHO (cenas no ritmo ou na batida da música, divisões de tela e transições do pacote) → ajuste cena por cena
   → GERAR VÍDEO no próprio aparelho (BWReelsCelular.gerar com desenhar: cada quadro desenhado em canvas, vídeo procurado no quadro certo).
   Mídias, música e projetos ficam SÓ neste aparelho (IndexedDB bw_telas). Este arquivo não envia nada para a internet. */
(function () {
  "use strict";
  var T = window.BWTelas, $ = function (id) { return document.getElementById(id); };
  var FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
  var P = null, MID = {}, ORDEM = [], SEL = -1, TEMPO = 0, TOCANDO = false, HIST = [], FUT = [], SALVAR_T = 0, HIST_T = 0, SOM = null, BATIDA = 0;
  var PREVIA = { esc: 0.5 };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, c) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c === undefined ? 1 : c, maximumFractionDigits: c === undefined ? 1 : c }); }
  function aviso(txt, erro) { var a = $("tlAviso"); a.textContent = txt; a.className = "tl-aviso" + (erro ? " erro" : ""); a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.hidden = true; }, 5500); }
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
        var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous"; v.src = url;
        v.onloadedmetadata = function () { m.w = v.videoWidth; m.h = v.videoHeight; m.dur = v.duration || m.dur; }; m.el = v;
        v.onerror = function () { m.erro = true; }; fim();
      } else { var im = new Image(); im.onload = function () { m.w = im.naturalWidth; m.h = im.naturalHeight; m.el = im; fim(); }; im.onerror = function () { m.erro = true; fim(); }; im.src = url; }
    });
  }
  function miniatura(fonte, w, h) { var c = document.createElement("canvas"), k = Math.min(1, 360 / Math.max(w, h)); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k)); c.getContext("2d").drawImage(fonte, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.8); }
  async function importar(arquivos) {
    var n = 0, ruins = [];
    for (var i = 0; i < arquivos.length; i++) {
      var f = arquivos[i], tipo = /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm)$/i.test(f.name) ? "video" : /^image\//.test(f.type) ? "foto" : null;
      if (!tipo) { ruins.push(f.name); continue; }
      var blob = new Blob([await f.arrayBuffer()], { type: f.type || (tipo === "video" ? "video/mp4" : "image/jpeg") }); // cópia na memória (iPhone invalida o original)
      var reg = { id: uid(), nome: f.name, tipo: tipo, blob: blob, w: 0, h: 0, dur: 0, thumb: "" };
      try {
        if (tipo === "foto") { var bmp = await createImageBitmap(blob); reg.w = bmp.width; reg.h = bmp.height; reg.thumb = miniatura(bmp, bmp.width, bmp.height); bmp.close && bmp.close(); }
        else {
          var v = document.createElement("video"), u = URL.createObjectURL(blob); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = u;
          await new Promise(function (ok, erro) { v.onloadeddata = ok; v.onerror = function () { erro(new Error("formato")); }; setTimeout(function () { erro(new Error("demorou")); }, 15000); });
          reg.w = v.videoWidth; reg.h = v.videoHeight; reg.dur = v.duration;
          await new Promise(function (ok) { v.onseeked = ok; v.currentTime = Math.min(0.5, reg.dur / 2); setTimeout(ok, 3000); });
          reg.thumb = miniatura(v, reg.w, reg.h); URL.revokeObjectURL(u);
        }
      } catch (e) { ruins.push(f.name + (tipo === "video" ? " (este navegador não abre esse formato de vídeo)" : "")); continue; }
      await op("midias", "readwrite", function (s) { return s.put(reg); });
      MID[reg.id] = await abrirMidia(reg); ORDEM.push(reg.id); n++;
    }
    P.ordem = ORDEM.slice(); mudou(); desenharMidias();
    if (n) aviso("＋ " + n + " arquivo(s). Toque em ✨ MONTAR SOZINHO para montar o vídeo com eles.");
    if (ruins.length) aviso("Não abriu: " + ruins.join(", ") + ". No iPhone, vídeo em HEVC abre melhor no Safari; no Windows, use MP4.", true);
  }
  function desenharMidias() {
    $("tlMidias").innerHTML = ORDEM.map(function (id, i) { var m = MID[id]; if (!m) return "";
      return '<div class="tl-mid" title="' + esc(m.nome) + '">' + (m.thumb ? '<img src="' + esc(m.thumb.src) + '" alt="">' : "") + '<span class="n">' + (i + 1) + "</span>" +
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
  function medir() {
    var cv = $("tlCv"), cel = innerWidth <= 1100, larg = cv.parentNode.clientWidth - 4, alt = cel ? innerHeight * 0.36 : Math.max(300, innerHeight - 360);
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
    (function passo(agora) { if (!TOCANDO) return; var t = (agora - t0) / 1000; if (t >= d) { t0 = agora; t = 0; if (SOM && SOM.el) SOM.el.currentTime = +P.musica.inicio || 0; }
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
      '<label class="um">Contorno neon<input type="checkbox" id="tlContornoLiga"' + (P.contorno ? " checked" : "") + '></label>' +
      (P.contorno ? '<label class="um">Cor do contorno<input type="color" id="tlContorno" value="' + esc(P.contorno) + '"></label>' : "");
  }

  /* ---------- cena selecionada ---------- */
  var MINI = [];
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
    if (MINI.length && document.visibilityState === "visible") {
      if (!A_IMG) { A_IMG = quadro("#151a24", "#05070a"); B_IMG = quadro("#3BFF6A", "#0d8a33"); }
      var p = ((agora / 1000) % 1.8) / 1.3; p = Math.min(1, p);
      MINI.forEach(function (m) { if (!m.cv.isConnected) return; var x = m.cv.getContext("2d"), W = m.cv.width, H = m.cv.height;
        var Pm = { fundo: "#000", contorno: P.contorno ? "#B6FF3B" : null, cenas: [{ id: "a", layout: "cheia", midias: ["a"], dur: 1, mov: "nenhum" }, { id: "b" + m.k, layout: "cheia", midias: ["b"], dur: 1, mov: "nenhum", trans: m.k, transDur: 1 }] };
        T.desenhar(x, Pm, 1 + p * 0.999, W, H, function (id) { return id === "a" ? { el: A_IMG, w: 90, h: 140 } : { el: B_IMG, w: 90, h: 140 }; }); });
    }
    requestAnimationFrame(animarMinis);
  }

  /* ---------- sequência ---------- */
  function desenharFila() {
    var h = ""; P.cenas.forEach(function (c, i) {
      if (i) h += '<span class="tl-tr" title="Transição">' + esc((T.TRANS[c.trans] || T.TRANS.corte).nome.toUpperCase()) + "</span>";
      h += '<button type="button" class="tl-cena' + (i === SEL ? " on" : "") + '" data-cena="' + i + '"><canvas width="84" height="149" data-cmini="' + i + '"></canvas><span>' + (i + 1) + " · " + esc(T.LAYOUTS[c.layout || "cheia"].nome) + " · " + fmt(c.dur) + "s</span></button>";
    });
    if (!P.cenas.length) h = '<div class="tl-vazio">A sequência aparece aqui depois do ✨ MONTAR SOZINHO (ou ＋ CENA).</div>';
    $("tlFila").innerHTML = h;
    [].forEach.call($("tlFila").querySelectorAll("canvas[data-cmini]"), function (cv) { var i = +cv.getAttribute("data-cmini"), c = P.cenas[i];
      var Pm = { fundo: P.fundo, gap: P.gap, contorno: P.contorno, cenas: [Object.assign({}, c, { trans: "corte" })] }; T.desenhar(cv.getContext("2d"), Pm, c.dur * 0.6, cv.width, cv.height, fonteMini); });
  }

  /* ---------- salvar / desfazer ---------- */
  function salvarJa() { if (!P) return; P.atualizado = Date.now(); op("projetos", "readwrite", function (s) { return s.put({ id: P.id, nome: P.nome, atualizado: P.atualizado, projeto: P }); }).catch(function () {}); try { localStorage.setItem("ui_telas_ultimo", P.id); } catch (e) {} }
  function mudou(opt) {
    opt = opt || {};
    clearTimeout(SALVAR_T); SALVAR_T = setTimeout(function () { salvarJa(); desenharProjetos(); }, 600);
    clearTimeout(HIST_T); HIST_T = setTimeout(function () { var s = JSON.stringify(P); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } botoesHist(); }, 300);
    if (opt.painel) desenharPainel(); if (opt.fila !== false) desenharFila(); relogio(); if (!TOCANDO) ver(TEMPO);
  }
  function gravarHist() { clearTimeout(HIST_T); var s = JSON.stringify(P); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } }
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
    SEL = P.cenas.length ? 0 : -1; TEMPO = 0; HIST = [JSON.stringify(P)]; FUT = []; trocou();
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
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) return aviso("Este navegador não grava vídeo sozinho. Use o Chrome, Edge ou Safari atualizado (no computador, o app BW).", true);
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
      $("tlVideo").src = EXP.url; $("tlBaixar").href = EXP.url; $("tlBaixar").download = nome + ".mp4"; $("tlPronto").hidden = false;
      $("tlProgTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + fmt(d) + " s" + (som ? res.comSom ? ", com a música" : ", sem som — este aparelho não gravou o áudio" : ", sem música") + ").";
    } catch (e) { $("tlProgTxt").textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); }
    finally { $("tlGerar").disabled = false; if (actx) actx.close().catch(function () {}); ver(TEMPO); }
  }

  /* ---------- abas do celular ---------- */
  function abaCel(a) { $("tlGrade").setAttribute("data-aba", a); [].forEach.call($("tlAbasCel").children, function (b) { b.classList.toggle("on", b.getAttribute("data-aba") === a); }); }
  function selecionar(i) { SEL = i; desenharPainel(); desenharFila(); var ini = T.inicios(P)[i] || 0; if (!TOCANDO) ver(ini + Math.min(0.9, (P.cenas[i] || {}).dur || 0)); if (innerWidth <= 1100) abaCel("cena"); }

  function desenharTudo() {
    $("tlNome").value = P.nome || ""; $("tlFmt").value = P.formato; $("tlPacote").value = P.pacote || "geometrico"; $("tlRitmo").value = P.ritmo || "medio";
    medir(); desenharMidias(); desenharMusica(); desenharVisual(); desenharPainel(); desenharFila(); desenharProjetos(); relogio(); ver(TEMPO);
  }

  async function iniciar() {
    $("tlPacote").innerHTML = Object.keys(T.PACOTES).map(function (k) { return '<option value="' + k + '">' + esc(T.PACOTES[k].nome) + "</option>"; }).join("");
    var regs = []; try { regs = await op("midias", "readonly", function (s) { return s.getAll(); }); } catch (e) {}
    for (var i = 0; i < regs.length; i++) if (regs[i].tipo !== "musica") MID[regs[i].id] = await abrirMidia(regs[i]);
    var ult = null; try { ult = localStorage.getItem("ui_telas_ultimo"); } catch (e) {}
    var r = ult ? await op("projetos", "readonly", function (s) { return s.get(ult); }).catch(function () { return null; }) : null;
    if (r && r.projeto) await abrirProjeto(r); else { P = novoProjeto("9:16"); ORDEM = Object.keys(MID); P.ordem = ORDEM.slice(); HIST = [JSON.stringify(P)]; desenharTudo(); }
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
      if (el.id === "tlContornoLiga") { P.contorno = el.checked ? "#B6FF3B" : ""; desenharVisual(); } if (el.id === "tlContorno") P.contorno = el.value; mudou(); });
    $("tlProjetos").addEventListener("click", async function (e) { var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-pnovo")) { salvarJa(); P = novoProjeto(P.formato); P.ordem = ORDEM.slice(); SEL = -1; TEMPO = 0; HIST = [JSON.stringify(P)]; FUT = []; trocou(); }
      if (b.hasAttribute("data-pabrir")) { var r2 = await op("projetos", "readonly", function (s) { return s.get(b.getAttribute("data-pabrir")); }); if (r2) abrirProjeto(r2); }
      if (b.hasAttribute("data-papagar")) { var id = b.getAttribute("data-papagar"); if (!confirm("Apagar este projeto? As fotos e vídeos continuam no aparelho.")) return; await op("projetos", "readwrite", function (s) { return s.delete(id); }); if (id === P.id) { P = novoProjeto(P.formato); P.ordem = ORDEM.slice(); SEL = -1; trocou(); } else desenharProjetos(); } });
    $("tlNome").addEventListener("input", function () { P.nome = this.value.slice(0, 40); mudou({ fila: false }); });
    $("tlFmt").addEventListener("change", function () { var f = FORMATOS[this.value]; P.formato = this.value; P.w = f[0]; P.h = f[1]; medir(); mudou(); });
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
    $("tlExportar").onclick = function () { if (TOCANDO) tocar(); $("tlFolha").hidden = false; $("tlProg").hidden = true;
      var nv = P.cenas.some(function (c) { return (c.midias || []).some(function (id) { return MID[id] && MID[id].tipo === "video"; }); });
      $("tlExpDica").textContent = "Vídeo de " + fmt(T.duracao(P)) + " s" + (SOM ? " com a música" : "") + "." + (nv ? " Tem vídeo dentro das telas: cada quadro procura o ponto certo do take, então leva mais tempo (no celular, mais ainda)." : ""); };
    $("tlFechar").onclick = function () { EXP.parar = true; $("tlFolha").hidden = true; };
    $("tlGerar").onclick = gerar; $("tlCancelar").onclick = function () { EXP.parar = true; };
    $("tlCompart").onclick = async function () { if (!EXP.arquivo) return; try { if (navigator.canShare && navigator.canShare({ files: [EXP.arquivo] })) await navigator.share({ files: [EXP.arquivo], title: P.nome }); else $("tlBaixar").click(); } catch (e) {} };
    $("tlAbasCel").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) abaCel(b.getAttribute("data-aba")); });
    addEventListener("resize", function () { medir(); if (!TOCANDO) ver(TEMPO); });
    addEventListener("keydown", function (e) { if (e.key === "Escape") { $("tlFolha").hidden = true; return; } if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return; if (e.key === " ") { e.preventDefault(); tocar(); } });
    window.BWTelasEditor = { projeto: function () { return P; }, midias: function () { return MID; }, ordem: function () { return ORDEM; }, ver: ver, tempo: function () { return TEMPO; }, batida: function () { return BATIDA; } }; // testes
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
