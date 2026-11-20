/* assets/bw3d-motor.js — motor 3D próprio da BW (v1, 20/11/2026).
   Desenha 3D em canvas 2D: projeta os pontos, ordena por profundidade e pinta cada face com luz.
   SEM biblioteca de fora e SEM rede: funciona no app BW sem internet e no iPhone (nada de WebGL).
   Usado pelo ESTÚDIO 3D (3d.html) e pela cópia local do app BW (motor/bw3d-motor.js — iguais).
   Cada quadro depende só de (cena, câmera, t) → serve para a prévia e para o vídeo (BWReelsCelular). */
(function () {
  "use strict";
  var VERSAO = 1;
  var CHROMA = { verde: "#00B140", azul: "#0047BB", magenta: "#FF00FF" };
  var FUNDOS = { estudio: "Estúdio (escuro)", claro: "Fundo claro", cor: "Cor lisa", verde: "Verde (chroma key)", azul: "Azul (chroma key)", magenta: "Magenta (chroma key)", nenhum: "Transparente (PNG/recorte)" };

  /* ---------- contas ---------- */
  function hexRGB(c) {
    c = String(c == null ? "#888888" : c).trim().replace("#", "");
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16); if (isNaN(n)) n = 0x888888;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbTxt(a) { return "rgb(" + (a[0] | 0) + "," + (a[1] | 0) + "," + (a[2] | 0) + ")"; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function unit(v) { var d = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / d, v[1] / d, v[2] / d]; }
  function lim(x, a, b) { return x < a ? a : x > b ? b : x; }

  function rotar(v, r) {
    var x = v[0], y = v[1], z = v[2], c, s, t;
    if (r[2]) { c = Math.cos(r[2]); s = Math.sin(r[2]); t = x * c - y * s; y = x * s + y * c; x = t; }
    if (r[0]) { c = Math.cos(r[0]); s = Math.sin(r[0]); t = y * c - z * s; z = y * s + z * c; y = t; }
    if (r[1]) { c = Math.cos(r[1]); s = Math.sin(r[1]); t = x * c + z * s; z = -x * s + z * c; x = t; }
    return [x, y, z];
  }
  /* local → mundo (escala, giro, posição) */
  function paraMundo(o) {
    var r = o.rot || [0, 0, 0], e = o.escala == null ? 1 : o.escala, p = o.pos || [0, 0, 0];
    var ex = e, ey = e, ez = e; if (o.escalaXYZ) { ex = o.escalaXYZ[0]; ey = o.escalaXYZ[1]; ez = o.escalaXYZ[2]; }
    return function (v) { var q = rotar([v[0] * ex, v[1] * ey, v[2] * ez], r); return [q[0] + p[0], q[1] + p[1], q[2] + p[2]]; };
  }
  /* câmera orbital: yaw (volta), pitch (altura), dist, alvo. orto = sem perspectiva (logo). */
  function camPos(cam) {
    var cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), d = cam.dist;
    var a = cam.alvo || [0, 0, 0];
    return [a[0] - d * cp * sy, a[1] + d * sp, a[2] - d * cp * cy];
  }
  function projetar(p, cam, w, h) {
    var a = cam.alvo || [0, 0, 0], dx = p[0] - a[0], dy = p[1] - a[1], dz = p[2] - a[2];
    var cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    var x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
    var y1 = dy * cp + z1 * sp, z2 = -dy * sp + z1 * cp;
    var prof = cam.dist + z2, m = Math.min(w, h) * 0.5;
    var s = cam.orto ? m / Math.max(0.001, cam.alcance || 2) : (m / Math.tan((cam.fov || 0.62) / 2)) / Math.max(0.06, prof);
    return [w / 2 + x1 * s + (cam.desx || 0) * w, h / 2 - y1 * s + (cam.desy || 0) * h, prof, s];
  }

  /* ---------- malhas ---------- */
  function malha(verts, faces, o) {
    o = o || {};
    return { tipo: "malha", verts: verts, faces: faces, cor: o.cor || "#B9C0CC", mat: o.mat || { metal: 0.1, brilho: 0.3 },
      pos: o.pos || [0, 0, 0], rot: o.rot || [0, 0, 0], escala: o.escala == null ? 1 : o.escala, escalaXYZ: o.escalaXYZ || null,
      fechado: o.fechado !== false, sombra: o.sombra !== false, arestas: o.arestas || 0, nome: o.nome || "" };
  }
  function caixa(o) {
    var t = o.tam || [1, 1, 1], lx = t[0] / 2, ly = t[1], lz = t[2] / 2, b = o.centrado ? -t[1] / 2 : 0;
    var v = [[-lx, b, -lz], [lx, b, -lz], [lx, b + ly, -lz], [-lx, b + ly, -lz], [-lx, b, lz], [lx, b, lz], [lx, b + ly, lz], [-lx, b + ly, lz]];
    var f = [{ i: [0, 3, 2, 1] }, { i: [4, 5, 6, 7] }, { i: [0, 1, 5, 4] }, { i: [3, 7, 6, 2] }, { i: [1, 2, 6, 5] }, { i: [0, 4, 7, 3] }];
    return malha(v, f, o);
  }
  function cilindro(o) {
    var n = o.lados || 18, R = (o.diam || 1) / 2, a = o.altura == null ? 1 : o.altura, v = [], f = [], i;
    for (i = 0; i < n; i++) { var g = i / n * Math.PI * 2; v.push([Math.cos(g) * R, 0, Math.sin(g) * R]); v.push([Math.cos(g) * R, a, Math.sin(g) * R]); }
    for (i = 0; i < n; i++) { var j = (i + 1) % n; f.push({ i: [i * 2, i * 2 + 1, j * 2 + 1, j * 2] }); }
    var topo = [], base = []; for (i = 0; i < n; i++) { topo.push(i * 2 + 1); base.push((n - 1 - i) * 2); }
    f.push({ i: topo }); f.push({ i: base });
    return malha(v, f, o);
  }
  function plano(o) {
    var t = o.tam || [1, 1], lx = t[0] / 2, ly = t[1] / 2;
    return malha([[-lx, -ly, 0], [lx, -ly, 0], [lx, ly, 0], [-lx, ly, 0]], [{ i: [0, 1, 2, 3] }], Object.assign({ fechado: false }, o));
  }
  /* painel de LED: corpo + módulos (0,5 × 0,5 m por padrão) acesos */
  function painelLED(o) {
    var cols = Math.max(1, o.cols || 6), rows = Math.max(1, o.rows || 4), m = o.modulo || 0.5, mh = o.moduloA || m;
    var L = cols * m, A = rows * mh, E = o.prof || 0.09, v = [], f = [], i, j;
    var cx = L / 2, base = o.alturaChao == null ? 0 : o.alturaChao;
    function pv(x, y, z) { v.push([x, y, z]); return v.length - 1; }
    /* corpo (caixa atrás) */
    var c0 = pv(-cx, base, 0), c1 = pv(cx, base, 0), c2 = pv(cx, base + A, 0), c3 = pv(-cx, base + A, 0);
    var c4 = pv(-cx, base, E), c5 = pv(cx, base, E), c6 = pv(cx, base + A, E), c7 = pv(-cx, base + A, E);
    f.push({ i: [c4, c5, c6, c7], cor: o.corCorpo || "#15181f" }); f.push({ i: [c0, c1, c5, c4], cor: o.corCorpo || "#15181f" });
    f.push({ i: [c3, c7, c6, c2], cor: o.corCorpo || "#15181f" }); f.push({ i: [c1, c2, c6, c5], cor: o.corCorpo || "#15181f" });
    f.push({ i: [c0, c4, c7, c3], cor: o.corCorpo || "#15181f" });
    /* módulos na frente */
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
      var x0 = -cx + i * m, y0 = base + j * mh, g = 0.006;
      var a = pv(x0 + g, y0 + g, -0.004), b = pv(x0 + m - g, y0 + g, -0.004), c = pv(x0 + m - g, y0 + mh - g, -0.004), d = pv(x0 + g, y0 + mh - g, -0.004);
      f.push({ i: [a, d, c, b], cor: o.corLed || "#1b2230", led: true });
    }
    var ml = malha(v, f, Object.assign({ cor: o.corCorpo || "#15181f", fechado: false }, o));
    ml.nome = o.nome || "Painel de LED"; ml.led = { cols: cols, rows: rows, modulo: m, moduloA: mh, L: L, A: A };
    if (o.conteudo) ml.conteudo = { img: o.conteudo, verts: [[-cx, base + A, -0.006], [cx, base + A, -0.006], [cx, base, -0.006], [-cx, base, -0.006]] };
    return ml;
  }
  /* treliça: caixa com diagonais desenhadas nas faces */
  function trelica(o) {
    var c = caixa(Object.assign({}, o, { cor: o.cor || "#9aa3b2" }));
    c.trelica = { passo: o.passo || 0.5 }; c.mat = { metal: 0.5, brilho: 0.5 }; c.nome = o.nome || "Treliça";
    return c;
  }
  /* pessoa de escala: silhueta sempre virada para a câmera (1,75 m) */
  function pessoa(o) {
    return { tipo: "silhueta", forma: "pessoa", pos: o.pos || [0, 0, 0], altura: o.altura || 1.75, cor: o.cor || "#39445a",
      sombra: o.sombra !== false, nome: o.nome || "Pessoa (1,75 m)" };
  }
  function cameraTri(o) {
    return { tipo: "silhueta", forma: "camera", pos: o.pos || [0, 0, 0], altura: o.altura || 1.55, cor: o.cor || "#39445a",
      sombra: o.sombra !== false, nome: o.nome || "Câmera" };
  }

  /* ---------- leitores de arquivo ---------- */
  function lerOBJ(txt) {
    var ls = String(txt).split(/\r?\n/), V = [], F = [], i, k;
    for (i = 0; i < ls.length; i++) {
      var l = ls[i].trim(); if (!l || l[0] === "#") continue;
      var p = l.split(/\s+/);
      if (p[0] === "v") V.push([+p[1], +p[2], +p[3]]);
      else if (p[0] === "f") {
        var idx = []; for (k = 1; k < p.length; k++) { var n = parseInt(p[k].split("/")[0], 10); if (isNaN(n)) continue; idx.push(n < 0 ? V.length + n : n - 1); }
        for (k = 2; k < idx.length; k++) F.push({ i: [idx[0], idx[k - 1], idx[k]] });
      }
    }
    if (!V.length || !F.length) throw new Error("este .obj não tem pontos ou faces que eu saiba ler");
    return { verts: V, faces: F };
  }
  function lerSTL(buf) {
    var u8 = new Uint8Array(buf), txt = "", i;
    for (i = 0; i < Math.min(u8.length, 200); i++) txt += String.fromCharCode(u8[i]);
    if (/^\s*solid/i.test(txt) && /facet/i.test(txt)) {
      var s = new TextDecoder().decode(u8), V = [], F = [], m, re = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
      while ((m = re.exec(s))) V.push([+m[1], +m[2], +m[3]]);
      for (i = 0; i + 2 < V.length; i += 3) F.push({ i: [i, i + 1, i + 2] });
      if (!F.length) throw new Error("este .stl de texto não tem triângulos");
      return { verts: V, faces: F };
    }
    var dv = new DataView(buf), n = dv.getUint32(80, true), V2 = [], F2 = [], off = 84;
    if (!n || 84 + n * 50 > buf.byteLength + 4) throw new Error("este .stl não parece válido");
    for (i = 0; i < n; i++) {
      var o = off + i * 50 + 12;
      V2.push([dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)]);
      V2.push([dv.getFloat32(o + 12, true), dv.getFloat32(o + 16, true), dv.getFloat32(o + 20, true)]);
      V2.push([dv.getFloat32(o + 24, true), dv.getFloat32(o + 28, true), dv.getFloat32(o + 32, true)]);
      F2.push({ i: [i * 3, i * 3 + 1, i * 3 + 2] });
    }
    return { verts: V2, faces: F2 };
  }
  function mult4(a, b) { var r = new Float64Array(16), i, j, k; for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) { var s = 0; for (k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; r[i * 4 + j] = s; } return r; }
  function trs(n) {
    var m = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    if (n.matrix) return new Float64Array(n.matrix);
    var t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
    var x = q[0], y = q[1], z = q[2], w = q[3];
    var R = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
    m[0] = R[0] * s[0]; m[1] = R[1] * s[0]; m[2] = R[2] * s[0];
    m[4] = R[3] * s[1]; m[5] = R[4] * s[1]; m[6] = R[5] * s[1];
    m[8] = R[6] * s[2]; m[9] = R[7] * s[2]; m[10] = R[8] * s[2];
    m[12] = t[0]; m[13] = t[1]; m[14] = t[2];
    return m;
  }
  function apl4(m, p) {
    return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  }
  function lerGLB(buf) {
    var dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x46546C67) throw new Error("não é um arquivo .glb");
    var len = dv.getUint32(8, true), off = 12, js = null, bin = null;
    while (off + 8 <= Math.min(len, buf.byteLength)) {
      var cl = dv.getUint32(off, true), ct = dv.getUint32(off + 4, true), ini = off + 8;
      if (ct === 0x4E4F534A) js = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, ini, cl)).replace(/\0+$/, "").trim());
      else if (ct === 0x004E4942) bin = { buf: buf, ini: ini, len: cl };
      off = ini + cl + (cl % 4 ? 4 - cl % 4 : 0);
    }
    if (!js) throw new Error("este .glb está sem a parte de dados (JSON)");
    if (js.extensionsRequired && js.extensionsRequired.length) {
      var ex = js.extensionsRequired.join(", ");
      if (/draco|meshopt/i.test(ex)) throw new Error("este .glb está compactado (" + ex + "): exporte sem compressão Draco/meshopt");
    }
    var TIPO = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    var NUM = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    function acessar(i) {
      var ac = js.accessors[i], bv = js.bufferViews[ac.bufferView], T = TIPO[ac.componentType], n = NUM[ac.type] || 1;
      if (!T) throw new Error("tipo de dado não suportado no .glb");
      if (!bin) throw new Error("este .glb não traz os dados dentro do arquivo");
      var base = bin.ini + (bv.byteOffset || 0) + (ac.byteOffset || 0), out = new Array(ac.count * n);
      var passo = bv.byteStride && ac.type !== "SCALAR" ? bv.byteStride : n * T.BYTES_PER_ELEMENT, k, j;
      for (k = 0; k < ac.count; k++) { var a = new T(buf, base + k * passo, n); for (j = 0; j < n; j++) out[k * n + j] = a[j]; }
      return { d: out, n: n, count: ac.count };
    }
    var V = [], F = [], usadas = 0;
    function cor(mi) {
      if (mi == null || !js.materials || !js.materials[mi]) return null;
      var mt = js.materials[mi], pb = mt.pbrMetallicRoughness || {}, c = pb.baseColorFactor;
      if (!c) return null;
      function g(x) { x = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.round(lim(x, 0, 1) * 255); }
      return "#" + [g(c[0]), g(c[1]), g(c[2])].map(function (z) { return ("0" + z.toString(16)).slice(-2); }).join("");
    }
    function noh(i, pai) {
      var n = js.nodes[i], m = mult4(pai, trs(n));
      if (n.mesh != null && js.meshes[n.mesh]) js.meshes[n.mesh].primitives.forEach(function (pr) {
        if (pr.mode != null && pr.mode !== 4) return;
        if (!pr.attributes || pr.attributes.POSITION == null) return;
        var ps = acessar(pr.attributes.POSITION), ini = V.length, k, c = cor(pr.material);
        for (k = 0; k < ps.count; k++) V.push(apl4(m, [ps.d[k * 3], ps.d[k * 3 + 1], ps.d[k * 3 + 2]]));
        if (pr.indices != null) { var ix = acessar(pr.indices); for (k = 0; k + 2 < ix.count; k += 3) F.push({ i: [ini + ix.d[k], ini + ix.d[k + 1], ini + ix.d[k + 2]], cor: c }); }
        else for (k = 0; k + 2 < ps.count; k += 3) F.push({ i: [ini + k, ini + k + 1, ini + k + 2], cor: c });
        usadas++;
      });
      (n.children || []).forEach(function (c2) { noh(c2, m); });
    }
    var raiz = new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    var cena = js.scenes && js.scenes[js.scene || 0];
    (cena && cena.nodes ? cena.nodes : (js.nodes || []).map(function (_, i) { return i; })).forEach(function (i) { noh(i, raiz); });
    if (!F.length) throw new Error(usadas ? "este .glb não tem triângulos que eu saiba ler" : "não achei malhas neste .glb");
    return { verts: V, faces: F };
  }
  function lerArquivo(nome, buf) {
    var n = String(nome || "").toLowerCase();
    if (/\.obj$/.test(n)) return lerOBJ(new TextDecoder().decode(new Uint8Array(buf)));
    if (/\.stl$/.test(n)) return lerSTL(buf);
    if (/\.glb$/.test(n)) return lerGLB(buf);
    if (/\.gltf$/.test(n)) throw new Error("arquivo .gltf separado não dá: exporte como .glb (um arquivo só)");
    if (/\.(fbx|usd[az]?|3mf|blend|dae|c4d|max)$/.test(n)) throw new Error("formato " + n.split(".").pop().toUpperCase() + " ainda não: exporte como GLB, OBJ ou STL");
    /* sem extensão conhecida: tenta pelos primeiros bytes */
    try { return lerGLB(buf); } catch (e) {}
    try { return lerSTL(buf); } catch (e2) {}
    return lerOBJ(new TextDecoder().decode(new Uint8Array(buf)));
  }
  /* centraliza no chão e põe numa altura em metros */
  function ajustar(m, alturaM) {
    var mi = [1e9, 1e9, 1e9], ma = [-1e9, -1e9, -1e9], i, k;
    for (i = 0; i < m.verts.length; i++) for (k = 0; k < 3; k++) { if (m.verts[i][k] < mi[k]) mi[k] = m.verts[i][k]; if (m.verts[i][k] > ma[k]) ma[k] = m.verts[i][k]; }
    var tam = [ma[0] - mi[0], ma[1] - mi[1], ma[2] - mi[2]], maior = Math.max(tam[0], tam[1], tam[2]) || 1;
    var e = (alturaM || 1.6) / maior, cx = (mi[0] + ma[0]) / 2, cz = (mi[2] + ma[2]) / 2;
    for (i = 0; i < m.verts.length; i++) m.verts[i] = [(m.verts[i][0] - cx) * e, (m.verts[i][1] - mi[1]) * e, (m.verts[i][2] - cz) * e];
    return { tam: [tam[0] * e, tam[1] * e, tam[2] * e], originais: tam };
  }
  window.BW3D = { VERSAO: VERSAO, CHROMA: CHROMA, FUNDOS: FUNDOS, hexRGB: hexRGB, rgbTxt: rgbTxt, unit: unit, dot: dot, cruz: cruz, sub: sub, lim: lim,
    rotar: rotar, paraMundo: paraMundo, projetar: projetar, camPos: camPos, malha: malha, caixa: caixa, cilindro: cilindro, plano: plano,
    painelLED: painelLED, trelica: trelica, pessoa: pessoa, cameraTri: cameraTri, lerOBJ: lerOBJ, lerSTL: lerSTL, lerGLB: lerGLB, lerArquivo: lerArquivo, ajustar: ajustar };
})();

/* ---------- parte 2: desenho (pintor por profundidade) ---------- */
(function () {
  "use strict";
  var B = window.BW3D, CACHE = {}, TMP = null;
  function tela(w, h) {
    if (!TMP) TMP = document.createElement("canvas");
    if (TMP.width < w || TMP.height < h) { TMP.width = Math.max(TMP.width, w); TMP.height = Math.max(TMP.height, h); }
    var c = TMP.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, TMP.width, TMP.height); return c;
  }
  function pintar(img, cor) {
    var k = "t" + (img.__id || (img.__id = "i" + Math.random().toString(36).slice(2))) + cor;
    if (CACHE[k]) return CACHE[k];
    var c = document.createElement("canvas"); c.width = img.width || img.naturalWidth; c.height = img.height || img.naturalHeight;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = "source-in"; x.fillStyle = cor; x.fillRect(0, 0, c.width, c.height);
    CACHE[k] = c; if (Object.keys(CACHE).length > 60) CACHE = {}; return c;
  }
  function metal(img, cor, ang) {
    var g = Math.round(ang / 0.2) * 0.2;
    var k = "m" + (img.__id || "x") + cor + g.toFixed(1);
    if (CACHE[k]) return CACHE[k];
    var base = pintar(img, cor), c = document.createElement("canvas"); c.width = base.width; c.height = base.height;
    var x = c.getContext("2d"); x.drawImage(base, 0, 0);
    var rgb = B.hexRGB(cor), cl = function (f) { return "rgb(" + B.lim(rgb[0] * f + 36 * (f - 1), 0, 255).toFixed(0) + "," + B.lim(rgb[1] * f + 36 * (f - 1), 0, 255).toFixed(0) + "," + B.lim(rgb[2] * f + 36 * (f - 1), 0, 255).toFixed(0) + ")"; };
    var dx = Math.cos(g) * c.width, dy = Math.sin(g) * c.height * 0.4;
    var gr = x.createLinearGradient(c.width / 2 - dx / 2, c.height / 2 - dy / 2, c.width / 2 + dx / 2, c.height / 2 + dy / 2);
    gr.addColorStop(0, cl(0.45)); gr.addColorStop(0.3, cl(1.45)); gr.addColorStop(0.45, cl(0.75)); gr.addColorStop(0.6, cl(1.7)); gr.addColorStop(0.8, cl(0.6)); gr.addColorStop(1, cl(1.2));
    x.globalCompositeOperation = "source-atop"; x.fillStyle = gr; x.fillRect(0, 0, c.width, c.height);
    CACHE[k] = c; return c;
  }
  function blit(ctx, img, p0, p1, p3, alpha) {
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight; if (!iw || !ih) return;
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
    ctx.transform((p1[0] - p0[0]) / iw, (p1[1] - p0[1]) / iw, (p3[0] - p0[0]) / ih, (p3[1] - p0[1]) / ih, p0[0], p0[1]);
    ctx.drawImage(img, 0, 0); ctx.restore();
  }
  function somaPt(a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k]; }

  /* fundo */
  function fundo(ctx, cena, w, h) {
    var f = cena.fundo || { tipo: "estudio" };
    ctx.clearRect(0, 0, w, h);
    if (f.tipo === "nenhum") return;
    if (B.CHROMA[f.tipo]) { ctx.fillStyle = B.CHROMA[f.tipo]; ctx.fillRect(0, 0, w, h); return; }
    if (f.tipo === "cor") { ctx.fillStyle = f.cor || "#0B0E14"; ctx.fillRect(0, 0, w, h); return; }
    if (f.tipo === "claro") {
      var g2 = ctx.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, "#FFFFFF"); g2.addColorStop(1, "#E7E9EE");
      ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h); return;
    }
    ctx.fillStyle = "#070A10"; ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(90,120,190,.30)"); g.addColorStop(0.55, "rgba(30,40,70,.14)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  /* chão com grade (1 m) */
  function chao(ctx, cena, cam, w, h) {
    var c = cena.chao; if (!c || c.mostrar === false) return;
    var R = c.tam || 8, passo = c.passo || 1, i, claro = (cena.fundo || {}).tipo === "claro";
    ctx.save(); ctx.lineWidth = 1;
    function linha(a, b, forte) {
      var pa = B.projetar(a, cam, w, h), pb = B.projetar(b, cam, w, h);
      if (pa[2] <= 0.1 && pb[2] <= 0.1) return;
      if (pa[2] <= 0.1 || pb[2] <= 0.1) { var k = (0.1 - pa[2]) / (pb[2] - pa[2]); var mx = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; if (pa[2] <= 0.1) { a = mx; pa = B.projetar(a, cam, w, h); } else { b = mx; pb = B.projetar(b, cam, w, h); } }
      var d = Math.min(1, 1.15 - (Math.max(pa[2], pb[2]) / (R * 1.9)));
      ctx.strokeStyle = claro ? "rgba(20,28,45," + (0.07 + 0.1 * d * (forte ? 2 : 1)).toFixed(3) + ")" : "rgba(150,190,255," + (0.05 + 0.1 * d * (forte ? 2.2 : 1)).toFixed(3) + ")";
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    for (i = -R; i <= R; i += passo) { linha([i, 0, -R], [i, 0, R], Math.abs(i) < 0.001); linha([-R, 0, i], [R, 0, i], Math.abs(i) < 0.001); }
    ctx.restore();
  }
  /* sombra no chão */
  function sombra(ctx, o, cam, w, h) {
    var cx = 0, cz = 0, r = 0.5, pos = o.pos || [0, 0, 0];
    if (o.tipo === "malha") {
      var mv = B.paraMundo(o), mi = [1e9, 1e9], ma = [-1e9, -1e9], i;
      for (i = 0; i < o.verts.length; i += Math.max(1, Math.floor(o.verts.length / 120))) { var p = mv(o.verts[i]); if (p[0] < mi[0]) mi[0] = p[0]; if (p[0] > ma[0]) ma[0] = p[0]; if (p[2] < mi[1]) mi[1] = p[2]; if (p[2] > ma[1]) ma[1] = p[2]; }
      cx = (mi[0] + ma[0]) / 2; cz = (mi[1] + ma[1]) / 2; r = Math.max(0.12, Math.max(ma[0] - mi[0], ma[1] - mi[1]) / 2);
    } else { cx = pos[0]; cz = pos[2]; r = (o.altura || 1.7) * 0.2; }
    var pc = B.projetar([cx, 0, cz], cam, w, h); if (pc[2] <= 0.1) return;
    var rx = r * pc[3], ry = Math.max(2, r * pc[3] * Math.max(0.12, Math.sin(Math.max(0.08, cam.pitch))));
    ctx.save(); ctx.translate(pc[0], pc[1]); ctx.scale(1, ry / Math.max(1, rx));
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, rx));
    g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(0.6, "rgba(0,0,0,.24)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, Math.max(1, rx), 0, 6.2832); ctx.fill(); ctx.restore();
  }
  /* silhuetas (pessoa, câmera) sempre viradas para quem olha */
  function silhueta(ctx, o, p, s) {
    var A = (o.altura || 1.75) * s, L = A * 0.34;
    ctx.save(); ctx.translate(p[0], p[1]); ctx.fillStyle = o.cor || "#39445a"; ctx.globalAlpha = 0.95;
    if (o.forma === "camera") {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L * 0.5, -A * 0.06); ctx.lineTo(-L * 0.08, -A * 0.75); ctx.lineTo(L * 0.08, -A * 0.75); ctx.lineTo(L * 0.5, -A * 0.06); ctx.closePath(); ctx.fill();
      ctx.fillRect(-L * 0.55, -A, L * 1.1, A * 0.26); ctx.fillRect(L * 0.4, -A * 0.96, L * 0.45, A * 0.14);
    } else {
      ctx.beginPath(); ctx.arc(0, -A * 0.9, A * 0.1, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-L * 0.42, -A * 0.78); ctx.quadraticCurveTo(0, -A * 0.84, L * 0.42, -A * 0.78);
      ctx.lineTo(L * 0.3, -A * 0.44); ctx.lineTo(L * 0.26, 0); ctx.lineTo(L * 0.06, 0); ctx.lineTo(L * 0.04, -A * 0.4);
      ctx.lineTo(-L * 0.04, -A * 0.4); ctx.lineTo(-L * 0.06, 0); ctx.lineTo(-L * 0.26, 0); ctx.lineTo(-L * 0.3, -A * 0.44); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
  /* logo em relevo: silhueta "esfregada" na direção da espessura (sem fatia por fatia) */
  function logo3d(ctx, o, cam, w, h) {
    var img = o.img; if (!img || !(img.width || img.naturalWidth)) return;
    var iw = img.width || img.naturalWidth, ih = img.height || img.naturalHeight;
    var L = o.larguraM || 1.6, A = L * ih / iw, e = Math.max(0.001, o.espessura == null ? 0.12 : o.espessura);
    var mv = B.paraMundo({ pos: o.pos, rot: o.rot, escala: 1 });
    var cantos = [[-L / 2, A / 2], [L / 2, A / 2], [L / 2, -A / 2], [-L / 2, -A / 2]];
    var q = cantos.map(function (c) { return mv([c[0], c[1], 0]); });
    var qz = cantos.map(function (c) { return mv([c[0], c[1], e]); });
    var P = q.map(function (p) { return B.projetar(p, cam, w, h); });
    var Pz = qz.map(function (p) { return B.projetar(p, cam, w, h); });
    if (P[0][2] <= 0.1 || Pz[0][2] <= 0.1) return;
    var perto = P[0][2] + P[2][2] <= Pz[0][2] + Pz[2][2], N = perto ? P : Pz, F = perto ? Pz : P;
    var ext = [N[0][0] - F[0][0], N[0][1] - F[0][1]], comp = Math.hypot(ext[0], ext[1]);
    var xs = [N[0][0], N[1][0], N[2][0], N[3][0], F[0][0], F[1][0], F[2][0], F[3][0]];
    var ys = [N[0][1], N[1][1], N[2][1], N[3][1], F[0][1], F[1][1], F[2][1], F[3][1]];
    var x0 = Math.min.apply(null, xs) - 4, y0 = Math.min.apply(null, ys) - 4;
    var cw = Math.ceil(Math.max.apply(null, xs) - x0 + 8), ch = Math.ceil(Math.max.apply(null, ys) - y0 + 8);
    if (cw < 2 || ch < 2 || cw > 8000 || ch > 8000) return;
    var corLado = o.corLado || o.cor || "#C9A227", tx = tela(cw, ch);
    var sil = pintar(img, "#ffffff");
    /* parede: silhueta no fundo + esfrega dobrando o passo (poucos desenhos, sem degrau) */
    blit(tx, sil, [F[0][0] - x0, F[0][1] - y0], [F[1][0] - x0, F[1][1] - y0], [F[3][0] - x0, F[3][1] - y0]);
    if (comp > 0.8) {
      var passo = [ext[0] / comp, ext[1] / comp], d = 1, voltas = 0;
      while (d < comp && voltas < 14) {
        tx.save(); tx.globalCompositeOperation = "source-over"; tx.drawImage(TMP, passo[0] * d, passo[1] * d, TMP.width, TMP.height); tx.restore();
        d *= 2; voltas++;
      }
      tx.save(); tx.drawImage(TMP, ext[0], ext[1], TMP.width, TMP.height); tx.restore();
    }
    var rgb = B.hexRGB(corLado), gl = tx.createLinearGradient(0, 0, cw, ch);
    function t2(f) { return "rgb(" + B.lim(rgb[0] * f, 0, 255).toFixed(0) + "," + B.lim(rgb[1] * f, 0, 255).toFixed(0) + "," + B.lim(rgb[2] * f, 0, 255).toFixed(0) + ")"; }
    gl.addColorStop(0, t2(0.42)); gl.addColorStop(0.5, t2(0.78)); gl.addColorStop(1, t2(0.34));
    tx.globalCompositeOperation = "source-in"; tx.fillStyle = gl; tx.fillRect(0, 0, cw, ch);
    tx.globalCompositeOperation = "source-over";
    /* bisel: um contorno claro bem na frente */
    if (o.bisel) {
      var k = 1 + Math.min(0.06, o.bisel * 0.05), mx = (N[0][0] + N[2][0]) / 2 - x0, my = (N[0][1] + N[2][1]) / 2 - y0;
      function esc(p) { return [mx + ((p[0] - x0) - mx) * k, my + ((p[1] - y0) - my) * k]; }
      blit(tx, pintar(img, t2(1.5)), esc(N[0]), esc(N[1]), esc(N[3]));
    }
    var frente;
    if (perto && o.acabamento === "imagem") frente = img;
    else if (!perto) frente = pintar(img, t2(0.5));
    else if (o.acabamento === "cor") frente = pintar(img, o.cor || "#C9A227");
    else frente = metal(img, o.cor || "#C9A227", (cam.yaw || 0) + (o.rot ? o.rot[1] : 0));
    blit(tx, frente, [N[0][0] - x0, N[0][1] - y0], [N[1][0] - x0, N[1][1] - y0], [N[3][0] - x0, N[3][1] - y0]);
    ctx.drawImage(TMP, 0, 0, cw, ch, x0, y0, cw, ch);
  }

  function desenhar(ctx, cena, cam, w, h) {
    fundo(ctx, cena, w, h);
    var luz = cena.luz || { dir: [-0.4, 0.75, -0.5], amb: 0.33 }, L = B.unit(luz.dir), amb = luz.amb == null ? 0.33 : luz.amb;
    var olho = B.camPos(cam), objs = cena.objs || [], prims = [], i, j;
    chao(ctx, cena, cam, w, h);
    objs.forEach(function (o) { if (o.sombra !== false && (cena.chao && cena.chao.mostrar !== false)) sombra(ctx, o, cam, w, h); });
    objs.forEach(function (o) {
      if (o.visivel === false) return;
      if (o.tipo === "silhueta") {
        var p = B.projetar(o.pos || [0, 0, 0], cam, w, h); if (p[2] <= 0.1) return;
        prims.push({ z: p[2], f: function (c) { silhueta(c, o, p, p[3]); } }); return;
      }
      if (o.tipo === "logo") {
        var pc = B.projetar(o.pos || [0, 0, 0], cam, w, h); if (pc[2] <= 0.1) return;
        prims.push({ z: pc[2], f: function (c) { logo3d(c, o, cam, w, h); } }); return;
      }
      if (o.tipo !== "malha") return;
      var mv = B.paraMundo(o), V = new Array(o.verts.length), S = new Array(o.verts.length);
      for (i = 0; i < o.verts.length; i++) { V[i] = mv(o.verts[i]); S[i] = B.projetar(V[i], cam, w, h); }
      for (j = 0; j < o.faces.length; j++) {
        var fc = o.faces[j], ix = fc.i, k, perto = false, zs = 0;
        for (k = 0; k < ix.length; k++) { var s = S[ix[k]]; if (!s || s[2] <= 0.08) { perto = true; break; } zs += s[2]; }
        if (perto) continue;
        var a = V[ix[0]], b = V[ix[1]], c2 = V[ix[2]], n = B.unit(B.cruz(B.sub(b, a), B.sub(c2, a)));
        var vis = B.unit(B.sub(olho, a)), frente = B.dot(n, vis) > 0;
        if (!frente) { if (o.fechado) continue; n = [-n[0], -n[1], -n[2]]; }
        var lam = Math.max(0, B.dot(n, L)), cor = fc.cor || o.cor, mat = o.mat || {};
        var rgb = B.hexRGB(cor), kk = fc.led ? 1 : amb + (1 - amb) * lam, r = rgb[0] * kk, g = rgb[1] * kk, bb = rgb[2] * kk;
        if (!fc.led && mat.metal) { var sp = Math.pow(lam, 8 + (mat.brilho || 0.3) * 60) * mat.metal * 230; r += sp; g += sp; bb += sp; }
        prims.push({ z: zs / ix.length, obj: o, face: fc, pts: ix.map(function (q) { return S[q]; }),
          cor: B.rgbTxt([Math.min(255, r), Math.min(255, g), Math.min(255, bb)]), led: !!fc.led, lam: lam });
      }
      if (o.conteudo) {
        var cv = o.conteudo.verts.map(function (p) { return B.projetar(mv(p), cam, w, h); });
        if (cv[0][2] > 0.1) prims.push({ z: Math.min(cv[0][2], cv[1][2], cv[2][2], cv[3][2]) - 0.01, f: function (c) { blit(c, o.conteudo.img, cv[0], cv[1], cv[3]); } });
      }
      if (o.trelica) {
        var tz = S.map(function (p) { return p; });
        prims.push({ z: (tz[0][2] + tz[6][2]) / 2 - 0.002, f: function (c) {
          c.save(); c.strokeStyle = "rgba(230,240,255,.5)"; c.lineWidth = Math.max(1, 1.2 * (tz[0][3] || 1) * 0.02);
          var passos = Math.max(2, Math.round(Math.max(Math.abs(o.tam ? o.tam[0] : 1), 1) / (o.trelica.passo || 0.5)));
          for (var q = 0; q <= passos; q++) {
            var u = q / passos, A1 = [tz[0][0] + (tz[1][0] - tz[0][0]) * u, tz[0][1] + (tz[1][1] - tz[0][1]) * u];
            var B1 = [tz[3][0] + (tz[2][0] - tz[3][0]) * u, tz[3][1] + (tz[2][1] - tz[3][1]) * u];
            c.beginPath(); c.moveTo(A1[0], A1[1]); c.lineTo(B1[0], B1[1]); c.stroke();
            if (q < passos) { var u2 = (q + 1) / passos, A2 = [tz[0][0] + (tz[1][0] - tz[0][0]) * u2, tz[0][1] + (tz[1][1] - tz[0][1]) * u2];
              c.beginPath(); c.moveTo(B1[0], B1[1]); c.lineTo(A2[0], A2[1]); c.stroke(); }
          }
          c.restore();
        } });
      }
    });
    prims.sort(function (a, b) { return b.z - a.z; });
    for (i = 0; i < prims.length; i++) {
      var p = prims[i];
      if (p.f) { p.f(ctx); continue; }
      ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]);
      for (j = 1; j < p.pts.length; j++) ctx.lineTo(p.pts[j][0], p.pts[j][1]);
      ctx.closePath(); ctx.fillStyle = p.cor; ctx.fill();
      if (p.led) { ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = 1; ctx.stroke(); }
      else if (p.obj.arestas) { ctx.strokeStyle = "rgba(0,0,0," + p.obj.arestas + ")"; ctx.lineWidth = 1; ctx.stroke(); }
    }
    medidas(ctx, cena, cam, w, h);
  }
  /* medidas em metros (maquete) */
  function medidas(ctx, cena, cam, w, h) {
    var ms = cena.medidas || []; if (!ms.length) return;
    var claro = (cena.fundo || {}).tipo === "claro";
    ctx.save(); ctx.lineWidth = 1.5; ctx.font = "800 " + Math.max(10, Math.round(Math.min(w, h) / 46)) + "px Inter, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ms.forEach(function (m) {
      var a = B.projetar(m.a, cam, w, h), b = B.projetar(m.b, cam, w, h); if (a[2] <= 0.1 || b[2] <= 0.1) return;
      ctx.strokeStyle = claro ? "rgba(20,30,50,.6)" : "rgba(182,255,59,.8)";
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      [a, b].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 6.2832); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); });
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, tw = ctx.measureText(m.txt).width + 12, th = Math.max(16, Math.min(w, h) / 32);
      ctx.fillStyle = claro ? "rgba(255,255,255,.92)" : "rgba(8,11,17,.86)";
      ctx.beginPath(); ctx.rect(mx - tw / 2, my - th / 2, tw, th); ctx.fill();
      ctx.strokeStyle = claro ? "rgba(20,30,50,.25)" : "rgba(182,255,59,.5)"; ctx.stroke();
      ctx.fillStyle = claro ? "#101722" : "#EAF7D2"; ctx.fillText(m.txt, mx, my + 0.5);
    });
    ctx.restore();
  }
  B.desenhar = desenhar; B.logo3d = logo3d; B.pintar = pintar; B.blit = blit; B.limparCache = function () { CACHE = {}; };
})();
