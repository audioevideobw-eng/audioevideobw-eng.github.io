/* IA CRIATIVA do editor de fotos e do CRIADOR IA (16/11/2026, Claude) — ÚNICO arquivo dessas ferramentas que fala com a internet.
   Só roda quando a pessoa toca em ✨ CRIAR NOVA VERSÃO e confirma: manda UMA cópia pequena (≤ 504 px) da foto + o pedido
   para a Edge Function bw-ia-imagem (Cloudflare FLUX.2), que devolve uma nova imagem. Nada fica guardado na nuvem
   (não grava em bucket, tabela nem na conta). Regra 24/40 do AGENTS.md.
   25/11 (MINHAS IAS): se a pessoa conectou a PRÓPRIA conta da Cloudflare em Configurações, a chave (guardada só neste aparelho,
   ui_minhas_ias, ligada à conta que salvou) vai nos cabeçalhos deste pedido e a imagem não conta no limite diário da plataforma. */
(function () {
  var FN = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia-imagem";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  function minha(s) { try { var m = JSON.parse(localStorage.getItem("ui_minhas_ias") || "null"); return m && s && m.dono === s.user.id && m.cf && m.cf.conta && m.cf.token && m.cf.usar !== false ? m.cf : null; } catch (e) { return null; } }
  async function pronta() {
    try { var r = await fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "apikey": PUB }, body: JSON.stringify({ ping: true }) });
      var j = await r.json(); return !!j.pronto; } catch (e) { return false; }
  }
  /* extra (CRIADOR IA): { modo: "arte", espaco: "baixo"|"topo"|…, seed } — na arte a foto é opcional (blob = null) */
  async function editar(blob, pedido, w, h, extra) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    var fd = new FormData(); if (blob) fd.append("imagem", blob, "foto.jpg"); fd.append("pedido", pedido); fd.append("w", String(w)); fd.append("h", String(h));
    extra = extra || {}; if (extra.modo) fd.append("modo", extra.modo); if (extra.espaco) fd.append("espaco", extra.espaco); if (extra.seed) fd.append("seed", String(extra.seed));
    if (extra.blob2) fd.append("imagem2", extra.blob2, "referencia.jpg");   /* 17/11: referência de lugar/objeto/estilo (QUADRO DE HISTÓRIA) */
    try {
      var h = { "Authorization": "Bearer " + s.access_token, "apikey": PUB }, cf = minha(s);
      if (cf) { h["x-bw-cf-conta"] = cf.conta; h["x-bw-cf-token"] = cf.token; }
      var r = await fetch(FN, { method: "POST", headers: h, body: fd });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.imagem) return { erro: j.erro || ("http_" + r.status) };
      var bin = atob(j.imagem), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      var tipo = bin.charCodeAt(0) === 0x89 ? "image/png" : "image/jpeg";
      return { blob: new Blob([a], { type: tipo }), sua: !!j.sua };
    } catch (e) { return { erro: "rede" }; }
  }
  var MSG = { sem_login: "Entre na sua conta para usar a IA criativa.", sem_chave: "A IA criativa ainda está sendo ativada pela Brightway.",
    limite: "Você já usou as 15 imagens de IA de hoje. Conecte a sua conta (Tutoriais) para continuar.", cota: "A IA criativa atingiu o limite grátis de hoje. Tente amanhã.",
    proibido: "Esse pedido não é permitido nesta ferramenta.", filtro: "A IA recusou esse pedido. Tente escrever de outro jeito.",
    rede: "Sem internet agora.", grande: "A foto ficou grande demais para enviar.",
    chave_sua: "A Cloudflare recusou a SUA chave. Confira em Configurações → Minhas IAs.", cota_sua: "A sua conta da Cloudflare chegou ao limite de hoje." };
  function arte(blob, pedido, w, h, espaco, seed, blob2) { return editar(blob, pedido, w, h, { modo: "arte", espaco: espaco, seed: seed, blob2: blob2 || null }); }
  window.BWFotosNuvem = { editar: editar, arte: arte, pronta: pronta, comMinha: async function () { return !!minha(await sessao()); }, msg: function (e) { return MSG[e] || "A IA criativa não respondeu agora (" + e + ")."; } };
})();
