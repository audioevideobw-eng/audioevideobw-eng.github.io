/* EDITOR DE VÍDEO (18/11/2026, Claude) — video.html
   Linha do tempo em camadas (2 de vídeo/imagem, texto, trilha e efeitos), cortes, textos, volume e fades, efeitos sonoros e trilhas
   sintetizados no aparelho, e exportação gravada pelo próprio navegador (canvas + áudio → MediaRecorder).
   NADA sai do aparelho: este arquivo não usa fetch, upload nem a conta. Mídias e projeto ficam no IndexedDB bw_video. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var uid = function (p) { return (p || "c") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var lim = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  /* CAMADAS (22/11): v1, v2, v3… (vídeo/imagem; número maior = mais em cima), tx, tx2… (texto), a1, a2, a3… (som). Camada nova nasce quando
     um take é solto EM CIMA de outro (fam + próximo número livre); camada vazia some sozinha. Altura de cada camada: P.alt[id] (Alt + rodinha). */
  var BASE_TR = {v1: ["VÍDEO", "#7C5CFF"], v2: ["SOBREPOSIÇÃO", "#B14DFF"], tx: ["TEXTO", "#22B8CF"], a1: ["TRILHA", "#12B76A"], a2: ["EFEITOS", "#F5A524"]};
  var COR_EXTRA = {v: ["#9B7BFF", "#D45CFF", "#6E8BFF", "#C266FF"], t: ["#3FD0E0", "#1E9FB5", "#5BE0C8"], a: ["#3DD68C", "#E8B53A", "#F07A5A", "#58C4F0"]};
  function fam(id) { id = String(id || ""); return id.charAt(0) === "v" ? "v" : id.charAt(0) === "t" ? "t" : "a"; }
  function numTr(id) { var n = parseInt(String(id).replace(/^\D+/, ""), 10); return isFinite(n) ? n : 1; }
  function infoTr(id) { if (BASE_TR[id]) return BASE_TR[id]; var f = fam(id), n = numTr(id), l = COR_EXTRA[f]; return [f === "v" ? "SOBREPOSIÇÃO " + (n - 1) : f === "t" ? "TEXTO " + n : "SOM " + n, l[n % l.length]]; }
  function corTr(id) { return infoTr(id)[1]; }
  function famDoClip(c) { return c.tipo === "texto" ? "t" : c.tipo === "audio" ? "a" : "v"; }
  function idTr(f, n) { return f === "t" ? (n <= 1 ? "tx" : "tx" + n) : f + n; }
  function trilhas() { var ids = {v1: 1, v2: 1, tx: 1, a1: 1, a2: 1}; P.clips.forEach(function (c) { if (c.trilha) ids[c.trilha] = 1; });
    var l = Object.keys(ids), ord = {v: 0, t: 1, a: 2}; l.sort(function (a, b) { var fa = fam(a), fb = fam(b); if (fa !== fb) return ord[fa] - ord[fb]; return fa === "a" ? numTr(a) - numTr(b) : numTr(b) - numTr(a); });
    return l.map(function (id) { var i = infoTr(id); return [id, i[0], i[1]]; }); }
  function novaTrilha(f) { var n = 1; P.clips.forEach(function (c) { if (fam(c.trilha) === f) n = Math.max(n, numTr(c.trilha)); }); if (f !== "t") n = Math.max(n, 2); return idTr(f, n + 1); }
  /* aviso flutuante do arrastar (22/11): as duas escolhas, a ativa acesa */
  function dicaArr(e, modo, txt) {
    var d = document.getElementById("veDicaArr");
    if (!e || (!modo && !txt)) { if (d) d.hidden = true; return; }
    if (!d) { d = document.createElement("div"); d.id = "veDicaArr"; d.className = "ve-dica-arr"; d.setAttribute("role", "status"); document.body.appendChild(d); }
    d.innerHTML = txt ? "<b class='on'>" + esc(txt) + "</b>" : "<b class='" + (modo === "trocar" ? "on" : "") + "'>⇄ TROCAR DE LUGAR <small>solte aqui</small></b><b class='" + (modo === "cima" ? "on" : "") + "'>⬆ PARA CIMA <small>suba o take: cria a camada na hora</small></b>";
    d.hidden = false; d.style.left = Math.min(innerWidth - 250, Math.max(8, e.clientX + 14)) + "px"; d.style.top = Math.max(8, e.clientY - 74) + "px";
  }
  /* TROCAR DE LUGAR: cada take vai para o lugar do outro (o que estava antes continua antes, pelas pontas); se não couber, o que veio sobe de camada */
  function trocarLugar(c, o, iniOrig, trOrig) {
    var oIni = o.ini, oTr = o.trilha, cFim = iniOrig + c.dur, oFim = oIni + o.dur;
    if (trOrig === oTr) { if (iniOrig <= oIni) { o.ini = iniOrig; c.ini = Math.max(0, oFim - c.dur); } else { c.ini = oIni; o.ini = Math.max(0, cFim - o.dur); } c.trilha = oTr; }
    else { c.ini = oIni; c.trilha = oTr; o.ini = iniOrig; o.trilha = trOrig; }
    c.ini = Math.round(c.ini * 20) / 20; o.ini = Math.round(o.ini * 20) / 20;
    var extra = "";
    if (!livreEm(o.trilha, o.ini, o.dur, o)) { o.trilha = novaTrilha(famDoClip(o)); extra = " (" + (o.nome || "o outro take") + " subiu de camada para caber)"; }
    if (!livreEm(c.trilha, c.ini, c.dur, c)) { c.trilha = novaTrilha(famDoClip(c)); extra = " (o take subiu de camada para caber)"; }
    aviso("⇄ Trocados de lugar" + extra + ". Ctrl + Z desfaz.");
  }
  function livreEm(tr, ini, dur, menos) { return !P.clips.some(function (x) { return x !== menos && x.trilha === tr && x.ini < ini + dur - 0.02 && x.ini + x.dur > ini + 0.02; }); }
  var APP = document.documentElement.classList.contains("ve-app");   /* 22/11: layout de app (celular/tablet, estilo CapCut) — assets/ve-app.js */
  function altTr(id) { var a = P.alt && P.alt[id]; return a ? lim(a, ALT_MIN, 160) : APP ? (fam(id) === "v" ? 48 : 30) : 52; }
  var ALT_MIN = 22;
  var FMT = {"9:16": [720, 1280], "16:9": [1280, 720], "1:1": [1080, 1080], "4:5": [864, 1080], "4k-v": [2160, 3840], "4k-h": [3840, 2160]};
  /* 20/11 — transições entre clipes e efeitos (estilo CapCut), tudo desenhado no canvas (funciona em qualquer navegador) */
  var TRANS = {dissolver: "Dissolver", preto: "Passar pelo preto", branco: "Flash branco", empurrar: "Empurrar ←", deslizar: "Subir ↑", zoom: "Zoom", girar: "Girar", cortina: "Cortina", circulo: "Círculo", desfoque: "Desfoque", "zoom-saida": "Zoom de saída"};
  var EFEITOS = {pb: "Preto e branco", sepia: "Sépia", vintage: "Vintage", quente: "Quente", frio: "Frio", vivido: "Vívido", contraste: "Contraste", noite: "Noite", vinheta: "Vinheta", grao: "Grão de filme", vhs: "VHS", desfoque: "Desfoque"};
  var VELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  var FONTES = ["Inter", "Montserrat", "Georgia", "Impact", "Courier New"];
  var P = {fmt: "9:16", clips: []}, MID = {}, SEL = null, T = 0, TOCANDO = false, PPS = 60, ABA = "tudo", EL = {}, GRAV = null;
  var cv = $("veCv"), cx = cv.getContext("2d");

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() { return new Promise(function (ok, erro) { if (DB) return ok(DB); var r = indexedDB.open("bw_video", 1); r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}); if (!d.objectStoreNames.contains("estado")) d.createObjectStore("estado", {keyPath: "id"}); }; r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { erro(r.error); }; }); }
  function tx(loja, modo, fn) { return db().then(function (d) { return new Promise(function (ok, erro) { var t = d.transaction(loja, modo), q = fn(t.objectStore(loja)); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { erro(t.error); }; }); }).catch(function () { return null; }); }
  var tSalvar = 0;
  var HIST = [], FUT = [], tHist = 0;
  function marcarHist() { clearTimeout(tHist); tHist = setTimeout(gravarHist, 300); }
  function gravarHist() { clearTimeout(tHist); var s = JSON.stringify(P); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 60) HIST.shift(); FUT = []; } }
  function desfazer() { gravarHist(); if (HIST.length < 2) { aviso("Nada para desfazer."); return; } FUT.push(HIST.pop()); P = JSON.parse(HIST[HIST.length - 1]); SEL = sel() ? SEL : null; tudo(true); aviso("↶ Desfeito."); }
  function refazer() { if (!FUT.length) { aviso("Nada para refazer."); return; } var s = FUT.pop(); HIST.push(s); P = JSON.parse(s); tudo(true); aviso("↷ Refeito."); }
  function guardar() { clearTimeout(tSalvar); tSalvar = setTimeout(function () { tx("estado", "readwrite", function (s) { return s.put({id: "atual", p: JSON.parse(JSON.stringify(P))}); }); }, 400); }
  var AVISO_T = 0;
  function aviso(t, erro) { var a = $("veAviso"); a.hidden = !t; a.className = "ve-aviso" + (erro ? " erro" : ""); a.textContent = t || ""; clearTimeout(AVISO_T); if (t && APP) AVISO_T = setTimeout(function () { a.hidden = true; }, erro ? 6000 : 3200); }   /* no app o aviso some sozinho (fica por cima da prévia) */
  function fmtT(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ","); }
  function total() { return P.clips.reduce(function (m, c) { return Math.max(m, c.ini + c.dur); }, 0); }

  /* ---------- mídia ---------- */
  function tipoDe(f) { var t = f.type || ""; if (/^video\//.test(t)) return "video"; if (/^audio\//.test(t)) return "audio"; if (/^image\//.test(t)) return "imagem"; var n = (f.name || "").toLowerCase(); return /\.(mp4|mov|webm|m4v)$/.test(n) ? "video" : /\.(mp3|wav|m4a|ogg|aac)$/.test(n) ? "audio" : /\.(png|jpe?g|webp|gif)$/.test(n) ? "imagem" : ""; }
  function duracaoDe(url, tipo) { return new Promise(function (ok) { if (tipo === "imagem") return ok(4); var e = document.createElement(tipo === "video" ? "video" : "audio"), fim = function (d) { ok(isFinite(d) && d > 0 ? d : 5); }; e.preload = "metadata"; e.muted = true; e.onloadedmetadata = function () { duracaoDe.ok = true; if (e.duration === Infinity) { e.currentTime = 1e7; e.ontimeupdate = function () { e.ontimeupdate = null; fim(e.duration); }; } else fim(e.duration); }; e.onerror = function () { duracaoDe.ok = false; fim(0); }; setTimeout(function () { fim(e.duration); }, 4000); duracaoDe.ok = false; e.src = url; }); }
  function capa(m) { return new Promise(function (ok) {
    if (m.tipo === "imagem") { var im = new Image(); im.onload = function () { m.img = im; ok(); }; im.onerror = function () { m.ruim = true; ok(); }; im.src = m.url; return; }
    if (m.tipo !== "video") return ok();
    var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; var feito = false, fim = function () { if (feito) return; feito = true; try { var c = document.createElement("canvas"); c.width = 160; c.height = Math.max(1, Math.round(160 * (v.videoHeight || 9) / (v.videoWidth || 16))); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); m.capa = c.toDataURL("image/jpeg", 0.7); } catch (e) {} ok(); };
    v.onerror = function () { m.ruim = true; }; v.onloadeddata = function () { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); } catch (e) { fim(); } }; v.onseeked = fim; v.onerror = fim; setTimeout(fim, 3000); v.src = m.url; }); }
  async function porMidia(blob, nome, tipo, id, durFixa) {
    var m = {id: id || uid("m"), nome: String(nome || "arquivo").slice(0, 60), tipo: tipo, blob: blob, url: URL.createObjectURL(blob)};
    m.dur = durFixa || await duracaoDe(m.url, tipo); if (!durFixa && tipo !== "imagem" && !duracaoDe.ok) m.ruim = true; await capa(m);
    if (tipo === "video" && !m.capa) m.ruim = true;   /* sem nenhum quadro = o navegador não abre esse vídeo (HEVC, codec raro) */
    MID[m.id] = m;
    if (!id) await tx("midias", "readwrite", function (s) { return s.put({id: m.id, nome: m.nome, tipo: m.tipo, blob: blob, dur: m.dur}); });
    return m;
  }
  async function importar(files) {
    var n = 0, fora = 0, ruins = [];
    for (var i = 0; i < files.length; i++) { var f = files[i], t = tipoDe(f); if (!t) { fora++; continue; }
      if (files.length > 1) aviso("⏳ Trazendo " + (i + 1) + " de " + files.length + ": " + String(f.name).slice(0, 40) + "…");
      try { var mm = await porMidia(new Blob([await f.arrayBuffer()], {type: f.type}), f.name, t); n++; if (mm.ruim) ruins.push(mm.nome); desenharLib(); } catch (e) { fora++; } }   /* cópia na memória na hora (o iPhone invalida o original); a biblioteca aparece arquivo a arquivo */
    desenharLib();
    /* 22/11 (dono: "bugs ao adicionar mídia"): arquivo que o navegador NÃO consegue abrir (vídeo HEVC/H.265 ou foto HEIC do iPhone, codec raro) entrava calado,
       com 5 s e tela preta. Agora fica marcado com ⚠ na biblioteca e o aviso diz o que fazer. */
    if (ruins.length) aviso("⚠ " + ruins.length + " arquivo(s) não abriram neste navegador (" + ruins.slice(0, 2).join(", ") + (ruins.length > 2 ? "…" : "") + "). Costuma ser vídeo HEVC ou foto HEIC do iPhone: no iPhone, Ajustes → Câmera → Formatos → MAIS COMPATÍVEL; ou use o app BW no PC (Chrome/Edge com vídeo HEVC).", true);
    else aviso(n ? n + " arquivo(s) na biblioteca. Toque neles para pôr na linha do tempo." + (fora ? " " + fora + " não é vídeo, imagem nem áudio." : "") : "Esse arquivo não é vídeo, imagem nem áudio.", !n);
  }
  async function criacoes() {   /* imagens criadas no QUADRO DE HISTÓRIA e os personagens com imagem (mesmo aparelho) */
    var n = 0;
    try { var lista = await new Promise(function (ok) { var r = indexedDB.open("bw_reels"); r.onsuccess = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) { d.close(); return ok([]); } var q = d.transaction("midias").objectStore("midias").getAll(); q.onsuccess = function () { d.close(); ok(q.result || []); }; q.onerror = function () { d.close(); ok([]); }; }; r.onerror = function () { ok([]); }; });
      for (var i = 0; i < lista.length; i++) { var x = lista[i]; if (!x.blob || !(x.tipo === "imagem" || x.tipo === "video")) continue; var id = "cr-" + x.id; if (MID[id]) continue; var m = await porMidia(x.blob, x.projeto === "__quadro" ? "Quadro · " + (x.nome || "cena") : (x.nome || "Reels"), x.tipo === "video" ? "video" : "imagem", id); m.criacao = true; n++; } } catch (e) {}
    try { var ps = window.BWPersonagens ? await BWPersonagens.listar() : []; for (var k = 0; k < ps.length; k++) { var p = ps[k], idp = "pe-" + p.id; if (!p.blob || MID[idp]) continue; var mp = await porMidia(p.blob, "Personagem · " + (p.nome || ""), "imagem", idp); mp.criacao = true; n++; } } catch (e) {}
    try { var bl = window.BWCriacoes ? await BWCriacoes.listar() : []; for (var b = 0; b < bl.length; b++) { if (await trazerCriacao(bl[b].id, false)) n++; } } catch (e) {}
    ABA = "tudo"; desenharLib(); aviso(n ? n + " criação(ões) trazida(s) das ferramentas deste aparelho." : "Não achei criações novas neste aparelho. Crie em CRIAR PARA A LINHA DO TEMPO, ou traga de fora pelo ＋ IMPORTAR.", !n);
  }

  /* ---------- AMBIENTE ÚNICO (20/11): a linha do tempo é o centro; as ferramentas criam para ela ----------
     Cada criação guardada em assets/bw-criacoes.js entra aqui como a mídia "bc-<id da criação>". Quando a pessoa
     reabre a criação na ferramenta de origem (✎) e manda de volta, o blob é trocado NO LUGAR: os clipes continuam
     onde estavam, com os mesmos cortes, efeitos e volume. */
  async function trazerCriacao(id, porNaLinha) {
    if (!window.BWCriacoes) return null;
    var c = null; try { c = await BWCriacoes.pegar(id); } catch (e) {}
    if (!c || !c.blob || !(c.tipo === "imagem" || c.tipo === "video")) return null;
    var mid = "bc-" + c.id, antes = MID[mid], nova = !antes || antes.crCriado !== c.criado;
    if (!nova && !porNaLinha) return null;
    if (antes && antes.url) try { URL.revokeObjectURL(antes.url); } catch (e) {}
    var m = await porMidia(c.blob, c.nome, c.tipo, mid, c.tipo === "imagem" ? 0 : c.dur);
    m.criacao = true; m.crCriado = c.criado; m.cr = { id: c.id, ferramenta: c.ferramenta, projeto: c.projeto };
    await tx("midias", "readwrite", function (s) { return s.put({ id: mid, nome: m.nome, tipo: m.tipo, blob: c.blob, dur: m.dur, cr: m.cr, crCriado: c.criado }); });
    var usados = P.clips.filter(function (x) { return x.mid === mid; });
    usados.forEach(function (x) {   /* a nova versão pode ser mais curta: encurta o clipe em vez de mostrar quadro vazio */
      if (m.tipo === "imagem") return;
      x.corte = Math.max(0, Math.min(x.corte || 0, Math.max(0, m.dur - 0.2)));
      x.dur = Math.max(0.2, Math.min(x.dur, (m.dur - x.corte) / (x.vel || 1)));
    });
    if (porNaLinha && !usados.length) addClip(m);
    else if (usados.length) { guardar(); tudo(true); }
    desenharLib();   /* sem isto a criação entrava na linha do tempo mas não aparecia na biblioteca */
    return { m: m, trocou: usados.length > 0, nome: c.nome };
  }
  function editarNaOrigem(mid) {
    var m = MID[mid]; if (!m || !m.cr || !window.BWCriacoes) return;
    var f = BWCriacoes.FERR[m.cr.ferramenta]; if (!f) return aviso("Essa criação não tem ferramenta de origem — troque pelo ⋯ SUBSTITUIR MÍDIA.", true);
    guardar();
    location.href = BWCriacoes.url(m.cr.ferramenta, m.cr.projeto, { voltar: "video", criacao: m.cr.id });
  }
  function desenharFerramentas() {
    if (!window.BWCriacoes) return;
    var ordem = ["motion", "telas", "d3", "fotos", "criador", "reels", "quadro"];
    $("veCriarLista").innerHTML = ordem.map(function (k) {
      var f = BWCriacoes.FERR[k];
      return '<a href="' + BWCriacoes.url(k, "", { voltar: "video" }) + '" style="--cf:' + f.cor + '"><i aria-hidden="true">' + f.icone + "</i>" + esc(f.curto) + "</a>";
    }).join("");
  }
  async function chegouCriacao() {   /* video.html?criacao=ID — acabou de ser mandada por uma ferramenta */
    var id = ""; try { id = new URLSearchParams(location.search).get("criacao") || ""; } catch (e) {}
    if (!id) { try { id = localStorage.getItem("ui_criacao_nova") || ""; } catch (e) {} if (!id) return; }
    try { localStorage.removeItem("ui_criacao_nova"); } catch (e) {}
    var r = await trazerCriacao(id, true);
    if (r) aviso(r.trocou ? "✓ " + r.nome + " trocada no lugar — os cortes e os efeitos continuaram." : "✓ " + r.nome + " entrou na linha do tempo.");
    if (location.search.indexOf("criacao=") > -1) try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  /* ---------- efeitos sonoros e trilhas (sintetizados aqui, sem arquivo de terceiros) ---------- */
  var SONS = [["sfx", "Whoosh", 0.7], ["sfx", "Pop", 0.25], ["sfx", "Ding", 1.4], ["sfx", "Impacto", 0.9], ["sfx", "Clique", 0.12], ["sfx", "Subida", 1.6], ["trilha", "Base calma", 24], ["trilha", "Base animada", 24]];
  function wav(canais, taxa) {
    var n = canais[0].length, nc = canais.length, buf = new ArrayBuffer(44 + n * nc * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * nc * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, taxa, true); v.setUint32(28, taxa * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * nc * 2, true);
    for (var i = 0, o = 44; i < n; i++) for (var c = 0; c < nc; c++, o += 2) { var x = Math.max(-1, Math.min(1, canais[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], {type: "audio/wav"});
  }
  async function sintetizar(nome, dur) {
    var sr = 44100, O = window.OfflineAudioContext || window.webkitOfflineAudioContext, o = new O(1, Math.ceil(dur * sr), sr), g = o.createGain(); g.connect(o.destination);
    var ruido = function () { var b = o.createBuffer(1, Math.ceil(dur * sr), sr), d = b.getChannelData(0), a = 12345; for (var i = 0; i < d.length; i++) { a = (a * 1664525 + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; } var s = o.createBufferSource(); s.buffer = b; return s; };
    var tom = function (tipo, f0, f1, t0, d, vol) { var os = o.createOscillator(), gg = o.createGain(); os.type = tipo; os.frequency.setValueAtTime(f0, t0); if (f1) os.frequency.exponentialRampToValueAtTime(f1, t0 + d); gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, d / 4)); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + d); os.connect(gg); gg.connect(g); os.start(t0); os.stop(t0 + d + 0.02); };
    if (nome === "Whoosh" || nome === "Subida") { var r = ruido(), f = o.createBiquadFilter(), gg = o.createGain(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(nome === "Subida" ? 200 : 300, 0); f.frequency.exponentialRampToValueAtTime(nome === "Subida" ? 6000 : 4000, dur * (nome === "Subida" ? 0.95 : 0.5)); if (nome === "Whoosh") f.frequency.exponentialRampToValueAtTime(400, dur);
      gg.gain.setValueAtTime(0.0001, 0); gg.gain.exponentialRampToValueAtTime(0.7, dur * (nome === "Subida" ? 0.9 : 0.45)); gg.gain.exponentialRampToValueAtTime(0.0001, dur); r.connect(f); f.connect(gg); gg.connect(g); r.start(0); if (nome === "Subida") tom("sawtooth", 110, 880, 0, dur * 0.95, 0.15); }
    else if (nome === "Pop") tom("sine", 620, 150, 0, 0.16, 0.8);
    else if (nome === "Ding") { tom("sine", 1320, 0, 0, 1.3, 0.5); tom("sine", 1980, 0, 0, 0.9, 0.25); }
    else if (nome === "Impacto") { tom("sine", 130, 38, 0, 0.8, 0.95); var ri = ruido(), fi = o.createBiquadFilter(), gi = o.createGain(); fi.type = "lowpass"; fi.frequency.value = 900; gi.gain.setValueAtTime(0.6, 0); gi.gain.exponentialRampToValueAtTime(0.0001, 0.25); ri.connect(fi); fi.connect(gi); gi.connect(g); ri.start(0); }
    else if (nome === "Clique") { var rc = ruido(), fc = o.createBiquadFilter(), gc = o.createGain(); fc.type = "highpass"; fc.frequency.value = 2500; gc.gain.setValueAtTime(0.7, 0); gc.gain.exponentialRampToValueAtTime(0.0001, 0.05); rc.connect(fc); fc.connect(gc); gc.connect(g); rc.start(0); }
    else { var anim = nome === "Base animada", bpm = anim ? 112 : 76, b = 60 / bpm, acordes = anim ? [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 293.7]] : [[196, 246.9, 293.7], [164.8, 207.7, 246.9], [174.6, 220, 261.6], [146.8, 185, 220]];
      for (var t = 0, k = 0; t < dur - 0.1; t += b * 4, k++) { acordes[k % 4].forEach(function (fq) { tom("triangle", fq, 0, t, Math.min(b * 4, dur - t), 0.09); }); tom("sine", acordes[k % 4][0] / 2, 0, t, Math.min(b * 4, dur - t), 0.16);
        if (anim) for (var q = 0; q < 4 && t + q * b < dur - 0.2; q++) { tom("sine", 140, 45, t + q * b, 0.22, 0.5); tom("square", acordes[k % 4][(q + k) % 3] * 2, 0, t + q * b + b / 2, 0.12, 0.035); } } }
    var rb = await o.startRendering(); return wav([rb.getChannelData(0)], sr);
  }
  async function porSom(i) { var s = SONS[i], id = "som-" + s[1].toLowerCase().replace(/\s+/g, "-"); if (!MID[id]) { var m = await porMidia(await sintetizar(s[1], s[2]), s[1], "audio", id, s[2]); m.som = s[0]; } return MID[id]; }

  /* ---------- clipes ---------- */
  function fimDaTrilha(tr) { return P.clips.filter(function (c) { return c.trilha === tr; }).reduce(function (m, c) { return Math.max(m, c.ini + c.dur); }, 0); }
  function addClip(m, trilha, em) {
    var tr = trilha || (m.tipo === "audio" ? (m.som === "sfx" ? "a2" : "a1") : "v1");
    var c = {id: uid(), trilha: tr, tipo: m.tipo, mid: m.id, ini: em != null ? Math.max(0, Math.round(em * 20) / 20) : tr === "a2" || tr === "v2" ? Math.round(T * 10) / 10 : fimDaTrilha(tr), dur: Math.round(Math.min(m.dur, m.tipo === "imagem" ? 4 : 600) * 100) / 100, corte: 0, vel: 1, vol: 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: 0, encaixe: m.id.indexOf("pe-") === 0 ? "caber" : "cobrir"};
    if (!livreEm(c.trilha, c.ini, c.dur, null)) c.trilha = novaTrilha(fam(c.trilha));   /* em cima de outro take = camada nova */
    P.clips.push(c); SEL = c.id; tudo(); return c;
  }
  function addTexto(em) { em = em || {}; var c = {id: uid(), trilha: "tx", tipo: "texto", ini: Math.round((em.t != null ? em.t : T) * 10) / 10, dur: 3, txt: "Seu texto", fonte: "Montserrat", tam: 6, cor: "#ffffff", fundo: "", x: em.x != null ? em.x : 0, y: em.y != null ? em.y : 30, op: 100, fin: 0.3, fout: 0.3}; P.clips.push(c); SEL = c.id; tudo(); return c; }
  function sel() { return P.clips.filter(function (c) { return c.id === SEL; })[0] || null; }
  function vel(c) { return +c.vel > 0 ? +c.vel : 1; }
  // corta o clipe c no tempo t (devolve a 2ª parte); a lâmina (C), o Ctrl+K e o ✂ DIVIDIR usam esta
  function dividirEm(c, t) { t = Math.round(t * 20) / 20; if (!c || t <= c.ini + 0.05 || t >= c.ini + c.dur - 0.05) return null;
    var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = t; d.dur = Math.round((c.ini + c.dur - t) * 100) / 100; if (c.tipo !== "texto" && c.tipo !== "imagem") d.corte = (c.corte || 0) + (t - c.ini) * vel(c); d.fin = 0; d.trans = null; c.dur = Math.round((t - c.ini) * 100) / 100; c.fout = 0; P.clips.push(d); return d; }
  function dividir() { var c = sel(), alvos = c ? [c] : P.clips.filter(function (x) { return T > x.ini + 0.05 && T < x.ini + x.dur - 0.05; });
    var n = 0, ult = null; alvos.forEach(function (x) { var d = dividirEm(x, T); if (d) { n++; ult = d; } });
    if (!n) { aviso("Ponha a agulha no meio de um clipe para dividir (ou use a lâmina: tecla C e clique no clipe).", true); return; } if (ult) SEL = ult.id; tudo(); aviso("✂ Dividido" + (n > 1 ? " em " + n + " camadas" : "") + "."); }
  function duplicar() { var c = sel(); if (!c) return; var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = c.ini + c.dur; P.clips.push(d); SEL = d.id; tudo(); aviso("⧉ Duplicado."); }
  function apagar(juntar) { var c = sel(); if (!c) return; soltarEl(c.id); P.clips = P.clips.filter(function (x) { return x !== c; });
    if (juntar) P.clips.forEach(function (x) { if (x.trilha === c.trilha && x.ini >= c.ini + c.dur - 0.01) x.ini = Math.max(0, Math.round((x.ini - c.dur) * 100) / 100); });
    SEL = null; tudo(); aviso(juntar ? "🗑 Apagado e o espaço fechado." : "🗑 Apagado."); }
  var COPIA = null;
  function copiar() { var c = sel(); if (!c) return false; COPIA = JSON.parse(JSON.stringify(c)); aviso("Copiado. Ctrl+V cola na agulha."); }
  function colar() { if (!COPIA) { aviso("Nada copiado ainda (Ctrl+C num clipe).", true); return; } var d = JSON.parse(JSON.stringify(COPIA)); d.id = uid(); d.ini = Math.round(T * 20) / 20; P.clips.push(d); SEL = d.id; tudo(); aviso("Colado na agulha."); }
  /* COPIAR E COLAR AJUSTES (atributos) de um take em outro: cada grupo só entra onde faz sentido (som em quem tem som, imagem em quem tem imagem) */
  var ATRIB = null, AT_VIS = ["ia", "grade", "op", "esc", "x", "y", "encaixe", "efeito", "efInt", "ck", "ckCor", "ckModo", "ckNivel", "ckInt", "ckSuave", "ckLimpa", "ckSombra"], AT_TXT = ["fonte", "tam", "cor", "fundo", "op"], AT_SOM = ["vol", "normG", "ruido", "voz"], AT_TEMPO = ["fin", "fout"];
  function temSom(c) { return c.tipo === "video" || c.tipo === "audio"; }
  function temImg(c) { return c.tipo === "video" || c.tipo === "imagem"; }
  function copiarAtrib() { var c = sel(); if (!c) return false; ATRIB = JSON.parse(JSON.stringify(c)); aviso("Ajustes copiados. Escolha outro take e use COLAR AJUSTES (Ctrl+Shift+V)."); }
  function colarAtrib() { var c = sel(); if (!c) return false; if (!ATRIB) { aviso("Nenhum ajuste copiado ainda (botão direito no take › Copiar ajustes).", true); return; }
    var ks = AT_TEMPO.slice(), o = ATRIB, oq = [];
    if (temImg(c) && temImg(o)) { ks = ks.concat(AT_VIS); oq.push("imagem"); } if (c.tipo === "texto" && o.tipo === "texto") { ks = ks.concat(AT_TXT); oq.push("texto"); } if (temSom(c) && temSom(o)) { ks = ks.concat(AT_SOM); oq.push("som"); }
    ks.forEach(function (k) { if (o[k] === undefined) delete c[k]; else c[k] = JSON.parse(JSON.stringify(o[k])); }); oq.push("entrada/saída suave");
    tudo(); aviso("Ajustes colados: " + oq.join(", ") + "."); }
  function ligarDesligar() { var c = sel(); if (!c) return false; c.off = c.off ? 0 : 1; tudo(); aviso(c.off ? "Take desativado: fica na linha do tempo, mas não aparece nem toca." : "Take ativado de novo."); }
  /* APARAR ATÉ A AGULHA (Q = tira o começo, W = tira o fim), como no Premiere/CapCut; fechar = puxa o resto para cá */
  function aparar(lado) { var c = sel(), alvos = c ? [c] : P.clips.filter(function (x) { return T > x.ini + 0.05 && T < x.ini + x.dur - 0.05; }), n = 0;
    alvos.forEach(function (x) { var ini0 = x.ini, d = dividirEm(x, T); if (!d) return; n++; var fora = lado === "ini" ? x : d, fica = lado === "ini" ? d : x;
      if (lado === "ini") { fica.fin = x.fin || 0; fica.trans = x.trans || null; fica.ini = ini0; var corte = Math.round((T - ini0) * 100) / 100; P.clips.forEach(function (y) { if (y !== fica && y !== fora && y.trilha === fica.trilha && y.ini >= T - 0.01) y.ini = Math.max(0, Math.round((y.ini - corte) * 100) / 100); }); }
      soltarEl(fora.id); P.clips = P.clips.filter(function (y) { return y !== fora; }); if (SEL === fora.id || !SEL) SEL = fica.id; });
    if (!n) { aviso("Ponha a agulha no meio de um take para aparar.", true); return; } if (lado === "ini") irPara(alvos[0].ini); tudo(); aviso(lado === "ini" ? "⇤ Começo cortado até a agulha (o resto veio junto)." : "⇥ Fim cortado na agulha."); }
  function abrirSom() { abrirGrupo("ve-som"); }
  function abrirGrupo(chave) { var c = sel(); if (!c) return; if (window.__veVista && __veVista.mostrar) __veVista.mostrar("dir"); var h = document.querySelector('#vePropCorpo [data-seta="' + chave + '"]'); if (h) { var corpo = h.nextElementSibling; if (corpo && !corpo.offsetParent) h.click(); h.scrollIntoView({block: "nearest"}); } }
  function maxDur(c) { var m = MID[c.mid]; return c.tipo === "video" || c.tipo === "audio" ? Math.max(0.2, ((m ? m.dur : c.dur) - (c.corte || 0)) / vel(c)) : 600; }
  function mudarVel(c, v) { var a = vel(c); c.vel = v; c.dur = Math.round(Math.min(c.dur * a / v, maxDur(c)) * 100) / 100; tudo(); aviso("Velocidade " + String(v).replace(".", ",") + "×" + (v < 1 ? " (câmera lenta)" : v > 1 ? " (acelerado)" : "") + "."); }
  // CONGELAR QUADRO (CapCut): a imagem do quadro da agulha vira um clipe parado de 2 s e o resto do clipe vem depois
  async function congelar() { var c = sel(); if (!c || c.tipo !== "video") { aviso("Escolha um clipe de VÍDEO e ponha a agulha no ponto que quer congelar.", true); return; }
    if (T < c.ini || T > c.ini + c.dur) irPara(c.ini + 0.05); var o = elDe(c); if (!o || o.e.readyState < 2) { aviso("O vídeo ainda está carregando — tente de novo.", true); return; }
    var k = document.createElement("canvas"); k.width = o.e.videoWidth; k.height = o.e.videoHeight; k.getContext("2d").drawImage(o.e, 0, 0);
    var blob = await new Promise(function (ok) { k.toBlob(ok, "image/jpeg", 0.92); }); if (!blob) return;
    var m = await porMidia(blob, "Quadro congelado " + fmtT(T), "imagem"), t = T, d = dividirEm(c, t), dur = 2;
    P.clips.forEach(function (x) { if (x.trilha === c.trilha && x.ini >= t - 0.01 && x !== c) x.ini = Math.round((x.ini + dur) * 100) / 100; });
    var f = {id: uid(), trilha: c.trilha, tipo: "imagem", mid: m.id, ini: t, dur: dur, corte: 0, vel: 1, vol: 100, op: c.op, esc: c.esc, x: c.x, y: c.y, fin: 0, fout: 0, encaixe: c.encaixe || "cobrir"};
    P.clips.push(f); SEL = f.id; desenharLib(); tudo(); aviso("❄ Quadro congelado por 2 s" + (d ? " (o vídeo continua depois)" : "") + "."); }
  // SUBSTITUIR a mídia do clipe (mantém o lugar, o tempo e os ajustes)
  var TROCAR = null;
  function substituir(c) { if (!c || c.tipo === "texto") return; TROCAR = c.id; var i = $("veArqTroca"); i.accept = c.tipo === "audio" ? "audio/*" : "video/*,image/*"; i.click(); }
  async function substituirCom(f) { var c = P.clips.filter(function (x) { return x.id === TROCAR; })[0]; TROCAR = null; if (!c || !f) return; var t = tipoDe(f);
    if (!t || (c.tipo === "audio") !== (t === "audio")) { aviso("Esse arquivo não serve para este clipe (" + (c.tipo === "audio" ? "precisa ser um som" : "precisa ser vídeo ou imagem") + ").", true); return; }
    var m = await porMidia(new Blob([await f.arrayBuffer()], {type: f.type}), f.name, t); soltarEl(c.id); c.mid = m.id; c.tipo = t; c.corte = 0; c.dur = Math.min(c.dur, maxDur(c)); desenharLib(); tudo(); aviso("Mídia trocada — o clipe ficou no mesmo lugar."); }

  /* ---------- prévia ---------- */
  var ACTX = null, MESTRE = null, DEST = null;
  function audioCtx() { if (ACTX) return ACTX; var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ACTX = new C(); MESTRE = ACTX.createGain(); MESTRE.connect(ACTX.destination); DEST = ACTX.createMediaStreamDestination(); MESTRE.connect(DEST); Object.keys(EL).forEach(function (k) { ligarSom(EL[k]); }); return ACTX; }
  /* cada take com som passa por: corta-grave (zumbido) → corta-agudo (chiado) → presença da voz → compressor → volume → mestre.
     Desligado, cada filtro fica neutro. A exportação grava o MESMO som (MESTRE → DEST), então o que se ouve é o que sai. */
  function ligarSom(o) { if (!ACTX || o.g || !o.e || o.semSom) return; try { var s = ACTX.createMediaElementSource(o.e);
      o.hp = ACTX.createBiquadFilter(); o.hp.type = "highpass"; o.hp.frequency.value = 10; o.lp = ACTX.createBiquadFilter(); o.lp.type = "lowpass"; o.lp.frequency.value = 20000;
      o.pk = ACTX.createBiquadFilter(); o.pk.type = "peaking"; o.pk.frequency.value = 3000; o.pk.Q.value = 0.9; o.pk.gain.value = 0;
      o.cp = ACTX.createDynamicsCompressor(); o.cp.threshold.value = 0; o.cp.ratio.value = 1; o.cp.attack.value = 0.005; o.cp.release.value = 0.2; o.cp.knee.value = 6;
      o.g = ACTX.createGain(); s.connect(o.hp); o.hp.connect(o.lp); o.lp.connect(o.pk); o.pk.connect(o.cp); o.cp.connect(o.g); o.g.connect(MESTRE); o.fx = ""; } catch (e) { o.semSom = true; } }
  var RUIDO = {0: [10, 20000], 1: [80, 14000], 2: [120, 10000], 3: [170, 7000]};
  function filtrosSom(o, c) { var chave = (c.ruido || 0) + "|" + (c.voz ? 1 : 0); if (!o.hp || o.fx === chave) return; o.fx = chave; var r = RUIDO[c.ruido || 0] || RUIDO[0], t = ACTX.currentTime;
    o.hp.frequency.setTargetAtTime(r[0], t, 0.02); o.lp.frequency.setTargetAtTime(r[1], t, 0.02); o.pk.gain.setTargetAtTime(c.voz ? 4 : 0, t, 0.02);
    o.cp.threshold.setTargetAtTime(c.voz ? -24 : 0, t, 0.02); o.cp.ratio.setTargetAtTime(c.voz ? 3 : 1, t, 0.02); }
  var ONDA = {}, ONDA_MAX = 200 * 1048576;
  function analisar(m) { if (!m || !m.blob || (m.tipo !== "audio" && m.tipo !== "video")) return Promise.resolve(null); if (ONDA[m.id]) return ONDA[m.id];
    if (m.blob.size > ONDA_MAX) { ONDA[m.id] = Promise.resolve(null); return ONDA[m.id]; }
    ONDA[m.id] = m.blob.arrayBuffer().then(function (ab) { var C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null; var oc = new C(1, 1, 44100);
      return new Promise(function (ok) { var feito = false, fim = function (b) { if (!feito) { feito = true; ok(b || null); } }; try { var pr = oc.decodeAudioData(ab, fim, function () { fim(null); }); if (pr && pr.then) pr.then(fim, function () { fim(null); }); } catch (e) { fim(null); } }); })
      .then(function (buf) { if (!buf || !buf.length) return null; var n = buf.numberOfChannels, L = buf.length, sr = buf.sampleRate, canais = []; for (var k = 0; k < n; k++) canais.push(buf.getChannelData(k));
        var por = Math.max(1, Math.floor(sr / 100)), N = Math.ceil(L / por), pico = new Float32Array(N), rms = new Float32Array(N);
        for (var i = 0; i < N; i++) { var a = i * por, b = Math.min(L, a + por), mx = 0, sq = 0; for (var j = a; j < b; j++) { var v = 0; for (var q = 0; q < n; q++) v += canais[q][j]; v /= n; var av = v < 0 ? -v : v; if (av > mx) mx = av; sq += v * v; } pico[i] = mx; rms[i] = Math.sqrt(sq / Math.max(1, b - a)); }
        var res = {pico: pico, rms: rms, passo: por / sr, dur: L / sr}; res.img = imagemOnda(res); return res; }, function () { return null; });
    return ONDA[m.id]; }
  function imagemOnda(o) { try { var W = Math.min(4000, Math.max(200, Math.round(o.dur * 40))), H = 40, k = document.createElement("canvas"); k.width = W; k.height = H; var x = k.getContext("2d"); x.fillStyle = "rgba(255,255,255,.55)";
      var por = o.pico.length / W; for (var i = 0; i < W; i++) { var a = Math.floor(i * por), b = Math.max(a + 1, Math.floor((i + 1) * por)), mx = 0; for (var j = a; j < b && j < o.pico.length; j++) if (o.pico[j] > mx) mx = o.pico[j]; var h = Math.max(1, Math.min(1, mx) * (H - 2)); x.fillRect(i, (H - h) / 2, 1, h); }
      return k.toDataURL("image/png"); } catch (e) { return ""; } }
  /* NORMALIZAR: leva o trecho usado do take a um volume médio padrão (≈ −16 dBFS RMS) sem deixar o pico passar de −1 dBFS */
  function normalizar(c) { var m = MID[c.mid]; if (!m) return; aviso("Medindo o som do take…");
    analisar(m).then(function (o) { if (!o) { aviso("Não consegui ler o som deste arquivo" + (m.blob && m.blob.size > ONDA_MAX ? " (arquivo muito grande para medir no aparelho)" : "") + ".", true); return; }
      var a = Math.floor((c.corte || 0) / o.passo), b = Math.min(o.rms.length, Math.ceil(((c.corte || 0) + c.dur * vel(c)) / o.passo)), sq = 0, n = 0, pk = 0;
      for (var i = a; i < b; i++) { if (o.rms[i] > 0.003) { sq += o.rms[i] * o.rms[i]; n++; } if (o.pico[i] > pk) pk = o.pico[i]; }
      if (!n || pk < 1e-4) { aviso("Este trecho está em silêncio — nada para normalizar.", true); return; }
      var rms = Math.sqrt(sq / n), alvo = Math.pow(10, -16 / 20), gg = alvo / rms, teto = Math.pow(10, -1 / 20) / pk; gg = lim(Math.min(gg, teto), 0.1, 8);
      c.normG = Math.round(gg * 1000) / 1000; tudo(); aviso("🔊 Normalizado: " + (gg >= 1 ? "+" : "") + (20 * Math.log10(gg)).toFixed(1).replace(".", ",") + " dB neste take" + (gg === teto ? " (limitado para não estourar)" : "") + "."); }); }
  function dbDe(c) { var v = c.vol == null ? 100 : c.vol; return v <= 0 ? -40 : Math.round(20 * Math.log10(v / 100) * 2) / 2; }
  /* EXTRAIR ÁUDIO: o som do vídeo vira um take próprio na camada TRILHA (mesmo trecho) e o vídeo fica mudo */
  function extrairAudio(c) { if (!c || c.tipo !== "video") return; var trilha = P.clips.some(function (x) { return x.trilha === "a1" && x.ini < c.ini + c.dur - 0.01 && x.ini + x.dur > c.ini + 0.01; }) ? "a2" : "a1";
    var a = {id: uid(), trilha: trilha, tipo: "audio", mid: c.mid, ini: c.ini, dur: c.dur, corte: c.corte || 0, vel: vel(c), vol: c.vol == null ? 100 : c.vol, fin: c.fin || 0, fout: c.fout || 0, ruido: c.ruido || 0, voz: c.voz || 0, normG: c.normG};
    c.vol = 0; P.clips.push(a); SEL = a.id; tudo(); aviso("🎵 Áudio extraído para a camada " + (trilha === "a1" ? "TRILHA" : "EFEITOS") + " — o vídeo ficou mudo."); }
  /* ---------- MODELOS (21/11): espaços para trocar pelo take do usuário ---------- */
  function melhorCorte(m, dur, k) { if (m.tipo !== "video") return 0; var md = m.dur || 0; if (md >= dur + 8) return Math.min(md - dur, 4 + (k || 0) * dur); return Math.max(0, (md - dur) / 2); }
  function trocarEspaco(c, m, k, semAviso) { soltarEl(c.id); c.mid = m.id; c.tipo = m.tipo; c.corte = Math.round(melhorCorte(m, c.dur, k) * 100) / 100;
    if (m.tipo === "video" && (m.dur || 0) < c.dur) c.vel = Math.max(0.5, Math.round((m.dur / c.dur) * 100) / 100); else c.vel = c.velModelo || 1;
    if (c.vol == null || c.vol === 100) c.vol = c.volModelo == null ? 0 : c.volModelo; delete c.ph;
    var prox = P.clips.filter(function (x) { return x.ph; }).sort(function (a, b) { return a.ini - b.ini; })[0]; SEL = prox ? prox.id : c.id;
    tudo(); if (!semAviso) aviso(prox ? "✓ Take colocado. Agora o espaço " + prox.ph + " (" + (prox.rot || "") + ") — toque em outro vídeo ou foto." : "✓ Todos os espaços do modelo preenchidos!"); if (window.VEModelos) VEModelos.faixa(); }
  function preencherSozinho() { var vazios = P.clips.filter(function (x) { return x.ph; }).sort(function (a, b) { return a.ini - b.ini; });
    var meus = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return (m.tipo === "video" || m.tipo === "imagem") && !m.ph && m.id.indexOf("ph-") !== 0; });
    if (!vazios.length) { aviso("Não há espaços vazios no projeto."); return 0; } if (!meus.length) { aviso("Importe seus vídeos e fotos primeiro (＋ IMPORTAR) — depois toque em PREENCHER SOZINHO.", true); return 0; }
    var uso = {}; vazios.forEach(function (c, i) { var m = meus[i % meus.length]; uso[m.id] = (uso[m.id] || 0); trocarEspaco(c, m, uso[m.id]++, true); });
    SEL = null; tudo(); aviso("⚡ " + vazios.length + " espaços preenchidos com " + meus.length + " arquivo(s). Toque num take para trocar por outro."); if (window.VEModelos) VEModelos.faixa(); return vazios.length; }
  var ANALISANDO = {};
  /* ANALISAR PESSOA: roda a IA no take inteiro (no aparelho) e guarda as máscaras; a tela continua usável enquanto isso */
  async function analisarPessoa(c) { var m = MID[c.mid]; if (!m || !window.BWMascara) return; if (ANALISANDO[m.id] != null) return;
    ANALISANDO[m.id] = 0; desenharProp(); aviso("🧠 Analisando a pessoa no take (no aparelho)…");
    try { await BWMascara.analisar(m, {aoAndar: function (p) { ANALISANDO[m.id] = p; var e = $("veIaProg"); if (e) e.textContent = Math.round(p * 100) + "%"; }});
      delete ANALISANDO[m.id]; c.ia = c.ia || {}; if (c.ia.frente == null) c.ia.frente = true; tudo(); aviso("✓ Pessoa encontrada em todo o take. Agora é só pôr texto atrás dela (ou escolher um MODELO COM A PESSOA)."); }
    catch (e) { delete ANALISANDO[m.id]; desenharProp(); aviso(/cancel/.test(String(e && e.message)) ? "Análise cancelada." : "Não consegui analisar este take" + (navigator.onLine ? "" : " (sem internet: a 1ª vez precisa baixar o modelo)") + ".", true); } }
  function ganhoTake(c) { return (c.vol == null ? 100 : c.vol) / 100 * (+c.normG > 0 ? +c.normG : 1); }
  function elDe(c) { var o = EL[c.id]; if (o) return o; var m = MID[c.mid]; if (!m) return null; var e = document.createElement(c.tipo === "video" ? "video" : "audio"); e.preload = "auto"; e.playsInline = true; e.crossOrigin = "anonymous"; e.src = m.url; e.addEventListener("seeked", function () { if (!TOCANDO) desenhar(); }); e.addEventListener("loadeddata", function () { if (!TOCANDO) desenhar(); }); o = EL[c.id] = {e: e, g: null}; ligarSom(o); return o; }
  function soltarEl(id) { var o = EL[id]; if (!o) return; try { o.e.pause(); o.e.removeAttribute("src"); o.e.load(); } catch (e) {} delete EL[id]; }
  function fade(c, t) { if (c.off) return 0; var a = 1, r = t - c.ini, f = c.ini + c.dur - t; if (c.fin > 0 && r < c.fin) a = Math.min(a, r / c.fin); if (c.fout > 0 && f < c.fout) a = Math.min(a, f / c.fout); return lim(a, 0, 1); }
  function sincronizar(c, t, ativo) {
    var o = elDe(c); if (!o) return null; var e = o.e;
    if (!ativo) { if (!e.paused) e.pause(); return o; }
    var alvo = (c.corte || 0) + (t - c.ini) * vel(c), v = lim(ganhoTake(c) * fade(c, t), 0, 4);
    if (o.g) { o.g.gain.value = v; e.volume = 1; filtrosSom(o, c); } else e.volume = Math.min(1, v);
    if (Math.abs(e.playbackRate - vel(c)) > 0.001) { try { e.playbackRate = vel(c); e.preservesPitch = true; } catch (x) {} }
    if (TOCANDO) { if (e.paused) { try { e.currentTime = alvo; } catch (x) {} var pr = e.play(); if (pr && pr.catch) pr.catch(function () {}); } else if (Math.abs(e.currentTime - alvo) > 0.35 * vel(c)) { try { e.currentTime = alvo; } catch (x) {} } }
    else { if (!e.paused) e.pause(); if (Math.abs(e.currentTime - alvo) > 0.04) { try { e.currentTime = alvo; } catch (x) {} } }
    return o;
  }
  /* camada de efeito (fora da tela): a mídia é desenhada aqui, recebe o efeito por modos de mistura e volta por cima com a intensidade escolhida */
  var EF = null, EF2 = null, GRAO = null, SEM_CK = false, PEGAR_CK = false;
  function tela2(k, W, H) { if (!k) k = document.createElement("canvas"); if (k.width !== W || k.height !== H) { k.width = W; k.height = H; } return k; }
  function comEfeito(fonte, x, y, w, h, c, t) {
    var W = cv.width, H = cv.height; EF = tela2(EF, W, H); var o = EF.getContext("2d"); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, W, H); o.drawImage(fonte, x, y, w, h);
    var mix = function (op, cor, a) { o.globalCompositeOperation = op; o.globalAlpha = a == null ? 1 : a; o.fillStyle = cor; o.fillRect(0, 0, W, H); o.globalAlpha = 1; };
    var copia = function () { EF2 = tela2(EF2, W, H); var q = EF2.getContext("2d"); q.globalCompositeOperation = "copy"; q.drawImage(EF, 0, 0); return EF2; };
    var vinheta = function (f) { var g = o.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + f + ")"); o.globalCompositeOperation = "source-atop"; o.fillStyle = g; o.fillRect(0, 0, W, H); };
    switch (c.efeito) {
      case "pb": mix("saturation", "#808080"); mix("overlay", "#808080", 0); break;
      case "sepia": mix("saturation", "#808080"); mix("color", "#a8743c", 0.85); break;
      case "vintage": mix("saturation", "#808080", 0.55); mix("color", "#b07d4a", 0.45); mix("multiply", "#f3e2c3", 0.6); vinheta(0.55); break;
      case "quente": mix("soft-light", "#ff8a2a", 0.85); break;
      case "frio": mix("soft-light", "#2a8aff", 0.85); break;
      case "vivido": mix("saturation", "#ff0000", 0.35); o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.35; o.drawImage(copia(), 0, 0); break;
      case "contraste": o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.75; o.drawImage(copia(), 0, 0); break;
      case "noite": mix("saturation", "#808080", 0.5); mix("multiply", "#2b3a8a", 0.75); vinheta(0.5); break;
      case "vinheta": vinheta(0.75); break;
      case "grao": if (!GRAO) { GRAO = document.createElement("canvas"); GRAO.width = GRAO.height = 128; var gx = GRAO.getContext("2d"), im = gx.createImageData(128, 128), sd = 7; for (var i = 0; i < im.data.length; i += 4) { sd = (sd * 16807) % 2147483647; var v = 128 + ((sd % 120) - 60); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gx.putImageData(im, 0, 0); }
        o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.55; var pat = o.createPattern(GRAO, "repeat"), dx = Math.floor(t * 30) * 37 % 128; o.translate(-dx, -dx * 0.7); o.fillStyle = pat; o.fillRect(dx, dx * 0.7, W, H); o.setTransform(1, 0, 0, 1, 0, 0); vinheta(0.3); break;
      case "vhs": var q2 = copia(), qx = q2.getContext("2d"); qx.globalCompositeOperation = "multiply"; qx.fillStyle = "#ff2a2a"; qx.fillRect(0, 0, W, H);
        o.globalCompositeOperation = "screen"; o.globalAlpha = 0.5; o.drawImage(q2, W * 0.008, 0); o.globalAlpha = 0.18; o.globalCompositeOperation = "source-atop"; o.fillStyle = "#000"; for (var yy = Math.floor(t * 60) % 4; yy < H; yy += 4) o.fillRect(0, yy, W, 1); break;
      case "desfoque": var pq = tela2(null, Math.max(8, Math.round(W / 12)), Math.max(8, Math.round(H / 12))), px2 = pq.getContext("2d"); px2.imageSmoothingQuality = "high"; px2.drawImage(EF, 0, 0, pq.width, pq.height);
        o.globalCompositeOperation = "source-atop"; o.imageSmoothingQuality = "high"; o.drawImage(pq, 0, 0, W, H); break;
    }
    o.globalAlpha = 1; o.globalCompositeOperation = "destination-in"; o.drawImage(fonte, x, y, w, h); o.globalCompositeOperation = "source-over";   /* só onde há mídia */
    return EF;
  }
  // mod (transições): a = opacidade extra, dx/dy (fração da tela), k = escala, r = giro, recorte(ctx, W, H)
  function desenharMidia(fonte, fw, fh, c, t, mod) {
    if (!fw || !fh) return; mod = mod || {}; if (c.ck && !SEM_CK && window.BWChroma) { var semFundo = BWChroma.aplicar(fonte, fw, fh, c); if (semFundo) fonte = semFundo; }   /* chroma key: o fundo some antes de tudo */
    if (c.grade && !SEM_CK && window.BWCor && BWCor.ativo(c.grade)) { var comCor = BWCor.aplicar(fonte, fw, fh, c.grade); if (comCor) fonte = comCor; }   /* cor do take (BWCor), depois do recorte */
    if (c.ia && window.BWMascara && BWMascara.tem(c.mid) && (mod.soPessoa || (c.ia.fundo || ""))) { var mk = BWMascara.mascara(c.mid, c.tipo === "video" ? (c.corte || 0) + (t - c.ini) * vel(c) : 0);
      if (mk) fonte = BWMascara.compor(fonte, fw, fh, mk, c.ia, !!mod.soPessoa); }   /* pessoa e fundo (IA, no aparelho) */
    var W = cv.width, H = cv.height, s = (c.encaixe === "caber" ? Math.min : Math.max)(W / fw, H / fh) * (c.esc || 100) / 100, w = fw * s, h = fh * s;
    var a = (c.op == null ? 100 : c.op) / 100 * fade(c, t) * (mod.a == null ? 1 : mod.a); if (a <= 0.001) return;
    var x = (W - w) / 2 + (c.x || 0) / 100 * W, y = (H - h) / 2 + (c.y || 0) / 100 * H;
    cx.save(); if (mod.recorte) { cx.beginPath(); mod.recorte(cx, W, H); cx.clip(); }
    if (mod.dx || mod.dy || (mod.k && mod.k !== 1) || mod.r) { cx.translate(W / 2 + (mod.dx || 0) * W, H / 2 + (mod.dy || 0) * H); if (mod.r) cx.rotate(mod.r); if (mod.k) cx.scale(mod.k, mod.k); cx.translate(-W / 2, -H / 2); }
    var fonteFinal = fonte;
    if (mod.borrar) { var pq = tela2(null, Math.max(8, Math.round(W / (2 + mod.borrar))), Math.max(8, Math.round(H / (2 + mod.borrar)))), q = pq.getContext("2d"); q.drawImage(fonte, x * pq.width / W, y * pq.height / H, w * pq.width / W, h * pq.height / H); cx.globalAlpha = a; cx.drawImage(pq, 0, 0, W, H); cx.restore(); return; }
    cx.globalAlpha = a; cx.drawImage(fonteFinal, x, y, w, h);
    if (c.efeito && EFEITOS[c.efeito]) { var k = lim((c.efInt == null ? 85 : c.efInt) / 100, 0, 1); if (k > 0) { var e = comEfeito(fonte, x, y, w, h, c, t); cx.setTransform(1, 0, 0, 1, 0, 0); if (mod.recorte) { cx.restore(); cx.save(); cx.beginPath(); mod.recorte(cx, W, H); cx.clip(); } if (mod.dx || mod.dy || (mod.k && mod.k !== 1) || mod.r) { cx.translate(W / 2 + (mod.dx || 0) * W, H / 2 + (mod.dy || 0) * H); if (mod.r) cx.rotate(mod.r); if (mod.k) cx.scale(mod.k, mod.k); cx.translate(-W / 2, -H / 2); } cx.globalAlpha = a * k; cx.drawImage(e, 0, 0); } }
    cx.restore(); cx.globalAlpha = 1;
  }
  // como cada transição mexe no clipe que SAI (A) e no que ENTRA (B), p de 0 a 1
  var suave = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  function modsTrans(tipo, p) {
    var e = suave(p), W2 = 0;
    switch (tipo) {
      case "preto": case "branco": return {A: {a: p < 0.5 ? 1 : 0}, B: {a: p < 0.5 ? 0 : 1}, cor: tipo === "preto" ? "#000" : "#fff", corA: 1 - Math.abs(p - 0.5) * 2};
      case "empurrar": return {A: {dx: -e}, B: {dx: 1 - e}};
      case "deslizar": return {A: {}, B: {dy: 1 - e}};
      case "zoom": return {A: {k: 1 + 0.35 * e, a: 1 - e}, B: {k: 1.35 - 0.35 * e, a: e}};
      case "zoom-saida": return {A: {k: 1 - 0.3 * e, a: 1 - e}, B: {k: 1.25 - 0.25 * e, a: e}};
      case "girar": return {A: {r: e * 0.5, k: 1 - 0.3 * e, a: 1 - e}, B: {r: -(1 - e) * 0.6, k: 0.6 + 0.4 * e, a: e}};
      case "cortina": return {A: {}, B: {recorte: function (x, W, H) { x.rect(W * (1 - e), 0, W * e + 1, H); }}};
      case "circulo": return {A: {}, B: {recorte: function (x, W, H) { x.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e + 1, 0, Math.PI * 2); }}};
      case "desfoque": return {A: {borrar: Math.round(e * 10), a: 1}, B: {borrar: Math.round((1 - e) * 10), a: e}};
      default: return {A: {}, B: {a: e}};   /* dissolver */
    }
  }
  function anteriorDe(c) { return P.clips.filter(function (x) { return x !== c && x.trilha === c.trilha && x.tipo !== "texto" && x.tipo !== "audio" && Math.abs(x.ini + x.dur - c.ini) < 0.08; })[0] || null; }
  function transDe(c) { return c.trans && TRANS[c.trans.tipo] ? Math.min(+c.trans.dur || 0.6, c.dur * 0.9) : 0; }
  var ease = function (p) { p = lim(p, 0, 1); return 1 - Math.pow(1 - p, 3); };
  /* ANEL: o texto dá a volta na pessoa; a metade de trás (parte "tras") sai antes dela, a da frente depois */
  function textoAnel(c, t, parte) {
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), rx = W * (c.raio || 38) / 100, ry = rx * 0.26, cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H;
    cx.save(); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var base = String(c.txt || "TEXTO").replace(/\n/g, " ").trim() + "  •  ", wb = cx.measureText(base).width, circ = Math.PI * (rx + ry) * 1.1, rep = Math.max(1, Math.round(circ / Math.max(1, wb))), txt = new Array(rep + 1).join(base), n = txt.length;
    var giro = (t - c.ini) * (c.velAnel == null ? 0.7 : c.velAnel), a0 = (c.op == null ? 100 : c.op) / 100 * fade(c, t);
    cx.fillStyle = c.cor || "#fff";
    for (var i = 0; i < n; i++) { var th = Math.PI / 2 + giro - i * (Math.PI * 2 / n), sn = Math.sin(th); if (parte === "tras" ? sn > 0 : sn <= 0) continue;
      var x = cxm + rx * Math.cos(th), y = cym + ry * sn, k = 0.82 + 0.28 * (sn + 1) / 2, sx = Math.max(0.18, Math.abs(sn)) * (sn < 0 ? -1 : 1);
      cx.save(); cx.globalAlpha = a0 * (sn < 0 ? 0.7 : 1); cx.translate(x, y); cx.scale(sx * k, k); cx.fillText(txt[i], 0, 0); cx.restore(); }
    cx.restore();
  }
  function desenharTexto(c, t, parte) {
    if (c.anima === "anel") { textoAnel(c, t, parte || "tudo"); return; }
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), linhas = String(c.txt || "").split("\n"), lh = px * 1.18, rel = t - c.ini, dy = 0, dx = 0, esc2 = 1;
    if (c.anima === "maquina") { var nch = Math.floor(rel * 22), conta = 0; linhas = linhas.map(function (l) { var r = l.slice(0, Math.max(0, nch - conta)); conta += l.length; return r; }); }
    cx.save(); cx.globalAlpha = (c.op == null ? 100 : c.op) / 100 * fade(c, t); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H, larg = Math.max.apply(0, linhas.map(function (l) { return cx.measureText(l).width; }).concat([0]));
    if (c.anima === "subir") dy = (1 - ease(rel / 0.9)) * H * 0.32; else if (c.anima === "descer") dy = -(1 - ease(rel / 0.9)) * H * 0.32;
    else if (c.anima === "zoom") esc2 = 0.55 + 0.45 * ease(rel / 0.7) + 0.02 * rel; else if (c.anima === "pulsar") esc2 = 1 + 0.06 * Math.sin(rel * 6.5);
    else if (c.anima === "letreiro") { var lx = Math.max(larg, W * 0.5); dx = (W / 2 + lx / 2) - (W + lx) * lim(rel / Math.max(0.5, c.dur), 0, 1); dx = dx - (cxm - W / 2); }
    if (dx || dy || esc2 !== 1) { cx.translate(cxm + dx, cym + dy); cx.scale(esc2, esc2); cx.translate(-cxm, -cym); }
    if (larg > W * 0.92 && c.anima !== "letreiro") { px = px * W * 0.92 / larg; lh = px * 1.18; cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; larg = W * 0.92; }   /* texto longo encolhe para caber na tela */
    if (c.fundo) { cx.fillStyle = c.fundo; var pd = px * 0.35; cx.beginPath(); if (cx.roundRect) cx.roundRect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2, px * 0.25); else cx.rect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2); cx.fill(); }
    else { cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = px * 0.18; cx.shadowOffsetY = px * 0.05; }
    cx.fillStyle = c.cor || "#fff"; linhas.forEach(function (l, i) { cx.fillText(l, cxm, cym + (i - (linhas.length - 1) / 2) * lh); }); cx.restore();
  }
  function fonteDe(c, t, ativo) { if (c.tipo === "imagem") { var m = MID[c.mid]; return m && m.img ? {el: m.img, w: m.img.naturalWidth, h: m.img.naturalHeight} : null; }
    var o = sincronizar(c, t, ativo); return o && c.tipo === "video" && o.e.readyState >= 2 ? {el: o.e, w: o.e.videoWidth, h: o.e.videoHeight} : null; }
  function desenhar() {
    var t = T, W = cv.width, H = cv.height, frente = []; cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H);
    var ordemDes = trilhas().map(function (x) { return x[0]; }).filter(function (id) { return fam(id) !== "a"; }).sort(function (a, b) { var fa = fam(a), fb = fam(b); return fa !== fb ? (fa === "v" ? -1 : 1) : numTr(a) - numTr(b); });
    ordemDes.concat(trilhas().map(function (x) { return x[0]; }).filter(function (id) { return fam(id) === "a"; })).forEach(function (tr) { var pintados = {};
      P.clips.forEach(function (c) { if (c.trilha !== tr) return; var ativo = t >= c.ini && t < c.ini + c.dur;
        if (c.tipo === "texto") { if (ativo) { if (c.anima === "anel") { desenharTexto(c, t, "tras"); frente.push(c); } else if (c.frente) frente.push(c); else desenharTexto(c, t); } return; }
        if (c.tipo === "audio") { sincronizar(c, t, ativo); return; }
        if (!ativo) { if (c.tipo === "video" && !pintados[c.id]) sincronizar(c, t, false); return; }
        var td = transDe(c), ant = td ? anteriorDe(c) : null, p = td ? (t - c.ini) / td : 1;
        if (ant && p < 1) {   /* transição: o clipe que sai fica no último quadro e o novo entra por cima */
          var mt = modsTrans(c.trans.tipo, lim(p, 0, 1)), fa = fonteDe(ant, ant.ini + ant.dur - 0.04, false); pintados[ant.id] = 1;
          if (ant.tipo === "video") { var oa = elDe(ant), alvoA = (ant.corte || 0) + (ant.dur - 0.04) * vel(ant); if (oa && !TOCANDO && Math.abs(oa.e.currentTime - alvoA) > 0.08) { try { oa.e.currentTime = alvoA; } catch (x) {} } }
          if (fa) desenharMidia(fa.el, fa.w, fa.h, ant, ant.ini + ant.dur - 0.04, mt.A);
          var fb = fonteDe(c, t, true); if (fb) desenharMidia(fb.el, fb.w, fb.h, c, t, mt.B);
          if (mt.cor && mt.corA > 0) { cx.globalAlpha = lim(mt.corA, 0, 1); cx.fillStyle = mt.cor; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
          return; }
        var f = fonteDe(c, t, true); if (f) desenharMidia(f.el, f.w, f.h, c, t); }); });
    /* PESSOA NA FRENTE: o take com a pessoa é desenhado de novo, só a pessoa, por cima de tudo o que ficou "atrás dela" */
    if (window.BWMascara) P.clips.forEach(function (c) { if (fam(c.trilha) !== "v" || !c.ia || !c.ia.frente || !(t >= c.ini && t < c.ini + c.dur) || !BWMascara.tem(c.mid)) return;
      var f = fonteDe(c, t, true); if (f) desenharMidia(f.el, f.w, f.h, c, t, {soPessoa: true}); });
    frente.forEach(function (c) { desenharTexto(c, t, c.anima === "anel" ? "frente" : ""); });
    $("veTempo").textContent = fmtT(T) + " / " + fmtT(total()); var ag = $("veAgulha"); if (ag) ag.style.left = (T * PPS) + "px";
  }
  var t0 = 0, p0 = 0, raf = 0;
  function passo() { if (!TOCANDO) return; T = t0 + (performance.now() - p0) / 1000; var fim = total(); if (T >= fim) { T = fim; desenhar(); parar(); if (GRAV) GRAV.fim(); return; } desenhar(); if (GRAV) GRAV.prog(T / fim); var ag = $("veAgulha"), ro = $("veRolo"); if (ag && !GRAV && (T * PPS > ro.scrollLeft + ro.clientWidth - 40)) ro.scrollLeft = T * PPS - 60; raf = requestAnimationFrame(passo); }
  function tocar() { if (TOCANDO) return; if (!P.clips.length) { aviso("Coloque um vídeo, imagem ou som na linha do tempo para tocar.", true); return; } var a = audioCtx(); if (a && a.state === "suspended") a.resume(); if (T >= total() - 0.05) T = 0; TOCANDO = true; t0 = T; p0 = performance.now(); $("vePlay").textContent = "⏸ PAUSAR"; raf = requestAnimationFrame(passo); }
  function parar() { TOCANDO = false; cancelAnimationFrame(raf); $("vePlay").textContent = "▶ TOCAR"; Object.keys(EL).forEach(function (k) { try { EL[k].e.pause(); } catch (e) {} }); desenhar(); }
  function irPara(t) { var era = TOCANDO; if (era) parar(); T = lim(t, 0, Math.max(total(), 0)); desenhar(); }

  /* ---------- telas ---------- */
  function desenharLib() {
    var abas = [["tudo", "TUDO"], ["video", "VÍDEO"], ["imagem", "IMAGEM"], ["audio", "SOM"], ["trans", "◧ TRANSIÇÕES"], ["efe", "✦ EFEITOS"]];
    $("veAbas").innerHTML = abas.map(function (a) { return '<button type="button" data-aba="' + a[0] + '" class="' + (ABA === a[0] ? "on" : "") + '" aria-pressed="' + (ABA === a[0]) + '">' + a[1] + '</button>'; }).join("");
    if (ABA === "trans" || ABA === "efe") { var L = ABA === "trans" ? TRANS : EFEITOS, pre = ABA === "trans" ? "t:" : "e:";
      $("veLib").innerHTML = '<p class="ve-nota" style="grid-column:1/-1;margin:0 0 4px">Arraste até um take' + (ABA === "trans" ? " (ou até a emenda ◆ entre dois)" : "") + ' — ou toque para pôr no take escolhido.</p>' +
        Object.keys(L).map(function (k) { return '<div class="ve-item ve-fx ' + (ABA === "trans" ? "tr-" : "ef-") + esc(k) + '" role="button" tabindex="0" data-arr="' + pre + esc(k) + '" aria-label="' + (ABA === "trans" ? "Transição " : "Efeito ") + esc(L[k]) + ' — arraste até um take"><span class="mini" aria-hidden="true"><i></i></span><span>' + esc(L[k]) + '</span></div>'; }).join(""); return; }
    var l = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return !m.ph && (ABA === "tudo" || m.tipo === ABA); });   /* espaços de modelo não aparecem na biblioteca */
    $("veLib").innerHTML = l.length ? l.map(function (m) { var mini = m.tipo === "imagem" ? '<img alt="" src="' + m.url + '">' : m.capa ? '<img alt="" src="' + m.capa + '">' : '<span class="mini" aria-hidden="true">' + (m.tipo === "audio" ? "🎵" : "🎬") + '</span>';
      var f = m.cr && window.BWCriacoes ? BWCriacoes.FERR[m.cr.ferramenta] : null;
      return '<div class="ve-item' + (m.ruim ? " ruim" : "") + '" role="button" tabindex="0" data-mid="' + esc(m.id) + '" aria-label="Pôr ' + esc(m.nome) + ' na linha do tempo"' + (m.ruim ? ' title="Este arquivo não abre neste navegador"' : "") + (f ? ' style="--cf:' + f.cor + '"' : "") + '>' + mini + (m.ruim ? '<b class="selo ruim">⚠ NÃO ABRE AQUI</b>' : "") + (f ? '<b class="selo">' + f.icone + " " + esc(f.curto) + "</b>" : "") + '<span>' + esc(m.nome) + '</span>' + (f ? '<button type="button" class="ed" data-editar="' + esc(m.id) + '" title="Abrir no ' + esc(f.nome) + ' e trocar aqui" aria-label="Editar no ' + esc(f.nome) + '">✎</button>' : "") + '<button type="button" class="x" data-del="' + esc(m.id) + '" aria-label="Tirar ' + esc(m.nome) + ' da biblioteca">✕</button></div>'; }).join("")
      : '<p class="ve-nota" style="grid-column:1/-1;margin:0">Nada aqui ainda. Toque em ＋ IMPORTAR ou em ✨ MINHAS CRIAÇÕES.</p>';
  }
  function desenharTL() {
    var fim = Math.max(total() + 8, 20), larg = Math.ceil(fim * PPS), passoR = PPS >= 90 ? 1 : PPS >= 40 ? 2 : 5, h = '<div class="ve-regua" id="veRegua" style="width:' + larg + 'px">';
    for (var s = 0; s <= fim; s += passoR) h += '<i style="left:' + (s * PPS) + 'px">' + (s >= 60 ? Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + s % 60 : s + "s") + '</i>';
    h += "</div>";
    var TRILHAS = trilhas(); TRILHAS.forEach(function (tr) { var at = altTr(tr[0]); h += '<div class="ve-faixa' + (vaziaTr(tr[0]) ? " vazia" : "") + (at < 34 ? " baixa" : "") + '" data-trilha="' + tr[0] + '" style="width:' + larg + 'px;height:' + at + 'px">' + P.clips.filter(function (c) { return c.trilha === tr[0]; }).map(function (c) { var m = MID[c.mid], nome = c.tipo === "texto" ? String(c.txt || "Texto").split("\n")[0] : m ? m.nome : "arquivo que falta", mini = m && (m.tipo === "imagem" ? m.url : m.capa);
        return '<div class="ve-clip' + (c.id === SEL ? " on" : "") + '" data-clip="' + c.id + '" style="--c:' + tr[2] + (c.off ? ";opacity:.35;filter:grayscale(1)" : "") + (mini && c.tipo !== "audio" ? ";--mini:url(" + mini + ")" : "") + ';left:' + (c.ini * PPS) + 'px;width:' + Math.max(18, c.dur * PPS) + 'px" title="' + esc(nome) + '"><i class="al e" data-al="e"></i>' + (mini ? '<img alt="" src="' + mini + '">' : "") + '<span>' + (c.tipo === "texto" ? "T · " : c.tipo === "audio" ? "♪ " : "") + esc(nome) + '</span>' + (vel(c) !== 1 ? '<b class="bd">' + String(vel(c)).replace(".", ",") + '×</b>' : "") + (c.efeito && EFEITOS[c.efeito] ? '<b class="bd" title="Efeito: ' + esc(EFEITOS[c.efeito]) + '">✦ ' + esc(EFEITOS[c.efeito]) + '</b>' : "") + (c.grade && window.BWCor && BWCor.ativo(c.grade) ? '<b class="bd" title="Cor ajustada">🎨</b>' : "") + (c.ia && window.BWMascara && BWMascara.tem(c.mid) ? '<b class="bd" title="Pessoa analisada (IA)">🧠</b>' : "") + (c.anima ? '<b class="bd" title="Texto com movimento">✦</b>' : "") + ondaHtml(c, m) + '<i class="al d" data-al="d"></i>' + (transDe(c) && anteriorDe(c) ? '<i class="tr" title="Transição: ' + esc(TRANS[c.trans.tipo]) + " · " + String(Math.round(transDe(c) * 10) / 10).replace(".", ",") + ' s" style="width:' + Math.max(10, transDe(c) * PPS) + 'px"><i class="trp" data-trp="' + c.id + '" title="Arraste para mudar o tempo da transição"></i></i>' : "") + '</div>'; }).join("") + juntas(tr[0]) + "</div>"; });
    h += '<div class="ve-agulha" id="veAgulha" style="left:' + (T * PPS) + 'px"></div><i class="ve-lamina" id="veLamina" hidden></i>';
    $("veFaixas").innerHTML = h; $("veFaixas").style.width = larg + "px";
    $("veRot").innerHTML = "<div>TEMPO</div>" + TRILHAS.map(function (tr) { return '<div' + (vaziaTr(tr[0]) ? ' class="vazia"' : "") + ' data-rot="' + tr[0] + '" style="--c:' + tr[2] + ';height:' + altTr(tr[0]) + 'px" title="Alt + rodinha do mouse em cima da camada: mais alta ou mais baixa">' + tr[1] + "</div>"; }).join("");
  }
  /* EMENDAS: ◆ entre dois takes encostados na mesma camada. Com transição = ◆ cheio com o nome (arrastar muda o tempo, tocar troca);
     sem transição = ◇ discreto (tocar escolhe uma; soltar uma transição aqui aplica). */
  function juntas(tr) { if (fam(tr) !== "v") return ""; return P.clips.filter(function (c) { return c.trilha === tr && anteriorDe(c); }).map(function (c) { var td = transDe(c);
    return '<i class="ve-junta' + (td ? " com" : "") + '" data-junta="' + c.id + '" style="left:' + (c.ini * PPS) + 'px" role="button" tabindex="0" aria-label="' + (td ? "Transição " + esc(TRANS[c.trans.tipo]) + " — arraste para mudar o tempo" : "Emenda sem transição — toque para escolher uma") + '" title="' + (td ? esc(TRANS[c.trans.tipo]) + " · " + String(Math.round(td * 10) / 10).replace(".", ",") + " s — arraste para os lados para mudar o tempo; toque para trocar" : "Emenda — toque para escolher uma transição ou solte uma aqui") + '">' + (td ? "<b>" + esc(TRANS[c.trans.tipo]) + "</b>" : "") + '</i>'; }).join(""); }
  function aplicarFx(c, kind, k, semAviso) { if (!c) { aviso("Escolha um take na linha do tempo (ou arraste até ele).", true); return false; }
    if (kind === "t") { if (c.tipo === "texto" || c.tipo === "audio") { aviso("Transição é para vídeo e imagem.", true); return false; } c.trans = {tipo: k, dur: (c.trans && c.trans.dur) || 0.6}; }
    else { if (c.tipo !== "video" && c.tipo !== "imagem") { aviso("Efeito é para vídeo e imagem.", true); return false; } c.efeito = k; if (c.efInt == null) c.efInt = 85; }
    SEL = c.id; tudo(); marcar(c.id); if (!semAviso) aviso(kind === "t" ? "◧ Transição “" + TRANS[k] + "”" + (anteriorDe(c) ? " na emenda — arraste o ◆ para mudar o tempo." : " — encoste este take no fim de outro para ela aparecer.") : "✦ Efeito “" + EFEITOS[k] + "” no take."); return true; }
  function marcar(id) { var el = $("veFaixas").querySelector('[data-clip="' + id + '"]'); if (!el) return; el.classList.remove("marcado"); void el.offsetWidth; el.classList.add("marcado"); setTimeout(function () { el.classList.remove("marcado"); }, 1300); }
  function menuTrans(c, x, y) { if (!window.BWFerr) return; BWFerr.menu(x, y, [{rot: "Corte seco (sem transição)", icone: "▮", fn: function () { c.trans = null; tudo(); }}].concat(Object.keys(TRANS).map(function (k) { return {rot: TRANS[k] + (c.trans && c.trans.tipo === k ? "  ✓" : ""), icone: "◧", fn: function () { aplicarFx(c, "t", k); }}; }),
      c.trans ? ["-", {tit: "TEMPO"}].concat([0.3, 0.6, 1, 1.5, 2].map(function (d) { return {rot: String(d).replace(".", ",") + " s" + (Math.abs((c.trans.dur || 0.6) - d) < 0.01 ? "  ✓" : ""), fn: function () { c.trans.dur = d; tudo(); marcar(c.id); }}; })) : []), "TRANSIÇÃO NA EMENDA"); }
  function ondaHtml(c, m) { if (!m || (c.tipo !== "audio" && c.tipo !== "video")) return "";
    var o = ONDA[m.id]; if (!o) { analisar(m).then(function (r) { if (r && r.img) desenharTL(); }); return ""; }
    if (!o._r) { o.then(function (r) { o._r = r || {}; }); return ""; } var r = o._r; if (!r.img) return "";
    var larg = r.dur / vel(c) * PPS, desl = (c.corte || 0) / vel(c) * PPS, gv = lim(ganhoTake(c), 0, 4);
    return '<i class="onda' + (c.tipo === "video" ? " v" : "") + '" style="background-image:url(' + r.img + ');background-size:' + larg.toFixed(1) + 'px 100%;background-position:' + (-desl).toFixed(1) + 'px 0;transform:scaleY(' + Math.max(0.15, Math.min(1.6, gv)).toFixed(2) + ')"></i>'; }
  function vaziaTr(id) { return id !== "v1" && !P.clips.some(function (c) { return c.trilha === id; }); }
  function faixaR(k, rot, min, max, v, suf, passo) { return '<label><span>' + rot + '</span><input type="range" data-p="' + k + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + v + '"><output>' + v + (suf || "") + '</output></label>'; }
  var ANIMAS = [["", "Parado"], ["subir", "Sobe (por trás dos ombros)"], ["descer", "Desce"], ["zoom", "Zoom de entrada"], ["pulsar", "Pulsar"], ["letreiro", "Letreiro passando"], ["maquina", "Máquina de escrever"], ["anel", "Anel girando em volta"]];
  var ULT_SEL = null;
  function desenharProp() {
    var c = sel(), b = $("vePropCorpo"); if (!c) { var nC = P.clips.length, f0 = FMT[P.fmt] || [P.w || cv.width, P.h || cv.height];
      b.innerHTML = '<div class="ve-g"><h4>O PROJETO</h4><p class="ve-nota" style="margin:0 0 4px">Tamanho: <b>' + cv.width + " × " + cv.height + ' px</b><br>Duração: <b>' + fmtT(total()) + '</b><br>Clipes: <b>' + nC + '</b></p></div><p class="ve-nota" style="margin:0">Toque num clipe da linha do tempo: este painel mostra os ajustes daquele tipo de clipe (vídeo e foto, som ou texto).</p>'; return; }
    if (c.id !== ULT_SEL) { ULT_SEL = c.id; if (window.__veVista) window.__veVista.aoSelecionar(); }
    var visual = c.tipo !== "audio", g = function (k, t, corpo, fechada) { return corpo ? '<div class="ve-g" data-g="' + k + '"><h4 data-seta="ve-' + k + '"' + (fechada ? ' data-seta-padrao="fechada"' : "") + '>' + t + '</h4><div>' + corpo + '</div></div>' : ""; }, h = "";
    if (c.tipo === "texto") h += g("texto", "TEXTO", '<label class="um"><span>Texto</span><textarea data-p="txt" rows="3" maxlength="200" aria-label="Texto do clipe">' + esc(c.txt) + '</textarea></label><label class="um"><span>Fonte</span><select data-p="fonte" aria-label="Fonte">' + FONTES.map(function (f) { return '<option' + (f === c.fonte ? " selected" : "") + '>' + f + '</option>'; }).join("") + '</select></label>' + faixaR("tam", "Tamanho", 2, 20, c.tam, "%", 0.5) +
      '<label class="um"><span>Cor</span><input type="color" data-p="cor" value="' + esc(c.cor || "#ffffff") + '" aria-label="Cor do texto"></label><label class="um"><span>Fundo</span><select data-p="fundo" aria-label="Fundo do texto"><option value=""' + (!c.fundo ? " selected" : "") + '>Sem fundo (sombra)</option><option value="#000000"' + (c.fundo === "#000000" ? " selected" : "") + '>Caixa preta</option><option value="#ffffff"' + (c.fundo === "#ffffff" ? " selected" : "") + '>Caixa branca</option><option value="#7C5CFF"' + (c.fundo === "#7C5CFF" ? " selected" : "") + '>Caixa roxa</option><option value="#FFB547"' + (c.fundo === "#FFB547" ? " selected" : "") + '>Caixa âmbar</option></select></label>' +
      '<label class="um"><span>Movimento</span><select data-p="anima" aria-label="Movimento do texto">' + ANIMAS.map(function (a) { return '<option value="' + a[0] + '"' + ((c.anima || "") === a[0] ? " selected" : "") + '>' + a[1] + '</option>'; }).join("") + '</select></label>' +
      (c.anima === "anel" ? faixaR("raio", "Tamanho do anel", 15, 60, c.raio || 38, "%") + faixaR("velAnel", "Velocidade do giro", -2, 2, c.velAnel == null ? 0.7 : c.velAnel, "", 0.1) : "") +
      '<p class="ve-sub">EM RELAÇÃO À PESSOA</p><div class="ve-chips"><button type="button" data-frente="0"' + (!c.frente ? ' class="on"' : "") + '>Atrás da pessoa</button><button type="button" data-frente="1"' + (c.frente ? ' class="on"' : "") + '>Na frente</button></div>' +
      '<p class="ve-nota" style="margin:4px 0 0">"Atrás da pessoa" funciona quando o take tem PESSOA E FUNDO (IA) analisado com "pessoa na frente" ligado.</p>');
    if (visual) h += g("pos", "TAMANHO E POSIÇÃO", (c.tipo !== "texto" ? '<label class="um"><span>Encaixe</span><select data-p="encaixe" aria-label="Encaixe na tela"><option value="cobrir"' + (c.encaixe !== "caber" ? " selected" : "") + '>Encher a tela</option><option value="caber"' + (c.encaixe === "caber" ? " selected" : "") + '>Mostrar inteiro</option></select></label>' + faixaR("esc", "Tamanho", 10, 300, c.esc, "%") : "") +
      faixaR("x", "Posição ↔", -60, 60, c.x || 0, "%") + faixaR("y", "Posição ↕", -60, 60, c.y || 0, "%") + faixaR("op", "Opacidade", 0, 100, c.op == null ? 100 : c.op, "%"));
    if (c.tipo === "video" || c.tipo === "audio") h += g("som", "SOM", '<label><span>Volume</span><input type="range" data-p="volDb" min="-40" max="12" step="0.5" value="' + dbDe(c) + '" aria-label="Volume em dB"><output>' + (dbDe(c) <= -40 ? "mudo" : String(dbDe(c)).replace(".", ",") + " dB") + '</output></label>' +
      '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="mudo">' + (c.vol === 0 ? "🔈 DEVOLVER O SOM" : "🔇 MUDO") + '</button><button class="ve-bt' + (c.normG ? " on" : "") + '" type="button" data-acao="normalizar" title="Deixa o volume deste take no padrão, sem estourar">🔊 NORMALIZAR' + (c.normG ? " ✓" : "") + '</button>' + (c.normG ? '<button class="ve-bt" type="button" data-acao="desnormalizar">✕</button>' : "") + (c.tipo === "video" ? '<button class="ve-bt" type="button" data-acao="extrair">🎵 EXTRAIR ÁUDIO</button>' : "") + '</div>' +
      '<p class="ve-sub">REDUZIR RUÍDO (zumbido e chiado)</p><div class="ve-chips">' + ["Desligado", "Leve", "Médio", "Forte"].map(function (n, i) { return '<button type="button" data-ruido="' + i + '"' + ((c.ruido || 0) === i ? ' class="on"' : "") + '>' + n + '</button>'; }).join("") + '</div>' +
      '<p class="ve-sub">REALÇAR VOZ (mais presença e volume por igual)</p><div class="ve-chips"><button type="button" data-voz="0"' + (!c.voz ? ' class="on"' : "") + '>Desligado</button><button type="button" data-voz="1"' + (c.voz ? ' class="on"' : "") + '>Ligado</button></div>' +
      '<p class="ve-nota" style="margin:6px 0 0">Entrada e saída suave do som ficam em TEMPO E CAMADA. Tudo é feito neste aparelho; o que você ouve é o que sai no vídeo.</p>');
    if (c.tipo === "video" || c.tipo === "audio") h += g("vel", "VELOCIDADE", '<div class="ve-chips">' + VELS.map(function (v) { return '<button type="button" data-vel="' + v + '"' + (vel(c) === v ? ' class="on"' : "") + '>' + String(v).replace(".", ",") + '×</button>'; }).join("") + '</div>' + (c.tipo === "video" ? '<div class="ve-linha"><button class="ve-bt" type="button" data-acao="congelar">❄ CONGELAR QUADRO</button></div>' : ""), true);
    if (visual && c.tipo !== "texto") { var tt = c.trans && c.trans.tipo || "";
      h += g("trans", "TRANSIÇÃO DE ENTRADA", (anteriorDe(c) ? "" : '<p class="ve-nota" style="margin:0 0 6px">Encoste este clipe no fim de outro (mesma camada) para a transição aparecer.</p>') + '<div class="ve-chips">' + '<button type="button" data-trans=""' + (!tt ? ' class="on"' : "") + '>Corte seco</button>' + Object.keys(TRANS).map(function (k) { return '<button type="button" data-trans="' + k + '"' + (tt === k ? ' class="on"' : "") + '>' + TRANS[k] + '</button>'; }).join("") + '</div>' + (tt ? faixaR("transDur", "Duração", 0.2, 2, (c.trans.dur || 0.6), " s", 0.1) : ""), true);
      h += g("efeito", "EFEITO", '<div class="ve-chips"><button type="button" data-efeito=""' + (!c.efeito ? ' class="on"' : "") + '>Nenhum</button>' + Object.keys(EFEITOS).map(function (k) { return '<button type="button" data-efeito="' + k + '"' + (c.efeito === k ? ' class="on"' : "") + '>' + EFEITOS[k] + '</button>'; }).join("") + '</div>' + (c.efeito ? faixaR("efInt", "Intensidade", 0, 100, c.efInt == null ? 85 : c.efInt, "%") : ""), true); }
    if (visual && c.tipo !== "texto" && window.BWCor) { var gd = c.grade || {}, grupoAnt = "", pre = predefCor();
      h += g("cor", "COR (AJUSTE)", '<p class="ve-sub">PONTO DE PARTIDA</p><div class="ve-chips"><button type="button" data-look=""' + (!BWCor.ativo(gd) ? ' class="on"' : "") + '>Original</button>' + Object.keys(BWCor.LOOKS).map(function (k) { return '<button type="button" data-look="' + k + '"' + (c.look === k && BWCor.ativo(gd) ? ' class="on"' : "") + '>' + BWCor.LOOKS[k].nome + '</button>'; }).join("") +
        pre.map(function (p, i) { return '<button type="button" class="pre' + (c.look === "p" + i && BWCor.ativo(gd) ? " on" : "") + '" data-predef="' + i + '" title="Predefinição sua">★ ' + esc(p.nome) + '<i data-predel="' + i + '" title="Apagar esta predefinição" aria-label="Apagar a predefinição ' + esc(p.nome) + '">✕</i></button>'; }).join("") + '</div>' +
        BWCor.CAMPOS.map(function (f) { var t = (f[0] !== grupoAnt ? '<p class="ve-sub">' + f[0] + '</p>' : ""); grupoAnt = f[0]; return t + faixaR("g:" + f[1], f[2], -100, 100, Math.round(+gd[f[1]] || 0), ""); }).join("") +
        '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="corZerar">↺ ZERAR</button><button class="ve-bt" type="button" data-acao="corTodos" title="Põe esta mesma cor em todos os takes de vídeo e foto">⇉ APLICAR EM TODOS</button><button class="ve-bt" type="button" data-acao="corSalvar">★ SALVAR PREDEFINIÇÃO</button></div>' +
        '<p class="ve-nota" style="margin:6px 0 0">Dois toques numa barra volta ela a zero. Tudo é feito neste aparelho' + (BWCor.motor() === "2d" ? " (modo econômico: este navegador não tem WebGL, a prévia pode ficar mais lenta)" : "") + '.</p>', true); }
    if (visual && c.tipo !== "texto" && window.BWMascara) { var ia = c.ia || {}, tem = BWMascara.tem(c.mid), fundos = [["", "Original"], ["desfoque", "Desfocado"], ["pb", "Cor só na pessoa"], ["escuro", "Escurecido"], ["claro", "Clareado"], ["cor", "Cor lisa"], ["sem", "Sem fundo"]];
      h += g("ia", "PESSOA E FUNDO (IA)", (ANALISANDO[c.mid] != null ? '<p class="ve-nota" style="margin:0 0 6px">🧠 Analisando a pessoa… <b id="veIaProg">' + Math.round(ANALISANDO[c.mid] * 100) + '%</b></p><div class="ve-linha"><button class="ve-bt" type="button" data-acao="iaCancelar">CANCELAR</button></div>'
        : !tem ? '<p class="ve-nota" style="margin:0 0 6px">O app acha a pessoa em cada quadro deste take (no próprio aparelho). Depois dá para pôr texto e logo ATRÁS dela, desfocar ou trocar o fundo e acender um contorno de luz.</p><div class="ve-linha"><button class="ve-bt pri" type="button" data-acao="iaAnalisar">🧠 ANALISAR PESSOA NO TAKE</button></div><p class="ve-nota" style="margin:6px 0 0">Na primeira vez baixa o modelo (~16 MB). Leva mais ou menos o tempo do take no computador; no celular, um pouco mais.</p>'
        : '<div class="ve-chips"><button type="button" data-iafrente="1"' + (ia.frente ? ' class="on"' : "") + '>Pessoa na frente dos textos</button><button type="button" data-iafrente="0"' + (!ia.frente ? ' class="on"' : "") + '>Normal</button></div>' +
          '<p class="ve-sub">FUNDO</p><div class="ve-chips">' + fundos.map(function (f) { return '<button type="button" data-iafundo="' + f[0] + '"' + ((ia.fundo || "") === f[0] ? ' class="on"' : "") + '>' + f[1] + '</button>'; }).join("") + '</div>' +
          (ia.fundo === "cor" ? '<label class="um"><span>Cor do fundo</span><input type="color" data-p="ia:fundoCor" value="' + esc(ia.fundoCor || "#111318") + '" aria-label="Cor do fundo"></label>' : "") +
          '<p class="ve-sub">CONTORNO DE LUZ NA PESSOA</p><div class="ve-chips"><button type="button" data-iacont="0"' + (!ia.contorno ? ' class="on"' : "") + '>Sem</button><button type="button" data-iacont="1"' + (ia.contorno ? ' class="on"' : "") + '>Ligado</button></div>' +
          (ia.contorno ? '<label class="um"><span>Cor do contorno</span><input type="color" data-p="ia:contornoCor" value="' + esc(ia.contornoCor || "#7C5CFF") + '" aria-label="Cor do contorno"></label>' : "") +
          faixaR("ia:suave", "Borda suave", 0, 100, ia.suave == null ? 30 : ia.suave, "%") +
          '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="iaModelos">✨ MODELOS COM A PESSOA</button><button class="ve-bt" type="button" data-acao="iaAnalisar">↺ ANALISAR DE NOVO</button></div>' +
          '<p class="ve-nota" style="margin:6px 0 0">' + (function () { var i2 = BWMascara.info(c.mid); return i2 ? (i2.fps ? i2.quadros + " quadros analisados (" + i2.fps + " por segundo)" : "foto analisada") : ""; })() + '. Cabelo solto e mão na frente do rosto podem deixar a borda imperfeita.</p>'), !tem); }
    if (visual && c.tipo !== "texto") h += g("chroma", "CHROMA KEY (TIRAR FUNDO VERDE)", '<div class="ve-chips"><button type="button" data-ck="0"' + (!c.ck ? ' class="on"' : "") + '>Desligado</button><button type="button" data-ck="1"' + (c.ck ? ' class="on"' : "") + '>Ligado</button></div>' +
      (c.ck ? '<div class="ve-chips"><button type="button" data-ckmodo="auto"' + (c.ckModo !== "manual" ? ' class="on"' : "") + '>⚡ Automático</button><button type="button" data-ckmodo="manual"' + (c.ckModo === "manual" ? ' class="on"' : "") + '>🎚 Manual</button></div>' +
        '<label class="um"><span>Cor do fundo</span><input type="color" data-p="ckCor" value="' + esc(c.ckCor || "#00d000") + '" aria-label="Cor do fundo a tirar"></label><div class="ve-linha"><button class="ve-bt" type="button" data-acao="ckPegar">🎯 ESCOLHER NA TELA</button><button class="ve-bt" type="button" data-acao="ckAuto">✦ ACHAR SOZINHO</button></div>' +
        (c.ckModo !== "manual" ? '<p class="ve-nota" style="margin:6px 0 4px">NÍVEL — cada nível tira mais fundo, suaviza mais a borda e guarda mais sombra. Suba um de cada vez até o fundo sumir.</p><div class="ve-chips">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-cknivel="' + n + '"' + ((c.ckNivel || 3) === n ? ' class="on"' : "") + ' aria-label="Nível ' + n + '">' + n + (n === 1 ? " leve" : n === 5 ? " forte" : "") + '</button>'; }).join("") + '</div><p class="ve-nota" style="margin:0 0 4px">Não chegou no ponto? Toque em 🎚 Manual: os controles já abrem nos valores deste nível.</p>'
          : faixaR("ckInt", "Intensidade", 0, 100, c.ckInt == null ? 35 : c.ckInt, "%") + faixaR("ckSuave", "Suavizar borda", 0, 100, c.ckSuave == null ? 20 : c.ckSuave, "%") + faixaR("ckLimpa", "Limpar borda", 0, 100, c.ckLimpa == null ? 60 : c.ckLimpa, "%") + faixaR("ckSombra", "Sombra", 0, 100, c.ckSombra || 0, "%")) +
        '<p class="ve-nota" style="margin:6px 0 0">Ponha este clipe na camada SOBREPOSIÇÃO e o fundo novo na camada VÍDEO, no mesmo trecho. Tudo é feito neste aparelho.</p>' : '<p class="ve-nota" style="margin:0">Para vídeo ou foto gravados com fundo verde ou azul liso.</p>'), true);
    h += g("tempo", "TEMPO E CAMADA", faixaR("fin", "Entra suave", 0, 3, c.fin || 0, " s", 0.1) + faixaR("fout", "Sai suave", 0, 3, c.fout || 0, " s", 0.1) + faixaR("dur", "Duração", 0.2, Math.min(120, Math.round(maxDur(c) * 10) / 10), Math.round(c.dur * 10) / 10, " s", 0.1) +
      (visual ? '<label class="um"><span>Camada</span><select data-p="trilha" aria-label="Camada do clipe">' + trilhas().filter(function (x) { return fam(x[0]) === famDoClip(c); }).map(function (x) { return '<option value="' + x[0] + '"' + (c.trilha === x[0] ? " selected" : "") + '>' + x[1].charAt(0) + x[1].slice(1).toLowerCase() + (x[0] === "v1" ? " (embaixo)" : "") + '</option>'; }).join("") + '<option value="+">＋ Camada nova (em cima)</option>' + '</select></label>' : ""), c.tipo === "texto");
    b.innerHTML = h;
  }
  function tudo(semHist) { desenharTL(); desenharProp(); desenhar(); guardar(); if (!semHist) marcarHist(); }
  function verTransicao(c) { if (!transDe(c) || !anteriorDe(c)) return; parar(); irPara(Math.max(0, c.ini - 0.4)); tocar(); var fim = c.ini + transDe(c) + 0.5, olha = function () { if (!TOCANDO) return; if (T >= fim) parar(); else setTimeout(olha, 60); }; olha(); }
  function formato() { var f = P.fmt === "livre" && P.w && P.h ? [P.w, P.h] : FMT[P.fmt] || FMT["9:16"]; cv.width = f[0]; cv.height = f[1]; $("veFmt").value = P.fmt; var l = $("veLivre"); if (l) { l.hidden = P.fmt !== "livre"; $("veLargura").value = f[0]; $("veAltura").value = f[1]; } desenhar(); }

  /* ---------- exportar (gravado pelo navegador, no tempo do vídeo) ---------- */
  function tipoGravacao() { var ts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]; for (var i = 0; i < ts.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(ts[i])) return ts[i]; return ""; }
  function exportar() {
    if (!P.clips.length) { aviso("A linha do tempo está vazia.", true); return; }
    var tipo = tipoGravacao(); if (!tipo || !cv.captureStream) { aviso("Este navegador não grava vídeo por aqui. Use o Chrome, o Edge ou o Safari atualizados.", true); return; }
    parar(); var a = audioCtx(); if (a && a.state === "suspended") a.resume();
    var fluxo = cv.captureStream(30); if (DEST) DEST.stream.getAudioTracks().forEach(function (t) { fluxo.addTrack(t); });
    var partes = [], mr; try { mr = new MediaRecorder(fluxo, {mimeType: tipo, videoBitsPerSecond: Math.round(lim(6e6 * cv.width * cv.height / (720 * 1280), 4e6, 40e6))}); } catch (e) { aviso("Não consegui começar a gravação neste navegador.", true); return; }
    var cancelado = false; mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    mr.onstop = function () { GRAV = null; $("veOcup").hidden = true; fluxo.getVideoTracks().forEach(function (t) { t.stop(); }); if (cancelado) { aviso("Exportação cancelada."); return; }
      var mp4 = /mp4/.test(tipo), blob = new Blob(partes, {type: mp4 ? "video/mp4" : "video/webm"}), url = URL.createObjectURL(blob), nome = "video-brightway." + (mp4 ? "mp4" : "webm");
      window.__veSaida = {blob: blob, tipo: blob.type, bytes: blob.size, nome: nome};
      $("veVideoPronto").src = url; $("veBaixar").href = url; $("veBaixar").download = nome; $("veSaidaTxt").textContent = "Vídeo pronto · " + (blob.size / 1048576).toFixed(1).replace(".", ",") + " MB" + (mp4 ? "" : " · formato WebM (este navegador não grava MP4; o Chrome e o Safari novos gravam)"); $("veSaida").hidden = false; $("veSaida")._blob = blob; $("veSaida")._nome = nome; };
    GRAV = {prog: function (p) { $("veProg").value = p; }, fim: function () { setTimeout(function () { try { mr.stop(); } catch (e) {} }, 180); }, cancelar: function () { cancelado = true; parar(); try { mr.stop(); } catch (e) {} }};
    $("veOcupTxt").textContent = "Gravando o vídeo… deixe esta tela aberta (" + fmtT(total()) + ")"; $("veProg").value = 0; $("veOcup").hidden = false;
    T = 0; desenhar(); mr.start(500); setTimeout(tocar, 250);
  }

  /* ---------- ligações ---------- */
  $("veImportar").onclick = function () { $("veArq").click(); };
  $("veArq").onchange = function () { var fs = [].slice.call(this.files || []); this.value = ""; if (fs.length) importar(fs); };
  $("veCriacoes").onclick = criacoes;
  $("veArqTroca").onchange = function () { var f = (this.files || [])[0]; this.value = ""; substituirCom(f); };
  $("veTexto").onclick = function () { return addTexto.apply(this, arguments); };
  $("veSons").onclick = function () { ABA = "audio"; var b = $("veLib"); desenharLib(); b.insertAdjacentHTML("afterbegin", SONS.map(function (s, i) { return '<div class="ve-item" role="button" tabindex="0" data-som="' + i + '" aria-label="Pôr ' + s[1] + ' na linha do tempo"><span class="mini" aria-hidden="true">' + (s[0] === "sfx" ? "🔊" : "🎼") + '</span><span>' + (s[0] === "sfx" ? "Efeito · " : "Trilha · ") + s[1] + '</span></div>'; }).join("")); var v = b.querySelector("p"); if (v) v.remove(); };
  $("veAbas").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) { ABA = b.dataset.aba; desenharLib(); } });
  $("veLib").addEventListener("click", async function (e) {
    if (Date.now() - LD_FIM < 400) return;   /* o clique que vem depois de arrastar não conta */
    var fxb = e.target.closest("[data-arr]"); if (fxb) { var kk = fxb.dataset.arr; aplicarFx(sel(), kk.charAt(0), kk.slice(2)); return; }
    var d = e.target.closest("[data-del]"); if (d) { e.stopPropagation(); var id = d.dataset.del; if (P.clips.some(function (c) { return c.mid === id; }) && !confirm("Este arquivo está na linha do tempo. Tirar da biblioteca apaga os clipes dele. Continuar?")) return; P.clips.filter(function (c) { return c.mid === id; }).forEach(function (c) { soltarEl(c.id); }); P.clips = P.clips.filter(function (c) { return c.mid !== id; }); if (MID[id]) URL.revokeObjectURL(MID[id].url); delete MID[id]; if (window.BWMascara) BWMascara.apagar(id); await tx("midias", "readwrite", function (s) { return s.delete(id); }); desenharLib(); tudo(); return; }
    var s = e.target.closest("[data-som]"); if (s) { var ms = await porSom(+s.dataset.som); addClip(ms); if (window.VEApp && VEApp.aberta && VEApp.aberta() === "midia") VEApp.fechar(); aviso("✓ " + SONS[+s.dataset.som][1] + " na linha do tempo (" + (ms.som === "sfx" ? "EFEITOS, na posição da agulha" : "TRILHA") + ")."); return; }
    var ed = e.target.closest("[data-editar]"); if (ed) { e.stopPropagation(); editarNaOrigem(ed.dataset.editar); return; }
    var m = e.target.closest("[data-mid]"); if (!m || !MID[m.dataset.mid]) return; var mm = MID[m.dataset.mid], cs = sel();
    if (cs && cs.ph && mm.tipo !== "audio" && cs.tipo !== "audio") { trocarEspaco(cs, mm); return; }
    if (cs && cs.phMusica && mm.tipo === "audio") { cs.mid = mm.id; cs.corte = 0; delete cs.phMusica; soltarEl(cs.id); cs.dur = Math.min(cs.dur, mm.dur || cs.dur); tudo(); aviso("🎵 Música do modelo trocada."); return; }
    var nc = addClip(mm);
    if (window.VEApp && VEApp.aberta && VEApp.aberta() === "midia") VEApp.fechar();   /* no celular a folha fechava só no ✕ e parecia que nada tinha entrado */
    aviso((mm.ruim ? "⚠ " : "✓ ") + mm.nome + " na linha do tempo (" + infoTr(nc.trilha)[0] + ", em " + fmtT(nc.ini) + ")" + (mm.ruim ? " — mas este arquivo não abre neste navegador." : "."), !!mm.ruim);
  });
  $("veLib").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".ve-item")) { e.preventDefault(); e.target.click(); } });
  $("vePlay").onclick = function () { if (TOCANDO) parar(); else tocar(); };
  $("veInicio").onclick = function () { irPara(0); $("veRolo").scrollLeft = 0; };
  $("veDesf").onclick = desfazer; $("veRef").onclick = refazer; $("veApIni").onclick = function () { aparar("ini"); }; $("veApFim").onclick = function () { aparar("fim"); }; $("veCortar").onclick = function () { return dividir.apply(this, arguments); }; $("veDuplicar").onclick = function () { return duplicar.apply(this, arguments); }; $("veApagar").onclick = function () { return apagar.apply(this, arguments); };
  $("veZoomMais").onclick = function () { PPS = Math.min(200, Math.round(PPS * 1.4)); desenharTL(); }; $("veZoomMenos").onclick = function () { PPS = Math.max(12, Math.round(PPS / 1.4)); desenharTL(); };
  $("veFmt").onchange = function () { P.fmt = this.value; if (P.fmt === "livre" && !P.w) { P.w = cv.width; P.h = cv.height; } formato(); guardar(); };
  ["veLargura", "veAltura"].forEach(function (id) { $(id).onchange = function () { if (P.fmt !== "livre") return; var par = function (v) { v = Math.round(Number(v) || 0); return lim(v - v % 2, 240, 4096); }; P.w = par($("veLargura").value); P.h = par($("veAltura").value); formato(); guardar(); aviso("Tamanho " + P.w + " × " + P.h + " px."); }; });
  $("veNovo").onclick = function () { if (P.clips.length && !confirm("Começar um vídeo novo? A linha do tempo atual é apagada (a biblioteca de mídia continua).")) return; parar(); Object.keys(EL).forEach(soltarEl); P = {fmt: P.fmt, clips: []}; SEL = null; T = 0; tudo(); aviso(""); };
  $("veExportar").onclick = exportar; $("veCancelar").onclick = function () { if (GRAV) GRAV.cancelar(); };
  $("veFecharSaida").onclick = function () { $("veSaida").hidden = true; try { $("veVideoPronto").pause(); } catch (e) {} };
  $("veCompartilhar").onclick = async function () { var s = $("veSaida"), f = new File([s._blob], s._nome, {type: s._blob.type}); try { if (navigator.canShare && navigator.canShare({files: [f]})) await navigator.share({files: [f]}); else $("veBaixar").click(); } catch (e) {} };
  $("vePropCorpo").addEventListener("input", function (e) { var el = e.target, k = el.dataset.p, c = sel(); if (!k || !c) return;
    if (k.indexOf("ia:") === 0) { c.ia = c.ia || {}; c.ia[k.slice(3)] = el.type === "range" ? +el.value : el.value; if (el.type === "range") { var o2 = el.nextElementSibling; if (o2) o2.textContent = el.value + "%"; } desenhar(); guardar(); marcarHist(); return; }
    if (k === "volDb") { var db = +el.value; c.vol = db <= -40 ? 0 : Math.round(100 * Math.pow(10, db / 20)); var oo = el.nextElementSibling; if (oo) oo.textContent = db <= -40 ? "mudo" : String(db).replace(".", ",") + " dB"; desenharTL(); desenhar(); guardar(); marcarHist(); return; }
    if (k.indexOf("g:") === 0) { c.grade = c.grade || {}; c.grade[k.slice(2)] = +el.value; c.look = ""; var o0 = el.nextElementSibling; if (o0) o0.textContent = el.value; desenhar(); guardar(); marcarHist(); return; } var v = el.type === "range" ? +el.value : el.value;
    if (k === "trilha" && v === "+") { v = novaTrilha(famDoClip(c)); c.trilha = v; desenharTL(); desenharProp(); desenhar(); guardar(); marcarHist(); aviso("＋ Camada nova: " + infoTr(v)[0] + "."); return; }
    if (k === "dur") v = lim(v, 0.2, maxDur(c)); if (k === "transDur") { if (c.trans) c.trans.dur = v; } else c[k] = v; if (el.type === "range") { var o = el.nextElementSibling; if (o) o.textContent = String(v).replace(".", ",") + (o.textContent.replace(/^[\d.,\-]+/, "")); }
    if (k === "anima") desenharProp();
    if (k === "trilha" || k === "dur" || k === "txt" || k === "transDur" || k === "anima") desenharTL(); desenhar(); guardar(); marcarHist(); });
  $("vePropCorpo").addEventListener("click", function (e) { var b = e.target.closest("button"), c = sel(); if (!b || !c) return;
    if (b.hasAttribute("data-vel")) mudarVel(c, +b.dataset.vel);
    else if (b.hasAttribute("data-trans")) { var k = b.dataset.trans; c.trans = k ? {tipo: k, dur: (c.trans && c.trans.dur) || 0.6} : null; tudo(); if (k) { verTransicao(c); aviso("Transição “" + TRANS[k] + "”" + (anteriorDe(c) ? "." : " — encoste o clipe no fim de outro para ela aparecer.")); } }
    else if (b.hasAttribute("data-efeito")) { c.efeito = b.dataset.efeito || ""; if (c.efeito && c.efInt == null) c.efInt = 85; tudo(); }
    else if (b.hasAttribute("data-ck")) { c.ck = b.dataset.ck === "1"; if (c.ck && !c.ckCor) { c.ckCor = corDoFundo(c) || "#00d000"; c.ckModo = "auto"; porNivel(c, nivelDoFundo(c)); } tudo(); if (c.ck) aviso("Chroma key ligado — fundo " + c.ckCor + (c.ckModo !== "manual" ? ", nível " + (c.ckNivel || 3) + ". Sobrou fundo? Suba o nível." : ".")); }
    else if (b.hasAttribute("data-ckmodo")) { c.ckModo = b.dataset.ckmodo; if (c.ckModo === "auto") porNivel(c, c.ckNivel || 3); tudo(); }
    else if (b.hasAttribute("data-cknivel")) { porNivel(c, +b.dataset.cknivel); tudo(); aviso("Nível " + c.ckNivel + " de 5."); }
    else if (b.dataset.acao === "ckAuto") { var ach = corDoFundo(c); if (ach) { c.ckCor = ach; if (c.ckModo !== "manual") porNivel(c, nivelDoFundo(c)); tudo(); aviso("Fundo encontrado: " + ach + (c.ckModo !== "manual" ? " — nível " + c.ckNivel + " indicado para esta imagem." : ".")); } else aviso("Não achei um fundo verde ou azul nas bordas — use ESCOLHER NA TELA.", true); }
    else if (b.dataset.acao === "ckPegar") { PEGAR_CK = true; cv.style.cursor = "crosshair"; aviso("🎯 Toque no FUNDO do vídeo, na prévia, para escolher a cor."); }
    else if (b.dataset.acao === "congelar") congelar();
    else if (e.target.closest("[data-predel]")) { var ip = +e.target.closest("[data-predel]").dataset.predel, lp = predefCor(); if (lp[ip] && confirm("Apagar a predefinição “" + lp[ip].nome + "”?")) { lp.splice(ip, 1); predefCor(lp); desenharProp(); aviso("Predefinição apagada."); } }
    else if (b.hasAttribute("data-look")) { var lk = BWCor.LOOKS[b.dataset.look]; c.grade = lk ? JSON.parse(JSON.stringify(lk.g)) : {}; c.look = b.dataset.look; tudo(); aviso(lk ? "Cor “" + lk.nome + "” — ajuste as barras à vontade." : "Cor original."); }
    else if (b.hasAttribute("data-predef")) { var pr = predefCor()[+b.dataset.predef]; if (pr) { c.grade = JSON.parse(JSON.stringify(pr.g)); c.look = "p" + b.dataset.predef; tudo(); aviso("Predefinição “" + pr.nome + "” aplicada."); } }
    else if (b.dataset.acao === "corZerar") { delete c.grade; c.look = ""; tudo(); aviso("Cor zerada (original)."); }
    else if (b.dataset.acao === "corTodos") corEmTodos(c);
    else if (b.dataset.acao === "iaAnalisar") analisarPessoa(c);
    else if (b.dataset.acao === "iaCancelar") { BWMascara.cancelar(); }
    else if (b.dataset.acao === "iaModelos") { if (window.VEModelos) VEModelos.abrir("mascara"); }
    else if (b.hasAttribute("data-iafrente")) { c.ia = c.ia || {}; c.ia.frente = b.dataset.iafrente === "1"; tudo(); }
    else if (b.hasAttribute("data-iafundo")) { c.ia = c.ia || {}; c.ia.fundo = b.dataset.iafundo; tudo(); }
    else if (b.hasAttribute("data-iacont")) { c.ia = c.ia || {}; c.ia.contorno = b.dataset.iacont === "1"; tudo(); }
    else if (b.hasAttribute("data-frente")) { c.frente = b.dataset.frente === "1"; tudo(); }
    else if (b.hasAttribute("data-ruido")) { c.ruido = +b.dataset.ruido; tudo(); aviso(c.ruido ? "Redução de ruído " + ["", "leve", "média", "forte"][c.ruido] + " (tira zumbido grave e chiado agudo)." : "Redução de ruído desligada."); }
    else if (b.hasAttribute("data-voz")) { c.voz = +b.dataset.voz; tudo(); }
    else if (b.dataset.acao === "mudo") { c.vol = c.vol === 0 ? 100 : 0; tudo(); }
    else if (b.dataset.acao === "normalizar") normalizar(c);
    else if (b.dataset.acao === "desnormalizar") { delete c.normG; tudo(); aviso("Normalização tirada."); }
    else if (b.dataset.acao === "extrair") extrairAudio(c);
    else if (b.dataset.acao === "corSalvar") { if (!BWCor.ativo(c.grade)) { aviso("Mexa em alguma barra de cor antes de salvar.", true); return; } var lst = predefCor(), nm = (prompt("Nome da predefinição:", "Minha cor " + (lst.length + 1)) || "").trim().slice(0, 28); if (!nm) return; lst.push({nome: nm, g: JSON.parse(JSON.stringify(c.grade))}); predefCor(lst); c.look = "p" + (lst.length - 1); desenharProp(); aviso("★ “" + nm + "” salva neste aparelho: aparece em todo take e em todo projeto."); } });
  $("vePropCorpo").addEventListener("dblclick", function (e) { var el = e.target.closest('input[type="range"][data-p^="g:"]'), c = sel(); if (!el || !c) return; el.value = 0; el.dispatchEvent(new Event("input", {bubbles: true})); });
  /* predefinições de cor: preferência só deste aparelho (ui_ve_cor_predef) — servem para todos os projetos */
  function predefCor(lista) { try { if (lista) { localStorage.setItem("ui_ve_cor_predef", JSON.stringify(lista.slice(0, 24))); return lista; } var l = JSON.parse(localStorage.getItem("ui_ve_cor_predef") || "[]"); return Array.isArray(l) ? l.filter(function (x) { return x && x.nome && x.g; }) : []; } catch (er) { return lista || []; } }
  function corEmTodos(c) { var n = 0; P.clips.forEach(function (x) { if (x !== c && (x.tipo === "video" || x.tipo === "imagem")) { if (c.grade) x.grade = JSON.parse(JSON.stringify(c.grade)); else delete x.grade; x.look = c.look || ""; n++; } }); tudo(); aviso(n ? "⇉ Mesma cor em mais " + n + " take" + (n > 1 ? "s" : "") + "." : "Não há outros takes de vídeo ou foto.", !n); }
  function porNivel(c, n) { n = lim(Math.round(n) || 3, 1, 5); var v = window.BWChroma && BWChroma.NIVEIS[n]; c.ckNivel = n; if (v) { c.ckInt = v.ckInt; c.ckSuave = v.ckSuave; c.ckLimpa = v.ckLimpa; c.ckSombra = v.ckSombra; } }
  function nivelDoFundo(c) { var f = fonteDe(c, lim(T, c.ini, c.ini + c.dur - 0.02), true); return f && window.BWChroma && c.ckCor ? BWChroma.nivelPara(f.el, f.w, f.h, c.ckCor) : 3; }
  function corDoFundo(c) { var f = fonteDe(c, lim(T, c.ini, c.ini + c.dur - 0.02), true); return f && window.BWChroma ? BWChroma.detectar(f.el, f.w, f.h) : null; }
  function pegarCor(fx, fy) { var c = sel(); PEGAR_CK = false; cv.style.cursor = ""; if (!c) return;
    SEM_CK = true; desenhar(); var x = lim(Math.round(fx * cv.width) - 2, 0, cv.width - 5), y = lim(Math.round(fy * cv.height) - 2, 0, cv.height - 5), d = null; try { d = cx.getImageData(x, y, 5, 5).data; } catch (e) {} SEM_CK = false;
    if (!d) { desenhar(); aviso("Não consegui ler a cor aqui — use a caixinha de cor.", true); return; }
    var r = 0, g = 0, b = 0, n = d.length / 4; for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    c.ckCor = "#" + [r / n, g / n, b / n].map(function (v) { v = Math.round(v).toString(16); return v.length < 2 ? "0" + v : v; }).join(""); c.ck = true; if (c.ckModo !== "manual") porNivel(c, nivelDoFundo(c)); tudo(); aviso("Cor escolhida: " + c.ckCor + (c.ckModo !== "manual" ? " — nível " + c.ckNivel + "." : ". Ajuste a INTENSIDADE até o fundo sumir.")); }
  /* arrastar na linha do tempo: mover, aparar pelas alças, agulha na régua */
  var arr = null;
  function zoomEm(fator, clientX) { var ro = $("veRolo"), r = ro.getBoundingClientRect(), x = clientX == null ? ro.clientWidth / 2 : clientX - r.left, tt = (ro.scrollLeft + x) / PPS;
    PPS = lim(Math.round(PPS * fator), 8, 320); desenharTL(); ro.scrollLeft = Math.max(0, tt * PPS - x); }
  function encaixarTudo() { var ro = $("veRolo"); PPS = lim(Math.floor((ro.clientWidth - 30) / Math.max(5, total() + 1)), 8, 320); desenharTL(); ro.scrollLeft = 0; }
  $("veFaixas").addEventListener("pointerdown", function (e) {
    if (e.button === 2) return;
    var ro = $("veRolo"), xDe = function (ev) { return ev.clientX - $("veFaixas").getBoundingClientRect().left; }, F = window.BWFerr ? BWFerr.atual() : "v";
    if (F === "h") { arr = {tipo: "mao", x0: e.clientX, sl: ro.scrollLeft}; if (window.BWFerr) BWFerr.preso(true); e.preventDefault(); return; }
    if (F === "z") { zoomEm(e.altKey ? 1 / 1.5 : 1.5, e.clientX); e.preventDefault(); return; }
    var toqueApp = APP && e.pointerType !== "mouse";
    if (e.target.closest("#veRegua")) { if (toqueApp) return; arr = {tipo: "agulha", xDe: xDe}; irPara(xDe(e) / PPS); e.preventDefault(); return; }
    if (F === "t") { addTexto({t: Math.max(0, xDe(e) / PPS)}); BWFerr.trocar("v"); aviso("T Texto criado — escreva em AJUSTES."); e.preventDefault(); return; }
    if (F === "c") { var ec = e.target.closest("[data-clip]"); if (!ec) return; var tc = Math.max(0, xDe(e) / PPS), alvos = e.shiftKey ? P.clips.filter(function (x) { return tc > x.ini + 0.05 && tc < x.ini + x.dur - 0.05; }) : P.clips.filter(function (x) { return x.id === ec.dataset.clip; }), ult = null;
      alvos.forEach(function (x) { var d = dividirEm(x, tc); if (d) ult = d; }); if (ult) { SEL = ult.id; tudo(); aviso("✂ Cortado em " + fmtT(tc) + (e.shiftKey ? " (todas as camadas)" : "") + ". Shift + clique corta todas as camadas."); } e.preventDefault(); return; }
    var jt = e.target.closest("[data-junta],[data-trp]"); if (jt) { var cj = P.clips.filter(function (x) { return x.id === (jt.dataset.junta || jt.dataset.trp); })[0]; if (!cj) return;
      if (SEL !== cj.id) { SEL = cj.id; desenharProp(); } arr = {tipo: "trans", c: cj, x0: e.clientX, y0: e.clientY, dur0: transDe(cj) || 0.6, tinha: !!cj.trans, moveu: false}; e.preventDefault(); return; }
    var el = e.target.closest("[data-clip]"); if (!el) { if (toqueApp) return; if (SEL) { SEL = null; desenharTL(); desenharProp(); } return; }
    var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return; var al = e.target.dataset.al || "";
    if (toqueApp && SEL !== c.id) return;   /* no app, dedo em take NÃO escolhido rola a linha do tempo; o toque (click) escolhe — ve-app.js */
    if (SEL !== c.id) { SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x === el); }); desenharProp(); }
    arr = {tipo: al ? "al" + al : "mover", c: c, el: el, x0: e.clientX, ini: c.ini, dur: c.dur, corte: c.corte || 0, trOrig: c.trilha, moveu: false}; e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!arr) { lamina(e); return; }
    if (arr.tipo === "mao") { $("veRolo").scrollLeft = arr.sl - (e.clientX - arr.x0); return; }
    if (arr.tipo === "pan") { ZP.x = arr.zx + (e.clientX - arr.x0); ZP.y = arr.zy + (e.clientY - arr.y0); limitarZP(); aplicarZP(); return; }
    if (arr.tipo === "palco") { if (!arr.moveu && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 5) return; if (!arr.c) { arr.moveu = true; return; } var cr = cv.getBoundingClientRect(), pc = arr.c; pc.x = Math.round(lim(arr.px + (e.clientX - arr.x0) / cr.width * 100, -100, 100)); pc.y = Math.round(lim(arr.py + (e.clientY - arr.y0) / cr.height * 100, -100, 100)); arr.moveu = true; desenhar(); return; }
    if (arr.tipo === "agulha") { irPara(arr.xDe(e) / PPS); return; }
    if (arr.tipo === "trans") { if (!arr.moveu && Math.abs(e.clientX - arr.x0) < 4) return; arr.moveu = true; var ct = arr.c, ant = anteriorDe(ct); if (!ct.trans) ct.trans = {tipo: "dissolver", dur: arr.dur0};
      ct.trans.dur = Math.round(lim(arr.dur0 + (e.clientX - arr.x0) / PPS, 0.1, Math.min(ct.dur, ant ? ant.dur : ct.dur) * 0.9) * 10) / 10;
      var fx2 = $("veFaixas").querySelector('[data-clip="' + ct.id + '"] .tr'); if (fx2) fx2.style.width = Math.max(10, ct.trans.dur * PPS) + "px"; var jj = $("veFaixas").querySelector('[data-junta="' + ct.id + '"]'); if (jj) { jj.classList.add("com"); jj.innerHTML = "<b>" + esc(TRANS[ct.trans.tipo]) + " · " + String(ct.trans.dur).replace(".", ",") + " s</b>"; }
      if (!TOCANDO) { irPara(ct.ini + ct.trans.dur / 2); } return; }
    var c = arr.c, d = (e.clientX - arr.x0) / PPS; if (Math.abs(e.clientX - arr.x0) > 3) arr.moveu = true; if (!arr.moveu) return;
    var temFonte = c.tipo === "video" || c.tipo === "audio", r = function (v) { return Math.round(v * 20) / 20; };
    if (arr.tipo === "mover") { c.ini = Math.max(0, r(arr.ini + d)); var fx = document.elementFromPoint(e.clientX, e.clientY), fa = fx && fx.closest && fx.closest("[data-trilha]"); if (fa) { var tr = fa.dataset.trilha; if (fam(tr) === famDoClip(c) && tr !== c.trilha && !(arr.yCriou != null && Math.abs(e.clientY - arr.yCriou) < 26)) { c.trilha = tr; fa.appendChild(arr.el); arr.el.style.setProperty("--c", corTr(tr)); } }
      /* 22/11 (dono): EM CIMA de outro take aparece o aviso com DUAS escolhas pela altura do dedo/mouse —
         metade de CIMA da camada = ⬆ PARA CIMA: a camada nova é criada NA HORA (o take já sobe enquanto arrasta);
         metade de BAIXO = ⇄ TROCAR DE LUGAR com o take de baixo (vale ao soltar). */
      var alvo = !livreEm(c.trilha, c.ini, c.dur, c) ? P.clips.filter(function (x) { return x !== c && x.trilha === c.trilha && x.ini < c.ini + c.dur - 0.02 && x.ini + x.dur > c.ini + 0.02; })
        .sort(function (x, y) { return Math.abs(x.ini + x.dur / 2 - c.ini - c.dur / 2) - Math.abs(y.ini + y.dur / 2 - c.ini - c.dur / 2); })[0] : null;
      arr.nova = false; arr.troca = null;
      if (alvo) { var faixa = arr.el.parentNode, fr = faixa && faixa.getBoundingClientRect(), emCima = fr && e.clientY < fr.top + fr.height * 0.42;
        if (emCima) { var trAntes = c.trilha, nt0 = novaTrilha(famDoClip(c)); c.trilha = nt0; arr.yCriou = e.clientY; desenharTL();
          var el2 = $("veFaixas").querySelector('[data-clip="' + c.id + '"]'); if (el2) { arr.el = el2; el2.classList.add("on"); }
          dicaArr(e, "cima", "⬆ PARA CIMA · camada nova criada (" + infoTr(nt0)[0] + ")"); arr.subiu = trAntes; }
        else { arr.troca = alvo; dicaArr(e, "trocar", ""); } }
      else dicaArr(e, arr.subiu ? "cima" : "", arr.subiu ? "⬆ PARA CIMA · na camada nova — solte onde quiser" : "");
      arr.el.classList.toggle("nova", !!arr.troca); if (arr.troca) arr.el.setAttribute("data-dica", "⇄ TROCAR"); }
    else if (arr.tipo === "ale") { var dd = lim(d, temFonte ? -arr.corte / vel(c) : -arr.ini, arr.dur - 0.2); dd = Math.max(dd, -arr.ini); c.ini = r(arr.ini + dd); c.dur = r(arr.dur - dd); if (temFonte) c.corte = Math.max(0, arr.corte + dd * vel(c)); }
    else { c.dur = r(lim(arr.dur + d, 0.2, temFonte ? maxDur(c) : 600)); }
    arr.el.style.left = (c.ini * PPS) + "px"; arr.el.style.width = Math.max(18, c.dur * PPS) + "px"; if (!TOCANDO) desenhar();
  });
  window.addEventListener("pointerup", function () { if (!arr) return; var a = arr; arr = null; if (window.BWFerr) BWFerr.preso(false);
    dicaArr(null);
    if (a.tipo === "mover" && a.moveu && a.troca) trocarLugar(a.c, a.troca, a.ini, a.trOrig);
    else if (a.tipo === "mover" && a.moveu && a.subiu) aviso("⬆ Camada nova: " + infoTr(a.c.trilha)[0] + " — o take ficou por cima do outro.");
    if (a.tipo === "trans") { if (!a.moveu) { menuTrans(a.c, a.x0, a.y0); return; } tudo(); marcar(a.c.id); aviso("◧ Transição “" + TRANS[a.c.trans.tipo] + "” com " + String(a.c.trans.dur).replace(".", ",") + " s" + (a.tinha ? "." : " (Dissolver — toque no ◆ para trocar).")); return; }
    if (a.tipo !== "agulha" && a.tipo !== "mao" && (a.moveu || a.tipo === "trans")) tudo(); });
  /* ARRASTAR DA BIBLIOTECA (22/11): mídia, som, transição e efeito vão por arrasto até a linha do tempo (rato depois de 5 px; dedo depois de segurar
     ~0,22 s, senão é rolagem — regra 111). Mídia solta em cima de outro take = camada nova; transição solta num take/emenda; efeito solto num take. */
  var LD = null, LD_FIM = 0, LD_RAF = 0;
  function ldAlvo(x, y) { if (LD.fantasma) LD.fantasma.style.display = "none"; var el = document.elementFromPoint(x, y); if (LD.fantasma) LD.fantasma.style.display = "";
    if (!el || !el.closest) return null; var fx = $("veFaixas"), r = fx.getBoundingClientRect(), t = Math.max(0, (x - r.left) / PPS);
    var jt = el.closest("[data-junta]"), cl = el.closest("[data-clip]"), fa = el.closest("[data-trilha]");
    if (!fa && !cl && !jt) return null; return {clip: jt ? jt.dataset.junta : cl ? cl.dataset.clip : null, trilha: fa ? fa.dataset.trilha : null, t: t, el: jt || cl || fa}; }
  function ldMarca(a) { $("veFaixas").querySelectorAll(".ld-alvo").forEach(function (x) { x.classList.remove("ld-alvo"); }); if (a && a.el) a.el.classList.add("ld-alvo"); }
  function ldComecar() { var it = LD.it, r = it.getBoundingClientRect(), g = document.createElement("div"); g.className = "ve-fantasma"; g.textContent = (it.querySelector("span:not(.mini)") || it).textContent.trim().slice(0, 40); document.body.appendChild(g); LD.fantasma = g; LD.ativo = true; it.classList.add("arrastando");
    if (window.BWFerr) BWFerr.preso(true); ldMover(LD.x, LD.y);
    var laco = function () { if (!LD || !LD.ativo) return; var ro = $("veRolo"), rr = ro.getBoundingClientRect(); if (LD.y > rr.top - 30 && LD.y < rr.bottom + 30) { if (LD.x > rr.right - 40) ro.scrollLeft += 14; else if (LD.x < rr.left + 40 && LD.x > rr.left - 10) ro.scrollLeft -= 14; }
      /* página que rola (celular): dedo perto da borda de baixo/cima rola a página até a linha do tempo */
      var se = document.scrollingElement || document.documentElement; if (se.scrollHeight > innerHeight + 4) { var bx = innerHeight - LD.y, tp = LD.y; if (bx < 70) window.scrollBy(0, Math.round(8 + (70 - Math.max(0, bx)) * 0.45)); else if (tp < 70) window.scrollBy(0, -Math.round(8 + (70 - Math.max(0, tp)) * 0.45)); else { LD_RAF = requestAnimationFrame(laco); return; } ldMover(LD.x, LD.y); } LD_RAF = requestAnimationFrame(laco); }; LD_RAF = requestAnimationFrame(laco); }
  function ldMover(x, y) { LD.x = x; LD.y = y; if (!LD.ativo) return; LD.fantasma.style.left = (x + 12) + "px"; LD.fantasma.style.top = (y + 10) + "px"; var a = ldAlvo(x, y); LD.alvo = a; ldMarca(a);
    var k = LD.kind, txt = !a ? "solte na linha do tempo" : k === "t" ? (a.clip ? "◧ transição neste take" : "solte num take") : k === "e" ? (a.clip ? "✦ efeito neste take" : "solte num take") : (a.clip ? "＋ camada nova por cima" : "pôr aqui · " + fmtT(a.t));
    LD.fantasma.setAttribute("data-dica", txt); }
  async function ldSoltar() { var a = LD.alvo, k = LD.kind, key = LD.key; if (!a) return;
    if (k === "t" || k === "e") { var c = a.clip ? P.clips.filter(function (x) { return x.id === a.clip; })[0] : P.clips.filter(function (x) { return x.trilha === a.trilha && famDoClip(x) === "v"; }).sort(function (p, q) { return Math.abs(p.ini - a.t) - Math.abs(q.ini - a.t); })[0]; aplicarFx(c, k, key); return; }
    var m = k === "s" ? await porSom(+key) : MID[key]; if (!m) return; var f = m.tipo === "audio" ? "a" : "v", tr = a.trilha && fam(a.trilha) === f ? a.trilha : (f === "a" ? (m.som === "sfx" ? "a2" : "a1") : "v1");
    if (a.clip) { var sob = P.clips.filter(function (x) { return x.id === a.clip; })[0]; if (sob && fam(sob.trilha) === f) tr = sob.trilha; }
    var nova = addClip(m, tr, a.t); marcar(nova.id); aviso((nova.trilha !== tr ? "＋ Camada nova (" + infoTr(nova.trilha)[0] + "): " : "") + m.nome + " em " + fmtT(nova.ini) + "."); }
  function ldFim() { if (!LD) return; clearTimeout(LD.timer); cancelAnimationFrame(LD_RAF); if (LD.fantasma) LD.fantasma.remove(); LD.it.classList.remove("arrastando"); ldMarca(null); if (LD.ativo) { LD_FIM = Date.now(); if (window.BWFerr) BWFerr.preso(false); } LD = null; }
  $("veLib").addEventListener("pointerdown", function (e) { if (e.button > 0 || e.target.closest("button")) return; var it = e.target.closest("[data-mid],[data-arr],[data-som]"); if (!it) return;
    var kind = it.dataset.arr ? it.dataset.arr.charAt(0) : it.dataset.som != null ? "s" : "m", key = it.dataset.arr ? it.dataset.arr.slice(2) : it.dataset.som != null ? it.dataset.som : it.dataset.mid;
    LD = {it: it, kind: kind, key: key, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, ativo: false, toque: e.pointerType !== "mouse"};
    if (LD.toque) LD.timer = setTimeout(function () { if (LD && !LD.ativo) { ldComecar(); if (navigator.vibrate) navigator.vibrate(12); } }, 220); });
  window.addEventListener("pointermove", function (e) { if (!LD) return; if (!LD.ativo) { var dd = Math.hypot(e.clientX - LD.x0, e.clientY - LD.y0); if (LD.toque) { if (dd > 10) ldFim(); return; } if (dd > 5) { LD.x = e.clientX; LD.y = e.clientY; ldComecar(); } return; } ldMover(e.clientX, e.clientY); });
  document.addEventListener("touchmove", function (e) { if (LD && LD.ativo) e.preventDefault(); }, {passive: false});
  window.addEventListener("pointerup", function () { if (!LD) return; var vai = LD.ativo; if (vai) ldSoltar().catch(function (x) { console.warn("ldSoltar", x); }); ldFim(); });
  window.addEventListener("pointercancel", function () { if (LD) ldFim(); });
  $("veFaixas").addEventListener("contextmenu", function (e) { var j = e.target.closest("[data-junta]"); if (!j) return; e.preventDefault(); e.stopPropagation(); var c = P.clips.filter(function (x) { return x.id === j.dataset.junta; })[0]; if (c) menuTrans(c, e.clientX, e.clientY); });
  $("veLib").addEventListener("dragstart", function (e) { e.preventDefault(); });   /* a miniatura (img) começava o arrastar NATIVO do navegador e engolia o nosso */
  // LÂMINA (C): uma linha mostra onde o corte vai cair
  function lamina(e) { var l = $("veLamina"); if (!l) return; var F = window.BWFerr ? BWFerr.atual() : "v", ec = e.target && e.target.closest && e.target.closest("[data-clip]");
    if (F !== "c" || !ec) { l.hidden = true; return; } var fx = $("veFaixas").getBoundingClientRect(), r = ec.getBoundingClientRect(); l.hidden = false; l.style.left = (e.clientX - fx.left) + "px"; l.style.top = (r.top - fx.top) + "px"; l.style.height = r.height + "px"; }
  /* Ctrl + rodinha = mais/menos tempo na tela (horizontal). Alt + rodinha EM CIMA DE UMA CAMADA = camada mais alta/mais baixa (até o mínimo) */
  function alturaDe(id, delta) { P.alt = P.alt || {}; var a = lim(Math.round(altTr(id) + delta), ALT_MIN, 160); if (a === altTr(id)) return; P.alt[id] = a; desenharTL(); guardar(); }
  function trilhaSob(e) { var el = document.elementFromPoint(e.clientX, e.clientY), f = el && el.closest && (el.closest("[data-trilha]") || el.closest("[data-rot]")); return f ? f.dataset.trilha || f.dataset.rot : null; }
  [$("veRolo"), $("veRot")].forEach(function (alvo) { if (!alvo) return; alvo.addEventListener("wheel", function (e) {
    if (e.altKey && !e.ctrlKey) { var id = trilhaSob(e); if (!id) return; e.preventDefault(); alturaDe(id, e.deltaY < 0 ? 8 : -8); return; }
    if (e.ctrlKey) { e.preventDefault(); zoomEm(e.deltaY < 0 ? 1.25 : 0.8, e.clientX); } }, {passive: false}); });
  // PRÉVIA: V arrasta o clipe escolhido (ou o de cima) direto na tela; T cria um texto onde tocou; Z aproxima a linha do tempo
  cv.addEventListener("pointerdown", function (e) { if (e.button === 2) return; var F = window.BWFerr ? BWFerr.atual() : "v", cr = cv.getBoundingClientRect(), fx = (e.clientX - cr.left) / cr.width, fy = (e.clientY - cr.top) / cr.height;
    if (PEGAR_CK) { e.preventDefault(); pegarCor(fx, fy); return; }
    if ((F === "h" || e.button === 1) && ZP.z !== 1) { arr = {tipo: "pan", x0: e.clientX, y0: e.clientY, zx: ZP.x, zy: ZP.y}; e.preventDefault(); return; }
    if (F === "t") { addTexto({x: Math.round((fx - 0.5) * 100), y: Math.round((fy - 0.5) * 100)}); BWFerr.trocar("v"); aviso("T Texto criado onde você tocou — escreva em AJUSTES."); return; }
    if (F !== "v") return;
    var ativos = P.clips.filter(function (c) { return c.tipo !== "audio" && T >= c.ini && T < c.ini + c.dur; }), pesoTr = function (id) { return (fam(id) === "t" ? 1000 : 0) + numTr(id); };
    var c = sel(); if (!c || ativos.indexOf(c) < 0) { c = ativos.sort(function (a, b) { return pesoTr(b.trilha) - pesoTr(a.trilha); })[0]; if (c) { SEL = c.id; desenharTL(); desenharProp(); } }
    arr = {tipo: "palco", c: c || null, x0: e.clientX, y0: e.clientY, px: c ? c.x || 0 : 0, py: c ? c.y || 0 : 0, moveu: false}; e.preventDefault(); });
  /* 22/11 (dono): clicar na prévia NÃO abre mais o menu — as opções ficam nos ⋯ discretos no alto da prévia (o botão direito continua) */
  (function () { var tela = cv.parentElement; if (!tela || $("veOpcP")) return; var b = document.createElement("button"); b.type = "button"; b.id = "veOpcP"; b.className = "ve-opcp"; b.title = "Opções da prévia"; b.setAttribute("aria-label", "Opções da prévia"); b.textContent = "⋯";
    b.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); b.onclick = function (e) { e.stopPropagation(); var r = b.getBoundingClientRect(); BWFerr._acabouSegurar = 0; menuPrevia(Math.max(8, r.right - 250), r.bottom + 6); }; tela.appendChild(b); })();
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); menuPrevia(e.clientX, e.clientY); });

  /* ZOOM DA PRÉVIA (22/11): rodinha em cima da prévia aproxima/afasta no ponto do mouse; com zoom, a mão (H, Espaço ou botão do meio) arrasta;
     só muda a VISTA (o vídeo exportado não muda). Duplo clique no selo volta a 100%. */
  var ZP = {z: 1, x: 0, y: 0};
  function aplicarZP() { if (ZP.z === 1) { ZP.x = ZP.y = 0; cv.style.transform = ""; } else { cv.style.transformOrigin = "0 0"; cv.style.transform = "translate(" + ZP.x.toFixed(1) + "px," + ZP.y.toFixed(1) + "px) scale(" + ZP.z + ")"; }
    var b = $("veZoomP"); if (!b) { var tela = cv.parentElement; if (!tela) return; b = document.createElement("button"); b.type = "button"; b.id = "veZoomP"; b.className = "ve-zoomp"; b.title = "Zoom da prévia — toque para voltar a 100%"; b.setAttribute("aria-label", "Voltar o zoom da prévia a 100%"); b.onclick = function () { zoomPrevia(0); }; tela.appendChild(b); }
    b.textContent = "🔍 " + Math.round(ZP.z * 100) + "%  ✕"; b.hidden = ZP.z === 1; }
  function limitarZP() { var r = cv.getBoundingClientRect(), w = r.width / ZP.z, h = r.height / ZP.z;
    if (ZP.z < 1) { ZP.x = w * (1 - ZP.z) / 2; ZP.y = h * (1 - ZP.z) / 2; } else { ZP.x = lim(ZP.x, w * (1 - ZP.z), 0); ZP.y = lim(ZP.y, h * (1 - ZP.z), 0); } }
  function zoomPrevia(novo, cxp, cyp) { var r = cv.getBoundingClientRect(), L = r.left - ZP.x, Tp = r.top - ZP.y, w = r.width / ZP.z, h = r.height / ZP.z;
    novo = novo ? lim(novo, 0.5, 8) : 1; if (cxp == null) { cxp = L + w / 2; cyp = Tp + h / 2; }
    var px = cxp - L, py = cyp - Tp, ux = (px - ZP.x) / ZP.z, uy = (py - ZP.y) / ZP.z; ZP.x = px - ux * novo; ZP.y = py - uy * novo; ZP.z = Math.round(novo * 100) / 100; limitarZP(); aplicarZP(); }
  (cv.parentElement || cv).addEventListener("wheel", function (e) { if (e.ctrlKey || e.altKey) return; e.preventDefault(); zoomPrevia(ZP.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, {passive: false});
  addEventListener("resize", function () { if (ZP.z !== 1) { limitarZP(); aplicarZP(); } });
  function salvarQuadro() { cv.toBlob(function (bl) { if (!bl) return; var a = document.createElement("a"), u = URL.createObjectURL(bl); a.href = u; a.download = (P.nome || "video").replace(/[^\w\-]+/g, "-") + "-quadro-" + fmtT(T).replace(/[^\d]/g, "") + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); aviso("🖼 Quadro salvo como imagem (PNG)."); }, "image/png"); }
  function menuPrevia(x, y) { if (!window.BWFerr) return; if (Date.now() - (BWFerr._acabouSegurar || 0) < 900) return; var c = sel(), vis = c && c.tipo !== "audio" && T >= c.ini && T < c.ini + c.dur;
    var it = [{tit: "VISTA (não muda o vídeo)"}, {icone: "＋", rot: "Aproximar", tecla: "Rodinha ↑", fn: function () { zoomPrevia(ZP.z * 1.5); }}, {icone: "－", rot: "Afastar", tecla: "Rodinha ↓", fn: function () { zoomPrevia(ZP.z / 1.5); }},
      {icone: "⤢", rot: "Ajustar à tela (100%)", off: ZP.z === 1, fn: function () { zoomPrevia(0); }}, {icone: "🔍", rot: "Zoom", sub: [2, 4, 8].map(function (z) { return {rot: z * 100 + "%" + (ZP.z === z ? "  ✓" : ""), fn: function () { zoomPrevia(z); }}; })}, "-",
      {icone: TOCANDO ? "⏸" : "▶", rot: TOCANDO ? "Pausar" : "Tocar", tecla: "Espaço", fn: function () { $("vePlay").click(); }}, {icone: "🖼", rot: "Salvar este quadro como imagem", fn: salvarQuadro}, "-",
      {tit: "TELA"}, {icone: "⛶", rot: "Tela grande (esconde os painéis)", fn: function () { $("veCheia").click(); }},
      {icone: "🗗", rot: "Desafixar: prévia numa janela solta", fn: function () { $("veSegunda").click(); }}, {icone: "🖥", rot: "Prévia no segundo monitor", fn: function () { $("veSegunda").click(); }},
      {icone: "⛶", rot: "Tela cheia (monitor inteiro)", fn: function () { var el = cv.parentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {}); }},
      {icone: "📱", rot: "Controle pelo celular", fn: function () { var b = $("veCelular"); if (b) b.click(); }}];
    if (vis) it = it.concat(["-", {tit: "TAKE ESCOLHIDO"}, {icone: "⊕", rot: "Centralizar", fn: function () { c.x = 0; c.y = 0; tudo(); }}, {icone: "▣", rot: "Tamanho original (100%)", fn: function () { c.esc = 100; c.x = 0; c.y = 0; tudo(); }}]);
    BWFerr.menu(x, y, it, "PRÉVIA"); }

  /* ---------- FERRAMENTAS E ATALHOS (estilo Premiere/CapCut) ---------- */
  if (window.BWFerr) {
    var I = BWFerr.ICONES;
    BWFerr.barra({ el: $("veFerr"), alvos: [$("veRolo"), cv], atual: "v", ferramentas: [
      {id: "v", tecla: "V", nome: "Seleção", icone: I.v, dica: "move, apara e escolhe clipes; na prévia arrasta o clipe"},
      {id: "c", tecla: "C", nome: "Lâmina", icone: I.c, dica: "clique no clipe para cortar ali (Shift = todas as camadas)"},
      {id: "h", tecla: "H", nome: "Mão", icone: I.h, dica: "arrasta a linha do tempo"},
      {id: "z", tecla: "Z", nome: "Zoom", icone: I.z, dica: "clique aproxima, Alt + clique afasta"},
      {id: "t", tecla: "T", nome: "Texto", icone: I.t, dica: "clique na prévia ou na linha do tempo para criar um texto"}],
      aoTrocar: function (id) { var l = $("veLamina"); if (l && id !== "c") l.hidden = true; } });
    var passoQ = 1 / 30;
    BWFerr.atalhos({
      "espaco, k": function () { $("vePlay").click(); }, "l": function () { if (!TOCANDO) tocar(); }, "j": function () { irPara(T - 1); },
      "arrowleft": function () { irPara(T - passoQ); }, "arrowright": function () { irPara(T + passoQ); }, "shift+arrowleft": function () { irPara(T - 1); }, "shift+arrowright": function () { irPara(T + 1); },
      "home": function () { irPara(0); $("veRolo").scrollLeft = 0; }, "end": function () { irPara(total()); },
      "delete": function () { if (!SEL) return false; apagar(false); }, "shift+delete": function () { if (!SEL) return false; apagar(true); },
      "ctrl+k": function () { return dividir.apply(this, arguments); }, "ctrl+z": desfazer, "ctrl+shift+z, ctrl+y": refazer, "ctrl+c": function () { return copiar(); }, "ctrl+v": function () { return colar.apply(this, arguments); }, "ctrl+shift+c": function () { return copiarAtrib(); }, "ctrl+shift+v": function () { return colarAtrib(); },
      "q": function () { aparar("ini"); }, "w": function () { aparar("fim"); }, "shift+e": function () { return ligarDesligar(); },
      "ctrl+shift+/, ctrl+shift+d": function () { return duplicar.apply(this, arguments); }, "ctrl+d": function () { var c = sel(); if (!c || c.tipo === "audio" || c.tipo === "texto") return false; c.trans = {tipo: "dissolver", dur: 0.6}; tudo(); aviso("Ctrl+D: transição Dissolver no início do clipe" + (anteriorDe(c) ? "." : " (encoste-o no fim de outro clipe).")); },
      "=, shift+=, ctrl+=": function () { zoomEm(1.4); }, "-, ctrl+-": function () { zoomEm(1 / 1.4); }, "\\": encaixarTudo,
      "ctrl+s": function () { guardar(); aviso("✓ Salvo neste aparelho (o editor também salva sozinho)."); }, "ctrl+m, ctrl+e": exportar, "ctrl+i": function () { $("veArq").click(); },
      "escape": function () { if (!SEL) return false; SEL = null; desenharTL(); desenharProp(); }
    });
    BWFerr.ajuda("ATALHOS DO EDITOR DE VÍDEO", [["#", "TOCAR E NAVEGAR"], ["Espaço / K", "tocar / pausar"], ["L", "tocar"], ["J", "voltar 1 s"], ["← / →", "um quadro para trás / frente"], ["Shift+← / Shift+→", "1 segundo"], ["Home / End", "início / fim"],
      ["#", "EDITAR"], ["Ctrl+K", "cortar na agulha (o clipe escolhido, ou tudo o que está na agulha)"], ["Delete", "apagar o clipe"], ["Shift+Delete", "apagar e fechar o espaço"], ["Ctrl+C / Ctrl+V", "copiar / colar na agulha"], ["Ctrl+Shift+C / Ctrl+Shift+V", "copiar os AJUSTES de um take / colar em outro"], ["Q / W", "cortar o começo / o fim do take até a agulha"], ["Shift+E", "desativar / ativar o take"],
      ["Ctrl+Shift+D", "duplicar"], ["Ctrl+D", "transição Dissolver no clipe"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"], ["Botão direito", "opções do clipe (no celular: segure o dedo)"],
      ["#", "LINHA DO TEMPO E ARQUIVO"], ["= / -", "aproximar / afastar"], ["\\", "caber o vídeo inteiro"], ["Ctrl+roda do mouse", "zoom onde está o mouse"], ["Ctrl+I", "importar mídia"], ["Ctrl+S", "salvar"], ["Ctrl+M", "exportar o vídeo"], ["?", "esta lista"]]);
    // MENU DO CLIPE (botão direito / segurar o dedo)
    BWFerr.contexto($("veFaixas"), "[data-clip]", function (el) { var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return [];
      if (SEL !== c.id) { SEL = c.id; desenharTL(); desenharProp(); }
      var vis = c.tipo !== "audio" && c.tipo !== "texto", itens = [
        {icone: "✂", rot: "Cortar na agulha", tecla: "Ctrl+K", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { return dividir.apply(this, arguments); }},
        {icone: "⧉", rot: "Duplicar", tecla: "Ctrl+Shift+D", fn: function () { return duplicar.apply(this, arguments); }}, {icone: "⎘", rot: "Copiar", tecla: "Ctrl+C", fn: copiar}, {icone: "📋", rot: "Colar na agulha", tecla: "Ctrl+V", off: !COPIA, fn: function () { return colar.apply(this, arguments); }}];
      itens.push({icone: "⇤", rot: "Cortar o começo até a agulha", tecla: "Q", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { aparar("ini"); }}, {icone: "⇥", rot: "Cortar o fim na agulha", tecla: "W", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { aparar("fim"); }},
        "-", {icone: "🎚", rot: "Copiar ajustes", tecla: "Ctrl+Shift+C", fn: copiarAtrib}, {icone: "🖌", rot: "Colar ajustes", tecla: "Ctrl+Shift+V", off: !ATRIB || ATRIB.id === c.id, fn: function () { return colarAtrib.apply(this, arguments); }},
        {icone: c.off ? "👁" : "🚫", rot: c.off ? "Ativar o take" : "Desativar o take", tecla: "Shift+E", fn: ligarDesligar});
      if (temImg(c) && window.BWCor) itens.push({icone: "🎨", rot: "Cor", sub: [{rot: "Original" + (!BWCor.ativo(c.grade) ? "  ✓" : ""), fn: function () { delete c.grade; c.look = ""; tudo(); }}].concat(Object.keys(BWCor.LOOKS).map(function (k) { return {rot: BWCor.LOOKS[k].nome + (c.look === k && BWCor.ativo(c.grade) ? "  ✓" : ""), fn: function () { c.grade = JSON.parse(JSON.stringify(BWCor.LOOKS[k].g)); c.look = k; tudo(); }}; }))
        .concat([{rot: "⇉ Aplicar esta cor em todos os takes", off: !BWCor.ativo(c.grade), fn: function () { corEmTodos(c); }}, {rot: "Abrir os ajustes de cor…", fn: function () { abrirGrupo("ve-cor"); }}])});
      if (temSom(c)) { var vv = c.vol == null ? 100 : c.vol; itens.push({icone: "🔊", rot: "Som do take", sub: [
        {rot: vv === 0 ? "Devolver o som (100%)" : "Silenciar", fn: function () { c.vol = vv === 0 ? 100 : 0; tudo(); }},
        {rot: "Volume 50%" + (vv === 50 ? "  ✓" : ""), fn: function () { c.vol = 50; tudo(); }}, {rot: "Volume 100%" + (vv === 100 ? "  ✓" : ""), fn: function () { c.vol = 100; tudo(); }}, {rot: "Volume 150%" + (vv === 150 ? "  ✓" : ""), fn: function () { c.vol = 150; tudo(); }},
        {rot: "Entrada suave 0,5 s" + (c.fin >= 0.5 ? "  ✓" : ""), fn: function () { c.fin = c.fin >= 0.5 ? 0 : 0.5; tudo(); }}, {rot: "Saída suave 0,5 s" + (c.fout >= 0.5 ? "  ✓" : ""), fn: function () { c.fout = c.fout >= 0.5 ? 0 : 0.5; tudo(); }},
        {rot: "🔊 Normalizar volume" + (c.normG ? "  ✓" : ""), fn: function () { normalizar(c); }}, {rot: "Reduzir ruído" + (c.ruido ? "  ✓" : ""), fn: function () { c.ruido = c.ruido ? 0 : 2; tudo(); }}, {rot: "Realçar voz" + (c.voz ? "  ✓" : ""), fn: function () { c.voz = c.voz ? 0 : 1; tudo(); }}]
        .concat(c.tipo === "video" ? [{rot: "🎵 Extrair áudio", fn: function () { extrairAudio(c); }}] : []).concat([{rot: "Abrir os ajustes de som…", fn: abrirSom}])}); }
      itens.push("-");
      if (c.tipo !== "texto") itens.push({icone: "⇄", rot: "Substituir mídia…", fn: function () { substituir(c); }});
      if (c.tipo === "video" || c.tipo === "audio") itens.push({icone: "⏩", rot: "Velocidade (" + String(vel(c)).replace(".", ",") + "×)", sub: VELS.map(function (v) { return {rot: String(v).replace(".", ",") + "×" + (v === vel(c) ? "  ✓" : ""), fn: function () { mudarVel(c, v); }}; })});
      if (c.tipo === "video") itens.push({icone: "❄", rot: "Congelar quadro na agulha", fn: congelar});
      if (vis) { itens.push({icone: "◧", rot: "Transição de entrada", sub: [{rot: "Corte seco", fn: function () { c.trans = null; tudo(); }}].concat(Object.keys(TRANS).map(function (k) { return {rot: TRANS[k] + (c.trans && c.trans.tipo === k ? "  ✓" : ""), fn: function () { c.trans = {tipo: k, dur: (c.trans && c.trans.dur) || 0.6}; tudo(); verTransicao(c); }}; }))});
        itens.push({icone: "✦", rot: "Efeito", sub: [{rot: "Nenhum", fn: function () { c.efeito = ""; tudo(); }}].concat(Object.keys(EFEITOS).map(function (k) { return {rot: EFEITOS[k] + (c.efeito === k ? "  ✓" : ""), fn: function () { c.efeito = k; if (c.efInt == null) c.efInt = 85; tudo(); }}; }))});
        if (c.trilha === "v1" || c.trilha === "v2") itens.push({icone: c.trilha === "v1" ? "⬆" : "⬇", rot: c.trilha === "v1" ? "Levar para SOBREPOSIÇÃO" : "Levar para VÍDEO", fn: function () { c.trilha = c.trilha === "v1" ? "v2" : "v1"; tudo(); }}); }
      itens.push("-", {icone: "🗑", rot: "Apagar", tecla: "Delete", perigo: true, fn: function () { apagar(false); }}, {icone: "⇤", rot: "Apagar e fechar o espaço", tecla: "Shift+Delete", perigo: true, fn: function () { apagar(true); }});
      return {itens: itens, titulo: (c.tipo === "texto" ? "TEXTO" : c.tipo === "audio" ? "SOM" : c.tipo === "imagem" ? "IMAGEM" : "VÍDEO").toUpperCase()}; });
    // MENU DA MÍDIA (biblioteca)
    BWFerr.contexto($("veLib"), "[data-mid]", function (el) { var m = MID[el.dataset.mid]; if (!m) return []; var c = sel();
      return {titulo: m.nome.slice(0, 30).toUpperCase(), itens: [
        {icone: "＋", rot: "Pôr na linha do tempo", fn: function () { addClip(m); }},
        {icone: "⤓", rot: m.tipo === "audio" ? "Pôr na agulha (EFEITOS)" : "Pôr na agulha (SOBREPOSIÇÃO)", fn: function () { addClip(m, m.tipo === "audio" ? "a2" : "v2"); }},
        {icone: "⇄", rot: "Trocar o clipe escolhido por esta", off: !c || c.tipo === "texto" || (c.tipo === "audio") !== (m.tipo === "audio"), fn: function () { soltarEl(c.id); c.mid = m.id; c.tipo = m.tipo; c.corte = 0; c.dur = Math.min(c.dur, maxDur(c)); tudo(); aviso("Clipe trocado por " + m.nome + "."); }},
        "-", {icone: "🗑", rot: "Tirar da biblioteca", perigo: true, fn: function () { var x = el.querySelector("[data-del]"); if (x) x.click(); }}]}; });
  }
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); var fs = [].slice.call((e.dataTransfer && e.dataTransfer.files) || []); if (fs.length) importar(fs); });
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var u = null; try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; u = s && s.data && s.data.session && s.data.session.user; } catch (e) {}
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();

  /* celular: a prévia fica presa no topo — a página reserva a altura dela (e a das abas de baixo) ao rolar até um botão (regras 52 e 71) */
  if (window.BWFerr && !APP) BWFerr.telaFixa({wrap: document.querySelector(".wrap"), grade: document.querySelector(".ve-grade"), palco: document.querySelector(".ve-palco"), rola: [document.querySelector(".ve-tl")], soltos: [document.querySelector(".ve-tl")], painelLer: function () { return JSON.parse(localStorage.getItem("ui_ve_paineis") || "{}"); }, painelGravar: function (S) { localStorage.setItem("ui_ve_paineis", JSON.stringify(S)); }, alturaPropria: true, some: [document.querySelector(".wrap > .ve-nota")],
    aviso: $("veAviso"), aoMedir: function (cel) { var pal = document.querySelector(".ve-palco"); cv.style.maxHeight = cel ? "" : Math.max(140, pal.clientHeight - 84) + "px"; }});
  /* ---------- 21/11 — layout: painéis que recolhem, tela grande, divisa arrastável, camadas só com conteúdo ---------- */
  (function () {
    var grade = $("veGrade"), wrap = document.querySelector(".wrap"), tl = $("veTl"), div = $("veDiv"), V = {esq: true, dir: true, tl: 0, todas: false, we: 0, wd: 0, min: false, solto: {}}, grande = false, PAINEL = {esq: "veEsq", dir: "veProp"};
    try { var g0 = JSON.parse(localStorage.getItem("ui_ve_vista") || "null"); if (g0) { V.esq = g0.esq !== false; V.dir = g0.dir !== false; V.tl = +g0.tl || 0; V.todas = !!g0.todas; V.we = +g0.we || 0; V.wd = +g0.wd || 0; V.min = !!g0.min; V.solto = g0.solto && typeof g0.solto === "object" ? g0.solto : {}; } } catch (e) {}
    function lembrar() { try { localStorage.setItem("ui_ve_vista", JSON.stringify(V)); } catch (e) {} }
    function aplicar() {
      var e = V.esq && !grande, d = V.dir && !grande; grade.classList.toggle("sem-esq", !e || !!V.solto.esq); grade.classList.toggle("sem-dir", !d || !!V.solto.dir);
      ["esq", "dir"].forEach(function (k) { var el = $(PAINEL[k]), so = V.solto[k], ver = k === "esq" ? e : d; el.classList.toggle("ve-solto", !!so); el.classList.toggle("ve-oculto", !!so && !ver);
        if (so) { var w = lim(so.w || 320, 200, innerWidth - 20), hh = lim(so.h || 420, 150, innerHeight - 20); el.style.width = w + "px"; el.style.height = hh + "px"; el.style.left = lim(so.x, 0, Math.max(0, innerWidth - 80)) + "px"; el.style.top = lim(so.y, 0, Math.max(0, innerHeight - 40)) + "px"; }
        else { el.style.width = el.style.height = el.style.left = el.style.top = ""; }
        var bs = el.querySelector("[data-solta]"); if (bs) bs.textContent = so ? "⇲" : "⇱"; }); wrap.classList.toggle("ve-grande", grande); tl.classList.toggle("todas", V.todas);
      wrap.style.setProperty("--ve-tl-h", V.tl ? V.tl + "px" : "auto"); if (V.we) wrap.style.setProperty("--ve-esq", V.we + "px"); else wrap.style.removeProperty("--ve-esq"); if (V.wd) wrap.style.setProperty("--ve-dir", V.wd + "px"); else wrap.style.removeProperty("--ve-dir");
      tl.classList.toggle("min", V.min && !grande); $("veTlMin").setAttribute("aria-pressed", V.min); $("veTlMin").textContent = (V.min ? "▸" : "▾") + " LINHA DO TEMPO"; wrap.style.setProperty("--ve-tl-max", V.tl ? "70vh" : "36vh");
      $("veTogEsq").setAttribute("aria-pressed", e); $("veTogDir").setAttribute("aria-pressed", d); $("veCheia").setAttribute("aria-pressed", grande); $("veTodas").setAttribute("aria-pressed", V.todas); $("veTodas").classList.toggle("on", V.todas);
      window.dispatchEvent(new Event("resize")); desenhar();
    }
    $("veTogEsq").addEventListener("click", function () { if (grande) { grande = false; V.esq = true; } else V.esq = !V.esq; lembrar(); aplicar(); });
    $("veTogDir").addEventListener("click", function () { if (grande) { grande = false; V.dir = true; } else V.dir = !V.dir; lembrar(); aplicar(); });
    $("veCheia").addEventListener("click", function () { grande = !grande; aplicar(); if (grande) aviso("TELA GRANDE — toque em ⛶ ou aperte Esc para voltar."); });
    $("veTodas").addEventListener("click", function () { V.todas = !V.todas; lembrar(); aplicar(); });
    /* DESCOLAR: o painel vira uma janela solta — arrasta pela barrinha ⠿, estica pelo canto, ⇲ encaixa de novo */
    grade.addEventListener("click", function (e) { var b = e.target.closest("[data-solta],[data-some]"); if (!b) return; var k = b.dataset.solta || b.dataset.some;
      if (b.dataset.some) { V[k] = false; lembrar(); aplicar(); return; }
      if (V.solto[k]) delete V.solto[k]; else { var r = $(PAINEL[k]).getBoundingClientRect(); V.solto[k] = {x: Math.round(r.left + (k === "esq" ? 24 : -24)), y: Math.round(r.top + 24), w: Math.round(Math.max(260, r.width)), h: Math.round(Math.min(r.height, innerHeight * 0.7))}; }
      lembrar(); aplicar(); });
    var mv = null;
    grade.addEventListener("pointerdown", function (e) { var pg = e.target.closest(".ve-pega"); if (!pg || e.target.closest("button")) return; var k = pg.dataset.pega; if (!V.solto[k]) return; mv = {k: k, x: e.clientX, y: e.clientY, x0: V.solto[k].x, y0: V.solto[k].y}; try { pg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    grade.addEventListener("pointermove", function (e) { if (!mv) return; var so = V.solto[mv.k], el = $(PAINEL[mv.k]); so.x = Math.round(lim(mv.x0 + e.clientX - mv.x, 0, innerWidth - 80)); so.y = Math.round(lim(mv.y0 + e.clientY - mv.y, 0, innerHeight - 40)); el.style.left = so.x + "px"; el.style.top = so.y + "px"; });
    var fimMv = function () { if (!mv) return; mv = null; lembrar(); }; grade.addEventListener("pointerup", fimMv); grade.addEventListener("pointercancel", fimMv);
    grade.addEventListener("dblclick", function (e) { var pg = e.target.closest(".ve-pega"); if (!pg || e.target.closest("button")) return; var k = pg.dataset.pega; if (V.solto[k]) { delete V.solto[k]; lembrar(); aplicar(); } });
    /* a prévia acompanha o palco: camada nova na linha do tempo, coluna arrastada, painel escondido — tudo muda a altura dele */
    if (window.ResizeObserver) { var palcoEl = document.querySelector(".ve-palco"); new ResizeObserver(function () { if (wrap.classList.contains("bwf-fixo") && !wrap.classList.contains("bwf-cel")) cv.style.maxHeight = Math.max(140, palcoEl.clientHeight - 84) + "px"; }).observe(palcoEl); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(function (l) { l.forEach(function (x) { var k = x.target.id === "veEsq" ? "esq" : "dir", so = V.solto[k]; if (!so || !x.target.getClientRects().length) return; var r = x.target.getBoundingClientRect(); if (Math.abs(r.width - so.w) > 2 || Math.abs(r.height - so.h) > 2) { so.w = Math.round(r.width); so.h = Math.round(r.height); lembrar(); } }); }); ro.observe($("veEsq")); ro.observe($("veProp")); }
    /* CRIAR: no PC a caixa não ocupa lugar — abre pelo botão ✦ CRIAR da MÍDIA e fecha de novo */
    $("veCriarBt").addEventListener("click", function () { var ab = $("veEsq").classList.toggle("criar"); this.setAttribute("aria-expanded", ab); this.classList.toggle("on", ab); if (ab) { var c = $("veCriar"), d0 = c.querySelector("[data-seta]"); if (d0 && c.querySelector(".ve-ferr") && !c.querySelector(".ve-ferr").offsetParent) d0.click(); c.scrollIntoView({block: "nearest"}); } });
    $("veTlMin").addEventListener("click", function () { V.min = !V.min; lembrar(); aplicar(); });
    /* largura das colunas: arrastar a beirada da prévia; puxar até o fim esconde o painel */
    [["vePuxaE", "esq", "we", "veEsq", 1], ["vePuxaD", "dir", "wd", "veProp", -1]].forEach(function (q) {
      var p = $(q[0]), a2 = null;
      p.addEventListener("pointerdown", function (e) { var alvo = $(q[3]); a2 = {x: e.clientX, w: V[q[1]] ? alvo.getBoundingClientRect().width : 0}; if (!V[q[1]]) { V[q[1]] = true; V[q[2]] = 140; } p.classList.add("on"); try { p.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
      p.addEventListener("pointermove", function (e) { if (!a2) return; var w = Math.round(a2.w + (e.clientX - a2.x) * q[4]); if (w < 130) { V[q[1]] = false; } else { V[q[1]] = true; V[q[2]] = Math.min(w, Math.round(grade.clientWidth * 0.45)); } aplicar(); });
      var fim = function () { if (!a2) return; a2 = null; p.classList.remove("on"); lembrar(); };
      p.addEventListener("pointerup", fim); p.addEventListener("pointercancel", fim);
      p.addEventListener("dblclick", function () { V[q[2]] = 0; V[q[1]] = true; lembrar(); aplicar(); });
    });
    /* PRÉVIA EM OUTRA TELA: janela só com a prévia (a mesma imagem, ao vivo) para arrastar ao segundo monitor e pôr em tela cheia */
    var JAN = null;
    /* 2º monitor: com a permissão "gerenciar janelas" (Chrome/Edge e o app BW) a janela já nasce do tamanho do OUTRO monitor */
    async function outraTela() { try { if (!window.getScreenDetails) return null; var sd = await window.getScreenDetails(), at = sd.currentScreen, outra = sd.screens.filter(function (x) { return x !== at && !(x.left === at.left && x.top === at.top); })[0]; return outra || null; } catch (e) { return null; } }
    $("veSegunda").addEventListener("click", async function () {
      if (JAN && !JAN.closed) { JAN.close(); JAN = null; $("veSegunda").setAttribute("aria-pressed", "false"); return; }
      if (!cv.captureStream) { aviso("Este navegador não abre a prévia em outra janela.", true); return; }
      var tela2 = await outraTela(), pos = tela2 ? "popup=1,left=" + tela2.availLeft + ",top=" + tela2.availTop + ",width=" + tela2.availWidth + ",height=" + tela2.availHeight : "popup=1,width=960,height=600";
      JAN = window.open("", "bwPrevia", pos); if (!JAN) { aviso("O navegador bloqueou a janela — libere pop-ups para este site e toque de novo.", true); return; }
      var d = JAN.document; d.title = "Prévia — Brightway"; d.body.style.cssText = "margin:0;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden";
      var v = d.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.style.cssText = "max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain"; d.body.appendChild(v);
      var b2 = d.createElement("button"); b2.textContent = "⛶ TELA CHEIA (ou duplo clique)"; b2.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;border:1px solid #555;background:#12151c;color:#fff;font:700 13px sans-serif;cursor:pointer"; d.body.appendChild(b2);
      var cheia = function () { var el = d.documentElement; if (d.fullscreenElement) d.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); };
      b2.onclick = cheia; v.ondblclick = cheia; d.addEventListener("fullscreenchange", function () { b2.style.display = d.fullscreenElement ? "none" : ""; });
      try { v.srcObject = cv.captureStream(30); v.play().catch(function () {}); } catch (e) { aviso("Não consegui mandar a prévia para a outra janela.", true); }
      /* teclas na janela da prévia comandam o editor: Espaço toca/pausa, ← → anda, Home volta ao início */
      d.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "k") { e.preventDefault(); $("vePlay").click(); } else if (e.key === "ArrowLeft") irPara(T - (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "ArrowRight") irPara(T + (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "Home") irPara(0); else if (e.key === "f") cheia(); });
      $("veSegunda").setAttribute("aria-pressed", "true"); desenhar(); aviso(tela2 ? "🖥 Prévia aberta no outro monitor — toque em TELA CHEIA lá (Espaço toca e pausa)." : "🖥 Prévia aberta em outra janela — arraste para o segundo monitor e toque em TELA CHEIA lá (Espaço toca e pausa).");
      var vigia = setInterval(function () { if (!JAN || JAN.closed) { clearInterval(vigia); JAN = null; $("veSegunda").setAttribute("aria-pressed", "false"); } }, 800);
    });
    window.addEventListener("pagehide", function () { if (JAN && !JAN.closed) JAN.close(); });
    var bc = $("veCelular"); if (bc) bc.addEventListener("click", function () { if (window.BWControle) BWControle.painel(window.__video); else aviso("O controle pelo celular não carregou (sem internet?).", true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && grande && !document.querySelector(".bwf-menu,.bwf-ajuda")) { grande = false; aplicar(); } });
    var arr = null;
    div.addEventListener("pointerdown", function (e) { arr = {y: e.clientY, h: tl.getBoundingClientRect().height}; div.classList.add("on"); try { div.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    div.addEventListener("pointermove", function (e) { if (!arr) return; V.tl = Math.round(lim(arr.h + (arr.y - e.clientY), 96, innerHeight * 0.7)); aplicar(); });
    function soltar() { if (!arr) return; arr = null; div.classList.remove("on"); lembrar(); }
    div.addEventListener("pointerup", soltar); div.addEventListener("pointercancel", soltar);
    div.addEventListener("dblclick", function () { V.tl = 0; lembrar(); aplicar(); });
    window.__veVista = {mostrar: function (k) { if (!V[k]) { V[k] = true; lembrar(); aplicar(); } }, estado: function () { return {esq: V.esq, dir: V.dir, tl: V.tl, todas: V.todas, grande: grande, we: V.we, wd: V.wd, min: V.min, solto: JSON.parse(JSON.stringify(V.solto))}; }, aoSelecionar: function () { if (!V.dir && !grande) { V.dir = true; aplicar(); } }};
    aplicar();
  })();
  function reservar() { var m = window.matchMedia("(max-width:1100px)").matches, h = document.documentElement.style; h.scrollPaddingTop = m ? (document.querySelector(".ve-palco").offsetHeight + 10) + "px" : ""; h.scrollPaddingBottom = m ? "90px" : ""; }
  window.addEventListener("resize", reservar); reservar();
  /* ---------- começo: volta o que estava aberto ---------- */
  (async function () {
    var ms = (await tx("midias", "readonly", function (s) { return s.getAll(); })) || [];
    for (var i = 0; i < ms.length; i++) { try { var mm = await porMidia(ms[i].blob, ms[i].nome, ms[i].tipo, ms[i].id, ms[i].dur); if (ms[i].cr) { mm.cr = ms[i].cr; mm.crCriado = ms[i].crCriado; mm.criacao = true; } } catch (e) {} }
    var st = await tx("estado", "readonly", function (s) { return s.get("atual"); });
    if (st && st.p && Array.isArray(st.p.clips)) { P = st.p; for (var k = 0; k < P.clips.length; k++) { var c = P.clips[k]; if (c.mid && !MID[c.mid] && c.mid.indexOf("som-") === 0) { var ix = SONS.map(function (s) { return "som-" + s[1].toLowerCase().replace(/\s+/g, "-"); }).indexOf(c.mid); if (ix >= 0) await porSom(ix); } }
      if (window.VEModelos && VEModelos.garantir) { try { await VEModelos.garantir(P); } catch (e) {} }   /* espaços e música de modelo são refeitos (não ficam guardados) */
      P.clips = P.clips.filter(function (c) { return c.tipo === "texto" || MID[c.mid]; }); }
    formato(); desenharFerramentas(); desenharLib(); desenharTL(); desenharProp(); desenhar(); window.__veProntoOk = true;
    if (window.BWMascara) BWMascara.carregar(Object.keys(MID)).then(function () { desenharProp(); desenhar(); });
    await chegouCriacao();
  })();
  /* 22/11: cada AÇÃO de botão/tecla (aparar, dividir, duplicar, apagar, colar, pôr take/texto) é um passo próprio do desfazer — antes, duas ações
     feitas em menos de 0,3 s viravam um passo só e o ↶ desfazia as duas (o histórico que espera é para arrastes, não para cliques) */
  [["aparar", function (f) { aparar = f; }, function () { return aparar; }], ["dividir", function (f) { dividir = f; }, function () { return dividir; }],
   ["duplicar", function (f) { duplicar = f; }, function () { return duplicar; }], ["apagar", function (f) { apagar = f; }, function () { return apagar; }],
   ["colar", function (f) { colar = f; }, function () { return colar; }], ["colarAtrib", function (f) { colarAtrib = f; }, function () { return colarAtrib; }],
   ["addClip", function (f) { addClip = f; }, function () { return addClip; }], ["addTexto", function (f) { addTexto = f; }, function () { return addTexto; }]].forEach(function (q) {
    var orig = q[2](); q[1](function () { gravarHist(); var r = orig.apply(this, arguments); gravarHist(); return r; }); });
  window.__video = {porMidia: porMidia, tudo: function () { tudo(); }, desenharLib: desenharLib, guardarJa: function () { return tx("estado", "readwrite", function (s) { return s.put({id: "atual", p: JSON.parse(JSON.stringify(P))}); }); },
    trocarProjeto: function (np) { parar(); Object.keys(EL).forEach(soltarEl); P = np; SEL = null; T = 0; formato(); desenharLib(); tudo(); },
    backup: function () { return tx("estado", "readwrite", function (s) { return s.put({id: "anterior", p: JSON.parse(JSON.stringify(P))}); }); },
    anterior: function () { return new Promise(function (ok) { db().then(function (d) { var q = d.transaction("estado").objectStore("estado").get("anterior"); q.onsuccess = function () { ok(q.result && q.result.p); }; q.onerror = function () { ok(null); }; }); }); },
    preencherSozinho: preencherSozinho, trocarEspaco: trocarEspaco, analisarPessoa: function (id) { var c = P.clips.filter(function (x) { return x.id === id; })[0]; return c ? analisarPessoa(c) : null; }, selAtual: function () { return sel(); }, aviso: aviso, cv: function () { return cv; },
    P: function () { return P; }, MID: MID, trazerCriacao: trazerCriacao, editarNaOrigem: editarNaOrigem, importar: importar, addClip: function () { return addClip.apply(this, arguments); }, addTexto: function () { return addTexto.apply(this, arguments); }, porSom: porSom, irPara: irPara, tocar: tocar, parar: parar, total: total, sel: function (id) { SEL = id; tudo(); }, exportar: exportar, tipoGravacao: tipoGravacao, T: function () { return T; }, tocando: function () { return TOCANDO; }, desenhar: desenhar, dividir: function () { return dividir.apply(this, arguments); }, sintetizar: sintetizar, congelar: congelar, mudarVel: mudarVel, desfazer: desfazer, refazer: refazer, pps: function () { return PPS; }, TRANS: TRANS, EFEITOS: EFEITOS};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
