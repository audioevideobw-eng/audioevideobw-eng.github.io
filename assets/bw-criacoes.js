/* BIBLIOTECA DE CRIAÇÕES (20/11/2026, Claude) — a ponte entre as ferramentas de criação e a LINHA DO TEMPO.
   Toda criação (motion, telas, 3D, fotos, criador IA, reels) pode ser mandada para o EDITOR DE VÍDEO com um botão,
   e de lá reaberta na ferramenta que a fez (✎ EDITAR) — a nova versão troca no lugar, sem mexer na linha do tempo.
   NADA sai do aparelho: este arquivo não envia nada para a internet nem para a conta. Fica tudo no IndexedDB bw_criacoes
   (+ preferências ui_* locais). */
(function () {
  "use strict";
  var VERSAO = 1, LOJA = "criacoes", BANCO = "bw_criacoes";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var uid = function () { return "cr" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  /* as ferramentas que alimentam a linha do tempo (quem cria entra aqui) */
  var FERR = {
    motion:  { nome: "ESTÚDIO DE MOTION",   curto: "Motion",     icone: "◆", pagina: "motion.html",   cor: "#B14DFF" },
    telas:   { nome: "TELAS EM MOVIMENTO",  curto: "Telas",      icone: "▦", pagina: "telas.html",    cor: "#22B8CF" },
    album:   { nome: "ÁLBUM 3D E EFEITOS",  curto: "Álbum 3D",   icone: "❒", pagina: "album3d.html",  cor: "#FF4FA3" },
    d3:      { nome: "ESTÚDIO 3D",          curto: "3D",         icone: "◼", pagina: "3d.html",       cor: "#F5A524" },
    fotos:   { nome: "EDITOR DE FOTOS",     curto: "Foto",       icone: "✦", pagina: "fotos.html",    cor: "#12B76A" },
    criador: { nome: "CRIADOR IA",          curto: "Criador IA", icone: "✨", pagina: "criador.html",  cor: "#FF6B9A" },
    reels:   { nome: "BW REELS PRO",        curto: "Reels",      icone: "🎬", pagina: "reels.html",    cor: "#7C5CFF" },
    quadro:  { nome: "QUADRO DE HISTÓRIA",  curto: "Quadro",     icone: "🧩", pagina: "reels.html?quadro=1", cor: "#7C5CFF" }
  };

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() {
    return new Promise(function (ok, erro) {
      if (DB) return ok(DB);
      var r = indexedDB.open(BANCO, VERSAO);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains(LOJA)) d.createObjectStore(LOJA, { keyPath: "id" }); };
      r.onsuccess = function () { DB = r.result; ok(DB); };
      r.onerror = function () { erro(r.error || new Error("banco")); };
    });
  }
  function op(modo, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, erro) {
        var t = d.transaction(LOJA, modo), q = fn(t.objectStore(LOJA));
        t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { erro(t.error); };
      });
    });
  }

  /* ---------- capa e duração (no aparelho) ---------- */
  function capaDe(blob, tipo) {
    return new Promise(function (ok) {
      var url = URL.createObjectURL(blob), fim = function (v) { URL.revokeObjectURL(url); ok(v || ""); };
      function doEl(el) {
        try {
          var l = 200, a = (el.videoWidth || el.naturalWidth || 16), b = (el.videoHeight || el.naturalHeight || 9);
          var c = document.createElement("canvas"); c.width = l; c.height = Math.max(1, Math.round(l * b / a));
          c.getContext("2d").drawImage(el, 0, 0, c.width, c.height); fim(c.toDataURL("image/jpeg", 0.72));
        } catch (e) { fim(""); }
      }
      if (tipo === "imagem") { var im = new Image(); im.onload = function () { doEl(im); }; im.onerror = function () { fim(""); }; im.src = url; return; }
      if (tipo !== "video") return fim("");
      var v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto";
      var feito = false, pronto = function () { if (feito) return; feito = true; doEl(v); try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} };
      v.onloadeddata = function () { try { v.currentTime = Math.min(0.3, (v.duration || 1) / 2); } catch (e) { pronto(); } };
      v.onseeked = pronto; v.onerror = function () { if (!feito) { feito = true; fim(""); try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} } }; setTimeout(pronto, 3500); v.src = url;
    });
  }
  function duracaoDe(blob, tipo) {
    return new Promise(function (ok) {
      if (tipo !== "video") return ok(0);
      var url = URL.createObjectURL(blob), v = document.createElement("video");
      var fim = function (d) { try { v.onloadeddata = v.onseeked = v.onerror = null; v.removeAttribute("src"); v.load(); } catch (x) {} URL.revokeObjectURL(url); ok(isFinite(d) && d > 0 ? Math.round(d * 100) / 100 : 0); };
      v.preload = "metadata"; v.muted = true;
      v.onloadedmetadata = function () { fim(v.duration); }; v.onerror = function () { fim(0); }; setTimeout(function () { fim(v.duration); }, 4000); v.src = url;
    });
  }

  /* ---------- guardar / listar / apagar ---------- */
  async function guardar(c) {
    if (!c || !c.blob) throw new Error("sem arquivo");
    var tipo = c.tipo || (/^video\//.test(c.blob.type) ? "video" : "imagem");
    var reg = {
      id: c.id || uid(),
      nome: String(c.nome || (FERR[c.ferramenta] ? FERR[c.ferramenta].curto : "Criação")).slice(0, 70),
      tipo: tipo, blob: c.blob, bytes: c.blob.size,
      dur: c.dur || await duracaoDe(c.blob, tipo),
      capa: await capaDe(c.blob, tipo),
      ferramenta: FERR[c.ferramenta] ? c.ferramenta : "",
      projeto: c.projeto ? String(c.projeto) : "",
      criado: Date.now()
    };
    await op("readwrite", function (s) { return s.put(reg); });
    return reg;
  }
  async function listar() {
    var l = [];
    try { l = (await op("readonly", function (s) { return s.getAll(); })) || []; } catch (e) { return []; }
    l.sort(function (a, b) { return (b.criado || 0) - (a.criado || 0); });
    return l.map(function (x) { return { id: x.id, nome: x.nome, tipo: x.tipo, dur: x.dur, bytes: x.bytes, capa: x.capa, ferramenta: x.ferramenta, projeto: x.projeto, criado: x.criado }; });
  }
  function pegar(id) { return op("readonly", function (s) { return s.get(id); }).catch(function () { return null; }); }
  function apagar(id) { return op("readwrite", function (s) { return s.delete(id); }).catch(function () { return null; }); }

  /* ---------- de onde vim (a volta para a linha do tempo) ---------- */
  function deOnde() {
    var q = {};
    try { var u = new URLSearchParams(location.search); q = { voltar: u.get("voltar") || "", criacao: u.get("criacao") || "", projeto: u.get("p") || "" }; } catch (e) { q = { voltar: "", criacao: "", projeto: "" }; }
    return q;
  }
  function paraEditar() { var q = deOnde(); return q.voltar === "video" ? q : null; }
  function url(ferr, projeto, extra) {
    var f = FERR[ferr]; if (!f) return "video.html";
    var u = f.pagina + (f.pagina.indexOf("?") < 0 ? "?" : "&");
    var ps = [];
    if (projeto) ps.push("p=" + encodeURIComponent(projeto));
    Object.keys(extra || {}).forEach(function (k) { if (extra[k]) ps.push(k + "=" + encodeURIComponent(extra[k])); });
    return ps.length ? u + ps.join("&") : f.pagina;
  }

  /* ---------- folha de confirmação (injetada, nenhuma página precisa de HTML novo) ---------- */
  var CSS = '#bwcrFolha{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(3,6,16,.72);backdrop-filter:blur(6px);padding:16px}' +
    '#bwcrFolha[hidden]{display:none}' +
    '.bwcr-cx{width:100%;max-width:380px;background:var(--m-card,#111726);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:18px;box-shadow:0 24px 60px rgba(0,0,0,.55);color:var(--txt,#EAF0FF);font-family:Inter,system-ui,sans-serif}' +
    '.bwcr-cx h3{margin:0 0 4px;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--m-ok,#12B76A)}' +
    '.bwcr-cx p{margin:0 0 12px;font-size:13px;line-height:1.45;opacity:.85}' +
    '.bwcr-capa{width:100%;max-height:170px;object-fit:contain;border-radius:12px;background:#05070f;margin:0 0 12px;display:block}' +
    '.bwcr-bt{display:block;width:100%;margin:0 0 8px;padding:13px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:inherit;font:600 14px/1.2 Inter,system-ui,sans-serif;letter-spacing:.03em;text-transform:uppercase;cursor:pointer;text-align:center;text-decoration:none}' +
    '.bwcr-bt.pri{background:linear-gradient(135deg,var(--m-pri,#4C8DFF),var(--m-pri2,#2FD08A));border-color:transparent;color:#061018}' +
    '.bwcr-bt:last-child{margin:0}';
  function estilo() {
    if (document.getElementById("bwcrCss")) return;
    var s = document.createElement("style"); s.id = "bwcrCss"; s.textContent = CSS; document.head.appendChild(s);
  }
  function folha(h) {
    estilo();
    var f = document.getElementById("bwcrFolha");
    if (!f) { f = document.createElement("div"); f.id = "bwcrFolha"; f.hidden = true; document.body.appendChild(f); f.addEventListener("click", function (e) { if (e.target === f) f.hidden = true; }); }
    f.innerHTML = '<div class="bwcr-cx" role="dialog" aria-modal="true">' + h + "</div>"; f.hidden = false;
    document.addEventListener("keydown", function esq(e) { if (e.key === "Escape") { f.hidden = true; document.removeEventListener("keydown", esq); } });
    return f;
  }
  function fechar() { var f = document.getElementById("bwcrFolha"); if (f) f.hidden = true; }

  /* ---------- MANDAR PARA A LINHA DO TEMPO ---------- */
  async function mandar(opts) {
    opts = opts || {};
    var volta = paraEditar();
    var arq = typeof opts.arquivo === "function" ? await opts.arquivo() : opts.arquivo;
    if (!arq) { folha('<h3 style="color:var(--m-erro,#FF6B6B)">Nada para mandar</h3><p>Gere ou salve a criação primeiro e tente de novo.</p><button class="bwcr-bt" type="button" data-bwcr-fechar>Entendi</button>'); return null; }
    var blob = arq instanceof Blob ? arq : new Blob([arq]);
    var nome = opts.nome || (arq.name ? String(arq.name).replace(/\.[a-z0-9]+$/i, "") : "");
    var reg;
    try {
      reg = await guardar({ id: volta && volta.criacao ? volta.criacao : null, blob: blob, nome: nome, tipo: opts.tipo, dur: opts.dur, ferramenta: opts.ferramenta, projeto: opts.projeto });
    } catch (e) {
      folha('<h3 style="color:var(--m-erro,#FF6B6B)">Não deu para guardar</h3><p>' + esc(e.message || "Erro no aparelho.") + "</p><button class=\"bwcr-bt\" type=\"button\" data-bwcr-fechar>Fechar</button>"); return null;
    }
    var atualizou = !!(volta && volta.criacao);
    try { localStorage.setItem("ui_criacao_nova", reg.id); } catch (e) {}
    var f = folha(
      "<h3>" + (atualizou ? "✓ Atualizado na linha do tempo" : "✓ Está na linha do tempo") + "</h3>" +
      (reg.capa ? '<img class="bwcr-capa" src="' + reg.capa + '" alt="">' : "") +
      "<p><b>" + esc(reg.nome) + "</b>" + (reg.tipo === "video" && reg.dur ? " · " + reg.dur.toFixed(1).replace(".", ",") + " s" : "") +
      "<br>" + (atualizou ? "A nova versão entrou no lugar da antiga, sem mexer no resto da edição." : "A criação ficou guardada neste aparelho. Abra o editor de vídeo para pôr na linha do tempo e juntar com as outras.") + "</p>" +
      '<a class="bwcr-bt pri" href="video.html?criacao=' + encodeURIComponent(reg.id) + '">' + (atualizou ? "➜ Voltar para a linha do tempo" : "➜ Abrir a linha do tempo") + "</a>" +
      '<button class="bwcr-bt" type="button" data-bwcr-fechar>Continuar aqui</button>'
    );
    f.querySelectorAll("[data-bwcr-fechar]").forEach(function (b) { b.addEventListener("click", fechar); });
    return reg;
  }

  /* põe o botão ao lado de um botão que já existe na página (sem mudar o HTML dela) */
  function aoLado(idIrmao, opts) {
    var irmao = document.getElementById(idIrmao); if (!irmao || irmao.parentNode.querySelector("[data-bwcr-bt]")) return null;
    var volta = paraEditar();
    var b = document.createElement("button");
    b.type = "button"; b.setAttribute("data-bwcr-bt", "1");
    b.className = String(irmao.className || "").replace(/\bpri\b/g, "").trim() || "bwcr-bt";
    b.style.cssText = (irmao.tagName === "A" ? "display:inline-block;" : "") + "margin-top:8px";
    b.textContent = volta ? "➜ ATUALIZAR NA LINHA DO TEMPO" : "➜ MANDAR PARA A LINHA DO TEMPO";
    b.title = "Guarda a criação neste aparelho e põe na linha do tempo do EDITOR DE VÍDEO";
    b.addEventListener("click", function () {
      var antes = b.textContent; b.disabled = true; b.textContent = "…";
      Promise.resolve(mandar(opts)).then(function () { b.disabled = false; b.textContent = antes; }, function () { b.disabled = false; b.textContent = antes; });
    });
    irmao.parentNode.insertBefore(b, irmao.nextSibling);
    return b;
  }

  /* ---------- barra de volta (aparece sozinha quando a ferramenta foi aberta pela linha do tempo) ---------- */
  function barraVolta() {
    var q = paraEditar(); if (!q || document.getElementById("bwcrVolta")) return;
    estilo();
    var st = document.createElement("style"); st.textContent =
      '#bwcrVolta{box-sizing:border-box;max-width:100%;position:sticky;top:0;z-index:60;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:8px 12px;background:linear-gradient(135deg,rgba(76,141,255,.22),rgba(47,208,138,.18));border-bottom:1px solid rgba(255,255,255,.14);font:600 11px/1.3 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:var(--txt,#EAF0FF)}' +
      '#bwcrVolta a{color:inherit;text-decoration:none;padding:6px 10px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(3,6,16,.3)}' +
      '#bwcrVolta a:hover{border-color:#4C8DFF}#bwcrVolta b{font-weight:600;opacity:.85;text-transform:none;letter-spacing:0}';
    document.head.appendChild(st);
    var d = document.createElement("div"); d.id = "bwcrVolta";
    d.innerHTML = '<a href="video.html">⟵ Linha do tempo</a><b>' + (q.criacao ? "Você veio do editor de vídeo: quando terminar, toque em ➜ ATUALIZAR NA LINHA DO TEMPO e a nova versão troca no lugar." : "Você veio do editor de vídeo: ao terminar, mande a criação para a linha do tempo.") + "</b>";
    /* nunca dentro da .bw-shell (é flex: a barra virava coluna ao lado do menu) — vai no miolo da página */
    var alvo = document.querySelector(".wrap") || document.querySelector("main") || document.body;
    alvo.insertBefore(d, alvo.firstChild);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", barraVolta); else barraVolta();

  window.BWCriacoes = { VERSAO: VERSAO, FERR: FERR, guardar: guardar, listar: listar, pegar: pegar, apagar: apagar, mandar: mandar, aoLado: aoLado, deOnde: deOnde, paraEditar: paraEditar, url: url, folha: folha, fechar: fechar, barraVolta: barraVolta };
})();
