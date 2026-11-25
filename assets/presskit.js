/* PRESS KIT (25/11/2026, Claude — pedido do dono: "modelos padrões profissionais para o usuário criar o seu, gera PDF e editável").
   O que é: o pacote que a empresa, o artista ou o evento entrega para imprensa, clientes e parceiros (quem é, números, serviços, fotos,
   clientes, depoimentos, release, imprensa, agenda, ficha técnica e contato).
   - 6 MODELOS profissionais (corporativo, produtora audiovisual, artista/EPK, evento, editorial, minimalista) que já abrem com um exemplo completo
     da "Produtora Exemplo" (pessoas e empresas inventadas) — a pessoa troca pelos dados dela, liga/desliga e reordena as seções.
   - UM modelo só (modelo()) alimenta o PDF (pdfMake, texto selecionável, fontes Montserrat/Playfair embutidas) e o WORD (.docx editável).
     A PRÉVIA é o próprio PDF desenhado pelo pdf.js — o que aparece na tela é o que sai no arquivo (regra 57).
   - Dados da conta: mkt_presskit (só textos, em CHAVES do bw-sync). Fotos e logo ficam SÓ no aparelho (IndexedDB bw_presskit), como no BW Reels (regra 84).
   - IA: só a IA Brightway (bw-ia), recebe só o texto que a pessoa digitou; nunca troca nome, números ou datas (regra 54). Nada sai sozinho. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; }); };
  var FN_TXT = "https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia";
  var PUB = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU";
  var LIB = {
    pdf: ["https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/pdfmake.min.js", "https://cdn.jsdelivr.net/npm/pdfmake@0.2.20/build/vfs_fonts.js"],
    docx: ["https://cdn.jsdelivr.net/npm/docx@9.8.1/dist/index.iife.js"],
    qr: ["https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"],
    zip: ["assets/jszip.min.js"]
  };
  var PDFJS = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/";
  var CHAVE = "mkt_presskit";
  var W = 595.28, H = 841.89, MX = 50, CW = W - 2 * MX;

  /* ================= DADOS (conta) ================= */
  function lista() { try { var v = JSON.parse(localStorage.getItem("bw_" + CHAVE + "_v1") || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function gravarLista(v) {
    try { if (window.BWSync && typeof BWSync.antesDeSalvar === "function") BWSync.antesDeSalvar(CHAVE, 1, v); } catch (e) { }
    try { localStorage.setItem("bw_" + CHAVE + "_v1", JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function acharKit(id) { return lista().filter(function (k) { return k.id === id; })[0] || null; }
  function salvarKit(k) { k.atualizado = new Date().toISOString(); var l = lista(), i = l.findIndex(function (x) { return x.id === k.id; }); if (i >= 0) l[i] = k; else l.push(k); gravarLista(l); }
  function uid() { return "pk" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ================= IMAGENS (só no aparelho) ================= */
  var _db = null;
  function db() {
    if (_db) return _db;
    _db = new Promise(function (ok, erro) {
      var r = indexedDB.open("bw_presskit", 1);
      r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("imgs")) d.createObjectStore("imgs"); if (!d.objectStoreNames.contains("thumbs")) d.createObjectStore("thumbs"); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { erro(r.error); };
    });
    return _db;
  }
  async function idbGet(loja, k) { try { var d = await db(); return await new Promise(function (ok) { var t = d.transaction(loja, "readonly").objectStore(loja).get(k); t.onsuccess = function () { ok(t.result || null); }; t.onerror = function () { ok(null); }; }); } catch (e) { return null; } }
  async function idbPut(loja, k, v) { try { var d = await db(); await new Promise(function (ok, erro) { var t = d.transaction(loja, "readwrite"); t.objectStore(loja).put(v, k); t.oncomplete = ok; t.onerror = function () { erro(t.error); }; }); return true; } catch (e) { return false; } }
  async function idbDel(loja, k) { try { var d = await db(); await new Promise(function (ok) { var t = d.transaction(loja, "readwrite"); t.objectStore(loja).delete(k); t.oncomplete = ok; t.onerror = ok; }); } catch (e) { } }
  function imgsVazias() { return { logo: "", capa: "", retrato: "", fotos: [] }; }

  function imgDe(src) { return new Promise(function (ok, erro) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { erro(new Error("imagem")); }; i.src = src; }); }
  /* arquivo escolhido → copiado na hora para a memória (regra 47) e reduzido; logo PNG fica PNG (transparência, regra 59) */
  async function arquivoParaUrl(file, max, manterPng) {
    var buf = await file.arrayBuffer(), blob = new Blob([buf], { type: file.type || "image/jpeg" }), u = URL.createObjectURL(blob);
    try {
      var im = await imgDe(u), s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * s)); c.height = Math.max(1, Math.round(im.naturalHeight * s));
      var x = c.getContext("2d"), png = manterPng && /png|webp|gif|svg/.test(file.type || "");
      if (!png) { x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(im, 0, 0, c.width, c.height);
      return png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.88);
    } finally { URL.revokeObjectURL(u); }
  }
  /* recorte "cobrir" no tamanho exato (o PDF não distorce) + escurecido opcional para texto por cima */
  var CORTES = {};
  async function recortar(src, w, h, op) {
    if (!src) return "";
    op = op || {};
    var k = src.length + "|" + src.slice(-48) + "|" + w + "x" + h + "|" + JSON.stringify(op);
    if (CORTES[k]) return CORTES[k];
    var im = await imgDe(src), c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(h);
    var x = c.getContext("2d"), s = Math.max(c.width / im.naturalWidth, c.height / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    x.drawImage(im, (c.width - dw) * (op.fx == null ? 0.5 : op.fx), (c.height - dh) * 0.5, dw, dh);
    if (op.escurecer) {
      var g = op.dir === "esq" ? x.createLinearGradient(0, 0, c.width, 0) : x.createLinearGradient(0, 0, 0, c.height);
      g.addColorStop(0, "rgba(6,8,13," + (op.dir === "esq" ? op.escurecer : op.escurecer * 0.35) + ")");
      g.addColorStop(0.45, "rgba(6,8,13," + op.escurecer * 0.25 + ")");
      g.addColorStop(1, "rgba(6,8,13," + (op.dir === "esq" ? 0.05 : op.escurecer) + ")");
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    }
    var u = c.toDataURL("image/jpeg", op.q || 0.86);
    var ks = Object.keys(CORTES); if (ks.length > 60) delete CORTES[ks[0]];
    return (CORTES[k] = u);
  }
  async function reduzir(src, max) {
    if (!src) return "";
    var k = "r" + src.length + "|" + src.slice(-48) + "|" + max; if (CORTES[k]) return CORTES[k];
    var im = await imgDe(src), s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    if (s >= 1) return (CORTES[k] = src);
    var c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    return (CORTES[k] = /^data:image\/png/.test(src) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86));
  }
  function proporcao(src) { return imgDe(src).then(function (im) { return im.naturalWidth / Math.max(1, im.naturalHeight); }).catch(function () { return 2; }); }

  /* fotos de EXEMPLO desenhadas no aparelho — palco/luzes e RETRATOS em silhueta (pessoa inventada, sem rosto real), nas cores da marca (regra 237) */
  var EXEMPLOS_IMG = {};
  function aleat(s) { return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function fotoExemplo(seed, tons) {
    var k = seed + "|" + tons.join(","); if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 1600; c.height = 1000;
    var x = c.getContext("2d"), r = aleat(seed * 7 + 3);
    var g = x.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, "#0B1222"); g.addColorStop(1, "#142544"); x.fillStyle = g; x.fillRect(0, 0, 1600, 1000);
    x.globalCompositeOperation = "lighter";
    for (var i = 0; i < 5; i++) {   /* feixes de luz do palco */
      var cx = 180 + i * 310 + r() * 60, cor = tons[i % tons.length];
      var gr = x.createLinearGradient(cx, 0, cx + (r() - 0.5) * 300, 820); gr.addColorStop(0, cor + "cc"); gr.addColorStop(1, cor + "00");
      x.fillStyle = gr; x.beginPath(); x.moveTo(cx - 14, 0); x.lineTo(cx + 14, 0); x.lineTo(cx + 170 + (r() - 0.5) * 200, 820); x.lineTo(cx - 170 + (r() - 0.5) * 200, 820); x.closePath(); x.fill();
    }
    for (var b = 0; b < 46; b++) {   /* bokeh */
      var bx = r() * 1600, by = r() * 700, br = 10 + r() * 46, bc = tons[b % tons.length], gb = x.createRadialGradient(bx, by, 0, bx, by, br);
      gb.addColorStop(0, bc + "88"); gb.addColorStop(1, bc + "00"); x.fillStyle = gb; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill();
    }
    x.globalCompositeOperation = "source-over";
    var tela = x.createLinearGradient(0, 380, 0, 640); tela.addColorStop(0, tons[0] + "55"); tela.addColorStop(1, tons[1 % tons.length] + "22");
    x.fillStyle = tela; x.fillRect(470, 360, 660, 300); x.strokeStyle = "rgba(245,241,234,.35)"; x.lineWidth = 3; x.strokeRect(470, 360, 660, 300);
    x.fillStyle = "#05070c";
    for (var p = 0; p < 34; p++) { var px = p * 50 - 20 + r() * 20, py = 880 + r() * 50, pr = 34 + r() * 16; x.beginPath(); x.arc(px, py - pr * 1.4, pr * 0.62, 0, 7); x.fill(); x.beginPath(); x.ellipse(px, py + 40, pr * 1.1, pr * 1.5, 0, 0, 7); x.fill(); }
    x.fillRect(0, 940, 1600, 60);
    return (EXEMPLOS_IMG[k] = c.toDataURL("image/jpeg", 0.85));
  }
  /* pessoa em silhueta com luz de recorte (retrato de estúdio inventado). fundo = null → PNG recortado (como a foto sem fundo do "Quem sou eu?") */
  function pessoa(x, cx, base, esc, cab, roupa, luz) {
    x.save(); x.translate(cx, base); x.scale(esc, esc);
    x.fillStyle = roupa; x.beginPath(); x.moveTo(-250, 0); x.bezierCurveTo(-240, -230, -150, -300, -70, -320); x.lineTo(70, -320); x.bezierCurveTo(150, -300, 240, -230, 250, 0); x.closePath(); x.fill();
    x.fillStyle = "#2a1d17"; x.fillRect(-42, -380, 84, 80);
    x.beginPath(); x.ellipse(0, -470, 92, 118, 0, 0, 7); x.fill();
    x.fillStyle = cab; x.beginPath(); x.ellipse(0, -540, 104, 72, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(-70, -500, 40, 70, 0.3, 0, 7); x.fill();
    if (luz) { x.globalCompositeOperation = "source-atop"; var g = x.createLinearGradient(-260, 0, 260, 0); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.72, "rgba(0,0,0,0)"); g.addColorStop(1, luz); x.fillStyle = g; x.fillRect(-300, -700, 600, 720); x.globalCompositeOperation = "source-over"; }
    x.restore();
  }
  function retratoExemplo(seed, tons, recorte) {
    var k = "ret|" + seed + "|" + tons.join(",") + "|" + !!recorte; if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 1000; c.height = 1250; var x = c.getContext("2d"), r = aleat(seed * 13 + 5);
    if (!recorte) {
      var g = x.createRadialGradient(620, 420, 60, 520, 620, 900); g.addColorStop(0, tons[0] + "aa"); g.addColorStop(0.55, "#142544"); g.addColorStop(1, "#0B1222"); x.fillStyle = g; x.fillRect(0, 0, 1000, 1250);
      x.globalCompositeOperation = "lighter";
      for (var b = 0; b < 26; b++) { var bx = r() * 1000, by = r() * 700, br = 12 + r() * 40, gb = x.createRadialGradient(bx, by, 0, bx, by, br); gb.addColorStop(0, tons[b % tons.length] + "77"); gb.addColorStop(1, tons[b % tons.length] + "00"); x.fillStyle = gb; x.beginPath(); x.arc(bx, by, br, 0, 7); x.fill(); }
      x.globalCompositeOperation = "source-over";
    }
    pessoa(x, 520, 1250, 1.75, "#1b130f", recorte ? tons[1 % tons.length] : "#0d1424", tons[0] + "dd");
    return (EXEMPLOS_IMG[k] = recorte ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.86));
  }
  function logoExemplo(texto, cor) {
    var k = "logo|" + texto + cor; if (EXEMPLOS_IMG[k]) return EXEMPLOS_IMG[k];
    var c = document.createElement("canvas"); c.width = 900; c.height = 300; var x = c.getContext("2d");
    x.fillStyle = cor; x.beginPath(); x.arc(150, 150, 120, 0, 7); x.fill();
    x.fillStyle = "#0B1222"; x.font = "800 120px Inter, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(texto.slice(0, 2).toUpperCase(), 150, 158);
    x.fillStyle = cor; x.textAlign = "left"; x.font = "800 82px Inter, Arial, sans-serif"; x.fillText(texto.toUpperCase().slice(0, 9), 300, 158);
    return (EXEMPLOS_IMG[k] = c.toDataURL("image/png"));
  }

  /* ================= SEÇÕES E MODELOS (25/11, dono: "algo mais PESSOAL — atores, colaboradores freelancer… modelos para apresentação pessoal") =================
     Estrutura tirada do jeito que o dono monta o portfólio dele: QUEM SOU EU (com a foto recortada) → o que faço (com fotos) → galeria →
     TV, publicidade e eventos com link → PORTFÓLIO com botões (vídeos, fotos…) → contato com as redes. Nenhum conteúdo dele entra nos modelos. */
  var SECOES = {
    sobre: { nome: "Quem sou eu", ico: "👋" }, perfil: { nome: "Perfil", ico: "🪪" }, servicos: { nome: "O que eu faço", ico: "🧰" },
    numeros: { nome: "Em números", ico: "📊" }, experiencia: { nome: "Trabalhos", ico: "🎬" }, galeria: { nome: "Galeria de fotos", ico: "🖼" },
    links: { nome: "Portfólio", ico: "▶" }, clientes: { nome: "Já trabalhei com", ico: "🤝" }, depoimentos: { nome: "Recomendações", ico: "💬" },
    formacao: { nome: "Formação", ico: "🎓" }, habilidades: { nome: "Habilidades", ico: "✨" }, release: { nome: "Release", ico: "📰" },
    imprensa: { nome: "Na imprensa", ico: "🗞" }, agenda: { nome: "Agenda", ico: "📅" }, rider: { nome: "Ficha técnica", ico: "🎛" }, contato: { nome: "Contato", ico: "📞" }
  };
  var TODAS = Object.keys(SECOES);
  var FONTES_TIT = { MO: "Montserrat", PF: "Playfair", Roboto: "Roboto" };
  var FORMATOS = { a4: "A4 (impressão e e-mail)", rede: "Vertical 4:5 (celular e redes)" };
  var ANO = new Date().getFullYear();

  function base(extra) {
    return Object.assign({ marca: "", slogan: "", etiqueta: "APRESENTAÇÃO PESSOAL", cidade: "", sobreCurto: "", sobre: "", perfil: [], servicos: [], numeros: [], experiencia: [], links: [],
      clientes: "", depoimentos: [], formacao: [], habilidades: "", release: { titulo: "", data: "", texto: "" }, imprensa: [], agenda: [], rider: "", riderObs: "", galeriaLegenda: "",
      contato: { resp: "", cargo: "", tel: "", email: "", site: "", insta: "", tiktok: "", youtube: "", cidade: "" } }, extra || {});
  }
  var EX = {
    ator: function () {
      return base({ marca: "Clara Monteiro", slogan: "Atriz · Teatro, TV e publicidade", cidade: "Belo Horizonte · MG",
        sobreCurto: "Atriz com 10 anos de palco, à vontade em frente à câmera e no improviso.",
        sobre: "Clara começou no teatro de grupo e hoje divide o tempo entre peças, séries e campanhas publicitárias. Gosta de personagens com humor e emoção na mesma cena.\n\nEstudou interpretação para câmera e tem experiência com gravação de comerciais, dublagem e apresentação de eventos.",
        perfil: [{ k: "Registro profissional", v: "DRT 00000/MG (exemplo)" }, { k: "Altura", v: "1,68 m" }, { k: "Idiomas", v: "Português, inglês e espanhol" }, { k: "Disponível para", v: "Viagens e gravações noturnas" }],
        experiencia: [{ grupo: "TV e streaming", titulo: "Série Caminhos de Minas", papel: "Personagem fixa (Lúcia)", onde: "Canal Exemplo", ano: ANO - 1 + "", link: "youtube.com/exemplo" },
          { grupo: "TV e streaming", titulo: "Programa Tarde Boa", papel: "Quadro de humor", onde: "TV Exemplo", ano: ANO - 2 + "", link: "" },
          { grupo: "Publicidade", titulo: "Campanha de verão", papel: "Protagonista", onde: "Banco Aurora", ano: ANO + "", link: "youtube.com/exemplo" },
          { grupo: "Teatro", titulo: "A Casa das Janelas", papel: "Dora", onde: "Teatro Municipal", ano: ANO - 3 + "", link: "" }],
        formacao: [{ ano: "2016", curso: "Formação de atores", onde: "Escola de Teatro Exemplo" }, { ano: "2019", curso: "Interpretação para câmera", onde: "Estúdio Cena Viva" }],
        habilidades: "Improviso\nCanto (mezzo)\nDança de salão\nDublagem\nApresentação de eventos\nSotaques regionais",
        links: [{ rot: "Vídeo de apresentação", url: "youtube.com/exemplo" }, { rot: "Cenas e trabalhos", url: "vimeo.com/exemplo" }, { rot: "Book de fotos", url: "drive.google.com/exemplo" }],
        contato: { resp: "Agência Talento Exemplo", cargo: "Agenciamento", tel: "(31) 90000-0010", email: "clara@exemplo.com.br", site: "", insta: "@claramonteiro.atriz", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    vip: function () {
      return base({ marca: "Zeca Prado", slogan: "Humorista · Apresentador · Presença VIP", etiqueta: "PORTFÓLIO", cidade: "Belo Horizonte · MG",
        sobreCurto: "Humorista e apresentador que leva alegria para palcos, telas e campanhas de marcas.",
        sobre: "Radialista há 20 anos, Zeca ganhou o público com personagens próprios nas redes sociais e na TV. Hoje é presença confirmada em eventos, ações de marcas e comerciais.\n\nNo palco ou na frente da câmera, entrega naturalidade, conteúdo para as redes e muito bom humor.",
        servicos: [{ t: "Presença VIP em eventos", d: "Inaugurações, feiras, premiações e eventos corporativos: atrai público, gera conteúdo e valoriza a marca." },
          { t: "Comerciais", d: "Campanhas para TV, redes sociais e mídia impressa, com interpretação natural e entrega no prazo." },
          { t: "Marcas e lojas", d: "Conteúdo digital (fotos, vídeos e stories), divulgação nos perfis e participação em ações promocionais." }],
        numeros: [{ v: "20 anos", r: "de rádio e palco" }, { v: "+150", r: "eventos realizados" }, { v: "300 mil", r: "seguidores nas redes" }],
        experiencia: [{ grupo: "TV e publicidade", titulo: "Programa Domingo Leve", papel: "Quadro de humor", onde: "TV Exemplo", ano: "", link: "youtube.com/exemplo" },
          { grupo: "TV e publicidade", titulo: "Campanha Natal Feliz", papel: "Protagonista", onde: "Loja Exemplo", ano: "", link: "instagram.com/exemplo" },
          { grupo: "Eventos realizados", titulo: "Desfile de Carnaval", papel: "Destaque da comissão de frente", onde: "Belo Horizonte", ano: "", link: "" },
          { grupo: "Eventos realizados", titulo: "Convenção de vendas", papel: "Mestre de cerimônias", onde: "São Paulo", ano: "", link: "youtube.com/exemplo" }],
        links: [{ rot: "Apresentação", url: "youtube.com/exemplo" }, { rot: "Personagens", url: "instagram.com/exemplo" }, { rot: "Vídeos", url: "youtube.com/exemplo" }, { rot: "Fotos", url: "drive.google.com/exemplo" }],
        contato: { resp: "Zeca Prado", cargo: "Contratação direta", tel: "(31) 90000-0020", email: "contato@zecaprado.com.br", site: "", insta: "@zecaprado", tiktok: "@zecaprado", youtube: "@zecaprado", cidade: "Belo Horizonte · MG" } });
    },
    freela: function () {
      return base({ marca: "Rafael Souza", slogan: "Cinegrafista e editor de vídeo freelancer", cidade: "Belo Horizonte · MG",
        sobreCurto: "Câmera, luz e edição para eventos, marcas e produtoras — com equipamento próprio.",
        sobre: "Trabalho como cinegrafista e editor há 9 anos, cobrindo eventos corporativos, shows e campanhas. Chego com o equipamento revisado, combino o roteiro antes e entrego no prazo.\n\nAtendo produtoras que precisam reforçar a equipe e empresas que querem um profissional só para o projeto.",
        servicos: [{ t: "Câmera em eventos", d: "Operação de câmera em palco, entrevistas e bastidores." }, { t: "Edição e cor", d: "Vídeo resumo, reels e versões para redes no mesmo pacote." },
          { t: "Transmissão ao vivo", d: "Operação de câmera ou de corte em transmissões com várias câmeras." }, { t: "Drone", d: "Imagens aéreas com piloto habilitado." }],
        numeros: [{ v: "9 anos", r: "de mercado" }, { v: "+400", r: "eventos filmados" }, { v: "48 h", r: "para o vídeo resumo" }],
        experiencia: [{ grupo: "Trabalhos recentes", titulo: "Congresso de Inovação", papel: "Câmera e edição", onde: "Produtora Exemplo", ano: ANO + "", link: "vimeo.com/exemplo" },
          { grupo: "Trabalhos recentes", titulo: "Festival Exemplo", papel: "Operador de câmera", onde: "Festival Exemplo", ano: ANO + "", link: "" },
          { grupo: "Trabalhos recentes", titulo: "Lançamento de produto", papel: "Direção de fotografia", onde: "Grupo Vértice", ano: ANO - 1 + "", link: "vimeo.com/exemplo" }],
        clientes: "Produtora Exemplo\nBanco Aurora\nGrupo Vértice\nFestival Exemplo\nRede Saúde Viva\nAgência Ponto Alto",
        depoimentos: [{ texto: "O Rafael chega antes, resolve sem fazer barulho e o material sai lindo. É o primeiro que eu chamo.", autor: "Paula Martins", cargo: "Produtora · Produtora Exemplo" }],
        rider: "2 câmeras 4K com lentes de 16 a 200 mm\nEstabilizador (gimbal)\nKit de luz LED com bateria\nMicrofones sem fio (2)\nDrone com piloto habilitado",
        links: [{ rot: "Reel de trabalhos", url: "vimeo.com/exemplo" }, { rot: "Vídeos completos", url: "youtube.com/exemplo" }],
        contato: { resp: "Rafael Souza", cargo: "Cinegrafista e editor", tel: "(31) 90000-0030", email: "rafael@exemplo.com.br", site: "rafaelsouza.com.br", insta: "@rafaelsouza.video", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    musico: function () {
      return base({ marca: "DJ Luna Vale", slogan: "House e música brasileira para pistas que não param.", etiqueta: "PRESS KIT " + ANO, cidade: "Belo Horizonte · MG",
        sobreCurto: "DJ e produtora mineira que mistura house com música brasileira.",
        sobre: "Luna Vale começou tocando em festas de amigos e hoje leva o seu som para casamentos, festivais e eventos de marcas. O repertório junta clássicos da MPB em versões dançantes com o melhor do house atual.\n\nCada apresentação é pensada para o público da noite: ela conversa com o contratante antes, monta a linha do tempo da festa e ajusta o som na hora.",
        numeros: [{ v: "+150", r: "apresentações" }, { v: "35 mil", r: "ouvintes por mês" }, { v: "8", r: "festivais em " + ANO }],
        release: { titulo: "DJ Luna Vale lança set ao vivo gravado no Festival Exemplo", data: "Novembro de " + ANO, texto: "A DJ mineira Luna Vale lança nesta sexta o set gravado ao vivo no Festival Exemplo, com duas horas de house e releituras de música brasileira.\n\nO material sai em vídeo e áudio e marca o início da turnê de verão, que passa por cinco cidades." },
        imprensa: [{ veiculo: "Revista Pista", titulo: "As DJs que estão renovando a noite mineira", data: "Setembro de " + ANO, link: "" }],
        agenda: [{ data: "06/12", titulo: "Festival Exemplo", local: "Belo Horizonte · MG" }, { data: "20/12", titulo: "Réveillon na Praia", local: "Porto Seguro · BA" }, { data: "10/01", titulo: "Verão Sonoro", local: "Florianópolis · SC" }],
        rider: "Mixer de 4 canais\n2 CDJs de última geração com USB\nMonitor de retorno na cabine\nMesa firme de 1,8 m\nCamarim com água e frutas", riderObs: "Passagem de som: 1 hora antes da apresentação.",
        links: [{ rot: "Ouvir os sets", url: "soundcloud.com/exemplo" }, { rot: "Vídeo ao vivo", url: "youtube.com/exemplo" }],
        contato: { resp: "Bruno Assis", cargo: "Agenda e contratação", tel: "(31) 90000-0001", email: "agenda@lunavale.com.br", site: "lunavale.com.br", insta: "@djlunavale", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    },
    criador: function () {
      return base({ marca: "Bia Ramos", slogan: "Criadora de conteúdo · Moda, viagem e bem-estar", etiqueta: "MÍDIA KIT " + ANO, cidade: "São Paulo · SP",
        sobreCurto: "Conteúdo leve e verdadeiro para quem gosta de moda acessível e viagens curtas.",
        sobre: "Bia cria conteúdo há 6 anos e fala com um público jovem, de 18 a 34 anos, que confia nas indicações dela. Trabalha com campanhas, presença em eventos e ensaios para marcas.\n\nCada parceria tem roteiro aprovado antes e relatório de resultados no fim.",
        numeros: [{ v: "180 mil", r: "seguidores no Instagram" }, { v: "95 mil", r: "no TikTok" }, { v: "6,2%", r: "de engajamento médio" }, { v: "72%", r: "público feminino" }, { v: "18–34", r: "faixa principal" }, { v: "SP · RJ · MG", r: "maiores cidades" }],
        perfil: [{ k: "Altura", v: "1,70 m" }, { k: "Manequim", v: "38" }, { k: "Formatos", v: "Reels, stories, TikTok, fotos" }],
        clientes: "Loja Exemplo\nMarca Bem Viver\nHotel Serra Azul\nCosméticos Aurora\nApp Viaje Mais",
        links: [{ rot: "Instagram", url: "instagram.com/exemplo" }, { rot: "TikTok", url: "tiktok.com/@exemplo" }, { rot: "Campanhas", url: "drive.google.com/exemplo" }],
        contato: { resp: "Bia Ramos", cargo: "Parcerias e publicidade", tel: "(11) 90000-0040", email: "parcerias@biaramos.com.br", site: "", insta: "@biaramos", tiktok: "@biaramos", youtube: "", cidade: "São Paulo · SP" } });
    },
    moda: function () {
      return base({ marca: "Luiza Ferraz", slogan: "Modelo · Moda e publicidade", etiqueta: "COMP CARD", cidade: "São Paulo · SP",
        perfil: [{ k: "Altura", v: "1,77 m" }, { k: "Busto", v: "84" }, { k: "Cintura", v: "62" }, { k: "Quadril", v: "90" }, { k: "Manequim", v: "36" }, { k: "Sapato", v: "38" }, { k: "Cabelo", v: "Castanho" }, { k: "Olhos", v: "Verdes" }],
        links: [{ rot: "Book completo", url: "drive.google.com/exemplo" }],
        contato: { resp: "Agência Modelo Exemplo", cargo: "Booking", tel: "(11) 90000-0060", email: "booking@exemplo.com.br", site: "", insta: "@luizaferraz", tiktok: "", youtube: "", cidade: "São Paulo · SP" } });
    },
    palestra: function () {
      return base({ marca: "Marina Duarte", slogan: "Palestrante · Liderança e comunicação em equipes", etiqueta: "PALESTRANTE", cidade: "Curitiba · PR",
        sobreCurto: "Ajuda equipes a conversarem melhor — e a decidirem mais rápido.",
        sobre: "Marina liderou times de atendimento por 15 anos antes de virar consultora. Nas palestras, mistura histórias reais com exercícios rápidos que a plateia faz na hora.\n\nFala para convenções, semanas internas e eventos de RH, presencial ou online.",
        servicos: [{ t: "Conversas que resolvem", d: "Como dar e receber retorno sem desgaste. 50 min + perguntas." }, { t: "Líder de primeira viagem", d: "Os 5 hábitos que mudam a rotina de quem acabou de assumir uma equipe." }, { t: "Equipe que decide", d: "Workshop prático de 3 horas com dinâmicas em grupo." }],
        numeros: [{ v: "+300", r: "palestras" }, { v: "60 mil", r: "pessoas na plateia" }, { v: "4,9", r: "nota média das avaliações" }],
        experiencia: [{ grupo: "Onde já palestrou", titulo: "Convenção Nacional de Vendas", papel: "Palestra de abertura", onde: "Grupo Vértice", ano: ANO + "", link: "youtube.com/exemplo" },
          { grupo: "Onde já palestrou", titulo: "Semana do RH", papel: "Workshop", onde: "Rede Saúde Viva", ano: ANO - 1 + "", link: "" }],
        depoimentos: [{ texto: "A equipe saiu falando da palestra por semanas. Prática, leve e com resultado.", autor: "Ricardo Lemos", cargo: "Diretor de marketing · Grupo Vértice" }],
        links: [{ rot: "Trecho da palestra", url: "youtube.com/exemplo" }, { rot: "Site e agenda", url: "marinaduarte.com.br" }],
        contato: { resp: "Marina Duarte", cargo: "Contratação de palestras", tel: "(41) 90000-0070", email: "contato@marinaduarte.com.br", site: "marinaduarte.com.br", insta: "@marinaduarte", tiktok: "", youtube: "", cidade: "Curitiba · PR" } });
    },
    pro: function () {
      return base({ marca: "Juliana Castro", slogan: "Produtora de eventos freelancer", etiqueta: "APRESENTAÇÃO PROFISSIONAL", cidade: "Belo Horizonte · MG",
        sobreCurto: "Produção e coordenação de eventos corporativos, do briefing à desmontagem.",
        sobre: "Sou produtora freelancer há 8 anos. Coordeno fornecedores, equipe de apoio e cronograma para que o cliente só se preocupe com os convidados.\n\nTrabalho bem sob pressão, falo com todo mundo e gosto de planilha organizada.",
        experiencia: [{ grupo: "Experiência", titulo: "Coordenadora de produção", papel: "Congresso de Inovação (1.200 pessoas)", onde: "Produtora Exemplo", ano: ANO + "", link: "" },
          { grupo: "Experiência", titulo: "Produtora", papel: "Convenções de vendas", onde: "Grupo Vértice", ano: (ANO - 2) + "–" + (ANO - 1), link: "" },
          { grupo: "Experiência", titulo: "Assistente de produção", papel: "Feiras e lançamentos", onde: "Agência Ponto Alto", ano: (ANO - 5) + "–" + (ANO - 3), link: "" }],
        habilidades: "Cronograma e roteiro\nGestão de fornecedores\nCredenciamento\nOrçamento\nEquipe de apoio\nInglês intermediário",
        formacao: [{ ano: "2017", curso: "Gestão de eventos", onde: "Faculdade Exemplo" }, { ano: "2021", curso: "Produção executiva", onde: "Curso livre" }],
        perfil: [{ k: "Disponibilidade", v: "Eventos em todo o Brasil" }, { k: "Habilitação", v: "Carro (B)" }],
        depoimentos: [{ texto: "Organizada, calma e muito clara com a equipe. O evento correu sem nenhum susto.", autor: "Ricardo Lemos", cargo: "Diretor de marketing · Grupo Vértice" }],
        contato: { resp: "Juliana Castro", cargo: "Produtora de eventos", tel: "(31) 90000-0050", email: "juliana@exemplo.com.br", site: "", insta: "", tiktok: "", youtube: "", cidade: "Belo Horizonte · MG" } });
    }
  };
  var MODELOS = [
    { id: "ator", nome: "Ator e atriz", ico: "🎭", para: "Book do artista: perfil, trabalhos, formação, habilidades e vídeo de apresentação.",
      tema: { escuro: true, fundo: "#141414", txt: "#F5F1EA", sub: "#B3ADA4", capa: "foto", caixaAlta: true }, cor: "#E8B54A", cor2: "#C9A227", fonte: "PF", formato: "a4",
      ordem: ["sobre", "perfil", "experiencia", "galeria", "formacao", "habilidades", "links", "contato"], tons: ["#E8B54A", "#C9A227", "#8A1C2B"], ex: "ator", tit: { experiencia: "Trabalhos", perfil: "Ficha" } },
    { id: "vip", nome: "Humorista e presença VIP", ico: "🎤", para: "Apresentador, humorista, influenciador: o que faz, TV, publicidade e eventos com links.",
      tema: { escuro: true, fundo: "#0E0E10", txt: "#FFFFFF", sub: "#B9B9C2", capa: "recorte", caixaAlta: true }, cor: "#FFC531", cor2: "#2F7BFF", fonte: "MO", formato: "rede",
      ordem: ["sobre", "servicos", "numeros", "galeria", "experiencia", "links", "contato"], tons: ["#FFC531", "#2F7BFF", "#FF4F6D"], ex: "vip", tit: { experiencia: "TV, publicidade e eventos", sobre: "Quem sou eu?" }, servFotos: true },
    { id: "freela", nome: "Freelancer audiovisual", ico: "🎥", para: "Cinegrafista, editor, fotógrafo, técnico: serviços, trabalhos, equipamento e reel.",
      tema: { escuro: false, fundo: "#FFFFFF", txt: "#1D222B", sub: "#5B6472", capa: "dividida", caixaAlta: true }, cor: "#1F4E8C", cor2: "#E8B54A", fonte: "MO", formato: "a4",
      ordem: ["sobre", "servicos", "numeros", "experiencia", "galeria", "clientes", "depoimentos", "rider", "links", "contato"], tons: ["#4C8DFF", "#E8B54A", "#22C7D6"], ex: "freela", tit: { rider: "Equipamento próprio" }, servFotos: true },
    { id: "musico", nome: "Músico e DJ (EPK)", ico: "🎧", para: "Bio, release, agenda de shows, imprensa, rider técnico e links para ouvir.",
      tema: { escuro: true, fundo: "#111111", txt: "#FFFFFF", sub: "#B9B9B9", capa: "foto", caixaAlta: true }, cor: "#FF4F6D", cor2: "#FFB547", fonte: "MO", formato: "a4",
      ordem: ["sobre", "release", "galeria", "numeros", "agenda", "imprensa", "rider", "links", "contato"], tons: ["#FF4F6D", "#B36BFF", "#FFB547"], ex: "musico", tit: { sobre: "Bio" } },
    { id: "criador", nome: "Modelo e criador de conteúdo", ico: "📱", para: "Mídia kit: público, números das redes, marcas parceiras e fotos.",
      tema: { escuro: false, fundo: "#FFF8F5", txt: "#2A1A1F", sub: "#7A6268", capa: "moldura", caixaAlta: false }, cor: "#D9466F", cor2: "#F2A65A", fonte: "PF", formato: "rede",
      ordem: ["sobre", "numeros", "perfil", "galeria", "clientes", "links", "contato"], tons: ["#D9466F", "#F2A65A", "#B36BFF"], ex: "criador", tit: { numeros: "Público e números", clientes: "Marcas parceiras" } },
    { id: "moda", nome: "Comp card de modelo", ico: "📸", para: "Cartão A5 das agências: foto grande, 4 fotos, medidas e contato do booking.",
      tema: { escuro: true, fundo: "#101010", txt: "#F4F1EC", sub: "#A9A39B", capa: "compcard", caixaAlta: true }, cor: "#D8C3A5", cor2: "#FFFFFF", fonte: "PF", formato: "a5",
      ordem: ["galeria", "perfil", "links", "contato"], tons: ["#D8C3A5", "#B36BFF", "#F2A65A"], ex: "moda", tit: { galeria: "Fotos", perfil: "Medidas" } },
    { id: "palestra", nome: "Palestrante", ico: "🎙", para: "Folha de palestrante: temas das palestras, onde já falou, recomendações e vídeo.",
      tema: { escuro: false, fundo: "#F6F8FB", txt: "#0E1B2E", sub: "#56657A", capa: "recorte", caixaAlta: true }, cor: "#1C6BFF", cor2: "#FFB547", fonte: "MO", formato: "a4",
      ordem: ["sobre", "servicos", "numeros", "experiencia", "depoimentos", "links", "contato"], tons: ["#1C6BFF", "#FFB547", "#22C7D6"], ex: "palestra", tit: { servicos: "Palestras", experiencia: "Onde já palestrou" } },
    { id: "pro", nome: "Profissional e colaborador", ico: "🧑‍💼", para: "Currículo visual para produtor, técnico, recepção, MC… experiência, habilidades e formação.",
      tema: { escuro: false, fundo: "#FFFFFF", txt: "#111111", sub: "#6B6B6B", capa: "tipografica", caixaAlta: true }, cor: "#111111", cor2: "#E8B54A", fonte: "Roboto", formato: "a4",
      ordem: ["sobre", "experiencia", "habilidades", "formacao", "perfil", "depoimentos", "contato"], tons: ["#E8B54A", "#4C8DFF", "#22C7D6"], ex: "pro", tit: { sobre: "Resumo profissional", experiencia: "Experiência" } }
  ];
  function modeloDe(id) { return MODELOS.filter(function (m) { return m.id === id; })[0] || MODELOS[0]; }
  function imgsExemplo(mod) {
    var s = mod.id.length * 3;
    return { logo: "", capa: retratoExemplo(s, mod.tons, false), retrato: retratoExemplo(s + 1, mod.tons, true),
      fotos: [fotoExemplo(s + 2, mod.tons), retratoExemplo(s + 3, mod.tons.slice(1).concat(mod.tons.slice(0, 1)), false), fotoExemplo(s + 4, mod.tons.slice(2).concat(mod.tons.slice(0, 2))), retratoExemplo(s + 5, mod.tons.slice(2).concat(mod.tons.slice(0, 2)), false)] };
  }
  function kitNovo(modId) {
    var mod = modeloDe(modId), d = EX[mod.ex]();
    return { id: uid(), nome: "Apresentação — " + d.marca, modelo: mod.id, cor: mod.cor, cor2: mod.cor2, fonte: mod.fonte, formato: mod.formato, servFotos: !!mod.servFotos, exemplo: true,
      ordem: mod.ordem.concat(TODAS.filter(function (x) { return mod.ordem.indexOf(x) < 0; })), ocultas: TODAS.filter(function (x) { return mod.ordem.indexOf(x) < 0; }), tit: clone(mod.tit || {}), d: d,
      criado: new Date().toISOString(), atualizado: new Date().toISOString() };
  }

  /* ================= CORES ================= */
  function hexRgb(h) { h = String(h || "#000").replace("#", ""); if (h.length === 3) h = h.replace(/./g, "$&$&"); var n = parseInt(h, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgbHex(a) { return "#" + a.map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"); }).join(""); }
  function misturar(a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex([0, 1, 2].map(function (i) { return x[i] + (y[i] - x[i]) * t; })); }
  function lum(h) { var c = hexRgb(h).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function sobre(h) { return lum(h) > 0.45 ? "#111111" : "#FFFFFF"; }
  function contraste(a, b) { var l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }
  /* cor de destaque legível sobre o fundo da página (cor do cliente muito clara num fundo branco vira um tom mais escuro) */
  function destaqueLegivel(cor, fundo) { var c = cor, i = 0; while (contraste(c, fundo) < 3 && i < 8) { c = misturar(c, lum(fundo) > 0.5 ? "#000000" : "#FFFFFF", 0.18); i++; } return c; }

  /* ================= O MODELO (uma fonte só para prévia, PDF e Word) ================= */
  function linhas(t) { return String(t || "").split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function paragrafos(t) { return String(t || "").split(/\n\s*\n/).map(function (s) { return s.replace(/\s*\n\s*/g, " ").trim(); }).filter(Boolean); }
  function cheio(o) { return Object.keys(o).some(function (k) { return String(o[k] || "").trim(); }); }
  function linkDe(t, tipo) {
    t = String(t || "").trim(); if (!t) return "";
    if (tipo === "email") return /@/.test(t) ? "mailto:" + t : "";
    if (tipo === "tel") { var n = t.replace(/\D/g, ""); if (n.length >= 10) return "https://wa.me/" + (n.length <= 11 ? "55" + n : n); return ""; }
    if (tipo === "insta") { var u = t.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""); return u ? "https://instagram.com/" + u : ""; }
    if (tipo === "tiktok") { var u2 = t.replace(/^https?:\/\/(www\.)?tiktok\.com\//, "").replace(/^@?/, "@").replace(/\/.*$/, ""); return u2.length > 1 ? "https://www.tiktok.com/" + u2 : ""; }
    if (tipo === "youtube") { if (/^https?:\/\//.test(t) || /youtube\.com|youtu\.be/.test(t)) return /^https?:\/\//.test(t) ? t : "https://" + t; var u3 = t.replace(/^@?/, "@"); return u3.length > 1 ? "https://www.youtube.com/" + u3 : ""; }
    return /^https?:\/\//.test(t) ? t : /\./.test(t) ? "https://" + t : "";
  }
  function titulo(kit, id) { var t = kit.tit && kit.tit[id]; return t && String(t).trim() ? String(t).trim() : SECOES[id].nome; }
  var GEOM = { a4: { W: 595.28, H: 841.89, MX: 50 }, rede: { W: 595.28, H: 744.1, MX: 46 }, a5: { W: 419.53, H: 595.28, MX: 30 } };
  function geom(f) { var g = GEOM[f] || GEOM.a4; return { W: g.W, H: g.H, MX: g.MX, CW: g.W - 2 * g.MX }; }
  async function qrUrl(txt) {
    try { await carregar("qr"); var q = qrcode(0, "M"); q.addData(txt); q.make(); var n = q.getModuleCount(), cel = 6, mg = 2 * cel, c = document.createElement("canvas"); c.width = c.height = n * cel + 2 * mg;
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = "#000";
      for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) x.fillRect(mg + k * cel, mg + r * cel, cel, cel);
      return c.toDataURL("image/png"); } catch (e) { return ""; }
  }
  async function modelo(kit, imgs, op) {
    op = op || {}; imgs = imgs || imgsVazias();
    var mod = modeloDe(kit.modelo), tm = Object.assign({}, mod.tema), d = kit.d || {}, alta = !!op.alta, f = alta ? 2 : 1.15;
    var formato = mod.tema.capa === "compcard" ? "a5" : (GEOM[kit.formato] ? kit.formato : mod.formato), G = geom(formato);
    var cor = kit.cor || mod.cor, cor2 = kit.cor2 || mod.cor2;
    tm.cor = destaqueLegivel(cor, tm.fundo); tm.corPura = cor; tm.cor2 = cor2; tm.fTit = FONTES_TIT[kit.fonte] ? kit.fonte : mod.fonte;
    tm.cartao = tm.escuro ? misturar(tm.fundo, "#FFFFFF", 0.07) : misturar(tm.fundo, tm.corPura, 0.07);
    tm.linha = tm.escuro ? misturar(tm.fundo, "#FFFFFF", 0.16) : misturar(tm.fundo, "#000000", 0.12);
    var m = { kit: kit, tema: tm, formato: formato, G: G, marca: d.marca || "Seu nome", slogan: d.slogan || "", etiqueta: d.etiqueta || "APRESENTAÇÃO", cidade: d.cidade || "", secoes: [] };
    m.logo = imgs.logo ? await reduzir(imgs.logo, alta ? 1400 : 700) : "";
    m.logoProp = m.logo ? await proporcao(m.logo) : 1;
    m.retrato = imgs.retrato ? await reduzir(imgs.retrato, alta ? 1800 : 900) : "";
    m.retratoProp = m.retrato ? await proporcao(m.retrato) : 0.8;
    var cap = tm.capa, W = G.W, H = G.H;
    var capaSrc = imgs.capa || imgs.retrato || (imgs.fotos || [])[0] || "";
    if (capaSrc) {
      if (cap === "foto") m.capaImg = await recortar(capaSrc, W * f, H * f, { escurecer: 0.82 });
      else if (cap === "compcard") m.capaImg = await recortar(capaSrc, W * f, H * f, { escurecer: 0.55 });
      else if (cap === "dividida") m.capaImg = await recortar(capaSrc, 250 * f, H * f);
      else if (cap === "moldura") m.capaImg = await recortar(capaSrc, 420 * f, 300 * f);
      else if (cap === "recorte") m.capaImg = imgs.retrato ? "" : await recortar(capaSrc, W * 0.5 * f, H * f, { escurecer: 0.3, dir: "esq" });
      else m.capaImg = await recortar(capaSrc, G.CW * f, 250 * f);
    }
    var c = d.contato || {};
    m.contato = c;
    var vis = (kit.ordem || TODAS).filter(function (id) { return SECOES[id] && (kit.ocultas || []).indexOf(id) < 0; });
    TODAS.forEach(function (id) { if ((kit.ordem || []).indexOf(id) < 0 && (kit.ocultas || []).indexOf(id) < 0) vis.push(id); });
    var fotos = (imgs.fotos || []).filter(Boolean);
    for (var i = 0; i < vis.length; i++) {
      var id = vis[i], s = { id: id, tit: titulo(kit, id) };
      if (id === "sobre") { s.curto = (d.sobreCurto || "").trim(); s.pars = paragrafos(d.sobre); if (!s.curto && !s.pars.length) continue; s.retrato = cap === "recorte" ? "" : m.retrato; }
      else if (id === "numeros") { s.itens = (d.numeros || []).filter(function (x) { return x && (String(x.v || "").trim() || String(x.r || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "servicos") {
        s.itens = (d.servicos || []).filter(function (x) { return x && (String(x.t || "").trim() || String(x.d || "").trim()); }); if (!s.itens.length) continue;
        if (kit.servFotos && fotos.length) { s.fotos = []; for (var a = 0; a < s.itens.length; a++) s.fotos.push(await recortar(fotos[a % fotos.length], 240 * f, 140 * f)); }
      }
      else if (id === "perfil") { s.itens = (d.perfil || []).filter(function (x) { return x && (String(x.k || "").trim() || String(x.v || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "experiencia") {
        var ex = (d.experiencia || []).filter(function (x) { return x && (String(x.titulo || "").trim() || String(x.papel || "").trim()); }); if (!ex.length) continue;
        s.grupos = []; ex.forEach(function (x) { var g = String(x.grupo || "").trim(), ult = s.grupos[s.grupos.length - 1]; if (!ult || ult.nome !== g) s.grupos.push({ nome: g, itens: [x] }); else ult.itens.push(x); });
      }
      else if (id === "formacao") { s.itens = (d.formacao || []).filter(function (x) { return x && (String(x.curso || "").trim() || String(x.onde || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "habilidades") { s.itens = linhas(d.habilidades); if (!s.itens.length) continue; }
      else if (id === "links") {
        s.itens = (d.links || []).filter(function (x) { return x && linkDe(x.url, "site"); }); if (!s.itens.length) continue;
        for (var q = 0; q < s.itens.length; q++) { s.itens[q] = Object.assign({}, s.itens[q], { href: linkDe(s.itens[q].url, "site") }); s.itens[q].qr = await qrUrl(s.itens[q].href); }
      }
      else if (id === "clientes") { s.itens = linhas(d.clientes); if (!s.itens.length) continue; }
      else if (id === "depoimentos") { s.itens = (d.depoimentos || []).filter(function (x) { return x && String(x.texto || "").trim(); }); if (!s.itens.length) continue; }
      else if (id === "release") { var r = d.release || {}; if (!String(r.titulo || "").trim() && !String(r.texto || "").trim()) continue; s.titulo = (r.titulo || "").trim(); s.data = (r.data || "").trim(); s.pars = paragrafos(r.texto); }
      else if (id === "imprensa") { s.itens = (d.imprensa || []).filter(function (x) { return x && (String(x.titulo || "").trim() || String(x.veiculo || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "agenda") { s.itens = (d.agenda || []).filter(function (x) { return x && (String(x.titulo || "").trim() || String(x.data || "").trim()); }); if (!s.itens.length) continue; }
      else if (id === "rider") { s.itens = linhas(d.rider); s.obs = (d.riderObs || "").trim(); if (!s.itens.length && !s.obs) continue; }
      else if (id === "galeria") {
        var fs = fotos.slice(0, 7); if (!fs.length) continue;
        if (cap === "compcard") { s.peq = []; for (var j0 = 0; j0 < Math.min(4, fs.length); j0++) s.peq.push(await recortar(fs[j0], 180 * f, 225 * f)); }
        else { s.grande = await recortar(fs[0], G.CW * f, G.CW * 0.525 * f); s.peq = []; for (var j = 1; j < fs.length; j++) s.peq.push(await recortar(fs[j], 160 * f, 110 * f)); }
        s.legenda = (d.galeriaLegenda || "").trim();
      }
      else if (id === "contato") { if (!cheio(c)) continue; }
      m.secoes.push(s);
    }
    m.linhaContato = [c.email, c.tel, c.insta || c.site].filter(function (x) { return String(x || "").trim(); }).join("   ·   ");
    return m;
  }

  /* ================= PDF (pdfMake) ================= */
  function semGap(fundo, gap) { return { hLineWidth: function () { return gap; }, vLineWidth: function () { return gap; }, hLineColor: function () { return fundo; }, vLineColor: function () { return fundo; }, paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } }; }
  function emGrupos(l, n) { var o = []; for (var i = 0; i < l.length; i += n) o.push(l.slice(i, i + n)); return o; }
  function defPdf(m, op) {
    op = op || {};
    var G = m.G || geom("a4"), W = G.W, H = G.H, MX = G.MX, CW = G.CW, k = W / 595.28, z = function (n) { return Math.round(n * k * 10) / 10; };
    var t = m.tema, fT = t.fTit, cont = [], tituloCaixa = function (s) { return t.caixaAlta ? String(s).toUpperCase() : s; };
    var corSobreCor = sobre(t.corPura), d = (m.kit && m.kit.d) || {};
    /* ---------- CAPA (página 1) ---------- */
    var capaFundo = [], capa = [];
    var abs = function (x, y) { return { absolutePosition: { x: x, y: y } }; };
    var ret = function (x, y, w, h, cor) { return Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: w, h: h, color: cor }] }, abs(x, y)); };
    var logoNo = function (x, y, larg, alt) { if (!m.logo) return null; var w = larg, h = larg / m.logoProp; if (h > alt) { h = alt; w = alt * m.logoProp; } return Object.assign({ image: m.logo, width: w, height: h }, abs(x, y)); };
    var etiq = { text: tituloCaixa(m.etiqueta), fontSize: z(9), bold: true, characterSpacing: 2.5 * k };
    var tamNome = function (base, longo) { return z(m.marca.length > longo ? base * 0.74 : base); };
    var fixos = (d.perfil || []).filter(function (x) { return x && String(x.v || "").trim(); }).slice(0, 5);
    if (t.capa === "foto") {
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, t.fundo));
      capaFundo.push(ret(0, 0, W, 6, t.corPura));
      var lg = logoNo(MX, 56, 180, 64); if (lg) capa.push(lg);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(50, 22), color: "#FFFFFF", lineHeight: 1.02, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(15), color: "#E9E6E0", margin: [0, 12, 0, 0], lineHeight: 1.25 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 60, h: 3, color: t.corPura }], margin: [0, 20, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: "#CFCAC2", characterSpacing: 1 }], absolutePosition: { x: MX, y: H - 330 * (H / 842) }, width: CW });
    } else if (t.capa === "compcard") {   /* comp card de modelo: foto inteira, nome e medidas embaixo (A5) */
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: W, height: H }, abs(0, 0)) : ret(0, 0, W, H, t.fundo));
      capa.push({ stack: [{ text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(34, 16), color: "#FFFFFF", characterSpacing: 3 * k, alignment: "center" },
        { canvas: [{ type: "rect", x: (CW - 40) / 2, y: 0, w: 40, h: 2, color: t.corPura }], margin: [0, 10, 0, 10] },
        { text: fixos.map(function (x) { return (x.k ? x.k + " " : "") + x.v; }).join("   ·   ") || m.slogan, fontSize: z(10.5), color: "#EDE8E1", alignment: "center", lineHeight: 1.4 }], absolutePosition: { x: MX, y: H - 118 }, width: CW });
    } else if (t.capa === "recorte") {   /* pessoa recortada em cima de um fundo forte (como um portfólio de apresentador) */
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: W * 0.38, r2: W * 0.38, color: t.corPura }] }, abs(W * 0.72, H * 0.64)));
      capaFundo.push(Object.assign({ canvas: [{ type: "ellipse", x: 0, y: 0, r1: W * 0.16, r2: W * 0.16, color: t.cor2 }] }, abs(W * 0.96, H * 0.08)));
      if (m.retrato) { var rh = Math.min(H * 0.84, (W * 0.58) / m.retratoProp), rw = rh * m.retratoProp; capaFundo.push(Object.assign({ image: m.retrato, width: rw, height: rh }, abs(W - rw - W * 0.02, H - rh))); }
      else if (m.capaImg) capaFundo.push(Object.assign({ image: m.capaImg, width: W * 0.5, height: H }, abs(W * 0.5, 0)));
      var lg5 = logoNo(MX, 50, 150, 54); if (lg5) capa.push(lg5);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor2 }), { text: m.marca.toUpperCase(), font: fT, bold: true, fontSize: tamNome(44, 12), color: t.txt, lineHeight: 0.98, margin: [0, 10, 0, 0] },
        { text: m.slogan, fontSize: z(13), color: t.cor, bold: true, margin: [0, 14, 0, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 54, h: 4, color: t.cor2 }], margin: [0, 20, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: t.sub, characterSpacing: 1 }], absolutePosition: { x: MX, y: H * 0.11 }, width: W * 0.44 });
    } else if (t.capa === "dividida") {
      var bp = W * 0.42, wb = W - bp;
      capaFundo.push(ret(0, 0, wb, H, t.corPura));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: bp, height: H }, abs(wb, 0)) : ret(wb, 0, bp, H, misturar(t.corPura, "#000000", 0.35)));
      capaFundo.push(ret(wb - 8, 0, 8, H, t.cor2));
      var lg2 = logoNo(MX, 60, 170, 70); if (lg2) capa.push(lg2);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor2 }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(40, 16), color: corSobreCor, lineHeight: 1.05, margin: [0, 12, 0, 0] },
        { text: m.slogan, fontSize: z(14), color: corSobreCor, margin: [0, 14, 0, 0], lineHeight: 1.3 },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 54, h: 3, color: t.cor2 }], margin: [0, 22, 0, 8] },
        { text: m.cidade, fontSize: z(9.5), color: corSobreCor, characterSpacing: 1 }], absolutePosition: { x: MX, y: H * 0.39 }, width: wb - MX - 34 });
    } else if (t.capa === "moldura") {
      capaFundo.push(ret(0, 0, W, H, t.fundo));
      var lg3 = logoNo((W - 130) / 2, 64, 130, 52); if (lg3) capa.push(lg3);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor, alignment: "center" }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(44, 22), color: t.txt, alignment: "center", margin: [0, 10, 0, 0], lineHeight: 1.05 },
        { text: m.slogan, font: "PF", fontSize: z(14), color: t.sub, alignment: "center", margin: [30, 10, 30, 0], lineHeight: 1.3 }], absolutePosition: { x: MX, y: 140 }, width: CW });
      var fx = (W - 420) / 2, fy = H * 0.45;
      capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: 440, h: 320, color: "#FFFFFF", lineColor: misturar(t.fundo, "#000000", 0.14), lineWidth: 0.8 }] }, abs(fx - 10, fy - 10)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: 420, height: 300 }, abs(fx, fy)) : ret(fx, fy, 420, 300, t.cartao));
      capa.push({ stack: [{ canvas: [{ type: "line", x1: CW / 2 - 30, y1: 0, x2: CW / 2 + 30, y2: 0, lineWidth: 1, lineColor: t.cor }], margin: [0, 0, 0, 8] }, { text: m.cidade, fontSize: 9.5, color: t.sub, alignment: "center", characterSpacing: 1.5 }], absolutePosition: { x: MX, y: H - 80 }, width: CW });
    } else {   /* tipográfica */
      var fh = Math.min(250, H * 0.3);
      capaFundo.push(Object.assign({ canvas: [{ type: "rect", x: 0, y: 0, w: W, h: H, color: t.fundo }, { type: "rect", x: 0, y: 0, w: W, h: 10, color: t.corPura }] }, abs(0, 0)));
      capaFundo.push(m.capaImg ? Object.assign({ image: m.capaImg, width: CW, height: fh }, abs(MX, H - fh - 70)) : ret(MX, H - fh - 70, CW, fh, t.cartao));
      capaFundo.push(ret(MX, H - 64, 90, 6, t.cor2));
      var lg4 = logoNo(MX, 64, 160, 60); if (lg4) capa.push(lg4);
      capa.push({ stack: [Object.assign({}, etiq, { color: t.cor }), { text: m.marca, font: fT, bold: true, fontSize: tamNome(54, 20), color: t.txt, lineHeight: 1, margin: [0, 12, 0, 0] },
        { text: m.slogan, fontSize: z(15), color: t.sub, margin: [0, 16, 0, 0], lineHeight: 1.3 }], absolutePosition: { x: MX, y: 180 }, width: CW - 30 });
      capa.push(Object.assign({ text: m.cidade, fontSize: 9.5, color: t.sub, characterSpacing: 1.5 }, abs(MX + 104, H - 66)));
    }
    /* 25/11: a capa inteira vai no FUNDO da página 1 (texto posicionado no conteúdo escapava para a página 2) e cada pilha ganha largura fixa */
    capaFundo = capaFundo.concat(capa.map(function (n) { return n.stack && n.width ? { columns: [{ width: n.width, stack: n.stack }], absolutePosition: n.absolutePosition } : n; }));
    cont.push({ text: " ", fontSize: 1, pageBreak: op.soCapa ? undefined : "after" });
    if (op.soCapa) return montar(cont);

    /* ---------- SEÇÕES ---------- */
    var cabSec = function (s, n) {
      return [{ text: [{ text: String(n).padStart(2, "0") + "   ", color: t.cor }, { text: tituloCaixa(s.tit), color: t.txt }], font: fT, bold: true, fontSize: z(t.caixaAlta ? 17 : 22), characterSpacing: t.caixaAlta ? k : 0, margin: [0, n === 1 ? 0 : z(26), 0, 0] },
        { canvas: [{ type: "rect", x: 0, y: 0, w: 42 * k, h: 3, color: t.corPura }], margin: [0, z(8), 0, z(14)] }];
    };
    var cartao = function (pilha, pad) { return { table: { widths: ["*"], body: [[{ stack: pilha, margin: pad || [14, 12, 14, 12], fillColor: t.cartao }]] }, layout: semGap(t.fundo, 0), unbreakable: true }; };
    /* grade = uma tabela por LINHA (a página pode virar entre as linhas, e o título da seção vai junto com a primeira) */
    var grade = function (cel, n, gap) {
      var g = gap == null ? 8 : gap, ws = []; for (var i = 0; i < n; i++) ws.push("*");
      return emGrupos(cel, n).map(function (r) {
        while (r.length < n) r.push({ text: "", fillColor: t.fundo });
        return { table: { widths: ws, body: [r], dontBreakRows: true }, margin: [0, 0, 0, g], unbreakable: true,
          layout: { hLineWidth: function () { return 0; }, vLineWidth: function (i, no) { return i === 0 || i === no.table.widths.length ? 0 : g; }, vLineColor: function () { return t.fundo; },
            paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }, paddingTop: function () { return 0; }, paddingBottom: function () { return 0; } } };
      });
    };
    var secao = function (h, blocos) {   /* título + 1º bloco nunca se separam (título órfão no pé da página) */
      blocos = blocos.filter(Boolean);
      cont.push({ stack: h.concat(blocos.slice(0, 1)), unbreakable: true });
      cont = cont.concat(blocos.slice(1));
    };
    var linhaFina = function () { return { canvas: [{ type: "line", x1: 0, y1: 0, x2: CW, y2: 0, lineWidth: 0.6, lineColor: t.linha }], margin: [0, z(9), 0, z(9)] }; };
    var nCol = function (a4) { return k < 0.8 ? Math.max(1, a4 - 1) : a4; };
    m.secoes.forEach(function (s, i) {
      var n = i + 1, h = cabSec(s, n), b = [];
      if (s.id === "sobre") {
        var tx = [];
        if (s.curto) tx.push({ table: { widths: [3, "*"], body: [[{ text: "", fillColor: t.corPura }, { text: s.curto, font: fT === "PF" ? "PF" : "Roboto", bold: fT !== "PF", fontSize: z(14.5), lineHeight: 1.3, color: t.txt, margin: [14, 1, 0, 1] }]] }, layout: semGap(t.fundo, 0), margin: [0, 0, 0, 14] });
        var ps = s.pars.map(function (p) { return { text: p, margin: [0, 0, 0, 9] }; });
        if (s.retrato && k >= 0.8) {   /* "Quem sou eu?" com a foto recortada ao lado */
          var fw = CW * 0.36, fhh = Math.min(fw / m.retratoProp, 300);
          b.push({ columns: [{ width: fw, stack: [{ image: s.retrato, fit: [fw, fhh], alignment: "center" }, { canvas: [{ type: "rect", x: 0, y: 0, w: fw, h: 4, color: t.corPura }] }] }, { width: "*", stack: tx.concat(ps) }], columnGap: 22, unbreakable: true });
        } else if (fT === "PF" && s.pars.join(" ").length > 650 && k >= 0.8) b = tx.concat([{ columns: [{ stack: ps.slice(0, Math.ceil(ps.length / 2)) }, { stack: ps.slice(Math.ceil(ps.length / 2)) }], columnGap: 22 }]);
        else b = tx.concat(ps);
      } else if (s.id === "perfil") {
        b = grade(s.itens.map(function (x) { return { stack: [{ text: String(x.k || "").toUpperCase(), fontSize: z(8), bold: true, color: t.cor, characterSpacing: 1 }, { text: String(x.v || ""), fontSize: z(11.5), bold: true, color: t.txt, margin: [0, 3, 0, 0] }], margin: [12, 10, 12, 10], fillColor: t.cartao }; }), nCol(3), 6);
      } else if (s.id === "numeros") {
        b = grade(s.itens.map(function (x) { return { stack: [{ text: String(x.v || ""), font: fT, bold: true, fontSize: z(25), color: t.cor }, { text: String(x.r || ""), fontSize: z(9.5), color: t.sub, margin: [0, 3, 0, 0] }], margin: [14, 14, 14, 14], fillColor: t.cartao }; }), nCol(3));
      } else if (s.id === "servicos") {
        var nc = nCol(s.fotos ? 3 : 2), cw0 = (CW - 8 * (nc - 1)) / nc;
        b = grade(s.itens.map(function (x, j) {
          var pil = [];
          if (s.fotos) pil.push({ image: s.fotos[j], width: cw0, height: cw0 * 140 / 240 });
          pil.push({ stack: [{ canvas: [{ type: "rect", x: 0, y: 0, w: 18, h: 3, color: t.corPura }], margin: [0, 0, 0, 8] }, { text: String(x.t || ""), bold: true, fontSize: z(12), color: t.txt }, { text: String(x.d || ""), fontSize: z(9.5), color: t.sub, margin: [0, 4, 0, 0], lineHeight: 1.3 }], margin: [12, 12, 12, 12] });
          return { stack: pil, fillColor: t.cartao };
        }), nc);
      } else if (s.id === "experiencia") {
        s.grupos.forEach(function (g) {
          var rot = g.nome && g.nome.toLowerCase() !== String(s.tit).toLowerCase() ? { text: tituloCaixa(g.nome), bold: true, fontSize: z(10), color: t.cor, characterSpacing: k, margin: [0, b.length ? z(10) : 0, 0, z(6)] } : null;
          g.itens.forEach(function (x, gi) {
            var lk = linkDe(x.link, "site"), sub2 = [x.papel, x.onde].map(function (v) { return String(v || "").trim(); }).filter(Boolean).join("  ·  ");
            var col = [{ text: String(x.ano || ""), width: z(52), bold: true, fontSize: z(10), color: t.cor, margin: [0, 2, 0, 0] },
              { width: "*", stack: [{ text: String(x.titulo || ""), bold: true, fontSize: z(11.5), color: t.txt }].concat(sub2 ? [{ text: sub2, fontSize: z(9.5), color: t.sub, margin: [0, 2, 0, 0] }] : []) }];
            if (!String(x.ano || "").trim()) col.shift();
            if (lk) col.push({ width: z(62), table: { body: [[{ text: "VER  ↗", bold: true, fontSize: z(8), color: sobre(t.corPura), fillColor: t.corPura, alignment: "center", margin: [6, 4, 6, 4], link: lk }]] }, layout: semGap(t.fundo, 0) });
            b.push({ stack: (gi === 0 && rot ? [rot] : []).concat([{ columns: col, columnGap: 10 }, linhaFina()]), unbreakable: true });   /* rótulo do grupo nunca fica sozinho no pé da página */
          });
        });
      } else if (s.id === "formacao") {
        b = s.itens.map(function (x) {
          return { stack: [{ columns: [{ text: String(x.ano || ""), width: z(52), bold: true, fontSize: z(10), color: t.cor }, { width: "*", stack: [{ text: String(x.curso || ""), bold: true, fontSize: z(11), color: t.txt }, { text: String(x.onde || ""), fontSize: z(9.5), color: t.sub }] }], columnGap: 10 }, linhaFina()], unbreakable: true };
        });
      } else if (s.id === "habilidades") {
        b = grade(s.itens.map(function (x) { return { text: x, bold: true, fontSize: z(10), color: t.txt, alignment: "center", margin: [8, 9, 8, 9], fillColor: t.cartao }; }), nCol(3), 6);
      } else if (s.id === "links") {   /* botões do portfólio, clicáveis no PDF + QR para quem imprimiu */
        var qw = z(54);
        b = grade(s.itens.map(function (x) {
          var txt = { width: "*", stack: [{ text: String(x.rot || "Link").toUpperCase(), bold: true, fontSize: z(11), color: t.txt, link: x.href }, { text: x.href.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40), fontSize: z(8.5), color: t.cor, margin: [0, 3, 0, 0], link: x.href }, { text: "TOQUE PARA ABRIR  ↗", fontSize: z(7.5), bold: true, color: t.sub, margin: [0, 6, 0, 0], link: x.href }] };
          return { columns: x.qr ? [txt, { image: x.qr, width: qw, height: qw, link: x.href }] : [txt], columnGap: 8, margin: [12, 12, 12, 12], fillColor: t.cartao };
        }), nCol(2));
      } else if (s.id === "galeria") {
        if (!s.grande) b = grade(s.peq.map(function (u) { var lw = (CW - 8) / 2; return { image: u, width: lw, height: lw * 225 / 180 }; }), 2);
        else {
          var gal = [{ image: s.grande, width: CW, height: CW * 0.525, margin: [0, 0, 0, 8] }];   /* foto grande e as pequenas ficam juntas */
          if (s.peq.length) { var lw3 = (CW - 16) / 3; gal = gal.concat(grade(s.peq.map(function (u) { return { image: u, width: lw3, height: lw3 * 110 / 160 }; }), 3)); }
          b.push(gal[0]); if (gal.length > 1) b.push({ stack: gal.slice(1), unbreakable: true });
        }
        if (s.legenda) b.push({ text: s.legenda, fontSize: z(9), color: t.sub, italics: true });
      } else if (s.id === "clientes") {
        b = grade(s.itens.map(function (x) { return { text: x, bold: true, fontSize: z(10), color: t.txt, alignment: "center", margin: [8, 13, 8, 13], fillColor: t.cartao }; }), nCol(3));
      } else if (s.id === "depoimentos") {
        b = s.itens.map(function (x) {
          return Object.assign(cartao([{ text: "“", font: "PF", bold: true, fontSize: 44, color: t.cor, lineHeight: 0.62 }, { text: String(x.texto || ""), italics: true, fontSize: z(11.5), lineHeight: 1.4, color: t.txt },
            { text: String(x.autor || ""), bold: true, fontSize: z(10), color: t.txt, margin: [0, 10, 0, 0] }, { text: String(x.cargo || ""), fontSize: z(9), color: t.sub }], [18, 14, 18, 14]), { margin: [0, 0, 0, 10] });
        });
      } else if (s.id === "release") {
        var cab = []; if (s.titulo) cab.push({ text: s.titulo, font: fT, bold: true, fontSize: z(16), lineHeight: 1.2, color: t.txt, margin: [0, 0, 0, 4] });
        if (s.data) cab.push({ text: s.data, fontSize: 9, color: t.cor, bold: true, characterSpacing: 1, margin: [0, 0, 0, 10] });
        var pr = s.pars.map(function (p) { return { text: p, margin: [0, 0, 0, 9] }; });
        b.push({ stack: cab.concat(pr.slice(0, 1)) }); b = b.concat(pr.slice(1));
      } else if (s.id === "imprensa") {
        b = s.itens.map(function (x) {
          var lk = linkDe(x.link, "site");
          return { stack: [{ text: String(x.veiculo || "").toUpperCase(), bold: true, fontSize: 8.5, color: t.cor, characterSpacing: 1.2 }, { text: String(x.titulo || ""), bold: true, fontSize: z(12), color: t.txt, margin: [0, 2, 0, 2], link: lk || undefined },
            { text: [x.data || "", lk ? (x.data ? "   ·   " : "") + String(x.link).replace(/^https?:\/\//, "") : ""].join(""), fontSize: 8.5, color: t.sub, link: lk || undefined }, linhaFina()], unbreakable: true };
        });
      } else if (s.id === "agenda") {
        b = s.itens.map(function (x) {
          return { table: { widths: [z(80), "*", z(140)], body: [[{ text: String(x.data || ""), bold: true, color: t.cor, fontSize: z(10.5), margin: [0, 8, 0, 8] }, { text: String(x.titulo || ""), bold: true, color: t.txt, fontSize: z(10.5), margin: [0, 8, 0, 8] }, { text: String(x.local || ""), color: t.sub, fontSize: z(9.5), margin: [0, 8, 0, 8] }]] },
            layout: { hLineWidth: function (i) { return i === 1 ? 0.6 : 0; }, vLineWidth: function () { return 0; }, hLineColor: function () { return t.linha; } }, unbreakable: true };
        });
      } else if (s.id === "rider") {
        if (s.itens.length) { var ul = function (l) { return { ul: l, markerColor: t.cor, fontSize: z(10.5), lineHeight: 1.45 }; }; b.push(s.itens.length > 7 && k >= 0.8 ? { columns: [ul(s.itens.slice(0, Math.ceil(s.itens.length / 2))), ul(s.itens.slice(Math.ceil(s.itens.length / 2)))], columnGap: 20 } : ul(s.itens)); }
        if (s.obs) b.push({ text: s.obs, italics: true, fontSize: z(9.5), color: t.sub, margin: [0, 10, 0, 0] });
      } else if (s.id === "contato") {
        var c = m.contato, lin = [["WhatsApp", c.tel, linkDe(c.tel, "tel")], ["E-mail", c.email, linkDe(c.email, "email")], ["Site", c.site, linkDe(c.site, "site")], ["Instagram", c.insta, linkDe(c.insta, "insta")],
          ["TikTok", c.tiktok, linkDe(c.tiktok, "tiktok")], ["YouTube", c.youtube, linkDe(c.youtube, "youtube")], ["Cidade", c.cidade, ""]].filter(function (x) { return String(x[1] || "").trim(); });
        var esq = [{ text: String(c.resp || m.marca), font: fT, bold: true, fontSize: z(18), color: t.txt }].concat(c.cargo ? [{ text: c.cargo, fontSize: z(10), color: t.sub, margin: [0, 2, 0, 12] }] : [{ text: "", margin: [0, 0, 0, 10] }])
          .concat(lin.map(function (x) { return { columns: [{ text: x[0].toUpperCase(), width: z(74), fontSize: z(8), bold: true, color: t.cor, characterSpacing: 1, margin: [0, 2, 0, 0] }, { text: String(x[1]), fontSize: z(11), color: t.txt, link: x[2] || undefined }], margin: [0, 0, 0, 6] }; }));
        var cols = [{ stack: esq, width: "*" }];
        if (m.logo) { var lw2 = 120 * k, lh2 = lw2 / m.logoProp; if (lh2 > 70 * k) { lh2 = 70 * k; lw2 = lh2 * m.logoProp; } cols.push({ image: m.logo, width: lw2, height: lh2, margin: [10, 4, 0, 0] }); }
        b.push({ table: { widths: [5, "*"], body: [[{ text: "", fillColor: t.corPura }, { columns: cols, margin: [z(20), z(18), z(20), z(18)], fillColor: t.cartao }]] }, layout: semGap(t.fundo, 0) });
      }
      secao(h, b);
    });
    return montar(cont);

    function montar(c) {
      return {
        pageSize: { width: W, height: H }, pageMargins: [MX, z(64), MX, z(60)],
        info: { title: "Apresentação — " + m.marca, author: m.marca, creator: "Brightway — Press kit" },
        background: function (pg) {
          if (pg === 1) return capaFundo;
          return [{ canvas: [{ type: "rect", x: 0, y: 0, w: W, h: H, color: t.fundo }, { type: "rect", x: 0, y: 0, w: W, h: 4, color: t.corPura }], absolutePosition: { x: 0, y: 0 } }];
        },
        header: function (pg) { if (pg === 1) return null; return { columns: [{ text: m.marca.toUpperCase(), fontSize: z(7.5), bold: true, color: t.sub, characterSpacing: 1.6 }, { text: String(m.etiqueta).toUpperCase(), fontSize: z(7.5), color: t.sub, alignment: "right", characterSpacing: 1.6 }], margin: [MX, z(28), MX, 0] }; },
        footer: function (pg, n) { if (pg === 1) return null; return { columns: [{ text: m.linhaContato, fontSize: z(7.5), color: t.sub }, { text: pg + " / " + n, fontSize: z(7.5), color: t.sub, alignment: "right", width: 50 }], margin: [MX, z(22), MX, 0] }; },
        content: c,
        defaultStyle: { font: "Roboto", fontSize: z(10.5), lineHeight: 1.4, color: t.txt }
      };
    }
  }

  /* ================= BIBLIOTECAS ================= */
  var carregadas = {};
  function script(src) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("sem internet")); }; document.head.appendChild(s); }); }
  function carregar(nome) {
    if (carregadas[nome]) return carregadas[nome];
    if (nome === "docx" && window.docx) return (carregadas[nome] = Promise.resolve());
    if (nome === "zip" && window.JSZip) return (carregadas[nome] = Promise.resolve());
    if (nome === "qr" && window.qrcode) return (carregadas[nome] = Promise.resolve());
    var p = LIB[nome].reduce(function (q, src) { return q.then(function () { return script(src); }); }, Promise.resolve());
    if (nome === "pdf") p = p.then(fontesPdf);
    carregadas[nome] = p.catch(function (e) { delete carregadas[nome]; throw e; });
    return carregadas[nome];
  }
  function b64(buf) { var u = new Uint8Array(buf), s = "", n = 0x8000; for (var i = 0; i < u.length; i += n) s += String.fromCharCode.apply(null, u.subarray(i, i + n)); return btoa(s); }
  async function fontesPdf() {
    /* as fontes vêm do próprio site (OFL 1.1, assets/fontes/OFL.txt); o pdfMake 0.2.20 troca o sistema de arquivos inteiro → junta com o do vfs_fonts */
    var arqs = ["Montserrat-500.ttf", "Montserrat-800.ttf", "PlayfairDisplay-400.ttf", "PlayfairDisplay-700.ttf"], minhas = {};
    for (var i = 0; i < arqs.length; i++) { try { var r = await fetch("assets/fontes/" + arqs[i]); if (r.ok) minhas[arqs[i]] = b64(await r.arrayBuffer()); } catch (e) { } }
    var tem = function (a) { return !!minhas[a]; };
    pdfMake.addVirtualFileSystem(Object.assign({}, window.vfs || {}, minhas));
    var rob = { normal: "Roboto-Regular.ttf", bold: "Roboto-Medium.ttf", italics: "Roboto-Italic.ttf", bolditalics: "Roboto-MediumItalic.ttf" };
    pdfMake.fonts = { Roboto: rob,
      MO: tem("Montserrat-800.ttf") ? { normal: "Montserrat-500.ttf", bold: "Montserrat-800.ttf", italics: "Montserrat-500.ttf", bolditalics: "Montserrat-800.ttf" } : rob,
      PF: tem("PlayfairDisplay-700.ttf") ? { normal: "PlayfairDisplay-400.ttf", bold: "PlayfairDisplay-700.ttf", italics: "PlayfairDisplay-400.ttf", bolditalics: "PlayfairDisplay-700.ttf" } : rob };
  }
  var _pdfjs = null;
  async function pdfjs() { if (!_pdfjs) { _pdfjs = await import(PDFJS + "pdf.min.mjs"); _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.mjs"; } return _pdfjs; }
  async function pdfBytes(def) { await carregar("pdf"); window.__pkUltimoDef = def; return await new Promise(function (ok, erro) { try { pdfMake.createPdf(def).getBuffer(function (b) { ok(b); }); } catch (e) { erro(e); } }); }

  /* ================= WORD (docx editável) ================= */
  function binDe(dataUrl) { var bin = atob(dataUrl.split(",")[1]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  async function wordBlob(m) {
    await carregar("docx");
    var D = window.docx, t = m.tema, cor = destaqueLegivel(t.corPura, "#FFFFFF").replace("#", ""), txt = (t.escuro ? "1D222B" : t.txt.replace("#", "")), sub = "5B6472";
    var fonteT = t.fTit === "PF" ? "Playfair Display" : t.fTit === "MO" ? "Montserrat" : "Calibri";
    var P = function (texto, o) { o = o || {}; return new D.Paragraph({ alignment: o.al, heading: o.heading, spacing: { after: o.after == null ? 140 : o.after, before: o.before || 0 }, bullet: o.bullet ? { level: 0 } : undefined, pageBreakBefore: !!o.quebra,
      children: [new D.TextRun({ text: texto || "", bold: !!o.b, italics: !!o.i, size: o.size || 22, color: o.color || txt, font: o.font })] }); };
    var IMG = function (u, w, h) { return new D.ImageRun({ type: /^data:image\/png/.test(u) ? "png" : "jpg", data: binDe(u), transformation: { width: Math.round(w), height: Math.round(h) } }); };
    var filhos = [];
    if (m.logo) { var lw = 220, lh = lw / m.logoProp; if (lh > 90) { lh = 90; lw = 90 * m.logoProp; } filhos.push(new D.Paragraph({ children: [IMG(m.logo, lw, lh)], spacing: { after: 300 } })); }
    filhos.push(P(String(m.etiqueta).toUpperCase(), { b: true, size: 18, color: cor, after: 80 }));
    filhos.push(P(m.marca, { b: true, size: 60, font: fonteT, after: 160 }));
    if (m.slogan) filhos.push(P(m.slogan, { size: 28, color: sub, after: 240 }));
    var capaW = m.capaImg || m.retrato;
    if (capaW) { var pr = await proporcao(capaW), cw = pr < 1 ? Math.round(520 * pr) : 600, ch = pr < 1 ? 520 : Math.round(600 / pr); filhos.push(new D.Paragraph({ children: [IMG(capaW, cw, ch)], spacing: { after: 200 } })); }
    if (m.cidade) filhos.push(P(m.cidade, { size: 18, color: sub }));
    var h2 = function (s, n, primeira) { filhos.push(P(String(n).padStart(2, "0") + "  " + (t.caixaAlta ? s.tit.toUpperCase() : s.tit), { b: true, size: 32, color: cor, font: fonteT, heading: D.HeadingLevel.HEADING_1, after: 160, quebra: primeira })); };
    var tabela = function (linhasT, larguras) {
      return new D.Table({ width: { size: 100, type: D.WidthType.PERCENTAGE }, rows: linhasT.map(function (l) { return new D.TableRow({ children: l.map(function (cel, j) { return new D.TableCell({ width: larguras ? { size: larguras[j], type: D.WidthType.PERCENTAGE } : undefined, margins: { top: 80, bottom: 80, left: 100, right: 100 }, children: cel }); }) }); }) });
    };
    m.secoes.forEach(function (s, i) {
      h2(s, i + 1, i === 0);
      if (s.id === "sobre") { if (s.retrato) { var rw = Math.round(200 * Math.min(1, m.retratoProp)), rhh = Math.round(rw / m.retratoProp); filhos.push(new D.Paragraph({ children: [IMG(s.retrato, rw, rhh)], spacing: { after: 120 } })); } if (s.curto) filhos.push(P(s.curto, { b: true, size: 28 })); s.pars.forEach(function (p) { filhos.push(P(p)); }); }
      else if (s.id === "perfil") filhos.push(tabela(s.itens.map(function (x) { return [[P(String(x.k || ""), { b: true, size: 18, color: cor, after: 0 })], [P(String(x.v || ""), { b: true, after: 0 })]]; }), [35, 65]), P("", { after: 120 }));
      else if (s.id === "experiencia") s.grupos.forEach(function (g) { if (g.nome) filhos.push(P(g.nome.toUpperCase(), { b: true, size: 20, color: cor, after: 60, before: 120 })); g.itens.forEach(function (x) {
        var lk = linkDe(x.link, "site"), ch = [new D.TextRun({ text: (x.ano ? x.ano + "  ·  " : "") + (x.titulo || ""), bold: true, size: 24, color: txt })];
        filhos.push(new D.Paragraph({ children: ch, spacing: { after: 20 } }));
        var sb = [x.papel, x.onde].filter(function (v) { return String(v || "").trim(); }).join("  ·  ");
        var ch2 = [new D.TextRun({ text: sb, size: 20, color: sub })]; if (lk) ch2.push(new D.TextRun({ text: sb ? "   " : "", size: 20 }), new D.ExternalHyperlink({ link: lk, children: [new D.TextRun({ text: "VER ↗", bold: true, size: 18, color: cor, underline: {} })] }));
        filhos.push(new D.Paragraph({ children: ch2, spacing: { after: 140 } })); }); });
      else if (s.id === "formacao") s.itens.forEach(function (x) { filhos.push(P((x.ano ? x.ano + "  ·  " : "") + (x.curso || ""), { b: true, size: 23, after: 20 }), P(String(x.onde || ""), { size: 20, color: sub })); });
      else if (s.id === "habilidades") s.itens.forEach(function (x) { filhos.push(P(x, { bullet: true, after: 60 })); });
      else if (s.id === "links") s.itens.forEach(function (x) { filhos.push(new D.Paragraph({ spacing: { after: 100 }, children: [new D.TextRun({ text: String(x.rot || "Link") + ":  ", bold: true, size: 22, color: txt }), new D.ExternalHyperlink({ link: x.href, children: [new D.TextRun({ text: x.href.replace(/^https?:\/\/(www\.)?/, ""), size: 22, color: cor, underline: {} })] })] })); });
      else if (s.id === "numeros") filhos.push(tabela(emGrupos(s.itens, 3).map(function (r) { while (r.length < 3) r.push({ v: "", r: "" }); return r.map(function (x) { return [P(String(x.v || ""), { b: true, size: 40, color: cor, font: fonteT, after: 40 }), P(String(x.r || ""), { size: 18, color: sub, after: 0 })]; }); })), P("", { after: 120 }));
      else if (s.id === "servicos") s.itens.forEach(function (x) { filhos.push(P(String(x.t || ""), { b: true, size: 24, after: 40 }), P(String(x.d || ""), { size: 20, color: sub })); });
      else if (s.id === "galeria") { if (s.grande) filhos.push(new D.Paragraph({ children: [IMG(s.grande, 600, 315)], spacing: { after: 120 } })); if (s.peq.length) filhos.push(new D.Paragraph({ children: s.peq.map(function (u) { return s.grande ? IMG(u, 190, 131) : IMG(u, 140, 187); }), spacing: { after: 120 } })); if (s.legenda) filhos.push(P(s.legenda, { i: true, size: 18, color: sub })); }
      else if (s.id === "clientes") filhos.push(tabela(emGrupos(s.itens, 3).map(function (r) { while (r.length < 3) r.push(""); return r.map(function (x) { return [P(x, { b: true, al: D.AlignmentType.CENTER, after: 0 })]; }); })), P("", { after: 120 }));
      else if (s.id === "depoimentos") s.itens.forEach(function (x) { filhos.push(P("“" + String(x.texto || "") + "”", { i: true, size: 24, after: 60 }), P(String(x.autor || ""), { b: true, after: 0 }), P(String(x.cargo || ""), { size: 18, color: sub, after: 200 })); });
      else if (s.id === "release") { if (s.titulo) filhos.push(P(s.titulo, { b: true, size: 30, font: fonteT, after: 60 })); if (s.data) filhos.push(P(s.data, { b: true, size: 18, color: cor })); s.pars.forEach(function (p) { filhos.push(P(p)); }); }
      else if (s.id === "imprensa") s.itens.forEach(function (x) { filhos.push(P(String(x.veiculo || "").toUpperCase(), { b: true, size: 16, color: cor, after: 20 }), P(String(x.titulo || ""), { b: true, size: 24, after: 20 }), P([x.data, x.link].filter(Boolean).join(" · "), { size: 18, color: sub, after: 200 })); });
      else if (s.id === "agenda") filhos.push(tabela(s.itens.map(function (x) { return [[P(String(x.data || ""), { b: true, color: cor, after: 0 })], [P(String(x.titulo || ""), { b: true, after: 0 })], [P(String(x.local || ""), { size: 20, color: sub, after: 0 })]]; }), [20, 50, 30]), P("", { after: 120 }));
      else if (s.id === "rider") { s.itens.forEach(function (x) { filhos.push(P(x, { bullet: true, after: 60 })); }); if (s.obs) filhos.push(P(s.obs, { i: true, size: 20, color: sub })); }
      else if (s.id === "contato") { var c = m.contato; filhos.push(P(String(c.resp || m.marca), { b: true, size: 32, font: fonteT, after: 20 })); if (c.cargo) filhos.push(P(c.cargo, { color: sub })); [["WhatsApp", c.tel], ["E-mail", c.email], ["Site", c.site], ["Instagram", c.insta], ["TikTok", c.tiktok], ["YouTube", c.youtube], ["Cidade", c.cidade]].forEach(function (x) { if (String(x[1] || "").trim()) filhos.push(P(x[0] + ": " + x[1], { after: 60 })); }); }
    });
    var doc = new D.Document({ creator: "Brightway", title: "Apresentação — " + m.marca, styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
      sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } }, children: filhos }] });
    return await D.Packer.toBlob(doc);
  }

  /* ================= TELA ================= */
  var KIT = null, IMGS = imgsVazias(), VISTA = "lista", PAGS = 0;
  function aviso(t, erro) { if (window.BWAviso) { if (erro) BWAviso.erro(t); else BWAviso(t); } }
  function andamento(t) { if (window.BWAviso) { if (t) BWAviso("⏳ " + t, "", 0); else BWAviso.fechar && BWAviso.fechar(); } }
  function baixar(b, nome) { var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 8000); }
  function nomeArq(k, ext) { return ("presskit-" + ((k.d && k.d.marca) || "marca")).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() + "." + ext; }
  function dataBR(iso) { var d = new Date(iso); return isNaN(d) ? "" : String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function mostrar(v) {
    VISTA = v; $("vLista").hidden = v !== "lista"; $("vModelos").hidden = v !== "modelos"; $("vEd").hidden = v !== "editor";
    try { history.replaceState(null, "", v === "editor" && KIT ? "presskit.html?k=" + encodeURIComponent(KIT.id) : "presskit.html"); } catch (e) { }
    window.scrollTo(0, 0);
  }

  /* ---------- LISTA ---------- */
  async function desenharLista() {
    var l = lista().sort(function (a, b) { return String(b.atualizado || "").localeCompare(String(a.atualizado || "")); });
    $("lista").innerHTML = l.length ? l.map(function (k) {
      return '<div class="pk-card" data-id="' + esc(k.id) + '"><button type="button" class="pk-mini" data-a="abrir" data-id="' + esc(k.id) + '" aria-label="Abrir ' + esc(k.nome) + '"><img alt="" data-thumb="kit-' + esc(k.id) + '"></button>' +
        '<div class="pk-info"><b>' + esc(k.nome || "Press kit") + '</b><span>' + esc(modeloDe(k.modelo).nome) + " · " + esc(dataBR(k.atualizado)) + '</span>' +
        '<div class="pk-acoes"><button type="button" class="bw-btn pri" data-a="abrir" data-id="' + esc(k.id) + '">✎ ABRIR</button><button type="button" class="bw-btn" data-a="duplicar" data-id="' + esc(k.id) + '">⧉ DUPLICAR</button><button type="button" class="bw-btn" data-a="excluir" data-id="' + esc(k.id) + '" aria-label="Excluir">✕</button></div></div></div>';
    }).join("") : '<div class="pk-vazio">Nenhuma apresentação ainda.<br>Toque em <b>＋ NOVA APRESENTAÇÃO</b> e escolha um modelo — ele já vem com um exemplo para você trocar pelos seus dados (ou é só falar).</div>';
    [].slice.call($("lista").querySelectorAll("img[data-thumb]")).forEach(async function (im) { var u = await idbGet("thumbs", im.getAttribute("data-thumb")); if (u) im.src = u; else im.parentNode.classList.add("sem"); });
  }

  /* ---------- MODELOS ---------- */
  var THUMB_V = "v2";
  async function desenharModelos() {
    $("modelos").innerHTML = MODELOS.map(function (m) {
      return '<button type="button" class="pk-mod" data-a="usarModelo" data-m="' + m.id + '"><span class="pk-mod-capa"><img alt="Capa do modelo ' + esc(m.nome) + '" data-mcapa="' + m.id + '"></span>' +
        '<span class="pk-mod-nome">' + m.ico + " " + esc(m.nome.toUpperCase()) + '</span><span class="pk-mod-para">' + esc(m.para) + "</span></button>";
    }).join("");
    for (var i = 0; i < MODELOS.length; i++) {
      var md = MODELOS[i], im = $("modelos").querySelector('[data-mcapa="' + md.id + '"]'); if (!im) continue;
      var u = await idbGet("thumbs", "mod-" + md.id + "-" + THUMB_V);
      if (!u) { try { u = await capaPng(kitNovo(md.id), imgsExemplo(md), 320); if (u) idbPut("thumbs", "mod-" + md.id + "-" + THUMB_V, u); } catch (e) { u = ""; } }
      if (u) im.src = u; else im.parentNode.classList.add("sem");
      if (VISTA !== "modelos") return;
    }
  }
  async function capaPng(kit, imgs, larg) {
    var m = await modelo(kit, imgs), bytes = await pdfBytes(defPdf(m, { soCapa: true })), J = await pdfjs();
    var doc = await J.getDocument({ data: bytes, isEvalSupported: false }).promise, pg = await doc.getPage(1), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: larg / vp0.width });
    var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; doc.destroy();
    return c.toDataURL("image/jpeg", 0.82);
  }

  /* ---------- EDITOR ---------- */
  async function abrirKit(id) {
    var k = acharKit(id); if (!k) { aviso("Esse press kit não está mais aqui.", true); mostrar("lista"); desenharLista(); return; }
    KIT = k; IMGS = (await idbGet("imgs", k.id)) || imgsVazias(); if (!Array.isArray(IMGS.fotos)) IMGS.fotos = [];
    mostrar("editor"); desenharForm(); agendarPrevia(0);
  }
  async function criarKit(modId) {
    var k = kitNovo(modId), mod = modeloDe(modId), im = imgsExemplo(mod);
    salvarKit(k); await idbPut("imgs", k.id, im);
    KIT = k; IMGS = im; mostrar("editor"); desenharForm(); agendarPrevia(0);
    aviso("Modelo " + mod.nome + " aberto com um exemplo");
  }
  function guardar() { if (!KIT) return; salvarKit(KIT); }
  var tGuardarImgs = 0;
  function guardarImgs() { clearTimeout(tGuardarImgs); var id = KIT && KIT.id, im = IMGS; tGuardarImgs = setTimeout(function () { if (id) idbPut("imgs", id, im); }, 200); }

  function campo(rot, k, v, op) {
    op = op || {};
    var id = "f_" + k.replace(/\W/g, "_");
    if (op.area) return '<div class="pk-campo' + (op.larga ? " larga" : "") + '"><label for="' + id + '"><span>' + rot + '</span></label><textarea id="' + id + '" data-k="' + k + '" data-rot="' + esc(rot) + '"' + (op.lista ? ' data-lista="1"' : "") + ' rows="' + (op.linhas || 4) + '" maxlength="' + (op.max || 4000) + '" placeholder="' + esc(op.ph || "") + '">' + esc(v) + "</textarea>" + vozBarra(id) + "</div>";
    return '<label class="pk-campo' + (op.larga ? " larga" : "") + '" for="' + id + '"><span>' + rot + '</span><input id="' + id + '" type="' + (op.tipo || "text") + '" data-k="' + k + '" value="' + esc(v) + '" maxlength="' + (op.max || 200) + '" placeholder="' + esc(op.ph || "") + '"' + (op.tipo === "url" ? ' inputmode="url"' : "") + "></label>";
  }
  /* 🎙 FALAR e ✨ CORRIGIR embaixo de todo texto longo (dono, 25/11: "falar e o texto se monta corrigido") */
  function vozBarra(id) { return '<div class="pk-voz"><button type="button" class="pk-mic" data-a="falar" data-alvo="' + id + '" aria-pressed="false">🎙 FALAR</button><button type="button" class="pk-mic" data-a="corrigir" data-alvo="' + id + '">✨ CORRIGIR</button><button type="button" class="pk-mic volta" data-a="voltarCampo" data-alvo="' + id + '" hidden>↺ COMO ESTAVA</button></div>'; }
  function upload(rot, alvo, multi) { return '<label class="bw-btn pk-up">' + rot + '<input type="file" accept="image/*" data-up="' + alvo + '"' + (multi ? " multiple" : "") + "></label>"; }
  var PASSO = 0;
  function grupo(chave, titulo, corpo, fechada, numerado) { var n = numerado ? '<i class="pk-n">' + (++PASSO) + "</i>" : ""; return '<section class="tf-card pk-grupo"><h3 data-seta="pk_' + chave + '"' + (fechada ? ' data-seta-padrao="fechada"' : "") + ">" + n + titulo + "</h3>" + corpo + "</section>"; }
  function listaCampos(nome, itens, cols, max, rotAdd) {
    return '<div class="pk-lista">' + itens.map(function (x, i) {
      return '<div class="pk-item"><div class="pk-item-campos">' + cols.map(function (c) { return campo(c[1], "d." + nome + "." + i + "." + c[0], x[c[0]] || "", { area: c[2] === "area", larga: c[2] === "area" || c[2] === "larga", linhas: 3, ph: c[3] || "", tipo: c[2] === "url" ? "url" : undefined }); }).join("") +
        '</div><button type="button" class="pk-x" data-a="tirarItem" data-l="' + nome + '" data-i="' + i + '" aria-label="Tirar este item">✕</button></div>';
    }).join("") + (itens.length < max ? '<button type="button" class="bw-btn pk-add" data-a="addItem" data-l="' + nome + '">＋ ' + (rotAdd || "ADICIONAR") + "</button>" : "") + "</div>";
  }
  /* ---------- ✨ IA NA FOTO (25/11, dono: "ponte no local da inserção de fotos, melhorar com IA e prompt já definido para fotos
     corporativas… ela se altera e se cria no local com um clique"): um toque no preset → a IA da plataforma (bw-ia-imagem, pela
     fotos-nuvem.js — a mesma do editor de fotos: cópia ≤ 504 px, confirmação na 1ª vez, limite do dia) devolve a foto nova e ela troca
     NO LUGAR; ↺ ORIGINAL volta. O presskit.js não fala com a internet para isso: só chama BWFotosNuvem. ---------- */
  var MANTER = "Keep exactly the same person: same face, identity, skin tone, hair and expression. Photorealistic, natural skin texture, sharp focus, no text, no watermark. ";
  var FOTO_IA = [
    { id: "corp", ico: "💼", nome: "Corporativo", p: MANTER + "Turn this into a professional corporate headshot: clean neutral light-gray studio background, soft even studio lighting, wearing a well-fitted dark blazer, confident friendly look, upper body framing." },
    { id: "escr", ico: "🏢", nome: "Escritório", p: MANTER + "Place the person in a modern bright office with a softly blurred background (bokeh), natural window light, professional business attire, editorial corporate portrait." },
    { id: "liso", ico: "⬜", nome: "Fundo liso", p: MANTER + "Replace the background with a plain seamless pure white studio background, even soft lighting, clean edges around the person, keep the same clothes." },
    { id: "luz", ico: "💡", nome: "Luz de estúdio", p: MANTER + "Keep the same composition, clothes and background. Improve only the photo quality: professional studio lighting, balanced exposure, accurate natural colors, gentle contrast, crisp details." },
    { id: "book", ico: "🎭", nome: "Book artístico", p: MANTER + "Artistic actor headshot: dark charcoal studio background, dramatic soft side light with subtle rim light, cinematic but natural colors, keep the same clothes." },
    { id: "palco", ico: "🎤", nome: "No palco", p: MANTER + "Place the person on a professional event stage with warm spotlights and soft blurred audience lights behind, keep the same clothes, keep the person well lit and in focus." }
  ];
  var IA_FOTO_OK = false, IA_OCUP = {};
  function chaveFoto(alvo) { return alvo === "retrato" || alvo === "capa" ? alvo : "f" + alvo; }
  function srcFoto(alvo) { return alvo === "retrato" || alvo === "capa" ? IMGS[alvo] : (IMGS.fotos || [])[+alvo]; }
  function botoesIA(alvo) {
    var k = chaveFoto(alvo), orig = IMGS.origs && IMGS.origs[k];
    return '<div class="pk-ia" data-iaalvo="' + alvo + '"><span class="pk-ia-t">✨ MELHORAR COM IA · UM TOQUE</span><div class="pk-ia-l">' + FOTO_IA.map(function (x) {
      return '<button type="button" class="pk-iab" data-a="fotoIA" data-alvo="' + alvo + '" data-p="' + x.id + '" title="' + esc(x.nome) + '"' + (IA_OCUP[k] ? " disabled" : "") + '><i>' + x.ico + "</i>" + esc(x.nome) + "</button>";
    }).join("") + '<button type="button" class="pk-iab" data-a="fotoIAlivre" data-alvo="' + alvo + '"' + (IA_OCUP[k] ? " disabled" : "") + "><i>✎</i>Do meu jeito</button>" +
      (orig ? '<button type="button" class="pk-iab volta" data-a="fotoIAvolta" data-alvo="' + alvo + '"><i>↺</i>Original</button>' : "") + "</div></div>";
  }
  function encolher(src, max) {
    return imgDe(src).then(function (im) {
      var s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      return new Promise(function (ok) { c.toBlob(function (b) { ok({ blob: b, w: c.width, h: c.height }); }, "image/jpeg", 0.9); });
    });
  }
  function blobUrl(b) { return new Promise(function (ok, erro) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = erro; r.readAsDataURL(b); }); }
  async function fotoIA(alvo, pedido) {
    var src = srcFoto(alvo), k = chaveFoto(alvo); if (!src || IA_OCUP[k]) return;
    if (!window.BWFotosNuvem) { aviso("Recarregue a página para usar a IA", true); return; }
    if (!IA_FOTO_OK && !confirm("A IA da Brightway recebe uma cópia pequena desta foto e devolve uma versão nova, que entra no lugar (↺ ORIGINAL volta). Nada fica guardado na nuvem e conta no limite de imagens do dia.\n\nUse só fotos suas ou com autorização. Continuar?")) return;
    IA_FOTO_OK = true; IA_OCUP[k] = true; desenharForm(); andamento("A IA está criando a foto (10 a 30 s)…");
    try {
      var e = await encolher(src, 504), q = 1024 / Math.max(e.w, e.h), w = Math.max(256, Math.round(e.w * q / 16) * 16), h = Math.max(256, Math.round(e.h * q / 16) * 16);
      var r = await BWFotosNuvem.editar(e.blob, pedido, w, h);
      andamento("");
      if (r.erro) { aviso(BWFotosNuvem.msg(r.erro), true); return; }
      var nova = await blobUrl(r.blob);
      if (srcFoto(alvo) !== src) { aviso("A foto mudou enquanto a IA trabalhava — tente de novo", true); return; }
      IMGS.origs = IMGS.origs || {}; if (!IMGS.origs[k]) IMGS.origs[k] = src;
      if (alvo === "retrato" || alvo === "capa") IMGS[alvo] = nova; else IMGS.fotos[+alvo] = nova;
      KIT.exemplo = false; guardar(); guardarImgs(); aviso("✨ Foto nova no lugar — ↺ ORIGINAL volta");
    } catch (er) { andamento(""); aviso("A IA não respondeu agora", true); }
    finally { delete IA_OCUP[k]; desenharForm(); agendarPrevia(0); }
  }
  function fotoIAvolta(alvo) {
    var k = chaveFoto(alvo), o = IMGS.origs && IMGS.origs[k]; if (!o) return;
    if (alvo === "retrato" || alvo === "capa") IMGS[alvo] = o; else IMGS.fotos[+alvo] = o;
    delete IMGS.origs[k]; guardarImgs(); desenharForm(); agendarPrevia(0); aviso("↺ Voltou à foto original");
  }
  function fotoIAlivre(alvo) {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Do meu jeito</h3><p class="tf-sub">Diga o que mudar na foto (ex.: "camisa social branca e fundo azul-marinho"). A pessoa continua a mesma.</p>' +
      '<textarea class="pk-in" id="iaFotoTexto" rows="3" maxlength="400" placeholder="Ex.: fundo de estúdio azul-marinho, blazer cinza, sorriso leve"></textarea>' + vozBarra("iaFotoTexto").replace(/<button[^>]*data-a="(corrigir|voltarCampo)"[^>]*>[^<]*<\/button>/g, "") +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="fotoIAlivreIr" data-alvo="' + alvo + '">✨ CRIAR NO LUGAR</button></div>');
  }
  /* galeria: o ✨ da foto abre os mesmos presets numa folha — um toque cria no lugar */
  function fotoIAmenu(i) { modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Melhorar a foto ' + (+i + 1) + '</h3><p class="tf-sub">Um toque e a foto nova entra no lugar.</p>' + botoesIA(String(i))); }
  function caixaImg(rot, chave, dica, png) {
    var u = IMGS[chave];
    return '<div class="pk-img"><span>' + rot + "</span>" + (u ? '<img src="' + u + '" alt="' + esc(rot) + '"' + (png ? ' class="xadrez"' : "") + ">" : "<i>" + esc(dica) + "</i>") + '<div class="pk-chips">' + upload(u ? "↺ TROCAR" : "＋ ESCOLHER", chave) +
      (u ? '<button type="button" class="pk-chip" data-a="tirarImg" data-v="' + chave + '">✕ TIRAR</button>' : "") + (chave === "logo" ? '<button type="button" class="pk-chip" data-a="logoEmpresa">★ DA MINHA EMPRESA</button>' : "") + "</div>" + (u && chave !== "logo" ? botoesIA(chave) : "") + "</div>";
  }
  function desenharForm() {
    var k = KIT, d = k.d, c = d.contato || (d.contato = {}), mod = modeloDe(k.modelo), cc = mod.tema.capa === "compcard";
    $("edNome").value = k.nome || ""; PASSO = 0;
    var h = "";
    /* o atalho que monta tudo: falar ou escrever do seu jeito e a IA distribui nos campos */
    h += '<div class="tf-card pk-falando"><div><b>🎙 Monte falando</b><span>Conte quem você é, o que faz, onde já trabalhou e como te encontrar. A IA corrige e coloca cada coisa no seu lugar — não inventa nada.</span></div><button type="button" class="bw-btn pri" data-a="iaSobre">🎙 CONTAR SOBRE MIM</button></div>';
    if (k.exemplo) h += '<div class="tf-card pk-exemplo"><b>Este modelo começou com um EXEMPLO</b> (pessoa inventada). Troque pelos seus dados ou comece do zero.<div class="pk-chips"><button type="button" class="bw-btn" data-a="limparExemplo">🧹 APAGAR O EXEMPLO</button><button type="button" class="bw-btn" data-a="puxarEmpresa">⇩ USAR MINHA EMPRESA</button></div></div>';
    /* modelo e cores */
    h += grupo("modelo", "🎨 MODELO E VISUAL",
      '<div class="pk-chips">' + MODELOS.map(function (m) { return '<button type="button" class="pk-chip' + (m.id === k.modelo ? " on" : "") + '" data-a="trocarModelo" data-m="' + m.id + '">' + m.ico + " " + esc(m.nome) + "</button>"; }).join("") + "</div>" +
      '<p class="tf-sub">Trocar o modelo mantém todos os seus textos e fotos.</p>' +
      '<div class="pk-cores"><label class="pk-campo"><span>Cor principal</span><input type="color" data-k="cor" value="' + esc(k.cor || mod.cor) + '"></label><label class="pk-campo"><span>Cor de apoio</span><input type="color" data-k="cor2" value="' + esc(k.cor2 || mod.cor2) + '"></label>' +
      '<label class="pk-campo"><span>Letra dos títulos</span><select data-k="fonte">' + Object.keys(FONTES_TIT).map(function (f) { return '<option value="' + f + '"' + ((k.fonte || mod.fonte) === f ? " selected" : "") + ">" + FONTES_TIT[f] + "</option>"; }).join("") + "</select></label>" +
      '<label class="pk-campo"><span>Formato</span><select data-k="formato"' + (cc ? " disabled" : "") + ">" + (cc ? '<option>A5 (comp card)</option>' : Object.keys(FORMATOS).map(function (f) { return '<option value="' + f + '"' + ((k.formato || mod.formato) === f ? " selected" : "") + ">" + FORMATOS[f] + "</option>"; }).join("")) + "</select></label></div>" +
      '<div class="pk-chips"><button type="button" class="pk-chip" data-a="coresModelo">↺ CORES DO MODELO</button><button type="button" class="pk-chip" data-a="coresEmpresa">★ COR DA MINHA EMPRESA</button></div>', true);
    /* 1 · quem é você */
    h += grupo("quem", "QUEM É VOCÊ",
      '<div class="pk-campos">' + campo("Seu nome (ou nome artístico)", "d.marca", d.marca, { larga: true, max: 80 }) + campo("O que você faz (uma linha)", "d.slogan", d.slogan, { larga: true, max: 160, ph: "Ex.: Atriz · Teatro, TV e publicidade" }) +
      campo("Etiqueta (em cima do nome)", "d.etiqueta", d.etiqueta, { max: 60, ph: "APRESENTAÇÃO PESSOAL" }) + campo("Cidade", "d.cidade", d.cidade, { max: 80 }) + "</div>", false, true);
    /* 2 · fotos e mídia */
    h += grupo("midia", "FOTOS E MÍDIA",
      '<div class="pk-imgs">' + caixaImg("SUA FOTO RECORTADA (sem fundo)", "retrato", "PNG sem fundo — fica ao lado do seu texto", true) + caixaImg(cc ? "FOTO PRINCIPAL" : "FOTO DA CAPA", "capa", "a foto que abre a apresentação") + caixaImg("LOGO OU ASSINATURA (opcional)", "logo", "sem logo", true) + "</div>" +
      '<div class="pk-sub-t">GALERIA <small>(' + (IMGS.fotos || []).length + "/7)</small></div>" + '<div class="pk-fotos">' + (IMGS.fotos || []).map(function (u, i) {
        return '<div class="pk-foto"><img src="' + u + '" alt="Foto ' + (i + 1) + '"><span><button type="button" class="pk-sx" data-a="fotoEsq" data-i="' + i + '" aria-label="Para a esquerda">◀</button><button type="button" class="pk-sx" data-a="fotoTira" data-i="' + i + '" aria-label="Tirar foto">✕</button><button type="button" class="pk-sx ia" data-a="fotoIAmenu" data-i="' + i + '" aria-label="Melhorar com IA"' + (IA_OCUP["f" + i] ? " disabled" : "") + '>✨</button><button type="button" class="pk-sx" data-a="fotoDir" data-i="' + i + '" aria-label="Para a direita">▶</button></span></div>';
      }).join("") + "</div>" + ((IMGS.fotos || []).length < 7 ? upload("＋ FOTOS NA GALERIA", "fotos", true) : "") +
      '<p class="tf-sub">' + (cc ? "As 4 primeiras fotos vão para o verso do comp card." : "A primeira foto da galeria sai grande; as outras, em grade.") + " Sem foto recortada? No <a href=\"fotos.html\">Editor de fotos</a> → ✨ IA → fundo transparente. Tudo fica só neste aparelho.</p>", false, true);
    /* seções ligadas, na ordem */
    var ordem = (k.ordem || TODAS).filter(function (id) { return SECOES[id]; }); TODAS.forEach(function (id) { if (ordem.indexOf(id) < 0) ordem.push(id); });
    var titSec = function (id) { return campo("Título desta parte", "tit." + id, (k.tit && k.tit[id]) || "", { ph: SECOES[id].nome, max: 50 }); };
    ordem.filter(function (id) { return (k.ocultas || []).indexOf(id) < 0; }).forEach(function (id) {
      var corpo = "", nm = SECOES[id].ico + " " + titulo(k, id).toUpperCase();
      if (id === "sobre") corpo = '<div class="pk-campos">' + titSec(id) + campo("Frase de destaque", "d.sobreCurto", d.sobreCurto, { area: true, larga: true, linhas: 2, max: 300 }) + campo("Seu texto", "d.sobre", d.sobre, { area: true, larga: true, linhas: 7, max: 3000, ph: "Fale ou escreva. Linha em branco = novo parágrafo." }) + "</div>";
      else if (id === "perfil") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("perfil", d.perfil || [], [["k", "Item", "", "Ex.: Altura, Idiomas, DRT"], ["v", "Valor"]], 12, "ITEM");
      else if (id === "numeros") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("numeros", d.numeros || [], [["v", "Número"], ["r", "O que ele mostra"]], 9, "NÚMERO") + '<p class="tf-sub">Só números que você pode provar.</p>';
      else if (id === "servicos") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("servicos", d.servicos || [], [["t", "Nome"], ["d", "Em uma frase", "area"]], 10, "ITEM") +
        '<label class="pk-liga"><input type="checkbox" data-a="servFotos"' + (k.servFotos ? " checked" : "") + "> Mostrar uma foto da galeria em cada cartão</label>";
      else if (id === "experiencia") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("experiencia", d.experiencia || [], [["grupo", "Grupo", "", "Ex.: TV e publicidade, Eventos, Teatro"], ["titulo", "Trabalho / projeto"], ["papel", "Sua função"], ["onde", "Onde / para quem"], ["ano", "Ano"], ["link", "Link do vídeo ou matéria (opcional)", "url", "youtube.com/..."]], 24, "TRABALHO") + '<p class="tf-sub">Com link, aparece o botão VER ↗ clicável no PDF. Itens do mesmo grupo ficam juntos.</p>';
      else if (id === "formacao") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("formacao", d.formacao || [], [["curso", "Curso"], ["onde", "Onde"], ["ano", "Ano"]], 10, "CURSO");
      else if (id === "habilidades") corpo = '<div class="pk-campos">' + titSec(id) + campo("Uma por linha", "d.habilidades", d.habilidades || "", { area: true, larga: true, linhas: 5, max: 1500, lista: true }) + "</div>";
      else if (id === "links") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("links", d.links || [], [["rot", "Nome do botão", "", "Ex.: Vídeos, Fotos, Reel"], ["url", "Link", "url", "youtube.com/..."]], 8, "LINK") + '<p class="tf-sub">Cada link vira um botão clicável no PDF, com QR code para quem imprimir.</p>';
      else if (id === "galeria") corpo = '<div class="pk-campos">' + titSec(id) + campo("Legenda (opcional)", "d.galeriaLegenda", d.galeriaLegenda || "", { larga: true, max: 160 }) + '</div><p class="tf-sub">As fotos ficam em <b>FOTOS E MÍDIA</b>, lá em cima.</p>';
      else if (id === "clientes") corpo = '<div class="pk-campos">' + titSec(id) + campo("Um por linha", "d.clientes", d.clientes, { area: true, larga: true, linhas: 6, max: 2000, lista: true }) + "</div>";
      else if (id === "depoimentos") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("depoimentos", d.depoimentos || [], [["texto", "Recomendação", "area"], ["autor", "Quem disse"], ["cargo", "Cargo e empresa"]], 4, "RECOMENDAÇÃO") + '<p class="tf-sub">Só recomendações de verdade, com autorização de quem disse.</p>';
      else if (id === "release") { var r = d.release || (d.release = {}); corpo = '<div class="pk-campos">' + titSec(id) + campo("Título do release", "d.release.titulo", r.titulo || "", { larga: true, max: 160 }) + campo("Data / local", "d.release.data", r.data || "", { max: 80 }) + campo("Texto", "d.release.texto", r.texto || "", { area: true, larga: true, linhas: 7, max: 4000 }) + '</div><div class="pk-chips"><button type="button" class="bw-btn" data-a="iaRelease">✨ ESCREVER O RELEASE COM IA</button></div>'; }
      else if (id === "imprensa") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("imprensa", d.imprensa || [], [["veiculo", "Veículo"], ["titulo", "Título da matéria"], ["data", "Data"], ["link", "Link (opcional)", "url"]], 8, "MATÉRIA");
      else if (id === "agenda") corpo = '<div class="pk-campos">' + titSec(id) + "</div>" + listaCampos("agenda", d.agenda || [], [["data", "Data / hora"], ["titulo", "O quê"], ["local", "Onde"]], 12, "DATA");
      else if (id === "rider") corpo = '<div class="pk-campos">' + titSec(id) + campo("Um item por linha", "d.rider", d.rider || "", { area: true, larga: true, linhas: 6, max: 2000, lista: true }) + campo("Observação", "d.riderObs", d.riderObs || "", { larga: true, max: 300 }) + "</div>";
      else if (id === "contato") corpo = '<div class="pk-campos">' + titSec(id) + campo("Quem atende (você ou agência)", "d.contato.resp", c.resp || "", { max: 80 }) + campo("Função", "d.contato.cargo", c.cargo || "", { max: 80 }) + campo("WhatsApp", "d.contato.tel", c.tel || "", { tipo: "tel", max: 40 }) +
        campo("E-mail", "d.contato.email", c.email || "", { tipo: "email", max: 120 }) + campo("Instagram", "d.contato.insta", c.insta || "", { max: 80, ph: "@seuperfil" }) + campo("TikTok", "d.contato.tiktok", c.tiktok || "", { max: 80, ph: "@seuperfil" }) +
        campo("YouTube", "d.contato.youtube", c.youtube || "", { max: 120, ph: "@seucanal" }) + campo("Site", "d.contato.site", c.site || "", { max: 120 }) + campo("Cidade", "d.contato.cidade", c.cidade || "", { max: 80 }) + "</div>";
      h += grupo("s_" + id, esc(nm), corpo, false, true);
    });
    /* seções e ordem (no fim: é ajuste, não é o começo) */
    h += grupo("secoes", "📑 PARTES E ORDEM", '<p class="tf-sub">Ligue só o que faz sentido para você. As setas mudam a ordem no PDF.</p><div class="pk-ordem">' + ordem.map(function (id, i) {
      var on = (k.ocultas || []).indexOf(id) < 0;
      return '<div class="pk-ord' + (on ? "" : " off") + '"><label><input type="checkbox" data-a="vis" data-s="' + id + '"' + (on ? " checked" : "") + "> " + SECOES[id].ico + " " + esc(titulo(k, id)) + '</label><span><button type="button" class="pk-sx" data-a="sobe" data-s="' + id + '"' + (i === 0 ? " disabled" : "") + ' aria-label="Subir">▲</button><button type="button" class="pk-sx" data-a="desce" data-s="' + id + '"' + (i === ordem.length - 1 ? " disabled" : "") + ' aria-label="Descer">▼</button></span></div>';
    }).join("") + "</div>");
    $("form").innerHTML = h;
    if (window.BWDobras) BWDobras.aplicar($("form"));
    Object.keys(DIT.antes).forEach(function (id) { var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = false; });
  }

  /* ---------- 🎙 DITADO + ✨ CORREÇÃO ---------- */
  var DIT = { rec: null, grav: null, alvo: "", antes: {} };
  function botoesMic() { [].slice.call(document.querySelectorAll('[data-a="falar"]')).forEach(function (b) { var on = (DIT.rec || DIT.grav) && b.getAttribute("data-alvo") === DIT.alvo; b.classList.toggle("on", !!on); b.setAttribute("aria-pressed", String(!!on)); b.textContent = on ? "■ PARAR" : "🎙 FALAR"; }); }
  function setCampo(el, v) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }
  function pararDit() { try { if (DIT.rec) DIT.rec.stop(); } catch (e) { } try { if (DIT.grav && DIT.grav.state === "recording") DIT.grav.stop(); } catch (e) { } }
  function juntar(base, novo) { base = String(base || "").replace(/\s+$/, ""); novo = String(novo || "").trim(); if (!novo) return base; return base ? base + (/[.!?…:]$/.test(base) || /\n$/.test(base) ? " " : " ") + novo : novo; }
  function falar(id) {
    if (DIT.rec || DIT.grav) { var mesmo = DIT.alvo === id; pararDit(); if (mesmo) return; }
    var el = $(id); if (!el) return;
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition, base = el.value, fim = "";
    DIT.alvo = id; if (!/^ia/.test(id)) DIT.antes[id] = base;
    if (!SR || navigator.standalone) { gravarDit(el, base); return; }
    var r = new SR(); r.lang = "pt-BR"; r.interimResults = true; r.continuous = true;
    r.onresult = function (ev) { var p = ""; for (var i = ev.resultIndex; i < ev.results.length; i++) { var t = ev.results[i][0].transcript; if (ev.results[i].isFinal) fim += t + " "; else p += t; } setCampo(el, juntar(base, fim + p)); };
    r.onerror = function (ev) {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") aviso("Microfone bloqueado — libere no cadeado do endereço", true);
      else if (ev.error !== "no-speech" && ev.error !== "aborted") aviso("Não consegui ouvir (" + ev.error + ")", true);
    };
    r.onend = function () { DIT.rec = null; botoesMic(); if (fim.trim() && !/^ia/.test(id)) corrigirCampo(id); };
    try { r.start(); DIT.rec = r; botoesMic(); aviso("🎙 Pode falar — toque em PARAR quando acabar"); } catch (e) { DIT.rec = null; aviso("Não consegui ligar o microfone", true); }
  }
  function wav16(am) {
    var n = am.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); s(8, "WAVE"); s(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, "data"); v.setUint32(40, n * 2, true);
    for (var i = 0, o = 44; i < n; i++, o += 2) { var x = Math.max(-1, Math.min(1, am[i])); v.setInt16(o, x < 0 ? x * 0x8000 : x * 0x7FFF, true); }
    return new Blob([buf], { type: "audio/wav" });
  }
  /* sem reconhecimento no navegador (iPhone no app instalado): grava e a IA Brightway transcreve */
  async function gravarDit(el, base) {
    var s = await sessao(); if (!s) { aviso("Entre na sua conta para eu transcrever a sua fala", true); DIT.alvo = ""; return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { aviso("Este aparelho não deixa gravar por aqui", true); return; }
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { aviso("Microfone bloqueado", true); return; }
    var partes = [], mr = new MediaRecorder(stream), id = el.id; DIT.grav = mr; botoesMic();
    mr.ondataavailable = function (e) { if (e.data && e.data.size) partes.push(e.data); };
    var acabou = new Promise(function (ok) { mr.onstop = ok; });
    mr.start(); aviso("🎙 Gravando — toque em PARAR quando acabar");
    var lim = setTimeout(function () { if (mr.state === "recording") mr.stop(); }, 90000);
    await acabou; clearTimeout(lim); stream.getTracks().forEach(function (t) { t.stop(); }); DIT.grav = null; botoesMic();
    andamento("Transcrevendo…");
    try {
      var blob = new Blob(partes, { type: partes[0] && partes[0].type || "audio/webm" }), Ctx = window.AudioContext || window.webkitAudioContext, ctx = new Ctx();
      var buf = await blob.arrayBuffer(), a = await new Promise(function (ok, erro) { var pr = ctx.decodeAudioData(buf, ok, erro); if (pr && pr.then) pr.then(ok, erro); }); try { ctx.close(); } catch (e) { }
      var off = new OfflineAudioContext(1, Math.ceil(a.duration * 16000), 16000), src = off.createBufferSource(); src.buffer = a; src.connect(off.destination); src.start(); var r16 = await off.startRendering();
      var r = await fetch(FN_TXT + "?lang=pt", { method: "POST", headers: { "Content-Type": "audio/wav", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: wav16(r16.getChannelData(0)) });
      var j = await r.json().catch(function () { return {}; }); andamento("");
      if (!r.ok) throw new Error(r.status === 429 ? "o limite de hoje da IA acabou" : "a transcrição falhou");
      var t = String(j.texto || (j.segmentos || []).map(function (x) { return x.texto || x.text; }).join(" ") || "").trim();
      var alvo = $(id) || el; if (!t) { aviso("Não ouvi nada — tente mais perto do microfone", true); return; }
      setCampo(alvo, juntar(base, t)); if (!/^ia/.test(id)) corrigirCampo(id);
    } catch (e) { andamento(""); aviso("Não consegui transcrever: " + (e && e.message || "erro"), true); }
  }
  /* correção sem IA (sem conta): espaços, vícios de fala, maiúsculas e ponto final */
  function corrigirBasico(t, lista) {
    var f = function (s) {
      s = String(s || "").replace(/[ \t]+/g, " ").replace(/(^|[\s,])(né|tipo assim|tá|aí)(?=[\s,.!?]|$),?/gi, "$1").replace(/\s+([,.!?;:])/g, "$1").replace(/ {2,}/g, " ").trim();
      if (!s) return s; s = s.replace(/(^|[.!?]\s+)([a-zà-ú])/g, function (_, a, b) { return a + b.toUpperCase(); });
      return lista || /[.!?…:]$/.test(s) ? s : s + ".";
    };
    return lista ? String(t || "").split(/\n+/).map(f).filter(Boolean).join("\n") : String(t || "").split(/\n\s*\n/).map(f).filter(Boolean).join("\n\n");
  }
  async function corrigirCampo(id) {
    var el = $(id); if (!el) return; var t = el.value.trim(); if (t.length < 3) { aviso("Escreva ou fale algo antes", true); return; }
    if (DIT.antes[id] == null) DIT.antes[id] = el.value;
    var lista = el.hasAttribute("data-lista"), rot = el.getAttribute("data-rot") || "Texto";
    andamento("Corrigindo o texto…");
    var sistema = "Você revisa textos de apresentação pessoal em português do Brasil. Corrija ortografia, acentos, pontuação e maiúsculas; tire vícios de fala (né, tipo, então, aí, é…), repetições e frases emendadas de quem ditou. Deixe claro e profissional, na primeira ou terceira pessoa como estiver. NUNCA acrescente fatos, números, nomes ou elogios que não estejam no texto e não mude o sentido." +
      (lista ? " O campo é uma LISTA: devolva um item por linha, sem marcadores." : " Separe parágrafos com uma linha em branco.") + " Responda só com o texto corrigido, sem comentários.";
    var r = await ia(sistema, "Campo: " + rot + "\nTexto:\n" + t, 1600);
    andamento("");
    var novo = r.erro ? corrigirBasico(t, lista) : limpar(String(r.texto || r.resposta || "").replace(/^["“]|["”]$/g, ""));
    if (!novo) { aviso("A IA não respondeu agora — tente de novo", true); return; }
    setCampo(el, novo);
    var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = false;
    aviso(r.erro ? (r.erro === "sem_login" ? "Ajuste básico feito — entre na conta para a IA revisar" : "Ajuste básico feito (" + erroIA(r.erro) + ")") : "Texto corrigido ✓");
  }
  function voltarCampo(id) { var el = $(id); if (!el || DIT.antes[id] == null) return; setCampo(el, DIT.antes[id]); delete DIT.antes[id]; var b = $("form").querySelector('[data-a="voltarCampo"][data-alvo="' + id + '"]'); if (b) b.hidden = true; aviso("↺ Voltou ao que estava"); }

  function definir(k, v) {
    var p = k.split("."), o = KIT;
    for (var i = 0; i < p.length - 1; i++) { var a = p[i]; if (o[a] == null) o[a] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[a]; }
    o[p[p.length - 1]] = v;
  }
  function aoDigitar(e) {
    var el = e.target; if (!el.getAttribute || !el.hasAttribute("data-k") || !KIT) return;
    definir(el.getAttribute("data-k"), el.value);
    guardar(); agendarPrevia();
  }

  /* ---------- PRÉVIA = o próprio PDF ---------- */
  var tPrevia = 0, GER = 0;
  function agendarPrevia(ms) { clearTimeout(tPrevia); $("prevEstado").textContent = "Atualizando…"; tPrevia = setTimeout(desenharPrevia, ms == null ? 650 : ms); }
  async function desenharPrevia() {
    if (!KIT || VISTA !== "editor") return;
    var ger = ++GER;
    try {
      var m = await modelo(KIT, IMGS), bytes = await pdfBytes(defPdf(m)); if (ger !== GER) return;
      var J = await pdfjs(), doc = await J.getDocument({ data: bytes, isEvalSupported: false }).promise; if (ger !== GER) { doc.destroy(); return; }
      var caixa = $("paginas"), larg = Math.max(260, Math.min(caixa.clientWidth || 480, 900)), dpr = Math.min(2, window.devicePixelRatio || 1), novos = [];
      for (var i = 1; i <= doc.numPages; i++) {
        var pg = await doc.getPage(i), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: larg * dpr / vp0.width });
        var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height); c.className = "pk-pag"; c.setAttribute("aria-label", "Página " + i);
        await pg.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise; if (ger !== GER) { doc.destroy(); return; }
        novos.push(c);
      }
      PAGS = doc.numPages; doc.destroy();
      caixa.innerHTML = ""; novos.forEach(function (c) { caixa.appendChild(c); });
      $("prevEstado").textContent = PAGS + (PAGS === 1 ? " página" : " páginas") + " · igual ao PDF";
      $("abaPrev").textContent = "👁 PRÉVIA (" + PAGS + ")";
      try { var t = document.createElement("canvas"); t.width = 240; t.height = Math.round(240 * novos[0].height / novos[0].width); t.getContext("2d").drawImage(novos[0], 0, 0, t.width, t.height); idbPut("thumbs", "kit-" + KIT.id, t.toDataURL("image/jpeg", 0.8)); } catch (e) { }
    } catch (e) {
      if (ger === GER) { $("prevEstado").textContent = "Sem prévia agora (" + (e && e.message === "sem internet" ? "sem internet" : "tente de novo") + ")."; }
    }
  }

  /* ---------- SAÍDAS ---------- */
  async function gerarPdf(semBaixar) {
    andamento("Gerando o PDF…");
    try { var m = await modelo(KIT, IMGS, { alta: true }), b = new Blob([await pdfBytes(defPdf(m))], { type: "application/pdf" }); andamento(""); if (!semBaixar) { baixar(b, nomeArq(KIT, "pdf")); aviso("PDF pronto ✓"); } return b; }
    catch (e) { andamento(""); aviso("Não deu para gerar o PDF (sem internet?)", true); return null; }
  }
  async function gerarWord() {
    andamento("Gerando o Word…");
    try { var m = await modelo(KIT, IMGS, { alta: true }), b = await wordBlob(m); andamento(""); baixar(b, nomeArq(KIT, "docx")); aviso("Word pronto ✓ — abre no Word e no Google Docs"); }
    catch (e) { andamento(""); aviso("Não deu para gerar o Word (sem internet?)", true); }
  }
  function textoKit(m) {
    var d = KIT.d, c = d.contato || {}, l = [m.marca, m.slogan, "", d.sobreCurto || "", "", d.sobre || ""];
    (d.links || []).forEach(function (x) { if (x && x.url) l.push((x.rot || "Link") + ": " + x.url); });
    l.push("", "CONTATO", [c.resp, c.cargo].filter(Boolean).join(" — "), c.tel || "", c.email || "", c.site || "", c.insta || "", c.tiktok || "", c.youtube || "");
    return l.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
  }
  async function gerarZip() {
    andamento("Montando o pacote para imprensa…");
    try {
      await carregar("zip"); var pdf = await gerarPdf(true); if (!pdf) return;
      andamento("Montando o pacote para imprensa…");
      var z = new JSZip(), m = await modelo(KIT, IMGS), base = nomeArq(KIT, "x").replace(/\.x$/, "");
      z.file(base + ".pdf", pdf);
      var add = function (nome, u) { if (u) z.file(nome, binDe(u)); };
      add("logo." + (/^data:image\/png/.test(IMGS.logo || "") ? "png" : "jpg"), IMGS.logo);
      add("fotos/capa.jpg", IMGS.capa); add("fotos/retrato.png", IMGS.retrato);
      (IMGS.fotos || []).forEach(function (u, i) { add("fotos/foto-" + String(i + 1).padStart(2, "0") + "." + (/^data:image\/png/.test(u) ? "png" : "jpg"), u); });
      z.file("textos/apresentacao.txt", textoKit(m));
      var r = KIT.d.release || {}; if (String(r.titulo || r.texto || "").trim()) z.file("textos/release.txt", [r.titulo, r.data, "", r.texto].filter(function (x) { return x != null; }).join("\n").trim() + "\n");
      var b = await z.generateAsync({ type: "blob" }); andamento(""); baixar(b, base + "-imprensa.zip"); aviso("Pacote para imprensa pronto ✓");
    } catch (e) { andamento(""); aviso("Não deu para montar o pacote.", true); }
  }
  async function compartilhar() {
    var b = await gerarPdf(true); if (!b) return;
    var f = new File([b], nomeArq(KIT, "pdf"), { type: "application/pdf" });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: "Press kit — " + (KIT.d.marca || "") }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    baixar(b, f.name); aviso("Este aparelho não compartilha arquivos — o PDF foi baixado.");
  }

  /* ---------- MINHA EMPRESA (dados do Gerador de orçamento) ---------- */
  function cfgOrc(id) { try { var l = JSON.parse(localStorage.getItem("bw_neg_prop_config_v1") || "[]"); var c = (Array.isArray(l) ? l : []).filter(function (x) { return x.id === id; })[0]; return c ? c.valor : null; } catch (e) { return null; } }
  function puxarEmpresa() {
    var e = cfgOrc("empresa") || {}, logo = cfgOrc("logo") || "", d = KIT.d, c = d.contato || (d.contato = {}), n = 0;
    var p = function (o, k, v) { if (String(v || "").trim()) { o[k] = String(v).trim(); n++; } };
    p(d, "marca", e.fantasia || e.razao); p(c, "resp", e.resp); p(c, "tel", e.tel); p(c, "email", e.email); p(c, "site", e.site); p(c, "cidade", e.cidade); p(d, "cidade", e.cidade);
    if (logo) { IMGS.logo = logo; guardarImgs(); n++; }
    if (!n) { aviso("Preencha MINHA EMPRESA no Gerador de orçamento primeiro.", true); return; }
    guardar(); desenharForm(); agendarPrevia(0); aviso("Dados da sua empresa aplicados ✓");
  }

  /* ---------- IA (só o texto que a pessoa digitou) ---------- */
  async function sessao() { try { var c = window.BWSync && BWSync.cliente(); var s = c ? await c.auth.getSession() : null; return s && s.data && s.data.session || null; } catch (e) { return null; } }
  async function ia(sistema, pedido, max) {
    var s = await sessao(); if (!s) return { erro: "sem_login" };
    try { var r = await fetch(FN_TXT, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.access_token, "apikey": PUB }, body: JSON.stringify({ sistema: sistema, pedido: pedido, max: max || 1400, nivel: "inteligente" }) });
      var j = await r.json().catch(function () { return {}; }); if (!r.ok) return { erro: j.erro || "http_" + r.status }; return j; } catch (e) { return { erro: "rede" }; }
  }
  function jsonDe(t) { t = String(t || "").replace(/```(json)?/g, ""); var a = t.indexOf("{"), b = t.lastIndexOf("}"); if (a < 0 || b <= a) return null; try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; } }
  function limpar(t) { return String(t || "").replace(/\*\*|__|^#+\s*/gm, "").trim(); }
  function erroIA(e) { return { sem_login: "Entre na sua conta para usar a IA.", limite: "Limite diário da IA atingido.", ocupada: "A IA está ocupada. Tente em alguns segundos.", rede: "Sem internet agora." }[e] || "A IA não respondeu agora (" + e + ")."; }
  function modal(html) { $("modalCx").innerHTML = html; $("modal").hidden = false; var f = $("modalCx").querySelector("textarea,input"); if (f) setTimeout(function () { f.focus(); }, 50); }
  function fecharModal() { $("modal").hidden = true; $("modalCx").innerHTML = ""; }
  var DESFAZER_IA = null;
  function abrirIaSobre() {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>🎙 Conte sobre você</h3><p class="tf-sub">Fale ou escreva do seu jeito, sem se preocupar com a ordem: quem você é, o que faz, há quanto tempo, onde já trabalhou, cursos, habilidades, suas medidas (se for modelo). A IA corrige e coloca cada coisa no lugar certo — <b>não inventa nada</b>.</p>' +
      '<textarea class="pk-in" id="iaTexto" rows="7" maxlength="4000" placeholder="Ex.: sou atriz há 10 anos, comecei no teatro em BH, fiz a série tal na TV, campanha do banco tal, falo inglês e espanhol, canto…"></textarea>' + vozBarra("iaTexto").replace(/<button[^>]*data-a="corrigir"[^>]*>[^<]*<\/button>|<button[^>]*data-a="voltarCampo"[^>]*>[^<]*<\/button>/g, "") +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="iaSobreIr">✨ MONTAR MINHA APRESENTAÇÃO</button></div><p class="bw-msg" id="iaMsg"></p>');
  }
  var LISTAS_IA = { servicos: ["t", "d"], experiencia: ["grupo", "titulo", "papel", "onde", "ano"], formacao: ["ano", "curso", "onde"], perfil: ["k", "v"], numeros: ["v", "r"] };
  async function iaSobre() {
    var txt = ($("iaTexto").value || "").trim(); if (txt.length < 10) { $("iaMsg").textContent = "Fale ou escreva um pouco mais sobre você."; return; }
    pararDit(); $("iaMsg").textContent = "Montando…";
    var d = KIT.d, mod = modeloDe(KIT.modelo), sistema = "Você monta apresentações pessoais (press kit, book, mídia kit, currículo visual) em português do Brasil, em tom claro, confiante e sem exageros. " +
      "O texto pode ter sido DITADO: corrija ortografia, pontuação e vícios de fala. Use SÓ o que a pessoa contou: nunca invente números, trabalhos, clientes, prêmios, datas, medidas ou cidades. Não troque o nome. " +
      "Responda SÓ com JSON, deixando de fora (ou vazio) o que a pessoa não disse: {\"slogan\":\"o que faz, até 10 palavras\",\"curto\":\"frase de destaque até 30 palavras\",\"longo\":\"2 ou 3 parágrafos na primeira pessoa separados por linha em branco, até 170 palavras\"," +
      "\"servicos\":[{\"t\":\"o que faz\",\"d\":\"uma frase\"}],\"experiencia\":[{\"grupo\":\"ex.: TV e publicidade, Eventos, Teatro\",\"titulo\":\"trabalho\",\"papel\":\"função\",\"onde\":\"onde/para quem\",\"ano\":\"\"}],\"formacao\":[{\"ano\":\"\",\"curso\":\"\",\"onde\":\"\"}]," +
      "\"habilidades\":[\"uma por item\"],\"perfil\":[{\"k\":\"ex.: Altura, Idiomas, DRT\",\"v\":\"\"}],\"numeros\":[{\"v\":\"número dito\",\"r\":\"o que ele mostra\"}]}.";
    var r = await ia(sistema, "Nome: " + (d.marca || "") + "\nTipo: " + mod.nome + "\nO que a pessoa contou:\n" + txt, 2200);
    if (r.erro) { $("iaMsg").textContent = erroIA(r.erro); return; }
    var j = jsonDe(r.texto || r.resposta || ""); if (!j || !(j.longo || j.curto || j.servicos || j.experiencia)) { $("iaMsg").textContent = "A IA não respondeu no formato certo. Tente de novo."; return; }
    DESFAZER_IA = { __d: clone(KIT.d), __oc: clone(KIT.ocultas || []) };
    var mostrar = function (id) { KIT.ocultas = (KIT.ocultas || []).filter(function (x) { return x !== id; }); }, n = 0;
    if (j.slogan) { d.slogan = limpar(j.slogan); n++; } if (j.curto) { d.sobreCurto = limpar(j.curto); n++; } if (j.longo) { d.sobre = limpar(j.longo); mostrar("sobre"); n++; }
    Object.keys(LISTAS_IA).forEach(function (l) {
      var v = Array.isArray(j[l]) ? j[l].map(function (x) { var o = {}; LISTAS_IA[l].forEach(function (c) { o[c] = limpar(x && x[c] || ""); }); if (l === "experiencia") o.link = ""; return o; }).filter(function (o) { return LISTAS_IA[l].some(function (c) { return o[c]; }); }) : [];
      if (v.length) { d[l] = v; mostrar(l); n++; }
    });
    if (Array.isArray(j.habilidades) && j.habilidades.length) { d.habilidades = j.habilidades.map(limpar).filter(Boolean).join("\n"); mostrar("habilidades"); n++; }
    KIT.exemplo = false; guardar(); fecharModal(); desenharForm(); agendarPrevia(0);
    aviso("Apresentação montada ✓ — " + n + " partes preenchidas"); mostrarDesfazer();
  }
  function abrirIaRelease() {
    modal('<button type="button" class="pk-mx" data-a="fecharModal" aria-label="Fechar">✕</button><h3>✨ Escrever o release com IA</h3><p class="tf-sub">Qual é a novidade? Um lançamento, um evento, um serviço novo, um prêmio… Diga o quê, quando e onde. A IA usa também o que já está no seu press kit.</p>' +
      '<textarea class="pk-in" id="iaTexto" rows="5" maxlength="2000" placeholder="Ex.: lançamos transmissão em 4K para eventos de empresas a partir de dezembro, em BH e região…"></textarea>' +
      '<div class="pk-chips" style="margin-top:12px"><button type="button" class="bw-btn pri" data-a="iaReleaseIr">✨ ESCREVER O RELEASE</button></div><p class="bw-msg" id="iaMsg"></p>');
  }
  async function iaRelease() {
    var txt = ($("iaTexto").value || "").trim(); if (txt.length < 10) { $("iaMsg").textContent = "Conte qual é a novidade."; return; }
    $("iaMsg").textContent = "Escrevendo…";
    var d = KIT.d, sistema = "Você é assessor de imprensa e escreve releases em português do Brasil no padrão jornalístico (pirâmide invertida: o mais importante no primeiro parágrafo; terceira pessoa; sem adjetivos exagerados). Use SÓ as informações dadas; nunca invente números, falas, datas, preços ou nomes. Não troque o nome da marca. Responda SÓ com JSON: {\"titulo\":\"título jornalístico de até 16 palavras\",\"texto\":\"3 a 4 parágrafos separados por linha em branco, até 260 palavras\"}.";
    var base = ["Nome: " + (d.marca || ""), "Apresentação: " + (d.sobreCurto || ""), "Cidade: " + (d.cidade || "")].join("\n");
    var r = await ia(sistema, base + "\nNovidade contada pela pessoa:\n" + txt);
    if (r.erro) { $("iaMsg").textContent = erroIA(r.erro); return; }
    var j = jsonDe(r.texto || r.resposta || ""); if (!j || !j.texto) { $("iaMsg").textContent = "A IA não respondeu no formato certo. Tente de novo."; return; }
    var rel = d.release || (d.release = {}); DESFAZER_IA = { release: clone(rel) };
    rel.titulo = limpar(j.titulo || rel.titulo || ""); rel.texto = limpar(j.texto);
    if ((KIT.ocultas || []).indexOf("release") >= 0) KIT.ocultas = KIT.ocultas.filter(function (x) { return x !== "release"; });
    KIT.exemplo = false; guardar(); fecharModal(); desenharForm(); agendarPrevia(0);
    aviso("Release escrito ✓ — confira e ajuste"); mostrarDesfazer();
  }
  function mostrarDesfazer() { var b = $("btnDesfazerIA"); if (b) { b.hidden = false; clearTimeout(b._t); b._t = setTimeout(function () { b.hidden = true; DESFAZER_IA = null; }, 20000); } }
  function desfazerIA() { if (!DESFAZER_IA || !KIT) return; if (DESFAZER_IA.__d) { KIT.d = DESFAZER_IA.__d; KIT.ocultas = DESFAZER_IA.__oc; } else Object.keys(DESFAZER_IA).forEach(function (k) { KIT.d[k] = DESFAZER_IA[k]; }); DESFAZER_IA = null; $("btnDesfazerIA").hidden = true; guardar(); desenharForm(); agendarPrevia(0); aviso("↺ Voltou ao seu texto"); }

  /* ---------- AÇÕES ---------- */
  function mover(arr, i, j) { if (j < 0 || j >= arr.length) return; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; }
  var NOVOS = { perfil: { k: "", v: "" }, experiencia: { grupo: "", titulo: "", papel: "", onde: "", ano: "", link: "" }, formacao: { ano: "", curso: "", onde: "" }, links: { rot: "", url: "" }, numeros: { v: "", r: "" }, servicos: { t: "", d: "" }, depoimentos: { texto: "", autor: "", cargo: "" }, imprensa: { veiculo: "", titulo: "", data: "", link: "" }, agenda: { data: "", titulo: "", local: "" } };
  async function acao(a, el) {
    var id = el.getAttribute("data-id"), d = KIT && KIT.d;
    if (a === "novo") { mostrar("modelos"); desenharModelos(); }
    else if (a === "voltarLista") { KIT = null; mostrar("lista"); desenharLista(); }
    else if (a === "usarModelo") await criarKit(el.getAttribute("data-m"));
    else if (a === "abrir") await abrirKit(id);
    else if (a === "duplicar") { var k = acharKit(id); if (!k) return; var n = clone(k); n.id = uid(); n.nome = (k.nome || "Press kit") + " (cópia)"; n.criado = new Date().toISOString(); salvarKit(n); var im = await idbGet("imgs", k.id); if (im) await idbPut("imgs", n.id, im); var th = await idbGet("thumbs", "kit-" + k.id); if (th) await idbPut("thumbs", "kit-" + n.id, th); desenharLista(); aviso("Cópia criada ✓"); }
    else if (a === "excluir") { var k2 = acharKit(id); if (!k2 || !confirm("Excluir o press kit \"" + (k2.nome || "") + "\"? Isso não pode ser desfeito.")) return; gravarLista(lista().filter(function (x) { return x.id !== id; })); await idbDel("imgs", id); await idbDel("thumbs", "kit-" + id); desenharLista(); aviso("Press kit excluído"); }
    else if (a === "trocarModelo") { var md = modeloDe(el.getAttribute("data-m")); KIT.modelo = md.id; KIT.cor = md.cor; KIT.cor2 = md.cor2; KIT.fonte = md.fonte; KIT.formato = md.formato; guardar(); desenharForm(); agendarPrevia(0); aviso("Modelo " + md.nome + " ✓"); }
    else if (a === "coresModelo") { var m2 = modeloDe(KIT.modelo); KIT.cor = m2.cor; KIT.cor2 = m2.cor2; KIT.fonte = m2.fonte; guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "coresEmpresa") { var e = cfgOrc("empresa") || {}; if (!e.cor) { aviso("Sem cor salva em MINHA EMPRESA (Gerador de orçamento).", true); return; } KIT.cor = e.cor; guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "logoEmpresa") { var lg = cfgOrc("logo"); if (!lg) { aviso("Sem logo salva em MINHA EMPRESA (Gerador de orçamento).", true); return; } IMGS.logo = lg; guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "puxarEmpresa") puxarEmpresa();
    else if (a === "tirarImg") { IMGS[el.getAttribute("data-v")] = ""; if (IMGS.origs) delete IMGS.origs[el.getAttribute("data-v")]; guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "vis") { var s = el.getAttribute("data-s"), oc = KIT.ocultas || (KIT.ocultas = []); if (el.checked) KIT.ocultas = oc.filter(function (x) { return x !== s; }); else if (oc.indexOf(s) < 0) oc.push(s); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "sobe" || a === "desce") { var o = KIT.ordem || (KIT.ordem = TODAS.slice()), i = o.indexOf(el.getAttribute("data-s")); TODAS.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); i = o.indexOf(el.getAttribute("data-s")); mover(o, i, a === "sobe" ? i - 1 : i + 1); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "addItem") { var l = el.getAttribute("data-l"); (d[l] || (d[l] = [])).push(clone(NOVOS[l])); guardar(); desenharForm(); var c = $("form").querySelectorAll('[data-k^="d.' + l + '."]'); if (c.length) { var alvo = c[c.length - Object.keys(NOVOS[l]).length]; if (alvo) alvo.focus(); } }
    else if (a === "tirarItem") { d[el.getAttribute("data-l")].splice(+el.getAttribute("data-i"), 1); guardar(); desenharForm(); agendarPrevia(0); }
    else if (a === "fotoTira") { IMGS.origs = Object.keys(IMGS.origs || {}).filter(function (x) { return x[0] !== "f"; }).reduce(function (o, x) { o[x] = IMGS.origs[x]; return o; }, {}); IMGS.fotos.splice(+el.getAttribute("data-i"), 1); guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "fotoEsq" || a === "fotoDir") { var fi = +el.getAttribute("data-i"), oo = IMGS.origs || {}, ja = oo["f" + fi], jb = oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)]; if (ja || jb) { delete oo["f" + fi]; delete oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)]; if (ja) oo["f" + (a === "fotoEsq" ? fi - 1 : fi + 1)] = ja; if (jb) oo["f" + fi] = jb; } mover(IMGS.fotos, fi, a === "fotoEsq" ? fi - 1 : fi + 1); guardarImgs(); desenharForm(); agendarPrevia(0); }
    else if (a === "limparExemplo") {
      if (!confirm("Apagar todos os textos e fotos do exemplo e começar do zero? O modelo e as cores continuam.")) return;
      var vazio = base({ etiqueta: KIT.d.etiqueta || "APRESENTAÇÃO PESSOAL" }); (modeloDe(KIT.modelo).ordem || []).forEach(function (id) { if (NOVOS[id]) vazio[id] = [clone(NOVOS[id])]; });
      KIT.d = vazio; KIT.exemplo = false; KIT.nome = "Minha apresentação"; DIT.antes = {}; IMGS = imgsVazias(); guardarImgs(); guardar(); desenharForm(); agendarPrevia(0); aviso("Exemplo apagado — agora é com você");
    }
    else if (a === "pdf") gerarPdf();
    else if (a === "word") gerarWord();
    else if (a === "zip") gerarZip();
    else if (a === "compartilhar") compartilhar();
    else if (a === "iaSobre") abrirIaSobre();
    else if (a === "iaSobreIr") iaSobre();
    else if (a === "iaRelease") abrirIaRelease();
    else if (a === "iaReleaseIr") iaRelease();
    else if (a === "desfazerIA") desfazerIA();
    else if (a === "falar") falar(el.getAttribute("data-alvo"));
    else if (a === "fotoIA") { var px = FOTO_IA.filter(function (x) { return x.id === el.getAttribute("data-p"); })[0]; if (!$("modal").hidden) fecharModal(); if (px) fotoIA(el.getAttribute("data-alvo"), px.p); }
    else if (a === "fotoIAvolta") { if (!$("modal").hidden) fecharModal(); fotoIAvolta(el.getAttribute("data-alvo")); }
    else if (a === "fotoIAlivre") fotoIAlivre(el.getAttribute("data-alvo"));
    else if (a === "fotoIAmenu") fotoIAmenu(el.getAttribute("data-i"));
    else if (a === "fotoIAlivreIr") { var tl = ($("iaFotoTexto").value || "").trim(); if (tl.length < 4) { aviso("Diga o que mudar na foto", true); return; } pararDit(); fecharModal(); fotoIA(el.getAttribute("data-alvo"), MANTER + "Edit the photo as follows (user request in Portuguese): " + tl); }
    else if (a === "corrigir") corrigirCampo(el.getAttribute("data-alvo"));
    else if (a === "voltarCampo") voltarCampo(el.getAttribute("data-alvo"));
    else if (a === "servFotos") { KIT.servFotos = !!el.checked; guardar(); agendarPrevia(0); }
    else if (a === "fecharModal") fecharModal();
    else if (a === "aba") { var v = el.getAttribute("data-v"); $("vEd").setAttribute("data-aba", v); [].slice.call(document.querySelectorAll(".pk-aba")).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === v); b.setAttribute("aria-pressed", String(b.getAttribute("data-v") === v)); }); if (v === "prev") agendarPrevia(0); window.scrollTo(0, 0); }
  }
  async function aoEscolherArquivo(inp) {
    var alvo = inp.getAttribute("data-up"), fs = [].slice.call(inp.files || []); if (!fs.length || !KIT) return;
    andamento("Lendo a imagem…");
    try {
      if (alvo === "logo") IMGS.logo = await arquivoParaUrl(fs[0], 1600, true);
      else if (alvo === "retrato") { IMGS.retrato = await arquivoParaUrl(fs[0], 1800, true); if (IMGS.origs) delete IMGS.origs.retrato; }
      else if (alvo === "capa") { IMGS.capa = await arquivoParaUrl(fs[0], 2400, false); if (IMGS.origs) delete IMGS.origs.capa; }
      else { for (var i = 0; i < fs.length && IMGS.fotos.length < 7; i++) IMGS.fotos.push(await arquivoParaUrl(fs[i], 2000, false)); }
      andamento(""); guardarImgs(); desenharForm(); agendarPrevia(0); aviso(alvo === "fotos" ? "Fotos na galeria ✓" : alvo === "logo" ? "Logo aplicada ✓" : alvo === "retrato" ? "Foto recortada aplicada ✓" : "Foto da capa aplicada ✓");
    } catch (e) { andamento(""); aviso("Não deu para abrir essa imagem. Tente outra (JPG ou PNG).", true); }
    try { inp.value = ""; } catch (e) { }
  }

  function iniciar() {
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-a]"); if (!b || b.tagName === "INPUT" || !b.closest(".wrap, #modal")) return;
      if (b.disabled) return; e.preventDefault(); acao(b.getAttribute("data-a"), b);
    });
    document.addEventListener("change", function (e) {
      var t = e.target; if (!t || !t.getAttribute) return;
      if (t.hasAttribute("data-up")) { aoEscolherArquivo(t); return; }
      if (t.getAttribute("data-a") === "vis" || t.getAttribute("data-a") === "servFotos") { acao(t.getAttribute("data-a"), t); return; }
      if (t.hasAttribute("data-k")) aoDigitar(e);
    });
    document.addEventListener("input", function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute("data-k") && e.target.type !== "color") aoDigitar(e); });
    $("edNome").addEventListener("input", function () { if (KIT) { KIT.nome = this.value; guardar(); } });
    $("modal").addEventListener("click", function (e) { if (e.target === this) fecharModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !$("modal").hidden) fecharModal(); });
    var t; window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(function () { if (VISTA === "editor") agendarPrevia(200); }, 300); });
    /* dados que chegam de outro aparelho: só redesenha a lista (o editor aberto não é atropelado) */
    window.addEventListener("bw-dados", function () { if (VISTA === "lista") desenharLista(); });
    var q = new URLSearchParams(location.search), k = q.get("k"), mdl = q.get("modelo");
    if (k && acharKit(k)) abrirKit(k);
    else if (mdl && MODELOS.some(function (m) { return m.id === mdl; })) criarKit(mdl);
    else { mostrar("lista"); desenharLista(); }
  }
  window.BWPressKit = { modelos: MODELOS, modelo: modelo, defPdf: defPdf, kitNovo: kitNovo, imgsExemplo: imgsExemplo, atual: function () { return KIT; }, previa: desenharPrevia, paginas: function () { return PAGS; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
