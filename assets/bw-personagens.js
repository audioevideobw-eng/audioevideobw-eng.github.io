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
  function descricao(rec) { var f = (rec && rec.ficha) || {}; return [f.aparencia, f.roupa, f.estilo ? "estilo " + f.estilo : ""].map(function (x) { return String(x || "").trim(); }).filter(Boolean).join(", ").slice(0, 300); }
  window.BWPersonagens = {listar: listar, obter: obter, salvar: salvar, excluir: excluir, descricao: descricao};
})();
