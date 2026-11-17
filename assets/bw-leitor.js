/* LEITOR DE CONTAS E COMPROVANTES (16/11/2026, Claude) — substitui o leitor antigo (só foto + Tesseract + "maior valor", só para eventos).
   Lê PDF de conta (luz, água, internet, boleto, fatura), foto de cupom/nota/recibo, ou o código de barras/PIX colado, e lança em:
   CONTA A PAGAR (casa_contas) · GASTO DA CASA (casa_orcamento) · GASTO DO NEGÓCIO (neg_fluxo) · CUSTO DE EVENTO (neg_eventos[].gastos).
   Como lê (tudo grátis):
   1) PDF com texto (a maioria das contas digitais) → pdf.js tira o TEXTO EXATO, sem OCR.
   2) Foto (ou PDF escaneado) → Tesseract.js (OCR no aparelho) com a imagem tratada (cinza + contraste + tamanho certo).
   3) Código de barras / QR → ZXing (WebAssembly, no aparelho): boleto (ITF 44) e PIX (QR "copia e cola").
   4) Boleto decodificado pela regra da FEBRABAN: o VALOR (e o VENCIMENTO, nos boletos bancários — nova base de 22/02/2025) saem do
      próprio código, conferidos pelos dígitos verificadores → valor exato mesmo quando a foto está ruim.
   5) Opcional (ligado por padrão quando logado): IA Brightway confere/organiza — recebe SÓ o texto lido, sem a imagem, com CPF/CNPJ,
      CEP, e-mail, telefone e números longos tapados. Sem login/sem internet, as regras do aparelho bastam.
   A imagem/PDF não sai do aparelho — exceto CUSTO DE EVENTO, em que o comprovante vai para o bucket PRIVADO eventos-docs (como antes). */
(function () {
  "use strict";
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var LIB_PDF = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
  var LIB_PDF_W = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  var LIB_ZX = "https://cdn.jsdelivr.net/npm/zxing-wasm@2/dist/iife/reader/index.js";
  var LIB_TESS = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function dois(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()); }
  function hoje() { return ymd(new Date()); }
  function br(s) { var p = String(s || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  function moeda(v) { return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function sa(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }
  function num(x) { var s = String(x || "").replace(/[^\d,.-]/g, ""); if (!s) return 0; if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
  function ui(k, p) { try { var v = localStorage.getItem("ui_leitor_" + k); return v == null ? p : JSON.parse(v); } catch (e) { return p; } }
  function uiSet(k, v) { try { localStorage.setItem("ui_leitor_" + k, JSON.stringify(v)); } catch (e) { } }
  function script(src, pronto) { if (pronto()) return Promise.resolve(); return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("sem internet para carregar " + src.split("/")[4])); }; document.head.appendChild(s); }); }
  function comTempo(p, ms, msg) { return Promise.race([p, new Promise(function (_, erro) { setTimeout(function () { erro(new Error(msg || "demorou demais")); }, ms); })]); }

  /* ================= BOLETO (FEBRABAN) ================= */
  function mod10(s) { var soma = 0, peso = 2; for (var i = s.length - 1; i >= 0; i--) { var n = +s[i] * peso; soma += n > 9 ? Math.floor(n / 10) + (n % 10) : n; peso = peso === 2 ? 1 : 2; } var r = soma % 10; return r === 0 ? 0 : 10 - r; }
  function mod11Banco(s) { var soma = 0, peso = 2; for (var i = s.length - 1; i >= 0; i--) { soma += +s[i] * peso; peso = peso === 9 ? 2 : peso + 1; } var r = 11 - (soma % 11); return r === 0 || r === 10 || r === 11 ? 1 : r; }
  function mod11Arrec(s) { var soma = 0, peso = 2; for (var i = s.length - 1; i >= 0; i--) { soma += +s[i] * peso; peso = peso === 9 ? 2 : peso + 1; } var r = soma % 11; return r === 0 || r === 1 ? 0 : 11 - r; }
  var SEGMENTO = { 1: "Prefeitura", 2: "Água", 3: "Energia", 4: "Telefone/Internet", 5: "Órgão do governo", 6: "Carnê", 7: "Multa de trânsito", 9: "Outros" };
  function vencFator(f) {   /* nova base FEBRABAN: 22/02/2025 = 1000 (fator reiniciou); boleto antigo (fator do ciclo anterior) usa a base 07/10/1997 */
    f = +f; if (!f) return "";
    var d = new Date(2025, 1, 22); d.setDate(d.getDate() + (f - 1000));
    var limite = new Date(); limite.setFullYear(limite.getFullYear() + 3);
    if (d > limite) { d = new Date(1997, 9, 7); d.setDate(d.getDate() + f); }
    return ymd(d);
  }
  function boletoDe44(bc) {
    if (!/^\d{44}$/.test(bc)) return null;
    if (bc[0] === "8") {   /* arrecadação (luz, água, telefone, tributos) */
      var id = +bc[2], semDv = bc.slice(0, 3) + bc.slice(4), dv = id === 6 || id === 7 ? mod10(semDv) : mod11Arrec(semDv);
      if (dv !== +bc[3]) return null;
      return { tipo: "arrecadacao", barras: bc, linha: linhaArrec(bc), valor: id === 6 || id === 7 ? +bc.slice(4, 15) / 100 : 0, segmento: SEGMENTO[+bc[1]] || "", vencimento: "" };
    }
    var dvb = mod11Banco(bc.slice(0, 4) + bc.slice(5)); if (dvb !== +bc[4]) return null;
    return { tipo: "bancario", barras: bc, linha: linhaBanco(bc), valor: +bc.slice(9, 19) / 100, vencimento: vencFator(bc.slice(5, 9)), banco: bc.slice(0, 3) };
  }
  function linhaBanco(bc) { var c1 = bc.slice(0, 4) + bc.slice(19, 24), c2 = bc.slice(24, 34), c3 = bc.slice(34, 44); return c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + bc[4] + bc.slice(5, 19); }
  function linhaArrec(bc) { var id = +bc[2], f = id === 6 || id === 7 ? mod10 : mod11Arrec, out = ""; for (var i = 0; i < 4; i++) { var b = bc.slice(i * 11, i * 11 + 11); out += b + f(b); } return out; }
  function boletoDeLinha(d) {
    d = String(d || "").replace(/\D/g, "");
    if (d.length === 44) return boletoDe44(d);
    if (d.length === 48 && d[0] === "8") { var bc = d.slice(0, 11) + d.slice(12, 23) + d.slice(24, 35) + d.slice(36, 47); return boletoDe44(bc); }
    if (d.length === 47) { var bc2 = d.slice(0, 4) + d[32] + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31); return boletoDe44(bc2); }
    return null;
  }
  function acharBoletos(texto) {   /* linhas digitáveis escritas no texto (com pontos/espaços) */
    var achados = [], t = String(texto || "").replace(/[Oo](?=\d)/g, "0"), re = /\d[\d.\s-]{42,75}\d/g, m;
    while ((m = re.exec(t))) {
      var d = m[0].replace(/\D/g, "");
      [48, 47, 44].forEach(function (n) { for (var i = 0; i + n <= d.length && i < 6; i++) { var b = boletoDeLinha(d.slice(i, i + n)); if (b && !achados.some(function (x) { return x.barras === b.barras; })) achados.push(b); } });
    }
    return achados;
  }
  function fmtLinha(b) {
    var l = b.linha;
    if (b.tipo === "arrecadacao") return l.replace(/^(\d{11})(\d)(\d{11})(\d)(\d{11})(\d)(\d{11})(\d)$/, "$1-$2 $3-$4 $5-$6 $7-$8");
    return l.replace(/^(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})$/, "$1.$2 $3.$4 $5.$6 $7 $8");
  }

  /* ================= PIX (QR copia e cola, padrão EMV) ================= */
  function pix(txt) {
    txt = String(txt || "").trim(); if (!/^000201/.test(txt)) return null;
    var o = {}, i = 0; while (i + 4 <= txt.length) { var id = txt.slice(i, i + 2), n = +txt.slice(i + 2, i + 4); if (isNaN(n)) break; o[id] = txt.slice(i + 4, i + 4 + n); i += 4 + n; }
    return { valor: num(o["54"] || 0), nome: (o["59"] || "").trim(), cidade: (o["60"] || "").trim(), copiaECola: txt };
  }

  /* ================= LEITURA DO TEXTO ================= */
  var EMPRESAS = [["CEMIG", "Energia"], ["ENEL", "Energia"], ["LIGHT", "Energia"], ["COPEL", "Energia"], ["CELESC", "Energia"], ["CPFL", "Energia"], ["NEOENERGIA", "Energia"], ["COELBA", "Energia"], ["EQUATORIAL", "Energia"], ["ENERGISA", "Energia"], ["ELEKTRO", "Energia"],
    ["COPASA", "Água"], ["SABESP", "Água"], ["CEDAE", "Água"], ["SANEPAR", "Água"], ["EMBASA", "Água"], ["COMPESA", "Água"], ["CAGECE", "Água"], ["SANEAGO", "Água"], ["CORSAN", "Água"], ["AEGEA", "Água"],
    ["GASMIG", "Gás"], ["COMGAS", "Gás"], ["NATURGY", "Gás"], ["VIVO", "Telefone"], ["CLARO", "Internet"], ["TIM ", "Telefone"], ["OI ", "Internet"], ["NET ", "Internet"], ["SKY", "Internet"], ["ALGAR", "Internet"], ["BRISANET", "Internet"], ["DESKTOP", "Internet"],
    ["UNIMED", "Plano de saúde"], ["AMIL", "Plano de saúde"], ["HAPVIDA", "Plano de saúde"], ["NUBANK", "Cartão de crédito"], ["ITAUCARD", "Cartão de crédito"], ["FATURA DO CART", "Cartão de crédito"], ["CONDOM", "Condomínio"], ["ALUGUEL", "Aluguel"], ["IPTU", "IPTU"], ["IPVA", "IPVA"], ["DETRAN", "Detran"]];
  var RE_VAL = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/g;
  function valoresDaLinha(l) { var out = [], m; RE_VAL.lastIndex = 0; while ((m = RE_VAL.exec(l))) out.push(num(m[1])); return out.filter(function (v) { return v > 0 && v < 1000000; }); }
  function dataBR(s) { var m = String(s).match(/(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})/); if (!m) return ""; var a = m[3].length === 2 ? 2000 + +m[3] : +m[3]; if (+m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31 || a < 2000 || a > 2100) return ""; return a + "-" + m[2] + "-" + m[1]; }
  function lerTexto(texto) {
    var linhas = String(texto || "").split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean), r = { valor: 0, vencimento: "", data: "", empresa: "", conta: "", referencia: "", tipo: "" };
    var T = sa(linhas.join(" \n "));
    /* valor: as linhas que dizem que é o total */
    var chaves = [/total a pagar|valor a pagar|valor total a pagar|total da fatura|valor cobrado|valor do documento|total geral|valor total/, /(^|\s)total(\s|:|$)|valor pago|pagamento de/];
    chaves.some(function (re) {
      for (var i = 0; i < linhas.length; i++) { var s = sa(linhas[i]); if (!re.test(s)) continue; var v = valoresDaLinha(linhas[i]); if (!v.length && linhas[i + 1]) v = valoresDaLinha(linhas[i + 1]); if (v.length) { r.valor = v[v.length - 1]; return true; } }
      return false;
    });
    if (!r.valor) { var todos = []; linhas.forEach(function (l) { if (!/cnpj|cpf|cep|tel|fone|aliq|icms|pis|cofins|desconto|troco/i.test(sa(l))) todos = todos.concat(valoresDaLinha(l)); }); if (todos.length) r.valor = Math.max.apply(null, todos); }
    /* vencimento */
    for (var i = 0; i < linhas.length && !r.vencimento; i++) { var s = sa(linhas[i]); if (/venc|vence em|pagar ate|pague ate/.test(s)) { r.vencimento = dataBR(linhas[i].slice(Math.max(0, s.search(/venc|vence|pagar|pague/)))) || dataBR(linhas[i + 1] || ""); } }
    /* data (cupom/recibo): primeira data válida que não seja vencimento */
    for (var j = 0; j < linhas.length && !r.data; j++) { var d = dataBR(linhas[j]); if (d && d !== r.vencimento) r.data = d; }
    /* referência */
    var mr = T.match(/(?:mes de referencia|referente (?:a|ao mes de)|referencia|ref\.|competencia|conta de)\s*:?\s*([a-z]{3,9}\s*[\/ -]\s*\d{2,4}|\d{2}\s*\/\s*\d{4})/);
    if (mr) r.referencia = mr[1].replace(/\s+/g, "").toUpperCase();
    /* empresa / tipo de conta */
    var TU = linhas.join(" ").toUpperCase() + " ";
    EMPRESAS.some(function (e) { if (TU.indexOf(e[0]) >= 0) { r.empresa = e[0].trim(); r.conta = e[1]; return true; } return false; });
    if (!r.conta && window.BWLanca) r.conta = BWLanca.nomeConta(T);
    if (!r.empresa) { var l0 = linhas.filter(function (l) { return /[A-Za-zÀ-ÿ]{3}/.test(l) && !/cupom|nota fiscal|documento auxiliar|cnpj|cpf|endere|^rua|^av/i.test(l); })[0]; if (l0) r.empresa = l0.slice(0, 40); }
    r.tipo = /cupom fiscal|nfc-?e|nota fiscal de consumidor|documento auxiliar da nota|comprovante de (pagamento|venda)|recibo|extrato/.test(T) ? "gasto" : (r.vencimento || /boleto|fatura|conta de (luz|agua|energia)|linha digitavel|pagavel/.test(T)) ? "conta" : "";
    return r;
  }

  /* ================= IA (só o texto, sem dados pessoais) ================= */
  function tapar(t) {
    return String(t || "").replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, "[CNPJ]").replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF]").replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[EMAIL]")
      .replace(/\(\d{2}\)\s?9?\d{4}-?\d{4}/g, "[TEL]").replace(/\d[\d .-]{9,}\d/g, "[NÚMERO]").replace(/\d{5}-\d{3}/g, "[CEP]");
  }
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return (s && s.data && s.data.session) || null; } catch (e) { return null; } }
  async function conferirIA(texto) {
    var s = await sessao(); if (!s) return null;
    var sistema = 'Você lê textos de contas, boletos, faturas, cupons fiscais e recibos brasileiros (o texto veio de PDF ou de OCR e pode ter erros). ' +
      'Responda SÓ com JSON: {"tipo":"conta"|"gasto","empresa":"","descricao":"","valor":0,"vencimento":"AAAA-MM-DD ou vazio","data":"AAAA-MM-DD ou vazio","referencia":"MÊS/ANO ou vazio","categoria":""}. ' +
      'valor = TOTAL A PAGAR (não use subtotais, impostos, consumo em kWh nem valores de meses anteriores). conta = algo a pagar até um vencimento; gasto = algo já pago (cupom, recibo). ' +
      'descricao curta (ex.: "Energia — CEMIG", "Supermercado BH", "Internet — Claro"). categoria uma de: ' + (window.BWLanca ? BWLanca.CAT_CASA.join(", ") : "Outros") + '. Nunca invente: se não achar, deixe vazio ou 0.';
    try {
      var r = await comTempo(fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: sistema, pedido: tapar(texto).slice(0, 3500), max: 400 }) }), 20000, "IA demorou");
      var j = await r.json().catch(function () { return {}; }); if (!r.ok || !j.texto) return null;
      var t = String(j.texto).replace(/```(json)?/g, ""), a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0) return null;
      return JSON.parse(t.slice(a, b + 1));
    } catch (e) { return null; }
  }

  /* ================= ARQUIVO → texto + códigos ================= */
  async function pdfLib() { var m = await import(LIB_PDF); m.GlobalWorkerOptions.workerSrc = LIB_PDF_W; return m; }
  async function zx() { await script(LIB_ZX, function () { return !!window.ZXingWASM; }); return window.ZXingWASM; }
  async function codigos(fonte) {   /* boleto (ITF) e QR (PIX/NFC-e) — nunca trava a leitura */
    try {
      var Z = await comTempo(zx(), 20000, "leitor de código demorou");
      var rs = await comTempo(Z.readBarcodes(fonte, { formats: ["ITF", "QRCode"], tryHarder: true, maxNumberOfSymbols: 4 }), 20000, "leitor de código demorou");
      return (rs || []).filter(function (x) { return x && x.text; }).map(function (x) { return { formato: x.format, texto: x.text }; });
    } catch (e) { return []; }
  }
  function imagemData(canvas) { return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height); }
  async function bitmap(blob) {
    if (/heic|heif/i.test(blob.type) || /\.hei[cf]$/i.test(blob.name || "")) { if (!window.heic2any) await script("https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js", function () { return !!window.heic2any; }); blob = await heic2any({ blob: blob, toType: "image/jpeg", quality: 0.92 }); }
    var url = URL.createObjectURL(blob); try { return await new Promise(function (ok, erro) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { erro(new Error("imagem não abriu")); }; im.src = url; }); } finally { setTimeout(function () { URL.revokeObjectURL(url); }, 4000); }
  }
  function tratar(img) {   /* cinza + contraste + tamanho bom para OCR (lado maior ~2000 px) */
    var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height, k = Math.min(2.5, 2000 / Math.max(w, h)), c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k); var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, c.width, c.height);
    var d = x.getImageData(0, 0, c.width, c.height), p = d.data, min = 255, max = 0, i, g;
    for (i = 0; i < p.length; i += 4) { g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = g; if (g < min) min = g; if (g > max) max = g; }
    var esc2 = 255 / Math.max(40, max - min); for (i = 0; i < p.length; i += 4) { g = Math.max(0, Math.min(255, (p[i] - min) * esc2)); p[i] = p[i + 1] = p[i + 2] = g; }
    x.putImageData(d, 0, 0); return c;
  }
  async function ocr(canvas, aoProgresso) {
    await script(LIB_TESS, function () { return !!window.Tesseract; });
    var r = await comTempo(Tesseract.recognize(canvas, "por", { logger: function (m) { if (m.status === "recognizing text") aoProgresso(Math.round((m.progress || 0) * 100)); } }), 120000, "a leitura da foto demorou demais");
    return (r && r.data && r.data.text) || "";
  }
  async function lerArquivo(f, passo) {
    var out = { texto: "", codigos: [], origem: "" };
    if (/pdf/i.test(f.type) || /\.pdf$/i.test(f.name || "")) {
      passo("Abrindo o PDF…");
      var P = await comTempo(pdfLib(), 25000, "sem internet para abrir PDF"), doc = await P.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise, partes = [];
      for (var i = 1; i <= Math.min(doc.numPages, 6); i++) {
        var pg = await doc.getPage(i), tc = await pg.getTextContent(), linhas = {}, ys = [];
        tc.items.forEach(function (it) { var y = Math.round(it.transform[5] / 3); if (!linhas[y]) { linhas[y] = []; ys.push(y); } linhas[y].push([it.transform[4], it.str]); });
        ys.sort(function (a, b) { return b - a; }).forEach(function (y) { partes.push(linhas[y].sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; }).join(" ")); });
      }
      out.texto = partes.join("\n"); out.origem = "pdf";
      passo("Procurando código de barras e QR…");
      var p1 = await doc.getPage(1), vp = p1.getViewport({ scale: 2 }), cv = document.createElement("canvas"); cv.width = vp.width; cv.height = vp.height;
      await p1.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise;
      out.codigos = await codigos(imagemData(cv));
      if (out.texto.replace(/\s/g, "").length < 40) { passo("PDF escaneado: lendo como foto…"); out.texto = await ocr(tratar(cv), function (p) { passo("Lendo o PDF escaneado… " + p + "%"); }); out.origem = "pdf-foto"; }
      return out;
    }
    passo("Preparando a foto…");
    var img = await bitmap(f), c = tratar(img);
    passo("Procurando código de barras e QR…");
    out.codigos = await codigos(f);
    if (!out.codigos.length) out.codigos = await codigos(imagemData(c));
    passo("Lendo a foto no aparelho… 0%");
    out.texto = await ocr(c, function (p) { passo("Lendo a foto no aparelho… " + p + "%"); }); out.origem = "foto";
    return out;
  }

  /* ================= juntar tudo ================= */
  function analisar(lido, ia) {
    var t = lerTexto(lido.texto), bol = null, px = null, conf = [];
    lido.codigos.forEach(function (c) { var d = c.texto.replace(/[\s.\-]/g, ""); if (!bol && /^\d{44,48}$/.test(d)) bol = boletoDeLinha(d); if (!bol && /^[\d\s.\-]{44,}$/.test(c.texto.trim())) bol = acharBoletos(c.texto)[0] || null; if (!px) px = pix(c.texto); });
    if (!bol) bol = acharBoletos(lido.texto)[0] || null;
    var r = { descricao: "", valor: t.valor, vencimento: t.vencimento, data: t.data || hoje(), referencia: t.referencia, categoria: "", tipo: t.tipo, codigo: "", linha: "", pix: "", empresa: t.empresa, conta: t.conta };
    if (ia) {
      if (ia.valor && !(bol && bol.valor)) r.valor = num(ia.valor);
      if (ia.vencimento && /^\d{4}-\d{2}-\d{2}$/.test(ia.vencimento) && !(bol && bol.vencimento)) r.vencimento = ia.vencimento;
      if (ia.data && /^\d{4}-\d{2}-\d{2}$/.test(ia.data)) r.data = ia.data;
      if (ia.referencia) r.referencia = ia.referencia; if (ia.tipo) r.tipo = ia.tipo; if (ia.descricao) r.descricao = ia.descricao; if (ia.categoria) r.categoria = ia.categoria; if (ia.empresa && !r.empresa) r.empresa = ia.empresa;
      conf.push("✨ conferido pela IA Brightway");
    }
    if (bol) {
      r.codigo = bol.barras; r.linha = fmtLinha(bol);
      if (bol.valor) { if (r.valor && Math.abs(r.valor - bol.valor) > 0.009) conf.push("⚠ o texto dizia " + moeda(r.valor) + "; vale o do código de barras"); r.valor = bol.valor; conf.push("✓ valor conferido pelo código de barras"); }
      if (bol.vencimento) { r.vencimento = bol.vencimento; conf.push("✓ vencimento conferido pelo código de barras"); }
      if (!r.conta && bol.segmento && /Energia|Água|Telefone/.test(bol.segmento)) r.conta = bol.segmento === "Telefone/Internet" ? "Internet" : bol.segmento;
      r.tipo = r.tipo || "conta";
    }
    if (px) { r.pix = px.copiaECola; if (!r.valor && px.valor) { r.valor = px.valor; conf.push("✓ valor do QR PIX"); } if (!r.empresa && px.nome) r.empresa = px.nome; }
    if (!r.descricao) r.descricao = r.conta ? r.conta + (r.empresa && sa(r.empresa).indexOf(sa(r.conta)) < 0 ? " — " + r.empresa : "") : (r.empresa || "");
    if (!r.categoria && window.BWLanca) r.categoria = r.conta ? "Contas (luz/água/net)" : BWLanca.categoria(r.descricao + " " + lido.texto.slice(0, 400));
    if (lido.origem === "pdf") conf.unshift("✓ lido do PDF (texto exato)"); else if (lido.origem) conf.unshift("📷 lido da foto — confira os números");
    r.conf = conf; return r;
  }

  /* ================= tela ================= */
  var DESTINOS = [["conta", "🧾", "CONTA A PAGAR", "Luz, água, internet, boleto, fatura — entra em Contas a pagar da casa"], ["casa", "🛒", "GASTO DA CASA", "Já pago: mercado, farmácia, combustível — entra no Orçamento da casa"],
    ["negocio", "💼", "GASTO DO NEGÓCIO", "Despesa da empresa — entra no Fluxo de caixa"], ["evento", "🎬", "CUSTO DE EVENTO", "Comprovante de um evento — entra nos custos do evento e no Fluxo"]];
  var EST = { dest: ui("dest", "conta"), arq: null, r: null, lido: null, destTocado: false };
  var CSS = ".lt-dest{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.lt-dest button{min-width:0;text-align:left;padding:12px;border-radius:14px;border:1px solid rgba(245,241,234,.12);background:rgba(255,255,255,.03);color:#F5F1EA;cursor:pointer;touch-action:manipulation}" +
    ".lt-dest button b{display:block;font:800 12px Inter,sans-serif;letter-spacing:.08em;margin-top:4px}.lt-dest button i{font-style:normal;font-size:22px}.lt-dest button small{display:block;color:#a8a397;font-size:11.5px;margin-top:4px;line-height:1.35}" +
    ".lt-dest button.on{border-color:#E8C26A;background:rgba(232,194,106,.12)}.lt-dest button.on b{color:#E8C26A}" +
    ".lt-zona{margin-top:12px;border:2px dashed rgba(232,194,106,.35);border-radius:16px;padding:18px;text-align:center}.lt-zona.sobre{background:rgba(232,194,106,.08)}" +
    ".lt-bts{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:10px}.lt-b{padding:11px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:700 12.5px Inter,sans-serif;letter-spacing:.05em;cursor:pointer;min-height:42px;touch-action:manipulation}" +
    ".lt-b.pri{background:linear-gradient(180deg,#E8C26A,#C9A227);color:#14110a;border:0}.lt-b.ok{background:linear-gradient(180deg,#5FE0A0,#2fb874);color:#06140c;border:0}" +
    ".lt-st{margin-top:10px;font-size:13.5px;color:#cfcabd;min-height:20px}.lt-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.lt-g label{display:block;font-size:12px;color:#a8a397;margin-bottom:4px}" +
    ".lt-g input,.lt-g select,.lt-cod textarea{width:100%;min-width:0;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0a0d14;color:#fff;font-size:16px}" +
    ".lt-conf{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 12px}.lt-conf span{font-size:12px;padding:4px 10px;border-radius:999px;background:rgba(95,224,160,.1);border:1px solid rgba(95,224,160,.3);color:#bdf3d8}.lt-conf span.av{background:rgba(255,181,71,.1);border-color:rgba(255,181,71,.35);color:#ffd99a}" +
    ".lt-linha{font:600 13px ui-monospace,Menlo,monospace;word-break:break-all;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);margin-top:6px}" +
    ".lt-cod textarea{min-height:64px;font:14px ui-monospace,Menlo,monospace}.lt-chk{display:flex;gap:8px;align-items:flex-start;margin-top:12px;font-size:13px;color:#cfcabd;text-align:left}.lt-chk input{width:18px;height:18px;margin-top:1px}.lt-chk,.lt-chk span,.lt-g label{text-transform:none;letter-spacing:normal;font-weight:500}" +
    ".lt-ag{display:flex;align-items:center;gap:14px}.lt-ag .lt-b{white-space:nowrap}" +
    "@media (max-width:760px){.lt-dest{grid-template-columns:repeat(2,minmax(0,1fr))}.lt-g{grid-template-columns:minmax(0,1fr)}.lt-ag{flex-direction:column;align-items:stretch}}";

  function iniciar() {
    var box = $("ocrBox"); if (!box) return;
    if (box.getAttribute("data-lt") === "1") { atualizarEventos(); return; }   /* a sincronia redesenha a página: não perde o que está na tela */
    box.setAttribute("data-lt", "1");
    try { var qd = new URLSearchParams(location.search).get("d"); if (/^(conta|casa|negocio|evento)$/.test(qd || "")) { EST.dest = qd; EST.destTocado = true; } } catch (e) { }
    if (!$("ltCss")) { var st = document.createElement("style"); st.id = "ltCss"; st.textContent = CSS; document.head.appendChild(st); }
    box.innerHTML =
      '<div class="card"><div class="lt-ag"><div style="flex:1"><h3 style="margin:0">🤖 Prefere falar?</h3><div class="sub">"Lance a conta de luz de 250 que vence dia 20", "gastei 30 reais de lanche", "recebi 2.500 da Arte Eventos". O Tio Cláudio (o robô no canto de todas as páginas) entende e lança — e ainda conta como está o seu dia.</div></div><button type="button" class="lt-b pri" id="ltFalar">🎙 FALAR COM O TIO CLÁUDIO</button></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>1 · O que é?</h3><div class="lt-dest" id="ltDest" role="radiogroup" aria-label="Onde lançar">' + DESTINOS.map(function (d) { return '<button type="button" role="radio" data-d="' + d[0] + '"><i aria-hidden="true">' + d[1] + "</i><b>" + d[2] + "</b><small>" + d[3] + "</small></button>"; }).join("") + "</div>" +
      '<div id="ltEvBox" style="margin-top:10px" hidden><label class="sub" for="ltEvento">Evento</label><select id="ltEvento" style="width:100%;max-width:460px"></select></div></div>' +
      '<div class="card" style="margin-top:14px"><h3>2 · A conta, o boleto ou o comprovante</h3><div class="sub">PDF da conta (o mais exato), foto do papel, ou cole o código de barras / PIX. A leitura é feita no aparelho.</div>' +
      '<div class="lt-zona" id="ltZona"><div>Arraste o arquivo aqui</div><div class="lt-bts"><button type="button" class="lt-b pri" data-a="foto">📷 TIRAR FOTO</button><button type="button" class="lt-b" data-a="arquivo">📁 ESCOLHER PDF OU FOTO</button><button type="button" class="lt-b" data-a="colar">⌨ COLAR CÓDIGO</button></div>' +
      '<input type="file" id="ltFoto" accept="image/*" capture="environment" hidden><input type="file" id="ltArq" accept="application/pdf,.pdf,image/*,.heic,.heif" hidden>' +
      '<div class="lt-cod" id="ltCodBox" hidden style="margin-top:12px;text-align:left"><label class="sub" for="ltCod">Linha digitável do boleto, código de barras ou PIX copia e cola</label><textarea id="ltCod" inputmode="numeric" placeholder="83600000001-2 50000000000-1 …"></textarea><div class="lt-bts" style="justify-content:flex-start"><button type="button" class="lt-b pri" data-a="lerCod">LER O CÓDIGO</button></div></div>' +
      '<label class="lt-chk"><input type="checkbox" id="ltIA"' + (ui("ia", true) ? " checked" : "") + '> <span>✨ Conferir com a IA Brightway — manda só o TEXTO lido (sem a imagem, com CPF, CNPJ, CEP, telefone e e-mail tapados). Precisa estar logado.</span></label>' +
      '<div class="lt-st" id="ltSt" aria-live="polite"></div></div></div>' +
      '<div class="card" style="margin-top:14px" id="ltRes" hidden></div>';
    marcarDest(); atualizarEventos();
    box.addEventListener("click", clique);
    $("ltFoto").onchange = function () { var f = this.files && this.files[0]; this.value = ""; if (f) lerArq(f); };
    $("ltArq").onchange = function () { var f = this.files && this.files[0]; this.value = ""; if (f) lerArq(f); };
    $("ltIA").onchange = function () { uiSet("ia", this.checked); };
    $("ltEvento").onchange = function () { uiSet("ev", this.value); };
    $("ltFalar").onclick = function () { if (window.BWAgente) BWAgente.abrir(true); };
    var z = $("ltZona");
    ["dragenter", "dragover"].forEach(function (n) { z.addEventListener(n, function (e) { e.preventDefault(); z.classList.add("sobre"); }); });
    ["dragleave", "drop"].forEach(function (n) { z.addEventListener(n, function (e) { e.preventDefault(); z.classList.remove("sobre"); }); });
    z.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) lerArq(f); });
  }
  function atualizarEventos() {
    var s = $("ltEvento"); if (!s || !window.BWLanca) return; var atual = s.value || ui("ev", "");
    var evs = BWLanca.eventos().slice(0, 60);
    s.innerHTML = evs.length ? evs.map(function (e) { return '<option value="' + esc(e.id) + '"' + (String(e.id) === String(atual) ? " selected" : "") + ">" + esc(e.nome) + (e.data ? " · " + br(e.data) : "") + "</option>"; }).join("") : '<option value="">— nenhum evento cadastrado —</option>';
  }
  function marcarDest() {
    document.querySelectorAll("#ltDest [data-d]").forEach(function (b) { var on = b.dataset.d === EST.dest; b.classList.toggle("on", on); b.setAttribute("aria-checked", on ? "true" : "false"); });
    var eb = $("ltEvBox"); if (eb) eb.hidden = EST.dest !== "evento";
    if (EST.r) mostrar();
  }
  function passo(t) { var s = $("ltSt"); if (s) s.innerHTML = '<span class="spin"></span> ' + esc(t); }
  async function lerArq(f) {
    EST.arq = f; EST.r = null; $("ltRes").hidden = true;
    try {
      var buf = await f.arrayBuffer(); f = new File([buf], f.name || "arquivo", { type: f.type || "" }); EST.arq = f;   /* cópia na memória: no iPhone o original some depois do seletor (pente fino 47) */
      var lido = await lerArquivo(f, passo); EST.lido = lido;
      var ia = null; if ($("ltIA").checked && lido.texto.trim()) { passo("Conferindo com a IA Brightway (só o texto)…"); ia = await conferirIA(lido.texto); }
      EST.r = analisar(lido, ia);
      if (!EST.destTocado) { if (EST.r.tipo === "conta" && EST.dest !== "evento") EST.dest = "conta"; else if (EST.r.tipo === "gasto" && EST.dest === "conta") EST.dest = "casa"; marcarDest(); }
      $("ltSt").innerHTML = EST.r.valor ? "✓ Lido! Confira abaixo e toque em ✓ LANÇAR." : "Não achei o valor com segurança — preencha abaixo.";
      mostrar();
    } catch (e) {
      $("ltSt").innerHTML = "⚠️ " + esc(e.message || e) + " — preencha abaixo à mão.";
      EST.r = { descricao: "", valor: 0, vencimento: "", data: hoje(), categoria: "Outros", conf: [] }; mostrar();
    }
  }
  function lerCodigo() {
    var t = ($("ltCod").value || "").trim(); if (!t) return;
    var lido = { texto: "", codigos: [{ formato: "colado", texto: t }], origem: "" }, d = t.replace(/\D/g, "");
    var r = analisar(lido, null);
    if (!r.codigo && !r.pix) { $("ltSt").innerHTML = "⚠️ Código não reconhecido (" + d.length + " números). Confira se colou a linha inteira (47 ou 48 números) ou o PIX copia e cola."; return; }
    EST.lido = lido; EST.arq = null; EST.r = r; if (!EST.destTocado && r.codigo) { EST.dest = "conta"; marcarDest(); }
    $("ltSt").innerHTML = "✓ Código lido. Complete a descrição e toque em ✓ LANÇAR."; mostrar();
  }
  function mostrar() {
    var r = EST.r, box = $("ltRes"); if (!r || !box) return; box.hidden = false;
    var conta = EST.dest === "conta", dup = r.codigo && window.BWLanca ? BWLanca.contaComCodigo(r.codigo) : null;
    box.innerHTML = '<h3>3 · Confira e lance</h3><div class="lt-conf">' + (r.conf || []).map(function (c) { return "<span" + (/⚠|📷/.test(c) ? ' class="av"' : "") + ">" + esc(c) + "</span>"; }).join("") + "</div>" +
      (dup ? '<div class="note" style="color:#ffd99a">⚠️ Esta conta (mesmo código de barras) já está em Contas a pagar: ' + esc(dup.c0) + " · " + moeda(+dup.c1) + " · vence " + br(dup.c2) + ".</div>" : "") +
      '<div class="lt-g"><div><label for="ltDesc">' + (conta ? "Conta" : "Descrição") + '</label><input id="ltDesc" value="' + esc(r.descricao) + '" placeholder="Ex.: Energia — CEMIG"></div>' +
      '<div><label for="ltVal">Valor (R$)</label><input id="ltVal" type="number" step="0.01" min="0" inputmode="decimal" value="' + (r.valor ? r.valor.toFixed(2) : "") + '"></div>' +
      (conta ? '<div><label for="ltVenc">Vencimento</label><input id="ltVenc" type="date" value="' + esc(r.vencimento || "") + '"></div>' : '<div><label for="ltData">Data</label><input id="ltData" type="date" value="' + esc(r.data || hoje()) + '"></div>') +
      (EST.dest === "casa" ? '<div><label for="ltCat">Categoria</label><select id="ltCat">' + (window.BWLanca ? BWLanca.CAT_CASA : ["Outros"]).map(function (c) { return "<option" + (c === r.categoria ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div>" : "") +
      (conta && r.referencia ? '<div><label>Referência</label><input id="ltRef" value="' + esc(r.referencia) + '"></div>' : "") + "</div>" +
      (r.linha ? '<div style="margin-top:12px"><label class="sub">Linha digitável</label><div class="lt-linha" id="ltLinha">' + esc(r.linha) + '</div><div class="lt-bts" style="justify-content:flex-start"><button type="button" class="lt-b" data-a="copiar" data-v="linha">⧉ COPIAR CÓDIGO</button></div></div>' : "") +
      (r.pix ? '<div style="margin-top:12px"><label class="sub">PIX copia e cola</label><div class="lt-linha">' + esc(r.pix.slice(0, 60)) + '…</div><div class="lt-bts" style="justify-content:flex-start"><button type="button" class="lt-b" data-a="copiar" data-v="pix">⧉ COPIAR PIX</button></div></div>' : "") +
      '<div class="lt-bts" style="justify-content:flex-start;margin-top:14px"><button type="button" class="lt-b ok" data-a="lancar" id="ltLancar">✓ LANÇAR EM ' + esc((DESTINOS.filter(function (d) { return d[0] === EST.dest; })[0] || [])[2] || "") + '</button><button type="button" class="lt-b" data-a="outro">↺ LER OUTRO</button>' +
      (EST.lido && EST.lido.texto ? '<button type="button" class="lt-b" data-a="texto">👁 VER O TEXTO LIDO</button>' : "") + '</div><div class="lt-st" id="ltMsg"></div><pre id="ltTexto" hidden style="white-space:pre-wrap;max-height:240px;overflow:auto;font-size:12px;color:#a8a397;margin-top:10px"></pre>';
  }
  async function lancar(btn) {
    var L = window.BWLanca, msg = $("ltMsg"); if (!L) { msg.textContent = "Recarregue a página (o agente não carregou)."; return; }
    var r = EST.r, desc = ($("ltDesc").value || "").trim(), valor = num($("ltVal").value), venc = $("ltVenc") ? $("ltVenc").value : "", data = $("ltData") ? $("ltData").value || hoje() : hoje();
    if (!(valor > 0)) { msg.innerHTML = "⚠️ Informe o valor."; $("ltVal").focus(); return; }
    if (EST.dest === "conta" && !venc) { msg.innerHTML = "⚠️ Informe o vencimento."; $("ltVenc").focus(); return; }
    var res;
    try {
      if (EST.dest === "conta") res = L.contaPagar({ descricao: desc || "Conta", valor: valor, vencimento: venc, codigo: r.codigo, referencia: $("ltRef") ? $("ltRef").value : r.referencia, origem: "leitor" });
      else if (EST.dest === "casa") res = L.gastoCasa({ descricao: desc || "Gasto", valor: valor, categoria: $("ltCat") ? $("ltCat").value : r.categoria, data: data, origem: "leitor" });
      else if (EST.dest === "negocio") res = L.fluxo({ descricao: desc || "Despesa", valor: valor, data: data, origem: "leitor" });
      else {
        var evId = $("ltEvento").value; if (!evId) { msg.innerHTML = "⚠️ Escolha o evento (passo 1)."; return; }
        btn.disabled = true; msg.innerHTML = '<span class="spin"></span> Guardando o comprovante no arquivo privado do evento…';
        var caminho = await guardarComprovante(evId, EST.arq);
        res = L.custoEvento({ eventoId: evId, descricao: desc || "Custo", valor: valor, data: data, caminho: caminho, origem: "leitor" });
      }
    } catch (e) { btn.disabled = false; msg.innerHTML = "⚠️ " + esc(e.message || e); return; }
    try { if (window.BWConcluir && BWConcluir.festa) BWConcluir.festa(btn, "Lançado em " + res.onde); } catch (e) { }
    $("ltRes").innerHTML = '<h3>✓ Lançado</h3><div class="sub" style="font-size:15px;color:#F5F1EA">' + esc(desc || "") + " · <b>" + moeda(valor) + "</b>" + (venc ? " · vence " + br(venc) : "") + ' — em <a href="' + esc(res.link) + '" style="color:#E8C26A">' + esc(res.onde) + "</a>. Sobe para a sua conta sozinho.</div>" +
      '<div class="lt-bts" style="justify-content:flex-start;margin-top:12px"><button type="button" class="lt-b pri" data-a="outro">＋ LER OUTRA</button></div>';
    EST.r = null; EST.arq = null; EST.lido = null; $("ltSt").innerHTML = "";
  }
  async function guardarComprovante(evId, f) {
    if (!f) return "";
    try {
      var c = window.BWSync && BWSync.cliente && BWSync.cliente(); if (!c) return "";
      var s = await c.auth.getSession(); if (!s || !s.data || !s.data.session) return "";
      if (BWSync.registrarAgora) { try { await BWSync.registrarAgora({ eventos: [String(evId)] }); } catch (e) { } }
      var nome = String(f.name || "comprovante").normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-60), cp = evId + "/comprovantes/" + Date.now() + "_" + nome;
      var up = await comTempo(c.storage.from("eventos-docs").upload(cp, f), 60000, "envio demorou");
      return up && !up.error ? cp : "";
    } catch (e) { return ""; }
  }
  function clique(e) {
    var d = e.target.closest("[data-d]"); if (d) { EST.dest = d.dataset.d; EST.destTocado = true; uiSet("dest", EST.dest); marcarDest(); return; }
    var b = e.target.closest("[data-a]"); if (!b) return; var a = b.dataset.a;
    if (a === "foto") return $("ltFoto").click();
    if (a === "arquivo") return $("ltArq").click();
    if (a === "colar") { var cb = $("ltCodBox"); cb.hidden = !cb.hidden; if (!cb.hidden) $("ltCod").focus(); return; }
    if (a === "lerCod") return lerCodigo();
    if (a === "lancar") return lancar(b);
    if (a === "outro") { EST.r = null; EST.destTocado = false; $("ltRes").hidden = true; $("ltSt").innerHTML = ""; window.scrollTo({ top: $("ltZona").getBoundingClientRect().top + scrollY - 120, behavior: "smooth" }); return; }
    if (a === "texto") { var p = $("ltTexto"); p.hidden = !p.hidden; p.textContent = EST.lido ? EST.lido.texto : ""; return; }
    if (a === "copiar") { var v = b.dataset.v === "pix" ? EST.r && EST.r.pix : EST.r && EST.r.codigo && boletoDe44(EST.r.codigo).linha; if (v && navigator.clipboard) navigator.clipboard.writeText(v).then(function () { b.textContent = "✓ COPIADO"; }); }
  }

  window.BWLeitor = { iniciar: iniciar, boletoDeLinha: boletoDeLinha, acharBoletos: acharBoletos, lerTexto: lerTexto, pix: pix, analisar: analisar, tapar: tapar, fmtLinha: fmtLinha };
})();
