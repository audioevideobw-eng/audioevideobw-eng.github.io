/* LANÇAMENTOS (18/11/2026, Claude) — lancamentos.html
   UMA página para lançar tudo (o que é → onde vai → valor) e UMA lista com tudo o que alimenta os indicadores, com alterar, mudar de lugar e
   excluir. Não cria dado novo: lê e grava nos MESMOS lugares das páginas (casa_orcamento c0–c4, casa_contas c0–c3, casa_reserva c0–c1,
   neg_fluxo c0–c3, neg_eventos[].gastos / .recebido, inv_lancamentos), sempre com BWSync.antesDeSalvar → sobe para a conta sozinho.
   Linhas automáticas do fluxo (cache_, fixo_) só aparecem com o atalho para a tela onde nascem; gasto_/receita_ são espelhadas aqui a partir
   do evento (mesma regra do modules/sincronia), para o Fluxo e o Painel ficarem certos na hora. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  function num(x) { if (typeof x === "number") return x; var s = String(x || "").replace(/[^\d,.-]/g, ""); if (!s) return 0; if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
  function brl(v) { return (v < 0 ? "−" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}).replace(/ /g, " "); }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function hoje() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }   /* data LOCAL (regra 29) */
  function dataBR(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ""); return m ? m[3] + "/" + m[2] + "/" + m[1] : "sem data"; }
  var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function cap(s) { s = String(s || "").trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; }
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravar(k, v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(k, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + k + "_v1", JSON.stringify(v)); } catch (e) { return false; }
    try { window.dispatchEvent(new CustomEvent("bw-dados", {detail: {chave: k}})); } catch (e) { }
    return true;
  }
  function novoId(p) { return p + Date.now() + Math.random().toString(36).slice(2, 6); }
  function aviso(el, t, erro) { el.hidden = !t; el.className = "lc-aviso" + (erro ? " erro" : ""); el.textContent = t || ""; }

  var CAT_CASA = ["Alimentação", "Combustível", "Lazer", "Saúde", "Educação", "Moradia", "Transporte", "Vestuário", "Contas (luz/água/net)", "Assinaturas", "Outros"];
  var CLASSES = ["Poupança", "Renda fixa", "Tesouro Direto", "Fundos", "Ações e ETFs", "FIIs", "Previdência", "Cripto", "Moedas", "Milhas", "Outros"];
  var NICHOS = {casa: ["CASA", "#38bdf8"], negocio: ["NEGÓCIO", "#a78bfa"], evento: ["EVENTOS", "#FFB547"], conta: ["CONTAS A PAGAR", "#fb7185"], reserva: ["RESERVA", "#34d399"], invest: ["INVESTIMENTOS", "#facc15"]};
  /* DESTINOS: para onde um lançamento pode ir (o mesmo mapa serve para criar, mostrar e mudar de lugar) */
  var DEST = {
    casa_gasto: {rot: "Casa › Gasto", grupo: "s", nicho: "casa", alimenta: ["Orçamento familiar"]},
    casa_receita: {rot: "Casa › Receita", grupo: "e", nicho: "casa", alimenta: ["Orçamento familiar"]},
    neg_saida: {rot: "Negócio › Saída", grupo: "s", nicho: "negocio", alimenta: ["Painel Financeiro"]},
    neg_entrada: {rot: "Negócio › Entrada", grupo: "e", nicho: "negocio", alimenta: ["Painel Financeiro"]},
    ev_custo: {rot: "Evento › Custo", grupo: "s", nicho: "evento", evento: true, alimenta: ["Dossiê do evento", "Painel Financeiro"]},
    ev_receita: {rot: "Evento › Recebido", grupo: "e", nicho: "evento", evento: true, alimenta: ["Dossiê do evento", "Painel Financeiro"]},
    cache: {rot: "Equipe › Cachê", grupo: "c", nicho: "evento", evento: true, alimenta: ["Dossiê do evento", "Painel Financeiro", "Agenda e avisos"]},
    casa_conta: {rot: "Casa › Conta a pagar", grupo: "s", nicho: "conta", alimenta: ["Contas a pagar", "Agenda e avisos"]},
    reserva: {rot: "Reserva de emergência", grupo: "r", nicho: "reserva", alimenta: ["Reserva de emergência"]},
    invest: {rot: "Investimentos", grupo: "i", nicho: "invest", alimenta: ["Painel de Investimentos"]}
  };
  var LINKS = {"Orçamento familiar": "orcamento.html", "Painel Financeiro": "financeiro-painel.html", "Dossiê do evento": "eventos.html", "Contas a pagar": "contas.html", "Agenda e avisos": "index.html", "Reserva de emergência": "reserva.html", "Painel de Investimentos": "investimentos-painel.html"};

  /* ---------- espelho evento → fluxo (igual ao modules/sincronia, partes 2 e 3) ---------- */
  function espelharEventos() {
    var evs = ler("neg_eventos"), fluxo = ler("neg_fluxo"), mudou = false, idsG = {}, idsR = {};
    var garantir = function (id, item) { var ex = fluxo.filter(function (o) { return o.id === id; })[0]; if (ex) { var a = JSON.stringify(ex); Object.assign(ex, item); if (JSON.stringify(ex) !== a) mudou = true; } else { fluxo.push(Object.assign({id: id}, item)); mudou = true; } };
    evs.forEach(function (e) {
      (e.gastos || []).forEach(function (g) { var gid = g.id || ("gasto_" + e.id + "_" + (g.desc || "") + "_" + (g.data || "")), fid = "gasto_" + gid; idsG[fid] = 1; if (fid.indexOf("gasto_pag_") === 0) return;
        garantir(fid, {c0: g.data || hoje(), c1: "Saída", c2: String(g.valor || 0), c3: "Custos variáveis — " + g.desc + " (" + e.nome + ")", fonte: g.comprovante ? "comprovado" : "pago"}); });
      var rec = parseFloat(e.recebido || 0) || 0, fr = "receita_" + e.id;
      if (rec > 0) { idsR[fr] = 1; garantir(fr, {c0: e.data || hoje(), c1: "Entrada", c2: String(rec), c3: "Receita de evento — " + e.nome, fonte: "recebido"}); }
    });
    /* cachês (parte 1 da sincronia): não pago = "A pagar — cachê de X (evento)" (pendente, não conta como gasto); pago = "Custos variáveis — cachê de X (evento)" */
    var idsC = {}; ler("neg_equipe_pagamentos").forEach(function (p) { if (!p || p.id == null) return; var fid = "cache_" + p.id, ev = evs.filter(function (e) { return String(e.id) === String(p.eventoId); })[0], nomeEv = ev ? ev.nome : (p.evento || "evento"); idsC[fid] = 1;
      garantir(fid, {c0: p.data || hoje(), c1: "Saída", c2: String(p.valor || 0), c3: (p.pago ? "Custos variáveis — cachê de " : "A pagar — cachê de ") + p.colab + " (" + nomeEv + ")", fonte: p.pago ? "pago" : "pendente"}); });
    var n0 = fluxo.length;
    fluxo = fluxo.filter(function (o) { var id = String(o.id); if (id.indexOf("cache_") === 0 && !idsC[id]) return false; if (id.indexOf("gasto_") === 0 && id.indexOf("gasto_pag_") !== 0 && !idsG[id]) return false; if (id.indexOf("receita_") === 0 && !idsR[id]) return false; return true; });
    if (mudou || fluxo.length !== n0) gravar("neg_fluxo", fluxo);
  }

  /* cachê pago entra como gasto do evento (id pag_<id>, igual ao modules/pagamento); não pago sai de lá */
  function cacheNoEvento(p, tirarDe) {
    var l = ler("neg_eventos"), gid = "pag_" + p.id, mudou = false;
    l.forEach(function (e) { var g = (e.gastos || []).filter(function (x) { return x.id === gid; })[0], aqui = !tirarDe && p.pago && String(e.id) === String(p.eventoId);
      if (aqui) { var novo = {id: gid, desc: "Cachê — " + p.colab, valor: p.valor, data: p.data || hoje(), comprovante: null, caminho: null}; if (g) Object.assign(g, novo); else { e.gastos = e.gastos || []; e.gastos.push(novo); } mudou = true; }
      else if (g) { e.gastos.splice(e.gastos.indexOf(g), 1); mudou = true; } });
    if (mudou) gravar("neg_eventos", l);
  }
  function colabs() { return ler("neg_equipe_colaboradores").filter(function (c) { return c && c.nome; }); }
  function dadosCache(p, f, d, v) {   /* preenche o registro no formato de neg_equipe_pagamentos */
    var nome = cap(f.desc), c = colabs().filter(function (x) { return String(x.nome).toLowerCase() === nome.toLowerCase(); })[0], ev = ler("neg_eventos").filter(function (e) { return String(e.id) === String(f.evId); })[0];
    if (!ev) throw new Error("Escolha o evento.");
    var eq = c ? ler("neg_equipe_equipes").filter(function (q) { return (q.membros || []).some(function (m) { return String(m) === String(c.id); }); })[0] : null;
    p.colab = c ? c.nome : nome; p.colabId = c ? c.id : (p.colabId && p.colab === nome ? p.colabId : ""); if (eq || p.equipeId == null) p.equipeId = eq ? eq.id : "";
    p.eventoId = String(ev.id); p.evento = ev.nome || ""; p.valor = v; p.data = d; p.obs = f.obs || ""; p.pago = f.pago === "sim" || f.pago === true; return p;
  }
  function pagarCache(id) {   /* PAGO ↔ NÃO PAGO */
    var l = ler("neg_equipe_pagamentos"), p = l.filter(function (x) { return String(x.id) === String(id); })[0]; if (!p) return;
    p.pago = !p.pago; p._ed = Date.now(); p.data = p.data || hoje(); gravar("neg_equipe_pagamentos", l); cacheNoEvento(p); espelharEventos();
  }

  /* ---------- lista única ---------- */
  function itens() {
    var L = [], add = function (o) { o.uid = o.fonte + ":" + o.id; L.push(o); };
    ler("casa_orcamento").forEach(function (x) { if (!x || x.id == null) return; var rec = x.c2 === "Receita"; add({fonte: "orc", id: x.id, dest: rec ? "casa_receita" : "casa_gasto", data: x.data || (x.c4 ? x.c4 + "-01" : ""), desc: x.c0, cat: x.c1, valor: num(x.c3), sinal: rec ? "e" : "s"}); });
    ler("casa_contas").forEach(function (x) { if (!x || x.id == null) return; var pg = String(x.c3 || "").toLowerCase().indexOf("s") === 0; add({fonte: "conta", id: x.id, dest: "casa_conta", data: x.c2, desc: x.c0, valor: num(x.c1), sinal: "s", pago: pg, aberto: !pg}); });
    ler("casa_reserva").forEach(function (x) { if (!x || x.id == null) return; add({fonte: "reserva", id: x.id, dest: "reserva", data: /^\d{4}-\d{2}$/.test(x.c0 || "") ? x.c0 + "-01" : (x.c0 || ""), desc: "Guardado na reserva", valor: num(x.c1), sinal: "n"}); });
    ler("neg_fluxo").forEach(function (x) { if (!x || x.id == null) return; var id = String(x.id), ent = String(x.c1 || "").toLowerCase().indexOf("entrada") === 0;
      if (/^(gasto_|receita_)/.test(id)) return;   /* vêm do evento, logo abaixo (ev_ antigo aparece como linha comum, para poder excluir) */
      if (id.indexOf("cache_") === 0) return;   /* vem da lista de cachês, logo abaixo */
      if (id.indexOf("fixo_") === 0) { add({fonte: "auto", id: id, dest: "", nicho: "negocio", data: x.c0, desc: x.c3, valor: num(x.c2), sinal: ent ? "e" : "s", auto: ent ? "Recebimento fixo do negócio" : "Custo fixo do negócio", link: "#lcFixos", alimenta: ["Painel Financeiro"]}); return; }
      add({fonte: "fluxo", id: x.id, dest: ent ? "neg_entrada" : "neg_saida", data: x.c0, desc: x.c3, valor: num(x.c2), sinal: ent ? "e" : "s"}); });
    ler("neg_eventos").forEach(function (e) { if (!e || e.id == null) return;
      (e.gastos || []).forEach(function (g, i) { if (String(g.id || "").indexOf("pag_") === 0) return; add({fonte: "evgasto", id: e.id + "|" + (g.id || "#" + i), dest: "ev_custo", evId: String(e.id), evNome: e.nome, gi: i, data: g.data || e.data, desc: g.desc, valor: num(g.valor), sinal: "s"}); });
      var rec = parseFloat(e.recebido || 0) || 0; if (rec > 0) add({fonte: "evrec", id: e.id, dest: "ev_receita", evId: String(e.id), evNome: e.nome, cliente: e.cliente || "", data: e.data, desc: "Pagamento do evento " + (e.nome || ""), valor: rec, sinal: "e"}); });
    var nomesEv = {}; ler("neg_eventos").forEach(function (e) { if (e && e.id != null) nomesEv[String(e.id)] = e.nome; });
    ler("neg_equipe_pagamentos").forEach(function (p) { if (!p || p.id == null) return; add({fonte: "cache", id: p.id, dest: "cache", evId: String(p.eventoId || ""), evNome: nomesEv[String(p.eventoId)] || p.evento || "", colab: p.colab || "", obs: p.obs || "", data: p.data || "", desc: "Cachê — " + (p.colab || "equipe"), valor: num(p.valor), sinal: "s", aberto: !p.pago, pago: !!p.pago}); });
    ler("inv_lancamentos").forEach(function (x) { if (!x || x.id == null || String(x.id).indexOf("ex") === 0) return; add({fonte: "inv", id: x.id, dest: "invest", data: x.c0, desc: x.ativo, cat: x.classe, op: x.op, valor: num(x.valor), sinal: "n"}); });
    var h = hoje();
    L.forEach(function (o) { var d = DEST[o.dest]; if (d) { o.nicho = d.nicho; o.alimenta = d.alimenta; } o.futuro = (o.data || "") > h; o.realizado = !o.futuro && !o.aberto && (o.sinal === "e" || o.sinal === "s"); });
    return L;
  }
  function onde(o) { if (o.auto) return o.auto; var d = DEST[o.dest] || {rot: ""}; return d.rot + (o.evNome ? " · " + o.evNome : "") + (o.cliente ? " · cliente " + o.cliente : "") + (o.cat && o.fonte === "orc" ? " · " + o.cat : "") + (o.fonte === "inv" ? " · " + (o.cat || "") + " · " + (o.op || "") : ""); }

  /* ---------- gravar / apagar na origem ---------- */
  function eventosLista() { return ler("neg_eventos").filter(function (e) { return e && e.id != null; }).sort(function (a, b) { return String(b.data || "").localeCompare(String(a.data || "")); }); }
  function criar(dest, f) {
    var d = f.data || hoje(), v = num(f.valor), l, e;
    if (dest === "casa_gasto" || dest === "casa_receita") { l = ler("casa_orcamento"); l.push({id: novoId("lc_"), c0: cap(f.desc), c1: f.cat || "Outros", c2: dest === "casa_receita" ? "Receita" : "Despesa", c3: String(v), c4: d.slice(0, 7), data: d, origem: "lancamentos"}); gravar("casa_orcamento", l); }
    else if (dest === "neg_saida" || dest === "neg_entrada") { l = ler("neg_fluxo"); l.push({id: novoId("lc_"), c0: d, c1: dest === "neg_entrada" ? "Entrada" : "Saída", c2: String(v), c3: cap(f.desc), origem: "lancamentos"}); gravar("neg_fluxo", l); }
    else if (dest === "casa_conta") { l = ler("casa_contas"); l.push({id: novoId("lc_"), c0: cap(f.desc), c1: String(v), c2: d, c3: f.pago ? "Sim" : "Não", origem: "lancamentos"}); gravar("casa_contas", l); }
    else if (dest === "reserva") { l = ler("casa_reserva"); l.push({id: novoId("lc_"), c0: d.slice(0, 7), c1: String(v)}); gravar("casa_reserva", l); }
    else if (dest === "invest") { l = ler("inv_lancamentos"); l.push({id: Date.now(), c0: d, classe: f.classe || "Outros", ativo: cap(f.desc) || f.classe || "Investimento", op: f.op || "Aplicação", qtd: 0, valor: v, obs: ""}); gravar("inv_lancamentos", l); }
    else if (dest === "ev_custo" || dest === "ev_receita") { l = ler("neg_eventos"); e = l.filter(function (x) { return String(x.id) === String(f.evId); })[0]; if (!e) throw new Error("Escolha o evento.");
      if (dest === "ev_custo") { e.gastos = e.gastos || []; e.gastos.push({id: novoId("ct_"), desc: cap(f.desc) || "Custo", valor: v, data: d, origem: "lancamentos"}); }
      else e.recebido = Math.round(((parseFloat(e.recebido || 0) || 0) + v) * 100) / 100;
      gravar("neg_eventos", l); espelharEventos(); }
    else if (dest === "cache") { l = ler("neg_equipe_pagamentos"); var p = dadosCache({id: Date.now(), origem: "lancamentos"}, f, d, v); l.push(p); gravar("neg_equipe_pagamentos", l); cacheNoEvento(p); espelharEventos(); }
    else throw new Error("Destino desconhecido.");
  }
  function apagar(o) {
    var tirar = function (k) { gravar(k, ler(k).filter(function (x) { return String(x.id) !== String(o.id); })); };
    if (o.fonte === "orc") tirar("casa_orcamento"); else if (o.fonte === "conta") tirar("casa_contas"); else if (o.fonte === "reserva") tirar("casa_reserva"); else if (o.fonte === "fluxo") tirar("neg_fluxo"); else if (o.fonte === "inv") tirar("inv_lancamentos");
    else if (o.fonte === "cache") { tirar("neg_equipe_pagamentos"); cacheNoEvento({id: o.id}, true); espelharEventos(); }
    else if (o.fonte === "evgasto" || o.fonte === "evrec") { var l = ler("neg_eventos"), e = l.filter(function (x) { return String(x.id) === o.evId; })[0]; if (!e) return;
      if (o.fonte === "evrec") e.recebido = 0; else e.gastos = (e.gastos || []).filter(function (g, i) { return i !== o.gi; });
      gravar("neg_eventos", l); espelharEventos(); }
  }
  function alterarNoLugar(o, f) {
    var d = f.data || o.data || hoje(), v = num(f.valor), muda = function (k, fn) { var l = ler(k), x = l.filter(function (y) { return String(y.id) === String(o.id); })[0]; if (x) { fn(x); gravar(k, l); } };
    if (o.fonte === "orc") muda("casa_orcamento", function (x) { x.c0 = cap(f.desc); x.c1 = f.cat || x.c1; x.c3 = String(v); x.data = d; x.c4 = d.slice(0, 7); });
    else if (o.fonte === "conta") muda("casa_contas", function (x) { x.c0 = cap(f.desc); x.c1 = String(v); x.c2 = d; });
    else if (o.fonte === "reserva") muda("casa_reserva", function (x) { x.c0 = d.slice(0, 7); x.c1 = String(v); });
    else if (o.fonte === "fluxo") muda("neg_fluxo", function (x) { x.c0 = d; x.c2 = String(v); x.c3 = cap(f.desc); });
    else if (o.fonte === "cache") { var lp = ler("neg_equipe_pagamentos"), pp = lp.filter(function (y) { return String(y.id) === String(o.id); })[0]; if (!pp) return; dadosCache(pp, f, d, v); pp._ed = Date.now(); gravar("neg_equipe_pagamentos", lp); cacheNoEvento(pp); espelharEventos(); }
    else if (o.fonte === "inv") muda("inv_lancamentos", function (x) { x.c0 = d; x.valor = v; x.ativo = cap(f.desc) || x.ativo; if (f.classe) x.classe = f.classe; if (f.op) x.op = f.op; });
    else { var l = ler("neg_eventos"), e = l.filter(function (x) { return String(x.id) === o.evId; })[0]; if (!e) return;
      if (o.fonte === "evrec") e.recebido = v; else { var g = (e.gastos || [])[o.gi]; if (g) { g.desc = cap(f.desc) || g.desc; g.valor = v; g.data = d; } }
      gravar("neg_eventos", l); espelharEventos(); }
  }

  /* ---------- telas ---------- */
  var MES = hoje().slice(0, 7), NICHO = "", TODOS = [];
  function desenhar() {
    desenharFixos();
    TODOS = itens();
    /* meses do seletor: os que têm lançamento + o atual */
    var ms = {}; ms[hoje().slice(0, 7)] = 1; TODOS.forEach(function (o) { if (/^\d{4}-\d{2}/.test(o.data || "")) ms[o.data.slice(0, 7)] = 1; });
    var lista = Object.keys(ms).sort().reverse(); if (lista.indexOf(MES) < 0) MES = lista[0];
    $("lcMes").innerHTML = lista.map(function (m) { return '<option value="' + m + '"' + (m === MES ? " selected" : "") + '>' + MESES[+m.slice(5) - 1].toUpperCase() + " " + m.slice(0, 4) + '</option>'; }).join("");
    var doMes = TODOS.filter(function (o) { return (o.data || "").slice(0, 7) === MES; }), soma = function (l, fn) { return l.filter(fn).reduce(function (a, o) { return a + o.valor; }, 0); };
    var ent = soma(doMes, function (o) { return o.realizado && o.sinal === "e"; }), sai = soma(doMes, function (o) { return o.realizado && o.sinal === "s"; });
    var pend = soma(doMes, function (o) { return o.sinal === "s" && (o.aberto || o.futuro); }), guard = soma(doMes, function (o) { return o.sinal === "n" && o.op !== "Resgate" && o.op !== "Saldo atual"; });
    var k = function (c, ic, rot, v, sub) { return '<div class="lc-kpi" style="--c:' + c + '"><small><i>' + ic + '</i>' + rot + '</small><b>' + v + '</b><span>' + sub + '</span></div>'; };
    $("lcKpis").innerHTML = k("#22c55e", "↑", "ENTRADAS", brl(ent), "recebido no mês") + k("#ef4444", "↓", "SAÍDAS", brl(sai), "pago no mês") + k(ent - sai >= 0 ? "#38bdf8" : "#fb923c", "=", "RESULTADO", brl(ent - sai), "entradas − saídas") +
      k("#FFB547", "!", "A PAGAR", brl(pend), "em aberto ou com data futura") + k("#a78bfa", "#", "LANÇAMENTOS", String(doMes.length), guard ? brl(guard) + " guardado/investido" : "no mês escolhido");
    /* 6 meses */
    var seis = [], dm = new Date(+MES.slice(0, 4), +MES.slice(5) - 1, 1); for (var i = 5; i >= 0; i--) { var x = new Date(dm.getFullYear(), dm.getMonth() - i, 1); seis.push(x.getFullYear() + "-" + p2(x.getMonth() + 1)); }
    var val = seis.map(function (m) { var l = TODOS.filter(function (o) { return o.realizado && (o.data || "").slice(0, 7) === m; }); return [soma(l, function (o) { return o.sinal === "e"; }), soma(l, function (o) { return o.sinal === "s"; })]; }), mx = Math.max.apply(0, val.map(function (v) { return Math.max(v[0], v[1]); }).concat([1]));
    $("lcBarras").innerHTML = seis.map(function (m, i) { return '<div title="' + MESES[+m.slice(5) - 1] + ": entradas " + brl(val[i][0]) + ", saídas " + brl(val[i][1]) + '"><span class="par"><i class="e" style="height:' + Math.round(val[i][0] / mx * 100) + '%"></i><i class="s" style="height:' + Math.round(val[i][1] / mx * 100) + '%"></i></span><small>' + MESES[+m.slice(5) - 1] + '</small></div>'; }).join("");
    /* rosca das saídas por nicho */
    var por = {}; doMes.forEach(function (o) { if (o.realizado && o.sinal === "s") por[o.nicho] = (por[o.nicho] || 0) + o.valor; });
    var ks = Object.keys(por).sort(function (a, b) { return por[b] - por[a]; }), tot = ks.reduce(function (a, n) { return a + por[n]; }, 0), ac = 0, R = 42, C = 2 * Math.PI * R;
    $("lcRosca").innerHTML = tot ? '<svg viewBox="0 0 112 112" role="img" aria-label="Saídas por nicho"><circle cx="56" cy="56" r="' + R + '" fill="none" stroke="rgba(120,160,255,.12)" stroke-width="16"/>' + ks.map(function (n) { var f = por[n] / tot, s = '<circle cx="56" cy="56" r="' + R + '" fill="none" stroke="' + NICHOS[n][1] + '" stroke-width="16" stroke-dasharray="' + (f * C).toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-ac * C).toFixed(2) + '" transform="rotate(-90 56 56)"/>'; ac += f; return s; }).join("") + '</svg><ul>' + ks.map(function (n) { return '<li><i style="width:9px;height:9px;border-radius:50%;background:' + NICHOS[n][1] + '"></i><span>' + NICHOS[n][0] + '</span><b>' + Math.round(por[n] / tot * 100) + '%</b></li>'; }).join("") + '</ul>'
      : '<p class="lc-nota" style="margin:0">Sem saídas pagas neste mês.</p>';
    /* o que alimenta */
    var al = {}; doMes.forEach(function (o) { (o.alimenta || []).forEach(function (a) { al[a] = (al[a] || 0) + 1; }); });
    $("lcAlimenta").innerHTML = Object.keys(LINKS).map(function (a) { return '<li><a href="' + LINKS[a] + '" style="color:inherit">' + a + ' ↗</a><b>' + (al[a] || 0) + '</b></li>'; }).join("");
    /* chips */
    $("lcNichos").innerHTML = '<button type="button" class="lc-chip' + (!NICHO ? " on" : "") + '" data-n="" aria-pressed="' + !NICHO + '">TODOS</button>' + Object.keys(NICHOS).map(function (n) { return '<button type="button" class="lc-chip' + (NICHO === n ? " on" : "") + '" data-n="' + n + '" style="--c:' + NICHOS[n][1] + '" aria-pressed="' + (NICHO === n) + '">' + NICHOS[n][0] + '</button>'; }).join("");
    desenharLista();
  }
  function desenharLista() {
    var q = $("lcBusca").value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), per = $("lcPeriodo").value, tp = $("lcTipo").value, ord = $("lcOrdem").value;
    var l = TODOS.filter(function (o) { if (per === "mes" && (o.data || "").slice(0, 7) !== MES) return false; if (NICHO && o.nicho !== NICHO) return false; if (tp && o.sinal !== tp) return false;
      if (q && (o.desc + " " + onde(o) + " " + (o.cat || "")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").indexOf(q) < 0) return false; return true; });
    l.sort(ord === "maior" ? function (a, b) { return b.valor - a.valor; } : function (a, b) { var c = String(a.data || "").localeCompare(String(b.data || "")); return ord === "velho" ? c : -c; });
    var h = "", dia = null;
    l.forEach(function (o) { var cor = (NICHOS[o.nicho] || ["", "#94a3b8"])[1];
      if (ord !== "maior" && o.data !== dia) { dia = o.data; h += '<div class="lc-dia">' + dataBR(o.data) + '</div>'; }
      h += '<div class="lc-item" data-uid="' + esc(o.uid) + '" data-bw-card="' + esc(o.uid) + '" style="--c:' + cor + '"><div class="t"><b>' + esc(o.desc || "Sem nome") + '</b><small>' + (ord === "maior" ? dataBR(o.data) + " · " : "") + esc(onde(o)) + ' — alimenta: ' + esc((o.alimenta || []).join(", ")) + '</small></div>' +
        '<div class="v ' + o.sinal + '">' + (o.sinal === "e" ? "+ " : o.sinal === "s" ? "− " : "") + brl(o.valor) + '</div><div class="a"><span class="lc-tag" style="--c:' + cor + '">' + (NICHOS[o.nicho] || ["?"])[0] + '</span>' +
        (o.auto ? '<span class="lc-tag cz">AUTOMÁTICO</span>' : "") + (o.fonte === "cache" ? '<span class="lc-tag" style="--c:' + (o.pago ? "#22c55e" : "#ef4444") + '">' + (o.pago ? "PAGO" : "NÃO PAGO") + '</span>' : o.aberto ? '<span class="lc-tag" style="--c:#FFB547">EM ABERTO</span>' : o.futuro ? '<span class="lc-tag" style="--c:#FFB547">DATA FUTURA</span>' : o.fonte === "conta" ? '<span class="lc-tag" style="--c:#22c55e">PAGA</span>' : "") + '<span style="flex:1"></span>' +
        (o.fonte === "conta" ? '<button type="button" class="lc-bt peq" data-pg="' + esc(o.uid) + '" data-bw-status="' + (o.pago ? "volta" : "ok") + '" data-bw-msg="' + (o.pago ? "Conta voltou para em aberto" : "Conta paga!") + '" data-bw-id="' + esc(o.uid) + '">' + (o.pago ? "↺ NÃO PAGA" : "✓ MARCAR PAGA") + '</button>' : "") +
        (o.fonte === "cache" ? '<button type="button" class="lc-bt peq" data-cg="' + esc(o.uid) + '" style="' + (o.pago ? "background:#16a34a;border-color:#16a34a;color:#fff" : "color:#ff8a8a;border-color:#ef4444") + '" data-bw-status="' + (o.pago ? "volta" : "ok") + '" data-bw-msg="' + (o.pago ? "Cachê voltou para NÃO PAGO" : "Cachê pago!") + '" data-bw-id="' + esc(o.uid) + '" aria-label="' + (o.pago ? "Marcar como não pago: " : "Marcar como pago: ") + esc(o.desc) + '">' + (o.pago ? "PAGO ✓" : "NÃO PAGO") + '</button>' : "") +
        (o.auto ? '<a class="lc-bt peq" href="' + o.link + '">' + (o.link.charAt(0) === "#" ? "VER O FIXO ↓" : "ABRIR ONDE NASCEU ↗") + '</a>' : '<button type="button" class="lc-bt peq" data-ed="' + esc(o.uid) + '" aria-label="Alterar ' + esc(o.desc || "lançamento") + '">✎ ALTERAR</button><button type="button" class="lc-bt peq perigo" data-del="' + esc(o.uid) + '" aria-label="Excluir ' + esc(o.desc || "lançamento") + '">✕</button>') + '</div></div>'; });
    $("lcLista").innerHTML = h || '<div class="lc-vazio">' + (TODOS.length ? "Nenhum lançamento com esse filtro. Troque o mês, o nicho ou a busca." : "Ainda não há lançamentos. Toque em <b>＋ NOVO LANÇAMENTO</b> e responda o que é e para onde vai.") + '</div>';
  }
  /* ---------- FIXOS DO NEGÓCIO (vieram da antiga página Fluxo de caixa; mesmo formato: neg_fixos c0 nome · c1 valor · c2 mensal/anual · c3 dia · c4 mês inicial · c5 Saída/Entrada) ---------- */
  function expandirFixos() {   /* cada fixo gera os próximos lançamentos (mensal = 6 meses, anual = 1) com id fixo_<id>_<data> */
    var fixos = ler("neg_fixos"); if (!fixos.length) return 0; var fluxo = ler("neg_fluxo"), h = hoje(), n = 0;
    fixos.forEach(function (f) { if (!f || f.id == null) return; var dia = Math.min(Math.max(parseInt(f.c3 || "1", 10) || 1, 1), 28), ini = /^\d{4}-\d{2}$/.test(f.c4 || "") ? f.c4 : h.slice(0, 7), ai = +ini.slice(0, 4), mi = +ini.slice(5);
      for (var k = 0; k < 6; k++) { if (f.c2 === "anual" && k > 0) break; var ano = ai, mes = mi + k; while (mes > 12) { mes -= 12; ano++; }
        var data = ano + "-" + p2(mes) + "-" + p2(dia), id = "fixo_" + f.id + "_" + data; if (data < h || fluxo.some(function (o) { return o.id === id; })) continue;
        fluxo.push({id: id, c0: data, c1: f.c5 === "Entrada" ? "Entrada" : "Saída", c2: f.c1, c3: f.c0 + " (fixo)"}); n++; } });
    if (n) gravar("neg_fluxo", fluxo); return n;
  }
  function desenharFixos() {
    var l = ler("neg_fixos").filter(function (f) { return f && f.id != null; }), box = $("lcFixosLista"); if (!box) return;
    box.innerHTML = l.length ? l.map(function (f) { var ent = f.c5 === "Entrada";
      return '<div class="lc-item" data-fixo="' + esc(f.id) + '" style="--c:#7C3AED"><div class="t"><b>' + esc(f.c0 || "Sem nome") + '</b><small>' + (f.c2 === "anual" ? "Uma vez por ano" : "Todo mês") + ", dia " + esc(f.c3 || "1") + " · desde " + esc(f.c4 || "") + ' — alimenta: Painel Financeiro, Agenda e avisos</small></div>' +
        '<div class="v ' + (ent ? "e" : "s") + '">' + (ent ? "+ " : "− ") + brl(num(f.c1)) + '</div><div class="a"><span class="lc-tag" style="--c:#7C3AED">' + (ent ? "RECEBIMENTO FIXO" : "CUSTO FIXO") + '</span><span style="flex:1"></span><button type="button" class="lc-bt peq perigo" data-delfixo="' + esc(f.id) + '" aria-label="Excluir o fixo ' + esc(f.c0 || "") + '">✕ EXCLUIR</button></div></div>'; }).join("")
      : '<div class="lc-vazio">Nenhum fixo ainda. Aluguel, internet, contador, mensalidade de cliente… cadastre uma vez e ele entra sozinho todo mês.</div>';
  }
  function criarFixo() {
    var nome = cap($("fzNome").value), v = num($("fzValor").value), av = $("lcFixoAviso");
    if (!nome || !(v > 0)) { aviso(av, "Preencha o nome e o valor do fixo.", true); return; }
    var l = ler("neg_fixos"); l.push({id: Date.now(), c0: nome, c1: String(v), c2: $("fzRec").value, c3: String(Math.min(Math.max(parseInt($("fzDia").value, 10) || 1, 1), 28)), c4: /^\d{4}-\d{2}$/.test($("fzMes").value) ? $("fzMes").value : hoje().slice(0, 7), c5: $("fzTipo").value});
    gravar("neg_fixos", l); var n = expandirFixos(); $("fzNome").value = ""; $("fzValor").value = ""; desenhar();
    aviso(av, "✓ Fixo \u201c" + nome + "\u201d salvo — " + n + " lançamento(s) criado(s) para os próximos meses.");   /* depois do re-render (regra 2) */
  }
  function apagarFixo(id) {   /* apaga o fixo e os lançamentos FUTUROS que ele gerou; o que já passou fica no histórico (regra 3) */
    var f = ler("neg_fixos").filter(function (x) { return String(x.id) === String(id); })[0]; if (!f) return;
    if (!confirm("Excluir o fixo \u201c" + (f.c0 || "") + "\u201d? Os lançamentos futuros dele também saem; os que já passaram ficam.")) return;
    gravar("neg_fixos", ler("neg_fixos").filter(function (x) { return String(x.id) !== String(id); }));
    var h = hoje(), fl = ler("neg_fluxo"), r = fl.filter(function (o) { return !(String(o.id).indexOf("fixo_" + id + "_") === 0 && (o.c0 || "") >= h); }); if (r.length !== fl.length) gravar("neg_fluxo", r);
    desenhar(); aviso($("lcFixoAviso"), "Fixo excluído.");
  }
  /* ---------- PDF DO MÊS (era o "Exportar fluxo de caixa em PDF" da página que saiu): entradas e saídas do mês e do nicho escolhidos ---------- */
  function carregarPdf() {
    var um = function (u) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = u; s.onload = ok; s.onerror = function () { erro(new Error("sem internet para carregar o gerador de PDF")); }; document.head.appendChild(s); }); };
    if (window.pdfMake && pdfMake.vfs) return Promise.resolve();
    return um("https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js").then(function () { return um("https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js"); });
  }
  function pdfMes() {
    var l = TODOS.filter(function (o) { return (o.data || "").slice(0, 7) === MES && (!NICHO || o.nicho === NICHO) && (o.sinal === "e" || o.sinal === "s"); }).sort(function (a, b) { return String(a.data || "").localeCompare(String(b.data || "")); });
    var feitos = l.filter(function (o) { return o.realizado; }), ent = feitos.filter(function (o) { return o.sinal === "e"; }).reduce(function (a, o) { return a + o.valor; }, 0), sai = feitos.filter(function (o) { return o.sinal === "s"; }).reduce(function (a, o) { return a + o.valor; }, 0);
    var tit = "Lançamentos de " + MESES[+MES.slice(5) - 1] + "/" + MES.slice(0, 4) + (NICHO ? " · " + NICHOS[NICHO][0] : ""), limpo = function (v) { return brl(v).replace(/\u00a0/g, " "); };
    var def = {pageSize: "A4", pageMargins: [36, 40, 36, 40], defaultStyle: {fontSize: 9}, content: [
      {text: tit, fontSize: 16, bold: true}, {text: "Entradas " + limpo(ent) + "   ·   Saídas " + limpo(sai) + "   ·   Resultado " + limpo(ent - sai) + "   (só o que já aconteceu e foi pago)", margin: [0, 6, 0, 12]},
      {table: {headerRows: 1, widths: [52, "*", 150, 60, 70], body: [["Data", "O que foi", "Onde", "Situação", "Valor"].map(function (t) { return {text: t, bold: true, fillColor: "#eeeeee"}; })].concat(l.map(function (o) {
        return [dataBR(o.data), String(o.desc || "Sem nome"), onde(o), o.aberto ? "em aberto" : o.futuro ? "data futura" : "feito", {text: (o.sinal === "e" ? "+ " : "− ") + limpo(o.valor), alignment: "right"}]; })) }, layout: "lightHorizontalLines"},
      {text: l.length ? "" : "Nenhuma entrada ou saída neste mês.", margin: [0, 10, 0, 0]}]};
    return carregarPdf().then(function () { return new Promise(function (ok, erro) { try { pdfMake.createPdf(def).getBuffer(function (b) { ok({blob: new Blob([b], {type: "application/pdf"}), nome: "lancamentos-" + MES + ".pdf", linhas: l.length}); }); } catch (e) { erro(e); } }); });
  }
  function achar(uid) { return TODOS.filter(function (o) { return o.uid === uid; })[0]; }

  /* ---------- folha: novo e alterar ---------- */
  var F = null;   /* {modo:"novo"|"editar", que, dest, o} */
  var QUE = [["gasto", "💸", "GASTEI", "paguei alguma coisa", "#ef4444"], ["entrada", "💰", "RECEBI", "entrou dinheiro", "#22c55e"], ["cache", "👥", "CACHÊ DA EQUIPE", "quem trabalhou no evento", "#a78bfa"], ["conta", "🧾", "CONTA A PAGAR", "tem vencimento", "#FFB547"], ["reserva", "🏦", "GUARDEI", "reserva de emergência", "#34d399"], ["invest", "📈", "INVESTI", "aplicação, resgate, rendimento", "#facc15"]];
  var ONDE = {gasto: [["casa_gasto", "🏠", "DA CASA", "família, mercado, lazer"], ["neg_saida", "💼", "DO NEGÓCIO", "despesa da empresa"], ["ev_custo", "🎬", "DE UM EVENTO", "custo daquele trabalho"]],
    entrada: [["casa_receita", "🏠", "DA CASA", "salário, renda da família"], ["neg_entrada", "💼", "DO NEGÓCIO", "venda, serviço avulso"], ["ev_receita", "🎬", "DE UM EVENTO", "cliente pagou o evento"]],
    conta: [["casa_conta", "🏠", "DA CASA", "luz, água, cartão…"], ["neg_saida", "💼", "DO NEGÓCIO", "sai do caixa na data"]], cache: [["cache", "", "", ""]], reserva: [["reserva", "", "", ""]], invest: [["invest", "", "", ""]]};
  function abrirFolha() { $("lcFolha").hidden = false; document.documentElement.classList.add("lc-aberto"); aviso($("lcFxAviso"), ""); }
  function fecharFolha() { $("lcFolha").hidden = true; document.documentElement.classList.remove("lc-aberto"); F = null; }
  function campos(dest, v) {
    v = v || {}; var d = DEST[dest], evs = eventosLista(), rotData = dest === "casa_conta" || (F && F.que === "conta") ? "Vencimento" : dest === "reserva" ? "Mês" : dest === "cache" ? "Data do pagamento" : "Data";
    var h = '<div class="lc-form"><label>Valor (R$)<input id="fxValor" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(v.valor != null ? String(v.valor).replace(".", ",") : "") + '"></label><label>' + rotData + '<input id="fxData" type="date" value="' + esc(v.data || hoje()) + '"></label>';
    if (dest === "cache") h += '<label class="cheio">Quem recebe<input id="fxDesc" maxlength="80" autocomplete="off" list="fxColabs" placeholder="Escolha da equipe ou digite o nome" value="' + esc(v.desc || "") + '"><datalist id="fxColabs">' + colabs().map(function (c) { return '<option value="' + esc(c.nome) + '">'; }).join("") + '</datalist></label>';
    else if (dest !== "reserva" && dest !== "ev_receita") h += '<label class="cheio">' + (dest === "invest" ? "Nome do investimento" : "O que foi") + '<input id="fxDesc" maxlength="80" autocomplete="off" placeholder="' + (dest === "invest" ? "ex.: CDB Banco X" : dest === "casa_conta" ? "ex.: Conta de luz" : "ex.: Almoço da equipe") + '" value="' + esc(v.desc || "") + '"></label>';
    if (dest === "casa_gasto" || dest === "casa_receita") h += '<label class="cheio">Categoria<select id="fxCat">' + (dest === "casa_receita" ? ["Salário", "Renda extra", "Outros"] : CAT_CASA).concat(v.cat && CAT_CASA.indexOf(v.cat) < 0 ? [v.cat] : []).filter(function (c, i, a) { return a.indexOf(c) === i; }).map(function (c) { return '<option' + (c === v.cat ? " selected" : "") + '>' + esc(c) + '</option>'; }).join("") + '</select></label>';
    if (d.evento) h += '<label class="cheio">Qual evento<select id="fxEv">' + (evs.length ? '<option value="">Escolha o evento…</option>' + evs.map(function (e) { return '<option value="' + esc(e.id) + '"' + (String(e.id) === String(v.evId) ? " selected" : "") + '>' + esc((e.data ? dataBR(e.data) + " · " : "") + (e.nome || "Evento")) + '</option>'; }).join("") : '<option value="">Você ainda não tem eventos cadastrados</option>') + '</select></label>';
    if (dest === "cache") h += '<label>Situação<select id="fxPago"><option value="nao"' + (v.pago ? "" : " selected") + '>NÃO PAGO (a pagar)</option><option value="sim"' + (v.pago ? " selected" : "") + '>PAGO ✓</option></select></label><label>Observação<input id="fxObs" maxlength="80" autocomplete="off" placeholder="opcional" value="' + esc(v.obs || "") + '"></label>';
    if (dest === "invest") h += '<label>Tipo<select id="fxClasse">' + CLASSES.map(function (c) { return '<option' + (c === v.classe ? " selected" : "") + '>' + c + '</option>'; }).join("") + '</select></label><label>Operação<select id="fxOp">' + ["Aplicação", "Resgate", "Rendimento", "Saldo atual"].map(function (c) { return '<option' + (c === v.op ? " selected" : "") + '>' + c + '</option>'; }).join("") + '</select></label>';
    return h + '</div><div class="lc-resumo" id="fxResumo">Vai para <b>' + d.rot + '</b> e alimenta: ' + d.alimenta.join(", ") + '.</div>';
  }
  function lerCampos() { var g = function (id) { var e = $(id); return e ? e.value.trim() : ""; }; return {valor: g("fxValor"), data: g("fxData"), desc: g("fxDesc"), cat: g("fxCat"), evId: g("fxEv"), classe: g("fxClasse"), op: g("fxOp"), obs: g("fxObs"), pago: g("fxPago")}; }
  function desenharNovo() {
    var h = '<div class="lc-passo"><h4><em>1</em>O QUE É?</h4><div class="lc-ops">' + QUE.map(function (q) { return '<button type="button" class="lc-op' + (F.que === q[0] ? " on" : "") + '" data-que="' + q[0] + '" style="--c:' + q[4] + '" aria-pressed="' + (F.que === q[0]) + '"><i>' + q[1] + '</i>' + q[2] + '<small>' + q[3] + '</small></button>'; }).join("") + '</div></div>';
    var ops = F.que ? ONDE[F.que] : null;
    if (ops && ops.length > 1) h += '<div class="lc-passo"><h4><em>2</em>' + (F.que === "entrada" ? "DE ONDE VEIO?" : "É DE ONDE?") + '</h4><div class="lc-ops">' + ops.map(function (q) { return '<button type="button" class="lc-op' + (F.dest === q[0] ? " on" : "") + '" data-dest="' + q[0] + '" aria-pressed="' + (F.dest === q[0]) + '"><i>' + q[1] + '</i>' + q[2] + '<small>' + q[3] + '</small></button>'; }).join("") + '</div></div>';
    if (F.dest) h += '<div class="lc-passo"><h4><em>' + (ops.length > 1 ? 3 : 2) + '</em>QUANTO E QUANDO?</h4>' + campos(F.dest, F.guardado) + '</div><div class="lc-linha"><button type="button" class="lc-bt pri" id="fxLancar">✓ LANÇAR</button><button type="button" class="lc-bt" id="fxLancarOutro">✓ LANÇAR E FAZER OUTRO</button></div>';
    $("lcFxTit").textContent = "NOVO LANÇAMENTO"; $("lcFxCorpo").innerHTML = h;
  }
  function desenharEditar() {
    var o = F.o, grupo = DEST[o.dest].grupo, podem = Object.keys(DEST).filter(function (k) { return DEST[k].grupo === grupo; });
    var h = '<div class="lc-passo"><h4><em>↪</em>PARA ONDE FOI</h4><div class="lc-form"><label class="cheio">Este lançamento está em<select id="fxDest"' + (podem.length < 2 ? " disabled" : "") + '>' + podem.map(function (k) { return '<option value="' + k + '"' + (k === F.dest ? " selected" : "") + '>' + DEST[k].rot + '</option>'; }).join("") + '</select></label></div>' + (podem.length > 1 ? '<p class="lc-nota">Trocar aqui tira o lançamento de onde está e põe no lugar novo, com o mesmo valor.</p>' : "") + '</div>' +
      '<div class="lc-passo"><h4><em>✎</em>VALOR E DADOS</h4>' + campos(F.dest, F.guardado) + '</div><div class="lc-linha"><button type="button" class="lc-bt pri" id="fxSalvar">✓ SALVAR</button><button type="button" class="lc-bt perigo" id="fxExcluir">✕ EXCLUIR</button></div>';
    $("lcFxTit").textContent = "ALTERAR LANÇAMENTO"; $("lcFxCorpo").innerHTML = h;
  }
  function validar(dest, f) { if (!(num(f.valor) > 0)) return "Digite o valor."; if (DEST[dest].evento && !f.evId) return "Escolha o evento."; if (dest === "cache" && !f.desc) return "Diga quem recebe o cachê."; if (!f.desc && dest !== "reserva" && dest !== "ev_receita") f.desc = f.cat || DEST[dest].rot.split("› ").pop(); return ""; }
  function lancar(outro) {
    var f = lerCampos(), m = validar(F.dest, f); if (m) { aviso($("lcFxAviso"), m, true); return; }
    try { criar(F.dest, f); } catch (e) { aviso($("lcFxAviso"), e.message || "Não consegui lançar.", true); return; }
    var txt = "✓ Lançado: " + brl(num(f.valor)) + " em " + DEST[F.dest].rot + ".";
    if ((f.data || "").slice(0, 7) && f.data.slice(0, 7) !== MES) MES = f.data.slice(0, 7);
    if (outro) { F.guardado = {data: f.data, evId: f.evId, cat: f.cat, pago: f.pago === "sim"}; desenhar(); desenharNovo(); aviso($("lcFxAviso"), txt + " Pode lançar o próximo."); var c = $("fxValor"); if (c) c.focus(); }
    else { fecharFolha(); desenhar(); aviso($("lcAviso"), txt); }
  }
  function salvar() {
    var o = F.o, f = lerCampos(), m = validar(F.dest, f); if (m) { aviso($("lcFxAviso"), m, true); return; }
    try {
      if (F.dest === o.dest && (o.fonte === "cache" || !DEST[o.dest].evento || f.evId === o.evId)) alterarNoLugar(o, f);
      else { if (o.fonte === "conta") f.pago = o.pago; criar(F.dest, f); apagar(o); }   /* cria no lugar novo e só então tira do antigo */
    } catch (e) { aviso($("lcFxAviso"), e.message || "Não consegui salvar.", true); return; }
    var mudou = F.dest !== o.dest; fecharFolha(); desenhar(); aviso($("lcAviso"), mudou ? "✓ Mudou de lugar: agora está em " + DEST[mudou ? lerDest : o.dest].rot + "." : "✓ Alterado.");
  }
  var lerDest = "";
  function excluir(o) { if (!o) return; if (!confirm("Excluir este lançamento?\n\n" + (o.desc || "") + " · " + brl(o.valor) + "\n" + onde(o) + (o.fonte === "evrec" ? "\n\nO evento volta para NÃO RECEBIDO." : "") + "\n\nEle sai também dos indicadores.")) return; apagar(o); if (F) fecharFolha(); desenhar(); aviso($("lcAviso"), "Lançamento excluído."); }

  /* ---------- ligações ---------- */
  $("lcNovo").onclick = function () { F = {modo: "novo", que: null, dest: null, guardado: {}}; desenharNovo(); abrirFolha(); };
  $("lcFxFechar").onclick = fecharFolha;
  $("lcMes").onchange = function () { MES = this.value; desenhar(); };
  ["lcPeriodo", "lcTipo", "lcOrdem"].forEach(function (id) { $(id).onchange = desenharLista; }); $("lcBusca").oninput = desenharLista;
  $("lcNichos").addEventListener("click", function (e) { var b = e.target.closest("[data-n]"); if (!b) return; NICHO = b.dataset.n; desenhar(); });
  $("lcLista").addEventListener("click", function (e) {
    var b = e.target.closest("[data-ed],[data-del],[data-pg],[data-cg]"); if (!b) return;
    if (b.dataset.cg) { var cc = achar(b.dataset.cg); if (cc) pagarCache(cc.id); setTimeout(desenhar, 0); return; }
    if (b.dataset.del) { excluir(achar(b.dataset.del)); return; }
    if (b.dataset.pg) { var c = achar(b.dataset.pg); if (!c) return; var l = ler("casa_contas"), x = l.filter(function (y) { return String(y.id) === String(c.id); })[0]; if (x) { x.c3 = c.pago ? "Não" : "Sim"; gravar("casa_contas", l); } setTimeout(desenhar, 0); return; }
    var o = achar(b.dataset.ed); if (!o) return; F = {modo: "editar", o: o, dest: o.dest, guardado: {valor: o.valor, data: /^\d{4}-\d{2}-\d{2}/.test(o.data || "") ? o.data.slice(0, 10) : hoje(), desc: o.fonte === "evrec" || o.fonte === "reserva" ? "" : o.fonte === "cache" ? o.colab : o.desc, obs: o.obs, pago: o.pago, cat: o.cat, evId: o.evId, classe: o.cat, op: o.op}}; desenharEditar(); abrirFolha();
  });
  $("lcFxCorpo").addEventListener("click", function (e) {
    var b = e.target.closest("[data-que],[data-dest],#fxLancar,#fxLancarOutro,#fxSalvar,#fxExcluir"); if (!b || !F) return;
    if (b.dataset.que) { var g = F.dest ? lerCampos() : F.guardado; F.que = b.dataset.que; F.dest = ONDE[F.que].length === 1 ? ONDE[F.que][0][0] : null; F.guardado = g; desenharNovo(); aviso($("lcFxAviso"), ""); return; }
    if (b.dataset.dest) { F.guardado = F.dest ? lerCampos() : F.guardado; F.dest = b.dataset.dest; desenharNovo(); aviso($("lcFxAviso"), ""); var c = $("fxValor"); if (c && !c.value) c.focus(); return; }
    if (b.id === "fxLancar") lancar(false); else if (b.id === "fxLancarOutro") lancar(true); else if (b.id === "fxSalvar") { lerDest = F.dest; salvar(); } else excluir(F.o);
  });
  $("lcFxCorpo").addEventListener("change", function (e) { if (e.target.id === "fxDest" && F && F.modo === "editar") { F.guardado = lerCampos(); F.dest = e.target.value; desenharEditar(); } });
  $("lcFxCorpo").addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && F) { e.preventDefault(); if (F.modo === "novo") { if (F.dest) lancar(false); } else { lerDest = F.dest; salvar(); } } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("lcFolha").hidden) fecharFolha(); });
  window.addEventListener("bw-dados", function () { if ($("lcFolha").hidden) desenhar(); });   /* Tio Cláudio lançou algo → a lista atualiza */
  window.addEventListener("storage", function (e) { if (e.key && e.key.indexOf("bw_") === 0 && $("lcFolha").hidden) desenhar(); });
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "./"; };
  (async function () { var el = $("userBox"); if (!el) return; var u = null; try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; u = s && s.data && s.data.session && s.data.session.user; } catch (e) {}
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  try { var pr = new URLSearchParams(location.search);   /* atalhos de outras telas: ?nicho=evento&tipo=e&periodo=tudo */
    if (NICHOS[pr.get("nicho")]) NICHO = pr.get("nicho"); if (pr.get("tipo") === "e" || pr.get("tipo") === "s") $("lcTipo").value = pr.get("tipo"); if (pr.get("periodo") === "tudo") $("lcPeriodo").value = "tudo"; } catch (e) {}
  try { $("fzMes").value = hoje().slice(0, 7); $("fzAdd").onclick = criarFixo;
    $("lcFixosLista").addEventListener("click", function (e) { var b = e.target.closest("[data-delfixo]"); if (b) apagarFixo(b.dataset.delfixo); }); } catch (e) {}
  $("lcPdf").onclick = function () { var b = this; b.disabled = true; pdfMes().then(function (r) { var a = document.createElement("a"); a.href = URL.createObjectURL(r.blob); a.download = r.nome; document.body.appendChild(a); a.click(); a.remove(); aviso($("lcAviso"), "✓ PDF do mês gerado (" + r.linhas + " lançamentos)."); })
    .catch(function (e) { aviso($("lcAviso"), "Não deu para gerar o PDF: " + (e && e.message || e), true); }).then(function () { b.disabled = false; }); };
  $("lcFalar").onclick = function () { if (window.BWAgente) BWAgente.abrir(false); else aviso($("lcAviso"), "O Tio Cláudio ainda está carregando. Tente de novo em instantes.", true); };
  expandirFixos(); desenhar();
  try { if (/[?&]novo=1/.test(location.search)) $("lcNovo").click(); } catch (e) {}
  setTimeout(function () { expandirFixos(); desenhar(); }, 1500);   /* a sincronia ao abrir pode trazer dados da conta */
  window.__lanc = {pdfMes: pdfMes, expandirFixos: expandirFixos, itens: itens, desenhar: desenhar, criar: criar, DEST: DEST, espelhar: espelharEventos};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
