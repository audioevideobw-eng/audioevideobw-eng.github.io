/* BIBLIOTECA DE PERSONAGENS (18/11/2026, Claude) — a mesma em todas as ferramentas que pedem um personagem
   (ÁREA DE PERSONAGENS, BW Reels Pro, Quadro de História). Mora só no aparelho: IndexedDB bw_reels, loja "personagens".
   Registro: {id, nome, tipo: "foto" (tem imagem) | "ficha" (só a descrição) | "montado" (boneco do Reels), blob?, look?, ficha?, criado}
   ficha: {papel, aparencia, roupa, personalidade, estilo, prompt}. Este arquivo NÃO fala com a internet. */
(function () {
  var DB = null;
  function abrir() {
    return new Promise(function (ok, erro) {
      if (DB) return ok(DB);
      var r = indexedDB.open("bw_reels", 2);
      r.onupgradeneeded = function () {
        var d = r.result;
        if (!d.objectStoreNames.contains("projetos")) d.createObjectStore("projetos", {keyPath: "id"});
        if (!d.objectStoreNames.contains("midias")) d.createObjectStore("midias", {keyPath: "id"}).createIndex("projeto", "projeto");
        if (!d.objectStoreNames.contains("personagens")) d.createObjectStore("personagens", {keyPath: "id"});
      };
      r.onsuccess = function () { DB = r.result; ok(DB); };
      r.onerror = function () { erro(r.error); };
    });
  }
  function op(modo, fn) { return abrir().then(function (d) { return new Promise(function (ok, erro) { var t = d.transaction("personagens", modo), q = fn(t.objectStore("personagens")); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { erro(t.error); }; }); }); }
  function listar() { return op("readonly", function (s) { return s.getAll(); }).then(function (l) { return (l || []).sort(function (a, b) { return (b.criado || 0) - (a.criado || 0); }); }).catch(function () { return []; }); }
  function obter(id) { return op("readonly", function (s) { return s.get(id); }).catch(function () { return null; }); }
  function salvar(rec) { if (!rec.id) rec.id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); if (!rec.criado) rec.criado = Date.now(); return op("readwrite", function (s) { return s.put(rec); }).then(function () { return rec; }); }
  function excluir(id) { return op("readwrite", function (s) { return s.delete(id); }); }
  /* descrição curta para as ferramentas (Quadro: "Como ele é") */
  function variacao(rec, vid) { return vid && rec && (rec.variacoes || []).filter(function (v) { return v.id === vid; })[0] || null; }
  function descricao(rec, vid) { var f = (rec && rec.ficha) || {}, v = variacao(rec, vid); return [f.aparencia, v ? v.descricao : f.roupa, f.estilo ? "estilo " + f.estilo : ""].map(function (x) { return String(x || "").trim(); }).filter(Boolean).join(", ").slice(0, 300); }
  /* FOTOS DE REFERÊNCIA em vários planos (18/11): a IA acerta mais quando recebe o plano parecido com a cena */
  var PLANOS = [["frente", "FRENTE", "corpo inteiro, de frente"], ["americano", "PLANO AMERICANO", "do joelho para cima"], ["rosto", "ROSTO", "detalhe do rosto"], ["perfil", "PERFIL", "de lado"], ["costas", "COSTAS", "de costas"], ["cima", "DE CIMA", "visto de cima"], ["acao", "AÇÃO", "pose em movimento"]];
  function planoPara(texto) {
    var t = " " + String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") + " ";
    if (/ de costas| costas | por tras| indo embora| se afasta/.test(t)) return "costas";
    if (/ de cima| vista aerea| do alto| drone/.test(t)) return "cima";
    if (/ rosto| close| de perto| detalhe do rosto| olhar| olhos| sorri| expressao| chora| emocionad/.test(t)) return "rosto";
    if (/ de perfil| de lado| lateral/.test(t)) return "perfil";
    if (/ corre| pula| salta| chuta| danca| luta| em acao| em movimento| comemora| voa| nada /.test(t)) return "acao";
    if (/ plano americano| meio corpo| da cintura| do joelho| sentad| na mesa| conversa/.test(t)) return "americano";
    return "frente";
  }
  /* imagem que mais ajuda a IA naquela cena: a da variação de roupa (se houver), senão o plano parecido, senão a de frente */
  function imagemPara(rec, texto, vid) {
    if (!rec) return null; var pl = rec.planos || {}, k = planoPara(texto), v = variacao(rec, vid);
    if (v && v.blob && (k === "frente" || k === "americano" || !pl[k])) return {blob: v.blob, plano: "variação " + (v.nome || "")};
    if (pl[k]) return {blob: pl[k], plano: k};
    var b = pl.frente || rec.blob || pl.americano || pl.rosto || pl.perfil || pl.costas || pl.cima || pl.acao; return b ? {blob: b, plano: pl.frente || rec.blob ? "frente" : "outro"} : null;
  }
  function principal(rec) { var pl = rec.planos || {}; return pl.frente || pl.americano || pl.perfil || pl.rosto || pl.costas || pl.cima || pl.acao || null; }
  window.BWPersonagens = {listar: listar, obter: obter, salvar: salvar, excluir: excluir, descricao: descricao, PLANOS: PLANOS, planoPara: planoPara, imagemPara: imagemPara, variacao: variacao, principal: principal};
})();
