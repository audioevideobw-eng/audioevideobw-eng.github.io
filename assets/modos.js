/* TESTES E SOLUÇÕES (22/11): quando esta página roda DENTRO da página teste.html (iframe da mesma origem), cada erro de JavaScript é
   avisado à página de testes — modos.js é o 1º script de toda página, então pega até erro do começo do carregamento. Fora disso, não faz nada. */
(function () { try { if (window.parent === window || !window.parent.__bwDiag) return; var avisa = window.parent.__bwDiag;
  window.addEventListener("error", function (e) { avisa({ msg: e.message || "erro", onde: (e.filename || "").split("/").pop() + ":" + (e.lineno || 0) }); });
  window.addEventListener("unhandledrejection", function (e) { var r = e.reason; avisa({ msg: "promessa: " + (r && r.message || String(r)).slice(0, 160), onde: "" }); }); } catch (x) {} })();
/* MODOS DE APARÊNCIA (20/11/2026, Claude — pedido do dono: "o usuário escolhe o modo: dark, clean, futurista… natal, ano novo… ou com a marca
   do cliente; deixe fácil incluir modelos no futuro").

   COMO INCLUIR UM MODO NOVO: acrescente UM item na lista MODOS, logo abaixo. Só isso — ele aparece sozinho em CONFIGURAÇÕES › APARÊNCIA.
     id      nome curto sem espaço (fica guardado no aparelho)
     nome    o que aparece no cartão            grupo  "SIMPLES" | "VIDRO E LUZ" | "JOGOS" | "OUSADOS" | "DATAS ESPECIAIS"
     base    "escuro" ou "claro"                frase  uma linha que explica o modo
     cores   fundo, cartao, linha, texto, destaque, destaque2 (2ª cor dos brilhos), menu  — o resto é calculado
     fundoCss (opcional) um degradê para o fundo da página
     estilo  (opcional) "vidro" = cartões de vidro com borda de luz na cor do modo (galerias, telas do Início e menu acompanham)
     fx      (opcional) efeitos animados: "neon" (bordas de luz que giram) · "aurora" (luzes de fundo que se movem) · "estrelas" ·
             "neve" · "fogos" · "pisca" (cordão de luzes no topo) · "confete" · "pixels" · "brasas" · "velocidade" · "grade" (sol e pista de luz no Início) · "radar"
   O modo "dark" é o visual de sempre: não muda nada na página. A escolha fica só no aparelho (ui_modo) — nada vai para a conta.
   Este arquivo é carregado no <head> de todas as páginas, antes de desenhar, para a página já nascer na cor certa. */
(function () {
  "use strict";
  /* MODOS DE VIDRO EM OUTRA COR: uma linha. vidro(id, NOME, frase, fundo, destaque, 2ª cor) — fundo quase preto puxado para a cor. */
  function vidro(id, nome, frase, fundo, d, d2) {
    var a = function (h, o) { h = h.replace("#", ""); return "rgba(" + parseInt(h.substr(0, 2), 16) + "," + parseInt(h.substr(2, 2), 16) + "," + parseInt(h.substr(4, 2), 16) + "," + o + ")"; };
    return {id: id, nome: nome, grupo: "VIDRO E LUZ", base: "escuro", estilo: "vidro", frase: frase,
      cores: {fundo: fundo, cartao: vmix(fundo, "#ffffff", 0.06), linha: vmix(fundo, d, 0.26), texto: "#FFFFFF", destaque: d, destaque2: d2, menu: vmix(fundo, "#000000", 0.3)},
      fundoCss: "radial-gradient(900px 520px at 88% -8%," + a(d, 0.2) + ",transparent 62%),radial-gradient(760px 480px at -4% 30%," + a(d2, 0.11) + ",transparent 62%),radial-gradient(700px 460px at 60% 110%," + a(d, 0.1) + ",transparent 60%)," + fundo,
      fx: ["neon", "aurora"]};
  }
  /* MODOS DE JOGOS: o mesmo vidro, com cenário e efeito de gênero (corrida, tático, arcade…). jogo(id, NOME, frase, fundo, destaque, 2ª cor, fx).
     São temas ORIGINAIS de gênero: nada de nome, letreiro, personagem ou mapa de jogo de verdade. */
  /* extras (opcionais, servem para qualquer modo): fonte = letra dos títulos (Google Fonts) · robo = filtro de cor do robô · cena = cenário do Início (modos.css) */
  function jogo(id, nome, frase, fundo, d, d2, fx, extra) { var m = vidro(id, nome, frase, fundo, d, d2), k; m.grupo = "JOGOS"; m.fx = fx; for (k in (extra || {})) m[k] = extra[k]; return m; }
  function vmix(x, y, t) { var f = function (h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }, A = f(x), B = f(y);
    return "#" + [0, 1, 2].map(function (i) { var v = Math.round(A[i] + (B[i] - A[i]) * t); return (v < 16 ? "0" : "") + v.toString(16); }).join(""); }
  var MODOS = [
    {id: "dark", nome: "DARK", grupo: "SIMPLES", base: "escuro", frase: "O visual de sempre: preto com âmbar.",
      cores: {fundo: "#06080D", cartao: "#11141B", linha: "#262B36", texto: "#F5F1EA", destaque: "#FFB547", destaque2: "#3FD0E0", menu: "#0A0D13"}},
    {id: "pb", nome: "PRETO E BRANCO", grupo: "SIMPLES", base: "claro", frase: "Só o essencial: fundo branco, letras pretas.",
      cores: {fundo: "#F4F4F5", cartao: "#FFFFFF", linha: "#DCDCE0", texto: "#111114", destaque: "#111114", destaque2: "#6B6B73", menu: "#0B0B0D"}},
    {id: "azul", nome: "AZUL E BRANCO", grupo: "SIMPLES", base: "claro", frase: "Claro e sério, com azul nos destaques.",
      cores: {fundo: "#F1F5FF", cartao: "#FFFFFF", linha: "#D6E0F7", texto: "#0F1B3D", destaque: "#1F5EFF", destaque2: "#12B5E5", menu: "#0E2A6E"}},
    {id: "clean", nome: "CLEAN", grupo: "SIMPLES", base: "claro", frase: "Branco, leve e colorido, com menu escuro e roxo nos destaques.",
      cores: {fundo: "#F6F7FB", cartao: "#FFFFFF", linha: "#E6E8F2", texto: "#171A2C", destaque: "#6C4DF6", destaque2: "#19B36B", menu: "#14163A"},
      fundoCss: "linear-gradient(180deg,#F8F8FE,#F2F4FB)"},
    {id: "brancodourado", nome: "BRANCO E DOURADO", grupo: "SIMPLES", base: "claro", frase: "Branco, menu preto e detalhes em dourado.",
      cores: {fundo: "#FAF8F3", cartao: "#FFFFFF", linha: "#E8E1D0", texto: "#15130E", destaque: "#B8902F", destaque2: "#DDBB5E", menu: "#0B0B0D"}},
    {id: "verdebranco", nome: "VERDE E BRANCO", grupo: "SIMPLES", base: "claro", frase: "Branco, menu preto e verde nos destaques.",
      cores: {fundo: "#F3F8F4", cartao: "#FFFFFF", linha: "#D5E6DA", texto: "#0C1710", destaque: "#15803D", destaque2: "#34C46A", menu: "#080C09"}},
    {id: "vermelhobranco", nome: "VERMELHO E BRANCO", grupo: "SIMPLES", base: "claro", frase: "Branco, menu preto e vermelho nos destaques.",
      cores: {fundo: "#FAF5F5", cartao: "#FFFFFF", linha: "#EBD9DA", texto: "#190D0E", destaque: "#D92D3A", destaque2: "#F2757E", menu: "#0D0909"}},
    {id: "laranjabranco", nome: "LARANJA E BRANCO", grupo: "SIMPLES", base: "claro", frase: "Branco, menu escuro e laranja nos destaques.",
      cores: {fundo: "#FBF7F2", cartao: "#FFFFFF", linha: "#ECDFD0", texto: "#1A120A", destaque: "#E8650E", destaque2: "#F5A04D", menu: "#120D08"}},
    /* VIDRO E LUZ: o mesmo layout de vidro com borda de luz, numa cor por modo — para quem quer a cara da própria marca */
    vidro("vidrociano", "VIDRO CIANO", "Preto azulado com vidro e luz ciano.", "#050B10", "#3FE0E0", "#5B9DFF"),
    vidro("pretodourado", "PRETO E DOURADO", "Preto, branco e detalhes em dourado.", "#08070A", "#D9B24C", "#F6E3A6"),
    vidro("verdepreto", "VERDE E PRETO", "Preto, branco e verde nos destaques.", "#050A07", "#22C55E", "#B9F5CF"),
    vidro("azulpreto", "AZUL E PRETO", "Preto, branco e azul nos destaques.", "#05070F", "#3B82F6", "#A5C8FF"),
    vidro("vermelhopreto", "VERMELHO E PRETO", "Preto, branco e vermelho nos destaques.", "#0B0607", "#FF3B4E", "#FFB8BF"),
    vidro("laranjapreto", "LARANJA E PRETO", "Preto, branco e laranja nos destaques.", "#0B0805", "#FF7A1A", "#FFD39A"),
    vidro("roxopreto", "ROXO E PRETO", "Preto, branco e roxo nos destaques.", "#09060F", "#A855F7", "#E9C8FF"),
    vidro("rosapreto", "ROSA E PRETO", "Preto, branco e rosa nos destaques.", "#0C060A", "#FF4F9A", "#FFC2DC"),
    vidro("pratapreto", "PRETO E PRATA", "Preto, branco e cinza: sem cor, só brilho.", "#07080A", "#E6E8EC", "#9AA3B2"),
    jogo("neon80", "NEON 80", "Noite de cidade em rosa e laranja, com sol de arcade e pista de luz.", "#0D0618", "#FF4FB8", "#FFA24A", ["grade", "neon", "aurora"], {fonte: "Audiowide", robo: "hue-rotate(95deg) saturate(1.25)", cena: "neon80"}),
    jogo("tatico", "TÁTICO", "Verde-oliva e areia, com radar de missão varrendo a tela.", "#0A0D08", "#9BD14B", "#D9C27A", ["radar", "neon"], {fonte: "Saira Stencil One", robo: "hue-rotate(-125deg) saturate(.75) brightness(.95)", cena: "tatico"}),
    jogo("arcade", "ARCADE 8-BIT", "Fliperama: amarelo e azul, com blocos de pixel caindo.", "#070A1F", "#FFD23F", "#3FA9FF", ["pixels", "neon"], {fonte: "Press Start 2P", robo: "hue-rotate(190deg) saturate(1.2)", cena: "arcade"}),
    jogo("corrida", "CORRIDA", "Vermelho, preto e branco, com riscos de velocidade.", "#0B0707", "#FF2D2D", "#F4F4F4", ["velocidade", "neon"], {fonte: "Racing Sans One", robo: "hue-rotate(140deg) saturate(1.3)"}),
    jogo("fantasia", "FANTASIA", "Roxo e dourado, com brasas subindo e estrelas.", "#0C0714", "#E8B84A", "#A66BFF", ["brasas", "estrelas", "neon"], {fonte: "Cinzel Decorative", robo: "hue-rotate(55deg)"}),
    jogo("espacial", "ESPACIAL", "Azul profundo, estrelas e luzes de nebulosa.", "#04060F", "#5CE1FF", "#B48CFF", ["estrelas", "aurora", "neon"], {fonte: "Orbitron"}),
    {id: "futurista", nome: "FUTURISTA", grupo: "OUSADOS", base: "escuro", frase: "Vidro, neon ciano e roxo e luzes em movimento.",
      cores: {fundo: "#050816", cartao: "#0C1330", linha: "#1E2A5A", texto: "#EAF2FF", destaque: "#3FE0FF", destaque2: "#A78BFA", menu: "#070B1E"},
      fundoCss: "radial-gradient(900px 520px at 85% -10%,rgba(124,92,255,.22),transparent 60%),radial-gradient(800px 500px at 0% 20%,rgba(40,170,255,.16),transparent 60%),#050816",
      fx: ["neon", "aurora", "estrelas"]},
    {id: "aconchego", nome: "ACONCHEGO", grupo: "OUSADOS", base: "escuro", frase: "Escuro e quente, laranja e verde, como uma sala à noite.",
      cores: {fundo: "#14110E", cartao: "#1F1A15", linha: "#3A2F25", texto: "#F6EDE2", destaque: "#FF8A3D", destaque2: "#5FD39A", menu: "#100D0A"},
      fundoCss: "radial-gradient(900px 520px at 90% 0%,rgba(255,138,61,.16),transparent 60%),radial-gradient(700px 480px at 0% 100%,rgba(95,211,154,.10),transparent 60%),#14110E",
      fx: ["neon", "aurora"]},
    {id: "natal", nome: "NATAL", grupo: "DATAS ESPECIAIS", base: "escuro", frase: "Verde, vermelho e dourado, com neve caindo e luzes piscando.",
      cores: {fundo: "#07140F", cartao: "#0E2219", linha: "#1F4A36", texto: "#FFF7EC", destaque: "#F04B4B", destaque2: "#F5C451", menu: "#06100C"},
      fundoCss: "radial-gradient(900px 500px at 50% -10%,rgba(240,75,75,.16),transparent 60%),#07140F", fx: ["neve", "pisca", "neon"]},
    {id: "anonovo", nome: "ANO NOVO", grupo: "DATAS ESPECIAIS", base: "escuro", frase: "Noite de festa: dourado, brilho e fogos de artifício.",
      cores: {fundo: "#07060F", cartao: "#121024", linha: "#2B2750", texto: "#FFF9EA", destaque: "#F5C451", destaque2: "#C9B6FF", menu: "#05040B"},
      fundoCss: "radial-gradient(900px 500px at 50% 0%,rgba(245,196,81,.14),transparent 60%),#07060F", fx: ["fogos", "estrelas", "neon"]},
    {id: "festa", nome: "FESTA", grupo: "DATAS ESPECIAIS", base: "escuro", frase: "Para comemorar: rosa, roxo e confete.",
      cores: {fundo: "#0D0716", cartao: "#1A0F2B", linha: "#3A2460", texto: "#FFF4FD", destaque: "#FF5FB7", destaque2: "#7CF3FF", menu: "#0A0512"},
      fundoCss: "radial-gradient(900px 500px at 15% 0%,rgba(255,95,183,.18),transparent 60%),radial-gradient(800px 500px at 100% 30%,rgba(124,243,255,.12),transparent 60%),#0D0716",
      fx: ["confete", "neon", "aurora"]}
  ];
  /* páginas já ajustadas para fundo CLARO. Nas outras (e nos editores, onde a mídia pede fundo escuro) um modo claro muda o menu e os
     destaques, e o miolo da ferramenta continua escuro. Página nova ajustada → acrescentar aqui. */
  var CLARO_OK = {index: 1, negocio: 1, casa: 1, lancamentos: 1, config: 1, ferramentas: 1, marketing: 1, crm: 1, "financeiro-painel": 1, "investimentos-painel": 1};
  var R = document.documentElement, PAG = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";

  function ler(k, p) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? p : v; } catch (e) { return p; } }
  function gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function rgb(h) { h = String(h || "").replace("#", ""); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return isNaN(n) || h.length !== 6 ? [128, 128, 128] : [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function hex(c) { return "#" + c.map(function (x) { x = Math.max(0, Math.min(255, Math.round(x))); return (x < 16 ? "0" : "") + x.toString(16); }).join(""); }
  function mix(a, b, t) { a = rgb(a); b = rgb(b); return hex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
  function luz(h) { var c = rgb(h); return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function meus() { var l = ler("ui_modos_meus", []); return Array.isArray(l) ? l.filter(function (m) { return m && m.id && m.cores; }) : []; }
  function lista() { return MODOS.concat(meus().map(function (m) { m.grupo = "MINHA MARCA"; m.meu = true; return m; })); }
  function achar(id) { return lista().filter(function (m) { return m.id === id; })[0] || MODOS[0]; }
  /* MODO COM A MARCA DO CLIENTE: de 3 cores (destaque, menu, fundo) sai o modo inteiro */
  function montar(o) {
    var claro = o.base === "claro", dest = o.destaque || "#1F5EFF", fundo = o.fundo || (claro ? "#F5F6FA" : "#090B12");
    return {id: o.id || ("meu_" + Date.now()), nome: String(o.nome || "MINHA MARCA").toUpperCase().slice(0, 24), base: claro ? "claro" : "escuro", frase: "Modo criado com as cores da sua marca.",
      cores: {fundo: fundo, cartao: claro ? "#FFFFFF" : mix(fundo, "#ffffff", 0.07), linha: mix(fundo, claro ? "#000000" : "#ffffff", claro ? 0.12 : 0.16), texto: claro ? "#14161F" : "#F4F2EC",
        destaque: dest, destaque2: o.destaque2 || mix(dest, claro ? "#000000" : "#ffffff", 0.35), menu: o.menu || (claro ? mix(dest, "#000000", 0.72) : mix(fundo, "#000000", 0.35))},
      fx: o.fx || [], logo: o.logo || "", estilo: o.estilo === "vidro" && !claro ? "vidro" : "",
      fundoCss: o.estilo === "vidro" && !claro ? "radial-gradient(900px 520px at 88% -8%,rgba(" + rgb(dest).join(",") + ",.2),transparent 62%),radial-gradient(760px 480px at -4% 30%,rgba(" + rgb(o.destaque2 || dest).join(",") + ",.11),transparent 62%)," + fundo : ""};
  }
  function paleta(m) {
    var c = m.cores, claro = m.base === "claro", tx = c.texto, mt = luz(c.menu) > 0.6;
    return {fundo: c.fundo, cartao: c.cartao, cartao2: mix(c.cartao, claro ? "#000000" : "#ffffff", claro ? 0.04 : 0.06), linha: c.linha, texto: tx, texto2: mix(tx, c.fundo, 0.25), texto3: mix(tx, c.fundo, 0.48),
      dest: c.destaque, dest2: c.destaque2 || c.destaque, destRgb: rgb(c.destaque).join(","), dest2Rgb: rgb(c.destaque2 || c.destaque).join(","), tinta: luz(c.destaque) > 0.6 ? "#0B0D14" : "#FFFFFF",
      menu: c.menu, menuTxt: mt ? mix(c.menu, "#000000", 0.7) : mix(c.menu, "#ffffff", 0.74), menuForte: mt ? "#0B0D14" : "#FFFFFF", menuLinha: mix(c.menu, mt ? "#000000" : "#ffffff", 0.12),
      fundoCss: m.fundoCss || c.fundo, claro: claro};
  }
  /* 22/11 (dono): PRETO E BRANCO é o modo de quem ainda não escolheu nenhum (ui_modo vazio) */
  var PADRAO = "pb";
  /* 22/11 (dono): dentro do app BW do PC (window.BW_APP, posto antes da página) somem as opções que só fazem sentido na web (.so-web) */
  if (window.BW_APP) { R.classList.add("bw-no-app"); try { var st = document.createElement("style"); st.textContent = "html.bw-no-app .so-web{display:none!important}"; (document.head || R).appendChild(st); } catch (e) { } }
  /* 24/11 (dono): dentro do app BW do ANDROID (Capacitor; user agent com "BW-Android") carrega o ajuste do app — downloads viram arquivo de verdade */
  if (/BW-Android/.test(navigator.userAgent)) { try { var sa = document.createElement("script"); sa.src = (document.currentScript && document.currentScript.src || "assets/modos.js").replace(/modos\.js.*$/, "bw-android.js?v=2"); (document.head || R).appendChild(sa); } catch (e) { } }
  var VARS = [];
  function limpar() { VARS.forEach(function (v) { R.style.removeProperty(v); }); VARS = []; ["data-modo", "data-base", "data-conteudo", "data-fx", "data-estilo", "data-cena", "data-fonte"].forEach(function (a) { R.removeAttribute(a); }); }
  function def(o) { Object.keys(o).forEach(function (k) { R.style.setProperty(k, o[k]); VARS.push(k); }); }
  function aplicar(id, soVer) {
    var m = achar(id), p = paleta(m); limpar(); pararFx();
    if (!soVer) gravar("ui_modo", m.id);
    if (m.id === "dark") { avisar(m); return m; }
    var miolo = !p.claro || CLARO_OK[PAG];   /* modo claro numa ferramenta ainda escura: só o menu e os destaques mudam */
    R.setAttribute("data-modo", m.id); R.setAttribute("data-base", m.base); R.setAttribute("data-conteudo", miolo ? m.base : "escuro");
    if (m.estilo) R.setAttribute("data-estilo", m.estilo);
    if (m.cena) R.setAttribute("data-cena", m.cena);
    if (m.robo) def({"--m-robo": m.robo});
    if (m.fonte) { R.setAttribute("data-fonte", "1"); def({"--m-fonte": "'" + m.fonte + "'"});   /* a letra do modo: um arquivo de fonte só, pedido quando o modo liga */
      var idf = "bwFonte_" + m.fonte.replace(/\W/g, ""); if (!document.getElementById(idf)) { var lf = document.createElement("link"); lf.id = idf; lf.rel = "stylesheet"; lf.href = "https://fonts.googleapis.com/css2?family=" + m.fonte.replace(/ /g, "+") + "&display=swap"; (document.head || R).appendChild(lf); } }
    def({"--m-menu": p.menu, "--m-menu-txt": p.menuTxt, "--m-menu-forte": p.menuForte, "--m-menu-linha": p.menuLinha, "--m-dest": p.dest, "--m-dest2": p.dest2, "--m-dest-rgb": p.destRgb, "--m-dest2-rgb": p.dest2Rgb, "--m-tinta": p.tinta});
    if (miolo) def({"--m-fundo": p.fundo, "--m-fundo-css": p.fundoCss, "--m-cartao": p.cartao, "--m-cartao2": p.cartao2, "--m-linha": p.linha, "--m-texto": p.texto, "--m-texto2": p.texto2, "--m-texto3": p.texto3,
      /* nomes que as páginas já usam */
      "--navy": p.fundo, "--navy2": p.cartao, "--navy3": p.cartao2, "--line": p.linha, "--gold": p.dest, "--gold2": p.claro ? mix(p.dest, "#000000", 0.18) : mix(p.dest, "#ffffff", 0.6), "--txt": p.texto, "--mut": p.texto3,
      "--ciano": p.dest2, "--bw-noite": p.claro ? p.tinta : p.fundo, "--bw-grafite": p.cartao, "--bw-marfim": p.texto, "--bw-texto-2": p.texto2, "--bw-texto-3": p.texto3, "--bw-ambar": p.dest,
      "--bw-ambar-escuro": mix(p.dest, "#000000", 0.3), "--bw-brilho": p.claro ? p.texto : mix(p.dest, "#ffffff", 0.8), "--bw-ciano": p.dest2,
      "--bw-card-bg": p.claro ? p.cartao : "rgba(255,255,255,.04)", "--bw-card-borda": p.linha, "--card-bg": p.claro ? p.cartao : "rgba(255,255,255,.04)", "--card-borda": p.linha});
    else def({"--gold": p.claro ? mix(p.dest, "#ffffff", 0.35) : p.dest, "--bw-ambar": p.claro ? mix(p.dest, "#ffffff", 0.35) : p.dest});
    var fx = ler("ui_modo_fx", 1) && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) ? (m.fx || []) : [];
    R.setAttribute("data-fx", fx.join(" "));
    var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute("content", miolo ? p.fundo : "#06080D");
    if (fx.length) quandoPronto(function () { ligarFx(fx, p); });
    avisar(m); return m;
  }
  function avisar(m) { try { window.dispatchEvent(new CustomEvent("bw-modo", {detail: {id: m.id}})); } catch (e) { } }
  function quandoPronto(f) { if (document.body) f(); else document.addEventListener("DOMContentLoaded", f); }

  /* ---------- efeitos em tela (leves: um canvas só, poucas partículas, param com a aba escondida) ---------- */
  var cv = null, raf = 0, parts = [], FX = [], PAL = null, ultimo = 0, prox = 0;
  function pararFx() { if (raf) cancelAnimationFrame(raf); raf = 0; parts = []; if (cv) { cv.remove(); cv = null; } }
  function ligarFx(fx, p) {
    FX = fx.filter(function (f) { return /^(neve|fogos|estrelas|confete|pixels|brasas|velocidade)$/.test(f); }); PAL = p; if (!FX.length || cv) return;
    cv = document.createElement("canvas"); cv.id = "bwFx"; cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:58";
    document.body.appendChild(cv); medir(); window.addEventListener("resize", medir);
    var pequeno = window.innerWidth < 700, i;
    if (FX.indexOf("neve") >= 0) for (i = 0; i < (pequeno ? 26 : 60); i++) parts.push(floco(true));
    if (FX.indexOf("confete") >= 0) for (i = 0; i < (pequeno ? 18 : 40); i++) parts.push(papel(true));
    if (FX.indexOf("estrelas") >= 0) for (i = 0; i < (pequeno ? 26 : 60); i++) parts.push({t: "e", x: Math.random(), y: Math.random() * 0.75, r: 0.5 + Math.random() * 1.3, f: Math.random() * 6.28, v: 0.6 + Math.random() * 1.6});
    if (FX.indexOf("pixels") >= 0) for (i = 0; i < (pequeno ? 16 : 34); i++) parts.push(bloco(true));
    if (FX.indexOf("brasas") >= 0) for (i = 0; i < (pequeno ? 16 : 36); i++) parts.push(brasa(true));
    if (FX.indexOf("velocidade") >= 0) for (i = 0; i < (pequeno ? 10 : 22); i++) parts.push(risco(true));
    ultimo = performance.now(); raf = requestAnimationFrame(quadro);
  }
  function medir() { if (!cv) return; var d = Math.min(window.devicePixelRatio || 1, 1.5); cv.width = Math.round(window.innerWidth * d); cv.height = Math.round(window.innerHeight * d); cv._d = d; }
  function floco(novo) { return {t: "n", x: Math.random(), y: novo ? Math.random() : -0.03, r: 1 + Math.random() * 2.6, vy: 0.03 + Math.random() * 0.06, f: Math.random() * 6.28, a: 0.45 + Math.random() * 0.5}; }
  function papel(novo) { var cs = [PAL.dest, PAL.dest2, "#FFD86B", "#FFFFFF", "#7CF3FF"]; return {t: "c", x: Math.random(), y: novo ? Math.random() : -0.03, w: 5 + Math.random() * 6, vy: 0.05 + Math.random() * 0.08, f: Math.random() * 6.28, g: Math.random() * 6.28, c: cs[Math.floor(Math.random() * cs.length)]}; }
  function bloco(novo) { var cs = [PAL.dest, PAL.dest2, "#FF5C8A", "#5CFF9B"]; return {t: "p", x: Math.floor(Math.random() * 40) / 40, y: novo ? Math.random() : -0.04, s: 6 + Math.floor(Math.random() * 3) * 4, vy: 0.05 + Math.random() * 0.09, a: 0.25 + Math.random() * 0.45, c: cs[Math.floor(Math.random() * cs.length)], k: 0}; }
  function brasa(novo) { return {t: "b", x: Math.random(), y: novo ? Math.random() : 1.03, r: 0.8 + Math.random() * 1.8, vy: 0.03 + Math.random() * 0.06, f: Math.random() * 6.28, a: 0.4 + Math.random() * 0.5}; }
  function risco(novo) { return {t: "v", x: novo ? Math.random() : -0.2, y: Math.random(), w: 0.05 + Math.random() * 0.14, vx: 0.5 + Math.random() * 0.9, a: 0.12 + Math.random() * 0.3, c: Math.random() < 0.6 ? PAL.dest : PAL.dest2}; }
  function estouro() {
    var cs = [PAL.dest, PAL.dest2, "#FFFFFF", "#FF7AB6", "#7CF3FF"], c = cs[Math.floor(Math.random() * cs.length)], x = 0.12 + Math.random() * 0.76, y = 0.1 + Math.random() * 0.32, n = window.innerWidth < 700 ? 22 : 38;
    for (var i = 0; i < n; i++) { var a = i / n * 6.283, v = 0.07 + Math.random() * 0.1; parts.push({t: "f", x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, c: c}); }
  }
  function quadro(agora) {
    raf = requestAnimationFrame(quadro); if (document.hidden || !cv) { ultimo = agora; return; }
    var dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    var g = cv.getContext("2d"), W = cv.width, H = cv.height, d = cv._d || 1, razao = W / H; g.clearRect(0, 0, W, H);
    if (FX.indexOf("fogos") >= 0 && agora > prox) { estouro(); prox = agora + 1400 + Math.random() * 2600; }
    for (var i = parts.length - 1; i >= 0; i--) { var q = parts[i];
      if (q.t === "n") { q.y += q.vy * dt; q.f += dt; q.x += Math.sin(q.f) * 0.0006; if (q.y > 1.03) parts[i] = floco(false);
        g.globalAlpha = q.a; g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x * W, q.y * H, q.r * d, 0, 6.283); g.fill(); }
      else if (q.t === "c") { q.y += q.vy * dt; q.f += dt * 2; q.g += dt * 5; q.x += Math.sin(q.f) * 0.0009; if (q.y > 1.03) parts[i] = papel(false);
        g.globalAlpha = 0.9; g.fillStyle = q.c; g.save(); g.translate(q.x * W, q.y * H); g.rotate(q.f); g.fillRect(-q.w * d / 2, -q.w * d * 0.3 * Math.abs(Math.cos(q.g)), q.w * d, q.w * d * 0.6 * Math.abs(Math.cos(q.g)) + 1); g.restore(); }
      else if (q.t === "e") { q.f += dt * q.v; g.globalAlpha = 0.25 + 0.55 * Math.abs(Math.sin(q.f)); g.fillStyle = "#fff"; g.beginPath(); g.arc(q.x * W, q.y * H, q.r * d, 0, 6.283); g.fill(); }
      else if (q.t === "p") { q.k += dt; if (q.k > 0.09) { q.k = 0; q.y += q.vy * 0.09; } if (q.y > 1.04) parts[i] = bloco(false);   /* cai aos pulinhos, como sprite */
        g.globalAlpha = q.a; g.fillStyle = q.c; g.fillRect(Math.round(q.x * W), Math.round(q.y * H), q.s * d, q.s * d); }
      else if (q.t === "b") { q.y -= q.vy * dt; q.f += dt * 1.6; q.x += Math.sin(q.f) * 0.0008; if (q.y < -0.03) parts[i] = brasa(false);
        g.globalAlpha = q.a * (0.55 + 0.45 * Math.sin(q.f * 3)); g.fillStyle = PAL.dest; g.shadowColor = PAL.dest; g.shadowBlur = 6 * d; g.beginPath(); g.arc(q.x * W, q.y * H, q.r * d, 0, 6.283); g.fill(); g.shadowBlur = 0; }
      else if (q.t === "v") { q.x += q.vx * dt; if (q.x > 1.1) parts[i] = risco(false);
        g.globalAlpha = q.a; g.fillStyle = q.c; g.fillRect(q.x * W, q.y * H, q.w * W, 1.5 * d); }
      else { q.x += q.vx * dt / razao; q.y += q.vy * dt; q.vy += 0.07 * dt; q.vx *= 0.985; q.vida -= dt * 0.75; if (q.vida <= 0) { parts.splice(i, 1); continue; }
        g.globalAlpha = Math.max(0, q.vida); g.fillStyle = q.c; g.beginPath(); g.arc(q.x * W, q.y * H, 2.1 * d, 0, 6.283); g.fill(); } }
    g.globalAlpha = 1;
  }

  /* folha de estilo dos modos (as regras só valem quando há data-modo) */
  try { var lk = document.createElement("link"); lk.rel = "stylesheet"; lk.href = "assets/modos.css?v=5"; (document.head || R).appendChild(lk); } catch (e) { }
  /* cor de uma variável da página (gráficos desenhados em canvas não leem CSS sozinhos) */
  window.__cv = function (v, p) { try { return getComputedStyle(R).getPropertyValue(v).trim() || p; } catch (e) { return p; } };
  window.BWModos = {lista: lista, achar: achar, aplicar: aplicar, paleta: paleta, montar: montar, atual: function () { return achar(ler("ui_modo", PADRAO)).id; },
    animado: function () { return !!ler("ui_modo_fx", 1); }, animar: function (v) { gravar("ui_modo_fx", v ? 1 : 0); aplicar(ler("ui_modo", PADRAO)); },
    salvarMeu: function (o) { var m = montar(o), l = meus().filter(function (x) { return x.id !== m.id; }); l.push(m); gravar("ui_modos_meus", l); return m; },
    apagarMeu: function (id) { gravar("ui_modos_meus", meus().filter(function (x) { return x.id !== id; })); if (ler("ui_modo", PADRAO) === id) aplicar(PADRAO); }};
  aplicar(ler("ui_modo", PADRAO), true);
  window.addEventListener("storage", function (e) { if (e.key === "ui_modo" || e.key === "ui_modos_meus" || e.key === "ui_modo_fx") aplicar(ler("ui_modo", PADRAO), true); });   /* outra aba trocou o modo */
})();

/* 23/11/2026 (dono, iPhone 13 Pro com o app instalado: "ainda aparece a névoa branca na parte superior; no Android não"): desde o iOS 26.1 o app da
   tela de início ganha um desfoque "Liquid Glass" no topo, por cima da página — theme-color e apple-mobile-web-app-status-bar-style não desligam.
   O WebKit (LocalFrameView::fixedContainerEdges) só pinta o topo de cor SÓLIDA quando acha ali uma caixa fixa, opaca, sem backdrop-filter, com
   ≥ 90% da largura e > 10 px de altura. Então: no iPhone/iPad instalado, uma faixa fixa e opaca no topo, na cor do fundo da página (toque passa direto). */
(function () {
  var R = document.documentElement, ua = navigator.userAgent || "";
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var inst = navigator.standalone === true || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches));
  if (!(ios && inst) && !/[?&]iosapp=1/.test(location.search)) return;   /* ?iosapp=1 só para o teste automático */
  R.classList.add("ios-app");
  var st = document.createElement("style");
  st.textContent = "#bwTopoIos{position:fixed;top:0;left:0;right:0;height:calc(env(safe-area-inset-top,0px) + 12px);z-index:2147483000;pointer-events:none;background:#0b0c10}" +
    "html.ios-app .va,html.ios-app .ma{padding-top:calc(env(safe-area-inset-top,0px) + 12px)}html.ios-app body{padding-top:12px}html.ios-app.bw-foco .bw-foco-barra{top:12px}";
  (document.head || R).appendChild(st);
  function cor() { var b = document.body; if (!b) return "#0b0c10"; var c = getComputedStyle(b).backgroundColor;
    if (!c || /rgba\(.*,\s*0\)$|transparent/.test(c)) c = getComputedStyle(R).backgroundColor; if (!c || /rgba\(.*,\s*0\)$|transparent/.test(c)) c = "#0b0c10";
    return c.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, "rgb($1,$2,$3)"); }   /* sempre opaca — com transparência o iPhone volta a desfocar */
  function por() { if (!document.body) return; var f = document.getElementById("bwTopoIos"); if (!f) { f = document.createElement("div"); f.id = "bwTopoIos"; f.setAttribute("aria-hidden", "true"); document.body.appendChild(f); }
    var c = cor(); if (f.style.background !== c) f.style.background = c; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", por); else por();
  try { new MutationObserver(function () { clearTimeout(por._t); por._t = setTimeout(por, 60); }).observe(R, {attributes: true, attributeFilter: ["class", "data-modo"]}); } catch (e) {}
  setTimeout(por, 1500);
})();
