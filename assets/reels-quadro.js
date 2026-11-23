/* BW REELS PRO — QUADRO DE HISTÓRIA (17/11/2026)
   Quadro livre com blocos ligados por setas: PERSONAGEM → CENAS (com REFERÊNCIAS) → FINAL.
   Saídas: só as IMAGENS das cenas, ou o REEL montado (imagens animadas pelo motor, ou prompts de vídeo para IA de fora).
   - O quadro (textos, posições, setas) fica só neste aparelho (ui_reels_quadro); as imagens, no IndexedDB (bw_reels, loja midias).
   - Foto só sai do aparelho pela fotos-nuvem.js (confirmação + autorização, cópia ≤ 504 px, limite diário da conta).
   - Textos: UMA chamada da bw-ia (prompts das cenas + falas + legenda); sem login, monta no aparelho. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var FN_IA = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia", CHAVE_PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var uid = function () { return "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var Q = null, IMG = {}, LIGAR = null, VISTA = {x: 0, y: 0, z: 1}, tSalvar = null, OCUPADO = false;
  var W_BLOCO = 232;

  function novo() {
    var p = {id: uid(), tipo: "pers", x: 40, y: 60, nome: "", texto: ""}, c = {id: uid(), tipo: "cena", x: 330, y: 40, texto: "", fala: ""}, f = {id: uid(), tipo: "fim", x: 620, y: 60, texto: ""};
    return {blocos: [p, c, f], setas: [{de: p.id, para: c.id}, {de: c.id, para: f.id}], autor: false};
  }
  function exemplo() {
    var p = {id: uid(), tipo: "pers", x: 40, y: 150, nome: "Bia", texto: "fotógrafa de eventos, cabelo castanho preso, jaqueta preta, câmera no pescoço"};
    var r = {id: uid(), tipo: "ref", x: 330, y: 560, texto: "salão de festa elegante à noite, luzes quentes penduradas"};
    var c1 = {id: uid(), tipo: "cena", x: 330, y: 20, texto: "chega ao salão vazio e olha em volta, animada", fala: "Cheguei duas horas antes do evento"};
    var c2 = {id: uid(), tipo: "cena", x: 620, y: 20, texto: "fotografa os noivos dançando, de perto", fala: "É aqui que a mágica acontece"};
    var c3 = {id: uid(), tipo: "cena", x: 910, y: 20, texto: "mostra a foto na tela da câmera, sorrindo", fala: "E o resultado fica para sempre"};
    var f = {id: uid(), tipo: "fim", x: 1200, y: 60, texto: "Peça o seu orçamento"};
    return {blocos: [p, r, c1, c2, c3, f], setas: [{de: p.id, para: c1.id}, {de: c1.id, para: c2.id}, {de: c2.id, para: c3.id}, {de: c3.id, para: f.id}, {de: r.id, para: c1.id}, {de: r.id, para: c2.id}], autor: false};
  }
  function ler() { try { var q = JSON.parse(localStorage.getItem("ui_reels_quadro") || "null"); return q && Array.isArray(q.blocos) && q.blocos.length ? q : null; } catch (e) { return null; } }
  function guardar() { clearTimeout(tSalvar); tSalvar = setTimeout(function () { try { localStorage.setItem("ui_reels_quadro", JSON.stringify(Q)); } catch (e) { } }, 300); }
  var bloco = function (id) { return Q.blocos.filter(function (b) { return b.id === id; })[0]; };
  var db = function () { return window.BWReels && BWReels.db; };
  async function porImagem(id, blob, sufixo) { var k = id + (sufixo || ""); if (IMG[k]) URL.revokeObjectURL(IMG[k].url); IMG[k] = {blob: blob, url: URL.createObjectURL(blob)}; try { await db().put("midias", {id: "quadro-" + k, projeto: "__quadro", nome: k, tipo: "imagem", caminho: "", dur: 0, blob: blob}); } catch (e) { } }
  async function tirarImagem(id, sufixo) { var k = id + (sufixo || ""); if (IMG[k]) { URL.revokeObjectURL(IMG[k].url); delete IMG[k]; } try { await db().del("midias", "quadro-" + k); } catch (e) { } }
  async function carregarImagens() {
    for (var i = 0; i < Q.blocos.length; i++) for (var s = 0; s < 2; s++) { var k = Q.blocos[i].id + (s ? "-ia" : "");
      if (!IMG[k]) { var r = await db().get("midias", "quadro-" + k).catch(function () { return null; }); if (r && r.blob) IMG[k] = {blob: r.blob, url: URL.createObjectURL(r.blob)}; } }
  }

  /* ---------- ordem da história: segue as setas a partir do PERSONAGEM (ou da cena mais à esquerda) ---------- */
  function historia() {
    var cenas = Q.blocos.filter(function (b) { return b.tipo === "cena"; }), pers = Q.blocos.filter(function (b) { return b.tipo === "pers"; })[0], fim = Q.blocos.filter(function (b) { return b.tipo === "fim"; })[0];
    var ehCena = function (id) { return (bloco(id) || {}).tipo === "cena"; }, pos = function (a, b) { return a.x - b.x || a.y - b.y; };
    var filhos = function (id) { return Q.setas.filter(function (s) { return s.de === id && ehCena(s.para); }).map(function (s) { return bloco(s.para); }); };
    var pais = function (id) { return Q.setas.filter(function (s) { return s.para === id && ehCena(s.de); }).map(function (s) { return s.de; }); };
    var ini = pers ? filhos(pers.id) : [];
    if (!ini.length) ini = cenas.filter(function (c) { return !pais(c.id).length; }).sort(pos).slice(0, 1);
    var dentro = {}, fila = ini.slice();                       /* tudo o que as ligações alcançam a partir do começo */
    while (fila.length) { var c = fila.shift(); if (dentro[c.id]) continue; dentro[c.id] = c; fila = fila.concat(filhos(c.id)); }
    var ordem = [], visto = {}, falta = Object.keys(dentro).map(function (k) { return dentro[k]; });
    while (falta.length) {                                     /* uma cena entra depois de TODAS as que apontam para ela */
      var livres = falta.filter(function (c) { return pais(c.id).every(function (p) { return !dentro[p] || visto[p]; }); });
      var prox = (livres.length ? livres : falta).sort(pos)[0];
      visto[prox.id] = 1; ordem.push(prox); falta = falta.filter(function (c) { return c !== prox; });
    }
    var soltas = cenas.filter(function (c) { return !visto[c.id]; });
    var refs = function (c) { return Q.setas.filter(function (s) { return (s.para === c.id || (pers && s.para === pers.id)) && (bloco(s.de) || {}).tipo === "ref"; }).map(function (s) { return bloco(s.de); }); };
    return {pers: pers, fim: fim, cenas: ordem, soltas: soltas, refs: refs};
  }

  /* ---------- desenho ---------- */
  var ROT = {pers: "① PERSONAGEM", cena: "CENA", ref: "REFERÊNCIA", fim: "FINAL"};
  function htmlBloco(b, n) {
    var img = IMG[b.id], ia = IMG[b.id + "-ia"], corpo = "";
    var foto = function (rot) { return '<div class="qd-foto">' + (img ? '<img src="' + img.url + '" alt=""><button type="button" class="qd-x" data-tirar="' + b.id + '" aria-label="Tirar a imagem">✕</button>' : '<button type="button" class="qd-add" data-foto="' + b.id + '">＋ ' + rot + '</button>') + '</div>'; };
    if (b.tipo === "pers") corpo = '<button type="button" class="qd-add qd-lib" data-lib="' + b.id + '">👤 MEUS PERSONAGENS</button>' + foto("FOTO DO PERSONAGEM") + '<input class="qd-in" data-campo="nome" maxlength="40" placeholder="Nome (ex.: Bia)" value="' + esc(b.nome) + '"><textarea class="qd-in" data-campo="texto" rows="2" maxlength="200" placeholder="Como ele é: roupa, cabelo, jeito…">' + esc(b.texto) + '</textarea>';
    else if (b.tipo === "cena") corpo = (ia ? '<div class="qd-foto ia"><img src="' + ia.url + '" alt="Imagem criada para a cena"><button type="button" class="qd-x" data-tirar-ia="' + b.id + '" aria-label="Apagar a imagem criada">✕</button></div>' : "") +
      '<textarea class="qd-in" data-campo="texto" rows="3" maxlength="240" placeholder="O que acontece nesta cena?">' + esc(b.texto) + '</textarea><input class="qd-in" data-campo="fala" maxlength="90" placeholder="Fala ou texto na tela (opcional)" value="' + esc(b.fala) + '">';
    else if (b.tipo === "ref") corpo = foto("IMAGEM (opcional)") + '<textarea class="qd-in" data-campo="texto" rows="2" maxlength="200" placeholder="O que é: lugar, objeto, estilo, cores…">' + esc(b.texto) + '</textarea>';
    else corpo = '<input class="qd-in" data-campo="texto" maxlength="60" placeholder="Chamada final (ex.: Peça seu orçamento)" value="' + esc(b.texto) + '">';
    var pronto = b.tipo === "cena" && b.meuPrompt ? '<div class="qd-pp"><span>✨ Prompt pronto' + (b.meuPromptPara ? " · " + esc(b.meuPromptPara) : "") + '</span><button type="button" data-tirar-pp="' + b.id + '" aria-label="Tirar o prompt pronto">✕</button></div>' : "";
    return '<div class="qd-bloco t-' + b.tipo + (LIGAR === b.id ? " ligando" : "") + (LIGAR && LIGAR !== b.id && Q.setas.some(function (s) { return s.de === LIGAR && s.para === b.id; }) ? " ligado" : "") + '" data-id="' + b.id + '" style="left:' + b.x + 'px;top:' + b.y + 'px">' +
      (b.tipo !== "ref" ? '<i class="qd-pt ent" aria-hidden="true"></i>' : "") +
      (b.tipo !== "fim" ? '<button type="button" class="qd-pt sai" data-ligar="' + b.id + '" aria-label="Ligar este bloco a outros (toque ou arraste)" title="Arraste até outro bloco, ou toque e depois toque nos blocos"></button>' : "") +
      '<div class="qd-cab" data-pega="' + b.id + '"><b>' + ROT[b.tipo] + (b.tipo === "cena" && n ? " " + n : "") + '</b><span>' +
      (b.tipo === "cena" ? '<button type="button" class="qd-porta" data-prompt="' + b.id + '" aria-label="Melhorar o prompt desta cena" title="Melhorar o prompt desta cena">✨</button>' : "") +
      (b.tipo === "cena" || b.tipo === "ref" ? '<button type="button" class="qd-porta" data-apagar="' + b.id + '" aria-label="Excluir bloco">🗑</button>' : "") + '</span></div>' + corpo + pronto + '</div>';
  }
  function desenhar() {
    var h = historia(), num = {}; h.cenas.forEach(function (c, i) { num[c.id] = i + 1; });
    $("qdBlocos").innerHTML = Q.blocos.map(function (b) { return htmlBloco(b, num[b.id]); }).join("");
    desenharSetas();
    var falta = h.soltas.length ? h.soltas.length + " cena(s) solta(s): arraste a bolinha de um bloco até ela para entrar na história. " : "";
    $("qdDica").textContent = LIGAR ? "LIGANDO: toque em quantos blocos quiser (tocar de novo desfaz a ligação). Depois toque em ✓ PRONTO." : falta + (h.cenas.length ? h.cenas.length + " cena(s) na história. Para ligar: arraste a bolinha da direita de um bloco até outro." : "Ligue o PERSONAGEM à primeira cena: arraste a bolinha dele até a cena.");
    $("qdLigarFim").hidden = !LIGAR; $("folhaQuadro").classList.toggle("ligando", !!LIGAR);
    $("qdBaixar").hidden = !h.cenas.some(function (c) { return IMG[c.id + "-ia"]; });
    $("qdAutor").checked = !!Q.autor;
  }
  var Y_PORTA = 24, COR = {pers: "P", cena: "C", ref: "R"};
  function curva(x1, y1, x2, y2) { var dx = x2 > x1 ? Math.max(18, (x2 - x1) / 2) : 90; return "M" + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + "," + (x2 - dx) + " " + y2 + "," + x2 + " " + y2; }
  function desenharSetas(solta) {
    var s = "";
    Q.setas.forEach(function (st, i) {
      var a = bloco(st.de), b = bloco(st.para); if (!a || !b) return;
      var d = curva(a.x + W_BLOCO + 11, a.y + Y_PORTA, b.x - 10, b.y + Y_PORTA), k = COR[a.tipo] || "C";
      s += '<path d="' + d + '" class="qd-linha c' + k + (a.tipo === "ref" ? " ref" : "") + '" marker-end="url(#qdPonta' + k + ')"/><path d="' + d + '" class="qd-toque" data-seta="' + i + '"><title>Tocar para apagar a ligação</title></path>';
    });
    if (solta) s += '<path d="' + curva(solta.x1, solta.y1, solta.x2, solta.y2) + '" class="qd-linha solta"/>';
    $("qdLinhas").innerHTML = s;
  }
  function aplicarVista() { $("qdMundo").style.transform = "translate(" + VISTA.x + "px," + VISTA.y + "px) scale(" + VISTA.z + ")"; }
  function centralizar(tudo) {
    var a = $("qdArea"), xs = Q.blocos.map(function (b) { return b.x; }), ys = Q.blocos.map(function (b) { return b.y; });
    var alt = function (b) { var el = document.querySelector('.qd-bloco[data-id="' + b.id + '"]'); return el ? el.offsetHeight : 200; };
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs) + W_BLOCO, y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, Q.blocos.map(function (b) { return b.y + alt(b); }));
    var estreito = a.clientWidth < 560, mx = estreito ? 14 : 104, my = estreito ? 76 : 16;   /* folga para o trilho de ferramentas e as bolinhas */
    VISTA.z = Math.max(0.2, Math.min(1, (a.clientWidth - mx - 26) / (x1 - x0), (a.clientHeight - my - 60) / (y1 - y0)));
    if (!tudo && VISTA.z < 0.55) VISTA.z = 0.55;      /* ao abrir no celular: letras legíveis, começando pelo personagem; ⤢ mostra tudo */
    VISTA.x = mx - x0 * VISTA.z; VISTA.y = my - y0 * VISTA.z; aplicarVista();
  }
  function lugarLivre(tipo) {
    var cs = Q.blocos.filter(function (b) { return b.tipo === tipo; }), ult = cs.sort(function (a, b) { return b.x - a.x; })[0];
    if (tipo === "cena") return ult ? {x: ult.x + 290, y: ult.y} : {x: 330, y: 40};
    return ult ? {x: ult.x + 290, y: ult.y} : {x: 330, y: 560};
  }
  function addBloco(tipo) {
    var p = lugarLivre(tipo), b = {id: uid(), tipo: tipo, x: p.x, y: p.y, texto: "", fala: ""}, h = historia();
    Q.blocos.push(b);
    if (tipo === "cena") {      /* entra sozinha no fim da história, antes do FINAL */
      var ult = h.cenas[h.cenas.length - 1] || h.pers;
      if (h.fim) { Q.setas = Q.setas.filter(function (s) { return !(s.para === h.fim.id); }); Q.setas.push({de: b.id, para: h.fim.id}); if (h.fim.x < b.x + 290) h.fim.x = b.x + 290; }
      if (ult) Q.setas.push({de: ult.id, para: b.id});
    }
    guardar(); desenhar();
    var a = $("qdArea"); VISTA.x = Math.min(VISTA.x, a.clientWidth - (b.x + W_BLOCO + 16) * VISTA.z); aplicarVista();
    return b;
  }
  function ligar(de, para, alternar) {
    var a = bloco(de), b = bloco(para); if (!a || !b || de === para) return "";
    if (a.tipo === "fim") return "O FINAL é o último bloco: a ligação chega nele, não sai dele.";
    if (b.tipo === "ref") return "A ligação sai da referência e vai até a cena (ou até o personagem).";
    if (a.tipo === "ref" && b.tipo === "fim") return "A referência se liga a uma cena ou ao personagem.";
    if (b.tipo === "pers" && a.tipo !== "ref") return "A ligação sai do personagem e vai até a cena.";
    var ja = Q.setas.filter(function (s) { return s.de === de && s.para === para; })[0];
    if (ja) { if (alternar) Q.setas.splice(Q.setas.indexOf(ja), 1); return ""; }
    Q.setas = Q.setas.filter(function (s) { return !(s.de === para && s.para === de); });   /* não fica ida e volta entre os mesmos dois */
    Q.setas.push({de: de, para: para}); return "";
  }

  /* ---------- textos: uma chamada da IA (prompts em inglês + falas + legenda) ---------- */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function extrairJSON(t) { t = String(t || "").replace(/```json|```/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function plano(h) {
    return h.cenas.map(function (c) { var rs = h.refs(c); return {id: c.id, contexto: c.texto.trim(), meuPrompt: (c.meuPrompt || "").trim(), meuTipo: c.meuTipo === "video" ? "video" : "img", fala: (c.fala || "").trim(), refs: rs.map(function (r) { return r.texto.trim(); }).filter(Boolean), refImg: rs.filter(function (r) { return IMG[r.id]; })[0] || null}; });
  }
  async function textosIA(h, cenas) {
    var s = await sessao(); if (!s) return null;
    var pers = h.pers && (h.pers.nome || h.pers.texto) ? (h.pers.nome || "personagem") + (h.pers.texto ? " — " + h.pers.texto : "") : "";
    var pedido = (pers ? "Personagem: " + pers + "\n" : "Sem personagem fixo.\n") + cenas.map(function (c, i) { return "Cena " + (i + 1) + ": " + c.contexto + (c.refs.length ? " | referências: " + c.refs.join("; ") : "") + (c.fala ? ' | fala escrita pelo usuário: "' + c.fala + '"' : ""); }).join("\n");
    try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB},
        body: JSON.stringify({sistema: 'Você é diretor de arte de Reels. Para cada cena recebida, escreva em INGLÊS um prompt visual curto (uma frase: ação, enquadramento, lugar, luz), SEM texto na imagem e SEM citar marcas ou pessoas reais. Responda SÓ com JSON: {"gancho":"frase de abertura em português, até 8 palavras","cenas":[{"prompt":"...","fala":"frase curta em português, até 12 palavras"}],"legenda":"legenda do post em português"}. Mantenha o MESMO número e a MESMA ordem de cenas. Se o usuário já escreveu a fala, repita a fala dele sem mudar. Não invente números nem fatos.', pedido: pedido, max: 900})});
      var j = await r.json().catch(function () { return {}; }), d = r.ok && extrairJSON(j.texto);
      if (!d || !Array.isArray(d.cenas) || d.cenas.length !== cenas.length) return null;
      return d;
    } catch (e) { return null; }
  }
  function pedidoImagem(h, c, prompt, temFigura, usaRef) {
    var desc = h.pers && h.pers.texto ? " (" + h.pers.texto.trim() + ")" : "", refs = c.refs.length ? " Setting and details: " + c.refs.join("; ") + "." : "";
    if (temFigura) return "the same character from image 0" + desc + ", " + prompt + "." + refs + " Same art style, face, colors and outfit as image 0. Character fully visible in the lower two thirds of a vertical frame, expressive, cinematic lighting";
    if (usaRef) return prompt + ". Use the place, object and style shown in image 0." + refs + " Vertical frame, cinematic lighting";
    return (h.pers && (h.pers.texto || h.pers.nome) ? "A character" + desc + ", " : "") + prompt + "." + refs + " Vertical frame, cinematic lighting, consistent style across scenes";
  }
  function promptVideo(h, c, prompt, fala) {
    return (IMG[h.pers && h.pers.id] ? "Use the reference image: the same character, same face, design, colors and outfit. " : "") + prompt + "." + (c.refs.length ? " Setting: " + c.refs.join("; ") + "." : "") +
      " Vertical 9:16, 5 seconds, smooth cinematic camera movement, natural motion, no text on screen." + (fala ? ' The character says in Brazilian Portuguese: "' + fala + '"' : "");
  }
  /* ---------- PLANO DE PRODUÇÃO (17/11): decide, cena por cena, o que resolve no app (grátis) e o que pede IA de vídeo, e estima o custo.
     Preços de REFERÊNCIA por segundo (US$), lidos em páginas públicas em 17/11/2026 — mudam sempre: conferir no site da IA antes de pagar. ---------- */
  var VIDEO_IA = {conferido: "18/11/2026",
    eco: {nome: "Runway Gen-4 Turbo (720p, sem som)", usd: 0.05, seg: 5},
    acao: {nome: "Kling 3.0 Standard (sem som)", usd: 0.084, seg: 5},
    fala: {nome: "Veo 3.1 pela Runway (com fala)", usd: 0.40, seg: 8}};
  var RE_ACAO = /danc|corre|caminh|andando|entra\b|entrando|chega|pula|abrac|beij|fotograf|filma|grava|montando|carreg|dirig|voa\b|voando|cai\b|caindo|levanta|gira|aplaud|comemor|canta|cozinh|mergulh|joga\b|jogando|chuta|sobe\b|subindo|desce\b|descendo|atravess|persegu|foge|luta|entrega|abre\b|abrindo|serve\b|servindo/;
  var semAcento = function (t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); };
  function tipoCena(c, temPers) { var mov = RE_ACAO.test(semAcento(c.contexto || c.texto)), fala = !!String(c.fala || "").trim(); if (mov) return fala && temPers ? "acao_fala" : "acao"; if (!temPers) return "ambiente"; return fala ? "fala" : "parada"; }
  function planoVideo(cenas, temPers, modo) {
    return cenas.map(function (c) {
      var t = tipoCena(c, temPers), r = {tipo: t, via: "app", usd: 0, motor: "Animação do app", motivo: "grátis"};
      if (modo === "motor") return r;
      if (modo === "auto") {
        if (t === "acao" || t === "acao_fala") { r.via = "video"; r.motor = VIDEO_IA.eco.nome; r.usd = VIDEO_IA.eco.usd * VIDEO_IA.eco.seg; r.motivo = "tem movimento de verdade: vídeo de IA no nível econômico"; }
        else r.motivo = t === "fala" ? "fala: balão e legenda do app resolvem, grátis" : "cena parada: movimento de câmera do app resolve, grátis";
        return r;
      }
      var m = (t === "fala" || t === "acao_fala") ? VIDEO_IA.fala : VIDEO_IA.acao;
      r.via = "video"; r.motor = m.nome; r.usd = m.usd * m.seg; r.motivo = (t === "fala" || t === "acao_fala") ? "personagem falando: vídeo com fala e som" : "melhor movimento e nitidez";
      return r;
    });
  }
  var dolar = function (v) { return "US$ " + v.toFixed(2).replace(".", ","); };
  function resumoPlano(pl) { var v = pl.filter(function (x) { return x.via === "video"; }), tot = v.reduce(function (s, x) { return s + x.usd; }, 0); return {video: v.length, app: pl.length - v.length, total: tot, texto: (pl.length - v.length) + " cena(s) no app (grátis)" + (v.length ? " · " + v.length + " em IA de vídeo ≈ " + dolar(tot) : "")}; }
  function desenharMenuMontar() {
    var h = historia(), cenas = h.cenas.map(function (c) { return {contexto: c.texto, fala: c.fala}; }), temP = !!(h.pers && (IMG[h.pers.id] || h.pers.texto || h.pers.nome));
    var a = resumoPlano(planoVideo(cenas, temP, "auto")), p = resumoPlano(planoVideo(cenas, temP, "video"));
    $("qdMontarAuto").querySelector("small").textContent = "recomendado · " + (a.video ? a.texto : "nenhuma cena pede IA de vídeo: tudo grátis no app");
    $("qdMontarVideo").querySelector("small").textContent = "melhor qualidade · " + p.texto;
    $("qdMontarMotor").querySelector("small").textContent = "grátis · usa as imagens criadas ou o personagem animado";
  }
  function ocupado(t) { OCUPADO = !!t; $("qdOcup").hidden = !t; if (t) $("qdOcupTxt").textContent = t; }
  function aviso(t, erro) { $("qdAviso").hidden = !t; $("qdAviso").className = "rl-aviso " + (erro ? "erro" : "ok"); $("qdAviso").textContent = t || ""; }

  /* monta textos (IA ou aparelho) e devolve a lista pronta de cenas */
  async function preparar() {
    var h = historia();
    if (!h.cenas.length) { aviso("Ligue o PERSONAGEM à primeira cena: arraste a bolinha dele até a cena.", true); return null; }
    var vazia = h.cenas.filter(function (c) { return !c.texto.trim(); })[0];
    if (vazia) { aviso("Escreva o que acontece em cada cena (há uma cena em branco).", true); return null; }
    var cenas = plano(h);
    ocupado("Organizando a história…");
    var ia = await textosIA(h, cenas);
    cenas.forEach(function (c, i) { c.prompt = c.meuPrompt && c.meuTipo !== "video" ? c.meuPrompt.slice(0, 900) : ia ? String(ia.cenas[i].prompt || c.contexto).slice(0, 300) : c.contexto; c.falaFinal = c.fala || (ia ? String(ia.cenas[i].fala || "").slice(0, 110) : c.contexto.split(/\s+/).slice(0, 12).join(" ")); });
    ocupado();
    return {h: h, cenas: cenas, gancho: ia ? String(ia.gancho || "") : "", legenda: ia ? String(ia.legenda || "") : "", comIA: !!ia};
  }
  async function figura(h) {
    var f = h.pers && IMG[h.pers.id]; if (!f) return null;
    var A = window.BWReelsAvatar, img = await A.imagemDe(f.blob); return A.canvasDe(img, 1400);
  }
  async function criarImagens() {
    if (OCUPADO) return;
    aviso("");
    if (!(await sessao())) { aviso("Entre na sua conta para a IA criar as imagens", true); return; }
    var p = await preparar(); if (!p) return;
    var fig = await figura(p.h), usaFoto = !!fig || p.cenas.some(function (c) { return c.refImg; });
    if (usaFoto && !$("qdAutor").checked) { aviso("Marque que as imagens são suas ou que você tem autorização de quem aparece nelas.", true); return; }
    var faltam = p.cenas.filter(function (c) { return !IMG[c.id + "-ia"]; });
    if (!faltam.length) { aviso("Todas as cenas já têm imagem. Apague a de uma cena (✕) para criar outra."); return; }
    if (!confirm("A IA vai criar " + faltam.length + " imagem(ns) (das 15 por dia da sua conta)." + (usaFoto ? " Vamos enviar uma cópia pequena das fotos do quadro (personagem e referência); nada fica guardado." : "") + " Continuar?")) return;
    var A = window.BWReelsAvatar, peq = fig ? await A.jpgPequeno(fig, 504) : null, feitas = 0, falhou = "";
    /* personagem da biblioteca com vários planos: cada cena leva o plano parecido com ela (rosto no close, costas quando está de costas…) */
    var recP = fig && p.h.pers.persId && window.BWPersonagens ? await BWPersonagens.obter(p.h.pers.persId) : null, cachePl = {}, PLANOS_USADOS = [];
    var baseDaCena = async function (c) { if (!recP) return peq; var x = BWPersonagens.imagemPara(recP, c.contexto, p.h.pers.persVar); if (!x) return peq; PLANOS_USADOS.push(x.plano); if (!cachePl[x.plano]) cachePl[x.plano] = await A.jpgPequeno(A.canvasDe(await A.imagemDe(x.blob), 1400), 504); return cachePl[x.plano]; };
    window.__qdPlanos = PLANOS_USADOS;
    for (var i = 0; i < p.cenas.length; i++) {
      var c = p.cenas[i]; if (IMG[c.id + "-ia"]) continue;
      ocupado("A IA está desenhando a cena " + (i + 1) + " de " + p.cenas.length + "…");
      var base = await baseDaCena(c), usaRef = false, ref2 = null;
      var refPeq = c.refImg ? await A.jpgPequeno(A.canvasDe(await A.imagemDe(IMG[c.refImg.id].blob), 1400), 504) : null;
      if (!base && refPeq) { base = refPeq; usaRef = true; } else if (base && refPeq) ref2 = refPeq;     /* personagem = imagem 0, referência = imagem 1 */
      var r = await window.BWFotosNuvem.arte(base, pedidoImagem(p.h, c, c.prompt, !!peq, usaRef) + (ref2 ? " Place the character in the place shown in image 1 and use its objects and style." : ""), 576, 1024, "topo", 2000 + i * 41, ref2);
      if (r.erro) { falhou = window.BWFotosNuvem.msg(r.erro); break; }
      await porImagem(c.id, r.blob, "-ia"); feitas++; desenhar();
    }
    ocupado(); desenhar();
    aviso(falhou ? "Criei " + feitas + " imagem(ns) e parei: " + falhou : "✓ " + feitas + " imagem(ns) criada(s). Baixe as fotos ou monte o vídeo.", !!falhou);
  }
  async function baixar() {
    var h = historia(), arqs = [];
    h.cenas.forEach(function (c, i) { var m = IMG[c.id + "-ia"]; if (m) arqs.push(new File([m.blob], "cena-" + (i + 1) + ".jpg", {type: m.blob.type || "image/jpeg"})); });
    if (!arqs.length) return;
    try { if (navigator.canShare && navigator.canShare({files: arqs}) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { await navigator.share({files: arqs, title: "Imagens da história"}); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    arqs.forEach(function (f, i) { setTimeout(function () { var a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }, i * 350); });
    aviso("✓ " + arqs.length + " imagem(ns) baixada(s).");
  }
  async function montar(modo) {
    if (OCUPADO) return;
    aviso("");
    var p = await preparar(); if (!p) return;
    ocupado("Montando o reel…");
    var fig = await figura(p.h), png = fig ? await window.BWReelsAvatar.pngDe(fig) : null;
    var pl = planoVideo(p.cenas, !!(fig || (p.h.pers && (p.h.pers.texto || p.h.pers.nome))), modo), res = resumoPlano(pl);
    var q = {nome: (p.h.pers && p.h.pers.nome ? "História de " + p.h.pers.nome : "História do quadro"), personagem: p.h.pers && p.h.pers.nome || "personagem", figura: png, gancho: p.gancho, legenda: p.legenda,
      cta: p.h.fim ? p.h.fim.texto.trim() : "", modo: modo,
      cenas: p.cenas.map(function (c, i) { var m = IMG[c.id + "-ia"], x = pl[i];
        return {fala: c.falaFinal, contexto: c.contexto, imagem: m ? m.blob : null, video: x.via === "video", promptVideo: "[" + x.motor + " · " + (x.usd ? "≈ " + dolar(x.usd) : "grátis") + (m ? " · use a imagem desta cena como primeiro quadro" : "") + "] " + (c.meuPrompt && c.meuTipo === "video" ? c.meuPrompt : promptVideo(p.h, c, c.prompt, c.falaFinal))}; })};
    try { await BWReels.montarDoQuadro(q); } catch (e) { ocupado(); aviso("Não deu para montar: " + (e && e.message || e), true); return; }
    ocupado(); fechar();
    var semImg = q.cenas.filter(function (c) { return !c.imagem && !c.video; }).length;
    setTimeout(function () { alert("Reel montado com " + q.cenas.length + " cena(s)! Plano: " + res.texto + "." + (p.comIA ? " Textos organizados pela IA Brightway." : " Textos montados no aparelho.") + (res.video ? " As cenas de IA de vídeo já têm o texto pronto na aba MÍDIA: no aplicativo BW do PC, com a sua IA conectada, toque em GERAR O CLIPE AQUI; fora dele, copie o texto, gere no site da IA e importe. Preços de referência de " + VIDEO_IA.conferido + "; confira no site da IA antes de pagar." : semImg ? " " + semImg + " cena(s) sem imagem ficaram com o personagem animado ou só com o texto." : "")); }, 250);
  }

  /* ---------- abrir / fechar ---------- */
  async function abrir() {
    if (!db()) return;
    Q = ler() || novo(); $("folhaQuadro").hidden = false; document.documentElement.classList.add("qd-aberto");
    await carregarImagens(); LIGAR = null; aviso(""); desenhar(); centralizar(false);
  }
  function fechar() { fecharPrompt(); $("folhaQuadro").hidden = true; document.documentElement.classList.remove("qd-aberto"); $("qdMenuMontar").hidden = true; }

  function iniciar() {
    if (!$("folhaQuadro")) return;
    $("btQuadro").onclick = abrir; $("qdFechar").onclick = fechar;
    $("qdMaisCena").onclick = function () { addBloco("cena"); };
    $("qdMaisRef").onclick = function () { addBloco("ref"); aviso("✓ Referência criada — arraste a bolinha dela até as cenas"); };
    $("qdCentro").onclick = function () { centralizar(true); };
    $("qdZoomMais").onclick = function () { VISTA.z = Math.min(1.4, VISTA.z * 1.2); aplicarVista(); };
    $("qdZoomMenos").onclick = function () { VISTA.z = Math.max(0.3, VISTA.z / 1.2); aplicarVista(); };
    $("qdImagens").onclick = criarImagens; $("qdBaixar").onclick = baixar;
    $("qdMontar").onclick = function () { $("qdMenuMontar").hidden = !$("qdMenuMontar").hidden; if (!$("qdMenuMontar").hidden) desenharMenuMontar(); };
    $("qdMontarAuto").onclick = function () { $("qdMenuMontar").hidden = true; montar("auto"); };
    $("qdMontarMotor").onclick = function () { $("qdMenuMontar").hidden = true; montar("motor"); };
    $("qdMontarVideo").onclick = function () { $("qdMenuMontar").hidden = true; montar("video"); };
    $("qdAutor").onchange = function () { Q.autor = this.checked; guardar(); };
    $("qdExemplo").onclick = async function () { if (!confirm("Trocar o quadro atual pelo exemplo? O que está no quadro será apagado.")) return; await limparImagens(); Q = exemplo(); guardar(); desenhar(); centralizar(); };
    $("qdLimpar").onclick = async function () { if (!confirm("Apagar tudo do quadro (blocos e imagens criadas)? Não dá para desfazer.")) return; await limparImagens(); Q = novo(); guardar(); desenhar(); centralizar(); };
    async function limparImagens() { for (var k in IMG) { URL.revokeObjectURL(IMG[k].url); try { await db().del("midias", "quadro-" + k); } catch (e) { } } IMG = {}; }

    var area = $("qdArea"), arr = null, arrastou = false;
    $("qdLigarFim").onclick = function () { LIGAR = null; aviso(""); desenhar(); };
    /* arrastar a bolinha (porta) de um bloco até outro = ligação na hora; dá para repetir quantas vezes quiser */
    var puxa = null, noMundo = function (e) { var r = area.getBoundingClientRect(); return {x: (e.clientX - r.left - VISTA.x) / VISTA.z, y: (e.clientY - r.top - VISTA.y) / VISTA.z}; };
    area.addEventListener("pointerdown", function (e) {
      var pt = e.target.closest(".qd-pt.sai"); if (!pt) return;
      var b = bloco(pt.dataset.ligar); if (!b) return;
      puxa = {de: b.id, x: e.clientX, y: e.clientY, x1: b.x + W_BLOCO + 11, y1: b.y + Y_PORTA, moveu: false}; arrastou = false;
    }, true);
    window.addEventListener("pointermove", function (e) {
      if (!puxa) return;
      if (!puxa.moveu && Math.abs(e.clientX - puxa.x) + Math.abs(e.clientY - puxa.y) < 8) return;
      puxa.moveu = true; var m = noMundo(e); desenharSetas({x1: puxa.x1, y1: puxa.y1, x2: m.x, y2: m.y});
      var alvo = document.elementFromPoint(e.clientX, e.clientY), bl = alvo && alvo.closest && alvo.closest(".qd-bloco");
      document.querySelectorAll(".qd-bloco.alvo").forEach(function (x) { if (x !== bl) x.classList.remove("alvo"); });
      if (bl && bl.dataset.id !== puxa.de) bl.classList.add("alvo");
    });
    window.addEventListener("pointerup", function (e) {
      if (!puxa) return; var p = puxa; puxa = null;
      if (!p.moveu) return;                                    /* foi só um toque: o clique liga o modo de toque */
      arrastou = true; setTimeout(function () { arrastou = false; }, 60);
      var alvo = document.elementFromPoint(e.clientX, e.clientY), bl = alvo && alvo.closest && alvo.closest(".qd-bloco"), m = "";
      if (bl && bl.dataset.id !== p.de) { m = ligar(p.de, bl.dataset.id); guardar(); }
      desenhar(); aviso(m, !!m);
    });
    $("qdBlocos").addEventListener("input", function (e) { var el = e.target.closest("[data-campo]"); if (!el) return; var b = bloco(el.closest(".qd-bloco").dataset.id); if (b) { b[el.dataset.campo] = el.value; guardar(); } });
    $("qdBlocos").addEventListener("click", async function (e) {
      var t = e.target, x;
      if ((x = t.closest("[data-ligar]"))) { if (arrastou) { arrastou = false; return; } LIGAR = LIGAR === x.dataset.ligar ? null : x.dataset.ligar; aviso(""); desenhar(); return; }
      if ((x = t.closest("[data-prompt]"))) { abrirPrompt(x.dataset.prompt); return; }
      if ((x = t.closest("[data-lib]"))) { escolherPers(); return; }
      if ((x = t.closest("[data-tirar-pp]"))) { var bp = bloco(x.dataset.tirarPp); if (bp) { delete bp.meuPrompt; delete bp.meuPromptPara; guardar(); desenhar(); } return; }
      if ((x = t.closest("[data-apagar]"))) { if (!confirm("Excluir este bloco?")) return; var id = x.dataset.apagar, ent = Q.setas.filter(function (s) { return s.para === id && (bloco(s.de) || {}).tipo !== "ref"; })[0], sai = Q.setas.filter(function (s) { return s.de === id; })[0];
        Q.blocos = Q.blocos.filter(function (b) { return b.id !== id; }); Q.setas = Q.setas.filter(function (s) { return s.de !== id && s.para !== id; });
        if (ent && sai && bloco(ent.de) && bloco(sai.para)) Q.setas.push({de: ent.de, para: sai.para});     /* a história continua ligada */
        await tirarImagem(id); await tirarImagem(id, "-ia"); guardar(); desenhar(); return; }
      if ((x = t.closest("[data-foto]"))) { $("qdArquivo").dataset.para = x.dataset.foto; $("qdArquivo").click(); return; }
      if ((x = t.closest("[data-tirar]"))) { await tirarImagem(x.dataset.tirar); desenhar(); return; }
      if ((x = t.closest("[data-tirar-ia]"))) { await tirarImagem(x.dataset.tirarIa, "-ia"); desenhar(); return; }
      var bl = t.closest(".qd-bloco");
      if (LIGAR && bl && bl.dataset.id !== LIGAR && !t.closest("input,textarea,button")) { var m = ligar(LIGAR, bl.dataset.id, true); guardar(); desenhar(); if (m) aviso(m, true); else aviso(""); }   /* continua ligando: quantas quiser */
    });
    $("qdArquivo").onchange = async function () {
      var f = this.files && this.files[0], id = this.dataset.para; this.value = ""; if (!f || !id) return;
      try { var A = window.BWReelsAvatar, blob = new Blob([await f.arrayBuffer()], {type: f.type}), c = A.canvasDe(await A.imagemDe(blob), 1400);
        if ((bloco(id) || {}).tipo === "pers") { var rec = A.recortarLiso(c); if (rec) c = rec; }
        await porImagem(id, await A.pngDe(c)); desenhar();
      } catch (e) { aviso("Não deu para abrir essa imagem. Tente PNG ou JPG.", true); }
    };
    $("qdLinhas").addEventListener("click", function (e) { var s = e.target.closest("[data-seta]"); if (!s) return; if (!confirm("Apagar esta ligação?")) return; Q.setas.splice(Number(s.dataset.seta), 1); guardar(); desenhar(); });
    /* arrastar: bloco pelo cabeçalho; fundo move o quadro. Medido em pixels da tela ÷ zoom. */
    area.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button,input,textarea,.qd-toque,.qd-pt")) return;
      var pg = e.target.closest("[data-pega]");
      arr = pg ? {b: bloco(pg.dataset.pega), x: e.clientX, y: e.clientY, bx: 0, by: 0, el: pg.closest(".qd-bloco")} : {x: e.clientX, y: e.clientY, vx: VISTA.x, vy: VISTA.y};
      if (arr.b) { arr.bx = arr.b.x; arr.by = arr.b.y; }
      try { area.setPointerCapture(e.pointerId); } catch (x) { }
    });
    area.addEventListener("pointermove", function (e) {
      if (!arr) return;
      var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
      if (arr.b) { arr.b.x = Math.round(Math.max(0, arr.bx + dx / VISTA.z)); arr.b.y = Math.round(Math.max(0, arr.by + dy / VISTA.z)); arr.el.style.left = arr.b.x + "px"; arr.el.style.top = arr.b.y + "px"; arr.moveu = true; desenharSetas(); }
      else { VISTA.x = arr.vx + dx; VISTA.y = arr.vy + dy; aplicarVista(); }
    });
    var soltar = function () { if (arr && arr.b && arr.moveu) guardar(); arr = null; };
    area.addEventListener("pointerup", soltar); area.addEventListener("pointercancel", soltar);
    area.addEventListener("wheel", function (e) { e.preventDefault(); VISTA.z = Math.max(0.3, Math.min(1.4, VISTA.z * (e.deltaY < 0 ? 1.1 : 0.9))); aplicarVista(); }, {passive: false});
    document.addEventListener("keydown", function (e) { if (e.key !== "Escape" || $("folhaQuadro").hidden || OCUPADO) return; if (!$("qdLib").hidden) { $("qdLib").hidden = true; return; } if (!$("qdPrompt").hidden) { fecharPrompt(); return; } if (LIGAR) { LIGAR = null; desenhar(); return; } fechar(); });
    iniciarPrompt();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  /* ---------- ORGANIZAR: põe os blocos em fila, na ordem da história ---------- */
  function organizar() {
    var h = historia(), x = 40;
    if (h.pers) { h.pers.x = x; h.pers.y = 60; x += 300; }
    h.cenas.forEach(function (c) { c.x = x; c.y = 40; x += 300; });
    if (h.fim) { h.fim.x = x; h.fim.y = 60; }
    var x2 = 340;
    Q.blocos.filter(function (b) { return b.tipo === "ref"; }).concat(h.soltas).forEach(function (b) { b.x = x2; b.y = 600; x2 += 300; });
    guardar(); desenhar(); centralizar(true);
  }

  /* ---------- ✨ MELHORAR PROMPT: a pessoa fala (ou escreve) o que quer → prompt pronto para a IA escolhida ----------
     Só TEXTO vai para a IA Brightway (bw-ia): o pedido + personagem/referências do quadro. Nenhuma foto sai daqui.
     Nenhuma IA de fora é chamada: o app entrega o texto e a pessoa cola na IA dela. */
  var DEST = [
    {id: "higgsfield", nome: "Higgsfield", tipos: ["video", "img"], url: "https://higgsfield.ai/",
      video: "Higgsfield image-to-video: first the subject and its action, then ONE clearly named camera move (dolly in, crash zoom, orbit, crane up, handheld follow, FPV…), then lighting and mood. 1 to 3 short sentences.",
      img: "Higgsfield image model: photoreal look — subject, outfit, place, lens or film look, lighting. One short paragraph."},
    {id: "gemini", nome: "Gemini (Nano Banana)", tipos: ["img"], url: "https://gemini.google.com/",
      img: "Gemini image generation: one natural-language paragraph (not keyword lists) — subject, action, setting, composition and framing, lighting, style. Say explicitly: vertical 9:16."},
    {id: "flow", nome: "Flow / Veo (Google)", tipos: ["video"], url: "https://labs.google/flow",
      video: "Google Veo: shot type and framing, subject, action, setting, camera movement, lighting and mood, then AUDIO (ambient sound, and dialogue in quotes saying it is spoken in Brazilian Portuguese). One paragraph."},
    {id: "kling", nome: "Kling", tipos: ["video"], url: "https://klingai.com/",
      video: "Kling: subject + specific movement, scene, camera language (shot size and movement), lighting and atmosphere. 2 to 4 sentences, concrete physical motion, no abstract words."},
    {id: "runway", nome: "Runway", tipos: ["video"], url: "https://app.runwayml.com/",
      video: "Runway image-to-video: describe only the MOTION (camera movement first, then what the subject does, then what the scene does). Do not re-describe what is already in the image. 1 to 3 sentences."},
    {id: "midjourney", nome: "Midjourney", tipos: ["img"], url: "https://www.midjourney.com/",
      img: "Midjourney: short descriptive phrases separated by commas (subject, setting, lighting, style, lens), ending with the parameter --ar 9:16."},
    {id: "flux", nome: "Flux", tipos: ["img"], url: "",
      img: "FLUX: one clear descriptive paragraph — subject first, then setting, composition, lighting, style; precise and literal."},
    {id: "outra", nome: "Outra IA", tipos: ["video", "img"], url: "",
      video: "Generic video model: subject, action, setting, camera movement, lighting. 2 to 3 sentences.",
      img: "Generic image model: subject, action, setting, composition, lighting, style. One paragraph."}
  ];
  var PP = {cena: null, dest: "higgsfield", tipo: "video", rec: null, grav: null};
  function destino() { return DEST.filter(function (d) { return d.id === PP.dest; })[0] || DEST[0]; }
  function avisoPP(t, erro) { var a = $("qdPpAviso"); a.hidden = !t; a.className = "rl-aviso " + (erro ? "erro" : "ok"); a.textContent = t || ""; }
  function desenharPP() {
    var d = destino(); if (d.tipos.indexOf(PP.tipo) < 0) PP.tipo = d.tipos[0];
    $("qdPpDest").innerHTML = DEST.map(function (x) { return '<button type="button" class="qd-chip' + (x.id === d.id ? " on" : "") + '" data-dest="' + x.id + '" aria-pressed="' + (x.id === d.id) + '">' + esc(x.nome) + '</button>'; }).join("");
    $("qdPpTipo").innerHTML = [["video", "🎬 VÍDEO"], ["img", "🖼 IMAGEM"]].map(function (t) { var tem = d.tipos.indexOf(t[0]) >= 0; return '<button type="button" class="qd-chip' + (PP.tipo === t[0] ? " on" : "") + '" data-tipo="' + t[0] + '"' + (tem ? "" : " disabled") + ' aria-pressed="' + (PP.tipo === t[0]) + '">' + t[1] + '</button>'; }).join("");
    var b = PP.cena && bloco(PP.cena), n = b ? historia().cenas.indexOf(b) + 1 : 0;
    $("qdPpPara").textContent = b ? "Para a CENA" + (n ? " " + n : "") + " do quadro." : "Prompt avulso (dá para virar uma cena nova).";
    $("qdPpUsar").textContent = b ? "✓ USAR NESTA CENA" : "＋ CRIAR CENA COM ELE";
    var tem = !!$("qdPpSaida").value.trim(); $("qdPpResultado").hidden = !tem;
    var ab = $("qdPpAbrir"); ab.hidden = !d.url; if (d.url) { ab.href = d.url; ab.textContent = "ABRIR " + d.nome.toUpperCase() + " ↗"; }
    try { localStorage.setItem("ui_reels_prompt", JSON.stringify({dest: PP.dest, tipo: PP.tipo})); } catch (e) {}
  }
  function abrirPrompt(idCena) {
    var b = idCena && bloco(idCena); PP.cena = b && b.tipo === "cena" ? b.id : null;
    $("qdPpFala").value = b ? (b.texto || "").trim() : ""; $("qdPpSaida").value = b && b.meuPrompt ? b.meuPrompt : "";
    avisoPP(""); $("qdPrompt").hidden = false; desenharPP();
  }
  function fecharPrompt() { if (!$("qdPrompt")) return; pararEscuta(); $("qdPrompt").hidden = true; }
  function contextoPP() {
    var h = historia(), b = PP.cena && bloco(PP.cena), l = [];
    if (h.pers && (h.pers.nome || h.pers.texto)) l.push("Personagem: " + (h.pers.nome || "personagem") + (h.pers.texto ? " — " + h.pers.texto.trim() : ""));
    var rs = (b ? h.refs(b) : []).map(function (r) { return r.texto.trim(); }).filter(Boolean);
    if (rs.length) l.push("Referências (lugar, objeto, estilo): " + rs.join("; "));
    if (b && (b.fala || "").trim()) l.push('Fala do personagem (manter em português): "' + b.fala.trim() + '"');
    return l.join("\n");
  }
  function limparIA(t) { return String(t || "").replace(/```[a-z]*|```/g, "").replace(/\*\*|^#+\s*/gm, "").replace(/^\s*(prompt)\s*:\s*/i, "").trim().replace(/^"([\s\S]*)"$/, "$1").trim(); }
  function promptLocal(pedido, ctx, d) {   /* sem a IA: organiza o que a pessoa disse — não traduz nem inventa */
    return pedido.replace(/\s+/g, " ").trim().replace(/[.;,]*$/, "") + ". " + (ctx ? ctx.replace(/\n/g, ". ") + ". " : "") + (PP.tipo === "video" ? "Vídeo vertical 9:16, 5 segundos, movimento de câmera suave, luz de cinema, sem texto na tela." : "Imagem vertical 9:16, luz de cinema, sem texto na imagem.") + (d.id === "midjourney" ? " --ar 9:16" : "");
  }
  async function gerarPrompt() {
    var pedido = $("qdPpFala").value.trim(); if (!pedido) { avisoPP("Fale ou escreva o que você quer ver.", true); return; }
    pararEscuta();
    var d = destino(), ctx = $("qdPpCtx").checked ? contextoPP() : "", bt = $("qdPpGerar"), saida = "", motivo = "";
    bt.disabled = true; bt.textContent = "Escrevendo…"; avisoPP("");
    var s = await sessao();
    if (!s) motivo = "entre na sua conta para a IA escrever em inglês, no formato da " + d.nome;
    else try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB},
        body: JSON.stringify({sistema: "Você é especialista em prompts para IAs de imagem e vídeo. A pessoa descreve em português, do jeito dela (pode ser texto falado, sem pontuação), o que quer ver. Escreva UM prompt pronto para colar em " + d.nome + " (" + (PP.tipo === "video" ? "vídeo" : "imagem") + "), em INGLÊS, neste formato: " + d[PP.tipo] + " Regras: formato vertical 9:16 para Reels; mantenha tudo o que a pessoa pediu; não invente fatos, números, marcas nem pessoas reais; sem texto escrito na tela, a não ser que a pessoa peça; se houver fala do personagem, mantenha a fala em português, entre aspas, sem traduzir; use o personagem e as referências só para manter a consistência. Responda SÓ com o prompt: sem explicação, sem título, sem aspas em volta e sem marcação.",
          pedido: "Pedido da pessoa: " + pedido.slice(0, 1200) + (ctx ? "\n" + ctx : ""), max: 500})});
      var j = await r.json().catch(function () { return {}; });
      if (r.ok) saida = limparIA(j.texto);
      if (!saida) motivo = r.status === 401 ? "entre de novo na sua conta" : r.status === 429 ? "o limite de hoje da IA acabou" : r.status >= 500 ? "a IA Brightway está fora do ar agora" : "a IA não respondeu";
    } catch (e) { motivo = "sem internet"; }
    bt.disabled = false; bt.textContent = "✨ GERAR PROMPT";
    if (saida) avisoPP("Prompt pronto para " + d.nome + ". Pode ajustar o texto antes de copiar.");
    else { saida = promptLocal(pedido, ctx, d); avisoPP("Organizei o seu texto, mas SEM a IA (" + motivo + "). Ficou em português.", true); }
    $("qdPpSaida").value = saida.slice(0, 1500); desenharPP();
  }
  async function copiarPrompt() {
    var t = $("qdPpSaida").value.trim(); if (!t) return;
    try { await navigator.clipboard.writeText(t); } catch (e) { var c = $("qdPpSaida"); c.focus(); c.select(); try { document.execCommand("copy"); } catch (e2) {} }
    avisoPP("Copiado. Agora é só colar em " + destino().nome + ".");
  }
  function usarPrompt() {
    var t = $("qdPpSaida").value.trim(); if (!t) return;
    var b = PP.cena && bloco(PP.cena), nova = !b; if (!b) b = addBloco("cena");
    b.meuPrompt = t.slice(0, 1500); b.meuPromptPara = destino().nome; b.meuTipo = PP.tipo;
    if (!(b.texto || "").trim()) b.texto = $("qdPpFala").value.trim().slice(0, 300);
    guardar(); fecharPrompt(); desenhar(); aviso(nova ? "Cena criada com o prompt pronto." : "Prompt pronto guardado na cena: é ele que o app usa nela.");
  }
  /* escutar: reconhecimento do navegador (pt-BR, continua até tocar de novo); sem ele (ou no app instalado do iPhone) grava e transcreve na IA Brightway */
  function micEstado(on, texto) { var m = $("qdPpMic"); m.classList.toggle("on", !!on); m.setAttribute("aria-pressed", !!on); m.textContent = texto || (on ? "■ PARAR DE OUVIR" : "🎙 FALAR"); }
  function pararEscuta() {
    try { if (PP.rec) PP.rec.stop(); } catch (e) {}
    try { if (PP.grav && PP.grav.state === "recording") PP.grav.stop(); } catch (e) {}
  }
  function escutar() {
    if (PP.rec || PP.grav) { pararEscuta(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, campo = $("qdPpFala"), base = campo.value.trim();
    avisoPP("");
    if (!SR || navigator.standalone) { gravarFala(base); return; }
    var r = new SR(), final = ""; r.lang = "pt-BR"; r.interimResults = true; r.continuous = true;
    r.onresult = function (ev) { var p = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { var t = ev.results[i][0].transcript; if (ev.results[i].isFinal) final += t + " "; else p += t; } campo.value = ((base ? base + " " : "") + final + p).replace(/\s+/g, " ").trim(); };
    r.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") avisoPP("O microfone está bloqueado neste navegador. Libere o microfone (cadeado ao lado do endereço) ou escreva o pedido.", true);
      else if (ev.error !== "no-speech" && ev.error !== "aborted") avisoPP("Não consegui ouvir (" + ev.error + "). Tente de novo ou escreva o pedido.", true);
    };
    r.onend = function () { PP.rec = null; micEstado(false); };
    try { r.start(); PP.rec = r; micEstado(true); } catch (e) { PP.rec = null; avisoPP("Não consegui ligar o microfone. Escreva o pedido.", true); }
  }
  function wav16(am) {
    var n = am.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0, o = 44; i < n; i++, o += 2) { var x = Math.max(-1, Math.min(1, am[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], {type: "audio/wav"});
  }
  async function gravarFala(base) {
    var s = await sessao();
    if (!s) { avisoPP("Este navegador não ouve sozinho. Entre na sua conta para eu transcrever a sua fala — ou escreva o pedido.", true); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { avisoPP("Este aparelho não deixa gravar por aqui. Escreva o pedido.", true); return; }
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({audio: true}); } catch (e) { avisoPP("O microfone está bloqueado. Libere o microfone ou escreva o pedido.", true); return; }
    var partes = [], mr = new MediaRecorder(stream); PP.grav = mr;
    mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    var fim = new Promise(function (ok) { mr.onstop = ok; });
    mr.start(); micEstado(true, "■ PARAR (gravando até 40 s)");
    var limite = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 40000);
    await fim; clearTimeout(limite); stream.getTracks().forEach(function (t) { t.stop(); }); PP.grav = null;
    if ($("qdPrompt").hidden) { micEstado(false); return; }
    micEstado(false, "transcrevendo…"); $("qdPpMic").disabled = true;
    try {
      var blob = new Blob(partes, {type: partes[0] && partes[0].type || "audio/webm"}), Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      var buf = await blob.arrayBuffer(), a = await new Promise(function (ok, erro) { var pr = ctx.decodeAudioData(buf, ok, erro); if (pr && pr.then) pr.then(ok, erro); }); try { ctx.close(); } catch (e) {}
      var off = new OfflineAudioContext(1, Math.ceil(a.duration * 16000), 16000), src = off.createBufferSource(); src.buffer = a; src.connect(off.destination); src.start(); var r16 = await off.startRendering();
      var r = await fetch(FN_IA + "?lang=pt", {method: "POST", headers: {"Content-Type": "audio/wav", "Authorization": "Bearer " + s.access_token, "apikey": CHAVE_PUB}, body: wav16(r16.getChannelData(0))});
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(r.status === 429 ? "o limite de hoje da IA acabou" : r.status >= 500 ? "a IA Brightway está fora do ar agora" : "a transcrição falhou");
      var t = String(j.texto || (j.segmentos || []).map(function (x) { return x.texto || x.text; }).join(" ") || "").trim();
      if (t) $("qdPpFala").value = ((base ? base + " " : "") + t).trim(); else avisoPP("Não ouvi nada na gravação. Tente de novo, mais perto do microfone.", true);
    } catch (e) { avisoPP("Não consegui transcrever: " + (e && e.message || "erro") + ". Escreva o pedido.", true); }
    $("qdPpMic").disabled = false; micEstado(false);
  }
  /* ---------- 👤 MEUS PERSONAGENS: a mesma biblioteca da ÁREA DE PERSONAGENS e do BW Reels ---------- */
  async function escolherPers() {
    var lista = window.BWPersonagens ? (await BWPersonagens.listar()).filter(function (r) { return r.tipo !== "montado"; }) : [];
    $("qdLibLista").innerHTML = lista.length ? lista.map(function (r) { var u = r.blob ? URL.createObjectURL(r.blob) : "";
      return '<button type="button" class="qd-lib-item" data-usar="' + esc(r.id) + '">' + (u ? '<img alt="" src="' + u + '">' : '<i aria-hidden="true">' + esc(String(r.nome || "?").charAt(0).toUpperCase()) + '</i>') + '<span><b>' + esc(r.nome || "Sem nome") + '</b><small>' + esc(BWPersonagens.descricao(r) || (r.blob ? "com imagem" : "só a ficha")) + (r.planos && Object.keys(r.planos).length > 1 ? " · " + Object.keys(r.planos).length + " planos" : "") + '</small></span></button>' +
        (r.variacoes || []).map(function (v) { return '<button type="button" class="qd-lib-item var" data-usar="' + esc(r.id) + '" data-var="' + esc(v.id) + '"><i aria-hidden="true">👕</i><span><b>' + esc(r.nome || "") + ' · ' + esc(v.nome) + '</b><small>' + esc(v.descricao) + '</small></span></button>'; }).join(""); }).join("")
      : '<p class="qd-nota" style="max-width:none">Você ainda não tem personagens guardados. Crie um na ÁREA DE PERSONAGENS (o agente ajuda com a ficha e o prompt).</p>';
    $("qdLib").hidden = false;
  }
  async function usarPers(id, vid) {
    var r = window.BWPersonagens && await BWPersonagens.obter(id), h = historia(), b = h.pers; if (!r || !b) return false;
    var v = BWPersonagens.variacao(r, vid), foto = (v && v.blob) || r.blob;
    b.nome = String(r.nome || "").slice(0, 40); b.texto = BWPersonagens.descricao(r, vid).slice(0, 200) || b.texto || ""; b.persId = r.id; b.persVar = v ? v.id : "";
    if (foto) await porImagem(b.id, foto); else await tirarImagem(b.id);
    Object.keys(IMG).forEach(function (k) { if (/-ia$/.test(k)) tirarImagem(k.slice(0, -3), "-ia"); });   /* personagem novo: as imagens das cenas eram do antigo */
    guardar(); $("qdLib").hidden = true; desenhar(); aviso(r.nome + (v ? " (" + v.nome + ")" : "") + " agora é o personagem desta história." + (foto ? "" : " Ele ainda não tem imagem: as cenas usam a descrição."));
    return true;
  }
  function iniciarPrompt() {
    $("qdLibFechar").onclick = function () { $("qdLib").hidden = true; };
    $("qdLibLista").addEventListener("click", function (e) { var b = e.target.closest("[data-usar]"); if (b) usarPers(b.dataset.usar, b.dataset.var || ""); });
    try { var pr = new URLSearchParams(location.search);   /* vindo da ÁREA DE PERSONAGENS: reels.html?quadro=1&pers=ID */
      if (pr.get("quadro")) setTimeout(async function () { var fm = $("folhaModelos"); if (fm) fm.hidden = true; await abrir(); if (pr.get("pers")) await usarPers(pr.get("pers")); try { history.replaceState(null, "", location.pathname); } catch (e) {} }, 900);
      else if (pr.get("personagens")) setTimeout(function () { var fm = $("folhaModelos"); if (fm) fm.hidden = true; if (window.BWReels && BWReels.abrirPers) BWReels.abrirPers(); try { history.replaceState(null, "", location.pathname); } catch (e) {} }, 900);
    } catch (e) {}
    try { var j = JSON.parse(localStorage.getItem("ui_reels_prompt") || "{}"); if (DEST.some(function (d) { return d.id === j.dest; })) { PP.dest = j.dest; PP.tipo = j.tipo === "img" ? "img" : "video"; } } catch (e) {}
    $("qdBtPrompt").onclick = function () { abrirPrompt(null); };
    $("qdOrganizar").onclick = organizar;
    $("qdPpFechar").onclick = fecharPrompt;
    $("qdPpMic").onclick = escutar; $("qdPpGerar").onclick = gerarPrompt; $("qdPpCopiar").onclick = copiarPrompt; $("qdPpUsar").onclick = usarPrompt;
    $("qdPrompt").addEventListener("click", function (e) {
      var x = e.target.closest("[data-dest]"); if (x) { PP.dest = x.dataset.dest; desenharPP(); return; }
      x = e.target.closest("[data-tipo]"); if (x && !x.disabled) { PP.tipo = x.dataset.tipo; desenharPP(); }
    });
  }

  window.BWQuadro = {abrir: abrir, fechar: fechar, estado: function () { return Q; }, historia: function () { var h = historia(); return {cenas: h.cenas.map(function (c) { return c.id; }), soltas: h.soltas.length}; }, ligar: function (a, b) { var m = ligar(a, b); guardar(); desenhar(); return m; }, add: addBloco, planoVideo: planoVideo, tipoCena: tipoCena, pedidoImagem: pedidoImagem, criarImagens: criarImagens, montar: montar, usarPers: usarPers, escolherPers: escolherPers};
})();
