/* AMBIENTES (20/11/2026, Claude — decisão do dono): a plataforma tem dois ecossistemas que NÃO se misturam:
   MINHA EMPRESA (PJ, negocio.html, azul) e MINHA CASA (PF, casa.html, verde). Este arquivo desenha os números do alto da página de cada
   ecossistema. Só LÊ os dados que as páginas já gravam (neg_* = empresa; casa_* = casa) — não grava nada e não cria chave nova.
   A regra dos números é a mesma dos LANÇAMENTOS e do PAINEL: conta só o que já aconteceu (data até hoje) e foi pago. */
(function () {
  "use strict";
  var AMB = document.documentElement.getAttribute("data-amb") === "pf" ? "pf" : "pj";
  try { localStorage.setItem("ui_amb", JSON.stringify(AMB)); } catch (e) { }   /* Lançamentos e Painel abrem no ambiente em que a pessoa estava */
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]; }); };
  function num(x) { if (typeof x === "number") return x; var s = String(x || "").replace(/[^\d,.-]/g, ""); if (!s) return 0; if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", "."); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100; }
  function brl(v) { return (v < 0 ? "−" : "") + "R$ " + Math.abs(v).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2}); }
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  function hoje() { var d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }   /* data LOCAL (regra 29) */
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }

  function numeros(amb) {
    var h = hoje(), mes = h.slice(0, 7), r = {ent: 0, sai: 0, pagar: 0, extra: 0};
    if (amb === "pj") {
      ler("neg_fluxo").forEach(function (o) { var d = String(o.c0 || "").slice(0, 10); if (!o || d.slice(0, 7) !== mes) return; var v = num(o.c2), ent = /^entrada/i.test(o.c1 || "");
        if (d > h || o.fonte === "pendente") { if (!ent) r.pagar += v; return; }
        if (ent) r.ent += v; else r.sai += v; });
      r.extra = ler("neg_eventos").filter(function (e) { return e && !/cancel/i.test(e.status || "") && String(e.dataFim || e.data || "") >= h; }).length;
    } else {
      ler("casa_orcamento").forEach(function (x) { if (!x) return; var d = x.data || (x.c4 ? x.c4 + "-01" : ""); if (String(d).slice(0, 7) !== mes) return; var v = num(x.c3), rec = x.c2 === "Receita";
        if (d > h) { if (!rec) r.pagar += v; return; }
        if (rec) r.ent += v; else r.sai += v; });
      ler("casa_contas").forEach(function (x) { if (!x) return; var d = String(x.c2 || "").slice(0, 10); if (d.slice(0, 7) !== mes) return; var v = num(x.c1), pg = String(x.c3 || "").toLowerCase().indexOf("s") === 0;
        if (pg && d <= h) r.sai += v; else r.pagar += v; });
      ler("casa_reserva").forEach(function (x) { if (x) r.extra += num(x.c1); });
    }
    return r;
  }
  function desenhar() {
    var box = $("ambKpis"); if (!box) return;
    var n = numeros(AMB), res = n.ent - n.sai;
    var k = function (c, rot, v, sub) { return '<div class="amb-kpi" style="--k:' + c + '"><small>' + rot + '</small><b>' + esc(v) + '</b><span>' + sub + '</span></div>'; };
    box.innerHTML = k("#22c55e", "ENTRADAS DO MÊS", brl(n.ent), AMB === "pj" ? "recebido pela empresa" : "recebido pela família") +
      k("#ef4444", "SAÍDAS DO MÊS", brl(n.sai), "já pagas") + k(res >= 0 ? "#38bdf8" : "#fb923c", "RESULTADO", brl(res), "entradas − saídas") +
      k("#FFB547", "A PAGAR", brl(n.pagar), "em aberto ou com data futura") +
      (AMB === "pj" ? k("#a78bfa", "PRÓXIMOS EVENTOS", String(n.extra), "de hoje em diante") : k("#34d399", "RESERVA GUARDADA", brl(n.extra), "total já guardado"));
  }
  window.BWAmbiente = {amb: AMB, numeros: numeros, desenhar: desenhar};
  window.addEventListener("bw-dados", desenhar);
  window.addEventListener("storage", function (e) { if (e.key && e.key.indexOf("bw_") === 0) desenhar(); });
  desenhar(); setTimeout(desenhar, 1500);   /* a sincronia ao abrir pode trazer dados da conta */
  var vb = $("btnVoltar"); if (vb) vb.onclick = function () { location.href = "./"; };
  (async function () { var el = $("userBox"); if (!el) return; var u = null; try { var c = window.BWSync && BWSync.cliente && BWSync.cliente(), s = c ? await c.auth.getSession() : null; u = s && s.data && s.data.session && s.data.session.user; } catch (e) { }
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
