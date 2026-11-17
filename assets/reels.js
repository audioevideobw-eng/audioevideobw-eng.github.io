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
      var r = indexedDB.open("bw_reels", 1);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("projetos")) d.createObjectStore("projetos", {keyPath: "id"});
        if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}).createIndex("projeto", "projeto");
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
      dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { });
      try { localStorage.setItem("ui_reels_ultimo", P.id); } catch (e) { }
    }, 500);
  }

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
  $("fVolMus").oninput = function () { P.roteiro.audio = P.roteiro.audio || {}; P.roteiro.audio.volumeMusica = Number(this.value) / 100; salvar(); prepararMusica(); };

  /* ---------- prévia ---------- */
  var musica = new Audio(); musica.preload = "auto";
  function prepararMusica() {
    var a = P.roteiro.audio || {}; var u = a.musica ? urlDe(a.musica) : null;
    if (!u) { musica.pause(); musica.removeAttribute("src"); return; }
    if (musica.dataset.src !== u) { musica.src = u; musica.dataset.src = u; }
    musica.volume = Math.max(0, Math.min(1, a.volumeMusica != null ? a.volumeMusica : 0.6));
  }
  function roteiroParaPrevia() {
    var r = JSON.parse(JSON.stringify(P.roteiro));
    r.cenas.forEach(function (c) { if (c.midia) { var u = urlDe(c.midia); if (u) c.midia = u + "#" + (MID.find(function (m) { return m.url === u; }).tipo === "imagem" ? "img.jpg" : "vid.mp4"); else delete c.midia; } });
    r.audio = {}; r.efeitos = Object.assign({}, r.efeitos, {sfx: false});
    return r;
  }
  var tPrev = null;
  function atualizar() { clearTimeout(tPrev); tPrev = setTimeout(montarPrevia, 250); validar(); desenharLinha(); }
  function montarPrevia() {
    try { PLANO = M.criarPlano(roteiroParaPrevia()); } catch (e) { return; }
    var html = M.construirHtml(PLANO, "nativo");
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
    $("icPlay").innerHTML = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>'; $("btPlay").setAttribute("aria-label", "Pausar");
    requestAnimationFrame(laco);
  }
  function parar() {
    TOCANDO = false; musica.pause();
    var w = $("quadro").contentWindow; if (w) { w.__TOCANDO = false; try { w.__seek(T); } catch (e) { } }
    $("icPlay").innerHTML = '<path d="M7 4l13 8-13 8z"/>'; $("btPlay").setAttribute("aria-label", "Reproduzir");
  }
  $("btPlay").onclick = function () { TOCANDO ? parar() : tocar(); };
  $("barra").oninput = function () { if (TOCANDO) parar(); posicionar(Number(this.value) / 1000 * (PLANO ? PLANO.duracao : 0)); SEL = cenaNoTempo(T); marcarCena(); };
  $("btAnt").onclick = function () { parar(); SEL = Math.max(0, cenaNoTempo(T) - (T - inicioCena(cenaNoTempo(T)) < 0.3 ? 1 : 0)); posicionar(inicioCena(SEL) + 0.05); desenharTudo(); };
  $("btProx").onclick = function () { parar(); SEL = Math.min(P.roteiro.cenas.length - 1, cenaNoTempo(T) + 1); posicionar(inicioCena(SEL) + 0.05); desenharTudo(); };
  $("chkZonas").onchange = function () { $("zonaT").hidden = $("zonaB").hidden = !this.checked; try { localStorage.setItem("ui_reels_zonas", this.checked ? "1" : "0"); } catch (e) { } };

  /* ---------- linha do tempo ---------- */
  var NOMES = {gancho: "Gancho", texto: "Texto", midia: "Mídia", dado: "Dado", lista: "Lista", citacao: "Citação", cta: "Chamada", personagem: "Personagem"};
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
    personagem: ["gTexto", "gEnfase", "gPers"]
  };
  function textoPrincipal(c) { return c.tipo === "texto" || c.tipo === "lista" ? (c.titulo || "") : (c.texto || ""); }
  function desenharCena() {
    var c = P.roteiro.cenas[SEL];
    $("cenaVazia").hidden = !!c; $("cenaForm").hidden = !c; if (!c) return;
    ["gTexto", "gEnfase", "gSub", "gChamada", "gItens", "gDado", "gAutor", "gAcao", "gPers"].forEach(function (g) { $(g).hidden = (CAMPOS[c.tipo] || []).indexOf(g) < 0; });
    $("cTipo").value = c.tipo; $("cDur").value = c.duracao;
    $("cTexto").value = textoPrincipal(c); $("cEnfase").value = (c.enfase || []).join(", "); $("cSub").value = c.subtitulo || ""; $("cChamada").value = c.chamada || "";
    $("cItens").value = (c.itens || []).join("\n"); $("cValor").value = c.valor != null ? c.valor : ""; $("cCasas").value = c.casas || 0;
    $("cPref").value = c.prefixo || ""; $("cSuf").value = c.sufixo || ""; $("cRotulo").value = c.rotulo || ""; $("cFonte").value = c.fonte || "";
    $("cAutor").value = c.autor || ""; $("cAcao").value = c.acao || ""; $("cMov").value = c.movimento || ""; $("cTrans").value = c.transicao || "";
    $("cIni").value = c.inicioNoArquivo || 0; $("cFala").value = c.fala || "";
    $("cTexto").previousElementSibling.textContent = c.tipo === "lista" ? "Título da lista" : c.tipo === "citacao" ? "Frase" : c.tipo === "personagem" ? "Texto no alto da tela (opcional)" : "Texto na tela";
    if (c.tipo === "personagem") desenharPers(c);
    desenharMidias();
    $("cEsq").disabled = SEL === 0; $("cDir").disabled = SEL >= P.roteiro.cenas.length - 1;
  }
  function lerCena() {
    var c = P.roteiro.cenas[SEL]; if (!c) return;
    var tipo = $("cTipo").value, txt = $("cTexto").value.trim();
    var n = {tipo: tipo, duracao: Math.max(0.5, Math.min(30, Number(String($("cDur").value).replace(",", ".")) || 3))};
    if (tipo === "texto" || tipo === "lista") n.titulo = txt; else if (tipo !== "dado") n.texto = txt;
    var enf = $("cEnfase").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean); if (enf.length) n.enfase = enf;
    if (tipo === "texto" && $("cSub").value.trim()) n.subtitulo = $("cSub").value.trim();
    if (tipo === "gancho" && $("cChamada").value.trim()) n.chamada = $("cChamada").value.trim();
    if (tipo === "lista") n.itens = $("cItens").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
    if (tipo === "dado") {
      var v = Number(String($("cValor").value).replace(",", ".")); n.valor = isFinite(v) ? v : 0;
      if (Number($("cCasas").value)) n.casas = Number($("cCasas").value);
      if ($("cPref").value.trim()) n.prefixo = $("cPref").value.trim() + " ";
      if ($("cSuf").value.trim()) n.sufixo = ($("cSuf").value.trim().length > 2 ? " " : "") + $("cSuf").value.trim();
      n.rotulo = $("cRotulo").value.trim(); n.fonte = $("cFonte").value.trim();
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
    if (id === "cTipo" && this.value === "personagem" && era !== "personagem") { var d0 = Number(P.roteiro.cenas[SEL].duracao) || 3.5; P.roteiro.cenas[SEL] = {tipo: "personagem", duracao: Math.max(3, d0), personagem: "be", acao: "acena", balao: "Oi! Olha só isso", cenario: "raios", entrada: "pula"}; salvar(); desenharCena(); atualizar(); return; }
    lerCena(); salvar(); desenharCena(); atualizar(); }); });
  ["cDur", "cTexto", "cEnfase", "cSub", "cChamada", "cItens", "cValor", "cCasas", "cPref", "cSuf", "cRotulo", "cFonte", "cAutor", "cAcao", "cIni", "cFala"].forEach(function (id) {
    $(id).addEventListener("input", function () { lerCena(); salvar(); atualizar(); });
  });

  /* ---------- cena PERSONAGEM (motor desenha e anima) ---------- */
  var NOMES_ACAO = {parado: "Parado", acena: "Acena", fala: "Fala", aponta: "Aponta", comemora: "Comemora", pensa: "Pensa", surpresa: "Se assusta"};
  var PS = {a: "be", b: ""};
  var corDe = function (id, cores) { var p = M.PERSONAGENS[id]; if (!p) return "#FFB547"; var c = Object.assign({}, p.cores, cores || {}); return p.desenho === "pessoa" ? c.roupa : c.detalhe; };
  function miniPers(id) { return M.svgPersonagem(id).replace(/id="bwLente"/g, 'id="bwL' + id + '"').replace(/url\(#bwLente\)/g, "url(#bwL" + id + ")"); }
  function elencoDe(c) { return c.elenco && c.elenco.length ? c.elenco : [{personagem: c.personagem || "be", acao: c.acao}]; }
  function desenharPers(c) {
    var el = elencoDe(c); PS.a = el[0].personagem || "be"; PS.b = el[1] ? el[1].personagem || "be" : "";
    var ids = Object.keys(M.PERSONAGENS);
    var botao = function (id, sel, grupo) { return '<button type="button" class="ps-bt' + (id === sel ? " on" : "") + '" data-ps="' + grupo + '" data-id="' + id + '" aria-pressed="' + (id === sel) + '"><span>' + miniPers(id) + '</span>' + esc(M.PERSONAGENS[id].nome.split(" ")[0]) + '</button>'; };
    $("psA").innerHTML = ids.map(function (id) { return botao(id, PS.a, "a"); }).join("");
    $("psB").innerHTML = '<button type="button" class="ps-bt nada' + (!PS.b ? " on" : "") + '" data-ps="b" data-id="" aria-pressed="' + !PS.b + '"><span>—</span>Ninguém</button>' + ids.map(function (id) { return botao(id, PS.b, "b"); }).join("");
    var ops = M.ACOES.map(function (a) { return '<option value="' + a + '">' + NOMES_ACAO[a] + '</option>'; }).join("");
    $("psAcaoA").innerHTML = '<option value="">Automático (fala quando tem balão)</option>' + ops; $("psAcaoB").innerHTML = $("psAcaoA").innerHTML;
    $("psAcaoA").value = el[0].acao || ""; $("psAcaoB").value = el[1] && el[1].acao || "";
    $("psCorA").value = corDe(PS.a, el[0].cores); $("psCorB").value = corDe(PS.b || "be", el[1] && el[1].cores);
    $("psLinhaB").hidden = !PS.b;
    var falas = c.falas && c.falas.length ? c.falas : (c.balao ? [{quem: 0, texto: c.balao}] : []);
    var nomeA = M.PERSONAGENS[PS.a].nome.split(" ")[0], nomeB = PS.b ? M.PERSONAGENS[PS.b].nome.split(" ")[0] : "";
    var linhas = ""; for (var k = 0; k < 4; k++) { var f = falas[k] || {quem: k % 2 && PS.b ? 1 : 0, texto: ""};
      linhas += '<div class="ps-fala"><select id="psQuem' + k + '" aria-label="Quem fala ' + (k + 1) + '"><option value="0">' + esc(nomeA) + '</option>' + (PS.b ? '<option value="1"' + (f.quem === 1 ? " selected" : "") + '>' + esc(nomeB) + '</option>' : "") + '</select>' +
        '<input id="psFala' + k + '" aria-label="Fala ' + (k + 1) + '" value="' + esc(f.texto) + '" placeholder="' + (k ? "(opcional)" : "ex.: Seu evento ao vivo!") + '"></div>'; }
    $("psFalas").innerHTML = linhas;
    $("psCenario").value = c.cenario || "raios"; $("psEntrada").value = c.entrada || "pula";
  }
  function lerPers(n) {
    var coresDe = function (id, cor) { var p = M.PERSONAGENS[id]; if (!p || cor.toLowerCase() === String(corDe(id)).toLowerCase()) return null; var o = {}; o[p.desenho === "pessoa" ? "roupa" : "detalhe"] = cor; return o; };
    var a = {personagem: PS.a}; if ($("psAcaoA").value) a.acao = $("psAcaoA").value; var ca = coresDe(PS.a, $("psCorA").value); if (ca) a.cores = ca;
    var el = [a];
    if (PS.b) { var b = {personagem: PS.b}; if ($("psAcaoB").value) b.acao = $("psAcaoB").value; var cb = coresDe(PS.b, $("psCorB").value); if (cb) b.cores = cb; el.push(b); }
    n.elenco = el;
    var falas = []; for (var k = 0; k < 4; k++) { var t = ($("psFala" + k) || {}).value; if (t && t.trim()) falas.push({quem: PS.b ? Number($("psQuem" + k).value) || 0 : 0, texto: t.trim()}); }
    if (falas.length) n.falas = falas;
    n.cenario = $("psCenario").value; n.entrada = $("psEntrada").value;
  }
  ["psA", "psB"].forEach(function (id) {
    $(id).addEventListener("click", function (e) {
      var b = e.target.closest("[data-ps]"); if (!b) return;
      lerCena(); var c = P.roteiro.cenas[SEL]; var el = elencoDe(c).map(function (x) { return Object.assign({}, x); });
      if (b.dataset.ps === "a") { el[0] = {personagem: b.dataset.id}; }
      else if (!b.dataset.id) { el = [el[0]]; (c.falas || []).forEach(function (f) { f.quem = 0; }); }
      else { el[1] = {personagem: b.dataset.id}; }
      c.elenco = el; delete c.personagem; delete c.acao; salvar(); desenharCena(); atualizar();
    });
  });
  ["psAcaoA", "psAcaoB", "psCenario", "psEntrada"].forEach(function (id) { $(id).addEventListener("change", function () { lerCena(); salvar(); atualizar(); }); });
  ["psCorA", "psCorB"].forEach(function (id) { $(id).addEventListener("input", function () { lerCena(); salvar(); atualizar(); }); });
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
    "tipos permitidos: texto (titulo, subtitulo), lista (titulo, itens até 4), dado (valor numérico, prefixo, sufixo, rotulo, fonte), cta (texto, acao). Não use citações nem atribua frases a pessoas. " +
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
  var TIPOS_OK = ["texto", "lista", "dado", "citacao", "cta", "personagem"];
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
      if (c.tipo === "lista") n.itens = (Array.isArray(c.itens) ? c.itens : []).map(String).filter(Boolean).slice(0, 4);
      if (c.tipo === "dado") { var v = Number(c.valor); if (!isFinite(v)) return; n.valor = v; if (n.prefixo) n.prefixo = n.prefixo + " "; if (n.sufixo && n.sufixo.length > 2) n.sufixo = " " + n.sufixo; }
      if (c.tipo === "texto" && !n.titulo && n.texto) { n.titulo = n.texto; delete n.texto; }
      if (c.tipo === "lista" && !n.itens.length) return;
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
    P.roteiro.cenas.forEach(function (c) { if (c.midia && !urlDe(c.midia)) er.push("cena " + (P.roteiro.cenas.indexOf(c) + 1) + ": a mídia não está mais neste aparelho"); });
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
  $("btPacote").onclick = async function () {
    var v = validar(true); if (v.erros.length) { trocarAba("exportar"); alert("Corrija os itens em vermelho antes de gerar o vídeo."); return; }
    ocupado("Montando o pacote para o BW Reels Studio…");
    try {
      var Z = await carregarJSZip(); var zip = new Z(); var r = roteiroFinal();
      var usados = {}; r.cenas.forEach(function (c) { if (c.midia) usados[c.midia] = 1; }); if ((r.audio || {}).musica) usados[r.audio.musica] = 1;
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
    $("glGrade").innerHTML = cards.join("");
    $("glIA").hidden = CAT !== "ia";
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

  /* ---------- projetos ---------- */
  async function abrir(p) {
    parar(); P = p; SEL = 0; T = 1.5;   /* parado no início a cena ainda está entrando: mostra 1,5 s */
    P.roteiro = P.roteiro || roteiroBase(); P.briefing = P.briefing || {}; P.fatos = P.fatos || []; P.ganchos = P.ganchos || [];
    await carregarMidias();
    $("nomeProj").value = P.nome || ""; Object.keys(BRIEF).forEach(function (id) { $(id).value = P.briefing[BRIEF[id]] || ($(id).tagName === "SELECT" ? $(id).options[0].value : ""); });
    $("fLegenda").value = P.legenda || ""; $("motorNota").textContent = "";
    prepararMusica(); desenharTudo(); trocarPasso(P.ganchos.length ? "gancho" : "assunto"); atualizar();
    try { localStorage.setItem("ui_reels_ultimo", P.id); } catch (e) { }
  }
  function desenharTudo() { desenharLinha(); desenharCena(); desenharMidias(); if (PASSO === "gancho") desenharGanchos(); if (PASSO === "estilo") desenharEstilo(); }
  $("btNovo").onclick = function () { abrirModelos("texto"); };
  $("btMeus").onclick = async function () {
    var lista = (await dbTodos("projetos").catch(function () { return []; })).sort(function (a, b) { return b.atualizado - a.atualizado; });
    $("listaMeus").innerHTML = lista.length ? lista.map(function (p) {
      var d = new Date(p.atualizado); var quando = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
      return '<li><span><b>' + esc(p.nome || p.briefing && p.briefing.assunto || "Sem nome") + '</b><small>' + (p.roteiro && p.roteiro.cenas ? p.roteiro.cenas.length : 0) + ' cenas · ' + quando + (P && p.id === P.id ? " · aberto" : "") + '</small></span>' +
        '<span style="display:flex;gap:6px"><button type="button" class="rl-bt peq" data-abrir="' + p.id + '">ABRIR</button><button type="button" class="rl-bt peq" data-apagar="' + p.id + '" aria-label="Excluir ' + esc(p.nome || "reel") + '">✕</button></span></li>';
    }).join("") : '<li><span class="rl-nota">Nenhum reel salvo neste aparelho.</span></li>';
    $("folhaMeus").hidden = false;
  };
  $("btFecharMeus").onclick = function () { $("folhaMeus").hidden = true; };
  $("folhaMeus").addEventListener("click", async function (e) {
    if (e.target === this) { this.hidden = true; return; }
    var a = e.target.closest("[data-abrir]"), d = e.target.closest("[data-apagar]");
    if (a) { var p = await dbGet("projetos", a.dataset.abrir); if (p) { await abrir(p); this.hidden = true; } }
    if (d) {
      if (!confirm("Excluir este reel e as mídias dele deste aparelho? Não dá para desfazer.")) return;
      var ms = await midiasDoProjeto(d.dataset.apagar).catch(function () { return []; });
      for (var i = 0; i < ms.length; i++) await dbDel("midias", ms[i].id).catch(function () { });
      await dbDel("projetos", d.dataset.apagar).catch(function () { });
      if (P && P.id === d.dataset.apagar) await abrir(novoProjeto());
      $("btMeus").onclick();
    }
  });
  function abrirMotor() { $("folhaMotor").hidden = false; }
  $("btMotor").onclick = abrirMotor; $("btMotor2").onclick = abrirMotor;
  $("btFecharMotor").onclick = function () { $("folhaMotor").hidden = true; };
  $("folhaMotor").addEventListener("click", function (e) { if (e.target === this) this.hidden = true; });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("folhaMeus").hidden = true; $("folhaMotor").hidden = true; if (!$("folhaModelos").hidden) fecharModelos(); } });

  function ocupado(txt) { $("ocup").hidden = !txt; if (txt) $("ocupTxt").textContent = txt; }

  /* ---------- início ---------- */
  (async function iniciar() {
    try { $("chkZonas").checked = localStorage.getItem("ui_reels_zonas") === "1"; $("chkZonas").onchange(); } catch (e) { }
    var p = null;
    try { var ult = localStorage.getItem("ui_reels_ultimo"); if (ult) p = await dbGet("projetos", ult); } catch (e) { }
    await abrir(p || novoProjeto());
    if (!p) abrirModelos("texto");   /* primeira vez: mostra o que dá para criar */
  })();
  window.addEventListener("beforeunload", function () { if (P) { P.atualizado = Date.now(); dbPut("projetos", JSON.parse(JSON.stringify(P))).catch(function () { }); } });
  window.BWReels = {projeto: function () { return P; }, tocar: tocar, parar: parar, posicionar: posicionar, validar: validar, abrirModelos: abrirModelos, normalizarCenas: function (l, b) { return normalizarCenas(l, b || {}); }};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
