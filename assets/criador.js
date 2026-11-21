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
    convite: { nome: "CONVITE", fmt: "story", pos: "baixo", subs: [["aniversario", "Aniversário"], ["infantil", "Infantil"], ["quinze", "15 anos"], ["casamento", "Casamento"], ["cha", "Chá de bebê"], ["revelacao", "Chá revelação"], ["formatura", "Formatura"], ["savethedate", "Save the date"], ["batizado", "Batizado"], ["confra", "Confraternização"]] },
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
      confra: { pre: "É hora de celebrar juntos", titulo: "Confraternização", en: "end of year company party celebration" }
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
      var c = [["pre", "Frase de abertura", "text", "Você está convidado", 1], ["titulo", "Título", "text", "Aniversário de"], ["nome", s === "casamento" ? "Nomes do casal" : s === "confra" ? "Empresa / grupo" : "Nome", "text", s === "casamento" ? "Ana & Pedro" : "Marina"]];
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
    ["natal", "Natal", "christmas, festive red and gold, warm lights, ornaments", "classico", ["#3E0A0A", "#8B1A1A", "#E8C26A"]]
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
    neon: { nome: "Neon", s: ["Righteous", 400], d: ["Michroma", 400], b: ["Inter", 600] }
  };
  var FORMATOS = [["story", "STORY 9:16", 1080, 1920], ["post", "POST 4:5", 1080, 1350], ["quadrado", "QUADRADO", 1080, 1080], ["paisagem", "PAISAGEM 16:9", 1920, 1080],
    ["a5", "A5 IMPRIMIR", 1748, 2480], ["a4", "A4 IMPRIMIR", 2480, 3508], ["cartao", "CARTÃO 9×5", 1063, 591]];
  var PAPEL_PT = { a5: [419.53, 595.28], a4: [595.28, 841.89], cartao: [255.12, 141.73] };   // tamanho da página do PDF (pontos)

  /* ================= ESTADO (lembrado neste aparelho) ================= */
  function lerUi() { try { return JSON.parse(localStorage.getItem("ui_criador") || "{}") || {}; } catch (e) { return {}; } }
  var U = lerUi();
  var E = Object.assign({ tipo: "convite", sub: "aniversario", dados: {}, estilo: "festa", paleta: "", formato: "story", desc: "", fotoModo: "ia",
    aj: { pos: "", caixa: "degrade", par: "", cor: "auto", destaque: "", tam: 100, alinh: "centro", escurecer: 0, logo: false, logoId: "", qr: "", moldura: "circulo" } }, U);
  E.aj = Object.assign({ pos: "", caixa: "degrade", par: "", cor: "auto", destaque: "", tam: 100, alinh: "centro", escurecer: 0, logo: false, logoId: "", qr: "", moldura: "circulo" }, U.aj || {});
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
  function tudo() { desenharTopo(); desenharCampos(); desenharEstilo(); desenharAjustes(); desenharOps(); agendar(); }

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
    x.globalAlpha = 1; void claro; return c;
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
  function render(W, H) {
    var c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d", { willReadFrequently: true }); x.imageSmoothingQuality = "high";
    var a = E.aj, m = Math.min(W, H), cs = cores(), dest = a.destaque || cs[2] || "#E8C26A", pos = posTexto(), cartaoH = E.tipo === "cartao" && W / H > 1.25;
    /* 1. fundo */
    if (FOTO && E.fotoModo === "fundo") capa(x, FOTO, 0, 0, W, H);
    else if (SEL >= 0 && OPS[SEL]) capa(x, OPS[SEL], 0, 0, W, H);
    else { var fp = fundoPronto(Math.round(W / 2), Math.round(H / 2), 0); x.drawImage(fp, 0, 0, W, H); fp.width = fp.height = 1; }
    if (a.escurecer) { x.fillStyle = "rgba(0,0,0," + a.escurecer / 100 + ")"; x.fillRect(0, 0, W, H); }
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
    med.itens.forEach(function (it) {
      var P = PAPEL[it.p.r] || {}, cor = P.cor === "dest" ? dest : corT;
      if (it.p.r === "linha") { x.fillStyle = dest; var lw2 = Math.min(larg * 0.32, base * 0.22); x.fillRect(esq ? bx : W / 2 - lw2 / 2, y + it.h * 0.42, lw2, Math.max(2, base * 0.004)); y += it.h; return; }
      x.font = fonte(it.p, it.fs); x.letterSpacing = P.esp ? Math.round(it.fs * P.esp) + "px" : "0px";
      if (it.p.r === "cta") {
        var tw = x.measureText(it.linhas.join(" ")).width, bw = tw + it.fs * 2.2, bh = it.fs * 2.05, bxx = esq ? bx : W / 2 - bw / 2;
        x.save(); x.shadowColor = "rgba(0,0,0,.3)"; x.shadowBlur = it.fs * 0.6; x.fillStyle = dest; rr(x, bxx, y + it.fs * 0.1, bw, bh, bh / 2); x.fill(); x.restore();
        x.fillStyle = corContraste(dest); x.textAlign = "center"; x.fillText(it.linhas.join(" "), bxx + bw / 2, y + it.fs * 0.1 + (bh - it.fs) / 2 - it.fs * 0.04); x.textAlign = esq ? "left" : "center";
        y += it.h + it.gap; return;
      }
      if (it.p.r === "contato") { x.fillStyle = dest; x.beginPath(); x.arc(bx + it.fs * 0.32, y + it.fs * 0.58, it.fs * 0.2, 0, 7); x.fill(); }
      x.save();
      if (a.caixa === "nenhum" || a.caixa === "degrade") { x.shadowColor = claro ? "rgba(0,0,0,.55)" : "rgba(255,255,255,.5)"; x.shadowBlur = it.fs * 0.18; x.shadowOffsetY = it.fs * 0.03; }
      x.fillStyle = cor;
      it.linhas.forEach(function (l, j) { x.fillText(l, it.p.r === "contato" ? bx + it.fs * 0.85 : cx, y + j * it.lh); });
      x.restore(); y += it.h + it.gap;
    });
    x.letterSpacing = "0px";
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
  var pedido = 0;
  function agendar() { if (pedido) return; pedido = requestAnimationFrame(function () { pedido = 0; previa(); }); }
  var fontesOk = false;
  function previa() {
    var t = tamanho(), k = 1100 / Math.max(t.W, t.H), W = Math.round(t.W * k), H = Math.round(t.H * k), c = render(W, H), cv = $("cv");
    cv.width = W; cv.height = H; cv.getContext("2d").drawImage(c, 0, 0); c.width = c.height = 1; gravar();
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
      if (k === "sub") { E.sub = v; desenharTopo(); desenharCampos(); desenharAjustes(); agendar(); return; }
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

  lerKit().then(function () { tudo(); carregarQr().then(agendar); });
  tudo();
  window.__criador = { E: function () { return E; }, render: render, prontos: prontos, criarIA: criarIA, png: png, pdf: pdf, compartilhar: compartilhar, textosIA: textosIA, legenda: legenda,
    blocos: blocos, fmtData: fmtData, urlQr: urlQr, ops: function () { return OPS; }, sel: function () { return SEL; }, tudo: tudo, dados: dados, carregarQr: carregarQr };
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(function () { });
})();
