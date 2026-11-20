/* assets/bw3d-foto.js — FOTO → 3D do ESTÚDIO 3D (v1, 20/11/2026).
   Monta uma MALHA de verdade a partir das silhuetas (PNG com alfa) de frente, lado e costas:
   escava um bloco pelas vistas (visual hull), fecha a superfície com Surface Nets, suaviza e
   pinta cada vértice com a cor das próprias imagens. Sem IA, sem rede, tudo no aparelho.
   Saída: malha do motor (verts/faces/vcor) → prévia, vídeo e EXPORTAR GLB/OBJ para o Blender. */
(function () {
  "use strict";
  function lim(x, a, b) { return x < a ? a : x > b ? b : x; }
  /* mínimo suave: onde as vistas se cruzam o canto vira curva (corpo em vez de caixa) */
  function smin(a, b, k) { var h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; }

  /* ---------- ler a imagem: máscara (alfa ou fundo liso) + cor, já enquadrada ---------- */
  function medir(d, w, h) {
    var x0 = w, y0 = h, x1 = -1, y1 = -1, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1, y1: y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  function semFundo(cv) {   /* imagem sem alfa: tira fundo liso pelas bordas */
    var x = cv.getContext("2d"), im = x.getImageData(0, 0, cv.width, cv.height), d = im.data, i;
    var cantos = [0, (cv.width - 1) * 4, (cv.height - 1) * cv.width * 4, (cv.height * cv.width - 1) * 4], base = [0, 0, 0];
    cantos.forEach(function (c) { base[0] += d[c] / 4; base[1] += d[c + 1] / 4; base[2] += d[c + 2] / 4; });
    for (i = 0; i < d.length; i += 4) {
      var dist = Math.abs(d[i] - base[0]) + Math.abs(d[i + 1] - base[1]) + Math.abs(d[i + 2] - base[2]);
      if (dist < 70) d[i + 3] = 0;
    }
    x.putImageData(im, 0, 0);
    return cv;
  }
  function preparar(img, R, altoAlvo) {
    var cv = document.createElement("canvas"), x;
    cv.width = img.width || img.naturalWidth; cv.height = img.height || img.naturalHeight;
    x = cv.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0);
    var im = x.getImageData(0, 0, cv.width, cv.height), opaca = true, i;
    for (i = 3; i < im.data.length; i += 4) if (im.data[i] < 250) { opaca = false; break; }
    if (opaca) semFundo(cv);
    var dd = x.getImageData(0, 0, cv.width, cv.height).data, cx = medir(dd, cv.width, cv.height);
    if (!cx) throw new Error("esta imagem está vazia (sem recorte): use PNG com fundo transparente");
    /* reenquadra: a silhueta ocupa altoAlvo da grade, centrada em x, apoiada embaixo */
    var out = document.createElement("canvas"); out.width = R; out.height = R;
    var o = out.getContext("2d", { willReadFrequently: true }), e = (R * altoAlvo) / cx.h;
    var lw = cx.w * e, lh = cx.h * e, dx = (R - lw) / 2, dy = R - lh - (R * (1 - altoAlvo)) / 2;
    o.imageSmoothingQuality = "high";
    o.drawImage(cv, cx.x0, cx.y0, cx.w, cx.h, dx, dy, lw, lh);
    var dat = o.getImageData(0, 0, R, R).data, m = new Uint8Array(R * R), cor = new Uint8Array(R * R * 3);
    for (i = 0; i < R * R; i++) {
      m[i] = dat[i * 4 + 3] > 110 ? 1 : 0;
      cor[i * 3] = dat[i * 4]; cor[i * 3 + 1] = dat[i * 4 + 1]; cor[i * 3 + 2] = dat[i * 4 + 2];
    }
    return { m: m, cor: cor, prop: cx.w / cx.h, alto: altoAlvo };
  }
  /* distância COM SINAL: positivo dentro, negativo fora (dá curva lisa no lugar de degrau de cubo) */
  function sdf(m, R) {
    var dent = distancia(m, R), inv = new Uint8Array(R * R), i;
    for (i = 0; i < R * R; i++) inv[i] = m[i] ? 0 : 1;
    var fora = distancia(inv, R), f = new Float32Array(R * R);
    for (i = 0; i < R * R; i++) f[i] = m[i] ? dent[i] - 0.5 : -(fora[i] - 0.5);
    return f;
  }
  /* distância até a borda (chamfer 2 passadas) */
  function distancia(m, R) {
    var d = new Float32Array(R * R), i, x, y, INF = 1e9;
    for (i = 0; i < R * R; i++) d[i] = m[i] ? INF : 0;
    for (y = 0; y < R; y++) for (x = 0; x < R; x++) { i = y * R + x; if (!d[i]) continue;
      var v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) v = Math.min(v, d[i - R] + 1);
      if (x > 0 && y > 0) v = Math.min(v, d[i - R - 1] + 1.41); if (x < R - 1 && y > 0) v = Math.min(v, d[i - R + 1] + 1.41);
      d[i] = v; }
    for (y = R - 1; y >= 0; y--) for (x = R - 1; x >= 0; x--) { i = y * R + x; if (!d[i]) continue;
      var w = d[i];
      if (x < R - 1) w = Math.min(w, d[i + 1] + 1); if (y < R - 1) w = Math.min(w, d[i + R] + 1);
      if (x < R - 1 && y < R - 1) w = Math.min(w, d[i + R + 1] + 1.41); if (x > 0 && y < R - 1) w = Math.min(w, d[i + R - 1] + 1.41);
      d[i] = w; }
    return d;
  }

  /* ---------- escavar o bloco pelas vistas (campo com sinal) ---------- */
  function escavar(V, R, op) {
    var campo = new Float32Array(R * R * R), x, y, z, i;
    var fF = sdf(V.frente.m, R), fL = V.lado ? sdf(V.lado.m, R) : null, fC = V.costas ? sdf(V.costas.m, R) : null;
    var dist = null, maxd = 1;
    if (!fL) { dist = distancia(V.frente.m, R); for (i = 0; i < dist.length; i++) if (dist[i] > maxd) maxd = dist[i]; }
    var meio = (R - 1) / 2, gordura = op.espessura == null ? 1 : op.espessura;
    var K = Math.max(0.01, (op.arredondar == null ? 2.6 : op.arredondar) * R / 160);   /* emenda das vistas arredondada */
    for (y = 0; y < R; y++) for (x = 0; x < R; x++) {
      var iF = y * R + x, a = fF[iF];
      if (fC) a = smin(a, fC[y * R + (R - 1 - x)], K);
      var base = (y * R + x) * R;
      if (a < -2.5) { for (z = 0; z < R; z++) campo[base + z] = a; continue; }
      if (fL) { for (z = 0; z < R; z++) campo[base + z] = smin(a, fL[y * R + z], K); }
      else {
        var t = Math.max(1.2, Math.sqrt(Math.max(0, dist[iF]) / maxd) * maxd * 1.15 * gordura);
        for (z = 0; z < R; z++) campo[base + z] = smin(a, t - Math.abs(z - meio), K);
      }
    }
    return campo;
  }

  /* ---------- Surface Nets: superfície lisa, com o cruzamento interpolado no campo ---------- */
  function superficie(campo, R) {
    var W = R - 1, idx = new Int32Array(W * W * W).fill(-1), V = [], Q = [], x, y, z;
    var cantos = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
    var arestas = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    function f(x, y, z) { return x < 0 || y < 0 || z < 0 || x >= R || y >= R || z >= R ? -3 : campo[(y * R + x) * R + z]; }
    function dentro(x, y, z) { return f(x, y, z) > 0; }
    for (y = 0; y < W; y++) for (x = 0; x < W; x++) for (z = 0; z < W; z++) {
      var vs = [], mascara = 0, k;
      for (k = 0; k < 8; k++) { vs[k] = f(x + cantos[k][0], y + cantos[k][1], z + cantos[k][2]); if (vs[k] > 0) mascara |= 1 << k; }
      if (mascara === 0 || mascara === 255) continue;
      var sx = 0, sy = 0, sz = 0, n = 0;
      for (k = 0; k < 12; k++) {
        var a = arestas[k][0], b = arestas[k][1];
        if ((vs[a] > 0) === (vs[b] > 0)) continue;
        var t = vs[a] / (vs[a] - vs[b]); if (!isFinite(t)) t = 0.5; t = t < 0 ? 0 : t > 1 ? 1 : t;
        sx += cantos[a][0] + (cantos[b][0] - cantos[a][0]) * t;
        sy += cantos[a][1] + (cantos[b][1] - cantos[a][1]) * t;
        sz += cantos[a][2] + (cantos[b][2] - cantos[a][2]) * t; n++;
      }
      idx[(y * W + x) * W + z] = V.length;
      V.push([x + sx / n, y + sy / n, z + sz / n]);
    }
    function vid(x, y, z) { return x < 0 || y < 0 || z < 0 || x >= W || y >= W || z >= W ? -1 : idx[(y * W + x) * W + z]; }
    for (y = 0; y < R; y++) for (x = 0; x < R; x++) for (z = 0; z < R; z++) {
      var d0 = dentro(x, y, z);
      if (x + 1 < R && d0 !== dentro(x + 1, y, z)) {
        var q = [vid(x, y - 1, z - 1), vid(x, y, z - 1), vid(x, y, z), vid(x, y - 1, z)];
        if (q.every(function (v) { return v >= 0; })) Q.push(d0 ? q : [q[3], q[2], q[1], q[0]]);
      }
      if (y + 1 < R && d0 !== dentro(x, y + 1, z)) {
        var q2 = [vid(x - 1, y, z - 1), vid(x, y, z - 1), vid(x, y, z), vid(x - 1, y, z)];
        if (q2.every(function (v) { return v >= 0; })) Q.push(d0 ? [q2[3], q2[2], q2[1], q2[0]] : q2);
      }
      if (z + 1 < R && d0 !== dentro(x, y, z + 1)) {
        var q3 = [vid(x - 1, y - 1, z), vid(x, y - 1, z), vid(x, y, z), vid(x - 1, y, z)];
        if (q3.every(function (v) { return v >= 0; })) Q.push(d0 ? q3 : [q3[3], q3[2], q3[1], q3[0]]);
      }
    }
    return { V: V, Q: Q };
  }
  function suavizar(V, Q, voltas, forca) {
    var i, k, n = V.length;
    for (var p = 0; p < voltas; p++) {
      var soma = new Float32Array(n * 3), cont = new Uint16Array(n);
      for (i = 0; i < Q.length; i++) for (k = 0; k < 4; k++) {
        var a = Q[i][k], b = Q[i][(k + 1) % 4];
        soma[a * 3] += V[b][0]; soma[a * 3 + 1] += V[b][1]; soma[a * 3 + 2] += V[b][2]; cont[a]++;
        soma[b * 3] += V[a][0]; soma[b * 3 + 1] += V[a][1]; soma[b * 3 + 2] += V[a][2]; cont[b]++;
      }
      for (i = 0; i < n; i++) if (cont[i]) for (k = 0; k < 3; k++) V[i][k] += (soma[i * 3 + k] / cont[i] - V[i][k]) * forca;
    }
  }

  /* ---------- montar ---------- */
  function gerar(imgs, op) {
    op = op || {};
    var R = Math.max(48, Math.min(192, op.res || 128)), alto = 0.94;
    var V = { frente: preparar(imgs.frente, R, alto) };
    if (imgs.lado) V.lado = preparar(imgs.lado, R, alto);
    if (imgs.costas) V.costas = preparar(imgs.costas, R, alto);
    var t0 = (performance || Date).now(), oc = escavar(V, R, op);
    var S = superficie(oc, R);
    if (!S.V.length) throw new Error("não sobrou nada ao escavar: confira se as imagens têm recorte (alfa)");
    suavizar(S.V, S.Q, op.suave == null ? 3 : op.suave, 0.55);
    /* voxel → metros (Y para cima, pés no chão, centrado) */
    var m = (op.alturaM || 1.75) / (R * alto), verts = new Array(S.V.length), i;
    var miY = 1e9, miX = 1e9, maX = -1e9, miZ = 1e9, maZ = -1e9;
    for (i = 0; i < S.V.length; i++) {
      var p = S.V[i], X = (p[0] - (R - 1) / 2) * m, Y = ((R - 1) - p[1]) * m, Z = (p[2] - (R - 1) / 2) * m;
      verts[i] = [X, Y, Z];
      if (Y < miY) miY = Y; if (X < miX) miX = X; if (X > maX) maX = X; if (Z < miZ) miZ = Z; if (Z > maZ) maZ = Z;
    }
    var cx = (miX + maX) / 2, cz = (miZ + maZ) / 2;
    for (i = 0; i < verts.length; i++) { verts[i][0] -= cx; verts[i][1] -= miY; verts[i][2] -= cz; }
    /* cor de cada vértice: projeta na imagem da frente, do lado ou das costas */
    var normais = normaisDe(verts, S.Q), vcor = new Array(verts.length);
    for (i = 0; i < verts.length; i++) {
      var g = S.V[i], nx = normais[i][0], ny = normais[i][1], nz = normais[i][2];
      var px = Math.round(lim(g[0], 0, R - 1)), py = Math.round(lim(g[1], 0, R - 1)), pz = Math.round(lim(g[2], 0, R - 1));
      /* a câmera olha do -Z: normal com z NEGATIVO é a FRENTE; z POSITIVO são as costas */
      var fonte = V.frente, cx2 = px, cy2 = py;
      if (V.costas && nz > Math.abs(nx) * 0.9 && nz > 0) { fonte = V.costas; cx2 = R - 1 - px; }
      else if (V.lado && Math.abs(nx) > Math.abs(nz)) { fonte = V.lado; cx2 = pz; }
      var ix = perto(fonte, cx2, cy2, R);
      if (ix < 0 && fonte !== V.frente) { fonte = V.frente; ix = perto(fonte, px, py, R); }
      if (ix < 0) { vcor[i] = "#8d94a3"; continue; }
      var c = fonte.cor;
      vcor[i] = "#" + [c[ix * 3], c[ix * 3 + 1], c[ix * 3 + 2]].map(function (v) { return ("0" + (v | 0).toString(16)).slice(-2); }).join("");
    }
    function hex2(n) { return ("0" + Math.max(0, Math.min(255, Math.round(n))).toString(16)).slice(-2); }
    var faces = S.Q.map(function (q) {
      var r = 0, gg = 0, b = 0;
      q.forEach(function (v) { var c = window.BW3D.hexRGB(vcor[v]); r += c[0] / 4; gg += c[1] / 4; b += c[2] / 4; });
      return { i: q, cor: "#" + hex2(r) + hex2(gg) + hex2(b) };
    });
    var malha = window.BW3D.malha(verts, faces, { cor: "#aab2c2", mat: { metal: 0.08, brilho: 0.3 }, fechado: true, nome: op.nome || "Foto 3D" });
    malha.vcor = vcor; malha.selar = true; malha.luzPlana = true;
    malha.info = { vertices: verts.length, faces: faces.length, res: R, ms: Math.round(((performance || Date).now()) - t0),
      vistas: ["frente"].concat(V.lado ? ["lado"] : [], V.costas ? ["costas"] : []) };
    return malha;
  }
  /* o vértice fica NA BORDA: procura o pixel pintado mais perto (até 4 px) */
  function perto(fonte, x, y, R) {
    var r, dx, dy, i;
    for (r = 0; r <= 4; r++) for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) {
      if (r > 0 && Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      var X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= R || Y >= R) continue;
      i = Y * R + X; if (fonte.m[i]) return i;
    }
    return -1;
  }
  function normaisDe(V, Q) {
    var n = V.map(function () { return [0, 0, 0]; }), i, k, B = window.BW3D;
    for (i = 0; i < Q.length; i++) {
      var q = Q[i], a = V[q[0]], b = V[q[1]], c = V[q[2]];
      var u = B.cruz(B.sub(b, a), B.sub(c, a));
      for (k = 0; k < 4; k++) { n[q[k]][0] += u[0]; n[q[k]][1] += u[1]; n[q[k]][2] += u[2]; }
    }
    return n.map(function (v) { return B.unit(v); });
  }
  window.BW3DFoto = { gerar: gerar, preparar: preparar, escavar: escavar, superficie: superficie };
})();
