/* IA CRIATIVA do editor de fotos (16/11/2026, Claude) — ÚNICO arquivo do editor que fala com a internet.
   Só roda quando a pessoa toca em ✨ CRIAR NOVA VERSÃO e confirma: manda UMA cópia pequena (≤ 504 px) da foto + o pedido
   para a Edge Function bw-ia-imagem (Cloudflare FLUX.2), que devolve uma nova imagem. Nada fica guardado na nuvem
   (não grava em bucket, tabela nem na conta). Regra 24/40 do AGENTS.md. */
(function () {
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia-imagem";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  async function pronta() {
    try { var r = await fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "apikey": PUB }, body: JSON.stringify({ ping: true }) });
      var j = await r.json(); return !!j.pronto; } catch (e) { return false; }
  }
  async function editar(blob, pedido, w, h) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    var fd = new FormData(); fd.append("imagem", blob, "foto.jpg"); fd.append("pedido", pedido); fd.append("w", String(w)); fd.append("h", String(h));
    try {
      var r = await fetch(FN, { method: "POST", headers: { "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: fd });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.imagem) return { erro: j.erro || ("http_" + r.status) };
      var bin = atob(j.imagem), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      var tipo = bin.charCodeAt(0) === 0x89 ? "image/png" : "image/jpeg";
      return { blob: new Blob([a], { type: tipo }) };
    } catch (e) { return { erro: "rede" }; }
  }
  var MSG = { sem_login: "Entre na sua conta para usar a IA criativa.", sem_chave: "A IA criativa ainda está sendo ativada pela Brightway.",
    limite: "Você já criou 10 versões hoje. Amanhã libera de novo.", cota: "A IA criativa atingiu o limite grátis de hoje. Tente amanhã.",
    proibido: "Esse pedido não é permitido nesta ferramenta.", filtro: "A IA recusou esse pedido. Tente escrever de outro jeito.",
    rede: "Sem internet agora.", grande: "A foto ficou grande demais para enviar." };
  window.BWFotosNuvem = { editar: editar, pronta: pronta, msg: function (e) { return MSG[e] || "A IA criativa não respondeu agora (" + e + ")."; } };
})();
