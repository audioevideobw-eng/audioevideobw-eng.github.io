/* EDITOR DE VÍDEO (18/11/2026, Claude) — video.html
   Linha do tempo em camadas (2 de vídeo/imagem, texto, trilha e efeitos), cortes, textos, volume e fades, efeitos sonoros e trilhas
   sintetizados no aparelho, e exportação gravada pelo próprio navegador (canvas + áudio → MediaRecorder).
   NADA sai do aparelho: este arquivo não usa fetch, upload nem a conta. Mídias e projeto ficam no IndexedDB bw_video. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var uid = function (p) { return (p || "c") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var lim = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  /* CAMADAS (22/11): v1, v2, v3… (vídeo/imagem; número maior = mais em cima), tx, tx2… (texto), a1, a2, a3… (som). Camada nova nasce quando
     um take é solto EM CIMA de outro (fam + próximo número livre); camada vazia some sozinha. Altura de cada camada: P.alt[id] (Alt + rodinha). */
  var BASE_TR = {v1: ["VÍDEO", "#7C5CFF"], v2: ["SOBREPOSIÇÃO", "#B14DFF"], tx: ["TEXTO", "#22B8CF"], a1: ["TRILHA", "#12B76A"], a2: ["EFEITOS", "#F5A524"]};
  var COR_EXTRA = {v: ["#9B7BFF", "#D45CFF", "#6E8BFF", "#C266FF"], t: ["#3FD0E0", "#1E9FB5", "#5BE0C8"], a: ["#3DD68C", "#E8B53A", "#F07A5A", "#58C4F0"]};
  function fam(id) { id = String(id || ""); return id.charAt(0) === "v" ? "v" : id.charAt(0) === "t" ? "t" : "a"; }
  function numTr(id) { var n = parseInt(String(id).replace(/^\D+/, ""), 10); return isFinite(n) ? n : 1; }
  function infoTr(id) { if (BASE_TR[id]) return BASE_TR[id]; var f = fam(id), n = numTr(id), l = COR_EXTRA[f]; return [f === "v" ? "SOBREPOSIÇÃO " + (n - 1) : f === "t" ? "TEXTO " + n : "SOM " + n, l[n % l.length]]; }
  function corTr(id) { return infoTr(id)[1]; }
  function famDoClip(c) { return c.tipo === "texto" ? "t" : c.tipo === "audio" ? "a" : "v"; }
  function idTr(f, n) { return f === "t" ? (n <= 1 ? "tx" : "tx" + n) : f + n; }
  /* 23/11 (dono: "as camadas de mídia e textos devem ser criadas sempre ACIMA; só o áudio fica no lugar dele, embaixo — use o padrão da Adobe e do
     DaVinci"): vídeo/foto e texto formam UMA PILHA só (P.pilha, de baixo para cima). Camada nova = topo da pilha; o que está mais acima aparece por
     cima na prévia (antes os textos ficavam num bloco separado, abaixo dos vídeos na lista). Projeto antigo: vídeos (v1, v2…) e depois textos, que é
     a ordem em que já eram desenhados. O som continua embaixo, com o menor número em cima. */
  function pilha() { var tem = {v1: 1, v2: 1, tx: 1}; P.clips.forEach(function (c) { if (c.trilha && fam(c.trilha) !== "a") tem[c.trilha] = 1; }); (P.trExtra || []).forEach(function (t) { if (fam(t) !== "a") tem[t] = 1; });
    var l = (P.pilha || []).filter(function (t, i, a) { return tem[t] && a.indexOf(t) === i; }), falta = Object.keys(tem).filter(function (t) { return l.indexOf(t) < 0; });
    falta.sort(function (a, b) { var fa = fam(a), fb = fam(b); return fa !== fb ? (fa === "v" ? -1 : 1) : numTr(a) - numTr(b); });
    if (!P.pilha || !P.pilha.length) l = falta; else falta.forEach(function (t) { if (t === "v1") l.unshift(t); else l.push(t); });
    if (!P.pilha || P.pilha.join() !== l.join()) P.pilha = l; return l; }
  function trilhas() { var ids = {a1: 1, a2: 1}; P.clips.forEach(function (c) { if (c.trilha && fam(c.trilha) === "a") ids[c.trilha] = 1; }); (P.trExtra || []).forEach(function (t) { if (fam(t) === "a") ids[t] = 1; });
    var sons = Object.keys(ids).sort(function (a, b) { return numTr(a) - numTr(b); });
    return pilha().slice().reverse().concat(sons).map(function (id) { var i = infoTr(id); return [id, i[0], i[1]]; }); }
  function novaTrilha(f) { var n = 1; P.clips.forEach(function (c) { if (fam(c.trilha) === f) n = Math.max(n, numTr(c.trilha)); }); (P.trExtra || []).concat(P.pilha || []).forEach(function (t) { if (fam(t) === f) n = Math.max(n, numTr(t)); }); if (f !== "t") n = Math.max(n, 2); return idTr(f, n + 1); }
  /* 22/11 (dono): take levado PARA CIMA ou PARA BAIXO, além das camadas da família dele (vídeo/foto, texto ou som) = camada nova ao soltar.
     Visualmente: vídeo e texto têm o número MAIOR em cima; som tem o MENOR em cima. "Embaixo de tudo" renumera a família (e as alturas P.alt). */
  function vertNova(c, e) { var f = famDoClip(c), fx = $("veFaixas"); if (!fx) return null;
    var ls = [].slice.call(fx.querySelectorAll("[data-trilha]")).filter(function (x) { return (f === "a" ? fam(x.dataset.trilha) === "a" : fam(x.dataset.trilha) !== "a") && x.getClientRects().length && x.getBoundingClientRect().height > 2; });
    if (!ls.length) return null; var top = Infinity, bot = -Infinity; ls.forEach(function (x) { var r = x.getBoundingClientRect(); top = Math.min(top, r.top); bot = Math.max(bot, r.bottom); });
    var so = P.clips.filter(function (x) { return x !== c && x.trilha === c.trilha; }).length === 0, minha = c.trilha, nums = P.clips.filter(function (x) { return fam(x.trilha) === f; }).map(function (x) { return numTr(x.trilha); }),
      noTopo = f === "a" ? numTr(minha) <= Math.min.apply(null, nums) : numTr(minha) >= Math.max.apply(null, nums), noFundo = f === "a" ? numTr(minha) >= Math.max.apply(null, nums) : numTr(minha) <= Math.min.apply(null, nums);
    if (f !== "a") { var pl = pilha(); return e.clientY < top - 8 && !(so && pl[pl.length - 1] === minha) ? "cima" : null; }   /* vídeo/foto/texto: camada nova só ACIMA de tudo */
    if (e.clientY < top - 8) return so && noTopo ? null : "cima"; if (e.clientY > bot + 8) return so && noFundo ? null : "baixo"; return null; }
  function camadaNova(c, lado) { var f = famDoClip(c), cimaMaior = f !== "a", novoMaior = (lado === "cima") === cimaMaior;
    if (f !== "a") { c.trilha = "__x"; var idn = novaTrilha(f); P.pilha = pilha().filter(function (t) { return t !== idn; }).concat(idn); c.trilha = idn; return; }
    if (novoMaior) { c.trilha = "__x"; c.trilha = novaTrilha(f); return; }
    var alt = {}; P.clips.forEach(function (x) { if (x !== c && fam(x.trilha) === f) x.trilha = idTr(f, numTr(x.trilha) + 1); });
    if (P.alt) { Object.keys(P.alt).forEach(function (k) { alt[fam(k) === f ? idTr(f, numTr(k) + 1) : k] = P.alt[k]; }); P.alt = alt; }
    c.trilha = idTr(f, 1); }
  /* aviso flutuante do arrastar (22/11): as duas escolhas, a ativa acesa */
  function dicaArr(e, modo, txt) {
    var d = document.getElementById("veDicaArr");
    if (!e || (!modo && !txt)) { if (d) d.hidden = true; return; }
    if (!d) { d = document.createElement("div"); d.id = "veDicaArr"; d.className = "ve-dica-arr"; d.setAttribute("role", "status"); document.body.appendChild(d); }
    d.innerHTML = txt ? "<b class='on'>" + esc(txt) + "</b>" : "<b class='" + (modo === "trocar" ? "on" : "") + "'>⇄ TROCAR DE LUGAR <small>solte aqui</small></b><b class='" + (modo === "cima" ? "on" : "") + "'>⬆ PARA CIMA <small>suba o take: cria a camada na hora</small></b>";
    d.hidden = false; d.style.left = Math.min(innerWidth - 250, Math.max(8, e.clientX + 14)) + "px"; d.style.top = Math.max(8, e.clientY - 74) + "px";
  }
  /* TROCAR DE LUGAR: cada take vai para o lugar do outro (o que estava antes continua antes, pelas pontas); se não couber, o que veio sobe de camada */
  function trocarLugar(c, o, iniOrig, trOrig) {
    var oIni = o.ini, oTr = o.trilha, cFim = iniOrig + c.dur, oFim = oIni + o.dur;
    if (trOrig === oTr) { if (iniOrig <= oIni) { o.ini = iniOrig; c.ini = Math.max(0, oFim - c.dur); } else { c.ini = oIni; o.ini = Math.max(0, cFim - o.dur); } c.trilha = oTr; }
    else { c.ini = oIni; c.trilha = oTr; o.ini = iniOrig; o.trilha = trOrig; }
    c.ini = Math.round(c.ini * 20) / 20; o.ini = Math.round(o.ini * 20) / 20;
    var extra = "";
    if (!livreEm(o.trilha, o.ini, o.dur, o)) { o.trilha = novaTrilha(famDoClip(o)); extra = " (" + (o.nome || "o outro take") + " subiu de camada para caber)"; }
    if (!livreEm(c.trilha, c.ini, c.dur, c)) { c.trilha = novaTrilha(famDoClip(c)); extra = " (o take subiu de camada para caber)"; }
    aviso("⇄ Trocados de lugar" + extra + ". Ctrl + Z desfaz.");
  }
  /* ENCOSTAR: o take solto um pouco por cima do vizinho encosta nele (antes ou depois, o mais perto); sem lugar, volta para onde estava */
  function encostar(a) { var c = a.c, o = a.encosta, depois = Math.round((o.ini + o.dur) * 20) / 20, antes = Math.round((o.ini - c.dur) * 20) / 20, ops = [depois, antes].filter(function (v) { return v >= 0; })
      .sort(function (x, y) { return Math.abs(x - c.ini) - Math.abs(y - c.ini); });
    for (var i = 0; i < ops.length; i++) if (livreEm(c.trilha, ops[i], c.dur, c)) { c.ini = ops[i]; return; }
    c.ini = a.ini; c.trilha = a.trOrig; aviso("Não coube ali — o take voltou para onde estava.", true); }
  /* ESCOLHA ao soltar um take por cima de outro (≥ 60%): nada muda até o toque; tocar fora ou Esc = cancelar (o take volta) */
  var ESC_SOBRE = null;
  function escolherSobre(a, xy) { fecharEscolha(false); var c = a.c, o = a.troca, d = document.createElement("div"); d.id = "veEscolha"; d.className = "ve-escolha"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "O que fazer com o take");
    d.innerHTML = "<p>O take está em cima de <b>" + esc(o.nome || "outro take") + "</b>. O que você quer?</p>" +
      '<button type="button" data-esc="trocar">⇄ TROCAR DE LUGAR<small>os dois trocam de posição</small></button>' +
      '<button type="button" data-esc="subst">⟳ SUBSTITUIR<small>este entra no lugar do outro, que sai</small></button>' +
      '<button type="button" data-esc="cima">⬆ PÔR POR CIMA<small>camada nova, os dois ficam</small></button>' +
      '<button type="button" data-esc="cancelar" class="nao">↩ CANCELAR<small>o take volta para onde estava</small></button>';
    document.body.appendChild(d); var w = Math.min(260, innerWidth - 16); d.style.left = Math.max(8, Math.min(innerWidth - w - 8, (xy.x || innerWidth / 2) - w / 2)) + "px";
    var h = d.offsetHeight, y = (xy.y || innerHeight / 2) - h - 14; d.style.top = Math.max(8, y < 8 ? Math.min(innerHeight - h - 8, (xy.y || 0) + 14) : y) + "px";
    ESC_SOBRE = {a: a, el: d, desde: Date.now()};
    d.addEventListener("click", function (e) { var b = e.target.closest("[data-esc]"); if (b) escolher(b.dataset.esc); }); }
  function escolher(k) { if (!ESC_SOBRE) return; var a = ESC_SOBRE.a, c = a.c, o = a.troca; ESC_SOBRE.el.remove(); ESC_SOBRE = null;
    if (k === "trocar") trocarLugar(c, o, a.ini, a.trOrig);
    else if (k === "subst") { var oi = o.ini, ot = o.trilha; P.clips = P.clips.filter(function (x) { return x !== o; }); c.ini = oi; c.trilha = ot; if (!livreEm(c.trilha, c.ini, c.dur, c)) c.trilha = novaTrilha(famDoClip(c)); aviso("⟳ Substituído: " + (o.nome || "o take") + " saiu e este entrou no lugar. Ctrl + Z desfaz."); }
    else if (k === "cima") { c.trilha = novaTrilha(famDoClip(c)); aviso("⬆ Camada nova: " + infoTr(c.trilha)[0] + " — o take ficou por cima do outro."); }
    else { c.ini = a.ini; c.trilha = a.trOrig; aviso("↩ Cancelado — o take voltou para onde estava."); tudo(true); return; }
    SEL = c.id; tudo(); gravarHist(); }
  function fecharEscolha(cancelar) { if (!ESC_SOBRE) return; if (cancelar) escolher("cancelar"); else { ESC_SOBRE.el.remove(); ESC_SOBRE = null; } }
  document.addEventListener("pointerdown", function (e) { if (ESC_SOBRE && !e.target.closest("#veEscolha") && Date.now() - ESC_SOBRE.desde > 250) fecharEscolha(true); }, true);
  document.addEventListener("keydown", function (e) { if (ESC_SOBRE && e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); fecharEscolha(true); } }, true);
  function livreEm(tr, ini, dur, menos) { return !P.clips.some(function (x) { return x !== menos && x.trilha === tr && x.ini < ini + dur - 0.02 && x.ini + x.dur > ini + 0.02; }); }
  var APP = document.documentElement.classList.contains("ve-app");   /* 22/11: layout de app (celular/tablet, estilo CapCut) — assets/ve-app.js */
  function altTr(id) { var a = P.alt && P.alt[id]; return a ? lim(a, ALT_MIN, 160) : APP ? (fam(id) === "v" ? 48 : 30) : 52; }
  var ALT_MIN = 22;
  var FMT = {"9:16": [720, 1280], "16:9": [1280, 720], "1:1": [1080, 1080], "4:5": [864, 1080], "4k-v": [2160, 3840], "4k-h": [3840, 2160]};
  /* 20/11 — transições entre clipes e efeitos (estilo CapCut), tudo desenhado no canvas (funciona em qualquer navegador) */
  /* 23/11 (dono: "CapCut e biblioteca à nossa maneira, mais leve e ao mesmo tempo visual"): a biblioteca é organizada por TIPO (abas com ícone) e,
     dentro do tipo, por FUNÇÃO (GRUPOS). Tudo é criação própria desenhada por código — nenhuma imagem/vídeo para baixar: as prévias são CSS e só
     animam com o mouse em cima (não pesa a memória). Item novo = uma linha em TRANS/EFEITOS/TEXTOS + o grupo dele. */
  var GRUPOS = {
    trans: [["Básicas", ["dissolver", "preto", "branco", "desfoque"]], ["Movimento", ["empurrar", "empurrar-d", "deslizar", "descer", "girar"]], ["Zoom", ["zoom", "zoom-saida", "zoom-giro"]], ["Formas", ["cortina", "cortina-v", "circulo", "losango", "barras", "relogio"]]],
    efe: [["Clássicos", ["pb", "sepia", "vintage", "desbotado"]], ["Cor", ["quente", "frio", "vivido", "contraste", "dourado", "azulado", "rosado"]], ["Cinema", ["cinema", "noite", "vinheta", "duotom"]], ["Textura", ["grao", "vhs", "desfoque"]]]};
  var TEXTOS = [["titulo", "Título", {txt: "SEU TÍTULO", tam: 9, fonte: "Montserrat", y: -10, anima: "zoom"}], ["sub", "Subtítulo", {txt: "Seu subtítulo aqui", tam: 5, y: 8}], ["legenda", "Legenda", {txt: "Legenda do vídeo", tam: 4.5, y: 36, fundo: "#000000"}],
    ["nome", "Nome e cargo", {txt: "Nome Sobrenome\nCargo ou empresa", tam: 4, x: -18, y: 34, fundo: "#111827"}], ["chamada", "Chamada", {txt: "SAIBA MAIS", tam: 6, y: 30, cor: "#111111", fundo: "#FFD23F", anima: "pulsar"}],
    ["sobe", "Sobe", {txt: "Texto que sobe", tam: 6, anima: "subir"}], ["maquina", "Máquina de escrever", {txt: "Digitando o texto...", tam: 5, anima: "maquina"}], ["letreiro", "Letreiro", {txt: "NOVIDADE · NOVIDADE · NOVIDADE", tam: 5, y: -36, anima: "letreiro"}], ["anel", "Anel na pessoa", {txt: "SEU NOME · SEU NOME ·", tam: 5, anima: "anel"}]];
  var TRANS = {"empurrar-d": "Empurrar →", descer: "Descer ↓", "zoom-giro": "Zoom com giro", "cortina-v": "Cortina ↓", losango: "Losango", barras: "Persiana", relogio: "Relógio", dissolver: "Dissolver", preto: "Passar pelo preto", branco: "Flash branco", empurrar: "Empurrar ←", deslizar: "Subir ↑", zoom: "Zoom", girar: "Girar", cortina: "Cortina", circulo: "Círculo", desfoque: "Desfoque", "zoom-saida": "Zoom de saída"};
  var EFEITOS = {desbotado: "Desbotado", dourado: "Dourado", azulado: "Azul e laranja", rosado: "Rosado", cinema: "Cinema", duotom: "Duotom", pb: "Preto e branco", sepia: "Sépia", vintage: "Vintage", quente: "Quente", frio: "Frio", vivido: "Vívido", contraste: "Contraste", noite: "Noite", vinheta: "Vinheta", grao: "Grão de filme", vhs: "VHS", desfoque: "Desfoque"};
  var VELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
  var FONTES = ["Inter", "Montserrat", "Georgia", "Impact", "Courier New"];
  var P = {fmt: "9:16", clips: []}, MID = {}, SEL = null, T = 0, TOCANDO = false, PPS = 60, ABA = "tudo", EL = {}, GRAV = null;
  var cv = $("veCv"), cx = cv.getContext("2d");

  /* ---------- banco do aparelho ---------- */
  var DB = null;
  function db() { return new Promise(function (ok, erro) { if (DB) return ok(DB); var r = indexedDB.open("bw_video", 2); r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}); if (!d.objectStoreNames.contains("estado")) d.createObjectStore("estado", {keyPath: "id"}); if (!d.objectStoreNames.contains("proxies")) d.createObjectStore("proxies", {keyPath: "id"}); if (!d.objectStoreNames.contains("cfg")) d.createObjectStore("cfg", {keyPath: "id"}); };   /* v2 (22/11): proxies + pastas escolhidas */ r.onsuccess = function () { DB = r.result; ok(DB); }; r.onerror = function () { erro(r.error); }; }); }
  function tx(loja, modo, fn) { return db().then(function (d) { return new Promise(function (ok, erro) { var t = d.transaction(loja, modo), q = fn(t.objectStore(loja)); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { erro(t.error); }; }); }).catch(function () { return null; }); }
  var tSalvar = 0;
  var HIST = [], FUT = [], tHist = 0;
  function marcarHist() { clearTimeout(tHist); tHist = setTimeout(gravarHist, 300); }
  function gravarHist() { clearTimeout(tHist); var s = JSON.stringify(P); if (HIST[HIST.length - 1] !== s) { HIST.push(s); if (HIST.length > 60) HIST.shift(); FUT = []; } }
  function desfazer() { gravarHist(); if (HIST.length < 2) { aviso("Nada para desfazer."); return; } FUT.push(HIST.pop()); P = JSON.parse(HIST[HIST.length - 1]); SEL = sel() ? SEL : null; tudo(true); aviso("↶ Desfeito."); }
  function refazer() { if (!FUT.length) { aviso("Nada para refazer."); return; } var s = FUT.pop(); HIST.push(s); P = JSON.parse(s); tudo(true); aviso("↷ Refeito."); }
  function guardar() { clearTimeout(tSalvar); tSalvar = setTimeout(function () { tx("estado", "readwrite", function (s) { return s.put({id: "atual", p: JSON.parse(JSON.stringify(P))}); }); if (typeof copiaProjeto === "function") copiaProjeto(); }, 400); }
  var AVISO_T = 0;
  function aviso(t, erro) { if (window.BWAviso) BWAviso(t, erro ? "erro" : "", /^⏳/.test(t || "") ? 0 : undefined); }   /* 23/11: aviso único do ecossistema (layout.js BWAviso) */
  function fmtT(t) { t = Math.max(0, t); var m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(1).replace(".", ","); }
  function total() { return P.clips.reduce(function (m, c) { return Math.max(m, c.ini + c.dur); }, 0); }

  /* ---------- mídia ---------- */
  function tipoDe(f) { var t = f.type || ""; if (/^video\//.test(t)) return "video"; if (/^audio\//.test(t)) return "audio"; if (/^image\//.test(t)) return "imagem"; var n = (f.name || "").toLowerCase(); return /\.(mp4|mov|webm|m4v)$/.test(n) ? "video" : /\.(mp3|wav|m4a|ogg|aac)$/.test(n) ? "audio" : /\.(png|jpe?g|webp|gif|heic|heif)$/.test(n) ? "imagem" : ""; }
  /* 22/11 (dono: "26 takes não abriram"): cada arquivo abria um <video> escondido para a duração e outro para a capa e NUNCA soltava —
     o navegador aguenta ~20–30 players ao mesmo tempo e, dali em diante, todo arquivo "não abria" (parecia HEVC sem ser). Agora: UM elemento
     por vez, solto no fim (soltarMidia), prazos maiores para 4K, nova tentativa antes de desistir e o motivo de verdade (HEVC só se o
     arquivo disser hvc1/hev1). */
  function soltarMidia(e) { try { e.onloadedmetadata = e.onloadeddata = e.onseeked = e.onerror = e.ontimeupdate = null; e.pause(); e.removeAttribute("src"); e.load(); } catch (x) {} }
  function abrirVideo(m, querCapa, prazo) { return new Promise(function (ok) {
    if (m.tipo === "imagem") { var im = new Image(); im.onload = function () { m.img = im; ok({ ok: true, dur: 4 }); }; im.onerror = function () { ok({ ok: false, dur: 4 }); }; im.src = m.url; return; }
    var e = document.createElement(m.tipo === "video" ? "video" : "audio"), feito = false, dur = 0;
    e.muted = true; e.defaultMuted = true; e.playsInline = true; e.setAttribute("playsinline", ""); e.setAttribute("webkit-playsinline", ""); e.setAttribute("muted", ""); e.preload = querCapa ? "auto" : "metadata";
    /* 23/11 (dono, iPhone: IMG_1585.MOV da própria câmera dava "não abre neste navegador"): o iPhone só carrega o 1º QUADRO de um <video> depois de play() —
       loadeddata/seeked nunca chegavam, o prazo estourava e o arquivo era dado como ruim. Agora: metadados lidos → dá play() mudo para puxar o quadro; e, se o
       quadro não vier no prazo mas o vídeo tem duração e tamanho, o arquivo ABRE (só fica sem miniatura). */
    var puxou = false; function puxar() { if (puxou || feito || !querCapa || m.tipo !== "video") return; puxou = true; try { var pr = e.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (x) {}
      var ver = function () { if (feito) return; if (e.readyState >= 2 && e.videoWidth) { try { e.pause(); } catch (x) {} fim(true); } else setTimeout(ver, 120); }; setTimeout(ver, 200); }
    function fim(okk) { if (feito) return; feito = true; clearTimeout(tm); var r = { ok: okk, dur: isFinite(dur) && dur > 0 ? dur : 0, w: e.videoWidth || 0, h: e.videoHeight || 0 };
      if (okk && querCapa && m.tipo === "video" && e.videoWidth) { try { var c = document.createElement("canvas"); c.width = 160; c.height = Math.max(1, Math.round(160 * e.videoHeight / e.videoWidth)); c.getContext("2d").drawImage(e, 0, 0, c.width, c.height); r.capa = c.toDataURL("image/jpeg", 0.7); } catch (x) {} }
      soltarMidia(e); ok(r); }
    var tm = setTimeout(function () { fim(dur > 0 && (!querCapa || m.tipo !== "video" || e.videoWidth > 0)); }, prazo || 15000);
    e.onerror = function () { fim(false); };
    e.onloadedmetadata = function () { dur = e.duration; if (dur === Infinity) { e.currentTime = 1e7; e.ontimeupdate = function () { e.ontimeupdate = null; dur = e.duration; if (!querCapa || m.tipo !== "video") fim(true); else setTimeout(puxar, 700); }; return; } if (!querCapa || m.tipo !== "video") fim(true); else setTimeout(puxar, 700); };
    e.onloadeddata = function () { if (!querCapa) return; try { e.currentTime = Math.min(0.3, (e.duration || 1) / 2); } catch (x) { fim(true); } };
    e.onseeked = function () { fim(true); };
    e.src = m.url; }); }
  /* lê o começo e o fim do arquivo e procura o codec escrito nele (o "moov" pode estar no fim) */
  async function codecDe(blob) { try { var ler = async function (a, b) { return new TextDecoder("latin1").decode(new Uint8Array(await blob.slice(a, b).arrayBuffer())); };
    var t = (await ler(0, Math.min(blob.size, 4e6))) + (blob.size > 4e6 ? await ler(Math.max(0, blob.size - 4e6), blob.size) : "");
    return /hvc1|hev1/.test(t) ? "hevc" : /av01/.test(t) ? "av1" : /avc1/.test(t) ? "h264" : /apcn|apch|apcs|ap4h/.test(t) ? "prores" : ""; } catch (e) { return ""; } }
  function duracaoDe(url, tipo) { return abrirVideo({ url: url, tipo: tipo }, false, 12000).then(function (r) { duracaoDe.ok = r.ok; return r.ok && r.dur ? r.dur : 5; }); }
  async function capa(m) { var r = await abrirVideo(m, true, 15000); if (r.capa) m.capa = r.capa; if (!r.ok && m.tipo === "imagem") m.ruim = true; return r; }
  async function porMidia(blob, nome, tipo, id, durFixa, capaFixa) {
    var m = {id: id || uid("m"), nome: String(nome || "arquivo").slice(0, 60), tipo: tipo, blob: blob, url: URL.createObjectURL(blob)};
    if (capaFixa && durFixa && tipo === "video") { m.capa = capaFixa; m.dur = durFixa; MID[m.id] = m; return m; }   /* ao reabrir: capa guardada, nada de abrir 37 vídeos 4K de novo */
    var r = await abrirVideo(m, tipo === "video", 15000); if (r.w) { m.w = r.w; m.h = r.h; }
    if (!r.ok && tipo !== "imagem") { await new Promise(function (ok) { setTimeout(ok, 400); }); r = await abrirVideo(m, tipo === "video", 25000); }   /* 2ª tentativa, com mais prazo (4K pesado) */
    if (r.capa) m.capa = r.capa; m.dur = durFixa || r.dur || (tipo === "imagem" ? 4 : 5);
    if (!r.ok) { m.ruim = true; if (tipo === "video") m.codec = await codecDe(blob); }
    MID[m.id] = m;
    if (!id) try { await tx("midias", "readwrite", function (s) { return s.put({id: m.id, nome: m.nome, tipo: m.tipo, blob: blob, dur: m.dur, capa: m.ruim ? "" : (m.capa || "")}); }); } catch (e) { m.soAgora = true; }   /* sem espaço no aparelho: fica só nesta sessão */
    return m;
  }
  var IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  /* o iPhone invalida o arquivo escolhido depois (PENTE FINO 47): lá a cópia vai para a memória; no PC/Android o próprio arquivo serve —
     copiar 37 takes 4K inteiros para a memória é o que fazia a página travar */
  /* 22/11 23:11 (dono: "no iPhone um bug ao importar mídia"): copiar um vídeo GRANDE inteiro para a memória do iPhone falha (ou derruba a página) e o
     erro caía em "não é vídeo, imagem nem áudio". Agora: no iPhone copia até 300 MB; maior que isso, ou se a cópia falhar, usa o próprio arquivo. */
  async function copiaSegura(f) { if (!(IOS ? f.size < 300e6 : f.size < 80e6)) return f;
    try { return new Blob([await f.arrayBuffer()], { type: f.type || ({mov: "video/quicktime", mp4: "video/mp4", m4v: "video/mp4", heic: "image/heic"})[String(f.name).split(".").pop().toLowerCase()] || "" }); } catch (e) { return f; } }
  async function importar(files) {
    var n = 0, fora = 0, ruins = [], falhou = [];
    for (var i = 0; i < files.length; i++) { var f = files[i], t = tipoDe(f); if (!t) { fora++; continue; }
      if (files.length > 1) aviso("⏳ Trazendo " + (i + 1) + " de " + files.length + ": " + String(f.name).slice(0, 40) + "…");
      try { var mm = await porMidia(await copiaSegura(f), f.name, t); n++; if (mm.ruim) ruins.push(mm.nome); desenharLib(); } catch (e) { console.warn("importar", f.name, e); falhou.push(String(f.name).slice(0, 30) + " (" + ((e && (e.name || e.message)) || "erro") + ")"); } }   /* cópia na memória na hora (o iPhone invalida o original); a biblioteca aparece arquivo a arquivo */
    desenharLib(); proxyAuto();
    /* 22/11 (dono: "bugs ao adicionar mídia"): arquivo que o navegador NÃO consegue abrir (vídeo HEVC/H.265 ou foto HEIC do iPhone, codec raro) entrava calado,
       com 5 s e tela preta. Agora fica marcado com ⚠ na biblioteca e o aviso diz o que fazer. */
    var hevc = ruins.filter(function (nm) { return Object.keys(MID).some(function (k) { return MID[k].nome === nm && MID[k].codec === "hevc"; }); }).length;
    if (ruins.length) aviso("⚠ " + ruins.length + " arquivo(s) não abriram (" + ruins.slice(0, 2).join(", ") + (ruins.length > 2 ? "…" : "") + "). " + (hevc ? hevc + " são HEVC/H.265. " : "") + "Vídeo HEVC ou foto HEIC do iPhone: Ajustes → Câmera → Formatos → MAIS COMPATÍVEL; no PC, o Chrome/Edge com a extensão HEVC do Windows abre. Toque em ↻ no arquivo para tentar de novo.", true);
    else if (falhou.length) aviso("⚠ " + falhou.length + " arquivo(s) não entraram: " + falhou.slice(0, 2).join(", ") + ". Tente de novo com menos arquivos de uma vez" + (IOS ? " (no iPhone, vídeos muito longos pesam na memória)." : "."), true);
    else aviso(n ? n + " arquivo(s) na biblioteca. Toque neles para pôr na linha do tempo." + (fora ? " " + fora + " não é vídeo, imagem nem áudio." : "") : "Esse arquivo não é vídeo, imagem nem áudio.", !n);
  }
  async function criacoes() {   /* imagens criadas no QUADRO DE HISTÓRIA e os personagens com imagem (mesmo aparelho) */
    var n = 0;
    try { var lista = await new Promise(function (ok) { var r = indexedDB.open("bw_reels"); r.onsuccess = function () { var d = r.result; if (!d.objectStoreNames.contains("midias")) { d.close(); return ok([]); } var q = d.transaction("midias").objectStore("midias").getAll(); q.onsuccess = function () { d.close(); ok(q.result || []); }; q.onerror = function () { d.close(); ok([]); }; }; r.onerror = function () { ok([]); }; });
      for (var i = 0; i < lista.length; i++) { var x = lista[i]; if (!x.blob || !(x.tipo === "imagem" || x.tipo === "video")) continue; var id = "cr-" + x.id; if (MID[id]) continue; var m = await porMidia(x.blob, x.projeto === "__quadro" ? "Quadro · " + (x.nome || "cena") : (x.nome || "Reels"), x.tipo === "video" ? "video" : "imagem", id); m.criacao = true; n++; } } catch (e) {}
    try { var ps = window.BWPersonagens ? await BWPersonagens.listar() : []; for (var k = 0; k < ps.length; k++) { var p = ps[k], idp = "pe-" + p.id; if (!p.blob || MID[idp]) continue; var mp = await porMidia(p.blob, "Personagem · " + (p.nome || ""), "imagem", idp); mp.criacao = true; n++; } } catch (e) {}
    try { var bl = window.BWCriacoes ? await BWCriacoes.listar() : []; for (var b = 0; b < bl.length; b++) { if (await trazerCriacao(bl[b].id, false)) n++; } } catch (e) {}
    ABA = "tudo"; desenharLib(); aviso(n ? n + " criação(ões) trazida(s) das ferramentas deste aparelho." : "Não achei criações novas neste aparelho. Crie em CRIAR PARA A LINHA DO TEMPO, ou traga de fora pelo ＋ IMPORTAR.", !n);
  }

  /* ---------- AMBIENTE ÚNICO (20/11): a linha do tempo é o centro; as ferramentas criam para ela ----------
     Cada criação guardada em assets/bw-criacoes.js entra aqui como a mídia "bc-<id da criação>". Quando a pessoa
     reabre a criação na ferramenta de origem (✎) e manda de volta, o blob é trocado NO LUGAR: os clipes continuam
     onde estavam, com os mesmos cortes, efeitos e volume. */
  async function trazerCriacao(id, porNaLinha) {
    if (!window.BWCriacoes) return null;
    var c = null; try { c = await BWCriacoes.pegar(id); } catch (e) {}
    if (!c || !c.blob || !(c.tipo === "imagem" || c.tipo === "video")) return null;
    var mid = "bc-" + c.id, antes = MID[mid], nova = !antes || antes.crCriado !== c.criado;
    if (!nova && !porNaLinha) return null;
    if (antes && antes.url) try { URL.revokeObjectURL(antes.url); } catch (e) {}
    var m = await porMidia(c.blob, c.nome, c.tipo, mid, c.tipo === "imagem" ? 0 : c.dur);
    m.criacao = true; m.crCriado = c.criado; m.cr = { id: c.id, ferramenta: c.ferramenta, projeto: c.projeto };
    await tx("midias", "readwrite", function (s) { return s.put({ id: mid, nome: m.nome, tipo: m.tipo, blob: c.blob, dur: m.dur, cr: m.cr, crCriado: c.criado }); });
    var usados = P.clips.filter(function (x) { return x.mid === mid; });
    usados.forEach(function (x) {   /* a nova versão pode ser mais curta: encurta o clipe em vez de mostrar quadro vazio */
      if (m.tipo === "imagem") return;
      x.corte = Math.max(0, Math.min(x.corte || 0, Math.max(0, m.dur - 0.2)));
      x.dur = Math.max(0.2, Math.min(x.dur, (m.dur - x.corte) / (x.vel || 1)));
    });
    if (porNaLinha && !usados.length) addClip(m);
    else if (usados.length) { guardar(); tudo(true); }
    desenharLib();   /* sem isto a criação entrava na linha do tempo mas não aparecia na biblioteca */
    return { m: m, trocou: usados.length > 0, nome: c.nome };
  }
  function editarNaOrigem(mid) {
    var m = MID[mid]; if (!m || !m.cr || !window.BWCriacoes) return;
    var f = BWCriacoes.FERR[m.cr.ferramenta]; if (!f) return aviso("Essa criação não tem ferramenta de origem — troque pelo ⋯ SUBSTITUIR MÍDIA.", true);
    guardar();
    location.href = BWCriacoes.url(m.cr.ferramenta, m.cr.projeto, { voltar: "video", criacao: m.cr.id });
  }
  function desenharFerramentas() {
    if (!window.BWCriacoes) return;
    var ordem = ["motion", "telas", "album", "d3", "fotos", "criador", "reels", "quadro"];
    $("veCriarLista").innerHTML = ordem.map(function (k) {
      var f = BWCriacoes.FERR[k];
      return '<a href="' + BWCriacoes.url(k, "", { voltar: "video" }) + '" style="--cf:' + f.cor + '"><i aria-hidden="true">' + f.icone + "</i>" + esc(f.curto) + "</a>";
    }).join("");
  }
  async function chegouCriacao() {   /* video.html?criacao=ID — acabou de ser mandada por uma ferramenta */
    var id = ""; try { id = new URLSearchParams(location.search).get("criacao") || ""; } catch (e) {}
    if (!id) { try { id = localStorage.getItem("ui_criacao_nova") || ""; } catch (e) {} if (!id) return; }
    try { localStorage.removeItem("ui_criacao_nova"); } catch (e) {}
    var r = await trazerCriacao(id, true);
    if (r) aviso(r.trocou ? "✓ " + r.nome + " trocada no lugar — os cortes e os efeitos continuaram." : "✓ " + r.nome + " entrou na linha do tempo.");
    if (location.search.indexOf("criacao=") > -1) try { history.replaceState(null, "", location.pathname); } catch (e) {}
  }

  /* ---------- efeitos sonoros e trilhas (sintetizados aqui, sem arquivo de terceiros) ---------- */
  /* 23/11: sons da casa por FUNÇÃO (4º campo = grupo). Todos sintetizados no aparelho — nenhum arquivo para baixar e nenhuma licença de terceiros. */
  var SONS = [["sfx", "Whoosh", 0.7, "Transição"], ["sfx", "Whoosh rápido", 0.35, "Transição"], ["sfx", "Whoosh longo", 1.4, "Transição"], ["sfx", "Swish", 0.25, "Transição"], ["sfx", "Fita parando", 0.6, "Transição"],
    ["sfx", "Impacto", 0.9, "Impacto"], ["sfx", "Boom grave", 1.6, "Impacto"], ["sfx", "Batida", 0.3, "Impacto"], ["sfx", "Sub drop", 1.8, "Impacto"],
    ["sfx", "Subida", 1.6, "Subida e tensão"], ["sfx", "Descida", 1.4, "Subida e tensão"], ["sfx", "Suspense", 3, "Subida e tensão"], ["sfx", "Contagem", 0.35, "Subida e tensão"],
    ["sfx", "Pop", 0.25, "Interface"], ["sfx", "Clique", 0.12, "Interface"], ["sfx", "Tecla", 0.09, "Interface"], ["sfx", "Bolha", 0.22, "Interface"], ["sfx", "Ding", 1.4, "Interface"], ["sfx", "Notificação", 0.6, "Interface"], ["sfx", "Sucesso", 0.8, "Interface"], ["sfx", "Erro", 0.45, "Interface"],
    ["sfx", "Câmera", 0.22, "Diversos"], ["sfx", "Glitch", 0.4, "Diversos"], ["sfx", "Brilho", 1.1, "Diversos"],
    ["trilha", "Base calma", 24, "Trilhas"], ["trilha", "Base animada", 24, "Trilhas"], ["trilha", "Base corporativa", 24, "Trilhas"], ["trilha", "Base lo-fi", 24, "Trilhas"], ["trilha", "Base épica", 24, "Trilhas"]];
  function wav(canais, taxa) {
    var n = canais[0].length, nc = canais.length, buf = new ArrayBuffer(44 + n * nc * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * nc * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, taxa, true); v.setUint32(28, taxa * nc * 2, true); v.setUint16(32, nc * 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * nc * 2, true);
    for (var i = 0, o = 44; i < n; i++) for (var c = 0; c < nc; c++, o += 2) { var x = Math.max(-1, Math.min(1, canais[c][i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], {type: "audio/wav"});
  }
  async function sintetizar(nome, dur) {
    var sr = 44100, O = window.OfflineAudioContext || window.webkitOfflineAudioContext, o = new O(1, Math.ceil(dur * sr), sr), g = o.createGain(); g.connect(o.destination);
    var ruido = function () { var b = o.createBuffer(1, Math.ceil(dur * sr), sr), d = b.getChannelData(0), a = 12345; for (var i = 0; i < d.length; i++) { a = (a * 1664525 + 1013904223) >>> 0; d[i] = a / 2147483648 - 1; } var s = o.createBufferSource(); s.buffer = b; return s; };
    var tom = function (tipo, f0, f1, t0, d, vol) { var os = o.createOscillator(), gg = o.createGain(); os.type = tipo; os.frequency.setValueAtTime(f0, t0); if (f1) os.frequency.exponentialRampToValueAtTime(f1, t0 + d); gg.gain.setValueAtTime(0.0001, t0); gg.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, d / 4)); gg.gain.exponentialRampToValueAtTime(0.0001, t0 + d); os.connect(gg); gg.connect(g); os.start(t0); os.stop(t0 + d + 0.02); };
    var chiado = function (tipo, f0, f1, t0, d, vol, q) { var r0 = ruido(), f0n = o.createBiquadFilter(), g0 = o.createGain(); f0n.type = tipo; f0n.Q.value = q || 1; f0n.frequency.setValueAtTime(f0, t0); if (f1) f0n.frequency.exponentialRampToValueAtTime(f1, t0 + d); g0.gain.setValueAtTime(0.0001, t0); g0.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(d * 0.4, 0.6)); g0.gain.exponentialRampToValueAtTime(0.0001, t0 + d); r0.connect(f0n); f0n.connect(g0); g0.connect(g); r0.start(t0); r0.stop(t0 + d + 0.02); };
    var NOVOS = {
      "Whoosh rápido": function () { chiado("bandpass", 500, 5000, 0, dur, 0.75, 1.4); },
      "Whoosh longo": function () { chiado("bandpass", 200, 3200, 0, dur * 0.6, 0.6, 0.9); chiado("bandpass", 3200, 250, dur * 0.4, dur * 0.6, 0.5, 0.9); },
      "Swish": function () { chiado("highpass", 2500, 7000, 0, dur, 0.55, 0.7); },
      "Fita parando": function () { tom("sawtooth", 440, 40, 0, dur, 0.3); chiado("lowpass", 3000, 200, 0, dur, 0.2); },
      "Boom grave": function () { tom("sine", 90, 28, 0, dur, 0.95); chiado("lowpass", 400, 80, 0, 0.5, 0.5); },
      "Batida": function () { tom("sine", 180, 60, 0, 0.25, 0.9); chiado("lowpass", 1800, 600, 0, 0.08, 0.5); },
      "Sub drop": function () { tom("sine", 160, 24, 0, dur, 0.9); },
      "Descida": function () { chiado("bandpass", 6000, 200, 0, dur, 0.6, 1.2); tom("sawtooth", 880, 110, 0, dur * 0.95, 0.13); },
      "Suspense": function () { tom("sawtooth", 55, 0, 0, dur, 0.22); tom("sawtooth", 58.3, 0, 0, dur, 0.18); chiado("bandpass", 300, 900, 0, dur, 0.12, 2); },
      "Contagem": function () { tom("square", 880, 0, 0, 0.3, 0.3); },
      "Tecla": function () { chiado("bandpass", 1800, 0, 0, 0.05, 0.7, 3); tom("sine", 240, 120, 0, 0.05, 0.3); },
      "Bolha": function () { tom("sine", 300, 900, 0, 0.18, 0.7); },
      "Notificação": function () { tom("sine", 880, 0, 0, 0.3, 0.45); tom("sine", 1318.5, 0, 0.14, 0.42, 0.45); },
      "Sucesso": function () { [523.3, 659.3, 784, 1046.5].forEach(function (fq, k) { tom("triangle", fq, 0, k * 0.09, 0.45, 0.35); }); },
      "Erro": function () { tom("square", 220, 0, 0, 0.18, 0.25); tom("square", 165, 0, 0.2, 0.22, 0.25); },
      "Câmera": function () { chiado("highpass", 3000, 0, 0, 0.04, 0.8); chiado("highpass", 2200, 0, 0.09, 0.07, 0.6); tom("sine", 900, 300, 0, 0.03, 0.3); },
      "Glitch": function () { for (var k = 0; k < 8; k++) tom("square", 200 + ((k * 7919) % 1900), 0, k * 0.045, 0.035, 0.22); chiado("highpass", 4000, 0, 0.1, 0.12, 0.3); },
      "Brilho": function () { [1568, 2093, 2637, 3136, 3951].forEach(function (fq, k) { tom("sine", fq, 0, k * 0.1, 0.6, 0.2); }); },
      "Base corporativa": function () { base(100, [[261.6, 329.6, 392], [220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7]], "pulso"); },
      "Base lo-fi": function () { base(72, [[220, 261.6, 329.6, 392], [174.6, 220, 261.6, 329.6], [196, 246.9, 293.7, 349.2], [164.8, 196, 246.9, 293.7]], "lofi"); },
      "Base épica": function () { base(90, [[146.8, 174.6, 220], [116.5, 146.8, 174.6], [174.6, 220, 261.6], [130.8, 164.8, 196]], "epica"); }};
    function base(bpm, acs, jeito) { var b = 60 / bpm; for (var t = 0, k = 0; t < dur - 0.1; t += b * 4, k++) { var ac = acs[k % 4], d4 = Math.min(b * 4, dur - t); ac.forEach(function (fq) { tom(jeito === "epica" ? "sawtooth" : "triangle", fq, 0, t, d4, jeito === "epica" ? 0.05 : 0.08); }); tom("sine", ac[0] / 2, 0, t, d4, 0.17);
        for (var q = 0; q < 4 && t + q * b < dur - 0.2; q++) { var tq = t + q * b;
          if (jeito === "pulso") { tom("triangle", ac[q % ac.length] * 2, 0, tq, 0.2, 0.07); tom("triangle", ac[(q + 1) % ac.length] * 2, 0, tq + b / 2, 0.2, 0.05); if (q % 2 === 0) tom("sine", 120, 45, tq, 0.2, 0.35); }
          else if (jeito === "lofi") { if (q % 2 === 0) tom("sine", 110, 42, tq, 0.25, 0.45); else chiado("highpass", 1800, 0, tq, 0.09, 0.16); tom("sine", ac[(q * 2 + k) % ac.length] * 2, 0, tq + b * 0.66, 0.3, 0.05); }
          else { tom("sine", 80, 36, tq, 0.4, q === 0 ? 0.7 : 0.35); if (q === 3) chiado("lowpass", 900, 300, tq + b / 2, 0.3, 0.2); } } } }
    if (NOVOS[nome]) NOVOS[nome]();
    else if (nome === "Whoosh" || nome === "Subida") { var r = ruido(), f = o.createBiquadFilter(), gg = o.createGain(); f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(nome === "Subida" ? 200 : 300, 0); f.frequency.exponentialRampToValueAtTime(nome === "Subida" ? 6000 : 4000, dur * (nome === "Subida" ? 0.95 : 0.5)); if (nome === "Whoosh") f.frequency.exponentialRampToValueAtTime(400, dur);
      gg.gain.setValueAtTime(0.0001, 0); gg.gain.exponentialRampToValueAtTime(0.7, dur * (nome === "Subida" ? 0.9 : 0.45)); gg.gain.exponentialRampToValueAtTime(0.0001, dur); r.connect(f); f.connect(gg); gg.connect(g); r.start(0); if (nome === "Subida") tom("sawtooth", 110, 880, 0, dur * 0.95, 0.15); }
    else if (nome === "Pop") tom("sine", 620, 150, 0, 0.16, 0.8);
    else if (nome === "Ding") { tom("sine", 1320, 0, 0, 1.3, 0.5); tom("sine", 1980, 0, 0, 0.9, 0.25); }
    else if (nome === "Impacto") { tom("sine", 130, 38, 0, 0.8, 0.95); var ri = ruido(), fi = o.createBiquadFilter(), gi = o.createGain(); fi.type = "lowpass"; fi.frequency.value = 900; gi.gain.setValueAtTime(0.6, 0); gi.gain.exponentialRampToValueAtTime(0.0001, 0.25); ri.connect(fi); fi.connect(gi); gi.connect(g); ri.start(0); }
    else if (nome === "Clique") { var rc = ruido(), fc = o.createBiquadFilter(), gc = o.createGain(); fc.type = "highpass"; fc.frequency.value = 2500; gc.gain.setValueAtTime(0.7, 0); gc.gain.exponentialRampToValueAtTime(0.0001, 0.05); rc.connect(fc); fc.connect(gc); gc.connect(g); rc.start(0); }
    else { var anim = nome === "Base animada", bpm = anim ? 112 : 76, b = 60 / bpm, acordes = anim ? [[220, 277.2, 329.6], [196, 246.9, 293.7], [174.6, 220, 261.6], [196, 246.9, 293.7]] : [[196, 246.9, 293.7], [164.8, 207.7, 246.9], [174.6, 220, 261.6], [146.8, 185, 220]];
      for (var t = 0, k = 0; t < dur - 0.1; t += b * 4, k++) { acordes[k % 4].forEach(function (fq) { tom("triangle", fq, 0, t, Math.min(b * 4, dur - t), 0.09); }); tom("sine", acordes[k % 4][0] / 2, 0, t, Math.min(b * 4, dur - t), 0.16);
        if (anim) for (var q = 0; q < 4 && t + q * b < dur - 0.2; q++) { tom("sine", 140, 45, t + q * b, 0.22, 0.5); tom("square", acordes[k % 4][(q + k) % 3] * 2, 0, t + q * b + b / 2, 0.12, 0.035); } } }
    var rb = await o.startRendering(); return wav([rb.getChannelData(0)], sr);
  }
  async function porSom(i) { var s = SONS[i], id = "som-" + s[1].toLowerCase().replace(/\s+/g, "-"); if (!MID[id]) { var m = await porMidia(await sintetizar(s[1], s[2]), s[1], "audio", id, s[2]); m.som = s[0]; } return MID[id]; }

  /* ---------- clipes ---------- */
  function fimDaTrilha(tr) { return P.clips.filter(function (c) { return c.trilha === tr; }).reduce(function (m, c) { return Math.max(m, c.ini + c.dur); }, 0); }
  function addClip(m, trilha, em) {
    var tr = trilha || (m.tipo === "audio" ? (m.som === "sfx" ? "a2" : "a1") : "v1");
    var c = {id: uid(), trilha: tr, tipo: m.tipo, mid: m.id, ini: em != null ? Math.max(0, Math.round(em * 20) / 20) : tr === "a2" || tr === "v2" ? Math.round(T * 10) / 10 : fimDaTrilha(tr), dur: Math.round(Math.min(m.dur, m.tipo === "imagem" ? 4 : 600) * 100) / 100, corte: 0, vel: 1, vol: 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: 0, encaixe: m.id.indexOf("pe-") === 0 ? "caber" : "cobrir"};
    if (!livreEm(c.trilha, c.ini, c.dur, null)) { if (fam(c.trilha) === "a") c.trilha = novaTrilha("a"); else c.trilha = trilhaTopo(fam(c.trilha), c.ini, c.dur); }   /* em cima de outro take = camada nova (vídeo/foto: acima de tudo) */
    P.clips.push(c); SEL = c.id; tudo(); return c;
  }
  function trilhaTopo(f, ini, dur) { var l = pilha(), topo = l[l.length - 1]; if (fam(topo) === f && livreEm(topo, ini, dur, null)) return topo; var id = novaTrilha(f); P.pilha = l.concat(id); return id; }   /* a de cima se estiver livre ali; senão, camada nova ACIMA de tudo */
  function addTexto(em) { em = em || {}; var c = {id: uid(), trilha: "tx", tipo: "texto", ini: Math.round((em.t != null ? em.t : T) * 10) / 10, dur: 3, txt: "Seu texto", fonte: "Montserrat", tam: 6, cor: "#ffffff", fundo: "", x: em.x != null ? em.x : 0, y: em.y != null ? em.y : 30, op: 100, fin: 0.3, fout: 0.3}; c.trilha = trilhaTopo("t", c.ini, c.dur); P.clips.push(c); SEL = c.id; tudo(); return c; }
  function sel() { return P.clips.filter(function (c) { return c.id === SEL; })[0] || null; }
  function vel(c) { return +c.vel > 0 ? +c.vel : 1; }
  // corta o clipe c no tempo t (devolve a 2ª parte); a lâmina (C), o Ctrl+K e o ✂ DIVIDIR usam esta
  function dividirEm(c, t) { t = Math.round(t * 20) / 20; if (!c || t <= c.ini + 0.05 || t >= c.ini + c.dur - 0.05) return null;
    var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = t; d.dur = Math.round((c.ini + c.dur - t) * 100) / 100; if (c.tipo !== "texto" && c.tipo !== "imagem") d.corte = (c.corte || 0) + (t - c.ini) * vel(c); d.fin = 0; d.trans = null; c.dur = Math.round((t - c.ini) * 100) / 100; c.fout = 0; P.clips.push(d); return d; }
  function dividir() { var c = sel(), alvos = c ? [c] : P.clips.filter(function (x) { return T > x.ini + 0.05 && T < x.ini + x.dur - 0.05; });
    var n = 0, ult = null; alvos.forEach(function (x) { var d = dividirEm(x, T); if (d) { n++; ult = d; } });
    if (!n) { aviso("Ponha a agulha em cima de um clipe para dividir", true); return; } if (ult) SEL = ult.id; tudo(); aviso("✂ Dividido" + (n > 1 ? " em " + n + " camadas" : "") + "."); }
  function duplicar() { var g = grupo(); if (g.length) { var a0 = Math.min.apply(null, g.map(function (x) { return x.ini; })), a1 = Math.max.apply(null, g.map(function (x) { return x.ini + x.dur; })), nv = [];
      g.forEach(function (x) { var d = JSON.parse(JSON.stringify(x)); d.id = uid(); d.ini = Math.round((x.ini + a1 - a0) * 20) / 20; P.clips.push(d); nv.push(d.id); }); GRUPO = nv; SEL = nv[0]; tudo(); aviso("⧉ " + nv.length + " takes duplicados."); return; }
    var c = sel(); if (!c) return; var d = JSON.parse(JSON.stringify(c)); d.id = uid(); d.ini = c.ini + c.dur; P.clips.push(d); SEL = d.id; tudo(); aviso("⧉ Duplicado."); }
  function apagar(juntar) { var g = grupo(); if (g.length) { g.forEach(function (x) { soltarEl(x.id); }); P.clips = P.clips.filter(function (x) { return g.indexOf(x) < 0; }); GRUPO = []; SEL = null; tudo(); aviso("🗑 " + g.length + " takes apagados."); return; }
    var c = sel(); if (!c) return; soltarEl(c.id); P.clips = P.clips.filter(function (x) { return x !== c; });
    if (juntar) P.clips.forEach(function (x) { if (x.trilha === c.trilha && x.ini >= c.ini + c.dur - 0.01) x.ini = Math.max(0, Math.round((x.ini - c.dur) * 100) / 100); });
    SEL = null; tudo(); aviso(juntar ? "🗑 Apagado e o espaço fechado." : "🗑 Apagado."); }
  /* SELEÇÃO DE VÁRIOS TAKES (dono, 23/11): no PC, clicar no vazio da linha do tempo e arrastar abre o LAÇO; Ctrl/Shift + clique põe/tira um take.
     GRUPO = ids; SEL continua sendo "o take dos AJUSTES". Mover, apagar, duplicar e copiar valem para o grupo inteiro. */
  var GRUPO = [];
  function grupo() { GRUPO = GRUPO.filter(function (id) { return P.clips.some(function (x) { return x.id === id; }); }); return GRUPO.length > 1 ? P.clips.filter(function (x) { return GRUPO.indexOf(x.id) >= 0; }) : []; }
  function limparGrupo() { if (!GRUPO.length) return; GRUPO = []; $("veFaixas").querySelectorAll(".ve-clip.multi").forEach(function (x) { x.classList.remove("multi"); }); }
  function marcarGrupo() { $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("multi", GRUPO.length > 1 && GRUPO.indexOf(x.dataset.clip) >= 0); }); }
  var COPIA = null;
  function copiar() { var g = grupo(); if (g.length) { COPIA = JSON.parse(JSON.stringify(g)); aviso(g.length + " takes copiados. Ctrl+V cola na agulha."); return; }
    var c = sel(); if (!c) return false; COPIA = JSON.parse(JSON.stringify(c)); aviso("Copiado. Ctrl+V cola na agulha."); }
  function colar() { if (!COPIA) { aviso("Nada copiado ainda (Ctrl+C num clipe).", true); return; } if (Array.isArray(COPIA)) { var b0 = Math.min.apply(null, COPIA.map(function (x) { return x.ini; })), nv = []; COPIA.forEach(function (x) { var k = JSON.parse(JSON.stringify(x)); k.id = uid(); k.ini = Math.round((T + x.ini - b0) * 20) / 20; P.clips.push(k); nv.push(k.id); }); GRUPO = nv; SEL = nv[0]; tudo(); aviso(nv.length + " takes colados na agulha."); return; }
    var d = JSON.parse(JSON.stringify(COPIA)); d.id = uid(); d.ini = Math.round(T * 20) / 20; P.clips.push(d); SEL = d.id; tudo(); aviso("Colado na agulha."); }
  /* COPIAR E COLAR AJUSTES (atributos) de um take em outro: cada grupo só entra onde faz sentido (som em quem tem som, imagem em quem tem imagem) */
  var ATRIB = null, AT_VIS = ["ia", "grade", "op", "esc", "x", "y", "encaixe", "efeito", "efInt", "ck", "ckCor", "ckModo", "ckNivel", "ckInt", "ckSuave", "ckLimpa", "ckSombra"], AT_TXT = ["fonte", "tam", "cor", "fundo", "op"], AT_SOM = ["vol", "normG", "ruido", "voz"], AT_TEMPO = ["fin", "fout"];
  function temSom(c) { return c.tipo === "video" || c.tipo === "audio"; }
  function temImg(c) { return c.tipo === "video" || c.tipo === "imagem"; }
  function copiarAtrib() { var c = sel(); if (!c) return false; ATRIB = JSON.parse(JSON.stringify(c)); aviso("Ajustes copiados. Escolha outro take e use COLAR AJUSTES (Ctrl+Shift+V)."); }
  function colarAtrib() { var c = sel(); if (!c) return false; if (!ATRIB) { aviso("Nenhum ajuste copiado ainda (botão direito no take › Copiar ajustes).", true); return; }
    var ks = AT_TEMPO.slice(), o = ATRIB, oq = [];
    if (temImg(c) && temImg(o)) { ks = ks.concat(AT_VIS); oq.push("imagem"); } if (c.tipo === "texto" && o.tipo === "texto") { ks = ks.concat(AT_TXT); oq.push("texto"); } if (temSom(c) && temSom(o)) { ks = ks.concat(AT_SOM); oq.push("som"); }
    ks.forEach(function (k) { if (o[k] === undefined) delete c[k]; else c[k] = JSON.parse(JSON.stringify(o[k])); }); oq.push("entrada/saída suave");
    tudo(); aviso("Ajustes colados: " + oq.join(", ") + "."); }
  function ligarDesligar() { var c = sel(); if (!c) return false; c.off = c.off ? 0 : 1; tudo(); aviso(c.off ? "Take desativado: fica na linha do tempo, mas não aparece nem toca." : "Take ativado de novo."); }
  /* APARAR ATÉ A AGULHA (Q = tira o começo, W = tira o fim), como no Premiere/CapCut; fechar = puxa o resto para cá */
  function aparar(lado) { var c = sel(), alvos = c ? [c] : P.clips.filter(function (x) { return T > x.ini + 0.05 && T < x.ini + x.dur - 0.05; }), n = 0;
    alvos.forEach(function (x) { var ini0 = x.ini, d = dividirEm(x, T); if (!d) return; n++; var fora = lado === "ini" ? x : d, fica = lado === "ini" ? d : x;
      if (lado === "ini") { fica.fin = x.fin || 0; fica.trans = x.trans || null; fica.ini = ini0; var corte = Math.round((T - ini0) * 100) / 100; P.clips.forEach(function (y) { if (y !== fica && y !== fora && y.trilha === fica.trilha && y.ini >= T - 0.01) y.ini = Math.max(0, Math.round((y.ini - corte) * 100) / 100); }); }
      soltarEl(fora.id); P.clips = P.clips.filter(function (y) { return y !== fora; }); if (SEL === fora.id || !SEL) SEL = fica.id; });
    if (!n) { aviso("Ponha a agulha no meio de um take para aparar.", true); return; } if (lado === "ini") irPara(alvos[0].ini); tudo(); aviso(lado === "ini" ? "⇤ Começo cortado até a agulha (o resto veio junto)." : "⇥ Fim cortado na agulha."); }
  function abrirSom() { abrirGrupo("ve-som"); }
  function abrirGrupo(chave) { var c = sel(); if (!c) return; if (window.__veVista && __veVista.mostrar) __veVista.mostrar("dir"); var h = document.querySelector('#vePropCorpo [data-seta="' + chave + '"]'); if (h) { var corpo = h.nextElementSibling; if (corpo && !corpo.offsetParent) h.click(); h.scrollIntoView({block: "nearest"}); } }
  function maxDur(c) { var m = MID[c.mid]; return c.tipo === "video" || c.tipo === "audio" ? Math.max(0.2, ((m ? m.dur : c.dur) - (c.corte || 0)) / vel(c)) : 600; }
  function mudarVel(c, v) { var a = vel(c); c.vel = v; c.dur = Math.round(Math.min(c.dur * a / v, maxDur(c)) * 100) / 100; tudo(); aviso("Velocidade " + String(v).replace(".", ",") + "×" + (v < 1 ? " (câmera lenta)" : v > 1 ? " (acelerado)" : "") + "."); }
  // CONGELAR QUADRO (CapCut): a imagem do quadro da agulha vira um clipe parado de 2 s e o resto do clipe vem depois
  async function congelar() { var c = sel(); if (!c || c.tipo !== "video") { aviso("Escolha um clipe de VÍDEO e ponha a agulha no ponto que quer congelar.", true); return; }
    if (T < c.ini || T > c.ini + c.dur) irPara(c.ini + 0.05); var o = elDe(c); if (!o || o.e.readyState < 2) { aviso("O vídeo ainda está carregando — tente de novo.", true); return; }
    var k = document.createElement("canvas"); k.width = o.e.videoWidth; k.height = o.e.videoHeight; k.getContext("2d").drawImage(o.e, 0, 0);
    var blob = await new Promise(function (ok) { k.toBlob(ok, "image/jpeg", 0.92); }); if (!blob) return;
    var m = await porMidia(blob, "Quadro congelado " + fmtT(T), "imagem"), t = T, d = dividirEm(c, t), dur = 2;
    P.clips.forEach(function (x) { if (x.trilha === c.trilha && x.ini >= t - 0.01 && x !== c) x.ini = Math.round((x.ini + dur) * 100) / 100; });
    var f = {id: uid(), trilha: c.trilha, tipo: "imagem", mid: m.id, ini: t, dur: dur, corte: 0, vel: 1, vol: 100, op: c.op, esc: c.esc, x: c.x, y: c.y, fin: 0, fout: 0, encaixe: c.encaixe || "cobrir"};
    P.clips.push(f); SEL = f.id; desenharLib(); tudo(); aviso("❄ Quadro congelado por 2 s" + (d ? " (o vídeo continua depois)" : "") + "."); }
  // SUBSTITUIR a mídia do clipe (mantém o lugar, o tempo e os ajustes)
  var TROCAR = null;
  function substituir(c) { if (!c || c.tipo === "texto") return; TROCAR = c.id; var i = $("veArqTroca"); i.accept = c.tipo === "audio" ? "audio/*" : "video/*,image/*"; i.click(); }
  async function substituirCom(f) { var c = P.clips.filter(function (x) { return x.id === TROCAR; })[0]; TROCAR = null; if (!c || !f) return; var t = tipoDe(f);
    if (!t || (c.tipo === "audio") !== (t === "audio")) { aviso("Esse arquivo não serve para este clipe (" + (c.tipo === "audio" ? "precisa ser um som" : "precisa ser vídeo ou imagem") + ").", true); return; }
    var m = await porMidia(new Blob([await f.arrayBuffer()], {type: f.type}), f.name, t); soltarEl(c.id); c.mid = m.id; c.tipo = t; c.corte = 0; c.dur = Math.min(c.dur, maxDur(c)); desenharLib(); tudo(); aviso("Mídia trocada — o clipe ficou no mesmo lugar."); }

  /* ---------- prévia ---------- */
  var ACTX = null, MESTRE = null, DEST = null;
  function audioCtx() { if (ACTX) return ACTX; var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ACTX = new C(); MESTRE = ACTX.createGain(); MESTRE.connect(ACTX.destination); DEST = ACTX.createMediaStreamDestination(); MESTRE.connect(DEST); Object.keys(EL).forEach(function (k) { ligarSom(EL[k]); }); return ACTX; }
  /* cada take com som passa por: corta-grave (zumbido) → corta-agudo (chiado) → presença da voz → compressor → volume → mestre.
     Desligado, cada filtro fica neutro. A exportação grava o MESMO som (MESTRE → DEST), então o que se ouve é o que sai. */
  function ligarSom(o) { if (!ACTX || o.g || !o.e || o.semSom) return; try { var s = ACTX.createMediaElementSource(o.e);
      o.hp = ACTX.createBiquadFilter(); o.hp.type = "highpass"; o.hp.frequency.value = 10; o.lp = ACTX.createBiquadFilter(); o.lp.type = "lowpass"; o.lp.frequency.value = 20000;
      o.pk = ACTX.createBiquadFilter(); o.pk.type = "peaking"; o.pk.frequency.value = 3000; o.pk.Q.value = 0.9; o.pk.gain.value = 0;
      o.cp = ACTX.createDynamicsCompressor(); o.cp.threshold.value = 0; o.cp.ratio.value = 1; o.cp.attack.value = 0.005; o.cp.release.value = 0.2; o.cp.knee.value = 6;
      o.g = ACTX.createGain(); s.connect(o.hp); o.hp.connect(o.lp); o.lp.connect(o.pk); o.pk.connect(o.cp); o.cp.connect(o.g); o.g.connect(MESTRE); o.fx = ""; } catch (e) { o.semSom = true; } }
  var RUIDO = {0: [10, 20000], 1: [80, 14000], 2: [120, 10000], 3: [170, 7000]};
  function filtrosSom(o, c) { var chave = (c.ruido || 0) + "|" + (c.voz ? 1 : 0); if (!o.hp || o.fx === chave) return; o.fx = chave; var r = RUIDO[c.ruido || 0] || RUIDO[0], t = ACTX.currentTime;
    o.hp.frequency.setTargetAtTime(r[0], t, 0.02); o.lp.frequency.setTargetAtTime(r[1], t, 0.02); o.pk.gain.setTargetAtTime(c.voz ? 4 : 0, t, 0.02);
    o.cp.threshold.setTargetAtTime(c.voz ? -24 : 0, t, 0.02); o.cp.ratio.setTargetAtTime(c.voz ? 3 : 1, t, 0.02); }
  var ONDA = {}, ONDA_MAX = 200 * 1048576;
  function analisar(m) { if (!m || !m.blob || (m.tipo !== "audio" && m.tipo !== "video")) return Promise.resolve(null); if (ONDA[m.id]) return ONDA[m.id];
    if (m.blob.size > ONDA_MAX) { ONDA[m.id] = Promise.resolve(null); return ONDA[m.id]; }
    ONDA[m.id] = m.blob.arrayBuffer().then(function (ab) { var C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null; var oc = new C(1, 1, 44100);
      return new Promise(function (ok) { var feito = false, fim = function (b) { if (!feito) { feito = true; ok(b || null); } }; try { var pr = oc.decodeAudioData(ab, fim, function () { fim(null); }); if (pr && pr.then) pr.then(fim, function () { fim(null); }); } catch (e) { fim(null); } }); })
      .then(function (buf) { if (!buf || !buf.length) return null; var n = buf.numberOfChannels, L = buf.length, sr = buf.sampleRate, canais = []; for (var k = 0; k < n; k++) canais.push(buf.getChannelData(k));
        var por = Math.max(1, Math.floor(sr / 100)), N = Math.ceil(L / por), pico = new Float32Array(N), rms = new Float32Array(N);
        for (var i = 0; i < N; i++) { var a = i * por, b = Math.min(L, a + por), mx = 0, sq = 0; for (var j = a; j < b; j++) { var v = 0; for (var q = 0; q < n; q++) v += canais[q][j]; v /= n; var av = v < 0 ? -v : v; if (av > mx) mx = av; sq += v * v; } pico[i] = mx; rms[i] = Math.sqrt(sq / Math.max(1, b - a)); }
        var res = {pico: pico, rms: rms, passo: por / sr, dur: L / sr}; res.img = imagemOnda(res); return res; }, function () { return null; });
    return ONDA[m.id]; }
  function imagemOnda(o) { try { var W = Math.min(4000, Math.max(200, Math.round(o.dur * 40))), H = 40, k = document.createElement("canvas"); k.width = W; k.height = H; var x = k.getContext("2d"); x.fillStyle = "rgba(255,255,255,.55)";
      var por = o.pico.length / W; for (var i = 0; i < W; i++) { var a = Math.floor(i * por), b = Math.max(a + 1, Math.floor((i + 1) * por)), mx = 0; for (var j = a; j < b && j < o.pico.length; j++) if (o.pico[j] > mx) mx = o.pico[j]; var h = Math.max(1, Math.min(1, mx) * (H - 2)); x.fillRect(i, (H - h) / 2, 1, h); }
      return k.toDataURL("image/png"); } catch (e) { return ""; } }
  /* NORMALIZAR: leva o trecho usado do take a um volume médio padrão (≈ −16 dBFS RMS) sem deixar o pico passar de −1 dBFS */
  function normalizar(c) { var m = MID[c.mid]; if (!m) return; aviso("Medindo o som do take…");
    analisar(m).then(function (o) { if (!o) { aviso("Não consegui ler o som deste arquivo" + (m.blob && m.blob.size > ONDA_MAX ? " (arquivo muito grande para medir no aparelho)" : "") + ".", true); return; }
      var a = Math.floor((c.corte || 0) / o.passo), b = Math.min(o.rms.length, Math.ceil(((c.corte || 0) + c.dur * vel(c)) / o.passo)), sq = 0, n = 0, pk = 0;
      for (var i = a; i < b; i++) { if (o.rms[i] > 0.003) { sq += o.rms[i] * o.rms[i]; n++; } if (o.pico[i] > pk) pk = o.pico[i]; }
      if (!n || pk < 1e-4) { aviso("Este trecho está em silêncio — nada para normalizar.", true); return; }
      var rms = Math.sqrt(sq / n), alvo = Math.pow(10, -16 / 20), gg = alvo / rms, teto = Math.pow(10, -1 / 20) / pk; gg = lim(Math.min(gg, teto), 0.1, 8);
      c.normG = Math.round(gg * 1000) / 1000; tudo(); aviso("🔊 Normalizado: " + (gg >= 1 ? "+" : "") + (20 * Math.log10(gg)).toFixed(1).replace(".", ",") + " dB neste take" + (gg === teto ? " (limitado para não estourar)" : "") + "."); }); }
  function dbDe(c) { var v = c.vol == null ? 100 : c.vol; return v <= 0 ? -40 : Math.round(20 * Math.log10(v / 100) * 2) / 2; }
  /* EXTRAIR ÁUDIO: o som do vídeo vira um take próprio na camada TRILHA (mesmo trecho) e o vídeo fica mudo */
  function extrairAudio(c) { if (!c || c.tipo !== "video") return; var trilha = P.clips.some(function (x) { return x.trilha === "a1" && x.ini < c.ini + c.dur - 0.01 && x.ini + x.dur > c.ini + 0.01; }) ? "a2" : "a1";
    var a = {id: uid(), trilha: trilha, tipo: "audio", mid: c.mid, ini: c.ini, dur: c.dur, corte: c.corte || 0, vel: vel(c), vol: c.vol == null ? 100 : c.vol, fin: c.fin || 0, fout: c.fout || 0, ruido: c.ruido || 0, voz: c.voz || 0, normG: c.normG};
    c.vol = 0; P.clips.push(a); SEL = a.id; tudo(); aviso("🎵 Áudio extraído para a camada " + (trilha === "a1" ? "TRILHA" : "EFEITOS") + " — o vídeo ficou mudo."); }
  /* ---------- MODELOS (21/11): espaços para trocar pelo take do usuário ---------- */
  function melhorCorte(m, dur, k) { if (m.tipo !== "video") return 0; var md = m.dur || 0; if (md >= dur + 8) return Math.min(md - dur, 4 + (k || 0) * dur); return Math.max(0, (md - dur) / 2); }
  function trocarEspaco(c, m, k, semAviso) { soltarEl(c.id); c.mid = m.id; c.tipo = m.tipo; c.corte = Math.round(melhorCorte(m, c.dur, k) * 100) / 100;
    if (m.tipo === "video" && (m.dur || 0) < c.dur) c.vel = Math.max(0.5, Math.round((m.dur / c.dur) * 100) / 100); else c.vel = c.velModelo || 1;
    if (c.vol == null || c.vol === 100) c.vol = c.volModelo == null ? 0 : c.volModelo; delete c.ph;
    var prox = P.clips.filter(function (x) { return x.ph; }).sort(function (a, b) { return a.ini - b.ini; })[0]; SEL = prox ? prox.id : c.id;
    tudo(); if (!semAviso) aviso(prox ? "✓ Take colocado. Agora o espaço " + prox.ph + " (" + (prox.rot || "") + ") — toque em outro vídeo ou foto." : "✓ Todos os espaços do modelo preenchidos!"); if (window.VEModelos) VEModelos.faixa(); }
  function preencherSozinho() { var vazios = P.clips.filter(function (x) { return x.ph; }).sort(function (a, b) { return a.ini - b.ini; });
    var meus = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return (m.tipo === "video" || m.tipo === "imagem") && !m.ph && m.id.indexOf("ph-") !== 0; });
    if (!vazios.length) { aviso("Não há espaços vazios no projeto."); return 0; } if (!meus.length) { aviso("Importe seus vídeos e fotos primeiro (＋ IMPORTAR)", true); return 0; }
    var uso = {}; vazios.forEach(function (c, i) { var m = meus[i % meus.length]; uso[m.id] = (uso[m.id] || 0); trocarEspaco(c, m, uso[m.id]++, true); });
    SEL = null; tudo(); aviso("⚡ " + vazios.length + " espaços preenchidos com " + meus.length + " arquivo(s). Toque num take para trocar por outro."); if (window.VEModelos) VEModelos.faixa(); return vazios.length; }
  var ANALISANDO = {};
  /* ANALISAR PESSOA: roda a IA no take inteiro (no aparelho) e guarda as máscaras; a tela continua usável enquanto isso */
  async function analisarPessoa(c) { var m = MID[c.mid]; if (!m || !window.BWMascara) return; if (ANALISANDO[m.id] != null) return;
    ANALISANDO[m.id] = 0; desenharProp(); aviso("🧠 Analisando a pessoa no take (no aparelho)…");
    try { await BWMascara.analisar(m, {aoAndar: function (p) { ANALISANDO[m.id] = p; var e = $("veIaProg"); if (e) e.textContent = Math.round(p * 100) + "%"; }});
      delete ANALISANDO[m.id]; c.ia = c.ia || {}; if (c.ia.frente == null) c.ia.frente = true; tudo(); aviso("✓ Pessoa encontrada — já pode pôr texto atrás dela"); }
    catch (e) { delete ANALISANDO[m.id]; desenharProp(); aviso(/cancel/.test(String(e && e.message)) ? "Análise cancelada." : "Não consegui analisar este take" + (navigator.onLine ? "" : " (sem internet: a 1ª vez precisa baixar o modelo)") + ".", true); } }
  function ganhoTake(c) { return (c.vol == null ? 100 : c.vol) / 100 * (+c.normG > 0 ? +c.normG : 1); }
  function elDe(c) { var o = EL[c.id]; if (o) return o; var m = MID[c.mid]; if (!m) return null; var e = document.createElement(c.tipo === "video" ? "video" : "audio"); e.preload = "auto"; e.playsInline = true; e.crossOrigin = "anonymous"; e.src = urlDe(m); e.addEventListener("seeked", function () { if (!TOCANDO) desenhar(); }); e.addEventListener("loadeddata", function () { if (!TOCANDO) desenhar(); }); o = EL[c.id] = {e: e, g: null, px: e.src !== m.url}; ligarSom(o); return o; }
  function soltarEl(id) { var o = EL[id]; if (!o) return; try { o.e.pause(); o.e.removeAttribute("src"); o.e.load(); } catch (e) {} delete EL[id]; }
  function fade(c, t) { if (c.off) return 0; var a = 1, r = t - c.ini, f = c.ini + c.dur - t; if (c.fin > 0 && r < c.fin) a = Math.min(a, r / c.fin); if (c.fout > 0 && f < c.fout) a = Math.min(a, f / c.fout); return lim(a, 0, 1); }
  function sincronizar(c, t, ativo) {
    var o = elDe(c); if (!o) return null; var e = o.e;
    if (!ativo) { if (!e.paused) e.pause(); return o; }
    var alvo = (c.corte || 0) + (t - c.ini) * vel(c), v = lim(ganhoTake(c) * fade(c, t), 0, 4);
    if (o.g) { o.g.gain.value = v; e.volume = 1; filtrosSom(o, c); } else e.volume = Math.min(1, v);
    if (Math.abs(e.playbackRate - vel(c)) > 0.001) { try { e.playbackRate = vel(c); e.preservesPitch = true; } catch (x) {} }
    if (TOCANDO) { if (c.tipo === "video" && (e.seeking || e.readyState < 3)) ESPERA = true; if (e.paused) { try { e.currentTime = alvo; } catch (x) {} var pr = e.play(); if (pr && pr.catch) pr.catch(function () {}); } else if (Math.abs(e.currentTime - alvo) > (IOS ? 0.6 : 0.35) * vel(c)) { try { e.currentTime = alvo; } catch (x) {} } }
    else { if (!e.paused) e.pause(); if (Math.abs(e.currentTime - alvo) > 0.04) { if (window.__veRaspa && e.seeking) return o;   /* 23/11 (iPhone travando ao arrastar a linha do tempo): não empilhar pulos — o "seeked" redesenha e pede o ponto mais novo */ try { e.currentTime = alvo; } catch (x) {} } }
    return o;
  }
  /* camada de efeito (fora da tela): a mídia é desenhada aqui, recebe o efeito por modos de mistura e volta por cima com a intensidade escolhida */
  var EF = null, EF2 = null, GRAO = null, SEM_CK = false, PEGAR_CK = false;
  function tela2(k, W, H) { if (!k) k = document.createElement("canvas"); if (k.width !== W || k.height !== H) { k.width = W; k.height = H; } return k; }
  function comEfeito(fonte, x, y, w, h, c, t) {
    var W = cv.width, H = cv.height; EF = tela2(EF, W, H); var o = EF.getContext("2d"); o.setTransform(1, 0, 0, 1, 0, 0); o.globalAlpha = 1; o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, W, H); o.drawImage(fonte, x, y, w, h);
    var mix = function (op, cor, a) { o.globalCompositeOperation = op; o.globalAlpha = a == null ? 1 : a; o.fillStyle = cor; o.fillRect(0, 0, W, H); o.globalAlpha = 1; };
    var copia = function () { EF2 = tela2(EF2, W, H); var q = EF2.getContext("2d"); q.globalCompositeOperation = "copy"; q.drawImage(EF, 0, 0); return EF2; };
    var vinheta = function (f) { var g = o.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.55); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + f + ")"); o.globalCompositeOperation = "source-atop"; o.fillStyle = g; o.fillRect(0, 0, W, H); };
    switch (c.efeito) {
      case "pb": mix("saturation", "#808080"); mix("overlay", "#808080", 0); break;
      case "sepia": mix("saturation", "#808080"); mix("color", "#a8743c", 0.85); break;
      case "vintage": mix("saturation", "#808080", 0.55); mix("color", "#b07d4a", 0.45); mix("multiply", "#f3e2c3", 0.6); vinheta(0.55); break;
      case "quente": mix("soft-light", "#ff8a2a", 0.85); break;
      case "desbotado": mix("saturation", "#808080", 0.45); mix("screen", "#2a2a30", 0.5); break;
      case "dourado": mix("soft-light", "#ffb84a", 0.9); mix("multiply", "#fff0d0", 0.5); break;
      case "azulado": mix("soft-light", "#1f8fa8", 0.7); mix("overlay", "#ff9a4a", 0.22); break;
      case "rosado": mix("soft-light", "#ff6fa5", 0.7); break;
      case "cinema": mix("soft-light", "#16808f", 0.55); mix("overlay", "#ff8f3a", 0.18); o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.3; o.drawImage(copia(), 0, 0); vinheta(0.45); break;
      case "duotom": mix("saturation", "#808080"); mix("multiply", "#ff5fa2", 0.9); mix("screen", "#2b2f9a", 0.8); break;
      case "frio": mix("soft-light", "#2a8aff", 0.85); break;
      case "vivido": mix("saturation", "#ff0000", 0.35); o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.35; o.drawImage(copia(), 0, 0); break;
      case "contraste": o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.75; o.drawImage(copia(), 0, 0); break;
      case "noite": mix("saturation", "#808080", 0.5); mix("multiply", "#2b3a8a", 0.75); vinheta(0.5); break;
      case "vinheta": vinheta(0.75); break;
      case "grao": if (!GRAO) { GRAO = document.createElement("canvas"); GRAO.width = GRAO.height = 128; var gx = GRAO.getContext("2d"), im = gx.createImageData(128, 128), sd = 7; for (var i = 0; i < im.data.length; i += 4) { sd = (sd * 16807) % 2147483647; var v = 128 + ((sd % 120) - 60); im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gx.putImageData(im, 0, 0); }
        o.globalCompositeOperation = "overlay"; o.globalAlpha = 0.55; var pat = o.createPattern(GRAO, "repeat"), dx = Math.floor(t * 30) * 37 % 128; o.translate(-dx, -dx * 0.7); o.fillStyle = pat; o.fillRect(dx, dx * 0.7, W, H); o.setTransform(1, 0, 0, 1, 0, 0); vinheta(0.3); break;
      case "vhs": var q2 = copia(), qx = q2.getContext("2d"); qx.globalCompositeOperation = "multiply"; qx.fillStyle = "#ff2a2a"; qx.fillRect(0, 0, W, H);
        o.globalCompositeOperation = "screen"; o.globalAlpha = 0.5; o.drawImage(q2, W * 0.008, 0); o.globalAlpha = 0.18; o.globalCompositeOperation = "source-atop"; o.fillStyle = "#000"; for (var yy = Math.floor(t * 60) % 4; yy < H; yy += 4) o.fillRect(0, yy, W, 1); break;
      case "desfoque": var pq = tela2(null, Math.max(8, Math.round(W / 12)), Math.max(8, Math.round(H / 12))), px2 = pq.getContext("2d"); px2.imageSmoothingQuality = "high"; px2.drawImage(EF, 0, 0, pq.width, pq.height);
        o.globalCompositeOperation = "source-atop"; o.imageSmoothingQuality = "high"; o.drawImage(pq, 0, 0, W, H); break;
    }
    o.globalAlpha = 1; o.globalCompositeOperation = "destination-in"; o.drawImage(fonte, x, y, w, h); o.globalCompositeOperation = "source-over";   /* só onde há mídia */
    return EF;
  }
  // mod (transições): a = opacidade extra, dx/dy (fração da tela), k = escala, r = giro, recorte(ctx, W, H)
  /* 22/11 23:30 (dono: "inserir um elemento — fogo — e rastrear na mão da pessoa; onde ela mexe ele acompanha; automático com modelos"):
     c.rastro = {alvo: id do take seguido, modo, ponto, mao, fps, fw, fh, pts, suave, tam (acompanhar o tamanho), s0}. A posição do item passa a ser
     o PONTO do take seguido + o deslocamento c.x/c.y (arrastar o item na prévia ajusta esse deslocamento). Tudo em fração: vale na prévia leve e no arquivo. */
  function rastroEm(c, t) { var r = c.rastro; if (!r || !r.pts || !r.pts.length || !window.BWRastreio) return null; var a = P.clips.filter(function (x) { return x.id === r.alvo; })[0]; if (!a) return null;
    var tm = a.tipo === "video" ? (a.corte || 0) + lim(t - a.ini, 0, a.dur) * vel(a) : 0, p = BWRastreio.em(r, tm, r.suave); if (!p) return null;
    var W = cv.width, H = cv.height, fw = r.fw || 1, fh = r.fh || 1, s = (a.encaixe === "caber" ? Math.min : Math.max)(W / fw, H / fh) * (a.esc || 100) / 100, w = fw * s, h = fh * s;
    var ax = (W - w) / 2 + (a.x || 0) / 100 * W, ay = (H - h) / 2 + (a.y || 0) / 100 * H;
    return {x: (ax + p.x * w - W / 2) / W * 100, y: (ay + p.y * h - H / 2) / H * 100, k: r.tam && r.s0 > 0 && p.s > 0 ? lim(p.s / r.s0, 0.25, 4) : 1}; }
  function comRastro(c, t, campoTam) { var rr = rastroEm(c, t); if (!rr) return c; var o = Object.create(c); o.x = rr.x + (c.x || 0); o.y = rr.y + (c.y || 0);
    if (campoTam === "tam") o.tam = (c.tam || 6) * rr.k; else o.esc = (c.esc || 100) * rr.k; return o; }
  /* ELEMENTOS ANIMADOS (desenho próprio, cada quadro só de t): fogo, faíscas, brilho, fumaça, coração, raio — bons para seguir a mão */
  var ELEMENTOS = {fogo: "🔥 Fogo", faiscas: "✨ Faíscas", brilho: "🌟 Brilho", fumaca: "💨 Fumaça", coracoes: "💖 Corações", raio: "⚡ Raio", bolhas: "🫧 Bolhas", estrelas: "⭐ Estrelas girando"};
  function sem(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function desenharElemento(c0, t) { var c = comRastro(c0, t), W = cv.width, H = cv.height, a = (c.op == null ? 100 : c.op) / 100 * fade(c0, t); if (a <= 0.001) return;
    var X = W / 2 + (c.x || 0) / 100 * W, Y = H / 2 + (c.y || 0) / 100 * H, R = Math.min(W, H) * 0.12 * (c.esc || 100) / 100, k = c0.el || "fogo", rel = t - c0.ini, cor = c0.cor || "";
    cx.save(); cx.globalAlpha = a;
    if (k === "fogo") { cx.globalCompositeOperation = "lighter"; for (var i = 0; i < 46; i++) { var per = 0.55 + sem(i) * 0.5, ph = ((rel / per) + sem(i + 9)) % 1, sx = (sem(i + 3) - 0.5) * R * 0.9 * (1 - ph * 0.6) + Math.sin(rel * 6 + i) * R * 0.08,
        sy = -ph * R * (1.6 + sem(i + 5)), rr = R * (0.42 - ph * 0.34) * (0.6 + sem(i + 7) * 0.6); if (rr <= 0) continue; var g = cx.createRadialGradient(X + sx, Y + sy, 0, X + sx, Y + sy, rr), q = 1 - ph;
        g.addColorStop(0, "rgba(255," + Math.round(240 - ph * 120) + "," + Math.round(160 - ph * 150) + "," + (0.55 * q) + ")"); g.addColorStop(0.5, "rgba(255," + Math.round(120 - ph * 80) + ",20," + (0.35 * q) + ")"); g.addColorStop(1, "rgba(200,30,0,0)");
        cx.fillStyle = g; cx.beginPath(); cx.arc(X + sx, Y + sy, rr, 0, 6.2832); cx.fill(); } }
    else if (k === "faiscas" || k === "estrelas") { cx.globalCompositeOperation = "lighter"; for (var j = 0; j < 36; j++) { var pj = 0.7 + sem(j) * 0.8, f = ((rel / pj) + sem(j + 2)) % 1, ang = sem(j + 4) * 6.2832 + (k === "estrelas" ? rel * 1.5 : 0), d = (k === "estrelas" ? R * (0.6 + sem(j) * 0.6) : f * R * 1.8), px = X + Math.cos(ang) * d, py = Y + Math.sin(ang) * d + (k === "faiscas" ? f * f * R * 0.8 : 0), sz = R * 0.07 * (k === "estrelas" ? 1.4 : (1 - f));
        cx.fillStyle = cor || (k === "estrelas" ? "#FFE680" : "rgba(255," + Math.round(220 - f * 100) + ",120," + (1 - f) + ")"); estrela(px, py, sz * (k === "estrelas" ? 1 + 0.4 * Math.sin(rel * 6 + j) : 1)); } }
    else if (k === "brilho") { cx.globalCompositeOperation = "lighter"; var pul = 0.8 + 0.2 * Math.sin(rel * 5), gb = cx.createRadialGradient(X, Y, 0, X, Y, R * 1.4 * pul); gb.addColorStop(0, cor || "rgba(255,250,220,0.95)"); gb.addColorStop(0.3, "rgba(255,220,120,0.45)"); gb.addColorStop(1, "rgba(255,200,80,0)");
      cx.fillStyle = gb; cx.beginPath(); cx.arc(X, Y, R * 1.4 * pul, 0, 6.2832); cx.fill(); cx.fillStyle = "rgba(255,255,255,0.9)"; cx.save(); cx.translate(X, Y); cx.rotate(rel * 0.6); estrela(0, 0, R * 0.9 * pul, true); cx.restore(); }
    else if (k === "fumaca") { for (var m = 0; m < 22; m++) { var pm = 1.6 + sem(m) * 1.2, fm = ((rel / pm) + sem(m + 1)) % 1, mx = X + (sem(m + 6) - 0.5) * R * 0.8 + Math.sin(rel + m) * R * 0.2 * fm, my = Y - fm * R * 2.4, mr = R * (0.25 + fm * 0.7);
        var gm = cx.createRadialGradient(mx, my, 0, mx, my, mr); gm.addColorStop(0, cor ? cor : "rgba(220,220,225," + (0.35 * (1 - fm)) + ")"); gm.addColorStop(1, "rgba(220,220,225,0)"); cx.fillStyle = gm; cx.beginPath(); cx.arc(mx, my, mr, 0, 6.2832); cx.fill(); } }
    else if (k === "coracoes" || k === "bolhas") { for (var h = 0; h < 14; h++) { var ph2 = 1.4 + sem(h) * 1, f2 = ((rel / ph2) + sem(h + 3)) % 1, hx = X + (sem(h + 8) - 0.5) * R * 1.4 + Math.sin(rel * 2 + h) * R * 0.15, hy = Y - f2 * R * 2.2, hs = R * (0.12 + sem(h + 2) * 0.1) * (0.6 + f2 * 0.6);
        cx.globalAlpha = a * (1 - f2) ; if (k === "coracoes") { cx.fillStyle = cor || "#FF4D8D"; coracao(hx, hy, hs); } else { cx.strokeStyle = cor || "rgba(200,235,255,0.9)"; cx.lineWidth = Math.max(1, hs * 0.12); cx.beginPath(); cx.arc(hx, hy, hs, 0, 6.2832); cx.stroke(); cx.fillStyle = "rgba(255,255,255,0.5)"; cx.beginPath(); cx.arc(hx - hs * 0.35, hy - hs * 0.35, hs * 0.2, 0, 6.2832); cx.fill(); } } }
    else if (k === "raio") { cx.globalCompositeOperation = "lighter"; cx.strokeStyle = cor || "#9FD7FF"; cx.shadowColor = cor || "#4DB2FF"; cx.shadowBlur = R * 0.3; cx.lineCap = "round"; var qd = Math.floor(rel * 14);
      for (var rz = 0; rz < 3; rz++) { cx.lineWidth = Math.max(1.5, R * (0.05 - rz * 0.012)); cx.beginPath(); var a0 = sem(qd * 7 + rz) * 6.2832, xx = X, yy = Y; cx.moveTo(xx, yy); for (var sg = 0; sg < 7; sg++) { a0 += (sem(qd * 13 + rz * 5 + sg) - 0.5) * 1.4; xx += Math.cos(a0) * R * 0.25; yy += Math.sin(a0) * R * 0.25; cx.lineTo(xx, yy); } cx.stroke(); } }
    cx.restore(); }
  function estrela(x, y, r, quatro) { var n = quatro ? 4 : 5; cx.beginPath(); for (var i = 0; i < n * 2; i++) { var rr = i % 2 ? r * (quatro ? 0.16 : 0.45) : r, an = i * Math.PI / n - Math.PI / 2; cx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } cx.closePath(); cx.fill(); }
  function coracao(x, y, s) { cx.beginPath(); cx.moveTo(x, y + s * 0.6); cx.bezierCurveTo(x - s * 1.2, y - s * 0.2, x - s * 0.5, y - s * 1.1, x, y - s * 0.4); cx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.2, y - s * 0.2, x, y + s * 0.6); cx.fill(); }
  function addElemento(k) { var c = {id: uid(), trilha: novaTrilha("v"), tipo: "elemento", el: k || "fogo", nome: ELEMENTOS[k || "fogo"], ini: Math.round(T * 10) / 10, dur: 4, x: 0, y: 0, esc: 100, op: 100, fin: 0.2, fout: 0.3};
    var livre = trilhas().map(function (x) { return x[0]; }).filter(function (id) { return fam(id) === "v" && livreEm(id, c.ini, c.dur, null) && numTr(id) > 1; })[0]; if (livre) c.trilha = livre;
    P.clips.push(c); SEL = c.id; tudo(); aviso(ELEMENTOS[c.el] + " na linha do tempo. Arraste na prévia, ou em SEGUIR UM PONTO faça ele acompanhar a mão."); return c; }
  var RASTREANDO = null, ESCOLHENDO_PT = null;
  async function rastrear(c, inicio) { var rs = c.rastro || {}, sAlvo = document.querySelector("[data-rsalvo]"), alvoId = (sAlvo && sAlvo.value) || rs.alvo;
    var a = P.clips.filter(function (x) { return x.id === alvoId; })[0] || P.clips.filter(function (x) { return x !== c && (x.tipo === "video" || x.tipo === "imagem") && x.ini < c.ini + c.dur && x.ini + x.dur > c.ini; })[0];
    if (!a || !window.BWRastreio) { aviso("Ponha o item por cima de um take para rastrear.", true); return; } var m = MID[a.mid]; if (!m) { aviso("O arquivo do take não está neste aparelho.", true); return; }
    RASTREANDO = {p: 0}; desenharProp(); var modo = rs.modo || "mao"; aviso(modo === "manual" ? "⌖ Acompanhando o ponto escolhido…" : "⌖ Procurando " + (modo === "mao" ? "a mão" : "o corpo") + " em cada quadro (no aparelho)…");
    try { var r = await BWRastreio.analisar(m, {modo: modo, ponto: rs.ponto, mao: rs.mao, inicio: inicio, aoAndar: function (p) { RASTREANDO.p = p; var e = $("veRsProg"); if (e) e.textContent = Math.round(p * 100) + "%"; }});
      RASTREANDO = null; c.rastro = Object.assign({}, rs, r, {alvo: a.id, suave: rs.suave == null ? 30 : rs.suave}); c.x = 0; c.y = 0;
      if (c.rastro.tam) { var p0 = BWRastreio.em(c.rastro, a.tipo === "video" ? (a.corte || 0) + lim(T - a.ini, 0, a.dur) * vel(a) : 0, c.rastro.suave); c.rastro.s0 = p0 && p0.s || 0; }
      tudo(); aviso("✓ Pronto: o item segue " + (modo === "manual" ? "o ponto" : modo === "mao" ? "a mão" : "o corpo") + (r.achou != null && r.achou < 0.6 ? " (achado em só " + Math.round(r.achou * 100) + "% dos quadros — confira)" : "") + ". Toque em ▶ para ver."); }
    catch (e) { RASTREANDO = null; desenharProp(); var msg = String(e && e.message || e);
      aviso(/cancel/.test(msg) ? "Rastreio cancelado." : /nao_achei/.test(msg) ? "Não achei " + (modo === "mao" ? "nenhuma mão" : modo === "corpo" ? "a pessoa" : "o ponto") + " neste take. Tente outro ponto ou o 🎯 Ponto que eu escolho." : "Não consegui rastrear" + (navigator.onLine ? "" : " (sem internet: a 1ª vez precisa baixar o modelo)") + ".", true); } }
  var SELDES = null, SMC = {};
  function caminhoSel(x, sm, w, h) { var p = sm.pts; x.beginPath();
    if ((sm.forma || "ret") === "livre") { p.forEach(function (q, i) { if (i) x.lineTo(q[0] * w, q[1] * h); else x.moveTo(q[0] * w, q[1] * h); }); x.closePath(); return; }
    var x0 = Math.min(p[0][0], p[p.length - 1][0]) * w, y0 = Math.min(p[0][1], p[p.length - 1][1]) * h, x1 = Math.max(p[0][0], p[p.length - 1][0]) * w, y1 = Math.max(p[0][1], p[p.length - 1][1]) * h;
    if (sm.forma === "elipse") x.ellipse((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, (x1 - x0) / 2), Math.max(1, (y1 - y0) / 2), 0, 0, Math.PI * 2); else x.rect(x0, y0, x1 - x0, y1 - y0); }
  function compSel(fonte, fw, fh, sm, modo) { var k = Math.min(1, 1280 / Math.max(fw, fh)), w = Math.max(2, Math.round(fw * k)), h = Math.max(2, Math.round(fh * k));
    var b = sm.borda == null ? 20 : sm.borda, red = 1 + b / 12, mw = Math.max(2, Math.round(w / red)), mh = Math.max(2, Math.round(h / red));
    var mc = SMC.m || (SMC.m = document.createElement("canvas")); mc.width = mw; mc.height = mh; var mx = mc.getContext("2d"); mx.clearRect(0, 0, mw, mh); mx.fillStyle = "#fff";
    caminhoSel(mx, sm, mw, mh); mx.fill(); if (sm.inv) { mx.globalCompositeOperation = "xor"; mx.fillRect(0, 0, mw, mh); mx.globalCompositeOperation = "source-over"; }
    var oc = SMC["o" + modo] || (SMC["o" + modo] = document.createElement("canvas")); oc.width = w; oc.height = h; var ox = oc.getContext("2d"); ox.clearRect(0, 0, w, h); ox.drawImage(fonte, 0, 0, w, h);
    ox.globalCompositeOperation = modo === "esconder" ? "destination-out" : "destination-in"; ox.imageSmoothingEnabled = true; ox.drawImage(mc, 0, 0, w, h); ox.globalCompositeOperation = "source-over"; return oc; }
  /* onde o take está na tela (para desenhar a seleção na prévia) */
  function caixaTake(c) { var f = fonteDe(c, T, true); if (!f || !f.w) return null; var W = cv.width, H = cv.height, s = (c.encaixe === "caber" ? Math.min : Math.max)(W / f.w, H / f.h) * (c.esc || 100) / 100, w = f.w * s, h = f.h * s;
    return {x: (W - w) / 2 + (c.x || 0) / 100 * W, y: (H - h) / 2 + (c.y || 0) / 100 * H, w: w, h: h}; }
  function desenharMidia(fonte, fw, fh, c, t, mod) {
    c = comRastro(c, t);
    if (!fw || !fh) return; mod = mod || {}; if (c.ck && !SEM_CK && window.BWChroma) { var semFundo = BWChroma.aplicar(fonte, fw, fh, c); if (semFundo) fonte = semFundo; }   /* chroma key: o fundo some antes de tudo */
    if (c.grade && !SEM_CK && window.BWCor && BWCor.ativo(c.grade)) { var comCor = BWCor.aplicar(fonte, fw, fh, c.grade); if (comCor) fonte = comCor; }   /* cor do take (BWCor), depois do recorte */
    if (c.ia && window.BWMascara && BWMascara.tem(c.mid) && (mod.soPessoa || (c.ia.fundo || ""))) { var mk = BWMascara.mascara(c.mid, c.tipo === "video" ? (c.corte || 0) + (t - c.ini) * vel(c) : 0);
      if (mk) fonte = BWMascara.compor(fonte, fw, fh, mk, c.ia, !!mod.soPessoa); }   /* pessoa e fundo (IA, no aparelho) */
    if (c.selm && c.selm.pts && c.selm.pts.length > 1 && SELDES !== c.id && (mod.soSel || (c.selm.modo && c.selm.modo !== "frente"))) fonte = compSel(fonte, fw, fh, c.selm, mod.soSel ? "so" : c.selm.modo);
    var W = cv.width, H = cv.height, s = (c.encaixe === "caber" ? Math.min : Math.max)(W / fw, H / fh) * (c.esc || 100) / 100, w = fw * s, h = fh * s;
    var a = (c.op == null ? 100 : c.op) / 100 * fade(c, t) * (mod.a == null ? 1 : mod.a); if (a <= 0.001) return;
    var x = (W - w) / 2 + (c.x || 0) / 100 * W, y = (H - h) / 2 + (c.y || 0) / 100 * H;
    cx.save(); if (mod.recorte) { cx.beginPath(); mod.recorte(cx, W, H); cx.clip(); }
    if (mod.dx || mod.dy || (mod.k && mod.k !== 1) || mod.r) { cx.translate(W / 2 + (mod.dx || 0) * W, H / 2 + (mod.dy || 0) * H); if (mod.r) cx.rotate(mod.r); if (mod.k) cx.scale(mod.k, mod.k); cx.translate(-W / 2, -H / 2); }
    var fonteFinal = fonte;
    if (mod.borrar) { var pq = tela2(null, Math.max(8, Math.round(W / (2 + mod.borrar))), Math.max(8, Math.round(H / (2 + mod.borrar)))), q = pq.getContext("2d"); q.drawImage(fonte, x * pq.width / W, y * pq.height / H, w * pq.width / W, h * pq.height / H); cx.globalAlpha = a; cx.drawImage(pq, 0, 0, W, H); cx.restore(); return; }
    cx.globalAlpha = a; cx.drawImage(fonteFinal, x, y, w, h);
    if (c.efeito && EFEITOS[c.efeito]) { var k = lim((c.efInt == null ? 85 : c.efInt) / 100, 0, 1); if (k > 0) { var e = comEfeito(fonte, x, y, w, h, c, t); cx.setTransform(1, 0, 0, 1, 0, 0); if (mod.recorte) { cx.restore(); cx.save(); cx.beginPath(); mod.recorte(cx, W, H); cx.clip(); } if (mod.dx || mod.dy || (mod.k && mod.k !== 1) || mod.r) { cx.translate(W / 2 + (mod.dx || 0) * W, H / 2 + (mod.dy || 0) * H); if (mod.r) cx.rotate(mod.r); if (mod.k) cx.scale(mod.k, mod.k); cx.translate(-W / 2, -H / 2); } cx.globalAlpha = a * k; cx.drawImage(e, 0, 0); } }
    cx.restore(); cx.globalAlpha = 1;
  }
  // como cada transição mexe no clipe que SAI (A) e no que ENTRA (B), p de 0 a 1
  var suave = function (p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  function modsTrans(tipo, p) {
    var e = suave(p), W2 = 0;
    switch (tipo) {
      case "preto": case "branco": return {A: {a: p < 0.5 ? 1 : 0}, B: {a: p < 0.5 ? 0 : 1}, cor: tipo === "preto" ? "#000" : "#fff", corA: 1 - Math.abs(p - 0.5) * 2};
      case "empurrar": return {A: {dx: -e}, B: {dx: 1 - e}};
      case "empurrar-d": return {A: {dx: e}, B: {dx: e - 1}};
      case "descer": return {A: {}, B: {dy: e - 1}};
      case "zoom-giro": return {A: {k: 1 + 0.5 * e, r: e * 0.35, a: 1 - e}, B: {k: 1.5 - 0.5 * e, r: -(1 - e) * 0.35, a: e}};
      case "cortina-v": return {A: {}, B: {recorte: function (x, W, H) { x.rect(0, 0, W, H * e + 1); }}};
      case "losango": return {A: {}, B: {recorte: function (x, W, H) { var d = (W + H) * 0.5 * e + 1; x.moveTo(W / 2, H / 2 - d); x.lineTo(W / 2 + d, H / 2); x.lineTo(W / 2, H / 2 + d); x.lineTo(W / 2 - d, H / 2); x.closePath(); }}};
      case "barras": return {A: {}, B: {recorte: function (x, W, H) { var n = 8, h = H / n; for (var i = 0; i < n; i++) x.rect(0, i * h, W, h * e + 1); }}};
      case "relogio": return {A: {}, B: {recorte: function (x, W, H) { x.moveTo(W / 2, H / 2); x.arc(W / 2, H / 2, Math.hypot(W, H), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e + 0.001); x.closePath(); }}};
      case "deslizar": return {A: {}, B: {dy: 1 - e}};
      case "zoom": return {A: {k: 1 + 0.35 * e, a: 1 - e}, B: {k: 1.35 - 0.35 * e, a: e}};
      case "zoom-saida": return {A: {k: 1 - 0.3 * e, a: 1 - e}, B: {k: 1.25 - 0.25 * e, a: e}};
      case "girar": return {A: {r: e * 0.5, k: 1 - 0.3 * e, a: 1 - e}, B: {r: -(1 - e) * 0.6, k: 0.6 + 0.4 * e, a: e}};
      case "cortina": return {A: {}, B: {recorte: function (x, W, H) { x.rect(W * (1 - e), 0, W * e + 1, H); }}};
      case "circulo": return {A: {}, B: {recorte: function (x, W, H) { x.arc(W / 2, H / 2, Math.hypot(W, H) / 2 * e + 1, 0, Math.PI * 2); }}};
      case "desfoque": return {A: {borrar: Math.round(e * 10), a: 1}, B: {borrar: Math.round((1 - e) * 10), a: e}};
      default: return {A: {}, B: {a: e}};   /* dissolver */
    }
  }
  function anteriorDe(c) { return P.clips.filter(function (x) { return x !== c && x.trilha === c.trilha && x.tipo !== "texto" && x.tipo !== "audio" && Math.abs(x.ini + x.dur - c.ini) < 0.08; })[0] || null; }
  function transDe(c) { return c.trans && TRANS[c.trans.tipo] ? Math.min(+c.trans.dur || 0.6, c.dur * 0.9) : 0; }
  var ease = function (p) { p = lim(p, 0, 1); return 1 - Math.pow(1 - p, 3); };
  /* ANEL: o texto dá a volta na pessoa; a metade de trás (parte "tras") sai antes dela, a da frente depois */
  function textoAnel(c, t, parte) {
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), rx = W * (c.raio || 38) / 100, ry = rx * 0.26, cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H;
    cx.save(); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var base = String(c.txt || "TEXTO").replace(/\n/g, " ").trim() + "  •  ", wb = cx.measureText(base).width, circ = Math.PI * (rx + ry) * 1.1, rep = Math.max(1, Math.round(circ / Math.max(1, wb))), txt = new Array(rep + 1).join(base), n = txt.length;
    var giro = (t - c.ini) * (c.velAnel == null ? 0.7 : c.velAnel), a0 = (c.op == null ? 100 : c.op) / 100 * fade(c, t);
    cx.fillStyle = c.cor || "#fff";
    for (var i = 0; i < n; i++) { var th = Math.PI / 2 + giro - i * (Math.PI * 2 / n), sn = Math.sin(th); if (parte === "tras" ? sn > 0 : sn <= 0) continue;
      var x = cxm + rx * Math.cos(th), y = cym + ry * sn, k = 0.82 + 0.28 * (sn + 1) / 2, sx = Math.max(0.18, Math.abs(sn)) * (sn < 0 ? -1 : 1);
      cx.save(); cx.globalAlpha = a0 * (sn < 0 ? 0.7 : 1); cx.translate(x, y); cx.scale(sx * k, k); cx.fillText(txt[i], 0, 0); cx.restore(); }
    cx.restore();
  }
  function desenharTexto(c, t, parte) {
    c = comRastro(c, t, "tam");
    if (c.anima === "anel") { textoAnel(c, t, parte || "tudo"); return; }
    var W = cv.width, H = cv.height, px = Math.max(10, H * (c.tam || 6) / 100), linhas = String(c.txt || "").split("\n"), lh = px * 1.18, rel = t - c.ini, dy = 0, dx = 0, esc2 = 1;
    if (c.anima === "maquina") { var nch = Math.floor(rel * 22), conta = 0; linhas = linhas.map(function (l) { var r = l.slice(0, Math.max(0, nch - conta)); conta += l.length; return r; }); }
    cx.save(); cx.globalAlpha = (c.op == null ? 100 : c.op) / 100 * fade(c, t); cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; cx.textAlign = "center"; cx.textBaseline = "middle";
    var cxm = W / 2 + (c.x || 0) / 100 * W, cym = H / 2 + (c.y || 0) / 100 * H, larg = Math.max.apply(0, linhas.map(function (l) { return cx.measureText(l).width; }).concat([0]));
    if (c.anima === "subir") dy = (1 - ease(rel / 0.9)) * H * 0.32; else if (c.anima === "descer") dy = -(1 - ease(rel / 0.9)) * H * 0.32;
    else if (c.anima === "zoom") esc2 = 0.55 + 0.45 * ease(rel / 0.7) + 0.02 * rel; else if (c.anima === "pulsar") esc2 = 1 + 0.06 * Math.sin(rel * 6.5);
    else if (c.anima === "letreiro") { var lx = Math.max(larg, W * 0.5); dx = (W / 2 + lx / 2) - (W + lx) * lim(rel / Math.max(0.5, c.dur), 0, 1); dx = dx - (cxm - W / 2); }
    if (dx || dy || esc2 !== 1) { cx.translate(cxm + dx, cym + dy); cx.scale(esc2, esc2); cx.translate(-cxm, -cym); }
    if (larg > W * 0.92 && c.anima !== "letreiro") { px = px * W * 0.92 / larg; lh = px * 1.18; cx.font = "800 " + px + "px " + (c.fonte || "Inter") + ", Inter, system-ui, sans-serif"; larg = W * 0.92; }   /* texto longo encolhe para caber na tela */
    if (c.fundo) { cx.fillStyle = c.fundo; var pd = px * 0.35; cx.beginPath(); if (cx.roundRect) cx.roundRect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2, px * 0.25); else cx.rect(cxm - larg / 2 - pd, cym - lh * linhas.length / 2 - pd * 0.6, larg + pd * 2, lh * linhas.length + pd * 1.2); cx.fill(); }
    else { cx.shadowColor = "rgba(0,0,0,.6)"; cx.shadowBlur = px * 0.18; cx.shadowOffsetY = px * 0.05; }
    cx.fillStyle = c.cor || "#fff"; linhas.forEach(function (l, i) { cx.fillText(l, cxm, cym + (i - (linhas.length - 1) / 2) * lh); }); cx.restore();
  }
  function fonteDe(c, t, ativo) { if (c.tipo === "imagem") { var m = MID[c.mid]; return m && m.img ? {el: m.img, w: m.img.naturalWidth, h: m.img.naturalHeight} : null; }
    var o = sincronizar(c, t, ativo); return o && c.tipo === "video" && o.e.readyState >= 2 ? {el: o.e, w: o.e.videoWidth, h: o.e.videoHeight} : null; }
  function desenhar() {
    var t = T, W = cv.width, H = cv.height, frente = []; cx.fillStyle = "#000"; cx.fillRect(0, 0, W, H);
    var ordemDes = pilha().slice();   /* de baixo para cima: a camada de cima é desenhada por último */
    ordemDes.concat(trilhas().map(function (x) { return x[0]; }).filter(function (id) { return fam(id) === "a"; })).forEach(function (tr) { var pintados = {};
      P.clips.forEach(function (c) { if (c.trilha !== tr) return; var ativo = t >= c.ini && t < c.ini + c.dur;
        if (c.tipo === "texto") { if (ativo) { if (c.anima === "anel") { desenharTexto(c, t, "tras"); frente.push(c); } else if (c.frente) frente.push(c); else desenharTexto(c, t); } return; }
        if (c.tipo === "elemento") { if (ativo) desenharElemento(c, t); return; }
        if (c.tipo === "audio") { if (ativo || (t > c.ini - 3 && t < c.ini + c.dur + 1)) sincronizar(c, t, ativo); else if (EL[c.id] && (t < c.ini - 8 || t > c.ini + c.dur + 4)) soltarEl(c.id); return; }
        if (!ativo) { if (c.tipo === "video" && !pintados[c.id]) { var perto = t > c.ini - 3 && t < c.ini + c.dur + 1; if (perto) sincronizar(c, t, false); else if (EL[c.id] && (t < c.ini - 8 || t > c.ini + c.dur + 4)) soltarEl(c.id); } return; }
        var td = transDe(c), ant = td ? anteriorDe(c) : null, p = td ? (t - c.ini) / td : 1;
        if (ant && p < 1) {   /* transição: o clipe que sai fica no último quadro e o novo entra por cima */
          var mt = modsTrans(c.trans.tipo, lim(p, 0, 1)), fa = fonteDe(ant, ant.ini + ant.dur - 0.04, false); pintados[ant.id] = 1;
          if (ant.tipo === "video") { var oa = elDe(ant), alvoA = (ant.corte || 0) + (ant.dur - 0.04) * vel(ant); if (oa && !TOCANDO && Math.abs(oa.e.currentTime - alvoA) > 0.08) { try { oa.e.currentTime = alvoA; } catch (x) {} } }
          if (fa) desenharMidia(fa.el, fa.w, fa.h, ant, ant.ini + ant.dur - 0.04, mt.A);
          var fb = fonteDe(c, t, true); if (fb) desenharMidia(fb.el, fb.w, fb.h, c, t, mt.B);
          if (mt.cor && mt.corA > 0) { cx.globalAlpha = lim(mt.corA, 0, 1); cx.fillStyle = mt.cor; cx.fillRect(0, 0, W, H); cx.globalAlpha = 1; }
          return; }
        var f = fonteDe(c, t, true); if (f) desenharMidia(f.el, f.w, f.h, c, t); }); });
    /* PESSOA NA FRENTE: o take com a pessoa é desenhado de novo, só a pessoa, por cima de tudo o que ficou "atrás dela" */
    if (window.BWMascara) P.clips.forEach(function (c) { if (fam(c.trilha) !== "v" || !c.ia || !c.ia.frente || !(t >= c.ini && t < c.ini + c.dur) || !BWMascara.tem(c.mid)) return;
      var f = fonteDe(c, t, true); if (f) desenharMidia(f.el, f.w, f.h, c, t, {soPessoa: true}); });
    /* OBJETO NA FRENTE (máscara por seleção): a área do take é desenhada de novo por cima dos textos */
    var frenteSel = P.clips.filter(function (c) { return fam(c.trilha) === "v" && c.selm && c.selm.pts && c.selm.pts.length > 1 && (c.selm.modo || "frente") === "frente" && SELDES !== c.id && t >= c.ini && t < c.ini + c.dur; });
    frente.forEach(function (c) { desenharTexto(c, t, c.anima === "anel" ? "frente" : ""); });
    frenteSel.forEach(function (c) { var f = fonteDe(c, t, true); if (f) desenharMidia(f.el, f.w, f.h, c, t, {soSel: true}); });
    if (SELDES && !GRAV) { var cs = P.clips.filter(function (x) { return x.id === SELDES; })[0], bx = cs && caixaTake(cs); if (bx) { cx.save(); cx.strokeStyle = "#FFD21F"; cx.lineWidth = Math.max(2, cv.width / 300); cx.setLineDash([cx.lineWidth * 4, cx.lineWidth * 3]);
      cx.strokeRect(bx.x, bx.y, bx.w, bx.h); if (cs.selm && cs.selm.pts && cs.selm.pts.length > 1) { cx.translate(bx.x, bx.y); caminhoSel(cx, cs.selm, bx.w, bx.h); cx.fillStyle = "rgba(255,210,31,.22)"; cx.fill(); cx.setLineDash([]); cx.stroke(); } cx.restore(); } }
    $("veTempo").textContent = fmtT(T) + " / " + fmtT(total()); var ag = $("veAgulha"); if (ag) ag.style.left = (T * PPS) + "px"; if (!TOCANDO) marcarEmenda();
  }
  /* 23/11 (dono, iPhone: "o vídeo fica bugado ao dar play na linha do tempo"): o relógio do play andava sozinho enquanto o iPhone ainda estava
     carregando/pulando o take (começo do play, troca de take) → o take ficava para trás, o editor mandava pular de novo, e o vídeo "engasgava" em laço.
     Agora o relógio ESPERA o take da tela ficar pronto (ESPERA, marcada no sincronizar) — como o play dos editores de verdade, que seguram o tempo
     até o quadro chegar. Na gravação (exportar) o relógio não espera. */
  var t0 = 0, p0 = 0, raf = 0, ESPERA = false, ultP = 0, espDesde = 0;
  function passo() { if (!TOCANDO) return; var agora = performance.now(); if (ESPERA && !GRAV && ultP) { if (!espDesde) espDesde = agora; if (agora - espDesde < 1500) p0 += Math.min(250, agora - ultP); } else espDesde = 0; ultP = agora; ESPERA = false; T = t0 + (agora - p0) / 1000; var fim = total(); if (T >= fim) { T = fim; desenhar(); parar(); if (GRAV) GRAV.fim(); return; } desenhar(); if (GRAV) GRAV.prog(T / fim); var ag = $("veAgulha"), ro = $("veRolo"); if (ag && !GRAV && (T * PPS > ro.scrollLeft + ro.clientWidth - 40)) ro.scrollLeft = T * PPS - 60; raf = requestAnimationFrame(passo); }
  function tocar() { if (TOCANDO) return; if (!P.clips.length) { aviso("Coloque um vídeo, imagem ou som na linha do tempo para tocar.", true); return; } var a = audioCtx(); if (a && a.state === "suspended") a.resume(); if (T >= total() - 0.05) T = 0; TOCANDO = true; t0 = T; p0 = performance.now(); ultP = 0; ESPERA = false; $("vePlay").textContent = "⏸ PAUSAR"; raf = requestAnimationFrame(passo); }
  function parar() { TOCANDO = false; cancelAnimationFrame(raf); $("vePlay").textContent = "▶ TOCAR"; Object.keys(EL).forEach(function (k) { try { EL[k].e.pause(); } catch (e) {} }); desenhar(); }
  function irPara(t) { var era = TOCANDO; if (era) parar(); T = lim(t, 0, Math.max(total(), 0)); desenhar(); }

  /* ---------- telas ---------- */
  var CATS = [["tudo", "▣", "Mídia"], ["audio", "♪", "Áudio"], ["texto", "T", "Texto"], ["elem", "✺", "Elementos"], ["efe", "✦", "Efeitos"], ["trans", "⋈", "Transições"]];
  function desenharLib() {
    var cat = ABA === "video" || ABA === "imagem" || ABA === "pasta" ? "tudo" : ABA, lib = $("veLib");
    $("veAbas").innerHTML = '<div class="ve-cats" role="tablist">' + CATS.map(function (a) { return '<button type="button" role="tab" data-aba="' + a[0] + '" class="' + (cat === a[0] ? "on" : "") + '" aria-selected="' + (cat === a[0]) + '" aria-pressed="' + (cat === a[0]) + '"><i aria-hidden="true">' + a[1] + '</i><span>' + a[2] + '</span></button>'; }).join("") + '</div>' +
      (cat === "tudo" ? '<div class="ve-subs">' + [["tudo", "Tudo"], ["video", "Vídeo"], ["imagem", "Imagem"]].concat(typeof window.showDirectoryPicker === "function" ? [["pasta", "★ Minha pasta"]] : []).map(function (a) { return '<button type="button" data-aba="' + a[0] + '" class="' + (ABA === a[0] ? "on" : "") + '">' + a[1] + '</button>'; }).join("") + '</div>' : "");
    lib.setAttribute("data-cat", cat);
    var tit = function (t) { return '<p class="ve-gt">' + t + '</p>'; };
    if (ABA === "trans" || ABA === "efe") { var L = ABA === "trans" ? TRANS : EFEITOS, pre = ABA === "trans" ? "t:" : "e:", cartao = function (k) { return '<div class="ve-item ve-fx ' + (ABA === "trans" ? "tr-" : "ef-") + esc(k) + '" role="button" tabindex="0" data-arr="' + pre + esc(k) + '" aria-label="' + (ABA === "trans" ? "Transição " : "Efeito ") + esc(L[k]) + ' — arraste até um take"><span class="mini" aria-hidden="true"><i></i></span><span>' + esc(L[k]) + '</span></div>'; };
      var usados = {}, h = '<p class="ve-nota" style="grid-column:1/-1;margin:0 0 4px">Arraste até ' + (ABA === "trans" ? "a emenda entre dois takes" : "um take") + ', ou toque para aplicar.</p>';
      GRUPOS[ABA].forEach(function (g) { var ks = g[1].filter(function (k) { return L[k]; }); if (!ks.length) return; h += tit(g[0]) + ks.map(function (k) { usados[k] = 1; return cartao(k); }).join(""); });
      var resto = Object.keys(L).filter(function (k) { return !usados[k]; }); if (resto.length) h += tit("Mais") + resto.map(cartao).join("");
      lib.innerHTML = h; return; }
    if (ABA === "pasta") { desenharPasta(); return; }
    if (ABA === "texto") { lib.innerHTML = tit("Toque para pôr na agulha") + TEXTOS.map(function (t) { return '<div class="ve-item ve-tx" role="button" tabindex="0" data-texto="' + t[0] + '" aria-label="Pôr texto ' + esc(t[1]) + '"><span class="mini" aria-hidden="true"' + (t[2].fundo ? ' style="--tf:' + t[2].fundo + ";--tc:" + (t[2].cor || "#fff") + '"' : "") + '><b>' + esc(String(t[2].txt).split("\n")[0].slice(0, 14)) + '</b></span><span>' + esc(t[1]) + '</span></div>'; }).join(""); return; }
    if (ABA === "elem") { lib.innerHTML = tit("Elementos animados") + Object.keys(ELEMENTOS).map(function (k) { var p = ELEMENTOS[k].split(" "); return '<div class="ve-item ve-el" role="button" tabindex="0" data-elem="' + esc(k) + '" aria-label="Pôr ' + esc(ELEMENTOS[k]) + '"><span class="mini" aria-hidden="true">' + p[0] + '</span><span>' + esc(p.slice(1).join(" ")) + '</span></div>'; }).join(""); return; }
    var sonsCasa = ""; if (ABA === "audio") { var gs = []; SONS.forEach(function (x) { if (gs.indexOf(x[3]) < 0) gs.push(x[3]); }); sonsCasa = gs.map(function (gn) { return tit(gn) + SONS.map(function (x, i) { return x[3] === gn ? somCartao(x, i) : ""; }).join(""); }).join("") + tit("Meus sons"); }
    var l = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return !m.ph && (ABA === "tudo" || m.tipo === ABA); });   /* espaços de modelo não aparecem na biblioteca */
    lib.innerHTML = sonsCasa + (l.length ? l.map(function (m) { var mini = m.tipo === "imagem" ? '<img alt="" src="' + m.url + '">' : m.capa ? '<img alt="" src="' + m.capa + '">' : '<span class="mini" aria-hidden="true">' + (m.tipo === "audio" ? "🎵" : "🎬") + '</span>';
      var f = m.cr && window.BWCriacoes ? BWCriacoes.FERR[m.cr.ferramenta] : null;
      return '<div class="ve-item' + (m.ruim ? " ruim" : "") + '" role="button" tabindex="0" data-mid="' + esc(m.id) + '" aria-label="Pôr ' + esc(m.nome) + ' na linha do tempo"' + (m.ruim ? ' title="Este arquivo não abre neste navegador"' : "") + (f ? ' style="--cf:' + f.cor + '"' : "") + '>' + mini + (PX[m.id] ? '<b class="selo px" title="Tem proxy: edita leve, exporta com o original">⚡ PROXY ' + PX[m.id].curto + 'p</b>' : "") + (m.ruim ? '<b class="selo ruim">⚠ ' + (m.codec === "hevc" ? "HEVC · NÃO ABRE AQUI" : "NÃO ABRE AQUI") + '</b><button type="button" class="ve-retry" data-retry="' + esc(m.id) + '" title="Tentar abrir de novo" aria-label="Tentar abrir de novo">↻</button>' : "") + (f ? '<b class="selo">' + f.icone + " " + esc(f.curto) + "</b>" : "") + '<span>' + esc(m.nome) + '</span>' + (f ? '<button type="button" class="ed" data-editar="' + esc(m.id) + '" title="Abrir no ' + esc(f.nome) + ' e trocar aqui" aria-label="Editar no ' + esc(f.nome) + '">✎</button>' : "") + '<button type="button" class="x" data-del="' + esc(m.id) + '" aria-label="Tirar ' + esc(m.nome) + ' da biblioteca">✕</button></div>'; }).join("")
      : '<p class="ve-nota" style="grid-column:1/-1;margin:0">' + (ABA === "audio" ? "Seus sons importados aparecem aqui." : "Nada aqui ainda. Toque em ＋ IMPORTAR ou em ✨ MINHAS CRIAÇÕES.") + '</p>');
  }
  function somCartao(x, i) { return '<div class="ve-item ve-sm" role="button" tabindex="0" data-som="' + i + '" aria-label="Pôr ' + x[1] + ' na linha do tempo"><span class="mini" aria-hidden="true">' + (x[0] === "sfx" ? "🔊" : "🎼") + '</span><span>' + x[1] + '</span></div>'; }
  function porTextoPronto(k) { var t = TEXTOS.filter(function (x) { return x[0] === k; })[0]; if (!t) return; var c = addTexto({}); Object.keys(t[2]).forEach(function (p) { c[p] = t[2][p]; }); c.txt = String(t[2].txt).replace(/\\n/g, "\n"); tudo(); aviso("✓ Texto “" + t[1] + "” na agulha"); return c; }
  function desenharTL() {
    var fim = Math.max(total() + 8, 20), larg = Math.ceil(fim * PPS), passoR = PPS >= 90 ? 1 : PPS >= 40 ? 2 : 5, h = '<div class="ve-regua" id="veRegua" style="width:' + larg + 'px">';
    for (var s = 0; s <= fim; s += passoR) h += '<i style="left:' + (s * PPS) + 'px">' + (s >= 60 ? Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + s % 60 : s + "s") + '</i>';
    h += "</div>";
    var TRILHAS = trilhas(); TRILHAS.forEach(function (tr) { var at = altTr(tr[0]); h += '<div class="ve-faixa' + (vaziaTr(tr[0]) ? " vazia" : "") + (at < 34 ? " baixa" : "") + '" data-trilha="' + tr[0] + '" style="width:' + larg + 'px;height:' + at + 'px">' + P.clips.filter(function (c) { return c.trilha === tr[0]; }).map(function (c) { var m = MID[c.mid], nome = c.tipo === "texto" ? String(c.txt || "Texto").split("\n")[0] : c.tipo === "elemento" ? (ELEMENTOS[c.el] || "Elemento") + (c.rastro ? " · ⌖" : "") : m ? m.nome : "arquivo que falta", mini = m && (m.tipo === "imagem" ? m.url : m.capa);
        return '<div class="ve-clip' + (c.id === SEL ? " on" : "") + (GRUPO.length > 1 && GRUPO.indexOf(c.id) >= 0 ? " multi" : "") + '" data-clip="' + c.id + '" style="--c:' + tr[2] + (c.off ? ";opacity:.35;filter:grayscale(1)" : "") + (mini && c.tipo !== "audio" ? ";--mini:url(" + mini + ")" : "") + ';left:' + (c.ini * PPS) + 'px;width:' + Math.max(18, c.dur * PPS) + 'px" title="' + esc(nome) + '"><i class="al e" data-al="e"></i>' + (mini ? '<img alt="" src="' + mini + '">' : "") + '<span>' + (c.tipo === "texto" ? "T · " : c.tipo === "audio" ? "♪ " : "") + esc(nome) + '</span>' + (vel(c) !== 1 ? '<b class="bd">' + String(vel(c)).replace(".", ",") + '×</b>' : "") + (c.efeito && EFEITOS[c.efeito] ? '<b class="bd" title="Efeito: ' + esc(EFEITOS[c.efeito]) + '">✦ ' + esc(EFEITOS[c.efeito]) + '</b>' : "") + (c.grade && window.BWCor && BWCor.ativo(c.grade) ? '<b class="bd" title="Cor ajustada">🎨</b>' : "") + (c.ia && window.BWMascara && BWMascara.tem(c.mid) ? '<b class="bd" title="Pessoa analisada (IA)">🧠</b>' : "") + (c.anima ? '<b class="bd" title="Texto com movimento">✦</b>' : "") + ondaHtml(c, m) + '<i class="al d" data-al="d"></i>' + (transDe(c) && anteriorDe(c) ? '<i class="tr" title="Transição: ' + esc(TRANS[c.trans.tipo]) + " · " + String(Math.round(transDe(c) * 10) / 10).replace(".", ",") + ' s" style="width:' + Math.max(10, transDe(c) * PPS) + 'px"><i class="trp" data-trp="' + c.id + '" title="Arraste para mudar o tempo da transição"></i></i>' : "") + '</div>'; }).join("") + juntas(tr[0]) + "</div>"; });
    h += '<div class="ve-agulha" id="veAgulha" style="left:' + (T * PPS) + 'px"></div><i class="ve-lamina" id="veLamina" hidden></i>';
    $("veFaixas").innerHTML = h; $("veFaixas").style.width = larg + "px";
    $("veRot").innerHTML = "<div>TEMPO</div>" + TRILHAS.map(function (tr) { return '<div' + (vaziaTr(tr[0]) ? ' class="vazia"' : "") + ' data-rot="' + tr[0] + '" style="--c:' + tr[2] + ';height:' + altTr(tr[0]) + 'px" title="Alt + rodinha do mouse em cima da camada: mais alta ou mais baixa">' + tr[1] + "</div>"; }).join("");
  }
  /* EMENDAS: ◆ entre dois takes encostados na mesma camada. Com transição = ◆ cheio com o nome (arrastar muda o tempo, tocar troca);
     sem transição = ◇ discreto (tocar escolhe uma; soltar uma transição aqui aplica). */
  function juntas(tr) { if (fam(tr) !== "v") return ""; return P.clips.filter(function (c) { return c.trilha === tr && anteriorDe(c); }).map(function (c) { var td = transDe(c);
    return '<i class="ve-junta' + (td ? " com" : "") + '" data-junta="' + c.id + '" style="left:' + (c.ini * PPS) + 'px' + (td ? ";--jw:" + Math.max(28, Math.round(td * PPS)) + "px" : "") + '" role="button" tabindex="0" aria-label="' + (td ? "Transição " + esc(TRANS[c.trans.tipo]) + " — arraste para mudar o tempo" : "Emenda sem transição — toque para escolher uma") + '" title="' + (td ? esc(TRANS[c.trans.tipo]) + " · " + String(Math.round(td * 10) / 10).replace(".", ",") + " s — arraste para os lados para mudar o tempo; toque para trocar" : "Emenda — toque para escolher uma transição ou solte uma aqui") + '">' + (td ? "<b>" + esc(TRANS[c.trans.tipo]) + "</b>" : "") + '</i>'; }).join(""); }
  /* 22/11 10:05 (dono): a transição vai na EMENDA onde está a agulha (entre dois takes). Tolerância: ~14 px da tela ou 0,12 s */
  function emendaNaAgulha() { var tol = Math.max(0.12, 14 / PPS), m = null, md = 1e9; P.clips.forEach(function (c) { if (famDoClip(c) !== "v" || c.tipo === "texto" || c.tipo === "audio" || !anteriorDe(c)) return; var d = Math.abs(T - c.ini) + (c.trilha === "v1" ? 0 : 0.001); if (d <= tol && d < md) { md = d; m = c; } }); return m; }
  function marcarEmenda() { var fx = $("veFaixas"); if (!fx) return; var e = emendaNaAgulha(), id = e ? e.id : ""; fx.querySelectorAll(".ve-junta").forEach(function (j) { j.classList.toggle("agulha", j.dataset.junta === id); }); document.documentElement.classList.toggle("ve-na-emenda", !!e); }
  function aplicarFx(c, kind, k, semAviso) { if (!c) { aviso("Escolha um take na linha do tempo (ou arraste até ele).", true); return false; }
    if (kind === "t") { if (c.tipo === "texto" || c.tipo === "audio") { aviso("Transição é para vídeo e imagem.", true); return false; } c.trans = {tipo: k, dur: (c.trans && c.trans.dur) || 0.6}; }
    else { if (c.tipo !== "video" && c.tipo !== "imagem") { aviso("Efeito é para vídeo e imagem.", true); return false; } c.efeito = k; if (c.efInt == null) c.efInt = 85; }
    SEL = c.id; tudo(); marcar(c.id); if (!semAviso) aviso(kind === "t" ? "◧ Transição “" + TRANS[k] + "”" + (anteriorDe(c) ? " na emenda — arraste o ◆ para mudar o tempo." : " — encoste este take no fim de outro para ela aparecer.") : "✦ Efeito “" + EFEITOS[k] + "” no take."); return true; }
  function marcar(id) { var el = $("veFaixas").querySelector('[data-clip="' + id + '"]'); if (!el) return; el.classList.remove("marcado"); void el.offsetWidth; el.classList.add("marcado"); setTimeout(function () { el.classList.remove("marcado"); }, 1300); }
  function menuTrans(c, x, y) { if (!window.BWFerr) return; BWFerr.menu(x, y, [{rot: "Corte seco (sem transição)", icone: "▮", fn: function () { c.trans = null; tudo(); }}].concat(Object.keys(TRANS).map(function (k) { return {rot: TRANS[k] + (c.trans && c.trans.tipo === k ? "  ✓" : ""), icone: "◧", fn: function () { aplicarFx(c, "t", k); }}; }),
      c.trans ? ["-", {tit: "TEMPO"}].concat([0.3, 0.6, 1, 1.5, 2].map(function (d) { return {rot: String(d).replace(".", ",") + " s" + (Math.abs((c.trans.dur || 0.6) - d) < 0.01 ? "  ✓" : ""), fn: function () { c.trans.dur = d; tudo(); marcar(c.id); }}; })) : []), "TRANSIÇÃO NA EMENDA"); }
  function ondaHtml(c, m) { if (!m || (c.tipo !== "audio" && c.tipo !== "video")) return "";
    var o = ONDA[m.id]; if (!o) { analisar(m).then(function (r) { if (r && r.img) desenharTL(); }); return ""; }
    if (!o._r) { o.then(function (r) { o._r = r || {}; }); return ""; } var r = o._r; if (!r.img) return "";
    var larg = r.dur / vel(c) * PPS, desl = (c.corte || 0) / vel(c) * PPS, gv = lim(ganhoTake(c), 0, 4);
    return '<i class="onda' + (c.tipo === "video" ? " v" : "") + '" style="background-image:url(' + r.img + ');background-size:' + larg.toFixed(1) + 'px 100%;background-position:' + (-desl).toFixed(1) + 'px 0;transform:scaleY(' + Math.max(0.15, Math.min(1.6, gv)).toFixed(2) + ')"></i>'; }
  function vaziaTr(id) { return id !== "v1" && !(P.trExtra && P.trExtra.indexOf(id) >= 0) && !P.clips.some(function (c) { return c.trilha === id; }); }
  /* 23/11 (dono, PC): BOTÃO DIREITO NO VAZIO da linha do tempo → (1) puxar o take seguinte para ENCOSTAR no anterior (fechar o espaço), também
     puxando tudo o que vem depois na camada; (2) NOVA CAMADA ABAIXO da clicada. A camada nova fica em P.trExtra (vazia mas visível) até receber um
     take; os números da família são refeitos (vídeo e texto: número maior em cima; som: menor em cima) junto com as alturas P.alt. */
  function renumFam(f, desde, d) { var nv = function (t) { return fam(t) === f && numTr(t) >= desde ? idTr(f, numTr(t) + d) : t; };
    P.clips.forEach(function (c) { if (c.trilha) c.trilha = nv(c.trilha); }); if (P.trExtra) P.trExtra = P.trExtra.map(nv); if (P.pilha) P.pilha = P.pilha.map(nv);
    if (P.alt) { var a = {}; Object.keys(P.alt).forEach(function (k) { a[nv(k)] = P.alt[k]; }); P.alt = a; } }
  function camadaAbaixo(tr) { var f = fam(tr), n = numTr(tr), id; gravarHist();
    if (f === "a") { renumFam(f, n + 1, 1); id = idTr(f, n + 1); }   /* som: abaixo da clicada */
    else { id = novaTrilha(f); P.pilha = pilha().concat(id); }          /* vídeo/foto/texto: sempre ACIMA de tudo (padrão Premiere/DaVinci) */
    P.trExtra = (P.trExtra || []).filter(function (t) { return t !== id; }).concat(id); tudo(true); gravarHist();
    aviso(f === "a" ? "Camada de som nova abaixo — arraste um som para ela" : "Camada nova acima de tudo — arraste um take para ela"); return id; }
  function vaoEm(tr, t) { var cs = P.clips.filter(function (c) { return c.trilha === tr; }).sort(function (a, b) { return a.ini - b.ini; }), ant = null, prox = null;
    cs.forEach(function (c) { if (c.ini + c.dur <= t + 1e-6) ant = c; else if (!prox && c.ini >= t - 1e-6) prox = c; });
    var ini = ant ? ant.ini + ant.dur : 0; return prox && prox.ini - ini > 0.01 ? {prox: prox, ini: ini, d: prox.ini - ini, todos: cs.filter(function (c) { return c.ini >= prox.ini - 1e-6; })} : null; }
  function fecharVao(tr, t, todos) { var v = vaoEm(tr, t); if (!v) return false; gravarHist(); var d = Math.round(v.d * 1000) / 1000;
    (todos ? v.todos : [v.prox]).forEach(function (c) { c.ini = Math.max(0, Math.round((c.ini - d) * 1000) / 1000); }); SEL = v.prox.id; tudo(true); gravarHist(); marcar(v.prox.id);
    aviso(todos ? "Espaço fechado — os takes seguintes vieram juntos" : "Take encostado no anterior"); return true; }
  function faixaR(k, rot, min, max, v, suf, passo) { return '<label><span>' + rot + '</span><input type="range" data-p="' + k + '" min="' + min + '" max="' + max + '" step="' + (passo || 1) + '" value="' + v + '"><output>' + v + (suf || "") + '</output></label>'; }
  var ANIMAS = [["", "Parado"], ["subir", "Sobe (por trás dos ombros)"], ["descer", "Desce"], ["zoom", "Zoom de entrada"], ["pulsar", "Pulsar"], ["letreiro", "Letreiro passando"], ["maquina", "Máquina de escrever"], ["anel", "Anel girando em volta"]];
  var ULT_SEL = null;
  /* 22/11 (dono): "texto atrás da pessoa" pedia o take mesmo com ele escolhido — no celular, abrir o submenu de texto LARGA a seleção.
     takeAlvo = o take escolhido; senão o último take de vídeo/foto escolhido; senão o que está na agulha; senão o primeiro. */
  var ULTV = null;
  function ehVisual(c) { return c && (c.tipo === "video" || c.tipo === "imagem"); }
  function takeAlvo() { var c = sel(); if (ehVisual(c)) return c;
    c = P.clips.filter(function (x) { return x.id === ULTV && ehVisual(x); })[0]; if (c) return c;
    var naAg = P.clips.filter(function (x) { return ehVisual(x) && !x.off && x.ini <= T + 0.001 && x.ini + x.dur > T; }).sort(function (x, y) { return numTr(y.trilha) - numTr(x.trilha); })[0]; if (naAg) return naAg;
    return P.clips.filter(ehVisual).sort(function (x, y) { return x.ini - y.ini; })[0] || null; }
  function desenharProp() {
    if (ehVisual(sel())) ULTV = SEL;
    var c = sel(), b = $("vePropCorpo"); if (!c) { var nC = P.clips.length, f0 = FMT[P.fmt] || [P.w || cv.width, P.h || cv.height];
      b.innerHTML = '<div class="ve-g"><h4>O PROJETO</h4><p class="ve-nota" style="margin:0 0 4px">Tamanho: <b>' + tamReal()[0] + " × " + tamReal()[1] + ' px</b>' + (escalaPrev() < 1 ? '<br><span style="opacity:.75">Prévia leve: ' + cv.width + ' × ' + cv.height + ' (o vídeo sai no tamanho real)</span>' : '') + '<br><label style="display:flex;gap:6px;align-items:center;margin-top:4px;text-transform:none"><input type="checkbox" id="vePreviaCheia"' + (CHEIA ? ' checked' : '') + '> Prévia em tamanho cheio (mais pesado)</label><br>Duração: <b>' + fmtT(total()) + '</b><br>Clipes: <b>' + nC + '</b></p></div><p class="ve-nota" style="margin:0">Toque num clipe da linha do tempo: este painel mostra os ajustes daquele tipo de clipe (vídeo e foto, som ou texto).</p>'; return; }
    if (c.id !== ULT_SEL) { ULT_SEL = c.id; if (window.__veVista) window.__veVista.aoSelecionar(); }
    var visual = c.tipo !== "audio", g = function (k, t, corpo, fechada) { return corpo ? '<div class="ve-g" data-g="' + k + '"><h4 data-seta="ve-' + k + '"' + (fechada ? ' data-seta-padrao="fechada"' : "") + '>' + t + '</h4><div>' + corpo + '</div></div>' : ""; }, h = "";
    if (c.tipo === "texto") h += g("texto", "TEXTO", '<label class="um"><span>Texto</span><textarea data-p="txt" rows="3" maxlength="200" aria-label="Texto do clipe">' + esc(c.txt) + '</textarea></label><label class="um"><span>Fonte</span><select data-p="fonte" aria-label="Fonte">' + FONTES.map(function (f) { return '<option' + (f === c.fonte ? " selected" : "") + '>' + f + '</option>'; }).join("") + '</select></label>' + faixaR("tam", "Tamanho", 2, 20, c.tam, "%", 0.5) +
      '<label class="um"><span>Cor</span><input type="color" data-p="cor" value="' + esc(c.cor || "#ffffff") + '" aria-label="Cor do texto"></label><label class="um"><span>Fundo</span><select data-p="fundo" aria-label="Fundo do texto"><option value=""' + (!c.fundo ? " selected" : "") + '>Sem fundo (sombra)</option><option value="#000000"' + (c.fundo === "#000000" ? " selected" : "") + '>Caixa preta</option><option value="#ffffff"' + (c.fundo === "#ffffff" ? " selected" : "") + '>Caixa branca</option><option value="#7C5CFF"' + (c.fundo === "#7C5CFF" ? " selected" : "") + '>Caixa roxa</option><option value="#FFB547"' + (c.fundo === "#FFB547" ? " selected" : "") + '>Caixa âmbar</option></select></label>' +
      '<label class="um"><span>Movimento</span><select data-p="anima" aria-label="Movimento do texto">' + ANIMAS.map(function (a) { return '<option value="' + a[0] + '"' + ((c.anima || "") === a[0] ? " selected" : "") + '>' + a[1] + '</option>'; }).join("") + '</select></label>' +
      (c.anima === "anel" ? faixaR("raio", "Tamanho do anel", 15, 60, c.raio || 38, "%") + faixaR("velAnel", "Velocidade do giro", -2, 2, c.velAnel == null ? 0.7 : c.velAnel, "", 0.1) : "") +
      '<p class="ve-sub">EM RELAÇÃO À PESSOA</p><div class="ve-chips"><button type="button" data-frente="0"' + (!c.frente ? ' class="on"' : "") + '>Atrás da pessoa</button><button type="button" data-frente="1"' + (c.frente ? ' class="on"' : "") + '>Na frente</button></div>' +
      '<p class="ve-nota" style="margin:4px 0 0">"Atrás da pessoa" funciona quando o take tem PESSOA E FUNDO (IA) analisado com "pessoa na frente" ligado.</p>');
    if (visual) h += g("pos", "TAMANHO E POSIÇÃO", (c.tipo !== "texto" ? '<label class="um"><span>Encaixe</span><select data-p="encaixe" aria-label="Encaixe na tela"><option value="cobrir"' + (c.encaixe !== "caber" ? " selected" : "") + '>Encher a tela</option><option value="caber"' + (c.encaixe === "caber" ? " selected" : "") + '>Mostrar inteiro</option></select></label>' + faixaR("esc", "Tamanho", 10, 300, c.esc, "%") : "") +
      faixaR("x", "Posição ↔", -60, 60, c.x || 0, "%") + faixaR("y", "Posição ↕", -60, 60, c.y || 0, "%") + faixaR("op", "Opacidade", 0, 100, c.op == null ? 100 : c.op, "%"));
    if (c.tipo === "video" || c.tipo === "audio") h += g("som", "SOM", '<label><span>Volume</span><input type="range" data-p="volDb" min="-40" max="12" step="0.5" value="' + dbDe(c) + '" aria-label="Volume em dB"><output>' + (dbDe(c) <= -40 ? "mudo" : String(dbDe(c)).replace(".", ",") + " dB") + '</output></label>' +
      '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="mudo">' + (c.vol === 0 ? "🔈 DEVOLVER O SOM" : "🔇 MUDO") + '</button><button class="ve-bt' + (c.normG ? " on" : "") + '" type="button" data-acao="normalizar" title="Deixa o volume deste take no padrão, sem estourar">🔊 NORMALIZAR' + (c.normG ? " ✓" : "") + '</button>' + (c.normG ? '<button class="ve-bt" type="button" data-acao="desnormalizar">✕</button>' : "") + (c.tipo === "video" ? '<button class="ve-bt" type="button" data-acao="extrair">🎵 EXTRAIR ÁUDIO</button>' : "") + '</div>' +
      '<p class="ve-sub">REDUZIR RUÍDO (zumbido e chiado)</p><div class="ve-chips">' + ["Desligado", "Leve", "Médio", "Forte"].map(function (n, i) { return '<button type="button" data-ruido="' + i + '"' + ((c.ruido || 0) === i ? ' class="on"' : "") + '>' + n + '</button>'; }).join("") + '</div>' +
      '<p class="ve-sub">REALÇAR VOZ (mais presença e volume por igual)</p><div class="ve-chips"><button type="button" data-voz="0"' + (!c.voz ? ' class="on"' : "") + '>Desligado</button><button type="button" data-voz="1"' + (c.voz ? ' class="on"' : "") + '>Ligado</button></div>' +
      '<p class="ve-nota" style="margin:6px 0 0">Entrada e saída suave do som ficam em TEMPO E CAMADA. Tudo é feito neste aparelho; o que você ouve é o que sai no vídeo.</p>');
    if (c.tipo === "video" || c.tipo === "audio") h += g("vel", "VELOCIDADE", '<div class="ve-chips">' + VELS.map(function (v) { return '<button type="button" data-vel="' + v + '"' + (vel(c) === v ? ' class="on"' : "") + '>' + String(v).replace(".", ",") + '×</button>'; }).join("") + '</div>' + (c.tipo === "video" ? '<div class="ve-linha"><button class="ve-bt" type="button" data-acao="congelar">❄ CONGELAR QUADRO</button></div>' : ""), true);
    if (visual && c.tipo !== "texto" && c.tipo !== "elemento") { var tt = c.trans && c.trans.tipo || "";
      h += g("trans", "TRANSIÇÃO DE ENTRADA", (anteriorDe(c) ? "" : '<p class="ve-nota" style="margin:0 0 6px">Encoste este clipe no fim de outro (mesma camada) para a transição aparecer.</p>') + '<div class="ve-chips">' + '<button type="button" data-trans=""' + (!tt ? ' class="on"' : "") + '>Corte seco</button>' + Object.keys(TRANS).map(function (k) { return '<button type="button" data-trans="' + k + '"' + (tt === k ? ' class="on"' : "") + '>' + TRANS[k] + '</button>'; }).join("") + '</div>' + (tt ? faixaR("transDur", "Duração", 0.2, 2, (c.trans.dur || 0.6), " s", 0.1) : ""), true);
      h += g("efeito", "EFEITO", '<div class="ve-chips"><button type="button" data-efeito=""' + (!c.efeito ? ' class="on"' : "") + '>Nenhum</button>' + Object.keys(EFEITOS).map(function (k) { return '<button type="button" data-efeito="' + k + '"' + (c.efeito === k ? ' class="on"' : "") + '>' + EFEITOS[k] + '</button>'; }).join("") + '</div>' + (c.efeito ? faixaR("efInt", "Intensidade", 0, 100, c.efInt == null ? 85 : c.efInt, "%") : ""), true); }
    if (visual && c.tipo !== "texto" && c.tipo !== "elemento" && window.BWCor) { var gd = c.grade || {}, grupoAnt = "", pre = predefCor();
      /* 23/11 (dono: cor "parecida com o DaVinci, clicou mudou, sem cara de filtro"): ordem do colorista — 1 CORREÇÃO · 2 REALCE · 3 ESTILO · 4 AJUSTE FINO */
      var vibA = Math.round(+gd.vib || 0), nivR = BWCor.REALCE.map(function (x) { return x[1]; }).indexOf(vibA);
      h += g("cor", "COR (AJUSTE)", '<p class="ve-sub">1 · CORREÇÃO</p><div class="ve-linha"><button class="ve-bt pri" type="button" data-acao="corAuto" title="Lê o quadro da agulha e acerta o balanço de branco, a exposição e os pontos de preto e branco deste take">✦ CORREÇÃO AUTOMÁTICA</button></div>' +
        '<p class="ve-sub">2 · REALCE DE COR</p><div class="ve-chips">' + BWCor.REALCE.map(function (x, i) { return '<button type="button" data-realce="' + i + '"' + (nivR === i ? ' class="on"' : "") + '>' + x[0] + '</button>'; }).join("") + '</div>' +
        '<p class="ve-sub">3 · ESTILO (OPCIONAL)</p><div class="ve-chips"><button type="button" data-look=""' + (!BWCor.ativo(gd) ? ' class="on"' : "") + '>Original</button>' + Object.keys(BWCor.LOOKS).map(function (k) { return '<button type="button" data-look="' + k + '"' + (c.look === k && BWCor.ativo(gd) ? ' class="on"' : "") + '>' + BWCor.LOOKS[k].nome + '</button>'; }).join("") +
        pre.map(function (p, i) { return '<button type="button" class="pre' + (c.look === "p" + i && BWCor.ativo(gd) ? " on" : "") + '" data-predef="' + i + '" title="Predefinição sua">★ ' + esc(p.nome) + '<i data-predel="' + i + '" title="Apagar esta predefinição" aria-label="Apagar a predefinição ' + esc(p.nome) + '">✕</i></button>'; }).join("") + '</div>' +
        BWCor.CAMPOS.map(function (f) { var t = (f[0] !== grupoAnt ? '<p class="ve-sub">' + (grupoAnt ? "" : "4 · AJUSTE FINO — ") + f[0] + '</p>' : ""); grupoAnt = f[0]; return t + faixaR("g:" + f[1], f[2], -100, 100, Math.round(+gd[f[1]] || 0), ""); }).join("") +
        '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="corZerar">↺ ZERAR</button><button class="ve-bt" type="button" data-acao="corTodos" title="Põe esta mesma cor em todos os takes de vídeo e foto">⇉ APLICAR EM TODOS</button><button class="ve-bt" type="button" data-acao="corSalvar">★ SALVAR PREDEFINIÇÃO</button></div>' +
        '<p class="ve-nota" style="margin:6px 0 0">Dois toques numa barra volta ela a zero. Tudo é feito neste aparelho' + (BWCor.motor() === "2d" ? " (modo econômico: este navegador não tem WebGL, a prévia pode ficar mais lenta)" : "") + '.</p>', true); }
    if (visual && c.tipo !== "texto" && c.tipo !== "elemento" && window.BWMascara) { var ia = c.ia || {}, tem = BWMascara.tem(c.mid), fundos = [["", "Original"], ["desfoque", "Desfocado"], ["pb", "Cor só na pessoa"], ["escuro", "Escurecido"], ["claro", "Clareado"], ["cor", "Cor lisa"], ["sem", "Sem fundo"]];
      h += g("ia", "PESSOA E FUNDO (IA)", (ANALISANDO[c.mid] != null ? '<p class="ve-nota" style="margin:0 0 6px">🧠 Analisando a pessoa… <b id="veIaProg">' + Math.round(ANALISANDO[c.mid] * 100) + '%</b></p><div class="ve-linha"><button class="ve-bt" type="button" data-acao="iaCancelar">CANCELAR</button></div>'
        : !tem ? '<p class="ve-nota" style="margin:0 0 6px">O app acha a pessoa em cada quadro deste take (no próprio aparelho). Depois dá para pôr texto e logo ATRÁS dela, desfocar ou trocar o fundo e acender um contorno de luz.</p><div class="ve-linha"><button class="ve-bt pri" type="button" data-acao="iaAnalisar">🧠 ANALISAR PESSOA NO TAKE</button></div><p class="ve-nota" style="margin:6px 0 0">Na primeira vez baixa o modelo (~16 MB). Leva mais ou menos o tempo do take no computador; no celular, um pouco mais.</p>'
        : '<div class="ve-chips"><button type="button" data-iafrente="1"' + (ia.frente ? ' class="on"' : "") + '>Pessoa na frente dos textos</button><button type="button" data-iafrente="0"' + (!ia.frente ? ' class="on"' : "") + '>Normal</button></div>' +
          '<p class="ve-sub">FUNDO</p><div class="ve-chips">' + fundos.map(function (f) { return '<button type="button" data-iafundo="' + f[0] + '"' + ((ia.fundo || "") === f[0] ? ' class="on"' : "") + '>' + f[1] + '</button>'; }).join("") + '</div>' +
          (ia.fundo === "cor" ? '<label class="um"><span>Cor do fundo</span><input type="color" data-p="ia:fundoCor" value="' + esc(ia.fundoCor || "#111318") + '" aria-label="Cor do fundo"></label>' : "") +
          '<p class="ve-sub">CONTORNO DE LUZ NA PESSOA</p><div class="ve-chips"><button type="button" data-iacont="0"' + (!ia.contorno ? ' class="on"' : "") + '>Sem</button><button type="button" data-iacont="1"' + (ia.contorno ? ' class="on"' : "") + '>Ligado</button></div>' +
          (ia.contorno ? '<label class="um"><span>Cor do contorno</span><input type="color" data-p="ia:contornoCor" value="' + esc(ia.contornoCor || "#7C5CFF") + '" aria-label="Cor do contorno"></label>' : "") +
          faixaR("ia:suave", "Borda suave", 0, 100, ia.suave == null ? 30 : ia.suave, "%") +
          '<div class="ve-linha" style="flex-wrap:wrap"><button class="ve-bt" type="button" data-acao="iaModelos">✨ MODELOS COM A PESSOA</button><button class="ve-bt" type="button" data-acao="iaAnalisar">↺ ANALISAR DE NOVO</button></div>' +
          '<p class="ve-nota" style="margin:6px 0 0">' + (function () { var i2 = BWMascara.info(c.mid); return i2 ? (i2.fps ? i2.quadros + " quadros analisados (" + i2.fps + " por segundo)" : "foto analisada") : ""; })() + '. Cabelo solto e mão na frente do rosto podem deixar a borda imperfeita.</p>'), !tem); }
    if (c.tipo === "elemento") h += g("elem", "ELEMENTO ANIMADO", '<div class="ve-chips">' + Object.keys(ELEMENTOS).map(function (k) { return '<button type="button" data-elk="' + k + '"' + (c.el === k ? ' class="on"' : "") + '>' + ELEMENTOS[k] + '</button>'; }).join("") + '</div>' +
      '<label class="um"><span>Cor (vazio = a do elemento)</span><input type="color" data-p="cor" value="' + esc(c.cor || "#ffb02e") + '" aria-label="Cor do elemento"></label><div class="ve-linha"><button class="ve-bt" type="button" data-acao="elCorZero">Cor original</button></div>');
    /* SEGUIR UM PONTO (rastreio): qualquer item por cima (elemento, foto, vídeo, texto) acompanha a mão, a cabeça, o corpo ou um ponto escolhido de outro take */
    if (visual) { var rs = c.rastro || {}, alvos = P.clips.filter(function (x) { return x !== c && (x.tipo === "video" || x.tipo === "imagem") && x.ini < c.ini + c.dur && x.ini + x.dur > c.ini; }),
        PT = window.BWRastreio ? BWRastreio.PONTOS : {mao: {}, corpo: {}}, modoR = rs.modo || "mao", ptR = rs.ponto || (modoR === "mao" ? "palma" : "cabeca");
      h += g("rastro", "SEGUIR UM PONTO (RASTREAR)", !alvos.length ? '<p class="ve-nota" style="margin:0">Ponha este item POR CIMA de um take (na mesma hora) para ele poder seguir a mão, a cabeça ou um objeto daquele take.</p>' :
        (RASTREANDO ? '<p class="ve-nota" style="margin:0 0 6px">⌖ Rastreando… <b id="veRsProg">' + Math.round(RASTREANDO.p * 100) + '%</b></p><div class="ve-linha"><button class="ve-bt" type="button" data-acao="rsCancelar">CANCELAR</button></div>' :
        '<label class="um"><span>Seguir o take</span><select data-rsalvo>' + alvos.map(function (x) { return '<option value="' + x.id + '"' + ((rs.alvo || alvos[0].id) === x.id ? " selected" : "") + '>' + esc((MID[x.mid] || {}).nome || "take") + '</option>'; }).join("") + '</select></label>' +
        '<p class="ve-sub">O QUE SEGUIR</p><div class="ve-chips"><button type="button" data-rsmodo="mao"' + (modoR === "mao" ? ' class="on"' : "") + '>✋ Mão (IA)</button><button type="button" data-rsmodo="corpo"' + (modoR === "corpo" ? ' class="on"' : "") + '>🧍 Corpo e cabeça (IA)</button><button type="button" data-rsmodo="manual"' + (modoR === "manual" ? ' class="on"' : "") + '>🎯 Ponto que eu escolho</button></div>' +
        (modoR === "manual" ? '<p class="ve-nota" style="margin:4px 0">Toque em ESCOLHER e depois num ponto com contraste do take (um objeto, uma luz, um logo). O app acompanha esse ponto quadro a quadro.</p>' :
          '<div class="ve-chips">' + Object.keys(PT[modoR] || {}).map(function (k) { return '<button type="button" data-rsponto="' + k + '"' + (ptR === k ? ' class="on"' : "") + '>' + PT[modoR][k].nome + '</button>'; }).join("") + '</div>' +
          (modoR === "mao" ? '<div class="ve-chips"><button type="button" data-rsmao="qq"' + ((rs.mao || "qq") === "qq" ? ' class="on"' : "") + '>Qualquer mão</button><button type="button" data-rsmao="e"' + (rs.mao === "e" ? ' class="on"' : "") + '>Mão da esquerda da tela</button><button type="button" data-rsmao="d"' + (rs.mao === "d" ? ' class="on"' : "") + '>Mão da direita da tela</button></div>' : "")) +
        '<div class="ve-linha"><button class="ve-bt pri" type="button" data-acao="rsRastrear">' + (modoR === "manual" ? (ESCOLHENDO_PT === c.id ? "👆 TOQUE NO PONTO NA PRÉVIA…" : "🎯 ESCOLHER O PONTO E RASTREAR") : "⌖ RASTREAR") + '</button></div>' +
        (rs.pts ? '<p class="ve-sub">DEPOIS DE RASTREAR</p><p class="ve-nota" style="margin:0 0 4px">✓ Seguindo' + (rs.achou != null ? " (achado em " + Math.round(rs.achou * 100) + "% dos quadros; o resto foi completado)" : "") + '. Arraste o item na prévia para ajustar onde ele fica em relação ao ponto.</p>' +
          faixaR("rs:suave", "Suavizar o movimento", 0, 100, rs.suave == null ? 30 : rs.suave, "%") + '<div class="ve-chips"><button type="button" data-rstam="1"' + (rs.tam ? ' class="on"' : "") + '>Acompanhar o tamanho (perto/longe)</button><button type="button" data-acao="rsCentro">⊙ Centralizar no ponto</button></div>' +
          '<div class="ve-linha"><button class="ve-bt" type="button" data-acao="rsParar">✕ PARAR DE SEGUIR</button></div>' : "")), !rs.pts); }
    /* 22/11 23:23 (dono: "máscara por SELEÇÃO, não só o automático nas pessoas — às vezes queremos mascarar objetos"): a pessoa desenha a área
       na prévia (retângulo, elipse ou à mão livre) e escolhe: objeto NA FRENTE dos textos, mostrar SÓ a área ou ESCONDER a área. Pontos guardados em
       fração do take (acompanham tamanho e posição dele). */
    if (visual && c.tipo !== "texto" && c.tipo !== "elemento") { var sm = c.selm || {}, temSm = sm.pts && sm.pts.length > 1, formas = [["ret", "▭ Retângulo"], ["elipse", "◯ Elipse"], ["livre", "✎ À mão livre"]], modos = [["frente", "Objeto na frente dos textos"], ["so", "Mostrar só a área"], ["esconder", "Esconder a área"]];
      h += g("selm", "MÁSCARA POR SELEÇÃO (OBJETOS)", '<p class="ve-nota" style="margin:0 0 6px">Para um objeto, uma placa, o palco… Escolha a forma e desenhe com o dedo/mouse na prévia.</p>' +
        '<div class="ve-chips">' + formas.map(function (f) { return '<button type="button" data-smforma="' + f[0] + '"' + ((sm.forma || "ret") === f[0] ? ' class="on"' : "") + '>' + f[1] + '</button>'; }).join("") + '</div>' +
        '<div class="ve-linha"><button class="ve-bt' + (SELDES === c.id ? " on" : " pri") + '" type="button" data-acao="smDesenhar">' + (SELDES === c.id ? "✓ PRONTO (parar de desenhar)" : (temSm ? "✎ DESENHAR DE NOVO" : "✎ DESENHAR NA PRÉVIA")) + '</button>' + (temSm ? '<button class="ve-bt" type="button" data-acao="smLimpar">✕ TIRAR</button>' : "") + '</div>' +
        (temSm ? '<p class="ve-sub">O QUE FAZER COM A ÁREA</p><div class="ve-chips">' + modos.map(function (m) { return '<button type="button" data-smmodo="' + m[0] + '"' + ((sm.modo || "frente") === m[0] ? ' class="on"' : "") + '>' + m[1] + '</button>'; }).join("") + '</div>' +
          faixaR("sm:borda", "Borda suave", 0, 100, sm.borda == null ? 20 : sm.borda, "%") + '<div class="ve-chips"><button type="button" data-sminv="1"' + (sm.inv ? ' class="on"' : "") + '>⇄ Inverter a área</button></div>' : ""), !temSm && SELDES !== c.id); }
    if (visual && c.tipo !== "texto" && c.tipo !== "elemento") h += g("chroma", "CHROMA KEY (TIRAR FUNDO VERDE)", '<div class="ve-chips"><button type="button" data-ck="0"' + (!c.ck ? ' class="on"' : "") + '>Desligado</button><button type="button" data-ck="1"' + (c.ck ? ' class="on"' : "") + '>Ligado</button></div>' +
      (c.ck ? '<div class="ve-chips"><button type="button" data-ckmodo="auto"' + (c.ckModo !== "manual" ? ' class="on"' : "") + '>⚡ Automático</button><button type="button" data-ckmodo="manual"' + (c.ckModo === "manual" ? ' class="on"' : "") + '>🎚 Manual</button></div>' +
        '<label class="um"><span>Cor do fundo</span><input type="color" data-p="ckCor" value="' + esc(c.ckCor || "#00d000") + '" aria-label="Cor do fundo a tirar"></label><div class="ve-linha"><button class="ve-bt" type="button" data-acao="ckPegar">🎯 ESCOLHER NA TELA</button><button class="ve-bt" type="button" data-acao="ckAuto">✦ ACHAR SOZINHO</button></div>' +
        (c.ckModo !== "manual" ? '<p class="ve-nota" style="margin:6px 0 4px">NÍVEL — cada nível tira mais fundo, suaviza mais a borda e guarda mais sombra. Suba um de cada vez até o fundo sumir.</p><div class="ve-chips">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-cknivel="' + n + '"' + ((c.ckNivel || 3) === n ? ' class="on"' : "") + ' aria-label="Nível ' + n + '">' + n + (n === 1 ? " leve" : n === 5 ? " forte" : "") + '</button>'; }).join("") + '</div><p class="ve-nota" style="margin:0 0 4px">Não chegou no ponto? Toque em 🎚 Manual: os controles já abrem nos valores deste nível.</p>'
          : faixaR("ckInt", "Intensidade", 0, 100, c.ckInt == null ? 35 : c.ckInt, "%") + faixaR("ckSuave", "Suavizar borda", 0, 100, c.ckSuave == null ? 20 : c.ckSuave, "%") + faixaR("ckLimpa", "Limpar borda", 0, 100, c.ckLimpa == null ? 60 : c.ckLimpa, "%") + faixaR("ckSombra", "Sombra", 0, 100, c.ckSombra || 0, "%")) +
        '<p class="ve-nota" style="margin:6px 0 0">Ponha este clipe na camada SOBREPOSIÇÃO e o fundo novo na camada VÍDEO, no mesmo trecho. Tudo é feito neste aparelho.</p>' : '<p class="ve-nota" style="margin:0">Para vídeo ou foto gravados com fundo verde ou azul liso.</p>'), true);
    h += g("tempo", "TEMPO E CAMADA", faixaR("fin", "Entra suave", 0, 3, c.fin || 0, " s", 0.1) + faixaR("fout", "Sai suave", 0, 3, c.fout || 0, " s", 0.1) + faixaR("dur", "Duração", 0.2, Math.min(120, Math.round(maxDur(c) * 10) / 10), Math.round(c.dur * 10) / 10, " s", 0.1) +
      (visual ? '<label class="um"><span>Camada</span><select data-p="trilha" aria-label="Camada do clipe">' + trilhas().filter(function (x) { return fam(x[0]) === famDoClip(c); }).map(function (x) { return '<option value="' + x[0] + '"' + (c.trilha === x[0] ? " selected" : "") + '>' + x[1].charAt(0) + x[1].slice(1).toLowerCase() + (x[0] === "v1" ? " (embaixo)" : "") + '</option>'; }).join("") + '<option value="+">＋ Camada nova (em cima)</option>' + '</select></label>' : ""), c.tipo === "texto");
    b.innerHTML = h;
  }
  function tudo(semHist) { if (P.trExtra && P.trExtra.length) P.trExtra = P.trExtra.filter(function (t) { return !P.clips.some(function (c) { return c.trilha === t; }); }); desenharTL(); desenharProp(); desenhar(); guardar(); if (!semHist) marcarHist(); }
  function verTransicao(c) { if (!transDe(c) || !anteriorDe(c)) return; parar(); irPara(Math.max(0, c.ini - 0.4)); tocar(); var fim = c.ini + transDe(c) + 0.5, olha = function () { if (!TOCANDO) return; if (T >= fim) parar(); else setTimeout(olha, 60); }; olha(); }
  /* PRÉVIA LEVE (22/11, dono: "o computador é bem exigido"): enquanto se edita, a prévia é desenhada em no máximo 1280 px no lado maior
     (o mesmo "preview scaling" dos editores de mesa); exportar e salvar quadro voltam ao tamanho real. Tudo é medido em % de W/H, então só a nitidez muda. */
  var CHEIA = false; try { CHEIA = localStorage.getItem("ui_ve_previa") === "cheia"; } catch (e) {}
  var FORCAR_REAL = false;
  function tamReal() { return P.fmt === "livre" && P.w && P.h ? [P.w, P.h] : FMT[P.fmt] || FMT["9:16"]; }
  function escalaPrev() { var f = tamReal(); return (CHEIA || FORCAR_REAL || GRAV) ? 1 : Math.min(1, 1280 / Math.max(f[0], f[1])); }
  var SAIDA = null;   /* tamanho de saída escolhido na janela de EXPORTAR (ex.: YouTube 4K a partir de um projeto 1080p) */
  function tamanhoReal(sim, saida) { FORCAR_REAL = !!sim; SAIDA = sim && saida ? saida : null; formato(); }
  document.addEventListener("change", function (e) { if (e.target && e.target.id === "vePreviaCheia") { CHEIA = e.target.checked; try { localStorage.setItem("ui_ve_previa", CHEIA ? "cheia" : "leve"); } catch (x) {} formato(); desenharProp(); aviso(CHEIA ? "Prévia em tamanho cheio (mais pesada)." : "Prévia leve ligada: edição mais solta; o vídeo sai no tamanho real."); } });
  function formato() { var f = tamReal(), k = escalaPrev(), par = function (v) { v = Math.round(v * k); return v - v % 2; }; var fw = SAIDA ? SAIDA[0] : par(f[0]), fh = SAIDA ? SAIDA[1] : par(f[1]); if (cv.width !== fw || cv.height !== fh) { cv.width = fw; cv.height = fh; } $("veFmt").value = P.fmt; var l = $("veLivre"); if (l) { l.hidden = P.fmt !== "livre"; $("veLargura").value = f[0]; $("veAltura").value = f[1]; } desenhar(); }

  /* ---------- exportar (gravado pelo navegador, no tempo do vídeo) ---------- */
  function tipoGravacao() { var ts = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]; for (var i = 0; i < ts.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(ts[i])) return ts[i]; return ""; }
  /* EXPORTAR (22/11, dono: "janela de exportação com ultra qualidade, YouTube 4K, Full HD, Instagram, só o áudio, sequência de imagens,
     outro codec"). op = {mime, ext, vbps, abps, fps, saida:[w,h], nome, audio:"wav"|"m4a"|"opus"}. Grava no tempo do vídeo (MediaRecorder),
     com os ARQUIVOS ORIGINAIS (nunca o proxy) e no tamanho de saída; no fim volta para a prévia leve e para os proxies. */
  function exportar(op) {
    op = op || {};
    if (!P.clips.length) { aviso("A linha do tempo está vazia.", true); return; }
    var soAudio = !!op.audio, tipo = op.mime || (soAudio ? "" : tipoGravacao());
    if (!soAudio && (!tipo || !cv.captureStream)) { aviso("Este navegador não grava vídeo — use o Chrome ou o app BW", true); return; }
    parar(); var a = audioCtx(); if (a && a.state === "suspended") a.resume();
    usarOriginais(true); if (!soAudio) tamanhoReal(true, op.saida);   /* tamanho de saída, nunca o da prévia leve */
    var fps = op.fps || 30, fluxo = null, mr = null, partes = [], wav = null, cancelado = false;
    function voltar() { GRAV = null; tamanhoReal(false); usarOriginais(false); $("veOcup").hidden = true; if (fluxo) fluxo.getVideoTracks().forEach(function (t) { t.stop(); }); }
    function entregar(blob, nome) {
      window.__veSaida = {blob: blob, tipo: blob.type, bytes: blob.size, nome: nome, op: op};
      var url = URL.createObjectURL(blob), vd = $("veVideoPronto"); vd.hidden = soAudio && op.audio !== "m4a" && op.audio !== "opus" ? true : false; vd.src = url;
      $("veBaixar").href = url; $("veBaixar").download = nome;
      $("veSaidaTxt").textContent = (soAudio ? "Áudio pronto · " : "Vídeo pronto · ") + (blob.size / 1048576).toFixed(1).replace(".", ",") + " MB · " + nome + (!soAudio && !/mp4/.test(blob.type) ? " · WebM" : "");
      $("veSaida").hidden = false; $("veSaida")._blob = blob; $("veSaida")._nome = nome;
      salvarNaPasta("export", nome, blob).then(function (ok) { if (ok) $("veSaidaTxt").textContent += " · salvo na pasta " + ok; });
    }
    var base = (op.nome || (P.nome || "video-brightway")).replace(/[^\w\-]+/g, "-");
    if (op.audio === "wav") {
      if (!ACTX || !MESTRE) { voltar(); aviso("O som não ligou neste navegador.", true); return; }
      var L = [], R = [], proc = ACTX.createScriptProcessor(4096, 2, 2); proc.onaudioprocess = function (ev) { if (!GRAV || !TOCANDO) return; L.push(new Float32Array(ev.inputBuffer.getChannelData(0))); R.push(new Float32Array(ev.inputBuffer.getChannelData(1))); };
      MESTRE.connect(proc); proc.connect(ACTX.destination);
      wav = {fim: function () { try { MESTRE.disconnect(proc); proc.disconnect(); } catch (e) {} if (cancelado) return; entregar(wavDe(L, R, ACTX.sampleRate, op.bits || 24), base + ".wav"); }};
    } else {
      fluxo = soAudio ? new MediaStream() : cv.captureStream(fps); if (DEST) DEST.stream.getAudioTracks().forEach(function (t) { fluxo.addTrack(t); });
      var cfgR = {mimeType: tipo}; if (!soAudio) cfgR.videoBitsPerSecond = Math.round(op.vbps || lim(6e6 * cv.width * cv.height / (720 * 1280), 4e6, 40e6)); cfgR.audioBitsPerSecond = op.abps || 192000;
      try { mr = new MediaRecorder(fluxo, cfgR); } catch (e) { voltar(); aviso("Este navegador não grava nesse formato (" + tipo + "). Escolha outro na janela de exportar.", true); return; }
      mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
      mr.onstop = function () { var tp = (tipo.split(";")[0]) || (soAudio ? "audio/webm" : "video/webm"); voltar(); if (cancelado) { aviso("Exportação cancelada."); return; }
        var ext = op.ext || (/mp4/.test(tp) ? (soAudio ? "m4a" : "mp4") : soAudio ? "webm" : "webm");
        entregar(new Blob(partes, {type: tp}), base + "." + ext); };
    }
    GRAV = {prog: function (p) { $("veProg").value = p; $("veOcupTxt").textContent = (soAudio ? "Gravando o áudio" : "Gravando o vídeo") + " · " + Math.round(p * 100) + "% · faltam " + fmtT(total() * (1 - p)) + " — deixe esta tela aberta"; },
      fim: function () { setTimeout(function () { if (mr) { try { mr.stop(); } catch (e) {} } else { var w = wav; voltar(); if (w) w.fim(); } }, 180); },
      cancelar: function () { cancelado = true; parar(); if (mr) { try { mr.stop(); } catch (e) {} } else { voltar(); aviso("Exportação cancelada."); } }};
    $("veOcupTxt").textContent = (soAudio ? "Gravando o áudio… " : "Gravando o vídeo… ") + "deixe esta tela aberta (" + fmtT(total()) + ")"; $("veProg").value = 0; $("veOcup").hidden = false;
    T = 0; desenhar(); setTimeout(function () { if (mr) mr.start(500); tocar(); }, 450);   /* dá tempo de os originais carregarem */
  }
  function wavDe(L, R, sr, bits) {
    var n = L.reduce(function (t, x) { return t + x.length; }, 0), by = bits === 16 ? 2 : 3, buf = new ArrayBuffer(44 + n * 2 * by), v = new DataView(buf), p = 0;
    function txt(t) { for (var i = 0; i < t.length; i++) v.setUint8(p++, t.charCodeAt(i)); } function u32(x) { v.setUint32(p, x, true); p += 4; } function u16(x) { v.setUint16(p, x, true); p += 2; }
    txt("RIFF"); u32(36 + n * 2 * by); txt("WAVE"); txt("fmt "); u32(16); u16(1); u16(2); u32(sr); u32(sr * 2 * by); u16(2 * by); u16(bits === 16 ? 16 : 24); txt("data"); u32(n * 2 * by);
    var max = bits === 16 ? 32767 : 8388607;
    for (var b = 0; b < L.length; b++) for (var i = 0; i < L[b].length; i++) for (var c = 0; c < 2; c++) { var s = Math.max(-1, Math.min(1, (c ? R : L)[b][i])), x = Math.round(s * max);
      if (by === 2) { v.setInt16(p, x, true); p += 2; } else { v.setUint8(p++, x & 255); v.setUint8(p++, (x >> 8) & 255); v.setUint8(p++, (x >> 16) & 255); } }
    return new Blob([buf], {type: "audio/wav"});
  }

  /* ---------- ligações ---------- */
  /* 23/11 (dono, iPhone: "clica e não abre nada"): no iPhone o seletor só abre com toque DIRETO num <input file> ou no <label> dele — o click() por
     código não abria. O ＋ IMPORTAR é um <label for="veArq"> (video.html) e o input mora dentro dele; aqui fica só o caminho do teclado. */
  $("veImportar").addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("veArq").click(); } });
  $("veArq").onchange = function () { var fs = [].slice.call(this.files || []); this.value = ""; if (fs.length) importar(fs); };
  $("veCriacoes").onclick = criacoes;
  $("veArqTroca").onchange = function () { var f = (this.files || [])[0]; this.value = ""; substituirCom(f); };
  $("veTexto").onclick = function () { return addTexto.apply(this, arguments); };
  function menuElementos(x, y) { var itens = Object.keys(ELEMENTOS).map(function (k) { return {rot: ELEMENTOS[k], fn: function () { addElemento(k); }}; });
    if (window.BWFerr && BWFerr.menu) BWFerr.menu(x, y, itens, "ELEMENTO ANIMADO", true); else addElemento("fogo"); }
  if ($("veElem")) $("veElem").onclick = function (e) { var r = this.getBoundingClientRect(); menuElementos(r.left, r.bottom + 4); };
  $("veSons").onclick = function () { ABA = "audio"; desenharLib(); };
  /* 23/11 (dono: "um botão à esquerda que abre a biblioteca de transições e efeitos; pegar, arrastar e soltar no local"): no PC abre o painel MÍDIA
     na aba de transições (a de efeitos fica ao lado); no celular abre a folha. O arrastar-e-soltar das abas já existia (take ou emenda). */
  function abrirBib(aba) { if (window.VEApp && VEApp.ligado) { VEApp.abrir(aba === "efe" ? "efe" : "trans"); return; } if (window.__veVista && __veVista.mostrar) __veVista.mostrar("esq"); ABA = aba === "efe" ? "efe" : "trans"; desenharLib();
    var l = $("veLib"); if (l) { try { l.scrollIntoView({block: "nearest"}); } catch (e) {} l.classList.remove("pisca"); void l.offsetWidth; l.classList.add("pisca"); setTimeout(function () { l.classList.remove("pisca"); }, 1200); }
    aviso("Pegue, arraste e solte no take" + (ABA === "trans" ? " ou na emenda entre dois" : "")); }
  if ($("veBib")) $("veBib").onclick = function () { abrirBib("trans"); };
  $("veAbas").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (b) { ABA = b.dataset.aba; desenharLib(); } });
  $("veLib").addEventListener("click", async function (e) {
    if (Date.now() - LD_FIM < 400) return;   /* o clique que vem depois de arrastar não conta */
    if (e.target.closest("[data-pf],[data-pfa],[data-pfd],[data-pfouvir]")) { cliquePasta(e); return; }
    var fxb = e.target.closest("[data-arr]"); if (fxb) { var kk = fxb.dataset.arr;
      if (kk.charAt(0) === "t") { var em = emendaNaAgulha(); if (em) { aplicarFx(em, "t", kk.slice(2), true); aviso("◧ Transição “" + TRANS[kk.slice(2)] + "” na emenda da agulha — arraste o ◆ para mudar o tempo."); verTransicao(em); return; }
        var s0 = sel(); if (s0 && anteriorDe(s0)) { aplicarFx(s0, "t", kk.slice(2)); return; }
        aviso("Ponha a agulha na emenda entre dois takes (o ◆ acende)", true); return; }
      aplicarFx(sel(), kk.charAt(0), kk.slice(2)); return; }
    var rt = e.target.closest("[data-retry]"); if (rt) { e.stopPropagation(); var mr = MID[rt.dataset.retry]; if (!mr) return; aviso("⏳ Tentando abrir " + mr.nome + " de novo…");
      var r2 = await abrirVideo(mr, mr.tipo === "video", 30000); if (r2.ok && (mr.tipo !== "video" || r2.capa)) { mr.ruim = false; mr.capa = r2.capa || mr.capa; if (r2.dur) mr.dur = r2.dur; aviso("✓ " + mr.nome + " abriu."); } else aviso("⚠ " + mr.nome + " continua sem abrir neste navegador" + (mr.codec === "hevc" ? " (é HEVC/H.265)." : "."), true); desenharLib(); tudo(); return; }
    var d = e.target.closest("[data-del]"); if (d) { e.stopPropagation(); var id = d.dataset.del; if (P.clips.some(function (c) { return c.mid === id; }) && !confirm("Este arquivo está na linha do tempo. Tirar da biblioteca apaga os clipes dele. Continuar?")) return; P.clips.filter(function (c) { return c.mid === id; }).forEach(function (c) { soltarEl(c.id); }); P.clips = P.clips.filter(function (c) { return c.mid !== id; }); if (MID[id]) URL.revokeObjectURL(MID[id].url); delete MID[id]; if (window.BWMascara) BWMascara.apagar(id); await tx("midias", "readwrite", function (s) { return s.delete(id); }); desenharLib(); tudo(); return; }
    var tp = e.target.closest("[data-texto]"); if (tp) { porTextoPronto(tp.dataset.texto); if (window.VEApp && VEApp.aberta && VEApp.aberta()) VEApp.fechar(); return; }
    var ep = e.target.closest("[data-elem]"); if (ep) { addElemento(ep.dataset.elem); if (window.VEApp && VEApp.aberta && VEApp.aberta()) VEApp.fechar(); return; }
    var s = e.target.closest("[data-som]"); if (s) { var ms = await porSom(+s.dataset.som); addClip(ms); if (window.VEApp && VEApp.aberta && VEApp.aberta() === "midia") VEApp.fechar(); aviso("✓ " + SONS[+s.dataset.som][1] + " na linha do tempo (" + (ms.som === "sfx" ? "EFEITOS, na posição da agulha" : "TRILHA") + ")."); return; }
    var ed = e.target.closest("[data-editar]"); if (ed) { e.stopPropagation(); editarNaOrigem(ed.dataset.editar); return; }
    var m = e.target.closest("[data-mid]"); if (!m || !MID[m.dataset.mid]) return; var mm = MID[m.dataset.mid], cs = sel();
    if (cs && cs.ph && mm.tipo !== "audio" && cs.tipo !== "audio") { trocarEspaco(cs, mm); return; }
    if (cs && cs.phMusica && mm.tipo === "audio") { cs.mid = mm.id; cs.corte = 0; delete cs.phMusica; soltarEl(cs.id); cs.dur = Math.min(cs.dur, mm.dur || cs.dur); tudo(); aviso("🎵 Música do modelo trocada."); return; }
    var nc = addClip(mm);
    if (window.VEApp && VEApp.aberta && VEApp.aberta() === "midia") VEApp.fechar();   /* no celular a folha fechava só no ✕ e parecia que nada tinha entrado */
    aviso((mm.ruim ? "⚠ " : "✓ ") + mm.nome + " na linha do tempo (" + infoTr(nc.trilha)[0] + ", em " + fmtT(nc.ini) + ")" + (mm.ruim ? " — mas este arquivo não abre neste navegador." : "."), !!mm.ruim);
  });
  $("veLib").addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".ve-item")) { e.preventDefault(); e.target.click(); } });
  $("vePlay").onclick = function () { if (TOCANDO) parar(); else tocar(); };
  $("veInicio").onclick = function () { irPara(0); $("veRolo").scrollLeft = 0; };
  $("veDesf").onclick = desfazer; $("veRef").onclick = refazer; $("veApIni").onclick = function () { aparar("ini"); }; $("veApFim").onclick = function () { aparar("fim"); }; $("veCortar").onclick = function () { return dividir.apply(this, arguments); }; $("veDuplicar").onclick = function () { return duplicar.apply(this, arguments); }; $("veApagar").onclick = function () { return apagar.apply(this, arguments); };
  $("veZoomMais").onclick = function () { PPS = Math.min(200, Math.round(PPS * 1.4)); desenharTL(); }; $("veZoomMenos").onclick = function () { PPS = Math.max(12, Math.round(PPS / 1.4)); desenharTL(); };
  $("veFmt").onchange = function () { var tr = tamReal(); P.fmt = this.value; if (P.fmt === "livre" && !P.w) { P.w = tr[0]; P.h = tr[1]; } formato(); guardar(); };
  ["veLargura", "veAltura"].forEach(function (id) { $(id).onchange = function () { if (P.fmt !== "livre") return; var par = function (v) { v = Math.round(Number(v) || 0); return lim(v - v % 2, 240, 4096); }; P.w = par($("veLargura").value); P.h = par($("veAltura").value); formato(); guardar(); aviso("Tamanho " + P.w + " × " + P.h + " px."); }; });
  $("veNovo").onclick = function () { if (P.clips.length && !confirm("Começar um vídeo novo? A linha do tempo atual é apagada (a biblioteca de mídia continua).")) return; parar(); Object.keys(EL).forEach(soltarEl); P = {fmt: P.fmt, clips: []}; SEL = null; T = 0; tudo(); aviso(""); };
  $("veExportar").onclick = function () { abrirExportar(); }; $("veCancelar").onclick = function () { if (GRAV) GRAV.cancelar(); };
  $("veFecharSaida").onclick = function () { $("veSaida").hidden = true; try { $("veVideoPronto").pause(); } catch (e) {} };
  $("veCompartilhar").onclick = async function () { var s = $("veSaida"), f = new File([s._blob], s._nome, {type: s._blob.type}); try { if (navigator.canShare && navigator.canShare({files: [f]})) await navigator.share({files: [f]}); else $("veBaixar").click(); } catch (e) {} };
  $("vePropCorpo").addEventListener("input", function (e) { var el = e.target, k = el.dataset.p, c = sel(); if (!k || !c) return;
    if (k.indexOf("rs:") === 0) { c.rastro = c.rastro || {}; c.rastro[k.slice(3)] = +el.value; var o4 = el.nextElementSibling; if (o4) o4.textContent = el.value + "%"; desenhar(); guardar(); marcarHist(); return; }
    if (k.indexOf("sm:") === 0) { c.selm = c.selm || {}; c.selm[k.slice(3)] = +el.value; var o3 = el.nextElementSibling; if (o3) o3.textContent = el.value + "%"; desenhar(); guardar(); marcarHist(); return; }
    if (k.indexOf("ia:") === 0) { c.ia = c.ia || {}; c.ia[k.slice(3)] = el.type === "range" ? +el.value : el.value; if (el.type === "range") { var o2 = el.nextElementSibling; if (o2) o2.textContent = el.value + "%"; } desenhar(); guardar(); marcarHist(); return; }
    if (k === "volDb") { var db = +el.value; c.vol = db <= -40 ? 0 : Math.round(100 * Math.pow(10, db / 20)); var oo = el.nextElementSibling; if (oo) oo.textContent = db <= -40 ? "mudo" : String(db).replace(".", ",") + " dB"; desenharTL(); desenhar(); guardar(); marcarHist(); return; }
    if (k.indexOf("g:") === 0) { c.grade = c.grade || {}; c.grade[k.slice(2)] = +el.value; c.look = ""; var o0 = el.nextElementSibling; if (o0) o0.textContent = el.value; desenhar(); guardar(); marcarHist(); return; } var v = el.type === "range" ? +el.value : el.value;
    if (k === "trilha" && v === "+") { v = novaTrilha(famDoClip(c)); c.trilha = v; desenharTL(); desenharProp(); desenhar(); guardar(); marcarHist(); aviso("＋ Camada nova: " + infoTr(v)[0] + "."); return; }
    if (k === "dur") v = lim(v, 0.2, maxDur(c)); if (k === "transDur") { if (c.trans) c.trans.dur = v; } else c[k] = v; if (el.type === "range") { var o = el.nextElementSibling; if (o) o.textContent = String(v).replace(".", ",") + (o.textContent.replace(/^[\d.,\-]+/, "")); }
    if (k === "anima") desenharProp();
    if (k === "trilha" || k === "dur" || k === "txt" || k === "transDur" || k === "anima") desenharTL(); desenhar(); guardar(); marcarHist(); });
  $("vePropCorpo").addEventListener("click", function (e) { var b = e.target.closest("button"), c = sel(); if (!b || !c) return;
    if (b.hasAttribute("data-vel")) mudarVel(c, +b.dataset.vel);
    else if (b.hasAttribute("data-trans")) { var k = b.dataset.trans; c.trans = k ? {tipo: k, dur: (c.trans && c.trans.dur) || 0.6} : null; tudo(); if (k) { verTransicao(c); aviso("Transição “" + TRANS[k] + "”" + (anteriorDe(c) ? "." : " — encoste o clipe no fim de outro para ela aparecer.")); } }
    else if (b.hasAttribute("data-efeito")) { c.efeito = b.dataset.efeito || ""; if (c.efeito && c.efInt == null) c.efInt = 85; tudo(); }
    else if (b.hasAttribute("data-ck")) { c.ck = b.dataset.ck === "1"; if (c.ck && !c.ckCor) { c.ckCor = corDoFundo(c) || "#00d000"; c.ckModo = "auto"; porNivel(c, nivelDoFundo(c)); } tudo(); if (c.ck) aviso("Chroma key ligado — fundo " + c.ckCor + (c.ckModo !== "manual" ? ", nível " + (c.ckNivel || 3) + ". Sobrou fundo? Suba o nível." : ".")); }
    else if (b.hasAttribute("data-ckmodo")) { c.ckModo = b.dataset.ckmodo; if (c.ckModo === "auto") porNivel(c, c.ckNivel || 3); tudo(); }
    else if (b.hasAttribute("data-cknivel")) { porNivel(c, +b.dataset.cknivel); tudo(); aviso("Nível " + c.ckNivel + " de 5."); }
    else if (b.dataset.acao === "ckAuto") { var ach = corDoFundo(c); if (ach) { c.ckCor = ach; if (c.ckModo !== "manual") porNivel(c, nivelDoFundo(c)); tudo(); aviso("Fundo encontrado: " + ach + (c.ckModo !== "manual" ? " — nível " + c.ckNivel + " indicado para esta imagem." : ".")); } else aviso("Não achei um fundo verde ou azul nas bordas — use ESCOLHER NA TELA.", true); }
    else if (b.dataset.acao === "ckPegar") { PEGAR_CK = true; cv.style.cursor = "crosshair"; aviso("🎯 Toque no FUNDO do vídeo, na prévia, para escolher a cor."); }
    else if (b.dataset.acao === "congelar") congelar();
    else if (e.target.closest("[data-predel]")) { var ip = +e.target.closest("[data-predel]").dataset.predel, lp = predefCor(); if (lp[ip] && confirm("Apagar a predefinição “" + lp[ip].nome + "”?")) { lp.splice(ip, 1); predefCor(lp); desenharProp(); aviso("Predefinição apagada."); } }
    else if (b.hasAttribute("data-realce")) { var rl = BWCor.REALCE[+b.dataset.realce]; if (rl) { c.grade = c.grade || {}; if (rl[1]) c.grade.vib = rl[1]; else delete c.grade.vib; tudo(); aviso(rl[1] ? "Realce de cor: " + rl[0] : "Realce de cor desligado"); } }
    else if (b.hasAttribute("data-look")) { var lk = BWCor.LOOKS[b.dataset.look]; c.grade = lk ? comCorr(c, lk.g) : {}; if (!lk) delete c.corr; c.look = b.dataset.look; tudo(); aviso(lk ? "Cor “" + lk.nome + "” — ajuste as barras à vontade." : "Cor original."); }
    else if (b.hasAttribute("data-predef")) { var pr = predefCor()[+b.dataset.predef]; if (pr) { c.grade = comCorr(c, pr.g); c.look = "p" + b.dataset.predef; tudo(); aviso("Predefinição “" + pr.nome + "” aplicada."); } }
    else if (b.dataset.acao === "corZerar") { delete c.grade; delete c.corr; c.look = ""; tudo(); aviso("Cor zerada (original)."); }
    else if (b.dataset.acao === "corTodos") corEmTodos(c);
    else if (b.dataset.acao === "iaAnalisar") analisarPessoa(c);
    else if (b.dataset.acao === "iaCancelar") { BWMascara.cancelar(); }
    else if (b.dataset.acao === "iaModelos") { if (window.VEModelos) VEModelos.abrir("mascara"); }
    else if (b.hasAttribute("data-elk")) { c.el = b.dataset.elk; tudo(); }
    else if (b.dataset.acao === "elCorZero") { delete c.cor; tudo(); }
    else if (b.hasAttribute("data-rsmodo")) { c.rastro = Object.assign({}, c.rastro || {}, {modo: b.dataset.rsmodo, ponto: null}); if (c.rastro.pts && c.rastro.modoFeito !== b.dataset.rsmodo) {} desenharProp(); }
    else if (b.hasAttribute("data-rsponto")) { c.rastro = Object.assign({}, c.rastro || {}, {ponto: b.dataset.rsponto}); desenharProp(); }
    else if (b.hasAttribute("data-rsmao")) { c.rastro = Object.assign({}, c.rastro || {}, {mao: b.dataset.rsmao}); desenharProp(); }
    else if (b.dataset.acao === "rsRastrear") { var rr0 = c.rastro || {}; if ((rr0.modo || "mao") === "manual") { ESCOLHENDO_PT = ESCOLHENDO_PT === c.id ? null : c.id; if (ESCOLHENDO_PT && APP) { var fe3 = $("vaSheetOk"); if (fe3) fe3.click(); } desenharProp(); if (ESCOLHENDO_PT) aviso("👆 Toque no ponto que o item vai seguir (no take de baixo)."); } else rastrear(c); }
    else if (b.dataset.acao === "rsCancelar") { if (window.BWRastreio) BWRastreio.cancelar(); }
    else if (b.dataset.acao === "rsParar") { var pos = rastroEm(c, T); if (pos) { c.x = Math.round(pos.x + (c.x || 0)); c.y = Math.round(pos.y + (c.y || 0)); } delete c.rastro; tudo(); aviso("O item parou de seguir (ficou onde estava)."); }
    else if (b.dataset.acao === "rsCentro") { c.x = 0; c.y = 0; tudo(); }
    else if (b.hasAttribute("data-rstam")) { c.rastro.tam = !c.rastro.tam; if (c.rastro.tam) { var a2 = P.clips.filter(function (x) { return x.id === c.rastro.alvo; })[0], p2 = a2 && BWRastreio.em(c.rastro, a2.tipo === "video" ? (a2.corte || 0) + lim(T - a2.ini, 0, a2.dur) * vel(a2) : 0, c.rastro.suave); c.rastro.s0 = p2 && p2.s || 0; if (!c.rastro.s0) aviso("Este rastreio não mede tamanho (só mão e corpo medem).", true); } tudo(); }
    else if (b.hasAttribute("data-smforma")) { c.selm = c.selm || {}; c.selm.forma = b.dataset.smforma; SELDES = c.id; if (APP) { var fe2 = $("vaSheetOk"); if (fe2) fe2.click(); } desenharProp(); desenhar(); aviso("✎ Desenhe a área na prévia" + (c.selm.forma === "livre" ? " contornando o objeto." : " (arraste de um canto ao outro).")); }
    else if (b.dataset.acao === "smDesenhar") { SELDES = SELDES === c.id ? null : c.id; if (SELDES && APP) { var fe = $("vaSheetOk"); if (fe) fe.click(); } if (SELDES) { c.selm = c.selm || {}; aviso("✎ Desenhe a área na prévia" + ((c.selm.forma || "ret") === "livre" ? " contornando o objeto." : " (arraste de um canto ao outro).")); } desenharProp(); desenhar(); }
    else if (b.dataset.acao === "smLimpar") { delete c.selm; SELDES = null; tudo(); aviso("Máscara por seleção tirada."); }
    else if (b.hasAttribute("data-smmodo")) { c.selm.modo = b.dataset.smmodo; tudo(); }
    else if (b.hasAttribute("data-sminv")) { c.selm.inv = !c.selm.inv; tudo(); }
    else if (b.hasAttribute("data-iafrente")) { c.ia = c.ia || {}; c.ia.frente = b.dataset.iafrente === "1"; tudo(); }
    else if (b.hasAttribute("data-iafundo")) { c.ia = c.ia || {}; c.ia.fundo = b.dataset.iafundo; tudo(); }
    else if (b.hasAttribute("data-iacont")) { c.ia = c.ia || {}; c.ia.contorno = b.dataset.iacont === "1"; tudo(); }
    else if (b.hasAttribute("data-frente")) { c.frente = b.dataset.frente === "1"; tudo(); }
    else if (b.hasAttribute("data-ruido")) { c.ruido = +b.dataset.ruido; tudo(); aviso(c.ruido ? "Redução de ruído " + ["", "leve", "média", "forte"][c.ruido] + " (tira zumbido grave e chiado agudo)." : "Redução de ruído desligada."); }
    else if (b.hasAttribute("data-voz")) { c.voz = +b.dataset.voz; tudo(); }
    else if (b.dataset.acao === "mudo") { c.vol = c.vol === 0 ? 100 : 0; tudo(); }
    else if (b.dataset.acao === "normalizar") normalizar(c);
    else if (b.dataset.acao === "desnormalizar") { delete c.normG; tudo(); aviso("Normalização tirada."); }
    else if (b.dataset.acao === "extrair") extrairAudio(c);
    else if (b.dataset.acao === "corAuto") { corAuto(c); }
    else if (b.dataset.acao === "corSalvar") { if (!BWCor.ativo(c.grade)) { aviso("Mexa em alguma barra de cor antes de salvar.", true); return; } var lst = predefCor(), nm = (prompt("Nome da predefinição:", "Minha cor " + (lst.length + 1)) || "").trim().slice(0, 28); if (!nm) return; lst.push({nome: nm, g: JSON.parse(JSON.stringify(c.grade))}); predefCor(lst); c.look = "p" + (lst.length - 1); desenharProp(); aviso("★ “" + nm + "” salva neste aparelho: aparece em todo take e em todo projeto."); } });
  $("vePropCorpo").addEventListener("dblclick", function (e) { var el = e.target.closest('input[type="range"][data-p^="g:"]'), c = sel(); if (!el || !c) return; el.value = 0; el.dispatchEvent(new Event("input", {bubbles: true})); });
  /* CORREÇÃO AUTOMÁTICA (23/11): lê o quadro do take na agulha (se a agulha está fora do take, vai ao meio dele antes) e troca SÓ os campos de
     correção (BWCor.CORRECAO) — realce, estilo e o resto do ajuste ficam como estavam. Um passo no desfazer. */
  function comCorr(c, g0) { var g = JSON.parse(JSON.stringify(g0 || {})), k = c.corr || {}; Object.keys(k).forEach(function (x) { g[x] = lim(Math.round((+g[x] || 0) + (+k[x] || 0)), -100, 100); }); return g; }
  function corAuto(c, tent) { tent = tent || 0; var dentro = T >= c.ini && T < c.ini + c.dur; if (!dentro) { irPara(c.ini + Math.min(c.dur / 2, 1)); }
    var f = fonteDe(c, T, true); if (!f || !f.w) { if (tent < 12) { setTimeout(function () { corAuto(c, tent + 1); }, 150); } else aviso("Não consegui ler o quadro deste take", true); return; }
    var gA = BWCor.auto(f.el, f.w, f.h); if (!gA) { aviso("Não consegui ler o quadro deste take", true); return; }
    gravarHist(); c.grade = c.grade || {}; var ant = c.corr || {}; BWCor.CORRECAO.forEach(function (k) { var v = (+c.grade[k] || 0) - (+ant[k] || 0) + (+gA[k] || 0); if (Math.abs(v) < 1) delete c.grade[k]; else c.grade[k] = lim(Math.round(v), -100, 100); }); c.corr = gA; tudo(true); gravarHist();   /* a correção fica guardada à parte (c.corr): trocar de ESTILO não apaga ela — como os nós separados do DaVinci */
    aviso(Object.keys(gA).length ? "✦ Correção aplicada — ajuste fino nas barras, se quiser" : "Este take já está equilibrado — nada a corrigir"); }
  /* predefinições de cor: preferência só deste aparelho (ui_ve_cor_predef) — servem para todos os projetos */
  function predefCor(lista) { try { if (lista) { localStorage.setItem("ui_ve_cor_predef", JSON.stringify(lista.slice(0, 24))); return lista; } var l = JSON.parse(localStorage.getItem("ui_ve_cor_predef") || "[]"); return Array.isArray(l) ? l.filter(function (x) { return x && x.nome && x.g; }) : []; } catch (er) { return lista || []; } }
  function corEmTodos(c) { var n = 0; P.clips.forEach(function (x) { if (x !== c && (x.tipo === "video" || x.tipo === "imagem")) { if (c.grade) x.grade = JSON.parse(JSON.stringify(c.grade)); else delete x.grade; x.look = c.look || ""; n++; } }); tudo(); aviso(n ? "⇉ Mesma cor em mais " + n + " take" + (n > 1 ? "s" : "") + "." : "Não há outros takes de vídeo ou foto.", !n); }
  function porNivel(c, n) { n = lim(Math.round(n) || 3, 1, 5); var v = window.BWChroma && BWChroma.NIVEIS[n]; c.ckNivel = n; if (v) { c.ckInt = v.ckInt; c.ckSuave = v.ckSuave; c.ckLimpa = v.ckLimpa; c.ckSombra = v.ckSombra; } }
  function nivelDoFundo(c) { var f = fonteDe(c, lim(T, c.ini, c.ini + c.dur - 0.02), true); return f && window.BWChroma && c.ckCor ? BWChroma.nivelPara(f.el, f.w, f.h, c.ckCor) : 3; }
  function corDoFundo(c) { var f = fonteDe(c, lim(T, c.ini, c.ini + c.dur - 0.02), true); return f && window.BWChroma ? BWChroma.detectar(f.el, f.w, f.h) : null; }
  function pegarCor(fx, fy) { var c = sel(); PEGAR_CK = false; cv.style.cursor = ""; if (!c) return;
    SEM_CK = true; desenhar(); var x = lim(Math.round(fx * cv.width) - 2, 0, cv.width - 5), y = lim(Math.round(fy * cv.height) - 2, 0, cv.height - 5), d = null; try { d = cx.getImageData(x, y, 5, 5).data; } catch (e) {} SEM_CK = false;
    if (!d) { desenhar(); aviso("Não consegui ler a cor aqui — use a caixinha de cor.", true); return; }
    var r = 0, g = 0, b = 0, n = d.length / 4; for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
    c.ckCor = "#" + [r / n, g / n, b / n].map(function (v) { v = Math.round(v).toString(16); return v.length < 2 ? "0" + v : v; }).join(""); c.ck = true; if (c.ckModo !== "manual") porNivel(c, nivelDoFundo(c)); tudo(); aviso("Cor escolhida: " + c.ckCor + (c.ckModo !== "manual" ? " — nível " + c.ckNivel + "." : ". Ajuste a INTENSIDADE até o fundo sumir.")); }
  /* arrastar na linha do tempo: mover, aparar pelas alças, agulha na régua */
  var arr = null;
  function zoomEm(fator, clientX) { var ro = $("veRolo"), r = ro.getBoundingClientRect(), x = clientX == null ? ro.clientWidth / 2 : clientX - r.left, tt = (ro.scrollLeft + x) / PPS;
    PPS = lim(Math.round(PPS * fator), 8, 320); desenharTL(); ro.scrollLeft = Math.max(0, tt * PPS - x); }
  function encaixarTudo() { var ro = $("veRolo"); PPS = lim(Math.floor((ro.clientWidth - 30) / Math.max(5, total() + 1)), 8, 320); desenharTL(); ro.scrollLeft = 0; }
  $("veFaixas").addEventListener("pointerdown", function (e) {
    if (e.button === 2) return;
    var ro = $("veRolo"), xDe = function (ev) { return ev.clientX - $("veFaixas").getBoundingClientRect().left; }, F = window.BWFerr ? BWFerr.atual() : "v";
    if (F === "h") { arr = {tipo: "mao", x0: e.clientX, sl: ro.scrollLeft}; if (window.BWFerr) BWFerr.preso(true); e.preventDefault(); return; }
    if (F === "z") { zoomEm(e.altKey ? 1 / 1.5 : 1.5, e.clientX); e.preventDefault(); return; }
    var toqueApp = APP && e.pointerType !== "mouse";
    if (e.target.closest("#veRegua")) { if (toqueApp) return; arr = {tipo: "agulha", xDe: xDe}; irPara(xDe(e) / PPS); e.preventDefault(); return; }
    if (F === "t") { addTexto({t: Math.max(0, xDe(e) / PPS)}); BWFerr.trocar("v"); aviso("T Texto criado — escreva em AJUSTES."); e.preventDefault(); return; }
    if (F === "c") { var ec = e.target.closest("[data-clip]"); if (!ec) return; var tc = Math.max(0, xDe(e) / PPS), alvos = e.shiftKey ? P.clips.filter(function (x) { return tc > x.ini + 0.05 && tc < x.ini + x.dur - 0.05; }) : P.clips.filter(function (x) { return x.id === ec.dataset.clip; }), ult = null;
      alvos.forEach(function (x) { var d = dividirEm(x, tc); if (d) ult = d; }); if (ult) { SEL = ult.id; tudo(); aviso("✂ Cortado em " + fmtT(tc) + (e.shiftKey ? " (todas as camadas)" : "") + ". Shift + clique corta todas as camadas."); } e.preventDefault(); return; }
    var jt = e.target.closest("[data-junta],[data-trp]"); if (jt) { var cj = P.clips.filter(function (x) { return x.id === (jt.dataset.junta || jt.dataset.trp); })[0]; if (!cj) return;
      if (SEL !== cj.id) { SEL = cj.id; desenharProp(); } arr = {tipo: "trans", c: cj, x0: e.clientX, y0: e.clientY, dur0: transDe(cj) || 0.6, tinha: !!cj.trans, moveu: false}; e.preventDefault(); return; }
    var el = e.target.closest("[data-clip]"); if (!el) { if (toqueApp) return; if (e.pointerType === "mouse" && e.button === 0 && e.target.closest("[data-trilha],#veFaixas") && !e.target.closest("button")) { arr = {tipo: "laco", x0: e.clientX, y0: e.clientY, soma: e.shiftKey || e.ctrlKey || e.metaKey, antes: GRUPO.slice(), moveu: false}; e.preventDefault(); return; }
      limparGrupo(); if (SEL) { SEL = null; desenharTL(); desenharProp(); } return; }
    var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return; var al = e.target.dataset.al || "";
    if ((e.ctrlKey || e.metaKey || e.shiftKey) && e.pointerType === "mouse" && !al) { if (!GRUPO.length && SEL) GRUPO = [SEL]; var ig = GRUPO.indexOf(c.id); if (ig >= 0) GRUPO.splice(ig, 1); else GRUPO.push(c.id);
      SEL = GRUPO.length ? GRUPO[GRUPO.length - 1] : null; desenharTL(); desenharProp(); if (GRUPO.length > 1) aviso(GRUPO.length + " takes escolhidos — arraste um deles para mover todos; Delete apaga, Ctrl+C copia."); e.preventDefault(); return; }
    if (GRUPO.length > 1 && GRUPO.indexOf(c.id) >= 0 && !al && !toqueApp) { var gs = grupo(); SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x === el); }); desenharProp();
      arr = {tipo: "grupo", c: c, x0: e.clientX, y0: e.clientY, itens: gs.map(function (x) { return {c: x, ini: x.ini, el: $("veFaixas").querySelector('[data-clip="' + x.id + '"]')}; }), min: Math.min.apply(null, gs.map(function (x) { return x.ini; })), moveu: false}; e.preventDefault(); return; }
    limparGrupo();
    /* no app, dedo em take NÃO escolhido rola a linha do tempo e o toque (click) escolhe — ve-app.js. 22/11 (dono): SEGURAR o dedo parado ~0,3 s
       PEGA o take e já arrasta (antes segurar abria o menu e atrapalhava o arraste; o menu ficou no ⋯ MAIS) */
    if (toqueApp && SEL !== c.id) { segurarPegar(e, el, c, al); return; }
    if (SEL !== c.id) { SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x === el); }); desenharProp(); }
    arr = {tipo: al ? "al" + al : "mover", c: c, el: el, x0: e.clientX, y0: e.clientY, ini: c.ini, dur: c.dur, corte: c.corte || 0, trOrig: c.trilha, moveu: false}; e.preventDefault();
  });
  window.addEventListener("pointermove", function (e) {
    if (!arr) { lamina(e); return; }
    if (arr.tipo === "mao") { $("veRolo").scrollLeft = arr.sl - (e.clientX - arr.x0); return; }
    if (arr.tipo === "pan") { ZP.x = arr.zx + (e.clientX - arr.x0); ZP.y = arr.zy + (e.clientY - arr.y0); limitarZP(); aplicarZP(); return; }
    if (arr.tipo === "palco") { if (!arr.moveu && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 5) return; if (!arr.c) { arr.moveu = true; return; } var cr = cv.getBoundingClientRect(), pc = arr.c; pc.x = Math.round(lim(arr.px + (e.clientX - arr.x0) / cr.width * 100, -100, 100)); pc.y = Math.round(lim(arr.py + (e.clientY - arr.y0) / cr.height * 100, -100, 100)); arr.moveu = true; desenhar(); return; }
    if (arr.tipo === "agulha") { irPara(arr.xDe(e) / PPS); return; }
    if (arr.tipo === "laco") { if (!arr.moveu && Math.hypot(e.clientX - arr.x0, e.clientY - arr.y0) < 5) return; arr.moveu = true;
      if (!arr.caixa) { arr.caixa = document.createElement("div"); arr.caixa.className = "ve-laco"; document.body.appendChild(arr.caixa); if (window.BWFerr) BWFerr.preso(true); }
      var lx = Math.min(arr.x0, e.clientX), ly = Math.min(arr.y0, e.clientY), lw = Math.abs(e.clientX - arr.x0), lh = Math.abs(e.clientY - arr.y0); arr.caixa.style.cssText = "left:" + lx + "px;top:" + ly + "px;width:" + lw + "px;height:" + lh + "px";
      var ids = arr.soma ? arr.antes.slice() : []; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { var q = x.getBoundingClientRect(); if (q.right > lx && q.left < lx + lw && q.bottom > ly && q.top < ly + lh && ids.indexOf(x.dataset.clip) < 0) ids.push(x.dataset.clip); });
      arr.ids = ids; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("multi", ids.indexOf(x.dataset.clip) >= 0); x.classList.remove("on"); });
      var rr = $("veRolo").getBoundingClientRect(); if (e.clientX > rr.right - 30) { $("veRolo").scrollLeft += 12; arr.x0 -= 12; } else if (e.clientX < rr.left + 30 && $("veRolo").scrollLeft > 0) { $("veRolo").scrollLeft -= 12; arr.x0 += 12; } return; }
    if (arr.tipo === "grupo") { if (!arr.moveu && Math.abs(e.clientX - arr.x0) < 4) return; arr.moveu = true; var dg = Math.max(-arr.min, (e.clientX - arr.x0) / PPS);
      arr.itens.forEach(function (i) { i.c.ini = Math.max(0, Math.round((i.ini + dg) * 20) / 20); if (i.el) i.el.style.left = (i.c.ini * PPS) + "px"; }); if (!TOCANDO) desenhar(); return; }
    if (arr.tipo === "trans") { if (!arr.moveu && Math.abs(e.clientX - arr.x0) < 4) return; arr.moveu = true; var ct = arr.c, ant = anteriorDe(ct); if (!ct.trans) ct.trans = {tipo: "dissolver", dur: arr.dur0};
      ct.trans.dur = Math.round(lim(arr.dur0 + (e.clientX - arr.x0) / PPS, 0.1, Math.min(ct.dur, ant ? ant.dur : ct.dur) * 0.9) * 10) / 10;
      var fx2 = $("veFaixas").querySelector('[data-clip="' + ct.id + '"] .tr'); if (fx2) fx2.style.width = Math.max(10, ct.trans.dur * PPS) + "px"; var jj = $("veFaixas").querySelector('[data-junta="' + ct.id + '"]'); if (jj) { jj.classList.add("com"); jj.style.setProperty("--jw", Math.max(28, Math.round(ct.trans.dur * PPS)) + "px"); jj.innerHTML = "<b>" + esc(TRANS[ct.trans.tipo]) + " · " + String(ct.trans.dur).replace(".", ",") + " s</b>"; }
      if (!TOCANDO) { irPara(ct.ini + ct.trans.dur / 2); } return; }
    var c = arr.c, d = (e.clientX - arr.x0) / PPS; if (Math.abs(e.clientX - arr.x0) > 3 || (arr.tipo === "mover" && Math.abs(e.clientY - arr.y0) > 6)) arr.moveu = true; if (!arr.moveu) return;
    var temFonte = c.tipo === "video" || c.tipo === "audio", r = function (v) { return Math.round(v * 20) / 20; };
    if (arr.tipo === "mover") { c.ini = Math.max(0, r(arr.ini + d)); var fx = document.elementFromPoint(e.clientX, e.clientY), fa = fx && fx.closest && fx.closest("[data-trilha]"); if (fa) { var tr = fa.dataset.trilha; if (fam(tr) === famDoClip(c) && tr !== c.trilha) { c.trilha = tr; fa.appendChild(arr.el); arr.el.style.setProperty("--c", corTr(tr)); } }
      /* 22/11 10:05 (dono): só é "em cima" quando o take cobre ao menos 60% do outro (e o dedo/mouse está sobre ele) — aí, ao soltar, aparece
         a ESCOLHA (trocar, substituir, pôr por cima ou cancelar) e nada muda até o toque. Menos que isso = ENCOSTAR: ao soltar ele encosta no vizinho. */
      var alvo = !livreEm(c.trilha, c.ini, c.dur, c) ? P.clips.filter(function (x) { return x !== c && x.trilha === c.trilha && x.ini < c.ini + c.dur - 0.02 && x.ini + x.dur > c.ini + 0.02; })
        .sort(function (x, y) { return Math.abs(x.ini + x.dur / 2 - c.ini - c.dur / 2) - Math.abs(y.ini + y.dur / 2 - c.ini - c.dur / 2); })[0] : null;
      arr.troca = null; arr.encosta = null; arr.vert = vertNova(c, e);
      if (arr.vert) { dicaArr(e, "", arr.vert === "cima" ? "⬆ SOLTE: CAMADA NOVA ACIMA" : "⬇ SOLTE: CAMADA NOVA ABAIXO"); arr.el.classList.add("nova"); arr.el.setAttribute("data-dica", arr.vert === "cima" ? "⬆ CAMADA NOVA" : "⬇ CAMADA NOVA"); }
      else {
      if (alvo) { var ov = Math.min(c.ini + c.dur, alvo.ini + alvo.dur) - Math.max(c.ini, alvo.ini), tp = (e.clientX - $("veFaixas").getBoundingClientRect().left) / PPS, dentro = tp >= alvo.ini && tp <= alvo.ini + alvo.dur;
        if (ov / Math.min(c.dur, alvo.dur) >= 0.6 && dentro) { arr.troca = alvo; dicaArr(e, "", "Solte para escolher: trocar, substituir ou pôr por cima"); }
        else { arr.encosta = alvo; dicaArr(e, "", "⇤ ENCOSTAR no take ao lado (solte)"); } }
      else dicaArr(null);
      arr.el.classList.toggle("nova", !!arr.troca); if (arr.troca) arr.el.setAttribute("data-dica", "SOLTE E ESCOLHA"); } }
    else if (arr.tipo === "ale") { var dd = lim(d, temFonte ? -arr.corte / vel(c) : -arr.ini, arr.dur - 0.2); dd = Math.max(dd, -arr.ini); c.ini = r(arr.ini + dd); c.dur = r(arr.dur - dd); if (temFonte) c.corte = Math.max(0, arr.corte + dd * vel(c)); }
    else { c.dur = r(lim(arr.dur + d, 0.2, temFonte ? maxDur(c) : 600)); }
    arr.el.style.left = (c.ini * PPS) + "px"; arr.el.style.width = Math.max(18, c.dur * PPS) + "px"; if (!TOCANDO) desenhar();
  });
  var SEG = null;
  function segurarPegar(e, el, c, al) { soltarSeg(); SEG = {x: e.clientX, y: e.clientY, x1: e.clientX, y1: e.clientY, t: setTimeout(function () { if (!SEG) return; var s0 = SEG;
      window.__bwSegurando = true; SEL = c.id; $("veFaixas").querySelectorAll(".ve-clip").forEach(function (x) { x.classList.toggle("on", x.dataset.clip === c.id); }); desenharProp();
      arr = {tipo: al ? "al" + al : "mover", c: c, el: el, x0: s0.x1, y0: s0.y1 || s0.y, ini: c.ini, dur: c.dur, corte: c.corte || 0, trOrig: c.trilha, moveu: false, segurou: true};
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (x) {} aviso("✋ Take pego — arraste para o lugar e solte."); }, 320)}; }
  /* 22/11 (dono: "jogo o take para cima/baixo e nada acontece"): depois de PEGAR o take segurando, o dedo que sobe/desce não pode virar rolagem
     da linha do tempo (o navegador cancelava o arraste) — touchmove com preventDefault só enquanto o take está pego */
  document.addEventListener("touchmove", function (e) { if ((arr && arr.c) || window.__bwSegurando) { if (e.cancelable) e.preventDefault(); } }, {passive: false, capture: true});
  function soltarSeg() { if (SEG) clearTimeout(SEG.t); SEG = null; window.__bwSegurando = false; }
  window.addEventListener("pointermove", function (e) { if (!SEG || arr) return; SEG.x1 = e.clientX; SEG.y1 = e.clientY; if (Math.hypot(e.clientX - SEG.x, e.clientY - SEG.y) > 8) soltarSeg(); }, true);
  window.addEventListener("pointercancel", function () { if (SEG && !arr) soltarSeg(); }, true);
  window.addEventListener("pointerup", function () { if (SEG && !arr) soltarSeg(); }, true);
  var ultimoXY = {x: 0, y: 0}; window.addEventListener("pointerup", function (e) { ultimoXY = {x: e.clientX, y: e.clientY}; }, true);
  window.addEventListener("pointerup", function () { if (SEG) { SEG = null; setTimeout(function () { window.__bwSegurando = false; }, 0); } if (!arr) return; var a = arr; arr = null; if (window.BWFerr) BWFerr.preso(false);
    dicaArr(null);
    if (a.tipo === "laco") { if (a.caixa) a.caixa.remove(); if (!a.moveu) { limparGrupo(); if (SEL) { SEL = null; desenharTL(); desenharProp(); } return; }
      GRUPO = a.ids || []; SEL = GRUPO.length ? GRUPO[0] : null; if (GRUPO.length < 2) GRUPO = []; desenharTL(); desenharProp();
      if (GRUPO.length > 1) aviso("▭ " + GRUPO.length + " takes escolhidos"); return; }
    if (a.tipo === "grupo") { if (a.moveu) { tudo(); marcarGrupo(); aviso("↔ " + a.itens.length + " takes movidos juntos."); } return; }
    if (a.tipo === "mover" && a.moveu && a.vert) { camadaNova(a.c, a.vert); tudo(); marcar(a.c.id); aviso((a.vert === "cima" ? "⬆" : "⬇") + " Camada nova: " + infoTr(a.c.trilha)[0] + "."); return; }
    if (a.tipo === "mover" && a.moveu && a.troca) { tudo(true); escolherSobre(a, ultimoXY); return; }
    if (a.tipo === "mover" && a.moveu && a.encosta) encostar(a);
    if (a.tipo === "trans") { if (!a.moveu) { menuTrans(a.c, a.x0, a.y0); return; } tudo(); marcar(a.c.id); aviso("◧ Transição “" + TRANS[a.c.trans.tipo] + "” com " + String(a.c.trans.dur).replace(".", ",") + " s" + (a.tinha ? "." : " (Dissolver — toque no ◆ para trocar).")); return; }
    if (a.tipo !== "agulha" && a.tipo !== "mao" && (a.moveu || a.tipo === "trans")) tudo(); });
  /* ARRASTAR DA BIBLIOTECA (22/11): mídia, som, transição e efeito vão por arrasto até a linha do tempo (rato depois de 5 px; dedo depois de segurar
     ~0,22 s, senão é rolagem — regra 111). Mídia solta em cima de outro take = camada nova; transição solta num take/emenda; efeito solto num take. */
  var LD = null, LD_FIM = 0, LD_RAF = 0;
  function ldAlvo(x, y) { if (LD.fantasma) LD.fantasma.style.display = "none"; var el = document.elementFromPoint(x, y); if (LD.fantasma) LD.fantasma.style.display = "";
    if (!el || !el.closest) return null; var fx = $("veFaixas"), r = fx.getBoundingClientRect(), t = Math.max(0, (x - r.left) / PPS);
    var jt = el.closest("[data-junta]"), cl = el.closest("[data-clip]"), fa = el.closest("[data-trilha]");
    if (!fa && !cl && !jt) return null; return {clip: jt ? jt.dataset.junta : cl ? cl.dataset.clip : null, trilha: fa ? fa.dataset.trilha : null, t: t, el: jt || cl || fa}; }
  function ldMarca(a) { $("veFaixas").querySelectorAll(".ld-alvo").forEach(function (x) { x.classList.remove("ld-alvo"); }); if (a && a.el) a.el.classList.add("ld-alvo"); }
  function ldComecar() { var it = LD.it, r = it.getBoundingClientRect(), g = document.createElement("div"); g.className = "ve-fantasma"; g.textContent = (it.querySelector("span:not(.mini)") || it).textContent.trim().slice(0, 40); document.body.appendChild(g); LD.fantasma = g; LD.ativo = true; it.classList.add("arrastando");
    if (window.BWFerr) BWFerr.preso(true); ldMover(LD.x, LD.y);
    var laco = function () { if (!LD || !LD.ativo) return; var ro = $("veRolo"), rr = ro.getBoundingClientRect(); if (LD.y > rr.top - 30 && LD.y < rr.bottom + 30) { if (LD.x > rr.right - 40) ro.scrollLeft += 14; else if (LD.x < rr.left + 40 && LD.x > rr.left - 10) ro.scrollLeft -= 14; }
      /* página que rola (celular): dedo perto da borda de baixo/cima rola a página até a linha do tempo */
      var se = document.scrollingElement || document.documentElement; if (se.scrollHeight > innerHeight + 4) { var bx = innerHeight - LD.y, tp = LD.y; if (bx < 70) window.scrollBy(0, Math.round(8 + (70 - Math.max(0, bx)) * 0.45)); else if (tp < 70) window.scrollBy(0, -Math.round(8 + (70 - Math.max(0, tp)) * 0.45)); else { LD_RAF = requestAnimationFrame(laco); return; } ldMover(LD.x, LD.y); } LD_RAF = requestAnimationFrame(laco); }; LD_RAF = requestAnimationFrame(laco); }
  function ldMover(x, y) { LD.x = x; LD.y = y; if (!LD.ativo) return; LD.fantasma.style.left = (x + 12) + "px"; LD.fantasma.style.top = (y + 10) + "px"; var a = ldAlvo(x, y); LD.alvo = a; ldMarca(a);
    var k = LD.kind, txt = !a ? "solte na linha do tempo" : k === "t" ? (a.clip ? "◧ transição neste take" : "solte num take") : k === "e" ? (a.clip ? "✦ efeito neste take" : "solte num take") : (a.clip ? "＋ camada nova por cima" : "pôr aqui · " + fmtT(a.t));
    LD.fantasma.setAttribute("data-dica", txt); }
  async function ldSoltar() { var a = LD.alvo, k = LD.kind, key = LD.key; if (!a) return;
    if (k === "t" || k === "e") { var c = a.clip ? P.clips.filter(function (x) { return x.id === a.clip; })[0] : P.clips.filter(function (x) { return x.trilha === a.trilha && famDoClip(x) === "v"; }).sort(function (p, q) { return Math.abs(p.ini - a.t) - Math.abs(q.ini - a.t); })[0]; aplicarFx(c, k, key); return; }
    var m = k === "s" ? await porSom(+key) : MID[key]; if (!m) return; var f = m.tipo === "audio" ? "a" : "v", tr = a.trilha && fam(a.trilha) === f ? a.trilha : (f === "a" ? (m.som === "sfx" ? "a2" : "a1") : "v1");
    if (a.clip) { var sob = P.clips.filter(function (x) { return x.id === a.clip; })[0]; if (sob && fam(sob.trilha) === f) tr = sob.trilha; }
    var nova = addClip(m, tr, a.t); marcar(nova.id); aviso((nova.trilha !== tr ? "＋ Camada nova (" + infoTr(nova.trilha)[0] + "): " : "") + m.nome + " em " + fmtT(nova.ini) + "."); }
  function ldFim() { if (!LD) return; clearTimeout(LD.timer); cancelAnimationFrame(LD_RAF); if (LD.fantasma) LD.fantasma.remove(); LD.it.classList.remove("arrastando"); ldMarca(null); if (LD.ativo) { LD_FIM = Date.now(); if (window.BWFerr) BWFerr.preso(false); } LD = null; }
  $("veLib").addEventListener("pointerdown", function (e) { if (e.button > 0 || e.target.closest("button")) return; var it = e.target.closest("[data-mid],[data-arr],[data-som]"); if (!it) return;
    var kind = it.dataset.arr ? it.dataset.arr.charAt(0) : it.dataset.som != null ? "s" : "m", key = it.dataset.arr ? it.dataset.arr.slice(2) : it.dataset.som != null ? it.dataset.som : it.dataset.mid;
    LD = {it: it, kind: kind, key: key, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, ativo: false, toque: e.pointerType !== "mouse"};
    if (LD.toque) LD.timer = setTimeout(function () { if (LD && !LD.ativo) { ldComecar(); if (navigator.vibrate) navigator.vibrate(12); } }, 220); });
  window.addEventListener("pointermove", function (e) { if (!LD) return; if (!LD.ativo) { var dd = Math.hypot(e.clientX - LD.x0, e.clientY - LD.y0); if (LD.toque) { if (dd > 10) ldFim(); return; } if (dd > 5) { LD.x = e.clientX; LD.y = e.clientY; ldComecar(); } return; } ldMover(e.clientX, e.clientY); });
  document.addEventListener("touchmove", function (e) { if (LD && LD.ativo) e.preventDefault(); }, {passive: false});
  window.addEventListener("pointerup", function () { if (!LD) return; var vai = LD.ativo; if (vai) ldSoltar().catch(function (x) { console.warn("ldSoltar", x); }); ldFim(); });
  window.addEventListener("pointercancel", function () { if (LD) ldFim(); });
  $("veFaixas").addEventListener("contextmenu", function (e) { if (e.target.closest("[data-clip],[data-junta]") || !window.BWFerr) return; var fa = e.target.closest("[data-trilha]"); if (!fa) return; e.preventDefault();
    if (e.isTrusted && e.pointerType && e.pointerType !== "mouse") return;
    var tr = fa.dataset.trilha, t = Math.max(0, (e.clientX - $("veFaixas").getBoundingClientRect().left) / PPS), v = vaoEm(tr, t), nome = infoTr(tr)[0];
    BWFerr.menu(e.clientX, e.clientY, [
      {icone: "⇤", rot: "Puxar o take para encostar no anterior", off: !v, fn: function () { fecharVao(tr, t, false); }},
      {icone: "⇇", rot: "Fechar o espaço e puxar todos os seguintes", off: !v || v.todos.length < 2, fn: function () { fecharVao(tr, t, true); }},
      {icone: "＋", rot: fam(tr) === "a" ? "Nova camada de som abaixo desta" : fam(tr) === "t" ? "Nova camada de texto (acima de tudo)" : "Nova camada de vídeo (acima de tudo)", fn: function () { camadaAbaixo(tr); }},
      {icone: "📋", rot: "Colar aqui", off: !COPIA, fn: function () { T = t; colar(); }}], String(nome || "CAMADA").toUpperCase()); });
  $("veFaixas").addEventListener("contextmenu", function (e) { var j = e.target.closest("[data-junta]"); if (!j) return; e.preventDefault(); e.stopPropagation(); var c = P.clips.filter(function (x) { return x.id === j.dataset.junta; })[0]; if (c) menuTrans(c, e.clientX, e.clientY); });
  $("veLib").addEventListener("dragstart", function (e) { e.preventDefault(); });   /* a miniatura (img) começava o arrastar NATIVO do navegador e engolia o nosso */
  // LÂMINA (C): uma linha mostra onde o corte vai cair
  function lamina(e) { var l = $("veLamina"); if (!l) return; var F = window.BWFerr ? BWFerr.atual() : "v", ec = e.target && e.target.closest && e.target.closest("[data-clip]");
    if (F !== "c" || !ec) { l.hidden = true; return; } var fx = $("veFaixas").getBoundingClientRect(), r = ec.getBoundingClientRect(); l.hidden = false; l.style.left = (e.clientX - fx.left) + "px"; l.style.top = (r.top - fx.top) + "px"; l.style.height = r.height + "px"; }
  /* Ctrl + rodinha = mais/menos tempo na tela (horizontal). Alt + rodinha EM CIMA DE UMA CAMADA = camada mais alta/mais baixa (até o mínimo) */
  function alturaDe(id, delta) { P.alt = P.alt || {}; var a = lim(Math.round(altTr(id) + delta), ALT_MIN, 160); if (a === altTr(id)) return; P.alt[id] = a; desenharTL(); guardar(); }
  function trilhaSob(e) { var el = document.elementFromPoint(e.clientX, e.clientY), f = el && el.closest && (el.closest("[data-trilha]") || el.closest("[data-rot]")); return f ? f.dataset.trilha || f.dataset.rot : null; }
  [$("veRolo"), $("veRot")].forEach(function (alvo) { if (!alvo) return; alvo.addEventListener("wheel", function (e) {
    if (e.altKey && !e.ctrlKey) { var id = trilhaSob(e); if (!id) return; e.preventDefault(); alturaDe(id, e.deltaY < 0 ? 8 : -8); return; }
    if (e.ctrlKey) { e.preventDefault(); zoomEm(e.deltaY < 0 ? 1.25 : 0.8, e.clientX); } }, {passive: false}); });
  // PRÉVIA: V arrasta o clipe escolhido (ou o de cima) direto na tela; T cria um texto onde tocou; Z aproxima a linha do tempo
  /* 22/11 23:23 (dono: "alterar a proporção do take com os dedos: o APLICATIVO vem e vai, não só o take"): DOIS DEDOS na prévia = esticar/encolher e
     mover SÓ o take escolhido (texto: o tamanho da letra). A página não amplia (touch-action:none + gesture* no iPhone). */
  cv.addEventListener("pointerdown", function (e) { if (!ESCOLHENDO_PT) return; var c = P.clips.filter(function (x) { return x.id === ESCOLHENDO_PT; })[0]; if (!c) { ESCOLHENDO_PT = null; return; }
    e.stopImmediatePropagation(); e.preventDefault(); var sAlvo = document.querySelector("[data-rsalvo]"), alvo = P.clips.filter(function (x) { return x.id === ((sAlvo && sAlvo.value) || (c.rastro || {}).alvo); })[0] ||
      P.clips.filter(function (x) { return x !== c && (x.tipo === "video" || x.tipo === "imagem") && T >= x.ini && T < x.ini + x.dur; })[0], bx = alvo && caixaTake(alvo); ESCOLHENDO_PT = null;
    if (!bx) { aviso("Leve a agulha até um momento em que o take aparece e escolha de novo.", true); desenharProp(); return; }
    var cr = cv.getBoundingClientRect(), px = (e.clientX - cr.left) / cr.width * cv.width, py = (e.clientY - cr.top) / cr.height * cv.height, fx = (px - bx.x) / bx.w, fy = (py - bx.y) / bx.h;
    if (fx < 0 || fy < 0 || fx > 1 || fy > 1) { aviso("Toque DENTRO do take que o item vai seguir.", true); desenharProp(); return; }
    c.rastro = Object.assign({}, c.rastro || {}, {alvo: alvo.id, modo: "manual"}); rastrear(c, {t: alvo.tipo === "video" ? (alvo.corte || 0) + (T - alvo.ini) * vel(alvo) : 0, x: fx, y: fy}); }, true);
  var DESENHO = null;
  cv.addEventListener("pointerdown", function (e) { if (!SELDES) return; var c = P.clips.filter(function (x) { return x.id === SELDES; })[0], bx = c && caixaTake(c); if (!bx) return;
    e.stopImmediatePropagation(); e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
    var pt = function (ev) { var cr = cv.getBoundingClientRect(), px = (ev.clientX - cr.left) / cr.width * cv.width, py = (ev.clientY - cr.top) / cr.height * cv.height; return [Math.round(lim((px - bx.x) / bx.w, -0.2, 1.2) * 1000) / 1000, Math.round(lim((py - bx.y) / bx.h, -0.2, 1.2) * 1000) / 1000]; };
    c.selm = c.selm || {}; c.selm.forma = c.selm.forma || "ret"; c.selm.pts = [pt(e)]; DESENHO = {c: c, pt: pt, id: e.pointerId}; desenhar(); }, true);
  window.addEventListener("pointermove", function (e) { if (!DESENHO || e.pointerId !== DESENHO.id) return; e.stopImmediatePropagation(); var q = DESENHO.pt(e), p = DESENHO.c.selm.pts;
    if (DESENHO.c.selm.forma === "livre") { var u = p[p.length - 1]; if (Math.hypot(q[0] - u[0], q[1] - u[1]) > 0.006) p.push(q); } else p[1] = q; desenhar(); }, true);
  window.addEventListener("pointerup", function (e) { if (!DESENHO || e.pointerId !== DESENHO.id) return; e.stopImmediatePropagation(); var c = DESENHO.c; DESENHO = null; var p = c.selm.pts;
    var ok = p.length > 2 || (p.length === 2 && Math.abs(p[0][0] - p[1][0]) > 0.02 && Math.abs(p[0][1] - p[1][1]) > 0.02); if (!ok) { delete c.selm.pts; desenhar(); aviso("Área muito pequena — arraste mais.", true); return; }
    c.selm.modo = c.selm.modo || "frente"; SELDES = null; tudo(); aviso("✓ Área marcada — o objeto fica na frente dos textos"); }, true);
  var DEDOS = {}; cv.style.touchAction = "none";
  ["gesturestart", "gesturechange", "gestureend"].forEach(function (ev) { cv.addEventListener(ev, function (e) { e.preventDefault(); }, {passive: false}); });
  function pinca() { var ids = Object.keys(DEDOS); if (ids.length < 2) return null; var a = DEDOS[ids[0]], b = DEDOS[ids[1]]; return {d: Math.max(10, Math.hypot(a.x - b.x, a.y - b.y)), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2}; }
  cv.addEventListener("pointerdown", function (e) { if (e.pointerType === "mouse") return; DEDOS[e.pointerId] = {x: e.clientX, y: e.clientY};
    if (Object.keys(DEDOS).length !== 2) return; e.stopImmediatePropagation(); e.preventDefault();
    var c = (arr && arr.c) || sel(); if (!c || c.tipo === "audio") { arr = null; return; } var pz = pinca();
    if (arr && arr.tipo === "palco" && arr.moveu) { c.x = arr.px; c.y = arr.py; }
    arr = {tipo: "pinca", c: c, d0: pz.d, mx: pz.mx, my: pz.my, esc0: c.esc || 100, tam0: c.tam || 8, px: c.x || 0, py: c.y || 0, moveu: false}; }, true);
  window.addEventListener("pointermove", function (e) { if (!DEDOS[e.pointerId]) return; DEDOS[e.pointerId] = {x: e.clientX, y: e.clientY};
    if (!arr || arr.tipo !== "pinca") return; e.stopImmediatePropagation(); var pz = pinca(); if (!pz) return; var k = pz.d / arr.d0, c = arr.c, cr = cv.getBoundingClientRect(); arr.moveu = true;
    if (c.tipo === "texto") c.tam = Math.round(lim(arr.tam0 * k, 1, 60) * 10) / 10; else c.esc = Math.round(lim(arr.esc0 * k, 5, 800));
    c.x = Math.round(lim(arr.px + (pz.mx - arr.mx) / cr.width * 100, -150, 150)); c.y = Math.round(lim(arr.py + (pz.my - arr.my) / cr.height * 100, -150, 150)); if (!TOCANDO) desenhar(); }, true);
  function fimDedo(e) { if (!DEDOS[e.pointerId]) return; delete DEDOS[e.pointerId]; if (arr && arr.tipo === "pinca") { var a = arr; arr = null; if (a.moveu) { tudo(); aviso(a.c.tipo === "texto" ? "Tamanho do texto: " + a.c.tam : "Tamanho do take: " + a.c.esc + "%"); } } }
  window.addEventListener("pointerup", fimDedo, true); window.addEventListener("pointercancel", fimDedo, true);
  cv.addEventListener("pointerdown", function (e) { if (e.button === 2) return; var F = window.BWFerr ? BWFerr.atual() : "v", cr = cv.getBoundingClientRect(), fx = (e.clientX - cr.left) / cr.width, fy = (e.clientY - cr.top) / cr.height;
    if (PEGAR_CK) { e.preventDefault(); pegarCor(fx, fy); return; }
    if ((F === "h" || e.button === 1) && ZP.z !== 1) { arr = {tipo: "pan", x0: e.clientX, y0: e.clientY, zx: ZP.x, zy: ZP.y}; e.preventDefault(); return; }
    if (F === "t") { addTexto({x: Math.round((fx - 0.5) * 100), y: Math.round((fy - 0.5) * 100)}); BWFerr.trocar("v"); aviso("T Texto criado onde você tocou — escreva em AJUSTES."); return; }
    if (F !== "v") return;
    var ativos = P.clips.filter(function (c) { return c.tipo !== "audio" && T >= c.ini && T < c.ini + c.dur; }), pesoTr = function (id) { return (fam(id) === "t" ? 1000 : 0) + numTr(id); };
    var c = sel(); if (!c || ativos.indexOf(c) < 0) { c = ativos.sort(function (a, b) { return pesoTr(b.trilha) - pesoTr(a.trilha); })[0]; if (c) { SEL = c.id; desenharTL(); desenharProp(); } }
    arr = {tipo: "palco", c: c || null, x0: e.clientX, y0: e.clientY, px: c ? c.x || 0 : 0, py: c ? c.y || 0 : 0, moveu: false}; e.preventDefault(); });
  /* 22/11 (dono): clicar na prévia NÃO abre mais o menu — as opções ficam nos ⋯ discretos no alto da prévia (o botão direito continua) */
  (function () { var tela = cv.parentElement; if (!tela || $("veOpcP")) return; var b = document.createElement("button"); b.type = "button"; b.id = "veOpcP"; b.className = "ve-opcp"; b.title = "Opções da prévia"; b.setAttribute("aria-label", "Opções da prévia"); b.textContent = "⋯";
    b.addEventListener("pointerdown", function (e) { e.stopPropagation(); }); b.onclick = function (e) { e.stopPropagation(); var r = b.getBoundingClientRect(); BWFerr._acabouSegurar = 0; menuPrevia(Math.max(8, r.right - 250), r.bottom + 6); }; tela.appendChild(b); })();
  cv.addEventListener("contextmenu", function (e) { e.preventDefault(); menuPrevia(e.clientX, e.clientY); });

  /* ZOOM DA PRÉVIA (22/11): rodinha em cima da prévia aproxima/afasta no ponto do mouse; com zoom, a mão (H, Espaço ou botão do meio) arrasta;
     só muda a VISTA (o vídeo exportado não muda). Duplo clique no selo volta a 100%. */
  var ZP = {z: 1, x: 0, y: 0};
  function aplicarZP() { if (ZP.z === 1) { ZP.x = ZP.y = 0; cv.style.transform = ""; } else { cv.style.transformOrigin = "0 0"; cv.style.transform = "translate(" + ZP.x.toFixed(1) + "px," + ZP.y.toFixed(1) + "px) scale(" + ZP.z + ")"; }
    var b = $("veZoomP"); if (!b) { var tela = cv.parentElement; if (!tela) return; b = document.createElement("button"); b.type = "button"; b.id = "veZoomP"; b.className = "ve-zoomp"; b.title = "Zoom da prévia — toque para voltar a 100%"; b.setAttribute("aria-label", "Voltar o zoom da prévia a 100%"); b.onclick = function () { zoomPrevia(0); }; tela.appendChild(b); }
    b.textContent = "🔍 " + Math.round(ZP.z * 100) + "%  ✕"; b.hidden = ZP.z === 1; }
  function limitarZP() { var r = cv.getBoundingClientRect(), w = r.width / ZP.z, h = r.height / ZP.z;
    if (ZP.z < 1) { ZP.x = w * (1 - ZP.z) / 2; ZP.y = h * (1 - ZP.z) / 2; } else { ZP.x = lim(ZP.x, w * (1 - ZP.z), 0); ZP.y = lim(ZP.y, h * (1 - ZP.z), 0); } }
  function zoomPrevia(novo, cxp, cyp) { var r = cv.getBoundingClientRect(), L = r.left - ZP.x, Tp = r.top - ZP.y, w = r.width / ZP.z, h = r.height / ZP.z;
    novo = novo ? lim(novo, 0.5, 8) : 1; if (cxp == null) { cxp = L + w / 2; cyp = Tp + h / 2; }
    var px = cxp - L, py = cyp - Tp, ux = (px - ZP.x) / ZP.z, uy = (py - ZP.y) / ZP.z; ZP.x = px - ux * novo; ZP.y = py - uy * novo; ZP.z = Math.round(novo * 100) / 100; limitarZP(); aplicarZP(); }
  (cv.parentElement || cv).addEventListener("wheel", function (e) { if (e.ctrlKey || e.altKey) return; e.preventDefault(); zoomPrevia(ZP.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, {passive: false});
  addEventListener("resize", function () { if (ZP.z !== 1) { limitarZP(); aplicarZP(); } });
  function salvarQuadro() { tamanhoReal(true); cv.toBlob(function (bl) { tamanhoReal(false); if (!bl) return; var a = document.createElement("a"), u = URL.createObjectURL(bl); a.href = u; a.download = (P.nome || "video").replace(/[^\w\-]+/g, "-") + "-quadro-" + fmtT(T).replace(/[^\d]/g, "") + ".png"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); aviso("🖼 Quadro salvo como imagem (PNG)."); }, "image/png"); }
  function menuPrevia(x, y) { if (!window.BWFerr) return; if (Date.now() - (BWFerr._acabouSegurar || 0) < 900) return; var c = sel(), vis = c && c.tipo !== "audio" && T >= c.ini && T < c.ini + c.dur;
    var it = [{tit: "VISTA (não muda o vídeo)"}, {icone: "＋", rot: "Aproximar", tecla: "Rodinha ↑", fn: function () { zoomPrevia(ZP.z * 1.5); }}, {icone: "－", rot: "Afastar", tecla: "Rodinha ↓", fn: function () { zoomPrevia(ZP.z / 1.5); }},
      {icone: "⤢", rot: "Ajustar à tela (100%)", off: ZP.z === 1, fn: function () { zoomPrevia(0); }}, {icone: "🔍", rot: "Zoom", sub: [2, 4, 8].map(function (z) { return {rot: z * 100 + "%" + (ZP.z === z ? "  ✓" : ""), fn: function () { zoomPrevia(z); }}; })}, "-",
      {icone: TOCANDO ? "⏸" : "▶", rot: TOCANDO ? "Pausar" : "Tocar", tecla: "Espaço", fn: function () { $("vePlay").click(); }}, {icone: "🖼", rot: "Salvar este quadro como imagem", fn: salvarQuadro}, "-",
      {tit: "TELA"}, {icone: "⛶", rot: "Tela grande (esconde os painéis)", fn: function () { $("veCheia").click(); }},
      {icone: "🗗", rot: "Desafixar: prévia numa janela solta", fn: function () { $("veSegunda").click(); }}, {icone: "🖥", rot: "Prévia no segundo monitor", fn: function () { $("veSegunda").click(); }},
      {icone: "⛶", rot: "Tela cheia (monitor inteiro)", fn: function () { var el = cv.parentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {}); }},
      {icone: "📱", rot: "Controle pelo celular", fn: function () { var b = $("veCelular"); if (b) b.click(); }}];
    if (vis) it = it.concat(["-", {tit: "TAKE ESCOLHIDO"}, {icone: "⊕", rot: "Centralizar", fn: function () { c.x = 0; c.y = 0; tudo(); }}, {icone: "▣", rot: "Tamanho original (100%)", fn: function () { c.esc = 100; c.x = 0; c.y = 0; tudo(); }}]);
    BWFerr.menu(x, y, it, "PRÉVIA"); }

  /* ---------- FERRAMENTAS E ATALHOS (estilo Premiere/CapCut) ---------- */
  if (window.BWFerr) {
    var I = BWFerr.ICONES;
    BWFerr.barra({ el: $("veFerr"), alvos: [$("veRolo"), cv], atual: "v", ferramentas: [
      {id: "v", tecla: "V", nome: "Seleção", icone: I.v, dica: "move, apara e escolhe clipes; na prévia arrasta o clipe"},
      {id: "c", tecla: "C", nome: "Lâmina", icone: I.c, dica: "clique no clipe para cortar ali (Shift = todas as camadas)"},
      {id: "h", tecla: "H", nome: "Mão", icone: I.h, dica: "arrasta a linha do tempo"},
      {id: "z", tecla: "Z", nome: "Zoom", icone: I.z, dica: "clique aproxima, Alt + clique afasta"},
      {id: "t", tecla: "T", nome: "Texto", icone: I.t, dica: "clique na prévia ou na linha do tempo para criar um texto"}],
      aoTrocar: function (id) { var l = $("veLamina"); if (l && id !== "c") l.hidden = true; } });
    var passoQ = 1 / 30;
    BWFerr.atalhos({
      "espaco, k": function () { $("vePlay").click(); }, "l": function () { if (!TOCANDO) tocar(); }, "j": function () { irPara(T - 1); },
      "arrowleft": function () { irPara(T - passoQ); }, "arrowright": function () { irPara(T + passoQ); }, "shift+arrowleft": function () { irPara(T - 1); }, "shift+arrowright": function () { irPara(T + 1); },
      "home": function () { irPara(0); $("veRolo").scrollLeft = 0; }, "end": function () { irPara(total()); },
      "delete": function () { if (!SEL && !GRUPO.length) return false; apagar(false); }, "shift+delete": function () { if (!SEL) return false; apagar(true); },
      "ctrl+k": function () { return dividir.apply(this, arguments); }, "ctrl+z": desfazer, "ctrl+shift+z, ctrl+y": refazer, "ctrl+c": function () { return copiar(); }, "ctrl+v": function () { return colar.apply(this, arguments); }, "ctrl+shift+c": function () { return copiarAtrib(); }, "ctrl+shift+v": function () { return colarAtrib(); },
      "q": function () { aparar("ini"); }, "w": function () { aparar("fim"); }, "shift+e": function () { return ligarDesligar(); },
      "ctrl+shift+/, ctrl+shift+d": function () { return duplicar.apply(this, arguments); }, "ctrl+d": function () { var c = sel(); if (!c || c.tipo === "audio" || c.tipo === "texto") return false; c.trans = {tipo: "dissolver", dur: 0.6}; tudo(); aviso("Ctrl+D: transição Dissolver no início do clipe" + (anteriorDe(c) ? "." : " (encoste-o no fim de outro clipe).")); },
      "=, shift+=, ctrl+=": function () { zoomEm(1.4); }, "-, ctrl+-": function () { zoomEm(1 / 1.4); }, "\\": encaixarTudo,
      "ctrl+s": function () { guardar(); aviso("✓ Salvo neste aparelho (o editor também salva sozinho)."); }, "ctrl+m, ctrl+e": exportar, "ctrl+i": function () { $("veArq").click(); },
      "ctrl+a": function () { if (!P.clips.length) return false; GRUPO = P.clips.map(function (x) { return x.id; }); SEL = GRUPO[0]; if (GRUPO.length < 2) GRUPO = []; desenharTL(); desenharProp(); aviso("▭ Todos os takes escolhidos (" + P.clips.length + ")."); },
      "escape": function () { if (!SEL && !GRUPO.length) return false; limparGrupo(); SEL = null; desenharTL(); desenharProp(); }
    });
    BWFerr.ajuda("ATALHOS DO EDITOR DE VÍDEO", [["#", "TOCAR E NAVEGAR"], ["Espaço / K", "tocar / pausar"], ["L", "tocar"], ["J", "voltar 1 s"], ["← / →", "um quadro para trás / frente"], ["Shift+← / Shift+→", "1 segundo"], ["Home / End", "início / fim"],
      ["#", "EDITAR"], ["Ctrl+K", "cortar na agulha (o clipe escolhido, ou tudo o que está na agulha)"], ["Delete", "apagar o clipe"], ["Shift+Delete", "apagar e fechar o espaço"], ["Ctrl+C / Ctrl+V", "copiar / colar na agulha"], ["Ctrl+Shift+C / Ctrl+Shift+V", "copiar os AJUSTES de um take / colar em outro"], ["Q / W", "cortar o começo / o fim do take até a agulha"], ["Shift+E", "desativar / ativar o take"],
      ["Ctrl+Shift+D", "duplicar"], ["Ctrl+D", "transição Dissolver no clipe"], ["Ctrl+Z", "desfazer"], ["Ctrl+Shift+Z / Ctrl+Y", "refazer"], ["Botão direito", "opções do clipe (no celular: ⋯ MAIS)"],
      ["#", "LINHA DO TEMPO E ARQUIVO"], ["= / -", "aproximar / afastar"], ["\\", "caber o vídeo inteiro"], ["Ctrl+roda do mouse", "zoom onde está o mouse"], ["Ctrl+I", "importar mídia"], ["Ctrl+S", "salvar"], ["Ctrl+M", "exportar o vídeo"], ["?", "esta lista"]]);
    // MENU DO CLIPE (botão direito / segurar o dedo)
    BWFerr.contexto($("veFaixas"), "[data-clip]", function (el) { var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; if (!c) return [];
      if (SEL !== c.id) { SEL = c.id; desenharTL(); desenharProp(); }
      var vis = c.tipo !== "audio" && c.tipo !== "texto", itens = [
        {icone: "✂", rot: "Cortar na agulha", tecla: "Ctrl+K", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { return dividir.apply(this, arguments); }},
        {icone: "⧉", rot: "Duplicar", tecla: "Ctrl+Shift+D", fn: function () { return duplicar.apply(this, arguments); }}, {icone: "⎘", rot: "Copiar", tecla: "Ctrl+C", fn: copiar}, {icone: "📋", rot: "Colar na agulha", tecla: "Ctrl+V", off: !COPIA, fn: function () { return colar.apply(this, arguments); }}];
      itens.push({icone: "⇤", rot: "Cortar o começo até a agulha", tecla: "Q", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { aparar("ini"); }}, {icone: "⇥", rot: "Cortar o fim na agulha", tecla: "W", off: !(T > c.ini + 0.05 && T < c.ini + c.dur - 0.05), fn: function () { aparar("fim"); }},
        "-", {icone: "🎚", rot: "Copiar ajustes", tecla: "Ctrl+Shift+C", fn: copiarAtrib}, {icone: "🖌", rot: "Colar ajustes", tecla: "Ctrl+Shift+V", off: !ATRIB || ATRIB.id === c.id, fn: function () { return colarAtrib.apply(this, arguments); }},
        {icone: c.off ? "👁" : "🚫", rot: c.off ? "Ativar o take" : "Desativar o take", tecla: "Shift+E", fn: ligarDesligar});
      if (temImg(c) && window.BWCor) itens.push({icone: "🎨", rot: "Cor", sub: [{rot: "Original" + (!BWCor.ativo(c.grade) ? "  ✓" : ""), fn: function () { delete c.grade; c.look = ""; tudo(); }}].concat(Object.keys(BWCor.LOOKS).map(function (k) { return {rot: BWCor.LOOKS[k].nome + (c.look === k && BWCor.ativo(c.grade) ? "  ✓" : ""), fn: function () { c.grade = JSON.parse(JSON.stringify(BWCor.LOOKS[k].g)); c.look = k; tudo(); }}; }))
        .concat([{rot: "⇉ Aplicar esta cor em todos os takes", off: !BWCor.ativo(c.grade), fn: function () { corEmTodos(c); }}, {rot: "Abrir os ajustes de cor…", fn: function () { abrirGrupo("ve-cor"); }}])});
      if (temSom(c)) { var vv = c.vol == null ? 100 : c.vol; itens.push({icone: "🔊", rot: "Som do take", sub: [
        {rot: vv === 0 ? "Devolver o som (100%)" : "Silenciar", fn: function () { c.vol = vv === 0 ? 100 : 0; tudo(); }},
        {rot: "Volume 50%" + (vv === 50 ? "  ✓" : ""), fn: function () { c.vol = 50; tudo(); }}, {rot: "Volume 100%" + (vv === 100 ? "  ✓" : ""), fn: function () { c.vol = 100; tudo(); }}, {rot: "Volume 150%" + (vv === 150 ? "  ✓" : ""), fn: function () { c.vol = 150; tudo(); }},
        {rot: "Entrada suave 0,5 s" + (c.fin >= 0.5 ? "  ✓" : ""), fn: function () { c.fin = c.fin >= 0.5 ? 0 : 0.5; tudo(); }}, {rot: "Saída suave 0,5 s" + (c.fout >= 0.5 ? "  ✓" : ""), fn: function () { c.fout = c.fout >= 0.5 ? 0 : 0.5; tudo(); }},
        {rot: "🔊 Normalizar volume" + (c.normG ? "  ✓" : ""), fn: function () { normalizar(c); }}, {rot: "Reduzir ruído" + (c.ruido ? "  ✓" : ""), fn: function () { c.ruido = c.ruido ? 0 : 2; tudo(); }}, {rot: "Realçar voz" + (c.voz ? "  ✓" : ""), fn: function () { c.voz = c.voz ? 0 : 1; tudo(); }}]
        .concat(c.tipo === "video" ? [{rot: "🎵 Extrair áudio", fn: function () { extrairAudio(c); }}] : []).concat([{rot: "Abrir os ajustes de som…", fn: abrirSom}])}); }
      itens.push("-");
      if (c.tipo !== "texto") itens.push({icone: "⇄", rot: "Substituir mídia…", fn: function () { substituir(c); }});
      if (c.tipo === "video" || c.tipo === "audio") itens.push({icone: "⏩", rot: "Velocidade (" + String(vel(c)).replace(".", ",") + "×)", sub: VELS.map(function (v) { return {rot: String(v).replace(".", ",") + "×" + (v === vel(c) ? "  ✓" : ""), fn: function () { mudarVel(c, v); }}; })});
      if (c.tipo === "video") itens.push({icone: "❄", rot: "Congelar quadro na agulha", fn: congelar});
      if (vis) { itens.push({icone: "◧", rot: "Transição de entrada", sub: [{rot: "Corte seco", fn: function () { c.trans = null; tudo(); }}].concat(Object.keys(TRANS).map(function (k) { return {rot: TRANS[k] + (c.trans && c.trans.tipo === k ? "  ✓" : ""), fn: function () { c.trans = {tipo: k, dur: (c.trans && c.trans.dur) || 0.6}; tudo(); verTransicao(c); }}; }))});
        itens.push({icone: "✦", rot: "Efeito", sub: [{rot: "Nenhum", fn: function () { c.efeito = ""; tudo(); }}].concat(Object.keys(EFEITOS).map(function (k) { return {rot: EFEITOS[k] + (c.efeito === k ? "  ✓" : ""), fn: function () { c.efeito = k; if (c.efInt == null) c.efInt = 85; tudo(); }}; }))});
        if (c.trilha === "v1" || c.trilha === "v2") itens.push({icone: c.trilha === "v1" ? "⬆" : "⬇", rot: c.trilha === "v1" ? "Levar para SOBREPOSIÇÃO" : "Levar para VÍDEO", fn: function () { c.trilha = c.trilha === "v1" ? "v2" : "v1"; tudo(); }}); }
      itens.push("-", {icone: "🗑", rot: "Apagar", tecla: "Delete", perigo: true, fn: function () { apagar(false); }}, {icone: "⇤", rot: "Apagar e fechar o espaço", tecla: "Shift+Delete", perigo: true, fn: function () { apagar(true); }});
      return {itens: itens, titulo: (c.tipo === "texto" ? "TEXTO" : c.tipo === "audio" ? "SOM" : c.tipo === "imagem" ? "IMAGEM" : "VÍDEO").toUpperCase()}; });
    // MENU DA MÍDIA (biblioteca)
    BWFerr.contexto($("veLib"), "[data-mid]", function (el) { var m = MID[el.dataset.mid]; if (!m) return []; var c = sel();
      return {titulo: m.nome.slice(0, 30).toUpperCase(), itens: [
        {icone: "＋", rot: "Pôr na linha do tempo", fn: function () { addClip(m); }},
        {icone: "⤓", rot: m.tipo === "audio" ? "Pôr na agulha (EFEITOS)" : "Pôr na agulha (SOBREPOSIÇÃO)", fn: function () { addClip(m, m.tipo === "audio" ? "a2" : "v2"); }},
        {icone: "⇄", rot: "Trocar o clipe escolhido por esta", off: !c || c.tipo === "texto" || (c.tipo === "audio") !== (m.tipo === "audio"), fn: function () { soltarEl(c.id); c.mid = m.id; c.tipo = m.tipo; c.corte = 0; c.dur = Math.min(c.dur, maxDur(c)); tudo(); aviso("Clipe trocado por " + m.nome + "."); }},
        "-", {icone: "🗑", rot: "Tirar da biblioteca", perigo: true, fn: function () { var x = el.querySelector("[data-del]"); if (x) x.click(); }}]}; });
  }
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); var fs = [].slice.call((e.dataTransfer && e.dataTransfer.files) || []); if (fs.length) importar(fs); });
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var u = null; try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; u = s && s.data && s.data.session && s.data.session.user; } catch (e) {}
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();

  /* celular: a prévia fica presa no topo — a página reserva a altura dela (e a das abas de baixo) ao rolar até um botão (regras 52 e 71) */
  if (window.BWFerr && !APP) BWFerr.telaFixa({wrap: document.querySelector(".wrap"), grade: document.querySelector(".ve-grade"), palco: document.querySelector(".ve-palco"), rola: [document.querySelector(".ve-tl")], soltos: [document.querySelector(".ve-tl")], painelLer: function () { return JSON.parse(localStorage.getItem("ui_ve_paineis") || "{}"); }, painelGravar: function (S) { localStorage.setItem("ui_ve_paineis", JSON.stringify(S)); }, alturaPropria: true, some: [document.querySelector(".wrap > .ve-nota")],
    aviso: $("veAviso"), aoMedir: function (cel) { var pal = document.querySelector(".ve-palco"); cv.style.maxHeight = cel ? "" : Math.max(140, pal.clientHeight - 84) + "px"; }});
  /* ---------- 21/11 — layout: painéis que recolhem, tela grande, divisa arrastável, camadas só com conteúdo ---------- */
  (function () {
    var grade = $("veGrade"), wrap = document.querySelector(".wrap"), tl = $("veTl"), div = $("veDiv"), V = {esq: true, dir: true, tl: 0, todas: false, we: 0, wd: 0, min: false, solto: {}}, grande = false, PAINEL = {esq: "veEsq", dir: "veProp"};
    try { var g0 = JSON.parse(localStorage.getItem("ui_ve_vista") || "null"); if (g0) { V.esq = g0.esq !== false; V.dir = g0.dir !== false; V.tl = +g0.tl || 0; V.todas = !!g0.todas; V.we = +g0.we || 0; V.wd = +g0.wd || 0; V.min = !!g0.min; V.solto = g0.solto && typeof g0.solto === "object" ? g0.solto : {}; } } catch (e) {}
    function lembrar() { try { localStorage.setItem("ui_ve_vista", JSON.stringify(V)); } catch (e) {} }
    function aplicar() {
      var e = V.esq && !grande, d = V.dir && !grande; grade.classList.toggle("sem-esq", !e || !!V.solto.esq); grade.classList.toggle("sem-dir", !d || !!V.solto.dir);
      ["esq", "dir"].forEach(function (k) { var el = $(PAINEL[k]), so = V.solto[k], ver = k === "esq" ? e : d; el.classList.toggle("ve-solto", !!so); el.classList.toggle("ve-oculto", !!so && !ver);
        if (so) { var w = lim(so.w || 320, 200, innerWidth - 20), hh = lim(so.h || 420, 150, innerHeight - 20); el.style.width = w + "px"; el.style.height = hh + "px"; el.style.left = lim(so.x, 0, Math.max(0, innerWidth - 80)) + "px"; el.style.top = lim(so.y, 0, Math.max(0, innerHeight - 40)) + "px"; }
        else { el.style.width = el.style.height = el.style.left = el.style.top = ""; }
        var bs = el.querySelector("[data-solta]"); if (bs) bs.textContent = so ? "⇲" : "⇱"; }); wrap.classList.toggle("ve-grande", grande); tl.classList.toggle("todas", V.todas);
      wrap.style.setProperty("--ve-tl-h", V.tl ? V.tl + "px" : "auto"); if (V.we) wrap.style.setProperty("--ve-esq", V.we + "px"); else wrap.style.removeProperty("--ve-esq"); if (V.wd) wrap.style.setProperty("--ve-dir", V.wd + "px"); else wrap.style.removeProperty("--ve-dir");
      tl.classList.toggle("min", V.min && !grande); $("veTlMin").setAttribute("aria-pressed", V.min); $("veTlMin").textContent = (V.min ? "▸" : "▾") + " LINHA DO TEMPO"; wrap.style.setProperty("--ve-tl-max", V.tl ? "70vh" : "36vh");
      $("veTogEsq").setAttribute("aria-pressed", e); $("veTogDir").setAttribute("aria-pressed", d); $("veCheia").setAttribute("aria-pressed", grande); $("veTodas").setAttribute("aria-pressed", V.todas); $("veTodas").classList.toggle("on", V.todas);
      window.dispatchEvent(new Event("resize")); desenhar();
    }
    $("veTogEsq").addEventListener("click", function () { if (grande) { grande = false; V.esq = true; } else V.esq = !V.esq; lembrar(); aplicar(); });
    $("veTogDir").addEventListener("click", function () { if (grande) { grande = false; V.dir = true; } else V.dir = !V.dir; lembrar(); aplicar(); });
    $("veCheia").addEventListener("click", function () { grande = !grande; aplicar(); if (grande) aviso("TELA GRANDE — toque em ⛶ ou aperte Esc para voltar."); });
    $("veTodas").addEventListener("click", function () { V.todas = !V.todas; lembrar(); aplicar(); });
    /* DESCOLAR: o painel vira uma janela solta — arrasta pela barrinha ⠿, estica pelo canto, ⇲ encaixa de novo */
    grade.addEventListener("click", function (e) { var b = e.target.closest("[data-solta],[data-some]"); if (!b) return; var k = b.dataset.solta || b.dataset.some;
      if (b.dataset.some) { V[k] = false; lembrar(); aplicar(); return; }
      if (V.solto[k]) delete V.solto[k]; else { var r = $(PAINEL[k]).getBoundingClientRect(); V.solto[k] = {x: Math.round(r.left + (k === "esq" ? 24 : -24)), y: Math.round(r.top + 24), w: Math.round(Math.max(260, r.width)), h: Math.round(Math.min(r.height, innerHeight * 0.7))}; }
      lembrar(); aplicar(); });
    var mv = null;
    grade.addEventListener("pointerdown", function (e) { var pg = e.target.closest(".ve-pega"); if (!pg || e.target.closest("button")) return; var k = pg.dataset.pega; if (!V.solto[k]) return; mv = {k: k, x: e.clientX, y: e.clientY, x0: V.solto[k].x, y0: V.solto[k].y}; try { pg.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    grade.addEventListener("pointermove", function (e) { if (!mv) return; var so = V.solto[mv.k], el = $(PAINEL[mv.k]); so.x = Math.round(lim(mv.x0 + e.clientX - mv.x, 0, innerWidth - 80)); so.y = Math.round(lim(mv.y0 + e.clientY - mv.y, 0, innerHeight - 40)); el.style.left = so.x + "px"; el.style.top = so.y + "px"; });
    var fimMv = function () { if (!mv) return; mv = null; lembrar(); }; grade.addEventListener("pointerup", fimMv); grade.addEventListener("pointercancel", fimMv);
    grade.addEventListener("dblclick", function (e) { var pg = e.target.closest(".ve-pega"); if (!pg || e.target.closest("button")) return; var k = pg.dataset.pega; if (V.solto[k]) { delete V.solto[k]; lembrar(); aplicar(); } });
    /* a prévia acompanha o palco: camada nova na linha do tempo, coluna arrastada, painel escondido — tudo muda a altura dele */
    if (window.ResizeObserver) { var palcoEl = document.querySelector(".ve-palco"); new ResizeObserver(function () { if (wrap.classList.contains("bwf-fixo") && !wrap.classList.contains("bwf-cel")) cv.style.maxHeight = Math.max(140, palcoEl.clientHeight - 84) + "px"; }).observe(palcoEl); }
    if (window.ResizeObserver) { var ro = new ResizeObserver(function (l) { l.forEach(function (x) { var k = x.target.id === "veEsq" ? "esq" : "dir", so = V.solto[k]; if (!so || !x.target.getClientRects().length) return; var r = x.target.getBoundingClientRect(); if (Math.abs(r.width - so.w) > 2 || Math.abs(r.height - so.h) > 2) { so.w = Math.round(r.width); so.h = Math.round(r.height); lembrar(); } }); }); ro.observe($("veEsq")); ro.observe($("veProp")); }
    /* CRIAR: no PC a caixa não ocupa lugar — abre pelo botão ✦ CRIAR da MÍDIA e fecha de novo */
    $("veCriarBt").addEventListener("click", function () { var ab = $("veEsq").classList.toggle("criar"); this.setAttribute("aria-expanded", ab); this.classList.toggle("on", ab); if (ab) { var c = $("veCriar"), d0 = c.querySelector("[data-seta]"); if (d0 && c.querySelector(".ve-ferr") && !c.querySelector(".ve-ferr").offsetParent) d0.click(); c.scrollIntoView({block: "nearest"}); } });
    $("veTlMin").addEventListener("click", function () { V.min = !V.min; lembrar(); aplicar(); });
    /* largura das colunas: arrastar a beirada da prévia; puxar até o fim esconde o painel */
    [["vePuxaE", "esq", "we", "veEsq", 1], ["vePuxaD", "dir", "wd", "veProp", -1]].forEach(function (q) {
      var p = $(q[0]), a2 = null;
      p.addEventListener("pointerdown", function (e) { var alvo = $(q[3]); a2 = {x: e.clientX, w: V[q[1]] ? alvo.getBoundingClientRect().width : 0}; if (!V[q[1]]) { V[q[1]] = true; V[q[2]] = 140; } p.classList.add("on"); try { p.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
      p.addEventListener("pointermove", function (e) { if (!a2) return; var w = Math.round(a2.w + (e.clientX - a2.x) * q[4]); if (w < 130) { V[q[1]] = false; } else { V[q[1]] = true; V[q[2]] = Math.min(w, Math.round(grade.clientWidth * 0.45)); } aplicar(); });
      var fim = function () { if (!a2) return; a2 = null; p.classList.remove("on"); lembrar(); };
      p.addEventListener("pointerup", fim); p.addEventListener("pointercancel", fim);
      p.addEventListener("dblclick", function () { V[q[2]] = 0; V[q[1]] = true; lembrar(); aplicar(); });
    });
    /* PRÉVIA EM OUTRA TELA: janela só com a prévia (a mesma imagem, ao vivo) para arrastar ao segundo monitor e pôr em tela cheia */
    var JAN = null;
    /* 2º monitor: com a permissão "gerenciar janelas" (Chrome/Edge e o app BW) a janela já nasce do tamanho do OUTRO monitor */
    async function outraTela() { try { if (!window.getScreenDetails) return null; var sd = await window.getScreenDetails(), at = sd.currentScreen, outra = sd.screens.filter(function (x) { return x !== at && !(x.left === at.left && x.top === at.top); })[0]; return outra || null; } catch (e) { return null; } }
    $("veSegunda").addEventListener("click", async function () {
      if (JAN && !JAN.closed) { JAN.close(); JAN = null; $("veSegunda").setAttribute("aria-pressed", "false"); return; }
      if (!cv.captureStream) { aviso("Este navegador não abre a prévia em outra janela.", true); return; }
      var tela2 = await outraTela(), pos = tela2 ? "popup=1,left=" + tela2.availLeft + ",top=" + tela2.availTop + ",width=" + tela2.availWidth + ",height=" + tela2.availHeight : "popup=1,width=960,height=600";
      JAN = window.open("", "bwPrevia", pos); if (!JAN) { aviso("O navegador bloqueou a janela — libere pop-ups para este site e toque de novo.", true); return; }
      var d = JAN.document; d.title = "Prévia — Brightway"; d.body.style.cssText = "margin:0;background:#000;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden";
      var v = d.createElement("video"); v.muted = true; v.autoplay = true; v.playsInline = true; v.style.cssText = "max-width:100vw;max-height:100vh;width:100%;height:100%;object-fit:contain"; d.body.appendChild(v);
      var b2 = d.createElement("button"); b2.textContent = "⛶ TELA CHEIA (ou duplo clique)"; b2.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);padding:10px 16px;border-radius:12px;border:1px solid #555;background:#12151c;color:#fff;font:700 13px sans-serif;cursor:pointer"; d.body.appendChild(b2);
      var cheia = function () { var el = d.documentElement; if (d.fullscreenElement) d.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(function () {}); };
      b2.onclick = cheia; v.ondblclick = cheia; d.addEventListener("fullscreenchange", function () { b2.style.display = d.fullscreenElement ? "none" : ""; });
      try { v.srcObject = cv.captureStream(30); v.play().catch(function () {}); } catch (e) { aviso("Não consegui mandar a prévia para a outra janela.", true); }
      /* teclas na janela da prévia comandam o editor: Espaço toca/pausa, ← → anda, Home volta ao início */
      d.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "k") { e.preventDefault(); $("vePlay").click(); } else if (e.key === "ArrowLeft") irPara(T - (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "ArrowRight") irPara(T + (e.shiftKey ? 1 : 1 / 30)); else if (e.key === "Home") irPara(0); else if (e.key === "f") cheia(); });
      $("veSegunda").setAttribute("aria-pressed", "true"); desenhar(); aviso(tela2 ? "🖥 Prévia aberta no outro monitor — toque em TELA CHEIA lá (Espaço toca e pausa)." : "🖥 Prévia aberta em outra janela — arraste para o segundo monitor e toque em TELA CHEIA lá (Espaço toca e pausa).");
      var vigia = setInterval(function () { if (!JAN || JAN.closed) { clearInterval(vigia); JAN = null; $("veSegunda").setAttribute("aria-pressed", "false"); } }, 800);
    });
    window.addEventListener("pagehide", function () { if (JAN && !JAN.closed) JAN.close(); });
    var bc = $("veCelular"); if (bc) bc.addEventListener("click", function () { if (window.BWControle) BWControle.painel(window.__video); else aviso("O controle pelo celular não carregou (sem internet?).", true); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && grande && !document.querySelector(".bwf-menu,.bwf-ajuda")) { grande = false; aplicar(); } });
    var arr = null;
    div.addEventListener("pointerdown", function (e) { arr = {y: e.clientY, h: tl.getBoundingClientRect().height}; div.classList.add("on"); try { div.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
    div.addEventListener("pointermove", function (e) { if (!arr) return; V.tl = Math.round(lim(arr.h + (arr.y - e.clientY), 96, innerHeight * 0.7)); aplicar(); });
    function soltar() { if (!arr) return; arr = null; div.classList.remove("on"); lembrar(); }
    div.addEventListener("pointerup", soltar); div.addEventListener("pointercancel", soltar);
    div.addEventListener("dblclick", function () { V.tl = 0; lembrar(); aplicar(); });
    window.__veVista = {mostrar: function (k) { if (!V[k]) { V[k] = true; lembrar(); aplicar(); } }, estado: function () { return {esq: V.esq, dir: V.dir, tl: V.tl, todas: V.todas, grande: grande, we: V.we, wd: V.wd, min: V.min, solto: JSON.parse(JSON.stringify(V.solto))}; }, aoSelecionar: function () { if (!V.dir && !grande) { V.dir = true; aplicar(); } }};
    aplicar();
  })();
  function reservar() { var m = window.matchMedia("(max-width:1100px)").matches, h = document.documentElement.style; h.scrollPaddingTop = m ? (document.querySelector(".ve-palco").offsetHeight + 10) + "px" : ""; h.scrollPaddingBottom = m ? "90px" : ""; }
  window.addEventListener("resize", reservar); reservar();
  /* ================= PROXY, CACHE, PASTAS E JANELA DE EXPORTAR (22/11/2026) =================
     Dono: "FAZER PROXY abaixo da mídia, com a barra se enchendo e o tempo que falta; LIMPAR CACHE; mostrar o tamanho em GB e a memória;
     engrenagem para escolher onde o projeto e o cache são salvos e exportados; janela de exportação com ultra qualidade, YouTube 4K,
     Full HD, Instagram, só o áudio, sequência de JPEG/PNG e outros codecs". Proxy = cópia 720p feita no aparelho (assets/bw-proxy.js);
     a edição usa o proxy, a exportação usa SEMPRE o original. Nada sai do aparelho. */
  var PX = {}, ORIGINAL = false, PASTAS = {projeto: null, cache: null, export: null}, PXCFG = {usar: true, curto: 720, auto: true};
  try { var pc0 = JSON.parse(localStorage.getItem("ui_ve_proxy") || "{}"); if (pc0.usar === false) PXCFG.usar = false; if (pc0.curto) PXCFG.curto = pc0.curto; if (pc0.auto === false) PXCFG.auto = false; } catch (e) {}
  function gravarPxCfg() { try { localStorage.setItem("ui_ve_proxy", JSON.stringify(PXCFG)); } catch (e) {} }
  function urlDe(m) { var x = PX[m.id]; return x && x.url && PXCFG.usar && !ORIGINAL && m.tipo === "video" ? x.url : m.url; }
  function recarregarEls(mid) { Object.keys(EL).forEach(function (k) { var c = P.clips.filter(function (x) { return x.id === k; })[0]; if (!mid || (c && c.mid === mid)) soltarEl(k); }); if (!TOCANDO) desenhar(); }
  function usarOriginais(sim) { if (ORIGINAL === !!sim) return; ORIGINAL = !!sim; if (Object.keys(PX).length) recarregarEls(); }
  function mb(b) { return b >= 1073741824 ? (b / 1073741824).toFixed(2).replace(".", ",") + " GB" : (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace(".", ",") + " MB"; }
  function tempoTxt(s) { if (s == null || !isFinite(s)) return "calculando…"; s = Math.max(1, Math.round(s)); return s < 60 ? s + " s" : Math.floor(s / 60) + " min " + (s % 60 < 10 ? "0" : "") + s % 60 + " s"; }

  /* ---------- pastas (File System Access: Chrome/Edge do computador) ---------- */

  /* 23/11 (dono: "o pacote é meu, consegue pelo menos utilizar?"): ★ MINHA PASTA — a biblioteca que a pessoa JÁ TEM no computador (efeitos sonoros, trilhas,
     overlays, fontes) aparece dentro do editor, pelas subpastas dela. Só LEITURA e só neste aparelho: nada é copiado para a plataforma nem enviado
     (pacote comprado tem licença de quem comprou — regra 178). Leve: lista só a pasta aberta, miniatura só do que está à vista, vídeo sem prévia. */
  var PF = {raiz: null, pilha: [], lista: null, busca: "", max: 240, mini: {}, som: null, obs: null};
  var PF_EXT = {video: /\.(mp4|mov|webm|m4v)$/i, imagem: /\.(png|jpe?g|webp|gif)$/i, audio: /\.(mp3|wav|m4a|ogg|aac|flac)$/i, fonte: /\.(ttf|otf|woff2?)$/i};
  function pfTipo(n) { for (var k in PF_EXT) if (PF_EXT[k].test(n)) return k; return ""; }
  async function pfPerm(pedir) { var h = PF.raiz; if (!h) return false; try { var o = {mode: "read"}; if ((await h.queryPermission(o)) === "granted") return true; return pedir ? (await h.requestPermission(o)) === "granted" : false; } catch (e) { return false; } }
  async function pfCarregar() { try { var r = await tx("cfg", "readonly", function (st) { return st.get("minhaPasta"); }); if (r && r.h) PF.raiz = r.h; } catch (e) {} try { var fo = await tx("cfg", "readonly", function (st) { return st.get("fontes"); }); for (var i = 0; fo && i < (fo.lista || []).length; i++) await pfFonte(fo.lista[i].blob, fo.lista[i].nome, true); } catch (e) {} }
  function pfAtual() { return PF.pilha.length ? PF.pilha[PF.pilha.length - 1] : PF.raiz; }
  async function pfListar() { var d = pfAtual(), L = [], fora = 0; for await (var en of d.values()) { if (en.name.charAt(0) === "." || en.name.charAt(0) === "_") continue; if (en.kind === "directory") L.push({n: en.name, h: en, t: "pasta"}); else { var t = pfTipo(en.name); if (t) L.push({n: en.name, h: en, t: t}); else fora++; } }
    L.sort(function (a, b) { return (a.t === "pasta" ? 0 : 1) - (b.t === "pasta" ? 0 : 1) || a.n.localeCompare(b.n, "pt", {numeric: true}); }); PF.lista = L; PF.fora = fora; }
  async function desenharPasta() { var lib = $("veLib");
    if (!PF.raiz) { lib.innerHTML = '<p class="ve-nota" style="grid-column:1/-1;margin:0 0 6px">Mostre aqui a biblioteca que você já tem no computador: sons, trilhas, overlays, imagens e fontes. Só este aparelho lê a pasta — nada é enviado.</p><button class="ve-bt pri" type="button" data-pfa="escolher" style="grid-column:1/-1">📁 ESCOLHER MINHA PASTA</button>'; return; }
    if (!(await pfPerm(false))) { lib.innerHTML = '<p class="ve-nota" style="grid-column:1/-1;margin:0 0 6px">O navegador pede a sua autorização de novo a cada vez que o editor abre.</p><button class="ve-bt pri" type="button" data-pfa="liberar" style="grid-column:1/-1">🔓 ABRIR “' + esc(PF.raiz.name) + '”</button><button class="ve-bt" type="button" data-pfa="escolher" style="grid-column:1/-1">Escolher outra pasta</button>'; return; }
    if (ABA !== "pasta") return;
    if (!PF.lista) { lib.innerHTML = '<p class="ve-nota" style="grid-column:1/-1;margin:0">Lendo a pasta…</p>'; try { await pfListar(); } catch (e) { lib.innerHTML = '<p class="ve-nota" style="grid-column:1/-1;margin:0 0 6px">Não consegui ler esta pasta.</p><button class="ve-bt" type="button" data-pfa="escolher" style="grid-column:1/-1">Escolher outra pasta</button>'; return; } if (ABA !== "pasta") return; }
    var caminho = [PF.raiz.name].concat(PF.pilha.map(function (h) { return h.name; }));
    lib.innerHTML = '<div class="ve-pfh">' + (PF.pilha.length ? '<button class="ve-bt" type="button" data-pfa="voltar" aria-label="Voltar uma pasta">‹</button>' : "") + '<b title="' + esc(caminho.join(" › ")) + '">📁 ' + esc(caminho[caminho.length - 1]) + '</b><button class="ve-bt" type="button" data-pfa="escolher" title="Escolher outra pasta" aria-label="Escolher outra pasta">⇄</button></div>' +
      '<input class="ve-pfb" id="vePfBusca" type="search" placeholder="Procurar nesta pasta" aria-label="Procurar nesta pasta" value="' + esc(PF.busca) + '"><div id="vePfGrade" style="display:contents"></div>';
    pfGrade(); }
  function pfGrade() { var g = $("vePfGrade"); if (!g) return; var q = PF.busca.trim().toLowerCase(), L = PF.lista.map(function (x, i) { return {x: x, i: i}; }).filter(function (o) { return !q || o.x.n.toLowerCase().indexOf(q) >= 0; });
    var ic = {pasta: "📁", video: "🎬", imagem: "🖼", audio: "🔊", fonte: "Aa"};
    g.innerHTML = (L.length ? L.slice(0, PF.max).map(function (o) { var x = o.x, nome = x.t === "pasta" ? x.n : x.n.replace(/\.[^.]+$/, "");
      return x.t === "pasta" ? '<div class="ve-item ve-pf pst" role="button" tabindex="0" data-pfd="' + o.i + '" aria-label="Abrir a pasta ' + esc(x.n) + '"><span class="mini" aria-hidden="true">📁</span><span>' + esc(nome) + '</span></div>'
        : '<div class="ve-item ve-pf" role="button" tabindex="0" data-pf="' + o.i + '" title="' + esc(x.n) + '" aria-label="' + (x.t === "fonte" ? "Usar a fonte " : "Pôr na linha do tempo: ") + esc(nome) + '"><span class="mini" aria-hidden="true"' + (x.t === "imagem" ? ' data-pfimg="' + o.i + '"' : "") + '>' + (PF.mini[pfChave(x)] ? '<img alt="" src="' + PF.mini[pfChave(x)] + '">' : ic[x.t]) + '</span><span>' + esc(nome) + '</span>' + (x.t === "audio" ? '<button type="button" class="ve-pfo" data-pfouvir="' + o.i + '" title="Ouvir" aria-label="Ouvir ' + esc(nome) + '">▶</button>' : "") + '</div>'; }).join("")
      : '<p class="ve-nota" style="grid-column:1/-1;margin:0">' + (q ? "Nada com esse nome nesta pasta." : "Nada que o editor abra nesta pasta.") + '</p>') +
      (L.length > PF.max ? '<button class="ve-bt" type="button" data-pfa="mais" style="grid-column:1/-1">Mostrar mais (' + (L.length - PF.max) + ')</button>' : "") +
      (PF.fora && !q ? '<p class="ve-nota" style="grid-column:1/-1;margin:4px 0 0">' + PF.fora + ' arquivo(s) de outros programas (Premiere, After Effects, LUT…) não aparecem.</p>' : "");
    if (PF.obs) PF.obs.disconnect();
    if (window.IntersectionObserver) { PF.obs = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { PF.obs.unobserve(en.target); pfMini(en.target); } }); }, {root: $("veLib"), rootMargin: "120px"}); [].forEach.call(g.querySelectorAll("[data-pfimg]"), function (el) { if (!el.firstElementChild) PF.obs.observe(el); }); } }
  function pfChave(x) { return PF.pilha.map(function (h) { return h.name; }).join("/") + "/" + x.n; }
  async function pfMini(el) { var x = PF.lista[+el.dataset.pfimg]; if (!x) return; try { var f = await x.h.getFile(); if (f.size > 40e6) return; var bm = await createImageBitmap(f, {resizeWidth: 168, resizeQuality: "low"}), c = document.createElement("canvas"); c.width = bm.width; c.height = bm.height; c.getContext("2d").drawImage(bm, 0, 0); bm.close && bm.close();
      var ks = Object.keys(PF.mini); if (ks.length > 300) delete PF.mini[ks[0]]; var u = c.toDataURL("image/webp", 0.7); PF.mini[pfChave(x)] = u; if (el.isConnected) el.innerHTML = '<img alt="" src="' + u + '">'; } catch (e) {} }
  function pfCalar() { if (PF.som) { try { PF.som.a.pause(); URL.revokeObjectURL(PF.som.u); } catch (e) {} if (PF.som.b && PF.som.b.isConnected) { PF.som.b.textContent = "▶"; PF.som.b.classList.remove("on"); } PF.som = null; } }
  async function pfFonte(blob, nome, calado) { var fam = String(nome).replace(/\.[^.]+$/, "").replace(/[^A-Za-zÀ-ÿ0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); if (/^[0-9]/.test(fam)) fam = "F " + fam; if (!fam) return "";
    var ff = new FontFace(fam, await blob.arrayBuffer()); await ff.load(); document.fonts.add(ff); if (FONTES.indexOf(fam) < 0) FONTES.push(fam);
    if (!calado) { try { var r = (await tx("cfg", "readonly", function (st) { return st.get("fontes"); })) || {id: "fontes", lista: []}; r.lista = r.lista.filter(function (o) { return o.nome !== nome; }).concat([{nome: nome, blob: blob}]).slice(-40); await tx("cfg", "readwrite", function (st) { return st.put(r); }); } catch (e) {} }
    return fam; }
  async function cliquePasta(e) { var a = e.target.closest("[data-pfa]"), d = e.target.closest("[data-pfd]"), o = e.target.closest("[data-pfouvir]"), it = e.target.closest("[data-pf]");
    if (a) { var k = a.dataset.pfa;
      if (k === "escolher") { try { var h = await window.showDirectoryPicker({id: "bw-ve-minha", mode: "read"}); pfCalar(); PF.raiz = h; PF.pilha = []; PF.lista = null; PF.busca = ""; PF.max = 240; await tx("cfg", "readwrite", function (st) { return st.put({id: "minhaPasta", h: h}); }); } catch (x) { return; } }
      else if (k === "liberar") { if (!(await pfPerm(true))) { aviso("O navegador não liberou a pasta.", true); return; } }
      else if (k === "voltar") { pfCalar(); PF.pilha.pop(); PF.lista = null; PF.busca = ""; PF.max = 240; }
      else if (k === "mais") { PF.max += 240; pfGrade(); return; }
      desenharPasta(); return; }
    if (d) { pfCalar(); PF.pilha.push(PF.lista[+d.dataset.pfd].h); PF.lista = null; PF.busca = ""; PF.max = 240; desenharPasta(); return; }
    if (o) { var xo = PF.lista[+o.dataset.pfouvir], era = PF.som && PF.som.i === +o.dataset.pfouvir; pfCalar(); if (era || !xo) return; try { var fo = await xo.h.getFile(), u = URL.createObjectURL(fo), au = new Audio(u); PF.som = {a: au, u: u, b: o, i: +o.dataset.pfouvir}; o.textContent = "■"; o.classList.add("on"); au.onended = pfCalar; await au.play(); } catch (x) { pfCalar(); aviso("Não consegui tocar este som.", true); } return; }
    if (it) { var x = PF.lista[+it.dataset.pf]; if (!x) return; pfCalar(); var f; try { f = await x.h.getFile(); } catch (er) { aviso("Não consegui abrir este arquivo.", true); return; }
      if (x.t === "fonte") { try { var fam = await pfFonte(f, x.n); var ct = P.clips.filter(function (c) { return c.id === SEL && c.tipo === "texto"; })[0]; if (ct) { ct.fonte = fam; tudo(); } aviso("✓ Fonte " + fam + (ct ? " no texto escolhido" : " pronta na lista de fontes")); } catch (er) { aviso("Esta fonte não abriu.", true); } return; }
      var antes = {}; Object.keys(MID).forEach(function (kk) { antes[kk] = 1; }); await importar([f]); var novo = Object.keys(MID).filter(function (kk) { return !antes[kk]; })[0]; ABA = "pasta"; desenharLib();
      if (novo && !MID[novo].ruim) { addClip(MID[novo]); if (window.VEApp && VEApp.aberta && VEApp.aberta()) VEApp.fechar(); aviso("✓ " + String(MID[novo].nome).slice(0, 40) + " na linha do tempo"); } } }
  $("veLib").addEventListener("input", function (e) { if (e.target && e.target.id === "vePfBusca") { PF.busca = e.target.value; PF.max = 240; pfGrade(); } });
  var TEM_PASTA = typeof window.showDirectoryPicker === "function";
  async function permissao(h, pedir) { if (!h) return false; try { var o = {mode: "readwrite"}; if ((await h.queryPermission(o)) === "granted") return true; return pedir ? (await h.requestPermission(o)) === "granted" : false; } catch (e) { return false; } }
  async function salvarNaPasta(qual, nome, blob) { var h = PASTAS[qual]; if (!h || !(await permissao(h, false))) return ""; try { var f = await h.getFileHandle(nome, {create: true}), w = await f.createWritable(); await w.write(blob); await w.close(); return h.name; } catch (e) { return ""; } }
  async function lerDaPasta(qual, nome) { var h = PASTAS[qual]; if (!h || !(await permissao(h, false))) return null; try { return await (await h.getFileHandle(nome)).getFile(); } catch (e) { return null; } }
  async function apagarDaPasta(qual, nome) { var h = PASTAS[qual]; if (!h || !(await permissao(h, false))) return; try { await h.removeEntry(nome); } catch (e) {} }
  async function carregarPastas() { var r = await tx("cfg", "readonly", function (s) { return s.get("pastas"); }); if (r) ["projeto", "cache", "export"].forEach(function (k) { PASTAS[k] = r[k] || null; }); }
  function gravarPastas() { return tx("cfg", "readwrite", function (s) { return s.put({id: "pastas", projeto: PASTAS.projeto, cache: PASTAS.cache, export: PASTAS.export}); }); }
  var tProj = 0;
  function copiaProjeto() { if (!PASTAS.projeto) return; clearTimeout(tProj); tProj = setTimeout(function () { salvarNaPasta("projeto", (P.nome || "projeto-brightway").replace(/[^\w\-]+/g, "-") + ".bwvideo.json", new Blob([JSON.stringify({app: "BW editor de vídeo", versao: 1, salvo: new Date().toISOString(), projeto: P, midias: Object.keys(MID).map(function (k) { return {id: k, nome: MID[k].nome, tipo: MID[k].tipo, bytes: MID[k].blob ? MID[k].blob.size : 0}; })}, null, 1)], {type: "application/json"})); }, 2500); }

  /* ---------- proxies guardados ---------- */
  async function carregarProxies() {
    var l = (await tx("proxies", "readonly", function (s) { return s.getAll(); })) || [];
    for (var i = 0; i < l.length; i++) { var x = l[i]; if (!MID[x.id]) continue; var b = x.blob || (x.arquivo ? await lerDaPasta("cache", x.arquivo) : null);
      PX[x.id] = {url: b ? URL.createObjectURL(b) : "", bytes: x.bytes || (b ? b.size : 0), w: x.w, h: x.h, curto: x.curto, comSom: x.comSom, arquivo: x.arquivo || "", trancado: !b}; }
  }
  async function guardarProxy(mid, r) {
    var nome = "", reg = {id: mid, w: r.w, h: r.h, curto: r.curto, comSom: r.comSom, bytes: r.blob.size, criado: Date.now()};
    if (PASTAS.cache) { nome = mid + ".proxy" + r.curto + ".mp4"; if (await salvarNaPasta("cache", nome, r.blob)) reg.arquivo = nome; else nome = ""; }
    if (!nome) reg.blob = r.blob;
    var ok = true; try { await tx("proxies", "readwrite", function (s) { return s.put(reg); }); } catch (e) { ok = false; }
    if (PX[mid] && PX[mid].url) try { URL.revokeObjectURL(PX[mid].url); } catch (e) {}
    PX[mid] = {url: URL.createObjectURL(r.blob), bytes: r.blob.size, w: r.w, h: r.h, curto: r.curto, comSom: r.comSom, arquivo: reg.arquivo || ""};
    return ok;
  }
  async function apagarProxy(mid) { var x = PX[mid]; if (!x) return; if (x.url) try { URL.revokeObjectURL(x.url); } catch (e) {} if (x.arquivo) await apagarDaPasta("cache", x.arquivo); delete PX[mid]; await tx("proxies", "readwrite", function (s) { return s.delete(mid); }); }

  /* ---------- barra embaixo da mídia: FAZER PROXY · LIMPAR CACHE · ⚙ + uso de disco e memória ---------- */
  function montarCache() {
    if ($("veCache")) return; var lib = $("veLib"); if (!lib) return;
    var d = document.createElement("div"); d.className = "ve-cache"; d.id = "veCache";
    d.innerHTML = '<div class="ve-linha"><button class="ve-bt" id="veProxyBt" type="button" title="Faz cópias leves (720p) dos vídeos para editar sem pesar — a exportação usa o original">⚡ FAZER PROXY</button><button class="ve-bt" id="veLimparBt" type="button" title="Libera espaço: proxies, análises de pessoa, arquivos fora da linha do tempo">🧹 LIMPAR CACHE</button><button class="ve-bt ic" id="veCfgBt" type="button" title="Onde o projeto, o cache e os arquivos exportados são salvos" aria-label="Configurar pastas e proxy">⚙</button></div>'
      + '<div class="ve-uso" id="veUso" aria-live="polite">Medindo o espaço…</div>'
      + '<label class="ve-px"><input type="checkbox" id="veUsarPx"' + (PXCFG.usar ? " checked" : "") + '> Editar com os proxies (mais leve) <small id="vePxConta"></small></label>'
      + '<label class="ve-px"><input type="checkbox" id="vePxAuto"' + (PXCFG.auto !== false ? " checked" : "") + '> Fazer a cópia leve sozinho ao importar vídeo pesado (4K, HEVC)</label>';
    lib.parentNode.insertBefore(d, lib.nextSibling);
    $("veProxyBt").onclick = abrirProxy; $("veLimparBt").onclick = abrirLimpar; $("veCfgBt").onclick = abrirCfg;
    $("vePxAuto").onchange = function () { PXCFG.auto = this.checked; gravarPxCfg(); if (this.checked) proxyAuto(); };
    $("veUsarPx").onchange = function () { PXCFG.usar = this.checked; gravarPxCfg(); recarregarEls(); aviso(PXCFG.usar ? "⚡ Edição com proxy: os vídeos leves entram na prévia (a exportação usa o original)." : "Edição com os arquivos originais (mais pesado)."); medir(); };
    medir(); setInterval(function () { if (!document.hidden && $("veUso") && $("veUso").getClientRects().length) medir(); }, 6000);
  }
  async function medir() {
    var u = $("veUso"); if (!u) return;
    var midB = 0, pxB = 0, nV = 0, nP = 0; Object.keys(MID).forEach(function (k) { var m = MID[k]; if (m.blob && !m.ph) midB += m.blob.size || 0; if (m.tipo === "video" && !m.ph) { nV++; if (PX[k]) nP++; } });
    Object.keys(PX).forEach(function (k) { pxB += PX[k].bytes || 0; });
    var est = null; try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) {}
    var mem = performance.memory ? performance.memory.usedJSHeapSize : 0, players = Object.keys(EL).length;
    u.innerHTML = '<b>💾 ' + (est && est.usage != null ? mb(est.usage) + '</b> usados' + (est.quota ? ' de ' + mb(est.quota) : '') : mb(midB + pxB) + '</b>') + ' · mídias ' + mb(midB) + ' · proxies ' + mb(pxB)
      + '<br><b>🧠 ' + (mem ? mb(mem) : "—") + '</b> de memória' + (mem ? "" : " (o navegador não informa)") + ' · ' + players + ' vídeo' + (players === 1 ? "" : "s") + ' aberto' + (players === 1 ? "" : "s");
    var pc = $("vePxConta"); if (pc) pc.textContent = nV ? "· " + nP + " de " + nV + " vídeos com proxy" : "";
  }

  /* janela comum (fundo escuro + cartão); fecha no ✕, no Esc e no toque fora */
  function janela(id, titulo, html) {
    var j = $(id); if (j) j.remove(); j = document.createElement("div"); j.className = "ve-jan"; j.id = id; j.setAttribute("role", "dialog"); j.setAttribute("aria-modal", "true"); j.setAttribute("aria-label", titulo);
    j.innerHTML = '<div class="ve-jan-c"><div class="ve-jan-t"><b>' + esc(titulo) + '</b><button type="button" class="ve-bt ic" data-fechar aria-label="Fechar">✕</button></div><div class="ve-jan-corpo">' + html + "</div></div>";
    document.body.appendChild(j);
    j.addEventListener("click", function (e) { if (e.target === j || e.target.closest("[data-fechar]")) fecharJan(j); });
    j._tecla = function (e) { if (e.key === "Escape") { e.stopImmediatePropagation(); fecharJan(j); } }; document.addEventListener("keydown", j._tecla, true);
    return j;
  }
  function fecharJan(j) { if (!j) return; document.removeEventListener("keydown", j._tecla, true); j.remove(); }

  /* ---------- FAZER PROXY: escolher os vídeos → barra de cópia ---------- */
  function abrirProxy() {
    if (!window.BWProxy || !BWProxy.suporta()) { aviso("Este navegador não faz proxy — use o Chrome ou o app BW", true); return; }
    var vs = Object.keys(MID).map(function (k) { return MID[k]; }).filter(function (m) { return m.tipo === "video" && !m.ph; });
    if (!vs.length) { aviso("Importe vídeos primeiro: o proxy é feito dos vídeos da biblioteca.", true); return; }
    vs.sort(function (a, b) { return (b.blob ? b.blob.size : 0) - (a.blob ? a.blob.size : 0); });
    var na = P.clips.map(function (c) { return c.mid; });
    var j = janela("veJanProxy", "FAZER PROXY", '<p class="ve-nota" style="margin:0 0 8px">Cópias leves dos vídeos só para EDITAR — a prévia fica solta e o computador respira. Na exportação entra o arquivo ORIGINAL, sem perder qualidade.</p>'
      + '<div class="ve-linha" style="align-items:center"><label class="ve-cmp">Qualidade do proxy <select class="ve-sel" id="vePxCurto"><option value="540">540p (mais leve)</option><option value="720">720p (recomendado)</option><option value="1080">1080p (mais nítido)</option></select></label>'
      + '<button class="ve-bt" type="button" id="vePxTodos">MARCAR TODOS</button><button class="ve-bt" type="button" id="vePxSem">SÓ OS SEM PROXY</button></div>'
      + '<div class="ve-pxlista">' + vs.map(function (m) { var tem = PX[m.id], grande = (m.w || 0) * (m.h || 0) > 2.5e6;
        return '<label class="ve-pxit' + (m.ruim ? " ruim" : "") + '"><input type="checkbox" value="' + esc(m.id) + '"' + (!tem && !m.ruim ? " checked" : "") + (m.ruim ? " disabled" : "") + '>' + (m.capa ? '<img alt="" src="' + m.capa + '">' : '<span class="mini">🎬</span>') + '<span><b>' + esc(m.nome) + '</b><small>' + (m.w ? m.w + "×" + m.h + " · " : "") + (m.blob ? mb(m.blob.size) : "") + (m.dur ? " · " + fmtT(m.dur) : "") + (na.indexOf(m.id) >= 0 ? " · na linha do tempo" : "") + '</small></span>'
          + (m.ruim ? '<em class="dn">NÃO ABRE AQUI</em>' : tem ? '<em class="ok">⚡ ' + tem.curto + 'p · ' + mb(tem.bytes) + '</em>' : grande ? '<em class="md">pesado</em>' : "") + "</label>"; }).join("") + "</div>"
      + '<p class="ve-nota" id="vePxResumo"></p><div class="ve-linha"><button class="ve-bt pri" type="button" id="vePxIr">⚡ FAZER PROXY</button><button class="ve-bt" type="button" data-fechar>CANCELAR</button></div>');
    $("vePxCurto").value = String(PXCFG.curto);
    function resumo() { var sel = [].slice.call(j.querySelectorAll(".ve-pxlista input:checked")), seg = sel.reduce(function (t, i) { var m = MID[i.value]; return t + (m && m.dur || 0); }, 0);
      $("vePxResumo").textContent = sel.length ? sel.length + " vídeo" + (sel.length > 1 ? "s" : "") + " · " + fmtT(seg) + " de filmagem · leva uns " + tempoTxt(seg * 0.7) + " (depende da máquina)" : "Marque os vídeos que vão virar proxy.";
      $("vePxIr").disabled = !sel.length; $("vePxIr").textContent = "⚡ FAZER PROXY" + (sel.length ? " (" + sel.length + ")" : ""); }
    j.querySelector(".ve-pxlista").addEventListener("change", resumo); resumo();
    $("vePxTodos").onclick = function () { j.querySelectorAll(".ve-pxlista input:not(:disabled)").forEach(function (i) { i.checked = true; }); resumo(); };
    $("vePxSem").onclick = function () { j.querySelectorAll(".ve-pxlista input:not(:disabled)").forEach(function (i) { i.checked = !PX[i.value]; }); resumo(); };
    $("vePxIr").onclick = function () { var ids = [].map.call(j.querySelectorAll(".ve-pxlista input:checked"), function (i) { return i.value; }); PXCFG.curto = Number($("vePxCurto").value) || 720; gravarPxCfg(); fecharJan(j); filaProxy(ids, PXCFG.curto); };
  }
  var FILA = null, PEND = [];
  /* 23/11 (dono: "pesquise como CapCut e Premiere deixam tudo leve ao importar e editar"): o segredo deles é a CÓPIA LEVE automática (Premiere:
     "ingest" com Criar proxies; CapCut: proxy de 4K ligado nas configurações de desempenho) — antes daqui o proxy só nascia se a pessoa tocasse em
     ⚡ FAZER PROXY. Agora o vídeo PESADO (acima de Full HD, ou mais de ~12 Mbps, ou HEVC) ganha proxy 720p sozinho logo depois de importar, em segundo
     plano e com a janelinha minimizada; a exportação continua usando o original. Desliga em ⚙ (PXCFG.auto). */
  function pesado(m) { if (!m || m.tipo !== "video" || m.ruim || PX[m.id] || m.ph) return false; var px = (m.w || 0) * (m.h || 0), mbps = m.blob && m.dur ? m.blob.size * 8 / m.dur / 1e6 : 0;
    return px > 1920 * 1088 || mbps > 12 || m.codec === "hevc"; }
  function proxyAuto() { if (PXCFG.auto === false || !window.BWProxy || !BWProxy.suporta()) return; var ids = Object.keys(MID).filter(function (k) { return pesado(MID[k]) && PEND.indexOf(k) < 0; });
    if (!ids.length) return; if (FILA) { PEND = PEND.concat(ids); return; } filaProxy(ids, PXCFG.curto || 720, true); }
  window.__veProxyAuto = proxyAuto;
  async function filaProxy(ids, curto, auto) {
    if (FILA) { if (auto) { PEND = PEND.concat(ids); return; } aviso("Já tem proxy sendo feito — espere terminar ou cancele.", true); return; }
    var lista = ids.map(function (k) { return MID[k]; }).filter(Boolean), totSeg = lista.reduce(function (t, m) { return t + (m.dur || 1); }, 0), feitoSeg = 0, t0 = performance.now(), feitos = 0, falhas = [];
    FILA = {cancelado: false};
    var c = document.createElement("div"); c.className = "ve-copia"; c.id = "veCopia"; c.setAttribute("role", "status");
    c.innerHTML = '<div class="ve-copia-t"><b>⚡ FAZENDO PROXY</b><span id="veCpN"></span><button type="button" class="ve-bt ic" id="veCpMin" aria-label="Minimizar" title="Minimizar">—</button></div><div class="ve-copia-corpo"><div class="ve-cp-nome" id="veCpNome"></div>'
      + '<div class="ve-cp-barra"><i id="veCpB1"></i></div><div class="ve-cp-info" id="veCpI1"></div><div class="ve-cp-rot">TOTAL</div><div class="ve-cp-barra total"><i id="veCpB2"></i></div><div class="ve-cp-info" id="veCpI2"></div>'
      + '<div class="ve-linha"><button class="ve-bt perigo" type="button" id="veCpCancelar">CANCELAR</button></div></div>';
    document.body.appendChild(c); if (auto) { c.classList.add("min"); $("veCpMin").textContent = "▢"; aviso("⚡ Fazendo cópia leve dos vídeos pesados — a edição fica mais leve"); }
    $("veCpMin").onclick = function () { c.classList.toggle("min"); this.textContent = c.classList.contains("min") ? "▢" : "—"; };
    $("veCpCancelar").onclick = function () { FILA.cancelado = true; this.disabled = true; this.textContent = "CANCELANDO…"; };
    for (var i = 0; i < lista.length && !FILA.cancelado; i++) {
      var m = lista[i], dm = m.dur || 1; $("veCpN").textContent = (i + 1) + " de " + lista.length; $("veCpNome").textContent = m.nome;
      try {
        var r = await BWProxy.fazer(m.blob, {curto: curto, cancelar: function () { return FILA.cancelado; }, aoProgredir: function (p) {
          var f = (p.pct || 0) / 100, proc = feitoSeg + f * dm, gasto = (performance.now() - t0) / 1000, falta = proc > 0.5 ? gasto * (totSeg - proc) / proc : null;
          $("veCpB1").style.width = (p.pct || 0).toFixed(1) + "%"; $("veCpI1").textContent = Math.floor(p.pct || 0) + "% · " + (p.etapa || "") + (p.falta != null ? " · faltam " + tempoTxt(p.falta) : "") + (p.ow ? " · " + p.ow + "×" + p.oh : "");
          $("veCpB2").style.width = (proc / totSeg * 100).toFixed(1) + "%"; $("veCpI2").textContent = Math.floor(proc / totSeg * 100) + "% · " + feitos + " pronto" + (feitos === 1 ? "" : "s") + " · tempo esperado até concluir: " + tempoTxt(falta); }});
        await guardarProxy(m.id, r); feitos++; recarregarEls(m.id); desenharLib(); medir();
        if (!r.comSom && !r.semFaixa) aviso("⚡ " + m.nome + ": proxy pronto SEM SOM" + (r.motivoSom ? " (" + r.motivoSom + ")" : "") + " — na prévia este take fica mudo; a exportação tem o som do original.", true);
      } catch (e) { if (!FILA.cancelado) falhas.push(m.nome + " (" + (e && e.message || e) + ")"); }
      feitoSeg += dm;
    }
    var cancel = FILA.cancelado; FILA = null; c.remove(); medir();
    if (!cancel && PEND.length) { var prox = PEND.filter(function (k) { return MID[k] && !PX[k]; }); PEND = []; if (prox.length) { setTimeout(function () { filaProxy(prox, curto, true); }, 300); return; } }
    if (auto && !falhas.length && !cancel) { aviso("⚡ " + feitos + " vídeo" + (feitos === 1 ? "" : "s") + " com cópia leve — a edição já usa ela"); return; }
    aviso(cancel ? "Proxy cancelado. " + feitos + " ficou" + (feitos === 1 ? "" : "aram") + " pronto" + (feitos === 1 ? "" : "s") + "." : falhas.length ? "⚡ " + feitos + " proxy pronto(s). Não deu: " + falhas.slice(0, 2).join("; ") : "⚡ " + feitos + " proxy" + (feitos === 1 ? "" : "s") + " pronto" + (feitos === 1 ? "" : "s") + " em " + tempoTxt((performance.now() - t0) / 1000) + ". A edição já usa a versão leve.", !!falhas.length && !cancel);
  }

  /* ---------- LIMPAR CACHE ---------- */
  function contarMascaras() { return new Promise(function (ok) { try { var r = indexedDB.open("bw_mascaras", 1); r.onupgradeneeded = function () { r.result.createObjectStore("m", {keyPath: "mid"}); }; r.onsuccess = function () { var d = r.result, q = d.transaction("m").objectStore("m").getAllKeys(); q.onsuccess = function () { d.close(); ok(q.result || []); }; q.onerror = function () { d.close(); ok([]); }; }; r.onerror = function () { ok([]); }; } catch (e) { ok([]); } }); }
  async function abrirLimpar() {
    var usados = {}; P.clips.forEach(function (c) { if (c.mid) usados[c.mid] = 1; });
    var fora = Object.keys(MID).filter(function (k) { return !usados[k] && !MID[k].ph && MID[k].tipo !== "audio" || (!usados[k] && MID[k].tipo === "audio" && k.indexOf("som-") !== 0 && !MID[k].ph); }), foraB = fora.reduce(function (t, k) { return t + (MID[k].blob ? MID[k].blob.size : 0); }, 0);
    var pxIds = Object.keys(PX), pxB = pxIds.reduce(function (t, k) { return t + (PX[k].bytes || 0); }, 0), mk = await contarMascaras(), abertos = Object.keys(EL).length;
    var j = janela("veJanLimpar", "LIMPAR CACHE", '<p class="ve-nota" style="margin:0 0 8px">Libera espaço e memória deste aparelho. Os arquivos que estão no seu computador ou celular <b>não</b> são apagados — só as cópias que a plataforma guardou.</p>'
      + '<label class="ve-lp"><input type="checkbox" value="mem" checked><span><b>Memória da sessão</b><small>Fecha os ' + abertos + ' vídeo(s) abertos na prévia (reabrem sozinhos)</small></span></label>'
      + '<label class="ve-lp"><input type="checkbox" value="px"' + (pxIds.length ? "" : " disabled") + '><span><b>Proxies · ' + mb(pxB) + '</b><small>' + pxIds.length + ' cópia(s) leves — dá para fazer de novo quando quiser</small></span></label>'
      + '<label class="ve-lp"><input type="checkbox" value="mk"' + (mk.length ? "" : " disabled") + '><span><b>Análises de pessoa (IA)</b><small>' + mk.length + ' análise(s) — o 🧠 ANALISAR refaz</small></span></label>'
      + '<label class="ve-lp perigo"><input type="checkbox" value="fora"' + (fora.length ? "" : " disabled") + '><span><b>Arquivos fora da linha do tempo · ' + mb(foraB) + '</b><small>' + fora.length + ' arquivo(s) que estão só na biblioteca (para usar de novo, importe outra vez)</small></span></label>'
      + '<div class="ve-linha"><button class="ve-bt perigo" type="button" id="veLpIr">🧹 LIMPAR O QUE ESTÁ MARCADO</button><button class="ve-bt" type="button" data-fechar>CANCELAR</button></div>');
    $("veLpIr").onclick = async function () {
      var q = [].map.call(j.querySelectorAll(".ve-lp input:checked"), function (i) { return i.value; }); if (!q.length) { fecharJan(j); return; }
      if (q.indexOf("fora") >= 0 && !confirm("Tirar " + fora.length + " arquivo(s) da biblioteca? Eles não estão na linha do tempo. O arquivo original no seu aparelho continua lá.")) return;
      var antes = 0; try { antes = (await navigator.storage.estimate()).usage || 0; } catch (e) {}
      if (q.indexOf("mem") >= 0) Object.keys(EL).forEach(soltarEl);
      if (q.indexOf("px") >= 0) for (var a = 0; a < pxIds.length; a++) await apagarProxy(pxIds[a]);
      if (q.indexOf("mk") >= 0 && window.BWMascara) for (var b = 0; b < mk.length; b++) await BWMascara.apagar(mk[b]);
      if (q.indexOf("fora") >= 0) for (var c2 = 0; c2 < fora.length; c2++) { var id = fora[c2]; if (PX[id]) await apagarProxy(id); try { URL.revokeObjectURL(MID[id].url); } catch (e) {} delete MID[id]; await tx("midias", "readwrite", function (s) { return s.delete(id); }); }
      fecharJan(j); desenharLib(); desenhar(); var depois = 0; try { depois = (await navigator.storage.estimate()).usage || 0; } catch (e) {}
      aviso("🧹 Cache limpo" + (antes > depois ? " · " + mb(antes - depois) + " liberados" : "") + "."); medir(); };
  }

  /* ---------- ⚙ PASTAS E PROXY ---------- */
  function abrirCfg() {
    function linha(k, tit, txt) { var h = PASTAS[k]; return '<div class="ve-cfgl"><div><b>' + tit + '</b><small>' + txt + '</small><em id="veCfgN-' + k + '">' + (h ? "📁 " + esc(h.name) : (k === "export" ? "Downloads (padrão)" : "Neste navegador (padrão)")) + '</em></div><div class="ve-linha" style="margin:0"><button class="ve-bt" type="button" data-pasta="' + k + '"' + (TEM_PASTA ? "" : " disabled") + '>ESCOLHER PASTA</button>' + (h ? '<button class="ve-bt" type="button" data-reconectar="' + k + '">🔓 PERMITIR</button><button class="ve-bt" type="button" data-padrao="' + k + '">PADRÃO</button>' : "") + '</div></div>'; }
    var j = janela("veJanCfg", "ONDE SALVAR", (TEM_PASTA ? "" : '<p class="ve-nota" style="margin:0 0 8px">Escolher pastas funciona no Chrome e no Edge do computador (e no app BW). Aqui o projeto e o cache ficam neste navegador e os arquivos exportados vão para os Downloads.</p>')
      + linha("projeto", "PROJETO", "Uma cópia da edição (.bwvideo.json) é salva na pasta a cada mudança.")
      + linha("cache", "CACHE (PROXIES)", "Os proxies novos viram arquivos nessa pasta, em vez de ocupar o navegador.")
      + linha("export", "EXPORTAÇÃO", "Vídeos, áudios e sequências exportados são salvos direto nessa pasta.")
      + '<div class="ve-cfgl"><div><b>PROXY</b><small>Qualidade padrão e se a edição usa os proxies.</small></div><div class="ve-linha" style="margin:0"><select class="ve-sel" id="veCfgCurto"><option value="540">540p</option><option value="720">720p</option><option value="1080">1080p</option></select><label class="ve-px" style="margin:0"><input type="checkbox" id="veCfgUsar"' + (PXCFG.usar ? " checked" : "") + '> usar na edição</label></div></div>'
      + '<p class="ve-nota">O navegador pede licença uma vez por pasta. Se depois de reabrir ele perguntar de novo, toque em 🔓 PERMITIR.</p>');
    $("veCfgCurto").value = String(PXCFG.curto);
    $("veCfgCurto").onchange = function () { PXCFG.curto = Number(this.value); gravarPxCfg(); };
    $("veCfgUsar").onchange = function () { var u = $("veUsarPx"); if (u) { u.checked = this.checked; u.dispatchEvent(new Event("change")); } else { PXCFG.usar = this.checked; gravarPxCfg(); } };
    j.addEventListener("click", async function (e) {
      var b = e.target.closest("[data-pasta]"), rc = e.target.closest("[data-reconectar]"), pd = e.target.closest("[data-padrao]");
      if (b) { try { var h = await window.showDirectoryPicker({id: "bw-ve-" + b.dataset.pasta, mode: "readwrite"}); PASTAS[b.dataset.pasta] = h; await gravarPastas(); abrirCfg(); aviso("📁 " + h.name + " escolhida para " + (b.dataset.pasta === "export" ? "a exportação" : b.dataset.pasta === "cache" ? "o cache" : "o projeto") + "."); if (b.dataset.pasta === "projeto") copiaProjeto(); } catch (x) {} }
      if (rc) { var ok = await permissao(PASTAS[rc.dataset.reconectar], true); aviso(ok ? "🔓 Pasta liberada." : "O navegador não liberou a pasta.", !ok); if (ok && rc.dataset.reconectar === "cache") { await carregarProxies(); desenharLib(); } }
      if (pd) { PASTAS[pd.dataset.padrao] = null; await gravarPastas(); abrirCfg(); }
    });
  }

  /* ---------- JANELA DE EXPORTAR ----------
     Bitrates de referência: YouTube (página "recommended upload encoding settings", conferida em 22/11/2026): 4K 35–45 Mbps (24–30 fps) e
     53–68 Mbps (48–60 fps), 1080p 8 Mbps / 12 Mbps, áudio AAC-LC 48 kHz estéreo 384 kbps, MP4, taxa variável. Instagram (guias de 2026):
     1080×1920, H.264 + AAC 48 kHz, 30 fps constante, 3,5–10 Mbps — o app recomprime, então mandar perto do teto. Aqui vão sempre um pouco
     acima do mínimo para a recompressão da plataforma ter detalhe para guardar. */
  var CODECS = [
    {id: "h264", nome: "H.264 · MP4 (o mais compatível)", ext: "mp4", mimes: ["video/mp4;codecs=avc1.640033,mp4a.40.2", "video/mp4;codecs=avc1.640028,mp4a.40.2", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4;codecs=avc1,opus", "video/mp4"]},
    {id: "hevc", nome: "H.265 / HEVC · MP4 (mesma qualidade, ~metade do tamanho)", ext: "mp4", mimes: ["video/mp4;codecs=hvc1.1.6.L153.B0,mp4a.40.2", "video/mp4;codecs=hvc1,mp4a.40.2", "video/mp4;codecs=hev1.1.6.L153.B0,mp4a.40.2", "video/mp4;codecs=hev1,mp4a.40.2"]},
    {id: "av1", nome: "AV1 (o mais moderno, arquivo pequeno)", ext: "", mimes: ["video/mp4;codecs=av01.0.12M.08,mp4a.40.2", "video/mp4;codecs=av01,opus", "video/webm;codecs=av01,opus", "video/webm;codecs=av1,opus"]},
    {id: "vp9", nome: "VP9 · WebM (web e YouTube)", ext: "webm", mimes: ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp9"]},
    {id: "vp8", nome: "VP8 · WebM (antigo, roda em tudo na web)", ext: "webm", mimes: ["video/webm;codecs=vp8,opus", "video/webm"]}];
  function mimeDe(id) { var c = CODECS.filter(function (x) { return x.id === id; })[0]; if (!c || !window.MediaRecorder) return ""; for (var i = 0; i < c.mimes.length; i++) if (MediaRecorder.isTypeSupported(c.mimes[i])) return c.mimes[i]; return ""; }
  function extDe(mime) { return /mp4/.test(mime) ? "mp4" : "webm"; }
  var PRONTOS = [
    {id: "master", nome: "★ MÁXIMA QUALIDADE", sub: "Master para guardar ou reeditar · tamanho real", curto: 0, fps: 30, mbps: function (w, h, f) { return Math.round(Math.min(160, Math.max(30, w * h * f * 0.4 / 1e6))); }, abps: 320000, cod: ["hevc", "h264", "av1", "vp9"]},
    {id: "yt4k", nome: "YOUTUBE 4K", sub: "2160p · 30 fps · 45 Mbps · AAC 384 kbps", curto: 2160, fps: 30, mbps: 45, abps: 384000, cod: ["h264", "vp9"]},
    {id: "yt4k60", nome: "YOUTUBE 4K 60", sub: "2160p · 60 fps · 68 Mbps · AAC 384 kbps", curto: 2160, fps: 60, mbps: 68, abps: 384000, cod: ["h264", "vp9"]},
    {id: "ytfhd", nome: "YOUTUBE FULL HD", sub: "1080p · 30 fps · 12 Mbps · AAC 384 kbps", curto: 1080, fps: 30, mbps: 12, abps: 384000, cod: ["h264", "vp9"]},
    {id: "ytfhd60", nome: "YOUTUBE FULL HD 60", sub: "1080p · 60 fps · 18 Mbps · AAC 384 kbps", curto: 1080, fps: 60, mbps: 18, abps: 384000, cod: ["h264", "vp9"]},
    {id: "insta", nome: "INSTAGRAM REELS / STORIES", sub: "1080×1920 · 30 fps · 10 Mbps · AAC 48 kHz", curto: 1080, fps: 30, mbps: 10, abps: 256000, cod: ["h264"], aspecto: 9 / 16},
    {id: "instafeed", nome: "INSTAGRAM FEED 4:5", sub: "1080×1350 · 30 fps · 10 Mbps", curto: 1080, fps: 30, mbps: 10, abps: 256000, cod: ["h264"], aspecto: 4 / 5},
    {id: "whats", nome: "WHATSAPP / LEVE", sub: "720p · 30 fps · 4 Mbps · AAC 128 kbps", curto: 720, fps: 30, mbps: 4, abps: 128000, cod: ["h264"]},
    {id: "telao", nome: "TELÃO DE LED", sub: "Tamanho do projeto · 30 fps · alta", curto: 0, fps: 30, mbps: function (w, h) { return Math.round(Math.min(80, Math.max(16, w * h / 1e6 * 14))); }, abps: 320000, cod: ["h264", "hevc"]}];
  function tamSaida(curto) { var f = tamReal(), p2 = function (v) { v = Math.round(v); return v - v % 2; }; if (!curto) return [p2(f[0]), p2(f[1])]; var k = curto / Math.min(f[0], f[1]), w = p2(f[0] * k), h = p2(f[1] * k); if (Math.max(w, h) > 4096) { var r = 4096 / Math.max(w, h); w = p2(w * r); h = p2(h * r); } return [w, h]; }
  var EXP = {aba: "prontos", pronto: "ytfhd", codec: "h264", curto: 0, fps: 30, mbps: 20, abps: 320000, audio: "wav", bits: 24, seq: "png", seqFps: 30, jpgQ: 95, de: 0, ate: 0};
  try { Object.assign(EXP, JSON.parse(localStorage.getItem("ui_ve_exportar") || "{}")); } catch (e) {}
  function opDe() {
    var dur = total();
    if (EXP.aba === "audio") { var am = EXP.audio === "m4a" ? (MediaRecorder.isTypeSupported("audio/mp4;codecs=mp4a.40.2") ? "audio/mp4;codecs=mp4a.40.2" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "") : EXP.audio === "opus" ? (MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "") : "";
      var kbA = EXP.audio === "wav" ? 48 * 2 * EXP.bits : EXP.audio === "m4a" ? 320 : 192; return {audio: EXP.audio, mime: am, abps: EXP.audio === "m4a" ? 320000 : 192000, bits: EXP.bits, ext: EXP.audio === "wav" ? "wav" : EXP.audio === "m4a" ? "m4a" : "webm", bytes: dur * kbA * 1000 / 8, desc: EXP.audio === "wav" ? "WAV · 48 kHz · " + EXP.bits + " bits · sem perda" : EXP.audio === "m4a" ? "M4A · AAC 320 kbps" : "WebM · Opus 192 kbps", ok: EXP.audio === "wav" || !!am}; }
    if (EXP.aba === "seq") { var sa = tamSaida(EXP.curto), nq = Math.ceil(Math.max(0, (EXP.ate || dur) - (EXP.de || 0)) * EXP.seqFps); return {seq: EXP.seq, saida: sa, fps: EXP.seqFps, q: EXP.jpgQ / 100, n: nq, bytes: nq * sa[0] * sa[1] * (EXP.seq === "png" ? 1.6 : 0.25), desc: (EXP.seq === "png" ? "PNG (sem perda)" : "JPEG " + EXP.jpgQ + "%") + " · " + sa[0] + "×" + sa[1] + " · " + EXP.seqFps + " quadros/s · " + nq + " imagens", ok: true}; }
    var pr = EXP.aba === "prontos" ? PRONTOS.filter(function (x) { return x.id === EXP.pronto; })[0] : null, curto = pr ? pr.curto : EXP.curto, fps = pr ? pr.fps : EXP.fps, sa2 = tamSaida(curto);
    var mime = "", cod = ""; (pr ? pr.cod : [EXP.codec]).some(function (k) { var mm = mimeDe(k); if (mm) { mime = mm; cod = k; } return !!mm; });
    var mbps = pr ? (typeof pr.mbps === "function" ? pr.mbps(sa2[0], sa2[1], fps) : pr.mbps) : EXP.mbps, abps = pr ? pr.abps : EXP.abps;
    var cn = CODECS.filter(function (x) { return x.id === cod; })[0];
    return {mime: mime, ext: mime ? extDe(mime) : "mp4", vbps: mbps * 1e6, abps: abps, fps: fps, saida: sa2, bytes: dur * (mbps * 1e6 + abps) / 8, nome: (P.nome || "video-brightway") + (pr ? "-" + pr.id : "-" + cod + "-" + sa2[1] + "p"), aspecto: pr && pr.aspecto,
      desc: sa2[0] + "×" + sa2[1] + " · " + fps + " fps · " + (cn ? cn.nome.split(" (")[0] : "—") + " · " + mbps + " Mbps · áudio " + Math.round(abps / 1000) + " kbps", ok: !!mime};
  }
  function abrirExportar() {
    if (!P.clips.length) { aviso("A linha do tempo está vazia.", true); return; }
    var disp = CODECS.map(function (c) { return {c: c, m: mimeDe(c.id)}; });
    var j = janela("veJanExp", "EXPORTAR", '<div class="ve-exp-abas" role="tablist">' + [["prontos", "PRONTOS"], ["perso", "PERSONALIZADO"], ["audio", "SÓ O ÁUDIO"], ["seq", "SEQUÊNCIA DE IMAGENS"], ["pro", "PROFISSIONAL"]].map(function (a) { return '<button type="button" class="ve-bt" role="tab" data-exaba="' + a[0] + '">' + a[1] + "</button>"; }).join("") + "</div>"
      + '<div class="ve-exp-pn" data-pn="prontos"><div class="ve-exp-cards">' + PRONTOS.map(function (p) { return '<button type="button" class="ve-exp-card" data-pronto="' + p.id + '"><b>' + p.nome + "</b><small>" + p.sub + "</small></button>"; }).join("") + "</div></div>"
      + '<div class="ve-exp-pn" data-pn="perso"><div class="ve-exp-grade"><label>Codec <select class="ve-sel" id="veExCod">' + disp.map(function (d) { return '<option value="' + d.c.id + '"' + (d.m ? "" : " disabled") + ">" + d.c.nome + (d.m ? "" : " — não grava neste navegador") + "</option>"; }).join("") + '</select></label>'
      + '<label>Resolução <select class="ve-sel" id="veExRes"><option value="0">Tamanho do projeto</option><option value="2160">4K (2160p)</option><option value="1440">2K (1440p)</option><option value="1080">Full HD (1080p)</option><option value="720">HD (720p)</option></select></label>'
      + '<label>Quadros por segundo <select class="ve-sel" id="veExFps"><option>24</option><option>25</option><option>30</option><option>50</option><option>60</option></select></label>'
      + '<label>Taxa de vídeo (Mbps) <input class="ve-sel" id="veExMbps" type="number" min="1" max="200" step="1"></label>'
      + '<label>Áudio <select class="ve-sel" id="veExAbps"><option value="128000">128 kbps</option><option value="192000">192 kbps</option><option value="256000">256 kbps</option><option value="320000">320 kbps</option><option value="384000">384 kbps (YouTube)</option></select></label></div><p class="ve-nota" id="veExSug"></p></div>'
      + '<div class="ve-exp-pn" data-pn="audio"><div class="ve-exp-cards">' + [["wav", "WAV SEM PERDA", "48 kHz · 24 bits · para mixar e masterizar"], ["m4a", "M4A · AAC 320", "Leve e compatível · celular, WhatsApp, podcast"], ["opus", "OPUS · WebM", "O menor arquivo com boa qualidade · web"]].map(function (a) { return '<button type="button" class="ve-exp-card" data-audio="' + a[0] + '"><b>' + a[1] + "</b><small>" + a[2] + "</small></button>"; }).join("") + '</div><label class="ve-px"><input type="checkbox" id="veEx16"> WAV em 16 bits (CD) em vez de 24</label></div>'
      + '<div class="ve-exp-pn" data-pn="seq"><div class="ve-exp-cards">' + [["png", "PNG", "Sem perda · para compor, telão e After Effects"], ["jpg", "JPEG", "Arquivos menores · revisão e miniaturas"]].map(function (a) { return '<button type="button" class="ve-exp-card" data-seq="' + a[0] + '"><b>' + a[1] + "</b><small>" + a[2] + "</small></button>"; }).join("") + '</div>'
      + '<div class="ve-exp-grade"><label>Resolução <select class="ve-sel" id="veExSRes"><option value="0">Tamanho do projeto</option><option value="2160">4K (2160p)</option><option value="1080">1080p</option><option value="720">720p</option></select></label><label>Quadros por segundo <select class="ve-sel" id="veExSFps"><option>12</option><option>24</option><option>25</option><option>30</option><option>60</option></select></label>'
      + '<label>De (s) <input class="ve-sel" id="veExDe" type="number" min="0" step="0.1"></label><label>Até (s) <input class="ve-sel" id="veExAte" type="number" min="0" step="0.1"></label><label>Qualidade do JPEG <input class="ve-sel" id="veExQ" type="number" min="50" max="100" step="1"></label></div>'
      + '<p class="ve-nota">' + (TEM_PASTA ? "Com uma PASTA DE EXPORTAÇÃO escolhida (⚙), cada quadro vai direto para ela — o melhor para sequências longas. Sem pasta, sai um .zip." : "As imagens saem num .zip. Sequência longa em PNG pesa muito: prefira JPEG ou um trecho.") + "</p></div>"
      + '<div class="ve-exp-pn" data-pn="pro"><div class="ve-exp-cards">' + [["ProRes 422 HQ", "Master de edição (Premiere, Final Cut, DaVinci)"], ["ProRes 4444", "Com transparência · motion e chroma"], ["DNxHR HQX", "Master 10 bits para Windows"], ["H.265 10 bits", "HDR e cor com mais tons"]].map(function (a) { return '<button type="button" class="ve-exp-card off" disabled aria-disabled="true"><b>' + a[0] + "</b><small>" + a[1] + " · disponível em breve no app BW</small></button>"; }).join("") + '</div><p class="ve-nota">Esses formatos de estúdio precisam do programa do computador (o navegador não grava neles). Vão chegar pelo app BW, que já tem o FFmpeg.</p></div>'
      + '<div class="ve-exp-res" id="veExRes2"></div><div class="ve-linha"><button class="ve-bt pri" type="button" id="veExIr">⬇ EXPORTAR</button><button class="ve-bt ic" type="button" id="veExPasta" title="Onde salvar" aria-label="Onde salvar">⚙</button><button class="ve-bt" type="button" data-fechar>CANCELAR</button></div>');
    var g = function (id) { return $(id); };
    g("veExCod").value = EXP.codec; g("veExRes").value = String(EXP.curto); g("veExFps").value = String(EXP.fps); g("veExMbps").value = EXP.mbps; g("veExAbps").value = String(EXP.abps);
    g("veEx16").checked = EXP.bits === 16; g("veExSRes").value = String(EXP.curto); g("veExSFps").value = String(EXP.seqFps); g("veExDe").value = EXP.de || 0; g("veExAte").value = EXP.ate || Math.round(total() * 10) / 10; g("veExQ").value = EXP.jpgQ;
    function att() {
      try { localStorage.setItem("ui_ve_exportar", JSON.stringify(EXP)); } catch (e) {}
      j.querySelectorAll("[data-exaba]").forEach(function (b) { b.classList.toggle("on", b.dataset.exaba === EXP.aba); b.setAttribute("aria-selected", b.dataset.exaba === EXP.aba); });
      j.querySelectorAll("[data-pn]").forEach(function (p) { p.hidden = p.dataset.pn !== EXP.aba; });
      j.querySelectorAll("[data-pronto]").forEach(function (b) { b.classList.toggle("on", b.dataset.pronto === EXP.pronto); });
      j.querySelectorAll("[data-audio]").forEach(function (b) { b.classList.toggle("on", b.dataset.audio === EXP.audio); });
      j.querySelectorAll("[data-seq]").forEach(function (b) { b.classList.toggle("on", b.dataset.seq === EXP.seq); });
      var sa = tamSaida(EXP.curto); g("veExSug").textContent = "Sugestão para " + sa[0] + "×" + sa[1] + " a " + EXP.fps + " fps: " + Math.round(Math.max(8, sa[0] * sa[1] * EXP.fps * 0.15 / 1e6)) + "–" + Math.round(Math.max(12, sa[0] * sa[1] * EXP.fps * 0.3 / 1e6)) + " Mbps (mais = mais nítido e maior).";
      var o = opDe(), f = tamReal(), av = "";
      if (o.aspecto && Math.abs(f[0] / f[1] - o.aspecto) > 0.02) av = '<br><span class="dn">⚠ O projeto não está em ' + (o.aspecto < 0.6 ? "9:16" : "4:5") + ' — o vídeo sai no formato do projeto. Troque o formato lá no alto se quiser o tamanho exato.</span>';
      if (EXP.aba === "pro") { g("veExRes2").innerHTML = '<span class="md">Escolha outra aba para exportar agora.</span>'; g("veExIr").disabled = true; return; }
      g("veExRes2").innerHTML = (o.ok ? "<b>Sai:</b> " + o.desc : '<span class="dn">⚠ Este navegador não grava nesse formato — escolha outro.</span>') + "<br><b>Tamanho:</b> ≈ " + mb(o.bytes) + " · <b>leva:</b> " + (o.seq ? "≈ " + tempoTxt(o.n * 0.12) : fmtT(total()) + " (o tempo do vídeo — deixe a tela aberta)") + "<br><b>Vai para:</b> " + (PASTAS.export ? "📁 " + esc(PASTAS.export.name) : "Downloads") + av;
      g("veExIr").disabled = !o.ok;
    }
    j.addEventListener("click", function (e) { var a = e.target.closest("[data-exaba]"), p = e.target.closest("[data-pronto]"), au = e.target.closest("[data-audio]"), sq = e.target.closest("[data-seq]");
      if (a) EXP.aba = a.dataset.exaba; if (p) EXP.pronto = p.dataset.pronto; if (au) EXP.audio = au.dataset.audio; if (sq) EXP.seq = sq.dataset.seq; if (a || p || au || sq) att(); });
    j.addEventListener("change", function () { EXP.codec = g("veExCod").value; EXP.curto = Number(EXP.aba === "seq" ? g("veExSRes").value : g("veExRes").value) || 0; EXP.fps = Number(g("veExFps").value) || 30; EXP.mbps = lim(Number(g("veExMbps").value) || 20, 1, 200); EXP.abps = Number(g("veExAbps").value) || 320000;
      EXP.bits = g("veEx16").checked ? 16 : 24; EXP.seqFps = Number(g("veExSFps").value) || 30; EXP.de = Math.max(0, Number(g("veExDe").value) || 0); EXP.ate = Math.max(0, Number(g("veExAte").value) || 0); EXP.jpgQ = lim(Number(g("veExQ").value) || 95, 50, 100); att(); });
    g("veExPasta").onclick = abrirCfg;
    g("veExIr").onclick = function () { var o = opDe(); if (!o.ok) return; fecharJan(j); if (o.seq) exportarSequencia(o); else exportar(o); };
    att();
  }

  /* ---------- SEQUÊNCIA DE IMAGENS: quadro a quadro, cada vídeo posto no ponto exato antes da foto ---------- */
  function esperarQuadro() { return new Promise(function (ok) { var t0 = performance.now(); (function v() { var falta = Object.keys(EL).some(function (k) { var e = EL[k].e; return e.tagName === "VIDEO" && (e.seeking || e.readyState < 2) && e.getAttribute("src"); }); if (!falta || performance.now() - t0 > 6000) ok(); else setTimeout(v, 15); })(); }); }
  async function exportarSequencia(o) {
    parar(); var cancel = false, ini = Math.max(0, EXP.de || 0), fim = Math.min(total(), EXP.ate || total()); if (fim <= ini) fim = total();
    var n = Math.max(1, Math.ceil((fim - ini) * o.fps)), base = (P.nome || "video-brightway").replace(/[^\w\-]+/g, "-"), ext = o.seq === "png" ? "png" : "jpg", tipo = o.seq === "png" ? "image/png" : "image/jpeg";
    var pasta = PASTAS.export && (await permissao(PASTAS.export, true)) ? PASTAS.export : null, sub = null, zip = null;
    if (pasta) { try { sub = await pasta.getDirectoryHandle(base + "-" + ext + "-" + Date.now().toString(36), {create: true}); } catch (e) { sub = null; } }
    if (!sub) { if (!window.JSZip) await new Promise(function (ok) { var sc = document.createElement("script"); sc.src = "assets/jszip.min.js"; sc.onload = sc.onerror = ok; document.head.appendChild(sc); });   /* compactador só quando precisa (cópia local, sem internet) */
      if (!window.JSZip) { aviso("Não carreguei o compactador (.zip). Escolha uma PASTA DE EXPORTAÇÃO no ⚙.", true); return; } zip = new JSZip(); }
    usarOriginais(true); tamanhoReal(true, o.saida);
    var t0 = performance.now(); $("veOcup").hidden = false; GRAV = {prog: function () {}, fim: function () {}, cancelar: function () { cancel = true; }};
    try {
      for (var i = 0; i < n && !cancel; i++) {
        T = ini + i / o.fps; desenhar(); await esperarQuadro(); desenhar();
        var b = await new Promise(function (ok) { cv.toBlob(ok, tipo, o.q); }); if (!b) throw new Error("o navegador não gerou a imagem");
        var nome = base + "_" + String(i + 1).padStart(5, "0") + "." + ext;
        if (sub) { var fh = await sub.getFileHandle(nome, {create: true}), w = await fh.createWritable(); await w.write(b); await w.close(); } else zip.file(nome, b);
        var p = (i + 1) / n, gasto = (performance.now() - t0) / 1000; $("veProg").value = p; $("veOcupTxt").textContent = "Gerando as imagens · " + (i + 1) + " de " + n + " · faltam " + tempoTxt(gasto * (1 - p) / p);
      }
      if (!cancel && zip) { $("veOcupTxt").textContent = "Compactando o .zip…"; var zb = await zip.generateAsync({type: "blob", compression: "STORE"}), un = base + "-" + ext + ".zip", ok2 = await salvarNaPasta("export", un, zb);
        var a = document.createElement("a"), u = URL.createObjectURL(zb); if (!ok2) { a.href = u; a.download = un; document.body.appendChild(a); a.click(); a.remove(); } setTimeout(function () { URL.revokeObjectURL(u); }, 60000); window.__veSaida = {blob: zb, tipo: "application/zip", bytes: zb.size, nome: un, quadros: n}; }
      if (!cancel && sub) window.__veSaida = {pasta: sub.name, quadros: n, tipo: tipo, nome: sub.name};
      aviso(cancel ? "Sequência cancelada." : "🖼 " + n + " imagens prontas" + (sub ? " na pasta " + pasta.name + "/" + sub.name : " no .zip") + ".");
    } catch (e) { aviso("A sequência parou: " + (e && e.message || e), true); }
    finally { GRAV = null; tamanhoReal(false); usarOriginais(false); $("veOcup").hidden = true; }
  }
  /* ---------- começo: volta o que estava aberto ---------- */
  (async function () {
    /* 22/11 (iPhone mostrava o layout antigo, "travado"): reabrir as mídias/pastas/proxies guardadas pode demorar ou falhar no Safari —
       nada disso pode impedir o editor de ficar PRONTO. Erro aqui só avisa; o editor abre do mesmo jeito. */
    try {
    var ms = (await tx("midias", "readonly", function (s) { return s.getAll(); })) || [];
    for (var i = 0; i < ms.length; i++) { try { var mm = await porMidia(ms[i].blob, ms[i].nome, ms[i].tipo, ms[i].id, ms[i].dur, ms[i].capa); if (ms[i].cr) { mm.cr = ms[i].cr; mm.crCriado = ms[i].crCriado; mm.criacao = true; } } catch (e) {} }
    await carregarPastas(); try { await pfCarregar(); } catch (e) {} await carregarProxies(); setTimeout(function () { try { proxyAuto(); } catch (e) {} }, 4000);
    var st = await tx("estado", "readonly", function (s) { return s.get("atual"); });
    if (st && st.p && Array.isArray(st.p.clips)) { P = st.p; for (var k = 0; k < P.clips.length; k++) { var c = P.clips[k]; if (c.mid && !MID[c.mid] && c.mid.indexOf("som-") === 0) { var ix = SONS.map(function (s) { return "som-" + s[1].toLowerCase().replace(/\s+/g, "-"); }).indexOf(c.mid); if (ix >= 0) await porSom(ix); } }
      if (window.VEModelos && VEModelos.garantir) { try { await VEModelos.garantir(P); } catch (e) {} }   /* espaços e música de modelo são refeitos (não ficam guardados) */
      P.clips = P.clips.filter(function (c) { return c.tipo === "texto" || MID[c.mid]; }); }
    } catch (e0) { console.warn("começo do editor", e0); try { aviso("Parte do projeto guardado não abriu (" + (e0 && e0.message || e0) + ") — o editor segue.", true); } catch (x) {} }
    formato(); desenharFerramentas(); desenharLib(); montarCache(); desenharTL(); desenharProp(); desenhar(); window.__veProntoOk = true;
    if (window.BWMascara) BWMascara.carregar(Object.keys(MID)).then(function () { desenharProp(); desenhar(); });
    await chegouCriacao();
  })();
  /* 22/11: cada AÇÃO de botão/tecla (aparar, dividir, duplicar, apagar, colar, pôr take/texto) é um passo próprio do desfazer — antes, duas ações
     feitas em menos de 0,3 s viravam um passo só e o ↶ desfazia as duas (o histórico que espera é para arrastes, não para cliques) */
  [["aparar", function (f) { aparar = f; }, function () { return aparar; }], ["dividir", function (f) { dividir = f; }, function () { return dividir; }],
   ["duplicar", function (f) { duplicar = f; }, function () { return duplicar; }], ["apagar", function (f) { apagar = f; }, function () { return apagar; }],
   ["colar", function (f) { colar = f; }, function () { return colar; }], ["colarAtrib", function (f) { colarAtrib = f; }, function () { return colarAtrib; }],
   ["addClip", function (f) { addClip = f; }, function () { return addClip; }], ["addTexto", function (f) { addTexto = f; }, function () { return addTexto; }]].forEach(function (q) {
    var orig = q[2](); q[1](function () { gravarHist(); var r = orig.apply(this, arguments); gravarHist(); return r; }); });
  window.__video = {PX: PX, PASTAS: PASTAS, opDe: function () { return opDe(); }, EXP: EXP, abrirExportar: function () { abrirExportar(); }, exportar: function (o) { exportar(o); }, filaProxy: function (a, b) { return filaProxy(a, b); }, medir: function () { return medir(); }, urlDe: function (m) { return urlDe(m); }, tamReal: function () { return tamReal(); }, tamanhoReal: tamanhoReal, porMidia: porMidia, EL: EL, abrirVideo: abrirVideo, codecDe: codecDe, tudo: function () { tudo(); }, desenharLib: desenharLib, guardarJa: function () { return tx("estado", "readwrite", function (s) { return s.put({id: "atual", p: JSON.parse(JSON.stringify(P))}); }); },
    trocarProjeto: function (np) { parar(); Object.keys(EL).forEach(soltarEl); P = np; SEL = null; T = 0; formato(); desenharLib(); tudo(); },
    backup: function () { return tx("estado", "readwrite", function (s) { return s.put({id: "anterior", p: JSON.parse(JSON.stringify(P))}); }); },
    anterior: function () { return new Promise(function (ok) { db().then(function (d) { var q = d.transaction("estado").objectStore("estado").get("anterior"); q.onsuccess = function () { ok(q.result && q.result.p); }; q.onerror = function () { ok(null); }; }); }); },
    preencherSozinho: preencherSozinho, trocarEspaco: trocarEspaco, analisarPessoa: function (id) { var c = P.clips.filter(function (x) { return x.id === id; })[0]; return c ? analisarPessoa(c) : null; }, selAtual: function () { return sel(); }, addElemento: addElemento, ELEMENTOS: ELEMENTOS, menuElementos: function (x, y) { menuElementos(x, y); }, rastrear: function (id, ini) { var c = P.clips.filter(function (x) { return x.id === id; })[0]; return c ? rastrear(c, ini) : null; }, rastroEm: function (id, t) { var c = P.clips.filter(function (x) { return x.id === id; })[0]; return c ? rastroEm(c, t == null ? T : t) : null; }, takeAlvo: function () { var c = takeAlvo(); if (c && SEL !== c.id) { SEL = c.id; desenharTL(); desenharProp(); } return c; }, aviso: aviso, cv: function () { return cv; },
    P: function () { return P; }, MID: MID, trazerCriacao: trazerCriacao, editarNaOrigem: editarNaOrigem, importar: importar, addClip: function () { return addClip.apply(this, arguments); }, addTexto: function () { return addTexto.apply(this, arguments); }, porSom: porSom, irPara: irPara, tocar: tocar, parar: parar, total: total, sel: function (id) { SEL = id; tudo(); }, exportar: exportar, tipoGravacao: tipoGravacao, T: function () { return T; }, tocando: function () { return TOCANDO; }, desenhar: desenhar, dividir: function () { return dividir.apply(this, arguments); }, sintetizar: sintetizar, congelar: congelar, mudarVel: mudarVel, desfazer: desfazer, refazer: refazer, pps: function () { return PPS; }, TRANS: TRANS, EFEITOS: EFEITOS};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
