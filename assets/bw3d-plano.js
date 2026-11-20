/* assets/bw3d-plano.js — PLANO DO PROJETO 3D (v1, 20/11/2026).
   Olha a MÁQUINA do usuário (placa de vídeo, memória, navegador) e cruza com o TIPO DE PROJETO
   para dizer, sem enrolação: o que dá para fazer aqui, o que precisa de IA, de que placa precisa,
   o que só sai na nuvem e o que não dá. Nada sai do aparelho — só leitura do próprio navegador.
   Números de VRAM dos geradores abertos conferidos em 20/11/2026 (ver FONTES no fim). */
(function () {
  "use strict";

  /* ---------- placas conhecidas: nome → VRAM em GB ---------- */
  var PLACAS = [
    [/rtx\s*(50)?90/i, 32], [/rtx\s*5080/i, 16], [/rtx\s*5070\s*ti/i, 16], [/rtx\s*5070/i, 12],
    [/rtx\s*5060\s*ti/i, 16], [/rtx\s*5060/i, 8], [/rtx\s*5050/i, 8],
    [/rtx\s*4090/i, 24], [/rtx\s*4080/i, 16], [/rtx\s*4070\s*ti\s*super/i, 16], [/rtx\s*4070\s*ti/i, 12],
    [/rtx\s*4070/i, 12], [/rtx\s*4060\s*ti/i, 8], [/rtx\s*4060/i, 8], [/rtx\s*4050/i, 6],
    [/rtx\s*3090/i, 24], [/rtx\s*3080\s*ti/i, 12], [/rtx\s*3080/i, 10], [/rtx\s*3070/i, 8],
    [/rtx\s*3060\s*ti/i, 8], [/rtx\s*3060/i, 12], [/rtx\s*3050/i, 6],
    [/rtx\s*2080/i, 8], [/rtx\s*2070/i, 8], [/rtx\s*2060/i, 6],
    [/rtx\s*a6000/i, 48], [/rtx\s*a5000/i, 24], [/rtx\s*a4000/i, 16], [/\ba100\b/i, 40], [/\bh100\b/i, 80],
    [/gtx\s*1080\s*ti/i, 11], [/gtx\s*1080/i, 8], [/gtx\s*1070/i, 8], [/gtx\s*1660/i, 6], [/gtx\s*1650/i, 4],
    [/radeon.*7900\s*xtx/i, 24], [/radeon.*7900/i, 20], [/radeon.*7800/i, 16], [/radeon.*6800/i, 16],
    [/radeon.*6700/i, 12], [/radeon.*6600/i, 8], [/\barc\s*a7[78]0/i, 16], [/\barc\s*a5[58]0/i, 8],
    [/apple\s*m[1-9]\s*(ultra|max)/i, 32], [/apple\s*m[1-9]\s*pro/i, 18], [/apple\s*m[1-9]/i, 8]
  ];
  var INTEGRADA = /(intel.*(uhd|iris|hd graphics)|amd.*(vega|radeon\(tm\) graphics)|microsoft basic|swiftshader|llvmpipe|mali|adreno|powervr|apple gpu)/i;

  function lerPlaca() {
    var nome = "", via = "navegador";
    try {
      var c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl");
      if (gl) {
        var ext = gl.getExtension("WEBGL_debug_renderer_info");
        nome = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "") : String(gl.getParameter(gl.RENDERER) || "");
      }
    } catch (e) {}
    var limpo = nome.replace(/^ANGLE\s*\(|\)$/gi, "").replace(/\(0x[0-9a-f]+\)/gi, "").replace(/Direct3D.*$/i, "").replace(/,\s*D3D11.*$/i, "").replace(/\s+/g, " ").trim();
    var marca = /nvidia|geforce|rtx|gtx|quadro|tesla/i.test(limpo) ? "nvidia" : /radeon|amd/i.test(limpo) ? "amd" : /apple/i.test(limpo) ? "apple" : /intel|arc/i.test(limpo) ? "intel" : "?";
    var vram = 0, conhecida = false;
    for (var i = 0; i < PLACAS.length; i++) if (PLACAS[i][0].test(limpo)) { vram = PLACAS[i][1]; conhecida = true; break; }
    if (!conhecida && INTEGRADA.test(limpo)) { vram = 0; conhecida = true; }
    return { nome: limpo || "não deu para ler", marca: marca, vram: vram, conhecida: conhecida, integrada: INTEGRADA.test(limpo), via: via };
  }
  function maquina() {
    var p = lerPlaca(), g = null;
    try { g = JSON.parse(localStorage.getItem("ui_3d_maquina") || "null"); } catch (e) {}
    if (g && g.vram != null) { p.vram = g.vram; p.conhecida = true; p.doUsuario = true; if (g.marca) p.marca = g.marca; }
    var cel = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "");
    return { placa: p, ram: navigator.deviceMemory || 0, nucleos: navigator.hardwareConcurrency || 0,
      webgpu: !!navigator.gpu, celular: cel, appBW: !!(window.bwNode || window.BWNode),
      so: /Windows/i.test(navigator.userAgent) ? "Windows" : /Mac/i.test(navigator.userAgent) ? "Mac" : /Linux/i.test(navigator.userAgent) ? "Linux" : "—" };
  }

  /* ---------- geradores 3D abertos (conferido em 20/11/2026) ---------- */
  var GERADORES = [
    { id: "trellis2", nome: "TRELLIS.2 (Microsoft)", vram: 24, licenca: "MIT — pode vender o que sair", cuda: true,
      nota: "melhor qualidade aberta hoje; sai GLB com PBR" },
    { id: "hunyuan-forma", nome: "Hunyuan3D 2.1 — só a forma (Tencent)", vram: 10, licenca: "comunitária, com ressalvas", cuda: true,
      nota: "a malha sai boa; a textura fica para depois (21 GB só ela)" },
    { id: "hunyuan-full", nome: "Hunyuan3D 2.1 completo (forma + textura PBR)", vram: 29, licenca: "comunitária, com ressalvas", cuda: true,
      nota: "é o que mais se parece com o resultado do Tripo" },
    { id: "triposr", nome: "TripoSR", vram: 6, licenca: "MIT", cuda: false,
      nota: "rápido e leve; objeto simples, textura fraca — roda até sem placa (devagar)" }
  ];

  /* ---------- tipos de projeto ---------- */
  var PROJETOS = [
    { id: "logo", icone: "✨", nome: "LOGO 3D DO MEU NEGÓCIO",
      exemplo: "o logo em relevo para vinheta, telão, selo no vídeo, chaveiro impresso",
      ia: false, vram: 0, onde: "ESTÚDIO 3D → LOGO 3D",
      passos: ["Tenha a logo em PNG com fundo transparente", "LOGO 3D → escolha espessura, bisel e acabamento (dourado, prata, cromado)",
        "GERAR VÍDEO para a vinheta ou EXPORTAR GLB/OBJ para o Blender e para impressão 3D"],
      entrega: ["GLB", "OBJ", "PNG transparente", "vídeo do giro (fundo verde ou transparente)"] },
    { id: "evento", icone: "🎪", nome: "PALCO, PAINEL DE LED E CENOGRAFIA",
      exemplo: "mostrar ao cliente como fica o palco, o telão e a estrutura antes do evento",
      ia: false, vram: 0, onde: "ESTÚDIO 3D → MAQUETE DE PALCO E LED",
      passos: ["Monte com medida real: painéis de 0,5 m, treliça, palco, pessoas de escala",
        "A ficha já dá a RESOLUÇÃO EM PIXELS do telão para a arte nascer do tamanho certo",
        "PLANTA EM PDF para o cliente e GLB/OBJ para quem for montar em 3D"],
      entrega: ["PDF da planta", "GLB", "vídeo do giro"] },
    { id: "peca", icone: "🧊", nome: "UMA PEÇA OU PRODUTO EM 3D",
      exemplo: "troféu, embalagem, brinde, objeto do cliente para girar num post",
      ia: "ajuda", vram: 6, onde: "FOTO → 3D (grátis) ou gerador de IA",
      passos: ["Objeto simétrico e simples: FOTO → 3D com frente, lado e costas já resolve",
        "Objeto com detalhe e textura: precisa de gerador de IA (local ou nuvem)",
        "Depois: reduzir a malha, conferir escala e exportar nos formatos do cliente"],
      entrega: ["GLB", "OBJ", "STL (impressão)", "vídeo do giro"] },
    { id: "avatar", icone: "🧍", nome: "AVATAR MEU E DA EQUIPE PARA ANIMAR",
      exemplo: "desenho institucional, mascote da empresa falando, equipe em Reels",
      ia: true, vram: 10, rig: true, onde: "gerador de IA + esqueleto",
      passos: ["Gerar o corpo: IA local (Hunyuan 2.1 a partir de 10 GB) ou nuvem",
        "Esqueleto para animar: Mixamo (grátis, aceita GLB/FBX humanoide) ou o rig do próprio gerador",
        "Animar no Blender, no Unreal ou direto no Mixamo; trazer para o BW Reels como clipe"],
      entrega: ["GLB com esqueleto", "FBX", "clipes de animação"],
      aviso: "Rosto parecido de verdade só sai com gerador de IA. A nossa FOTO → 3D entrega silhueta, não retrato." },
    { id: "jogo", icone: "🎮", nome: "PEÇAS PARA UM JOGO (2D OU 3D)",
      exemplo: "cenário, itens, personagem para um joguinho da marca",
      ia: "ajuda", vram: 6, onde: "2D no CRIADOR IA · 3D com gerador + redução",
      passos: ["Jogo 2D: as artes saem do CRIADOR IA e do Editor de fotos — não precisa de placa nenhuma",
        "Jogo 3D: cada peça precisa ser LEVE (abaixo de 30 mil polígonos) e ter textura em UV",
        "Motor do jogo: Godot (grátis), Unity ou Unreal — todos abrem GLB e FBX"],
      entrega: ["GLB", "FBX", "PNG dos sprites"],
      aviso: "O que sai da IA vem pesado demais para jogo: sem reduzir a malha, trava." },
    { id: "hard", icone: "🏔", nome: "TRABALHO PESADO (cena completa, animação longa)",
      exemplo: "comercial em 3D, cena com vários personagens, render fotorrealista",
      ia: true, vram: 24, onde: "placa forte ou nuvem + Blender",
      passos: ["Gerar cada peça com o melhor modelo aberto (TRELLIS.2, 24 GB) ou API paga",
        "Montar, iluminar e animar no Blender — é aí que mora o trabalho de verdade",
        "Render final: placa forte ou fazenda de render na nuvem"],
      entrega: ["projeto do Blender", "vídeo final"],
      aviso: "Aqui o gargalo deixa de ser a IA e passa a ser o render e o seu tempo." }
  ];

  /* ---------- o veredito ---------- */
  function avaliar(proj, maq) {
    var p = typeof proj === "string" ? PROJETOS.filter(function (x) { return x.id === proj; })[0] : proj;
    if (!p) return null;
    var v = maq.placa.vram, nvidia = maq.placa.marca === "nvidia", r = { projeto: p, nivel: "", titulo: "", porque: "", caminho: [], geradores: [] };
    if (!p.ia) {
      r.nivel = "ok"; r.titulo = "Dá para fazer agora, aqui mesmo";
      r.porque = "Este projeto é geometria, não IA: roda no seu aparelho" + (maq.celular ? " (até no celular)" : "") + ", de graça e sem internet.";
      r.caminho = p.passos; return r;
    }
    var podem = nvidia ? GERADORES.filter(function (g) { return v >= g.vram; }) : [];
    r.geradores = podem;
    var precisa = p.vram;
    if (podem.length && v >= precisa) {
      r.nivel = "ok"; r.titulo = "A sua placa aguenta";
      r.porque = "Com " + v + " GB de vídeo você roda: " + podem.map(function (g) { return g.nome; }).join(" · ") + ".";
      r.caminho = ["Instalar o gerador no seu PC (o app BW faz isso por você)"].concat(p.passos);
    } else if (v > 0 && nvidia) {
      r.nivel = "quase"; r.titulo = "A sua placa faz parte do caminho";
      r.porque = "Você tem " + v + " GB e este projeto pede " + precisa + " GB para rodar aqui. Dá para fazer a parte leve na máquina e a parte pesada na nuvem.";
      r.caminho = ["Parte leve no aparelho (recorte, montagem, redução, formatos, vídeo)",
        "Parte pesada: alugar GPU por hora ou usar uma IA paga por peça",
        "O resultado volta para cá e segue na esteira"].concat(p.passos);
    } else {
      r.nivel = "nuvem"; r.titulo = maq.celular ? "No celular, esta parte é na nuvem" : "Esta parte não roda na sua placa";
      r.porque = maq.placa.integrada || !v
        ? "A sua máquina não tem placa de vídeo dedicada" + (maq.placa.nome !== "não deu para ler" ? " (" + maq.placa.nome + ")" : "") + " — os geradores 3D abertos pedem placa NVIDIA com CUDA."
        : "Os geradores abertos rodam em CUDA (NVIDIA); a sua é " + maq.placa.marca.toUpperCase() + ".";
      r.caminho = ["Gerar na nuvem: IA paga por peça (de centavos a poucos reais) ou aluguel de GPU por hora",
        "Tudo o que vem depois — reduzir, conferir, formatos, maquete, vídeo, entrega — roda aqui no seu aparelho"].concat(p.passos);
      if (!maq.celular) r.caminho.push("Dá para testar o TripoSR na CPU (sem placa), mas é lento e o resultado é simples");
    }
    return r;
  }
  function resumo(maq) {
    var p = maq.placa, l = [];
    l.push(p.nome === "não deu para ler" ? "Placa de vídeo: não deu para ler pelo navegador" : "Placa: " + p.nome);
    if (p.vram) l.push(p.vram + " GB de vídeo (estimado pelo modelo)");
    else if (p.integrada) l.push("vídeo integrado (sem memória dedicada)");
    if (maq.ram) l.push(maq.ram + " GB de RAM"); if (maq.nucleos) l.push(maq.nucleos + " núcleos");
    l.push(maq.so); if (maq.celular) l.push("celular");
    return l.join(" · ");
  }
  window.BW3DPlano = { maquina: maquina, lerPlaca: lerPlaca, PROJETOS: PROJETOS, GERADORES: GERADORES, avaliar: avaliar, resumo: resumo,
    FONTES: "VRAM dos geradores abertos conferida em 20/11/2026: TRELLIS.2 24 GB (MIT); Hunyuan3D 2.1 10 GB forma / 21 GB textura / 29 GB completo; TripoSR ~6 GB." };
})();
