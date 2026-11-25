/* TUTORIAIS (25/11/2026, Claude — pedido do dono): "uma aba só com tutoriais, passo a passo, com vídeos de demonstração, explicações
   simples e objetivas e muito organizado". Catálogo em TUT (tutorial novo = um item na lista). Cada passo tem uma TELA desenhada
   e o PLAYER mostra a demonstração num CELULAR desenhado (iPhone ou Android): o dedo toca, abre a folha, arrasta a lista e digita.
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
  /* Cada passo: t (título), d (explicação, também é o que a NARRAÇÃO lê) e, conforme o passo:
     • SEM `tela` = passo NA BRIGHTWAY: a demonstração usa as TELAS DE VERDADE fotografadas por docs/tutoriais/capturar.py
       (assets/tutoriais/*.webp + quadros.js, roteiro do passo com o MESMO índice). Mudou a página? Rode o capturar de novo.
     • COM `tela` = passo FORA da Brightway (site da Cloudflare/Google, aviso do Android, Safari): desenhado, com o selo "tela ilustrativa".
       app: "site" (navegador com endereço `url`) ou "sistema"; itens ("# TÍTULO" = seção, "* TEXTO" = botão principal), alvo = linha tocada;
       abre: "topo" + folha {titulo, itens, alvo} = folha que sobe; campo {rot, texto} = o dedo digita.
     `ensina` = o que a narração promete no começo: "Olá, sou o seu assistente virtual e vou te ensinar a <ensina>." */
  var TUT = [
    { id: "instalar-app", cat: "comecar", ic: "📲", titulo: "Instalar o app BW", ensina: "instalar o app BW no seu aparelho", min: 3, nivel: "Fácil",
      resumo: "No computador, no Android ou no iPhone — cada um tem o seu jeito.",
      precisa: ["Internet", "Uns 3 minutos"],
      link: ["downloads.html", "ABRIR DOWNLOADS"],
      passos: [
        { t: "Abra o menu em MAIS", d: "Na barra de baixo, toque em MAIS. O menu sobe: arraste até DOWNLOADS e toque." },
        { t: "Android: toque em BAIXAR PARA ANDROID", d: "Na página de downloads, role até o App BW para Android e toque em BAIXAR PARA ANDROID." },
        { t: "Android: permita a instalação", d: "O Android pergunta se pode instalar apps desta fonte. Ligue a chave só para este arquivo e toque em INSTALAR.",
          tela: { app: "sistema", titulo: "Instalar apps desconhecidos", itens: ["Chrome", "Permitir desta fonte  ⏽", "* INSTALAR"], alvo: 2 } },
        { t: "iPhone: adicione à tela de início", d: "No iPhone, abra o site no Safari, toque em Compartilhar, arraste a lista e toque em Adicionar à Tela de Início.",
          tela: { app: "site", url: "audioevideobw-eng.github.io", titulo: "Brightway", topo: ["", "⬆"], itens: ["# BRIGHTWAY", "Seu software inteligente", "ENTRAR"],
            abre: "topo", folha: { titulo: "Compartilhar", itens: ["Copiar", "Adicionar à Lista de Leitura", "Adicionar aos Favoritos", "Buscar na Página", "Imprimir", "Adicionar à Tela de Início", "Editar Ações…"], alvo: 5 } } }
      ] },
    { id: "tela-inicial", cat: "comecar", ic: "🤖", titulo: "Conhecendo a tela inicial", ensina: "usar a tela inicial da Brightway", min: 2, nivel: "Fácil",
      resumo: "O robô, as quatro telas, a caixa de pedidos e o menu.",
      link: ["./", "IR PARA O INÍCIO"],
      passos: [
        { t: "Toque numa tela para entrar", d: "Em volta do robô ficam MEU NEGÓCIO, GESTÃO DE CASA, MARKETING e FERRAMENTAS. Passe o dedo para o lado para girar e toque numa delas para entrar." },
        { t: "Peça pela caixa do assistente", d: "Embaixo do robô fica a caixa de pedido: escreva ou fale e toque na seta. No exemplo, gastei 50 no almoço vira um cartão de gasto da casa, com o valor e a data: o assistente sempre mostra o cartão e só lança quando você toca em LANÇAR." },
        { t: "Menu e configurações", d: "Toque em MAIS, arraste o menu e entre em CONFIGURAÇÕES: os seus dados, a aparência e as suas IAs." }
      ] },
    { id: "meu-assistente", cat: "comecar", ic: "🧑‍💻", titulo: "Deixar o assistente do seu jeito", ensina: "deixar o assistente do seu jeito", min: 2, nivel: "Fácil",
      resumo: "Nome, visual, cor e voz do assistente que te ajuda em todas as páginas.",
      link: ["meu-assistente.html", "ABRIR MEU ASSISTENTE"],
      passos: [
        { t: "Abra MEU ASSISTENTE", d: "Toque em MAIS, entre em CONFIGURAÇÕES e toque em MEU ASSISTENTE." },
        { t: "Dê um nome", d: "Escreva o nome que quiser no campo NOME DO ASSISTENTE. Ele passa a se apresentar assim em todas as páginas." },
        { t: "Escolha o visual e a cor", d: "Toque no modelo, ROBÔ, ROBÔ REDONDO, ELA ou ELE, e depois numa cor. O botão do canto muda na hora." },
        { t: "Escolha a voz", d: "Em VOZ, escolha masculina ou feminina e toque em OUVIR A VOZ. Também dá para mudar o tom e a velocidade." }
      ] },

    { id: "limites-ias", cat: "ias", ic: "⚖️", titulo: "Usar com limite ou com a minha conta?", ensina: "escolher entre o limite da plataforma e a sua própria conta de IA", min: 2, nivel: "Leitura",
      resumo: "Entenda os limites do dia e quando vale conectar a sua própria conta.",
      texto: [
        "As IAs de IMAGEM e de DECUPAGEM já funcionam sem configurar nada, usando a conta da plataforma. Cada pessoa tem um limite por dia: 15 imagens e 200 análises de decupagem. Para a maioria, isso basta.",
        "Se você usa muito, pode CONECTAR A SUA CONTA (grátis) da Cloudflare (imagens) e do Google (decupagem). Aí o uso vai para a sua conta e não conta no limite da plataforma.",
        "Conectada, você escolhe a qualquer momento: USAR MINHA CONTA ou USAR A DA PLATAFORMA. Não precisa desconectar.",
        "A sua chave fica só no aparelho onde você conectou — não vai para a sua conta Brightway nem fica guardada em servidor. Em outro aparelho, conecte de novo (leva 1 minuto).",
        "O assistente e as IAs de texto continuam com a conta da plataforma (60 pedidos por dia para cada pessoa)."
      ],
      passos: [
        { t: "Vá às Configurações", d: "Toque em MAIS, arraste o menu e toque em CONFIGURAÇÕES." },
        { t: "Ache MINHAS IAS", d: "Role até MINHAS IAS. Para conectar, toque em ABRIR A CLOUDFLARE, para imagens, ou em ABRIR O GOOGLE AI STUDIO, para a decupagem." },
        { t: "Escolha qual usar", d: "Depois de conectar, toque em USAR MINHA CONTA ou em USAR A DA PLATAFORMA. Dá para trocar a qualquer hora." }
      ] },
    { id: "conectar-cloudflare", cat: "ias", ic: "🎨", titulo: "Imagens com IA: conectar a minha Cloudflare", ensina: "conectar a sua conta da Cloudflare para criar imagens", min: 3, nivel: "Fácil", conectar: "cf",
      resumo: "Crie um token grátis na Cloudflare e cole aqui. O app descobre o resto sozinho.",
      precisa: ["Uma conta grátis na Cloudflare (sem cartão)", "Uns 3 minutos"],
      passos: [
        { t: "Abra a Cloudflare pelo botão", d: "Em CONFIGURAÇÕES, em MINHAS IAS, ou no painel aqui embaixo, toque em ABRIR A CLOUDFLARE. Ela abre numa aba nova." },
        { t: "Entre ou crie a conta", d: "Se ainda não tem conta, toque em Sign up e crie uma grátis: é só e-mail e senha.",
          tela: { app: "site", url: "dash.cloudflare.com", titulo: "Cloudflare", itens: ["# Log in", "E-mail", "Senha", "* Log in", "Sign up"], alvo: 3 } },
        { t: "Toque em Use REST API", d: "O link já cai em Workers AI. Arraste até Use REST API e toque.",
          tela: { app: "site", url: "dash.cloudflare.com · Workers AI", titulo: "Workers AI", topo: ["☰", ""], itens: ["# Workers AI", "Overview", "Models", "Playground", "Usage", "AI Gateway", "Use REST API"], alvo: 6 } },
        { t: "Crie o token", d: "Toque em Create a Workers AI API Token, confira os dados e toque em Create API Token.",
          tela: { app: "site", url: "dash.cloudflare.com · REST API", titulo: "Use REST API", itens: ["# Get API token", "* Create a Workers AI API Token", "# Get Account ID", "Account ID"], alvo: 1 } },
        { t: "Copie o token", d: "Toque em Copy API Token. Guarde também num lugar seguro: a Cloudflare não mostra de novo inteiro.",
          tela: { app: "site", url: "dash.cloudflare.com · token criado", titulo: "Token criado", itens: ["# Your API token", "••••••••••••••••", "* Copy API Token", "Account ID"], alvo: 2 } },
        { t: "Volte e toque em COLAR", d: "Volte para a Brightway e toque em COLAR. A plataforma confere e conecta sozinha: aparece SUA CONTA CONECTADA." }
      ],
      duvidas: [
        ["Vou pagar alguma coisa?", "Não. A conta grátis da Cloudflare dá uma cota diária de IA sem cartão. Se acabar, a imagem avisa e volta a funcionar no dia seguinte (ou use a da plataforma)."],
        ["Apareceu \"não consegui descobrir o ID da sua conta\".", "Na mesma tela do token, em Get Account ID, copie o Account ID (32 letras e números) e cole no campo que apareceu."],
        ["Apaguei o token no site da Cloudflare.", "Aqui, toque em DESCONECTAR e conecte um token novo."]
      ] },
    { id: "conectar-gemini", cat: "ias", ic: "🎬", titulo: "Decupagem com IA: conectar o meu Google Gemini", ensina: "conectar a sua conta do Google Gemini para a decupagem", min: 2, nivel: "Fácil", conectar: "gemini",
      resumo: "Crie a chave grátis no Google AI Studio e cole aqui. Conecta sozinho.",
      precisa: ["Uma conta Google", "Uns 2 minutos"],
      passos: [
        { t: "Abra o Google AI Studio", d: "Em MINHAS IAS, ou no painel aqui embaixo, toque em ABRIR O GOOGLE AI STUDIO e entre com a sua conta Google." },
        { t: "Aceite os termos", d: "Na primeira vez o Google pede para aceitar os termos e já cria um projeto. É só aceitar.",
          tela: { app: "site", url: "aistudio.google.com/apikey", titulo: "Google AI Studio", itens: ["# Termos de Serviço", "Li e aceito", "* Aceitar"], alvo: 2 } },
        { t: "Create API key", d: "Na página API Keys, toque em Create API key.",
          tela: { app: "site", url: "aistudio.google.com/apikey", titulo: "API Keys", topo: ["☰", ""], itens: ["# API Keys", "* Create API key", "Projects"], alvo: 1 } },
        { t: "Copie a chave", d: "Toque no ícone de copiar ao lado da chave nova.",
          tela: { app: "site", url: "aistudio.google.com/apikey", titulo: "API Keys", itens: ["# Chave criada", "••••••••••••", "⧉ Copiar"], alvo: 2 } },
        { t: "Volte e toque em COLAR", d: "Volte para a Brightway e toque em COLAR. Ela confere com o Google e conecta sozinha." }
      ],
      duvidas: [
        ["É grátis?", "O Google tem um nível grátis com limite por minuto e por dia. No plano grátis ele pode usar o que você envia para melhorar os produtos dele; com faturamento ativo no projeto, não."],
        ["O botão Create API key está apagado.", "A sua conta não tem permissão naquele projeto (comum em contas de empresa). Use uma conta Google pessoal ou peça permissão ao administrador."],
        ["Quero voltar a usar a da plataforma.", "Toque em USAR A DA PLATAFORMA. A chave continua salva para quando quiser."]
      ] },

    { id: "decupar", cat: "video", ic: "🧠", titulo: "Decupar os takes com IA", ensina: "decupar os takes do seu evento com a inteligência artificial", min: 4, nivel: "Médio",
      resumo: "A IA assiste aos takes e devolve os melhores trechos com nota e a fala.",
      link: ["video.html", "ABRIR O EDITOR DE VÍDEO"],
      passos: [
        { t: "Importe os takes", d: "No Editor de vídeo, toque em Mídia, na faixa de baixo, e depois em IMPORTAR. Escolha os vídeos do evento." },
        { t: "Toque em DECUPAR COM IA", d: "Na mesma folha, toque em DECUPAR COM IA. Os takes já vêm marcados: diga que evento é, se quiser, e toque em DECUPAR. Confirme o aviso: só uma cópia leve vai para a IA." },
        { t: "Leia a lista", d: "Cada trecho vem com o tempo, a nota de uma a cinco estrelas, o que aparece nele e a fala, quando alguém fala. Os filtros no alto mostram só as melhores notas ou um tipo." },
        { t: "Monte o vídeo", d: "O botão de mais põe um trecho já aparado na linha do tempo. MONTAR COM OS MELHORES enfileira todos, sem os ruins." }
      ] },
    { id: "exportar-redes", cat: "video", ic: "📤", titulo: "Editar leve e exportar para as redes", ensina: "editar sem travar e exportar o vídeo certinho para cada rede", min: 3, nivel: "Médio",
      resumo: "Proxy para o celular não sofrer e a exportação certa para cada rede.",
      link: ["video.html", "ABRIR O EDITOR DE VÍDEO"],
      passos: [
        { t: "Faça o proxy", d: "Em Mídia, toque em FAZER PROXY. O app cria cópias leves para editar sem travar; a exportação usa o original." },
        { t: "Marque um trecho, se quiser", d: "Na faixa de baixo, arraste para o lado até Marcar entrada e Marcar saída, com a agulha no ponto certo. Só esse trecho será exportado." },
        { t: "Toque em Exportar", d: "No canto de cima, Exportar abre os prontos: YouTube, Instagram Reels, WhatsApp, telão. Escolha um e toque em EXPORTAR. No fim, salve ou compartilhe." }
      ] },

    { id: "foto-ia", cat: "fotos", ic: "✨", titulo: "Nova versão da foto com IA", ensina: "criar uma versão nova da sua foto com inteligência artificial", min: 2, nivel: "Fácil",
      resumo: "Peça uma mudança na foto (cabelo, roupa, fundo) e receba uma versão nova ao lado.",
      link: ["fotos.html", "ABRIR O EDITOR DE FOTOS"],
      passos: [
        { t: "Abra a foto", d: "No Editor de fotos, toque em ESCOLHER FOTOS e escolha a foto na galeria. No exemplo, uma moça de cabelo liso castanho." },
        { t: "Aba IA", d: "Na faixa de baixo, arraste até IA e toque." },
        { t: "Escreva e crie", d: "Escreva o que quer mudar, como cabelo cacheado ruivo, ou toque numa sugestão, e toque em CRIAR NOVA VERSÃO. Confirme: vai só uma cópia pequena. Em poucos segundos aparece a versão nova, com o cabelo cacheado ruivo, e a original continua guardada ao lado." },
        { t: "Compare e salve", d: "Nas miniaturas, toque na primeira para ver a original e na segunda para ver a versão nova. Gostou? Toque em SALVAR." }
      ] },
    { id: "convite-animado", cat: "fotos", ic: "💌", titulo: "Convite animado em vídeo", ensina: "fazer um convite animado em vídeo", min: 3, nivel: "Fácil",
      resumo: "Escolha um modelo da biblioteca, ligue a animação e baixe o MP4.",
      link: ["criador.html", "ABRIR O CRIADOR IA"],
      passos: [
        { t: "Escolha CONVITE", d: "No Criador IA, toque em CONVITE." },
        { t: "Escolha um modelo", d: "Role até a BIBLIOTECA DE CONVITES PRONTOS e toque num modelo. Depois troque os textos pelos seus em DADOS." },
        { t: "Ligue o ANIMADO", d: "Role até o convite animado, toque em ANIMADO e escolha bichinhos e efeitos: toque para pôr e arraste na prévia." },
        { t: "Baixe o vídeo", d: "Em SALVAR E ENVIAR, toque em BAIXAR VÍDEO ANIMADO. O vídeo é feito no próprio celular." }
      ] },

    { id: "lancamento", cat: "gestao", ic: "💸", titulo: "Lançar um gasto ou um recebimento", ensina: "lançar um gasto ou um recebimento", min: 2, nivel: "Fácil",
      resumo: "Em LANÇAMENTOS: o que é, de onde e quanto. Empresa e casa nunca se misturam.",
      link: ["lancamentos.html", "ABRIR LANÇAMENTOS"],
      passos: [
        { t: "Abra LANÇAMENTOS", d: "Em MINHA EMPRESA, toque em LANÇAMENTOS PJ. Em MINHA CASA é LANÇAMENTOS PF: empresa e casa nunca se misturam." },
        { t: "Toque em NOVO LANÇAMENTO", d: "Toque em NOVO LANÇAMENTO e responda: o que é, como GASTEI ou RECEBI, e de onde é, como do negócio ou de um evento." },
        { t: "Valor e LANÇAR", d: "Digite o valor e o que foi, confira a data e toque em LANÇAR. Ele aparece na lista na hora." },
        { t: "Alterar ou excluir", d: "Na lista, ALTERAR muda o valor, a data e para onde foi. O X exclui, e sempre pede confirmação." }
      ] },
    { id: "ler-conta", cat: "gestao", ic: "🧾", titulo: "Ler uma conta pela foto ou PDF", ensina: "lançar uma conta só com a foto, o PDF ou o código do boleto", min: 2, nivel: "Fácil",
      resumo: "O leitor acha valor, vencimento e código do boleto sozinho.",
      link: ["leitor.html", "ABRIR O LEITOR DE CONTAS"],
      passos: [
        { t: "Diga o que é e mande a conta", d: "No Leitor de contas, toque no que é, como CONTA A PAGAR. Depois tire a foto, escolha o PDF ou toque em COLAR CÓDIGO, cole o boleto e toque em LER O CÓDIGO." },
        { t: "Confira", d: "O valor do boleto sai do próprio código. Confira o vencimento e corrija o que precisar." },
        { t: "Lance", d: "Toque em LANÇAR EM CONTA A PAGAR. Pronto: a conta entra na lista, na agenda e nos avisos." }
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

  /* ---------- PLAYER: o CELULAR da demonstração (25/11, dono: "simulando um iPhone ou Android, com a tela e o tamanho, como se fosse o
     usuário no celular: aperta os três pontos, abre a aba, passa o dedo e acha a opção") — tudo desenho próprio em HTML/CSS ---------- */
  var APAR = (function () { try { return localStorage.getItem("ui_tut_aparelho"); } catch (e) { return null; } })() || (/android/i.test(navigator.userAgent) ? "android" : "iphone");
  var P = null;
  var ABAS = ["⌂<br>INÍCIO", "▣<br>EMPRESA", "⌂<br>CASA", "✦<br>MARKETING", "☰<br>MAIS"];
  function linha(x, i) {
    x = String(x);
    if (x.indexOf("# ") === 0) return '<div class="tf-sec" data-i="' + i + '">' + esc(x.slice(2)) + "</div>";
    if (x.indexOf("* ") === 0) return '<div class="tf-li pri" data-i="' + i + '">' + esc(x.slice(2)) + "</div>";
    return '<div class="tf-li" data-i="' + i + '">' + esc(x) + "</div>";
  }
  var QD = window.BW_TUT_QUADROS || {};
  function quadros(t, i) { var q = QD[t.id] && QD[t.id][String(i)]; return q && q.length ? q : null; }
  function celularReal(q) {
    return '<div class="tf tf-' + APAR + (calmo ? " tf-calmo" : "") + '"><div class="tf-tela tf-real">' +
      '<div class="tf-status"><span>9:41</span>' + (APAR === "iphone" ? '<i class="tf-ilha"></i>' : '<i class="tf-furo"></i>') + '<span class="tf-ic">▂▄▆ ◔ ▭</span></div>' +
      '<div class="tf-foto"><img class="tf-img a" alt="" src="assets/tutoriais/' + esc(q[0].img) + '"><img class="tf-img b" alt="" hidden><span class="tf-onda"></span>' +
        '<div class="tf-digit" hidden><span></span><i class="tf-car">|</i></div></div>' +
      (APAR === "iphone" ? '<i class="tf-home"></i>' : '<div class="tf-nav"><i>◁</i><i>○</i><i>▢</i></div>') +
      '<div class="tf-teclado">' + teclado() + '</div><span class="tf-dedo"></span></div></div>';
  }
  function teclado() { return ["qwertyuiop", "asdfghjkl", "zxcvbnm"].map(function (r) { return '<div class="tf-tl">' + r.split("").map(function (k) { return "<i>" + k + "</i>"; }).join("") + "</div>"; }).join("") + '<div class="tf-tl"><i class="esp">espaço</i></div>'; }
  function celular(T) {
    var topo = T.topo || ["‹", ""], sis = T.app === "sistema";
    var tecl = ["qwertyuiop", "asdfghjkl", "zxcvbnm"].map(function (r) { return '<div class="tf-tl">' + r.split("").map(function (k) { return "<i>" + k + "</i>"; }).join("") + "</div>"; }).join("") +
      '<div class="tf-tl"><i class="esp">espaço</i></div>';
    return '<div class="tf tf-' + APAR + (calmo ? " tf-calmo" : "") + '"><div class="tf-tela' + (sis ? " tf-sis" : "") + '"><span class="tf-ilus">TELA ILUSTRATIVA</span>' +
      '<div class="tf-status"><span>9:41</span>' + (APAR === "iphone" ? '<i class="tf-ilha"></i>' : '<i class="tf-furo"></i>') + '<span class="tf-ic">▂▄▆ ◔ ▭</span></div>' +
      (T.app === "site" ? '<div class="tf-url">🔒 ' + esc(T.url || "") + "</div>" : "") +
      (sis ? "" : '<div class="tf-topo"><b data-k="esq">' + esc(topo[0] || "") + "</b><span>" + esc(T.titulo || "") + '</span><b data-k="dir">' + esc(topo[1] || "") + "</b></div>") +
      '<div class="tf-corpo"><div class="tf-rolo">' + (sis ? '<div class="tf-sistit">' + esc(T.titulo || "") + "</div>" : "") +
        (T.campo ? '<div class="tf-campo"><small>' + esc(T.campo.rot) + '</small><span><em class="tf-dig"></em><i class="tf-car">|</i></span></div>' : "") +
        (T.itens || []).map(linha).join("") + "</div></div>" +
      (T.app === "bw" && T.aba != null ? '<div class="tf-abas">' + ABAS.map(function (a, i) { return '<span data-aba="' + i + '" class="' + (i === T.aba ? "on" : "") + '">' + a + "</span>"; }).join("") + "</div>" : "") +
      (APAR === "iphone" ? '<i class="tf-home"></i>' : '<div class="tf-nav"><i>◁</i><i>○</i><i>▢</i></div>') +
      '<div class="tf-veu"></div>' +
      (T.folha ? '<div class="tf-folha"><i class="tf-pega"></i><b>' + esc(T.folha.titulo || "") + '</b><div class="tf-fcorpo"><div class="tf-rolo">' + T.folha.itens.map(linha).join("") + "</div></div></div>" : "") +
      (T.campo ? '<div class="tf-teclado">' + tecl + "</div>" : "") +
      '<span class="tf-dedo"></span></div></div>';
  }
  async function animar(T, run) {
    var pal = $("tuPalco"), tela = pal.querySelector(".tf-tela"), dedo = tela.querySelector(".tf-dedo");
    var vivo = function () { return P && P.run === run; };
    var w = function (ms) { return new Promise(function (r) { setTimeout(r, calmo ? 0 : ms); }); };
    var pos = function (el, fx, fy) { var a = el.getBoundingClientRect(), c = tela.getBoundingClientRect(); return { x: a.left - c.left + a.width * (fx || 0.55), y: a.top - c.top + a.height * (fy || 0.5) }; };
    async function tocar(el, campo) {
      if (!el || !vivo()) return; var q = pos(el);
      dedo.style.left = q.x + "px"; dedo.style.top = q.y + "px"; dedo.classList.add("ve"); await w(720); if (!vivo()) return;
      dedo.classList.add("aperta"); el.classList.add(campo ? "foco" : "toque"); await w(240); dedo.classList.remove("aperta"); await w(260);
    }
    async function rolarAte(corpo, el) {
      if (!el || !vivo()) return; var rolo = corpo.querySelector(".tf-rolo");
      var h = corpo.clientHeight, max = Math.max(0, rolo.scrollHeight - h + 14), dy = Math.min(max, Math.max(0, el.offsetTop - h * 0.42));
      if (dy < 10) return;
      var p0 = pos(corpo, 0.66, 0.8); dedo.style.left = p0.x + "px"; dedo.style.top = p0.y + "px"; dedo.classList.add("ve"); await w(700); if (!vivo()) return;
      dedo.classList.add("arrasta"); dedo.style.top = (p0.y - Math.min(dy, h * 0.6)) + "px"; rolo.style.transform = "translateY(" + (-dy) + "px)";
      await w(980); dedo.classList.remove("arrasta"); dedo.classList.remove("ve"); await w(260);
    }
    await w(380);
    if (T.campo && vivo()) {
      var f = tela.querySelector(".tf-campo"); await tocar(f, true); if (!vivo()) return;
      tela.classList.add("tecl"); await w(380); var dig = tela.querySelector(".tf-dig"), txt = String(T.campo.texto || "");
      for (var k = 1; k <= txt.length && vivo(); k++) { dig.textContent = txt.slice(0, k); await w(70); }
      await w(420); tela.classList.remove("tecl"); await w(360);
    }
    if (T.abre && T.folha && vivo()) {
      var gat = T.abre === "aba" ? tela.querySelector('[data-aba="4"]') : T.abre === "topo" ? tela.querySelector('[data-k="dir"]') : tela.querySelector('.tf-corpo [data-i="' + T.de + '"]');
      await tocar(gat); if (!vivo()) return; if (T.abre === "aba") { tela.querySelectorAll(".tf-abas span").forEach(function (s, i) { s.classList.toggle("on", i === 4); }); }
      dedo.classList.remove("ve"); tela.classList.add("folha"); await w(620);
      var fc = tela.querySelector(".tf-fcorpo"), alvoF = fc.querySelector('[data-i="' + T.folha.alvo + '"]');
      await rolarAte(fc, alvoF); await tocar(alvoF);
    } else if (T.alvo != null && vivo()) {
      var corpo = tela.querySelector(".tf-corpo"), alvo = corpo.querySelector('[data-i="' + T.alvo + '"]');
      await rolarAte(corpo, alvo); await tocar(alvo);
    }
    if (!vivo()) return;
    await w(300); dedo.classList.remove("ve"); terminou(run);
  }
  /* passo com as TELAS DE VERDADE: cada foto na ordem — toque (o dedo vai ao botão real), rolar (arrasta e a tela anda), digita (teclado + texto) */
  async function animarReal(q, run) {
    var pal = $("tuPalco"), tela = pal.querySelector(".tf-tela"), dedo = tela.querySelector(".tf-dedo"), caixa = tela.querySelector(".tf-foto");
    var A = caixa.querySelector(".tf-img.a"), B = caixa.querySelector(".tf-img.b"), onda = caixa.querySelector(".tf-onda"), dig = caixa.querySelector(".tf-digit");
    var vivo = function () { return P && P.run === run; };
    var w = function (ms) { return new Promise(function (r) { setTimeout(r, calmo ? 0 : ms); }); };
    var top0 = function () { return caixa.offsetTop; }, K = caixa.clientWidth / 390;
    var ponto = function (r) { return { x: (r[0] + r[2] / 2) * K, y: top0() + (r[1] + r[3] / 2) * K }; };
    function trocar(img) {   /* passa para a próxima foto com um fade curto */
      return new Promise(function (ok) {
        B.onload = B.onerror = function () { B.hidden = false; B.classList.add("ve"); setTimeout(function () { A.src = B.src; A.style.transform = ""; B.hidden = true; B.classList.remove("ve"); ok(); }, calmo ? 0 : 340); };
        B.src = "assets/tutoriais/" + img;
      });
    }
    await w(500);
    for (var k = 0; k < q.length && vivo(); k++) {
      var f = q[k];
      if (k > 0) await trocar(f.img); if (!vivo()) return;
      if (f.acao === "toque" && f.r) {
        var pt = ponto(f.r); dedo.style.left = pt.x + "px"; dedo.style.top = pt.y + "px"; dedo.classList.add("ve"); await w(760); if (!vivo()) return;
        dedo.classList.add("aperta"); onda.style.left = pt.x + "px"; onda.style.top = (pt.y - top0()) + "px"; onda.classList.remove("vai"); void onda.offsetWidth; onda.classList.add("vai");
        await w(260); dedo.classList.remove("aperta"); await w(380);
      } else if (f.acao === "rolar") {
        var h = caixa.clientHeight, x = caixa.clientWidth * 0.62, y0 = top0() + h * 0.78;
        dedo.style.left = x + "px"; dedo.style.top = y0 + "px"; dedo.classList.add("ve"); await w(650); if (!vivo()) return;
        dedo.classList.add("arrasta"); dedo.style.top = (y0 - h * 0.42) + "px"; A.style.transition = "transform .9s cubic-bezier(.3,.1,.2,1)"; A.style.transform = "translateY(-12%)";
        await w(900); dedo.classList.remove("arrasta"); dedo.classList.remove("ve"); A.style.transition = ""; await w(120);
      } else if (f.acao === "digita" && f.r) {
        var p2 = ponto(f.r); dedo.style.left = p2.x + "px"; dedo.style.top = p2.y + "px"; dedo.classList.add("ve"); await w(720); if (!vivo()) return;
        dedo.classList.add("aperta"); await w(220); dedo.classList.remove("aperta"); dedo.classList.remove("ve");
        dig.style.left = Math.max(4, f.r[0] * K) + "px"; dig.style.top = (f.r[1] * K) + "px"; dig.style.width = Math.max(80, f.r[2] * K - 8) + "px"; dig.style.minHeight = Math.max(22, f.r[3] * K) + "px";
        dig.hidden = false; tela.classList.add("tecl"); var sp = dig.querySelector("span"), tx = String(f.texto || ""); sp.textContent = ""; await w(380);
        for (var c = 1; c <= tx.length && vivo(); c++) { sp.textContent = tx.slice(0, c); await w(tx.length > 24 ? 28 : 75); }
        await w(450); tela.classList.remove("tecl"); dig.hidden = true; await w(250);
      } else await w(k === q.length - 1 ? 400 : 900);
    }
    if (!vivo()) return; dedo.classList.remove("ve"); terminou(run);
  }
  /* ---------- SOM: narração (a voz do aparelho, a mesma do assistente) + fundo musical baixinho feito na hora (WebAudio, sem arquivo de
     terceiros). 25/11, dono: "narração bem dinâmica, com fundo musical baixo… sempre dizer: Olá, sou seu assistente virtual, vou te ensinar a…".
     O navegador só deixa falar/tocar depois de um toque da pessoa: abrir o tutorial pela lista já conta; aberto pelo endereço, o botão 🔊 liga. */
  function prefSom() { try { var o = JSON.parse(localStorage.getItem("ui_tut_som") || "{}") || {}; return { narra: o.narra !== false, musica: o.musica !== false }; } catch (e) { return { narra: true, musica: true }; } }
  function gravarSom(o) { try { var a = JSON.parse(localStorage.getItem("ui_tut_som") || "{}") || {}; for (var k in o) a[k] = o[k]; localStorage.setItem("ui_tut_som", JSON.stringify(a)); } catch (e) { } }
  var podeSom = function () { try { return !navigator.userActivation || navigator.userActivation.hasBeenActive; } catch (e) { return true; } };
  function praFalar(x) {   /* tira emoji e símbolo, e escreve as palavras em MAIÚSCULAS normal (algumas vozes soletram) */
    return String(x).replace(/\p{Extended_Pictographic}|️|‍/gu, "").replace(/[＋+✓✕⧉·→↗↺▸▾⬇📋]/g, " ").replace(/\b([A-ZÀ-Ý]{4,})\b/g, function (m) { return m.charAt(0) + m.slice(1).toLowerCase(); }).replace(/\s+/g, " ").trim();
  }
  var LIGA = ["Agora, ", "Depois, ", "Em seguida, ", "Beleza! Agora, ", "Próximo passo: "];
  function textoNarrado(t, i) {
    var p = t.passos[i], d = praFalar(p.d), ult = i === t.passos.length - 1, quem = window.BWAssistente ? BWAssistente.quem() : "o seu assistente virtual";
    var abre = i === 0 ? "Olá, sou " + quem + ", e vou te ensinar a " + (t.ensina || t.titulo.toLowerCase()) + ". Primeiro: " : LIGA[(i - 1) % LIGA.length];
    if (/^[A-ZÀ-Ý][a-zà-ÿ]/.test(d)) d = d.charAt(0).toLowerCase() + d.slice(1);
    return abre + d + (ult ? " E pronto! Viu como é fácil? Quando quiser, é só me chamar." : "");
  }
  var MUS = null;
  function musica(liga) {
    if (!liga) { if (MUS) { var m0 = MUS; MUS = null; clearInterval(m0.tm); try { m0.g.gain.setTargetAtTime(0, m0.c.currentTime, 0.4); setTimeout(function () { try { m0.c.close(); } catch (e) { } }, 1600); } catch (e) { } } return; }
    if (MUS || calmo) return;
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var c = new AC(), g = c.createGain(); g.gain.value = 0; g.connect(c.destination); g.gain.setTargetAtTime(0.055, c.currentTime, 0.8);
    var BPM = 100, bt = 60 / BPM, hz = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };
    var ACORDES = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];   /* Dó, Sol, Lá menor, Fá — leve e alegre */
    function nota(n, t0, dur, tipo, vol, ataque) {
      var o = c.createOscillator(), v = c.createGain(); o.type = tipo; o.frequency.value = hz(n); v.gain.setValueAtTime(0, t0);
      v.gain.linearRampToValueAtTime(vol, t0 + (ataque || 0.01)); v.gain.exponentialRampToValueAtTime(0.0008, t0 + dur); o.connect(v); v.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
    }
    function chimbal(t0) { var len = Math.floor(c.sampleRate * 0.04), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (var k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
      var s0 = c.createBufferSource(), f = c.createBiquadFilter(), v = c.createGain(); f.type = "highpass"; f.frequency.value = 7000; v.gain.value = 0.06; s0.buffer = buf; s0.connect(f); f.connect(v); v.connect(g); s0.start(t0); }
    var prox = c.currentTime + 0.1, tempo = 0;
    function agenda() {
      while (prox < c.currentTime + 0.6) {
        var compasso = Math.floor(tempo / 8) % 4, ac = ACORDES[compasso], meio = tempo % 8;   /* 8 colcheias por compasso */
        if (meio === 0) { ac.forEach(function (n) { nota(n, prox, bt * 4.2, "triangle", 0.10, 0.35); }); nota(ac[0] - 24, prox, bt * 1.8, "sine", 0.30); }
        if (meio === 4) nota(ac[0] - 24, prox, bt * 1.6, "sine", 0.24);
        nota(ac[[0, 1, 2, 1, 2, 1, 0, 2][meio]] + 12, prox, bt * 0.9, "sine", 0.07);
        if (meio % 2 === 1) chimbal(prox);
        prox += bt / 2; tempo++;
      }
    }
    agenda(); MUS = { c: c, g: g, tm: setInterval(agenda, 180) };
  }
  function abaixar(sim) { if (MUS) try { MUS.g.gain.setTargetAtTime(sim ? 0.022 : 0.055, MUS.c.currentTime, 0.25); } catch (e) { } }
  function calar() { try { if (window.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) { } }
  function narrar(i, run) {
    var t = P.t, S = window.speechSynthesis;
    if (!P.som || !prefSom().narra || !S) { P.falaOk = true; return; }
    var pedacos = (textoNarrado(t, i).match(/[^.!?:]+[.!?:]*\s*/g) || []).map(function (x) { return x.trim(); }).filter(Boolean), v = null, n = 0;
    try { v = window.BWAgente && BWAgente.voz && BWAgente.voz(); } catch (e) { }
    var acabou = function () { if (!P || P.run !== run) return; abaixar(false); P.falaOk = true; seguir(run); };
    var prox = function () {
      if (!P || P.run !== run) return; if (n >= pedacos.length) { acabou(); return; }
      var u = new SpeechSynthesisUtterance(pedacos[n++]); u.lang = "pt-BR"; u.rate = Math.min(1.35, ((v && v.velocidade) || 1.05) * 1.04); u.pitch = (v && v.tom) || 1.05;
      if (v && v.obj) { u.voice = v.obj; u.lang = v.obj.lang; }
      var foi = false, seg = setTimeout(function () { if (!foi) { foi = true; prox(); } }, 4000 + pedacos[n - 1].length * 140);   /* voz travada não prende o tutorial */
      u.onend = u.onerror = function () { if (foi) return; foi = true; clearTimeout(seg); prox(); };
      try { S.speak(u); } catch (e) { foi = true; clearTimeout(seg); acabou(); }
    };
    abaixar(true); setTimeout(prox, 140);
  }
  function terminou(run) { if (!P || P.run !== run) return; P.animOk = true; seguir(run); }
  function seguir(run) {
    if (!P || P.run !== run || !P.animOk || !P.falaOk || !P.tocando) return;
    P.tm = setTimeout(function () { if (!P || P.run !== run) return; if (P.i < P.t.passos.length - 1) mostrar(P.i + 1); else { P.tocando = false; musica(false); botao(); } }, calmo ? 4200 : P.som ? 700 : 1500);
  }
  function botaoSom() { var b = $("tuSom"); if (!b) return; var lig = P && P.som; b.textContent = lig ? "🔊 COM NARRAÇÃO" : "🔈 OUVIR NARRAÇÃO"; b.classList.toggle("on", !!lig); b.classList.toggle("chama", !lig && prefSom().narra); }
  function mostrar(i) {
    var t = P.t, p = t.passos[i]; P.i = i; clearTimeout(P.tm); P.run = (P.run || 0) + 1; P.animOk = false; P.falaOk = false; calar();
    var q = p.tela ? null : quadros(t, i);
    $("tuPalco").innerHTML = q ? celularReal(q) : celular(p.tela || { app: "bw", titulo: t.titulo, itens: [p.t] });
    $("tuLegenda").innerHTML = "<b>" + (i + 1) + " · " + esc(p.t) + "</b> " + esc(p.d);
    document.querySelectorAll(".tu-passo").forEach(function (el, k) { el.classList.toggle("on", k === i); el.classList.toggle("feito", k < i); });
    $("tuBarra").style.width = ((i + 1) / t.passos.length * 100) + "%";
    document.querySelectorAll("[data-ap]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-ap") === APAR); });
    if (P.som && P.tocando && prefSom().musica) musica(true);
    var run = P.run; narrar(i, run);
    if (q) animarReal(q, run); else animar(p.tela || {}, run);
    botaoSom();
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
      '<div class="tu-player"><div class="tu-apar" role="group" aria-label="Aparelho da demonstração"><button type="button" data-ap="iphone">📱 iPhone</button><button type="button" data-ap="android">🤖 Android</button><button type="button" id="tuSom" class="tu-som"></button></div>' + (t.video ? '<video src="' + esc(t.video) + '" controls playsinline preload="metadata" class="tu-video"></video>' : "") +
      '<div class="tu-palco" id="tuPalco"></div><div class="tu-prog"><i id="tuBarra"></i></div><p class="tu-legenda" id="tuLegenda" aria-live="polite"></p>' +
      '<div class="tu-ctl"><button type="button" id="tuAnt" aria-label="Passo anterior">‹</button><button type="button" id="tuPlay" class="pri"></button><button type="button" id="tuProx" aria-label="Próximo passo">›</button></div></div>' +
      '<ol class="tu-passos">' + t.passos.map(function (p, i) { return '<li><button type="button" class="tu-passo" data-p="' + i + '"><span class="n">' + (i + 1) + "</span><span><b>" + esc(p.t) + "</b><small>" + esc(p.d) + "</small></span></button></li>"; }).join("") + "</ol>" +
      (t.conectar ? '<div class="tu-conectar"><h2>🔌 CONECTE AQUI MESMO</h2><p>Siga os passos acima com este painel aberto: abrir o site, copiar e colar. Ele confere e conecta sozinho.</p><div data-mia="' + t.conectar + '"></div></div>' : "") +
      (t.duvidas ? '<div class="tu-duvidas"><h2>DÚVIDAS COMUNS</h2>' + t.duvidas.map(function (d) { return "<details><summary>" + esc(d[0]) + "</summary><p>" + esc(d[1]) + "</p></details>"; }).join("") + "</div>" : "") +
      (t.link ? '<a class="tu-ir" href="' + esc(t.link[0]) + '">' + esc(t.link[1]) + " →</a>" : "") +
      '<div class="tu-mais"><b>Outros de ' + esc(c.nome) + ":</b> " + TUT.filter(function (x) { return x.cat === t.cat && x.id !== t.id; }).map(function (x) { return '<a href="?t=' + x.id + '" data-t="' + x.id + '">' + x.ic + " " + esc(x.titulo) + "</a>"; }).join("") + "</div>";
    P = { t: t, i: 0, tocando: !calmo, tm: 0, run: 0, som: podeSom() && prefSom().narra };
    $("tuVoltar").onclick = function () { voltar(true); };
    D.querySelectorAll("[data-ap]").forEach(function (b) { b.onclick = function () { APAR = b.getAttribute("data-ap"); try { localStorage.setItem("ui_tut_aparelho", APAR); } catch (e) { } mostrar(P.i); }; });
    $("tuSom").onclick = function () {
      if (P.som) { P.som = false; gravarSom({ narra: false }); calar(); musica(false); botaoSom(); P.falaOk = true; seguir(P.run); return; }
      P.som = true; gravarSom({ narra: true }); P.tocando = true; mostrar(P.i); botao();
    };
    $("tuPlay").onclick = function () { if (!P.som && prefSom().narra) P.som = true; if (P.i >= t.passos.length - 1 && !P.tocando) { P.tocando = true; mostrar(0); } else { P.tocando = !P.tocando; if (P.tocando) mostrar(P.i); else { clearTimeout(P.tm); calar(); musica(false); } } botao(); };
    $("tuAnt").onclick = function () { P.tocando = false; mostrar(Math.max(0, P.i - 1)); botao(); };
    $("tuProx").onclick = function () { P.tocando = false; mostrar(Math.min(t.passos.length - 1, P.i + 1)); botao(); };
    D.querySelectorAll(".tu-passo").forEach(function (b) { b.onclick = function () { P.tocando = false; mostrar(+b.getAttribute("data-p")); botao(); $("tuPalco").scrollIntoView({ block: "nearest", behavior: calmo ? "auto" : "smooth" }); }; });
    mostrar(0); botao();
    if (t.conectar && window.BWMinhasIAs) BWMinhasIAs.desenhar();
    document.title = t.titulo + " — Tutoriais — Brightway";
    window.scrollTo(0, 0);
  }
  function voltar(empurrar) {
    if (P) { clearTimeout(P.tm); P = null; } calar(); musica(false);
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
  window.__tut = { TUT: TUT, CATS: CATS, abrir: abrir, textoNarrado: textoNarrado, quadros: quadros, P: function () { return P; } };
})();
