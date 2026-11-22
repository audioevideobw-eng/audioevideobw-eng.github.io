/* CAIXA ÚNICA DO TIO CLÁUDIO (22/11/2026, pedido do dono, ideia vinda do Adapta ONE): uma caixa de pedido na página do robô.
   ＋ anexar (leva para a ferramenta certa) · ⚡ atalhos (gerar, lançar, perguntar) · chip do modelo (BW Smart / Rápido / Inteligente — window.BWIA,
   no bw-agente.js) · ✨ varinha (melhora o pedido pelos 4Is, sem inventar dados) · 🎙 falar · ➤ enviar (BWAgente.processar).
   Nada é gravado aqui: o Tio Cláudio mostra o cartão e só lança com ✓ LANÇAR, como sempre. A escolha do modelo fica no aparelho. */
(function () {
  "use strict";
  var caixa = document.getElementById("bwPede"); if (!caixa) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var ICO = {
    mais: '<path d="M12 5v14M5 12h14"/>', raio: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>', mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/>',
    enviar: '<path d="M5 12h13M13 6l6 6-6 6"/>', varinha: '<path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 10l.6 1.4L21 12l-1.4.6L19 14l-.6-1.4L17 12l1.4-.6z"/>', seta: '<path d="m7 10 5 5 5-5"/>'
  };
  var ic = function (n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[n] + "</svg>"; };
  caixa.innerHTML =
    '<div class="bp-caixa"><textarea id="bpTexto" rows="1" maxlength="1500" aria-label="Pedido ao Tio Cláudio" placeholder="Peça ao Tio Cláudio: gastei 80 no mercado, lembrar de ligar amanhã às 10, como está meu dia…"></textarea>' +
    '<div class="bp-linha"><button type="button" class="bp-bt" id="bpMais" title="Anexar: conta, foto, print">' + ic("mais") + '</button>' +
    '<button type="button" class="bp-bt" id="bpRaio" title="Atalhos: gerar, lançar, perguntar">' + ic("raio") + '</button><span class="bp-esp"></span>' +
    '<button type="button" class="bp-modelo" id="bpModelo" title="Qual IA responde"><i></i><span id="bpModeloNome">BW Smart</span>' + ic("seta") + '</button>' +
    '<button type="button" class="bp-bt" id="bpVarinha" title="Melhorar o pedido (varinha)">' + ic("varinha") + '</button>' +
    '<button type="button" class="bp-bt" id="bpMic" title="Falar com o Tio Cláudio">' + ic("mic") + '</button>' +
    '<button type="button" class="bp-enviar" id="bpEnviar" title="Enviar (Enter)" aria-label="Enviar">' + ic("enviar") + '</button></div></div>' +
    '<div class="bp-via" id="bpVia" aria-live="polite"></div><div class="bp-menu" id="bpMenu" role="menu" hidden></div>';
  var tx = $("bpTexto"), menu = $("bpMenu"), via = $("bpVia"), antes = null;
  function agente() { return window.BWAgente; }
  function esperarAgente(f) { var n = 0; (function t() { if (agente() || n++ > 40) return f(agente()); setTimeout(t, 150); })(); }
  function crescer() { tx.style.height = "auto"; tx.style.height = Math.min(tx.scrollHeight, 168) + "px"; }
  tx.addEventListener("input", function () { crescer(); if (antes !== null && !tx.value) antes = null; });
  /* --- modelo --- */
  var DESC = { smart: "Escolhe sozinho: rápido para papo e lançamentos, inteligente para textos, orçamentos e análises.", rapido: "Responde mais depressa (gpt-oss-20b, reserva Llama 3.1 8B).", inteligente: "Pensa mais antes de responder (gpt-oss-120b, reserva Llama 3.3 70B)." };
  function nivel() { if (window.BWIA) return BWIA.nivel(); try { var n = JSON.parse(localStorage.getItem("ui_agente_nivel") || '"smart"'); return DESC[n] ? n : "smart"; } catch (e) { return "smart"; } }
  var NOMES = { smart: "BW Smart", rapido: "Rápido", inteligente: "Inteligente" }, quem = "";
  function pintarModelo() { var n = nivel(); $("bpModeloNome").textContent = NOMES[n]; $("bpModelo").dataset.nivel = n; if (!via.dataset.fixo) via.textContent = DESC[n]; }
  window.addEventListener("bw-ia-nivel", pintarModelo);
  window.addEventListener("bw-ia-modelo", function (e) { var d = e.detail || {}; via.dataset.fixo = "1"; via.innerHTML = quem = "Respondido por <b>" + esc(d.modelo.replace(/^openai\//, "")) + "</b>" + (d.nivel ? " · " + (d.nivel === "rapido" ? "Rápido" : "Inteligente") : "") + (d.reserva ? ' · <span class="bp-res">reserva (a principal estava ocupada)</span>' : "") + (nivel() === "smart" ? " · escolhido pelo BW Smart" : ""); });
  /* --- menus --- */
  var aberto = "";
  function fechar() { menu.hidden = true; aberto = ""; caixa.querySelectorAll(".bp-on").forEach(function (b) { b.classList.remove("bp-on"); }); }
  function abrirMenu(qual, botao, html) {
    if (aberto === qual) return fechar();
    fechar(); aberto = qual; menu.innerHTML = html; menu.hidden = false; botao.classList.add("bp-on");
    var r = botao.getBoundingClientRect(), rc = caixa.getBoundingClientRect();
    menu.style.left = Math.max(0, Math.min(r.left - rc.left, rc.width - menu.offsetWidth)) + "px";
    /* 22/11 (dono): abre PARA CIMA — para baixo ficava atrás das abas do celular, fora da tela. Só desce se em cima não couber e embaixo couber mais. */
    var acima = r.top - 12, abaixo = window.innerHeight - r.bottom - 12 - ((document.querySelector(".bw-abas") || {}).offsetHeight || 0);
    var cima = acima >= 220 || acima >= abaixo;
    menu.classList.toggle("bp-cima", cima);
    menu.style.top = cima ? "auto" : ""; menu.style.bottom = cima ? (rc.bottom - r.top + 8) + "px" : "";
    menu.style.maxHeight = Math.max(160, Math.min(420, cima ? acima : abaixo)) + "px";
    if (!cima) { var m = menu.getBoundingClientRect(); if (m.bottom > window.innerHeight) window.scrollBy({ top: m.bottom - window.innerHeight + 12, behavior: "smooth" }); }
  }
  var ir = function (href) { return '<a class="bp-item" role="menuitem" href="' + href[0] + '"><b>' + href[1] + "</b><small>" + href[2] + "</small></a>"; };
  var por = function (t, rotulo) { return '<button type="button" class="bp-item" role="menuitem" data-por="' + esc(t) + '"><b>' + rotulo + "</b><small>" + esc(t.replace(/…/g, "…")) + "</small></button>"; };
  $("bpMais").onclick = function () {
    abrirMenu("mais", this, '<h6>ANEXAR</h6>' + [["leitor.html", "Conta, boleto ou comprovante", "PDF, foto ou código — o leitor preenche sozinho"], ["fotos.html", "Foto para editar", "Editor de fotos com retoque e IA"], ["promptia.html", "Print de uma trend", "A IA explica como reproduzir"], ["financeiro-painel.html?a=pj", "Planilha do financeiro", "ENVIAR PLANILHA no painel"]].map(ir).join(""));
  };
  $("bpRaio").onclick = function () {
    abrirMenu("raio", this, '<h6>GERAR</h6>' + [["criador.html", "Arte com IA", "Convite, post, flyer ou cartão"], ["reels.html", "Reel", "Roteiro, cenas e vídeo"], ["propostas.html", "Orçamento", "PDF, Word e recibo"], ["personagens.html", "Personagem", "Ficha, prompt e imagem"]].map(ir).join("") +
      '<h6>LANÇAR</h6>' + por("Gastei R$ … no …", "Gasto") + por("Recebi R$ … de …", "Recebimento") + por("Conta de … de R$ … vence dia …", "Conta a pagar") + por("Lembrar de … amanhã às …", "Lembrete") +
      '<h6>PERGUNTAR</h6><button type="button" class="bp-item" role="menuitem" data-ja="Como está meu dia?"><b>Como está meu dia?</b><small>Agenda, contas e o próximo evento</small></button>');
  };
  $("bpModelo").onclick = function () {
    var n = nivel(), N = window.BWIA ? BWIA.niveis : { smart: "BW Smart", rapido: "Rápido", inteligente: "Inteligente" };
    abrirMenu("modelo", this, '<h6>IA DE TEXTO</h6>' + Object.keys(N).map(function (k) { return '<button type="button" class="bp-item' + (k === n ? " bp-sel" : "") + '" role="menuitemradio" aria-checked="' + (k === n) + '" data-nivel="' + k + '"><b>' + N[k] + (k === "smart" ? ' <em>recomendado</em>' : "") + (k === n ? " ✓" : "") + "</b><small>" + DESC[k] + "</small></button>"; }).join("") +
      '<p class="bp-nota">Grátis, pela IA Brightway (Groq). Se a principal estiver ocupada, a reserva responde sozinha.' + (window.BW_APP ? " No app do PC, as IAs com a sua chave ficam em MINHAS IAS." : "") + "</p>");
  };
  menu.addEventListener("click", function (e) {
    var b = e.target.closest("[data-nivel],[data-por],[data-ja]"); if (!b) return;
    if (b.dataset.nivel) { if (window.BWIA) BWIA.escolher(b.dataset.nivel); delete via.dataset.fixo; pintarModelo(); fechar(); return; }
    if (b.dataset.ja) { fechar(); tx.value = b.dataset.ja; enviar(); return; }
    tx.value = b.dataset.por; fechar(); crescer(); tx.focus(); var i = tx.value.indexOf("…"); if (i >= 0) tx.setSelectionRange(i, i + 1);
  });
  document.addEventListener("click", function (e) { if (aberto && !caixa.contains(e.target)) fechar(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && aberto) { fechar(); e.stopPropagation(); } });
  /* --- varinha --- */
  $("bpVarinha").onclick = function () {
    var t = tx.value.trim(); if (!t) { tx.focus(); via.dataset.fixo = "1"; via.textContent = "Escreva o pedido do seu jeito e toque na varinha: ela deixa claro o objetivo, a ação e os dados, sem inventar nada."; return; }
    var b = this; b.disabled = true; b.classList.add("bp-gira");
    esperarAgente(function (ag) {
      if (!ag || !ag.melhorar) { b.disabled = false; b.classList.remove("bp-gira"); return; }
      ag.melhorar(t).then(function (novo) { antes = t; tx.value = novo; quem = quem || ""; crescer(); via.dataset.fixo = "1"; via.innerHTML = '✨ Pedido melhorado' + (quem ? " · " + quem : "") + '. <button type="button" class="bp-lk" id="bpDesfaz">↺ voltar ao meu texto</button>';
        $("bpDesfaz").onclick = function () { if (antes !== null) { tx.value = antes; antes = null; crescer(); delete via.dataset.fixo; pintarModelo(); } }; })
        .catch(function (e) { via.dataset.fixo = "1"; via.textContent = e.message; })
        .then(function () { b.disabled = false; b.classList.remove("bp-gira"); });
    });
  };
  /* --- falar e enviar --- */
  $("bpMic").onclick = function () { esperarAgente(function (ag) { if (ag) ag.abrir(true); }); };
  function enviar() {
    var t = tx.value.trim(); if (!t) { tx.focus(); return; }
    esperarAgente(function (ag) { if (!ag) { via.dataset.fixo = "1"; via.textContent = "O Tio Cláudio ainda está carregando. Tente de novo em um instante."; return; } ag.processar(t); tx.value = ""; antes = null; crescer(); });
  }
  $("bpEnviar").onclick = enviar;
  tx.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); } });
  pintarModelo(); crescer();
  window.BWPede = { enviar: enviar, fechar: fechar };
})();
