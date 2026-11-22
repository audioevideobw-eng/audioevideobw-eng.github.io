/* CONTROLE PELO CELULAR (21/11/2026) — o celular vira o controle remoto do editor de vídeo aberto no PC (tocar, pausar, andar, cortar,
   desfazer), por um CÓDIGO de 6 letras que vale só enquanto a janela de controle estiver ligada.
   Vai pela internet só o COMANDO e o TEMPO (ex.: {"c":"tocar"} e {"t":12.4,"total":30}) num canal de aviso do Supabase Realtime
   (broadcast — nada é gravado no banco). Vídeo, foto e som NUNCA saem do aparelho.
   Uso: no editor, BWControle.ligar(api) → {codigo, link} · BWControle.desligar() · na página controle.html, BWControle.celular(codigo, aoEstado). */
(function () {
  "use strict";
  var CANAL = null, SB = null, TIMER = 0, CODIGO = "", ULT = 0;
  function sb() { if (SB) return SB; SB = window.__BWControleCliente || (window.BWSync && BWSync.cliente && BWSync.cliente()); return SB; }
  function gerar() { var L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "", a = new Uint32Array(6); (window.crypto || window.msCrypto).getRandomValues(a); for (var i = 0; i < 6; i++) s += L[a[i] % L.length]; return s; }
  function canal(cod) { var c = sb(); if (!c || !c.channel) return null; return c.channel("bwc-" + cod, {config: {broadcast: {self: false, ack: false}}}); }
  /* ---- no PC: recebe comandos, manda o tempo ---- */
  function ligar(api, aoMudar) {
    desligar(); CODIGO = gerar(); var ch = canal(CODIGO); if (!ch) return null; CANAL = ch;
    ch.on("broadcast", {event: "cmd"}, function (m) { var p = (m && m.payload) || {}, c = String(p.c || ""); ULT = Date.now(); if (aoMudar) aoMudar("conectado");
      if (c === "tocar") api.tocar(); else if (c === "pausar") api.parar(); else if (c === "alternar") (api.tocando() ? api.parar() : api.tocar());
      else if (c === "ir" && isFinite(+p.t)) api.irPara(+p.t); else if (c === "passo" && isFinite(+p.d)) api.irPara(api.T() + lim(+p.d, -30, 30));
      else if (c === "inicio") api.irPara(0); else if (c === "dividir") api.dividir(); else if (c === "desfazer") api.desfazer(); else if (c === "refazer") api.refazer();
      enviar(api); });
    ch.subscribe(function (st) { if (aoMudar) aoMudar(st === "SUBSCRIBED" ? "esperando" : st === "CHANNEL_ERROR" || st === "TIMED_OUT" ? "erro" : st); });
    TIMER = setInterval(function () { enviar(api); if (aoMudar && ULT && Date.now() - ULT > 20000) aoMudar("esperando"); }, 500);
    var base = location.href.replace(/[^/]*([?#].*)?$/, ""); return {codigo: CODIGO, link: base + "controle.html?c=" + CODIGO};
  }
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function enviar(api) { if (!CANAL) return; try { CANAL.send({type: "broadcast", event: "estado", payload: {t: Math.round(api.T() * 100) / 100, total: Math.round(api.total() * 100) / 100, tocando: !!api.tocando()}}); } catch (e) {} }
  function desligar() { clearInterval(TIMER); TIMER = 0; ULT = 0; if (CANAL) { try { CANAL.unsubscribe(); } catch (e) {} try { sb().removeChannel(CANAL); } catch (e) {} } CANAL = null; CODIGO = ""; }
  /* ---- no celular: manda comandos, recebe o tempo ---- */
  function celular(cod, aoEstado, aoMudar) { cod = String(cod || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); if (cod.length !== 6) return null;
    var ch = canal(cod); if (!ch) return null; CANAL = ch; CODIGO = cod;
    ch.on("broadcast", {event: "estado"}, function (m) { ULT = Date.now(); if (aoEstado) aoEstado(m.payload || {}); if (aoMudar) aoMudar("conectado"); });
    ch.subscribe(function (st) { if (aoMudar) aoMudar(st === "SUBSCRIBED" ? "procurando" : st === "CHANNEL_ERROR" || st === "TIMED_OUT" ? "erro" : st); });
    TIMER = setInterval(function () { if (aoMudar && ULT && Date.now() - ULT > 3000) aoMudar("procurando"); }, 1000);
    return {enviar: function (c, extra) { try { ch.send({type: "broadcast", event: "cmd", payload: Object.assign({c: c}, extra || {})}); } catch (e) {} }}; }
  /* ---- janela no PC: QR code + código + situação ---- */
  var QR = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
  function qr(txt) { return new Promise(function (ok) { var fazer = function () { try { var q = window.qrcode(0, "M"); q.addData(txt); q.make(); ok(q.createDataURL(6, 2)); } catch (e) { ok(null); } };
    if (window.qrcode) return fazer(); var sc = document.createElement("script"); sc.src = QR; sc.onload = fazer; sc.onerror = function () { ok(null); }; document.head.appendChild(sc); }); }
  function painel(api) {
    var f = document.getElementById("bwcPainel"); if (f) { f.remove(); desligar(); return; }
    f = document.createElement("div"); f.id = "bwcPainel"; f.setAttribute("role", "dialog"); f.setAttribute("aria-label", "Controle pelo celular");
    f.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9400;width:min(330px,92vw);background:#10141c;border:1px solid #7C5CFF;border-radius:18px;padding:16px;color:#F5F1EA;font-family:Inter,system-ui,sans-serif;box-shadow:0 22px 60px rgba(0,0,0,.7)";
    var r = ligar(api, function (st) { var e = document.getElementById("bwcEstado"); if (e) { e.textContent = st === "conectado" ? "🟢 CELULAR LIGADO" : st === "esperando" ? "🟡 ESPERANDO O CELULAR…" : st === "erro" ? "🔴 SEM CONEXÃO (internet?)" : "…"; } });
    if (!r) { f.innerHTML = '<b style="font:800 12px Inter;letter-spacing:.1em">📱 CONTROLE PELO CELULAR</b><p style="font-size:13px;color:#9aa3b2">Precisa de internet para ligar o celular ao editor.</p><button type="button" id="bwcFechar" style="min-height:36px;border-radius:10px;border:1px solid #444;background:transparent;color:#fff;font:800 11px Inter;padding:0 12px">FECHAR</button>';
      document.body.appendChild(f); document.getElementById("bwcFechar").onclick = function () { f.remove(); }; return; }
    f.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="font:800 12px Inter;letter-spacing:.1em;flex:1">📱 CONTROLE PELO CELULAR</b><button type="button" id="bwcFechar" aria-label="Desligar o controle" style="min-height:30px;border-radius:9px;border:1px solid #444;background:transparent;color:#fff;font:800 11px Inter;padding:0 10px">✕ DESLIGAR</button></div>' +
      '<div style="display:flex;gap:12px;align-items:center"><div id="bwcQr" style="width:132px;height:132px;flex:none;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;color:#333;font-size:11px">QR…</div>' +
      '<div><small style="color:#9aa3b2;font:700 10px Inter;letter-spacing:.1em">CÓDIGO</small><div id="bwcCodigo" style="font:800 26px Inter,monospace;letter-spacing:.2em">' + r.codigo + '</div><div id="bwcEstado" style="font:800 10.5px Inter;letter-spacing:.06em;margin-top:6px">🟡 ESPERANDO O CELULAR…</div></div></div>' +
      '<p style="font-size:12px;color:#9aa3b2;line-height:1.45;margin:10px 0 0">Aponte a câmera do celular para o QR (ou abra <b style="color:#fff">controle.html</b> no site e digite o código). Vai só o comando e o tempo; o vídeo não sai do computador.</p>';
    document.body.appendChild(f); document.getElementById("bwcFechar").onclick = function () { f.remove(); desligar(); };
    qr(r.link).then(function (u) { var q = document.getElementById("bwcQr"); if (q) q.innerHTML = u ? '<img alt="QR code do controle" src="' + u + '" style="width:124px;height:124px">' : '<span style="padding:8px;text-align:center">Sem QR (internet?) — use o código</span>'; });
    window.__bwcLink = r.link;
  }
  window.BWControle = {painel: painel, ligar: ligar, desligar: desligar, celular: celular, codigo: function () { return CODIGO; }};
})();
