/* BW REELS PRO (17/11, Claude) — editor de Reels dentro da Brightway.
   - Prévia ao vivo com o MESMO motor do BW Reels Studio (assets/reels-motor.js, gerado a partir do Studio).
   - Projetos e mídias ficam SÓ neste aparelho (IndexedDB "bw_reels"); nada vai para a conta.
   - IA: Edge Function bw-ia (uma chamada por roteiro: ganchos + cenas + fatos + legenda). Sem login → modelo pronto.
   - Vídeo final: pacote .bwreels.zip baixado → o BW Reels Studio no PC renderiza (o site não fala com o PC). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var M = window.BWReelsMotor;
  var FN_IA = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var CHAVE_PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); };
  var fmt = function (n) { return (Math.round(n * 10) / 10).toFixed(1).replace(".", ","); };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var slug = function (s) { return String(s || "reel").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").slice(0, 40).replace(/^-+|-+$/g, "") || "reel"; };
  var palavras = function (s) { return String(s || "").split(/\s+/).filter(Boolean); };

  /* ---------- selo LOGADO ---------- */
  async function sessao() {
    try { var sb = window.BWSync && BWSync.cliente(); var s = sb ? await sb.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; }
  }
  (async function () {
    var el = $("userBox"); if (!el) return;
    var s = await sessao(); var u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>'
                     : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>';
  })();

  /* ---------- banco local (IndexedDB) ---------- */
  var DB = null;
  function abrirDB() {
    return new Promise(function (ok, erro) {
      if (DB) return ok(DB);
      var r = indexedDB.open("bw_reels", 2);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("projetos")) d.createObjectStore("projetos", {keyPath: "id"});
        if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}).createIndex("projeto", "projeto");
        if (!d.objectStoreNames.contains("personagens")) d.createObjectStore("personagens", {keyPath: "id"});   /* MEUS PERSONAGENS (17/11) */
      };
      r.onsuccess = function () { DB = r.result; ok(DB); };
      r.onerror = function () { erro(r.error); };
    });
  }
  function tx(loja, modo, fn) {
    return abrirDB().then(function (d) {
      return new Promise(function (ok, erro) {
        var t = d.transaction(loja, modo); var st = t.objectStore(loja); var res = fn(st);
        t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : res); };
        t.onerror = function () { erro(t.error); };
      });
    });
  }
  var dbPut = function (loja, v) { return tx(loja, "readwrite", function (s) { return s.put(v); }); };
  var dbGet = function (loja, k) { return tx(loja, "readonly", function (s) { return s.get(k); }); };
  var dbDel = function (loja, k) { return tx(loja, "readwrite", function (s) { return s.delete(k); }); };
  var dbTodos = function (loja) { return tx(loja, "readonly", function (s) { return s.getAll(); }); };
  function midiasDoProjeto(pid) { return tx("midias", "readonly", function (s) { return s.index("projeto").getAll(pid); }); }

  /* ---------- estado ---------- */
  var P = null;                 // projeto aberto
  var MID = [];                 // mídias do projeto: {id, nome, tipo, caminho, url, dur}
  var SEL = 0;                  // cena selecionada
  var T = 0, TOCANDO = false, INICIO = 0, BASE = 0, PLANO = null, PRONTO = false;
  var ABA = "criar", PASSO = "assunto";

  function roteiroBase(b) {
    var cta = (b && b.cta) || "Me chama no direct";
    return {
      titulo: "Novo reel", formato: "9:16", fps: 30, motor: "nativo", estilo: "cinema",
      efeitos: {grao: true, vinheta: true, letterbox: false, barraProgresso: true, sfx: true},
      marca: {handle: ""}, legendas: {ativas: true, palavrasPorPagina: 3},
      audio: {},
      cenas: [
        {tipo: "gancho", duracao: 3, texto: "Escreva aqui o seu gancho", enfase: ["gancho"]},
        {tipo: "texto", duracao: 3.5, titulo: "A virada que prende quem assiste", subtitulo: "Uma ideia por cena."},
        {tipo: "lista", duracao: 5, titulo: "O que você precisa saber", itens: ["Primeiro ponto", "Segundo ponto", "Terceiro ponto"]},
        {tipo: "cta", duracao: 3, texto: "Gostou? Então faz isso", acao: cta}
      ],
      fontes: []
    };
  }
  function novoProjeto() {
    return {id: uid(), nome: "", briefing: {assunto: "", nicho: "Eventos corporativos", cta: "", publico: "", perfil: "", fatos: ""},
      ganchos: [], ganchoEsc: -1, fatos: [], legenda: "", roteiro: roteiroBase(), modo: "texto", atualizado: Date.now()};
  }

  var tSalvar = null;
  function salvar() {
    clearTimeout(tSalvar);
    tSalvar = setTimeout(function () {
      if (!P) return; P.atualizado = Date.now(); P.roteiro.titulo = P.nome || "Novo reel";
      P.naConta = true;
      dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { });
      contaPor(P);
      try { localStorage.setItem("ui_reels_ultimo", P.id); } catch (e) { }
    }, 500);
  }

  /* ---------- projetos na CONTA (chave reels_projetos do bw-sync): roteiro e textos, SEM as mídias ---------- */
  var EH_CEL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""));
  function contaLer() { try { var v = JSON.parse(localStorage.getItem("bw_reels_projetos_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function contaGravar(l) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar("reels_projetos", 1, l); } catch (e) { }
    try { localStorage.setItem("bw_reels_projetos_v1", JSON.stringify(l)); localStorage.setItem("ui_reels_conta_ok", "1"); return true; } catch (e) { try { localStorage.removeItem("ui_reels_conta_ok"); } catch (x) { } return false; }
  }
  function contaPor(p) {
    var l = contaLer(), i = l.findIndex(function (x) { return x.id === p.id; }), c = JSON.parse(JSON.stringify(p));
    if (i >= 0) l[i] = c; else l.push(c);
    if (l.length > 80) l = l.sort(function (a, b) { return (b.atualizado || 0) - (a.atualizado || 0); }).slice(0, 80);
    contaGravar(l);
  }
  function contaTirar(id) { contaGravar(contaLer().filter(function (x) { return x.id !== id; })); }
  /* traz para este aparelho o que mudou na conta (outro aparelho); o que foi apagado lá sai daqui também */
  async function puxarDaConta() {
    var l = contaLer(), ids = {}, mudou = 0, reabrir = null;
    for (var i = 0; i < l.length; i++) {
      var c = l[i]; if (!c || !c.id) continue; ids[c.id] = 1;
      var loc = await dbGet("projetos", c.id).catch(function () { return null; });
      if (!loc || (c.atualizado || 0) > (loc.atualizado || 0)) { await dbPut("projetos", c).catch(function () { }); mudou++; if (P && P.id === c.id) reabrir = c; }
    }
    var okConta = false; try { okConta = localStorage.getItem("ui_reels_conta_ok") === "1"; } catch (e) { }
    if (okConta) {
      var locais = await dbTodos("projetos").catch(function () { return []; });
      for (var j = 0; j < locais.length; j++) if (locais[j].naConta && !ids[locais[j].id] && !(P && P.id === locais[j].id)) { await dbDel("projetos", locais[j].id).catch(function () { }); mudou++; }
    }
    if (reabrir && !TOCANDO && !(AQUI && AQUI.rodando)) await abrir(JSON.parse(JSON.stringify(reabrir)));
    desenharFila();
    return mudou;
  }
  function usaMidia(p) { return ((p.roteiro || {}).cenas || []).some(function (c) { return c.midia || c.midia2 || (c.elenco || []).some(function (a) { return a.imagem || a.personagem === "meu"; }); }) || !!((p.roteiro || {}).audio || {}).musica; }
  function horaCurta(ms) { var d = new Date(ms); return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function desenharFila() {
    var fila = contaLer().filter(function (p) { return p.paraPC; }).sort(function (a, b) { return b.paraPC - a.paraPC; });
    if ($("filaPC")) $("filaPC").innerHTML = (!EH_CEL && fila.length) ? '<div class="rl-aviso ok" style="margin-bottom:10px"><b>📲 Chegou do celular</b> — pronto para renderizar aqui:' + fila.map(function (p) {
      return '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:8px"><span>' + esc(p.nome || (p.briefing || {}).assunto || "Reel sem nome") + ' <small style="opacity:.7">· enviado ' + horaCurta(p.paraPC) + (usaMidia(p) ? " · mídias e personagens próprios ficaram no celular" : "") + '</small></span><button type="button" class="rl-bt peq" data-fila="' + esc(p.id) + '">ABRIR</button></div>'; }).join("") + '</div>' : "";
    if ($("enviarPCEstado") && P) {
      $("cxEnviarPC").hidden = !EH_CEL;
      $("enviarPCEstado").innerHTML = P.paraPC ? '<div class="rl-aviso ok">Na fila do computador desde ' + horaCurta(P.paraPC) + '. Abra o BW Reels Pro no PC (logado na mesma conta). <button type="button" class="rl-bt peq" id="btTirarFila">TIRAR DA FILA</button></div>' : "";
      $("btEnviarPC").textContent = P.paraPC ? "📲 ENVIAR DE NOVO PARA O PC" : "📲 ENVIAR PARA O PC";
      if ($("btTirarFila")) $("btTirarFila").onclick = function () { P.paraPC = 0; salvarJa(); };
    }
  }
  function salvarJa() { clearTimeout(tSalvar); if (!P) return; P.atualizado = Date.now(); P.naConta = true; P.roteiro.titulo = P.nome || "Novo reel"; dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { }); contaPor(P); desenharFila(); }
  async function logado() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return !!(s && s.data && s.data.session); } catch (e) { return false; } }

  /* ---------- mídia ---------- */
  function tipoDe(f) { return /^video\//.test(f.type) ? "video" : /^audio\//.test(f.type) ? "audio" : /^image\//.test(f.type) ? "imagem" : ""; }
  function duracaoDe(url, tipo) {
    return new Promise(function (ok) {
      if (tipo === "imagem") return ok(0);
      var el = document.createElement(tipo === "audio" ? "audio" : "video"); el.preload = "metadata"; el.muted = true;
      el.onloadedmetadata = function () { ok(el.duration || 0); }; el.onerror = function () { ok(0); }; el.src = url;
      setTimeout(function () { ok(0); }, 6000);
    });
  }
  async function carregarMidias() {
    MID.forEach(function (m) { try { URL.revokeObjectURL(m.url); } catch (e) { } });
    var lista = await midiasDoProjeto(P.id).catch(function () { return []; });
    MID = lista.map(function (r) { return {id: r.id, nome: r.nome, tipo: r.tipo, caminho: r.caminho, dur: r.dur || 0, url: URL.createObjectURL(r.blob)}; });
  }
  async function importar(files) {
    var n = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i]; var tipo = tipoDe(f); if (!tipo) continue;
      var buf = await f.arrayBuffer();               // copia já (no iPhone o original some depois do seletor)
      var blob = new Blob([buf], {type: f.type});
      var id = uid(); var ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      var caminho = "midia/" + slug(f.name.replace(/\.[^.]+$/, "")) + "-" + id.slice(-4) + "." + ext;
      var url = URL.createObjectURL(blob); var dur = await duracaoDe(url, tipo);
      await dbPut("midias", {id: id, projeto: P.id, nome: f.name, tipo: tipo, caminho: caminho, dur: dur, blob: blob});
      MID.push({id: id, nome: f.name, tipo: tipo, caminho: caminho, dur: dur, url: url}); n++;
      if (tipo === "audio" && !(P.roteiro.audio || {}).musica) { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.musica = caminho; }
    }
    if (n) { salvar(); desenharMidias(); desenharCena(); atualizar(); }
    return n;
  }
  function urlDe(caminho) { var m = MID.find(function (x) { return x.caminho === caminho; }); return m ? m.url : null; }

  function desenharMidias() {
    var box = $("midias");
    box.innerHTML = MID.length ? MID.map(function (m) {
      var vis = m.tipo === "imagem" ? '<img src="' + m.url + '" alt="">' : m.tipo === "video" ? '<video src="' + m.url + '#t=0.5" muted preload="metadata"></video>' : '<span>♪ áudio</span>';
      var dur = m.tipo === "imagem" ? "foto" : (m.dur ? fmt(m.dur) + " s" : "");
      var ac = m.tipo === "audio" ? '<button type="button" data-m="musica" data-id="' + m.id + '">USAR COMO MÚSICA</button>'
                                  : '<button type="button" data-m="cena" data-id="' + m.id + '">NA CENA ' + (SEL + 1) + '</button><button type="button" data-m="nova" data-id="' + m.id + '">+ CENA</button>';
      return '<div class="rl-midia"><div class="vis">' + vis + (dur ? '<em>' + dur + '</em>' : '') + '</div><div class="nm" title="' + esc(m.nome) + '">' + esc(m.nome) + '</div><div class="ac">' + ac +
        '<button type="button" data-m="del" data-id="' + m.id + '" aria-label="Excluir ' + esc(m.nome) + '">✕</button></div></div>';
    }).join("") : '<p class="rl-nota" style="grid-column:1/-1">Nenhuma mídia ainda. Importe suas filmagens, fotos, motions de IA ou música licenciada.</p>';
    var mus = $("fMusica"); var at = (P.roteiro.audio || {}).musica || "";
    mus.innerHTML = '<option value="">Sem música</option>' + MID.filter(function (m) { return m.tipo === "audio"; }).map(function (m) { return '<option value="' + esc(m.caminho) + '"' + (m.caminho === at ? " selected" : "") + '>' + esc(m.nome) + '</option>'; }).join("");
    $("fVolMus").value = Math.round(((P.roteiro.audio || {}).volumeMusica != null ? P.roteiro.audio.volumeMusica : 0.6) * 100);
    var cm = $("cMidia"); var cena = P.roteiro.cenas[SEL] || {};
    $("cMidia2").innerHTML = '<option value="">Nenhuma</option>' + MID.filter(function (m) { return m.tipo !== "audio"; }).map(function (m) { return '<option value="' + esc(m.caminho) + '"' + (m.caminho === cena.midia2 ? " selected" : "") + '>' + esc(m.nome) + '</option>'; }).join("");
    cm.innerHTML = '<option value="">Sem mídia (fundo do estilo)</option>' + MID.filter(function (m) { return m.tipo !== "audio"; }).map(function (m) { return '<option value="' + esc(m.caminho) + '"' + (m.caminho === cena.midia ? " selected" : "") + '>' + esc(m.nome) + '</option>'; }).join("");
  }
  $("midias").addEventListener("click", async function (e) {
    var b = e.target.closest("button[data-m]"); if (!b) return;
    var m = MID.find(function (x) { return x.id === b.dataset.id; }); if (!m) return;
    var acao = b.dataset.m;
    if (acao === "musica") { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.musica = m.caminho; }
    else if (acao === "cena") { var c = P.roteiro.cenas[SEL]; if (c) { c.midia = m.caminho; if (c.inicioNoArquivo == null) c.inicioNoArquivo = 0; } }
    else if (acao === "nova") {
      var dur = m.tipo === "video" && m.dur ? Math.min(4, Math.max(1.5, m.dur)) : 3;
      P.roteiro.cenas.splice(SEL + 1, 0, {tipo: "midia", duracao: dur, midia: m.caminho, inicioNoArquivo: 0}); SEL++;
    } else if (acao === "del") {
      if (!confirm("Excluir \"" + m.nome + "\" deste projeto? As cenas que usam esta mídia ficam sem fundo.")) return;
      await dbDel("midias", m.id).catch(function () { });
      P.roteiro.cenas.forEach(function (c) { if (c.midia === m.caminho) delete c.midia; });
      if ((P.roteiro.audio || {}).musica === m.caminho) delete P.roteiro.audio.musica;
      try { URL.revokeObjectURL(m.url); } catch (er) { }
      MID = MID.filter(function (x) { return x !== m; });
    }
    salvar(); desenharTudo(); atualizar();
  });
  $("btImportar").onclick = function () { $("arquivos").click(); };
  $("arquivos").onchange = async function () { var fs = Array.prototype.slice.call(this.files || []); this.value = ""; if (fs.length) { ocupado("Guardando as mídias neste aparelho…"); try { await importar(fs); } finally { ocupado(); } } };
  ["dragover", "drop"].forEach(function (ev) {
    $("pnMidia").addEventListener(ev, async function (e) {
      e.preventDefault();
      if (ev === "drop" && e.dataTransfer && e.dataTransfer.files.length) { ocupado("Guardando as mídias neste aparelho…"); try { await importar(Array.prototype.slice.call(e.dataTransfer.files)); } finally { ocupado(); } }
    });
  });
  $("fMusica").onchange = function () { P.roteiro.audio = P.roteiro.audio || {}; if (this.value) P.roteiro.audio.musica = this.value; else delete P.roteiro.audio.musica; salvar(); prepararMusica(); };
  $("fTrilha").onchange = function () { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.trilha = this.value; salvar(); };
  $("fVolTrilha").oninput = function () { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.volumeTrilha = Number(this.value) / 100; salvar(); };
  $("fEfeitos").onchange = function () { P.roteiro.efeitos = P.roteiro.efeitos || {}; P.roteiro.efeitos.sfx = this.checked; salvar(); };
  $("fVolMus").oninput = function () { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.volumeMusica = Number(this.value) / 100; salvar(); prepararMusica(); };

  /* ---------- prévia ---------- */
  var musica = new Audio(); musica.preload = "auto";
  function prepararMusica() {
    var a = P.roteiro.audio || {}; var u = a.musica ? urlDe(a.musica) : null;
    if (!u) { musica.pause(); musica.removeAttribute("src"); return; }
    if (musica.dataset.src !== u) { musica.src = u; musica.dataset.src = u; }
    musica.volume = Math.max(0, Math.min(1, a.volumeMusica != null ? a.volumeMusica : 0.6));
  }
  /* som automático (trilha do estilo + efeitos) — composto no aparelho pelo mesmo motor do vídeo final */
  var somAuto = new Audio(); somAuto.preload = "auto"; var SOM_CHAVE = "", SOM_URL = null;
  function prepararSom() {
    var r = P.roteiro, a = r.audio || {};
    var chave = JSON.stringify([r.cenas, r.estilo, r.formato, a.trilha, a.volumeTrilha, !!a.musica, !!a.narracao, (r.efeitos || {}).sfx]);
    if (chave === SOM_CHAVE) return;
    SOM_CHAVE = chave;
    try {
      var pl = M.criarPlano(JSON.parse(JSON.stringify(r)));
      var s = M.sintetizarSons(pl, {sr: 32000}), mix = M.misturar(s.trilha, s.efeitos);
      if (SOM_URL) { URL.revokeObjectURL(SOM_URL); SOM_URL = null; }
      if (!mix) { somAuto.removeAttribute("src"); return; }
      SOM_URL = URL.createObjectURL(new Blob([M.wavDe(mix, 32000)], {type: "audio/wav"})); somAuto.src = SOM_URL;
    } catch (e) { somAuto.removeAttribute("src"); }
  }
  function desenharSom() {
    var a = P.roteiro.audio || {}, sel = $("fTrilha"), atual = a.trilha || (a.musica ? "nenhuma" : "auto");
    sel.innerHTML = '<option value="auto">Automática (a do estilo)</option>' + Object.keys(M.TRILHAS).map(function (k) { return '<option value="' + k + '">' + esc(M.TRILHAS[k].nome) + '</option>'; }).join("") + '<option value="nenhuma">Sem trilha</option>';
    sel.value = atual; $("fVolTrilha").value = Math.round((a.volumeTrilha != null ? a.volumeTrilha : (a.narracao ? 0.22 : 0.45)) * 100);
    $("fEfeitos").checked = (P.roteiro.efeitos || {}).sfx !== false;
  }
  function roteiroParaPrevia() {
    var r = JSON.parse(JSON.stringify(P.roteiro));
    r.cenas.forEach(function (c) {
      ["midia", "midia2"].forEach(function (k) { if (c[k]) { var u = urlDe(c[k]); if (u) c[k] = u + "#" + (MID.find(function (m) { return m.url === u; }).tipo === "imagem" ? "img.jpg" : "vid.mp4"); else delete c[k]; } });
      (c.elenco || []).forEach(function (a) { if (a.personagem === "foto") { var ui = urlDe(a.imagem); if (ui) a.imagem = ui; else { a.personagem = "be"; delete a.imagem; } } });
    });
    r.audio = {}; r.efeitos = Object.assign({}, r.efeitos, {sfx: false});
    return r;
  }
  var tPrev = null;
  function atualizar() { clearTimeout(tPrev); tPrev = setTimeout(montarPrevia, 250); validar(); desenharLinha(); }
  function montarPrevia() {
    try { PLANO = M.criarPlano(roteiroParaPrevia()); } catch (e) { return; }
    var html = M.construirHtml(PLANO, "nativo");
    // Prévia LEVE no celular: sem o grão e sem o desfoque gigante de fundo, e sem uma camada por palavra — no iPhone a página caía por falta de memória.
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""))) html = html.replace("</head>", "<style>#grao{display:none!important}#luz{filter:none!important;inset:0!important;opacity:.09!important}.w,.cena,.foto-corpo{will-change:auto!important}</style></head>");
    PRONTO = false;
    var f = $("quadro");
    f.onload = function () {
      var w = f.contentWindow; if (!w) return;
      w.__PREVIEW = true; w.__TOCANDO = TOCANDO;
      Promise.resolve(w.__pronto).then(function () { PRONTO = true; ajustarTela(); if (T > PLANO.duracao) T = 0; posicionar(T); });
    };
    f.srcdoc = html;
    ajustarTela();
  }
  function ajustarTela() {
    if (!PLANO) return;
    var W = PLANO.largura, H = PLANO.altura, tela = $("tela"), f = $("quadro");
    var larg = tela.parentElement.clientWidth || 360;
    var celular = window.innerWidth <= 980;
    var altMax = celular ? Math.max(180, window.innerHeight * 0.3) : Math.min(window.innerHeight * 0.66, 660);
    var s = Math.min(larg / W, altMax / H);
    tela.style.width = Math.round(W * s) + "px"; tela.style.height = Math.round(H * s) + "px";
    f.style.width = W + "px"; f.style.height = H + "px"; f.style.transform = "scale(" + s + ")";
    var zt = $("zonaT"), zb = $("zonaB");
    zt.style.height = (PLANO.vertical ? 11 : 8) + "%"; zb.style.height = (PLANO.vertical ? 25 : 12) + "%";
    /* celular: a prévia fica presa no topo → a rolagem reserva a altura dela (campo tocado nunca fica escondido atrás) */
    var raiz = document.documentElement;
    if (celular) { var h = tela.closest(".rl-palco").offsetHeight + 8; raiz.style.scrollPaddingTop = h + "px"; raiz.style.scrollPaddingBottom = "96px"; raiz.style.setProperty("--rl-topo", h + "px"); }
    else { raiz.style.scrollPaddingTop = ""; raiz.style.scrollPaddingBottom = ""; }
  }
  window.addEventListener("resize", ajustarTela);
  function posicionar(t) {
    T = Math.max(0, Math.min(t, PLANO ? PLANO.duracao : 0));
    var w = $("quadro").contentWindow;
    if (PRONTO && w && w.__seek) { w.__TOCANDO = TOCANDO; try { w.__seek(T); } catch (e) { } }
    $("tempo").textContent = fmt(T) + " / " + fmt(PLANO ? PLANO.duracao : 0) + " s";
    $("barra").value = PLANO && PLANO.duracao ? Math.round(T / PLANO.duracao * 1000) : 0;
    var c = cenaNoTempo(T); if (c !== SEL && TOCANDO) { SEL = c; marcarCena(); }
  }
  function cenaNoTempo(t) { var a = 0, cs = P.roteiro.cenas; for (var i = 0; i < cs.length; i++) { a += Number(cs[i].duracao) || 0; if (t < a) return i; } return Math.max(0, cs.length - 1); }
  function inicioCena(i) { var a = 0; for (var k = 0; k < i; k++) a += Number(P.roteiro.cenas[k].duracao) || 0; return a; }
  function laco() {
    if (!TOCANDO) return;
    var t = BASE + (performance.now() - INICIO) / 1000;
    if (PLANO && t >= PLANO.duracao) { parar(); posicionar(PLANO.duracao); return; }
    posicionar(t); requestAnimationFrame(laco);
  }
  function tocar() {
    if (!PLANO) return; if (T >= PLANO.duracao - 0.05) T = 0;
    TOCANDO = true; BASE = T; INICIO = performance.now();
    if (musica.src) { try { musica.currentTime = T; } catch (e) { } musica.play().catch(function () { }); }
    prepararSom(); if (somAuto.src) { try { somAuto.currentTime = T; } catch (e) { } somAuto.play().catch(function () { }); }
    $("icPlay").innerHTML = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'; $("btPlay").setAttribute("aria-label", "Pausar");
    requestAnimationFrame(laco);
  }
  function parar() {
    TOCANDO = false; musica.pause(); somAuto.pause();
    var w = $("quadro").contentWindow; if (w) { w.__TOCANDO = false; try { w.__seek(T); } catch (e) { } }
    $("icPlay").innerHTML = '<path d="M7 4l13 8-13 8z"/>'; $("btPlay").setAttribute("aria-label", "Reproduzir");
  }
  $("btPlay").onclick = function () { TOCANDO ? parar() : tocar(); };
  $("barra").oninput = function () { if (TOCANDO) parar(); posicionar(Number(this.value) / 1000 * (PLANO ? PLANO.duracao : 0)); SEL = cenaNoTempo(T); marcarCena(); };
  $("btAnt").onclick = function () { parar(); SEL = Math.max(0, cenaNoTempo(T) - (T - inicioCena(cenaNoTempo(T)) < 0.3 ? 1 : 0)); posicionar(inicioCena(SEL) + 0.05); desenharTudo(); };
  $("btProx").onclick = function () { parar(); SEL = Math.min(P.roteiro.cenas.length - 1, cenaNoTempo(T) + 1); posicionar(inicioCena(SEL) + 0.05); desenharTudo(); };
  $("chkZonas").onchange = function () { $("zonaT").hidden = $("zonaB").hidden = !this.checked; try { localStorage.setItem("ui_reels_zonas", this.checked ? "1" : "0"); } catch (e) { } };

  /* ---------- linha do tempo ---------- */
  var NOMES = {gancho: "Gancho", texto: "Texto", midia: "Mídia", dado: "Dado", lista: "Lista", citacao: "Citação", cta: "Chamada", personagem: "Personagem",
    logo: "Logo", nome: "Nome", contagem: "Contagem", grafico: "Gráfico", linha: "Linha do tempo", checklist: "Checklist", ranking: "Top", depoimento: "Depoimento",
    local: "Local", oferta: "Oferta", aovivo: "AO VIVO", celular: "Celular", antesdepois: "Antes/depois", dividida: "Dividida"};
  function resumo(c) { if (c.tipo === "personagem") { var f = (c.falas && c.falas[0] && c.falas[0].texto) || c.balao; var el = c.elenco && c.elenco.length ? c.elenco : [{personagem: c.personagem || "be"}]; return f || el.map(function (a) { return (M.PERSONAGENS[a.personagem] || {nome: "?"}).nome.split(" ")[0]; }).join(" e "); } return c.texto || c.titulo || (c.tipo === "dado" ? (c.prefixo || "") + " " + (c.valor != null ? c.valor : "") + " " + (c.rotulo || "") : "") || (c.midia ? (MID.find(function (m) { return m.caminho === c.midia; }) || {}).nome || "mídia" : "—"); }
  var ERROS_CENA = {};
  function desenharLinha() {
    var cs = P.roteiro.cenas, tot = cs.reduce(function (s, c) { return s + (Number(c.duracao) || 0); }, 0);
    $("tlTit").textContent = "Linha do tempo · " + fmt(tot) + " s · " + cs.length + " cenas";
    $("cenas").innerHTML = cs.map(function (c, i) {
      return '<button type="button" class="rl-cena' + (i === SEL ? " on" : "") + (ERROS_CENA[i] ? " erro" : "") + '" data-i="' + i + '" style="flex:' + (Number(c.duracao) || 1) + ' 1 0" aria-label="Cena ' + (i + 1) + ': ' + esc(NOMES[c.tipo] || c.tipo) + '">' +
        '<small>' + (i + 1) + ' · ' + esc(NOMES[c.tipo] || c.tipo) + ' · ' + fmt(Number(c.duracao) || 0) + 's</small><span>' + esc(resumo(c)) + '</span></button>';
    }).join("");
  }
  function marcarCena() { [].forEach.call(document.querySelectorAll(".rl-cena"), function (b) { b.classList.toggle("on", Number(b.dataset.i) === SEL); }); }
  $("cenas").addEventListener("click", function (e) {
    var b = e.target.closest(".rl-cena"); if (!b) return;
    parar(); SEL = Number(b.dataset.i); posicionar(inicioCena(SEL) + Math.min(1.2, (Number(P.roteiro.cenas[SEL].duracao) || 1) * 0.6));
    trocarAba("cena"); desenharTudo();
  });
  $("btMaisCena").onclick = function () {
    P.roteiro.cenas.splice(SEL + 1, 0, {tipo: "texto", duracao: 3, titulo: "Nova cena"}); SEL++;
    salvar(); trocarAba("cena"); desenharTudo(); atualizar(); posicionar(inicioCena(SEL) + 0.8);
  };

  /* ---------- editor da cena ---------- */
  var CAMPOS = {
    gancho: ["gTexto", "gEnfase", "gChamada"], texto: ["gTexto", "gEnfase", "gSub"], midia: ["gTexto", "gEnfase"],
    dado: ["gDado"], lista: ["gTexto", "gItens", "gEnfase"], citacao: ["gTexto", "gAutor", "gEnfase"], cta: ["gTexto", "gEnfase", "gAcao"],
    personagem: ["gTexto", "gEnfase", "gPers"],
    logo: ["gTexto", "gSub"], nome: ["gTexto", "gSub"], contagem: ["gTexto", "gNum", "gEnfase"], grafico: ["gTexto", "gItens", "gForma", "gUnid", "gFonte2", "gEnfase"],
    linha: ["gTexto", "gItens", "gEnfase"], checklist: ["gTexto", "gItens", "gEnfase"], ranking: ["gTexto", "gItens", "gEnfase"], depoimento: ["gTexto", "gAutor", "gEstrelas", "gEnfase"],
    local: ["gTexto", "gSub", "gEnfase"], oferta: ["gChamada", "gTexto", "gDado", "gEnfase"], aovivo: ["gTexto", "gSub", "gEnfase"], celular: ["gTexto", "gEnfase"],
    antesdepois: ["gTexto", "gMidia2", "gEnfase"], dividida: ["gTexto", "gSub", "gMidia2"]
  };
  var USA_TITULO = ["texto", "lista", "nome", "grafico", "linha", "checklist", "ranking"];
  var ROTULOS = {nome: ["Nome", "Cargo / empresa"], logo: ["Marca (se não usar imagem)", "Frase embaixo"], contagem: ["Texto depois da contagem"], local: ["Local", "Data e hora"],
    aovivo: ["Chamada", "Linha de baixo"], dividida: ["Etiqueta de cima", "Etiqueta de baixo"], oferta: ["Produto / pacote"], celular: ["Texto em cima"], antesdepois: ["Legenda"],
    depoimento: ["Frase REAL do cliente"], grafico: ["Título do gráfico"], linha: ["Título"], checklist: ["Título"], ranking: ["Título"]};
  var DICA_ITENS = {grafico: "Um por linha: Rótulo: número (ex.: 2024: 24)", linha: "Um por linha: quando — o quê (ex.: 2015 — nasce a produtora)", ranking: "Um por linha, do 1º para o último", checklist: "Um por linha (até 5)", lista: "Itens (um por linha, até 4)"};
  function textoPrincipal(c) { return USA_TITULO.indexOf(c.tipo) >= 0 ? (c.titulo || "") : (c.texto || ""); }
  function desenharCena() {
    var c = P.roteiro.cenas[SEL];
    $("cenaVazia").hidden = !!c; $("cenaForm").hidden = !c; if (!c) return;
    ["gTexto", "gEnfase", "gSub", "gChamada", "gItens", "gDado", "gAutor", "gAcao", "gPers", "gNum", "gForma", "gUnid", "gFonte2", "gEstrelas", "gMidia2"].forEach(function (g) { $(g).hidden = (CAMPOS[c.tipo] || []).indexOf(g) < 0; });
    $("cTipo").value = c.tipo; $("cDur").value = c.duracao;
    $("cTexto").value = textoPrincipal(c); $("cEnfase").value = (c.enfase || []).join(", "); $("cSub").value = c.subtitulo || ""; $("cChamada").value = c.chamada || "";
    $("cItens").value = (c.itens || []).join("\n"); $("cValor").value = c.valor != null ? c.valor : ""; $("cCasas").value = c.casas || 0;
    $("cPref").value = c.prefixo || ""; $("cSuf").value = c.sufixo || ""; $("cRotulo").value = c.rotulo || ""; $("cFonte").value = c.fonte || "";
    $("cAutor").value = c.autor || ""; $("cAcao").value = c.acao || ""; $("cMov").value = c.movimento || ""; $("cTrans").value = c.transicao || "";
    $("cIni").value = c.inicioNoArquivo || 0; $("cFala").value = c.fala || "";
    $("cTexto").previousElementSibling.textContent = (ROTULOS[c.tipo] || [])[0] || (c.tipo === "lista" ? "Título da lista" : c.tipo === "citacao" ? "Frase" : c.tipo === "personagem" ? "Texto no alto da tela (opcional)" : "Texto na tela");
    $("cSub").previousElementSibling.textContent = (ROTULOS[c.tipo] || [])[1] || "Subtítulo";
    $("cItens").previousElementSibling.textContent = DICA_ITENS[c.tipo] || "Itens (um por linha)";
    $("cChamada").previousElementSibling.textContent = c.tipo === "oferta" ? "Selo (ex.: OFERTA)" : "Etiqueta acima (opcional)";
    $("gExtra").hidden = ["gNum", "gForma", "gUnid", "gFonte2", "gEstrelas", "gMidia2"].every(function (g) { return $(g).hidden; });
    $("cNum").value = c.valor || 3; $("cForma").value = c.forma || "barras"; $("cUnid").value = c.sufixo || ""; $("cFonte2").value = c.fonte || ""; $("cEstrelas").value = String(c.estrelas || 5);
    if (c.tipo === "personagem") desenharPers(c);
    desenharMidias();
    $("cEsq").disabled = SEL === 0; $("cDir").disabled = SEL >= P.roteiro.cenas.length - 1;
  }
  function lerCena() {
    var c = P.roteiro.cenas[SEL]; if (!c) return;
    var tipo = $("cTipo").value, txt = $("cTexto").value.trim();
    var n = {tipo: tipo, duracao: Math.max(0.5, Math.min(30, Number(String($("cDur").value).replace(",", ".")) || 3))};
    if (USA_TITULO.indexOf(tipo) >= 0) n.titulo = txt; else if (tipo !== "dado") n.texto = txt;
    var enf = $("cEnfase").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean); if (enf.length) n.enfase = enf;
    if (["texto", "nome", "logo", "local", "aovivo", "dividida"].indexOf(tipo) >= 0 && $("cSub").value.trim()) n.subtitulo = $("cSub").value.trim();
    if ((tipo === "gancho" || tipo === "oferta") && $("cChamada").value.trim()) n.chamada = $("cChamada").value.trim();
    if (["lista", "grafico", "linha", "checklist", "ranking"].indexOf(tipo) >= 0) n.itens = $("cItens").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, tipo === "lista" ? 4 : tipo === "grafico" ? 6 : 5);
    if (tipo === "contagem") n.valor = Math.max(1, Math.min(10, Number($("cNum").value) || 3));
    if (tipo === "grafico") { n.forma = $("cForma").value; if ($("cUnid").value.trim()) n.sufixo = $("cUnid").value.trim(); if ($("cFonte2").value.trim()) n.fonte = $("cFonte2").value.trim(); }
    if (tipo === "depoimento") { n.estrelas = Number($("cEstrelas").value) || 5; if ($("cAutor").value.trim()) n.autor = $("cAutor").value.trim(); }
    if ((tipo === "antesdepois" || tipo === "dividida") && $("cMidia2").value) n.midia2 = $("cMidia2").value;
    if (tipo === "dado" || tipo === "oferta") {
      var v = Number(String($("cValor").value).replace(",", ".")); n.valor = isFinite(v) ? v : 0;
      if (Number($("cCasas").value)) n.casas = Number($("cCasas").value);
      if ($("cPref").value.trim()) n.prefixo = $("cPref").value.trim() + " ";
      if ($("cSuf").value.trim()) n.sufixo = ($("cSuf").value.trim().length > 2 ? " " : "") + $("cSuf").value.trim();
      n.rotulo = $("cRotulo").value.trim(); if (tipo === "dado" || $("cFonte").value.trim()) n.fonte = $("cFonte").value.trim();
      if (tipo === "oferta") { if (!$("cPref").value.trim()) n.prefixo = "R$ "; if (!n.rotulo) delete n.rotulo; }
    }
    if (tipo === "citacao" && $("cAutor").value.trim()) n.autor = $("cAutor").value.trim();
    if (tipo === "cta") n.acao = $("cAcao").value.trim();
    if ($("cMidia").value) { n.midia = $("cMidia").value; n.inicioNoArquivo = Math.max(0, Number(String($("cIni").value).replace(",", ".")) || 0); }
    if ($("cMov").value) n.movimento = $("cMov").value;
    if ($("cTrans").value) n.transicao = $("cTrans").value;
    if ($("cFala").value.trim()) n.fala = $("cFala").value.trim();
    if (tipo === "midia" && !n.texto) delete n.texto;
    if (tipo === "personagem") { if (!n.texto) delete n.texto; lerPers(n); }
    P.roteiro.cenas[SEL] = n;
  }
  ["cTipo", "cMidia", "cMov", "cTrans"].forEach(function (id) { $(id).addEventListener("change", function () {
    var era = (P.roteiro.cenas[SEL] || {}).tipo;
    var PADRAO_TIPO = {personagem: {personagem: "be", acao: "acena", balao: "Oi! Olha só isso", cenario: "raios", entrada: "pula"},
      logo: {texto: "SUA MARCA", subtitulo: "sua frase"}, nome: {titulo: "Nome da pessoa", subtitulo: "Cargo / empresa"}, contagem: {valor: 3, texto: "Começou!"},
      grafico: {titulo: "Título do gráfico", itens: ["2024: 10", "2025: 20"], fonte: "dados próprios"}, linha: {titulo: "Nossa história", itens: ["2015 — começo", "2025 — hoje"]},
      checklist: {titulo: "Checklist", itens: ["Primeiro item", "Segundo item"]}, ranking: {titulo: "Top 3", itens: ["Primeiro", "Segundo", "Terceiro"]},
      depoimento: {texto: "Escreva aqui a frase real do seu cliente", autor: "Nome do cliente", estrelas: 5}, local: {texto: "Local do evento", subtitulo: "Data · hora"},
      oferta: {chamada: "Oferta", texto: "Seu pacote", valor: 1000, prefixo: "R$ "}, aovivo: {texto: "Estamos no ar", subtitulo: "Link na bio"}, celular: {texto: "Assista de qualquer lugar"},
      antesdepois: {texto: "Olha a diferença"}, dividida: {texto: "Em cima", subtitulo: "Embaixo"}};
    if (id === "cTipo" && PADRAO_TIPO[this.value] && era !== this.value) { var d0 = Number(P.roteiro.cenas[SEL].duracao) || 3.5, velha = P.roteiro.cenas[SEL];
      var nova = Object.assign({tipo: this.value, duracao: Math.max(3, d0)}, JSON.parse(JSON.stringify(PADRAO_TIPO[this.value])));
      if (velha.midia && ["antesdepois", "dividida", "celular", "nome", "aovivo", "logo"].indexOf(this.value) >= 0) nova.midia = velha.midia;
      P.roteiro.cenas[SEL] = nova; salvar(); desenharCena(); atualizar(); return; }
    lerCena(); salvar(); desenharCena(); atualizar(); }); });
  ["cNum", "cUnid", "cFonte2"].forEach(function (id) { $(id).addEventListener("input", function () { lerCena(); salvar(); atualizar(); }); });
  ["cForma", "cEstrelas", "cMidia2"].forEach(function (id) { $(id).addEventListener("change", function () { lerCena(); salvar(); atualizar(); }); });
  ["cDur", "cTexto", "cEnfase", "cSub", "cChamada", "cItens", "cValor", "cCasas", "cPref", "cSuf", "cRotulo", "cFonte", "cAutor", "cAcao", "cIni", "cFala"].forEach(function (id) {
    $(id).addEventListener("input", function () { lerCena(); salvar(); atualizar(); });
  });

  /* ---------- cena PERSONAGEM (motor desenha e anima) ---------- */
  var NOMES_ACAO = {parado: "Parado", acena: "Acena", fala: "Fala", aponta: "Aponta", comemora: "Comemora", pensa: "Pensa", surpresa: "Se assusta"};
  var PS = {a: "be", b: ""};
  var corDe = function (id, cores) { var p = M.PERSONAGENS[id]; if (!p) return "#FFB547"; var c = Object.assign({}, p.cores, cores || {}); return p.desenho === "pessoa" ? c.roupa : c.detalhe; };
  function miniPers(id) { return M.svgPersonagem(id).replace(/id="bwLente"/g, 'id="bwL' + id + '"').replace(/url\(#bwLente\)/g, "url(#bwL" + id + ")"); }
  function elencoDe(c) { return Array.isArray(c.elenco) && !c.elenco.length && c.midia ? [] : c.elenco && c.elenco.length ? c.elenco : [{personagem: c.personagem || "be", acao: c.acao}]; }
  var idAtor = function (a) { return a ? (a.personagem === "foto" ? "foto:" + a.imagem : a.personagem === "meu" ? "meu:" + (a.libId || "x") : a.personagem || "be") : ""; };
  var atorDe = function (id) {
    if (id.indexOf("foto:") === 0) return {personagem: "foto", imagem: id.slice(5)};
    if (id.indexOf("meu:") === 0) { var L = LIB.find(function (x) { return x.id === id.slice(4); }); if (L) return {personagem: "meu", libId: L.id, nome: L.nome, look: JSON.parse(JSON.stringify(L.look))};
      var c = (P.roteiro.cenas[SEL] || {}), velho = elencoDe(c).find(function (a) { return a.personagem === "meu" && "meu:" + a.libId === id; }); return velho ? JSON.parse(JSON.stringify(velho)) : {personagem: "be"}; }
    return {personagem: id};
  };
  var nomeAtor = function (id) {
    if (id.indexOf("meu:") === 0 || id.indexOf("lib:") === 0) { var L = LIB.find(function (x) { return x.id === id.slice(4); }); if (L) return L.nome.split(" ")[0];
      var a = elencoDe(P.roteiro.cenas[SEL] || {}).find(function (x) { return idAtor(x) === id; }); return a && a.nome ? a.nome.split(" ")[0] : "Meu"; }
    if (id.indexOf("foto:") === 0) { var m = MID.find(function (x) { return x.caminho === id.slice(5); }); return (P.avatarNome || (m && m.nome.replace(/\.[^.]+$/, "")) || "Meu").split(" ")[0]; } return (M.PERSONAGENS[id] || {nome: "?"}).nome.split(" ")[0]; };
  function avatares() { return MID.filter(function (m) { return m.tipo === "imagem" && /\/avatar-/.test(m.caminho); }); }
  function desenharPers(c) {
    var el = elencoDe(c); PS.a = el[0] ? idAtor(el[0]) : (c.midia ? "" : "be"); PS.b = el[1] ? idAtor(el[1]) : "";
    var usadosMeu = elencoDe(c).filter(function (a) { return a.personagem === "meu"; }).map(idAtor);
    var ids = avatares().map(function (m) { return "foto:" + m.caminho; })
      .concat(LIB.map(function (L) { return (L.tipo === "montado" ? "meu:" : "lib:") + L.id; }))
      .concat(usadosMeu.filter(function (id) { return !LIB.some(function (L) { return "meu:" + L.id === id; }); }))
      .concat(Object.keys(M.PERSONAGENS));
    ids = ids.filter(function (id, i) { return ids.indexOf(id) === i; });
    var botao = function (id, sel, grupo) { var foto = id.indexOf("foto:") === 0, lib = id.indexOf("lib:") === 0, meu = id.indexOf("meu:") === 0;
      var vis = foto ? '<img src="' + urlDe(id.slice(5)) + '" alt="">' : lib ? '<img src="' + libUrl(id.slice(4)) + '" alt="">' : meu ? miniLook(atorDe(id).look || {}, id) : miniPers(id);
      return '<button type="button" class="ps-bt' + (id === sel ? " on" : "") + '" data-ps="' + grupo + '" data-id="' + esc(id) + '" aria-pressed="' + (id === sel) + '"><span>' + vis + '</span>' + esc(nomeAtor(id)) + '</button>'; };
    $("psA").innerHTML = (c.midia ? '<button type="button" class="ps-bt nada' + (!PS.a ? " on" : "") + '" data-ps="a" data-id="" aria-pressed="' + !PS.a + '"><span>🖼</span>Só imagem</button>' : "") + ids.map(function (id) { return botao(id, PS.a, "a"); }).join("");
    $("psB").innerHTML = '<button type="button" class="ps-bt nada' + (!PS.b ? " on" : "") + '" data-ps="b" data-id="" aria-pressed="' + !PS.b + '"><span>—</span>Ninguém</button>' + ids.map(function (id) { return botao(id, PS.b, "b"); }).join("");
    var ops = M.ACOES.map(function (a) { return '<option value="' + a + '">' + NOMES_ACAO[a] + '</option>'; }).join("");
    $("psAcaoA").innerHTML = '<option value="">Automático (fala quando tem balão)</option>' + ops; $("psAcaoB").innerHTML = $("psAcaoA").innerHTML;
    $("psAcaoA").value = el[0] && el[0].acao || ""; $("psAcaoB").value = el[1] && el[1].acao || "";
    var semCor = function (id) { return id.indexOf("foto:") === 0 || id.indexOf("meu:") === 0; };
    var fA = semCor(PS.a), fB = semCor(PS.b);
    $("psCorBoxA").hidden = fA; $("psEspBoxA").hidden = !fA; $("psCorBoxB").hidden = fB; $("psEspBoxB").hidden = !fB;
    $("psEspA").checked = !!(el[0] && el[0].espelhar); $("psEspB").checked = !!(el[1] && el[1].espelhar);
    $("psCorA").value = fA ? "#FFB547" : corDe(PS.a, el[0] && el[0].cores); $("psCorB").value = fB || !PS.b ? "#FFB547" : corDe(PS.b, el[1] && el[1].cores);
    $("psLinhaB").hidden = !PS.b;
    var falas = c.falas && c.falas.length ? c.falas : (c.balao ? [{quem: 0, texto: c.balao}] : []);
    var nomeA = PS.a ? nomeAtor(PS.a) : "Balão", nomeB = PS.b ? nomeAtor(PS.b) : "";
    var linhas = ""; for (var k = 0; k < 4; k++) { var f = falas[k] || {quem: k % 2 && PS.b ? 1 : 0, texto: ""};
      linhas += '<div class="ps-fala"><select id="psQuem' + k + '" aria-label="Quem fala ' + (k + 1) + '"><option value="0">' + esc(nomeA) + '</option>' + (PS.b ? '<option value="1"' + (f.quem === 1 ? " selected" : "") + '>' + esc(nomeB) + '</option>' : "") + '</select>' +
        '<input id="psFala' + k + '" aria-label="Fala ' + (k + 1) + '" value="' + esc(f.texto) + '" placeholder="' + (k ? "(opcional)" : "ex.: Seu evento ao vivo!") + '"></div>'; }
    $("psFalas").innerHTML = linhas;
    $("psCenario").value = c.cenario || "raios"; $("psEntrada").value = c.entrada || "pula";
  }
  function lerPers(n) {
    var coresDe = function (id, cor) { var p = M.PERSONAGENS[id]; if (!p || cor.toLowerCase() === String(corDe(id)).toLowerCase()) return null; var o = {}; o[p.desenho === "pessoa" ? "roupa" : "detalhe"] = cor; return o; };
    var antes = elencoDe(P.roteiro.cenas[SEL] || {});
    var monta = function (id, acao, cor, esp, velho) { var o = atorDe(id); if (acao) o.acao = acao;
      if (o.personagem === "meu") return o;
      if (o.personagem === "foto") { if (esp) o.espelhar = true; if (velho && velho.contorno === false && idAtor(velho) === id) o.contorno = false; }
      else { var cc = coresDe(o.personagem, cor); if (cc) o.cores = cc; } return o; };
    if (!PS.a && !n.midia) PS.a = "be";
    var el = PS.a ? [monta(PS.a, $("psAcaoA").value, $("psCorA").value, $("psEspA").checked, antes[0])] : [];
    if (PS.a && PS.b) el.push(monta(PS.b, $("psAcaoB").value, $("psCorB").value, $("psEspB").checked, antes[1]));
    n.elenco = el;
    var falas = []; for (var k = 0; k < 4; k++) { var t = ($("psFala" + k) || {}).value; if (t && t.trim()) falas.push({quem: PS.b ? Number($("psQuem" + k).value) || 0 : 0, texto: t.trim()}); }
    if (falas.length) n.falas = falas;
    n.cenario = $("psCenario").value; n.entrada = $("psEntrada").value;
  }
  ["psA", "psB"].forEach(function (id) {
    $(id).addEventListener("click", async function (e) {
      var b = e.target.closest("[data-ps]"); if (!b) return;
      if (b.dataset.id.indexOf("lib:") === 0) { var cam = await fotoDaLib(b.dataset.id.slice(4)); if (!cam) return; b.dataset.id = "foto:" + cam; }
      lerCena(); var c = P.roteiro.cenas[SEL]; var el = elencoDe(c).map(function (x) { return Object.assign({}, x); });
      if (!el.length && !(b.dataset.ps === "a" && !b.dataset.id)) el = [{personagem: "be"}];
      if (b.dataset.ps === "a" && !b.dataset.id) { el = []; c.falas = (c.falas || []).map(function (f) { return {quem: 0, texto: f.texto}; }); }
      else if (b.dataset.ps === "a") { el[0] = atorDe(b.dataset.id); }
      else if (!b.dataset.id) { el = [el[0]]; (c.falas || []).forEach(function (f) { f.quem = 0; }); }
      else { el[1] = atorDe(b.dataset.id); }
      c.elenco = el; delete c.personagem; delete c.acao; salvar(); desenharCena(); atualizar();
    });
  });
  ["psAcaoA", "psAcaoB", "psCenario", "psEntrada"].forEach(function (id) { $(id).addEventListener("change", function () { lerCena(); salvar(); atualizar(); }); });
  ["psCorA", "psCorB"].forEach(function (id) { $(id).addEventListener("input", function () { lerCena(); salvar(); atualizar(); }); });
  ["psEspA", "psEspB"].forEach(function (id) { $(id).addEventListener("change", function () { lerCena(); salvar(); atualizar(); }); });
  $("psFalas").addEventListener("input", function () { lerCena(); salvar(); atualizar(); });
  $("psFalas").addEventListener("change", function () { lerCena(); salvar(); atualizar(); });

  function mover(d) { var cs = P.roteiro.cenas, j = SEL + d; if (j < 0 || j >= cs.length) return; var x = cs[SEL]; cs[SEL] = cs[j]; cs[j] = x; SEL = j; salvar(); desenharTudo(); atualizar(); }
  $("cEsq").onclick = function () { mover(-1); };
  $("cDir").onclick = function () { mover(1); };
  $("cDup").onclick = function () { P.roteiro.cenas.splice(SEL + 1, 0, JSON.parse(JSON.stringify(P.roteiro.cenas[SEL]))); SEL++; salvar(); desenharTudo(); atualizar(); };
  $("cDel").onclick = function () {
    if (P.roteiro.cenas.length <= 1) { alert("O vídeo precisa de pelo menos uma cena."); return; }
    if (!confirm("Excluir a cena " + (SEL + 1) + "?")) return;
    P.roteiro.cenas.splice(SEL, 1); SEL = Math.max(0, SEL - 1); salvar(); desenharTudo(); atualizar();
  };

  /* ---------- abas e passos ---------- */
  function trocarAba(a) {
    ABA = a;
    [].forEach.call(document.querySelectorAll(".rl-abas button"), function (b) { var on = b.dataset.aba === a; b.classList.toggle("on", on); b.setAttribute("aria-selected", on ? "true" : "false"); });
    $("pnCriar").hidden = a !== "criar"; $("pnCena").hidden = a !== "cena"; $("pnMidia").hidden = a !== "midia"; $("pnExportar").hidden = a !== "exportar";
    if (a === "exportar") validar(true);
  }
  [].forEach.call(document.querySelectorAll(".rl-abas button"), function (b) { b.onclick = function () { trocarAba(b.dataset.aba); }; });
  function trocarPasso(p) {
    PASSO = p;
    [].forEach.call(document.querySelectorAll("#passos button"), function (b) { b.classList.toggle("on", b.dataset.passo === p); });
    $("psAssunto").hidden = p !== "assunto"; $("psGancho").hidden = p !== "gancho"; $("psFontes").hidden = p !== "fontes"; $("psEstilo").hidden = p !== "estilo";
    if (p === "gancho") desenharGanchos(); if (p === "fontes") desenharFatos(); if (p === "estilo") desenharEstilo();
  }
  [].forEach.call(document.querySelectorAll("#passos button"), function (b) { b.onclick = function () { trocarPasso(b.dataset.passo); }; });

  /* ---------- briefing ---------- */
  var BRIEF = {fAssunto: "assunto", fNicho: "nicho", fCta: "cta", fPublico: "publico", fPerfil: "perfil", fFatos: "fatos"};
  Object.keys(BRIEF).forEach(function (id) { $(id).addEventListener("input", function () { P.briefing[BRIEF[id]] = this.value; if (id === "fAssunto" && !P.nome) { $("nomeProj").placeholder = this.value.slice(0, 50) || "Nome do vídeo"; } salvar(); }); $(id).addEventListener("change", function () { P.briefing[BRIEF[id]] = this.value; salvar(); }); });
  $("nomeProj").addEventListener("input", function () { P.nome = this.value; salvar(); });

  /* ---------- IA ---------- */
  var SISTEMA = "Você é diretor de criação de Reels/TikTok no Brasil. Responda SÓ com JSON válido, sem texto fora dele, no formato: " +
    "{\"ganchos\":[{\"padrao\":\"...\",\"texto\":\"...\",\"quadro\":\"...\",\"nota\":4.5}]," +
    "\"cenas\":[{\"tipo\":\"texto\",\"duracao\":3.5,\"titulo\":\"...\",\"subtitulo\":\"...\",\"enfase\":[\"...\"],\"fala\":\"...\"}]," +
    "\"fatos\":[\"...\"],\"legenda\":\"...\"}. Regras: 5 ganchos de padrões diferentes (contradição, pergunta, perda, bastidor, número, lista, antes/depois), " +
    "cada texto com no máximo 9 palavras, verdadeiro e entregue pelo vídeo; nota de 1 a 5. Cenas: 4 a 6 cenas DEPOIS do gancho (o gancho não entra em cenas), " +
    "tipos permitidos: texto (titulo, subtitulo), lista (titulo, itens até 4), checklist (titulo, itens até 5 que vão sendo marcados), ranking (titulo, itens até 5, o 1º primeiro), dado (valor numérico, prefixo, sufixo, rotulo, fonte), cta (texto, acao). Não use citações nem atribua frases a pessoas. " +
    "A última cena é cta. Duração 2.5 a 5 s; no máximo 3 palavras por segundo de texto na tela. enfase = 1 ou 2 palavras do próprio texto. " +
    "NUNCA invente números, estatísticas, estudos ou nomes: cena dado só com números que o usuário informou, com fonte \"interno: informado pelo usuário\". " +
    "fatos = cada afirmação factual do roteiro que precisa de fonte. legenda = legenda do post em português do Brasil com 3 a 5 hashtags específicas, sem prometer resultado.";
  function extrairJSON(t) {
    t = String(t || "").replace(/```json|```/g, "");
    var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
  }
  async function chamarIA() {
    var s = await sessao(); if (!s) return {erro: "sem_login"};
    var b = P.briefing;
    var pedido = "Assunto: " + b.assunto + "\nNicho: " + b.nicho + "\nPúblico: " + (b.publico || "não informado") + "\nChamada final: " + (b.cta || "seguir o perfil") +
      "\nPerfil: " + (b.perfil || "") + "\nNúmeros e fatos que o usuário pode provar: " + (b.fatos || "nenhum") + "\nIdioma: português do Brasil, tom descontraído e direto." +
      (P.modo === "personagem" ? "\nFORMATO: HISTÓRIA COM PERSONAGENS. Use principalmente cenas do tipo personagem: {\"tipo\":\"personagem\",\"duracao\":4,\"elenco\":[{\"personagem\":\"ana\"},{\"personagem\":\"be\"}],\"falas\":[{\"quem\":0,\"texto\":\"...\"},{\"quem\":1,\"texto\":\"...\"}],\"cenario\":\"palco\"}. " +
        "Personagens: be (mascote câmera), ana, leo, bia, rui, robo; ações (campo acao em cada item do elenco): parado, acena, fala, aponta, comemora, pensa, surpresa; cenario: raios, palco, bolinhas. " +
        "No máximo 2 personagens por cena, falas curtas (até 10 palavras), no máximo 2,5 palavras por segundo. Conte uma mini-história: problema, virada, solução. Pode misturar 1 cena lista. A última cena é cta." : "");
    try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB},
        body: JSON.stringify({sistema: SISTEMA, pedido: pedido, max: 1200})});
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) return {erro: j.erro || ("http_" + r.status)};
      var d = extrairJSON(j.texto); return d ? {dados: d} : {erro: "formato"};
    } catch (e) { return {erro: "rede"}; }
  }
  var TIPOS_OK = ["texto", "lista", "dado", "citacao", "cta", "personagem", "checklist", "ranking"];
  function normalizarCenas(lista, b) {
    var out = [];
    (lista || []).forEach(function (c) {
      if (!c || TIPOS_OK.indexOf(c.tipo) < 0) return;
      var n = {tipo: c.tipo, duracao: Math.max(2.5, Math.min(6, Number(c.duracao) || 3.5))};
      if (c.tipo === "personagem") {
        var IDS = Object.keys(M.PERSONAGENS);
        var el = (Array.isArray(c.elenco) && c.elenco.length ? c.elenco : [{personagem: c.personagem, acao: c.acao}]).slice(0, 2).map(function (a) {
          var o = {personagem: IDS.indexOf(a && a.personagem) >= 0 ? a.personagem : "be"}; if (a && M.ACOES.indexOf(a.acao) >= 0) o.acao = a.acao; return o; });
        var fs = (Array.isArray(c.falas) ? c.falas : (c.balao ? [{quem: 0, texto: c.balao}] : [])).map(function (f) { return {quem: el.length > 1 && Number(f && f.quem) === 1 ? 1 : 0, texto: palavras(f && f.texto).slice(0, 14).join(" ")}; }).filter(function (f) { return f.texto; }).slice(0, 4);
        n.elenco = el; if (fs.length) n.falas = fs;
        n.cenario = ["raios", "palco", "bolinhas"].indexOf(c.cenario) >= 0 ? c.cenario : "raios";
        n.entrada = out.length && out[out.length - 1].tipo === "personagem" ? "nenhuma" : "pula";
        var pw = fs.reduce(function (s2, f) { return s2 + palavras(f.texto).length; }, 0); n.duracao = Math.max(n.duracao, Math.min(8, pw / 2.4 + 1));
        out.push(n); return;
      }
      ["titulo", "subtitulo", "texto", "autor", "acao", "rotulo", "fonte", "prefixo", "sufixo", "fala"].forEach(function (k) { if (c[k] != null && String(c[k]).trim()) n[k] = String(c[k]).trim(); });
      if (Array.isArray(c.enfase)) n.enfase = c.enfase.map(String).slice(0, 2);
      if (c.tipo === "lista" || c.tipo === "checklist" || c.tipo === "ranking") n.itens = (Array.isArray(c.itens) ? c.itens : []).map(String).filter(Boolean).slice(0, c.tipo === "lista" ? 4 : 5);
      if (c.tipo === "dado") { var v = Number(c.valor); if (!isFinite(v)) return; n.valor = v; if (n.prefixo) n.prefixo = n.prefixo + " "; if (n.sufixo && n.sufixo.length > 2) n.sufixo = " " + n.sufixo; }
      if (c.tipo === "texto" && !n.titulo && n.texto) { n.titulo = n.texto; delete n.texto; }
      if ((c.tipo === "lista" || c.tipo === "checklist" || c.tipo === "ranking") && !n.itens.length) return;
      if (c.tipo === "dado" && /interno|usu[aá]rio/i.test(n.fonte || "")) { n.fonte = "dados próprios"; n.interno = true; }
      if (c.tipo === "citacao") { n.tipo = "texto"; n.titulo = n.texto; delete n.texto; delete n.autor; }   // a IA não tem depoimento real: citação só o usuário escreve (não inventar quem disse)
      out.push(n);
    });
    if (!out.length || out[out.length - 1].tipo !== "cta") out.push({tipo: "cta", duracao: 3, texto: "Gostou? Então fala comigo", acao: b.cta || b.perfil || "Me chama no direct"});
    else if (!out[out.length - 1].acao) out[out.length - 1].acao = b.cta || b.perfil || "Me chama no direct";
    return out;
  }
  function modeloPronto(b) {
    var tema = (b.assunto || "o seu assunto").trim().replace(/[.!?]+$/, ""); var curto = tema.length > 38 ? tema.slice(0, 38).replace(/\s+\S*$/, "") : tema;
    return {
      ganchos: [
        {padrao: "Bastidor", texto: "O que ninguém te conta sobre " + curto, quadro: "você olhando para a câmera, close", nota: 0},
        {padrao: "Pergunta", texto: "Você está fazendo isso do jeito difícil?", quadro: "movimento rápido no seu trabalho", nota: 0},
        {padrao: "Lista", texto: "3 coisas antes de " + curto, quadro: "número 3 gigante na tela", nota: 0},
        {padrao: "Contradição", texto: "Todo mundo acha que é caro. Não é.", quadro: "resultado final primeiro", nota: 0},
        {padrao: "Alerta", texto: "Pare de errar em " + curto, quadro: "gesto de pare para a câmera", nota: 0}
      ],
      cenas: [
        {tipo: "texto", duracao: 3.5, titulo: "Quase todo mundo erra nisso", subtitulo: "E dá para evitar."},
        {tipo: "lista", duracao: 5, titulo: "O que fazer", itens: ["[primeiro ponto]", "[segundo ponto]", "[terceiro ponto]"]},
        {tipo: "texto", duracao: 3.5, titulo: "[a virada: o resultado]", enfase: ["resultado"]},
        {tipo: "cta", duracao: 3, texto: "Quer isso no seu próximo projeto?", acao: b.cta || b.perfil || "Me chama no direct"}
      ],
      fatos: [], legenda: ""
    };
  }
  $("btGerar").onclick = async function () {
    var b = P.briefing; if (!String(b.assunto || "").trim()) { $("fAssunto").focus(); alert("Escreva sobre o que é o vídeo."); return; }
    ocupado("A IA está criando os ganchos e o roteiro…");
    var r = await chamarIA(); var d, nota = "";
    if (r.dados) { d = r.dados; nota = "Criado pela IA Brightway."; }
    else {
      d = modeloPronto(b);
      nota = r.erro === "sem_login" ? "Sem login: usei um modelo pronto. Entre na sua conta para a IA criar tudo." :
             r.erro === "limite" ? "A IA chegou ao limite de hoje (60 pedidos): usei um modelo pronto. Edite os textos entre colchetes." :
             "A IA não respondeu agora: usei um modelo pronto. Edite os textos entre colchetes.";
    }
    ocupado();
    P.ganchos = (d.ganchos || []).filter(function (g) { return g && g.texto; }).slice(0, 5).map(function (g) {
      return {padrao: String(g.padrao || ""), texto: palavras(g.texto).slice(0, 12).join(" "), quadro: String(g.quadro || ""), nota: Number(g.nota) || 0};
    });
    var cenas = normalizarCenas(d.cenas, b);
    var gancho = P.roteiro.cenas[0] && P.roteiro.cenas[0].tipo === "gancho" ? P.roteiro.cenas[0] : {tipo: "gancho", duracao: 3};
    P.roteiro.cenas = [gancho].concat(cenas);
    P.fatos = (d.fatos || []).map(function (f) { return {afirmacao: String(typeof f === "string" ? f : (f && (f.afirmacao || f.texto)) || ""), fonte: ""}; }).filter(function (f) { return f.afirmacao; });
    /* número que o próprio usuário informou = fonte "interno: dados próprios" (já vem pronto, sem bloquear o vídeo) */
    var proprios = String(b.fatos || "");
    cenas.forEach(function (c) {
      var interno = c.interno || (proprios && proprios.indexOf(String(c.valor)) >= 0);
      delete c.interno;
      if (c.tipo !== "dado") return;
      if (interno && !c.fonte) c.fonte = "dados próprios";
      var achou = false;
      P.fatos.forEach(function (f) { if (f.afirmacao.indexOf(String(c.valor)) >= 0) { achou = true; if (interno && !f.fonte) f.fonte = "interno: dados próprios"; } });
      if (!achou) P.fatos.push({afirmacao: ((c.prefixo || "") + c.valor + (c.sufixo || "") + " " + (c.rotulo || "")).trim(), fonte: interno ? "interno: dados próprios" : ""});
    });
    P.roteiro.fontes = fontesDoRoteiro();
    P.legenda = d.legenda || P.legenda || ""; $("fLegenda").value = P.legenda;
    if (P.briefing.perfil) P.roteiro.marca = {handle: P.roteiro.marca && P.roteiro.marca.handle || ""};
    P.ganchoEsc = P.ganchos.length ? 0 : -1; if (P.ganchos.length) aplicarGancho(P.ganchos[0].texto);
    if (!P.nome) { P.nome = b.assunto.slice(0, 60); $("nomeProj").value = P.nome; }
    $("motorNota").textContent = nota;
    SEL = 0; salvar(); desenharTudo(); atualizar(); trocarPasso("gancho");
  };
  function aplicarGancho(txt) {
    var c = P.roteiro.cenas[0]; if (!c || c.tipo !== "gancho") { c = {tipo: "gancho", duracao: 3}; P.roteiro.cenas.unshift(c); }
    c.texto = txt; c.duracao = Math.max(2.5, Math.min(3.5, palavras(txt).length / 3 + 0.5));
    var ps = palavras(txt).filter(function (w) { return w.replace(/[^\wÀ-ú]/g, "").length > 4; });
    c.enfase = ps.length ? [ps.sort(function (a, b) { return b.length - a.length; })[0].replace(/[^\wÀ-ú%]/g, "")] : [];
  }
  function desenharGanchos() {
    var box = $("ganchos");
    if (!P.ganchos.length) { box.innerHTML = '<p class="rl-aviso">Preencha o passo 1 e toque em ✨ CRIAR GANCHOS E ROTEIRO, ou escreva o seu gancho abaixo.</p>'; return; }
    box.innerHTML = P.ganchos.map(function (g, i) {
      return '<button type="button" class="rl-gancho' + (i === P.ganchoEsc ? " on" : "") + '" data-g="' + i + '"><span class="m"><span>' + esc(g.padrao) + '</span>' + (g.nota ? '<b>' + String(g.nota).replace(".", ",") + ' / 5</b>' : '<b>modelo</b>') + '</span>' +
        '<span class="t">' + esc(g.texto) + '</span>' + (g.quadro ? '<span class="q">1º quadro: ' + esc(g.quadro) + '</span>' : '') + '</button>';
    }).join("");
  }
  $("ganchos").addEventListener("click", function (e) {
    var b = e.target.closest(".rl-gancho"); if (!b) return;
    P.ganchoEsc = Number(b.dataset.g); aplicarGancho(P.ganchos[P.ganchoEsc].texto); $("fGanchoTxt").value = "";
    salvar(); desenharGanchos(); desenharLinha(); atualizar(); SEL = 0; parar(); posicionar(1.2);
  });
  $("fGanchoTxt").addEventListener("input", function () { if (this.value.trim()) { P.ganchoEsc = -1; aplicarGancho(this.value.trim()); salvar(); desenharGanchos(); atualizar(); } });
  $("btGanchoOk").onclick = function () { trocarPasso("fontes"); };

  /* ---------- fontes ---------- */
  function desenharFatos() {
    var box = $("fatos");
    if (!P.fatos.length) { box.innerHTML = '<p class="rl-aviso ok">Nenhuma afirmação que precise de fonte. Se você colocar números no vídeo, informe a fonte na cena.</p>'; return; }
    box.innerHTML = P.fatos.map(function (f, i) {
      var ok = !!String(f.fonte || "").trim();
      return '<div class="rl-fato"><span class="rl-selo ' + (ok ? "ok" : "falta") + '">' + (ok ? "Com fonte" : "Falta fonte") + '</span><p>' + esc(f.afirmacao) + '</p>' +
        '<label class="rl-nota" for="fonte' + i + '" style="display:block;margin:0 0 4px">Fonte (link ou "interno: …")</label><input id="fonte' + i + '" data-f="' + i + '" value="' + esc(f.fonte || "") + '" placeholder="https://… ou interno: dado da empresa"></div>';
    }).join("");
  }
  $("fatos").addEventListener("input", function (e) { var i = e.target.dataset.f; if (i == null) return; P.fatos[Number(i)].fonte = e.target.value; P.roteiro.fontes = fontesDoRoteiro(); salvar(); });
  $("fatos").addEventListener("change", desenharFatos);
  function fontesDoRoteiro() {
    var hoje = new Date(); var data = hoje.getFullYear() + "-" + String(hoje.getMonth() + 1).padStart(2, "0");
    return P.fatos.filter(function (f) { return String(f.fonte || "").trim(); }).map(function (f) { return {afirmacao: f.afirmacao, url: f.fonte.trim(), data: data}; });
  }
  $("btSemFonte").onclick = function () {
    var sem = P.fatos.filter(function (f) { return !String(f.fonte || "").trim(); });
    if (!sem.length) { alert("Tudo tem fonte."); return; }
    if (!confirm("Tirar do vídeo " + sem.length + " afirmação(ões) sem fonte? As cenas de número sem fonte serão removidas.")) return;
    var antes = P.roteiro.cenas.length;
    P.roteiro.cenas = P.roteiro.cenas.filter(function (c) { return !(c.tipo === "dado" && !String(c.fonte || "").trim()); });
    P.fatos = P.fatos.filter(function (f) { return String(f.fonte || "").trim(); });
    P.roteiro.fontes = fontesDoRoteiro(); SEL = 0; salvar(); desenharTudo(); atualizar(); desenharFatos();
    alert((antes - P.roteiro.cenas.length) + " cena(s) removida(s). Revise os textos que citavam dados sem fonte.");
  };
  $("btFontesOk").onclick = function () { P.roteiro.fontes = fontesDoRoteiro(); salvar(); trocarPasso("estilo"); };

  /* ---------- estilo ---------- */
  var ESTILOS_UI = [["cinema", "Cinema", "#0b0b0c", "#e8b04a", "Anton"], ["corporativo", "Corporativo", "#0a1626", "#3ec7f2", "Inter"], ["neon", "Neon", "#07060d", "#ff3db8", "Anton"],
    ["editorial", "Editorial", "#f2eee6", "#d6452b", "Georgia"], ["luxo", "Luxo", "#0e0d0b", "#c9a96e", "Georgia"]];
  function desenharEstilo() {
    var r = P.roteiro;
    $("estilos").innerHTML = ESTILOS_UI.map(function (e) { return '<button type="button" class="rl-estilo' + (r.estilo === e[0] ? " on" : "") + '" data-e="' + e[0] + '"><i style="background:' + e[2] + ';color:' + e[3] + ';font-family:' + e[4] + '">Aa</i>' + e[1] + '</button>'; }).join("");
    $("formatos").innerHTML = ["9:16", "4:5", "1:1", "16:9"].map(function (f) { return '<button type="button" class="rl-chip' + (r.formato === f ? " on" : "") + '" data-f="' + f + '">' + f + '</button>'; }).join("");
    var fx = r.efeitos || {};
    $("fxGrao").checked = fx.grao !== false; $("fxVinheta").checked = fx.vinheta !== false; $("fxLetter").checked = !!fx.letterbox; $("fxBarra").checked = fx.barraProgresso !== false;
    $("fxLeg").checked = (r.legendas || {}).ativas !== false; $("fMarca").value = (r.marca || {}).handle || "";
  }
  $("estilos").addEventListener("click", function (e) { var b = e.target.closest("[data-e]"); if (!b) return; P.roteiro.estilo = b.dataset.e; salvar(); desenharEstilo(); atualizar(); });
  $("formatos").addEventListener("click", function (e) { var b = e.target.closest("[data-f]"); if (!b) return; P.roteiro.formato = b.dataset.f; salvar(); desenharEstilo(); atualizar(); });
  [["fxGrao", "grao"], ["fxVinheta", "vinheta"], ["fxLetter", "letterbox"], ["fxBarra", "barraProgresso"]].forEach(function (p) {
    $(p[0]).onchange = function () { P.roteiro.efeitos = P.roteiro.efeitos || {}; P.roteiro.efeitos[p[1]] = this.checked; salvar(); atualizar(); };
  });
  $("fxLeg").onchange = function () { P.roteiro.legendas = P.roteiro.legendas || {}; P.roteiro.legendas.ativas = this.checked; salvar(); atualizar(); };
  $("fMarca").oninput = function () { P.roteiro.marca = {handle: this.value.trim()}; salvar(); atualizar(); };

  /* ---------- validação ---------- */
  function validar(mostrar) {
    var av = [], er = [];
    try { er = M.validarRoteiro(P.roteiro, null, av); } catch (e) { er = ["roteiro inválido"]; }
    P.roteiro.cenas.forEach(function (c) { if (c.midia && !urlDe(c.midia)) er.push("cena " + (P.roteiro.cenas.indexOf(c) + 1) + ": a mídia não está mais neste aparelho");
      if (c.midia2 && !urlDe(c.midia2)) er.push("cena " + (P.roteiro.cenas.indexOf(c) + 1) + ": a segunda mídia não está mais neste aparelho");
      (c.elenco || []).forEach(function (a) { if (a.personagem === "foto" && !urlDe(a.imagem)) er.push("cena " + (P.roteiro.cenas.indexOf(c) + 1) + ": a foto do personagem não está mais neste aparelho"); }); });
    ERROS_CENA = {};
    er.concat(av).forEach(function (m) { var x = /cena (\d+)/.exec(m); if (x) ERROS_CENA[Number(x[1]) - 1] = true; });
    if (mostrar !== false) {
      $("validacao").innerHTML = er.length ? '<p class="rl-aviso erro"><b>Corrija antes de gerar o vídeo:</b><br>' + er.map(esc).join("<br>") + '</p>' :
        av.length ? '<p class="rl-aviso"><b>Pronto para gerar</b>, com avisos:<br>' + av.map(esc).join("<br>") + '</p>' : '<p class="rl-aviso ok"><b>✓ Pronto para gerar.</b></p>';
    }
    return {erros: er, avisos: av};
  }

  /* ---------- exportar ---------- */
  function baixar(blob, nome) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  function roteiroFinal() { var r = JSON.parse(JSON.stringify(P.roteiro)); r.titulo = P.nome || "Reel"; r.motor = "nativo"; r.fontes = fontesDoRoteiro(); return r; }
  function carregarJSZip() {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"; s.onload = function () { ok(window.JSZip); }; s.onerror = function () { erro(new Error("jszip")); }; document.head.appendChild(s); });
  }
  /* ---------- gerar o MP4 neste aparelho (assets/reels-celular.js) ---------- */
  var AQUI = {rodando: false, parar: false, url: null, arquivo: null};
  function estadoAqui(html) { $("aquiEstado").innerHTML = html; }
  (async function () {
    var C = window.BWReelsCelular, pode = C && await C.suporta();
    if (!pode) { $("btAqui").disabled = true; estadoAqui('<div class="rl-aviso">Este navegador ainda não consegue gerar o vídeo sozinho. Atualize o aparelho, abra no Chrome (Android/PC) ou use RENDERIZAR NO PC.</div>'); }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) === false) $("fQualAqui").value = "1920";
  })();
  $("btAqui").onclick = async function () {
    if (AQUI.rodando) { AQUI.parar = true; return; }
    var v = validar(true); if (v.erros.length) { alert("Corrija os itens em vermelho antes de gerar o vídeo."); return; }
    var r = P.roteiro, a = r.audio || {}, plano, html, som = null, obs = [];
    try { plano = M.criarPlano(roteiroParaPrevia()); html = M.construirHtml(plano, "nativo"); } catch (e) { estadoAqui('<div class="rl-aviso erro">Não consegui montar o vídeo: ' + esc(e.message) + '</div>'); return; }
    try { var s = M.sintetizarSons(M.criarPlano(JSON.parse(JSON.stringify(r))), {sr: 48000}); som = M.misturar(s.trilha, s.efeitos); } catch (e) { som = null; }
    if (a.musica || a.narracao) obs.push("a música ou narração que você enviou só entra no vídeo feito no computador");
    var actx = null; try { actx = new (window.AudioContext || window.webkitAudioContext)(); actx.resume(); } catch (e) { actx = null; }   // criado dentro do toque (iPhone)
    AQUI.rodando = true; AQUI.parar = false; $("btAqui").textContent = "✕ CANCELAR"; var t0 = Date.now();
    estadoAqui('<div class="rl-aviso"><b id="aquiTxt">Preparando…</b><div style="height:10px;border-radius:5px;background:rgba(255,255,255,.12);margin-top:8px;overflow:hidden"><div id="aquiBarra" style="height:100%;width:0;background:#FFB547"></div></div></div>');
    try {
      var res = await window.BWReelsCelular.gerar({html: html, largura: plano.largura, altura: plano.altura, fps: plano.fps || 30, duracao: plano.duracao, som: som, audioCtx: actx, alturaSaida: Number($("fQualAqui").value),
        cancelar: function () { return AQUI.parar; }, aoProgredir: function (p) { if ($("aquiBarra")) { $("aquiBarra").style.width = p.pct + "%"; $("aquiTxt").textContent = p.etapa + "… " + p.pct + "%"; } }});
      if (AQUI.url) URL.revokeObjectURL(AQUI.url);
      var nome = (P.nome || "reel").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "reel";
      AQUI.arquivo = new File([res.blob], nome + ".mp4", {type: "video/mp4"}); AQUI.url = URL.createObjectURL(res.blob);
      if (!res.comSom) obs.push("este aparelho não conseguiu gravar o som — o vídeo saiu mudo (no computador sai com som)");
      else if (res.codecSom === "opus") obs.push("o som saiu num formato que algumas redes não aceitam; se a rede recusar, gere no computador");
      var podeEnviar = navigator.canShare && navigator.canShare({files: [AQUI.arquivo]});
      estadoAqui('<div class="rl-aviso ok"><b>Vídeo pronto ✓</b> ' + res.largura + ' × ' + res.altura + ' · ' + (res.blob.size / 1e6).toFixed(1) + ' MB · feito em ' + Math.round((Date.now() - t0) / 1000) + ' s' + (obs.length ? '<br>Obs.: ' + esc(obs.join("; ")) + '.' : '') + '<br><small style="opacity:.7">v3 · som: ' + esc(res.somInfo || "") + '</small></div>' +
        '<video id="aquiVideo" src="' + AQUI.url + '" controls playsinline style="width:100%;max-height:46vh;border-radius:12px;background:#000"></video>' +
        '<div class="rl-acoes" style="margin-top:8px"><a class="rl-bt pri" id="aquiBaixar" href="' + AQUI.url + '" download="' + esc(nome) + '.mp4" style="text-decoration:none;text-align:center">⬇ SALVAR VÍDEO</a>' + (podeEnviar ? '<button class="rl-bt" id="aquiEnviar" type="button">COMPARTILHAR</button>' : '') + '</div>');
      if (podeEnviar) $("aquiEnviar").onclick = function () { navigator.share({files: [AQUI.arquivo], title: P.nome || "Reel"}).catch(function () {}); };
    } catch (e) {
      estadoAqui('<div class="rl-aviso' + (e.message === "cancelado" ? '">Cancelado.' : ' erro">Não deu para gerar aqui: ' + esc(e.message || String(e)) + '. Você pode tentar a qualidade Rápida ou usar RENDERIZAR NO PC.') + '</div>');
    }
    try { if (actx) actx.close(); } catch (e) { /* já fechado */ }
    AQUI.rodando = false; $("btAqui").textContent = "🎬 GERAR VÍDEO NESTE APARELHO";
  };
  $("btEnviarPC").onclick = async function () {
    var v = validar(true); if (v.erros.length) { alert("Corrija os itens em vermelho antes de enviar."); return; }
    if (!(await logado())) { $("enviarPCEstado").innerHTML = '<div class="rl-aviso erro">Entre na sua conta Brightway (menu Conta) para enviar ao computador.</div>'; return; }
    P.paraPC = Date.now(); salvarJa();
    var aviso = usaMidia(P) ? " As filmagens, fotos, músicas e personagens criados por você ficam só neste aparelho: no PC, coloque de novo na aba MÍDIA." : "";
    try { if (window.BWSync && BWSync.sincronizar) await BWSync.sincronizar(["reels_projetos"]); } catch (e) { }
    desenharFila();
    $("enviarPCEstado").insertAdjacentHTML("beforeend", '<div class="rl-nota">Enviado ✓' + esc(aviso) + '</div>');
  };
  $("filaPC").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-fila]"); if (!b) return;
    var p = await dbGet("projetos", b.dataset.fila).catch(function () { return null; }) || contaLer().filter(function (x) { return x.id === b.dataset.fila; })[0];
    if (!p) return;
    p = JSON.parse(JSON.stringify(p)); p.paraPC = 0; await abrir(p); salvarJa(); trocarAba("exportar");
  });
  window.addEventListener("bw-sync-recebido", function (e) { var ch = (e.detail && e.detail.chaves) || []; if (ch.indexOf("reels_projetos") >= 0) puxarDaConta(); });
  $("btPacote").onclick = async function () {
    var v = validar(true); if (v.erros.length) { trocarAba("exportar"); alert("Corrija os itens em vermelho antes de gerar o vídeo."); return; }
    ocupado("Montando o pacote para o BW Reels Studio…");
    try {
      var Z = await carregarJSZip(); var zip = new Z(); var r = roteiroFinal();
      var usados = {}; r.cenas.forEach(function (c) { if (c.midia) usados[c.midia] = 1; if (c.midia2) usados[c.midia2] = 1; (c.elenco || []).forEach(function (a) { if (a.imagem) usados[a.imagem] = 1; }); }); if ((r.audio || {}).musica) usados[r.audio.musica] = 1;
      var lista = await midiasDoProjeto(P.id);
      lista.forEach(function (m) { if (usados[m.caminho]) zip.file(m.caminho, m.blob); });
      zip.file("roteiro.json", JSON.stringify(r, null, 2));
      zip.file("bwreels.json", JSON.stringify({versao: 1, nome: r.titulo, slug: slug(P.nome || P.briefing.assunto), criado: new Date().toISOString(), legenda: P.legenda || ""}, null, 2));
      if (P.legenda) zip.file("post.md", P.legenda);
      var blob = await zip.generateAsync({type: "blob"});
      baixar(blob, slug(P.nome || P.briefing.assunto) + ".bwreels.zip");
      ocupado();
      setTimeout(function () { alert("Pedido enviado para Downloads! Com o BW REELS RENDER aberto no PC, o vídeo fica pronto e abre sozinho em poucos minutos. Ainda não instalou o motor? Toque em ⚙ MOTOR NO PC."); }, 300);
    } catch (e) { ocupado(); alert("Não deu para montar o pacote (" + (e && e.message || "erro") + "). Confira a internet e tente de novo."); }
  };
  $("btRoteiro").onclick = function () { baixar(new Blob([JSON.stringify(roteiroFinal(), null, 2)], {type: "application/json"}), slug(P.nome || "roteiro") + "-roteiro.json"); };
  $("fLegenda").addEventListener("input", function () { P.legenda = this.value; salvar(); });
  $("btCopiar").onclick = function () { var t = $("fLegenda").value; if (!t) return; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $("btCopiar").textContent = "✓ COPIADA"; setTimeout(function () { $("btCopiar").textContent = "COPIAR LEGENDA"; }, 1800); }).catch(function () { $("fLegenda").select(); }); };


  /* ---------- galeria de MODELOS ("O que vamos criar?") ---------- */
  var MOD = window.BWReelsModelos || {categorias: [], modelos: [], ferramentasIA: []};
  var CAT = "texto", OBS = null;
  function abrirModelos(cat) {
    CAT = cat || CAT;
    $("glCats").innerHTML = MOD.categorias.map(function (c) {
      return '<button type="button" role="tab" class="gl-cat' + (c.id === CAT ? " on" : "") + '" data-cat="' + c.id + '" aria-selected="' + (c.id === CAT) + '"><i>' + c.icone + '</i><span><b>' + esc(c.nome) + '</b><small>' + esc(c.desc) + '</small></span></button>';
    }).join("");
    var cards = MOD.modelos.filter(function (m) { return m.cat === CAT; }).map(function (m) {
      return '<div class="gl-mod"><div class="vis" style="background-image:url(assets/reels-exemplos/' + m.id + '.jpg)"><video muted loop playsinline preload="none" poster="assets/reels-exemplos/' + m.id + '.jpg" data-src="assets/reels-exemplos/' + m.id + '.mp4" aria-label="Exemplo: ' + esc(m.nome) + '"></video><em>EXEMPLO</em></div>' +
        '<div class="tx"><b>' + esc(m.nome) + '</b><small>' + esc(m.desc) + '</small><button type="button" class="rl-bt pri peq" data-usar="' + m.id + '">USAR ESTE MODELO</button></div></div>';
    });
    if (CAT === "texto") cards.unshift('<div class="gl-mod zero"><div class="vis">✨</div><div class="tx"><b>A IA CRIA PARA MIM</b><small>Diga o assunto: a IA Brightway escreve 5 ganchos e o roteiro. Você escolhe e ajusta.</small><button type="button" class="rl-bt pri peq" data-usar="__ia">COMEÇAR</button></div></div>');
    if (CAT === "ia") cards.unshift('<div class="gl-mod"><div class="vis" style="background-image:url(assets/reels-exemplos/demo-ia.jpg)"><video muted loop playsinline preload="none" poster="assets/reels-exemplos/demo-ia.jpg" data-src="assets/reels-exemplos/demo-ia.mp4" aria-label="Como funciona"></video><em>COMO FUNCIONA</em></div><div class="tx"><b>3 PASSOS</b><small>Crie a imagem, anime numa IA de vídeo e monte aqui com textos e chamada.</small></div></div>');
    $("glGrade").innerHTML = cards.join(""); $("glGrade").hidden = CAT === "meu";
    $("glIA").hidden = CAT !== "ia"; $("glMeu").hidden = CAT !== "meu";
    if (CAT === "meu") carregarLib().then(desenharMpLib);
    if (CAT === "ia") { $("glFerr").innerHTML = (MOD.ferramentasIA || []).map(function (f) { return '<li><b>' + esc(f.nome) + '</b> — ' + esc(f.papel) + (f.url ? ' · <a href="' + f.url + '" target="_blank" rel="noopener">abrir ↗</a>' : "") + '</li>'; }).join(""); gerarPrompts(); }
    $("folhaModelos").hidden = false;
    tocarExemplos();
  }
  function tocarExemplos() {
    var vids = [].slice.call(document.querySelectorAll("#folhaModelos video"));
    var liga = function (v, on) { if (on) { if (!v.src) v.src = v.dataset.src; var pr = v.play(); if (pr && pr.catch) pr.catch(function () { }); } else if (!v.paused) v.pause(); };
    if (OBS) OBS.disconnect();
    if ("IntersectionObserver" in window) { OBS = new IntersectionObserver(function (es) { es.forEach(function (e) { liga(e.target, e.isIntersecting); }); }, {root: $("folhaModelos").firstElementChild, threshold: 0.35}); vids.forEach(function (v) { OBS.observe(v); }); }
    else vids.forEach(function (v) { liga(v, true); });
  }
  function fecharModelos() { $("folhaModelos").hidden = true; [].forEach.call(document.querySelectorAll("#folhaModelos video"), function (v) { v.pause(); }); if (OBS) OBS.disconnect(); }
  $("btModelos").onclick = function () { abrirModelos(); };
  $("btFecharModelos").onclick = fecharModelos;
  $("folhaModelos").addEventListener("click", async function (e) {
    if (e.target === this) { fecharModelos(); return; }
    var c = e.target.closest("[data-cat]"); if (c) { abrirModelos(c.dataset.cat); return; }
    var cp = e.target.closest("[data-copiar]"); if (cp) { var t = $(cp.dataset.copiar).value; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = "✓ COPIADO"; setTimeout(function () { cp.textContent = "COPIAR"; }, 1600); }).catch(function () { $(cp.dataset.copiar).select(); }); else $(cp.dataset.copiar).select(); return; }
    var u = e.target.closest("[data-usar]"); if (!u) return;
    salvar();
    var novo = novoProjeto();
    if (u.dataset.usar === "__ia") { novo.modo = "texto"; fecharModelos(); await abrir(novo); trocarAba("criar"); trocarPasso("assunto"); $("fAssunto").focus(); return; }
    var m = MOD.modelos.find(function (x) { return x.id === u.dataset.usar; }); if (!m) return;
    novo.modo = m.cat; novo.nome = m.nome.charAt(0) + m.nome.slice(1).toLowerCase(); novo.roteiro = JSON.parse(JSON.stringify(m.roteiro)); novo.modelo = m.id;
    (novo.roteiro.fontes || []).forEach(function (f) { novo.fatos.push({afirmacao: f.afirmacao, fonte: f.url}); });
    fecharModelos(); await abrir(novo); T = 1.5; posicionar(1.5);
    trocarAba(m.cat === "ia" ? "midia" : "cena"); SEL = 0; desenharTudo();
    if (m.cat === "ia") setTimeout(function () { alert("Modelo aberto! Importe aqui os clipes do seu personagem de IA e, na aba CENA, escolha cada clipe em “Fundo / mídia”."); }, 200);
  });

  /* prompts para o personagem de IA (montados no aparelho; ✨ opcional pela IA Brightway) */
  var IA_CAMPOS = ["iaNome", "iaEstilo", "iaAparencia", "iaRoupa", "iaCenario", "iaAcao", "iaFala"];
  function lerIA() { var o = {}; IA_CAMPOS.forEach(function (id) { o[id] = ($(id).value || "").trim(); }); try { localStorage.setItem("ui_reels_ia", JSON.stringify(o)); } catch (e) { } return o; }
  function gerarPrompts() {
    var o = lerIA(), nome = o.iaNome || "the character", ap = o.iaAparencia || "friendly original character", roupa = o.iaRoupa ? ", wearing " + o.iaRoupa : "";
    $("iaPImg").value = "Character sheet of " + nome + ": " + ap + roupa + ". " + o.iaEstilo + ". Full body, front view, three-quarter view and side view, plus 3 facial expressions (happy, surprised, talking). " +
      "Plain light background, consistent proportions and colors, no text, no logos, original design (not based on any existing character or real person).";
    $("iaPVid").value = "Use the reference image: same character, same face, same outfit. " + nome + " " + (o.iaAcao || "waves at the camera and smiles") + ", " + (o.iaCenario ? "in " + o.iaCenario : "in a clean studio set") + ". " +
      "Vertical 9:16, 5 to 8 seconds, slow camera push-in, natural motion, " + o.iaEstilo.split(",")[0] + ", no text on screen." + (o.iaFala ? ' The character says in Brazilian Portuguese: "' + o.iaFala + '"' : "");
  }
  IA_CAMPOS.forEach(function (id) { $(id).addEventListener("input", gerarPrompts); $(id).addEventListener("change", gerarPrompts); });
  try { var iaS = JSON.parse(localStorage.getItem("ui_reels_ia") || "{}"); IA_CAMPOS.forEach(function (id) { if (iaS[id]) $(id).value = iaS[id]; }); } catch (e) { }
  $("btIaPrompts").onclick = gerarPrompts;
  $("btIaMelhorar").onclick = async function () {
    gerarPrompts(); var s = await sessao(); if (!s) { alert("Entre na sua conta para a IA Brightway caprichar nos prompts. Os prompts acima já funcionam."); return; }
    var bt = this; bt.disabled = true; bt.textContent = "✨ ESCREVENDO…";
    try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB},
        body: JSON.stringify({sistema: "Você escreve prompts em inglês para IAs de imagem e de vídeo (Flux, Kling, Higgsfield, Veo). Responda SÓ com JSON {\"imagem\":\"...\",\"video\":\"...\"}. " +
          "imagem = ficha de personagem ORIGINAL (vistas de frente, 3/4, lado e 3 expressões, fundo liso, sem texto). video = clipe vertical 9:16 de 5 a 8 s usando a imagem como referência, mesmo rosto e roupa, movimento de câmera e ação. " +
          "Nunca baseie em personagem famoso, marca ou pessoa real. Mantenha a fala, se houver, em português do Brasil entre aspas.", pedido: JSON.stringify(lerIA()), max: 600})});
      var j = await r.json().catch(function () { return {}; }); var d = extrairJSON(j.texto);
      if (d && d.imagem && d.video) { $("iaPImg").value = String(d.imagem); $("iaPVid").value = String(d.video); } else alert("A IA não respondeu agora. Os prompts montados no aparelho continuam valendo.");
    } catch (e) { alert("Sem conexão com a IA agora. Os prompts montados no aparelho continuam valendo."); }
    bt.disabled = false; bt.textContent = "✨ CAPRICHAR COM IA";
  };



  /* ---------- MEUS PERSONAGENS: biblioteca (IndexedDB), CRIAR PERSONAGEM (montador) e ACRESCENTAR (foto) ---------- */
  var LIB = [], LIB_URL = {};
  async function carregarLib() {
    LIB = (await dbTodos("personagens").catch(function () { return []; })).sort(function (a, b) { return (b.criado || 0) - (a.criado || 0); });
    Object.keys(LIB_URL).forEach(function (k) { URL.revokeObjectURL(LIB_URL[k]); }); LIB_URL = {};
    LIB.forEach(function (L) { if (L.tipo === "foto" && L.blob) LIB_URL[L.id] = URL.createObjectURL(L.blob); });
  }
  function libUrl(id) { return LIB_URL[id] || ""; }
  function miniLook(look, chave) { return M.svgPersonagem(look).replace(/id="bwLente"/g, 'id="bwL' + chave + '"').replace(/url\(#bwLente\)/g, "url(#bwL" + chave + ")"); }
  async function fotoDaLib(libId) {   /* põe a foto da biblioteca no projeto aberto (uma vez) e devolve o caminho */
    var L = LIB.find(function (x) { return x.id === libId; }); if (!L || !L.blob) return null;
    var nome = "avatar-lib-" + libId + ".png", ja = MID.find(function (m) { return m.nome === nome; }); if (ja) return ja.caminho;
    await importar([new File([L.blob], nome, {type: "image/png"})]);
    var m = MID.find(function (x) { return x.nome === nome; }); return m ? m.caminho : null;
  }
  function desenharLib() {
    $("plGrade").innerHTML = (LIB.length ? LIB.map(function (L) {
      var vis = L.tipo === "foto" ? '<img src="' + libUrl(L.id) + '" alt="">' : miniLook(L.look, "lb" + L.id);
      return '<div class="pl-card"><div class="vis">' + vis + '</div><b>' + esc(L.nome) + '</b><small>' + (L.tipo === "foto" ? "foto recortada" : "criado aqui") + '</small><div class="ac">' +
        (L.tipo === "montado" ? '<button type="button" class="rl-bt peq" data-pl-ed="' + L.id + '">✎ EDITAR</button>' : "") +
        '<button type="button" class="rl-bt peq" data-pl-anim="' + L.id + '">ANIMAR</button><button type="button" class="rl-bt peq" data-pl-del="' + L.id + '" aria-label="Excluir ' + esc(L.nome) + '">✕</button></div></div>';
    }).join("") : "") +
      '<div class="pl-card" style="justify-content:center;align-items:stretch"><button type="button" class="rl-bt pri" data-pl-ir="criar">+ CRIAR PERSONAGEM</button><button type="button" class="rl-bt" data-pl-ir="foto">+ ACRESCENTAR FOTO</button></div>';
  }
  function trocarPl(aba) {
    [].forEach.call(document.querySelectorAll(".pl-abas button"), function (b) { b.classList.toggle("on", b.dataset.pl === aba); });
    $("plLib").hidden = aba !== "lib"; $("plCriar").hidden = aba !== "criar"; $("plFoto").hidden = aba !== "foto";
    if (aba === "criar") { desenharMontador(); animarPrev(); } else pararPrev();
    if (aba === "lib") desenharLib();
  }
  async function abrirPers(aba) { await carregarLib(); $("folhaPers").hidden = false; trocarPl(aba || "lib"); }
  function fecharPers() { $("folhaPers").hidden = true; pararPrev(); }
  $("btPers").onclick = function () { abrirPers(); };
  $("btFecharPers").onclick = fecharPers;
  [].forEach.call(document.querySelectorAll(".pl-abas button"), function (b) { b.onclick = function () { if (b.dataset.pl === "criar") MONT.edita = null; trocarPl(b.dataset.pl); }; });
  $("folhaPers").addEventListener("click", async function (e) {
    if (e.target === this) { fecharPers(); return; }
    var ir = e.target.closest("[data-pl-ir]"); if (ir) { MONT.edita = null; trocarPl(ir.dataset.plIr); return; }
    var ed = e.target.closest("[data-pl-ed]"); if (ed) { var L = LIB.find(function (x) { return x.id === ed.dataset.plEd; }); if (L) { MONT.look = JSON.parse(JSON.stringify(L.look)); MONT.edita = L.id; $("plNome").value = L.nome; trocarPl("criar"); } return; }
    var del = e.target.closest("[data-pl-del]"); if (del) { if (!confirm("Excluir este personagem da biblioteca? Os reels que já usam continuam com ele.")) return; await dbDel("personagens", del.dataset.plDel); await carregarLib(); desenharLib(); return; }
    var an = e.target.closest("[data-pl-anim]"); if (an) { fecharPers(); abrirModelos("meu"); escolherLibAnimar(an.dataset.plAnim); }
  });

  /* CRIAR PERSONAGEM: montador com prévia animada */
  var MONT = {look: null, edita: null, acao: "acena", raf: 0, t0: 0};
  function lookPadrao() { var b = M.PERSONAGENS.leo; return {bicho: "nenhum", cabelo: "curto", barba: "nenhuma", oculos: "nenhum", roupa: "camiseta", acessorio: "nenhum", bone: false, cores: Object.assign({detalhe: "#FFB547"}, b.cores)}; }
  function opcoes(sel, obj, atual) { $(sel).innerHTML = Object.keys(obj).map(function (k) { return '<option value="' + k + '">' + esc(obj[k]) + '</option>'; }).join(""); $(sel).value = atual; }
  function desenharMontador() {
    if (!MONT.look) MONT.look = lookPadrao();
    var o = M.MONTADOR, l = MONT.look, c = l.cores;
    $("plBase").innerHTML = '<option value="">— escolher —</option>' + Object.keys(M.PERSONAGENS).filter(function (k) { return M.PERSONAGENS[k].desenho === "pessoa"; }).map(function (k) { return '<option value="' + k + '">' + esc(M.PERSONAGENS[k].nome) + '</option>'; }).join("");
    $("plBicho").innerHTML = Object.keys(o.bicho).map(function (k) { return '<button type="button" class="rl-chip' + ((l.bicho || "nenhum") === k ? " on" : "") + '" data-bicho="' + k + '">' + esc(o.bicho[k]) + '</button>'; }).join("");
    $("plPele").innerHTML = o.peles.concat(["#c08a55", "#9aa3ad", "#f4ece2"]).map(function (cor) { return '<button type="button" data-pele="' + cor + '" class="' + (c.pele === cor ? "on" : "") + '" style="background:' + cor + '" aria-label="Tom ' + cor + '"></button>'; }).join("");
    opcoes("plCabelo", o.cabelo, l.cabelo || "curto"); opcoes("plBarba", o.barba, l.barba || "nenhuma"); opcoes("plOculos", o.oculos, l.oculos || "nenhum");
    opcoes("plRoupa", o.roupa, l.roupa || "camiseta"); opcoes("plAcess", o.acessorio, l.acessorio || "nenhum"); opcoes("plBone", o.bone, l.bone ? "sim" : "nao");
    $("plCorCabelo").value = c.cabelo; $("plCorRoupa").value = c.roupa; $("plCorCalca").value = c.calca; $("plCorDet").value = c.detalhe || "#FFB547"; $("plCorSapato").value = c.sapato;
    $("plAcoes").innerHTML = M.ACOES.filter(function (a) { return a !== "parado"; }).map(function (a) { return '<button type="button" class="rl-chip' + (MONT.acao === a ? " on" : "") + '" data-acao="' + a + '">' + esc(NOMES_ACAO[a]) + '</button>'; }).join("");
    $("plPrev").innerHTML = miniLook(l, "prev"); $("plPrev").__p = null;
  }
  function lerMontador() {
    var l = MONT.look, c = l.cores;
    l.cabelo = $("plCabelo").value; l.barba = $("plBarba").value; l.oculos = $("plOculos").value; l.roupa = $("plRoupa").value; l.acessorio = $("plAcess").value; l.bone = $("plBone").value === "sim";
    c.cabelo = $("plCorCabelo").value; c.roupa = $("plCorRoupa").value; c.calca = $("plCorCalca").value; c.detalhe = $("plCorDet").value; c.sapato = $("plCorSapato").value;
    $("plPrev").innerHTML = miniLook(l, "prev"); $("plPrev").__p = null;
  }
  ["plCabelo", "plBarba", "plOculos", "plRoupa", "plAcess", "plBone"].forEach(function (id) { $(id).addEventListener("change", lerMontador); });
  ["plCorCabelo", "plCorRoupa", "plCorCalca", "plCorDet", "plCorSapato"].forEach(function (id) { $(id).addEventListener("input", lerMontador); });
  $("plBicho").addEventListener("click", function (e) { var b = e.target.closest("[data-bicho]"); if (!b) return; lerMontador(); MONT.look.bicho = b.dataset.bicho; desenharMontador(); });
  $("plPele").addEventListener("click", function (e) { var b = e.target.closest("[data-pele]"); if (!b) return; lerMontador(); MONT.look.cores.pele = b.dataset.pele; desenharMontador(); });
  $("plAcoes").addEventListener("click", function (e) { var b = e.target.closest("[data-acao]"); if (!b) return; MONT.acao = b.dataset.acao; MONT.t0 = performance.now(); [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); }); });
  $("plBase").onchange = function () { if (!this.value) return; var b = M.PERSONAGENS[this.value];
    MONT.look = {bicho: b.bicho || "nenhum", cabelo: b.cabelo || "curto", barba: b.barba === true ? "cheia" : (b.barba || "nenhuma"), oculos: b.oculos || "nenhum", roupa: b.roupa || "camiseta", acessorio: b.acessorio || "nenhum", bone: !!b.bone, cores: Object.assign({detalhe: "#FFB547"}, b.cores)};
    if (!$("plNome").value) $("plNome").value = b.nome; desenharMontador(); };
  $("plSortear").onclick = function () {
    var o = M.MONTADOR, pega = function (obj) { var k = Object.keys(obj); return k[Math.floor(Math.random() * k.length)]; }, cor = function () { return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"); };
    var cabelos = ["#1d1a19", "#3b2a1d", "#5a3424", "#7a4b2a", "#c98a2f", "#e8c26a", "#6b6b6b", "#b5462f"];
    MONT.look = {bicho: Math.random() < 0.15 ? (Math.random() < 0.5 ? "cachorro" : "gato") : "nenhum", cabelo: pega(o.cabelo), barba: Math.random() < 0.6 ? "nenhuma" : pega(o.barba), oculos: Math.random() < 0.6 ? "nenhum" : pega(o.oculos),
      roupa: pega(o.roupa), acessorio: Math.random() < 0.5 ? "nenhum" : pega(o.acessorio), bone: Math.random() < 0.15,
      cores: {pele: o.peles[Math.floor(Math.random() * o.peles.length)], cabelo: cabelos[Math.floor(Math.random() * cabelos.length)], roupa: cor(), calca: cor(), sapato: "#151515", detalhe: cor()}};
    desenharMontador();
  };
  function animarPrev() {
    pararPrev(); MONT.t0 = performance.now();
    var passo = function () {
      var box = $("plPrev"); if (!box || $("plCriar").hidden) return;
      var t = ((performance.now() - MONT.t0) / 1000) % 3.2;
      try { M.animarPersonagem(box, {t0: 0, t1: 3.2, acao: MONT.acao, entrada: "nenhuma", lado: 1, falas: MONT.acao === "fala" ? [[0.2, 3]] : [], semente: 3}, t); } catch (e) { }
      MONT.raf = requestAnimationFrame(passo);
    };
    MONT.raf = requestAnimationFrame(passo);
  }
  function pararPrev() { if (MONT.raf) cancelAnimationFrame(MONT.raf); MONT.raf = 0; }
  $("plSalvar").onclick = async function () {
    lerMontador(); var nome = $("plNome").value.trim() || "Meu personagem";
    var rec = {id: MONT.edita || uid(), nome: nome, tipo: "montado", look: JSON.parse(JSON.stringify(MONT.look)), criado: Date.now()};
    await dbPut("personagens", rec); await carregarLib(); MONT.edita = rec.id;
    $("plMsg").textContent = "✓ Salvo em MEUS PERSONAGENS. Ele já aparece para escolher na aba CENA.";
    if (P && P.roteiro.cenas[SEL] && P.roteiro.cenas[SEL].tipo === "personagem") desenharCena();
  };

  /* ACRESCENTAR (foto): recorte no aparelho e guarda na biblioteca */
  var PF = {orig: null, rec: null};
  function mostrarPF() { var c = PF.rec || PF.orig; $("pfVis").innerHTML = c ? '<img alt="Personagem" src="' + c.toDataURL("image/png") + '">' : '<span>Envie a foto ou o PNG do personagem.</span>'; $("pfCortar").disabled = !PF.orig; $("pfOriginal").disabled = !PF.rec; }
  $("pfEscolher").onclick = function () { $("pfArq").click(); };
  $("pfArq").onchange = async function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    try { var img = await A.imagemDe(new Blob([await f.arrayBuffer()], {type: f.type})); PF.orig = A.canvasDe(img, 1400);
      if (!$("pfNome").value) $("pfNome").value = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 30);
      if (A.jaRecortado(PF.orig)) { PF.rec = A.aparar(PF.orig); $("pfStatus").textContent = "✓ Já está sem fundo."; }
      else { PF.rec = A.recortarLiso(PF.orig); $("pfStatus").textContent = PF.rec ? "✓ Fundo liso tirado sozinho." : "O fundo não é liso: toque em ✂ TIRAR FUNDO COM IA."; }
    } catch (e) { $("pfStatus").textContent = "Não deu para abrir essa imagem. Tente PNG ou JPG."; }
    mostrarPF();
  };
  $("pfCortar").onclick = async function () { if (!PF.orig) return; $("pfStatus").textContent = "Recortando com IA no aparelho…";
    try { PF.rec = await A.recortarIA(PF.orig, function (p, mb) { $("pfStatus").textContent = "Baixando a IA de recorte: " + Math.round(p * 100) + "% de " + mb + " MB (só na primeira vez)…"; }); $("pfStatus").textContent = PF.rec ? "✓ Recortado com IA." : "A IA não achou o personagem."; }
    catch (e) { $("pfStatus").textContent = "A IA de recorte não abriu neste aparelho. Use um PNG sem fundo."; } mostrarPF(); };
  $("pfOriginal").onclick = function () { PF.rec = null; mostrarPF(); };
  async function guardarFoto(canvas, nome) {
    var rec = {id: uid(), nome: nome || "Meu personagem", tipo: "foto", blob: await A.pngDe(canvas), criado: Date.now()};
    await dbPut("personagens", rec); await carregarLib(); return rec;
  }
  $("pfSalvar").onclick = async function () {
    if (!PF.orig) { alert("Escolha a foto do personagem."); return; }
    if (!$("pfAutor").checked) { alert("Confirme que a imagem é sua ou que você tem autorização de quem aparece nela."); return; }
    await guardarFoto(PF.rec || PF.orig, $("pfNome").value.trim()); PF = {orig: null, rec: null}; mostrarPF(); $("pfNome").value = ""; $("pfAutor").checked = false;
    trocarPl("lib");
  };

  /* ---------- ANIMAR MEU PERSONAGEM (foto do usuário → recorte animado / cenas por IA / prompts de vídeo) ---------- */
  var AV = {orig: null, rec: null, look: null, libId: null, modo: "recorte"}, A = window.BWReelsAvatar;
  function mostrarAvatar() {
    var c = AV.rec || AV.orig;
    $("mpVis").innerHTML = AV.look ? '<div style="height:240px;aspect-ratio:400/640">' + miniLook(AV.look, "mp") + '</div>' : c ? '<img alt="Personagem" src="' + c.toDataURL("image/png") + '">' : '<span>Envie a foto do avatar, mascote ou personagem.</span>';
    $("mpCortar").disabled = !AV.orig || !!AV.look; $("mpOriginal").disabled = !AV.rec || !!AV.look; $("mpGuardar").disabled = !AV.orig || !!AV.look || !!AV.libId;
  }
  function desenharMpLib() {
    $("mpLib").innerHTML = LIB.length ? LIB.map(function (L) {
      return '<button type="button" class="ps-bt' + (AV.libId === L.id ? " on" : "") + '" data-mplib="' + L.id + '"><span>' + (L.tipo === "foto" ? '<img src="' + libUrl(L.id) + '" alt="">' : miniLook(L.look, "ml" + L.id)) + '</span>' + esc(L.nome.split(" ")[0]) + '</button>';
    }).join("") + '<span class="rl-nota" style="align-self:center;margin:0 6px">← MEUS PERSONAGENS</span>' : "";
  }
  function rasterLook(look) {
    return new Promise(function (ok) {
      var svg = M.svgPersonagem(look).replace('width="100%" height="100%"', 'width="800" height="1280"'), i = new Image();
      i.onload = function () { var c = document.createElement("canvas"); c.width = 800; c.height = 1280; c.getContext("2d").drawImage(i, 0, 0, 800, 1280); ok(A.aparar(c) || c); };
      i.onerror = function () { ok(null); };
      i.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }
  async function escolherLibAnimar(id) {
    await carregarLib(); var L = LIB.find(function (x) { return x.id === id; }); if (!L) return;
    AV.libId = L.id; $("mpNome").value = L.nome;
    if (L.tipo === "montado") { AV.look = JSON.parse(JSON.stringify(L.look)); AV.orig = AV.rec = await rasterLook(AV.look); $("mpStatus").textContent = "✓ Personagem criado: no recorte animado ele mexe braços, olhos e boca."; }
    else { AV.look = null; var img = await A.imagemDe(L.blob); AV.orig = A.canvasDe(img, 1400); AV.rec = A.aparar(AV.orig); $("mpStatus").textContent = "✓ Personagem da biblioteca."; }
    desenharMpLib(); mostrarAvatar();
  }
  $("mpLib").addEventListener("click", function (e) { var b = e.target.closest("[data-mplib]"); if (b) escolherLibAnimar(b.dataset.mplib); });
  $("mpGuardar").onclick = async function () {
    if (!AV.orig) return; if (!$("mpAutor").checked) { alert("Marque antes que a imagem é sua ou que você tem autorização de quem aparece nela."); return; }
    var r = await guardarFoto(AV.rec || AV.orig, $("mpNome").value.trim()); AV.libId = r.id; desenharMpLib(); mostrarAvatar();
    $("mpStatus").textContent = "✓ Guardado em MEUS PERSONAGENS.";
  };
  $("mpEscolher").onclick = function () { $("mpArq").click(); };
  $("mpArq").onchange = async function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    try {
      var blob = new Blob([await f.arrayBuffer()], {type: f.type});          // cópia já (iPhone invalida o original)
      var img = await A.imagemDe(blob); AV.orig = A.canvasDe(img, 1400); AV.rec = null; AV.look = null; AV.libId = null; desenharMpLib();
      if (!$("mpNome").value) $("mpNome").value = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 30);
      if (A.jaRecortado(AV.orig)) { AV.rec = A.aparar(AV.orig); $("mpStatus").textContent = "✓ Já está sem fundo."; }
      else { AV.rec = A.recortarLiso(AV.orig); $("mpStatus").textContent = AV.rec ? "✓ Fundo liso tirado sozinho. Não ficou bom? Use TIRAR FUNDO COM IA." : "O fundo não é liso: toque em ✂ TIRAR FUNDO COM IA (ou siga com a foto inteira)."; }
    } catch (e) { $("mpStatus").textContent = "Não deu para abrir essa imagem. Tente PNG ou JPG."; }
    mostrarAvatar();
  };
  $("mpCortar").onclick = async function () {
    if (!AV.orig) return; var bt = this; bt.disabled = true; $("mpStatus").textContent = "Recortando com IA no aparelho…";
    try { AV.rec = await A.recortarIA(AV.orig, function (p, mb) { $("mpStatus").textContent = "Baixando a IA de recorte: " + Math.round(p * 100) + "% de " + mb + " MB (só na primeira vez)…"; });
      $("mpStatus").textContent = AV.rec ? "✓ Recortado com IA." : "A IA não achou o personagem nessa foto."; }
    catch (e) { $("mpStatus").textContent = "A IA de recorte não abriu neste aparelho (" + (e && e.message || "erro") + "). Siga com a foto inteira ou use um PNG sem fundo."; }
    bt.disabled = false; mostrarAvatar();
  };
  $("mpOriginal").onclick = function () { AV.rec = null; $("mpStatus").textContent = "Usando a foto inteira (sem recorte)."; mostrarAvatar(); };
  $("mpModos").addEventListener("click", function (e) { var b = e.target.closest("[data-modo]"); if (!b) return; AV.modo = b.dataset.modo;
    [].forEach.call(this.children, function (x) { x.classList.toggle("on", x === b); }); });

  var ACAO_EN = {parado: "standing and smiling at the camera", acena: "waving happily at the camera", fala: "talking to the camera with natural hand gestures", aponta: "pointing to the side with excitement",
    comemora: "celebrating with both arms up, jumping", pensa: "thinking with a hand on the chin", surpresa: "looking surprised with wide eyes"};
  var SISTEMA_AV = "Você é roteirista de Reels com um personagem. Responda SÓ com JSON válido: {\"gancho\":\"...\",\"cenas\":[{\"fala\":\"...\",\"acao\":\"acena\",\"cenario\":\"palco\",\"pose\":\"...\",\"duracao\":3.5}],\"cta\":\"...\",\"legenda\":\"...\"}. " +
    "Regras: 3 a 6 cenas contando a história do usuário (começo, virada, final); fala = o que o personagem diz no balão, até 12 palavras, português do Brasil, tom descontraído; " +
    "acao: parado, acena, fala, aponta, comemora, pensa ou surpresa; cenario: raios, palco ou bolinhas; pose = descrição CURTA em INGLÊS da pose e do lugar da cena para um ilustrador (ex.: waving on a concert stage with LED screens); " +
    "duracao 2.5 a 5. gancho = frase de abertura com até 8 palavras, verdadeira. Não invente números, clientes nem fatos. legenda do post com 3 a 5 hashtags.";
  function historiaLocal(txt, cta) {
    var frases = (String(txt).match(/[^.!?\n]+[.!?]*/g) || []).map(function (f) { return f.trim(); }).filter(Boolean);
    var cenas = [], ciclo = ["acena", "fala", "pensa", "aponta", "fala", "comemora"];
    frases.slice(0, 6).forEach(function (f, i, arr) { var ps = palavras(f).slice(0, 14).join(" ");
      var acao = i === 0 ? "acena" : i === arr.length - 1 ? "comemora" : ciclo[i % ciclo.length];
      cenas.push({fala: ps, acao: acao, cenario: i % 2 ? "palco" : "raios", pose: ACAO_EN[acao], duracao: Math.max(3, Math.min(5, palavras(ps).length / 2.4 + 1))}); });
    return {gancho: "", cenas: cenas, cta: cta, legenda: ""};
  }
  async function historiaIA(dados) {
    var s = await sessao(); if (!s) return null;
    try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB},
        body: JSON.stringify({sistema: SISTEMA_AV, pedido: "Personagem: " + dados.nome + (dados.desc ? " (" + dados.desc + ")" : "") + "\nHistória: " + dados.hist + "\nChamada final: " + (dados.cta || "seguir o perfil"), max: 1000})});
      var j = await r.json().catch(function () { return {}; }); var d = r.ok && extrairJSON(j.texto);
      if (!d || !Array.isArray(d.cenas) || !d.cenas.length) return null;
      d.cenas = d.cenas.slice(0, 6).map(function (c) { var acao = M.ACOES.indexOf(c && c.acao) >= 0 ? c.acao : "fala";
        return {fala: palavras(c && c.fala).slice(0, 14).join(" "), acao: acao, cenario: ["raios", "palco", "bolinhas"].indexOf(c && c.cenario) >= 0 ? c.cenario : "raios",
          pose: String(c && c.pose || ACAO_EN[acao]).slice(0, 160), duracao: Math.max(2.5, Math.min(5.5, Number(c && c.duracao) || 3.5))}; }).filter(function (c) { return c.fala; });
      return d.cenas.length ? d : null;
    } catch (e) { return null; }
  }
  function promptVideo(c, dados) {
    return "Use the reference image: the same character" + (dados.desc ? " (" + dados.desc + ")" : "") + ", same face, design, colors and outfit. " + c.pose + ". " + ACAO_EN[c.acao] +
      ". Vertical 9:16, 5 seconds, smooth cinematic camera movement, natural motion, no text on screen." + (c.fala ? ' The character says in Brazilian Portuguese: "' + c.fala + '"' : "");
  }
  function desenharPrompts() {
    var box = $("promptsCenas"), l = P && P.promptsCenas || [];
    box.innerHTML = l.length ? '<div class="rl-eyebrow" style="margin:12px 0 6px">Prompts para a IA de vídeo (use a foto do personagem como referência)</div>' + l.map(function (p, i) {
      return '<div class="pc-item"><b>CENA ' + (p.cena + 1) + '</b><textarea class="gl-prompt" readonly id="pc' + i + '">' + esc(p.prompt) + '</textarea><div class="rl-acoes" style="margin:6px 0 0"><button type="button" class="rl-bt peq" data-pc="' + i + '">COPIAR</button></div></div>';
    }).join("") + '<p class="rl-nota">Gere cada clipe (5–8 s, vertical) no Kling, Higgsfield ou Veo, importe aqui e escolha na cena. Ao postar, marque “Feito com IA”.</p>' : "";
  }
  $("promptsCenas").addEventListener("click", function (e) { var b = e.target.closest("[data-pc]"); if (!b) return; var t = $("pc" + b.dataset.pc).value;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { b.textContent = "✓ COPIADO"; setTimeout(function () { b.textContent = "COPIAR"; }, 1500); }).catch(function () { $("pc" + b.dataset.pc).select(); }); });

  $("mpCriar").onclick = async function () {
    var dados = {nome: $("mpNome").value.trim() || "Meu personagem", desc: $("mpDesc").value.trim(), hist: $("mpHist").value.trim(), cta: $("mpCta").value.trim(), junto: $("mpJunto").value};
    if (!AV.orig) { alert("Escolha a foto do personagem."); return; }
    if (!dados.hist) { $("mpHist").focus(); alert("Conte a história em poucas frases."); return; }
    if (!$("mpAutor").checked) { alert("Confirme que a imagem é sua ou que você tem autorização de quem aparece nela."); return; }
    var modo = AV.modo, figura = AV.rec || AV.orig;
    if (modo === "cenas" && !(await sessao())) { alert("Entre na sua conta para a IA criar as imagens. Sem login, use o RECORTE ANIMADO."); return; }
    ocupado("Escrevendo a história em cenas…");
    var h = await historiaIA(dados), nota = h ? "Roteiro escrito pela IA Brightway." : "Roteiro montado no aparelho, frase por frase.";
    if (!h) h = historiaLocal(dados.hist, dados.cta);
    if (!h.cenas.length) { ocupado(); alert("Não achei frases na história. Escreva pelo menos uma frase."); return; }
    if (modo === "cenas" && !confirm("A IA vai criar " + h.cenas.length + " imagens do seu personagem (das 15 por dia da sua conta). Vamos enviar UMA cópia pequena da foto; nada fica guardado. Continuar?")) { ocupado(); return; }
    salvar();
    var novo = novoProjeto(); novo.modo = "meu"; novo.nome = ("Reel " + dados.nome).slice(0, 60); novo.avatarNome = dados.nome; novo.briefing.assunto = dados.hist.slice(0, 200); novo.briefing.cta = dados.cta;
    novo.roteiro.cenas = []; fecharModelos(); await abrir(novo);
    var caminho = null;
    if (!AV.look) {
      ocupado("Guardando o personagem neste aparelho…");
      var png = await A.pngDe(figura);
      await importar([new File([png], "avatar-" + slug(dados.nome) + ".png", {type: "image/png"})]);
      caminho = (avatares().slice(-1)[0] || {}).caminho;
    }
    var ator = function (acao) {
      if (AV.look) return {personagem: "meu", look: JSON.parse(JSON.stringify(AV.look)), nome: dados.nome, libId: AV.libId || undefined, acao: acao};
      var o = {personagem: "foto", imagem: caminho, acao: acao}; if (!AV.rec || !$("mpContorno").checked) o.contorno = false; return o; };
    var cenas = [];
    if (h.gancho) cenas.push({tipo: "gancho", duracao: 2.8, texto: palavras(h.gancho).slice(0, 9).join(" ")});
    var imagensIA = [];
    if (modo === "cenas") {
      var peq = await A.jpgPequeno(figura, 504), falhou = "";
      for (var i = 0; i < h.cenas.length; i++) {
        ocupado("A IA está desenhando a cena " + (i + 1) + " de " + h.cenas.length + "…");
        var pedido = "the same character from image 0" + (dados.desc ? " (" + dados.desc + ")" : "") + ", " + h.cenas[i].pose + ", " + ACAO_EN[h.cenas[i].acao] +
          ". Same art style, face, colors and outfit as image 0. Character fully visible in the lower two thirds of a vertical frame, expressive, cinematic lighting";
        var r = await window.BWFotosNuvem.arte(peq, pedido, 576, 1024, "topo", 1000 + i * 37);
        if (r.erro) { falhou = window.BWFotosNuvem.msg(r.erro); break; }
        await importar([new File([r.blob], "cena-ia-" + (i + 1) + ".jpg", {type: r.blob.type || "image/jpeg"})]);
        imagensIA[i] = MID[MID.length - 1].caminho;
      }
      if (falhou) nota += " A IA parou na cena " + (imagensIA.length + 1) + ": " + falhou + " As outras cenas ficaram com o recorte animado.";
    }
    h.cenas.forEach(function (c, i) {
      if (modo === "video") { cenas.push({tipo: "midia", duracao: Math.max(4, c.duracao), texto: c.fala, movimento: "zoom-in-suave"}); return; }
      var n = {tipo: "personagem", duracao: c.duracao, falas: [{quem: 0, texto: c.fala}], cenario: c.cenario, entrada: i === 0 ? "pula" : "nenhuma"};
      if (imagensIA[i]) { n.elenco = []; n.midia = imagensIA[i]; n.movimento = i % 2 ? "zoom-out" : "zoom-in"; n.cenario = "nenhum"; n.transicao = "fade"; }
      else { n.elenco = [ator(c.acao)]; if (dados.junto && i % 2 === 1) { n.elenco.push({personagem: dados.junto}); n.entrada = "desliza"; } }
      cenas.push(n);
    });
    cenas.push({tipo: "cta", duracao: 3, texto: h.cta || dados.cta || "Gostou? Me segue", acao: dados.cta || "Siga o perfil"});
    P.roteiro.cenas = cenas;
    if (modo === "video") { P.promptsCenas = h.cenas.map(function (c, i) { return {cena: i + (h.gancho ? 1 : 0), prompt: promptVideo(c, dados)}; }); nota += " Os prompts de cada cena estão na aba MÍDIA."; }
    if (h.legenda) { P.legenda = String(h.legenda); $("fLegenda").value = P.legenda; }
    ocupado(); SEL = 0; salvar(); desenharTudo(); desenharPrompts(); atualizar(); T = 1.2; posicionar(1.2);
    trocarAba(modo === "video" ? "midia" : "cena"); $("motorNota").textContent = nota;
    setTimeout(function () { alert("Reel criado! " + nota); }, 250);
  };

  /* ---------- projetos ---------- */
  async function abrir(p) {
    parar(); P = p; SEL = 0; T = 1.5;   /* parado no início a cena ainda está entrando: mostra 1,5 s */
    P.roteiro = P.roteiro || roteiroBase(); P.briefing = P.briefing || {}; P.fatos = P.fatos || []; P.ganchos = P.ganchos || [];
    await carregarMidias();
    $("nomeProj").value = P.nome || ""; Object.keys(BRIEF).forEach(function (id) { $(id).value = P.briefing[BRIEF[id]] || ($(id).tagName === "SELECT" ? $(id).options[0].value : ""); });
    $("fLegenda").value = P.legenda || ""; $("motorNota").textContent = "";
    prepararMusica(); desenharTudo(); desenharPrompts(); trocarPasso(P.ganchos.length ? "gancho" : "assunto"); atualizar(); desenharFila();
    try { localStorage.setItem("ui_reels_ultimo", P.id); } catch (e) { }
  }
  function desenharTudo() { desenharLinha(); desenharCena(); desenharMidias(); desenharSom(); if (PASSO === "gancho") desenharGanchos(); if (PASSO === "estilo") desenharEstilo(); }
  $("btNovo").onclick = function () { abrirModelos("texto"); };
  $("btMeus").onclick = async function () {
    var lista = (await dbTodos("projetos").catch(function () { return []; })).sort(function (a, b) { return b.atualizado - a.atualizado; });
    $("listaMeus").innerHTML = lista.length ? lista.map(function (p) {
      var d = new Date(p.atualizado); var quando = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      return '<li><span><b>' + esc(p.nome || p.briefing && p.briefing.assunto || "Sem nome") + '</b><small>' + (p.roteiro && p.roteiro.cenas ? p.roteiro.cenas.length : 0) + ' cenas · ' + quando + (P && p.id === P.id ? " · aberto" : "") + (p.paraPC ? " · na fila do PC" : "") + '</small></span>' +
        '<span style="display:flex;gap:6px"><button type="button" class="rl-bt peq" data-abrir="' + p.id + '">ABRIR</button><button type="button" class="rl-bt peq" data-apagar="' + p.id + '" aria-label="Excluir ' + esc(p.nome || "reel") + '">✕</button></span></li>';
    }).join("") : '<li><span class="rl-nota">Nenhum reel salvo ainda.</span></li>';
    $("folhaMeus").hidden = false;
  };
  $("btFecharMeus").onclick = function () { $("folhaMeus").hidden = true; };
  $("folhaMeus").addEventListener("click", async function (e) {
    if (e.target === this) { this.hidden = true; return; }
    var a = e.target.closest("[data-abrir]"), d = e.target.closest("[data-apagar]");
    if (a) { var p = await dbGet("projetos", a.dataset.abrir); if (p) { await abrir(p); this.hidden = true; } }
    if (d) {
      if (!confirm("Excluir este reel da sua conta (some de todos os aparelhos) e as mídias dele deste aparelho? Não dá para desfazer.")) return;
      var ms = await midiasDoProjeto(d.dataset.apagar).catch(function () { return []; });
      for (var i = 0; i < ms.length; i++) await dbDel("midias", ms[i].id).catch(function () { });
      await dbDel("projetos", d.dataset.apagar).catch(function () { });
      contaTirar(d.dataset.apagar);
      if (P && P.id === d.dataset.apagar) await abrir(novoProjeto());
      $("btMeus").onclick();
    }
  });
  function abrirMotor() { $("folhaMotor").hidden = false; }
  $("btMotor").onclick = abrirMotor; $("btMotor2").onclick = abrirMotor;
  $("btFecharMotor").onclick = function () { $("folhaMotor").hidden = true; };
  $("folhaMotor").addEventListener("click", function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("folhaMeus").hidden = true; $("folhaMotor").hidden = true; if (!$("folhaModelos").hidden) fecharModelos(); if (!$("folhaPers").hidden) fecharPers(); } });

  function ocupado(txt) { $("ocup").hidden = !txt; if (txt) $("ocupTxt").textContent = txt; }

  /* ---------- início ---------- */
  (async function iniciar() {
    try { $("chkZonas").checked = localStorage.getItem("ui_reels_zonas") === "1"; $("chkZonas").onchange(); } catch (e) { }
    var p = null;
    try { var ult = localStorage.getItem("ui_reels_ultimo"); if (ult) p = await dbGet("projetos", ult); } catch (e) { }
    await carregarLib();
    await abrir(p || novoProjeto());
    puxarDaConta().catch(function () { });
    if (!p) abrirModelos("texto");   /* primeira vez: mostra o que dá para criar */
  })();
  window.addEventListener("beforeunload", function () { if (P && P.naConta) { P.atualizado = Date.now(); dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { }); contaPor(P); } else if (P) { P.atualizado = Date.now(); dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { }); } });
  window.BWReels = {puxarDaConta: puxarDaConta, conta: contaLer, abrirPers: abrirPers, lib: function () { return LIB; }, somPronto: function () { prepararSom(); return !!somAuto.src; }, projeto: function () { return P; }, tocar: tocar, parar: parar, posicionar: posicionar, validar: validar, abrirModelos: abrirModelos, normalizarCenas: function (l, b) { return normalizarCenas(l, b || {}); }};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
