/* PRESS KIT — recursos novos (28/11/2026, pedido do dono):
   🌐 INGLÊS / ESPANHOL — cria uma CÓPIA traduzida (o original fica), pela IA da plataforma (bw-ia, só os textos): nome, números, datas, @, e-mails e links não mudam.
   🎬 VÍDEO — vídeo curto animado (Reels/Stories, quadrado ou horizontal) feito NO APARELHO (BWReelsCelular.gerar com desenhar): capa, quem sou eu, números,
      o que faço, fotos, trabalhos e contato, nas cores do press kit. Nada sai do aparelho.
   🔗 LINK PARA COMPARTILHAR — página pública (kit.html?k=TOKEN) só com as partes LIGADAS do press kit. As fotos (como saem no PDF) e o PDF vão para a pasta
      pública "presskit" do Supabase dentro da pasta do token; a tabela bw_presskit_pub (RLS por auth.uid()) guarda os textos e quem vê lê só pela função
      bw_presskit_ver(token). TIRAR DO AR apaga a linha e os arquivos. docs/sql/2026-11-28-presskit-link.sql.
   Fala com o editor só pela ponte window.BWPressKit (presskit.js). */
(function () {
  "use strict";
  var BW = function () { return window.BWPressKit; };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var SITE = "https://audioevideobw-eng.github.io/";
  var SUPA = "https://zdtnetplvdonogmdvarx.supabase.co";
  var BALDE = "presskit";
  var X = "<button type=\"button\" class=\"pk-mx\" data-a=\"fecharModal\" aria-label=\"Fechar\">✕</button>";

  /* ================= 🌐 TRADUZIR ================= */
  var IDIOMAS = { en: { nome: "INGLÊS", lingua: "English (US)", suf: "EN", ico: "🇺🇸" }, es: { nome: "ESPANHOL", lingua: "Spanish (Latin America)", suf: "ES", ico: "🇪🇸" } };
  var NAO_TRADUZ = { marca: 1, tel: 1, email: 1, site: 1, insta: 1, tiktok: 1, youtube: 1, url: 1, link: 1, ano: 1, v: 1, foto: 1 };
  function coletar(o, cam, out) {
    if (o == null) return;
    if (typeof o === "string") { if (/[A-Za-zÀ-ú]{2,}/.test(o)) out[cam] = o; return; }
    if (Array.isArray(o)) { o.forEach(function (x, i) { coletar(x, cam + "." + i, out); }); return; }
    if (typeof o === "object") Object.keys(o).forEach(function (k) { if (!NAO_TRADUZ[k]) coletar(o[k], cam + "." + k, out); });
  }
  function por(obj, cam, v) { var p = cam.split("."), o = obj; for (var i = 0; i < p.length - 1; i++) { if (o == null) return; o = o[p[i]]; } if (o != null && typeof o[p[p.length - 1]] === "string") o[p[p.length - 1]] = v; }
  function digitos(t) { return (String(t).match(/\d+/g) || []).sort().join(","); }
  function blocos(mapa, max) { var out = [], cur = {}, n = 0; Object.keys(mapa).forEach(function (k) { var l = mapa[k].length + k.length + 8; if (n && n + l > max) { out.push(cur); cur = {}; n = 0; } cur[k] = mapa[k]; n += l; }); if (n) out.push(cur); return out; }
  function idiomaAbrir() {
    var k = BW().atual(); if (!k) return;
    BW().modal(X + "<h3>🌐 Press kit em outro idioma</h3><p class=\"tf-sub\">A IA traduz todos os textos e cria uma <b>cópia</b> nova (o original em português continua). Nome, números, datas, @, e-mails e links não mudam. Depois é só revisar e baixar o PDF.</p>" +
      "<div class=\"pk-chips\" style=\"margin-top:12px\">" + Object.keys(IDIOMAS).map(function (l) { return "<button type=\"button\" class=\"bw-btn pri\" data-a=\"pmTraduzir\" data-l=\"" + l + "\">" + IDIOMAS[l].ico + " " + IDIOMAS[l].nome + "</button>"; }).join("") + "</div>" +
      "<p class=\"tf-sub\" id=\"pmIdMsg\" style=\"margin-top:10px\"></p>");
  }
  async function traduzir(l) {
    var b = BW(), k = b.atual(), L = IDIOMAS[l]; if (!k || !L) return; var msg = $("pmIdMsg");
    await b.guardarAgora(); k = b.acharKit(k.id);
    var mapa = {}; coletar(k.d || {}, "d", mapa); coletar(k.tit || {}, "tit", mapa);
    var chaves = Object.keys(mapa); if (!chaves.length) { if (msg) msg.textContent = "Não há texto para traduzir."; return; }
    var sistema = "Você traduz press kits (apresentações profissionais de pessoas) do português do Brasil para " + L.lingua + ". Recebe um JSON {chave: texto}. " +
      "Responda SÓ com um JSON com as MESMAS chaves e os textos traduzidos, naturais e profissionais, no mesmo tom. NÃO traduza nem mude nomes de pessoas, empresas, marcas, programas, peças, " +
      "eventos e cidades; números, datas, valores, medidas, @, e-mails e links ficam iguais. Mantenha as quebras de linha. Não acrescente nem tire informação.";
    var lotes = blocos(mapa, 2600), feito = {}, nOk = 0;
    for (var i = 0; i < lotes.length; i++) {
      if (msg) msg.textContent = "Traduzindo… " + (i + 1) + " de " + lotes.length;
      var r = await b.ia(sistema, JSON.stringify(lotes[i]), 3200);
      if (r.erro) { if (msg) msg.textContent = b.erroIA(r.erro); return; }
      var j = b.jsonDe(r.texto || r.resposta || "");
      if (!j) { if (msg) msg.textContent = "A IA não respondeu no formato certo. Tente de novo."; return; }
      Object.keys(lotes[i]).forEach(function (c) { var t = j[c], o = lotes[i][c]; if (typeof t === "string" && t.trim() && digitos(t) === digitos(o)) { feito[c] = t.replace(/\*\*|__/g, "").trim(); nOk++; } });
    }
    var n = await b.duplicarKit(k.id, (k.nome || "Press kit").replace(/\s*\((EN|ES)\)$/, "") + " (" + L.suf + ")", function (nk) { nk.idioma = l; nk.tit = nk.tit || {}; Object.keys(feito).forEach(function (c) { por(nk, c, feito[c]); }); });
    if (!n) return; b.fecharModal(); await b.abrirKit(n.id);
    b.aviso("🌐 Cópia em " + L.nome.toLowerCase() + " aberta (" + nOk + " de " + chaves.length + " textos)");
  }

  /* ================= 🎬 VÍDEO ================= */
  var VF = { "9:16": [1080, 1920, "Reels / Stories"], "1:1": [1080, 1080, "Feed quadrado"], "16:9": [1920, 1080, "YouTube / telão"] };
  var V = { fmt: "9:16", qual: 1080, raf: 0, dados: null, url: "", arq: null, parar: false, gerando: false };
  var FONTES = null;
  function carregarFontes() {
    if (FONTES) return FONTES;
    var l = [["PKV-MO", "Montserrat-800.ttf", "800"], ["PKV-MOn", "Montserrat-500.ttf", "500"], ["PKV-PF", "PlayfairDisplay-700.ttf", "700"]];
    FONTES = Promise.all(l.map(function (f) { try { var ff = new FontFace(f[0], "url(assets/fontes/" + f[1] + ")", { weight: f[2] }); return ff.load().then(function (x) { document.fonts.add(x); }).catch(function () {}); } catch (e) { return null; } }));
    return FONTES;
  }
  function imgDe(u) { return new Promise(function (ok) { if (!u) return ok(null); var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = u; }); }
  function lum(h) { var n = parseInt(String(h || "#000").replace("#", ""), 16) || 0, c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function rgba(h, a) { var n = parseInt(String(h || "#000").replace("#", ""), 16) || 0; return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")"; }
  function ease(x) { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); }
  function janela(t, a, b) { return ease((t - a) / Math.max(0.01, b - a)); }
  function quebrar(cx, txt, max) { var pal = String(txt || "").split(/\s+/), l = [], cur = ""; pal.forEach(function (p) { var t = cur ? cur + " " + p : p; if (cx.measureText(t).width > max && cur) { l.push(cur); cur = p; } else cur = t; }); if (cur) l.push(cur); return l; }
  function cobrir(cx, im, x, y, w, h, z, fx, fy) { if (!im) return; var s = Math.max(w / im.naturalWidth, h / im.naturalHeight) * (z || 1), dw = im.naturalWidth * s, dh = im.naturalHeight * s; cx.save(); cx.beginPath(); cx.rect(x, y, w, h); cx.clip(); cx.drawImage(im, x + (w - dw) * (fx == null ? 0.5 : fx), y + (h - dh) * (fy == null ? 0.5 : fy), dw, dh); cx.restore(); }
  function caber(cx, txt, fonte, peso, max, alvo) { var s = alvo; cx.font = peso + " " + s + "px " + fonte; while (s > 10 && cx.measureText(txt).width > max) { s *= 0.94; cx.font = peso + " " + s + "px " + fonte; } return s; }
  var TX = { pt: { contato: "CONTATO", kit: "PRESS KIT COMPLETO" }, en: { contato: "CONTACT", kit: "FULL PRESS KIT" }, es: { contato: "CONTACTO", kit: "PRESS KIT COMPLETO" } };
  async function prepararVideo() {
    var b = BW(), k = b.atual(); if (!k) return null; await carregarFontes();
    var im = await b.imagensPub(), d = k.d || {}, cr = b.coresDe(k), vis = b.visiveis(k), escuro = lum(cr.fundo) < 0.36;
    var D = { k: k, cr: cr, txt: escuro ? "#F5F1EA" : "#15181F", sub: escuro ? "rgba(245,241,234,.72)" : "rgba(21,24,31,.68)", tf: k.fonte === "PF" ? "PKV-PF" : "PKV-MO", tx: TX[k.idioma] || TX.pt,
      marca: d.marca || "Seu nome", slogan: d.slogan || "", etiqueta: d.etiqueta || "", cenas: [] };
    D.capa = await imgDe(im.capa); D.retrato = await imgDe(im.retrato); D.logo = await imgDe(im.logo);
    D.fotos = []; for (var i = 0; i < Math.min(5, im.fotos.length); i++) { var f = await imgDe(im.fotos[i]); if (f) D.fotos.push(f); }
    var tem = function (id) { return vis.indexOf(id) >= 0; };
    D.cenas.push({ dur: 3.6, f: cenaAbertura });
    var sob = String(d.sobreCurto || "").trim() || String(d.sobre || "").split(/\s+/).slice(0, 38).join(" ").trim();
    if (tem("sobre") && sob) D.cenas.push({ dur: 4.4, f: cenaTexto, tit: b.titulo(k, "sobre"), texto: sob });
    var nums = (d.numeros || []).filter(function (x) { return x && String(x.v || "").trim(); }).slice(0, 3);
    if (tem("numeros") && nums.length) D.cenas.push({ dur: 3.4, f: cenaNumeros, tit: b.titulo(k, "numeros"), itens: nums });
    var serv = (d.servicos || []).filter(function (x) { return x && String(x.t || "").trim(); }).slice(0, 4);
    if (tem("servicos") && serv.length) D.cenas.push({ dur: 3.8, f: cenaLista, tit: b.titulo(k, "servicos"), itens: serv.map(function (x) { return [x.t, x.d]; }) });
    D.fotos.forEach(function (f, j) { D.cenas.push({ dur: 1.5, f: cenaFoto, foto: f, j: j }); });
    var trab = (d.experiencia || []).filter(function (x) { return x && String(x.titulo || "").trim(); }).slice(0, 4);
    if (tem("experiencia") && trab.length) D.cenas.push({ dur: 3.6, f: cenaLista, tit: b.titulo(k, "experiencia"), itens: trab.map(function (x) { return [x.titulo, [x.papel, x.onde].filter(Boolean).join(" · ")]; }) });
    var c = d.contato || {}, lin = [["@", c.insta], ["☎", c.tel], ["✉", c.email], ["⌂", c.site], ["♪", c.tiktok], ["▶", c.youtube]].filter(function (x) { return String(x[1] || "").trim(); }).slice(0, 4);
    D.cenas.push({ dur: 3.8, f: cenaFinal, linhas: tem("contato") ? lin : [], link: k.pub && k.pub.url });
    var t = 0; D.cenas.forEach(function (s) { s.ini = t; t += s.dur; }); D.dur = Math.round(t * 10) / 10;
    return D;
  }
  var CROSS = 0.45;
  function desenhar(cx, W, H, t, D) {
    var i = 0; while (i < D.cenas.length - 1 && t >= D.cenas[i].ini + D.cenas[i].dur) i++;
    var s = D.cenas[i], lt = t - s.ini;
    fundo(cx, W, H, D); s.f(cx, W, H, lt, s, D);
    var prox = D.cenas[i + 1]; if (prox && lt > s.dur - CROSS) { cx.save(); cx.globalAlpha = (lt - (s.dur - CROSS)) / CROSS; fundo(cx, W, H, D); prox.f(cx, W, H, lt - s.dur, prox, D); cx.restore(); }
    if (t < 0.25) { cx.fillStyle = rgba(D.cr.fundo, 1 - t / 0.25); cx.fillRect(0, 0, W, H); }
  }
  function fundo(cx, W, H, D) {
    cx.fillStyle = D.cr.fundo; cx.fillRect(0, 0, W, H);
    var g = cx.createRadialGradient(W * 0.85, H * 0.1, 0, W * 0.85, H * 0.1, Math.max(W, H) * 0.7); g.addColorStop(0, rgba(D.cr.destaque, 0.22)); g.addColorStop(1, rgba(D.cr.destaque, 0)); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
  }
  function U(W, H) { return Math.min(W, H); }
  function cenaAbertura(cx, W, H, t, s, D) {
    var u = U(W, H);
    if (D.capa) { cobrir(cx, D.capa, 0, 0, W, H, 1.12 - 0.1 * ease(t / s.dur), 0.5, 0.35); var g = cx.createLinearGradient(0, H * 0.35, 0, H); g.addColorStop(0, rgba(D.cr.fundo, 0)); g.addColorStop(0.65, rgba(D.cr.fundo, 0.86)); g.addColorStop(1, rgba(D.cr.fundo, 0.98)); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
    else { cx.fillStyle = rgba(D.cr.destaque, 0.9); cx.beginPath(); cx.arc(W * 0.5, H * 0.38, u * 0.28 * ease(t / 0.9), 0, 7); cx.fill(); }
    var mx = W * 0.08, base = H * (H > W ? 0.74 : 0.7);
    if (D.etiqueta) { var a = janela(t, 0.25, 0.85); cx.globalAlpha = a; cx.fillStyle = D.cr.destaque; cx.font = "800 " + u * 0.032 + "px PKV-MO, sans-serif"; if ("letterSpacing" in cx) cx.letterSpacing = u * 0.008 + "px"; cx.fillText(String(D.etiqueta).toUpperCase(), mx, base - u * 0.17 + (1 - a) * 20); if ("letterSpacing" in cx) cx.letterSpacing = "0px"; cx.globalAlpha = 1; }
    var an = janela(t, 0.45, 1.2), tam = caber(cx, D.marca, D.tf + ", sans-serif", "800", W - 2 * mx, u * 0.13);
    cx.globalAlpha = an; cx.fillStyle = D.txt; cx.font = "800 " + tam + "px " + D.tf + ", sans-serif"; cx.fillText(D.marca, mx, base + (1 - an) * u * 0.06); cx.globalAlpha = 1;
    cx.fillStyle = D.cr.destaque; cx.fillRect(mx, base + u * 0.03, (W * 0.3) * janela(t, 0.9, 1.6), u * 0.008);
    if (D.slogan) { var as = janela(t, 1.0, 1.7); cx.globalAlpha = as; cx.fillStyle = D.sub; cx.font = "500 " + u * 0.042 + "px PKV-MOn, sans-serif"; quebrar(cx, D.slogan, W - 2 * mx).slice(0, 2).forEach(function (l, i) { cx.fillText(l, mx, base + u * 0.1 + i * u * 0.055); }); cx.globalAlpha = 1; }
  }
  function titulo(cx, W, H, t, txt, D, y) { var u = U(W, H), a = janela(t, 0.1, 0.6); cx.globalAlpha = a; cx.fillStyle = D.cr.destaque; cx.font = "800 " + u * 0.036 + "px PKV-MO, sans-serif"; cx.fillText(String(txt).toUpperCase(), W * 0.08 + (1 - a) * -30, y); cx.fillRect(W * 0.08, y + u * 0.02, u * 0.09 * a, u * 0.007); cx.globalAlpha = 1; }
  function cenaTexto(cx, W, H, t, s, D) {
    var u = U(W, H), alto = H > W, mx = W * 0.08, largura = alto ? W - 2 * mx : W * 0.52;
    if (D.retrato || D.capa) { var a = janela(t, 0.2, 1.0), im = D.retrato || D.capa;
      if (alto) { var hh = H * 0.42, ww = hh * im.naturalWidth / im.naturalHeight; cx.globalAlpha = a; if (D.retrato) cx.drawImage(im, W - ww * 0.92, H - hh + (1 - a) * 60, ww, hh); else { cx.save(); cx.beginPath(); cx.arc(W * 0.72, H * 0.78, u * 0.2, 0, 7); cx.clip(); cobrir(cx, im, W * 0.72 - u * 0.2, H * 0.78 - u * 0.2, u * 0.4, u * 0.4, 1, 0.5, 0.3); cx.restore(); } cx.globalAlpha = 1; }
      else { cx.globalAlpha = a; cobrir(cx, im, W * 0.64, 0, W * 0.36, H, 1.05, 0.5, 0.3); cx.globalAlpha = 1; } }
    var y0 = alto ? H * 0.16 : H * 0.2; titulo(cx, W, H, t, s.tit, D, y0);
    cx.fillStyle = D.txt; var fs = u * (alto ? 0.05 : 0.044); cx.font = "500 " + fs + "px PKV-MOn, sans-serif";
    quebrar(cx, s.texto, largura).slice(0, alto ? 8 : 7).forEach(function (l, i) { var a = janela(t, 0.45 + i * 0.16, 0.95 + i * 0.16); cx.globalAlpha = a; cx.fillText(l, mx, y0 + u * 0.12 + i * fs * 1.38 + (1 - a) * 16); });
    cx.globalAlpha = 1;
  }
  function cenaNumeros(cx, W, H, t, s, D) {
    var u = U(W, H), alto = H > W, mx = W * 0.08, y0 = alto ? H * 0.2 : H * 0.22; titulo(cx, W, H, t, s.tit, D, y0);
    s.itens.forEach(function (x, i) {
      var a = janela(t, 0.35 + i * 0.25, 0.9 + i * 0.25), bx, by, bw, bh;
      if (alto) { bw = W - 2 * mx; bh = H * 0.17; bx = mx; by = y0 + u * 0.09 + i * (bh + u * 0.04); } else { bw = (W - 2 * mx - u * 0.08) / 3; bh = H * 0.42; bx = mx + i * (bw + u * 0.04); by = y0 + u * 0.1; }
      cx.globalAlpha = a; cx.fillStyle = rgba(D.cr.destaque, 0.12); cx.fillRect(bx, by + (1 - a) * 30, bw, bh); cx.fillStyle = D.cr.destaque; cx.fillRect(bx, by + (1 - a) * 30, u * 0.012, bh);
      var tv = caber(cx, String(x.v), "PKV-MO, sans-serif", "800", bw - u * 0.1, u * (alto ? 0.1 : 0.09)); cx.fillText(String(x.v), bx + u * 0.05, by + (1 - a) * 30 + bh * 0.52);
      cx.fillStyle = D.txt; cx.font = "500 " + u * 0.034 + "px PKV-MOn, sans-serif"; quebrar(cx, x.r, bw - u * 0.1).slice(0, 2).forEach(function (l, j) { cx.fillText(l, bx + u * 0.05, by + (1 - a) * 30 + bh * 0.52 + u * 0.06 + j * u * 0.045); });
      cx.globalAlpha = 1; });
  }
  function cenaLista(cx, W, H, t, s, D) {
    var u = U(W, H), alto = H > W, mx = W * 0.08, y0 = alto ? H * 0.2 : H * 0.18; titulo(cx, W, H, t, s.tit, D, y0);
    var passo = alto ? H * 0.15 : H * 0.17;
    s.itens.forEach(function (x, i) { var a = janela(t, 0.35 + i * 0.22, 0.85 + i * 0.22), y = y0 + u * 0.13 + i * passo;
      cx.globalAlpha = a; cx.fillStyle = D.cr.destaque; cx.beginPath(); cx.arc(mx + u * 0.02 + (1 - a) * -40, y - u * 0.016, u * 0.016, 0, 7); cx.fill();
      cx.fillStyle = D.txt; var ft = caber(cx, String(x[0]), D.tf + ", sans-serif", "800", W - 2 * mx - u * 0.07, u * 0.055); cx.fillText(String(x[0]), mx + u * 0.07 + (1 - a) * -40, y);
      if (x[1]) { cx.fillStyle = D.sub; cx.font = "500 " + u * 0.033 + "px PKV-MOn, sans-serif"; cx.fillText(quebrar(cx, x[1], W - 2 * mx - u * 0.07)[0] || "", mx + u * 0.07 + (1 - a) * -40, y + u * 0.05); }
      cx.globalAlpha = 1; });
  }
  function cenaFoto(cx, W, H, t, s, D) { var p = t / s.dur, dir = s.j % 2 ? 1 : -1; cobrir(cx, s.foto, 0, 0, W, H, 1.08 + 0.06 * p, 0.5 + dir * 0.08 * (p - 0.5), 0.45); var g = cx.createLinearGradient(0, H * 0.75, 0, H); g.addColorStop(0, rgba(D.cr.fundo, 0)); g.addColorStop(1, rgba(D.cr.fundo, 0.55)); cx.fillStyle = g; cx.fillRect(0, 0, W, H); }
  function cenaFinal(cx, W, H, t, s, D) {
    var u = U(W, H), cxm = W / 2, y = H * (H > W ? 0.26 : 0.18);
    cx.textAlign = "center";
    if (D.logo) { var lh = u * 0.14, lw = lh * D.logo.naturalWidth / D.logo.naturalHeight; if (lw > W * 0.5) { lw = W * 0.5; lh = lw * D.logo.naturalHeight / D.logo.naturalWidth; } cx.globalAlpha = janela(t, 0, 0.6); cx.drawImage(D.logo, cxm - lw / 2, y - lh, lw, lh); cx.globalAlpha = 1; y += u * 0.1; }
    var a = janela(t, 0.2, 0.8), tm = caber(cx, D.marca, D.tf + ", sans-serif", "800", W * 0.86, u * 0.1); cx.globalAlpha = a; cx.fillStyle = D.txt; cx.fillText(D.marca, cxm, y + u * 0.06); cx.globalAlpha = 1;
    y += u * 0.16; cx.fillStyle = D.cr.destaque; cx.font = "800 " + u * 0.032 + "px PKV-MO, sans-serif"; cx.globalAlpha = janela(t, 0.5, 1); if (s.linhas.length) cx.fillText(D.tx.contato, cxm, y); cx.globalAlpha = 1;
    s.linhas.forEach(function (l, i) { var b = janela(t, 0.7 + i * 0.18, 1.2 + i * 0.18); cx.globalAlpha = b; cx.fillStyle = D.txt; var ft = caber(cx, l[0] + "  " + l[1], "PKV-MOn, sans-serif", "500", W * 0.84, u * 0.045); cx.fillText(l[0] + "  " + l[1], cxm, y + u * 0.09 + i * u * 0.075 + (1 - b) * 14); cx.globalAlpha = 1; });
    if (s.link) { var c2 = janela(t, 1.6, 2.2), yy = y + u * 0.12 + s.linhas.length * u * 0.075, bw = W * 0.7, bh = u * 0.08; cx.globalAlpha = c2; cx.fillStyle = D.cr.destaque; cx.fillRect(cxm - bw / 2, yy, bw, bh); cx.fillStyle = lum(D.cr.destaque) > 0.45 ? "#111" : "#fff"; cx.font = "800 " + u * 0.03 + "px PKV-MO, sans-serif"; cx.fillText(D.tx.kit + " ↗", cxm, yy + bh * 0.64); cx.fillStyle = D.sub; cx.font = "500 " + u * 0.026 + "px PKV-MOn, sans-serif"; cx.fillText(String(s.link).replace(/^https?:\/\//, ""), cxm, yy + bh + u * 0.05); cx.globalAlpha = 1; }
    cx.textAlign = "left";
  }
  async function videoAbrir() {
    var b = BW(); if (!b.atual()) return;
    b.modal(X + "<h3>🎬 Vídeo do press kit</h3><p class=\"tf-sub\">Um vídeo curto com a sua capa, quem você é, números, o que faz, fotos e contato — nas cores do seu press kit. Feito neste aparelho; nada é enviado.</p>" +
      "<div class=\"pk-sub-t\">FORMATO</div><div class=\"pk-chips\" id=\"pmVfmt\">" + Object.keys(VF).map(function (f) { return "<button type=\"button\" class=\"pk-chip" + (f === V.fmt ? " on" : "") + "\" data-a=\"pmVfmt\" data-v=\"" + f + "\">" + f + " · " + VF[f][2] + "</button>"; }).join("") + "</div>" +
      "<div class=\"pk-sub-t\">QUALIDADE</div><div class=\"pk-chips\" id=\"pmVq\"><button type=\"button\" class=\"pk-chip" + (V.qual === 720 ? " on" : "") + "\" data-a=\"pmVq\" data-v=\"720\">RÁPIDA 720p</button><button type=\"button\" class=\"pk-chip" + (V.qual === 1080 ? " on" : "") + "\" data-a=\"pmVq\" data-v=\"1080\">ALTA 1080p</button></div>" +
      "<div class=\"pm-vprev\" style=\"margin:12px auto;max-width:100%;display:flex;justify-content:center\"><canvas id=\"pmVcv\" style=\"max-width:100%;max-height:48vh;border-radius:12px;background:#000\"></canvas></div><p class=\"tf-sub\" id=\"pmVinfo\">Preparando a prévia…</p>" +
      "<div class=\"pk-chips\"><button type=\"button\" class=\"bw-btn pri\" data-a=\"pmVgerar\" id=\"pmVgerar\">🎬 GERAR E BAIXAR O VÍDEO</button><button type=\"button\" class=\"bw-btn\" data-a=\"pmVcancelar\" id=\"pmVcancelar\" hidden>CANCELAR</button></div>" +
      "<progress id=\"pmVbarra\" max=\"100\" value=\"0\" hidden style=\"width:100%;margin-top:10px\"></progress><div id=\"pmVpronto\" hidden style=\"margin-top:12px\"><video id=\"pmVvideo\" controls playsinline style=\"width:100%;max-height:48vh;border-radius:12px;background:#000\"></video>" +
      "<div class=\"pk-chips\" style=\"margin-top:8px\"><a class=\"bw-btn pri\" id=\"pmVbaixar\" download>⬇ BAIXAR DE NOVO</a><button type=\"button\" class=\"bw-btn\" data-a=\"pmVcomp\">↗ COMPARTILHAR</button></div></div>");
    try { V.dados = await prepararVideo(); } catch (e) { $("pmVinfo").textContent = "Não deu para montar a prévia: " + (e.message || e); return; }
    previa();
  }
  function previa() {
    cancelAnimationFrame(V.raf); var cv = $("pmVcv"); if (!cv || !V.dados) return; var f = VF[V.fmt], k = 480 / Math.max(f[0], f[1]); cv.width = Math.round(f[0] * k); cv.height = Math.round(f[1] * k);
    var cx = cv.getContext("2d"), t0 = performance.now(); $("pmVinfo").textContent = V.dados.dur.toFixed(1).replace(".", ",") + " s · " + V.dados.cenas.length + " cenas · " + VF[V.fmt][0] + "×" + VF[V.fmt][1];
    (function laco(a) { if (!document.body.contains(cv)) return; if (!V.gerando) { var t = ((a - t0) / 1000) % V.dados.dur; desenhar(cx, cv.width, cv.height, t, V.dados); } V.raf = requestAnimationFrame(laco); })(t0);
  }
  async function videoGerar() {
    var b = BW(); if (!V.dados || V.gerando) return;
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) { b.aviso("Este navegador não grava vídeo. Use o Chrome, Edge ou Safari atualizado.", true); return; }
    var f = VF[V.fmt], k = V.qual / Math.min(f[0], f[1]), W = Math.round(f[0] * k / 2) * 2, H = Math.round(f[1] * k / 2) * 2;
    V.gerando = true; V.parar = false; $("pmVgerar").disabled = true; $("pmVcancelar").hidden = false; $("pmVbarra").hidden = false; $("pmVpronto").hidden = true;
    try {
      var res = await BWReelsCelular.gerar({ largura: W, altura: H, fps: 30, duracao: V.dados.dur, som: null, alturaSaida: H,
        desenhar: function (tt, ctx, w, h) { desenhar(ctx, w, h, tt, V.dados); }, cancelar: function () { return V.parar; },
        aoProgredir: function (p) { var bb = $("pmVbarra"); if (bb) bb.value = p.pct; var i = $("pmVinfo"); if (i) i.textContent = (p.etapa || "Gerando") + "… " + Math.round(p.pct || 0) + "%"; } });
      if (V.url) URL.revokeObjectURL(V.url); var nome = b.nomeArq(b.atual(), "mp4").replace(/\.mp4$/, "-video.mp4");
      V.arq = new File([res.blob], nome, { type: "video/mp4" }); V.url = URL.createObjectURL(res.blob);
      $("pmVvideo").src = V.url; $("pmVbaixar").href = V.url; $("pmVbaixar").download = nome; $("pmVpronto").hidden = false; b.baixar(res.blob, nome);
      $("pmVinfo").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + V.dados.dur.toFixed(1).replace(".", ",") + " s, sem música — põe a trilha no editor de vídeo).";
    } catch (e) { var i2 = $("pmVinfo"); if (i2) i2.textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); }
    finally { V.gerando = false; var g = $("pmVgerar"); if (g) g.disabled = false; var c = $("pmVcancelar"); if (c) c.hidden = true; var bb = $("pmVbarra"); if (bb) bb.hidden = true; }
  }

  /* ================= 🔗 LINK PÚBLICO ================= */
  function cliente() { return window.BWSync && BWSync.cliente && BWSync.cliente(); }
  function token() { var a = new Uint8Array(12); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (x) { return ("0" + (x % 36).toString(36)).slice(-1); }).join("") + Date.now().toString(36).slice(-6); }
  function urlDe(tok) { return SITE + "kit.html?k=" + tok; }
  function blobDe(u) { var m = /^data:([^;]+);base64,(.*)$/.exec(u || ""); if (!m) return null; var bin = atob(m[2]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m[1] }); }
  function linkAbrir() {
    var b = BW(), k = b.atual(); if (!k) return; var pub = k.pub;
    b.modal(X + "<h3>🔗 Link do seu press kit</h3>" + (pub && pub.token ?
      "<p class=\"tf-sub\">No ar desde " + esc(new Date(pub.em).toLocaleString("pt-BR")) + ". Quem abrir o link vê as partes <b>ligadas</b>, as fotos e os botões de contato, e pode baixar o PDF.</p>" +
      "<input class=\"pk-in\" id=\"pmLurl\" readonly value=\"" + esc(pub.url) + "\" style=\"font-size:16px\">" +
      "<div class=\"pk-chips\" style=\"margin-top:10px\"><button type=\"button\" class=\"bw-btn pri\" data-a=\"pmLcopiar\">⧉ COPIAR</button><a class=\"bw-btn\" href=\"" + esc(pub.url) + "\" target=\"_blank\" rel=\"noopener\">↗ ABRIR</a>" +
      "<a class=\"bw-btn\" target=\"_blank\" rel=\"noopener\" href=\"https://wa.me/?text=" + encodeURIComponent((k.d && k.d.marca ? k.d.marca + " — press kit: " : "Press kit: ") + pub.url) + "\">WHATSAPP</a></div>" +
      "<div class=\"pk-chips\" style=\"margin-top:10px\"><button type=\"button\" class=\"bw-btn\" data-a=\"pmLpublicar\">↻ ATUALIZAR A PÁGINA</button><button type=\"button\" class=\"bw-btn perigo\" data-a=\"pmLtirar\">✕ TIRAR DO AR</button></div>"
      : "<p class=\"tf-sub\">Cria uma <b>página pública</b> do seu press kit, com link para mandar no WhatsApp, Instagram ou e-mail. Vão só as partes <b>ligadas</b>, as fotos como estão no PDF, os botões de contato e o PDF para baixar. Quem tem o link vê; você tira do ar quando quiser.</p>" +
        "<label class=\"pk-aj\" style=\"display:flex;gap:8px;align-items:flex-start\"><input type=\"checkbox\" id=\"pmLok\" style=\"width:auto;min-height:0;margin-top:3px\"><span>As fotos são minhas ou tenho autorização para publicar, e quero que quem tiver o link veja os meus contatos.</span></label>" +
        "<div class=\"pk-chips\" style=\"margin-top:12px\"><button type=\"button\" class=\"bw-btn pri\" data-a=\"pmLpublicar\">🔗 CRIAR O LINK</button></div>") +
      "<p class=\"tf-sub\" id=\"pmLmsg\" style=\"margin-top:10px\"></p>");
  }
  function dadosPub(k, urls, b) {
    var d = k.d || {}, vis = b.visiveis(k), tit = {}, s = {}; vis.forEach(function (id) { tit[id] = b.titulo(k, id); });
    var tem = function (id) { return vis.indexOf(id) >= 0; }, cr = b.coresDe(k), mod = b.modelos.filter(function (m) { return m.id === k.modelo; })[0] || {};
    var cards = function (l, arr) { return (arr || []).map(function (x, i) { var o = Object.assign({}, x); delete o.foto; if (urls.cards[l] && urls.cards[l][i]) o.foto = urls.cards[l][i]; return o; }); };
    if (tem("sobre")) s.sobre = { curto: d.sobreCurto || "", texto: d.sobre || "" };
    ["perfil", "numeros", "formacao", "depoimentos", "imprensa", "agenda"].forEach(function (id) { if (tem(id)) s[id] = d[id] || []; });
    if (tem("servicos")) s.servicos = cards("servicos", d.servicos); if (tem("experiencia")) s.experiencia = cards("experiencia", d.experiencia); if (tem("links")) s.links = cards("links", d.links);
    if (tem("clientes")) s.clientes = d.clientes || ""; if (tem("habilidades")) s.habilidades = d.habilidades || ""; if (tem("rider")) s.rider = { itens: d.rider || "", obs: d.riderObs || "" };
    if (tem("release")) s.release = d.release || {}; if (tem("galeria")) s.galeria = { fotos: urls.fotos, legenda: d.galeriaLegenda || "" };
    if (tem("contato")) s.contato = d.contato || {};
    return { v: 1, idioma: k.idioma || "pt", tema: { fundo: cr.fundo, cor: cr.destaque, cor2: cr.cor2, fonte: k.fonte || mod.fonte || "MO" },
      marca: d.marca || "", slogan: d.slogan || "", etiqueta: d.etiqueta || "", cidade: d.cidade || "", ordem: vis, titulos: tit, s: s,
      capa: urls.capa || "", retrato: urls.retrato || "", logo: urls.logo || "", pdf: urls.pdf || "", em: new Date().toISOString() };
  }
  async function publicar() {
    var b = BW(), k0 = b.atual(), msg = $("pmLmsg"), sb = cliente(); if (!k0) return;
    if (!(k0.pub && k0.pub.token) && !($("pmLok") && $("pmLok").checked)) { if (msg) msg.textContent = "Marque a caixinha de autorização para continuar."; return; }
    var s = await b.sessao(); if (!s || !sb) { if (msg) msg.textContent = "Entre na sua conta para criar o link."; return; }
    await b.guardarAgora(); var k = b.atual(), tok = (k.pub && k.pub.token) || token(), ver = Date.now().toString(36);
    var escrever = function (t) { if (msg) msg.textContent = t; b.andamento(t); };
    try {
      escrever("Reservando o link…");
      if (!(k.pub && k.pub.token)) { var r0 = await sb.from("bw_presskit_pub").insert({ token: tok, kit_id: k.id, dados: { v: 0 } }); if (r0.error) throw r0.error; }
      escrever("Preparando as fotos…"); var im = await b.imagensPub(), urls = { fotos: [], cards: {} }, n = 0;
      var subir = async function (dataUrl, nome) { var bl = blobDe(dataUrl); if (!bl) return ""; var cam = tok + "/" + ver + "/" + nome + (/png/.test(bl.type) ? ".png" : ".jpg"); var up = await sb.storage.from(BALDE).upload(cam, bl, { contentType: bl.type, upsert: false, cacheControl: "31536000" }); if (up.error) throw up.error; n++; escrever("Enviando as fotos… " + n); return sb.storage.from(BALDE).getPublicUrl(cam).data.publicUrl; };
      if (im.capa) urls.capa = await subir(im.capa, "capa"); if (im.retrato) urls.retrato = await subir(im.retrato, "retrato"); if (im.logo) urls.logo = await subir(im.logo, "logo");
      for (var i = 0; i < im.fotos.length; i++) urls.fotos.push(await subir(im.fotos[i], "foto-" + (i + 1)));
      for (var l in im.cards) { urls.cards[l] = []; for (var j = 0; j < im.cards[l].length; j++) urls.cards[l].push(im.cards[l][j] ? await subir(im.cards[l][j], l + "-" + (j + 1)) : ""); }
      escrever("Gerando o PDF…"); var pdf = await b.gerarPdfBytes(), cp = tok + "/" + ver + "/press-kit.pdf", upP = await sb.storage.from(BALDE).upload(cp, new Blob([pdf], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false }); if (upP.error) throw upP.error;
      urls.pdf = sb.storage.from(BALDE).getPublicUrl(cp).data.publicUrl;
      escrever("Publicando…"); var r1 = await sb.from("bw_presskit_pub").update({ dados: dadosPub(k, urls, b), atualizado: new Date().toISOString() }).eq("token", tok); if (r1.error) throw r1.error;
      await limparVersoes(sb, tok, ver);
      k.pub = { token: tok, url: urlDe(tok), em: new Date().toISOString() }; b.salvarKit(k); await b.guardarAgora(); b.andamento(""); linkAbrir(); b.aviso("🔗 Link no ar ✓");
    } catch (e) { b.andamento(""); var t = String(e && (e.message || e.error) || e); if (msg) msg.textContent = /relation|does not exist|bucket not found|not found/i.test(t) ? "O link ainda está sendo ativado na plataforma. Tente mais tarde." : /LIMITE_PAGINAS/.test(t) ? "Você já tem 20 páginas no ar. Tire uma do ar para criar outra." : /row-level|policy|permission/i.test(t) ? "Sem permissão para publicar (" + t + ")." : "Não deu para publicar agora: " + t; }
  }
  async function limparVersoes(sb, tok, manter) {
    try { var l = await sb.storage.from(BALDE).list(tok, { limit: 100 }); if (l.error || !l.data) return;
      for (var i = 0; i < l.data.length; i++) { var p = l.data[i].name; if (p === manter) continue; var f = await sb.storage.from(BALDE).list(tok + "/" + p, { limit: 200 }); if (f.data && f.data.length) await sb.storage.from(BALDE).remove(f.data.map(function (x) { return tok + "/" + p + "/" + x.name; })); } } catch (e) { }
  }
  async function tirar() {
    var b = BW(), k = b.atual(), sb = cliente(), msg = $("pmLmsg"); if (!k || !k.pub) return;
    if (!confirm("Tirar a página do ar? Quem tiver o link vai ver \"página não encontrada\". O seu press kit continua aqui.")) return;
    try { if (msg) msg.textContent = "Tirando do ar…"; await limparVersoes(sb, k.pub.token, "__nenhuma__"); var r = await sb.from("bw_presskit_pub").delete().eq("token", k.pub.token); if (r.error) throw r.error;
      delete k.pub; b.salvarKit(k); await b.guardarAgora(); b.fecharModal(); b.aviso("Página tirada do ar"); }
    catch (e) { if (msg) msg.textContent = "Não deu agora: " + (e.message || e); }
  }

  /* ================= ações ================= */
  async function acao(a, el) {
    var b = BW(); if (!b) return;
    if (a === "pkIdioma") idiomaAbrir();
    else if (a === "pmTraduzir") await traduzir(el.getAttribute("data-l"));
    else if (a === "pkVideo") await videoAbrir();
    else if (a === "pmVfmt") { V.fmt = el.getAttribute("data-v"); [].forEach.call($("pmVfmt").children, function (x) { x.classList.toggle("on", x === el); }); previa(); }
    else if (a === "pmVq") { V.qual = +el.getAttribute("data-v"); [].forEach.call($("pmVq").children, function (x) { x.classList.toggle("on", x === el); }); }
    else if (a === "pmVgerar") await videoGerar();
    else if (a === "pmVcancelar") V.parar = true;
    else if (a === "pmVcomp") { if (V.arq && navigator.canShare && navigator.canShare({ files: [V.arq] })) { try { await navigator.share({ files: [V.arq], title: "Press kit" }); } catch (e) { } } else b.aviso("Use o ⬇ BAIXAR e envie pelo app que quiser"); }
    else if (a === "pkLink") linkAbrir();
    else if (a === "pmLpublicar") await publicar();
    else if (a === "pmLtirar") await tirar();
    else if (a === "pmLcopiar") { var u = $("pmLurl"); try { await navigator.clipboard.writeText(u.value); b.aviso("Link copiado ✓"); } catch (e) { u.select(); document.execCommand("copy"); b.aviso("Link copiado ✓"); } }
  }
  window.BWPressKitMais = { acao: acao, _desenhar: desenhar, _preparar: prepararVideo, _dadosPub: dadosPub, _coletar: coletar, V: V };
})();
