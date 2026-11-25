/* TUTORIAIS (25/11/2026, Claude — pedido do dono): "uma aba só com tutoriais, passo a passo, com vídeos de demonstração, explicações
   simples e objetivas e muito organizado". Catálogo em TUT (tutorial novo = um item na lista). Cada passo tem uma TELA desenhada
   (onde, botões, qual tocar, o que digitar) e o PLAYER mostra a demonstração animada: o cursor vai até o botão certo, toca, e segue.
   Item com `video` (MP4 nosso em assets/tutoriais/) mostra também a gravação de tela. Tutorial com `conectar` traz o painel de
   conexão de verdade (assets/minhas-ias.js) — dá para conectar ali mesmo, sem sair da página. Não lê nem grava dados da conta. */
(function () {
  "use strict";
  var CATS = [
    { id: "comecar", ic: "🚀", nome: "COMEÇAR", cor: "#4C8DFF" },
    { id: "ias", ic: "🔌", nome: "CONECTAR MINHAS IAS", cor: "#E8B54A" },
    { id: "video", ic: "🎬", nome: "EDITOR DE VÍDEO", cor: "#FF5C8A" },
    { id: "fotos", ic: "📸", nome: "FOTOS E ARTES", cor: "#B07CFF" },
    { id: "gestao", ic: "💼", nome: "GESTÃO", cor: "#2FD08A" }
  ];
  var BW = function (p) { return "Brightway · " + p; };
  var TUT = [
    { id: "instalar-app", cat: "comecar", ic: "📲", titulo: "Instalar o app BW", min: 3, nivel: "Fácil",
      resumo: "No computador, no Android ou no iPhone — cada um tem o seu jeito.",
      precisa: ["Internet", "Uns 3 minutos"],
      link: ["downloads.html", "ABRIR DOWNLOADS"],
      passos: [
        { t: "Abra DOWNLOADS", d: "No menu (☰), toque em DOWNLOADS. A página já marca o app certo para o seu aparelho com o selo RECOMENDADO AQUI.",
          tela: { onde: BW("menu"), itens: ["Início", "Lançamentos", "TUTORIAIS", "DOWNLOADS", "MANUAL DO USUÁRIO"], alvo: 3 } },
        { t: "Computador: baixe o .EXE", d: "Toque em BAIXAR, abra o arquivo BW-Setup.exe e avance até o fim. O ícone BW aparece na área de trabalho.",
          tela: { onde: BW("downloads"), itens: ["App BW para Windows · BAIXAR (.EXE)", "App BW para Android", "iPhone e iPad"], alvo: 0 } },
        { t: "Android: baixe o .APK", d: "Toque em BAIXAR O APP ANDROID (.APK). O Android pede para permitir a instalação: permita só para este arquivo. Depois entre com e-mail e senha.",
          tela: { onde: BW("downloads"), itens: ["App BW para Windows", "BAIXAR O APP ANDROID (.APK)", "iPhone e iPad"], alvo: 1 } },
        { t: "iPhone: tela de início", d: "Abra o site no Safari, toque em Compartilhar (quadrado com a seta) e em Adicionar à Tela de Início. Pronto: vira app.",
          tela: { onde: "Safari · compartilhar", itens: ["Copiar", "Adicionar aos Favoritos", "Adicionar à Tela de Início", "Imprimir"], alvo: 2 } }
      ] },
    { id: "tela-inicial", cat: "comecar", ic: "🤖", titulo: "Conhecendo a tela inicial", min: 2, nivel: "Fácil",
      resumo: "O robô, as quatro telas e onde fica cada coisa.",
      link: ["./", "IR PARA O INÍCIO"],
      passos: [
        { t: "As quatro telas", d: "Em volta do robô giram MEU NEGÓCIO, GESTÃO DE CASA, MARKETING e FERRAMENTAS. Toque numa delas para trazê-la para a frente.",
          tela: { onde: BW("início"), itens: ["MEU NEGÓCIO", "GESTÃO DE CASA", "MARKETING", "FERRAMENTAS"], alvo: 2 } },
        { t: "Toque de novo para entrar", d: "Com a tela na frente, um segundo toque abre o ambiente: a empresa, a casa, o marketing ou as ferramentas.",
          tela: { onde: BW("início"), itens: ["MARKETING (na frente)", "MEU NEGÓCIO", "FERRAMENTAS"], alvo: 0 } },
        { t: "Peça pela caixa do Tio Cláudio", d: "Embaixo fica a caixa de pedido: escreva ou fale (🎙) — \"gastei 50 no almoço\", \"como está meu dia\". Ele mostra antes de lançar.",
          tela: { onde: BW("início"), itens: ["＋", "⚡", "Escreva o que precisa…", "🎙", "➤"], alvo: 2, campo: "gastei 50 no almoço" } },
        { t: "Menu e configurações", d: "O ☰ abre o menu com tudo. A engrenagem leva às CONFIGURAÇÕES: seus dados, modos de aparência e as suas IAs.",
          tela: { onde: BW("topo"), itens: ["☰ MENU", "LOGADO", "⚙ CONFIGURAÇÕES"], alvo: 2 } }
      ] },

    { id: "limites-ias", cat: "ias", ic: "⚖️", titulo: "Usar com limite ou com a minha conta?", min: 2, nivel: "Leitura",
      resumo: "Entenda os limites do dia e quando vale conectar a sua própria conta.",
      texto: [
        "As IAs de IMAGEM e de DECUPAGEM já funcionam sem configurar nada, usando a conta da plataforma. Cada pessoa tem um limite por dia: 15 imagens e 200 análises de decupagem. Para a maioria, isso basta.",
        "Se você usa muito, pode CONECTAR A SUA CONTA (grátis) da Cloudflare (imagens) e do Google (decupagem). Aí o uso vai para a sua conta e não conta no limite da plataforma.",
        "Conectada, você escolhe a qualquer momento: USAR MINHA CONTA ou USAR A DA PLATAFORMA. Não precisa desconectar.",
        "A sua chave fica só no aparelho onde você conectou — não vai para a sua conta Brightway nem fica guardada em servidor. Em outro aparelho, conecte de novo (leva 1 minuto).",
        "O Tio Cláudio e as IAs de texto continuam com a conta da plataforma (60 pedidos por dia para cada pessoa)."
      ],
      passos: [
        { t: "Sem conectar: já funciona", d: "Use as ferramentas normalmente. A plataforma avisa se o limite do dia acabar.",
          tela: { onde: BW("editor de fotos"), itens: ["✨ IA", "Pedido: cabelo cacheado", "✨ CRIAR NOVA VERSÃO"], alvo: 2 } },
        { t: "Precisa de mais? Conecte", d: "Configurações → MINHAS IAS, ou os tutoriais de conexão logo abaixo.",
          tela: { onde: BW("configurações"), itens: ["MEUS DADOS", "MINHAS IAS · CONECTAR", "APARÊNCIA"], alvo: 1 } },
        { t: "Escolha qual usar", d: "Depois de conectar, toque em USAR MINHA CONTA ou USAR A DA PLATAFORMA.",
          tela: { onde: BW("minhas IAs"), itens: ["✓ SUA CONTA CONECTADA", "USAR MINHA CONTA", "USAR A DA PLATAFORMA"], alvo: 1 } }
      ] },
    { id: "conectar-cloudflare", cat: "ias", ic: "🎨", titulo: "Imagens com IA: conectar a minha Cloudflare", min: 3, nivel: "Fácil", conectar: "cf",
      resumo: "Crie um token grátis na Cloudflare e cole aqui. O app descobre o resto sozinho.",
      precisa: ["Uma conta grátis na Cloudflare (sem cartão)", "Uns 3 minutos"],
      passos: [
        { t: "Abra a Cloudflare", d: "Toque em 1 · ABRIR A CLOUDFLARE (no painel lá embaixo). Se não tiver conta, crie uma grátis — é só e-mail e senha.",
          tela: { onde: "dash.cloudflare.com", itens: ["Entrar", "Criar conta grátis"], alvo: 0 } },
        { t: "Entre em Workers AI", d: "O link já leva para Workers AI. Se cair no início, procure \"Workers AI\" no menu da esquerda (dentro de AI).",
          tela: { onde: "Cloudflare · menu", itens: ["Account Home", "AI", "Workers AI", "Workers & Pages"], alvo: 2 } },
        { t: "Use REST API", d: "Toque em Use REST API (Usar a API REST).",
          tela: { onde: "Cloudflare · Workers AI", itens: ["Models", "Use REST API", "Playground"], alvo: 1 } },
        { t: "Crie o token", d: "Toque em Create a Workers AI API Token, confira os dados já preenchidos e toque em Create API Token.",
          tela: { onde: "Cloudflare · REST API", itens: ["Create a Workers AI API Token", "Get Account ID"], alvo: 0 } },
        { t: "Copie o token", d: "Toque em Copy API Token. Guarde também num lugar seguro: a Cloudflare não mostra de novo inteiro.",
          tela: { onde: "Cloudflare · token criado", itens: ["Copy API Token", "Get Account ID"], alvo: 0 } },
        { t: "Volte e cole", d: "Volte para cá e toque em 📋 COLAR (ou cole no campo). Ele confere e CONECTA SOZINHO. Se pedir, cole também o Account ID da mesma tela.",
          tela: { onde: BW("minhas IAs"), itens: ["📋 COLAR", "3 · CONECTAR"], alvo: 0, campo: "••••••••••••••••••" } }
      ],
      duvidas: [
        ["Vou pagar alguma coisa?", "Não. A conta grátis da Cloudflare dá uma cota diária de IA sem cartão. Se acabar, a imagem avisa e volta a funcionar no dia seguinte (ou use a da plataforma)."],
        ["Apareceu \"não consegui descobrir o ID da sua conta\".", "Na mesma tela do token, em Get Account ID, copie o Account ID (32 letras e números) e cole no campo que apareceu."],
        ["Apaguei o token no site da Cloudflare.", "Aqui, toque em DESCONECTAR e conecte um token novo."]
      ] },
    { id: "conectar-gemini", cat: "ias", ic: "🎬", titulo: "Decupagem com IA: conectar o meu Google Gemini", min: 2, nivel: "Fácil", conectar: "gemini",
      resumo: "Crie a chave grátis no Google AI Studio e cole aqui. Conecta sozinho.",
      precisa: ["Uma conta Google", "Uns 2 minutos"],
      passos: [
        { t: "Abra o Google AI Studio", d: "Toque em 1 · ABRIR O GOOGLE AI STUDIO (no painel lá embaixo) e entre com a sua conta Google.",
          tela: { onde: "aistudio.google.com/apikey", itens: ["Fazer login com o Google"], alvo: 0 } },
        { t: "Aceite os termos", d: "Na primeira vez o Google pede para aceitar os termos e já cria um projeto para você. É só aceitar.",
          tela: { onde: "Google AI Studio", itens: ["Termos de Serviço", "Aceitar"], alvo: 1 } },
        { t: "Create API key", d: "Na página API Keys, toque em Create API key (Criar chave de API).",
          tela: { onde: "Google AI Studio · API Keys", itens: ["Dashboard", "Projects", "Create API key"], alvo: 2 } },
        { t: "Copie a chave", d: "Toque no ícone de copiar ao lado da chave nova.",
          tela: { onde: "Google AI Studio · chave criada", itens: ["Chave: ••••••••", "Copiar"], alvo: 1 } },
        { t: "Volte e cole", d: "Volte para cá e toque em 📋 COLAR (ou cole no campo). Ele confere com o Google e CONECTA SOZINHO.",
          tela: { onde: BW("minhas IAs"), itens: ["📋 COLAR", "3 · CONECTAR"], alvo: 0, campo: "••••••••••••••••••" } }
      ],
      duvidas: [
        ["É grátis?", "O Google tem um nível grátis com limite por minuto e por dia. No plano grátis ele pode usar o que você envia para melhorar os produtos dele; com faturamento ativo no projeto, não."],
        ["O botão Create API key está apagado.", "A sua conta não tem permissão naquele projeto (comum em contas de empresa). Use uma conta Google pessoal ou peça permissão ao administrador."],
        ["Quero voltar a usar a da plataforma.", "Toque em USAR A DA PLATAFORMA. A chave continua salva para quando quiser."]
      ] },

    { id: "decupar", cat: "video", ic: "🧠", titulo: "Decupar os takes com IA", min: 4, nivel: "Médio",
      resumo: "A IA assiste aos takes e devolve os melhores trechos com nota e a fala.",
      link: ["video.html", "ABRIR O EDITOR DE VÍDEO"],
      passos: [
        { t: "Importe os takes", d: "No Editor de vídeo (Marketing), toque em ＋ IMPORTAR e escolha os vídeos do evento.",
          tela: { onde: BW("editor de vídeo"), itens: ["＋ IMPORTAR", "⚡ FAZER PROXY", "🎬 DECUPAR COM IA"], alvo: 0 } },
        { t: "Toque em DECUPAR COM IA", d: "Escolha os takes e confirme. O app faz uma cópia leve de cada um e só ela vai para a IA — o original não sai do aparelho.",
          tela: { onde: BW("editor de vídeo"), itens: ["＋ IMPORTAR", "⚡ FAZER PROXY", "🎬 DECUPAR COM IA"], alvo: 2 } },
        { t: "Leia a lista", d: "Cada trecho vem com o tempo, o tipo (fala, plateia, palco…), a nota de ★1 a ★5 e o que foi dito.",
          tela: { onde: BW("decupagem"), itens: ["★★★★★ 00:12 fala — \"Obrigado a todos\"", "★★★★ 01:05 plateia — aplausos", "★ 02:10 ruim — tremido"], alvo: 0 } },
        { t: "Monte o vídeo", d: "＋ PÔR coloca um trecho já aparado na agulha. MONTAR COM OS MELHORES enfileira tudo, sem os ruins.",
          tela: { onde: BW("decupagem"), itens: ["＋ PÔR", "MONTAR COM OS MELHORES", "COPIAR A LISTA"], alvo: 1 } }
      ] },
    { id: "exportar-redes", cat: "video", ic: "📤", titulo: "Editar leve e exportar para as redes", min: 3, nivel: "Médio",
      resumo: "Proxy para o computador não sofrer e a exportação certa para cada rede.",
      link: ["video.html", "ABRIR O EDITOR DE VÍDEO"],
      passos: [
        { t: "Faça o proxy", d: "Takes 4K pesam. Toque em ⚡ FAZER PROXY: o app cria cópias leves para editar. A exportação sempre usa o original.",
          tela: { onde: BW("editor de vídeo"), itens: ["＋ IMPORTAR", "⚡ FAZER PROXY", "🧹 LIMPAR CACHE"], alvo: 1 } },
        { t: "Marque só um trecho (opcional)", d: "Na barra de corte, ⟦ ENTRADA e SAÍDA ⟧ (teclas I e O) limitam o que vai ser exportado.",
          tela: { onde: BW("linha do tempo"), itens: ["⟦ ENTRADA", "SAÍDA ⟧", "✂ DIVIDIR"], alvo: 0 } },
        { t: "Abra EXPORTAR", d: "Toque em EXPORTAR VÍDEO e escolha um pronto: Instagram Reels, YouTube 4K, WhatsApp, telão…",
          tela: { onde: BW("exportar"), itens: ["Instagram Reels", "YouTube 4K", "WhatsApp", "PERSONALIZADO"], alvo: 0 } },
        { t: "Salve e compartilhe", d: "No fim, SALVAR guarda o arquivo e COMPARTILHAR abre o menu do celular.",
          tela: { onde: BW("exportar"), itens: ["SALVAR", "COMPARTILHAR"], alvo: 0 } }
      ] },

    { id: "foto-ia", cat: "fotos", ic: "✨", titulo: "Nova versão da foto com IA", min: 2, nivel: "Fácil",
      resumo: "Peça uma mudança na foto (cabelo, roupa, fundo) e receba uma versão nova ao lado.",
      link: ["fotos.html", "ABRIR O EDITOR DE FOTOS"],
      passos: [
        { t: "Abra a foto", d: "No Editor de fotos, toque na área grande ou escolha uma foto das RECENTES.",
          tela: { onde: BW("editor de fotos"), itens: ["ESCOLHER FOTOS", "RECENTES", "★ MARCA"], alvo: 0 } },
        { t: "Aba ✨ IA", d: "Toque na aba ✨ IA e escreva o pedido — ou toque numa sugestão pronta.",
          tela: { onde: BW("editor de fotos"), itens: ["CORTE", "AJUSTES", "✨ IA", "SALVAR"], alvo: 2 } },
        { t: "Criar e confirmar", d: "Toque em ✨ CRIAR NOVA VERSÃO e confirme. Vai só uma cópia pequena; nada fica guardado na nuvem.",
          tela: { onde: BW("editor de fotos · IA"), itens: ["cabelo cacheado ruivo", "✨ CRIAR NOVA VERSÃO"], alvo: 1, campo: "cabelo cacheado ruivo" } },
        { t: "Compare e salve", d: "A versão nova aparece ao lado da original. Use ANTES para comparar e SALVAR para baixar.",
          tela: { onde: BW("editor de fotos"), itens: ["ANTES", "SALVAR", "COMPARTILHAR"], alvo: 1 } }
      ] },
    { id: "convite-animado", cat: "fotos", ic: "💌", titulo: "Convite animado em vídeo", min: 3, nivel: "Fácil",
      resumo: "Escolha um modelo da biblioteca, ligue a animação e baixe o MP4.",
      link: ["criador.html", "ABRIR O CRIADOR IA"],
      passos: [
        { t: "Escolha CONVITE", d: "No Criador IA, toque em CONVITE e abra a 📚 BIBLIOTECA.",
          tela: { onde: BW("criador IA"), itens: ["CONVITE", "POST", "FLYER", "CARTÃO"], alvo: 0 } },
        { t: "Escolha um modelo", d: "Filtre por tema (aniversário, casamento, futebol…) e toque no modelo. Troque os textos pelos seus.",
          tela: { onde: BW("biblioteca de convites"), itens: ["Aniversário", "Casamento", "🎮 Gamer", "⚽ Futebol"], alvo: 1 } },
        { t: "Ligue ✨ ANIMADO", d: "Escolha bichinhos e efeitos e arraste-os na prévia para o lugar certo.",
          tela: { onde: BW("criador IA"), itens: ["✨ ANIMADO", "Bichinhos", "Efeitos"], alvo: 0 } },
        { t: "Baixe o vídeo", d: "Em SALVAR E ENVIAR, toque em 🎬 BAIXAR VÍDEO ANIMADO (MP4). O vídeo é feito no próprio aparelho.",
          tela: { onde: BW("salvar e enviar"), itens: ["PNG", "PDF", "🎬 BAIXAR VÍDEO ANIMADO (MP4)"], alvo: 2 } }
      ] },

    { id: "lancamento", cat: "gestao", ic: "💸", titulo: "Lançar um gasto ou um recebimento", min: 2, nivel: "Fácil",
      resumo: "Em LANÇAMENTOS: o que é, de onde e quanto. Empresa e casa nunca se misturam.",
      link: ["lancamentos.html", "ABRIR LANÇAMENTOS"],
      passos: [
        { t: "Escolha PJ ou PF", d: "No alto, LANÇAMENTOS PJ é a empresa; LANÇAMENTOS PF é a casa. Cada uma tem a sua cor.",
          tela: { onde: BW("lançamentos"), itens: ["LANÇAMENTOS PJ", "LANÇAMENTOS PF"], alvo: 0 } },
        { t: "＋ NOVO LANÇAMENTO", d: "Toque no botão e responda: O QUE É (GASTEI, RECEBI, CONTA A PAGAR…).",
          tela: { onde: BW("novo lançamento"), itens: ["GASTEI", "RECEBI", "CONTA A PAGAR", "GUARDEI"], alvo: 0 } },
        { t: "Valor, data e nome", d: "Preencha. A faixa de baixo mostra para onde vai e quais números ele alimenta.",
          tela: { onde: BW("novo lançamento"), itens: ["Valor", "Data", "Nome", "✓ LANÇAR"], alvo: 3, campo: "R$ 150,00" } },
        { t: "Alterar ou excluir", d: "Na lista, ✎ ALTERAR muda valor, data e para onde foi; ✕ exclui (pede confirmação).",
          tela: { onde: BW("lançamentos"), itens: ["Almoço da equipe · R$ 150", "✎ ALTERAR", "✕"], alvo: 1 } }
      ] },
    { id: "ler-conta", cat: "gestao", ic: "🧾", titulo: "Ler uma conta pela foto ou PDF", min: 2, nivel: "Fácil",
      resumo: "O leitor acha valor, vencimento e código do boleto sozinho.",
      link: ["leitor.html", "ABRIR O LEITOR DE CONTAS"],
      passos: [
        { t: "Mande a conta", d: "Toque em ESCOLHER PDF OU FOTO, ou em 📷 TIRAR FOTO. PDF com texto é lido com exatidão.",
          tela: { onde: BW("leitor de contas"), itens: ["ESCOLHER PDF OU FOTO", "📷 TIRAR FOTO", "Colar código"], alvo: 0 } },
        { t: "Confira", d: "Valor e vencimento do boleto saem do próprio código. Confira e corrija se precisar.",
          tela: { onde: BW("leitor de contas"), itens: ["Valor R$ 189,90", "Vence 10/12", "Empresa: CEMIG"], alvo: 0 } },
        { t: "Escolha o destino e lance", d: "CONTA A PAGAR, gasto da casa, do negócio ou de um evento — e toque em LANÇAR.",
          tela: { onde: BW("leitor de contas"), itens: ["CONTA A PAGAR", "GASTO DA CASA", "GASTO DO NEGÓCIO", "LANÇAR"], alvo: 3 } }
      ] }
  ];

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var catDe = function (id) { return CATS.filter(function (c) { return c.id === id; })[0]; };
  var calmo = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var filtro = "", catSel = "";

  /* ---------- LISTA ---------- */
  function lista() {
    var q = filtro.toLowerCase(), h = "";
    $("tuChips").innerHTML = '<button type="button" class="' + (!catSel ? "on" : "") + '" data-cat="">TODOS</button>' +
      CATS.map(function (c) { return '<button type="button" class="' + (catSel === c.id ? "on" : "") + '" data-cat="' + c.id + '">' + c.ic + " " + esc(c.nome) + "</button>"; }).join("");
    CATS.forEach(function (c) {
      if (catSel && catSel !== c.id) return;
      var itens = TUT.filter(function (t) { return t.cat === c.id && (!q || (t.titulo + " " + t.resumo + " " + t.passos.map(function (p) { return p.t + " " + p.d; }).join(" ")).toLowerCase().indexOf(q) > -1); });
      if (!itens.length) return;
      h += '<section class="tu-cat" style="--c:' + c.cor + '"><h2><span>' + c.ic + "</span>" + esc(c.nome) + "<small>" + itens.length + (itens.length > 1 ? " tutoriais" : " tutorial") + "</small></h2><div class=\"tu-grade\">" +
        itens.map(function (t) { return '<a class="tu-card" href="?t=' + t.id + '" data-t="' + t.id + '"><span class="ic">' + t.ic + "</span><b>" + esc(t.titulo) + "</b><small>" + esc(t.resumo) + '</small><span class="meta">▶ ' + t.passos.length + " passos · " + t.min + " min · " + esc(t.nivel) + (t.conectar ? ' · <i>CONECTA AQUI</i>' : "") + "</span></a>"; }).join("") + "</div></section>";
    });
    $("tuLista").innerHTML = h || '<p class="tu-vazio">Nenhum tutorial com "' + esc(filtro) + '". Tente outra palavra.</p>';
  }

  /* ---------- PLAYER (demonstração animada) ---------- */
  var P = null;
  function tela(p) {
    var T = p.tela || { onde: "", itens: [] };
    return '<div class="tu-jan"><div class="tu-barra"><i></i><i></i><i></i><span>' + esc(T.onde) + "</span></div><div class=\"tu-conteudo\">" +
      (T.campo != null ? '<div class="tu-input"><span class="tu-dig"></span><span class="tu-car">|</span></div>' : "") +
      '<div class="tu-itens">' + (T.itens || []).map(function (x, i) { return '<span class="tu-item" data-i="' + i + '">' + esc(x) + "</span>"; }).join("") + "</div>" +
      '<span class="tu-cursor" aria-hidden="true"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l15 9-7 1.5L8.5 20z" fill="#fff" stroke="#111" stroke-width="1.5"/></svg></span></div></div>';
  }
  function mostrar(i) {
    var t = P.t, p = t.passos[i]; P.i = i; clearTimeout(P.tm); (P.tms || []).forEach(clearTimeout); P.tms = [];
    var pal = $("tuPalco"); pal.innerHTML = tela(p);
    $("tuLegenda").innerHTML = "<b>" + (i + 1) + " · " + esc(p.t) + "</b> " + esc(p.d);
    document.querySelectorAll(".tu-passo").forEach(function (el, k) { el.classList.toggle("on", k === i); el.classList.toggle("feito", k < i); });
    $("tuBarra").style.width = ((i + 1) / t.passos.length * 100) + "%";
    var T = p.tela || {}, cur = pal.querySelector(".tu-cursor"), alvo = pal.querySelector('.tu-item[data-i="' + T.alvo + '"]'), dig = pal.querySelector(".tu-dig");
    var depois = function (ms, f) { P.tms.push(setTimeout(f, calmo ? 0 : ms)); };
    var tempoDig = 0;
    if (dig) { var txt = String(T.campo || ""); tempoDig = calmo ? 0 : txt.length * 55;
      if (calmo) dig.textContent = txt; else for (var k = 1; k <= txt.length; k++) (function (n) { depois(300 + n * 55, function () { dig.textContent = txt.slice(0, n); }); })(k); }
    if (alvo && cur) {
      depois(450 + tempoDig, function () { var a = alvo.getBoundingClientRect(), c = pal.querySelector(".tu-conteudo").getBoundingClientRect();
        cur.style.left = (a.left - c.left + a.width * 0.6) + "px"; cur.style.top = (a.top - c.top + a.height * 0.55) + "px"; });
      depois(1350 + tempoDig, function () { alvo.classList.add("toque"); });
    }
    if (P.tocando) P.tm = setTimeout(function () { if (P.i < t.passos.length - 1) mostrar(P.i + 1); else { P.tocando = false; botao(); P.tm = setTimeout(function () { }, 0); } }, (calmo ? 5200 : 3600) + tempoDig);
  }
  function botao() { $("tuPlay").textContent = P.tocando ? "⏸ PAUSAR" : (P.i >= P.t.passos.length - 1 ? "↻ VER DE NOVO" : "▶ CONTINUAR"); }

  /* ---------- DETALHE ---------- */
  function abrir(id, empurrar) {
    var t = TUT.filter(function (x) { return x.id === id; })[0];
    if (!t) { voltar(false); return; }
    var c = catDe(t.cat);
    if (empurrar) history.pushState({ t: id }, "", "?t=" + id);
    $("tuIndice").hidden = true; var D = $("tuDet"); D.hidden = false; D.style.setProperty("--c", c.cor);
    D.innerHTML = '<button type="button" class="tu-voltar" id="tuVoltar">‹ TODOS OS TUTORIAIS</button>' +
      '<div class="tu-cab"><span class="ic">' + t.ic + '</span><div><small>' + c.ic + " " + esc(c.nome) + "</small><h1>" + esc(t.titulo) + "</h1><p>" + esc(t.resumo) + '</p><p class="meta">' + t.passos.length + " passos · " + t.min + " min · " + esc(t.nivel) + "</p></div></div>" +
      (t.precisa ? '<div class="tu-precisa"><b>VOCÊ VAI PRECISAR:</b> ' + t.precisa.map(esc).join(" · ") + "</div>" : "") +
      (t.texto ? '<div class="tu-texto">' + t.texto.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>" : "") +
      '<div class="tu-player"><div class="tu-selo">DEMONSTRAÇÃO ANIMADA</div>' + (t.video ? '<video src="' + esc(t.video) + '" controls playsinline preload="metadata" class="tu-video"></video>' : "") +
      '<div class="tu-palco" id="tuPalco"></div><div class="tu-prog"><i id="tuBarra"></i></div><p class="tu-legenda" id="tuLegenda" aria-live="polite"></p>' +
      '<div class="tu-ctl"><button type="button" id="tuAnt" aria-label="Passo anterior">‹</button><button type="button" id="tuPlay" class="pri"></button><button type="button" id="tuProx" aria-label="Próximo passo">›</button></div></div>' +
      '<ol class="tu-passos">' + t.passos.map(function (p, i) { return '<li><button type="button" class="tu-passo" data-p="' + i + '"><span class="n">' + (i + 1) + "</span><span><b>" + esc(p.t) + "</b><small>" + esc(p.d) + "</small></span></button></li>"; }).join("") + "</ol>" +
      (t.conectar ? '<div class="tu-conectar"><h2>🔌 CONECTE AQUI MESMO</h2><p>Siga os passos acima com este painel aberto: abrir o site, copiar e colar. Ele confere e conecta sozinho.</p><div data-mia="' + t.conectar + '"></div></div>' : "") +
      (t.duvidas ? '<div class="tu-duvidas"><h2>DÚVIDAS COMUNS</h2>' + t.duvidas.map(function (d) { return "<details><summary>" + esc(d[0]) + "</summary><p>" + esc(d[1]) + "</p></details>"; }).join("") + "</div>" : "") +
      (t.link ? '<a class="tu-ir" href="' + esc(t.link[0]) + '">' + esc(t.link[1]) + " →</a>" : "") +
      '<div class="tu-mais"><b>Outros de ' + esc(c.nome) + ":</b> " + TUT.filter(function (x) { return x.cat === t.cat && x.id !== t.id; }).map(function (x) { return '<a href="?t=' + x.id + '" data-t="' + x.id + '">' + x.ic + " " + esc(x.titulo) + "</a>"; }).join("") + "</div>";
    P = { t: t, i: 0, tocando: !calmo, tm: 0, tms: [] };
    $("tuVoltar").onclick = function () { voltar(true); };
    $("tuPlay").onclick = function () { if (P.i >= t.passos.length - 1 && !P.tocando) { P.tocando = true; mostrar(0); } else { P.tocando = !P.tocando; if (P.tocando) mostrar(P.i); else { clearTimeout(P.tm); } } botao(); };
    $("tuAnt").onclick = function () { P.tocando = false; mostrar(Math.max(0, P.i - 1)); botao(); };
    $("tuProx").onclick = function () { P.tocando = false; mostrar(Math.min(t.passos.length - 1, P.i + 1)); botao(); };
    D.querySelectorAll(".tu-passo").forEach(function (b) { b.onclick = function () { P.tocando = false; mostrar(+b.getAttribute("data-p")); botao(); $("tuPalco").scrollIntoView({ block: "nearest", behavior: calmo ? "auto" : "smooth" }); }; });
    mostrar(0); botao();
    if (t.conectar && window.BWMinhasIAs) BWMinhasIAs.desenhar();
    document.title = t.titulo + " — Tutoriais — Brightway";
    window.scrollTo(0, 0);
  }
  function voltar(empurrar) {
    if (P) { clearTimeout(P.tm); (P.tms || []).forEach(clearTimeout); P = null; }
    if (empurrar) history.pushState({}, "", location.pathname);
    $("tuDet").hidden = true; $("tuIndice").hidden = false; document.title = "Tutoriais — Brightway"; lista();
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-t]"); if (a && !e.ctrlKey && !e.metaKey) { e.preventDefault(); abrir(a.getAttribute("data-t"), true); return; }
    var c = e.target.closest("[data-cat]"); if (c) { catSel = c.getAttribute("data-cat"); lista(); }
  });
  $("tuBusca").addEventListener("input", function () { filtro = this.value.trim(); lista(); });
  window.addEventListener("popstate", function () { var id = new URLSearchParams(location.search).get("t"); if (id) abrir(id, false); else voltar(false); });
  $("tuTotal").textContent = TUT.length + " tutoriais em " + CATS.length + " assuntos";
  var ini = new URLSearchParams(location.search).get("t");
  if (ini) abrir(ini, false); else lista();
  window.__tut = { TUT: TUT, CATS: CATS, abrir: abrir };
})();
