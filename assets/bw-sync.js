/* assets/bw-sync.js — Brightway: sincronização SEGURA entre aparelhos.
   Carregar LOGO DEPOIS do supabase-js e ANTES do bundle da página.

   Por que existe (13/11/2026): a sincronia antiga SOBRESCREVIA a nuvem inteira
   a cada salvamento (aparelho desatualizado apagava o que o outro lançou) e, ao
   abrir a página, APAGAVA do aparelho o que ainda não tinha subido. Aqui:

   1. MESCLA por item (id): nada é sobrescrito às cegas.
   2. Cada item editado ganha o carimbo _ed (ms) → a edição MAIS RECENTE vence.
   3. Exclusões viram "lápides" (linha <chave>__del em user_data) → um aparelho
      desatualizado não ressuscita o que foi apagado.
   4. Gravação com trava otimista (atualizado_em): dois aparelhos salvando ao
      mesmo tempo não perdem dados — quem chega depois re-mescla e tenta de novo.
   5. UM cliente Supabase por página (antes eram dezenas → o login "caía").
   6. Status visível no menu: Sincronizado / Salvando / Sem login / Falha.

   Contrato com o bundle: core/store.save chama BWSync.antesDeSalvar e
   core/nuvem delega tudo para cá (mesmas funções e retornos de antes). */
(function () {
  "use strict";
  if (window.BWSync) return;

  var PREFIX = "bw_", VER = 1;
  var META = "bwsync_meta_v1";
  var URL_PADRAO = "https://zdtnetplvdonogmdvarx.supabase.co";
  var ANON_PADRAO = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var TABELA = "user_data";
  var SUF_DEL = "__del";
  var LAPIDE_DIAS = 400;

  /* dados do usuário que acompanham a conta (listas por id, ou valor inteiro) */
  var CHAVES = ["fx_alerts", "fx_diario", "casa_orcamento", "casa_contas", "casa_reserva",
    "neg_fluxo", "casa_fixos", "neg_equipe_colaboradores", "neg_equipe_equipes",
    "neg_equipe_eventos", "neg_equipe_cadastros", "neg_fixos", "neg_eventos",
    "neg_equipe_pagamentos", "neg_clientes", "neg_cli_cadastros", "dd_colecoes",
    "dd_registros", "neg_eventos_checklist_modelos"];

  /* ---------- 1. cliente Supabase único ---------- */
  function unificarCliente() {
    var s = window.supabase;
    if (!s || s.__bwUnico || typeof s.createClient !== "function") return;
    var original = s.createClient, cache = {};
    var novo = {};
    Object.keys(s).forEach(function (k) { try { novo[k] = s[k]; } catch (e) { } });
    novo.createClient = function (url, key, opts) {
      var id = String(url || "").replace(/\/+$/, "") + "|" + key;
      if (!cache[id]) cache[id] = blindar(original.call(s, url, key, opts));
      return cache[id];
    };
    novo.__bwUnico = true;
    try { window.supabase = novo; } catch (e) { }
  }
  /* BLINDAGEM: código antigo (de qualquer versão gerada das páginas) que ainda
     faça upsert da lista inteira em user_data é desviado para a mescla segura.
     Assim nenhuma regeração do bundle volta a apagar dados de outro aparelho. */
  function blindar(cli) {
    try {
      var fromOriginal = cli.from.bind(cli);
      cli.from = function (tabela) {
        var b = fromOriginal(tabela);
        if (tabela !== TABELA || !b || typeof b.upsert !== "function") return b;
        var upOriginal = b.upsert.bind(b);
        b.upsert = function (payload, opts) {
          var ch = payload && !Array.isArray(payload) && payload.chave;
          if (ch && CHAVES.indexOf(ch) >= 0) {
            var p = sincronizar([ch]).then(function (r) {
              return { data: null, error: r && r.ok === false && !r.semSessao ? { message: r.msg } : null };
            });
            return { then: function (a, b2) { return p.then(a, b2); }, catch: function (f) { return p.catch(f); } };
          }
          return upOriginal(payload, opts);
        };
        return b;
      };
    } catch (e) { }
    return cli;
  }
  unificarCliente();

  function ler(k, padrao) {
    try { var r = localStorage.getItem(k); return r == null ? padrao : JSON.parse(r); }
    catch (e) { return padrao; }
  }
  var interno = false;
  function gravar(k, v) {
    interno = true;
    try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
    finally { interno = false; }
  }
  function credenciais() {
    var anon = ler(PREFIX + "fx_supabase_anon_v1", "") || "";
    if (/^sb_secret_|^sbp_/.test(anon)) anon = "";
    return { url: ler(PREFIX + "fx_supabase_url_v1", "") || URL_PADRAO, anon: anon || ANON_PADRAO };
  }
  function cliente() {
    unificarCliente();
    if (!window.supabase || !window.supabase.createClient) return null;
    var c = credenciais();
    return window.supabase.createClient(c.url, c.anon, { auth: { persistSession: true, autoRefreshToken: true } });
  }

  /* ---------- 2. metadados locais (sujos, lápides, carimbos) ---------- */
  function meta() {
    var m = ler(META, null) || {};
    m.dirty = m.dirty || {}; m.tombs = m.tombs || {}; m.vts = m.vts || {};
    return m;
  }
  function salvarMeta(m) { gravar(META, m); }

  var ultimoCarimbo = 0;
  function agora() {               // estritamente crescente dentro da aba
    var t = Date.now();
    if (t <= ultimoCarimbo) t = ultimoCarimbo + 1;
    ultimoCarimbo = t;
    return t;
  }
  function novoId() {
    return "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function semEd(o) {
    var c = {};
    Object.keys(o).forEach(function (k) { if (k !== "_ed") c[k] = o[k]; });
    return JSON.stringify(c);
  }
  function ehLista(v) {
    return Array.isArray(v) && v.every(function (o) { return o && typeof o === "object" && !Array.isArray(o); });
  }
  function hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }
  /* itens antigos sem id ganham um id determinístico (igual em todos os aparelhos) */
  function garantirIds(lista) {
    var vistos = {}, mudou = false;
    lista.forEach(function (o) {
      if (o.id === undefined || o.id === null || o.id === "") {
        var base = "h" + hash(semEd(o));
        vistos[base] = (vistos[base] || 0) + 1;
        o.id = vistos[base] > 1 ? base + "_" + vistos[base] : base;
        mudou = true;
      }
    });
    return mudou;
  }

  /* ---------- 3. gancho do core/store.save ---------- */
  function antesDeSalvar(key, versao, valor) {
    /* tolera a chamada antiga/errada antesDeSalvar(key, valor) */
    if (arguments.length === 2) { valor = versao; versao = VER; }
    if (Number(versao) !== VER || CHAVES.indexOf(key) < 0) return valor;
    try {
      var antes = ler(PREFIX + key + "_v" + VER, null);
      var m = meta(), t = agora();
      if (ehLista(valor)) {
        var antesMapa = {};
        if (Array.isArray(antes)) antes.forEach(function (o) {
          if (o && typeof o === "object" && o.id != null) antesMapa[String(o.id)] = semEd(o);
        });
        var lap = m.tombs[key] = m.tombs[key] || {};
        var agoraIds = {};
        valor.forEach(function (o) {
          if (o.id === undefined || o.id === null || o.id === "") o.id = novoId();
          var id = String(o.id);
          agoraIds[id] = 1;
          if (antesMapa[id] !== semEd(o)) {
            o._ed = Math.max(t, (o._ed || 0) + 1);
            delete lap[id];                         // recriado/editado depois de apagado
          }
        });
        Object.keys(antesMapa).forEach(function (id) { if (!agoraIds[id]) lap[id] = t; });
      } else if (JSON.stringify(antes) !== JSON.stringify(valor)) {
        m.vts[key] = t;
      }
      m.dirty[key] = 1;
      salvarMeta(m);
      agendarEnvio();
    } catch (e) { console.warn("BWSync: gancho falhou", e); }
    return valor;
  }

  /* rede de segurança: TODA gravação de uma chave sincronizada passa por aqui,
     chame o bundle o antesDeSalvar ou não (idempotente se chamar). */
  try {
    var setOriginal = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (!interno && this === window.localStorage) {
        var m = /^bw_(.+)_v1$/.exec(k);
        if (m && CHAVES.indexOf(m[1]) >= 0) {
          try { v = JSON.stringify(antesDeSalvar(m[1], VER, JSON.parse(v))); } catch (e) { }
        }
      }
      return setOriginal.call(this, k, v);
    };
  } catch (e) { }

  /* ---------- 4. mescla ---------- */
  var CHAVE_NATURAL = { neg_clientes: ["nome", "cnpj"], neg_equipe_colaboradores: ["nome", "tel"] };
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/\s+/g, " ").replace(/[^\w\s@.\/-]/g, "").trim().toLowerCase();
  }
  function colapsarDuplicados(key, lista, lap) {
    var campos = CHAVE_NATURAL[key];
    if (!campos) return lista;
    var porChave = {}, ordem = [];
    lista.forEach(function (o) {
      var doc = norm(o[campos[1]]).replace(/\D/g, "");
      var k = (!norm(o[campos[0]]) || !doc) ? "__id_" + o.id : norm(o[campos[0]]) + "|" + doc;
      if (!porChave[k]) { porChave[k] = o; ordem.push(k); return; }
      /* duplicado: fica o de MENOR id (igual em todos os aparelhos), completa campos */
      var a = porChave[k], b = o;
      if (String(b.id) < String(a.id)) { var x = a; a = b; b = x; }
      var junto = Object.assign({}, a);
      Object.keys(b).forEach(function (c) { if ((junto[c] === "" || junto[c] == null) && b[c]) junto[c] = b[c]; });
      junto._ed = Math.max(a._ed || 0, b._ed || 0);
      if (lap) lap[String(b.id)] = Math.max(lap[String(b.id)] || 0, b._ed || 0);
      porChave[k] = junto;
    });
    return ordem.map(function (k) { return porChave[k]; });
  }
  function canon(lista) {
    if (!Array.isArray(lista)) return JSON.stringify(lista);
    return JSON.stringify(lista.map(function (o) { return [String(o.id), JSON.stringify(o)]; })
      .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; }));
  }
  function juntarLapides(a, b) {
    var r = {}, lim = Date.now() - LAPIDE_DIAS * 864e5;
    [a || {}, b || {}].forEach(function (t) {
      Object.keys(t).forEach(function (id) { if (t[id] > lim) r[id] = Math.max(r[id] || 0, t[id]); });
    });
    return r;
  }
  function canonLap(t) {
    return JSON.stringify(Object.keys(t || {}).sort().map(function (k) { return [k, t[k]]; }));
  }

  function mesclarLista(key, local, remota, lapides) {
    /* cópias: as listas originais ficam intactas para comparar depois */
    local = Array.isArray(local) ? JSON.parse(JSON.stringify(local)).filter(function (o) { return o && typeof o === "object"; }) : [];
    remota = Array.isArray(remota) ? JSON.parse(JSON.stringify(remota)).filter(function (o) { return o && typeof o === "object"; }) : [];
    garantirIds(local); garantirIds(remota);
    var mapa = {}, ordem = [];
    local.forEach(function (o) { var id = String(o.id); if (!mapa[id]) ordem.push(id); mapa[id] = o; });
    remota.forEach(function (r) {
      var id = String(r.id), l = mapa[id];
      if (!l) { mapa[id] = r; ordem.push(id); return; }
      /* última edição vence; empate (dados antigos sem carimbo) → nuvem */
      if ((r._ed || 0) >= (l._ed || 0)) mapa[id] = r;
    });
    var out = ordem.map(function (id) { return mapa[id]; }).filter(function (o) {
      var t = lapides[String(o.id)];
      return !(t && t >= (o._ed || 0));
    });
    return colapsarDuplicados(key, out, lapides);
  }

  /* ---------- 5. leitura/gravação na nuvem ---------- */
  async function sessaoOk(c) { return !!(await sessaoUid(c)); }
  async function sessaoUid(c) {
    try { var r = await c.auth.getSession(); return (r && r.data && r.data.session && r.data.session.user.id) || null; }
    catch (e) { return null; }
  }

  /* ---------- 5b. dados do aparelho pertencem a UMA conta ----------
     (13/11/2026) O localStorage é do navegador, não do usuário: sem isto, quem
     entrasse com outra conta no mesmo aparelho via (e SUBIA para a própria conta)
     os dados de quem usou antes. Agora cada conta tem o seu "cofre" local:
     ao trocar de conta (ou sair), os dados da conta anterior são guardados à parte
     e a tela fica só com os dados de quem está logado. */
  var DONO = "bwsync_dono_v1", COFRE = "bwsync_conta_";
  var SISTEMA = /^bw_fx_(session|supabase_url|supabase_anon)_v\d+$/;
  function chavesDaConta() {
    var ks = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && ((k.indexOf("bw_") === 0 && !SISTEMA.test(k)) || k === META)) ks.push(k);
    }
    return ks;
  }
  function guardarConta(uid) {
    var pacote = {};
    chavesDaConta().forEach(function (k) { pacote[k] = localStorage.getItem(k); localStorage.removeItem(k); });
    if (uid && Object.keys(pacote).length) {
      try { localStorage.setItem(COFRE + uid, JSON.stringify(pacote)); } catch (e) { }
    }
  }
  function restaurarConta(uid) {
    var pacote = null;
    try { pacote = JSON.parse(localStorage.getItem(COFRE + uid) || "null"); } catch (e) { }
    if (!pacote) return 0;
    interno = true;
    try { Object.keys(pacote).forEach(function (k) { localStorage.setItem(k, pacote[k]); }); }
    finally { interno = false; }
    localStorage.removeItem(COFRE + uid);
    return Object.keys(pacote).length;
  }
  /* devolve true se trocou o conteúdo local (a página precisa recarregar) */
  function garantirDono(uid) {
    var atual = localStorage.getItem(DONO);
    if (atual === uid) return false;
    if (!atual) { localStorage.setItem(DONO, uid); return false; }   // 1ª vez: dados locais são desta conta
    guardarConta(atual);
    restaurarConta(uid);
    localStorage.setItem(DONO, uid);
    return true;
  }
  function aoSair() {
    var atual = localStorage.getItem(DONO);
    if (!atual) return;
    guardarConta(atual);
    localStorage.removeItem(DONO);
  }
  async function lerLinhas(c, chaves) {
    var r = await c.from(TABELA).select("chave, dados, atualizado_em").in("chave", chaves);
    if (r.error) throw r.error;
    var mapa = {};
    (r.data || []).forEach(function (l) { mapa[l.chave] = l; });
    return mapa;
  }
  /* retorna "ok" | "conflito" — trava otimista pelo atualizado_em lido */
  async function gravarLinha(c, chave, dados, linhaLida) {
    var ts = new Date().toISOString(), r;
    if (linhaLida) {
      var q = c.from(TABELA).update({ dados: dados, atualizado_em: ts }).eq("chave", chave);
      q = linhaLida.atualizado_em == null ? q.is("atualizado_em", null) : q.eq("atualizado_em", linhaLida.atualizado_em);
      r = await q.select("chave");
      if (r.error) throw r.error;
      return (r.data && r.data.length) ? "ok" : "conflito";
    }
    r = await c.from(TABELA).insert({ chave: chave, dados: dados, atualizado_em: ts });
    if (r.error) {
      if (r.error.code === "23505" || /duplicate|unique/i.test(r.error.message || "")) return "conflito";
      throw r.error;
    }
    return "ok";
  }

  /* ---------- 6. sincronizar (fila: uma operação por vez por aba) ---------- */
  var fila = Promise.resolve();
  function enfileirar(fn) {
    var p = fila.then(fn, fn);
    fila = p.catch(function () { });
    return p;
  }

  function sincronizar(chaves) {
    return enfileirar(function () { return sincronizarAgora(chaves || CHAVES); });
  }

  async function sincronizarAgora(chaves) {
    var c = cliente();
    if (!c) { status("offline"); return { ok: false, msg: "Sem conexão com o servidor.", totalMudou: 0 }; }
    var uid = await sessaoUid(c);
    if (!uid) {
      status("semlogin");
      return { ok: false, semSessao: true, msg: "Entre com sua conta para sincronizar.", totalMudou: 0 };
    }
    var trocouConta = garantirDono(uid);
    if (trocouConta) chaves = CHAVES;
    status("salvando");
    var pendentes = chaves.slice(), mudouLocal = {}, trazidos = 0, enviados = 0;
    if (trocouConta) mudouLocal.__conta = 1;
    try {
      for (var tentativa = 0; tentativa < 5 && pendentes.length; tentativa++) {
        var nomes = [];
        pendentes.forEach(function (k) { nomes.push(k, k + SUF_DEL); });
        var linhas = await lerLinhas(c, nomes);
        var m = meta(), conflitos = [];
        for (var i = 0; i < pendentes.length; i++) {
          var k = pendentes[i];
          var lk = PREFIX + k + "_v" + VER;
          var local = ler(lk, null);
          var lin = linhas[k], linDel = linhas[k + SUF_DEL];
          var remota = lin ? lin.dados : null;
          var gravarNuvem = false, gravarLap = false, novo, lap = null;

          if (ehLista(local) || ehLista(remota) || (local == null && remota == null)) {
            if (local == null && remota == null) continue;
            var lapRem = (linDel && linDel.dados && typeof linDel.dados === "object" && !Array.isArray(linDel.dados)) ? linDel.dados : {};
            lap = juntarLapides(m.tombs[k], lapRem);
            novo = mesclarLista(k, ehLista(local) ? local : [], ehLista(remota) ? remota : [], lap);
            var cn = canon(novo);
            if (local == null ? novo.length > 0 : cn !== canon(local)) {
              gravar(lk, novo); mudouLocal[k] = 1;
              trazidos += Math.max(0, novo.length - (Array.isArray(local) ? local.length : 0));
            }
            gravarNuvem = !lin ? novo.length > 0 : cn !== canon(remota);
            gravarLap = canonLap(lap) !== canonLap(lapRem) && Object.keys(lap).length > 0;
            m.tombs[k] = lap;
          } else {
            /* valor inteiro (objeto/texto): o mais recente vence */
            var tsLocal = m.vts[k] || 0;
            var tsRem = lin && lin.atualizado_em ? Date.parse(lin.atualizado_em) : 0;
            if (lin && tsRem >= tsLocal) {
              novo = remota;
              if (JSON.stringify(local) !== JSON.stringify(remota)) { gravar(lk, remota); mudouLocal[k] = 1; }
            } else {
              novo = local;
              gravarNuvem = local != null && JSON.stringify(local) !== JSON.stringify(remota);
            }
          }

          if (gravarNuvem) {
            var r1 = await gravarLinha(c, k, novo, lin);
            if (r1 === "conflito") { conflitos.push(k); continue; }
            enviados++;
          }
          if (gravarLap) {
            var r2 = await gravarLinha(c, k + SUF_DEL, lap, linDel);
            if (r2 === "conflito") { conflitos.push(k); continue; }
          }
          delete m.dirty[k];
        }
        salvarMeta(m);
        pendentes = conflitos;
      }
      if (pendentes.length) throw new Error("conflito persistente em " + pendentes.join(", "));
      registrarPosse(c, uid);
      var n = Object.keys(mudouLocal).length;
      status("ok");
      if (n) window.dispatchEvent(new CustomEvent("bw-sync-recebido", { detail: { chaves: Object.keys(mudouLocal) } }));
      return {
        ok: true, totalMudou: n, novos: trazidos, subidos: enviados, registros: n,
        chaves: Object.keys(mudouLocal),
        msg: "✓ Sincronizado" + (trazidos ? " · " + trazidos + " novo(s) de outro aparelho" : "") +
          (enviados ? " · " + enviados + " lista(s) enviada(s)" : "") +
          (!trazidos && !enviados ? " — tudo atualizado" : "")
      };
    } catch (e) {
      console.warn("BWSync: falha", e);
      status("falha");
      agendarRetentativa();
      return { ok: false, totalMudou: Object.keys(mudouLocal).length, msg: "⚠ Falha ao sincronizar: " + (e.message || e) };
    }
  }

  /* ---------- 6b. posse no servidor (isolamento entre usuários) ----------
     Registra no Supabase (função bw_registrar) os eventos e os links de cadastro
     desta conta. É isso que faz cadastros, presenças e arquivos de cada evento
     ficarem visíveis SÓ para o dono. Ver docs/sql/2026-11-13-isolamento-usuarios.sql */
  function registrarPosse(c, uid) {
    try {
      var ids = [];
      ["neg_eventos", "neg_equipe_eventos"].forEach(function (k) {
        var l = ler(PREFIX + k + "_v1", []);
        if (Array.isArray(l)) l.forEach(function (e) { if (e && e.id != null && e.id !== "") ids.push(String(e.id)); });
      });
      var toks = ["neg_equipe_token", "neg_cli_token"].map(function (k) { return ler(PREFIX + k + "_v1", ""); })
        .filter(function (t) { return typeof t === "string" && t.length >= 6; });
      ids = ids.filter(function (x, i) { return ids.indexOf(x) === i; }).sort();
      if (!ids.length && !toks.length) return;
      var assinatura = uid + "|" + ids.join(",") + "|" + toks.join(",");
      var reg = ler("bwsync_registro_v1", {}) || {};
      if (reg[uid] === hash(assinatura)) return;
      c.rpc("bw_registrar", { p_eventos: ids, p_tokens: toks }).then(function (r) {
        if (r && !r.error) { reg[uid] = hash(assinatura); gravar("bwsync_registro_v1", reg); }
      }, function () { });
    } catch (e) { }
  }

  /* ---------- 7. agendamento ---------- */
  var tEnvio = null, tRetry = null;
  function sujas() { return Object.keys(meta().dirty); }
  function agendarEnvio() {
    status("pendente");
    clearTimeout(tEnvio);
    tEnvio = setTimeout(function () { var s = sujas(); if (s.length) sincronizar(s); }, 700);
  }
  function agendarRetentativa() {
    clearTimeout(tRetry);
    tRetry = setTimeout(function () { var s = sujas(); if (s.length) sincronizar(s); }, 20000);
  }
  function digitando() {
    var a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) ||
      !!document.querySelector("dialog[open]");
  }
  var ultimaPuxada = Date.now();
  function puxarAoVoltar() {
    if (Date.now() - ultimaPuxada < 15000) return;
    ultimaPuxada = Date.now();
    sincronizar(CHAVES).then(function (r) {
      if (r && r.ok && r.totalMudou > 0) {
        if (!digitando()) location.reload();
        else status("novos");
      }
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      var s = sujas(); if (s.length) { clearTimeout(tEnvio); sincronizar(s); }
    } else puxarAoVoltar();
  });
  window.addEventListener("online", function () { sincronizar(CHAVES); });
  window.addEventListener("pagehide", function () { var s = sujas(); if (s.length) sincronizar(s); });

  /* ---------- 8. status visível ---------- */
  var TEXTOS = {
    ok: function () { return "Sincronizado " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); },
    pendente: function () { return "Salvando…"; },
    salvando: function () { return "Sincronizando…"; },
    semlogin: function () { return "Sem login · só neste aparelho"; },
    offline: function () { return "Sem conexão · salvo neste aparelho"; },
    falha: function () { return "Falha · tentando de novo"; },
    novos: function () { return "Dados novos · toque para atualizar"; }
  };
  var estado = "";
  function status(s) {
    estado = s;
    var el = document.querySelector("#menuSync");
    if (el && TEXTOS[s]) { el.textContent = TEXTOS[s](); el.title = el.textContent; el.setAttribute("data-bwsync", s); }
    if (s === "semlogin") avisoSemLogin();
  }
  function avisoSemLogin() {
    try {
      if (sessionStorage.getItem("bwsync_aviso")) return;
      var p = (location.pathname.split("/").pop() || "");
      if (/^(login|cadastro)\.html$/.test(p)) return;
      var temDados = CHAVES.some(function (k) { var v = ler(PREFIX + k + "_v1", null); return Array.isArray(v) ? v.length : !!v; });
      if (!temDados) return;
      sessionStorage.setItem("bwsync_aviso", "1");
      var d = document.createElement("div");
      d.setAttribute("role", "status");
      d.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;" +
        "background:#1a1d24;color:#f2f2f2;border:1px solid #c9a646;border-radius:10px;padding:10px 14px;" +
        "font:13px/1.4 Inter,system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4);max-width:92vw";
      d.innerHTML = 'Você não está conectado: o que salvar aqui fica <b>só neste aparelho</b>. ' +
        '<a href="login.html" style="color:#e6c56a;font-weight:600">Entrar</a> ' +
        '<button type="button" aria-label="Fechar" style="background:none;border:0;color:#aaa;font-size:16px;cursor:pointer;margin-left:6px">×</button>';
      d.querySelector("button").onclick = function () { d.remove(); };
      (document.body || document.documentElement).appendChild(d);
      setTimeout(function () { if (d.parentNode) d.remove(); }, 12000);
    } catch (e) { }
  }
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest && e.target.closest("#menuSync");
    if (el && estado === "novos") { e.preventDefault(); e.stopImmediatePropagation(); location.reload(); }
  }, true);
  setInterval(function () { if (estado && document.querySelector("#menuSync")) status(estado); }, 30000);

  /* saiu da conta (botão sair ou sessão revogada) → guarda os dados dessa conta */
  try {
    var cl = cliente();
    if (cl && cl.auth && cl.auth.onAuthStateChange) cl.auth.onAuthStateChange(function (ev) {
      if (ev === "SIGNED_OUT") aoSair();
    });
  } catch (e) { }

  /* service worker antigo servia leituras do Supabase do cache: força atualizar */
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations)
      navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.update(); }); });
  } catch (e) { }

  /* ---------- 9. API (mesmas assinaturas do core/nuvem antigo) ---------- */
  async function disponivel() { var c = cliente(); return !!(c && await sessaoOk(c)); }
  function subir(chave) { return sincronizar([chave]); }

  window.BWSync = {
    CHAVES: CHAVES,
    antesDeSalvar: antesDeSalvar,
    cliente: cliente,
    disponivel: disponivel,
    sincronizar: sincronizar,
    subir: subir,
    /* nomes antigos: TODOS agora mesclam (nenhum sobrescreve) */
    enviarTudo: function () { return sincronizar(CHAVES); },
    receberTudo: function () { return sincronizar(CHAVES); },
    sincronizarTudo: function () { return sincronizar(CHAVES); },
    baixar: function () { return sincronizar(CHAVES); },
    _mesclarLista: mesclarLista,
    _estado: function () { return { estado: estado, sujas: sujas(), meta: meta() }; }
  };
})();
