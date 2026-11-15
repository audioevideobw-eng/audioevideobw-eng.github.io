/* assets/layout.js — Brightway: injeta o MENU LATERAL + TOPO em todas as páginas.
   Correções do dono (12/11): (1) o .bw-conteudo entra DENTRO do .bw-shell;
   (2) o menu usa data-slot e MOVE os originais (#menuSync, #userBox, #btnVoltar)
   — sem duplicar ids, os handlers presos aos ids continuam funcionando. */
(function(){
  /* 14/11 (Claude): itens só da administração BW (Painel Financeiro, Configuração) ficam
     escondidos para os demais usuários. Quem decide é o Supabase (is_bw_admin). */
  try { if (localStorage.getItem("ui_admin") === "1") document.documentElement.classList.add("bw-admin"); } catch (x) { }
  function conferirAdmin(){
    var S = window.BWSync, c = S && S.cliente && S.cliente();
    if (!c) return;
    c.auth.getSession().then(function(r){
      if (!r || !r.data || !r.data.session) { document.documentElement.classList.remove("bw-admin"); try { localStorage.removeItem("ui_admin"); } catch (x) { } return; }
      return c.rpc("is_bw_admin").then(function(a){
        var sim = !!(a && a.data === true);
        document.documentElement.classList.toggle("bw-admin", sim);
        try { sim ? localStorage.setItem("ui_admin", "1") : localStorage.removeItem("ui_admin"); } catch (x) { }
      });
    }).catch(function(){ });
  }
  if (document.readyState === "complete") setTimeout(conferirAdmin, 300); else window.addEventListener("load", function(){ setTimeout(conferirAdmin, 300); });
  /* 14/11 (Claude): instalação do app (PWA). Android/Chrome/Edge: usa o pedido nativo do navegador.
     iPhone/iPad: o iOS não deixa site instalar sozinho — mostramos o passo a passo do Safari. */
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); window.__bwInstall = e; });
  window.addEventListener("appinstalled", function(){ window.__bwInstall = null; try { localStorage.setItem("ui_app_instalado", "1"); } catch (x) { } });
  try { if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function(){}); } catch (x) { }
  function instalado(){ return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  function avisoApp(titulo, html){
    var v = document.getElementById("bwAppModal"); if (v) v.remove();
    v = document.createElement("div"); v.id = "bwAppModal"; v.className = "bw-app-modal";
    v.innerHTML = '<div class="caixa" role="dialog" aria-modal="true" aria-label="' + titulo + '"><img src="icons/app-192.png" alt="" width="64" height="64">' +
      '<h3>' + titulo + '</h3>' + html + '<button class="bw-btn bw-btn--primario" id="bwAppOk">Entendi</button></div>';
    v.onclick = function(e){ if (e.target === v || e.target.id === "bwAppOk") v.remove(); };
    document.body.appendChild(v);
  }
  window.bwInstalarApp = function(){
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (instalado()) { avisoApp("App já instalado", "<p>Você já está usando o Brightway como aplicativo neste aparelho.</p>"); return; }
    if (window.__bwInstall) {
      var ev = window.__bwInstall; window.__bwInstall = null;
      ev.prompt();
      ev.userChoice.then(function(r){ if (r && r.outcome === "accepted") avisoApp("Instalando…", "<p>O ícone do <b>Brightway</b> vai aparecer na tela inicial do aparelho.</p>"); });
      return;
    }
    /* iPhone, Android sem o pedido nativo e computador: página de instalação com o passo a passo certo */
    location.href = "baixar.html";
  };
  function init(){
  var PAGINA = (location.pathname.split("/").pop() || "index.html").replace(".html", "");
  if (PAGINA === "index" || PAGINA === "") PAGINA = "index";
  if (PAGINA === "login" || PAGINA === "cadastro") return;   // sem menu lateral

  var CATEGORIAS = [
    { id: "inicio",  nome: "Início",           href: "./", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>' },
    { id: "negocio", nome: "Meu negócio",       href: "negocio.html", icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
    { id: "casa",    nome: "Gestão de casa",    href: "orcamento.html", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>' },
    { id: "invest",  nome: "Investimentos",     href: "cambio.html", icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>' },
    { id: "ferr",    nome: "Ferramentas",       href: "recs.html", icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h2M12 18h2M16 18h.01"/>' },
    { id: "conta",   nome: "Conta",             href: "login.html", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' }
  ];
  var SUBPAGINAS = {
    negocio: [["negocio","Ferramentas do negócio"],["financeiro-painel","Painel Financeiro"],["eventos","Eventos"],["equipe","Gestão de pessoas"],["leitor","Leitor de comprovantes"],["preco","Calculadora de preço"],["fluxo","Fluxo de caixa"]],
    casa: [["orcamento","Orçamento familiar"],["contas","Contas a pagar"],["reserva","Reserva de emergência"]],
    invest: [["cambio","Câmbio"],["evento","Evento no exterior"],["milhas","Mercado de milhas"],["meta","Meta de milhas"],["invest","Rendimento"]],
    ferr: [["recs","★ Recomendações"],["noticias","Notícias"],["dados","Meus dados"]],
    conta: [["login","Acesso"],["cadastro","Cadastro"],["configadm","Configuração"]]
  };
  function categoriaDe(p){
    if (p === "index") return "inicio";
    if (["negocio","financeiro-painel","eventos","equipe","leitor","preco","fluxo"].indexOf(p) > -1) return "negocio";
    if (["orcamento","casa","contas","reserva"].indexOf(p) > -1) return "casa";
    if (["cambio","comparador","serie","calc","viagem","diario","alertas","evento","milhas","meta","invest"].indexOf(p) > -1) return "invest";
    if (["recs","noticias","dados"].indexOf(p) > -1) return "ferr";
    return "conta";
  }
  var CAT = categoriaDe(PAGINA);
  var TITULOS = { index:"Início", negocio:"Ferramentas do negócio", eventos:"Eventos", evento:"Evento no exterior",
    equipe:"Gestão de pessoas", "financeiro-painel":"Painel Financeiro", financeiro:"Financeiro de eventos", preco:"Calculadora de preço",
    fluxo:"Fluxo de caixa", orcamento:"Orçamento familiar", casa:"Casa", contas:"Contas a pagar",
    reserva:"Reserva de emergência", milhas:"Mercado de milhas", meta:"Meta de milhas",
    comparador:"Comparador de moedas", alertas:"Alertas de preço", cambio:"Câmbio",
    invest:"Rendimento", serie:"Série histórica", diario:"Diário de câmbio", calc:"Calculadora",
    viagem:"Conversor de viagem", leitor:"Leitor de comprovantes", recs:"Recomendações",
    noticias:"Notícias", dados:"Meus dados", app:"App & sincronização", login:"Acesso",
    configadm:"Configuração" };
  var NOMES_CAT = {}; CATEGORIAS.forEach(function(c){ NOMES_CAT[c.id] = c.nome; });

  var itens = CATEGORIAS.map(function(c){
    var ativo = c.id === CAT ? " ativo" : "";
    var html = '<a class="bw-item' + ativo + '" href="' + c.href + '">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">' + c.icon + '</svg>' +
      '<span>' + c.nome + '</span></a>';
    if (c.id === CAT && SUBPAGINAS[c.id]) {
      html += SUBPAGINAS[c.id].map(function(s){
        var a = s[0] === PAGINA ? ' style="color:var(--gold)"' : "";
        var adm = (s[0] === "configadm") ? " so-admin" : "";
        return '<a class="bw-sub' + adm + '" href="' + s[0] + '.html"' + a + '>' + s[1] + '</a>';
      }).join("");
    }
    return html;
  }).join("");

  var menu = '<aside class="bw-menu" id="bwMenu">' +
    '<div class="logo"><a href="./" aria-label="Brightway, início"><div role="img" aria-label="BRIGHTWAY" style="font-family:Michroma,sans-serif;font-size:17px;line-height:1;letter-spacing:.16em;color:#F5F1EA;white-space:nowrap;margin-right:-.16em">BRIGHTW<svg viewBox="0 0 80 72" aria-hidden="true" style="width:.8em;height:.72em;vertical-align:baseline;overflow:visible;margin-right:.16em"><defs><linearGradient id="rdM" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFB547" stop-opacity=".04"/><stop offset="1" stop-color="#FFB547" stop-opacity=".55"/></linearGradient></defs><path d="M4 72 L37 8 L43 8 L76 72 Z" fill="url(#rdM)"/><path d="M4.5 70 L37.5 8 M75.5 70 L42.5 8" stroke="#FFB547" stroke-width="8" stroke-linecap="square" fill="none"/><path d="M40 68 L40 24" stroke="#FFF4DC" stroke-width="3" stroke-dasharray="8 6"/><path d="M40 -16 L42.8 -.8 L58 2 L42.8 4.8 L40 20 L37.2 4.8 L22 2 L37.2 -.8 Z" fill="#FFF8EA"/></svg>Y</div></a></div>' +
    itens +
    '<button type="button" class="bw-app-dl" onclick="window.bwInstalarApp()"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg><span>APP DOWNLOAD</span></button>' +
    '<div class="sync-card">' +
      '<div class="linha"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg><span data-slot="menuSync">Sincronizado</span></div>' +
      '<div class="info">Celular e PC atualizados — automático ao abrir e ao salvar.</div>' +
      '<a href="#" onclick="window.bwInstalarApp();return false">Instalar no celular</a>' +
    '</div>' +
    '<div data-slot="userBox" style="font-size:11px;color:var(--txt2);padding:10px 12px 0"></div>' +
    '</aside>';

  var topo = '<div class="bw-topo">' +
    '<div><div class="trilha">' + (CAT === "inicio" ? "Início" : NOMES_CAT[CAT] + " / <b>" + (TITULOS[PAGINA] || PAGINA) + "</b>") + '</div>' +
    '<div class="bw-titulo-pagina">' + (TITULOS[PAGINA] || PAGINA) + '</div></div>' +
    '<div class="acoes">' +
      '<button class="bw-btn bw-btn--vidro" data-slot="btnVoltar" title="Voltar" aria-label="Voltar" style="min-height:44px;padding:0 16px">‹</button>' +
      '<a href="login.html" title="Conta" aria-label="Conta"><span class="bw-icone" style="width:40px;height:40px"><svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg></span></a>' +
    '</div></div>';

  var abas = CATEGORIAS.slice(0, 4).concat([{id:"mais", nome:"Mais", href:"#", icon:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'}])
    .map(function(c){
      var ativo = c.id === CAT ? " ativo" : "";
      return '<a href="' + c.href + '" class="' + ativo.trim() + '" data-aba="' + c.id + '" aria-label="' + c.nome + '">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">' + c.icon + '</svg><span>' + c.nome + '</span></a>';
    }).join("");

  var body = document.body;
  var header = body.querySelector("header");
  var wrap = body.querySelector(".wrap");
  var shell = document.createElement("div");
  shell.className = "bw-shell";
  shell.innerHTML = menu;
  var conteudo = document.createElement("div");
  conteudo.className = "bw-conteudo";
  conteudo.innerHTML = topo + '<div class="bw-pagina" id="bwPagina"></div>';
  if (wrap) conteudo.querySelector("#bwPagina").appendChild(wrap);
  if (header) { header.style.display = "none"; shell.appendChild(header); }
  /* CORREÇÃO 1 (dono): o conteúdo entra DENTRO do shell antes de inserir */
  shell.appendChild(conteudo);
  body.insertBefore(shell, body.firstChild);
  /* CORREÇÃO 2 (dono): MOVE os originais para os slots (sem duplicar ids) */
  ["menuSync", "userBox", "btnVoltar"].forEach(function(id){
    var slot = shell.querySelector('[data-slot="' + id + '"]');
    var orig = document.getElementById(id);
    if (slot && orig) { slot.removeAttribute("data-slot"); slot.id = id; if (id === "userBox" && orig.innerHTML.trim()) slot.innerHTML = orig.innerHTML; orig.remove(); }
  });
  /* 14/11 (Claude): CÂMBIO reúne as ferramentas de moeda em abas (antes eram 7 itens soltos no menu) */
  var CAMBIO = [["cambio","Cotação"],["comparador","Comparador"],["serie","Série histórica"],["calc","Calculadora"],["viagem","Conversor de viagem"],["diario","Diário"],["alertas","Alertas"]];
  if (CAMBIO.some(function(c){ return c[0] === PAGINA; })) {
    var tabs = document.createElement("nav");
    tabs.className = "bw-cambio-abas"; tabs.setAttribute("aria-label", "Ferramentas de câmbio");
    tabs.innerHTML = CAMBIO.map(function(c){ return '<a href="' + c[0] + '.html"' + (c[0] === PAGINA ? ' class="ativo" aria-current="page"' : "") + '>' + c[1] + '</a>'; }).join("");
    var pg = conteudo.querySelector("#bwPagina"); pg.insertBefore(tabs, pg.firstChild);
  }
  /* abas do celular */
  var abasEl = document.createElement("nav");
  abasEl.className = "bw-abas";
  abasEl.innerHTML = abas;
  body.appendChild(abasEl);
  var mais = abasEl.querySelector('[data-aba="mais"]');
  if (mais) mais.onclick = function(e){ e.preventDefault(); var m = document.querySelector("#bwMenu"); if (m) { m.style.display = "block"; m.style.position = "fixed"; m.style.inset = "0"; m.style.zIndex = "70"; m.style.width = "100%"; var x = document.createElement("button"); x.textContent = "✕ Fechar"; x.style.cssText = "margin:0 0 10px;background:rgba(255,181,71,.1);color:var(--gold);border:1px solid rgba(255,181,71,.25);border-radius:12px;padding:12px;width:100%;font-weight:600"; x.onclick = function(){ m.style.display = "none"; x.remove(); }; m.insertBefore(x, m.firstChild); } };
  /* 14/11 (Claude): selo LOGADO também no topo (no celular o menu lateral fica escondido) */
  var ub = document.getElementById("userBox"), acoes = document.querySelector(".bw-topo .acoes");
  if (ub && acoes) {
    var selo = document.createElement("span");
    selo.className = "bw-topo-logado";
    acoes.insertBefore(selo, acoes.firstChild);
    var copiar = function(){
      var l = ub.querySelector(".bw-logado");
      selo.innerHTML = l ? '<a href="login.html" class="bw-logado" title="' + (l.getAttribute("title") || "") + '"><i></i>LOGADO</a>' : "";
    };
    copiar();
    try { new MutationObserver(copiar).observe(ub, { childList: true, subtree: true }); } catch (e) { }
  }
  var vb = document.getElementById("btnVoltar");
  if (vb) vb.onclick = function(){ history.back(); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();