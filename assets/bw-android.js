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

  window.BWAndroid = { salvar: salvar, voltar: voltar };
})();
