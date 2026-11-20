/* PÁGINA PRINCIPAL (20/11/2026, Claude — desenho e vídeo de referência do dono): o robô no centro e quatro TELAS girando em volta dele
   (MEU NEGÓCIO, GESTÃO DE CASA, MARKETING, FERRAMENTAS), no mesmo sistema de telas dos PERSONAGENS e do PROMPT IA: passa para o lado
   (arrastar, setas, teclado) ou toca numa tela → ela vem para a frente e cresce; tocar de novo (ou ENTRAR) aproxima e abre o ecossistema.
   Igual à animação de referência, SEM os efeitos (nada de partículas, rastros de luz nem túnel). Não lê nem grava dado nenhum. */
(function () {
  "use strict";
  var palco = document.getElementById("hubPalco"); if (!palco) return;
  var telas = [].slice.call(palco.querySelectorAll(".hub-tela")), robo = document.getElementById("hubRobo");
  var nome = document.getElementById("hubNome"), sub = document.getElementById("hubSub"), entrar = document.getElementById("hubEntrar");
  var calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* ângulo de cada tela na roda (0 = na frente, 180 = atrás). Parado, fica como no desenho: negócio e casa atrás/em cima, marketing e ferramentas na frente/embaixo */
  var BASE = telas.map(function (t) { return +t.getAttribute("data-ang"); });
  var ORDEM = telas.map(function (t, i) { return i; }).sort(function (a, b) { return BASE[a] - BASE[b]; });   /* vizinhos na roda */
  var rot = 0, alvo = 0, foco = -1, saindo = -1, tSaida = 0, t0 = performance.now(), rodando = false;
  function rad(g) { return g * Math.PI / 180; }
  function desenhar(agora) {
    var W = palco.clientWidth, H = palco.clientHeight, Rx = Math.min(W * (W < 520 ? 0.31 : 0.34), 330), Ry = H * 0.17;
    var balanco = calmo || foco >= 0 ? 0 : Math.sin((agora - t0) / 2600) * 5;   /* parado, a roda respira de leve */
    telas.forEach(function (t, i) {
      var a = rad(BASE[i] + rot + balanco), frente = Math.cos(a), lado = Math.sin(a), noFoco = i === foco;
      var perto = noFoco ? Math.max(0, (frente - 0.6) / 0.4) : 0;                 /* 0 → 1 quando a tela escolhida chega à frente */
      var x = lado * Rx * (0.86 + 0.14 * (frente + 1) / 2), y = frente * Ry - H * 0.05 + perto * H * 0.07, s = 0.72 + 0.2 * (frente + 1) / 2 + perto * 0.24, op = 0.66 + 0.34 * (frente + 1) / 2;   /* a roda é vista de cima: quem está atrás fica mais alto e menor */
      if (i === saindo) { var k = Math.min(1, (agora - tSaida) / 420), e = k * k; s *= 1 + e * 2.4; op *= 1 - e; y -= e * H * 0.08; }
      t.style.transform = "translate(calc(-50% + " + x.toFixed(1) + "px), calc(-50% + " + y.toFixed(1) + "px)) perspective(700px) rotateY(" + (-lado * 26).toFixed(1) + "deg) scale(" + s.toFixed(3) + ")";
      t.style.opacity = op.toFixed(3); t.style.zIndex = frente > 0 ? (noFoco ? 6 : 4) : 1;
      t.classList.toggle("na-frente", noFoco && perto > 0.5);
    });
  }
  function quadro(agora) {
    var d = alvo - rot; rot += Math.abs(d) < 0.05 ? d : d * 0.11;
    desenhar(agora);
    if (calmo && Math.abs(alvo - rot) < 0.05 && saindo < 0) { rodando = false; return; }
    requestAnimationFrame(quadro);
  }
  function ligar() { if (!rodando) { rodando = true; requestAnimationFrame(quadro); } }
  function textos() {
    var t = telas[foco];
    nome.textContent = t ? t.getAttribute("data-nome") : "POR ONDE VOCÊ QUER ENTRAR?";
    sub.textContent = t ? t.getAttribute("data-sub") : "Toque numa tela ou passe para o lado";
    entrar.hidden = !t; if (t) { entrar.href = t.getAttribute("href"); entrar.setAttribute("data-cor", t.getAttribute("data-cor")); entrar.textContent = "ENTRAR EM " + t.getAttribute("data-nome") + " →"; }
    telas.forEach(function (x, i) { x.setAttribute("aria-current", i === foco ? "true" : "false"); });
    palco.setAttribute("data-foco", t ? t.getAttribute("data-cor") : "");
  }
  function focar(i) {
    if (i === foco) return; foco = i;
    var quer = -BASE[i], d = ((quer - alvo) % 360 + 540) % 360 - 180;   /* caminho mais curto */
    alvo += d; if (calmo) rot = alvo; textos(); ligar();
  }
  function passo(n) { var p = foco < 0 ? (n > 0 ? 0 : ORDEM.length - 1) : (ORDEM.indexOf(foco) + n + ORDEM.length) % ORDEM.length; focar(ORDEM[p]); }
  function abrir(i) {   /* aproxima a tela e entra (sem efeitos) */
    var href = telas[i].getAttribute("href"); if (saindo >= 0) return;
    if (calmo) { location.href = href; return; }
    saindo = i; tSaida = performance.now(); palco.classList.add("saindo"); ligar();
    setTimeout(function () { location.href = href; }, 430);
  }
  window.addEventListener("pageshow", function () { saindo = -1; palco.classList.remove("saindo"); ligar(); });   /* voltar do ecossistema: a roda volta ao normal */
  telas.forEach(function (t, i) { t.addEventListener("click", function (e) { e.preventDefault(); if (arrastou) return; if (i === foco) abrir(i); else focar(i); }); });
  entrar.addEventListener("click", function (e) { if (foco >= 0) { e.preventDefault(); abrir(foco); } });
  document.getElementById("hubAnt").onclick = function () { passo(-1); }; document.getElementById("hubProx").onclick = function () { passo(1); };
  document.addEventListener("keydown", function (e) { if (/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || "")) || document.querySelector(".bwg-painel.aberto")) return;
    if (e.key === "ArrowRight") passo(1); else if (e.key === "ArrowLeft") passo(-1); });
  /* passar para o lado (dedo ou mouse): solta no vizinho */
  var x0 = null, arrastou = false;
  palco.addEventListener("pointerdown", function (e) { if (e.target.closest(".hub-seta")) return; x0 = e.clientX; arrastou = false; });
  window.addEventListener("pointerup", function (e) { if (x0 == null) return; var dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 44) { arrastou = true; passo(dx < 0 ? 1 : -1); setTimeout(function () { arrastou = false; }, 60); } });
  if (robo) robo.addEventListener("click", function () { passo(1); });
  window.addEventListener("resize", ligar);
  window.BWPortal = {focar: focar, passo: passo, foco: function () { return foco; }, abrir: abrir};
  textos(); desenhar(performance.now()); ligar();
})();
