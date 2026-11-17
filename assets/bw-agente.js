/* AGENTE BRIGHTWAY (16/11/2026, Claude) — fale ou escreva e ele lança: gasto da casa, gasto/entrada do negócio, conta a pagar,
   tarefa/lembrete, custo de evento; responde perguntas simples ("quanto gastei este mês com lanche?") e abre páginas.
   Botão do robô em todas as páginas (o layout.js carrega este arquivo); tocar = já começa a escutar.
   GRÁTIS E SEGURO:
   - Voz → texto: reconhecimento de voz do próprio navegador (Web Speech API). Quando o navegador oferece, usa o modo NO APARELHO
     (processLocally); senão o navegador usa o serviço dele (Google no Chrome, Apple no Safari). Sem suporte (ex.: Firefox): grava e
     transcreve pela IA Brightway (Edge Function bw-ia → Whisper), só logado.
   - Entender: IA Brightway (bw-ia, Groq) recebe SÓ a frase dita + data de hoje + nomes dos próximos eventos (para achar o evento certo).
     Sem login/sem internet: entendedor próprio, no aparelho (regras).
   - Perguntas ("quanto gastei…") são calculadas AQUI, com os dados do aparelho — nenhum valor vai para a IA.
   - Nada é gravado sem a pessoa confirmar (✓ LANÇAR), a não ser que ela ligue "lançar sem perguntar" nos ajustes.
   - Grava nos MESMOS lugares das páginas (casa_orcamento, casa_contas, neg_fluxo, agenda_tarefas, neg_eventos) com
     BWSync.antesDeSalvar → sobe para a conta sozinho.
   BWLanca (as gravações) também é usado pelo LEITOR de contas (assets/bw-leitor.js). */
(function () {
  "use strict";
  if (window.BWLanca) return;
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";

  /* ================= util ================= */
  function dois(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + dois(d.getMonth() + 1) + "-" + dois(d.getDate()); }   /* data LOCAL (pente fino 29) */
  function hoje() { return ymd(new Date()); }
  function deYmd(s) { var p = String(s || "").split("-"); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
  function br(s) { var p = String(s || "").split("-"); return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : s; }
  function moeda(v) { return "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sa(s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
  function num(x) {
    if (typeof x === "number") return x;
    var s = String(x || "").replace(/[^\d,.-]/g, ""); if (!s) return 0;
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
    var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function cap(s) { s = String(s || "").trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravar(k, v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(k, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + k + "_v1", JSON.stringify(v)); } catch (e) { return false; }
    try { window.dispatchEvent(new CustomEvent("bw-dados", { detail: { chave: k } })); } catch (e) { }
    return true;
  }
  function novoId(p) { return p + Date.now() + Math.random().toString(36).slice(2, 6); }
  function ui(k, padrao) { try { var v = localStorage.getItem("ui_agente_" + k); return v == null ? padrao : JSON.parse(v); } catch (e) { return padrao; } }
  function uiSet(k, v) { try { localStorage.setItem("ui_agente_" + k, JSON.stringify(v)); } catch (e) { } }

  /* ================= categorias ================= */
  var CAT_CASA = ["Alimentação", "Combustível", "Lazer", "Saúde", "Educação", "Moradia", "Transporte", "Vestuário", "Contas (luz/água/net)", "Assinaturas", "Outros"];
  var PISTAS = [
    ["Alimentação", "lanche|almoco|almocei|jantar|jantei|cafe|mercado|supermercado|padaria|comida|ifood|restaurante|pizza|acougue|hortifruti|feira|sorvete|marmita|delivery"],
    ["Combustível", "gasolina|combustivel|etanol|alcool|diesel|posto|abasteci|abastecer"],
    ["Transporte", "uber|taxi|onibus|metro|estacionamento|pedagio|passagem|99pop|corrida"],
    ["Saúde", "farmacia|remedio|medico|consulta|dentista|exame|hospital|academia|plano de saude"],
    ["Educação", "escola|curso|livro|faculdade|material escolar|mensalidade"],
    ["Moradia", "aluguel|condominio|iptu|reforma|material de construcao|moveis|movel"],
    ["Vestuário", "roupa|sapato|tenis|camisa|calca|vestido|blusa"],
    ["Contas (luz/água/net)", "luz|energia|agua|internet|telefone|celular|gas|cemig|copasa|claro|vivo|tim|oi"],
    ["Assinaturas", "netflix|spotify|assinatura|youtube|prime|icloud|disney|globoplay|max"],
    ["Lazer", "cinema|bar|show|passeio|viagem|festa|cerveja|ingresso|parque"]];
  function categoria(txt) { var t = " " + sa(txt) + " "; for (var i = 0; i < PISTAS.length; i++) if (new RegExp("(^|[^a-z])(" + PISTAS[i][1] + ")([^a-z]|$)").test(t)) return PISTAS[i][0]; return "Outros"; }
  var CONTA_NOMES = [["Energia", "luz|energia|cemig|enel|light|copel|celesc|coelba|cpfl|equatorial|neoenergia|energisa"], ["Água", "agua|copasa|sabesp|saneamento|cedae|sanepar|embasa|compesa"],
    ["Internet", "internet|net|banda larga|fibra|claro|vivo fibra|oi fibra|brisanet"], ["Telefone", "telefone|celular|tim|vivo|claro|oi"], ["Gás", "gas|comgas|gasmig|ultragaz|liquigas"],
    ["Aluguel", "aluguel"], ["Condomínio", "condominio"], ["Cartão de crédito", "cartao|fatura do cartao|nubank|itaucard"], ["IPTU", "iptu"], ["Escola", "escola|mensalidade"],
    ["Plano de saúde", "plano de saude|unimed|amil|hapvida|bradesco saude"], ["Financiamento", "financiamento|prestacao|parcela do carro|consorcio"]];
  function nomeConta(txt) { var t = " " + sa(txt) + " "; for (var i = 0; i < CONTA_NOMES.length; i++) if (new RegExp("(^|[^a-z])(" + CONTA_NOMES[i][1] + ")([^a-z]|$)").test(t)) return CONTA_NOMES[i][0]; return ""; }

  /* ================= gravações (o mesmo formato das páginas) ================= */
  var Lanca = {
    gastoCasa: function (o) {   /* orçamento familiar: c0 desc · c1 categoria · c2 tipo · c3 valor · c4 mês */
      var d = o.data || hoje(), l = ler("casa_orcamento"), it = { id: novoId("ag_"), c0: cap(o.descricao || o.categoria || "Gasto"), c1: o.categoria || categoria(o.descricao), c2: o.receita ? "Receita" : "Despesa", c3: String(num(o.valor)), c4: d.slice(0, 7), data: d, origem: o.origem || "agente" };
      l.push(it); gravar("casa_orcamento", l); return { id: it.id, onde: o.receita ? "Receitas da casa" : "Gastos da casa", link: "orcamento.html" };
    },
    contaPagar: function (o) {  /* contas a pagar: c0 nome · c1 valor · c2 vencimento · c3 pago */
      var l = ler("casa_contas"), it = { id: novoId("ag_"), c0: cap(o.descricao || nomeConta(o.descricao) || "Conta"), c1: String(num(o.valor)), c2: o.vencimento || hoje(), c3: o.pago ? "Sim" : "Não", origem: o.origem || "agente" };
      if (o.codigo) it.cod = String(o.codigo).replace(/\D/g, "");
      if (o.referencia) it.ref = o.referencia;
      l.push(it); gravar("casa_contas", l); return { id: it.id, onde: "Contas a pagar", link: "contas.html" };
    },
    fluxo: function (o) {       /* fluxo de caixa do negócio: c0 data · c1 Entrada/Saída · c2 valor · c3 descrição */
      var tipo = o.entrada ? "Entrada" : "Saída", l = ler("neg_fluxo"), it = { id: novoId("ag_"), c0: o.data || hoje(), c1: tipo, c2: String(num(o.valor)), c3: cap(o.descricao || tipo), origem: o.origem || "agente" };
      l.push(it); gravar("neg_fluxo", l); return { id: it.id, onde: "Fluxo de caixa (" + tipo.toLowerCase() + ")", link: "fluxo.html" };
    },
    tarefa: function (o) {
      var l = ler("agenda_tarefas"), it = { id: novoId("tf_"), titulo: cap(o.titulo || "Tarefa"), data: o.data || hoje(), hora: o.hora || "", cat: o.categoria || "tarefa", rep: "", nota: o.nota || "", feitos: [] };
      l.push(it); gravar("agenda_tarefas", l); return { id: it.id, onde: "Agenda", link: "index.html" };
    },
    custoEvento: function (o) {
      var l = ler("neg_eventos"), ev = l.filter(function (e) { return String(e.id) === String(o.eventoId); })[0];
      if (!ev) throw new Error("evento não encontrado");
      ev.gastos = ev.gastos || [];
      var g = { id: novoId("ct_"), desc: cap(o.descricao || "Custo"), valor: num(o.valor), data: o.data || hoje(), origem: o.origem || "agente" };
      if (o.caminho) g.caminho = o.caminho;
      ev.gastos.push(g); gravar("neg_eventos", l);
      try { var S = window.MOD && MOD["modules/sincronia"]; if (S && S.sincronizarTudo) S.sincronizarTudo(); } catch (e) { }
      return { id: g.id, onde: "Custos do evento " + (ev.nome || ""), link: "eventos.html?ev=" + encodeURIComponent(ev.id) };
    },
    eventos: function () {
      var h = hoje();
      return ler("neg_eventos").filter(function (e) { return e && e.nome; }).map(function (e) { return { id: e.id, nome: e.nome, data: e.data || "" }; })
        .sort(function (a, b) { var fa = (a.data || "") < h, fb = (b.data || "") < h; if (fa !== fb) return fa ? 1 : -1; return fa ? String(b.data).localeCompare(a.data) : String(a.data).localeCompare(b.data); });
    },
    acharEvento: function (nome) {
      var n = sa(nome).trim(); if (!n) return null;
      var evs = Lanca.eventos(), melhor = null, pts = 0;
      evs.forEach(function (e) { var en = sa(e.nome); var p = en === n ? 100 : en.indexOf(n) >= 0 || n.indexOf(en) >= 0 ? 60 : n.split(/\s+/).filter(function (w) { return w.length > 2 && en.indexOf(w) >= 0; }).length * 15; if (p > pts) { pts = p; melhor = e; } });
      return pts >= 15 ? melhor : null;
    },
    contaComCodigo: function (cod) { cod = String(cod || "").replace(/\D/g, ""); if (cod.length < 40) return null; return ler("casa_contas").filter(function (c) { return c.cod && c.cod === cod; })[0] || null; },
    categoria: categoria, nomeConta: nomeConta, CAT_CASA: CAT_CASA, num: num, hoje: hoje, ler: ler
  };
  window.BWLanca = Lanca;

  /* ================= consultas (calculadas no aparelho) ================= */
  function periodo(p) {
    var h = new Date(); h.setHours(0, 0, 0, 0);
    if (p === "hoje") return [ymd(h), ymd(h), "hoje"];
    if (p === "amanha") { var am = new Date(h); am.setDate(am.getDate() + 1); return [ymd(am), ymd(am), "amanhã"]; }
    if (p === "proxima_semana") { var ps = new Date(h); ps.setDate(ps.getDate() + 7 - ((ps.getDay() + 6) % 7)); var pf = new Date(ps); pf.setDate(pf.getDate() + 6); return [ymd(ps), ymd(pf), "na próxima semana"]; }
    if (p === "semana") { var a = new Date(h); a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); return [ymd(a), ymd(h), "nesta semana"]; }
    if (p === "mes_passado") { var a2 = new Date(h.getFullYear(), h.getMonth() - 1, 1), b2 = new Date(h.getFullYear(), h.getMonth(), 0); return [ymd(a2), ymd(b2), "no mês passado"]; }
    if (p === "ano") return [h.getFullYear() + "-01-01", ymd(h), "neste ano"];
    return [ymd(new Date(h.getFullYear(), h.getMonth(), 1)), ymd(new Date(h.getFullYear(), h.getMonth() + 1, 0)), "neste mês"];
  }
  function itensAgenda(ini, fim) {   /* o mesmo cálculo da AGENDA da tela inicial; fora dela, uma versão simples */
    if (typeof window.BWAgendaItens === "function") { try { return window.BWAgendaItens(ini, fim); } catch (e) { } }
    var out = [], dentro = function (d) { return d && d >= ini && d <= fim; };
    ler("agenda_tarefas").forEach(function (t) {
      if (!t || !t.data) return;
      if (!t.rep) { if (dentro(t.data)) out.push({ tipo: "tarefa", data: t.data, hora: t.hora, titulo: t.titulo, feito: (t.feitos || []).indexOf(t.data) >= 0 }); return; }
      for (var d = deYmd(t.data), n = 0; ymd(d) <= fim && n < 400; n++) {
        var k = ymd(d); if (k >= ini) out.push({ tipo: "tarefa", data: k, hora: t.hora, titulo: t.titulo, feito: (t.feitos || []).indexOf(k) >= 0 });
        if (t.rep === "semanal") d.setDate(d.getDate() + 7); else if (t.rep === "mensal") d.setMonth(d.getMonth() + 1); else d.setDate(d.getDate() + 1);
      }
    });
    ler("casa_contas").forEach(function (c) { if (c && sa(c.c3) !== "sim" && dentro(c.c2)) out.push({ tipo: "pagamento", data: c.c2, titulo: c.c0, valor: num(c.c1) }); });
    ler("neg_eventos").forEach(function (e) { if (!e || /cancel/i.test(e.status || "")) return; if (dentro(e.data)) out.push({ tipo: "evento", data: e.data, titulo: e.nome }); if (e.montagem && e.montagem !== e.data && dentro(e.montagem)) out.push({ tipo: "evento", data: e.montagem, titulo: "Montagem — " + e.nome }); });
    return out;
  }
  function consultar(q) {
    var per = periodo(q.periodo), ini = per[0], fim = per[1], f = sa(q.filtro || "").trim(), bate = function (txt) { return !f || sa(txt).indexOf(f) >= 0; };
    if (q._ini) { ini = fim = q._ini; per[2] = "em " + br(q._ini); }
    if (q.fonte === "agenda") {
      var its = itensAgenda(ini, fim).filter(function (i) { return !i.feito && bate(i.titulo); })
        .sort(function (a, b) { return (a.data + (a.hora || "99")).localeCompare(b.data + (b.hora || "99")); });
      if (!its.length) return "Nada na agenda " + per[2] + (f ? " com \"" + q.filtro + "\"" : "") + ". Agenda livre!";
      var um = ini === fim, txt = its.slice(0, 8).map(function (i) {
        return (um ? "" : br(i.data).slice(0, 5) + " ") + (i.hora ? i.hora.replace(":00", "h") + " " : "") + (i.titulo || "") + (i.tipo === "pagamento" ? " (pagar " + moeda(i.valor) + ")" : "");
      }).join("; ");
      return "Você tem " + its.length + " compromisso" + (its.length > 1 ? "s" : "") + " " + per[2] + ": " + txt + (its.length > 8 ? "; e mais " + (its.length - 8) + "." : ".");
    }
    if (q.fonte === "contas") {
      var abertas = ler("casa_contas").filter(function (c) { return sa(c.c3) !== "sim" && bate(c.c0); }).sort(function (a, b) { return String(a.c2).localeCompare(String(b.c2)); });
      var tot = abertas.reduce(function (s, c) { return s + num(c.c1); }, 0);
      if (!abertas.length) return "Nenhuma conta em aberto" + (f ? " com \"" + q.filtro + "\"" : "") + ". 🎉";
      var p = abertas[0];
      return "Você tem " + abertas.length + " conta" + (abertas.length > 1 ? "s" : "") + " em aberto, somando " + moeda(tot) + ". A próxima é " + p.c0 + ", " + moeda(num(p.c1)) + ", vence " + br(p.c2) + ".";
    }
    if (q.fonte === "negocio") {
      var ent = 0, sai = 0;
      ler("neg_fluxo").forEach(function (x) { var d = String(x.c0 || ""); if (d < ini || d > fim || !bate((x.c3 || "") + " " + (x.c1 || ""))) return; if (sa(x.c1).indexOf("entrada") === 0) ent += num(x.c2); else sai += num(x.c2); });
      return "Negócio " + per[2] + (f ? " (\"" + q.filtro + "\")" : "") + ": entradas " + moeda(ent) + ", saídas " + moeda(sai) + ", resultado " + moeda(ent - sai) + ".";
    }
    var gasto = 0, rec = 0, n = 0;
    ler("casa_orcamento").forEach(function (x) {
      var d = x.data || ((x.c4 || "") + "-01"); if (!x.data) { if ((x.c4 || "") < ini.slice(0, 7) || (x.c4 || "") > fim.slice(0, 7)) return; } else if (d < ini || d > fim) return;
      if (!bate((x.c0 || "") + " " + (x.c1 || ""))) return;
      if (sa(x.c2).indexOf("receita") === 0) rec += num(x.c3); else { gasto += num(x.c3); n++; }
    });
    return "Casa " + per[2] + (f ? " com \"" + q.filtro + "\"" : "") + ": " + moeda(gasto) + " em " + n + " gasto" + (n === 1 ? "" : "s") + (rec ? " · receitas " + moeda(rec) : "") + ".";
  }

  /* ================= páginas ================= */
  var PAGINAS = { inicio: ["index.html", "Início"], agenda: ["index.html", "Agenda"], contas: ["contas.html", "Contas a pagar"], orcamento: ["orcamento.html", "Orçamento da casa"],
    reserva: ["reserva.html", "Reserva"], fluxo: ["fluxo.html", "Fluxo de caixa"], custos: ["custos.html", "Cachês e custos"], eventos: ["eventos.html", "Eventos"],
    orcamentos: ["propostas.html", "Gerador de orçamento"], painel: ["financeiro-painel.html", "Painel financeiro"], equipe: ["equipe.html", "Gestão de pessoas"],
    crm: ["crm.html", "CRM"], funil: ["captacao.html", "Funil"], fotos: ["fotos.html", "Editor de fotos"], criador: ["criador.html", "Criador IA"],
    leitor: ["leitor.html", "Leitor de contas"], investimentos: ["investimentos-painel.html", "Investimentos"], pdf: ["pdf.html", "PDF"],
    transcricao: ["transcricao.html", "Transcrição"], assistente: ["assistente.html", "Assistente de texto"], ferramentas: ["ferramentas.html", "Ferramentas"] };

  /* ================= entender: números por extenso ================= */
  var UN = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900 };
  function extenso(t) {   /* "trinta e cinco reais" → "35 reais"; "mil e duzentos" → "1200" */
    return t.replace(/((?:(?:zero|uma?|duas|dois|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzent[oa]s|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil)(?:\s+e\s+|\s+)?)+)/g, function (m) {
      var ws = m.trim().split(/\s+/).filter(function (w) { return w !== "e"; }), tot = 0, cur = 0, ok = false;
      ws.forEach(function (w) { if (w === "mil") { tot += (cur || 1) * 1000; cur = 0; ok = true; } else if (UN[w] != null) { cur += UN[w]; ok = true; } });
      return ok ? " " + (tot + cur) + " " : m;
    });
  }

  /* ================= entender: no aparelho (sem IA) ================= */
  var DIAS = [["domingo"], ["segunda"], ["terca"], ["quarta"], ["quinta"], ["sexta"], ["sabado"]];
  function dataDe(t) {
    var b = new Date(), m; b.setHours(0, 0, 0, 0);
    var mais = function (n) { var d = new Date(b); d.setDate(d.getDate() + n); return d; };
    if (/depois de amanha/.test(t)) return ymd(mais(2));
    if (/amanha/.test(t)) return ymd(mais(1));
    if (/anteontem/.test(t)) return ymd(mais(-2));
    if (/ontem/.test(t)) return ymd(mais(-1));
    if ((m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) { var a = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : b.getFullYear(); return ymd(new Date(a, +m[2] - 1, +m[1])); }
    if ((m = t.match(/dia (\d{1,2})/))) { var dd = +m[1], d1 = new Date(b.getFullYear(), b.getMonth(), dd); if (d1 < b && /vence|vencimento|pagar|conta|boleto|lembr|tarefa|reuniao/.test(t)) d1 = new Date(b.getFullYear(), b.getMonth() + 1, dd); return ymd(d1); }
    for (var i = 0; i < 7; i++) if (new RegExp("(^|\\s)" + DIAS[i][0] + "(-feira)?(\\s|$)").test(t)) { var n = (i - b.getDay() + 7) % 7; if (n === 0) n = 7; return ymd(mais(n)); }
    return "";
  }
  function acentos(resto, original) {   /* devolve as palavras como foram ditas (com acento): "reuniao golden" → "reunião Golden" */
    var ws = String(original || "").split(/[\s,;!?]+/).filter(Boolean);
    return resto.split(" ").filter(Boolean).map(function (r) { var w = ws.filter(function (x) { return sa(x.replace(/[^\wÀ-ÿ]/g, "")) === r; })[0]; return w ? w.replace(/[^\wÀ-ÿ'-]/g, "") : r; }).join(" ");
  }
  function entenderLocal(texto) {
    var t = " " + extenso(sa(texto)).replace(/[!?;]/g, " ").replace(/\s+/g, " ") + " ", m, valor = 0;
    t = t.replace(/^ (ok |ei |oi |ola )?(agente|robo|assistente|brightway)[ ,]*/, " ");
    if ((m = t.match(/r\$ ?([\d.]+(?:,\d{1,2})?)/)) || (m = t.match(/([\d.]+(?:,\d{1,2})?) ?(?:reais|real|conto|contos|pila|r\$)/)) || (m = t.match(/(?:de|valor|por|custou|paguei|gastei|recebi) ([\d.]+(?:,\d{1,2})?)(?=\s)/))) valor = num(m[1]);
    var semHora = t.replace(/(?:as|a) \d{1,2}(?:h\d{0,2}| horas|:\d{2})?(?=\s)/g, " ").replace(/ \d{1,2}h\d{0,2}(?=\s)/g, " ").replace(/dia \d{1,2}/g, " ").replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, " ");
    var dinheiroDito = /r\$|reais|real|conto|pila|centavos/.test(t);
    if (!valor && (m = semHora.match(/ (\d+(?:[.,]\d{1,2})?) (?:e (\d{1,2}) centavos)?/)) && (dinheiroDito || !/lembr|tarefa|agend|reuniao|compromisso/.test(t))) valor = num(m[1]) + (m[2] ? +m[2] / 100 : 0);
    var data = dataDe(t), hora = /de manha|pela manha/.test(t) ? "09:00" : /a tarde|de tarde/.test(t) ? "14:00" : /a noite|de noite/.test(t) ? "19:00" : "";
    if ((m = t.match(/(?:as|a) (\d{1,2})(?:h| horas|:)?(\d{2})?(?=\s)/)) || (m = t.match(/ (\d{1,2})h(\d{2})?(?=\s)/))) { var hh = +m[1], mm = +(m[2] || 0); if (hh < 24 && mm < 60) hora = dois(hh) + ":" + dois(mm); }
    /* perguntas sobre a agenda (o mesmo que a tela inicial mostra) */
    if (/(o que|oque|que) (eu )?(tenho|tem|vou fazer)|meus compromissos|minha agenda|como (esta|ta) (a )?(minha )?agenda|tenho (algum|algo|compromisso|reuniao|evento)|qual (e |o )?(meu )?proximo (compromisso|evento)|quais (sao )?(os )?(meus )?(compromissos|eventos|tarefas)/.test(t) && !/gast|pague|recebi|entrou|saiu|devo/.test(t)) {
      var pa = /depois de amanha/.test(t) ? null : /amanha/.test(t) ? "amanha" : /proxima semana|semana que vem/.test(t) ? "proxima_semana" : /semana/.test(t) ? "semana" : /mes/.test(t) ? "mes" : /proximo/.test(t) ? "mes" : "hoje";
      if (!pa) { var dd2 = dataDe(t); return [{ tipo: "consulta", fonte: "agenda", periodo: "hoje", filtro: "", _ini: dd2 }]; }
      return [{ tipo: "consulta", fonte: "agenda", periodo: pa, filtro: "" }];
    }
    /* perguntas */
    if (/quanto (eu )?(gastei|gasto|paguei|recebi|entrou|saiu|devo|tenho)|qual (o )?(total|saldo)|resumo|quais (as )?contas|o que (tenho|vence)/.test(t)) {
      var fonte = /conta|vence|devo|boleto/.test(t) ? "contas" : /negocio|empresa|caixa|bw|evento|recebi|entrou/.test(t) ? "negocio" : "casa";
      var per = /hoje/.test(t) ? "hoje" : /semana/.test(t) ? "semana" : /mes passado/.test(t) ? "mes_passado" : /ano/.test(t) ? "ano" : "mes";
      var fm = t.match(/(?:com|de|em) ([a-z]+)(?:\s|$)/), filtro = fm && !/(hoje|mes|semana|ano|contas?|negocio|casa|gasto|gastos|reais)/.test(fm[1]) ? fm[1] : "";
      return [{ tipo: "consulta", fonte: fonte, periodo: per, filtro: filtro }];
    }
    /* abrir página */
    if ((m = t.match(/(?:abr(?:e|ir|a)|mostr(?:a|ar|e)|ir para|vai para|entra(?:r)? (?:no|na|em)) (?:o |a |os |as |no |na |minha |meu )?(.+?) ?$/)) && !valor) {
      var alvo = sa(m[1]), chave = null;
      [["contas", "conta"], ["orcamento", "orcamento da casa|gastos da casa"], ["fluxo", "fluxo|caixa"], ["eventos", "evento"], ["orcamentos", "gerador|proposta|orcamentos"], ["painel", "painel|financeiro"],
        ["equipe", "equipe|pessoas"], ["funil", "funil"], ["crm", "crm|cliente"], ["fotos", "foto"], ["criador", "criador|convite|post"], ["leitor", "leitor|comprovante"], ["investimentos", "investimento"],
        ["agenda", "agenda"], ["inicio", "inicio|home"], ["reserva", "reserva"], ["custos", "custo|cache"], ["pdf", "pdf"], ["transcricao", "transcri"], ["ferramentas", "ferramenta"]]
        .some(function (p) { if (new RegExp(p[1]).test(alvo)) { chave = p[0]; return true; } return false; });
      if (chave) return [{ tipo: "abrir", pagina: chave }];
    }
    /* o que é */
    var tipo = "";
    var TAREFA = /lembr|tarefa|agend|reuniao|compromisso|tenho que|preciso|precisa|ir (ao|a|na|no|pra|para)|levar|buscar|pegar|ligar|visitar|consulta|marcar|me avis|nao esquecer|entregar|enviar|mandar|fazer|encontro|almoco com|jantar com|call|treino|academia|medico|dentista/;
    if (TAREFA.test(t) && !dinheiroDito && !valor) tipo = "tarefa";
    else if (/lembr|tarefa|agend|reuniao|compromisso/.test(t) && !dinheiroDito) tipo = "tarefa";
    else if (/recebi|receber|entrada|entrou|pagaram|me pagou|faturei/.test(t) && valor) tipo = /casa|salario|familia/.test(t) ? "receita_casa" : "entrada_negocio";
    else if (/conta de|boleto|fatura|vence|vencimento|conta a pagar|pra pagar|para pagar/.test(t) && valor) tipo = "conta_pagar";
    else if (/lembr|tarefa|agend|reuniao|compromisso|marca(r)? |anota/.test(t) && !valor) tipo = "tarefa";
    else if (valor) tipo = /evento|montagem|cache/.test(t) ? "custo_evento" : /negocio|empresa|bw |equipamento|cliente|trabalho/.test(t) ? "gasto_negocio" : "gasto_casa";
    else if (/lembr|tarefa|agend|reuniao/.test(t)) tipo = "tarefa";
    else if (!valor && (hora || dataDe(t)) && t.trim().split(" ").length >= 2) tipo = "tarefa";   /* "dentista sexta às 15h" */
    else if (/gastei|gasto|paguei|comprei|despesa/.test(t)) tipo = /negocio|empresa|evento/.test(t) ? "gasto_negocio" : "gasto_casa";   /* sem valor: mostra o cartão para completar */
    if (!tipo) return [{ tipo: "nada" }];
    /* descrição: o que sobra tirando as palavras de comando */
    var resto = t.replace(/r\$ ?[\d.,]+|[\d.,]+ ?(?:reais|real|contos?|pila)|\d+[.,]?\d* centavos/g, " ").replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, " ").replace(/(as|a) \d{1,2}(h|:\d{2}| horas)?(\d{2})?/g, " ").replace(/ \d+(h\d{0,2})? /g, " ")
      .replace(/\b(lanc(a|e|ar)|lance|lancar|registr(a|e|ar)|anot(a|e|ar)|coloc(a|e|ar)|cri(a|e|ar)|adicion(a|e|ar)|bot(a|e|ar)|me lembr(a|e|ar)( de)?|lembr(a|e|ete|ar)( de| que)?|tenho que|preciso( de)?|me avis(a|e|ar)( de| que)?|nao esquecer( de)?|de manha|a tarde|a noite|marc(a|e|ar)|agend(a|e|ar)|uma?|o|a|os|as|nos|nas|no|na|do|da|dos|das|de|em|para|pra|pro|por|com|como|que|eu|gastei|gasto|gastos|paguei|comprei|recebi|receber|entrada|valor|reais|conta a pagar|conta de|conta|boleto|fatura|vence|vencimento|dia|hoje|amanha|depois|ontem|anteontem|tarefa|lembrete|casa|negocio|empresa|evento|segunda|terca|quarta|quinta|sexta|sabado|domingo|feira|e)\b/g, " ")
      .replace(/ [\d.,]+(?= |$)/g, " ").replace(/\s+/g, " ").trim();
    var evAchado = tipo === "custo_evento" ? (Lanca.acharEvento(t) || null) : null;
    if (evAchado) { var tirar = sa(evAchado.nome).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 1; }); resto = resto.split(" ").filter(function (w) { return tirar.indexOf(w) < 0; }).join(" "); }
    resto = acentos(resto, texto);
    var o = { tipo: tipo, valor: valor };
    if (tipo === "tarefa") { o.titulo = cap(resto || "Tarefa"); o.data = data || hoje(); o.hora = hora; o.categoria = /reuniao|call/.test(t) ? "reuniao" : /medic|dentista|exame|academia/.test(t) ? "saude" : /cliente|orcamento|evento|edic|grava|transmiss/.test(t) ? "trabalho" : /mercado|faxina|lavar|limpar|casa/.test(t) ? "casa" : "tarefa"; }
    else if (tipo === "conta_pagar") { o.descricao = nomeConta(t) || cap(resto || "Conta"); o.vencimento = data || hoje(); }
    else if (tipo === "custo_evento") { o.evento = evAchado ? evAchado.nome : ""; o.descricao = cap(resto || "Custo"); o.data = data || hoje(); }
    else { o.descricao = cap(resto || (tipo.indexOf("entrada") >= 0 || tipo === "receita_casa" ? "Entrada" : "Gasto")); o.data = data || hoje(); if (tipo === "gasto_casa") o.categoria = categoria(t); }
    return [o];
  }

  /* ================= entender: IA Brightway ================= */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return (s && s.data && s.data.session) || null; } catch (e) { return null; } }
  function jsonDe(t) { t = String(t || "").replace(/```(json)?/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  var SISTEMA = 'Você é o AGENTE da plataforma Brightway (casa + produtora de eventos). Transforme o pedido em ações.\n' +
    'Responda SÓ com JSON neste formato, CADA ação com o campo "tipo":\n' +
    '{"acoes":[{"tipo":"tarefa","titulo":"Ligar para o cliente","data":"2026-01-02","hora":"10:00","categoria":"trabalho"}],"resposta":""}\n' +
    'Tipos e campos:\n' +
    '- gasto_casa: descricao, valor, categoria (' + CAT_CASA.join(", ") + '), data\n' +
    '- receita_casa: descricao, valor, data\n- gasto_negocio: descricao, valor, data\n- entrada_negocio: descricao, valor, data\n' +
    '- conta_pagar: descricao (Energia, Água, Internet…), valor, vencimento\n' +
    '- tarefa: titulo, data, hora ("HH:MM" ou ""), categoria (tarefa, trabalho, pessoal, casa, saude, reuniao) — compromissos, lembretes, reuniões, "tenho que", "preciso", "marcar"\n' +
    '- custo_evento: evento (nome EXATO da lista), descricao, valor, data\n' +
    '- consulta: fonte (agenda|casa|negocio|contas), periodo (hoje|amanha|semana|proxima_semana|mes|mes_passado|ano), filtro ("" ou palavra) — perguntas sobre os DADOS da pessoa (compromissos, gastos, contas, quanto entrou)\n' +
    '- responder: texto — pergunta geral que não depende dos dados dela (resposta curta, 1 a 3 frases)\n' +
    '- abrir: pagina (' + Object.keys(PAGINAS).join(", ") + ')\n- nada: (peça em "resposta" o que falta)\n' +
    'Regras: valor número com ponto; datas AAAA-MM-DD a partir de HOJE ("de manhã" = 09:00, "à tarde" = 14:00, "à noite" = 19:00); gasto sem falar de empresa/cliente/evento/equipamento = gasto_casa; ' +
    '"recebi" de cliente/evento = entrada_negocio; vários pedidos = várias ações; nunca invente valor; títulos curtos com a primeira letra maiúscula. ' +
    'NUNCA diga em "resposta" que algo foi criado ou lançado — quem lança é o app; deixe "resposta" vazia quando houver ações.';
  async function entenderIA(texto) {
    var s = await sessao(); if (!s) return null;
    var d = new Date(), sem = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][d.getDay()];
    var evs = Lanca.eventos().slice(0, 12).map(function (e) { return e.nome + (e.data ? " (" + br(e.data) + ")" : ""); });
    var pedido = "HOJE: " + hoje() + " (" + sem + ")\nEVENTOS: " + (evs.join("; ") || "nenhum") + "\nPEDIDO: " + String(texto).slice(0, 600);
    try {
      var ctl = new AbortController(), tm = setTimeout(function () { ctl.abort(); }, 12000);
      var r = await fetch(FN, { method: "POST", signal: ctl.signal, headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: SISTEMA, pedido: pedido, max: 500 }) });
      clearTimeout(tm);
      var j = await r.json().catch(function () { return {}; }); if (!r.ok || !j.texto) return null;
      var o = jsonDe(j.texto); if (!o || !Array.isArray(o.acoes)) return null;
      return o;
    } catch (e) { return null; }
  }
  var TIPOS_OK = ["gasto_casa", "receita_casa", "gasto_negocio", "entrada_negocio", "conta_pagar", "tarefa", "custo_evento", "consulta", "responder", "abrir", "nada"];
  function achatar(a) {   /* 16/11: a IA às vezes devolve {"tarefa":{...}} ou {"acao":"tarefa"} — sem isso TODA ação virava "não entendi" */
    if (!a || typeof a !== "object") return null;
    if (a.tipo && TIPOS_OK.indexOf(a.tipo) >= 0) return a;
    var t = a.tipo || a.acao || a.type || a.action;
    if (t && TIPOS_OK.indexOf(t) >= 0) return Object.assign({}, a, { tipo: t });
    var ks = Object.keys(a).filter(function (k) { return TIPOS_OK.indexOf(k) >= 0; });
    if (ks.length === 1) return Object.assign({ tipo: ks[0] }, typeof a[ks[0]] === "object" && a[ks[0]] ? a[ks[0]] : {});
    return null;
  }
  function normalizar(a) {   /* confere o que a IA devolveu antes de mostrar */
    a = Object.assign({}, a || {}); a.valor = num(a.valor);
    if (a.tipo === "tarefa") { a.titulo = cap(a.titulo || a.descricao || "Tarefa"); if (!a.data) a.data = hoje(); }
    if (a.data && !/^\d{4}-\d{2}-\d{2}$/.test(a.data)) a.data = hoje();
    if (a.vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(a.vencimento)) a.vencimento = hoje();
    if (a.tipo === "gasto_casa" && CAT_CASA.indexOf(a.categoria) < 0) a.categoria = categoria((a.descricao || "") + " " + (a.categoria || ""));
    if (a.tipo === "custo_evento") { var ev = Lanca.acharEvento(a.evento); a.eventoId = ev ? ev.id : ""; a.evento = ev ? ev.nome : (a.evento || ""); }
    if (a.hora && !/^\d{2}:\d{2}$/.test(a.hora)) a.hora = "";
    return a;
  }
  async function entender(texto) {
    var usarIA = ui("ia", true), r = usarIA ? await entenderIA(texto) : null, via = "IA Brightway";
    if (r) { r.acoes = (r.acoes || []).map(achatar).filter(Boolean); if (!r.acoes.length || r.acoes.every(function (a) { return a.tipo === "nada"; })) { var loc = entenderLocal(texto); if (loc.some(function (a) { return a.tipo !== "nada"; })) r = { acoes: loc, resposta: "" }; } }
    if (!r) { r = { acoes: entenderLocal(texto), resposta: "" }; via = "no aparelho"; }
    r.acoes = (r.acoes || []).map(normalizar).filter(function (a) { return a && a.tipo; });
    if (r.acoes.some(function (a) { return a.tipo !== "nada" && a.tipo !== "responder"; })) r.resposta = "";   /* nunca "lembrete criado" antes de lançar */
    if (!r.acoes.length) r.acoes = [{ tipo: "nada" }];
    r.via = via; return r;
  }

  /* ================= executar ================= */
  var NOMES = { gasto_casa: "GASTO DA CASA", receita_casa: "RECEITA DA CASA", gasto_negocio: "GASTO DO NEGÓCIO", entrada_negocio: "ENTRADA DO NEGÓCIO", conta_pagar: "CONTA A PAGAR", tarefa: "TAREFA", custo_evento: "CUSTO DE EVENTO", consulta: "PERGUNTA", abrir: "ABRIR", nada: "NÃO ENTENDI" };
  function precisaValor(a) { return /gasto|receita|entrada|conta_pagar|custo_evento/.test(a.tipo); }
  function executar(a) {
    if (precisaValor(a) && !(num(a.valor) > 0)) throw new Error("falta o valor");
    switch (a.tipo) {
      case "gasto_casa": return Lanca.gastoCasa({ descricao: a.descricao, valor: a.valor, categoria: a.categoria, data: a.data });
      case "receita_casa": return Lanca.gastoCasa({ descricao: a.descricao, valor: a.valor, categoria: "Outros", data: a.data, receita: true });
      case "gasto_negocio": return Lanca.fluxo({ descricao: a.descricao, valor: a.valor, data: a.data });
      case "entrada_negocio": return Lanca.fluxo({ descricao: a.descricao, valor: a.valor, data: a.data, entrada: true });
      case "conta_pagar": return Lanca.contaPagar({ descricao: a.descricao, valor: a.valor, vencimento: a.vencimento || a.data });
      case "tarefa": return Lanca.tarefa({ titulo: a.titulo || a.descricao, data: a.data, hora: a.hora, categoria: a.categoria });
      case "custo_evento": if (!a.eventoId) throw new Error("escolha o evento"); return Lanca.custoEvento({ eventoId: a.eventoId, descricao: a.descricao, valor: a.valor, data: a.data });
    }
    return null;
  }

  /* ================= voz: falar e ouvir ================= */
  function falar(txt, depois) {
    var fim = false, seguir = function () { if (fim) return; fim = true; if (depois) setTimeout(depois, 250); };
    if (!ui("voz", true) || !window.speechSynthesis || !txt) { seguir(); return; }
    try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance(String(txt).replace(/R\$ ?/g, "").slice(0, 400)); u.lang = "pt-BR"; u.rate = 1.05;
      var vs = speechSynthesis.getVoices().filter(function (v) { return /pt[-_]BR/i.test(v.lang); }); if (vs.length) u.voice = vs[0];
      u.onend = seguir; u.onerror = seguir; speechSynthesis.speak(u); setTimeout(seguir, 2500 + String(txt).length * 90); } catch (e) { seguir(); }
  }
  async function confirmarPorVoz() {   /* 16/11: depois de "…Confirma?" escuta "sim / pode lançar" ou "não / cancela" — mãos livres */
    if (!SR || painel.hidden || ouvindo || !ESTADO.acoes.some(function (a) { return !a.feito && /gasto|receita|entrada|conta_pagar|tarefa|custo_evento/.test(a.tipo); })) return;
    ouvindo = true; fab.classList.add("ouvindo");
    status('<span class="bwg-onda"><i></i><i></i><i></i><i></i></span> Diga <b>"sim"</b> para lançar, <b>"não"</b> para cancelar — ou toque nos botões.');
    var r = ""; try { r = sa(await ouvirNavegador(function () { })); } catch (e) { }
    ouvindo = false; fab.classList.remove("ouvindo");
    if (/^(sim|s|isso|pode|confirm|lanc|ok|beleza|certo|manda|bora|claro|positivo)/.test(r.trim()) || / (pode lancar|confirmo|isso mesmo)/.test(" " + r)) lancarTodas();
    else if (/^(nao|cancel|esquece|deixa|para)/.test(r.trim())) { ESTADO.acoes = []; desenharAcoes(); status("Cancelado. Nada foi lançado."); falar("Cancelado."); }
    else status("Confira e toque em ✓ LANÇAR (ou toque no robô e fale de novo).");
  }
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null, ouvindo = false, gravador = null;
  async function ouvirNavegador(aoParcial) {
    var r = new SR(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    try { if (SR.available && "processLocally" in r) { var st = await SR.available({ langs: ["pt-BR"], processLocally: true }); if (st === "available") { r.processLocally = true; ESTADO.local = true; } } } catch (e) { }
    rec = r;
    return new Promise(function (ok, erro) {
      var final = "", ultimo = "";
      r.onresult = function (ev) { var p = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { if (ev.results[i].isFinal) final += ev.results[i][0].transcript; else p += ev.results[i][0].transcript; } ultimo = (final + " " + p).trim(); aoParcial(ultimo); };
      r.onerror = function (ev) { erro(new Error(ev.error || "erro")); };
      r.onend = function () { rec = null; ok((final || ultimo).trim()); };
      try { r.start(); } catch (e) { erro(e); }
    });
  }
  function wav(amostras) {
    var n = amostras.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0, o = 44; i < n; i++, o += 2) { var x = Math.max(-1, Math.min(1, amostras[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], { type: "audio/wav" });
  }
  async function ouvirGravando(aoParcial) {   /* sem reconhecimento no navegador: grava até 12 s (ou até tocar de novo) e manda para o Whisper */
    var s = await sessao(); if (!s) throw new Error("sem_voz");
    var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    var partes = [], mr = new MediaRecorder(stream); gravador = mr;
    mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    var fim = new Promise(function (ok) { mr.onstop = ok; });
    mr.start(); aoParcial("🎙 gravando… toque no robô para terminar");
    var limite = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 12000);
    await fim; clearTimeout(limite); stream.getTracks().forEach(function (t) { t.stop(); }); gravador = null;
    aoParcial("transcrevendo…");
    var blob = new Blob(partes, { type: partes[0] && partes[0].type || "audio/webm" }), Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
    var buf = await blob.arrayBuffer(), a = await new Promise(function (ok, erro) { var pr = ctx.decodeAudioData(buf, ok, erro); if (pr && pr.then) pr.then(ok, erro); }); try { ctx.close(); } catch (e) { }
    var off = new OfflineAudioContext(1, Math.ceil(a.duration * 16000), 16000), src = off.createBufferSource(); src.buffer = a; src.connect(off.destination); src.start(); var r16 = await off.startRendering();
    var r = await fetch(FN + "?lang=pt", { method: "POST", headers: { "Content-Type": "audio/wav", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: wav(r16.getChannelData(0)) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.erro || "transcricao");
    return String(j.texto || (j.segmentos || []).map(function (x) { return x.texto || x.text; }).join(" ") || "").trim();
  }
  function parar() { try { if (rec) rec.stop(); } catch (e) { } try { if (gravador && gravador.state === "recording") gravador.stop(); } catch (e) { } }

  /* ================= tela ================= */
  var ROBO = '<svg viewBox="0 0 48 48" aria-hidden="true"><path class="ant" d="M24 4v5"/><circle class="ant" cx="24" cy="3.6" r="2.2"/><rect x="12" y="9" width="24" height="18" rx="7"/><rect class="vis" x="15.5" y="13" width="17" height="8.5" rx="4.2"/><circle class="olho" cx="20" cy="17.2" r="1.9"/><circle class="olho" cx="28" cy="17.2" r="1.9"/><path d="M9 17h3M36 17h3"/><path d="M19 27v3h10v-3"/><path d="M13 44v-6a8 8 0 0 1 8-8h6a8 8 0 0 1 8 8v6"/><path class="peito" d="M21 37h6"/></svg>';
  var CSS = ".bwg-fab{position:fixed;right:16px;bottom:24px;z-index:70;width:60px;height:60px;border-radius:50%;border:0;padding:0;cursor:pointer;touch-action:manipulation;" +
    "background:radial-gradient(circle at 30% 25%,#FFE3A1,#E8C26A 45%,#B98A1E);box-shadow:0 10px 26px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.25) inset;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".bwg-fab:active{transform:scale(.94)}.bwg-fab svg{width:36px;height:36px;fill:none;stroke:#1a1306;stroke-width:2.3;stroke-linecap:round;stroke-linejoin:round}.bwg-fab svg .vis{fill:#1a1306}.bwg-fab svg .olho{fill:#7CF3FF;stroke:none}" +
    ".bwg-fab.ouvindo{animation:bwgPulso 1.2s ease-in-out infinite}.bwg-fab.ouvindo svg .olho{fill:#5FE0A0}@keyframes bwgPulso{0%,100%{box-shadow:0 0 0 0 rgba(232,194,106,.55),0 10px 26px rgba(0,0,0,.45)}50%{box-shadow:0 0 0 14px rgba(232,194,106,0),0 10px 26px rgba(0,0,0,.45)}}" +
    "html.ed-aberto .bwg-fab,html.bw-menu-aberto .bwg-fab{display:none}" +
    ".bwg-p{position:fixed;right:16px;bottom:96px;z-index:71;width:min(420px,calc(100vw - 24px));max-height:min(72vh,640px);overflow:auto;background:#0d1119;border:1px solid rgba(232,194,106,.35);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.6);color:#F5F1EA;font:14px/1.45 Inter,system-ui,sans-serif;padding:16px}" +
    ".bwg-p[hidden]{display:none}.bwg-cab{display:flex;align-items:center;gap:10px;margin-bottom:10px}.bwg-cab b{font:800 13px Inter,sans-serif;letter-spacing:.12em;color:#E8C26A}.bwg-cab .x{margin-left:auto;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;cursor:pointer}" +
    ".bwg-cab .aj{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:transparent;color:#fff;cursor:pointer}" +
    ".bwg-st{font-size:13px;color:#a8a397;min-height:20px;display:flex;align-items:center;gap:8px}.bwg-onda{display:inline-flex;gap:3px;align-items:center;height:16px}.bwg-onda i{width:3px;height:6px;border-radius:2px;background:#5FE0A0;animation:bwgOnda .9s ease-in-out infinite}" +
    ".bwg-onda i:nth-child(2){animation-delay:.15s}.bwg-onda i:nth-child(3){animation-delay:.3s}.bwg-onda i:nth-child(4){animation-delay:.45s}@keyframes bwgOnda{0%,100%{height:5px}50%{height:16px}}" +
    ".bwg-fala{margin:8px 0;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);min-height:20px;font-size:15px}.bwg-fala:empty{display:none}" +
    ".bwg-escr{display:flex;gap:6px;margin-top:8px}.bwg-escr input{flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.16);background:#0a0d14;color:#fff;font-size:16px}" +
    ".bwg-b{padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#fff;font:700 12px Inter,sans-serif;letter-spacing:.05em;cursor:pointer;touch-action:manipulation;min-height:38px}" +
    ".bwg-b.pri{background:linear-gradient(180deg,#E8C26A,#C9A227);color:#14110a;border:0}.bwg-b.ok{background:linear-gradient(180deg,#5FE0A0,#2fb874);color:#06140c;border:0}" +
    ".bwg-ac{margin-top:10px;border:1px solid rgba(232,194,106,.3);border-radius:14px;padding:12px;background:rgba(232,194,106,.05)}.bwg-ac h4{margin:0 0 6px;font:800 11px Inter,sans-serif;letter-spacing:.12em;color:#E8C26A}" +
    ".bwg-ac.feito{border-color:rgba(95,224,160,.5);background:rgba(95,224,160,.07)}.bwg-ac.feito h4{color:#5FE0A0}.bwg-ac .lin{display:grid;grid-template-columns:96px 1fr;gap:6px;align-items:center;margin:4px 0}.bwg-ac .lin span{font-size:12px;color:#a8a397}" +
    ".bwg-ac input,.bwg-ac select{width:100%;min-width:0;box-sizing:border-box;padding:7px 9px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0a0d14;color:#fff;font-size:16px}" +
    ".bwg-acs{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.bwg-resp{margin-top:10px;font-size:14px;color:#e9e6dd}.bwg-sub{font-size:11.5px;color:#8f8a7e;margin-top:10px}.bwg-sub a{color:#E8C26A}" +
    ".bwg-ex{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.bwg-ex button{padding:7px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:transparent;color:#cfcabd;font-size:12px;cursor:pointer}" +
    ".bwg-aj{margin-top:10px;padding:10px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}.bwg-aj label{display:flex;gap:8px;align-items:flex-start;margin:6px 0;font-size:13px;color:#cfcabd}.bwg-aj input{width:18px;height:18px;margin-top:1px}" +
    "@media (max-width:760px){.bwg-p{right:12px;left:12px;width:auto}}";
  var ESTADO = { acoes: [], via: "", local: false };
  var fab, painel;
  function montar() {
    if (fab || !document.body) return;
    if (/(^|\/)(login|cadastro|pedido|baixar|privacidade|termos|painel)\.html/.test(location.pathname)) return;   /* páginas públicas */
    var st = document.createElement("style"); st.id = "bwgCss"; st.textContent = CSS; document.head.appendChild(st);
    fab = document.createElement("button"); fab.type = "button"; fab.className = "bwg-fab"; fab.id = "bwAgente"; fab.innerHTML = ROBO;
    fab.setAttribute("aria-label", "Agente: fale o que quer lançar"); fab.title = "AGENTE — toque e fale (ex.: lance 30 reais de lanche)";
    painel = document.createElement("div"); painel.className = "bwg-p"; painel.hidden = true; painel.setAttribute("role", "dialog"); painel.setAttribute("aria-label", "Agente Brightway");
    document.body.appendChild(painel); document.body.appendChild(fab);
    fab.addEventListener("click", function () { if (ouvindo) { parar(); return; } abrir(true); });
    painel.addEventListener("click", clique);
    painel.addEventListener("change", mudanca);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !painel.hidden) fechar(); });
    posicionar(); window.addEventListener("resize", posicionar); setInterval(posicionar, 2500);
  }
  function posicionar() {   /* fica acima das barras fixas de baixo (abas do celular, barra de ações do orçamento) */
    if (!fab) return;
    var h = window.innerHeight, topo = h;
    document.querySelectorAll(".bw-abas, .pr-acoes, [data-bw-barra]").forEach(function (el) { var r = el.getBoundingClientRect(); if (r.height && r.bottom >= h - 140 && r.top < topo && getComputedStyle(el).visibility !== "hidden") topo = r.top; });
    var b = Math.max(16, h - topo + 12); fab.style.bottom = b + "px"; if (painel) painel.style.bottom = (b + 72) + "px";
  }
  function fechar() { parar(); painel.hidden = true; fab.classList.remove("ouvindo"); }
  function status(html) { var s = painel.querySelector(".bwg-st"); if (s) s.innerHTML = html; }
  var EXEMPLOS = ["Lance 30 reais de lanche", "Conta de luz de 250 que vence dia 20", "Recebi 2.500 da Arte Eventos", "Me lembra de ligar pro cliente amanhã às 10", "Quanto gastei este mês?", "Abrir fluxo de caixa"];
  function desenhar() {
    var semVoz = !SR && !(navigator.mediaDevices && window.MediaRecorder);
    painel.innerHTML = '<div class="bwg-cab">' + ROBO.replace("<svg ", '<svg width="26" height="26" style="fill:none;stroke:#E8C26A;stroke-width:2.3;stroke-linecap:round" ') + '<b>AGENTE</b><button type="button" class="aj" data-g="ajustes" aria-label="Ajustes do agente" title="Ajustes">⚙</button><button type="button" class="x" data-g="fechar" aria-label="Fechar">✕</button></div>' +
      '<div class="bwg-st" aria-live="polite"></div><div class="bwg-fala" aria-live="polite"></div><div id="bwgAc"></div>' +
      '<div class="bwg-escr"><input id="bwgTxt" type="text" autocomplete="off" placeholder="' + (semVoz ? "Escreva o que quer lançar…" : "…ou escreva aqui") + '" aria-label="Escreva o pedido"><button type="button" class="bwg-b pri" data-g="enviar">➤</button>' + (semVoz ? "" : '<button type="button" class="bwg-b" data-g="ouvir" aria-label="Falar de novo" title="Falar">🎙</button>') + "</div>" +
      '<div class="bwg-ex">' + EXEMPLOS.map(function (e) { return '<button type="button" data-g="ex">' + esc(e) + "</button>"; }).join("") + "</div>" +
      '<div class="bwg-aj" id="bwgAj" hidden><label><input type="checkbox" data-u="ia"' + (ui("ia", true) ? " checked" : "") + '> Usar a IA Brightway para entender (manda só a frase; sem login ou sem internet, entende no aparelho)</label>' +
      '<label><input type="checkbox" data-u="voz"' + (ui("voz", true) ? " checked" : "") + '> Responder falando</label>' +
      '<label><input type="checkbox" data-u="auto"' + (ui("auto", false) ? " checked" : "") + '> Lançar sem perguntar (só quando tiver tudo: o quê, valor e data)</label></div>' +
      '<div class="bwg-sub">A voz vira texto pelo reconhecimento do próprio navegador' + (ESTADO.local ? " (no aparelho)" : "") + '. Nada é gravado sem você confirmar. Perguntas como "quanto gastei" são calculadas aqui, com os seus dados.</div>';
    var inp = painel.querySelector("#bwgTxt"); inp.onkeydown = function (e) { if (e.key === "Enter" && inp.value.trim()) { processar(inp.value.trim()); inp.value = ""; } };
  }
  function abrir(escutar) {
    if (!painel.innerHTML) desenhar();
    painel.hidden = false; posicionar();
    if (escutar) ouvir(); else { var i = painel.querySelector("#bwgTxt"); if (i) i.focus(); }
  }
  async function ouvir() {
    var fala = painel.querySelector(".bwg-fala"); fala.textContent = "";
    if (!SR && !(navigator.mediaDevices && window.MediaRecorder)) { status("Seu navegador não tem reconhecimento de voz — escreva o pedido abaixo."); return; }
    ouvindo = true; fab.classList.add("ouvindo");
    status('<span class="bwg-onda"><i></i><i></i><i></i><i></i></span> Ouvindo… fale o que quer lançar (toque no robô para parar)');
    try {
      var txt = SR ? await ouvirNavegador(function (p) { fala.textContent = p; }) : await ouvirGravando(function (p) { status(esc(p)); });
      ouvindo = false; fab.classList.remove("ouvindo");
      if (!txt) { status("Não ouvi nada. Toque em 🎙 e fale de novo, ou escreva."); return; }
      fala.textContent = txt; processar(txt, true);
    } catch (e) {
      ouvindo = false; fab.classList.remove("ouvindo");
      var m = String(e && e.message || e);
      status(/not-allowed|denied|Permission/i.test(m) ? "O microfone está bloqueado. Libere o microfone para este site (cadeado na barra de endereço) ou escreva abaixo."
        : /no-speech/.test(m) ? "Não ouvi nada. Toque em 🎙 e fale de novo, ou escreva." : /sem_voz/.test(m) ? "Para usar a voz neste navegador, entre na sua conta (ou escreva abaixo)." : /network/.test(m) ? "Sem internet para reconhecer a voz agora — escreva abaixo." : "Não deu para ouvir (" + esc(m) + "). Escreva abaixo.");
    }
  }
  async function processar(txt, porVoz) {
    painel.querySelector(".bwg-fala").textContent = txt; ESTADO.porVoz = !!porVoz;
    status('<span class="bwg-onda"><i></i><i></i><i></i><i></i></span> Entendendo…');
    var r = await entender(txt);
    ESTADO.acoes = r.acoes; ESTADO.via = r.via;
    var auto = ui("auto", false) && r.acoes.every(function (a) { return /gasto|receita|entrada|conta_pagar|tarefa|custo_evento/.test(a.tipo) && (!precisaValor(a) || num(a.valor) > 0) && (a.tipo !== "custo_evento" || a.eventoId); });
    desenharAcoes(r.resposta);
    status("Entendido (" + esc(r.via) + ")" + (auto ? "" : ". Confira e toque em ✓ LANÇAR."));
    var soInfo = r.acoes.filter(function (a) { return /consulta|abrir|nada|responder/.test(a.tipo); });
    soInfo.forEach(function (a) { if (a.tipo === "consulta") { a.feito = true; a.resposta = consultar(a); falar(a.resposta); } if (a.tipo === "responder") { a.feito = true; falar(a.texto || r.resposta || ""); } if (a.tipo === "nada") falar(r.resposta || "Não entendi. Pode repetir?"); });
    if (soInfo.length) desenharAcoes(r.resposta);
    var ab = r.acoes.filter(function (a) { return a.tipo === "abrir" && PAGINAS[a.pagina]; })[0];
    if (ab && r.acoes.length === 1) { falar("Abrindo " + PAGINAS[ab.pagina][1]); setTimeout(function () { location.href = PAGINAS[ab.pagina][0]; }, 700); }
    if (auto) lancarTodas(); else if (!soInfo.length) { falar(resumo(r.acoes), ESTADO.porVoz ? confirmarPorVoz : null); }
  }
  function resumo(acoes) {
    return acoes.filter(function (a) { return a.tipo !== "nada"; }).map(function (a) {
      if (a.tipo === "tarefa") return "Tarefa: " + (a.titulo || "") + (a.data ? ", " + br(a.data) : "") + (a.hora ? " às " + a.hora : "");
      return (NOMES[a.tipo] || "").toLowerCase() + ": " + (a.descricao || "") + (a.valor ? ", " + moeda(a.valor) : "");
    }).join(". ") + (acoes.length ? ". Confirma?" : "");
  }
  function campo(i, k, rot, tipo, val, ops) {
    var inp = ops ? '<select data-i="' + i + '" data-k="' + k + '">' + ops.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(val) ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select>"
      : '<input data-i="' + i + '" data-k="' + k + '" type="' + tipo + '"' + (tipo === "number" ? ' step="0.01" min="0" inputmode="decimal"' : "") + ' value="' + esc(val == null ? "" : val) + '">';
    return '<div class="lin"><span>' + rot + "</span>" + inp + "</div>";
  }
  var TIPOS_TROCA = [["gasto_casa", "Gasto da casa"], ["receita_casa", "Receita da casa"], ["gasto_negocio", "Gasto do negócio"], ["entrada_negocio", "Entrada do negócio"], ["conta_pagar", "Conta a pagar"], ["custo_evento", "Custo de evento"], ["tarefa", "Tarefa"]];
  function desenharAcoes(resposta) {
    var box = painel.querySelector("#bwgAc"), pend = 0;
    box.innerHTML = ESTADO.acoes.map(function (a, i) {
      if (a.tipo === "responder") return '<div class="bwg-ac feito"><h4>💬 RESPOSTA</h4><div class="bwg-resp">' + esc(a.texto || resposta || "") + "</div></div>";
      if (a.tipo === "consulta") return '<div class="bwg-ac feito"><h4>📊 RESPOSTA</h4><div class="bwg-resp">' + esc(a.resposta || "") + "</div></div>";
      if (a.tipo === "abrir") return '<div class="bwg-ac feito"><h4>↗ ABRIR</h4><div class="bwg-resp">' + (PAGINAS[a.pagina] ? '<a href="' + PAGINAS[a.pagina][0] + '" style="color:#E8C26A">' + esc(PAGINAS[a.pagina][1]) + "</a>" : "Página não encontrada.") + "</div></div>";
      if (a.tipo === "nada") return '<div class="bwg-ac"><h4>🤔 NÃO ENTENDI</h4><div class="bwg-resp">' + esc(resposta || 'Fale, por exemplo: "lance 30 reais de lanche" ou "conta de luz de 250 que vence dia 20".') + "</div></div>";
      if (a.feito) return '<div class="bwg-ac feito"><h4>✓ ' + esc(NOMES[a.tipo]) + " LANÇADO</h4><div class=\"bwg-resp\">" + esc(a.titulo || a.descricao || "") + (a.valor ? " · " + moeda(a.valor) : "") + ' · <a href="' + esc(a.link || "#") + '" style="color:#E8C26A">' + esc(a.onde || "abrir") + "</a></div></div>";
      pend++;
      var h = '<div class="bwg-ac" data-ac="' + i + '"><h4>' + esc(NOMES[a.tipo]) + "</h4>" + campo(i, "tipo", "É um(a)", "", a.tipo, TIPOS_TROCA);
      if (a.tipo === "tarefa") h += campo(i, "titulo", "O quê", "text", a.titulo) + campo(i, "data", "Dia", "date", a.data) + campo(i, "hora", "Hora", "time", a.hora);
      else {
        h += campo(i, "descricao", a.tipo === "conta_pagar" ? "Conta" : "Descrição", "text", a.descricao) + campo(i, "valor", "Valor (R$)", "number", a.valor || "");
        if (a.tipo === "conta_pagar") h += campo(i, "vencimento", "Vencimento", "date", a.vencimento || a.data);
        else h += campo(i, "data", "Data", "date", a.data);
        if (a.tipo === "gasto_casa") h += campo(i, "categoria", "Categoria", "", a.categoria, CAT_CASA);
        if (a.tipo === "custo_evento") h += campo(i, "eventoId", "Evento", "", a.eventoId, [["", "— escolha —"]].concat(Lanca.eventos().slice(0, 40).map(function (e) { return [e.id, e.nome + (e.data ? " · " + br(e.data) : "")]; })));
      }
      return h + '<div class="bwg-acs"><button type="button" class="bwg-b ok" data-g="lancar" data-i="' + i + '">✓ LANÇAR</button><button type="button" class="bwg-b" data-g="tirar" data-i="' + i + '">✕</button></div></div>';
    }).join("") + (pend > 1 ? '<div class="bwg-acs"><button type="button" class="bwg-b ok" data-g="todas">✓ LANÇAR TODOS (' + pend + ")</button></div>" : "");
  }
  function lancar(i, silencioso) {
    var a = ESTADO.acoes[i]; if (!a || a.feito) return true;
    try { var r = executar(a); a.feito = true; if (r) { a.onde = r.onde; a.link = r.link; } return true; }
    catch (e) { if (!silencioso) { status("⚠️ " + esc(e.message || e) + " — complete o campo e toque em ✓ LANÇAR."); falar(e.message || ""); } return false; }
  }
  function lancarTodas() {
    var ok = 0, falhou = 0; ESTADO.acoes.forEach(function (a, i) { if (a.feito || /consulta|abrir|nada|responder/.test(a.tipo)) return; if (lancar(i, true)) ok++; else falhou++; });
    desenharAcoes(); if (ok) { comemorar(); status("✓ " + ok + " lançamento" + (ok > 1 ? "s" : "") + " feito" + (ok > 1 ? "s" : "") + (falhou ? " · " + falhou + " precisa(m) de ajuste" : "") + "."); falar(ok > 1 ? "Pronto, lancei " + ok + " itens." : "Pronto, lançado."); }
    else if (falhou) status("Complete os campos marcados e toque em ✓ LANÇAR.");
  }
  function comemorar() { try { if (window.BWConcluir && BWConcluir.festa) BWConcluir.festa(fab); } catch (e) { } fab.animate && fab.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 420 }); }
  function clique(e) {
    var b = e.target.closest("[data-g]"); if (!b) return; var g = b.dataset.g, i = +b.dataset.i;
    if (g === "fechar") return fechar();
    if (g === "ajustes") { var aj = painel.querySelector("#bwgAj"); aj.hidden = !aj.hidden; return; }
    if (g === "ouvir") return ouvir();
    if (g === "enviar") { var inp = painel.querySelector("#bwgTxt"); if (inp.value.trim()) { processar(inp.value.trim()); inp.value = ""; } return; }
    if (g === "ex") return processar(b.textContent);
    if (g === "tirar") { ESTADO.acoes.splice(i, 1); desenharAcoes(); return; }
    if (g === "lancar") { if (lancar(i)) { desenharAcoes(); comemorar(); var a = ESTADO.acoes[i]; status("✓ Lançado em " + esc(a.onde || "") + "."); falar("Pronto, lançado."); } return; }
    if (g === "todas") return lancarTodas();
  }
  function mudanca(e) {
    var el = e.target;
    if (el.dataset.u) { uiSet(el.dataset.u, el.checked); return; }
    if (el.dataset.k == null) return;
    var a = ESTADO.acoes[+el.dataset.i]; if (!a) return;
    var v = el.value; if (el.dataset.k === "valor") v = num(v);
    a[el.dataset.k] = v;
    if (el.dataset.k === "tipo") { if (v === "tarefa" && !a.titulo) a.titulo = a.descricao; if (v === "conta_pagar" && !a.vencimento) a.vencimento = a.data || hoje(); if (v === "gasto_casa" && CAT_CASA.indexOf(a.categoria) < 0) a.categoria = categoria(a.descricao); if (!a.data) a.data = hoje(); desenharAcoes(); }
  }

  window.BWAgente = { abrir: function (escutar) { montar(); abrir(!!escutar); }, processar: function (t) { montar(); abrir(false); return processar(t); }, entenderLocal: entenderLocal, entender: entender, consultar: consultar, executar: executar, estado: ESTADO };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar); else montar();
})();
