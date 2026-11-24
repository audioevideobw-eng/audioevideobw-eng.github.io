/* EDITOR DE VÍDEO — LAYOUT DE APP (22/11/2026, pedido do dono com prints do CapCut do celular — nada copiado, só o jeito de organizar):
   no celular/tablet a tela vira um app de edição: topo fino (‹, formato, Exportar), PRÉVIA grande, linha de controle (tela cheia, ▶, desfazer),
   LINHA DO TEMPO fina com a AGULHA PARADA NO MEIO (as camadas rolam por baixo dela, com as miniaturas dos takes), e embaixo uma FAIXA DE
   FERRAMENTAS que rola para o lado e MUDA conforme o que foi tocado (nada escolhido = ferramentas do projeto; vídeo/foto, texto ou som =
   ferramentas daquele take). Cada ferramenta abre uma FOLHA que sobe de baixo com só aquele ajuste. Segurar o dedo no take abre as opções.
   Este arquivo só ARRUMA a tela: move os pedaços que o video-editor.js já desenha e chama os mesmos botões — nada de dado novo, nada sai do aparelho.
   No celular/tablet há UM layout só (decisão do dono, 22/11). */
(function () {
  "use strict";
  var H = document.documentElement, q = new URLSearchParams(location.search);
  try { localStorage.removeItem("ui_ve_layout"); } catch (e) {}   /* 22/11: o dono pediu UM layout só no celular — a opção "clássico" saiu */
  var forcar = q.get("layout") || "";   /* ?layout=classico fica só para os testes automáticos das funções */
  var largura = Math.min(innerWidth, screen && screen.width ? screen.width : innerWidth);
  var ligado = forcar === "app" || (forcar !== "classico" && (innerWidth <= 900 || (matchMedia("(pointer:coarse)").matches && innerWidth <= 1180)));
  if (!ligado) { H.classList.remove("app-cedo"); window.VEApp = {ligado: false}; return; }
  H.classList.add("ve-app");
  var MEIO_ANT = innerWidth <= 900;
  addEventListener("resize", function () { clearTimeout(window.__veAppRz); window.__veAppRz = setTimeout(function () { if (forcar === "app") return; if ((innerWidth <= 900) !== MEIO_ANT && !matchMedia("(pointer:coarse)").matches) location.reload(); }, 400); });

  var $ = function (i) { return document.getElementById(i); }, V = function () { return window.__video; };
  var IC = {
    mais: '<path d="M4 4h16v16H4z"/><path d="M12 8v8M8 12h8"/>', audio: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    texto: '<path d="M4 7V5h12v2M10 5v14M7 19h6"/><path d="M17 13v6M14 16h6"/>', modelos: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5v4M16 5v4"/>',
    trans: '<path d="M4 6l7 6-7 6zM20 6l-7 6 7 6z"/>', efe: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    criar: '<path d="M5 19L19 5"/><path d="M15 5h4v4"/><path d="M5 9V5h4M5 15v4h4"/>', prop: '<rect x="6" y="3" width="12" height="18" rx="2"/>',
    tela: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>', cel: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    camadas: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>', dividir: '<path d="M8 4v16M16 4v16"/><path d="M4 8l4 4-4 4M20 8l-4 4 4 4"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>', vel: '<path d="M4 15a8 8 0 1116 0"/><path d="M12 15l4-5"/>',
    cor: '<path d="M12 3c3 4 6 7 6 11a6 6 0 01-12 0c0-4 3-7 6-11z"/>', pessoa: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/><path d="M3 3h4M17 3h4M3 3v4M21 3v4"/>',
    rastro: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>',
    masc: '<path d="M4 5h16v14H4z" stroke-dasharray="3 2"/><path d="M8 15l3-4 2 2 3-4"/>',
    chroma: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 14l5-4 4 3 3-2 6 5"/>', pos: '<path d="M12 3v18M3 12h18"/><path d="M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
    anima: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>', duplicar: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>',
    trocar: '<path d="M4 9h13l-4-4M20 15H7l4 4"/>', apIni: '<path d="M4 4v16"/><path d="M20 12H8M12 8l-4 4 4 4"/>', apFim: '<path d="M20 4v16"/><path d="M4 12h12M12 8l4 4-4 4"/>',
    excluir: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', mais3: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/>', sons: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>', importar: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>',
    extrair: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><path d="M14 19l6-6"/>', voltar: '<path d="M15 5l-7 7 7 7"/>', ok: '<path d="M5 12l5 5 9-10"/>',
    cheia: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', desf: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>', ref: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
    exportar: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/>', fecha: '<path d="M6 6l12 12M18 6L6 18"/>', congelar: '<path d="M12 2v20M4 6l16 12M20 6L4 18"/>'
  };
  function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || IC.mais) + '</svg>'; }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clicar(id) { var b = $(id); if (b) b.click(); }

  /* ---------- montar a casca ---------- */
  var APP, SHEET, CORPO, TIT, FAIXA, MOLHO = el("div", "va-molho");   /* molho = onde ficam guardados os pedaços que não estão na tela */
  function montar() {
    var wrap = document.querySelector(".wrap"); if (!wrap || APP) return;
    MOLHO.hidden = true; document.body.appendChild(MOLHO);
    APP = el("div", "va"); APP.id = "veApp";
    APP.innerHTML =
      '<div class="va-topo"><button type="button" class="va-ic" id="vaVoltar" aria-label="Voltar">' + svg("voltar") + '</button>' +
      '<button type="button" class="va-chip" id="vaFmt" aria-label="Formato do vídeo"><span id="vaFmtTxt">9:16</span> ▾</button>' +
      '<button type="button" class="va-chip" id="vaModelos" aria-label="Modelos prontos">🎬 MODELOS</button><span class="va-sp"></span>' +
      '<button type="button" class="va-ic" id="vaMais" aria-label="Mais opções">' + svg("mais3") + '</button>' +
      '<button type="button" class="va-exp" id="vaExportar">Exportar</button></div>' +
      '<div class="va-tela" id="vaTela"></div>' +
      '<div class="va-ctrl"><button type="button" class="va-ic" id="vaCheia" aria-label="Tela grande">' + svg("cheia") + '</button><span class="va-tempo" id="vaTempo"></span>' +
      '<button type="button" class="va-play" id="vaPlay" aria-label="Tocar ou pausar"></button><span class="va-sp"></span>' +
      '<button type="button" class="va-ic" id="vaDesf" aria-label="Desfazer">' + svg("desf") + '</button><button type="button" class="va-ic" id="vaRef" aria-label="Refazer">' + svg("ref") + '</button></div>' +
      '<div class="va-tl" id="vaTl"><i class="va-agulha" aria-hidden="true"></i><div role="button" tabindex="0" class="va-add" id="vaAdd" aria-label="Pôr mídia na linha do tempo">＋</div></div>' +
      '<div class="va-faixa" id="vaFaixa" role="toolbar" aria-label="Ferramentas"></div>' +
      '<div class="va-sheet" id="vaSheet" hidden role="dialog" aria-modal="false"><div class="va-sheet-cab"><span class="va-alca" aria-hidden="true"></span><b id="vaSheetTit"></b><span class="va-sp"></span>' +
      '<button type="button" class="va-ic" id="vaSheetOk" aria-label="Pronto">' + svg("ok") + '</button></div><div class="va-sheet-corpo" id="vaSheetCorpo"></div></div>';
    document.body.appendChild(APP);
    setTimeout(function () { requestAnimationFrame(function () { H.classList.remove("app-cedo"); }); }, 0);   /* a casca já está montada: mostra */
    SHEET = $("vaSheet"); CORPO = $("vaSheetCorpo"); TIT = $("vaSheetTit"); FAIXA = $("vaFaixa");
    /* pedaços do editor: a prévia, o tempo, a linha do tempo */
    var tela = document.querySelector(".ve-tela"); if (tela) $("vaTela").appendChild(tela);
    var corpo = document.querySelector(".ve-tl-corpo"); if (corpo) $("vaTl").insertBefore(corpo, $("vaTl").firstChild);
    ["veProp", "veMidia", "veCriar"].forEach(function (i) { var x = $(i); if (x) MOLHO.appendChild(x); });
    var liv = $("veLivre"); if (liv) MOLHO.appendChild(liv);
    var av = $("veAviso"); if (av) APP.appendChild(av);
    wrap.classList.add("va-escondido");
    ligar(); faixa(); medir(); setInterval(espelhar, 250); requestAnimationFrame(seguir);
    try { new MutationObserver(function () { if (!SHEET.hidden && SHEET.dataset.g) filtrarGrupo(SHEET.dataset.g); if (!SHEET.hidden) abrirSetas(); clearTimeout(MOLHO._t); MOLHO._t = setTimeout(faixa, 30); }).observe($("vePropCorpo"), {childList: true}); } catch (e) {}
    try { new ResizeObserver(medir).observe($("veRolo")); } catch (e) { addEventListener("resize", medir); }
    /* 22/11 (dono: "a tela descola para o lado"): faixa de ferramentas e linha do tempo com rolagem PRÓPRIA, presa nas pontas (sem o elástico do
       navegador) + setinhas ‹ › discretas na faixa de ferramentas (toque anda, segurar anda direto) — BWFerr.faixaFirme */
    if (window.BWFerr && BWFerr.faixaFirme) {
      /* iPhone: nada fora das áreas que rolam (folhas) mexe a página — sem o "quique" da tela inteira */
      document.addEventListener("touchmove", function (e) { if (!e.cancelable) return; var t = e.target;
        if (!t || !t.closest || !t.closest(".va") || t.closest(".va-sheet-corpo,[data-rola-livre],input,textarea,select")) return; e.preventDefault(); }, {passive: false});
      ["gesturestart", "gesturechange"].forEach(function (ev) { document.addEventListener(ev, function (e) { if (e.target && e.target.closest && e.target.closest(".va")) e.preventDefault(); }, {passive: false}); });
      BWFerr.faixaFirme(FAIXA, {setas: true, pai: APP, esq: function () { var v = FAIXA.querySelector(".va-f.volta"); return v ? v.offsetWidth + 8 : 0; }});
      BWFerr.faixaFirme($("veRolo"), {max: fimPx, vertical: $("veRolo").closest(".ve-tl-corpo"), aoRolar: function () { rolando = Date.now(); }, parar: function () { return !!window.__bwSegurando; }, pular: function (t) { return !!(t.closest && t.closest(".ve-clip.on,.al,[data-junta],[data-trp]")); }});
    }
  }

  /* ---------- agulha parada no meio: rolar a linha do tempo = andar no vídeo ---------- */
  /* 23/11 (dono, iPhone: "o vídeo na linha do tempo fica travando e bugado, ainda tem rebote"; no Android estava bom):
     (1) cada movimento do dedo pulava o vídeo na hora, antes do pulo anterior terminar → o iPhone engasgava. Agora o arraste guarda só o
         último ponto e pula UMA vez por quadro (raspar), e o editor não empilha pulos enquanto o vídeo ainda está pulando (__veRaspa);
     (2) a linha do tempo deixava rolar além do fim do vídeo e o laço puxava de volta (o "quique") → a ponta da rolagem é o fim do vídeo;
     (3) a marca "essa rolagem fui eu" ficava presa quando o valor não mudava e engolia o próximo movimento → compara o VALOR, não uma marca. */
  var rolando = 0, progV = -1, raspaT = null, raspaRaf = 0;
  function medir() { var ro = $("veRolo"); if (!ro) return; APP.style.setProperty("--va-meio", Math.round(ro.clientWidth / 2) + "px"); }
  function fimPx() { var v = V(); return v ? Math.max(0, Math.round(v.total() * v.pps())) : null; }
  function seguir() { var v = V(), ro = $("veRolo"); if (v && ro && !rolando && raspaT == null) { var alvo = Math.min(v.T() * v.pps(), Math.max(0, ro.scrollWidth - ro.clientWidth)); if (Math.abs(ro.scrollLeft - alvo) > 1) { ro.scrollLeft = alvo; progV = ro.scrollLeft; } } requestAnimationFrame(seguir); }
  function raspar(t) { raspaT = t; window.__veRaspa = true; if (raspaRaf) return; raspaRaf = requestAnimationFrame(function () { raspaRaf = 0; var v = V(); if (v && raspaT != null) { if (v.tocando()) clicar("vePlay"); v.irPara(raspaT); } }); }
  function soltarRaspa() { if (!window.__veRaspa) return; window.__veRaspa = false; raspaT = null; var v = V(); if (v && !v.tocando()) v.irPara(v.T()); }   /* no fim, o quadro exato */
  function ligar() {
    var ro = $("veRolo"), v = V();
    var pega = function () { rolando = Date.now(); };
    ["touchstart", "wheel", "pointerdown"].forEach(function (t) { ro.addEventListener(t, function (e) { if (t === "pointerdown" && e.pointerType === "mouse" && !e.target.closest("#veRegua")) return; pega(); }, {passive: true}); });
    ro.addEventListener("scroll", function () { if (!rolando && Math.abs(ro.scrollLeft - progV) < 1.5) return; if (!rolando) return; rolando = Date.now(); var v2 = V(); if (v2) { var f = fimPx(); if (f != null && ro.scrollLeft > f + 1) { ro.scrollLeft = f; } raspar(Math.min(ro.scrollLeft, f == null ? ro.scrollLeft : f) / v2.pps()); } }, {passive: true});
    setInterval(function () { if (rolando && Date.now() - rolando > 260) { rolando = 0; soltarRaspa(); } }, 120);
    /* pinça com dois dedos = mais ou menos tempo na tela */
    var pin = null;
    ro.addEventListener("touchstart", function (e) { if (e.touches && e.touches.length === 2) pin = Math.abs(e.touches[0].clientX - e.touches[1].clientX); }, {passive: true});
    ro.addEventListener("touchmove", function (e) { if (!pin || e.touches.length !== 2) return; e.preventDefault(); var d = Math.abs(e.touches[0].clientX - e.touches[1].clientX); if (d / pin > 1.18) { clicar("veZoomMais"); pin = d; } else if (pin / d > 1.18) { clicar("veZoomMenos"); pin = d; } }, {passive: false});
    ro.addEventListener("touchend", function (e) { if (e.touches.length < 2) pin = null; }, {passive: true});
    /* toque num take = escolher (a faixa de ferramentas muda); toque no vazio = largar */
    var t0 = null;
    ro.addEventListener("pointerdown", function (e) { t0 = {x: e.clientX, y: e.clientY, t: Date.now()}; });
    ro.addEventListener("click", function (e) { if (!t0 || Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 8 || Date.now() - t0.t > 600) return; if (e.target.closest("[data-junta],[data-trp],.al")) return;
      var c = e.target.closest("[data-clip]"), v2 = V(); if (!v2) return; var atual = v2.selAtual(); if (c) { if (!atual || atual.id !== c.dataset.clip) v2.sel(c.dataset.clip); } else if (atual && !e.target.closest("#veRegua")) v2.sel(null); });
    $("vaVoltar").onclick = function () { var b = $("bwFocoVoltar"); if (b) b.click(); else history.back(); };
    $("vaExportar").onclick = function () { clicar("veExportar"); };
    $("vaModelos").onclick = function () { if (window.VEModelos) VEModelos.abrir(); };
    $("vaFmt").onclick = function () { abrir("prop"); };
    $("vaCheia").onclick = function () { H.classList.toggle("va-grande"); medir(); };
    $("vaPlay").onclick = function () { clicar("vePlay"); };
    $("vaDesf").onclick = function () { clicar("veDesf"); }; $("vaRef").onclick = function () { clicar("veRef"); };
    $("vaAdd").onclick = function (e) { if (e.target && e.target.id === "vaArq") return; abrir("midia"); };
    /* 23/11 (dono, iPhone: "aperto no ＋ e não abre a janela de importação"): com a biblioteca VAZIA o ＋ é o próprio seletor de arquivos (input por cima do
       botão — no iPhone o seletor só abre com o dedo direto nele); com mídia na biblioteca, o ＋ abre a folha MÍDIA como antes. */
    (function () { var inp = document.createElement("input"); inp.type = "file"; inp.id = "vaArq"; inp.accept = "video/*,image/*,audio/*"; inp.multiple = true; inp.setAttribute("aria-label", "Importar vídeos, fotos ou sons"); $("vaAdd").appendChild(inp);
      inp.onchange = function () { var fs = [].slice.call(inp.files || []); inp.value = ""; var v = V(); if (fs.length && v && v.importar) { abrir("midia"); v.importar(fs); } };
      var ver = function () { var v = V(), vazio = !v || !v.MID || !Object.keys(v.MID).length; inp.hidden = !vazio; }; ver(); setInterval(ver, 600); })();
    $("vaSheetOk").onclick = fechar;
    $("vaMais").onclick = function (e) { if (!window.BWFerr) return; var r = e.currentTarget.getBoundingClientRect();
      BWFerr.menu(r.right - 220, r.bottom + 4, [{icone: "＋", rot: "Projeto novo", fn: function () { clicar("veNovo"); }}, {icone: "🎬", rot: "Modelos prontos", fn: function () { if (window.VEModelos) VEModelos.abrir(); }},
        {icone: "✦", rot: "Criar com as ferramentas", fn: function () { abrir("criar"); }}, {icone: "🖥", rot: "Prévia no 2º monitor", fn: function () { clicar("veSegunda"); }}, {icone: "📱", rot: "Controle pelo celular", fn: function () { clicar("veCelular"); }},
        {icone: "☰", rot: "Mostrar todas as camadas", fn: function () { clicar("veTlMin"); }}], "PROJETO"); };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !SHEET.hidden && !document.querySelector(".bwf-menu,#vmFolha:not([hidden])")) { fechar(); e.stopPropagation(); } }, true);
  }
  function espelhar() { var v = V(); if (!v) return; var vf = $("vmFaixa"); if (vf && vf.parentNode !== APP) APP.appendChild(vf);   /* faixa dos MODELOS ("faltam N takes") por cima da prévia */ var t = $("veTempo"); if (t) $("vaTempo").textContent = t.textContent; var p = $("vaPlay"); p.classList.toggle("on", !!v.tocando()); p.setAttribute("aria-label", v.tocando() ? "Pausar" : "Tocar");
    var f = $("veFmt"); if (f) { var o = f.options[f.selectedIndex]; $("vaFmtTxt").textContent = o ? o.textContent.split(" ")[0] : f.value; } }

  /* ---------- faixa de ferramentas (rola para o lado e muda conforme o que foi tocado) ---------- */
  var SUB = "";   /* submenu da raiz: "", "audio", "texto" */
  function tem(g) { return !!document.querySelector('#vePropCorpo [data-g="' + g + '"]'); }
  function ferramentas() {
    var v = V(), c = v && v.selAtual();
    if (!c) {
      if (SUB === "audio") return [["voltar", "Voltar", function () { SUB = ""; faixa(); }, "volta"], ["sons", "Sons e trilhas", function () { clicar("veSons"); abrir("midia", "SONS E TRILHAS"); }], ["importar", "Importar som", function () { abrir("midia", "IMPORTAR SOM — TOQUE EM ＋ IMPORTAR"); var b = document.querySelector('#veAbas [data-aba="audio"]'); if (b) b.click(); }], ["extrair", "Extrair áudio", function () { aviso("Toque no take de vídeo e depois em EXTRAIR ÁUDIO."); }]];
      if (SUB === "texto") return [["voltar", "Voltar", function () { SUB = ""; faixa(); }, "volta"], ["texto", "Adicionar texto", function () { clicar("veTexto"); setTimeout(function () { abrir("g:texto"); }, 60); }], ["pessoa", "Texto atrás da pessoa", function () { if (window.VEModelos) VEModelos.abrir("mascara"); }], ["modelos", "Modelos", function () { if (window.VEModelos) VEModelos.abrir(); }]];
      return [["mais", "Mídia", function () { abrir("midia"); }], ["audio", "Áudio", function () { SUB = "audio"; faixa(); }], ["texto", "Texto", function () { SUB = "texto"; faixa(); }], ["efe", "Elementos", function () { var v = V(); if (v && v.menuElementos) v.menuElementos(innerWidth / 2 - 90, innerHeight * 0.45); }],
        ["modelos", "Modelos", function () { if (window.VEModelos) VEModelos.abrir(); }], ["trans", "Transições", function () { abrir("trans"); }], ["efe", "Efeitos", function () { abrir("efe"); }],
        ["criar", "Criar", function () { abrir("criar"); }], ["prop", "Formato", function () { abrir("prop"); }], ["camadas", "Camadas", function () { clicar("veTlMin"); }],
        ["tela", "Outra tela", function () { clicar("veSegunda"); }], ["cel", "Controle", function () { clicar("veCelular"); }]];
    }
    var L = [["voltar", "", function () { v.sel(null); }, "volta"]];
    if (c.ph) L.push(["trocar", "Trocar pelo meu take", function () { abrir("midia", "ESCOLHA O TAKE"); }, "destaque"]);
    if (c.phMusica) L.push(["audio", "Trocar a música", function () { abrir("midia", "ESCOLHA A MÚSICA"); var b = document.querySelector('#veAbas [data-aba="audio"]'); if (b) b.click(); }, "destaque"]);
    var g = function (k, ic, rot) { if (tem(k)) L.push([ic, rot, function () { abrir("g:" + k); }]); };
    if (c.tipo === "texto") { g("texto", "editar", "Editar texto"); L.push(["dividir", "Dividir", function () { clicar("veCortar"); }]); g("pos", "pos", "Posição"); g("rastro", "rastro", "Seguir ponto"); g("tempo", "anima", "Tempo"); }
    else {
      g("elem", "efe", "Elemento");
      L.push(["dividir", "Dividir", function () { clicar("veCortar"); }]); g("som", "volume", c.tipo === "audio" ? "Volume e limpeza" : "Volume"); g("vel", "vel", "Velocidade");
      if (c.tipo !== "audio") { g("cor", "cor", "Cor"); g("efeito", "efe", "Efeitos"); g("trans", "trans", "Transição"); g("ia", "pessoa", "Pessoa (IA)"); g("selm", "masc", "Máscara"); g("rastro", "rastro", "Seguir ponto"); g("chroma", "chroma", "Chroma"); g("pos", "pos", "Ajustar"); }
      g("tempo", "anima", "Animação"); L.push(["apIni", "Aparar início", function () { clicar("veApIni"); }], ["apFim", "Aparar fim", function () { clicar("veApFim"); }]);
    }
    L.push(["duplicar", "Duplicar", function () { clicar("veDuplicar"); }], ["mais3", "Mais", function () { opcoes(c); }], ["excluir", "Excluir", function () { clicar("veApagar"); }, "perigo"]);
    return L;
  }
  function opcoes(c) { var e2 = $("veFaixas").querySelector('[data-clip="' + c.id + '"]'); if (!e2) return; var r = e2.getBoundingClientRect(), x = Math.max(10, Math.min(innerWidth - 10, r.left + Math.min(r.width / 2, 60))), y = r.top + r.height / 2;
    e2.dispatchEvent(new MouseEvent("contextmenu", {bubbles: true, cancelable: true, clientX: x, clientY: y})); }
  var ASS = "";
  function faixa() { if (!FAIXA) return; var v = V(), c = v && v.selAtual(); if (c) SUB = ""; var L = ferramentas(), ass = (c ? c.id + c.tipo : "raiz" + SUB) + "|" + L.map(function (x) { return x[1]; }).join(",");
    if (ass === ASS) return; ASS = ass; FAIXA.setAttribute("data-ctx", c ? c.tipo : SUB || "raiz");
    FAIXA.innerHTML = (c ? '<span class="va-etq">' + (c.tipo === "texto" ? "TEXTO" : c.tipo === "audio" ? "SOM" : c.tipo === "imagem" ? "FOTO" : "VÍDEO") + '</span>' : "") +
      L.map(function (x, i) { return '<button type="button" class="va-f' + (x[3] ? " " + x[3] : "") + '" data-i="' + i + '"' + (x[1] ? "" : ' aria-label="Voltar"') + '>' + svg(x[0]) + (x[1] ? "<span>" + x[1] + "</span>" : "") + "</button>"; }).join("");
    FAIXA._L = L; FAIXA.scrollLeft = 0; }
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("#vaFaixa .va-f"); if (!b || !FAIXA._L) return; var it = FAIXA._L[+b.dataset.i]; if (it) it[2](); });

  /* ---------- folhas que sobem de baixo ---------- */
  var NOMES = {texto: "TEXTO", pos: "TAMANHO E POSIÇÃO", som: "SOM", vel: "VELOCIDADE", trans: "TRANSIÇÃO DE ENTRADA", efeito: "CONTROLE DE EFEITOS", cor: "COR", ia: "PESSOA E FUNDO (IA)", selm: "MÁSCARA POR SELEÇÃO", rastro: "SEGUIR UM PONTO", elem: "ELEMENTO ANIMADO", chroma: "CHROMA KEY", tempo: "TEMPO E CAMADA"};
  function guardar() { [].slice.call(CORPO.children).forEach(function (x) { MOLHO.appendChild(x); }); CORPO.innerHTML = ""; SHEET.removeAttribute("data-g"); }
  function filtrarGrupo(g) { document.querySelectorAll("#vePropCorpo .ve-g").forEach(function (x) { x.classList.toggle("va-fora", x.getAttribute("data-g") !== g); }); }
  /* 23/11 (dono, iPhone: "não abre a área de importação de mídia"): a seção MÍDIA tinha sido FECHADA pela seta (ui_dobras, vale no PC também) e, na folha,
     o título com a seta fica escondido — a folha abria vazia, sem a biblioteca nem o ＋ IMPORTAR. Dentro da folha nada fica fechado (sem gravar a escolha). */
  function abrirSetas() { CORPO.querySelectorAll("[data-seta]").forEach(function (t) { if (t.getAttribute("data-seta-forcar") !== "aberta") t.setAttribute("data-seta-forcar", "aberta"); if (t.classList.contains("fechada")) { t.classList.remove("fechada"); t.setAttribute("aria-expanded", "true"); } }); }
  function abrir(o, titulo) {
    guardar(); var tt = "";
    if (o.indexOf("g:") === 0) { var g = o.slice(2); SHEET.dataset.g = g; CORPO.appendChild($("veProp")); filtrarGrupo(g); tt = NOMES[g] || g.toUpperCase(); }
    else if (o === "midia" || o === "trans" || o === "efe") { CORPO.appendChild($("veMidia")); var aba = o === "trans" ? "trans" : o === "efe" ? "efe" : null; if (aba) { var b = document.querySelector('#veAbas [data-aba="' + aba + '"]'); if (b) b.click(); } else if (titulo !== "SONS E TRILHAS") { var b2 = document.querySelector('#veAbas [data-aba="' + (titulo === "ESCOLHA A MÚSICA" ? "audio" : "tudo") + '"]'); if (b2) b2.click(); }
      tt = titulo || (o === "trans" ? "TRANSIÇÕES" : o === "efe" ? "EFEITOS" : "MÍDIA"); }
    else if (o === "criar") { CORPO.appendChild($("veCriar")); $("veCriar").hidden = false; tt = "CRIAR PARA A LINHA DO TEMPO"; }
    else if (o === "prop") { tt = "FORMATO"; CORPO.appendChild(formatos()); }
    abrirSetas();     TIT.textContent = tt; SHEET.hidden = false; SHEET.dataset.o = o; H.classList.add("va-folha"); CORPO.scrollTop = 0;
  }
  function fechar() { SHEET.hidden = true; guardar(); SHEET.removeAttribute("data-o"); H.classList.remove("va-folha"); }
  function formatos() { var f = $("veFmt"), box = el("div", "va-fmts"); if (!f) return box;
    box.innerHTML = [].slice.call(f.options).map(function (o) { var p = o.value.split(":"), w = +p[0] || 1, h = +p[1] || 1, k = 30 / Math.max(w, h); return '<button type="button" class="va-fmt' + (o.value === f.value ? " on" : "") + '" data-v="' + o.value + '"><i style="width:' + Math.max(10, w * k) + "px;height:" + Math.max(10, h * k) + 'px"></i><span>' + o.textContent + '</span></button>'; }).join("");
    box.onclick = function (e) { var b = e.target.closest("[data-v]"); if (!b) return; f.value = b.dataset.v; f.dispatchEvent(new Event("change", {bubbles: true})); box.querySelectorAll(".va-fmt").forEach(function (x) { x.classList.toggle("on", x === b); }); var liv = $("veLivre"); if (liv) { if (!liv.hidden) box.appendChild(liv); else MOLHO.appendChild(liv); } espelhar(); };
    var liv = $("veLivre"); if (liv && !liv.hidden) box.appendChild(liv); return box; }
  function aviso(t) { var v = V(); if (v && v.aviso) v.aviso(t); }

  /* espera o editor ficar pronto */
  /* 22/11 (dono, print do iPhone: abria o layout ANTIGO e a tela ficava travada): antes, se o editor demorasse > 10 s para reabrir as
     mídias guardadas, o app desistia e mostrava o layout do PC. Agora monta assim que o editor existe (no máx. 3 s de espera pelo
     "pronto") e NUNCA cai no layout antigo no celular — o que ainda estiver carregando aparece sozinho depois. */
  var tent = 0; (function esperar() { if (window.__video && (window.__veProntoOk || tent > 8)) { try { montar(); } catch (e) { console.warn("casca do app", e); H.classList.remove("app-cedo"); } }
    else if (tent++ < 400) setTimeout(esperar, 50); else H.classList.remove("app-cedo"); })();
  window.VEApp = {ligado: true, abrir: function (o) { abrir(o); }, fechar: fechar, faixa: function () { ASS = ""; faixa(); }, aberta: function () { return SHEET && !SHEET.hidden ? SHEET.dataset.o : ""; }};
})();
