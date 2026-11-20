/* assets/bw3d.js — ESTÚDIO 3D da Brightway (v1, 20/11/2026).
   4 modos num só lugar: MODELO 3D · LOGO 3D · MAQUETE DE PALCO E LED · IA 3D (foto → objeto).
   Motor próprio (assets/bw3d-motor.js), tudo no aparelho: modelo, logo e foto NUNCA saem daqui
   (sem fetch/upload/BWSync — o vigia confere). O vídeo é feito no próprio aparelho (BWReelsCelular).
   Cada quadro depende só de (projeto, t) → a prévia e o vídeo saem iguais. */
(function () {
  "use strict";
  var B = window.BW3D, $ = function (id) { return document.getElementById(id); };
  var FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350], "4k-v": [2160, 3840], "4k-h": [3840, 2160] };
  var MATS = { fosco: { metal: 0.05, brilho: 0.2 }, plastico: { metal: 0.2, brilho: 0.45 }, metal: { metal: 0.6, brilho: 0.6 }, cromado: { metal: 0.9, brilho: 0.85 } };
  var ACAB = { dourado: ["Dourado", "#C9A227"], prata: ["Prata", "#C8CDD6"], cromado: ["Cromado", "#E6EDF7"], cobre: ["Cobre", "#B76E3A"], cor: ["Cor sólida", "#B6FF3B"], imagem: ["A própria arte", "#FFFFFF"] };
  var PITCHES = [[2.604, "P2.6"], [2.976, "P3.0"], [3.906, "P3.9"], [4.81, "P4.8"], [5.952, "P6.0"], [10, "P10"]];
  var LUZES = { estudio: [-0.6, 0.7, -0.42], frontal: [0, 0.25, -1], lateral: [-1, 0.35, -0.2], palco: [0.3, 0.9, -0.6] };
  var P = null, ARQ = {}, MALHA3D = null, CV = null, CX = null, DPR = 1, TOCA = false, T0 = 0, TEMPO = 0, FIXA = null, DB = null, EXP = { parar: false, url: "", arquivo: null }, DICA = null;

  function uid(p) { return (p || "o") + Math.random().toString(36).slice(2, 8); }
  function num(v, d) { v = parseFloat(String(v).replace(",", ".")); return isFinite(v) ? v : d; }
  function nm(v) { return (Math.round(v * 100) / 100).toLocaleString("pt-BR") + " m"; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function aviso(t, erro) {
    var a = $("d3Aviso"); a.textContent = t; a.hidden = false; a.setAttribute("data-erro", erro ? "1" : "0");
    clearTimeout(aviso._t); aviso._t = setTimeout(function () { a.hidden = true; }, erro ? 7000 : 3600);
  }

  /* ---------- guardar no aparelho (IndexedDB bw_3d) ---------- */
  function db() {
    if (DB) return DB;
    DB = new Promise(function (ok, erro) {
      if (!window.indexedDB) return erro(new Error("sem IndexedDB"));
      var r = indexedDB.open("bw_3d", 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("arquivos")) d.createObjectStore("arquivos", { keyPath: "id" }); if (!d.objectStoreNames.contains("projetos")) d.createObjectStore("projetos", { keyPath: "id" }); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); };
    });
    return DB;
  }
  function por(loja, metodo, arg) {
    return db().then(function (d) {
      return new Promise(function (ok, erro) {
        var tx = d.transaction(loja, metodo === "get" || metodo === "getAll" ? "readonly" : "readwrite"), q = tx.objectStore(loja)[metodo](arg);
        q.onsuccess = function () { ok(q.result); }; q.onerror = function () { erro(q.error); };
      });
    }).catch(function () { return null; });
  }
  function guardar() { if (!P) return; try { localStorage.setItem("ui_3d_atual", JSON.stringify(P)); } catch (e) {} por("projetos", "put", JSON.parse(JSON.stringify(P))); }
  var guardarTarde = (function () { var t = 0; return function () { clearTimeout(t); t = setTimeout(guardar, 400); }; })();

  /* ---------- projeto ---------- */
  function novo(modo) {
    return { v: 1, id: uid("p3"), nome: "Meu 3D", modo: modo || "plano", atualizado: Date.now(),
      fundo: { tipo: "estudio", cor: "#0B0E14" }, chao: { mostrar: true, tam: 10, passo: 1 },
      luz: { preset: "estudio", amb: 0.26 }, cam: { yaw: 0.6, pitch: 0.34, dist: 6, alvo: [0, 0.8, 0], fov: 0.62, auto: true },
      giro: { liga: true, seg: 8 },
      modelo: { arqId: "", nome: "", pronto: "cubo", cor: "#9AA8C7", material: "plastico", alturaM: 1.6, rotY: 0, arestas: 0 },
      logo: { imgId: "", nome: "", espessura: 0.1, bisel: 1, acabamento: "dourado", cor: "#C9A227", larguraM: 1.8, altura: 1.1 },
      palco: { larg: 8, prof: 4, alt: 0.8, mostrarPalco: true, cols: 10, rows: 5, modulo: 0.5, moduloA: 0.5, pitch: 3.906, ledChao: 0.8,
        trelica: true, torres: true, pessoas: 4, cameras: 1, medidas: true, conteudoId: "" },
      ia: { pedido: "", estilo: "produto", ia: "tripo" },
      foto: { frenteId: "", ladoId: "", costasId: "", alturaM: 1.75, res: 128, espessura: 1, suave: 3, nome: "Avatar" },
      plano: { vram: null, projeto: "" },
      exportar: { formato: "9:16", w: 1080, h: 1920, dur: 8, qual: 1280 } };
  }
  function limpar(o) {   /* garante campos novos em projeto antigo */
    var base = novo(o && o.modo);
    Object.keys(base).forEach(function (k) {
      if (o[k] == null) o[k] = base[k];
      else if (typeof base[k] === "object" && !Array.isArray(base[k])) Object.keys(base[k]).forEach(function (j) { if (o[k][j] == null) o[k][j] = base[k][j]; });
    });
    return o;
  }

  /* ---------- a cena (igual na prévia e no vídeo) ---------- */
  function pxModulo(pitch, metros) { return Math.max(1, Math.round(metros * 1000 / pitch)); }
  function fichaLED() {
    var p = P.palco, pw = pxModulo(p.pitch, p.modulo), ph = pxModulo(p.pitch, p.moduloA);
    return { paineis: p.cols * p.rows, L: p.cols * p.modulo, A: p.rows * p.moduloA, m2: p.cols * p.modulo * p.rows * p.moduloA,
      px: [p.cols * pw, p.rows * ph], pxModulo: [pw, ph] };
  }
  function montar(t, w, h) {
    var objs = [], med = [], mat = MATS[P.modelo.material] || MATS.plastico, modo = P.modo;
    if (modo === "plano") {
      objs.push(B.caixa({ tam: [1.1, 1.1, 1.1], cor: "#7C5CFF", mat: MATS.plastico, rot: [0, 0.5, 0], nome: "Estúdio 3D" }));
    } else if (modo === "foto") {
      if (MALHA3D) objs.push(MALHA3D);
      else objs.push(B.caixa({ tam: [0.6, 1.7, 0.35], cor: "#2a3346", mat: MATS.fosco, nome: "Mande os seus planos em PNG" }));
    } else if (modo === "modelo" || modo === "ia") {
      var a = ARQ[P.modelo.arqId];
      if (a && a.verts) objs.push(B.malha(a.verts, a.faces, { cor: P.modelo.cor, mat: mat, rot: [0, P.modelo.rotY, 0], arestas: P.modelo.arestas, nome: a.nome || "Modelo" }));
      else if (P.modelo.pronto === "cilindro") objs.push(B.cilindro({ diam: 1.1, altura: 1.6, cor: P.modelo.cor, mat: mat, nome: "Cilindro" }));
      else if (P.modelo.pronto === "placa") objs.push(B.caixa({ tam: [1.8, 1.1, 0.08], cor: P.modelo.cor, mat: mat, pos: [0, 0.4, 0], nome: "Placa" }));
      else if (P.modelo.pronto === "palco") { objs.push(B.caixa({ tam: [3, 0.5, 2], cor: "#1b2028", mat: mat, nome: "Tablado" })); objs.push(B.caixa({ tam: [0.4, 1.8, 0.4], cor: P.modelo.cor, mat: mat, pos: [0, 0.5, 0] })); }
      else objs.push(B.caixa({ tam: [1.3, 1.3, 1.3], cor: P.modelo.cor, mat: mat, rot: [0, P.modelo.rotY, 0], nome: "Cubo" }));
    } else if (modo === "logo") {
      var im = ARQ[P.logo.imgId] && ARQ[P.logo.imgId].img;
      if (im) objs.push({ tipo: "logo", img: im, larguraM: P.logo.larguraM, espessura: P.logo.espessura, bisel: P.logo.bisel,
        acabamento: P.logo.acabamento, cor: P.logo.cor, pos: [0, P.logo.altura, 0], rot: [0, 0, 0], sombra: false });
      else objs.push(B.caixa({ tam: [1.6, 0.9, P.logo.espessura], cor: P.logo.cor, mat: MATS.metal, pos: [0, P.logo.altura - 0.45, 0], centrado: false, nome: "Escolha a sua logo" }));
    } else if (modo === "palco") {
      var p = P.palco, f = fichaLED(), zTras = p.prof / 2, cx = 0;
      if (p.mostrarPalco) objs.push(B.caixa({ tam: [p.larg, p.alt, p.prof], cor: "#191d26", mat: MATS.fosco, pos: [0, 0, 0], nome: "Palco" }));
      objs.push(B.painelLED({ cols: p.cols, rows: p.rows, modulo: p.modulo, moduloA: p.moduloA, alturaChao: p.ledChao,
        pos: [0, 0, zTras], corLed: "#1e2736", conteudo: (ARQ[p.conteudoId] || {}).img || null }));
      if (p.trelica) objs.push(B.trelica({ tam: [Math.max(p.larg, f.L) + 0.6, 0.32, 0.32], pos: [0, p.ledChao + f.A + 0.45, zTras], nome: "Treliça" }));
      if (p.torres) { [-1, 1].forEach(function (s) { objs.push(B.trelica({ tam: [0.32, p.ledChao + f.A + 0.8, 0.32], pos: [s * (Math.max(p.larg, f.L) / 2 + 0.15), 0, zTras], nome: "Torre" })); }); }
      var i;
      for (i = 0; i < Math.min(14, p.pessoas); i++) {
        var n = Math.min(14, p.pessoas), x = n === 1 ? 0 : (-0.5 + i / (n - 1)) * Math.min(p.larg + 2, 11);
        objs.push(B.pessoa({ pos: [x, 0, -p.prof / 2 - 1.1 - (i % 2) * 0.9], altura: 1.7 + (i % 3) * 0.05 }));
      }
      for (i = 0; i < Math.min(4, p.cameras); i++) objs.push(B.cameraTri({ pos: [(i % 2 ? 1 : -1) * (p.larg / 2 + 1.4), 0, -p.prof / 2 - 2.6 - Math.floor(i / 2) * 1.2] }));
      if (p.medidas) {
        med.push({ a: [-f.L / 2, p.ledChao, zTras + 0.1], b: [f.L / 2, p.ledChao, zTras + 0.1], txt: nm(f.L) });
        med.push({ a: [f.L / 2 + 0.12, p.ledChao, zTras + 0.1], b: [f.L / 2 + 0.12, p.ledChao + f.A, zTras + 0.1], txt: nm(f.A) });
        if (p.mostrarPalco) med.push({ a: [-p.larg / 2, p.alt + 0.02, -p.prof / 2], b: [p.larg / 2, p.alt + 0.02, -p.prof / 2], txt: "palco " + nm(p.larg) });
      }
    }
    var cena = { fundo: { tipo: P.fundo.tipo, cor: P.fundo.cor }, chao: { mostrar: P.chao.mostrar, tam: P.chao.tam, passo: P.chao.passo },
      luz: { dir: LUZES[P.luz.preset] || LUZES.estudio, amb: P.luz.amb }, objs: objs, medidas: med };
    var cam = { yaw: P.cam.yaw + (P.giro.liga ? 2 * Math.PI * t / Math.max(0.5, P.giro.seg) : 0), pitch: P.cam.pitch, dist: P.cam.dist, alvo: P.cam.alvo.slice(), fov: P.cam.fov };
    if (P.cam.auto) { var e = enquadrar(objs, w, h, cam); cam.dist = e.dist; cam.alvo = e.alvo; }
    return { cena: cena, cam: cam };
  }
  /* põe tudo na tela qualquer que seja o formato (telão, 9:16, 4K) */
  function caixaDe(objs) {
    var mi = [1e9, 1e9, 1e9], ma = [-1e9, -1e9, -1e9];
    function p3(p) { for (var k = 0; k < 3; k++) { if (p[k] < mi[k]) mi[k] = p[k]; if (p[k] > ma[k]) ma[k] = p[k]; } }
    objs.forEach(function (o) {
      if (o.tipo === "malha") { var mv = B.paraMundo(o), st = Math.max(1, Math.floor(o.verts.length / 200)); for (var i = 0; i < o.verts.length; i += st) p3(mv(o.verts[i])); }
      else if (o.tipo === "logo") { var A = o.larguraM * 0.6, pos = o.pos || [0, 0, 0]; p3([pos[0] - o.larguraM / 2, pos[1] - A / 2, pos[2]]); p3([pos[0] + o.larguraM / 2, pos[1] + A / 2, pos[2] + (o.espessura || 0)]); }
      else if (o.tipo === "silhueta") { var q = o.pos || [0, 0, 0]; p3([q[0] - 0.4, 0, q[2]]); p3([q[0] + 0.4, o.altura || 1.75, q[2]]); }
    });
    if (mi[0] > ma[0]) { mi = [-1, 0, -1]; ma = [1, 2, 1]; }
    return { mi: mi, ma: ma, meio: [(mi[0] + ma[0]) / 2, (mi[1] + ma[1]) / 2, (mi[2] + ma[2]) / 2], tam: [ma[0] - mi[0], ma[1] - mi[1], ma[2] - mi[2]] };
  }
  function enquadrar(objs, w, h, cam) {
    var c = caixaDe(objs), m = Math.min(w, h), tg = Math.tan((cam.fov || 0.62) / 2);
    var raio = Math.sqrt(c.tam[0] * c.tam[0] + c.tam[1] * c.tam[1] + c.tam[2] * c.tam[2]) / 2;
    var meiaL = Math.max(0.3, Math.max(c.tam[0], c.tam[2]) / 2 + raio * 0.08), meiaA = Math.max(0.3, c.tam[1] / 2 + raio * 0.05);
    var d1 = meiaL * (m / w) / tg, d2 = meiaA * (m / h) / tg;
    return { dist: Math.max(0.8, Math.max(d1, d2) * (P.cam.zoom || 1) * 1.45), alvo: [c.meio[0], c.meio[1], c.meio[2]] };
  }

  /* ---------- prévia ---------- */
  function medir() {
    if (!CV) return;
    var pai = CV.parentElement, lado = Math.max(260, pai.clientWidth - 2), fixo = FIXA && FIXA.fixo && FIXA.fixo();
    var alt = fixo ? Math.max(240, pai.clientHeight - 2)
      : Math.max(220, Math.min(Math.round(innerHeight * (innerWidth <= 1100 ? 0.44 : 0.62)), Math.round(lado * 0.72)));
    DPR = Math.min(2, window.devicePixelRatio || 1);
    CV.style.width = lado + "px"; CV.style.height = alt + "px";
    CV.width = Math.round(lado * DPR); CV.height = Math.round(alt * DPR);
    CX = CV.getContext("2d");
  }
  function ver(t) {
    if (!CX) medir(); if (!CX || !P) return;
    TEMPO = t == null ? TEMPO : t;
    var w = CV.width, h = CV.height, c = montar(TEMPO, w, h);
    CX.setTransform(1, 0, 0, 1, 0, 0);
    B.desenhar(CX, c.cena, c.cam, w, h);
  }
  function loop() {
    if (!TOCA) return;
    TEMPO = (performance.now() - T0) / 1000;
    if (TEMPO > Math.max(0.5, P.giro.seg)) { T0 = performance.now(); TEMPO = 0; }
    ver(TEMPO); requestAnimationFrame(loop);
  }
  function tocar(liga) {
    TOCA = liga == null ? !TOCA : liga;
    $("d3Giro").classList.toggle("on", TOCA);
    if (TOCA) { T0 = performance.now() - TEMPO * 1000; requestAnimationFrame(loop); } else ver(TEMPO);
  }

  /* ---------- girar com o dedo / mouse ---------- */
  function orbitar() {
    var arr = null, pin = null;
    CV.addEventListener("pointerdown", function (e) {
      if (window.BWFerr && BWFerr.atual && BWFerr.atual() === "z") { P.cam.zoom = Math.max(0.3, (P.cam.zoom || 1) * (e.shiftKey ? 1.25 : 0.8)); P.cam.dist = P.cam.dist * (e.shiftKey ? 1.25 : 0.8); ver(); return; }
      arr = { x: e.clientX, y: e.clientY, yaw: P.cam.yaw, pitch: P.cam.pitch, al: P.cam.alvo.slice(), mao: window.BWFerr && BWFerr.atual && BWFerr.atual() === "h" };
      CV.classList.add("arrastando"); try { CV.setPointerCapture(e.pointerId); } catch (x) {}
    });
    CV.addEventListener("pointermove", function (e) {
      if (!arr) return;
      var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
      if (arr.mao) { P.cam.auto = false; P.cam.alvo = [arr.al[0] - dx * 0.006 * P.cam.dist * Math.cos(P.cam.yaw), arr.al[1] + dy * 0.006 * P.cam.dist, arr.al[2] + dx * 0.006 * P.cam.dist * Math.sin(P.cam.yaw)]; }
      else { P.cam.yaw = arr.yaw + dx * 0.009; P.cam.pitch = B.lim(arr.pitch + dy * 0.006, -0.25, 1.45); }
      ver();
    });
    function solta() { if (arr) { arr = null; CV.classList.remove("arrastando"); guardarTarde(); } }
    CV.addEventListener("pointerup", solta); CV.addEventListener("pointercancel", solta);
    CV.addEventListener("wheel", function (e) { e.preventDefault(); zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });
    CV.addEventListener("touchstart", function (e) { if (e.touches.length === 2) { arr = null; pin = dist2(e); } }, { passive: false });
    CV.addEventListener("touchmove", function (e) {
      if (e.touches.length === 2 && pin) { e.preventDefault(); var d = dist2(e); if (d && pin) { zoom(pin / d); pin = d; } }
    }, { passive: false });
    CV.addEventListener("touchend", function () { pin = null; });
    function dist2(e) { return Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }
  }
  function zoom(k) { P.cam.zoom = B.lim((P.cam.zoom || 1) * k, 0.25, 4); P.cam.dist = B.lim(P.cam.dist * k, 0.5, 200); ver(); guardarTarde(); }
  function angulo(a) {
    var g = { frente: [0, 0.18], tres: [0.62, 0.34], lado: [1.57, 0.22], cima: [0.5, 1.15], baixo: [0.3, -0.12] }[a] || [0.62, 0.34];
    P.cam.yaw = g[0]; P.cam.pitch = g[1]; P.cam.auto = true; P.cam.zoom = 1; ver(); guardarTarde();
  }
  /* para os testes e para o app BW: ler o projeto e a ficha do telão sem mexer em nada */
  window.BW3DEditor = { projeto: function () { return P; }, montar: montar, ficha: fichaLED, ver: ver, arquivos: function () { return ARQ; },
    modo: function (m) { trocarModo(m); }, tamanho: tamanhoExp, png: salvarPNG, folha: folhaExportar,
    montarFoto: montarFoto, malha: function () { return MALHA3D; }, malhas: malhasDaCena, exportar3D: exportar3D };

  /* ---------- painel (muda com o modo) ---------- */
  function op(lista, val) { return lista.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join(""); }
  function campo(rot, html) { return '<label class="d3-l"><span>' + rot + "</span>" + html + "</label>"; }
  function sel(k, lista) { return '<select class="d3-sel" data-k="' + k + '">' + op(lista, getK(k)) + "</select>"; }
  function faixa(k, a, b, s) { return '<input type="range" class="d3-sl" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + s + '" value="' + getK(k) + '">'; }
  function numero(k, a, b, s) { return '<input type="number" class="d3-in" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + (s || 1) + '" value="' + getK(k) + '">'; }
  function cor(k) { return '<input type="color" class="d3-cor" data-k="' + k + '" value="' + getK(k) + '">'; }
  function getK(k) { var ps = k.split("."), o = P, i; for (i = 0; i < ps.length; i++) { o = o[ps[i]]; if (o === undefined) return ""; } return o; }
  function setK(k, v) { var ps = k.split("."), o = P, i; for (i = 0; i < ps.length - 1; i++) o = o[ps[i]]; o[ps[ps.length - 1]] = v; }

  function painel() {
    var h = "", m = P.modo, f = m === "palco" ? fichaLED() : null;
    /* ---- objeto ---- */
    h += '<div class="d3-g" data-aba="objeto"><h4 data-seta="d3obj">' + (m === "logo" ? "A SUA LOGO" : m === "palco" ? "PALCO E PAINEL DE LED" : m === "ia" ? "PEDIR PARA A IA" : "O MODELO") + "</h4><div>";
    if (m === "plano") {
      h += painelPlano();
    } else if (m === "modelo") {
      var a = ARQ[P.modelo.arqId];
      h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt pri" id="d3Abrir" type="button">📂 ABRIR MODELO (GLB · OBJ · STL)</button></div>';
      h += '<p class="d3-nota" style="margin:0 0 8px">' + (a ? "<b>" + esc(a.nome) + "</b> · " + (a.faces ? a.faces.length.toLocaleString("pt-BR") + " triângulos" : "") + (a.medida ? " · " + nm(a.medida.originais[1]) + " de altura no arquivo" : "") : "Sem modelo: mostrando uma forma pronta. GLB, OBJ e STL abrem direto (sem Draco).") + "</p>";
      if (!a) h += campo("Forma pronta", sel("modelo.pronto", [["cubo", "Cubo"], ["cilindro", "Cilindro"], ["placa", "Placa / painel"], ["palco", "Tablado com totem"]]));
      h += campo("Altura no mundo (metros)", numero("modelo.alturaM", 0.05, 20, 0.05));
      h += '<div class="d3-l2">' + campo("Cor", cor("modelo.cor")) + campo("Material", sel("modelo.material", [["fosco", "Fosco"], ["plastico", "Plástico"], ["metal", "Metal"], ["cromado", "Cromado"]])) + "</div>";
      h += campo("Girar o objeto", faixa("modelo.rotY", -3.14, 3.14, 0.02));
      h += campo("Mostrar as arestas", faixa("modelo.arestas", 0, 0.5, 0.05));
      if (a) h += '<div class="d3-fx"><button class="d3-bt mini perigo" id="d3Tirar" type="button">✕ TIRAR O MODELO</button></div>';
    } else if (m === "logo") {
      var im = ARQ[P.logo.imgId];
      h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt pri" id="d3AbrirImg" type="button">🖼 ESCOLHER PNG DA LOGO</button><button class="d3-bt mini" id="d3Marca" type="button">★ MINHA MARCA</button></div>';
      h += '<p class="d3-nota" style="margin:0 0 8px">' + (im ? "<b>" + esc(im.nome) + "</b>" : "Use um PNG com fundo transparente (é o fundo que vira o relevo).") + "</p>";
      h += campo("Acabamento", sel("logo.acabamento", Object.keys(ACAB).map(function (k) { return [k, ACAB[k][0]]; })));
      h += campo("Cor do metal / da cor sólida", cor("logo.cor"));
      h += '<div class="d3-l2">' + campo("Espessura (m)", faixa("logo.espessura", 0.01, 0.5, 0.01)) + campo("Bisel", faixa("logo.bisel", 0, 3, 0.25)) + "</div>";
      h += '<div class="d3-l2">' + campo("Largura (m)", numero("logo.larguraM", 0.2, 12, 0.1)) + campo("Altura do chão (m)", numero("logo.altura", 0, 8, 0.1)) + "</div>";
    } else if (m === "palco") {
      h += '<div class="d3-l3">' + campo("Colunas", numero("palco.cols", 1, 60, 1)) + campo("Linhas", numero("palco.rows", 1, 30, 1)) + campo("Pitch", sel("palco.pitch", PITCHES.map(function (p) { return [p[0], p[1]]; }))) + "</div>";
      h += '<div class="d3-l2">' + campo("Módulo", sel("palco.modulo", [[0.5, "0,5 m de largura"], [1, "1,0 m de largura"]])) + campo("Altura do módulo", sel("palco.moduloA", [[0.5, "0,5 m"], [1, "1,0 m"]])) + "</div>";
      h += campo("Painel a quantos metros do chão", faixa("palco.ledChao", 0, 4, 0.1));
      h += '<div class="d3-ficha" id="d3Ficha">' + fichaHTML(f) + "</div>";
      h += '<h4 data-seta="d3palco2" data-seta-padrao="fechada" style="margin-top:12px">PALCO, TRELIÇA E PESSOAS</h4><div>';
      h += '<div class="d3-l3">' + campo("Largura (m)", numero("palco.larg", 1, 40, 0.5)) + campo("Profund. (m)", numero("palco.prof", 1, 20, 0.5)) + campo("Altura (m)", numero("palco.alt", 0, 3, 0.1)) + "</div>";
      h += '<div class="d3-l2">' + campo("Pessoas de escala", numero("palco.pessoas", 0, 14, 1)) + campo("Câmeras", numero("palco.cameras", 0, 4, 1)) + "</div>";
      h += '<div class="d3-chips" style="margin-bottom:8px">' + chip("palco.mostrarPalco", "PALCO") + chip("palco.trelica", "TRELIÇA EM CIMA") + chip("palco.torres", "TORRES") + chip("palco.medidas", "MEDIDAS") + "</div>";
      h += '<div class="d3-fx"><button class="d3-bt mini" id="d3Conteudo" type="button">🖼 PÔR UMA ARTE NO PAINEL</button>' + (P.palco.conteudoId ? '<button class="d3-bt mini perigo" id="d3SemConteudo" type="button">✕ TIRAR A ARTE</button>' : "") + "</div></div>";
    } else if (m === "foto") {
      var nf = ["frente", "lado", "costas"].map(function (k) { var a = ARQ[P.foto[k + "Id"]]; return a ? a.nome : ""; });
      h += '<p class="d3-nota" style="margin:0 0 8px">PNG com fundo transparente. Só a <b>FRENTE</b> já faz; com o <b>LADO</b> o corpo fica certo de verdade; as <b>COSTAS</b> dão a cor de trás.</p>';
      h += '<div class="d3-fx" style="margin-bottom:8px">' +
        '<button class="d3-bt pri" id="d3Fr" type="button">👤 FRENTE' + (nf[0] ? " ✓" : "") + "</button>" +
        '<button class="d3-bt" id="d3La" type="button">↔ LADO' + (nf[1] ? " ✓" : "") + "</button>" +
        '<button class="d3-bt" id="d3Co" type="button">🔄 COSTAS' + (nf[2] ? " ✓" : "") + "</button></div>";
      if (nf[0]) h += '<p class="d3-nota" style="margin:0 0 8px">' + nf.filter(Boolean).map(esc).join(" · ") + "</p>";
      h += '<div class="d3-l2">' + campo("Altura de verdade (m)", numero("foto.alturaM", 0.05, 30, 0.05)) + campo("Detalhe", sel("foto.res", [[96, "Rápido"], [128, "Bom"], [160, "Alto"], [192, "Máximo (demora)"]])) + "</div>";
      if (!nf[1]) h += campo("Profundidade (sem a foto de lado)", faixa("foto.espessura", 0.3, 2, 0.1));
      h += campo("Suavizar", faixa("foto.suave", 0, 8, 1));
      h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt ia" id="d3Montar" type="button">✨ MONTAR O 3D</button>' +
        (MALHA3D ? '<button class="d3-bt mini perigo" id="d3Limpar" type="button">✕ LIMPAR</button>' : "") + "</div>";
      if (MALHA3D && MALHA3D.info) h += '<div class="d3-ficha">Malha pronta: <b>' + MALHA3D.info.faces.toLocaleString("pt-BR") + " polígonos</b> · " +
        MALHA3D.info.vertices.toLocaleString("pt-BR") + " vértices<br>vistas usadas: " + MALHA3D.info.vistas.join(" + ") + " · " + (MALHA3D.info.ms / 1000).toFixed(1) + " s</div>";
    } else {
      h += campo("O que você quer em 3D?", '<textarea class="d3-in" data-k="ia.pedido" rows="3" style="height:auto;padding:8px;font-size:16px" placeholder="ex.: um troféu de acrílico com a base preta, para o palco do evento">' + esc(P.ia.pedido) + "</textarea>");
      h += '<div class="d3-l2">' + campo("Para que serve", sel("ia.estilo", [["produto", "Produto / objeto"], ["personagem", "Personagem"], ["cenario", "Cenário / ambiente"], ["evento", "Item de evento (palco, totem)"], ["logo", "Logo em volume"]])) + campo("Qual IA", sel("ia.ia", [["tripo", "Tripo 3D"], ["meshy", "Meshy"], ["rodin", "Rodin (Hyper3D)"], ["hunyuan", "Hunyuan3D"]])) + "</div>";
      h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt ia" id="d3Prompt" type="button">✨ MONTAR O PEDIDO</button><button class="d3-bt mini" id="d3Copiar" type="button">⧉ COPIAR</button><a class="d3-bt mini" id="d3AbrirIA" target="_blank" rel="noopener">↗ ABRIR A IA</a></div>';
      h += '<textarea class="d3-in" id="d3PromptTxt" rows="4" style="height:auto;padding:8px;font-size:14px" placeholder="o pedido em inglês aparece aqui"></textarea>';
      h += '<p class="d3-nota" style="margin:8px 0">O site não chama nenhuma IA de 3D: você gera na IA escolhida (com a conta dela) e traz o arquivo para cá. <b>Preço de referência em 20/11/2026: cerca de US$ 0,20 a 0,30 por modelo com textura</b> — confira no site da IA antes de pagar. No plano grátis de algumas delas o modelo sai público e sem uso comercial: leia as regras antes de usar em trabalho de cliente.</p>';
      h += '<div class="d3-fx"><button class="d3-bt pri" id="d3Abrir" type="button">📂 TRAZER O ARQUIVO (GLB · OBJ · STL)</button></div>';
      h += '<p class="d3-nota" style="margin:8px 0 0">No app BW do computador vai dar para conectar a sua própria chave e gerar sem sair daqui — <b>em breve</b>.</p>';
    }
    h += "</div></div>";
    /* ---- cena e câmera ---- */
    h += '<div class="d3-g" data-aba="cena"><h4 data-seta="d3cena">CENA E CÂMERA</h4><div>';
    h += campo("Fundo", sel("fundo.tipo", Object.keys(B.FUNDOS).map(function (k) { return [k, B.FUNDOS[k]]; })));
    if (P.fundo.tipo === "cor") h += campo("Cor do fundo", cor("fundo.cor"));
    h += '<div class="d3-chips" style="margin-bottom:8px">' + chip("chao.mostrar", "CHÃO COM GRADE") + chip("giro.liga", "GIRAR SOZINHO") + "</div>";
    h += campo("Luz", sel("luz.preset", [["estudio", "Estúdio (3/4)"], ["frontal", "Frontal"], ["lateral", "Lateral forte"], ["palco", "De cima (palco)"]]));
    h += campo("Luz de preenchimento", faixa("luz.amb", 0.08, 0.7, 0.01));
    h += campo("Segundos por volta", numero("giro.seg", 2, 60, 1));
    h += '<span class="d3-l"><span>Ângulo da câmera</span></span><div class="d3-chips">' +
      ["frente", "tres", "lado", "cima", "baixo"].map(function (a) { return '<button class="d3-chip" data-ang="' + a + '" type="button">' + { frente: "FRENTE", tres: "3/4", lado: "LADO", cima: "DE CIMA", baixo: "DE BAIXO" }[a] + "</button>"; }).join("") + "</div>";
    h += "</div></div>";
    /* ---- exportar ---- */
    h += '<div class="d3-g" data-aba="exportar"><h4 data-seta="d3exp">SALVAR E EXPORTAR</h4><div>';
    h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt pri" id="d3Exportar" type="button">🎬 GERAR VÍDEO NESTE APARELHO</button></div>';
    h += '<div class="d3-fx" style="margin-bottom:8px"><button class="d3-bt" id="d3Png" type="button">🖼 SALVAR PNG</button>' +
      (m === "palco" ? '<button class="d3-bt" id="d3Pdf" type="button">📄 PLANTA EM PDF</button>' : "") + "</div>";
    if (m !== "logo") {
      h += '<h4 data-seta="d3exp3d" style="margin-top:12px">LEVAR PARA O BLENDER (3D)</h4><div>';
      h += '<div class="d3-fx" style="margin-bottom:6px"><button class="d3-bt pri" id="d3Glb" type="button">⬇ GLB (um arquivo só)</button>' +
        '<button class="d3-bt" id="d3Obj" type="button">⬇ OBJ + MTL (.zip)</button></div>';
      h += '<p class="d3-nota" style="margin:0">No Blender: <b>Arquivo → Importar → glTF 2.0 (.glb)</b> — já vem em metros, de pé e com as cores. O OBJ serve para qualquer outro programa (Cinema 4D, 3ds Max, Maya, impressão 3D).</p>';
      h += "</div>";
    }
    h += '<p class="d3-nota" style="margin:0">O vídeo é gerado no próprio aparelho, sem enviar nada. Fundo verde, azul ou magenta = recorte no CapCut (Chroma key); fundo transparente = PNG com recorte.</p>';
    h += "</div></div>";
    $("d3Painel").innerHTML = h;
    ligarPainel();
    if (window.BWDobras) BWDobras.aplicar($("d3Painel"));
  }
  /* ---------- PLANO DO PROJETO: a máquina do usuário decide o caminho ---------- */
  var MAQ = null;
  function maquina() {
    if (!MAQ && window.BW3DPlano) MAQ = BW3DPlano.maquina();
    return MAQ;
  }
  function painelPlano() {
    if (!window.BW3DPlano) return '<p class="d3-nota">Recarregue a página para carregar o plano.</p>';
    var mq = maquina(), h = "", esc2 = esc;
    h += '<div class="d3-ficha" style="background:rgba(124,92,255,.1);border-color:rgba(124,92,255,.3)"><b>A SUA MÁQUINA</b><br>' + esc2(BW3DPlano.resumo(mq)) +
      (mq.placa.doUsuario ? "" : mq.placa.talvezOutra
        ? '<br><span style="color:#FFB547">⚠ Em notebook o navegador quase sempre mostra o vídeo integrado. Se este computador tem placa NVIDIA, diga qual abaixo.</span>'
        : mq.placa.vram ? '<br><span style="opacity:.8">memória de vídeo estimada pelo modelo da placa — confira abaixo</span>' : "") +
      '<div class="d3-fx" style="margin-top:8px;flex-wrap:wrap">' +
      '<label class="d3-l" style="margin:0;flex:1;min-width:150px"><span>Marca da placa</span><select class="d3-sel" id="d3PlacaMarca">' +
      op([["nvidia", "NVIDIA (GeForce/RTX)"], ["amd", "AMD Radeon"], ["intel", "Intel Arc"], ["apple", "Apple (M1/M2/M3…)"], ["nenhuma", "Só o vídeo integrado"]], mq.placa.integrada && !mq.placa.doUsuario ? "nenhuma" : mq.placa.marca) + "</select></label>" +
      '<label class="d3-l" style="margin:0;flex:1;min-width:150px"><span>Memória de vídeo</span><select class="d3-sel" id="d3Vram">' +
      op([[0, "Não sei / nenhuma"], [4, "4 GB"], [6, "6 GB"], [8, "8 GB"], [10, "10 GB"], [12, "12 GB"], [16, "16 GB"], [24, "24 GB"], [32, "32 GB ou mais"]], mq.placa.vram || 0) + "</select></label></div>" +
      (mq.ram && mq.ram <= 16 ? '<div style="margin-top:6px;opacity:.85">Com placa de até 8 GB o gerador usa a RAM do PC como apoio: com ' + mq.ram + ' GB dá para rodar os modelos pequenos, mas feche o resto.</div>' : "") + "</div>";
    h += '<p class="d3-nota" style="margin:10px 0 6px"><b>O que você quer fazer?</b></p><div class="d3-lista">';
    BW3DPlano.PROJETOS.forEach(function (pj) {
      var r = BW3DPlano.avaliar(pj, mq), cor = r.nivel === "ok" ? "#B6FF3B" : r.nivel === "quase" ? "#FFB547" : "#7C5CFF";
      var selo = r.nivel === "ok" ? "DÁ AQUI" : r.nivel === "quase" ? "PARTE AQUI" : "NA NUVEM";
      h += '<button class="d3-obj" type="button" data-pj="' + pj.id + '" style="text-align:left;cursor:pointer;border-color:' + cor + '40">' +
        '<span style="font-size:19px">' + pj.icone + "</span><span class=\"nm\" style=\"white-space:normal\"><b>" + esc2(pj.nome) + "</b><br><span style=\"opacity:.75;font-weight:600\">" + esc2(pj.exemplo) + "</span></span>" +
        '<span style="font:800 9.5px Inter,sans-serif;letter-spacing:.08em;color:' + cor + ';border:1px solid ' + cor + '55;border-radius:999px;padding:3px 7px;white-space:nowrap">' + selo + "</span></button>";
    });
    h += "</div>";
    if (P.plano.projeto) {
      var r2 = BW3DPlano.avaliar(P.plano.projeto, mq);
      if (r2) {
        var c2 = r2.nivel === "ok" ? "#B6FF3B" : r2.nivel === "quase" ? "#FFB547" : "#7C5CFF";
        h += '<div class="d3-ficha" style="margin-top:12px;border-color:' + c2 + '55;background:' + c2 + '12">';
        h += '<b style="color:' + c2 + '">' + esc2(r2.titulo.toUpperCase()) + "</b><br>" + esc2(r2.porque) + "<br><br><b>O CAMINHO</b><br>";
        r2.caminho.forEach(function (x, i) { h += (i + 1) + ". " + esc2(x) + "<br>"; });
        if (r2.geradores.length) h += "<br><b>RODA NA SUA PLACA</b><br>" + r2.geradores.map(function (g) { return esc2(g.nome) + " — " + g.vram + " GB · " + esc2(g.licenca); }).join("<br>");
        if (r2.projeto.entrega) h += "<br><br><b>O QUE VOCÊ ENTREGA</b><br>" + r2.projeto.entrega.map(esc2).join(" · ");
        if (r2.projeto.aviso) h += '<br><br><span style="color:#ffd9da">⚠ ' + esc2(r2.projeto.aviso) + "</span>";
        if (r2.bibliotecas && r2.bibliotecas.length) {
          h += "<br><br><b>MODELOS PRONTOS E GRÁTIS (pulam a IA)</b><br>" + r2.bibliotecas.map(function (b) {
            return '<a href="' + b.url + '" target="_blank" rel="noopener" style="color:#7CC4FF">' + esc2(b.nome) + "</a> — " + esc2(b.nota);
          }).join("<br>") + '<br><span style="opacity:.85">' + esc2(BW3DPlano.REGRA_LICENCA) + "</span>";
        }
        h += '<div class="d3-fx" style="margin-top:10px">' + atalhoDoProjeto(r2.projeto) + "</div></div>";
      }
    }
    h += '<p class="d3-nota" style="margin:10px 0 0">' + esc2(BW3DPlano.FONTES) + " Nada disso sai do aparelho: a leitura da placa é do próprio navegador.</p>";
    return h;
  }
  function atalhoDoProjeto(pj) {
    var b = '<button class="d3-bt pri" type="button" data-ir="';
    if (pj.id === "logo") return b + 'logo">✨ ABRIR O LOGO 3D</button>';
    if (pj.id === "evento") return b + 'palco">🎪 ABRIR A MAQUETE</button>';
    if (pj.id === "peca") return b + 'foto">🧍 ABRIR O FOTO → 3D</button>' + '<a class="d3-bt" href="criador.html">🎨 CRIADOR IA</a>';
    if (pj.id === "avatar") return b + 'foto">🧍 COMEÇAR PELO FOTO → 3D</button>' + '<a class="d3-bt" href="personagens.html">👤 PERSONAGENS</a>';
    if (pj.id === "jogo") return '<a class="d3-bt pri" href="criador.html">🎨 ARTES 2D NO CRIADOR IA</a>' + b + 'modelo">🧊 ABRIR MODELO 3D</button>';
    return b + 'modelo">🧊 ABRIR MODELO 3D</button>';
  }
  function chip(k, txt) { return '<button class="d3-chip' + (getK(k) ? " on" : "") + '" data-ch="' + k + '" type="button">' + txt + "</button>"; }
  function fichaHTML(f) {
    if (!f) return "";
    return "<b>" + f.paineis + " painéis</b> · " + nm(f.L) + " × " + nm(f.A) + " (" + (Math.round(f.m2 * 100) / 100).toLocaleString("pt-BR") + " m²)<br>" +
      'Resolução do telão: <span class="px">' + f.px[0] + " × " + f.px[1] + " px</span><br>" +
      '<span style="opacity:.8">cada módulo de ' + nm(f.L / (P.palco.cols || 1)) + " = " + f.pxModulo[0] + " × " + f.pxModulo[1] + " px</span>" +
      '<div class="d3-fx" style="margin-top:8px"><a class="d3-bt mini" href="motion.html?w=' + f.px[0] + "&h=" + f.px[1] + '">▶ USAR NO ESTÚDIO DE MOTION</a>' +
      '<a class="d3-bt mini" href="telas.html?w=' + f.px[0] + "&h=" + f.px[1] + '">▶ USAR NAS TELAS</a></div>';
  }
  function ligarPainel() {
    var pn = $("d3Painel");
    pn.querySelectorAll("[data-k]").forEach(function (el) {
      var ev = el.tagName === "SELECT" || el.type === "color" || el.tagName === "TEXTAREA" ? "change" : "input";
      el.addEventListener(ev, function () {
        var k = el.getAttribute("data-k"), v = el.value;
        if (el.type === "number" || el.type === "range") v = num(v, getK(k));
        else if (el.tagName === "SELECT" && /^-?[\d.]+$/.test(v)) v = num(v, v);
        setK(k, v); mudou(k);
      });
      if (el.tagName === "TEXTAREA") el.addEventListener("input", function () { setK(el.getAttribute("data-k"), el.value); guardarTarde(); });
    });
    pn.querySelectorAll("[data-ch]").forEach(function (b) { b.onclick = function () { var k = b.getAttribute("data-ch"); setK(k, !getK(k)); b.classList.toggle("on", !!getK(k)); mudou(k); }; });
    pn.querySelectorAll("[data-ang]").forEach(function (b) { b.onclick = function () { angulo(b.getAttribute("data-ang")); }; });
    if ($("d3Abrir")) $("d3Abrir").onclick = function () { $("d3Arq").click(); };
    if ($("d3AbrirImg")) $("d3AbrirImg").onclick = function () { $("d3Img").removeAttribute("data-alvo"); $("d3Img").click(); };
    if ($("d3Conteudo")) $("d3Conteudo").onclick = function () { $("d3Img").setAttribute("data-alvo", "conteudo"); $("d3Img").click(); };
    if ($("d3SemConteudo")) $("d3SemConteudo").onclick = function () { P.palco.conteudoId = ""; painel(); ver(); guardar(); };
    if ($("d3Tirar")) $("d3Tirar").onclick = function () { P.modelo.arqId = ""; P.modelo.nome = ""; painel(); P.cam.auto = true; ver(); guardar(); };
    if ($("d3Marca")) $("d3Marca").onclick = usarMarca;
    if ($("d3Prompt")) $("d3Prompt").onclick = montarPrompt;
    if ($("d3Copiar")) $("d3Copiar").onclick = function () {
      var t = $("d3PromptTxt").value || montarPrompt();
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { aviso("Pedido copiado — cole na IA."); }, function () { $("d3PromptTxt").select(); aviso("Toque e segure para copiar o texto.", true); });
    };
    if ($("d3AbrirIA")) $("d3AbrirIA").href = { tripo: "https://www.tripo3d.ai/", meshy: "https://www.meshy.ai/", rodin: "https://hyper3d.ai/", hunyuan: "https://3d.hunyuan.tencent.com/" }[P.ia.ia] || "https://www.tripo3d.ai/";
    pn.querySelectorAll("[data-pj]").forEach(function (b) { b.onclick = function () { P.plano.projeto = b.getAttribute("data-pj"); painel(); guardarTarde();
      var el = pn.querySelector(".d3-ficha[style*='margin-top']"); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }; });
    pn.querySelectorAll("[data-ir]").forEach(function (b) { b.onclick = function () { trocarModo(b.getAttribute("data-ir")); }; });
    function guardarMaquina(msg) {
      MAQ.placa.doUsuario = true; MAQ.placa.conhecida = true; MAQ.placa.talvezOutra = false;
      MAQ.placa.integrada = MAQ.placa.marca === "nenhuma";
      try { localStorage.setItem("ui_3d_maquina", JSON.stringify({ vram: MAQ.placa.vram, marca: MAQ.placa.marca })); } catch (e) {}
      painel(); aviso(msg);
    }
    if ($("d3Vram")) $("d3Vram").onchange = function () {
      MAQ.placa.vram = num(this.value, 0);
      guardarMaquina(MAQ.placa.vram ? "Pronto: plano refeito para uma placa de " + MAQ.placa.vram + " GB." : "Pronto: plano refeito para máquina sem placa dedicada.");
    };
    if ($("d3PlacaMarca")) $("d3PlacaMarca").onchange = function () {
      MAQ.placa.marca = this.value;
      if (this.value === "nenhuma") MAQ.placa.vram = 0;
      guardarMaquina("Pronto: plano refeito para placa " + (this.value === "nenhuma" ? "integrada" : this.value.toUpperCase()) + ".");
    };
    if ($("d3Fr")) $("d3Fr").onclick = function () { $("d3Img").setAttribute("data-alvo", "frente"); $("d3Img").click(); };
    if ($("d3La")) $("d3La").onclick = function () { $("d3Img").setAttribute("data-alvo", "lado"); $("d3Img").click(); };
    if ($("d3Co")) $("d3Co").onclick = function () { $("d3Img").setAttribute("data-alvo", "costas"); $("d3Img").click(); };
    if ($("d3Montar")) $("d3Montar").onclick = montarFoto;
    if ($("d3Limpar")) $("d3Limpar").onclick = function () { MALHA3D = null; painel(); P.cam.auto = true; ver(); };
    if ($("d3Glb")) $("d3Glb").onclick = function () { exportar3D("glb"); };
    if ($("d3Obj")) $("d3Obj").onclick = function () { exportar3D("obj"); };
    if ($("d3Exportar")) $("d3Exportar").onclick = folhaExportar;
    if ($("d3Png")) $("d3Png").onclick = salvarPNG;
    if ($("d3Pdf")) $("d3Pdf").onclick = planta;
  }
  function mudou(k) {
    if (/^palco\.(cols|rows|pitch|modulo|moduloA)$/.test(k || "") && $("d3Ficha")) $("d3Ficha").innerHTML = fichaHTML(fichaLED());
    if (/^(fundo\.tipo|modo)$/.test(k || "")) painel();
    if (k === "giro.liga") tocar(P.giro.liga);
    if (k === "modelo.alturaM" && ARQ[P.modelo.arqId]) { var a = ARQ[P.modelo.arqId]; a.verts = a.crus.map(function (p) { return p.slice(); }); a.faces = a.facesCruas; a.medida = B.ajustar(a, P.modelo.alturaM); P.cam.auto = true; }
    if (/^(palco|logo|modelo)\./.test(k || "")) P.cam.auto = P.cam.auto !== false ? true : P.cam.auto;
    P.atualizado = Date.now(); ver(); guardarTarde();
  }
  function montarPrompt() {
    var e = { produto: "product shot, clean studio turntable, neutral background", personagem: "full body character, A-pose, game-ready", cenario: "small diorama scene, isometric", evento: "stage prop for a live event, realistic scale", logo: "extruded 3D emblem, beveled edges" }[P.ia.estilo];
    var t = "3D model of " + (P.ia.pedido || "a simple object") + " — " + e + ", clean quad topology, centered and standing on the ground, PBR textures, no text, no watermark, single object";
    $("d3PromptTxt").value = t; guardarTarde(); return t;
  }

  /* ---------- trazer arquivos (ficam só no aparelho) ---------- */
  function guardarArq(id, nome, blob, tipo) { por("arquivos", "put", { id: id, nome: nome, blob: blob, tipo: tipo }); }
  async function abrirModelo(file) {
    try {
      aviso("Abrindo " + file.name + "…");
      var buf = await file.arrayBuffer(), m = B.lerArquivo(file.name, buf), id = uid("a3");
      var a = { id: id, nome: file.name, crus: m.verts.map(function (p) { return p.slice(); }), facesCruas: m.faces, verts: m.verts, faces: m.faces };
      a.medida = B.ajustar(a, P.modelo.alturaM);
      ARQ[id] = a; P.modelo.arqId = id; P.modelo.nome = file.name; P.cam.auto = true; P.cam.zoom = 1;
      guardarArq(id, file.name, new Blob([buf]), "modelo");
      painel(); ver(); guardar();
      aviso("✓ " + file.name + " · " + m.faces.length.toLocaleString("pt-BR") + " triângulos");
    } catch (e) { aviso("Não deu para abrir: " + (e.message || e), true); }
  }
  function imgDe(url) { return new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { erro(new Error("imagem não abriu")); }; i.src = url; }); }
  async function abrirImagem(file, alvo) {
    if (!alvo) alvo = P.modo === "palco" ? "conteudo" : P.modo === "foto" ? "frente" : "logo";   /* maquete = arte do painel; foto = plano da frente */
    try {
      var url = await new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = function () { erro(new Error("não deu para ler")); }; r.readAsDataURL(file); });
      var im = await imgDe(url), id = uid("im");
      ARQ[id] = { id: id, nome: file.name, img: im, url: url };
      guardarArq(id, file.name, url, alvo === "conteudo" ? "conteudo" : "logo");
      if (alvo === "conteudo") P.palco.conteudoId = id;
      else if (alvo === "frente" || alvo === "lado" || alvo === "costas") { P.foto[alvo + "Id"] = id; MALHA3D = null; }
      else { P.logo.imgId = id; P.logo.nome = file.name; }
      P.cam.auto = true; painel(); ver(); guardar(); aviso("✓ " + file.name);
    } catch (e) { aviso("Não deu para abrir a imagem: " + (e.message || e), true); }
  }
  function usarMarca() {
    if (!window.indexedDB) return aviso("Este navegador não guarda a marca.", true);
    var r = indexedDB.open("bw_fotos_marca", 1);
    r.onupgradeneeded = function () { try { r.result.createObjectStore("kit"); } catch (e) {} };
    r.onerror = function () { aviso("Não achei a sua marca. Monte em ★ MINHA MARCA no Editor de fotos.", true); };
    r.onsuccess = function () {
      var d = r.result; if (!d.objectStoreNames.contains("kit")) return aviso("Monte a sua marca no Editor de fotos (★ MINHA MARCA).", true);
      var q = d.transaction("kit").objectStore("kit").get("kit");
      q.onsuccess = async function () {
        var kit = q.result || {}, lg = (kit.logos || [])[0];
        if (!lg || !lg.url) return aviso("Não achei logo em ★ MINHA MARCA (Editor de fotos).", true);
        try { var im = await imgDe(lg.url), id = uid("im"); ARQ[id] = { id: id, nome: lg.nome || "Logo da marca", img: im, url: lg.url };
          guardarArq(id, lg.nome || "Logo da marca", lg.url, "logo"); P.logo.imgId = id; P.logo.nome = lg.nome || "Logo da marca";
          P.cam.auto = true; painel(); ver(); guardar(); aviso("✓ logo da sua marca"); } catch (e) { aviso("A logo da marca não abriu.", true); }
      };
      q.onerror = function () { aviso("Não deu para ler a sua marca.", true); };
    };
  }

  /* ---------- FOTO → 3D (escava pelas silhuetas, aqui no aparelho) ---------- */
  function montarFoto() {
    var f = ARQ[P.foto.frenteId];
    if (!f || !f.img) return aviso("Escolha pelo menos a imagem de FRENTE (PNG com fundo transparente).", true);
    if (!window.BW3DFoto) return aviso("Faltou carregar o montador 3D — recarregue a página.", true);
    aviso("Escavando pelas silhuetas… pode levar alguns segundos.");
    var bt = $("d3Montar"); if (bt) bt.disabled = true;
    setTimeout(function () {
      try {
        MALHA3D = BW3DFoto.gerar({ frente: f.img, lado: (ARQ[P.foto.ladoId] || {}).img, costas: (ARQ[P.foto.costasId] || {}).img },
          { res: +P.foto.res, alturaM: +P.foto.alturaM, espessura: +P.foto.espessura, suave: +P.foto.suave, nome: P.nome || "Foto 3D" });
        P.cam.auto = true; P.cam.zoom = 1; painel(); ver(0); guardar();
        aviso("✓ 3D pronto: " + MALHA3D.info.faces.toLocaleString("pt-BR") + " polígonos em " + (MALHA3D.info.ms / 1000).toFixed(1) + " s.");
      } catch (e) { aviso("Não deu para montar: " + (e.message || e), true); var b2 = $("d3Montar"); if (b2) b2.disabled = false; }
    }, 70);
  }

  /* ---------- levar para o Blender: GLB e OBJ ---------- */
  function limpoNome() { return ((P.nome || "bw-3d") + "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "bw-3d"; }
  function baixar(blob, nome) {
    var u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = nome; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
    try { var fl = new File([blob], nome, { type: blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [fl] })) setTimeout(function () { navigator.share({ files: [fl], title: nome }).catch(function () {}); }, 400);
    } catch (e) {}
  }
  function malhasDaCena() { return montar(0, 1000, 1000).cena.objs.filter(function (o) { return o.tipo === "malha" && o.verts && o.verts.length; }); }
  function exportar3D(tipo) {
    try {
      var objs = malhasDaCena();
      if (!objs.length) return aviso("Este modo ainda não tem malha 3D para exportar.", true);
      var nome = limpoNome();
      if (tipo === "glb") {
        var buf = B.paraGLB(objs, nome);
        baixar(new Blob([buf], { type: "model/gltf-binary" }), nome + ".glb");
        aviso("✓ " + nome + ".glb salvo (" + (buf.byteLength / 1048576).toFixed(1) + " MB). No Blender: Arquivo → Importar → glTF 2.0.");
      } else {
        var r = B.paraOBJ(objs, nome), arqs = [{ nome: r.nome + ".obj", dados: r.obj }];
        if (r.mtl) arqs.push({ nome: r.nome + ".mtl", dados: r.mtl });
        baixar(B.zip(arqs), r.nome + "-obj.zip");
        aviso("✓ OBJ + MTL em .zip · " + r.triangulos.toLocaleString("pt-BR") + " triângulos.");
      }
    } catch (e) { aviso("Não deu para exportar: " + (e.message || e), true); }
  }

  /* ---------- exportar: vídeo, PNG e planta ---------- */
  var FORCA = "";
  function tamanhoExp() {
    var e = P.exportar;
    if (e.formato === "telao" && P.modo === "palco") { var f = fichaLED(); return [f.px[0], f.px[1]]; }
    if (e.formato === "livre") return [Math.max(80, Math.round(e.w / 2) * 2), Math.max(80, Math.round(e.h / 2) * 2)];
    var t = FORMATOS[e.formato] || FORMATOS["9:16"]; return [t[0], t[1]];
  }
  function folhaExportar() {
    tocar(false);
    var e = P.exportar, t = tamanhoExp(), lista = Object.keys(FORMATOS).map(function (k) { return [k, { "9:16": "Vertical 9:16 (Reels)", "16:9": "Deitado 16:9", "1:1": "Quadrado", "4:5": "Feed 4:5", "4k-v": "4K vertical", "4k-h": "4K deitado" }[k]]; });
    if (P.modo === "palco") lista.unshift(["telao", "Tamanho do telão (px)"]);
    lista.push(["livre", "Tamanho livre (telão, painel…)"]);
    var h = "";
    h += campo("Formato", '<select class="d3-sel" id="d3Fmt">' + op(lista, e.formato) + "</select>");
    h += '<div class="d3-l2" id="d3Livre"' + (e.formato === "livre" ? "" : " hidden") + ">" + campo("Largura (px)", '<input type="number" class="d3-in" id="d3W" value="' + e.w + '" min="80" max="4096">') + campo("Altura (px)", '<input type="number" class="d3-in" id="d3H" value="' + e.h + '" min="80" max="4096">') + "</div>";
    h += '<div class="d3-l2">' + campo("Duração (s)", '<input type="number" class="d3-in" id="d3Dur" value="' + (e.dur || P.giro.seg) + '" min="2" max="60">') + campo("Qualidade", '<select class="d3-sel" id="d3Qual"></select>') + "</div>";
    h += campo("Fundo do vídeo", '<select class="d3-sel" id="d3ExpFundo">' + op([["", "O fundo do projeto"], ["verde", "Verde (chroma key)"], ["azul", "Azul (chroma key)"], ["magenta", "Magenta (chroma key)"]], P.fundo.tipo === "nenhum" ? "verde" : "") + "</select>");
    h += '<p class="d3-nota" id="d3ExpNota" style="margin:4px 0 0"></p>';
    h += '<div class="d3-fx" style="margin-top:10px"><button class="d3-bt pri" id="d3Gerar" type="button">🎬 GERAR O VÍDEO</button><button class="d3-bt" id="d3Parar" type="button" hidden>PARAR</button></div>';
    h += '<div class="d3-prog" id="d3Prog" hidden><progress id="d3Barra" max="100" value="0"></progress><p class="d3-nota" id="d3ProgTxt" style="margin:4px 0 0"></p></div>';
    h += '<div id="d3Pronto" hidden style="margin-top:10px"><video id="d3Video" controls playsinline></video><div class="d3-fx" style="margin-top:8px"><a class="d3-bt pri" id="d3Baixar" download>⬇ SALVAR O VÍDEO</a><button class="d3-bt" id="d3Compart" type="button">↗ COMPARTILHAR</button></div></div>';
    $("d3FolhaTit").textContent = "GERAR VÍDEO (" + t[0] + " × " + t[1] + " px)";
    $("d3FolhaCorpo").innerHTML = h; $("d3Folha").hidden = false;
    function nota() {
      var tt = tamanhoExp(), msg = "Vídeo de " + tt[0] + " × " + tt[1] + " px feito aqui no aparelho.";
      if (P.fundo.tipo === "nenhum" && !$("d3ExpFundo").value) msg += " ⚠ o vídeo não guarda transparência: escolha verde, azul ou magenta (ou use SALVAR PNG).";
      $("d3ProgTxt") && ($("d3ProgTxt").textContent = "");
      $("d3ExpNota").textContent = msg; $("d3FolhaTit").textContent = "GERAR VÍDEO (" + tt[0] + " × " + tt[1] + " px)";
    }
    async function quals() {
      var s = $("d3Qual"), tt = tamanhoExp(), alvos = [];
      [[720, "Rápida (720p)"], [1080, "Boa (1080p)"], [1440, "Alta"]].forEach(function (a) { if (a[0] < tt[1]) alvos.push(a); });
      alvos.push([tt[1], "Tamanho real"]);
      s.innerHTML = alvos.map(function (a) { return '<option value="' + a[0] + '">' + a[1] + " — " + Math.round(tt[0] * a[0] / tt[1] / 2) * 2 + "×" + a[0] + "</option>"; }).join("");
      var alvo = Math.min(e.qual || 1280, tt[1]), melhor = 0;
      for (var i = 0; i < s.options.length; i++) if (Math.abs(+s.options[i].value - alvo) < Math.abs(+s.options[melhor].value - alvo)) melhor = i;
      s.selectedIndex = melhor;
      if (window.BWReelsCelular && BWReelsCelular.cabe) for (var j = 0; j < s.options.length; j++) {
        var hh = +s.options[j].value, ww = Math.round(tt[0] * hh / tt[1] / 2) * 2;
        if (!(await BWReelsCelular.cabe(ww, hh))) { s.options[j].disabled = true; s.options[j].textContent += " — não cabe neste aparelho"; if (s.selectedIndex === j) s.selectedIndex = 0; }
      }
    }
    nota(); quals();
    $("d3Fmt").onchange = function () { P.exportar.formato = this.value; $("d3Livre").hidden = this.value !== "livre"; nota(); quals(); guardarTarde(); };
    $("d3W").onchange = $("d3H").onchange = function () { P.exportar.w = num($("d3W").value, 1080); P.exportar.h = num($("d3H").value, 1920); nota(); quals(); guardarTarde(); };
    $("d3Dur").onchange = function () { P.exportar.dur = num(this.value, 8); guardarTarde(); };
    $("d3Qual").onchange = function () { P.exportar.qual = num(this.value, 1280); guardarTarde(); };
    $("d3ExpFundo").onchange = nota;
    $("d3Gerar").onclick = gerar;
    $("d3Parar").onclick = function () { EXP.parar = true; };
  }
  async function gerar() {
    var t = tamanhoExp(), dur = Math.max(2, num($("d3Dur").value, 8)), qual = num($("d3Qual").value, 1280);
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) return aviso("Este navegador não grava vídeo sozinho. Use o Chrome, o Edge ou o Safari atualizado (no computador, o app BW).", true);
    FORCA = $("d3ExpFundo").value || "";
    EXP.parar = false; $("d3Prog").hidden = false; $("d3Pronto").hidden = true; $("d3Gerar").disabled = true; $("d3Parar").hidden = false;
    var giro = P.giro.liga, seg = P.giro.seg; P.giro.liga = true; P.giro.seg = dur;
    try {
      var res = await BWReelsCelular.gerar({ largura: t[0], altura: t[1], fps: 30, duracao: dur, alturaSaida: qual,
        desenhar: function (tt, ctx, w, h) { var c = montar(tt, w, h); if (FORCA) c.cena.fundo = { tipo: FORCA }; B.desenhar(ctx, c.cena, c.cam, w, h); },
        cancelar: function () { return EXP.parar; },
        aoProgredir: function (p) { $("d3Barra").value = p.pct; $("d3ProgTxt").textContent = p.etapa + "… " + p.pct + "%"; } });
      if (EXP.url) URL.revokeObjectURL(EXP.url);
      var nome = (P.nome || "bw-3d").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "bw-3d";
      EXP.arquivo = new File([res.blob], nome + ".mp4", { type: "video/mp4" }); EXP.url = URL.createObjectURL(res.blob);
      $("d3Video").src = EXP.url; $("d3Baixar").href = EXP.url; $("d3Baixar").download = nome + ".mp4"; $("d3Pronto").hidden = false;
      $("d3ProgTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + dur + " s).";
      $("d3Compart").onclick = function () {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [EXP.arquivo] })) navigator.share({ files: [EXP.arquivo], title: P.nome || "Vídeo 3D" }).catch(function () {});
        else aviso("Toque em SALVAR O VÍDEO e compartilhe da galeria.");
      };
    } catch (e) { $("d3ProgTxt").textContent = /cancelad/i.test(e.message || "") ? "Cancelado." : "Não deu certo: " + (e.message || e); }
    finally { P.giro.liga = giro; P.giro.seg = seg; FORCA = ""; $("d3Gerar").disabled = false; $("d3Parar").hidden = true; ver(TEMPO); }
  }
  function renderPara(w, h, t, fundoForcado) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"), s = montar(t || 0, w, h);
    if (fundoForcado) s.cena.fundo = { tipo: fundoForcado };
    B.desenhar(x, s.cena, s.cam, w, h); return c;
  }
  function salvarPNG() {
    var t = tamanhoExp(), lado = Math.min(2400, Math.max(t[0], 1200)), alt = Math.round(lado * t[1] / t[0]);
    var c = renderPara(lado, alt, TEMPO);
    c.toBlob(function (bl) {
      if (!bl) return aviso("Não deu para salvar o PNG.", true);
      var nome = ((P.nome || "bw-3d") + "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() + ".png", url = URL.createObjectURL(bl);
      var a = document.createElement("a"); a.href = url; a.download = nome; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      aviso("✓ PNG salvo" + (P.fundo.tipo === "nenhum" ? " com fundo transparente." : "."));
    }, "image/png");
  }
  function carregarPdf() {
    var um = function (u) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = u; s.onload = ok; s.onerror = function () { erro(new Error("sem internet para carregar o gerador de PDF")); }; document.head.appendChild(s); }); };
    if (window.pdfMake && window.pdfMake.vfs) return Promise.resolve();
    return um("https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js").then(function () { return um("https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js"); });
  }
  async function planta() {
    var f = fichaLED(), p = P.palco;
    try {
      aviso("Montando a planta…");
      await carregarPdf();
      var guardaCam = JSON.parse(JSON.stringify(P.cam)), guardaFundo = P.fundo.tipo;
      P.fundo.tipo = "claro"; P.cam.auto = true;
      P.cam.yaw = 0.62; P.cam.pitch = 0.3; var im1 = renderPara(1500, 950, 0).toDataURL("image/jpeg", 0.86);
      P.cam.yaw = 0; P.cam.pitch = 1.42; var im2 = renderPara(1500, 950, 0).toDataURL("image/jpeg", 0.86);
      P.cam = guardaCam; P.fundo.tipo = guardaFundo; ver(TEMPO);
      var hoje = new Date(), dd = ("0" + hoje.getDate()).slice(-2) + "/" + ("0" + (hoje.getMonth() + 1)).slice(-2) + "/" + hoje.getFullYear();
      var def = { pageSize: "A4", pageMargins: [34, 34, 34, 40], defaultStyle: { fontSize: 10, color: "#16202e" }, content: [
        { text: (P.nome || "Maquete de palco").toUpperCase(), fontSize: 16, bold: true, margin: [0, 0, 0, 2] },
        { text: "Maquete de palco e painel de LED · " + dd, fontSize: 9, color: "#5b6878", margin: [0, 0, 0, 10] },
        { table: { widths: ["*", "*"], body: [
          [{ text: "PAINEL DE LED", bold: true, fillColor: "#eef3ef" }, { text: "PALCO E ESTRUTURA", bold: true, fillColor: "#eef3ef" }],
          [{ stack: [
            "Painéis: " + f.paineis + " (" + p.cols + " × " + p.rows + ")",
            "Módulo: " + nm(p.modulo) + " × " + nm(p.moduloA),
            "Medida do painel: " + nm(f.L) + " × " + nm(f.A) + "  (" + (Math.round(f.m2 * 100) / 100).toLocaleString("pt-BR") + " m²)",
            "Pitch: " + (PITCHES.filter(function (x) { return x[0] === p.pitch; })[0] || ["", p.pitch + " mm"])[1] + " (" + p.pitch + " mm)",
            { text: "Resolução: " + f.px[0] + " × " + f.px[1] + " px", bold: true },
            "Cada módulo: " + f.pxModulo[0] + " × " + f.pxModulo[1] + " px",
            "Altura do chão até a base do painel: " + nm(p.ledChao) ] },
           { stack: [
            "Palco: " + nm(p.larg) + " (largura) × " + nm(p.prof) + " (profundidade) × " + nm(p.alt) + " (altura)",
            "Treliça em cima: " + (p.trelica ? "sim" : "não"),
            "Torres laterais: " + (p.torres ? "sim" : "não"),
            "Altura total com a treliça: " + nm(p.ledChao + f.A + 0.6),
            "Pessoas na maquete (escala 1,70 m): " + p.pessoas,
            "Câmeras: " + p.cameras ] }]] }, layout: "lightHorizontalLines", margin: [0, 0, 0, 12] },
        { text: "VISTA EM 3/4", fontSize: 9, bold: true, color: "#5b6878", margin: [0, 0, 0, 4] },
        { image: im1, width: 527, margin: [0, 0, 0, 10] },
        { text: "VISTA DE CIMA", fontSize: 9, bold: true, color: "#5b6878", margin: [0, 0, 0, 4] },
        { image: im2, width: 527 },
        { text: "Medidas aproximadas, para conferir no local. A resolução em pixels vem do pitch e do tamanho do módulo informados.", fontSize: 8, color: "#7b8694", margin: [0, 10, 0, 0] } ] };
      var buf = await new Promise(function (ok, erro) { try { window.pdfMake.createPdf(def).getBuffer(ok); } catch (e) { erro(e); } });
      var bl = new Blob([buf], { type: "application/pdf" }), nome = "maquete-" + (P.nome || "palco").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase() + ".pdf";
      var arq = new File([bl], nome, { type: "application/pdf" }), url = URL.createObjectURL(bl);
      var a = document.createElement("a"); a.href = url; a.download = nome; a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [arq] })) setTimeout(function () { navigator.share({ files: [arq], title: nome }).catch(function () {}); }, 300);
      aviso("✓ Planta em PDF pronta.");
    } catch (e) { aviso("Não deu para gerar a planta: " + (e.message || e), true); }
  }

  /* ---------- modos ---------- */
  var NOTAS = {
    plano: "Diga o que você quer fazer: o sistema olha a sua placa de vídeo e responde o que dá para fazer aqui, o que precisa de IA e de que tamanho de placa, e o que só sai na nuvem.",
    modelo: "Abra um modelo 3D (GLB, OBJ ou STL), gire, ilumine e gere o vídeo do giro — tudo no aparelho.",
    logo: "A sua logo em PNG vira relevo 3D com dourado, prata ou cromado. Fundo transparente = PNG com recorte; fundo verde = chroma key.",
    palco: "Monte o palco com medida real: painéis de LED de 0,5 m, treliça, pessoas de escala — e veja a RESOLUÇÃO EM PIXELS do telão para já criar a arte do tamanho certo.",
    foto: "Os seus planos em PNG com fundo transparente (frente, lado e costas) viram uma MALHA 3D de verdade aqui no aparelho — sem IA, sem crédito — e saem em GLB ou OBJ para o Blender.",
    ia: "Pedido pronto para a IA de 3D (Tripo, Meshy, Rodin, Hunyuan): você gera lá, traz o arquivo para cá e anima aqui. O site não chama nenhuma IA de 3D."
  };
  function trocarModo(m, primeira) {
    P.modo = m;
    [].forEach.call($("d3Modos").children, function (b) { b.classList.toggle("on", b.getAttribute("data-m") === m); });
    $("d3Nota").textContent = NOTAS[m] || "";
    if (!primeira) {
      P.cam.auto = true; P.cam.zoom = 1;
      if (m === "logo") { P.cam.pitch = 0.1; P.cam.yaw = 0.5; P.chao.mostrar = false; }
      if (m === "palco") { P.cam.pitch = 0.26; P.cam.yaw = 0.55; P.chao.mostrar = true; P.giro.seg = Math.max(P.giro.seg, 10); }
      if (m === "modelo" || m === "ia") { P.cam.pitch = 0.3; P.chao.mostrar = true; }
      if (m === "plano") { P.cam.pitch = 0.3; P.chao.mostrar = true; }
      if (m === "foto") { P.cam.pitch = 0.18; P.cam.yaw = 0.5; P.chao.mostrar = true; P.giro.seg = Math.max(P.giro.seg, 8); }
    }
    painel(); medir(); ver(primeira ? 0 : 0); guardar();
  }

  /* ---------- abas do celular ---------- */
  function aba(a) {
    $("d3Grade").setAttribute("data-aba", a);
    [].forEach.call($("d3AbasCel").children, function (b) { b.classList.toggle("on", b.getAttribute("data-aba") === a); });
    if (FIXA) FIXA.aplicar();
  }

  /* ---------- ferramentas e atalhos ---------- */
  function ferramentas() {
    if (!window.BWFerr) return;
    var el = document.createElement("div");
    el.id = "d3Ferr"; el.style.cssText = "position:absolute;left:8px;top:8px;z-index:4;max-width:60%";
    document.querySelector(".d3-palco").appendChild(el);
    var I = BWFerr.ICONES;
    BWFerr.barra({ el: el, alvos: [CV], atual: "v", ferramentas: [
      { id: "v", tecla: "V", nome: "Girar", icone: I.r, dica: "arraste para girar em volta" },
      { id: "h", tecla: "H", nome: "Mover", icone: I.h, dica: "arraste para deslocar o que está na tela" },
      { id: "z", tecla: "Z", nome: "Zoom", icone: I.z, dica: "clique para aproximar (Shift para afastar)" }] });
    BWFerr.atalhos({
      "espaco": function () { tocar(); }, "g": function () { P.giro.liga = !P.giro.liga; painel(); tocar(P.giro.liga); aviso(P.giro.liga ? "Girando sozinho." : "Giro parado."); },
      "r": function () { angulo("tres"); }, "=": function () { zoom(0.9); }, "-": function () { zoom(1.1); },
      "e": function () { folhaExportar(); }, "escape": function () { if (!$("d3Folha").hidden) { $("d3Folha").hidden = true; return; } return false; },
      "1": function () { angulo("frente"); }, "2": function () { angulo("tres"); }, "3": function () { angulo("lado"); }, "4": function () { angulo("cima"); } });
    BWFerr.ajuda("ATALHOS DO ESTÚDIO 3D", [["#", "FERRAMENTAS"], ["V", "girar em volta (arrastar)"], ["H", "mover"], ["Z", "zoom (Shift = afastar)"],
      ["#", "CÂMERA"], ["1 2 3 4", "frente · 3/4 · lado · de cima"], ["R", "voltar ao ângulo 3/4"], ["= / -", "aproximar / afastar"],
      ["#", "CENA"], ["Espaço", "girar / parar"], ["G", "ligar e desligar o giro automático"], ["E", "gerar vídeo"], ["Esc", "fechar"]]);
  }

  /* ---------- voltar o que estava guardado ---------- */
  async function recarregar() {
    var ids = [P.modelo.arqId, P.logo.imgId, P.palco.conteudoId].filter(Boolean);
    if (!ids.length) return;
    var todos = await por("arquivos", "getAll"); if (!todos || !todos.length) return;
    for (var i = 0; i < todos.length; i++) {
      var r = todos[i]; if (ids.indexOf(r.id) < 0) continue;
      try {
        if (r.tipo === "modelo" && r.blob && r.blob.arrayBuffer) {
          var buf = await r.blob.arrayBuffer(), m = B.lerArquivo(r.nome, buf);
          var a = { id: r.id, nome: r.nome, crus: m.verts.map(function (p) { return p.slice(); }), facesCruas: m.faces, verts: m.verts, faces: m.faces };
          a.medida = B.ajustar(a, P.modelo.alturaM); ARQ[r.id] = a;
        } else if (typeof r.blob === "string") { ARQ[r.id] = { id: r.id, nome: r.nome, img: await imgDe(r.blob), url: r.blob }; }
      } catch (e) { if (r.id === P.modelo.arqId) P.modelo.arqId = ""; else if (r.id === P.logo.imgId) P.logo.imgId = ""; else P.palco.conteudoId = ""; }
    }
  }

  /* ---------- começar ---------- */
  async function ligar() {
    CV = $("d3Cv");
    var salvo = null; try { salvo = JSON.parse(localStorage.getItem("ui_3d_atual") || "null"); } catch (e) {}
    P = salvo && salvo.v ? limpar(salvo) : novo("plano");
    var u = new URLSearchParams(location.search);
    if (u.get("modo") && NOTAS[u.get("modo")]) P.modo = u.get("modo");
    if (u.get("w") && u.get("h")) { P.exportar.formato = "livre"; P.exportar.w = num(u.get("w"), 1080); P.exportar.h = num(u.get("h"), 1920); }
    $("d3Nome").value = P.nome || "";
    medir(); orbitar(); ferramentas();
    try { await recarregar(); } catch (e) {}
    trocarModo(P.modo, true);
    if (window.BWFerr) FIXA = BWFerr.telaFixa({ wrap: document.querySelector(".wrap"), grade: $("d3Grade"), palco: document.querySelector(".d3-palco"),
      rola: [], some: [$("d3Nota")], aviso: $("d3Aviso"), aoMedir: function () { medir(); ver(TEMPO); } });
    [].forEach.call($("d3Modos").children, function (b) { b.onclick = function () { trocarModo(b.getAttribute("data-m")); }; });
    [].forEach.call($("d3AbasCel").children, function (b) { b.onclick = function () { aba(b.getAttribute("data-aba")); }; });
    $("d3Nome").addEventListener("input", function () { P.nome = this.value; guardarTarde(); });
    $("d3Zmais").onclick = function () { zoom(0.86); }; $("d3Zmenos").onclick = function () { zoom(1.16); };
    $("d3Giro").onclick = function () { tocar(); }; $("d3Reset").onclick = function () { angulo("tres"); };
    $("d3Ajuda").onclick = function () { if (window.BWFerr) BWFerr.mostrarAjuda(); };
    $("d3Fechar").onclick = function () { $("d3Folha").hidden = true; };
    $("d3Folha").addEventListener("click", function (e) { if (e.target === $("d3Folha")) $("d3Folha").hidden = true; });
    $("d3Arq").addEventListener("change", function () { if (this.files && this.files[0]) abrirModelo(this.files[0]); this.value = ""; });
    $("d3Img").addEventListener("change", function () { if (this.files && this.files[0]) abrirImagem(this.files[0], this.getAttribute("data-alvo")); this.value = ""; });
    addEventListener("resize", function () { medir(); ver(TEMPO); });
    DICA = $("d3Dica"); setTimeout(function () { if (DICA) { DICA.style.opacity = "0"; setTimeout(function () { if (DICA) DICA.hidden = true; }, 500); } }, 5200);
    tocar(!!P.giro.liga);
    ver(0);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar); else ligar();
})();
