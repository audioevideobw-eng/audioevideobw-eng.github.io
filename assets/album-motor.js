/* ÁLBUM 3D — motor (22/11/2026, Claude). Pedido do dono: "sistema de telas: você tem o exemplo de como fica e só substitui os arquivos;
   modelos definidos, modo álbum de fotos com várias sequências; efeitos 3D com vídeo e imagem; no celular e no PC".
   Desenho PRÓPRIO em canvas 2D (sem biblioteca de fora, sem WebGL — igual ao bw3d-motor): cada foto/take vira um CARTÃO no espaço 3D
   (posição, giro, curva, frente e verso), projetado em perspectiva, ordenado por profundidade e pintado por triângulos (textura afim
   em células pequenas = perspectiva certa). Cada MODELO é só uma função quadro(t) → peças + câmera; modelo novo = um item na lista.
   Funciona igual na prévia e no vídeo final (BWReelsCelular.gerar com desenhar). Este arquivo não acessa rede nem guarda nada. */
(function () {
  "use strict";
  var PI = Math.PI, TAU = PI * 2;
  function cl(x, a, b) { return x < a ? a : x > b ? b : x; }
  function mix(a, b, k) { return a + (b - a) * k; }
  function seg(t, a, b) { return b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a), 0, 1); }
  function eio(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function eo(k) { return 1 - Math.pow(1 - k, 3); }
  function ei(k) { return k * k * k; }
  function back(k) { var c = 1.4; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function hash(i, s) { var x = Math.sin((i + 1) * 127.1 + (s || 0) * 311.7) * 43758.5453; return x - Math.floor(x); }
  /* passo: em que item a sequência está (k) e quanto da passagem para o próximo já foi (q, com folga "tr" no fim de cada item) */
  function passo(t, tp, n, tr) { var k = Math.floor(t / tp), r = t - k * tp; if (k >= n - 1) return { k: n - 1, q: 0, pos: n - 1 }; var q = eio(seg(r, tp - tr, tp)); return { k: k, q: q, pos: k + q }; }
  function fit(R, o, k) { return Math.min(1.6, (k || 0.86) * Math.min(o.tw, o.th) / 2 / R); }
  var A = { fit: fit, cl: cl, mix: mix, seg: seg, eio: eio, eo: eo, ei: ei, back: back, hash: hash, passo: passo, PI: PI };

  /* ---------------- MODELOS ----------------
     quadro(t, n, D, A, o) → { cam:{rx,ry,rz,x,y,z,dist}, pecas:[{m, x,y,z, rx,ry,rz, w,h, op, uv, curva, curvaY, tras, trasUv, cor}] }
     m = índice da foto/take (−1 = peça lisa na cor "cor"); w/h em unidades (o lado MENOR da tela = 2 unidades); z cresce para longe.
     o.cw/o.ch = tamanho do cartão (proporção escolhida); o.tw/o.th = tamanho da TELA em unidades (para os efeitos de tela cheia). */
  var M = [];
  function mod(d) { M.push(d); }

  /* ===== 3D EM MOVIMENTO ===== */
  mod({ id: "anel", nome: "Anel girando", cat: "3d", desc: "As fotos formam um anel 3D que gira — visto de cima, como no exemplo.", nPad: 10, tp: 0.8, dur: function (n, tp) { return Math.max(6, n * tp + 2); },
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.62, ch = o.ch * 0.62, R = Math.max(0.95, n * cw * 1.06 / TAU), rot = -TAU * A.eio(A.seg(t, 0, D)) - 0.6, ab = A.eo(A.seg(t, 0, 1.4)), ps = [];
      for (var i = 0; i < n; i++) { var a = i / n * TAU + rot; ps.push({ m: i, x: R * Math.sin(a), y: 0, z: -R * Math.cos(a), ry: -a, w: cw, h: ch, curva: 1 / R }); }
      return { cam: { rx: mix(1.1, 0.5, ab), ry: 0, rz: -0.08, dist: R * 1.7 + 2.6 - ab * 0.4, zoom: A.fit(R * 1.08, o) * mix(1.25, 1, ab) }, pecas: ps }; } });
  mod({ id: "carrossel", nome: "Carrossel de frente", cat: "3d", desc: "Roda de fotos na altura dos olhos: uma de cada vez vem para a frente, grande.", nPad: 8, tp: 1.6,
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.85, ch = o.ch * 0.85, R = Math.max(1.1, n * cw * 1.25 / TAU), p = passo(t, D / n, n, 0.55), ps = [];
      for (var i = 0; i < n; i++) { var a = (i - p.pos) / n * TAU; ps.push({ m: i, x: R * Math.sin(a), y: 0, z: -R * Math.cos(a), ry: -a, w: cw, h: ch }); }
      return { cam: { rx: 0.16, dist: R + 2.35 }, pecas: ps }; } });
  mod({ id: "parede", nome: "Faixa curva", cat: "3d", desc: "Uma faixa de cartões em pé, dobrada em curva, que vai passando pela frente — como no exemplo.", nPad: 8, tp: 1.1,
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.95, ch = o.ch * 0.66, g = ch * 1.05, s0 = A.mix(-g, (n - 1) * g + g, A.eio(A.seg(t, 0, D))), ps = [], ond = Math.sin(t * 0.6) * 0.25;
      for (var i = 0; i < n; i++) { var s = i * g - s0; if (Math.abs(s) > 3.4) continue; var x = Math.sin(s * 0.85 + ond) * 0.42, z = s * s * 0.28, dx = Math.cos(s * 0.85 + ond) * 0.36;
        ps.push({ m: i, x: x, y: -s, z: z, rx: -Math.atan(s * 0.56), ry: -dx * 0.9, w: cw, h: ch, curva: 0.7, op: A.cl(3.4 - Math.abs(s), 0, 1) }); }
      return { cam: { rx: 0.05, ry: 0.32, dist: 3, zoom: 1.05 }, pecas: ps }; } });
  mod({ id: "cascata", nome: "Cascata voando", cat: "3d", desc: "As fotos vêm voando de longe, uma atrás da outra, passam pela frente e saem.", nPad: 10, tp: 0.8,
    quadro: function (t, n, D, A, o) { var vida = 3.4, tp = (D - vida) / Math.max(1, n - 1), ps = [];
      for (var i = 0; i < n; i++) { var q = (t - i * tp) / vida; if (q < 0 || q > 1) continue; var k = q < 0.62 ? 0.62 * A.eo(q / 0.62) : 0.62 + 0.38 * A.ei((q - 0.62) / 0.38);
        ps.push({ m: i, x: mix(1.5, -1.1, k), y: mix(1.7, -1.4, k), z: mix(7.5, -0.6, k), rx: mix(0.55, -0.2, k), ry: mix(0.85, -0.45, k), rz: mix(-0.3, 0.12, k), w: o.cw * 1.05, h: o.ch * 1.05, op: A.seg(q, 0, 0.07) * (1 - A.seg(q, 0.95, 1)) }); }
      return { cam: { dist: 3 }, pecas: ps }; } });
  mod({ id: "voo", nome: "Voo entre fotos", cat: "3d", desc: "A câmera atravessa um túnel de fotos espalhadas em espiral.", nPad: 12, tp: 0.9,
    quadro: function (t, n, D, A, o) { var g = 1.6, cz = A.mix(-2, (n - 1) * g + 0.3, A.eio(A.seg(t, 0, D))), ps = [];
      for (var i = 0; i < n; i++) { var a = i * 2.2, r = i === n - 1 ? 0 : 0.75, z = i * g - cz; if (z > 14) continue; ps.push({ m: i, x: Math.cos(a) * r, y: Math.sin(a) * r * 1.2, z: z, ry: -Math.cos(a) * r * 0.35, rz: Math.sin(i * 1.7) * 0.1, w: o.cw, h: o.ch, op: A.seg(z, -0.3, 0.4) }); }
      return { cam: { dist: 2.6 }, pecas: ps }; } });
  mod({ id: "espiral", nome: "Espiral subindo", cat: "3d", desc: "Uma hélice de fotos girando e subindo, como uma escada em caracol.", nPad: 12, tp: 0.8,
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.55, ch = o.ch * 0.55, R = 0.95, dy = ch * 0.5, sub = A.mix(-1.2, (n - 1) * dy + 1.2, A.eio(A.seg(t, 0, D))), rot = -t * 0.6, ps = [];
      for (var i = 0; i < n; i++) { var a = i * 0.8 + rot, y = -i * dy + sub; if (Math.abs(y) > 3) continue; ps.push({ m: i, x: R * Math.sin(a), y: y, z: -R * Math.cos(a), ry: -a, w: cw, h: ch, curva: 1 / R, op: A.cl(3 - Math.abs(y), 0, 1) }); }
      return { cam: { rx: 0.22, dist: 3.4, zoom: A.fit(R * 1.25, o) }, pecas: ps }; } });
  mod({ id: "leque", nome: "Leque de fotos", cat: "3d", desc: "As fotos abrem em leque e cada uma sobe para a frente na sua vez.", nPad: 7, tp: 1.3,
    quadro: function (t, n, D, A, o) { var ab = A.back(A.seg(t, 0, 1.2)), p = passo(Math.max(0, t - 1), (D - 1.4) / n, n, 0.6), ps = [], esp = Math.min(0.24, 1.6 / n);
      for (var i = 0; i < n; i++) { var d = i - p.pos, dest = Math.max(0, 1 - Math.abs(d)), a = (i - (n - 1) / 2) * esp * ab, ph = o.ch * 0.8;
        ps.push({ m: i, x: Math.sin(a) * ph * 0.95 * (1 - dest), y: -0.55 + Math.cos(a) * ph * 0.55 + dest * 0.55, z: 0.02 * i - dest * 0.9, rz: -a * (1 - dest), ry: dest * Math.sin(t * 2) * 0.08, w: o.cw * 0.8, h: ph }); }
      return { cam: { rx: 0.08, dist: 3 }, pecas: ps }; } });
  mod({ id: "onda", nome: "Onda de mosaico", cat: "3d", desc: "Um mosaico de fotos ondulando como um tecido, com a câmera girando devagar.", nPad: 16, nMax: 36, tp: 0.4, dur: function (n, tp) { return Math.max(7, n * tp); },
    quadro: function (t, n, D, A, o) { var c = Math.ceil(Math.sqrt(n * 0.8)), r = Math.ceil(n / c), cw = 0.7, ch = cw * o.ch / o.cw, g = 1.08, ps = [];
      for (var i = 0; i < n; i++) { var cx = i % c - (c - 1) / 2, cy = Math.floor(i / c) - (r - 1) / 2, ph = cx * 0.9 + cy * 0.7 - t * 2.4;
        ps.push({ m: i, x: cx * cw * g, y: -cy * ch * g, z: Math.sin(ph) * 0.3, ry: Math.cos(ph) * 0.3, rx: Math.cos(ph) * 0.18, w: cw, h: ch }); }
      return { cam: { rx: 0.45, ry: Math.sin(t * 0.35) * 0.4, dist: 3.4, zoom: A.fit(Math.max(c * cw, r * ch) * g * 0.5, o, 0.95) }, pecas: ps }; } });
  mod({ id: "coverflow", nome: "Vitrine (cover flow)", cat: "3d", desc: "Fila de capas: a do meio de frente e as outras inclinadas dos lados.", nPad: 8, tp: 1.4,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.45), ps = [], cw = o.cw * 0.95, ch = o.ch * 0.95;
      for (var i = 0; i < n; i++) { var d = i - p.pos, ad = Math.abs(d), sg = d < 0 ? -1 : 1, k = Math.min(1, ad);
        ps.push({ m: i, x: sg * (k * cw * 0.72 + Math.max(0, ad - 1) * cw * 0.3), y: 0, z: k * 0.85 + Math.max(0, ad - 1) * 0.05, ry: -sg * k * 1.05, w: cw, h: ch, op: A.cl(4 - ad, 0, 1) }); }
      return { cam: { rx: 0.05, dist: 2.9 }, pecas: ps }; } });
  mod({ id: "cubo", nome: "Cubo de fotos", cat: "3d", desc: "Um cubo girando que mostra uma foto em cada face.", nPad: 6, tp: 1.5, quadrado: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.6), s = 1.15, h = s / 2, ps = [], ang = -p.pos * PI / 2;
      for (var f = 0; f < 4; f++) { var k = f + 4 * Math.round((p.pos - f) / 4), a = f * PI / 2 + ang; ps.push({ m: ((k % n) + n) % n, x: h * Math.sin(a), y: 0, z: -h * Math.cos(a), ry: -a, w: s, h: s }); }
      ps.push({ m: -1, cor: "#1b1f2a", x: 0, y: h, z: 0, rx: -PI / 2, ry: ang, w: s, h: s });
      return { cam: { rx: 0.32 + Math.sin(t * 0.8) * 0.05, ry: 0.35, dist: 3.4 }, pecas: ps }; } });
  mod({ id: "esfera", nome: "Globo de fotos", cat: "3d", desc: "As fotos cobrem uma esfera que gira, e a câmera chega perto no fim.", nPad: 20, nMax: 40, tp: 0.35, dur: function (n, tp) { return Math.max(7, n * tp); },
    quadro: function (t, n, D, A, o) { var R = 1, ps = [], rot = t * 0.45, cw = Math.min(0.5, 2.6 / Math.sqrt(n)), ch = cw * o.ch / o.cw;
      for (var i = 0; i < n; i++) { var y = 1 - (i + 0.5) / n * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996 + rot, la = Math.asin(y);
        ps.push({ m: i, x: R * rr * Math.sin(th), y: R * y, z: -R * rr * Math.cos(th), ry: -th, rx: la, w: cw, h: ch, curva: 0.8 }); }
      return { cam: { rx: 0.15, dist: 3.2, zoom: A.fit(R * 1.3, o) * mix(1, 1.45, A.eio(A.seg(t, D * 0.6, D))) }, pecas: ps }; } });
  mod({ id: "chuva", nome: "Chuva de fotos", cat: "3d", desc: "Fotos caindo e girando devagar em várias profundidades, como confete gigante.", nPad: 14, tp: 0.5, dur: function (n, tp) { return Math.max(6, n * tp + 3); },
    quadro: function (t, n, D, A, o) { var ps = [], vida = 4.2;
      for (var i = 0; i < n; i++) { var ini = i * (D - vida) / Math.max(1, n - 1), q = (t - ini) / vida; if (q < 0 || q > 1) continue; var z = hash(i, 3) * 2.6 - 0.3;
        ps.push({ m: i, x: (hash(i, 1) - 0.5) * (1.8 + z * 0.8), y: mix(2.6 + z * 0.6, -2.6 - z * 0.6, q), z: z, rx: Math.sin(q * 3 + i) * 0.5, ry: Math.sin(q * 2.4 + i * 2) * 0.7, rz: (q - 0.5) * (hash(i, 6) - 0.5) * 2, w: o.cw * 0.85, h: o.ch * 0.85 }); }
      return { cam: { dist: 3 }, pecas: ps }; } });
  mod({ id: "pilha3d", nome: "Pilha que se abre", cat: "3d", desc: "Fotos empilhadas: a de cima voa para o lado e revela a próxima.", nPad: 8, tp: 1.3,
    quadro: function (t, n, D, A, o) { var tp = D / n, ps = [];
      for (var i = 0; i < n; i++) { var q = A.eio(A.seg(t, (i + 1) * tp - 0.6, (i + 1) * tp + 0.1)), lado = i % 2 ? 1 : -1; if (i === n - 1) q = 0; if (q >= 1) continue;
        ps.push({ m: i, x: q * 2.8 * lado + (hash(i) - 0.5) * 0.08, y: q * 0.6 + (hash(i, 2) - 0.5) * 0.08, z: i * 0.06 - q * 0.8, rz: (hash(i, 3) - 0.5) * 0.12 + q * lado * 0.8, ry: q * lado * 0.9, rx: -q * 0.3, w: o.cw, h: o.ch }); }
      return { cam: { rx: 0.18, ry: 0.12, dist: 3.1 }, pecas: ps }; } });
  mod({ id: "mergulho", nome: "Mergulho (foto dentro de foto)", cat: "3d", desc: "A câmera mergulha atravessando uma foto atrás da outra.", nPad: 8, tp: 1.2,
    quadro: function (t, n, D, A, o) { var g = 2.4, cz = A.mix(0, (n - 1) * g, A.eio(A.seg(t, 0.4, D - 0.4))), ps = [], tw = o.tw, th = o.th;
      for (var i = 0; i < n; i++) { var z = i * g - cz; if (z < -0.6) continue; ps.push({ m: i, x: 0, y: 0, z: z, rz: (i % 2 ? 1 : -1) * 0.06 * A.cl(z, 0, 1), w: tw * 0.86, h: th * 0.86, op: A.seg(z, -0.6, -0.1) }); }
      return { cam: { dist: 3 }, pecas: ps }; } });
  mod({ id: "escada", nome: "Escada de fotos", cat: "3d", desc: "As fotos em degraus diagonais e a câmera sobe por eles.", nPad: 8, tp: 1.2,
    quadro: function (t, n, D, A, o) { var p = A.mix(0, n - 1, A.eio(A.seg(t, 0, D))), ps = [];
      for (var i = 0; i < n; i++) { var d = i - p; if (d < -1.6 || d > 6) continue; ps.push({ m: i, x: d * 0.62, y: -d * 0.42, z: d * 0.9, ry: -0.42, rx: 0.1, w: o.cw * 0.9, h: o.ch * 0.9, op: A.cl(d + 1.6, 0, 1) }); }
      return { cam: { rx: 0.1, ry: 0.1, dist: 3, zoom: 1.15 }, pecas: ps }; } });
  mod({ id: "museu", nome: "Parede de museu", cat: "3d", desc: "Quadros numa parede em perspectiva e a câmera passeando ao longo dela.", nPad: 8, tp: 1.3, borda: "branca",
    quadro: function (t, n, D, A, o) { var g = o.cw + 0.4, p = A.mix(-0.3, (n - 1) * g + 0.3, A.eio(A.seg(t, 0, D))), ps = [];
      for (var i = 0; i < n; i++) { var x = i * g - p; if (Math.abs(x) > 5) continue; ps.push({ m: i, x: x, y: 0.05, z: 0, w: o.cw, h: o.ch }); }
      return { cam: { ry: -0.7, rx: 0.05, x: 0.25, dist: 2.6, zoom: 1.25 }, pecas: ps }; } });
  mod({ id: "montagem", nome: "Mosaico que se monta", cat: "3d", desc: "As fotos chegam voando de todos os lados e formam um mosaico.", nPad: 12, nMax: 30, tp: 0.45, dur: function (n, tp) { return Math.max(6, n * tp + 3); },
    quadro: function (t, n, D, A, o) { var c = Math.ceil(Math.sqrt(n * 0.75)), r = Math.ceil(n / c), cw = 0.7, ch = cw * o.ch / o.cw, ps = [];
      for (var i = 0; i < n; i++) { var k = A.eo(A.seg(t, i * 0.12, i * 0.12 + 1.3)), sai = A.ei(A.seg(t, D - 1.2, D)), cx = (i % c - (c - 1) / 2) * cw * 1.06, cy = -(Math.floor(i / c) - (r - 1) / 2) * ch * 1.06, a = hash(i) * TAU;
        ps.push({ m: i, x: mix(Math.cos(a) * 4, cx, k), y: mix(Math.sin(a) * 4, cy, k), z: mix(-1.5 + hash(i, 2) * 6, 0, k) - sai * 2, rx: (1 - k) * 3, ry: (1 - k) * 2 + sai, rz: (1 - k) * 2, w: cw, h: ch, op: A.seg(t, i * 0.12, i * 0.12 + 0.2) * (1 - sai) }); }
      return { cam: { rx: 0.22 + Math.sin(t * 0.4) * 0.08, ry: Math.sin(t * 0.3) * 0.25, dist: 3.4, zoom: A.fit(Math.max(c * cw, r * ch) * 0.53, o, 0.95) }, pecas: ps }; } });
  mod({ id: "slot", nome: "Rolo (caça-níquel)", cat: "3d", desc: "Um rolo vertical que gira e para em cada foto.", nPad: 8, tp: 1.3,
    quadro: function (t, n, D, A, o) { var cw = o.cw * 1.1, ch = o.ch * 0.8, R = Math.max(1, n * ch * 1.04 / TAU), p = passo(t, D / n, n, 0.7), ps = [];
      for (var i = 0; i < n; i++) { var a = (i - p.pos) / n * TAU; ps.push({ m: i, x: 0, y: R * Math.sin(a), z: -R * Math.cos(a), rx: a, w: cw, h: ch, curvaY: 1 / R }); }
      return { cam: { ry: 0.25, rx: -0.05, dist: R + 2.3 }, pecas: ps }; } });

  /* ===== ÁLBUM DE FOTOS ===== */
  mod({ id: "polaroid", nome: "Polaroids na mesa", cat: "album", desc: "Fotos estilo polaroid caindo uma a uma sobre a mesa e formando uma pilha.", nPad: 8, tp: 1.2, borda: "polaroid", verso: "papel", fundo: "madeira",
    quadro: function (t, n, D, A, o) { var tp = (D - 1) / n, ps = [];
      for (var i = 0; i < n; i++) { var k = A.eo(A.seg(t, i * tp, i * tp + 0.7)); if (k <= 0) continue;
        ps.push({ m: i, x: (hash(i, 1) - 0.5) * 1.1, y: (hash(i, 2) - 0.5) * 1.1, z: mix(-1.8, 0, k) - i * 0.003, rz: (hash(i, 3) - 0.5) * 0.7 + (1 - k) * 0.6, rx: (1 - k) * 0.3, w: o.cw * 0.9, h: o.ch * 0.9, op: A.seg(t, i * tp, i * tp + 0.15), sombra: k }); }
      return { cam: { dist: mix(3.4, 2.9, A.eio(A.seg(t, 0, D))), rz: mix(0.05, -0.05, t / D) }, pecas: ps }; } });
  mod({ id: "livro", nome: "Livro de fotos", cat: "album", desc: "Um álbum aberto: as páginas viram e mostram as fotos dos dois lados.", nPad: 9, tp: 1.4, verso: "foto", fundo: "estudio",
    quadro: function (t, n, D, A, o) { var pw = o.cw * 0.88, ph = o.ch * 0.88, giros = Math.ceil((n - 1) / 2), tg = D / (giros + 1), ps = [], vira = 0, s = 0;
      for (var g = 0; g < giros; g++) { var q = A.eio(A.seg(t, (g + 0.6) * tg, (g + 0.6) * tg + 1.1)); if (q >= 1) s = g + 1; else { vira = q; s = g; break; } }
      if (s >= giros) vira = 0;
      ps.push({ m: -1, cor: "#3a2a1c", x: 0, y: 0, z: 0.03, w: pw * 2.12, h: ph * 1.06 });
      var esq = 2 * s - 1, dir = 2 * s;
      if (esq >= 0) ps.push({ m: esq, x: -pw / 2, y: 0, z: 0, w: pw, h: ph });
      var baixo = vira > 0 ? dir + 2 : dir; if (baixo < n) ps.push({ m: baixo, x: pw / 2, y: 0, z: 0.001, w: pw, h: ph }); else if (vira > 0) ps.push({ m: -1, cor: "#efe8dc", x: pw / 2, y: 0, z: 0.001, w: pw, h: ph });
      if (vira > 0) { var th = vira * PI; ps.push({ m: dir < n ? dir : -1, cor: "#efe8dc", tras: dir + 1 < n ? dir + 1 : -1, trasEixo: "y", x: (pw / 2) * Math.cos(th), y: 0, z: -(pw / 2) * Math.sin(th) - 0.002, ry: th, w: pw, h: ph, curva: Math.sin(vira * PI) * 0.6 }); }
      return { cam: { rx: 0.55, rz: 0, dist: 3.2 + (o.tw < o.th ? 0.9 : 0) }, pecas: ps }; } });
  mod({ id: "varal", nome: "Varal de fotos", cat: "album", desc: "Fotos penduradas num varal balançando, e a câmera passando por elas.", nPad: 8, tp: 1.2, borda: "polaroid", verso: "papel",
    quadro: function (t, n, D, A, o) { var g = o.cw * 0.85 + 0.25, p = A.mix(-0.2, (n - 1) * g + 0.2, A.eio(A.seg(t, 0, D))), ps = [], yl = 0.75;
      ps.push({ m: -1, cor: "#e6dfd0", x: 0, y: yl, z: 0.01, w: 9, h: 0.02 });
      for (var i = 0; i < n; i++) { var a = Math.sin(t * 2 + i * 1.3) * 0.07, ph = o.ch * 0.85, x = i * g - p; if (Math.abs(x) > 4) continue;
        ps.push({ m: i, x: x + Math.sin(a) * ph / 2, y: yl - Math.cos(a) * ph / 2 - 0.02, z: 0, rz: a, ry: Math.sin(t * 1.3 + i) * 0.1, w: o.cw * 0.85, h: ph });
        ps.push({ m: -1, cor: "#c08a4a", x: x, y: yl - 0.03, z: -0.01, rz: a, w: 0.06, h: 0.14 }); }
      return { cam: { rx: 0.05, ry: -0.3, dist: 2.8 }, pecas: ps }; } });
  mod({ id: "colagem", nome: "Colagem passeio", cat: "album", desc: "Um mural de fotos espalhadas: a câmera vai de foto em foto e mostra tudo no fim.", nPad: 9, tp: 1.4, borda: "branca", fundo: "papel",
    quadro: function (t, n, D, A, o) { var c = Math.ceil(Math.sqrt(n)), rr = Math.ceil(n / c), ps = [], pos = [], cw = o.cw * 0.9, ch = o.ch * 0.9;
      for (var i = 0; i < n; i++) { var px = (i % c - (c - 1) / 2) * cw * 1.15 + (hash(i, 1) - 0.5) * 0.2, py = -(Math.floor(i / c) - (rr - 1) / 2) * ch * 1.15 + (hash(i, 2) - 0.5) * 0.2; pos.push([px, py]);
        ps.push({ m: i, x: px, y: py, z: -i * 0.002, rz: (hash(i, 3) - 0.5) * 0.35, w: cw, h: ch, sombra: 1 }); }
      var Tf = D - 1.8, p = passo(Math.min(t, Tf), Tf / n, n, 0.7), a0 = pos[p.k], a1 = pos[Math.min(n - 1, p.k + 1)], vx = mix(a0[0], a1[0], p.q), vy = mix(a0[1], a1[1], p.q), fim = A.eio(A.seg(t, Tf, D - 0.2));
      var todo = A.fit(Math.max(c * cw, rr * ch) * 0.55, o, 0.95), perto = A.fit(Math.max(cw, ch) * 0.62, o) * (1 - Math.sin(p.q * PI) * 0.18);
      return { cam: { x: -vx * (1 - fim), y: -vy * (1 - fim), dist: 3, zoom: mix(perto, todo, fim), rz: -0.03 }, pecas: ps }; } });
  mod({ id: "deck", nome: "Folheando fotos", cat: "album", desc: "Um maço de fotos: a da frente desliza para trás da pilha, como quem folheia.", nPad: 8, tp: 1.2, borda: "branca", verso: "papel",
    quadro: function (t, n, D, A, o) { var tp = D / n, ps = [], at = Math.floor(t / tp), q = A.eio(A.seg(t - at * tp, tp - 0.7, tp));
      for (var i = 0; i < n; i++) { var lugar = ((i - at) % n + n) % n, sai = lugar === 0 ? q : 0, arco = Math.sin(sai * PI);
        ps.push({ m: i, x: arco * 1.25, y: arco * 0.15, z: lugar * 0.05 + sai * (n * 0.05) - arco * 0.3, rz: (hash(i) - 0.5) * 0.1 + arco * 0.3, ry: arco * 0.5, w: o.cw, h: o.ch }); }
      return { cam: { rx: 0.12, dist: 3 }, pecas: ps }; } });
  mod({ id: "linha", nome: "Linha do tempo", cat: "album", desc: "Fotos ao longo de uma linha, alternando em cima e embaixo, com a câmera seguindo.", nPad: 8, tp: 1.2,
    quadro: function (t, n, D, A, o) { var g = o.cw * 0.55 + 0.25, p = A.mix(0, (n - 1) * g, A.eio(A.seg(t, 0.3, D - 0.3))), ps = [], cw = o.cw * 0.62, ch = o.ch * 0.62;
      ps.push({ m: -1, cor: "#B6FF3B", x: 0, y: 0, z: 0.01, w: 9, h: 0.025 });
      for (var i = 0; i < n; i++) { var x = i * g - p; if (Math.abs(x) > 4) continue; var aqui = A.back(A.seg(-x, -1.2, 0.1)), em = i % 2 ? -1 : 1;
        ps.push({ m: -1, cor: "#B6FF3B", x: x, y: 0, z: 0, w: 0.08, h: 0.08, rz: PI / 4 });
        ps.push({ m: i, x: x, y: em * (ch / 2 + 0.12), z: 0, w: cw * (0.55 + 0.45 * aqui), h: ch * (0.55 + 0.45 * aqui), op: A.cl(aqui * 2, 0, 1) }); }
      return { cam: { ry: -0.3, rx: 0.1, dist: 2.8, zoom: A.fit(ch * 1.15, o) }, pecas: ps }; } });
  mod({ id: "moldura", nome: "Moldura flutuante", cat: "album", desc: "Uma foto por vez, flutuando no centro e virando como cartão para a próxima.", nPad: 6, tp: 2, verso: "foto",
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.75), ps = [], k = p.k, fl = Math.sin(t * 1.4) * 0.05, z = Math.sin(p.q * PI) * 0.8;
      ps.push({ m: k, tras: Math.min(n - 1, k + 1), trasEixo: "y", x: 0, y: fl, z: z, ry: p.q * PI + Math.sin(t * 0.9) * 0.12, rx: Math.cos(t * 1.1) * 0.06, w: o.cw * 1.1, h: o.ch * 1.1, uvZoom: 1 + A.seg(t - k * D / n, 0, D / n) * 0.08 });
      return { cam: { dist: 3 }, pecas: ps }; } });
  mod({ id: "scrapbook", nome: "Scrapbook", cat: "album", desc: "Página de recortes: as fotos entram coladas com fita, uma a uma.", nPad: 6, tp: 1.2, borda: "branca", fundo: "papel",
    quadro: function (t, n, D, A, o) { var c = n <= 4 ? 2 : 3, r = Math.ceil(n / c), cw = o.cw * 0.9, ch = o.ch * 0.9, tp = (D - 1) / n, ps = [];
      for (var i = 0; i < n; i++) { var k = A.back(A.seg(t, i * tp, i * tp + 0.55)); if (k <= 0) continue; var x = (i % c - (c - 1) / 2) * cw * 1.12, y = -(Math.floor(i / c) - (r - 1) / 2) * ch * 1.12, rz = (hash(i, 3) - 0.5) * 0.25;
        ps.push({ m: i, x: x, y: y, z: (1 - k) * -0.8, rz: rz, w: cw * k, h: ch * k, sombra: 1, op: A.seg(t, i * tp, i * tp + 0.1) });
        ps.push({ m: -1, cor: "rgba(240,226,170,.8)", x: x, y: y + ch * k / 2, z: (1 - k) * -0.8 - 0.002, rz: rz + 0.25, w: cw * 0.35 * k, h: 0.1 * k }); }
      return { cam: { dist: 3, zoom: A.fit(Math.max(c * cw, r * ch) * 0.53, o, 0.95) * (1 + Math.sin(t * 0.5) * 0.02) }, pecas: ps }; } });
  mod({ id: "grade", nome: "Grade que revela", cat: "album", desc: "Mosaico de capas: cada foto se acende e cresce na sua vez.", nPad: 9, nMax: 25, tp: 1,
    quadro: function (t, n, D, A, o) { var c = Math.ceil(Math.sqrt(n)), r = Math.ceil(n / c), cw = 0.8, ch = cw * o.ch / o.cw, p = passo(t, D / n, n, 0.4), ps = [];
      for (var i = 0; i < n; i++) { var d = Math.max(0, 1 - Math.abs(i - p.pos)), ent = A.eo(A.seg(t, i * 0.06, i * 0.06 + 0.5));
        ps.push({ m: i, x: (i % c - (c - 1) / 2) * cw * 1.06, y: -(Math.floor(i / c) - (r - 1) / 2) * ch * 1.06, z: -d * 0.6 + (1 - ent) * 2, ry: (1 - ent) * 1.2, w: cw, h: ch, sombra: d, escuro: 0.45 * (1 - d), op: A.seg(ent, 0, 0.3) }); }
      return { cam: { rx: 0.12, ry: Math.sin(t * 0.4) * 0.15, dist: 3.4, zoom: A.fit(Math.max(c * cw, r * ch) * 0.53, o, 0.95) }, pecas: ps }; } });

  mod({ id: "filme", nome: "Rolo de filme", cat: "album", desc: "As fotos passam como num rolo de filme antigo, com os furinhos na lateral.", nPad: 8, tp: 1.1, fundo: "estudio",
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.85, ch = o.ch * 0.85, g = ch * 1.12, s0 = A.mix(0, (n - 1) * g, A.eio(A.seg(t, 0.2, D - 0.2))), ps = [], larg = cw * 1.32;
      for (var i = -2; i < n + 2; i++) { var y = -i * g + s0; if (Math.abs(y) > 3.2) continue;
        ps.push({ m: -1, cor: "#141414", x: 0, y: y, z: 0.004, w: larg, h: g * 1.01 });
        if (i >= 0 && i < n) ps.push({ m: i, x: 0, y: y, z: 0, w: cw, h: ch });
        for (var f = 0; f < 4; f++) { var fy = y + g / 2 - (f + 0.5) * g / 4; ps.push({ m: -1, cor: "#e8e2d4", x: -larg / 2 + larg * 0.075, y: fy, z: 0.002, w: larg * 0.055, h: g * 0.11 }); ps.push({ m: -1, cor: "#e8e2d4", x: larg / 2 - larg * 0.075, y: fy, z: 0.002, w: larg * 0.055, h: g * 0.11 }); } }
      return { cam: { rx: -0.12, ry: 0.42, rz: 0.12, dist: 2.8, zoom: 1.05 }, pecas: ps }; } });
  mod({ id: "retratos", nome: "Estante de retratos", cat: "album", desc: "Porta-retratos em pé numa estante, e a câmera passeia de um para o outro.", nPad: 7, tp: 1.4, borda: "branca", fundo: "estudio",
    quadro: function (t, n, D, A, o) { var cw = o.cw * 0.7, ch = o.ch * 0.7, g = cw * 1.25, p = passo(t, D / n, n, 0.7), ps = [], foco = p.pos * g;
      ps.push({ m: -1, cor: "#5a4030", x: 0, y: -ch / 2 - 0.03, z: 0.15, rx: PI / 2, w: n * g + 6, h: 0.6 });
      for (var i = 0; i < n; i++) { var x = i * g - foco; if (Math.abs(x) > 4) continue; ps.push({ m: i, x: x, y: 0, z: (i % 2) * 0.12, ry: (hash(i) - 0.5) * 0.3, rx: -0.08, w: cw, h: ch, sombra: 1 }); }
      return { cam: { rx: 0.18, ry: -0.18, dist: 2.6, zoom: 1.15 }, pecas: ps }; } });
  mod({ id: "mesa", nome: "Mesa de luz", cat: "album", desc: "Vista de cima: as fotos deslizam de todos os lados e se ajeitam sobre a mesa.", nPad: 8, tp: 1, borda: "branca", fundo: "claro", verso: "papel",
    quadro: function (t, n, D, A, o) { var tp = (D - 1.2) / n, ps = [], c = n <= 4 ? 2 : 3, r = Math.ceil(n / c), cw = o.cw * 0.8, ch = o.ch * 0.8;
      for (var i = 0; i < n; i++) { var k = A.eo(A.seg(t, i * tp, i * tp + 0.8)); if (k <= 0) continue; var a = hash(i, 5) * TAU, x = (i % c - (c - 1) / 2) * cw * 1.05 + (hash(i, 1) - 0.5) * 0.15, y = -(Math.floor(i / c) - (r - 1) / 2) * ch * 1.05 + (hash(i, 2) - 0.5) * 0.15;
        ps.push({ m: i, x: mix(x + Math.cos(a) * 3.5, x, k), y: mix(y + Math.sin(a) * 3.5, y, k), z: -i * 0.003, rz: (hash(i, 3) - 0.5) * 0.4 + (1 - k) * 1.2, w: cw, h: ch, sombra: 1 }); }
      return { cam: { dist: 3, zoom: A.fit(Math.max(c * cw, r * ch) * 0.55, o, 0.95) }, pecas: ps }; } });
  mod({ id: "coracao", nome: "Coração de fotos", cat: "album", desc: "As fotos vão formando um coração, uma a uma — ótimo para casamento e aniversário de namoro.", nPad: 16, nMin: 8, nMax: 30, tp: 0.4, fundo: "degrade", dur: function (n, tp) { return Math.max(6, n * tp + 2.4); },
    quadro: function (t, n, D, A, o) { var ps = [], cw = Math.min(0.42, 4 / n + 0.12), ch = cw * o.ch / o.cw, tp = (D - 2.4) / n;
      for (var i = 0; i < n; i++) { var a = i / n * TAU, hx = 16 * Math.pow(Math.sin(a), 3) / 17, hy = (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17, k = A.back(A.seg(t, i * tp, i * tp + 0.5)); if (k <= 0) continue;
        ps.push({ m: i, x: hx * 1.15, y: hy * 1.15 + 0.1, z: (1 - k) * -1.2, rz: (hash(i) - 0.5) * 0.4, w: cw * k, h: ch * k, sombra: 1 }); }
      var bate = 1 + Math.max(0, Math.sin((t - (D - 2.2)) * 7)) * 0.04 * A.seg(t, D - 2.2, D - 2);
      return { cam: { dist: 3, zoom: A.fit(1.24, o, 0.95) * bate, ry: Math.sin(t * 0.5) * 0.06 }, pecas: ps }; } });
  mod({ id: "capa", nome: "Álbum de capa dura", cat: "album", desc: "A capa do álbum se abre e as fotos aparecem uma a uma, como num álbum de verdade.", nPad: 6, tp: 1.4, fundo: "madeira", borda: "branca", verso: "papel",
    quadro: function (t, n, D, A, o) { var pw = o.cw * 0.95, ph = o.ch * 0.95, ab = A.eio(A.seg(t, 0.3, 1.5)), th = ab * PI * 0.96, ps = [], tp = (D - 1.8) / n, p = passo(Math.max(0, t - 1.6), tp, n, 0.5);
      ps.push({ m: -1, cor: "#2b1d14", x: 0, y: 0, z: 0.02, w: pw * 1.12, h: ph * 1.12 });
      ps.push({ m: -1, cor: "#f3efe6", x: 0, y: 0, z: 0.012, w: pw * 1.04, h: ph * 1.04 });
      if (ab > 0.5) ps.push({ m: p.k, x: 0, y: 0, z: 0.005, w: pw * 0.92, h: ph * 0.92, op: A.seg(ab, 0.5, 1) });
      if (p.q > 0) ps.push({ m: Math.min(n - 1, p.k + 1), tras: -1, x: 0, y: 0, z: 0.004 - p.q * 0.002, w: pw * 0.92, h: ph * 0.92, op: p.q });
      ps.push({ m: -1, cor: "#6b1f2a", x: -pw * 0.56 + (pw * 0.56) * Math.cos(th), y: 0, z: -(pw * 0.56) * Math.sin(th) - 0.01, ry: th, w: pw * 1.12, h: ph * 1.12, op: 1 - A.seg(ab, 0.85, 1) });
      return { cam: { rx: 0.35, dist: 3, zoom: A.fit(Math.max(pw, ph) * 0.62, o, 0.95) }, pecas: ps }; } });

  /* ===== EFEITOS 3D (tela cheia, foto ou vídeo) ===== */
  function cheia(o) { return { w: o.tw, h: o.th }; }
  mod({ id: "fx-cubo", nome: "Cubo (tela cheia)", cat: "efeitos", desc: "Cada foto/vídeo ocupa a tela e gira como a face de um cubo para o próximo.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.8), w = o.tw, h = o.th, ps = [], a = p.q * PI / 2, r = w / 2;
      ps.push({ m: p.k, x: -Math.sin(a) * r + 0, y: 0, z: r - Math.cos(a) * r, ry: a, w: w, h: h });
      if (p.q > 0) ps.push({ m: p.k + 1, x: Math.cos(a) * r, y: 0, z: r - Math.sin(a) * r, ry: a - PI / 2, w: w, h: h });
      return { cam: { dist: 3 + Math.sin(p.q * PI) * 0.8 }, pecas: ps }; } });
  mod({ id: "fx-cubo-v", nome: "Cubo para cima", cat: "efeitos", desc: "Igual ao cubo, mas girando de baixo para cima.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.8), w = o.tw, h = o.th, ps = [], a = p.q * PI / 2, r = h / 2;
      ps.push({ m: p.k, x: 0, y: Math.sin(a) * r, z: r - Math.cos(a) * r, rx: a, w: w, h: h });
      if (p.q > 0) ps.push({ m: p.k + 1, x: 0, y: -Math.cos(a) * r, z: r - Math.sin(a) * r, rx: a - PI / 2, w: w, h: h });
      return { cam: { dist: 3 + Math.sin(p.q * PI) * 0.9 }, pecas: ps }; } });
  mod({ id: "fx-persiana", nome: "Persiana 3D", cat: "efeitos", desc: "A tela se divide em faixas que giram uma a uma e trazem a próxima foto.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1.1), w = o.tw, h = o.th, f = 9, fw = w / f, ps = [];
      if (!p.q) return { cam: {}, pecas: [{ m: p.k, w: w, h: h }] };
      var raw = A.seg(t - p.k * D / n, D / n - 1.1, D / n);
      for (var i = 0; i < f; i++) { var q = A.eio(A.seg(raw, i / f * 0.45, i / f * 0.45 + 0.55)), u0 = i / f, u1 = (i + 1) / f;
        ps.push({ m: p.k, uv: [u0, 0, u1, 1], tras: p.k + 1, trasUv: [u1, 0, u0, 1], x: -w / 2 + fw * (i + 0.5), y: 0, z: Math.sin(q * PI) * 0.25, ry: q * PI, w: fw * 1.002, h: h }); }
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-mosaico", nome: "Mosaico que vira", cat: "efeitos", desc: "Peças quadradas viram em onda diagonal e montam a próxima imagem.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1.2), w = o.tw, h = o.th, c = 6, r = Math.max(2, Math.round(c * h / w)), cw = w / c, rh = h / r, ps = [];
      if (!p.q) return { cam: {}, pecas: [{ m: p.k, w: w, h: h }] };
      var raw = A.seg(t - p.k * D / n, D / n - 1.2, D / n);
      for (var i = 0; i < c; i++) for (var j = 0; j < r; j++) { var dl = (i / c + j / r) / 2 * 0.5, q = A.eio(A.seg(raw, dl, dl + 0.5)), u0 = i / c, u1 = (i + 1) / c, v0 = j / r, v1 = (j + 1) / r;
        ps.push({ m: p.k, uv: [u0, v0, u1, v1], tras: p.k + 1, trasUv: [u0, v1, u1, v0], trasEixo: "x", x: -w / 2 + cw * (i + 0.5), y: h / 2 - rh * (j + 0.5), z: Math.sin(q * PI) * 0.35, rx: q * PI, w: cw * 1.004, h: rh * 1.004 }); }
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-explosao", nome: "Explosão em peças", cat: "efeitos", desc: "A imagem se quebra em pedaços que voam na sua direção e revelam a próxima.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1), w = o.tw, h = o.th, c = 7, r = Math.max(3, Math.round(c * h / w)), cw = w / c, rh = h / r, ps = [];
      if (!p.q) return { cam: {}, pecas: [{ m: p.k, w: w, h: h }] };
      ps.push({ m: p.k + 1, z: 0.6 * (1 - p.q), w: w, h: h });
      for (var i = 0; i < c; i++) for (var j = 0; j < r; j++) { var id = i * 31 + j, q = A.ei(p.q), cx = -w / 2 + cw * (i + 0.5), cy = h / 2 - rh * (j + 0.5);
        ps.push({ m: p.k, uv: [i / c, j / r, (i + 1) / c, (j + 1) / r], x: cx * (1 + q * 1.6) + (hash(id) - 0.5) * q, y: cy * (1 + q * 1.4) + (hash(id, 2) - 0.5) * q, z: -q * (1.5 + hash(id, 3) * 2.5), rx: q * (hash(id, 4) - 0.5) * 8, ry: q * (hash(id, 5) - 0.5) * 8, rz: q * (hash(id, 6) - 0.5) * 4, w: cw * 1.004, h: rh * 1.004, op: 1 - A.seg(p.q, 0.7, 1) }); }
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-montar", nome: "Peças se montando", cat: "efeitos", desc: "A próxima imagem chega em pedaços voando e se monta por cima.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1.2), w = o.tw, h = o.th, c = 6, r = Math.max(3, Math.round(c * h / w)), cw = w / c, rh = h / r, ps = [{ m: p.k, z: 0.02, w: w, h: h, escuro: p.q * 0.5 }];
      if (!p.q) return { cam: {}, pecas: ps };
      for (var i = 0; i < c; i++) for (var j = 0; j < r; j++) { var id = i * 17 + j * 5, dl = hash(id) * 0.4, q = A.eo(A.seg(p.q, dl, dl + 0.6)), cx = -w / 2 + cw * (i + 0.5), cy = h / 2 - rh * (j + 0.5), a = hash(id, 2) * TAU;
        ps.push({ m: p.k + 1, uv: [i / c, j / r, (i + 1) / c, (j + 1) / r], x: mix(cx + Math.cos(a) * 3, cx, q), y: mix(cy + Math.sin(a) * 3, cy, q), z: mix(-2.2, -0.001, q), rx: (1 - q) * 4, ry: (1 - q) * 3, w: cw * 1.004, h: rh * 1.004, op: A.seg(q, 0, 0.2) }); }
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-virar", nome: "Cartão virando", cat: "efeitos", desc: "A tela inteira vira como um cartão e mostra a próxima no verso.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.9), q = p.q;
      return { cam: { dist: 3 + Math.sin(q * PI) * 1.6 }, pecas: [{ m: p.k, tras: Math.min(n - 1, p.k + 1), trasEixo: "y", ry: q * PI, rz: Math.sin(q * PI) * 0.08, w: o.tw, h: o.th }] }; } });
  mod({ id: "fx-pagina", nome: "Página virando", cat: "efeitos", desc: "A imagem vira como a página de uma revista e revela a próxima.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1), w = o.tw, h = o.th, ps = [];
      if (p.q > 0) ps.push({ m: p.k + 1, z: 0.002, w: w, h: h, escuro: 0.35 * (1 - p.q) });
      var th = p.q * PI * 0.98; ps.push({ m: p.k, cor: "#e9e4da", x: -w / 2 + (w / 2) * Math.cos(th), z: -(w / 2) * Math.sin(th), ry: th, w: w, h: h, curva: Math.sin(p.q * PI) * 0.7, op: 1 - A.seg(p.q, 0.85, 1) });
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-portas", nome: "Portas abrindo", cat: "efeitos", desc: "A imagem se abre ao meio como duas portas e mostra a próxima atrás.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1), w = o.tw, h = o.th, ps = [], a = p.q * PI * 0.52, hw = w / 2;
      if (!p.q) return { cam: {}, pecas: [{ m: p.k, w: w, h: h }] };
      ps.push({ m: p.k + 1, z: 0.4 * (1 - p.q), w: w, h: h });
      ps.push({ m: p.k, uv: [0, 0, 0.5, 1], x: -w / 2 + (hw / 2) * Math.cos(a), z: -(hw / 2) * Math.sin(a), ry: a, w: hw, h: h, op: 1 - A.seg(p.q, 0.8, 1) });
      ps.push({ m: p.k, uv: [0.5, 0, 1, 1], x: w / 2 - (hw / 2) * Math.cos(a), z: -(hw / 2) * Math.sin(a), ry: -a, w: hw, h: h, op: 1 - A.seg(p.q, 0.8, 1) });
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-sanfona", nome: "Sanfona", cat: "efeitos", desc: "A imagem dobra em sanfona para o lado e a próxima aparece atrás.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 1.1), w = o.tw, h = o.th, f = 6, fw = w / f, ps = [];
      if (!p.q) return { cam: {}, pecas: [{ m: p.k, w: w, h: h }] };
      ps.push({ m: p.k + 1, z: 0.6, w: w, h: h, escuro: 0.4 * (1 - p.q) });
      var a = p.q * 1.5, dx = fw * Math.cos(a), dz = fw * Math.sin(a), op = 1 - A.seg(p.q, 0.88, 1);
      for (var i = 0; i < f; i++) { var par = i % 2 === 0; ps.push({ m: p.k, uv: [i / f, 0, (i + 1) / f, 1], x: -w / 2 + dx * (i + 0.5), z: dz / 2 - 0.001, ry: par ? -a : a, w: fw * 1.003, h: h, op: op }); }
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-mergulho", nome: "Zoom de mergulho", cat: "efeitos", desc: "A imagem voa para cima da câmera e a próxima chega de longe.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.9), w = o.tw, h = o.th, ps = [];
      ps.push({ m: p.k, z: -p.q * 2.4, rz: p.q * 0.4, w: w, h: h, op: 1 - A.seg(p.q, 0.55, 1) });
      if (p.q > 0) ps.push({ m: p.k + 1, z: (1 - p.q) * 6, rz: -(1 - p.q) * 0.5, w: w, h: h, op: A.seg(p.q, 0, 0.4) });
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-inclinar", nome: "Inclinação 3D suave", cat: "efeitos", desc: "Cada foto/vídeo se inclina devagar em 3D, com zoom suave e troca em fade — ótimo para vídeo.", nPad: 5, tp: 2.6, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.6), ps = [], tl = t - p.k * D / n;
      function um(m, k, op, z) { return { m: m, z: z, rx: Math.sin(tl * 0.9 + k) * 0.12, ry: Math.cos(tl * 0.7 + k) * 0.18, w: o.tw * 0.9, h: o.th * 0.9, op: op, uvZoom: 1 + A.seg(tl, 0, D / n) * 0.1, sombra: 1 }; }
      ps.push(um(p.k, p.k, 1, 0)); if (p.q > 0) ps.push(um(p.k + 1, p.k + 1, p.q, -0.01));
      return { cam: {}, pecas: ps }; } });
  mod({ id: "fx-carta", nome: "Carta deslizando", cat: "efeitos", desc: "A imagem da frente desliza girando para fora e mostra a próxima embaixo.", nPad: 5, tp: 2.2, tela: true, seq: true,
    quadro: function (t, n, D, A, o) { var p = passo(t, D / n, n, 0.9), ps = [], q = p.q;
      if (q > 0) ps.push({ m: p.k + 1, z: 0.01, w: o.tw * 0.9, h: o.th * 0.9, escuro: 0.3 * (1 - q) });
      ps.push({ m: p.k, x: q * o.tw * 1.2, y: q * 0.4, z: -q * 0.5, rz: q * 0.5, ry: -q * 0.6, w: o.tw * 0.9, h: o.th * 0.9, sombra: 1 });
      return { cam: {}, pecas: ps }; } });

  var CATS = [["todos", "TODOS"], ["3d", "3D EM MOVIMENTO"], ["album", "ÁLBUM DE FOTOS"], ["efeitos", "EFEITOS 3D"]];
  var POR = {}; M.forEach(function (m) { POR[m.id] = m; });

  /* ---------------- desenho ---------------- */
  var PALETA = [["#7C5CFF", "#C04CFF"], ["#FF4FA3", "#FF7A59"], ["#FFB020", "#FF7A00"], ["#22C55E", "#0EA5A4"], ["#06B6D4", "#3B82F6"], ["#F43F5E", "#FB7185"], ["#A855F7", "#6366F1"], ["#10B981", "#84CC16"], ["#F97316", "#EF4444"], ["#3B82F6", "#06B6D4"]];
  function rrect(c, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function cover(c, el, sw, sh, x, y, w, h, z) { z = z || 1; var k = Math.max(w / sw, h / sh) * z, dw = sw * k, dh = sh * k; c.drawImage(el, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh); }

  /* textura de um item: foto/take cortado no formato do cartão + moldura + cantos; cache por chave */
  var CACHE0 = {};
  function textura(i, tw, th, est, fonte, chave, CACHE) {
    var k = i + "|" + tw + "x" + th + "|" + est.chave + "|" + chave, T = CACHE[i];
    if (T && T.k === k) return T;
    if (!T) T = CACHE[i] = { cv: document.createElement("canvas"), sil: document.createElement("canvas"), pap: null, k: "" };
    var cv = T.cv; if (cv.width !== tw || cv.height !== th) { cv.width = tw; cv.height = th; T.sil.width = tw; T.sil.height = th; }
    var c = cv.getContext("2d"), r = est.cantos * Math.min(tw, th), m = Math.min(tw, th);
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, tw, th); c.save(); rrect(c, 0, 0, tw, th, r); c.clip();
    var ix = 0, iy = 0, iw = tw, ih = th;
    if (est.borda === "polaroid") { c.fillStyle = "#F7F4EE"; c.fillRect(0, 0, tw, th); ix = m * 0.06; iy = m * 0.06; iw = tw - ix * 2; ih = th - iy - m * 0.24; }
    else if (est.borda === "branca") { c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, tw, th); ix = iy = m * 0.045; iw = tw - ix * 2; ih = th - iy * 2; }
    else if (est.borda === "cor") { c.fillStyle = est.cor; c.fillRect(0, 0, tw, th); ix = iy = m * 0.04; iw = tw - ix * 2; ih = th - iy * 2; }
    c.save(); if (ix) { rrect(c, ix, iy, iw, ih, Math.max(0, r - ix)); c.clip(); }
    if (fonte && fonte.el && fonte.w) { c.fillStyle = "#000"; c.fillRect(ix, iy, iw, ih); try { cover(c, fonte.el, fonte.w, fonte.h, ix, iy, iw, ih, 1); } catch (e) {} }
    else { var pa = PALETA[i % PALETA.length], g = c.createLinearGradient(ix, iy, ix + iw, iy + ih); g.addColorStop(0, pa[0]); g.addColorStop(1, pa[1]); c.fillStyle = g; c.fillRect(ix, iy, iw, ih);
      c.fillStyle = "rgba(255,255,255,.14)"; c.beginPath(); c.arc(ix + iw * 0.82, iy + ih * 0.12, iw * 0.45, 0, TAU); c.fill();
      if (est.numeros !== false) { var fs = Math.round(Math.min(iw, ih) * 0.34); c.font = "italic 900 " + fs + "px Montserrat, 'Arial Black', Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "rgba(0,0,0,.18)"; c.fillText(("0" + (i + 1)).slice(-2), ix + iw / 2 + fs * 0.05, iy + ih / 2 + fs * 0.06); c.fillStyle = "#fff"; c.fillText(("0" + (i + 1)).slice(-2), ix + iw / 2, iy + ih / 2); } }
    c.restore();
    if (est.borda === "neon") { c.save(); rrect(c, 0, 0, tw, th, r); c.lineWidth = m * 0.035; c.strokeStyle = est.cor; c.shadowColor = est.cor; c.shadowBlur = m * 0.08; c.stroke(); c.stroke(); c.restore(); }
    if (est.borda === "fina") { c.save(); rrect(c, 0, 0, tw, th, r); c.lineWidth = Math.max(2, m * 0.012); c.strokeStyle = "rgba(255,255,255,.7)"; c.stroke(); c.restore(); }
    c.restore();
    var s = T.sil.getContext("2d"); s.globalCompositeOperation = "source-over"; s.clearRect(0, 0, tw, th); s.drawImage(cv, 0, 0); s.globalCompositeOperation = "source-in"; s.fillStyle = "#000"; s.fillRect(0, 0, tw, th); s.globalCompositeOperation = "source-over";
    T.pap = null; T.k = k; return T;
  }
  function papel(T) { if (T.pap) return T.pap; var p = document.createElement("canvas"); p.width = T.cv.width; p.height = T.cv.height; var c = p.getContext("2d"); c.drawImage(T.sil, 0, 0); c.globalCompositeOperation = "source-in"; c.fillStyle = "#ECE7DD"; c.fillRect(0, 0, p.width, p.height); T.pap = p; return p; }

  /* triângulo com textura (afim) — o recorte é alargado 0,6 px para não aparecer costura entre células */
  function tri(c, img, x0, y0, x1, y1, x2, y2, u0, v0, u1, v1, u2, v2, g) {
    var den = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0); if (Math.abs(den) < 1e-9) return;
    var a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / den, b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / den,
        cc = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / den, d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / den, e = x0 - a * u0 - cc * v0, f = y0 - b * u0 - d * v0;
    /* alarga o triângulo em volta do centro o bastante para cada LADO andar ~0,8 px (senão a emenda da diagonal aparece como risco) */
    var mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, ar = Math.abs((x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)), lm = Math.max(Math.hypot(x1 - x0, y1 - y0), Math.hypot(x2 - x1, y2 - y1), Math.hypot(x0 - x2, y0 - y2)), dmin = ar / (3 * lm || 1),
        sc = 1 + (g == null ? 0.8 : g) / Math.max(0.3, dmin), ex = function (x, y) { return [mx + (x - mx) * sc, my + (y - my) * sc]; }, p0 = ex(x0, y0), p1 = ex(x1, y1), p2 = ex(x2, y2);
    c.save(); c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    var su = Math.max(0, Math.floor(Math.min(u0, u1, u2)) - 1), sv = Math.max(0, Math.floor(Math.min(v0, v1, v2)) - 1), eu = Math.min(img.width, Math.ceil(Math.max(u0, u1, u2)) + 1), evv = Math.min(img.height, Math.ceil(Math.max(v0, v1, v2)) + 1);
    if (eu > su && evv > sv) c.drawImage(img, su, sv, eu - su, evv - sv, su, sv, eu - su, evv - sv);
    c.restore();
  }

  function rot(p, rx, ry, rz) { var x = p[0], y = p[1], z = p[2], c, s, t;
    if (rz) { c = Math.cos(rz); s = Math.sin(rz); t = x * c - y * s; y = x * s + y * c; x = t; }
    if (rx) { c = Math.cos(rx); s = Math.sin(rx); t = y * c - z * s; z = y * s + z * c; y = t; }
    if (ry) { c = Math.cos(ry); s = Math.sin(ry); t = x * c + z * s; z = -x * s + z * c; x = t; }
    return [x, y, z]; }

  function fundo(c, P, W, H, fontes) {
    var f = P.fundo || (modelo(P).fundo) || "escuro", c1 = P.fundoCor || "#0B0E14", c2 = P.fundoCor2 || "#3B1D6B", g;
    if (f === "verde") { c.fillStyle = "#00B140"; c.fillRect(0, 0, W, H); return; } if (f === "azul") { c.fillStyle = "#0047BB"; c.fillRect(0, 0, W, H); return; } if (f === "magenta") { c.fillStyle = "#FF00FF"; c.fillRect(0, 0, W, H); return; }
    if (f === "cor") { c.fillStyle = c1; c.fillRect(0, 0, W, H); return; }
    if (f === "degrade") { g = c.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, c1); g.addColorStop(1, c2); c.fillStyle = g; c.fillRect(0, 0, W, H); return; }
    if (f === "claro") { g = c.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, Math.max(W, H) * 0.75); g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#cfd3da"); c.fillStyle = g; c.fillRect(0, 0, W, H); return; }
    if (f === "papel") { c.fillStyle = "#EFE8DA"; c.fillRect(0, 0, W, H); g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, "rgba(255,255,255,.4)"); g.addColorStop(1, "rgba(120,96,60,.25)"); c.fillStyle = g; c.fillRect(0, 0, W, H); return; }
    if (f === "madeira") { c.fillStyle = "#6B4A2E"; c.fillRect(0, 0, W, H); c.globalAlpha = 0.18; for (var i = 0; i < 26; i++) { c.fillStyle = i % 2 ? "#3d2716" : "#8a6440"; c.fillRect(0, (i / 26) * H + Math.sin(i * 7) * 6, W, H / 60 + (i % 3) * 2); } c.globalAlpha = 1;
      g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, "rgba(255,220,170,.18)"); g.addColorStop(1, "rgba(0,0,0,.5)"); c.fillStyle = g; c.fillRect(0, 0, W, H); return; }
    if (f === "foto") { var fo = fontes(0); c.fillStyle = "#000"; c.fillRect(0, 0, W, H); if (fo && fo.el && fo.w) { var t = TMP(Math.max(8, Math.round(W / 24)), Math.max(8, Math.round(H / 24))); var tc = t.getContext("2d"); try { cover(tc, fo.el, fo.w, fo.h, 0, 0, t.width, t.height); } catch (e) {} c.save(); c.imageSmoothingEnabled = true; c.globalAlpha = 0.85; c.drawImage(t, 0, 0, W, H); c.restore(); c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(0, 0, W, H); } return; }
    /* escuro (estúdio) */
    var e1 = f === "estudio" ? "#2a2d36" : "#1a1d27", e2 = "#05060a"; g = c.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.5, Math.max(W, H) * 0.72); g.addColorStop(0, e1); g.addColorStop(1, e2); c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  var _lc = null; function camada(w, h) { if (!_lc) _lc = document.createElement("canvas"); if (_lc.width !== w || _lc.height !== h) { _lc.width = w; _lc.height = h; } return _lc; }
  var _tmp = null; function TMP(w, h) { if (!_tmp) _tmp = document.createElement("canvas"); if (_tmp.width !== w || _tmp.height !== h) { _tmp.width = w; _tmp.height = h; } return _tmp; }

  function modelo(P) { return POR[P.modelo] || M[0]; }
  function quantos(P, nMidias) { var md = modelo(P), nmin = md.nMin || 3, nmax = md.nMax || 24; return nMidias ? cl(nMidias, md.tela ? 1 : nmin, nmax) : md.nPad; }
  function duracao(P, nMidias) { var md = modelo(P), n = quantos(P, nMidias), tp = +P.tp || md.tp; return +(md.dur ? md.dur(n, tp) : Math.max(md.tela ? 2 : 4, n * tp + (md.tela ? 0 : 0.8))).toFixed(2); }
  function ratioCartao(P, W, H) { var md = modelo(P); if (md.tela) return W / H; if (md.quadrado) return 1; var r = { "3:4": 0.75, "4:5": 0.8, "1:1": 1, "9:16": 0.5625, "16:9": 1.7778, "2:3": 0.6667 }[P.cartao || "auto"]; if (r) return r; return md.borda === "polaroid" ? 0.82 : 0.75; }

  /* desenha um quadro.  fontes(i) → {el,w,h} | null (vazio = cartão numerado colorido).  opc: {leve, textura (px), chaveVideo(i)} */
  function desenhar(c, P, t, W, H, fontes, opc) {
    opc = opc || {}; var CX = opc.cache || CACHE0, md = modelo(P), nm = opc.nMidias || 0, n = quantos(P, nm), D = duracao(P, nm), u = Math.min(W, H) / 2;
    t = cl(t, 0, D);
    c.save(); fundo(c, P, W, H, fontes);
    var r = ratioCartao(P, W, H), base = 1.25, cw = r >= 1 ? base * 1.15 : base * r, ch = r >= 1 ? base * 1.15 / r : base, o = { cw: cw, ch: ch, tw: W / u, th: H / u };
    var q = md.quadro(t, n, D, A, o), cam = q.cam || {}, dist = cam.dist || 3, cs = cam.rx || 0, cy = cam.ry || 0, cz = cam.rz || 0, tx = cam.x || 0, ty = cam.y || 0, tz = cam.z || 0;
    var est = { borda: P.borda || md.borda || "nenhuma", cor: P.bordaCor || "#B6FF3B", cantos: md.tela ? 0 : (P.cantos == null ? 0.06 : +P.cantos), numeros: P.numeros !== false };
    est.chave = [est.borda, est.cor, est.cantos, est.numeros].join(",");
    var verso = P.verso || md.verso || "espelho", sombra = P.sombra !== false;
    var long = md.tela ? Math.min(1920, Math.round(Math.max(W, H) * 0.92)) : Math.min(opc.textura || 900, Math.max(160, Math.round(Math.min(W, H) * 0.62)));
    var tw = r >= 1 ? long : Math.round(long * r), th = r >= 1 ? Math.round(long / r) : long;
    var zoom = cam.zoom || 1; function proj(p) { var X = p[0] + tx, Y = p[1] + ty, Z = p[2] + tz + dist; if (Z < 0.08) return null; var s = u * zoom * dist / Z; return [W / 2 + X * s, H / 2 - Y * s, Z]; }
    function cameraDe(p) { return rot(p, 0, 0, 0); }
    var lista = [];
    (q.pecas || []).forEach(function (pc, ordem) {
      if (pc.op === 0 || (pc.op != null && pc.op < 0.003)) return;
      var w = pc.w || cw, h = pc.h || ch, cu = pc.curva || 0, cv = pc.curvaY || 0, cols = cu ? (opc.leve ? 6 : 10) : 2, rows = cv ? (opc.leve ? 6 : 10) : 2;
      var pts = [], ok = true, zs = 0;
      for (var j = 0; j <= rows; j++) for (var i = 0; i <= cols; i++) {
        var lx = (i / cols - 0.5) * w, ly = (0.5 - j / rows) * h, lz = 0;
        if (cu) { var a = lx * cu; lx = Math.sin(a) / cu; lz = (1 - Math.cos(a)) / cu; }
        if (cv) { var b = ly * cv; ly = Math.sin(b) / cv; lz += (1 - Math.cos(b)) / cv; }
        var w1 = rot([lx, ly, lz], pc.rx || 0, pc.ry || 0, pc.rz || 0); w1 = [w1[0] + (pc.x || 0), w1[1] + (pc.y || 0), w1[2] + (pc.z || 0)];
        var cmr = rot(w1, 0, cy, 0); cmr = rot(cmr, cs, 0, cz); var pr = proj(cmr); if (!pr) { ok = false; break; } pts.push([pr[0], pr[1], pr[2], cmr]); zs += cmr[2];
      }
      if (!ok) return;
      lista.push({ pc: pc, pts: pts, cols: cols, rows: rows, z: zs / pts.length, ordem: ordem });
    });
    lista.sort(function (a, b) { return b.z - a.z || a.ordem - b.ordem; });
    /* cada peça é montada numa CAMADA (lc) em opacidade cheia, escurecida só onde ela existe (source-atop) e colada na tela com a opacidade dela:
       assim não há risco nas emendas das células, nem dobra de sombra, nem emenda aparecendo quando a peça está meio transparente */
    var LC = camada(W, H), lc = LC.getContext("2d");
    for (var L = 0; L < lista.length; L++) {
      var it = lista[L], pc = it.pc, cols = it.cols, rows = it.rows, pts = it.pts, op = pc.op == null ? 1 : pc.op;
      var Tf = null, Tb = null, uvf = pc.uv || [0, 0, 1, 1], uvb = pc.trasUv || (pc.trasEixo === "x" ? [uvf[0], uvf[3], uvf[2], uvf[1]] : [uvf[2], uvf[1], uvf[0], uvf[3]]);
      if (pc.m >= 0) { var mi = nm ? pc.m % nm : pc.m; Tf = textura(mi, tw, th, est, fontes(mi), opc.chave ? opc.chave(mi) : "", CX); }
      if (pc.tras != null && pc.tras >= 0) { var mb = nm ? pc.tras % nm : pc.tras; Tb = textura(mb, tw, th, est, fontes(mb), opc.chave ? opc.chave(mb) : "", CX); }
      var z = pc.uvZoom || 1;
      if (z !== 1) { var cxu = (uvf[0] + uvf[2]) / 2, cyv = (uvf[1] + uvf[3]) / 2, hu = (uvf[2] - uvf[0]) / 2 / z, hv = (uvf[3] - uvf[1]) / 2 / z; uvf = [cxu - hu, cyv - hv, cxu + hu, cyv + hv]; }
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
      x0 = Math.max(0, Math.floor(x0) - 3); y0 = Math.max(0, Math.floor(y0) - 3); x1 = Math.min(W, Math.ceil(x1) + 3); y1 = Math.min(H, Math.ceil(y1) + 3);
      if (x1 <= x0 || y1 <= y0) continue;
      /* sombra do cartão (fica por baixo, direto na tela) */
      if (sombra && (pc.sombra || (!md.tela && pc.m >= 0 && pc.sombra !== 0)) && !opc.semSombra) {
        var k = pc.sombra == null ? 1 : pc.sombra, cnt = [pts[0], pts[cols], pts[pts.length - 1], pts[pts.length - 1 - cols]], ccx = (cnt[0][0] + cnt[2][0]) / 2, ccy = (cnt[0][1] + cnt[2][1]) / 2, hh = Math.abs(cnt[2][1] - cnt[0][1]);
        c.save(); c.globalAlpha = op * 0.55 * k; c.fillStyle = "#000"; c.shadowColor = "rgba(0,0,0,.85)"; c.shadowBlur = Math.max(4, hh * 0.08); c.shadowOffsetY = hh * 0.04;
        c.beginPath(); cnt.forEach(function (p, ii) { var x = ccx + (p[0] - ccx) * 0.94, y = ccy + (p[1] - ccy) * 0.94; if (ii) c.lineTo(x, y); else c.moveTo(x, y); }); c.closePath(); c.fill(); c.restore();
      }
      lc.clearRect(x0, y0, x1 - x0, y1 - y0);
      var sombras = [];
      for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
        var a = pts[j * (cols + 1) + i], b = pts[j * (cols + 1) + i + 1], d = pts[(j + 1) * (cols + 1) + i], e = pts[(j + 1) * (cols + 1) + i + 1];
        var area = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]), frente = area > 0;
        /* luz: quanto a célula está de frente para a câmera (+ névoa da distância) */
        var ux = b[3][0] - a[3][0], uy = b[3][1] - a[3][1], uz = b[3][2] - a[3][2], vx = d[3][0] - a[3][0], vy = d[3][1] - a[3][1], vz = d[3][2] - a[3][2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, mzp = (a[3][2] + e[3][2]) / 2 + dist;
        var fr = Math.abs(nz / nl), escuro = cl((1 - fr) * 0.55 + cl((mzp - dist - 1.2) / 8, 0, 0.45) + (pc.escuro || 0), 0, 0.92);
        var img = null, uv = uvf;
        if (frente) { if (Tf) img = Tf.cv; }
        else { escuro = Math.min(0.92, escuro + (Tb ? 0.05 : 0.22)); uv = uvb; if (Tb) img = Tb.cv; else if (Tf && verso === "papel" && !pc.cor) { img = papel(Tf); uv = uvf; } else if (Tf && verso === "espelho") { img = Tf.cv; uv = uvf; } }
        if (!img) {
          lc.fillStyle = pc.cor || (Tf ? "#1a1d26" : "#333"); lc.beginPath(); lc.moveTo(a[0], a[1]); lc.lineTo(b[0], b[1]); lc.lineTo(e[0], e[1]); lc.lineTo(d[0], d[1]); lc.closePath(); lc.fill();
        } else {
          var Wt = img.width, Ht = img.height, U0 = (uv[0] + (uv[2] - uv[0]) * i / cols) * Wt, U1 = (uv[0] + (uv[2] - uv[0]) * (i + 1) / cols) * Wt, V0 = (uv[1] + (uv[3] - uv[1]) * j / rows) * Ht, V1 = (uv[1] + (uv[3] - uv[1]) * (j + 1) / rows) * Ht;
          tri(lc, img, a[0], a[1], b[0], b[1], e[0], e[1], U0, V0, U1, V0, U1, V1);
          tri(lc, img, a[0], a[1], e[0], e[1], d[0], d[1], U0, V0, U1, V1, U0, V1);
        }
        if (escuro > 0.02 && !(pc.cor && /rgba/.test(pc.cor))) sombras.push([a, b, e, d, escuro]);
      }
      if (sombras.length) { lc.save(); lc.globalCompositeOperation = "source-atop"; sombras.forEach(function (q) { lc.fillStyle = "rgba(0,0,0," + q[4].toFixed(3) + ")"; lc.beginPath(); lc.moveTo(q[0][0], q[0][1]); lc.lineTo(q[1][0], q[1][1]); lc.lineTo(q[2][0], q[2][1]); lc.lineTo(q[3][0], q[3][1]); lc.closePath(); lc.fill(); }); lc.restore(); }
      c.globalAlpha = op; c.drawImage(LC, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); c.globalAlpha = 1;
    }
    c.globalAlpha = 1;
    titulo(c, P, t, D, W, H);
    c.restore();
  }

  function titulo(c, P, t, D, W, H) {
    var tx = (P.titulo || "").trim(), sb = (P.sub || "").trim(), q = P.tituloQuando || "ambos"; if ((!tx && !sb) || q === "nunca") return;
    var a = 0; if (q !== "fim") a = Math.max(a, A.seg(t, 0.1, 0.6) * (1 - A.seg(t, 2.4, 3))); if (q !== "inicio") a = Math.max(a, A.seg(t, D - 2.4, D - 1.9)); if (q === "sempre") a = 1; if (a <= 0) return;
    var m = Math.min(W, H), y = H * (P.tituloPos === "baixo" ? 0.84 : P.tituloPos === "meio" ? 0.5 : 0.14);
    c.save(); c.globalAlpha = a; c.textAlign = "center"; c.textBaseline = "middle"; c.shadowColor = "rgba(0,0,0,.65)"; c.shadowBlur = m * 0.03;
    var fs = m * 0.085, maxw = W * 0.88; c.font = "900 " + fs + "px Montserrat, 'Arial Black', Inter, sans-serif"; while (c.measureText(tx).width > maxw && fs > 10) { fs *= 0.92; c.font = "900 " + fs + "px Montserrat, 'Arial Black', Inter, sans-serif"; }
    c.fillStyle = P.tituloCor || "#FFFFFF"; c.fillText(tx, W / 2, y - (sb ? fs * 0.35 : 0) + (1 - a) * m * 0.03);
    if (sb) { var f2 = m * 0.038; c.font = "700 " + f2 + "px Inter, Montserrat, sans-serif"; c.fillStyle = "rgba(255,255,255,.88)"; c.fillText(sb.toUpperCase(), W / 2, y + fs * 0.55 + (1 - a) * m * 0.03); }
    c.restore();
  }
  /* em que tempo cada take toca: modelos em sequência começam o take quando ele entra; os outros tocam juntos, defasados */
  function tempoMidia(P, i, t, dur, nMidias) { var md = modelo(P); if (!dur) return 0; var n = quantos(P, nMidias), D = duracao(P, nMidias); var tl = md.seq ? t - i * D / n + 0.4 : t + i * 0.73; return ((tl % dur) + dur) % dur; }
  function limpar(cx) { var C = cx || CACHE0; Object.keys(C).forEach(function (k) { delete C[k]; }); }

  window.BWAlbum = { MODELOS: M, POR: POR, CATS: CATS, desenhar: desenhar, duracao: duracao, quantos: quantos, modelo: modelo, tempoMidia: tempoMidia, limpar: limpar, A: A };
})();
