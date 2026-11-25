/* AGENDA (15/11/2026, Claude) — era o modules/agenda do Início; em 20/11 (dono: "PJ e PF não se misturam; cada ecossistema com agenda
   independente") virou arquivo comum, ligado ao AMBIENTE da página: <div id="bwAgenda" data-amb="pj|pf">.
   MINHA EMPRESA (pj): eventos, montagens, custos fixos e cachês a pagar, retornos do CRM e tarefas de trabalho.
   MINHA CASA (pf): contas da casa e tarefas pessoais. Tarefa nova leva o campo amb; tarefa antiga (sem amb) vai pela categoria:
   Pessoal/Casa/Saúde = casa; o resto = empresa. Mesmas chaves de sempre (agenda_tarefas, agenda_feitos) — nenhuma chave nova. */
(function () {
"use strict";
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const fmt = (v, d = 4) => v == null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const load = (key, versao = 1, padrao = null) => { try { const raw = localStorage.getItem("bw_" + key + "_v" + versao); return raw ? JSON.parse(raw) : padrao; } catch (e) { return padrao; } };
const save = (key, versao, valor) => {
  try { if (window.BWSync && typeof window.BWSync.antesDeSalvar === "function") { try { window.BWSync.antesDeSalvar(key, versao, valor); } catch (e) { } }
    localStorage.setItem("bw_" + key + "_v" + versao, JSON.stringify(valor)); return true; } catch (e) { return false; } };
const CAIXA = document.querySelector("#bwAgenda");
const AMB = CAIXA ? (CAIXA.getAttribute("data-amb") || "") : "";
const ambDe = t => t.amb === "pj" || t.amb === "pf" ? t.amb : (["pessoal", "casa", "saude"].includes(t.cat) ? "pf" : "pj");
const CATS_AMB = AMB === "pf" ? ["tarefa", "pessoal", "casa", "saude"] : AMB === "pj" ? ["tarefa", "trabalho"] : ["tarefa", "trabalho", "pessoal", "casa", "saude"];
/* 15/11 (Claude, pedido do dono): AGENDA da tela inicial.
   Tarefas do dia a dia (chave agenda_tarefas, sincronizada) + o que a plataforma já tem:
   contas da casa (casa_contas), custos fixos e cachês a pagar do negócio (neg_fluxo) e eventos (neg_eventos:
   dia, montagem e desmontagem). Nada é copiado: os pagamentos e eventos são lidos na hora de cada tela. */

const K = "agenda_tarefas";
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const SEM = ["DOM","SEG","TER","QUA","QUI","SEX","SÁB"];
const I = {
  agenda: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 10h18"/><circle cx="8" cy="15" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
  tarefa: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="m8 12 3 3 5-6"/>',
  trabalho: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  pessoal: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  saude: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.6 8.8 11.4 8.8 11.4s8.8-5.8 8.8-11.4z"/><path d="M8 11h2l1.5-2 2 4 1.5-2H17"/>',
  reuniao: '<path d="M15 10.5 21 7v10l-6-3.5"/><rect x="3" y="6" width="12" height="12" rx="3"/>',
  pagamento: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  evento: '<path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8-4.3-4.1 5.9-.9z"/>',
  montagem: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>', esq: '<path d="m15 18-6-6 6-6"/>', dir: '<path d="m9 18 6-6-6-6"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  grade: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  ok: '<path d="m5 12 5 5 9-10"/>', lixo: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', seta: '<path d="M7 17 17 7M8 7h9v9"/>',
  entrada: '<path d="M12 19V5M5 12l7-7 7 7"/>', saida: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  brilho: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  enviar: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  repete: '<path d="M17 2l4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>'
};
const svg = (n, s) => `<svg width="${s || 16}" height="${s || 16}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ""}</svg>`;
/* tipos: cor + ícone */
const CATS = [["tarefa", "Tarefa", "#3FD0E0"], ["trabalho", "Trabalho", "#8AB4FF"], ["pessoal", "Pessoal", "#C59BFF"],
  ["casa", "Casa", "#5FE0A0"], ["saude", "Saúde", "#FF8A9A"], ["reuniao", "Reunião", "#7FE3D0"]];
const TIPOS = { pagamento: ["Pagamentos", "#C8102E"], evento: ["Eventos", "#FFD86B"], tarefa: ["Tarefas", "#3FD0E0"] };
const corCat = c => (CATS.find(x => x[0] === c) || CATS[0])[2];

/* datas sempre no horário LOCAL (toISOString usa UTC e vira o dia depois das 21h no Brasil) */
const ymd = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const deYmd = s => { const [a, m, d] = s.split("-").map(Number); return new Date(a, m - 1, d); };
const HOJE = () => ymd(new Date());
const num = v => { const n = parseFloat(String(v == null ? "" : v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
const ler = k => { const v = load(k, 1, []); return Array.isArray(v) ? v : []; };
const lerUi = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } };
const gravarUi = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };

let ANO, MES, SEL, CAT = AMB === "pf" ? "pessoal" : "trabalho";

/* ---- coleta tudo de um intervalo de datas (ini/fim em YYYY-MM-DD) ---- */
/* 16/11: concluir qualquer item da agenda. Tarefa → feitos da própria tarefa; conta da casa → paga (c3 "Sim");
   retorno do CRM → prox.feito no contato; o resto (eventos, montagem, custos fixos, cachês) → lista agenda_feitos (sincronizada). */
const KF = "agenda_feitos";
const feitosSet = () => { const s = {}; ler(KF).forEach(f => { if (f && f.id) s[f.id] = f.em || 1; }); return s; };
function itensEntre(ini, fim, amb) {
  if (amb === undefined) amb = AMB;
  const PJ = amb !== "pf", PF = amb !== "pj";   /* "" = tudo (Assistente e sino) */
  const out = [], FEITOS = feitosSet();
  const dentro = d => d && d >= ini && d <= fim;
  /* tarefas (com repetição semanal/mensal) */
  ler(K).forEach(t => {
    if (!t || !t.data) return;
    if (amb && ambDe(t) !== amb) return;
    const datas = [];
    if (!t.rep) { if (dentro(t.data)) datas.push(t.data); }
    else {
      let d = deYmd(t.data); const lim = deYmd(fim); let n = 0;
      while (d <= lim && n < 400) {
        const s = ymd(d); if (s >= ini) datas.push(s);
        if (t.rep === "semanal") d.setDate(d.getDate() + 7);
        else if (t.rep === "mensal") { const dia = deYmd(t.data).getDate(); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); d.setDate(Math.min(dia, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
        else d.setDate(d.getDate() + 1);
        n++;
      }
    }
    datas.forEach(d => out.push({ tipo: "tarefa", cat: t.cat || "tarefa", id: t.id, data: d, hora: t.hora || "", titulo: t.titulo,
      nota: t.nota || "", rep: t.rep || "", feito: (t.feitos || []).includes(d), chave: "tf|" + t.id + "|" + d }));
  });
  /* pagamentos: contas da casa */
  if (PF) ler("casa_contas").forEach(c => {
    if (!dentro(String(c.c2 || "").slice(0, 10))) return;
    out.push({ tipo: "pagamento", data: c.c2.slice(0, 10), titulo: c.c0 || "Conta", valor: num(c.c1), feito: String(c.c3 || "").toLowerCase() === "sim",
      onde: "contas.html", sub: "Conta da casa", chave: "cc|" + c.id });
  });
  /* pagamentos do negócio: custos fixos e cachês a pagar (Fluxo de caixa) */
  if (PJ) ler("neg_fluxo").forEach(f => {
    const id = String(f.id || ""), d = String(f.c0 || "").slice(0, 10);
    if (!dentro(d) || f.c1 !== "Saída") return;
    if (/^fixo_/.test(id)) out.push({ tipo: "pagamento", data: d, titulo: String(f.c3 || "Custo fixo").replace(/ \(fixo\)$/, ""), valor: num(f.c2), onde: "lancamentos.html?a=pj#lcFixos", sub: "Custo fixo do negócio", chave: "fx|" + id, feito: !!FEITOS["fx|" + id] });
    else if (/^cache_/.test(id) && f.fonte === "pendente") out.push({ tipo: "pagamento", data: d, titulo: String(f.c3 || "Cachê").replace(/^A pagar — /, ""), valor: num(f.c2), onde: "lancamentos.html?nicho=evento&periodo=tudo", sub: "Cachê a pagar", chave: "fx|" + id, feito: !!FEITOS["fx|" + id] });
  });
  /* eventos: dia, montagem e desmontagem */
  if (PJ) ler("neg_eventos").forEach(e => {
    if (!e || /cancel/i.test(e.status || "")) return;
    const link = "eventos.html?ev=" + encodeURIComponent(e.id);
    const ev = (d, k, o) => { const ch = "ev|" + e.id + "|" + k; out.push(Object.assign({ tipo: "evento", data: d, onde: link, chave: ch, feito: !!FEITOS[ch] }, o)); };
    /* 19/11 (dono): evento de vários dias (dataFim) aparece em TODOS os dias, com o "risco" ligando do primeiro ao último na grade;
       a chave é a mesma em todos os dias: concluir em um conclui o evento inteiro */
    const sub0 = [e.local, e.equipeNome].filter(Boolean).join(" · ");
    if (e.data && e.dataFim && e.dataFim > e.data) {
      const total = Math.round((deYmd(e.dataFim) - deYmd(e.data)) / 86400000) + 1; let d = deYmd(e.data);
      for (let k = 1; k <= total && k <= 62; k++, d.setDate(d.getDate() + 1)) { const s = ymd(d);
        if (dentro(s)) ev(s, "dia", { titulo: e.nome, sub: "Dia " + k + " de " + total + (sub0 ? " · " + sub0 : ""), ico: "evento", faixa: k === 1 ? "ini" : k === total ? "fim" : "meio", evId: String(e.id) }); }
    }
    else if (dentro(e.data)) ev(e.data, "dia", { titulo: e.nome, sub: sub0 || "Evento", ico: "evento" });
    if (e.montagem && e.montagem !== e.data && dentro(e.montagem)) ev(e.montagem, "mont", { titulo: "Montagem — " + e.nome, sub: e.local || "Montagem", ico: "montagem" });
    if (e.desmontagem && e.desmontagem !== e.data && dentro(e.desmontagem)) ev(e.desmontagem, "desm", { titulo: "Desmontagem — " + e.nome, sub: e.local || "Desmontagem", ico: "montagem" });
  });
  /* 15/11: CRM — próximo passo combinado com cada contato do funil (mkt_leads) */
  if (PJ) ler("mkt_leads").forEach(l => {
    if (!l || !l.prox || !["novo", "conversa", "proposta", "negociacao"].includes(l.etapa)) return;
    const d = String(l.prox.data || "").slice(0, 10); if (!dentro(d)) return;
    out.push({ tipo: "tarefa", cat: "trabalho", data: d, titulo: "Retornar — " + (l.nome || l.empresa || "contato"), sub: l.prox.oque || "Cliente (CRM)", onde: "captacao.html?lead=" + encodeURIComponent(l.id), ico: "trabalho",
      chave: "crm|" + l.id, feito: !!l.prox.feito });
  });
  const filtro = lerUi("ui_agenda_filtro", { tarefa: 1, pagamento: 1, evento: 1 });
  const ordem = { evento: 0, pagamento: 1, tarefa: 2 };
  return out.filter(i => filtro[i.tipo]).sort((a, b) => a.data.localeCompare(b.data) || (ordem[a.tipo] - ordem[b.tipo]) || (a.hora || "99").localeCompare(b.hora || "99"));
}
const corItem = i => i.tipo === "tarefa" ? corCat(i.cat) : i.tipo === "pagamento" ? (!i.feito && i.data < HOJE() ? "#FF6B6B" : TIPOS.pagamento[1]) : TIPOS.evento[1];
const icoItem = i => i.tipo === "tarefa" ? i.cat : i.tipo === "pagamento" ? "pagamento" : (i.ico || "evento");

function init() {
  const box = document.querySelector("#bwAgenda"); if (!box) return;
  const h = new Date();
  ANO = ANO == null ? h.getFullYear() : ANO; MES = MES == null ? h.getMonth() : MES; SEL = SEL || HOJE();
  render();
}

function render() {
  const box = document.querySelector("#bwAgenda"); if (!box) return;
  const vista = lerUi("ui_agenda_vista", "mes");
  const filtro = lerUi("ui_agenda_filtro", { tarefa: 1, pagamento: 1, evento: 1 });
  const anos = []; for (let a = new Date().getFullYear() - 2; a <= new Date().getFullYear() + 3; a++) anos.push(a);
  if (!anos.includes(ANO)) anos.push(ANO);
  const hoje = HOJE();
  const pend = pendentes().length;
  box.innerHTML = `<div class="ag">
    <div class="ag-barra">
      <div class="ag-titulo"><span class="ico">${svg("agenda", 20)}</span><div><b>${AMB === "pf" ? "AGENDA DA CASA" : AMB === "pj" ? "AGENDA DA EMPRESA" : "AGENDA"}</b><small>${pend ? pend + " pendente(s)" : "Nada pendente ✓"}</small></div></div>
      <button class="ag-btn" data-nav="-1" aria-label="Mês anterior">${svg("esq")}</button>
      <select class="ag-sel" data-mes aria-label="Mês">${MESES.map((m, i) => `<option value="${i}" ${i === MES ? "selected" : ""}>${m[0].toUpperCase() + m.slice(1)}</option>`).join("")}</select>
      <select class="ag-sel" data-ano aria-label="Ano">${anos.sort().map(a => `<option ${a === ANO ? "selected" : ""}>${a}</option>`).join("")}</select>
      <button class="ag-btn" data-nav="1" aria-label="Próximo mês">${svg("dir")}</button>
      <button class="ag-btn" data-hoje>HOJE</button>
      <button class="ag-btn ${vista === "mes" ? "on" : ""}" data-vista="mes" title="Calendário">${svg("grade")}</button>
      <button class="ag-btn ${vista === "lista" ? "on" : ""}" data-vista="lista" title="Lista">${svg("lista")}</button>
    </div>
    <div class="ag-filtros">${Object.entries(TIPOS).filter(([k]) => !(AMB === "pf" && k === "evento")).map(([k, [n, c]]) =>
      `<span class="ag-chip ${filtro[k] ? "" : "off"}" data-filtro="${k}" style="color:${c}"><i style="background:${c}"></i><span style="color:var(--bw-texto-2)">${n}</span></span>`).join("")}</div>
    <div class="ag-magica"><span class="brilho">${svg("brilho", 20)}</span>
      <input id="agMagica" type="text" maxlength="160" autocomplete="off" placeholder="${AMB === "pj" ? "Escreva do seu jeito: “reunião com cliente sexta 15h” · “recebi R$ 2.500 hoje”" : "Escreva do seu jeito: “dentista sexta 15h” · “pagar luz 180 dia 20”"}" aria-label="Lançar escrevendo">
      <button class="ag-btn pri" id="agMagicaBtn" aria-label="Salvar">${svg("enviar")}</button></div>
    <div class="ag-entendi" id="agEntendi"></div>
    ${vista === "lista" ? `<div class="ag-corpo ag-corpo--lista">${lista()}</div>`
      : `<div class="ag-corpo"><div>${grade()}</div><div class="ag-lado" id="agLado">${lado()}</div></div>`}
  </div>`;
  ligar(box);
}

function grade() {
  const ini = new Date(ANO, MES, 1), fimMes = new Date(ANO, MES + 1, 0);
  const g0 = new Date(ini); g0.setDate(1 - ini.getDay());
  const g1 = new Date(fimMes); g1.setDate(fimMes.getDate() + (6 - fimMes.getDay()));
  const itens = itensEntre(ymd(g0), ymd(g1));
  const porDia = {}; itens.forEach(i => (porDia[i.data] = porDia[i.data] || []).push(i));
  const hoje = HOJE(); let html = "";
  for (let d = new Date(g0); d <= g1; d.setDate(d.getDate() + 1)) {
    const s = ymd(d), its = porDia[s] || [];
    const cls = ["ag-dia", d.getMonth() !== MES ? "fora" : "", s === hoje ? "hoje" : "", s === SEL ? "sel" : "", (d.getDay() === 0 || d.getDay() === 6) ? "fds" : ""].join(" ");
    html += `<button class="${cls}" data-dia="${s}" aria-label="${d.getDate()} de ${MESES[d.getMonth()]}${its.length ? ", " + its.length + " item(ns)" : ""}">
      <span class="n">${d.getDate()}</span>
      ${its.slice(0, 2).map(i => `<span class="ag-mini ${i.feito ? "feito" : ""}"><i style="background:${corItem(i)};color:${corItem(i)}"></i>${esc(i.titulo)}</span>`).join("")}
      ${its.length > 2 ? `<span class="ag-mais">+${its.length - 2}</span>` : ""}
      ${its.filter(i => i.faixa).slice(0, 2).map((i, n) => `<span class="ag-risco ${i.faixa}${i.feito ? " feito" : ""}" style="bottom:${3 + n * 6}px" title="${esc(i.titulo)} — ${esc(i.sub)}"></span>`).join("")}
      <span class="ag-pontos">${its.slice(0, 4).map(i => `<i style="background:${corItem(i)};color:${corItem(i)}"></i>`).join("")}</span>
    </button>`;
  }
  return `<div class="ag-sem">${SEM.map(s => `<span>${s}</span>`).join("")}</div><div class="ag-grade">${html}</div>`;
}

/* PENDENTES = já passou ou é hoje e não foi concluído (até 60 dias para trás) */
function pendentes() {
  const h = new Date(), de = ymd(new Date(h.getFullYear(), h.getMonth(), h.getDate() - 60));
  const vistos = {};   /* evento de vários dias: uma linha só nos pendentes (o dia mais recente), não uma por dia */
  return itensEntre(de, HOJE()).filter(i => !i.feito).sort((a, b) => b.data.localeCompare(a.data)).filter(i => !i.faixa || !vistos[i.chave] && (vistos[i.chave] = 1)).sort((a, b) => a.data.localeCompare(b.data));
}
function grupoDatas(its, rotulo) {
  let html = "", atual = "";
  its.forEach(i => {
    if (i.data !== atual) { atual = i.data; html += `<div class="grupo">${rotulo(i.data)}</div>`; }
    html += item(i);
  });
  return html;
}
function rotuloAgenda(d) {
  const n = Math.round((deYmd(d) - deYmd(HOJE())) / 864e5);
  const txt = deYmd(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return n === 0 ? txt + " · hoje" : n === 1 ? txt + " · amanhã" : txt;
}
function rotuloDia(d) {
  const n = Math.round((deYmd(d) - deYmd(HOJE())) / 864e5);
  const txt = deYmd(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  return n === 0 ? txt + " · hoje" : n === 1 ? txt + " · amanhã" : n < 0 ? txt + ` · <span class="atr">atrasado ${-n} dia${n === -1 ? "" : "s"}</span>` : txt;
}
function aba(id, nome, n, corpo, vazio) {
  const ab = lerUi("ui_agenda_abas", { pend: 1, ag: 1 }), aberto = ab[id] !== 0;
  return `<div class="ag-aba-box ab-${id}">
    <button type="button" class="ag-aba ab-${id}" data-aba="${id}" aria-expanded="${aberto}">
      <span class="nm">${nome}</span><span class="cont">${n}</span><span class="chev">${svg("dir", 16)}</span></button>
    <div class="ag-aba-corpo" ${aberto ? "" : "hidden"}><div class="ag-lista">${corpo || `<div class="ag-vazio">${vazio}</div>`}</div></div></div>`;
}
function abaPendentes() {
  const its = pendentes().reverse();   /* mais atrasado por último: hoje primeiro */
  its.sort((a, b) => b.data.localeCompare(a.data));
  return aba("pend", "PENDENTES", its.length, grupoDatas(its, rotuloDia), "Nada pendente — tudo concluído ✨");
}
function lista() {
  /* AGENDA do mês escolhido: o que vem pela frente + o que já foi concluído (verde). O que passou sem concluir fica em PENDENTES. */
  const ini = ymd(new Date(ANO, MES, 1)), fim = ymd(new Date(ANO, MES + 1, 0)), hoje = HOJE();
  const its = itensEntre(ini, fim).filter(i => i.data > hoje || i.feito);
  return abaPendentes() + aba("ag", "AGENDA · " + MESES[MES].toUpperCase() + " " + ANO, its.length, grupoDatas(its, rotuloAgenda),
    `Nada agendado em ${MESES[MES]} de ${ANO}. Toque num dia no calendário para criar uma tarefa.`);
}

function item(i) {
  const cor = corItem(i);
  const tf = i.tipo === "tarefa" && !i.onde;   /* tarefa própria: dá para apagar aqui */
  const atraso = !i.feito && i.data < HOJE();
  const extra = tf
    ? [i.hora, i.rep ? (i.rep === "semanal" ? "toda semana" : i.rep === "mensal" ? "todo mês" : "todo dia") : "", i.nota].filter(Boolean).join(" · ") || (CATS.find(c => c[0] === i.cat) || CATS[0])[1]
    : i.tipo === "pagamento" ? [i.sub, i.valor ? "R$ " + fmt(i.valor, 2) : "", i.feito ? "pago" : (atraso ? "vencido" : "")].filter(Boolean).join(" · ")
    : i.sub;
  const rot = i.feito ? "Desfazer: marcar como não concluído" : i.tipo === "pagamento" ? "Marcar como pago" : "Marcar como concluído";
  return `<div class="ag-item ${i.feito ? "feito" : ""} ${atraso ? "atraso" : ""}">
    <span class="ic" style="color:${i.feito ? "#3ecf8e" : cor}">${svg(i.feito ? "ok" : icoItem(i), 17)}</span>
    <span class="tx"><b>${esc(i.titulo)}</b><small>${i.feito ? '<span class="okt">✓ concluído</span> · ' : ""}${esc(extra || "")}</small></span>
    ${tf ? `<button class="x" data-apagar="${esc(i.id)}" title="Apagar tarefa" aria-label="Apagar tarefa">${svg("lixo", 15)}</button>`
      : `<a class="ir" href="${esc(i.onde)}" title="Abrir">${svg("seta", 15)}</a>`}
    ${i.chave ? `<button class="ag-ok ${i.feito ? "on" : ""}" data-ok="${esc(i.chave)}" data-d="${i.data}" title="${rot}" aria-label="${rot}" aria-pressed="${!!i.feito}">${svg("ok", 17)}</button>` : ""}
  </div>`;
}

function lado() {
  /* coluna ao lado do calendário: PENDENTES + AGENDA das próximas 2 semanas */
  const h = new Date(), fim = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 14), hoje = HOJE();
  const its = itensEntre(hoje, ymd(fim)).filter(i => i.data > hoje || i.feito);
  return abaPendentes() + aba("ag", "AGENDA · 14 DIAS", its.length, grupoDatas(its.slice(0, 30), rotuloAgenda), "Nada nas próximas 2 semanas. Toque num dia do calendário para lançar algo.");
}

/* ---------- FOLHA DE LANÇAMENTO: toque no dia → opções ---------- */
const TILES = [["tarefa", "TAREFA", "#3FD0E0", "tarefa"], ["reuniao", "REUNIÃO", "#7FE3D0", "reuniao"], ["conta", "CONTA A PAGAR", "#FFB547", "pagamento"],
  ["entrada", "ENTRADA", "#5FE0A0", "entrada"], ["saida", "SAÍDA", "#FF8A9A", "saida"], ["evento", "EVENTO", "#FFD86B", "evento"]]
  .filter(t => AMB === "pf" ? t[0] !== "reuniao" && t[0] !== "evento" : true);   /* na casa não há evento nem reunião de trabalho */
let FOLHA_DIA = null, FOLHA_TILE = null;
function abrirFolha(dia, tile) {
  FOLHA_DIA = dia; FOLHA_TILE = tile || null;
  let fundo = document.querySelector("#agFolha");
  if (!fundo) {
    fundo = document.createElement("div"); fundo.id = "agFolha"; fundo.className = "ag-folha-fundo";
    fundo.setAttribute("role", "dialog"); fundo.setAttribute("aria-modal", "true");
    fundo.onclick = e => { if (e.target === fundo) fecharFolha(); };
    document.body.appendChild(fundo);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && document.querySelector("#agFolha")) fecharFolha(); });
  }
  desenharFolha();
  requestAnimationFrame(() => fundo.classList.add("aberta"));
}
function fecharFolha() {
  const f = document.querySelector("#agFolha"); if (!f) return;
  f.classList.remove("aberta"); setTimeout(() => f.remove(), 220);
}
function desenharFolha() {
  const fundo = document.querySelector("#agFolha"); if (!fundo) return;
  const d = deYmd(FOLHA_DIA), n = Math.round((d - deYmd(HOJE())) / 864e5);
  const its = itensEntre(FOLHA_DIA, FOLHA_DIA);
  const quando = n === 0 ? "Hoje" : n === 1 ? "Amanhã" : n === -1 ? "Ontem" : n > 0 ? "Daqui a " + n + " dias" : "Há " + (-n) + " dias";
  fundo.innerHTML = `<div class="ag-folha">
    <div class="ag-f-topo">
      <div class="ag-f-dia"><small>${SEM[d.getDay()]}</small><b>${d.getDate()}</b></div>
      <div class="ag-f-tit"><h3>${d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</h3>
        <div class="sub">${quando} · ${its.length ? its.length + " item(ns) neste dia" : "dia livre"}</div></div>
      <button class="ag-f-x" data-fechar aria-label="Fechar">✕</button>
    </div>
    ${its.length ? `<div class="ag-f-sec">NESTE DIA</div>${its.map(item).join("")}` : ""}
    <div class="ag-f-sec">O QUE VOCÊ QUER LANÇAR?</div>
    <div class="ag-tiles">${TILES.map(([k, nome, c, ic]) => `<button class="ag-tile ${FOLHA_TILE === k ? "on" : ""}" data-tile="${k}" style="--c:${c}">
      <span class="bolha">${svg(ic, 22)}</span>${nome}</button>`).join("")}</div>
    <div id="agFForm">${formTile()}</div>
  </div>`;
  fundo.querySelector("[data-fechar]").onclick = fecharFolha;
  fundo.querySelectorAll("[data-tile]").forEach(b => b.onclick = () => {
    if (b.dataset.tile === "evento") { location.href = "eventos.html?novo=" + FOLHA_DIA; return; }
    FOLHA_TILE = b.dataset.tile; desenharFolha();
    const p = document.querySelector("#agFForm input"); if (p) p.focus();
  });
  ligarItens(fundo, desenharFolha);
  ligarForm(fundo);
}
function formTile() {
  const t = FOLHA_TILE; if (!t) return "";
  const btn = rot => `<button class="ag-salvar" data-salvar>${svg("ok", 18)} ${rot}</button>`;
  if (t === "tarefa" || t === "reuniao") return `<div class="ag-f-form">
      <input class="grande" id="fTit" maxlength="120" placeholder="${t === "reuniao" ? "Reunião com…" : "O que precisa ser feito?"}">
      ${t === "tarefa" ? `<div class="ag-cats">${CATS.filter(c => CATS_AMB.includes(c[0])).map(([k, n2, c]) => `<span class="ag-cat ${k === CAT ? "on" : ""}" data-cat="${k}" style="color:${c}">${svg(k, 14)}<span style="color:${k === CAT ? "var(--bw-noite)" : "var(--bw-texto-2)"}">${n2}</span></span>`).join("")}</div>` : ""}
      <div class="linha"><input id="fHora" type="time" aria-label="Hora"><select id="fRep" aria-label="Repetir"><option value="">Não repete</option><option value="diario">Todo dia</option><option value="semanal">Toda semana</option><option value="mensal">Todo mês</option></select></div>
      <input id="fNota" maxlength="200" placeholder="${t === "reuniao" ? "Onde / link da chamada (opcional)" : "Observação (opcional)"}">
      ${btn(t === "reuniao" ? "AGENDAR REUNIÃO" : "ADICIONAR TAREFA")}</div>`;
  if (t === "conta") return `<div class="ag-f-form">
      <input class="grande" id="fTit" maxlength="80" placeholder="Qual conta? (luz, internet, aluguel…)">
      <input id="fVal" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Valor (R$)">
      <div class="sub" style="font-size:11.5px;color:var(--bw-texto-3)">${AMB === "pj" ? "Vai para os LANÇAMENTOS PJ como saída da empresa neste dia." : "Vai para CONTAS A PAGAR da casa com vencimento neste dia."}</div>
      ${btn("SALVAR CONTA")}</div>`;
  return `<div class="ag-f-form">
      <input class="grande" id="fVal" type="number" inputmode="decimal" step="0.01" min="0" placeholder="Valor (R$)">
      <input id="fTit" maxlength="80" placeholder="${t === "entrada" ? "De onde veio? (cliente, serviço…)" : "Com o quê? (combustível, material…)"}">
      <div class="sub" style="font-size:11.5px;color:var(--bw-texto-3)">${AMB === "pf" ? "Vai para os LANÇAMENTOS PF (orçamento da casa) como " + (t === "entrada" ? "receita" : "gasto") : "Vai para os LANÇAMENTOS PJ da empresa como " + (t === "entrada" ? "entrada" : "saída")} neste dia.</div>
      ${btn(t === "entrada" ? "LANÇAR ENTRADA" : "LANÇAR SAÍDA")}</div>`;
}
function ligarForm(raiz) {
  raiz.querySelectorAll("[data-cat]").forEach(c => c.onclick = () => { CAT = c.dataset.cat; const f = document.querySelector("#agFForm");
    const v = (f.querySelector("#fTit") || {}).value; f.innerHTML = formTile(); ligarForm(raiz); if (v) f.querySelector("#fTit").value = v; });
  const s = raiz.querySelector("[data-salvar]"); if (!s) return;
  raiz.querySelectorAll("#agFForm input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") s.click(); });
  s.onclick = () => {
    const t = FOLHA_TILE, tit = (raiz.querySelector("#fTit").value || "").trim();
    const val = raiz.querySelector("#fVal") ? parseFloat(raiz.querySelector("#fVal").value) || 0 : 0;
    if ((t === "tarefa" || t === "reuniao" || t === "conta") && !tit) { raiz.querySelector("#fTit").focus(); return; }
    if ((t === "conta" || t === "entrada" || t === "saida") && !val) { raiz.querySelector("#fVal").focus(); return; }
    let msg = "";
    if (t === "tarefa" || t === "reuniao") {
      salvarTarefa({ titulo: tit, data: FOLHA_DIA, hora: raiz.querySelector("#fHora").value || "", cat: t === "reuniao" ? "reuniao" : CAT,
        rep: raiz.querySelector("#fRep").value || "", nota: (raiz.querySelector("#fNota").value || "").trim() });
      msg = t === "reuniao" ? "Reunião agendada" : "Tarefa adicionada";
    } else if (t === "conta") { salvarConta(tit, val, FOLHA_DIA); msg = "Conta a pagar salva"; }
    else { salvarFluxo(t === "entrada" ? "Entrada" : "Saída", val, tit, FOLHA_DIA); msg = (t === "entrada" ? "Entrada" : "Saída") + " lançada " + (AMB === "pf" ? "na casa" : "na empresa"); }
    festa(s); toast("✓ " + msg); FOLHA_TILE = null; render(); desenharFolha();
  };
}

/* ---------- gravações (cada uma no lugar de sempre da plataforma) ---------- */
function salvarTarefa(o) { const l = ler(K); o = Object.assign({ id: "tf_" + Date.now(), feitos: [] }, o); o.amb = AMB || ambDe(o); l.push(o); save(K, 1, l); }
/* 20/11 (dono): PJ e PF não se misturam — na EMPRESA a conta a pagar é uma saída do negócio na data; na CASA a entrada/saída vai para o orçamento da família */
function salvarConta(nome, valor, venc) { if (AMB === "pj") return salvarFluxo("Saída", valor, nome, venc); const l = ler("casa_contas"); l.push({ id: Date.now(), c0: nome, c1: String(valor), c2: venc, c3: "Não" }); save("casa_contas", 1, l); }
function salvarFluxo(tipo, valor, desc, data) {
  if (AMB === "pf") { const o = ler("casa_orcamento"); o.push({ id: "ag_" + Date.now(), c0: desc || (tipo === "Entrada" ? "Receita" : "Gasto"), c1: tipo === "Entrada" ? "Outros" : "Outros", c2: tipo === "Entrada" ? "Receita" : "Despesa", c3: String(valor), c4: String(data).slice(0, 7), data: data, origem: "agenda" }); save("casa_orcamento", 1, o); return; }
  const l = ler("neg_fluxo"); l.push({ id: Date.now(), c0: data, c1: tipo, c2: String(valor), c3: desc || (tipo === "Entrada" ? "Entrada" : "Saída") }); save("neg_fluxo", 1, l); }

/* ---------- diversão: confete + aviso ---------- */
function festa(el) {
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const r = el.getBoundingClientRect(), cores = ["#FFB547", "#3FD0E0", "#5FE0A0", "#FFF8EA", "#C59BFF"];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement("i"); p.className = "ag-confete";
    p.style.left = (r.left + r.width / 2) + "px"; p.style.top = (r.top + r.height / 2) + "px"; p.style.background = cores[i % cores.length];
    const ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
    p.style.setProperty("--x", Math.cos(ang) * dist + "px"); p.style.setProperty("--y", (Math.sin(ang) * dist - 40) + "px");
    document.body.appendChild(p); setTimeout(() => p.remove(), 950);
  }
}
function toast(t) { if (window.BWAviso) BWAviso(t, "ok"); }   /* 23/11: aviso único */

/* ---------- BARRA MÁGICA: escreva do seu jeito ("dentista sexta 15h", "pagar luz 180 dia 20") ---------- */
const DIAS_SEM = [["domingo", "dom"], ["segunda", "seg"], ["terça", "terca", "ter"], ["quarta", "qua"], ["quinta", "qui"], ["sexta", "sex"], ["sábado", "sabado", "sab", "sáb"]];
function entender(txt) {
  /* \b do JavaScript não enxerga letras acentuadas (amanhã, terça, reunião) → limites próprios por espaço/pontuação */
  const P = src => new RegExp("(\\s)(?:" + src + ")(?=[\\s.,!?;:])", "i");
  let t = " " + String(txt || "").trim().replace(/\s+/g, " ") + " ", data = null, hora = "", valor = 0, tipo = "tarefa", cat = "tarefa";
  const tira = re => { t = t.replace(re, " "); };
  const tem = src => P(src).test(t);
  const base = new Date(); base.setHours(0, 0, 0, 0);
  const somar = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };
  let m;
  if (tem("depois de amanh[ãa]")) { data = somar(2); tira(P("depois de amanh[ãa]")); }
  else if (tem("amanh[ãa]")) { data = somar(1); tira(P("amanh[ãa]")); }
  else if (tem("hoje")) { data = somar(0); tira(P("hoje")); }
  if (!data && (m = t.match(/(\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=[\s.,!?;:])/))) {
    const a = m[4] ? (m[4].length === 2 ? 2000 + +m[4] : +m[4]) : base.getFullYear();
    data = new Date(a, +m[3] - 1, +m[2]); if (!m[4] && data < base) data.setFullYear(a + 1); tira(m[0]);
  }
  if (!data && (m = t.match(P("dia (\\d{1,2})")))) {
    const dd = +m[0].replace(/\D/g, ""); data = new Date(base.getFullYear(), base.getMonth(), dd); if (data < base) data = new Date(base.getFullYear(), base.getMonth() + 1, dd); tira(m[0]);
  }
  if (!data) DIAS_SEM.some((nomes, i) => nomes.some(nm => { const re = P("(?:na |no |nesta |neste |pr[óo]xim[ao] )?" + nm + "(?:-feira)?");
    if (!re.test(t)) return false; let dd = (i - base.getDay() + 7) % 7; if (dd === 0) dd = 7; data = somar(dd); tira(re); return true; }));
  if ((m = t.match(P("(?:[àa]s )?(\\d{1,2})(?:h(\\d{2})?|:(\\d{2}))(?:min)?")))) {
    const hh = +m[2], mm = +(m[3] || m[4] || 0);
    if (hh < 24 && mm < 60) { hora = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); tira(m[0]); }
  }
  if ((m = t.match(/R\$\s*([\d.]+(?:,\d{1,2})?)/i)) || (m = t.match(P("([\\d.]+(?:,\\d{1,2})?) ?(?:reais|conto)")))) { valor = num(m[1] && /\d/.test(m[1]) ? m[1] : m[2]); tira(m[0]); }
  else if (tem("pagar|conta|boleto|fatura|receber|recebi") && (m = t.match(/(\s)(\d+(?:[.,]\d{1,2})?)(?=[\s.,!?;:])/))) { valor = num(m[2]); tira(m[0]); }
  if (valor && tem("receber|recebi|entrada")) { tipo = "entrada"; tira(P("receber|recebi|entrada")); }
  else if (valor && tem("pagar|conta de|conta|boleto|fatura|vence")) { tipo = "conta"; tira(P("pagar|conta de|conta|boleto|fatura|vence")); }
  else if (tem("reuni[ãa]o|call|meet|videochamada")) cat = "reuniao";
  else if (tem("m[ée]dic[oa]|dentista|exame|academia|consulta|treino|terapia")) cat = "saude";
  else if (tem("cliente|or[çc]amento|proposta|evento|grava[çc][ãa]o|edi[çc][ãa]o|editar|transmiss[ãa]o|montagem")) cat = "trabalho";
  else if (tem("mercado|faxina|casa|lavar|limpar|compras")) cat = "casa";
  const titulo = t.replace(/\s+/g, " ").trim().replace(/^(de|da|do|no|na|às|as|o|a)\s+/i, "").replace(/\s+(de|da|do|no|na|às|as)$/i, "").trim();
  return { titulo: titulo ? titulo[0].toUpperCase() + titulo.slice(1) : "", data: ymd(data || deYmd(SEL || HOJE())), hora, valor, tipo, cat };
}
function descreve(e) {
  const d = deYmd(e.data), n = Math.round((d - deYmd(HOJE())) / 864e5);
  const q = n === 0 ? "hoje" : n === 1 ? "amanhã" : d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  const tp = e.tipo === "conta" ? (AMB === "pj" ? "Conta a pagar da empresa" : "Conta a pagar") : e.tipo === "entrada" ? (AMB === "pf" ? "Receita da casa" : "Entrada no caixa") : (CATS.find(c => c[0] === e.cat) || CATS[0])[1];
  return `Entendi: <b>${esc(tp)}</b> · <b>${esc(e.titulo || "…")}</b> · ${esc(q)}${e.hora ? " · " + e.hora : ""}${e.valor ? " · R$ " + fmt(e.valor, 2) : ""} — Enter para salvar`;
}

function ligar(box) {
  box.querySelectorAll("[data-nav]").forEach(b => b.onclick = () => { MES += +b.dataset.nav; if (MES < 0) { MES = 11; ANO--; } if (MES > 11) { MES = 0; ANO++; } render(); });
  box.querySelector("[data-mes]").onchange = e => { MES = +e.target.value; render(); };
  box.querySelector("[data-ano]").onchange = e => { ANO = +e.target.value; render(); };
  box.querySelector("[data-hoje]").onclick = () => { const h = new Date(); ANO = h.getFullYear(); MES = h.getMonth(); SEL = HOJE(); render(); };
  box.querySelectorAll("[data-vista]").forEach(b => b.onclick = () => { gravarUi("ui_agenda_vista", b.dataset.vista); render(); });
  box.querySelectorAll("[data-filtro]").forEach(c => c.onclick = () => {
    const f = lerUi("ui_agenda_filtro", { tarefa: 1, pagamento: 1, evento: 1 }); f[c.dataset.filtro] = f[c.dataset.filtro] ? 0 : 1; gravarUi("ui_agenda_filtro", f); render(); });
  box.querySelectorAll("[data-dia]").forEach(b => b.onclick = () => {
    SEL = b.dataset.dia;
    const d = deYmd(SEL); if (d.getMonth() !== MES) { MES = d.getMonth(); ANO = d.getFullYear(); }
    render(); abrirFolha(SEL);
  });
  ligarItens(box, render);
  const mg = box.querySelector("#agMagica"), dica = box.querySelector("#agEntendi");
  if (mg) {
    const vai = () => {
      const e = entender(mg.value); if (!e.titulo && !e.valor) { mg.focus(); return; }
      if (e.tipo === "conta") salvarConta(e.titulo || "Conta", e.valor, e.data);
      else if (e.tipo === "entrada") salvarFluxo("Entrada", e.valor, e.titulo, e.data);
      else salvarTarefa({ titulo: e.titulo, data: e.data, hora: e.hora, cat: e.cat, rep: "", nota: "" });
      festa(mg); toast("✓ " + (e.tipo === "conta" ? "Conta a pagar salva" : e.tipo === "entrada" ? "Entrada lançada" : "Anotado na agenda"));
      SEL = e.data; const d = deYmd(e.data); ANO = d.getFullYear(); MES = d.getMonth(); render();
      const m2 = document.querySelector("#agMagica"); if (m2) m2.focus();
    };
    mg.oninput = () => { dica.innerHTML = mg.value.trim() ? descreve(entender(mg.value)) : ""; };
    mg.onkeydown = e => { if (e.key === "Enter") vai(); };
    box.querySelector("#agMagicaBtn").onclick = vai;
  }
}
/* marcar feito / apagar — usados na agenda e na folha */
function concluir(chave, dia) {
  /* devolve true se ficou concluído, false se foi desfeito */
  const [tp, id, extra] = chave.split("|");
  if (tp === "tf") {
    const l = ler(K), t = l.find(x => String(x.id) === id); if (!t) return null;
    t.feitos = t.feitos || []; const i = t.feitos.indexOf(extra || dia);
    if (i > -1) t.feitos.splice(i, 1); else t.feitos.push(extra || dia);
    save(K, 1, l); return i < 0;
  }
  if (tp === "cc") {
    const l = ler("casa_contas"), c = l.find(x => String(x.id) === id); if (!c) return null;
    const pago = String(c.c3 || "").toLowerCase() === "sim"; c.c3 = pago ? "Não" : "Sim";
    save("casa_contas", 1, l); return !pago;
  }
  if (tp === "crm") {
    const l = ler("mkt_leads"), ld = l.find(x => String(x.id) === id); if (!ld || !ld.prox) return null;
    const feito = !!ld.prox.feito;
    if (feito) delete ld.prox.feito;
    else { ld.prox.feito = HOJE(); ld.hist = ld.hist || []; ld.hist.push({ em: new Date().toISOString(), tipo: "nota", txt: "Agenda: concluído — " + (ld.prox.oque || "retorno") }); }
    save("mkt_leads", 1, l); return !feito;
  }
  const l = ler(KF), i = l.findIndex(f => f.id === chave);
  if (i > -1) l.splice(i, 1); else l.push({ id: chave, em: new Date().toISOString() });
  save(KF, 1, l); return i < 0;
}
function ligarItens(raiz, depois) {
  raiz.querySelectorAll("[data-ok]").forEach(b => b.onclick = () => {
    const r = concluir(b.dataset.ok, b.dataset.d); if (r === null) return;
    if (r) { festa(b); toast(b.dataset.ok.indexOf("cc|") === 0 ? "✓ Conta marcada como paga" : "✓ Concluído! Foi para a AGENDA, em verde."); }
    else toast("Voltou para pendente");
    render(); if (depois !== render) depois();
    try { if (window.bwAtualizarAvisos) window.bwAtualizarAvisos(); } catch (e) { }
  });
  raiz.querySelectorAll("[data-aba]").forEach(b => b.onclick = () => {
    const ab = lerUi("ui_agenda_abas", { pend: 1, ag: 1 }), id = b.dataset.aba, abrir = ab[id] === 0;
    ab[id] = abrir ? 1 : 0; gravarUi("ui_agenda_abas", ab);
    document.querySelectorAll(`[data-aba="${id}"]`).forEach(x => { x.setAttribute("aria-expanded", abrir); const c = x.nextElementSibling; if (c) c.hidden = !abrir; });
  });
  raiz.querySelectorAll("[data-apagar]").forEach(b => b.onclick = () => {
    const lista = ler(K); const t = lista.find(x => String(x.id) === b.dataset.apagar); if (!t) return;
    if (!confirm(`Apagar a tarefa "${t.titulo}"${t.rep ? " (e todas as repetições)" : ""}?`)) return;
    save(K, 1, lista.filter(x => x !== t)); render(); if (depois !== render) depois();
  });
}

/* quando a sincronia traz dados de outro aparelho, a agenda se redesenha */
window.addEventListener("storage", e => { if (e.key && /agenda_tarefas|agenda_feitos|casa_contas|casa_orcamento|neg_fluxo|neg_eventos|mkt_leads/.test(e.key)) render(); });
/* 16/11: o AGENTE grava nesta mesma aba → redesenha na hora; e ele lê a agenda pelo mesmo cálculo (respostas iguais à tela) */
window.addEventListener("bw-dados", e => { if (e.detail && /agenda_tarefas|agenda_feitos|casa_contas|casa_orcamento|neg_fluxo|neg_eventos|mkt_leads/.test(e.detail.chave || "")) render(); });
window.BWAgendaItens = (ini, fim, amb) => itensEntre(ini, fim, amb == null ? "" : amb);   /* quem lê de fora (Assistente) vê tudo, a não ser que peça um ambiente */


window.BWAgenda = { init, render, itensEntre, entender, ambDe, amb: AMB };
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
setTimeout(render, 1500);   /* a sincronia ao abrir pode trazer dados da conta */
})();
