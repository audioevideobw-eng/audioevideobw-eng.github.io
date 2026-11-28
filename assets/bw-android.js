/* BW para Android (app Capacitor, docs/app-android). Só roda dentro do app (user agent com "BW-Android").
   - some o que só faz sentido na web (.so-web: baixar o app, instalar no celular) e o login pelo Google
     (o Google recusa login dentro de app; no app entra-se com e-mail e senha);
   - download de arquivo feito na página (<a download> com blob:/data:) vira arquivo de verdade: grava no
     cache do app em pedaços e abre o COMPARTILHAR do Android (salvar na galeria, Arquivos, WhatsApp…).
   Nada vai para a internet: o arquivo sai do próprio aparelho. */
(function () {
  "use strict";
  if (!/BW-Android/.test(navigator.userAgent) || window.__bwAndroid) return;
  window.__bwAndroid = true;
  var R = document.documentElement;
  R.classList.add("bw-android");
  try {
    var st = document.createElement("style");
    st.textContent = "html.bw-android .so-web,html.bw-android #lGoogle,html.bw-android .bw-no-android{display:none!important}";
    (document.head || R).appendChild(st);
  } catch (e) { }

  function P(n) { var C = window.Capacitor; return C && C.Plugins && C.Plugins[n]; }
  function aviso(t, erro) { try { if (window.BWAviso) { erro ? BWAviso.erro(t) : BWAviso(t, "", erro === 0 ? 0 : undefined); return; } } catch (e) { } }

  function b64(buf) {
    var s = "", b = new Uint8Array(buf), i, P1 = 0x8000;
    for (i = 0; i < b.length; i += P1) s += String.fromCharCode.apply(null, b.subarray(i, i + P1));
    return btoa(s);
  }
  function nomeLimpo(n) { return (String(n || "arquivo").replace(/[\\/:*?"<>|]+/g, "-").trim() || "arquivo").slice(0, 120); }

  var ocupado = false;
  async function salvar(href, nome) {
    var FS = P("Filesystem"), SH = P("Share");
    if (!FS) return false;
    if (ocupado) { aviso("⏳ Ainda salvando o arquivo anterior"); return true; }
    ocupado = true;
    try {
      aviso("⏳ Preparando o arquivo…", 0);
      var blob = await (await fetch(href)).blob();
      nome = nomeLimpo(nome);
      var PED = 3 * 1024 * 1024, pos = 0, primeiro = true;
      while (pos < blob.size || primeiro) {
        var dados = b64(await blob.slice(pos, pos + PED).arrayBuffer());
        if (primeiro) await FS.writeFile({ path: nome, data: dados, directory: "CACHE" });
        else await FS.appendFile({ path: nome, data: dados, directory: "CACHE" });
        primeiro = false; pos += PED;
      }
      var u = await FS.getUri({ path: nome, directory: "CACHE" });
      if (window.BWAviso) BWAviso.fechar && BWAviso.fechar();
      if (SH) {
        try { await SH.share({ title: nome, files: [u.uri], dialogTitle: "Salvar ou enviar " + nome }); }
        catch (e) { if (!/cancel/i.test(String(e && e.message))) throw e; }
      } else aviso("✓ Arquivo pronto: " + nome);
      return true;
    } catch (e) {
      aviso("Não consegui salvar o arquivo", true);
      return true;
    } finally { ocupado = false; }
  }

  function trata(a, ev) {
    if (!a || !a.hasAttribute || !a.hasAttribute("download")) return false;
    var h = a.href || "";
    if (!/^(blob:|data:)/.test(h) && !/\.(mp4|mov|webm|png|jpe?g|webp|pdf|zip|docx?|xlsx?|csv|txt|srt|vtt|json|wav|m4a|mp3|cube)(\?|$)/i.test(h)) return false;
    if (!P("Filesystem")) return false;
    if (ev) { ev.preventDefault(); ev.stopImmediatePropagation(); }
    salvar(h, a.getAttribute("download") || h.split("/").pop().split("?")[0]);
    return true;
  }
  /* links de download criados por código e clicados sem entrar na página (o jeito mais comum no site) */
  var clicar = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (trata(this)) return; return clicar.apply(this, arguments); };
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[download]");
    if (a) trata(a, ev);
  }, true);

  /* VOLTAR do Android (24/11, chamado pela MainActivity): fecha o que estiver aberto por cima da página (menu, folha, janela, editor
     em tela cheia) usando o mesmo Esc que todas as ferramentas já entendem. Devolve true se algo fechou; senão a MainActivity volta de página. */
  function assinatura() {
    var vw = innerWidth, vh = innerHeight, s = [], els = document.body ? document.body.getElementsByTagName("*") : [], i, e, cs, r;
    for (i = 0; i < els.length && i < 6000; i++) {
      e = els[i];
      if (e.tagName === "DIALOG" && e.open) { s.push("d" + i); continue; }
      cs = getComputedStyle(e);
      if (cs.position !== "fixed" || cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      r = e.getBoundingClientRect();
      if (r.width * r.height < vw * vh * 0.12) continue;
      s.push(i + ":" + Math.round(r.top) + ":" + Math.round(r.height));
    }
    return s.join("|") + "#" + R.className;
  }
  function voltar() {
    try {
      var antes = assinatura(), alvo = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
      var ev = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
      alvo.dispatchEvent(new KeyboardEvent("keydown", ev));
      alvo.dispatchEvent(new KeyboardEvent("keyup", ev));
      if (alvo !== document && alvo.blur) alvo.blur();
      return assinatura() !== antes;
    } catch (e) { return false; }
  }

  /* VOZ (28/11/2026): o WebView do Android não tem window.speechSynthesis — o assistente ficava mudo no app. A MainActivity oferece a voz do
     próprio Android (BWFalaNativa, BwFala.java) e aqui ela ganha a mesma cara do speechSynthesis do navegador: speak/cancel/getVoices e os
     avisos onstart/onend/onerror. As vozes vêm com o nome do Android (ex.: "pt-br-x-ptd-local" = masculina), que o assistente já sabe ler. */
  function vozNativa() {
    var N = window.BWFalaNativa;
    if (!N || window.speechSynthesis) return;
    var fila = {}, n = 0, lista = null;
    function vozes() {
      if (lista && lista.length) return lista;
      var l = [];
      try { if (N.pronto()) l = JSON.parse(N.vozes() || "[]"); } catch (e) { l = []; }
      lista = l.map(function (v, i) { return { name: v.n, lang: String(v.l || "pt-BR").replace("_", "-"), voiceURI: v.n, localService: !v.r, default: i === 0 }; });
      if (!lista.length) return [{ name: "Voz do Android", lang: "pt-BR", voiceURI: "android", localService: true, default: true }];
      return lista;
    }
    window.__bwFala = function (ev, id) {
      var u = fila[id]; if (!u) return;
      if (ev === "i") { u._comecou = true; if (u.onstart) try { u.onstart({ type: "start", utterance: u }); } catch (e) { } return; }
      delete fila[id];
      var f = ev === "e" ? u.onend : (u.onerror || u.onend);
      if (f) try { f({ type: ev === "e" ? "end" : "error", error: ev === "c" ? "interrupted" : ev === "x" ? "synthesis-failed" : undefined, utterance: u }); } catch (e) { }
    };
    function U(t) { this.text = t == null ? "" : String(t); this.lang = "pt-BR"; this.rate = 1; this.pitch = 1; this.volume = 1; this.voice = null; this.onstart = this.onend = this.onerror = null; }
    U.prototype.addEventListener = function (tipo, fn) { this["on" + tipo] = fn; };
    window.SpeechSynthesisUtterance = U;
    var ss = {
      pending: false, paused: false, onvoiceschanged: null,
      getVoices: vozes,
      speak: function (u) {
        if (!u) return;
        var id = "f" + (++n);
        if (!u.text || u.volume === 0) { fila[id] = u; setTimeout(function () { window.__bwFala("i", id); window.__bwFala("e", id); }, 0); return; }   /* fala muda (destravar): nada a dizer */
        fila[id] = u;
        try { N.falar(id, u.text, +u.rate || 1, +u.pitch || 1, u.voice && u.voice.voiceURI !== "android" ? u.voice.name : ""); }
        catch (e) { window.__bwFala("x", id); }
      },
      cancel: function () { try { N.parar(); } catch (e) { } var f = fila; fila = {}; Object.keys(f).forEach(function (k) { var u = f[k]; if (u.onerror) try { u.onerror({ type: "error", error: "interrupted", utterance: u }); } catch (e) { } }); },
      pause: function () { }, resume: function () { },
      addEventListener: function (tipo, fn) { if (tipo === "voiceschanged") ss.onvoiceschanged = fn; }, removeEventListener: function () { }
    };
    Object.defineProperty(ss, "speaking", { get: function () { try { return !!N.falando(); } catch (e) { return false; } } });
    window.speechSynthesis = ss;
    /* a lista de vozes chega depois que o motor de voz do Android liga (1–2 s) */
    var tent = 0, t = setInterval(function () { tent++; try { if (N.pronto()) { lista = null; vozes(); clearInterval(t); if (ss.onvoiceschanged) ss.onvoiceschanged({ type: "voiceschanged" }); } } catch (e) { } if (tent > 20) clearInterval(t); }, 500);
  }
  try { vozNativa(); } catch (e) { }

  window.BWAndroid = { salvar: salvar, voltar: voltar };
})();
