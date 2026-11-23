/* TESTES E SOLUÇÕES (22/11/2026, Claude — dono: "vamos fazer um sistema de testes e soluções"; os testes daqui rodam num Chrome de
   Linux e não enxergam o iPhone de verdade). Roda NO APARELHO da pessoa:
     1. o aparelho: navegador, app instalado, memória, espaço, gravação de vídeo/som (WebCodecs, MediaRecorder), HEVC, WebGL, voz…;
     2. as ferramentas: cada página abre num iframe escondido (mesma origem), do tamanho desta tela — erros de JS chegam pelo gancho
        do modos.js (window.parent.__bwDiag), e lá dentro se mede: página vazia, estouro para o lado, conteúdo fora da tela sem rolagem,
        rolagem dentro de rolagem com 'contain' (a armadilha de 22/11), layout de app que não montou;
     3. testes com a pessoa (dedo rola? segurar funciona? ouviu o bip/voz? topo embaçado?).
   Cada problema traz a SOLUÇÃO (tabela SOL) e, quando dá, um botão que resolve (atualizar o app). Nada é apagado: só os caches de
   ARQUIVOS do site no botão de atualizar — os dados da pessoa (localStorage/IndexedDB) ficam. O relatório só sai se ela tocar em enviar. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var VERSAO = "testes v1";
  var FERR = [["index.html", "Início"], ["negocio.html", "Minha empresa"], ["casa.html", "Minha casa"], ["lancamentos.html", "Lançamentos"],
    ["video.html", "Editor de vídeo"], ["motion.html", "Estúdio de motion"], ["telas.html", "Telas em movimento"], ["fotos.html", "Editor de fotos"],
    ["criador.html", "Criador IA"], ["reels.html", "BW Reels Pro"], ["album3d.html", "Álbum 3D"], ["3d.html", "Estúdio 3D"],
    ["personagens.html", "Personagens"], ["promptia.html", "Prompt IA"], ["propostas.html", "Orçamentos"], ["eventos.html", "Eventos"],
    ["financeiro-painel.html", "Painel financeiro"], ["leitor.html", "Leitor de contas"]];
  var R = [], RESP = {}, rodando = false;
  var UA = navigator.userAgent, IOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && navigator.maxTouchPoints > 1),
    ANDROID = /Android/i.test(UA), APP = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true,
    DENTRO = /Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|Twitter/i.test(UA);

  /* SOLUÇÕES conhecidas — cada uma é um bug que já aconteceu (AGENTS.md, PENTE FINO). */
  var SOL = {
    dentro: "Você abriu pelo navegador de dentro de outro app (Instagram, WhatsApp…). Ele tem pouca memória e corta vídeo e som. Toque em ⋯ e escolha ABRIR NO NAVEGADOR (Safari no iPhone, Chrome no Android).",
    versao: "Este aparelho está com uma versão antiga guardada. Toque em ↻ ATUALIZAR AGORA (os seus dados ficam).",
    h264: "Este navegador não grava vídeo MP4 no aparelho. Use o Chrome/Edge atualizado (Android/PC) ou o Safari do iOS 16.4+; ou gere o vídeo pelo app BW no computador.",
    h264_4k: "O aparelho não grava em 4K — escolha ALTA (1080p) ao gerar o vídeo.",
    aac: "Sem AAC: o vídeo sai com som Opus, que o Instagram às vezes recusa. No iPhone o som vai pelo gravador do sistema; se o vídeo sair mudo, gere pelo app BW no PC.",
    hevc: "Vídeos HEVC (H.265, padrão do iPhone em 'Alta eficiência') não abrem neste navegador. No iPhone: Ajustes → Câmera → Formatos → MAIS COMPATÍVEL. Ou faça o PROXY no editor de vídeo.",
    memoria: "Pouca memória: abra uma ferramenta pesada por vez, feche as outras abas e, nos vídeos, use ⚡ FAZER PROXY.",
    espaco: "Pouco espaço para guardar mídias neste navegador. Em Editor de vídeo → 🧹 LIMPAR CACHE; apague fotos/vídeos antigos do aparelho.",
    persistente: "O navegador pode apagar as mídias guardadas quando falta espaço. Instale a plataforma como app (APP DOWNLOAD) para guardar com mais segurança.",
    idb: "O navegador recusou guardar arquivos (modo anônimo/privado?). Saia da janela anônima.",
    webgl: "Sem aceleração de vídeo: chroma e cor usam o plano B (mais lento). Atualize o navegador ou ligue 'usar aceleração de hardware' nas configurações dele.",
    voz: "O navegador não fala. No iPhone desligue o MODO SILENCIOSO (a chave do lado) e suba o volume de mídia.",
    ouvir: "Reconhecimento de voz indisponível aqui: o Tio Cláudio grava e transcreve pela IA (precisa de conta).",
    statusbar: "O topo da página está por baixo da barra do iPhone (fica embaçado). FECHE o app e abra de novo — ou tire o ícone da tela de início e ponha de novo.",
    erro: "A ferramenta deu erro ao abrir. Toque em ↻ ATUALIZAR AGORA; se continuar, envie o relatório (ele leva o erro exato).",
    vazia: "A página abriu vazia. Toque em ↻ ATUALIZAR AGORA e confira a internet.",
    estouro: "Algo passa da largura da tela (a página anda para o lado). Envie o relatório para a equipe corrigir.",
    fora: "Tem conteúdo abaixo da tela que não dá para alcançar rolando. Envie o relatório para a equipe corrigir.",
    presa: "Uma lista que rola dentro de outra prende o dedo (a tela parece travada). Envie o relatório para a equipe corrigir.",
    appnao: "O layout de app não montou (a tela ficou escondida). Toque em ↻ ATUALIZAR AGORA; se continuar, envie o relatório.",
    lento: "A ferramenta demorou para abrir. Internet lenta ou aparelho sobrecarregado: feche outros apps e tente de novo.",
    rolanao: "O dedo não rolou a lista. Envie o relatório — junto vai o modelo do aparelho.",
    seguranao: "O 'segurar o dedo' não foi reconhecido. Envie o relatório.",
    bipnao: "Sem som: no iPhone, desligue o modo silencioso; confira o volume de MÍDIA (não o de toque) e se há fone conectado.",
    toponao: "Topo embaçado: feche o app e abra de novo. Se continuar, envie o relatório com um print.",
    login: "Você não está logado: as ferramentas abrem, mas nada vai para a conta. Entre para testar a sincronia."
  };

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); }
  function add(grupo, st, nome, det, sol) { R.push({grupo: grupo, st: st, nome: nome, det: det || "", sol: st === "ok" ? "" : (sol || "")}); desenhar(); }
  function agora(t) { $("tsAgora").textContent = t; }
  function barra(f) { $("tsBarra").style.width = Math.round(f * 100) + "%"; }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function prazo(p, ms) { return Promise.race([p, espera(ms).then(function () { return "__prazo"; })]); }

  function desenhar() {
    var n = {ok: 0, av: 0, er: 0}; R.forEach(function (r) { if (n[r.st] != null) n[r.st]++; });
    $("tsNOk").textContent = n.ok; $("tsNAv").textContent = n.av; $("tsNEr").textContent = n.er;
    var ordem = {er: 0, av: 1, in: 2, ok: 3}, grupos = [];
    R.forEach(function (r) { if (grupos.indexOf(r.grupo) < 0) grupos.push(r.grupo); });
    $("tsLista").innerHTML = grupos.map(function (g) {
      return '<div class="ts-grupo">' + esc(g) + '</div>' + R.filter(function (r) { return r.grupo === g; }).sort(function (a, b) { return ordem[a.st] - ordem[b.st]; }).map(function (r) {
        var ic = {ok: "✓", av: "!", er: "✕", in: "i"}[r.st];
        return '<div class="ts-it ' + r.st + '"><span class="st">' + ic + '</span><div><b>' + esc(r.nome) + '</b>' + (r.det ? '<small>' + esc(r.det) + '</small>' : "") +
          (r.sol ? '<div class="ts-sol">' + esc(SOL[r.sol] || r.sol) + (/versao|erro|vazia|appnao/.test(r.sol) ? '<br><button type="button" class="ts-bt pri" data-atualizar>↻ ATUALIZAR AGORA</button>' : "") + '</div>' : "") + '</div></div>';
      }).join("");
    }).join("") || '<p style="margin:0">Toque em ▶ TESTAR TUDO.</p>';
    relatorio();
  }

  /* ===== 1. O APARELHO ===== */
  async function aparelho() {
    var G = "O APARELHO";
    var nav = IOS ? "iPhone/iPad" : ANDROID ? "Android" : /Windows/.test(UA) ? "Windows" : /Mac/.test(UA) ? "Mac" : "Outro";
    var br = /Edg\//.test(UA) ? "Edge" : /CriOS|Chrome\//.test(UA) ? "Chrome" : /FxiOS|Firefox/.test(UA) ? "Firefox" : /Safari/.test(UA) ? "Safari" : "?";
    add(G, "in", nav + " · " + br + (APP ? " · app instalado" : " · navegador"), innerWidth + "×" + innerHeight + " px · tela " + screen.width + "×" + screen.height + " · densidade " + (devicePixelRatio || 1));
    if (DENTRO) add(G, "er", "Aberto dentro de outro app", UA.slice(0, 90), "dentro");
    // versão do site guardada × a do servidor
    try {
      var r = await prazo(fetch("sw.js?x=" + Date.now(), {cache: "no-store"}).then(function (x) { return x.text(); }), 6000);
      var novo = r !== "__prazo" && (r.match(/bw-mesa-v\d+/) || [])[0];
      var tem = window.caches ? (await caches.keys()).filter(function (k) { return /bw-mesa/.test(k); }) : [];
      if (!novo) add(G, "av", "Não deu para conferir a versão (sem internet?)", "");
      else if (tem.length && tem.indexOf(novo) < 0) add(G, "er", "Versão antiga guardada", "no aparelho: " + tem.join(", ") + " · no ar: " + novo, "versao");
      else add(G, "ok", "Versão em dia", novo);
    } catch (e) { add(G, "av", "Não deu para conferir a versão", String(e.message || e)); }
    // conta
    try { var c = window.BWSync && BWSync.cliente(), s = c ? (await prazo(c.auth.getSession(), 4000)) : null; s = s && s.data && s.data.session;
      add(G, s ? "ok" : "av", s ? "Logado" : "Não logado", s ? (s.user.email || "") : "", "login"); } catch (e) { add(G, "av", "Não logado", "", "login"); }
    // memória, núcleos
    var mem = navigator.deviceMemory, nuc = navigator.hardwareConcurrency;
    add(G, mem && mem < 4 ? "av" : "in", "Memória " + (mem ? "~" + mem + " GB" : "(o navegador não informa)") + " · " + (nuc || "?") + " núcleos", IOS ? "o iPhone não informa a memória; páginas pesadas podem fechar sozinhas" : "", "memoria");
    // espaço
    try { if (navigator.storage && navigator.storage.estimate) { var e = await navigator.storage.estimate(), livre = (e.quota - e.usage) / 1e9;
      add(G, livre < 1 ? "av" : "ok", "Espaço para guardar mídias: " + livre.toFixed(1) + " GB livres", "usado " + (e.usage / 1e6).toFixed(0) + " MB", "espaco");
      if (navigator.storage.persisted) { var p = await navigator.storage.persisted(); add(G, p ? "ok" : "av", p ? "Mídias guardadas com proteção" : "Mídias guardadas sem proteção", "", "persistente"); } } } catch (x) {}
    // IndexedDB
    try { await new Promise(function (ok, no) { var q = indexedDB.open("bw_teste_diag", 1); q.onupgradeneeded = function () { q.result.createObjectStore("x"); };
      q.onsuccess = function () { var db = q.result, t = db.transaction("x", "readwrite"); t.objectStore("x").put(new Blob(["ok"]), "k"); t.oncomplete = function () { db.close(); indexedDB.deleteDatabase("bw_teste_diag"); ok(); }; t.onerror = function () { no(t.error); }; }; q.onerror = function () { no(q.error); }; });
      add(G, "ok", "Guardar arquivos no aparelho (IndexedDB)", ""); } catch (e) { add(G, "er", "Não consegue guardar arquivos no aparelho", String(e && e.message || e), "idb"); }
    // topo (barra de status)
    var meta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]'), sat = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ts-sat")) || 0;
    if (IOS && APP) add(G, meta && meta.content === "black" ? "ok" : "er", "Barra do topo do iPhone", "estilo: " + (meta ? meta.content : "?"), "statusbar");
  }

  /* ===== 2. VÍDEO, SOM E GRÁFICOS ===== */
  async function midia() {
    var G = "VÍDEO, SOM E GRÁFICOS";
    async function venc(cfg) { try { return !!(window.VideoEncoder && (await VideoEncoder.isConfigSupported(cfg)).supported); } catch (e) { return false; } }
    async function aenc(cfg) { try { return !!(window.AudioEncoder && (await AudioEncoder.isConfigSupported(cfg)).supported); } catch (e) { return false; } }
    async function vdec(cfg) { try { return !!(window.VideoDecoder && (await VideoDecoder.isConfigSupported(cfg)).supported); } catch (e) { return false; } }
    var h = await venc({codec: "avc1.640028", width: 1920, height: 1080, bitrate: 8e6, framerate: 30});
    add(G, h ? "ok" : "er", "Gerar vídeo MP4 no aparelho (1080p)", window.VideoEncoder ? "" : "sem WebCodecs", "h264");
    if (h) { var k4 = await venc({codec: "avc1.640033", width: 3840, height: 2160, bitrate: 3e7, framerate: 30}); add(G, k4 ? "ok" : "av", "Vídeo em 4K", "", "h264_4k"); }
    var aac = await aenc({codec: "mp4a.40.2", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000}), opus = await aenc({codec: "opus", sampleRate: 48000, numberOfChannels: 2, bitrate: 128000});
    var mr = window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported("audio/mp4");
    add(G, aac ? "ok" : (mr ? "ok" : "av"), "Som do vídeo", aac ? "AAC pelo codificador" : mr ? "AAC pelo gravador do sistema" : opus ? "só Opus" : "sem codificador de som", "aac");
    var vh = document.createElement("video"), hevc = vh.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') || (await vdec({codec: "hvc1.1.6.L93.B0"}) ? "probably" : "");
    add(G, hevc ? "ok" : "av", "Abrir vídeos HEVC (H.265 do iPhone)", hevc ? "abre" : "não abre", "hevc");
    var tipos = ["video/mp4", "video/webm"].filter(function (t) { return window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); });
    add(G, tipos.length ? "ok" : "av", "Exportar vídeo do editor (gravação)", tipos.join(", ") || "MediaRecorder indisponível", "h264");
    try { var cv = document.createElement("canvas"), gl = cv.getContext("webgl2") || cv.getContext("webgl"), ren = "";
      if (gl) { var ext = gl.getExtension("WEBGL_debug_renderer_info"); ren = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : ""; }
      add(G, gl ? "ok" : "av", "Aceleração gráfica (WebGL)", ren || (gl ? "ligada" : "desligada"), "webgl"); } catch (e) { add(G, "av", "Aceleração gráfica (WebGL)", "erro", "webgl"); }
    var vozes = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (window.speechSynthesis && !vozes.length) { await espera(600); vozes = speechSynthesis.getVoices(); }
    var pt = vozes.filter(function (v) { return /^pt/i.test(v.lang); });
    add(G, window.speechSynthesis ? (pt.length ? "ok" : "av") : "av", "Voz do Tio Cláudio", window.speechSynthesis ? pt.length + " voz(es) em português" : "o navegador não fala", "voz");
    add(G, (window.SpeechRecognition || window.webkitSpeechRecognition) ? "ok" : "in", "Ouvir pelo microfone (no aparelho)", (window.SpeechRecognition || window.webkitSpeechRecognition) ? "disponível" : "usa a IA para transcrever", "ouvir");
  }

  /* ===== 3. AS FERRAMENTAS (iframe escondido) ===== */
  var DIAG = [];
  window.__bwDiag = function (e) { DIAG.push(e); };
  var MEDE = "(function(){var d=document,cs=function(e){return getComputedStyle(e)},ih=innerHeight,o={};" +
    "o.txt=(d.body&&d.body.innerText||'').trim().length;o.sw=d.documentElement.scrollWidth-innerWidth;" +
    "o.cedo=d.documentElement.classList.contains('app-cedo');" +
    "o.lado=[];[].forEach.call(d.body.querySelectorAll('*'),function(e){if(!e.getClientRects().length||o.lado.length>30)return;var s=cs(e);if(s.visibility=='hidden'||+s.opacity===0)return;var r=e.getBoundingClientRect();if(r.width<8||r.height<4||r.right<=innerWidth+2)return;" +
    "var a=e.parentElement;while(a&&a!==d.body){if(cs(a).overflowX!='visible')return;a=a.parentElement}o.lado.push({n:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[].slice.call(e.classList,0,2).join('.'),f:Math.round(r.right-innerWidth),e:e})});" +
    "o.lado=o.lado.filter(function(x){return !o.lado.some(function(y){return y!==x&&y.e.contains(x.e)})}).slice(0,3).map(function(x){return x.n+' (+'+x.f+'px)'});" +
    "var rola=function(e,m){var s=cs(e);return (s.overflowY=='auto'||s.overflowY=='scroll')&&e.scrollHeight>e.clientHeight+m&&e.getClientRects().length&&s.visibility!='hidden'};" +
    "var nome=function(e){return e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[].slice.call(e.classList,0,2).join('.')};" +
    "o.presa=[];[].forEach.call(d.querySelectorAll('*'),function(e){if(!rola(e,1)||cs(e).overscrollBehaviorY=='auto')return;var a=e.parentElement;while(a&&a!==d.body){if(rola(a,20)){o.presa.push(nome(e)+' dentro de '+nome(a));break}a=a.parentElement}});" +
    "var raiz=cs(d.documentElement).overflowY!='hidden'&&cs(d.body).overflowY!='hidden'&&(d.scrollingElement||d.documentElement).scrollHeight>ih+4;o.fora=[];" +
    "if(!raiz){[].forEach.call(d.body.querySelectorAll('*'),function(e){if(!e.getClientRects().length)return;var s=cs(e);if(s.visibility=='hidden'||+s.opacity===0)return;var r=e.getBoundingClientRect();if(r.height<8||r.width<8)return;" +
    "var bot=r.bottom,top=r.top,ok=false,fixo=s.position=='fixed',a=e.parentElement;while(a&&a!==d.documentElement){var as=cs(a);if(rola(a,2)){ok=true;break}if(as.overflowY!='visible'||as.overflowX=='hidden'||as.overflowX=='clip'){var ar=a.getBoundingClientRect();bot=Math.min(bot,ar.bottom);top=Math.max(top,ar.top)}if(as.position=='fixed')fixo=true;a=a.parentElement}" +
    "if(ok||fixo&&r.bottom<=ih+4)return;if(bot>ih+4&&bot>top+8&&o.fora.length<40)o.fora.push({n:nome(e),f:Math.round(bot-ih),e:e})});" +
    "o.fora=o.fora.filter(function(x){return !o.fora.some(function(y){return y!==x&&y.e.contains(x.e)})}).slice(0,3).map(function(x){return x.n+' (+'+x.f+'px)'})}" +
    "return o})()";
  async function ferramentas() {
    var G = "AS FERRAMENTAS", lista = [].filter.call(document.querySelectorAll("#tsFerr input"), function (i) { return i.checked; }).map(function (i) { return [i.value, i.dataset.n]; });
    for (var k = 0; k < lista.length; k++) {
      var pag = lista[k][0], nome = lista[k][1]; agora("Abrindo " + nome + "… (" + (k + 1) + " de " + lista.length + ")"); barra(0.35 + 0.6 * k / lista.length);
      DIAG = []; var fr = document.createElement("iframe"); fr.id = "tsQuadro"; fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
      fr.style.width = innerWidth + "px"; fr.style.height = innerHeight + "px";
      var t0 = performance.now(), carregou = new Promise(function (ok) { fr.onload = ok; });
      fr.src = pag + (pag.indexOf("?") < 0 ? "?" : "&") + "diag=" + Date.now(); document.body.appendChild(fr);
      var r = await prazo(carregou, 25000), ms = Math.round(performance.now() - t0);
      if (r === "__prazo") { add(G, "er", nome, "não terminou de abrir em 25 s", "lento"); fr.remove(); await espera(400); continue; }
      await espera(2800);
      var m = null; try { m = fr.contentWindow.eval(MEDE); } catch (e) { m = null; }
      var errs = DIAG.slice(0, 3).map(function (e) { return e.msg + (e.onde ? " @ " + e.onde : ""); });
      var probs = [];
      if (errs.length) probs.push(["er", "erro: " + errs.join(" · "), "erro"]);
      if (m && m.cedo) probs.push(["er", "a tela de app não montou", "appnao"]);
      if (m && m.txt < 15) probs.push(["er", "abriu vazia", "vazia"]);
      if (m && m.sw > 2) probs.push(["av", "passa " + m.sw + " px para o lado", "estouro"]);
      else if (m && m.lado.length) probs.push(["av", "cortado à direita: " + m.lado.join(", "), "estouro"]);
      if (m && m.fora.length) probs.push(["av", "fora da tela sem rolagem: " + m.fora.join(", "), "fora"]);
      if (m && m.presa.length) probs.push(["er", "rolagem presa: " + m.presa.slice(0, 2).join("; "), "presa"]);
      if (ms > 12000) probs.push(["av", "demorou " + (ms / 1000).toFixed(1) + " s", "lento"]);
      if (!probs.length) add(G, "ok", nome, "abriu em " + (ms / 1000).toFixed(1) + " s");
      else probs.forEach(function (p) { add(G, p[0], nome, p[1], p[2]); });
      try { fr.src = "about:blank"; } catch (e) {} fr.remove(); await espera(500);   /* solta a memória antes da próxima (iPhone) */
    }
  }

  async function rodar(comFerr) {
    if (rodando) return; rodando = true; R = []; desenhar(); $("tsTudo").disabled = $("tsRapido").disabled = true;
    try { agora("Conferindo o aparelho…"); barra(0.05); await aparelho(); barra(0.2); agora("Conferindo vídeo e som…"); await midia(); barra(0.35);
      if (comFerr) await ferramentas();
      Object.keys(RESP).forEach(respAdd);
      barra(1); agora("Pronto — " + new Date().toLocaleTimeString("pt-BR").slice(0, 5) + ". Veja as soluções abaixo e mande o relatório.");
      try { localStorage.setItem("ui_testes_ultimo", $("tsRel").value.slice(0, 6000)); } catch (e) {}
    } catch (e) { agora("O teste parou: " + (e && e.message || e)); }
    rodando = false; $("tsTudo").disabled = $("tsRapido").disabled = false;
  }

  /* ===== 4. TESTES COM A PESSOA ===== */
  var NOMES_R = {bip: ["Som do bip", "bipnao"], voz: ["Voz", "bipnao"], topo: ["Topo da tela", "toponao"], rola: ["Dedo rola a lista", "rolanao"], segura: ["Segurar o dedo", "seguranao"]};
  function respAdd(k) { R = R.filter(function (r) { return r.chave !== k; }); var v = RESP[k], n = NOMES_R[k], bom = v === "sim" || v === "liso" || v === "ok";
    R.push({grupo: "TESTES COM VOCÊ", st: bom ? "ok" : "er", nome: n[0], det: {sim: "ouviu", nao: "não ouviu", liso: "liso", emb: "embaçado", ok: "funcionou", falha: "não funcionou"}[v] || v, sol: bom ? "" : n[1], chave: k}); desenhar(); }
  function resp(k, v) { RESP[k] = v; respAdd(k); }
  function pessoa() {
    $("tsRola").innerHTML = Array.apply(null, {length: 30}).map(function (_, i) { return "Linha " + (i + 1) + (i === 29 ? " — chegou ao fim ✓" : ""); }).join("<br>");
    var feito = false; $("tsRola").addEventListener("scroll", function () { if (!feito && this.scrollTop > 60) { feito = true; resp("rola", "ok"); } });
    var seg = $("tsSegura"), tmr = 0;
    seg.addEventListener("pointerdown", function () { clearTimeout(tmr); tmr = setTimeout(function () { seg.classList.add("on"); seg.textContent = "✓ RECONHECIDO"; resp("segura", "ok"); }, 500); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (t) { seg.addEventListener(t, function () { clearTimeout(tmr); }); });
    seg.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    $("tsBip").onclick = function () { try { var A = window.AudioContext || window.webkitAudioContext, ac = new A(), o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; g.gain.value = 0.25; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + 0.35); setTimeout(function () { ac.close(); }, 800); } catch (e) {} $("tsPergBip").classList.add("on"); };
    $("tsVoz").onclick = function () { try { var u = new SpeechSynthesisUtterance("Olá! Aqui é o Tio Cláudio. Se você me ouviu, toque em sim."); u.lang = "pt-BR";
      var v = speechSynthesis.getVoices().filter(function (x) { return /^pt/i.test(x.lang); })[0]; if (v) u.voice = v; speechSynthesis.speak(u); } catch (e) {} $("tsPergVoz").classList.add("on"); };
    document.addEventListener("click", function (e) { var b = e.target.closest("[data-r]"); if (b) { var p = b.dataset.r.split(":"); resp(p[0], p[1]); }
      if (e.target.closest("[data-atualizar]")) atualizar(); });
  }

  /* ===== SOLUÇÃO COM UM TOQUE: atualizar o app (apaga só os ARQUIVOS do site guardados; os dados ficam) ===== */
  async function atualizar() {
    agora("Atualizando…");
    try { if (window.caches) { var ks = await caches.keys(); await Promise.all(ks.map(function (k) { return caches.delete(k); })); }
      if (navigator.serviceWorker) { var rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(function (r) { return r.update().catch(function () {}); })); } } catch (e) {}
    location.reload();
  }

  /* ===== RELATÓRIO ===== */
  function relatorio() {
    var n = {ok: 0, av: 0, er: 0}; R.forEach(function (r) { if (n[r.st] != null) n[r.st]++; });
    var l = ["BRIGHTWAY · TESTES E SOLUÇÕES (" + VERSAO + ") · " + new Date().toLocaleString("pt-BR"),
      "Aparelho: " + UA, "Tela: " + innerWidth + "×" + innerHeight + " · " + (APP ? "app instalado" : "navegador"),
      "Resultado: " + n.ok + " certo · " + n.av + " atenção · " + n.er + " problema", ""];
    R.filter(function (r) { return r.st !== "ok"; }).forEach(function (r) { l.push("[" + {av: "ATENÇÃO", er: "PROBLEMA", in: "info"}[r.st] + "] " + r.grupo + " › " + r.nome + (r.det ? " — " + r.det : "")); });
    l.push(""); l.push("Certos: " + R.filter(function (r) { return r.st === "ok"; }).map(function (r) { return r.nome; }).join("; "));
    $("tsRel").value = l.join("\n");
  }
  async function enviar() {
    var msg = $("tsMsg"), c = null, s = null;
    if (!R.length) { msg.textContent = "Rode os testes antes."; return; }
    try { c = window.BWSync && BWSync.cliente(); s = c ? (await c.auth.getSession()).data.session : null; } catch (e) {}
    if (!c || !s) { msg.innerHTML = 'Entre na sua conta para enviar — ou use ⧉ COPIAR. <a href="login.html" style="color:#FFB547">entrar</a>'; return; }
    msg.textContent = "Enviando…";
    var ap = (IOS ? "iPhone/iPad" : ANDROID ? "Android" : "PC") + (APP ? " · app instalado" : " · navegador") + " · " + innerWidth + "px";
    var r = await c.from("bw_feedback").insert({dono: s.user.id, tipo: "Problema", texto: ("[TESTES E SOLUÇÕES]\n" + $("tsRel").value).slice(0, 3990), pagina: "teste.html", aparelho: ap});
    msg.textContent = r.error ? (/limite/.test(r.error.message) ? "Limite de envios de hoje atingido — use ⧉ COPIAR." : "Não deu para enviar agora — use ⧉ COPIAR.") : "✓ Enviado para a equipe Brightway. Obrigado!";
  }
  function copiar() { var t = $("tsRel"); t.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
    if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(function () { $("tsMsg").textContent = "✓ Copiado — cole na conversa."; }, function () {});
    else $("tsMsg").textContent = ok ? "✓ Copiado — cole na conversa." : "Selecione o texto e copie."; }

  function init() {
    $("tsFerr").innerHTML = FERR.map(function (f) { return '<label><input type="checkbox" value="' + f[0] + '" data-n="' + esc(f[1]) + '" checked> ' + esc(f[1]) + '</label>'; }).join("");
    $("tsTudo").onclick = function () { rodar(true); }; $("tsRapido").onclick = function () { rodar(false); };
    $("tsEnviar").onclick = enviar; $("tsCopiar").onclick = copiar; pessoa();
    var u = null; try { u = localStorage.getItem("ui_testes_ultimo"); } catch (e) {}
    if (u) $("tsRel").value = "(último teste neste aparelho)\n" + u;
    window.BWTestes = {rodar: rodar, R: function () { return R; }, SOL: SOL};
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
