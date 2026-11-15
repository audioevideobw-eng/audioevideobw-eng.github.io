/**
 * BRIGHTWAY · Robô da planilha do PAINEL FINANCEIRO
 * Já vem dentro da planilha modelo. Ninguém precisa colar código.
 *
 * Como conectar (uma vez):
 *   1. No site, abra PAINEL FINANCEIRO e toque em GERAR MINHA CHAVE. Copie a chave.
 *   2. Aqui na planilha: menu Brightway › Conectar ao painel… › cole a chave › OK.
 *   3. O Google pede autorização (é o seu próprio robô). Autorize.
 * Daí em diante:
 *   • tudo o que você lançar nas abas Lançamentos e Eventos vai para o SEU painel;
 *   • a aba "Da plataforma" recebe sozinha uma cópia do que você lançou no app (Fluxo de caixa).
 *     Ela é só para consulta: edite esses lançamentos no app.
 */

const SUPABASE_URL = 'https://zdtnetplvdonogmdvarx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU'; // chave pública da plataforma

const ABA_LANC = 'Lançamentos';
const ABA_EVENTOS = 'Eventos';
const ABA_PLATAFORMA = 'Da plataforma';
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

/* ---------- menu ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Brightway')
    .addItem('Conectar ao painel…', 'conectar')
    .addItem('Sincronizar agora', 'sincronizarMenu')
    .addSeparator()
    .addItem('Apagar os dados de exemplo', 'apagarExemplos')
    .addItem('Desconectar esta planilha', 'desconectar')
    .addToUi();
}

function chave_() { return PropertiesService.getDocumentProperties().getProperty('bw_chave') || ''; }

function conectar() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Conectar ao painel Brightway',
    'Cole a chave que aparece no site em PAINEL FINANCEIRO › GERAR MINHA CHAVE:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const k = String(r.getResponseText() || '').trim();
  if (k.length < 20) { ui.alert('Essa chave parece incompleta. Copie de novo no site e tente outra vez.'); return; }
  PropertiesService.getDocumentProperties().setProperty('bw_chave', k);
  const ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('aoAlterar').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('aoAlterar').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('aCada15min').timeBased().everyMinutes(15).create();
  const msg = sincronizar();
  ui.alert(msg.indexOf('Falha') === 0 ? msg : 'Planilha conectada! ✅\n\n' + msg +
    '\n\nDaqui pra frente é automático: cada alteração vai para o painel em segundos.');
}

function desconectar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  PropertiesService.getDocumentProperties().deleteProperty('bw_chave');
  SpreadsheetApp.getUi().alert('Planilha desconectada. Os dados que já estão no painel continuam lá até você conectar outra planilha.');
}

function apagarExemplos() {
  const ui = SpreadsheetApp.getUi();
  if (ui.alert('Apagar os dados de exemplo?',
      'Isso limpa as linhas das abas Lançamentos e Eventos (os títulos e as fórmulas ficam). Faça isso antes de começar a lançar os seus dados.',
      ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  [ABA_LANC, ABA_EVENTOS].forEach(function (n) {
    const a = SpreadsheetApp.getActive().getSheetByName(n);
    if (a && a.getLastRow() > 1) a.getRange(2, 1, a.getLastRow() - 1, a.getLastColumn()).clearContent();
  });
  const a = SpreadsheetApp.getActive().getSheetByName(ABA_LANC);
  if (a) {   // devolve as fórmulas de Mês e Grupo
    a.getRange('B2:B1000').setFormulaR1C1('=IF(RC[-1]="","",CHOOSE(MONTH(RC[-1]),"Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"))');
    a.getRange('D2:D1000').setFormulaR1C1('=IFERROR(VLOOKUP(RC[-1],Categorias!C1:C2,2,FALSE),"")');
  }
  if (chave_()) sincronizar();
  ui.alert('Pronto! Agora é só lançar os seus dados.');
}

function sincronizarMenu() { SpreadsheetApp.getActive().toast(sincronizar(), 'Brightway', 6); }

function aoAlterar(e) {
  if (e && e.range && e.range.getSheet().getName() === ABA_PLATAFORMA) return;
  PropertiesService.getDocumentProperties().setProperty('pendente', '1');
  sincronizar();
}

/* a cada 15 min: envia o que ficou pendente e traz o que mudou no app */
function aCada15min() {
  if (PropertiesService.getDocumentProperties().getProperty('pendente') === '1') sincronizar();
  else trazerPlataforma_();
}

/* ---------- envio: abas Lançamentos e Eventos → painel ---------- */
function sincronizar() {
  const k = chave_();
  if (!k) return 'Falha: planilha ainda não conectada. Use Brightway › Conectar ao painel…';
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(20000)) return 'Outra sincronização em andamento.';
  try {
    const ss = SpreadsheetApp.getActive();
    const tz = ss.getSpreadsheetTimeZone();
    const lanc = lerAba_(ss, ABA_LANC).map(function (o) {
      const d = dataISO_(o['Data'], tz);
      return {
        data: d, mes: o['Mês'] || (d ? MESES[Number(d.slice(5, 7)) - 1] : ''),
        categoria: texto_(o['Categoria']), grupo: texto_(o['Grupo']), quem: texto_(o['Quem']),
        descricao: texto_(o['Descrição']), valor: numero_(o['Valor'])
      };
    }).filter(function (r) { return r.data || r.valor; });
    const eventos = lerAba_(ss, ABA_EVENTOS).map(function (o) {
      return {
        data_pagamento: dataISO_(o['Data do pagamento'], tz), valor: numero_(o['Valor']),
        cliente: texto_(o['Cliente']), descricao: texto_(o['Descrição (evento ou do que foi)']),
        data_evento: o['Data do evento'] instanceof Date
          ? Utilities.formatDate(o['Data do evento'], tz, 'dd/MM/yyyy') : texto_(o['Data do evento'])
      };
    }).filter(function (r) { return r.data_pagamento || r.valor; });

    const resp = api_('fin_sync', { p_chave: k, p_lanc: lanc, p_eventos: eventos });
    if (resp.getResponseCode() >= 300) return 'Falha ao sincronizar: ' + erro_(resp);
    PropertiesService.getDocumentProperties().setProperty('pendente', '0');
    const p = trazerPlataforma_();
    return 'Sincronizado: ' + lanc.length + ' lançamentos e ' + eventos.length + ' pagamentos de eventos.' + (p ? '\n' + p : '');
  } finally { lock.releaseLock(); }
}

/* ---------- retorno: lançamentos do app → aba "Da plataforma" (só consulta) ---------- */
function trazerPlataforma_() {
  const k = chave_(); if (!k) return '';
  const resp = api_('fin_plataforma', { p_chave: k });
  if (resp.getResponseCode() >= 300) return 'Aba "Da plataforma" não atualizada: ' + erro_(resp);
  const linhas = JSON.parse(resp.getContentText() || '[]');
  const ss = SpreadsheetApp.getActive();
  let a = ss.getSheetByName(ABA_PLATAFORMA);
  if (!a) a = ss.insertSheet(ABA_PLATAFORMA);
  a.clearContents();
  const cab = ['Data', 'Mês', 'Categoria', 'Grupo', 'Quem', 'Descrição', 'Valor'];
  const dados = linhas.map(function (r) {
    const p = String(r.data || '').split('-');
    return [p.length === 3 ? new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])) : '', r.mes, r.categoria, r.grupo, r.quem, r.descricao, Number(r.valor) || 0];
  });
  a.getRange(1, 1, 1, cab.length).setValues([cab]).setFontWeight('bold');
  if (dados.length) {
    a.getRange(2, 1, dados.length, cab.length).setValues(dados);
    a.getRange(2, 1, dados.length, 1).setNumberFormat('dd/mm/yyyy');
    a.getRange(2, 7, dados.length, 1).setNumberFormat('"R$" #,##0.00');
  }
  a.getRange(1, 9).setValue('Só consulta — atualizado sozinho a partir do app em ' +
    Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'dd/MM/yyyy HH:mm') + '. Edite estes lançamentos no app (Fluxo de caixa).');
  return dados.length + ' lançamentos do app na aba "Da plataforma".';
}

/* ---------- ajudantes ---------- */
function api_(fn, corpo) {
  return UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
    method: 'post', contentType: 'application/json',
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
    payload: JSON.stringify(corpo), muteHttpExceptions: true
  });
}
function erro_(resp) {
  const t = resp.getContentText();
  if (/chave invalida/.test(t)) return 'chave inválida. Gere uma chave nova no site e conecte de novo.';
  return '(' + resp.getResponseCode() + ') ' + t.slice(0, 200);
}
function lerAba_(ss, nome) {
  const aba = ss.getSheetByName(nome);
  if (!aba) throw new Error('Aba "' + nome + '" não encontrada.');
  const v = aba.getDataRange().getValues();
  if (v.length < 2) return [];
  const cab = v[0].map(function (h) { return String(h).trim(); });
  return v.slice(1).map(function (linha) {
    const o = {}; cab.forEach(function (h, i) { if (h) o[h] = linha[i]; }); return o;
  });
}
function dataISO_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return m[0];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function numero_(v) {
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  const s = String(v || '').replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s); return isFinite(n) ? n : 0;
}
function texto_(v) { return v == null ? '' : String(v).trim(); }
