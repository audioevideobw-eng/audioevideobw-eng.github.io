/* BW RASTREIO (22/11/2026, pedido do dono: "inserir um elemento — fogo em overlay — e rastrear na mão da pessoa; onde ela mexe a mão ele
   acompanha; rastreio automático com modelos, assim como nos textos").
   Acha UM PONTO em cada quadro de um take, NO APARELHO, e devolve o caminho dele (fração da imagem, quadro a quadro). Três jeitos:
     · MÃO   — MediaPipe Hand Landmarker (Google, Apache-2.0): palma, ponta do indicador, polegar, dedo médio ou pulso; esquerda/direita/qualquer.
     · CORPO — MediaPipe Pose Landmarker lite: cabeça (nariz), ombros, mãos (pulsos), quadril, pés.
     · PONTO ESCOLHIDO — rastreador de "modelo" (como o Point Tracker dos editores de mesa): a pessoa toca num ponto com contraste
       (um objeto, um logo, uma luz) e o app procura aquele pedacinho da imagem em cada quadro (correlação normalizada), para frente e para trás.
   Nada sai do aparelho: o vídeo não é enviado; só os MODELOS e a biblioteca do MediaPipe são baixados uma vez (como a máscara com IA).
   Quadro sem a mão/corpo → o caminho é preenchido entre os vizinhos; depois uma suavização leve tira o tremido.
   Uso: BWRastreio.analisar(midia, {modo: "mao"|"corpo"|"manual", ponto, mao, inicio: {t, x, y}, fps, aoAndar}) → {fps, fw, fh, pts: [[x, y, s, ok]]}
        BWRastreio.em(r, tempoNaMidia, suave) → {x, y, s} · BWRastreio.cancelar() · BWRastreio.PONTOS */
(function () {
  "use strict";
  var MP = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MOD = {
    mao: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
    corpo: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task"
  };
  /* pontos de cada modelo (índices oficiais: mão 21 pontos, corpo 33). "s" = medida do tamanho, para o item crescer/encolher junto. */
  var PONTOS = {
    mao: {palma: {nome: "✋ Palma", i: [0, 5, 9, 13, 17]}, indicador: {nome: "☝ Ponta do indicador", i: [8]}, polegar: {nome: "👍 Ponta do polegar", i: [4]},
      medio: {nome: "🖐 Ponta do dedo médio", i: [12]}, pulso: {nome: "⌚ Pulso", i: [0]}},
    corpo: {cabeca: {nome: "🙂 Cabeça", i: [0]}, ombroE: {nome: "Ombro (esquerda da tela)", i: [12]}, ombroD: {nome: "Ombro (direita da tela)", i: [11]},
      maoE: {nome: "✋ Mão (esquerda da tela)", i: [16, 18, 20]}, maoD: {nome: "✋ Mão (direita da tela)", i: [15, 17, 19]}, peito: {nome: "Peito", i: [11, 12]},
      quadril: {nome: "Quadril", i: [23, 24]}, peE: {nome: "Pé (esquerda da tela)", i: [28, 32]}, peD: {nome: "Pé (direita da tela)", i: [27, 31]}}
  };
  var BASE = null, TAREFA = {}, TS = 1, CANCELAR = false, TMP = {};
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function tela(nome, w, h) { var c = TMP[nome]; if (!c) c = TMP[nome] = document.createElement("canvas"); if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } return c; }
  function esperar(el, ev, ms) { return new Promise(function (ok) { var feito = false, f = function () { if (feito) return; feito = true; el.removeEventListener(ev, f); ok(); }; el.addEventListener(ev, f); setTimeout(f, ms); }); }
  function tarefa(modo) {
    if (window.__BWRastreioTeste) return Promise.resolve({teste: true});
    if (TAREFA[modo]) return Promise.resolve(TAREFA[modo]);
    if (!BASE) BASE = import(MP + "/vision_bundle.mjs").then(function (v) { return v.FilesetResolver.forVisionTasks(MP + "/wasm").then(function (fs) { return {v: v, fs: fs}; }); }).catch(function (e) { BASE = null; throw e; });
    return BASE.then(function (b) {
      var op = {baseOptions: {modelAssetPath: MOD[modo], delegate: "CPU"}, runningMode: "VIDEO"};   /* CPU: no iPhone a GPU dá resultado diferente (PENTE FINO 49) */
      return modo === "mao" ? b.v.HandLandmarker.createFromOptions(b.fs, Object.assign(op, {numHands: 2, minHandDetectionConfidence: 0.4, minTrackingConfidence: 0.4}))
        : b.v.PoseLandmarker.createFromOptions(b.fs, Object.assign(op, {numPoses: 1}));
    }).then(function (t) { TAREFA[modo] = t; return t; });
  }
  /* um quadro → o ponto pedido (fração da imagem) ou null */
  function detectar(t, modo, img, o, ant) {
    var lista;
    if (t.teste) lista = window.__BWRastreioTeste(img, modo) || [];
    else { var r = t.detectForVideo(img, TS); TS += 34; lista = modo === "mao" ? (r.landmarks || []).map(function (l, k) { var h = r.handedness && r.handedness[k] && r.handedness[k][0]; return {l: l, lado: h ? h.categoryName : ""}; }) : (r.landmarks || []).map(function (l) { return {l: l}; }); }
    if (!lista.length) return null;
    if (modo === "mao" && o.mao && o.mao !== "qq") {   /* "esquerda/direita" = lado da TELA (é o que a pessoa vê) */
      lista = lista.filter(function (h) { var cx = media(h.l, [0, 9]).x; return o.mao === "e" ? cx < 0.5 || lista.length === 1 : cx >= 0.5 || lista.length === 1; });
      if (lista.length > 1) lista.sort(function (a, b) { return o.mao === "e" ? media(a.l, [9]).x - media(b.l, [9]).x : media(b.l, [9]).x - media(a.l, [9]).x; });
    }
    var def = PONTOS[modo][o.ponto] || PONTOS[modo][modo === "mao" ? "palma" : "cabeca"];
    var melhor = null, dist = Infinity;
    lista.forEach(function (h) { var p = media(h.l, def.i); if (!p) return; var d = ant ? Math.hypot(p.x - ant[0], p.y - ant[1]) : 0; if (d < dist) { dist = d; melhor = {p: p, l: h.l}; } });   /* várias mãos: a mais perto da anterior (continuidade) */
    if (!melhor) return null;
    var s = modo === "mao" ? dist2(melhor.l, 0, 9) : dist2(melhor.l, 11, 12);
    return [melhor.p.x, melhor.p.y, s || 0];
  }
  function media(l, idx) { var x = 0, y = 0, n = 0; idx.forEach(function (i) { var q = l[i]; if (q && (q.visibility == null || q.visibility > 0.3)) { x += q.x; y += q.y; n++; } }); return n ? {x: x / n, y: y / n} : null; }
  function dist2(l, a, b) { return l[a] && l[b] ? Math.hypot(l[a].x - l[b].x, l[a].y - l[b].y) : 0; }
  function quadro(fonte, fw, fh, lado) { var k = Math.min(1, (lado || 512) / Math.max(fw, fh)), c = tela("q" + (lado || 512), Math.max(8, Math.round(fw * k)), Math.max(8, Math.round(fh * k))); c.getContext("2d", {willReadFrequently: true}).drawImage(fonte, 0, 0, c.width, c.height); return c; }
  /* ---- rastreador de PONTO ESCOLHIDO: correlação normalizada em tons de cinza, com busca em volta da posição anterior ---- */
  function cinza(c) { var d = c.getContext("2d", {willReadFrequently: true}).getImageData(0, 0, c.width, c.height).data, g = new Float32Array(c.width * c.height); for (var i = 0; i < g.length; i++) g[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114; return {g: g, w: c.width, h: c.height}; }
  function recorte(im, cx, cy, r) { var n = 2 * r + 1, p = new Float32Array(n * n), s = 0, s2 = 0;
    for (var y = -r; y <= r; y++) for (var x = -r; x <= r; x++) { var xx = lim(Math.round(cx) + x, 0, im.w - 1), yy = lim(Math.round(cy) + y, 0, im.h - 1), v = im.g[yy * im.w + xx]; p[(y + r) * n + x + r] = v; s += v; s2 += v * v; }
    var m = s / p.length, dp = Math.sqrt(Math.max(1e-6, s2 / p.length - m * m)); for (var k = 0; k < p.length; k++) p[k] = (p[k] - m) / dp; return p; }
  function procurar(im, mod, r, px, py, raio) { var melhor = -2, bx = px, by = py, n = 2 * r + 1, passo = raio > 20 ? 2 : 1;
    var busca = function (x0, y0, rr, pp) { for (var dy = -rr; dy <= rr; dy += pp) for (var dx = -rr; dx <= rr; dx += pp) { var cx = x0 + dx, cy = y0 + dy; if (cx < r || cy < r || cx >= im.w - r || cy >= im.h - r) continue;
      var s = 0, s2 = 0, sc = 0, base; for (var y = 0; y < n; y++) { base = (cy - r + y) * im.w + cx - r; for (var x = 0; x < n; x++) { var v = im.g[base + x]; s += v; s2 += v * v; sc += v * mod[y * n + x]; } }
      var N = n * n, m = s / N, dp = Math.sqrt(Math.max(1e-6, s2 / N - m * m)), ncc = (sc / N - m * somaMod(mod) / N) / dp;   /* o modelo já tem média 0 e desvio 1 */
      if (ncc > melhor) { melhor = ncc; bx = cx; by = cy; } } };
    busca(Math.round(px), Math.round(py), raio, passo); if (passo > 1) busca(bx, by, passo, 1);
    return {x: bx, y: by, nota: melhor}; }
  var SOMA = new WeakMap(); function somaMod(m) { var s = SOMA.get(m); if (s == null) { s = 0; for (var i = 0; i < m.length; i++) s += m[i]; SOMA.set(m, s); } return s; }
  /* ---- ANALISAR o take: um quadro a cada 1/fps segundos ---- */
  async function analisar(m, o) {
    o = o || {}; CANCELAR = false; var modo = o.modo || "mao", aoAndar = o.aoAndar || function () {};
    if (m.tipo === "imagem") {   /* foto: um ponto só, parado */
      var img = m.img || await new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = erro; i.src = m.url; });
      var p0 = modo === "manual" ? [o.inicio.x, o.inicio.y, 0] : detectar(await tarefa(modo), modo, quadro(img, img.naturalWidth, img.naturalHeight), o, null);
      if (!p0) throw new Error("nao_achei"); aoAndar(1); return {fps: 0, fw: img.naturalWidth, fh: img.naturalHeight, pts: [[r3(p0[0]), r3(p0[1]), r3(p0[2]), 1]], modo: modo};
    }
    var fps = o.fps || (m.dur > 60 ? 10 : 15), v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.crossOrigin = "anonymous"; v.src = m.url;
    try {
      await esperar(v, "loadeddata", 15000); if (!v.videoWidth) throw new Error("nao_abriu");
      var dur = m.dur || v.duration || 1, n = Math.max(1, Math.ceil(dur * fps)), pts = new Array(n), fw = v.videoWidth, fh = v.videoHeight;
      var irQuadro = async function (i) { var t = Math.min(dur - 0.02, i / fps); if (Math.abs(v.currentTime - t) > 0.001) { v.currentTime = t; await esperar(v, "seeked", 4000); } };
      if (modo === "manual") {
        var LADO = 360, r = 9, i0 = lim(Math.round((o.inicio.t || 0) * fps), 0, n - 1);
        await irQuadro(i0); var q0 = cinza(quadro(v, fw, fh, LADO)), px = o.inicio.x * q0.w, py = o.inicio.y * q0.h, mod0 = recorte(q0, px, py, r); pts[i0] = [o.inicio.x, o.inicio.y, 0, 1];
        var feitos = 1;
        for (var sent = 1; sent >= -1; sent -= 2) { var mod = Float32Array.from(mod0), x = px, y = py;
          for (var i = i0 + sent; i >= 0 && i < n; i += sent) { if (CANCELAR) throw new Error("cancelado");
            await irQuadro(i); var im = cinza(quadro(v, fw, fh, LADO)), a = procurar(im, mod, r, x, y, 26);
            if (a.nota > 0.45) { x = a.x; y = a.y; pts[i] = [x / im.w, y / im.h, 0, 1];
              if (a.nota > 0.75) { var novo = recorte(im, x, y, r); for (var k = 0; k < mod.length; k++) mod[k] = mod[k] * 0.85 + novo[k] * 0.15; SOMA.delete(mod); } }   /* o modelo se atualiza devagar (luz e ângulo mudam) */
            else pts[i] = null;
            aoAndar(++feitos / n); if (feitos % 4 === 0) await new Promise(function (ok) { setTimeout(ok, 0); }); } }
      } else {
        var tf = await tarefa(modo), ant = null; TS += 1000;
        for (var j = 0; j < n; j++) { if (CANCELAR) throw new Error("cancelado");
          await irQuadro(j); var p = detectar(tf, modo, quadro(v, fw, fh, 512), o, ant); if (p) { ant = p; pts[j] = [p[0], p[1], p[2], 1]; } else pts[j] = null;
          aoAndar((j + 1) / n); if (j % 3 === 2) await new Promise(function (ok) { setTimeout(ok, 0); }); }
      }
      var achados = pts.filter(Boolean).length; if (!achados) throw new Error("nao_achei");
      return {fps: fps, fw: fw, fh: fh, pts: preencher(pts), modo: modo, achou: achados / n};
    } finally { try { v.pause(); v.removeAttribute("src"); v.load(); } catch (e) {} }   /* solta o player (PENTE FINO 180) */
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  /* buraco (quadro sem a mão) = reta entre os vizinhos; pontas = o mais perto */
  function preencher(pts) { var n = pts.length, out = new Array(n), ult = -1;
    for (var i = 0; i < n; i++) if (pts[i]) { if (ult < 0) for (var k = 0; k < i; k++) out[k] = [pts[i][0], pts[i][1], pts[i][2], 0];
      else for (var k2 = ult + 1; k2 < i; k2++) { var f = (k2 - ult) / (i - ult); out[k2] = [pts[ult][0] + (pts[i][0] - pts[ult][0]) * f, pts[ult][1] + (pts[i][1] - pts[ult][1]) * f, pts[ult][2] + (pts[i][2] - pts[ult][2]) * f, 0]; }
      out[i] = pts[i]; ult = i; }
    for (var j = ult + 1; j < n; j++) out[j] = [pts[ult][0], pts[ult][1], pts[ult][2], 0];
    return out.map(function (p) { return [r3(p[0]), r3(p[1]), r3(p[2]), p[3] ? 1 : 0]; }); }
  /* posição no tempo da mídia, com suavização (0–100: média de até ±5 quadros) */
  function em(r, tm, suave) { if (!r || !r.pts || !r.pts.length) return null; if (!r.fps) return {x: r.pts[0][0], y: r.pts[0][1], s: r.pts[0][2]};
    var f = lim(tm * r.fps, 0, r.pts.length - 1), k = Math.round(lim(suave == null ? 30 : suave, 0, 100) / 20), i0 = Math.floor(f), a = f - i0;
    var at = function (i) { if (!k) return r.pts[lim(i, 0, r.pts.length - 1)]; var x = 0, y = 0, s = 0, w = 0; for (var d = -k; d <= k; d++) { var q = r.pts[lim(i + d, 0, r.pts.length - 1)], p = k + 1 - Math.abs(d); x += q[0] * p; y += q[1] * p; s += q[2] * p; w += p; } return [x / w, y / w, s / w]; };
    var A = at(i0), B = at(i0 + 1); return {x: A[0] + (B[0] - A[0]) * a, y: A[1] + (B[1] - A[1]) * a, s: A[2] + (B[2] - A[2]) * a}; }
  window.BWRastreio = {analisar: analisar, em: em, PONTOS: PONTOS, cancelar: function () { CANCELAR = true; }};
})();
