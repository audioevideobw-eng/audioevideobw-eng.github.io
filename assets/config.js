/* CONFIGURAÇÕES (20/11/2026, Claude — pedido do dono): os dados de quem usa + os MODOS de aparência (assets/modos.js) + criar um modo com as
   cores da marca (lidas de uma imagem NO APARELHO — a imagem não é enviada a lugar nenhum). Só grava preferências locais (ui_*). */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); }, M = window.BWModos;
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  function ui(k, p) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } }
  function aviso(el, t) { el.hidden = !t; el.textContent = t || ""; }

  /* ---------- meus dados ---------- */
  $("cfgChamo").value = ui("ui_agente_nome", "");
  $("cfgChamo").addEventListener("input", function () { try { localStorage.setItem("ui_agente_nome", JSON.stringify(this.value.trim())); } catch (e) { } nomeNaTela(); });
  var conta = null;
  function nomeNaTela() { var n = $("cfgChamo").value.trim() || (conta && ((conta.user_metadata || {}).full_name || (conta.email || "").split("@")[0])) || "Visitante";
    $("cfgNome").textContent = n; $("cfgFoto").textContent = (n[0] || "B").toUpperCase(); }
  (async function () { try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; conta = s && s.data && s.data.session && s.data.session.user; } catch (e) { }
    if (conta) { var por = ((conta.app_metadata || {}).providers || [(conta.app_metadata || {}).provider || "e-mail"]).join(" + ").replace("email", "e-mail"), d = conta.created_at ? new Date(conta.created_at).toLocaleDateString("pt-BR") : "";
      $("cfgEmail").textContent = conta.email + " · entra com " + por + (d ? " · conta criada em " + d : ""); $("cfgConta").textContent = "MINHA CONTA (SENHA E SAIR)"; $("cfgConta").classList.remove("pri"); }
    nomeNaTela();
    var el = $("userBox"); if (el) el.innerHTML = conta ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(conta.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  nomeNaTela();
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { if (history.length > 1) history.back(); else location.href = "./"; };

  /* ---------- modos ---------- */
  function mini(m) { var p = M.paleta(m);
    return '<span class="cfg-mini" style="--p-fundo:' + p.fundo + ';--p-cartao:' + p.cartao + ';--p-linha:' + p.linha + ';--p-texto:' + p.texto + ';--p-dest:' + p.dest + ';--p-dest2:' + p.dest2 + ';--p-menu:' + p.menu + ';--p-menu-txt:' + p.menuTxt + '">' +
      '<span class="m"><i class="a"></i><i></i><i></i><i></i></span><span class="c"><span class="t"></span><span class="k"><i></i><i></i><i></i></span><span class="b"></span></span></span>'; }
  function desenhar() {
    var atual = M.atual(), grupos = {}, ordem = [];
    M.lista().forEach(function (m) { if (!grupos[m.grupo]) { grupos[m.grupo] = []; ordem.push(m.grupo); } grupos[m.grupo].push(m); });
    $("cfgModos").innerHTML = ordem.map(function (g) { return '<div class="cfg-grupo">' + esc(g) + '</div><div class="cfg-modos">' + grupos[g].map(function (m) {
      return '<button type="button" class="cfg-modo' + (m.id === atual ? " on" : "") + '" data-modo-id="' + esc(m.id) + '" aria-pressed="' + (m.id === atual) + '">' + ((m.fx || []).length ? '<span class="selo">ANIMADO</span>' : "") + mini(m) +
        '<b>' + esc(m.nome) + (m.id === atual ? " ✓" : "") + '</b><small>' + esc(m.frase || "") + '</small>' + (m.meu ? '<span class="x" role="button" tabindex="0" data-apagar="' + esc(m.id) + '" aria-label="Excluir o modo ' + esc(m.nome) + '">✕</span>' : "") + '</button>'; }).join("") + '</div>'; }).join("");
    $("cfgFx").checked = M.animado();
  }
  $("cfgModos").addEventListener("click", function (e) {
    var x = e.target.closest("[data-apagar]"); if (x) { e.stopPropagation(); if (confirm("Excluir este modo?")) { M.apagarMeu(x.getAttribute("data-apagar")); desenhar(); } return; }
    var b = e.target.closest("[data-modo-id]"); if (!b) return; var m = M.aplicar(b.getAttribute("data-modo-id")); desenhar();
    aviso($("cfgAviso"), "✓ Modo " + m.nome + " ligado neste aparelho." + (m.base === "claro" ? " Nas ferramentas de edição (fotos, vídeo, motion) o miolo continua escuro, para você ver a cor certa da mídia." : ""));
  });
  $("cfgFx").addEventListener("change", function () { M.animar(this.checked); desenhar(); });
  desenhar();

  /* ---------- modo com a minha marca ---------- */
  function daTela() { return {nome: $("mkNome").value.trim() || "MINHA MARCA", base: $("mkBase").value, destaque: $("mkDest").value, destaque2: $("mkDest2").value, menu: $("mkMenu").value, fx: $("mkFx").value ? $("mkFx").value.split(" ") : []}; }
  var previa = null;
  $("mkVer").onclick = function () { previa = M.salvarMeu(Object.assign(daTela(), {id: "meu_previa", nome: (daTela().nome + " (prévia)").slice(0, 24)})); M.aplicar(previa.id, true); desenhar(); aviso($("mkAviso"), "Assim fica. Ajuste as cores e toque em VER de novo, ou SALVAR para ficar com ele."); };
  $("mkSalvar").onclick = function () { M.apagarMeu("meu_previa"); var m = M.salvarMeu(daTela()); M.aplicar(m.id); desenhar(); aviso($("mkAviso"), "✓ Modo " + m.nome + " salvo e ligado. Ele fica em MINHA MARCA, na lista de modos."); };
  /* ler as cores de uma imagem (logo ou página do manual da marca): conta as cores mais usadas, juntando tons parecidos */
  function hex(r, g, b) { return "#" + [r, g, b].map(function (x) { return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
  function lerCores(img) {
    var c = document.createElement("canvas"), L = 96; c.width = L; c.height = Math.max(1, Math.round(L * img.naturalHeight / img.naturalWidth));
    var g = c.getContext("2d"); g.drawImage(img, 0, 0, c.width, c.height); var d = g.getImageData(0, 0, c.width, c.height).data, mapa = {};
    for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; var r = d[i] >> 4, gg = d[i + 1] >> 4, b = d[i + 2] >> 4, k = r << 8 | gg << 4 | b; var o = mapa[k] || (mapa[k] = {n: 0, r: 0, g: 0, b: 0}); o.n++; o.r += d[i]; o.g += d[i + 1]; o.b += d[i + 2]; }
    var l = Object.keys(mapa).map(function (k) { var o = mapa[k], r = o.r / o.n, gg = o.g / o.n, b = o.b / o.n, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); return {n: o.n, r: Math.round(r), g: Math.round(gg), b: Math.round(b), sat: mx ? (mx - mn) / mx : 0, luz: (0.299 * r + 0.587 * gg + 0.114 * b) / 255}; });
    var longe = function (a, b) { return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) > 70; }, escolhe = function (lista, max) { var out = []; lista.forEach(function (x) { if (out.length < max && out.every(function (y) { return longe(x, y); })) out.push(x); }); return out; };
    var vivas = escolhe(l.filter(function (x) { return x.sat > 0.35 && x.luz > 0.15 && x.luz < 0.92; }).sort(function (a, b) { return b.n * b.sat - a.n * a.sat; }), 5);
    var neutras = escolhe(l.filter(function (x) { return x.sat <= 0.35; }).sort(function (a, b) { return b.n - a.n; }), 3);
    return {vivas: vivas, neutras: neutras, clara: l.reduce(function (s, x) { return s + x.luz * x.n; }, 0) / l.reduce(function (s, x) { return s + x.n; }, 0) > 0.6};
  }
  $("mkLer").onclick = function () { $("mkArq").click(); };
  $("mkArq").onchange = function () { var f = this.files && this.files[0]; this.value = ""; if (!f) return; var url = URL.createObjectURL(f), img = new Image();
    img.onload = function () { var r; try { r = lerCores(img); } catch (e) { r = null; } URL.revokeObjectURL(url);
      if (!r || !r.vivas.length) { aviso($("mkAviso"), "Não achei cores fortes nessa imagem (ela parece só preto, branco ou cinza). Escolha as cores nos campos abaixo."); return; }
      var h = function (x) { return hex(x.r, x.g, x.b); }, v = r.vivas, escura = v.concat(r.neutras).filter(function (x) { return x.luz < 0.3; }).sort(function (a, b) { return a.luz - b.luz; })[0];
      $("mkDest").value = h(v[0]); $("mkDest2").value = h(v[1] || v[0]); $("mkMenu").value = escura ? h(escura) : h({r: Math.round(v[0].r * 0.28), g: Math.round(v[0].g * 0.28), b: Math.round(v[0].b * 0.28)});
      $("mkBase").value = r.clara ? "claro" : "escuro"; if (!$("mkNome").value) $("mkNome").value = f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").slice(0, 24).toUpperCase();
      $("mkAchadas").innerHTML = v.concat(r.neutras).map(function (x) { return '<button type="button" data-cor="' + h(x) + '" style="background:' + h(x) + '" title="Usar ' + h(x) + ' como cor principal" aria-label="Usar a cor ' + h(x) + '"></button>'; }).join("");
      aviso($("mkAviso"), "✓ Li " + v.length + " cor(es) da marca. Toque numa cor para usá-la como principal, ou em VER COMO FICA."); };
    img.onerror = function () { URL.revokeObjectURL(url); aviso($("mkAviso"), "Não consegui abrir essa imagem. Use PNG ou JPG (de um PDF, mande o print da página das cores)."); };
    img.src = url; };
  $("mkAchadas").addEventListener("click", function (e) { var b = e.target.closest("[data-cor]"); if (b) { $("mkDest").value = b.getAttribute("data-cor"); aviso($("mkAviso"), "Cor principal trocada. Toque em VER COMO FICA."); } });
  window.__cfg = {lerCores: lerCores, desenhar: desenhar};
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
