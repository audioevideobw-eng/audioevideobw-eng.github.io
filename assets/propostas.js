/* GERADOR DE ORÇAMENTO (16/11/2026, Claude) — propostas e recibos com a marca da conta.
   Dados da conta (sincronizam pelo bw-sync, estão em CHAVES): neg_propostas (documentos) e neg_prop_config (empresa, logo, botões, textos).
   Botões = "o que eu sempre faço" (tirados dos orçamentos reais do dono). Prévia ao vivo = mesma estrutura do PDF (pdfMake) e do Word (docx).
   Aprovado → cria o evento (neg_eventos) e o recibo; recibo pode lançar o valor como recebido no evento.
   IA: só a IA Brightway (Edge Function bw-ia), recebe só o texto que a pessoa colou/digitou. Nada sai sozinho. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var FN_TXT = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var LIB = {
    pdf: ["https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js", "https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js"],
    qr: ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"],
    zip: ["https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"],
    docx: ["https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.js"]
  };

  /* ================= DADOS ================= */
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravar(k, v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(k, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + k + "_v1", JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function docs() { return ler("neg_propostas"); }
  function salvarDoc(d) { var l = docs(), i = l.findIndex(function (x) { return x.id === d.id; }); if (i >= 0) l[i] = d; else l.push(d); gravar("neg_propostas", l); }
  function apagarDoc(id) { gravar("neg_propostas", docs().filter(function (x) { return x.id !== id; })); }
  function cfg(id, padrao) { var c = ler("neg_prop_config").filter(function (x) { return x.id === id; })[0]; return c ? c.valor : padrao; }
  function salvarCfg(id, valor) { var l = ler("neg_prop_config").filter(function (x) { return x.id !== id; }); l.push({ id: id, valor: valor }); gravar("neg_prop_config", l); }
  function empresa() { return Object.assign({ fantasia: "", razao: "", cnpj: "", resp: "", tel: "", email: "", site: "", cidade: "", pix: "", pixTipo: "cnpj", cor: "#C9A227", estilo: "classico", titulo: "Proposta para prestação de serviços" }, cfg("empresa", {})); }
  function textos() { return Object.assign({ abertura: "Conforme solicitado, apresentamos proposta para prestação de serviços conforme descrição abaixo:", encerramento: "Agradecemos o seu contato, teremos satisfação em atendê-los." }, cfg("textos", {})); }

  /* ================= DATAS E VALORES ================= */
  function hoje() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }   /* local (PENTE FINO 29) */
  var MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function partes(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? [+m[1], +m[2], +m[3]] : null; }
  function dataBR(iso) { var p = partes(iso); return p ? String(p[2]).padStart(2, "0") + "/" + String(p[1]).padStart(2, "0") + "/" + p[0] : ""; }
  function dataExtenso(iso) { var p = partes(iso); return p ? (p[2] === 1 ? "1º" : p[2]) + " de " + MES[p[1] - 1] + " de " + p[0] : ""; }
  function periodo(a, b) {
    var pa = partes(a), pb = partes(b); if (!pa) return "";
    if (!pb || b === a) return dataBR(a);
    if (pa[0] === pb[0] && pa[1] === pb[1]) return String(pa[2]).padStart(2, "0") + " a " + dataBR(b);
    return dataBR(a) + " a " + dataBR(b);
  }
  function somaDias(iso, n) { var p = partes(iso) || partes(hoje()), d = new Date(p[0], p[1] - 1, p[2] + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function num(v) { if (typeof v === "number") return isFinite(v) ? v : 0; var s = String(v || "").replace(/[^\d,.-]/g, ""); if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); var n = parseFloat(s); return isFinite(n) ? n : 0; }
  function moeda(v) { return num(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function extenso(v) {   /* 8500 → "oito mil e quinhentos reais" */
    v = Math.round(num(v) * 100) / 100; var reais = Math.floor(v), cent = Math.round((v - reais) * 100);
    var U = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"],
      D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"],
      C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
    function ate999(n) { if (n === 0) return ""; if (n === 100) return "cem"; var c = Math.floor(n / 100), r = n % 100, p = []; if (c) p.push(C[c]); if (r) p.push(r < 20 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " e " + U[r % 10] : "")); return p.join(" e "); }
    function grupo(n) {
      if (n === 0) return "zero";
      var esc0 = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]], g = [], i = 0;
      while (n > 0) { g.push(n % 1000); n = Math.floor(n / 1000); }
      var out = [];
      for (i = g.length - 1; i >= 0; i--) { if (!g[i]) continue; var t = i === 1 && g[i] === 1 ? "mil" : ate999(g[i]) + (i ? " " + esc0[i][g[i] === 1 ? 0 : 1] : ""); out.push(t); }
      var ult = g[0]; if (out.length > 1 && ult && (ult < 100 || ult % 100 === 0)) { var l = out.pop(); return out.join(" ") + " e " + l; }
      return out.join(" ");
    }
    var t = reais ? grupo(reais) + (reais === 1 ? " real" : (reais % 1000000 === 0 ? " de reais" : " reais")) : "";
    if (cent) t += (t ? " e " : "") + grupo(cent) + (cent === 1 ? " centavo" : " centavos");
    return t || "zero reais";
  }
  function total(d) {
    var v = d.valor || {};
    if (v.modo === "itens") { var s = (v.itens || []).reduce(function (a, it) { return a + num(it.qtd || 1) * num(it.unit); }, 0); var desc = String(v.desc || "").indexOf("%") >= 0 ? s * num(v.desc) / 100 : num(v.desc); return Math.max(0, s - desc); }
    return num(v.total);
  }
  function proxNumero(pref) {
    var ano = String(new Date().getFullYear()), re = new RegExp("^" + pref + "-" + ano + "-(\\d+)$"), max = 0;
    docs().forEach(function (d) { var m = re.exec(d.numero || ""); if (m) max = Math.max(max, +m[1]); });
    return pref + "-" + ano + "-" + String(max + 1).padStart(3, "0");
  }

  /* ================= BOTÕES (tirados dos orçamentos reais) ================= */
  var OBS_PADRAO = "Valores sujeitos à alteração conforme período e localidade. Não inclui locução profissional, atores ou trilha exclusiva.";
  var BOTOES_PADRAO = [
    { id: "b_video", nome: "VIDEOMAKER / AFTERMOVIE", desc: "Captação 4K + aftermovie 1'30\"", escopo: ["Captação de takes com 01 câmera 4K UHD", "Depoimentos e entrevistas (a combinar)", "01 aftermovie de 1'30\" editado em 4K UHD (horizontal ou vertical), entregue após o evento"],
      equipe: ["01 cinegrafista / editor de vídeo"], equip: ["Câmera mirrorless 4K Canon R", "Notebook para edição", "Gimbal Ronin RS3 Pro", "Lapela dupla para entrevistas e depoimentos", "LED pequeno para iluminação"], obs: [OBS_PADRAO], montagem: "SEM NECESSIDADE", horario: "Diária de serviço", valor: 1950, por: "" },
    { id: "b_foto", nome: "FOTOGRAFIA CORPORATIVA", desc: "Cobertura fotográfica do evento", escopo: ["Cobertura fotográfica de evento corporativo", "Fotos tratadas em alta resolução"], equipe: ["01 fotógrafo"],
      equip: ["Câmera mirrorless Canon R", "Notebook para edição", "Flash profissional"], obs: ["Material entregue via link do Google Drive."], montagem: "SEM NECESSIDADE", horario: "Diária de serviço", valor: 870, por: "por diária" },
    { id: "b_videofoto", nome: "VIDEOMAKER + FOTÓGRAFO", desc: "Vídeo e foto no mesmo evento", escopo: ["Captação de takes com 01 câmera 4K UHD", "Depoimentos e entrevistas (a combinar)", "Aftermovie de 1'30\" editado em 4K UHD (horizontal), entregue ao final do evento", "Cobertura fotográfica do evento"],
      equipe: ["01 cinegrafista / editor de vídeo", "01 fotógrafo"], equip: ["Câmera mirrorless 4K Canon R (vídeo)", "Câmera fotográfica (fotos)", "Notebook para edição", "Gimbal Ronin RS3 Pro", "Lapela dupla para entrevistas e depoimentos", "LED pequeno para iluminação", "Flash profissional"],
      obs: [OBS_PADRAO, "Material entregue via link do Google Drive."], montagem: "SEM NECESSIDADE", horario: "Diária de serviço", valor: 5950, por: "" },
    { id: "b_led", nome: "TRANSMISSÃO PARA TELÃO DE LED", desc: "Multicâmera ao vivo, Full HD", escopo: ["Transmissão ao vivo para telão de LED com 02 câmeras móveis com estabilizador de imagens e transmissor sem fio + 01 câmera fixa no tripé — sinal Full HD"],
      equipe: ["03 cinegrafistas", "01 técnico de vídeo / direção de imagens"], equip: ["01 câmera mirrorless 4K Canon R", "01 câmera Sony FX30", "01 gimbal Ronin RS3 Pro", "01 gimbal Ronin RS3 Mini", "01 câmera Sony NX5 com tripé profissional", "Transmissores de vídeo sem fio", "Mesa de corte (switcher)"],
      obs: [], montagem: "a combinar", ensaio: "Testes/ensaios com equipe completa (a combinar)", horario: "Diária de serviço", valor: 8500, por: "" },
    { id: "b_integra", nome: "GRAVAÇÃO NA ÍNTEGRA (MULTICÂMERA)", desc: "Evento inteiro gravado com áudio", escopo: ["Gravação na íntegra do evento com áudio (horizontal)", "Corte ao vivo entre as câmeras"],
      equipe: ["02 cinegrafistas / diretor de imagens", "01 editor de vídeo"], equip: ["02 câmeras Sony NX5 Full HD", "Ilha de corte", "Notebook para edição"], obs: [OBS_PADRAO], montagem: "a combinar", horario: "Diária de serviço", valor: 2650, por: "" },
    { id: "b_curso", nome: "CURSO / AULA AO VIVO (A → B)", desc: "Gravação e projeção entre salas", objeto: "Gravação e projeção de curso (ponto A → ponto B)", escopo: ["Gravação e projeção de curso (ponto A → ponto B)", "Interação de áudio e imagem entre professor e alunos"],
      equipe: ["01 cinegrafista / gestor operacional"], equip: ["Câmera Sony NX5 ou PTZ Full HD", "Notebook", "Mesa de som com caixa pequena (interação entre as salas)", "Lapela dupla / microfone sem fio", "LED para iluminação (caso seja necessário)", "TV 50 polegadas com suporte", "Equipamentos de áudio e vídeo"],
      obs: [], montagem: "a combinar", horario: "07h às 13h", valor: 5250, por: "por módulo (três dias)" },
    { id: "b_instal", nome: "INSTALAÇÃO TÉCNICA (CHECKLIST)", desc: "Som, vídeo e painel de LED", objeto: "O presente orçamento tem como objeto a prestação de serviços de instalação de equipamentos, conforme descrito neste documento e no projeto aprovado pelo cliente.",
      escopo: [], equipe: ["01 técnico de áudio e vídeo"], equip: [], check: ["Fixar e ligar os equipamentos no rack", "Passar e organizar o cabeamento", "Conferir resolução e sinal de vídeo nas telas", "Testar níveis de áudio (sem clip), ruído e cobertura", "Testar videoconferência e entrada de visitante (vídeo e áudio)"],
      obs: [], montagem: "conforme cronograma", horario: "a combinar", valor: 4500, por: "" }
  ];
  function botoes() { var b = cfg("botoes", null); return Array.isArray(b) && b.length ? b : BOTOES_PADRAO; }
  var SUG = {
    escopo: ["Depoimentos e entrevistas (a combinar)", "Aftermovie vertical (Reels) de 1'", "Gravação na íntegra do evento", "Fotos tratadas em alta resolução", "Imagens aéreas com drone", "Transmissão ao vivo no YouTube", "Legendas no vídeo", "Edição no mesmo dia (same day edit)", "Entrega em até 7 dias úteis"],
    equipe: ["01 cinegrafista", "01 fotógrafo", "01 editor de vídeo", "01 diretor de imagens", "01 técnico de vídeo", "01 operador de áudio", "01 assistente técnico", "01 piloto de drone"],
    equip: ["Câmera mirrorless 4K Canon R", "Câmera Sony FX30", "Câmera Sony NX5 Full HD", "Câmera PTZ Full HD", "Gimbal Ronin RS3 Pro", "Gimbal Ronin RS3 Mini", "Transmissor de vídeo sem fio", "Mesa de corte (switcher)", "Tripé profissional", "Lapela dupla", "Microfone sem fio", "LED pequeno para iluminação", "Kit de iluminação LED", "Flash profissional", "Drone", "Notebook para edição", "TV 50 polegadas com suporte", "Teleprompter"],
    obs: [OBS_PADRAO, "Material entregue via link do Google Drive.", "Alimentação e deslocamento da equipe fora de BH por conta do contratante.", "Horas extras cobradas à parte.", "Direitos de uso das imagens para divulgação do contratante."],
    pagamento: ["Até 15 dias após emissão da NF-e", "50% na assinatura e 50% no dia do evento", "À vista via Pix", "Cartão de crédito em até 3x", "Faturado (boleto)"],
    montagem: ["SEM NECESSIDADE", "a combinar", "no dia anterior"],
    horario: ["Diária de serviço", "Meia diária", "07h às 13h", "a combinar"]
  };

  /* ================= DOCUMENTO ================= */
  function novoDoc(tipo) {
    var e = empresa(), t = textos();
    var d = { id: "pr_" + Date.now() + Math.random().toString(36).slice(2, 6), tipo: tipo || "proposta", numero: "", status: tipo === "recibo" ? "emitido" : "rascunho", criado: hoje(), atualizado: new Date().toISOString(),
      cliente: { trat: "A", nome: "", empresa: "", doc: "", tel: "", email: "" }, objeto: "", escopo: [], equipe: [], equip: [], check: [],
      datas: { ini: "", fim: "", local: "", montagem: "SEM NECESSIDADE", ensaio: "", horario: "Diária de serviço" },
      valor: { modo: "total", total: "", por: "", itens: [], desc: "", mostrar: true }, pagamento: "", validade: 15, obs: [], pix: false, aceite: true,
      estilo: e.estilo || "classico", abertura: t.abertura, encerramento: t.encerramento, botoes: [], leadId: "", eventoId: "", refId: "" };
    if (tipo === "recibo") d.recibo = { valor: "", referente: "", forma: "Pix", data: hoje() };
    return d;
  }
  function juntar(lista, novos) { var vistos = lista.map(function (x) { return x.trim().toLowerCase(); }); (novos || []).forEach(function (n) { if (n && vistos.indexOf(n.trim().toLowerCase()) < 0) { lista.push(n); vistos.push(n.trim().toLowerCase()); } }); return lista; }
  function aplicarBotao(d, b) {
    var vazio = !d.escopo.length && !d.equipe.length && !d.equip.length && !d.check.length;
    if (vazio) { d.escopo = (b.escopo || []).slice(); d.equipe = (b.equipe || []).slice(); d.equip = (b.equip || []).slice(); d.check = (b.check || []).slice(); d.obs = juntar(d.obs.slice(), b.obs); }
    else { juntar(d.escopo, b.escopo); juntar(d.equipe, b.equipe); juntar(d.equip, b.equip); juntar(d.check, b.check); juntar(d.obs, b.obs); }
    if (b.objeto && !d.objeto) d.objeto = b.objeto;
    if (b.montagem && (vazio || !d.datas.montagem)) d.datas.montagem = b.montagem;
    if (b.ensaio && !d.datas.ensaio) d.datas.ensaio = b.ensaio;
    if (b.horario && (vazio || !d.datas.horario)) d.datas.horario = b.horario;
    if (b.pagamento && !d.pagamento) d.pagamento = b.pagamento;
    if (b.valor) {
      if (d.valor.modo === "itens") d.valor.itens.push({ desc: b.nome.charAt(0) + b.nome.slice(1).toLowerCase(), qtd: 1, un: b.por && /di[aá]ria/.test(b.por) ? "diária" : "serviço", unit: b.valor });
      else if (vazio || !num(d.valor.total)) { d.valor.total = b.valor; d.valor.por = b.por || ""; }
      else { d.valor.total = num(d.valor.total) + num(b.valor); }
    }
    d.botoes = juntar(d.botoes || [], [b.nome]);
    return vazio;
  }
  function botaoDoDoc(d, nome) {
    return { id: "b_" + Date.now(), nome: nome.toUpperCase(), desc: (d.escopo[0] || d.objeto || "").slice(0, 40), objeto: d.objeto, escopo: d.escopo.slice(), equipe: d.equipe.slice(), equip: d.equip.slice(), check: d.check.slice(), obs: d.obs.slice(),
      montagem: d.datas.montagem, ensaio: d.datas.ensaio, horario: d.datas.horario, pagamento: d.pagamento, valor: total(d), por: d.valor.por };
  }

  /* ================= MODELO ÚNICO (prévia, PDF e Word usam o mesmo) ================= */
  function saudacao(c) { var nome = [c.nome, c.empresa ? "(" + c.empresa + ")" : ""].filter(Boolean).join(" "); return nome ? (c.trat ? c.trat + ", " : "") + nome : ""; }
  function modelo(d) {
    var e = empresa(), m = { tipo: d.tipo, numero: d.numero || "(sem número)", emp: e, estilo: d.estilo || e.estilo || "classico", cor: e.cor || "#C9A227", logo: cfg("logo", "") };
    m.cidadeData = [e.cidade, dataExtenso(d.tipo === "recibo" ? (d.recibo.data || d.criado) : d.criado)].filter(Boolean).join(", ");
    m.contatos = [e.tel, e.email, e.site].filter(Boolean);
    if (d.tipo === "recibo") {
      var r = d.recibo || {}, v = num(r.valor);
      m.titulo = "Recibo"; m.valor = v; m.extenso = extenso(v);
      m.texto = "Recebemos de " + (saudacao(Object.assign({}, d.cliente, { trat: "" })) || "________________") + (d.cliente.doc ? ", CPF/CNPJ " + d.cliente.doc : "") + ", a importância de " + moeda(v) + " (" + m.extenso + "), referente a " + (r.referente || "prestação de serviços") + ".";
      m.kv = [["Forma de pagamento", r.forma || ""], ["Data do pagamento", dataBR(r.data)]].filter(function (x) { return x[1]; });
      m.emitente = [e.razao || e.fantasia, e.cnpj ? "CNPJ: " + e.cnpj : ""].filter(Boolean);
      return m;
    }
    m.titulo = e.titulo || "Proposta para prestação de serviços";
    m.cliente = saudacao(d.cliente); m.clienteLinhas = [d.cliente.doc ? "CPF/CNPJ: " + d.cliente.doc : "", d.cliente.tel, d.cliente.email].filter(Boolean);
    m.abertura = d.abertura; m.objeto = d.objeto;
    m.secoes = [];
    if (d.escopo.length) m.secoes.push({ tit: "O que será feito", tipo: "lista", itens: d.escopo });
    if (d.check.length) m.secoes.push({ tit: "Checklist de execução", tipo: "check", itens: d.check });
    if (d.equipe.length) m.secoes.push({ tit: "Equipe", tipo: "lista", itens: d.equipe });
    if (d.equip.length) m.secoes.push({ tit: "Equipamentos", tipo: d.equip.length > 3 ? "duas" : "lista", itens: d.equip });
    var dt = d.datas, kv = [];
    if (dt.ini) kv.push([dt.fim && dt.fim !== dt.ini ? "Datas do evento" : "Data do evento", periodo(dt.ini, dt.fim)]);
    if (dt.local) kv.push(["Local", dt.local]);
    if (dt.montagem) kv.push(["Montagem", dt.montagem]);
    if (dt.ensaio) kv.push(["Testes / ensaios", dt.ensaio]);
    if (dt.horario) kv.push(["Horário", dt.horario]);
    if (kv.length) m.secoes.push({ tit: "Datas e local", tipo: "kv", itens: kv });
    var tot = total(d);
    m.inv = { total: tot, por: d.valor.por || "", pagamento: d.pagamento || "", validade: d.validade ? "Proposta válida até " + dataBR(somaDias(d.criado, +d.validade)) : "",
      itens: d.valor.modo === "itens" && d.valor.mostrar !== false ? (d.valor.itens || []).filter(function (i) { return i.desc || num(i.unit); }).map(function (i) { return [i.desc, (num(i.qtd) || 1) + (i.un ? " " + i.un + (num(i.qtd) > 1 && !/s$/.test(i.un) ? "s" : "") : ""), moeda(i.unit), moeda((num(i.qtd) || 1) * num(i.unit))]; }) : [],
      desconto: d.valor.modo === "itens" && d.valor.desc ? (String(d.valor.desc).indexOf("%") >= 0 ? num(d.valor.desc) + "%" : moeda(d.valor.desc)) : "" };
    m.obs = d.obs.filter(Boolean); m.encerramento = d.encerramento; m.aceite = d.aceite !== false;
    m.assina = [e.resp || e.razao || e.fantasia, e.tel].filter(Boolean).join(" – ");
    m.cnpj = e.cnpj; m.pix = d.pix && e.pix && tot > 0 ? pixPayload(e, tot, d.numero) : "";
    return m;
  }
  function paleta(m) {
    var c = m.cor || "#C9A227";
    if (m.estilo === "moderno") return { topo: "#FFFFFF", topoTxt: "#1d222b", faixa: c, tit: c, cli: hexA(c, 0.08), inv: c, invTxt: corContraste(c), rod: "#F3F4F6", rodTxt: "#4b5563" };
    if (m.estilo === "limpo") return { topo: "#FFFFFF", topoTxt: "#111111", faixa: "#111111", tit: "#111111", cli: "#F3F4F6", inv: "#111111", invTxt: "#FFFFFF", rod: "#FFFFFF", rodTxt: "#6b7280" };
    return { topo: "#0B0E14", topoTxt: "#F5F1EA", faixa: c, tit: "#0B0E14", cli: hexA(c, 0.12), inv: "#0B0E14", invTxt: "#FFFFFF", invDestaque: c, rod: "#0B0E14", rodTxt: "#F5F1EA" };
  }
  function hexA(hex, a) { var h = String(hex).replace("#", ""); if (h.length !== 6) return "rgba(0,0,0," + a + ")"; return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + a + ")"; }
  function misturaBranco(hex, a) { var h = String(hex).replace("#", ""); if (h.length !== 6) return "#F3F4F6"; var f = function (i) { var v = parseInt(h.slice(i, i + 2), 16); return Math.round(255 - (255 - v) * a).toString(16).padStart(2, "0"); }; return "#" + f(0) + f(2) + f(4); }
  function corContraste(hex) { var h = String(hex).replace("#", ""); if (h.length !== 6) return "#fff"; var l = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255; return l > 0.62 ? "#111318" : "#FFFFFF"; }

  /* ---------- prévia em HTML (igual ao PDF) ---------- */
  function folhaHTML(m) {
    var p = paleta(m), e = m.emp, h = "";
    h += '<div class="fl"><div class="cab" style="background:' + p.topo + ';color:' + p.topoTxt + '">' + (m.logo ? '<img alt="" src="' + m.logo + '">' : '<b style="font:800 22px Inter,Arial;letter-spacing:.04em">' + esc(e.fantasia || "SUA EMPRESA") + "</b>") +
      '<div class="emp"><b>' + esc(e.fantasia || e.razao || "") + "</b>" + esc([e.razao && e.fantasia ? e.razao : "", e.cnpj ? "CNPJ " + e.cnpj : ""].filter(Boolean).join(" · ")) + "<br>" + esc(m.contatos.join(" · ")) + "</div></div>";
    h += '<div class="faixa" style="background:' + p.faixa + '"></div><div class="corpo">';
    h += '<h1 style="color:' + p.tit + '">' + esc(m.titulo) + '</h1><div class="meta"><span>Nº ' + esc(m.numero) + "</span><span>" + esc(m.cidadeData) + "</span></div>";
    if (m.tipo === "recibo") {
      h += '<div class="inv" style="background:' + p.inv + ";color:" + p.invTxt + '"><div><div class="s">VALOR</div><div class="v"' + (p.invDestaque ? ' style="color:' + p.invDestaque + '"' : "") + ">" + moeda(m.valor) + '</div></div><div class="s" style="max-width:60%;text-align:right">' + esc(m.extenso) + "</div></div>";
      h += '<p class="rec">' + esc(m.texto) + "</p>";
      if (m.kv.length) h += '<div class="kv" style="margin-top:8px">' + m.kv.map(function (x) { return "<span>" + esc(x[0]) + "</span><div>" + esc(x[1]) + "</div>"; }).join("") + "</div>";
      h += '<p style="margin-top:26px">' + esc(m.cidadeData) + '</p><div class="ass" style="grid-template-columns:1fr"><div><div class="linha"></div>' + m.emitente.map(esc).join("<br>") + "</div></div>";
    } else {
      if (m.cliente) h += '<div class="cli" style="background:' + p.cli + '"><b>' + esc(m.cliente) + "</b>" + (m.clienteLinhas.length ? "<br>" + esc(m.clienteLinhas.join(" · ")) : "") + "</div>";
      if (m.abertura) h += "<p>" + esc(m.abertura) + "</p>";
      if (m.objeto) h += '<p style="font-weight:600">' + esc(m.objeto) + "</p>";
      m.secoes.forEach(function (s) {
        h += '<h2 style="color:' + p.tit + '">' + esc(s.tit) + "</h2>";
        if (s.tipo === "kv") h += '<div class="kv">' + s.itens.map(function (x) { return "<span>" + esc(x[0]) + "</span><div>" + esc(x[1]) + "</div>"; }).join("") + "</div>";
        else if (s.tipo === "check") h += '<ul class="chk">' + s.itens.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
        else h += '<ul class="' + (s.tipo === "duas" ? "duas" : "") + '">' + s.itens.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      });
      var inv = m.inv;
      h += '<h2 style="color:' + p.tit + '">Investimento</h2>';
      if (inv.itens.length) h += '<table class="it"><tr><th>Descrição</th><th>Qtd.</th><th class="n">Valor</th><th class="n">Total</th></tr>' + inv.itens.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + '</td><td class="n">' + r[2] + '</td><td class="n">' + r[3] + "</td></tr>"; }).join("") + (inv.desconto ? '<tr><td colspan="3">Desconto</td><td class="n">− ' + esc(inv.desconto) + "</td></tr>" : "") + "</table>";
      h += '<div class="inv" style="background:' + p.inv + ";color:" + p.invTxt + '"><div><div class="s">VALOR DA PROPOSTA</div><div class="v"' + (p.invDestaque ? ' style="color:' + p.invDestaque + '"' : "") + ">" + moeda(inv.total) + "</div>" + (inv.por ? '<div class="s">' + esc(inv.por) + "</div>" : "") + '</div><div class="s" style="text-align:right;max-width:55%">' + [inv.pagamento ? "Pagamento: " + inv.pagamento : "", inv.validade].filter(Boolean).map(esc).join("<br>") + "</div></div>";
      if (m.pix) h += '<div class="pix"><img alt="QR Pix" src="' + (qrDataUrl(m.pix) || "") + '"><div><b>PAGUE COM PIX</b><br>Chave: ' + esc(m.emp.pix) + '<br><span style="word-break:break-all;color:#6b7280;font-size:9.5px">' + esc(m.pix) + "</span></div></div>";
      if (m.obs.length) h += '<h2 style="color:' + p.tit + '">Observações</h2><ul>' + m.obs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
      if (m.encerramento) h += '<p style="margin-top:16px">' + esc(m.encerramento) + "</p>";
      h += '<div class="ass"><div>Atenciosamente,<div class="linha"></div>' + esc(m.assina) + (m.cnpj ? "<br>CNPJ: " + esc(m.cnpj) : "") + "<br>" + esc(m.cidadeData) + "</div>" + (m.aceite ? "<div>De acordo (contratante):<div class=\"linha\"></div>Nome / data</div>" : "<div></div>") + "</div>";
    }
    h += '</div><div class="rod" style="background:' + p.rod + ";color:" + p.rodTxt + '"><span>' + esc([e.email, e.tel].filter(Boolean).join(" · ")) + "</span><span>" + esc(e.cnpj ? "CNPJ: " + e.cnpj : "") + "</span></div></div>";
    return h;
  }

  /* ---------- Pix (BR Code com valor) ---------- */
  function semAcento(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .\-@+]/g, "").toUpperCase(); }
  function campo(id, v) { v = String(v); return id + String(v.length).padStart(2, "0") + v; }
  function crc16(s) { var c = 0xFFFF; for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (var j = 0; j < 8; j++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; c &= 0xFFFF; } return c.toString(16).toUpperCase().padStart(4, "0"); }
  function chavePix(e) {
    var k = String(e.pix || "").trim(), t = e.pixTipo;
    if (t === "cnpj" || t === "cpf") return k.replace(/\D/g, "");
    if (t === "tel") { var d = k.replace(/\D/g, ""); return "+" + (d.length <= 11 ? "55" + d : d); }
    if (t === "email") return k.toLowerCase();
    return k;
  }
  function pixPayload(e, valor, ref) {
    var conta = campo("00", "br.gov.bcb.pix") + campo("01", chavePix(e));
    var txid = String(ref || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
    var p = campo("00", "01") + campo("26", conta) + campo("52", "0000") + campo("53", "986") + (valor > 0 ? campo("54", (Math.round(valor * 100) / 100).toFixed(2)) : "") +
      campo("58", "BR") + campo("59", semAcento(e.razao || e.fantasia || "RECEBEDOR").slice(0, 25)) + campo("60", semAcento(e.cidade.split(/[-,]/)[0] || "BELO HORIZONTE").trim().slice(0, 15)) + campo("62", campo("05", txid)) + "6304";
    return p + crc16(p);
  }
  var QRCACHE = {};
  function qrDataUrl(txt) {
    if (!window.qrcode) return "";
    if (QRCACHE[txt]) return QRCACHE[txt];
    var q = qrcode(0, "M"); q.addData(txt); q.make(); var n = q.getModuleCount(), cel = 6, mg = 4 * cel, c = document.createElement("canvas"); c.width = c.height = n * cel + 2 * mg;
    var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#000";
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(mg + k * cel, mg + r * cel, cel, cel);
    return (QRCACHE[txt] = c.toDataURL("image/png"));
  }

  /* ================= TELA ================= */
  function toast(t) { var d = document.createElement("div"); d.className = "pr-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3800); }
  function ocupado(t) { $("ocup").textContent = t || ""; $("ocup").hidden = !t; }
  function carregar(nome) {
    if ((nome === "pdf" && window.pdfMake && pdfMake.vfs) || (nome === "qr" && window.qrcode) || (nome === "zip" && window.JSZip) || (nome === "docx" && window.docx)) return Promise.resolve();
    return LIB[nome].reduce(function (p, src) { return p.then(function () { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("sem internet")); }; document.head.appendChild(s); }); }); }, Promise.resolve());
  }
  var STATUS = { rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", recusado: "Recusado", emitido: "Recibo" };
  var BUSCA = "", DOC = null;

  function kpis() {
    var l = docs(), mes = hoje().slice(0, 7), ab = 0, apMes = 0, nAp = 0, nRec = 0, recMes = 0;
    l.forEach(function (d) {
      if (d.tipo === "recibo") { if ((d.recibo && d.recibo.data || "").slice(0, 7) === mes) recMes += num(d.recibo.valor); return; }
      if (d.status === "enviado") ab += total(d);
      if (d.status === "aprovado") { nAp++; if ((d.aprovadoEm || d.criado || "").slice(0, 7) === mes) apMes += total(d); }
      if (d.status === "recusado") nRec++;
    });
    var tx = nAp + nRec ? Math.round(nAp / (nAp + nRec) * 100) + "%" : "—";
    $("kpis").innerHTML = [[moeda(ab), "Em aberto (enviados)"], [moeda(apMes), "Aprovado no mês"], [tx, "Taxa de aprovação"], [moeda(recMes), "Recebido no mês"]]
      .map(function (k) { return '<div class="pr-kpi"><b>' + k[0] + "</b><span>" + k[1] + "</span></div>"; }).join("");
  }
  function desenharLista() {
    /* 16/11 (dono): sem valores/indicadores financeiros nesta página (eles ficam no PAINEL FINANCEIRO); as abas mostram as quantidades */
    var kp = $("kpis"); if (kp) { kp.innerHTML = ""; kp.hidden = true; }
    var e = empresa();
    $("avisoEmpresa").innerHTML = !e.cnpj && !e.fantasia && !e.razao ? '<div class="tf-card" style="margin:0 0 12px;border-color:rgba(255,181,71,.45)"><b>Primeiro passo:</b> preencha <b>⚙ MINHA EMPRESA</b> (nome, CNPJ, contatos, logo e chave Pix) — ou toque em <b>⇪ IMPORTAR .DOCX</b> e traga um orçamento seu: a ferramenta copia a logo e os dados da empresa.</div>' : "";
    /* 16/11 (dono): abas PENDENTES / APROVADOS (+ RECUSADOS) que abrem e fecham pela seta, como a AGENDA; o orçamento muda de aba
       sozinho quando a situação muda (igual EVENTOS: Finalizado → REALIZADOS, Agendar → AGENDA). Aberto/fechado fica em ui_prop_abas. */
    $("filtros").innerHTML = '<input class="pr-busca" id="busca" type="search" placeholder="Buscar cliente, número, local…" value="' + esc(BUSCA) + '" aria-label="Buscar">';
    var b = BUSCA.trim().toLowerCase(), todos = docs().filter(function (d) {
      if (!b) return true;
      return [d.numero, d.cliente.nome, d.cliente.empresa, d.datas && d.datas.local, (d.botoes || []).join(" ")].join(" ").toLowerCase().indexOf(b) >= 0;
    }).sort(function (x, c) { return String(c.atualizado || "").localeCompare(String(x.atualizado || "")); });
    var grupos = [
      ["pend", "PENDENTES", todos.filter(function (d) { return d.tipo !== "recibo" && (d.status === "rascunho" || d.status === "enviado"); }), "Nada pendente — todos os orçamentos já tiveram resposta ✨"],
      ["apr", "APROVADOS", todos.filter(function (d) { return d.tipo === "recibo" || d.status === "aprovado" || d.status === "emitido"; }), "Nenhum aprovado ainda — use ✓ APROVADO num orçamento ENVIADO."],
      ["rec", "RECUSADOS", todos.filter(function (d) { return d.tipo !== "recibo" && d.status === "recusado"; }), ""]
    ], ab = abasLista();
    $("lista").innerHTML = !docs().length ? '<div class="pr-vazio">Nenhum orçamento ainda.<br>Toque em <b>＋ NOVO ORÇAMENTO</b> e depois num dos botões (Videomaker, Fotografia, Transmissão para LED…).</div>' :
      grupos.filter(function (g) { return g[0] !== "rec" || g[2].length; }).map(function (g) {
        var aberto = ab[g[0]] !== 0;
        return '<div class="ag-aba-box pr-aba-box ab-' + g[0] + '"><button type="button" class="ag-aba ab-' + g[0] + '" data-a="abaLista" data-v="' + g[0] + '" aria-expanded="' + aberto + '"><span class="nm">' + g[1] + '</span><span class="cont">' + g[2].length + '</span><span class="chev" aria-hidden="true">▸</span></button>' +
          '<div class="pr-aba-corpo" data-corpo="' + g[0] + '"' + (aberto ? "" : " hidden") + '>' + (g[2].length ? '<div class="pr-lista">' + g[2].map(cartao).join("") + "</div>" : '<div class="pr-vazio">' + (b ? "Nada com essa busca." : g[3]) + "</div>") + "</div></div>";
      }).join("");
  }
  function abasLista() { try { return JSON.parse(localStorage.getItem("ui_prop_abas") || "") || { pend: 1, apr: 1, rec: 0 }; } catch (e) { return { pend: 1, apr: 1, rec: 0 }; } }
  function abrirAba(id) { var ab = abasLista(); ab[id] = 1; try { localStorage.setItem("ui_prop_abas", JSON.stringify(ab)); } catch (e) { } }
  function abaDe(d) { return d.tipo === "recibo" || d.status === "aprovado" || d.status === "emitido" ? "apr" : d.status === "recusado" ? "rec" : "pend"; }
  function mostrarCartao(id) { /* a vista segue o orçamento: abre a aba de destino e rola até ele */
    setTimeout(function () { var c = document.querySelector('.pr-card[data-bw-card="' + id + '"]'); if (c && c.scrollIntoView) c.scrollIntoView({ block: "center", behavior: "smooth" }); }, 80);
  }
  function cartao(d) {
    var rec = d.tipo === "recibo", v = rec ? num(d.recibo && d.recibo.valor) : total(d), quem = [d.cliente.nome, d.cliente.empresa].filter(Boolean).join(" · ") || "(sem cliente)";
    var sub = rec ? "Recibo de " + dataBR(d.recibo && d.recibo.data) + (d.recibo && d.recibo.referente ? " · " + d.recibo.referente : "") : [periodo(d.datas.ini, d.datas.fim), d.datas.local, (d.botoes || [])[0]].filter(Boolean).join(" · ");
    var ac = '<button type="button" class="pri" data-a="abrir" data-id="' + d.id + '">ABRIR</button><button type="button" data-a="pdf" data-id="' + d.id + '">PDF</button>';
    if (!rec) {
      if (d.status === "rascunho") ac += '<button type="button" data-a="st" data-v="enviado" data-id="' + d.id + '">ENVIADO</button>';
      if (d.status === "enviado") ac += '<button type="button" data-a="st" data-v="aprovado" data-id="' + d.id + '">✓ APROVADO</button><button type="button" data-a="st" data-v="recusado" data-id="' + d.id + '">RECUSADO</button>';
      if (d.status === "aprovado") ac += '<button type="button" data-a="recibo" data-id="' + d.id + '">RECIBO</button>' + (d.eventoId ? "" : '<button type="button" data-a="evento" data-id="' + d.id + '">CRIAR EVENTO</button>') + '<button type="button" data-a="st" data-v="enviado" data-id="' + d.id + '" title="Volta para PENDENTES">↺ REABRIR</button>';
      if (d.status === "recusado") ac += '<button type="button" data-a="st" data-v="enviado" data-id="' + d.id + '" title="Volta para PENDENTES">↺ REABRIR</button>';
      ac += '<button type="button" data-a="duplicar" data-id="' + d.id + '">DUPLICAR</button>';
    }
    ac += '<button type="button" data-a="excluir" data-id="' + d.id + '" aria-label="Excluir">✕</button>';
    return '<div class="pr-card" data-bw-card="' + esc(d.id) + '"><div class="topo"><span class="num">' + esc(d.numero || "SEM NÚMERO") + '</span><span class="pr-st st-' + d.status + '">' + esc(STATUS[d.status] || d.status) + "</span></div>" +
      "<h4>" + esc(quem) + '</h4><div class="sub">' + esc(sub || "—") + '</div><div class="val">' + moeda(v) + '</div><div class="acoes">' + ac + "</div></div>";
  }

  /* ---------- editor ---------- */
  function abrir(d) {
    DOC = JSON.parse(JSON.stringify(d)); $("vLista").hidden = true; $("vEd").hidden = false; desenharForm(); previa(); window.scrollTo(0, 0);
    try { history.replaceState(null, "", "propostas.html#" + DOC.id); } catch (e) { }
  }
  function fechar() { DOC = null; $("vEd").hidden = true; $("vLista").hidden = false; desenharLista(); try { history.replaceState(null, "", "propostas.html"); } catch (e) { } }
  function campoTxt(rot, k, v, tipo, larg, ph, lista) {
    return '<label class="' + (larg ? "largo" : "") + '"><span>' + rot + "</span>" + (tipo === "textarea" ? '<textarea class="pr-in" data-k="' + k + '" placeholder="' + esc(ph || "") + '">' + esc(v) + "</textarea>" :
      '<input class="pr-in" type="' + (tipo || "text") + '" data-k="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || "") + '"' + (lista ? ' list="' + lista + '"' : "") + ">") + "</label>";
  }
  function listaEd(k, tit, ph) {
    var l = DOC[k] || [], sug = (SUG[k] || []).filter(function (s) { return l.map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) < 0; });
    return '<div class="tf-card"><div class="pr-tit">' + tit + "<small style=\"color:rgba(245,241,234,.5);letter-spacing:0;text-transform:none;font-weight:600\">" + l.length + " ite" + (l.length === 1 ? "m" : "ns") + '</small></div><div class="pr-itens">' +
      l.map(function (x, i) { return '<div class="pr-item"><input class="pr-in" data-l="' + k + '" data-i="' + i + '" value="' + esc(x) + '" aria-label="' + tit + " " + (i + 1) + '"><button type="button" data-a="sobe" data-l="' + k + '" data-i="' + i + '" aria-label="Subir">↑</button><button type="button" data-a="tira" data-l="' + k + '" data-i="' + i + '" aria-label="Tirar">✕</button></div>'; }).join("") +
      '</div><div class="pr-add"><input class="pr-in" data-novo="' + k + '" placeholder="' + esc(ph) + '" aria-label="Novo item"><button type="button" class="bw-btn bw-btn--vidro" data-a="add" data-l="' + k + '" style="min-height:42px">＋</button></div>' +
      ((SUG[k] || []).length ? '<div class="pr-sugs"><button type="button" class="pr-opc" data-a="opcoes" data-l="' + k + '" data-t="' + esc(tit) + '"><span>☰ OPÇÕES PRONTAS</span><b>' + (SUG[k] || []).length + "</b></button></div>" : "") + "</div>";
  }
  /* 16/11 (dono): as opções prontas ficam guardadas num BOTÃO por campo (abre a lista), em vez de chips soltos ocupando a tela */
  var OPC = {};
  function chipsCampo(k, lista, atual, rot) { OPC[k] = lista; return '<div class="pr-sugs"><button type="button" class="pr-opc" data-a="opcoesCampo" data-k="' + k + '" data-t="' + esc(rot || "") + '"><span>☰ ' + esc(rot ? rot.toUpperCase() + " — OPÇÕES" : "OPÇÕES PRONTAS") + "</span><b>" + lista.length + "</b></button></div>"; }
  function abrirOpcoes(tipo, k, tit) {
    var lista = tipo === "lista" ? (SUG[k] || []) : (OPC[k] || []), atual = tipo === "lista" ? (DOC[k] || []).map(function (x) { return x.toLowerCase(); }) : [String(getPath(DOC, k) || "").toLowerCase()];
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>' + esc(tit || "Opções prontas") + '</h3><p class="tf-sub">' + (tipo === "lista" ? "Toque para pôr no orçamento (toque de novo para tirar). Pode escolher várias." : "Toque para escolher.") + '</p><div class="pr-opc-lista">' +
      lista.map(function (o) { var on = atual.indexOf(o.toLowerCase()) >= 0; return '<button type="button" class="pr-opc-it' + (on ? " on" : "") + '" data-a="' + (tipo === "lista" ? "opcLista" : "opcCampo") + '" data-l="' + esc(k) + '" data-v="' + esc(o) + '" data-t="' + esc(tit || "") + '" aria-pressed="' + on + '"><i>' + (on ? "✓" : "+") + "</i><span>" + esc(o) + "</span></button>"; }).join("") +
      '</div><div class="pr-sugs" style="margin-top:14px"><button type="button" class="bw-btn" data-a="fecharModal">✓ PRONTO</button></div>');
  }
  function desenharForm() {
    var d = DOC, rec = d.tipo === "recibo", h = "";
    h += '<div class="tf-card" style="margin-top:0"><div class="pr-tit"><span>' + (rec ? "RECIBO" : "ORÇAMENTO") + " " + esc(d.numero || "(número sai ao salvar)") + '</span><span class="pr-st st-' + d.status + '">' + esc(STATUS[d.status]) + "</span></div>" +
      '<div class="pr-sugs" style="margin-top:0"><button type="button" class="pr-chip" data-a="voltar">‹ VOLTAR À LISTA</button>' + (rec ? "" : '<button type="button" class="pr-chip" data-a="ia">✨ MONTAR COM IA</button><button type="button" class="pr-chip" data-a="caprichar">✨ CAPRICHAR NO TEXTO</button>') + "</div></div>";
    if (!rec) {
      h += '<div class="tf-card"><div class="pr-tit">O que você vai fazer? <small style="color:rgba(245,241,234,.5);letter-spacing:0;text-transform:none;font-weight:600">toque para preencher</small></div><div class="pr-botoes">' +
        botoes().map(function (b) { return '<button type="button" class="pr-bt" data-a="botao" data-v="' + esc(b.id) + '">' + esc(b.nome) + "<small>" + esc(b.desc || "") + "</small></button>"; }).join("") + "</div></div>";
    }
    /* cliente */
    var cl = d.cliente;
    h += '<div class="tf-card"><div class="pr-tit">' + (rec ? "Recebido de" : "Cliente") + '</div><div class="pr-campos">' +
      (rec ? "" : '<label><span>Tratamento</span><select class="pr-in" data-k="cliente.trat">' + ["A", "Ao", "À", "Aos", "Às", "Prezado(a)", ""].map(function (t) { return '<option value="' + t + '"' + (cl.trat === t ? " selected" : "") + ">" + (t || "(nenhum)") + "</option>"; }).join("") + "</select></label>") +
      campoTxt("Nome do contato", "cliente.nome", cl.nome, "text", false, "André", "listaClientes") + campoTxt("Empresa", "cliente.empresa", cl.empresa, "text", false, "Arte Eventos", "listaEmpresas") +
      campoTxt("CPF / CNPJ", "cliente.doc", cl.doc) + campoTxt("WhatsApp", "cliente.tel", cl.tel, "tel") + campoTxt("E-mail", "cliente.email", cl.email, "email") + "</div>" + listasClientes() + "</div>";
    if (rec) {
      var r = d.recibo;
      h += '<div class="tf-card"><div class="pr-tit">Pagamento</div><div class="pr-campos">' + campoTxt("Valor recebido (R$)", "recibo.valor", r.valor, "text", false, "8.500,00") + campoTxt("Data do pagamento", "recibo.data", r.data, "date") +
        campoTxt("Referente a", "recibo.referente", r.referente, "textarea", true, "Prestação de serviços de transmissão ao vivo — evento de 18/11/2026") + "</div>" + chipsCampo("recibo.forma", ["Pix", "Transferência", "Dinheiro", "Cartão", "Boleto"], r.forma, "Forma de pagamento") +
        '<p class="pr-msg">' + (num(r.valor) ? "Por extenso: <b>" + esc(extenso(r.valor)) + "</b>" : "") + "</p>" +
        (d.refId && (docs().filter(function (x) { return x.id === d.refId; })[0] || {}).eventoId ? '<label class="tf-check" style="margin-top:8px"><input type="checkbox" data-k="lancarEvento"' + (d.lancarEvento !== false ? " checked" : "") + "> Lançar este valor como RECEBIDO no evento (entra no Fluxo e no Painel)</label>" : "") + "</div>";
    } else {
      h += '<div class="tf-card"><div class="pr-tit">Abertura</div>' + '<div class="pr-campos">' + campoTxt("Texto de abertura", "abertura", d.abertura, "textarea", true) + campoTxt("Objeto / título do serviço (opcional)", "objeto", d.objeto, "textarea", true, "Ex.: Gravação e projeção de curso (ponto A → ponto B)") + "</div></div>";
      h += listaEd("escopo", "O que será feito", "Ex.: Captação de takes com 01 câmera 4K UHD");
      h += listaEd("equipe", "Equipe", "Ex.: 01 cinegrafista / editor de vídeo");
      h += listaEd("equip", "Equipamentos", "Ex.: Gimbal Ronin RS3 Pro");
      h += listaEd("check", "Checklist técnico (opcional)", "Ex.: Conferir resolução 1080p60 no painel");
      var dt = d.datas;
      h += '<div class="tf-card"><div class="pr-tit">Datas e local</div><div class="pr-campos">' + campoTxt("Data do evento (início)", "datas.ini", dt.ini, "date") + campoTxt("Até (se for mais de um dia)", "datas.fim", dt.fim, "date") +
        campoTxt("Local", "datas.local", dt.local, "text", true, "Expominas (Belo Horizonte, MG)") + campoTxt("Montagem", "datas.montagem", dt.montagem, "text", false, "SEM NECESSIDADE") + campoTxt("Testes / ensaios", "datas.ensaio", dt.ensaio, "text", false, "17/11 (equipe completa)") +
        campoTxt("Horário", "datas.horario", dt.horario, "text", true, "Diária de serviço") + "</div>" + '<div class="pr-sugs pr-opc-linha">' + chipsCampo("datas.montagem", SUG.montagem, dt.montagem, "Montagem").replace(/^<div class="pr-sugs">|<\/div>$/g, "") + chipsCampo("datas.horario", SUG.horario, dt.horario, "Horário").replace(/^<div class="pr-sugs">|<\/div>$/g, "") + "</div>" + "</div>";
      var v = d.valor;
      h += '<div class="tf-card"><div class="pr-tit">Valor</div><div class="pr-sugs" style="margin-top:0"><button type="button" class="pr-chip' + (v.modo !== "itens" ? " on" : "") + '" data-a="modo" data-v="total">SÓ O TOTAL</button><button type="button" class="pr-chip' + (v.modo === "itens" ? " on" : "") + '" data-a="modo" data-v="itens">DETALHADO (DIÁRIAS / ITENS)</button></div>';
      if (v.modo === "itens") {
        h += '<table class="pr-tab" style="margin-top:8px"><tbody>' + (v.itens || []).map(function (it, i) {
          return '<tr><td class="desc"><input data-it="desc" data-i="' + i + '" value="' + esc(it.desc) + '" placeholder="Descrição" aria-label="Descrição"></td><td style="width:70px"><input data-it="qtd" data-i="' + i + '" value="' + esc(it.qtd) + '" inputmode="decimal" aria-label="Quantidade"></td>' +
            '<td class="un" style="width:110px"><select data-it="un" data-i="' + i + '" aria-label="Unidade">' + ["diária", "hora", "serviço", "unidade", "módulo"].map(function (u) { return "<option" + (it.un === u ? " selected" : "") + ">" + u + "</option>"; }).join("") + "</select></td>" +
            '<td style="width:120px"><input data-it="unit" data-i="' + i + '" value="' + esc(it.unit) + '" inputmode="decimal" placeholder="Valor" aria-label="Valor unitário"></td><td style="width:42px"><button type="button" class="pr-chip" data-a="tiraItem" data-i="' + i + '" aria-label="Tirar item">✕</button></td></tr>';
        }).join("") + '</tbody></table><div class="pr-sugs"><button type="button" class="pr-chip add" data-a="addItem">ITEM</button></div><div class="pr-campos" style="margin-top:8px">' + campoTxt("Desconto (R$ ou %)", "valor.desc", v.desc, "text", false, "10% ou 300") +
          '<label style="justify-content:flex-end"><span>&nbsp;</span><span class="tf-check" style="margin:0"><input type="checkbox" data-k="valor.mostrar"' + (v.mostrar !== false ? " checked" : "") + "> Mostrar os itens no PDF</span></label></div>";
      } else h += '<div class="pr-campos" style="margin-top:8px">' + campoTxt("Valor total (R$)", "valor.total", v.total, "text", false, "8.500,00") + campoTxt("Observação do valor", "valor.por", v.por, "text", false, "por módulo (três dias)") + "</div>";
      h += '<div class="pr-total"><span>TOTAL</span><b id="totalTxt">' + moeda(total(d)) + "</b></div></div>";
      var e = empresa();
      h += '<div class="tf-card"><div class="pr-tit">Pagamento e validade</div><div class="pr-campos">' + campoTxt("Condição de pagamento", "pagamento", d.pagamento, "text", true, "Até 15 dias após emissão da NF-e") + campoTxt("Validade da proposta (dias)", "validade", d.validade, "number") +
        '<label style="justify-content:flex-end"><span>&nbsp;</span><span class="tf-check" style="margin:0"><input type="checkbox" data-k="pix"' + (d.pix ? " checked" : "") + (e.pix ? "" : " disabled") + "> QR code Pix com o valor" + (e.pix ? "" : " (cadastre a chave em ⚙ MINHA EMPRESA)") + "</span></label></div>" + chipsCampo("pagamento", SUG.pagamento, d.pagamento, "Condição de pagamento") + "</div>";
      h += listaEd("obs", "Observações", "Ex.: Material entregue via link do Google Drive");
      h += '<div class="tf-card"><div class="pr-tit">Fechamento e visual</div><div class="pr-campos">' + campoTxt("Texto final", "encerramento", d.encerramento, "textarea", true) + "</div>" +
        '<label class="tf-check" style="margin-top:8px"><input type="checkbox" data-k="aceite"' + (d.aceite !== false ? " checked" : "") + "> Campo de aceite do cliente (\"De acordo\")</label>" +
        '<div class="pr-tit" style="margin-top:12px">Estilo do PDF</div>' + '<div class="pr-sugs">' + [["classico", "CLÁSSICO (escuro + cor)"], ["moderno", "MODERNO (cor da marca)"], ["limpo", "LIMPO (preto e branco)"]].map(function (s) { return '<button type="button" class="pr-chip' + ((d.estilo || "classico") === s[0] ? " on" : "") + '" data-a="poe" data-k="estilo" data-v="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</div></div>";
    }
    /* ações */
    var ac = '<button type="button" class="bw-btn" data-a="pdfEd">⇩ PDF</button><button type="button" class="bw-btn bw-btn--vidro" data-a="enviar">ENVIAR</button><button type="button" class="bw-btn bw-btn--vidro" data-a="word">WORD</button><button type="button" class="bw-btn bw-btn--vidro" data-a="verPrevia">👁 PRÉVIA</button><button type="button" class="bw-btn bw-btn--vidro" data-a="assinarCert" title="Assinar o PDF com o certificado digital A1 (.pfx) da empresa">🔏 ASSINAR</button>';
    if (!rec) {
      if (d.status === "rascunho") ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="stEd" data-v="enviado">MARCAR ENVIADO</button>';
      if (d.status === "enviado") ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="stEd" data-v="aprovado">✓ APROVADO</button><button type="button" class="bw-btn bw-btn--vidro" data-a="stEd" data-v="recusado">RECUSADO</button>';
      if (d.status === "aprovado") ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="reciboEd">GERAR RECIBO</button>' + (d.eventoId ? '<a class="bw-btn bw-btn--vidro" href="eventos.html?ev=' + esc(d.eventoId) + '">ABRIR EVENTO</a>' : '<button type="button" class="bw-btn bw-btn--vidro" data-a="eventoEd">CRIAR EVENTO</button>');
      if (d.status === "recusado" || d.status === "aprovado") ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="stEd" data-v="enviado">REABRIR</button>';
      ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="comoBotao">★ SALVAR COMO BOTÃO</button>';
    }
    ac += '<button type="button" class="bw-btn bw-btn--vidro" data-a="excluirEd">EXCLUIR</button>';
    h += '<div class="pr-acoes">' + ac + '</div><div class="pr-msg" id="msgEd" role="status"></div>';
    $("form").innerHTML = h;
  }
  function listasClientes() {
    var nomes = {}, emps = {};
    ler("neg_clientes").forEach(function (c) { if (c.nome) emps[c.nome] = 1; });
    ler("mkt_leads").forEach(function (l) { if (l.nome) nomes[l.nome] = 1; if (l.empresa) emps[l.empresa] = 1; });
    docs().forEach(function (d) { if (d.cliente.nome) nomes[d.cliente.nome] = 1; if (d.cliente.empresa) emps[d.cliente.empresa] = 1; });
    var op = function (o) { return Object.keys(o).sort().slice(0, 300).map(function (n) { return '<option value="' + esc(n) + '">'; }).join(""); };
    return '<datalist id="listaClientes">' + op(nomes) + '</datalist><datalist id="listaEmpresas">' + op(emps) + "</datalist>";
  }
  function preencherCliente(campoMudou) {   /* ao escolher um cliente/empresa conhecido, completa CNPJ, telefone e e-mail */
    var c = DOC.cliente, alvo = String(campoMudou === "nome" ? c.nome : c.empresa).trim().toLowerCase(); if (!alvo) return false;
    var achou = null;
    docs().some(function (d) { if (d.id !== DOC.id && ((d.cliente.empresa || "").toLowerCase() === alvo || (d.cliente.nome || "").toLowerCase() === alvo)) { achou = d.cliente; return true; } });
    if (!achou) ler("neg_clientes").some(function (x) { if ((x.nome || "").toLowerCase() === alvo) { achou = { empresa: x.nome, doc: x.cnpj, tel: x.tel, email: x.email }; return true; } });
    if (!achou) ler("mkt_leads").some(function (x) { if ((x.empresa || "").toLowerCase() === alvo || (x.nome || "").toLowerCase() === alvo) { achou = { nome: x.nome, empresa: x.empresa, tel: x.tel, email: x.email }; return true; } });
    if (!achou) return false;
    var mudou = false; ["nome", "empresa", "doc", "tel", "email"].forEach(function (k) { if (!c[k] && achou[k]) { c[k] = achou[k]; mudou = true; } });
    return mudou;
  }
  function setPath(o, path, v) { var p = path.split("."), x = o; for (var i = 0; i < p.length - 1; i++) x = x[p[i]] = x[p[i]] || {}; x[p[p.length - 1]] = v; }
  function getPath(o, path) { return path.split(".").reduce(function (x, k) { return x == null ? x : x[k]; }, o); }
  var tSalvar = 0, tPrev = 0;
  function mudou(redesenhar) {
    DOC.atualizado = new Date().toISOString();
    if (redesenhar) desenharForm();
    var t = $("totalTxt"); if (t) t.textContent = moeda(total(DOC));
    clearTimeout(tPrev); tPrev = setTimeout(previa, 120);
    clearTimeout(tSalvar); tSalvar = setTimeout(salvarAtual, 700);
  }
  function salvarAtual() {
    if (!DOC) return;
    if (!DOC.numero) { DOC.numero = proxNumero(DOC.tipo === "recibo" ? "REC" : "ORC"); var el = $("form").querySelector(".pr-tit span"); if (el) el.textContent = (DOC.tipo === "recibo" ? "RECIBO " : "ORÇAMENTO ") + DOC.numero;  previa(); }
    salvarDoc(JSON.parse(JSON.stringify(DOC))); var m = $("msgEd"); if (m) m.textContent = "✓ Salvo " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  function previa() {
    if (!DOC) return;
    var cx = $("folhaCx"), es = $("folhaEsc"); if (!cx || cx.offsetParent === null) return;
    es.innerHTML = folhaHTML(modelo(DOC)); var w = cx.clientWidth - 24, k = Math.min(1, w / 794), fl = es.firstChild;
    es.style.transform = "scale(" + k + ")"; es.style.width = "794px"; cx.style.height = Math.ceil(fl.offsetHeight * k + 24) + "px";
  }

  /* ================= SAÍDAS: PDF (pdfMake), WORD (docx), ENVIAR ================= */
  async function preparar(d) { if (d.pix) { try { await carregar("qr"); } catch (e) { } } return modelo(d); }
  function defPdf(m) {
    var p = paleta(m), e = m.emp, cont = [], destaque = p.invDestaque || p.invTxt;
    var cab = { columns: [m.logo ? { image: m.logo, fit: [190, 70], margin: [0, 0, 0, 0] } : { text: e.fantasia || "SUA EMPRESA", fontSize: 20, bold: true, color: p.topoTxt },
      { stack: [{ text: e.fantasia || e.razao || "", bold: true, fontSize: 13, color: p.topoTxt, alignment: "right" }, { text: [e.razao && e.fantasia ? e.razao : "", e.cnpj ? "CNPJ " + e.cnpj : ""].filter(Boolean).join(" · "), fontSize: 8.5, color: p.topoTxt, alignment: "right", margin: [0, 2, 0, 0] },
        { text: m.contatos.join(" · "), fontSize: 8.5, color: p.topoTxt, alignment: "right", margin: [0, 2, 0, 0] }], width: "*" }], margin: [0, 0, 0, 0] };
    cont.push(cab, { canvas: [{ type: "rect", x: -48, y: 20, w: 595.28, h: 3, color: p.faixa }], margin: [0, 0, 0, 18] });
    cont.push({ columns: [{ text: m.titulo.toUpperCase(), style: "h1", color: p.tit }, { text: "Nº " + m.numero, alignment: "right", fontSize: 9, bold: true, color: "#6b7280", width: 140, margin: [0, 5, 0, 0] }] });
    cont.push({ text: m.cidadeData, fontSize: 9, color: "#6b7280", margin: [0, 2, 0, 12] });
    var invBox = function (rot, valor, sub, dir) {
      return { table: { widths: ["*", "auto"], body: [[{ stack: [{ text: rot, fontSize: 8, bold: true, color: p.invTxt, characterSpacing: 1 }, { text: moeda(valor), fontSize: 22, bold: true, color: destaque, margin: [0, 2, 0, 0] }].concat(sub ? [{ text: sub, fontSize: 8.5, color: p.invTxt }] : []), margin: [12, 10, 12, 10] },
        { text: dir || "", fontSize: 8.5, color: p.invTxt, alignment: "right", margin: [12, 12, 12, 10] }]] }, layout: { fillColor: function () { return p.inv; }, hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; } }, margin: [0, 10, 0, 6] };
    };
    if (m.tipo === "recibo") {
      cont.push(invBox("VALOR", m.valor, "", m.extenso));
      cont.push({ text: m.texto, fontSize: 12, lineHeight: 1.5, margin: [0, 12, 0, 8] });
      if (m.kv.length) cont.push({ table: { widths: [130, "*"], body: m.kv.map(function (x) { return [{ text: x[0], color: "#6b7280", bold: true, fontSize: 9.5 }, { text: x[1], fontSize: 10 }]; }) }, layout: "noBorders" });
      cont.push({ text: m.cidadeData, margin: [0, 26, 0, 40], fontSize: 10 });
      cont.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 260, y2: 0, lineWidth: 0.8, lineColor: "#9ca3af" }] }, { text: m.emitente.join("\n"), fontSize: 9.5, margin: [0, 4, 0, 0] });
    } else {
      if (m.cliente) cont.push({ table: { widths: ["*"], body: [[{ stack: [{ text: m.cliente, bold: true, fontSize: 11 }].concat(m.clienteLinhas.length ? [{ text: m.clienteLinhas.join(" · "), fontSize: 8.5, color: "#4b5563", margin: [0, 2, 0, 0] }] : []), margin: [10, 7, 10, 7] }]] },
        layout: { fillColor: function () { return misturaBranco(m.estilo === "limpo" ? "#9ca3af" : m.cor, 0.14); }, hLineWidth: function () { return 0; }, vLineWidth: function () { return 0; } }, margin: [0, 0, 0, 10] });
      if (m.abertura) cont.push({ text: m.abertura, margin: [0, 0, 0, 6] });
      if (m.objeto) cont.push({ text: m.objeto, bold: true, margin: [0, 0, 0, 6] });
      var h2 = function (t) { return [{ text: t.toUpperCase(), style: "h2", color: p.tit }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.6, lineColor: "#e5e7eb" }], margin: [0, 2, 0, 5] }]; };
      m.secoes.forEach(function (s) {
        cont.push.apply(cont, h2(s.tit));
        if (s.tipo === "kv") cont.push({ table: { widths: [120, "*"], body: s.itens.map(function (x) { return [{ text: x[0], color: "#6b7280", bold: true, fontSize: 9.5 }, { text: x[1] }]; }) }, layout: "noBorders" });
        else if (s.tipo === "check") cont.push({ table: { widths: [12, "*"], body: s.itens.map(function (x) { return [{ canvas: [{ type: "rect", x: 0, y: 2.5, w: 8, h: 8, lineWidth: 0.9, lineColor: "#6b7280" }] }, { text: x }]; }) }, layout: "noBorders" });
        else if (s.tipo === "duas") { var meio = Math.ceil(s.itens.length / 2); cont.push({ columns: [{ ul: s.itens.slice(0, meio) }, { ul: s.itens.slice(meio) }], columnGap: 20 }); }
        else cont.push({ ul: s.itens });
      });
      cont.push.apply(cont, h2("Investimento"));
      var inv = m.inv;
      if (inv.itens.length) {
        var corpo = [[{ text: "DESCRIÇÃO", style: "th" }, { text: "QTD.", style: "th" }, { text: "VALOR", style: "th", alignment: "right" }, { text: "TOTAL", style: "th", alignment: "right" }]].concat(inv.itens.map(function (r) { return [r[0], r[1], { text: r[2], alignment: "right" }, { text: r[3], alignment: "right" }]; }));
        if (inv.desconto) corpo.push([{ text: "Desconto", colSpan: 3 }, "", "", { text: "− " + inv.desconto, alignment: "right" }]);
        cont.push({ table: { headerRows: 1, widths: ["*", 70, 80, 80], body: corpo }, layout: "lightHorizontalLines", fontSize: 9.5, margin: [0, 0, 0, 4] });
      }
      cont.push(invBox("VALOR DA PROPOSTA", inv.total, inv.por, [inv.pagamento ? "Pagamento: " + inv.pagamento : "", inv.validade].filter(Boolean).join("\n")));
      if (m.pix) { var qr = qrDataUrl(m.pix); cont.push({ columns: [qr ? { image: qr, width: 84 } : { text: "" }, { stack: [{ text: "PAGUE COM PIX", bold: true, fontSize: 10 }, { text: "Chave: " + e.pix, fontSize: 9 }, { text: "Pix copia e cola:", fontSize: 8, color: "#6b7280", margin: [0, 4, 0, 0] }, { text: m.pix, fontSize: 7, color: "#6b7280" }], margin: [10, 6, 0, 0] }], margin: [0, 4, 0, 4] }); }
      if (m.obs.length) { cont.push.apply(cont, h2("Observações")); cont.push({ ul: m.obs }); }
      if (m.encerramento) cont.push({ text: m.encerramento, margin: [0, 14, 0, 0] });
      cont.push({ columns: [{ stack: [{ text: "Atenciosamente," }, { canvas: [{ type: "line", x1: 0, y1: 26, x2: 220, y2: 26, lineWidth: 0.8, lineColor: "#9ca3af" }] }, { text: m.assina, fontSize: 9.5, margin: [0, 4, 0, 0] }, { text: m.cnpj ? "CNPJ: " + m.cnpj : "", fontSize: 9.5 }, { text: m.cidadeData, fontSize: 9.5 }] },
        m.aceite ? { stack: [{ text: "De acordo (contratante):" }, { canvas: [{ type: "line", x1: 0, y1: 26, x2: 220, y2: 26, lineWidth: 0.8, lineColor: "#9ca3af" }] }, { text: "Nome / data", fontSize: 9.5, margin: [0, 4, 0, 0] }] } : { text: "" }], columnGap: 30, margin: [0, 22, 0, 0], unbreakable: true });
    }
    return {
      pageSize: "A4", pageMargins: [48, 34, 48, 54], info: { title: m.titulo + " " + m.numero, author: e.razao || e.fantasia || "Brightway", creator: "Brightway — Gerador de orçamento" },
      background: function (pg) { return pg === 1 && p.topo !== "#FFFFFF" ? { canvas: [{ type: "rect", x: 0, y: 0, w: 595.28, h: 116, color: p.topo }] } : null; },
      footer: function (pg, n) { return { columns: [{ text: [e.email, e.tel].filter(Boolean).join(" · "), fontSize: 8, color: p.rodTxt }, { text: (e.cnpj ? "CNPJ: " + e.cnpj + "   " : "") + pg + "/" + n, fontSize: 8, color: p.rodTxt, alignment: "right" }], margin: [48, 18, 48, 0] }; },
      content: cont, defaultStyle: { fontSize: 10.5, lineHeight: 1.25, color: "#1d222b" },
      styles: { h1: { fontSize: 17, bold: true, characterSpacing: 0.6 }, h2: { fontSize: 9.5, bold: true, characterSpacing: 1.2, margin: [0, 12, 0, 0] }, th: { fontSize: 8, bold: true, color: "#6b7280" } }
    };
  }
  function nomeArq(d, ext) {
    var c = d.cliente.empresa || d.cliente.nome || "cliente", base = (d.numero || "orcamento") + "-" + c;
    return base.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") + "." + ext;
  }
  async function pdfBlob(d) {
    await carregar("pdf"); var m = await preparar(d), def = defPdf(m); window.__ultimoDefPdf = def;
    return new Promise(function (ok, erro) { try { pdfMake.createPdf(def).getBuffer(function (b) { ok(new Blob([b], { type: "application/pdf" })); }); } catch (e) { erro(e); } });
  }
  function baixar(b, nome) { var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 5000); }
  async function gerarPdf(d, semBaixar) {
    ocupado("Gerando o PDF…");
    try { if (!d.numero) { d.numero = proxNumero(d.tipo === "recibo" ? "REC" : "ORC"); salvarDoc(d); } var b = await pdfBlob(d); ocupado(""); if (!semBaixar) baixar(b, nomeArq(d, "pdf")); return b; }
    catch (e) { ocupado(""); toast("Não deu para gerar o PDF (sem internet?)."); return null; }
  }
  async function gerarWord(d, semBaixar) {
    ocupado("Gerando o Word…");
    try {
      await carregar("docx"); if (!d.numero) { d.numero = proxNumero(d.tipo === "recibo" ? "REC" : "ORC"); salvarDoc(d); }
      var m = await preparar(d), D = window.docx, P = function (txt, o) { o = o || {}; return new D.Paragraph({ alignment: o.al, spacing: { after: o.after == null ? 120 : o.after }, bullet: o.bullet ? { level: 0 } : undefined, children: [new D.TextRun({ text: txt || "", bold: !!o.b, size: o.size || 22, color: o.color })] }); };
      var filhos = [], cor = (m.estilo === "limpo" ? "111111" : (m.cor || "#C9A227").replace("#", ""));
      if (m.logo) { try { var bin = atob(m.logo.split(",")[1]), arr = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); var im = await new Promise(function (ok) { var x = new Image(); x.onload = function () { ok(x); }; x.onerror = function () { ok(null); }; x.src = m.logo; }); if (im) { var lw = Math.min(200, im.naturalWidth), lh = Math.round(lw * im.naturalHeight / im.naturalWidth); if (lh > 80) { lw = Math.round(lw * 80 / lh); lh = 80; } filhos.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.ImageRun({ type: /jpe?g/.test(m.logo.slice(5, 20)) ? "jpg" : "png", data: arr, transformation: { width: lw, height: lh } })] })); } } catch (e) { } }
      filhos.push(P([m.emp.fantasia || m.emp.razao, m.emp.cnpj ? "CNPJ " + m.emp.cnpj : ""].filter(Boolean).join(" · "), { al: D.AlignmentType.CENTER, size: 18, color: "6b7280" }));
      filhos.push(P(m.titulo.toUpperCase(), { al: D.AlignmentType.CENTER, b: true, size: 30, color: cor, after: 40 }), P("Nº " + m.numero + " · " + m.cidadeData, { al: D.AlignmentType.CENTER, size: 18, color: "6b7280", after: 240 }));
      var h2 = function (t) { filhos.push(P(t.toUpperCase(), { b: true, size: 20, color: cor, after: 80 })); };
      if (m.tipo === "recibo") {
        filhos.push(P("VALOR: " + moeda(m.valor) + " (" + m.extenso + ")", { b: true, size: 26 }), P(m.texto, { size: 24 }));
        m.kv.forEach(function (x) { filhos.push(P(x[0] + ": " + x[1])); });
        filhos.push(P(m.cidadeData, { after: 600 }), P("_______________________________________", { after: 40 }), P(m.emitente.join(" · ")));
      } else {
        if (m.cliente) filhos.push(P(m.cliente, { b: true, size: 24 }));
        if (m.clienteLinhas.length) filhos.push(P(m.clienteLinhas.join(" · "), { size: 18, color: "4b5563" }));
        if (m.abertura) filhos.push(P(m.abertura));
        if (m.objeto) filhos.push(P(m.objeto, { b: true }));
        m.secoes.forEach(function (s) { h2(s.tit); s.itens.forEach(function (x) { filhos.push(s.tipo === "kv" ? P(x[0] + ": " + x[1], { after: 60 }) : P((s.tipo === "check" ? "☐ " : "") + x, { bullet: s.tipo !== "check", after: 60 })); }); });
        h2("Investimento");
        m.inv.itens.forEach(function (r) { filhos.push(P(r[0] + " — " + r[1] + " × " + r[2] + " = " + r[3], { bullet: true, after: 60 })); });
        if (m.inv.desconto) filhos.push(P("Desconto: − " + m.inv.desconto));
        filhos.push(P("Valor da proposta: " + moeda(m.inv.total) + (m.inv.por ? " (" + m.inv.por + ")" : ""), { b: true, size: 26 }));
        if (m.inv.pagamento) filhos.push(P("Pagamento: " + m.inv.pagamento)); if (m.inv.validade) filhos.push(P(m.inv.validade));
        if (m.pix) filhos.push(P("Pix: " + m.emp.pix + " · copia e cola: " + m.pix, { size: 16, color: "6b7280" }));
        if (m.obs.length) { h2("Observações"); m.obs.forEach(function (x) { filhos.push(P(x, { bullet: true, after: 60 })); }); }
        if (m.encerramento) filhos.push(P(m.encerramento));
        filhos.push(P("Atenciosamente,", { after: 400 }), P(m.assina), P(m.cnpj ? "CNPJ: " + m.cnpj : ""), P(m.cidadeData));
        if (m.aceite) filhos.push(P("De acordo (contratante): ________________________________   Data: ____/____/______", { after: 0 }));
      }
      var doc = new D.Document({ creator: "Brightway", title: m.titulo + " " + m.numero, styles: { default: { document: { run: { font: "Calibri" } } } }, sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children: filhos }] });
      var b = await D.Packer.toBlob(doc); ocupado(""); if (!semBaixar) baixar(b, nomeArq(d, "docx")); return b;
    } catch (e) { ocupado(""); toast("Não deu para gerar o Word (sem internet?)."); return null; }
  }
  function textoWhats(d) {
    var e = empresa(), m = modelo(d);
    if (d.tipo === "recibo") return "Olá" + (d.cliente.nome ? ", " + d.cliente.nome : "") + "! Segue o recibo " + d.numero + " no valor de " + moeda(m.valor) + ". Obrigado!";
    return "Olá" + (d.cliente.nome ? ", " + d.cliente.nome : "") + "! Segue a proposta " + d.numero + (d.datas.ini ? " para " + periodo(d.datas.ini, d.datas.fim) : "") + (d.datas.local ? " (" + d.datas.local + ")" : "") + ".\n" +
      (d.escopo[0] ? "• " + d.escopo.slice(0, 3).join("\n• ") + "\n" : "") + "Valor: " + moeda(m.inv.total) + (m.inv.por ? " (" + m.inv.por + ")" : "") + (d.pagamento ? "\nPagamento: " + d.pagamento : "") + "\nQualquer dúvida, estou à disposição!" + (e.resp ? "\n" + e.resp : "");
  }
  async function enviar(d) {
    var b = await gerarPdf(d, true); if (!b) return;
    var arq = new File([b], nomeArq(d, "pdf"), { type: "application/pdf" }), txt = textoWhats(d);
    if (navigator.canShare && navigator.canShare({ files: [arq] })) {
      try { await navigator.share({ files: [arq], title: d.numero, text: txt }); depoisDeEnviar(d); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    baixar(b, arq.name);
    var tel = String(d.cliente.tel || "").replace(/\D/g, ""), wa = "https://wa.me/" + (tel ? (tel.length <= 11 ? "55" + tel : tel) : "") + "?text=" + encodeURIComponent(txt + "\n(o PDF vai anexo)");
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>Enviar ' + esc(d.numero) + "</h3><p class=\"tf-sub\">O PDF foi baixado. Abra a conversa e anexe o arquivo:</p>" +
      '<div class="pr-sugs"><a class="bw-btn" target="_blank" rel="noopener" href="' + wa + '" data-a="marcouEnviado">💬 WHATSAPP</a>' + (d.cliente.email ? '<a class="bw-btn bw-btn--vidro" href="mailto:' + esc(d.cliente.email) + "?subject=" + encodeURIComponent((d.tipo === "recibo" ? "Recibo " : "Proposta ") + d.numero) + "&body=" + encodeURIComponent(txt) + '" data-a="marcouEnviado">✉ E-MAIL</a>' : "") + "</div>");
  }
  function depoisDeEnviar(d) { if (d.tipo !== "recibo" && d.status === "rascunho") mudarStatus(d.id, "enviado"); }

  /* ================= SITUAÇÃO, EVENTO E RECIBO ================= */
  function mudarStatus(id, st) {
    var d = docs().filter(function (x) { return x.id === id; })[0]; if (!d) return;
    d.status = st; d.atualizado = new Date().toISOString(); if (st === "aprovado") d.aprovadoEm = hoje(); if (st === "enviado") d.enviadoEm = hoje();
    salvarDoc(d); if (DOC && DOC.id === id) { DOC.status = st; DOC.aprovadoEm = d.aprovadoEm; DOC.enviadoEm = d.enviadoEm; desenharForm(); }
    if (st === "enviado" && d.leadId) atualizarLead(d);
    abrirAba(abaDe(d));
    if (st === "aprovado") setTimeout(function () { posAprovar(d); if (!DOC) { desenharLista(); mostrarCartao(id); } }, 50); else if (!DOC) { desenharLista(); mostrarCartao(id); }
  }
  function atualizarLead(d) {   /* proposta enviada: o contato do FUNIL passa para a etapa "Proposta" (se ainda estava antes) */
    var l = ler("mkt_leads"), x = l.filter(function (y) { return String(y.id) === String(d.leadId); })[0]; if (!x) return;
    if (["novo", "conversa"].indexOf(x.etapa) >= 0) x.etapa = "proposta";
    if (!num(x.valor)) x.valor = total(d);
    x.hist = x.hist || []; x.hist.push({ em: new Date().toISOString(), tipo: "sistema", txt: "Orçamento " + d.numero + " enviado (" + moeda(total(d)) + ")" });
    gravar("mkt_leads", l);
  }
  function posAprovar(d) {
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✓ ' + esc(d.numero) + " aprovado!</h3><p class=\"tf-sub\">Quer adiantar os próximos passos?</p>" +
      '<div class="pr-sugs">' + (d.eventoId ? "" : '<button type="button" class="bw-btn" data-a="evento" data-id="' + d.id + '">CRIAR O EVENTO EM EVENTOS</button>') + '<button type="button" class="bw-btn bw-btn--vidro" data-a="recibo" data-id="' + d.id + '">GERAR RECIBO</button><button type="button" class="bw-btn bw-btn--vidro" data-a="fecharModal">DEPOIS</button></div>');
  }
  function criarEvento(id) {
    var d = docs().filter(function (x) { return x.id === id; })[0]; if (!d) return;
    if (d.eventoId) { toast("Este orçamento já tem evento."); return; }
    var nomeCli = d.cliente.empresa || d.cliente.nome || "Cliente", tot = total(d);
    var cl = ler("neg_clientes"), ja = cl.filter(function (c) { return String(c.nome || "").trim().toLowerCase() === nomeCli.trim().toLowerCase(); })[0];
    if (!ja) { ja = { id: Date.now(), nome: nomeCli, cnpj: d.cliente.doc || "", tel: d.cliente.tel || "", email: d.cliente.email || "", end: "", cidade: "" }; cl.push(ja); gravar("neg_clientes", cl); }
    var evs = ler("neg_eventos"), ev = { id: Date.now() + 1, nome: nomeCli + ((d.botoes || [])[0] ? " — " + d.botoes[0].charAt(0) + d.botoes[0].slice(1).toLowerCase() : ""), data: d.datas.ini || "", tipo: (d.botoes || [])[0] || "", local: d.datas.local || "",
      cliente: nomeCli, equipeId: "", equipeNome: "", status: "Confirmado", tel: d.cliente.tel || "", email: d.cliente.email || "", montagem: /^\d{4}-\d{2}-\d{2}$/.test(d.datas.montagem) ? d.datas.montagem : "", desmontagem: "", contrato: "",
      orcado: tot ? String(tot) : "", contratado: tot ? String(tot) : "", recebido: "", obs: "Criado pelo GERADOR DE ORÇAMENTO (" + d.numero + ")" + (d.datas.fim && d.datas.fim !== d.datas.ini ? "\nAté " + dataBR(d.datas.fim) : "") + (d.datas.horario ? "\nHorário: " + d.datas.horario : "") };
    evs.push(ev); gravar("neg_eventos", evs); d.eventoId = ev.id; salvarDoc(d);
    if (DOC && DOC.id === id) { DOC.eventoId = ev.id; desenharForm(); }
    fecharModal(); toast("✓ Evento criado em EVENTOS (" + (d.datas.ini ? dataBR(d.datas.ini) : "sem data") + ")."); if (!DOC) desenharLista();
  }
  function reciboDe(id) {
    var p = docs().filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var r = novoDoc("recibo"); r.cliente = JSON.parse(JSON.stringify(p.cliente)); r.refId = p.id;
    r.recibo.valor = total(p); r.recibo.referente = "prestação de serviços conforme proposta " + p.numero + (p.escopo[0] || p.objeto ? " — " + (p.objeto || p.escopo[0]) : "") + (p.datas.ini ? ", evento de " + periodo(p.datas.ini, p.datas.fim) : "") + (p.datas.local ? " (" + p.datas.local + ")" : "");
    fecharModal(); abrir(r); salvarAtual();
  }
  function lancarNoEvento(r) {   /* recibo → soma ao "recebido" do evento (a sincronia leva ao Fluxo e ao Painel) */
    if (r.lancarEvento === false || r.lancado) return false;
    var p = docs().filter(function (x) { return x.id === r.refId; })[0]; if (!p || !p.eventoId) return false;
    var evs = ler("neg_eventos"), ev = evs.filter(function (x) { return String(x.id) === String(p.eventoId); })[0]; if (!ev) return false;
    ev.recebido = String(num(ev.recebido) + num(r.recibo.valor)); if (!ev.dataRecebido) ev.dataRecebido = r.recibo.data;
    gravar("neg_eventos", evs); r.lancado = true; return true;
  }

  /* ================= MODAIS: MINHA EMPRESA, MEUS BOTÕES ================= */
  function modal(h, larga) { $("modalCx").className = "cx" + (larga ? " larga" : ""); $("modalCx").innerHTML = h; $("modal").hidden = false; }
  function fecharModal() { $("modal").hidden = true; $("modalCx").innerHTML = ""; }
  function abrirEmpresa() {
    var e = empresa(), t = textos(), logo = cfg("logo", "");
    var c = function (rot, k, v, ph, larg, tipo) { return '<label class="' + (larg ? "largo" : "") + '"><span>' + rot + '</span><input class="pr-in" type="' + (tipo || "text") + '" data-emp="' + k + '" value="' + esc(v) + '" placeholder="' + esc(ph || "") + '"></label>'; };
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>⚙ Minha empresa</h3><p class="tf-sub">Aparece no cabeçalho, na assinatura e no rodapé de todos os orçamentos e recibos. Fica na sua conta (celular e computador).</p>' +
      '<div class="pr-tit" style="margin-top:12px">Logo</div><div class="pr-sugs" style="align-items:center">' + (logo ? '<img class="pr-logo-mini" alt="Logo" src="' + logo + '">' : "") + '<button type="button" class="pr-chip" data-a="logoEnviar">' + (logo ? "TROCAR LOGO" : "ENVIAR LOGO") + '</button><button type="button" class="pr-chip" data-a="logoKit">USAR DA ★ MINHA MARCA</button>' + (logo ? '<button type="button" class="pr-chip" data-a="logoTirar">TIRAR</button>' : "") + "</div>" +
      (logo ? '<div class="pr-sugs" style="align-items:center"><button type="button" class="pr-chip" data-a="logoFundo" data-v="borda" title="Tira o fundo liso em volta da logo">✂ TIRAR FUNDO</button><button type="button" class="pr-chip" data-a="logoFundo" data-v="tudo" title="Tira também o fundo de dentro das letras (O, A, B…)">✂ TIRAR FUNDO + DENTRO DAS LETRAS</button>' + (cfg("logoOrig", "") ? '<button type="button" class="pr-chip" data-a="logoOriginal">↺ VOLTAR AO ORIGINAL</button>' : "") + '</div><p class="tf-sub" style="margin:4px 0 0">O quadriculado é a parte transparente: a logo fica por cima da cor do cabeçalho do orçamento.</p>' : "") +
      '<div class="pr-campos" style="margin-top:12px">' + c("Nome fantasia", "fantasia", e.fantasia, "BW Produções") + c("Razão social", "razao", e.razao, "Áudio e Vídeo BW Ltda") + c("CNPJ", "cnpj", e.cnpj, "00.000.000/0001-00") + c("Responsável (assina)", "resp", e.resp, "Marcos Bonfá") +
      c("Telefone / WhatsApp", "tel", e.tel, "(31) 99999-0000", false, "tel") + c("E-mail", "email", e.email, "contato@empresa.com", false, "email") + c("Site / Instagram", "site", e.site, "@suaempresa") + c("Cidade", "cidade", e.cidade, "Belo Horizonte") +
      c("Título dos orçamentos", "titulo", e.titulo, "Proposta para prestação de serviços", true) + "</div>" +
      '<div class="pr-tit" style="margin-top:12px">Pix (para QR code no orçamento)</div><div class="pr-campos"><label><span>Tipo da chave</span><select class="pr-in" data-emp="pixTipo">' + [["cnpj", "CNPJ"], ["cpf", "CPF"], ["tel", "Telefone"], ["email", "E-mail"], ["aleatoria", "Aleatória"]].map(function (o) { return '<option value="' + o[0] + '"' + (e.pixTipo === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></label>" + c("Chave Pix", "pix", e.pix, "48.606.212/0001-43") + "</div>" +
      '<div class="pr-tit" style="margin-top:12px">Cor e estilo padrão</div><div class="pr-sugs">' + ["#C9A227", "#E8C26A", "#FFB547", "#1F6FEB", "#0B3D91", "#2F7D4F", "#C22B2B", "#7B4FD3", "#111111"].map(function (k) { return '<button type="button" class="pr-chip' + (e.cor === k ? " on" : "") + '" data-a="cor" data-v="' + k + '"><i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + k + ';border:1px solid rgba(255,255,255,.4)"></i></button>'; }).join("") + '<input type="color" data-emp="cor" value="' + esc(e.cor) + '" aria-label="Outra cor" style="width:44px;height:36px;border:0;background:none"></div>' +
      '<div class="pr-sugs">' + [["classico", "CLÁSSICO"], ["moderno", "MODERNO"], ["limpo", "LIMPO"]].map(function (s) { return '<button type="button" class="pr-chip' + (e.estilo === s[0] ? " on" : "") + '" data-a="estiloPadrao" data-v="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</div>" +
      '<div class="pr-tit" style="margin-top:12px">Textos padrão</div><div class="pr-campos"><label class="largo"><span>Abertura</span><textarea class="pr-in" data-txt="abertura">' + esc(t.abertura) + '</textarea></label><label class="largo"><span>Encerramento</span><textarea class="pr-in" data-txt="encerramento">' + esc(t.encerramento) + "</textarea></label></div>" +
      '<div class="pr-sugs" style="margin-top:14px"><button type="button" class="bw-btn" data-a="fecharEmpresa">✓ PRONTO</button></div>', true);
  }
  function salvarEmpresaCampo(k, v) { var e = empresa(); e[k] = v; salvarCfg("empresa", e); }
  /* LOGO SEM FUNDO (16/11): tira o fundo liso (branco ou outra cor) pelas bordas, limpa o halo claro nas bordas das letras
     (des-mistura da cor do fundo), corta as sobras transparentes e salva sempre em PNG (JPEG perderia a transparência). */
  function imgDe(src) { return new Promise(function (ok, erro) { var x = new Image(); x.onload = function () { ok(x); }; x.onerror = erro; x.src = src; }); }
  function pngLimitado(c) {
    var url = c.toDataURL("image/png");
    while (url.length > 450000 && c.width > 120) { var k = 0.8, n = document.createElement("canvas"); n.width = Math.round(c.width * k); n.height = Math.round(c.height * k); n.getContext("2d").drawImage(c, 0, 0, n.width, n.height); c = n; url = c.toDataURL("image/png"); }
    return url;
  }
  function analisarFundo(d, w, h) {
    var am = [], k, passo = Math.max(1, Math.round(Math.max(w, h) / 64));
    for (k = 0; k < w; k += passo) am.push(k * 4, ((h - 1) * w + k) * 4);
    for (k = 0; k < h; k += passo) am.push(k * w * 4, (k * w + w - 1) * 4);
    var op = am.filter(function (i) { return d[i + 3] > 200; });
    if (op.length < am.length * 0.6) return null; /* bordas já transparentes */
    var r = 0, g = 0, b = 0; op.forEach(function (i) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }); r /= op.length; g /= op.length; b /= op.length;
    var perto = op.filter(function (i) { return Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) < 60; }).length;
    return { r: r, g: g, b: b, liso: perto / op.length > 0.85 };
  }
  function tirarFundoCanvas(c, tudo) {
    var w = c.width, h = c.height, x = c.getContext("2d", { willReadFrequently: true }), img = x.getImageData(0, 0, w, h), d = img.data;
    var f = analisarFundo(d, w, h), tol = 40, N = w * h, fora = new Uint8Array(N), p, q, sementes = null;
    function dist(i) { var a = d[i] - f.r, b = d[i + 1] - f.g, cc = d[i + 2] - f.b; return Math.sqrt(a * a + b * b + cc * cc); }
    if (!f) {
      /* bordas já transparentes, mas com um BLOCO BRANCO por dentro (ex.: emblema num quadrado branco, logo tirada do Word):
         o fundo branco começa nos pixels brancos opacos que encostam no transparente */
      f = { r: 255, g: 255, b: 255 }; sementes = [];
      for (p = 0; p < N; p++) {
        if (d[p * 4 + 3] < 230 || dist(p * 4) >= tol) continue;
        /* encosta no transparente (até 2 px: a borda costuma ter 1 px semitransparente) */
        var px = p % w, py = (p / w) | 0, encosta = false;
        for (var ey = -2; ey <= 2 && !encosta; ey++) for (var ex = -2; ex <= 2; ex++) { var X0 = px + ex, Y0 = py + ey; if (X0 >= 0 && Y0 >= 0 && X0 < w && Y0 < h && d[(Y0 * w + X0) * 4 + 3] < 128) { encosta = true; break; } }
        if (encosta) sementes.push(p);
      }
      if (sementes.length < 8) return null;
    }
    var opacosAntes = 0; for (p = 0; p < N; p++) if (d[p * 4 + 3] > 20) opacosAntes++;
    /* 1) o que é fundo some: só o que encosta na borda (TIRAR FUNDO) ou toda cor de fundo (+ DENTRO DAS LETRAS) */
    if (tudo && !sementes) { for (p = 0; p < N; p++) if (dist(p * 4) < tol) fora[p] = 1; }
    else {
      var fila = [], tenta = function (k) { if (k < 0 || k >= N || fora[k]) return; if (dist(k * 4) < tol) { fora[k] = 1; fila.push(k); } };
      if (sementes) sementes.forEach(tenta);
      else { for (p = 0; p < w; p++) { tenta(p); tenta((h - 1) * w + p); } for (p = 0; p < h; p++) { tenta(p * w); tenta(p * w + w - 1); } }
      while (fila.length) { q = fila.pop(); var qx = q % w; if (qx > 0) tenta(q - 1); if (qx < w - 1) tenta(q + 1); tenta(q - w); tenta(q + w); }
      if (sementes) {
        /* só sai BLOCO branco (fundo): mancha com miolo cheio de pelo menos (2r+1)² px. Letra branca é traço fino → fica. */
        var r = Math.max(3, Math.round(Math.min(w, h) * 0.035)), W1 = w + 1, soma = new Int32Array(W1 * (h + 1)), yy0, xx0;
        for (yy0 = 0; yy0 < h; yy0++) { var lin = 0; for (xx0 = 0; xx0 < w; xx0++) { lin += fora[yy0 * w + xx0]; soma[(yy0 + 1) * W1 + xx0 + 1] = soma[yy0 * W1 + xx0 + 1] + lin; } }
        var cheio = (2 * r + 1) * (2 * r + 1), rot = new Int32Array(N), nRot = 0, miolo = [0];
        for (p = 0; p < N; p++) if (fora[p] && !rot[p]) {
          nRot++; miolo.push(0); var pilha = [p]; rot[p] = nRot;
          while (pilha.length) {
            q = pilha.pop(); var cx = q % w, cy = (q / w) | 0;
            if (cx >= r && cy >= r && cx + r < w && cy + r < h) { var a0 = (cy - r) * W1 + cx - r, a1 = (cy - r) * W1 + cx + r + 1, b0 = (cy + r + 1) * W1 + cx - r, b1 = (cy + r + 1) * W1 + cx + r + 1; if (soma[b1] - soma[a1] - soma[b0] + soma[a0] === cheio) miolo[nRot]++; }
            [cx > 0 ? q - 1 : -1, cx < w - 1 ? q + 1 : -1, q - w, q + w].forEach(function (v) { if (v >= 0 && v < N && fora[v] && !rot[v]) { rot[v] = nRot; pilha.push(v); } });
          }
        }
        for (p = 0; p < N; p++) if (fora[p] && miolo[rot[p]] < 10) fora[p] = 0;
      }
    }
    var saiu = 0; for (p = 0; p < N; p++) if (fora[p] && d[p * 4 + 3] > 20) saiu++;
    if (!saiu || (sementes && saiu > opacosAntes * 0.7)) return null; /* nada a tirar, ou levaria a logo junto */
    for (p = 0; p < N; p++) if (fora[p]) d[p * 4 + 3] = 0;
    /* 2) borda das letras (2 px em volta do que saiu): a cor misturada com o fundo vira a cor da letra + transparência — sem halo branco */
    var anel = new Uint8Array(N), ix, iy, dx, dy;
    for (p = 0; p < N; p++) if (!fora[p]) { ix = p % w; iy = (p / w) | 0; achou: for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) { var X = ix + dx, Y = iy + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && fora[Y * w + X]) { anel[p] = 1; break achou; } } }
    var novos = [];
    for (p = 0; p < N; p++) if (anel[p]) {
      ix = p % w; iy = (p / w) | 0; var dp = dist(p * 4), melhor = -1, dm = dp;
      for (dy = -3; dy <= 3; dy++) for (dx = -3; dx <= 3; dx++) { var X2 = ix + dx, Y2 = iy + dy; if (X2 < 0 || Y2 < 0 || X2 >= w || Y2 >= h) continue; var k2 = Y2 * w + X2; if (fora[k2] || anel[k2]) continue; var dk = dist(k2 * 4); if (dk > dm) { dm = dk; melhor = k2; } }
      if (melhor < 0) { for (dy = -3; dy <= 3; dy++) for (dx = -3; dx <= 3; dx++) { var X3 = ix + dx, Y3 = iy + dy; if (X3 < 0 || Y3 < 0 || X3 >= w || Y3 >= h) continue; var k3 = Y3 * w + X3; if (fora[k3]) continue; var d3 = dist(k3 * 4); if (d3 > dm) { dm = d3; melhor = k3; } } }
      if (melhor < 0 || dm < dp + 8) continue;
      var al = Math.max(0, Math.min(1, dp / dm)); novos.push(p, melhor, al);
    }
    for (var t = 0; t < novos.length; t += 3) { var i0 = novos[t] * 4, i1 = novos[t + 1] * 4, al2 = novos[t + 2]; d[i0] = d[i1]; d[i0 + 1] = d[i1 + 1]; d[i0 + 2] = d[i1 + 2]; d[i0 + 3] = Math.min(d[i0 + 3], Math.round(255 * al2)); }
    x.putImageData(img, 0, 0);
    /* corta as sobras transparentes (a logo fica do tamanho certo no cabeçalho) */
    var x0 = w, y0 = h, x1 = -1, y1 = -1, yy, xx;
    for (yy = 0; yy < h; yy++) for (xx = 0; xx < w; xx++) if (d[(yy * w + xx) * 4 + 3] > 12) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 < 0) return null; /* sumiu tudo: tolerância não serve para esta logo */
    var m = 4; x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
    var n = document.createElement("canvas"); n.width = x1 - x0 + 1; n.height = y1 - y0 + 1; n.getContext("2d").drawImage(c, x0, y0, n.width, n.height, 0, 0, n.width, n.height);
    return n;
  }
  async function logoSemFundo(url, tudo) {
    var im = await imgDe(url), c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext("2d").drawImage(im, 0, 0);
    var n = tirarFundoCanvas(c, tudo); return n ? pngLimitado(n) : "";
  }
  function temFundoLiso(url) {
    return imgDe(url).then(function (im) { var c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(im, 0, 0); var f = analisarFundo(x.getImageData(0, 0, c.width, c.height).data, c.width, c.height); return !!(f && f.liso); }).catch(function () { return false; });
  }
  async function receberLogo(blob) {
    var u = URL.createObjectURL(blob), im = await imgDe(u);
    var k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
    var orig = pngLimitado(c), url = orig;
    /* fundo liso (branco de JPG/Word)? já entra sem fundo; a original fica guardada para VOLTAR AO ORIGINAL */
    if (await temFundoLiso(orig)) { var sem = await logoSemFundo(orig, false); if (sem) { url = sem; toast("✓ Logo sem fundo (PNG transparente). Não ficou bom? Toque em VOLTAR AO ORIGINAL."); } }
    salvarCfg("logoOrig", url !== orig ? orig : ""); salvarCfg("logo", url); return url;
  }
  function lerKitLogo() {
    return new Promise(function (ok) {
      if (!window.indexedDB) return ok("");
      var r = indexedDB.open("bw_fotos_marca", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kit"); }; r.onerror = function () { ok(""); };
      r.onsuccess = function () { try { var q = r.result.transaction("kit").objectStore("kit").get("kit"); q.onsuccess = function () { var k = q.result; ok(k && k.logos && k.logos[0] ? k.logos[0].url : ""); }; q.onerror = function () { ok(""); }; } catch (e) { ok(""); } };
    });
  }
  function abrirBotoes() {
    var l = botoes(), proprio = Array.isArray(cfg("botoes", null));
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>★ Meus botões</h3><p class="tf-sub">Cada botão preenche o orçamento com o que você sempre faz (o que será feito, equipe, equipamentos, observações e valor sugerido). Para criar um: monte um orçamento e toque em <b>★ SALVAR COMO BOTÃO</b>.</p>' +
      l.map(function (b, i) {
        return '<div class="pr-item" style="margin-top:8px"><input class="pr-in" data-bnome="' + i + '" value="' + esc(b.nome) + '" aria-label="Nome do botão"><input class="pr-in" data-bvalor="' + i + '" value="' + esc(b.valor || "") + '" inputmode="decimal" style="flex:0 0 120px" aria-label="Valor sugerido" placeholder="Valor">' +
          '<button type="button" data-a="bSobe" data-i="' + i + '" aria-label="Subir">↑</button><button type="button" data-a="bTira" data-i="' + i + '" aria-label="Excluir botão">✕</button></div>';
      }).join("") + '<div class="pr-sugs" style="margin-top:14px"><button type="button" class="bw-btn" data-a="fecharModal">✓ PRONTO</button>' + (proprio ? '<button type="button" class="bw-btn bw-btn--vidro" data-a="bPadrao">RESTAURAR OS 7 PADRÃO</button>' : "") + "</div>", true);
  }
  function salvarBotoes(l) { salvarCfg("botoes", l); }

  /* ================= IA (IA Brightway — só o texto que a pessoa colou) ================= */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  async function ia(sistema, pedido, max) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    try { var r = await fetch(FN_TXT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: sistema, pedido: pedido, max: max || 900 }) });
      var j = await r.json().catch(function () { return {}; }); if (!r.ok) return { erro: j.erro || "http_" + r.status }; return j; } catch (e) { return { erro: "rede" }; }
  }
  function jsonDe(t) { t = String(t || "").replace(/```(json)?/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function erroIA(e) { return { sem_login: "Entre na sua conta para usar a IA.", limite: "Limite diário da IA atingido. Amanhã libera de novo.", ocupada: "A IA está ocupada. Tente em alguns segundos.", rede: "Sem internet agora." }[e] || "A IA não respondeu agora (" + e + ")."; }
  function abrirIA() {
    modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Montar com IA</h3><p class="tf-sub">Cole a mensagem do cliente (WhatsApp, e-mail) ou descreva do seu jeito. Ex.: <i>"André da Arte Eventos, transmissão para telão no Expominas dia 18/11, montagem 16, ensaio 17, 3 câmeras, R$ 8.500"</i>.</p>' +
      '<textarea class="pr-in" id="iaTexto" style="min-height:140px" maxlength="3000" placeholder="Cole aqui…"></textarea><div class="pr-sugs" style="margin-top:12px"><button type="button" class="bw-btn" data-a="iaMontar">✨ MONTAR O ORÇAMENTO</button></div><p class="pr-msg" id="iaMsg"></p>');
  }
  async function iaMontar() {
    var txt = ($("iaTexto").value || "").trim(); if (txt.length < 8) { $("iaMsg").textContent = "Escreva um pouco mais sobre o pedido."; return; }
    $("iaMsg").textContent = "✨ Lendo o pedido…";
    var bts = botoes().map(function (b) { return b.nome; });
    var r = await ia("Você monta orçamentos de uma produtora de audiovisual (vídeo, foto, transmissão ao vivo, telão de LED, áudio). Leia o pedido do cliente e responda SOMENTE um JSON. Nunca invente valores, nomes ou datas que não estejam no texto (deixe vazio). Datas no formato AAAA-MM-DD; o ano atual é " + new Date().getFullYear() + ".",
      "Botões disponíveis (escolha os que combinam, pode ser mais de um): " + bts.join(" | ") + "\n\nPedido:\n" + txt +
      '\n\nFormato: {"botoes":["NOME EXATO DE UM BOTÃO"],"tratamento":"A|Ao|À","nome":"","empresa":"","telefone":"","email":"","data_inicio":"","data_fim":"","local":"","montagem":"","ensaio":"","horario":"","valor":0,"escopo_extra":[""],"equipe_extra":[""],"equipamentos_extra":[""],"observacoes_extra":[""]}', 900);
    if (r.erro) { $("iaMsg").textContent = erroIA(r.erro); return; }
    var j = jsonDe(r.texto); if (!j) { $("iaMsg").textContent = "A IA respondeu fora do formato. Tente de novo."; return; }
    var d = DOC && DOC.tipo === "proposta" ? DOC : novoDoc("proposta");
    (j.botoes || []).forEach(function (n) { var b = botoes().filter(function (x) { return x.nome.toLowerCase() === String(n).toLowerCase(); })[0]; if (b) aplicarBotao(d, b); });
    var c = d.cliente; if (j.nome) c.nome = j.nome; if (j.empresa) c.empresa = j.empresa; if (j.telefone) c.tel = j.telefone; if (j.email) c.email = j.email; if (/^(A|Ao|À|Aos|Às)$/.test(j.tratamento || "")) c.trat = j.tratamento;
    var iso = function (x) { return /^\d{4}-\d{2}-\d{2}$/.test(x || "") ? x : ""; };
    if (iso(j.data_inicio)) d.datas.ini = j.data_inicio; if (iso(j.data_fim)) d.datas.fim = j.data_fim; if (j.local) d.datas.local = j.local; if (j.montagem) d.datas.montagem = j.montagem; if (j.ensaio) d.datas.ensaio = j.ensaio; if (j.horario) d.datas.horario = j.horario;
    if (num(j.valor) > 0) { if (d.valor.modo === "itens") d.valor.itens.push({ desc: "Serviço", qtd: 1, un: "serviço", unit: num(j.valor) }); else d.valor.total = num(j.valor); }
    juntar(d.escopo, (j.escopo_extra || []).filter(Boolean)); juntar(d.equipe, (j.equipe_extra || []).filter(Boolean)); juntar(d.equip, (j.equipamentos_extra || []).filter(Boolean)); juntar(d.obs, (j.observacoes_extra || []).filter(Boolean));
    fecharModal(); if (DOC === d) { mudou(true); } else { abrir(d); salvarAtual(); }
    toast("✨ Orçamento montado. Confira tudo antes de enviar.");
  }
  async function caprichar() {
    if (!DOC.escopo.length && !DOC.abertura) { toast("Adicione o que será feito primeiro."); return; }
    ocupado("✨ Caprichando no texto…");
    var r = await ia("Você revisa textos de propostas comerciais de audiovisual em português do Brasil: claro, profissional e cordial. Corrija gramática, padronize maiúsculas e mantenha TODOS os números, quantidades, nomes de equipamentos e prazos. Não acrescente itens. Responda SOMENTE um JSON.",
      JSON.stringify({ abertura: DOC.abertura, objeto: DOC.objeto, escopo: DOC.escopo, equipe: DOC.equipe, equipamentos: DOC.equip, observacoes: DOC.obs, encerramento: DOC.encerramento }) + '\n\nDevolva no MESMO formato JSON, com as mesmas chaves e o mesmo número de itens em cada lista.', 1200);
    ocupado("");
    if (r.erro) { toast(erroIA(r.erro)); return; }
    var j = jsonDe(r.texto); if (!j) { toast("A IA respondeu fora do formato. Tente de novo."); return; }
    var mesmo = function (a, b) { return Array.isArray(b) && b.length === a.length && b.every(function (x) { return typeof x === "string" && x.trim(); }); };
    if (typeof j.abertura === "string" && j.abertura.trim()) DOC.abertura = j.abertura.trim();
    if (typeof j.objeto === "string" && DOC.objeto) DOC.objeto = j.objeto.trim() || DOC.objeto;
    if (mesmo(DOC.escopo, j.escopo)) DOC.escopo = j.escopo; if (mesmo(DOC.equipe, j.equipe)) DOC.equipe = j.equipe; if (mesmo(DOC.equip, j.equipamentos)) DOC.equip = j.equipamentos; if (mesmo(DOC.obs, j.observacoes)) DOC.obs = j.observacoes;
    if (typeof j.encerramento === "string" && j.encerramento.trim()) DOC.encerramento = j.encerramento.trim();
    mudou(true); toast("✨ Texto revisado. Use o ↶ do teclado ou edite se não gostar.");
  }

  /* ================= IMPORTAR .DOCX (os orçamentos antigos) ================= */
  async function importar(files) {
    if (!files.length) return;
    ocupado("Lendo " + files.length + " arquivo(s)…");
    try { await carregar("zip"); } catch (e) { ocupado(""); toast("Sem internet para ler o .docx agora."); return; }
    var feitos = 0, logoAchada = "", empAchada = null;
    for (var i = 0; i < files.length; i++) {
      try {
        var buf = await files[i].arrayBuffer(), z = await JSZip.loadAsync(buf), xml = await z.file("word/document.xml").async("string");
        var linhas = paragrafos(xml), rodape = "";
        for (var f in z.files) if (/^word\/(footer|header)\d*\.xml$/.test(f)) rodape += "\n" + paragrafos(await z.file(f).async("string")).join("\n");
        var r = interpretar(linhas, rodape);
        if (!logoAchada) for (var f2 in z.files) if (/^word\/media\/.+\.(png|jpe?g)$/i.test(f2)) { var bl = await z.file(f2).async("blob"); if (bl.size > 3000) { logoAchada = new Blob([bl], { type: /png$/i.test(f2) ? "image/png" : "image/jpeg" }); break; } }
        if (!empAchada) empAchada = r.empresa;
        var d = r.doc; d.numero = proxNumero("ORC"); d.status = "enviado"; d.importado = files[i].name; salvarDoc(d); feitos++;
      } catch (e) { toast("Não deu para ler " + files[i].name + "."); }
    }
    ocupado(""); desenharLista();
    var e = empresa(), semEmpresa = !e.cnpj && !e.razao && !e.fantasia;
    if (feitos && (semEmpresa || (logoAchada && !cfg("logo", "")))) {
      if (confirm("Importados " + feitos + " orçamento(s).\n\nUsar " + [logoAchada && !cfg("logo", "") ? "a LOGO" : "", semEmpresa && empAchada ? "os DADOS DA EMPRESA (CNPJ, telefone, responsável)" : ""].filter(Boolean).join(" e ") + " do arquivo nos próximos orçamentos?")) {
        if (logoAchada && !cfg("logo", "")) await receberLogo(logoAchada);
        if (semEmpresa && empAchada) salvarCfg("empresa", Object.assign(empresa(), empAchada));
        desenharLista(); toast("✓ Pronto. Confira em ⚙ MINHA EMPRESA.");
      }
    } else if (feitos) toast("✓ " + feitos + " orçamento(s) importado(s) como ENVIADOS.");
  }
  function paragrafos(xml) {
    var d = new DOMParser().parseFromString(xml, "application/xml"), W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    return Array.prototype.map.call(d.getElementsByTagNameNS(W, "p"), function (p) { return Array.prototype.map.call(p.getElementsByTagNameNS(W, "t"), function (t) { return t.textContent; }).join("").replace(/\s+/g, " ").trim(); }).filter(Boolean);
  }
  function isoDe(dd, mm, aa) { aa = String(aa || new Date().getFullYear()); if (aa.length === 2) aa = "20" + aa; return aa + "-" + String(mm).padStart(2, "0") + "-" + String(dd).padStart(2, "0"); }
  function interpretar(linhas, rodape) {
    var d = novoDoc("proposta"), modo = "escopo", emp = {}, tudo = linhas.join("\n") + "\n" + (rodape || "");
    d.obs = []; d.abertura = ""; d.encerramento = ""; d.datas.montagem = ""; d.datas.horario = "";
    linhas.forEach(function (l) {
      var t = l.replace(/^[•▪●\-–]\s*/, "").trim(), low = t.toLowerCase(), m;
      if (!t || /^(bw produ|proposta para presta|objeto do or|descri[cç][aã]o dos servi)/i.test(t)) { if (/^objeto do or/i.test(t)) modo = "objeto"; return; }
      if ((m = /^(A|Ao|À|Aos|Às|Prezad[oa]s?)\s*,\s*(.+)$/.exec(t)) && !d.cliente.nome && t.length < 120) { d.cliente.trat = m[1]; var nm = m[2], pe = /^(.*?)\s*\((.+)\)\s*$/.exec(nm); if (pe) { d.cliente.nome = pe[1].trim(); d.cliente.empresa = pe[2].trim(); } else d.cliente.nome = nm.trim(); return; }
      if (/^conforme solicitado/i.test(t)) { d.abertura = t; return; }
      if (/^checklist/i.test(t)) { modo = "check"; return; }
      if (/^☐/.test(t)) { d.check.push(t.replace(/^☐\s*/, "")); return; }
      if (/^equipe\s*:?$/i.test(t)) { modo = "equipe"; return; }
      if (/^equipamentos?\s*:?$/i.test(t)) { modo = "equip"; return; }
      if ((m = /^data do evento\s*:\s*(.*)$/i.exec(t))) {
        var resto = m[1], loc = /local\s*:\s*(.+)$/i.exec(resto); if (loc) { d.datas.local = loc[1].trim(); resto = resto.slice(0, loc.index); }
        var r1 = /(\d{1,2})\s*a\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(resto), r2 = /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/.exec(resto);
        if (r1) { d.datas.ini = isoDe(r1[1], r1[3], r1[4]); d.datas.fim = isoDe(r1[2], r1[3], r1[4]); } else if (r2) d.datas.ini = isoDe(r2[1], r2[2], r2[3]);
        modo = "fim"; return;
      }
      if ((m = /^montagem\s*:\s*(.*)$/i.exec(t))) { d.datas.montagem = m[1].trim(); return; }
      if ((m = /^(testes|ensaio)[^:]*:\s*(.*)$/i.exec(t))) { d.datas.ensaio = m[2].trim(); return; }
      if ((m = /^hor[aá]rio\s*:\s*(.*)$/i.exec(t))) { d.datas.horario = m[1].trim(); return; }
      if ((m = /^valor (da proposta|de investimento)\s*:?\s*(R\$\s*[\d.,]+)\s*(.*)$/i.exec(t))) { d.valor.total = num(m[2]); var por = m[3].replace(/^\(|\)$/g, "").trim(); if (por) d.valor.por = por; modo = "fim"; return; }
      if ((m = /^obs\.?\s*:?\s*pagamento\s*:?\s*(.*)$/i.exec(t))) { d.pagamento = m[1].trim(); return; }
      if ((m = /^observa[cç][oõ]es\s*:?\s*(.*)$/i.exec(t))) { modo = "obs"; if (m[1]) d.obs.push(m[1].trim()); return; }
      if (/^agradecemos/i.test(t)) { d.encerramento = t; modo = "fim"; return; }
      if ((m = /^atenciosamente\s*,?\s*(.+?)\s*[–-]\s*(\(?\d{2}\)?\s*[\d\s-]{8,})$/i.exec(t))) { var quem = m[1].trim(); if (/ltda|eireli|\bme\b|s\.?a\.?$/i.test(quem)) emp.razao = quem; else emp.resp = quem; emp.tel = m[2].trim(); return; }
      if ((m = /^cnpj\s*:?\s*([\d./-]{14,20})/i.exec(t))) { emp.cnpj = m[1]; return; }
      if ((m = /^([A-ZÀ-Úa-zà-ú .]+),\s*(\d{1,2})[º°]?\s+de\s+([a-zç]+)\s+de\s+(\d{4})$/.exec(t))) { emp.cidade = m[1].trim(); var mi = MES.indexOf(m[3].toLowerCase()); if (mi >= 0) d.criado = isoDe(m[2], mi + 1, m[4]); return; }
      if (modo === "objeto") { d.objeto = t; modo = "escopo"; return; }
      if (modo === "equipe") d.equipe.push(t); else if (modo === "equip") d.equip.push(t); else if (modo === "obs") d.obs.push(t.replace(/^obs\.?\s*:\s*/i, ""));
      else if (modo === "check") d.check.push(t); else if (modo === "escopo") d.escopo.push(t.replace(/;$/, ""));
    });
    var em = /[\w.+-]+@[\w-]+(\.[a-z]{2,6})+/.exec(tudo); if (em) emp.email = em[0];
    if (!d.abertura) d.abertura = textos().abertura; if (!d.encerramento) d.encerramento = textos().encerramento;
    d.datas.montagem = d.datas.montagem || ""; d.atualizado = new Date((partes(d.criado) || [2026, 1, 1])[0], ((partes(d.criado) || [0, 1])[1]) - 1, (partes(d.criado) || [0, 0, 1])[2], 12).toISOString();
    return { doc: d, empresa: emp };
  }

  /* ================= EVENTOS DA TELA ================= */
  document.addEventListener("click", async function (ev) {
    var b = ev.target.closest("[data-a]"); if (!b) { if (ev.target === $("modal")) fecharModal(); return; }
    var a = b.dataset.a, id = b.dataset.id, v = b.dataset.v, i = +b.dataset.i, l = b.dataset.l;
    var achar = function () { return docs().filter(function (x) { return x.id === id; })[0]; };
    switch (a) {
      case "abaLista": { var ab = abasLista(); ab[v] = ab[v] === 0 ? 1 : 0; try { localStorage.setItem("ui_prop_abas", JSON.stringify(ab)); } catch (e) { } b.setAttribute("aria-expanded", ab[v] ? "true" : "false"); var corpo = document.querySelector('[data-corpo="' + v + '"]'); if (corpo) corpo.hidden = !ab[v]; break; }
      case "abrir": abrir(achar()); break;
      case "pdf": gerarPdf(achar()); break;
      case "st": mudarStatus(id, v); break;
      case "duplicar": var cp = JSON.parse(JSON.stringify(achar())); cp.id = novoDoc().id; cp.numero = ""; cp.status = "rascunho"; cp.criado = hoje(); cp.eventoId = ""; cp.aprovadoEm = cp.enviadoEm = ""; delete cp.importado; abrir(cp); salvarAtual(); toast("Cópia criada — ajuste e envie."); break;
      case "excluir": var dx = achar(); if (dx && confirm("Excluir " + (dx.numero || "este documento") + "? Não dá para desfazer.")) { apagarDoc(id); desenharLista(); } break;
      case "evento": criarEvento(id); break;
      case "recibo": reciboDe(id); break;
      case "voltar": salvarSeMexeu(); fechar(); break;
      case "botao": var bt = botoes().filter(function (x) { return x.id === v; })[0]; if (bt) { var substituiu = aplicarBotao(DOC, bt); mudou(true); toast(substituiu ? "✓ " + bt.nome + " — confira e ajuste." : "＋ " + bt.nome + " somado ao orçamento."); } break;
      case "sobe": if (i > 0) { var arr = DOC[l], t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; mudou(true); } break;
      case "tira": DOC[l].splice(i, 1); mudou(true); break;
      case "add": var inp = $("form").querySelector('[data-novo="' + l + '"]'); if (inp && inp.value.trim()) { DOC[l].push(inp.value.trim()); mudou(true); var n2 = $("form").querySelector('[data-novo="' + l + '"]'); if (n2) n2.focus(); } break;
      case "sug": DOC[l].push(v); mudou(true); break;
      case "poe": setPath(DOC, b.dataset.k, v); mudou(true); break;
      case "opcoes": abrirOpcoes("lista", l, b.dataset.t); break;
      case "opcoesCampo": abrirOpcoes("campo", b.dataset.k, b.dataset.t); break;
      case "opcLista": { var arr = DOC[l] = DOC[l] || [], ix = arr.map(function (x) { return x.toLowerCase(); }).indexOf(v.toLowerCase()); if (ix >= 0) arr.splice(ix, 1); else arr.push(v); mudou(true); abrirOpcoes("lista", l, b.dataset.t); break; }
      case "opcCampo": setPath(DOC, l, v); mudou(true); fecharModal(); break;
      case "modo": if (v === "itens" && DOC.valor.modo !== "itens" && !(DOC.valor.itens || []).length && num(DOC.valor.total)) DOC.valor.itens = [{ desc: (DOC.botoes || [])[0] ? DOC.botoes[0].charAt(0) + DOC.botoes[0].slice(1).toLowerCase() : "Serviço", qtd: 1, un: "serviço", unit: num(DOC.valor.total) }];
        if (v === "total" && DOC.valor.modo === "itens") { DOC.valor.total = total(DOC); }
        DOC.valor.modo = v; mudou(true); break;
      case "addItem": DOC.valor.itens.push({ desc: "", qtd: 1, un: "diária", unit: "" }); mudou(true); break;
      case "tiraItem": DOC.valor.itens.splice(i, 1); mudou(true); break;
      case "pdfEd": salvarAtual(); gerarPdf(DOC); break;
      case "assinarCert": {
        salvarAtual(); var dA = DOC; if (!window.BWAssinar) { toast("Ferramenta de assinatura não carregou (sem internet?)."); break; }
        if (!dA.numero) { dA.numero = proxNumero(dA.tipo === "recibo" ? "REC" : "ORC"); salvarDoc(dA); }
        BWAssinar.abrir({ pdf: function () { return pdfBlob(dA); }, nome: nomeArq(dA, "pdf"), motivo: dA.tipo === "recibo" ? "Recibo" : "Proposta comercial", local: empresa().cidade || "" });
        break; }
      case "word": salvarAtual(); gerarWord(DOC); break;
      case "enviar": salvarAtual(); enviar(DOC); break;
      case "marcouEnviado": if (DOC) depoisDeEnviar(DOC); setTimeout(fecharModal, 300); break;
      case "verPrevia": modal('<button type="button" class="pr-x" data-a="fecharModal" aria-label="Fechar">✕</button><h3>Prévia</h3><div class="pr-folha-cx" id="folhaCx2" style="margin-top:8px"><div class="pr-folha-esc" id="folhaEsc2"></div></div>', true);
        var cx2 = $("folhaCx2"), es2 = $("folhaEsc2"); es2.innerHTML = folhaHTML(modelo(DOC)); var k2 = Math.min(1, (cx2.clientWidth - 24) / 794); es2.style.transform = "scale(" + k2 + ")"; es2.style.width = "794px"; cx2.style.height = Math.ceil(es2.firstChild.offsetHeight * k2 + 24) + "px"; break;
      case "stEd": salvarAtual(); mudarStatus(DOC.id, v); break;
      case "reciboEd": salvarAtual(); reciboDe(DOC.id); break;
      case "eventoEd": salvarAtual(); criarEvento(DOC.id); break;
      case "comoBotao": var nome = prompt("Nome do botão (ex.: TRANSMISSÃO 2 CÂMERAS):", (DOC.botoes || [])[0] || ""); if (nome && nome.trim()) { var lb = botoes().slice(), novo = botaoDoDoc(DOC, nome.trim()), j0 = lb.findIndex(function (x) { return x.nome === novo.nome; }); if (j0 >= 0) { novo.id = lb[j0].id; lb[j0] = novo; } else lb.push(novo); salvarBotoes(lb); desenharForm(); toast("★ Botão " + novo.nome + " salvo."); } break;
      case "excluirEd": if (confirm("Excluir " + (DOC.numero || "este documento") + "? Não dá para desfazer.")) { clearTimeout(tSalvar); apagarDoc(DOC.id); fechar(); } break;
      case "ia": abrirIA(); break;
      case "iaMontar": iaMontar(); break;
      case "caprichar": caprichar(); break;
      case "fecharModal": fecharModal(); break;
      case "fecharEmpresa": fecharModal(); desenharLista(); if (DOC) { desenharForm(); previa(); } break;
      case "cor": salvarEmpresaCampo("cor", v); abrirEmpresa(); if (DOC) previa(); break;
      case "estiloPadrao": salvarEmpresaCampo("estilo", v); abrirEmpresa(); break;
      case "logoEnviar": $("arqLogo").click(); break;
      case "logoKit": var u = await lerKitLogo(); if (!u) { toast("Nenhuma logo em ★ MINHA MARCA (Editor de fotos) neste aparelho."); break; } var bl = await (await fetch(u)).blob(); await receberLogo(bl); abrirEmpresa(); if (DOC) previa(); break;
      case "logoTirar": salvarCfg("logo", ""); salvarCfg("logoOrig", ""); abrirEmpresa(); if (DOC) previa(); break;
      case "logoFundo": { var base = cfg("logoOrig", "") || cfg("logo", ""); if (!base) break; var sf = await logoSemFundo(base, v === "tudo"); if (!sf) { toast("Não achei fundo liso para tirar nesta logo (ou levaria a logo junto). Ela continua como estava."); break; } if (!cfg("logoOrig", "")) salvarCfg("logoOrig", base); salvarCfg("logo", sf); abrirEmpresa(); if (DOC) previa(); toast("✓ Fundo tirado — a logo agora é PNG transparente."); break; }
      case "logoOriginal": { var o = cfg("logoOrig", ""); if (!o) break; salvarCfg("logo", o); salvarCfg("logoOrig", ""); abrirEmpresa(); if (DOC) previa(); toast("Logo original de volta."); break; }
      case "bSobe": if (i > 0) { var lb2 = botoes().slice(), t2 = lb2[i - 1]; lb2[i - 1] = lb2[i]; lb2[i] = t2; salvarBotoes(lb2); abrirBotoes(); } break;
      case "bTira": var lb3 = botoes().slice(); if (confirm("Excluir o botão " + lb3[i].nome + "?")) { lb3.splice(i, 1); salvarBotoes(lb3.length ? lb3 : []); abrirBotoes(); } break;
      case "bPadrao": if (confirm("Voltar aos 7 botões padrão? Os seus botões serão apagados.")) { salvarBotoes([]); abrirBotoes(); } break;
    }
  });
  function salvarSeMexeu() { if (DOC && (DOC.numero || DOC.escopo.length || DOC.cliente.nome || DOC.cliente.empresa || num(DOC.valor.total) || (DOC.recibo && num(DOC.recibo.valor)))) { clearTimeout(tSalvar); salvarAtual(); if (DOC.tipo === "recibo" && lancarNoEvento(DOC)) { salvarDoc(DOC); toast("✓ Valor lançado como recebido no evento."); } } }
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.id === "busca") { BUSCA = el.value; var pos = el.selectionStart; desenharLista(); var nb = $("busca"); nb.focus(); try { nb.setSelectionRange(pos, pos); } catch (e) { } return; }
    if (el.dataset.emp) { salvarEmpresaCampo(el.dataset.emp, el.value); if (DOC) { clearTimeout(tPrev); tPrev = setTimeout(previa, 200); } return; }
    if (el.dataset.txt) { var t = textos(); t[el.dataset.txt] = el.value; salvarCfg("textos", t); return; }
    if (el.dataset.bnome != null) { var lb = botoes().slice(); lb[+el.dataset.bnome] = Object.assign({}, lb[+el.dataset.bnome], { nome: el.value.toUpperCase() }); salvarBotoes(lb); return; }
    if (el.dataset.bvalor != null) { var lb2 = botoes().slice(); lb2[+el.dataset.bvalor] = Object.assign({}, lb2[+el.dataset.bvalor], { valor: num(el.value) }); salvarBotoes(lb2); return; }
    if (!DOC) return;
    if (el.dataset.k) { setPath(DOC, el.dataset.k, el.type === "checkbox" ? el.checked : el.value); mudou(false); if (el.dataset.k === "recibo.valor") { var p = $("form").querySelector(".pr-msg:not(#msgEd)"); if (p) p.innerHTML = num(el.value) ? "Por extenso: <b>" + esc(extenso(el.value)) + "</b>" : ""; } return; }
    if (el.dataset.l) { DOC[el.dataset.l][+el.dataset.i] = el.value; mudou(false); return; }
    if (el.dataset.it) { DOC.valor.itens[+el.dataset.i][el.dataset.it] = el.value; mudou(false); }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target; if (!DOC) return;
    if (el.type === "checkbox" && el.dataset.k) { setPath(DOC, el.dataset.k, el.checked); mudou(false); }
    if (el.tagName === "SELECT" && el.dataset.k) { setPath(DOC, el.dataset.k, el.value); mudou(false); }
    if (el.dataset.k === "cliente.nome" || el.dataset.k === "cliente.empresa") { if (preencherCliente(el.dataset.k.split(".")[1])) { mudou(true); toast("✓ Dados do cliente completados."); } }
  });
  document.addEventListener("keydown", function (ev) { if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.novo) { ev.preventDefault(); var l = ev.target.dataset.novo; if (ev.target.value.trim()) { DOC[l].push(ev.target.value.trim()); mudou(true); var n = $("form").querySelector('[data-novo="' + l + '"]'); if (n) n.focus(); } } if (ev.key === "Escape" && !$("modal").hidden) fecharModal(); });
  $("btnNovo").onclick = function () { abrir(novoDoc("proposta")); };
  $("btnRecibo").onclick = function () { abrir(novoDoc("recibo")); };
  $("btnIA").onclick = abrirIA;
  $("btnImportar").onclick = function () { $("arqDocx").click(); };
  $("arqDocx").onchange = function () { var f = Array.prototype.slice.call(this.files || []); this.value = ""; importar(f); };
  $("arqLogo").onchange = async function () { var f = this.files && this.files[0]; this.value = ""; if (!f) return; try { await receberLogo(new Blob([await f.arrayBuffer()], { type: f.type })); abrirEmpresa(); if (DOC) previa(); } catch (e) { toast("Não deu para abrir essa imagem."); } };
  $("btnBotoes").onclick = abrirBotoes;
  $("btnEmpresa").onclick = abrirEmpresa;
  window.addEventListener("resize", function () { clearTimeout(tPrev); tPrev = setTimeout(previa, 150); });
  window.addEventListener("beforeunload", function () { if (DOC) salvarSeMexeu(); });
  window.addEventListener("pagehide", function () { if (DOC) salvarSeMexeu(); });

  /* selo LOGADO no topo */
  (async function () { var el = $("userBox"); if (!el) return; var s = await sessao(); var u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();

  /* início: ?lead=ID (vindo do FUNIL) · #pr_… (volta ao documento aberto) */
  function iniciar() {
    var q = new URLSearchParams(location.search), lead = q.get("lead"), h = location.hash.slice(1);
    if (lead) {
      var x = ler("mkt_leads").filter(function (y) { return String(y.id) === String(lead); })[0];
      if (x) { var d = novoDoc("proposta"); d.leadId = x.id; d.cliente.nome = x.nome || ""; d.cliente.empresa = x.empresa || ""; d.cliente.tel = x.tel || ""; d.cliente.email = x.email || "";
        if (/^\d{4}-\d{2}-\d{2}$/.test(x.dataEvento || "")) d.datas.ini = x.dataEvento; if (x.local) d.datas.local = x.local; if (num(x.valor)) d.valor.total = num(x.valor);
        var bt = botoes().filter(function (b) { return x.servico && b.nome.toLowerCase().indexOf(String(x.servico).toLowerCase().split(/[ /]/)[0]) >= 0; })[0]; if (bt) aplicarBotao(d, bt);
        try { history.replaceState(null, "", "propostas.html"); } catch (e) { } abrir(d); return; }
    }
    if (h && h.indexOf("pr_") === 0) { var dd = docs().filter(function (y) { return y.id === h; })[0]; if (dd) { abrir(dd); return; } }
    desenharLista();
  }
  iniciar();
  window.addEventListener("bw-sync-recebido", function () { if (!DOC) desenharLista(); });
  window.__prop = { docs: docs, novoDoc: novoDoc, modelo: modelo, total: total, extenso: extenso, pixPayload: pixPayload, crc16: crc16, interpretar: interpretar, paragrafos: paragrafos, aplicarBotao: aplicarBotao,
    botoes: botoes, abrir: abrir, DOC: function () { return DOC; }, salvarAtual: salvarAtual, gerarPdf: gerarPdf, gerarWord: gerarWord, importar: importar, mudarStatus: mudarStatus, criarEvento: criarEvento,
    reciboDe: reciboDe, lancarNoEvento: lancarNoEvento, salvarSeMexeu: salvarSeMexeu, empresa: empresa, salvarCfg: salvarCfg, cfg: cfg, folhaHTML: folhaHTML, fechar: fechar, defPdf: defPdf, iaMontar: iaMontar, receberLogo: receberLogo, logoSemFundo: logoSemFundo };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
