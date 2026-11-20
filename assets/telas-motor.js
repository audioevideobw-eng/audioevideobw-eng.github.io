/* TELAS EM MOVIMENTO — motor (20/11/2026, Claude).
   Uma sequência de CENAS. Cada cena tem uma DIVISÃO de tela (cheia, dupla, tripla, 4 telas, diagonal, janela) com fotos/takes dentro, um
   movimento de câmera (zoom, afastar, panorâmica) e a TRANSIÇÃO que a traz para a tela: as formas (tiras, cacos, mosaico, painéis…) entram
   carregando a filmagem nova por dentro — como os pacotes de transição em chroma, só que já com a sua mídia.
   Tudo em canvas 2D: cada quadro depende SÓ do tempo t (e do quadro de vídeo daquele tempo), então a prévia e o vídeo exportado saem iguais.
   Este arquivo só desenha: não grava nem envia nada. */
(function () {
  "use strict";
  var cl = function (x, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, x)); };
  var prog = function (t, a, b) { return b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)); };
  var E = {
    sai: function (x) { return 1 - Math.pow(1 - x, 3); },
    suave: function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    entra: function (x) { return x * x * x; },
    pulo: function (x) { var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
    expo: function (x) { return x >= 1 ? 1 : 1 - Math.pow(2, -10 * x); }
  };
  function sorte(semente) { var a = semente >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(s) { var h = 2166136261; s = String(s || ""); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function poli(ctx, pts) { ctx.beginPath(); pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); }

  var LAYOUTS = {
    cheia:    { nome: "Tela cheia", n: 1 },
    dupla:    { nome: "Dividida em 2", n: 2 },
    tripla:   { nome: "Dividida em 3", n: 3 },
    quatro:   { nome: "4 telas", n: 4 },
    diagonal: { nome: "Diagonal", n: 2 },
    janela:   { nome: "Janela", n: 2 }
  };
  var MOVS = { zoom: "Aproximar", afasta: "Afastar", esq: "Para a esquerda", dir: "Para a direita", sobe: "Subir", nenhum: "Parado" };

  /* ---------- mídia dentro de um retângulo (cobre, com movimento de câmera) ---------- */
  function cobrir(ctx, m, r, mov, q) {
    if (!m || !m.el || !(m.w > 0)) {
      ctx.fillStyle = "#1c2230"; ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "#56607a"; ctx.font = "800 " + Math.max(18, Math.round(Math.min(r.w, r.h) * 0.07)) + "px Inter,Arial,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(m && m.rotulo ? m.rotulo : "FOTO OU VÍDEO", r.x + r.w / 2, r.y + r.h / 2); return;
    }
    var e = E.suave(q), z = 1, px = 0, py = 0;
    if (mov === "zoom") z = 1 + 0.16 * e; else if (mov === "afasta") z = 1.16 - 0.16 * e;
    else if (mov === "esq") { z = 1.14; px = 1 - 2 * e; } else if (mov === "dir") { z = 1.14; px = -1 + 2 * e; } else if (mov === "sobe") { z = 1.14; py = 1 - 2 * e; }
    var k = Math.max(r.w / m.w, r.h / m.h) * z, dw = m.w * k, dh = m.h * k;
    var x = r.x + (r.w - dw) / 2 + px * (dw - r.w) / 2, y = r.y + (r.h - dh) / 2 + py * (dh - r.h) / 2;
    try { ctx.drawImage(m.el, x, y, dw, dh); } catch (err) { ctx.fillStyle = "#1c2230"; ctx.fillRect(r.x, r.y, r.w, r.h); }
  }

  /* ---------- painéis de cada divisão ---------- */
  function paineis(lay, W, H, gap) {
    var v = H >= W, g = gap / 2, R = function (x, y, w, h) { return { x: x, y: y, w: w, h: h, pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] }; };
    if (lay === "dupla") return v ? [R(0, 0, W, H / 2 - g), R(0, H / 2 + g, W, H / 2 - g)] : [R(0, 0, W / 2 - g, H), R(W / 2 + g, 0, W / 2 - g, H)];
    if (lay === "tripla") { var t = v ? H / 3 : W / 3; return [0, 1, 2].map(function (i) { return v ? R(0, i * t + (i ? g : 0), W, t - (i === 1 ? gap : g)) : R(i * t + (i ? g : 0), 0, t - (i === 1 ? gap : g), H); }); }
    if (lay === "quatro") return [R(0, 0, W / 2 - g, H / 2 - g), R(W / 2 + g, 0, W / 2 - g, H / 2 - g), R(0, H / 2 + g, W / 2 - g, H / 2 - g), R(W / 2 + g, H / 2 + g, W / 2 - g, H / 2 - g)];
    if (lay === "diagonal") { var a = H * 0.62, b = H * 0.38;
      var p1 = { x: 0, y: 0, w: W, h: a, pts: [[0, 0], [W, 0], [W, b - g], [0, a - g]] }, p2 = { x: 0, y: b, w: W, h: H - b, pts: [[0, a + g], [W, b + g], [W, H], [0, H]] }; return [p1, p2]; }
    if (lay === "janela") { var m = Math.min(W, H) * 0.12; return [R(0, 0, W, H), R(m, H * 0.28, W - 2 * m, (W - 2 * m) * (v ? 0.75 : 0.56))]; }
    return [R(0, 0, W, H)];
  }
  // a cena inteira (fundo + painéis com entrada escalonada)
  function cena(ctx, P, c, lt, W, H, fonte) {
    var dur = Math.max(0.2, +c.dur || 2), td = +c.transDur || 0.6, q = cl(lt / (dur + td)), ps = paineis(c.layout || "cheia", W, H, +(P.gap === undefined ? 10 : P.gap) * W / 1080);
    ctx.fillStyle = P.fundo || "#000"; ctx.fillRect(0, 0, W, H);
    ps.forEach(function (pn, i) {
      var m = fonte(c.midias && c.midias[i], c, i), desliza = ps.length > 1 && (!c.trans || c.trans === "corte" || c.trans === "flash"), e = desliza ? E.sai(prog(lt, i * 0.12, i * 0.12 + 0.55)) : 1; // com transição, a transição é a entrada
      if (e <= 0) return;
      ctx.save();
      if (ps.length > 1 && e < 1) { // painel entra deslizando do lado de fora
        var cx = pn.x + pn.w / 2 - W / 2, cy = pn.y + pn.h / 2 - H / 2, d = Math.hypot(cx, cy) || 1, sx = cx / d, sy = cy / d;
        if (c.layout === "janela" && i === 1) { ctx.translate(W / 2, pn.y + pn.h / 2); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.translate(-W / 2, -(pn.y + pn.h / 2)); ctx.globalAlpha = e; }
        else if (c.layout === "janela") ctx.globalAlpha = e;
        else ctx.translate(sx * (1 - e) * W * 0.7, sy * (1 - e) * H * 0.5);
      }
      poli(ctx, pn.pts); ctx.clip();
      if (c.layout === "janela" && i === 0) { cobrir(ctx, m, pn, c.mov, q); ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, 0, W, H); }
      else cobrir(ctx, m, pn, i % 2 && c.mov === "esq" ? "dir" : c.mov, q);
      ctx.restore();
      if (c.layout === "janela" && i === 1 && corLinha(P, 1)) { ctx.save(); ctx.globalAlpha = e; ctx.strokeStyle = corLinha(P, 1); ctx.lineWidth = Math.max(3, W * 0.006); poli(ctx, pn.pts); ctx.stroke(); ctx.restore(); }
    });
  }

  /* ---------- TRANSIÇÕES: p de 0 a 1; A = cena que sai, B = cena que entra ---------- */
  // "carregar": a forma leva a imagem nova junto (translada/gira com ela) — é o que faz parecer que a filmagem está DENTRO da peça
  // 20/11: cor e transparência das linhas das transições (P.contorno = "#rrggbb" ou "" sem linha; P.contornoOp = 0–100)
  function corLinha(P, k) { var c = P.contorno; if (!c) return null; var op = (P.contornoOp == null ? 100 : +P.contornoOp) / 100 * (k == null ? 1 : k); if (op <= 0.01) return null;
    var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(c); if (!m) return c; return "rgba(" + parseInt(m[1], 16) + "," + parseInt(m[2], 16) + "," + parseInt(m[3], 16) + "," + op.toFixed(3) + ")"; }
  function peca(ctx, pts, tf, B, borda, W) {
    ctx.save(); tf(ctx); poli(ctx, pts); ctx.save(); ctx.clip(); B(); ctx.restore();
    if (borda) { ctx.globalAlpha = 0.75; ctx.strokeStyle = borda; ctx.lineWidth = Math.max(1, W * 0.0022); ctx.stroke(); }
    ctx.restore();
  }
  function emVolta(cx, cy, dx, dy, r, s) { return function (ctx) { ctx.translate(cx + dx, cy + dy); ctx.rotate(r); ctx.scale(s, s); ctx.translate(-cx, -cy); }; }
  var TRANS = {
    tiras: { nome: "Tiras diagonais", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var D = Math.hypot(W, H), n = 7, ws = D / n, ang = -Math.PI / 4;
      for (var k = 0; k < n; k++) { var e = E.sai(prog(p, k * 0.06, k * 0.06 + 0.62)), dy = (1 - e) * D * (k % 2 ? 1 : -1);
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(0, dy); ctx.beginPath(); ctx.rect(-D / 2 + k * ws - 1, -D / 2, ws + 2, D); ctx.clip();
        ctx.translate(0, 0); ctx.rotate(-ang); ctx.translate(-W / 2, -H / 2); B(); ctx.restore();
        if (borda && e < 1) { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(ang); ctx.translate(0, dy); ctx.strokeStyle = borda; ctx.lineWidth = Math.max(2, W * 0.004); ctx.strokeRect(-D / 2 + k * ws, -D / 2, ws, D); ctx.restore(); } } } },
    persiana: { nome: "Persiana", f: function (ctx, p, W, H, A, B) {
      A(); var n = 6, w = W / n; ctx.save(); ctx.beginPath();
      for (var k = 0; k < n; k++) { var e = E.sai(prog(p, k * 0.05, k * 0.05 + 0.7)), h = e * H; ctx.rect(k * w - 0.5, k % 2 ? H - h : 0, w + 1, h); }
      ctx.clip(); B(); ctx.restore(); } },
    mosaico: { nome: "Mosaico", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var cols = 4, s = W / cols, rows = Math.ceil(H / s), maxd = Math.hypot(cols, rows) / 2;
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var d = Math.hypot(c + 0.5 - cols / 2, r + 0.5 - rows / 2) / maxd, ini = d * 0.35, e = prog(p, ini, ini + 0.5); if (e <= 0) continue;
        var x = c * s, y = r * s, cx = x + s / 2, cy = y + s / 2, ee = E.pulo(e);
        peca(ctx, [[x - 0.5, y - 0.5], [x + s + 0.5, y - 0.5], [x + s + 0.5, y + s + 0.5], [x - 0.5, y + s + 0.5]], emVolta(cx, cy, 0, 0, (1 - E.sai(e)) * Math.PI / 2, Math.max(0.01, ee)), B, e < 1 ? borda : null, W);
      } } },
    catavento: { nome: "Cata-vento", f: function (ctx, p, W, H, A, B) {
      A(); var n = 8, R = Math.hypot(W, H), e = E.sai(p), giro = (1 - e) * Math.PI * 0.8, larg = (Math.PI * 2 / n) * e;
      ctx.save(); ctx.beginPath();
      for (var k = 0; k < n; k++) { var a0 = giro + k * Math.PI * 2 / n; ctx.moveTo(W / 2, H / 2); ctx.lineTo(W / 2 + Math.cos(a0) * R, H / 2 + Math.sin(a0) * R); ctx.lineTo(W / 2 + Math.cos(a0 + larg + 0.02) * R, H / 2 + Math.sin(a0 + larg + 0.02) * R); ctx.closePath(); }
      ctx.clip(); B(); ctx.restore(); } },
    cacos: { nome: "Cacos (explosão)", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var cols = 4, rows = Math.round(cols * H / W), cw = W / cols, ch = H / rows, V = [];
      for (var r = 0; r <= rows; r++) { V.push([]); for (var c = 0; c <= cols; c++) { var bx = c * cw, by = r * ch; V[r].push([bx + (c > 0 && c < cols ? (rnd() - 0.5) * cw * 0.6 : 0), by + (r > 0 && r < rows ? (rnd() - 0.5) * ch * 0.6 : 0)]); } }
      for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
        var a = V[r][c], b = V[r][c + 1], d = V[r + 1][c + 1], g = V[r + 1][c], tris = rnd() < 0.5 ? [[a, b, d], [a, d, g]] : [[a, b, g], [b, d, g]];
        tris.forEach(function (tr) {
          var cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3, cy = (tr[0][1] + tr[1][1] + tr[2][1]) / 3, vx = cx - W / 2, vy = cy - H / 2, dd = Math.hypot(vx, vy) || 1;
          var ini = rnd() * 0.35, e = E.sai(prog(p, ini, ini + 0.55)), dist = (1 - e) * (700 + rnd() * 700) * W / 1080, rot = (1 - e) * (rnd() - 0.5) * 5;
          if (e <= 0) return;
          peca(ctx, [[tr[0][0] - 0.6, tr[0][1] - 0.6], [tr[1][0] + 0.6, tr[1][1] - 0.6], [tr[2][0], tr[2][1] + 0.6]], emVolta(cx, cy, vx / dd * dist, vy / dd * dist, rot, 0.4 + 0.6 * e), B, e < 0.85 ? borda : null, W);
        });
      } } },
    paineis: { nome: "Painéis 3D", f: function (ctx, p, W, H, A, B) {
      A(); var n = 5, w = W / n;
      for (var k = 0; k < n; k++) { var e = E.sai(prog(p, k * 0.08, k * 0.08 + 0.6)); if (e <= 0) continue; var cx = k * w + w / 2;
        ctx.save(); ctx.translate(cx, H / 2); ctx.scale(Math.max(0.01, e), 1 - (1 - e) * 0.12); ctx.translate(-cx, -H / 2);
        ctx.beginPath(); ctx.rect(k * w - 0.5, 0, w + 1, H); ctx.clip(); B(); ctx.fillStyle = "rgba(0,0,0," + ((1 - e) * 0.6).toFixed(3) + ")"; ctx.fillRect(k * w, 0, w, H); ctx.restore(); } } },
    xis: { nome: "X", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var D = Math.hypot(W, H), e = E.entra(prog(p, 0, 0.85)) , larg = 40 + e * D;
      ctx.save(); ctx.beginPath();
      [Math.PI / 4, -Math.PI / 4].forEach(function (a) { var cx = W / 2, cy = H / 2, c = Math.cos(a), s = Math.sin(a), L = D;
        var pts = [[-L, -larg / 2], [L, -larg / 2], [L, larg / 2], [-L, larg / 2]].map(function (q) { return [cx + q[0] * c - q[1] * s, cy + q[0] * s + q[1] * c]; });
        pts.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); });
      ctx.clip(); B(); ctx.restore(); } },
    janela: { nome: "Janela que abre", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var e = E.sai(p), s = 0.05 + e * 1.1, ang = (1 - e) * -0.45, w = W * s, h = H * s;
      var pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(function (q) { return [W / 2 + q[0] * Math.cos(ang) - q[1] * Math.sin(ang), H / 2 + q[0] * Math.sin(ang) + q[1] * Math.cos(ang)]; });
      ctx.save(); poli(ctx, pts); ctx.clip(); B(); ctx.restore();
      if (borda && e < 1) { ctx.save(); ctx.strokeStyle = borda; ctx.lineWidth = Math.max(3, W * 0.008); poli(ctx, pts); ctx.stroke(); ctx.restore(); } } },
    tunel: { nome: "Túnel de quadros", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var D = Math.hypot(W, H), e = E.entra(p), s = e * D * 1.05, ang = (1 - e) * Math.PI * 0.5;
      function q(sz, a) { return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(function (v) { var x = v[0] * sz / 2, y = v[1] * sz / 2; return [W / 2 + x * Math.cos(a) - y * Math.sin(a), H / 2 + x * Math.sin(a) + y * Math.cos(a)]; }); }
      ctx.save(); poli(ctx, q(s, ang)); ctx.clip(); B(); ctx.restore();
      if (borda) { ctx.save(); ctx.strokeStyle = borda; ctx.lineWidth = Math.max(2, W * 0.005); for (var k = 1; k <= 3; k++) { var sk = s * (1 + k * 0.22); if (sk > D * 1.4) continue; ctx.globalAlpha = (1 - e) * (1 - k * 0.22); poli(ctx, q(sk, ang + k * 0.25)); ctx.stroke(); } ctx.restore(); } } },
    losango: { nome: "Losango", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var e = E.entra(p), r = e * (W + H) * 0.62;
      var pts = [[W / 2, H / 2 - r], [W / 2 + r, H / 2], [W / 2, H / 2 + r], [W / 2 - r, H / 2]];
      ctx.save(); poli(ctx, pts); ctx.clip(); B(); ctx.restore();
      if (borda && e < 1) { ctx.save(); ctx.strokeStyle = borda; ctx.lineWidth = Math.max(2, W * 0.006); poli(ctx, pts); ctx.stroke(); ctx.restore(); } } },
    chicote: { nome: "Chicote (borrão)", f: function (ctx, p, W, H, A, B) {
      var e = E.suave(p), v = Math.sin(p * Math.PI), n = 6;
      for (var i = 0; i < n; i++) { var o = (i - (n - 1) / 2) / n * v * W * 0.18; ctx.save(); ctx.globalAlpha = i ? 0.28 : 1; ctx.translate(-e * W + o, 0); A(); ctx.restore(); }
      for (i = 0; i < n; i++) { o = (i - (n - 1) / 2) / n * v * W * 0.18; ctx.save(); ctx.globalAlpha = i ? 0.28 : 1; ctx.translate(W - e * W + o, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip(); B(); ctx.restore(); } } },
    zoom: { nome: "Zoom através", f: function (ctx, p, W, H, A, B) {
      var e = E.entra(p), z = 1 + e * 2.2; B(); ctx.save(); ctx.globalAlpha = 1 - E.sai(p); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); A(); ctx.restore(); } },
    circulo: { nome: "Círculo", f: function (ctx, p, W, H, A, B, rnd, borda) {
      A(); var r = E.sai(p) * Math.hypot(W, H) / 2 + 1; ctx.save(); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.clip(); B(); ctx.restore();
      if (borda && p < 1) { ctx.save(); ctx.strokeStyle = borda; ctx.lineWidth = Math.max(3, W * 0.008); ctx.beginPath(); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } } },
    faixas: { nome: "Faixas cruzadas", f: function (ctx, p, W, H, A, B) {
      A(); var n = 8, h = H / n;
      for (var k = 0; k < n; k++) { var e = E.sai(prog(p, k * 0.04, k * 0.04 + 0.6)), dx = (1 - e) * W * (k % 2 ? 1 : -1);
        ctx.save(); ctx.translate(dx, 0); ctx.beginPath(); ctx.rect(0, k * h - 0.5, W, h + 1); ctx.clip(); B(); ctx.restore(); } } },
    flash: { nome: "Flash", f: function (ctx, p, W, H, A, B) {
      if (p < 0.5) A(); else B(); ctx.fillStyle = "rgba(255,255,255," + Math.max(0, 1 - Math.abs(p - 0.5) * 3.2).toFixed(3) + ")"; ctx.fillRect(0, 0, W, H); } },
    corte: { nome: "Corte seco", f: function (ctx, p, W, H, A, B) { B(); } }
  };
  var PACOTES = {
    geometrico: { nome: "Geométrico (como os pacotes verdes)", lista: ["tiras", "cacos", "mosaico", "catavento", "paineis", "xis", "losango", "tunel", "janela"] },
    imovel: { nome: "Imóvel / lifestyle (cortes no ritmo)", lista: ["chicote", "corte", "zoom", "corte", "chicote", "persiana", "corte", "circulo"] },
    energia: { nome: "Energia (rápido)", lista: ["flash", "faixas", "cacos", "chicote", "xis", "zoom", "tiras"] },
    suave: { nome: "Suave", lista: ["circulo", "persiana", "janela", "zoom", "paineis"] }
  };

  /* ---------- tempo ---------- */
  function inicios(P) { var t = 0; return P.cenas.map(function (c) { var a = t; t += Math.max(0.2, +c.dur || 2); return a; }); }
  function duracao(P) { return P.cenas.reduce(function (s, c) { return s + Math.max(0.2, +c.dur || 2); }, 0); }
  // quais cenas aparecem no tempo t: [{i, lt, trans: p | null}]
  function ativas(P, t) {
    var ini = inicios(P), out = [];
    for (var i = 0; i < P.cenas.length; i++) {
      var c = P.cenas[i], a = ini[i], b = a + Math.max(0.2, +c.dur || 2), td = i ? Math.min(+c.transDur || 0.6, Math.max(0.2, +c.dur || 2) * 0.9) : 0;
      if (t >= a && (t < b || i === P.cenas.length - 1)) { out.push({ i: i, lt: t - a, p: td && t - a < td && c.trans !== "corte" ? (t - a) / td : null });
        if (out[0].p !== null && i > 0) out.unshift({ i: i - 1, lt: t - ini[i - 1], anterior: true }); break; }
    }
    return out;
  }
  // vídeos que precisam estar no quadro certo no tempo t: [{id, tempo}]
  function videosEm(P, t, info) {
    var r = []; ativas(P, t).forEach(function (a) { var c = P.cenas[a.i]; (c.midias || []).forEach(function (id, k) {
      if (!id || k >= LAYOUTS[c.layout || "cheia"].n) return; var m = info(id); if (!m || m.tipo !== "video") return;
      var d = m.dur || 1, desde = +((c.desde || [])[k] || 0), x = desde + a.lt; r.push({ id: id, tempo: x % d }); }); });
    return r;
  }

  /* desenhar(ctx, P, t, W, H, fonte) — fonte(id, cena, k) → { el, w, h } (imagem ou vídeo já no quadro certo) */
  function desenhar(ctx, P, t, W, H, fonte) {
    ctx.save(); ctx.fillStyle = P.fundo || "#000"; ctx.fillRect(0, 0, W, H);
    if (!P.cenas.length) { ctx.restore(); return; }
    t = Math.max(0, +t || 0); var at = ativas(P, t), atual = at[at.length - 1]; if (!atual) { ctx.restore(); return; } var c = P.cenas[atual.i];
    var B = function () { cena(ctx, P, c, atual.lt, W, H, fonte); };
    if (at.length > 1 && atual.p !== null) {
      var ant = at[0], ca = P.cenas[ant.i], A = function () { cena(ctx, P, ca, ant.lt, W, H, fonte); };
      var tr = TRANS[c.trans] || TRANS.corte; tr.f(ctx, cl(atual.p), W, H, A, B, sorte(hash(c.id || atual.i)), corLinha(P, 1 - Math.pow(cl(atual.p), 5)));   /* a linha some no fim da transição */
    } else B();
    ctx.restore();
  }

  /* ---------- montar sozinho: uma cena por mídia, ritmo ou batida, transições do pacote, algumas divisões ---------- */
  function montar(P, midias, op) {
    op = op || {}; var pac = (PACOTES[op.pacote] || PACOTES.geometrico).lista, passo = op.batida > 0 ? op.batida * (op.ritmo === "rapido" ? 1 : op.ritmo === "calmo" ? 4 : 2) : (op.ritmo === "rapido" ? 0.9 : op.ritmo === "calmo" ? 2.6 : 1.6);
    while (passo < 0.6) passo *= 2;
    var movs = ["zoom", "esq", "afasta", "dir", "sobe"], cenas = [], i = 0, n = 0, usarDiv = op.divisoes !== false && midias.length >= 4;
    while (i < midias.length) {
      var lay = "cheia";
      if (usarDiv && n % 4 === 3) lay = midias.length - i >= 3 && n % 8 === 7 ? "tripla" : midias.length - i >= 2 ? (n % 8 === 3 ? "dupla" : "diagonal") : "cheia";
      var k = LAYOUTS[lay].n, ids = midias.slice(i, i + k).map(function (m) { return m.id; });
      cenas.push({ id: "c" + n + "_" + hash(ids.join()) % 100000, layout: lay, midias: ids, dur: +(lay === "cheia" ? passo : passo * 1.5).toFixed(3), mov: movs[n % movs.length], trans: n ? pac[(n - 1) % pac.length] : "corte", transDur: Math.min(0.7, passo * 0.6), desde: ids.map(function () { return 0; }) });
      i += k; n++;
    }
    P.cenas = cenas; return P;
  }

  window.BWTelas = { LAYOUTS: LAYOUTS, MOVS: MOVS, TRANS: TRANS, PACOTES: PACOTES, desenhar: desenhar, inicios: inicios, duracao: duracao, ativas: ativas, videosEm: videosEm, montar: montar, paineis: paineis, corLinha: corLinha };
})();
