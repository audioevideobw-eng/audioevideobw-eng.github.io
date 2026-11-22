/* EDITOR DE FOTOS — TELA DE ENTRADA com BIBLIOTECA (22/11, dono: "layout de entrada mais moderno, do jeito do vídeo, com biblioteca e tudo mais").
   A foto é o assunto: palco grande no centro (soltar/escolher fotos, fotos desta sessão, ABRIR O EDITOR) e a BIBLIOTECA ao lado
   (RECENTES = as últimas fotos abertas NESTE aparelho · CRIAÇÕES = imagens das outras ferramentas · ★ MINHA MARCA).
   Tudo fica no aparelho (IndexedDB bw_fotos_rec): este arquivo não usa rede, conta nem nuvem (vigia 7.8a). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var MAX = 40, PULAR = false, DB = null, SEL = {}, ABA = "rec", REC = [], CRI = [];
  try { ABA = localStorage.getItem("ui_fotos_lib_aba") || "rec"; } catch (e) {}

  function abrirDB() {
    if (DB) return DB;
    DB = new Promise(function (ok) {
      if (!window.indexedDB) return ok(null);
      var r = indexedDB.open("bw_fotos_rec", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("fotos", { keyPath: "id" }); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { ok(null); };
    });
    return DB;
  }
  async function op(modo, fn) { var db = await abrirDB(); if (!db) return null; return new Promise(function (ok) { try { var t = db.transaction("fotos", modo), q = fn(t.objectStore("fotos")); t.oncomplete = function () { ok(q && q.result); }; t.onerror = t.onabort = function () { ok(null); }; } catch (e) { ok(null); } }); }
  async function lerRecentes() { var l = (await op("readonly", function (s) { return s.getAll(); })) || []; l.sort(function (a, b) { return b.quando - a.quando; }); return l; }

  /* guardar as fotos novas da sessão (cópia do arquivo + miniatura), mantendo só as MAX mais recentes */
  var vistos = new WeakSet();
  async function guardarNovas() {
    var F = window.__fotos && window.__fotos.FOTOS; if (!F) return; var novas = 0;
    if (PULAR) { F.forEach(function (f) { vistos.add(f); }); return; }   /* fotos que vieram da própria biblioteca: já estão lá */
    for (var i = 0; i < F.length; i++) { var f = F[i]; if (vistos.has(f) || !f.file) continue; vistos.add(f); if (f._daLib) continue;
      var capa = ""; try { var c = document.createElement("canvas"), s = Math.min(1, 240 / Math.max(f.prev.width, f.prev.height)); c.width = Math.round(f.prev.width * s); c.height = Math.round(f.prev.height * s); c.getContext("2d").drawImage(f.prev, 0, 0, c.width, c.height); capa = c.toDataURL("image/jpeg", 0.7); } catch (e) {}
      var id = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await op("readwrite", function (s) { return s.put({ id: id, nome: f.nome || "foto", blob: f.file, tipo: f.file.type || "image/jpeg", capa: capa, w: f.w, h: f.h, bytes: f.file.size || 0, quando: Date.now() }); }); novas++; }
    if (!novas) return;
    var l = await lerRecentes(); for (var k = MAX; k < l.length; k++) { var x = l[k].id; await op("readwrite", function (s) { return s.delete(x); }); }
    await carregar();
  }

  async function carregar() {
    REC = await lerRecentes();
    try { CRI = window.BWCriacoes ? (await BWCriacoes.listar()).filter(function (c) { return /^image\//.test(c.tipo || "") || c.tipo === "imagem"; }) : []; } catch (e) { CRI = []; }
    desenhar();
  }
  function mb(b) { return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function desenhar() {
    var box = $("fiLib"); if (!box) return;
    box.querySelectorAll("[data-fiaba]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-fiaba") === ABA); });
    var lista = ABA === "cri" ? CRI : REC, g = $("fiGrade");
    if (ABA === "marca") { g.innerHTML = '<div class="fi-vazio">★ <b>MINHA MARCA</b> guarda logos, cores, molduras, textos e padrões da empresa para usar com um toque.<br><button type="button" class="bw-btn" id="fiMarca">★ ABRIR MINHA MARCA</button></div>'; $("fiMarca").onclick = function () { $("abrirMarca").click(); }; $("fiAcoes").hidden = true; return; }
    $("fiAcoes").hidden = !lista.length;
    if (!lista.length) { g.innerHTML = '<div class="fi-vazio">' + (ABA === "cri" ? "Nada aqui ainda. As imagens que você manda das outras ferramentas (Criador IA, 3D, Personagens…) aparecem aqui." : "As fotos que você abrir ficam guardadas aqui, só neste aparelho, para voltar a editar depois.") + "</div>"; return; }
    g.innerHTML = lista.map(function (x) { var on = SEL[x.id] ? " on" : ""; return '<button type="button" class="fi-item' + on + '" data-fiid="' + x.id + '" title="' + (x.nome || "") + (x.bytes ? " · " + mb(x.bytes) : "") + '"><img alt="" loading="lazy" src="' + (x.capa || "") + '"><i aria-hidden="true">✓</i><span>' + String(x.nome || "").replace(/</g, "&lt;") + "</span></button>"; }).join("");
    var n = Object.keys(SEL).filter(function (k) { return SEL[k] && lista.some(function (x) { return x.id === k; }); }).length;
    $("fiAbrirSel").textContent = n ? "✎ EDITAR " + n + (n > 1 ? " FOTOS" : " FOTO") : "✎ EDITAR TODAS";
    $("fiApagar").hidden = ABA !== "rec" || !n;
  }

  async function abrirIds(ids) {
    var lista = ABA === "cri" ? CRI : REC, arqs = [];
    for (var i = 0; i < ids.length; i++) { var x = lista.filter(function (y) { return y.id === ids[i]; })[0]; if (!x) continue;
      var blob = x.blob; if (ABA === "cri") { try { var c = await BWCriacoes.pegar(x.id); blob = c && c.blob; } catch (e) { blob = null; } }
      if (blob) arqs.push(new File([blob], (x.nome || "foto").replace(/\.[^.]+$/, "") + (/png/.test(blob.type) ? ".png" : ".jpg"), { type: blob.type || "image/jpeg" })); }
    if (!arqs.length) return;
    var F = window.__fotos.FOTOS, n0 = F.length;
    PULAR = ABA === "rec"; try { await window.__fotos.adicionar(arqs, true); } finally { for (var k = n0; k < F.length; k++) vistos.add(F[k]); PULAR = false; }
    SEL = {}; desenhar();
  }

  function montar() {
    var wrap = document.querySelector(".wrap"), card = wrap && wrap.querySelector(".tf-card"); if (!card || $("fiCasca")) return;
    var solta = $("solta"), lista = $("lista"), abrir = $("abrirEd"), marca = $("abrirMarca");
    var casca = document.createElement("div"); casca.id = "fiCasca"; casca.className = "fi-casca";
    casca.innerHTML =
      '<section class="fi-palco" id="fiPalco"><div class="fi-palco-in">' +
        '<div class="fi-tit"><b>EDITOR DE FOTOS</b><span>ajuste, texto, logo, molduras, IA e carrossel — numa foto ou em todas de uma vez · nada sai do aparelho</span></div>' +
        '<div class="fi-solta-slot"></div><div class="fi-sessao"><div class="fi-sub" id="fiSessaoTit" hidden>NESTA SESSÃO</div><div class="fi-lista-slot"></div><div class="fi-abrir-slot"></div></div>' +
      "</div></section>" +
      '<aside class="fi-lib" id="fiLib" aria-label="Biblioteca de fotos">' +
        '<div class="fi-lib-top"><b>BIBLIOTECA</b><span class="fi-aviso">só neste aparelho</span></div>' +
        '<div class="fi-abas" role="tablist"><button type="button" data-fiaba="rec">🕘 RECENTES</button><button type="button" data-fiaba="cri">✨ CRIAÇÕES</button><button type="button" data-fiaba="marca">★ MARCA</button></div>' +
        '<div class="fi-grade" id="fiGrade"></div>' +
        '<div class="fi-acoes" id="fiAcoes" hidden><button type="button" class="bw-btn" id="fiAbrirSel">✎ EDITAR TODAS</button><button type="button" class="bw-btn" id="fiApagar" hidden>🗑 TIRAR</button></div>' +
      "</aside>";
    wrap.insertBefore(casca, card);
    solta.classList.add("fi-solta"); [].slice.call(solta.childNodes).forEach(function (n) { if (n.id !== "arquivos") solta.removeChild(n); }); solta.insertAdjacentHTML("beforeend", '<span class="fi-ic" aria-hidden="true">📷</span><b>SOLTE AS FOTOS AQUI</b><span>ou toque para escolher (pode escolher várias · JPG, PNG, HEIC)</span><span class="bw-btn fi-escolher">＋ ESCOLHER FOTOS</span>');
    casca.querySelector(".fi-solta-slot").appendChild(solta);
    casca.querySelector(".fi-lista-slot").appendChild(lista); casca.querySelector(".fi-abrir-slot").appendChild(abrir);
    abrir.classList.add("fi-abrir"); card.hidden = true;
    var mrow = document.createElement("div"); mrow.className = "fi-marca-linha"; mrow.appendChild(marca); casca.querySelector(".fi-sessao").appendChild(mrow);
    new MutationObserver(function () { $("fiSessaoTit").hidden = !lista.children.length; guardarNovas(); }).observe(lista, { childList: true });
    casca.addEventListener("click", function (e) {
      var a = e.target.closest("[data-fiaba]"); if (a) { ABA = a.getAttribute("data-fiaba"); SEL = {}; try { localStorage.setItem("ui_fotos_lib_aba", ABA); } catch (x) {} desenhar(); return; }
      var it = e.target.closest("[data-fiid]"); if (it) { var id = it.getAttribute("data-fiid"); if (e.detail >= 2) { abrirIds([id]); return; } SEL[id] = !SEL[id]; desenhar(); return; }
    });
    casca.addEventListener("dblclick", function (e) { var it = e.target.closest("[data-fiid]"); if (it) { e.preventDefault(); } });
    $("fiAbrirSel").onclick = function () { var lista2 = ABA === "cri" ? CRI : REC, ids = lista2.filter(function (x) { return SEL[x.id]; }).map(function (x) { return x.id; }); abrirIds(ids.length ? ids : lista2.map(function (x) { return x.id; })); };
    $("fiApagar").onclick = async function () { var ids = REC.filter(function (x) { return SEL[x.id]; }).map(function (x) { return x.id; }); if (!ids.length || !confirm("Tirar " + ids.length + " foto(s) da biblioteca deste aparelho? (o arquivo original no seu celular/PC continua)")) return;
      for (var i = 0; i < ids.length; i++) { var x = ids[i]; await op("readwrite", function (s) { return s.delete(x); }); } SEL = {}; carregar(); };
    carregar();
  }
  window.BWFotosInicio = { recarregar: carregar, recentes: function () { return REC; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
