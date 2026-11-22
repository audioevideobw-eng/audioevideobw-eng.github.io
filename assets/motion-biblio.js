/* BIBLIOTECA INTEGRADA do Estúdio de motion (22/11/2026, Claude) — o que já existe nas outras ferramentas, num lugar só:
   personagens prontos (bonecos 3D da Brightway), objetos realistas e desenhos dos convites, meus personagens, minhas criações
   (imagens) e emojis. Tocar num item = ele entra na tela como imagem (a cópia é feita AQUI no aparelho, em data:, para valer no
   vídeo feito no aparelho e no app BW do PC). Este arquivo só LÊ: não grava na conta, não envia nada (vigia 7.8k). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var ABAS = [["des", "🎨 DESENHOS"], ["pers", "🧍 PERSONAGENS"], ["obj", "📸 OBJETOS REAIS"], ["meus", "👤 MEUS PERSONAGENS"], ["cria", "✨ MINHAS CRIAÇÕES"], ["emo", "😀 EMOJIS"]];
  var EMOJIS = "🔥 ✨ 🎉 🎊 🎈 🎁 🎂 🥂 🍾 🍻 🍷 🎵 🎶 🎤 🎧 🎸 🥁 🎬 🎥 📸 📹 💡 🚀 ⭐ 🌟 💥 ⚡ 💯 ✅ ❌ ❤️ 💜 💙 💚 💛 🧡 😍 🤩 😎 🥳 😂 😱 🤯 👏 🙌 👍 👉 👀 💬 📢 📍 🗓️ ⏰ 💰 📈 🏆 🥇 ⚽ 🏀 🎮 🕹️ 🛒 💼 🏠 🌴 🌙 ☀️ 🌈 🌸 🦄 🐶 🐱 🍕 🍔 ☕".split(" ");
  var ABA = "des", URLS = [];   /* começa nos desenhos (nada carregado de fora até a pessoa abrir outra aba) */

  function api() { return window.BWMotionEditor; }
  function soltar() { URLS.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} }); URLS = []; }
  function objUrl(blob) { var u = URL.createObjectURL(blob); URLS.push(u); return u; }
  /* imagem → data: reduzida (no máximo 900 px), PNG para manter o transparente */
  function paraData(src, max) {
    return new Promise(function (ok, erro) {
      var im = new Image(); if (/^https:/.test(src)) im.crossOrigin = "anonymous";
      im.onload = function () {
        var k = Math.min(1, (max || 900) / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        try { ok({ url: c.toDataURL("image/png"), prop: c.height / c.width }); } catch (e) { erro(e); }
      };
      im.onerror = function () { erro(new Error("não abriu a imagem")); }; im.src = src;
    });
  }
  async function usar(src, op) {
    var A = api(); if (!A || !A.adicionarImagem) return;
    A.aviso("Trazendo " + (op.nome || "a imagem") + "…");
    try { var d = await paraData(src, op.max); A.adicionarImagem(d.url, Object.assign({ prop: d.prop }, op)); }
    catch (e) { A.aviso("Não consegui trazer essa imagem (" + (e && e.message || "erro") + "). Confira a internet e tente de novo.", true); }
  }

  function grade(lista) {
    if (!lista.length) return "";
    return '<div class="mo-bib">' + lista.map(function (q, i) {
      return '<button type="button" data-bib="' + i + '" title="' + esc(q.nome) + '">' + (q.emoji ? '<b class="emo">' + q.emoji + "</b>" : '<img alt="" loading="lazy" src="' + esc(q.mini) + '">') + "<span>" + esc(q.nome) + "</span></button>";
    }).join("") + "</div>";
  }
  var ATUAL = [];
  async function listar(aba) {
    var l = [];
    if (aba === "pers") {
      var P = window.BWPersonagensProntos; (P ? P.lista : []).forEach(function (p) {
        (P.ANGULOS || [["frente", "FRENTE"]]).forEach(function (a) { if (p.planos[a[0]]) l.push({ nome: p.nome + " · " + a[1].toLowerCase(), mini: p.planos[a[0]], src: p.planos[a[0]], op: { nome: p.nome, semFundo: false, loop: "flutuar" } }); });
      });
    } else if (aba === "obj" || aba === "des") {
      var A = window.BWConviteAnim; if (A) Object.keys(A.ITENS).forEach(function (id) {
        var it = A.ITENS[id], real = !!it.foto; if ((aba === "obj") !== real) return;
        var mini = real ? it.foto : A.mini(id, 120); l.push({ nome: it.nome, mini: mini, src: real ? it.foto : null, id: id, op: { nome: it.nome, semFundo: true, loop: real ? (it.mov === "rodar" || it.mov === "girar" ? "balancar" : "flutuar") : "balancar" } });
      });
    } else if (aba === "meus") {
      var B = window.BWPersonagens, rs = B ? await B.listar() : [];
      rs.forEach(function (r) { var b = B.principal(r) || r.blob; if (b instanceof Blob) { var u = objUrl(b); l.push({ nome: r.nome || "Personagem", mini: u, src: u, op: { nome: r.nome || "Personagem", semFundo: true, loop: "flutuar" } }); } });
    } else if (aba === "cria") {
      var C = window.BWCriacoes, cs = C ? await C.listar() : [];
      for (var i = 0; i < cs.length; i++) { if (cs[i].tipo !== "imagem") continue; l.push({ nome: cs[i].nome, mini: cs[i].capa, cria: cs[i].id, op: { nome: cs[i].nome, semFundo: false, loop: "nenhum" } }); }
    } else if (aba === "emo") {
      EMOJIS.forEach(function (e) { if (e) l.push({ nome: e, emoji: e }); });
    }
    return l;
  }
  var VAZIO = { pers: "Os personagens prontos não carregaram.", obj: "Os objetos não carregaram.", des: "Os desenhos não carregaram.",
    meus: 'Você ainda não tem personagens com imagem. Crie em <a href="personagens.html">PERSONAGENS</a>.', cria: 'Nenhuma imagem guardada ainda. Mande para a linha do tempo pelo Editor de fotos, Criador IA ou Estúdio 3D.', emo: "" };
  async function desenhar() {
    var box = $("moBib"); if (!box) return;
    soltar(); ATUAL = await listar(ABA);
    box.innerHTML = '<div class="mo-chips mo-bib-abas">' + ABAS.map(function (a) { return '<button type="button" data-bibaba="' + a[0] + '"' + (a[0] === ABA ? ' class="on"' : "") + ">" + a[1] + "</button>"; }).join("") + "</div>" +
      (ATUAL.length ? grade(ATUAL) : '<div class="mo-vazio">' + VAZIO[ABA] + "</div>");
  }
  async function tocar(i) {
    var q = ATUAL[i], A = api(); if (!q || !A) return;
    if (q.emoji) return A.adicionarEmoji(q.emoji);
    if (q.id && !q.src) {   /* desenho do convite → imagem grande, desenhada agora no aparelho */
      var C = window.BWConviteAnim, c = document.createElement("canvas"); c.width = c.height = 720; var x = c.getContext("2d"); x.translate(360, 360); x.scale(6, 6);
      try { C.ITENS[q.id].f(x, 0.4); } catch (e) {} return A.adicionarImagem(c.toDataURL("image/png"), Object.assign({ prop: 1 }, q.op));
    }
    if (q.cria) { var r = await window.BWCriacoes.pegar(q.cria); if (!r || !r.blob) return A.aviso("Não achei essa criação.", true); return usar(objUrl(r.blob), q.op); }
    return usar(q.src, q.op);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-bibaba]"); if (a) { ABA = a.getAttribute("data-bibaba"); desenhar(); return; }
    var b = e.target.closest("#moBib [data-bib]"); if (b) tocar(+b.getAttribute("data-bib"));
  });
  function iniciar() { if ($("moBib")) desenhar(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.BWMotionBiblio = { desenhar: desenhar, aba: function (a) { ABA = a; return desenhar(); }, lista: function () { return ATUAL; }, tocar: tocar };
})();
