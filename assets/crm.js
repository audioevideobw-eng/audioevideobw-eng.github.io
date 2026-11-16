/* assets/crm.js — Brightway CRM (15/11/2026, Claude): base comum do FUNIL, INDICADORES e da página CRM.
   Dados da conta (sincronizados pelo bw-sync, chaves em CHAVES):
     mkt_leads   — contatos/oportunidades do funil (lista por id)
     mkt_modelos — mensagens prontas editadas pelo usuário (lista por id; vazio = modelos padrão)
     mkt_redes   — números mensais das redes sociais (lista por id "rd_AAAA-MM_rede")
     mkt_config  — ajustes (lista por id: cfg_servicos, cfg_assinatura, cfg_meta)
   IA: Edge Function bw-ia (Groq, chave guardada no Supabase) — só logado; sem login usa regras/modelos prontos.
   AGENTE: roda NO APARELHO ao abrir; monta a fila do dia (retornos, propostas paradas, pós-venda, indicação,
   reativação). Nada é enviado sozinho: cada mensagem sai só quando a pessoa toca (mesma regra do sino AVISOS). */
(function () {
  "use strict";
  if (window.BWCRM) return;
  var DIA = 86400000;

  /* ---------- dados ---------- */
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravar(k, v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(k, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + k + "_v1", JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function leads() { return ler("mkt_leads"); }
  function salvarLead(l) {
    var lista = leads(), i = lista.findIndex(function (x) { return String(x.id) === String(l.id); });
    if (i >= 0) lista[i] = l; else lista.push(l);
    gravar("mkt_leads", lista); return l;
  }
  function apagarLead(id) { gravar("mkt_leads", leads().filter(function (x) { return String(x.id) !== String(id); })); }
  function cfg(id, padrao) { var c = ler("mkt_config").filter(function (x) { return x.id === id; })[0]; return c ? c.valor : padrao; }
  function salvarCfg(id, valor) { var l = ler("mkt_config").filter(function (x) { return x.id !== id; }); l.push({ id: id, valor: valor }); gravar("mkt_config", l); }

  /* ---------- listas ---------- */
  var ETAPAS = [
    { id: "novo", nome: "NOVO CONTATO", cor: "#3FD0E0" },
    { id: "conversa", nome: "CONVERSANDO", cor: "#8AB4FF" },
    { id: "proposta", nome: "PROPOSTA ENVIADA", cor: "#C59BFF" },
    { id: "negociacao", nome: "NEGOCIANDO", cor: "#FFB547" },
    { id: "fechado", nome: "FECHADO", cor: "#5FE0A0" },
    { id: "perdido", nome: "PERDIDO", cor: "#FF8A9A" }];
  var ABERTAS = ["novo", "conversa", "proposta", "negociacao"];
  var ORIGENS = ["Instagram", "TikTok", "WhatsApp", "Indicação", "Site", "Google", "Cliente antigo", "Evento / feira", "LinkedIn", "Outro"];
  var MOTIVOS = ["Preço", "Data indisponível", "Sem resposta", "Fechou com outro", "Desistiu do evento", "Fora do perfil", "Outro"];
  var SERV_PADRAO = ["Casamento", "Corporativo", "Show", "Transmissão ao vivo", "Formatura", "Aniversário", "Outro"];
  function servicos() { var s = cfg("cfg_servicos", null); return Array.isArray(s) && s.length ? s : SERV_PADRAO.slice(); }
  function etapa(id) { return ETAPAS.filter(function (e) { return e.id === id; })[0] || ETAPAS[0]; }

  /* ---------- formatos ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); }
  function hoje() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }   // data LOCAL (pente fino 29)
  function somaDias(iso, n) { var d = new Date((iso || hoje()) + "T12:00"); d.setDate(d.getDate() + n); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dias(iso) { if (!/^\d{4}-\d\d-\d\d/.test(iso || "")) return null; return Math.round((new Date(String(iso).slice(0, 10) + "T12:00") - new Date(hoje() + "T12:00")) / DIA); }
  /* carimbo ISO (UTC) → dia LOCAL: "2026-11-16T00:45Z" ainda é 15/11 no Brasil (pente fino 29) */
  function diaLocal(ts) { var s = String(ts || ""); if (s.length <= 10) return s; var d = new Date(s); if (isNaN(d)) return s.slice(0, 10); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function dataBR(iso) { return /^\d{4}-\d\d-\d\d/.test(iso || "") ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—"; }
  function num(v) { if (typeof v === "number") return v; var s = String(v || "").replace(/[^\d,.-]/g, ""); if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", "."); var n = parseFloat(s); return isFinite(n) ? n : 0; }
  function moeda(v, casas) { var n = num(v); return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: casas == null ? 0 : casas, maximumFractionDigits: casas == null ? 0 : casas }); }
  function soDig(t) { return String(t || "").replace(/\D/g, ""); }
  function telWa(t) { var d = soDig(t); if (d.length < 10) return ""; return (d.length >= 12 && d.indexOf("55") === 0) ? d : "55" + d; }
  function maskTel(v) { v = soDig(v).replace(/^55(?=\d{10,11}$)/, "").slice(0, 11); if (v.length <= 10) return v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-\s]+$/, ""); return v.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/[-\s]+$/, ""); }
  function primeiroNome(l) { return String((l && (l.nome || l.empresa)) || "").trim().split(/\s+/)[0] || ""; }
  function titulo(l) { return l.nome && l.empresa ? l.nome + " · " + l.empresa : (l.nome || l.empresa || "Sem nome"); }
  function novoId() { return "ld_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* último toque = última conversa registrada (ou a criação) */
  function ultimoToque(l) {
    var t = (l.hist || []).filter(function (h) { return h.tipo !== "etapa" && h.tipo !== "sistema"; }).map(function (h) { return diaLocal(h.em); }).sort().pop();
    return t || l.criadoEm || hoje();
  }

  /* ---------- TEMPERATURA (0–100): regras simples e explicáveis ---------- */
  function temperatura(l) {
    if (ABERTAS.indexOf(l.etapa) < 0) return null;
    var p = { novo: 20, conversa: 35, proposta: 50, negociacao: 65 }[l.etapa] || 20, por = [];
    var de = dias(l.dataEvento);
    if (de !== null && de >= 0) { p += 10; if (de <= 60) { p += 10; por.push("evento em " + de + " dias"); } }
    if (num(l.valor) > 0) p += 5;
    if (l.origem === "Indicação" || l.origem === "Cliente antigo") { p += 10; por.push(l.origem.toLowerCase()); }
    var semFalar = -dias(ultimoToque(l));
    if (semFalar <= 3) { p += 10; por.push("conversa recente"); }
    else if (semFalar > 30) { p -= 30; por.push(semFalar + " dias sem conversa"); }
    else if (semFalar > 14) { p -= 15; por.push(semFalar + " dias sem conversa"); }
    if (l.prox && l.prox.data && !l.prox.feito && dias(l.prox.data) < 0) { p -= 10; por.push("retorno atrasado"); }
    p = Math.max(0, Math.min(100, p));
    return { pontos: p, nivel: p >= 65 ? "quente" : p >= 40 ? "morno" : "frio", porque: por.join(" · ") };
  }

  /* ---------- MENSAGENS PRONTAS ---------- */
  var MODELOS_PADRAO = [
    { id: "mdl_primeiro", nome: "PRIMEIRO CONTATO", texto: "Oi, {nome}! Tudo bem? Aqui é {assinatura}. Vi seu interesse em {servico} e já quero te ajudar. Me conta: qual a data e o local, e quantas pessoas vocês esperam?" },
    { id: "mdl_proposta", nome: "ENVIO DA PROPOSTA", texto: "{nome}, sua proposta de {servico} está pronta! Valor: {valor}. Qualquer dúvida é só me chamar por aqui. Posso reservar a data {data} para vocês?" },
    { id: "mdl_retorno", nome: "RETORNO DA PROPOSTA", texto: "Oi, {nome}! Passando para saber se você conseguiu olhar a proposta. Se quiser, ajusto algum item para caber melhor no que vocês precisam." },
    { id: "mdl_ultima", nome: "ÚLTIMA CHAMADA", texto: "{nome}, a data {data} ainda está guardada para vocês, mas consigo segurar só por mais alguns dias. Vamos fechar?" },
    { id: "mdl_fechado", nome: "CONFIRMAÇÃO DE FECHAMENTO", texto: "Fechado, {nome}! 🎉 Data {data} confirmada. Em breve te mando o contrato e os próximos passos. Obrigado pela confiança!" },
    { id: "mdl_depoimento", nome: "PÓS-EVENTO: DEPOIMENTO", texto: "{nome}, obrigado pela confiança no evento! Se puder, deixa um comentário rapidinho sobre o nosso trabalho — ajuda demais quem vem depois. 🙏" },
    { id: "mdl_indicacao", nome: "PEDIDO DE INDICAÇÃO", texto: "{nome}, você conhece alguém que vai precisar de {servico}? Indicação de cliente feliz é o nosso melhor marketing — e quem indica ganha um mimo especial!" },
    { id: "mdl_reativar", nome: "REATIVAR CLIENTE", texto: "Oi, {nome}! Já faz um tempo desde o nosso último trabalho juntos. Tem algum evento vindo por aí? Separei condições especiais para clientes da casa." }];
  function modelos() {
    var meus = ler("mkt_modelos");
    if (!meus.length) return MODELOS_PADRAO.slice();
    return meus.filter(function (m) { return !m.apagado; });
  }
  function salvarModelos(lista) { gravar("mkt_modelos", lista); }
  function assinatura() { return cfg("cfg_assinatura", "") || "a equipe"; }
  function preencher(texto, l) {
    l = l || {};
    var mapa = { nome: primeiroNome(l) || "tudo bem", empresa: l.empresa || l.nome || "", servico: (l.servico || "o seu evento").toLowerCase(),
      data: l.dataEvento ? dataBR(l.dataEvento).slice(0, 5) : "do evento", valor: num(l.valor) ? moeda(l.valor) : "a combinar", assinatura: assinatura() };
    return String(texto || "").replace(/\{(\w+)\}/g, function (m, k) { return mapa[k] != null ? mapa[k] : m; });
  }
  function linkWhats(l, texto) { var w = telWa(l && l.tel); return "https://wa.me/" + (w || "") + "?text=" + encodeURIComponent(texto); }

  /* ---------- AGENTE DE VENDAS: fila do dia (regras; a IA só personaliza o texto) ---------- */
  function filaDoAgente() {
    var fila = [], todos = leads(), hj = hoje();
    function add(l, tipo, tit, motivo, modelo, prio) { fila.push({ chave: l.id + "|" + tipo, leadId: l.id, tipo: tipo, titulo: tit, motivo: motivo, modelo: modelo, prio: prio, lead: l }); }
    todos.forEach(function (l) {
      var aberta = ABERTAS.indexOf(l.etapa) >= 0, semFalar = -dias(ultimoToque(l)), de = dias(l.dataEvento);
      var adiado = l.agente && l.agente.adiadoAte && l.agente.adiadoAte > hj;
      if (aberta && !adiado) {
        if (l.prox && l.prox.data && !l.prox.feito && dias(l.prox.data) <= 0) {
          var n = dias(l.prox.data);
          add(l, "retorno", "Retornar " + titulo(l), (l.prox.oque || "Retorno combinado") + (n < 0 ? " · atrasado " + (-n) + " dia(s)" : " · hoje"), l.etapa === "proposta" ? "mdl_retorno" : "mdl_primeiro", n < 0 ? 95 : 90);
          return;
        }
        if (de !== null && de >= 0 && de <= 21) { add(l, "urgente", "Data chegando: " + titulo(l), "O evento é em " + de + " dia(s) e ainda não fechou", "mdl_ultima", 92); return; }
        if (l.etapa === "novo" && !(l.hist || []).some(function (h) { return h.tipo !== "etapa" && h.tipo !== "sistema"; }))
          { add(l, "primeiro", "Primeiro contato: " + titulo(l), "Entrou " + (semFalar === 0 ? "hoje" : "há " + semFalar + " dia(s)") + " e ainda não teve conversa", "mdl_primeiro", 85); return; }
        if (l.etapa === "proposta" && semFalar >= 3) { add(l, "proposta", "Proposta parada: " + titulo(l), semFalar + " dias sem resposta da proposta", "mdl_retorno", 80); return; }
        if (l.etapa === "negociacao" && semFalar >= 2) { add(l, "negociacao", "Fechar negociação: " + titulo(l), semFalar + " dias sem conversa na negociação", "mdl_ultima", 82); return; }
        if (semFalar >= 21) { add(l, "esfriando", "Esfriando: " + titulo(l), semFalar + " dias sem conversa — retome ou marque como perdido", "mdl_retorno", 60); return; }
      }
      if (l.etapa === "fechado" && !adiado) {
        var pv = l.posvenda || {}, ev = dias(l.dataEvento);
        if (ev !== null && ev < 0) {
          if (!pv.depoimento && ev >= -14) add(l, "depoimento", "Pedir depoimento: " + titulo(l), "O evento foi há " + (-ev) + " dia(s) — melhor momento para pedir avaliação", "mdl_depoimento", 70);
          else if (!pv.indicacao && ev < -14 && ev >= -60) add(l, "indicacao", "Pedir indicação: " + titulo(l), "Cliente atendido há " + (-ev) + " dias", "mdl_indicacao", 55);
          else if (!pv.reativar && ev <= -180) {
            var temNovo = todos.some(function (o) { return o.id !== l.id && soDig(o.tel) && soDig(o.tel) === soDig(l.tel) && (o.criadoEm || "") > (l.dataEvento || ""); });
            if (!temNovo) add(l, "reativar", "Reativar: " + titulo(l), "Último trabalho há " + Math.round(-ev / 30) + " meses", "mdl_reativar", 45);
          }
        }
      }
    });
    return fila.sort(function (a, b) { return b.prio - a.prio; });
  }
  /* marca a ação como feita (registra na conversa e, no pós-venda, não repete) */
  function concluirAcao(item, como) {
    var l = leads().filter(function (x) { return String(x.id) === String(item.leadId); })[0]; if (!l) return;
    l.hist = l.hist || [];
    l.hist.push({ em: new Date().toISOString(), tipo: como || "whatsapp", txt: "Agente: " + item.titulo.split(":")[0] + (como === "pulado" ? " (pulado)" : "") });
    if (["depoimento", "indicacao", "reativar"].indexOf(item.tipo) >= 0) { l.posvenda = l.posvenda || {}; l.posvenda[item.tipo] = hoje(); }
    if (item.tipo === "retorno" && l.prox) l.prox = null;
    salvarLead(l);
  }
  function adiarAcao(item, n) {
    var l = leads().filter(function (x) { return String(x.id) === String(item.leadId); })[0]; if (!l) return;
    l.agente = l.agente || {}; l.agente.adiadoAte = somaDias(hoje(), n || 2); salvarLead(l);
  }

  /* ---------- IA (Edge Function bw-ia) ---------- */
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  async function ia(sistema, pedido, max) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    try {
      var r = await fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU" },
        body: JSON.stringify({ sistema: sistema, pedido: pedido, max: max || 700 }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok) return { erro: j.erro || ("http_" + r.status) };
      return j;
    } catch (e) { return { erro: "rede" }; }
  }
  function jsonDe(texto) {
    var t = String(texto || "").replace(/```(json)?/g, "");
    var a = t.indexOf("{"), b = t.lastIndexOf("}"), c = t.indexOf("["), d = t.lastIndexOf("]");
    var tenta = [];
    if (c >= 0 && d > c && (a < 0 || c < a)) tenta.push(t.slice(c, d + 1));
    if (a >= 0 && b > a) tenta.push(t.slice(a, b + 1));
    for (var i = 0; i < tenta.length; i++) { try { return JSON.parse(tenta[i]); } catch (e) { } }
    return null;
  }
  function erroIA(e) {
    return { sem_login: "Entre na sua conta para usar a IA Brightway.", limite: "Limite diário da IA atingido (60 pedidos). Amanhã libera de novo.",
      ocupada: "A IA está ocupada agora. Tente em alguns segundos.", rede: "Sem internet agora." }[e] || "A IA não respondeu agora (" + e + ").";
  }

  /* CAPTURA: texto colado (WhatsApp, Instagram, e-mail) → campos do contato. Regras primeiro (funciona sem internet). */
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function lerTextoRegras(txt) {
    var t = " " + String(txt || "").replace(/\s+/g, " ") + " ", o = {};
    var tel = t.match(/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\s?\d{4}[-\s]?\d{4}/); if (tel) o.tel = maskTel(tel[0]);
    var em = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/); if (em) o.email = em[0].replace(/[.,;]+$/, "");
    var ig = t.match(/(?:^|\s)@([a-z0-9._]{3,30})/i); if (ig && (!o.email || o.email.indexOf(ig[1]) < 0)) o.instagram = "@" + ig[1];
    var nm = t.match(/(?:[Mm]eu nome é|[Mm]e chamo|[Aa]qui é(?: a| o)?|[Ss]ou (?:a|o))\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú]+)?)/);
    if (nm) o.nome = nm[1];
    var emp = t.match(/(?:[Dd]a empresa|[Pp]ela empresa|[Ee]mpresa)\s+([A-Z0-9][\wÀ-ú&]+(?:\s+[A-Z0-9][\wÀ-ú&]+){0,2})(?=[\s.,!?])/); if (emp) o.empresa = emp[1];
    var vl = t.match(/R\$\s?([\d.]+(?:,\d{2})?)/i); if (vl) o.valor = num(vl[1]);
    var ano = new Date().getFullYear(), d = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/), d2 = t.match(new RegExp("(\\d{1,2})\\s+de\\s+(" + MESES.join("|") + ")(?:\\s+de\\s+(\\d{4}))?", "i"));
    var dia, mes, a;
    if (d) { dia = +d[1]; mes = +d[2]; a = d[3] ? (d[3].length === 2 ? 2000 + +d[3] : +d[3]) : ano; }
    else if (d2) { dia = +d2[1]; mes = MESES.indexOf(d2[2].toLowerCase()) + 1; a = d2[3] ? +d2[3] : ano; }
    if (dia && mes >= 1 && mes <= 12 && dia <= 31) { var iso = a + "-" + String(mes).padStart(2, "0") + "-" + String(dia).padStart(2, "0"); if (!d || !d[3]) { if (iso < hoje()) iso = (a + 1) + iso.slice(4); } o.dataEvento = iso; }
    var low = t.toLowerCase();
    servicos().forEach(function (s) { if (!o.servico && s !== "Outro" && low.indexOf(s.toLowerCase().split(" ")[0]) > -1) o.servico = s; });
    if (!o.servico && /transmiss|live|ao vivo/.test(low)) o.servico = servicos().filter(function (s) { return /transmiss/i.test(s); })[0];
    if (/instagram|insta\b|direct/.test(low)) o.origem = "Instagram"; else if (/tiktok/.test(low)) o.origem = "TikTok"; else if (/indica/.test(low)) o.origem = "Indicação"; else if (/google/.test(low)) o.origem = "Google"; else if (/site/.test(low)) o.origem = "Site";
    var loc = t.match(/(?:no|na|em)\s+((?:sal[aã]o|espa[cç]o|hotel|clube|igreja|fazenda|s[ií]tio|buffet|centro)[^,.!?]{2,40})/i); if (loc) o.local = loc[1].trim();
    o.resumo = String(txt || "").trim().slice(0, 400);
    return o;
  }
  async function lerTextoIA(txt) {
    var base = lerTextoRegras(txt);
    var sis = "Você extrai dados de pedidos de orçamento de clientes brasileiros. Responda SÓ um JSON, sem comentários, com as chaves: " +
      "nome, empresa, tel, email, instagram, servico (um destes: " + servicos().join(", ") + "), dataEvento (AAAA-MM-DD), local, convidados (número), valor (número em reais, só se o cliente citar), origem (" + ORIGENS.join(", ") + "), resumo (1 frase do que o cliente quer). " +
      "Hoje é " + hoje() + ". Deixe vazio o que não estiver no texto. Nunca invente.";
    var r = await ia(sis, String(txt).slice(0, 4000), 400);
    if (r.erro) return { dados: base, ia: false, erro: r.erro };
    var j = jsonDe(r.texto) || {};
    var o = Object.assign({}, base);
    Object.keys(j).forEach(function (k) { var v = j[k]; if (v !== null && v !== undefined && String(v).trim() !== "" && String(v) !== "0") o[k] = v; });
    if (o.tel) o.tel = maskTel(o.tel);
    if (o.valor) o.valor = num(o.valor);
    if (o.dataEvento && !/^\d{4}-\d\d-\d\d$/.test(o.dataEvento)) o.dataEvento = base.dataEvento || "";
    if (o.servico && servicos().indexOf(o.servico) < 0) o.servico = base.servico || "";
    if (o.origem && ORIGENS.indexOf(o.origem) < 0) o.origem = base.origem || "";
    return { dados: o, ia: true };
  }

  /* duplicados: mesmo telefone ou e-mail (dados limpos) */
  function duplicado(l) {
    var t = soDig(l.tel).slice(-9), e = String(l.email || "").toLowerCase();
    return leads().filter(function (x) { return String(x.id) !== String(l.id) && ((t.length >= 8 && soDig(x.tel).slice(-9) === t) || (e && String(x.email || "").toLowerCase() === e)); })[0] || null;
  }

  /* resumo do lead para a IA (só o necessário) */
  function resumoParaIA(l) {
    return ["Contato: " + primeiroNome(l) + (l.empresa ? " (" + l.empresa + ")" : ""), "Etapa: " + etapa(l.etapa).nome, "Serviço: " + (l.servico || "—"),
      "Data do evento: " + dataBR(l.dataEvento), "Valor: " + (num(l.valor) ? moeda(l.valor) : "—"), "Origem: " + (l.origem || "—"),
      "Último contato: " + dataBR(ultimoToque(l)), "Próximo passo: " + (l.prox && l.prox.data ? dataBR(l.prox.data) + " — " + (l.prox.oque || "") : "—"),
      "Histórico recente: " + (l.hist || []).slice(-6).map(function (h) { return dataBR(diaLocal(h.em)) + " " + h.tipo + ": " + h.txt; }).join(" | "),
      "Observações: " + String(l.obs || l.resumo || "").slice(0, 300)].join("\n");
  }
  var SIS_VENDAS = "Você é um consultor de vendas de uma pequena empresa brasileira de serviços (eventos, audiovisual e similares). " +
    "Tom: descontraído, próximo e profissional, como uma conversa de WhatsApp. Mensagens curtas (até 4 linhas), sem inventar preços, datas ou fatos que não estão nos dados.";
  async function proximaAcaoIA(l) {
    var r = await ia(SIS_VENDAS + " Responda SÓ um JSON: {\"acao\": \"o que fazer agora em 1 frase\", \"porque\": \"1 frase\", \"mensagem\": \"mensagem pronta para mandar\", \"quando\": \"AAAA-MM-DD do próximo retorno\"}. Hoje é " + hoje() + ". Assine como: " + assinatura() + ".",
      resumoParaIA(l), 500);
    if (r.erro) return { erro: r.erro };
    var j = jsonDe(r.texto); if (!j) return { erro: "formato" };
    return j;
  }
  /* o agente personaliza a fila inteira numa única chamada (economiza o limite diário) */
  async function personalizarFila(itens) {
    var lote = itens.slice(0, 8), pedido = lote.map(function (it, i) { return "### " + (i + 1) + " — ação: " + it.titulo + " (" + it.motivo + ")\n" + resumoParaIA(it.lead); }).join("\n\n");
    var r = await ia(SIS_VENDAS + " Para cada ação numerada, escreva a mensagem de WhatsApp ideal. Responda SÓ um JSON: [{\"n\": 1, \"mensagem\": \"...\"}, ...]. Assine como: " + assinatura() + ".", pedido, 1100);
    if (r.erro) return { erro: r.erro };
    var j = jsonDe(r.texto); if (!Array.isArray(j)) return { erro: "formato" };
    var out = {}; j.forEach(function (x) { var it = lote[(+x.n || 0) - 1]; if (it && x.mensagem) out[it.chave] = String(x.mensagem); });
    try { localStorage.setItem("ui_crm_agente_msgs", JSON.stringify({ dia: hoje(), msgs: out })); } catch (e) { }
    return { msgs: out };
  }
  function mensagensDoDia() { try { var c = JSON.parse(localStorage.getItem("ui_crm_agente_msgs") || "{}"); return c.dia === hoje() ? (c.msgs || {}) : {}; } catch (e) { return {}; } }

  /* ---------- números do funil (INDICADORES e página CRM) ---------- */
  function noPeriodo(iso, ini, fim) { return iso && iso >= ini && iso <= fim; }
  function numeros(lista, ini, fim) {
    lista = lista || leads();
    var entrou = lista.filter(function (l) { return noPeriodo(l.criadoEm, ini, fim); });
    var fech = lista.filter(function (l) { return l.etapa === "fechado" && noPeriodo(l.fechadoEm, ini, fim); });
    var perd = lista.filter(function (l) { return l.etapa === "perdido" && noPeriodo(l.perdidoEm, ini, fim); });
    var prop = lista.filter(function (l) { return noPeriodo((l.etapas || {}).proposta, ini, fim); });
    var valorF = fech.reduce(function (s, l) { return s + num(l.valor); }, 0);
    var ciclo = fech.map(function (l) { return Math.max(0, Math.round((new Date(l.fechadoEm + "T12:00") - new Date((l.criadoEm || l.fechadoEm) + "T12:00")) / DIA)); });
    var abertas = lista.filter(function (l) { return ABERTAS.indexOf(l.etapa) >= 0; });
    return {
      entrou: entrou.length, propostas: prop.length, fechados: fech.length, perdidos: perd.length,
      taxa: (fech.length + perd.length) ? fech.length / (fech.length + perd.length) : null,
      valorFechado: valorF, ticket: fech.length ? valorF / fech.length : 0,
      ciclo: ciclo.length ? Math.round(ciclo.reduce(function (a, b) { return a + b; }, 0) / ciclo.length) : null,
      abertas: abertas.length, valorAberto: abertas.reduce(function (s, l) { return s + num(l.valor); }, 0),
      atrasados: abertas.filter(function (l) { return l.prox && l.prox.data && !l.prox.feito && dias(l.prox.data) < 0; }).length,
      listaEntrou: entrou, listaFechados: fech, listaPerdidos: perd
    };
  }

  /* contatos de EXEMPLO (só na tela, nunca gravados) — adoção: a pessoa vê como fica antes de lançar */
  function exemplo() {
    var h = hoje(), L = [];
    function d(n) { return somaDias(h, n); }
    var nomes = [["Ana Souza", "Construtora Alfa", "Corporativo", "Indicação"], ["Bruno Lima", "", "Casamento", "Instagram"], ["Carla Mendes", "Escola Nova", "Formatura", "Site"],
      ["Diego Rocha", "Rocha Eventos", "Transmissão ao vivo", "Cliente antigo"], ["Elisa Prado", "", "Aniversário", "Instagram"], ["Fábio Neves", "Banco Sul", "Corporativo", "LinkedIn"],
      ["Gabi Torres", "", "Casamento", "TikTok"], ["Hugo Dias", "Clube Azul", "Show", "Google"], ["Íris Campos", "Ag. Ponto", "Corporativo", "Indicação"], ["João Paiva", "", "Aniversário", "WhatsApp"],
      ["Karen Lopes", "Faculdade Sol", "Formatura", "Instagram"], ["Léo Martins", "", "Casamento", "Indicação"], ["Marta Reis", "Igreja Vida", "Transmissão ao vivo", "Site"], ["Nina Alves", "", "Aniversário", "Instagram"]];
    var etapas = ["fechado", "proposta", "negociacao", "fechado", "perdido", "conversa", "novo", "fechado", "proposta", "perdido", "fechado", "negociacao", "fechado", "novo"];
    nomes.forEach(function (n, i) {
      var criado = d(-10 - i * 11), et = etapas[i];
      var l = { id: "ex_" + i, nome: n[0], empresa: n[1], servico: n[2], origem: n[3], etapa: et, criadoEm: criado, valor: [8500, 6200, 4800, 12000, 2500, 15000, 7000, 9800, 11000, 1800, 5200, 7500, 3900, 2200][i],
        dataEvento: d(20 + i * 9 - (et === "fechado" ? 90 : 0)), tel: "", hist: [{ em: criado + "T10:00", tipo: "whatsapp", txt: "Primeiro contato" }], etapas: { novo: criado } };
      if (["proposta", "negociacao", "fechado", "perdido"].indexOf(et) >= 0) l.etapas.proposta = somaDias(criado, 3);
      if (et === "fechado") l.fechadoEm = somaDias(criado, 6 + i);
      if (et === "perdido") { l.perdidoEm = somaDias(criado, 9); l.motivoPerda = i === 4 ? "Preço" : "Sem resposta"; }
      if (et === "proposta" || et === "negociacao") l.prox = { data: d(i % 3 - 1), oque: "Retornar sobre a proposta" };
      L.push(l);
    });
    return L;
  }

  /* ---------- PEDIR ORÇAMENTO (16/11): link público pedido.html?p=TOKEN → public.bw_pedidos → funil ---------- */
  var ORIGEM_COMO = { "Instagram": "Instagram", "TikTok": "TikTok", "Indicação": "Indicação", "Google": "Google", "Site": "Site", "Evento / feira": "Evento / feira", "Outro": "Outro" };
  function linkPedido() { var c = cfg("cfg_link_pedido", null); return c && c.token ? c : null; }
  function montarLink(c) {
    var base = location.origin + location.pathname.replace(/[^/]*$/, "") + "pedido.html";
    var u = base + "?p=" + encodeURIComponent(c.token);
    if (c.nome) u += "&n=" + encodeURIComponent(c.nome);
    if (c.whats && soDig(c.whats).length >= 10) u += "&w=" + telWa(c.whats);
    var s = servicos().filter(function (x) { return x !== "Outro"; }).slice(0, 12); if (s.length) u += "&s=" + encodeURIComponent(s.concat(["Outro"]).join("|"));
    return u;
  }
  async function criarLinkPedido(nome, whats) {
    var atual = linkPedido(), token = (atual && atual.token) || ("pd" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4));
    if (!window.BWSync || !(await BWSync.registrarAgora({ tokens: [token] }))) return { erro: "sem_login" };   /* regra 26: só mostra o link depois do servidor */
    var c = { token: token, nome: String(nome || "").trim().slice(0, 80), whats: String(whats || "").trim(), criado: (atual && atual.criado) || hoje() };
    salvarCfg("cfg_link_pedido", c);
    return { link: montarLink(c), c: c };
  }
  async function puxarPedidos() {
    var cl = window.BWSync && BWSync.cliente(); if (!cl || !(await sessao())) return { novos: 0 };
    var r; try { r = await cl.from("bw_pedidos").select("*").eq("importado", false).order("criado_em", { ascending: true }).limit(100); } catch (e) { return { novos: 0, erro: "rede" }; }
    if (r.error || !r.data || !r.data.length) return { novos: 0, erro: r.error && r.error.message };
    var lista = leads(), ids = {}, feitos = [];
    lista.forEach(function (l) { ids[l.id] = 1; });
    r.data.forEach(function (o) {
      var id = "pd_" + o.id; feitos.push(o.id); if (ids[id]) return;
      var dia = diaLocal(o.criado_em) || hoje(), sv = o.servico || "", ss = servicos();
      sv = ss.filter(function (s) { return sv && s.toLowerCase() === sv.toLowerCase(); })[0] || sv;
      lista.push({ id: id, origemId: o.id, nome: o.nome || "", empresa: o.empresa || "", tel: maskTel(o.whatsapp || ""), email: o.email || "", servico: sv,
        dataEvento: o.data_evento || "", local: o.local || "", convidados: o.convidados || "", origem: ORIGEM_COMO[o.como_conheceu] || "Site", campanha: "Link de orçamento",
        etapa: "novo", criadoEm: dia, etapas: { novo: dia }, obs: o.mensagem || "", hist: [{ em: o.criado_em || new Date().toISOString(), tipo: "sistema", txt: "Pedido pelo link PEDIR ORÇAMENTO" + (o.como_conheceu ? " (conheceu por: " + o.como_conheceu + ")" : "") }] });
      ids[id] = 1;
    });
    gravar("mkt_leads", lista);
    try { await cl.from("bw_pedidos").update({ importado: true }).in("id", feitos); } catch (e) { }
    return { novos: feitos.length };
  }

  window.BWCRM = {
    linkPedido: linkPedido, montarLink: montarLink, criarLinkPedido: criarLinkPedido, puxarPedidos: puxarPedidos,
    ler: ler, gravar: gravar, leads: leads, salvarLead: salvarLead, apagarLead: apagarLead, cfg: cfg, salvarCfg: salvarCfg,
    ETAPAS: ETAPAS, ABERTAS: ABERTAS, ORIGENS: ORIGENS, MOTIVOS: MOTIVOS, servicos: servicos, etapa: etapa,
    esc: esc, hoje: hoje, diaLocal: diaLocal, somaDias: somaDias, dias: dias, dataBR: dataBR, num: num, moeda: moeda, soDig: soDig, telWa: telWa, maskTel: maskTel,
    primeiroNome: primeiroNome, titulo: titulo, novoId: novoId, ultimoToque: ultimoToque, temperatura: temperatura,
    MODELOS_PADRAO: MODELOS_PADRAO, modelos: modelos, salvarModelos: salvarModelos, assinatura: assinatura, preencher: preencher, linkWhats: linkWhats,
    filaDoAgente: filaDoAgente, concluirAcao: concluirAcao, adiarAcao: adiarAcao,
    ia: ia, jsonDe: jsonDe, erroIA: erroIA, sessao: sessao, lerTextoRegras: lerTextoRegras, lerTextoIA: lerTextoIA, duplicado: duplicado,
    proximaAcaoIA: proximaAcaoIA, personalizarFila: personalizarFila, mensagensDoDia: mensagensDoDia, resumoParaIA: resumoParaIA,
    numeros: numeros, exemplo: exemplo
  };
})();
