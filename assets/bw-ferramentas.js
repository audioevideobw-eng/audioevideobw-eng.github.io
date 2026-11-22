/* FERRAMENTAS NO ESTILO ADOBE (20/11/2026, Claude) — comum aos editores (vídeo, fotos, motion, telas).
   BWFerr.barra({ el, ferramentas:[{id, tecla, nome, icone, dica}], atual, aoTrocar, espacoMao })
     → barra de ferramentas com atalho de UMA tecla (V seleção, C lâmina, H mão, Z zoom, T texto, B pincel, E borracha, I conta-gotas…),
       o cursor muda (html[data-bwf="c"] + classe .bwf-alvo na área de trabalho) e, com espacoMao, segurar ESPAÇO vira a mão (Photoshop).
   BWFerr.atalhos({ "ctrl+z": fn, "shift+ctrl+z": fn, "delete": fn, ... }) → teclas com Ctrl/Shift/Alt (ignora quando se digita num campo).
   BWFerr.menu(x, y, itens) → menu de opções (botão direito / segurar o dedo): [{rot, tecla, fn, perigo, off, sub:[...]}, "-"].
   BWFerr.contexto(raiz, seletor, montar(el, ev) → itens) → abre o menu no botão direito e ao segurar o dedo ~0,5 s sem mexer.
   BWFerr.ajuda(titulo, linhas) → tecla ? mostra a lista de atalhos.
   Nada aqui usa rede nem a conta. */
(function () {
  "use strict";
  if (window.BWFerr) return;
  var digitando = function (e) { var t = e && e.target; if (!t) return false; var n = (t.tagName || "").toLowerCase();
    return t.isContentEditable || n === "textarea" || n === "select" || (n === "input" && !/^(range|checkbox|radio|button|color|file)$/i.test(t.type || "")); };
  // cursores desenhados (lâmina, conta-gotas, pincel) — o ponto quente fica na ponta
  var svg = function (s, x, y, alt) { return "url(\"data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">' + s + "</svg>") + "\") " + x + " " + y + ", " + alt; };
  var CURSOR = {
    c: svg('<path d="M3 21 L13 11 L17 15 L7 25Z" fill="#fff" stroke="#000" stroke-width="1.4"/><path d="M13 11 L20 4 L22 6 L15 13Z" fill="#B6FF3B" stroke="#000" stroke-width="1.4"/><path d="M3 21 L7 17" stroke="#000"/>', 3, 21, "crosshair"),
    i: svg('<path d="M3 21 L4 17 L14 7 L17 10 L7 20Z" fill="#fff" stroke="#000" stroke-width="1.4"/><path d="M14 7 L17 4 Q19 2 21 4 Q22 6 20 7 L17 10Z" fill="#000"/>', 3, 21, "crosshair"),
    b: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="9" fill="none" stroke="#000" stroke-width="1"/><circle cx="12" cy="12" r="1.2" fill="#fff"/>', 12, 12, "crosshair"),
    e: svg('<circle cx="12" cy="12" r="9" fill="rgba(255,90,90,.18)" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="9" fill="none" stroke="#c00" stroke-width="1"/>', 12, 12, "crosshair"),
    v: "default", a: "default", h: "grab", hpress: "grabbing", z: "zoom-in", zalt: "zoom-out", t: "text", m: "crosshair", p: "crosshair", r: "ew-resize"
  };
  var css = document.createElement("style");
  css.textContent =
    ".bwf-barra{display:flex;gap:4px;flex-wrap:wrap;align-items:center}" +
    ".bwf-bt{position:relative;width:40px;height:40px;border-radius:11px;border:1px solid rgba(245,241,234,.14);background:rgba(255,255,255,.04);color:#F5F1EA;font:800 16px Inter,sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;touch-action:manipulation}" +
    ".bwf-bt:hover{border-color:rgba(182,255,59,.55)}" +
    ".bwf-bt.on{background:#B6FF3B;border-color:#B6FF3B;color:#0a120a;box-shadow:0 0 14px rgba(182,255,59,.45)}" +
    ".bwf-bt b{position:absolute;right:2px;bottom:1px;font:800 8.5px Inter,sans-serif;opacity:.75}" +
    ".bwf-bt.ajuda{width:auto;padding:0 10px;font-size:12px}" +
    ".bwf-nome{font:800 10.5px Inter,sans-serif;letter-spacing:.08em;color:#B9C0CC;margin-left:4px;white-space:nowrap}" +
    "html[data-bwf] .bwf-alvo,html[data-bwf] .bwf-alvo *{cursor:var(--bwf-cursor)!important}" +
    ".bwf-menu{position:fixed;z-index:9800;min-width:210px;max-width:min(300px,92vw);max-height:min(70vh,520px);overflow:auto;padding:6px;border-radius:14px;background:#1a1e27;border:1px solid rgba(245,241,234,.14);box-shadow:0 18px 50px rgba(0,0,0,.6);font:600 13px Inter,sans-serif;color:#F5F1EA}" +
    ".bwf-menu button{display:flex;width:100%;align-items:center;gap:10px;min-height:36px;padding:0 10px;border:0;border-radius:9px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}" +
    ".bwf-menu button:hover,.bwf-menu button:focus{background:rgba(124,92,255,.28);outline:none}" +
    ".bwf-menu button[disabled]{opacity:.35;cursor:default;background:transparent}" +
    ".bwf-menu button.perigo{color:#ff9a9d}" +
    ".bwf-menu button kbd{margin-left:auto;font:700 10.5px Inter,sans-serif;color:#8d95a3;background:none;border:0}" +
    ".bwf-menu hr{border:0;border-top:1px solid rgba(245,241,234,.1);margin:4px 2px}" +
    ".bwf-menu .tit{font:800 10px Inter,sans-serif;letter-spacing:.12em;color:#8d95a3;padding:6px 10px 2px}" +
    ".bwf-ajuda{position:fixed;inset:0;z-index:9850;background:rgba(6,8,13,.86);display:flex;align-items:center;justify-content:center;padding:14px}" +
    ".bwf-ajuda .jan{width:min(560px,100%);max-height:90vh;overflow:auto;border-radius:20px;background:#12151c;border:1px solid rgba(245,241,234,.12);padding:16px;color:#F5F1EA;font:500 13px/1.45 Inter,sans-serif}" +
    ".bwf-ajuda h2{margin:0 0 10px;font:800 15px Inter,sans-serif;letter-spacing:.06em}" +
    ".bwf-ajuda table{width:100%;border-collapse:collapse}.bwf-ajuda td{padding:5px 4px;border-bottom:1px solid rgba(245,241,234,.07)}" +
    ".bwf-ajuda td:first-child{width:130px}.bwf-ajuda kbd{display:inline-block;min-width:20px;padding:2px 6px;border-radius:6px;background:#0B0E14;border:1px solid rgba(245,241,234,.2);font:800 11px Inter,sans-serif;text-align:center}" +
    ".bwf-ajuda .sec td{font:800 10.5px Inter,sans-serif;letter-spacing:.12em;color:#B6FF3B;padding-top:12px}" +
    "@media (max-width:700px){.bwf-bt{width:38px;height:38px}.bwf-nome{display:none}}";
  (document.head || document.documentElement).appendChild(css);

  /* ---------- barra de ferramentas ---------- */
  var BARRA = null;
  function cursorDe(id, alt, preso) { return (id === "h" && preso) ? CURSOR.hpress : (id === "z" && alt) ? CURSOR.zalt : CURSOR[id] || "default"; }
  function aplicarCursor() { if (!BARRA) return; var id = BARRA.temp || BARRA.atual, h = document.documentElement;
    h.setAttribute("data-bwf", id); h.style.setProperty("--bwf-cursor", cursorDe(id, BARRA.alt, BARRA.preso)); }
  function barra(o) {
    BARRA = { o: o, atual: o.atual || (o.ferramentas[0] || {}).id, temp: null, alt: false, preso: false };
    var el = o.el; el.classList.add("bwf-barra"); el.setAttribute("role", "toolbar"); el.setAttribute("aria-label", "Ferramentas");
    el.innerHTML = o.ferramentas.map(function (f) { return '<button type="button" class="bwf-bt" data-bwf-id="' + f.id + '" title="' + f.nome + " (" + f.tecla + ")" + (f.dica ? " — " + f.dica : "") + '" aria-label="' + f.nome + " (tecla " + f.tecla + ')">' + f.icone + "<b>" + f.tecla + "</b></button>"; }).join("") +
      (o.semAjuda ? "" : '<button type="button" class="bwf-bt ajuda" data-bwf-ajuda="1" title="Atalhos do teclado (?)" aria-label="Atalhos do teclado">?</button>') + '<span class="bwf-nome" aria-live="polite"></span>';
    el.addEventListener("click", function (e) { var b = e.target.closest("[data-bwf-id]"); if (b) trocar(b.getAttribute("data-bwf-id")); else if (e.target.closest("[data-bwf-ajuda]")) mostrarAjuda(); });
    (o.alvos || []).forEach(function (a) { if (a) a.classList.add("bwf-alvo"); });
    trocar(BARRA.atual, true);
    return { atual: function () { return BARRA.temp || BARRA.atual; }, trocar: trocar, alvo: function (a) { a.classList.add("bwf-alvo"); } };
  }
  function trocar(id, silencio) {
    if (!BARRA || !BARRA.o.ferramentas.some(function (f) { return f.id === id; })) return;
    BARRA.atual = id; BARRA.temp = null;
    [].forEach.call(BARRA.o.el.querySelectorAll("[data-bwf-id]"), function (b) { var on = b.getAttribute("data-bwf-id") === id; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
    var f = BARRA.o.ferramentas.filter(function (x) { return x.id === id; })[0], n = BARRA.o.el.querySelector(".bwf-nome"); if (n && f) n.textContent = f.nome.toUpperCase() + (f.dica ? " · " + f.dica : "");
    aplicarCursor(); if (BARRA.o.aoTrocar && !silencio) BARRA.o.aoTrocar(id); else if (BARRA.o.aoTrocar && silencio) BARRA.o.aoTrocar(id, true);
  }
  function teclaFerr(e) {
    if (!BARRA || e.ctrlKey || e.metaKey || digitando(e) || abertoMenu || document.querySelector(".bwf-ajuda")) return false;
    var k = (e.key || "").toLowerCase(), f = BARRA.o.ferramentas.filter(function (x) { return x.tecla.toLowerCase() === k && !e.shiftKey; })[0];
    if (f) { trocar(f.id); return true; } return false;
  }

  /* ---------- atalhos ---------- */
  var MAPAS = [];
  function norma(e) { var p = []; if (e.ctrlKey || e.metaKey) p.push("ctrl"); if (e.shiftKey) p.push("shift"); if (e.altKey) p.push("alt");
    var k = (e.key || "").toLowerCase(); if (k === " ") k = "espaco"; if (k === "backspace") k = "delete"; if (k === "del") k = "delete"; if (k === "+") k = "="; if (k === "?" ) k = "/"; p.push(k); return p.join("+"); }
  function atalhos(mapa) { var m = {}; Object.keys(mapa).forEach(function (k) { k.split(",").forEach(function (x) { var ps = x.trim().toLowerCase().split("+"), tec = ps.pop(), mods = ["ctrl", "shift", "alt"].filter(function (z) { return ps.indexOf(z) >= 0; }); m[mods.concat([tec]).join("+")] = mapa[k]; }); }); MAPAS.push(m); return m; }
  document.addEventListener("keydown", function (e) {
    if (abertoMenu) { if (e.key === "Escape") { fecharMenu(); e.preventDefault(); e.stopImmediatePropagation(); } return; }
    if (e.key === "Escape" && document.querySelector(".bwf-ajuda")) { document.querySelector(".bwf-ajuda").remove(); e.preventDefault(); e.stopImmediatePropagation(); return; }
    if (BARRA && e.key === "Alt") { BARRA.alt = true; aplicarCursor(); }
    if (BARRA && BARRA.o.espacoMao && e.key === " " && !digitando(e) && !BARRA.temp && BARRA.o.ferramentas.some(function (f) { return f.id === "h"; })) { e.preventDefault(); BARRA.temp = "h"; aplicarCursor(); return; }
    if (BARRA && BARRA.o.espacoMao && e.key === " " && BARRA.temp) { e.preventDefault(); return; }
    if (digitando(e) && !(e.ctrlKey || e.metaKey)) return;
    var n = norma(e);
    for (var i = MAPAS.length - 1; i >= 0; i--) { var fn = MAPAS[i][n]; if (fn && !(digitando(e) && !/^ctrl\+(s|m|e)$/.test(n))) { var r = fn(e); if (r !== false) { e.preventDefault(); return; } } }
    if (n === "shift+/" || n === "/") { if (!digitando(e)) { mostrarAjuda(); e.preventDefault(); } return; }
    if (teclaFerr(e)) e.preventDefault();
  });
  document.addEventListener("keyup", function (e) { if (!BARRA) return; if (e.key === "Alt") { BARRA.alt = false; aplicarCursor(); } if (e.key === " " && BARRA.temp === "h") { BARRA.temp = null; aplicarCursor(); } });
  addEventListener("blur", function () { if (BARRA) { BARRA.alt = false; BARRA.temp = null; aplicarCursor(); } });
  function preso(v) { if (BARRA) { BARRA.preso = v; aplicarCursor(); } }

  /* ---------- menu de opções ---------- */
  var abertoMenu = null;
  function fecharMenu() { if (abertoMenu) { abertoMenu.remove(); abertoMenu = null; } }
  function menu(x, y, itens, titulo, porToque) {
    fecharMenu(); var m = document.createElement("div"); m.className = "bwf-menu"; m.setAttribute("role", "menu");
    var acoes = [];
    m.innerHTML = (titulo ? '<div class="tit">' + titulo + "</div>" : "") + itens.map(function (it) { if (it === "-") return "<hr>"; if (it.tit) return '<div class="tit">' + it.tit + "</div>"; acoes.push(it);
      return '<button type="button" role="menuitem" data-i="' + (acoes.length - 1) + '"' + (it.off ? " disabled" : "") + (it.perigo ? ' class="perigo"' : "") + ">" + (it.icone ? '<span aria-hidden="true">' + it.icone + "</span>" : "") + "<span>" + it.rot + "</span>" + (it.sub ? "<kbd>▸</kbd>" : it.tecla ? "<kbd>" + it.tecla + "</kbd>" : "") + "</button>"; }).join("");
    document.body.appendChild(m); abertoMenu = m; m._t0 = Date.now(); m._t = porToque ? Date.now() : 0;
    var r = m.getBoundingClientRect(); m.style.left = Math.max(6, Math.min(x, innerWidth - r.width - 6)) + "px"; m.style.top = Math.max(6, Math.min(y, innerHeight - r.height - 6)) + "px";
    m.addEventListener("click", function (e) { var b = e.target.closest("button[data-i]"); if (!b || b.disabled || Date.now() - m._t < 450) return;   /* o dedo que abriu o menu, ao sair, não escolhe nada */ var it = acoes[+b.getAttribute("data-i")];
      if (it.sub) { var rb = b.getBoundingClientRect(); menu(rb.right - 8, rb.top, it.sub, it.rot); return; } fecharMenu(); it.fn && it.fn(); });
    m.addEventListener("keydown", function (e) { var bs = [].slice.call(m.querySelectorAll("button:not([disabled])")), i = bs.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { (bs[i + 1] || bs[0]).focus(); e.preventDefault(); } else if (e.key === "ArrowUp") { (bs[i - 1] || bs[bs.length - 1]).focus(); e.preventDefault(); } });
    var b0 = m.querySelector("button:not([disabled])"); if (b0) setTimeout(function () { try { b0.focus({ preventScroll: true }); } catch (e) {} }, 0);
    return m;
  }
  document.addEventListener("pointerdown", function (e) { if (abertoMenu && !abertoMenu.contains(e.target)) fecharMenu(); }, true);
  addEventListener("resize", fecharMenu); document.addEventListener("scroll", function (e) { if (abertoMenu && !abertoMenu.contains(e.target) && Date.now() - (abertoMenu._t || abertoMenu._t0) > 350) fecharMenu(); }, true);
  // botão direito e "segurar o dedo" (sem mexer) abrem o menu do item
  /* 22/11 (dono): no TOQUE, segurar o dedo NÃO abre mais o menu — atrapalhava o "segurar e arrastar". O menu de opções no celular fica no botão
     ⋯ MAIS da faixa (que chama o contextmenu por código). No PC continua o botão direito. */
  var TOQUE_T = 0;
  window.addEventListener("touchstart", function () { TOQUE_T = Date.now(); }, {passive: true, capture: true});
  function contexto(raiz, seletor, montar) {
    raiz.addEventListener("contextmenu", function (e) { var el = e.target.closest(seletor); if (!el || !raiz.contains(el)) return; e.preventDefault();
      if (e.isTrusted && ((e.pointerType && e.pointerType !== "mouse") || Date.now() - TOQUE_T < 1500)) return;   /* veio de segurar o dedo: nada de menu */
      var its = montar(el, e); if (its && (its.itens || its).length) menu(e.clientX, e.clientY, its.itens || its, its.titulo, false); });
  }


  /* ---------- ajuda (tecla ?) ---------- */
  var AJUDA = null;
  function ajuda(titulo, linhas) { AJUDA = { titulo: titulo, linhas: linhas }; }
  function mostrarAjuda() {
    if (!AJUDA || document.querySelector(".bwf-ajuda")) return; fecharMenu();
    var d = document.createElement("div"); d.className = "bwf-ajuda"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Atalhos do teclado");
    var ferr = BARRA ? BARRA.o.ferramentas.map(function (f) { return [f.tecla, f.nome + (f.dica ? " — " + f.dica : "")]; }) : [];
    var lin = (ferr.length ? [["#", "FERRAMENTAS"]].concat(ferr) : []).concat(AJUDA.linhas);
    d.innerHTML = '<div class="jan"><h2>⌨ ' + AJUDA.titulo + '</h2><table>' + lin.map(function (l) { return l[0] === "#" ? '<tr class="sec"><td colspan="2">' + l[1] + "</td></tr>" :
      "<tr><td>" + l[0].split(" / ").map(function (k) { return k.split("+").map(function (x) { return "<kbd>" + x + "</kbd>"; }).join("+"); }).join(" ou ") + "</td><td>" + l[1] + "</td></tr>"; }).join("") +
      '</table><p style="margin:12px 0 0;color:#8d95a3;font-size:12px">No celular: toque nas ferramentas da barra; toque em ⋯ MAIS para abrir as opções.</p><div style="margin-top:12px;text-align:right"><button type="button" class="bwf-bt ajuda" data-fechar="1" style="width:auto">FECHAR</button></div></div>';
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-fechar]")) d.remove(); });
    document.body.appendChild(d);
  }

  /* ---------- TELA FIXA (regra do dono, 20/11): a mídia que está sendo editada fica SEMPRE à vista; os painéis e menus é que rolam ----------
     PC: o editor ocupa a altura da janela (nada da página rola) — painéis dos lados e a linha do tempo rolam por dentro.
     Celular: a prévia fica presa no topo da página inteira (não só da grade) e tudo o mais passa por baixo dela. */
  function telaFixa(o) {
    var wrap = o.wrap, grade = o.grade, palco = o.palco, mq = window.matchMedia("(max-width:1100px)"), irmaos = [].slice.call(wrap.children), ig = irmaos.indexOf(grade);
    grade.classList.add("bwf-grade"); palco.classList.add("bwf-palco"); (o.rola || []).forEach(function (e) { if (e) e.classList.add("bwf-rola"); }); (o.some || []).forEach(function (e) { if (e) e.classList.add("bwf-some"); }); if (o.aviso) o.aviso.setAttribute("data-bwf-aviso", "1");
    function aplicar() {
      var cel = mq.matches; wrap.classList.toggle("bwf-fixo", !cel); wrap.classList.toggle("bwf-cel", cel);
      irmaos.forEach(function (e, i) { e.style.order = cel ? (i < ig ? 0 : i === ig ? "" : 3) : ""; });
      [].forEach.call(grade.children, function (e) { e.style.order = cel ? (e === palco ? 1 : 2) : ""; });
      if (cel) { wrap.style.height = ""; }
      else { var topo = wrap.getBoundingClientRect().top + (window.scrollY || 0); wrap.style.height = Math.max(520, innerHeight - topo - 6) + "px"; }
      if (PN) PN.aplicar(cel);
      if (o.aoMedir) o.aoMedir(cel);
      if (cel) document.documentElement.style.scrollPaddingTop = (palco.offsetHeight + 12) + "px"; else document.documentElement.style.scrollPaddingTop = "";
    }
    var PN = o.paineis === false ? null : paineis(o, wrap, grade, palco, function () { aplicar(); });
    addEventListener("resize", aplicar); if (mq.addEventListener) mq.addEventListener("change", aplicar); aplicar(); setTimeout(aplicar, 400);
    return { aplicar: aplicar, altura: function () { return palco.clientHeight; }, fixo: function () { return wrap.classList.contains("bwf-fixo"); } };
  }
  /* ---------- PAINÉIS LIVRES (dono, 21/11: "tudo deve se esticar e omitir, descolar e mover livre") ----------
     Todo painel de um editor com TELA FIXA (colunas ao lado da prévia + linha do tempo) ganha no PC uma barrinha ⠿ NOME com:
     ⇱ descolar (vira janela solta: arrasta pela barrinha, estica pelo canto, ⇲ ou dois toques encaixa) e ✕ esconder (não ocupa lugar;
     volta pelo botão ＋ NOME lá em cima). A beirada da prévia arrasta a largura do painel vizinho; a barrinha da linha do tempo
     encaixada arrasta a altura. Quem lembra é o editor, só neste aparelho (ui_<editor>_paineis). No celular nada disso aparece. */
  function paineis(o, wrap, grade, palco, refazer) {
    var lista = o.soltos || [].filter.call(grade.children, function (e) { return e !== palco; }).concat((o.rola || []).filter(Boolean));
    if (!lista.length) return null;
    var S = {}, ORIG = null, CEL = true;
    /* este arquivo não guarda nada: quem lembra é o editor (o.painelLer / o.painelGravar → preferência ui_* só do aparelho) */
    try { S = (o.painelLer && o.painelLer()) || {}; } catch (e) { S = {}; } if (!S || typeof S !== "object") S = {};
    function lembrar() { try { if (o.painelGravar) o.painelGravar(S); } catch (e) {} }
    function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function est(it) { return S[it.id] || (S[it.id] = {}); }
    function bt(txt, tipo, rot) { var b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.setAttribute("data-bwf-p", tipo); b.title = rot; b.setAttribute("aria-label", rot); return b; }
    var itens = lista.map(function (el, i) {
      var naGrade = el.parentNode === grade, h = el.querySelector("h3,h2"), nome = el.getAttribute("data-bwf-nome") || (naGrade && h ? h.textContent.trim() : "") || (naGrade ? "PAINEL" : (o.nomeRola || "LINHA DO TEMPO"));
      var pg = document.createElement("div"), sp = document.createElement("span"); pg.className = "bwf-pega" + (!naGrade && !o.alturaPropria ? " alt" : ""); sp.textContent = "⠿ " + nome; pg.appendChild(sp);
      pg.appendChild(bt("⇱", "solta", "Descolar " + nome + ": vira uma janela solta, que você arrasta e estica (de novo = encaixa)")); pg.appendChild(bt("✕", "some", "Esconder " + nome));
      if (!naGrade && !o.alturaPropria) pg.title = "Arraste para cima ou para baixo para esticar";
      el.insertBefore(pg, el.firstChild); el.classList.add("bwf-painel");
      var it = {el: el, id: el.id || ("p" + i), nome: nome, naGrade: naGrade, pega: pg, solto: false};
      pg.addEventListener("click", function (e) { var b = e.target.closest("[data-bwf-p]"); if (!b) return; var st = est(it);
        if (b.getAttribute("data-bwf-p") === "some") st.o = 1;
        else if (st.s) delete st.s; else { var r = el.getBoundingClientRect(); st.s = {x: Math.round(lim(r.left + (r.left > innerWidth / 2 ? -24 : 24), 0, innerWidth - 240)), y: Math.round(lim(r.top - (naGrade ? -24 : 60), 0, innerHeight - 160)), w: Math.round(lim(r.width, 260, innerWidth * 0.7)), h: Math.round(lim(r.height, 160, innerHeight * 0.7))}; }
        lembrar(); refazer(); });
      var mv = null;
      pg.addEventListener("pointerdown", function (e) { if (e.target.closest("button") || CEL) return; var st = est(it);
        if (st.s) mv = {t: "m", x: e.clientX, y: e.clientY, x0: st.s.x, y0: st.s.y};
        else if (!naGrade && !o.alturaPropria) mv = {t: "h", y: e.clientY, h0: el.getBoundingClientRect().height};
        else return; try { pg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
      pg.addEventListener("pointermove", function (e) { if (!mv) return; var st = est(it);
        if (mv.t === "m") { st.s.x = Math.round(lim(mv.x0 + e.clientX - mv.x, 0, innerWidth - 80)); st.s.y = Math.round(lim(mv.y0 + e.clientY - mv.y, 0, innerHeight - 40)); el.style.left = st.s.x + "px"; el.style.top = st.s.y + "px"; }
        else { st.h = Math.round(lim(mv.h0 - (e.clientY - mv.y), 70, innerHeight * 0.7)); refazer(); } });
      var fim = function () { if (!mv) return; mv = null; lembrar(); }; pg.addEventListener("pointerup", fim); pg.addEventListener("pointercancel", fim);
      pg.addEventListener("dblclick", function (e) { if (e.target.closest("button")) return; var st = est(it); if (st.s) delete st.s; else if (st.h) delete st.h; else return; lembrar(); refazer(); });
      if (window.ResizeObserver) new ResizeObserver(function () { var st = S[it.id]; if (!it.solto || !st || !st.s) return; var r = el.getBoundingClientRect(); if (!r.width) return; if (Math.abs(r.width - st.s.w) > 2 || Math.abs(r.height - st.s.h) > 2) { st.s.w = Math.round(r.width); st.s.h = Math.round(r.height); lembrar(); if (o.aoMedir) o.aoMedir(false); } }).observe(el);
      return it; });
    var daGrade = itens.filter(function (it) { return it.naGrade; }), volta = document.createElement("div"); volta.className = "bwf-volta";
    volta.addEventListener("click", function (e) { var b = e.target.closest("[data-bwf-id]"); if (!b) return; var st = S[b.getAttribute("data-bwf-id")]; if (st) delete st.o; lembrar(); refazer(); });
    function porEl(e) { for (var i = 0; i < itens.length; i++) if (itens[i].el === e) return itens[i]; return null; }
    /* beiradas da prévia: arrastar muda a largura do painel vizinho (até o fim = esconde); dois toques = largura padrão */
    var puxa = {};
    if (daGrade.length) { if (getComputedStyle(palco).position === "static") palco.classList.add("bwf-rel");
      ["e", "d"].forEach(function (lado) { var p = document.createElement("i"), a = null; p.className = "bwf-puxa " + lado; p.title = "Arraste para alargar ou estreitar o painel ao lado (até o fim = esconde)"; palco.appendChild(p); puxa[lado] = p;
        function vizinho() { var f = [].slice.call(grade.children), i = f.indexOf(palco), passo = lado === "e" ? -1 : 1; for (i += passo; i >= 0 && i < f.length; i += passo) { var it = porEl(f[i]); if (it && !(S[it.id] || {}).s) return it; } return null; }
        p._viz = vizinho;
        p.addEventListener("pointerdown", function (e) { var it = vizinho(); if (!it) return; var st = est(it); a = {it: it, x: e.clientX, w: st.o ? 0 : it.el.getBoundingClientRect().width}; p.classList.add("on"); try { p.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
        p.addEventListener("pointermove", function (e) { if (!a) return; var st = est(a.it), w = Math.round(a.w + (e.clientX - a.x) * (lado === "e" ? 1 : -1)); if (w < 130) st.o = 1; else { delete st.o; st.w = Math.min(w, Math.round(grade.clientWidth * 0.45)); } refazer(); });
        var fim = function () { if (!a) return; a = null; p.classList.remove("on"); lembrar(); }; p.addEventListener("pointerup", fim); p.addEventListener("pointercancel", fim);
        p.addEventListener("dblclick", function () { var it = vizinho(); if (!it) return; var st = est(it); delete st.w; delete st.o; lembrar(); refazer(); }); }); }
    if (window.ResizeObserver && o.aoMedir) { var ult = 0, rq = 0; new ResizeObserver(function () { var h = palco.clientHeight * 10000 + palco.clientWidth; if (h === ult || CEL) return; ult = h; cancelAnimationFrame(rq); rq = requestAnimationFrame(function () { o.aoMedir(false); }); }).observe(palco); }
    function aplicar(cel) {
      CEL = cel; var escondidos = [];
      itens.forEach(function (it) { var st = S[it.id] || {}, oc = !cel && !!st.o, so = !cel && !oc && !!st.s, el = it.el;
        el.classList.toggle("bwf-oculto", oc); el.classList.toggle("bwf-solto", so); if (oc) escondidos.push(it);
        if (so) { el.style.width = lim(st.s.w || 320, 220, innerWidth - 16) + "px"; el.style.height = lim(st.s.h || 380, 120, innerHeight - 16) + "px"; el.style.maxHeight = ""; el.style.left = lim(st.s.x, 0, Math.max(0, innerWidth - 80)) + "px"; el.style.top = lim(st.s.y, 0, Math.max(0, innerHeight - 40)) + "px"; }
        else { if (it.solto) el.style.width = el.style.left = el.style.top = el.style.height = el.style.maxHeight = "";
          if (!it.naGrade && !o.alturaPropria) { var hh = !cel && st.h ? st.h + "px" : ""; el.style.height = hh; el.style.maxHeight = hh; } }
        it.solto = so; var b = it.pega.querySelector('[data-bwf-p="solta"]'); if (b) b.textContent = so ? "⇲" : "⇱"; });
      if (daGrade.length) {
        if (cel) grade.style.gridTemplateColumns = "";
        else { if (!ORIG) { grade.style.gridTemplateColumns = ""; var t = getComputedStyle(grade).gridTemplateColumns.split(" "); if (t.length === grade.children.length && t.every(function (x) { return /px$/.test(x); })) ORIG = t.map(parseFloat); }
          if (ORIG) { var cols = []; [].forEach.call(grade.children, function (e, i) { if (e === palco) { cols.push("minmax(0,1fr)"); return; } var it = porEl(e), st = it ? S[it.id] || {} : {}; if (st.o || st.s) return; cols.push(Math.round(st.w || ORIG[i]) + "px"); }); grade.style.gridTemplateColumns = cols.join(" "); } }
        ["e", "d"].forEach(function (l) { if (puxa[l]) puxa[l].style.display = cel || !puxa[l]._viz() ? "none" : ""; }); }
      volta.textContent = ""; escondidos.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.textContent = "＋ " + it.nome; b.setAttribute("data-bwf-id", it.id); b.title = "Mostrar " + it.nome; volta.appendChild(b); });
      var barra = document.querySelector(".bw-foco-barra"), naBarra = !!(barra && barra.getClientRects().length);
      if (naBarra) { if (volta.parentNode !== barra) barra.insertBefore(volta, barra.lastElementChild); } else if (volta.parentNode !== document.body) document.body.appendChild(volta);
      volta.classList.toggle("fora", !naBarra); volta.style.display = escondidos.length ? "" : "none"; }
    return { aplicar: aplicar, estado: function () { return JSON.parse(JSON.stringify(S)); } };
  }
  var css2 = document.createElement("style");
  css2.textContent =
    ".bwf-fixo{display:flex!important;flex-direction:column;overflow:hidden;box-sizing:border-box;padding-bottom:6px!important}" +
    ".bwf-fixo>*{flex:none}" +
    ".bwf-fixo>.bwf-grade{flex:1 1 0;min-height:0;align-items:stretch!important}" +
    ".bwf-fixo>.bwf-grade>*{min-height:0!important;max-height:100%!important;overflow:auto;overscroll-behavior:contain}" +
    ".bwf-fixo>.bwf-grade>.bwf-palco{overflow:hidden;justify-content:center}" +
    ".bwf-fixo>.bwf-rola{flex:0 1 auto;max-height:36vh;min-height:96px;overflow:auto;overscroll-behavior:contain}" +
    ".bwf-fixo>.bwf-some{display:none!important}" +
    ".bwf-fixo>:first-child h1{display:none}" +
    ".bwf-fixo>[data-bwf-aviso]{position:fixed!important;left:50%;bottom:14px;transform:translateX(-50%);z-index:60;max-width:min(760px,70vw);margin:0!important;box-shadow:0 10px 30px rgba(0,0,0,.6);background-color:#12251b!important}" +
    ".bwf-fixo>[data-bwf-aviso].erro{background-color:#2a1416!important}" +
    "@media (max-width:1700px){.bwf-fixo .bwf-nome{display:none}}" +
    ".bwf-fixo ::-webkit-scrollbar{width:9px;height:9px}.bwf-fixo ::-webkit-scrollbar-thumb{background:rgba(182,255,59,.35);border-radius:6px}.bwf-fixo ::-webkit-scrollbar-track{background:rgba(255,255,255,.04)}" +
    ".bwf-pega,.bwf-puxa{display:none}" +
    ".bwf-fixo .bwf-pega{display:flex;align-items:center;gap:4px;grid-column:1/-1;flex:none;height:22px;margin:0 0 4px;font:800 9.5px Inter,sans-serif;letter-spacing:.12em;color:#8d95a3;text-transform:uppercase;user-select:none;-webkit-user-select:none}" +
    ".bwf-pega span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".bwf-pega button,.bwf-volta button{height:20px;min-width:24px;border-radius:6px;border:1px solid rgba(245,241,234,.14);background:transparent;color:#B9C0CC;font:700 11px Inter,sans-serif;cursor:pointer;padding:0 5px;line-height:1}" +
    ".bwf-pega button:hover,.bwf-volta button:hover{border-color:#7C5CFF;color:#fff}" +
    ".bwf-fixo .bwf-pega.alt{cursor:ns-resize;touch-action:none}" +
    ".bwf-fixo .bwf-oculto{display:none!important}" +
    ".bwf-fixo .bwf-solto,.bwf-fixo>.bwf-grade>.bwf-solto,.bwf-fixo>.bwf-rola.bwf-solto{position:fixed!important;z-index:80;resize:both;overflow:auto!important;max-height:none!important;min-width:220px;min-height:120px;box-sizing:border-box;margin:0!important;border-radius:16px;border:1px solid #7C5CFF;background:#0f1218;box-shadow:0 22px 60px rgba(0,0,0,.7);padding:12px}" +
    ".bwf-fixo .bwf-solto>.bwf-pega{cursor:grab;touch-action:none;position:sticky;top:-12px;z-index:5;background:#0f1218;height:26px;margin:-8px 0 6px}.bwf-fixo .bwf-solto>.bwf-pega span{color:#c9bcff}" +
    ".bwf-fixo .bwf-rel{position:relative}" +
    ".bwf-fixo .bwf-puxa{display:block;position:absolute;top:0;bottom:0;width:10px;cursor:ew-resize;z-index:4;touch-action:none}.bwf-fixo .bwf-puxa.e{left:0}.bwf-fixo .bwf-puxa.d{right:0}" +
    ".bwf-fixo .bwf-puxa::after{content:'';position:absolute;top:50%;left:3px;width:4px;height:56px;margin-top:-28px;border-radius:3px;background:rgba(245,241,234,.2)}.bwf-fixo .bwf-puxa:hover::after,.bwf-fixo .bwf-puxa.on::after{background:#7C5CFF}" +
    ".bwf-volta{display:flex;gap:6px;align-items:center}.bwf-volta button{height:22px;font-size:10px;letter-spacing:.08em;padding:0 8px;color:#c9bcff;border-color:rgba(124,92,255,.5)}" +
    ".bwf-volta.fora{position:fixed;top:8px;right:70px;z-index:70}" +
    ".bwf-cel{display:flex!important;flex-direction:column}" +
    ".bwf-cel>.bwf-grade{display:contents!important}" +
    ".bwf-cel .bwf-palco{position:sticky!important;top:0;z-index:6}";
  (document.head || document.documentElement).appendChild(css2);

  /* ---------- PRÉVIA COMUM (22/11, dono: "as mesmas ferramentas do editor de vídeo" nas Telas e no Estúdio 3D) ----------
     ⋯ discreto no canto de cima da prévia (o menu: extras do editor + VISTA + TOCAR + TELA), rodinha = zoom SÓ da vista (selo 🔍 % volta a 100%),
     🖥 prévia no 2º monitor (a MESMA imagem do canvas, ao vivo, por captureStream — nada sai do aparelho), ⛶ tela cheia, 💾 salvar o quadro (PNG)
     e 📱 controle pelo celular (BWControle). Não guarda nada. o = {palco, alvo, canvas: fn → canvas, nome, zoom (bool), api, extras: fn → itens, aviso: fn} */
  function previa(o) {
    var palco = o.palco, alvo = o.alvo, cv = function () { return typeof o.canvas === "function" ? o.canvas() : o.canvas; }, av = o.aviso || function () {}, api = o.api || {};
    if (!palco || !alvo) return null;
    if (getComputedStyle(palco).position === "static") palco.style.position = "relative";
    var VZ = {z: 1, x: 0, y: 0}, JAN = null;
    var bt = document.createElement("button"); bt.type = "button"; bt.className = "bwf-opcp"; bt.textContent = "⋯"; bt.title = "Opções da prévia"; bt.setAttribute("aria-label", "Opções da prévia"); palco.appendChild(bt);
    var selo = document.createElement("button"); selo.type = "button"; selo.className = "bwf-vz"; selo.hidden = true; selo.title = "Voltar a vista para 100%"; palco.appendChild(selo);
    function pos() { var r = alvo.getBoundingClientRect(), p = palco.getBoundingClientRect(); bt.style.left = Math.max(4, r.right - p.left - 42) + "px"; bt.style.top = Math.max(4, r.top - p.top + 8) + "px"; selo.style.left = Math.max(4, r.left - p.left + 8) + "px"; selo.style.top = bt.style.top; }
    if (window.ResizeObserver) { var ro = new ResizeObserver(pos); ro.observe(alvo); ro.observe(palco); } addEventListener("resize", pos); setTimeout(pos, 0); setTimeout(pos, 400);
    function vista() { alvo.style.transformOrigin = "50% 50%"; alvo.style.transform = VZ.z === 1 ? "" : "translate(" + VZ.x.toFixed(1) + "px," + VZ.y.toFixed(1) + "px) scale(" + VZ.z + ")"; selo.hidden = VZ.z === 1; selo.textContent = "🔍 " + Math.round(VZ.z * 100) + "% ✕"; }
    function zoomV(z) { VZ.z = z ? Math.max(1, Math.min(8, z)) : 1; if (VZ.z === 1) { VZ.x = 0; VZ.y = 0; } vista(); }
    selo.onclick = function () { zoomV(0); };
    if (o.zoom) palco.addEventListener("wheel", function (e) { if (e.ctrlKey && !e.altKey) return; e.preventDefault(); var r = alvo.getBoundingClientRect(), z0 = VZ.z, z1 = Math.max(1, Math.min(8, z0 * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      if (z1 === z0) return; var cx = e.clientX - (r.left - VZ.x) - alvo.offsetWidth / 2, cy = e.clientY - (r.top - VZ.y) - alvo.offsetHeight / 2;
      VZ.x = z1 === 1 ? 0 : cx - (cx - VZ.x) * z1 / z0; VZ.y = z1 === 1 ? 0 : cy - (cy - VZ.y) * z1 / z0; VZ.z = z1; vista(); }, {passive: false});
    async function outraTela() { try { if (!window.getScreenDetails) return null; var sd = await window.getScreenDetails(), at = sd.currentScreen; return sd.screens.filter(function (x) { return x !== at && !(x.left === at.left && x.top === at.top); })[0] || null; } catch (e) { return null; } }
    async function segunda() {
      if (JAN && !JAN.closed) { JAN.close(); JAN = null; return; }
      var c = cv(); if (!c || !c.captureStream) { av("Este navegador não abre a prévia em outra janela.", true); return; }
      var t2 = await outraTela(), ps = t2 ? "popup=1,left=" + t2.availLeft + ",top=" + t2.availTop + ",width=" + t2.availWidth + ",height=" + t2.availHeight : "popup=1,width=960,height=600";
      JAN = window.open("", "bwPrevia" + (o.nome || ""), ps); if (!JAN) { av("O navegador bloqueou a janela — libere pop-ups para este site e toque de novo.", true); return; }
      var d = JAN.document; d.title = "Prévia — Brightway"; d.body.style.cssText = "margin:0;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden";
      var v = d.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.style.cssText = "max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain"; d.body.appendChild(v);
      var b2 = d.createElement("button"); b2.textContent = "⛶ TELA CHEIA (ou duplo clique)"; b2.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;border:1px solid #555;background:#12151c;color:#fff;font:700 13px sans-serif;cursor:pointer"; d.body.appendChild(b2);
      var cheia = function () { var el = d.documentElement; if (d.fullscreenElement) d.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); };
      b2.onclick = cheia; v.ondblclick = cheia; d.addEventListener("fullscreenchange", function () { b2.style.display = d.fullscreenElement ? "none" : ""; });
      try { v.srcObject = c.captureStream(30); v.play().catch(function () {}); } catch (e) { av("Não consegui mandar a prévia para a outra janela.", true); }
      d.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "k") && api.tocar) { e.preventDefault(); if (api.tocando && api.tocando()) api.parar(); else api.tocar(); }
        else if (e.key === "ArrowLeft" && api.irPara) api.irPara(api.T() - (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "ArrowRight" && api.irPara) api.irPara(api.T() + (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "Home" && api.irPara) api.irPara(0); else if (e.key === "f") cheia(); });
      if (o.aoAbrir) o.aoAbrir(); av(t2 ? "🖥 Prévia aberta no outro monitor — toque em TELA CHEIA lá (Espaço toca e pausa)." : "🖥 Prévia aberta em outra janela — arraste para o segundo monitor e toque em TELA CHEIA lá.");
      var vg = setInterval(function () { if (!JAN || JAN.closed) { clearInterval(vg); JAN = null; } }, 800);
    }
    addEventListener("pagehide", function () { if (JAN && !JAN.closed) JAN.close(); });
    function telaCheia() { if (document.fullscreenElement) document.exitFullscreen(); else if (palco.requestFullscreen) palco.requestFullscreen().catch(function () {}); }
    function salvarQuadro() { var c = cv(); if (!c || !c.toBlob) return; c.toBlob(function (b) { if (!b) return; var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (o.nome || "quadro") + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); av("💾 Quadro salvo (PNG)."); }, "image/png"); }
    function celular() { if (!window.BWControle) { av("O controle pelo celular não carregou (sem internet?).", true); return; } BWControle.painel(api); }
    function itens() {
      var L = (o.extras ? o.extras() : []) || []; if (L.length) L.push("-");
      if (o.zoom) L.push({tit: "VISTA (não muda o vídeo)"}, {icone: "＋", rot: "Aproximar", tecla: "Rodinha ↑", fn: function () { zoomV(VZ.z * 1.5); }}, {icone: "－", rot: "Afastar", tecla: "Rodinha ↓", off: VZ.z === 1, fn: function () { zoomV(VZ.z / 1.5); }},
        {icone: "⤢", rot: "Ajustar à tela (100%)", off: VZ.z === 1, fn: function () { zoomV(0); }});
      if (api.tocar) L.push({icone: api.tocando && api.tocando() ? "⏸" : "▶", rot: api.tocando && api.tocando() ? "Pausar" : "Tocar", tecla: "Espaço", fn: function () { if (api.tocando && api.tocando()) api.parar(); else api.tocar(); }});
      L.push("-", {tit: "TELA"}, {icone: "🖥", rot: JAN && !JAN.closed ? "Fechar a prévia do 2º monitor" : "Prévia no segundo monitor / janela solta", fn: segunda}, {icone: "⛶", rot: "Tela cheia (monitor inteiro)", fn: telaCheia},
        {icone: "💾", rot: "Salvar este quadro (PNG)", fn: salvarQuadro});
      if (api.irPara) L.push({icone: "📱", rot: "Controle pelo celular", fn: celular});
      return L;
    }
    bt.onclick = function () { var r = bt.getBoundingClientRect(); menu(Math.max(8, r.right - 250), r.bottom + 6, itens(), "PRÉVIA"); };
    return {zoom: zoomV, vista: function () { return VZ.z; }, segunda: segunda, celular: celular, telaCheia: telaCheia, salvarQuadro: salvarQuadro, menu: function () { bt.click(); }, botao: bt, pos: pos};
  }
  /* ---------- FAIXA FIRME (22/11, dono: "ao rolar as ferramentas a tela descola para o lado, como o puxar para baixo") ----------
     Causa: a rolagem NATIVA do navegador tem o "elástico" nas pontas (iPhone principalmente) — overscroll-behavior não tira o quique da
     própria faixa. Aqui a faixa NÃO rola sozinha (overflow-x hidden, touch-action pan-y): o dedo move o scrollLeft preso entre 0 e o fim,
     com inércia, sem elástico. setas:true põe ‹ › discretos nas pontas (toque = anda ~60%, segurar = anda direto, como a seta do teclado).
     o = {setas, pai (onde as setas ficam), pular(alvo) → true deixa o toque para o editor, aoRolar(), esq(): folga à esquerda (botão preso)} */
  function faixaFirme(el, o) {
    o = o || {}; if (!el || el.__firme) return el && el.__firme; el.classList.add("bwf-firme");
    var st = null, vel = 0, anim = 0, moveu = false;
    function max() { return Math.max(0, el.scrollWidth - el.clientWidth); }
    function por(x) { var a = el.scrollLeft; el.scrollLeft = Math.max(0, Math.min(max(), x)); if (el.scrollLeft !== a && o.aoRolar) o.aoRolar(); setas(); }
    el.addEventListener("touchstart", function (e) { cancelAnimationFrame(anim); moveu = false; if (!e.touches || e.touches.length !== 1 || (o.pular && o.pular(e.target))) { st = null; return; }
      var t = e.touches[0]; st = {x: t.clientX, y: t.clientY, sl: el.scrollLeft, lx: t.clientX, lt: performance.now(), dir: ""}; vel = 0; }, {passive: true});
    el.addEventListener("touchmove", function (e) { if (o.parar && o.parar()) { if (e.cancelable) e.preventDefault(); st = null; moveu = true; return; }   /* o editor pegou o item (segurar e arrastar): nada de rolar */
      if (!st || !e.touches || e.touches.length !== 1) { st = null; return; } var t = e.touches[0], dx = t.clientX - st.x, dy = t.clientY - st.y;
      if (!st.dir) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; st.dir = Math.abs(dx) > Math.abs(dy) ? "x" : "y"; }
      if (st.dir !== "x") return; if (e.cancelable) e.preventDefault(); moveu = true;
      var agora = performance.now(), dt = Math.max(1, agora - st.lt); vel = 0.8 * ((t.clientX - st.lx) / dt) + 0.2 * vel; st.lx = t.clientX; st.lt = agora; por(st.sl - dx); }, {passive: false});
    el.addEventListener("touchend", function () { if (moveu) setTimeout(function () { moveu = false; }, 450); if (!st) return; var d = st.dir, parado = performance.now() - st.lt > 90; st = null; if (d !== "x" || parado) return;
      var v = -vel * 16; (function inercia() { if (Math.abs(v) < 0.5) return; var a = el.scrollLeft; por(a + v); if (el.scrollLeft === a) return; v *= 0.93; anim = requestAnimationFrame(inercia); })(); });
    el.addEventListener("touchcancel", function () { st = null; });
    el.addEventListener("click", function (e) { if (moveu) { moveu = false; e.stopPropagation(); e.preventDefault(); } }, true);
    el.addEventListener("wheel", function (e) { var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : (e.shiftKey ? e.deltaY : 0); if (!d) return; e.preventDefault(); por(el.scrollLeft + d); }, {passive: false});
    el.addEventListener("scroll", function () { setas(); }, {passive: true});
    var E = null, D = null;
    function andar(dir, cont) { cancelAnimationFrame(anim); if (!cont) { var alvo = el.scrollLeft + dir * Math.max(120, el.clientWidth * 0.6), ini = el.scrollLeft, t0 = performance.now();
        (function passo(t) { var k = Math.min(1, (t - t0) / 260), e2 = 1 - Math.pow(1 - k, 3); por(ini + (alvo - ini) * e2); if (k < 1) anim = requestAnimationFrame(passo); })(t0); return; }
      (function cont2() { por(el.scrollLeft + dir * 9); anim = requestAnimationFrame(cont2); })(); }
    function seta(dir) { var b = document.createElement("button"); b.type = "button"; b.className = "bwf-seta " + (dir < 0 ? "esq" : "dir"); b.setAttribute("aria-label", dir < 0 ? "Ferramentas anteriores" : "Mais ferramentas");
      b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (dir < 0 ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6") + '"/></svg>';
      var seg = 0, segurou = false;
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); b.classList.add("pressa"); clearTimeout(b._pr); segurou = false; clearTimeout(seg); seg = setTimeout(function () { segurou = true; andar(dir, true); }, 320); });
      var solta = function () { clearTimeout(seg); if (segurou) cancelAnimationFrame(anim); clearTimeout(b._pr); b._pr = setTimeout(function () { b.classList.remove("pressa"); }, 450); };   /* a seta some no fim, mas o toque não pode cair no botão de baixo */
      b.addEventListener("pointerup", solta); b.addEventListener("pointercancel", solta); b.addEventListener("pointerleave", solta);
      b.addEventListener("click", function (e) { e.preventDefault(); if (!segurou) andar(dir, false); segurou = false; });
      (o.pai || el.parentNode).appendChild(b); return b; }
    function setas() { if (!E) return; var r = el.getBoundingClientRect(), p = (o.pai || el.parentNode).getBoundingClientRect(), f = o.esq ? o.esq() : 0, m = max();
      [E, D].forEach(function (b) { b.style.top = (r.top - p.top) + "px"; b.style.height = r.height + "px"; });
      E.style.left = (r.left - p.left + f) + "px"; D.style.left = (r.right - p.left - 30) + "px";
      E.classList.toggle("on", el.scrollLeft > 2); D.classList.toggle("on", el.scrollLeft < m - 2); }
    if (o.setas) { E = seta(-1); D = seta(1); try { new ResizeObserver(setas).observe(el); new MutationObserver(function () { requestAnimationFrame(setas); }).observe(el, {childList: true}); } catch (x) {} addEventListener("resize", setas); setTimeout(setas, 0); }
    el.__firme = {por: por, andar: andar, setas: setas}; return el.__firme;
  }
  var css3 = document.createElement("style"); css3.textContent =
    ".bwf-opcp{position:absolute;z-index:6;width:34px;height:26px;border-radius:999px;border:0;background:rgba(3,6,16,.45);color:#fff;font:900 17px/1 Inter,system-ui,sans-serif;letter-spacing:1px;cursor:pointer;opacity:.6;transition:opacity .2s;touch-action:manipulation}" +
    ".bwf-opcp:hover,.bwf-opcp:focus-visible{opacity:1;background:rgba(3,6,16,.75)}" +
    ".bwf-firme{overflow-x:hidden!important;overscroll-behavior:none!important;touch-action:pan-y!important;scroll-snap-type:none!important}" +
    ".bwf-seta{position:absolute;z-index:9;width:30px;padding:0;border:0;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s;touch-action:none;-webkit-tap-highlight-color:transparent}" +
    ".bwf-seta.on{opacity:.9;pointer-events:auto}.bwf-seta.pressa{pointer-events:auto}.bwf-seta svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7))}" +
    ".bwf-seta.esq{background:linear-gradient(90deg,rgba(21,23,29,.96),rgba(21,23,29,0))}.bwf-seta.dir{background:linear-gradient(270deg,rgba(21,23,29,.96),rgba(21,23,29,0))}.bwf-seta:active{opacity:1}" +
    ".bwf-vz{position:absolute;z-index:6;height:26px;padding:0 10px;border-radius:999px;border:0;background:rgba(3,6,16,.7);color:#fff;font:800 11px Inter,system-ui,sans-serif;cursor:pointer}.bwf-vz[hidden]{display:none}";
  (document.head || document.documentElement).appendChild(css3);

  window.BWFerr = { faixaFirme: faixaFirme, previa: previa, barra: barra, trocar: trocar, atalhos: atalhos, menu: menu, fecharMenu: fecharMenu, contexto: contexto, ajuda: ajuda, telaFixa: telaFixa, mostrarAjuda: mostrarAjuda, preso: preso, digitando: digitando,
    atual: function () { return BARRA ? (BARRA.temp || BARRA.atual) : "v"; }, alt: function () { return !!(BARRA && BARRA.alt); },
    ICONES: { v: "➤", c: "✂", h: "✋", z: "🔍", t: "T", b: "🖌", e: "⌫", i: "💧", m: "⬚", r: "⟳", p: "✒" } };
})();
