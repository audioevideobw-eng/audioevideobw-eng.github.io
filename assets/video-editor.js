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
  var TRILHAS = [["v2", "SOBREPOSIÇÃO", "#B14DFF"], ["v1", "VÍDEO", "#7C5CFF"], ["tx", "TEXTO", "#22B8CF"], ["a1", "TRILHA", "#12B76A"], ["a2", "EFEITOS", "#F5A524"]];
  var COR = {}; TRILHAS.forEach(function (t) { COR[t[0]] = t[2]; });
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
  function aviso(t, erro) { var a = $("veAviso"); a.hidden = !t; a.className = "ve-aviso" + (erro ? " erro" : ""); a.textContent = t || ""; }
  function fmtT(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ","); }
  function total() { return P.clips.reduce(function (m, c) { return Math.max(m, c.ini + c.dur); }, 0); }

  /* ---------- mídia ---------- */
  function tipoDe(f) { var t = f.type || ""; if (/^video\//.test(t)) return "video"; if (/^audio\//.test(t)) return "audio"; if (/^image\//.test(t)) return "imagem"; var n = (f.name || "").toLowerCase(); return /\.(mp4|mov|webm|m4v)$/.test(n) ? "video" : /\.(mp3|wav|m4a|ogg|aac)$/.test(n) ? "audio" : /\.(png|jpe?g|webp|gif)$/.test(n) ? "imagem" : ""; }
  function duracaoDe(url, tipo) { return new Promise(function (ok) { if (tipo === "imagem") return ok(4); var e = document.createElement(tipo === "video" ? "video" : "audio"), fim = function (d) { ok(isFinite(d) && d > 0 ? d : 5); }; e.preload = "metadata"; e.muted = true; e.onloadedmetadata = function () { if (e.duration === Infinity) { e.currentTime = 1e7; e.ontimeupdate = function () { e.ontimeupdate = null; fim(e.duration); }; } else fim(e.duration); }; e.onerror = function () { fim(0); }; setTimeout(function () { fim(e.duration); }, 4000); e.src = url; }); }
  function capa(m) { return new Promise(function (ok) {
    if (m.tipo === "imagem") { var im = new Image(); im.onload = function () { m.img = im; ok(); }; im.onerror = function () { ok(); }; im.src = m.url; return; }
    if (m.tipo !== "video") return ok();
    var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; var feito = false, fim = function () { if (feito) return; feito = true; try { var c = document.createElement("canvas"); c.width = 160; c.height = Math.max(1, Math.round(160 * (v.videoHeight || 9) / (v.videoWidth || 16))); c.getContext("2d").drawImage(v, 0, 0, c.width, c.height); m.capa = c.toDataURL("image/jpeg", 0.7); } catch (e) {} ok(); };
    v.onloadeddata = function () { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); } catch (e) { fim(); } }; v.onseeked = fim; v.onerror = fim; setTimeout(fim, 3000); v.src = m.url; }); }
  async function porMidia(blob, nome, tipo, id, durFixa) {
    var m = {id: id || uid("m"), nome: String(nome || "arquivo").slice(0, 60), tipo: tipo, blob: blob, url: URL.createObjectURL(blob)};
    m.dur = durFixa || await duracaoDe(m.url, tipo); await capa(m); MID[m.id] = m;
    if (!id) await tx("midias", "readwrite", function (s) { return s.put({id: m.id, nome: m.nome, tipo: m.tipo, blob: blob, dur: m.dur}); });
    return m;
  }
  async function importar(files) {
    var n = 0, fora = 0;
    for (var i = 0; i < files.length; i++) { var f = files[i], t = tipoDe(f); if (!t) { fora++; continue; }
      try { await porMidia(new Blob([await f.arrayBuffer()], {type: f.type}), f.name, t); n++; } catch (e) { fora++; } }   /* cópia na memória na hora (o iPhone invalida o original) */
    desenharLib(); aviso(n ? n + " arquivo(s) na biblioteca. Toque neles para pôr na linha do tempo." + (fora ? " " + fora + " não é vídeo, imagem nem áudio." : "") : "Esse arquivo não é vídeo, imagem nem áudio.", !n);
  }
  async function criacoes() {   /* imagens criadas no QUADRO DE HISTÓRIA e os personagens com imagem (mesmo aparelho) */
    var n = 0;
    try { var lista = await new Promise(function (ok) { var r = indexedDB.open("bw_reels"); r.onsuccess = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) { d.close(); return ok([]); } var q = d.transaction("midias").objectStore("midias").getAll(); q.onsuccess = function () { d.close(); ok(q.result || []); }; q.onerror = function () { d.close(); ok([]); }; }; r.onerror = function () { ok([]); }; });
      for (var i = 0; i < lista.length; i++) { var x = lista[i]; if (!x.blob || !(x.tipo === "imagem" || x.tipo === "video")) continue; var id = "cr-" + x.id; if (MID[id]) continue; var m = await porMidia(x.blob, x.projeto === "__quadro" ? "Quadro · " + (x.nome || "cena") : (x.nome || "Reels"), x.tipo === "video" ? "video" : "imagem", id); m.criacao = true; n++; } } catch (e) {}
    try { var ps = window.BWPersonagens ? await BWPersonagens.listar() : []; for (var k = 0; k < ps.length; k++) { var p = ps[k], idp = "pe-" + p.id; if (!p.blob || MID[idp]) continue; var mp = await porMidia(p.blob, "Personagem · " + (p.nome || ""), "imagem", idp); mp.criacao = true; n++; } } catch (e) {}
    ABA = "tudo"; desenharLib(); aviso(n ? n + " criação(ões) trazida(s) do Quadro de História, do BW Reels e dos Personagens." : "Não achei criações novas neste aparelho. O que você gerou no Flux, Higgsfield ou Gemini entra pelo ＋ IMPORTAR.", !n);
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
  function addClip(m, trilha) {
    var tr = trilha || (m.tipo === "audio" ? (m.som === "sfx" ? "a2" : "a1") : "v1");
    var c = {id: uid(), trilha: tr, tipo: m.tipo, mid: m.id, ini: tr === "a2" || tr === "v2" ? Math.round(T * 10) / 10 : fimDaTrilha(tr), dur: Math.round(Math.min(m.dur, m.tipo === "imagem" ? 4 : 600) * 100) / 100, corte: 0, vel: 1, vol: 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: 0, encaixe: m.id.indexOf("pe-") === 0 ? "caber" : "cobrir"};
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
  function ligarSom(o) { if (!ACTX || o.g || !o.e || o.semSom) return; try { var s = ACTX.createMediaElementSource(o.e); o.g = ACTX.createGain(); s.connect(o.g); o.g.connect(MESTRE); } catch (e) { o.semSom = true; } }
  function elDe(c) { var o = EL[c.id]; if (o) return o; var m = MID[c.mid]; if (!m) return null; var e = document.createElement(c.tipo === "video" ? "video" : "audio"); e.preload = "auto"; e.playsInline = true; e.crossOrigin = "anonymous"; e.src = m.url; e.addEventListener("seeked", function () { if (!TOCANDO) desenhar(); }); e.addEventListener("loadeddata", function () { if (!TOCANDO) desenhar(); }); o = EL[c.id] = {e: e, g: null}; ligarSom(o); return o; }
  function soltarEl(id) { var o = EL[id]; if (!o) return; try { o.e.pause(); o.e.removeAttribute("src"); o.e.load(); } catch (e) {} delete EL[id]; }
  function fade(c, t) { var a = 1, r = t - c.ini, f = c.ini + c.dur - t; if (c.fin > 0 && r < c.fin) a = Math.min(a, r / c.fin); if (c.fout > 0 && f < c.fout) a = Math.min(a, f / c.fout); return lim(a, 0, 1); }
  function sincronizar(c, t, ativo) {
    var o = elDe(c); if (!o) return null; var e = o.e;
    if (!ativo) { if (!e.paused) e.pause(); return o; }
    var alvo = (c.corte || 0) + (t - c.ini) * vel(c), v = lim((c.vol == null ? 100 : c.vol) / 100 * fade(c, t), 0, 2);
    if (o.g) { o.g.gain.value = v; e.volume = 1; } else e.volume = Math.min(1, v);
    if (Math.abs(e.playbackRate - vel(c)) > 0.001) { try { e.playbackRate = vel(c); e.preservesPitch = true; } catch (x) {} }
    if (TOCANDO) { if (e.paused) { try { e.currentTime = alvo; } catch (x) {} var pr = e.play(); if (pr && pr.catch) pr.catch(function () {}); } else if (Math.abs(e.currentTime - alvo) > 0.35 * vel(c)) { try { e.currentTime = alvo; } catch (x) {} } }
    else { if (!e.paused) e.pause(); if (Math.abs(e.currentTime - alvo) > 0.04) { try { e.currentTime = alvo; } catch (x) {} } }
    return o;
  }
  /* camada de efeito (fora da tela): a mídia é desenhada aqui, recebe o efeito por modos de mistura e volta por cima com a intensidade escolhida */
  var EF = null, EF2 = null, GRAO = null;
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
    if (!fw || !fh) return; mod = mod || {}; var W = cv.width, H = cv.height, s = (c.encaixe === "caber" ? Math.min : Math.max)(W / fw, H / fh) * (c.esc || 100) / 100, w = fw * s, h = fh * s;
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
  function desenharTexto(c, t) {
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), linhas = String(c.txt || "").split("\n"), lh = px * 1.18;
    cx.save(); cx.globalAlpha = (c.op == null ? 100 : c.op) / 100 * fade(c, t); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H, larg = Math.max.apply(0, linhas.map(function (l) { return cx.measureText(l).width; }));
    if (larg > W * 0.92) { px = px * W * 0.92 / larg; lh = px * 1.18; cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; larg = W * 0.92; }   /* texto longo encolhe para caber na tela */
    if (c.fundo) { cx.fillStyle = c.fundo; var pd = px * 0.35; cx.beginPath(); if (cx.roundRect) cx.roundRect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2, px * 0.25); else cx.rect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2); cx.fill(); }
    else { cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = px * 0.18; cx.shadowOffsetY = px * 0.05; }
    cx.fillStyle = c.cor || "#fff"; linhas.forEach(function (l, i) { cx.fillText(l, cxm, cym + (i - (linhas.length - 1) / 2) * lh); }); cx.restore();
  }
  function fonteDe(c, t, ativo) { if (c.tipo === "imagem") { var m = MID[c.mid]; return m && m.img ? {el: m.img, w: m.img.naturalWidth, h: m.img.naturalHeight} : null; }
    var o = sincronizar(c, t, ativo); return o && c.tipo === "video" && o.e.readyState >= 2 ? {el: o.e, w: o.e.videoWidth, h: o.e.videoHeight} : null; }
  function desenhar() {
    var t = T, W = cv.width, H = cv.height; cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H);
    ["v1", "v2", "tx", "a1", "a2"].forEach(function (tr) { var pintados = {};
      P.clips.forEach(function (c) { if (c.trilha !== tr) return; var ativo = t >= c.ini && t < c.ini + c.dur;
        if (c.tipo === "texto") { if (ativo) desenharTexto(c, t); return; }
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
    $("veTempo").textContent = fmtT(T) + " / " + fmtT(total()); var ag = $("veAgulha"); if (ag) ag.style.left = (T * PPS) + "px";
  }
  var t0 = 0, p0 = 0, raf = 0;
  function passo() { if (!TOCANDO) return; T = t0 + (performance.now() - p0) / 1000; var fim = total(); if (T >= fim) { T = fim; desenhar(); parar(); if (GRAV) GRAV.fim(); return; } desenhar(); if (GRAV) GRAV.prog(T / fim); var ag = $("veAgulha"), ro = $("veRolo"); if (ag && !GRAV && (T * PPS > ro.scrollLeft + ro.clientWidth - 40)) ro.scrollLeft = T * PPS - 60; raf = requestAnimationFrame(passo); }
  function tocar() { if (TOCANDO) return; if (!P.clips.length) { aviso("Coloque um vídeo, imagem ou som na linha do tempo para tocar.", true); return; } var a = audioCtx(); if (a && a.state === "suspended") a.resume(); if (T >= total() - 0.05) T = 0; TOCANDO = true; t0 = T; p0 = performance.now(); $("vePlay").textContent = "⏸ PAUSAR"; raf = requestAnimationFrame(passo); }
  function parar() { TOCANDO = false; cancelAnimationFrame(raf); $("vePlay").textContent = "▶ TOCAR"; Object.keys(EL).forEach(function (k) { try { EL[k].e.pause(); } catch (e) {} }); desenhar(); }
  function irPara(t) { var era = TOCANDO; if (era) parar(); T = lim(t, 0, Math.max(total(), 0)); desenhar(); }

  /* ---------- telas ---------- */
  function desenharLib() {
    var abas = [["tudo", "TUDO"], ["video", "VÍDEO"], ["imagem", "IMAGEM"], ["audio", "SOM"]];
    $("veAbas").innerHTML = abas.map(function (a) { return '<button type="button" data-aba="' + a[0] + '" class="' + (ABA === a[0] ? "on" : "") + '" aria-pressed="' + (ABA === a[0]) + '">' + a[1] + '</button>'; }).join("");
    var l = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return ABA === "tudo" || m.tipo === ABA; });
    $("veLib").innerHTML = l.length ? l.map(function (m) { var mini = m.tipo === "imagem" ? '<img alt="" src="' + m.url + '">' : m.capa ? '<img alt="" src="' + m.capa + '">' : '<span class="mini" aria-hidden="true">' + (m.tipo === "audio" ? "🎵" : "🎬") + '</span>';
      return '<div class="ve-item" role="button" tabindex="0" data-mid="' + esc(m.id) + '" aria-label="Pôr ' + esc(m.nome) + ' na linha do tempo">' + mini + '<span>' + esc(m.nome) + '</span><button type="button" class="x" data-del="' + esc(m.id) + '" aria-label="Tirar ' + esc(m.nome) + ' da biblioteca">✕</button></div>'; }).join("")
      : '<p class="ve-nota" style="grid-column:1/-1;margin:0">Nada aqui ainda. Toque em ＋ IMPORTAR ou em ✨ MINHAS CRIAÇÕES.</p>';
  }
  function desenharTL() {
    var fim = Math.max(total() + 8, 20), larg = Math.ceil(fim * PPS), passoR = PPS >= 90 ? 1 : PPS >= 40 ? 2 : 5, h = '<div class="ve-regua" id="veRegua" style="width:' + larg + 'px">';
    for (var s = 0; s <= fim; s += passoR) h += '<i style="left:' + (s * PPS) + 'px">' + (s >= 60 ? Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + s % 60 : s + "s") + '</i>';
    h += "</div>";
    TRILHAS.forEach(function (tr) { h += '<div class="ve-faixa" data-trilha="' + tr[0] + '" style="width:' + larg + 'px">' + P.clips.filter(function (c) { return c.trilha === tr[0]; }).map(function (c) { var m = MID[c.mid], nome = c.tipo === "texto" ? String(c.txt || "Texto").split("\n")[0] : m ? m.nome : "arquivo que falta", mini = m && (m.tipo === "imagem" ? m.url : m.capa);
        return '<div class="ve-clip' + (c.id === SEL ? " on" : "") + '" data-clip="' + c.id + '" style="--c:' + tr[2] + ';left:' + (c.ini * PPS) + 'px;width:' + Math.max(18, c.dur * PPS) + 'px" title="' + esc(nome) + '"><i class="al e" data-al="e"></i>' + (mini ? '<img alt="" src="' + mini + '">' : "") + '<span>' + (c.tipo === "texto" ? "T · " : c.tipo === "audio" ? "♪ " : "") + esc(nome) + '</span>' + (vel(c) !== 1 ? '<b class="bd">' + String(vel(c)).replace(".", ",") + '×</b>' : "") + (c.efeito ? '<b class="bd">✦</b>' : "") + '<i class="al d" data-al="d"></i>' + (transDe(c) && anteriorDe(c) ? '<i class="tr" title="Transição: ' + esc(TRANS[c.trans.tipo]) + '" style="width:' + Math.max(10, transDe(c) * PPS) + 'px"></i>' : "") + '</div>'; }).join("") + "</div>"; });
    h += '<div class="ve-agulha" id="veAgulha" style="left:' + (T * PPS) + 'px"></div><i class="ve-lamina" id="veLamina" hidden></i>';
    $("veFaixas").innerHTML = h; $("veFaixas").style.width = larg + "px";
    $("veRot").innerHTML = "<div>TEMPO</div>" + TRILHAS.map(function (tr) { return '<div style="--c:' + tr[2] + '">' + tr[1] + "</div>"; }).join("");
  }
  function faixaR(k, rot, min, max, v, suf, passo) { return '<label><span>' + rot + '</span><input type="range" data-p="' + k + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + v + '"><output>' + v + (suf || "") + '</output></label>'; }
  function desenharProp() {
    var c = sel(), b = $("vePropCorpo"); if (!c) { b.innerHTML = '<p class="ve-nota" style="margin:0">Toque num clipe da linha do tempo para ajustar tamanho, posição, volume, entrada e saída suaves — ou o texto.</p>'; return; }
    var visual = c.tipo !== "audio", g = function (k, t, corpo, fechada) { return corpo ? '<div class="ve-g"><h4 data-seta="ve-' + k + '"' + (fechada ? ' data-seta-padrao="fechada"' : "") + '>' + t + '</h4><div>' + corpo + '</div></div>' : ""; }, h = "";
    if (c.tipo === "texto") h += g("texto", "TEXTO", '<label class="um"><span>Texto</span><textarea data-p="txt" rows="3" maxlength="200" aria-label="Texto do clipe">' + esc(c.txt) + '</textarea></label><label class="um"><span>Fonte</span><select data-p="fonte" aria-label="Fonte">' + FONTES.map(function (f) { return '<option' + (f === c.fonte ? " selected" : "") + '>' + f + '</option>'; }).join("") + '</select></label>' + faixaR("tam", "Tamanho", 2, 20, c.tam, "%", 0.5) +
      '<label class="um"><span>Cor</span><input type="color" data-p="cor" value="' + esc(c.cor || "#ffffff") + '" aria-label="Cor do texto"></label><label class="um"><span>Fundo</span><select data-p="fundo" aria-label="Fundo do texto"><option value=""' + (!c.fundo ? " selected" : "") + '>Sem fundo (sombra)</option><option value="#000000"' + (c.fundo === "#000000" ? " selected" : "") + '>Caixa preta</option><option value="#ffffff"' + (c.fundo === "#ffffff" ? " selected" : "") + '>Caixa branca</option><option value="#7C5CFF"' + (c.fundo === "#7C5CFF" ? " selected" : "") + '>Caixa roxa</option><option value="#FFB547"' + (c.fundo === "#FFB547" ? " selected" : "") + '>Caixa âmbar</option></select></label>');
    if (visual) h += g("pos", "TAMANHO E POSIÇÃO", (c.tipo !== "texto" ? '<label class="um"><span>Encaixe</span><select data-p="encaixe" aria-label="Encaixe na tela"><option value="cobrir"' + (c.encaixe !== "caber" ? " selected" : "") + '>Encher a tela</option><option value="caber"' + (c.encaixe === "caber" ? " selected" : "") + '>Mostrar inteiro</option></select></label>' + faixaR("esc", "Tamanho", 10, 300, c.esc, "%") : "") +
      faixaR("x", "Posição ↔", -60, 60, c.x || 0, "%") + faixaR("y", "Posição ↕", -60, 60, c.y || 0, "%") + faixaR("op", "Opacidade", 0, 100, c.op == null ? 100 : c.op, "%"));
    if (c.tipo === "video" || c.tipo === "audio") h += g("som", "SOM", faixaR("vol", "Volume", 0, 150, c.vol == null ? 100 : c.vol, "%"));
    if (c.tipo === "video" || c.tipo === "audio") h += g("vel", "VELOCIDADE", '<div class="ve-chips">' + VELS.map(function (v) { return '<button type="button" data-vel="' + v + '"' + (vel(c) === v ? ' class="on"' : "") + '>' + String(v).replace(".", ",") + '×</button>'; }).join("") + '</div>' + (c.tipo === "video" ? '<div class="ve-linha"><button class="ve-bt" type="button" data-acao="congelar">❄ CONGELAR QUADRO</button></div>' : ""), true);
    if (visual && c.tipo !== "texto") { var tt = c.trans && c.trans.tipo || "";
      h += g("trans", "TRANSIÇÃO DE ENTRADA", (anteriorDe(c) ? "" : '<p class="ve-nota" style="margin:0 0 6px">Encoste este clipe no fim de outro (mesma camada) para a transição aparecer.</p>') + '<div class="ve-chips">' + '<button type="button" data-trans=""' + (!tt ? ' class="on"' : "") + '>Corte seco</button>' + Object.keys(TRANS).map(function (k) { return '<button type="button" data-trans="' + k + '"' + (tt === k ? ' class="on"' : "") + '>' + TRANS[k] + '</button>'; }).join("") + '</div>' + (tt ? faixaR("transDur", "Duração", 0.2, 2, (c.trans.dur || 0.6), " s", 0.1) : ""), true);
      h += g("efeito", "EFEITO", '<div class="ve-chips"><button type="button" data-efeito=""' + (!c.efeito ? ' class="on"' : "") + '>Nenhum</button>' + Object.keys(EFEITOS).map(function (k) { return '<button type="button" data-efeito="' + k + '"' + (c.efeito === k ? ' class="on"' : "") + '>' + EFEITOS[k] + '</button>'; }).join("") + '</div>' + (c.efeito ? faixaR("efInt", "Intensidade", 0, 100, c.efInt == null ? 85 : c.efInt, "%") : ""), true); }
    h += g("tempo", "TEMPO E CAMADA", faixaR("fin", "Entra suave", 0, 3, c.fin || 0, " s", 0.1) + faixaR("fout", "Sai suave", 0, 3, c.fout || 0, " s", 0.1) + faixaR("dur", "Duração", 0.2, Math.min(120, Math.round(maxDur(c) * 10) / 10), Math.round(c.dur * 10) / 10, " s", 0.1) +
      (visual ? '<label class="um"><span>Camada</span><select data-p="trilha" aria-label="Camada do clipe">' + (c.tipo === "texto" ? '<option value="tx" selected>Texto</option>' : '<option value="v1"' + (c.trilha === "v1" ? " selected" : "") + '>Vídeo (embaixo)</option><option value="v2"' + (c.trilha === "v2" ? " selected" : "") + '>Sobreposição (em cima)</option>') + '</select></label>' : ""), c.tipo === "texto");
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
  $("veTexto").onclick = addTexto;
  $("veSons").onclick = function () { ABA = "audio"; var b = $("veLib"); desenharLib(); b.insertAdjacentHTML("afterbegin", SONS.map(function (s, i) { return '<div class="ve-item" role="button" tabindex="0" data-som="' + i + '" aria-label="Pôr ' + s[1] + ' na linha do tempo"><span class="mini" aria-hidden="true">' + (s[0] === "sfx" ? "🔊" : "🎼") + '</span><span>' + (s[0] === "sfx" ? "Efeito · " : "Trilha · ") + s[1] + '</span></div>'; }).join("")); var v = b.querySelector("p"); if (v) v.remove(); };
  $("veAbas").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) { ABA = b.dataset.aba; desenharLib(); } });
  $("veLib").addEventListener("click", async function (e) {
    var d = e.target.closest("[data-del]"); if (d) { e.stopPropagation(); var id = d.dataset.del; if (P.clips.some(function (c) { return c.mid === id; }) && !confirm("Este arquivo está na linha do tempo. Tirar da biblioteca apaga os clipes dele. Continuar?")) return; P.clips.filter(function (c) { return c.mid === id; }).forEach(function (c) { soltarEl(c.id); }); P.clips = P.clips.filter(function (c) { return c.mid !== id; }); if (MID[id]) URL.revokeObjectURL(MID[id].url); delete MID[id]; await tx("midias", "readwrite", function (s) { return s.delete(id); }); desenharLib(); tudo(); return; }
    var s = e.target.closest("[data-som]"); if (s) { var ms = await porSom(+s.dataset.som); addClip(ms); aviso(SONS[+s.dataset.som][1] + " na linha do tempo (" + (ms.som === "sfx" ? "EFEITOS, na posição da agulha" : "TRILHA") + ")."); return; }
    var m = e.target.closest("[data-mid]"); if (m && MID[m.dataset.mid]) addClip(MID[m.dataset.mid]);
  });
  $("veLib").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".ve-item")) { e.preventDefault(); e.target.click(); } });
  $("vePlay").onclick = function () { if (TOCANDO) parar(); else tocar(); };
  $("veInicio").onclick = function () { irPara(0); $("veRolo").scrollLeft = 0; };
  $("veCortar").onclick = dividir; $("veDuplicar").onclick = duplicar; $("veApagar").onclick = apagar;
  $("veZoomMais").onclick = function () { PPS = Math.min(200, Math.round(PPS * 1.4)); desenharTL(); }; $("veZoomMenos").onclick = function () { PPS = Math.max(12, Math.round(PPS / 1.4)); desenharTL(); };
  $("veFmt").onchange = function () { P.fmt = this.value; if (P.fmt === "livre" && !P.w) { P.w = cv.width; P.h = cv.height; } formato(); guardar(); };
  ["veLargura", "veAltura"].forEach(function (id) { $(id).onchange = function () { if (P.fmt !== "livre") return; var par = function (v) { v = Math.round(Number(v) || 0); return lim(v - v % 2, 240, 4096); }; P.w = par($("veLargura").value); P.h = par($("veAltura").value); formato(); guardar(); aviso("Tamanho " + P.w + " × " + P.h + " px."); }; });
  $("veNovo").onclick = function () { if (P.clips.length && !confirm("Começar um vídeo novo? A linha do tempo atual é apagada (a biblioteca de mídia continua).")) return; parar(); Object.keys(EL).forEach(soltarEl); P = {fmt: P.fmt, clips: []}; SEL = null; T = 0; tudo(); aviso(""); };
  $("veExportar").onclick = exportar; $("veCancelar").onclick = function () { if (GRAV) GRAV.cancelar(); };
  $("veFecharSaida").onclick = function () { $("veSaida").hidden = true; try { $("veVideoPronto").pause(); } catch (e) {} };
  $("veCompartilhar").onclick = async function () { var s = $("veSaida"), f = new File([s._blob], s._nome, {type: s._blob.type}); try { if (navigator.canShare && navigator.canShare({files: [f]})) await navigator.share({files: [f]}); else $("veBaixar").click(); } catch (e) {} };
  $("vePropCorpo").addEventListener("input", function (e) { var el = e.target, k = el.dataset.p, c = sel(); if (!k || !c) return; var v = el.type === "range" ? +el.value : el.value;
    if (k === "dur") v = lim(v, 0.2, maxDur(c)); if (k === "transDur") { if (c.trans) c.trans.dur = v; } else c[k] = v; if (el.type === "range") { var o = el.nextElementSibling; if (o) o.textContent = String(v).replace(".", ",") + (o.textContent.replace(/^[\d.,\-]+/, "")); }
    if (k === "trilha" || k === "dur" || k === "txt" || k === "transDur") desenharTL(); desenhar(); guardar(); marcarHist(); });
  $("vePropCorpo").addEventListener("click", function (e) { var b = e.target.closest("button"), c = sel(); if (!b || !c) return;
    if (b.hasAttribute("data-vel")) mudarVel(c, +b.dataset.vel);
    else if (b.hasAttribute("data-trans")) { var k = b.dataset.trans; c.trans = k ? {tipo: k, dur: (c.trans && c.trans.dur) || 0.6} : null; tudo(); if (k) { verTransicao(c); aviso("Transição “" + TRANS[k] + "”" + (anteriorDe(c) ? "." : " — encoste o clipe no fim de outro para ela aparecer.")); } }
    else if (b.hasAttribute("data-efeito")) { c.efeito = b.dataset.efeito || ""; if (c.efeito && c.efInt == null) c.efInt = 85; tudo(); }
    else if (b.dataset.acao === "congelar") congelar(); });
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
    if (e.target.closest("#veRegua")) { arr = {tipo: "agulha", xDe: xDe}; irPara(xDe(e) / PPS); e.preventDefault(); return; }
    if (F === "t") { addTexto({t: Math.max(0, xDe(e) / PPS)}); BWFerr.trocar("v"); aviso("T Texto criado — escreva em AJUSTES."); e.preventDefault(); return; }
    if (F === "c") { var ec = e.target.closest("[data-clip]"); if (!ec) return; var tc = Math.max(0, xDe(e) / PPS), alvos = e.shiftKey ? P.clips.filter(function (x) { return tc > x.ini + 0.05 && tc < x.ini + x.dur - 0.05; }) : P.clips.filter(function (x) { return x.id === ec.dataset.clip; }), ult = null;
      alvos.forEach(function (x) { var d = dividirEm(x, tc); if (d) ult = d; }); if (ult) { SEL = ult.id; tudo(); aviso("✂ Cortado em " + fmtT(tc) + (e.shiftKey ? " (todas as camadas)" : "") + ". Shift + clique corta todas as camadas."); } e.preventDefault(); return; }
    var el = e.target.closest("[data-clip]"); if (!el) { if (SEL) { SEL = null; desenharTL(); desenharProp(); } return; }
    var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return; var al = e.target.dataset.al || "";
    if (SEL !== c.id) { SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x === el); }); desenharProp(); }
    arr = {tipo: al ? "al" + al : "mover", c: c, el: el, x0: e.clientX, ini: c.ini, dur: c.dur, corte: c.corte || 0, moveu: false}; e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!arr) { lamina(e); return; }
    if (arr.tipo === "mao") { $("veRolo").scrollLeft = arr.sl - (e.clientX - arr.x0); return; }
    if (arr.tipo === "palco") { var cr = cv.getBoundingClientRect(), pc = arr.c; pc.x = Math.round(lim(arr.px + (e.clientX - arr.x0) / cr.width * 100, -100, 100)); pc.y = Math.round(lim(arr.py + (e.clientY - arr.y0) / cr.height * 100, -100, 100)); arr.moveu = true; desenhar(); return; }
    if (arr.tipo === "agulha") { irPara(arr.xDe(e) / PPS); return; }
    var c = arr.c, d = (e.clientX - arr.x0) / PPS; if (Math.abs(e.clientX - arr.x0) > 3) arr.moveu = true; if (!arr.moveu) return;
    var temFonte = c.tipo === "video" || c.tipo === "audio", r = function (v) { return Math.round(v * 20) / 20; };
    if (arr.tipo === "mover") { c.ini = Math.max(0, r(arr.ini + d)); var fx = document.elementFromPoint(e.clientX, e.clientY), fa = fx && fx.closest && fx.closest("[data-trilha]"); if (fa) { var tr = fa.dataset.trilha, ok = c.tipo === "texto" ? tr === "tx" : c.tipo === "audio" ? (tr === "a1" || tr === "a2") : (tr === "v1" || tr === "v2"); if (ok && tr !== c.trilha) { c.trilha = tr; fa.appendChild(arr.el); arr.el.style.setProperty("--c", COR[tr]); } } }
    else if (arr.tipo === "ale") { var dd = lim(d, temFonte ? -arr.corte / vel(c) : -arr.ini, arr.dur - 0.2); dd = Math.max(dd, -arr.ini); c.ini = r(arr.ini + dd); c.dur = r(arr.dur - dd); if (temFonte) c.corte = Math.max(0, arr.corte + dd * vel(c)); }
    else { c.dur = r(lim(arr.dur + d, 0.2, temFonte ? maxDur(c) : 600)); }
    arr.el.style.left = (c.ini * PPS) + "px"; arr.el.style.width = Math.max(18, c.dur * PPS) + "px"; if (!TOCANDO) desenhar();
  });
  window.addEventListener("pointerup", function () { if (!arr) return; var a = arr; arr = null; if (window.BWFerr) BWFerr.preso(false); if (a.tipo !== "agulha" && a.tipo !== "mao" && a.moveu) tudo(); });
  // LÂMINA (C): uma linha mostra onde o corte vai cair
  function lamina(e) { var l = $("veLamina"); if (!l) return; var F = window.BWFerr ? BWFerr.atual() : "v", ec = e.target && e.target.closest && e.target.closest("[data-clip]");
    if (F !== "c" || !ec) { l.hidden = true; return; } var fx = $("veFaixas").getBoundingClientRect(), r = ec.getBoundingClientRect(); l.hidden = false; l.style.left = (e.clientX - fx.left) + "px"; l.style.top = (r.top - fx.top) + "px"; l.style.height = r.height + "px"; }
  $("veRolo").addEventListener("wheel", function (e) { if (e.ctrlKey || e.altKey) { e.preventDefault(); zoomEm(e.deltaY < 0 ? 1.25 : 0.8, e.clientX); } }, {passive: false});
  // PRÉVIA: V arrasta o clipe escolhido (ou o de cima) direto na tela; T cria um texto onde tocou; Z aproxima a linha do tempo
  cv.addEventListener("pointerdown", function (e) { var F = window.BWFerr ? BWFerr.atual() : "v", cr = cv.getBoundingClientRect(), fx = (e.clientX - cr.left) / cr.width, fy = (e.clientY - cr.top) / cr.height;
    if (F === "t") { addTexto({x: Math.round((fx - 0.5) * 100), y: Math.round((fy - 0.5) * 100)}); BWFerr.trocar("v"); aviso("T Texto criado onde você tocou — escreva em AJUSTES."); return; }
    if (F !== "v") return;
    var ativos = P.clips.filter(function (c) { return c.tipo !== "audio" && T >= c.ini && T < c.ini + c.dur; }), ordem = {tx: 3, v2: 2, v1: 1};
    var c = sel(); if (!c || ativos.indexOf(c) < 0) { c = ativos.sort(function (a, b) { return ordem[b.trilha] - ordem[a.trilha]; })[0]; if (!c) return; SEL = c.id; desenharTL(); desenharProp(); }
    arr = {tipo: "palco", c: c, x0: e.clientX, y0: e.clientY, px: c.x || 0, py: c.y || 0, moveu: false}; e.preventDefault(); });

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
      "ctrl+k": dividir, "ctrl+z": desfazer, "ctrl+shift+z, ctrl+y": refazer, "ctrl+c": function () { return copiar(); }, "ctrl+v": colar,
      "ctrl+shift+/, ctrl+shift+d": duplicar, "ctrl+d": function () { var c = sel(); if (!c || c.tipo === "audio" || c.tipo === "texto") return false; c.trans = {tipo: "dissolver", dur: 0.6}; tudo(); aviso("Ctrl+D: transição Dissolver no início do clipe" + (anteriorDe(c) ? "." : " (encoste-o no fim de outro clipe).")); },
      "=, shift+=, ctrl+=": function () { zoomEm(1.4); }, "-, ctrl+-": function () { zoomEm(1 / 1.4); }, "\\": encaixarTudo,
      "ctrl+s": function () { guardar(); aviso("✓ Salvo neste aparelho (o editor também salva sozinho)."); }, "ctrl+m, ctrl+e": exportar, "ctrl+i": function () { $("veArq").click(); },
      "escape": function () { if (!SEL) return false; SEL = null; desenharTL(); desenharProp(); }
    });
    BWFerr.ajuda("ATALHOS DO EDITOR DE VÍDEO", [["#", "TOCAR E NAVEGAR"], ["Espaço / K", "tocar / pausar"], ["L", "tocar"], ["J", "voltar 1 s"], ["← / →", "um quadro para trás / frente"], ["Shift+← / Shift+→", "1 segundo"], ["Home / End", "início / fim"],
      ["#", "EDITAR"], ["Ctrl+K", "cortar na agulha (o clipe escolhido, ou tudo o que está na agulha)"], ["Delete", "apagar o clipe"], ["Shift+Delete", "apagar e fechar o espaço"], ["Ctrl+C / Ctrl+V", "copiar / colar na agulha"],
      ["Ctrl+Shift+D", "duplicar"], ["Ctrl+D", "transição Dissolver no clipe"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"], ["Botão direito", "opções do clipe (no celular: segure o dedo)"],
      ["#", "LINHA DO TEMPO E ARQUIVO"], ["= / -", "aproximar / afastar"], ["\\", "caber o vídeo inteiro"], ["Ctrl+roda do mouse", "zoom onde está o mouse"], ["Ctrl+I", "importar mídia"], ["Ctrl+S", "salvar"], ["Ctrl+M", "exportar o vídeo"], ["?", "esta lista"]]);
    // MENU DO CLIPE (botão direito / segurar o dedo)
    BWFerr.contexto($("veFaixas"), "[data-clip]", function (el) { var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return [];
      if (SEL !== c.id) { SEL = c.id; desenharTL(); desenharProp(); }
      var vis = c.tipo !== "audio" && c.tipo !== "texto", itens = [
        {icone: "✂", rot: "Cortar na agulha", tecla: "Ctrl+K", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: dividir},
        {icone: "⧉", rot: "Duplicar", tecla: "Ctrl+Shift+D", fn: duplicar}, {icone: "⎘", rot: "Copiar", tecla: "Ctrl+C", fn: copiar}, {icone: "📋", rot: "Colar na agulha", tecla: "Ctrl+V", off: !COPIA, fn: colar}];
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
  if (window.BWFerr) BWFerr.telaFixa({wrap: document.querySelector(".wrap"), grade: document.querySelector(".ve-grade"), palco: document.querySelector(".ve-palco"), rola: [document.querySelector(".ve-tl")], some: [document.querySelector(".wrap > .ve-nota")],
    aviso: $("veAviso"), aoMedir: function (cel) { var pal = document.querySelector(".ve-palco"); cv.style.maxHeight = cel ? "" : Math.max(140, pal.clientHeight - 84) + "px"; }});
  function reservar() { var m = window.matchMedia("(max-width:1100px)").matches, h = document.documentElement.style; h.scrollPaddingTop = m ? (document.querySelector(".ve-palco").offsetHeight + 10) + "px" : ""; h.scrollPaddingBottom = m ? "90px" : ""; }
  window.addEventListener("resize", reservar); reservar();
  /* ---------- começo: volta o que estava aberto ---------- */
  (async function () {
    var ms = (await tx("midias", "readonly", function (s) { return s.getAll(); })) || [];
    for (var i = 0; i < ms.length; i++) { try { await porMidia(ms[i].blob, ms[i].nome, ms[i].tipo, ms[i].id, ms[i].dur); } catch (e) {} }
    var st = await tx("estado", "readonly", function (s) { return s.get("atual"); });
    if (st && st.p && Array.isArray(st.p.clips)) { P = st.p; for (var k = 0; k < P.clips.length; k++) { var c = P.clips[k]; if (c.mid && !MID[c.mid] && c.mid.indexOf("som-") === 0) { var ix = SONS.map(function (s) { return "som-" + s[1].toLowerCase().replace(/\s+/g, "-"); }).indexOf(c.mid); if (ix >= 0) await porSom(ix); } } P.clips = P.clips.filter(function (c) { return c.tipo === "texto" || MID[c.mid]; }); }
    formato(); desenharLib(); desenharTL(); desenharProp(); desenhar(); window.__veProntoOk = true;
  })();
  window.__video = {P: function () { return P; }, MID: MID, importar: importar, addClip: addClip, addTexto: addTexto, porSom: porSom, irPara: irPara, tocar: tocar, parar: parar, total: total, sel: function (id) { SEL = id; tudo(); }, exportar: exportar, tipoGravacao: tipoGravacao, T: function () { return T; }, tocando: function () { return TOCANDO; }, desenhar: desenhar, dividir: dividir, sintetizar: sintetizar, congelar: congelar, mudarVel: mudarVel, desfazer: desfazer, refazer: refazer, pps: function () { return PPS; }, TRANS: TRANS, EFEITOS: EFEITOS};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
