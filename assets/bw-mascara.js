/* BW MÁSCARA COM IA (21/11/2026) — acha a PESSOA em cada quadro de um take, NO APARELHO, para pôr texto/logo ATRÁS dela,
   desfocar ou trocar o fundo e acender um contorno de luz. Modelo: MediaPipe Selfie Multiclass (Google, Apache-2.0), o mesmo do editor de fotos.
   Nada sai do aparelho: o vídeo não é enviado; só o MODELO (~16 MB) e a biblioteca do MediaPipe são baixados uma vez, como no editor de fotos.
   As máscaras ficam no IndexedDB deste aparelho (bw_mascaras). A máscara é refeita em CADA quadro analisado, então ela "segue" a pessoa sozinha.
   Uso: BWMascara.analisar(midia, {fps, aoAndar}) · BWMascara.tem(mid) · BWMascara.mascara(mid, tempoNaMidia) → canvas (branco = pessoa)
        BWMascara.compor(fonte, fw, fh, mascara, ia, soPessoa) → canvas · BWMascara.carregar(mids) · BWMascara.cancelar() */
(function () {
  "use strict";
  var MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MODELO = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite";
  var LADO = 192, MK = {}, SEG = null, BASE = null, CANCELAR = false, DB = null, CACHE = {}, TMP = {};
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function tela(nome, w, h) { var c = TMP[nome]; if (!c) c = TMP[nome] = document.createElement("canvas"); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  function db() { return new Promise(function (ok) { if (DB) return ok(DB); try { var r = indexedDB.open("bw_mascaras", 1); r.onupgradeneeded = function () { r.result.createObjectStore("m", {keyPath: "mid"}); }; r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { ok(null); }; } catch (e) { ok(null); } }); }
  function guardar(mid, o) { return db().then(function (d) { if (!d) return; return new Promise(function (ok) { var t = d.transaction("m", "readwrite"); t.objectStore("m").put({mid: mid, fps: o.fps, w: o.w, h: o.h, n: o.q.length, dados: juntar(o.q, o.w * o.h)}); t.oncomplete = ok; t.onerror = ok; }); }); }
  function juntar(q, tam) { var tudo = new Uint8Array(q.length * tam); q.forEach(function (a, i) { tudo.set(a, i * tam); }); return tudo; }
  /* ---- o segmentador (o mesmo jeito do editor de fotos; CPU porque no iPhone a GPU troca as categorias) ---- */
  function segmentador() {
    if (window.__BWMascaraTeste) return Promise.resolve({teste: true});
    if (SEG) return Promise.resolve(SEG);
    if (!BASE) BASE = import(MP + "/vision_bundle.mjs").then(function (v) { return v.FilesetResolver.forVisionTasks(MP + "/wasm").then(function (fs) { return {v: v, fs: fs}; }); }).catch(function (e) { BASE = null; throw e; });
    return BASE.then(function (b) { return b.v.ImageSegmenter.createFromOptions(b.fs, {baseOptions: {modelAssetPath: MODELO, delegate: "CPU"}, runningMode: "IMAGE", outputCategoryMask: true, outputConfidenceMasks: false}); }).then(function (s) { SEG = s; return s; });
  }
  /* uma imagem (canvas) → máscara da pessoa em LADO px (0 fundo, 255 pessoa), já com a borda suavizada */
  function umaMascara(seg, src, w, h) {
    var mw, mh, cat;
    if (seg.teste) { var r0 = window.__BWMascaraTeste(src); mw = r0.w; mh = r0.h; cat = r0.dados; }
    else { var r = seg.segment(src), cm = r.categoryMask; cat = cm.getAsUint8Array().slice(0); mw = cm.width; mh = cm.height; cm.close && cm.close(); for (var i = 0; i < cat.length; i++) cat[i] = cat[i] ? 255 : 0; }   /* 0 fundo · 1–5 cabelo, pele, roupa, acessórios = pessoa */
    var c = tela("m1", mw, mh), x = c.getContext("2d", {willReadFrequently: true}), im = x.createImageData(mw, mh);
    for (var k = 0; k < cat.length; k++) { im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = 255; im.data[k * 4 + 3] = cat[k]; }
    x.putImageData(im, 0, 0);
    var o = tela("m2", w, h), ox = o.getContext("2d", {willReadFrequently: true}); ox.clearRect(0, 0, w, h); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = "high"; ox.drawImage(c, 0, 0, w, h);
    var d = ox.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h); for (var j = 0; j < out.length; j++) out[j] = d[j * 4 + 3];
    return out;
  }
  function medidas(fw, fh) { var k = LADO / Math.max(fw, fh); return [Math.max(8, Math.round(fw * k)), Math.max(8, Math.round(fh * k))]; }
  function quadro(fonte, fw, fh) { var k = Math.min(1, 512 / Math.max(fw, fh)), c = tela("q", Math.round(fw * k), Math.round(fh * k)); c.getContext("2d").drawImage(fonte, 0, 0, c.width, c.height); return c; }
  function esperar(el, ev, ms) { return new Promise(function (ok) { var feito = false, f = function () { if (feito) return; feito = true; el.removeEventListener(ev, f); ok(); }; el.addEventListener(ev, f); setTimeout(f, ms); }); }
  /* ---- ANALISAR um take inteiro: para vídeo, um quadro a cada 1/fps segundos ---- */
  async function analisar(m, o) {
    o = o || {}; CANCELAR = false; var seg = await segmentador(), aoAndar = o.aoAndar || function () {};
    if (m.tipo === "imagem") {
      var img = m.img || await new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = erro; i.src = m.url; });
      var md = medidas(img.naturalWidth, img.naturalHeight), q0 = quadro(img, img.naturalWidth, img.naturalHeight);
      var r = {fps: 0, w: md[0], h: md[1], q: [umaMascara(seg, q0, md[0], md[1])]}; MK[m.id] = r; CACHE = {}; await guardar(m.id, r); aoAndar(1); return r;
    }
    var fps = o.fps || (m.dur > 90 ? 6 : m.dur > 30 ? 8 : 12), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous"; v.src = m.url;
    await esperar(v, "loadeddata", 15000); if (!v.videoWidth) throw new Error("não consegui abrir o vídeo");
    var mm = medidas(v.videoWidth, v.videoHeight), n = Math.max(1, Math.ceil((m.dur || v.duration || 1) * fps)), res = {fps: fps, w: mm[0], h: mm[1], q: []};
    for (var i = 0; i < n; i++) {
      if (CANCELAR) throw new Error("cancelado");
      var t = Math.min((m.dur || v.duration) - 0.02, i / fps); if (Math.abs(v.currentTime - t) > 0.001) { v.currentTime = t; await esperar(v, "seeked", 4000); }
      res.q.push(umaMascara(seg, quadro(v, v.videoWidth, v.videoHeight), mm[0], mm[1])); aoAndar((i + 1) / n);
      if (i % 4 === 3) await new Promise(function (ok) { setTimeout(ok, 0); });   /* deixa a tela respirar */
    }
    v.removeAttribute("src"); v.load(); MK[m.id] = res; CACHE = {}; await guardar(m.id, res); return res;
  }
  /* carrega do aparelho as máscaras já feitas (ao abrir o editor) */
  function carregar(mids) {
    return db().then(function (d) { if (!d) return; return Promise.all((mids || []).map(function (mid) { return new Promise(function (ok) {
      var q = d.transaction("m").objectStore("m").get(mid); q.onsuccess = function () { var r = q.result; if (r && r.dados) { var tam = r.w * r.h, arr = []; for (var i = 0; i < r.n; i++) arr.push(r.dados.subarray(i * tam, (i + 1) * tam)); MK[mid] = {fps: r.fps, w: r.w, h: r.h, q: arr}; } ok(); }; q.onerror = function () { ok(); }; }); })); });
  }
  function apagar(mid) { delete MK[mid]; CACHE = {}; return db().then(function (d) { if (d) d.transaction("m", "readwrite").objectStore("m").delete(mid); }); }
  /* máscara do tempo pedido (o quadro analisado mais perto) como canvas — guardado para não refazer a cada desenho */
  function mascara(mid, tm) {
    var r = MK[mid]; if (!r || !r.q.length) return null; var i = r.fps ? lim(Math.round(tm * r.fps), 0, r.q.length - 1) : 0, ch = mid + "|" + i;
    if (CACHE[ch]) return CACHE[ch];
    var ks = Object.keys(CACHE); if (ks.length > 40) CACHE = {};
    var c = document.createElement("canvas"); c.width = r.w; c.height = r.h; var x = c.getContext("2d"), im = x.createImageData(r.w, r.h), a = r.q[i];
    for (var k = 0; k < a.length; k++) { im.data[k * 4] = im.data[k * 4 + 1] = im.data[k * 4 + 2] = 255; im.data[k * 4 + 3] = a[k]; }
    x.putImageData(im, 0, 0); CACHE[ch] = c; return c;
  }
  function desfocado(c, w, h, raio) { var k = Math.max(2, raio), p = tela("df", Math.max(1, Math.round(w / k)), Math.max(1, Math.round(h / k))), px = p.getContext("2d"); px.imageSmoothingQuality = "high"; px.clearRect(0, 0, p.width, p.height); px.drawImage(c, 0, 0, p.width, p.height); return p; }
  /* COMPOR: ia = {fundo: ""|desfoque|pb|escuro|claro|cor|sem, fundoCor, suave(0–100), contorno, contornoCor}
     soPessoa = true → só a pessoa recortada (é o que vai por CIMA dos textos "atrás da pessoa"), com o contorno de luz se pedido */
  function compor(fonte, fw, fh, mk, ia, soPessoa) {
    ia = ia || {}; var k = Math.min(1, 1280 / Math.max(fw, fh)), w = Math.max(2, Math.round(fw * k)), h = Math.max(2, Math.round(fh * k));
    var suave = lim(+ia.suave || 30, 0, 100), mc = tela("mc", w, h), mx = mc.getContext("2d");
    mx.clearRect(0, 0, w, h); mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = "high";
    if (suave > 0) { var b = desfocado(mk, mk.width, mk.height, 1 + suave / 25); mx.drawImage(b, 0, 0, w, h); } else mx.drawImage(mk, 0, 0, w, h);
    var pe = tela("pe" + (soPessoa ? "1" : "0"), w, h), px = pe.getContext("2d"); px.globalCompositeOperation = "source-over"; px.clearRect(0, 0, w, h); px.drawImage(fonte, 0, 0, w, h); px.globalCompositeOperation = "destination-in"; px.drawImage(mc, 0, 0); px.globalCompositeOperation = "source-over";
    var o = tela("o" + (soPessoa ? "1" : "0"), w, h), ox = o.getContext("2d"); ox.globalCompositeOperation = "source-over"; ox.clearRect(0, 0, w, h);
    if (soPessoa) {
      if (ia.contorno) { ox.save(); ox.shadowColor = ia.contornoCor || "#7C5CFF"; ox.shadowBlur = Math.max(6, w / 45); for (var r = 0; r < 3; r++) ox.drawImage(mc, 0, 0); ox.restore();
        ox.globalCompositeOperation = "source-in"; ox.fillStyle = ia.contornoCor || "#7C5CFF"; ox.fillRect(0, 0, w, h); ox.globalCompositeOperation = "source-over"; }
      ox.drawImage(pe, 0, 0); return o;
    }
    var f = ia.fundo || "";
    if (f === "sem") { ox.drawImage(pe, 0, 0); return o; }
    if (f === "cor") { ox.fillStyle = ia.fundoCor || "#111318"; ox.fillRect(0, 0, w, h); }
    else if (f === "desfoque") { var bb = desfocado(fonte, w, h, 14); ox.imageSmoothingQuality = "high"; ox.drawImage(bb, 0, 0, w, h); }
    else { ox.drawImage(fonte, 0, 0, w, h);
      if (f === "pb") { ox.globalCompositeOperation = "saturation"; ox.fillStyle = "#808080"; ox.fillRect(0, 0, w, h); ox.globalCompositeOperation = "source-over"; }
      else if (f === "escuro") { ox.fillStyle = "rgba(0,0,0,.55)"; ox.fillRect(0, 0, w, h); }
      else if (f === "claro") { ox.fillStyle = "rgba(255,255,255,.45)"; ox.fillRect(0, 0, w, h); } }
    ox.drawImage(pe, 0, 0); return o;
  }
  window.BWMascara = {analisar: analisar, carregar: carregar, apagar: apagar, mascara: mascara, compor: compor, tem: function (mid) { return !!(MK[mid] && MK[mid].q.length); },
    info: function (mid) { var r = MK[mid]; return r ? {fps: r.fps, quadros: r.q.length, w: r.w, h: r.h} : null; }, cancelar: function () { CANCELAR = true; }};
})();
