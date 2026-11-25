/* DECUPAGEM COM IA (25/11/2026) — a ÚNICA saída do editor de vídeo para a internet.
   Faz no aparelho uma CÓPIA LEVE do take (MP4 360p, 2 quadros/s, som de 48 kbps — BWProxy.fazer) e manda SÓ ela para a Edge Function
   bw-ia-video, que pergunta ao Gemini (Google) e devolve a decupagem. Só roda depois de a pessoa confirmar (o editor pergunta antes).
   Nada é gravado na conta nem no Storage; o resultado fica no aparelho (o editor guarda em ui_ve_decup). Vigia: só fala com bw-ia-video.
   25/11 (MINHAS IAS): se a pessoa conectou a PRÓPRIA chave do Google em Configurações (guardada só neste aparelho, ui_minhas_ias), ela vai
   no cabeçalho x-bw-gemini deste pedido e a análise não conta no limite diário da plataforma. */
(function () {
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia-video";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var MAX = 18 * 1024 * 1024, MAX_SEG = 40 * 60;
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function minha(s) { try { var m = JSON.parse(localStorage.getItem("ui_minhas_ias") || "null"); return m && s && m.dono === s.user.id && m.gemini && m.gemini.chave && m.gemini.usar !== false ? m.gemini.chave : null; } catch (e) { return null; } }
  async function pronta() {
    try { var r = await fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "apikey": PUB }, body: JSON.stringify({ ping: true }) });
      var j = await r.json(); return !!j.pronta; } catch (e) { return false; }
  }
  /* qualidade da cópia pelo tempo do take: até ~9 min cabe em 360p/220 kbps; mais longo, baixa a imagem para caber em ~16 MB */
  function plano(dur) { var kbps = Math.floor(16e6 * 8 / Math.max(1, dur) / 1000) - 48; kbps = Math.max(40, Math.min(220, kbps)); return { curto: kbps < 120 ? 240 : 360, kbps: kbps, somKbps: 48, qps: 2 }; }
  var MSG = { sem_login: "Entre na sua conta para decupar com IA.", sem_chave: "A decupagem com IA ainda está sendo ativada pela Brightway.",
    limite: "Você chegou ao limite de análises de hoje. Conecte a sua conta (Tutoriais) para continuar.", grande: "O take ficou grande demais para a análise. Corte em partes menores.",
    longo: "Take com mais de 40 minutos: corte em partes antes de decupar.", gemini: "A IA do Google não respondeu agora. Tente de novo em instantes.",
    rede: "Sem internet para falar com a IA.", formato: "Este navegador não fez a cópia leve do take.", proxy: "Não deu para fazer a cópia leve deste take.",
    chave_sua: "O Google recusou a SUA chave. Confira em Configurações → Minhas IAs.", cota_sua: "A sua chave do Google chegou ao limite de hoje." };
  function msg(e) { return MSG[e] || ("Não deu: " + e); }

  /* analisar(blob, {dur, ctx, aoProgredir, cancelar}) → {resumo, trechos, modelo} ou {erro, detalhe} */
  async function analisar(blob, op) {
    op = op || {}; var prog = op.aoProgredir || function () {};
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    if (op.dur && op.dur > MAX_SEG) return { erro: "longo" };
    if (!window.BWProxy || !BWProxy.suporta()) return { erro: "formato" };
    var p = plano(op.dur || 120), copia;
    try { copia = await BWProxy.fazer(blob, { curto: p.curto, kbps: p.kbps, somKbps: p.somKbps, qps: p.qps, velocidade: op.velocidade || 4, cancelar: op.cancelar,
      aoProgredir: function (x) { prog({ etapa: "Preparando a cópia leve", pct: Math.round((x.pct || 0) * 0.8) }); } }); }
    catch (e) { if (/cancelado/.test(String(e && e.message || e))) return { erro: "cancelado" }; return { erro: "proxy", detalhe: String(e && e.message || e) }; }
    if (copia.blob.size > MAX) return { erro: "grande" };
    prog({ etapa: "A IA está assistindo", pct: 85 });
    try {
      var q = "?dur=" + encodeURIComponent(Math.round(op.dur || 0)) + (op.ctx ? "&ctx=" + encodeURIComponent(String(op.ctx).slice(0, 200)) : "");
      var h = { "Authorization": "Bearer " + s.access_token, "apikey": PUB, "Content-Type": "video/mp4" }, g = minha(s);
      if (g) h["x-bw-gemini"] = g;
      var r = await fetch(FN + q, { method: "POST", headers: h, body: copia.blob });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.trechos) return { erro: j.erro || ("http_" + r.status), detalhe: j.detalhe };
      prog({ etapa: "Pronto", pct: 100 });
      return { resumo: j.resumo || "", trechos: j.trechos, modelo: j.modelo || "", sua: !!j.sua, comSom: copia.comSom, bytes: copia.blob.size };
    } catch (e) { return { erro: "rede" }; }
  }
  window.BWDecupar = { pronta: pronta, analisar: analisar, msg: msg, plano: plano };
})();
