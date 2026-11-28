/* BWHeic — foto HEIC/HEIF (a do iPhone) vira JPEG NO APARELHO (28/11/2026; dono, print do app Android: "não abre vídeos com este formato").
   O Safari do iPhone abre HEIC sozinho; o Chrome, o app Android (WebView) e o Edge não. Aqui:
   - eHeic(blob, nome): pelo tipo, pela extensão ou pela assinatura do arquivo (ftypheic/heix/mif1…);
   - converterSePreciso(blob, nome, aoComecar): se o navegador já abre, devolve null (nada muda); senão converte para JPEG e devolve o Blob novo;
   - a biblioteca (heic-to 1.6.7, libheif 1.23.7, LGPL-3.0, sem alteração) só é baixada quando aparece a primeira foto HEIC, com selo de integridade.
   Nada sai do aparelho: a conversão é toda feita aqui. */
(function () {
  "use strict";
  if (window.BWHeic) return;
  var LIB = "https://cdn.jsdelivr.net/npm/heic-to@1.6.7/dist/iife/heic-to.js";
  var SRI = "sha384-f0j56i/85T2+bZ9Y5sSaw7lvxHImEr3LuncAm2tNkfvJdhfcNBPj7ES//QWvXCYC";
  var carregando = null;

  function nomeHeic(n) { return /\.(heic|heif)$/i.test(String(n || "")); }
  async function eHeic(b, nome) {
    if (!b) return false;
    if (/image\/hei[cf]/i.test(b.type || "") || nomeHeic(nome || b.name)) return true;
    try {
      var h = new Uint8Array(await b.slice(4, 12).arrayBuffer());
      var s = String.fromCharCode.apply(null, h);
      return /^ftyp(heic|heix|hevc|hevx|heim|heis|mif1|msf1)/.test(s);
    } catch (e) { return false; }
  }
  function lib() {
    if (window.HeicTo) return Promise.resolve(window.HeicTo);
    if (carregando) return carregando;
    carregando = new Promise(function (ok, erro) {
      var s = document.createElement("script");
      s.src = LIB; s.integrity = SRI; s.crossOrigin = "anonymous"; s.async = true;
      s.onload = function () { window.HeicTo ? ok(window.HeicTo) : erro(new Error("heic_lib")); };
      s.onerror = function () { carregando = null; erro(new Error("heic_sem_rede")); };
      (document.head || document.documentElement).appendChild(s);
    });
    return carregando;
  }
  function abreAqui(b) {   /* o navegador já decodifica? (Safari sim) — pela própria <img>, que é o que as ferramentas usam */
    return new Promise(function (ok) {
      var u = URL.createObjectURL(b), im = new Image(), fim = function (v) { try { URL.revokeObjectURL(u); } catch (e) { } ok(v); };
      im.onload = function () { fim(im.naturalWidth > 0); }; im.onerror = function () { fim(false); };
      setTimeout(function () { fim(false); }, 8000);
      im.src = u;
    });
  }
  async function paraJpeg(b, qualidade) {
    var H = await lib();
    var out = await H({ blob: b, type: "image/jpeg", quality: qualidade || 0.92 });
    if (Array.isArray(out)) out = out[0];
    if (!out || !out.size) throw new Error("heic_vazio");
    return out.type === "image/jpeg" ? out : new Blob([out], { type: "image/jpeg" });
  }
  function nomeJpg(n) { return String(n || "foto").replace(/\.(heic|heif)$/i, "") + ".jpg"; }
  async function converterSePreciso(b, nome, aoComecar) {
    if (!(await eHeic(b, nome))) return null;
    if (await abreAqui(b)) return null;
    if (aoComecar) try { aoComecar(); } catch (e) { }
    return paraJpeg(b);
  }
  window.BWHeic = { eHeic: eHeic, paraJpeg: paraJpeg, converterSePreciso: converterSePreciso, nomeJpg: nomeJpg, abreAqui: abreAqui };
})();
