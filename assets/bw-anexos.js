/* BW ANEXOS (16/11/2026, Claude) — junta os ANEXOS (PDFs e fotos guardados no bucket privado) no FIM de um relatório
   feito com pdfMake. Usa pdf-lib (MIT), carregado só quando precisa. Os anexos abrem por link temporário do dono
   (BWSync.urlSegura — PENTE FINO 17). Nada é enviado: tudo é montado no aparelho.
   Uso: await BWAnexos.baixar(docDefinicaoPdfMake, [{nome, url}], "arquivo.pdf") → {paginas, anexados, falhas} */
(function () {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
  var carregando = null;
  function carregarLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!carregando) carregando = new Promise(function (ok, erro) {
      var s = document.createElement("script"); s.src = LIB; s.onload = function () { ok(window.PDFLib); };
      s.onerror = function () { carregando = null; erro(new Error("sem internet para montar os anexos")); }; document.head.appendChild(s);
    });
    return carregando;
  }
  function comTempo(p, ms) { return Promise.race([p, new Promise(function (_, e) { setTimeout(function () { e(new Error("tempo esgotado")); }, ms); })]); }
  function bufferDe(def) {
    return new Promise(function (ok, erro) {
      try { window.pdfMake.createPdf(def).getBuffer(function (b) { ok(new Uint8Array(b)); }); } catch (e) { erro(e); }
    });
  }
  async function bytesDoAnexo(a) {
    var url = a.url;
    if (window.BWSync && window.BWSync.urlSegura) { try { url = await window.BWSync.urlSegura(url); } catch (e) { } }
    if (!url) throw new Error("sem link");
    var r = await comTempo(fetch(url), 30000);
    if (!r.ok) throw new Error("HTTP " + r.status);
    var tipo = (r.headers.get("content-type") || "").toLowerCase();
    var b = new Uint8Array(await r.arrayBuffer());
    if (/pdf/.test(tipo) || /\.pdf($|\?)/i.test(a.nome || a.url) || (b[0] === 0x25 && b[1] === 0x50)) tipo = "pdf";
    else if (/png/.test(tipo) || (b[0] === 0x89 && b[1] === 0x50)) tipo = "png";
    else if (/jpe?g/.test(tipo) || (b[0] === 0xff && b[1] === 0xd8)) tipo = "jpg";
    return { tipo: tipo, bytes: b };
  }
  /* devolve os bytes do PDF final (relatório + anexos) */
  async function montar(def, anexos) {
    var base = await bufferDe(def);
    anexos = (anexos || []).filter(function (a) { return a && a.url; });
    if (!anexos.length) return { bytes: base, anexados: 0, falhas: [], paginas: null };
    var L = await carregarLib(), doc = await L.PDFDocument.load(base), anexados = 0, falhas = [];
    var fonte = await doc.embedFont(L.StandardFonts.Helvetica);
    for (var i = 0; i < anexos.length; i++) {
      var a = anexos[i];
      try {
        var x = await bytesDoAnexo(a);
        if (x.tipo === "pdf") {
          var outro = await L.PDFDocument.load(x.bytes, { ignoreEncryption: true });
          var pgs = await doc.copyPages(outro, outro.getPageIndices());
          pgs.forEach(function (p) { doc.addPage(p); });
        } else if (x.tipo === "png" || x.tipo === "jpg") {
          var im = x.tipo === "png" ? await doc.embedPng(x.bytes) : await doc.embedJpg(x.bytes);
          var pg = doc.addPage([595.28, 841.89]), m = 36, esc = Math.min((595.28 - 2 * m) / im.width, (841.89 - 2 * m - 24) / im.height, 1);
          pg.drawText(String(a.nome || "Anexo").slice(0, 90), { x: m, y: 841.89 - m, size: 10, font: fonte });
          pg.drawImage(im, { x: (595.28 - im.width * esc) / 2, y: 841.89 - m - 18 - im.height * esc, width: im.width * esc, height: im.height * esc });
        } else throw new Error("formato não suportado");
        anexados++;
      } catch (e) { falhas.push((a.nome || "anexo") + " (" + (e.message || e) + ")"); }
    }
    var bytes = await doc.save();
    return { bytes: bytes, anexados: anexados, falhas: falhas, paginas: doc.getPageCount() };
  }
  function baixarBytes(bytes, nome) {
    var blob = new Blob([bytes], { type: "application/pdf" }), a = document.createElement("a"), url = URL.createObjectURL(blob);
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  async function baixar(def, anexos, nome, semBaixar) {
    var r = await montar(def, anexos);
    window.__ultimoPDF = { nome: nome, bytes: r.bytes.length, anexados: r.anexados, falhas: r.falhas, paginas: r.paginas };   // testes
    if (!semBaixar) baixarBytes(r.bytes, nome);
    return r;
  }
  window.BWAnexos = { baixar: baixar, montar: montar };
})();
