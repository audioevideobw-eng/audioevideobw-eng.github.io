/* ESTÚDIO DE MOTION — LAYOUT DE APP (22/11/2026, pedido do dono: "o Motion com a mesma cara de app do editor de vídeo no celular").
   Mesmo jeito do assets/ve-app.js: topo fino (‹, formato, MODELOS, ⋯, Exportar), PRÉVIA grande, linha de controle (tempo, ▶, desfazer),
   LINHA DO TEMPO fina com a AGULHA PARADA NO MEIO (rolar = andar no vídeo), FAIXA DE FERRAMENTAS que rola para o lado e muda conforme o
   que foi tocado (nada escolhido = projeto; item escolhido = ferramentas do item) e FOLHAS que sobem de baixo com UMA seção só.
   Este arquivo só ARRUMA a tela: empresta os pedaços que o motion.js já desenha e chama as mesmas funções (window.BWMotionEditor).
   Nada de dado novo, nada sai do aparelho. Precisa vir ANTES do motion.js (liga html.mo-app). */
(function () {
  "use strict";
  var H = document.documentElement, q = new URLSearchParams(location.search), forcar = q.get("layout") || "";
  var ligado = forcar === "app" || (forcar !== "classico" && (innerWidth <= 900 || (matchMedia("(pointer:coarse)").matches && innerWidth <= 1180)));
  if (!ligado) { H.classList.remove("app-cedo"); window.MOApp = {ligado: false}; return; }
  H.classList.add("mo-app");
  var MEIO_ANT = innerWidth <= 900;
  addEventListener("resize", function () { clearTimeout(window.__moAppRz); window.__moAppRz = setTimeout(function () { if (forcar === "app") return; if ((innerWidth <= 900) !== MEIO_ANT && !matchMedia("(pointer:coarse)").matches) location.reload(); }, 400); });

  var $ = function (i) { return document.getElementById(i); }, E = function () { return window.BWMotionEditor; };
  var IC = {
    itens: '<path d="M4 4h16v16H4z"/><path d="M12 8v8M8 12h8"/>', texto: '<path d="M4 7V5h12v2M10 5v14M7 19h6"/>', efe: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',
    fundo: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-4 4 3 3-2 6 5"/>', modelos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v4M16 5v4"/>',
    auto: '<path d="M5 19L19 5"/><path d="M15 5h4v4"/><path d="M6 6l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/>', criar: '<path d="M12 20v-8M8 16l4-4 4 4"/><circle cx="12" cy="6" r="3"/>',
    proj: '<path d="M4 6h6l2 2h8v10H4z"/>', prop: '<rect x="6" y="3" width="12" height="18" rx="2"/>', tela: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    cel: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>', editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', pos: '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    entra: '<path d="M3 12h12M11 8l4 4-4 4"/><path d="M19 4v16"/>', sai: '<path d="M5 4v16"/><path d="M9 12h12M17 8l4 4-4 4"/>', loop: '<path d="M4 12a8 8 0 0114-5l2 2M20 12a8 8 0 01-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
    cor: '<path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z"/>', tempo: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/>', key: '<path d="M12 3l7 9-7 9-7-9z"/>',
    gravar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>', dividir: '<path d="M8 4v16M16 4v16"/><path d="M4 8l4 4-4 4M20 8l-4 4 4 4"/>',
    apIni: '<path d="M4 4v16"/><path d="M20 12H8M12 8l-4 4 4 4"/>', apFim: '<path d="M20 4v16"/><path d="M4 12h12M12 8l4 4-4 4"/>', duplicar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>',
    frente: '<rect x="8" y="3" width="12" height="12" rx="2"/><path d="M4 9v12h12"/>', excluir: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', mais3: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    voltar: '<path d="M15 5l-7 7 7 7"/>', ok: '<path d="M5 12l5 5 9-10"/>', cheia: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', desf: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
    ref: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || IC.itens) + '</svg>'; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clicar(id) { var b = $(id); if (b) b.click(); }
  function aviso(t) { var e = E(); if (e && e.aviso) e.aviso(t); }

  /* ---------- montar a casca ---------- */
  var APP, SHEET, CORPO, TIT, FAIXA, EMP = [];   /* EMP = pedaços emprestados para a folha (voltam ao lugar ao fechar) */
  function montar() {
    var wrap = document.querySelector(".wrap"); if (!wrap || APP) return;
    APP = el("div", "ma"); APP.id = "moApp";
    APP.innerHTML =
      '<div class="ma-topo"><button type="button" class="ma-ic" id="maVoltar" aria-label="Voltar">' + svg("voltar") + '</button>' +
      '<button type="button" class="ma-chip" id="maFmt" aria-label="Formato do vídeo"><span id="maFmtTxt">9:16</span> ▾</button>' +
      '<button type="button" class="ma-chip" id="maModelos" aria-label="Modelos prontos">🎬 MODELOS</button><span class="ma-sp"></span>' +
      '<button type="button" class="ma-ic" id="maMais" aria-label="Mais opções">' + svg("mais3") + '</button>' +
      '<button type="button" class="ma-exp" id="maExportar">Exportar</button></div>' +
      '<div class="ma-tela" id="maTela"></div>' +
      '<div class="ma-ctrl"><button type="button" class="ma-ic" id="maCheia" aria-label="Tela grande">' + svg("cheia") + '</button><span class="ma-tempo" id="maTempo"></span>' +
      '<button type="button" class="ma-play" id="maPlay" aria-label="Tocar ou pausar"></button><span class="ma-sp"></span>' +
      '<button type="button" class="ma-ic" id="maDesf" aria-label="Desfazer">' + svg("desf") + '</button><button type="button" class="ma-ic" id="maRef" aria-label="Refazer">' + svg("ref") + '</button></div>' +
      '<div class="ma-tl" id="maTl"><i class="ma-agulha" aria-hidden="true"></i><button type="button" class="ma-add" id="maAdd" aria-label="Pôr um item na tela">＋</button></div>' +
      '<div class="ma-faixa" id="maFaixa" role="toolbar" aria-label="Ferramentas"></div>' +
      '<div class="ma-sheet" id="maSheet" hidden role="dialog" aria-modal="false"><div class="ma-sheet-cab"><span class="ma-alca" aria-hidden="true"></span><b id="maSheetTit"></b><span class="ma-sp"></span>' +
      '<button type="button" class="ma-ic" id="maSheetOk" aria-label="Pronto">' + svg("ok") + '</button></div><div class="ma-sheet-corpo" id="maSheetCorpo"></div></div>';
    document.body.appendChild(APP);
    setTimeout(function () { requestAnimationFrame(function () { H.classList.remove("app-cedo"); }); }, 0);   /* a casca já está montada: mostra */
    SHEET = $("maSheet"); CORPO = $("maSheetCorpo"); TIT = $("maSheetTit"); FAIXA = $("maFaixa");
    var tela = $("moTela"), op = $("moOpcP"); $("maTela").appendChild(tela); if (op) $("maTela").appendChild(op);
    var corpo = document.querySelector(".mo-tl-corpo"); if (corpo) $("maTl").insertBefore(corpo, $("maTl").firstChild);
    var av = $("moAviso"); if (av) APP.appendChild(av);
    wrap.classList.add("ma-escondido");
    ligar(); faixa(); medir(); setInterval(espelhar, 250); requestAnimationFrame(seguir);
    document.addEventListener("bw-mo-sel", function () { clearTimeout(FAIXA._t); FAIXA._t = setTimeout(faixa, 20); if (!SHEET.hidden && SHEET.dataset.g) filtrar(SHEET.dataset.g); });
    try { new ResizeObserver(function () { var e = E(); if (e) e.medir(); medir(); }).observe($("maTela")); } catch (e) {}
    setTimeout(function () { var e = E(); if (e) e.medir(); }, 60);
    /* 22/11: faixa e linha do tempo com rolagem própria presa nas pontas (sem o elástico) + setinhas ‹ › — BWFerr.faixaFirme */
    if (window.BWFerr && BWFerr.faixaFirme) {
      if (BWFerr.travarBorda) BWFerr.travarBorda({so: "mo-app"}); /* 24/11: gesto de voltar do Safari pela borda */
      if (BWFerr.toqueDuplo) BWFerr.toqueDuplo({so: "mo-app", pular: ".ma-faixa,.bwf-seta"}); /* 24/11: dois toques rápidos = botão direito */
      BWFerr.faixaFirme(FAIXA, {setas: true, pai: APP, esq: function () { var v = FAIXA.querySelector(".ma-f.volta"); return v ? v.offsetWidth + 8 : 0; }});
      BWFerr.faixaFirme($("moPistas"), {aoRolar: function () { rolando = Date.now(); }, parar: function () { return !!window.__bwSegurando; }, pular: function (t) { return !!(t.closest && t.closest(".mo-barra.on,[data-kf],[data-al]")); }});
    }
  }

  /* ---------- agulha parada no meio: rolar a linha do tempo = andar no vídeo ---------- */
  var rolando = 0, prog = false;
  function medir() { var pis = $("moPistas"); if (!pis) return; APP.style.setProperty("--ma-meio", Math.round(pis.clientWidth / 2) + "px"); }
  function seguir() { var e = E(), pis = $("moPistas"); if (e && pis && !rolando) { var alvo = e.tempo() * e.pxs(); if (Math.abs(pis.scrollLeft - alvo) > 1) { prog = true; pis.scrollLeft = alvo; } } requestAnimationFrame(seguir); }
  function ligar() {
    var pis = $("moPistas");
    var pega = function () { rolando = Date.now(); };
    ["touchstart", "wheel"].forEach(function (t) { pis.addEventListener(t, pega, {passive: true}); });
    pis.addEventListener("scroll", function () { if (prog) { prog = false; return; } if (!rolando) return; rolando = Date.now(); var e = E(); if (!e) return; if (e.tocando()) e.tocar(); e.ver(pis.scrollLeft / e.pxs()); });
    setInterval(function () { if (rolando && Date.now() - rolando > 260) rolando = 0; }, 120);
    /* pinça com dois dedos = mais ou menos tempo na tela */
    var pin = null;
    pis.addEventListener("touchstart", function (e) { if (e.touches && e.touches.length === 2) pin = Math.abs(e.touches[0].clientX - e.touches[1].clientX); }, {passive: true});
    pis.addEventListener("touchmove", function (e) { if (!pin || e.touches.length !== 2) return; e.preventDefault(); var d = Math.abs(e.touches[0].clientX - e.touches[1].clientX), ed = E(); if (!ed) return; if (d / pin > 1.18) { ed.zoom(1.3); pin = d; } else if (pin / d > 1.18) { ed.zoom(1 / 1.3); pin = d; } }, {passive: false});
    pis.addEventListener("touchend", function (e) { if (e.touches.length < 2) pin = null; }, {passive: true});
    /* toque numa barra = escolher (a faixa muda); toque no vazio = largar */
    var t0 = null;
    pis.addEventListener("pointerdown", function (e) { t0 = {x: e.clientX, y: e.clientY, t: Date.now()}; }, true);
    pis.addEventListener("click", function (e) { if (!t0 || Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 8 || Date.now() - t0.t > 600) return; if (e.target.closest("[data-kf],[data-al]")) return;
      var b = e.target.closest("[data-barra]"), ed = E(); if (!ed) return; var id = b && b.getAttribute("data-barra"); if (id) { if (ed.sel() !== id) ed.selecionar(id, false); } else if (ed.sel() && !e.target.closest("#moRegua")) ed.selecionar(null); });
    $("maVoltar").onclick = function () { var b = $("bwFocoVoltar"); if (b) b.click(); else history.back(); };
    $("maExportar").onclick = function () { clicar("moExportar"); };
    $("maModelos").onclick = function () { abrir("mo_modelos"); };
    $("maFmt").onclick = function () { abrir("fmt"); };
    $("maCheia").onclick = function () { H.classList.toggle("ma-grande"); setTimeout(function () { var e = E(); if (e) e.medir(); medir(); }, 30); };
    $("maPlay").onclick = function () { var e = E(); if (e) e.tocar(); };
    $("maDesf").onclick = function () { clicar("moDesfazer"); }; $("maRef").onclick = function () { clicar("moRefazer"); };
    $("maAdd").onclick = function () { abrir("mo_lib"); };
    $("maSheetOk").onclick = fechar;
    $("maMais").onclick = function (ev) { if (!window.BWFerr) return; var r = ev.currentTarget.getBoundingClientRect();
      BWFerr.menu(r.right - 230, r.bottom + 4, [{icone: "📁", rot: "Projeto (nome, duração, meus projetos)", fn: function () { abrir("proj"); }}, {icone: "🎬", rot: "Modelos prontos", fn: function () { abrir("mo_modelos"); }},
        {icone: "✨", rot: "Motion automático", fn: function () { clicar("moAuto"); }}, {icone: "✦", rot: "Criar efeito com ajuda", fn: function () { clicar("moCriarEfeito"); }},
        {icone: "🖥", rot: "Prévia no 2º monitor", fn: function () { clicar("moJanela"); }}, {icone: "📱", rot: "Controle pelo celular", fn: function () { clicar("moCelular"); }}], "PROJETO"); };
    /* pôr um item da biblioteca ou um modelo fecha a folha (senão parece que nada aconteceu) */
    CORPO.addEventListener("click", function (e) {
      if (e.target.closest("#moLib [data-add]")) setTimeout(function () { fechar(); aviso("✓ Item na tela, no tempo da agulha. As ferramentas dele estão embaixo."); }, 40);
      else if (SHEET.dataset.g === "mo_modelos" && e.target.closest("button,[data-modelo]")) setTimeout(fechar, 60);
      else if (SHEET.dataset.g === "mo_efs" && e.target.closest(".mo-ef")) setTimeout(fechar, 60);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !SHEET.hidden && !document.querySelector(".bwf-menu,.mo-folha:not([hidden])")) { fechar(); e.stopPropagation(); } }, true);
  }
  function espelhar() { var e = E(); if (!e) return; var bv = $("bwcrVolta"); if (bv && bv.parentNode !== APP) APP.appendChild(bv);   /* "⟵ linha do tempo" (veio do editor de vídeo) fica à vista no app */ var t = $("moTempo"); if (t) $("maTempo").textContent = t.textContent; var p = $("maPlay"); p.classList.toggle("on", !!e.tocando()); p.setAttribute("aria-label", e.tocando() ? "Pausar" : "Tocar");
    var f = $("moFmt"); if (f) { var o = f.options[f.selectedIndex]; $("maFmtTxt").textContent = o ? o.textContent.split(" ")[0] : f.value; }
    $("maDesf").disabled = $("moDesfazer").disabled; $("maRef").disabled = $("moRefazer").disabled; }

  /* ---------- faixa de ferramentas ---------- */
  function ferramentas() {
    var e = E(), id = e && e.sel(), it = id && e.item(id);
    if (!it) return [["itens", "Itens", function () { abrir("mo_lib"); }], ["texto", "Texto", function () { var b = document.querySelector('#moLib [data-add="texto"]'); if (b) { b.click(); aviso("✓ Texto na tela. Toque em EDITAR para escrever."); } }],
      ["efe", "Efeitos", function () { abrir("mo_efs"); }], ["fundo", "Fundo", function () { abrir("mo_fundo"); }], ["modelos", "Modelos", function () { abrir("mo_modelos"); }],
      ["auto", "Automático", function () { clicar("moAuto"); }], ["criar", "Criar efeito", function () { clicar("moCriarEfeito"); }], ["prop", "Formato", function () { abrir("fmt"); }],
      ["proj", "Projeto", function () { abrir("proj"); }], ["tela", "Outra tela", function () { clicar("moJanela"); }], ["cel", "Controle", function () { clicar("moCelular"); }]];
    var g = function (k, ic, rot) { return [ic, rot, function () { abrir(k); }]; };
    var grav = $("moGravar"), gravOn = grav && /on|ativo/.test(grav.className);
    return [["voltar", "", function () { e.selecionar(null); }, "volta"], g("mo_conteudo", "editar", "Editar"), g("mo_pos", "pos", "Posição"), ["key", "Keyframe", function () { e.keyPos(); }],
      ["gravar", gravOn ? "Gravando" : "Gravar mov.", function () { clicar("moGravar"); setTimeout(faixaJa, 30); }, gravOn ? "destaque" : ""],
      g("mo_entrada", "entra", "Entrada"), g("mo_saida", "sai", "Saída"), g("mo_loop", "loop", "Durante"), ["efe", "Efeitos", function () { abrir("mo_efs"); }], g("mo_cor", "cor", "Cor"), g("mo_tempo", "tempo", "Tempo"),
      ["dividir", "Dividir", function () { e.cortar(id); }], ["apIni", "Aparar início", function () { e.aparar(id, "q"); }], ["apFim", "Aparar fim", function () { e.aparar(id, "w"); }],
      ["duplicar", "Duplicar", function () { e.duplicar(id); }], ["frente", "Para a frente", function () { e.ordem(id, 9); }], ["mais3", "Mais", function () { opcoes(id); }], ["excluir", "Excluir", function () { e.apagar(id); }, "perigo"]];
  }
  function opcoes(id) { var b = document.querySelector('#moPistas [data-barra="' + id + '"]'); if (!b) return; var r = b.getBoundingClientRect(), x = Math.max(10, Math.min(innerWidth - 10, r.left + Math.min(r.width / 2, 60))), y = r.top + r.height / 2;
    b.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: x, clientY: y})); }
  var ASS = "";
  function faixaJa() { ASS = ""; faixa(); }
  function faixa() { if (!FAIXA) return; var e = E(), id = e && e.sel(), it = id && e.item(id), L = ferramentas(), ass = (it ? id : "raiz") + "|" + L.map(function (x) { return x[1]; }).join(",");
    if (ass === ASS) return; ASS = ass; FAIXA.setAttribute("data-ctx", it ? "item" : "raiz");
    var nome = it ? String((it.props && it.props.texto) || it.tipo || "ITEM").replace(/[*\n]/g, " ").slice(0, 14).toUpperCase() : "";
    FAIXA.innerHTML = (it ? '<span class="ma-etq">' + nome.replace(/[&<>"]/g, "") + '</span>' : "") +
      L.map(function (x, i) { return '<button type="button" class="ma-f' + (x[3] ? " " + x[3] : "") + '" data-i="' + i + '"' + (x[1] ? "" : ' aria-label="Voltar"') + '>' + svg(x[0]) + (x[1] ? "<span>" + x[1] + "</span>" : "") + "</button>"; }).join("");
    FAIXA._L = L; FAIXA.scrollLeft = 0; }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("#maFaixa .ma-f"); if (!b || !FAIXA._L) return; var it = FAIXA._L[+b.dataset.i]; if (it) it[2](); });

  /* ---------- folhas que sobem de baixo (UMA seção por vez) ---------- */
  var NOMES = {mo_lib: "ITENS", mo_efs: "EFEITOS", mo_fundo: "FUNDO", mo_modelos: "MODELOS PRONTOS", mo_proj: "MEUS PROJETOS", mo_conteudo: "EDITAR", mo_pos: "POSIÇÃO E KEYFRAMES",
    mo_entrada: "ENTRADA", mo_saida: "SAÍDA", mo_loop: "DURANTE", mo_cor: "COR", mo_tempo: "TEMPO", fmt: "FORMATO", proj: "PROJETO"};
  function emprestar(x) { if (!x) return; EMP.push({el: x, pai: x.parentNode, prox: x.nextSibling}); CORPO.appendChild(x); }
  function guardar() { while (EMP.length) { var o = EMP.pop(); try { o.pai.insertBefore(o.el, o.prox && o.prox.parentNode === o.pai ? o.prox : null); } catch (e) { o.pai.appendChild(o.el); } } CORPO.innerHTML = ""; SHEET.removeAttribute("data-g"); }
  function grupoDe(h) { var t = h.querySelector("h4"); return t ? t.getAttribute("data-seta") || (/KEYFRAME/.test(t.textContent) ? "mo_pos" : "") : ""; }
  function filtrar(k) { [$("moEsq"), $("moDir")].forEach(function (lado) { if (!lado) return; lado.querySelectorAll(":scope > .mo-g, :scope > #moPainel > .mo-g").forEach(function (g) { g.classList.toggle("ma-fora", grupoDe(g) !== k); }); }); }
  function abrir(o) {
    guardar(); var tt = NOMES[o] || o.toUpperCase();
    if (/^mo_/.test(o)) { var lado = ["mo_lib", "mo_efs", "mo_fundo", "mo_modelos", "mo_proj"].indexOf(o) >= 0 ? $("moEsq") : $("moDir"); if (lado === $("moDir")) { var e = E(); if (!e || !e.sel()) return aviso("Toque num item primeiro."); }
      SHEET.dataset.g = o; emprestar(lado); filtrar(o); }
    else if (o === "fmt") { var box = el("div", "ma-fmts"); CORPO.appendChild(box); formatos(box); }
    else if (o === "proj") { var p = el("div", "ma-proj"); p.innerHTML = '<label class="ma-lb">Nome do projeto</label>'; CORPO.appendChild(p); emprestar($("moNome")); var l2 = el("label", "ma-lb", "Duração"); CORPO.appendChild(l2); emprestar($("moDur"));
      SHEET.dataset.g = "mo_proj"; emprestar($("moEsq")); filtrar("mo_proj"); }
    TIT.textContent = tt; SHEET.hidden = false; SHEET.dataset.o = o; H.classList.add("ma-folha"); CORPO.scrollTop = 0;
  }
  function fechar() { SHEET.hidden = true; guardar(); SHEET.removeAttribute("data-o"); H.classList.remove("ma-folha"); }
  function formatos(box) { var f = $("moFmt"); if (!f) return;
    box.innerHTML = [].slice.call(f.options).map(function (o) { var p = o.value.replace(/^4k-v$/, "9:16").replace(/^4k-h$/, "16:9").split(":"), w = +p[0] || 1, h = +p[1] || 1, k = 30 / Math.max(w, h); return '<button type="button" class="ma-fmt' + (o.value === f.value ? " on" : "") + '" data-v="' + o.value + '"><i style="width:' + Math.max(10, w * k) + "px;height:" + Math.max(10, h * k) + 'px"></i><span>' + o.textContent + '</span></button>'; }).join("");
    var liv = $("moLivre");
    box.onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b) return; f.value = b.dataset.v; f.dispatchEvent(new Event("change", {bubbles: true})); box.querySelectorAll(".ma-fmt").forEach(function (x) { x.classList.toggle("on", x === b); }); espelhar(); };
    if (liv) { EMP.push({el: liv, pai: liv.parentNode, prox: liv.nextSibling}); CORPO.appendChild(liv); } }

  var tent = 0; (function esperar() { if (window.BWMotionEditor && window.BWMotionEditor.sel && $("moPistas")) montar(); else if (tent++ < 200) setTimeout(esperar, 50); else H.classList.remove("app-cedo"); })();
  window.MOApp = {ligado: true, abrir: abrir, fechar: fechar, faixa: faixaJa, aberta: function () { return SHEET && !SHEET.hidden ? SHEET.dataset.o : ""; }};
})();
