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
    /* 20/11 (dono): no COMPUTADOR o APP DOWNLOAD leva ao instalador do app BW (.exe) — a página baixar.html mostra o botão do .exe em destaque */
    var pc = !ios && !/Android/i.test(ua) && !(window.matchMedia && matchMedia("(max-width: 899px)").matches);
    if (pc) { location.href = "baixar.html"; return; }
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
    { id: "lanc",    nome: "Lançamentos",       href: "lancamentos.html", icon: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>' },
    { id: "negocio", nome: "Minha empresa",     href: "negocio.html", icon: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' },
    { id: "casa",    nome: "Minha casa",        href: "casa.html", icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>' },
    { id: "invest",  nome: "Investimentos",     href: "investimentos-painel.html", icon: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>' },
    { id: "crm",     nome: "CRM",               href: "crm.html", icon: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>' },
    { id: "mkt",     nome: "Marketing",         href: "marketing.html", icon: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>' },
    { id: "ferr",    nome: "Ferramentas",       href: "ferramentas.html", icon: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h2M12 18h2M16 18h.01"/>' },
    { id: "conta",   nome: "Conta",             href: "login.html", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' }
  ];
  var SUBPAGINAS = {
    /* 20/11 (dono): dois ecossistemas — MINHA EMPRESA (PJ) e MINHA CASA (PF); o 3º item, quando existe, é o endereço completo */
    negocio: [["negocio","Minha empresa (PJ)"],["lancamentos-pj","Lançamentos PJ","lancamentos.html?a=pj"],["financeiro-painel-pj","Painel PJ","financeiro-painel.html?a=pj"],["propostas","Gerador de orçamento"],["eventos","Eventos"],["equipe","Gestão de pessoas"],["leitor","Leitor de comprovantes"],["preco","Calculadora de preço"]],
    casa: [["casa","Minha casa (PF)"],["lancamentos-pf","Lançamentos PF","lancamentos.html?a=pf"],["financeiro-painel-pf","Painel PF","financeiro-painel.html?a=pf"],["orcamento","Orçamento familiar"],["contas","Contas a pagar"],["reserva","Reserva de emergência"]],
    invest: [["investimentos-painel","Painel de Investimentos"],["cambio","Câmbio"],["evento","Evento no exterior"],["milhas","Mercado de milhas"],["meta","Meta de milhas"],["recs","★ Recomendações"],["noticias","Notícias"]],
    crm: [["crm","Painel do CRM"],["captacao","Funil de clientes"],["resultados","Indicadores"]],
    mkt: [["marketing","Todas de marketing"],["promptia","Prompt IA"],["reels","BW Reels Pro"],["personagens","Personagens"],["video","Editor de vídeo"],["motion","Estúdio de motion"],["telas","Telas em movimento"],["3d","Estúdio 3D"],["criador","Criador IA"],["fotos","Editor de fotos"],["assistente","Assistente de texto"],["transcricao","Transcrição e legendas"]],
    ferr: [["ferramentas","Todas as ferramentas"],["pdf","PDF"],["dados","Meus dados"]],
    conta: [["config","Configurações e aparência"],["login","Acesso"],["configadm","Configuração (ADM)"]]
  };
  function categoriaDe(p){
    if (p === "index") return "inicio";
    if (p === "lancamentos") return "lanc";
    if (["negocio","financeiro-painel","eventos","equipe","leitor","preco","fluxo","custos"].indexOf(p) > -1) return "negocio";
    if (["orcamento","casa","contas","reserva"].indexOf(p) > -1) return "casa";
    if (["investimentos-painel","cambio","comparador","serie","calc","viagem","diario","alertas","evento","milhas","meta","invest","recs","noticias"].indexOf(p) > -1) return "invest";
    if (["crm","captacao","resultados"].indexOf(p) > -1) return "crm";
    if (["marketing","assistente","transcricao","fotos","criador","reels","personagens","video","motion","telas","promptia","3d"].indexOf(p) > -1) return "mkt";
    if (["ferramentas","pdf","dados"].indexOf(p) > -1) return "ferr";
    return "conta";
  }
  var CAT = categoriaDe(PAGINA);
  var TITULOS = { index:"Início", ferramentas:"Ferramentas", negocio:"Minha empresa", eventos:"Eventos", evento:"Evento no exterior",
    equipe:"Gestão de pessoas", "financeiro-painel":"Painel Financeiro", financeiro:"Financeiro de eventos", preco:"Calculadora de preço",
    lancamentos:"Lançamentos", fluxo:"Fluxo de caixa", custos:"Cachês e custos", orcamento:"Orçamento familiar", casa:"Minha casa", contas:"Contas a pagar",
    reserva:"Reserva de emergência", milhas:"Mercado de milhas", meta:"Meta de milhas",
    comparador:"Comparador de moedas", alertas:"Alertas de preço", cambio:"Câmbio",
    invest:"Simulador de rendimento", "investimentos-painel":"Painel de Investimentos", serie:"Série histórica", diario:"Diário de câmbio", calc:"Calculadora",
    viagem:"Conversor de viagem", leitor:"Leitor de contas", recs:"Recomendações",
    noticias:"Notícias", dados:"Meus dados", app:"App & sincronização", login:"Acesso",
    configadm:"Configuração", config:"Configurações", marketing:"Marketing", assistente:"Assistente de texto", transcricao:"Transcrição e legendas", pdf:"Ferramentas de PDF",
    crm:"CRM", captacao:"Funil de clientes", resultados:"Indicadores", fotos:"Editor de fotos", criador:"Criador IA", reels:"BW Reels Pro", personagens:"Personagens", promptia:"Prompt IA", video:"Editor de vídeo", motion:"Estúdio de motion", telas:"Telas em movimento", "3d":"Estúdio 3D", propostas:"Gerador de orçamento" };
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
        return '<a class="bw-sub' + adm + '" href="' + (s[2] || s[0] + ".html") + '"' + a + '>' + s[1] + '</a>';
      }).join("");
    }
    return html;
  }).join("");

  var menu = '<aside class="bw-menu" id="bwMenu">' +
    '<div class="logo"><a href="./" aria-label="Brightway, início"><div role="img" aria-label="BRIGHTWAY" style="font-family:Michroma,sans-serif;font-size:17px;line-height:1;letter-spacing:.16em;color:#F5F1EA;white-space:nowrap;margin-right:-.16em">BRIGHTW<svg viewBox="0 0 80 72" aria-hidden="true" style="width:.8em;height:.72em;vertical-align:baseline;overflow:visible;margin-right:.16em"><defs><linearGradient id="rdM" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FFB547" stop-opacity=".04"/><stop offset="1" stop-color="#FFB547" stop-opacity=".55"/></linearGradient></defs><path d="M4 72 L37 8 L43 8 L76 72 Z" fill="url(#rdM)"/><path d="M4.5 70 L37.5 8 M75.5 70 L42.5 8" stroke="#FFB547" stroke-width="8" stroke-linecap="square" fill="none"/><path d="M40 68 L40 24" stroke="#FFF4DC" stroke-width="3" stroke-dasharray="8 6"/><path d="M40 -16 L42.8 -.8 L58 2 L42.8 4.8 L40 20 L37.2 4.8 L22 2 L37.2 -.8 Z" fill="#FFF8EA"/></svg>Y</div></a></div>' +
    itens +
    '<button type="button" class="bw-app-dl so-web" onclick="window.bwInstalarApp()"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></svg><span>APP DOWNLOAD</span></button>' +
    '<button type="button" class="bw-fb-btn" onclick="window.bwFeedback()"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg><span>ENVIAR FEEDBACK</span></button>' +
    '<a class="bw-fb-btn bw-cfg" href="config.html" title="Meus dados e modos de aparência"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg><span>CONFIGURAÇÕES</span></a>' +
    /* 15/11 (pedido do dono): baixar o Guia do usuário (PDF) direto do menu */
    '<a class="bw-fb-btn bw-manual" href="docs/Brightway-Guia-do-usuario.pdf" target="_blank" rel="noopener" download="Brightway-Guia-do-usuario.pdf" title="Guia do usuário em PDF"><svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M12 7v6M9.5 10.5 12 13l2.5-2.5"/></svg><span>MANUAL DO USUÁRIO</span></a>' +
    '<div class="sync-card">' +
      '<div class="linha"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg><span data-slot="menuSync">Sincronizado</span></div>' +
      '<div class="info">Celular e PC atualizados — automático ao abrir e ao salvar.</div>' +
      '<a href="#" class="so-web" onclick="window.bwInstalarApp();return false">Instalar no celular</a>' +
    '</div>' +
    '<div class="bw-menu-conta"><div data-slot="userBox" style="font-size:11px;color:var(--txt2)"></div>' +
      '<button type="button" class="bw-atualizar" onclick="window.bwAtualizar(this)" title="Atualizar a página (sincroniza e recarrega)" aria-label="Atualizar"><svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg><span>ATUALIZAR</span></button></div>' +
    '</aside>';

  var topo = '<div class="bw-topo">' +
    /* 16/11 (pedido do dono): só o nome da página — a trilha "Categoria / Página" repetia a mesma informação */
    '<div><div class="bw-titulo-pagina">' + (CAT === "inicio" ? "Início" : (TITULOS[PAGINA] || PAGINA)) + '</div></div>' +
    '<div class="acoes">' +
      '<button class="bw-btn bw-btn--vidro" data-slot="btnVoltar" title="Voltar" aria-label="Voltar" style="min-height:44px;padding:0 16px">‹</button>' +
      '<button type="button" class="bw-sino" id="bwSino" onclick="window.bwAvisos()" title="Avisos" aria-label="Avisos"><span class="bw-icone" style="width:40px;height:40px"><svg width="19" height="19" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></span><b class="bw-sino-n" id="bwSinoN" hidden></b></button>' +
      '<button type="button" class="bw-fb-topo" onclick="window.bwFeedback()" title="Enviar feedback" aria-label="Enviar feedback"><span class="bw-icone" style="width:40px;height:40px"><svg width="19" height="19" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span></button>' +
      /* 20/11 (dono): engrenagem → CONFIGURAÇÕES (meus dados + modos de aparência) */
      '<a class="bw-cfg-topo" href="config.html" title="Configurações e aparência" aria-label="Configurações"><span class="bw-icone" style="width:40px;height:40px"><svg width="19" height="19" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span></a>' +
      /* 16/11 (pedido do dono): botão MENU ao lado do feedback — no celular abre o menu completo; no computador mostra/esconde o menu lateral */
      '<button type="button" class="bw-menu-topo" id="bwMenuBtn" onclick="window.bwMenu()" title="Menu" aria-label="Abrir o menu" aria-controls="bwMenu"><span class="bw-icone" style="width:40px;height:40px"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span></button>' +
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
  /* 21/11 (dono): MODO FOCO — nas ferramentas de edição e criação somem o menu lateral, o topo e as abas de baixo;
     fica só uma setinha discreta de voltar (e ☰ para trazer os menus de volta nesta visita). Página nova de edição = entrar na lista. */
  var FOCO = ["video", "motion", "telas", "3d", "fotos", "criador", "reels", "personagens"];
  if (FOCO.indexOf(PAGINA) >= 0) {
    document.documentElement.classList.add("bw-foco");
    var stF = document.createElement("style");
    stF.textContent = "html.bw-foco .bw-menu:not(.bw-menu-aberto),html.bw-foco .bw-topo,html.bw-foco .bw-abas{display:none!important}" +
      "html.bw-foco .bw-pagina{max-width:none;padding:6px 14px 10px}" +
      ".bw-foco-barra{display:none}html.bw-foco .bw-foco-barra{display:flex;align-items:center;gap:8px;height:30px;padding:4px 10px 0;font:700 11px Inter,sans-serif;letter-spacing:.12em;color:#8d95a3;text-transform:uppercase}" +
      ".bw-foco-barra button{width:30px;height:28px;border-radius:9px;border:1px solid rgba(245,241,234,.14);background:transparent;color:#cfd5de;font:800 15px Inter,sans-serif;cursor:pointer;padding:0;line-height:1}" +
      ".bw-foco-barra button:hover{border-color:rgba(245,241,234,.4);color:#fff}" +
      "@media(max-width:899px){html.bw-foco .bw-pagina{padding:4px 10px 24px}}";
    document.head.appendChild(stF);
    var bf = document.createElement("div"); bf.className = "bw-foco-barra";
    bf.innerHTML = '<button type="button" id="bwFocoVoltar" title="Voltar" aria-label="Voltar">‹</button><span>' + (TITULOS[PAGINA] || PAGINA) + '</span><span style="flex:1"></span><button type="button" id="bwFocoMenu" title="Mostrar os menus" aria-label="Mostrar os menus">☰</button>';
    conteudo.insertBefore(bf, conteudo.firstChild);
    bf.querySelector("#bwFocoVoltar").onclick = function () { if (history.length > 1 && document.referrer && document.referrer.indexOf(location.host) >= 0) history.back(); else location.href = "marketing.html"; };
    bf.querySelector("#bwFocoMenu").onclick = function () { document.documentElement.classList.remove("bw-foco"); window.dispatchEvent(new Event("resize")); };
  }
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
  /* 14/11 (Claude): o simulador de rendimento é uma aba do PAINEL DE INVESTIMENTOS */
  if (PAGINA === "invest") {
    var ti = document.createElement("nav");
    ti.className = "bw-cambio-abas"; ti.setAttribute("aria-label", "Investimentos");
    ti.innerHTML = '<a href="investimentos-painel.html">Painel de Investimentos</a><a href="invest.html" class="ativo" aria-current="page">Simulador de rendimento</a>';
    var pgi = conteudo.querySelector("#bwPagina"); pgi.insertBefore(ti, pgi.firstChild);
  }
  /* 18/11 (dono): a página Fluxo de caixa saiu — os lançamentos ficam em LANÇAMENTOS; CACHÊS E CUSTOS virou página própria (sem abas) */
  /* abas do celular */
  var abasEl = document.createElement("nav");
  abasEl.className = "bw-abas";
  abasEl.innerHTML = abas;
  body.appendChild(abasEl);
  var mais = abasEl.querySelector('[data-aba="mais"]');
  /* menu completo no celular (aba "Mais" e botão MENU do topo) */
  function abrirMenuMovel() {
    var m = document.querySelector("#bwMenu"); if (!m || m.classList.contains("bw-menu-aberto")) return;
    m.classList.add("bw-menu-aberto"); document.body.style.overflow = "hidden";
    var x = document.createElement("button"); x.type = "button"; x.className = "bw-menu-fechar"; x.textContent = "✕ Fechar";
    x.onclick = function(){ m.classList.remove("bw-menu-aberto"); document.body.style.overflow = ""; x.remove(); };
    m.insertBefore(x, m.firstChild); x.focus();
  }
  var celular = function(){ return window.matchMedia("(max-width: 899px)").matches; };
  /* 22/11 (dono): no app BW do PC o menu fica SEMPRE escondido; o ☰ abre como gaveta por cima e fecha ao tocar fora */
  var noApp = document.documentElement.classList.contains("bw-no-app");
  window.bwMenu = function(){
    if (celular() || noApp) { var m = document.querySelector("#bwMenu"); if (m && m.classList.contains("bw-menu-aberto")) { var f = m.querySelector(".bw-menu-fechar"); if (f) f.click(); } else abrirMenuMovel(); return; }
    var rec = document.documentElement.classList.toggle("bw-menu-recolhido");
    try { localStorage.setItem("ui_menu_recolhido", rec ? "1" : "0"); } catch (e) { }
  };
  try { if (localStorage.getItem("ui_menu_recolhido") === "1") document.documentElement.classList.add("bw-menu-recolhido"); } catch (e) { }
  if (noApp) document.addEventListener("click", function(e){ var m = document.querySelector("#bwMenu.bw-menu-aberto"); if (!m || m.contains(e.target) || (e.target.closest && e.target.closest(".bw-menu-bt,[onclick*='bwMenu']"))) return; var f = m.querySelector(".bw-menu-fechar"); if (f) f.click(); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape") { var f = document.querySelector("#bwMenu .bw-menu-fechar"); if (f) f.click(); } });
  if (mais) mais.onclick = function(e){ e.preventDefault(); abrirMenuMovel(); };
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
  /* 15/11 (Claude, pedido do dono): botão ATUALIZAR ao lado do selo LOGADO — no iPhone (app instalado) não dá para puxar a tela */
  if (acoes) {
    var at = document.createElement("button");
    at.type = "button"; at.className = "bw-atualizar bw-atualizar--topo";
    at.title = "Atualizar a página (sincroniza e recarrega)"; at.setAttribute("aria-label", "Atualizar");
    at.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg><span>ATUALIZAR</span>';
    at.onclick = function(){ window.bwAtualizar(at); };
    var sl = acoes.querySelector(".bw-topo-logado");
    acoes.insertBefore(at, sl ? sl.nextSibling : acoes.firstChild);
  }
  var vb = document.getElementById("btnVoltar");
  if (vb) vb.onclick = function(){ history.back(); };
  }
  /* ATUALIZAR: envia o que estiver pendente (até 5 s) e recarrega a página com a versão mais nova */
  window.bwAtualizar = function(btn){
    document.querySelectorAll(".bw-atualizar").forEach(function(b){ b.classList.add("girando"); b.disabled = true; });
    var fim = function(){ location.reload(); };
    try {
      var S = window.BWSync;
      if (S && S.sincronizar && S.CHAVES) {
        Promise.race([S.sincronizar(S.CHAVES), new Promise(function(r){ setTimeout(r, 5000); })]).then(fim, fim);
        return;
      }
    } catch (e) { }
    fim();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

/* ===== FEEDBACK (15/11, Claude): qualquer conta envia Problema / Sugestão / Elogio / Dúvida; o ADM lê em Configuração.
   Grava em public.bw_feedback (RLS: cada um só o seu; ADM vê todos). Sem login → convida a entrar. */
(function () {
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); }
  window.bwFeedback = function () {
    var velho = document.getElementById("bwFb"); if (velho) velho.remove();
    var pag = (location.pathname.split("/").pop() || "index.html") + location.hash;
    var d = document.createElement("div"); d.id = "bwFb"; d.className = "bw-fb-fundo";
    d.innerHTML = '<div class="bw-fb-caixa" role="dialog" aria-modal="true" aria-labelledby="bwFbT">' +
      '<button type="button" class="bw-fb-x" aria-label="Fechar">×</button>' +
      '<h3 id="bwFbT">ENVIAR FEEDBACK</h3><p class="bw-fb-sub">Conte o que achou, o que deu errado ou o que falta. Vai direto para a equipe Brightway.</p>' +
      '<div class="bw-fb-tipos">' + ["Problema", "Sugestão", "Elogio", "Dúvida"].map(function (t, i) { return '<button type="button" data-t="' + t + '"' + (i === 1 ? ' class="ativo"' : "") + '>' + t + '</button>'; }).join("") + '</div>' +
      '<textarea id="bwFbTxt" maxlength="4000" placeholder="Ex.: na página de Eventos, ao tocar em salvar, nada acontece…"></textarea>' +
      '<div class="bw-fb-pag">Página: <b>' + esc(pag) + '</b></div>' +
      '<div class="bw-fb-acoes"><button type="button" class="bw-btn bw-btn--primario" id="bwFbEnviar">ENVIAR</button><span id="bwFbMsg"></span></div></div>';
    document.body.appendChild(d);
    var tipo = "Sugestão";
    function fechar() { d.remove(); document.removeEventListener("keydown", tecla); }
    function tecla(e) { if (e.key === "Escape") fechar(); }
    document.addEventListener("keydown", tecla);
    d.addEventListener("click", function (e) { if (e.target === d) fechar(); });
    d.querySelector(".bw-fb-x").onclick = fechar;
    [].forEach.call(d.querySelectorAll(".bw-fb-tipos button"), function (b) {
      b.onclick = function () { tipo = b.dataset.t; [].forEach.call(d.querySelectorAll(".bw-fb-tipos button"), function (x) { x.classList.toggle("ativo", x === b); }); };
    });
    setTimeout(function () { var t = document.getElementById("bwFbTxt"); if (t) t.focus(); }, 50);
    document.getElementById("bwFbEnviar").onclick = async function () {
      var msg = document.getElementById("bwFbMsg"), txt = document.getElementById("bwFbTxt").value.trim(), bt = this;
      if (txt.length < 3) { msg.textContent = "Escreva um pouco mais."; return; }
      var c = null, s = null;
      try { c = window.BWSync && BWSync.cliente(); s = c ? (await c.auth.getSession()).data.session : null; } catch (e) { }
      if (!c || !s) { msg.innerHTML = 'Entre na sua conta para enviar — <a href="login.html" style="color:#FFB547">entrar</a>.'; return; }
      bt.disabled = true; msg.textContent = "Enviando…";
      var ua = navigator.userAgent, ap = (/Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone/iPad" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : "Outro") +
        (window.matchMedia && matchMedia("(display-mode: standalone)").matches ? " · app instalado" : " · navegador") + " · " + innerWidth + "px";
      var r = await c.from("bw_feedback").insert({ dono: s.user.id, tipo: tipo, texto: txt, pagina: pag, aparelho: ap });
      if (r.error) { bt.disabled = false; msg.textContent = /limite/.test(r.error.message) ? "Limite de envios de hoje atingido. Obrigado!" : "Não deu para enviar agora. Tente de novo."; return; }
      d.querySelector(".bw-fb-caixa").innerHTML = '<h3>OBRIGADO!</h3><p class="bw-fb-sub">Recebemos o seu feedback. Ele ajuda a deixar a Brightway melhor para todo mundo.</p><div class="bw-fb-acoes"><button type="button" class="bw-btn bw-btn--primario" id="bwFbOk">FECHAR</button></div>';
      document.getElementById("bwFbOk").onclick = fechar;
    };
  };
})();


/* ===== AVISOS (15/11, Claude): sino no topo com luz pulsando quando há
   - CONTAS a pagar vencidas ou que vencem em até 3 dias (Contas a pagar: casa_contas; fixos do negócio no Fluxo: fixo_*)
   - EVENTOS de hoje até 7 dias (com montagem), e o botão LEMBRAR EQUIPE: WhatsApp de cada pessoa, e-mail para todos,
     texto para o grupo — com data, local e link de CONFIRMAR PRESENÇA (registrado na conta antes de sair).
   Tudo grátis e no aparelho: lê os dados já sincronizados; nada é enviado sem a pessoa tocar. Aviso do aparelho (Notification)
   opcional, 1x por dia ao abrir o app. */
(function () {
  var DIA = 86400000;
  function ler(k) { try { var v = JSON.parse(localStorage.getItem("bw_" + k + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[c]; }); }
  function hoje0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dias(iso) { if (!/^\d{4}-\d\d-\d\d/.test(iso || "")) return null; var d = new Date(iso.slice(0, 10) + "T00:00"); return Math.round((d - hoje0()) / DIA); }
  function dataBR(iso) { if (!iso) return "—"; var d = new Date(iso.slice(0, 10) + "T12:00"); return d.toLocaleDateString("pt-BR", {weekday: "short", day: "2-digit", month: "2-digit"}).replace(".", ""); }
  function quando(n) { return n < 0 ? "venceu há " + (-n) + (n === -1 ? " dia" : " dias") : n === 0 ? "vence HOJE" : n === 1 ? "vence amanhã" : "vence em " + n + " dias"; }
  function quandoEv(n) { return n === 0 ? "HOJE" : n === 1 ? "amanhã" : "em " + n + " dias"; }
  function moeda(v) { var n = parseFloat(String(v || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) && n ? n.toLocaleString("pt-BR", {style: "currency", currency: "BRL"}) : ""; }
  function telWa(t) { var d = String(t || "").replace(/\D/g, ""); if (!d) return ""; return (d.length >= 12 && d.indexOf("55") === 0) ? d : "55" + d; }

  function coletar() {
    var contas = [], FEITOS = {};   /* 16/11: o que foi concluído na AGENDA não aparece mais como aviso */
    ler("agenda_feitos").forEach(function (f) { if (f && f.id) FEITOS[f.id] = 1; });
    ler("casa_contas").forEach(function (c) {
      if (String(c.c3 || "").toLowerCase() === "sim") return;
      var n = dias(c.c2); if (n === null || n > 3 || n < -60) return;
      contas.push({ nome: c.c0 || "Conta", valor: c.c1, venc: c.c2, n: n, onde: "contas.html" });
    });
    ler("neg_fluxo").forEach(function (f) {
      if (!/^fixo_/.test(String(f.id)) || f.c1 !== "Saída" || FEITOS["fx|" + f.id]) return;
      var n = dias(f.c0); if (n === null || n < 0 || n > 3) return;
      contas.push({ nome: String(f.c3 || "Custo fixo").replace(/ \(fixo\)$/, "") + " (negócio)", valor: f.c2, venc: f.c0, n: n, onde: "lancamentos.html?a=pj#lcFixos" });
    });
    contas.sort(function (a, b) { return a.n - b.n; });
    var vistos = {}, eventos = [];
    ler("neg_eventos").concat(ler("neg_equipe_eventos")).forEach(function (e) {
      if (!e || vistos[e.id]) return; vistos[e.id] = 1;
      if (/cancel/i.test(e.status || "")) return;
      var n = FEITOS["ev|" + e.id + "|dia"] ? null : dias(e.data); if (n !== null && n < 0 && e.dataFim && dias(e.dataFim) >= 0) n = 0;   /* evento de vários dias em andamento conta como "hoje" */
      var nm = FEITOS["ev|" + e.id + "|mont"] ? null : dias(e.montagem);
      var prox = [n, nm].filter(function (x) { return x !== null && x >= 0 && x <= 7; });
      if (!prox.length) return;
      eventos.push({ ev: e, n: n, nm: nm, min: Math.min.apply(null, prox) });
    });
    eventos.sort(function (a, b) { return a.min - b.min; });
    /* 15/11: CRM — retornos de clientes atrasados ou para hoje (mkt_leads, etapas em aberto) */
    var clientes = [];
    ler("mkt_leads").forEach(function (l) {
      if (!l || ["novo", "conversa", "proposta", "negociacao"].indexOf(l.etapa) < 0 || !l.prox || !l.prox.data || l.prox.feito) return;
      var n = dias(l.prox.data); if (n === null || n > 0 || n < -60) return;
      clientes.push({ id: l.id, nome: l.nome && l.empresa ? l.nome + " · " + l.empresa : (l.nome || l.empresa || "Contato"), oque: l.prox.oque || "Retornar contato", n: n });
    });
    clientes.sort(function (a, b) { return a.n - b.n; });
    return { contas: contas, eventos: eventos, clientes: clientes };
  }

  function atualizarSino() {
    var s = document.getElementById("bwSino"), b = document.getElementById("bwSinoN"); if (!s || !b) return;
    var a = coletar(), urg = a.contas.filter(function (c) { return c.n <= 1; }).length + a.eventos.filter(function (e) { return e.min <= 1; }).length + a.clientes.filter(function (c) { return c.n < 0; }).length;
    var tot = a.contas.length + a.eventos.length + a.clientes.length;
    b.hidden = !tot; b.textContent = tot > 9 ? "9+" : String(tot);
    s.classList.toggle("tem", !!tot); s.classList.toggle("urgente", !!urg);
    s.title = tot ? tot + " aviso(s): contas a vencer e eventos próximos" : "Avisos — nada para os próximos dias";
    if (tot && a.clientes.length) s.title = tot + " aviso(s): contas, eventos e retornos de clientes";
    notificarDoAparelho(a);
  }

  function notificarDoAparelho(a) {
    try {
      if (!("Notification" in window) || Notification.permission !== "granted" || localStorage.getItem("ui_avisos_notif") !== "1") return;
      var d0 = new Date(), hj = d0.getFullYear() + "-" + String(d0.getMonth() + 1).padStart(2, "0") + "-" + String(d0.getDate()).padStart(2, "0"); if (localStorage.getItem("ui_avisos_ultimo") === hj) return;   /* data LOCAL (pente fino 29) */
      var linhas = a.contas.slice(0, 3).map(function (c) { return "💳 " + c.nome + " — " + quando(c.n); })
        .concat(a.eventos.slice(0, 3).map(function (e) { return "🎬 " + (e.ev.nome || "Evento") + " — " + quandoEv(e.min); }))
        .concat(a.clientes.slice(0, 3).map(function (c) { return "📞 Retornar " + c.nome + (c.n < 0 ? " (atrasado)" : " (hoje)"); }));
      if (!linhas.length) return;
      localStorage.setItem("ui_avisos_ultimo", hj);
      var t = "Brightway — " + linhas.length + " aviso(s)", o = { body: linhas.join("\n"), icon: "icons/app-192.png", tag: "bw-avisos" };
      if (navigator.serviceWorker && navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function (r) { r.showNotification(t, o); }).catch(function () { new Notification(t, o); });
      else new Notification(t, o);
    } catch (e) { }
  }

  function membrosDe(e) {
    var eq = ler("neg_equipe_equipes").filter(function (q) { return String(q.id) === String(e.equipeId); })[0];
    var cs = ler("neg_equipe_colaboradores");
    return ((eq && eq.membros) || []).map(function (mid) { return cs.filter(function (c) { return String(c.id) === String(mid); })[0]; }).filter(Boolean);
  }

  async function lembrarEquipe(id, alvo) {
    var e = coletar().eventos.map(function (x) { return x.ev; }).filter(function (x) { return String(x.id) === String(id); })[0];
    if (!e || !alvo) return;
    alvo.innerHTML = '<div class="bw-av-sub">Preparando o lembrete…</div>';
    var link = "";
    try { if (window.BWSync && await BWSync.registrarAgora({ eventos: [String(e.id)] }))
      link = location.origin + location.pathname.replace(/[^/]*$/, "") + "cadastro.html?ev=" + encodeURIComponent(e.id) + "&nome=" + encodeURIComponent(e.nome || ""); } catch (x) { }
    var resp = {};
    try { var c = window.BWSync && BWSync.cliente(); if (c) { var r = await c.from("equipe_presenca").select("email,colaborador,resposta").eq("evento_id", String(e.id));
      (r.data || []).forEach(function (p) { resp[(p.email || p.colaborador || "").toLowerCase()] = p.resposta; }); } } catch (x) { }
    var ms = membrosDe(e);
    var msg = "Olá! Lembrete do evento *" + (e.nome || "") + "*\n📅 " + dataBR(e.data) + (e.montagem && e.montagem !== e.data ? "\n🔧 Montagem: " + dataBR(e.montagem) : "") +
      "\n📍 " + (e.local || "local a confirmar") + (link ? "\n\nConfirme sua presença aqui: " + link : "\n\nConfirme sua presença respondendo esta mensagem.") + "\n\nObrigado! — BW";
    var lista = ms.length ? ms.map(function (m) {
      var st = resp[(m.email || "").toLowerCase()] || resp[(m.nome || "").toLowerCase()];
      var selo = st === "sim" ? '<span class="bw-av-ok">✓ confirmou</span>' : st === "nao" ? '<span class="bw-av-no">✗ não vai</span>' : '<span class="bw-av-pend">aguardando</span>';
      var wa = telWa(m.tel);
      return '<div class="bw-av-membro"><span>' + esc(m.nome) + " " + selo + "</span>" +
        (wa ? '<a class="bw-av-bt" target="_blank" rel="noopener" href="https://wa.me/' + wa + "?text=" + encodeURIComponent(msg.replace("Olá!", "Olá, " + String(m.nome || "").split(" ")[0] + "!")) + '">WHATSAPP</a>' : '<span class="bw-av-sub">sem telefone</span>') + "</div>";
    }).join("") : '<div class="bw-av-sub">Nenhuma equipe ligada a este evento. Escolha a equipe em Eventos para lembrar cada pessoa — ou use o texto para o grupo.</div>';
    var emails = ms.map(function (m) { return m.email; }).filter(Boolean);
    alvo.innerHTML = lista + '<div class="bw-av-acoes">' +
      (emails.length ? '<a class="bw-av-bt" href="mailto:?bcc=' + encodeURIComponent(emails.join(",")) + "&subject=" + encodeURIComponent("Lembrete — " + (e.nome || "evento") + " " + dataBR(e.data)) + "&body=" + encodeURIComponent(msg.replace(/\*/g, "")) + '">E-MAIL PARA TODOS</a>' : "") +
      '<a class="bw-av-bt" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">MANDAR NO GRUPO</a></div>' +
      (link ? "" : '<div class="bw-av-sub">⚠ Sem internet/login agora: a mensagem saiu sem o link de confirmação.</div>');
  }

  window.bwAvisos = function () {
    var velho = document.getElementById("bwAv"); if (velho) { velho.remove(); return; }
    var a = coletar();
    var d = document.createElement("div"); d.id = "bwAv"; d.className = "bw-fb-fundo";
    var notifOk = "Notification" in window, ligado = notifOk && Notification.permission === "granted" && localStorage.getItem("ui_avisos_notif") === "1";
    d.innerHTML = '<div class="bw-fb-caixa bw-av" role="dialog" aria-modal="true" aria-labelledby="bwAvT"><button type="button" class="bw-fb-x" aria-label="Fechar">×</button>' +
      '<h3 id="bwAvT">AVISOS</h3>' +
      '<div class="bw-av-tit">CONTAS A VENCER</div>' +
      (a.contas.length ? a.contas.map(function (c) {
        return '<a class="bw-av-item ' + (c.n < 0 ? "atraso" : c.n <= 1 ? "urg" : "") + '" href="' + c.onde + '"><span><b>' + esc(c.nome) + "</b><small>" + esc(dataBR(c.venc)) + " · " + quando(c.n) + "</small></span><em>" + esc(moeda(c.valor)) + "</em></a>";
      }).join("") : '<div class="bw-av-sub">Nenhuma conta vencida ou vencendo nos próximos 3 dias. ✓</div>') +
      '<div class="bw-av-tit">EVENTOS NOS PRÓXIMOS 7 DIAS</div>' +
      (a.eventos.length ? a.eventos.map(function (x) {
        var e = x.ev;
        return '<div class="bw-av-ev ' + (x.min <= 1 ? "urg" : "") + '"><div class="bw-av-evtop"><a href="eventos.html?ev=' + encodeURIComponent(e.id) + '"><b>' + esc(e.nome || "Evento") + "</b><small>" +
          esc(dataBR(e.data)) + (x.n !== null && x.n >= 0 ? " · " + quandoEv(x.n) : "") + (e.montagem && e.montagem !== e.data ? " · montagem " + esc(dataBR(e.montagem)) : "") + " · " + esc(e.local || "local a definir") + "</small></a>" +
          '<button type="button" class="bw-av-bt" data-lembrar="' + esc(e.id) + '">LEMBRAR EQUIPE</button></div><div class="bw-av-equipe" id="bwAvEq_' + esc(e.id) + '"></div></div>';
      }).join("") : '<div class="bw-av-sub">Nenhum evento nos próximos 7 dias.</div>') +
      (a.clientes.length ? '<div class="bw-av-tit">RETORNOS DE CLIENTES (CRM)</div>' + a.clientes.map(function (c) {
        return '<a class="bw-av-item ' + (c.n < 0 ? "atraso" : "urg") + '" href="captacao.html?lead=' + encodeURIComponent(c.id) + '"><span><b>' + esc(c.nome) + "</b><small>" + esc(c.oque) + " · " + (c.n < 0 ? "atrasado " + (-c.n) + (c.n === -1 ? " dia" : " dias") : "HOJE") + "</small></span><em>ABRIR</em></a>";
      }).join("") : "") +
      '<div class="bw-av-tit">AVISOS AUTOMÁTICOS (GRÁTIS)</div>' +
      (notifOk ? '<label class="bw-av-notif"><input type="checkbox" id="bwAvNotif"' + (ligado ? " checked" : "") + '> Avisar no aparelho (1 vez por dia, ao abrir o app)</label>' : "") +
      '<label class="bw-av-notif"><input type="checkbox" id="bwAvMail" disabled> Resumo por e-mail todo dia às 7h (contas e eventos)</label>' +
      '<label class="bw-av-notif"><input type="checkbox" id="bwAvEquipe" disabled> Lembrar a equipe por e-mail na véspera do evento (quem tem e-mail no cadastro)</label>' +
      '<div class="bw-av-acoes"><button type="button" class="bw-av-bt" id="bwAvTeste">MANDAR TESTE PARA MEU E-MAIL</button></div><div class="bw-av-sub" id="bwAvMsg"></div>' +
      "</div>";
    document.body.appendChild(d);
    function fechar() { d.remove(); document.removeEventListener("keydown", tecla); }
    function tecla(ev) { if (ev.key === "Escape") fechar(); }
    document.addEventListener("keydown", tecla);
    d.addEventListener("click", function (ev) { if (ev.target === d) fechar(); });
    d.querySelector(".bw-fb-x").onclick = fechar;
    [].forEach.call(d.querySelectorAll("[data-lembrar]"), function (b) {
      b.onclick = function () { var al = document.getElementById("bwAvEq_" + b.dataset.lembrar); if (al && al.innerHTML) { al.innerHTML = ""; return; } lembrarEquipe(b.dataset.lembrar, al); };
    });
    /* e-mail automático (Edge Function bw-avisos + preferência em public.bw_avisos_pref) */
    (async function () {
      var msg = document.getElementById("bwAvMsg"), cm = document.getElementById("bwAvMail"), ce = document.getElementById("bwAvEquipe"), bt = document.getElementById("bwAvTeste");
      var c = null, s = null;
      try { c = window.BWSync && BWSync.cliente(); s = c ? (await c.auth.getSession()).data.session : null; } catch (x) { }
      if (!c || !s) { if (msg) msg.innerHTML = 'Entre na sua conta para ligar os e-mails — <a href="login.html" style="color:#FFB547">entrar</a>.'; if (bt) bt.disabled = true; return; }
      var r = await c.from("bw_avisos_pref").select("email_diario,equipe_vespera").eq("dono", s.user.id).maybeSingle();
      cm.checked = !!(r.data && r.data.email_diario); ce.checked = !!(r.data && r.data.equipe_vespera); cm.disabled = ce.disabled = false;
      async function gravar() {
        cm.disabled = ce.disabled = true; msg.textContent = "Salvando…";
        var g = await c.from("bw_avisos_pref").upsert({ dono: s.user.id, email_diario: cm.checked, equipe_vespera: ce.checked, atualizado: new Date().toISOString() });
        cm.disabled = ce.disabled = false;
        msg.textContent = g.error ? "Não deu para salvar agora. Tente de novo." : (cm.checked || ce.checked ? "✓ Ligado. O primeiro envio é amanhã às 7h." : "✓ E-mails automáticos desligados.");
      }
      cm.onchange = gravar; ce.onchange = gravar;
      bt.onclick = async function () {
        bt.disabled = true; msg.textContent = "Enviando o teste…";
        try {
          var resp = await fetch("https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-avisos", { method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.access_token }, body: JSON.stringify({ modo: "teste" }) });
          var j = await resp.json(), r0 = (j.relatorio || [])[0] || {};
          msg.textContent = r0.erro ? "Não deu para enviar: " + r0.erro : r0.resumo ? "✓ Teste enviado — confira sua caixa de entrada (e o spam). " + (r0.equipe ? "Equipe: " + r0.equipe + "." : "") : (j.erro || "Não deu para enviar agora.");
        } catch (x) { msg.textContent = "Sem conexão. Tente de novo."; }
        bt.disabled = false;
      };
    })();
    var cb = document.getElementById("bwAvNotif");
    if (cb) cb.onchange = async function () {
      if (cb.checked) {
        var p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (p !== "granted") { cb.checked = false; alert("O aparelho não liberou as notificações. Dá para liberar nas configurações do navegador."); return; }
        localStorage.setItem("ui_avisos_notif", "1"); localStorage.removeItem("ui_avisos_ultimo"); atualizarSino();
      } else localStorage.removeItem("ui_avisos_notif");
    };
  };

  function iniciar() { atualizarSino(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(iniciar, 300); }); else setTimeout(iniciar, 300);
  window.addEventListener("bw-sync-recebido", atualizarSino);
  window.addEventListener("storage", function (e) { if (e.key && /casa_contas|neg_eventos|neg_fluxo|mkt_leads|agenda_feitos/.test(e.key)) atualizarSino(); });
  window.bwAtualizarAvisos = atualizarSino;
})();

/* ===== CONCLUIR (16/11, pedido do dono): a mesma animação da AGENDA (confete + verde) em TODO botão que muda a condição
   de algo na plataforma — evento Finalizado, Marcar recebido, cachê PAGO, conta paga, orçamento APROVADO…
   Como funciona: um ouvinte único (fase de captura, antes do botão redesenhar a lista) reconhece o botão, guarda o lugar do toque,
   e depois do redesenho acende em verde o cartão/linha marcado com data-bw-card="ID". Voltar atrás (não pago, agendar, desfazer)
   = só um aviso discreto, sem confete. Botões novos: data-bw-status="ok|volta" + data-bw-msg="texto" + data-bw-id="ID". ===== */
(function () {
  var CORES = ["#FFB547", "#3FD0E0", "#5FE0A0", "#FFF8EA", "#C59BFF"];
  var calmo = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };
  function confete(x, y) {
    if (calmo()) return;
    for (var i = 0; i < 18; i++) {
      var p = document.createElement("i"); p.className = "ag-confete";
      p.style.left = x + "px"; p.style.top = y + "px"; p.style.background = CORES[i % CORES.length];
      var ang = Math.random() * Math.PI * 2, dist = 50 + Math.random() * 90;
      p.style.setProperty("--x", Math.cos(ang) * dist + "px"); p.style.setProperty("--y", (Math.sin(ang) * dist - 40) + "px");
      document.body.appendChild(p); (function (q) { setTimeout(function () { q.remove(); }, 950); })(p);
    }
  }
  function aviso(t, volta) {
    var el = document.querySelector(".ag-toast"); if (!el) { el = document.createElement("div"); el.className = "ag-toast"; document.body.appendChild(el); }
    el.textContent = t; el.classList.toggle("volta", !!volta); el.classList.add("vis");
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove("vis"); }, 2200);
  }
  function acender(id, x, y, volta) {
    var cls = volta ? "bw-vira-volta" : "bw-vira-verde";
    /* espera o redesenho da lista (síncrono, mas algumas telas redesenham no próximo quadro) */
    setTimeout(function () {
      var alvo = null;
      if (id) { try { alvo = document.querySelector('[data-bw-card="' + String(id).replace(/["\\]/g, "") + '"]'); } catch (e) { } }
      if (!alvo && x != null) { var em = document.elementFromPoint(x, y); alvo = em && em.closest(".card,.bw-card,tr,.row,.pr-card,.ag-item"); }
      if (!alvo) return;
      alvo.classList.remove("bw-vira-verde", "bw-vira-volta"); void alvo.offsetWidth; alvo.classList.add(cls);
      setTimeout(function () { alvo.classList.remove(cls); }, 1500);
      var rb = alvo.getBoundingClientRect();
      if (!volta && (rb.bottom < 0 || rb.top > innerHeight)) {   /* mudou de aba (ex.: foi para REALIZADOS): mostra onde está */
        try { alvo.scrollIntoView({ block: "center", behavior: calmo() ? "auto" : "smooth" }); } catch (e) { }
      }
    }, 60);
  }
  /* reconhece o botão e diz o que aconteceu: [ok?, mensagem, id] — null = não é botão de condição */
  function ler(b) {
    var t = (b.textContent || "").replace(/\s+/g, " ").trim().toLowerCase(), d = b.dataset || {}, oc = b.getAttribute("onclick") || "";
    if (b.closest(".ag")) return null;                                   /* a AGENDA já faz a dela */
    if (d.bwStatus) return [d.bwStatus !== "volta", d.bwMsg || (d.bwStatus !== "volta" ? "✓ Feito!" : "Desfeito"), d.bwId];
    if (d.fin) return [true, "✓ Evento finalizado! Foi para EVENTOS REALIZADOS.", d.fin];
    if (d.agd) return [false, "Evento voltou para a AGENDA DE EVENTOS", d.agd];
    if (d.pago) return /não pago|nao pago/.test(t) ? [false, "Marcado como NÃO RECEBIDO", d.pago] : [true, "✓ Recebido!", d.pago];
    if (d.pg) return /^pago/.test(t) ? [false, "Cachê voltou para NÃO PAGO", d.pg] : [true, "✓ Cachê pago!", d.pg];
    if (/__togglePago\(/.test(oc)) { var m = oc.match(/__togglePago\('([^']*)'/); return /marcar pago/.test(t) ? [true, "✓ Conta paga!", m && m[1]] : [false, "Conta voltou para NÃO PAGA", m && m[1]]; }
    if ((d.a === "st" || d.a === "stEd") && d.v) {
      if (d.v === "aprovado") return [true, "✓ Orçamento APROVADO!", d.id];
      if (d.v === "enviado") return /reabrir/.test(t) ? [false, "Orçamento reaberto", d.id] : [true, "✓ Marcado como ENVIADO", d.id];
      if (d.v === "recusado") return [false, "Orçamento marcado como RECUSADO", d.id];
    }
    return null;
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("button,a,[role=button]"); if (!b) return;
    var r = ler(b); if (!r) return;
    var x = ev.clientX, y = ev.clientY;
    if (!x && !y) { var bb = b.getBoundingClientRect(); x = bb.left + bb.width / 2; y = bb.top + bb.height / 2; }
    /* o clique do botão roda depois desta captura; o efeito vem logo em seguida, quando já se sabe que deu certo */
    setTimeout(function () {
      if (r[0]) confete(x, y);
      aviso(r[1], !r[0]); acender(r[2], x, y, !r[0]);
    }, 0);
  }, true);
  window.BWConcluir = {
    /* para fluxos com janela (ex.: FECHAR NEGÓCIO no CRM): BWConcluir.festa(elemento, "mensagem") */
    festa: function (el, msg) {
      var bb = el && el.getBoundingClientRect ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
      confete(bb.left + bb.width / 2, bb.top + Math.min(bb.height, 120) / 2); if (msg) aviso(msg);
    },
    aviso: aviso, acender: acender
  };
})();

/* ===== AGENTE (16/11): o robô fica em todas as páginas — carregado aqui para não precisar mexer em cada página ===== */
(function () {
  if (window.BWLanca || document.querySelector('script[src*="bw-agente.js"]')) return;
  var s = document.createElement("script"); s.src = "assets/bw-agente.js?v=26"; s.defer = true; document.head.appendChild(s);
})();

/* 18/11: SETAS de abrir/fechar seções (data-seta). Fechada por padrão com data-seta-padrao="fechada"; a escolha fica em ui_dobras. */
(function () {
  function ler() { try { return JSON.parse(localStorage.getItem("ui_dobras") || "{}") || {}; } catch (e) { return {}; } }
  function aplicar(raiz) { var est = ler(); (raiz || document).querySelectorAll("[data-seta]").forEach(function (t) { var k = t.getAttribute("data-seta"), f = est[k] === 0 || (est[k] !== 1 && t.getAttribute("data-seta-padrao") === "fechada");
    if (t.getAttribute("data-seta-forcar") === "aberta") f = false; t.classList.toggle("fechada", f); t.setAttribute("role", "button"); t.setAttribute("tabindex", "0"); t.setAttribute("aria-expanded", String(!f)); }); }
  function alternar(t) { var f = !t.classList.contains("fechada"), est = ler(); est[t.getAttribute("data-seta")] = f ? 0 : 1; try { localStorage.setItem("ui_dobras", JSON.stringify(est)); } catch (e) {} t.classList.toggle("fechada", f); t.setAttribute("aria-expanded", String(!f)); }
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-seta]"); if (t && !e.target.closest("button,a,input,select,textarea")) alternar(t); });
  document.addEventListener("keydown", function (e) { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-seta]")) { e.preventDefault(); alternar(e.target); } });
  var t0 = 0; try { new MutationObserver(function () { clearTimeout(t0); t0 = setTimeout(function () { aplicar(document); }, 30); }).observe(document.documentElement, {childList: true, subtree: true}); } catch (e) {}
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { aplicar(document); }); else aplicar(document);
  window.BWDobras = {aplicar: aplicar};
})();
