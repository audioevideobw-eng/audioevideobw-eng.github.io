/* BW REELS PRO — 🎬 MODO DIRETOR do Quadro de História (25/11/2026)
   Ideia do dono depois de analisar o "vibe directing" do OpenArt Director (nada copiado da interface deles):
   a pessoa conta a ideia (escrevendo ou falando), escolhe um INÍCIO RÁPIDO (anúncio de produto, depoimento, clipe, trailer…),
   e o assistente escreve o ROTEIRO em cenas. Ela aprova/edita em cada etapa (roteiro → quadro → imagens → vídeo) e depois
   pede mudanças por frase — o diretor refaz SÓ as cenas afetadas (só elas perdem a imagem e voltam a ser criadas).
   - Só TEXTO vai para a IA (pela API do quadro → Edge Function bw-ia). Nada é guardado na conta: o rascunho fica no
     aparelho (ui_reels_diretor), o quadro continua em ui_reels_quadro.
   - ▦ STORYBOARD 3×3: junta as imagens das cenas numa grade numerada (técnica de referência para IAs de vídeo) + o texto pronto. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var Q = function () { return window.BWQuadroDir; };

  var INICIOS = {
    produto: {ico: "🛍", nome: "Anúncio de produto", n: 5, fim: "Garanta o seu", beats: ["o problema do dia a dia que o produto resolve, plano médio", "o produto aparece em destaque, close bonito com luz de estúdio", "o produto sendo usado, detalhe das mãos", "o resultado: a pessoa satisfeita, sorrindo", "o produto em destaque, pronto para comprar"]},
    ugc: {ico: "🤳", nome: "Depoimento (UGC)", n: 4, fim: "Experimente também", beats: ["a pessoa fala direto para a câmera do celular, em casa", "mostra o produto ou o serviço de perto", "conta como era antes e como ficou depois", "recomenda olhando para a câmera, sorrindo"]},
    evento: {ico: "🎉", nome: "Aftermovie de evento", n: 6, fim: "Nos vemos no próximo", beats: ["chegada ao local: montagem, luzes acendendo, plano aberto", "o público entrando, energia, câmera na mão", "o momento principal no palco, contraluz", "detalhes: comida, decoração, sorrisos em close", "o ponto alto com todo mundo junto", "fim da noite, despedida, luzes apagando"]},
    marca: {ico: "🏷", nome: "Filme da marca", n: 5, fim: "Conheça a nossa história", beats: ["o lugar onde a marca trabalha, plano aberto", "as pessoas por trás do trabalho, sorrindo", "o trabalho sendo feito com cuidado, detalhes", "o cliente satisfeito", "a marca e a frase final"]},
    clipe: {ico: "🎵", nome: "Clipe de música", n: 6, fim: "Ouça agora", beats: ["abertura com o artista de costas, luz forte", "close no rosto cantando", "plano aberto do lugar com a banda ou o público", "detalhe das mãos no instrumento", "movimento rápido com luzes piscando", "plano final: o artista olha para a câmera"]},
    trailer: {ico: "🎬", nome: "Trailer", n: 6, fim: "Em breve", beats: ["paisagem calma: tudo parece normal", "o personagem principal aparece", "algo muda: o conflito começa", "cortes rápidos de ação", "o momento de maior tensão", "silêncio e o título"]},
    explicativo: {ico: "💡", nome: "Explicativo", n: 5, fim: "Salve para não esquecer", beats: ["a pergunta ou o problema", "o primeiro passo mostrado de perto", "o segundo passo", "o resultado pronto", "resumo em uma frase"]},
    drama: {ico: "🎭", nome: "Microdrama", n: 6, fim: "Continua…", beats: ["a personagem num momento comum do dia", "chega uma notícia inesperada", "ela reage: close no rosto", "uma decisão difícil", "a reviravolta", "final em aberto"]},
    livre: {ico: "✍️", nome: "Livre", n: 5, fim: "", beats: []}
  };
  var TONS = {divertido: "Divertido", emocionante: "Emocionante", profissional: "Profissional", cinema: "Cinematográfico"};
  var D = ler();
  function ler() { try { var d = JSON.parse(localStorage.getItem("ui_reels_diretor") || "null"); if (d && INICIOS[d.inicio]) return d; } catch (e) { } return {inicio: "evento", tom: "emocionante", n: 6, ideia: "", rot: null, etapa: 1}; }
  function guardar() { try { localStorage.setItem("ui_reels_diretor", JSON.stringify(D)); } catch (e) { } }
  function aviso(t, erro) { var a = $("qdDirAviso"); if (!a) return; a.hidden = !t; a.className = "rl-aviso " + (erro ? "erro" : "ok"); a.textContent = t || ""; }
  function motivo(r) { return r.erro === "login" ? "Entre na sua conta para o diretor escrever com a IA." : r.erro === "limite" ? "A IA chegou ao limite de hoje." : r.erro === "rede" ? "Sem internet agora." : "A IA não respondeu agora" + (r.detalhe ? " (" + r.detalhe + ")" : "") + "."; }
  var limpa = function (t, max) { return String(t || "").replace(/\*\*|^#+\s*/gm, "").replace(/\s+/g, " ").trim().slice(0, max || 240); };

  /* ---------- 1 · ROTEIRO ---------- */
  var SIS_ROT = 'Você é diretor de vídeos curtos (Reels/TikTok, vertical 9:16). A pessoa conta a ideia e você entrega o ROTEIRO em cenas. Responda SÓ com JSON: {"titulo":"até 6 palavras","personagem":{"nome":"","descricao":"aparência e roupa, pessoa inventada"} ou null,"lugares":["descrição curta de um lugar, objeto ou estilo visual"],"cenas":[{"texto":"o que acontece + enquadramento (plano aberto, close, detalhe), até 28 palavras","fala":"texto na tela ou fala, até 12 palavras, pode ser vazio","lugar":0}],"final":"chamada final até 6 palavras"}. Use EXATAMENTE o número de cenas pedido. Siga o tipo de vídeo e o tom. Use os nomes, produtos e dados que a pessoa disse; NÃO invente marcas, preços, números, prêmios nem pessoas reais. "lugar" é o índice em "lugares" ou -1. Português do Brasil.';
  function roteiroLocal() {
    var ini = INICIOS[D.inicio], ideia = limpa(D.ideia, 400), beats = ini.beats.slice(0, D.n);
    if (!beats.length) beats = ideia.split(/[.!?]+\s+|\n+/).filter(Boolean).slice(0, D.n);
    while (beats.length < Math.min(D.n, 3)) beats.push("cena " + (beats.length + 1));
    return {titulo: ideia ? ideia.split(" ").slice(0, 6).join(" ") : ini.nome, personagem: null, lugares: [], cenas: beats.map(function (b) { return {texto: b, fala: "", lugar: -1}; }), final: ini.fim, local: true};
  }
  function normalizar(j) {
    if (!j || !Array.isArray(j.cenas) || j.cenas.length < 2) return null;
    var lug = (Array.isArray(j.lugares) ? j.lugares : []).map(function (x) { return limpa(typeof x === "string" ? x : x && (x.descricao || x.texto), 200); }).filter(Boolean).slice(0, 3);
    var p = j.personagem && (j.personagem.nome || j.personagem.descricao) ? {nome: limpa(j.personagem.nome, 40), descricao: limpa(j.personagem.descricao, 200)} : null;
    return {titulo: limpa(j.titulo, 60), personagem: p, lugares: lug, final: limpa(j.final, 60),
      cenas: j.cenas.slice(0, 10).map(function (c) { var l = Number(c && c.lugar); return {texto: limpa(c && (c.texto || c.descricao), 240), fala: limpa(c && c.fala, 90), lugar: l >= 0 && l < lug.length ? l : -1}; }).filter(function (c) { return c.texto; })};
  }
  async function escrever() {
    var ini = INICIOS[D.inicio];
    if (!D.ideia.trim() && D.inicio === "livre") { aviso("Conte a ideia do vídeo (escrevendo ou falando).", true); return; }
    Q().ocupado("O diretor está escrevendo o roteiro…");
    var pedido = "Tipo de vídeo: " + ini.nome + (ini.beats.length ? " (estrutura sugerida: " + ini.beats.slice(0, D.n).join(" | ") + ")" : "") + ". Tom: " + TONS[D.tom] + ". Número de cenas: " + D.n + ".\nIdeia da pessoa: " + (D.ideia.trim() || "(não disse nada além do tipo de vídeo)");
    var r = await Q().ia(SIS_ROT, pedido, 1600), rot = r.json ? normalizar(r.json) : null;
    Q().ocupado("");
    if (!rot) { rot = roteiroLocal(); aviso(motivo(r.erro ? r : {erro: "ia"}) + " Montei um roteiro base pelo tipo de vídeo: ajuste os textos.", true); }
    else aviso("✓ Roteiro pronto. Edite o que quiser e toque em MONTAR O QUADRO.");
    D.rot = rot; D.etapa = 2; guardar(); desenhar();
  }

  /* ---------- 2 · QUADRO montado a partir do roteiro ---------- */
  async function montarQuadro() {
    var r = D.rot; if (!r || !r.cenas.length) return;
    var atual = Q().estado(), temAlgo = atual && atual.blocos.some(function (b) { return String(b.texto || b.fala || b.nome || "").trim(); });
    if (temAlgo && !confirm("Trocar o que está no quadro pelo roteiro do diretor? O quadro atual será apagado.")) return;
    var uid = Q().uid, blocos = [], setas = [], x = 40;
    var pers = r.personagem ? {id: uid(), tipo: "pers", x: x, y: 150, nome: r.personagem.nome || "", texto: r.personagem.descricao || ""} : {id: uid(), tipo: "pers", x: x, y: 150, nome: "", texto: ""};
    blocos.push(pers); x += 290;
    var refs = r.lugares.map(function (l, i) { var b = {id: uid(), tipo: "ref", x: 330 + i * 290, y: 600, texto: l}; blocos.push(b); return b; });
    var cenas = r.cenas.map(function (c, i) { var b = {id: uid(), tipo: "cena", x: x + i * 290, y: 20, texto: c.texto, fala: c.fala || ""}; blocos.push(b); return b; });
    var fim = {id: uid(), tipo: "fim", x: x + cenas.length * 290, y: 60, texto: r.final || ""}; blocos.push(fim);
    setas.push({de: pers.id, para: cenas[0].id});
    cenas.forEach(function (c, i) { setas.push({de: c.id, para: i < cenas.length - 1 ? cenas[i + 1].id : fim.id}); });
    refs.forEach(function (rf, i) {
      var usa = r.cenas.map(function (c, j) { return c.lugar === i ? j : -1; }).filter(function (j) { return j >= 0; });
      (usa.length ? usa : cenas.map(function (c, j) { return j; })).forEach(function (j) { setas.push({de: rf.id, para: cenas[j].id}); });
    });
    await Q().trocar({blocos: blocos, setas: setas, autor: !!(atual && atual.autor), titulo: r.titulo || ""});
    D.etapa = 3; guardar(); desenhar();
    aviso("✓ Quadro montado com " + cenas.length + " cenas. Agora crie as imagens ou peça mudanças.");
  }

  /* ---------- ✎ PEDIR MUDANÇA: refaz só o que foi pedido ---------- */
  var SIS_MUD = 'Você é o diretor de um vídeo curto. Recebe o roteiro atual (cenas numeradas) e um pedido de mudança. Mude SÓ o que o pedido pede e mantenha o resto igual. Responda SÓ com JSON: {"cenas":[{"n":2,"texto":"novo texto da cena","fala":"nova fala"}],"final":null,"personagem":null}. Inclua em "cenas" apenas as cenas que mudam (n começa em 1). "final" é a nova chamada final, ou null se não muda. "personagem" é {"descricao":"..."} só se o pedido mudar a aparência dele, senão null. Não invente marcas, preços, números nem pessoas reais. Português do Brasil.';
  async function pedirMudanca() {
    var pedido = limpa($("qdDirMud").value, 600); if (!pedido) { aviso("Diga o que mudar. Ex.: a cena 3 acontece à noite, na chuva.", true); return; }
    var h = Q().historia(); if (!h.cenas.length) { aviso("O quadro não tem cenas ligadas.", true); return; }
    Q().ocupado("O diretor está mudando só o que você pediu…");
    var atual = (h.pers && (h.pers.nome || h.pers.texto) ? "Personagem: " + (h.pers.nome || "") + " — " + (h.pers.texto || "") + "\n" : "") +
      h.cenas.map(function (c, i) { return "Cena " + (i + 1) + ": " + c.texto + (c.fala ? ' | fala: "' + c.fala + '"' : ""); }).join("\n") + (h.fim ? "\nFinal: " + h.fim.texto : "");
    var r = await Q().ia(SIS_MUD, "Roteiro atual:\n" + atual + "\n\nPedido de mudança: " + pedido, 1200);
    Q().ocupado("");
    var j = r.json; if (!j) { aviso(motivo(r.erro ? r : {erro: "ia"}), true); return; }
    var mudou = [], todas = false;
    if (j.personagem && j.personagem.descricao && h.pers) { h.pers.texto = limpa(j.personagem.descricao, 200); todas = true; }
    (Array.isArray(j.cenas) ? j.cenas : []).forEach(function (c) {
      var b = h.cenas[Number(c && c.n) - 1]; if (!b) return;
      var t = limpa(c.texto, 240), f = c.fala == null ? b.fala : limpa(c.fala, 90);
      if ((t && t !== b.texto) || f !== b.fala) { if (t) b.texto = t; b.fala = f; mudou.push(b); }
    });
    if (todas) h.cenas.forEach(function (b) { if (mudou.indexOf(b) < 0) mudou.push(b); });
    if (j.final && h.fim) h.fim.texto = limpa(j.final, 60);
    for (var i = 0; i < mudou.length; i++) { mudou[i].mudou = true; await Q().tirarImagem(mudou[i].id, "-ia"); }
    Q().guardar(); Q().desenhar();
    var nums = mudou.map(function (b) { return h.cenas.indexOf(b) + 1; }).sort(function (a, b) { return a - b; });
    $("qdDirMud").value = "";
    aviso(nums.length ? "✓ Mudei só " + (nums.length === 1 ? "a cena " + nums[0] : "as cenas " + nums.join(", ")) + (todas ? " (o personagem mudou)" : "") + ". As outras ficaram como estavam — CRIAR IMAGENS refaz só as que mudaram." : (j.final ? "✓ Mudei a chamada final." : "Nada precisou mudar com esse pedido."));
  }

  /* ---------- ▦ STORYBOARD 3×3 (imagem única de referência para IA de vídeo) ---------- */
  function quebrar(x, t, larg) { var ps = String(t).split(" "), l = "", out = []; ps.forEach(function (p) { var e = l ? l + " " + p : p; if (x.measureText(e).width > larg && l) { out.push(l); l = p; } else l = e; }); if (l) out.push(l); return out.slice(0, 7); }
  async function storyboard() {
    var h = Q().historia(), cenas = h.cenas.slice(0, 9); if (!cenas.length) { aviso("Monte o quadro primeiro.", true); return; }
    var CW = 360, CH = 640, G = 6, c = document.createElement("canvas"); c.width = CW * 3 + G * 4; c.height = CH * 3 + G * 4;
    var x = c.getContext("2d"); x.fillStyle = "#0B1222"; x.fillRect(0, 0, c.width, c.height);
    for (var i = 0; i < 9; i++) {
      var px = G + (i % 3) * (CW + G), py = G + Math.floor(i / 3) * (CH + G), cn = cenas[i];
      x.save(); x.beginPath(); x.rect(px, py, CW, CH); x.clip();
      var g = x.createLinearGradient(0, py, 0, py + CH); g.addColorStop(0, "#142544"); g.addColorStop(1, "#0B1222"); x.fillStyle = g; x.fillRect(px, py, CW, CH);
      if (cn) {
        var m = Q().imagem(cn.id + "-ia");
        if (m) { var im = new Image(); im.src = m.url; await im.decode().catch(function () { }); var s = Math.max(CW / im.naturalWidth, CH / im.naturalHeight); x.drawImage(im, px + (CW - im.naturalWidth * s) / 2, py + (CH - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s); }
        else { x.fillStyle = "#F5F1EA"; x.font = "600 22px Inter, Arial, sans-serif"; quebrar(x, cn.texto, CW - 48).forEach(function (l, k) { x.fillText(l, px + 24, py + 120 + k * 32); }); }
        x.fillStyle = "#E8B54A"; x.beginPath(); x.arc(px + 34, py + 34, 22, 0, Math.PI * 2); x.fill();
        x.fillStyle = "#0B1222"; x.font = "800 24px Inter, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(i + 1), px + 34, py + 35); x.textAlign = "left"; x.textBaseline = "alphabetic";
      }
      x.restore();
    }
    var n = cenas.length, seg = Math.min(15, Math.max(5, n * 2));
    var texto = "Use this image as a storyboard: a 3x3 grid read left to right, top to bottom, with " + n + " numbered panels. Turn the panels into one continuous vertical 9:16 video of about " + seg + " seconds, one shot per panel, in order. Keep the same characters, clothes and places in every shot. Smooth cuts, natural motion, cinematic light, no text on screen." +
      (h.pers && h.pers.texto ? " Main character: " + h.pers.texto + "." : "");
    var blob = await new Promise(function (ok) { c.toBlob(ok, "image/png"); });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "storyboard-3x3.png"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    $("qdDirSb").value = texto; $("qdDirSbCx").hidden = false;
    try { await navigator.clipboard.writeText(texto); aviso("✓ Storyboard baixado e o texto copiado."); } catch (e) { aviso("✓ Storyboard baixado. Copie o texto abaixo."); }
    window.__qdStoryboard = {n: n, w: c.width, h: c.height};
  }

  /* ---------- 🎙 falar (reconhecimento do navegador) ---------- */
  var REC = null;
  function falar(idCampo, bt) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (REC) { try { REC.stop(); } catch (e) { } return; }
    if (!SR) { aviso("Este navegador não ouve. Escreva no campo (no iPhone, use o microfone do teclado).", true); return; }
    var r = new SR(), base = $(idCampo).value.trim(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = true; REC = r;
    bt.classList.add("on"); bt.textContent = "■ PARAR";
    r.onresult = function (e) { var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; $(idCampo).value = (base ? base + " " : "") + t.trim(); $(idCampo).dispatchEvent(new Event("input", {bubbles: true})); };
    r.onend = r.onerror = function () { REC = null; bt.classList.remove("on"); bt.textContent = "🎙 FALAR"; };
    try { r.start(); } catch (e) { REC = null; }
  }

  /* ---------- tela ---------- */
  function passos() {
    var nomes = ["IDEIA", "ROTEIRO", "QUADRO", "IMAGENS", "VÍDEO"];
    return '<ol class="qd-dir-passos">' + nomes.map(function (n, i) { var k = i + 1; return '<li class="' + (k < D.etapa ? "feito" : k === D.etapa ? "agora" : "") + '"><i>' + (k < D.etapa ? "✓" : k) + "</i>" + n + "</li>"; }).join("") + "</ol>";
  }
  function telaIdeia() {
    return '<h4>1 · QUE VÍDEO VAMOS FAZER?</h4><div class="qd-chips">' + Object.keys(INICIOS).map(function (k) { var x = INICIOS[k]; return '<button type="button" class="qd-chip' + (k === D.inicio ? " on" : "") + '" data-ini="' + k + '">' + x.ico + " " + x.nome + "</button>"; }).join("") + "</div>" +
      '<h4>2 · CONTE A IDEIA</h4><textarea id="qdDirIdeia" rows="5" maxlength="1500" aria-label="A ideia do vídeo" placeholder="Fale ou escreva do seu jeito. Ex.: aftermovie do congresso de tecnologia da empresa X, 800 pessoas, palco com telão de LED, clima de festa no fim.">' + esc(D.ideia) + "</textarea>" +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="falarIdeia">🎙 FALAR</button></div>' +
      '<h4>3 · TOM E TAMANHO</h4><div class="qd-chips">' + Object.keys(TONS).map(function (k) { return '<button type="button" class="qd-chip' + (k === D.tom ? " on" : "") + '" data-tom="' + k + '">' + TONS[k] + "</button>"; }).join("") + "</div>" +
      '<div class="qd-chips" style="margin-top:6px">' + [3, 4, 5, 6, 8].map(function (n) { return '<button type="button" class="qd-chip' + (n === D.n ? " on" : "") + '" data-n="' + n + '">' + n + " cenas</button>"; }).join("") + "</div>" +
      '<div class="qd-pp-linha"><button class="rl-bt pri" type="button" data-dir="escrever">✨ ESCREVER O ROTEIRO</button></div>' +
      '<p class="qd-dir-nota">Só o texto vai para a IA Brightway. Você aprova cada etapa antes de seguir.</p>';
  }
  function telaRoteiro() {
    var r = D.rot;
    return '<h4>ROTEIRO · edite à vontade</h4><input class="qd-in" data-rot="titulo" maxlength="60" placeholder="Título" value="' + esc(r.titulo) + '">' +
      '<h4>PERSONAGEM</h4><input class="qd-in" data-rot="pnome" maxlength="40" placeholder="Nome (opcional)" value="' + esc(r.personagem && r.personagem.nome) + '"><textarea class="qd-in" data-rot="pdesc" rows="2" maxlength="200" placeholder="Como ele é (opcional: sem personagem fixo, deixe em branco)">' + esc(r.personagem && r.personagem.descricao) + "</textarea>" +
      (r.lugares.length ? "<h4>LUGARES E REFERÊNCIAS</h4>" + r.lugares.map(function (l, i) { return '<input class="qd-in" data-lug="' + i + '" maxlength="200" value="' + esc(l) + '">'; }).join("") : "") +
      "<h4>CENAS</h4>" + r.cenas.map(function (c, i) {
        return '<div class="qd-dir-cena"><div class="qd-dir-cab"><b>CENA ' + (i + 1) + '</b><span><button type="button" class="qd-porta" data-sobe="' + i + '" aria-label="Subir a cena ' + (i + 1) + '">↑</button><button type="button" class="qd-porta" data-desce="' + i + '" aria-label="Descer a cena ' + (i + 1) + '">↓</button><button type="button" class="qd-porta" data-tira="' + i + '" aria-label="Tirar a cena ' + (i + 1) + '">✕</button></span></div>' +
          '<textarea class="qd-in" data-cena="' + i + '" data-c="texto" rows="2" maxlength="240">' + esc(c.texto) + '</textarea><input class="qd-in" data-cena="' + i + '" data-c="fala" maxlength="90" placeholder="Fala ou texto na tela (opcional)" value="' + esc(c.fala) + '"></div>';
      }).join("") +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="maisCena">＋ CENA</button></div>' +
      '<h4>CHAMADA FINAL</h4><input class="qd-in" data-rot="final" maxlength="60" placeholder="Ex.: Peça seu orçamento" value="' + esc(r.final) + '">' +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="voltar">‹ IDEIA</button><button class="rl-bt" type="button" data-dir="escrever">↺ ESCREVER DE NOVO</button><button class="rl-bt pri" type="button" data-dir="montar">✓ MONTAR O QUADRO</button></div>';
  }
  function telaQuadro() {
    return '<h4>O QUADRO ESTÁ MONTADO</h4><p>As cenas estão ligadas em ordem no quadro (feche este painel para ver e mexer à mão). Agora:</p>' +
      '<div class="qd-pp-linha"><button class="rl-bt pri" type="button" data-dir="imagens">✨ CRIAR IMAGENS</button><button class="rl-bt" type="button" data-dir="storyboard">▦ STORYBOARD 3×3</button></div>' +
      '<div id="qdDirSbCx" hidden><p>Texto para colar numa IA de vídeo que aceita imagem de referência, junto com o storyboard:</p><textarea id="qdDirSb" rows="5" aria-label="Texto do storyboard"></textarea></div>' +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="video">🎬 MONTAR O VÍDEO</button></div>' +
      '<h4>✎ PEDIR MUDANÇA</h4><p>Diga o que mudar. O diretor refaz só as cenas afetadas e o resto fica igual.</p>' +
      '<textarea id="qdDirMud" rows="3" maxlength="600" aria-label="O que mudar" placeholder="Ex.: a cena 3 acontece à noite, na chuva · troque a fala da última cena · o personagem usa terno azul"></textarea>' +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="falarMud">🎙 FALAR</button><button class="rl-bt pri" type="button" data-dir="mudar">✨ MUDAR SÓ O QUE PEDI</button></div>' +
      '<div class="qd-pp-linha"><button class="rl-bt" type="button" data-dir="novo">＋ NOVO ROTEIRO</button></div>';
  }
  function desenhar() {
    var corpo = $("qdDirCorpo"); if (!corpo) return;
    corpo.innerHTML = passos() + (D.etapa >= 3 ? telaQuadro() : D.etapa === 2 && D.rot ? telaRoteiro() : telaIdeia());
  }
  function abrir() { if (D.etapa >= 3 && !Q().historia().cenas.length) D.etapa = D.rot ? 2 : 1; aviso(""); desenhar(); $("qdDir").hidden = false; }
  function fechar() { if (REC) try { REC.stop(); } catch (e) { } $("qdDir").hidden = true; }

  function iniciar() {
    if (!$("qdDir") || !window.BWQuadroDir) return;
    $("qdBtDir").onclick = abrir; $("qdDirFechar").onclick = fechar;
    $("qdDir").addEventListener("click", function (e) { if (e.target === $("qdDir")) fechar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("qdDir").hidden) { e.stopImmediatePropagation(); fechar(); } }, true);
    var corpo = $("qdDirCorpo");
    corpo.addEventListener("input", function (e) {
      var t = e.target, r = D.rot;
      if (t.id === "qdDirIdeia") { D.ideia = t.value; guardar(); return; }
      if (!r) return;
      if (t.dataset.rot === "titulo") r.titulo = t.value; else if (t.dataset.rot === "final") r.final = t.value;
      else if (t.dataset.rot === "pnome" || t.dataset.rot === "pdesc") { r.personagem = r.personagem || {nome: "", descricao: ""}; r.personagem[t.dataset.rot === "pnome" ? "nome" : "descricao"] = t.value; }
      else if (t.dataset.lug != null) r.lugares[+t.dataset.lug] = t.value;
      else if (t.dataset.cena != null) r.cenas[+t.dataset.cena][t.dataset.c] = t.value;
      guardar();
    });
    corpo.addEventListener("click", async function (e) {
      var t = e.target.closest("button"); if (!t) return; var r = D.rot, a = t.dataset.dir;
      if (t.dataset.ini) { D.inicio = t.dataset.ini; D.n = INICIOS[D.inicio].n; guardar(); desenhar(); return; }
      if (t.dataset.tom) { D.tom = t.dataset.tom; guardar(); desenhar(); return; }
      if (t.dataset.n) { D.n = +t.dataset.n; guardar(); desenhar(); return; }
      if (t.dataset.tira != null && r) { if (r.cenas.length <= 2) { aviso("O roteiro precisa de pelo menos 2 cenas.", true); return; } r.cenas.splice(+t.dataset.tira, 1); guardar(); desenhar(); return; }
      if ((t.dataset.sobe != null || t.dataset.desce != null) && r) { var i = +(t.dataset.sobe != null ? t.dataset.sobe : t.dataset.desce), j = t.dataset.sobe != null ? i - 1 : i + 1; if (j < 0 || j >= r.cenas.length) return; var x = r.cenas[i]; r.cenas[i] = r.cenas[j]; r.cenas[j] = x; guardar(); desenhar(); return; }
      if (a === "escrever") await escrever();
      else if (a === "montar") await montarQuadro();
      else if (a === "voltar") { D.etapa = 1; guardar(); desenhar(); }
      else if (a === "maisCena" && r) { if (r.cenas.length >= 10) return; r.cenas.push({texto: "", fala: "", lugar: -1}); guardar(); desenhar(); var cs = corpo.querySelectorAll('[data-c="texto"]'); if (cs.length) cs[cs.length - 1].focus(); }
      else if (a === "imagens") { fechar(); await Q().criarImagens(); D.etapa = Math.max(D.etapa, 4); guardar(); }
      else if (a === "storyboard") await storyboard();
      else if (a === "video") { fechar(); D.etapa = 5; guardar(); Q().abrirMontar(); }
      else if (a === "mudar") await pedirMudanca();
      else if (a === "falarIdeia") falar("qdDirIdeia", t);
      else if (a === "falarMud") falar("qdDirMud", t);
      else if (a === "novo") { D.etapa = 1; D.rot = null; guardar(); desenhar(); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.BWDiretor = {abrir: abrir, fechar: fechar, estado: function () { return D; }, inicios: INICIOS, storyboard: storyboard};
})();
