/* MODELOS DO EDITOR DE VÍDEO (21/11/2026) — a pessoa ASSISTE o modelo e depois só troca os takes.
   Dois tipos: EDIÇÕES PRONTAS (aftermovie, reels, corporativo… com espaços "TAKE N", música da casa, cor e textos com movimento) e
   MODELOS COM A PESSOA (máscara com IA: texto atrás da pessoa, anel girando, fundo desfocado…). MEUS MODELOS = qualquer projeto vira modelo
   (fica neste aparelho; ⬇ baixa o .json para mandar à BW incluir na biblioteca de todos). Nada sai do aparelho.
   Biblioteca nova = um item a mais em EDICOES ou MASCARAS abaixo (estrutura: espaços com duração + textos com {CAMPOS}). */
(function () {
  "use strict";
  var V = function () { return window.__video; };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); }
  function uid() { return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var B = 60 / 112, Bc = 60 / 76;   /* batidas das bases da casa: "Base animada" 112 bpm · "Base calma" 76 bpm */
  function rep(n, d, extra) { var a = []; for (var i = 0; i < n; i++) a.push(Object.assign({dur: d}, extra || {})); return a; }
  /* espaço: {rot, dur, trans, vol (som do take; 0 = só a música), vel, efeito} · texto: {txt, ini, dur, tam, y, x, anima, frente, fundo, cor} */
  var EDICOES = [
    {id: "after30", nome: "AFTERMOVIE 30 s — BATIDA", tags: ["aftermovie", "reels"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#7C5CFF",
      desc: "Rajada de cortes na abertura, respiro, miolo no ritmo da música e encerramento com o nome do evento.",
      espacos: [].concat(rep(4, B / 2, {rot: "ABERTURA · detalhe"}), [{rot: "RESPIRO · ambiente", dur: B * 2, trans: "dissolver"}], rep(6, B, {rot: "PALCO · plateia"}), [{rot: "VIRADA", dur: B * 2, trans: "branco"}], rep(34, B, {rot: "MOMENTOS"}), rep(4, B / 2, {rot: "RAJADA"}), [{rot: "ENCERRAMENTO · logo ou arte", dur: B * 6, trans: "dissolver"}]),
      textos: [{txt: "{EVENTO}", ini: B * 2.2, dur: B * 3.2, tam: 11, y: 0, anima: "zoom"}, {txt: "{DATA} · {LOCAL}", ini: -B * 5, dur: B * 5, tam: 4.6, y: 32, anima: "subir", fundo: "#000000"}]},
    {id: "after60", nome: "AFTERMOVIE 60 s — COMPLETO", tags: ["aftermovie", "corporativo"], fmt: "9:16", musica: "Base animada", look: "natural", cor: "#B14DFF",
      desc: "Abertura rápida, palestrantes, plateia, networking e encerramento — a estrutura clássica de evento corporativo.",
      espacos: [].concat(rep(6, B / 2, {rot: "ABERTURA"}), [{rot: "CHEGADA · credenciamento", dur: B * 3, trans: "dissolver"}], rep(10, B * 3, {rot: "PALESTRANTE", trans: "dissolver"}), rep(22, B * 1.5, {rot: "PLATEIA · reações"}), rep(12, B * 2, {rot: "NETWORKING · coffee", trans: "dissolver"}), rep(4, B / 2, {rot: "RAJADA"}), [{rot: "ENCERRAMENTO", dur: B * 8, trans: "preto"}]),
      textos: [{txt: "{EVENTO}", ini: B * 4, dur: B * 4, tam: 10, y: -8, anima: "zoom"}, {txt: "PALESTRAS", ini: B * 7, dur: B * 3, tam: 7, y: 30, anima: "subir"}, {txt: "NETWORKING", ini: B * 66, dur: B * 3, tam: 7, y: 30, anima: "subir"}, {txt: "{DATA} · {LOCAL}", ini: -B * 7, dur: B * 7, tam: 4.6, y: 32, anima: "subir", fundo: "#000000"}]},
    {id: "corp45", nome: "CORPORATIVO ELEGANTE 40 s", tags: ["corporativo", "telão"], fmt: "16:9", musica: "Base calma", look: "natural", cor: "#4C8DFF",
      desc: "Ritmo calmo, cortes longos com dissolver e nome do evento com caixa — bom para telão, LinkedIn e YouTube.",
      espacos: [].concat([{rot: "ABERTURA · fachada ou palco", dur: Bc * 4, trans: "dissolver"}], rep(14, Bc * 3, {rot: "MOMENTOS", trans: "dissolver"}), [{rot: "ENCERRAMENTO · logo", dur: Bc * 6, trans: "dissolver"}]),
      textos: [{txt: "{EVENTO}", ini: Bc * 1, dur: Bc * 5, tam: 8, y: 26, fundo: "#000000", anima: "subir"}, {txt: "{CLIENTE}", ini: -Bc * 5, dur: Bc * 5, tam: 7, y: 0, anima: "zoom"}]},
    {id: "reels15", nome: "REELS CURTO — GANCHO", tags: ["reels"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#FF5C8A",
      desc: "Gancho forte no 1º segundo, cortes rápidos e chamada para ação no fim. Para divulgar o evento depois.",
      espacos: [].concat([{rot: "GANCHO · o melhor take", dur: B * 5}], rep(24, B / 2, {rot: "CORTES RÁPIDOS"}), [{rot: "FINAL · chamada", dur: B * 8, trans: "branco"}]),
      textos: [{txt: "{GANCHO}", ini: 0.1, dur: B * 4.8, tam: 8, y: -20, anima: "zoom", fundo: "#000000"}, {txt: "{CHAMADA}", ini: -B * 8, dur: B * 8, tam: 6.5, y: 22, anima: "pulsar", fundo: "#FFB547", cor: "#111111"}]},
    {id: "casamento40", nome: "CASAMENTO SUAVE 40 s", tags: ["casamento", "reels"], fmt: "9:16", musica: "Base calma", look: "quente", cor: "#F5A524",
      desc: "Dissolvências lentas, cor quente e o nome do casal em letra elegante.",
      espacos: [].concat([{rot: "DETALHES · alianças", dur: Bc * 4, trans: "dissolver"}], rep(10, Bc * 4, {rot: "MOMENTOS", trans: "dissolver"}), [{rot: "FINAL · casal", dur: Bc * 6, trans: "dissolver"}]),
      textos: [{txt: "{NOIVOS}", ini: Bc * 1, dur: Bc * 6, tam: 9, y: 0, anima: "zoom", fonte: "Playfair Display"}, {txt: "{DATA}", ini: -Bc * 5, dur: Bc * 5, tam: 5, y: 26, anima: "subir"}]},
    {id: "show20", nome: "SHOW / FESTA — ENERGIA", tags: ["show", "reels", "aftermovie"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#12B76A",
      desc: "Muitos cortes de meia batida, flash branco nas viradas e a atração pulsando na tela.",
      espacos: [].concat(rep(8, B / 2, {rot: "PALCO · luzes"}), [{rot: "VIRADA", dur: B, trans: "branco"}], rep(32, B / 2, {rot: "PÚBLICO · dança"}), [{rot: "VIRADA", dur: B, trans: "branco"}], rep(8, B / 2, {rot: "PALCO"}), [{rot: "FINAL", dur: B * 4, trans: "preto"}]),
      textos: [{txt: "{ATRAÇÃO}", ini: B * 4, dur: B * 5, tam: 12, y: 0, anima: "pulsar"}, {txt: "{DATA}", ini: -B * 4, dur: B * 4, tam: 6, y: 28, anima: "zoom"}]},
    {id: "contagem10", nome: "CONTAGEM REGRESSIVA", tags: ["reels", "chamada"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#22B8CF",
      desc: "3, 2, 1 com zoom em cima dos takes e o nome do evento no fim. Bom para \"é hoje!\".",
      espacos: [{rot: "TAKE do 3", dur: B * 2}, {rot: "TAKE do 2", dur: B * 2, trans: "branco"}, {rot: "TAKE do 1", dur: B * 2, trans: "branco"}, {rot: "FINAL", dur: B * 8, trans: "zoom"}],
      textos: [{txt: "3", ini: 0, dur: B * 2, tam: 30, y: 0, anima: "zoom"}, {txt: "2", ini: B * 2, dur: B * 2, tam: 30, y: 0, anima: "zoom"}, {txt: "1", ini: B * 4, dur: B * 2, tam: 30, y: 0, anima: "zoom"}, {txt: "{EVENTO}", ini: B * 6, dur: B * 8, tam: 10, y: 0, anima: "zoom"}, {txt: "{CHAMADA}", ini: B * 9, dur: B * 5, tam: 5, y: 26, anima: "subir", fundo: "#000000"}]},
    {id: "antesdepois", nome: "ANTES E DEPOIS DA MONTAGEM", tags: ["montagem", "reels"], fmt: "9:16", musica: "Base calma", look: "natural", cor: "#FFB547",
      desc: "O espaço vazio vira o evento montado com uma cortina. Grave os dois do mesmo lugar.",
      espacos: [{rot: "ANTES · espaço vazio", dur: Bc * 4}, {rot: "DEPOIS · montado", dur: Bc * 4, trans: "cortina"}, {rot: "DETALHE", dur: Bc * 3, trans: "dissolver"}, {rot: "FINAL", dur: Bc * 4, trans: "dissolver"}],
      textos: [{txt: "ANTES", ini: 0.2, dur: Bc * 3.6, tam: 9, y: -30, fundo: "#000000"}, {txt: "DEPOIS", ini: Bc * 4.4, dur: Bc * 3.4, tam: 9, y: -30, fundo: "#FFB547", cor: "#111111"}, {txt: "{EVENTO}", ini: -Bc * 4, dur: Bc * 4, tam: 8, y: 0, anima: "zoom"}]},
    {id: "depoimento30", nome: "DEPOIMENTO + MOMENTOS 30 s", tags: ["corporativo", "depoimento"], fmt: "9:16", musica: "Base calma", volMusica: 35, look: "natural", cor: "#7C5CFF",
      desc: "Um depoimento com o som da pessoa e os melhores momentos do evento por baixo da música.",
      espacos: [].concat([{rot: "DEPOIMENTO · pessoa falando", dur: 9, vol: 100}], rep(11, Bc * 2, {rot: "MOMENTOS", trans: "dissolver"}), [{rot: "FINAL", dur: Bc * 4, trans: "dissolver"}]),
      textos: [{txt: "{NOME}\n{CARGO}", ini: 0.6, dur: 4, tam: 4.4, y: 30, fundo: "#000000", anima: "subir"}, {txt: "{EVENTO}", ini: -Bc * 4, dur: Bc * 4, tam: 8, y: 0, anima: "zoom"}]},
    {id: "top3", nome: "TOP 3 DO EVENTO", tags: ["reels", "lista"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#FF6B6B",
      desc: "Os três melhores momentos, um por vez, com o número grande entrando.",
      espacos: [{rot: "ABERTURA", dur: B * 4}, {rot: "MOMENTO 3", dur: B * 5, trans: "empurrar"}, {rot: "MOMENTO 2", dur: B * 5, trans: "empurrar"}, {rot: "MOMENTO 1", dur: B * 6, trans: "empurrar"}, {rot: "FINAL", dur: B * 4, trans: "branco"}],
      textos: [{txt: "TOP 3 DO\n{EVENTO}", ini: 0.1, dur: B * 3.8, tam: 9, y: 0, anima: "zoom"}, {txt: "3", ini: B * 4.2, dur: B * 2.5, tam: 22, y: -22, anima: "zoom"}, {txt: "2", ini: B * 9.2, dur: B * 2.5, tam: 22, y: -22, anima: "zoom"}, {txt: "1", ini: B * 14.2, dur: B * 2.5, tam: 22, y: -22, anima: "zoom"}]},
    {id: "telao20", nome: "TELÃO — ABERTURA DE EVENTO", tags: ["telão", "corporativo"], fmt: "16:9", musica: "Base animada", look: "cinema", cor: "#4C8DFF",
      desc: "Para abrir o evento no LED: takes curtos, letreiro passando e o nome grande no fim.",
      espacos: [].concat(rep(12, B, {rot: "AMBIENTE · detalhes"}), [{rot: "VIRADA", dur: B * 2, trans: "branco"}], rep(12, B, {rot: "PALCO · telão"}), [{rot: "FINAL · logo", dur: B * 8, trans: "dissolver"}]),
      textos: [{txt: "BEM-VINDOS · {EVENTO} · ", ini: B * 1, dur: B * 12, tam: 9, y: 28, anima: "letreiro"}, {txt: "{EVENTO}", ini: -B * 7, dur: B * 7, tam: 12, y: 0, anima: "zoom"}]},
    {id: "abertura-pessoa", nome: "ABERTURA COM O NOME ATRÁS DA PESSOA", tags: ["pessoa", "reels", "aftermovie"], fmt: "9:16", musica: "Base animada", look: "vivido", cor: "#B14DFF", pessoa: true,
      desc: "Use um take com uma pessoa em pé: o nome do evento sobe por trás dela (o app analisa a pessoa sozinho).",
      espacos: [].concat([{rot: "PESSOA EM PÉ · centro da tela", dur: B * 8, ia: {frente: true}, vol: 0}], rep(8, B, {rot: "MOMENTOS"}), [{rot: "FINAL", dur: B * 4, trans: "branco"}]),
      textos: [{txt: "{EVENTO}", ini: B * 0.5, dur: B * 7.5, tam: 15, y: -14, anima: "subir"}]}
  ];
  /* modelos com a PESSOA (máscara com IA): aplicados no take escolhido */
  var MASCARAS = [
    {id: "texto-atras", nome: "TEXTO GIGANTE ATRÁS", desc: "Uma palavra enorme entre o fundo e a pessoa.", cor: "#7C5CFF", ia: {frente: true}, textos: [{txt: "{TEXTO}", tam: 22, y: -16, anima: "zoom"}], padrao: "EVENTO"},
    {id: "anel", nome: "ANEL DE TEXTO GIRANDO", desc: "O texto dá a volta: passa atrás da pessoa e volta pela frente.", cor: "#B14DFF", ia: {frente: true}, textos: [{txt: "{TEXTO}", tam: 5.5, y: -2, anima: "anel", raio: 34}], padrao: "BW AUDIOVISUAL"},
    {id: "sobe-ombros", nome: "TÍTULO SOBE POR TRÁS", desc: "O título nasce atrás dos ombros e sobe.", cor: "#22B8CF", ia: {frente: true}, textos: [{txt: "{TEXTO}", tam: 13, y: -12, anima: "subir"}], padrao: "BEM-VINDOS"},
    {id: "letreiro-atras", nome: "LETREIRO PASSANDO ATRÁS", desc: "Uma faixa de texto corre atrás da pessoa.", cor: "#12B76A", ia: {frente: true}, textos: [{txt: "{TEXTO} · {TEXTO} · ", tam: 14, y: -6, anima: "letreiro"}], padrao: "AFTERMOVIE"},
    {id: "contorno", nome: "CONTORNO DE LUZ + TEXTO", desc: "A pessoa ganha um contorno brilhante e o texto fica atrás.", cor: "#FF5C8A", ia: {frente: true, contorno: true, contornoCor: "#7C5CFF"}, textos: [{txt: "{TEXTO}", tam: 18, y: -14, anima: "pulsar"}], padrao: "SHOW"},
    {id: "fundo-desfocado", nome: "FUNDO DESFOCADO", desc: "A pessoa nítida e o fundo desfocado, como lente aberta.", cor: "#4C8DFF", ia: {fundo: "desfoque"}, textos: []},
    {id: "cor-pessoa", nome: "COR SÓ NA PESSOA", desc: "O fundo fica preto e branco e a pessoa colorida.", cor: "#F5A524", ia: {fundo: "pb"}, textos: []},
    {id: "fundo-escuro-nome", nome: "FUNDO ESCURO + NOME", desc: "Fundo escurecido e o nome da pessoa atrás dela.", cor: "#FFB547", ia: {fundo: "escuro", frente: true}, textos: [{txt: "{TEXTO}", tam: 16, y: -18, anima: "subir"}], padrao: "NOME"},
    {id: "sem-fundo", nome: "PESSOA SEM FUNDO", desc: "Tira o fundo: ponha o take na SOBREPOSIÇÃO e outro vídeo embaixo.", cor: "#12B76A", ia: {fundo: "sem"}, textos: [], sobrepor: true}
  ];
  var CAMPOS_NOME = {EVENTO: "Nome do evento", DATA: "Data", LOCAL: "Local", CLIENTE: "Cliente / empresa", GANCHO: "Frase do gancho", CHAMADA: "Chamada final", NOIVOS: "Nome do casal", ATRAÇÃO: "Atração / artista", NOME: "Nome da pessoa", CARGO: "Cargo", TEXTO: "Texto"};
  var CAMPOS_PADRAO = {EVENTO: "NOME DO EVENTO", DATA: "21 DE NOVEMBRO", LOCAL: "BELO HORIZONTE", CLIENTE: "SUA EMPRESA", GANCHO: "OLHA O QUE FOI ESSE EVENTO", CHAMADA: "SIGA PARA VER MAIS", NOIVOS: "ANA & LUCAS", ATRAÇÃO: "ATRAÇÃO", NOME: "NOME DA PESSOA", CARGO: "CARGO", TEXTO: "SEU TEXTO"};
  var FMT = {"9:16": [720, 1280], "16:9": [1280, 720], "1:1": [1080, 1080], "4:5": [864, 1080]};
  function campos(tpl) { var s = {}; JSON.stringify(tpl.textos || []).replace(/\{([A-ZÇÃÕÉÍ]+)\}/g, function (_, k) { s[k] = 1; }); return Object.keys(s); }
  function preencher(txt, v) { return String(txt).replace(/\{([A-ZÇÃÕÉÍ]+)\}/g, function (_, k) { return v && v[k] != null && v[k] !== "" ? v[k] : CAMPOS_PADRAO[k] || k; }); }
  function totalDe(tpl) { var t = 0; (tpl.espacos || []).forEach(function (e) { t += e.dur; }); return Math.round(t * 100) / 100; }
  function meus() { try { var l = JSON.parse(localStorage.getItem("ui_ve_modelos_meus") || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function guardarMeus(l) { try { localStorage.setItem("ui_ve_modelos_meus", JSON.stringify(l.slice(0, 40))); } catch (e) {} }
  function acharModelo(id) { return EDICOES.concat(meus()).filter(function (t) { return t.id === id; })[0] || null; }

  /* ---------- espaços (placeholders): imagem gerada no aparelho, refeita sempre que faltar ---------- */
  var CORES = ["#7C5CFF", "#22B8CF", "#FF5C8A", "#12B76A", "#F5A524", "#4C8DFF", "#B14DFF", "#FF6B6B"];
  function imagemEspaco(n, rot, fmt, cor) { var f = FMT[fmt] || FMT["9:16"], c = document.createElement("canvas"); c.width = Math.round(f[0] / 2); c.height = Math.round(f[1] / 2); var x = c.getContext("2d"), W = c.width, H = c.height;
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, "#0b0e14"); g.addColorStop(1, cor || CORES[n % CORES.length]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.strokeStyle = "rgba(255,255,255,.25)"; x.lineWidth = Math.max(2, W / 120); x.setLineDash([W / 30, W / 40]); x.strokeRect(W * 0.06, H * 0.06, W * 0.88, H * 0.88); x.setLineDash([]);
    x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; var px = Math.min(W, H) * 0.16; x.font = "800 " + px + "px Inter, system-ui, sans-serif"; x.fillText("TAKE " + n, W / 2, H * 0.44);
    x.font = "700 " + px * 0.32 + "px Inter, system-ui, sans-serif"; x.fillStyle = "rgba(255,255,255,.85)"; x.fillText(String(rot || "").toUpperCase(), W / 2, H * 0.44 + px * 0.9);
    x.font = "600 " + px * 0.24 + "px Inter, system-ui, sans-serif"; x.fillStyle = "rgba(255,255,255,.6)"; x.fillText("toque aqui e depois num vídeo seu", W / 2, H * 0.44 + px * 1.5);
    return new Promise(function (ok) { c.toBlob(function (b) { ok(b); }, "image/jpeg", 0.86); }); }
  async function midiaEspaco(n, rot, fmt, cor) { var id = "ph-" + fmt.replace(":", "x") + "-" + n + "-" + String(rot || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) + "-" + (cor || "").replace("#", "");
    var M = V().MID; if (M[id]) return M[id]; var m = await V().porMidia(await imagemEspaco(n, rot, fmt, cor), "Espaço " + n + " — " + rot, "imagem", id, 4); m.ph = true; return m; }
  async function musica(nome, dur) { var id = "som-modelo-" + nome.toLowerCase().replace(/\s+/g, "-") + "-" + Math.ceil(dur); var M = V().MID; if (M[id]) return M[id];
    var m = await V().porMidia(await V().sintetizar(nome, Math.ceil(dur) + 1), nome + " (modelo)", "audio", id, Math.ceil(dur) + 1); m.som = "trilha"; return m; }
  /* abrir o editor com um projeto de modelo: espaços primeiro, refeitos se faltarem (o arquivo de espaço não é guardado, é refeito) */
  async function garantir(P) { var M = V().MID, faltou = false;
    for (var i = 0; i < P.clips.length; i++) { var c = P.clips[i];
      if (c.ph && !M[c.mid]) { var m = await midiaEspaco(c.ph, c.rot, P.fmt, c.phCor); c.mid = m.id; faltou = true; }
      if (c.tipo === "audio" && !M[c.mid] && /^som-modelo-/.test(c.mid)) { var nm = /calma/.test(c.mid) ? "Base calma" : "Base animada", ma = await musica(nm, P.clips.reduce(function (a, x) { return Math.max(a, x.ini + x.dur); }, 0)); c.mid = ma.id; faltou = true; } }
    return faltou; }

  /* ---------- montar o projeto do modelo ---------- */
  async function montar(tpl, valores) {
    var t = 0, clips = [], total = totalDe(tpl), lk = tpl.look && window.BWCor && BWCor.LOOKS[tpl.look] ? BWCor.LOOKS[tpl.look].g : null;
    for (var i = 0; i < tpl.espacos.length; i++) { var e = tpl.espacos[i], n = i + 1, cor = e.cor || tpl.cor || CORES[i % CORES.length], m = await midiaEspaco(n, e.rot || "TAKE", tpl.fmt || "9:16", cor);
      clips.push({id: uid(), trilha: "v1", tipo: "imagem", mid: m.id, ini: Math.round(t * 100) / 100, dur: Math.round(e.dur * 100) / 100, corte: 0, vel: 1, vol: 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: i === tpl.espacos.length - 1 ? Math.min(0.8, e.dur / 3) : 0,
        encaixe: "cobrir", trans: e.trans ? {tipo: e.trans, dur: Math.min(0.5, e.dur * 0.6)} : null, efeito: e.efeito || "", grade: lk ? JSON.parse(JSON.stringify(lk)) : undefined, look: tpl.look || "",
        ph: n, rot: e.rot || "", phCor: cor, volModelo: e.vol == null ? 0 : e.vol, velModelo: e.vel || 1, ia: e.ia ? JSON.parse(JSON.stringify(e.ia)) : undefined});
      t += e.dur; }
    (tpl.textos || []).forEach(function (x) { var ini = x.ini < 0 ? total + x.ini : x.ini;
      clips.push({id: uid(), trilha: "tx", tipo: "texto", ini: Math.round(Math.max(0, ini) * 100) / 100, dur: Math.round(Math.min(x.dur, total - Math.max(0, ini)) * 100) / 100, txt: preencher(x.txt, valores), molde: x.txt, fonte: x.fonte || "Montserrat", tam: x.tam || 6, cor: x.cor || "#ffffff", fundo: x.fundo || "",
        x: x.x || 0, y: x.y || 0, op: 100, fin: x.anima ? 0.05 : 0.25, fout: 0.25, anima: x.anima || "", frente: !!x.frente, raio: x.raio, velAnel: x.velAnel}); });
    if (tpl.musica) { var ms = await musica(tpl.musica, total); clips.push({id: uid(), trilha: "a1", tipo: "audio", mid: ms.id, ini: 0, dur: Math.round(total * 100) / 100, corte: 0, vel: 1, vol: tpl.volMusica || 100, op: 100, esc: 100, x: 0, y: 0, fin: 0, fout: Math.min(2, total / 6), phMusica: true}); }
    return {fmt: tpl.fmt || "9:16", clips: clips, modelo: {id: tpl.id, nome: tpl.nome, meu: !!tpl.meu}, campos: valores || {}};
  }
  async function usar(tpl, valores, tocar) {
    var v = V(); if (!v) return; var P0 = v.P();
    if (P0.clips.length && (!P0.modelo || P0.clips.some(function (c) { return !c.ph && c.tipo !== "texto" && !c.phMusica; }))) await v.backup();   /* guarda o projeto de verdade, não uma prévia de modelo */
    var np = await montar(tpl, valores); v.trocarProjeto(np); v.desenharLib(); fechar(); faixa();
    v.aviso("🎬 Modelo “" + tpl.nome + "” aberto. Toque num TAKE da linha do tempo e depois num vídeo seu — ou ⚡ PREENCHER SOZINHO.");
    var prim = np.clips.filter(function (c) { return c.ph; })[0]; if (prim && !tocar) window.__video.sel(prim.id);
    if (tocar) { v.irPara(0); setTimeout(function () { v.tocar(); }, 300); }
  }
  /* aplicar um modelo COM A PESSOA no take escolhido */
  async function aplicarMascara(tm, valor) {
    var v = V(), c = v.takeAlvo ? v.takeAlvo() : v.selAtual(); if (!c || (c.tipo !== "video" && c.tipo !== "imagem")) { v.aviso("Ponha primeiro um TAKE de vídeo ou foto com uma pessoa na linha do tempo.", true); return false; }
    c.ia = Object.assign({}, c.ia || {}, JSON.parse(JSON.stringify(tm.ia || {})));
    if (tm.sobrepor && c.trilha === "v1") c.trilha = "v2";
    (tm.textos || []).forEach(function (x) { v.P().clips.push({id: uid(), trilha: "tx", tipo: "texto", ini: c.ini, dur: Math.max(0.5, Math.min(c.dur, 8)), txt: preencher(x.txt, {TEXTO: valor || tm.padrao}), molde: x.txt, fonte: x.fonte || "Montserrat", tam: x.tam || 8, cor: x.cor || "#ffffff", fundo: x.fundo || "",
      x: x.x || 0, y: x.y || 0, op: 100, fin: 0.05, fout: 0.25, anima: x.anima || "", frente: !!x.frente, raio: x.raio, velAnel: x.velAnel}); });
    fechar(); v.tudo();
    if (!window.BWMascara || !BWMascara.tem(c.mid)) { v.aviso("✨ Modelo “" + tm.nome + "” aplicado. Analisando a pessoa no take…"); v.analisarPessoa(c.id); }
    else v.aviso("✨ Modelo “" + tm.nome + "” aplicado neste take."); v.irPara(c.ini + 0.05); return true;
  }

  /* ---------- prévia animada de cada cartão (desenhada no aparelho) ---------- */
  function pessoa(x, W, H, cor) { x.save(); x.fillStyle = cor || "#e9d6c4"; x.beginPath(); x.arc(W / 2, H * 0.36, W * 0.11, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(W * 0.24, H); x.quadraticCurveTo(W * 0.27, H * 0.5, W / 2, H * 0.49); x.quadraticCurveTo(W * 0.73, H * 0.5, W * 0.76, H); x.fill(); x.restore(); }
  function textoMini(x, tx, t, W, H, parte) { var rel = t - tx.ini, px = H * (tx.tam || 6) / 100, cy = H / 2 + (tx.y || 0) / 100 * H, cxm = W / 2 + (tx.x || 0) / 100 * W, k = 1, dy = 0, dx = 0, s = preencher(tx.txt, {});
    x.save(); x.textAlign = "center"; x.textBaseline = "middle"; x.font = "800 " + px + "px Inter, system-ui, sans-serif"; x.fillStyle = tx.cor || "#fff";
    if (tx.anima === "anel") { var rx = W * (tx.raio || 34) / 100, ry = rx * 0.26, base = s + " • ", n = Math.max(8, Math.round(Math.PI * (rx + ry) * 1.1 / Math.max(1, x.measureText(base).width / base.length))), str = ""; while (str.length < n) str += base; str = str.slice(0, n);
      for (var i = 0; i < n; i++) { var th = Math.PI / 2 + rel * 0.9 - i * Math.PI * 2 / n, sn = Math.sin(th); if (parte === "tras" ? sn > 0 : sn <= 0) continue; x.save(); x.translate(cxm + rx * Math.cos(th), cy + ry * sn); x.scale(Math.max(0.2, Math.abs(sn)) * (sn < 0 ? -1 : 1), 1); x.globalAlpha = sn < 0 ? 0.7 : 1; x.fillText(str[i], 0, 0); x.restore(); }
      x.restore(); return; }
    if (tx.anima === "subir") dy = (1 - Math.min(1, rel / 0.9)) * H * 0.3; else if (tx.anima === "zoom") k = 0.6 + 0.4 * Math.min(1, rel / 0.7); else if (tx.anima === "pulsar") k = 1 + 0.07 * Math.sin(rel * 6.5);
    else if (tx.anima === "letreiro") { var lw = Math.max(x.measureText(s).width, W * 0.5); dx = (W / 2 + lw / 2) - (W + lw) * lim(rel / Math.max(0.5, tx.dur), 0, 1) - (cxm - W / 2); }
    if (tx.anima !== "letreiro") { var lw3 = Math.max.apply(0, s.split("\n").map(function (l) { return x.measureText(l).width; })); if (lw3 > W * 0.92) k *= W * 0.92 / lw3; }
    x.translate(cxm + dx, cy + dy); x.scale(k, k);
    if (tx.fundo) { var lw2 = x.measureText(s.split("\n")[0]).width; x.fillStyle = tx.fundo; x.fillRect(-lw2 / 2 - px * 0.3, -px * 0.7, lw2 + px * 0.6, px * 1.4); x.fillStyle = tx.cor || "#fff"; }
    s.split("\n").forEach(function (l, i, a) { x.fillText(l, 0, (i - (a.length - 1) / 2) * px * 1.15); }); x.restore(); }
  function quadroMini(x, tpl, t, W, H, tipo) {
    if (tipo === "mascara") { var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1b2a44"); g.addColorStop(1, "#0b0e14"); x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (var i = 0; i < 7; i++) { x.fillStyle = "rgba(255,255,255," + (0.05 + 0.03 * (i % 3)) + ")"; x.beginPath(); x.arc((i * 53 + t * 18) % W, H * (0.15 + 0.1 * (i % 4)), W * 0.05, 0, Math.PI * 2); x.fill(); }
      var ia = tpl.ia || {}; if (ia.fundo === "pb" || ia.fundo === "escuro") { x.fillStyle = ia.fundo === "pb" ? "rgba(120,120,120,.6)" : "rgba(0,0,0,.55)"; x.fillRect(0, 0, W, H); }
      if (ia.fundo === "desfoque") { x.fillStyle = "rgba(20,30,50,.55)"; x.fillRect(0, 0, W, H); }
      if (ia.fundo === "sem") { x.fillStyle = "#12B76A"; x.globalAlpha = 0.25; x.fillRect(0, 0, W, H); x.globalAlpha = 1; }
      var ts = (tpl.textos || []).map(function (q) { return Object.assign({ini: 0, dur: 4}, q); });
      ts.forEach(function (q) { textoMini(x, q, t % 4, W, H, q.anima === "anel" ? "tras" : ""); });
      if (ia.contorno) { x.save(); x.shadowColor = ia.contornoCor || "#7C5CFF"; x.shadowBlur = W * 0.06; pessoa(x, W, H, ia.contornoCor || "#7C5CFF"); x.restore(); }
      pessoa(x, W, H, ia.fundo === "pb" ? "#f0b48c" : "#e9d6c4");
      ts.forEach(function (q) { if (q.anima === "anel") textoMini(x, q, t % 4, W, H, "frente"); }); return; }
    var total = totalDe(tpl) || 1, tt = t % total, acc = 0, n = 0, e = tpl.espacos[0];
    for (var k = 0; k < tpl.espacos.length; k++) { if (tt < acc + tpl.espacos[k].dur) { n = k; e = tpl.espacos[k]; break; } acc += tpl.espacos[k].dur; }
    var cor = e.cor || tpl.cor || CORES[n % CORES.length], g2 = x.createLinearGradient(0, 0, W, H); g2.addColorStop(0, "#0b0e14"); g2.addColorStop(1, cor); x.fillStyle = g2; x.fillRect(0, 0, W, H);
    x.fillStyle = "rgba(255,255,255,.18)"; x.beginPath(); x.arc(W * (0.3 + 0.4 * ((n * 37) % 10) / 10), H * 0.45, W * 0.18, 0, Math.PI * 2); x.fill();
    x.fillStyle = "rgba(255,255,255,.75)"; x.font = "700 " + Math.round(W * 0.07) + "px Inter, system-ui, sans-serif"; x.textAlign = "left"; x.fillText("TAKE " + (n + 1), W * 0.06, H * 0.08);
    if (e.trans === "branco" && tt - acc < 0.18) { x.fillStyle = "rgba(255,255,255,.8)"; x.fillRect(0, 0, W, H); }
    (tpl.textos || []).forEach(function (q) { var ini = q.ini < 0 ? total + q.ini : q.ini; if (tt >= ini && tt < ini + q.dur) textoMini(x, Object.assign({}, q, {ini: ini}), tt, W, H, ""); });
    x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(0, H - 4, W, 4); x.fillStyle = "#FFB547"; x.fillRect(0, H - 4, W * tt / total, 4);
  }
  var VIVOS = [], RAF = 0, T0 = performance.now(), OBS = null;
  function animar() { cancelAnimationFrame(RAF); if (!VIVOS.length) return; var t = (performance.now() - T0) / 1000, reduzir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    VIVOS.forEach(function (o) { if (!o.ver) return; quadroMini(o.x, o.tpl, reduzir ? 1.2 : t, o.c.width, o.c.height, o.tipo); }); if (!reduzir) RAF = requestAnimationFrame(animar); }

  /* ---------- a galeria ---------- */
  var ABA = "edicao", FILTRO = "tudo";
  function css() { if ($("vmCss")) return; var st = document.createElement("style"); st.id = "vmCss"; st.textContent =
    ".vm-folha{position:fixed;inset:0;z-index:9500;background:rgba(5,7,11,.94);display:flex;flex-direction:column;color:#F5F1EA;font-family:Inter,system-ui,sans-serif}" +
    ".vm-folha[hidden]{display:none}.vm-top{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid rgba(245,241,234,.08);flex-wrap:wrap}" +
    ".vm-top h2{margin:0 auto 0 0;font:800 14px Inter,sans-serif;letter-spacing:.12em}.vm-abas{display:flex;gap:6px;flex-wrap:wrap}" +
    ".vm-abas button,.vm-chips button,.vm-bt{min-height:36px;padding:0 12px;border-radius:10px;border:1px solid rgba(245,241,234,.16);background:transparent;color:#cfd5de;font:800 10.5px Inter,sans-serif;letter-spacing:.08em;cursor:pointer}" +
    ".vm-abas button.on,.vm-chips button.on{background:#7C5CFF;border-color:#7C5CFF;color:#fff}.vm-bt.pri{background:#FFB547;border-color:#FFB547;color:#17120a}" +
    ".vm-corpo{flex:1;min-height:0;overflow:auto;padding:14px 16px 30px}.vm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}" +
    ".vm-grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}" +
    ".vm-card{background:#10141c;border:1px solid rgba(245,241,234,.08);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}" +
    ".vm-card canvas{display:block;width:100%;height:auto;background:#000;cursor:pointer}.vm-card .i{padding:10px 12px 12px;display:flex;flex-direction:column;gap:6px;flex:1}" +
    ".vm-card b{font:800 11.5px Inter,sans-serif;letter-spacing:.06em}.vm-card p{margin:0;font-size:12px;color:#9aa3b2;line-height:1.35}.vm-card small{color:#8d95a3;font-size:10.5px;letter-spacing:.06em}" +
    ".vm-card .a{display:flex;gap:6px;flex-wrap:wrap;margin-top:auto}.vm-nota{color:#9aa3b2;font-size:12.5px;margin:0 0 12px}" +
    ".vm-form{max-width:520px;background:#10141c;border:1px solid rgba(245,241,234,.12);border-radius:16px;padding:16px;margin:0 auto}.vm-form label{display:flex;flex-direction:column;gap:4px;margin-bottom:10px;font:700 10.5px Inter,sans-serif;letter-spacing:.08em;color:#9aa3b2}" +
    ".vm-form input{min-height:40px;border-radius:10px;border:1px solid rgba(245,241,234,.16);background:#0b0e14;color:#fff;padding:0 10px;font:600 16px Inter,sans-serif}" +
    ".vm-faixa{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 8px;padding:8px 10px;border-radius:12px;background:linear-gradient(90deg,rgba(124,92,255,.22),rgba(255,181,71,.12));border:1px solid rgba(124,92,255,.45);font:800 10.5px Inter,sans-serif;letter-spacing:.06em;color:#F5F1EA}" +
    ".vm-faixa span{margin-right:auto}.vm-faixa button{min-height:30px;padding:0 10px;border-radius:9px;border:1px solid rgba(245,241,234,.2);background:rgba(0,0,0,.25);color:#fff;font:800 10px Inter,sans-serif;letter-spacing:.06em;cursor:pointer}" +
    ".vm-faixa button.pri{background:#FFB547;border-color:#FFB547;color:#17120a}.ve-clip.ph{outline:2px dashed rgba(255,181,71,.9);outline-offset:-3px}";
    document.head.appendChild(st); }
  function folha() { css(); var f = $("vmFolha"); if (f) return f; f = document.createElement("div"); f.className = "vm-folha"; f.id = "vmFolha"; f.hidden = true; f.setAttribute("role", "dialog"); f.setAttribute("aria-label", "Modelos");
    f.innerHTML = '<div class="vm-top"><h2>🎬 MODELOS</h2><div class="vm-abas" id="vmAbas"></div><button class="vm-bt" type="button" id="vmFechar" aria-label="Fechar os modelos">✕ FECHAR</button></div><div class="vm-corpo" id="vmCorpo"></div><input type="file" id="vmArq" accept="application/json,.json" hidden>';
    document.body.appendChild(f);
    $("vmFechar").onclick = fechar; document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !f.hidden) { e.preventDefault(); e.stopImmediatePropagation(); fechar(); } }, true);
    $("vmAbas").addEventListener("click", function (e) { var b = e.target.closest("[data-aba]"); if (!b) return; ABA = b.dataset.aba; FILTRO = "tudo"; desenhar(); });
    $("vmCorpo").addEventListener("click", clique);
    $("vmArq").addEventListener("change", function () { var a = this.files && this.files[0]; this.value = ""; if (!a) return; a.text().then(function (t) { var o = JSON.parse(t); var l = (Array.isArray(o) ? o : [o]).filter(function (x) { return x && x.nome && Array.isArray(x.espacos); });
      if (!l.length) throw new Error("x"); var ms = meus(); l.forEach(function (x) { x.id = "meu-" + uid(); x.meu = true; ms.unshift(x); }); guardarMeus(ms); ABA = "meus"; desenhar(); V().aviso("⬆ " + l.length + " modelo(s) importado(s)."); }).catch(function () { V().aviso("Esse arquivo não é um modelo do editor (.json).", true); }); });
    if ("IntersectionObserver" in window) OBS = new IntersectionObserver(function (es) { es.forEach(function (en) { VIVOS.forEach(function (o) { if (o.c === en.target) o.ver = en.isIntersecting; }); }); animar(); }, {root: $("vmCorpo")});
    return f; }
  function cartao(tpl, tipo, i) { var f = FMT[tpl.fmt || "9:16"] || FMT["9:16"], h = tipo === "mascara" ? 300 : Math.round(200 * f[1] / f[0]), w = tipo === "mascara" ? 200 : 200;
    var info = tipo === "mascara" ? "COM A PESSOA · IA no aparelho" : (tpl.fmt || "9:16") + " · " + Math.round(totalDe(tpl)) + " s · " + tpl.espacos.length + " takes" + (tpl.musica ? " · música da casa" : "");
    var acoes = tipo === "mascara" ? '<button class="vm-bt pri" type="button" data-usarmasc="' + i + '">USAR NESTE TAKE</button>'
      : '<button class="vm-bt" type="button" data-ver="' + esc(tpl.id) + '">▶ VER</button><button class="vm-bt pri" type="button" data-usar="' + esc(tpl.id) + '">USAR</button>' + (tpl.meu ? '<button class="vm-bt" type="button" data-baixar="' + esc(tpl.id) + '" title="Baixar o modelo (.json) para mandar à BW">⬇</button><button class="vm-bt" type="button" data-apagar="' + esc(tpl.id) + '" aria-label="Apagar o modelo ' + esc(tpl.nome) + '">✕</button>' : "");
    return '<div class="vm-card"><canvas width="' + w + '" height="' + Math.min(h, 360) + '" data-prev="' + i + '" data-tipo="' + tipo + '" aria-hidden="true"></canvas><div class="i"><b>' + esc(tpl.nome) + '</b><p>' + esc(tpl.desc || "") + '</p><small>' + esc(info) + '</small><div class="a">' + acoes + '</div></div></div>'; }
  var LISTA = [];
  function desenhar() {
    $("vmAbas").innerHTML = [["edicao", "EDIÇÕES PRONTAS"], ["mascara", "COM A PESSOA (IA)"], ["meus", "MEUS MODELOS"]].map(function (a) { return '<button type="button" data-aba="' + a[0] + '" class="' + (ABA === a[0] ? "on" : "") + '">' + a[1] + '</button>'; }).join("");
    var h = "", tags = {};
    if (ABA === "edicao") { EDICOES.forEach(function (t) { (t.tags || []).forEach(function (g) { tags[g] = 1; }); });
      LISTA = EDICOES.filter(function (t) { return FILTRO === "tudo" || (t.tags || []).indexOf(FILTRO) >= 0; });
      h = '<p class="vm-nota">Toque em ▶ VER para assistir o modelo no editor. Gostou? USAR abre com os seus textos — depois é só tocar em cada TAKE e num vídeo seu (ou ⚡ PREENCHER SOZINHO).</p>' +
        '<div class="vm-chips">' + ["tudo"].concat(Object.keys(tags)).map(function (g) { return '<button type="button" data-filtro="' + g + '" class="' + (FILTRO === g ? "on" : "") + '">' + (g === "tudo" ? "TODOS" : g.toUpperCase()) + '</button>'; }).join("") + '</div>' +
        '<div class="vm-grade">' + LISTA.map(function (t, i) { return cartao(t, "edicao", i); }).join("") + '</div>'; }
    else if (ABA === "mascara") { LISTA = MASCARAS;
      h = '<p class="vm-nota">Escolha um TAKE com uma pessoa na linha do tempo e toque em USAR NESTE TAKE. O app acha a pessoa sozinho (no aparelho) e põe o texto atrás dela.</p><div class="vm-grade">' + LISTA.map(function (t, i) { return cartao(t, "mascara", i); }).join("") + '</div>'; }
    else { LISTA = meus();
      h = '<p class="vm-nota">Qualquer projeto vira modelo: os takes viram espaços para trocar e os textos ficam. Fica neste aparelho; ⬇ baixa o arquivo para mandar à BW incluir na biblioteca de todos.</p><div class="vm-chips"><button class="vm-bt pri" type="button" data-acao="salvarMeu">★ SALVAR O PROJETO ABERTO COMO MODELO</button><button class="vm-bt" type="button" data-acao="importar">⬆ IMPORTAR MODELO (.json)</button></div>' +
        (LISTA.length ? '<div class="vm-grade">' + LISTA.map(function (t, i) { return cartao(t, "edicao", i); }).join("") + '</div>' : '<p class="vm-nota">Nenhum modelo seu ainda.</p>'); }
    $("vmCorpo").innerHTML = h; VIVOS = [];
    [].forEach.call($("vmCorpo").querySelectorAll("canvas[data-prev]"), function (c) { var o = {c: c, x: c.getContext("2d"), tpl: LISTA[+c.dataset.prev], tipo: c.dataset.tipo, ver: !OBS}; VIVOS.push(o); if (OBS) OBS.observe(c); quadroMini(o.x, o.tpl, 1.2, c.width, c.height, o.tipo); });
    animar(); }
  function formCampos(tpl, tipo, idx) { var cs = tipo === "mascara" ? ["TEXTO"] : campos(tpl), P0 = V().P();
    if (tipo === "mascara" && !(tpl.textos || []).length) { aplicarMascara(tpl); return; }
    $("vmCorpo").innerHTML = '<div class="vm-form"><b style="display:block;margin-bottom:10px;font:800 12px Inter,sans-serif;letter-spacing:.08em">' + esc(tpl.nome) + '</b>' + cs.map(function (k) { return '<label>' + esc(CAMPOS_NOME[k] || k) + '<input data-campo="' + k + '" value="' + esc((tipo === "mascara" ? tpl.padrao : (P0.campos && P0.campos[k])) || CAMPOS_PADRAO[k] || "") + '" maxlength="60"></label>'; }).join("") +
      '<div class="vm-chips"><button class="vm-bt pri" type="button" data-confirmar="' + idx + '" data-tipo="' + tipo + '">' + (tipo === "mascara" ? "✨ APLICAR NO TAKE" : "🎬 ABRIR O MODELO") + '</button><button class="vm-bt" type="button" data-acao="voltar">VOLTAR</button></div></div>';
    var p = $("vmCorpo").querySelector("input"); if (p) p.focus(); }
  function valoresForm() { var v = {}; [].forEach.call($("vmCorpo").querySelectorAll("[data-campo]"), function (i) { v[i.dataset.campo] = i.value.trim(); }); return v; }
  var PEND = null;
  function clique(e) { var b = e.target.closest("button, canvas"); if (!b) return;
    if (b.dataset.filtro) { FILTRO = b.dataset.filtro; desenhar(); return; }
    if (b.dataset.acao === "voltar") { desenhar(); return; }
    if (b.dataset.acao === "importar") { $("vmArq").click(); return; }
    if (b.dataset.acao === "salvarMeu") { salvarMeu(); return; }
    if (b.tagName === "CANVAS") { var t0 = LISTA[+b.dataset.prev]; if (t0 && b.dataset.tipo !== "mascara") usar(t0, {}, true); return; }
    if (b.dataset.ver) { var tv = acharModelo(b.dataset.ver); if (tv) usar(tv, V().P().campos || {}, true); return; }
    if (b.dataset.usar) { var tu = acharModelo(b.dataset.usar); if (tu) { PEND = tu; formCampos(tu, "edicao", b.dataset.usar); } return; }
    if (b.dataset.usarmasc != null) { var tm = MASCARAS[+b.dataset.usarmasc], c = V().takeAlvo ? V().takeAlvo() : V().selAtual(); if (!c || (c.tipo !== "video" && c.tipo !== "imagem")) { V().aviso("Ponha primeiro um TAKE de vídeo ou foto com uma pessoa na linha do tempo.", true); return; } PEND = tm; formCampos(tm, "mascara", b.dataset.usarmasc); return; }
    if (b.dataset.confirmar != null) { var vals = valoresForm(); if (b.dataset.tipo === "mascara") aplicarMascara(PEND, vals.TEXTO); else usar(PEND, vals, false); return; }
    if (b.dataset.baixar) { var tb = acharModelo(b.dataset.baixar); if (!tb) return; var bl = new Blob([JSON.stringify(Object.assign({}, tb, {meu: undefined}), null, 1)], {type: "application/json"}), a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "modelo-" + tb.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + ".json"; document.body.appendChild(a); a.click(); a.remove(); return; }
    if (b.dataset.apagar) { if (!confirm("Apagar este modelo seu?")) return; guardarMeus(meus().filter(function (t) { return t.id !== b.dataset.apagar; })); desenhar(); } }
  /* qualquer projeto vira modelo: takes da camada VÍDEO → espaços; textos com os campos; a música da casa continua */
  function salvarMeu() { var P = V().P(), vs = P.clips.filter(function (c) { return c.trilha === "v1" && (c.tipo === "video" || c.tipo === "imagem"); }).sort(function (a, b) { return a.ini - b.ini; });
    if (!vs.length) { V().aviso("Ponha takes na camada VÍDEO antes de salvar como modelo.", true); return; }
    var nome = (prompt("Nome do modelo:", (P.modelo && P.modelo.nome ? P.modelo.nome + " (meu)" : "MEU MODELO")) || "").trim().slice(0, 50); if (!nome) return;
    var t = 0, total = P.clips.reduce(function (a, c) { return Math.max(a, c.ini + c.dur); }, 0), musA = P.clips.filter(function (c) { return c.tipo === "audio" && /^som-(modelo-)?base/.test(c.mid); })[0];
    var tpl = {id: "meu-" + uid(), meu: true, nome: nome.toUpperCase(), desc: "Modelo salvo do seu projeto.", tags: ["meus"], fmt: FMT[P.fmt] ? P.fmt : "9:16", musica: musA ? (/calma/.test(musA.mid) ? "Base calma" : "Base animada") : null, cor: "#7C5CFF",
      espacos: vs.map(function (c, i) { var e = {rot: c.rot || "TAKE " + (i + 1), dur: Math.round(c.dur * 100) / 100}; if (c.trans) e.trans = c.trans.tipo; if (c.efeito) e.efeito = c.efeito; if (c.vol) e.vol = c.vol; if (c.ia) e.ia = {frente: !!c.ia.frente, fundo: c.ia.fundo || ""}; return e; }),
      textos: P.clips.filter(function (c) { return c.tipo === "texto"; }).map(function (c) { var o = {txt: c.molde || c.txt, ini: Math.round(c.ini * 100) / 100, dur: Math.round(c.dur * 100) / 100, tam: c.tam, y: c.y || 0, x: c.x || 0, cor: c.cor, fundo: c.fundo || "", anima: c.anima || "", frente: !!c.frente}; if (c.raio) o.raio = c.raio; return o; })};
    var ms = meus(); ms.unshift(tpl); guardarMeus(ms); ABA = "meus"; desenhar(); V().aviso("★ Modelo “" + tpl.nome + "” salvo neste aparelho."); void t; void total; }
  function abrir(aba) { var f = folha(); ABA = aba || ABA; f.hidden = false; desenhar(); var bt = $("vmFechar"); if (bt) bt.focus(); }
  function fechar() { var f = $("vmFolha"); if (f) f.hidden = true; VIVOS = []; cancelAnimationFrame(RAF); }

  /* ---------- faixa do modelo aberto, em cima do editor ---------- */
  function faixa() { css(); var P = V() && V().P(); var w = document.querySelector(".wrap"), fx = $("vmFaixa"); if (!P || !w) return;
    var esp = P.clips.filter(function (c) { return c.ph != null || c.rot; }), faltam = P.clips.filter(function (c) { return c.ph; }).length;
    if (!P.modelo || P.modelo.oculto) { if (fx) fx.remove(); return; }
    if (!fx) { fx = document.createElement("div"); fx.className = "vm-faixa"; fx.id = "vmFaixa"; var topo = w.querySelector(".ve-topo"); if (topo && topo.nextSibling) w.insertBefore(fx, topo.nextSibling); else w.appendChild(fx);
      fx.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; var a = b.dataset.f;
        if (a === "auto") V().preencherSozinho(); else if (a === "textos") textosDoModelo(); else if (a === "ver") { V().irPara(0); V().tocar(); }
        else if (a === "volta") { V().anterior().then(function (p) { if (!p) { V().aviso("Não há projeto anterior guardado.", true); return; } if (!confirm("Voltar para o projeto que estava aberto antes do modelo?")) return; V().trocarProjeto(p); faixa(); V().aviso("↺ Projeto anterior de volta."); }); }
        else if (a === "fechar") { P.modelo.oculto = true; V().tudo(); faixa(); } }); }
    fx.innerHTML = '<span>🎬 ' + esc(P.modelo.nome) + ' · ' + (faltam ? "faltam " + faltam + " de " + esp.length + " takes" : "todos os takes colocados ✓") + '</span>' +
      (faltam ? '<button type="button" class="pri" data-f="auto">⚡ PREENCHER SOZINHO</button>' : "") + '<button type="button" data-f="textos">✎ TEXTOS</button><button type="button" data-f="ver">▶ VER</button><button type="button" data-f="volta">↺ PROJETO ANTERIOR</button><button type="button" data-f="fechar" aria-label="Esconder a faixa do modelo">✕</button>';
    [].forEach.call(document.querySelectorAll("#veFaixas .ve-clip"), function (el) { var c = P.clips.filter(function (x) { return x.id === el.dataset.clip; })[0]; el.classList.toggle("ph", !!(c && c.ph)); }); }
  function textosDoModelo() { var P = V().P(), cs = {}; P.clips.forEach(function (c) { if (c.molde) String(c.molde).replace(/\{([A-ZÇÃÕÉÍ]+)\}/g, function (_, k) { cs[k] = 1; }); });
    var ks = Object.keys(cs); if (!ks.length) { V().aviso("Os textos deste projeto não têm campos para trocar — mude direto no texto (toque nele na linha do tempo)."); return; }
    abrir("edicao"); $("vmCorpo").innerHTML = '<div class="vm-form"><b style="display:block;margin-bottom:10px;font:800 12px Inter,sans-serif;letter-spacing:.08em">TEXTOS DO MODELO</b>' + ks.map(function (k) { return '<label>' + esc(CAMPOS_NOME[k] || k) + '<input data-campo="' + k + '" value="' + esc((P.campos && P.campos[k]) || CAMPOS_PADRAO[k] || "") + '" maxlength="60"></label>'; }).join("") +
      '<div class="vm-chips"><button class="vm-bt pri" type="button" id="vmTextosOk">✓ TROCAR OS TEXTOS</button><button class="vm-bt" type="button" data-acao="voltar">VOLTAR</button></div></div>';
    $("vmTextosOk").onclick = function () { var v = valoresForm(); P.campos = Object.assign({}, P.campos || {}, v); P.clips.forEach(function (c) { if (c.molde) c.txt = preencher(c.molde, P.campos); }); fechar(); V().tudo(); V().aviso("✓ Textos trocados."); }; }

  /* botão 🎬 MODELOS no topo do editor + espaços refeitos ao abrir */
  function iniciar() { var v = V(); if (!v || !window.__veProntoOk) { setTimeout(iniciar, 150); return; }
    var novo = $("veNovo"); if (novo && !$("veModelos")) { var b = document.createElement("button"); b.className = "ve-bt"; b.id = "veModelos"; b.type = "button"; b.textContent = "🎬 MODELOS"; b.title = "Modelos prontos: assista e troque os takes"; b.onclick = function () { abrir(); }; novo.parentNode.insertBefore(b, novo); }
    garantir(v.P()).then(function (f) { if (f) { v.desenharLib(); v.tudo(); } faixa(); });
    var tl = $("veFaixas"); if (tl && window.MutationObserver) new MutationObserver(function () { clearTimeout(iniciar._t); iniciar._t = setTimeout(faixa, 30); }).observe(tl, {childList: true}); }
  window.VEModelos = {garantir: garantir, EDICOES: EDICOES, MASCARAS: MASCARAS, abrir: abrir, fechar: fechar, usar: usar, montar: montar, aplicarMascara: aplicarMascara, faixa: faixa, meus: meus, totalDe: totalDe, campos: campos};
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
