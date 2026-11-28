/* BW LIVRE — mexer em janelas e imagens de forma livre e fluida, igual em todas as ferramentas (dono, 28/11:
   "salve e implemente esse modelo de mexer nas imagens e eixos de forma livre, assim como as janelas, em todas as ferramentas").
   1) JANELAS LIVRES: toda janela de ferramenta (folha / caixa de diálogo) se arrasta pela barra de cima OU por qualquer área livre
      (nunca a partir de botão, campo, régua, foto), muda de tamanho pelo canto ◢, lembra o lugar NESTE aparelho (ui_janelas)
      e volta ao lugar de sempre com dois toques/clique duplo na barra. No dedo, a área livre só arrasta onde nada rola por baixo.
   2) ALÇAS LIVRES (BWLivre.alcas): 8 alças nas pontas e lados do item escolhido — sem tecla estica LIVRE (X e Y soltos),
      com SHIFT mantém a proporção, com ALT estica a partir do centro. A ferramenta só diz onde o item está e recebe a caixa nova.
   Não guarda nada na conta e não usa a internet. */
(function () {
  "use strict";
  if (window.BWLivre) return;
  var CEL = function () { return window.innerWidth <= 760; };
  var NAO = 'input,textarea,select,button,a,label,canvas,video,audio,img,svg,[contenteditable],[data-a],[data-p],[data-v],[data-i],[role="button"],[role="tab"],[draggable="true"],summary,.bwl-alca,.bwf-menu,[data-livre-nao]';
  var css = document.createElement("style");
  css.textContent =
    ".bwl-arr{position:absolute;top:0;left:0;right:48px;height:22px;display:flex;align-items:center;justify-content:center;cursor:move;touch-action:none;user-select:none;z-index:6;color:rgba(245,241,234,.38);font:900 14px/1 Inter,system-ui,sans-serif;letter-spacing:2px;font-style:normal}" +
    ".bwl-arr:hover{color:#E8B54A}.bwl-tam{position:sticky;display:block;float:right;clear:both;bottom:0;margin:-20px -10px -10px auto;width:20px;height:20px;cursor:nwse-resize;touch-action:none;z-index:6;" +
    "background:linear-gradient(135deg,transparent 52%,rgba(232,181,74,.75) 52%,rgba(232,181,74,.75) 60%,transparent 60%,transparent 70%,rgba(232,181,74,.75) 70%,rgba(232,181,74,.75) 78%,transparent 78%)}" +
    "@media (pointer:coarse){.bwl-arr{height:30px}.bwl-tam{width:28px;height:28px;margin-top:-28px}}" +
    ".bwl-jan{position:relative!important}.bwl-jan.bwl-solta{position:fixed!important;margin:0!important;max-width:none!important;max-height:none!important;box-shadow:0 18px 50px rgba(0,0,0,.55)!important;overflow:auto}" +
    ".bwl-jan:not(.bwl-semesp){padding-top:max(22px,var(--bwl-pt,0px))!important}" +
    "@media (pointer:coarse){.bwl-jan:not(.bwl-semesp){padding-top:max(30px,var(--bwl-pt,0px))!important}}" +
    "html.bwl-mexendo,html.bwl-mexendo *{user-select:none!important;-webkit-user-select:none!important}" +
    ".bwl-caixa{position:fixed;pointer-events:none;z-index:9800;border:1.5px solid #E8B54A;box-shadow:0 0 0 1px rgba(0,0,0,.45);border-radius:2px}" +
    ".bwl-alca{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;background:#0B1222;border:2px solid #E8B54A;border-radius:3px;pointer-events:auto;touch-action:none;box-sizing:border-box}" +
    "@media (pointer:coarse){.bwl-alca{width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:6px}}" +
    ".bwl-alca[data-q=nw],.bwl-alca[data-q=se]{cursor:nwse-resize}.bwl-alca[data-q=ne],.bwl-alca[data-q=sw]{cursor:nesw-resize}" +
    ".bwl-alca[data-q=n],.bwl-alca[data-q=s]{cursor:ns-resize}.bwl-alca[data-q=e],.bwl-alca[data-q=w]{cursor:ew-resize}" +
    ".bwl-dim{position:absolute;left:50%;top:100%;transform:translate(-50%,8px);background:#0B1222;color:#E8B54A;font:700 11px Inter,system-ui,sans-serif;padding:3px 7px;border-radius:6px;white-space:nowrap}";
  (document.head || document.documentElement).appendChild(css);

  /* ---------------- 1) JANELAS LIVRES ---------------- */
  var FUNDOS = [".ve-jan", ".mo-folha", ".tl-folha", ".d3-folha", ".al-folha", ".rl-folha", ".pg-folha", ".pi-folha", ".ed-folha", ".pr-folha", ".pr-modal", ".cr-folha", ".pp-folha", "[data-janela-livre]"];
  var JAN = {}; try { JAN = JSON.parse(localStorage.getItem("ui_janelas") || "{}") || {}; } catch (e) { JAN = {}; }
  function gravar() { try { localStorage.setItem("ui_janelas", JSON.stringify(JAN)); } catch (e) { } }
  function visivel(el) { return !!el && !el.hidden && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none"; }
  function caixaDe(fundo) { var c = fundo.querySelector(":scope > .ve-jan-c, :scope > .jan, :scope > [role=dialog]") || fundo.firstElementChild; return c && c.tagName !== "SCRIPT" ? c : null; }
  function chave(fundo) { var p = location.pathname.split("/").pop().replace(/\.html$/, "") || "inicio"; return p + "|" + (fundo.id || fundo.className.split(" ")[0]) + (CEL() ? "-cel" : ""); }
  function encaixar(cx, r) {
    var vw = window.innerWidth, vh = window.innerHeight, w = Math.max(220, Math.min(vw, r.w)), h = Math.max(140, Math.min(vh, r.h));
    var x = Math.max(-w + 80, Math.min(vw - 80, r.x)), y = Math.max(0, Math.min(vh - 40, r.y));
    cx.classList.add("bwl-solta"); cx.style.left = x + "px"; cx.style.top = y + "px"; cx.style.width = w + "px"; cx.style.height = h + "px";
  }
  function soltar(cx) { cx.classList.remove("bwl-solta"); ["left", "top", "width", "height"].forEach(function (p) { cx.style[p] = ""; }); }
  function preparar(fundo) {
    var cx = caixaDe(fundo); if (!cx || !visivel(fundo)) return;
    if (cx.classList.contains("ve-jan-c")) cx.classList.add("bwl-semesp");   /* janela do vídeo já tem barra de título própria */
    cx.classList.add("bwl-jan"); cx.__bwlFundo = fundo;
    if (!cx.querySelector(":scope > .bwl-arr")) { var a = document.createElement("i"); a.className = "bwl-arr"; a.textContent = "⠿"; a.title = "Arraste para mover · dois toques: volta ao lugar"; a.setAttribute("aria-hidden", "true"); cx.appendChild(a); }
    var tv = cx.querySelector(":scope > .bwl-tam"); if (tv && tv !== cx.lastElementChild) cx.appendChild(tv);   /* o ◢ fica preso no pé da parte visível, mesmo com rolagem */
    if (!tv) { var t = document.createElement("i"); t.className = "bwl-tam"; t.title = "Arraste para mudar o tamanho"; t.setAttribute("aria-hidden", "true"); cx.appendChild(t); }
    if (J && J.cx === cx) return;
    if (!cx.__bwlAberta) { cx.__bwlAberta = true; var j = JAN[chave(fundo)]; if (j) encaixar(cx, j); else if (cx.classList.contains("bwl-solta")) soltar(cx); }
  }
  /* o lugar guardado é aplicado UMA vez por abertura (o observador roda a cada mudança — inclusive durante o próprio arraste) */
  function varrer() { FUNDOS.forEach(function (s) { [].forEach.call(document.querySelectorAll(s), function (f) { if (visivel(f)) preparar(f); else { var c = caixaDe(f); if (c) c.__bwlAberta = false; } }); }); }
  var agendado = 0; function agendar() { if (agendado) return; agendado = requestAnimationFrame(function () { agendado = 0; varrer(); }); }
  function rola(el, cx) { for (var n = el; n && n.nodeType === 1; n = n.parentNode) { var cs = getComputedStyle(n); if (/(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (n.scrollHeight > n.clientHeight + 2 || n.scrollWidth > n.clientWidth + 2)) return true; if (n === cx) break; } return false; }
  function livre(t, cx, tipo) {
    if (!t || !t.closest || !cx.contains(t) || t.closest(NAO)) return false;
    if (window.getSelection && String(window.getSelection()).length) return false;
    return tipo === "touch" ? !rola(t, cx) : true;
  }
  function janDe(t) { var cx = t && t.closest && t.closest(".bwl-jan"); return cx && cx.__bwlFundo ? cx : null; }
  var J = null, ultToque = 0, engolir = 0;
  document.addEventListener("pointerdown", function (ev) {
    if (ev.button > 0) return; var cx = janDe(ev.target); if (!cx) return;
    var t = ev.target, tam = t.classList && t.classList.contains("bwl-tam"), barra = t.classList && t.classList.contains("bwl-arr") || !!(t.closest && t.closest(".ve-jan-t") && !t.closest(NAO));
    if (!tam && !barra && !livre(t, cx, ev.pointerType)) return;
    if (barra && Date.now() - ultToque < 320) { delete JAN[chave(cx.__bwlFundo)]; gravar(); soltar(cx); ultToque = 0; return; }
    if (barra) ultToque = Date.now();
    var r = cx.getBoundingClientRect(); ev.preventDefault();
    J = { cx: cx, tam: tam, px: ev.clientX, py: ev.clientY, r: { x: r.left, y: r.top, w: r.width, h: r.height }, mexeu: false };
    try { cx.setPointerCapture(ev.pointerId); } catch (e) { }
  }, true);
  document.addEventListener("touchstart", function (ev) { var cx = janDe(ev.target); if (cx && ev.touches.length === 1 && !(ev.target.classList && /bwl-(arr|tam)/.test(ev.target.className)) && livre(ev.target, cx, "touch")) ev.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener("pointermove", function (ev) {
    if (!J) return; var dx = ev.clientX - J.px, dy = ev.clientY - J.py; if (!J.mexeu && Math.hypot(dx, dy) < 4) return;
    if (!J.mexeu) { J.mexeu = true; document.documentElement.classList.add("bwl-mexendo"); }
    ev.preventDefault(); encaixar(J.cx, J.tam ? { x: J.r.x, y: J.r.y, w: J.r.w + dx, h: J.r.h + dy } : { x: J.r.x + dx, y: J.r.y + dy, w: J.r.w, h: J.r.h });
  }, true);
  function fim() { if (!J) return; var j = J; J = null; document.documentElement.classList.remove("bwl-mexendo"); if (j.mexeu) { engolir = Date.now(); var r = j.cx.getBoundingClientRect(); JAN[chave(j.cx.__bwlFundo)] = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; gravar(); window.dispatchEvent(new Event("resize")); } }
  document.addEventListener("pointerup", fim, true); document.addEventListener("pointercancel", fim, true);
  /* o clique que nasce do fim de um arraste não fecha a janela (muitas fecham com toque no fundo) */
  document.addEventListener("click", function (ev) { if (Date.now() - engolir < 400) { ev.stopPropagation(); ev.preventDefault(); engolir = 0; } }, true);
  document.addEventListener("dblclick", function (ev) { var t = ev.target; if (t.classList && t.classList.contains("bwl-arr")) { var cx = janDe(t); if (cx) { delete JAN[chave(cx.__bwlFundo)]; gravar(); soltar(cx); } } }, true);
  function iniciar() { varrer(); new MutationObserver(agendar).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden", "class", "style"] }); window.addEventListener("resize", agendar); }
  if (document.body) iniciar(); else document.addEventListener("DOMContentLoaded", iniciar);

  /* ---------------- 2) ALÇAS LIVRES ----------------
     BWLivre.alcas({ caixa(): {x,y,w,h} na TELA (px) ou null, mudar(nova, info), fim(), giro?: graus })
     info = { q: "nw"|"n"|…, shift, alt, ini }. Devolve { atualizar(), parar() }. */
  function conta(R, q, dx, dy, shift, alt) {
    var x0 = R.x, y0 = R.y, x1 = R.x + R.w, y1 = R.y + R.h, k = alt ? 2 : 1;
    if (/w/.test(q)) x0 += dx; if (/e/.test(q)) x1 += dx; if (/n/.test(q)) y0 += dy; if (/s/.test(q)) y1 += dy;
    var w = Math.max(8, (x1 - x0)), h = Math.max(8, (y1 - y0));
    if (alt) { w = Math.max(8, R.w + (x1 - x0 - R.w) * k); h = Math.max(8, R.h + (y1 - y0 - R.h) * k); }
    if (shift) {
      var ar = R.w / R.h;
      if (q === "n" || q === "s") w = h * ar; else if (q === "e" || q === "w") h = w / ar;
      else { if (w / R.w > h / R.h) h = w / ar; else w = h * ar; }
    }
    var x, y;
    if (alt) { x = R.x + (R.w - w) / 2; y = R.y + (R.h - h) / 2; }
    else {
      x = /w/.test(q) ? R.x + R.w - w : /e/.test(q) ? R.x : R.x + (R.w - w) / 2;
      y = /n/.test(q) ? R.y + R.h - h : /s/.test(q) ? R.y : R.y + (R.h - h) / 2;
    }
    return { x: x, y: y, w: w, h: h };
  }
  function alcas(o) {
    var box = document.createElement("div"); box.className = "bwl-caixa"; box.hidden = true; document.body.appendChild(box);
    var Q = ["nw", "n", "ne", "e", "se", "s", "sw", "w"], P = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] };
    Q.forEach(function (q) { var a = document.createElement("i"); a.className = "bwl-alca"; a.setAttribute("data-q", q); a.style.left = P[q][0] + "%"; a.style.top = P[q][1] + "%"; a.title = "Arraste: livre · Shift: proporcional · Alt: do centro"; box.appendChild(a); });
    var dim = document.createElement("b"); dim.className = "bwl-dim"; dim.hidden = true; box.appendChild(dim);
    var D = null, vivo = true, ultimo = "";
    function atualizar() {
      if (!vivo) return; var r = null; try { r = o.caixa(); } catch (e) { r = null; }
      if (!r || !(r.w > 2) || !(r.h > 2)) { box.hidden = true; ultimo = ""; return; }
      var s = Math.round(r.x) + "," + Math.round(r.y) + "," + Math.round(r.w) + "," + Math.round(r.h) + "," + (o.giro ? o.giro() || 0 : 0);
      box.hidden = false; if (s === ultimo) return; ultimo = s;
      box.style.left = r.x + "px"; box.style.top = r.y + "px"; box.style.width = r.w + "px"; box.style.height = r.h + "px";
      var g = o.giro ? +o.giro() || 0 : 0; box.style.transform = g ? "rotate(" + g + "deg)" : ""; box.style.transformOrigin = "50% 50%";
    }
    function laco() { if (!vivo) return; if (!D) atualizar(); requestAnimationFrame(laco); }
    box.addEventListener("pointerdown", function (ev) {
      var a = ev.target.closest(".bwl-alca"); if (!a) return; ev.preventDefault(); ev.stopPropagation();
      var r = o.caixa(); if (!r) return; D = { q: a.getAttribute("data-q"), px: ev.clientX, py: ev.clientY, ini: { x: r.x, y: r.y, w: r.w, h: r.h } };
      try { a.setPointerCapture(ev.pointerId); } catch (e) { } document.documentElement.classList.add("bwl-mexendo"); if (o.comecar) o.comecar();
    });
    box.addEventListener("pointermove", function (ev) {
      if (!D) return; ev.preventDefault();
      var g = (o.giro ? +o.giro() || 0 : 0) * Math.PI / 180, dx = ev.clientX - D.px, dy = ev.clientY - D.py;
      if (g) { var c = Math.cos(-g), s = Math.sin(-g), rx = dx * c - dy * s, ry = dx * s + dy * c; dx = rx; dy = ry; }
      var n = conta(D.ini, D.q, dx, dy, ev.shiftKey, ev.altKey);
      box.style.left = n.x + "px"; box.style.top = n.y + "px"; box.style.width = n.w + "px"; box.style.height = n.h + "px";
      dim.hidden = false; dim.textContent = Math.round(n.w / D.ini.w * 100) + "% × " + Math.round(n.h / D.ini.h * 100) + "%" + (ev.shiftKey ? " · proporcional" : "");
      o.mudar(n, { q: D.q, shift: ev.shiftKey, alt: ev.altKey, ini: D.ini });
    });
    var acabar = function () { if (!D) return; D = null; dim.hidden = true; ultimo = ""; document.documentElement.classList.remove("bwl-mexendo"); if (o.fim) o.fim(); };
    box.addEventListener("pointerup", acabar); box.addEventListener("pointercancel", acabar);
    requestAnimationFrame(laco);
    return { atualizar: function () { ultimo = ""; atualizar(); }, parar: function () { vivo = false; box.remove(); }, mexendo: function () { return !!D; }, el: box };
  }
  window.BWLivre = { alcas: alcas, conta: conta, varrer: varrer, FUNDOS: FUNDOS };
})();
