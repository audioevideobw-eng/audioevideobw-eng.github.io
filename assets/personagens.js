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
  async function carregar() { LIB = await L.listar(); desenhar(); }
  function desenhar() {
    $("pgGrade").innerHTML = LIB.length ? LIB.map(function (r) { var c = corDe(r), f = r.ficha || {}, u = urlDe(r);
      return '<button type="button" class="pg-card" data-id="' + esc(r.id) + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '" aria-label="Abrir ' + esc(r.nome || "personagem") + '">' +
        (u ? '<img alt="" src="' + u + '">' : '<span class="ini" aria-hidden="true">' + esc(String(r.nome || "?").trim().charAt(0).toUpperCase()) + '</span>') +
        '<b>' + esc(r.nome || "Sem nome") + '</b>' + (f.papel ? '<small>' + esc(f.papel) + '</small>' : "") +
        '<span class="tag">' + (r.tipo === "montado" ? "MONTADO NO REELS" : r.blob ? "COM IMAGEM" : "SÓ A FICHA") + '</span></button>'; }).join("")
      : '<div class="pg-vazio">Ainda não há personagens aqui.<br>Toque em <b>✨ CRIAR COM O AGENTE</b> e descreva quem você imagina — ou envie a imagem de um que você já tem.</div>';
  }

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
    if (AG.blob) { rec.blob = AG.blob; rec.tipo = "foto"; } else if (!rec.tipo) rec.tipo = "ficha";
    rec = await L.salvar(rec); AG.id = rec.id; fecharAgente(); await carregar(); abrirPers(rec.id, "✓ Salvo. Ele já aparece no Quadro de História" + (rec.blob ? " e no BW Reels." : " (para o BW Reels, falta a imagem)."));
  }

  /* ---------- ficha salva ---------- */
  async function abrirPers(id, msg) {
    var r = await L.obter(id); if (!r) return; PS = r; var f = r.ficha || {}, c = corDe(r), u = urlDe(r);
    $("psTitulo").textContent = (r.nome || "PERSONAGEM").toUpperCase(); $("psImg").style.setProperty("--c1", c[0]); $("psImg").style.setProperty("--c2", c[1]);
    $("psImg").innerHTML = u ? '<img alt="' + esc(r.nome || "Personagem") + '" src="' + u + '">' : '<div style="padding:44px 10px;font:800 15px Inter,sans-serif;letter-spacing:.08em">' + (r.tipo === "montado" ? "BONECO MONTADO NO BW REELS" : "AINDA SEM IMAGEM") + '</div>';
    var linha = function (t, v) { return v ? '<p style="margin:0 0 6px"><b style="color:#B9C0CC;font-size:11px;letter-spacing:.1em">' + t + '</b><br>' + esc(v) + '</p>' : ""; };
    $("psCorpo").innerHTML = linha("PAPEL", f.papel) + linha("APARÊNCIA", f.aparencia) + linha("ROUPA", f.roupa) + linha("JEITO DE SER", f.personalidade) + linha("ESTILO", f.estilo) + linha("PROMPT MESTRE", f.prompt) +
      '<div class="pg-ficha"><h4>USAR ESTE PERSONAGEM</h4><div class="pg-linha"><a class="pg-bt amb" href="reels.html?quadro=1&pers=' + encodeURIComponent(r.id) + '">🧩 NO QUADRO DE HISTÓRIA</a>' +
      '<a class="pg-bt" href="reels.html?personagens=1">🎬 NO BW REELS</a></div><p class="pg-nota">No Quadro ele entra como o PERSONAGEM da história (nome, descrição e imagem). No BW Reels ele aparece em 👤 PERSONAGENS e na aba CENA' + (r.blob || r.tipo === "montado" ? "." : " depois que tiver imagem.") + '</p></div>' +
      '<div class="pg-linha">' + (r.tipo !== "montado" ? '<button class="pg-bt" type="button" data-ps="editar">✨ MUDAR COM O AGENTE</button><button class="pg-bt" type="button" data-ps="img">＋ ' + (r.blob ? "TROCAR" : "ENVIAR") + ' IMAGEM</button>' : "") +
      (f.prompt ? '<button class="pg-bt" type="button" data-ps="copiar">⧉ COPIAR PROMPT</button>' : "") + (r.blob ? '<button class="pg-bt" type="button" data-ps="baixar">⬇ BAIXAR PNG</button>' : "") + '<button class="pg-bt perigo" type="button" data-ps="excluir">🗑 EXCLUIR</button></div>';
    aviso($("psAviso"), msg || ""); $("folhaPers").hidden = false; travar(true);
  }
  function fecharPers() { $("folhaPers").hidden = true; PS = null; travar(!$("folhaAgente").hidden); }
  async function copiar(t, el) { try { await navigator.clipboard.writeText(t); aviso(el, "Copiado. Cole na IA de imagem que preferir."); } catch (e) { aviso(el, "Não consegui copiar sozinho: selecione o texto do prompt e copie.", true); } }
  async function receberImagem(arq, rec) {
    try { var c = A.canvasDe(await A.imagemDe(new Blob([await arq.arrayBuffer()], {type: arq.type})), 1400);   /* cópia na memória na hora (regra 47) */
      var cut = A.jaRecortado(c) ? A.aparar(c) : (A.recortarLiso(c) || c), blob = await A.pngDe(cut);
      rec = rec || {nome: arq.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 30) || "Meu personagem", ficha: {}};
      rec.blob = blob; rec.tipo = "foto"; rec = await L.salvar(rec); await carregar(); abrirPers(rec.id, "✓ Imagem guardada. Toque em MUDAR COM O AGENTE para completar a ficha.");
    } catch (e) { alert("Não deu para abrir essa imagem. Tente PNG ou JPG."); }
  }

  /* ---------- ligações ---------- */
  $("pgNovo").onclick = function () { abrirAgente(null); };
  $("pgEnviar").onclick = function () { $("pgArq").dataset.para = ""; $("pgArq").click(); };
  $("pgArq").onchange = async function () { var f = this.files && this.files[0]; this.value = ""; if (!f) return; var alvo = this.dataset.para ? await L.obter(this.dataset.para) : null; receberImagem(f, alvo); };
  $("pgGrade").addEventListener("click", function (e) { var b = e.target.closest("[data-id]"); if (b) abrirPers(b.dataset.id); });
  $("agFechar").onclick = fecharAgente; $("agEnviar").onclick = enviar; $("agMic").onclick = mic;
  $("agTexto").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } });
  $("fxCopiar").onclick = function () { var f = lerFicha(); copiar(f.prompt || promptLocal(f), $("agAviso")); };
  $("fxImagem").onclick = criarImagem; $("fxSalvar").onclick = salvar;
  $("psFechar").onclick = fecharPers;
  $("psCorpo").addEventListener("click", async function (e) {
    var b = e.target.closest("[data-ps]"); if (!b || !PS) return; var k = b.dataset.ps, r = PS;
    if (k === "editar") { fecharPers(); abrirAgente(Object.assign({nome: r.nome || ""}, r.ficha || {}), r); }
    else if (k === "img") { $("pgArq").dataset.para = r.id; $("pgArq").click(); }
    else if (k === "copiar") copiar((r.ficha || {}).prompt || "", $("psAviso"));
    else if (k === "baixar") { var a = document.createElement("a"); a.href = urlDe(r); a.download = (r.nome || "personagem").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") + ".png"; document.body.appendChild(a); a.click(); a.remove(); }
    else if (k === "excluir") { if (!confirm("Excluir " + (r.nome || "este personagem") + " da biblioteca? Os vídeos que já usam continuam com ele.")) return; await L.excluir(r.id); fecharPers(); carregar(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key !== "Escape") return; if (!$("folhaAgente").hidden) fecharAgente(); else if (!$("folhaPers").hidden) fecharPers(); });
  var v = $("btnVoltar"); if (v) v.onclick = function () { if (history.length > 1) history.back(); else location.href = "marketing.html"; };
  (async function () { var el = $("userBox"); if (!el) return; var s = await sessao(), u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  carregar();
  window.__pers = {lib: function () { return LIB; }, carregar: carregar, abrirAgente: abrirAgente, ag: function () { return AG; }, achatar: achatar, promptLocal: promptLocal};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
