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
  var FMT = {"9:16": [720, 1280], "16:9": [1280, 720], "1:1": [1080, 1080], "4:5": [864, 1080]};
  var FONTES = ["Inter", "Montserrat", "Georgia", "Impact", "Courier New"];
  var P = {fmt: "9:16", clips: []}, MID = {}, SEL = null, T = 0, TOCANDO = false, PPS = 60, ABA = "tudo", EL = {}, GRAV = null;
  var cv = $("veCv"), cx = cv.getContext("2d");

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() { return new Promise(function (ok, erro) { if (DB) return ok(DB); var r = indexedDB.open("bw_video", 1); r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}); if (!d.objectStoreNames.contains("estado")) d.createObjectStore("estado", {keyPath: "id"}); }; r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { erro(r.error); }; }); }
  function tx(loja, modo, fn) { return db().then(function (d) { return new Promise(function (ok, erro) { var t = d.transaction(loja, modo), q = fn(t.objectStore(loja)); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { erro(t.error); }; }); }).catch(function () { return null; }); }
  var tSalvar = 0;
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
    var c = {id: uid(), trilha: tr, tipo: m.tipo, mid: m.id, ini: tr === "a2" || tr === "v2" ? Math.round(T * 10) / 10 : fimDaTrilha(tr), dur: Math.round(Math.min(m.dur, m.tipo === "imagem" ? 4 : 600) * 100) / 100, corte: 0, vol: 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: 0, encaixe: m.id.indexOf("pe-") === 0 ? "caber" : "cobrir"};
    P.clips.push(c); SEL = c.id; tudo(); return c;
  }
  function addTexto() { var c = {id: uid(), trilha: "tx", tipo: "texto", ini: Math.round(T * 10) / 10, dur: 3, txt: "Seu texto", fonte: "Montserrat", tam: 6, cor: "#ffffff", fundo: "", x: 0, y: 30, op: 100, fin: 0.3, fout: 0.3}; P.clips.push(c); SEL = c.id; tudo(); return c; }
  function sel() { return P.clips.filter(function (c) { return c.id === SEL; })[0] || null; }
  function dividir() { var c = sel(); if (!c || T <= c.ini + 0.1 || T >= c.ini + c.dur - 0.1) { aviso("Escolha um clipe e ponha a agulha no meio dele para dividir.", true); return; } var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = T; d.dur = c.ini + c.dur - T; if (c.tipo !== "texto" && c.tipo !== "imagem") d.corte = c.corte + (T - c.ini); d.fin = 0; c.dur = T - c.ini; c.fout = 0; P.clips.push(d); SEL = d.id; tudo(); aviso(""); }
  function duplicar() { var c = sel(); if (!c) return; var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = c.ini + c.dur; P.clips.push(d); SEL = d.id; tudo(); }
  function apagar() { var c = sel(); if (!c) return; soltarEl(c.id); P.clips = P.clips.filter(function (x) { return x !== c; }); SEL = null; tudo(); }
  function maxDur(c) { var m = MID[c.mid]; return c.tipo === "video" || c.tipo === "audio" ? Math.max(0.2, (m ? m.dur : c.dur) - c.corte) : 600; }

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
    var alvo = c.corte + (t - c.ini), v = lim((c.vol == null ? 100 : c.vol) / 100 * fade(c, t), 0, 2);
    if (o.g) { o.g.gain.value = v; e.volume = 1; } else e.volume = Math.min(1, v);
    if (TOCANDO) { if (e.paused) { try { e.currentTime = alvo; } catch (x) {} var pr = e.play(); if (pr && pr.catch) pr.catch(function () {}); } else if (Math.abs(e.currentTime - alvo) > 0.35) { try { e.currentTime = alvo; } catch (x) {} } }
    else { if (!e.paused) e.pause(); if (Math.abs(e.currentTime - alvo) > 0.04) { try { e.currentTime = alvo; } catch (x) {} } }
    return o;
  }
  function desenharMidia(fonte, fw, fh, c, t) {
    if (!fw || !fh) return; var W = cv.width, H = cv.height, s = (c.encaixe === "caber" ? Math.min : Math.max)(W / fw, H / fh) * (c.esc || 100) / 100, w = fw * s, h = fh * s;
    cx.globalAlpha = (c.op == null ? 100 : c.op) / 100 * fade(c, t); cx.drawImage(fonte, (W - w) / 2 + (c.x || 0) / 100 * W, (H - h) / 2 + (c.y || 0) / 100 * H, w, h); cx.globalAlpha = 1;
  }
  function desenharTexto(c, t) {
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), linhas = String(c.txt || "").split("\n"), lh = px * 1.18;
    cx.save(); cx.globalAlpha = (c.op == null ? 100 : c.op) / 100 * fade(c, t); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H, larg = Math.max.apply(0, linhas.map(function (l) { return cx.measureText(l).width; }));
    if (larg > W * 0.92) { px = px * W * 0.92 / larg; lh = px * 1.18; cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; larg = W * 0.92; }   /* texto longo encolhe para caber na tela */
    if (c.fundo) { cx.fillStyle = c.fundo; var pd = px * 0.35; cx.beginPath(); if (cx.roundRect) cx.roundRect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2, px * 0.25); else cx.rect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2); cx.fill(); }
    else { cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = px * 0.18; cx.shadowOffsetY = px * 0.05; }
    cx.fillStyle = c.cor || "#fff"; linhas.forEach(function (l, i) { cx.fillText(l, cxm, cym + (i - (linhas.length - 1) / 2) * lh); }); cx.restore();
  }
  function desenhar() {
    var t = T; cx.fillStyle = "#000"; cx.fillRect(0, 0, cv.width, cv.height);
    ["v1", "v2", "tx", "a1", "a2"].forEach(function (tr) { P.clips.forEach(function (c) { if (c.trilha !== tr) return; var ativo = t >= c.ini && t < c.ini + c.dur;
      if (c.tipo === "texto") { if (ativo) desenharTexto(c, t); return; }
      if (c.tipo === "imagem") { var m = MID[c.mid]; if (ativo && m && m.img) desenharMidia(m.img, m.img.naturalWidth, m.img.naturalHeight, c, t); return; }
      var o = sincronizar(c, t, ativo); if (ativo && o && c.tipo === "video" && o.e.readyState >= 2) desenharMidia(o.e, o.e.videoWidth, o.e.videoHeight, c, t); }); });
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
        return '<div class="ve-clip' + (c.id === SEL ? " on" : "") + '" data-clip="' + c.id + '" style="--c:' + tr[2] + ';left:' + (c.ini * PPS) + 'px;width:' + Math.max(18, c.dur * PPS) + 'px" title="' + esc(nome) + '"><i class="al e" data-al="e"></i>' + (mini ? '<img alt="" src="' + mini + '">' : "") + '<span>' + (c.tipo === "texto" ? "T · " : c.tipo === "audio" ? "♪ " : "") + esc(nome) + '</span><i class="al d" data-al="d"></i></div>'; }).join("") + "</div>"; });
    h += '<div class="ve-agulha" id="veAgulha" style="left:' + (T * PPS) + 'px"></div>';
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
    h += g("tempo", "TEMPO E CAMADA", faixaR("fin", "Entra suave", 0, 3, c.fin || 0, " s", 0.1) + faixaR("fout", "Sai suave", 0, 3, c.fout || 0, " s", 0.1) + faixaR("dur", "Duração", 0.2, Math.min(120, Math.round(maxDur(c) * 10) / 10), Math.round(c.dur * 10) / 10, " s", 0.1) +
      (visual ? '<label class="um"><span>Camada</span><select data-p="trilha" aria-label="Camada do clipe">' + (c.tipo === "texto" ? '<option value="tx" selected>Texto</option>' : '<option value="v1"' + (c.trilha === "v1" ? " selected" : "") + '>Vídeo (embaixo)</option><option value="v2"' + (c.trilha === "v2" ? " selected" : "") + '>Sobreposição (em cima)</option>') + '</select></label>' : ""), c.tipo === "texto");
    b.innerHTML = h;
  }
  function tudo() { desenharTL(); desenharProp(); desenhar(); guardar(); }
  function formato() { var f = FMT[P.fmt] || FMT["9:16"]; cv.width = f[0]; cv.height = f[1]; $("veFmt").value = P.fmt; desenhar(); }

  /* ---------- exportar (gravado pelo navegador, no tempo do vídeo) ---------- */
  function tipoGravacao() { var ts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]; for (var i = 0; i < ts.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(ts[i])) return ts[i]; return ""; }
  function exportar() {
    if (!P.clips.length) { aviso("A linha do tempo está vazia.", true); return; }
    var tipo = tipoGravacao(); if (!tipo || !cv.captureStream) { aviso("Este navegador não grava vídeo por aqui. Use o Chrome, o Edge ou o Safari atualizados.", true); return; }
    parar(); var a = audioCtx(); if (a && a.state === "suspended") a.resume();
    var fluxo = cv.captureStream(30); if (DEST) DEST.stream.getAudioTracks().forEach(function (t) { fluxo.addTrack(t); });
    var partes = [], mr; try { mr = new MediaRecorder(fluxo, {mimeType: tipo, videoBitsPerSecond: 6000000}); } catch (e) { aviso("Não consegui começar a gravação neste navegador.", true); return; }
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
  $("veFmt").onchange = function () { P.fmt = this.value; formato(); guardar(); };
  $("veNovo").onclick = function () { if (P.clips.length && !confirm("Começar um vídeo novo? A linha do tempo atual é apagada (a biblioteca de mídia continua).")) return; parar(); Object.keys(EL).forEach(soltarEl); P = {fmt: P.fmt, clips: []}; SEL = null; T = 0; tudo(); aviso(""); };
  $("veExportar").onclick = exportar; $("veCancelar").onclick = function () { if (GRAV) GRAV.cancelar(); };
  $("veFecharSaida").onclick = function () { $("veSaida").hidden = true; try { $("veVideoPronto").pause(); } catch (e) {} };
  $("veCompartilhar").onclick = async function () { var s = $("veSaida"), f = new File([s._blob], s._nome, {type: s._blob.type}); try { if (navigator.canShare && navigator.canShare({files: [f]})) await navigator.share({files: [f]}); else $("veBaixar").click(); } catch (e) {} };
  $("vePropCorpo").addEventListener("input", function (e) { var el = e.target, k = el.dataset.p, c = sel(); if (!k || !c) return; var v = el.type === "range" ? +el.value : el.value;
    if (k === "dur") v = lim(v, 0.2, maxDur(c)); c[k] = v; if (el.type === "range") { var o = el.nextElementSibling; if (o) o.textContent = String(v).replace(".", ",") + (o.textContent.replace(/^[\d.,\-]+/, "")); }
    if (k === "trilha" || k === "dur" || k === "txt") desenharTL(); desenhar(); guardar(); });
  /* arrastar na linha do tempo: mover, aparar pelas alças, agulha na régua */
  var arr = null;
  $("veFaixas").addEventListener("pointerdown", function (e) {
    var ro = $("veRolo"), xDe = function (ev) { return ev.clientX - $("veFaixas").getBoundingClientRect().left; };
    if (e.target.closest("#veRegua")) { arr = {tipo: "agulha", xDe: xDe}; irPara(xDe(e) / PPS); e.preventDefault(); return; }
    var el = e.target.closest("[data-clip]"); if (!el) { if (SEL) { SEL = null; desenharTL(); desenharProp(); } return; }
    var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return; var al = e.target.dataset.al || "";
    if (SEL !== c.id) { SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x === el); }); desenharProp(); }
    arr = {tipo: al ? "al" + al : "mover", c: c, el: el, x0: e.clientX, ini: c.ini, dur: c.dur, corte: c.corte || 0, moveu: false}; e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!arr) return;
    if (arr.tipo === "agulha") { irPara(arr.xDe(e) / PPS); return; }
    var c = arr.c, d = (e.clientX - arr.x0) / PPS; if (Math.abs(e.clientX - arr.x0) > 3) arr.moveu = true; if (!arr.moveu) return;
    var temFonte = c.tipo === "video" || c.tipo === "audio", r = function (v) { return Math.round(v * 20) / 20; };
    if (arr.tipo === "mover") { c.ini = Math.max(0, r(arr.ini + d)); var fx = document.elementFromPoint(e.clientX, e.clientY), fa = fx && fx.closest && fx.closest("[data-trilha]"); if (fa) { var tr = fa.dataset.trilha, ok = c.tipo === "texto" ? tr === "tx" : c.tipo === "audio" ? (tr === "a1" || tr === "a2") : (tr === "v1" || tr === "v2"); if (ok && tr !== c.trilha) { c.trilha = tr; fa.appendChild(arr.el); arr.el.style.setProperty("--c", COR[tr]); } } }
    else if (arr.tipo === "ale") { var dd = lim(d, temFonte ? -arr.corte : -arr.ini, arr.dur - 0.2); dd = Math.max(dd, -arr.ini); c.ini = r(arr.ini + dd); c.dur = r(arr.dur - dd); if (temFonte) c.corte = Math.max(0, arr.corte + dd); }
    else { c.dur = r(lim(arr.dur + d, 0.2, temFonte ? (MID[c.mid] ? MID[c.mid].dur : arr.dur) - c.corte : 600)); }
    arr.el.style.left = (c.ini * PPS) + "px"; arr.el.style.width = Math.max(18, c.dur * PPS) + "px"; if (!TOCANDO) desenhar();
  });
  window.addEventListener("pointerup", function () { if (!arr) return; var a = arr; arr = null; if (a.tipo !== "agulha" && a.moveu) tudo(); });
  document.addEventListener("keydown", function (e) { if (/input|textarea|select/i.test(e.target.tagName)) return; if (e.key === " ") { e.preventDefault(); $("vePlay").click(); } else if (e.key === "Delete" && SEL) apagar(); });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); var fs = [].slice.call((e.dataTransfer && e.dataTransfer.files) || []); if (fs.length) importar(fs); });
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var u = null; try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; u = s && s.data && s.data.session && s.data.session.user; } catch (e) {}
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();

  /* celular: a prévia fica presa no topo — a página reserva a altura dela (e a das abas de baixo) ao rolar até um botão (regras 52 e 71) */
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
  window.__video = {P: function () { return P; }, MID: MID, importar: importar, addClip: addClip, addTexto: addTexto, porSom: porSom, irPara: irPara, tocar: tocar, parar: parar, total: total, sel: function (id) { SEL = id; tudo(); }, exportar: exportar, tipoGravacao: tipoGravacao, T: function () { return T; }, tocando: function () { return TOCANDO; }, desenhar: desenhar, dividir: dividir, sintetizar: sintetizar};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
