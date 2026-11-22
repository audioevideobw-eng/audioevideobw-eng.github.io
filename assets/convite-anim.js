/* CONVITE ANIMADO (22/11/2026, Claude) — bichinhos, objetos e efeitos de tela desenhados em canvas, todos ORIGINAIS
   (nada de personagem, figurinha ou arte de terceiros). Cada quadro depende só do tempo t (determinístico): a prévia e o vídeo
   gerado no aparelho mostram a mesma coisa. Este arquivo não guarda nem envia nada.
   BWConviteAnim.ITENS[id].f(ctx, t)  → desenha centrado em (0,0), numa caixa de ~100×100 (quem chama faz translate/scale)
   BWConviteAnim.EFEITOS[id].f(ctx, W, H, t, cores) → desenha na tela inteira; camada "fundo" (atrás do texto) ou "frente" */
(function () {
  "use strict";
  var TAU = Math.PI * 2;
  function h(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function piscar(t, f) { var c = (t + (f || 0)) % 3.4; return c < 0.16 ? Math.abs(c - 0.08) / 0.08 : 1; }
  function circ(x, cx, cy, r, cor) { x.fillStyle = cor; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
  function elip(x, cx, cy, rx, ry, cor, rot) { x.fillStyle = cor; x.beginPath(); x.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); x.fill(); }
  function borda(x, cor, lw) { x.strokeStyle = cor || "rgba(40,25,15,.25)"; x.lineWidth = lw || 2; x.stroke(); }
  function circB(x, cx, cy, r, cor) { circ(x, cx, cy, r, cor); borda(x); }
  function olho(x, cx, cy, r, ab) {
    if (ab < 0.3) { x.strokeStyle = "#2a1a12"; x.lineWidth = r * 0.55; x.lineCap = "round"; x.beginPath(); x.moveTo(cx - r, cy); x.quadraticCurveTo(cx, cy + r * 0.7, cx + r, cy); x.stroke(); return; }
    elip(x, cx, cy, r, r * 1.1 * ab, "#2a1a12"); circ(x, cx + r * 0.35, cy - r * 0.4 * ab, r * 0.38, "#fff");
  }
  function boca(x, cx, cy, w) { x.strokeStyle = "#2a1a12"; x.lineWidth = Math.max(1.5, w * 0.24); x.lineCap = "round"; x.beginPath(); x.arc(cx, cy - w * 0.35, w * 0.6, 0.22 * Math.PI, 0.78 * Math.PI); x.stroke(); }
  function boch(x, cx, cy, r) { x.save(); x.globalAlpha *= 0.45; circ(x, cx, cy, r, "#ff7a9a"); x.restore(); }
  function coracaoPath(x, cx, cy, s) { x.beginPath(); x.moveTo(cx, cy + s * 0.35); x.bezierCurveTo(cx - s * 1.1, cy - s * 0.35, cx - s * 0.45, cy - s * 1.05, cx, cy - s * 0.45); x.bezierCurveTo(cx + s * 0.45, cy - s * 1.05, cx + s * 1.1, cy - s * 0.35, cx, cy + s * 0.35); x.closePath(); }
  function estrelaPath(x, cx, cy, r, pontas, dentro) { x.beginPath(); for (var i = 0; i < pontas * 2; i++) { var a = Math.PI / pontas * i - Math.PI / 2, rr = i % 2 ? r * (dentro || 0.45) : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); }
  function brilho(x, cx, cy, r, a, cor) { x.save(); x.globalAlpha *= a; x.fillStyle = cor || "#fff"; x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill(); x.restore(); }
  function asaBorboleta(x, k, c1, c2) {
    x.save(); x.scale(k, 1);
    [1, -1].forEach(function (s) {
      elip(x, s * 17, -12, 17, 21, c1, s * 0.5); elip(x, s * 13, 14, 11, 14, c2, -s * 0.4);
      circ(x, s * 19, -15, 5, "rgba(255,255,255,.7)"); circ(x, s * 12, 15, 3, "rgba(255,255,255,.6)");
    });
    x.restore();
  }

  /* ===== BICHINHOS E OBJETOS (posicionáveis) ===== */
  var ITENS = {
    ursinho: { nome: "Ursinho piscando", cat: "bicho", f: function (x, t) {
      x.translate(0, Math.sin(t * 2.2) * 3);
      var m = "#b07a45", c = "#ecc79c";
      circB(x, -28, -30, 14, m); circB(x, 28, -30, 14, m); circ(x, -28, -30, 7, c); circ(x, 28, -30, 7, c);
      circB(x, 0, 0, 36, m); elip(x, 0, 14, 17, 12, c); elip(x, 0, 7, 6, 4.5, "#3a2214");
      var a = piscar(t); olho(x, -13, -7, 5, a); olho(x, 13, -7, 5, a); boca(x, 0, 20, 8); boch(x, -23, 9, 6); boch(x, 23, 9, 6);
      x.save(); x.translate(33, 28); x.rotate(-0.5 + Math.sin(t * 6) * 0.4); elip(x, 0, -12, 9, 15, m); borda(x); circ(x, 0, -20, 5, c); x.restore();
    } },
    coelho: { nome: "Coelhinho pulando", cat: "bicho", f: function (x, t) {
      x.translate(0, 8 - Math.abs(Math.sin(t * 2.6)) * 10);
      [-1, 1].forEach(function (s) { x.save(); x.translate(s * 13, -26); x.rotate(s * (0.14 + Math.sin(t * 3 + s) * 0.14)); elip(x, 0, -20, 9, 24, "#fff"); borda(x); elip(x, 0, -19, 4.5, 16, "#ffb3c7"); x.restore(); });
      circB(x, 0, 2, 29, "#fff"); var a = piscar(t, 1.1); olho(x, -10, -3, 4.5, a); olho(x, 10, -3, 4.5, a);
      elip(x, 0, 7, 4, 3, "#ff8fab"); boca(x, 0, 15, 6); boch(x, -19, 9, 5); boch(x, 19, 9, 5);
    } },
    gato: { nome: "Gatinho", cat: "bicho", f: function (x, t) {
      var l = "#f2a65a";
      x.save(); x.translate(20, 30); x.rotate(Math.sin(t * 2) * 0.45); x.strokeStyle = l; x.lineWidth = 8; x.lineCap = "round"; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(22, -4, 22, -30); x.stroke(); x.restore();
      elip(x, 0, 26, 22, 20, l); borda(x);
      [-1, 1].forEach(function (s) { x.fillStyle = l; x.beginPath(); x.moveTo(s * 22, -18); x.lineTo(s * 18, -44); x.lineTo(s * 4, -28); x.fill(); x.fillStyle = "#ffb3c7"; x.beginPath(); x.moveTo(s * 17, -22); x.lineTo(s * 16, -37); x.lineTo(s * 8, -27); x.fill(); });
      circB(x, 0, -10, 23, l); x.fillStyle = "#d9823a"; x.fillRect(-3, -32, 6, 9);
      var a = piscar(t, 0.6); olho(x, -9, -12, 4.5, a); olho(x, 9, -12, 4.5, a);
      x.fillStyle = "#ff8fab"; x.beginPath(); x.moveTo(-3, -3); x.lineTo(3, -3); x.lineTo(0, 0); x.fill();
      x.strokeStyle = "rgba(60,40,20,.6)"; x.lineWidth = 1.2; [-1, 1].forEach(function (s) { [-2, 2].forEach(function (d) { x.beginPath(); x.moveTo(s * 6, -1 + d); x.lineTo(s * 24, -3 + d * 2.5); x.stroke(); }); });
    } },
    cachorro: { nome: "Cachorrinho", cat: "bicho", f: function (x, t) {
      var b = "#e8c99a", e = "#9a6a3a";
      x.save(); x.translate(24, 26); x.rotate(-0.6 + Math.sin(t * 12) * 0.5); elip(x, 10, 0, 12, 5, b); x.restore();
      elip(x, 0, 26, 22, 18, b); borda(x); circB(x, 0, -8, 25, b);
      [-1, 1].forEach(function (s) { x.save(); x.translate(s * 22, -20); x.rotate(s * (0.35 + Math.sin(t * 3) * 0.1)); elip(x, 0, 14, 9, 18, e); x.restore(); });
      var a = piscar(t, 2); olho(x, -9, -12, 4.5, a); olho(x, 9, -12, 4.5, a); elip(x, 0, 0, 6, 4.5, "#3a2214");
      x.save(); x.translate(0, 9); elip(x, 0, 4 + Math.sin(t * 5) * 1.5, 5, 7, "#ff6b8a"); x.restore(); boch(x, -17, 2, 5); boch(x, 17, 2, 5);
    } },
    passarinho: { nome: "Passarinho", cat: "bicho", f: function (x, t) {
      x.translate(0, Math.sin(t * 3) * 4);
      circB(x, 0, 0, 26, "#6ec6ff"); elip(x, 4, 10, 15, 12, "#dff3ff");
      x.save(); x.translate(-8, 2); x.rotate(-0.4 + Math.sin(t * 14) * 0.6); elip(x, -10, 0, 16, 8, "#3a9be0"); x.restore();
      x.fillStyle = "#ffb547"; x.beginPath(); x.moveTo(22, -4); x.lineTo(36, 0); x.lineTo(22, 5); x.fill();
      olho(x, 12, -8, 4, piscar(t, 0.4)); boch(x, 14, 4, 4);
      x.strokeStyle = "#ff9a3c"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-4, 25); x.lineTo(-4, 33); x.moveTo(5, 25); x.lineTo(5, 33); x.stroke();
    } },
    borboleta: { nome: "Borboleta voando", cat: "bicho", f: function (x, t) {
      x.translate(Math.sin(t * 0.9) * 12, Math.sin(t * 1.7) * 8); x.rotate(Math.sin(t * 1.3) * 0.15);
      asaBorboleta(x, 0.3 + 0.7 * Math.abs(Math.cos(t * 9)), "#ff7ab6", "#b388ff");
      elip(x, 0, 2, 3.5, 18, "#3a2a4a");
      x.strokeStyle = "#3a2a4a"; x.lineWidth = 1.6; x.beginPath(); x.moveTo(-1, -14); x.quadraticCurveTo(-6, -26, -10, -28); x.moveTo(1, -14); x.quadraticCurveTo(6, -26, 10, -28); x.stroke();
    } },
    peixe: { nome: "Peixinho nadando", cat: "bicho", f: function (x, t) {
      var dx = Math.sin(t * 1.1) * 14, dir = Math.cos(t * 1.1) >= 0 ? 1 : -1;
      for (var i = 0; i < 3; i++) { var p = (t * 0.5 + i / 3) % 1; x.save(); x.globalAlpha *= 1 - p; x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 1.5; x.beginPath(); x.arc(dx + dir * 26 + Math.sin(p * 9) * 3, -10 - p * 40, 3 + p * 3, 0, TAU); x.stroke(); x.restore(); }
      x.translate(dx, 0); x.scale(dir, 1);
      x.save(); x.translate(-24, 0); x.rotate(Math.sin(t * 10) * 0.35); x.fillStyle = "#ff8a3c"; x.beginPath(); x.moveTo(4, 0); x.lineTo(-16, -15); x.lineTo(-12, 0); x.lineTo(-16, 15); x.fill(); x.restore();
      elip(x, 0, 0, 27, 18, "#ffa64d"); borda(x); x.fillStyle = "#fff"; x.fillRect(-6, -17, 5, 34); x.fillRect(6, -15, 4, 30);
      olho(x, 15, -4, 4, piscar(t, 0.9)); boca(x, 20, 8, 4);
    } },
    joaninha: { nome: "Joaninha", cat: "bicho", f: function (x, t) {
      x.translate(Math.sin(t * 0.8) * 8, 0); x.rotate(Math.sin(t * 0.8) * 0.12);
      x.strokeStyle = "#222"; x.lineWidth = 2; [-1, 1].forEach(function (s) { x.beginPath(); x.moveTo(s * 5, -24); x.quadraticCurveTo(s * (12 + Math.sin(t * 5) * 3), -38, s * 14, -40); x.stroke(); circ(x, s * 14, -40, 2.5, "#222"); });
      circ(x, 0, -20, 11, "#222"); circB(x, 0, 4, 25, "#e53935"); x.strokeStyle = "#222"; x.lineWidth = 2; x.beginPath(); x.moveTo(0, -21); x.lineTo(0, 29); x.stroke();
      [[-12, -4], [12, -4], [-10, 14], [10, 14], [-4, 6], [4, 22]].forEach(function (p) { circ(x, p[0], p[1], 4.5, "#222"); });
      olho(x, -4, -21, 2.5, piscar(t)); olho(x, 4, -21, 2.5, piscar(t));
    } },
    abelha: { nome: "Abelhinha", cat: "bicho", f: function (x, t) {
      x.translate(Math.sin(t * 1.5) * 18, Math.sin(t * 3) * 8);
      x.save(); x.globalAlpha *= 0.75; var w = 0.6 + 0.4 * Math.abs(Math.sin(t * 30)); elip(x, -6, -18, 9 * w, 13, "#e8f6ff", -0.4); elip(x, 6, -18, 9 * w, 13, "#e8f6ff", 0.4); x.restore();
      x.save(); x.beginPath(); x.ellipse(0, 0, 24, 17, 0, 0, TAU); x.clip(); x.fillStyle = "#ffd23f"; x.fillRect(-25, -18, 50, 36); x.fillStyle = "#2a1a12"; [-8, 4, 16].forEach(function (s) { x.fillRect(s, -18, 6, 36); }); x.restore();
      x.beginPath(); x.ellipse(0, 0, 24, 17, 0, 0, TAU); borda(x);
      x.fillStyle = "#2a1a12"; x.beginPath(); x.moveTo(24, 0); x.lineTo(32, -2); x.lineTo(24, 4); x.fill();
      olho(x, -13, -3, 3.5, piscar(t, 1.7)); boca(x, -13, 6, 4); boch(x, -19, 5, 3.5);
    } },
    dino: { nome: "Dinossauro", cat: "bicho", f: function (x, t) {
      var g = "#5ccf7a", d = "#3aa95a";
      x.translate(0, -Math.abs(Math.sin(t * 1.6)) * 5);
      x.save(); x.translate(-20, 20); x.rotate(Math.sin(t * 2.4) * 0.3); x.fillStyle = g; x.beginPath(); x.moveTo(0, -8); x.quadraticCurveTo(-26, 0, -34, 12); x.quadraticCurveTo(-18, 8, 0, 10); x.fill(); x.restore();
      elip(x, 0, 18, 24, 20, g); borda(x); elip(x, 2, 22, 14, 12, "#c8f5d2");
      x.fillStyle = d; [[-14, -2], [-4, -6], [6, -4]].forEach(function (p) { x.beginPath(); x.moveTo(p[0] - 5, p[1] + 6); x.lineTo(p[0], p[1] - 6); x.lineTo(p[0] + 5, p[1] + 6); x.fill(); });
      elip(x, 12, -16, 21, 17, g); borda(x); var a = piscar(t, 0.3); olho(x, 18, -20, 4.5, a); boca(x, 22, -8, 6); boch(x, 6, -9, 4.5);
      x.fillStyle = g; x.fillRect(-14, 32, 8, 10); x.fillRect(8, 32, 8, 10);
    } },
    unicornio: { nome: "Unicórnio", cat: "bicho", f: function (x, t) {
      x.translate(0, Math.sin(t * 2) * 3);
      ["#ff8fc7", "#ffd23f", "#7ad7ff", "#b388ff"].forEach(function (c, i) { circ(x, -20 + i * 3, -18 + i * 12 + Math.sin(t * 3 + i) * 1.5, 13, c); });
      elip(x, 4, 4, 27, 30, "#fff"); borda(x); elip(x, 10, 22, 16, 12, "#ffe3ef");
      x.save(); x.translate(8, -24); x.rotate(0.2); x.fillStyle = "#f5c451"; x.beginPath(); x.moveTo(-6, 0); x.lineTo(0, -28); x.lineTo(6, 0); x.fill(); x.strokeStyle = "#d9a12c"; x.lineWidth = 1.5; [-8, -16].forEach(function (y) { x.beginPath(); x.moveTo(-4, y + 4); x.lineTo(4, y); x.stroke(); }); x.restore();
      olho(x, 12, -2, 4.5, piscar(t, 0.8)); circ(x, 6, 22, 2, "#d48aa8"); circ(x, 14, 22, 2, "#d48aa8"); boch(x, 22, 8, 5);
      for (var i = 0; i < 3; i++) brilho(x, 34 - i * 22, -34 + i * 10, 6, 0.5 + 0.5 * Math.sin(t * 4 + i * 2), "#ffd23f");
    } },
    leao: { nome: "Leãozinho", cat: "bicho", f: function (x, t) {
      x.save(); x.rotate(Math.sin(t * 1.2) * 0.08); for (var i = 0; i < 12; i++) { var a = TAU * i / 12; circ(x, Math.cos(a) * 30, Math.sin(a) * 30, 14, i % 2 ? "#d9822b" : "#c56a1c"); } x.restore();
      circB(x, 0, 0, 27, "#f5b94a"); circ(x, -18, -20, 7, "#f5b94a"); circ(x, 18, -20, 7, "#f5b94a");
      var a = piscar(t, 1.4); olho(x, -9, -5, 4.5, a); olho(x, 9, -5, 4.5, a); elip(x, 0, 12, 13, 9, "#ffe3b0"); elip(x, 0, 6, 5, 3.5, "#5a2d14"); boca(x, 0, 16, 6); boch(x, -18, 6, 5); boch(x, 18, 6, 5);
    } },
    patinho: { nome: "Patinho na água", cat: "bicho", f: function (x, t) {
      x.save(); x.translate(0, Math.sin(t * 2) * 3); x.rotate(Math.sin(t * 2) * 0.06);
      elip(x, -4, 14, 28, 18, "#ffd84d"); borda(x); circB(x, 14, -12, 17, "#ffd84d");
      x.save(); x.translate(-8, 10); x.rotate(Math.sin(t * 4) * 0.2); elip(x, 0, 0, 13, 8, "#f5c330"); x.restore();
      elip(x, 31, -8, 9, 4.5, "#ff9a3c"); olho(x, 18, -16, 3.8, piscar(t, 2.4)); boch(x, 22, -6, 4); x.restore();
      x.strokeStyle = "rgba(120,190,255,.9)"; x.lineWidth = 3; x.lineCap = "round"; for (var i = 0; i < 2; i++) { x.beginPath(); for (var k = -40; k <= 40; k += 4) x.lineTo(k, 32 + i * 7 + Math.sin(k * 0.2 + t * 3 + i) * 2); x.stroke(); }
    } },
    pomba: { nome: "Pombinha", cat: "bicho", f: function (x, t) {
      x.translate(Math.sin(t * 0.8) * 8, Math.sin(t * 1.6) * 6);
      var k = Math.sin(t * 7);
      elip(x, 0, 6, 26, 14, "#fff"); borda(x); circB(x, 22, -6, 11, "#fff");
      x.fillStyle = "#fff"; x.beginPath(); x.moveTo(-22, 4); x.lineTo(-40, -4); x.lineTo(-38, 12); x.fill(); borda(x);
      x.save(); x.translate(-2, 0); x.scale(1, k); x.fillStyle = "#f3f6ff"; x.beginPath(); x.moveTo(-10, 0); x.quadraticCurveTo(-4, -34, 18, -30); x.quadraticCurveTo(8, -12, 10, 0); x.fill(); borda(x); x.restore();
      x.fillStyle = "#ffb547"; x.beginPath(); x.moveTo(32, -6); x.lineTo(39, -3); x.lineTo(32, -1); x.fill(); olho(x, 25, -8, 2.6, piscar(t, 0.2));
    } },
    foguete: { nome: "Foguete", cat: "objeto", f: function (x, t) {
      x.translate(Math.sin(t * 3) * 2, Math.sin(t * 2) * 5); x.rotate(0.35);
      var fl = 0.8 + 0.25 * Math.sin(t * 25) + 0.1 * Math.sin(t * 13);
      elip(x, 0, 34, 9, 16 * fl, "#ffb547"); elip(x, 0, 32, 5, 10 * fl, "#fff3b0");
      x.fillStyle = "#e53935"; x.beginPath(); x.moveTo(-14, 18); x.lineTo(-24, 30); x.lineTo(-10, 26); x.fill(); x.beginPath(); x.moveTo(14, 18); x.lineTo(24, 30); x.lineTo(10, 26); x.fill();
      x.fillStyle = "#f5f7fb"; x.beginPath(); x.moveTo(0, -40); x.bezierCurveTo(18, -24, 16, 10, 12, 26); x.lineTo(-12, 26); x.bezierCurveTo(-16, 10, -18, -24, 0, -40); x.fill(); borda(x);
      x.fillStyle = "#e53935"; x.beginPath(); x.moveTo(0, -40); x.bezierCurveTo(9, -32, 12, -26, 13, -22); x.lineTo(-13, -22); x.bezierCurveTo(-12, -26, -9, -32, 0, -40); x.fill();
      circ(x, 0, -4, 8, "#4fc3f7"); x.strokeStyle = "#8aa"; x.lineWidth = 2.5; x.beginPath(); x.arc(0, -4, 8, 0, TAU); x.stroke(); circ(x, -3, -7, 2.5, "rgba(255,255,255,.8)");
    } },
    coracao: { nome: "Coração pulsando", cat: "objeto", f: function (x, t) {
      var p = Math.pow(Math.max(0, Math.sin(t * 5)), 6); x.scale(1 + p * 0.14, 1 + p * 0.14);
      coracaoPath(x, 0, 6, 38); var g = x.createLinearGradient(-30, -30, 30, 30); g.addColorStop(0, "#ff6b8a"); g.addColorStop(1, "#e0245e"); x.fillStyle = g; x.fill(); borda(x, "rgba(120,0,30,.3)");
      elip(x, -16, -14, 7, 4, "rgba(255,255,255,.6)", -0.6);
    } },
    estrela: { nome: "Estrela brilhando", cat: "objeto", f: function (x, t) {
      x.rotate(Math.sin(t * 1.2) * 0.2); var s = 1 + 0.08 * Math.sin(t * 3); x.scale(s, s);
      x.save(); x.shadowColor = "#ffd23f"; x.shadowBlur = 18; estrelaPath(x, 0, 0, 38, 5, 0.48); x.fillStyle = "#ffd23f"; x.fill(); x.restore(); borda(x, "#e0a800");
      olho(x, -8, -2, 3.5, piscar(t, 0.5)); olho(x, 8, -2, 3.5, piscar(t, 0.5)); boca(x, 0, 9, 5); boch(x, -15, 6, 4); boch(x, 15, 6, 4);
      brilho(x, 36, -30, 7, 0.5 + 0.5 * Math.sin(t * 5), "#fff");
    } },
    balao: { nome: "Balão flutuando", cat: "objeto", f: function (x, t) {
      var dx = Math.sin(t * 1.4) * 6; x.strokeStyle = "rgba(90,90,90,.7)"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(dx, 18); x.quadraticCurveTo(dx - 8 + Math.sin(t * 2) * 4, 34, dx + 2, 50); x.stroke();
      x.translate(dx, -10 + Math.sin(t * 1.8) * 4); x.rotate(Math.sin(t * 1.4) * 0.08);
      elip(x, 0, 0, 24, 29, "#ff4f7b"); borda(x, "rgba(120,0,30,.25)"); x.fillStyle = "#ff4f7b"; x.beginPath(); x.moveTo(-4, 28); x.lineTo(4, 28); x.lineTo(0, 33); x.fill();
      elip(x, -9, -11, 5, 9, "rgba(255,255,255,.55)", 0.4);
    } },
    bolo: { nome: "Bolo com velas", cat: "objeto", f: function (x, t) {
      x.fillStyle = "#f7a8c4"; x.fillRect(-34, 8, 68, 26); x.fillStyle = "#fff3f7"; x.fillRect(-26, -12, 52, 22);
      x.fillStyle = "#fff"; x.beginPath(); x.moveTo(-36, 8); for (var i = 0; i <= 8; i++) x.quadraticCurveTo(-36 + i * 9 - 4.5, 18, -36 + i * 9, 8); x.fill();
      x.fillStyle = "#c98a5a"; x.fillRect(-40, 34, 80, 5);
      [-14, 0, 14].forEach(function (cx, i) {
        x.fillStyle = ["#7ad7ff", "#ffd23f", "#b388ff"][i]; x.fillRect(cx - 2.5, -30, 5, 18);
        var fl = 0.85 + 0.2 * Math.sin(t * 18 + i * 2) + 0.1 * Math.sin(t * 7 + i);
        x.save(); x.translate(cx + Math.sin(t * 9 + i) * 1.2, -32); x.scale(1, fl); x.shadowColor = "#ffb547"; x.shadowBlur = 10; elip(x, 0, -6, 4, 8, "#ffb547"); elip(x, 0, -4, 2, 4, "#fff6c4"); x.restore();
      });
    } },
    tacas: { nome: "Taças brindando", cat: "objeto", f: function (x, t) {
      var c = (t % 2.6) / 2.6, k = c < 0.4 ? Math.sin(c / 0.4 * Math.PI) : 0;
      [-1, 1].forEach(function (s) {
        x.save(); x.translate(s * 14, 10); x.rotate(-s * (0.15 + k * 0.25));
        x.fillStyle = "rgba(255,236,170,.85)"; x.beginPath(); x.moveTo(-10, -34); x.lineTo(10, -34); x.lineTo(5, -6); x.lineTo(-5, -6); x.fill();
        x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 2.2; x.beginPath(); x.moveTo(-11, -42); x.lineTo(-5, -4); x.lineTo(5, -4); x.lineTo(11, -42); x.stroke();
        x.beginPath(); x.moveTo(0, -4); x.lineTo(0, 22); x.moveTo(-9, 22); x.lineTo(9, 22); x.stroke();
        circ(x, -2, -20 - ((t * 20) % 14), 1.5, "rgba(255,255,255,.9)"); x.restore();
      });
      if (k > 0.6) for (var i = 0; i < 4; i++) brilho(x, Math.cos(i * 1.6) * 14, -42 + Math.sin(i * 1.6) * 10, 6, k, "#fff3b0");
    } },
    presente: { nome: "Presente", cat: "objeto", f: function (x, t) {
      var c = t % 2.2, j = c < 0.35 ? Math.sin(c / 0.35 * Math.PI) : 0; x.translate(0, -j * 10); x.rotate(Math.sin(t * 4) * 0.05);
      x.fillStyle = "#4fc3f7"; x.fillRect(-30, -12, 60, 44); x.fillStyle = "#3aa2d6"; x.fillRect(-34, -22, 68, 14);
      x.fillStyle = "#ff4f7b"; x.fillRect(-5, -22, 10, 54); x.fillRect(-34, -18, 68, 6);
      x.save(); x.translate(0, -24 - j * 4); [-1, 1].forEach(function (s) { elip(x, s * 12, -6, 12, 7, "#ff4f7b", s * 0.5); }); circ(x, 0, -3, 5, "#e0245e"); x.restore();
    } },
    coroa: { nome: "Coroa brilhando", cat: "objeto", f: function (x, t) {
      x.save(); x.beginPath(); x.moveTo(-36, 18); x.lineTo(-36, -18); x.lineTo(-18, 0); x.lineTo(0, -28); x.lineTo(18, 0); x.lineTo(36, -18); x.lineTo(36, 18); x.closePath();
      var g = x.createLinearGradient(0, -30, 0, 20); g.addColorStop(0, "#ffe79a"); g.addColorStop(1, "#d9a12c"); x.fillStyle = g; x.fill(); borda(x, "#a8761a"); x.clip();
      var p = ((t % 2.4) / 2.4) * 140 - 70; x.fillStyle = "rgba(255,255,255,.55)"; x.beginPath(); x.moveTo(p - 8, -30); x.lineTo(p + 6, -30); x.lineTo(p - 10, 20); x.lineTo(p - 24, 20); x.fill(); x.restore();
      x.fillStyle = "#d9a12c"; x.fillRect(-36, 14, 72, 8);
      [[-22, 6, "#e53935"], [0, 4, "#4fc3f7"], [22, 6, "#5ccf7a"]].forEach(function (p) { circ(x, p[0], p[1], 5, p[2]); });
      [[-36, -18], [0, -28], [36, -18]].forEach(function (p) { circ(x, p[0], p[1], 4, "#fff3b0"); });
    } },
    aliancas: { nome: "Alianças", cat: "objeto", f: function (x, t) {
      x.rotate(Math.sin(t * 1.2) * 0.1);
      [[-11, 4, -0.3], [11, -4, 0.3]].forEach(function (r) { x.save(); x.translate(r[0], r[1]); x.rotate(r[2]); x.strokeStyle = "#d9a12c"; x.lineWidth = 8; x.beginPath(); x.ellipse(0, 0, 22, 18, 0, 0, TAU); x.stroke(); x.strokeStyle = "#ffe79a"; x.lineWidth = 3; x.beginPath(); x.ellipse(0, -1, 22, 18, 0, Math.PI * 1.1, Math.PI * 1.7); x.stroke(); x.restore(); });
      brilho(x, 18, -26, 8, 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5)), "#fff"); brilho(x, -26, 18, 5, 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5 + 1.5)), "#fff");
    } },
    capelo: { nome: "Chapéu de formatura", cat: "objeto", f: function (x, t) {
      x.translate(0, Math.sin(t * 2) * 2);
      x.fillStyle = "#1d2433"; x.beginPath(); x.moveTo(-22, 2); x.lineTo(22, 2); x.lineTo(20, 20); x.quadraticCurveTo(0, 28, -20, 20); x.fill();
      x.fillStyle = "#2b3448"; x.beginPath(); x.moveTo(0, -24); x.lineTo(42, -6); x.lineTo(0, 12); x.lineTo(-42, -6); x.closePath(); x.fill(); borda(x, "rgba(255,255,255,.25)");
      circ(x, 0, -6, 3.5, "#ffd23f");
      x.save(); x.translate(0, -6); x.rotate(Math.sin(t * 2.4) * 0.35); x.strokeStyle = "#ffd23f"; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, 0); x.lineTo(30, 6); x.lineTo(30, 30); x.stroke(); elip(x, 30, 34, 4, 7, "#ffd23f"); x.restore();
    } },
    lua: { nome: "Lua dormindo", cat: "objeto", f: function (x, t) {
      x.save(); x.rotate(Math.sin(t * 1.1) * 0.15);
      x.save(); x.beginPath(); x.arc(0, 0, 34, 0, TAU); x.clip(); x.beginPath(); x.rect(-40, -40, 80, 80); x.arc(16, -10, 30, 0, TAU); x.fillStyle = "#ffe08a"; x.fill("evenodd"); x.restore();
      x.strokeStyle = "#7a5a1a"; x.lineWidth = 2; x.lineCap = "round"; x.beginPath(); x.arc(-16, 2, 4, 0.1 * Math.PI, 0.9 * Math.PI); x.stroke(); boch(x, -20, 12, 5); x.restore();
      [[-30, -34], [34, 24], [30, -38]].forEach(function (p, i) { x.save(); x.globalAlpha *= 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); estrelaPath(x, p[0], p[1], 7, 5, 0.45); x.fillStyle = "#ffe08a"; x.fill(); x.restore(); });
      x.fillStyle = "rgba(255,255,255,.85)"; x.font = "700 12px Inter, sans-serif"; var z = (t * 0.6) % 1; x.globalAlpha *= 1 - z; x.fillText("z", 18 + z * 8, -30 - z * 18);
    } },
    abobora: { nome: "Abóbora", cat: "objeto", f: function (x, t) {
      x.translate(0, Math.sin(t * 2) * 2);
      [-20, 20, -8, 8].forEach(function (cx) { elip(x, cx, 6, 20, 28, "#ff8a1f"); }); elip(x, 0, 6, 16, 29, "#ffa64d"); x.beginPath(); x.ellipse(0, 6, 40, 29, 0, 0, TAU); borda(x, "rgba(120,50,0,.35)");
      x.fillStyle = "#4a7a2a"; x.fillRect(-3, -30, 7, 10);
      var g = 0.6 + 0.4 * Math.sin(t * 9) * Math.sin(t * 3.3); x.save(); x.shadowColor = "#ffe08a"; x.shadowBlur = 12 * g; x.fillStyle = "rgba(255,224,138," + (0.6 + 0.4 * g) + ")";
      [-12, 12].forEach(function (cx) { x.beginPath(); x.moveTo(cx - 7, 2); x.lineTo(cx, -8); x.lineTo(cx + 7, 2); x.fill(); });
      x.beginPath(); x.moveTo(-16, 14); x.lineTo(-8, 20); x.lineTo(0, 14); x.lineTo(8, 20); x.lineTo(16, 14); x.lineTo(12, 24); x.lineTo(-12, 24); x.fill(); x.restore();
    } },
    controle: { nome: "Controle de game", cat: "adulto", f: function (x, t) {
      x.translate(0, Math.sin(t * 3) * 3); x.rotate(Math.sin(t * 1.5) * 0.08);
      x.fillStyle = "#2b2f3a"; x.beginPath(); x.moveTo(-30, -16); x.lineTo(30, -16); x.quadraticCurveTo(46, -16, 48, 6); x.quadraticCurveTo(50, 28, 36, 28); x.quadraticCurveTo(26, 28, 20, 14); x.lineTo(-20, 14); x.quadraticCurveTo(-26, 28, -36, 28); x.quadraticCurveTo(-50, 28, -48, 6); x.quadraticCurveTo(-46, -16, -30, -16); x.fill(); borda(x, "rgba(0,0,0,.4)");
      x.fillStyle = "#8a93a8"; x.fillRect(-34, -3, 16, 5); x.fillRect(-28.5, -8.5, 5, 16);
      [[30, -6, "#4fc3f7"], [38, 1, "#ff4f7b"], [22, 1, "#5ccf7a"], [30, 8, "#ffd23f"]].forEach(function (b, i) { var on = Math.floor(t * 4) % 4 === i; circ(x, b[0], b[1], on ? 4.6 : 3.8, b[2]); if (on) brilho(x, b[0], b[1] - 9, 4, 1, b[2]); });
      circ(x, -9, 6, 5, "#1c1f27"); circ(x, 9, 6, 5, "#1c1f27"); x.fillStyle = "#00f0ff"; x.globalAlpha *= 0.5 + 0.5 * Math.sin(t * 4); x.fillRect(-6, -11, 12, 3);
    } },
    bolafut: { nome: "Bola de futebol", cat: "adulto", f: function (x, t) {
      var c = t % 1.4, y = -Math.abs(Math.sin(c / 1.4 * Math.PI)) * 22; elip(x, 0, 36, 22 - (-y) * 0.4, 4, "rgba(0,0,0,.25)");
      x.translate(0, y + 6); x.rotate(t * 3); circB(x, 0, 0, 28, "#fff");
      x.fillStyle = "#1d1d1d"; var pent = function (cx, cy, r, a0) { x.beginPath(); for (var i = 0; i < 5; i++) { var a = a0 + TAU * i / 5; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); x.fill(); };
      pent(0, 0, 9, -Math.PI / 2); for (var i = 0; i < 5; i++) { var a = -Math.PI / 2 + TAU * i / 5; x.save(); x.beginPath(); x.arc(0, 0, 28, 0, TAU); x.clip(); pent(Math.cos(a) * 24, Math.sin(a) * 24, 8, a + Math.PI / 5); x.restore(); x.strokeStyle = "#1d1d1d"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); x.lineTo(Math.cos(a) * 17, Math.sin(a) * 17); x.stroke(); }
    } },
    trofeu: { nome: "Troféu", cat: "adulto", f: function (x, t) {
      x.translate(0, Math.sin(t * 2) * 2); var g = x.createLinearGradient(-26, 0, 26, 0); g.addColorStop(0, "#d9a12c"); g.addColorStop(0.5, "#ffe79a"); g.addColorStop(1, "#c08a1e");
      x.strokeStyle = "#d9a12c"; x.lineWidth = 5; [-1, 1].forEach(function (s) { x.beginPath(); x.arc(s * 24, -14, 10, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5, s < 0); x.stroke(); });
      x.fillStyle = g; x.beginPath(); x.moveTo(-24, -32); x.lineTo(24, -32); x.quadraticCurveTo(24, 6, 0, 10); x.quadraticCurveTo(-24, 6, -24, -32); x.fill(); x.fillRect(-4, 8, 8, 14); x.fillRect(-16, 22, 32, 8); x.fillStyle = "#6b4a2b"; x.fillRect(-20, 30, 40, 8);
      x.save(); x.beginPath(); x.moveTo(-24, -32); x.lineTo(24, -32); x.quadraticCurveTo(24, 6, 0, 10); x.quadraticCurveTo(-24, 6, -24, -32); x.clip(); var p = ((t % 2) / 2) * 90 - 45; x.fillStyle = "rgba(255,255,255,.6)"; x.fillRect(p, -34, 7, 50); x.restore();
      estrelaPath(x, 0, -14, 8, 5, 0.45); x.fillStyle = "#fff3c4"; x.fill(); brilho(x, 30, -38, 6, Math.abs(Math.sin(t * 3)), "#fff");
    } },
    violao: { nome: "Violão", cat: "adulto", f: function (x, t) {
      x.rotate(-0.6 + Math.sin(t * 2) * 0.06);
      x.fillStyle = "#6b3f1d"; x.fillRect(-4, -46, 8, 40); x.fillStyle = "#3a2214"; x.fillRect(-6, -54, 12, 10);
      elip(x, 0, 2, 18, 16, "#d98a3c"); elip(x, 0, 24, 24, 20, "#d98a3c"); x.beginPath(); x.ellipse(0, 24, 24, 20, 0, 0, TAU); borda(x, "#8a4f1d");
      circ(x, 0, 8, 6.5, "#3a2214"); x.fillStyle = "#3a2214"; x.fillRect(-9, 32, 18, 4);
      x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 0.8; for (var i = -2; i <= 2; i++) { var v = Math.sin(t * 40 + i) * (Math.sin(t * 2) > 0.6 ? 1.2 : 0); x.beginPath(); x.moveTo(i * 1.5, -50); x.quadraticCurveTo(i * 1.5 + v, -10, i * 1.5, 33); x.stroke(); }
    } },
    microfone: { nome: "Microfone", cat: "adulto", f: function (x, t) {
      x.rotate(0.35 + Math.sin(t * 2.5) * 0.08);
      x.fillStyle = "#2b2f3a"; x.beginPath(); x.moveTo(-8, 4); x.lineTo(8, 4); x.lineTo(5, 46); x.lineTo(-5, 46); x.fill();
      var g = x.createRadialGradient(-5, -22, 2, 0, -14, 20); g.addColorStop(0, "#f5f7fb"); g.addColorStop(1, "#8a93a8"); circ(x, 0, -14, 19, "#8a93a8"); x.fillStyle = g; x.beginPath(); x.arc(0, -14, 19, 0, TAU); x.fill();
      x.strokeStyle = "rgba(40,45,60,.45)"; x.lineWidth = 1; for (var i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(-18, -14 + i * 6); x.lineTo(18, -14 + i * 6); x.stroke(); x.beginPath(); x.moveTo(i * 6, -32); x.lineTo(i * 6, 4); x.stroke(); }
      x.fillStyle = "#ffd23f"; x.fillRect(-10, 3, 20, 5);
      for (var k = 0; k < 3; k++) { var p = (t * 0.9 + k / 3) % 1; x.save(); x.globalAlpha *= 1 - p; x.strokeStyle = "#ffd23f"; x.lineWidth = 2; x.beginPath(); x.arc(0, -14, 22 + p * 22, -0.6, 0.6); x.stroke(); x.restore(); }
    } },
    nota: { nome: "Notas musicais", cat: "adulto", f: function (x, t) {
      [[-14, 6, 0, "#ff4f7b"], [16, -4, 1.3, "#4fc3f7"]].forEach(function (n) { x.save(); x.translate(n[0], n[1] + Math.sin(t * 2.5 + n[2]) * 6); x.rotate(Math.sin(t * 2 + n[2]) * 0.15);
        elip(x, 0, 18, 9, 7, n[3], -0.4); x.fillStyle = n[3]; x.fillRect(6, -22, 4, 40); x.beginPath(); x.moveTo(10, -22); x.quadraticCurveTo(26, -14, 22, 0); x.quadraticCurveTo(22, -10, 10, -12); x.fill(); x.restore(); });
    } },
    vinil: { nome: "Disco de vinil", cat: "adulto", f: function (x, t) {
      x.save(); x.rotate(t * 3); circ(x, 0, 0, 38, "#141418"); x.strokeStyle = "rgba(255,255,255,.12)"; x.lineWidth = 1; for (var r = 14; r < 37; r += 3) { x.beginPath(); x.arc(0, 0, r, 0, TAU); x.stroke(); }
      x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 30, -0.8, -0.2); x.stroke(); circ(x, 0, 0, 12, "#ff4f7b"); circ(x, 0, -6, 2, "#fff"); circ(x, 0, 0, 2.5, "#141418"); x.restore();
    } },
    fone: { nome: "Fone de ouvido", cat: "adulto", f: function (x, t) {
      var p = 1 + Math.max(0, Math.sin(t * 8)) * 0.05; x.scale(p, p);
      x.strokeStyle = "#2b2f3a"; x.lineWidth = 7; x.lineCap = "round"; x.beginPath(); x.arc(0, 4, 32, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
      [-1, 1].forEach(function (s) { x.fillStyle = "#2b2f3a"; x.beginPath(); x.ellipse(s * 32, 10, 11, 17, 0, 0, TAU); x.fill(); elip(x, s * 32, 10, 6, 11, "#00f0ff"); });
      for (var i = 0; i < 3; i++) { var q = (t * 1.2 + i / 3) % 1; x.save(); x.globalAlpha *= 1 - q; x.strokeStyle = "#00f0ff"; x.lineWidth = 2; [-1, 1].forEach(function (s) { x.beginPath(); x.arc(s * 32, 10, 18 + q * 14, s > 0 ? -0.7 : Math.PI - 0.7, s > 0 ? 0.7 : Math.PI + 0.7); x.stroke(); }); x.restore(); }
    } },
    caixasom: { nome: "Caixa de som", cat: "adulto", f: function (x, t) {
      var b = Math.pow(Math.max(0, Math.sin(t * 7.5)), 4); x.fillStyle = "#23262f"; x.fillRect(-26, -40, 52, 80); x.strokeStyle = "rgba(255,255,255,.15)"; x.lineWidth = 2; x.strokeRect(-26, -40, 52, 80);
      circ(x, 0, -22, 9, "#3a3f4b"); circ(x, 0, -22, 4, "#111"); circ(x, 0, 14, 18 + b * 3, "#3a3f4b"); circ(x, 0, 14, 10 + b * 2, "#111"); circ(x, 0, 14, 4, "#555");
      x.save(); x.globalAlpha *= b; x.strokeStyle = "#b388ff"; x.lineWidth = 2; x.beginPath(); x.arc(0, 14, 26, 0, TAU); x.stroke(); x.restore();
    } },
    chopp: { nome: "Caneca de chope", cat: "adulto", f: function (x, t) {
      var c = (t % 2.6) / 2.6, k = c < 0.35 ? Math.sin(c / 0.35 * Math.PI) : 0; x.rotate(-k * 0.3);
      x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 6; x.beginPath(); x.moveTo(22, -16); x.quadraticCurveTo(40, -14, 38, 6); x.quadraticCurveTo(36, 20, 22, 18); x.stroke();
      x.fillStyle = "#f5b020"; x.fillRect(-22, -20, 44, 52); x.fillStyle = "rgba(255,255,255,.3)"; x.fillRect(-16, -14, 5, 40);
      for (var i = 0; i < 5; i++) { var q = (t * 0.7 + i / 5) % 1; circ(x, -14 + i * 7, 28 - q * 44, 1.6, "rgba(255,255,255,.8)"); }
      x.fillStyle = "#fff"; [-16, -6, 4, 14].forEach(function (cx, i) { circ(x, cx, -22 + Math.sin(t * 2 + i) * 1.2, 9, "#fff"); });
      x.strokeStyle = "rgba(0,0,0,.2)"; x.lineWidth = 2; x.strokeRect(-22, -20, 44, 52);
    } },
    vinho: { nome: "Taça de vinho", cat: "adulto", f: function (x, t) {
      x.rotate(Math.sin(t * 1.4) * 0.08);
      x.save(); x.beginPath(); x.moveTo(-20, -40); x.quadraticCurveTo(-24, -6, 0, 0); x.quadraticCurveTo(24, -6, 20, -40); x.clip(); var o = Math.sin(t * 2.5) * 3; x.fillStyle = "#8b1538"; x.beginPath(); x.moveTo(-26, -18 + o); x.quadraticCurveTo(0, -24 - o, 26, -18 + o); x.lineTo(26, 4); x.lineTo(-26, 4); x.fill(); x.restore();
      x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 2.2; x.beginPath(); x.moveTo(-20, -40); x.quadraticCurveTo(-24, -6, 0, 0); x.quadraticCurveTo(24, -6, 20, -40); x.stroke();
      x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 34); x.moveTo(-14, 36); x.quadraticCurveTo(0, 30, 14, 36); x.stroke(); brilho(x, -10, -30, 5, 0.5 + 0.5 * Math.sin(t * 3), "#fff");
    } },
    pipoca: { nome: "Pipoca", cat: "adulto", f: function (x, t) {
      for (var i = 0; i < 3; i++) { var c = (t * 0.8 + i / 3) % 1, h0 = Math.sin(c * Math.PI) * 30; if (c < 0.9) circ(x, -14 + i * 14 + c * 8, -30 - h0, 6, "#fff8e1"); }
      [-16, -6, 4, 14, -10, 0, 10].forEach(function (cx, i) { circ(x, cx, -20 - (i > 3 ? 8 : 0), 9, i % 2 ? "#fff8e1" : "#ffecb3"); });
      x.save(); x.beginPath(); x.moveTo(-26, -18); x.lineTo(26, -18); x.lineTo(20, 40); x.lineTo(-20, 40); x.closePath(); x.clip(); x.fillStyle = "#fff"; x.fillRect(-30, -20, 60, 62);
      x.fillStyle = "#e53935"; for (var k = -3; k <= 3; k += 2) { x.beginPath(); x.moveTo(k * 7 - 3.5, -20); x.lineTo(k * 7 + 3.5, -20); x.lineTo(k * 6 + 3, 42); x.lineTo(k * 6 - 3, 42); x.fill(); } x.restore();
    } },
    claquete: { nome: "Claquete", cat: "adulto", f: function (x, t) {
      var c = (t % 2) / 2, a = c < 0.15 ? -0.5 * (1 - c / 0.15) : c < 0.25 ? 0 : -0.5 * Math.min(1, (c - 0.25) / 0.5);
      x.fillStyle = "#23262f"; x.fillRect(-34, -10, 68, 44); x.fillStyle = "#fff"; x.fillRect(-28, 2, 56, 2); x.fillRect(-28, 14, 56, 2);
      x.save(); x.translate(-34, -10); x.rotate(a); x.fillStyle = "#23262f"; x.fillRect(0, -12, 68, 12); x.fillStyle = "#fff"; for (var i = 0; i < 4; i++) { x.beginPath(); x.moveTo(6 + i * 16, -12); x.lineTo(14 + i * 16, -12); x.lineTo(8 + i * 16, 0); x.lineTo(0 + i * 16, 0); x.fill(); } x.restore();
      if (c > 0.15 && c < 0.3) for (var k = 0; k < 4; k++) brilho(x, -30 + k * 20, -24, 5, 1, "#ffd23f");
    } },
    haltere: { nome: "Haltere", cat: "adulto", f: function (x, t) {
      var u = Math.sin(t * 3) * 10; x.translate(0, u); x.fillStyle = "#8a93a8"; x.fillRect(-30, -3, 60, 6);
      [-1, 1].forEach(function (s) { x.fillStyle = "#2b2f3a"; x.fillRect(s * 22 - 4, -18, 8, 36); x.fillRect(s * 32 - 4, -13, 8, 26); });
      if (u < -8) for (var i = 0; i < 2; i++) brilho(x, -40 + i * 80, -24, 6, 1, "#ffd23f");
    } },
    bolabasq: { nome: "Bola de basquete", cat: "adulto", f: function (x, t) {
      var c = t % 1, y = -Math.abs(Math.cos(c * Math.PI)) * 18; elip(x, 0, 36, 18, 3.5, "rgba(0,0,0,.25)"); x.translate(0, y); x.rotate(t);
      circB(x, 0, 0, 27, "#e8743a"); x.strokeStyle = "#3a1d0a"; x.lineWidth = 2; x.beginPath(); x.moveTo(-27, 0); x.lineTo(27, 0); x.moveTo(0, -27); x.lineTo(0, 27); x.stroke();
      x.beginPath(); x.arc(-34, 0, 22, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(34, 0, 22, Math.PI - 0.9, Math.PI + 0.9); x.stroke();
    } },
    carro: { nome: "Carrinho de corrida", cat: "adulto", f: function (x, t) {
      x.translate(Math.sin(t * 2) * 4, Math.abs(Math.sin(t * 12)) * -1.5);
      for (var i = 0; i < 3; i++) { x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 2; var q = (t * 3 + i / 3) % 1; x.beginPath(); x.moveTo(-40 - q * 10, -2 + i * 8); x.lineTo(-30 - q * 10 + 10, -2 + i * 8); x.stroke(); }
      x.fillStyle = "#e53935"; x.beginPath(); x.moveTo(-38, 10); x.lineTo(-34, -4); x.lineTo(-12, -6); x.lineTo(-2, -18); x.lineTo(16, -18); x.lineTo(24, -6); x.lineTo(40, -2); x.lineTo(40, 10); x.closePath(); x.fill(); borda(x);
      x.fillStyle = "#4fc3f7"; x.beginPath(); x.moveTo(0, -15); x.lineTo(14, -15); x.lineTo(19, -7); x.lineTo(-6, -7); x.fill(); x.fillStyle = "#fff"; x.fillRect(-26, -2, 10, 8);
      [-22, 26].forEach(function (cx) { x.save(); x.translate(cx, 12); x.rotate(t * 12); circ(x, 0, 0, 9, "#1d1d1d"); circ(x, 0, 0, 4, "#bbb"); x.fillStyle = "#1d1d1d"; x.fillRect(-1, -4, 2, 8); x.restore(); });
    } },
    pandeiro: { nome: "Pandeiro", cat: "adulto", f: function (x, t) {
      var c = (t % 0.9) / 0.9, k = c < 0.2 ? Math.sin(c / 0.2 * Math.PI) : 0; x.rotate(-0.2 + k * 0.15); x.scale(1 + k * 0.05, 1 + k * 0.05);
      circ(x, 0, 0, 32, "#d9a12c"); circ(x, 0, 0, 26, "#fff3e0"); x.strokeStyle = "#a8761a"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 32, 0, TAU); x.stroke();
      for (var i = 0; i < 6; i++) { var a = TAU * i / 6; x.save(); x.translate(Math.cos(a) * 29, Math.sin(a) * 29); x.rotate(a); x.fillStyle = "#c0c6d4"; x.fillRect(-3, -6 + k * 2, 6, 3); x.fillRect(-3, 3 - k * 2, 6, 3); x.restore(); }
      if (k > 0.5) for (var j = 0; j < 3; j++) brilho(x, Math.cos(j * 2) * 40, Math.sin(j * 2) * 40, 6, k, "#ffd23f");
    } },
    chapeu: { nome: "Chapéu de vaqueiro", cat: "adulto", f: function (x, t) {
      x.rotate(Math.sin(t * 2) * 0.1); x.translate(0, Math.sin(t * 2) * 2);
      elip(x, 0, 12, 46, 11, "#8a5a2b"); x.fillStyle = "#a86f35"; x.beginPath(); x.moveTo(-22, 10); x.quadraticCurveTo(-26, -26, -10, -24); x.quadraticCurveTo(0, -18, 10, -24); x.quadraticCurveTo(26, -26, 22, 10); x.closePath(); x.fill(); borda(x, "#5a3a1a");
      x.fillStyle = "#3a2214"; x.fillRect(-22, 0, 44, 6); estrelaPath(x, 0, 3, 5, 5, 0.45); x.fillStyle = "#ffd23f"; x.fill();
    } },
    arvore: { nome: "Árvore de Natal", cat: "objeto", f: function (x, t) {
      x.fillStyle = "#7a4a2a"; x.fillRect(-6, 30, 12, 12);
      [[-34, 34, 0, 6], [-28, 14, 0, -14], [-20, -6, 0, -32]].forEach(function (c) { x.fillStyle = "#2e9e5a"; x.beginPath(); x.moveTo(c[0], c[1]); x.lineTo(-c[0], c[1]); x.lineTo(c[2], c[3] - 10); x.fill(); });
      [[-18, 26], [14, 24], [-10, 8], [12, 4], [0, -12], [-22, 30], [24, 30], [4, 18]].forEach(function (p, i) { var on = Math.sin(t * 3 + i * 1.3) > 0; circ(x, p[0], p[1], 3.6, on ? ["#ff4f7b", "#ffd23f", "#4fc3f7"][i % 3] : "rgba(255,255,255,.35)"); });
      x.save(); x.translate(0, -46); x.rotate(Math.sin(t) * 0.1); x.shadowColor = "#ffd23f"; x.shadowBlur = 8 + 6 * Math.sin(t * 4); estrelaPath(x, 0, 0, 10, 5, 0.45); x.fillStyle = "#ffd23f"; x.fill(); x.restore();
    } }
  };

  /* ===== EFEITOS DE TELA ===== */
  function cor(cs, i) { return [cs[2] || "#ffd23f", "#ff6b8a", "#4fc3f7", "#ffd23f", "#ffffff", "#b388ff", "#5ccf7a"][i % 7]; }
  function rolar(v) { return v - Math.floor(v); }
  var EFEITOS = {
    confete: { nome: "Confete caindo", camada: "frente", f: function (x, W, H, t, cs) {
      var m = Math.min(W, H); for (var i = 0; i < 70; i++) { var y = (rolar(h(i + 7) + t * (0.07 + h(i) * 0.1)) * 1.15 - 0.08) * H, xx = h(i + 3) * W + Math.sin(t * 1.5 + i) * m * 0.03;
        x.save(); x.translate(xx, y); x.rotate(t * (2 + h(i + 9) * 3) + i); x.scale(1, Math.cos(t * 4 + i)); x.fillStyle = cor(cs, i); x.fillRect(-m * 0.008, -m * 0.014, m * 0.016, m * 0.028); x.restore(); } } },
    luzes: { nome: "Luzes piscando", camada: "fundo", f: function (x, W, H, t, cs) {
      var m = Math.min(W, H); x.save(); x.globalCompositeOperation = "screen";
      for (var i = 0; i < 26; i++) { var cx = h(i + 1) * W, cy = h(i + 2) * H, r = m * (0.02 + h(i + 3) * 0.06), a = 0.15 + 0.4 * (0.5 + 0.5 * Math.sin(t * (1.5 + h(i) * 2) + i * 2)), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, i % 3 ? cs[2] || "#ffd23f" : "#ffffff"); g.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = a; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill(); }
      x.restore(); } },
    cordao: { nome: "Cordão de luzes", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); [0.05, 0.11].forEach(function (b, k) {
        x.strokeStyle = "rgba(40,30,20,.55)"; x.lineWidth = Math.max(1, m * 0.003); x.beginPath(); for (var i = 0; i <= 40; i++) { var u = i / 40; x.lineTo(u * W, H * b + Math.sin(u * Math.PI * (k ? 3 : 2)) * H * 0.03); } x.stroke();
        for (var j = 0; j < 14; j++) { var u2 = (j + 0.5 + k * 0.5) / 14, bx = u2 * W, by = H * b + Math.sin(u2 * Math.PI * (k ? 3 : 2)) * H * 0.03 + m * 0.012, on = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 3 + j * 1.7 + k)), c = ["#ffd23f", "#ff6b8a", "#7ad7ff", "#5ccf7a"][(j + k) % 4], g = x.createRadialGradient(bx, by, 0, bx, by, m * 0.035);
          g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = on * 0.8; x.fillStyle = g; x.beginPath(); x.arc(bx, by, m * 0.035, 0, TAU); x.fill(); x.globalAlpha = 1; circ(x, bx, by, m * 0.008, c); }
      }); } },
    borboletas: { nome: "Borboletas voando", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 5; i++) { var u = rolar(h(i) + t * 0.045 * (1 + h(i + 1))), px = (u * 1.3 - 0.15) * W, py = H * (0.12 + 0.76 * h(i + 2)) + Math.sin(t * 2 + i) * m * 0.05, s = m * (0.05 + h(i + 4) * 0.03) / 70;
        x.save(); x.translate(px, py); x.scale(s, s); x.rotate(0.25 + Math.sin(t * 2 + i) * 0.2); asaBorboleta(x, 0.3 + 0.7 * Math.abs(Math.cos(t * 9 + i)), ["#ff7ab6", "#ffd23f", "#7ad7ff", "#b388ff", "#ff9a3c"][i], "#ffffff"); elip(x, 0, 2, 3.5, 18, "#3a2a4a"); x.restore(); } } },
    baloes: { nome: "Balões subindo", camada: "frente", f: function (x, W, H, t, cs) {
      var m = Math.min(W, H); for (var i = 0; i < 8; i++) { var u = rolar(h(i + 11) + t * (0.05 + h(i) * 0.04)), py = (1.15 - u * 1.4) * H, px = h(i + 12) * W + Math.sin(t + i) * m * 0.03, r = m * (0.045 + h(i + 13) * 0.03);
        x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = Math.max(1, m * 0.002); x.beginPath(); x.moveTo(px, py + r * 1.2); x.quadraticCurveTo(px - r * 0.4, py + r * 2.2, px, py + r * 3.4); x.stroke();
        x.globalAlpha = 0.9; elip(x, px, py, r, r * 1.2, cor(cs, i)); x.globalAlpha = 0.45; elip(x, px - r * 0.35, py - r * 0.4, r * 0.22, r * 0.34, "#fff", 0.4); x.globalAlpha = 1; } } },
    estrelas: { nome: "Estrelinhas brilhando", camada: "fundo", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 34; i++) brilho(x, h(i + 21) * W, h(i + 22) * H, m * (0.008 + h(i + 23) * 0.018), Math.max(0, Math.sin(t * (1.2 + h(i) * 2) + i * 2.3)), i % 4 ? "#ffffff" : "#ffe08a"); } },
    glitter: { nome: "Brilho dourado", camada: "fundo", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 70; i++) { var a = Math.max(0, Math.sin(t * (2 + h(i) * 3) + i * 1.9)); x.globalAlpha = a; circ(x, h(i + 31) * W, rolar(h(i + 32) + t * 0.01) * H, m * (0.002 + h(i + 33) * 0.004), i % 3 ? "#ffe08a" : "#ffffff"); }
      x.globalAlpha = 1; for (var j = 0; j < 8; j++) brilho(x, h(j + 41) * W, h(j + 42) * H, m * 0.02, Math.max(0, Math.sin(t * 1.6 + j * 2.1)), "#fff3c4"); } },
    neve: { nome: "Neve caindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 90; i++) { var y = rolar(h(i + 51) + t * (0.03 + h(i) * 0.05)) * H, xx = h(i + 52) * W + Math.sin(t + i) * m * 0.02; x.globalAlpha = 0.5 + h(i + 2) * 0.5; circ(x, xx, y, m * (0.003 + h(i + 53) * 0.006), "#fff"); } x.globalAlpha = 1; } },
    petalas: { nome: "Pétalas caindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 36; i++) { var y = (rolar(h(i + 61) + t * (0.04 + h(i) * 0.05)) * 1.1 - 0.05) * H, xx = h(i + 62) * W + Math.sin(t * 1.3 + i) * m * 0.05;
        x.save(); x.translate(xx, y); x.rotate(t * 1.5 + i); x.scale(1, 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i))); x.globalAlpha = 0.85; elip(x, 0, 0, m * 0.016, m * 0.01, i % 3 ? "#ff9ab8" : "#ffd1dc"); x.restore(); } } },
    coracoes: { nome: "Corações subindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 14; i++) { var u = rolar(h(i + 71) + t * (0.06 + h(i) * 0.05)), py = (1.05 - u * 1.15) * H, px = h(i + 72) * W + Math.sin(t * 2 + i) * m * 0.03;
        x.globalAlpha = Math.min(1, u * 4) * (1 - u) * 1.2; coracaoPath(x, px, py, m * (0.018 + h(i + 73) * 0.02)); x.fillStyle = i % 2 ? "#ff4f7b" : "#ff9ab8"; x.fill(); } x.globalAlpha = 1; } },
    fogos: { nome: "Fogos de artifício", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); x.save(); x.globalCompositeOperation = "lighter";
      for (var k = 0; k < 4; k++) { var P = 2.4, c = rolar((t + k * 0.6) / P) * P, n = Math.floor((t + k * 0.6) / P), cx = W * (0.15 + 0.7 * h(n * 4 + k)), cy = H * (0.12 + 0.35 * h(n * 4 + k + 1)), col = ["#ffd23f", "#ff6b8a", "#7ad7ff", "#b388ff"][k];
        if (c > 1.6) continue; var r = m * 0.16 * (1 - Math.pow(1 - c / 1.6, 3)), a = 1 - c / 1.6;
        for (var i = 0; i < 22; i++) { var ang = TAU * i / 22, px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r + c * c * m * 0.03; x.globalAlpha = a; circ(x, px, py, m * 0.006, col); x.globalAlpha = a * 0.4; circ(x, cx + Math.cos(ang) * r * 0.8, cy + Math.sin(ang) * r * 0.8 + c * c * m * 0.025, m * 0.004, col); } }
      x.restore(); } },
    bolhas: { nome: "Bolhas subindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 24; i++) { var u = rolar(h(i + 81) + t * (0.05 + h(i) * 0.05)), py = (1.05 - u * 1.15) * H, px = h(i + 82) * W + Math.sin(t * 2 + i) * m * 0.02, r = m * (0.01 + h(i + 83) * 0.025);
        x.globalAlpha = 0.6; x.strokeStyle = "#ffffff"; x.lineWidth = Math.max(1, m * 0.002); x.beginPath(); x.arc(px, py, r, 0, TAU); x.stroke(); x.globalAlpha = 0.4; circ(x, px - r * 0.35, py - r * 0.35, r * 0.25, "#fff"); } x.globalAlpha = 1; } },
    folhas: { nome: "Folhas caindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 22; i++) { var y = (rolar(h(i + 91) + t * (0.04 + h(i) * 0.04)) * 1.1 - 0.05) * H, xx = h(i + 92) * W + Math.sin(t * 1.2 + i) * m * 0.06;
        x.save(); x.translate(xx, y); x.rotate(t * 1.2 + i); x.globalAlpha = 0.9; x.fillStyle = ["#5ccf7a", "#3aa95a", "#ffb547", "#e8743a"][i % 4]; var s = m * (0.02 + h(i + 93) * 0.015); x.beginPath(); x.moveTo(-s, 0); x.quadraticCurveTo(0, -s * 0.7, s, 0); x.quadraticCurveTo(0, s * 0.7, -s, 0); x.fill(); x.restore(); } } },
    equalizador: { nome: "Equalizador", camada: "frente", f: function (x, W, H, t, cs) {
      var m = Math.min(W, H), n = 24, bw = W / n; for (var i = 0; i < n; i++) { var v = 0.25 + 0.75 * Math.abs(Math.sin(t * (3 + h(i) * 4) + i * 0.7)) * (0.5 + 0.5 * Math.sin(t * 7.5 + i)), hh = v * H * 0.14;
        var g = x.createLinearGradient(0, H - hh, 0, H); g.addColorStop(0, cs[2] || "#00f0ff"); g.addColorStop(1, "#ff2fb9"); x.globalAlpha = 0.75; x.fillStyle = g; x.fillRect(i * bw + bw * 0.15, H - hh, bw * 0.7, hh); } x.globalAlpha = 1; void m; } },
    notas: { nome: "Notas flutuando", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 12; i++) { var u = rolar(h(i + 101) + t * (0.05 + h(i) * 0.05)), py = (1.05 - u * 1.15) * H, px = h(i + 102) * W + Math.sin(t * 2 + i) * m * 0.04, s = m * (0.05 + h(i + 103) * 0.03) / 50;
        x.save(); x.globalAlpha = Math.min(1, u * 5) * (1 - u); x.translate(px, py); x.scale(s, s); x.rotate(Math.sin(t + i) * 0.3); var c = ["#ff4f7b", "#4fc3f7", "#ffd23f", "#b388ff"][i % 4]; elip(x, 0, 18, 9, 7, c, -0.4); x.fillStyle = c; x.fillRect(6, -22, 4, 40); x.restore(); } } },
    pixels: { nome: "Pixels caindo", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H), q = Math.max(3, Math.round(m * 0.014)); for (var i = 0; i < 60; i++) { var y = Math.floor(rolar(h(i + 111) + t * (0.05 + h(i) * 0.07)) * H / q) * q, xx = Math.floor(h(i + 112) * W / q) * q;
        x.globalAlpha = 0.85; x.fillStyle = ["#00f0ff", "#ff2fb9", "#ffd23f", "#5ccf7a", "#b388ff"][i % 5]; x.fillRect(xx, y, q, q); x.globalAlpha = 0.35; x.fillRect(xx, y - q, q, q); } x.globalAlpha = 1; } },
    holofotes: { nome: "Holofotes", camada: "fundo", f: function (x, W, H, t, cs) {
      x.save(); x.globalCompositeOperation = "screen"; for (var i = 0; i < 4; i++) { var bx = W * (0.1 + i * 0.27), ang = Math.sin(t * (0.6 + i * 0.15) + i * 1.7) * 0.45, L = H * 1.2, w0 = Math.min(W, H) * 0.2;
        x.save(); x.translate(bx, -10); x.rotate(ang); var g = x.createLinearGradient(0, 0, 0, L); g.addColorStop(0, i % 2 ? (cs[2] || "#fff") : "#ffffff"); g.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = 0.22; x.fillStyle = g; x.beginPath(); x.moveTo(-w0 * 0.08, 0); x.lineTo(w0 * 0.08, 0); x.lineTo(w0, L); x.lineTo(-w0, L); x.fill(); x.restore(); } x.restore(); } },
    laser: { nome: "Laser", camada: "fundo", f: function (x, W, H, t) {
      x.save(); x.globalCompositeOperation = "lighter"; var m = Math.min(W, H); for (var i = 0; i < 9; i++) { var ox = i % 2 ? 0 : W, oy = H * 0.15, ang = (i % 2 ? 0.2 : Math.PI - 0.2) + Math.sin(t * (1 + h(i)) + i) * 0.5 * (i % 2 ? 1 : -1);
        x.strokeStyle = ["#00f0ff", "#ff2fb9", "#5ccf7a"][i % 3]; x.globalAlpha = 0.35 + 0.3 * Math.sin(t * 6 + i); x.lineWidth = Math.max(1, m * 0.003); x.beginPath(); x.moveTo(ox, oy); x.lineTo(ox + Math.cos(ang) * W * 1.5, oy + Math.sin(ang) * W * 1.5); x.stroke(); } x.restore(); } },
    flashes: { nome: "Flashes de câmera", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 6; i++) { var P = 1.6 + h(i) * 1.6, c = rolar((t + h(i + 1) * P) / P) * P; if (c > 0.18) continue; var a = 1 - c / 0.18, px = h(i + 121 + Math.floor((t + h(i + 1) * P) / P)) * W, py = H * (0.2 + 0.6 * h(i + 122));
        var g = x.createRadialGradient(px, py, 0, px, py, m * 0.12); g.addColorStop(0, "rgba(255,255,255," + a + ")"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(px, py, m * 0.12, 0, TAU); x.fill(); brilho(x, px, py, m * 0.05, a, "#fff"); } } },
    fumaca: { nome: "Fumaça de palco", camada: "fundo", f: function (x, W, H, t) {
      var m = Math.min(W, H); for (var i = 0; i < 10; i++) { var px = rolar(h(i + 131) + t * 0.02 * (h(i) - 0.5)) * W, py = H * (0.65 + 0.35 * h(i + 132)) + Math.sin(t * 0.5 + i) * m * 0.03, r = m * (0.2 + h(i + 133) * 0.2), g = x.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, "rgba(220,220,235,.10)"); g.addColorStop(1, "rgba(220,220,235,0)"); x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); } } },
    bandeirinhas: { nome: "Bandeirinhas", camada: "frente", f: function (x, W, H, t) {
      var m = Math.min(W, H); [0.04, 0.12].forEach(function (b, k) { var n = 11, pts = [];
        for (var i = 0; i <= n; i++) { var u = i / n; pts.push([u * W, H * b + Math.sin(u * Math.PI) * H * 0.04]); }
        x.strokeStyle = "rgba(60,40,20,.6)"; x.lineWidth = Math.max(1, m * 0.003); x.beginPath(); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.stroke();
        for (var j = 0; j < n; j++) { var a = pts[j], c = pts[j + 1], mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, sw = Math.sin(t * 2.5 + j + k) * m * 0.008;
          x.fillStyle = ["#e53935", "#ffd23f", "#1e88e5", "#5ccf7a", "#ff7ab6", "#ff9a3c"][(j + k * 2) % 6]; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(c[0], c[1]); x.lineTo(mx + sw, my + m * 0.06); x.closePath(); x.fill(); }
      }); } }
  };

  /* miniatura de um item (para os botões) */
  function mini(id, px) {
    var c = document.createElement("canvas"); c.width = c.height = px || 64; var x = c.getContext("2d"), it = ITENS[id];
    x.translate(c.width / 2, c.height / 2); var s = c.width / 110; x.scale(s, s); try { it.f(x, 0.4); } catch (e) { } return c.toDataURL();
  }
  function miniEfeito(id, px) {
    var c = document.createElement("canvas"); c.width = c.height = px || 64; var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, "#2b2346"); g.addColorStop(1, "#141826"); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    try { EFEITOS[id].f(x, c.width, c.height, 1.3, ["#141826", "#2b2346", "#ffd23f"]); } catch (e) { } return c.toDataURL();
  }
  /* desenha um item na tela: (fx, fy) em fração, tamanho s em fração do menor lado */
  function desenharItem(x, it, W, H, t) {
    var def = ITENS[it.id]; if (!def) return; var m = Math.min(W, H), px = (it.s || 0.22) * m;
    x.save(); x.translate(it.x * W, it.y * H); if (it.esp) x.scale(-1, 1); x.scale(px / 100, px / 100); try { def.f(x, t + (it.f || 0)); } catch (e) { } x.restore();
  }
  window.BWConviteAnim = { ITENS: ITENS, EFEITOS: EFEITOS, mini: mini, miniEfeito: miniEfeito, desenharItem: desenharItem };
})();
