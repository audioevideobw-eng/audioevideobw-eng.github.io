/* ASSINAR COM CERTIFICADO DIGITAL (16/11/2026, Claude) — certificado A1 (.pfx/.p12, ICP-Brasil e-CNPJ/e-CPF).
   TUDO NO APARELHO: o arquivo do certificado e a senha nunca saem do navegador (sem fetch/upload/BWSync aqui — o vigia confere).
   A senha é pedida a cada assinatura e nunca é guardada. "Lembrar o certificado neste aparelho" (opcional) guarda só o arquivo
   .pfx — que continua trancado pela senha — no IndexedDB "bw_cert" deste navegador; ESQUECER apaga.
   Bibliotecas (carregadas só quando precisa): node-forge (BSD/GPL — PKCS#12 com 3DES/RC2 antigos + CMS) e pdf-lib (MIT).
   Assinatura: PDF com campo de assinatura, /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached, SHA-256, cadeia de certificados
   do arquivo; o Acrobat e o validador do ITI reconhecem. Carimbo visível opcional na última página. */
(function () {
  "use strict";
  var LIB_FORGE = "https://cdn.jsdelivr.net/npm/node-forge@1.4.4/dist/forge.min.js";
  var LIB_PDF = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
  var ESPACO = 24576; /* bytes reservados para a assinatura (cadeia ICP-Brasil cabe com folga) */

  function carregar(src, pronto) {
    if (pronto()) return Promise.resolve();
    return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("sem internet para carregar a ferramenta de assinatura")); }; document.head.appendChild(s); });
  }
  function libs() { return Promise.all([carregar(LIB_FORGE, function () { return !!(window.forge && forge.pkcs12); }), carregar(LIB_PDF, function () { return !!window.PDFLib; })]); }

  function binStr(u8) { var s = "", i, n = 8192; for (i = 0; i < u8.length; i += n) s += String.fromCharCode.apply(null, u8.subarray(i, i + n)); return s; }
  function u8(x) { return x instanceof Uint8Array ? x : new Uint8Array(x); }
  function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
  function fmtDoc(d) { d = soDigitos(d); if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"); if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4"); return d; }
  function dois(n) { return (n < 10 ? "0" : "") + n; }
  function dataBR(d) { return dois(d.getDate()) + "/" + dois(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function horaBR(d) { return dois(d.getHours()) + ":" + dois(d.getMinutes()); }
  function fusoPdf(d) { var m = -d.getTimezoneOffset(), s = m >= 0 ? "+" : "-"; m = Math.abs(m); return s + dois(Math.floor(m / 60)) + "'" + dois(m % 60) + "'"; }
  function dataPdf(d) { return "D:" + d.getFullYear() + dois(d.getMonth() + 1) + dois(d.getDate()) + dois(d.getHours()) + dois(d.getMinutes()) + dois(d.getSeconds()) + fusoPdf(d); }
  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  /* ===== 1) abrir o certificado (.pfx) com a senha ===== */
  function abrirCertificado(pfx, senha) {
    var p12;
    try { p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(binStr(u8(pfx))), false, senha || ""); }
    catch (e) { var m = String(e && e.message || e); if (/password|MAC|decrypt|Invalid/i.test(m)) throw new Error("SENHA"); throw new Error("ARQUIVO"); }
    var chaves = (p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] || []).concat(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] || []);
    var certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || []).map(function (b) { return b.cert; }).filter(Boolean);
    if (!chaves.length || !chaves[0].key) throw new Error("SEM_CHAVE");
    var chave = chaves[0].key, meu = certs.filter(function (c) { return c.publicKey && c.publicKey.n && c.publicKey.n.equals(chave.n); })[0];
    if (!meu) throw new Error("SEM_CERT");
    var cn = (meu.subject.getField("CN") || {}).value || "", partes = cn.split(":"), nome = partes[0].trim(), doc = soDigitos(partes[1] || "");
    if (!doc) { /* ICP-Brasil também guarda CNPJ/CPF em outros campos; o CN "NOME:DOCUMENTO" é o comum */ var m2 = cn.match(/(\d{11,14})/); if (m2) doc = m2[1]; }
    var emissor = (meu.issuer.getField("CN") || {}).value || (meu.issuer.getField("O") || {}).value || "";
    var cadeia = [meu].concat(certs.filter(function (c) { return c !== meu; }));
    return { chave: chave, cert: meu, cadeia: cadeia, nome: nome || cn, doc: doc, docFmt: fmtDoc(doc), tipo: doc.length === 14 ? "e-CNPJ" : doc.length === 11 ? "e-CPF" : "", emissor: emissor, inicio: meu.validity.notBefore, fim: meu.validity.notAfter, vencido: new Date() > meu.validity.notAfter, aindaNao: new Date() < meu.validity.notBefore };
  }

  /* ===== 2) PDF com lugar reservado para a assinatura ===== */
  async function prepararPdf(pdf, info, op) {
    var P = window.PDFLib, doc = await P.PDFDocument.load(u8(pdf), { updateMetadata: false }), agora = op.agora || new Date();
    var paginas = doc.getPages(), pag = paginas[paginas.length - 1], sz = pag.getSize(), ctx = doc.context, rect = [0, 0, 0, 0];
    if (op.carimbo !== "nao") {
      var fonte = await doc.embedFont(P.StandardFonts.Helvetica), negrito = await doc.embedFont(P.StandardFonts.HelveticaBold);
      /* acima do rodapé (o orçamento usa ~54 pt embaixo); "pagina" = página de assinatura nova no fim (nunca cobre nada) */
      var w = 236, h = 58, mx = 28, x = op.carimbo === "esquerda" ? mx : sz.width - w - mx, y = 60;
      if (op.carimbo === "pagina") {
        pag = doc.addPage([sz.width, sz.height]); x = 48; y = sz.height - 48 - h - 30;
        pag.drawText("PAGINA DE ASSINATURA DIGITAL", { x: 48, y: sz.height - 60, size: 13, font: negrito, color: P.rgb(0.12, 0.12, 0.12) });
        pag.drawText("Este documento foi assinado com certificado digital ICP-Brasil. Paginas: " + paginas.length + " + esta.", { x: 48, y: sz.height - 76, size: 8.5, font: fonte, color: P.rgb(0.3, 0.3, 0.3) });
      }
      var linhas = [["Assinado digitalmente por", 7, fonte], [semAcento(info.nome).slice(0, 44), 8.4, negrito], [(info.tipo ? info.tipo.replace("e-", "") + " " : "") + info.docFmt, 7.4, fonte], ["Data: " + dataBR(agora) + " " + horaBR(agora) + " (" + fusoPdf(agora).replace(/'/g, "").replace(/(\d\d)(\d\d)$/, "$1:$2") + ")", 7, fonte], ["Certificado ICP-Brasil - valide em validar.iti.gov.br", 6.2, fonte]];
      pag.drawRectangle({ x: x, y: y, width: w, height: h, color: P.rgb(1, 1, 1), opacity: 0.92, borderColor: P.rgb(0.12, 0.43, 0.24), borderWidth: 0.9 });
      pag.drawRectangle({ x: x, y: y, width: 4, height: h, color: P.rgb(0.12, 0.43, 0.24) });
      var ty = y + h - 11; linhas.forEach(function (l) { pag.drawText(l[0], { x: x + 10, y: ty, size: l[1], font: l[2], color: P.rgb(0.12, 0.12, 0.12) }); ty -= l[1] + 3.2; });
      rect = [x, y, x + w, y + h];
    }
    var sigDict = ctx.obj({
      Type: "Sig", Filter: "Adobe.PPKLite", SubFilter: "adbe.pkcs7.detached",
      ByteRange: P.PDFArray.withContext(ctx),
      Contents: P.PDFHexString.of("0".repeat(ESPACO * 2)),
      Reason: P.PDFString.of(semAcento(op.motivo || "Assinatura do documento")),
      Name: P.PDFString.of(semAcento(info.nome)),
      Location: P.PDFString.of(semAcento(op.local || "")),
      M: P.PDFString.of(dataPdf(agora))
    });
    var br = sigDict.get(P.PDFName.of("ByteRange")); br.push(P.PDFNumber.of(0)); for (var k = 0; k < 3; k++) br.push(P.PDFName.of("**********"));
    var sigRef = ctx.register(sigDict);
    var n = 1, form = doc.catalog.lookup(P.PDFName.of("AcroForm"));
    if (form && form.lookup(P.PDFName.of("Fields"))) n = form.lookup(P.PDFName.of("Fields")).size() + 1;
    var widget = ctx.obj({ Type: "Annot", Subtype: "Widget", FT: "Sig", Rect: rect, V: sigRef, T: P.PDFString.of("Assinatura" + n), F: 132, P: pag.ref });
    var wRef = ctx.register(widget), annots = pag.node.lookup(P.PDFName.of("Annots"));
    if (annots) annots.push(wRef); else pag.node.set(P.PDFName.of("Annots"), ctx.obj([wRef]));
    if (form) { var campos = form.lookup(P.PDFName.of("Fields")); if (campos) campos.push(wRef); else form.set(P.PDFName.of("Fields"), ctx.obj([wRef])); form.set(P.PDFName.of("SigFlags"), P.PDFNumber.of(3)); }
    else doc.catalog.set(P.PDFName.of("AcroForm"), ctx.obj({ Fields: [wRef], SigFlags: 3 }));
    return u8(await doc.save({ useObjectStreams: false, addDefaultPage: false }));
  }

  /* ===== 3) assinar (CMS detached, SHA-256) e encaixar ===== */
  function achar(buf, txt, de) { var a = new TextEncoder().encode(txt); outer: for (var i = de || 0; i <= buf.length - a.length; i++) { for (var j = 0; j < a.length; j++) if (buf[i + j] !== a[j]) continue outer; return i; } return -1; }
  async function assinarPdf(pdf, pfx, senha, op) {
    op = op || {}; await libs();
    var info = abrirCertificado(pfx, senha);
    if (info.vencido && !op.aceitarVencido) throw new Error("VENCIDO");
    var buf = await prepararPdf(pdf, info, op);
    var marcaBR = "/ByteRange [ 0 /********** /********** /********** ]", iBR = achar(buf, marcaBR);
    if (iBR < 0) throw new Error("PDF_PLACEHOLDER");
    var iC = achar(buf, "/Contents <", iBR > 2000 ? iBR - 2000 : 0); if (iC < 0) throw new Error("PDF_PLACEHOLDER");
    var ini = iC + "/Contents ".length, fim = ini + ESPACO * 2 + 2; /* "<" + hex + ">" */
    var faixas = [0, ini, fim, buf.length - fim], novoBR = "/ByteRange [" + faixas.join(" ") + "]";
    if (novoBR.length > marcaBR.length) throw new Error("PDF_PLACEHOLDER");
    novoBR += " ".repeat(marcaBR.length - novoBR.length);
    buf.set(new TextEncoder().encode(novoBR), iBR);
    var dados = new Uint8Array(faixas[1] + faixas[3]); dados.set(buf.subarray(0, faixas[1]), 0); dados.set(buf.subarray(faixas[2]), faixas[1]);
    var p7 = forge.pkcs7.createSignedData(); p7.content = forge.util.createBuffer(binStr(dados));
    info.cadeia.forEach(function (c) { p7.addCertificate(c); });
    p7.addSigner({ key: info.chave, certificate: info.cert, digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime, value: op.agora || new Date() }] });
    p7.sign({ detached: true });
    var hex = forge.util.bytesToHex(forge.asn1.toDer(p7.toAsn1()).getBytes());
    if (hex.length > ESPACO * 2) throw new Error("GRANDE");
    hex += "0".repeat(ESPACO * 2 - hex.length);
    buf.set(new TextEncoder().encode(hex), ini + 1);
    info.chave = null; /* não fica nada da chave em memória além do necessário */
    return { pdf: buf, info: { nome: info.nome, doc: info.docFmt, tipo: info.tipo, emissor: info.emissor, fim: info.fim, vencido: info.vencido } };
  }

  /* ===== 4) lembrar só o ARQUIVO do certificado neste aparelho (opcional) ===== */
  function db() { return new Promise(function (ok, erro) { if (!window.indexedDB) return erro(new Error("sem IndexedDB")); var r = indexedDB.open("bw_cert", 1); r.onupgradeneeded = function () { r.result.createObjectStore("c"); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); }; }); }
  async function guardado() { try { var d = await db(); return await new Promise(function (ok) { var q = d.transaction("c").objectStore("c").get("pfx"); q.onsuccess = function () { ok(q.result || null); }; q.onerror = function () { ok(null); }; }); } catch (e) { return null; } }
  async function guardar(v) { var d = await db(); return new Promise(function (ok) { var t = d.transaction("c", "readwrite"); if (v) t.objectStore("c").put(v, "pfx"); else t.objectStore("c").delete("pfx"); t.oncomplete = function () { ok(); }; t.onerror = function () { ok(); }; }); }

  /* ===== 5) janela ===== */
  var CSS = ".bwa-fundo{position:fixed;inset:0;z-index:9000;background:rgba(5,7,12,.72);display:flex;align-items:center;justify-content:center;padding:14px}" +
    ".bwa-cx{width:min(520px,100%);max-height:92vh;overflow:auto;background:#10141d;border:1px solid rgba(232,194,106,.35);border-radius:18px;padding:20px;color:#e9e6dd;font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.5);position:relative}" +
    ".bwa-cx h3{margin:0 0 4px;font:800 18px Inter,system-ui,sans-serif;letter-spacing:.03em;color:#E8C26A}.bwa-sub{color:#a8a397;font-size:13px;margin:0 0 12px}" +
    ".bwa-x{position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;font-size:16px;cursor:pointer}" +
    ".bwa-l{display:block;margin:10px 0 4px;font:700 11px Inter,sans-serif;letter-spacing:.08em;color:#E8C26A;text-transform:uppercase}" +
    ".bwa-in{width:100%;box-sizing:border-box;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0a0d14;color:#fff;font-size:16px}" +
    ".bwa-ch{display:flex;flex-wrap:wrap;gap:8px}.bwa-ch button,.bwa-b{padding:10px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.04);color:#fff;font:700 12px Inter,sans-serif;letter-spacing:.05em;cursor:pointer;touch-action:manipulation}" +
    ".bwa-ch button.on{border-color:#E8C26A;background:rgba(232,194,106,.16);color:#E8C26A}.bwa-b.pri{background:linear-gradient(180deg,#E8C26A,#C9A227);color:#14110a;border:0}" +
    ".bwa-cert{border:1px solid rgba(46,160,90,.45);background:rgba(46,160,90,.08);border-radius:12px;padding:10px 12px;margin:8px 0}.bwa-cert.ruim{border-color:rgba(255,107,107,.55);background:rgba(255,107,107,.08)}" +
    ".bwa-msg{margin-top:10px;font-weight:700}.bwa-msg.erro{color:#FF6B6B}.bwa-msg.ok{color:#5BD08A}.bwa-acoes{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}" +
    ".bwa-chk{display:flex;gap:8px;align-items:flex-start;margin-top:10px;font-size:13px;color:#cfcabd}.bwa-chk input{width:18px;height:18px;margin-top:2px}";
  function estilo() { if (document.getElementById("bwaCss")) return; var s = document.createElement("style"); s.id = "bwaCss"; s.textContent = CSS; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var MSG = { SENHA: "Senha incorreta. Confira e tente de novo (maiúsculas contam).", ARQUIVO: "Este arquivo não é um certificado .pfx/.p12 válido.", SEM_CHAVE: "O arquivo não tem a chave para assinar (precisa ser o certificado A1 completo, .pfx).", SEM_CERT: "Não achei o certificado que combina com a chave dentro do arquivo.", VENCIDO: "Este certificado está VENCIDO — a assinatura não teria validade. Renove o certificado.", PDF_PLACEHOLDER: "Não deu para preparar este PDF para assinatura.", GRANDE: "A cadeia do certificado é grande demais para o espaço reservado." };

  async function abrir(op) {
    estilo(); op = op || {};
    var salvo = await guardado(), arq = null, nomeArq = "", carimbo = op.carimbo || "direita", resultado = null;
    var f = document.createElement("div"); f.className = "bwa-fundo"; f.setAttribute("role", "dialog"); f.setAttribute("aria-label", "Assinar com certificado digital");
    function fechar() { var s = f.querySelector("#bwaSenha"); if (s) s.value = ""; f.remove(); document.removeEventListener("keydown", tecla); }
    function tecla(e) { if (e.key === "Escape") fechar(); }
    function desenhar() {
      var temSalvo = !!(salvo && salvo.pfx), usandoSalvo = temSalvo && !arq;
      f.innerHTML = '<div class="bwa-cx"><button type="button" class="bwa-x" data-w="fechar" aria-label="Fechar">✕</button><h3>🔏 Assinar com certificado</h3>' +
        '<p class="bwa-sub">Certificado digital A1 (arquivo .pfx ou .p12). O arquivo e a senha <b>não saem deste aparelho</b> — a assinatura é feita aqui mesmo.</p>' +
        (resultado ? '<div class="bwa-cert"><b>✓ PDF assinado</b><br>' + esc(resultado.info.nome) + (resultado.info.doc ? " · " + esc(resultado.info.tipo.replace("e-", "") + " " + resultado.info.doc) : "") + '<br><span style="color:#a8a397;font-size:12px">Emitido por ' + esc(resultado.info.emissor) + " · válido até " + dataBR(resultado.info.fim) + '</span></div><div class="bwa-acoes"><button type="button" class="bwa-b pri" data-w="baixar">⇩ BAIXAR PDF ASSINADO</button>' + (navigator.share ? '<button type="button" class="bwa-b" data-w="compartilhar">COMPARTILHAR</button>' : "") + '<button type="button" class="bwa-b" data-w="fechar">FECHAR</button></div><p class="bwa-sub" style="margin-top:10px">Abra no Adobe Acrobat (ou em validar.iti.gov.br) para ver a assinatura. Qualquer alteração no PDF depois disso invalida a assinatura.</p></div>' :
        '<span class="bwa-l">Certificado</span>' +
        (usandoSalvo ? '<div class="bwa-cert">📁 ' + esc(salvo.nome || "certificado.pfx") + ' <span style="color:#a8a397">(lembrado neste aparelho)</span></div><div class="bwa-ch"><button type="button" data-w="escolher">USAR OUTRO</button><button type="button" data-w="esquecer">ESQUECER DESTE APARELHO</button></div>'
          : '<div class="bwa-ch"><button type="button" class="' + (arq ? "on" : "") + '" data-w="escolher">' + (arq ? "📁 " + esc(nomeArq) : "ESCOLHER ARQUIVO .PFX") + "</button></div>" +
            '<label class="bwa-chk"><input type="checkbox" id="bwaLembrar"' + (op.lembrarPadrao ? " checked" : "") + '> <span>Lembrar o certificado neste aparelho (só o arquivo, que continua trancado pela senha; a senha é pedida sempre)</span></label>') +
        '<input type="file" id="bwaArq" accept=".pfx,.p12,application/x-pkcs12" hidden>' +
        '<span class="bwa-l">Senha do certificado</span><input class="bwa-in" id="bwaSenha" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite a senha">' +
        '<span class="bwa-l">Carimbo da assinatura (última página, acima do rodapé)</span><div class="bwa-ch">' + [["direita", "CANTO DIREITO"], ["esquerda", "CANTO ESQUERDO"], ["pagina", "PÁGINA NOVA NO FIM"], ["nao", "SEM CARIMBO"]].map(function (c) { return '<button type="button" data-w="carimbo" data-v="' + c[0] + '" class="' + (carimbo === c[0] ? "on" : "") + '">' + c[1] + "</button>"; }).join("") + "</div>" +
        '<span class="bwa-l">Motivo</span><input class="bwa-in" id="bwaMotivo" value="' + esc(op.motivo || "Proposta comercial") + '">' +
        '<div class="bwa-msg" id="bwaMsg"></div><div class="bwa-acoes"><button type="button" class="bwa-b pri" data-w="assinar">🔏 ASSINAR</button><button type="button" class="bwa-b" data-w="fechar">CANCELAR</button></div></div>');
      var s = f.querySelector("#bwaSenha"); if (s) { s.onkeydown = function (e) { if (e.key === "Enter") acao("assinar"); }; }
      var inp = f.querySelector("#bwaArq"); if (inp) inp.onchange = async function () { var a = this.files && this.files[0]; this.value = ""; if (!a) return; arq = new Uint8Array(await a.arrayBuffer()); nomeArq = a.name; desenhar(); var s2 = f.querySelector("#bwaSenha"); if (s2) s2.focus(); };
    }
    function msg(t, tipo) { var m = f.querySelector("#bwaMsg"); if (m) { m.className = "bwa-msg " + (tipo || ""); m.textContent = t; } }
    async function acao(w, el) {
      if (w === "fechar") return fechar();
      if (w === "escolher") return f.querySelector("#bwaArq").click();
      if (w === "esquecer") { await guardar(null); salvo = null; desenhar(); return; }
      if (w === "carimbo") { carimbo = el.dataset.v; f.querySelectorAll('[data-w="carimbo"]').forEach(function (b) { b.classList.toggle("on", b === el); }); return; }
      if (w === "baixar" && resultado) { var b = new Blob([resultado.pdf], { type: "application/pdf" }), u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = resultado.nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 8000); return; }
      if (w === "compartilhar" && resultado) { try { await navigator.share({ files: [new File([resultado.pdf], resultado.nome, { type: "application/pdf" })], title: resultado.nome }); } catch (e) { } return; }
      if (w === "assinar") {
        var pfx = arq || (salvo && salvo.pfx), senhaEl = f.querySelector("#bwaSenha"), senha = senhaEl ? senhaEl.value : "";
        if (!pfx) return msg("Escolha o arquivo do certificado (.pfx).", "erro");
        if (!senha) return msg("Digite a senha do certificado.", "erro");
        msg("Assinando…"); var btn = f.querySelector('[data-w="assinar"]'); if (btn) btn.disabled = true;
        try {
          var pdf = typeof op.pdf === "function" ? await op.pdf() : op.pdf; if (pdf instanceof Blob) pdf = new Uint8Array(await pdf.arrayBuffer());
          var r = await assinarPdf(pdf, pfx, senha, { carimbo: carimbo, motivo: (f.querySelector("#bwaMotivo") || {}).value, local: op.local });
          senhaEl.value = ""; senha = "";
          var lembrar = f.querySelector("#bwaLembrar"); if (arq && lembrar && lembrar.checked) { await guardar({ pfx: arq, nome: nomeArq, em: Date.now() }); }
          resultado = { pdf: r.pdf, info: r.info, nome: (op.nome || "documento.pdf").replace(/\.pdf$/i, "") + "-assinado.pdf" };
          desenhar(); if (op.aoAssinar) try { op.aoAssinar(resultado); } catch (e) { }
        } catch (e) { senhaEl.value = ""; if (btn) btn.disabled = false; var c = e && e.message; msg(MSG[c] || ("Não deu para assinar: " + (c || e)), "erro"); if (c === "SENHA") senhaEl.focus(); }
      }
    }
    f.addEventListener("click", function (e) { var b = e.target.closest("[data-w]"); if (b) acao(b.dataset.w, b); else if (e.target === f) fechar(); });
    document.addEventListener("keydown", tecla);
    desenhar(); document.body.appendChild(f);
    var s3 = f.querySelector(salvo && salvo.pfx ? "#bwaSenha" : '[data-w="escolher"]'); if (s3) s3.focus();
    return f;
  }

  window.BWAssinar = { abrir: abrir, assinarPdf: assinarPdf, abrirCertificado: function (pfx, senha) { return libs().then(function () { var i = abrirCertificado(pfx, senha); delete i.chave; return i; }); }, esquecer: function () { return guardar(null); }, LIB_FORGE: LIB_FORGE };
})();
