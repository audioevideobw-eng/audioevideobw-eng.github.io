/* PRESS KIT — FOTOS NA CONTA (28/11/2026, dono: "o que eu faço de inserção de imagem em um dispositivo não salva na nuvem").
   Antes as fotos ficavam SÓ no aparelho (IndexedDB). Agora cada foto vai para a pasta PRIVADA da pessoa no balde "presskit-fotos"
   (<id da conta>/<id do press kit>/<resumo>.jpg|png — regra do banco: só a própria conta lê e grava a sua pasta) e o press kit (texto,
   na conta) guarda o "mapa" de qual foto vai em qual lugar + os ajustes (enquadrar, luz, efeitos). Outro aparelho logado baixa o que falta.
   Nome do arquivo = resumo SHA-256 do conteúdo: a mesma foto nunca sobe duas vezes. Sem login ou sem o balde: continua só no aparelho. */
(function () {
  "use strict";
  var BALDE = "presskit-fotos", T = {}, OK = {};
  function sb() { return window.BWSync && BWSync.cliente && BWSync.cliente(); }
  async function uidConta() { try { var s = await sb().auth.getSession(); return s && s.data && s.data.session && s.data.session.user.id || ""; } catch (e) { return ""; } }
  async function resumo(u) { var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(u)); return [].map.call(new Uint8Array(b).slice(0, 12), function (x) { return ("0" + x.toString(16)).slice(-2); }).join(""); }
  function blobDe(u) { var m = /^data:([^;]+);base64,(.*)$/.exec(u || ""); if (!m) return null; var bin = atob(m[2]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m[1] }); }
  function urlDe(bl) { return new Promise(function (ok, no) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = no; r.readAsDataURL(bl); }); }
  /* cada lugar de foto do press kit vira uma "vaga" com nome */
  function vagas(im) {
    var v = {}; im = im || {};
    ["logo", "capa", "retrato"].forEach(function (k) { if (im[k]) v[k] = im[k]; });
    (im.fotos || []).forEach(function (u, i) { if (u) v["f" + i] = u; });
    Object.keys(im.cards || {}).forEach(function (l) { (im.cards[l] || []).forEach(function (u, i) { if (u) v["c:" + l + ":" + i] = u; }); });
    Object.keys(im.livres || {}).forEach(function (id) { if (im.livres[id]) v["e:" + id] = im.livres[id]; });
    return v;
  }
  function porVaga(im, k, u) {
    if (k === "logo" || k === "capa" || k === "retrato") im[k] = u;
    else if (/^f\d+$/.test(k)) { im.fotos = im.fotos || []; var i = +k.slice(1); while (im.fotos.length <= i) im.fotos.push(""); im.fotos[i] = u; }
    else if (k.indexOf("c:") === 0) { var p = k.split(":"); im.cards = im.cards || {}; var a = im.cards[p[1]] || (im.cards[p[1]] = []); while (a.length <= +p[2]) a.push(""); a[+p[2]] = u; }
    else if (k.indexOf("e:") === 0) { im.livres = im.livres || {}; im.livres[k.slice(2)] = u; }
  }
  function tiraVaga(im, k) { porVaga(im, k, ""); if (k.indexOf("e:") === 0 && im.livres) delete im.livres[k.slice(2)]; }
  function estado(t) { var e = document.getElementById("pkNuvem"); if (e) e.textContent = t; }

  /* SOBE (depois de cada mudança nas fotos, com espera de 2,5 s) */
  function subir(kitId, im) { clearTimeout(T[kitId]); T[kitId] = setTimeout(function () { subirAgora(kitId, im).catch(function () { estado("☁ fotos só neste aparelho (sem conexão)"); }); }, 2500); }
  async function subirAgora(kitId, im) {
    var c = sb(), uid = c && await uidConta(), pk = window.BWPressKit; if (!uid || !pk) return;
    var kit = pk.acharKit(kitId); if (!kit) return;
    var v = vagas(im), man = { t: im._t || Date.now(), v: {}, enq: im.enq || {} }, n = 0, k;
    estado("☁ guardando as fotos na conta…");
    for (k in v) {
      var h = await resumo(v[k]), ext = /^data:image\/png/.test(v[k]) ? ".png" : ".jpg", nome = h + ext, cam = uid + "/" + kitId + "/" + nome; man.v[k] = nome;
      if (OK[cam]) continue;
      var bl = blobDe(v[k]); if (!bl) continue;
      var up = await c.storage.from(BALDE).upload(cam, bl, { contentType: bl.type, upsert: false });
      if (up.error && !/exist|duplicate|409/i.test(String(up.error.message || up.error.statusCode || ""))) { estado("☁ fotos só neste aparelho (" + (/bucket|not found/i.test(up.error.message || "") ? "pasta da conta ainda não ativada" : "não deu para enviar") + ")"); return; }
      OK[cam] = 1; n++;
    }
    var atual = pk.atual && pk.atual(), alvo = atual && atual.id === kitId ? atual : kit;   /* grava no press kit ABERTO (regra 248) */
    var velho = JSON.stringify(alvo.nuvem && { v: alvo.nuvem.v, enq: alvo.nuvem.enq }), novo = JSON.stringify({ v: man.v, enq: man.enq });
    if (velho !== novo) { alvo.nuvem = man; pk.salvarKit(alvo); }
    estado("☁ fotos guardadas na conta ✓");
    /* tira da pasta o que não é mais usado */
    try { var l = await c.storage.from(BALDE).list(uid + "/" + kitId, { limit: 300 }), usados = {}; Object.keys(man.v).forEach(function (q) { usados[man.v[q]] = 1; });
      var fora = (l.data || []).map(function (x) { return x.name; }).filter(function (x) { return !usados[x]; });
      if (fora.length) await c.storage.from(BALDE).remove(fora.map(function (x) { return uid + "/" + kitId + "/" + x; })); } catch (e) { }
  }

  /* BAIXA (ao abrir um press kit): o que a conta tem e este aparelho não. Devolve as imagens atualizadas ou null se nada mudou. */
  async function baixar(kit, im) {
    var man = kit && kit.nuvem; if (!man || !man.v) return null;
    var c = sb(), uid = c && await uidConta(); if (!uid) return null;
    im = im || { logo: "", capa: "", retrato: "", fotos: [], cards: {} };
    var local = vagas(im), mudou = false, maisNova = (+man.t || 0) > (+im._t || 0), k;
    for (k in man.v) {
      var u = local[k]; if (u && (await resumo(u)) + (/^data:image\/png/.test(u) ? ".png" : ".jpg") === man.v[k]) continue;
      if (u && !maisNova) continue;   /* este aparelho mexeu depois: fica o daqui (e ele sobe) */
      estado("☁ trazendo as fotos da conta…");
      var d = await c.storage.from(BALDE).download(uid + "/" + kit.id + "/" + man.v[k]); if (d.error || !d.data) continue;
      porVaga(im, k, await urlDe(d.data)); OK[uid + "/" + kit.id + "/" + man.v[k]] = 1; mudou = true;
    }
    if (maisNova) { for (k in local) if (!man.v[k]) { tiraVaga(im, k); mudou = true; }
      if (JSON.stringify(man.enq || {}) !== JSON.stringify(im.enq || {})) { im.enq = man.enq || {}; mudou = true; } }
    if (mudou) { im._t = +man.t || Date.now(); estado("☁ fotos da conta ✓"); }
    return mudou ? im : null;
  }
  async function apagarPasta(kitId) {
    try { var c = sb(), uid = c && await uidConta(); if (!uid) return; var l = await c.storage.from(BALDE).list(uid + "/" + kitId, { limit: 300 });
      if (l.data && l.data.length) await c.storage.from(BALDE).remove(l.data.map(function (x) { return uid + "/" + kitId + "/" + x.name; })); } catch (e) { }
  }
  window.BWPkNuvem = { subir: subir, subirAgora: subirAgora, baixar: baixar, apagarPasta: apagarPasta, vagas: vagas };
})();
