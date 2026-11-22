/* CRIADOR IA (16/11/2026, Claude) — convites, posts do negócio, flyers/cartazes e cartões de visita digitais.
   A IA (Cloudflare FLUX.2 pela Edge Function bw-ia-imagem, via assets/fotos-nuvem.js) cria só a ARTE, sem letras; os textos
   são desenhados por cima com fontes de verdade (sem erro de português/data). Textos e legendas com a IA Brightway (bw-ia).
   Fundos prontos funcionam sem login e sem internet. A foto só sai do aparelho no modo "a IA coloca a pessoa na arte",
   depois de confirmação. Nada é gravado na conta: só as escolhas da tela (ui_criador) neste aparelho. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var lim = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var FN_TXT = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var LIB_PDF = "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js";
  var LIB_QR = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";

  /* ================= CATÁLOGO ================= */
  var ICO = {
    convite: '<path d="M3 8h18v12H3z"/><path d="m3 8 9 6 9-6"/><path d="M8 4h8v4"/>',
    post: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    flyer: '<path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/><path d="M9 13h8M9 17h6"/>',
    cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/><path d="M5 16c.8-1.6 2-2.4 3-2.4s2.2.8 3 2.4M14 10h5M14 13h4"/>'
  };
  var TIPOS = {
    convite: { nome: "CONVITE", fmt: "story", pos: "baixo", subs: [["aniversario", "Aniversário"], ["infantil", "Infantil"], ["quinze", "15 anos"], ["casamento", "Casamento"], ["cha", "Chá de bebê"], ["revelacao", "Chá revelação"], ["formatura", "Formatura"], ["savethedate", "Save the date"], ["batizado", "Batizado"], ["confra", "Confraternização"], ["noivado", "Noivado"], ["bodas", "Bodas"], ["chafraldas", "Chá de fraldas"], ["chacozinha", "Chá de cozinha"], ["comunhao", "1ª comunhão"], ["churrasco", "Churrasco"], ["happyhour", "Happy hour"], ["inauguracao", "Inauguração"], ["lancamento", "Lançamento"], ["junina", "Festa junina"], ["halloween", "Halloween"], ["natal", "Natal"], ["reveillon", "Réveillon"], ["despedida", "Despedida"], ["festa", "Festa"], ["show", "Show / apresentação"], ["campeonato", "Campeonato / torneio"], ["jogo", "Jogo no telão"]] },
    post: { nome: "POST", fmt: "post", pos: "baixo", subs: [["evento", "Divulgar evento"], ["promo", "Promoção"], ["obrigado", "Agradecimento"], ["bastidores", "Bastidores"], ["depoimento", "Depoimento"], ["novidade", "Novidade / aviso"], ["data", "Data comemorativa"]] },
    flyer: { nome: "FLYER", fmt: "a4", pos: "baixo", subs: [["evento", "Evento / show"], ["curso", "Curso / palestra"], ["promo", "Promoção / loja"], ["servico", "Serviço"]] },
    cartao: { nome: "CARTÃO", fmt: "cartao", pos: "centro", subs: [["classico", "Clássico"], ["moderno", "Moderno"], ["criativo", "Criativo"]] }
  };
  /* textos padrão de cada modelo (o usuário troca à vontade) e o assunto da arte para a IA (em inglês, que ela entende melhor) */
  var MODELO = {
    convite: {
      aniversario: { pre: "Você está convidado", titulo: "Aniversário de", en: "adult birthday party celebration" },
      infantil: { pre: "Venha brincar comigo!", titulo: "Aniversário de", en: "children's birthday party, playful and joyful" },
      quinze: { pre: "Você está convidado para os", titulo: "15 anos de", idade: "15", en: "elegant sweet fifteen debutante party" },
      casamento: { pre: "Com a bênção de Deus e de nossos pais", titulo: "Casamento", en: "romantic wedding celebration" },
      cha: { pre: "Venha celebrar a chegada de", titulo: "Chá de bebê", en: "baby shower, soft and tender" },
      revelacao: { pre: "Menino ou menina?", titulo: "Chá revelação", en: "gender reveal party, pink and blue" },
      formatura: { pre: "Celebre comigo esta conquista", titulo: "Formatura", en: "graduation celebration, caps in the air" },
      savethedate: { pre: "Reserve esta data", titulo: "Save the date", en: "save the date announcement, romantic" },
      batizado: { pre: "Venha celebrar o batizado de", titulo: "Batizado", en: "christening ceremony, delicate and serene" },
      confra: { pre: "É hora de celebrar juntos", titulo: "Confraternização", en: "end of year company party celebration" },
      noivado: { pre: "Dissemos sim!", titulo: "Noivado", en: "romantic engagement party, rings and flowers" },
      bodas: { pre: "Celebrando uma história de amor", titulo: "Bodas", en: "wedding anniversary celebration, elegant and warm" },
      chafraldas: { pre: "Venha conhecer", titulo: "Chá de fraldas", en: "diaper shower, soft baby theme" },
      chacozinha: { pre: "Casa nova, cozinha nova!", titulo: "Chá de cozinha", en: "bridal kitchen shower, cozy kitchen utensils" },
      comunhao: { pre: "Com alegria convidamos para a", titulo: "Primeira Comunhão", en: "first communion, white, light and serene" },
      churrasco: { pre: "Bora pro", titulo: "Churrasco", en: "backyard barbecue party, warm string lights" },
      happyhour: { pre: "Sextou!", titulo: "Happy hour", en: "after work happy hour, drinks and city lights" },
      inauguracao: { pre: "Venha celebrar com a gente", titulo: "Inauguração", en: "store grand opening, ribbon and balloons" },
      lancamento: { pre: "Você é nosso convidado para o", titulo: "Lançamento", en: "product launch event, stage lights" },
      junina: { pre: "Arraiá do", titulo: "Festa Junina", en: "brazilian festa junina, colorful flags, bonfire" },
      halloween: { pre: "Se tiver coragem, venha!", titulo: "Halloween", en: "spooky cute halloween party, pumpkins and moon" },
      natal: { pre: "Celebre o Natal com a gente", titulo: "Natal", en: "christmas party, warm and festive" },
      reveillon: { pre: "Vamos virar o ano juntos", titulo: "Réveillon", en: "new year's eve party, fireworks, gold" },
      despedida: { pre: "Última noite de solteiro(a)!", titulo: "Despedida", en: "bachelor party, fun night out" },
      festa: { pre: "Você está na lista", titulo: "Festa", en: "adult party night, lights and music" },
      show: { pre: "Ao vivo", titulo: "Show", en: "live music show on stage, concert lights" },
      campeonato: { pre: "Inscrições abertas", titulo: "Campeonato", en: "tournament competition, trophy, energy" },
      jogo: { pre: "Vamos assistir juntos", titulo: "Jogo no telão", en: "watching the match together on a big screen, sports bar" }
    },
    post: {
      evento: { pre: "Vem aí", cta: "Garanta sua vaga", en: "event announcement social media post" },
      promo: { pre: "Oferta especial", cta: "Peça já o seu orçamento", en: "special offer sale social media post" },
      obrigado: { pre: "Obrigado!", cta: "", en: "thank you post after a successful event, warm and grateful" },
      bastidores: { pre: "Bastidores", cta: "", en: "behind the scenes of an audiovisual production, cameras and lights" },
      depoimento: { pre: "Quem contratou, recomenda", cta: "", en: "client testimonial post, trustworthy and warm" },
      novidade: { pre: "Novidade", cta: "Saiba mais", en: "announcement social media post" },
      data: { pre: "Feliz dia!", cta: "", en: "holiday greeting social media post" }
    },
    flyer: {
      evento: { pre: "Não perca", cta: "Ingressos à venda", en: "event or concert poster" },
      curso: { pre: "Inscrições abertas", cta: "Vagas limitadas", en: "course or lecture poster, professional" },
      promo: { pre: "Promoção", cta: "Só esta semana", en: "store promotion poster, vibrant" },
      servico: { pre: "Conheça nossos serviços", cta: "Peça seu orçamento", en: "professional service advertisement poster" }
    },
    cartao: { classico: { en: "elegant business card background, abstract and refined" }, moderno: { en: "modern business card background, sleek abstract shapes" }, criativo: { en: "creative colorful business card background, artistic" } }
  };
  /* campos de cada tipo: [chave, rótulo, tipo do campo, exemplo, largo?] */
  function campos(t, s) {
    if (t === "convite") {
      var c = [["pre", "Frase de abertura", "text", "Você está convidado", 1], ["titulo", "Título", "text", "Aniversário de"], ["nome", /casamento|noivado|bodas|savethedate/.test(s) ? "Nomes do casal" : /confra|inauguracao|lancamento|happyhour|campeonato/.test(s) ? "Empresa / grupo" : "Nome", "text", /casamento|noivado|bodas|savethedate/.test(s) ? "Ana & Pedro" : /confra|inauguracao|lancamento|happyhour/.test(s) ? "Produtora Exemplo" : "Marina"]];
      if (s === "aniversario" || s === "infantil" || s === "quinze") c.push(["idade", "Idade", "text", "30"]);
      c.push(["data", "Data", "date"], ["hora", "Horário", "time"], ["local", "Local", "text", "Espaço Jardim"], ["endereco", "Endereço", "text", "Rua das Flores, 120 — BH", 1],
        ["traje", "Traje (opcional)", "text", "Esporte fino"], ["rsvp", "WhatsApp para confirmar", "tel", "(31) 99999-0000"], ["mensagem", "Mensagem (opcional)", "textarea", "Sua presença é o nosso melhor presente!", 1]);
      return c;
    }
    if (t === "post") {
      if (s === "depoimento") return [["pre", "Frase de cima", "text", "Quem contratou, recomenda", 1], ["texto", "Depoimento", "textarea", "Equipe incrível, a transmissão foi perfeita!", 1], ["autor", "Quem disse", "text", "Carla — Arte Eventos"], ["arroba", "Seu @", "text", "@suaempresa"]];
      var p = [["pre", "Frase de cima", "text", "Vem aí", 1], ["titulo", "Título", "text", s === "promo" ? "Transmissão ao vivo" : "Congresso 2026", 1], ["subtitulo", "Texto de apoio", "textarea", "", 1]];
      if (s === "promo") p.push(["preco", "Preço / oferta", "text", "R$ 1.990 ou 20% OFF"]);
      if (s === "evento") p.push(["data", "Data", "date"], ["hora", "Horário", "time"], ["local", "Local", "text", "Centro de Convenções"]);
      p.push(["cta", "Chamada (botão)", "text", "Garanta sua vaga"], ["arroba", "Seu @", "text", "@suaempresa"], ["contato", "WhatsApp / site", "text", "(31) 99999-0000"]);
      return p;
    }
    if (t === "flyer") {
      var f = [["pre", "Frase de cima", "text", "Não perca", 1], ["titulo", "Título", "text", "Show de Verão", 1], ["subtitulo", "Texto de apoio", "textarea", "", 1], ["data", "Data", "date"], ["hora", "Horário", "time"], ["local", "Local", "text", "Praça Central"], ["endereco", "Endereço", "text", "", 1]];
      if (s !== "evento") f.push(["preco", "Preço / oferta", "text", "A partir de R$ 99"]);
      f.push(["cta", "Chamada", "text", "Ingressos à venda"], ["contato", "Contato (WhatsApp)", "tel", "(31) 99999-0000"], ["arroba", "@ ou site", "text", "@suaempresa"]);
      return f;
    }
    return [["nome", "Nome", "text", "Marcos Bonfá", 1], ["cargo", "Cargo / especialidade", "text", "Produtor audiovisual"], ["empresa", "Empresa", "text", "BW Audiovisual"], ["telefone", "WhatsApp", "tel", "(31) 99999-0000"],
      ["email", "E-mail", "email", "contato@empresa.com"], ["instagram", "Instagram", "text", "@suaempresa"], ["site", "Site", "text", "www.empresa.com.br"], ["endereco", "Cidade / endereço", "text", "Belo Horizonte — MG", 1]];
  }
  var ESTILOS = [
    ["festa", "Festa", "vibrant party celebration, colorful balloons, confetti, string lights", "festa", ["#FF3D7F", "#7B2FF7", "#FFC93C"]],
    ["elegante", "Elegante", "elegant luxury, gold and black, soft golden bokeh, refined details", "elegante", ["#0E0C0A", "#2A2218", "#E8C26A"]],
    ["infantil", "Infantil", "cute playful children's illustration, pastel colors, stars, clouds, toys", "divertido", ["#8EC5FC", "#E0C3FC", "#FFD86F"]],
    ["neon", "Neon", "glowing neon lights, dark background, vibrant pink and cyan, night", "neon", ["#07051A", "#2B0B4A", "#00F0FF"]],
    ["tropical", "Tropical", "tropical summer, palm leaves, monstera, sunny and vibrant", "festa", ["#0F5132", "#21A179", "#FFD23F"]],
    ["floral", "Floral", "delicate watercolor flowers, soft pastel tones, romantic", "classico", ["#FCE4EC", "#F8BBD0", "#C2185B"]],
    ["minimal", "Minimalista", "clean minimalist design, soft gradient, subtle geometric shapes, lots of empty space", "moderno", ["#F4F1EC", "#E3DED6", "#1B1B1B"]],
    ["rustico", "Rústico", "rustic, warm wood, kraft paper texture, fairy lights, cozy", "manuscrito", ["#3B2A1E", "#7A5A3A", "#F2C57C"]],
    ["corporativo", "Corporativo", "modern corporate style, deep blue, stage lights, sleek abstract lines", "moderno", ["#06122B", "#0B3D91", "#4FC3F7"]],
    ["palco", "Palco / show", "concert stage, dramatic stage lights, haze, crowd silhouettes", "impacto", ["#050507", "#1A0F2E", "#FF6B2C"]],
    ["praia", "Praia", "beach at golden hour, sea, sand, warm sunset sky", "manuscrito", ["#FF9A62", "#FFD3A5", "#1E88E5"]],
    ["natal", "Natal", "christmas, festive red and gold, warm lights, ornaments", "classico", ["#3E0A0A", "#8B1A1A", "#E8C26A"]],
    ["luxo", "Luxo art déco", "luxury art deco, black and gold geometric ornaments, symmetrical frame", "elegante", ["#0B0B0D", "#1E1A14", "#D9B36A"]],
    ["marmore", "Mármore", "white marble texture with thin gold veins, elegant and clean", "classico", ["#F4F1EC", "#E3DDD3", "#B8925A"]],
    ["aquarela", "Aquarela", "soft watercolor washes and painted flowers, delicate", "classico", ["#FFF8F2", "#FBE3E8", "#D86A8A"]],
    ["vintage", "Vintage", "vintage parchment paper, ornamental frame, retro", "classico", ["#E9DCC0", "#D4C09A", "#6B4A2B"]],
    ["lousa", "Lousa", "chalkboard with chalk drawings, hand lettering", "manuscrito", ["#1F2B24", "#2C3A32", "#F2EFE6"]],
    ["espacial", "Espacial", "outer space, galaxy, planets and stars, astronaut", "neon", ["#05061A", "#1B1446", "#9AD7FF"]],
    ["mar", "Fundo do mar", "under the sea, light rays, bubbles, seaweed, cute fish", "divertido", ["#0B4F7A", "#1FA2C7", "#FFE08A"]],
    ["junina", "Junina", "brazilian festa junina, colorful little flags, bonfire, straw", "festa", ["#7A1E12", "#C4501C", "#FFD23F"]],
    ["halloween", "Halloween", "cute spooky halloween night, big moon, bats, pumpkins", "impacto", ["#120A1F", "#3A1B4E", "#FF8A1F"]],
    ["bebe", "Bebê", "soft baby nursery, pastel clouds and little stars", "divertido", ["#EAF4FF", "#FDEAF2", "#7FB3E8"]],
    ["circo", "Circo", "circus tent stripes, red and cream, playful", "divertido", ["#B3122E", "#F4E9D8", "#FFD23F"]],
    ["safari", "Safári", "jungle safari, tropical leaves, warm sand tones", "divertido", ["#E9D9B0", "#C9A46A", "#2E6B3A"]],
    ["gamer", "Gamer", "gamer setup, dark room with neon RGB lights, futuristic HUD lines", "gamer", ["#07071A", "#1A0B3A", "#00F0FF"]],
    ["futebol", "Futebol", "soccer field at night, green grass, stadium lights", "esporte", ["#0B3D1E", "#1E7A3A", "#FFD23F"]],
    ["basquete", "Basquete", "basketball court, wood floor, arena lights", "esporte", ["#3A1D0A", "#B5651D", "#FF8A1F"]],
    ["fitness", "Fitness", "gym energy, bold diagonal shapes, dynamic", "esporte", ["#0B0B0F", "#2A2A33", "#C6FF00"]],
    ["corrida", "Velocidade", "racing, checkered flag, speed lines, asphalt", "esporte", ["#101114", "#2B2E36", "#E53935"]],
    ["rock", "Rock", "rock concert, grunge texture, red stage light", "rock", ["#0A0A0A", "#2A0A0A", "#E53935"]],
    ["sertanejo", "Sertanejo", "country music night, wood, warm lights, stars", "country", ["#2B1A0E", "#6B3F1D", "#F2C57C"]],
    ["samba", "Samba e pagode", "brazilian samba night, vibrant colors, warm", "festa", ["#3A0B2E", "#C2185B", "#FFD23F"]],
    ["eletronica", "Eletrônica", "electronic music party, DJ, lasers, neon", "neon", ["#05030F", "#24104A", "#FF2FB9"]],
    ["retro80", "Anos 80", "retro synthwave sunset, neon grid, eighties", "neon", ["#12052B", "#3B0B5A", "#FF6EC7"]],
    ["vinho", "Vinho", "elegant wine night, burgundy, warm candlelight", "elegante", ["#1E0710", "#5A0F25", "#E8C26A"]],
    ["luau", "Luau", "beach luau at night, moon over the sea, torches", "manuscrito", ["#06142B", "#0E3B5A", "#FFB547"]],
    ["cinema", "Cinema", "movie theater, red curtain, spotlights, film", "impacto", ["#140405", "#5A0A10", "#FFD23F"]],
    ["heroi", "Super-herói", "original comic book superhero night city skyline, spotlight in the sky, no logos, no existing characters", "heroi", ["#0A0F2E", "#1E2A6B", "#FFD23F"]],
    ["quadrinho", "Quadrinho", "pop art comic book burst rays, halftone dots, bold primary colors, no existing characters", "heroi", ["#1B1B1B", "#E53935", "#FFD23F"]],
    ["anime", "Anime", "anime style dreamy night sky, big moon, cherry blossom branches, pastel pink and purple, no existing characters", "anime", ["#2A1650", "#7A3CC8", "#FFB7CF"]],
    ["animeneon", "Cidade neon", "anime style neon city at night, rain, glowing signs without text, no existing characters", "anime", ["#07061A", "#1A1050", "#FF2FB9"]]
  ];
  var PALETAS = [["", "Do estilo"], ["marca", "Minha marca"], ["ouro", "Dourado e preto", ["#0b0b0f", "#2a2218", "#E8C26A"], "gold and black"], ["rosa", "Rosa e lilás", ["#ffd1e6", "#c9a7ff", "#FF4F9A"], "pink and lilac"],
    ["azul", "Azul e branco", ["#0b2a5b", "#3f7fd6", "#ffffff"], "blue and white"], ["verde", "Verde", ["#0b3d2e", "#2fa36b", "#d7f5c8"], "green tones"], ["vermelho", "Vermelho", ["#3b0606", "#c62828", "#ffcc80"], "red and warm"],
    ["pastel", "Pastel", ["#fde2e4", "#cde7f0", "#b59ad6"], "soft pastel"], ["pb", "Preto e branco", ["#0a0a0a", "#5a5a5a", "#ffffff"], "black and white"]];
  var PARES = {
    classico: { nome: "Clássico", s: ["Great Vibes", 400], d: ["Playfair Display", 700], b: ["Inter", 600] },
    festa: { nome: "Festa", s: ["Pacifico", 400], d: ["Poppins", 800], b: ["Poppins", 500] },
    moderno: { nome: "Moderno", s: ["Montserrat", 800], d: ["Bebas Neue", 400], b: ["Montserrat", 500] },
    elegante: { nome: "Elegante", s: ["Great Vibes", 400], d: ["Cinzel", 700], b: ["Montserrat", 500] },
    divertido: { nome: "Divertido", s: ["Lobster", 400], d: ["Fredoka", 600], b: ["Inter", 600] },
    impacto: { nome: "Impacto", s: ["Anton", 400], d: ["Anton", 400], b: ["Inter", 700] },
    manuscrito: { nome: "Manuscrito", s: ["Dancing Script", 700], d: ["Caveat", 700], b: ["Inter", 600] },
    neon: { nome: "Neon", s: ["Righteous", 400], d: ["Michroma", 400], b: ["Inter", 600] },
    gamer: { nome: "Gamer", s: ["Russo One", 400], d: ["Bungee", 400], b: ["Inter", 700] },
    esporte: { nome: "Esporte", s: ["Bungee", 400], d: ["Russo One", 400], b: ["Inter", 700] },
    rock: { nome: "Rock", s: ["Permanent Marker", 400], d: ["Anton", 400], b: ["Inter", 700] },
    country: { nome: "Country", s: ["Rye", 400], d: ["Rye", 400], b: ["Inter", 600] },
    heroi: { nome: "Quadrinho", s: ["Bangers", 400], d: ["Bangers", 400], b: ["Inter", 700] },
    anime: { nome: "Anime", s: ["Mochiy Pop One", 400], d: ["Fredoka", 600], b: ["Inter", 600] }
  };
  var FORMATOS = [["story", "STORY 9:16", 1080, 1920], ["post", "POST 4:5", 1080, 1350], ["quadrado", "QUADRADO", 1080, 1080], ["paisagem", "PAISAGEM 16:9", 1920, 1080],
    ["a5", "A5 IMPRIMIR", 1748, 2480], ["a4", "A4 IMPRIMIR", 2480, 3508], ["cartao", "CARTÃO 9×5", 1063, 591]];
  var PAPEL_PT = { a5: [419.53, 595.28], a4: [595.28, 841.89], cartao: [255.12, 141.73] };   // tamanho da página do PDF (pontos)

  /* ================= ESTADO (lembrado neste aparelho) ================= */
  function lerUi() { try { return JSON.parse(localStorage.getItem("ui_criador") || "{}") || {}; } catch (e) { return {}; } }
  var U = lerUi();
  var E = Object.assign({ tipo: "convite", sub: "aniversario", dados: {}, estilo: "festa", paleta: "", formato: "story", desc: "", fotoModo: "ia",
    aj: { pos: "", caixa: "degrade", par: "", cor: "auto", destaque: "", tam: 100, alinh: "centro", escurecer: 0, logo: false, logoId: "", qr: "", moldura: "circulo", letra: "normal" } }, U);
  E.aj = Object.assign({ pos: "", caixa: "degrade", par: "", cor: "auto", destaque: "", tam: 100, alinh: "centro", escurecer: 0, logo: false, logoId: "", qr: "", moldura: "circulo", letra: "normal" }, U.aj || {});
  /* 22/11 — CONVITE ANIMADO: bichinhos/objetos (itens, posição em fração), efeitos de tela, entrada do texto e duração */
  E.anim = Object.assign({ ligado: false, itens: [], over: [], texto: "suave", dur: 8 }, U.anim || {});
  var tGravar = 0;
  function gravar() { clearTimeout(tGravar); tGravar = setTimeout(function () { try { localStorage.setItem("ui_criador", JSON.stringify(E)); } catch (e) { } }, 300); }
  function dados() { var k = E.tipo + "|" + E.sub; return E.dados[k] || (E.dados[k] = padrao(E.tipo, E.sub)); }
  function padrao(t, s) {
    var m = (MODELO[t] && MODELO[t][s]) || {}, d = {};
    ["pre", "titulo", "cta", "idade"].forEach(function (k) { if (m[k] != null) d[k] = m[k]; });
    if (KIT.arroba && (t === "post" || t === "flyer")) d.arroba = KIT.arroba;
    if (t === "cartao") { if (KIT.empresa) d.empresa = KIT.empresa; if (KIT.arroba) d.instagram = KIT.arroba; if (KIT.site) d.site = KIT.site; }
    return d;
  }
  var FOTO = null, FOTO_URL = "";      // a foto escolhida (só na memória)
  var OPS = [null, null, null], SEL = -1, OP_MODO = "";   // as 3 artes (imagens) e qual está escolhida
  var KIT = { empresa: "", arroba: "", site: "", cores: [], logos: [] }, LOGOS = {};

  /* ================= MINHA MARCA (mesmo IndexedDB do editor de fotos, só leitura) ================= */
  function lerKit() {
    return new Promise(function (ok) {
      if (!window.indexedDB) return ok();
      var r = indexedDB.open("bw_fotos_marca", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("kit"); };
      r.onerror = function () { ok(); };
      r.onsuccess = function () {
        try { var q = r.result.transaction("kit").objectStore("kit").get("kit"); q.onsuccess = function () { if (q.result) KIT = Object.assign(KIT, q.result); ok(); }; q.onerror = function () { ok(); }; }
        catch (e) { ok(); }
      };
    }).then(function () {
      return Promise.all((KIT.logos || []).map(function (l) { return imgDe(l.url).then(function (im) { LOGOS[l.id] = im; }).catch(function () { }); }));
    });
  }
  function imgDe(url) { return new Promise(function (ok, erro) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = erro; im.src = url; }); }

  /* ================= TELA ================= */
  function toast(t) { var d = document.createElement("div"); d.className = "cr-toast"; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3600); }
  function msg(t) { $("msg").textContent = t || ""; }
  function chips(box, lista, atual, k, fmt) {
    $(box).innerHTML = lista.map(function (x) { return '<button type="button" class="cr-chip' + (x[0] === atual ? " on" : "") + '" data-k="' + k + '" data-v="' + esc(x[0]) + '">' + (fmt ? fmt(x) : esc(x[1])) + "</button>"; }).join("");
  }
  function sw(c) { return '<i class="sw" style="background:' + c + '"></i>'; }
  function desenharTopo() {
    $("tipos").innerHTML = Object.keys(TIPOS).map(function (t) { return '<button type="button" class="cr-tipo' + (t === E.tipo ? " on" : "") + '" data-k="tipo" data-v="' + t + '" aria-pressed="' + (t === E.tipo) + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICO[t] + "</svg>" + TIPOS[t].nome + "</button>"; }).join("");
    chips("subtipos", TIPOS[E.tipo].subs, E.sub, "sub");
  }
  function desenharCampos() {
    var d = dados();
    $("campos").innerHTML = campos(E.tipo, E.sub).map(function (c) {
      var v = esc(d[c[0]] || ""), ph = c[3] ? ' placeholder="ex.: ' + esc(c[3]) + '"' : "";
      var inp = c[2] === "textarea" ? '<textarea data-c="' + c[0] + '"' + ph + ' maxlength="400">' + v + "</textarea>" : '<input type="' + c[2] + '" data-c="' + c[0] + '" value="' + v + '"' + ph + ' maxlength="160">';
      return '<label class="' + (c[4] ? "largo" : "") + '"><span>' + esc(c[1]) + "</span>" + inp + "</label>";
    }).join("");
  }
  function desenharEstilo() {
    chips("estilos", ESTILOS, E.estilo, "estilo");
    var pal = PALETAS.filter(function (p) { return p[0] !== "marca" || (KIT.cores && KIT.cores.length); });
    chips("paletas", pal, E.paleta, "paleta", function (p) { var cs = p[0] === "marca" ? KIT.cores : p[2] || (estiloAtual()[4]); return (cs || []).slice(0, 3).map(sw).join("") + esc(p[1]); });
    chips("formatos", FORMATOS, E.formato, "formato");
    $("desc").value = E.desc || "";
    $("fotoModoBox").hidden = !FOTO;
    if (FOTO) chips("fotoModo", [["ia", "✨ A IA COLOCA A PESSOA NA ARTE"], ["moldura", "FOTO EM MOLDURA"], ["fundo", "FOTO DE FUNDO"]], E.fotoModo, "fotoModo");
  }
  function estiloAtual() { return ESTILOS.filter(function (x) { return x[0] === E.estilo; })[0] || ESTILOS[0]; }
  function cores() { var p = PALETAS.filter(function (x) { return x[0] === E.paleta; })[0]; if (E.paleta === "marca" && KIT.cores && KIT.cores.length) return KIT.cores.concat(KIT.cores).slice(0, 3); return (p && p[2]) || estiloAtual()[4]; }
  function par() { return PARES[E.aj.par] || PARES[estiloAtual()[3]] || PARES.classico; }
  function posTexto() { return E.aj.pos || TIPOS[E.tipo].pos; }
  function desenharAjustes() {
    var a = E.aj, h = "";
    var lin = function (tit, lista, k, atual, fmt) { return '<div class="cr-tit">' + tit + '</div><div class="cr-chips">' + lista.map(function (x) { return '<button type="button" class="cr-chip' + (x[0] === atual ? " on" : "") + '" data-k="' + k + '" data-v="' + esc(x[0]) + '"' + (x[1] ? "" : ' aria-label="' + esc(tit + " " + x[0]) + '"') + ">" + (fmt ? fmt(x) : esc(x[1])) + "</button>"; }).join("") + "</div>"; };
    var sl = function (k, rot, min, max, v, suf) { return '<label class="cr-sl"><span>' + rot + '</span><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" value="' + v + '"><output>' + v + (suf || "") + "</output></label>"; };
    h += lin("Posição do texto", [["topo", "EM CIMA"], ["centro", "NO MEIO"], ["baixo", "EMBAIXO"]], "pos", posTexto());
    h += lin("Fundo do texto", [["degrade", "DEGRADÊ"], ["vidro", "VIDRO"], ["solido", "FAIXA"], ["nenhum", "SÓ SOMBRA"]], "caixa", a.caixa);
    h += lin("Fontes", Object.keys(PARES).map(function (k) { return [k, PARES[k].nome]; }), "par", E.aj.par || estiloAtual()[3], function (x) { return '<span style="font-family:\'' + PARES[x[0]].d[0] + '\'">' + esc(x[1]) + "</span>"; });
    h += lin("Letras do nome (3D)", [["normal", "NORMAL"], ["relevo", "RELEVO 3D"], ["ouro", "OURO 3D"], ["cromo", "CROMADO"], ["balao", "BALÃO METÁLICO"], ["neon", "NEON"]], "letra", a.letra || "normal");
    h += lin("Cor do texto", [["auto", "AUTOMÁTICA"], ["claro", "CLARA"], ["escuro", "ESCURA"]], "cor", a.cor);
    var dest = [["", "Da paleta"]].concat(["#E8C26A", "#FFB547", "#FF4F9A", "#4FC3F7", "#3DDC97", "#FFFFFF", "#111111"].map(function (c) { return [c, ""]; })).concat((KIT.cores || []).map(function (c) { return [c, ""]; }));
    h += lin("Cor de destaque", dest, "destaque", a.destaque, function (x) { return x[0] ? sw(x[0]) : "DA PALETA"; });
    h += sl("tam", "Tamanho", 70, 130, a.tam, "%") + sl("escurecer", "Escurecer", 0, 70, a.escurecer, "%");
    h += lin("Alinhamento", [["centro", "CENTRO"], ["esquerda", "ESQUERDA"]], "alinh", a.alinh);
    if ((KIT.logos || []).length) h += lin("Logo (MINHA MARCA)", [["", "SEM LOGO"]].concat(KIT.logos.map(function (l) { return [l.id, l.nome || "Logo"]; })), "logoId", a.logo ? a.logoId || KIT.logos[0].id : "");
    else h += '<p class="tf-nota">Para pôr sua logo, cadastre em <a href="fotos.html" style="color:#FFB547">Editor de fotos → ★ MINHA MARCA</a>.</p>';
    h += lin("QR code", qrOpcoes(), "qr", a.qr);
    if (FOTO && E.fotoModo === "moldura") h += lin("Moldura da foto", [["circulo", "CÍRCULO"], ["arredondada", "ARREDONDADA"], ["polaroid", "POLAROID"]], "moldura", a.moldura);
    $("ajustes").innerHTML = h;
  }
  function qrOpcoes() {
    var o = [["", "SEM QR"]], d = dados();
    if (E.tipo === "convite") o.push(["rsvp", "CONFIRMAR PELO WHATSAPP"], ["mapa", "COMO CHEGAR"]);
    else if (E.tipo === "cartao") o.push(["zap", "WHATSAPP"], ["insta", "INSTAGRAM"], ["site", "SITE"]);
    else o.push(["zap", "WHATSAPP"], ["insta", "INSTAGRAM"], ["mapa", "COMO CHEGAR"]);
    void d; return o;
  }
  function tudo() { desenharTopo(); desenharCampos(); desenharEstilo(); desenharAjustes(); desenharOps(); desenharBib(); desenharAnim(); agendar(); }

  /* ================= TEXTOS ================= */
  var SEM = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"], MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  function fmtData(iso, curto) {   /* "2026-12-20" → "sábado, 20 de dezembro" (data LOCAL, sem toISOString — PENTE FINO 29) */
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); if (!m) return "";
    var dt = new Date(+m[1], +m[2] - 1, +m[3]);
    return curto ? m[3] + "." + m[2] + "." + m[1] : SEM[dt.getDay()] + ", " + (+m[3]) + " de " + MES[+m[2] - 1];
  }
  function fmtHora(h) { var m = /^(\d{1,2}):(\d{2})$/.exec(h || ""); return m ? (+m[1]) + "h" + (m[2] === "00" ? "" : m[2]) : ""; }
  function quando(d, curto) { return [fmtData(d.data, curto), fmtHora(d.hora)].filter(Boolean).join(" • "); }
  function blocos() {
    var d = dados(), t = E.tipo, s = E.sub, b = [];
    var add = function (r, txt) { txt = String(txt || "").trim(); if (txt) b.push({ r: r, t: txt }); };
    if (t === "convite") {
      add("pre", d.pre); add("script", d.titulo); add("nome", d.nome);
      if (d.idade) add("destaque", /\D/.test(d.idade) ? d.idade : d.idade + " anos");
      b.push({ r: "linha" });
      add("info", quando(d, s === "savethedate")); add("info2", d.local); add("peq", d.endereco);
      if (d.traje) add("peq", "Traje: " + d.traje);
      add("msg", d.mensagem); if (d.rsvp) add("peq", "Confirme sua presença: " + d.rsvp);
    } else if (t === "post" && s === "depoimento") {
      add("pre", d.pre); if (d.texto) add("quote", "“" + d.texto.replace(/^["“]|["”]$/g, "") + "”"); add("info2", d.autor ? "— " + d.autor : ""); add("peq", d.arroba);
    } else if (t === "post" || t === "flyer") {
      add("pre", d.pre); add("nome", d.titulo); add("msg", d.subtitulo);
      if (d.preco) add("preco", d.preco);
      add("info", quando(d)); add("info2", d.local); add("peq", d.endereco);
      if (d.cta) b.push({ r: "cta", t: d.cta });
      add("peq", [d.contato, d.arroba].filter(Boolean).join("  •  "));
    } else {
      add("nome", d.nome); add("destaque2", d.cargo); add("info2", d.empresa); b.push({ r: "linha" });
      add("contato", d.telefone); add("contato", d.email); add("contato", d.instagram); add("contato", d.site); add("contato", d.endereco);
    }
    return b;
  }
  /* tamanho (fração da base), fonte (s=script d=display b=texto), maiúsculas, peso extra */
  var PAPEL = {
    pre: { s: 0.034, f: "b", up: 1, esp: 0.18, cor: "dest" }, script: { s: 0.085, f: "s" }, nome: { s: 0.125, f: "d" }, destaque: { s: 0.07, f: "d", cor: "dest" },
    destaque2: { s: 0.05, f: "b", cor: "dest", up: 1, esp: 0.08 }, preco: { s: 0.12, f: "d", cor: "dest" }, info: { s: 0.042, f: "b", peso: 700 }, info2: { s: 0.036, f: "b" },
    peq: { s: 0.027, f: "b", peso: 500 }, msg: { s: 0.034, f: "b", peso: 500, it: 1 }, cta: { s: 0.036, f: "b", peso: 800, up: 1 }, quote: { s: 0.062, f: "s" },
    contato: { s: 0.04, f: "b", peso: 600 }, linha: { s: 0.03 }
  };
  function fonte(p, px) {
    var P = PAPEL[p.r] || PAPEL.info, fam = par()[P.f || "b"], peso = P.peso && P.f === "b" ? P.peso : fam[1];
    return (P.it ? "italic " : "") + peso + " " + Math.round(px) + "px '" + fam[0] + "', Inter, system-ui, sans-serif";
  }
  function quebrar(ctx, txt, larg) {
    var saida = [];
    String(txt).split("\n").forEach(function (par0) {
      var pal = par0.split(/\s+/), l = "";
      pal.forEach(function (w) { var t = l ? l + " " + w : w; if (ctx.measureText(t).width > larg && l) { saida.push(l); l = w; } else l = t; });
      if (l) saida.push(l);
    });
    return saida;
  }
  function medir(ctx, bl, larg, base, k) {
    var tot = 0, out = bl.map(function (p, i) {
      var P = PAPEL[p.r] || PAPEL.info, fs = base * P.s * k;
      if (p.r === "linha") { var hh = fs * 1.2; tot += hh; return { p: p, fs: fs, h: hh, linhas: [] }; }
      ctx.font = fonte(p, fs); if (P.esp) ctx.letterSpacing = Math.round(fs * P.esp) + "px"; else ctx.letterSpacing = "0px";
      var txt = P.up ? p.t.toUpperCase() : p.t, linhas = quebrar(ctx, txt, p.r === "cta" ? larg * 0.8 : larg), lh = fs * (P.f === "s" ? 1.25 : 1.14);
      var h = p.r === "cta" ? fs * 2.3 : linhas.length * lh, gap = i < bl.length - 1 ? fs * (p.r === "pre" ? 0.55 : 0.32) : 0;
      tot += h + gap; return { p: p, fs: fs, lh: lh, h: h, gap: gap, linhas: linhas, txt: txt };
    });
    ctx.letterSpacing = "0px";
    return { itens: out, h: tot };
  }

  /* ================= FUNDOS PRONTOS (sem IA, desenhados no aparelho) ================= */
  function rnd(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function fundoPronto(W, H, variante) {
    var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d"), cs = cores(), r = rnd(7919 * (variante + 1) + E.estilo.length * 131), m = Math.min(W, H), est = E.estilo;
    var g = variante === 1 ? x.createRadialGradient(W * 0.5, H * 0.35, m * 0.05, W * 0.5, H * 0.5, Math.max(W, H) * 0.8) : x.createLinearGradient(0, 0, variante === 2 ? W : W * 0.3, H);
    g.addColorStop(0, cs[1]); g.addColorStop(1, cs[0]); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var claro = est === "minimal" || est === "floral" || est === "infantil" || est === "praia" || E.paleta === "pastel";
    var i, n;
    if (est === "festa" || est === "aniversario") {
      for (i = 0; i < 9; i++) { var bx = r() * W, by = r() * H * 0.55, br = m * (0.06 + r() * 0.06), bc = [cs[2], "#ffffff", cs[1], "#FF6B6B", "#4FC3F7"][i % 5];
        x.globalAlpha = 0.85; x.fillStyle = bc; x.beginPath(); x.ellipse(bx, by, br, br * 1.18, 0, 0, 7); x.fill(); x.globalAlpha = 0.35; x.fillStyle = "#fff"; x.beginPath(); x.ellipse(bx - br * 0.35, by - br * 0.4, br * 0.22, br * 0.3, -0.5, 0, 7); x.fill();
        x.globalAlpha = 0.6; x.strokeStyle = "#ffffff"; x.lineWidth = Math.max(1, m * 0.002); x.beginPath(); x.moveTo(bx, by + br * 1.18); x.quadraticCurveTo(bx + br * 0.4, by + br * 2.2, bx - br * 0.1, by + br * 3.2); x.stroke(); }
      for (i = 0; i < 160; i++) { x.globalAlpha = 0.5 + r() * 0.5; x.fillStyle = [cs[2], "#fff", "#FF6B6B", "#4FC3F7", "#FFD23F"][i % 5]; x.save(); x.translate(r() * W, r() * H); x.rotate(r() * 6); x.fillRect(0, 0, m * 0.012, m * 0.024); x.restore(); }
    } else if (est === "elegante" || est === "natal" || est === "neon" || est === "palco") {
      for (i = 0; i < 46; i++) { var cx = r() * W, cy = r() * H, rr = m * (0.02 + r() * 0.09), gg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
        gg.addColorStop(0, est === "neon" ? (i % 2 ? "#FF2FB9" : cs[2]) : cs[2]); gg.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = 0.25 + r() * 0.45; x.fillStyle = gg; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
      if (est === "palco") for (i = 0; i < 5; i++) { x.save(); x.globalAlpha = 0.22; var lx = W * (0.1 + i * 0.2), lg = x.createLinearGradient(lx, 0, lx, H); lg.addColorStop(0, cs[2]); lg.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = lg; x.beginPath(); x.moveTo(lx - m * 0.01, 0); x.lineTo(lx + m * 0.01, 0); x.lineTo(lx + (r() - 0.5) * W * 0.6 + m * 0.18, H); x.lineTo(lx + (r() - 0.5) * W * 0.6 - m * 0.18, H); x.fill(); x.restore(); }
      if (est === "elegante") { x.globalAlpha = 0.8; x.strokeStyle = cs[2]; x.lineWidth = Math.max(1.5, m * 0.004); var mg = m * 0.04; x.strokeRect(mg, mg, W - 2 * mg, H - 2 * mg); x.lineWidth = Math.max(1, m * 0.0015); x.strokeRect(mg * 1.5, mg * 1.5, W - 3 * mg, H - 3 * mg); }
      if (est === "neon") { x.globalAlpha = 1; x.shadowColor = cs[2]; x.shadowBlur = m * 0.03; x.strokeStyle = cs[2]; x.lineWidth = m * 0.006; var mg2 = m * 0.06; x.strokeRect(mg2, mg2, W - 2 * mg2, H - 2 * mg2); x.shadowColor = "#FF2FB9"; x.strokeStyle = "#FF2FB9"; x.lineWidth = m * 0.004; x.strokeRect(mg2 * 1.4, mg2 * 1.4, W - 2.8 * mg2, H - 2.8 * mg2); x.shadowBlur = 0; }
      if (est === "natal") for (i = 0; i < 90; i++) { x.globalAlpha = 0.5 + r() * 0.5; x.fillStyle = "#fff"; x.beginPath(); x.arc(r() * W, r() * H, m * (0.002 + r() * 0.005), 0, 7); x.fill(); }
    } else if (est === "infantil") {
      for (i = 0; i < 24; i++) { estrela(x, r() * W, r() * H, m * (0.015 + r() * 0.03), ["#FFD86F", "#ffffff", "#FF9AA2", "#B5EAD7"][i % 4], 0.8); }
      for (i = 0; i < 5; i++) nuvem(x, r() * W, r() * H * 0.6, m * (0.08 + r() * 0.06));
    } else if (est === "tropical") {
      for (i = 0; i < 14; i++) folha(x, (i % 2 ? W : 0) + (r() - 0.5) * W * 0.3, r() * H, m * (0.18 + r() * 0.16), (i % 2 ? Math.PI : 0) + (r() - 0.5) * 1.2, ["#0E6B3E", "#1E8E55", "#2FB36B"][i % 3]);
    } else if (est === "floral") {
      for (i = 0; i < 16; i++) flor(x, (r() < 0.5 ? r() * W * 0.3 : W - r() * W * 0.3), r() * H, m * (0.04 + r() * 0.07), [cs[2], "#F48FB1", "#FFFFFF", "#CE93D8"][i % 4]);
    } else if (est === "minimal" || est === "corporativo") {
      for (i = 0; i < 6; i++) { x.globalAlpha = est === "minimal" ? 0.08 : 0.16; x.fillStyle = i % 2 ? cs[2] : "#ffffff"; x.beginPath(); x.arc(r() * W, r() * H, m * (0.2 + r() * 0.4), 0, 7); x.fill(); }
      x.globalAlpha = est === "minimal" ? 0.25 : 0.45; x.strokeStyle = cs[2]; x.lineWidth = Math.max(1, m * 0.003);
      for (i = 0; i < 7; i++) { x.beginPath(); var y0 = H * (0.1 + r() * 0.8); x.moveTo(0, y0); x.bezierCurveTo(W * 0.3, y0 - m * 0.2 * r(), W * 0.7, y0 + m * 0.2 * r(), W, y0 - m * 0.1); x.stroke(); }
    } else if (est === "rustico") {
      for (i = 0; i < 60; i++) { x.globalAlpha = 0.06; x.fillStyle = i % 2 ? "#000" : "#fff"; x.fillRect(0, r() * H, W, m * 0.004 * (1 + r() * 3)); }
      x.globalAlpha = 0.9; x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = Math.max(1, m * 0.0025); x.beginPath(); x.moveTo(0, H * 0.08); x.quadraticCurveTo(W / 2, H * 0.18, W, H * 0.08); x.stroke();
      for (i = 0; i <= 12; i++) { var tx = W * i / 12, ty = H * 0.08 + Math.sin(Math.PI * i / 12) * H * 0.05, lgr = x.createRadialGradient(tx, ty, 0, tx, ty, m * 0.04); lgr.addColorStop(0, "#FFE9A8"); lgr.addColorStop(1, "rgba(255,200,80,0)"); x.fillStyle = lgr; x.beginPath(); x.arc(tx, ty, m * 0.04, 0, 7); x.fill(); }
    } else if (est === "praia") {
      var sol = x.createRadialGradient(W * 0.7, H * 0.3, 0, W * 0.7, H * 0.3, m * 0.3); sol.addColorStop(0, "rgba(255,240,200,1)"); sol.addColorStop(1, "rgba(255,200,120,0)"); x.fillStyle = sol; x.fillRect(0, 0, W, H);
      x.globalAlpha = 0.85; x.fillStyle = cs[2]; x.fillRect(0, H * 0.52, W, H * 0.2); x.fillStyle = "#F2D3A3"; x.beginPath(); x.moveTo(0, H * 0.72); x.quadraticCurveTo(W * 0.5, H * 0.66, W, H * 0.7); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      x.globalAlpha = 0.5; x.strokeStyle = "#fff"; x.lineWidth = Math.max(1, m * 0.004); for (i = 0; i < 6; i++) { x.beginPath(); var yy = H * (0.55 + i * 0.028); x.moveTo(0, yy); for (n = 0; n <= 10; n++) x.lineTo(W * n / 10, yy + Math.sin(n + i) * m * 0.006); x.stroke(); }
    }
    x.globalAlpha = 1; fundoNovo(x, W, H, m, cs, r, est); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; void claro; return c;
  }
  /* 22/11 — nichos adultos (gamer, esporte, música, festas): desenho próprio, sem marca, time, jogo ou artista de verdade */

  /* 22/11 — fundos de SUPER-HERÓI e ANIME (desenho próprio: cidade, quadrinho, céu de sakura, cidade neon sem letreiros) */
  function predios(x, W, H, m, r, base, cor, janelas) {
    var px = 0; x.globalAlpha = 1; while (px < W) { var bw = m * (0.06 + r() * 0.08), bh = H * (0.12 + r() * 0.3); x.fillStyle = cor; x.fillRect(px, base - bh, bw + 1, H - base + bh);
      if (janelas) for (var jy = base - bh + m * 0.02; jy < base - m * 0.02; jy += m * 0.03) for (var jx = px + m * 0.012; jx < px + bw - m * 0.015; jx += m * 0.022) if (r() < 0.45) { x.fillStyle = janelas[Math.floor(r() * janelas.length)]; x.globalAlpha = 0.55 + r() * 0.45; x.fillRect(jx, jy, m * 0.01, m * 0.014); x.globalAlpha = 1; }
      px += bw; }
  }
  function fundoTema(x, W, H, m, cs, r, est) {
    var i, k;
    if (est === "heroi") {
      for (i = 0; i < 120; i++) { x.globalAlpha = 0.3 + r() * 0.7; x.fillStyle = "#fff"; x.beginPath(); x.arc(r() * W, r() * H * 0.55, m * (0.001 + r() * 0.003), 0, 7); x.fill(); }
      var bx = W * 0.5, by = H, ang = -0.35;   /* holofote com o emblema no céu (raio próprio) */
      x.save(); x.globalAlpha = 0.22; x.fillStyle = "#fff6c8"; x.beginPath(); x.moveTo(bx - m * 0.02, by); x.lineTo(bx + m * 0.02, by); x.lineTo(W * 0.72 + m * 0.18, H * 0.14); x.lineTo(W * 0.72 - m * 0.18, H * 0.14); x.fill(); x.restore(); void ang;
      var ex = W * 0.72, ey = H * 0.14, er = m * 0.12, eg = x.createRadialGradient(ex, ey, 0, ex, ey, er * 1.6); eg.addColorStop(0, "rgba(255,246,200,.8)"); eg.addColorStop(0.6, "rgba(255,246,200,.45)"); eg.addColorStop(1, "rgba(255,246,200,0)");
      x.globalAlpha = 1; x.fillStyle = eg; x.beginPath(); x.ellipse(ex, ey, er * 1.5, er, 0, 0, 7); x.fill();
      x.fillStyle = cs[0]; x.save(); x.translate(ex, ey); x.scale(er / 12, er / 12); x.beginPath(); x.moveTo(3, -9); x.lineTo(-5, 1.5); x.lineTo(0, 1.5); x.lineTo(-2.5, 9); x.lineTo(5, -1.5); x.lineTo(0, -1.5); x.closePath(); x.globalAlpha = 0.75; x.fill(); x.restore();
      predios(x, W, H, m, r, H * 0.86, "rgba(8,10,24,.85)", null); predios(x, W, H, m, r, H * 0.95, "#05060f", ["#ffd86f", "#9ad7ff", "#ffffff"]);
      return true;
    }
    if (est === "quadrinho") {
      var cx = W / 2, cy = H * 0.42, R = Math.hypot(W, H);
      for (i = 0; i < 36; i++) { var a0 = Math.PI * 2 * i / 36, a1 = Math.PI * 2 * (i + 1) / 36; x.globalAlpha = 1; x.fillStyle = i % 2 ? cs[1] : cs[2]; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); x.lineTo(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R); x.fill(); }
      var q = m * 0.03; x.fillStyle = "rgba(0,0,0,.16)";
      for (var yy = 0; yy < H + q; yy += q) for (var xx = 0; xx < W + q; xx += q) { var u = Math.hypot(xx - cx, yy - cy) / (Math.max(W, H) * 0.7), rd = q * 0.45 * Math.min(1, Math.max(0, u - 0.25) * 1.6); if (rd > 0.4) { x.beginPath(); x.arc(xx, yy, rd, 0, 7); x.fill(); } }
      x.globalAlpha = 1; x.strokeStyle = "#111"; x.lineWidth = Math.max(4, m * 0.014); var mg = m * 0.03; x.strokeRect(mg, mg, W - 2 * mg, H - 2 * mg);
      return true;
    }
    if (est === "anime") {
      var lua = x.createRadialGradient(W * 0.68, H * 0.2, 0, W * 0.68, H * 0.2, m * 0.32); lua.addColorStop(0, "#fffaf0"); lua.addColorStop(0.42, "#ffe9f0"); lua.addColorStop(0.45, "rgba(255,210,230,.35)"); lua.addColorStop(1, "rgba(255,200,230,0)");
      x.globalAlpha = 1; x.fillStyle = lua; x.fillRect(0, 0, W, H);
      for (i = 0; i < 60; i++) { x.globalAlpha = 0.3 + r() * 0.6; x.fillStyle = "#fff"; x.beginPath(); x.arc(r() * W, r() * H * 0.6, m * (0.001 + r() * 0.003), 0, 7); x.fill(); }
      x.globalAlpha = 0.55; x.fillStyle = "#3a1d5a"; x.beginPath(); x.moveTo(0, H); for (i = 0; i <= 8; i++) x.lineTo(W * i / 8, H * (0.8 + Math.sin(i * 1.7) * 0.04)); x.lineTo(W, H); x.fill();
      [[0, 0, 1], [W, 0, -1]].forEach(function (o) {   /* galhos de cerejeira nos cantos */
        x.save(); x.translate(o[0], o[1]); x.scale(o[2], 1); x.globalAlpha = 1; x.strokeStyle = "#4a2a22"; x.lineCap = "round"; x.lineWidth = m * 0.016;
        x.beginPath(); x.moveTo(-m * 0.02, m * 0.05); x.quadraticCurveTo(m * 0.18, m * 0.1, m * 0.34, m * 0.06); x.stroke(); x.lineWidth = m * 0.008; x.beginPath(); x.moveTo(m * 0.16, m * 0.09); x.quadraticCurveTo(m * 0.22, m * 0.18, m * 0.2, m * 0.26); x.stroke();
        for (k = 0; k < 18; k++) { var fx = m * (0.02 + r() * 0.34), fy = m * (0.02 + r() * 0.24), fr = m * (0.012 + r() * 0.012); x.fillStyle = k % 3 ? "#ffb7cf" : "#ffe1ea"; x.globalAlpha = 0.95; for (var p = 0; p < 5; p++) { var pa = Math.PI * 2 * p / 5; x.beginPath(); x.ellipse(fx + Math.cos(pa) * fr * 0.7, fy + Math.sin(pa) * fr * 0.7, fr * 0.55, fr * 0.4, pa, 0, 7); x.fill(); } }
        x.restore(); });
      return true;
    }
    if (est === "animeneon") {
      for (i = 0; i < 40; i++) { x.globalAlpha = 0.25; x.strokeStyle = "#9ad7ff"; x.lineWidth = Math.max(1, m * 0.0015); var rx = r() * W, ry = r() * H; x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - m * 0.01, ry + m * 0.05); x.stroke(); }
      predios(x, W, H, m, r, H * 0.8, "#14123a", ["#ff2fb9", "#00f0ff", "#ffd23f"]);
      for (i = 0; i < 9; i++) { var sx = r() * W, sy = H * (0.35 + r() * 0.35), sw = m * 0.02, sh = m * (0.08 + r() * 0.1), c = ["#ff2fb9", "#00f0ff", "#ffd23f", "#b388ff"][i % 4];
        x.save(); x.globalAlpha = 0.9; x.shadowColor = c; x.shadowBlur = m * 0.03; x.strokeStyle = c; x.lineWidth = Math.max(1.5, m * 0.004); x.strokeRect(sx, sy, sw, sh); for (k = 1; k < 4; k++) { x.beginPath(); x.moveTo(sx + sw * 0.25, sy + sh * k / 4); x.lineTo(sx + sw * 0.75, sy + sh * k / 4); x.stroke(); } x.restore(); }
      predios(x, W, H, m, r, H * 0.95, "#070615", ["#ff2fb9", "#00f0ff"]);
      var ch = x.createLinearGradient(0, H * 0.9, 0, H); ch.addColorStop(0, "rgba(255,47,185,0)"); ch.addColorStop(1, "rgba(255,47,185,.35)"); x.globalAlpha = 1; x.fillStyle = ch; x.fillRect(0, H * 0.9, W, H * 0.1);
      return true;
    }
    return false;
  }
  function fundoAdulto(x, W, H, m, cs, r, est) {
    var i, k;
    if (fundoTema(x, W, H, m, cs, r, est)) return true;
    if (est === "gamer") {
      x.globalAlpha = 0.25; x.strokeStyle = cs[2]; x.lineWidth = Math.max(1, m * 0.0015);
      for (i = 0; i <= 14; i++) { var yy = H * 0.62 + Math.pow(i / 14, 2) * H * 0.38; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
      for (i = -12; i <= 12; i++) { x.beginPath(); x.moveTo(W / 2 + i * m * 0.02, H * 0.62); x.lineTo(W / 2 + i * m * 0.2, H); x.stroke(); }
      x.globalAlpha = 0.8; x.lineWidth = Math.max(1.5, m * 0.004); var mg = m * 0.05, c = m * 0.08;
      [[mg, mg, 1, 1], [W - mg, mg, -1, 1], [W - mg, H - mg, -1, -1], [mg, H - mg, 1, -1]].forEach(function (q, j) { x.strokeStyle = j % 2 ? "#FF2FB9" : cs[2]; x.beginPath(); x.moveTo(q[0], q[1] + q[3] * c); x.lineTo(q[0], q[1]); x.lineTo(q[0] + q[2] * c, q[1]); x.stroke(); });
      for (i = 0; i < 40; i++) { x.globalAlpha = 0.5; x.fillStyle = i % 2 ? cs[2] : "#FF2FB9"; var q2 = m * 0.008; x.fillRect(Math.floor(r() * W / q2) * q2, Math.floor(r() * H * 0.6 / q2) * q2, q2, q2); }
      return true;
    }
    if (est === "futebol" || est === "basquete") {
      if (est === "futebol") { for (i = 0; i < 10; i++) { x.globalAlpha = 0.12; x.fillStyle = i % 2 ? "#ffffff" : "#000000"; x.fillRect(0, H * i / 10, W, H / 10); } }
      else { for (i = 0; i < 30; i++) { x.globalAlpha = 0.07; x.fillStyle = i % 2 ? "#000" : "#fff"; x.fillRect(W * i / 30, 0, W / 30, H); } }
      x.globalAlpha = 0.6; x.strokeStyle = "#fff"; x.lineWidth = Math.max(2, m * 0.006); x.beginPath(); x.moveTo(0, H / 2); x.lineTo(W, H / 2); x.stroke(); x.beginPath(); x.arc(W / 2, H / 2, m * 0.2, 0, 7); x.stroke();
      x.strokeRect(W * 0.22, -2, W * 0.56, H * 0.14); x.strokeRect(W * 0.22, H * 0.86, W * 0.56, H * 0.15);
      for (i = 0; i < 4; i++) { var lx = W * (i < 2 ? 0.05 : 0.95), ly = H * (i % 2 ? 0.02 : 0.98), lg = x.createRadialGradient(lx, ly, 0, lx, ly, m * 0.6); lg.addColorStop(0, "rgba(255,255,230,.35)"); lg.addColorStop(1, "rgba(255,255,230,0)"); x.globalAlpha = 1; x.fillStyle = lg; x.fillRect(0, 0, W, H); }
      return true;
    }
    if (est === "fitness" || est === "corrida") {
      for (i = 0; i < 6; i++) { x.globalAlpha = 0.18 + i * 0.03; x.fillStyle = i % 2 ? cs[2] : "#ffffff"; x.beginPath(); var o = W * (i * 0.22 - 0.3); x.moveTo(o, H); x.lineTo(o + W * 0.12, H); x.lineTo(o + W * 0.62, 0); x.lineTo(o + W * 0.5, 0); x.fill(); }
      if (est === "corrida") { var q = m * 0.04; for (i = 0; i < Math.ceil(W / q); i++) for (k = 0; k < 2; k++) { x.globalAlpha = 0.9; x.fillStyle = (i + k) % 2 ? "#fff" : "#111"; x.fillRect(i * q, k * q, q, q); x.fillRect(i * q, H - (k + 1) * q, q, q); } }
      return true;
    }
    if (est === "rock") {
      for (i = 0; i < 1800; i++) { x.globalAlpha = 0.06 + r() * 0.08; x.fillStyle = r() < 0.5 ? "#fff" : "#000"; x.fillRect(r() * W, r() * H, m * 0.004, m * 0.004); }
      var lr = x.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, H); lr.addColorStop(0, "rgba(229,57,53,.55)"); lr.addColorStop(1, "rgba(229,57,53,0)"); x.globalAlpha = 1; x.fillStyle = lr; x.fillRect(0, 0, W, H);
      x.globalAlpha = 0.6; x.strokeStyle = "#fff"; x.lineWidth = m * 0.004; for (i = 0; i < 4; i++) { x.beginPath(); var sx = r() * W, sy = r() * H * 0.5; x.moveTo(sx, sy); for (k = 0; k < 4; k++) x.lineTo(sx + (r() - 0.5) * m * 0.1, sy + k * m * 0.03); x.stroke(); }
      return true;
    }
    if (est === "sertanejo") {
      for (i = 0; i < 12; i++) { x.globalAlpha = 0.18; x.fillStyle = i % 2 ? "#000" : "#fff"; x.fillRect(0, H * (0.55 + i * 0.04), W, H * 0.02); }
      for (i = 0; i < 80; i++) { x.globalAlpha = 0.4 + r() * 0.6; x.fillStyle = "#fff8e1"; x.beginPath(); x.arc(r() * W, r() * H * 0.5, m * (0.001 + r() * 0.003), 0, 7); x.fill(); }
      x.globalAlpha = 0.9; x.fillStyle = "#1a0f08"; x.beginPath(); x.moveTo(0, H * 0.55); for (i = 0; i <= 10; i++) x.lineTo(W * i / 10, H * (0.5 + r() * 0.05)); x.lineTo(W, H * 0.6); x.lineTo(0, H * 0.6); x.fill();
      return true;
    }
    if (est === "samba") {
      for (i = 0; i < 30; i++) { x.globalAlpha = 0.2; x.strokeStyle = ["#ffd23f", "#5ccf7a", "#ff4f7b", "#4fc3f7"][i % 4]; x.lineWidth = m * 0.01; x.beginPath(); var y0 = r() * H; x.moveTo(-10, y0); x.bezierCurveTo(W * 0.3, y0 - m * 0.2, W * 0.7, y0 + m * 0.2, W + 10, y0 - m * 0.1); x.stroke(); }
      for (i = 0; i < 18; i++) { x.globalAlpha = 0.5; circ2(x, r() * W, r() * H, m * (0.01 + r() * 0.02), ["#ffd23f", "#fff", "#ff4f7b"][i % 3]); }
      return true;
    }
    if (est === "eletronica") {
      x.globalCompositeOperation = "lighter"; for (i = 0; i < 14; i++) { x.globalAlpha = 0.25; x.strokeStyle = ["#00f0ff", "#ff2fb9", "#b388ff"][i % 3]; x.lineWidth = Math.max(1, m * 0.003); x.beginPath(); x.moveTo(W / 2, H * 0.35); var a = Math.PI * 2 * i / 14 + r() * 0.2; x.lineTo(W / 2 + Math.cos(a) * W * 1.4, H * 0.35 + Math.sin(a) * W * 1.4); x.stroke(); }
      x.globalCompositeOperation = "source-over"; var n = 30, bw = W / n; for (i = 0; i < n; i++) { var hh = H * (0.04 + r() * 0.16); x.globalAlpha = 0.55; x.fillStyle = i % 2 ? cs[2] : "#00f0ff"; x.fillRect(i * bw + bw * 0.2, H - hh, bw * 0.6, hh); }
      return true;
    }
    if (est === "retro80") {
      var sy0 = H * 0.42, sr = m * 0.3, sg = x.createLinearGradient(0, sy0 - sr, 0, sy0 + sr); sg.addColorStop(0, "#ffd23f"); sg.addColorStop(1, "#ff2fb9");
      x.save(); x.beginPath(); x.arc(W / 2, sy0, sr, 0, 7); x.clip(); x.fillStyle = sg; x.fillRect(0, 0, W, H); x.fillStyle = cs[0]; for (i = 0; i < 6; i++) x.fillRect(0, sy0 + sr * (0.1 + i * 0.16), W, sr * 0.04 + i * sr * 0.015); x.restore();
      x.fillStyle = cs[0]; x.globalAlpha = 1; x.fillRect(0, H * 0.6, W, H * 0.4); x.strokeStyle = cs[2]; x.globalAlpha = 0.7; x.lineWidth = Math.max(1, m * 0.003);
      for (i = 0; i <= 12; i++) { var yy2 = H * 0.6 + Math.pow(i / 12, 2) * H * 0.4; x.beginPath(); x.moveTo(0, yy2); x.lineTo(W, yy2); x.stroke(); }
      for (i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(W / 2 + i * m * 0.03, H * 0.6); x.lineTo(W / 2 + i * m * 0.25, H); x.stroke(); }
      return true;
    }
    if (est === "vinho") {
      for (i = 0; i < 16; i++) { var cx = r() * W, cy = r() * H, rr = m * (0.04 + r() * 0.1), g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, "rgba(255,190,120,.35)"); g.addColorStop(1, "rgba(255,190,120,0)"); x.globalAlpha = 1; x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill(); }
      x.globalAlpha = 0.7; x.strokeStyle = cs[2]; x.lineWidth = Math.max(1, m * 0.0025); var mv = m * 0.05; x.strokeRect(mv, mv, W - 2 * mv, H - 2 * mv);
      return true;
    }
    if (est === "luau") {
      var lua = x.createRadialGradient(W * 0.5, H * 0.22, 0, W * 0.5, H * 0.22, m * 0.25); lua.addColorStop(0, "#fff8e1"); lua.addColorStop(0.35, "#ffe6a8"); lua.addColorStop(0.38, "rgba(255,230,170,.25)"); lua.addColorStop(1, "rgba(255,230,170,0)"); x.globalAlpha = 1; x.fillStyle = lua; x.fillRect(0, 0, W, H);
      x.fillStyle = "#06142B"; x.fillRect(0, H * 0.55, W, H * 0.45); x.globalAlpha = 0.5; x.strokeStyle = "#ffe6a8"; x.lineWidth = Math.max(1, m * 0.003); for (i = 0; i < 12; i++) { var wy = H * (0.57 + i * 0.03), ww = m * (0.3 - i * 0.015); x.beginPath(); x.moveTo(W / 2 - ww, wy); x.lineTo(W / 2 + ww, wy); x.stroke(); }
      [0.1, 0.9].forEach(function (fx) { var tx = W * fx, ty = H * 0.62; x.globalAlpha = 1; x.fillStyle = "#4a2a14"; x.fillRect(tx - m * 0.006, ty, m * 0.012, H * 0.3); var fg = x.createRadialGradient(tx, ty, 0, tx, ty, m * 0.08); fg.addColorStop(0, "rgba(255,180,70,.9)"); fg.addColorStop(1, "rgba(255,120,30,0)"); x.fillStyle = fg; x.beginPath(); x.arc(tx, ty, m * 0.08, 0, 7); x.fill(); });
      return true;
    }
    if (est === "cinema") {
      [0, 1].forEach(function (s) { for (i = 0; i < 8; i++) { var cx2 = s ? W - W * 0.04 * i : W * 0.04 * i, g2 = x.createLinearGradient(cx2 - W * 0.02, 0, cx2 + W * 0.02, 0); g2.addColorStop(0, "#3a0508"); g2.addColorStop(0.5, "#a3141f"); g2.addColorStop(1, "#3a0508"); x.globalAlpha = 1; x.fillStyle = g2; x.fillRect(cx2 - W * 0.02, 0, W * 0.04, H); } });
      x.fillStyle = "#7a0c14"; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(W, H * 0.06); for (i = 10; i >= 0; i--) x.quadraticCurveTo(W * (i + 0.5) / 10, H * 0.1, W * i / 10, H * 0.06); x.fill();
      var sp = x.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, m * 0.5); sp.addColorStop(0, "rgba(255,240,200,.25)"); sp.addColorStop(1, "rgba(255,240,200,0)"); x.fillStyle = sp; x.fillRect(0, 0, W, H);
      return true;
    }
    return false;
  }
  function circ2(x, cx, cy, r, c) { x.fillStyle = c; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  /* 22/11 — estilos novos (desenho próprio, nada de arte de terceiros) */
  function fundoNovo(x, W, H, m, cs, r, est) {
    var i, n, k;
    if (est === "luxo") {
      x.strokeStyle = cs[2]; x.globalAlpha = 0.9; var mg = m * 0.045;
      x.lineWidth = Math.max(1.5, m * 0.004); x.strokeRect(mg, mg, W - 2 * mg, H - 2 * mg); x.lineWidth = Math.max(1, m * 0.0015); x.strokeRect(mg * 1.6, mg * 1.6, W - 3.2 * mg, H - 3.2 * mg);
      [[mg, mg, 0], [W - mg, mg, 1], [W - mg, H - mg, 2], [mg, H - mg, 3]].forEach(function (q) {   // leques art déco nos cantos
        x.save(); x.translate(q[0], q[1]); x.rotate(q[2] * Math.PI / 2); x.lineWidth = Math.max(1, m * 0.002);
        for (k = 1; k <= 4; k++) { x.beginPath(); x.arc(0, 0, m * 0.035 * k, 0, Math.PI / 2); x.stroke(); }
        for (k = 0; k <= 6; k++) { var a = Math.PI / 2 * k / 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * m * 0.14, Math.sin(a) * m * 0.14); x.stroke(); } x.restore();
      });
      x.globalAlpha = 0.25; x.lineWidth = Math.max(1, m * 0.0015);   // raios do sol no alto
      for (i = 0; i < 25; i++) { var ang = Math.PI * (0.1 + 0.8 * i / 24); x.beginPath(); x.moveTo(W / 2, H * 0.02); x.lineTo(W / 2 + Math.cos(ang) * m * 0.5, H * 0.02 + Math.sin(ang) * m * 0.5); x.stroke(); }
      x.globalAlpha = 0.9; x.beginPath(); x.moveTo(W / 2, H * 0.06); x.lineTo(W / 2 + m * 0.03, H * 0.06 + m * 0.03); x.lineTo(W / 2, H * 0.06 + m * 0.06); x.lineTo(W / 2 - m * 0.03, H * 0.06 + m * 0.03); x.closePath(); x.stroke();
    } else if (est === "marmore") {
      for (i = 0; i < 14; i++) {
        x.globalAlpha = 0.06 + r() * 0.12; x.strokeStyle = i % 4 ? "#7d7468" : cs[2]; x.lineWidth = m * (0.001 + r() * 0.004);
        var y0 = r() * H; x.beginPath(); x.moveTo(-10, y0); for (k = 1; k <= 8; k++) x.quadraticCurveTo(W * (k - 0.5) / 8 + (r() - 0.5) * m * 0.1, y0 + (r() - 0.5) * m * 0.25, W * k / 8, y0 + (r() - 0.5) * m * 0.2 + k * m * 0.02); x.stroke();
      }
      x.globalAlpha = 0.85; x.strokeStyle = cs[2]; x.lineWidth = Math.max(1.5, m * 0.003); var mm = m * 0.05; x.strokeRect(mm, mm, W - 2 * mm, H - 2 * mm);
    } else if (est === "aquarela") {
      var tintas = [cs[2], "#F7B7A3", "#A8D5BA", "#F3C5D8", "#C9B6E4"];
      for (i = 0; i < 26; i++) { var cxx = (r() < 0.5 ? r() * 0.3 : 1 - r() * 0.3) * W, cyy = (r() < 0.5 ? r() * 0.28 : 1 - r() * 0.28) * H, rr0 = m * (0.06 + r() * 0.14);
        x.globalAlpha = 0.08 + r() * 0.1; x.fillStyle = tintas[i % 5]; x.beginPath(); for (k = 0; k <= 18; k++) { var aa = Math.PI * 2 * k / 18, rv = rr0 * (0.75 + r() * 0.5); x.lineTo(cxx + Math.cos(aa) * rv, cyy + Math.sin(aa) * rv); } x.fill(); }
      for (i = 0; i < 8; i++) flor(x, (i % 2 ? W - r() * W * 0.2 : r() * W * 0.2), (i < 4 ? r() * H * 0.2 : H - r() * H * 0.2), m * (0.035 + r() * 0.04), tintas[i % 5]);
    } else if (est === "vintage") {
      for (i = 0; i < 2600; i++) { x.globalAlpha = 0.05 + r() * 0.08; x.fillStyle = r() < 0.5 ? "#6b4a2b" : "#fff"; x.fillRect(r() * W, r() * H, m * 0.003, m * 0.003); }
      var vg = x.createRadialGradient(W / 2, H / 2, m * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(80,50,20,.45)"); x.globalAlpha = 1; x.fillStyle = vg; x.fillRect(0, 0, W, H);
      x.strokeStyle = cs[2]; x.globalAlpha = 0.75; var mv = m * 0.05; x.lineWidth = Math.max(1.5, m * 0.004); x.strokeRect(mv, mv, W - 2 * mv, H - 2 * mv); x.lineWidth = Math.max(1, m * 0.0015); x.setLineDash([m * 0.01, m * 0.008]); x.strokeRect(mv * 1.5, mv * 1.5, W - 3 * mv, H - 3 * mv); x.setLineDash([]);
      [[mv, mv], [W - mv, mv], [W - mv, H - mv], [mv, H - mv]].forEach(function (q) { x.beginPath(); x.arc(q[0], q[1], m * 0.022, 0, 7); x.stroke(); x.beginPath(); x.arc(q[0], q[1], m * 0.01, 0, 7); x.fillStyle = cs[2]; x.fill(); });
    } else if (est === "lousa") {
      for (i = 0; i < 40; i++) { x.globalAlpha = 0.03 + r() * 0.05; x.strokeStyle = "#fff"; x.lineWidth = m * (0.02 + r() * 0.05); x.beginPath(); var lx = r() * W, ly = r() * H; x.moveTo(lx, ly); x.lineTo(lx + (r() - 0.5) * m * 0.4, ly + (r() - 0.5) * m * 0.15); x.stroke(); }
      x.globalAlpha = 0.6; x.strokeStyle = "#f2efe6"; x.lineWidth = Math.max(1.5, m * 0.003); x.setLineDash([m * 0.03, m * 0.012]); var ml = m * 0.05; x.strokeRect(ml, ml, W - 2 * ml, H - 2 * ml); x.setLineDash([]);
      for (i = 0; i < 10; i++) { x.globalAlpha = 0.5; x.lineWidth = Math.max(1, m * 0.002); var sx = (i % 2 ? W - ml * 2.2 : ml * 2.2) + (r() - 0.5) * m * 0.05, sy = H * (0.1 + 0.8 * i / 9); x.beginPath(); for (k = 0; k < 10; k++) { var a2 = Math.PI / 5 * k - Math.PI / 2, rr2 = k % 2 ? m * 0.008 : m * 0.02; x.lineTo(sx + Math.cos(a2) * rr2, sy + Math.sin(a2) * rr2); } x.closePath(); x.stroke(); }
    } else if (est === "espacial") {
      [["#6a2bd9", 0.25, 0.3], ["#1e6fd9", 0.75, 0.65], ["#d92b8a", 0.4, 0.85]].forEach(function (nb) { var gx = x.createRadialGradient(W * nb[1], H * nb[2], 0, W * nb[1], H * nb[2], m * 0.55); gx.addColorStop(0, nb[0]); gx.addColorStop(1, "rgba(0,0,0,0)"); x.globalAlpha = 0.35; x.fillStyle = gx; x.fillRect(0, 0, W, H); });
      for (i = 0; i < 260; i++) { x.globalAlpha = 0.3 + r() * 0.7; x.fillStyle = "#fff"; x.beginPath(); x.arc(r() * W, r() * H, m * (0.001 + r() * 0.0035), 0, 7); x.fill(); }
      var px0 = W * 0.82, py0 = H * 0.14, pr = m * 0.1, pg = x.createRadialGradient(px0 - pr * 0.4, py0 - pr * 0.4, pr * 0.1, px0, py0, pr); pg.addColorStop(0, "#ffd9a0"); pg.addColorStop(1, "#d9772b"); x.globalAlpha = 1; x.fillStyle = pg; x.beginPath(); x.arc(px0, py0, pr, 0, 7); x.fill();
      x.strokeStyle = "rgba(255,230,190,.8)"; x.lineWidth = m * 0.008; x.beginPath(); x.ellipse(px0, py0, pr * 1.7, pr * 0.4, -0.35, 0, 7); x.stroke();
    } else if (est === "mar") {
      for (i = 0; i < 7; i++) { x.save(); x.globalAlpha = 0.12; x.fillStyle = "#fff"; var rx = W * (0.05 + i * 0.16); x.beginPath(); x.moveTo(rx, 0); x.lineTo(rx + m * 0.06, 0); x.lineTo(rx + m * 0.2, H * 0.8); x.lineTo(rx + m * 0.05, H * 0.8); x.fill(); x.restore(); }
      for (i = 0; i < 30; i++) { x.globalAlpha = 0.35; x.strokeStyle = "#fff"; x.lineWidth = Math.max(1, m * 0.0025); x.beginPath(); x.arc(r() * W, r() * H, m * (0.006 + r() * 0.018), 0, 7); x.stroke(); }
      x.globalAlpha = 1; x.fillStyle = "#e8cf8f"; x.beginPath(); x.moveTo(0, H * 0.9); x.quadraticCurveTo(W * 0.5, H * 0.84, W, H * 0.9); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      for (i = 0; i < 9; i++) { var bxx = r() * W, alg = m * (0.12 + r() * 0.15); x.strokeStyle = ["#2e9e5a", "#3fbf6f", "#1f7a45"][i % 3]; x.lineWidth = m * 0.012; x.lineCap = "round"; x.beginPath(); x.moveTo(bxx, H * 0.92); x.bezierCurveTo(bxx - m * 0.04, H * 0.92 - alg * 0.33, bxx + m * 0.04, H * 0.92 - alg * 0.66, bxx, H * 0.92 - alg); x.stroke(); }
    } else if (est === "junina") {
      for (i = 0; i < 3; i++) { var by0 = H * (0.04 + i * 0.07), nb = 12; for (k = 0; k < nb; k++) { var ax = W * k / nb, cx2 = W * (k + 1) / nb, ay = by0 + Math.sin(k / nb * Math.PI) * H * 0.03, cy2 = by0 + Math.sin((k + 1) / nb * Math.PI) * H * 0.03;
        x.globalAlpha = 0.95; x.fillStyle = ["#e53935", "#ffd23f", "#1e88e5", "#5ccf7a", "#ff7ab6", "#ff9a3c"][(k + i * 2) % 6]; x.beginPath(); x.moveTo(ax, ay); x.lineTo(cx2, cy2); x.lineTo((ax + cx2) / 2, (ay + cy2) / 2 + m * 0.06); x.closePath(); x.fill(); } }
      var fog = x.createRadialGradient(W / 2, H, 0, W / 2, H, m * 0.6); fog.addColorStop(0, "rgba(255,200,80,.55)"); fog.addColorStop(1, "rgba(255,120,40,0)"); x.globalAlpha = 1; x.fillStyle = fog; x.fillRect(0, 0, W, H);
      for (i = 0; i < 1200; i++) { x.globalAlpha = 0.06; x.fillStyle = "#ffe9a8"; x.fillRect(r() * W, r() * H, m * 0.012, m * 0.002); }
    } else if (est === "halloween") {
      var lua = x.createRadialGradient(W * 0.7, H * 0.2, 0, W * 0.7, H * 0.2, m * 0.32); lua.addColorStop(0, "#fff3c4"); lua.addColorStop(0.45, "#ffd27a"); lua.addColorStop(0.47, "rgba(255,180,80,.35)"); lua.addColorStop(1, "rgba(255,150,60,0)"); x.globalAlpha = 1; x.fillStyle = lua; x.fillRect(0, 0, W, H);
      for (i = 0; i < 7; i++) { var bx2 = W * (0.15 + r() * 0.75), by2 = H * (0.08 + r() * 0.3), bs = m * (0.03 + r() * 0.03); x.fillStyle = "#120a1f"; x.globalAlpha = 0.9; x.beginPath(); x.moveTo(bx2, by2); x.quadraticCurveTo(bx2 - bs, by2 - bs * 0.8, bx2 - bs * 2, by2); x.quadraticCurveTo(bx2 - bs * 1.4, by2 - bs * 0.1, bx2 - bs, by2 + bs * 0.3); x.quadraticCurveTo(bx2 - bs * 0.3, by2 + bs * 0.1, bx2, by2 + bs * 0.4); x.quadraticCurveTo(bx2 + bs * 0.3, by2 + bs * 0.1, bx2 + bs, by2 + bs * 0.3); x.quadraticCurveTo(bx2 + bs * 1.4, by2 - bs * 0.1, bx2 + bs * 2, by2); x.quadraticCurveTo(bx2 + bs, by2 - bs * 0.8, bx2, by2); x.fill(); }
      x.globalAlpha = 0.35; x.strokeStyle = "#cfc6e8"; x.lineWidth = Math.max(1, m * 0.0015); for (k = 0; k < 6; k++) { var a3 = Math.PI / 2 * k / 5; x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a3) * m * 0.3, Math.sin(a3) * m * 0.3); x.stroke(); }
      for (k = 1; k <= 4; k++) { x.beginPath(); for (n = 0; n <= 5; n++) { var a4 = Math.PI / 2 * n / 5; x.lineTo(Math.cos(a4) * m * 0.07 * k, Math.sin(a4) * m * 0.07 * k); } x.stroke(); }
    } else if (est === "bebe") {
      for (i = 0; i < 6; i++) nuvem(x, r() * W, r() * H, m * (0.06 + r() * 0.05));
      for (i = 0; i < 30; i++) estrela(x, r() * W, r() * H, m * (0.008 + r() * 0.014), ["#ffd86f", "#ffffff", "#ffb3c7", "#9ccfff"][i % 4], 0.8);
      for (i = 0; i < 40; i++) { x.globalAlpha = 0.25; x.fillStyle = cs[2]; x.beginPath(); x.arc(r() * W, r() * H, m * 0.006, 0, 7); x.fill(); }
    } else if (est === "circo") {
      var nr = 24; for (i = 0; i < nr; i++) { x.globalAlpha = 1; x.fillStyle = i % 2 ? "#B3122E" : "#F4E9D8"; x.beginPath(); x.moveTo(W / 2, -H * 0.1); var a5 = Math.PI * i / nr, a6 = Math.PI * (i + 1) / nr; x.lineTo(W / 2 + Math.cos(a5) * Math.max(W, H) * 1.5, -H * 0.1 + Math.sin(a5) * Math.max(W, H) * 1.5); x.lineTo(W / 2 + Math.cos(a6) * Math.max(W, H) * 1.5, -H * 0.1 + Math.sin(a6) * Math.max(W, H) * 1.5); x.fill(); }
      x.fillStyle = "#B3122E"; var ns = 9; for (i = 0; i < ns; i++) { x.beginPath(); x.arc(W * (i + 0.5) / ns, 0, W / ns / 2, 0, Math.PI); x.fill(); }
      x.fillStyle = cs[2]; for (i = 0; i < ns; i++) { x.beginPath(); x.arc(W * (i + 0.5) / ns, W / ns / 2, m * 0.01, 0, 7); x.fill(); }
    } else if (fundoAdulto(x, W, H, m, cs, r, est)) {
    } else if (est === "safari") {
      var solS = x.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, m * 0.25); solS.addColorStop(0, "rgba(255,220,120,.9)"); solS.addColorStop(1, "rgba(255,200,100,0)"); x.fillStyle = solS; x.fillRect(0, 0, W, H);
      for (i = 0; i < 22; i++) folha(x, (i % 2 ? W : 0) + (r() - 0.5) * W * 0.25, (i < 11 ? r() * H * 0.3 : H - r() * H * 0.3), m * (0.15 + r() * 0.12), (i % 2 ? Math.PI : 0) + (r() - 0.5) * 1.4, ["#2E6B3A", "#3f8f4e", "#5aa85f", "#1f5a2e"][i % 4]);
    }
  }
  function estrela(x, cx, cy, r, cor, a) { x.save(); x.globalAlpha = a; x.fillStyle = cor; x.beginPath(); for (var i = 0; i < 10; i++) { var ang = Math.PI / 5 * i - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr); } x.closePath(); x.fill(); x.restore(); }
  function nuvem(x, cx, cy, r) { x.save(); x.globalAlpha = 0.75; x.fillStyle = "#fff"; [[0, 0, 1], [0.9, 0.15, 0.75], [-0.9, 0.18, 0.7], [0.4, -0.35, 0.7]].forEach(function (k) { x.beginPath(); x.arc(cx + k[0] * r, cy + k[1] * r, r * k[2], 0, 7); x.fill(); }); x.restore(); }
  function folha(x, cx, cy, r, ang, cor) { x.save(); x.translate(cx, cy); x.rotate(ang); x.globalAlpha = 0.9; x.fillStyle = cor; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(r * 0.5, -r * 0.35, r, 0); x.quadraticCurveTo(r * 0.5, r * 0.35, 0, 0); x.fill(); x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = Math.max(1, r * 0.02); x.beginPath(); x.moveTo(0, 0); x.lineTo(r, 0); x.stroke(); x.restore(); }
  function flor(x, cx, cy, r, cor) { x.save(); x.globalAlpha = 0.85; x.fillStyle = cor; for (var i = 0; i < 6; i++) { var a = Math.PI / 3 * i; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.55, r * 0.32, a, 0, 7); x.fill(); } x.fillStyle = "#FFD54F"; x.beginPath(); x.arc(cx, cy, r * 0.28, 0, 7); x.fill(); x.restore(); }

  /* ================= DESENHO FINAL ================= */
  function capa(x, img, X, Y, W, H) {   /* desenha cobrindo a área (corta o que sobra) */
    var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(W / iw, H / ih), dw = iw * s, dh = ih * s;
    x.drawImage(img, X + (W - dw) / 2, Y + (H - dh) / 2, dw, dh);
  }
  function lum(x, X, Y, W, H) {
    try { var d = x.getImageData(Math.max(0, X | 0), Math.max(0, Y | 0), Math.max(1, W | 0), Math.max(1, H | 0)).data, s = 0, n = 0;
      for (var i = 0; i < d.length; i += 4 * 37) { s += (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255; n++; } return n ? s / n : 0.5; } catch (e) { return 0.5; }
  }
  function rr(x, X, Y, W, H, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath(); }
  function desfocado(c, W, H, k) { var p = document.createElement("canvas"); p.width = Math.max(1, Math.round(W / k)); p.height = Math.max(1, Math.round(H / k)); p.getContext("2d").drawImage(c, 0, 0, p.width, p.height); return p; }
  var FUNDO_CACHE = { k: "", c: null };
  function fundoCache(W, H) {
    var k = W + "x" + H + "|" + E.estilo + "|" + E.paleta + "|" + cores().join(",");
    if (FUNDO_CACHE.k !== k) { if (FUNDO_CACHE.c) FUNDO_CACHE.c.width = 1; FUNDO_CACHE = { k: k, c: fundoPronto(W, H, 0) }; }
    return FUNDO_CACHE.c;
  }
  function animOn(t) { return t != null && E.anim && E.anim.ligado; }
  function txAnim(i, t) {   /* como o bloco i do texto entra no tempo t */
    if (!animOn(t) || E.anim.texto === "nenhuma") return { a: 1, dy: 0, sc: 1, f: 1 };
    var m = E.anim.texto, p = lim((t - 0.35 - i * 0.17) / 0.7, 0, 1), e = 1 - Math.pow(1 - p, 3);
    if (m === "subir") return { a: e, dy: (1 - e) * 0.07, sc: 1, f: 1 };
    if (m === "zoom") return { a: e, dy: 0, sc: 0.55 + 0.45 * e + (p > 0 && p < 1 ? Math.sin(p * Math.PI) * 0.07 : 0), f: 1 };
    if (m === "digitar") { var q = lim((t - 0.35 - i * 0.32) / 0.8, 0, 1); return { a: q > 0 ? 1 : 0, dy: 0, sc: 1, f: q }; }
    if (m === "brilho") return { a: e, dy: (1 - e) * 0.02, sc: 1, f: 1, br: 0.5 + 0.5 * Math.sin(t * 3 - i) };
    return { a: e, dy: (1 - e) * 0.02, sc: 1, f: 1 };   // suave
  }
  function camadaAnim(x, W, H, t, camada, cs) {
    var A = window.BWConviteAnim; if (!A || !E.anim || !E.anim.ligado && t != null) return;
    if (!E.anim.ligado) return;
    var tt = t == null ? 1.3 : t;
    (E.anim.over || []).forEach(function (id) { var ef = A.EFEITOS[id]; if (ef && ef.camada === camada) { x.save(); try { ef.f(x, W, H, tt, cs); } catch (e) { } x.restore(); } });
    if (camada === "frente") (E.anim.itens || []).forEach(function (it, i) {
      x.save(); A.desenharItem(x, it, W, H, tt); x.restore();
      if (i === ITEM_SEL && t != null && !GERANDO) { var m = Math.min(W, H), r0 = (it.s || 0.22) * m * 0.58; x.save(); x.strokeStyle = "#FFB547"; x.lineWidth = Math.max(2, m * 0.004); x.setLineDash([m * 0.015, m * 0.01]); x.strokeRect(it.x * W - r0, it.y * H - r0, r0 * 2, r0 * 2); x.restore(); }
    });
  }
  var ITEM_SEL = -1, GERANDO = false;
  function render(W, H, t) {
    var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high";
    var a = E.aj, m = Math.min(W, H), cs = cores(), dest = a.destaque || cs[2] || "#E8C26A", pos = posTexto(), cartaoH = E.tipo === "cartao" && W / H > 1.25;
    /* 1. fundo */
    if (FOTO && E.fotoModo === "fundo") capa(x, FOTO, 0, 0, W, H);
    else if (SEL >= 0 && OPS[SEL]) capa(x, OPS[SEL], 0, 0, W, H);
    else x.drawImage(fundoCache(Math.round(W / 2), Math.round(H / 2)), 0, 0, W, H);
    if (a.escurecer) { x.fillStyle = "rgba(0,0,0," + a.escurecer / 100 + ")"; x.fillRect(0, 0, W, H); }
    camadaAnim(x, W, H, t, "fundo", cs);
    /* 2. área do texto (e foto em moldura) */
    var mx = W * (cartaoH ? 0.07 : 0.08), area = { x: mx, w: W - 2 * mx, y: H * 0.06, h: H * 0.88 };
    if (cartaoH) area.w = W * 0.56;
    var foto = null;
    if (FOTO && E.fotoModo === "moldura") {
      var fs0 = cartaoH ? H * 0.62 : m * (W / H < 0.7 ? 0.62 : 0.46), fx = cartaoH ? W * 0.68 : (W - fs0) / 2, fy;
      if (cartaoH) fy = (H - fs0) / 2; else if (pos === "topo") fy = H - fs0 - H * 0.07; else fy = H * 0.06;
      foto = { x: fx, y: fy, s: fs0 };
      if (!cartaoH) { if (pos === "topo") { area.y = H * 0.05; area.h = fy - H * 0.08; } else { area.y = fy + fs0 + H * 0.025; area.h = H - area.y - H * 0.05; } }
    } else if (!cartaoH) { if (pos === "baixo") { area.y = H * 0.42; area.h = H * 0.53; } else if (pos === "topo") { area.y = H * 0.05; area.h = H * 0.55; } else { area.y = H * 0.18; area.h = H * 0.64; } }
    var qrTam = a.qr ? m * (cartaoH ? 0.34 : 0.17) : 0;
    if (a.qr && !cartaoH && pos !== "topo" && !foto) area.h -= 0;   // QR vai num canto fora do texto (ver abaixo)
    if (foto) desenharFoto(x, foto, a.moldura, dest);
    /* 3. mede o texto até caber */
    var bl = blocos(), base = cartaoH ? H * 0.95 : Math.min(W, H * 0.62), k = (a.tam || 100) / 100, med = medir(x, bl, area.w, base, k), voltas = 0;
    while (med.h > area.h && voltas < 14) { k *= 0.92; med = medir(x, bl, area.w, base, k); voltas++; }
    var y0 = cartaoH ? (H - med.h) / 2 : pos === "baixo" ? area.y + area.h - med.h : pos === "topo" ? area.y : area.y + (area.h - med.h) / 2;
    if (foto && !cartaoH) y0 = pos === "topo" ? area.y + Math.max(0, (area.h - med.h) / 2) : area.y + Math.max(0, (area.h - med.h) / 2);
    var esq = a.alinh === "esquerda" || cartaoH, larg = 0; med.itens.forEach(function (it) { x.font = fonte(it.p, it.fs); (it.linhas || []).forEach(function (l) { larg = Math.max(larg, x.measureText(l).width); }); });
    larg = Math.min(area.w, Math.max(larg, area.w * 0.5));
    var bx = esq ? area.x : (W - larg) / 2, pad = base * 0.045;
    /* 4. cor do texto e fundo do texto */
    var claro = a.cor === "claro" ? true : a.cor === "escuro" ? false : (a.caixa === "nenhum" ? lum(x, bx, y0, larg, med.h) < 0.6 : true);
    var corT = claro ? "#FFFFFF" : "#111318", corF = claro ? "7,8,12" : "255,255,255";
    if (a.caixa === "degrade") {
      var gy0 = y0 - H * 0.12, gy1 = y0 + med.h + H * 0.1, g;
      if (cartaoH) { g = x.createLinearGradient(0, 0, W * 0.75, 0); g.addColorStop(0, "rgba(" + corF + ",.82)"); g.addColorStop(1, "rgba(" + corF + ",0)"); x.fillStyle = g; x.fillRect(0, 0, W, H); }
      else if (pos === "baixo") { g = x.createLinearGradient(0, gy0, 0, H); g.addColorStop(0, "rgba(" + corF + ",0)"); g.addColorStop(0.35, "rgba(" + corF + ",.6)"); g.addColorStop(1, "rgba(" + corF + ",.88)"); x.fillStyle = g; x.fillRect(0, gy0, W, H - gy0); }
      else if (pos === "topo") { g = x.createLinearGradient(0, 0, 0, gy1); g.addColorStop(0, "rgba(" + corF + ",.88)"); g.addColorStop(0.65, "rgba(" + corF + ",.6)"); g.addColorStop(1, "rgba(" + corF + ",0)"); x.fillStyle = g; x.fillRect(0, 0, W, gy1); }
      else { g = x.createLinearGradient(0, gy0, 0, gy1); g.addColorStop(0, "rgba(" + corF + ",0)"); g.addColorStop(0.25, "rgba(" + corF + ",.62)"); g.addColorStop(0.75, "rgba(" + corF + ",.62)"); g.addColorStop(1, "rgba(" + corF + ",0)"); x.fillStyle = g; x.fillRect(0, gy0, W, gy1 - gy0); }
    } else if (a.caixa === "vidro" || a.caixa === "solido") {
      var px = bx - pad * 1.4, py = y0 - pad * 1.2, pw = larg + pad * 2.8, ph = med.h + pad * 2.4, raio = base * 0.035;
      x.save(); rr(x, px, py, pw, ph, raio); x.clip();
      if (a.caixa === "vidro") { var d0 = desfocado(c, W, H, 28); x.drawImage(d0, 0, 0, W, H); d0.width = d0.height = 1; x.fillStyle = "rgba(" + corF + ",.42)"; }
      else x.fillStyle = "rgba(" + corF + ",.92)";
      x.fillRect(px, py, pw, ph); x.restore();
      if (a.caixa === "vidro") { x.strokeStyle = claro ? "rgba(255,255,255,.28)" : "rgba(0,0,0,.12)"; x.lineWidth = Math.max(1, base * 0.0025); rr(x, px, py, pw, ph, raio); x.stroke(); }
    }
    /* 5. texto */
    var y = y0; x.textBaseline = "top"; x.textAlign = esq ? "left" : "center";
    var cx = esq ? bx : W / 2;
    med.itens.forEach(function (it, ix) {
      var P = PAPEL[it.p.r] || {}, cor = P.cor === "dest" ? dest : corT, an = txAnim(ix, t);
      if (an.a <= 0.001) { y += it.h + (it.gap || 0); return; }
      x.save(); x.globalAlpha *= an.a; if (an.dy) x.translate(0, an.dy * H);
      if (an.sc !== 1) { var pcx = esq ? bx : W / 2, pcy = y + it.h / 2; x.translate(pcx, pcy); x.scale(an.sc, an.sc); x.translate(-pcx, -pcy); }
      try { desenharBloco(it, P, cor, an); } finally { x.restore(); }
      y += it.h + (it.gap || 0);
    });
    function desenharBloco(it, P, cor, an) {
      if (it.p.r === "linha") { x.fillStyle = dest; var lw2 = Math.min(larg * 0.32, base * 0.22) * an.f; x.fillRect(esq ? bx : W / 2 - lw2 / 2, y + it.h * 0.42, lw2, Math.max(2, base * 0.004)); return; }
      x.font = fonte(it.p, it.fs); x.letterSpacing = P.esp ? Math.round(it.fs * P.esp) + "px" : "0px";
      if (it.p.r === "cta") {
        var tw = x.measureText(it.linhas.join(" ")).width, bw = tw + it.fs * 2.2, bh = it.fs * 2.05, bxx = esq ? bx : W / 2 - bw / 2;
        x.save(); x.shadowColor = "rgba(0,0,0,.3)"; x.shadowBlur = it.fs * 0.6; x.fillStyle = dest; rr(x, bxx, y + it.fs * 0.1, bw, bh, bh / 2); x.fill(); x.restore();
        x.fillStyle = corContraste(dest); x.textAlign = "center"; x.fillText(it.linhas.join(" "), bxx + bw / 2, y + it.fs * 0.1 + (bh - it.fs) / 2 - it.fs * 0.04); x.textAlign = esq ? "left" : "center";
        return;
      }
      if (it.p.r === "contato") { x.fillStyle = dest; x.beginPath(); x.arc(bx + it.fs * 0.32, y + it.fs * 0.58, it.fs * 0.2, 0, 7); x.fill(); }
      x.save();
      if (a.caixa === "nenhum" || a.caixa === "degrade") { x.shadowColor = claro ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.5)"; x.shadowBlur = it.fs * 0.18; x.shadowOffsetY = it.fs * 0.03; }
      if (an.br != null && P.cor === "dest") { x.shadowColor = dest; x.shadowBlur = it.fs * (0.2 + 0.5 * an.br); x.shadowOffsetY = 0; }
      x.fillStyle = cor;
      var resta = an.f < 1 ? Math.round(it.linhas.join("").length * an.f) : 1e9;
      it.linhas.forEach(function (l, j) { if (resta <= 0) return; var lt = l.length > resta ? l.slice(0, resta) : l; resta -= l.length;
        var LX = it.p.r === "contato" ? bx + it.fs * 0.85 : cx, LY = y + j * it.lh;
        if (a.letra && a.letra !== "normal" && /^(nome|script|destaque|preco|quote)$/.test(it.p.r)) letra3d(lt, LX, LY, it.fs, cor); else x.fillText(lt, LX, LY); });
      x.restore();
    }
    /* 22/11 — LETRAS 3D: desenhadas aqui com as fontes livres da página (relevo, ouro, cromo, neon, balão metálico) */
    function letra3d(t, X, Y, fs, cor) {
      var tipo = a.letra, prof = Math.max(3, Math.round(fs * 0.09)), g;
      x.save(); x.shadowColor = "transparent"; x.lineJoin = "round";
      function grad(cs) { var gg = x.createLinearGradient(0, Y, 0, Y + fs * 1.05); cs.forEach(function (c, i) { gg.addColorStop(i / (cs.length - 1), c); }); return gg; }
      if (tipo === "neon") {
        x.strokeStyle = dest; x.lineWidth = Math.max(2, fs * 0.05); x.shadowColor = dest; x.shadowBlur = fs * 0.5; x.strokeText(t, X, Y); x.shadowBlur = fs * 0.2; x.strokeText(t, X, Y);
        x.shadowBlur = 0; x.fillStyle = "#ffffff"; x.globalAlpha *= 0.95; x.fillText(t, X, Y); x.restore(); return;
      }
      if (tipo === "balao") {
        x.lineWidth = fs * 0.16; x.strokeStyle = grad(["#fff6cc", "#e8b84a", "#b8862a", "#f7d77a"]); x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = fs * 0.12; x.shadowOffsetY = fs * 0.05; x.strokeText(t, X, Y);
        x.shadowColor = "transparent"; x.fillStyle = grad(["#fff3c4", "#f2c75c", "#c99632", "#f5d580"]); x.fillText(t, X, Y);
        x.globalAlpha *= 0.55; x.lineWidth = fs * 0.03; x.strokeStyle = "#ffffff"; x.strokeText(t, X - fs * 0.02, Y - fs * 0.03); x.restore(); return;
      }
      var lado = tipo === "ouro" ? ["#5a3a10", "#3a2408"] : tipo === "cromo" ? ["#3c4048", "#1c1f24"] : null, frente;
      if (tipo === "ouro") frente = grad(["#fff3c4", "#f2c75c", "#a8761a", "#e8c26a", "#fff0b0"]);
      else if (tipo === "cromo") frente = grad(["#ffffff", "#c9ced8", "#5c6270", "#e9edf3", "#9aa1ae"]);
      else { frente = cor; var c0 = String(dest || "#333"); lado = [c0, "rgba(0,0,0,.85)"]; }
      for (var i = prof; i >= 1; i--) { x.fillStyle = i > prof / 2 ? lado[1] : lado[0]; x.fillText(t, X + i * 0.6, Y + i); }
      x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = fs * 0.15; x.shadowOffsetY = fs * 0.06; x.fillStyle = frente; x.fillText(t, X, Y);
      x.shadowColor = "transparent"; x.lineWidth = Math.max(1, fs * 0.012); x.strokeStyle = "rgba(255,255,255,.5)"; x.strokeText(t, X, Y); x.restore();
    }
    x.letterSpacing = "0px";
    camadaAnim(x, W, H, t, "frente", cs);
    /* 6. logo e QR */
    var LG = a.logo && LOGOS[a.logoId || (KIT.logos[0] && KIT.logos[0].id)];
    if (LG) {
      var lw = Math.min(W * (cartaoH ? 0.22 : 0.26), m * 0.32), lh = lw * LG.naturalHeight / LG.naturalWidth; if (lh > H * (cartaoH ? 0.2 : 0.09)) { lh = H * (cartaoH ? 0.2 : 0.09); lw = lh * LG.naturalWidth / LG.naturalHeight; }
      var lx = cartaoH ? W - lw - W * 0.06 : (W - lw) / 2, ly = cartaoH ? H * 0.09 : (pos === "topo" ? H - lh - H * 0.035 : H * 0.035);
      if (!cartaoH && foto && pos !== "topo") { lx = W * 0.05; ly = H * 0.03; }
      x.drawImage(LG, lx, ly, lw, lh);
    }
    if (a.qr && QRLIB) {
      var url = urlQr(a.qr);
      if (url) { var qx, qy; if (cartaoH) { qx = W - qrTam - W * 0.06; qy = H - qrTam - H * 0.1; } else { qx = W - qrTam - m * 0.05; qy = pos === "topo" ? H - qrTam - m * 0.07 : m * 0.05; if (LG && !cartaoH && pos !== "topo") qy = m * 0.05 + 0; }
        desenharQr(x, url, qx, qy, qrTam, { rsvp: "CONFIRME", mapa: "COMO CHEGAR", zap: "WHATSAPP", insta: "INSTAGRAM", site: "SITE" }[a.qr] || ""); }
    }
    return c;
  }
  function corContraste(hex) { var h = String(hex).replace("#", ""); if (h.length < 6) return "#111"; var l = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255; return l > 0.6 ? "#111318" : "#FFFFFF"; }
  function desenharFoto(x, f, mold, dest) {
    x.save(); x.shadowColor = "rgba(0,0,0,.45)"; x.shadowBlur = f.s * 0.06; x.shadowOffsetY = f.s * 0.02;
    if (mold === "polaroid") {
      var b = f.s * 0.05; x.fillStyle = "#fff"; x.translate(f.x + f.s / 2, f.y + f.s / 2); x.rotate(-0.04); x.fillRect(-f.s / 2 - b, -f.s / 2 - b, f.s + 2 * b, f.s + b * 4.2); x.shadowColor = "transparent";
      x.beginPath(); x.rect(-f.s / 2, -f.s / 2, f.s, f.s); x.clip(); capa(x, FOTO, -f.s / 2, -f.s / 2, f.s, f.s); x.restore(); return;
    }
    x.fillStyle = dest; if (mold === "circulo") { x.beginPath(); x.arc(f.x + f.s / 2, f.y + f.s / 2, f.s / 2 + f.s * 0.025, 0, 7); x.fill(); }
    else { rr(x, f.x - f.s * 0.02, f.y - f.s * 0.02, f.s * 1.04, f.s * 1.04, f.s * 0.1); x.fill(); }
    x.shadowColor = "transparent"; if (mold === "circulo") { x.beginPath(); x.arc(f.x + f.s / 2, f.y + f.s / 2, f.s / 2, 0, 7); } else rr(x, f.x, f.y, f.s, f.s, f.s * 0.085);
    x.clip(); capa(x, FOTO, f.x, f.y, f.s, f.s); x.restore();
  }
  function digitos(t) { var d = String(t || "").replace(/\D/g, ""); if (!d) return ""; return d.length <= 11 ? "55" + d : d; }
  function urlQr(tipo) {
    var d = dados();
    if (tipo === "rsvp") { var z = digitos(d.rsvp); return z ? "https://wa.me/" + z + "?text=" + encodeURIComponent("Olá! Confirmo presença: " + [d.titulo, d.nome].filter(Boolean).join(" ") + (d.data ? " (" + fmtData(d.data) + ")" : "")) : ""; }
    if (tipo === "mapa") { var e = d.endereco || d.local; return e ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(e) : ""; }
    if (tipo === "zap") { var z2 = digitos(d.telefone || d.contato || d.rsvp); return z2 ? "https://wa.me/" + z2 : ""; }
    if (tipo === "insta") { var ig = String(d.instagram || d.arroba || "").replace(/^@/, "").trim(); return ig ? "https://instagram.com/" + ig : ""; }
    if (tipo === "site") { var s = String(d.site || "").trim(); return s ? (/^https?:\/\//.test(s) ? s : "https://" + s) : ""; }
    return "";
  }
  var QRLIB = null;
  function carregarQr() { if (QRLIB || !E.aj.qr) return Promise.resolve(); return carregarScript(LIB_QR).then(function () { QRLIB = window.qrcode || null; }).catch(function () { toast("Não deu para carregar o QR code (sem internet?)."); }); }
  function desenharQr(x, url, X, Y, S, rot) {
    var q = QRLIB(0, "M"); q.addData(url); q.make(); var n = q.getModuleCount(), lab = rot ? S * 0.16 : 0, pad = S * 0.07, cel = (S - 2 * pad) / n;
    x.save(); x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = S * 0.08; x.fillStyle = "#fff"; rr(x, X, Y, S, S + lab, S * 0.08); x.fill(); x.restore();
    x.fillStyle = "#111318";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(X + pad + c * cel, Y + pad + r * cel, Math.ceil(cel), Math.ceil(cel));
    if (rot) { x.font = "800 " + Math.round(lab * 0.55) + "px Inter, system-ui, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(rot, X + S / 2, Y + S + lab * 0.35); }
  }
  function carregarScript(src) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = erro; document.head.appendChild(s); }); }

  /* ================= PRÉVIA ================= */
  function tamanho() { var f = FORMATOS.filter(function (x) { return x[0] === E.formato; })[0] || FORMATOS[0]; return { W: f[2], H: f[3] }; }
  var pedido = 0, LACO = 0, T0 = performance.now();
  function agendar() {
    gravar();
    if (E.anim && E.anim.ligado) { if (!LACO) LACO = requestAnimationFrame(laco); return; }
    if (pedido) return; pedido = requestAnimationFrame(function () { pedido = 0; previa(); });
  }
  function laco() { LACO = 0; if (!E.anim || !E.anim.ligado) { previa(); return; } if (!document.hidden && !GERANDO) previa(); LACO = requestAnimationFrame(laco); }
  function tempoAnim() { var d = +E.anim.dur || 8, t = (performance.now() - T0) / 1000; return t < 0 ? 0 : t % d; }
  var fontesOk = false;
  function previa() {
    var an = E.anim && E.anim.ligado, t = tamanho(), k = (an ? 720 : 1100) / Math.max(t.W, t.H), W = Math.round(t.W * k), H = Math.round(t.H * k), c = render(W, H, an ? tempoAnim() : undefined), cv = $("cv");
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    cv.getContext("2d").drawImage(c, 0, 0); c.width = c.height = 1;
    if (!fontesOk && document.fonts) { fontesOk = true; carregarFontes().then(agendar); }
  }
  function carregarFontes() {
    var fams = []; Object.keys(PARES).forEach(function (k) { ["s", "d", "b"].forEach(function (q) { fams.push(PARES[k][q][1] + " 40px '" + PARES[k][q][0] + "'"); }); });
    return Promise.all(fams.map(function (f) { return document.fonts.load(f).catch(function () { }); }));
  }
  function desenharOps() {
    var ha = OPS.some(Boolean) || OP_MODO;
    $("ops").innerHTML = ha ? OPS.map(function (o, i) { return '<button type="button" class="cr-op' + (i === SEL ? " on" : "") + (o === "..." ? " carregando" : "") + '" data-op="' + i + '" aria-label="Opção ' + (i + 1) + '">' + (o && o !== "..." && o.__mini ? '<img alt="" src="' + o.__mini + '">' : "") + "</button>"; }).join("") : "";
  }
  function miniDe(img) { var c = document.createElement("canvas"), s = 160 / Math.max(img.width || img.naturalWidth, img.height || img.naturalHeight); c.width = Math.round((img.width || img.naturalWidth) * s); c.height = Math.round((img.height || img.naturalHeight) * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", 0.7); }

  /* ================= ARTE: FUNDOS PRONTOS E IA ================= */
  function prontos() {
    var t = tamanho(), k = 1400 / Math.max(t.W, t.H), W = Math.round(t.W * k), H = Math.round(t.H * k);
    OPS = [0, 1, 2].map(function (v) { var c = fundoPronto(W, H, v); c.__mini = miniDe(c); return c; }); SEL = 0; OP_MODO = "prontos";
    desenharOps(); agendar(); msg("3 fundos prontos do estilo " + estiloAtual()[1] + ". Toque em outro estilo ou cor e gere de novo.");
  }
  function promptArte(i) {
    var m = (MODELO[E.tipo] && MODELO[E.tipo][E.sub]) || {}, est = estiloAtual(), pal = PALETAS.filter(function (p) { return p[0] === E.paleta; })[0];
    var cor = E.paleta === "marca" && KIT.cores && KIT.cores.length ? "brand colors " + KIT.cores.join(", ") : pal && pal[3] ? pal[3] : "";
    var comPessoa = FOTO && E.fotoModo === "ia";
    var varia = ["Composition: balanced and centered.", "Composition: dynamic, asymmetric, with depth.", "Composition: close and atmospheric, with soft depth of field."][i % 3];
    return "Theme: " + (m.en || "celebration") + ". Style: " + est[2] + "." + (cor ? " Color palette: " + cor + "." : "") + (E.desc ? " Extra details from the client (Portuguese): " + E.desc + "." : "") +
      (comPessoa ? " The person is the main subject, happy and well lit, placed away from the text area." : " No people unless the theme needs them.") + " " + varia;
  }
  var criando = false, confirmou = false;
  async function criarIA() {
    if (criando) return;
    if (!window.BWFotosNuvem) { toast("Recarregue a página para usar a IA."); return; }
    var s = await sessaoOk(); if (!s) { toast("Entre na sua conta para criar com IA — ou use FUNDOS PRONTOS (grátis, sem login)."); return; }
    var comPessoa = FOTO && E.fotoModo === "ia";
    if (comPessoa && !confirmou && !confirm("Para colocar a pessoa na arte, uma cópia pequena da foto vai para a IA Brightway na nuvem (nada fica guardado lá).\n\nUse só fotos que você tem permissão de usar. Continuar?")) return;
    if (comPessoa) confirmou = true;
    criando = true; $("btnCriarIA").disabled = true;
    var t = tamanho(), r0 = t.W / t.H, aw, ah; if (r0 >= 1) { aw = 1440; ah = 1440 / r0; } else { ah = 1440; aw = 1440 * r0; }
    aw = lim(Math.round(aw / 16) * 16, 256, 1440); ah = lim(Math.round(ah / 16) * 16, 256, 1440);
    var blob = null; if (comPessoa) blob = await jpegPequeno(FOTO);
    var esp = E.tipo === "cartao" && r0 > 1.25 ? "esquerda" : posTexto();
    OPS = ["...", "...", "..."]; SEL = -1; OP_MODO = "ia"; desenharOps(); msg("✨ A IA está criando 3 opções (10 a 30 s)…");
    var erros = [], feitas = 0;
    await Promise.all([0, 1, 2].map(function (i) {
      return BWFotosNuvem.arte(blob, promptArte(i), aw, ah, esp, 1000 + Math.floor(Math.random() * 1e6)).then(function (r) {
        if (r.erro) { erros.push(r.erro); OPS[i] = null; desenharOps(); return; }
        return imgDeBlob(r.blob).then(function (im) { im.__mini = miniDe(im); OPS[i] = im; feitas++; if (SEL < 0) SEL = i; desenharOps(); agendar(); });
      }).catch(function () { erros.push("rede"); OPS[i] = null; desenharOps(); });
    }));
    criando = false; $("btnCriarIA").disabled = false;
    OPS = OPS.map(function (o) { return o === "..." ? null : o; });
    if (!feitas) { OP_MODO = ""; desenharOps(); msg(""); toast(BWFotosNuvem.msg(erros[0] || "rede") + " Use FUNDOS PRONTOS enquanto isso."); return; }
    msg("✓ " + feitas + " opção(ões) criada(s). Toque para escolher; ajuste os textos ao lado." + (erros.length ? " (" + erros.length + " não veio: " + BWFotosNuvem.msg(erros[0]) + ")" : ""));
  }
  function imgDeBlob(b) { var u = URL.createObjectURL(b); return imgDe(u); }
  function jpegPequeno(img) { var iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, k = Math.min(1, 504 / Math.max(iw, ih)), c = document.createElement("canvas"); c.width = Math.round(iw * k); c.height = Math.round(ih * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return new Promise(function (ok) { c.toBlob(function (b) { c.width = c.height = 1; ok(b); }, "image/jpeg", 0.9); }); }
  async function sessaoOk() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }

  /* ================= TEXTOS E LEGENDA COM IA (IA Brightway — recebe só o que você digitou, nunca a foto) ================= */
  async function ia(sistema, pedido0, max) {
    var s = await sessaoOk(); if (!s) return { erro: "sem_login" };
    try {
      var r = await fetch(FN_TXT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: sistema, pedido: pedido0, max: max || 500 }) });
      var j = await r.json().catch(function () { return {}; }); if (!r.ok) return { erro: j.erro || "http_" + r.status }; return j;
    } catch (e) { return { erro: "rede" }; }
  }
  function jsonDe(t) { t = String(t || "").replace(/```(json)?/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function erroIA(e) { return { sem_login: "Entre na sua conta para usar a IA de textos.", limite: "Limite diário da IA de textos atingido. Amanhã libera de novo.", ocupada: "A IA está ocupada. Tente em alguns segundos.", rede: "Sem internet agora." }[e] || "A IA não respondeu agora (" + e + ")."; }
  function resumoDados() {
    var d = dados(), sub = (TIPOS[E.tipo].subs.filter(function (s) { return s[0] === E.sub; })[0] || [])[1];
    return "Tipo: " + TIPOS[E.tipo].nome + " — " + sub + ". Estilo: " + estiloAtual()[1] + ".\n" + campos(E.tipo, E.sub).map(function (c) { var v = c[2] === "date" ? fmtData(d[c[0]]) : c[2] === "time" ? fmtHora(d[c[0]]) : d[c[0]]; return v ? c[1] + ": " + v : ""; }).filter(Boolean).join("\n");
  }
  async function textosIA() {
    var dd = dados(), alvo = E.tipo === "convite" ? ["pre", "titulo", "mensagem"] : E.tipo === "cartao" ? ["cargo"] : E.sub === "depoimento" ? ["pre"] : ["pre", "titulo", "subtitulo", "cta"];
    if (E.tipo !== "convite") alvo = alvo.filter(function (k) { return !(k === "titulo" && String(dd.titulo || "").trim()); });   /* título do evento digitado é dado seu: a IA não troca */
    msg("✨ Escrevendo os textos…");
    var r = await ia("Você escreve textos CURTOS e calorosos para convites e posts, em português do Brasil, com tom descontraído e elegante. Nunca invente datas, valores, nomes ou endereços. Responda SOMENTE um JSON.",
      resumoDados() + "\n\nEscreva os campos " + alvo.join(", ") + " (pre: até 6 palavras; titulo: até 5 palavras; mensagem/subtitulo: até 20 palavras; cta: até 4 palavras; cargo: até 5 palavras). Formato: {" + alvo.map(function (k) { return '"' + k + '":"..."'; }).join(",") + "}. Varie em relação ao texto atual.", 400);
    if (r.erro) { msg(""); toast(erroIA(r.erro)); return; }
    var j = jsonDe(r.texto); if (!j) { msg(""); toast("A IA respondeu fora do formato. Tente de novo."); return; }
    var d = dados(), n = 0; alvo.forEach(function (k) { if (j[k] && typeof j[k] === "string") { d[k] = j[k].slice(0, 200); n++; } });
    desenharCampos(); agendar(); msg(n ? "✓ Textos novos. Toque de novo para outra versão." : "");
  }
  async function legenda() {
    var conv = E.tipo === "convite";
    msg("✨ Escrevendo…");
    var r = await ia("Você escreve em português do Brasil, tom descontraído e próximo, para redes sociais e WhatsApp. Nunca invente datas, valores, nomes ou endereços.",
      resumoDados() + (conv ? "\n\nEscreva a MENSAGEM de WhatsApp para enviar junto com o convite (até 60 palavras, com os dados certos e um pedido para confirmar presença). Só o texto." :
        "\n\nEscreva a LEGENDA do post para Instagram (até 90 palavras, gancho na 1ª linha, chamada para ação no fim) e depois 8 hashtags em português. Só o texto."), 500);
    msg("");
    if (r.erro) { toast(erroIA(r.erro)); return; }
    $("legenda").textContent = String(r.texto || "").replace(/\*\*|__/g, "").replace(/^#+\s*/gm, "").trim(); $("legendaBox").hidden = false;
  }

  /* ================= SAÍDA ================= */
  function nomeArq(ext, fmt) { var d = dados(), base = [E.tipo, E.sub, d.nome || d.titulo || ""].join("-").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return (base || "criacao") + (fmt ? "-" + fmt : "") + "." + ext; }
  async function pronto() { if (E.aj.qr) await carregarQr(); if (document.fonts) await carregarFontes(); }
  async function gerarBlob(fmt, tipo) {
    await pronto(); var f0 = E.formato; if (fmt) E.formato = fmt; var t = tamanho(), c = render(t.W, t.H); E.formato = f0;
    return new Promise(function (ok) { c.toBlob(function (b) { c.width = c.height = 1; ok(b); }, tipo || "image/png", 0.93); });
  }
  function baixar(b, nome) { var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000); }
  async function png(semBaixar) { msg("Gerando a imagem…"); var b = await gerarBlob(); msg("✓ Pronto (" + Math.round(b.size / 1024) + " KB)."); if (!semBaixar) baixar(b, nomeArq("png")); return b; }
  async function pdf(semBaixar) {
    msg("Gerando o PDF…");
    try {
      if (!window.PDFLib) await carregarScript(LIB_PDF);
      var b = await gerarBlob(null, "image/jpeg"), bytes = new Uint8Array(await b.arrayBuffer()), doc = await PDFLib.PDFDocument.create(), img = await doc.embedJpg(bytes), t = tamanho();
      var pg = PAPEL_PT[E.formato] || [t.W * 0.75, t.H * 0.75], p = doc.addPage(pg); p.drawImage(img, { x: 0, y: 0, width: pg[0], height: pg[1] });
      doc.setTitle(nomeArq("pdf").replace(/\.pdf$/, "")); doc.setCreator("Brightway — Criador IA");
      var out = await doc.save(); msg("✓ PDF pronto (" + Math.round(out.length / 1024) + " KB)" + (PAPEL_PT[E.formato] ? " no tamanho de impressão." : "."));
      if (!semBaixar) baixar(new Blob([out], { type: "application/pdf" }), nomeArq("pdf"));
      return out;
    } catch (e) { msg(""); toast("Não deu para gerar o PDF agora (sem internet?)."); return null; }
  }
  async function compartilhar(fmts) {
    var arqs = [];
    for (var i = 0; i < fmts.length; i++) { var b = await gerarBlob(fmts[i]); arqs.push(new File([b], nomeArq("png", fmts.length > 1 ? fmts[i] : ""), { type: "image/png" })); }
    if (navigator.canShare && navigator.canShare({ files: arqs })) { try { await navigator.share({ files: arqs, title: "Brightway" }); msg("✓ Enviado."); return arqs; } catch (e) { if (e && e.name === "AbortError") return arqs; } }
    arqs.forEach(function (f, j) { setTimeout(function () { baixar(f, f.name); }, j * 400); }); msg("✓ " + arqs.length + " arquivo(s) baixado(s)."); return arqs;
  }
  async function abrirNoEditor() {   /* entrega a imagem ao editor de fotos pelo IndexedDB do aparelho (nada vai para a nuvem) */
    var b = await gerarBlob(null, "image/jpeg");
    await new Promise(function (ok) {
      var r = indexedDB.open("bw_ponte", 1); r.onupgradeneeded = function () { r.result.createObjectStore("arq"); };
      r.onsuccess = function () { var t = r.result.transaction("arq", "readwrite"); t.objectStore("arq").put({ blob: b, nome: nomeArq("jpg") }, "criador"); t.oncomplete = ok; t.onerror = ok; }; r.onerror = ok;
    });
    location.href = "fotos.html#criador";
  }

  /* ================= EVENTOS ================= */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-k]"); if (b && b.tagName === "BUTTON") {
      var k = b.dataset.k, v = b.dataset.v;
      if (k === "tipo") { E.tipo = v; E.sub = TIPOS[v].subs[0][0]; E.formato = TIPOS[v].fmt; E.aj.pos = ""; if (E.aj.qr && !qrOpcoes().some(function (o) { return o[0] === E.aj.qr; })) E.aj.qr = ""; OPS = [null, null, null]; SEL = -1; OP_MODO = ""; tudo(); return; }
      if (k === "sub") { E.sub = v; MOD_ON = ""; desenharTopo(); desenharCampos(); desenharAjustes(); desenharBib(); agendar(); return; }
      if (k === "estilo") { E.estilo = v; E.aj.par = ""; desenharEstilo(); desenharAjustes(); if (OP_MODO === "prontos") prontos(); else agendar(); return; }
      if (k === "paleta") { E.paleta = v; E.aj.destaque = ""; desenharEstilo(); desenharAjustes(); if (OP_MODO === "prontos") prontos(); else agendar(); return; }
      if (k === "formato") { E.formato = v; desenharEstilo(); if (OP_MODO === "prontos") prontos(); else agendar(); if (OP_MODO === "ia") msg("Dica: para o melhor resultado, crie as opções com IA de novo neste formato."); return; }
      if (k === "fotoModo") { E.fotoModo = v; desenharEstilo(); desenharAjustes(); agendar(); return; }
      if (k === "logoId") { E.aj.logo = !!v; E.aj.logoId = v; desenharAjustes(); agendar(); return; }
      if (k === "qr") { E.aj.qr = v; desenharAjustes(); carregarQr().then(agendar); if (v && !urlQr(v)) toast("Preencha o campo do " + ({ rsvp: "WhatsApp para confirmar", mapa: "endereço ou local", zap: "WhatsApp", insta: "Instagram / @", site: "site" }[v]) + " para o QR aparecer."); return; }
      if (k in E.aj) { E.aj[k] = v; desenharAjustes(); agendar(); return; }
    }
    var op = ev.target.closest("[data-op]"); if (op) { var i = +op.dataset.op; if (OPS[i] && OPS[i] !== "...") { SEL = i; desenharOps(); agendar(); } }
  });
  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.dataset && el.dataset.c) { dados()[el.dataset.c] = el.value; agendar(); return; }
    if (el.id === "desc") { E.desc = el.value; gravar(); return; }
    if (el.type === "range" && el.dataset.k && el.dataset.k in E.aj) { E.aj[el.dataset.k] = +el.value; var o = el.nextElementSibling; if (o) o.textContent = el.value + "%"; agendar(); }
  });
  $("btnFoto").onclick = function () { $("arqFoto").click(); };
  $("btnSemFoto").onclick = function () { FOTO = null; $("fotoMini").hidden = true; $("btnSemFoto").hidden = true; desenharEstilo(); desenharAjustes(); agendar(); };
  $("arqFoto").onchange = async function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    try { var copia = new Blob([await f.arrayBuffer()], { type: f.type || "image/jpeg" }); FOTO = await imgDeBlob(copia); }   /* cópia na memória (PENTE FINO 47) */
    catch (e) { toast("Não deu para abrir essa foto (no iPhone, prefira JPG)."); return; }
    $("fotoMini").src = miniDe(FOTO); $("fotoMini").hidden = false; $("btnSemFoto").hidden = false;
    if (!E.fotoModo) E.fotoModo = "ia"; desenharEstilo(); desenharAjustes(); agendar();
    toast(E.fotoModo === "ia" ? "Foto pronta. Com ✨ CRIAR, a IA coloca a pessoa na arte (ou escolha FOTO EM MOLDURA)." : "Foto pronta.");
  };
  $("btnCriarIA").onclick = criarIA;
  $("btnProntos").onclick = prontos;
  $("btnTextosIA").onclick = textosIA;
  $("btnLegenda").onclick = legenda;
  $("btnPng").onclick = function () { png(false); };
  /* 20/11 — AMBIENTE ÚNICO: a arte vai para a LINHA DO TEMPO do editor de vídeo */
  if (window.BWCriacoes) BWCriacoes.aoLado("btnPng", { ferramenta: "criador", tipo: "imagem", arquivo: function () { return png(true); }, nome: function () { return (E.campos && (E.campos.titulo || E.campos.nome)) || "Arte"; } });
  $("btnPdf").onclick = function () { pdf(false); };
  $("btnShare").onclick = function () { compartilhar([E.formato]); };
  $("btnPacote").onclick = function () { compartilhar(["story", "post", "quadrado"]); };
  $("btnEditor").onclick = abrirNoEditor;
  $("btnCopiar").onclick = function () { var t = $("legenda").textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("✓ Copiado"); }).catch(function () { var r = document.createRange(); r.selectNodeContents($("legenda")); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Texto selecionado — copie com Ctrl+C."); }); };
  $("btnZap").onclick = function () { window.open("https://wa.me/?text=" + encodeURIComponent($("legenda").textContent), "_blank", "noopener"); };

  /* selo LOGADO no topo */
  (async function () { var el = $("userBox"); if (!el) return; var s = await sessaoOk(); var u = s && s.user;
    el.innerHTML = u ? '<a href="login.html" class="bw-logado" title="Conta: ' + esc(u.email) + '"><i></i>LOGADO</a>' : '<a href="login.html" class="bw-btn bw-btn--vidro" style="min-height:34px;padding:0 14px;font-size:12px">LOGIN</a>'; })();


  /* ================= 22/11 — BIBLIOTECA DE CONVITES + CONVITE ANIMADO =================
     Modelos ORIGINAIS (inspirados nas ocasiões mais pedidas, nada copiado de site de terceiros): cada um é só uma
     combinação de modelo + estilo + cores + fontes + animação. Miniaturas desenhadas aqui mesmo, com dados de exemplo. */
  var BIB_CATS = [["", "Todos"], ["anim", "✨ Animados"], ["gamer", "🎮 Gamer"], ["esporte", "⚽ Esporte"], ["musica", "🎵 Música"], ["adulto", "🍻 Festas adultas"], ["real", "📸 Realistas"], ["heroi", "🦸 Super-herói"], ["anime", "🌸 Anime"], ["aniv", "Aniversário"], ["inf", "Infantil"], ["quinze", "15 anos"], ["amor", "Casamento e amor"], ["bebe", "Bebê e família"], ["empresa", "Formatura e empresa"], ["datas", "Datas e festas"]];
  function M(id, nome, cat, sub, estilo, paleta, par, an, aj) { return { id: id, nome: nome, cat: cat, sub: sub, estilo: estilo, paleta: paleta || "", par: par || "", anim: an || null, aj: aj || {} }; }
  var MODELOS_CONVITE = [
    M("an-neon", "Neon party", "aniv", "aniversario", "neon", "", "neon", { o: ["luzes"], tx: "zoom" }, { letra: "neon" }),
    M("an-ouro", "Preto e dourado", "aniv", "aniversario", "luxo", "", "elegante", { o: ["glitter"], tx: "brilho" }, { letra: "ouro" }),
    M("an-baloes", "Balões e confete", "aniv", "aniversario", "festa", "", "festa", { i: ["balao", "bolo"], o: ["confete"], tx: "subir" }),
    M("an-boteco", "Boteco", "aniv", "aniversario", "rustico", "", "manuscrito", { i: ["tacas"], o: ["cordao"], tx: "suave" }),
    M("an-brinde", "Brinde chique", "aniv", "aniversario", "elegante", "", "", { i: ["tacas"], o: ["glitter"], tx: "brilho" }),
    M("an-tropical", "Tropical", "aniv", "aniversario", "tropical", "", "festa"),
    M("an-minimal", "Minimalista", "aniv", "aniversario", "minimal", "", "moderno"),
    M("an-aquarela", "Aquarela", "aniv", "aniversario", "aquarela", "", "classico", { i: ["borboleta"], tx: "suave" }),
    M("in-ursinho", "Ursinho", "inf", "infantil", "bebe", "", "divertido", { i: ["ursinho", "balao"], o: ["estrelas"], tx: "subir" }),
    M("in-safari", "Safári", "inf", "infantil", "safari", "", "divertido", { i: ["leao"], o: ["folhas"], tx: "zoom" }),
    M("in-dino", "Dinossauros", "inf", "infantil", "safari", "verde", "divertido", { i: ["dino"], o: ["folhas"], tx: "subir" }),
    M("in-mar", "Fundo do mar", "inf", "infantil", "mar", "", "divertido", { i: ["peixe"], o: ["bolhas"], tx: "subir" }),
    M("in-espaco", "Astronauta", "inf", "infantil", "espacial", "", "divertido", { i: ["foguete"], o: ["estrelas"], tx: "zoom" }),
    M("in-unicornio", "Unicórnio", "inf", "infantil", "infantil", "rosa", "divertido", { i: ["unicornio"], o: ["glitter", "estrelas"], tx: "brilho" }),
    M("in-circo", "Circo", "inf", "infantil", "circo", "", "divertido", { i: ["balao"], o: ["confete"], tx: "zoom" }, { letra: "relevo" }),
    M("in-jardim", "Jardim encantado", "inf", "infantil", "floral", "", "divertido", { i: ["joaninha", "abelha"], o: ["borboletas"], tx: "subir" }),
    M("in-coelho", "Coelhinho", "inf", "infantil", "bebe", "pastel", "divertido", { i: ["coelho"], o: ["coracoes"], tx: "subir" }),
    M("in-fazenda", "Bichinhos", "inf", "infantil", "infantil", "", "divertido", { i: ["patinho", "gato", "cachorro"], tx: "subir" }),
    M("q-luxo", "15 anos luxo", "quinze", "quinze", "luxo", "", "elegante", { i: ["coroa"], o: ["glitter"], tx: "brilho" }, { letra: "ouro" }),
    M("q-rose", "Rosé e mármore", "quinze", "quinze", "marmore", "rosa", "classico", { o: ["petalas"], tx: "suave" }),
    M("q-neon", "Baile neon", "quinze", "quinze", "neon", "", "neon", { o: ["luzes", "estrelas"], tx: "zoom" }),
    M("ca-classico", "Clássico dourado", "amor", "casamento", "luxo", "", "elegante", { i: ["aliancas"], o: ["glitter"], tx: "brilho" }, { letra: "ouro" }),
    M("ca-floral", "Floral", "amor", "casamento", "floral", "", "classico", { o: ["petalas"], tx: "suave" }),
    M("ca-marmore", "Mármore", "amor", "casamento", "marmore", "", "classico", { tx: "suave" }),
    M("ca-rustico", "Rústico", "amor", "casamento", "rustico", "", "manuscrito", { o: ["cordao"], tx: "suave" }),
    M("ca-praia", "Pé na areia", "amor", "casamento", "praia", "", "manuscrito"),
    M("ca-save", "Save the date", "amor", "savethedate", "minimal", "", "classico", { i: ["coracao"], tx: "digitar" }),
    M("ca-noivado", "Noivado", "amor", "noivado", "elegante", "", "classico", { i: ["aliancas"], o: ["coracoes"], tx: "suave" }),
    M("ca-bodas", "Bodas", "amor", "bodas", "vintage", "", "classico", { i: ["coracao"], tx: "digitar" }),
    M("be-nuvens", "Nuvens", "bebe", "cha", "bebe", "", "divertido", { i: ["lua"], o: ["estrelas"], tx: "suave" }),
    M("be-urso", "Ursinho dormindo", "bebe", "cha", "aquarela", "pastel", "divertido", { i: ["ursinho"], o: ["bolhas"], tx: "suave" }),
    M("be-revela", "Menino ou menina?", "bebe", "revelacao", "festa", "pastel", "festa", { i: ["balao"], o: ["confete"], tx: "zoom" }),
    M("be-fraldas", "Chá de fraldas", "bebe", "chafraldas", "aquarela", "", "divertido", { i: ["patinho"], tx: "subir" }),
    M("be-cozinha", "Chá de cozinha", "bebe", "chacozinha", "vintage", "", "manuscrito", { tx: "digitar" }),
    M("be-batizado", "Batizado", "bebe", "batizado", "aquarela", "azul", "classico", { i: ["pomba"], tx: "suave" }),
    M("be-comunhao", "1ª comunhão", "bebe", "comunhao", "minimal", "", "classico", { i: ["pomba"], o: ["estrelas"], tx: "suave" }),
    M("em-formatura", "Formatura", "empresa", "formatura", "luxo", "", "elegante", { i: ["capelo"], o: ["confete"], tx: "zoom" }),
    M("em-confra", "Confraternização", "empresa", "confra", "corporativo", "", "moderno", { o: ["luzes"], tx: "subir" }),
    M("em-inaug", "Inauguração", "empresa", "inauguracao", "corporativo", "", "moderno", { i: ["presente"], o: ["confete"], tx: "zoom" }),
    M("em-lanc", "Lançamento", "empresa", "lancamento", "palco", "", "impacto", { o: ["luzes"], tx: "subir" }),
    M("em-happy", "Happy hour", "empresa", "happyhour", "neon", "", "neon", { i: ["tacas"], tx: "zoom" }),
    M("em-churras", "Churrasco", "empresa", "churrasco", "rustico", "", "manuscrito", { o: ["cordao"], tx: "subir" }),
    M("da-junina", "Arraiá", "datas", "junina", "junina", "", "festa", { o: ["bandeirinhas"], tx: "subir" }),
    M("da-halloween", "Halloween", "datas", "halloween", "halloween", "", "impacto", { i: ["abobora"], tx: "zoom" }),
    M("da-natal", "Natal", "datas", "natal", "natal", "", "classico", { i: ["arvore"], o: ["neve"], tx: "suave" }),
    M("da-reveillon", "Réveillon", "datas", "reveillon", "espacial", "ouro", "elegante", { o: ["fogos", "glitter"], tx: "brilho" }),
    M("da-despedida", "Despedida", "datas", "despedida", "neon", "", "neon", { i: ["tacas"], o: ["luzes"], tx: "zoom" }),
    M("da-lousa", "Lousa", "datas", "aniversario", "lousa", "", "manuscrito", { i: ["estrela"], tx: "digitar" }),
    M("ga-setup", "Setup gamer", "gamer", "aniversario", "gamer", "", "gamer", { i: ["controle"], o: ["pixels"], tx: "zoom" }, { letra: "neon" }),
    M("ga-camp", "Campeonato", "gamer", "campeonato", "gamer", "", "gamer", { i: ["trofeu", "controle"], o: ["laser"], tx: "subir" }),
    M("ga-lan", "Noite de jogos", "gamer", "festa", "gamer", "", "gamer", { i: ["fone"], o: ["pixels"], tx: "digitar" }),
    M("ga-retro", "Fliperama 80", "gamer", "aniversario", "retro80", "", "gamer", { i: ["controle"], o: ["estrelas"], tx: "zoom" }),
    M("es-gramado", "Gramado", "esporte", "aniversario", "futebol", "", "esporte", { i: ["bolafut"], o: ["confete"], tx: "zoom" }, { letra: "relevo" }),
    M("es-telao", "Jogo no telão", "esporte", "jogo", "futebol", "", "esporte", { i: ["bolafut", "chopp"], o: ["flashes"], tx: "subir" }),
    M("es-campeao", "Campeão", "esporte", "campeonato", "futebol", "ouro", "esporte", { i: ["trofeu"], o: ["confete", "flashes"], tx: "zoom" }, { letra: "ouro" }),
    M("es-quadra", "Quadra", "esporte", "campeonato", "basquete", "", "esporte", { i: ["bolabasq"], o: ["holofotes"], tx: "zoom" }),
    M("es-treino", "Fitness", "esporte", "aniversario", "fitness", "", "esporte", { i: ["haltere"], tx: "subir" }),
    M("es-corrida", "Velocidade", "esporte", "aniversario", "corrida", "", "esporte", { i: ["carro"], o: ["confete"], tx: "zoom" }),
    M("mu-rock", "Rock", "musica", "show", "rock", "", "rock", { i: ["violao"], o: ["holofotes", "fumaca"], tx: "zoom" }, { letra: "relevo" }),
    M("mu-sertanejo", "Sertanejo", "musica", "aniversario", "sertanejo", "", "country", { i: ["chapeu", "violao"], o: ["cordao"], tx: "subir" }),
    M("mu-pagode", "Samba e pagode", "musica", "aniversario", "samba", "", "festa", { i: ["pandeiro"], o: ["notas"], tx: "subir" }),
    M("mu-eletronica", "Eletrônica", "musica", "festa", "eletronica", "", "neon", { i: ["fone"], o: ["laser", "equalizador"], tx: "zoom" }),
    M("mu-karaoke", "Karaokê", "musica", "aniversario", "palco", "", "neon", { i: ["microfone"], o: ["notas", "holofotes"], tx: "brilho" }),
    M("mu-vinil", "Vinil", "musica", "aniversario", "vintage", "", "classico", { i: ["vinil"], o: ["notas"], tx: "digitar" }),
    M("mu-show", "Show ao vivo", "musica", "show", "palco", "", "impacto", { i: ["microfone"], o: ["holofotes", "fumaca", "flashes"], tx: "zoom" }),
    M("ad-cerveja", "Cervejada", "adulto", "festa", "rustico", "", "manuscrito", { i: ["chopp"], o: ["cordao"], tx: "subir" }),
    M("ad-vinho", "Noite do vinho", "adulto", "aniversario", "vinho", "", "elegante", { i: ["vinho"], o: ["glitter"], tx: "brilho" }),
    M("ad-blacktie", "Black tie", "adulto", "festa", "luxo", "pb", "elegante", { i: ["tacas"], o: ["glitter"], tx: "brilho" }, { letra: "cromo" }),
    M("ad-luau", "Luau", "adulto", "festa", "luau", "", "manuscrito", { o: ["estrelas"], tx: "suave" }),
    M("ad-cinema", "Sessão de cinema", "adulto", "festa", "cinema", "", "impacto", { i: ["pipoca", "claquete"], o: ["holofotes"], tx: "zoom" }),
    M("ad-anos80", "Festa anos 80", "adulto", "festa", "retro80", "", "neon", { i: ["vinil"], o: ["laser"], tx: "zoom" }),
    M("ad-balada", "Balada", "adulto", "aniversario", "eletronica", "", "neon", { i: ["caixasom"], o: ["laser", "equalizador"], tx: "zoom" }),
    /* 22/11 — REALISTAS: objetos fotográficos (biblioteca oficial, IA da plataforma) com movimento e sombra */
    M("re-brinde", "Brinde realista", "adulto", "aniversario", "luxo", "", "elegante", { i: ["r-tacas-champanhe", "r-garrafa-champanhe"], o: ["glitter", "faiscas"], tx: "brilho" }, { letra: "ouro" }),
    M("re-30", "Balões dourados", "aniv", "aniversario", "elegante", "", "elegante", { i: ["r-balao-dourado", "r-baloes"], o: ["glitter"], tx: "subir" }, { letra: "balao" }),
    M("re-bolo", "Bolo e velas", "aniv", "aniversario", "vinho", "", "classico", { i: ["r-bolo", "r-presente"], o: ["luzquente", "faiscas"], tx: "suave" }),
    M("re-casamento", "Casamento realista", "amor", "casamento", "marmore", "", "classico", { i: ["r-aliancas", "r-rosas"], o: ["petalas"], tx: "suave" }),
    M("re-amor", "Coração e rosas", "amor", "noivado", "vinho", "", "classico", { i: ["r-coracao", "r-rosas"], o: ["coracoes"], tx: "brilho" }),
    M("re-15", "Coroa e brilho", "quinze", "quinze", "luxo", "rosa", "elegante", { i: ["r-coroa", "r-oculos-festa"], o: ["glitter", "luzquente"], tx: "brilho" }, { letra: "balao" }),
    M("re-formatura", "Formatura realista", "empresa", "formatura", "luxo", "", "elegante", { i: ["r-capelo", "r-diploma"], o: ["confete", "flashes"], tx: "zoom" }, { letra: "ouro" }),
    M("re-campeao", "Taça de campeão", "esporte", "campeonato", "futebol", "", "esporte", { i: ["r-trofeu", "r-bola-futebol"], o: ["confete", "flashes"], tx: "zoom" }, { letra: "ouro" }),
    M("re-basquete", "Basquete realista", "esporte", "campeonato", "basquete", "", "esporte", { i: ["r-bola-basquete"], o: ["holofotes"], tx: "zoom" }),
    M("re-gamer", "Setup realista", "gamer", "festa", "gamer", "", "gamer", { i: ["r-controle", "r-fone"], o: ["laser", "pixels"], tx: "zoom" }, { letra: "cromo" }),
    M("re-show", "Microfone no palco", "musica", "show", "palco", "", "impacto", { i: ["r-microfone"], o: ["holofotes", "fumaca", "flashes"], tx: "zoom" }),
    M("re-acustico", "Noite acústica", "musica", "aniversario", "sertanejo", "", "country", { i: ["r-violao", "r-chapeu-vaqueiro"], o: ["cordao"], tx: "subir" }),
    M("re-disco", "Festa disco", "musica", "festa", "retro80", "", "neon", { i: ["r-globo-espelhado", "r-vinil"], o: ["laser", "luzes"], tx: "zoom" }, { letra: "cromo" }),
    M("re-chope", "Chope gelado", "adulto", "festa", "rustico", "", "manuscrito", { i: ["r-chope"], o: ["cordao"], tx: "subir" }),
    M("re-vinho", "Taça de vinho", "adulto", "aniversario", "vinho", "", "elegante", { i: ["r-vinho"], o: ["luzquente"], tx: "brilho" }),
    M("re-drink", "Drinques", "adulto", "happyhour", "luau", "", "manuscrito", { i: ["r-drink"], o: ["luzes"], tx: "subir" }),
    M("re-cinema", "Cinema realista", "adulto", "festa", "cinema", "", "impacto", { i: ["r-pipoca", "r-claquete"], o: ["holofotes"], tx: "zoom" }),
    M("re-reveillon", "Réveillon realista", "datas", "reveillon", "espacial", "ouro", "elegante", { i: ["r-garrafa-champanhe", "r-fogos"], o: ["fogos", "faiscas"], tx: "brilho" }, { letra: "ouro" }),
    M("re-bebe", "Chá de bebê realista", "bebe", "cha", "bebe", "", "divertido", { i: ["r-ursinho", "r-sapatinho"], o: ["estrelas"], tx: "suave" }),
    M("re-patinho", "Patinho na banheira", "bebe", "chafraldas", "aquarela", "azul", "divertido", { i: ["r-patinho"], o: ["bolhas"], tx: "subir" }),
    M("re-jardim", "Borboletas reais", "inf", "aniversario", "floral", "", "classico", { i: ["r-borboleta", "r-rosas"], o: [], tx: "suave" }),
    M("re-natal", "Natal realista", "datas", "natal", "natal", "", "classico", { i: ["r-bola-natal", "r-presente"], o: ["neve"], tx: "suave" }),
    M("re-halloween", "Halloween realista", "datas", "halloween", "halloween", "", "impacto", { i: ["r-abobora"], o: ["fumaca"], tx: "zoom" }),
    M("re-fitness", "Fitness realista", "esporte", "aniversario", "fitness", "", "esporte", { i: ["r-haltere"], o: [], tx: "subir" }),
    M("he-cidade", "Herói na cidade", "heroi", "infantil", "heroi", "", "heroi", { i: ["heroi", "raio"], o: ["estrelas", "cometas"], tx: "zoom" }, { letra: "relevo" }),
    M("he-heroina", "Super-heroína", "heroi", "infantil", "heroi", "rosa", "heroi", { i: ["heroina"], o: ["luzes", "cometas"], tx: "subir" }, { letra: "relevo" }),
    M("he-pow", "POW! Quadrinho", "heroi", "aniversario", "quadrinho", "", "heroi", { i: ["pow", "heroi"], o: ["acao"], tx: "zoom" }),
    M("he-dupla", "Dupla de heróis", "heroi", "infantil", "heroi", "", "heroi", { i: ["heroi", "heroina"], o: ["onoma"], tx: "subir" }),
    M("he-escudo", "Escudo e raio", "heroi", "aniversario", "heroi", "azul", "heroi", { i: ["escudo", "raio"], o: ["holofotes"], tx: "brilho" }, { letra: "cromo" }),
    M("he-hq", "Noite dos quadrinhos", "heroi", "festa", "quadrinho", "vermelho", "heroi", { i: ["mascara"], o: ["meiotom", "onoma"], tx: "zoom" }),
    M("ae-sakura", "Sakura", "anime", "aniversario", "anime", "", "anime", { i: ["animemenina", "galho"], o: ["sakura"], tx: "suave" }),
    M("ae-chibi", "Chibi fofo", "anime", "infantil", "anime", "pastel", "anime", { i: ["animemenino", "onigiri"], o: ["sakura", "estrelas"], tx: "subir" }),
    M("ae-neon", "Cidade neon", "anime", "festa", "animeneon", "", "anime", { i: ["lanterna"], o: ["linhas", "luzes"], tx: "zoom" }, { letra: "neon" }),
    M("ae-gato", "Gatinho da sorte", "anime", "aniversario", "anime", "", "anime", { i: ["gatosorte", "lanterna"], o: ["sakura"], tx: "subir" }),
    M("ae-turma", "Turma anime", "anime", "infantil", "anime", "", "anime", { i: ["animemenino", "animemenina"], o: ["linhas"], tx: "zoom" }),
    M("ae-lua", "Noite de lua", "anime", "aniversario", "anime", "rosa", "anime", { i: ["galho"], o: ["sakura", "cometas"], tx: "brilho" })
  ];
  MODELOS_CONVITE.forEach(function (m) { m.real = !!(m.anim && (m.anim.i || []).some(function (id) { return /^r-/.test(id); })); });
  /* imagem realista chegou da internet: refaz a prévia e as miniaturas que usam aquele objeto */
  var tMinis = 0;
  window.addEventListener("bw-conv-img", function (ev) {
    var id = "r-" + ev.detail; MODELOS_CONVITE.forEach(function (m) { if (m.anim && (m.anim.i || []).indexOf(id) >= 0) delete MINIS[m.id]; });
    agendar(); clearTimeout(tMinis); tMinis = setTimeout(function () { if (!$("bibCard").hidden) desenharBib(); if (E.anim.ligado && $("animItens")) desenharAnim(); }, 500);
  });
  var CAIXA_ESTILO = { marmore: "nenhum", aquarela: "nenhum", vintage: "nenhum", minimal: "nenhum", bebe: "nenhum", floral: "vidro", infantil: "vidro", safari: "vidro", circo: "vidro", praia: "vidro" };
  var VAGAS = [[0.18, 0.13], [0.82, 0.13], [0.84, 0.36], [0.16, 0.36], [0.5, 0.09], [0.2, 0.92], [0.8, 0.92]];
  var VAGAS_R = [[0.3, 0.27], [0.72, 0.29], [0.5, 0.16]];
  var GRANDES = /^(heroi|heroina|animemenino|animemenina|gatosorte)$/;   /* personagens dos temas entram grandes, como os realistas */
  function itensDe(ids) { var nr = 0, nd = 0; return (ids || []).map(function (id, i) { var real = /^r-/.test(id) || GRANDES.test(id), v = real ? VAGAS_R[nr++ % 3] : VAGAS[nd++ % VAGAS.length]; return { id: id, x: v[0], y: v[1], s: real ? (GRANDES.test(id) ? 0.34 : 0.36) : 0.22, f: i * 0.7, esp: v[0] > 0.6 && /^(ursinho|coelho|gato|cachorro|passarinho|dino|patinho|pomba|leao)$/.test(id) }; }); }
  var BIB_CAT = "", MOD_ON = "", MINIS = {};
  function amostra(t, s) { var d = padrao(t, s); campos(t, s).forEach(function (c) { if (d[c[0]] == null && c[3] && c[2] !== "textarea" && !/rsvp|endereco|traje/.test(c[0])) d[c[0]] = c[3]; }); d.data = "2026-12-12"; d.hora = "19:00"; return d; }
  function estadoModelo(m) {
    return { tipo: "convite", sub: m.sub, estilo: m.estilo, paleta: m.paleta, formato: "story", fotoModo: "ia", desc: "",
      aj: Object.assign({}, E.aj, { pos: "", caixa: CAIXA_ESTILO[m.estilo] || "degrade", cor: "auto", par: m.par, destaque: "", logo: false, qr: "", letra: "normal" }, m.aj),
      anim: { ligado: !!m.anim, itens: itensDe(m.anim && m.anim.i), over: (m.anim && m.anim.o || []).slice(), texto: (m.anim && m.anim.tx) || "suave", dur: E.anim.dur || 8 } };
  }
  function miniModelo(m) {   /* desenha a miniatura com dados de exemplo e devolve o canvas */
    var salvo = E, salvoSel = SEL, salvoFoto = FOTO;
    try { E = Object.assign({ dados: {} }, estadoModelo(m)); E.dados["convite|" + m.sub] = amostra("convite", m.sub); SEL = -1; FOTO = null; return render(232, 412, m.anim ? 2.6 : undefined); }
    finally { E = salvo; SEL = salvoSel; FOTO = salvoFoto; }
  }
  function desenharBib() {
    var card = $("bibCard"); if (!card) return; card.hidden = E.tipo !== "convite"; if (card.hidden) return;
    chips("bibCats", BIB_CATS, BIB_CAT, "bibcat");
    var lista = MODELOS_CONVITE.filter(function (m) { return !BIB_CAT || (BIB_CAT === "anim" ? !!m.anim : BIB_CAT === "real" ? m.real : m.cat === BIB_CAT); });
    $("bib").innerHTML = lista.map(function (m) { return '<button type="button" role="listitem" class="cr-mod' + (m.id === MOD_ON ? " on" : "") + '" data-mod="' + m.id + '"><span class="ph" data-mini="' + m.id + '"></span><span>' + esc(m.nome) + (m.anim ? "<b>✨</b>" : "") + "</span></button>"; }).join("");
    pintarMinis();
  }
  var pintando = 0;
  function pintarMinis() {
    clearTimeout(pintando);
    var fila = [].slice.call(document.querySelectorAll("[data-mini]"));
    (function passo() {
      var el = fila.shift(); if (!el) return; var id = el.dataset.mini, m = MODELOS_CONVITE.filter(function (q) { return q.id === id; })[0];
      if (m) { var c = MINIS[id]; if (!c) { c = MINIS[id] = miniModelo(m); } var cl = document.createElement("canvas"); cl.width = c.width; cl.height = c.height; cl.getContext("2d").drawImage(c, 0, 0); cl.setAttribute("aria-hidden", "true"); el.replaceWith(cl); }
      pintando = setTimeout(passo, 8);
    })();
  }
  function aplicarModelo(id) {
    var m = MODELOS_CONVITE.filter(function (q) { return q.id === id; })[0]; if (!m) return;
    var st = estadoModelo(m); E.tipo = "convite"; E.sub = st.sub; E.estilo = st.estilo; E.paleta = st.paleta; E.aj = st.aj; E.anim = st.anim; E.formato = TIPOS.convite.fmt;
    OPS = [null, null, null]; SEL = -1; OP_MODO = ""; MOD_ON = id; ITEM_SEL = -1; T0 = performance.now();
    tudo(); toast("✓ Modelo " + m.nome + (m.anim ? " (animado)" : "") + ". Agora é só pôr os seus dados.");
  }

  /* ----- painel do convite animado ----- */
  var ITEM_ORDEM = ["r-tacas-champanhe", "r-garrafa-champanhe", "r-balao-dourado", "r-baloes", "r-presente", "r-bolo", "r-rosas", "r-aliancas", "r-coracao", "r-estrela", "r-coroa", "r-trofeu",
    "r-bola-futebol", "r-bola-basquete", "r-controle", "r-fone", "r-microfone", "r-violao", "r-vinil", "r-globo-espelhado", "r-chope", "r-vinho", "r-drink", "r-pipoca", "r-claquete",
    "r-capelo", "r-diploma", "r-ursinho", "r-borboleta", "r-sapatinho", "r-patinho", "r-chapeu-vaqueiro", "r-haltere", "r-oculos-festa", "r-fogos", "r-abobora", "r-bola-natal", "controle", "bolafut", "trofeu", "violao", "microfone", "nota", "vinil", "fone", "caixasom", "chopp", "vinho", "pipoca", "claquete", "haltere", "bolabasq", "carro", "pandeiro", "chapeu", "ursinho", "coelho", "gato", "cachorro", "passarinho", "borboleta", "peixe", "joaninha", "abelha", "dino", "unicornio", "leao", "patinho", "pomba", "foguete", "coracao", "estrela", "balao", "bolo", "tacas", "presente", "coroa", "aliancas", "capelo", "lua", "abobora", "arvore", "heroi", "heroina", "escudo", "raio", "pow", "mascara", "animemenino", "animemenina", "gatosorte", "lanterna", "onigiri", "galho"];
  var MINI_IT = {}, MINI_EF = {};
  function desenharAnim() {
    var A = window.BWConviteAnim, card = $("animCard"); if (!card) return; if (!A) { card.hidden = true; return; }
    var an = E.anim; chips("animLiga", [["sim", "✨ ANIMADO"], ["nao", "PARADO (IMAGEM)"]], an.ligado ? "sim" : "nao", "animliga");
    $("animCorpo").hidden = !an.ligado;
    $("cv").style.touchAction = an.ligado && an.itens.length ? "none" : "";
    if (!an.ligado) return;
    $("animItens").innerHTML = ITEM_ORDEM.filter(function (id) { return A.ITENS[id]; }).map(function (id) {
      var n = an.itens.filter(function (q) { return q.id === id; }).length; MINI_IT[id] = MINI_IT[id] || A.mini(id, 92);
      return '<button type="button" class="cr-it' + (n ? " on" : "") + '" data-ait="' + id + '" title="' + esc(A.ITENS[id].nome) + '"><img alt="" src="' + MINI_IT[id] + '">' + esc(A.ITENS[id].nome) + (n ? '<span class="n">' + n + "</span>" : "") + "</button>";
    }).join("");
    $("animOver").innerHTML = Object.keys(A.EFEITOS).map(function (id) {
      MINI_EF[id] = MINI_EF[id] || A.miniEfeito(id, 92); var on = an.over.indexOf(id) >= 0;
      return '<button type="button" class="cr-it' + (on ? " on" : "") + '" data-aef="' + id + '" aria-pressed="' + on + '"><img alt="" src="' + MINI_EF[id] + '">' + esc(A.EFEITOS[id].nome) + "</button>";
    }).join("");
    chips("animTexto", [["suave", "SUAVE"], ["subir", "SUBINDO"], ["zoom", "ZOOM"], ["digitar", "DIGITANDO"], ["brilho", "BRILHO"], ["nenhuma", "SEM ANIMAÇÃO"]], an.texto, "animtx");
    chips("animDur", [[6, "6 s"], [8, "8 s"], [10, "10 s"], [15, "15 s"]].map(function (d) { return [String(d[0]), d[1]]; }), String(an.dur), "animdur");
    chips("animQual", [["1280", "RÁPIDA (720p)"], ["1920", "ALTA (1080p)"]], String(U_QUAL), "animqual");
    desenharSel();
  }
  var U_QUAL = (function () { try { return localStorage.getItem("ui_criador_qual") || (innerWidth < 900 ? "1280" : "1920"); } catch (e) { return "1280"; } })();
  function desenharSel() {
    var b = $("animSel"), it = E.anim.itens[ITEM_SEL]; if (!b) return; b.hidden = !it; if (!it) return;
    b.innerHTML = "<span>" + esc(window.BWConviteAnim.ITENS[it.id].nome) + ":</span>" + [["menor", "− MENOR"], ["maior", "＋ MAIOR"], ["virar", "⇋ VIRAR"], ["tirar", "✕ TIRAR"], ["ok", "✓ PRONTO"]].map(function (q) { return '<button type="button" class="cr-chip" data-asel="' + q[0] + '">' + q[1] + "</button>"; }).join("");
  }
  function mudouAnim() { MOD_ON = MOD_ON && E.anim ? MOD_ON : ""; desenharAnim(); agendar(); }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-mod],[data-ait],[data-aef],[data-asel],[data-k='bibcat'],[data-k='animliga'],[data-k='animtx'],[data-k='animdur'],[data-k='animqual']"); if (!b) return;
    var an = E.anim, k = b.dataset.k, v = b.dataset.v;
    if (b.dataset.mod) return aplicarModelo(b.dataset.mod);
    if (k === "bibcat") { BIB_CAT = v; desenharBib(); return; }
    if (k === "animliga") { an.ligado = v === "sim"; T0 = performance.now(); ITEM_SEL = -1; if (an.ligado && !an.itens.length && !an.over.length) an.over = ["estrelas"]; mudouAnim(); return; }
    if (k === "animtx") { an.texto = v; T0 = performance.now(); mudouAnim(); return; }
    if (k === "animdur") { an.dur = +v; mudouAnim(); return; }
    if (k === "animqual") { U_QUAL = v; try { localStorage.setItem("ui_criador_qual", v); } catch (e) { } desenharAnim(); return; }
    if (b.dataset.ait) { var vg = VAGAS[an.itens.length % VAGAS.length]; an.itens.push({ id: b.dataset.ait, x: vg[0], y: vg[1], s: 0.22, f: an.itens.length * 0.7 }); ITEM_SEL = an.itens.length - 1; mudouAnim(); toast("Arraste o " + window.BWConviteAnim.ITENS[b.dataset.ait].nome.toLowerCase() + " na prévia para o lugar que quiser."); return; }
    if (b.dataset.aef) { var i = an.over.indexOf(b.dataset.aef); if (i >= 0) an.over.splice(i, 1); else an.over.push(b.dataset.aef); mudouAnim(); return; }
    if (b.dataset.asel) { var it = an.itens[ITEM_SEL]; if (!it) return; var q = b.dataset.asel;
      if (q === "menor") it.s = Math.max(0.08, it.s - 0.04); else if (q === "maior") it.s = Math.min(0.6, it.s + 0.04); else if (q === "virar") it.esp = !it.esp;
      else if (q === "tirar") { an.itens.splice(ITEM_SEL, 1); ITEM_SEL = -1; } else ITEM_SEL = -1; mudouAnim(); }
  });
  /* arrastar os bichinhos na prévia (medida em FRAÇÃO da tela — PENTE FINO 48) */
  (function () {
    var cv = $("cv"), pega = null;
    function frac(ev) { var r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height, w: r.width, h: r.height }; }
    cv.addEventListener("pointerdown", function (ev) {
      if (!E.anim.ligado || !E.anim.itens.length) return; var f = frac(ev), m = Math.min(f.w, f.h), achou = -1;
      for (var i = E.anim.itens.length - 1; i >= 0; i--) { var it = E.anim.itens[i], r0 = it.s * m * 0.6; if (Math.abs(f.x * f.w - it.x * f.w) < r0 && Math.abs(f.y * f.h - it.y * f.h) < r0) { achou = i; break; } }
      ITEM_SEL = achou; desenharSel(); if (achou < 0) return;
      pega = { i: achou, dx: E.anim.itens[achou].x - f.x, dy: E.anim.itens[achou].y - f.y }; try { cv.setPointerCapture(ev.pointerId); } catch (e) { } ev.preventDefault();
    });
    cv.addEventListener("pointermove", function (ev) { if (!pega) return; var f = frac(ev), it = E.anim.itens[pega.i]; if (!it) return; it.x = lim(f.x + pega.dx, 0, 1); it.y = lim(f.y + pega.dy, 0, 1); agendar(); });
    function solta() { if (pega) { pega = null; gravar(); } }
    cv.addEventListener("pointerup", solta); cv.addEventListener("pointercancel", solta);
  })();

  /* ----- música e vídeo (tudo no aparelho) ----- */
  var MUS = null, VID = { parar: false, url: "", arquivo: null };
  $("animMusBt").onclick = function () { $("animMus").click(); };
  $("animMusTira").onclick = function () { MUS = null; $("animMusNome").textContent = ""; $("animMusTira").hidden = true; };
  $("animMus").onchange = async function () {
    var f = this.files && this.files[0]; this.value = ""; if (!f) return;
    try { var ab = await f.arrayBuffer(), ac = new (window.AudioContext || window.webkitAudioContext)(), buf = await ac.decodeAudioData(ab.slice(0)); ac.close();
      MUS = { buf: buf, nome: f.name }; $("animMusNome").textContent = "♪ " + f.name + " (" + Math.round(buf.duration) + " s)"; $("animMusTira").hidden = false; }
    catch (e) { toast("Não deu para abrir essa música. Tente MP3 ou M4A."); }
  };
  async function somDoVideo(dur) {
    if (!MUS) return null; var SR = 48000, ctx = new OfflineAudioContext(2, Math.round(dur * SR), SR), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = MUS.buf; src.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(0.9, 0.4); g.gain.setValueAtTime(0.9, Math.max(0.5, dur - 1.2)); g.gain.linearRampToValueAtTime(0, dur);
    src.start(0); var r = await ctx.startRendering(); return { L: r.getChannelData(0), R: r.getChannelData(1) };
  }
  function nomeVideo() { return nomeArq("png").replace(/\.png$/, ".mp4"); }
  async function gerarVideo() {
    if (!E.anim.ligado) { toast("Ligue ✨ ANIMADO para gerar o vídeo."); return null; }
    if (!window.BWReelsCelular || !(await BWReelsCelular.suporta())) { toast("Este navegador não grava vídeo sozinho. Use o Chrome, Edge ou Safari atualizado."); return null; }
    var actx = null; try { actx = MUS ? new (window.AudioContext || window.webkitAudioContext)() : null; } catch (e) { actx = null; }   // nasce no toque (iPhone)
    var t = tamanho(), d = +E.anim.dur || 8; VID.parar = false; GERANDO = true; ITEM_SEL = -1;
    $("animProg").hidden = false; $("animPronto").hidden = true; $("animGerar").disabled = true; $("animBarra").value = 0; $("animProgTxt").textContent = "Preparando…";
    try {
      if (window.BWConviteAnim) { $("animProgTxt").textContent = "Carregando os objetos…"; await BWConviteAnim.pronto(E.anim.itens.map(function (q) { return q.id; })); }
      var som = await somDoVideo(d);
      var res = await BWReelsCelular.gerar({ largura: t.W, altura: t.H, fps: 30, duracao: d, som: som, audioCtx: actx, alturaSaida: +U_QUAL,
        desenhar: function (tt, ctx, w, h) { var c = render(w, h, tt); ctx.drawImage(c, 0, 0); c.width = c.height = 1; },
        cancelar: function () { return VID.parar; }, aoProgredir: function (p) { $("animBarra").value = p.pct; $("animProgTxt").textContent = p.etapa + "… " + p.pct + "%"; } });
      if (VID.url) URL.revokeObjectURL(VID.url);
      VID.arquivo = new File([res.blob], nomeVideo(), { type: "video/mp4" }); VID.url = URL.createObjectURL(res.blob);
      $("animVideo").src = VID.url; $("animBaixar").href = VID.url; $("animBaixar").download = VID.arquivo.name; $("animPronto").hidden = false;
      if (window.BWCriacoes) BWCriacoes.aoLado("animBaixar", { ferramenta: "criador", tipo: "video", arquivo: function () { return VID.arquivo; }, nome: function () { var dd = dados(); return dd.nome || dd.titulo || "Convite animado"; } });
      $("animProgTxt").textContent = "✓ Vídeo pronto (" + res.largura + "×" + res.altura + ", " + d + " s" + (MUS ? res.comSom ? ", com música" : ", sem som — este aparelho não gravou o áudio" : "") + ").";
      return res;
    } catch (e) { $("animProgTxt").textContent = /cancelado/.test(e.message) ? "Cancelado." : "Não deu certo: " + (e.message || e); return null; }
    finally { GERANDO = false; $("animGerar").disabled = false; if (actx) actx.close().catch(function () { }); agendar(); }
  }
  $("animGerar").onclick = gerarVideo;
  $("animCancelar").onclick = function () { VID.parar = true; };
  $("animShare").onclick = async function () { if (!VID.arquivo) return; if (navigator.canShare && navigator.canShare({ files: [VID.arquivo] })) { try { await navigator.share({ files: [VID.arquivo], title: "Convite" }); return; } catch (e) { if (e && e.name === "AbortError") return; } } baixar(VID.arquivo, VID.arquivo.name); };
  document.addEventListener("visibilitychange", function () { if (!document.hidden) agendar(); });
  lerKit().then(function () { tudo(); carregarQr().then(agendar); });
  tudo();
  window.__criador = { E: function () { return E; }, render: render, prontos: prontos, criarIA: criarIA, png: png, pdf: pdf, compartilhar: compartilhar, textosIA: textosIA, legenda: legenda,
    blocos: blocos, fmtData: fmtData, urlQr: urlQr, ops: function () { return OPS; }, sel: function () { return SEL; }, tudo: tudo, dados: dados, carregarQr: carregarQr,
    modelos: MODELOS_CONVITE, aplicarModelo: aplicarModelo, gerarVideo: gerarVideo, anim: function () { return E.anim; }, itemSel: function () { return ITEM_SEL; } };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
