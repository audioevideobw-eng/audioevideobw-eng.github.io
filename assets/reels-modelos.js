/* BW Reels Pro — modelos prontos (galeria "O QUE VAMOS CRIAR?").
   Cada modelo é um roteiro do motor (o mesmo do BW Reels Studio). Os vídeos de exemplo em assets/reels-exemplos/
   são renderizados a partir DESTES roteiros (bw-reels-studio/motor/exemplos-web.mjs) — mudou aqui, gere de novo lá. */
(function () {
  "use strict";
  var base = function (estilo, cenas, extra) {
    var r = {formato: "9:16", fps: 30, motor: "nativo", estilo: estilo, efeitos: {grao: true, vinheta: true, letterbox: false, barraProgresso: true, sfx: true},
      marca: {handle: "@seuperfil"}, legendas: {ativas: true, palavrasPorPagina: 3}, audio: {}, cenas: cenas, fontes: []};
    for (var k in (extra || {})) r[k] = extra[k];
    return r;
  };
  window.BWReelsModelos = {
    categorias: [
      {id: "texto", nome: "MOTION DE TEXTO", icone: "Aa", desc: "Textos, números e listas animados com cara de cinema. O jeito mais rápido de postar todo dia."},
      {id: "personagem", nome: "HISTÓRIAS COM PERSONAGENS", icone: "☺", desc: "Personagens desenhados pelo motor contam a história em balões: falam, acenam, comemoram. Grátis e sem IA de vídeo."},
      {id: "ia", nome: "PERSONAGEM COM IA", icone: "✦", desc: "Seu personagem criado e animado em IAs de imagem e vídeo (Flux, Higgsfield, Kling, Veo). Aqui você monta o Reel com os clipes."}
    ],
    modelos: [
      /* ---------- MOTION DE TEXTO ---------- */
      {id: "dica-rapida", cat: "texto", nome: "DICA RÁPIDA", desc: "Gancho + 3 dicas + chamada. Ótimo para educar o público.", roteiro: base("cinema", [
        {tipo: "gancho", duracao: 3, texto: "3 erros que derrubam a sua live", enfase: ["erros"], chamada: "Dica rápida"},
        {tipo: "lista", duracao: 5.5, titulo: "Evite isso", itens: ["Internet sem teste", "Áudio só da câmera", "Ninguém olhando o chat"], fala: "internet sem teste, áudio só da câmera e ninguém olhando o chat"},
        {tipo: "texto", duracao: 3.5, titulo: "Resolva antes do evento", subtitulo: "Teste tudo um dia antes.", enfase: ["antes"]},
        {tipo: "cta", duracao: 3, texto: "Salva para não esquecer", enfase: ["Salva"], acao: "Siga @seuperfil"}])},
      {id: "numero", cat: "texto", nome: "NÚMERO QUE IMPRESSIONA", desc: "Um número grande contando na tela, com a fonte aparecendo.", roteiro: base("corporativo", [
        {tipo: "gancho", duracao: 3, texto: "Quantos eventos cabem num ano?", enfase: ["eventos"]},
        {tipo: "dado", duracao: 4, valor: 30, prefixo: "até ", rotulo: "eventos por ano com a mesma equipe", fonte: "dados próprios"},
        {tipo: "texto", duracao: 3.5, titulo: "Processo é o segredo", subtitulo: "Checklist, ensaio e plano B.", enfase: ["Processo"]},
        {tipo: "cta", duracao: 3, texto: "Quer o seu evento na lista?", acao: "Chama no direct"}],
        {fontes: [{afirmacao: "até 30 eventos por ano", url: "interno: dados próprios", data: ""}]})},
      {id: "frase", cat: "texto", nome: "FRASE DE IMPACTO", desc: "Uma frase sua em destaque, estilo revista. Bom para autoridade.", roteiro: base("editorial", [
        {tipo: "gancho", duracao: 2.8, texto: "Ninguém lembra do evento.", enfase: ["Ninguém"]},
        {tipo: "citacao", duracao: 4.5, texto: "As pessoas lembram de como se sentiram nele", autor: "Seu nome", enfase: ["sentiram"]},
        {tipo: "cta", duracao: 3, texto: "Bora criar essa memória?", acao: "@seuperfil"}], {efeitos: {grao: true, vinheta: false, letterbox: false, barraProgresso: true, sfx: true}})},
      {id: "anuncio", cat: "texto", nome: "ANÚNCIO DE EVENTO", desc: "Data, local e atrações com energia de balada. Neon e flashes.", roteiro: base("neon", [
        {tipo: "gancho", duracao: 2.6, texto: "Sábado tem!", enfase: ["Sábado"], chamada: "Atenção"},
        {tipo: "texto", duracao: 3, titulo: "20/12 · 21h", subtitulo: "Espaço Exemplo — BH", enfase: ["21h"], transicao: "flash"},
        {tipo: "lista", duracao: 4.5, titulo: "Atrações", itens: ["DJ convidado", "Telão de LED", "Transmissão ao vivo"]},
        {tipo: "cta", duracao: 3, texto: "Garanta o seu ingresso", enfase: ["ingresso"], acao: "Link na bio"}])},
      {id: "mito", cat: "texto", nome: "MITO OU VERDADE", desc: "Quebra uma crença do seu nicho em duas cenas. Gera comentário.", roteiro: base("luxo", [
        {tipo: "gancho", duracao: 3, texto: "Transmissão ao vivo é cara?", enfase: ["cara"]},
        {tipo: "texto", duracao: 3, titulo: "Mito.", subtitulo: "Depende do que você precisa.", enfase: ["Mito"], transicao: "zoom"},
        {tipo: "texto", duracao: 4, titulo: "Uma câmera bem feita já resolve", enfase: ["resolve"]},
        {tipo: "cta", duracao: 3, texto: "Peça um orçamento sem compromisso", acao: "Chama no direct"}])},

      /* ---------- HISTÓRIAS COM PERSONAGENS (motor) ---------- */
      {id: "mascote", cat: "personagem", nome: "MASCOTE APRESENTA", desc: "O Bê (câmera da BW) entra pulando, acena e apresenta o serviço.", roteiro: base("cinema", [
        {tipo: "personagem", duracao: 3.4, personagem: "be", acao: "acena", balao: "Oi! Eu sou o Bê 👋", cenario: "raios", entrada: "pula"},
        {tipo: "personagem", duracao: 4.2, personagem: "be", acao: "fala", balao: "Levo o seu evento ao vivo para qualquer tela", cenario: "raios", entrada: "nenhuma"},
        {tipo: "personagem", duracao: 3, personagem: "be", acao: "comemora", balao: "Simples assim!", cenario: "raios", entrada: "nenhuma"},
        {tipo: "cta", duracao: 3, texto: "Chama a gente", enfase: ["Chama"], acao: "@seuperfil"}])},
      {id: "dialogo", cat: "personagem", nome: "CLIENTE × PRODUTORA", desc: "Diálogo em balões: a dúvida do cliente e a resposta. Ótimo para objeções.", roteiro: base("cinema", [
        {tipo: "personagem", duracao: 3.4, personagem: "ana", acao: "pensa", balao: "E quem não puder ir ao evento?", cenario: "palco", entrada: "desliza"},
        {tipo: "personagem", duracao: 5.4, cenario: "palco", entrada: "nenhuma", elenco: [{personagem: "ana"}, {personagem: "be"}],
          falas: [{quem: 1, texto: "Assiste ao vivo, de casa!"}, {quem: 0, texto: "Com som e imagem bons?"}, {quem: 1, texto: "Em HD, com equipe técnica"}]},
        {tipo: "personagem", duracao: 2.8, cenario: "palco", entrada: "nenhuma", elenco: [{personagem: "ana", acao: "comemora"}, {personagem: "be", acao: "comemora"}]},
        {tipo: "cta", duracao: 3, texto: "Seu evento sem limite de público", enfase: ["limite"], acao: "Peça um orçamento"}])},
      {id: "problema", cat: "personagem", nome: "PROBLEMA E SOLUÇÃO", desc: "Alguém se assusta com um problema, outro resolve. Conta a sua solução sem parecer anúncio.", roteiro: base("corporativo", [
        {tipo: "personagem", duracao: 3.2, personagem: "rui", acao: "surpresa", balao: "O som caiu no meio da palestra!", cenario: "bolinhas", entrada: "surge"},
        {tipo: "personagem", duracao: 4.6, cenario: "bolinhas", entrada: "desliza", elenco: [{personagem: "rui", acao: "parado"}, {personagem: "bia", acao: "aponta"}],
          falas: [{quem: 1, texto: "Por isso a gente leva som reserva"}, {quem: 0, texto: "Ufa! Ninguém nem percebeu"}]},
        {tipo: "lista", duracao: 4.5, titulo: "Nosso plano B", itens: ["Microfone reserva", "Internet dupla", "Técnico dedicado"]},
        {tipo: "cta", duracao: 3, texto: "Evento sem susto", enfase: ["susto"], acao: "Chama no direct"}])},
      {id: "dica-personagem", cat: "personagem", nome: "DICA COM PERSONAGEM", desc: "Um personagem faz a pergunta que o seu público faz — e a resposta vem em lista.", roteiro: base("neon", [
        {tipo: "personagem", duracao: 3.2, personagem: "leo", acao: "pensa", balao: "Como gravar um vídeo melhor no celular?", cenario: "raios", entrada: "pula"},
        {tipo: "lista", duracao: 5, titulo: "Faça assim", itens: ["Luz de frente", "Celular deitado", "Microfone de lapela"]},
        {tipo: "personagem", duracao: 3, personagem: "leo", acao: "comemora", balao: "Agora sim!", cenario: "raios", entrada: "nenhuma"},
        {tipo: "cta", duracao: 3, texto: "Segue para mais dicas", acao: "@seuperfil"}])},

      /* ---------- PERSONAGEM COM IA (clipes de fora) ---------- */
      {id: "ia-montagem", cat: "ia", nome: "REEL COM PERSONAGEM DE IA", desc: "Esqueleto pronto: 3 clipes do seu personagem de IA + textos e chamada do motor. Importe os clipes na aba MÍDIA.", ia: true, roteiro: base("cinema", [
        {tipo: "gancho", duracao: 3, texto: "Conheça o novo rosto da marca", enfase: ["rosto"]},
        {tipo: "midia", duracao: 4, texto: "[clipe 1: o personagem aparece]", movimento: "zoom-in-suave"},
        {tipo: "midia", duracao: 4, texto: "[clipe 2: ele mostra o serviço]", movimento: "zoom-in-suave"},
        {tipo: "midia", duracao: 3.5, texto: "[clipe 3: reação ou convite]", movimento: "zoom-in-suave"},
        {tipo: "cta", duracao: 3, texto: "Chama no direct", acao: "@seuperfil"}])}
    ],
    /* exemplo do fluxo de IA (só para o vídeo de demonstração da galeria) */
    demoIA: base("cinema", [
      {tipo: "gancho", duracao: 2.8, texto: "Personagem de IA em 3 passos", enfase: ["IA"]},
      {tipo: "lista", duracao: 5.5, titulo: "O caminho", itens: ["Crie o personagem (Flux)", "Anime o clipe (Higgsfield, Kling)", "Monte o Reel aqui"]},
      {tipo: "cta", duracao: 3, texto: "Rosto fixo, vídeo novo", enfase: ["fixo"], acao: "BW Reels Pro"}]),
    ferramentasIA: [
      {nome: "Flux (Creator Factory)", papel: "imagem do personagem, com a função PERSONAGENS para manter o mesmo rosto", url: ""},
      {nome: "Higgsfield", papel: "imagem → vídeo, movimentos de câmera", url: "https://higgsfield.ai"},
      {nome: "Kling", papel: "imagem → vídeo, ações e fala", url: "https://klingai.com"},
      {nome: "Google Flow (Veo)", papel: "vídeo com som e fala", url: "https://labs.google/flow"}
    ]
  };
})();
