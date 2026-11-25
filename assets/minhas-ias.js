/* MINHAS IAS (25/11/2026, Claude — decisões do dono): quem quiser pode conectar a PRÓPRIA conta das IAs que têm limite por dia
   (imagens = Cloudflare Workers AI; decupagem = Google Gemini). Sem conectar, tudo continua funcionando com a IA da plataforma
   (o limite basta para a maioria). Conectada, a pessoa escolhe: USAR MINHA CONTA (sem o limite) ou USAR A DA PLATAFORMA.
   A chave fica SÓ NESTE APARELHO (localStorage "ui_minhas_ias", ligada à conta Brightway que salvou — outra conta no mesmo
   aparelho não usa) e nunca vai para a conta (a tabela de dados sincronizados), para o Storage nem para o código. Ela só sai na hora do pedido, no
   cabeçalho, para a Edge Function, que usa e não guarda. Este arquivo só fala com bw-ia-imagem e bw-ia-video para TESTAR a chave
   (vigia 7.8m). A chave nunca volta para a tela: conectada, aparecem só os 4 últimos caracteres.
   Uso: qualquer <div data-mia="cf"></div> ou <div data-mia="gemini"></div> vira o painel de conexão (Configurações e Tutoriais). */
(function () {
  "use strict";
  var BASE = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var CHAVE = "ui_minhas_ias";
  var SERV = {
    cf: { nome: "Cloudflare", para: "IMAGENS COM IA", frase: "as imagens com IA funcionam", fn: BASE + "bw-ia-imagem", limite: "15 imagens por dia",
      abrir: "https://dash.cloudflare.com/?to=/:account/ai/workers-ai", abrirTxt: "1 · ABRIR A CLOUDFLARE (WORKERS AI)",
      campo: "Token da API (Workers AI)", tut: "cf",
      ok: function (v) { return /^[\x21-\x7e]{20,400}$/.test(v); } },
    gemini: { nome: "Google", para: "DECUPAGEM COM IA", frase: "a decupagem com IA funciona", fn: BASE + "bw-ia-video", limite: "200 análises por dia",
      abrir: "https://aistudio.google.com/apikey", abrirTxt: "1 · ABRIR O GOOGLE AI STUDIO",
      campo: "Chave da API do Gemini", tut: "gemini",
      ok: function (v) { return /^[\x21-\x7e]{20,400}$/.test(v); } }
  };
  var CSS = ".mia{display:flex;flex-direction:column;gap:10px;min-width:0}" +
    ".mia-st{margin:0;font:600 14px/1.5 Inter,sans-serif;color:var(--bw-texto-2,#bbb)}.mia-st.ok{color:#2FD08A;font-weight:800}" +
    ".mia-bt{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 16px;border-radius:12px;border:1px solid var(--bw-card-borda,#333);background:rgba(127,127,127,.12);color:var(--bw-marfim,#fff);font:800 12px Inter,sans-serif;letter-spacing:.06em;text-decoration:none;cursor:pointer;white-space:normal;text-align:center}" +
    ".mia-bt.pri{background:var(--bw-ambar,#E8B54A);color:var(--bw-noite,#111);border-color:transparent}.mia-bt.perigo{color:#FF6B6B}" +
    ".mia-campo{display:flex;flex-direction:column;gap:6px;font:700 12px Inter,sans-serif;color:var(--bw-texto-2,#bbb);text-transform:none;letter-spacing:0}" +
    ".mia-campo span{display:flex;gap:8px;min-width:0}.mia-campo input{flex:1;min-width:0;min-height:46px;padding:0 12px;border-radius:12px;border:1px solid var(--bw-card-borda,#333);background:rgba(127,127,127,.08);color:var(--bw-marfim,#fff);font:600 16px Inter,sans-serif}" +
    ".mia.voltou .mia-campo input,.mia.voltou [data-a=colar]{box-shadow:0 0 0 3px rgba(232,181,74,.55)}" +
    ".mia-escolha{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mia-escolha button{min-width:0;padding:10px;border-radius:12px;border:1px solid var(--bw-card-borda,#333);background:rgba(127,127,127,.08);color:var(--bw-marfim,#fff);cursor:pointer;text-align:left;display:flex;flex-direction:column;gap:2px}" +
    ".mia-escolha button b{font:800 12px Inter,sans-serif}.mia-escolha button small{font:500 12px Inter,sans-serif;opacity:.75}.mia-escolha button.on{border-color:#2FD08A;box-shadow:0 0 0 2px rgba(47,208,138,.35)}" +
    ".mia-linha{display:flex;gap:8px;flex-wrap:wrap}.mia-msg{margin:0;font:600 13px/1.5 Inter,sans-serif;color:#2FD08A}.mia-msg.erro{color:#FF8A8A}" +
    ".mia-nota{margin:0;font:500 12px/1.5 Inter,sans-serif;color:var(--bw-texto-3,#999)}@media(max-width:420px){.mia-escolha{grid-template-columns:1fr}}";
  if (!document.getElementById("miaCss")) { var st = document.createElement("style"); st.id = "miaCss"; st.textContent = CSS; document.head.appendChild(st); }
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || "null") || {}; } catch (e) { return {}; } }
  function gravar(m) { try { if (!m.cf && !m.gemini) localStorage.removeItem(CHAVE); else localStorage.setItem(CHAVE, JSON.stringify(m)); return true; } catch (e) { return false; } }
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  var sess = null, pronto = false;
  function minha() { var m = ler(); return sess && m.dono === sess.user.id ? m : { dono: sess && sess.user.id }; }
  function segredo(q, d) { return q === "cf" ? d && d.token : d && d.chave; }

  async function testar(q, cab) {
    var s = await sessao(); if (!s) return { ok: false, motivo: "entre na sua conta" };
    var h = Object.assign({ "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, cab);
    try {
      var r = await fetch(SERV[q].fn, { method: "POST", headers: h, body: JSON.stringify({ ping: true, testar: true }) });
      var j = await r.json().catch(function () { return {}; });
      if (j.ok) return j;
      var mot = { formato: "o formato não parece certo — confira se copiou inteiro", sem_conta: "sem_conta" }[j.motivo] || j.motivo || j.erro || ("erro " + r.status);
      return { ok: false, motivo: mot };
    } catch (e) { return { ok: false, motivo: "sem internet agora" }; }
  }

  function painel(el) {
    var q = el.getAttribute("data-mia"), S = SERV[q]; if (!S) return;
    var m = minha(), d = m[q], ligado = !!segredo(q, d), usar = ligado && d.usar !== false;
    if (!pronto) { el.innerHTML = '<div class="mia"><p class="mia-st">Carregando…</p></div>'; return; }
    if (!sess) { el.innerHTML = '<div class="mia"><p class="mia-st">Entre na sua conta para conectar. Sem conectar, ' + esc(S.frase) + ' normalmente com a da plataforma (' + esc(S.limite) + ').</p><a class="mia-bt pri" href="login.html">ENTRAR NA CONTA</a></div>'; return; }
    var h = '<div class="mia' + (ligado ? " ligado" : "") + '">';
    if (ligado) {
      h += '<p class="mia-st ok">✓ SUA CONTA ' + esc(S.nome.toUpperCase()) + ' CONECTADA · chave …' + esc(String(segredo(q, d)).slice(-4)) + '</p>' +
        '<div class="mia-escolha" role="radiogroup" aria-label="Qual conta usar">' +
        '<button type="button" role="radio" aria-checked="' + usar + '" class="' + (usar ? "on" : "") + '" data-a="minha"><b>USAR MINHA CONTA</b><small>sem o limite da plataforma</small></button>' +
        '<button type="button" role="radio" aria-checked="' + !usar + '" class="' + (!usar ? "on" : "") + '" data-a="plat"><b>USAR A DA PLATAFORMA</b><small>' + esc(S.limite) + '</small></button></div>' +
        '<div class="mia-linha"><button type="button" class="mia-bt" data-a="retestar">↻ TESTAR DE NOVO</button><button type="button" class="mia-bt perigo" data-a="sair">DESCONECTAR</button></div>';
    } else {
      h += '<p class="mia-st">Agora: usando a da plataforma (' + esc(S.limite) + '). Conectar é opcional.</p>' +
        '<a class="mia-bt" href="' + esc(S.abrir) + '" target="_blank" rel="noopener" data-a="abrir">' + esc(S.abrirTxt) + ' ↗</a>' +
        '<label class="mia-campo">2 · ' + esc(S.campo) + '<span><input type="password" autocomplete="off" spellcheck="false" data-c="seg" placeholder="cole aqui — conecta sozinho"><button type="button" class="mia-bt" data-a="colar">📋 COLAR</button></span></label>' +
        (q === "cf" ? '<label class="mia-campo" data-c="contaCx" hidden>ID da conta (32 letras e números — em Workers AI → Usar a API REST)<span><input type="text" autocomplete="off" spellcheck="false" data-c="conta" placeholder="ex.: 0123456789abcdef0123456789abcdef"></span></label>' : "") +
        '<button type="button" class="mia-bt pri" data-a="ligar">3 · CONECTAR</button>';
    }
    h += '<p class="mia-msg" aria-live="polite" hidden></p><p class="mia-nota">🔒 A chave fica só neste aparelho e vai junto só na hora do pedido; não é guardada em servidor nem na sua conta Brightway. Em outro aparelho, conecte de novo.' +
      (q === "gemini" ? ' No plano gratuito do Google, ele pode usar o que você envia para melhorar os produtos dele; com faturamento ativo, não.' : "") + '</p></div>';
    el.innerHTML = h;
    var msg = function (t, erro) { var p = el.querySelector(".mia-msg"); p.hidden = !t; p.textContent = t || ""; p.classList.toggle("erro", !!erro); };
    var inp = el.querySelector('[data-c="seg"]');
    async function ligar() {
      var v = inp.value.trim(), conta = q === "cf" ? (el.querySelector('[data-c="conta"]').value || "").trim() : "";
      if (!S.ok(v)) return msg("Cole a chave inteira, sem espaços.", true);
      if (conta && !/^[a-f0-9]{32}$/i.test(conta)) return msg("O ID da conta tem 32 letras e números.", true);
      msg("⏳ Conferindo com " + (q === "cf" ? "a Cloudflare" : "o Google") + "…");
      var cab = q === "cf" ? Object.assign({ "x-bw-cf-token": v }, conta ? { "x-bw-cf-conta": conta } : {}) : { "x-bw-gemini": v };
      var r = await testar(q, cab);
      if (!r.ok && r.motivo === "sem_conta") { var cx = el.querySelector('[data-c="contaCx"]'); cx.hidden = false; cx.querySelector("input").focus();
        return msg("Quase lá: não consegui descobrir o ID da sua conta sozinho. Cole o ID da conta (aparece na mesma tela do token) e toque em CONECTAR.", true); }
      if (!r.ok) return msg("Não conectou: " + r.motivo + ".", true);
      var mm = minha(); mm.dono = sess.user.id;
      mm[q] = q === "cf" ? { conta: r.conta || conta, token: v, usar: true, em: Date.now() } : { chave: v, usar: true, em: Date.now() };
      if (!gravar(mm)) return msg("Este navegador não deixou guardar a chave.", true);
      desenhar(); aviso("✓ Conectada. Agora usa a sua conta neste aparelho.");
    }
    el.onclick = async function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return; var a = b.getAttribute("data-a");
      if (a === "abrir") { el.classList.add("voltou-espera"); return; }
      if (a === "colar") { try { inp.value = (await navigator.clipboard.readText()).trim(); } catch (x) { inp.focus(); return msg("O navegador não deixou colar sozinho. Toque no campo e cole (segure o dedo → Colar, ou Ctrl+V).", true); } if (S.ok(inp.value)) ligar(); return; }
      if (a === "ligar") return ligar();
      if (a === "minha" || a === "plat") { var mm = minha(); if (mm[q]) { mm[q].usar = a === "minha"; gravar(mm); } desenhar(); aviso(a === "minha" ? "Usando a sua conta." : "Usando a da plataforma."); return; }
      if (a === "retestar") { msg("⏳ Testando…"); var dd = minha()[q], r = await testar(q, q === "cf" ? { "x-bw-cf-conta": dd.conta, "x-bw-cf-token": dd.token } : { "x-bw-gemini": dd.chave });
        return msg(r.ok ? "✓ A sua chave está funcionando." : "A chave não respondeu: " + r.motivo + ". Se ela foi apagada no site, desconecte e conecte uma nova.", !r.ok); }
      if (a === "sair") { if (!confirm("Desconectar a sua conta? A ferramenta volta a usar a da plataforma (" + S.limite + ").")) return;
        var m2 = minha(); delete m2[q]; gravar(m2); desenhar(); aviso("Desconectada. A chave foi apagada deste aparelho."); }
    };
    if (inp) inp.addEventListener("paste", function () { setTimeout(function () { if (S.ok(inp.value.trim())) ligar(); }, 30); });
  }
  function aviso(t) { if (window.BWAviso) BWAviso(t); }
  function desenhar() { document.querySelectorAll("[data-mia]").forEach(painel); }
  /* quem abriu o site da Cloudflare/Google e voltou: destaca o COLAR (automação sem pedir permissão de área de transferência sozinho) */
  window.addEventListener("focus", function () { document.querySelectorAll(".voltou-espera").forEach(function (el) { el.classList.remove("voltou-espera"); el.classList.add("voltou");
    var b = el.querySelector('[data-a="colar"]'); if (b) b.focus(); }); });
  (async function () { sess = await sessao(); pronto = true; desenhar(); })();
  desenhar();
  window.BWMinhasIAs = { desenhar: desenhar, situacao: function (q) { var d = minha()[q]; return !segredo(q, d) ? "plataforma" : d.usar === false ? "conectada-plataforma" : "minha"; } };
})();
