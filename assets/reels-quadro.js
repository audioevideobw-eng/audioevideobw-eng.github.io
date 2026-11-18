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
    var prox = function (id) { return Q.setas.filter(function (s) { return s.de === id && (bloco(s.para) || {}).tipo === "cena"; }).map(function (s) { return bloco(s.para); }).sort(function (a, b) { return a.x - b.x; })[0]; };
    var temEntrada = function (c) { return Q.setas.some(function (s) { return s.para === c.id && (bloco(s.de) || {}).tipo === "cena"; }); };
    var ini = (pers && prox(pers.id)) || cenas.filter(function (c) { return !temEntrada(c); }).sort(function (a, b) { return a.x - b.x; })[0];
    var ordem = [], visto = {};
    while (ini && !visto[ini.id]) { visto[ini.id] = 1; ordem.push(ini); ini = prox(ini.id); }
    var soltas = cenas.filter(function (c) { return !visto[c.id]; });
    var refs = function (c) { return Q.setas.filter(function (s) { return (s.para === c.id || (pers && s.para === pers.id)) && (bloco(s.de) || {}).tipo === "ref"; }).map(function (s) { return bloco(s.de); }); };
    return {pers: pers, fim: fim, cenas: ordem, soltas: soltas, refs: refs};
  }

  /* ---------- desenho ---------- */
  var ROT = {pers: "① PERSONAGEM", cena: "CENA", ref: "REFERÊNCIA", fim: "FINAL"};
  function htmlBloco(b, n) {
    var img = IMG[b.id], ia = IMG[b.id + "-ia"], corpo = "";
    var foto = function (rot) { return '<div class="qd-foto">' + (img ? '<img src="' + img.url + '" alt=""><button type="button" class="qd-x" data-tirar="' + b.id + '" aria-label="Tirar a imagem">✕</button>' : '<button type="button" class="qd-add" data-foto="' + b.id + '">＋ ' + rot + '</button>') + '</div>'; };
    if (b.tipo === "pers") corpo = foto("FOTO DO PERSONAGEM") + '<input class="qd-in" data-campo="nome" maxlength="40" placeholder="Nome (ex.: Bia)" value="' + esc(b.nome) + '"><textarea class="qd-in" data-campo="texto" rows="2" maxlength="200" placeholder="Como ele é: roupa, cabelo, jeito…">' + esc(b.texto) + '</textarea>';
    else if (b.tipo === "cena") corpo = (ia ? '<div class="qd-foto ia"><img src="' + ia.url + '" alt="Imagem criada para a cena"><button type="button" class="qd-x" data-tirar-ia="' + b.id + '" aria-label="Apagar a imagem criada">✕</button></div>' : "") +
      '<textarea class="qd-in" data-campo="texto" rows="3" maxlength="240" placeholder="O que acontece nesta cena?">' + esc(b.texto) + '</textarea><input class="qd-in" data-campo="fala" maxlength="90" placeholder="Fala ou texto na tela (opcional)" value="' + esc(b.fala) + '">';
    else if (b.tipo === "ref") corpo = foto("IMAGEM (opcional)") + '<textarea class="qd-in" data-campo="texto" rows="2" maxlength="200" placeholder="O que é: lugar, objeto, estilo, cores…">' + esc(b.texto) + '</textarea>';
    else corpo = '<input class="qd-in" data-campo="texto" maxlength="60" placeholder="Chamada final (ex.: Peça seu orçamento)" value="' + esc(b.texto) + '">';
    return '<div class="qd-bloco t-' + b.tipo + (LIGAR === b.id ? " ligando" : "") + '" data-id="' + b.id + '" style="left:' + b.x + 'px;top:' + b.y + 'px"><div class="qd-cab" data-pega="' + b.id + '"><b>' + ROT[b.tipo] + (b.tipo === "cena" && n ? " " + n : "") + '</b><span>' +
      (b.tipo !== "fim" ? '<button type="button" class="qd-porta" data-ligar="' + b.id + '" aria-label="Ligar este bloco a outro" title="Ligar a outro bloco">➜</button>' : "") +
      (b.tipo === "cena" || b.tipo === "ref" ? '<button type="button" class="qd-porta" data-apagar="' + b.id + '" aria-label="Excluir bloco">🗑</button>' : "") + '</span></div>' + corpo + '</div>';
  }
  function desenhar() {
    var h = historia(), num = {}; h.cenas.forEach(function (c, i) { num[c.id] = i + 1; });
    $("qdBlocos").innerHTML = Q.blocos.map(function (b) { return htmlBloco(b, num[b.id]); }).join("");
    desenharSetas();
    var falta = h.soltas.length ? h.soltas.length + " cena(s) solta(s): ligue com ➜ para entrar na história. " : "";
    $("qdDica").textContent = LIGAR ? "Agora toque no bloco que vem DEPOIS (ou em ➜ de novo para cancelar)." : falta + (h.cenas.length ? h.cenas.length + " cena(s) na história." : "Ligue o PERSONAGEM à primeira cena.");
    $("qdBaixar").hidden = !h.cenas.some(function (c) { return IMG[c.id + "-ia"]; });
    $("qdAutor").checked = !!Q.autor;
  }
  function desenharSetas() {
    var s = "", hB = function (b) { var el = document.querySelector('.qd-bloco[data-id="' + b.id + '"]'); return el ? el.offsetHeight : 120; };
    Q.setas.forEach(function (st, i) {
      var a = bloco(st.de), b = bloco(st.para); if (!a || !b) return;
      var x1 = a.x + W_BLOCO, y1 = a.y + Math.min(hB(a) / 2, 60), x2 = b.x, y2 = b.y + Math.min(hB(b) / 2, 60);
      if (b.x < a.x + W_BLOCO / 2 && Math.abs(b.y - a.y) > 40) { x1 = a.x + W_BLOCO / 2; y1 = b.y < a.y ? a.y : a.y + hB(a); x2 = b.x + W_BLOCO / 2; y2 = b.y < a.y ? b.y + hB(b) : b.y; }
      var dx = Math.max(40, Math.abs(x2 - x1) / 2), d = "M" + x1 + " " + y1 + " C" + (x1 + dx) + " " + y1 + "," + (x2 - dx) + " " + y2 + "," + x2 + " " + y2;
      var ref = a.tipo === "ref";
      s += '<path d="' + d + '" class="qd-linha' + (ref ? " ref" : "") + '" marker-end="url(#qdPonta' + (ref ? "R" : "") + ')"/><path d="' + d + '" class="qd-toque" data-seta="' + i + '"><title>Tocar para apagar a ligação</title></path>';
    });
    $("qdLinhas").innerHTML = s;
  }
  function aplicarVista() { $("qdMundo").style.transform = "translate(" + VISTA.x + "px," + VISTA.y + "px) scale(" + VISTA.z + ")"; }
  function centralizar(tudo) {
    var a = $("qdArea"), xs = Q.blocos.map(function (b) { return b.x; }), ys = Q.blocos.map(function (b) { return b.y; });
    var alt = function (b) { var el = document.querySelector('.qd-bloco[data-id="' + b.id + '"]'); return el ? el.offsetHeight : 200; };
    var x0 = Math.min.apply(0, xs), x1 = Math.max.apply(0, xs) + W_BLOCO, y0 = Math.min.apply(0, ys), y1 = Math.max.apply(0, Q.blocos.map(function (b) { return b.y + alt(b); }));
    VISTA.z = Math.max(0.2, Math.min(1, (a.clientWidth - 24) / (x1 - x0), (a.clientHeight - 70) / (y1 - y0)));
    if (!tudo && VISTA.z < 0.55) VISTA.z = 0.55;      /* ao abrir no celular: letras legíveis, começando pelo personagem; ⤢ mostra tudo */
    VISTA.x = 12 - x0 * VISTA.z; VISTA.y = 12 - y0 * VISTA.z; aplicarVista();
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
  function ligar(de, para) {
    var a = bloco(de), b = bloco(para); if (!a || !b || de === para) return "";
    if (b.tipo === "ref" || a.tipo === "fim") return "A seta sai do bloco e aponta para o que vem depois.";
    if (a.tipo === "ref" && b.tipo === "fim") return "A referência se liga a uma cena ou ao personagem.";
    if (Q.setas.some(function (s) { return s.de === de && s.para === para; })) return "";
    if (a.tipo !== "ref") Q.setas = Q.setas.filter(function (s) { return !(s.de === de && (bloco(s.de) || {}).tipo !== "ref") && !(s.para === para && (bloco(s.de) || {}).tipo !== "ref" && b.tipo !== "pers"); });   /* história em linha: uma saída e uma entrada */
    Q.setas.push({de: de, para: para}); return "";
  }

  /* ---------- textos: uma chamada da IA (prompts em inglês + falas + legenda) ---------- */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function extrairJSON(t) { t = String(t || "").replace(/```json|```/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function plano(h) {
    return h.cenas.map(function (c) { var rs = h.refs(c); return {id: c.id, contexto: c.texto.trim(), fala: (c.fala || "").trim(), refs: rs.map(function (r) { return r.texto.trim(); }).filter(Boolean), refImg: rs.filter(function (r) { return IMG[r.id]; })[0] || null}; });
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
  function ocupado(t) { OCUPADO = !!t; $("qdOcup").hidden = !t; if (t) $("qdOcupTxt").textContent = t; }
  function aviso(t, erro) { $("qdAviso").hidden = !t; $("qdAviso").className = "rl-aviso " + (erro ? "erro" : "ok"); $("qdAviso").textContent = t || ""; }

  /* monta textos (IA ou aparelho) e devolve a lista pronta de cenas */
  async function preparar() {
    var h = historia();
    if (!h.cenas.length) { aviso("Ligue o PERSONAGEM à primeira cena com o botão ➜.", true); return null; }
    var vazia = h.cenas.filter(function (c) { return !c.texto.trim(); })[0];
    if (vazia) { aviso("Escreva o que acontece em cada cena (há uma cena em branco).", true); return null; }
    var cenas = plano(h);
    ocupado("Organizando a história…");
    var ia = await textosIA(h, cenas);
    cenas.forEach(function (c, i) { c.prompt = ia ? String(ia.cenas[i].prompt || c.contexto).slice(0, 300) : c.contexto; c.falaFinal = c.fala || (ia ? String(ia.cenas[i].fala || "").slice(0, 110) : c.contexto.split(/\s+/).slice(0, 12).join(" ")); });
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
    if (!(await sessao())) { aviso("Entre na sua conta Brightway para a IA criar as imagens (15 por dia). Sem login dá para MONTAR O VÍDEO com o personagem animado.", true); return; }
    var p = await preparar(); if (!p) return;
    var fig = await figura(p.h), usaFoto = !!fig || p.cenas.some(function (c) { return c.refImg; });
    if (usaFoto && !$("qdAutor").checked) { aviso("Marque que as imagens são suas ou que você tem autorização de quem aparece nelas.", true); return; }
    var faltam = p.cenas.filter(function (c) { return !IMG[c.id + "-ia"]; });
    if (!faltam.length) { aviso("Todas as cenas já têm imagem. Apague a de uma cena (✕) para criar outra."); return; }
    if (!confirm("A IA vai criar " + faltam.length + " imagem(ns) (das 15 por dia da sua conta)." + (usaFoto ? " Vamos enviar uma cópia pequena das fotos do quadro (personagem e referência); nada fica guardado." : "") + " Continuar?")) return;
    var A = window.BWReelsAvatar, peq = fig ? await A.jpgPequeno(fig, 504) : null, feitas = 0, falhou = "";
    for (var i = 0; i < p.cenas.length; i++) {
      var c = p.cenas[i]; if (IMG[c.id + "-ia"]) continue;
      ocupado("A IA está desenhando a cena " + (i + 1) + " de " + p.cenas.length + "…");
      var base = peq, usaRef = false, ref2 = null;
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
    var q = {nome: (p.h.pers && p.h.pers.nome ? "História de " + p.h.pers.nome : "História do quadro"), personagem: p.h.pers && p.h.pers.nome || "personagem", figura: png, gancho: p.gancho, legenda: p.legenda,
      cta: p.h.fim ? p.h.fim.texto.trim() : "", modo: modo,
      cenas: p.cenas.map(function (c) { var m = IMG[c.id + "-ia"]; return {fala: c.falaFinal, contexto: c.contexto, imagem: modo === "video" ? null : (m ? m.blob : null), promptVideo: promptVideo(p.h, c, c.prompt, c.falaFinal)}; })};
    try { await BWReels.montarDoQuadro(q); } catch (e) { ocupado(); aviso("Não deu para montar: " + (e && e.message || e), true); return; }
    ocupado(); fechar();
    var semImg = modo !== "video" && q.cenas.filter(function (c) { return !c.imagem; }).length;
    setTimeout(function () { alert("Reel montado com " + q.cenas.length + " cena(s)!" + (p.comIA ? " Textos organizados pela IA Brightway." : " Textos montados no aparelho.") + (modo === "video" ? " Os prompts de vídeo de cada cena estão na aba MÍDIA: gere os clipes no Kling, Veo ou Higgsfield e importe." : semImg ? " " + semImg + " cena(s) sem imagem ficaram com o personagem animado ou só com o texto." : "")); }, 250);
  }

  /* ---------- abrir / fechar ---------- */
  async function abrir() {
    if (!db()) return;
    Q = ler() || novo(); $("folhaQuadro").hidden = false; document.documentElement.classList.add("qd-aberto");
    await carregarImagens(); LIGAR = null; aviso(""); desenhar(); centralizar(false);
  }
  function fechar() { $("folhaQuadro").hidden = true; document.documentElement.classList.remove("qd-aberto"); $("qdMenuMontar").hidden = true; }

  function iniciar() {
    if (!$("folhaQuadro")) return;
    $("btQuadro").onclick = abrir; $("qdFechar").onclick = fechar;
    $("qdMaisCena").onclick = function () { addBloco("cena"); };
    $("qdMaisRef").onclick = function () { addBloco("ref"); aviso("Referência criada. Toque em ➜ nela e depois na cena (ou no personagem, para valer em todas)."); };
    $("qdCentro").onclick = function () { centralizar(true); };
    $("qdZoomMais").onclick = function () { VISTA.z = Math.min(1.4, VISTA.z * 1.2); aplicarVista(); };
    $("qdZoomMenos").onclick = function () { VISTA.z = Math.max(0.3, VISTA.z / 1.2); aplicarVista(); };
    $("qdImagens").onclick = criarImagens; $("qdBaixar").onclick = baixar;
    $("qdMontar").onclick = function () { $("qdMenuMontar").hidden = !$("qdMenuMontar").hidden; };
    $("qdMontarMotor").onclick = function () { $("qdMenuMontar").hidden = true; montar("motor"); };
    $("qdMontarVideo").onclick = function () { $("qdMenuMontar").hidden = true; montar("video"); };
    $("qdAutor").onchange = function () { Q.autor = this.checked; guardar(); };
    $("qdExemplo").onclick = async function () { if (!confirm("Trocar o quadro atual pelo exemplo? O que está no quadro será apagado.")) return; await limparImagens(); Q = exemplo(); guardar(); desenhar(); centralizar(); };
    $("qdLimpar").onclick = async function () { if (!confirm("Apagar tudo do quadro (blocos e imagens criadas)? Não dá para desfazer.")) return; await limparImagens(); Q = novo(); guardar(); desenhar(); centralizar(); };
    async function limparImagens() { for (var k in IMG) { URL.revokeObjectURL(IMG[k].url); try { await db().del("midias", "quadro-" + k); } catch (e) { } } IMG = {}; }

    var area = $("qdArea"), arr = null;
    $("qdBlocos").addEventListener("input", function (e) { var el = e.target.closest("[data-campo]"); if (!el) return; var b = bloco(el.closest(".qd-bloco").dataset.id); if (b) { b[el.dataset.campo] = el.value; guardar(); } });
    $("qdBlocos").addEventListener("click", async function (e) {
      var t = e.target, x;
      if ((x = t.closest("[data-ligar]"))) { LIGAR = LIGAR === x.dataset.ligar ? null : x.dataset.ligar; desenhar(); return; }
      if ((x = t.closest("[data-apagar]"))) { if (!confirm("Excluir este bloco?")) return; var id = x.dataset.apagar, ent = Q.setas.filter(function (s) { return s.para === id && (bloco(s.de) || {}).tipo !== "ref"; })[0], sai = Q.setas.filter(function (s) { return s.de === id; })[0];
        Q.blocos = Q.blocos.filter(function (b) { return b.id !== id; }); Q.setas = Q.setas.filter(function (s) { return s.de !== id && s.para !== id; });
        if (ent && sai && bloco(ent.de) && bloco(sai.para)) Q.setas.push({de: ent.de, para: sai.para});     /* a história continua ligada */
        await tirarImagem(id); await tirarImagem(id, "-ia"); guardar(); desenhar(); return; }
      if ((x = t.closest("[data-foto]"))) { $("qdArquivo").dataset.para = x.dataset.foto; $("qdArquivo").click(); return; }
      if ((x = t.closest("[data-tirar]"))) { await tirarImagem(x.dataset.tirar); desenhar(); return; }
      if ((x = t.closest("[data-tirar-ia]"))) { await tirarImagem(x.dataset.tirarIa, "-ia"); desenhar(); return; }
      var bl = t.closest(".qd-bloco");
      if (LIGAR && bl && bl.dataset.id !== LIGAR && !t.closest("input,textarea")) { var m = ligar(LIGAR, bl.dataset.id); LIGAR = null; guardar(); desenhar(); if (m) aviso(m, true); else aviso(""); }
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
      if (e.target.closest("button,input,textarea,.qd-toque")) return;
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
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("folhaQuadro").hidden && !OCUPADO) fechar(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.BWQuadro = {abrir: abrir, fechar: fechar, estado: function () { return Q; }, historia: function () { var h = historia(); return {cenas: h.cenas.map(function (c) { return c.id; }), soltas: h.soltas.length}; }, ligar: function (a, b) { var m = ligar(a, b); guardar(); desenhar(); return m; }, add: addBloco, pedidoImagem: pedidoImagem, criarImagens: criarImagens, montar: montar};
})();
