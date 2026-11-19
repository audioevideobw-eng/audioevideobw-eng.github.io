/* PERSONAGENS PRONTOS (19/11/2026, Claude) — biblioteca oficial da Brightway, igual para todas as contas.
   Bonecos 3D realistas criados pela IA criativa da plataforma (pessoas INVENTADAS, sem marcas), cada um em 5 ângulos
   para animações futuras. Imagens no bucket público "trends", pasta pers/<id>-<angulo>.jpg.
   Ao tocar em ＋ USAR, as imagens são copiadas para a biblioteca do aparelho (BWPersonagens) e o personagem passa a
   aparecer no Quadro de História, no BW Reels e no editor de vídeo. Este arquivo só lista; não grava nada. */
(function () {
  var BASE = "https://zdtnetplvdonogmdvarx.supabase.co/storage/v1/object/public/trends/pers/";
  var ESTILO = "stylized semi-realistic 3D animated character like a premium animation movie, slightly large head and hands, smooth detailed skin and fabric textures, plain light grey studio background, soft cinematic lighting, high quality 3D render";
  var ANGULOS = [["frente", "FRENTE"], ["perfil", "PERFIL"], ["costas", "COSTAS"], ["rosto", "ROSTO"], ["acao", "AÇÃO"]];
  function p(id, nome, papel, cat, cores, aparencia, roupa, jeito, en) {
    var planos = {}; ANGULOS.forEach(function (a) { planos[a[0]] = BASE + id + "-" + a[0] + ".jpg"; });
    return {id: id, nome: nome, papel: papel, categoria: cat, cores: cores, planos: planos,
      ficha: {nome: nome, papel: papel, aparencia: aparencia, roupa: roupa, personalidade: jeito, estilo: "boneco 3D realista (estilo filme de animação)",
        prompt: "A full-body 3D character: " + en + ". " + ESTILO + "."}};
  }
  var LISTA = [
    p("futebol", "Gabi Gol", "Jogadora de futebol", "Esporte", ["#16a34a", "#facc15"], "jovem, rabo de cavalo alto, sorriso confiante", "camisa verde e amarela sem marca, short branco, meião e chuteira", "competitiva e animada",
      "an invented young woman soccer player with a high ponytail, green and yellow generic jersey with no logos, white shorts, long socks and cleats"),
    p("pirata", "Capitão Bento", "Pirata", "Aventura", ["#7c2d12", "#ef4444"], "barba preta curta, sorriso brincalhão", "chapéu de três pontas, camisa branca, colete de couro, calça escura e botas", "aventureiro e engraçado",
      "an invented smiling pirate captain with a short black beard, black tricorn hat, white shirt, brown leather vest, dark pants and tall brown boots, cartoon adventure character"),
    p("bombeiro", "Sargento Lúcio", "Bombeiro", "Profissões", ["#dc2626", "#f59e0b"], "barba curta, ombros largos", "capacete vermelho, farda bege com faixas refletivas, botas e luvas", "corajoso e protetor",
      "an invented firefighter man with a short beard, red helmet, tan turnout coat and pants with yellow reflective stripes, black boots and gloves"),
    p("palhaco", "Pipoca", "Palhaço", "Festa", ["#f43f5e", "#a855f7"], "nariz vermelho, cabelo laranja cacheado, rosto pintado de branco", "roupa larga de bolinhas coloridas e sapatos enormes", "alegre e atrapalhado",
      "an invented cheerful clown with a red round nose, curly orange hair, white face paint with a big painted smile, colorful polka dot oversized suit and huge shoes"),
    p("chef", "Chef Dora", "Chef de cozinha", "Profissões", ["#f97316", "#fde047"], "cabelo preso em coque, sorriso caloroso", "chapéu de chef, dólmã branco, avental preto", "caprichosa e exigente",
      "an invented woman chef with a white chef hat, white double-breasted chef jacket, black apron and black pants, hair in a bun"),
    p("astronauta", "Leo Lua", "Astronauta", "Aventura", ["#2563eb", "#f97316"], "jovem, cabelo castanho curto", "traje espacial branco e laranja, capacete debaixo do braço", "curioso e sonhador",
      "an invented young astronaut man in a white and orange space suit with generic patches and no flags, helmet under the arm, short brown hair"),
    p("medica", "Dra. Clara", "Médica", "Profissões", ["#0ea5e9", "#10b981"], "óculos, cabelo escuro ondulado", "jaleco branco, roupa azul-clara, estetoscópio", "calma e atenciosa",
      "an invented woman doctor with glasses, long white lab coat over light blue scrubs, stethoscope around the neck, dark wavy hair"),
    p("cinegrafista", "Téo Câmera", "Cinegrafista", "Eventos", ["#7c3aed", "#38bdf8"], "jovem, boné virado para trás", "camiseta preta, calça cargo, tênis, fone no pescoço e câmera no ombro", "agitado e criativo",
      "an invented young cameraman with a backwards cap, black t-shirt, cargo pants and sneakers, holding a professional video camera on the shoulder, headphones around the neck"),
    p("dj", "DJ Nina", "DJ", "Eventos", ["#ec4899", "#8b5cf6"], "cabelo curto rosa", "fone grande, moletom preto com detalhes neon, jeans rasgado e tênis", "animada e descolada",
      "an invented young woman DJ with short pink hair, big headphones, oversized black hoodie with neon accents, ripped jeans and chunky sneakers"),
    p("professora", "Prof. Bia", "Professora", "Profissões", ["#ca8a04", "#2563eb"], "jovem, cabelo cacheado preso, óculos redondos", "cardigã mostarda, blusa branca, saia azul, livros na mão", "paciente e animada",
      "an invented friendly young woman teacher with curly brown hair in a ponytail, round glasses, mustard yellow cardigan over a white blouse, navy skirt and flat shoes, holding a stack of books"),
    p("surfista", "Kai", "Surfista", "Aventura", ["#06b6d4", "#facc15"], "jovem, cabelo comprido ondulado queimado de sol", "camiseta de surfe turquesa, bermuda colorida, prancha amarela", "tranquila e corajosa",
      "an invented young woman surfer with long wavy sun-bleached hair, turquoise short-sleeve wetsuit top, colorful board shorts, barefoot, holding a yellow surfboard under one arm"),
    p("bailarina", "Lia", "Bailarina", "Arte", ["#f472b6", "#c4b5fd"], "jovem, cabelo em coque", "tutu rosa-claro, meia-calça e sapatilha de ponta", "delicada e determinada",
      "an invented young ballerina with a hair bun, pastel pink tutu, tights and pointe shoes")
  ];
  window.BWPersonagensProntos = {lista: LISTA, ANGULOS: ANGULOS, BASE: BASE};
})();
