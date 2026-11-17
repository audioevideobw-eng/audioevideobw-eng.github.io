/* BW Reels Pro — ANIMAR MEU PERSONAGEM (17/11/2026, Claude)
   Recorte do personagem enviado pela pessoa, feito NO APARELHO (nada sai daqui):
   - recortarLiso: fundo liso (desenho, mascote, foto em fundo branco/cor) — tira pelas bordas, sem halo, e corta as sobras;
   - recortarIA: foto com fundo complexo — MODNet (transformers.js, wasm) num worker, baixado uma vez (~25 MB).
   A geração de imagens por cena (IA na nuvem) passa SÓ por assets/fotos-nuvem.js, depois de confirm() da pessoa. */
(function () {
  "use strict";
  function canvasDe(img, max) {
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(1, (max || 1400) / Math.max(w, h));
    var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c;
  }
  function imagemDe(blob) {
    return new Promise(function (ok, erro) { var u = URL.createObjectURL(blob), i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { URL.revokeObjectURL(u); erro(new Error("imagem")); }; i.src = u; });
  }
  /* corta as sobras transparentes (com margem) */
  function aparar(c) {
    var w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    var m = Math.round(Math.max(w, h) * 0.01); x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
    var n = document.createElement("canvas"); n.width = x1 - x0 + 1; n.height = y1 - y0 + 1; n.getContext("2d").drawImage(c, x0, y0, n.width, n.height, 0, 0, n.width, n.height); return n;
  }
  /* já tem transparência nas bordas? (PNG recortado) */
  function jaRecortado(c) {
    var w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, t = 0, n = 0, k;
    for (k = 0; k < w; k += 4) { n += 2; if (d[k * 4 + 3] < 30) t++; if (d[((h - 1) * w + k) * 4 + 3] < 30) t++; }
    for (k = 0; k < h; k += 4) { n += 2; if (d[k * w * 4 + 3] < 30) t++; if (d[(k * w + w - 1) * 4 + 3] < 30) t++; }
    return t / n > 0.6;
  }
  /* fundo liso: cor média das bordas; se as bordas não forem parecidas entre si, devolve null (precisa da IA) */
  function recortarLiso(origem) {
    var c = document.createElement("canvas"); c.width = origem.width; c.height = origem.height; var x = c.getContext("2d", {willReadFrequently: true}); x.drawImage(origem, 0, 0);
    var w = c.width, h = c.height, img = x.getImageData(0, 0, w, h), d = img.data, N = w * h, am = [], k, passo = Math.max(1, Math.round(Math.max(w, h) / 80));
    for (k = 0; k < w; k += passo) am.push(k, (h - 1) * w + k);
    for (k = 0; k < h; k += passo) am.push(k * w, k * w + w - 1);
    var r = 0, g = 0, b = 0; am.forEach(function (p) { r += d[p * 4]; g += d[p * 4 + 1]; b += d[p * 4 + 2]; }); r /= am.length; g /= am.length; b /= am.length;
    var dist = function (p) { var a = d[p * 4] - r, bb = d[p * 4 + 1] - g, cc = d[p * 4 + 2] - b; return Math.sqrt(a * a + bb * bb + cc * cc); };
    var perto = am.filter(function (p) { return dist(p) < 48; }).length;
    if (perto / am.length < 0.82) return null;
    var tol = 52, fora = new Uint8Array(N), fila = [], q;
    var tenta = function (p) { if (p < 0 || p >= N || fora[p]) return; if (dist(p) < tol) { fora[p] = 1; fila.push(p); } };
    for (k = 0; k < w; k++) { tenta(k); tenta((h - 1) * w + k); } for (k = 0; k < h; k++) { tenta(k * w); tenta(k * w + w - 1); }
    while (fila.length) { q = fila.pop(); var qx = q % w; if (qx > 0) tenta(q - 1); if (qx < w - 1) tenta(q + 1); tenta(q - w); tenta(q + w); }
    var saiu = 0; for (k = 0; k < N; k++) if (fora[k]) saiu++;
    if (saiu < N * 0.05 || saiu > N * 0.97) return null;
    for (k = 0; k < N; k++) if (fora[k]) d[k * 4 + 3] = 0;
    /* borda suave: pixel que encosta no fundo fica meio transparente conforme a semelhança com o fundo (sem halo) */
    for (k = 0; k < N; k++) {
      if (fora[k]) continue; var px = k % w, viz = (px > 0 && fora[k - 1]) || (px < w - 1 && fora[k + 1]) || (k >= w && fora[k - w]) || (k < N - w && fora[k + w]);
      if (viz) { var s = Math.max(0, Math.min(1, (dist(k) - tol * 0.5) / (tol * 1.5))); d[k * 4 + 3] = Math.min(d[k * 4 + 3], Math.round(255 * (0.35 + 0.65 * s))); }
    }
    x.putImageData(img, 0, 0);
    return aparar(c);
  }
  /* IA de recorte no aparelho (mesmo modelo do editor de fotos) */
  var TF = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2", worker = null, espera = {}, nPed = 0, aoBaixar = null;
  function iniciar() {
    if (worker) return worker;
    var codigo = [
      'import { pipeline, RawImage } from "' + TF + '";',
      'let seg = null; const vistos = {};',
      'const prog = (p) => { if (p.status === "progress" && p.total) { vistos[p.file] = [p.loaded, p.total]; let l = 0, t = 0; for (const k in vistos) { l += vistos[k][0]; t += vistos[k][1]; } postMessage({ tipo: "baixando", pct: t ? l / t : 0, mb: Math.round(t / 1048576) }); } };',
      'self.onmessage = async (ev) => { const d = ev.data; try {',
      '  if (!seg) seg = await pipeline("background-removal", "Xenova/modnet", { device: "wasm", dtype: "fp32", progress_callback: prog });',
      '  let out = await seg(new RawImage(new Uint8ClampedArray(d.buf), d.w, d.h, 4)); if (Array.isArray(out)) out = out[0];',
      '  const n = out.width * out.height, a = new Uint8ClampedArray(n);',
      '  for (let i = 0; i < n; i++) a[i] = out.channels === 4 ? out.data[i * 4 + 3] : out.data[i * out.channels];',
      '  postMessage({ tipo: "mascara", id: d.id, w: out.width, h: out.height, buf: a.buffer }, [a.buffer]);',
      '} catch (e) { postMessage({ tipo: "erro", id: d.id, msg: String(e && e.message || e) }); } };'
    ].join("\n");
    worker = new Worker(URL.createObjectURL(new Blob([codigo], {type: "text/javascript"})), {type: "module"});
    worker.onmessage = function (ev) {
      var d = ev.data; if (d.tipo === "baixando") { if (aoBaixar) aoBaixar(d.pct, d.mb); return; }
      var cb = espera[d.id]; if (!cb) return; delete espera[d.id]; d.tipo === "erro" ? cb.erro(new Error(d.msg)) : cb.ok(d);
    };
    worker.onerror = function (e) { Object.keys(espera).forEach(function (k) { espera[k].erro(new Error(e.message || "worker")); delete espera[k]; }); worker = null; };
    return worker;
  }
  function recortarIA(origem, progresso) {
    aoBaixar = progresso || null;
    var c = canvasDe(origem, 1024), w = c.width, h = c.height, buf = c.getContext("2d").getImageData(0, 0, w, h).data.buffer, id = ++nPed;
    return new Promise(function (ok, erro) { espera[id] = {ok: ok, erro: erro}; iniciar().postMessage({id: id, w: w, h: h, buf: buf}, [buf]); }).then(function (m) {
      var mc = document.createElement("canvas"); mc.width = m.w; mc.height = m.h; var mx = mc.getContext("2d"), mi = mx.createImageData(m.w, m.h), a = new Uint8ClampedArray(m.buf);
      for (var i = 0; i < a.length; i++) { mi.data[i * 4 + 3] = a[i]; }
      mx.putImageData(mi, 0, 0);
      var out = document.createElement("canvas"); out.width = origem.width; out.height = origem.height; var ox = out.getContext("2d");
      ox.drawImage(origem, 0, 0); ox.globalCompositeOperation = "destination-in"; ox.drawImage(mc, 0, 0, out.width, out.height);
      return aparar(out);
    });
  }
  function pngDe(c) { return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, "image/png"); }); }
  function jpgPequeno(c, lado) { var k = Math.min(1, (lado || 504) / Math.max(c.width, c.height)), n = document.createElement("canvas"); n.width = Math.round(c.width * k); n.height = Math.round(c.height * k);
    var x = n.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, n.width, n.height); x.drawImage(c, 0, 0, n.width, n.height);
    return new Promise(function (ok) { n.toBlob(function (b) { ok(b); }, "image/jpeg", 0.88); }); }
  window.BWReelsAvatar = {canvasDe: canvasDe, imagemDe: imagemDe, recortarLiso: recortarLiso, recortarIA: recortarIA, jaRecortado: jaRecortado, aparar: aparar, pngDe: pngDe, jpgPequeno: jpgPequeno};
})();
