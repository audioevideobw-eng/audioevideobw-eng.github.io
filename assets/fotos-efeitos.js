/* BW · EFEITOS do editor de fotos (24/11, dono: "efeitos automáticos — movimento, cor, opacidade, os que vão misturando e
   sumindo nas bordas, luz, giro, desfoque, diversos; pesquise e crie").
   Tudo DESENHO PRÓPRIO em canvas 2D e roda NO APARELHO (nada sai): desfoque por reduzir/ampliar (vale no iPhone, sem ctx.filter),
   movimento/zoom/giro por cópias deslocadas, cor por conta de pixel. Cada efeito = { t: id, f: força 0–100 }; a pilha vale em ordem.
   API: BWFotoFx.LISTA, BWFotoFx.GRUPOS, BWFotoFx.aplicar(canvas, efs) → canvas novo do mesmo tamanho, BWFotoFx.cache(chave, fn). */
(function () {
  "use strict";
  function tela(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; }
  function copia(c) { var o = tela(c.width, c.height); o.getContext("2d").drawImage(c, 0, 0); return o; }
  function lim(v, a, b) { return v < a ? a : v > b ? b : v; }
  /* desfoque que funciona em qualquer navegador: reduz e amplia em passos */
  function borrar(c, raio) {
    if (raio < 0.6) return copia(c);
    var w = c.width, h = c.height, k = Math.max(1.6, raio / 2.2), sw = Math.max(1, Math.round(w / k)), sh = Math.max(1, Math.round(h / k));
    var a = tela(sw, sh), ax = a.getContext("2d"); ax.imageSmoothingEnabled = true; ax.imageSmoothingQuality = "high"; ax.drawImage(c, 0, 0, sw, sh);
    var b2 = tela(Math.max(1, sw >> 1) || 1, Math.max(1, sh >> 1) || 1); if (k > 6) { b2.getContext("2d").drawImage(a, 0, 0, b2.width, b2.height); a = b2; }
    var o = tela(w, h), ox = o.getContext("2d"); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = "high"; ox.drawImage(a, 0, 0, w, h); return o;
  }
  function pix(c, fn) {
    var x = c.getContext("2d", { willReadFrequently: true }), d = x.getImageData(0, 0, c.width, c.height), p = d.data;
    for (var i = 0; i < p.length; i += 4) fn(p, i); x.putImageData(d, 0, 0); return c;
  }
  function misturar(base, topo, op, alpha) { var x = base.getContext("2d"); x.save(); x.globalAlpha = alpha; x.globalCompositeOperation = op || "source-over"; x.drawImage(topo, 0, 0); x.restore(); return base; }
  /* máscara de alfa: fn(nx, ny) → 0..1 (multiplica a transparência) */
  function alfaPor(c, fn) {
    var w = c.width, h = c.height; return pix(c, function (p, i) { var q = i >> 2, x = q % w, y = (q / w) | 0; p[i + 3] = p[i + 3] * lim(fn(x / w, y / h), 0, 1); });
  }
  function suave(t) { t = lim(t, 0, 1); return t * t * (3 - 2 * t); }
  function rastro(c, n, passo) {   /* n cópias com deslocamento/escala/giro passo(i) → {dx,dy,s,r} */
    var w = c.width, h = c.height, o = tela(w, h), x = o.getContext("2d");
    for (var i = 0; i < n; i++) { var p = passo(i / (n - 1 || 1)); x.save(); x.globalAlpha = 1 / (i + 1); x.translate(w / 2 + (p.dx || 0), h / 2 + (p.dy || 0)); x.rotate(p.r || 0); x.scale(p.s || 1, p.s || 1); x.drawImage(c, -w / 2, -h / 2); x.restore(); }
    return o;
  }
  function hexRgb(hx) { var n = parseInt(String(hx || "#000").slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function luz(p, i) { return 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; }

  var E = {
    /* ===== MOVIMENTO ===== */
    mov_h: ["⇢", "MOVIMENTO →", "mov", function (c, f) { var d = c.width * 0.06 * f; return rastro(c, 14, function (t) { return { dx: (t - 0.5) * d }; }); }],
    mov_v: ["⇣", "QUEDA ↓", "mov", function (c, f) { var d = c.height * 0.06 * f; return rastro(c, 14, function (t) { return { dy: (t - 0.5) * d }; }); }],
    mov_diag: ["↘", "VELOCIDADE", "mov", function (c, f) { var d = Math.max(c.width, c.height) * 0.05 * f; return rastro(c, 14, function (t) { return { dx: (t - 0.5) * d, dy: (t - 0.5) * d * 0.5 }; }); }],
    zoom: ["◎", "ZOOM EXPLOSÃO", "mov", function (c, f) { return rastro(c, 16, function (t) { return { s: 1 + t * 0.12 * f }; }); }],
    tremido: ["≋", "TREMIDO", "mov", function (c, f) { var d = c.width * 0.012 * f, o = copia(c); misturar(o, rastro(c, 3, function (t) { return { dx: (t - 0.5) * 2 * d, dy: (0.5 - t) * d }; }), "source-over", 0.55); return o; }],
    /* ===== GIRO ===== */
    giro: ["⟳", "GIRO", "giro", function (c, f) { var a = 0.16 * f; return rastro(c, 18, function (t) { return { r: (t - 0.5) * a }; }); }],
    redemoinho: ["🌀", "REDEMOINHO", "giro", function (c, f) {
      var w = c.width, h = c.height, src = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data, o = tela(w, h), ox = o.getContext("2d"), d = ox.createImageData(w, h), p = d.data;
      var cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.55, ang = 3.2 * f;
      for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var dx = x - cx, dy = y - cy, r = Math.sqrt(dx * dx + dy * dy), a = r < R ? ang * (1 - r / R) * (1 - r / R) : 0, cs = Math.cos(a), sn = Math.sin(a);
        var sx = lim(Math.round(cx + dx * cs - dy * sn), 0, w - 1), sy = lim(Math.round(cy + dx * sn + dy * cs), 0, h - 1), j = (sy * w + sx) * 4, k = (y * w + x) * 4;
        p[k] = src[j]; p[k + 1] = src[j + 1]; p[k + 2] = src[j + 2]; p[k + 3] = src[j + 3]; }
      ox.putImageData(d, 0, 0); return o; }],
    inclina: ["⤺", "INCLINAR", "giro", function (c, f) { var o = tela(c.width, c.height), x = o.getContext("2d"); x.translate(c.width / 2, c.height / 2); x.rotate(-0.12 * f); var s = 1 + 0.18 * f; x.scale(s, s); x.drawImage(c, -c.width / 2, -c.height / 2); return o; }],
    /* ===== DESFOQUE ===== */
    desfoque: ["◌", "DESFOQUE", "desf", function (c, f) { return borrar(c, Math.max(c.width, c.height) * 0.012 * f); }],
    tilt: ["⇕", "MINIATURA (TILT)", "desf", function (c, f) { var b = borrar(c, Math.max(c.width, c.height) * 0.01 * f), o = copia(c); alfaPor(b, function (nx, ny) { return suave(Math.abs(ny - 0.5) / 0.32 - 0.25); }); misturar(o, b, "source-over", 1); return o; }],
    foco: ["◉", "FOCO NO CENTRO", "desf", function (c, f) { var b = borrar(c, Math.max(c.width, c.height) * 0.011 * f), o = copia(c); alfaPor(b, function (nx, ny) { var dx = nx - 0.5, dy = ny - 0.5; return suave(Math.sqrt(dx * dx + dy * dy) / 0.42 - 0.35); }); misturar(o, b, "source-over", 1); return o; }],
    sonho: ["☁", "SONHO", "desf", function (c, f) { var o = copia(c); misturar(o, borrar(c, Math.max(c.width, c.height) * 0.02), "screen", 0.55 * f); return o; }],
    /* ===== OPACIDADE E BORDAS (some aos poucos) ===== */
    some_bordas: ["◍", "SOME NAS BORDAS", "op", function (c, f) { var r = 0.5 - 0.3 * f; return alfaPor(copia(c), function (nx, ny) { var dx = (nx - 0.5) / 0.5, dy = (ny - 0.5) / 0.5, d = Math.sqrt(dx * dx + dy * dy); return 1 - suave((d - (1 - f * 0.75)) / (0.55 * f + 0.05)); }); }],
    some_lados: ["◫", "SOME NOS LADOS", "op", function (c, f) { return alfaPor(copia(c), function (nx) { var e = Math.min(nx, 1 - nx); return suave(e / (0.38 * f + 0.02)); }); }],
    some_baixo: ["▼", "SOME EMBAIXO", "op", function (c, f) { return alfaPor(copia(c), function (nx, ny) { return suave((1 - ny) / (0.7 * f + 0.02)); }); }],
    some_cima: ["▲", "SOME EM CIMA", "op", function (c, f) { return alfaPor(copia(c), function (nx, ny) { return suave(ny / (0.7 * f + 0.02)); }); }],
    transparente: ["◐", "TRANSPARÊNCIA", "op", function (c, f) { var k = 1 - 0.85 * f; return alfaPor(copia(c), function () { return k; }); }],
    vinheta: ["◼", "VINHETA ESCURA", "op", function (c, f) { var w = c.width, h = c.height, o = copia(c), x = o.getContext("2d"), g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + (0.85 * f) + ")"); x.globalCompositeOperation = "source-atop"; x.fillStyle = g; x.fillRect(0, 0, w, h); return o; }],
    /* ===== LUZ ===== */
    brilho: ["✦", "BRILHO SUAVE", "luz", function (c, f) { var o = copia(c), b = borrar(c, Math.max(c.width, c.height) * 0.03); pix(b, function (p, i) { var l = luz(p, i), k = l > 150 ? 1 : l / 150 * 0.2; p[i] *= k; p[i + 1] *= k; p[i + 2] *= k; }); misturar(o, b, "screen", 0.9 * f); return o; }],
    luz_quente: ["☀", "LUZ QUENTE", "luz", function (c, f) { var w = c.width, h = c.height, o = copia(c), x = o.getContext("2d"), g = x.createRadialGradient(0, h * 0.2, 0, 0, h * 0.2, Math.max(w, h) * 0.8); g.addColorStop(0, "rgba(255,170,60," + 0.9 * f + ")"); g.addColorStop(0.5, "rgba(255,90,40," + 0.35 * f + ")"); g.addColorStop(1, "rgba(255,90,40,0)"); x.globalCompositeOperation = "source-atop"; x.globalCompositeOperation = "screen"; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = "destination-in"; x.drawImage(c, 0, 0); return o; }],
    luz_fria: ["❄", "LUZ FRIA", "luz", function (c, f) { var w = c.width, h = c.height, o = copia(c), x = o.getContext("2d"), g = x.createRadialGradient(w, 0, 0, w, 0, Math.max(w, h) * 0.85); g.addColorStop(0, "rgba(90,180,255," + 0.85 * f + ")"); g.addColorStop(1, "rgba(60,90,255,0)"); x.globalCompositeOperation = "screen"; x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = "destination-in"; x.drawImage(c, 0, 0); return o; }],
    raio_sol: ["🌞", "RAIOS DE SOL", "luz", function (c, f) { var w = c.width, h = c.height, o = copia(c), x = o.getContext("2d"), cx = w * 0.82, cy = h * 0.12, R = Math.max(w, h) * 1.3; x.globalCompositeOperation = "screen";
      for (var i = 0; i < 14; i++) { var a = Math.PI * 0.55 + i * 0.09; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a + 0.035) * R, cy + Math.sin(a + 0.035) * R); x.closePath(); var g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7); g.addColorStop(0, "rgba(255,240,200," + 0.45 * f + ")"); g.addColorStop(1, "rgba(255,240,200,0)"); x.fillStyle = g; x.fill(); }
      var g2 = x.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.35); g2.addColorStop(0, "rgba(255,250,230," + 0.95 * f + ")"); g2.addColorStop(1, "rgba(255,200,120,0)"); x.fillStyle = g2; x.fillRect(0, 0, w, h); x.globalCompositeOperation = "destination-in"; x.drawImage(c, 0, 0); return o; }],
    neon: ["⚡", "CONTORNO NEON", "luz", function (c, f) { var w = c.width, h = c.height, s = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data, e = tela(w, h), ex = e.getContext("2d"), d = ex.createImageData(w, h), p = d.data;
      for (var y = 1; y < h - 1; y++) for (var x2 = 1; x2 < w - 1; x2++) { var i = (y * w + x2) * 4, gx = luz(s, i + 4) - luz(s, i - 4), gy = luz(s, i + w * 4) - luz(s, i - w * 4), m = lim(Math.sqrt(gx * gx + gy * gy) * 2, 0, 255); p[i] = m * 0.3; p[i + 1] = m; p[i + 2] = m; p[i + 3] = 255; }
      ex.putImageData(d, 0, 0); var o = copia(c), ox = o.getContext("2d"); ox.globalAlpha = 1 - 0.6 * f; ox.fillStyle = "#000"; ox.globalCompositeOperation = "source-atop"; ox.globalAlpha = 0.6 * f; ox.fillRect(0, 0, w, h); ox.globalAlpha = 1;
      ox.globalCompositeOperation = "screen"; ox.drawImage(borrar(e, 3), 0, 0); ox.drawImage(e, 0, 0); ox.globalCompositeOperation = "destination-in"; ox.drawImage(c, 0, 0); return o; }],
    /* ===== COR ===== */
    pb_drama: ["◑", "P&B DRAMÁTICO", "cor", function (c, f) { return pix(copia(c), function (p, i) { var l = luz(p, i), v = lim((l - 128) * (1 + 0.8 * f) + 128, 0, 255); p[i] = p[i] + (v - p[i]) * f; p[i + 1] = p[i + 1] + (v - p[i + 1]) * f; p[i + 2] = p[i + 2] + (v - p[i + 2]) * f; }); }],
    sepia: ["☕", "SÉPIA", "cor", function (c, f) { return pix(copia(c), function (p, i) { var r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = r + (lim(r * .393 + g * .769 + b * .189, 0, 255) - r) * f; p[i + 1] = g + (lim(r * .349 + g * .686 + b * .168, 0, 255) - g) * f; p[i + 2] = b + (lim(r * .272 + g * .534 + b * .131, 0, 255) - b) * f; }); }],
    duotom: ["◧", "DUOTOM", "cor", function (c, f, o2) { var a = hexRgb(o2.c1 || "#1b1464"), b = hexRgb(o2.c2 || "#ffb547"); return pix(copia(c), function (p, i) { var t = luz(p, i) / 255; for (var k = 0; k < 3; k++) p[i + k] = p[i + k] + (a[k] + (b[k] - a[k]) * t - p[i + k]) * f; }); }],
    pop: ["🎨", "CORES POP", "cor", function (c, f) { return pix(copia(c), function (p, i) { var l = luz(p, i), s = 1 + 1.4 * f; for (var k = 0; k < 3; k++) p[i + k] = lim(l + (p[i + k] - l) * s, 0, 255); }); }],
    cruzado: ["✚", "FILME CRUZADO", "cor", function (c, f) { return pix(copia(c), function (p, i) { var r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255; var r2 = suave(r * 1.1), g2 = g * 1.05 + 0.03, b2 = b * 0.8 + 0.12; p[i] += (r2 * 255 - p[i]) * f; p[i + 1] += (lim(g2, 0, 1) * 255 - p[i + 1]) * f; p[i + 2] += (b2 * 255 - p[i + 2]) * f; }); }],
    inverter: ["⊖", "NEGATIVO", "cor", function (c, f) { return pix(copia(c), function (p, i) { for (var k = 0; k < 3; k++) p[i + k] = p[i + k] + (255 - 2 * p[i + k]) * f; }); }],
    matiz: ["🌈", "TROCAR CORES", "cor", function (c, f) { var a = f * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a), m = [.213 + cs * .787 - sn * .213, .715 - cs * .715 - sn * .715, .072 - cs * .072 + sn * .928, .213 - cs * .213 + sn * .143, .715 + cs * .285 + sn * .14, .072 - cs * .072 - sn * .283, .213 - cs * .213 - sn * .787, .715 - cs * .715 + sn * .715, .072 + cs * .928 + sn * .072];
      return pix(copia(c), function (p, i) { var r = p[i], g = p[i + 1], b = p[i + 2]; p[i] = lim(m[0] * r + m[1] * g + m[2] * b, 0, 255); p[i + 1] = lim(m[3] * r + m[4] * g + m[5] * b, 0, 255); p[i + 2] = lim(m[6] * r + m[7] * g + m[8] * b, 0, 255); }); }],
    so_vermelho: ["🔴", "SÓ O VERMELHO", "cor", function (c, f) { return pix(copia(c), function (p, i) { var r = p[i], g = p[i + 1], b = p[i + 2], l = luz(p, i), ver = lim((r - Math.max(g, b)) / 60, 0, 1), k = f * (1 - ver); p[i] = r + (l - r) * k; p[i + 1] = g + (l - g) * k; p[i + 2] = b + (l - b) * k; }); }],
    /* ===== DIVERSOS ===== */
    glitch: ["▚", "GLITCH", "div", function (c, f) { var w = c.width, h = c.height, o = tela(w, h), x = o.getContext("2d"), d = Math.round(w * 0.012 * f) + 1, sem = 7;
      var ca = tela(w, h), cx = ca.getContext("2d"); cx.drawImage(c, 0, 0); cx.globalCompositeOperation = "multiply"; cx.fillStyle = "#f00"; cx.fillRect(0, 0, w, h); cx.globalCompositeOperation = "destination-in"; cx.drawImage(c, 0, 0);
      var cb = tela(w, h), bx = cb.getContext("2d"); bx.drawImage(c, 0, 0); bx.globalCompositeOperation = "multiply"; bx.fillStyle = "#0ff"; bx.fillRect(0, 0, w, h); bx.globalCompositeOperation = "destination-in"; bx.drawImage(c, 0, 0);
      x.globalCompositeOperation = "lighter"; x.drawImage(ca, -d, 0); x.drawImage(cb, d, 0); x.globalCompositeOperation = "source-over";
      for (var i = 0; i < 6 + 6 * f; i++) { sem = (sem * 9301 + 49297) % 233280; var y = sem / 233280 * h, hh = h * 0.02 + (sem % 7) * h * 0.006; sem = (sem * 9301 + 49297) % 233280; var dx = (sem / 233280 - 0.5) * w * 0.08 * f; x.drawImage(o, 0, y, w, hh, dx, y, w, hh); }
      return o; }],
    aberracao: ["⦿", "ABERRAÇÃO (RGB)", "div", function (c, f) { var w = c.width, h = c.height, o = tela(w, h), x = o.getContext("2d"), d = Math.round(Math.max(w, h) * 0.008 * f) + 1, cores = ["#f00", "#0f0", "#00f"], des = [[-d, 0], [0, 0], [d, 0]];
      x.globalCompositeOperation = "lighter"; for (var k = 0; k < 3; k++) { var t = tela(w, h), tx = t.getContext("2d"); tx.drawImage(c, 0, 0); tx.globalCompositeOperation = "multiply"; tx.fillStyle = cores[k]; tx.fillRect(0, 0, w, h); tx.globalCompositeOperation = "destination-in"; tx.drawImage(c, 0, 0); x.drawImage(t, des[k][0], des[k][1]); } return o; }],
    pixel: ["▦", "PIXELAR", "div", function (c, f) { var w = c.width, h = c.height, k = Math.max(2, Math.round(Math.max(w, h) * 0.035 * f)), a = tela(Math.ceil(w / k), Math.ceil(h / k)); a.getContext("2d").drawImage(c, 0, 0, a.width, a.height); var o = tela(w, h), x = o.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(a, 0, 0, w, h); return o; }],
    meio_tom: ["⁘", "MEIO-TOM (PONTINHOS)", "div", function (c, f) { var w = c.width, h = c.height, s = Math.max(4, Math.round(Math.max(w, h) * 0.012 * (0.4 + f))), a = tela(Math.ceil(w / s), Math.ceil(h / s)), ax = a.getContext("2d", { willReadFrequently: true }); ax.drawImage(c, 0, 0, a.width, a.height); var d = ax.getImageData(0, 0, a.width, a.height).data;
      var o = tela(w, h), x = o.getContext("2d"); x.fillStyle = "#f6f1e6"; x.fillRect(0, 0, w, h); x.fillStyle = "#121212";
      for (var j = 0; j < a.height; j++) for (var i = 0; i < a.width; i++) { var q = (j * a.width + i) * 4, l = 1 - luz(d, q) / 255; if (d[q + 3] < 20) continue; x.beginPath(); x.arc(i * s + s / 2, j * s + s / 2, s * 0.55 * Math.sqrt(l), 0, 7); x.fill(); }
      var r = copia(c); misturar(r, o, "source-atop", f); return r; }],
    granulado: ["░", "GRANULADO", "div", function (c, f) { var sem = 1; return pix(copia(c), function (p, i) { sem = (sem * 16807) % 2147483647; var n = (sem / 2147483647 - 0.5) * 90 * f; p[i] = lim(p[i] + n, 0, 255); p[i + 1] = lim(p[i + 1] + n, 0, 255); p[i + 2] = lim(p[i + 2] + n, 0, 255); }); }],
    posterizar: ["▤", "CARTAZ (POSTER)", "div", function (c, f) { var n = Math.round(8 - 6 * f), st = 255 / (n - 1 || 1); return pix(copia(c), function (p, i) { for (var k = 0; k < 3; k++) p[i + k] = Math.round(p[i + k] / st) * st; }); }],
    espelho: ["⫼", "ESPELHO", "div", function (c, f) { var w = c.width, h = c.height, o = copia(c), x = o.getContext("2d"); x.save(); x.beginPath(); x.rect(w / 2, 0, w / 2, h); x.clip(); x.translate(w, 0); x.scale(-1, 1); x.globalAlpha = 0.35 + 0.65 * f; x.drawImage(c, 0, 0); x.restore(); return o; }],
    desenho: ["✏", "DESENHO A LÁPIS", "div", function (c, f) { var w = c.width, h = c.height, s = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, w, h).data, o = copia(c), ox = o.getContext("2d", { willReadFrequently: true }), d = ox.getImageData(0, 0, w, h), p = d.data;
      for (var y = 1; y < h - 1; y++) for (var x2 = 1; x2 < w - 1; x2++) { var i = (y * w + x2) * 4, gx = luz(s, i + 4) - luz(s, i - 4), gy = luz(s, i + w * 4) - luz(s, i - w * 4), v = 255 - lim(Math.sqrt(gx * gx + gy * gy) * 2.2, 0, 255); for (var k = 0; k < 3; k++) p[i + k] = p[i + k] + (v - p[i + k]) * f; }
      ox.putImageData(d, 0, 0); return o; }]
  };
  var GRUPOS = [["mov", "MOVIMENTO"], ["giro", "GIRO"], ["desf", "DESFOQUE"], ["op", "OPACIDADE E BORDAS (SOME AOS POUCOS)"], ["luz", "LUZ"], ["cor", "COR"], ["div", "DIVERSOS"]];
  /* combinações prontas (o "automático"): um toque monta a pilha */
  var AUTO = [
    ["✨ SONHO DE CASAMENTO", [["sonho", 55], ["brilho", 45], ["some_bordas", 35]]],
    ["🏎 VELOCIDADE", [["mov_h", 70], ["vinheta", 40]]],
    ["🎬 CINEMA", [["cruzado", 60], ["vinheta", 55], ["granulado", 25]]],
    ["🎆 SHOW / BALADA", [["zoom", 45], ["neon", 50], ["pop", 40]]],
    ["📼 RETRÔ", [["sepia", 55], ["granulado", 45], ["vinheta", 45]]],
    ["🌀 HIPNOSE", [["giro", 55], ["matiz", 30]]],
    ["🏙 MINIATURA", [["tilt", 75], ["pop", 45]]],
    ["💥 GLITCH ARTE", [["glitch", 60], ["aberracao", 45]]],
    ["🖤 DRAMA P&B", [["pb_drama", 100], ["vinheta", 60]]],
    ["🌅 PÔR DO SOL", [["luz_quente", 70], ["raio_sol", 45]]],
    ["👻 SUMINDO", [["some_bordas", 70], ["transparente", 25]]],
    ["🗞 JORNAL", [["meio_tom", 85]]]
  ];
  var LISTA = Object.keys(E).map(function (k) { return { id: k, ico: E[k][0], nome: E[k][1], g: E[k][2] }; });
  function aplicar(c, efs, opc) {
    if (!efs || !efs.length) return c; var o = c;
    efs.forEach(function (e) { var d = E[e.t]; if (!d || e.des) return; var f = lim((e.f == null ? 60 : e.f) / 100, 0, 1); if (f <= 0) return;
      try { var n = d[3](o, f, e); if (n && n !== o) { if (o !== c) o.width = o.height = 1; o = n; } } catch (er) { } });
    return o;
  }
  var CACHE = [];
  function cache(chave, fn) { for (var i = 0; i < CACHE.length; i++) if (CACHE[i][0] === chave) return CACHE[i][1]; var v = fn(); CACHE.push([chave, v]); if (CACHE.length > 12) { var v0 = CACHE.shift()[1]; if (v0 && v0.width) v0.width = v0.height = 1; } return v; }
  window.BWFotoFx = { LISTA: LISTA, GRUPOS: GRUPOS, AUTO: AUTO, aplicar: aplicar, cache: cache, existe: function (t) { return !!E[t]; } };
})();
