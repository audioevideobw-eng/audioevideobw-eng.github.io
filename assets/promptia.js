/* PROMPT IA (19/11/2026, pedido do dono) — referência de TRENDS virais feitas com IA: o que é, qual prompt usar, onde fazer e como.
   - BIBLIOTECA: cartões altos em carrossel (passa para o lado, galeria flutuante). O ADM alimenta pela própria página:
     tabela public.bw_trends (leitura pública; gravação só is_bw_admin — docs/sql/2026-11-19-prompt-ia.sql) + imagens no bucket público "trends".
     Sem internet/sem tabela: mostra a última cópia guardada no aparelho (ui_promptia_cache) ou 3 EXEMPLOS de texto.
   - ANALISAR: a pessoa envia o print da trend → SÓ depois do confirm() uma cópia pequena (≤ 768 px, JPEG) vai para a IA Brightway com visão
     (Edge Function bw-ia, campo "imagem") → volta {nome, prompt em inglês, onde fazer, passos, dicas}. Nada é guardado na conta.
     Sem imagem: descreve a trend em texto (mesma função, só texto). Precisa estar logado (limite diário da IA). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var FN_IA = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia", PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var CATS = ["Avatar 3D", "Ilustração", "Brinquedo", "Foto realista", "Vídeo", "Outros"];
  var CORES = {"Avatar 3D": ["#7C3AED", "#38bdf8"], "Ilustração": ["#ec4899", "#f97316"], "Brinquedo": ["#f59e0b", "#ef4444"], "Foto realista": ["#10b981", "#0ea5e9"], "Vídeo": ["#ef4444", "#7C3AED"], "Outros": ["#64748b", "#FFB547"]};
  var EMOJI = {"Avatar 3D": "🧑‍🎤", "Ilustração": "🎨", "Brinquedo": "🧱", "Foto realista": "📸", "Vídeo": "🎬", "Outros": "✨"};
  /* onde fazer: nome → endereço (a pessoa abre e cola o prompt; o app não envia nada para essas IAs) */
  var IAS = {"Gemini (Nano Banana)": "https://gemini.google.com/", "ChatGPT": "https://chatgpt.com/", "Flow (Veo)": "https://labs.google/flow", "Kling": "https://klingai.com/", "Higgsfield": "https://higgsfield.ai/",
    "Midjourney": "https://www.midjourney.com/", "Runway": "https://runwayml.com/", "Flux": "https://bfl.ai/", "Leonardo": "https://leonardo.ai/", "Criador IA (Brightway)": "criador.html", "Editor de fotos (Brightway)": "fotos.html",
    "BW Reels (Brightway)": "reels.html", "Quadro de História (Brightway)": "reels.html?quadro=1", "Montagem no Editor de vídeo (Brightway)": "video.html", "CapCut": "https://www.capcut.com/"};
  var EXEMPLOS = [
    {id: "ex1", exemplo: true, titulo: "Boneco 3D urbano a partir da sua foto", categoria: "Avatar 3D", onde: "Gemini (Nano Banana), ChatGPT",
      prompt: "Transform the person in the reference photo into a high-quality 3D animated character. Keep the face as close to the real face as possible, same haircut and skin tone. Stylized yet semi-realistic proportions, slightly large head and hands, smooth detailed skin. Pose: [POSE, ex.: arms crossed, confident]. Wearing [ROUPA DE CIMA], [CALÇA] and [TÊNIS]. White studio background, soft cinematic lighting, sharp focus, designer-toy look, highly detailed, 4K render, full body.",
      passos: "Abra a IA e envie UMA foto sua de frente, nítida e bem iluminada\nCole o prompt e troque o que está entre [COLCHETES]\nGere; se o rosto não ficar parecido, peça: \"keep the face identical to the reference photo\"\nBaixe em alta e poste no formato 4:5", dicas: "Foto quadrada (1:1) com o rosto grande dá o melhor resultado\nPeça uma versão com e sem óculos e escolha depois"},
    {id: "ex2", exemplo: true, titulo: "Ilustração de quadrinhos com pôr do sol", categoria: "Ilustração", onde: "Gemini (Nano Banana), Midjourney",
      prompt: "Digital comic-book illustration of the person in the reference photo, keep the same facial structure: skull proportions, cheekbones, jaw and chin. [POSE, ex.: sitting, facing the viewer]. Wearing [ROUPA]. Rooftop at sunset, pastel pink and warm orange sky, modern city skyline in the soft background. Clean graphic linework, bold cel-shaded colors, retro 80s color palette, dynamic street-fashion look, vertical 9:16.",
      passos: "Envie uma foto de rosto bem nítida\nCole o prompt e descreva a pose e a roupa nos [COLCHETES]\nGere 2 ou 3 versões e fique com a de traço mais limpo\nUse como capa de Reels ou foto de perfil", dicas: "Se sair muito diferente de você, acrescente: \"same face as the reference, do not change facial features\"\nPeça também só o rosto (close) para usar no perfil"},
    {id: "ex3", exemplo: true, titulo: "Você em miniatura de blocos de montar", categoria: "Brinquedo", onde: "Gemini (Nano Banana), ChatGPT",
      prompt: "Create a high-quality toy minifigure made of plastic building blocks, based on the person in the reference image. Use the same hairstyle, skin tone, facial expression and outfit as inspiration and translate the key features (eyes, eyebrows, mouth, accessories) into the simple printed style of a block minifigure. Glossy plastic, cylindrical head, clamp hands. Place it standing next to the original scene, same lighting and background, photorealistic product-photo look.",
      passos: "Envie a foto de corpo inteiro (a roupa aparece melhor)\nCole o prompt como está\nPeça a miniatura sozinha em fundo branco se quiser usar como figurinha\nMonte o antes e depois lado a lado no Editor de fotos", dicas: "Roupas com cor forte ficam mais reconhecíveis na miniatura\nEvite pedir marcas e logos: descreva só as cores e o formato"}
  ];
  var TRENDS = [], CAT = "", VISTA = "bib", ABAS = {}, AN = {blob: null, url: "", res: null, ocupado: false}, EDIT = null;

  function cli() { try { return window.BWSync && BWSync.cliente && BWSync.cliente(); } catch (e) { return null; } }
  async function sessao() { try { var c = cli(), s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session; } catch (e) { return null; } }
  function adm() { return document.documentElement.classList.contains("bw-admin"); }
  function aviso(el, t, erro) { if (!el) return; el.hidden = !t; el.className = "pi-aviso" + (erro ? " erro" : ""); el.textContent = t || ""; }
  function linhas(t) { return String(t || "").split(/\r?\n/).map(function (x) { return x.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim(); }).filter(Boolean); }
  function listaOnde(t) { return String(t || "").split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function linkIA(n) { var k = Object.keys(IAS).filter(function (x) { return x.toLowerCase().split(" ")[0] === String(n).toLowerCase().split(" ")[0]; })[0]; return k ? IAS[k] : ""; }
  function copiar(t, bt) {
    var ok = function () { if (!bt) return; var a = bt.textContent; bt.textContent = "✓ COPIADO"; setTimeout(function () { bt.textContent = a; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { velho(); }); else velho();
    function velho() { var a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); ok(); } catch (e) {} a.remove(); }
  }

  /* ---------- BIBLIOTECA ---------- */
  async function carregar() {
    try { var g = JSON.parse(localStorage.getItem("ui_promptia_cache") || "null"); if (g && g.length) TRENDS = g; } catch (e) {}
    desenharBib();
    var c = cli(); if (!c) return;
    try {
      var r = await c.from("bw_trends").select("*").order("ordem", {ascending: true}).order("criado_em", {ascending: false}).limit(200);
      if (r && !r.error && Array.isArray(r.data)) { TRENDS = r.data; try { localStorage.setItem("ui_promptia_cache", JSON.stringify(TRENDS.slice(0, 60))); } catch (e) {} desenharBib(); }
    } catch (e) {}
  }
  function lista() { var l = TRENDS.length ? TRENDS : EXEMPLOS; return l.filter(function (t) { return !CAT || t.categoria === CAT; }); }
  function cartao(t, extra) {
    var cor = CORES[t.categoria] || CORES.Outros, aba = ABAS[t.id] || "prompt", onde = listaOnde(t.onde), passos = linhas(t.passos), dicas = linhas(t.dicas);
    var corpo = aba === "prompt" ? '<div class="pi-prompt" id="pp_' + esc(t.id) + '">' + esc(t.prompt) + '</div><p class="pi-nota">Troque o que estiver entre [COLCHETES] pelo que você quer.</p>'
      : aba === "como" ? (passos.length ? '<ol class="pi-passos">' + passos.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ol>" : '<p class="pi-nota">Sem passo a passo cadastrado.</p>') + (dicas.length ? '<div class="pi-dicas"><b>DICAS</b>' + dicas.map(function (d) { return "<span>💡 " + esc(d) + "</span>"; }).join("") + "</div>" : "")
      : (onde.length ? '<div class="pi-onde">' + onde.map(function (o) { var u = linkIA(o); return u ? '<a class="pi-bt" href="' + esc(u) + '"' + (/^https/.test(u) ? ' target="_blank" rel="noopener"' : "") + ">" + esc(o) + " ↗</a>" : '<span class="pi-bt off">' + esc(o) + "</span>"; }).join("") + '</div><p class="pi-nota">Abra a IA, envie a sua foto (se a trend pedir) e cole o prompt. O Brightway não envia nada para essas IAs.</p>' : '<p class="pi-nota">Serve em qualquer IA de imagem que aceite foto de referência.</p>');
    return '<article class="pi-card" data-id="' + esc(t.id) + '" style="--a:' + cor[0] + ";--b:" + cor[1] + '">' +
      '<div class="pi-hero">' + (t.imagem ? '<img class="pi-fundo" src="' + esc(t.imagem) + '" alt="" aria-hidden="true" loading="lazy"><img src="' + esc(t.imagem) + '" alt="Exemplo da trend ' + esc(t.titulo) + '" loading="lazy">' : '<span class="pi-emoji" aria-hidden="true">' + (EMOJI[t.categoria] || "✨") + "</span>") + '<i class="pi-faixa"></i>' +
      '<span class="pi-cat">' + esc(t.categoria || "Outros") + "</span>" + (t.exemplo ? '<span class="pi-ex">EXEMPLO</span>' : "") + "</div>" +
      '<div class="pi-info"><h3>' + esc(t.titulo) + "</h3>" + (extra || "") +
      (!t.exemplo && !extra ? '<div class="pi-adm so-admin"><button type="button" class="pi-bt peq" data-ed="' + esc(t.id) + '">✎ ALTERAR</button><button type="button" class="pi-bt peq perigo" data-del="' + esc(t.id) + '" aria-label="Excluir a trend ' + esc(t.titulo) + '">✕ EXCLUIR</button></div>' : "") +
      '<div class="pi-pills" role="tablist">' + [["prompt", "PROMPT"], ["como", "COMO FAZER"], ["onde", "ONDE FAZER"]].map(function (a) { return '<button type="button" role="tab" class="pi-pill' + (aba === a[0] ? " on" : "") + '" data-aba="' + a[0] + '" data-de="' + esc(t.id) + '" aria-selected="' + (aba === a[0]) + '">' + a[1] + "</button>"; }).join("") + "</div>" +
      '<div class="pi-corpo">' + corpo + "</div></div>" +
      '<div class="pi-pe"><button type="button" class="pi-bt pri" data-copiar="' + esc(t.id) + '">⧉ COPIAR PROMPT</button></div></article>';
  }
  function desenharBib() {
    var l = lista(), todas = TRENDS.length ? TRENDS : EXEMPLOS, usadas = CATS.filter(function (c) { return todas.some(function (t) { return t.categoria === c; }); });
    $("piCats").innerHTML = '<button type="button" class="pi-chip' + (!CAT ? " on" : "") + '" data-cat="" aria-pressed="' + !CAT + '">TODAS</button>' + usadas.map(function (c) { return '<button type="button" class="pi-chip' + (CAT === c ? " on" : "") + '" data-cat="' + esc(c) + '" aria-pressed="' + (CAT === c) + '">' + esc(c.toUpperCase()) + "</button>"; }).join("");
    $("piCar").innerHTML = l.length ? l.map(function (t) { return cartao(t); }).join("") : '<div class="pi-vazio">Nenhuma trend nesta categoria ainda.</div>';
    $("piConta").textContent = l.length ? l.length + (l.length === 1 ? " guia" : " guias") + (TRENDS.length ? "" : " de exemplo — a biblioteca oficial aparece aqui quando o ADM cadastrar") : "";
    requestAnimationFrame(flutuar);
  }
  /* galeria flutuante: o cartão do meio fica maior e na frente; os dos lados encolhem e descem um pouco */
  function flutuar() {
    var car = $("piCar"); if (!car) return; var r = car.getBoundingClientRect(), meio = r.left + r.width / 2, parado = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    [].forEach.call(car.querySelectorAll(".pi-card"), function (c) {
      var b = c.getBoundingClientRect(), d = Math.max(-1.6, Math.min(1.6, (b.left + b.width / 2 - meio) / Math.max(b.width, 1))), a = Math.abs(d);
      c.style.transform = parado ? "" : "perspective(1100px) translateY(" + (a * 16).toFixed(1) + "px) scale(" + (1 - Math.min(a, 1) * 0.08).toFixed(3) + ") rotateY(" + (-d * 7).toFixed(2) + "deg)";
      c.style.opacity = (1 - Math.min(a, 1.4) * 0.28).toFixed(2); c.style.zIndex = String(10 - Math.round(a * 4)); c.classList.toggle("meio", a < 0.35);
    });
  }
  function andar(dir) { var car = $("piCar"), c = car.querySelector(".pi-card"); if (!c) return; car.scrollBy({left: dir * (c.getBoundingClientRect().width + 18), behavior: "smooth"}); }
  function achar(id) { return (TRENDS.length ? TRENDS : EXEMPLOS).filter(function (t) { return String(t.id) === String(id); })[0] || (AN.res && String(AN.res.id) === String(id) ? AN.res : null); }

  /* ---------- imagem: copia o arquivo para a memória (o iPhone invalida o original) e reduz ---------- */
  async function reduzir(arq, lado, q) {
    var copia = new Blob([await arq.arrayBuffer()], {type: arq.type || "image/jpeg"}), url = URL.createObjectURL(copia);
    try {
      var img = await new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { erro(new Error("Não consegui abrir essa imagem. Tente em JPG ou PNG.")); }; i.src = url; });
      var k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
      return await new Promise(function (ok) { cv.toBlob(function (b) { ok(b); }, "image/jpeg", q || 0.84); });
    } finally { URL.revokeObjectURL(url); }
  }
  function dataURL(blob) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(String(r.result)); }; r.onerror = erro; r.readAsDataURL(blob); }); }

  /* ---------- ANALISAR ---------- */
  var SISTEMA = 'Você analisa TRENDS virais de imagem e vídeo feitas com IA e ensina a reproduzir. Responda SÓ com JSON neste formato exato: {"nome":"nome curto da trend em português","categoria":"uma de: Avatar 3D, Ilustração, Brinquedo, Foto realista, Vídeo, Outros","resumo":"o que é, em 1 frase em português","precisa_foto":true,"prompt":"prompt em INGLÊS pronto para colar","onde":["até 3 IAs desta lista: Gemini (Nano Banana), ChatGPT, Flow (Veo), Kling, Higgsfield, Midjourney, Runway, Flux, Leonardo"],"passos":["3 a 6 passos curtos em português"],"dicas":["até 3 dicas curtas em português"]}. Regras do prompt: descreva estilo, enquadramento, pose, roupa, luz, fundo e acabamento; onde a pessoa deve personalizar use [COLCHETES EM MAIÚSCULAS, em português]; se a trend transforma a foto de uma pessoa, comece mandando usar a foto de referência e manter o rosto fiel; se a imagem já mostra um prompt escrito, aproveite e melhore. Nunca cite nomes de pessoas. Não use nomes de marcas, personagens ou franquias: descreva o estilo com palavras. Para trend de vídeo, o prompt descreve a cena e o movimento da câmera.';
  function extrairJSON(t) { t = String(t || "").replace(/```json|```/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function limpar(o) {   /* a IA às vezes embrulha a resposta ({"trend":{…}}) ou manda listas como texto */
    if (!o || typeof o !== "object") return null; if (!o.prompt) { var k = Object.keys(o).filter(function (x) { return o[x] && typeof o[x] === "object" && o[x].prompt; })[0]; if (k) o = o[k]; }
    if (!o.prompt) return null; var arr = function (v) { return Array.isArray(v) ? v.map(String) : linhas(v); };
    return {id: "an" + Date.now(), analise: true, titulo: String(o.nome || o.titulo || "Trend analisada").slice(0, 120), categoria: CATS.indexOf(o.categoria) >= 0 ? o.categoria : "Outros", resumo: String(o.resumo || ""), precisaFoto: !!o.precisa_foto,
      prompt: String(o.prompt).replace(/\*\*/g, "").trim(), onde: arr(o.onde).slice(0, 4).join(", "), passos: arr(o.passos).join("\n"), dicas: arr(o.dicas).join("\n"), imagem: AN.url || ""};
  }
  async function analisar() {
    if (AN.ocupado) return; var txt = $("anTexto").value.trim(), av = $("anAviso");
    if (!AN.blob && !txt) { aviso(av, "Envie o print da trend ou descreva como ela é.", true); return; }
    var s = await sessao(); if (!s) { aviso(av, "Entre na sua conta para a IA analisar a trend (o limite é por conta).", true); return; }
    if (AN.blob && !confirm("Analisar esta imagem com a IA Brightway?\n\nUma cópia pequena da imagem vai para a IA só para ser lida e não fica guardada. Evite enviar print com dados pessoais.")) return;
    AN.ocupado = true; $("anBt").disabled = true; aviso(av, "Analisando a trend…");
    try {
      var corpo = {sistema: SISTEMA, pedido: (AN.blob ? "Analise a imagem desta trend e ensine a fazer igual." : "A trend é assim: " + txt) + (AN.blob && txt ? " Detalhe da pessoa: " + txt : "") + " Quero fazer: " + $("anTipo").value + ".", max: 900};
      if (AN.blob) corpo.imagem = await dataURL(AN.blob);
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB}, body: JSON.stringify(corpo)});
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) throw new Error(r.status === 401 ? "Entre de novo na sua conta." : r.status === 429 ? "O limite de hoje da IA acabou. Tente amanhã." : j.erro === "imagem" ? "A IA não aceitou essa imagem. Tente outro print." : j.erro === "visao" ? "A IA de imagem está fora do ar agora" + (j.detalhe ? " (" + j.detalhe + ")" : "") + ". Descreva a trend em texto, sem a imagem." : "A IA Brightway não respondeu agora. Tente de novo em instantes.");
      var o = limpar(extrairJSON(j.texto)); if (!o) throw new Error("A IA respondeu fora do formato. Toque em ANALISAR de novo.");
      AN.res = o; ABAS[o.id] = "prompt"; desenharRes(); aviso(av, "");
    } catch (e) { aviso(av, e && e.message || "Não consegui analisar.", true); }
    AN.ocupado = false; $("anBt").disabled = false;
  }
  function desenharRes() {
    var o = AN.res, box = $("anRes"); if (!o) { box.innerHTML = ""; return; }
    box.innerHTML = cartao(o, (o.resumo ? '<p class="pi-resumo">' + esc(o.resumo) + "</p>" : "") + (o.precisaFoto ? '<p class="pi-nota" style="margin-top:0">📷 Esta trend usa a SUA foto como referência.</p>' : "") +
      '<div class="pi-adm so-admin"><button type="button" class="pi-bt peq" id="anSalvar">＋ SALVAR NA BIBLIOTECA</button></div>');
    var c = box.querySelector(".pi-card"); if (c) { c.classList.add("solo"); c.scrollIntoView({behavior: "smooth", block: "nearest"}); }
  }
  function escolher(arq) {
    if (!arq) return; if (!/^image\//.test(arq.type || "") && !/\.(jpe?g|png|webp|heic)$/i.test(arq.name || "")) { aviso($("anAviso"), "Envie uma imagem (print da trend).", true); return; }
    reduzir(arq, 768, 0.82).then(function (b) { if (AN.url) URL.revokeObjectURL(AN.url); AN.blob = b; AN.url = URL.createObjectURL(b); $("anPrev").innerHTML = '<img src="' + AN.url + '" alt="Print da trend enviado"><button type="button" class="pi-bt peq" id="anTirar">✕ TIRAR IMAGEM</button>'; $("anZona").classList.add("tem"); aviso($("anAviso"), ""); })
      .catch(function (e) { aviso($("anAviso"), e.message || "Não consegui abrir a imagem.", true); });
  }

  /* ---------- ADM: nova / alterar / excluir ---------- */
  function abrirForm(t, blob) {
    EDIT = {id: t && !t.analise && !t.exemplo ? t.id : null, imagem: t && !t.analise ? (t.imagem || "") : "", blob: blob || null};
    $("fmTit").textContent = EDIT.id ? "ALTERAR TREND" : "NOVA TREND"; $("fmTitulo").value = t ? t.titulo || "" : ""; $("fmCat").value = t && CATS.indexOf(t.categoria) >= 0 ? t.categoria : "Outros";
    $("fmOnde").value = t ? t.onde || "" : ""; $("fmPrompt").value = t ? t.prompt || "" : ""; $("fmPassos").value = t ? t.passos || "" : ""; $("fmDicas").value = t ? t.dicas || "" : ""; $("fmArq").value = "";
    $("fmPrev").innerHTML = blob ? '<img src="' + URL.createObjectURL(blob) + '" alt="Imagem da trend">' : EDIT.imagem ? '<img src="' + esc(EDIT.imagem) + '" alt="Imagem atual da trend">' : "";
    aviso($("fmAviso"), ""); $("piFolha").hidden = false; document.documentElement.classList.add("pi-aberto"); $("fmTitulo").focus();
  }
  function fecharForm() { $("piFolha").hidden = true; document.documentElement.classList.remove("pi-aberto"); EDIT = null; }
  async function salvar() {
    var c = cli(), av = $("fmAviso"), reg = {titulo: $("fmTitulo").value.trim(), categoria: $("fmCat").value, onde: $("fmOnde").value.trim(), prompt: $("fmPrompt").value.trim(), passos: $("fmPassos").value.trim(), dicas: $("fmDicas").value.trim()};
    if (!reg.titulo || !reg.prompt) { aviso(av, "Preencha o nome da trend e o prompt.", true); return; }
    if (!c || !(await sessao())) { aviso(av, "Entre na conta de ADM para salvar.", true); return; }
    $("fmSalvar").disabled = true; aviso(av, "Salvando…");
    try {
      if (EDIT.blob) {
        var nome = "t" + Date.now() + Math.random().toString(36).slice(2, 7) + ".jpg", up = await c.storage.from("trends").upload(nome, EDIT.blob, {contentType: "image/jpeg", cacheControl: "31536000", upsert: false});
        if (up.error) throw new Error("A imagem não subiu: " + (up.error.message || "erro"));
        reg.imagem = c.storage.from("trends").getPublicUrl(nome).data.publicUrl; EDIT.velha = EDIT.imagem;
      }
      var r = EDIT.id ? await c.from("bw_trends").update(Object.assign({atualizado_em: new Date().toISOString()}, reg)).eq("id", EDIT.id).select() : await c.from("bw_trends").insert(reg).select();
      if (r.error || !r.data || !r.data.length) throw new Error(r.error ? (/row-level|policy|permission/i.test(r.error.message) ? "Só a conta de ADM pode salvar na biblioteca." : r.error.message) : "Só a conta de ADM pode salvar na biblioteca.");
      if (EDIT.velha) apagarImagem(EDIT.velha);
      fecharForm(); VISTA = "bib"; CAT = ""; trocar(); await carregar(); aviso($("piAviso"), "✓ Trend salva na biblioteca.");   /* depois do re-render (regra 2) */
      var car = $("piCar"), novo = car.querySelector('[data-id="' + r.data[0].id + '"]'); if (novo) novo.scrollIntoView({behavior: "smooth", inline: "center", block: "nearest"});
    } catch (e) { aviso(av, e.message || "Não consegui salvar.", true); }
    $("fmSalvar").disabled = false;
  }
  function apagarImagem(url) { var m = /\/trends\/([^/?#]+)$/.exec(url || ""), c = cli(); if (m && c) c.storage.from("trends").remove([decodeURIComponent(m[1])]).catch(function () {}); }
  async function excluir(id) {
    var t = achar(id), c = cli(); if (!t || !c) return; if (!confirm("Excluir a trend “" + t.titulo + "” da biblioteca?\n\nEla some para todos os usuários.")) return;
    var r = await c.from("bw_trends").delete().eq("id", id).select();
    if (r.error || !r.data || !r.data.length) { aviso($("piAviso"), "Não consegui excluir (só a conta de ADM pode).", true); return; }
    apagarImagem(t.imagem); await carregar(); aviso($("piAviso"), "Trend excluída.");
  }

  /* ---------- ligações ---------- */
  function trocar() {
    $("piBib").hidden = VISTA !== "bib"; $("piAn").hidden = VISTA !== "an";
    [].forEach.call(document.querySelectorAll("[data-vista]"), function (b) { var on = b.dataset.vista === VISTA; b.classList.toggle("on", on); b.setAttribute("aria-selected", String(on)); });
    if (VISTA === "bib") requestAnimationFrame(flutuar);
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-vista],[data-cat],[data-aba],[data-copiar],[data-ed],[data-del],#piAnt,#piProx,#piNova,#anBt,#anTirar,#anSalvar,#fmSalvar,#fmFechar,#fmCancelar"); if (!b) return;
    if (b.dataset.vista) { VISTA = b.dataset.vista; trocar(); return; }
    if (b.dataset.cat != null && b.classList.contains("pi-chip")) { CAT = b.dataset.cat; desenharBib(); $("piCar").scrollTo({left: 0}); return; }
    if (b.dataset.aba) { ABAS[b.dataset.de] = b.dataset.aba; if (AN.res && String(AN.res.id) === b.dataset.de) desenharRes(); else { var car = $("piCar"), x = car.scrollLeft; desenharBib(); car.scrollLeft = x; flutuar(); } return; }
    if (b.dataset.copiar) { var t = achar(b.dataset.copiar); if (t) copiar(t.prompt, b); return; }
    if (b.dataset.ed) { var te = achar(b.dataset.ed); if (te) abrirForm(te); return; }
    if (b.dataset.del) { excluir(b.dataset.del); return; }
    if (b.id === "piAnt") andar(-1); else if (b.id === "piProx") andar(1); else if (b.id === "piNova") abrirForm(null);
    else if (b.id === "anBt") analisar();
    else if (b.id === "anTirar") { if (AN.url) URL.revokeObjectURL(AN.url); AN.blob = null; AN.url = ""; $("anPrev").innerHTML = ""; $("anZona").classList.remove("tem"); $("anArq").value = ""; }
    else if (b.id === "anSalvar") { if (AN.res) abrirForm(AN.res, AN.blob); }
    else if (b.id === "fmSalvar") salvar(); else if (b.id === "fmFechar" || b.id === "fmCancelar") fecharForm();
  });
  $("anArq").addEventListener("change", function () { escolher(this.files && this.files[0]); });
  $("fmArq").addEventListener("change", function () { var a = this.files && this.files[0]; if (!a || !EDIT) return; reduzir(a, 1080, 0.86).then(function (b) { EDIT.blob = b; $("fmPrev").innerHTML = '<img src="' + URL.createObjectURL(b) + '" alt="Imagem escolhida para a trend">'; }).catch(function (e) { aviso($("fmAviso"), e.message, true); }); });
  var zona = $("anZona");
  ["dragenter", "dragover"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("sobre"); }); });
  ["dragleave", "drop"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove("sobre"); }); });
  zona.addEventListener("drop", function (e) { escolher(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
  document.addEventListener("paste", function (e) { if (VISTA !== "an" || !$("piFolha").hidden) return; var it = [].filter.call((e.clipboardData && e.clipboardData.items) || [], function (i) { return i.kind === "file" && /^image\//.test(i.type); })[0]; if (it) escolher(it.getAsFile()); });
  $("piCar").addEventListener("scroll", function () { requestAnimationFrame(flutuar); }, {passive: true});
  $("piCar").addEventListener("keydown", function (e) { if (e.key === "ArrowRight") andar(1); else if (e.key === "ArrowLeft") andar(-1); });
  window.addEventListener("resize", function () { requestAnimationFrame(flutuar); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("piFolha").hidden) fecharForm(); });
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var s = await sessao(), u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  try { if (/[?&]analisar=1/.test(location.search)) VISTA = "an"; } catch (e) {}
  trocar(); carregar();
  window.__promptia = {trends: function () { return TRENDS; }, limpar: limpar, extrairJSON: extrairJSON, estado: AN, flutuar: flutuar, recarregar: carregar};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
