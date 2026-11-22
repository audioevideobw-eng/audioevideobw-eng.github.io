# Aprendizados dos cursos da Adapta (22/11/2026)

Estudo feito pelo Claude, a pedido do dono, na conta dele (alunos.adapta.org e agent.adapta.one), lendo os **resumos em texto** das aulas
(~240 aulas, 157 com resumo). Resumo com palavras próprias, para guiar o que construímos na Brightway — nada aqui é cópia do material.
Cursos lidos: Início Rápido do Maestro, Início Rápido do Adapta ONE, Como Criar Assistentes de IA, IA para Vídeo, IA para Imagem,
Automatizando com IA (n8n), Marketing com IA, IA para Vendas, IA para Conteúdo, Masterizando IA Generativa. (Gestão com IA não tem resumo em texto.)

## 1. O método que se repete em todos os cursos
- **Tarefa → Skill → Automação → Canal.** Primeiro faz a tarefa com a IA e corrige até sair certo (a 1ª tentativa erra em 10–20% das vezes);
  depois pede "agora que aprendeu, crie uma skill"; depois agenda a skill (todo dia às 7h) e manda o resultado por um canal (e-mail, WhatsApp).
- **A IA confere o próprio resultado** antes de entregar (olha a imagem, assiste o vídeo, abre o PDF) — e diz o que conferiu.
- **Memória em duas camadas:** curto prazo (o que foi dito hoje) e longo prazo (o que se repete); uma revisão diária de madrugada guarda
  o útil e descarta o pontual. Contexto fixo da pessoa/empresa num lugar só.
- **Três camadas de personalização:** contexto (quem eu sou/minha empresa), expert (um "funcionário" com uma função só) e skill
  (um padrão que dispara sozinho por gatilho). Podem ser usadas juntas.

## 2. Frameworks úteis
- **4Is do pedido:** Intenção (o objetivo), Instrução (a ação: planejar, analisar, escrever, criar), Informação (dados, contexto, restrições),
  Interação (corrigir, aprofundar, pedir outro caminho). Ordem livre; o que importa é estar claro. Pedido fraco = "ilusão de resultado".
  Resposta majoritariamente errada → editar o pedido original em vez de empilhar correções.
- **Melhorador de pedido (varinha):** reescreve o pedido do usuário no formato que a IA entende melhor antes de mandar.
- **Expert de alta performance — 8 partes:** personalidade, enfoque (uma missão só), regras (o que não fazer), fluxo de interação
  (perguntas antes de responder), estilo de escrita, insumos (referências), template (formato da saída), observações finais.
  Criação guiada: a ferramenta faz perguntas e monta o expert sozinha.
- **Skill:** título, descrição, gatilho claro (quando ativar), regras de execução e formato de saída.
- **Vendas 2P2C:** Persona, Produto, Comunicação (tom de voz), Concorrente — entrevistas guiadas que viram contexto salvo.
  Métricas que mandam: receita, ticket médio e taxa de conversão; +5% de conversão em cada etapa do funil dobra o resultado.
  "Estagiário comercial": a partir da transcrição de uma reunião, extrai dados, avalia, sugere como fechar e escreve o follow-up.
- **Marketing:** ter ideias → criar → revisar (crítico especializado); documento ICF (Ideias, Criações, Feedback) para a IA aprender
  com exemplos bons e ruins; simular o cliente ideal ("clone do cliente") para testar mensagens.
- **Texto que não parece IA:** evitar travessões, frases curtinhas em sequência (staccato) e prosa enfeitada.
- **TAPE:** os 4 usos da IA — Ter ideias, Aprender, Pensar, Escrever.

## 3. Vídeo e imagem com IA (casa com o BW Reels / Quadro / Editor)
- **Ordem certa:** 1) imagem parada (barata de corrigir) → 2) upscale para 2K/4K → 3) animar cada cena → 4) áudio (trilha + voz) →
  5) sincronia labial por último.
- Vídeo maior que 10 s / loop perfeito: **primeiro e último quadro** encadeando clipes.
- Consistência de personagem: editar a imagem mantendo a identidade (modelos de edição), clonar pessoa/objeto com várias fotos de referência.
- **Storyboard antes de gerar** economiza crédito (status de cada cena).
- "Recriar" uma referência: extrair o prompt de uma imagem e mudar o que precisa (o nosso PROMPT IA já faz isso).
- Direção de arte no prompt: ângulo de câmera, luz, lente, estilo — "tronco antes dos galhos" (a cena primeiro, os detalhes depois).
- Pedir o que QUER, não o que não quer (negativas confundem a IA de imagem).

## 4. Automação (curso de n8n)
- Gatilhos: manual, agendado (cron), formulário, webhook (tempo real) e polling (olhar de tempos em tempos).
- Dados estruturados (JSON chave/valor), saída estruturada da IA, tratamento de erro e limite de requisições (rate limit) desde o início.
- Agente = modelo + memória (banco) + ferramentas (APIs, outros fluxos). WhatsApp: separar texto, imagem e áudio (áudio → transcrição).

## 5. O que levar para a Brightway (ideias, por prioridade)
1. **Caixa única de pedido (Tio Cláudio)** logo depois do ENTRAR, com ＋ (anexar), ⚡ (atalhos: gerar imagem, lançamento, orçamento, reel),
   🎙 e a **varinha que melhora o pedido** (4Is).
2. **Ciclo tarefa → skill → automação dentro da plataforma:** depois de uma tarefa que deu certo, botão "FAZER SEMPRE ASSIM" (salva o padrão)
   e "AGENDAR" (todo dia/semana) com aviso no sino/e-mail — usa o que já existe (bw-avisos, pg_cron).
3. **Experts da BW** (funcionários com uma função): Orçamentista, Roteirista de Reels, Social Media, Estagiário Comercial (pós-reunião),
   Crítico de copy — cada um com as 8 partes e criação guiada por perguntas.
4. **Contexto da empresa num lugar só** (Minha marca + 2P2C: persona, serviços, tom de voz, concorrentes) lido por todas as IAs da plataforma.
5. **Memória do Tio Cláudio** em duas camadas com revisão diária.
6. **Verificação antes de entregar** em tudo que gera mídia (já é regra no PENTE FINO; deixar visível ao usuário: "conferi X").
7. **Quadro de História** seguindo a ordem do vídeo com IA (imagem → upscale → animar → áudio → lipsync) com status por cena (storyboard).
8. **Área "Aprender"** no Início com aulas curtas do dono por ferramenta e uma novidade da semana.
