/* ÁREA DE PERSONAGENS (18/11/2026, Claude) — personagens.html
   Agente que conversa (texto ou voz), monta a FICHA e o PROMPT MESTRE; imagem pela IA criativa (fotos-nuvem.js, com confirmação) ou enviada;
   biblioteca compartilhada com o BW Reels e o Quadro de História (assets/bw-personagens.js, só no aparelho).
   Para a IA Brightway (bw-ia) vai só TEXTO: a conversa e a ficha. Nada é gravado na conta. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  var FN_IA = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia", PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var L = window.BWPersonagens, A = window.BWReelsAvatar;
  var CORES = [["#5B2BE0", "#B02BD9"], ["#FF4D6D", "#FF9E40"], ["#0FA3B1", "#2B59E0"], ["#12B76A", "#0E7C86"], ["#F5A524", "#E0552B"], ["#7B2CBF", "#3A0CA3"]];
  var CAMPOS = ["nome", "papel", "aparencia", "roupa", "personalidade", "estilo", "prompt"], ID = {nome: "fxNome", papel: "fxPapel", aparencia: "fxAparencia", roupa: "fxRoupa", personalidade: "fxPersonalidade", estilo: "fxEstilo", prompt: "fxPrompt"};
  var LIB = [], URLS = {}, AG = null, PS = null;
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function urlDe(r) { if (!r.blob) return ""; if (!URLS[r.id] || URLS[r.id].b !== r.blob) { if (URLS[r.id]) URL.revokeObjectURL(URLS[r.id].u); URLS[r.id] = {b: r.blob, u: URL.createObjectURL(r.blob)}; } return URLS[r.id].u; }
  function corDe(r) { var n = 0, s = String(r.id); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return CORES[n % CORES.length]; }
  function aviso(el, t, erro) { el.hidden = !t; el.className = "pg-aviso" + (erro ? " erro" : ""); el.textContent = t || ""; }
  function travar(on) { document.documentElement.classList.toggle("pg-aberto", !!on); }

  /* ---------- galeria ---------- */
  async function carregar() { LIB = await L.listar(); desenhar(); if (window.BWPersonagensProntos && $("ppCar")) desenharProntos(); }
  function desenhar() {
    var box = $("pgGrade"); $("pgTitMeus").textContent = "MEUS PERSONAGENS" + (LIB.length ? " · " + LIB.length : "");
    box.innerHTML = LIB.length ? LIB.map(function (r) { var c = corDe(r), f = r.ficha || {}, u = urlDe(r);
      return '<div class="pc-card meu" role="button" tabindex="0" data-id="' + esc(r.id) + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '" aria-label="Abrir ' + esc(r.nome || "personagem") + '">' +
        '<div class="pc-hero">' + (u ? '<img class="pc-fundo" alt="" aria-hidden="true" src="' + u + '"><img alt="" src="' + u + '">' : '<span class="ini" aria-hidden="true">' + esc(String(r.nome || "?").trim().charAt(0).toUpperCase()) + '</span>') +
        '<span class="pc-cat">' + (r.pronto ? "PRONTO" : r.tipo === "montado" ? "MONTADO NO REELS" : r.blob ? "COM IMAGEM" : "SÓ A FICHA") + '</span></div>' +
        '<div class="pc-info"><b>' + esc(r.nome || "Sem nome") + '</b>' + (f.papel ? '<small>' + esc(f.papel) + '</small>' : "") + '</div></div>'; }).join("")
      : '<div class="pg-vazio" style="flex:none;width:min(420px,84vw);scroll-snap-align:center">Ainda não há personagens aqui.<br>Use um <b>PRONTO</b> (＋ USAR), toque em <b>✨ CRIAR COM O AGENTE</b> ou envie a imagem de um que você já tem.</div>';
    requestAnimationFrame(function () { flutuar(box); });
  }

  /* ---------- PERSONAGENS PRONTOS (19/11): bonecos 3D oficiais em 5 ângulos, em carrossel com aproximação ---------- */
  var PP = window.BWPersonagensProntos || {lista: [], ANGULOS: []}, PP_CAT = "", PP_ANG = {};
  function desenharProntos() {
    var cats = [""].concat(PP.lista.map(function (p) { return p.categoria; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    $("ppCats").innerHTML = cats.map(function (c) { return '<button type="button" role="tab" class="pc-chip' + (c === PP_CAT ? " on" : "") + '" data-ppcat="' + esc(c) + '" aria-selected="' + (c === PP_CAT) + '">' + esc(c || "TODOS") + '</button>'; }).join("");
    var l = PP.lista.filter(function (p) { return !PP_CAT || p.categoria === PP_CAT; });
    $("ppCar").innerHTML = l.map(function (p) { var k = PP_ANG[p.id] || "frente", u = p.planos[k], ja = LIB.some(function (r) { return r.pronto === p.id; });
      return '<div class="pc-card" data-pp="' + esc(p.id) + '" style="--c1:' + p.cores[0] + ';--c2:' + p.cores[1] + '">' +
        '<div class="pc-hero"><img class="pc-fundo" alt="" aria-hidden="true" loading="lazy" src="' + esc(u) + '"><img alt="' + esc(p.nome + " — " + k) + '" loading="lazy" src="' + esc(u) + '"><span class="pc-cat">' + esc(p.categoria) + '</span></div>' +
        '<div class="pc-info"><b>' + esc(p.nome) + '</b><small>' + esc(p.papel) + ' · boneco 3D</small>' +
        '<div class="pc-angs">' + PP.ANGULOS.map(function (a) { return '<button type="button" class="pc-ang' + (a[0] === k ? " on" : "") + '" data-ppang="' + a[0] + '" data-de="' + esc(p.id) + '" aria-label="Ver ' + a[1] + '"><img alt="" loading="lazy" src="' + esc(p.planos[a[0]]) + '"><span>' + a[1] + '</span></button>'; }).join("") + '</div>' +
        '<div class="pc-bts"><button class="pg-bt amb" type="button" data-ppusar="' + esc(p.id) + '">' + (ja ? "✓ NA MINHA BIBLIOTECA" : "＋ USAR") + '</button><button class="pg-bt" type="button" data-ppcopiar="' + esc(p.id) + '">⧉ PROMPT</button></div></div></div>'; }).join("");
    requestAnimationFrame(function () { flutuar($("ppCar")); });
  }
  function flutuar(car) {
    if (!car) return; var r = car.getBoundingClientRect(), meio = r.left + r.width / 2, parado = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    [].forEach.call(car.querySelectorAll(".pc-card"), function (c) {
      var b = c.getBoundingClientRect(), d = Math.max(-1.6, Math.min(1.6, (b.left + b.width / 2 - meio) / Math.max(b.width, 1))), a = Math.abs(d);
      c.style.transform = parado ? "" : "perspective(1100px) translateY(" + (a * 16).toFixed(1) + "px) scale(" + (1 - Math.min(a, 1) * 0.08).toFixed(3) + ") rotateY(" + (-d * 7).toFixed(2) + "deg)";
      c.style.opacity = (1 - Math.min(a, 1.4) * 0.28).toFixed(2); c.style.zIndex = String(10 - Math.round(a * 4)); c.classList.toggle("meio", a < 0.35);
    });
  }
  function andar(car, dir) { var c = car.querySelector(".pc-card"); if (c) car.scrollBy({left: dir * (c.getBoundingClientRect().width + 18), behavior: "smooth"}); }
  async function usarPronto(id) {
    var p = PP.lista.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var ja = LIB.filter(function (r) { return r.pronto === id; })[0]; if (ja) { abrirPers(ja.id, "Este personagem já está na sua biblioteca."); return; }
    var bt = document.querySelector('[data-ppusar="' + id + '"]'); if (bt) { bt.disabled = true; bt.textContent = "COPIANDO…"; }
    try {
      var planos = {};
      for (var i = 0; i < PP.ANGULOS.length; i++) { var k = PP.ANGULOS[i][0], r = await fetch(p.planos[k]); if (r.ok) planos[k] = await r.blob(); }
      if (!planos.frente) throw new Error("sem imagem");
      var rec = await L.salvar({nome: p.nome, tipo: "foto", pronto: p.id, ficha: Object.assign({}, p.ficha), planos: planos, blob: planos.frente});
      await carregar(); desenharProntos(); abrirPers(rec.id, "✓ " + p.nome + " está na sua biblioteca, com " + Object.keys(planos).length + " ângulos. Já dá para usar no Quadro de História e no BW Reels.");
    } catch (e) { if (bt) { bt.disabled = false; bt.textContent = "＋ USAR"; } alert("Não consegui copiar as imagens agora (sem internet?). Tente de novo."); }
  }
  function ligarCarrossel(car) { var t = 0; car.addEventListener("scroll", function () { if (t) return; t = requestAnimationFrame(function () { t = 0; flutuar(car); }); }, {passive: true});
    car.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); andar(car, e.key === "ArrowRight" ? 1 : -1); } }); }
  ligarCarrossel($("ppCar")); ligarCarrossel($("pgGrade"));
  window.addEventListener("resize", function () { flutuar($("ppCar")); flutuar($("pgGrade")); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-car],[data-ppcat],[data-ppang],[data-ppusar],[data-ppcopiar]"); if (!b) return;
    if (b.dataset.car) { andar($(b.dataset.car), Number(b.dataset.dir)); return; }
    if (b.dataset.ppcat != null) { PP_CAT = b.dataset.ppcat; desenharProntos(); $("ppCar").scrollTo({left: 0}); return; }
    if (b.dataset.ppang) { PP_ANG[b.dataset.de] = b.dataset.ppang; var car = $("ppCar"), x = car.scrollLeft; desenharProntos(); car.scrollLeft = x; flutuar(car); return; }
    if (b.dataset.ppusar) { usarPronto(b.dataset.ppusar); return; }
    if (b.dataset.ppcopiar) { var p = PP.lista.filter(function (x) { return x.id === b.dataset.ppcopiar; })[0]; if (p) navigator.clipboard.writeText(p.ficha.prompt).then(function () { b.textContent = "✓ COPIADO"; setTimeout(function () { b.textContent = "⧉ PROMPT"; }, 1600); }, function () { prompt("Copie o prompt:", p.ficha.prompt); }); }
  });

  /* ---------- AGENTE ---------- */
  var PERGUNTAS = [["nome", "Como ele (ou ela) se chama?"], ["papel", "Qual é o papel dele na história? (ex.: fotógrafa, mascote da marca, cliente)"], ["aparencia", "Como ele é? Idade, cabelo, rosto, corpo…"], ["roupa", "Que roupa e acessórios ele usa?"], ["estilo", "Qual o estilo do desenho? (3D de animação, foto realista, desenho 2D…)"]];
  function novoAgente(base) { return {ficha: base || {nome: "", papel: "", aparencia: "", roupa: "", personalidade: "", estilo: "", prompt: ""}, hist: [], blob: null, id: null, passo: -1, ocupado: false, rec: null, grav: null}; }
  function fala(quem, t) { AG.hist.push({q: quem, t: t}); var d = document.createElement("div"); d.className = "pg-msg " + (quem === "a" ? "a" : "u"); d.textContent = t; $("agChat").appendChild(d); d.scrollIntoView({block: "nearest"}); }
  function lerFicha() { CAMPOS.forEach(function (k) { AG.ficha[k] = $(ID[k]).value.trim(); }); return AG.ficha; }
  function porFicha() { CAMPOS.forEach(function (k) { $(ID[k]).value = AG.ficha[k] || ""; }); $("agFicha").hidden = false; mostrarImgAg(); }
  function mostrarImgAg() { var b = $("fxImg"); if (!AG.blob) { b.hidden = true; b.innerHTML = ""; return; } if (AG.url) URL.revokeObjectURL(AG.url); AG.url = URL.createObjectURL(AG.blob); b.hidden = false; b.innerHTML = '<img alt="Imagem do personagem" src="' + AG.url + '">'; }
  function promptLocal(f) { return [f.nome ? "Personagem " + f.nome : "Personagem", f.papel, f.aparencia, f.roupa ? "vestindo " + f.roupa : "", f.personalidade ? "expressão " + f.personalidade : "", f.estilo ? "estilo " + f.estilo : "", "corpo inteiro, de frente, fundo liso claro, sem texto"].filter(Boolean).join(", "); }
  function abrirAgente(base, rec) {
    AG = novoAgente(base ? JSON.parse(JSON.stringify(base)) : null); if (rec) { AG.id = rec.id; AG.blob = rec.blob || null; }
    $("agChat").innerHTML = ""; $("agTexto").value = ""; aviso($("agAviso"), ""); $("agFicha").hidden = true; $("folhaAgente").hidden = false; travar(true);
    if (base) { porFicha(); fala("a", "Aqui está a ficha de " + (base.nome || "seu personagem") + ". Me diga o que quer mudar (ex.: \"deixa o cabelo curto\", \"troca a roupa por terno\") ou mexa direto nos campos."); }
    else fala("a", "Oi! Eu ajudo a criar o seu personagem. Me conte quem você imagina — do seu jeito, pode falar tudo de uma vez: quem é, como é, que roupa usa e o estilo do desenho.");
  }
  function fecharAgente() { pararMic(); $("folhaAgente").hidden = true; travar(!$("folhaPers").hidden); }
  function achatar(j) {   /* a IA às vezes embrulha a ficha: {"ficha":{…}} / {"personagem":{…}} (regra 65) */
    if (!j || typeof j !== "object") return null; var f = j.ficha || j.personagem || j.character || j, o = {};
    CAMPOS.forEach(function (k) { if (typeof f[k] === "string") o[k] = f[k].replace(/\*\*|^#+\s*/gm, "").trim(); });
    o.pergunta = typeof (j.pergunta || f.pergunta) === "string" ? (j.pergunta || f.pergunta).trim() : ""; o.resposta = typeof (j.resposta || f.resposta) === "string" ? (j.resposta || f.resposta).trim() : "";
    return Object.keys(o).length > 2 ? o : null;
  }
  function extrairJSON(t) { t = String(t || "").replace(/```json|```/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b < a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  async function pedirIA(msg) {
    var s = await sessao(); if (!s) return {motivo: "entre na sua conta para o agente escrever o prompt em inglês"};
    var f = AG.ficha, atual = CAMPOS.filter(function (k) { return f[k]; }).map(function (k) { return k + ": " + f[k]; }).join("\n");
    try {
      var r = await fetch(FN_IA, {method: "POST", headers: {"Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB},
        body: JSON.stringify({sistema: 'Você é o agente de criação de personagens de um app de vídeos. A pessoa descreve em português, do jeito dela, e você devolve a FICHA do personagem atualizada. Responda SÓ com JSON neste formato exato: {"tipo":"ficha","nome":"","papel":"papel na história, em português","aparencia":"idade aparente, cabelo, rosto, corpo — em português","roupa":"roupa e acessórios — em português","personalidade":"jeito e expressão — em português","estilo":"estilo do desenho — em português","prompt":"prompt em INGLÊS para IA de imagem: full body character, front view, plain light background, com a aparência, a roupa e o estilo, sem texto na imagem","resposta":"uma frase curta em português dizendo o que você montou ou mudou","pergunta":"UMA pergunta curta para deixar o personagem melhor, ou vazio se já está completo"}. Exemplo de resposta: {"tipo":"ficha","nome":"Bia","papel":"fotógrafa de casamentos","aparencia":"mulher de 30 anos, cabelo cacheado castanho, sorriso largo","roupa":"jaqueta jeans, calça preta, câmera no pescoço","personalidade":"simpática e animada","estilo":"3D de animação","prompt":"full body 3D animated character, front view, a 30-year-old woman with curly brown hair and a wide smile, denim jacket, black pants, camera around her neck, friendly expression, plain light background, no text","resposta":"Montei a Bia, fotógrafa simpática de jaqueta jeans.","pergunta":"Quer que ela use óculos?"}. Regras: mantenha o que já está na ficha e mude só o que a pessoa pedir; não invente marcas, pessoas reais nem personagens de filmes, desenhos ou jogos; se a pessoa não disse um detalhe, proponha um que combine.',
          pedido: (atual ? "Ficha atual:\n" + atual + "\n\n" : "Ainda não há ficha.\n\n") + "Conversa:\n" + AG.hist.slice(-6).map(function (h) { return (h.q === "a" ? "Agente: " : "Pessoa: ") + h.t; }).join("\n") + "\nPessoa: " + msg, max: 700})});
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) return {motivo: r.status === 401 ? "entre de novo na sua conta" : r.status === 429 ? "o limite de hoje da IA acabou" : r.status >= 500 ? "a IA Brightway está fora do ar agora" : "a IA não respondeu"};
      var o = achatar(extrairJSON(j.texto)); return o ? {ficha: o} : {motivo: "a IA respondeu fora do formato"};
    } catch (e) { return {motivo: "sem internet"}; }
  }
  async function enviar() {
    var t = $("agTexto").value.trim(); if (!t || AG.ocupado) return; pararMic();
    if (!$("agFicha").hidden) lerFicha();
    $("agTexto").value = ""; aviso($("agAviso"), ""); AG.ocupado = true; $("agEnviar").disabled = true; $("agEnviar").textContent = "…";
    var antes = AG.hist.length; fala("u", t);
    var hist0 = AG.hist; AG.hist = hist0.slice(0, antes); var r = await pedirIA(t); AG.hist = hist0;
    AG.ocupado = false; $("agEnviar").disabled = false; $("agEnviar").textContent = "ENVIAR";
    if ($("folhaAgente").hidden) return;
    if (r.ficha) {
      CAMPOS.forEach(function (k) { if (r.ficha[k]) AG.ficha[k] = r.ficha[k].slice(0, k === "prompt" ? 900 : 300); });
      AG.passo = 99; porFicha(); fala("a", (r.ficha.resposta || "Atualizei a ficha.") + (r.ficha.pergunta ? "\n" + r.ficha.pergunta : "\nSe estiver bom, toque em ✨ CRIAR IMAGEM ou ✓ SALVAR."));
      return;
    }
    /* sem a IA: perguntas guiadas, guardando as respostas da pessoa como ela escreveu */
    if (AG.passo < 0) { AG.ficha.aparencia = AG.ficha.aparencia || t; AG.passo = 0; aviso($("agAviso"), "Estou sem a IA agora (" + r.motivo + "). Vou montar a ficha com as suas respostas, em português.", true); }
    else if (AG.passo < PERGUNTAS.length) { AG.ficha[PERGUNTAS[AG.passo][0]] = t; AG.passo++; }
    else AG.ficha.personalidade = AG.ficha.personalidade ? AG.ficha.personalidade + "; " + t : t;
    while (AG.passo < PERGUNTAS.length && AG.ficha[PERGUNTAS[AG.passo][0]]) AG.passo++;
    AG.ficha.prompt = promptLocal(AG.ficha); porFicha();
    fala("a", AG.passo < PERGUNTAS.length ? PERGUNTAS[AG.passo][1] : "Ficha pronta. Confira os campos e toque em ✓ SALVAR — ou copie o prompt para usar na sua IA de imagem.");
  }
  /* voz: reconhecimento do navegador; sem ele (ou no app instalado do iPhone), escreve */
  function pararMic() { try { if (AG && AG.rec) AG.rec.stop(); } catch (e) {} }
  function mic() {
    if (AG.rec) { pararMic(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, campo = $("agTexto"), base = campo.value.trim();
    if (!SR || navigator.standalone) { aviso($("agAviso"), "Este navegador não ouve por aqui. Use o microfone do teclado do celular ou escreva.", true); return; }
    var r = new SR(), final = ""; r.lang = "pt-BR"; r.interimResults = true; r.continuous = true;
    r.onresult = function (ev) { var p = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { var x = ev.results[i][0].transcript; if (ev.results[i].isFinal) final += x + " "; else p += x; } campo.value = ((base ? base + " " : "") + final + p).replace(/\s+/g, " ").trim(); };
    r.onerror = function (ev) { if (ev.error === "not-allowed" || ev.error === "service-not-allowed") aviso($("agAviso"), "O microfone está bloqueado neste navegador. Libere o microfone ou escreva.", true); };
    r.onend = function () { AG.rec = null; $("agMic").classList.remove("on"); $("agMic").setAttribute("aria-pressed", "false"); };
    try { r.start(); AG.rec = r; $("agMic").classList.add("on"); $("agMic").setAttribute("aria-pressed", "true"); } catch (e) { AG.rec = null; }
  }
  async function criarImagem() {
    var f = lerFicha(); if (!f.prompt && !f.aparencia) { aviso($("agAviso"), "Descreva o personagem primeiro.", true); return; }
    if (!window.BWFotosNuvem) { aviso($("agAviso"), "Recarregue a página para usar a IA criativa.", true); return; }
    if (!confirm("Criar a imagem deste personagem com a IA criativa?\n\nVai só o texto da ficha (nenhuma foto sua). Usa 1 das 15 imagens de IA do dia.")) return;
    var bt = $("fxImagem"); bt.disabled = true; bt.textContent = "Criando…"; aviso($("agAviso"), "");
    var r = await BWFotosNuvem.arte(null, (f.prompt || promptLocal(f)) + ". Single character, full body, centered, plain light background, no text, no watermark", 576, 1024, "", Math.floor(Math.random() * 1e6));
    bt.disabled = false; bt.textContent = "✨ CRIAR IMAGEM";
    if (r.erro) { aviso($("agAviso"), BWFotosNuvem.msg(r.erro) + " Você pode copiar o prompt, gerar em outra IA e enviar a imagem aqui.", true); return; }
    AG.blob = r.blob;
    try { var c = A.canvasDe(await A.imagemDe(r.blob), 1400), rec = A.recortarLiso(c); if (rec) AG.blob = await A.pngDe(rec); } catch (e) {}   /* fundo liso sai sozinho → pronto para animar no Reels */
    mostrarImgAg(); aviso($("agAviso"), "Imagem criada. Gostou? Toque em ✓ SALVAR. Se não, mude a ficha e crie de novo.");
  }
  async function salvar() {
    var f = lerFicha(); if (!f.nome) { aviso($("agAviso"), "Dê um nome ao personagem.", true); $("fxNome").focus(); return; }
    var antigo = AG.id ? await L.obter(AG.id) : null;
    var rec = Object.assign({}, antigo || {}, {id: AG.id || undefined, nome: f.nome, ficha: {papel: f.papel, aparencia: f.aparencia, roupa: f.roupa, personalidade: f.personalidade, estilo: f.estilo, prompt: f.prompt}});
    if (AG.blob) { rec.blob = AG.blob; rec.tipo = "foto"; if (rec.planos && AG.blob !== (antigo || {}).blob) rec.planos.frente = AG.blob; } else if (!rec.tipo) rec.tipo = "ficha";
    rec = await L.salvar(rec); AG.id = rec.id; fecharAgente(); await carregar(); abrirPers(rec.id, "✓ Salvo. Ele já aparece no Quadro de História" + (rec.blob ? " e no BW Reels." : " (para o BW Reels, falta a imagem)."));
  }

  /* ---------- ficha salva ---------- */
  async function abrirPers(id, msg) {
    var r = await L.obter(id); if (!r) return; PS = r; var f = r.ficha || {}, c = corDe(r), u = urlDe(r);
    $("psTitulo").textContent = (r.nome || "PERSONAGEM").toUpperCase(); $("psImg").style.setProperty("--c1", c[0]); $("psImg").style.setProperty("--c2", c[1]);
    $("psImg").innerHTML = u ? '<img alt="' + esc(r.nome || "Personagem") + '" src="' + u + '">' : '<div style="padding:44px 10px;font:800 15px Inter,sans-serif;letter-spacing:.08em">' + (r.tipo === "montado" ? "BONECO MONTADO NO BW REELS" : "AINDA SEM IMAGEM") + '</div>';
    var linha = function (t, v) { return v ? '<p style="margin:0 0 6px"><b style="color:#B9C0CC;font-size:11px;letter-spacing:.1em">' + t + '</b><br>' + esc(v) + '</p>' : ""; };
    $("psCorpo").innerHTML = '<div class="pg-ficha" style="margin-top:0"><h4 data-seta="pers-ficha" data-seta-padrao="fechada">FICHA E PROMPT MESTRE</h4><div>' + (linha("PAPEL", f.papel) + linha("APARÊNCIA", f.aparencia) + linha("ROUPA", f.roupa) + linha("JEITO DE SER", f.personalidade) + linha("ESTILO", f.estilo) + linha("PROMPT MESTRE", f.prompt) || '<p class="pg-nota" style="margin:0">Ainda sem ficha: toque em MUDAR COM O AGENTE.</p>') + '</div></div>' +
      '<div class="pg-ficha"><h4 data-seta="pers-usar">USAR ESTE PERSONAGEM</h4><div class="pg-linha"><a class="pg-bt amb" href="reels.html?quadro=1&pers=' + encodeURIComponent(r.id) + '">🧩 NO QUADRO DE HISTÓRIA</a>' +
      '<a class="pg-bt" href="reels.html?personagens=1">🎬 NO BW REELS</a></div><p class="pg-nota">No Quadro ele entra como o PERSONAGEM da história (nome, descrição e imagem). No BW Reels ele aparece em 👤 PERSONAGENS e na aba CENA' + (r.blob || r.tipo === "montado" ? "." : " depois que tiver imagem.") + '</p></div>' +
      (r.tipo !== "montado" ? htmlPlanos(r) + htmlVariacoes(r) : "") +
      '<div class="pg-linha">' + (r.tipo !== "montado" ? '<button class="pg-bt" type="button" data-ps="editar">✨ MUDAR COM O AGENTE</button>' : "") +
      (f.prompt ? '<button class="pg-bt" type="button" data-ps="copiar">⧉ COPIAR PROMPT</button>' : "") + (r.blob ? '<button class="pg-bt" type="button" data-ps="baixar">⬇ BAIXAR PNG</button>' : "") + '<button class="pg-bt perigo" type="button" data-ps="excluir">🗑 EXCLUIR</button></div>';
    aviso($("psAviso"), msg || ""); $("folhaPers").hidden = false; travar(true);
  }
  /* FOTOS DE REFERÊNCIA em vários planos + VARIAÇÕES de roupa e acessórios (18/11) */
  var UP = {}; function urlBlob(k, b) { if (!UP[k] || UP[k].b !== b) { if (UP[k]) URL.revokeObjectURL(UP[k].u); UP[k] = {b: b, u: URL.createObjectURL(b)}; } return UP[k].u; }
  function planosDe(r) { var pl = Object.assign({}, r.planos || {}); if (r.blob && !Object.keys(pl).length) pl.frente = r.blob; return pl; }
  function htmlPlanos(r) { var pl = planosDe(r), n = Object.keys(pl).length;
    return '<div class="pg-ficha"><h4 data-seta="pers-planos">FOTOS DE REFERÊNCIA · ' + n + ' DE ' + L.PLANOS.length + ' PLANOS</h4><div class="pg-planos">' + L.PLANOS.map(function (p) { var b = pl[p[0]];
      return '<div class="pg-plano' + (b ? " tem" : "") + '"><button type="button" class="pg-plano-b" data-plano="' + p[0] + '" aria-label="' + (b ? "Trocar" : "Enviar") + ' a foto do plano ' + p[1] + '">' + (b ? '<img alt="" src="' + urlBlob(r.id + p[0], b) + '">' : '<i aria-hidden="true">＋</i>') + '<b>' + p[1] + '</b><small>' + p[2] + '</small></button>' + (b ? '<button type="button" class="pg-plano-x" data-plano-x="' + p[0] + '" aria-label="Tirar a foto do plano ' + p[1] + '">✕</button>' : "") + '</div>'; }).join("") +
      '</div><div class="pg-linha"><button class="pg-bt" type="button" data-ps="varias">＋ ENVIAR VÁRIAS DE UMA VEZ</button>' + (n > 1 ? '<button class="pg-bt" type="button" data-ps="folha">⬇ FOLHA DE REFERÊNCIA (PNG)</button>' : "") + '</div><p class="pg-nota">Quanto mais planos, melhor a IA repete o personagem. Nas cenas do Quadro o app usa sozinho o plano parecido (rosto para close, costas para "de costas"…). A FOLHA junta tudo numa imagem só para você mandar ao Flux, Higgsfield ou Gemini.</p></div>'; }
  function htmlVariacoes(r) { var vs = r.variacoes || [];
    return '<div class="pg-ficha"><h4 data-seta="pers-variacoes" data-seta-padrao="fechada">VARIAÇÕES · ROUPAS E ACESSÓRIOS' + (vs.length ? " (" + vs.length + ")" : "") + '</h4>' + (vs.length ? vs.map(function (v) { return '<div class="pg-var">' + (v.blob ? '<img alt="" src="' + urlBlob(r.id + v.id, v.blob) + '">' : '<i aria-hidden="true">👕</i>') + '<span><b>' + esc(v.nome) + '</b><small>' + esc(v.descricao) + '</small></span><button type="button" class="pg-bt" data-var-img="' + esc(v.id) + '" aria-label="Enviar imagem da variação ' + esc(v.nome) + '">' + (v.blob ? "TROCAR" : "＋ FOTO") + '</button><button type="button" class="pg-bt perigo" data-var-x="' + esc(v.id) + '" aria-label="Excluir a variação ' + esc(v.nome) + '">✕</button></div>'; }).join("") : '<p class="pg-nota" style="margin:0 0 8px">O mesmo personagem com outra roupa: uniforme de evento, terno, casual…</p>') +
      '<label class="pg-campo"><span>Nome da variação</span><input id="vrNome" maxlength="30" placeholder="ex.: Terno de gala"></label><label class="pg-campo"><span>Roupa e acessórios</span><textarea id="vrDesc" rows="2" maxlength="200" placeholder="ex.: terno preto, gravata borboleta, relógio dourado"></textarea></label><div class="pg-linha"><button class="pg-bt amb" type="button" data-ps="novaVar">＋ GUARDAR VARIAÇÃO</button></div><p class="pg-nota">No Quadro de História você escolhe com qual roupa ele entra em cada história.</p></div>'; }
  async function imagemLimpa(arq) { var c = A.canvasDe(await A.imagemDe(new Blob([await arq.arrayBuffer()], {type: arq.type})), 1400); return A.pngDe(A.jaRecortado(c) ? A.aparar(c) : (A.recortarLiso(c) || c)); }
  async function gravarPlanos(r, novos) { r.planos = Object.assign(planosDe(r), novos); Object.keys(r.planos).forEach(function (k) { if (!r.planos[k]) delete r.planos[k]; }); r.blob = L.principal(r) || null; r.tipo = r.blob ? "foto" : "ficha"; await L.salvar(r); await carregar(); }
  async function folhaReferencia(r) {   /* todos os planos numa imagem só, com o nome de cada um */
    var pl = planosDe(r), ks = L.PLANOS.filter(function (p) { return pl[p[0]]; }), cel = 512, cols = Math.min(3, ks.length), lin = Math.ceil(ks.length / cols), c = document.createElement("canvas"); c.width = cols * cel; c.height = lin * (cel + 44) + 56; var x = c.getContext("2d");
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#111"; x.font = "800 28px Inter, Arial, sans-serif"; x.textBaseline = "middle"; x.fillText((r.nome || "Personagem") + " — character reference sheet", 16, 28);
    for (var i = 0; i < ks.length; i++) { var im = await A.imagemDe(pl[ks[i][0]]), ox = (i % cols) * cel, oy = 56 + Math.floor(i / cols) * (cel + 44), s = Math.min(cel / im.naturalWidth, cel / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      x.drawImage(im, ox + (cel - w) / 2, oy + (cel - h) / 2, w, h); x.fillStyle = "#111"; x.font = "700 20px Inter, Arial, sans-serif"; x.textAlign = "center"; x.fillText(ks[i][1], ox + cel / 2, oy + cel + 22); x.textAlign = "left"; }
    return A.pngDe(c);
  }
  function fecharPers() { $("folhaPers").hidden = true; PS = null; travar(!$("folhaAgente").hidden); }
  async function copiar(t, el) { try { await navigator.clipboard.writeText(t); aviso(el, "Copiado. Cole na IA de imagem que preferir."); } catch (e) { aviso(el, "Não consegui copiar sozinho: selecione o texto do prompt e copie.", true); } }

  /* ---------- ligações ---------- */
  $("pgNovo").onclick = function () { abrirAgente(null); };
  $("pgEnviar").onclick = function () { var i = $("pgArq"); i.dataset.para = ""; i.dataset.modo = "varias"; i.multiple = true; i.click(); };
  /* várias fotos de uma vez: 1ª = FRENTE, depois os planos que faltam, na ordem; um plano escolhido recebe só aquela foto */
  $("pgArq").onchange = async function () {
    var fs = [].slice.call(this.files || []), modo = this.dataset.modo || "varias", alvo = this.dataset.para ? await L.obter(this.dataset.para) : null; this.value = ""; this.dataset.modo = ""; if (!fs.length) return;
    try {
      if (modo.indexOf("var:") === 0 && alvo) { var v = L.variacao(alvo, modo.slice(4)); if (v) { v.blob = await imagemLimpa(fs[0]); await L.salvar(alvo); await carregar(); abrirPers(alvo.id, "✓ Foto da variação guardada."); } return; }
      var r = alvo || {nome: fs[0].name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 30) || "Meu personagem", ficha: {}}, novos = {}, ja = planosDe(r);
      if (modo.indexOf("plano:") === 0) novos[modo.slice(6)] = await imagemLimpa(fs[0]);
      else { var livres = L.PLANOS.map(function (p) { return p[0]; }).filter(function (k) { return !ja[k]; }); for (var i = 0; i < fs.length && i < livres.length; i++) novos[livres[i]] = await imagemLimpa(fs[i]); }
      var n = Object.keys(novos).length; if (!n) { abrirPers(r.id, "Os 6 planos já têm foto. Toque num plano para trocar a dele."); return; }
      await gravarPlanos(r, novos); abrirPers(r.id, "✓ " + n + " foto(s) guardada(s)" + (fs.length > n && modo === "varias" ? " (as outras não couberam: são 6 planos)" : "") + ". Confira se cada uma está no plano certo — toque no plano para trocar.");
    } catch (e) { alert("Não deu para abrir essa imagem. Tente PNG ou JPG."); }
  };
  $("pgGrade").addEventListener("click", function (e) { var b = e.target.closest("[data-id]"); if (b) abrirPers(b.dataset.id); });
  $("pgGrade").addEventListener("keydown", function (e) { var b = e.target.closest("[data-id]"); if (b && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); abrirPers(b.dataset.id); } });
  $("agFechar").onclick = fecharAgente; $("agEnviar").onclick = enviar; $("agMic").onclick = mic;
  $("agTexto").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  $("fxCopiar").onclick = function () { var f = lerFicha(); copiar(f.prompt || promptLocal(f), $("agAviso")); };
  $("fxImagem").onclick = criarImagem; $("fxSalvar").onclick = salvar;
  $("psFechar").onclick = fecharPers;
  $("psCorpo").addEventListener("click", async function (e) {
    var q = e.target.closest("[data-plano],[data-plano-x],[data-var-img],[data-var-x]");
    if (q && PS) { var rr = PS, inp = $("pgArq"); inp.multiple = false;
      if (q.dataset.plano) { inp.dataset.para = rr.id; inp.dataset.modo = "plano:" + q.dataset.plano; inp.click(); }
      else if (q.dataset.planoX) { var z = {}; z[q.dataset.planoX] = null; await gravarPlanos(rr, z); abrirPers(rr.id); }
      else if (q.dataset.varImg) { inp.dataset.para = rr.id; inp.dataset.modo = "var:" + q.dataset.varImg; inp.click(); }
      else if (confirm("Excluir esta variação de roupa?")) { rr.variacoes = (rr.variacoes || []).filter(function (v) { return v.id !== q.dataset.varX; }); await L.salvar(rr); await carregar(); abrirPers(rr.id); }
      return; }
    var b = e.target.closest("[data-ps]"); if (!b || !PS) return; var k = b.dataset.ps, r = PS;
    if (k === "varias") { $("pgArq").dataset.para = r.id; $("pgArq").dataset.modo = "varias"; $("pgArq").multiple = true; $("pgArq").click(); return; }
    if (k === "folha") { var bf = await folhaReferencia(r), af = document.createElement("a"); window.__persFolha = bf; af.href = URL.createObjectURL(bf); af.download = (r.nome || "personagem").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + "-referencia.png"; document.body.appendChild(af); af.click(); af.remove(); aviso($("psAviso"), "Folha de referência baixada. Envie essa imagem junto com o prompt na IA que você usa."); return; }
    if (k === "novaVar") { var nm = $("vrNome").value.trim(), ds = $("vrDesc").value.trim(); if (!nm || !ds) { aviso($("psAviso"), "Dê um nome e descreva a roupa e os acessórios da variação.", true); return; }
      r.variacoes = (r.variacoes || []).concat([{id: "v" + Date.now().toString(36), nome: nm, descricao: ds}]); try { var ud = JSON.parse(localStorage.getItem("ui_dobras") || "{}"); ud["pers-variacoes"] = 1; localStorage.setItem("ui_dobras", JSON.stringify(ud)); } catch (e0) {} await L.salvar(r); await carregar(); abrirPers(r.id, "✓ Variação guardada. Se tiver uma foto dele com essa roupa, toque em ＋ FOTO."); return; }
    if (k === "editar") { fecharPers(); abrirAgente(Object.assign({nome: r.nome || ""}, r.ficha || {}), r); }
    else if (k === "copiar") copiar((r.ficha || {}).prompt || "", $("psAviso"));
    else if (k === "baixar") { var a = document.createElement("a"); a.href = urlDe(r); a.download = (r.nome || "personagem").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + ".png"; document.body.appendChild(a); a.click(); a.remove(); }
    else if (k === "excluir") { if (!confirm("Excluir " + (r.nome || "este personagem") + " da biblioteca? Os vídeos que já usam continuam com ele.")) return; await L.excluir(r.id); fecharPers(); carregar(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key !== "Escape") return; if (!$("folhaAgente").hidden) fecharAgente(); else if (!$("folhaPers").hidden) fecharPers(); });
  var v = $("btnVoltar"); if (v) v.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var s = await sessao(), u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  carregar();
  window.__pers = {prontos: function () { return PP; }, usarPronto: usarPronto, folha: folhaReferencia, lib: function () { return LIB; }, carregar: carregar, abrirAgente: abrirAgente, ag: function () { return AG; }, achatar: achatar, promptLocal: promptLocal};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
