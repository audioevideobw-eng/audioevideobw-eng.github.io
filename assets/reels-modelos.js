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
      {id: "explica", nome: "REELS QUE ENSINAM", icone: "⌘", desc: "Reels que explicam: terminal digitando, passos com ícone que brilha, painel com números, catálogo numerado e o \"Comenta PALAVRA\" no fim."},
      {id: "texto", nome: "MOTION DE TEXTO", icone: "Aa", desc: "Textos, números e listas animados com cara de cinema. O jeito mais rápido de postar todo dia."},
      {id: "meu", nome: "ANIMAR MEU PERSONAGEM", icone: "📷", desc: "Envie a foto do seu avatar ou mascote e conte a história: ele vira recorte animado, cenas criadas por IA ou clipes de IA de vídeo."},
      {id: "personagem", nome: "HISTÓRIAS COM PERSONAGENS", icone: "☺", desc: "Personagens desenhados pelo motor contam a história em balões: falam, acenam, comemoram. Grátis e sem IA de vídeo."},
      {id: "graf", nome: "GRÁFICOS E EVENTOS", icone: "📊", desc: "Logo animado, nome de quem fala, contagem, gráficos, linha do tempo, checklist, top 3, depoimento, oferta, AO VIVO, celular e antes/depois."},
      {id: "ia", nome: "PERSONAGEM COM IA", icone: "✦", desc: "Seu personagem criado e animado em IAs de imagem e vídeo (Flux, Higgsfield, Kling, Veo). Aqui você monta o Reel com os clipes."}
    ],
    modelos: [
      /* ---------- REELS QUE ENSINAM (22/11) ---------- */
      {id: "ex-top5", cat: "explica", nome: "TOP 5 COM ÍCONES", desc: "Um item por vez, cada um com a sua cor e um ícone que brilha. Fecha com Comenta PALAVRA.", roteiro: base("tech", [
        {tipo: "gancho", duracao: 2.6, texto: "5 coisas que salvam a sua live", enfase: ["salvam"], chamada: "Salva esse"},
        {tipo: "passo", duracao: 2.4, numero: "1.", titulo: "Internet dupla", subtitulo: "Uma cai, a outra segura.", icone: "📶", cor: "#22d3ee"},
        {tipo: "passo", duracao: 2.4, numero: "2.", titulo: "Áudio separado", subtitulo: "Nunca só da câmera.", icone: "🎙️", cor: "#f97316"},
        {tipo: "passo", duracao: 2.4, numero: "3.", titulo: "Teste na véspera", subtitulo: "Tudo ligado, um dia antes.", icone: "🧪", cor: "#eab308"},
        {tipo: "passo", duracao: 2.4, numero: "4.", titulo: "Alguém no chat", subtitulo: "O público pergunta ao vivo.", icone: "💬", cor: "#22c55e"},
        {tipo: "passo", duracao: 2.4, numero: "5.", titulo: "Plano B pronto", subtitulo: "Vídeo de espera na mão.", icone: "🛟", cor: "#3b82f6"},
        {tipo: "comenta", duracao: 3.6, palavra: "LIVE", resposta: "Te mando o checklist no direct"}])},
      {id: "ex-terminal", cat: "explica", nome: "TUTORIAL NO TERMINAL", desc: "Passo numerado + janela de terminal digitando o comando, com as linhas de resultado aparecendo.", roteiro: base("tech", [
        {tipo: "gancho", duracao: 2.6, texto: "Legenda pronta em um comando", enfase: ["um"]},
        {tipo: "passo", duracao: 2.2, numero: "1", total: "2", titulo: "Abra o app", icone: "💻", cor: "#8be36a"},
        {tipo: "terminal", duracao: 4.2, titulo: "BW · legendas", comando: "bw legendar evento.mp4", itens: ["ouvindo o áudio…", "142 palavras encontradas", "legenda.srt pronta"], texto: "Passo 2: um comando só", enfase: ["comando"]},
        {tipo: "texto", duracao: 2.6, titulo: "Sem internet e de graça", subtitulo: "Roda no seu computador.", enfase: ["graça"]},
        {tipo: "comenta", duracao: 3.6, palavra: "LEGENDA"}])},
      {id: "ex-catalogo", cat: "explica", nome: "CATÁLOGO NUMERADO", desc: "Lista numerada à esquerda que vai acendendo e um cartão grande de cada item. Ótimo para \"10 estilos\", \"7 ideias\".", roteiro: base("tech", [
        {tipo: "catalogo", duracao: 9, titulo: "6 estilos de aftermovie", enfase: ["aftermovie"], itens: ["Cinemático", "Energia", "Documental", "Retrô", "Corporativo", "Para as redes"], icones: ["🎬", "⚡", "🎙️", "📼", "💼", "📱"]},
        {tipo: "comenta", duracao: 3.6, palavra: "ESTILO", resposta: "Te mando exemplos no direct"}])},
      {id: "ex-painel", cat: "explica", nome: "PAINEL DE NÚMEROS", desc: "Cartão de app com o número contando e o gráfico se desenhando. Troque pelos SEUS números (com fonte).", roteiro: base("tech", [
        {tipo: "gancho", duracao: 2.4, texto: "O que um aftermovie faz", enfase: ["aftermovie"]},
        {tipo: "painel", duracao: 4, rotulo: "Visualizações no mês", valor: 47000, variacao: "+312%", itens: [3, 4, 3.5, 6, 9, 14, 22, 31, 47], fonte: "exemplo — troque pelos seus dados"},
        {tipo: "texto", duracao: 2.6, titulo: "Evento bom vira conteúdo", enfase: ["conteúdo"]},
        {tipo: "comenta", duracao: 3.6, palavra: "VÍDEO"}])},
      {id: "ex-medidor", cat: "explica", nome: "MEDIDOR", desc: "Velocímetro com o ponteiro subindo até o valor. Use para internet, nota, meta, lotação.", roteiro: base("tech", [
        {tipo: "gancho", duracao: 2.4, texto: "A sua internet aguenta a live?", enfase: ["aguenta"]},
        {tipo: "medidor", duracao: 3.8, valor: 18, maximo: 50, sufixo: " Mbps", rotulo: "upload medido no local", fonte: "exemplo — meça no local do evento"},
        {tipo: "checklist", duracao: 4, titulo: "Antes do evento", itens: ["Meça o upload no local", "Peça cabo, não Wi-Fi", "Tenha um 4G de reserva"]},
        {tipo: "comenta", duracao: 3.6, palavra: "LIVE"}])},
      {id: "ex-impacto", cat: "explica", nome: "IMPACTO PRETO E ROSA", desc: "Palavras gigantes, brilho rosa e cortes secos. Para afirmações fortes.", roteiro: base("impacto", [
        {tipo: "gancho", duracao: 2.4, texto: "Ninguém repara nisso", enfase: ["Ninguém"]},
        {tipo: "texto", duracao: 2.4, titulo: "Até faltar.", enfase: ["faltar"], transicao: "flash"},
        {tipo: "texto", duracao: 2.8, titulo: "O áudio", subtitulo: "segura o público mais que a imagem.", enfase: ["áudio"], transicao: "flash"},
        {tipo: "lista", duracao: 4.2, titulo: "Cuide de", itens: ["Microfone certo", "Retorno no palco", "Teste de som"]},
        {tipo: "comenta", duracao: 3.6, palavra: "ÁUDIO"}])},
      {id: "ex-robo", cat: "explica", nome: "PASSO A PASSO COM O ROBÔ", desc: "O robô apresenta, os passos aparecem com ícone e o Comenta fecha. Um mascote dá cara ao perfil.", roteiro: base("tech", [
        {tipo: "personagem", duracao: 3, personagem: "robo", acao: "acena", balao: "Bora montar sua live em 3 passos?", cenario: "bolinhas", entrada: "pula"},
        {tipo: "passo", duracao: 2.4, numero: "1", total: "3", titulo: "Câmera fixa", icone: "🎥", cor: "#a78bfa"},
        {tipo: "passo", duracao: 2.4, numero: "2", total: "3", titulo: "Áudio limpo", icone: "🎧", cor: "#f472b6"},
        {tipo: "passo", duracao: 2.4, numero: "3", total: "3", titulo: "Internet com cabo", icone: "🔌", cor: "#34d399"},
        {tipo: "personagem", duracao: 2.6, personagem: "robo", acao: "comemora", balao: "Pronto pra transmitir!", cenario: "bolinhas", entrada: "nenhuma"},
        {tipo: "comenta", duracao: 3.6, palavra: "ROBÔ"}])},
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


      /* ---------- GRÁFICOS E EVENTOS ---------- */
      {id: "logo-assinatura", cat: "graf", nome: "LOGO E ASSINATURA", desc: "Abertura com o logo animado, onde e quando, e a chamada. Troque pelo seu logo na aba CENA.", roteiro: base("luxo", [
        {tipo: "logo", duracao: 2.8, texto: "SUA MARCA", subtitulo: "áudio e vídeo"},
        {tipo: "local", duracao: 3.5, texto: "Espaço Exemplo — BH", subtitulo: "20/12 · 19h"},
        {tipo: "cta", duracao: 3, texto: "Garanta o seu lugar", enfase: ["lugar"], acao: "Link na bio"}])},
      {id: "contagem", cat: "graf", nome: "CONTAGEM PARA O EVENTO", desc: "3, 2, 1… com anel girando e a data. Perfeito para a véspera.", roteiro: base("neon", [
        {tipo: "gancho", duracao: 2.6, texto: "Está chegando", enfase: ["chegando"], chamada: "Falta pouco"},
        {tipo: "contagem", duracao: 3.4, valor: 3, texto: "Sábado!"},
        {tipo: "local", duracao: 3.4, texto: "Espaço Exemplo", subtitulo: "20/12 · 21h"},
        {tipo: "cta", duracao: 3, texto: "Bora?", acao: "Ingressos na bio"}])},
      {id: "graficos", cat: "graf", nome: "RESULTADOS EM GRÁFICO", desc: "Barras e rosca que crescem com os números contando. Só com números que você pode provar.", roteiro: base("corporativo", [
        {tipo: "gancho", duracao: 2.8, texto: "Nosso ano em números", enfase: ["números"]},
        {tipo: "grafico", duracao: 4.2, titulo: "Eventos por ano", itens: ["2023: 18", "2024: 24", "2025: 30"], fonte: "dados próprios"},
        {tipo: "grafico", duracao: 4.2, titulo: "Onde o público assistiu", forma: "pizza", itens: ["YouTube: 50", "Telão: 30", "Zoom: 20"], fonte: "dados próprios"},
        {tipo: "cta", duracao: 3, texto: "O próximo é o seu?", acao: "Chama no direct"}],
        {fontes: [{afirmacao: "números de eventos e público", url: "interno: dados próprios", data: ""}]})},
      {id: "historia", cat: "graf", nome: "NOSSA HISTÓRIA", desc: "Linha do tempo que se desenha marco a marco. Ótimo para aniversário da empresa.", roteiro: base("editorial", [
        {tipo: "gancho", duracao: 2.8, texto: "Como tudo começou", enfase: ["começou"]},
        {tipo: "linha", duracao: 5.5, titulo: "Nossa história", itens: ["2006 — a primeira câmera", "2015 — nasce a produtora", "2024 — 30 eventos por ano"]},
        {tipo: "cta", duracao: 3, texto: "Obrigado por fazer parte", acao: "@seuperfil"}])},
      {id: "checklist", cat: "graf", nome: "CHECKLIST", desc: "Itens sendo marcados um a um. Ótimo para dicas e preparação.", roteiro: base("cinema", [
        {tipo: "gancho", duracao: 2.8, texto: "Sua live vai dar certo?", enfase: ["live"]},
        {tipo: "checklist", duracao: 4.8, titulo: "Antes de entrar no ar", itens: ["Internet testada", "Áudio no mixer", "Plano B pronto"]},
        {tipo: "cta", duracao: 3, texto: "Salva para o próximo evento", acao: "Siga @seuperfil"}])},
      {id: "top3", cat: "graf", nome: "TOP 3", desc: "Do 3º ao 1º com número gigante e confete no final.", roteiro: base("neon", [
        {tipo: "gancho", duracao: 2.6, texto: "Os 3 mais pedidos", enfase: ["pedidos"]},
        {tipo: "ranking", duracao: 5, titulo: "Top 3 do ano", itens: ["Transmissão ao vivo", "Aftermovie", "Fotografia"]},
        {tipo: "cta", duracao: 3, texto: "Qual é o seu?", acao: "Comenta aqui"}])},
      {id: "depoimento", cat: "graf", nome: "DEPOIMENTO DE CLIENTE", desc: "Estrelas, a frase do cliente e o nome. Use só depoimentos reais, com autorização.", roteiro: base("luxo", [
        {tipo: "depoimento", duracao: 4.6, texto: "Escreva aqui a frase real do seu cliente", autor: "Nome do cliente", estrelas: 5},
        {tipo: "nome", duracao: 3, titulo: "Nome do cliente", subtitulo: "Empresa / cargo"},
        {tipo: "cta", duracao: 3, texto: "Sua vez de viver isso", acao: "Peça um orçamento"}])},
      {id: "oferta", cat: "graf", nome: "OFERTA", desc: "Selo, produto e preço contando. Para pacotes e promoções.", roteiro: base("neon", [
        {tipo: "gancho", duracao: 2.6, texto: "Só esta semana", enfase: ["semana"]},
        {tipo: "oferta", duracao: 3.8, chamada: "Oferta", texto: "Pacote live completo", valor: 2490, rotulo: "em até 3x"},
        {tipo: "cta", duracao: 3, texto: "Garanta a sua data", acao: "Chama no direct"}])},
      {id: "aovivo", cat: "graf", nome: "AO VIVO AGORA", desc: "Selo AO VIVO, chamada e o vídeo dentro de um celular.", roteiro: base("corporativo", [
        {tipo: "aovivo", duracao: 3, texto: "Estamos no ar", subtitulo: "Assista pelo link da bio"},
        {tipo: "celular", duracao: 3.4, texto: "De qualquer lugar"},
        {tipo: "cta", duracao: 3, texto: "Entra agora", acao: "Link na bio"}])},
      {id: "antesdepois", cat: "graf", nome: "ANTES E DEPOIS", desc: "Cortina revelando o depois e tela dividida. Escolha as duas mídias na aba CENA.", roteiro: base("cinema", [
        {tipo: "gancho", duracao: 2.6, texto: "Olha a diferença", enfase: ["diferença"]},
        {tipo: "antesdepois", duracao: 4, texto: "Do celular para o telão"},
        {tipo: "dividida", duracao: 3.4, texto: "Palco", subtitulo: "Plateia"},
        {tipo: "cta", duracao: 3, texto: "Quer esse resultado?", acao: "Chama no direct"}])},
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
