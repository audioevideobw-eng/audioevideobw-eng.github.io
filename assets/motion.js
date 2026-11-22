/* ESTÚDIO DE MOTION — editor (20/11/2026, Claude).
   Biblioteca de itens → palco (arrastar) → propriedades (conteúdo, posição com KEYFRAMES, efeito de entrada/saída/durante)
   → linha do tempo (barras e keyframes) → exportar (no aparelho pelo BWReelsCelular, ou no app BW do PC com chroma key / transparente).
   Projetos e efeitos próprios ficam NESTE aparelho (IndexedDB bw_motion + ui_motion_efeitos). Única saída para a internet: a IA
   Brightway (bw-ia) para criar um efeito a partir de uma frase — só a frase vai, nada do projeto. */
(function () {
  "use strict";
  var M = window.BWMotion, $ = function (id) { return document.getElementById(id); };
  var FN_IA = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia", PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var NO_APP = !!(window.BW_APP && window.bwNode);
  var P = null, MONT = null, T = 0, SEL = null, KSEL = null, TOCANDO = false, GRAVAR = false, ZOOM = 1, SC = 0.3, HIST = [], FUT = [], SALVAR_T = 0, HIST_T = 0;
  var CORES_GRUPO = { Textos: "#7C5CFF", Interface: "#2E9BFF", Imagens: "#FF8A3D", Enfeites: "#22C58B" };
  var GRAD = ["linear-gradient(135deg,#7C5CFF,#C04CFF)", "linear-gradient(135deg,#2E9BFF,#22D3EE)", "linear-gradient(135deg,#FF8A3D,#FF4D6D)", "linear-gradient(135deg,#22C58B,#B6FF3B)",
    "linear-gradient(135deg,#F43F5E,#FB923C)", "linear-gradient(135deg,#0EA5E9,#6366F1)", "linear-gradient(135deg,#EAB308,#F97316)"];
  var ROT = { texto: "Texto", estilo: "Estilo", fonte: "Fonte", tamanho: "Tamanho", cor: "Cor", destaque: "Cor do *destaque*", larg: "Largura", alt: "Altura", alinhar: "Alinhar",
    titulo: "Título", nome: "Nome", comando: "Comando digitado", src: "Imagem", src2: "Imagem depois", raio: "Cantos", borda: "Borda", legenda: "Legenda", zoom: "Zoom",
    de: "Começa em", ate: "Termina em", prefixo: "Antes do número", sufixo: "Depois do número", casas: "Casas decimais", pontos: "Valores (vírgula)", icone: "Ícone", emoji: "Emoji",
    forma: "Forma", contorno: "Só contorno", espessura: "Espessura", velocidade: "Velocidade" };
  var OPCOES = { estilo: [["neon", "Neon"], ["branco", "Simples"], ["etiqueta", "Etiqueta"], ["contorno", "Contorno"], ["sombra", "Com sombra"]],
    fonte: [["titulo", "Título (condensada)"], ["texto", "Moderna"], ["mono", "Código"], ["mao", "Escrita à mão"], ["serif", "Elegante"]],
    alinhar: [["center", "Centro"], ["left", "Esquerda"], ["right", "Direita"]], forma: [["circulo", "Círculo"], ["ret", "Retângulo"], ["linha", "Linha"], ["seta", "Seta"]] };
  var FAIXAS = { tamanho: [20, 400, 2], larg: [100, 2000, 10], alt: [100, 2000, 10], raio: [0, 200, 2], zoom: [1.2, 5, 0.1], casas: [0, 3, 1], espessura: [2, 60, 1], velocidade: [0, 4, 0.1] };

  function livre() { var l = P.formato === "livre"; $("moLivre").hidden = !l; if (l) { $("moLargura").value = P.w; $("moAltura").value = P.h; } }
  // 20/11: qualidades conforme o tamanho (Rápida ~720p, Alta ~1080p, Tamanho real — telão, 4K); marca o que o aparelho não aguenta
  async function qualidades() {
    var menor = Math.min(P.w, P.h), sel = $("moExpQual"), ops = [], vistos = {};
    [["Rápida", 720], ["Alta", 1080], ["Tamanho real", menor]].forEach(function (q) { var h = Math.min(P.h, Math.round(P.h * q[1] / menor / 2) * 2); if (!vistos[h]) { vistos[h] = 1; ops.push([q[0], h]); } });
    sel.innerHTML = ops.map(function (q) { var w = Math.round(P.w * q[1] / P.h / 2) * 2; return '<option value="' + q[1] + '">' + q[0] + " (" + w + "×" + q[1] + ")</option>"; }).join("");
    sel.value = String(ops[innerWidth <= 1100 ? 0 : Math.min(1, ops.length - 1)][1]);
    if (window.BWReelsCelular && BWReelsCelular.cabe) for (var i = 0; i < sel.options.length; i++) { var o = sel.options[i], h = +o.value, w = Math.round(P.w * h / P.h / 2) * 2;
      if (!(await BWReelsCelular.cabe(w, h))) { o.disabled = true; o.textContent += " — não cabe neste aparelho (use o app BW)"; if (sel.value === o.value) sel.value = sel.options[0].value; } }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n, c) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: c === undefined ? 1 : c, maximumFractionDigits: c === undefined ? 1 : c }); }
  function aviso(txt, erro) { var a = $("moAviso"); a.textContent = txt; a.className = "mo-aviso" + (erro ? " erro" : ""); a.hidden = false; clearTimeout(aviso.t); aviso.t = setTimeout(function () { a.hidden = true; }, 5000); }
  function item(id) { return P.itens.filter(function (i) { return i.id === id; })[0] || null; }

  /* ---------- guardar (IndexedDB, só neste aparelho) ---------- */
  var DB = null;
  function db() { if (DB) return DB; DB = new Promise(function (ok, erro) { var r = indexedDB.open("bw_motion", 1); r.onupgradeneeded = function () { r.result.createObjectStore("projetos", { keyPath: "id" }); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); return DB; }
  async function dbOp(modo, f) { var d = await db(); return new Promise(function (ok, erro) { var tx = d.transaction("projetos", modo), st = tx.objectStore("projetos"), r = f(st); tx.oncomplete = function () { ok(r && r.result); }; tx.onerror = function () { erro(tx.error); }; }); }
  function salvarJa() { if (!P) return; P.atualizado = Date.now(); dbOp("readwrite", function (s) { return s.put({ id: P.id, nome: P.nome, atualizado: P.atualizado, projeto: P }); }).catch(function () {});
    try { localStorage.setItem("ui_motion_ultimo", P.id); } catch (e) {} }
  function mudou(opt) {
    opt = opt || {};
    clearTimeout(SALVAR_T); SALVAR_T = setTimeout(function () { salvarJa(); desenharProjetos(); }, 700);
    clearTimeout(HIST_T); HIST_T = setTimeout(function () { var s = JSON.stringify(P); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 40) HIST.shift(); FUT = []; } botoesHist(); }, 350);
    if (opt.remontar !== false) remontar(); else ver(T);
    if (opt.painel) desenharPainel();
    desenharTimeline();
  }
  function botoesHist() { $("moDesfazer").disabled = HIST.length < 2; $("moRefazer").disabled = !FUT.length; }
  function desfazer() { clearTimeout(HIST_T); var s0 = JSON.stringify(P); if (HIST[HIST.length - 1] !== s0) { HIST.push(s0); FUT = []; }   /* grava antes o passo que ainda estava esperando */
    if (HIST.length < 2) return; FUT.push(HIST.pop()); P = JSON.parse(HIST[HIST.length - 1]); depoisDeTrocar(); }
  function refazer() { if (!FUT.length) return; var s = FUT.pop(); HIST.push(s); P = JSON.parse(s); depoisDeTrocar(); }
  function depoisDeTrocar() { if (SEL && !item(SEL)) SEL = null; KSEL = null; remontar(); desenharTudo(); clearTimeout(SALVAR_T); SALVAR_T = setTimeout(salvarJa, 500); botoesHist(); }

  /* ---------- efeitos próprios (biblioteca do aparelho) ---------- */
  function meusGlobais() { try { return JSON.parse(localStorage.getItem("ui_motion_efeitos") || "[]") || []; } catch (e) { return []; } }
  function guardarGlobal(ef) { var l = meusGlobais().filter(function (e) { return e.id !== ef.id; }); l.unshift(ef); try { localStorage.setItem("ui_motion_efeitos", JSON.stringify(l.slice(0, 60))); } catch (e) {} }
  function todosMeus() { var v = {}, out = []; (P.meusEfeitos || []).concat(meusGlobais()).forEach(function (e) { if (!v[e.id]) { v[e.id] = 1; out.push(e); } }); return out; }
  function garantirNoProjeto(id) { // efeito próprio usado no projeto vai junto dentro dele (o render no PC não conhece a biblioteca do aparelho)
    if (!/^m:/.test(id)) return; var eid = id.slice(2); if ((P.meusEfeitos || []).some(function (e) { return e.id === eid; })) return;
    var g = meusGlobais().filter(function (e) { return e.id === eid; })[0]; if (g) (P.meusEfeitos = P.meusEfeitos || []).push(M.clone(g));
  }

  /* ---------- palco ---------- */
  var FIXA = null;
  function medir() {
    var cel = innerWidth <= 1100, pal = $("moTela").parentNode, larg = pal.clientWidth - 4, alt = cel ? innerHeight * 0.36 : FIXA && FIXA.fixo() ? Math.max(160, pal.clientHeight - 62) : Math.max(300, innerHeight - 420); // no PC a linha do tempo fica à vista
    SC = Math.max(0.05, Math.min(larg / P.w, alt / P.h));
    $("moTela").style.width = Math.round(P.w * SC) + "px"; $("moTela").style.height = Math.round(P.h * SC) + "px";
    $("moCena").style.transform = "scale(" + SC + ")"; $("moCena").style.width = P.w + "px"; $("moCena").style.height = P.h + "px";
    document.documentElement.style.scrollPaddingTop = cel ? Math.round(P.h * SC + 70) + "px" : ""; posOpc();
  }
  function remontar() { MONT = M.montar($("moCena"), P, {}); medir(); if (JAN && !JAN.closed) montarJanela(); ver(T); }
  function ver(t) {
    T = Math.max(0, Math.min(P.dur, t)); if (MONT) MONT.seek(T); if (JM) { if (JAN.closed) JM = null; else try { JM.seek(T); } catch (e) { JM = null; } }
    $("moTempo").textContent = fmt(T) + " / " + fmt(P.dur) + " s";
    var ag = $("moAgulha"); if (ag) ag.style.left = (T * pxs()) + "px";
    moldura(); if (SEL && !TOCANDO) atualizarKbs();
  }
  function moldura() {
    var s = $("moSelecao"), c = SEL && MONT && MONT.caixas.filter(function (x) { return x.it.id === SEL; })[0];
    if (!c || c.b.style.display === "none") { s.hidden = true; return; }
    var r = c.b.getBoundingClientRect(), base = $("moTela").getBoundingClientRect();
    var z = VZ.z; s.hidden = false; s.style.left = ((r.left - base.left) / z - 4) + "px"; s.style.top = ((r.top - base.top) / z - 4) + "px"; s.style.width = (r.width / z + 8) + "px"; s.style.height = (r.height / z + 8) + "px";
  }
  function tocar() {
    if (TOCANDO) { TOCANDO = false; $("moTocar").textContent = "▶ TOCAR"; ver(T); return; }
    TOCANDO = true; $("moTocar").textContent = "❚❚ PAUSAR"; if (T >= P.dur - 0.05) T = 0;
    var t0 = performance.now() - T * 1000;
    (function passo(agora) { if (!TOCANDO) return; var t = (agora - t0) / 1000; if (t >= P.dur) { t0 = agora; t = 0; } ver(t); requestAnimationFrame(passo); })(performance.now());
  }

  // arrastar na tela: posição fixa, ou keyframe quando GRAVAR está ligado (ou o item já tem keyframes)
  function valorEm(it, prop, t) { var base = { x: it.x, y: it.y, escala: it.escala, giro: it.giro, opac: it.opac === undefined ? 1 : it.opac }[prop]; return M.valorKeys((it.keys || {})[prop], t, +base); }
  function porKey(it, prop, t, v) {
    it.keys = it.keys || {}; var l = it.keys[prop] = it.keys[prop] || [];
    if (!l.length && t > it.ini + 0.05) l.push({ t: +it.ini.toFixed(3), v: valorEm(it, prop, it.ini), e: "suave" });
    var k = l.filter(function (q) { return Math.abs(q.t - t) < 0.04; })[0];
    if (k) k.v = v; else l.push({ t: +t.toFixed(3), v: v, e: "suave" });
    l.sort(function (a, b) { return a.t - b.t; });
  }
  function definir(it, prop, v) {
    var tem = it.keys && it.keys[prop] && it.keys[prop].length;
    if (GRAVAR || tem) porKey(it, prop, T, v);
    else { if (prop === "x") it.x = v; else if (prop === "y") it.y = v; else if (prop === "escala") it.escala = v; else if (prop === "giro") it.giro = v; else it.opac = v; }
  }
  /* VISTA (22/11, como no editor de vídeo): rodinha na prévia aproxima/afasta SÓ a vista; mão (H) ou botão do meio arrasta; clique sem arrastar = opções */
  var VZ = { z: 1, x: 0, y: 0 };
  function sc() { return SC * VZ.z; }
  function aplicarVista() { var t = $("moTela"); t.style.transform = VZ.z === 1 ? "" : "translate(" + VZ.x.toFixed(1) + "px," + VZ.y.toFixed(1) + "px) scale(" + VZ.z + ")"; var b = $("moVZ"); if (b) { b.hidden = VZ.z === 1; b.textContent = "🔍 " + Math.round(VZ.z * 100) + "% ✕"; } moldura(); }
  function zoomVista(z) { VZ.z = z ? Math.max(1, Math.min(8, z)) : 1; if (VZ.z === 1) { VZ.x = 0; VZ.y = 0; } aplicarVista(); }
  function menuPrevia(x, y) { if (!window.BWFerr) return;
    var it = [{ tit: "VISTA (não muda o vídeo)" }, { icone: "＋", rot: "Aproximar", tecla: "Rodinha ↑", fn: function () { zoomVista(VZ.z * 1.5); } }, { icone: "－", rot: "Afastar", tecla: "Rodinha ↓", fn: function () { zoomVista(VZ.z / 1.5); } },
      { icone: "⤢", rot: "Ajustar à tela (100%)", tecla: "F", off: VZ.z === 1, fn: function () { zoomVista(0); } }, { icone: "🔍", rot: "Zoom", sub: [2, 4, 8].map(function (z) { return { rot: z * 100 + "%" + (VZ.z === z ? "  ✓" : ""), fn: function () { zoomVista(z); } }; }) }, "-",
      { icone: TOCANDO ? "⏸" : "▶", rot: TOCANDO ? "Pausar" : "Tocar", tecla: "Espaço", fn: tocar }, "-", { tit: "TELA" },
      { icone: "🖥", rot: "Prévia no segundo monitor / janela solta", fn: abrirJanela }, { icone: "⛶", rot: "Tela cheia (monitor inteiro)", fn: function () { var el = $("moTela").parentNode; if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); } },
      { icone: "📱", rot: "Controle pelo celular", fn: controleCelular }];
    BWFerr.menu(x, y, it, "PRÉVIA"); }
  /* 22/11 (dono): clicar na prévia não abre mais o menu — ⋯ discretos no canto de cima da prévia (o botão direito no item continua) */
  function posOpc() { var b = $("moOpcP"), t = $("moTela"); if (!b || !t) return; b.style.left = Math.max(4, t.offsetLeft + t.offsetWidth - 42) + "px"; b.style.top = (t.offsetTop + 8) + "px"; }
  function ligarPalco() {
    var tela = $("moTela"), arr = null;
    var ob = document.createElement("button"); ob.type = "button"; ob.id = "moOpcP"; ob.className = "mo-opcp"; ob.textContent = "⋯"; ob.title = "Opções da prévia"; ob.setAttribute("aria-label", "Opções da prévia");
    ob.onclick = function () { var r = ob.getBoundingClientRect(); menuPrevia(Math.max(8, r.right - 250), r.bottom + 6); }; tela.parentNode.appendChild(ob);
    if (window.ResizeObserver) new ResizeObserver(posOpc).observe(tela); setTimeout(posOpc, 0);
    tela.parentNode.addEventListener("wheel", function (e) { if (e.ctrlKey && !e.altKey) return; e.preventDefault(); var r = tela.getBoundingClientRect(), z0 = VZ.z, z1 = Math.max(1, Math.min(8, z0 * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
      if (z1 === z0) return; var cx = e.clientX - (r.left - VZ.x) - tela.offsetWidth / 2, cy = e.clientY - (r.top - VZ.y) - tela.offsetHeight / 2;
      VZ.x = z1 === 1 ? 0 : cx - (cx - VZ.x) * z1 / z0; VZ.y = z1 === 1 ? 0 : cy - (cy - VZ.y) * z1 / z0; VZ.z = z1; aplicarVista(); }, { passive: false });
    tela.addEventListener("pointerdown", function (e) {
      if (e.button === 2) return; var F = window.BWFerr ? BWFerr.atual() : "v";
      if (F === "t") { var r0 = tela.getBoundingClientRect(), nt = M.novoItem("texto", P, T >= P.dur - 0.5 ? 0 : T); nt.x = Math.round((e.clientX - r0.left) / sc()); nt.y = Math.round((e.clientY - r0.top) / sc()); P.itens.push(nt); SEL = nt.id; KSEL = null; mudou({ painel: true }); BWFerr.trocar("v"); aviso("T Texto criado onde você tocou — escreva em ITEM."); if (innerWidth <= 1100) abaCel("item"); e.preventDefault(); return; }
      if (F === "z") { ZOOM = e.altKey ? Math.max(1, ZOOM / 1.5) : Math.min(8, ZOOM * 1.5); desenharTimeline(); return; }
      if ((F === "h" || e.button === 1) && VZ.z > 1) { arr = { pan: true, px: e.clientX, py: e.clientY, vx: VZ.x, vy: VZ.y }; try { tela.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
      if (F === "h" || F === "c") return;
      var alvo = e.target.closest("[data-item]"), id = alvo && alvo.getAttribute("data-item");
      if (!id) { selecionar(null); return; }
      if (TOCANDO) tocar();
      selecionar(id, true); var it = item(id); if (!it) return;
      arr = { id: id, px: e.clientX, py: e.clientY, x0: valorEm(it, "x", T), y0: valorEm(it, "y", T), mexeu: false };
      try { tela.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    tela.addEventListener("pointermove", function (e) {
      if (!arr) return; if (arr.pan) { VZ.x = arr.vx + e.clientX - arr.px; VZ.y = arr.vy + e.clientY - arr.py; aplicarVista(); return; }
      var it = item(arr.id); if (!it) return;
      var dx = (e.clientX - arr.px) / sc(), dy = (e.clientY - arr.py) / sc(); if (!arr.mexeu && Math.abs(dx) + Math.abs(dy) < 4 / sc()) return;
      arr.mexeu = true; definir(it, "x", Math.round(arr.x0 + dx)); definir(it, "y", Math.round(arr.y0 + dy)); ver(T);
    });
    function soltar(e) { var a = arr; arr = null; if (!a) return; if (a.mexeu && !a.pan) mudou({ remontar: false, painel: true }); }
    tela.addEventListener("pointerup", soltar); tela.addEventListener("pointercancel", soltar);
  }

  /* ---------- biblioteca, fundo, modelos ---------- */
  function desenharLib() {
    var g = {}; Object.keys(M.ITENS).forEach(function (k) { var d = M.ITENS[k]; (g[d.grupo] = g[d.grupo] || []).push(k); });
    var h = "", n = 0;
    Object.keys(g).forEach(function (gr) {
      h += '<div class="mo-g" style="margin:0 0 8px"><div style="font:800 10px Inter,sans-serif;letter-spacing:.12em;color:' + CORES_GRUPO[gr] + ';margin:6px 0">' + esc(gr.toUpperCase()) + '</div><div class="mo-lib">';
      g[gr].forEach(function (k) { var d = M.ITENS[k]; h += '<button type="button" data-add="' + k + '" style="background:' + GRAD[n++ % GRAD.length] + '" title="' + esc(d.nome) + '"><b>' + esc(d.icone) + '</b>' + esc(d.nome.toUpperCase()) + "</button>"; });
      h += "</div></div>";
    });
    $("moLib").innerHTML = h;
  }
  function adicionar(tipo) {
    var it = M.novoItem(tipo, P, T >= P.dur - 0.5 ? 0 : T);
    if (M.ITENS[tipo].fundo) P.itens.unshift(it); else P.itens.push(it);
    if (/foto|antesdepois|lupa/.test(tipo)) it.escala = P.h > P.w ? 1 : 0.8;
    SEL = it.id; KSEL = null; mudou({ painel: true });
    aviso("＋ " + M.ITENS[tipo].nome + " entrou em " + fmt(it.ini) + " s com o efeito “" + nomeEfeito(it.entrada.efeito) + "”.");
    if (/foto|antesdepois|lupa/.test(tipo)) escolherImagem(it.id, "src");
    if (innerWidth <= 1100) abaCel("item");
  }
  function desenharFundo() {
    var f = P.fundo, h = '<label class="um">Tipo<select data-fundo="tipo">' + Object.keys(M.FUNDOS).map(function (k) { return '<option value="' + k + '"' + (f.tipo === k ? " selected" : "") + ">" + esc(M.FUNDOS[k]) + "</option>"; }).join("") + "</select></label>";
    if (/escuro|cor|degrade|grade/.test(f.tipo)) h += '<label class="um">Cor 1<input type="color" data-fundo="cor1" value="' + esc(f.cor1 || "#0B1A0B") + '"></label>';
    if (/escuro|degrade/.test(f.tipo)) h += '<label class="um">Cor 2<input type="color" data-fundo="cor2" value="' + esc(f.cor2 || "#060806") + '"></label>';
    $("moFundo").innerHTML = h;
  }
  var MODELOS = {
    vitrine: { nome: "🟩 VITRINE DE PROMPTS (neon + chat)", f: function (P) {
      P.fundo = { tipo: "escuro", cor1: "#17300f", cor2: "#060806" }; P.dur = 7;
      var piso = M.novoItem("piso", P, 0); piso.y = P.h * 0.82;
      var chip = M.novoItem("chip", P, 0.1); chip.y = P.h * 0.13;
      var tit = M.novoItem("texto", P, 0.25); tit.y = P.h * 0.21; tit.props.texto = "DETALHES\n*NÍTIDOS*"; tit.props.tamanho = 140;
      var chat = M.novoItem("chat", P, 0.7); chat.y = P.h * 0.52; chat.props.comando = "/upscale"; chat.loop = { efeito: "flutuar", forca: 0.4 };
      var dm = M.novoItem("notificacao", P, 4.6); dm.y = P.h * 0.82; dm.escala = 0.95;
      return [piso, chip, tit, chat, dm]; } },
    cartao: { nome: "📈 CARTÃO COM GRÁFICO (papel)", f: function (P) {
      P.fundo = { tipo: "papel" }; P.dur = 6;
      var g = M.novoItem("grafico", P, 0.1); g.y = P.h * 0.3;
      var s = M.novoItem("selo", P, 1.8); s.x = P.w * 0.72; s.y = P.h * 0.17;
      var t = M.novoItem("texto", P, 0.4); t.y = P.h * 0.55; t.props.estilo = "etiqueta"; t.props.fonte = "mono"; t.props.tamanho = 64; t.props.texto = "A PARTE QUE *DERRUBA* O INTERESSE"; t.props.destaque = "#FFB547"; t.props.larg = 900;
      return [g, s, t]; } },
    impacto: { nome: "🔥 TÍTULO DE IMPACTO + NÚMERO", f: function (P) {
      P.fundo = { tipo: "degrade", cor1: "#1b0f3a", cor2: "#06080d" }; P.dur = 5;
      var e = M.novoItem("emoji", P, 0.1); e.y = P.h * 0.25;
      var t = M.novoItem("texto", P, 0.5); t.y = P.h * 0.42; t.props.texto = "MAIS DE"; t.props.estilo = "branco"; t.entrada = { efeito: "pulo", dur: 0.5 };
      var c = M.novoItem("contador", P, 0.9); c.y = P.h * 0.55; c.props.sufixo = " eventos"; c.props.tamanho = 150; c.props.cor = "#FFB547";
      return [e, t, c]; } },
    branco: { nome: "◻ EM BRANCO", f: function (P) { P.fundo = { tipo: "escuro", cor1: "#0B1A0B", cor2: "#060806" }; return []; } }
  };
  function desenharModelos() { $("moModelos").innerHTML = Object.keys(MODELOS).map(function (k) { return '<button type="button" data-modelo="' + k + '">' + esc(MODELOS[k].nome) + "</button>"; }).join(""); }
  function usarModelo(k) {
    if (P.itens.length && !confirm("Começar um projeto NOVO com este modelo? O atual continua salvo em MEUS PROJETOS.")) return;
    var fmtAt = P.formato; P = M.novoProjeto(fmtAt); P.id = M.uid(); P.nome = MODELOS[k].nome.replace(/^[^A-ZÀ-Ú]+/, "").slice(0, 30);
    P.itens = MODELOS[k].f(P); T = 0; SEL = null; HIST = []; FUT = []; depoisDeTrocar(); mudou();
    aviso("Modelo pronto: troque os textos tocando nos itens, mude os efeitos ou toque em ▶ TOCAR.");
  }

  /* ---------- projetos ---------- */
  async function desenharProjetos() {
    var l = []; try { l = await dbOp("readonly", function (s) { return s.getAll(); }); } catch (e) {}
    l = (l || []).sort(function (a, b) { return b.atualizado - a.atualizado; });
    $("moProjetos").innerHTML = '<div class="mo-linha" style="margin:0 0 6px"><button class="mo-bt mini" type="button" data-proj-novo="1">＋ NOVO PROJETO</button></div>' + (l.length ? l.map(function (p) {
      return '<div class="mo-cab" style="margin:4px 0"><strong title="' + esc(p.nome) + '">' + (p.id === P.id ? "▶ " : "") + esc(p.nome || "Sem nome") + '</strong><button class="mo-bt mini" type="button" data-proj-abrir="' + esc(p.id) + '">ABRIR</button><button class="mo-bt mini perigo" type="button" data-proj-apagar="' + esc(p.id) + '" aria-label="Apagar projeto">✕</button></div>';
    }).join("") : '<div class="mo-vazio">Nenhum projeto salvo ainda.</div>');
  }
  async function abrirProjeto(id) {
    var r = null; try { r = await dbOp("readonly", function (s) { return s.get(id); }); } catch (e) {}
    if (!r || !r.projeto) return aviso("Não achei esse projeto.", true);
    salvarJa(); P = r.projeto; T = 0; SEL = null; HIST = [JSON.stringify(P)]; FUT = []; depoisDeTrocar();
  }
  function novoProjeto() { salvarJa(); P = M.novoProjeto(P ? P.formato : "9:16"); P.id = M.uid(); T = 0; SEL = null; HIST = [JSON.stringify(P)]; FUT = []; depoisDeTrocar(); salvarJa(); desenharProjetos(); }

  /* ---------- painel do item ---------- */
  function nomeEfeito(id) { if (/^m:/.test(id)) { var e = todosMeus().filter(function (x) { return "m:" + x.id === id; })[0]; return e ? "★ " + e.nome : "efeito próprio"; } return (M.EFEITOS[id] || M.LOOPS[id] || { nome: id }).nome; }
  function campo(it, k) {
    var v = it.props[k], rot = ROT[k] || k, id = 'data-prop="' + k + '"';
    if (k === "src" || k === "src2") return '<label class="um">' + rot + '<span class="mo-linha" style="margin:0"><button class="mo-bt mini" type="button" data-img="' + k + '">' + (M.imgOk(v) ? "TROCAR IMAGEM" : "ESCOLHER IMAGEM") + "</button>" + (M.imgOk(v) ? '<button class="mo-bt mini perigo" type="button" data-img-tirar="' + k + '">TIRAR</button>' : "") + "</span></label>";
    if (OPCOES[k]) return '<label class="um">' + rot + "<select " + id + ">" + OPCOES[k].map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>";
    if (typeof v === "boolean") return '<label class="um">' + rot + '<input type="checkbox" ' + id + (v ? " checked" : "") + "></label>";
    if (/^(cor|destaque|borda)$/.test(k)) return '<label class="um">' + rot + '<input type="color" ' + id + ' value="' + esc(/^#[0-9a-f]{6}$/i.test(v) ? v : "#ffffff") + '"></label>';
    if (FAIXAS[k]) { var f = FAIXAS[k]; return "<label>" + rot + '<input type="range" ' + id + ' min="' + f[0] + '" max="' + f[1] + '" step="' + f[2] + '" value="' + esc(v) + '"><output>' + esc(v) + "</output></label>"; }
    if (typeof v === "number") return '<label class="um">' + rot + '<input type="number" ' + id + ' value="' + esc(v) + '"></label>';
    if (k === "texto") return '<label class="um">' + rot + "<textarea " + id + ' maxlength="300">' + esc(v) + "</textarea></label>" + (it.tipo === "texto" ? '<p class="mo-dica">*palavra* fica na cor de destaque. Enter quebra a linha.</p>' : "");
    return '<label class="um">' + rot + '<input type="text" ' + id + ' maxlength="120" value="' + esc(v) + '"></label>';
  }
  function chips(lista, atual, attr, extra) {
    return '<div class="mo-chips">' + lista.map(function (o) { return '<button type="button" ' + attr + '="' + esc(o[0]) + '"' + (o[2] ? ' class="meu' + (atual === o[0] ? " on" : "") + '"' : (atual === o[0] ? ' class="on"' : "")) + ">" + esc(o[1]) + "</button>"; }).join("") + (extra || "") + "</div>";
  }
  function listaEfeitos(it) {
    var txt = it.tipo === "texto", l = Object.keys(M.EFEITOS).filter(function (k) { return txt || !M.EFEITOS[k].soTexto; }).map(function (k) { return [k, M.EFEITOS[k].nome]; });
    return l.concat(todosMeus().map(function (e) { return ["m:" + e.id, "★ " + e.nome, true]; }));
  }
  var PROPS_POS = [["x", "Horizontal", -1000, 3000, 1], ["y", "Vertical", -1000, 3000, 1], ["escala", "Tamanho", 0.05, 4, 0.01], ["giro", "Giro", -720, 720, 1], ["opac", "Opacidade", 0, 1, 0.01]];
  function desenharPainel() {
    var it = SEL && item(SEL), p = $("moPainel");
    $("moSemItem").hidden = !!it; if (!it) { p.innerHTML = ""; return; }
    var d = M.ITENS[it.tipo], h = '<div class="mo-cab"><strong>' + esc(d.icone + " " + d.nome) + '</strong><button class="mo-bt mini" type="button" data-acao="frente" title="Trazer para a frente">▲</button><button class="mo-bt mini" type="button" data-acao="tras" title="Mandar para trás">▼</button><button class="mo-bt mini" type="button" data-acao="dup" title="Duplicar">⧉</button><button class="mo-bt mini perigo" type="button" data-acao="apagar" aria-label="Apagar item">✕</button></div>';
    if (KSEL && KSEL.id === it.id) {
      var curva = keysEm(it, KSEL.t)[0]; curva = curva ? curva.k.e : "suave";
      h += '<div class="mo-g" style="border:1px solid rgba(255,77,109,.45);border-radius:12px;padding:8px"><h4 style="border:0;margin:0 0 4px">◆ KEYFRAME EM ' + fmt(KSEL.t, 2) + ' s</h4><label class="um">Curva até aqui<select data-kcurva="1">' +
        Object.keys(M.NOMES_EASE).map(function (e) { return '<option value="' + e + '"' + (e === curva ? " selected" : "") + ">" + esc(M.NOMES_EASE[e]) + "</option>"; }).join("") + '</select></label><div class="mo-linha"><button class="mo-bt mini perigo" type="button" data-acao="kapagar">✕ APAGAR ESTE KEYFRAME</button><button class="mo-bt mini" type="button" data-acao="kfechar">OK</button></div></div>';
    }
    h += '<div class="mo-g"><h4 data-seta="mo_conteudo">CONTEÚDO</h4><div>' + Object.keys(it.props).map(function (k) { return campo(it, k); }).join("") + "</div></div>";
    h += '<div class="mo-g"><h4 data-seta="mo_pos">POSIÇÃO E KEYFRAMES</h4><div>' + PROPS_POS.map(function (q) {
      var v = valorEm(it, q[0], T); return '<label class="k">' + q[1] + '<input type="range" data-pos="' + q[0] + '" min="' + q[2] + '" max="' + q[3] + '" step="' + q[4] + '" value="' + v + '"><output>' + (q[4] < 1 ? fmt(v, 2) : Math.round(v)) + '</output><button class="mo-kb" type="button" data-kb="' + q[0] + '" title="Keyframe aqui">◆</button></label>';
    }).join("") + '<p class="mo-dica">◆ marca o valor NESTE tempo. Ande com a agulha, mude o valor e marque de novo: o item se move entre os keyframes. Com ◆ GRAVAR MOVIMENTO ligado, arrastar na tela já marca.</p><div class="mo-linha"><button class="mo-bt mini" type="button" data-acao="klimpar">LIMPAR KEYFRAMES</button><button class="mo-bt mini" type="button" data-acao="centro">CENTRALIZAR</button></div></div></div>';
    h += '<div class="mo-g"><h4 data-seta="mo_entrada">ENTRADA</h4><div>' + chips(listaEfeitos(it), it.entrada.efeito, "data-ent") +
      '<label>Duração<input type="range" data-ent-dur="1" min="0.1" max="3" step="0.05" value="' + it.entrada.dur + '"><output>' + fmt(it.entrada.dur, 2) + ' s</output></label><div class="mo-linha"><button class="mo-bt mini" type="button" data-acao="verent">▶ VER A ENTRADA</button><button class="mo-bt mini ia" type="button" data-acao="criaref">✨ CRIAR MEU EFEITO</button></div></div></div>';
    h += '<div class="mo-g"><h4 data-seta="mo_saida" data-seta-padrao="fechada">SAÍDA</h4><div>' + chips(listaEfeitos(it).filter(function (o) { return o[0] !== "palavras" && o[0] !== "maquina"; }), it.saida.efeito, "data-sai") +
      '<label>Duração<input type="range" data-sai-dur="1" min="0.1" max="2" step="0.05" value="' + it.saida.dur + '"><output>' + fmt(it.saida.dur, 2) + ' s</output></label><label class="um">Sair no fim do vídeo<input type="checkbox" data-sai-fim="1"' + (it.saida.noFim ? " checked" : "") + '></label></div></div>';
    h += '<div class="mo-g"><h4 data-seta="mo_loop" data-seta-padrao="fechada">DURANTE (MOVIMENTO CONTÍNUO)</h4><div>' + chips(Object.keys(M.LOOPS).map(function (k) { return [k, M.LOOPS[k].nome]; }), it.loop.efeito, "data-loop") +
      '<label>Força<input type="range" data-loop-forca="1" min="0.1" max="3" step="0.05" value="' + (it.loop.forca === undefined ? 1 : it.loop.forca) + '"><output>' + fmt(it.loop.forca === undefined ? 1 : it.loop.forca, 2) + "</output></label></div></div>";
    h += painelCor(it);
    h += '<div class="mo-g"><h4 data-seta="mo_tempo" data-seta-padrao="fechada">TEMPO</h4><div><label class="um">Aparece em (s)<input type="number" data-tempo="ini" min="0" step="0.1" value="' + it.ini + '"></label><label class="um">Some em (s)<input type="number" data-tempo="fim" min="0.1" step="0.1" value="' + it.fim + '"></label></div></div>';
    p.innerHTML = h; atualizarKbs();
  }
  function keysEm(it, t) { var out = []; Object.keys(it.keys || {}).forEach(function (pr) { (it.keys[pr] || []).forEach(function (k) { if (Math.abs(k.t - t) < 0.02) out.push({ pr: pr, k: k }); }); }); return out; }
  function atualizarKbs() {
    var it = SEL && item(SEL); if (!it) return;
    document.querySelectorAll("[data-kb]").forEach(function (b) { var pr = b.getAttribute("data-kb"), tem = ((it.keys || {})[pr] || []).some(function (k) { return Math.abs(k.t - T) < 0.04; }); b.classList.toggle("tem", tem); });
    document.querySelectorAll("[data-pos]").forEach(function (r) { if (document.activeElement === r) return; var pr = r.getAttribute("data-pos"), v = valorEm(it, pr, T); r.value = v; var o = r.nextElementSibling; if (o) o.textContent = +r.step < 1 ? fmt(v, 2) : Math.round(v); });
  }
  function selecionar(id, deTela) {
    if (SEL !== id) KSEL = null; SEL = id; moldura(); desenharPainel(); desenharTimeline();
    if (id && deTela && innerWidth <= 1100) abaCel("item");
  }
  function ligarPainel() {
    var p = $("moDir");
    p.addEventListener("input", function (e) {
      var it = SEL && item(SEL), el = e.target; if (!it) return;
      if (el.matches("[data-prop]")) { var k = el.getAttribute("data-prop"), v = el.type === "checkbox" ? el.checked : el.type === "range" || el.type === "number" || typeof it.props[k] === "number" ? Number(el.value) : el.value;
        it.props[k] = v; if (el.type === "range" && el.nextElementSibling) el.nextElementSibling.textContent = v; mudou(); return; }
      if (el.matches("[data-pos]")) { var pr = el.getAttribute("data-pos"); definir(it, pr, Number(el.value)); if (el.nextElementSibling) el.nextElementSibling.textContent = +el.step < 1 ? fmt(el.value, 2) : Math.round(el.value); mudou({ remontar: false }); return; }
      if (el.matches("[data-ent-dur]")) { it.entrada.dur = Number(el.value); el.nextElementSibling.textContent = fmt(el.value, 2) + " s"; mudou({ remontar: false }); return; }
      if (el.matches("[data-sai-dur]")) { it.saida.dur = Number(el.value); el.nextElementSibling.textContent = fmt(el.value, 2) + " s"; mudou({ remontar: false }); return; }
      if (el.matches("[data-cor]")) { var ck = el.getAttribute("data-cor"); it.cor = it.cor || {}; it.cor[ck] = Number(el.value); if (!it.cor[ck]) delete it.cor[ck]; if (el.nextElementSibling) el.nextElementSibling.textContent = el.value; mudou({ remontar: false }); return; }
      if (el.matches("[data-loop-forca]")) { it.loop.forca = Number(el.value); el.nextElementSibling.textContent = fmt(el.value, 2); mudou({ remontar: false }); return; }
    });
    p.addEventListener("change", function (e) {
      var it = SEL && item(SEL), el = e.target; if (!it) return;
      if (el.matches("[data-sai-fim]")) { it.saida.noFim = el.checked; mudou({ remontar: false }); }
      if (el.matches("[data-tempo]")) { var a = el.getAttribute("data-tempo"), v = Math.max(0, Math.min(P.dur, Number(el.value) || 0));
        if (a === "ini") moverItem(it, v - it.ini, false); else it.fim = Math.max(it.ini + 0.2, v); mudou({ remontar: false, painel: true }); }
      if (el.matches("[data-kcurva]") && KSEL) { keysEm(it, KSEL.t).forEach(function (q) { q.k.e = el.value; }); mudou({ remontar: false }); }
    });
    p.addEventListener("click", function (e) {
      var it = SEL && item(SEL), b = e.target.closest("button"); if (!it || !b) return;
      if (b.hasAttribute("data-ent")) { it.entrada.efeito = b.getAttribute("data-ent"); garantirNoProjeto(it.entrada.efeito); mudou({ remontar: true, painel: true }); verEntrada(it); return; }
      if (b.hasAttribute("data-sai")) { it.saida.efeito = b.getAttribute("data-sai"); garantirNoProjeto(it.saida.efeito); mudou({ painel: true }); return; }
      if (b.hasAttribute("data-look")) { it.cor = M.clone(LOOKS[b.getAttribute("data-look")][1]); mudou({ remontar: false, painel: true }); aviso("🎨 Cor: " + LOOKS[b.getAttribute("data-look")][0] + ". Ajuste fino nas barras."); return; }
      if (b.hasAttribute("data-loop")) { it.loop.efeito = b.getAttribute("data-loop"); mudou({ remontar: false, painel: true }); return; }
      if (b.hasAttribute("data-kb")) { var pr = b.getAttribute("data-kb"); porKey(it, pr, T, valorEm(it, pr, T)); KSEL = { id: it.id, t: +T.toFixed(3) }; mudou({ remontar: false, painel: true }); return; }
      if (b.hasAttribute("data-img")) { escolherImagem(it.id, b.getAttribute("data-img")); return; }
      if (b.hasAttribute("data-img-tirar")) { it.props[b.getAttribute("data-img-tirar")] = ""; mudou({ painel: true }); return; }
      var a = b.getAttribute("data-acao"), i = P.itens.indexOf(it);
      if (a === "frente" && i < P.itens.length - 1) { P.itens.splice(i, 1); P.itens.splice(i + 1, 0, it); mudou(); }
      else if (a === "tras" && i > 0) { P.itens.splice(i, 1); P.itens.splice(i - 1, 0, it); mudou(); }
      else if (a === "dup") { var c = M.clone(it); c.id = M.uid(); c.x += 40; c.y += 40; P.itens.splice(i + 1, 0, c); SEL = c.id; mudou({ painel: true }); }
      else if (a === "apagar") { if (!confirm("Apagar este item?")) return; P.itens.splice(i, 1); SEL = null; KSEL = null; mudou({ painel: true }); }
      else if (a === "klimpar") { if (!confirm("Tirar todos os keyframes deste item? Ele fica parado na posição atual.")) return; ["x", "y", "escala", "giro", "opac"].forEach(function (q) { var v = valorEm(it, q, T); if (q === "x") it.x = v; else if (q === "y") it.y = v; else if (q === "escala") it.escala = v; else if (q === "giro") it.giro = v; else it.opac = v; }); it.keys = {}; KSEL = null; mudou({ remontar: false, painel: true }); }
      else if (a === "centro") { definir(it, "x", P.w / 2); definir(it, "y", P.h / 2); mudou({ remontar: false, painel: true }); }
      else if (a === "kapagar" && KSEL) { Object.keys(it.keys || {}).forEach(function (pr) { it.keys[pr] = it.keys[pr].filter(function (k) { return Math.abs(k.t - KSEL.t) >= 0.02; }); if (!it.keys[pr].length) delete it.keys[pr]; }); KSEL = null; mudou({ remontar: false, painel: true }); }
      else if (a === "kfechar") { KSEL = null; desenharPainel(); desenharTimeline(); }
      else if (a === "corzerar") { delete it.cor; mudou({ remontar: false, painel: true }); }
      else if (a === "cortodos") { var cc = it.cor ? M.clone(it.cor) : null; P.itens.forEach(function (o) { if (o.tipo === "piso") return; if (cc) o.cor = M.clone(cc); else delete o.cor; }); mudou({ remontar: false, painel: true }); aviso("⇉ A mesma cor em todos os itens."); }
      else if (a === "verent") verEntrada(it);
      else if (a === "criaref") abrirEfeito();
    });
  }
  function verEntrada(it) { if (TOCANDO) tocar(); var t0 = performance.now(), ini = it.ini, fim = Math.min(P.dur, it.ini + Math.max(1.2, it.entrada.dur + 0.6));
    (function passo(a) { var t = ini + (a - t0) / 1000; ver(Math.min(t, fim)); if (t < fim) requestAnimationFrame(passo); })(t0); }
  function moverItem(it, d, prender) {
    if (prender !== false) d = Math.max(-it.ini, Math.min(P.dur - it.fim, d));
    it.ini = +(it.ini + d).toFixed(3); it.fim = +(it.fim + d).toFixed(3);
    Object.keys(it.keys || {}).forEach(function (pr) { it.keys[pr].forEach(function (k) { k.t = +(k.t + d).toFixed(3); }); });
  }

  /* ---------- imagens (ficam dentro do projeto, só no aparelho) ---------- */
  var ALVO_IMG = null;
  function escolherImagem(id, campo) { ALVO_IMG = { id: id, campo: campo }; $("moArqImg").value = ""; $("moArqImg").click(); }
  function reduzir(arq) {
    return new Promise(function (ok, erro) {
      var leitor = new FileReader();
      leitor.onload = function () { var im = new Image(); im.onload = function () {
        var max = 1400, k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); var png = /png|webp|gif/.test(arq.type);
        ok(c.toDataURL(png ? "image/png" : "image/jpeg", 0.88)); }; im.onerror = function () { erro(new Error("não abriu a imagem")); }; im.src = leitor.result; };
      leitor.onerror = function () { erro(leitor.error); }; leitor.readAsDataURL(arq);
    });
  }

  /* ---------- linha do tempo ---------- */
  function pxs() { var larg = Math.max(200, $("moPistas").clientWidth - 10); return (larg / P.dur) * ZOOM; }
  function desenharTimeline() {
    var px = pxs(), W = Math.ceil(P.dur * px) + 10, passo = P.dur * ZOOM > 30 ? 5 : P.dur * ZOOM > 12 ? 2 : 1, reg = "";
    for (var s = 0; s <= P.dur + 0.001; s += passo) reg += '<i style="left:' + (s * px) + 'px">' + s + "s</i>";
    var ordem = P.itens.slice().reverse(), rot = "<div>CAMADAS</div>", pis = '<div class="mo-regua" id="moRegua" style="width:' + W + 'px">' + reg + "</div>";
    ordem.forEach(function (it) {
      var d = M.ITENS[it.tipo] || { icone: "?", grupo: "Enfeites", nome: it.tipo }, cor = CORES_GRUPO[d.grupo] || "#888";
      var nome = it.tipo === "texto" || it.tipo === "chip" || it.tipo === "selo" ? String(it.props.texto || "").replace(/[*\n]/g, " ").slice(0, 22) : d.nome;
      rot += '<div data-sel="' + it.id + '"' + (it.id === SEL ? ' class="on"' : "") + ' title="' + esc(nome) + '"><i>' + esc(d.icone) + "</i>" + esc(nome) + "</div>";
      var l = it.ini * px, w = Math.max(10, (it.fim - it.ini) * px), en = Math.min(w, (it.entrada.dur || 0) * px), sa = (it.fim < P.dur - 0.01 || it.saida.noFim) ? Math.min(w, (it.saida.dur || 0) * px) : 0;
      var kts = {}; Object.keys(it.keys || {}).forEach(function (pr) { (it.keys[pr] || []).forEach(function (k) { kts[k.t.toFixed(2)] = k.t; }); });
      pis += '<div class="mo-pista" style="width:' + W + 'px"><div class="mo-barra' + (it.id === SEL ? " on" : "") + '" data-barra="' + it.id + '" style="--c:' + cor + ";left:" + l + "px;width:" + w + 'px"><span class="en" style="width:' + en + 'px"></span><span class="sa" style="width:' + sa + 'px"></span><span class="al e" data-al="e"></span><span class="al d" data-al="d"></span></div>' +
        Object.keys(kts).map(function (k) { var t = kts[k]; return '<span class="mo-kf' + (KSEL && KSEL.id === it.id && Math.abs(KSEL.t - t) < 0.02 ? " on" : "") + '" data-kf="' + it.id + '" data-t="' + t + '" style="left:' + (t * px) + 'px" title="Keyframe em ' + fmt(t, 2) + ' s"></span>'; }).join("") + "</div>";
    });
    if (!P.itens.length) pis += '<div class="mo-vazio">Toque num item da BIBLIOTECA para começar, ou abra um MODELO PRONTO.</div>';
    $("moRot").innerHTML = rot; $("moPistas").innerHTML = pis + '<div class="mo-agulha" id="moAgulha" style="left:' + (T * px) + 'px"></div>';
  }
  /* ---------- FERRAMENTAS, ATALHOS E MENUS (estilo Adobe, 20/11) ---------- */
  var COPIA_I = null;
  // LÂMINA (C): corta o item em dois no tempo t (a 2ª parte entra sem efeito e a 1ª sai sem efeito — continua igual na tela)
  function cortarItem(id, t) { var it = item(id); if (!it) return; t = +(+t).toFixed(2); if (t <= it.ini + 0.1 || t >= it.fim - 0.1) return aviso("Ponha o corte no meio da barra do item.", true);
    var b = M.clone(it); b.id = M.uid(); b.ini = t; b.entrada = { efeito: "nenhum", dur: 0 }; var fimA = it.fim; it.fim = t; it.saida = { efeito: "nenhum", dur: 0, noFim: false };
    ["x", "y", "escala", "giro", "opac"].forEach(function (pr) { var ks = (it.keys || {})[pr]; if (!ks) return; var v = valorEm(it, pr, t); it.keys[pr] = ks.filter(function (k) { return k.t < t; }).concat([{ t: t, v: v, e: "linear" }]); b.keys[pr] = [{ t: t, v: v, e: "linear" }].concat(ks.filter(function (k) { return k.t > t; })); });
    b.fim = fimA; P.itens.splice(P.itens.indexOf(it) + 1, 0, b); SEL = b.id; KSEL = null; mudou({ painel: true }); aviso("✂ Item cortado em " + fmt(t, 2) + " s."); }
  function duplicarItem(id) { var it = item(id); if (!it) return; var c = M.clone(it); c.id = M.uid(); c.x += 40; c.y += 40; ["x", "y"].forEach(function (pr) { ((c.keys || {})[pr] || []).forEach(function (k) { k.v += 40; }); }); P.itens.splice(P.itens.indexOf(it) + 1, 0, c); SEL = c.id; KSEL = null; mudou({ painel: true }); aviso("⧉ Item duplicado."); }
  function apagarItem(id) { var it = item(id); if (!it) return; P.itens.splice(P.itens.indexOf(it), 1); SEL = null; KSEL = null; mudou({ painel: true }); aviso("🗑 Item apagado (Ctrl+Z desfaz)."); }
  function ordemItem(id, d) { var it = item(id), i = P.itens.indexOf(it), j = d === 9 ? P.itens.length - 1 : d === -9 ? 0 : i + d; if (!it || j < 0 || j >= P.itens.length || j === i) return; P.itens.splice(i, 1); P.itens.splice(j, 0, it); mudou({ painel: true }); aviso(d > 0 ? "Item para a frente." : "Item para trás."); }
  function empurrar(dx, dy) { var it = SEL && item(SEL); if (!it) return false; definir(it, "x", Math.round(valorEm(it, "x", T) + dx)); definir(it, "y", Math.round(valorEm(it, "y", T) + dy)); ver(T); mudou({ remontar: false, painel: true }); }
  function menuItem(id) { var it = item(id); if (!it) return null; if (SEL !== id) selecionar(id, false); var d = M.ITENS[it.tipo] || {};
    return { titulo: (it.nome || d.nome || "ITEM").toUpperCase(), itens: [
      { icone: "⧉", rot: "Duplicar", tecla: "Ctrl+D", fn: function () { duplicarItem(id); } }, { icone: "✂", rot: "Cortar na agulha", tecla: "Ctrl+K", off: !(T > it.ini + 0.1 && T < it.fim - 0.1), fn: function () { cortarItem(id, T); } },
      { icone: "⎘", rot: "Copiar", tecla: "Ctrl+C", fn: function () { COPIA_I = M.clone(it); aviso("Item copiado. Ctrl+V cola na agulha."); } }, { icone: "📋", rot: "Colar", tecla: "Ctrl+V", off: !COPIA_I, fn: colarItem },
      { icone: "✨", rot: "Efeito de entrada", sub: Object.keys(M.EFEITOS).map(function (k) { return { rot: nomeEfeito(k) + (it.entrada.efeito === k ? "  ✓" : ""), fn: function () { it.entrada.efeito = k; if (!it.entrada.dur) it.entrada.dur = 0.6; mudou({ painel: true }); ver(it.ini); tocar(); } }; }) },
      { icone: "⬆", rot: "Trazer para a frente", tecla: "Ctrl+]", fn: function () { ordemItem(id, 9); } }, { icone: "⬇", rot: "Mandar para trás", tecla: "Ctrl+[", fn: function () { ordemItem(id, -9); } },
      { icone: "◆", rot: "Keyframe de posição aqui", fn: function () { porKey(it, "x", T, valorEm(it, "x", T)); porKey(it, "y", T, valorEm(it, "y", T)); KSEL = { id: it.id, t: +T.toFixed(3) }; mudou({ remontar: false, painel: true }); } },
      "-", { icone: "⎘", rot: "Copiar ajustes (efeitos e cor)", tecla: "Ctrl+Shift+C", fn: function () { copiarAjustes(id); } }, { icone: "📋", rot: "Colar ajustes", tecla: "Ctrl+Shift+V", off: !AJ_COPIA, fn: function () { colarAjustes(id); } },
      { icone: "⇤", rot: "Cortar o começo até a agulha", tecla: "Q", off: !(T > it.ini + 0.1 && T < it.fim - 0.1), fn: function () { aparar(id, "q"); } }, { icone: "⇥", rot: "Cortar o fim até a agulha", tecla: "W", off: !(T > it.ini + 0.1 && T < it.fim - 0.1), fn: function () { aparar(id, "w"); } },
      { icone: it.oculto ? "👁" : "⊘", rot: it.oculto ? "Ativar o item" : "Desativar o item (some, sem apagar)", tecla: "Shift+E", fn: function () { desativar(id); } },
      "-", { icone: "🗑", rot: "Apagar", tecla: "Delete", perigo: true, fn: function () { apagarItem(id); } }] }; }
  /* 22/11 (dono: "as mesmas ferramentas do editor de vídeo"): copiar/colar AJUSTES, Q/W, desativar, cor por item */
  var AJ_COPIA = null;
  function copiarAjustes(id) { var it = item(id); if (!it) return false; AJ_COPIA = M.clone({ entrada: it.entrada, saida: it.saida, loop: it.loop, cor: it.cor || null }); aviso("⎘ Ajustes copiados (entrada, saída, durante e cor). Ctrl+Shift+V cola em outro item."); }
  function colarAjustes(id) { var it = item(id); if (!it || !AJ_COPIA) return false; var a = M.clone(AJ_COPIA); it.entrada = a.entrada; it.saida = a.saida; it.loop = a.loop; if (a.cor) it.cor = a.cor; else delete it.cor; [it.entrada.efeito, it.saida.efeito].forEach(garantirNoProjeto); mudou({ painel: true }); aviso("📋 Ajustes colados."); }
  function aparar(id, q) { var it = item(id); if (!it || !(T > it.ini + 0.1 && T < it.fim - 0.1)) { aviso("Ponha a agulha no meio da barra do item.", true); return; }
    if (q === "q") it.ini = +T.toFixed(3); else it.fim = +T.toFixed(3); mudou({ remontar: false, painel: true }); aviso(q === "q" ? "⇤ Começo cortado até a agulha." : "⇥ Fim cortado até a agulha."); }
  function desativar(id) { var it = item(id); if (!it) return false; it.oculto = !it.oculto; mudou({ remontar: false, painel: true }); aviso(it.oculto ? "⊘ Item desativado: some do vídeo, mas continua no projeto (Shift+E ativa)." : "👁 Item ativado."); }
  var LOOKS = { natural: ["Natural", {}], vivo: ["Vivo", { sat: 35, contraste: 12 }], quente: ["Quente", { temp: 45, sat: 8 }], frio: ["Frio", { temp: -45, contraste: 6 }], cinema: ["Cinema", { contraste: 18, sat: -15, temp: 15 }],
    suave: ["Suave", { contraste: -15, exp: 6, sat: -10 }], pb: ["P&B", { pb: 100, contraste: 15 }], noite: ["Noite", { exp: -25, temp: -30, contraste: 10 }] };
  var COR_K = [["exp", "Exposição", -100, 100], ["contraste", "Contraste", -100, 100], ["sat", "Saturação", -100, 100], ["temp", "Temperatura", -100, 100], ["matiz", "Matiz", -180, 180], ["pb", "Preto e branco", 0, 100], ["desfoque", "Desfoque", 0, 100]];
  function painelCor(it) { var c = it.cor || {};
    return '<div class="mo-g"><h4 data-seta="mo_cor" data-seta-padrao="fechada">COR</h4><div><div class="mo-chips">' + Object.keys(LOOKS).map(function (k) { return '<button type="button" data-look="' + k + '">' + esc(LOOKS[k][0]) + "</button>"; }).join("") + "</div>" +
      COR_K.map(function (q) { return '<label>' + q[1] + '<input type="range" data-cor="' + q[0] + '" min="' + q[2] + '" max="' + q[3] + '" step="1" value="' + (+c[q[0]] || 0) + '" title="Dois toques zeram"><output>' + (+c[q[0]] || 0) + "</output></label>"; }).join("") +
      '<div class="mo-linha"><button class="mo-bt mini" type="button" data-acao="corzerar">↺ ZERAR</button><button class="mo-bt mini" type="button" data-acao="cortodos">⇉ APLICAR EM TODOS</button></div></div></div>'; }
  function colarItem() { if (!COPIA_I) return false; var c = M.clone(COPIA_I), d = c.fim - c.ini, dt = Math.min(T, Math.max(0, P.dur - 0.5)) - c.ini; c.id = M.uid(); c.ini += dt; c.fim = Math.min(P.dur, c.ini + d); Object.keys(c.keys || {}).forEach(function (pr) { c.keys[pr].forEach(function (k) { k.t = +(k.t + dt).toFixed(3); }); }); c.x += 30; c.y += 30; P.itens.push(c); SEL = c.id; KSEL = null; mudou({ painel: true }); aviso("Item colado na agulha."); }
  function ligarFerramentas() {
    if (!window.BWFerr) return; var I = BWFerr.ICONES;
    BWFerr.barra({ el: $("moFerr"), alvos: [$("moTela"), $("moPistas")], atual: "v", ferramentas: [
      { id: "v", tecla: "V", nome: "Seleção", icone: I.v, dica: "escolhe e arrasta os itens na tela e as barras no tempo" },
      { id: "c", tecla: "C", nome: "Lâmina", icone: I.c, dica: "clique na barra do item para cortar ali" },
      { id: "h", tecla: "H", nome: "Mão", icone: I.h, dica: "arrasta a linha do tempo" },
      { id: "z", tecla: "Z", nome: "Zoom", icone: I.z, dica: "clique aproxima a linha do tempo, Alt + clique afasta" },
      { id: "t", tecla: "T", nome: "Texto", icone: I.t, dica: "clique na tela para criar um texto ali" }] });
    BWFerr.atalhos({
      "espaco, k": function () { tocar(); }, "home": function () { ver(0); }, "end": function () { ver(P.dur); },
      "delete": function () { if (KSEL && SEL) { var b = document.querySelector('#moPainel [data-acao="kapagar"]'); if (b) { b.click(); return; } } if (!SEL) return false; apagarItem(SEL); },
      "ctrl+d": function () { if (!SEL) return false; duplicarItem(SEL); }, "ctrl+shift+c": function () { if (!SEL) return false; copiarAjustes(SEL); }, "ctrl+shift+v": function () { if (!SEL || !AJ_COPIA) return false; colarAjustes(SEL); },
      "q": function () { if (!SEL) return false; aparar(SEL, "q"); }, "w": function () { if (!SEL) return false; aparar(SEL, "w"); }, "shift+e": function () { if (!SEL) return false; desativar(SEL); }, "f": function () { zoomVista(0); }, "ctrl+k": function () { if (!SEL) return false; cortarItem(SEL, T); },
      "ctrl+c": function () { var it = SEL && item(SEL); if (!it) return false; COPIA_I = M.clone(it); aviso("Item copiado."); }, "ctrl+v": colarItem,
      "ctrl+z": desfazer, "ctrl+shift+z, ctrl+y": refazer, "ctrl+]": function () { if (!SEL) return false; ordemItem(SEL, 1); }, "ctrl+[": function () { if (!SEL) return false; ordemItem(SEL, -1); },
      "arrowleft": function () { return empurrar(-1, 0); }, "arrowright": function () { return empurrar(1, 0); }, "arrowup": function () { return empurrar(0, -1); }, "arrowdown": function () { return empurrar(0, 1); },
      "shift+arrowleft": function () { return empurrar(-10, 0); }, "shift+arrowright": function () { return empurrar(10, 0); }, "shift+arrowup": function () { return empurrar(0, -10); }, "shift+arrowdown": function () { return empurrar(0, 10); },
      "=, shift+=": function () { $("moZoomMais").click(); }, "-": function () { $("moZoomMenos").click(); },
      "ctrl+s": function () { salvarJa(); aviso("✓ Salvo neste aparelho."); }, "ctrl+m, ctrl+e": function () { $("moExportar").click(); },
      "escape": function () { if (!$("moFolhaEfeito").hidden || !$("moFolhaExp").hidden) { $("moFolhaEfeito").hidden = true; $("moFolhaExp").hidden = true; return; } if (!SEL) return false; selecionar(null); }
    });
    BWFerr.ajuda("ATALHOS DO ESTÚDIO DE MOTION", [["#", "TOCAR"], ["Espaço / K", "tocar / pausar"], ["Home / End", "início / fim"],
      ["#", "ITEM ESCOLHIDO"], ["← ↑ ↓ →", "mover 1 px (com Shift, 10 px)"], ["Ctrl+D", "duplicar"], ["Ctrl+K", "cortar na agulha"], ["Ctrl+C / Ctrl+V", "copiar / colar na agulha"], ["Ctrl+] / Ctrl+[", "para a frente / para trás"], ["Ctrl+Shift+C / V", "copiar / colar ajustes (efeitos e cor)"], ["Q / W", "cortar o começo / o fim até a agulha"], ["Shift+E", "desativar / ativar o item"], ["Rodinha na prévia", "zoom da vista (F volta a 100%)"], ["Alt + rodinha na linha do tempo", "camadas mais altas / mais baixas"], ["Delete", "apagar o item (ou o keyframe aberto)"],
      ["Botão direito", "opções do item (celular: segure o dedo)"], ["#", "GERAL"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"], ["= / -", "zoom da linha do tempo"], ["Ctrl+S", "salvar"], ["Ctrl+M", "exportar"], ["?", "esta lista"]]);
    BWFerr.contexto($("moTela"), "[data-item]", function (el) { return menuItem(el.getAttribute("data-item")); });
    BWFerr.contexto($("moPistas"), "[data-barra]", function (el) { return menuItem(el.getAttribute("data-barra")); });
    BWFerr.contexto($("moRot"), "[data-sel]", function (el) { return menuItem(el.getAttribute("data-sel")); });
    FIXA = BWFerr.telaFixa({ wrap: document.querySelector(".wrap"), grade: $("moGrade"), palco: document.querySelector(".mo-palco"), rola: [document.querySelector(".mo-tl")], painelLer: function () { return JSON.parse(localStorage.getItem("ui_motion_paineis") || "{}"); }, painelGravar: function (S) { localStorage.setItem("ui_motion_paineis", JSON.stringify(S)); }, some: [document.querySelector(".wrap > .mo-nota")], aviso: $("moAviso"), aoMedir: function () { if (P) { medir(); desenharTimeline(); ver(T); } } });
  }
  function ligarTimeline() {
    var pis = $("moPistas"), arr = null;
    $("moRot").addEventListener("click", function (e) { var d = e.target.closest("[data-sel]"); if (d) selecionar(d.getAttribute("data-sel"), true); });
    pis.addEventListener("pointerdown", function (e) {
      if (e.button === 2) return; var F = window.BWFerr ? BWFerr.atual() : "v";
      if (F === "h") { arr = { tipo: "mao", x: e.clientX, sl: pis.scrollLeft }; BWFerr.preso(true); try { pis.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
      if (F === "z") { var t0 = (e.clientX - pis.getBoundingClientRect().left + pis.scrollLeft) / pxs(), xx = e.clientX - pis.getBoundingClientRect().left; ZOOM = e.altKey ? Math.max(1, ZOOM / 1.5) : Math.min(8, ZOOM * 1.5); desenharTimeline(); pis.scrollLeft = Math.max(0, t0 * pxs() - xx); e.preventDefault(); return; }
      if (F === "c") { var bc = e.target.closest("[data-barra]"); if (bc) { cortarItem(bc.getAttribute("data-barra"), (e.clientX - pis.getBoundingClientRect().left + pis.scrollLeft) / pxs()); e.preventDefault(); } return; }
      var px = pxs(), base = pis.getBoundingClientRect().left;
      var kf = e.target.closest("[data-kf]");
      if (kf) { var id = kf.getAttribute("data-kf"), t = Number(kf.getAttribute("data-t")); SEL = id; KSEL = { id: id, t: t }; ver(t); desenharPainel(); desenharTimeline();
        arr = { tipo: "kf", id: id, t0: t, x: e.clientX, mexeu: false }; if (innerWidth <= 1100) abaCel("item"); e.preventDefault(); return; }
      var b = e.target.closest("[data-barra]");
      if (b) { var it = item(b.getAttribute("data-barra")); if (!it) return; if (SEL !== it.id) selecionar(it.id, false);
        arr = { tipo: e.target.getAttribute("data-al") || "mover", id: it.id, x: e.clientX, ini: it.ini, fim: it.fim, mexeu: false, keys: JSON.stringify(it.keys || {}) };
        try { pis.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); return; }
      if (e.target.closest("#moRegua") || e.target === pis) { if (TOCANDO) tocar(); ver((e.clientX - base + pis.scrollLeft) / px); arr = { tipo: "agulha" }; try { pis.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    pis.addEventListener("pointermove", function (e) {
      if (!arr) return; var px = pxs(), it = arr.id && item(arr.id);
      if (arr.tipo === "mao") { pis.scrollLeft = arr.sl - (e.clientX - arr.x); return; }
      if (arr.tipo === "agulha") { ver((e.clientX - pis.getBoundingClientRect().left + pis.scrollLeft) / px); return; }
      var d = (e.clientX - arr.x) / px; if (!arr.mexeu && Math.abs(e.clientX - arr.x) < 4) return; arr.mexeu = true; if (!it) return;
      if (arr.tipo === "kf") { var nt = +Math.max(it.ini, Math.min(it.fim, arr.t0 + d)).toFixed(3), atual = arr.tAtual === undefined ? arr.t0 : arr.tAtual;
        keysEm(it, atual).forEach(function (q) { q.k.t = nt; }); Object.keys(it.keys || {}).forEach(function (pr) { it.keys[pr].sort(function (a, c) { return a.t - c.t; }); });
        arr.tAtual = nt; KSEL = { id: it.id, t: nt }; ver(nt); desenharTimeline(); return; }
      if (arr.tipo === "mover") { it.keys = JSON.parse(arr.keys); it.ini = arr.ini; it.fim = arr.fim; moverItem(it, d); camadaSob(e, it); }
      else if (arr.tipo === "e") it.ini = +Math.max(0, Math.min(it.fim - 0.2, arr.ini + d)).toFixed(3);
      else if (arr.tipo === "d") it.fim = +Math.min(P.dur, Math.max(it.ini + 0.2, arr.fim + d)).toFixed(3);
      ver(T); desenharTimeline();
    });
    /* 22/11 (dono): barra arrastada EM CIMA de outra camada mostra o aviso — metade de cima da camada = ⬆ PARA CIMA (o item passa a ficar por cima
       dela NA HORA), resto = ⇄ TROCAR DE LUGAR (troca a ordem das duas ao soltar). Trava de 20 px depois de subir (regra 159). */
    function camadaSob(e, it) {
      var fx = document.elementFromPoint(e.clientX, e.clientY), pista = fx && fx.closest && fx.closest(".mo-pista"), bb = pista && pista.querySelector("[data-barra]"), alvo = bb && item(bb.getAttribute("data-barra"));
      arr.troca = null;
      if (!alvo || alvo === it || (arr.yCriou != null && Math.abs(e.clientY - arr.yCriou) < 20)) { dicaArr(arr.subiu ? e : null, arr.subiu ? "⬆ PARA CIMA · por cima de “" + nomeItem(arr.subiu) + "”" : ""); return; }
      var r = pista.getBoundingClientRect();
      if (e.clientY < r.top + r.height * 0.42) { P.itens.splice(P.itens.indexOf(it), 1); P.itens.splice(P.itens.indexOf(alvo) + 1, 0, it); arr.subiu = alvo; arr.yCriou = e.clientY; remontar(); dicaArr(e, "⬆ PARA CIMA · por cima de “" + nomeItem(alvo) + "”"); }
      else { arr.troca = alvo; dicaArr(e, "trocar"); }
    }
    function soltar() { dicaArr(null); var a = arr; arr = null; if (!a) return;
      if (a.mexeu && a.troca) { var it = item(a.id), i = P.itens.indexOf(it), j = P.itens.indexOf(a.troca); if (i >= 0 && j >= 0) { P.itens[i] = a.troca; P.itens[j] = it; } mudou({ painel: true }); aviso("⇄ Camadas trocadas de lugar (Ctrl+Z desfaz)."); return; }
      if (a.mexeu) { mudou({ remontar: !!a.subiu, painel: true }); if (a.subiu) aviso("⬆ O item ficou por cima de “" + nomeItem(a.subiu) + "”."); } }
    pis.addEventListener("pointerup", soltar); pis.addEventListener("pointercancel", soltar);
    /* Alt + rodinha = camadas mais altas / mais baixas (guardado no aparelho) */
    var corpo = pis.parentNode; function altura(h) { ALT = Math.max(22, Math.min(90, Math.round(h))); corpo.style.setProperty("--mo-alt", ALT + "px"); try { localStorage.setItem("ui_motion_alt", ALT); } catch (x) {} }
    var ALT = +(localStorage.getItem("ui_motion_alt") || 38) || 38; altura(ALT);
    corpo.addEventListener("wheel", function (e) { if (!e.altKey) return; e.preventDefault(); altura(ALT + (e.deltaY < 0 ? 6 : -6)); aviso("Altura das camadas: " + ALT + " px (Alt + rodinha)."); }, { passive: false });
  }

  function nomeItem(it) { var d = M.ITENS[it.tipo] || { nome: it.tipo }; return it.tipo === "texto" || it.tipo === "chip" || it.tipo === "selo" ? String(it.props.texto || d.nome).replace(/[*\n]/g, " ").slice(0, 18) : d.nome; }
  function dicaArr(e, modo) {
    var d = $("moDicaArr"); if (!e || !modo) { if (d) d.hidden = true; return; }
    if (!d) { d = document.createElement("div"); d.id = "moDicaArr"; d.className = "mo-dica-arr"; d.setAttribute("role", "status"); document.body.appendChild(d); }
    d.innerHTML = modo !== "trocar" ? "<b class='on'>" + esc(modo) + "</b>" : "<b class='on'>⇄ TROCAR DE LUGAR <small>solte aqui</small></b><b>⬆ PARA CIMA <small>suba a barra: fica por cima na hora</small></b>";
    d.hidden = false; d.style.left = Math.min(innerWidth - 250, Math.max(8, e.clientX + 14)) + "px"; d.style.top = Math.max(8, e.clientY - 74) + "px"; }

  /* ---------- EFEITOS em galeria (22/11, como as abas do editor de vídeo): prévia animada ao passar o mouse; ARRASTE até a barra do item
     (metade da esquerda = ENTRADA, da direita = SAÍDA) ou até o item na tela; tocar aplica no item escolhido ---------- */
  function desenharEfs() { var box = $("moEfs"); if (!box) return;
    var ent = Object.keys(M.EFEITOS).filter(function (k) { return k !== "nenhum"; }), lp = Object.keys(M.LOOPS).filter(function (k) { return k !== "nenhum"; });
    var b = function (g, k, nome) { return '<button type="button" class="mo-ef" data-ef="' + g + ":" + k + '" title="Arraste até um item"><span class="pv"><i></i></span>' + esc(nome) + "</button>"; };
    box.innerHTML = '<h6>ENTRADA E SAÍDA</h6><div class="mo-efs">' + ent.map(function (k) { return b("ent", k, M.EFEITOS[k].nome); }).join("") + '</div><h6>DURANTE</h6><div class="mo-efs">' + lp.map(function (k) { return b("loop", k, M.LOOPS[k].nome); }).join("") + "</div>"; }
  function animarEf(btn) { var i = btn.querySelector(".pv i"), q = btn.getAttribute("data-ef").split(":"), t0 = performance.now(); if (btn._anim) return; btn._anim = true;
    (function passo(a) { if (!btn._anim) { i.style.transform = ""; i.style.opacity = ""; return; } var t = ((a - t0) / 1000) % 1.6, fx = {};
      try { if (q[0] === "ent") fx = M.EFEITOS[q[1]].f(Math.min(1, t / 0.9)) || {}; else fx = M.LOOPS[q[1]].f(t, 1) || {}; } catch (x) {}
      var k = 0.05; i.style.transform = "translate(" + ((fx.dx || 0) * k).toFixed(1) + "px," + ((fx.dy || 0) * k).toFixed(1) + "px) rotate(" + (fx.r || 0) + "deg) scale(" + (fx.s === undefined ? 1 : Math.max(0, fx.s)) + ")"; i.style.opacity = fx.o === undefined ? 1 : fx.o;
      requestAnimationFrame(passo); })(t0); }
  function aplicarEf(it, ef, lado) { var q = ef.split(":");
    if (q[0] === "loop") { it.loop = it.loop || { efeito: "nenhum", forca: 1 }; it.loop.efeito = q[1]; aviso("✦ Durante: " + M.LOOPS[q[1]].nome + " em “" + nomeItem(it) + "”."); mudou({ remontar: false, painel: true }); return; }
    if (lado === "sai") { if (q[1] === "palavras" || q[1] === "maquina") { aviso("Esse efeito só serve para a ENTRADA — solte na metade da esquerda da barra.", true); return; } it.saida.efeito = q[1]; if (!it.saida.dur) it.saida.dur = 0.35; aviso("✦ Saída: " + M.EFEITOS[q[1]].nome + " em “" + nomeItem(it) + "”."); mudou({ painel: true }); return; }
    if (M.EFEITOS[q[1]].soTexto && it.tipo !== "texto") { aviso("Esse efeito é só para textos.", true); return; }
    it.entrada.efeito = q[1]; if (!it.entrada.dur) it.entrada.dur = 0.6; mudou({ remontar: true, painel: true }); verEntrada(it); aviso("✦ Entrada: " + M.EFEITOS[q[1]].nome + " em “" + nomeItem(it) + "”."); }
  function ligarEfs() { var box = $("moEfs"); if (!box) return; desenharEfs(); var LD = null;
    box.addEventListener("pointerover", function (e) { var b = e.target.closest(".mo-ef"); if (b) animarEf(b); });
    box.addEventListener("pointerout", function (e) { var b = e.target.closest(".mo-ef"); if (b && !b.contains(e.relatedTarget)) b._anim = false; });
    box.addEventListener("pointerdown", function (e) { var b = e.target.closest(".mo-ef"); if (!b || e.button === 2) return; LD = { b: b, ef: b.getAttribute("data-ef"), x: e.clientX, y: e.clientY, ativo: false, toque: e.pointerType === "touch", t0: Date.now() };
      if (!LD.toque) e.preventDefault(); });
    function alvoEm(x, y) { var f = document.elementFromPoint(x, y); if (!f || !f.closest) return null; var bb = f.closest("[data-barra]"); if (bb) { var r = bb.getBoundingClientRect(); return { id: bb.getAttribute("data-barra"), lado: x > r.left + r.width / 2 ? "sai" : "ent", el: bb }; }
      var ii = f.closest("[data-item]"); return ii ? { id: ii.getAttribute("data-item"), lado: "ent", el: ii } : null; }
    window.addEventListener("pointermove", function (e) { if (!LD) return; var dist = Math.hypot(e.clientX - LD.x, e.clientY - LD.y);
      if (!LD.ativo) { if (LD.toque ? (dist > 10 && Date.now() - LD.t0 < 220) : dist < 5) { if (LD.toque && dist > 10) LD = null; return; } if (LD.toque && Date.now() - LD.t0 < 220) return; LD.ativo = true;
        LD.fan = document.createElement("div"); LD.fan.className = "mo-fantasma"; LD.fan.textContent = LD.b.textContent; document.body.appendChild(LD.fan); if (window.BWFerr) BWFerr.preso(true); }
      if (e.cancelable) e.preventDefault(); LD.fan.style.left = (e.clientX + 12) + "px"; LD.fan.style.top = (e.clientY + 12) + "px";
      var a = alvoEm(e.clientX, e.clientY), lp = LD.ef.indexOf("loop:") === 0; document.querySelectorAll(".mo-alvo").forEach(function (x) { x.classList.remove("mo-alvo"); });
      if (a) a.el.classList.add("mo-alvo"); LD.fan.setAttribute("data-dica", !a ? "solte num item (tela ou linha do tempo)" : lp ? "✦ durante" : a.lado === "sai" ? "✦ como SAÍDA" : "✦ como ENTRADA"); }, { passive: false });
    window.addEventListener("pointerup", function (e) { if (!LD) return; var l = LD; LD = null; if (window.BWFerr) BWFerr.preso(false); document.querySelectorAll(".mo-alvo").forEach(function (x) { x.classList.remove("mo-alvo"); });
      if (l.fan) l.fan.remove();
      if (!l.ativo) { var it0 = SEL && item(SEL); if (!it0) { aviso("Escolha um item (na tela ou na linha do tempo) ou ARRASTE o efeito até ele.", true); return; } aplicarEf(it0, l.ef, "ent"); return; }
      var a = alvoEm(e.clientX, e.clientY), it = a && item(a.id); if (!it) return; if (SEL !== it.id) selecionar(it.id, false); aplicarEf(it, l.ef, a.lado); });
    window.addEventListener("pointercancel", function () { if (LD && LD.fan) LD.fan.remove(); LD = null; });
  }

  /* ---------- PRÉVIA NO 2º MONITOR (janela solta com o mesmo motor) e CONTROLE PELO CELULAR (BWControle, o mesmo do editor de vídeo) ---------- */
  var JAN = null, JM = null;
  async function outraTela() { try { if (!window.getScreenDetails) return null; var sd = await window.getScreenDetails(), at = sd.currentScreen; return sd.screens.filter(function (x) { return x !== at && !(x.left === at.left && x.top === at.top); })[0] || null; } catch (e) { return null; } }
  async function abrirJanela() {
    if (JAN && !JAN.closed) { JAN.focus(); return; }
    var t2 = await outraTela(), pos = t2 ? "popup=1,left=" + t2.availLeft + ",top=" + t2.availTop + ",width=" + t2.availWidth + ",height=" + t2.availHeight : "popup=1,width=960,height=600";
    JAN = window.open("", "bwMotionPrevia", pos); if (!JAN) { aviso("O navegador bloqueou a janela — libere pop-ups para este site e toque de novo.", true); return; }
    var fontes = [].map.call(document.querySelectorAll('link[rel="stylesheet"][href*="fonts"]'), function (l) { return '<link rel="stylesheet" href="' + l.href + '">'; }).join("");
    JAN.document.open(); JAN.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Prévia — Estúdio de motion</title>' + fontes + '<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}#c{position:absolute;left:0;top:0;transform-origin:0 0}</style></head><body><div id="c"></div></body></html>'); JAN.document.close();
    var n = 0; (function pronto() { if (!JAN || JAN.closed) return; if (!JAN.document.getElementById("c")) { if (n++ < 60) setTimeout(pronto, 100); return; } montarJanela();
      JAN.addEventListener("resize", encaixarJanela); JAN.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "k") { e.preventDefault(); tocar(); } else if (e.key === "ArrowLeft") ver(T - 1 / 30); else if (e.key === "ArrowRight") ver(T + 1 / 30); else if (e.key === "Home") ver(0); });
      aviso(t2 ? "🖥 Prévia aberta no segundo monitor (Espaço lá também toca/pausa)." : "🖥 Prévia aberta numa janela — arraste-a para o outro monitor."); })();
  }
  function montarJanela() { var c = JAN && !JAN.closed && JAN.document.getElementById("c"); if (!c) { JM = null; return; } try { JM = M.montar(c, P, {});   /* o motor desta página desenha na janela (mesma origem): nada é baixado de novo */ encaixarJanela(); JM.seek(T); } catch (e) { JM = null; } }
  function encaixarJanela() { if (!JAN || JAN.closed) return; var c = JAN.document.getElementById("c"), W = JAN.innerWidth, H = JAN.innerHeight, k = Math.min(W / P.w, H / P.h); c.style.transform = "translate(" + ((W - P.w * k) / 2).toFixed(1) + "px," + ((H - P.h * k) / 2).toFixed(1) + "px) scale(" + k + ")"; }
  function controleCelular() { if (!window.BWControle) { aviso("O controle pelo celular não carregou (sem internet?).", true); return; }
    BWControle.painel({ tocar: function () { if (!TOCANDO) tocar(); }, parar: function () { if (TOCANDO) tocar(); }, tocando: function () { return TOCANDO; }, irPara: function (t) { ver(t); }, T: function () { return T; }, total: function () { return P.dur; },
      dividir: function () { if (SEL) cortarItem(SEL, T); }, desfazer: desfazer, refazer: refazer }); }

  /* ---------- motion automático ---------- */
  function motionAuto() {
    if (!P.itens.length) return aviso("Ponha itens na tela primeiro (BIBLIOTECA ou MODELOS PRONTOS).", true);
    var est = ["dinamico", "suave", "impacto"], i = (est.indexOf(P.autoEstilo) + 1) % 3; P.autoEstilo = est[i];
    M.auto(P, est[i]); mudou({ painel: true }); ver(0); if (!TOCANDO) tocar();
    aviso("✨ Motion automático: estilo " + ["DINÂMICO", "SUAVE", "IMPACTO"][i] + ". Toque de novo para ver o próximo estilo; depois ajuste item por item.");
  }

  /* ---------- criar efeito com ajuda ---------- */
  var EF_NOVO = null;
  function abrirEfeito() { $("moFolhaEfeito").hidden = false; $("moEfRes").innerHTML = ""; EF_NOVO = null;
    $("moEfEx").innerHTML = ["cai de cima quicando", "entra girando e crescendo", "desliza da esquerda devagar", "explode do centro", "vem de longe com desfoque", "vira como uma carta"].map(function (x) { return '<button type="button" data-ex="' + esc(x) + '">' + esc(x) + "</button>"; }).join("");
    setTimeout(function () { $("moEfTexto").focus(); }, 50); }
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function extrairJSON(t) { var m = String(t || "").match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { return null; } }
  function neutro(ef) { var N = { dx: 0, dy: 0, s: 1, r: 0, o: 1, b: 0, rx: 0, ry: 0 };
    Object.keys(ef.chaves).forEach(function (k) { var l = ef.chaves[k], u = l[l.length - 1]; if (u[0] < 1) l.push([1, N[k], "sai"]); else u[1] = N[k]; }); return ef; }
  async function criarEfeito() {
    var frase = $("moEfTexto").value.trim(); if (!frase) return aviso("Escreva como o item deve entrar.", true);
    var ef = null, motivo = "", s = await sessao();
    $("moEfRes").innerHTML = '<p class="mo-dica">Criando…</p>';
    if (s) {
      try {
        var r = await fetch(FN_IA, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB },
          body: JSON.stringify({ sistema: 'Você cria efeitos de ENTRADA de animação para um app de vídeos (tela de 1080x1920). A pessoa descreve em português. Responda SÓ com JSON neste formato: {"nome":"nome curto em português","chaves":{"dy":[[0,-700,"linear"],[0.7,0,"quique"],[1,0,"linear"]],"r":[[0,-180,"linear"],[1,0,"sai"]],"o":[[0,0,"linear"],[0.2,1,"sai"]]}}. O tempo vai de 0 (começo) a 1 (item parado no lugar). Propriedades possíveis: dx e dy (deslocamento em pixels; dy positivo = para baixo, dx positivo = para a direita), s (tamanho, 1 = normal), r (giro em graus), o (opacidade de 0 a 1), b (desfoque em pixels), rx e ry (giro 3D em graus). Curvas possíveis (a do ponto de chegada): linear, suave, entra, sai, pulo, elastico, quique, degrau. Em 1 todas as propriedades usadas precisam estar no normal (dx 0, dy 0, s 1, r 0, o 1, b 0, rx 0, ry 0). Use só as propriedades que o pedido precisa, no máximo 6 pontos por propriedade.', pedido: frase, max: 500 }) });
        var j = await r.json().catch(function () { return {}; });
        if (r.ok) { ef = M.limparEfeito(extrairJSON(j.texto)); if (!ef) motivo = "a IA respondeu fora do formato"; }
        else motivo = r.status === 401 ? "entre de novo na sua conta" : r.status === 429 ? "o limite de hoje da IA acabou" : "a IA Brightway está fora do ar agora";
      } catch (e) { motivo = "sem internet"; }
    } else motivo = "sem conta, usei o criador do aparelho";
    if (!ef) ef = M.limparEfeito(M.efeitoPorTexto(frase));
    ef = neutro(ef); ef.id = M.uid(); if (!ef.nome || ef.nome === "Meu efeito") ef.nome = frase.slice(0, 40);
    mostrarEfeito(ef, motivo);
  }
  function efeitoDoItem() {
    var it = SEL && item(SEL); if (!it || !it.keys || !Object.keys(it.keys).length) return aviso("Escolha um item que tenha keyframes (◆) para virar efeito.", true);
    var t0 = Infinity, t1 = -Infinity; Object.keys(it.keys).forEach(function (pr) { it.keys[pr].forEach(function (k) { t0 = Math.min(t0, k.t); t1 = Math.max(t1, k.t); }); });
    if (!(t1 > t0)) return aviso("Precisa de pelo menos 2 keyframes em tempos diferentes.", true);
    var map = { x: "dx", y: "dy", escala: "s", giro: "r", opac: "o" }, ch = {};
    Object.keys(it.keys).forEach(function (pr) { var l = it.keys[pr], fim = l[l.length - 1].v;
      ch[map[pr]] = l.map(function (k) { var v = pr === "x" || pr === "y" || pr === "giro" ? k.v - fim : pr === "escala" ? (fim ? k.v / fim : 1) : (fim ? k.v / fim : 1); return [(k.t - t0) / (t1 - t0), v, k.e]; }); });
    var ef = M.limparEfeito({ nome: "Movimento de " + (M.ITENS[it.tipo] || {}).nome, chaves: ch }); if (!ef) return aviso("Não consegui transformar esse movimento.", true);
    ef = neutro(ef); ef.id = M.uid(); ef.dur = +(t1 - t0).toFixed(2); mostrarEfeito(ef, "");
  }
  function mostrarEfeito(ef, motivo) {
    EF_NOVO = ef;
    $("moEfRes").innerHTML = '<div class="mo-g" style="border:1px solid rgba(192,76,255,.5);border-radius:12px;padding:10px;margin-top:10px"><strong>★ ' + esc(ef.nome) + "</strong>" +
      '<p class="mo-dica">' + Object.keys(ef.chaves).map(function (k) { return { dx: "lado", dy: "altura", s: "tamanho", r: "giro", o: "aparecer", b: "desfoque", rx: "3D (X)", ry: "3D (Y)" }[k]; }).join(" · ") + (motivo ? " — " + esc(motivo) : "") + "</p>" +
      '<div class="mo-linha"><button class="mo-bt mini" type="button" id="moEfTestar">▶ TESTAR NO ITEM</button><button class="mo-bt mini ia" type="button" id="moEfSalvar">★ SALVAR EM MEUS EFEITOS</button></div></div>';
    $("moEfTestar").onclick = function () { var it = SEL && item(SEL) || P.itens[P.itens.length - 1]; if (!it) return aviso("Ponha um item na tela para testar.", true);
      P.meusEfeitos = (P.meusEfeitos || []).filter(function (e) { return e.id !== ef.id; }).concat([M.clone(ef)]); it.entrada = { efeito: "m:" + ef.id, dur: ef.dur || Math.max(0.8, it.entrada.dur) }; SEL = it.id; mudou({ painel: true }); verEntrada(it); };
    $("moEfSalvar").onclick = function () { guardarGlobal(M.clone(ef)); aviso("★ “" + ef.nome + "” salvo em MEUS EFEITOS: aparece na ENTRADA e na SAÍDA de qualquer item, em qualquer projeto."); desenharPainel(); };
  }

  /* ---------- exportar ---------- */
  var EXP = { parar: false, url: "", arquivo: null };
  function nomeArq() { return (P.nome || "motion").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "motion"; }
  function baixar(blob, nome) { var a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  function urlMotor() { return new URL("assets/motion-motor.js?v=" + M.VERSAO, location.href).href; }
  function dicaExp() {
    var f = $("moExpFundo").value, d = { "": "Vídeo com o fundo do projeto.", verde: "Fundo verde liso: no CapCut, Sobrepor → Remover fundo → Chroma key → toque no verde. Se a animação usa verde, escolha azul ou magenta.",
      azul: "Fundo azul liso para chroma key (use quando a animação tem verde).", magenta: "Fundo magenta liso: quase nada usa essa cor, ótimo para animações verdes e azuis.",
      alfa: "Transparente de verdade (.mov ProRes 4444) para Premiere, DaVinci e CapCut no PC — só o app BW do computador faz esse." }[f];
    $("moExpDica").textContent = d; $("moExpAqui").disabled = f === "alfa";
    $("moExpPC").textContent = NO_APP ? "💻 GERAR NO PC (app BW)" : "💻 GERAR NO APP BW (PC)";
  }
  /* 20/11 — AMBIENTE ÚNICO: a criação vai para a LINHA DO TEMPO do editor de vídeo (assets/bw-criacoes.js) */
  function paraLinha() { if (window.BWCriacoes) BWCriacoes.aoLado("moExpBaixar", { ferramenta: "motion", arquivo: function () { return EXP.arquivo; }, nome: function () { return P.nome; }, projeto: function () { return P.id; }, tipo: "video" }); }
  async function gerarAqui() {
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) return aviso("Este navegador não grava vídeo sozinho. Use o app BW no computador, ou o Chrome/Safari atualizado.", true);
    var rec = $("moExpFundo").value; EXP.parar = false; $("moExpProg").hidden = false; $("moExpPronto").hidden = true;
    try {
      var res = await BWReelsCelular.gerar({ html: M.html(P, { src: urlMotor(), recorte: rec }), largura: P.w, altura: P.h, fps: P.fps || 30, duracao: P.dur, som: null, alturaSaida: Number($("moExpQual").value),
        cancelar: function () { return EXP.parar; }, aoProgredir: function (p) { $("moExpBarra").value = p.pct; $("moExpTxt").textContent = p.etapa + "… " + p.pct + "%"; } });
      if (EXP.url) URL.revokeObjectURL(EXP.url);
      var nome = nomeArq() + (rec ? "-" + rec : "") + ".mp4";
      EXP.arquivo = new File([res.blob], nome, { type: "video/mp4" }); EXP.url = URL.createObjectURL(res.blob);
      $("moExpVideo").src = EXP.url; $("moExpBaixar").href = EXP.url; $("moExpBaixar").download = nome; $("moExpPronto").hidden = false;
      paraLinha();
      $("moExpTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + res.quadros + " quadros, sem som — ponha a trilha no editor de vídeo ou no CapCut).";
    } catch (e) { $("moExpTxt").textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); }
  }
  function gerarPC() {
    var rec = $("moExpFundo").value || "normal", nome = nomeArq() + "." + rec + ".bwmotion.json";
    baixar(new Blob([JSON.stringify(P)], { type: "application/json" }), nome);
    if (NO_APP) aviso("💻 Pedido enviado ao app BW: o vídeo é feito no computador e abre sozinho quando ficar pronto.");
    else aviso("Este botão faz o vídeo pelo app BW do computador: abra esta página DENTRO do app BW e toque de novo. O arquivo baixado (" + nome + ") é o seu projeto — dá para abrir aqui em ⇪ ABRIR PROJETO.");
  }

  /* ---------- abas do celular ---------- */
  function abaCel(a) { $("moGrade").setAttribute("data-aba", a); [].forEach.call($("moAbasCel").children, function (b) { b.classList.toggle("on", b.getAttribute("data-aba") === a); }); }

  function desenharTudo() {
    $("moNome").value = P.nome || ""; $("moFmt").value = P.formato || "9:16"; livre(); $("moDur").value = String(P.dur);
    desenharFundo(); desenharPainel(); desenharTimeline(); desenharProjetos(); medir(); ver(T);
  }

  /* ---------- início ---------- */
  async function iniciar() {
    var d = ""; [3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 25, 30, 45, 60].forEach(function (s) { d += '<option value="' + s + '">' + s + " s</option>"; }); $("moDur").innerHTML = d;
    desenharLib(); desenharModelos();
    var ult = null; try { ult = localStorage.getItem("ui_motion_ultimo"); } catch (e) {}
    /* 20/11 — vindo da LINHA DO TEMPO (?p=ID): abre o projeto daquela criação */
    try { var pq = new URLSearchParams(location.search).get("p"); if (pq) ult = pq; } catch (e) {}
    var r = null; if (ult) { try { r = await dbOp("readonly", function (s) { return s.get(ult); }); } catch (e) {} }
    if (r && r.projeto) P = r.projeto; else { P = M.novoProjeto("9:16"); P.id = M.uid(); P.nome = "Vitrine de prompts"; P.itens = MODELOS.vitrine.f(P); }
    /* 20/11: tamanho vindo do ESTÚDIO 3D (resolução do telão): motion.html?w=896&h=512 */
    try { var uq = new URLSearchParams(location.search), uw = parseInt(uq.get("w"), 10), uh = parseInt(uq.get("h"), 10);
      if (uw > 79 && uh > 79 && uw < 4097 && uh < 4097) { P.formato = "livre"; P.w = uw; P.h = uh; } } catch (e) {}
    HIST = [JSON.stringify(P)]; remontar(); desenharTudo(); botoesHist();
    if (window.BWDobras) BWDobras.aplicar(document);

    $("moLib").addEventListener("click", function (e) { var b = e.target.closest("[data-add]"); if (b) adicionar(b.getAttribute("data-add")); });
    $("moModelos").addEventListener("click", function (e) { var b = e.target.closest("[data-modelo]"); if (b) usarModelo(b.getAttribute("data-modelo")); });
    $("moFundo").addEventListener("input", function (e) { var k = e.target.getAttribute("data-fundo"); if (!k) return; P.fundo[k] = e.target.value; if (k === "tipo") desenharFundo(); mudou(); });
    $("moProjetos").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-proj-novo")) novoProjeto();
      else if (b.hasAttribute("data-proj-abrir")) abrirProjeto(b.getAttribute("data-proj-abrir"));
      else if (b.hasAttribute("data-proj-apagar")) { var id = b.getAttribute("data-proj-apagar"); if (!confirm("Apagar este projeto do aparelho? Não dá para desfazer.")) return;
        dbOp("readwrite", function (s) { return s.delete(id); }).then(function () { if (id === P.id) novoProjeto(); else desenharProjetos(); }); }
    });
    $("moNome").addEventListener("input", function () { P.nome = this.value.slice(0, 40); mudou({ remontar: false }); });
    function redimensionar(w, h) { var kx = w / P.w, ky = h / P.h, ks = Math.min(kx, ky);
      P.itens.forEach(function (it) { it.x *= kx; it.y *= ky; it.escala = +((+it.escala || 1) * ks).toFixed(3); ["x", "y", "escala"].forEach(function (pr) { ((it.keys || {})[pr] || []).forEach(function (k) { k.v *= pr === "x" ? kx : pr === "y" ? ky : ks; }); }); });
      P.w = w; P.h = h; livre(); mudou(); }
    $("moFmt").addEventListener("change", function () { P.formato = this.value; var f = M.FORMATOS[this.value]; if (f) redimensionar(f[0], f[1]); else livre(); });
    ["moLargura", "moAltura"].forEach(function (id) { $(id).addEventListener("change", function () { if (P.formato !== "livre") return; var par = function (v) { v = Math.round(Number(v) || 0); return Math.max(240, Math.min(4096, v - v % 2)); };
      redimensionar(par($("moLargura").value), par($("moAltura").value)); aviso("Tamanho " + P.w + " × " + P.h + " px (telão, painel de LED…)."); }); });
    $("moDur").addEventListener("change", function () { var n = Number(this.value), ant = P.dur; P.dur = n; P.itens.forEach(function (it) { if (it.fim >= ant - 0.01 || it.fim > n) it.fim = n; if (it.ini >= n) it.ini = Math.max(0, n - 1); }); mudou({ painel: true }); });
    $("moTocar").onclick = tocar; $("moInicio").onclick = function () { ver(0); };
    $("moGravar").onclick = function () { GRAVAR = !GRAVAR; this.classList.toggle("on", GRAVAR); aviso(GRAVAR ? "◆ GRAVANDO: mova a agulha e arraste o item na tela — cada arraste cria um keyframe." : "Gravação de movimento desligada."); };
    $("moDesfazer").onclick = desfazer; $("moRefazer").onclick = refazer;
    $("moAuto").onclick = motionAuto;
    $("moZoomMais").onclick = function () { ZOOM = Math.min(8, ZOOM * 1.5); desenharTimeline(); }; $("moZoomMenos").onclick = function () { ZOOM = Math.max(1, ZOOM / 1.5); desenharTimeline(); };
    $("moCriarEfeito").onclick = abrirEfeito; $("moEfFechar").onclick = function () { $("moFolhaEfeito").hidden = true; };
    $("moEfGerar").onclick = criarEfeito; $("moEfDoItem").onclick = efeitoDoItem;
    $("moEfEx").addEventListener("click", function (e) { var b = e.target.closest("[data-ex]"); if (b) { $("moEfTexto").value = b.getAttribute("data-ex"); criarEfeito(); } });
    $("moExportar").onclick = function () { if (TOCANDO) tocar(); $("moFolhaExp").hidden = false; $("moExpProg").hidden = true; dicaExp(); qualidades(); };
    $("moExpFundo").onchange = dicaExp; $("moExpFechar").onclick = function () { EXP.parar = true; $("moFolhaExp").hidden = true; };
    $("moExpAqui").onclick = gerarAqui; $("moExpCancelar").onclick = function () { EXP.parar = true; }; $("moExpPC").onclick = gerarPC;
    $("moExpHtml").onclick = function () { baixar(new Blob([M.html(P, { src: urlMotor() })], { type: "text/html" }), nomeArq() + ".html"); aviso("HTML baixado: na skill ANIMAÇÃO POR CÓDIGO, rode o motor com --chroma ou --alfa nele."); };
    $("moExpJson").onclick = function () { baixar(new Blob([JSON.stringify(P)], { type: "application/json" }), nomeArq() + ".bwmotion.json"); };
    $("moExpAbrir").onclick = function () { $("moArqProj").value = ""; $("moArqProj").click(); };
    $("moExpCompart").onclick = async function () { if (!EXP.arquivo) return; try { if (navigator.canShare && navigator.canShare({ files: [EXP.arquivo] })) await navigator.share({ files: [EXP.arquivo], title: P.nome }); else $("moExpBaixar").click(); } catch (e) {} };
    $("moArqProj").addEventListener("change", function () { var f = this.files[0]; if (!f) return; f.text().then(function (t) {
      var o = null; try { o = JSON.parse(t); } catch (e) {} if (!o || !Array.isArray(o.itens) || !o.w || !o.h) return aviso("Esse arquivo não é um projeto do Estúdio de motion.", true);
      o.itens = o.itens.filter(function (i) { return i && M.ITENS[i.tipo]; }); o.id = M.uid(); o.nome = (o.nome || "Projeto") + " (aberto)"; salvarJa(); P = o; T = 0; SEL = null; HIST = [JSON.stringify(P)]; depoisDeTrocar(); salvarJa(); aviso("Projeto aberto."); }); });
    $("moArqImg").addEventListener("change", async function () {
      var f = this.files[0], a = ALVO_IMG; if (!f || !a) return; var it = item(a.id); if (!it) return;
      try { it.props[a.campo] = await reduzir(f); if (it.tipo === "foto") { var im = new Image(); im.src = it.props[a.campo]; await im.decode().catch(function () {}); if (im.width && im.height) it.props.alt = Math.round(it.props.larg * im.height / im.width); } mudou({ painel: true }); }
      catch (e) { aviso("Não consegui abrir essa imagem.", true); }
    });
    $("moAbasCel").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) abaCel(b.getAttribute("data-aba")); });
    ligarPalco(); ligarPainel(); ligarTimeline(); ligarFerramentas(); ligarEfs();
    $("moVZ").addEventListener("click", function () { zoomVista(0); }); $("moJanela").addEventListener("click", abrirJanela); $("moCelular").addEventListener("click", controleCelular);
    addEventListener("resize", function () { medir(); desenharTimeline(); ver(T); });
    addEventListener("keydown", function (e) {
      if (window.BWFerr) return;
      if (e.key === "Escape") { $("moFolhaEfeito").hidden = true; $("moFolhaExp").hidden = true; return; }   /* os atalhos agora vêm do bw-ferramentas.js */
      if (/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || "")) return;
      if (e.key === " ") { e.preventDefault(); tocar(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) refazer(); else desfazer(); }
      else if ((e.key === "Delete" || e.key === "Backspace") && SEL) { var it = item(SEL); if (it && confirm("Apagar este item?")) { P.itens.splice(P.itens.indexOf(it), 1); SEL = null; mudou({ painel: true }); } }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { remontar(); });
    window.BWMotionEditor = { projeto: function () { return P; }, ver: ver, selecionar: selecionar, tempo: function () { return T; } }; // para os testes
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
