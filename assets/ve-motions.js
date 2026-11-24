/* MOTIONS DO BW REELS PRO no EDITOR DE VÍDEO (24/11/2026, Claude). Pedido do dono: "os textos animados, gráficos e etc do BW REELS PRO
   disponíveis no editor de vídeo, como textos motions e elementos de cada categoria… de forma leve, com render rápido e bem otimizado".
   Por que é leve: o BW Reels monta cada quadro em HTML (foreignObject → imagem), o que é pesado dentro de uma linha do tempo. Aqui cada
   motion é DESENHO DIRETO NO CANVAS do editor (as mesmas ideias e os mesmos nomes do Reels): nada de DOM por quadro, nada de imagem
   intermediária, nenhum arquivo para baixar. Cada quadro depende só do tempo (t) e dos textos do item — a prévia, o arraste da agulha e a
   exportação desenham a mesma coisa, no mesmo passo que o resto do vídeo. Este arquivo não acessa a rede nem guarda nada.
   Motion novo = UM item em M: {id, nome, cat, ic, dur, y (posição padrão, fração da altura a partir do meio), campos:[[chave, rótulo, padrão]], f(x, o)}.
   o = {W, H, S (lado menor), t (segundos desde o começo do item), d (duração), D (textos), c1, c2 (cores)} — desenhar com o centro em (0, 0). */
(function () {
  "use strict";
  var FONTE = '"Inter","Segoe UI",Roboto,Arial,sans-serif';
  function cl(v, a, b) { return v < a ? a : v > b ? b : v; }
  function seg(t, a, b) { return b <= a ? (t >= b ? 1 : 0) : cl((t - a) / (b - a), 0, 1); }
  function eo(k) { return 1 - Math.pow(1 - k, 3); }
  function eio(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function back(k) { var c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); }
  function fonte(x, px, peso) { x.font = (peso || 800) + " " + Math.max(6, Math.round(px)) + "px " + FONTE; }
  function rr(x, a, b, w, h, r) { r = Math.min(r, w / 2, h / 2); x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  /* texto que cabe: diminui a letra até caber na largura */
  function caber(x, txt, max, px, peso) { fonte(x, px, peso); var w = x.measureText(txt).width; if (w > max) { px = px * max / w; fonte(x, px, peso); } return px; }
  function num(v) { var s = String(v == null ? "" : v).trim(), m = s.match(/-?[\d.,]+/); if (!m) return { n: 0, pre: s, pos: "", dec: 0 };
    var raw = m[0], n; if (raw.indexOf(",") >= 0 || /^-?\d{1,3}(\.\d{3})+$/.test(raw)) n = parseFloat(raw.replace(/\./g, "").replace(",", ".")); else n = parseFloat(raw); /* ponto como milhar só com vírgula (regra 174) */
    var dec = raw.indexOf(",") >= 0 ? (raw.split(",")[1] || "").length : (/^-?\d{1,3}(\.\d{3})+$/.test(raw) ? 0 : (raw.split(".")[1] || "").length); return { n: isNaN(n) ? 0 : n, pre: s.slice(0, m.index), pos: s.slice(m.index + raw.length), dec: dec }; }
  function fmtN(v, dec) { return v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function lista(s) { return String(s || "").split(/\n|;|\|/).map(function (q) { return q.trim(); }).filter(Boolean); }
  function sombra(x, S, k) { x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = S * (k || 0.02); x.shadowOffsetY = S * (k || 0.02) * 0.4; }
  function semSombra(x) { x.shadowColor = "transparent"; x.shadowBlur = 0; x.shadowOffsetY = 0; }
  function hexA(c, a) { c = String(c || "#ffffff"); if (c[0] !== "#") return c; if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]; var n = parseInt(c.slice(1, 7), 16); return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }

  var M = [];
  function mo(d) { M.push(d); }

  /* ===== TEXTOS ANIMADOS ===== */
  mo({ id: "impacto", nome: "Título de impacto", cat: "texto", ic: "💥", dur: 3, campos: [["t", "Título (use *palavra* para destacar)", "Isso muda *TUDO*"]],
    f: function (x, o) { var ws = String(o.D.t || "").split(/\s+/).filter(Boolean), S = o.S, lin = [], atual = [], px = S * 0.12, maxW = o.W * 0.86; fonte(x, px, 900);
      ws.forEach(function (w) { var tst = atual.concat([w]).join(" ").replace(/\*/g, ""); if (atual.length && x.measureText(tst).width > maxW) { lin.push(atual); atual = [w]; } else atual.push(w); }); if (atual.length) lin.push(atual);
      var lh = px * 1.12, y0 = -(lin.length - 1) * lh / 2, idx = 0; x.textBaseline = "middle"; sombra(x, S);
      lin.forEach(function (l, li) { var txt = l.join(" ").replace(/\*/g, ""), xx = -x.measureText(txt).width / 2;
        l.forEach(function (w) { var dest = /^\*.*\*$/.test(w) || /\*/.test(w), wd = w.replace(/\*/g, ""), k = back(seg(o.t, idx * 0.12, idx * 0.12 + 0.35)), ww = x.measureText(wd + " ").width; idx++;
          if (k > 0) { x.save(); x.globalAlpha *= cl(k, 0, 1); x.translate(xx + x.measureText(wd).width / 2, y0 + li * lh); x.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
            if (dest) { semSombra(x); var bw = x.measureText(wd).width; x.fillStyle = o.c1; rr(x, -bw / 2 - px * 0.12, -px * 0.6, bw + px * 0.24, px * 1.2, px * 0.12); x.fill(); x.fillStyle = "#0B0E14"; }
            else x.fillStyle = "#fff"; x.textAlign = "center"; x.fillText(wd, 0, px * 0.04); x.restore(); }
          xx += ww; }); }); } });
  mo({ id: "maquina", nome: "Máquina de escrever", cat: "texto", ic: "⌨", dur: 4, campos: [["t", "Texto", "Toda grande história começa com um clique."]],
    f: function (x, o) { var s = String(o.D.t || ""), n = Math.floor(cl(o.t / Math.max(0.6, o.d * 0.55), 0, 1) * s.length), S = o.S, px = caber(x, s, o.W * 0.86, S * 0.075, 700), vis = s.slice(0, n);
      x.textBaseline = "middle"; x.textAlign = "left"; var w = x.measureText(s).width; sombra(x, S); x.fillStyle = "#fff"; x.fillText(vis, -w / 2, 0); semSombra(x);
      if (Math.floor(o.t * 2.2) % 2 === 0 || n < s.length) { x.fillStyle = o.c1; x.fillRect(-w / 2 + x.measureText(vis).width + px * 0.08, -px * 0.55, px * 0.09, px * 1.1); } } });
  mo({ id: "legenda", nome: "Legenda que acende", cat: "texto", ic: "💬", dur: 4, y: 0.3, campos: [["t", "Frase", "Cada palavra acende na hora certa"]],
    f: function (x, o) { var ws = String(o.D.t || "").split(/\s+/).filter(Boolean), S = o.S, px = caber(x, ws.join(" "), o.W * 0.84, S * 0.07, 900), at = Math.floor(o.t / Math.max(0.15, o.d * 0.85 / Math.max(1, ws.length)));
      var w = x.measureText(ws.join(" ")).width, xx = -w / 2; x.textBaseline = "middle"; x.textAlign = "left"; x.lineJoin = "round";
      ws.forEach(function (p, i) { var on = i === at, ww = x.measureText(p).width; x.lineWidth = px * 0.16; x.strokeStyle = "rgba(0,0,0,.85)"; x.strokeText(p, xx, 0);
        x.fillStyle = on ? o.c1 : i < at ? "#fff" : "rgba(255,255,255,.55)"; if (on) { x.save(); x.translate(xx + ww / 2, 0); x.scale(1.08, 1.08); x.fillText(p, -ww / 2, 0); x.restore(); } else x.fillText(p, xx, 0); xx += ww + x.measureText(" ").width; }); } });
  mo({ id: "marca", nome: "Marca-texto", cat: "texto", ic: "🖍", dur: 3, campos: [["t", "Texto", "O detalhe que faz a diferença"]],
    f: function (x, o) { var s = String(o.D.t || ""), S = o.S, px = caber(x, s, o.W * 0.84, S * 0.08, 800), w = x.measureText(s).width, k = eio(seg(o.t, 0.25, 1));
      x.fillStyle = hexA(o.c1, 0.85); x.save(); x.translate(-w / 2 - px * 0.15, 0); x.rotate(-0.015); x.fillRect(0, -px * 0.1, (w + px * 0.3) * k, px * 0.62); x.restore();
      x.textBaseline = "middle"; x.textAlign = "center"; x.fillStyle = "#fff"; sombra(x, S, 0.012); x.globalAlpha *= seg(o.t, 0, 0.25); x.fillText(s, 0, 0); } });
  mo({ id: "citacao", nome: "Citação", cat: "texto", ic: "❝", dur: 4, campos: [["t", "Frase", "Fazer bem feito é o melhor marketing."], ["a", "Quem disse (opcional)", ""]],
    f: function (x, o) { var S = o.S, k = eo(seg(o.t, 0, 0.6)), s = String(o.D.t || ""); x.globalAlpha *= k; fonte(x, S * 0.3, 900); x.fillStyle = hexA(o.c1, 0.9); x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("“", 0, -S * 0.2 - (1 - k) * S * 0.05);
      var px = caber(x, s, o.W * 0.82, S * 0.06, 600); x.fillStyle = "#fff"; sombra(x, S, 0.012); x.font = "italic " + x.font; x.fillText(s, 0, S * 0.02);
      if (o.D.a) { semSombra(x); fonte(x, px * 0.6, 700); x.fillStyle = o.c1; x.globalAlpha *= seg(o.t, 0.5, 1); x.fillText("— " + o.D.a, 0, S * 0.02 + px * 1.3); } } });
  mo({ id: "contagem", nome: "Contagem 3-2-1", cat: "texto", ic: "⏱", dur: 3.2, campos: [["n", "Contar a partir de", "3"], ["fim", "Palavra no fim", "JÁ!"]],
    f: function (x, o) { var n = Math.max(1, Math.min(10, parseInt(o.D.n, 10) || 3)), passo = o.d / (n + 1), i = Math.floor(o.t / passo), r = (o.t - i * passo) / passo, S = o.S;
      var s = i < n ? String(n - i) : String(o.D.fim || "JÁ!"), k = back(cl(r * 2.2, 0, 1)); x.save(); x.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k); x.globalAlpha *= cl((1 - r) * 3, 0, 1);
      x.strokeStyle = hexA(o.c1, 0.9); x.lineWidth = S * 0.02; x.beginPath(); x.arc(0, 0, S * 0.26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - r)); x.stroke();
      caber(x, s, S * 0.4, S * 0.26, 900); x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; sombra(x, S); x.fillText(s, 0, S * 0.01); x.restore(); } });

  /* ===== GRÁFICOS E NÚMEROS ===== */
  mo({ id: "numero", nome: "Número contando", cat: "graf", ic: "🔢", dur: 3, campos: [["v", "Número", "1.500"], ["rot", "Legenda", "pessoas no evento"], ["fonte", "Fonte (de onde veio)", ""]],
    f: function (x, o) { var p = num(o.D.v), k = eo(seg(o.t, 0.1, Math.min(1.8, o.d * 0.7))), S = o.S, s = p.pre + fmtN(p.n * k, p.dec) + p.pos; x.textAlign = "center"; x.textBaseline = "middle";
      caber(x, p.pre + fmtN(p.n, p.dec) + p.pos, o.W * 0.86, S * 0.2, 900); x.fillStyle = o.c1; sombra(x, S); x.fillText(s, 0, -S * 0.03); semSombra(x);
      if (o.D.rot) { caber(x, o.D.rot, o.W * 0.8, S * 0.055, 700); x.fillStyle = "#fff"; x.globalAlpha *= seg(o.t, 0.3, 0.8); x.fillText(o.D.rot, 0, S * 0.11); }
      if (o.D.fonte) { fonte(x, S * 0.028, 500); x.fillStyle = "rgba(255,255,255,.6)"; x.fillText("Fonte: " + o.D.fonte, 0, S * 0.18); } } });
  mo({ id: "barras", nome: "Gráfico de barras", cat: "graf", ic: "📊", dur: 4, campos: [["itens", "Itens (nome: valor, um por linha)", "2023: 40\n2024: 65\n2025: 90"], ["tit", "Título", "Crescimento"], ["fonte", "Fonte", "dados próprios"]],
    f: function (x, o) { var it = lista(o.D.itens).map(function (q) { var a = q.split(":"); return { n: a[0].trim(), v: num(a.slice(1).join(":")).n }; }), S = o.S, w = Math.min(o.W * 0.86, S * 1.1), h = S * 0.5, mx = Math.max.apply(null, it.map(function (q) { return q.v; }).concat([1]));
      x.textAlign = "center"; x.textBaseline = "middle"; if (o.D.tit) { caber(x, o.D.tit, w, S * 0.06, 800); x.fillStyle = "#fff"; x.fillText(o.D.tit, 0, -h / 2 - S * 0.09); }
      var bw = w / Math.max(1, it.length) * 0.62, g = w / Math.max(1, it.length);
      it.forEach(function (q, i) { var k = eo(seg(o.t, 0.2 + i * 0.18, 1 + i * 0.18)), bh = h * q.v / mx * k, bx = -w / 2 + g * i + (g - bw) / 2;
        var gr = x.createLinearGradient(0, h / 2, 0, h / 2 - bh); gr.addColorStop(0, hexA(o.c1, 0.7)); gr.addColorStop(1, o.c1); x.fillStyle = gr; rr(x, bx, h / 2 - bh, bw, Math.max(1, bh), S * 0.012); x.fill();
        fonte(x, S * 0.04, 800); x.fillStyle = "#fff"; x.fillText(fmtN(q.v * k, 0), bx + bw / 2, h / 2 - bh - S * 0.035); fonte(x, S * 0.035, 600); x.fillStyle = "rgba(255,255,255,.8)"; x.fillText(q.n, bx + bw / 2, h / 2 + S * 0.04); });
      if (o.D.fonte) { fonte(x, S * 0.025, 500); x.fillStyle = "rgba(255,255,255,.55)"; x.fillText("Fonte: " + o.D.fonte, 0, h / 2 + S * 0.1); } } });
  mo({ id: "rosca", nome: "Rosca (porcentagem)", cat: "graf", ic: "🍩", dur: 3, campos: [["v", "Porcentagem", "87%"], ["rot", "Legenda", "dos clientes voltam"], ["fonte", "Fonte", "pesquisa própria"]],
    f: function (x, o) { var p = num(o.D.v), v = cl(p.n, 0, 100), k = eo(seg(o.t, 0.1, 1.6)), S = o.S, R = S * 0.2; x.lineCap = "round"; x.lineWidth = S * 0.045;
      x.strokeStyle = "rgba(255,255,255,.15)"; x.beginPath(); x.arc(0, -S * 0.04, R, 0, Math.PI * 2); x.stroke(); x.strokeStyle = o.c1; x.beginPath(); x.arc(0, -S * 0.04, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v / 100 * k); x.stroke();
      x.textAlign = "center"; x.textBaseline = "middle"; fonte(x, S * 0.1, 900); x.fillStyle = "#fff"; x.fillText(fmtN(v * k, p.dec) + "%", 0, -S * 0.035);
      if (o.D.rot) { caber(x, o.D.rot, o.W * 0.8, S * 0.05, 700); x.fillText(o.D.rot, 0, R + S * 0.06); } if (o.D.fonte) { fonte(x, S * 0.025, 500); x.fillStyle = "rgba(255,255,255,.55)"; x.fillText("Fonte: " + o.D.fonte, 0, R + S * 0.12); } } });
  mo({ id: "medidor", nome: "Medidor", cat: "graf", ic: "🎛", dur: 3, campos: [["v", "Valor (0 a 100)", "78"], ["rot", "Legenda", "nível de satisfação"]],
    f: function (x, o) { var v = cl(num(o.D.v).n, 0, 100), k = back(seg(o.t, 0.2, 1.6)), S = o.S, R = S * 0.24, a0 = Math.PI, a1 = Math.PI * 2; x.lineWidth = S * 0.04; x.lineCap = "round";
      var g = x.createLinearGradient(-R, 0, R, 0); g.addColorStop(0, "#FF5A5A"); g.addColorStop(0.5, "#FFC24A"); g.addColorStop(1, "#2FD08A"); x.strokeStyle = g; x.beginPath(); x.arc(0, S * 0.05, R, a0, a1); x.stroke();
      var an = a0 + Math.PI * v / 100 * k; x.save(); x.translate(0, S * 0.05); x.rotate(an); x.fillStyle = "#fff"; x.beginPath(); x.moveTo(0, -S * 0.012); x.lineTo(R * 0.9, 0); x.lineTo(0, S * 0.012); x.fill(); x.restore();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(0, S * 0.05, S * 0.02, 0, 7); x.fill(); x.textAlign = "center"; x.textBaseline = "middle"; fonte(x, S * 0.08, 900); x.fillText(Math.round(v * cl(k, 0, 1)), 0, S * 0.13);
      if (o.D.rot) { caber(x, o.D.rot, o.W * 0.8, S * 0.045, 700); x.fillStyle = "rgba(255,255,255,.85)"; x.fillText(o.D.rot, 0, S * 0.21); } } });
  mo({ id: "painel", nome: "Painel com linha", cat: "graf", ic: "📈", dur: 4, campos: [["v", "Número", "R$ 48.300"], ["rot", "Legenda", "faturamento do mês"], ["serie", "Pontos da linha", "10, 14, 12, 20, 26, 31"]],
    f: function (x, o) { var S = o.S, w = Math.min(o.W * 0.86, S * 1), h = S * 0.5, ser = String(o.D.serie || "").split(/[,;\s]+/).map(Number).filter(function (n) { return !isNaN(n); }); if (ser.length < 2) ser = [1, 2];
      var k = eo(seg(o.t, 0, 0.5)); x.globalAlpha *= k; x.fillStyle = "rgba(14,18,28,.82)"; rr(x, -w / 2, -h / 2, w, h, S * 0.03); x.fill(); x.strokeStyle = "rgba(255,255,255,.12)"; x.lineWidth = 1; x.stroke();
      var p = num(o.D.v), kn = eo(seg(o.t, 0.3, 1.8)); x.textAlign = "left"; x.textBaseline = "middle"; caber(x, p.pre + fmtN(p.n, p.dec) + p.pos, w * 0.8, S * 0.085, 900); x.fillStyle = "#fff"; x.fillText(p.pre + fmtN(p.n * kn, p.dec) + p.pos, -w / 2 + S * 0.04, -h / 2 + S * 0.08);
      fonte(x, S * 0.032, 600); x.fillStyle = "rgba(255,255,255,.65)"; x.fillText(o.D.rot || "", -w / 2 + S * 0.04, -h / 2 + S * 0.145);
      var mn = Math.min.apply(null, ser), mx = Math.max.apply(null, ser), gx = -w / 2 + S * 0.04, gw = w - S * 0.08, gy = -h / 2 + S * 0.2, gh = h - S * 0.25, kl = eio(seg(o.t, 0.6, 2.2)), nPts = (ser.length - 1) * kl;
      x.strokeStyle = o.c1; x.lineWidth = S * 0.01; x.lineJoin = "round"; x.beginPath();
      for (var i = 0; i <= Math.ceil(nPts); i++) { var j = Math.min(i, nPts), a = Math.floor(j), f = j - a, v = ser[a] + ((ser[a + 1] == null ? ser[a] : ser[a + 1]) - ser[a]) * f, px = gx + gw * j / (ser.length - 1), py = gy + gh - gh * (v - mn) / Math.max(1e-6, mx - mn);
        if (i) x.lineTo(px, py); else x.moveTo(px, py); if (i === Math.ceil(nPts)) { x.stroke(); x.fillStyle = o.c1; x.beginPath(); x.arc(px, py, S * 0.014, 0, 7); x.fill(); } } } });
  mo({ id: "ranking", nome: "Top / ranking", cat: "graf", ic: "🏆", dur: 5, campos: [["tit", "Título", "TOP 3 DO MÊS"], ["itens", "Itens (um por linha)", "Drone 4K\nTelão de LED\nTransmissão ao vivo"]],
    f: function (x, o) { var it = lista(o.D.itens), S = o.S, w = Math.min(o.W * 0.86, S * 1), lh = S * 0.1, tot = it.length * lh, y0 = -tot / 2 + lh / 2 + S * 0.04; x.textBaseline = "middle";
      if (o.D.tit) { x.textAlign = "center"; caber(x, o.D.tit, w, S * 0.065, 900); x.fillStyle = o.c1; x.fillText(o.D.tit, 0, y0 - lh * 0.95); }
      it.forEach(function (q, i) { var k = eo(seg(o.t, 0.3 + i * 0.35, 0.8 + i * 0.35)); if (k <= 0) return; x.save(); x.globalAlpha *= k; x.translate((1 - k) * -S * 0.2, y0 + i * lh);
        x.fillStyle = "rgba(14,18,28,.8)"; rr(x, -w / 2, -lh * 0.42, w, lh * 0.84, lh * 0.2); x.fill(); x.fillStyle = o.c1; rr(x, -w / 2, -lh * 0.42, lh * 0.84, lh * 0.84, lh * 0.2); x.fill();
        x.textAlign = "center"; fonte(x, lh * 0.45, 900); x.fillStyle = "#0B0E14"; x.fillText(i + 1, -w / 2 + lh * 0.42, lh * 0.02); x.textAlign = "left"; caber(x, q, w - lh * 1.2, lh * 0.38, 800); x.fillStyle = "#fff"; x.fillText(q, -w / 2 + lh, lh * 0.02); x.restore(); }); } });
  mo({ id: "checklist", nome: "Checklist", cat: "graf", ic: "✅", dur: 4.5, campos: [["itens", "Itens (um por linha)", "Som conferido\nLuz ajustada\nTransmissão no ar"]],
    f: function (x, o) { var it = lista(o.D.itens), S = o.S, w = Math.min(o.W * 0.84, S * 0.95), lh = S * 0.095, y0 = -(it.length - 1) * lh / 2; x.textBaseline = "middle"; x.textAlign = "left";
      it.forEach(function (q, i) { var a = 0.2 + i * 0.5, k = eo(seg(o.t, a, a + 0.35)), kc = back(seg(o.t, a + 0.3, a + 0.6)); if (k <= 0) return; x.save(); x.globalAlpha *= k; x.translate(-w / 2, y0 + i * lh);
        x.strokeStyle = "#fff"; x.lineWidth = S * 0.006; rr(x, 0, -lh * 0.3, lh * 0.6, lh * 0.6, lh * 0.14); x.stroke();
        if (kc > 0) { x.fillStyle = o.c1; rr(x, 0, -lh * 0.3, lh * 0.6, lh * 0.6, lh * 0.14); x.fill(); x.strokeStyle = "#0B0E14"; x.lineWidth = S * 0.009; x.lineCap = "round"; x.beginPath(); x.moveTo(lh * 0.14, 0); x.lineTo(lh * 0.26, lh * 0.12 * cl(kc, 0, 1)); x.lineTo(lh * 0.26 + lh * 0.2 * cl(kc, 0, 1), -lh * 0.14 * cl(kc, 0, 1)); x.stroke(); }
        caber(x, q, w - lh * 0.9, lh * 0.42, 700); x.fillStyle = "#fff"; sombra(x, S, 0.01); x.fillText(q, lh * 0.85, lh * 0.02); x.restore(); }); } });
  mo({ id: "linhatempo", nome: "Linha do tempo", cat: "graf", ic: "🗓", dur: 5, campos: [["itens", "Etapas (quando: o quê, uma por linha)", "08h: Montagem\n14h: Ensaio\n19h: Evento ao vivo"]],
    f: function (x, o) { var it = lista(o.D.itens).map(function (q) { var a = q.split(":"); return { a: a[0].trim(), b: a.slice(1).join(":").trim() }; }), S = o.S, w = Math.min(o.W * 0.88, S * 1.2), n = Math.max(1, it.length), k = eio(seg(o.t, 0, 0.3 + n * 0.45));
      x.strokeStyle = "rgba(255,255,255,.3)"; x.lineWidth = S * 0.008; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(w / 2, 0); x.stroke(); x.strokeStyle = o.c1; x.beginPath(); x.moveTo(-w / 2, 0); x.lineTo(-w / 2 + w * k, 0); x.stroke();
      x.textAlign = "center"; x.textBaseline = "middle";
      var wi = w * (1 - 1 / Math.max(2, n)); it.forEach(function (q, i) { var px = -wi / 2 + wi * (n === 1 ? 0.5 : i / (n - 1)), ki = back(seg(o.t, 0.2 + i * 0.45, 0.6 + i * 0.45)); if (ki <= 0) return; x.save(); x.translate(px, 0); x.fillStyle = o.c1; x.beginPath(); x.arc(0, 0, S * 0.022 * ki, 0, 7); x.fill();
        x.globalAlpha *= cl(ki, 0, 1); caber(x, q.a, w / n * 0.95, S * 0.05, 900); x.fillStyle = "#fff"; x.fillText(q.a, 0, (i % 2 ? 1 : -1) * S * 0.07); caber(x, q.b, w / n * 0.95, S * 0.036, 600); x.fillStyle = "rgba(255,255,255,.8)"; x.fillText(q.b, 0, (i % 2 ? 1 : -1) * S * 0.125); x.restore(); }); } });

  /* ===== EVENTOS ===== */
  mo({ id: "nomecargo", nome: "Nome e cargo", cat: "evento", ic: "🪪", dur: 4, y: 0.32, campos: [["n", "Nome", "Ana Souza"], ["c", "Cargo", "Diretora de Marketing"]],
    f: function (x, o) { var S = o.S, k = eo(seg(o.t, 0, 0.6)), sai = eio(seg(o.t, o.d - 0.4, o.d)), px = S * 0.065; fonte(x, px, 900); var w1 = x.measureText(o.D.n || "").width; fonte(x, px * 0.6, 600); var w2 = x.measureText(o.D.c || "").width, w = Math.max(w1, w2) + px * 1.2, bx = -o.W * 0.42;
      x.save(); x.beginPath(); x.rect(bx - S * 0.02, -px * 1.3, (w + S * 0.04) * k * (1 - sai), px * 2.6); x.clip();
      x.fillStyle = o.c1; x.fillRect(bx, -px * 1.1, S * 0.012, px * 2.2); x.fillStyle = "rgba(10,12,18,.82)"; x.fillRect(bx + S * 0.012, -px * 1.1, w, px * 1.25); x.fillStyle = hexA(o.c1, 0.92); x.fillRect(bx + S * 0.012, px * 0.15, Math.max(w * 0.6, w2 + px), px * 0.95);
      x.textAlign = "left"; x.textBaseline = "middle"; fonte(x, px, 900); x.fillStyle = "#fff"; x.fillText(o.D.n || "", bx + px * 0.5, -px * 0.47); fonte(x, px * 0.6, 700); x.fillStyle = "#0B0E14"; x.fillText(o.D.c || "", bx + px * 0.5, px * 0.63); x.restore(); } });
  mo({ id: "local", nome: "Local e data", cat: "evento", ic: "📍", dur: 4, campos: [["l", "Local", "Expominas · Belo Horizonte"], ["d", "Data", "28 de novembro · 19h"]],
    f: function (x, o) { var S = o.S, k = back(seg(o.t, 0, 0.6)), q = eo(seg(o.t, 0.4, 0.9)); x.save(); x.translate(0, -S * 0.12 - (1 - cl(k, 0, 1)) * S * 0.15); x.scale(k, k); x.fillStyle = o.c1;
      x.beginPath(); x.arc(0, -S * 0.04, S * 0.06, Math.PI, 0); x.quadraticCurveTo(S * 0.06, S * 0.03, 0, S * 0.08); x.quadraticCurveTo(-S * 0.06, S * 0.03, -S * 0.06, -S * 0.04); x.fill(); x.fillStyle = "#0B0E14"; x.beginPath(); x.arc(0, -S * 0.04, S * 0.022, 0, 7); x.fill(); x.restore();
      x.globalAlpha *= q; x.textAlign = "center"; x.textBaseline = "middle"; caber(x, o.D.l || "", o.W * 0.86, S * 0.07, 900); x.fillStyle = "#fff"; sombra(x, S); x.fillText(o.D.l || "", 0, S * 0.04); caber(x, o.D.d || "", o.W * 0.8, S * 0.048, 700); x.fillStyle = o.c1; x.fillText(o.D.d || "", 0, S * 0.12); } });
  mo({ id: "aovivo", nome: "AO VIVO", cat: "evento", ic: "🔴", dur: 4, y: -0.38, campos: [["t", "Texto", "AO VIVO"]],
    f: function (x, o) { var S = o.S, s = String(o.D.t || "AO VIVO"), px = S * 0.05; fonte(x, px, 900); var w = x.measureText(s).width + px * 2.2, k = back(seg(o.t, 0, 0.4)); x.scale(k, k);
      var a0 = x.globalAlpha; x.fillStyle = "#E5202E"; rr(x, -w / 2, -px * 0.85, w, px * 1.7, px * 0.3); x.fill(); x.fillStyle = "#fff"; x.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(o.t * 3)); x.beginPath(); x.arc(-w / 2 + px * 0.75, 0, px * 0.28, 0, 7); x.fill();
      x.globalAlpha = a0; x.textAlign = "left"; x.textBaseline = "middle"; x.fillText(s, -w / 2 + px * 1.3, px * 0.04); } });
  mo({ id: "logo", nome: "Revelar a marca", cat: "evento", ic: "✨", dur: 3.5, campos: [["t", "Nome da marca", "SUA MARCA"], ["s", "Frase (opcional)", "audiovisual para eventos"]],
    f: function (x, o) { var S = o.S, s = String(o.D.t || ""), k = eio(seg(o.t, 0.15, 1.2)), px = caber(x, s, o.W * 0.84, S * 0.13, 900), w = x.measureText(s).width;
      x.strokeStyle = o.c1; x.lineWidth = S * 0.006; x.beginPath(); x.moveTo(-w / 2 * k, -px * 0.75); x.lineTo(w / 2 * k, -px * 0.75); x.moveTo(-w / 2 * k, px * 0.75); x.lineTo(w / 2 * k, px * 0.75); x.stroke();
      x.save(); x.beginPath(); x.rect(-w / 2 - 4, -px * 0.7, w + 8, px * 1.4); x.clip(); x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff"; x.fillText(s, 0, (1 - k) * px * 1.4);
      var br = (o.t * 0.7 % 1.6) - 0.3, gl = x.createLinearGradient(-w / 2 + w * br - px, 0, -w / 2 + w * br + px, 0); gl.addColorStop(0, "rgba(255,255,255,0)"); gl.addColorStop(0.5, "rgba(255,255,255,.55)"); gl.addColorStop(1, "rgba(255,255,255,0)");
      x.globalCompositeOperation = "source-atop"; x.fillStyle = gl; x.fillRect(-w / 2, -px, w, px * 2); x.restore();
      if (o.D.s) { x.globalAlpha *= seg(o.t, 0.9, 1.5); x.textAlign = "center"; caber(x, o.D.s, o.W * 0.8, S * 0.04, 600); x.fillStyle = o.c1; x.fillText(String(o.D.s).toUpperCase(), 0, px * 1.3); } } });
  mo({ id: "oferta", nome: "Oferta / preço", cat: "evento", ic: "🏷", dur: 4, campos: [["de", "De (opcional)", "R$ 3.000"], ["por", "Por", "R$ 2.400"], ["rot", "Chamada", "Só em dezembro"]],
    f: function (x, o) { var S = o.S, p = num(o.D.por), k = eo(seg(o.t, 0.5, 1.6)), kk = back(seg(o.t, 0, 0.5)); x.textAlign = "center"; x.textBaseline = "middle"; x.save(); x.scale(kk, kk);
      if (o.D.de) { caber(x, o.D.de, o.W * 0.6, S * 0.06, 700); x.fillStyle = "rgba(255,255,255,.65)"; x.fillText(o.D.de, 0, -S * 0.13); var w = x.measureText(o.D.de).width; x.strokeStyle = "#FF5A5A"; x.lineWidth = S * 0.008; x.beginPath(); x.moveTo(-w / 2, -S * 0.13); x.lineTo(-w / 2 + w * seg(o.t, 0.3, 0.7), -S * 0.13); x.stroke(); }
      caber(x, p.pre + fmtN(p.n, p.dec) + p.pos, o.W * 0.86, S * 0.14, 900); x.fillStyle = o.c1; sombra(x, S); x.fillText(p.pre + fmtN(p.n * (0.4 + 0.6 * k), p.dec) + p.pos, 0, 0); semSombra(x);
      if (o.D.rot) { caber(x, o.D.rot, o.W * 0.7, S * 0.045, 800); var w2 = x.measureText(o.D.rot).width + S * 0.06; x.fillStyle = "#fff"; rr(x, -w2 / 2, S * 0.1, w2, S * 0.075, S * 0.037); x.fill(); x.fillStyle = "#0B0E14"; x.fillText(o.D.rot, 0, S * 0.138); } x.restore(); } });
  mo({ id: "depoimento", nome: "Depoimento com estrelas", cat: "evento", ic: "⭐", dur: 5, campos: [["t", "Depoimento", "Equipe incrível, a transmissão foi perfeita!"], ["a", "Nome", "Carla · Arte Eventos"], ["e", "Estrelas (1 a 5)", "5"]],
    f: function (x, o) { var S = o.S, w = Math.min(o.W * 0.86, S * 1), h = S * 0.36, k = eo(seg(o.t, 0, 0.5)), ne = cl(parseInt(o.D.e, 10) || 5, 1, 5); x.globalAlpha *= k; x.translate(0, (1 - k) * S * 0.08);
      x.fillStyle = "rgba(255,255,255,.95)"; rr(x, -w / 2, -h / 2, w, h, S * 0.03); x.fill();
      for (var i = 0; i < 5; i++) { var ks = back(seg(o.t, 0.4 + i * 0.12, 0.7 + i * 0.12)), ex = -S * 0.12 + i * S * 0.06, ey = -h / 2 + S * 0.06; x.save(); x.translate(ex, ey); x.scale(ks, ks); x.fillStyle = i < ne ? "#FFB800" : "#d7d7d7"; x.beginPath();
        for (var j = 0; j < 10; j++) { var r = j % 2 ? S * 0.011 : S * 0.025, an = j * Math.PI / 5 - Math.PI / 2; x.lineTo(Math.cos(an) * r, Math.sin(an) * r); } x.closePath(); x.fill(); x.restore(); }
      var s = String(o.D.t || ""), n = Math.floor(s.length * seg(o.t, 0.8, Math.max(1.2, o.d * 0.7))); x.fillStyle = "#151821"; x.textAlign = "center"; x.textBaseline = "middle"; var px = caber(x, s, w * 0.88, S * 0.048, 700);
      var vis = s.slice(0, n); x.textAlign = "left"; x.fillText(vis, -x.measureText(s).width / 2, S * 0.0); fonte(x, px * 0.75, 600); x.fillStyle = "#6a6f7a"; x.textAlign = "center"; x.fillText(o.D.a || "", 0, h / 2 - S * 0.06); } });

  /* ===== REDES E CHAMADAS ===== */
  mo({ id: "comenta", nome: "Comentário digitando", cat: "redes", ic: "💭", dur: 4, campos: [["u", "Usuário", "@cliente_feliz"], ["t", "Comentário", "Quero orçamento pro meu evento! 😍"]],
    f: function (x, o) { var S = o.S, w = Math.min(o.W * 0.84, S * 0.95), h = S * 0.17, k = back(seg(o.t, 0, 0.45)); x.save(); x.scale(cl(k, 0, 1.2), cl(k, 0, 1.2)); x.fillStyle = "#fff"; sombra(x, S); rr(x, -w / 2, -h / 2, w, h, h * 0.25); x.fill(); semSombra(x);
      x.fillStyle = o.c1; x.beginPath(); x.arc(-w / 2 + h * 0.5, 0, h * 0.28, 0, 7); x.fill(); x.textAlign = "left"; x.textBaseline = "middle"; fonte(x, h * 0.2, 800); x.fillStyle = "#151821"; x.fillText(o.D.u || "", -w / 2 + h, -h * 0.17);
      var s = String(o.D.t || ""), n = Math.floor(s.length * seg(o.t, 0.5, Math.max(0.9, o.d * 0.65))); caber(x, s, w - h * 1.2, h * 0.22, 600); x.fillStyle = "#333a46"; x.fillText(s.slice(0, n) + (n < s.length && Math.floor(o.t * 3) % 2 ? "|" : ""), -w / 2 + h, h * 0.16); x.restore(); } });
  mo({ id: "seguir", nome: "Botão seguir / clique", cat: "redes", ic: "👆", dur: 3, y: 0.3, campos: [["t", "Texto do botão", "SEGUIR"], ["d", "Depois do clique", "SEGUINDO ✓"]],
    f: function (x, o) { var S = o.S, cl1 = o.t > 1.3, s = cl1 ? String(o.D.d || o.D.t || "") : String(o.D.t || ""), px = S * 0.055; fonte(x, px, 900); var w = Math.max(S * 0.35, x.measureText(s).width + px * 2), h = px * 1.9, ap = 1 - 0.08 * Math.sin(Math.PI * seg(o.t, 1.15, 1.45)), k = back(seg(o.t, 0, 0.4));
      x.save(); x.scale(k * ap, k * ap); x.fillStyle = cl1 ? "rgba(255,255,255,.95)" : o.c1; sombra(x, S); rr(x, -w / 2, -h / 2, w, h, h / 2); x.fill(); semSombra(x); x.fillStyle = cl1 ? "#151821" : "#0B0E14"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(s, 0, px * 0.05); x.restore();
      var mt = seg(o.t, 0.5, 1.2), mx2 = w * 0.6 * (1 - eio(mt)), my = h * 1.6 * (1 - eio(mt)) + h * 0.15; if (o.t < 2.3) { x.save(); x.translate(mx2, my); x.fillStyle = "#fff"; x.strokeStyle = "#151821"; x.lineWidth = S * 0.004;
        x.beginPath(); x.moveTo(0, 0); x.lineTo(0, S * 0.07); x.lineTo(S * 0.018, S * 0.052); x.lineTo(S * 0.032, S * 0.08); x.lineTo(S * 0.042, S * 0.075); x.lineTo(S * 0.03, S * 0.048); x.lineTo(S * 0.052, S * 0.046); x.closePath(); x.fill(); x.stroke(); x.restore(); } } });
  mo({ id: "notifica", nome: "Notificação", cat: "redes", ic: "🔔", dur: 3.5, y: -0.32, campos: [["a", "App / quem", "Novo pedido de orçamento"], ["t", "Mensagem", "Casamento · 200 convidados"]],
    f: function (x, o) { var S = o.S, w = Math.min(o.W * 0.88, S * 1), h = S * 0.16, k = eo(seg(o.t, 0, 0.5)), sai = eio(seg(o.t, o.d - 0.4, o.d)); x.translate(0, -(1 - k + sai) * S * 0.4); x.globalAlpha *= k * (1 - sai);
      x.fillStyle = "rgba(245,246,250,.96)"; sombra(x, S); rr(x, -w / 2, -h / 2, w, h, h * 0.28); x.fill(); semSombra(x); x.fillStyle = o.c1; rr(x, -w / 2 + h * 0.2, -h * 0.3, h * 0.6, h * 0.6, h * 0.15); x.fill();
      x.textAlign = "left"; x.textBaseline = "middle"; caber(x, o.D.a || "", w - h * 1.3, h * 0.22, 800); x.fillStyle = "#151821"; x.fillText(o.D.a || "", -w / 2 + h, -h * 0.15); caber(x, o.D.t || "", w - h * 1.3, h * 0.2, 500); x.fillStyle = "#4a505c"; x.fillText(o.D.t || "", -w / 2 + h, h * 0.17); } });
  mo({ id: "chamada", nome: "Chamada (arraste para cima)", cat: "redes", ic: "⬆", dur: 3, y: 0.36, campos: [["t", "Texto", "PEÇA SEU ORÇAMENTO"]],
    f: function (x, o) { var S = o.S, b = Math.sin(o.t * 4) * S * 0.015, k = eo(seg(o.t, 0, 0.4)); x.globalAlpha *= k; x.strokeStyle = o.c1; x.lineWidth = S * 0.012; x.lineCap = "round"; x.lineJoin = "round";
      var a0 = x.globalAlpha; for (var i = 0; i < 2; i++) { x.globalAlpha = a0 * k * (0.5 + 0.5 * Math.abs(Math.sin(o.t * 3 + i))); x.beginPath(); x.moveTo(-S * 0.04, -S * 0.05 - i * S * 0.035 + b); x.lineTo(0, -S * 0.09 - i * S * 0.035 + b); x.lineTo(S * 0.04, -S * 0.05 - i * S * 0.035 + b); x.stroke(); }
      x.globalAlpha = a0 * k; x.textAlign = "center"; x.textBaseline = "middle"; caber(x, o.D.t || "", o.W * 0.84, S * 0.055, 900); x.fillStyle = "#fff"; sombra(x, S); x.fillText(o.D.t || "", 0, S * 0.02); } });

  /* ===== REELS QUE ENSINAM ===== */
  mo({ id: "terminal", nome: "Terminal digitando", cat: "ensina", ic: "⌨️", dur: 5, campos: [["c", "Comando", "bw criar --evento casamento"], ["r", "Respostas (uma por linha)", "✓ equipe escalada\n✓ telão reservado\n✓ transmissão pronta"]],
    f: function (x, o) { var S = o.S, w = Math.min(o.W * 0.9, S * 1.05), rs = lista(o.D.r), h = S * (0.2 + rs.length * 0.07), k = eo(seg(o.t, 0, 0.4)); x.globalAlpha *= k;
      x.fillStyle = "#0d1117"; sombra(x, S); rr(x, -w / 2, -h / 2, w, h, S * 0.02); x.fill(); semSombra(x); x.fillStyle = "#1c2230"; rr(x, -w / 2, -h / 2, w, S * 0.05, S * 0.02); x.fill();
      ["#ff5f56", "#ffbd2e", "#27c93f"].forEach(function (c, i) { x.fillStyle = c; x.beginPath(); x.arc(-w / 2 + S * (0.03 + i * 0.03), -h / 2 + S * 0.025, S * 0.009, 0, 7); x.fill(); });
      x.textAlign = "left"; x.textBaseline = "middle"; x.font = "600 " + Math.round(S * 0.036) + 'px "Fira Code",Consolas,monospace'; var cmd = String(o.D.c || ""), n = Math.floor(cmd.length * seg(o.t, 0.3, 0.3 + cmd.length * 0.045)), y = -h / 2 + S * 0.1;
      x.fillStyle = o.c1; x.fillText("$ ", -w / 2 + S * 0.03, y); x.fillStyle = "#e6edf3"; x.fillText(cmd.slice(0, n) + (n < cmd.length || Math.floor(o.t * 2.5) % 2 ? "▌" : ""), -w / 2 + S * 0.065, y);
      var t0 = 0.4 + cmd.length * 0.045; rs.forEach(function (q, i) { if (o.t < t0 + i * 0.4) return; x.fillStyle = /^✓|^✔/.test(q) ? "#3fb950" : "#9da7b3"; x.fillText(q, -w / 2 + S * 0.03, y + (i + 1) * S * 0.07); }); } });
  mo({ id: "passo", nome: "Passo numerado", cat: "ensina", ic: "①", dur: 3.5, campos: [["n", "Número", "1"], ["t", "Passo", "Escolha o formato do vídeo"], ["e", "Emoji (opcional)", "🎬"]],
    f: function (x, o) { var S = o.S, k = back(seg(o.t, 0, 0.5)), q = eo(seg(o.t, 0.3, 0.8)); x.save(); x.scale(k, k); var g = x.createRadialGradient(0, -S * 0.1, 0, 0, -S * 0.1, S * 0.22); g.addColorStop(0, hexA(o.c1, 0.55)); g.addColorStop(1, hexA(o.c1, 0)); x.fillStyle = g; x.fillRect(-S * 0.25, -S * 0.35, S * 0.5, S * 0.5);
      x.fillStyle = o.c1; x.beginPath(); x.arc(0, -S * 0.1, S * 0.1, 0, 7); x.fill(); x.textAlign = "center"; x.textBaseline = "middle"; fonte(x, S * 0.11, 900); x.fillStyle = "#0B0E14"; x.fillText(String(o.D.n || "1"), 0, -S * 0.095); x.restore();
      if (o.D.e) { x.font = Math.round(S * 0.07) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = "center"; x.fillText(o.D.e, S * 0.12, -S * 0.19 + Math.sin(o.t * 3) * S * 0.01); }
      x.globalAlpha *= q; x.textAlign = "center"; caber(x, o.D.t || "", o.W * 0.86, S * 0.06, 800); x.fillStyle = "#fff"; sombra(x, S); x.fillText(o.D.t || "", 0, S * 0.07 + (1 - q) * S * 0.04); } });
  mo({ id: "antesdepois", nome: "Rótulos antes e depois", cat: "ensina", ic: "↔", dur: 3, campos: [["a", "Esquerda", "ANTES"], ["b", "Direita", "DEPOIS"]],
    f: function (x, o) { var S = o.S, k = eo(seg(o.t, 0, 0.5)), px = S * 0.045; [[o.D.a || "ANTES", -1, "rgba(10,12,18,.8)", "#fff"], [o.D.b || "DEPOIS", 1, o.c1, "#0B0E14"]].forEach(function (r) { fonte(x, px, 900); var w = x.measureText(r[0]).width + px * 1.4, cx0 = r[1] * (o.W * 0.42 - w / 2) * k;
        x.fillStyle = r[2]; rr(x, cx0 - w / 2, -px * 0.85, w, px * 1.7, px * 0.85); x.fill(); x.fillStyle = r[3]; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(r[0], cx0, px * 0.05); });
      x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = S * 0.005; x.beginPath(); x.moveTo(0, -o.H * 0.5 * k); x.lineTo(0, o.H * 0.5 * k); x.stroke(); } });

  var CATS = [["texto", "Textos animados"], ["graf", "Gráficos e números"], ["evento", "Eventos e marca"], ["redes", "Redes e chamadas"], ["ensina", "Reels que ensinam"]];
  var POR = {}; M.forEach(function (m) { POR[m.id] = m; });
  function padrao(id) { var m = POR[id], d = {}; if (m) m.campos.forEach(function (c) { d[c[0]] = c[2]; }); return d; }
  /* desenha o motion no contexto x, com o centro em (X, Y) da tela e escala s (1 = tamanho natural) */
  function desenhar(x, id, W, H, X, Y, s, t, d, D, c1, c2) { var m = POR[id]; if (!m) return; var dd = padrao(id); if (D) for (var k in D) if (D[k] != null) dd[k] = D[k];
    x.save(); x.translate(X, Y); if (s && s !== 1) x.scale(s, s); x.lineJoin = "round";
    try { m.f(x, { W: W / (s || 1), H: H / (s || 1), S: Math.min(W, H), t: Math.max(0, t), d: d || m.dur, D: dd, c1: c1 || "#FFC24A", c2: c2 || "#4C8DFF" }); } catch (e) {}
    x.restore(); }
  var MINI = {};
  /* miniatura: um quadro do meio do motion, num fundo escuro — feita uma vez e guardada (a biblioteca não anima à toa) */
  function mini(id, px, c1) { var ch = id + "|" + px + "|" + (c1 || ""); if (MINI[ch]) return MINI[ch]; var c = document.createElement("canvas"), m = POR[id]; c.width = Math.round(px * 1.6); c.height = px; var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, "#1b2231"); g.addColorStop(1, "#2b2346"); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    if (m) desenhar(x, id, c.width, c.height, c.width / 2, c.height / 2 + (m.y || 0) * c.height * 0.5, 0.82, Math.min(m.dur * 0.72, 2.6), m.dur, null, c1);
    return (MINI[ch] = c.toDataURL("image/png")); }
  window.BWMotionsVE = { LISTA: M, POR: POR, CATS: CATS, padrao: padrao, desenhar: desenhar, mini: mini };
})();
