# Regras para as IAs que mexem neste site (Brightway)

Este site é mantido por **duas IAs, em turnos**: o **MAESTRO (Adapta)** e o **Claude**.
O dono é a BW Audiovisual. Este arquivo é o combinado entre as duas. Leia **antes** de mexer.

## Antes de começar
1. Puxe a versão MAIS RECENTE do GitHub (branch main). Nunca publique a partir de uma cópia antiga.
2. Leia o "Diário de mudanças" no fim deste arquivo para ver o que a outra IA fez.
3. Relatórios técnicos detalhados ficam na pasta `docs/` (comece por `docs/RELATORIO-2026-11-13-claude.md`).

## Arquivos que SÓ o Claude edita (o MAESTRO não publica nem sobrescreve)
- `assets/bw-sync.js`, `financeiro-painel.html` e `docs/` (inclui `docs/sql/`). Se o gerador do MAESTRO tem uma cópia desses arquivos,
  ele deve REMOVÊ-LOS da lista de publicação — a cópia dele fica velha e apaga as correções (aconteceu às 16:25).

## O que NÃO pode ser desfeito
- `assets/bw-sync.js`: é a sincronização entre celular e PC. Toda página que usa o Supabase precisa
  carregar `<script src="assets/bw-sync.js?v=...">` logo DEPOIS do supabase-js e ANTES do bundle.
- `core/store.save` precisa chamar `window.BWSync.antesDeSalvar(key, versao, valor)` (TRÊS argumentos) antes do `localStorage.setItem`.
- `core/nuvem` só delega para `window.BWSync` — TODAS as funções (enviarTudo, receberTudo, sincronizarTudo,
  subir, baixar). **Nunca** faça upsert da lista inteira por cima da nuvem (isso apagava lançamentos de outro aparelho).
- `sw.js`: o Supabase e as APIs externas NÃO passam pelo cache. Páginas, JS e CSS usam rede primeiro.
- Cada página precisa incluir no bundle TODOS os módulos que usa (`MOD['...']`), inclusive o `$` no boot.
- Imagens (PNG/JPG/WEBP) precisam ir para o GitHub como ARQUIVO BINÁRIO, nunca como texto base64
  (foi isso que quebrou a logo e os ícones do app). Confira: o arquivo deve abrir como imagem no GitHub.
- Chave pública do Supabase só a `sb_publishable_…`. Nunca coloque a service_role nem senhas no código.

## Depois de mexer
1. Mudou CSS ou JS: suba o `?v=` nos links de todas as páginas e o `CACHE` do `sw.js`.
2. Abra as páginas e confira que nenhuma dá erro de JavaScript.
3. Anote no diário abaixo: data, quem foi, o que mudou (1 ou 2 linhas).

## Divisão de tarefas (decisão do dono, 14/11/2026 — vale daqui pra frente)
- **Só o Claude altera e publica** no GitHub (branch main). Nenhuma outra IA faz commit, push ou regeração do site.
- MAESTRO (Adapta): ajuda a DESENVOLVER — ideias, rascunhos de telas e código, textos e imagens. Entrega o material
  para o dono, que passa ao Claude; o Claude revisa, testa e publica.
- Imagens do MAESTRO: entregar como arquivo PNG/JPG/WEBP de verdade (não base64), com o nome sugerido.
- As regras de "O que NÃO pode ser desfeito" continuam valendo para qualquer código sugerido.

## PENTE FINO (obrigatório — regra do dono, 14/11/2026)
Toda criação, alteração ou teste de rotina passa por TODOS os itens abaixo. Cada um é um bug que já aconteceu.
Os marcados (auto) o vigia confere sozinho a cada publicação (`python3 docs/vigia/vigia.py`, seção 7);
os outros são conferidos no navegador, logado, em 1280 px E 390 px.

**Dados e sincronia**
1. Salvar → recarregar → o item continua lá E chegou na nuvem (`user_data`). Lista colapsável abre sozinha ao adicionar (auto).
2. Mensagem "✓ salvo" aparece DEPOIS do re-render, não antes (auto para fixos).
3. Apagar algo que gerou itens (fixo → contas/lançamentos) apaga também os futuros gerados (auto).
4. Nada de upsert da lista inteira; bw-sync.js carregado depois do supabase-js e antes do bundle (auto).
5. Chave nova de dados do usuário → entra em `CHAVES` do bw-sync.js.
5b. Sair e entrar de novo (e-mail ↔ Google, mesma conta) → os dados continuam na tela.

**Login e segurança**
6. Nenhum `localhost` no código; cadastro com `emailRedirectTo`; volta do Google com `?google=1`; PKCE ligado (auto).
7. Nenhum segredo no site: só `sb_publishable_…`; nunca service_role, `sb_secret_`, `GOCSPX-` (auto).
8. Conferir no Supabase → Logs → Auth depois de mexer em login (ex.: "invalid_client", "Unable to exchange").
9. Supabase → URL Configuration = site real; Google Cloud → Público = "Em produção".
10. Tabela nova no Supabase → RLS ligado com regra por `auth.uid()` antes de usar.

**Visual e celular**
11. Toda página nova carrega brightway.css + layout.js (menu lateral) — exceções: login, cadastro, baixar, privacidade, painel (auto).
12. Mesma versão `?v=` de CSS/JS em todas as páginas + `CACHE` do sw.js subido (auto).
13. Nenhum estouro horizontal em 390 px (grades com `min-width:0`) (auto parcial — conferir no navegador).
14. Nenhum id repetido no HTML (auto). Selo LOGADO aparece no topo e no menu (auto: layout copia #userBox).
15. Botões de acesso = galeria com ícone + PALAVRA-CHAVE, sem texto pequeno (auto).
16. Ícones do app quadrados e do tamanho declarado no manifest; imagens binárias (auto).

**Segurança para o público (14/11/2026)**
17. Contratos, NF-e e comprovantes vão para o bucket PRIVADO `eventos-docs` e abrem por link temporário (`BWSync.urlSegura`) (auto).
18. Galeria do cliente só por link secreto `cadastro.html?g=TOKEN` (tabela bw_galerias); nunca pelo número do evento (auto).
19. Itens só da BW (Config ADM) levam a classe `so-admin` — somem para quem não é admin (auto). O PAINEL FINANCEIRO é de TODAS as contas (desde 14/11).
21. PAINEL FINANCEIRO lê os lançamentos nativos (neg_fluxo + neg_eventos), conta só o realizado (data ≤ hoje, sem cachê "pendente");
    BAIXAR/ENVIAR PLANILHA (Excel) mostra resumo antes de gravar, ignora linhas automáticas (cache_/gasto_/receita_/fixo_/ev_) e grava com antesDeSalvar (auto).
    Tabelas fin_* têm coluna dono (RLS por auth.uid()); a planilha Google é SÓ DO ADM (decisão do dono, 14/11): fin_gerar_chave exige is_bw_admin()
    e o seletor PLATAFORMA/PLANILHA GOOGLE só aparece para o ADM. Usuários comuns usam só a plataforma + BAIXAR/ENVIAR PLANILHA.
22. Planilha só entra pelo PAINEL FINANCEIRO (ENVIAR PLANILHA). Nenhuma outra página tem envio de CSV/XLSX nem caixa de
    "planilha conectada" ou botão manual "Sincronizar com a conta" (a sincronia é automática) (auto). Exceção: PAINEL DE INVESTIMENTOS (mesmo sistema).
23. PAINEL DE INVESTIMENTOS (investimentos-painel.html): chave inv_lancamentos (em CHAVES do bw-sync); abas por tipo; moedas e milhas avaliadas ao vivo
    (open.er-api + milhas.json); BAIXAR/ENVIAR PLANILHA com resumo; exemplo só na tela. As Recomendações leem a carteira de moedas/milhas daqui.
20. login.html mantém "Baixar meus dados" e "Excluir minha conta" (LGPD) (auto). Nunca testar a exclusão na conta do dono.
24. Ferramentas de IA/PDF (assistente.html, transcricao.html, pdf.html; categoria MARKETING = marketing.html): a IA e os PDFs rodam NO APARELHO
    (Chrome Gemini Nano / Transformers.js / pdf-lib). Nunca colocar chave de API de IA no site; IA na nuvem só por Edge Function do Supabase
    com a chave guardada lá. Essas ferramentas não gravam nada na conta (só preferências ui_* locais).
28. E-MAIL AUTOMÁTICO (bw-avisos): só para quem ligou em bw_avisos_pref; nunca reenviar (bw_avisos_envio); teste nunca manda para a equipe.
27. AVISOS (layout.js): o sino lê só dados do aparelho (já sincronizados) e nunca envia nada sozinho; link de presença do LEMBRAR EQUIPE
    passa por BWSync.registrarAgora (regra 26).
26. Link público (cadastro de colaborador/cliente, presença) só aparece DEPOIS de BWSync.registrarAgora confirmar no servidor;
    o banco recusa link/evento não registrado (LINK_INVALIDO). Nunca gerar link só no aparelho.
25. FEEDBACK: botão ENVIAR FEEDBACK no menu e no topo (layout.js, todas as páginas) grava em public.bw_feedback (RLS: cada conta só o seu,
    não dá para enviar em nome de outro; ADM vê todos e muda status; gatilho põe o e-mail real da conta e limita 20/dia). Lista em configadm.html (so-admin).

**Aprendidos em 15/11 (FECHAMENTO, etapa 2)**
29. Data de "hoje" em código novo = data LOCAL (getFullYear/getMonth/getDate); `toISOString()` vira o dia seguinte depois das 21h.
30. Todo botão novo de gerar/exportar é CLICADO no teste (o "Exportar fluxo em PDF" ficou sem ligar porque o init não era chamado).
31. Módulo que existe em mais de uma página (ex.: modules/equipe) é copiado IGUAL em todas; nunca esconder um contêiner que tem
    dentro o que deve aparecer (esconder os irmãos); regex com palavra acentuada não usa `\b`.

**Aprendidos em 15/11 à noite (CRM e editor de fotos)**
32. Carimbo com hora (`new Date().toISOString()`, ex.: histórico de conversa) é UTC: para MOSTRAR ou comparar o dia use o dia LOCAL
    (`BWCRM.diaLocal`) — uma conversa às 21h45 aparecia como do dia seguinte e o agente achava que o contato tinha falado "amanhã".
33. Dado novo do usuário (ex.: mkt_leads, mkt_modelos, mkt_redes, mkt_config) → entra em CHAVES do bw-sync E no vigia (7.8a).
    Editor de fotos (fotos.html) nunca envia fotos para a nuvem (vigia 7.8a).
34. AGENTE e IA: nada sai sozinho (MANDAR abre o WhatsApp; a pessoa envia); IA em LOTE numa chamada só (limite de 60/dia por conta);
    a IA recebe só o necessário (o ANALISTA IA recebe só totais, sem nomes de clientes).

35. Classe CSS de estado/variante nunca repete o nome de um bloco que já existe (a aba AGENDA com class="ag" herdou a moldura do
    contêiner .ag da agenda inteira) → prefixo próprio (ab-pend / ab-ag).
36. Concluir na AGENDA: tarefa → feitos da tarefa; conta da casa → c3 "Sim"; retorno do CRM → prox.feito; evento/montagem/fixo/cachê →
    agenda_feitos (em CHAVES). Quem mostra avisos (sino, agente do CRM) ignora o que foi concluído.

37. Lista de "já importados" (pedidos do site → funil) fica na CONTA (mkt_config cfg_orc_vistos), não só no aparelho:
    apagar os testes no PC e abrir o celular trazia os 10 testes de volta.
38. Página pública que só envia (pedido.html) usa fetch cru no /rest/v1 com a chave publishable (sem supabase-js nem bw-sync);
    o dono e as regras vêm do gatilho no banco (bw_dono_pedido), nunca do navegador.

**Aprendidos em 16/11 (editor de fotos 2.0)**
39. Ferramenta visual: a prévia fica SEMPRE na tela (painel de controles com altura fixa no celular; nada de rolar a página para ver o
    efeito) e trocar de aba não muda o tamanho da prévia (auto: teste_fotos.py).
40. Editor de fotos: kit MINHA MARCA só no IndexedDB do aparelho (exporta/importa .json); assets/fotos.js nunca usa fetch/upload/
    BWSync (vigia 7.8a confere fotos.html + assets/fotos.js).

**Aprendidos em 16/11 (cadastros, PDF da equipe, Meus dados)**
41. Botões de ação de uma linha (✎ ALTERAR, ✕) ficam JUNTO DO NOME, nunca na última coluna de tabela larga (no celular ficavam escondidos
    à direita e "não dava para alterar"). Excluir sempre pede confirmação. Lista com muitos campos no celular = cartões (auto: vigia).
42. Toda função que redesenha uma lista colapsável chama ligarColapsaveis(box) no fim — senão, depois de salvar, a lista fecha e parece
    que não salvou. A sincronia ao abrir redesenha a página (~1 s): no teste, espere a página assentar antes de digitar.
43. Relatório que "tem anexos" junta os ARQUIVOS de verdade no fim (assets/bw-anexos.js: pdfMake → getBuffer → pdf-lib, link temporário
    do bucket privado); arquivo que não abre não trava o PDF — entra na lista "não entrou" mostrada ao usuário (auto: vigia).
44. Dados repetidos (mesma planilha importada 2x): avisar e oferecer JUNTAR (fica o mais recente + cópia ui_dd_backup); nunca apagar
    dado do usuário sem ele tocar no botão.

**Aprendidos em 16/11 (editor de fotos no iPhone)**
45. Tela cheia por cima da página (editor, folhas): no celular a página de trás precisa SUMIR e TRAVAR (html.ed-aberto: body fixo,
    .bw-shell/.bw-abas escondidos, touchmove e pinça bloqueados fora das áreas que rolam) — no iPhone o topo do editor ficava "travado".
    Campo de digitar com letra ≥ 16 px (menos que isso o iPhone amplia a tela sozinho ao tocar). Teste com toque: p.devices["iPhone 13"].
46. O topo LOGADO tem mais itens (selo + ATUALIZAR) que o topo do teste local sem login: a varredura (docs/testes/varredura.py) simula o
    selo e mede 1280/390/360 px. Excluir algo que outros itens apontam (equipe → eventos) limpa a referência na hora.
47. Arquivo escolhido no seletor (input file) é COPIADO para a memória na hora (Blob de arrayBuffer): o iPhone invalida o original depois
    e o salvar dava "decod". Se mesmo assim não abrir, salva com a prévia e avisa — nunca falha calado.
48. Arrastar na prévia mede em FRAÇÃO da tela (clientX/largura), não em pixels do canvas: durante o arraste a prévia é refeita em
    resolução menor e o item "pulava" de lugar (auto: teste_fotos.py, arrastar adesivo/texto/logo).

**Aprendidos em 16/11 (retoque com IA)**
49. IA de imagem no aparelho (MediaPipe): segmentador com delegate "CPU" (no iPhone a GPU troca as categorias); efeitos por máscara com
    desfoque que funciona em qualquer navegador (reduzir/ampliar, não ctx.filter); teste local com MÁSCARAS FALSAS conferindo pixel
    (docs/testes/teste_ia_retoque.py) e teste no ar com o modelo real.
51. Secret colado pelo dono: conferir pelo DIGEST (SHA-256) mostrado em Supabase → Edge Functions → Secrets antes de testar
    (`printf '%s' valor | sha256sum`); o botão "copiar" da Cloudflare não funciona no painel do app e colava outro conteúdo.
    O Claude nunca digita chave/token em campo — o dono cola (dica: linha NOME=valor no campo Name separa sozinho).
50. IA CRIATIVA (decisão do dono, 16/11): a ÚNICA saída do editor de fotos para a internet é assets/fotos-nuvem.js → Edge Function
    bw-ia-imagem (Cloudflare FLUX.2), só depois de confirm() da pessoa, cópia pequena (≤ 504 px), nada guardado, resultado vira foto NOVA
    ao lado da original; nudez/sexual recusado na função; 15 imagens/dia por conta, somando editor e CRIADOR IA (auto: vigia 7.8a).

**Aprendidos em 16/11 (CRIADOR IA)**
52. Prévia presa (sticky): só a prévia (+ miniaturas) fica presa — um bloco preso mais alto que a tela é empurrado para fora no fim da
    página; botões vão para outro cartão. No celular, prévia presa no topo pede `html{scroll-padding-top}` (senão o campo tocado fica
    escondido atrás dela) e regra do @media precisa ser MAIS específica que a regra base que vem depois (auto: teste_criador.py).
53. Teste com Playwright e recurso externo (CDN, Edge Function): `service_workers="block"` — o sw.js busca direto na rede e a rota
    simulada do Playwright não vale (o QR "não aparecia" só no teste).
54. Texto sobre arte de IA: a IA desenha SÓ a arte (prompt "sem letras"), o app escreve os textos com fontes de verdade; a IA de textos
    nunca troca o que a pessoa digitou (nome, data, valor, título do evento) e a resposta dela perde a marcação (`**`, `#`).

**Aprendidos em 16/11 (GERADOR DE ORÇAMENTO)**
55. Leitor de arquivo do usuário (.docx importado) é testado com os ARQUIVOS REAIS dele (sem gravar na conta): o primeiro leitor trocava dia
    e mês (25/09 → "2026-25-09") e colava o e-mail do rodapé com a palavra seguinte ("…gmail.comEmail").
56. Valor em R$ do toLocaleString vem com espaço INSEPARÁVEL ("R$\u00a01.950,00"): teste compara depois de trocar \xa0 por espaço.
57. Prévia, PDF e Word saem do MESMO modelo (assets/propostas.js modelo()) — mudança de conteúdo é feita ali, nunca em só uma das saídas.

**Aprendidos em 16/11 (CONCLUIR e cores das condições)**
58. Botão que muda a CONDIÇÃO de algo (finalizar, recebido, pago, aprovado…) usa a animação comum do layout.js (BWConcluir): o ouvinte
    reconhece data-fin/data-agd/data-pago/data-pg/__togglePago/data-a="st"; botão novo usa data-bw-status="ok|volta" + data-bw-msg + data-bw-id,
    e o cartão/linha leva data-bw-card="ID" (para acender em verde mesmo depois do redesenho/troca de aba). Voltar atrás = sem confete.
    Cores das condições em .tag: up verde (feito/recebido/pago), dn vermelho (não recebido/não pago), mid âmbar (andamento), azul
    (confirmado), cinza (orçamento). A AGENDA (.ag) faz a própria festa — o ouvinte ignora o que está dentro dela (auto: teste_concluir.py).

**Aprendidos em 16/11 (logo sem fundo no orçamento)**
59. Imagem que precisa de transparência (logo) é salva SEMPRE em PNG — reduzir o tamanho para caber, nunca trocar para JPEG (perde o
    transparente). Tirar fundo = fundo liso pelas bordas + des-mistura da borda das letras (cor da letra + alfa), senão fica halo branco
    no cabeçalho colorido; a original fica guardada para VOLTAR AO ORIGINAL (auto: teste_logo_fundo.py).

**Aprendidos em 16/11 (certificado digital e abas dos orçamentos)**
60. CERTIFICADO DIGITAL (assets/bw-assinar.js): o .pfx e a senha NUNCA saem do aparelho (sem fetch/upload/supabase/BWSync/localStorage no
    módulo — vigia); senha em type=password, limpa depois de cada tentativa e nunca guardada; "lembrar" guarda só o ARQUIVO no IndexedDB
    bw_cert (opt-in, ESQUECER apaga). Os A1 da ICP-Brasil vêm no formato ANTIGO (chave 3DES + certificados RC2-40): WebCrypto não abre,
    por isso node-forge. Teste SEMPRE com certificado de TESTE criado na hora (nunca o do dono) e valide com pdfsig ("Signature is Valid").
    O Claude não digita senha de certificado: o dono digita (auto: teste_assinatura.py).
61. Lista com situações (orçamentos, eventos): abas que abrem/fecham pela seta (ui_*_abas) e o item MUDA DE ABA SOZINHO quando a situação
    muda — a aba de destino abre e a tela rola até ele; sempre há botão de voltar (↺ REABRIR / Agendar) (auto: teste_abas_orcamentos.py).

62. Opções prontas de preenchimento ficam guardadas num BOTÃO por campo (☰ OPÇÕES PRONTAS + número → lista para tocar), nunca como chips
    soltos ocupando a tela; páginas de documento (orçamento) não mostram indicadores financeiros — eles ficam no PAINEL FINANCEIRO (decisão do dono).

**Aprendidos em 16/11 (Leitor de contas e Agente)**
63. AGENTE (assets/bw-agente.js, carregado pelo layout.js em todas as páginas menos as públicas): nada é gravado sem ✓ LANÇAR (a não ser
    "lançar sem perguntar" ligado pela pessoa); grava pelos formatos das páginas (casa_orcamento c0–c4, casa_contas c0–c3, neg_fluxo c0–c3,
    agenda_tarefas, neg_eventos[].gastos) com antesDeSalvar; a IA recebe só a frase + data + nomes de eventos; "quanto gastei" é calculado
    no aparelho. Fala com número de hora ("às 10") NÃO é valor; sem valor dito = cartão para completar, nunca grava 0 (auto: teste_agente_leitor.py).
64. LEITOR (assets/bw-leitor.js): PDF com texto → pdf.js (exato), foto → Tesseract + imagem tratada, códigos → ZXing; valor/vencimento do
    BOLETO saem do código (FEBRABAN, DVs conferidos; fator de vencimento com a nova base 22/02/2025, boleto antigo cai na base 1997) e vencem
    o texto; à IA vai só tapar(texto) (vigia). Código colado aceita pontos/traços/espaços. Campo `label` da página global é MAIÚSCULO:
    textos longos em label precisam de text-transform:none.

65. Resposta de IA em JSON é ACHATADA antes de usar (aceita {"tipo":…}, {"acao":…} e {"tarefa":{…}}) e o prompt traz um EXEMPLO com o campo
    "tipo": o gpt-oss devolvia {"tarefa":{…}} e TODA ação virava "não entendi", enquanto a "resposta" dizia "lembrete criado". Se a IA não
    trouxer ação válida, cai para o entendimento no aparelho; a "resposta" da IA nunca diz que algo foi lançado. Teste com a IA REAL no ar
    (BWAgente.entender, sem gravar) — o simulado só devolvia o formato certo (auto: teste_agente_leitor.py).

66. TIO CLÁUDIO (o agente, nome dado pelo dono): conversa por voz (depois de responder continua ouvindo; silêncio ou "tchau" encerra), "como está
    meu dia" montado NO APARELHO (resumoDia: agenda + contas + atrasadas + próximo evento — nada vai para a IA), piadas/papo pela IA (tipo
    responder), "muda para as 15h" ajusta o último pedido (cartão ou item já salvo pelo idSalvo, sem duplicar). A IA recebe só as frases da
    conversa; respostas com dados viram "(respondi com os dados dele)" no histórico. Teste de voz simulado: fila window.__falas e, quando
    acaba, silêncio — senão o modo conversa fica num laço (auto: teste_agente_leitor.py).

67. VOZ DO NAVEGADOR (speechSynthesis): a primeira fala precisa nascer DENTRO de um toque (iPhone/Android) → fala muda no toque do robô
    (destravar); nunca speak() logo depois de cancel() (o Chrome engole) → só cancela se estiver falando e espera 120 ms; se a fala não
    começar em 3 s, tenta a voz padrão e avisa na tela (volume de mídia / silencioso). Sem regex com lookbehind (Safari antigo quebra o arquivo todo).
    "Eventos dispararam" no teste NÃO prova que o dono ouviu — perguntar em qual aparelho/navegador.

68. iPhone: com o MICROFONE aberto (reconhecimento ou gravação) a fala do navegador sai MUDA, mesmo com onstart/onend normais → toda fala
    que não vem da escuta desliga o microfone antes (soltarMic) e a sessão volta para "playback". Android/Chrome não informa qual voz é
    masculina (só "português Brasil"): depende da voz padrão do sistema. Diagnóstico na tela (⚙ → 🔊 OUVIR A VOZ, linha vNN) antes de adivinhar.

69. iPhone "sem fala" com o diagnóstico dizendo que COMEÇOU a falar = MODO SILENCIOSO (a voz do navegador obedece à chave; o bip do
    AudioContext não) — perguntar isso PRIMEIRO, antes de mexer em código (16–17/11: 5 versões até descobrir).

**Aprendidos em 17/11 (BW REELS PRO)**
70. O site NUNCA fala com o PC do usuário por endereço local (vigia 7.2 recusa localhost/127.0.0.1): a ponte com programa instalado no
    computador é um ARQUIVO baixado (.bwreels.zip em Downloads) que o programa do PC vigia — nada de servidor local no código do site.
71. Prévia presa no topo do celular que ocupa boa parte da tela: a página reserva a altura dela na rolagem (scrollPaddingTop calculado
    no JS) — sem isso o botão tocado fica escondido atrás da prévia (teste: clicar em botões no fim do painel em 390 px).
72. Motor que existe no Studio e no site (assets/reels-motor.js) é GERADO do Studio (bw-reels-studio/motor/gerar-motor-web.py): mudança
    de animação/estilo é feita lá e o arquivo do site é gerado de novo — nunca editar só a cópia do site.

73. Safari do iPhone (fora do app instalado) põe um efeito de VIDRO fosco no alto da tela, por cima da página: barra de tela cheia
    encostada no topo fica "embaçada" (editor de fotos, 17/11). Tela cheia no Safari iOS → barra desce ~30 px abaixo da área segura
    (classe html.ed-safari) e o theme-color vira a cor da barra enquanto ela está aberta; no app instalado não muda nada.

74. IA de roteiro (BW REELS PRO): número que o PRÓPRIO usuário digitou entra com fonte "dados próprios" sozinho (antes bloqueava o vídeo
    por falta de fonte); citação vinda da IA vira texto comum e o prompt proíbe atribuir frases (no ar a IA inventou "— Especialista em eventos"). Visto só no teste com a IA REAL (regra 65).

**Aprendidos em 17/11 (galeria, personagens, som e gráficos do BW REELS PRO)**
75. Animação por código é DETERMINÍSTICA: cada quadro depende só de t (`__seek(t)`); conferir com `node motor/animar.mjs x.html --checar`
    (aquecer antes: a fonte de emoji carrega no 1º quadro) e revisar com `--folha`. Elemento que muda de opacidade leva will-change.
76. Vídeos de exemplo da galeria saem dos MESMOS roteiros dos modelos (assets/reels-modelos.js → motor/exemplos-web.mjs); teste confere
    que todo modelo tem .mp4 + .jpg. sw.js não guarda vídeo/áudio nem pedido com Range (o Safari não tocava o vídeo vindo do cache).
77. Balões e textos de personagem: medir na prévia em 390 px (dois personagens = balões em 40%/60% com 0,56 da largura); cenas seguidas
    no mesmo cenário cortam seco (fade entre elas "piscava").
78. Foto do avatar só sai do aparelho pela fotos-nuvem.js (confirmação + autorização, ≤ 504 px, limite diário); o que falhar volta para o
    recorte animado no aparelho, nunca trava o projeto.
79. Som do vídeo é sintetizado pelo motor (sons.mjs), IGUAL na prévia e no render; sem trilha de terceiros. Conferir sem ouvir: espectrograma
    (ffmpeg showspectrumpic) + nível RMS. "Eventos de som dispararam" não prova que o dono ouviu (regra 67).
80. Personagens novos (prontos ou montados) passam pelo MESMO `svgPersonagem/animarPersonagem` dos 3 motores; teste conta os prontos (19)
    e anima o montado na prévia. Lista de cartões no celular: texto dos botões quebra linha (estourava).
81. Cena com texto de tamanho livre (logo, título longo) calcula a fonte pela PALAVRA mais longa (min(150, 1300/(letras+2))) — "SUA MARCA"
    passava da tela; enfeite animado que divide espaço com texto (anel da contagem) some antes do texto entrar. Gráfico sem fonte ou com
    item sem número BLOQUEIA o vídeo (validar.mjs + teste). Trocar o tipo da cena já preenche um exemplo e mostra só os campos daquele tipo.

82. Vídeo feito no navegador (assets/reels-celular.js): quadro = SVG foreignObject do HTML do motor → canvas → WebCodecs H.264 → MP4 montado
    no aparelho. Dentro do foreignObject NADA de fora carrega: fontes do Google embutidas em base64 (só latin, só as usadas), imagens blob
    viram data:, <script>/<link> removidos; imagem do quadro por data: (blob: "suja" o canvas). WebCodecs só existe em página segura
    (https ou localhost do teste; about:blank não tem). Som: AAC do codificador (sem description → 0x11 0x90) → AAC pelo MediaRecorder
    (iPhone; AudioContext nasce no toque) → Opus (avisar) → mudo (avisar); o aviso verde mostra qual caminho foi usado.
    Filmagem (<video>) não entra → mensagem mandando para o PC. Teste confere o MP4 com ffprobe + decodificação inteira + volume.

83. Prévia de animação no celular: nada de camada maior que a tela com blur ou mix-blend-mode, nem will-change em cada palavra — o
    iPhone (pior ainda no navegador de dentro do Instagram/WhatsApp) derruba a página por memória ("Um problema ocorreu repetidamente").
    A prévia do celular tira esses enfeites; o vídeo final continua com eles. "N blocos de som" no diagnóstico NÃO prova que há som:
    mostrar também o tamanho médio do bloco e os primeiros bytes.

84. BW REELS PRO — projetos na CONTA (chave reels_projetos, em CHAVES + vigia): vai só o roteiro/textos; mídias, trilhas e personagens
    próprios continuam no IndexedDB do aparelho (avisar ao enviar para o PC). Junta por id com o `atualizado` mais novo; apagar em outro
    aparelho só apaga aqui o que tem `naConta` e nunca o reel aberto. Fila celular → PC = campo `paraPC` no próprio projeto (sem tabela nova).
    Função que depende de serviço ainda não aprovado (Google Drive/Dropbox) aparece DESLIGADA com "disponível em breve", nunca como botão que falha.

85. QUADRO DE HISTÓRIA (assets/reels-quadro.js): blocos e setas ficam só no aparelho (ui_reels_quadro + imagens no IndexedDB, projeto "__quadro");
    foto só sai pela fotos-nuvem.js (autorização marcada + confirm com a quantidade e o limite do dia); a fala que a pessoa escreveu nunca é
    trocada pela IA; IA devolveu número de cenas diferente → usa o texto do aparelho. Bloco que cresce (imagem criada) não pode cobrir o de
    baixo: referências nascem bem abaixo das cenas. Arrastar = pixels da tela ÷ zoom. Id "quadro" já é o iframe da prévia (usar prefixo qd).

86. "A IA não entende nada" de repente = PRIMEIRO chamar a bw-ia direto, logado, e ler o status e o corpo (17/11: 502 {"erro":"groq",
    "detalhe":"Invalid API Key"} — a chave da Groq guardada no Supabase deixou de valer; derruba Tio Cláudio, roteiro do Reels, assistente,
    transcrição e CRM de uma vez). Quem usa IA mostra o MOTIVO quando ela cai (chave, limite, rede), nunca "não entendi".

87. PLANO DE PRODUÇÃO do Quadro (reels-quadro.js planoVideo): preço de IA de vídeo é REFERÊNCIA com data (VIDEO_IA.conferido) e muda sempre —
    conferir nas páginas oficiais antes de atualizar e nunca prometer valor; o aviso ao usuário sempre diz "confira no site da IA antes de pagar".
    AUTOMÁTICO só manda para IA paga a cena com movimento de verdade; fala parada e detalhe ficam no app. Nenhuma IA de vídeo é chamada pelo site.

88. APLICATIVO BW REELS (Studio, motor/app.mjs): a janela abre também a plataforma, então a ponte com o PC (`bwNode`) confere QUEM chama —
    só as telas locais do app usam tudo; a plataforma só pode pedir `inicio`/`info`; qualquer outro site é recusado (teste com site "de fora").
    Login = a página de login da plataforma dentro da janela; o app guarda só id/e-mail/nome + validade de 7 dias, nunca senha nem token.
    Ação que navega a janela e mexe na conta (SAIR) desliga antes o vigia de "página carregou" — senão ele registrava a conta de novo.

89. IA DE VÍDEO CONECTADA (decisão do dono, 18/11: cada usuário conecta a própria IA): a chave fica SÓ no PC do usuário
    (~/.bw-reels/video-ias.json, aplicativo BW Reels) — nunca no site, nunca no Supabase, nunca de volta para a tela. O site só pede ao
    aplicativo `videoIA` (quais modelos) e `videoGerar`; antes de gerar, confirm() dizendo que a imagem da cena vai para a IA do usuário e o
    custo de referência. Fora do aplicativo o botão não existe (só o texto para copiar). Formato de API de terceiros é lido na página oficial
    no dia (Veo 3.1 preview saiu do ar em 22/10/2026 — a tabela de 17/11 já estava velha) e o teste com provedor simulado confere o corpo do pedido.
90. USO SEM INTERNET no aplicativo (motor/offline.mjs): rede primeiro, cópia do disco quando faltar; guarda só GET da plataforma e das CDNs
    da lista; nunca Supabase, nunca POST. `serviceWorkers: 'block'` na janela (o sw.js passaria por fora da troca). A cópia que vai no
    instalador (site-offline.zip) é gerada do repositório a cada pacote — página nova do site = gerar o pacote de novo.
91. Janela aberta com `--app=URL` (aplicativo BW Reels): a primeira página NASCE com o navegador, antes de exposeBinding/addInitScript —
    o teste sem janela não pega (lá a página é criada depois). Sempre `goto` de novo depois de registrar a ponte, e a página espera a ponte
    alguns segundos antes de dar erro. Teste da corrida: carregar a página, só depois expor a ponte (18/11: 1ª abertura do dono deu "Não consegui começar").

92. Editor de blocos ligados (Quadro): ligar por ARRASTE da porta + modo de toque que CONTINUA ligado até ✓ PRONTO (um toque = uma ligação fazia
    parecer que "só liga uma por vez"); a ordem não pode depender de "uma saída por bloco" (ordem topológica + posição). Painel que cobre a tela
    fecha primeiro no Esc. Resposta de IA em texto livre é limpa (marcação, "Prompt:", aspas em volta) antes de ir para o campo.

93. Editor com camadas: a ORDEM é uma lista só para todos os tipos (chaves "a:id", "t:id", "logo") — ordem por tipo ("adesivos, depois textos,
    depois logo") impede pôr um item acima do outro. Máscara pintada guarda os TRAÇOS em fração do alvo (não um bitmap): serve para a prévia
    reduzida, o arquivo final e o desfazer. Botão de 2 estados que os testes/usuários já conhecem (ANTES) não vira de 3 estados: o modo novo
    (LADO A LADO) é um seletor que aparece quando ele está ligado. "Segurar para ver" cancela se o dedo andar (senão briga com o arrastar).

94. Dado que várias ferramentas usam (personagens) tem UMA biblioteca num arquivo só (assets/bw-personagens.js), aberta com a MESMA versão e as
    mesmas lojas do IndexedDB de quem já usava (bw_reels v2) — versão diferente em outra página trava o banco. Tipo novo de registro ("ficha",
    sem imagem) é filtrado em quem não sabe desenhar (lista do Reels). Passar item entre páginas = link com ?id, aplicado e depois limpo do endereço.

95. Editor de vídeo no navegador: som de cada <video>/<audio> passa por createMediaElementSource → ganho → (alto-falante + MediaStreamDestination)
    para a gravação pegar o MESMO som da prévia; o AudioContext nasce no toque de TOCAR/EXPORTAR. Teste de exportação confere o ARQUIVO (ffprobe:
    trilhas, quadros, volume), não só "o botão respondeu". Canvas de prévia leva max-height em vh no próprio canvas (max-height:100% dentro de
    flex deixou a prévia maior que a tela). Prévia presa no celular: scroll-padding calculado no JS com a altura real dela + a das abas de baixo.

96. Painel de ferramenta com muitas seções: cada seção tem SETA (título com data-seta="chave" — layout.js BWDobras; antes de criar atributo/classe "comum", procurar se o nome já existe: data-dobra já era do Início e o seletor novo quebrou as seções de lá no teste) e as pouco usadas começam
    fechadas (data-seta-padrao="fechada"); a seção se abre sozinha quando a pessoa acabou de criar algo nela. No teste, clique na seta antes
    de mexer no que está dentro (elemento escondido não recebe clique).

97. Página que junta dados de várias telas (LANÇAMENTOS) NÃO cria chave nova: lê e grava no formato de cada dona, com um mapa único de destinos
    (o mesmo para criar, mostrar e mudar de lugar). Mudar de lugar = criar no destino e SÓ ENTÃO apagar a origem. Dado derivado (linhas gasto_/
    receita_ do fluxo) é refeito pela mesma regra de quem deriva — nunca editado direto; linha automática de outra tela só ganha atalho.

98. Tirar uma página: ANTES, listar tudo o que só ela fazia (Fluxo de caixa: lançar, FIXOS recorrentes, PDF do mês) e levar para a página nova
    no MESMO formato de dados (neg_fixos, ids fixo_<id>_<data>); o endereço antigo vira redirecionamento (e entra em SEM_MENU do vigia), e
    todo link, menu, sino, agenda, agente e manual que apontava para ela é trocado no mesmo commit.

99. Dado com SITUAÇÃO que vários lugares leem (cachê: neg_equipe_pagamentos → gasto pag_<id> do evento → linha cache_<id> do fluxo): quem muda a
    situação refaz os TRÊS na mesma ação (pagarCache → cacheNoEvento → espelharEventos) e a lista mostra o item UMA vez (a origem), nunca as
    cópias derivadas. Botão que abre o Tio Cláudio de outra página usa BWAgente.abrir(false): abrir já escutando derruba o navegador de teste.

100. EVENTO DE VÁRIOS DIAS: `dataFim` (último dia; vazio = um dia; ignorado se não for depois de `data`). Quem lista eventos por dia (agenda do
     Início, agenda de EVENTOS, sino, Tio Cláudio) percorre de data a dataFim; na agenda a CHAVE é a mesma em todos os dias (ev|id|dia): concluir
     uma vez conclui o evento, e PENDENTES mostra uma linha só. "Hoje" em comparação de datas = data LOCAL (o cartão de EVENTOS usava toISOString).

101. (mudou em 20/11 — ver 116) negocio.html e casa.html são GERADOS por `python3 docs/automacoes/gerar-ambientes.py` (molde único + cartoes.json);
     nunca editar na mão. A lista da casa agora é a aba PF dos LANÇAMENTOS (o modo data-lc-modo="casa" acabou).
     Cortar bloco de HTML por texto: o fim "  </div>" também casa com "    </div>" (use "\n  </div>\n") e o teste confere que o conteúdo está VISÍVEL,
     não só que existe (a página saiu com os números escondidos e a contagem passava). `if (x) var a = …; b[a] = …` sem chaves só protege o var.

103. IMAGEM DA IA RECUSADA ("filtro" / "flagged" da Cloudflare) acontece até com pedido inocente: em lote, se a imagem de FRENTE (a base) falhar, pare os
     ângulos desse personagem (sem a base eles saem como pessoas diferentes) e tente outra descrição. Upload no bucket "trends" com upsert:true dá
     "row-level security" (falta regra de update): use upsert:false.
104. ATUALIZAÇÃO DO APP BW (PC): o app só instala o que vem do PRÓPRIO site (downloads/app-versao.json + pacote do mesmo endereço) e confere o
     sha256 antes de copiar; nunca mexe em projetos/, node_modules/ nem ~/.bw-reels; só instala quando a pessoa toca em ATUALIZAR (DEPOIS adia 24 h,
     o menu Atualizações fica marcado) e a tela O QUE MUDOU aparece uma vez na 1ª abertura da versão nova. Lançar versão = subir VERSAO em
     motor/app.mjs + `python3 docs/automacoes/publicar-app.py --pacote … --novidades …` (gera o zip e o json juntos). Teste do atualizador NUNCA
     aponta para a pasta de trabalho (BWREELS_RAIZ_ATU_TESTE): a cópia por cima apagaria o código.
105. App instalado não pode depender de um passo opcional do instalador: quem abre (BW-REELS.bat) confere o que precisa (Node, node_modules) e
     prepara sozinho. Todo .bat sai com CRLF (`file *.bat`): LF quebra goto/rótulos no cmd.
106. BW SKILL (app BW, bw-skills/): skill que vai para usuários é uma VERSÃO PÚBLICA gerada da do dono — pastas, clientes, LUTs e presets dele viram
     {{CAMPOS}} preenchidos no instalador (o teste recusa VALE MINA/FIEMG/E:\\…/C:\\Users\\audio); o nome leva prefixo bw- (não colide com a skill
     do dono). As skills chegam DENTRO do pacote do app (atualizações) e a ponte só atende com login. Cartão que flutua (animação contínua) nunca fica
     "estável" para o Playwright: no teste, clique com force; para a pessoa, a animação pausa no hover.
107. Janela/painel com cabeçalho + conteúdo + rodapé fixo em GRADE ou FLEX: o item que rola precisa de min-height:0 (e a linha da grade minmax(0,1fr)),
     senão cresce com o conteúdo e empurra o rodapé (botões) para fora — no PC do dono, com zoom de 125%, o AVANÇAR sumia. Conteúdo longo: barra de
     rolagem visível + aviso "ROLE PARA VER MAIS". Testar com a tela do dono (1534×816 CSS = 1920×1020 a 125%) e conferir que o rodapé está na tela.
108. ANIMAÇÃO PARA RECORTE (motor/animar.mjs): `--alfa` (.mov ProRes 4444) e `--chroma verde|azul|magenta|#hex` (.mp4 H.264) escondem o fundo do HTML
     (body transparente + tudo com data-fundo some; classe html.bw-recorte para trocar sombra larga por contorno — sombra larga vira mancha no
     chroma key). O render confere se a animação usa a cor do fundo (lente azul do Bê some no fundo azul) e sugere outra. Teste de verdade =
     recortar com o chromakey do ffmpeg e conferir o pixel do fundo e do cartão (motor/teste-recorte.mjs), não só "o arquivo saiu".
109. Do site para o PC (app BW) vão só DADOS: o Estúdio de motion baixa `nome.<fundo>.bwmotion.json` e o app monta o HTML com a cópia LOCAL do motor
     (motor/motion-motor.js, IGUAL ao assets/motion-motor.js — teste-app confere); nunca rodar HTML baixado no Chromium com acesso a arquivos.
     Motor de motion = cada quadro só de t (montar + seek), textos sempre por textContent (marcação no texto vira texto). Teste com mouse:
     elemento fora da tela não recebe clique (scroll_into_view antes) e ◆ por cima da barra pega o toque (escolher barra sem ◆). Inserir trecho
     por texto num arquivo: contar antes quantas vezes o texto aparece (o bloco entrou duas vezes no teste-app).
110. Vídeo com FILMAGEM gerado no navegador: desenhar em CANVAS (BWReelsCelular.gerar com `desenhar(t, ctx)`), nunca foreignObject (ele não
     pega <video>). Antes de cada quadro, cada take é posto no ponto certo e espera o `seeked` (com prazo); a prévia tocando usa play() e só corrige
     quando o take se afasta > 0,3 s. Teste confere a COR de cada cena no MP4 no tempo certo (mídia certa na tela certa) + som com volumedetect
     sem `-v error` (ele esconde a medição). Desfazer grava antes o passo pendente (o histórico espera 0,3 s para juntar mudanças).
     Transição que traz a cena nova + painéis que deslizam = buracos pretos: com transição, a transição é a entrada.
102. PROMPT IA (promptia.html + assets/promptia.js): biblioteca em public.bw_trends (leitura pública, gravação só is_bw_admin, RLS —
     docs/sql/2026-11-19-prompt-ia.sql) + imagens no bucket público "trends" (só ADM envia); a análise manda a imagem para a bw-ia
     (campo "imagem", modelo com VISÃO da Groq) SÓ depois de confirm(), cópia ≤ 768 px JPEG, nada guardado; o promptia.js nunca grava na
     conta (vigia). Modelo de visão da Groq muda de nome: a função tenta uma LISTA (MODELOS_VISAO) e devolve {erro:"visao", detalhe}.
111. Arrastar-e-soltar próprio (pointer events, sem HTML5 drag): mouse começa depois de 5 px; toque só depois de segurar ~220 ms (senão é
     rolagem) e então touchmove com preventDefault (listener passive:false); rolagem na borda num laço de requestAnimationFrame (dedo PARADO
     na borda não gera pointermove); alvo por elementFromPoint com o fantasma em pointer-events:none; clique logo depois do soltar é engolido.
     Teste: mouse do Playwright e toque pelo CDP (Input.dispatchTouchEvent). Tamanho livre de vídeo: o nível do H.264 sobe com a área do quadro.
112. TELA FIXA (regra do dono, 20/11): em toda tela de edição a mídia editada fica SEMPRE à vista e os painéis/menus é que rolam —
     BWFerr.telaFixa (PC: editor na altura da janela, cada painel com rolagem própria; celular: prévia sticky como filha direta do contêiner
     alto — sticky dentro de uma grade solta quando a grade acaba). Editor novo = chamar telaFixa e medir a prévia pela altura do palco.
113. Ferramentas/atalhos comuns (assets/bw-ferramentas.js): tecla sozinha troca de ferramenta, nunca quando se digita num campo; atalho com
     Ctrl não rouba o Ctrl+Z do campo de texto; mensagem de aviso que troca a classe inteira (el.className = …) apaga classes postas por
     outro módulo → marcar com atributo data-*. Menu aberto por TOQUE ignora o clique dos primeiros 450 ms (o dedo que abriu não escolhe);
     Esc que fecha menu/ajuda usa stopImmediatePropagation (senão fechava também o editor).
114. Desfazer com histórico que espera (debounce): o desfazer grava ANTES o passo pendente (Telas em 20/11, Motion de novo no mesmo dia —
     toda cópia desse padrão precisa do mesmo conserto). Laço de requestAnimationFrame: o 1º carimbo pode vir MENOR que performance.now() →
     tempo negativo; o motor aceita t < 0 sem quebrar.
115. Efeito de cor em canvas que precisa valer no iPhone: modos de mistura (saturation, color, soft-light, overlay, multiply) numa camada
     fora da tela + destination-in com a própria mídia; desfoque por reduzir/ampliar. Transição entre clipes = o que sai fica no último
     quadro e o que entra é desenhado por cima com recorte/posição/opacidade; teste confere o PIXEL no meio da transição.

**Aprendidos em 20/11 (AMBIENTES: MINHA EMPRESA × MINHA CASA)**
116. PJ E PF NÃO SE MISTURAM (decisão do dono, 20/11): empresa = chaves neg_* (+ mkt_*), casa = casa_* e inv_*. Toda tela que LISTA, SOMA ou CRIA
     lançamento trabalha num ambiente só (<html data-amb="pj|pf">, ?a=pj|pf, último usado em ui_amb): LANÇAMENTOS (abas PJ | PF; criar() recusa
     destino do outro ambiente; "para onde foi" só dentro do ambiente), PAINEL FINANCEIRO (PAINEL PJ | PAINEL PF), AGENDA (data-amb na caixa;
     tarefa nova leva `amb`; tarefa antiga vai pela categoria: Pessoal/Casa/Saúde = casa). Nenhuma chave nova. Link para LANÇAMENTOS/PAINEL
     sempre com ?a= do ambiente de quem chama. Cor: empresa azul #4C8DFF, casa verde #2FD08A (variáveis --amb no brightway.css).
     Teste de independência = FOTO DO TEXTO das chaves do outro ambiente antes e depois de lançar (docs/testes/teste_ambientes.py) (auto: vigia 7.8c).
117. Tirar um módulo do pacote de uma página (agenda saiu do Início → assets/agenda.js): quem usava a função global de lá (Tio Cláudio →
     window.BWAgendaItens) continua precisando dela — a página carrega o arquivo mesmo sem a caixa na tela. Endereço que ganha ?a= por
     history.replaceState: teste e código que comparavam o FIM do endereço (`endsWith("lancamentos.html")`) passam a olhar se CONTÉM.
118. Página que desenha gráfico com biblioteca de fora (Chart.js) confere `window.Chart` antes: sem internet os números continuam e só o
     gráfico some (o PAINEL FINANCEIRO parava com "Chart is not defined"). inner_text no teste vem com o text-transform da tela (MAIÚSCULAS):
     comparar em minúsculas.

119. Recortar desenho com fundo PRETO e brilho (robô): alfa = o maior entre a SILHUETA cheia (pixels claros → fechar → preencher buracos, para o
     visor escuro não ficar vazado) e o BRILHO (clareza do pixel); no halo, dividir a cor pela clareza para tirar o preto. Conferir sobre um fundo
     colorido. Imagem grande em WEBP (85 KB contra 447 KB em PNG), sempre binária. Padding/gap em % num item posicionado contam pela largura
     do PAI, não do item (as telas do Início ficaram com 84 px de respiro) → usar clamp() em px/vw. Elemento que não para de se mexer (roda que
     "respira") nunca fica estável para o Playwright: clicar com force e, se outro item cobre o centro, num canto visível (position).

**Aprendidos em 20/11 (MODOS DE APARÊNCIA)**
120. MODOS (assets/modos.js + modos.css; decisão do dono, 20/11): modo novo = UM item na lista MODOS do modos.js (id, nome, grupo, base, cores, fx;
     modo de vidro em outra cor = uma linha vidro(...); a escolha é POR APARELHO, decisão do dono) —
     nunca regras de cor por modo espalhadas no CSS. As cores chegam às páginas pelas variáveis que elas já usam (--navy/--gold/--txt…,
     --bw-*) e pelas --m-*; cor nova em página nova = usar variável, não cor escrita. O modo DARK não põe data-modo (a página fica como sempre).
     Modo CLARO só clareia o miolo das páginas da lista CLARO_OK (ajustadas e conferidas no olho); nas outras e nos editores o miolo fica escuro.
     A escolha é só do aparelho (ui_modo, ui_modo_fx, ui_modos_meus) e a imagem da marca é lida no aparelho — nada vai para a conta (auto: vigia 7.8d).
     modos.js fica no <head> de TODA página (auto); página nova gerada por script → pôr no molde também.
121. Regra de modo com seletor mais forte que a regra do estado (.amb-aba no modo claro × .amb-aba.on) apaga o estado: escrever com :not(.on).
     Regra larga tipo ".wrap a{color}" pinta botões que são links (texto sumiu no botão principal). Animar background-position só no eixo X
     (keyframe com o Y explícito) — a linha de luz do topo subia para o meio do título. Efeito em tela = um canvas só, poucas partículas, parado
     com a aba escondida e com "reduzir movimento"; borda de luz por conic-gradient + @property (sem suporte, vira borda parada — aceitável).
122. Página SEM o menu (painéis: header + .hero + .card com cor escrita no próprio arquivo) não acompanha o modo só pelas variáveis: fundo de cartão
     em rgba/hex fixo fica escuro no modo claro. Regras do modo para essas páginas ficam num bloco só do modos.css (PAINÉIS) e o teste percorre
     TODOS os modos em cada painel (teste_modos.py). Gráfico em canvas lê a cor por window.__cv("--var", padrão), nunca cor escrita.
123. Tema "de jogo/filme/marca famosa": nunca usar nome, letreiro, personagem, mapa ou logo de terceiros (nem "parecido"). Fazer tema ORIGINAL de
     gênero (corrida, tático, arcade, fantasia…) com nome próprio; dizer isso ao dono numa frase. Cenário de modo no Início = fx de CSS no
     .hub-palco (::before livre) com seletor mais forte que o do vidro+neon.

**Aprendidos em 20/11 (ESTÚDIO 3D)**
124. 3D no site é MOTOR PRÓPRIO em canvas 2D (assets/bw3d-motor.js — sem biblioteca de fora, sem WebGL: funciona sem internet, no iPhone e
     dentro do BWReelsCelular.gerar com `desenhar(t,ctx)`): projeta, ordena por profundidade (pintor) e pinta cada face com luz; face virada
     para o outro lado some quando a malha é fechada (`fechado`), senão a normal é invertida para iluminar os dois lados. Limite do método:
     uma face grande pode passar à frente de faces pequenas — modelo fechado e bem exportado resolve. Leitores: GLB (sem Draco/meshopt — o
     JSON do GLB pode vir terminado em \0, tirar antes do JSON.parse; baseColorFactor é LINEAR → converter para sRGB), OBJ e STL (texto e binário).
125. Logo/arte em relevo não se desenha fatia por fatia (dezenas de desenhos por quadro): "esfrega" a silhueta na direção da espessura
     DOBRANDO o passo (1, 2, 4, 8… em ~7 desenhos) e pinta a parede com `source-in` — sem degrau e rápido. Imagem dentro de um quadro 3D
     (arte no painel de LED, face de um objeto) entra por transformação afim com 3 cantos (ctx.transform, nunca setTransform: apaga o
     que já está na tela).
126. Prova de PIXEL com animação ligada é loteria: no teste, PARAR o giro e desenhar em t=0 antes de medir (uma conferência pegava o quadro
     em que a câmera estava atrás do painel). Medir cor CONTANDO os pixels da tela inteira, não pelas "4 cores mais comuns" de uma amostragem.
     Teste que mede se algo anima tem de durar mais que a pausa da animação (a prévia das transições fica ~0,5 s parada a cada 1,8 s → 4 fotos em 1,2 s).
127. Plano colado na frente de uma grade de faces (a arte em cima dos módulos de LED) entra na ordem pela profundidade do canto MAIS PERTO,
     nunca pela média — com a média, metade dos módulos fica na frente da arte.

128. Recurso que depende da MÁQUINA do usuário (placa de vídeo): ler pelo WebGL (WEBGL_debug_renderer_info) dá o NOME, nunca a VRAM —
     a memória sai de uma tabela de modelos e o usuário CONFIRMA num seletor (ui_3d_maquina), que passa a mandar; a leitura fica no módulo
     (BW3DPlano.maquina), nunca uma cópia na tela, senão recarregar volta ao valor estimado. Veredito honesto: os geradores 3D abertos rodam
     em CUDA, então placa AMD/Intel/Apple com 24 GB NÃO "aguenta" — cai em nuvem; número de VRAM de modelo de IA leva a data da conferência
     (auto: teste_3d_plano.py, vigia 7.8e).

129. O navegador NÃO enxerga a placa dedicada de um notebook: o WebGL do Chrome no PC do dono (RTX 3050 6 GB Laptop) devolveu
     "Intel(R) UHD Graphics" — o Chrome roda no vídeo integrado para poupar bateria. Leitura de hardware pelo navegador é PALPITE:
     quando vier integrada (ou vazia), avisar que em notebook é normal e pedir MARCA + memória da placa de verdade (ui_3d_maquina
     guarda as duas); nunca cravar "esta máquina não tem placa". O número certo só vem do app BW (nvidia-smi/wmic no PC) (auto: teste_3d_plano.py).

130. IA PESADA NO PC DO USUÁRIO (app BW, motor/gerador3d.mjs): instalar é um CAMINHO de etapas gravadas em disco (estado.json), que
     RETOMA de onde parou e mostra o log real de cada comando — nunca um botão só que trava sem explicar. Tudo em ~/.bw-reels/3d (regra 104:
     a atualização do app não toca lá); nomes de repositório, modelo, subpasta e requisitos lidos na página oficial NO DIA (20/11: repo
     Tencent-Hunyuan/Hunyuan3D-2, modelo tencent/Hunyuan3D-2mini subpasta hunyuan3d-dit-v2-mini, mínimo 6 GB VRAM / 16 GB RAM / 20 GB disco,
     licença tencent-hunyuan-community que o autor NÃO libera na União Europeia — mostrar e pedir aceite ANTES de baixar). O julgamento da
     máquina é o MESMO no real e no simulado (uma função julgar()), senão o teste passa com aviso que o usuário nunca vê. Teste com os
     comandos SIMULADOS (BW3D_SIMULADO=1) conferindo o ROTEIRO gerado (modelo certo, cuda, sem rede) — o teste de verdade é no PC com placa.

131. Conteúdo que é a TELA PRINCIPAL de um modo não pode nascer dentro de uma seção dobrável compartilhada: o PLANO DO PROJETO era
     desenhado dentro da 1ª caixa do painel (data-seta="d3obj", título "O MODELO") e, para quem já tinha fechado essa seta em outro modo
     (ui_dobras), o modo abria com o painel VAZIO — o teste passava porque media só se o elemento EXISTIA. Teste de conteúdo principal
     usa is_visible(), e ainda com a seta do outro modo FECHADA de propósito antes de recarregar (auto: teste_3d_plano.py).

132. PROGRAMA DE FORA QUE O NOSSO INSTALADOR PRECISA (Python, Git, FFmpeg): (a) a tela diz O QUE falta, (b) tem botão que instala sozinho
     pelo `winget` do Windows, e (c) o app ACHA o programa mesmo fora do PATH (procura em %LOCALAPPDATA%\Programs e Program Files, e usa o
     caminho inteiro) — a caixinha "Add python.exe to PATH" passa batido quase sempre. (d) VERSÃO TEM FAIXA, não só mínimo: o dono instalou
     o Python 3.15 e a receita ia quebrar na etapa do PyTorch (no Windows ainda não há roda de torch+torchvision com CUDA para ele) — faixa
     num lugar só (PY_FAIXA 3.10–3.13, indicado 3.12), a escolha pega a MAIS NOVA DENTRO da faixa (`py -3.13`, `py -3.12`…) e versão fora
     da faixa é recusada ANTES de baixar, dizendo que a nova pode ficar junto (ninguém precisa desinstalar). Conferir a faixa na página
     oficial do dia, nunca de memória (auto: teste-gerador3d.mjs, teste-app.mjs).
132b. LINK DE DOWNLOAD de programa de fora é o ARQUIVO exato, nunca a página geral: a página do python.org baixa sempre a versão
     MAIS NOVA (que não serve) e a busca do Windows cai na MICROSOFT STORE — o dono caiu nas duas em 20/11. A versão da Store mora em
     WindowsApps (pasta protegida): o venv nasce mas `pip install -e .` falha, então o app a RECUSA pelo caminho real do interpretador
     (`sys.executable` casando WindowsApps|PythonSoftwareFoundation.Python) e manda desinstalar. Todo achado de interpretador guarda o
     caminho real e usa ELE, não o apelido do PATH (auto: teste-gerador3d.mjs).
133. NÃO hospedar instalador de terceiros (python.exe, git.exe) no nosso site: envelhece, pesa e a licença é deles — instalar pelo winget.
     Pasta com arquivo baixado dentro da pasta do Studio entra no BW-Setup.exe pelo robocopy /E: o GERAR-INSTALADOR.bat ignora
     "IA ARQUIVOS EXE", downloads-externos e qualquer *.exe/*.msi solto.

134. RELEVO 3D (logo) tem DOIS LADOS: a face virada para a câmera quando se olha por trás não pode sair chapada — com `doisLados`
     (padrão) a arte volta, ESPELHADA no espaço do objeto (cantos 1,0,2 em vez de 0,1,3), o que a deixa LEGÍVEL na tela, como letreiro
     impresso dos dois lados; desligado, traseira lisa na cor do material (relevo de parede). Imagem derivada (sombrear/pintar/metal) usa
     canvas PRÓPRIO cacheado, nunca o TMP, que está montando a cena.
135. MOVIMENTO DE CÂMERA no vídeo não é só "girar 360°" (numa logo, metade do vídeo é a traseira): tabela MOVIMENTOS com `laco` —
     quem fecha em loop (vai e volta, giro, parado) anda por `t % seg`, quem é de UMA VEZ SÓ (chegando, revelar, meia volta) anda por
     `min(1, t/seg)`, senão o ÚLTIMO quadro do vídeo salta de volta para o primeiro (`8 % 8 === 0`). Cada movimento traz na tela para que
     serve. Teste mede a câmera em t=0, no meio e no fim (auto: teste_3d.py).
136. Contar "quantos tons tem na tela" NUNCA pelas N cores mais comuns de uma amostragem (regra 126): varrer TODOS os pixels e usar um
     conjunto. O medidor de 4 cores a cada 97 px dizia "4 tons" tanto para o relevo quanto para a face chapada.

137. MODELO DE IA BAIXADO DO HUGGING FACE: `allow_patterns` do snapshot_download é uma ARMADILHA — o pipeline carrega mais pastas do que a
     do checkpoint principal. No Hunyuan3D-2mini o repo tem 6 pastas e eu pedi só `hunyuan3d-dit-v2-mini/*`: a instalação ia até o fim e só
     quebrava no teste de prova, com "Missing key(s) … main_image_encoder…" (faltava o VAE). Conferir a ÁRVORE do repo na página oficial antes
     de restringir, trazer o config.yaml de cada pasta, e no carregamento ter plano B entre `safetensors` e `.ckpt`. Etapa cara que já passou
     não é refeita, mas a BARATA que o teste final depende (baixar modelo, escrever roteiro) é refeita quando o teste falha — o download é
     incremental, então não repete o que já está no disco (auto: teste-gerador3d.mjs).
138. ETAPA QUE FALHA MOSTRA O MOTIVO NA CARA: faixa em cima do log com a etapa que parou, o erro e o conserto conhecido, mais COPIAR O LOG.
     Erro no fim de uma caixa rolável é erro escondido — e `log.scrollTop = scrollHeight` antes de acrescentar a linha do erro nem rola até ele.

139. AMBIENTE ÚNICO (decisão do dono, 20/11): a LINHA DO TEMPO é o centro e as ferramentas criam para ela. Toda criação passa pela
     biblioteca ÚNICA (assets/bw-criacoes.js, IndexedDB bw_criacoes, nada sai do aparelho) e entra no editor de vídeo como a mídia
     "bc-<id da criação>", levando consigo a ferramenta de origem e o id do projeto: o ✎ reabre lá (?p=&voltar=video&criacao=) e o que
     voltar TROCA NO LUGAR — mesmo clipe, mesmos cortes, efeitos e volume (só encurta se o arquivo novo for mais curto). Botão novo numa
     ferramenta = `BWCriacoes.aoLado("<id do botão de baixar>", {…})`: nasce ao lado do que já existe, copiando a classe dele, sem mexer no
     HTML da página; a barra "⟵ linha do tempo" também se injeta sozinha (auto: vigia 7.8f, docs/testes/teste_criacoes.py).
140. Função que ENTREGA algo para uma lista tem de redesenhar a lista: trazerCriacao punha o clipe na linha do tempo mas não chamava
     desenharLib(), e a criação "não aparecia" na biblioteca (tudo() redesenha a linha do tempo e a prévia, não a biblioteca). Faixa
     injetada em página com menu NUNCA entra na `.bw-shell` (é flex: vira uma coluna ao lado do menu e estoura a tela) — vai no `.wrap`.
     Teste que muda o projeto por JS e recarrega a página espera o guardar() (400 ms) antes do reload, senão lê o estado velho.

141. BIBLIOTECA DE FORA SEM VERSÃO FIXA é armadilha: o requirements.txt do Tencent não fixa nada, o pip trouxe transformers 5.x e o
     modelo não carregou (a 5 renomeou a atenção do DINOv2; o checkpoint guarda attention.attention.query/key/value) — 8 etapas passavam e
     só o teste final quebrava. Toda receita que instala código de terceiros tem uma lista PINOS (pacote + motivo + data) aplicada DEPOIS do
     `pip install -e .` (que também sobe versão), e a etapa onde os pinos moram entra na lista do que o TENTAR DE NOVO refaz (auto:
     teste-gerador3d.mjs confere que o pino roda e que roda depois do -e .). FIXAR UM PACOTE SÓ NÃO BASTA: rebaixar o transformers rebaixa o
     huggingface_hub e o diffusers novo para de importar (ImportError resolve_revision) — o grupo que depende um do outro vai NUM comando só
     (`transformers==4.46.3 diffusers==0.31.0`, a receita do Hunyuan3D), para o pip resolver o conjunto. E o DIAGNÓSTICO na tela não pode
     mentir: o regex de rede tinha a palavra solta `resolve` e anunciou um erro de versão como "a internet caiu" → regra própria para
     ImportError e padrões de rede específicos (ConnectionError, Max retries, Failed to resolve), com teste que prova a separação.

**Aprendidos em 21/11 (EDITOR DE VÍDEO estilo CapCut: chroma, cor, som, painéis livres, modo foco)**
142. MODO FOCO (decisão do dono, 21/11): página de EDIÇÃO ou CRIAÇÃO não mostra menu lateral, topo nem abas de baixo — só a setinha ‹ de voltar
     e um ☰ discreto (layout.js, lista FOCO). Editor novo = entrar na lista FOCO e conferir com is_visible que o topo sumiu.
143. TUDO SE OMITE, ESTICA, DESCOLA E MOVE (dono, 21/11): editor com TELA FIXA ganha os PAINÉIS LIVRES do bw-ferramentas.js (barrinha ⠿ com
     ⇱ descolar e ✕ esconder; ＋ NOME traz de volta; a beirada da prévia estica a largura; a barrinha de baixo estica a altura). Esconder =
     NÃO ocupar lugar (o espaço vai para a prévia). bw-ferramentas.js não guarda nada: o editor passa painelLer/painelGravar (ui_<editor>_paineis).
     Painel redesenhado com innerHTML apaga a barrinha → o editor desenha num CORPO próprio dentro do painel (o 3D apagava a ⠿ ao trocar de modo).
     Mudou a altura/largura do palco por outro motivo (camada nova na linha do tempo, painel escondido) → ResizeObserver no palco refaz a medida
     da prévia (os botões de TOCAR ficavam cortados embaixo).
144. Painel posto em display:none é invisível para offsetParent, e o mesmo vale para position:fixed (offsetParent = null mesmo VISÍVEL):
     para saber se um elemento está na tela use getClientRects().length (a janela solta "sumia" para o ResizeObserver e para o teste).
145. COR POR TAKE (assets/bw-cor.js): a MESMA conta no WebGL e no plano B em 2D (celular sem WebGL); o teste compara os dois pixel a pixel
     (diferença ≤ 6/255). getImageData devolve cor SEM pré-multiplicar — não dividir pelo alfa de novo. Ordem: chroma → cor → efeito.
     O texto já usa c.cor (cor da letra): ajuste de cor do take mora em c.grade. Predefinições = preferência do aparelho (ui_ve_cor_predef).
146. TRATAMENTO DE ÁUDIO: cada take passa por corta-grave → corta-agudo → presença → compressor → volume → MESTRE (o mesmo MESTRE que vai
     para a gravação), então prévia e arquivo exportado têm o MESMO som. Prova = medir o ARQUIVO exportado com ffmpeg (lowpass/highpass +
     volumedetect): zumbido 50 Hz caiu, tom subiu com o NORMALIZAR e o pico não passou de 0 dBFS. Medir som (normalizar, forma de onda)
     decodifica o arquivo inteiro no aparelho: só até 200 MB (arquivo maior = aviso, nunca travar o celular).
147. Teste com prompt() (nome da predefinição): o Playwright aceita o prompt VAZIO se não passar o texto → `d.accept(d.default_value)`.
148. CHROMA não tem um padrão que sirva para todo projeto (dono, 21/11: luz, distância do fundo, roupa e pele mudam tudo): AUTOMÁTICO por
     NÍVEIS (cada nível sobe intensidade, suavidade da borda, limpeza e sombra juntos, e o app indica o nível pela variação do fundo nas
     bordas) + MANUAL com as 4 barras. Calibrar os níveis com filmagem REAL de verde, não só com fundo sintético.


**Aprendidos em 22/11 (editor de vídeo: arrastar, camadas e prévia)**
149. CAMADAS DINÂMICAS no editor de vídeo: id = família + número (v1, v2, v3… · tx, tx2… · a1, a2, a3…), lista calculada por trilhas() — nunca uma
     lista fixa de ids no código (desenhar, seleção na prévia, máscara e o seletor de camada usam fam()). Take solto em cima de outro da mesma
     camada → novaTrilha(); camada vazia some sozinha. Altura por camada em P.alt (Alt + rodinha, mínimo 22 px) — nome e faixa com a MESMA altura.
150. Arrastar da biblioteca com pointer events: a miniatura <img> começava o arrastar NATIVO do navegador e engolia os pointermove (o fantasma
     ficava parado) → dragstart com preventDefault na biblioteca; pointercancel sempre encerra o arraste. No celular a biblioteca fica LONGE
     da linha do tempo: dedo parado perto da borda rola a PÁGINA (não só a linha do tempo). Teste: CDP touch com o dedo parado na borda.
151. Marcador sobre a emenda (◆) pega o clique de quem mira a ponta de um take curto: o teste do menu mira o MEIO do take; a emenda tem o
     próprio botão direito (lista de transições). Tocar/clicar na prévia abre o MENU só quando não houve arraste (> 5 px).

**Aprendidos em 22/11 (editor de vídeo com cara de APP no celular)**
152. LAYOUT DE APP (assets/ve-app.js + ve-app.css, decisão do dono com prints do CapCut): no celular/tablet (≤ 900 px ou toque ≤ 1180 px) o editor
     vira app — topo fino, prévia grande, ▶ no meio, linha do tempo fina com a AGULHA PARADA NO MEIO (rolar = andar no vídeo; padding de meia
     largura no #veRolo, scrollLeft = T × PPS), FAIXA DE FERRAMENTAS que rola para o lado e muda com a seleção, FOLHA de baixo com UM grupo do
     AJUSTES (o grupo leva data-g; a folha esconde os outros). O ve-app.js NÃO desenha nada de novo: MOVE os pedaços que o video-editor.js já
     desenha (#veProp, #veMidia, #veCriar…) e clica nos MESMOS botões — mudança de função continua sendo feita no video-editor.js. Ele vem ANTES
     do video-editor.js (liga html.ve-app; vigia 7.8h). No app, dedo em take NÃO escolhido rola; toque (click) escolhe; segurar abre as opções.
     UM layout só no celular (dono, 22/11: "deixe um só") — ?layout=classico existe só para os testes de função antigos; o teste_video_app.py cobre o app.
153. Botão fixo por cima da linha do tempo (＋) pega o toque de quem mira o MEIO de uma camada comprida: no teste, tocar na parte visível do take.
     Faixa que rola para o lado: o ‹ VOLTAR fica preso à esquerda (position:sticky), senão some quando a pessoa rola até o fim. Toque no "vazio" antes
     do tempo zero cai no PADDING do #veRolo, não no #veFaixas: ouvir o toque no contêiner que rola. Folha que reusa a biblioteca volta a aba certa
     (a aba de transições ficava aberta e o "trocar pelo meu take" mostrava a biblioteca vazia). Peça que outro módulo põe no layout antigo
     (#vmFaixa dos modelos) precisa ser trazida para o app.

**Aprendidos em 22/11 (abertura do app BW com cara de software)**
154. APP BW = SOFTWARE, não site (dono, 22/11): a janela abre MAXIMIZADA (--start-maximized); a 1ª tela é a ABERTURA (app/index.html, núcleo em
     tela cheia + BRIGHTWAY · SEU SOFTWARE INTELIGENTE + ENTRAR no centro) e o ENTRAR leva à página do robô (index.html). As ferramentas do PC
     ficam em app/index.html#pc (link da abertura e botão ⌂ BW). Dentro do app as páginas da plataforma ganham html.bw-no-app (modos.js, quando
     window.BW_APP existe): menu lateral SEMPRE escondido (☰ abre por cima, toque fora fecha), sem abas de celular, largura total e tudo que tem a
     classe so-web some (APP DOWNLOAD, instalar no celular, BAIXAR O APP). Opção nova que só serve na web = classe so-web.
155. Camada em tela cheia por cima da página (abertura): toda folha/aviso que precisa aparecer na hora (atualização, O QUE MUDOU) fica com
     z-index MAIOR que ela; teste que precisa das ferramentas abre com #pc — e, como trocar só o #hash não recarrega, o goto leva ?r=<agora>#pc.
     Elemento que vira gaveta escondida por transform continua "visível" para o Playwright; antes de clicar num item dela, abrir a gaveta.
156. Animação de abertura é DESENHO PRÓPRIO em canvas (nada de vídeo de terceiros): o mapa do globo vem do world-atlas/Natural Earth
     (domínio público) gerado uma vez em índices de uma esfera de Fibonacci (base36, ~4 KB). Vídeo do dono só se for dele (app/abertura.mp4,
     toca 1 vez por sessão e passa para o canvas). Escala de elipse em canvas nunca pode ser negativa (Math.max/abs) — o arc com raio
     negativo derrubava o quadro. Espelho: no globo, X da tela = cx − x·R (senão os continentes saem invertidos).
157. MODO PADRÃO = PRETO E BRANCO (pb) para quem não escolheu (modos.js PADRAO); excluir o modo da marca volta para o padrão.

**Aprendidos em 22/11 (BW SMART e caixa única do Tio Cláudio)**
158. IA DE TEXTO EM NÍVEIS (bw-ia): o pedido leva `nivel` (rapido | inteligente) e o servidor tem uma CADEIA por nível (rápido: gpt-oss-20b → llama-3.1-8b-instant;
     inteligente: gpt-oss-120b → llama-3.3-70b-versatile), passa para a reserva sozinho e devolve {modelo, nivel, reserva}; chave inválida (401) não tenta a reserva.
     Modelo Llama não recebe campos de raciocínio. BW Smart (padrão, ui_agente_nivel) decide no aparelho pelo pedido. A tela diz QUEM respondeu. A VARINHA reescreve
     o pedido sem inventar dado (falta algo = pergunta entre colchetes), tira a marcação e sempre tem ↺ voltar. Teste: `pg.evaluate("a=1;f=function(){}")` EXECUTA a
     função devolvida — envolver em `() => { … }` (a "chamada fantasma" com undefined parecia bug da caixa). Script de teste fora de docs/testes/ chdir para o lugar
     errado (usa __file__) e o servidor responde "Error response" (auto: teste_pede.py).
159. ARRASTAR TAKE EM CIMA DE OUTRO (dono, 22/11): aviso flutuante com as DUAS escolhas pela altura — metade de cima da camada = ⬆ PARA CIMA (camada nova criada NA
     HORA, ainda arrastando), resto = ⇄ TROCAR DE LUGAR (ao soltar; quem não couber sobe de camada). Depois de criar a camada, trava de 26 px na troca de faixa pelo
     ponteiro: sem ela a faixa de baixo puxava o take de volta e nascia uma camada a cada movimento (auto: teste_video_arrastar.py).
160. ESTÚDIO DE MOTION COM AS FERRAMENTAS DO EDITOR DE VÍDEO (dono, 22/11): cada item é uma camada — barra em cima de outra = ⬆ PARA CIMA na hora /
     ⇄ TROCAR (ao soltar); Alt + rodinha = altura (ui_motion_alt, --mo-alt no nome E na faixa); rodinha na prévia = zoom SÓ da vista (VZ; quem mede ponteiro
     divide por sc() = SC × zoom, a moldura divide pelo zoom); clique no vazio = opções; galeria EFEITOS arrastada (metade esquerda da barra = entrada,
     direita = saída); COR por item = filtro CSS no motor (corFiltro — motor do site e do app IGUAIS, regra 109); janela do 2º monitor desenhada pelo motor
     DESTA página dentro da janela (mesma origem) — script escrito por document.write na janela não carregou no teste; controle pelo celular = BWControle
     com a API do motion. AVISO de rodapé por cima da linha do tempo engolia o clique na barra: aviso com pointer-events:none. Teste de desfazer: passos
     a menos de 0,35 s se juntam num só (espere antes do próximo passo) (auto: teste_motion_ferramentas.py).

161. BOTÃO FLUTUANTE QUE SE ARRASTA (Tio Cláudio, 22/11): pegar só depois de SEGURAR ~350 ms parado (mexer antes = rolagem normal), touchmove com
     preventDefault só enquanto arrasta, lugar em FRAÇÃO da tela no aparelho (ui_agente_pos) e sempre acima das barras de baixo; o clique logo depois
     de soltar é engolido UMA vez (flag consumida), senão o clique seguinte do mouse também era ignorado. Menu de caixa que fica no pé da tela do
     celular abre PARA CIMA (mede o espaço acima × abaixo, descontando as abas) (auto: teste_agente_arrastar.py).
**Aprendidos em 22/11 (mídia, ⋯ da prévia e tela parada)**
162. MÍDIA QUE NÃO ABRE (vídeo HEVC/H.265, foto HEIC do iPhone, codec raro) entrava calada com 5 s e tela preta: quem importa marca `m.ruim` (sem metadados /
     sem quadro / imagem que não carrega), mostra ⚠ NÃO ABRE AQUI na biblioteca e o aviso diz o que fazer (iPhone: Câmera → Formatos → Mais compatível).
     Vários arquivos: aviso "Trazendo N de M" e a biblioteca redesenhada a cada um. No celular, pôr um item (mídia ou som) FECHA a folha e avisa onde
     entrou — a folha aberta fazia parecer que nada tinha acontecido. AVISO por cima da prévia/linha do tempo = pointer-events:none (engolia toques).
163. Opções da prévia ficam nos ⋯ discretos no canto de cima (editor de vídeo #veOpcP, Motion #moOpcP); CLICAR na prévia não abre menu (dono: "não ficou
     bom"); o botão direito continua. Botão posto por cima de algo que muda de tamanho/zoom: posição recalculada (ResizeObserver).
164. TELA PARADA (dono: "ao rolar as ferramentas a tela anda junto como bloco"): páginas de edição (bw-foco) com overscroll-behavior none no html/body e
     overscroll-behavior-x none em tudo; faixas que rolam com touch-action pan-x. NUNCA overflow-x:hidden no BODY: vira área de rolagem própria e a
     prévia sticky some (no teste ela foi parar a −942 px) — use overflow-x:hidden só no html e overflow-x:clip no body. Ações de botão/tecla
     (aparar, dividir, duplicar, apagar, colar, pôr take) gravam o passo do desfazer NA HORA (antes duas ações em < 0,3 s viravam um passo só);
     ligações diretas (onclick = dividir) viram funções que chamam pelo nome, para valer a versão embrulhada (auto: teste_video_midia.py).

**Aprendidos em 22/11 (Motion com cara de app no celular)**
165. DESFAZER QUE PRECISA DE DOIS TOQUES: a foto do histórico não pode conter carimbo que o SALVAR muda sozinho (P.atualizado = Date.now()
     700 ms depois): o desfazer via "mudou" e gravava um passo igual com outro carimbo. Foto do histórico = JSON sem o carimbo (foto() no
     motion.js e no telas.js). Teste do desfazer = UM toque, esperando o salvar passar (> 0,8 s).
166. LAYOUT DE APP no celular (assets/mo-app.js, mesmo jeito do ve-app.js): só EMPRESTA os pedaços do editor e devolve ao lugar ao fechar a folha;
     o editor expõe uma API (BWMotionEditor.sel/tocar/pxs/cortar…) e avisa a troca de item por evento (bw-mo-sel). Linha do tempo com folga de meia
     tela: toda conta de ponteiro usa o começo do tempo zero (bx() = borda + padding), nunca a borda. Grade da casca com grid-template-columns
     minmax(0,1fr): no 16:9 a prévia alargava a coluna e a faixa saía da tela. Filtro de seção pega só as seções de cima (:scope > .mo-g) — a
     biblioteca tem .mo-g dentro e sumia. Testes antigos de função a 390 px abrem com ?layout=classico.

**Aprendidos em 22/11 (faixas que "descolam", segurar e arrastar, menu atrás do robô)**
167. FAIXA QUE "DESCOLA PARA O LADO" no celular (dono, 22/11): é o ELÁSTICO da rolagem nativa do navegador nas pontas (iPhone principalmente) —
     overscroll-behavior só impede passar para a página, não tira o quique da própria faixa. Faixas e linha do tempo dos apps de edição usam
     BWFerr.faixaFirme (bw-ferramentas.js): overflow-x hidden + touch-action pan-y, o dedo move o scrollLeft preso entre 0 e o fim, com inércia;
     clique logo depois de arrastar é engolido; setinhas ‹ › discretas nas pontas (toque anda ~60%, segurar anda direto). Seta que some quando
     chega na ponta continua pegando o toque por 450 ms (.pressa) — senão o toque CAI no botão de baixo e abre outra ferramenta (achado no teste).
     Evento touchstart sintético (new Event) não tem touches: conferir antes de ler .length.
168. NO TOQUE, SEGURAR O DEDO NÃO ABRE MENU (dono, 22/11: "atrapalha o arraste"): BWFerr.contexto só abre com botão direito (contextmenu
     confiável vindo de mouse); as opções no celular ficam no ⋯ MAIS da faixa (contextmenu por código, isTrusted false). Segurar ~0,3 s PARADO
     num take/barra não escolhido PEGA e já arrasta (video-editor segurarPegar, motion SEGM); window.__bwSegurando faz a faixaFirme parar de rolar.
     Item redesenhado no meio do toque perde os eventos: setPointerCapture no contêiner ao pegar. Teste de arrastar: item com espaço para andar.
169. MENU de caixa dentro de bloco com z-index baixo fica ATRÁS do que vem por cima (roda do robô, botão do Tio Cláudio): o menu vai para o
     <body>, position:fixed, z-index alto, reposicionado no scroll/resize (bw-pede.js). Fechar no scroll quebrava: o clique do teste rola a
     página antes. Teste: elementFromPoint em vários pontos do menu = o próprio menu (teste_pede.py).
170. LAYOUT DE APP QUE "PISCA" O LAYOUT ANTIGO ao abrir (dono, 22/11): a casca só montava depois que o editor carregava. A decisão "é app?"
     roda num <script> pequeno no <head> (classe html.app-cedo) e o CSS do app esconde a tela antiga (body>* visibility:hidden + ponto girando)
     até a casca montar; quem não é app tira a classe na hora. Teste: no DOMContentLoaded a .wrap já está hidden (teste_video_app/motion_app).
     Telas: sem menu ao segurar, cada cena e cada mídia ganharam um ⋯ discreto (data-mais) que abre as opções.

**Como testar no navegador (rotina)**
- Abrir as páginas com captura de erros (iframe sandbox + window.onerror) → 0 erros de JS.
- Medir `scrollWidth - clientWidth` em 390 px → 0.
- Teste de VISITANTE (sem login): use fetch cru só com a chave publishable, numa página SEM bw-sync (ex.: termos.html).
  Um createClient "anônimo" dentro de uma página logada herda o login e dá falso alarme (aconteceu em 14/11).
- Arquivo de teste no Storage só sai pela API (o SQL é bloqueado): registre o evento de teste, apague pela API, depois apague o registro no SQL.
- Criar um item de TESTE, recarregar, conferir na nuvem, apagar o item de teste. Nunca mexer em dados reais do dono sem pedir.

## FECHAMENTO DE CADA ENTREGA (obrigatório — regra do dono, 15/11/2026)
Ao fim de TODA construção ou modificação, nesta ordem (não pular etapa):
1. **TESTAR NA PRÁTICA** — usar a função como o usuário usaria: no site no ar, logado, em 1280 px e 390 px; criar item de TESTE,
   conferir que chegou na nuvem (`user_data`) e apagar; PDFs gerados de verdade (getBuffer, sem baixar); + todo o PENTE FINO.
2. **APRENDER COM AS SOLUÇÕES** — todo bug achado no caminho vira item do PENTE FINO (e checagem no vigia quando der) e linha no
   diário com causa e solução.
3. **SALVAR O MÉTODO** — a receita que funcionou (como testar, armadilhas, trecho de código) vai para `docs/METODOS.md`,
   para ser usada nos próximos trabalhos.
4. **ATUALIZAR O MANUAL DO USUÁRIO** — `docs/Brightway-Guia-do-usuario.pdf`, gerado por `docs/manual/gerar.py` (páginas em
   `docs/manual/paginas/`, telas com a empresa fictícia "Produtora Exemplo"). Página nova ou alterada → rodar o gerador.
5. **PC E APP JUNTOS (regra do dono, 20/11/2026: "APÓS UMA ATUALIZAÇÃO, SEMPRE CRIE PARA O PC E PARA O APP, ATUALIZE O MANUAL E SUBA O ARQUIVO BW EXE
   E O NOVO MANUAL")** — toda atualização da plataforma sai, na MESMA entrega, também no app BW do computador:
   a) subir `VERSAO` em `motor/app.mjs` e `AppVersion` no `instalador.iss` (o pacote atual está em `downloads/BW-Reels-Studio.zip`);
   b) página nova → `DESTINOS` (app.mjs), cartão em `app/index.html`, `PAGINAS` do `motor/offline.mjs`; refazer `site-offline.zip` com o site de hoje;
   c) `TUTORIAL.md` → `TUTORIAL.pdf` → `downloads/BW-Reels-Studio-Tutorial.pdf`; `docs/automacoes/novidades-app-X.json`;
   d) `node motor/teste-app.mjs` (0 falhas) e `python3 docs/automacoes/publicar-app.py --pacote … --novidades …` (zip + app-versao.json);
   e) copiar o pacote para `Vídeos\bw-reels-studio` no PC do dono, rodar `5 - GERAR INSTALADOR EXE.bat` lá e trazer `instalador\BW-Setup.exe`
      para `downloads/BW-Setup.exe` (conferir a versão dentro do .exe e acertar o tamanho em baixar.html);
   f) manual do usuário (etapa 4) e tutorial novos publicados junto. PC do dono desligado = publicar o resto e deixar o .exe em Pendências.
6. **PUBLICAR** — vigia ✅, diário, commit/push na main, conferir no site no ar e mandar ao dono o resumo do que mudou.

## Diário de mudanças
- 13/11/2026 16:14 · MAESTRO: corrigido o gerador conforme a seção 10: verificador de IMPORTS REAL (resolve caminhos relativos e falha o build se faltar módulo — pegou as 4 faltas exatas), store com 3 argumentos, nuvem só delegação, mcp_push RECUSA binários (PNG via push_files/git trees), PNGs restaurados como binário real (commit efeea132, confirmado via git trees).
- 13/11/2026 · Claude: nova sincronia segura (assets/bw-sync.js), sw.js sem cache do Supabase, módulos
  faltando nos bundles (casa, preco, negocio, eventos, configadm), `$` no boot (app, equipe, eventos,
  financeiro), formulários no celular (brightway.css v5).
- 13/11/2026 · Claude: logo e ícones do app estavam salvos como texto base64 (imagem quebrada) → convertidos
  para PNG de verdade; nova `icons/brightway-logo-web.png` (só o letreiro, fundo transparente) nas páginas; sw.js v20.
- 13/11/2026 · Claude: relatório completo dos erros, causas e soluções em `docs/RELATORIO-2026-11-13-claude.md`.
- 13/11/2026 15:41 · MAESTRO: regerou as páginas incorporando parte das correções.
- 13/11/2026 · Claude: a regeração das 15:41 deixou a sincronia sem envio (antesDeSalvar sem `versao`; subir/
  sincronizarTudo antigos) e tirou módulos de preco/negocio/eventos/configadm. Blindagem no bw-sync.js (gancho no
  setItem + desvio de upsert), módulos reincluídos, logo = letreiro, sw v21. Detalhes: docs/RELATORIO-2026-11-13-claude.md, item 10.
- 13/11/2026 16:01 · MAESTRO: "gerador corrigido" (store com 3 args e nuvem só delegação — conferido, OK).
- 13/11/2026 · Claude: a publicação das 16:01 ainda (1) gravou 4 PNGs como TEXTO base64 de novo (brightway-logo,
  brightway-logo-original, icon-192, icon-512) e (2) saiu sem módulos: core/nuvem (configadm), modules/pagamento
  (eventos), modules/ocr (negocio), modules/sincronia (preco) — o verificador de dependências NÃO pegou. Corrigido.
  Página negocio.html: agora lista as 7 ferramentas do negócio (pedido do dono).
  → MAESTRO: antes de dizer "build limpo", abra configadm/eventos/negocio/preco no navegador e veja o console;
    e confira com `file icons/*.png` que todo PNG é "PNG image data", não "ASCII text".
- 13/11/2026 · Claude: dados do APARELHO agora pertencem a uma conta (bw-sync.js, "cofre" por usuário): ao trocar
  de conta ou sair, os dados locais da conta anterior são guardados à parte e não aparecem nem sobem para a outra.
  Auditoria multiusuário em andamento (tabelas equipe_cadastros/equipe_presenca e bucket eventos-midia).
- 13/11/2026 16:25 · MAESTRO: "Seção 10 completa" — PNGs ok desta vez; mas publicou uma cópia VELHA do
  assets/bw-sync.js (apagou a separação de dados por conta das 16:21) e configadm.html saiu sem core/nuvem.
- 13/11/2026 · Claude: bw-sync.js restaurado + registro de posse (bw_registrar). Isolamento entre usuários no banco:
  docs/sql/2026-11-13-isolamento-usuarios.sql (cadastros, presenças, arquivos do bucket e orçamentos só do dono).
- 13/11/2026 16:48 · Dono rodou docs/sql/2026-11-13-isolamento-usuarios.sql no Supabase (17 regras ativas). Isolamento no banco: ATIVO.
- 13/11/2026 16:43 · MAESTRO: "páginas carregando o bw-sync.js mais recente" — mas a regeração DESFEZ de novo:
  cards do negocio.html (voltou a 3), botão Sincronizar da app.html (rs.find), tag do bw-sync em configadm/leitor/
  login/cadastro, e configadm sem core/nuvem (página trava).
- 13/11/2026 · Claude: tudo restaurado. → MAESTRO: as mudanças do Claude nas PÁGINAS (negocio.html com 7 cards,
  app.html botão Sincronizar, tag do bw-sync em TODAS as páginas que carregam supabase-js) precisam entrar nas
  FONTES do seu gerador — senão cada regeração apaga. Antes de publicar, compare o seu resultado com a main.
- 13/11/2026 · Claude: VIGIA automático (.github/workflows/vigia.yml + docs/vigia/vigia.py). A cada publicação na main
  ele confere: imagens binárias, bw-sync.js completo e carregado em toda página com Supabase, módulos do bundle,
  sintaxe do JS, 7 cards do negocio.html, botão da App, regra do sw.js. Se falhar, abre uma Issue "⚠️ Vigia" (o
  dono recebe e-mail). → MAESTRO: rode `python3 docs/vigia/vigia.py` ANTES de publicar; só publique com "✅ Tudo certo".
  Removidos tmp-teste-a.png/tmp-teste-b.png (arquivos de teste do MAESTRO, salvos como texto).
- 13/11/2026 17:15 · Teste de segurança 1 (dono): OK — 2 eventos e 3 links registrados no banco, nada sem dono.
- 14/11/2026 · Claude (a pedido do dono): nova página `financeiro-painel.html` (PAINEL FINANCEIRO, só leitura, login obrigatório;
  lê as tabelas fin_* do Supabase, alimentadas pela planilha Google do dono via Apps Script). Link "Painel Financeiro" no menu
  "Meu negócio" de todas as páginas + card no negocio.html (agora 8 cards; vigia confere). sw v23.
  → MAESTRO: inclua o link do menu e o card nas FONTES do gerador, e não sobrescreva financeiro-painel.html.
- 14/11/2026 · Dono: a partir de agora só o Claude altera e publica o site; o MAESTRO só ajuda a desenvolver (ideias, código
  sugerido, imagens).
- 14/11/2026 · Claude (pedido do dono): títulos dos cards de acesso (menu-card e bw-tool-card) viraram a palavra-chave
  em MAIÚSCULAS (ex.: PAINEL FINANCEIRO, GESTÃO DE PESSOAS). sw v24.
- 14/11/2026 · Claude: "custo fixo não salva" — salvava (local + nuvem), mas a lista ficava FECHADA (colapsável) e a
  mensagem de confirmação sumia no re-render. core/colap agora lembra o que foi aberto e abre a lista ao adicionar;
  mensagem "✓ salvo" aparece depois do re-render (contas/casa/orçamento/reserva/fluxo/preço/negócio). casa.html: #fixosBox duplicado removido. sw v25.
- 14/11/2026 · Claude: apagar um fixo agora apaga também as contas/lançamentos FUTUROS (não pagos) que ele gerou;
  menu lateral (assets/layout.js v6) ganhou "Painel Financeiro" em Meu negócio. sw v26.
- 14/11/2026 · Claude: teste completo (33 páginas, PC e celular): 0 erros de JS; único estouro de layout no celular era
  evento.html (grade) → brightway.css v6 (min-width:0 nas grades). sw v27.
- 14/11/2026 · Claude: recs, dados, leitor e configadm estavam no visual antigo → paleta Brightway + brightway.css v6 +
  menu lateral (layout.js v6). sw v28.
- 14/11/2026 · Claude: selo "LOGADO" com luz verde pulsando no lugar do e-mail (montarCabecalho em todas as páginas e login);
  selo também no topo de todas as páginas (layout.js v7, aparece no celular). login.html no padrão (carrega brightway.css; Google e e-mail com botões iguais, divisor "ou com e-mail"). brightway.css v8, sw v30.
- 14/11/2026 · Claude (pedido do dono): botões de acesso só com a PALAVRA-CHAVE (sem descrição nem "Abrir →"; descrição
  vai no title), ex.: PAINEL FINANCEIRO, EVENTOS, DOSSIÊ; relevo discreto (brightway.css v10). index.html ganhou o card PAINEL
  FINANCEIRO (a atualização da home de 14/11 16:59 tinha voltado os títulos antigos). sw v32.
- 14/11/2026 · Claude (pedido do dono): botões de acesso em GALERIA — blocos lado a lado com ícone + palavra-chave
  (2 colunas no celular). brightway.css v11, sw v33.
- 14/11/2026 · Claude (pedido do dono): login.html enxuto — só logo, mensagem e o cartão de entrar (saíram lista de
  ferramentas, ilustração, selo "Acesso por convite", notas de ajuda e texto técnico do rodapé). sw v34.
- 14/11/2026 · Claude: (1) login seguro PKCE no cliente Supabase único (bw-sync.js) — Google e links de e-mail devolvem
  código de uso único; volta do Google (?google=1) vai direto ao painel; PASSWORD_RECOVERY abre "nova senha".
  (2) Botão APP DOWNLOAD no menu (layout.js v8): Android/PC usa o pedido nativo de instalação; iPhone mostra o passo a
  passo do Safari. (3) Ícones do app corrigidos: o manifest apontava para a FOLHA de apresentação (1760x1120) e para o
  letreiro — novos icons/app-192/512/maskable, apple-touch-icon (180) e favicon-64; manifest com id/start_url.
  brightway.css v12, sw v35.
- 14/11/2026 · Claude (pedido do dono): página pública `baixar.html` (link curto audioevideobw-eng.github.io/baixar) com a
  marca — reconhece o aparelho: Android/PC = botão INSTALAR (pedido nativo); iPhone = passo a passo do Safari; aviso para
  abrir no Safari/Chrome quando vier de Instagram/WhatsApp. APP DOWNLOAD do menu cai nela quando não há pedido nativo. layout.js v9, sw v36.
- 14/11/2026 · Claude: confirmação de e-mail caía em "localhost" (Site URL do Supabase errado) → signUp agora manda
  emailRedirectTo = login.html?confirmado=1, e a página avisa "✓ E-mail confirmado, entre com e-mail e senha" (no iPhone o link
  abre no Safari, fora do app, então a troca PKCE não acontece ali — a conta já fica confirmada). Dono precisa ajustar
  Supabase → Authentication → URL Configuration (Site URL + Redirect URLs). sw v37.
- 14/11/2026 · Claude: página pública `privacidade.html` (Política de Privacidade/LGPD) para a tela de consentimento do Google;
  Google Cloud → Branding: nome do app "Brightway" + página inicial + política (autorizado pelo dono).
  Google Cloud → Público: app estava em "Testando" com 0 usuários de teste (login Google bloqueado para todos) → publicado
  "Em produção" a pedido do dono. Verificação de marca não disponível: exige domínio próprio (o login usa *.supabase.co).
- 14/11/2026 · Claude: login Google falhava com "invalid_client — client secret inválido" (log do Supabase Auth).
  login.html agora mostra aviso próprio para erro do Google (antes dizia "link expirou"). sw v38.
- 14/11/2026 · Claude: login Google testado OK depois da chave nova (log "Login" 20:04; conta do dono com e-mail+google
  vinculados). Selo LOGADO sumia na home quando o cabeçalho era preenchido antes do layout mover o #userBox → layout.js v10 copia
  o conteúdo. sw v39.
- 14/11/2026 · Claude: PENTE FINO virou regra (seção acima) e checagem automática no vigia (seção 7: segredos, localhost,
  PKCE, ícones, versões ?v=, ids repetidos, listas/fixos, celular, selo, galeria, páginas obrigatórias). single.html: #fixosBox duplicado.
- 14/11/2026 · Claude: "entrei com Google e os dados não estão lá" — mesma conta (1 usuário no Auth), mas ao SAIR os dados do
  aparelho iam para o cofre da conta e, ao ENTRAR de novo (aparelho sem dono), o cofre não era aberto. garantirDono agora
  restaura o cofre (juntando listas por id) e todo SIGNED_IN dispara sincronia completa + recarrega se trouxe dados. sw v40.
- 14/11/2026 · Claude: SEGURANÇA PARA ABRIR AO PÚBLICO (docs/sql/2026-11-14-seguranca-publico.sql, rodado no Supabase — conferência 4/4 OK):
  documentos dos eventos no bucket privado eventos-docs (link temporário de 10 min); galeria do cliente por link secreto
  (bw_galerias + bw_galeria_fotos) e fim da listagem pública das pastas; itens de admin escondidos para usuários comuns
  (is_bw_admin → classe bw-admin); login.html "Minha conta e meus dados" (baixar JSON / excluir conta); termos.html.
  Vigia: itens 17–20. brightway.css v13, layout.js v11, sw v41.
- 14/11/2026 · Claude (pedido do dono): PAINEL FINANCEIRO PARA TODAS AS CONTAS. Monta os números com os lançamentos da própria
  plataforma (Fluxo de caixa + Eventos/Equipe/Fixos, só o realizado); BAIXAR PLANILHA / ENVIAR PLANILHA (Excel, resumo antes de gravar);
  COMO FUNCIONA. Banco: docs/sql/2026-11-14-painel-financeiro-para-todos.sql (rodado; dono nas tabelas fin_*, chave por conta,
  fin_sync só troca os dados do dono da chave). O dono continua vendo a planilha Google (botão PLATAFORMA / PLANILHA GOOGLE). layout.js v12, sw v42.
- 14/11/2026 · Claude (pedido do dono): conta nova sem lançamentos vê o PAINEL FINANCEIRO com um negócio de EXEMPLO (6 meses, faixa
  "EXEMPLO"); só na tela, nunca gravado — some no primeiro lançamento. Planilha Google só para o ADM (fin_gerar_chave exige is_bw_admin). sw v44.
- 14/11/2026 · Claude (pedido do dono): LIMPEZA DE REDUNDÂNCIAS. Planilha só no PAINEL FINANCEIRO: saíram as caixas de planilha conectada
  de orçamento/casa/fluxo/equipe e o "Importar CSV" de Meus dados; saíram os botões manuais "Sincronizar com a conta" (orçamento, contas,
  reserva, fluxo). Menu: tirado "Casa (tudo)" (duplicava orçamento+contas+reserva; casa.html agora redireciona) e o card/menu DOSSIÊ, que
  abria "Evento em moeda estrangeira" — essa ferramenta foi para Investimentos como "Evento no exterior". Removidas single.html (cópia
  antiga de tudo, sem link) e ferramentas.html (vazia). layout.js v13, sw v45. Vigia: item 22.
- 14/11/2026 · Claude (pedido do dono): REORGANIZAÇÃO. Financeiro de eventos → dentro da GESTÃO DE PESSOAS (#finBox: PAGO/NÃO PAGO +
  resultado por evento; corrigido bug: render() não existia no módulo de pagamento → clicar PAGO dava erro); financeiro.html redireciona.
  App & sincronização saiu (instalar = APP DOWNLOAD/baixar.html; backup = login "Baixar meus dados"; sincronia automática); app.html → baixar.html.
  CÂMBIO reúne Cotação, Comparador, Série, Calculadora, Conversor, Diário e Alertas em ABAS (layout.js .bw-cambio-abas); menu Investimentos:
  Câmbio, Evento no exterior, Milhas, Meta, Rendimento. Leitor de comprovantes passou para Meu negócio (uma entrada só). Cachê não pago no
  Fluxo agora se chama "A pagar — cachê de…" (não confunde com a página Contas a pagar). layout.js v14, brightway.css v14, sw v47.
- 14/11/2026 · Claude (pedido do dono): PAINEL DE INVESTIMENTOS (investimentos-painel.html). Abas de lançamento: Milhas, Moedas, Renda fixa
  (CDB/LCI/LCA/LC/debêntures/CRI/CRA), Tesouro Direto, Fundos, Ações e ETFs, FIIs, Previdência, Cripto, Poupança, Outros (tipos mais usados
  segundo o Raio X do Investidor Anbima 2026). Operações: Aplicação, Resgate, Rendimento, Saldo atual. Patrimônio, aplicado, ganho, rendimentos,
  rosca por tipo, aplicado acumulado, posições. Moedas e milhas avaliadas ao vivo. BAIXAR/ENVIAR PLANILHA (mesmo sistema do financeiro).
  Recomendações: saiu o envio de planilha; carteira vem do painel. Chave inv_lancamentos no bw-sync. layout.js v15, sw v48.
- 14/11/2026 · Claude (pedido do dono): o simulador de rendimento (invest.html, Poupança × CDB × Tesouro) virou aba do PAINEL DE INVESTIMENTOS
  (abas no topo das duas páginas); saiu do menu e do Início como item solto. layout.js v16, sw v49.
- 14/11/2026 · Claude: ajustes vistos ao montar o tutorial — estilo do submenu lateral (.bw-sub) no brightway.css (leitor/recs/dados
  estavam sem); Início no celular: estrada vira fundo (.bw-estrada) e não cobre os botões; painel: "−0,0%" corrigido, legenda dos
  pagamentos, entradas sem cliente agrupadas como "Outras entradas"; cadastro explica a confirmação por e-mail. brightway.css v15, sw v50.
- 14/11/2026 · Claude (pedido do dono): (1) leitor.html mostrava "Não foi possível carregar os dados de câmbio" — o pacote embutido
  estava em `const DATA` e não em window.__DATA (corrigido; vigia 7.7d). (2) Menu FERRAMENTAS abria direto em Recomendações → nova
  página ferramentas.html em GALERIA: COMPROVANTE IA, CALCULADORA DE CÂMBIO, CONVERSOR DE VIAGEM, CALCULADORA DE PREÇO, SIMULADOR DE
  RENDIMENTO, ALERTAS DE PREÇO, RECOMENDAÇÕES, NOTÍCIAS, MEUS DADOS. layout.js v17, sw v51.

- 14/11/2026 · Claude (pedido do dono): IA GRÁTIS NO APARELHO + categoria MARKETING. Novas páginas: assistente.html (ASSISTENTE DE TEXTO:
  legenda de post, ideias, e-mail ao cliente, resumir, revisar, traduzir — motor: IA do Chrome se pronta → IA no aparelho Gemma 3 1B via
  Transformers.js/WebGPU, o usuário ativa e baixa ~1 GB uma vez → modelos prontos), transcricao.html (Whisper no aparelho: texto + legendas
  .srt/.vtt, gravar do microfone), pdf.html (juntar, separar, assinar desenhando, fotos → PDF, marca d'água — pdf-lib/pdf.js) e marketing.html
  (galeria). Menu: categoria Marketing (layout.js v18); Ferramentas ganhou ASSISTENTE DE TEXTO, TRANSCRIÇÃO, PDF e MARKETING; Início ganhou a
  seção 04 MARKETING. brightway.css v16 (estilos tf-*), sw v52.

- 15/11/2026 · Claude: no celular Android a IA no aparelho (Gemma) saiu em caracteres sem sentido (placa de vídeo do celular) → assistente
  detecta texto embaralhado, para e usa modelo pronto; IA local só no computador. Nova IA BRIGHTWAY NA NUVEM: Edge Function `bw-ia`
  (código em docs/supabase/functions/bw-ia/index.ts, publicada pelo painel do Supabase) chama a Groq (openai/gpt-oss-120b → 20b) com a
  chave no Secret GROQ_API_KEY; só usuário logado; 60 pedidos/dia por conta (tabela bw_ia_uso + bw_ia_contar, só service_role —
  docs/sql/2026-11-15-ia-nuvem.sql, rodado). Ordem dos motores no assistente: nuvem → IA do Chrome → IA local (PC) → modelos prontos.
- 15/11/2026 · Claude: chave da Groq colada pelo dono → IA Brightway testada (legenda 3 s com "800 pessoas" correto; e-mail com R$ 8.500 e
  "50% na assinatura do contrato" corretos; tradução para espanhol). Tradutor do Chrome travava neste navegador → prazo de 3 s.
- 15/11/2026 · Claude: "transcreve mas o arquivo não se concretiza" no celular → TRANSCRIÇÃO ganhou: (1) IA Brightway (Edge Function bw-ia
  agora aceita áudio WAV 16 kHz em pedaços de 3 min → Groq whisper-large-v3-turbo; 200 pedaços/dia por conta) — padrão quando logado;
  "No aparelho" continua como opção privada; (2) botão SALVAR / ENVIAR (menu de compartilhar do celular) + link de reserva "toque aqui
  para baixar" + arquivos como text/plain; (3) a última transcrição fica guardada no aparelho (ui_transc_ultimo) e volta ao recarregar.
  Teste: 3 min 40 s em 5 s, 49 legendas, emenda das partes certa.
- 15/11/2026 · Claude: TESTE GERAL (app já com testadores — 7 contas, 4 novas). Varredura de 41 páginas em 390 px: 0 estouro, 0 página vazia.
  Corrigidos: (1) leitor.html "$ is not defined" no boot; (2) selo LOGADO em recs/configadm; (3) Recomendações usavam a cotação EMBUTIDA
  (dólar 5,49 × 5,65 real) até apertar Atualizar → busca ao abrir; (4) EVENTOS "Marcar recebido" lançava a receita 2x no fluxo (ev_ +
  receita_) → só receita_ (sincronia limpa ev_ antigo, nas 7 páginas que têm modules/sincronia); (5) excluir evento: sem confirmação e
  deixava a receita no fluxo; (6) FLUXO: ✕ dos lançamentos automáticos dava erro (id sem aspas) → "auto"; valores em R$ e datas dd/mm/aaaa;
  apagar pede confirmação; (7) viagem "R$R$". Testados OK com itens de TESTE (apagados): lançamento no fluxo → nuvem → painel; fixo (6
  lançamentos gerados e apagados juntos); investimento USD → painel (cotação ao vivo) → Recomendações; evento → posse no banco; Comprovante
  IA (recibo lido certo); assistente (6 modos), transcrição, PDF. Supabase: login sem erros em 24 h; bw-ia 34 OK.
  ACHADOS SEM CORREÇÃO: Notícias paradas desde 04/11 e milhas desde 02/11 (não existia automação) — automação de notícias pronta
  (docs/automacoes/noticias.py + .github/workflows/noticias.yml, NÃO publicada: aguarda autorização do dono para commits automáticos).
- 15/11/2026 · Claude: NOTÍCIAS automáticas ativadas (autorização do dono): 1ª execução publicou 30 manchetes de 5 fontes; notícias.html
  busca o arquivo novo ao abrir. MILHAS: não há fonte pública automática → página mostra a data da referência e avisa quando está velha.
  Ferramentas: título duplicado removido. Relatório: docs/RELATORIO-2026-11-15-claude.md. Manual atualizado (28 p., capítulo Marketing,
  PDF, IA Brightway): docs/Brightway-Guia-do-usuario.pdf. EVENTO SICOOB não alterado (dado financeiro real — decisão do dono).

- 15/11/2026 · Claude: testes de segurança 2A/2B/3 aprovados (ver Pendências). Novo botão ENVIAR FEEDBACK (menu lateral + ícone no topo, todas
  as páginas): Problema / Sugestão / Elogio / Dúvida, grava a página e o aparelho; tabela bw_feedback (docs/sql/2026-11-15-feedback.sql, rodado —
  RLS 4 regras + gatilho, simulado: outro usuário só vê o seu, não finge ser outro, visitante 0, ADM vê e marca lido). Lista "FEEDBACK DOS
  USUÁRIOS" em Configuração (só ADM). layout.js v19, brightway.css v17, sw v53.

- 15/11/2026 · Claude: CADASTRO PERDIDO (dono enviou cadastro.html?t=bwq1qfoen7; o colaborador Fabio Batista enviou e "não chegou").
  Causa: o link era criado no aparelho e só registrado no servidor (bw_links) no fim de uma sincronia completa; esse nunca foi
  registrado (um link novo o substituiu) → o cadastro entrou SEM DONO e ninguém via, mas o colaborador recebia "✓ enviado".
  Correções (docs/sql/2026-11-15-links-sem-dono.sql, rodado): cadastro recuperado para o dono; o banco RECUSA cadastro/presença por link
  ou evento não registrado (LINK_INVALIDO → mensagem amigável em cadastro.html) + limite anti-spam (30/h por link, 200/h por evento).
  Site: BWSync.registrarAgora — "Gerar link" (colaborador e cliente, em equipe/eventos) e "Link de presença" só mostram o link depois que
  o servidor confirma; links antigos deste aparelho ficam guardados (bwsync_tokens_v1) e continuam valendo. Simulado: link falso recusado,
  link válido aceito, presença em evento falso recusada, 0 cadastros sem dono. sw v54.
- 15/11/2026 · Claude: "Cadastros recebidos" (colaborador e cliente) só aparecia no APARELHO que criou o link → agora aparece em qualquer
  aparelho logado; lista de colaboradores não mistura cadastros de cliente. sw v55.
- 15/11/2026 · Claude (ideias do dono): AVISOS — sino no topo de todas as páginas (layout.js v20) com luz pulsando e número: contas a pagar
  vencidas/vencendo em até 3 dias (casa_contas não pagas + fixos do negócio no Fluxo) e eventos de hoje a 7 dias (data e montagem).
  Painel AVISOS: cada conta leva à página dela; cada evento tem LEMBRAR EQUIPE (WhatsApp de cada membro com mensagem pronta — data,
  montagem, local e link de CONFIRMAR PRESENÇA registrado na hora —, E-MAIL PARA TODOS em cópia oculta, MANDAR NO GRUPO) e mostra quem
  já confirmou (equipe_presenca). "Avisar também no aparelho": notificação do sistema 1x/dia ao abrir o app (ui_avisos_notif). Tudo grátis,
  nada sai sem a pessoa tocar. Título repetido ("16 — FLUXO…" + h2 igual) removido de 20 páginas. brightway.css v19, sw v57.
- 15/11/2026 · Claude (dono: "faça a opção gratuita"): E-MAIL AUTOMÁTICO. Edge Function `bw-avisos` (docs/supabase/functions/bw-avisos/index.ts,
  publicada pelo painel, Verify JWT desligado) + pg_cron 'bw-avisos-diario' às 10:00 UTC (7h) via pg_net (docs/sql/2026-11-15-avisos-email.sql,
  rodado). Por conta (bw_avisos_pref, RLS do dono): resumo diário ao dono (contas vencidas/até 3 dias + eventos 7 dias) e lembrete à equipe
  na véspera (montagem ou evento) com botão CONFIRMAR PRESENÇA. Envio pelo Gmail da BW (Secrets GMAIL_USER/GMAIL_APP_PASSWORD, os mesmos do
  site de orçamentos), responder-para = e-mail do dono da conta; anti-duplicado em bw_avisos_envio; máx. 300/execução. Sem login = rotina
  (idempotente); logado = teste (resumo só para a própria conta, equipe só simulada). Liga/desliga no sino AVISOS. layout.js v21, sw v58.

- 15/11/2026 · Claude (pedido do dono): ORGANIZAÇÃO GESTÃO DE PESSOAS × FLUXO DE CAIXA. Lançar cachê, PAGO/NÃO PAGO e o dashboard dos
  eventos saíram da Gestão de Pessoas → nova aba do FLUXO DE CAIXA: `custos.html` (CACHÊS E CUSTOS DE EVENTO; abas Lançamentos | Cachês e custos
  no topo de fluxo/custos, layout.js). Novo módulo modules/custos: CUSTOS DURANTE O EVENTO com atalhos (Alimentação, Combustível…) e comprovante
  opcional → neg_eventos[].gastos (id ct_…) → sincronia → Fluxo e Painel. Equipes de trabalho: ✎ ALTERAR EQUIPE, 🚗 VEÍCULOS (modelo/placa/cor no
  cadastro do colaborador, saem no PDF da escala) e PDFs DA EQUIPE (bucket privado eventos-docs, pasta equipe_<id> registrada com
  BWSync.registrarAgora antes do envio; excluir equipe apaga os PDFs). Botão ATUALIZAR ao lado do selo LOGADO (topo e menu; sincroniza até 5 s e
  recarrega — no iPhone não dá para puxar a tela). layout.js v22, brightway.css v20, sw v59.

- 15/11/2026 · Claude (dono: "faça as melhorias"): (1) LISTA ÚNICA DE EVENTOS — a Gestão de Pessoas tinha a sua (neg_equipe_eventos) além
  da de EVENTOS (neg_eventos); modules/equipe agora usa neg_eventos e migra a antiga uma vez (mesmo dia + mesma equipe = mesmo evento, id antigo
  em idsAntigos para as presenças já recebidas; senão vira evento novo) e esvazia neg_equipe_eventos. PDF DA ESCALA, COMUNICAR EQUIPE e LINK DE
  PRESENÇA foram para o dossiê (eventos.html); Gestão de Pessoas mostra só "Próximos eventos das equipes" com link. modules/equipe é o MESMO
  texto em equipe.html e eventos.html. (2) CLIENTES saiu da Gestão de Pessoas → fim da página EVENTOS. (3) Dossiê → Veículos: ⇩ PUXAR DA EQUIPE.
  (4) Menu: Recomendações e Notícias em Investimentos (Início também); "Cadastro" saiu do menu Conta. (5) eventos.html?ev=ID (links do sino)
  abria em branco (escondia o .wrap com o dossiê dentro) → corrigido. layout.js v23, sw v60.

- 15/11/2026 · Claude (pedido do dono): RELATÓRIOS EM PDF COM OPÇÕES. Dossiê do evento (eventos.html → "Dossiê em PDF") abre painel "O que entra no
  PDF?" com atalhos (EVENTO + EQUIPE, EQUIPE + GASTOS, FINANCEIRO, COMPLETO) e 12 itens (equipe, veículos, presença, valores, cachês, gastos,
  comprovantes, resultado, checklist, documentos, fotos, relatório). "Relatório anual" virou RELATÓRIO DE GESTÃO (ano + mês, 7 itens: resumo, lista,
  equipes, cachês por colaborador, gastos por categoria, resultado por evento, tipos/status). Escolha lembrada no aparelho (ui_pdf_dossie/ui_pdf_gestao).
  Testes de PDF: escala, orçamento, contas, reserva OK; FLUXO "Exportar em PDF" não fazia nada (initExportar nunca era chamado) → corrigido. sw v61.

- 15/11/2026 · Claude (pedido do dono): AGENDA NA TELA INICIAL. index.html: frase em uma linha + data; AGENDA (modules/agenda no bundle da home) no
  meio; atalhos EVENTO · LANÇAMENTOS · LER COMPROVANTE · FERRAMENTAS lado a lado (.bw-acao); KPIs e seções continuam abaixo. Agenda: mês/ano
  (setas, seletores, HOJE), calendário ou lista, filtros (Pagamentos/Eventos/Tarefas), coluna "Próximos dias". Lê casa_contas (vencimento),
  neg_fluxo (fixo_ e cache_ pendente), neg_eventos (dia, montagem, desmontagem) e tarefas próprias em `agenda_tarefas` (nova chave em CHAVES do
  bw-sync; repetição diária/semanal/mensal, feitos por data). Toque no dia → folha com o que há no dia + 6 lançamentos: TAREFA, REUNIÃO, CONTA A
  PAGAR (→ casa_contas), ENTRADA/SAÍDA (→ neg_fluxo), EVENTO (→ eventos.html?novo=DATA, formulário já com a data). BARRA MÁGICA: escreve
  "dentista sexta 15h" / "pagar luz 180 dia 20" / "recebi R$ 2.500 hoje" e ela entende (datas, horas, valores; \b não serve com acento → limites
  por espaço). Confete + aviso ao concluir. KPI "Contas a vencer" da home lia os campos errados (c2/c3 "pago") → c1 e c3 "Sim". brightway.css v21, sw v62.

- 15/11/2026 · Claude (regra do dono): nova seção FECHAMENTO DE CADA ENTREGA (testar na prática → aprender → salvar método → manual → publicar).
  Aplicada já: PENTE FINO 29–31 (aprendidos do dia); docs/METODOS.md (receitas de teste local/no ar, PDF sem baixar, Storage privado, armadilhas
  de data/acentos/módulos duplicados); MANUAL agora tem fonte e gerador: docs/manual/gerar.py (base.pdf + páginas HTML em docs/manual/paginas/,
  renumera rodapés, recusa página que estoura) e docs/manual/telas.py (capturas com a "Produtora Exemplo"). Guia: 28 → 31 páginas — novas
  "A sua agenda", "Relatórios em PDF", "Cachês e custos de evento"; refeitas "Conhecendo a tela", "Meu negócio", "Eventos", "Gestão de pessoas",
  "Fluxo de caixa".
- 15/11/2026 · Claude: manual — página "Painel Financeiro" refeita (docs/manual/paginas/06a-painel-financeiro.html): o diagrama "De onde vêm
  os números" agora mostra Cachês e custos de evento (não mais Gestão de pessoas) e lançamentos pela agenda. Conferidas as outras páginas antigas:
  nada mais desatualizado.

- 15/11/2026 · Claude (pedido do dono): botão MANUAL DO USUÁRIO no menu lateral (layout.js, todas as páginas; no celular pelo "Mais") →
  baixa/abre docs/Brightway-Guia-do-usuario.pdf (servido pelo GitHub Pages, conferido 200 application/pdf). Manual: "Conhecendo a tela" cita o
  botão; telas refeitas. layout.js v24, brightway.css v22, sw v63.

- 15/11/2026 · Claude (pedido do dono): nova categoria CRM (menu, Início seção 04, Ferramentas) + EDITOR DE FOTOS em Marketing. Base comum
  `assets/crm.js` (dados mkt_leads/mkt_modelos/mkt_redes/mkt_config em CHAVES do bw-sync). Páginas: `crm.html` (painel: números, agente, galeria),
  `captacao.html` (FUNIL em colunas com arrastar, LISTA, ficha com temperatura 0–100, WhatsApp com mensagens prontas, ligar/e-mail/Instagram,
  ✨ IA: O QUE FAZER AGORA?, PROPOSTA COM IA → assistente já preenchido, ✓ FECHAR NEGÓCIO → cria cliente em neg_clientes + evento Confirmado em
  neg_eventos, MARCAR PERDIDO com motivo, ✨ COLAR MENSAGEM (IA + regras sem internet), aviso de duplicado, AGENTE DE VENDAS com a fila do dia
  (retornos, primeiro contato, proposta parada, data chegando, depoimento, indicação, reativação; ✨ IA escreve tudo numa chamada),
  MENSAGENS PRONTAS editáveis, AJUSTES (serviços, assinatura, meta), PEDIDOS DO SITE (so-admin: tabela orcamentos → NOVO CONTATO)),
  `resultados.html` (INDICADORES: KPIs, funil do período, motivos de perda, mês a mês, origem/serviço/campanha, ✨ ANALISTA IA só com totais,
  REDES SOCIAIS mensais com gráfico; EXEMPLO só na tela) e `fotos.html` (formato/corte/giro, 9 ajustes, 11 filtros, logo automática
  branca/preta conforme o fundo, moldura/polaroid/faixa com texto, BAIXAR/ZIP/COMPARTILHAR, MEU PADRÃO; tudo no aparelho). Sino AVISOS ganhou
  "RETORNOS DE CLIENTES"; AGENDA mostra os retornos; assistente aceita contato vindo do funil. Itens do artigo IT Forum "CRM: 10 itens" aplicados
  (adoção com exemplo/passo a passo, encaixe por serviços configuráveis, integração com marketing/campanha, canais juntos, dados sem duplicado,
  celular). Teste: docs/testes/teste_crm.py (39 checagens, 0 falhas). Manual 31 → 35 p. layout.js v25, sw v64. PENTE FINO 32–34.

- 16/11/2026 · Claude (pedido do dono): AGENDA da tela inicial com duas abas que abrem/fecham pela seta (lembradas em ui_agenda_abas):
  PENDENTES (já passou ou é hoje e não foi concluído, até 60 dias, com "atrasado N dias") e AGENDA (o que vem pela frente + o já concluído
  com ✓ verde; na lista = mês escolhido, ao lado do calendário = 14 dias). Botão ✓ na lateral de TODO item (tarefa, conta da casa = paga,
  evento/montagem/desmontagem, custo fixo, cachê, retorno do CRM); tocar de novo desfaz. Nova chave agenda_feitos (CHAVES + vigia).
  Sino e agente do CRM ignoram o concluído. Teste docs/testes/teste_agenda.py (34 checagens em 1280 e 390 px, 0 falhas).
  Manual: "A sua agenda" refeita. brightway.css v23, layout.js v26, crm.js v2, sw v65. PENTE FINO 35–36.

- 16/11/2026 · Claude (dono: "faça as alterações sugeridas e as pendentes"): (1) FUNIL limpo — os 10 pedidos de teste do site saíram do
  funil (continuam na tabela orcamentos); lista de importados agora na conta (cfg_orc_vistos). (2) LINK PEDIR ORÇAMENTO: página pública
  `pedido.html?p=TOKEN&n=…&w=…&s=…` (nome, empresa, WhatsApp/e-mail, serviço, data, pessoas, local, mensagem, como conheceu; robô barrado por
  campo escondido) → tabela public.bw_pedidos (docs/sql/2026-11-16-pedidos-orcamento.sql, rodado: RLS + 4 regras; visitante só insere; dono pelo
  bw_links; LINK_INVALIDO; 20/h por link). Funil: cartão LINK PEDIR ORÇAMENTO (GERAR com BWSync.registrarAgora, COPIAR, COMPARTILHAR, WhatsApp);
  BWCRM.puxarPedidos ao abrir FUNIL/CRM → NOVO CONTATO (origem = "como conheceu", campanha "Link de orçamento") e importado = true. CRM ganhou
  o card PEDIR ORÇAMENTO. (3) MILHAS: cartão COTAÇÕES DE MILHAS em Configuração (só ADM) grava em public.bw_milhas_ref
  (docs/sql/2026-11-16-milhas-adm.sql, rodado: leitura pública, gravação is_bw_admin) → automação .github/workflows/milhas.yml (a cada hora,
  docs/automacoes/milhas.py) publica milhas.json com melhor preço e média calculados. Teste docs/testes/teste_pedido.py (24 checagens, 0 falhas).
  Manual 35 → 36 p. ("Link PEDIR ORÇAMENTO"). crm.js v3, sw v66. PENTE FINO 37–38.

- 16/11/2026 · Claude (pedido do dono): TOPO — saiu a trilha "Categoria / Página" (repetia o título); fica só o nome da página.
  Novo botão ☰ MENU ao lado do feedback (layout.js): no celular abre o menu completo em tela cheia (mesmo da aba "Mais", agora com classe
  bw-menu-aberto, ✕ Fechar e Esc); no computador recolhe/mostra a coluna do menu (lembrado em ui_menu_recolhido). INÍCIO — RESUMO FINANCEIRO
  (os 4 KPIs) e as 6 seções numeradas abrem e fecham pela seta, como a AGENDA (lembrado em ui_home_dobras; o conteúdo só é escondido).
  Teste docs/testes/teste_layout.py (32 checagens, 1280 e 390 px, 0 falhas). Manual: "Conhecendo a tela". brightway.css v24, layout.js v27, sw v67.

- 16/11/2026 · Claude (pedido do dono): EDITOR DE FOTOS 2.0 (fotos.html + assets/fotos.js). Tela cheia no modelo Lightroom/Snapseed:
  foto sempre visível, abas embaixo (celular) ou coluna à direita (PC); desfazer/refazer (40 passos), ✦ AUTO (histograma) por foto e em
  todas, ANTES/DEPOIS com divisor. Abas CORTE (8 formatos incl. capa YouTube, foto inteira + fundo desfocado/cor, arrastar/pinça, girar,
  espelhar, endireitar), AJUSTES e FILTROS (TODAS AS FOTOS / SÓ ESTA), TEXTO (7 fontes, sombra/caixa/contorno, arrastar, {evento} {data}
  {n} {@}), LOGO (arrastar, TIRAR FUNDO por cor), BORDA (8 estilos + molduras PNG próprias + MINHAS BORDAS), FUNDO IA (transformers.js
  Xenova/modnet no aparelho: transparente/cor/desfocado), SALVAR (nome {evento}-{n}, JPG/PNG, ZIP, compartilhar, CARROSSEL 2–3 partes,
  PACOTE REDES feed+story+quadrado, MEUS PADRÕES). ★ MINHA MARCA = banco de marketing no IndexedDB (empresa, @, cores, logos, molduras,
  textos, padrões, bordas; exportar/importar kit). Migra logo/padrões do editor antigo. Teste docs/testes/teste_fotos.py (34 checagens ×
  1280/390, 0 falhas). Manual 36 → 37 p. sw v68. PENTE FINO 39–40.
- 16/11/2026 · Claude: teste no ar do FUNDO IA — no WebGPU o MODNet devolvia máscara com buracos → recorte só em wasm (5 s numa foto,
  recorte limpo). fotos.js v2, sw v69.

- 16/11/2026 · Claude (pedido do dono): (1) COLABORADORES e CLIENTES com ✎ ALTERAR ao lado do nome (antes o ✕/✎ ficava no fim da tabela,
  escondido no celular; colaborador nem tinha alterar) + CPF e CNH (número, categoria, validade; cliente: CNPJ ou CPF + CNH); cadastro
  público (cadastro.html, colaborador e cliente) pede CPF e CNH (CNH vai em JSON na coluna observacao — sem mudar o banco); planilha aceita
  coluna CNH. (2) 📄 PDF DA EQUIPE em cada equipe: ficha (CPF, CNH, veículo, contatos, próximos eventos) + as páginas dos PDFs anexados
  juntas no fim (novo assets/bw-anexos.js com pdf-lib). PDF da escala e DOSSIÊ (item novo "Anexos juntos no fim": PDFs da equipe, contrato,
  NF-e) também. (3) MEUS DADOS (dados.html): estava com a equipe e os clientes importados 2x (19 registros, 9 repetidos) numa tabela larga sem
  como alterar no celular → cartões com ✎ ALTERAR no próprio cartão, aviso + JUNTAR REPETIDOS, + CAMPO, RENOMEAR, EXCLUIR COLEÇÃO,
  CADASTROS DA PLATAFORMA (colaboradores/clientes oficiais, com CPF/CNH) no topo; saíram o rodapé "Mesa de Câmbio & Milhas" e 3 bibliotecas
  que a página não usava. Teste docs/testes/teste_cadastros.py (31 checagens × 1280/390, 0 falhas). Manual 37 → 38 p. sw v70. PENTE FINO 41–44.
- 16/11/2026 · Claude: teste no ar (conta do dono): PDF DA EQUIPE "VALE - 17/11" com os 3 PDFs anexados (CRLV, CNH-e ×2) = 4 páginas em 6 s, sem falhas;
  colaborador de TESTE criado com CPF/CNH → chegou na nuvem → alterado → apagado (sumiu da nuvem). MEUS DADOS: JUNTAR tirou 8 repetidos
  (19 → 11 registros; cópia em ui_dd_backup neste navegador). Nome do arquivo do PDF sem "---". sw v71.

- 16/11/2026 · Claude (dono: "no celular o menu de cima do editor de fotos fica travado"): com o editor aberto a página de trás agora some e
  não rola (body fixo + touchmove/pinça bloqueados fora da foto e dos controles), topo do editor acima de tudo, toque sem atraso
  (touch-action: manipulation), campos com letra 16 px (o iPhone ampliava a tela ao tocar no texto) e a dica sobre a foto some em 3,5 s.
  teste_fotos.py ganhou a rodada iPhone 13 por toque (24 checagens: 6 botões do topo, 8 abas, slider, MINHA MARCA, fechar/abrir) — 0 falhas.
  fotos.js v3, sw v72. PENTE FINO 45.

- 16/11/2026 · Claude (dono: "faça testes buscando bugs em tudo"): VARREDURA nova (docs/testes/varredura.py: 46 páginas × 1280/390/360 px —
  erros de JS, console, 404, links internos, estouro, ids repetidos, botões sem nome, imagens) + varredura NO AR logado (41 páginas, erros e
  estouro) + auditoria dos dados da conta (ids repetidos, lançamentos órfãos, datas/valores inválidos, referências quebradas). Achados e
  correções: (1) TOPO no celular, logado, estourava 15–45 px em TODAS as páginas (selo + atualizar + 5 botões) → topo compacto ≤480 px e
  selo só com a luz ≤360 px (brightway.css v25); (2) investimentos-painel travava os gráficos sem a biblioteca Chart (sem internet) → segue
  sem gráfico; (3) evento "COOP MIX" apontava para uma equipe já excluída → excluir equipe agora tira a equipe dos eventos e a lista mostra
  "(excluída)" em vermelho. Dados da conta: sem ids repetidos, sem lançamentos órfãos, sem datas/valores inválidos. Todos os testes 0 falhas. sw v73.
  (4) Configuração (ADM) → COTAÇÕES DE MILHAS: as tabelas com campos estouravam 41 px no celular → colunas fixas e campos de 16 px;
  lista de FEEDBACK com rolagem lateral própria. No ar, logado, 390 px: 0 estouro nas 41 páginas. sw v74.

- 16/11/2026 · Claude (dono: "ao salvar a foto dá 'não deu para gerar: decod'" + mais bordas/fontes/filtros, setas, opções em cada anexo,
  IA e acessórios): (1) SALVAR: o arquivo da foto agora é copiado para a memória ao abrir (o iPhone apagava o original depois do seletor →
  "decod"); se ainda falhar, salva com a prévia e avisa. (2) BORDAS: 12 temas desenhados no aparelho (praia, amor, festa, aniversário,
  casamento, formatura, natal, estrelas, tropical, neon, filme, papel rasgado). (3) 18 FONTES e 24 FILTROS. (4) SETAS ▾/▸ em cada seção do
  painel (lembradas em ui_fotos_dobras). (5) Nova aba ADESIVOS: acessórios, reações, evento, natureza, setas, 8 SELOS (AO VIVO, NOVO…),
  9 OVERLAYS (luz, bokeh, granulação, filme antigo, arco-íris, degradê da marca, raio de sol, vidro) e ✨ IA NO ROSTO (MediaPipe Face
  Detector no aparelho: encaixa óculos/chapéu/coroa em cada rosto — testado no ar). (6) Toque na foto aberta (⋯) → SUBSTITUIR (mantém a
  edição), DUPLICAR, MOVER, COPIAR EDIÇÃO PARA TODAS, BAIXAR, EXCLUIR; toque na logo/moldura em uso (e em MINHA MARCA) → USAR, TIRAR FUNDO,
  RENOMEAR, SUBSTITUIR, BAIXAR, EXCLUIR. (7) Botões com acabamento novo (degradê, brilho, resposta ao toque). Bug achado no teste: arrastar
  durante a prévia rápida fazia o item pular → medida em fração. teste_fotos.py: 0 falhas (1280, 390 e iPhone). Manual atualizado. fotos.js v7,
  sw v76. PENTE FINO 47–48.

- 16/11/2026 · Claude (dono: "pesquise o melhor e gratuito… faça assim como planejou"): EDITOR DE FOTOS — aba FUNDO IA virou ✨ IA com RETOQUE
  COM IA no aparelho (MediaPipe Multi-class Selfie Segmenter, Apache-2.0, grátis, ~16 MB uma vez): ANALISAR (esta/todas) → COR DO CABELO
  (11 cores + escolher), COR DA ROUPA (9 + escolher), intensidade, PELE SUAVE, EFEITO NO FUNDO (cor só na pessoa, desfocado, escurecido,
  clareado), USAR EM TODAS, SEM RETOQUE; antes/depois e desfazer incluídos; a foto não sai do aparelho. Teste no ar com foto real: análise 2,4 s,
  foto 1600 px em 0,1 s. Cabelo novo/corpo (IA generativa) ficou fora: nada grátis de verdade (Gemini imagem sem cota grátis); opção futura
  Cloudflare Workers AI (10 mil neurônios/dia) via Edge Function. teste_ia_retoque.py 0 falhas; teste_fotos.py 0 falhas. fotos.js v8, sw v77. PENTE FINO 49.
- 16/11/2026 · Claude (dono: "pode seguir com tudo"): ✨ IA CRIATIVA no editor de fotos (aba ✨ IA): pedido em texto + 12 sugestões (cabelo cacheado,
  terno, óculos, fundo de palco…) → NOVA VERSÃO ao lado da original. Cloudflare Workers AI FLUX.2 [klein] 4B (~110 neurônios/foto; grátis 10 mil/dia ≈ 90
  fotos/dia no total) pela Edge Function `bw-ia-imagem` (docs/supabase/functions/bw-ia-imagem/index.ts, publicada pelo painel, Verify JWT desligado — a
  função confere o login) + contador docs/sql/2026-11-16-ia-imagem.sql (rodado: rls true, 0 regras). Secrets CF_ACCOUNT_ID/CF_API_TOKEN pendentes (dono).
  Novo assets/fotos-nuvem.js (única saída do editor; vigia 7.8a confere). teste_ia_retoque.py (nuvem simulada) 0 falhas. fotos.js v9, sw v78. PENTE FINO 50.
- 16/11/2026 · Claude (ideia do dono: "posts e convites com IA… faça bem completo"): nova página CRIADOR IA (criador.html + assets/criador.js) em
  MARKETING, Ferramentas e Início. 4 tipos: CONVITE (10 modelos), POST (7), FLYER (4), CARTÃO de visita (3); campos de cada um; foto opcional
  (✨ a IA coloca a pessoa na arte — com confirmação, cópia ≤ 504 px —, FOTO EM MOLDURA ou FOTO DE FUNDO, essas duas sem enviar nada);
  12 estilos, 9 paletas + MINHA MARCA (lê o kit do editor de fotos no IndexedDB), 7 formatos (story, post, quadrado, paisagem, A5/A4 de
  impressão, cartão 9×5). ✨ CRIAR 3 OPÇÕES COM IA (bw-ia-imagem modo "arte": sem letras e com espaço livre para o texto; limite agora
  15 imagens/dia por conta) ou FUNDOS PRONTOS desenhados no aparelho (grátis, sem login). Textos por cima com 8 pares de fontes, posição,
  fundo do texto (degradê/vidro/faixa/sombra), cores, tamanho, alinhamento, logo e QR code (confirmar no WhatsApp, como chegar, Instagram,
  site). ✨ TEXTOS COM IA e ✨ LEGENDA/MENSAGEM (bw-ia, só os dados digitados). Saída: PNG, PDF no tamanho de impressão (pdf-lib),
  COMPARTILHAR, PACOTE REDES, ABRIR NO EDITOR (ponte IndexedDB bw_ponte → fotos.html#criador). No ar: convite com IA em 13,5 s, post com a
  pessoa da foto num palco em 7 s, PNG/PDF A4/legenda OK. teste_criador.py (32 checagens × 1280/390, 0 falhas). Manual 38 → 39 p.
  layout.js v28, criador.js v4, fotos.js v10, fotos-nuvem.js v2, sw v79. PENTE FINO 52–54. Vigia 7.8a confere o criador.js.

- 16/11/2026 · Claude (pedido do dono, com 8 orçamentos .docx dele): GERADOR DE ORÇAMENTO (propostas.html + assets/propostas.js) em Meu negócio
  (menu, card em negocio.html e no Início). 7 BOTÕES tirados dos orçamentos reais (Videomaker, Fotografia, Videomaker + fotógrafo, Transmissão
  para telão de LED, Gravação na íntegra, Curso A→B, Instalação técnica com checklist) — tocar soma serviço; chips de equipe/equipamentos/
  observações/pagamento; valor total ou detalhado (diárias, desconto R$/%); número ORC-/REC-AAAA-NNN; salva sozinho; prévia ao vivo igual ao PDF.
  Saídas: PDF (pdfMake, 3 estilos), WORD (.docx de verdade), ENVIAR (compartilhar/WhatsApp/e-mail), QR Pix com valor (BR Code + CRC16).
  Situação rascunho → enviado → aprovado/recusado; APROVADO cria evento (neg_eventos Confirmado + cliente) e RECIBO (valor por extenso) que pode
  lançar o recebido no evento. MINHA EMPRESA (logo, CNPJ, Pix, cor, textos), ★ MEUS BOTÕES / SALVAR COMO BOTÃO, ⇪ IMPORTAR .DOCX (lê os
  orçamentos antigos + copia logo/CNPJ), ✨ MONTAR COM IA e ✨ CAPRICHAR NO TEXTO (bw-ia), FUNIL: 📄 ORÇAMENTO (propostas.html?lead=ID; enviado
  → contato vai para Proposta). Chaves neg_propostas/neg_prop_config em CHAVES + vigia. teste_propostas.py (45 checagens × 1280/390, 0 falhas;
  importa os 8 .docx reais). Manual 39 → 40 p. layout.js v29, sw v80. PENTE FINO 55–57.

- 16/11/2026 · Claude (pedido do dono): AGENDA — cor dos PAGAMENTOS trocada de âmbar (#FFB547, parecida com a dos eventos) para vermelho
  sangue (#C8102E) no calendário, na lista e no filtro; vencido continua em vermelho claro (#FF6B6B). Telas do manual refeitas. sw v81.
- 16/11/2026 · Claude (pedido do dono: "faça a animação da tarefa concluída em todo botão que altera a condição"): animação comum
  BWConcluir no layout.js (confete + cartão acende em VERDE + aviso, a mesma da AGENDA) em EVENTOS (Finalizado, Marcar recebido, salvar o
  dossiê como Realizado/Entregue), cachês PAGO (custos/equipe/eventos), contas da casa/orçamento/reserva (Marcar pago), orçamentos (ENVIADO,
  APROVADO) e FECHAR NEGÓCIO no CRM; voltar atrás (não pago, Agendar, recusado, reabrir) = aviso discreto em vermelho, sem confete.
  CORES DAS CONDIÇÕES: RECEBIDO ✓ verde, NÃO RECEBIDO vermelho (antes "NÃO PAGO" sem cor), Confirmado azul, Em produção âmbar,
  Realizado/Entregue verde, Orçamento cinza; "faltam Nd" âmbar quando faltam ≤ 3 dias; "Marcar pago" das contas em vermelho.
  Teste docs/testes/teste_concluir.py (16 checagens × 1280/390, 0 falhas); agenda/propostas/crm/cadastros 0 falhas. brightway.css v26,
  layout.js v30, sw v82. PENTE FINO 58.

- 16/11/2026 · Claude (pedido do dono: "a logo dos orçamentos está com fundo branco, quero PNG transparente"): GERADOR DE ORÇAMENTO —
  logo com fundo liso (JPG, Word, ★ MINHA MARCA) entra SEM FUNDO sozinha: fundo pelas bordas, borda das letras sem halo branco, sobras
  cortadas, sempre PNG (antes virava JPEG acima de 450 KB). MINHA EMPRESA: ✂ TIRAR FUNDO, + DENTRO DAS LETRAS (miolo do O/A/B),
  ↺ VOLTAR AO ORIGINAL (cfg logoOrig) e miniatura em quadriculado. Logo já transparente ou sobre foto não é mexida sozinha.
  Teste docs/testes/teste_logo_fundo.py (24 checagens × 1280/390, 0 falhas); teste_propostas 0 falhas. Manual atualizado. propostas.js v3, sw v83. PENTE FINO 59.
  Logo do dono (do Word) já tinha fora transparente mas o EMBLEMA num QUADRADO BRANCO: ✂ TIRAR FUNDO agora acha o bloco branco que encosta no
  transparente e só tira BLOCO cheio (miolo ≥ 15×15 px) — letreiro branco fino fica. propostas.js v4, sw v84.

- 16/11/2026 · Claude (dono: "assinar com certificado digital" + mandou o e-CNPJ A1): 🔏 ASSINAR COM CERTIFICADO — novo assets/bw-assinar.js
  (node-forge 1.3.1 + pdf-lib do CDN, tudo no aparelho): abre o .pfx com a senha (formato antigo 3DES/RC2 e moderno AES), confere validade
  (vencido = recusa), PDF com campo de assinatura adbe.pkcs7.detached SHA-256 + cadeia do arquivo; carimbo na última página acima do rodapé
  (direita/esquerda), PÁGINA NOVA NO FIM ou sem carimbo; LEMBRAR NESTE APARELHO (só o arquivo, IndexedDB bw_cert) e ESQUECER; BAIXAR/COMPARTILHAR.
  Botão 🔏 ASSINAR no editor do orçamento e nova aba 🔏 Certificado em Ferramentas → PDF (qualquer PDF). Vigia: o módulo não pode enviar nada.
  Teste docs/testes/teste_assinatura.py com certificados de TESTE próprios (pdfsig: válido; alterado: inválido; senha errada/arquivo errado/
  vencido; nada sai do aparelho) — 0 falhas em 1280/390. O certificado do dono NÃO foi usado nem guardado (cópia de trabalho apagada).
  ORÇAMENTOS: chips de situação viraram abas PENDENTES / APROVADOS (+ RECUSADOS quando há) com seta (ui_prop_abas); ✓ APROVADO/RECUSADO/↺ REABRIR
  mudam o orçamento de aba sozinho (abre a aba e rola até ele). teste_abas_orcamentos.py 0 falhas. Manual atualizado. propostas.js v6, sw v85. PENTE FINO 60–61.

- 16/11/2026 · Claude (pedido do dono): ORÇAMENTO — as sugestões soltas (chips de O que será feito, Equipe, Equipamentos, Observações, Montagem,
  Horário, Condição de pagamento, Forma de pagamento) viraram botões ☰ OPÇÕES PRONTAS com o número de opções → lista para tocar (põe/tira,
  várias de uma vez; campo único preenche e fecha). Saíram os valores em R$ dos botões de serviço e os 4 números financeiros do topo da lista
  ("não é lugar para informações financeiras" — ficam no PAINEL FINANCEIRO; as abas mostram as quantidades). teste_abas_orcamentos.py (+11 checagens)
  e teste_propostas 0 falhas. Manual atualizado. propostas.js v7, sw v86. PENTE FINO 62.

- 16/11/2026 · Claude (dono: "melhore o leitor com pesquisa e novas tecnologias + leitor de contas da casa + agente que entende o que falo"):
  LEITOR DE CONTAS E COMPROVANTES (leitor.html + novo assets/bw-leitor.js; o modules/ocr antigo — só foto, "maior valor", só evento — virou
  reserva): 4 destinos (CONTA A PAGAR, GASTO DA CASA, GASTO DO NEGÓCIO, CUSTO DE EVENTO; sugere sozinho), PDF/foto/HEIC/arrastar/colar código;
  pdf.js 4.10 (texto exato), Tesseract com imagem tratada, ZXing-wasm (boleto ITF e PIX QR), boleto bancário/arrecadação decodificado com DVs,
  PIX EMV, empresas (CEMIG, COPASA, Claro…), "TOTAL A PAGAR" em vez do maior valor, referência, aviso de conta repetida (mesmo código), selos de
  confiança, ✨ IA Brightway opcional só com texto tapado. Atalho ?d=conta e botões em contas.html. AGENTE (novo assets/bw-agente.js, robô 🤖
  em todas as páginas pelo layout.js v31, acima das abas/barras): toque = escuta (Web Speech pt-BR, no aparelho quando o navegador oferece;
  sem suporte → grava e transcreve na bw-ia), entende (IA Brightway com JSON de ações; sem login → regras no aparelho com números por extenso),
  mostra o cartão editável → ✓ LANÇAR / LANÇAR TODOS; perguntas e "abrir …"; responde falando; ajustes (IA, voz, lançar sem perguntar).
  Nomes: "Leitor de contas" (menu), LEITOR DE CONTAS (cards), LER CONTA (Início). Varredura: criador (chips de cor sem nome) e notícias
  (estouro 16 px em 360) corrigidos. teste_agente_leitor.py (49 checagens × 1280/390, 0 falhas) + varredura/layout/agenda/propostas/fotos/
  concluir/crm 0 falhas. Manual: página "Leitor de contas e Agente" (substitui "Comprovantes pela foto"). layout.js v31, criador.js v5, sw v87. PENTE FINO 63–64.

- 16/11/2026 22:31 · Claude (dono: "o agente por voz está muito ruim… fala certo mas não lança nada na agenda"): causa — a IA Brightway
  devolvia as ações como {"tarefa":{…}} (sem o campo "tipo") e o agente descartava TODAS ("não entendi"), mas mostrava a frase da IA
  "Lembrete criado". Correções em assets/bw-agente.js v2: ações achatadas + prompt com exemplo + volta para o entendimento no aparelho;
  RESPONDE perguntas — agenda ("o que tenho amanhã / esta semana / próximo compromisso", mesmo cálculo da AGENDA via window.BWAgendaItens),
  gastos/contas/negócio e perguntas gerais (tipo responder); entende mais tarefas ("tenho que", "preciso", "levar", "buscar", "ligar",
  "dentista sexta às 15h", de manhã = 9h, à tarde = 14h, à noite = 19h); voz mãos livres: depois de "…Confirma?" escuta "sim" (lança) ou
  "não" (cancela). AGENDA da tela inicial redesenha na hora quando o agente grava (evento bw-dados). teste_agente_leitor.py +11 checagens
  (0 falhas), agenda/layout/varredura 0. No ar a IA errou "sexta" (deu domingo) → o pedido leva os próximos 7 dias e a data dita
  com dia da semana/amanhã/"dia N" é conferida pelo cálculo do aparelho. bw-agente.js v3, layout.js v33, sw v89. PENTE FINO 65.

- 16/11/2026 23:10 · Claude (dono: "o agente pode falar como a Alexa… entender, brincar, falar sobre o dia" + "ser chamado de Tio Cláudio"):
  o agente virou TIO CLÁUDIO (assets/bw-agente.js v4): MODO CONVERSA (continua ouvindo depois de responder; "tchau"/silêncio encerra),
  "COMO ESTÁ MEU DIA" / "bom dia" (resumo falado montado no aparelho: compromissos, contas vencidas e vencendo, tarefas atrasadas, próximo
  evento, com o primeiro nome da conta), papo/piadas/curiosidades com jeito mineiro (IA; sem IA: 8 piadas próprias), "MUDA PARA AS 15H" /
  "NA VERDADE FOI 50" (corrige o último pedido, mesmo já lançado), histórico curto da conversa para a IA entender "e depois?", melhor voz pt-BR
  do aparelho + escolha de voz e velocidade em ⚙, tocar no robô interrompe a fala. Sem palavra de ativação (navegador não escuta o tempo
  todo). teste_agente_leitor.py +12 checagens (0 falhas); layout/varredura 0. bw-agente v4, bw-leitor v2, layout.js v34, sw v90. PENTE FINO 66.
  No ar: a IA respondia perguntas gerais (4K × Full HD) mas marcava "nada" → vira resposta; sem ação nem resposta → conversa direta (papo); "o que tenho na quinta" = só aquele dia. bw-agente v7, layout.js v37, sw v93.
  Mais achados no ar: "uma" virava 1 e "a 1" virava 01:00 → "tô cansado, me dá uma força" virava tarefa (hora só com "às N", "N h" ou
  "N horas"); "quinta 14 horas" virava "Quint"; papo da IA sem ação agora é resposta (antes caía nas regras do aparelho). bw-agente v8, layout.js v38, sw v94.

- 16/11/2026 23:30 · Claude (dono: "vozes masculinas para o Tio Cláudio… a melhor interação possível"): bw-agente.js v9 — escolhe sozinho a voz
  MASCULINA em pt-BR do aparelho (Windows: Daniel; Edge: Antonio natural; iPhone/Mac: Felipe, Eddy, Reed…; Android: voz ptd/#male); sem voz
  masculina usa a que há em tom mais grave e mostra em ⚙ como instalar uma; ⚙ ganhou Voz (♂ primeiro), Tom, Velocidade e 🔊 OUVIR A VOZ
  (trocar já fala uma amostra); fala em frases (mais natural, o Chrome não corta resposta longa); sinal sonoro ao começar a ouvir.
  Voz neural no aparelho (Piper pt-BR "faber", ~60 MB) pesquisada, NÃO feita: precisa de biblioteca de terceiros — aguarda o dono.
  teste_agente_leitor.py +4 checagens (0 falhas). layout.js v39, sw v95.
  Teste de som no PC do dono: fala saiu pela saída padrão (voz Daniel, 7 s); o resumo dizia "Boa noite, Bw!" (nome da conta) → nome de
  empresa é ignorado, "me chama de Marcos" e campo "Como te chamo?" em ⚙ (ui_agente_nome). No painel do app Claude o microfone é
  bloqueado: ouvir por voz só se testa no Chrome/Edge/celular. bw-agente v10, layout.js v40, sw v96.

- 16/11/2026 23:35 · Claude (dono: "ele não está emitindo som"): bw-agente.js v11 — fala destravada no toque do robô (iPhone/Android), sem
  cancel→speak colado, nova tentativa com a voz padrão e aviso "🔇 o som não saiu" na tela, sem lookbehind. layout.js v41, sw v97. PENTE FINO 67.

- 16/11/2026 23:45 · Claude (dono: "iPhone não escuto"; no PC ouviu): bw-agente.js v12 — no iPhone a fala espera 0,7 s depois do microfone
  (logo depois dele o som sai mudo/pelo fone de ouvido), destrave com fala vazia, vozes robóticas (Eddy/Reed/Rocko) deixam de ser preferidas;
  app instalado na tela de início (reconhecimento do navegador não funciona): grava e transcreve pela bw-ia. NÃO testado em iPhone real
  (sem aparelho) — aguarda o dono. layout.js v42, sw v98.

- 16/11/2026 23:55 · Claude (dono, iPhone com o app instalado: "ouço o barulho ao tocar, a resposta aparece, mas a voz não toca"; Android e PC OK):
  bw-agente.js v13–v14 — 🔊 OUVIR A VOZ agora mostra um diagnóstico na tela (versão, voz, se o aparelho começou a falar, erro) e a sessão de
  áudio do iPhone volta para "playback" depois do microfone (navigator.audioSession; antes ficava no modo chamada). Aguardando a linha
  de diagnóstico do dono; plano B = voz neural tocada como áudio. layout.js v44, sw v100.

- 17/11/2026 00:00 · Claude (prints do dono): iPhone (app instalado, v14) — o aparelho COMEÇA a falar (voz Luciana, sessão playback) mas o
  indicador laranja de MICROFONE estava ligado → com o microfone aberto o iPhone solta a fala muda. bw-agente.js v16: escrever, tocar num
  exemplo, abrir ⚙ ou testar a voz DESLIGA a escuta antes (soltarMic). Android (v15): o Chrome só lista "português Brasil/Portugal", sem
  identificador de voz → não dá para escolher a masculina pelo site; só pela voz padrão do Android (ou voz neural). layout.js v46, sw v102.

- 17/11/2026 00:10 · Dono: "falou! era o modo silencioso" — iPhone (app instalado) OK com o silencioso desligado. bw-agente.js v17: aviso
  disso em ⚙ no iPhone. Som confirmado pelo dono em PC, Android e iPhone. layout.js v47, sw v103. PENTE FINO 69.

- 17/11/2026 · Claude (pedido do dono: "plataforma igual ao app de Reels… como ferramenta dentro da Brightway, com o motor instalado no PC"):
  BW REELS PRO (reels.html + assets/reels.js + assets/reels-motor.js) em MARKETING (menu, galeria de Marketing, Ferramentas e Início).
  Interface estilo editor: prévia ao vivo (o MESMO motor do BW Reels Studio, gerado de lá; vídeo importado toca na prévia), linha do tempo
  com cenas, CRIAR em 4 passos (assunto → ✨ IA numa chamada só da bw-ia: 5 ganchos com nota + cenas + fatos + legenda; sem login = modelo
  pronto · gancho · FONTES: afirmação/número sem fonte bloqueia o vídeo, TIRAR O QUE NÃO TEM FONTE · estilo/formato/acabamento), CENA
  (texto, duração, destaque, itens, número+fonte, mídia, movimento, transição, fala/legenda, mover/duplicar/excluir), MÍDIA (filmagens,
  fotos, música — só no IndexedDB bw_reels do aparelho), EXPORTAR (validação do motor, RENDERIZAR NO PC = pacote .bwreels.zip, roteiro
  .json, legenda do post). ⚙ MOTOR NO PC: downloads/BW-Reels-Studio.zip + downloads/BW-Reels-Studio-Tutorial.pdf; no PC, BW REELS RENDER
  (motor/vigia-downloads.mjs) pega o pacote em Downloads, renderiza e abre o MP4. Nada vai para a conta. teste_reels.py (37 checagens × 1280/390,
  0 falhas), varredura 49 páginas 0 achados, vigia ✅. Manual 40 → 41 p. layout.js v48, sw v104. PENTE FINO 70–72.
- 17/11/2026 · Claude (dono, Safari do iPhone: "o topo do editor de fotos fica fosco/embaçado atrapalhando a visão"): era o efeito de vidro do
  Safari em cima da barra do editor (tela cheia). Com o editor aberto no Safari do iPhone a barra desce para fora do efeito e o topo do Safari é
  pintado com a cor da barra (theme-color volta ao fechar). Revisão geral antes de passar aos usuários: TODOS os testes 0 falhas (layout,
  agenda, crm, pedido, propostas, abas, concluir, cadastros, criador, ia_retoque, logo_fundo, agente_leitor, fotos, reels) + varredura 49
  páginas 0 achados + vigia ✅. fotos.js v11, sw v105. PENTE FINO 73.
  BW REELS PRO no ar com a IA REAL (logado): 5 ganchos + roteiro + legenda em 4,5 s; número do próprio usuário ficava sem fonte e a IA fez
  citação sem autor → corrigidos (reels.js v2, sw v106); depois inventou o autor "Especialista em eventos" → citação da IA vira texto (reels.js v3, sw v107). Conferido no ar: número próprio com fonte, validação OK. PENTE FINO 74.

- 17/11/2026 · Claude (dono mandou 5 vídeos de referência + "faça bem organizado… exemplos visuais: motions de texto, histórias com
  personagens usando o motor, personagens com IA de fora"): BW REELS PRO ganhou a galeria 🎬 MODELOS / O QUE VAMOS CRIAR? (abre sozinha
  na 1ª vez e no + NOVO) com 3 categorias e VÍDEO DE EXEMPLO em cada modelo (assets/reels-exemplos/*.mp4+jpg, 1,2 MB, gerados dos MESMOS
  roteiros em assets/reels-modelos.js): MOTION DE TEXTO (5 modelos + A IA CRIA PARA MIM), HISTÓRIAS COM PERSONAGENS (4 modelos) e
  PERSONAGEM COM IA (modelo com 3 cenas de clipe + MONTE O SEU PERSONAGEM: prompts de imagem e vídeo, ✨ CAPRICHAR COM IA, passo a passo,
  Flux/Higgsfield/Kling/Veo). Motor (Studio → reels-motor.js v2): nova cena `personagem` — 6 personagens originais (Bê, Ana, Léo, Bia, Rui,
  Robô), 7 ações, balões em sequência, até 2 por cena, cenários raios/palco/bolinhas, entradas; nos 3 motores. Aba CENA: escolha com desenho,
  ação, cor da roupa, 4 falas, cenário e entrada. IA de roteiro em modo personagem (resposta corrigida se vier personagem/ação inexistente).
  Studio: motor/animar.mjs (qualquer HTML animado → MP4/MOV com --checar/--folha/--alfa), skill animacao-por-codigo, /animar,
  modelos/animacoes/personagem-bw.html; zip e tutorial em downloads/ atualizados. sw.js: vídeo/áudio e Range fora do cache (Safari).
  teste_reels.py 58 checagens × 1280/390 (0 falhas), varredura 49 páginas 0 achados, vigia ✅. Manual 41 → 42 p. sw v108. PENTE FINO 75–77.

- 17/11/2026 · Claude (dono: "dá para enviar a foto de um avatar e ele animar de acordo com a história?" → "faça isso"): BW REELS PRO ›
  🎬 MODELOS ganhou a categoria ANIMAR MEU PERSONAGEM: foto do avatar/mascote → recorte no aparelho (fundo liso sai sozinho; ✂ TIRAR FUNDO COM
  IA = MODNet; ↺ ORIGINAL), nome, "como ele é", história, chamada final, contracenar com Bê/Ana/Léo/Bia/Rui/Robô e 3 jeitos: RECORTE ANIMADO
  (grátis; motor anima o PNG — entra, quica ao falar, acena, comemora, pensa, se assusta, contorno branco de adesivo, virar), UMA IMAGEM POR
  CENA COM IA (bw-ia-imagem modo arte pela fotos-nuvem.js, confirmação + limite 15/dia; o que falhar volta para o recorte) e VÍDEO COM IA DE
  FORA (um prompt por cena na aba MÍDIA). A história vira cenas numa chamada da bw-ia (sem login: frase por frase no aparelho). Motor v3:
  personagem "foto" (imagem), cena só com imagem (elenco [] + mídia); editor da cena mostra o avatar e "Só imagem". teste_reels.py 77
  checagens × 1280/390 (0 falhas), varredura 0, vigia ✅. Manual atualizado. Zip/tutorial do Studio atualizados. sw v109. PENTE FINO 78.
  No ar, logado, IA REAL: história → gancho + 5 cenas + legenda em 5 s, validação OK; 1 imagem por cena (mascote de teste) em 5,2 s, mesmo
  personagem, pose pedida, palco, topo livre para o balão. Projetos de teste apagados do navegador.

- 17/11/2026 · Claude (dono: "som no vídeo inteiro, mais personagens, mais motions" + "ferramenta para acrescentar e para criar personagem"):
  SOM AUTOMÁTICO — motor/sons.mjs compõe a TRILHA de cada estilo (cinema, corporativo, neon, editorial, luxo: pad, baixo, bateria, arpejo,
  sino) e EFEITOS da animação (pop do balão, "blip" da fala com voz por personagem, boing no pulo, confete, susto, clique da lista, contador
  com ding, brilho do botão, whoosh/impacto); aba MÍDIA: trilha automática/estilo/sem trilha, volume, liga/desliga efeitos; prévia com som
  no site e render igual no PC (trilha.wav vira "música" — abaixa sob a narração). PERSONAGENS — 13 novos prontos (cinegrafista, técnico
  de som, DJ, palestrante, executivo/a, noiva, noivo, fotógrafa, cliente, garçom, cachorro, gato; total 19), desenho paramétrico (cabelo 8,
  barba 4, óculos 4, roupa 6, acessório 6, boné, cores) e 👤 PERSONAGENS: BIBLIOTECA (IndexedDB bw_reels v2, store personagens), CRIAR
  PERSONAGEM (prévia animada, testar ações, sortear, partir de um pronto) e ACRESCENTAR (FOTO) (recorte no aparelho + autorização); aparecem
  na aba CENA e no ANIMAR MEU PERSONAGEM (montado anima braços/olhos/boca). Motor v5. teste_reels.py 94 checagens × 1280/390 (0 falhas),
  varredura 0, vigia ✅. Manual 42 → 43 p. sw v110. PENTE FINO 79–80.

- 17/11/2026 · Claude (dono: "novos modelos de motion e gráficos"): motor v6 com 14 tipos de cena novos — logo animado, nome e cargo (lower
  third), contagem 3-2-1, gráfico (barras/rosca, números contando, fonte obrigatória), linha do tempo, checklist, top/ranking, antes e
  depois (cortina), depoimento com estrelas, local e data (pino no mapa), oferta (preço contando), AO VIVO, vídeo no celular e tela dividida.
  🎬 MODELOS ganhou a categoria GRÁFICOS E EVENTOS (10 modelos com vídeo de exemplo); aba CENA: grupo "Gráficos e eventos" no Tipo, campos
  próprios (contar a partir de, tipo de gráfico, unidade, fonte, estrelas, segunda mídia) e exemplo preenchido ao trocar; a IA de roteiro
  pode usar checklist e top. teste_reels.py +12 checagens. Manual 43 → 44 p. reels-motor v6, reels-modelos v3, reels.js v7, sw v111. PENTE FINO 75–81
  (75–80 estavam citados no diário mas faltavam na lista — escritos agora).

- 17/11/2026 · Claude (dono: "sistema que pede as etapas uma a uma, como instalador… janela própria, didático para iniciante, modos recomendados,
  pensar no login futuro"): BW REELS ASSISTENTE no Studio (downloads/BW-Reels-Studio.zip): atalho → janela própria (Chromium do motor em modo
  app; a tela fala com o programa pela ponte do navegador, SEM servidor local) com 6–7 etapas, Voltar/Avançar e barra de progresso: Preparar
  (checa Node/FFmpeg/disco/Claude e diz como resolver) → Como criar (QUALIDADE = 5 ganchos + roteiro revisado, 2 pedidos; ECONÔMICO = 1 pedido;
  SEM IA = modelos da galeria, grátis; o recomendado vem marcado conforme o PC) → Sobre o vídeo → Abertura → Textos e prévia animada →
  Conferir (resumo + pedidos de IA usados) → Gerar vídeo. IA = `claude -p` em lote fora da pasta do projeto (não carrega o CLAUDE.md); número
  inventado pela IA é descartado; IA falhou → oferece seguir sem IA. motor/conta.mjs = portão de conta (EXIGIR_CONTA=false hoje; ativação
  por ARQUIVO baixado do site, a ligar quando o dono decidir). Teste motor/teste-assistente.mjs com Claude SIMULADO (22 checagens + render
  real, 0 falhas). NÃO testado ainda com o Claude real nem no Windows do dono.
- 17/11/2026 · Claude (dono: "escolher a IA; modos BW IA FREE / PRO / ECONOMIZE; um botão instala as IAs recomendadas"): Studio — motor/ia.mjs
  reveza as IAs: FREE = só grátis (Groq, Google Gemini, OpenRouter :free por chave do usuário + IA no computador pelo Ollama), cota do dia
  acabou (429) → marca e passa para a próxima sozinho; ECONOMIZE = aberturas na grátis e roteiro na paga, uma cobre a outra; PRO = a paga
  escolhida (Claude pelo Claude Code ou OpenAI por chave de API). Tela ⚙ Minhas IAs: colar chave → testa em /models e escolhe o melhor
  modelo de texto; a chave fica só em ~/.bw-reels/ias.json e nunca volta para a tela. Botão INSTALAR IAS RECOMENDADAS (confirmação antes):
  Claude Code (instalador oficial), Ollama (winget Ollama.Ollama) e modelo gemma3. O modo recomendado muda conforme o que está conectado.
  Teste motor/teste-assistente.mjs (24 checagens + render, 0 falhas) com TODAS as IAs e a instalação SIMULADAS — nada disso foi testado
  com serviço real nem no Windows. Mobile (render no celular / app iOS-Android): só planejado, ver Pendências.
- 17/11/2026 · Claude (dono: "render também no celular… faça o necessário"): BW REELS PRO › EXPORTAR › 🎬 GERAR VÍDEO NESTE APARELHO
  (assets/reels-celular.js): MP4 feito no próprio celular/tablet/PC, sem programa e sem enviar nada — qualidade Rápida 720×1280 (padrão no
  celular) ou Alta 1080×1920, barra de progresso, CANCELAR, prévia do vídeo, SALVAR VÍDEO e COMPARTILHAR (folha do sistema). Com som
  automático do motor. Limites desta versão: cenas com FILMAGEM e música/narração própria continuam no RENDERIZAR NO PC; aparelho sem
  WebCodecs = botão desligado com explicação. Teste docs/testes/teste_reels_celular.py (390 px, UA Android): MP4 H.264 conferido com ffprobe,
  318 quadros em 21 s (720p) / 45 s (1080p), som Opus neste Linux. NÃO testado em iPhone nem Android reais (AAC e Safari dependem do aparelho).
  reels.js v8, reels-celular.js v1, sw v112. PENTE FINO 82. App de loja (iOS/Android): não feito — a plataforma já instala como app pela tela inicial.
- 17/11/2026 16:20 · Dono testou: Android com som perfeito; iPhone SEM som. Claude: reels-celular.js v2 — (1) AAC do codificador sem
  "description" (Safari) ganha a descrição padrão (AAC-LC 48 kHz estéreo) em vez de descartar o som; (2) aparelho sem codificador AAC →
  som pelo GRAVADOR (AudioContext criado dentro do toque → MediaStreamDestination → MediaRecorder audio/mp4, em paralelo com os quadros) e as
  amostras AAC são tiradas do MP4 gravado (leitor de MP4 comum e em pedaços, testado com arquivos do ffmpeg: 6,02 s, volume igual);
  (3) linha de diagnóstico no aviso verde ("v2 · som: …"). NÃO testado em iPhone (sem aparelho) — aguarda o print do dono. reels.js v9, sw v113.
- 17/11/2026 16:40 · Dono (prints do iPhone): aviso "v2 · som: aac pelo codificador, 682 blocos" e vídeo SEM som; e tela branca "Um problema
  ocorreu repetidamente" vendo a prévia (navegador de dentro de outro app). Claude, reels-celular.js v3: o som do codificador do iPhone é
  aceito nos 3 formatos possíveis (blocos crus, blocos com cabeçalho ADTS — tira o cabeçalho —, descrição vinda como descritor inteiro — tira
  só a configuração), a taxa vem da própria configuração, e se os blocos vierem quase vazios (codificador mudo) grava pelo MediaRecorder;
  o aviso mostra tamanho médio do bloco, descrição e início do 1º bloco. PRÉVIA LEVE no celular (reels.js v10): sem grão (camada 2× a tela
  com mistura), sem desfoque gigante de fundo e sem uma camada por palavra; imagem de cada quadro liberada na exportação. NÃO testado em
  iPhone — aguarda novo print (linha "v3"). sw v114. PENTE FINO 83.
- 17/11/2026 16:46 · Dono: "perfeito, resolveu" — iPhone com som no vídeo feito no aparelho e prévia sem tela branca (v3). Android já estava OK.
- 17/11/2026 17:45 · Claude (dono: "app com login, tudo conectado; criar no celular e mandar para o PC; nuvem do usuário — por enquanto 'em breve'"):
  ETAPA 1 — BW REELS PRO: os reels (roteiro e textos) agora ficam NA CONTA (reels_projetos) e aparecem em todos os aparelhos logados;
  EXPORTAR no celular ganhou 📲 ENVIAR PARA O PC (fila; TIRAR DA FILA) e no computador aparece "📲 Chegou do celular" com ABRIR (vai direto
  para EXPORTAR). MÍDIA: cartão "☁ Minha biblioteca na nuvem" com Google Drive e Dropbox DISPONÍVEL EM BREVE. Excluir um reel tira de todos
  os aparelhos. Sem tabela nova no banco (usa user_data). teste_reels.py +7 e teste_reels_celular.py +3 checagens (0 falhas), varredura 0,
  vigia ✅. reels.js v11, sw v115. PENTE FINO 84. Próximas etapas combinadas: biblioteca oficial do ADM, biblioteca do usuário, app instalado com login.
- 17/11/2026 18:20 · Claude (dono mostrou o Edvid da Creator Factory como referência — só a lista de componentes abertos foi lida; o app não abre
  sem matrícula e nada dele foi copiado): Studio — LEGENDA AUTOMÁTICA OFFLINE. `INSTALAR-LEGENDAS.bat` (sherpa-onnx + modelo Parakeet v3 da NVIDIA,
  ~500 MB, em ~/.bw-reels/modelos) e `LEGENDAR.bat` (arrastar o roteiro.json → ouve narração e filmagens e grava legendas.palavras; arrastar um
  vídeo → .srt). Novo `somDoVideo` na cena: a filmagem toca com o som dela no trecho usado e a trilha abaixa (antes toda filmagem saía muda).
  motor/teste-legendas.mjs com "ouvido" SIMULADO + render real (0 falhas). NÃO testado com o modelo de fala real: aqui não dá para baixar o
  pacote — o teste de verdade é no PC do dono. Zip e tutorial em downloads/ atualizados; arquivos enviados para o PC do dono (menos o comando
  /legendar, que só entra reinstalando pelo zip). Ideia registrada: QUADRO DE HISTÓRIA (blocos ligados por setas → cenas por IA → um vídeo).
- 17/11/2026 19:10 · Claude (dono descreveu a aba de nós do Edvid e pediu "os dois": só imagens e vídeo): BW REELS PRO › 🧩 QUADRO DE HISTÓRIA.
  Quadro livre (arrastar, zoom, ver tudo) com blocos PERSONAGEM (foto, nome, descrição), CENA (o que acontece + fala), REFERÊNCIA (lugar/objeto/
  estilo, com imagem opcional) e FINAL, ligados por setas (➜ e toque no destino; toque na seta apaga; + CENA entra sozinha no fim). ✨ CRIAR
  IMAGENS = uma imagem por cena com o mesmo personagem (bw-ia-imagem, 15/dia) e ⬇ BAIXAR IMAGENS (só as fotos); 🎬 MONTAR O VÍDEO = ANIMADO PELO
  APP (imagens com movimento + falas, ou personagem animado, ou texto) ou VÍDEO COM IA DE FORA (um prompt por cena na aba MÍDIA). Textos em uma
  chamada da bw-ia. LIMITES: não há IA de vídeo ligada no app (vídeo gerado depende de Kling/Veo/Higgsfield fora); com foto do personagem, a
  IMAGEM da referência não vai junto (só a descrição dela) — a função aceita uma foto por pedido. docs/testes/teste_quadro.py (29 checagens ×
  1280/390, IA simulada, 0 falhas). NÃO testado no ar com a IA real (dono ausente). Manual 44 → 45 p. reels.js v12, reels-quadro.js v1, sw v116. PENTE FINO 85.
- 17/11/2026 22:55 · Claude (dono: "o Tio Cláudio não responde e diz NÃO ENTENDI, igual antes"): não é o código — a IA Brightway inteira
  está fora: bw-ia devolve 502 "groq: Invalid API Key" (a chave GROQ_API_KEY do Supabase não vale mais; provável troca/exclusão de chave no
  console da Groq hoje). Sem IA, só os pedidos diretos eram entendidos no aparelho e o resto virava "não entendi". bw-agente.js v18: quando a
  IA cai, o Tio Cláudio fala o motivo (chave/limite/rede) e o que ainda entende. Conserto de verdade = o dono colar uma chave nova da Groq no
  Supabase. Dono autorizou (22:44): IA de vídeo conectada OU exportar as fotos (o usuário escolhe) e mandar a imagem da referência junto.
  layout.js v49, sw v117. PENTE FINO 86.
- 17/11/2026 23:20 · Claude (dono autorizou): QUADRO DE HISTÓRIA manda a IMAGEM DA REFERÊNCIA junto com a foto do personagem (imagem 0 =
  personagem, imagem 1 = referência) nas cenas ligadas a ela. Site pronto (fotos-nuvem.js v3 aceita a 2ª imagem; reels-quadro.js v2) e código
  da função atualizado em docs/supabase/functions/bw-ia-imagem/index.ts ("imagem2" → input_image_1, só no modo arte). FALTA PUBLICAR a função
  no painel do Supabase — até lá a função antiga ignora a 2ª imagem (nada quebra). teste_quadro.py +1 checagem (0 falhas). sw v118.
- 17/11/2026 23:35 · Claude: função bw-ia-imagem com a 2ª imagem PUBLICADA e testada no ar (ver Pendências). Método novo em METODOS.md:
  publicar Edge Function pelo painel conferindo o texto por SHA-256 antes e depois.
- 17/11/2026 23:55 · Claude (dono: "sistema que entende o melhor para cada trabalho, calcula o custo e recomenda; modo automático que economiza e
  modo pro com a melhor qualidade"): QUADRO DE HISTÓRIA › 🎬 MONTAR O VÍDEO agora tem ⚡ AUTOMÁTICO (recomendado), ★ PRO e SÓ O APP, cada um
  com o plano e o custo estimado ANTES de montar. O app classifica cada cena (movimento, fala, parada, ambiente): AUTOMÁTICO deixa no app o
  que o app resolve de graça e indica IA de vídeo econômica só onde há movimento; PRO indica IA de melhor qualidade em todas (com fala quando
  o personagem fala). O reel sai misto: cenas do app prontas + cenas de IA com a imagem de espera, o prompt, a IA indicada e o custo na aba MÍDIA.
  Preços de referência (US$/s) de 17/11/2026: Veo 3.1 Lite 0,05 · Kling 3.0 0,112 · Veo 3.1 Standard 0,40. LIMITE: o site ainda NÃO gera o clipe
  (nenhuma IA de vídeo conectada — aparece "disponível em breve"); a geração é feita fora e o clipe é importado. teste_quadro.py +5 checagens
  (0 falhas), teste_reels 0, vigia ✅. reels.js v13, reels-quadro.js v3, sw v119. PENTE FINO 87.
- 18/11/2026 00:30 · Claude (dono: "faça ele e com tudo que eu pedi, as ferramentas e o modo cena flux"): APLICATIVO BW REELS no Studio
  (downloads/BW-Reels-Studio.zip): atalho "BW Reels" → janela própria (Edge/Chrome do PC; senão o navegador do motor) com LOGIN OBRIGATÓRIO da
  conta Brightway (feito na página de login da plataforma; o app guarda só id/e-mail/nome, vale 7 dias sem internet; SAIR apaga e sai da
  plataforma) e a tela inicial com CRIAR REEL, QUADRO DE HISTÓRIA (abre o quadro direto), ASSISTENTE PASSO A PASSO, LEGENDAS AUTOMÁTICAS
  (escolher o vídeo → .srt), MINHAS IAS, PLATAFORMA BRIGHTWAY, MEUS VÍDEOS e 3 itens "em breve" (IA de vídeo conectada, biblioteca oficial,
  Drive/Dropbox). Dentro do app o RENDERIZAR NO PC do editor gera o vídeo sozinho (o pacote baixado é pego pela janela, com barra de
  progresso) — sem mudar nada no site e sem servidor local. Sem tabela nem função nova no Supabase. motor/teste-app.mjs com a plataforma
  SIMULADA: 29 checagens, 0 falhas; teste-assistente 0 falhas. NÃO testado no Windows do dono nem com o login real (Google pode recusar
  janela automatizada — e-mail e senha é o caminho seguro). Ainda é pasta + INSTALAR.bat, não um instalador .exe. PENTE FINO 88.
- 18/11/2026 01:00 · Claude (dono: "cada usuário escolhe a sua IA e conecta, como conectores" + "incluir no software as ferramentas que
  funcionam no PC, para usar offline no notebook" + "como criar o exe" + "layout de plataforma, com ícones, luzes e movimento"):
  (1) IA DE VÍDEO CONECTADA — aplicativo BW Reels › IA DE VÍDEO: conectar Runway (Gen-4 Turbo US$ 0,05/s, Gen-4.5 US$ 0,12/s; chave conferida
  na hora, mostra saldo) e fal.ai (Kling 3.0 Standard US$ 0,084/s sem som, US$ 0,126/s com som); no editor, dentro do aplicativo, cada cena de
  IA (aba MÍDIA) ganha ✨ GERAR O CLIPE AQUI (confirma, gera 5 s, coloca o clipe na cena). Tabela do plano do Quadro atualizada para essas
  IAs. reels.js v14, reels-quadro.js v4, sw v120. (2) SEM INTERNET — o aplicativo guarda cópia das ferramentas e bibliotecas (botão PREPARAR
  PARA USAR SEM INTERNET + cópia que já vem no pacote) e abre EDITOR DE FOTOS, PDF, CRIADOR DE ARTES, ORÇAMENTOS, LEITOR DE CONTAS, editor de
  reels e a plataforma mesmo desconectado. (3) INSTALADOR — GERAR-INSTALADOR.bat + instalador.iss (Inno Setup) criam BW-Reels-Setup.exe no PC
  do dono. (4) TELA NOVA do aplicativo: menu lateral, busca de ferramenta, destaque, cartões com ícones, luzes e movimento, foto do perfil
  (fica no PC). Testes: motor/teste-app.mjs 48 checagens (provedores de vídeo e plataforma SIMULADOS, servidor desligado para o offline),
  teste_quadro.py (+7, aplicativo simulado) e teste_reels.py 0 falhas; as 7 páginas reais abrem pela cópia com o servidor desligado.
  NÃO testado: chave real de Runway/fal.ai (o primeiro clipe do dono é o teste), bibliotecas das CDNs de verdade (sem rede aqui), o .exe
  (Inno Setup só roda no Windows) e nada disso no Windows do dono. Os links do Pinterest de referência não abriram (bloqueio do site).
  PENTE FINO 89–90.
- 18/11/2026 01:20 · Claude (dono tem Google AI Ultra na conta audioevideobw e pediu o atalho): cada cena de IA (aba MÍDIA) ganhou
  ABRIR NO FLOW (GOOGLE): copia o texto, salva a imagem da cena (cena-N.jpg) nos downloads e abre o Flow (labs.google/flow) — no aplicativo,
  no navegador padrão do PC. O app não envia nada: a pessoa gera no Flow com os créditos do plano dela e importa o clipe. O Ultra não tem
  chave de API (os créditos valem no Flow/Whisk), por isso não entra como conector automático. teste_quadro.py +3 checagens, teste-app +1
  (0 falhas). reels.js v15, sw v121.
- 18/11/2026 01:35 · Claude (dono: "mostre qual clicar e organize a pasta" + "pode ocultar e deixe so o certo"): pasta do Studio com
  arquivos NUMERADOS (1 - ABRIR BW REELS, 2 - INSTALAR, 3 - CRIAR ICONE, 4 - LEGENDAS, 5 - GERAR INSTALADOR EXE, 8 - ORGANIZAR, 9 - MOSTRAR
  TUDO) + "LEIA-ME - COMO ABRIR.txt"; o 8 esconde (attrib +h, nada apagado) os arquivos tecnicos e os 3 atalhos extras, o 9 desfaz.
  CRIAR-ATALHO.bat agora cria SO o icone "BW Reels" (Assistente/Render/Studio abrem de dentro do app). Feito no PC do dono por computer use
  (Explorador em modo clique; o .bat executado nao tem pause porque as janelas de console ficam ocultas): pasta de 48 → 12 itens.
- 18/11/2026 01:45 · Dono abriu o aplicativo pela 1ª vez: "Não consegui começar — abra pelo ícone BW Reels". Causa: com --app a página
  carregava antes da ponte bwNode existir e o código pulava o recarregamento (a URL já era a certa). Claude: app.mjs sempre recarrega depois
  de registrar a ponte; app/index.html e assistente/index.html esperam a ponte até 10 s. Corrida reproduzida e conferida; teste-app 0 falhas. PENTE FINO 91.
- 18/11/2026 09:30 · Claude (dono, com 2 referências de editor de nós: "só consigo linkar uma por vez… quantas ligações quiser" + "melhoria de prompt: você fala,
  ele escuta e gera o prompt para o app de criação escolhido"): QUADRO DE HISTÓRIA novo. LIGAÇÕES: cada bloco tem bolinha de saída (direita) e de
  entrada (esquerda); ARRASTAR a bolinha até outro bloco liga na hora; TOCAR na bolinha entra no modo LIGAR (toca em vários blocos, tocar de novo
  desfaz, ✓ PRONTO ou Esc sai); um bloco pode ter várias saídas e várias entradas (a ordem da história = cada cena depois de todas as que apontam
  para ela, desempate pela posição); linhas coloridas pelo tipo de origem. LAYOUT: trilho de ferramentas (＋ CENA, ＋ REFERÊNCIA, ✨ PROMPT,
  ▤ ORGANIZAR), cabeçalho colorido por tipo. ✨ MELHORAR PROMPT (botão do trilho ou ✨ da cena): 🎙 FALAR (reconhecimento do navegador; sem ele
  grava até 40 s e transcreve na bw-ia) ou escrever → escolhe Higgsfield, Gemini (Nano Banana), Flow/Veo, Kling, Runway, Midjourney, Flux ou outra,
  VÍDEO/IMAGEM → UMA chamada da bw-ia (só texto) devolve o prompt em inglês no formato daquela IA → COPIAR, ABRIR a IA, USAR NESTA CENA (o app
  passa a usar esse prompt na cena) ou CRIAR CENA COM ELE. Sem conta/IA fora do ar: organiza o texto da pessoa e diz o motivo. Nenhuma IA de fora
  é chamada. teste_quadro.py +22 checagens (0 falhas, IA e microfone SIMULADOS). NÃO testado no ar com a IA real nem com microfone de verdade.
  reels-quadro.js v5, sw v122. PENTE FINO 92.
- 18/11/2026 10:10 · Claude (dono, com 2 referências: "sistema de camadas… mascaramento padrões e livres… layout da referência… antes e depois lado a
  lado e ao pressionar a foto mostra o antes"): EDITOR DE FOTOS. (1) Nova aba CAMADAS: lista de tudo o que fica por cima da foto (adesivos, textos,
  logo + os novos IMAGEM e FORMA — 9 formas, cor, só contorno, 8 modos de mistura), ▲ ▼ mudam a ordem entre TODOS os tipos (f.ordem), 👁 esconde
  sem apagar (f.ocultos), arrastar na foto; tudo entra no desfazer. (2) MÁSCARAS na imagem da camada e na FOTO (base): 10 prontas (círculo,
  arredondada, coração, estrela, hexágono, losango, triângulo, some embaixo/em cima/nas bordas), INVERTER, e LIVRE pintada com o dedo (ESCONDER /
  TRAZER DE VOLTA, tamanho do pincel, desfazer traço); na foto escolhe a cor de fundo ou TRANSPARENTE (salva PNG). Traços guardados em fração
  (valem na prévia e no arquivo final). (3) LAYOUT no computador: trilho de ícones + controles à ESQUERDA, foto grande à direita, FAIXA DE FILTROS
  embaixo da foto (um toque troca); controles deslizantes finos com botão claro. (4) ANTES: DIVISOR ou LADO A LADO (lembrado em ui_fotos_comp) e
  SEGURAR a foto 0,3 s mostra o original, soltar volta. teste_fotos.py +21 checagens × 1280/390 + iPhone (0 falhas). Imagens das camadas ficam só
  na memória do aparelho. fotos.js v12, sw v123. PENTE FINO 93.
- 18/11/2026 10:50 · Claude (dono: "interface de personagens… um agente junto que auxilia na criação do personagem com o prompt… área dedicada que conversa
  com todas as áreas e ferramentas que solicitam um personagem"): ÁREA DE PERSONAGENS (personagens.html + assets/personagens.js) em Marketing (menu,
  galeria de Marketing, Ferramentas e Início). Galeria em cartões coloridos; ✨ CRIAR COM O AGENTE: conversa por texto ou voz → UMA chamada da bw-ia por
  mensagem (só texto: conversa + ficha atual) devolve a FICHA (nome, papel, aparência, roupa, jeito, estilo) + PROMPT MESTRE em inglês + uma
  pergunta; campos editáveis; ✨ CRIAR IMAGEM pela fotos-nuvem.js (confirm, só o texto, conta nas 15/dia; fundo liso sai sozinho) ou COPIAR PROMPT
  e ＋ ENVIAR IMAGEM; sem conta = perguntas guiadas com as palavras da pessoa. Biblioteca ÚNICA em assets/bw-personagens.js (IndexedDB bw_reels,
  loja personagens — a mesma do BW Reels; tipos foto/ficha/montado). Ligações: ficha → 🧩 NO QUADRO DE HISTÓRIA (reels.html?quadro=1&pers=ID
  preenche o bloco PERSONAGEM) e 🎬 NO BW REELS; no Quadro, botão 👤 MEUS PERSONAGENS no bloco. O Reels não lista personagem sem imagem.
  docs/testes/teste_personagens.py (28 checagens × 1280/390, IA SIMULADA, 0 falhas). NÃO testado no ar com a IA real. Criador IA e editor de
  fotos ainda não puxam da biblioteca. Manual 45 → 46 p. layout.js v50, reels-quadro.js v6, sw v124. PENTE FINO 94.
- 18/11/2026 11:30 · Claude (dono, com referência de editor com linha do tempo: "área para receber as criações do Flux e criações de imagens e vídeos, com
  sistema moderno de camadas, inserção de trilha, efeitos sonoros"): EDITOR DE VÍDEO (video.html + assets/video-editor.js) em Marketing (menu, galerias
  e Início). MÍDIA (importar vídeo/imagem/áudio, arrastar arquivos, ✨ MINHAS CRIAÇÕES = imagens do Quadro, do Reels e dos Personagens), prévia,
  AJUSTES do clipe (tamanho, posição, opacidade, volume, entra/sai suave, duração, camada, encaixe) e LINHA DO TEMPO com 5 camadas (SOBREPOSIÇÃO,
  VÍDEO, TEXTO, TRILHA, EFEITOS): arrastar, aparar pelas alças, trocar de camada, agulha na régua, DIVIDIR, DUPLICAR, APAGAR, zoom. TEXTO com
  fonte/cor/caixa. 6 efeitos sonoros + 2 bases musicais SINTETIZADOS no aparelho (sem arquivo de terceiros). EXPORTAR = canvas + áudio gravados
  pelo MediaRecorder (MP4 onde o navegador grava; senão WebM, com aviso), no tempo do vídeo; SALVAR/COMPARTILHAR. Projeto e mídias no IndexedDB
  bw_video; nada sai do aparelho (vigia confere). docs/testes/teste_video.py (22 checagens × 1280/390): exporta de verdade e confere com ffprobe
  (vídeo + áudio, 720×1280, som não mudo). NÃO testado em iPhone/Android reais nem com MP4 de câmera (o Chromium de teste só abre WebM).
  LIMITES: sem transições entre clipes, sem velocidade, sem legendas automáticas; exportação em tempo real. Manual 46 → 47 p. layout.js v51.
- 18/11/2026 12:10 · Claude (dono: "cara do app mais colorida e moderna" + "as alterações são para o assistente/exe também" + "personagens: fotos em vários
  planos — americano, rosto, costas, frente, de cima — e variações de roupas e acessórios"): (1) CARA NOVA: botões de acesso de TODAS as galerias
  viraram cartões coloridos em degradê (8 tons pela posição, brilho em diagonal, ícone claro) — só CSS, bloco no fim do brightway.css v27 (apagar o
  bloco volta ao antigo); a tela inicial do aplicativo BW Reels ganhou os mesmos cartões coloridos. (2) APLICATIVO (Studio 1.1): cartões PERSONAGENS
  e EDITOR DE VÍDEO, as duas páginas na lista do uso sem internet, site-offline.zip e downloads/BW-Reels-Studio.zip gerados de novo.
  (3) PERSONAGENS: ficha com 6 PLANOS (frente, americano, rosto, perfil, costas, de cima) — enviar várias de uma vez ou tocar no plano; FOLHA DE
  REFERÊNCIA (PNG com todos os planos, para IAs de fora); VARIAÇÕES de roupa/acessórios (nome, descrição, foto opcional). No Quadro: a lista
  👤 MEUS PERSONAGENS mostra as variações e, ao CRIAR IMAGENS, cada cena manda o plano parecido com ela (BWPersonagens.planoPara: rosto no close,
  costas em "de costas"…). teste_personagens.py +11 checagens (0 falhas, IA simulada). A função de imagem continua aceitando 1 foto do personagem
  + 1 referência por pedido (não manda os 6 planos juntos). brightway.css v27, layout.js v51, reels-quadro.js v7, sw v126. PENTE FINO 95.
- 18/11/2026 12:40 · Claude (dono: "nas ferramentas de edição, as opções de máscara por exemplo, crie setas de omissão e revelação… não precisar ficar rolando a
  tela; em todas as funcionalidades"): SETAS DE ABRIR/FECHAR. Editor de fotos (já tinha seta em cada seção): MISTURA, MÁSCARA PRONTA, MÁSCARA
  LIVRE, OVERLAYS, SELOS e IA NO ROSTO agora começam FECHADAS (▸ abre; a escolha fica guardada) e o painel ganhou ▸ FECHAR TUDO /
  ▾ ABRIR TUDO. Mecanismo comum novo para qualquer página: título com data-seta="chave" (layout.js BWDobras + brightway.css; guarda em
  ui_dobras; data-seta-padrao="fechada"; o Início já usava data-dobra para as seções dele — nome diferente de propósito). Já usa: EDITOR DE VÍDEO (caixas MÍDIA e AJUSTES; ajustes em grupos TEXTO, TAMANHO E POSIÇÃO, SOM,
  TEMPO E CAMADA) e PERSONAGENS (FICHA E PROMPT, FOTOS DE REFERÊNCIA, VARIAÇÕES, USAR). Outras páginas com painéis longos (Criador IA, BW Reels,
  orçamentos) ainda não foram agrupadas — basta pôr data-seta no título. fotos.js v13, layout.js v52, brightway.css v28, sw v127. PENTE FINO 96.
- 18/11/2026 23:40 · Claude (dono, com 2 referências de painel de indicadores: "dificuldade em achar lançamentos… uma página só para lançamentos; botões
  perguntando de que e onde; lista com todos por data e nicho, vendo o que alimenta os indicadores; editar valores, editar para onde foi e
  excluir" + "na plataforma e no assistente exe"): PÁGINA LANÇAMENTOS (lancamentos.html + assets/lancamentos.js), item novo do menu logo depois do
  Início (2ª aba no celular) e o atalho LANÇAMENTOS do Início aponta para ela. ＋ NOVO LANÇAMENTO em passos: O QUE É (GASTEI, RECEBI, CONTA A PAGAR,
  GUARDEI, INVESTI) → DE ONDE (CASA, NEGÓCIO, EVENTO) → valor/data/nome, com a faixa "vai para… e alimenta…"; LANÇAR E FAZER OUTRO. Grava nos
  MESMOS lugares das páginas (casa_orcamento, casa_contas, casa_reserva, neg_fluxo, neg_eventos gastos/recebido, inv_lancamentos) com antesDeSalvar
  — nenhuma chave nova. Custo e recebido de evento são espelhados no fluxo na hora (mesma regra do modules/sincronia). LISTA ÚNICA por data com
  nicho, "alimenta:", filtros (mês, nicho, entradas/saídas, ordem, busca), ✓ MARCAR PAGA nas contas, ✎ ALTERAR (valor, data, nome e PARA ONDE
  FOI: casa ↔ negócio ↔ evento ↔ conta, sem lançar de novo) e ✕ excluir com confirmação; cachê da equipe e custo fixo aparecem como AUTOMÁTICO
  com atalho para onde nascem. No alto: 5 números do mês (entradas, saídas pagas, resultado, a pagar, quantidade), 6 meses, saídas por nicho e
  quantos lançamentos alimentam cada indicador. docs/testes/teste_lancamentos.py (31 checagens × 1280/390, 0 falhas). NÃO testado na conta real do
  dono (não mexo nos dados dele sem pedir). Aplicativo 1.2: cartão LANÇAMENTOS + página na cópia sem internet. Manual 47 → 48 p.
  layout.js v53, sw v128. PENTE FINO 97.
- 18/11/2026 23:59 · Claude (dono: "tire a lista de pagamentos de eventos do painel e deixe no banco de dados dos lançamentos; vamos centralizar"):
  PAINEL FINANCEIRO — saíram a tabela e a busca de "Pagamentos de eventos"; ficam os 3 números (quantidade, total recebido, ticket médio) e o
  botão VER OS PAGAMENTOS NOS LANÇAMENTOS (lancamentos.html?nicho=evento&tipo=e&periodo=tudo; some quando a fonte é a planilha Google do ADM, que
  não é lançamento da plataforma). LANÇAMENTOS: aceita filtros pelo endereço (nicho, tipo, periodo) e o recebido de cada evento aparece como
  "Pagamento do evento NOME · cliente X", com alterar/excluir. teste_lancamentos.py +3 checagens (0 falhas). lancamentos.js v2, sw v129.
- 19/11/2026 00:10 · Claude (dono: "a área de fluxo de caixa se tornou redundante; retire e confira se o banco de dados está na nova página"):
  FLUXO DE CAIXA saiu — fluxo.html só redireciona para lancamentos.html. O que só ela tinha foi para LANÇAMENTOS: seção 🔁 FIXOS DO NEGÓCIO
  (neg_fixos, mesmo formato; cria os 6 próximos lançamentos, excluir tira os futuros) e botão 📄 PDF DO MÊS (pdfMake sob demanda). Os dados
  (neg_fluxo, neg_fixos) não mudaram de lugar nem de formato: tudo o que estava no fluxo aparece na lista (manual = alterar/excluir; cachê e
  fixo = AUTOMÁTICO; linha ev_ antiga agora aparece e pode ser excluída). CACHÊS E CUSTOS virou página própria (sem abas) e entrou no menu Meu
  negócio e no card do negocio.html no lugar do Fluxo. Links trocados: painel financeiro, sino, agenda do Início, Tio Cláudio ("abrir fluxo" →
  Lançamentos), textos de custos/equipe/eventos. Manual 48 → 47 p. (saiu "Fluxo de caixa"). teste_lancamentos.py +7 checagens (0 falhas);
  PDF DO MÊS NÃO conferido aqui (sem acesso à biblioteca) nem nada na conta real do dono. lancamentos.js v3, layout.js v54, bw-agente v19, sw v130. PENTE FINO 98.
- 19/11/2026 00:40 · Claude (dono: "custos.html também se torna redundante; crie nos lançamentos um lançamento só para cachê de equipe, identificando
  o evento, com pago/não pago em cores e mexendo nos indicadores" + "as ferramentas que facilitam os lançamentos devem ficar na página de lançamentos"):
  CACHÊS E CUSTOS saiu — custos.html redireciona para lancamentos.html (saiu do menu; card do negocio.html virou LANÇAMENTOS). LANÇAMENTOS ganhou
  👥 CACHÊ DA EQUIPE no ＋ NOVO (quem recebe — lista dos colaboradores ou nome digitado —, evento obrigatório, valor, data, situação, observação):
  grava em neg_equipe_pagamentos no formato de sempre (liga colabId/equipeId quando o nome é da equipe). Na lista: botão vermelho NÃO PAGO ↔ verde
  PAGO ✓ (animação BWConcluir); pago vira custo do evento (pag_<id>) e sai do "a pagar"; não pago fica pendente (agenda/sino). ALTERAR troca valor,
  evento e situação; excluir limpa evento e fluxo. Custo durante o evento já era GASTEI › DE UM EVENTO; o dashboard por evento continua em EVENTOS.
  PERDEU-SE: a foto do comprovante anexada ao custo (o LEITOR DE CONTAS continua lançando custo de evento com o arquivo). Nova faixa 🧰 FERRAMENTAS
  nos Lançamentos: LER CONTA OU COMPROVANTE (leitor), FALAR COM O TIO CLÁUDIO, LANÇAR POR PLANILHA (Painel Financeiro), FIXOS DO MÊS.
  teste_lancamentos.py +16 checagens (0 falhas). Manual 47 → 46 p. NÃO testado na conta real. lancamentos.js v5, layout.js v55, bw-agente v20, sw v131. PENTE FINO 99.
- 19/11/2026 01:10 · Claude (dono: "evento que vai do dia 27 a 29… acrescentar o dia de término; a agenda fica completa com um risco em todos os
  dias"): EVENTOS — campo novo "Termina em (último dia)" no NOVO EVENTO e no EDITAR (neg_eventos[].dataFim). Cartão mostra "27/11 a 29/11 (3 dias)" e
  "EM ANDAMENTO · dia 2 de 3" (só vira "realizado" depois do último dia); dossiê em PDF com o período. AGENDA do Início e agenda da página EVENTOS:
  o evento aparece em todos os dias ("Dia 2 de 3") com um RISCO âmbar ligando do primeiro ao último (verde quando concluído; concluir uma vez
  vale para todos os dias). Sino conta o evento em andamento como "hoje"; Tio Cláudio enxerga os dias seguintes; orçamento aprovado com data final
  já cria o evento com dataFim. NÃO mudou: o e-mail automático (função bw-avisos no Supabase) ainda olha só o 1º dia. Novo
  docs/testes/teste_evento_dias.py (16 checagens × 1280/390, 0 falhas). brightway.css v29, layout.js v56, bw-agente v21, propostas.js v8, sw v132. PENTE FINO 100.
- 19/11/2026 01:40 · Claude (dono: "altere o layout da Gestão de casa; a página principal com a aparência e os dados da página de lançamentos"):
  GESTÃO DE CASA agora abre no PAINEL DA CASA (casa.html, antes só redirecionava para o Orçamento): mesma cara dos LANÇAMENTOS, só com a casa —
  5 números do mês (entradas, saídas, resultado, a pagar, guardado na reserva), entradas × saídas de 6 meses, GASTOS POR CATEGORIA, o que alimenta,
  lista com filtros (CASA, CONTAS A PAGAR, RESERVA), ✓ MARCAR PAGA, alterar/excluir e ＋ NOVO só com GASTEI, RECEBI, CONTA A PAGAR e GUARDEI (já vai
  direto para a casa). Atalhos no alto: ORÇAMENTO FAMILIAR, CONTAS A PAGAR, RESERVA, LER CONTA, TIO CLÁUDIO, TODOS OS LANÇAMENTOS. Menu: Gestão de
  casa → Painel da casa (primeiro item). As páginas Orçamento, Contas e Reserva continuam como estavam. teste_lancamentos.py +10 checagens (0 falhas).
  lancamentos.js v6, layout.js v57, sw v133. PENTE FINO 101.
- 19/11/2026 02:30 · Claude (dono, com 5 exemplos de trends + referência de app com cartões altos: "ferramenta PROMPT IA — biblioteca que o
  ADM alimenta e uma ferramenta que, ao enviar a trend, diz qual prompt usar, onde fazer e como"; "escolher passando para o lado, galeria
  flutuante"): nova página PROMPT IA em Marketing (menu, galeria de Marketing, Ferramentas e Início). BIBLIOTECA: cartões altos coloridos por
  tipo em carrossel com encaixe (passa para o lado / setas / teclado), o do meio maior e flutuando, os dos lados menores e inclinados; filtros
  por tipo; em cada cartão PROMPT · COMO FAZER · ONDE FAZER (links das IAs) e ⧉ COPIAR PROMPT; sem trends cadastradas mostra 3 EXEMPLOS de
  texto. ANALISAR: print (escolher/arrastar/colar) + "o que você quer fazer" + detalhe → confirm → bw-ia com visão → cartão com nome, prompt
  (inglês, [COLCHETES] para personalizar), onde fazer, passos e dicas. ADM: ＋ NOVA TREND, ＋ SALVAR NA BIBLIOTECA a partir da análise, ✎ ALTERAR,
  ✕ EXCLUIR. Supabase (com o "sim" do dono): SQL rodado (rls true, 4 regras + 3 no bucket, bucket público) e bw-ia publicada com visão
  (conferida por SHA-256 antes e depois). docs/testes/teste_promptia.py (≈30 checagens × 1280/390, Supabase e IA SIMULADOS, 0 falhas).
  Manual 46 → 47 p. layout.js v58, sw v134. PENTE FINO 102.
- 19/11/2026 03:00 · Claude: PROMPT IA testado NO AR, logado: a análise dava 502 — o modelo de visão também "pensa" e o espaço da resposta
  (max + 600) acabava antes do texto; o erro mostrava só o ÚLTIMO modelo da lista (um nome que nem existia), escondendo o motivo.
  bw-ia republicada (SHA 7f4e9407…): max + 3000, lista só com modelos da página oficial e o motivo de CADA modelo no detalhe. Teste com imagem
  de TESTE desenhada: descrição certa em 3,4 s (qwen/qwen3.8-27b) e análise completa pela tela (nome, prompt em inglês com [COLCHETES], como/onde).
  Regra 102 vale assim: lista de modelos = só nomes conferidos na página oficial no dia; erro de lista mostra todos os motivos.
- 19/11/2026 03:30 · Claude (dono: "pegue esses exemplos e transforme em algo meu e publique" + "busque outras que já passaram ou estão rolando" +
  "também ensinar a fazer vídeos com IA de diversos nichos"): BIBLIOTECA DO PROMPT IA alimentada na conta ADM — 21 itens com prompt próprio
  (inglês, [COLCHETES]), passo a passo e dicas em português: 11 de IMAGEM (boneco 3D urbano, ilustração anos 80, blocos de montar, miniatura
  colecionável na mesa, boneco na embalagem, polaroid com o eu criança, P&B de revista, estúdio anos 80, adesivo chibi, pet em pintura clássica,
  evento em miniatura isométrica) e 10 de VÍDEO por nicho e técnica (produto em câmera lenta, abertura de aftermovie, comida, tour de imóvel,
  foto que ganha vida, personagem que fala, história em cenas, antes/depois com primeiro e último quadro, logo animada, dica falada com B-roll).
  15 imagens de exemplo criadas pela bw-ia-imagem com PESSOAS INVENTADAS (nada dos prints de terceiros, sem marcas nem personagens conhecidos) no
  bucket trends; 6 guias de vídeo sem imagem (cartão com emoji). Limite de 15 imagens do dia usado inteiro. promptia.js v2: links para BW Reels,
  Quadro de História, Editor de vídeo e CapCut no ONDE FAZER. sw v135.
- 19/11/2026 03:45 · Claude (dono: "alguns exemplos ficaram cortando, reenquadre"): o cartão da biblioteca cortava a imagem (faixa de 270 px
  com object-fit:cover numa imagem 4:5 + degradê escuro cobrindo 55% de baixo + título por cima) — pés, mãos e o fim da cena sumiam.
  Agora a imagem aparece INTEIRA (contain, 340 px; 300 px no celular) sobre uma cópia desfocada dela mesma, degradê só nos 22% de baixo e o
  título abaixo da imagem. Vale para qualquer proporção de imagem que o ADM enviar. promptia.js v4, sw v137.
- 19/11/2026 04:40 · Claude (dono: "aproveite o layout com rolagem e animação de aproximação nos personagens; crie bonecos 3D realistas de vários
  estilos" + "muitos exemplos e ângulos para futuras animações" + "sim" para liberar a conta ADM): PERSONAGENS ganhou PERSONAGENS PRONTOS — 12 bonecos
  3D (jogadora de futebol, pirata, bombeiro, palhaço, chef, astronauta, médica, cinegrafista, DJ, professora, surfista, bailarina), cada um em
  5 ÂNGULOS (frente, perfil, costas, rosto, ação) = 60 imagens criadas pela bw-ia-imagem com pessoas INVENTADAS, no bucket trends/pers/. Lista em
  assets/personagens-prontos.js (só lista; vigia). Carrossel com aproximação (o do meio cresce e flutua, os dos lados encolhem e inclinam), filtro
  por tipo, tocar no ângulo troca a imagem, ＋ USAR copia os 5 ângulos para a biblioteca do aparelho (sem duplicar) → Quadro de História e BW Reels.
  MEUS PERSONAGENS também virou carrossel. Novo plano AÇÃO em BWPersonagens (planoPara: corre/pula/chuta/dança…). bw-ia-imagem: modo "pers"
  (mesmo personagem em outro ângulo, sem a regra de espaço para texto) e LIMITE_ADM 100/dia só para is_bw_admin (usuários seguem com 15) —
  publicada conferindo SHA-256 (antes 11c58878 = repo, depois 53226614). O filtro da Cloudflare recusou várias vezes "cowboy" e "mecânico" (trocados
  por professora e surfista). teste_personagens.py +12 checagens (0 falhas). Manual atualizado. bw-personagens v3, personagens.js v4, sw v138.
- 19/11/2026 21:55 · Claude (dono: "gerar o instalador .exe" + testar no PC + publicar o download): GERAR-INSTALADOR.bat (CRLF) e instalador.iss
  (UTF-8 com BOM — sem o BOM o Inno lê os acentos errado) ajustados: versão 1.3, ícone opcional na Área de Trabalho, fora do pacote .claude/.mcp.json/
  os .bat de manutenção (0/5/8/9) e o próprio gerador, e tira o "oculto" dos arquivos copiados. Rodado no PC do dono (Inno Setup 6.7 já instalado):
  BW-Reels-Setup.exe 4,7 MB em ~15 s. Publicado em downloads/BW-Reels-Setup.exe: botão principal no ⚙ MOTOR NO PC do BW Reels Pro (o .zip virou
  opção) e seção "App BW Reels" no cartão do computador em baixar.html. sw.js não guarda zip/exe/pdf no cache. Instalação NÃO concluída no teste
  (a janela do instalador não abriu para o computer use) — aguarda o dono. Inno Setup 6.5+ pede licença comercial (paga, não obrigatória) para uso comercial. sw v139.
- 19/11/2026 22:10 · Claude (dono: "mudar o nome para BW — a plataforma não é só de reels"): o aplicativo do PC passou a se chamar BW (instalador
  BW-Setup.exe, pasta %LOCALAPPDATA%\BW, ícone "BW" no menu Iniciar e na Área de Trabalho, títulos das janelas, tela de entrada "BW · PLATAFORMA
  BRIGHTWAY NO PC", botão ⌂ BW). CRIAR-ATALHO apaga o ícone antigo "BW Reels" ao criar o novo. Ficaram com o nome antigo: a ferramenta do site
  BW REELS PRO, os nomes internos dos arquivos (BW-REELS.bat, bw-reels.ico) e a pasta bw-reels-studio. AppId do instalador mantido (atualiza
  por cima). teste-app 0 falhas; instalador gerado de novo no PC do dono (4,7 MB). downloads/BW-Setup.exe no lugar do antigo. sw v140.
- 19/11/2026 23:00 · Claude (dono: "quando houver atualizações o usuário recebe a notificação quando tiver rede, instala se quiser e depois recebe o
  tutorial do que mudou" + "confira se renomeou na plataforma web"): APP BW 1.4 com ATUALIZAÇÕES (motor/atualizar.mjs): procura ao abrir, a cada 30 min e
  quando a internet volta; aviso na tela do app (folha com a lista do que vem, ATUALIZAR AGORA / DEPOIS) ou toast nas páginas da plataforma; menu
  Atualizações com marcador; instala baixando o pacote do site, conferindo sha256, copiando por cima sem tocar em projetos e reabrindo; depois mostra
  "✨ O que mudou no BW 1.4" com cada novidade abrindo a ferramenta. Site: downloads/app-versao.json + docs/automacoes/publicar-app.py. teste-app.mjs
  +11 checagens (servidor simulado, pacote adulterado e de fora recusados), 0 falhas. Nome no site: textos do BW Reels Pro, Quadro e manual agora falam
  do "app BW" (reels.js v16, reels-quadro.js v8). A 1.3 não tem o atualizador: quem instalou a 1.3 instala a 1.4 uma vez pelo BW-Setup.exe. sw v141. PENTE FINO 104.
- 19/11/2026 22:30 · Claude (dono, print: "Cannot find package 'playwright-core'" ao abrir o BW instalado): o instalador copia o app sem node_modules e
  depende do INSTALAR.bat do fim da instalação; se ele é desmarcado ou falha, o BW abre sem o motor. BW-REELS.bat agora confere Node e
  node_modules\playwright-core e, se faltar, roda o INSTALAR.bat em modo "auto" (sem Claude Code e sem vídeo de demonstração) antes de abrir.
  INSTALAR.bat convertido para CRLF (estava LF; goto em .bat LF falha). Pacote 1.4 refeito no site. PENTE FINO 105.
- 19/11/2026 23:30 · Claude (dono: "área BW SKILL… só para logados dentro do assistente… instalação passo a passo como a do Windows, pedindo as pastas…
  funciona com ChatGPT, Llama?"): APP BW 1.5 — BW SKILL (app/skills.html + motor/skills.mjs + bw-skills/). Carrossel com aproximação; cada skill com
  nível, o que faz, selos por IA (TESTADA no Claude; COMPATÍVEL no Codex e no Gemini CLI; EXPERIMENTAL em outra) e INSTALAR / TUTORIAL / PASTA /
  REMOVER. Instalador estilo Windows (etapas na lateral, Voltar/Avançar, barra): Boas-vindas → Requisitos (FFmpeg, programa de edição, IA que
  trabalha no PC) → Sua IA (acha Claude/Codex/Gemini no PC; "outra" gera .zip em Downloads) → Suas pastas (janela do Windows) → Seu jeito de
  trabalhar → Sua marca → Conferir → Instalar (+ teste rápido) → Tutorial. Skills: EDITOR DE VÍDEO PROFISSIONAL (versão para usuários da skill do
  dono, sem pastas/clientes dele) e ANIMAÇÃO POR CÓDIGO (aponta para o motor do app). teste-app.mjs +19 checagens (0 falhas). Pacote 1.5 publicado
  (aviso de atualização para quem está na 1.4). NÃO testado no Windows (janela de pasta) nem com o Codex/Gemini de verdade. PENTE FINO 106.
- 19/11/2026 23:45 · Claude (dono, prints do instalador da BW SKILL: "nestas partes ele fica omitindo e atrapalhando; uma linha de rolagem para baixo"):
  a coluna da direita do instalador crescia além da janela (item de grade sem min-height:0) e escondia o rodapé com AVANÇAR/VOLTAR. Agora a janela tem
  linha de grade minmax(0,1fr), o conteúdo rola por dentro com barra dourada sempre visível e aparece "▼ ROLE PARA VER MAIS" enquanto houver algo
  embaixo; janela um pouco maior (720 px). APP BW 1.5.1 publicado (aviso de atualização). teste-app 0 falhas. PENTE FINO 107.

- 20/11/2026 00:05 · Claude (dono: "versões com fundo chroma key para recorte" + 3 vídeos de referência): APP BW 1.5.2 — motor/animar.mjs ganhou
  `--chroma verde|azul|magenta|#hex` (MP4 leve com fundo de recorte; o --alfa .mov transparente continua) e esconde o fundo do HTML (data-fundo);
  aviso quando a animação usa a cor do fundo. Modelo novo modelos/animacoes/cartao-ui.html no estilo das referências (cartão com gráfico que se
  desenha, selo, comentário digitando, legenda em etiquetas), animação em cima e rosto livre embaixo. Skill ANIMAÇÃO POR CÓDIGO 1.1 (BW SKILL
  mostra VERSÃO NOVA) + tutorial explicando o Chroma key do CapCut. motor/teste-recorte.mjs (10 checagens, recorte real com chromakey) e
  teste-app 0 falhas. PENTE FINO 108.
- 20/11/2026 01:10 · Claude (dono, com 4 vídeos de referência: "ecossistema em que as pessoas escolhem os itens da tela e os motions, mudam a direção
  com keyframes ou usam o motion automático; biblioteca de itens com o efeito escolhido ou criar o próprio com ajuda" — escolheu plataforma + app BW,
  tudo junto): ESTÚDIO DE MOTION (motion.html + assets/motion.js + assets/motion-motor.js) em Marketing (menu, galerias, Ferramentas e Início).
  BIBLIOTECA de 14 itens (título/texto com *destaque*, etiqueta, número contando, selo, cartão, janela de chat com comando digitando, gráfico de
  linha, notificação/DM, foto, antes e depois com régua, lupa, emoji, forma, piso 3D de luzes); 16 efeitos de ENTRADA/SAÍDA (incl. palavra por
  palavra e máquina de escrever), 7 movimentos DURANTE; KEYFRAMES de posição/tamanho/giro/opacidade (◆ por valor, ◆ GRAVAR MOVIMENTO arrastando,
  curva por keyframe, arrastar ◆ na linha do tempo); LINHA DO TEMPO com barras (arrastar/aparar); ✨ MOTION AUTOMÁTICO (dinâmico/suave/impacto);
  ✨ CRIAR EFEITO COM AJUDA (frase → bw-ia → chaves; sem conta, criador do aparelho) ou do movimento do item → ★ MEUS EFEITOS (ui_motion_efeitos);
  4 MODELOS (vitrine de prompts, cartão com gráfico, título de impacto, em branco); desfazer/refazer; projetos no IndexedDB bw_motion. EXPORTAR:
  no aparelho (BWReelsCelular) com fundo normal/verde/azul/magenta; no app BW (.bwmotion.json → motor local → animar.mjs) também transparente .mov;
  HTML da animação para a skill. Studio: modelos/animacoes/vitrine-prompts.html (reels "5 códigos" com piso 3D) e app BW 1.6 (cartão ESTÚDIO DE
  MOTION, render .bwmotion.json, .mov em MEUS VÍDEOS, site-offline.zip refeito), skill ANIMAÇÃO POR CÓDIGO 1.2. Testes: docs/testes/teste_motion.py
  (≈45 checagens × 1280/390: MP4 feito no aparelho com fundo verde conferido no pixel, HTML renderizado pelo motor do PC com magenta) e teste-app
  (+8: magenta, .mov com alfa, texto com <img> não executa, projeto inválido recusado, motor igual ao do site) 0 falhas; varredura 54 páginas
  (só as fotos do Supabase, sem rede aqui); vigia ✅ (motion.js só chama a bw-ia; motor sem rede). Manual 47 → 48 p. layout.js v59, sw v142.
  NÃO testado: a IA real criando efeito (logado), iPhone/Android reais, o app BW no Windows. PENTE FINO 109.
- 20/11/2026 01:55 · Claude (dono, com 4 vídeos de referência — 3 pacotes de transição em chroma verde e um vídeo de imóvel: "ferramenta onde você insere fotos
  e takes e eles são aplicados de acordo com o motion de screens e suas divisões"; escolheu ferramenta própria, fotos e vídeos): TELAS EM MOVIMENTO
  (telas.html + assets/telas.js + assets/telas-motor.js) em Marketing (menu, galerias, Ferramentas e Início). Tudo em CANVAS: 16 transições em que as
  peças levam a mídia nova por dentro (tiras diagonais, persiana, mosaico, cata-vento, cacos, painéis 3D, X, janela, túnel, losango, chicote com
  borrão, zoom, círculo, faixas, flash, corte) com prévia animada; 6 divisões (cheia, 2, 3, 4 telas, diagonal, janela) com uma mídia por tela e
  trecho do take; movimento de câmera; contorno neon; 4 pacotes (Geométrico, Imóvel/lifestyle, Energia, Suave). MÚSICA com batida achada no
  aparelho (energia → autocorrelação 70–180 BPM) e ✨ MONTAR SOZINHO cortando na batida. SEQUÊNCIA com miniaturas, desfazer, projetos e mídias
  no IndexedDB bw_telas (nada sai do aparelho — vigia). GERAR VÍDEO: reels-celular.js v4 ganhou `desenhar` (quadro em canvas, takes no quadro
  certo) + som da música com fim suave. docs/testes/teste_telas.py (27 checagens × 1280/390: batida 120 BPM = 0,500 s, 4 cenas de 1,0 s, MP4 com
  a cor certa em cada cena, take verde dentro da tela, duas fotos no meio da transição, som −26,6 dB) 0 falhas; teste_reels_celular, teste_motion e
  teste-app 0 falhas; varredura 55 páginas. App BW 1.7 (cartão + página sem internet). Manual 48 → 49 p. layout.js v60, sw v143.
  NÃO testado: vídeos de câmera reais (MP4/HEVC; o Chromium de teste só abre WebM), iPhone/Android reais, música MP3 real. PENTE FINO 110.
- 20/11/2026 02:20 · Claude (dono: "arrastar a mídia para a time line e o efeito de tela para cima" + "formato personalizado, telão de LED 1450×2000 ou 4K"):
  TELAS EM MOVIMENTO — ARRASTAR E SOLTAR (mouse; no celular segura ~0,2 s): foto/take → SEQUÊNCIA cria cena no ponto (barra verde mostra onde;
  bordas da cena = antes/depois), → no meio de uma cena troca a mídia da TELA onde caiu (cena dividida = tela certa), → prévia grande idem;
  nova faixa EFEITOS DE TELA (16 transições animadas + 6 divisões) → arrastar para a cena ou para a etiqueta entre duas cenas; tocar no
  efeito aplica na cena escolhida; arrastar cena reordena; perto da borda a página/sequência rolam sozinhas. TAMANHO: 4K vertical/paisagem
  e Personalizado (240–4096 px) no Telas e no Estúdio de motion (itens acompanham); GERAR VÍDEO oferece Rápida/Alta/Tamanho real e marca o
  que o aparelho não aguenta. reels-celular.js v5: nível do H.264 escolhido pelo tamanho (4.0 não passava de ~2 MP; 1450×2000 sai em 5.0).
  teste_telas.py (+18: arrastes por mouse e por toque, MP4 1450×2000 conferido no ffprobe) e teste_motion (+4) 0 falhas. sw v144. PENTE FINO 111.
- 20/11/2026 04:10 · Claude (dono: "ferramentas como na Adobe — C vira a lâmina, V a seleção… Delete apaga, clicar abre opções de duplicar,
  substituir; pesquise a Adobe e o CapCut: transições, efeitos" + "escolher a cor da linha das transições ou transparência" + "REGRA: em toda
  tela de edição a mídia fica FIXA e as ferramentas rolam"): novo assets/bw-ferramentas.js (comum; vigia: sem rede/conta) com BARRA DE
  FERRAMENTAS de uma tecla (cursor muda), ATALHOS, MENU DE OPÇÕES (botão direito / segurar o dedo), lista de atalhos (?) e TELA FIXA.
  EDITOR DE VÍDEO: V seleção (arrasta o clipe na prévia), C lâmina (linha verde mostra o corte; Shift = todas as camadas), H mão, Z zoom,
  T texto no ponto tocado; Espaço/K/L/J, ←/→ quadro, Delete, Shift+Delete (fecha o espaço), Ctrl+K, Ctrl+C/V, Ctrl+Shift+D, Ctrl+D
  (dissolver), Ctrl+Z/Y (o editor não tinha desfazer), =/−/\, Ctrl+S/M/I; menu do clipe e da mídia (cortar, duplicar, SUBSTITUIR MÍDIA,
  velocidade, congelar, transição, efeito, camada, apagar). Novo no vídeo: 11 TRANSIÇÕES entre clipes (o clipe que sai fica no último quadro),
  12 EFEITOS por modos de mistura do canvas (valem no iPhone), VELOCIDADE 0,25–3×, ❄ CONGELAR QUADRO, 4K e tamanho Personalizado.
  ESTÚDIO DE MOTION: V/C/H/Z/T, setas movem o item, Ctrl+D/K/C/V, Ctrl+]/[, Delete sem pergunta, menu do item. TELAS: V/C/H, Delete,
  Ctrl+D/K, copiar/colar estilo, menu da cena/mídia/efeito (no celular: segurar e soltar sem arrastar), SUBSTITUIR O ARQUIVO; LINHAS das
  transições (7 cores, cor livre, ∅ sem linha, transparência; a linha some no fim da transição). FOTOS (só no PC; no celular ficam as abas):
  V/C/H/Z/T, B pincel e E borracha da máscara, [ ] tamanho, X troca, I conta-gotas, Ctrl+J, Delete, menu na foto.
  TELA FIXA: no PC o editor ocupa a altura da janela (painéis, sequência e linha do tempo rolam por dentro; Telas com sequência e efeitos lado
  a lado); no celular a prévia fica presa no topo da PÁGINA inteira (antes soltava ao chegar na linha do tempo). Bugs achados: desfazer do
  Motion perdia o último passo (espera de 350 ms); Telas tocando podia dar erro com tempo negativo no 1º quadro; menu aberto por toque
  escolhia o 1º item ao soltar o dedo; Esc do menu fechava também o editor de fotos. Testes: teste_video (+23), teste_telas (+17),
  teste_motion (+9), teste_fotos (+16) 0 falhas; teste-app 0; vigia ✅. App BW 1.8 publicado. Manual 49 → 50 p. sw v145. PENTE FINO 112–115.
  NÃO testado: iPhone/Android reais, vídeos de câmera (MP4/HEVC), exportação em 4K de verdade no editor de vídeo (gravação em tempo real).- 20/11/2026 11:00 · Claude (dono, com o retorno dos usuários: "duas abas nos lançamentos; OS DADOS NÃO PODEM SE MISTURAR — pessoa física separada de jurídica,
  cada área com a sua cor; painel financeiro com PAINEL PJ e PAINEL PF; página principal com MINHA EMPRESA e MINHA CASA, cada ecossistema com agenda
  independente e as ferramentas que fazem sentido; botão de download = o .exe"): AMBIENTES. (1) INÍCIO só com as duas portas (MINHA EMPRESA azul →
  negocio.html; MINHA CASA verde → casa.html), cada uma com 2 números. (2) negocio.html e casa.html refeitas pelo MESMO molde
  (docs/automacoes/gerar-ambientes.py + cartoes.json; saiu o gerar-casa.py): 5 números do mês (assets/ambiente.js), botões LANÇAMENTOS PJ/PF e
  PAINEL FINANCEIRO, AGENDA própria e galerias — empresa: gestão, CRM, marketing, ferramentas; casa: gestão, investimentos, ferramentas.
  (3) LANÇAMENTOS com abas LANÇAMENTOS PJ | LANÇAMENTOS PF: lista, números, gráficos, filtros, NOVO, ALTERAR e PDF só do ambiente; criar() recusa
  destino do outro; "para onde foi" só dentro do ambiente (não existe mais casa ↔ negócio); FIXOS só na PJ; INVESTI ficou na PF.
  (4) PAINEL FINANCEIRO com abas PAINEL PJ | PAINEL PF: o PF é novo (casa_orcamento + contas pagas + reserva; receitas, contas pagas, gastos,
  sobrou, guardado, saldo livre; exemplo de casa fictícia; BAIXAR PLANILHA da casa); ENVIAR PLANILHA, pagamentos de eventos e planilha Google
  só na PJ; "Pró-labore e pessoal" virou "Pró-labore e retiradas". (5) AGENDA saiu do pacote do Início → assets/agenda.js por ambiente: empresa =
  eventos, fixos, cachês, CRM e tarefas de trabalho; casa = contas da casa e tarefas pessoais; conta/entrada escrita na agenda grava no ambiente
  dela. (6) Menu: "Minha empresa" e "Minha casa" (com Lançamentos PJ/PF e Painel PJ/PF). (7) APP DOWNLOAD no computador abre baixar.html com
  o botão principal BAIXAR O APP BW (.EXE) (downloads/BW-Setup.exe) sempre à vista. Achado no caminho: PAINEL parava sem a biblioteca de gráficos.
  Testes: novo docs/testes/teste_ambientes.py (61 checagens × 1280/390, 0 falhas — lançar num ambiente não muda NENHUMA chave do outro);
  lancamentos, agenda, layout, evento_dias, crm, agente_leitor, concluir 0 falhas (adaptados); varredura só as fotos do Supabase (sem rede aqui);
  vigia ✅ (item 7.8c novo). NÃO feito: sino de AVISOS continua juntando casa e empresa; cópia sem internet do app BW (PC) só ganha as páginas
  novas no próximo pacote do app; NÃO testado na conta real do dono nem em iPhone/Android reais. brightway.css v30, layout.js v61,
  lancamentos.js v7, agenda.js v1, ambiente.js v1, sw v146. PENTE FINO 116–118.
- 20/11/2026 11:40 · Claude (dono, com um vídeo e duas imagens de referência: "a página principal será esta e levará para dentro dos ecossistemas; sistema de
  telas como os de personagens e prompts, idêntico à animação, só retirando os efeitos; troque o Tio Cláudio pelo novo visual do robô"):
  PÁGINA PRINCIPAL NOVA (index.html + assets/portal.js): o robô no centro, flutuando, sobre o piso de anéis, e 4 TELAS de vidro girando em volta —
  MEU NEGÓCIO (roxo → negocio.html), GESTÃO DE CASA (ciano → casa.html), MARKETING (rosa → marketing.html), FERRAMENTAS (verde-água →
  ferramentas.html), com os desenhos de cada uma em linha. Parada, a roda fica como no desenho (duas atrás/em cima, duas na frente/embaixo) e
  respira de leve; tocar numa tela, passar o dedo para o lado, as setas ou o teclado trazem a tela para a FRENTE do robô, maior, com o nome e o
  botão ENTRAR; tocar de novo aproxima a tela e abre o ecossistema. Sem partículas, rastros nem túnel (pedido). Movimento reduzido do sistema
  = sem animação. Saíram do Início as duas portas da manhã (os nomes do desenho mandam: MEU NEGÓCIO / GESTÃO DE CASA levam a MINHA EMPRESA /
  MINHA CASA). TIO CLÁUDIO: botão flutuante e cabeçalho com o robô novo (icons/robo-bw-128.png, recortado do desenho do dono; botão azul no
  lugar do dourado); o nome continua. Imagem grande: icons/robo-bw.webp. teste_ambientes.py (67 checagens × 1280/390), layout, agenda,
  agente_leitor, crm, lancamentos, concluir, evento_dias 0 falhas; varredura só as fotos do Supabase; vigia ✅ (confere as 4 telas, as imagens
  e que o portal.js não lê nem grava dados). NÃO feito: os braços do robô não se mexem (é uma imagem só; o vídeo de referência é gerado por IA);
  MANUAL DO USUÁRIO ainda com as telas antigas (Início, Lançamentos, Painel, Gestão de casa) — refazer as páginas; cópia sem internet do app BW
  só no próximo pacote. NÃO testado em iPhone/Android reais nem na conta do dono. brightway.css v31, layout.js v62, bw-agente v22, portal.js v1, sw v147. PENTE FINO 119.
- 20/11/2026 13:20 · Claude (dono, com 4 referências de layout: "modos de aparência — dark, clean, futurista…; engrenagem no menu e área de configuração
  do usuário com os dados dele; combinações simples (preto e branco, azul e branco) e ousadas com animações — neon em movimento, o robô piscando e
  reagindo ao mouse; fácil incluir modelos no futuro; modos animados de datas (Natal, Ano Novo); modelos com a marca do cliente; ler o manual da
  marca e se ajustar"): MODOS DE APARÊNCIA. (1) assets/modos.js (no <head> de todas as páginas) com a lista MODOS — 9 modos: SIMPLES = DARK,
  PRETO E BRANCO, AZUL E BRANCO, CLEAN; OUSADOS = FUTURISTA, ACONCHEGO; DATAS ESPECIAIS = NATAL, ANO NOVO, FESTA. Modo novo = um item na lista.
  (2) assets/modos.css: menu, topo, abas, cartões, agenda, lançamentos, ecossistemas e painel acompanham o modo; claros com cartões brancos e
  menu escuro na cor do modo; as cores dos ambientes (azul/verde) continuam. (3) EFEITOS dos animados: borda de neon que gira nos cartões, luzes
  de fundo que passeiam, linha de luz no topo, estrelas, NEVE + cordão de luzes (Natal), FOGOS (Ano Novo), CONFETE (Festa); chave para desligar.
  (4) ROBÔ do Início pisca, acompanha o ponteiro com o corpo, pisca mais rápido com o mouse em cima e dá um "oi" ao ser tocado; o do Tio Cláudio
  mexe ao passar o mouse. (5) CONFIGURAÇÕES (config.html + assets/config.js; engrenagem no topo e botão no menu): MEUS DADOS (nome, e-mail, como
  entra, desde quando, "Como te chamo?", atalhos da conta/manual/app), APARÊNCIA (modos em grupos com miniatura) e CRIAR UM MODO COM A MINHA
  MARCA: 📎 lê as cores de uma imagem (logo ou print do manual da marca) no aparelho, preenche principal/segunda/menu/fundo, VER COMO FICA e
  SALVAR (grupo MINHA MARCA; excluir volta ao DARK). Novo docs/testes/teste_modos.py (≈24 checagens × 1280/390, 0 falhas); ambientes, layout,
  agenda, lancamentos, agente_leitor, crm, concluir, evento_dias 0 falhas; varredura 56 páginas só as fotos do Supabase; vigia ✅ (7.8d).
  LIMITES: modo claro só clareia o miolo de Início, Minha empresa, Minha casa, Lançamentos, Painel, Configurações e galerias — nas demais
  ferramentas muda menu e destaques e o miolo fica escuro (falta ajustar página por página); manual da marca em PDF ainda não é lido (só imagem)
  e fontes/logo da marca não entram; a escolha não acompanha a conta (é por aparelho); no topo do celular o feedback saiu (fica no menu).
  NÃO testado em iPhone/Android reais nem na conta do dono. Manual do usuário continua pendente. brightway.css v32, layout.js v63, bw-agente v23,
  portal.js v2, modos.js v1, config.js v1, sw v148. PENTE FINO 120–121.

- 20/11/2026 13:40 · Claude (dono, com 2 referências de vidro: "senti falta de modos com este layout e com outras cores — preto, branco e detalhes dourado;
  verde, branco e preto… — para o usuário se identificar com a marca dele"; e decidiu: a escolha do modo fica POR APARELHO, não vai para a conta):
  13 modos novos. Grupo novo VIDRO E LUZ (9): VIDRO CIANO, PRETO E DOURADO, VERDE E PRETO, AZUL E PRETO, VERMELHO E PRETO, LARANJA E PRETO, ROXO E
  PRETO, ROSA E PRETO, PRETO E PRATA — cartões de vidro com borda de luz, galerias de acesso, telas e piso do Início, menu e botões na cor do modo
  (estilo: "vidro" → <html data-estilo="vidro">). SIMPLES ganhou 4 claros: BRANCO E DOURADO, VERDE E BRANCO, VERMELHO E BRANCO, LARANJA E BRANCO.
  Modo de vidro em outra cor = UMA linha no modos.js: vidro(id, NOME, frase, fundo, destaque, 2ª cor). MINHA MARCA ganhou "Estilo: vidro com luz".
  teste_modos.py +3 checagens (0 falhas); ambientes, layout, lancamentos, agenda 0 falhas; varredura só as fotos do Supabase; vigia ✅.
  NÃO testado em iPhone/Android reais. modos.js v2, modos.css v2, config.js v2, sw v149.
- 20/11/2026 14:00 · Claude (dono: "os painéis financeiros parecem não acompanhar os modelos; confira e corrija em todos os modos"): PAINEL DE INVESTIMENTOS e
  PAINEL FINANCEIRO (PJ e PF) são páginas sem o menu, com header/.hero/.card de cor escrita no próprio arquivo — só as variáveis mudavam. Agora
  cabeçalho, cartão de abertura, cartões, tabelas, abas, botões e campos seguem o modo (claros, escuros, vidro e neon); investimentos entrou em
  CLARO_OK; gráficos leem a cor da página (window.__cv em modos.js). teste_modos.py confere os 3 painéis nos 22 modos (0 falhas). modos.js v3,
  modos.css v3, sw v150. PENTE FINO 122.
- 20/11/2026 14:20 · Claude (dono: "atualize o assistente no PC com as novas atualizações e na web, atualize o tutorial e o arquivo exe. Deixe como regra:
  após uma atualização, sempre crie para o PC e para o app, atualize o manual e suba o BW exe e o novo manual"): REGRA nova no FECHAMENTO (etapa 5).
  APP BW 1.9: cartões MINHA EMPRESA, MINHA CASA, LANÇAMENTOS PJ E PF e APARÊNCIA E MODOS (22 ferramentas); cópia sem internet refeita com o site de
  hoje (130 arquivos: ambientes, robô, modos, config); tutorial refeito (app BW, instalar/atualizar, novidades 1.9; 8 p.); pacote e app-versao.json
  publicados (aviso de atualização para quem está na 1.8); arquivos copiados para Vídeos\bw-reels-studio no PC do dono e BW-Setup.exe 1.9 gerado lá
  (4,9 MB, versão conferida dentro do arquivo) → downloads/BW-Setup.exe. MANUAL DO USUÁRIO 50 → 52 p.: refeitas Conhecendo a tela (robô e 4 telas),
  Lançamentos PJ e PF, Minha empresa, Painel PJ e PF; novas Minha casa e Configurações e modos de aparência (docs/manual/telas_ambientes.py).
  teste-app 0 falhas (provedores simulados). NÃO testado: instalar o .exe 1.9 do zero e a atualização 1.8 → 1.9 num PC de verdade. sw v151.
- 20/11/2026 14:45 · Claude (dono, com 2 imagens de referência: "está na moda o lançamento do GTA 6; crie um modelo para ele e para outros jogos famosos,
  como Counter-Strike"): marcas, letreiros, personagens e mapas de jogos de verdade NÃO entram na plataforma (são de terceiros). Feito no lugar:
  grupo JOGOS com 6 modos ORIGINAIS de gênero — NEON 80 (sol de arcade + pista de luz no Início), TÁTICO (radar varrendo), ARCADE 8-BIT (blocos de
  pixel), CORRIDA (riscos de velocidade), FANTASIA (brasas) e ESPACIAL. Efeitos novos: pixels, brasas, velocidade (canvas), grade e radar (palco
  do Início). 28 modos no total. Pela regra nova: app BW 1.9.1 (pacote, cópia sem internet, tutorial, BW-Setup.exe gerado no PC do dono — versão
  conferida) e manual do usuário atualizados e publicados. teste_modos e teste-app 0 falhas; vigia ✅. NÃO feito: o robô não troca de roupa por
  modo (precisaria de uma imagem por modo). modos.js v4, modos.css v4, sw v152. PENTE FINO 123.
- 20/11/2026 15:05 · Claude (dono perguntou se dava para ficar parecido com os jogos famosos; resposta: não — só criação própria; ele aceitou "pode ser"):
  JOGOS mais ricos. Cenário DESENHADO no Início (SVG próprio dentro do modos.css): NEON 80 (céu com estrelas, sol listrado, serra em linha de luz e
  pista), TÁTICO (mapa de curvas de nível, cantoneiras, mira e leitura de coordenadas + radar), ARCADE 8-BIT (cidade em pixel e piso quadriculado).
  Os 6 modos de JOGOS ganharam letra de título do tema (Google Fonts, pedida só quando o modo liga: campo `fonte`) e o robô na cor do modo
  (campo `robo`, filtro de cor; vale no Início e no Tio Cláudio); TÁTICO com cantos retos e rótulos em letra de terminal; ARCADE com cantos retos e
  sombra dura. Campos novos servem para qualquer modo (fonte, robo, cena). teste_modos, teste_ambientes e teste-app 0 falhas; vigia ✅.
  App BW 1.9.2 (pacote, cópia sem internet, tutorial) e manual publicados; arquivos copiados para o PC do dono. BW-Setup.exe: o gerador NÃO rodou
  desta vez pelo clique remoto (3 tentativas) — o .exe publicado continua o 1.9.1, que se atualiza para 1.9.2 ao abrir. NÃO testado: as letras
  novas na tela (sem internet no teste elas caem na letra padrão) e iPhone/Android reais. modos.js v5, modos.css v5, sw v153.

- 20/11/2026 18:10 · Claude (dono: "VAMOS CRIAR ESTA FERRAMENTA AINDA MELHOR NO APP BW?" sobre o Tripo 3D → "Estúdio 3D + vídeo (Recomendado),
  PODEMOS FAZER TUDO ISSO E DEIXAR O USUÁRIO ESCOLHER?"): ESTÚDIO 3D (3d.html + assets/bw3d.js + assets/bw3d-motor.js) em Marketing (menu,
  galerias de Marketing e Ferramentas, cartão de MINHA EMPRESA). Dito ao dono com todas as letras: o gerador deles (foto → objeto) é modelo
  treinado e não se copia; o que o BW faz melhor é tudo o que vem DEPOIS do objeto. Quatro modos num seletor, como ele pediu:
  (1) MODELO 3D — abre GLB, OBJ e STL com motor próprio (sem biblioteca de fora), altura em metros, cor e material, giro, luz;
  (2) LOGO 3D — PNG (ou ★ MINHA MARCA do Editor de fotos) vira relevo dourado/prata/cromado/cobre/cor, espessura e bisel;
  (3) MAQUETE DE PALCO E LED — painéis de 0,5 m (cols × linhas, pitch P2.6…P10), palco, treliça, torres, pessoas de escala e câmeras, com
      MEDIDAS em metros e a FICHA do telão: nº de painéis, m² e a RESOLUÇÃO EM PIXELS (10 × 5 P3.9 = 1280 × 640 px) + botões que abrem o
      ESTÚDIO DE MOTION e as TELAS já nesse tamanho (motion.html/telas.html?w=&h=), arte do cliente acesa no painel e PLANTA EM PDF
      (ficha + vista em 3/4 + vista de cima);
  (4) IA 3D — monta o pedido em inglês para Tripo/Meshy/Rodin/Hunyuan, abre a IA e traz o .glb de volta; o site NÃO chama nenhuma IA de 3D e
      avisa o preço de referência (US$ 0,20–0,30 por modelo, 20/11) e que em plano grátis o modelo pode sair público e sem uso comercial.
  Fundo estúdio/claro/cor/verde/azul/magenta/transparente; GERAR VÍDEO no próprio aparelho (BWReelsCelular, 9:16, 4K, tamanho do telão ou livre)
  e SALVAR PNG (transparente de verdade). TELA FIXA + ferramentas V/H/Z e atalhos (regras 112–113). Nada sai do aparelho (IndexedDB bw_3d; vigia confere).
  Teste novo docs/testes/teste_3d.py (≈30 checagens × 1280/390: abre GLB/OBJ/STL de verdade, confere a cor do material no PIXEL, ficha 7×4 P3.9 =
  896 × 512 px, o tamanho chegando no Motion e nas Telas, PNG transparente, MP4 do telão conferido no ffprobe) — 0 falhas; telas, motion e layout 0 falhas;
  vigia ✅. App BW 1.9.3 (cartão ESTÚDIO 3D, destino, cópia sem internet refeita com o site de hoje, tutorial e novidades publicados) e manual
  52 → 53 p. BW-Setup.exe continua o 1.9.1 (depende do PC do dono; quem já tem o app atualiza sozinho). NÃO testado: iPhone/Android reais e
  modelos 3D grandes de verdade (os do teste são pequenos). layout.js v64, sw v154. PENTE FINO 124–127.
- 20/11/2026 19:30 · Claude (dono: "FAÇA UM SISTEMA EM QUE OS PROJETOS SERÃO INICIADOS DE ACORDO COM A PLACA DE VÍDEO DO USUÁRIO… o sistema
  identifica o projeto e, com as config da placa, diz o que ele pode ou não conseguir"): PLANO DO PROJETO (assets/bw3d-plano.js), agora o
  PRIMEIRO modo do ESTÚDIO 3D ("🎯 O QUE VOU FAZER?") e a tela em que quem chega cai. Lê a placa de vídeo pelo próprio navegador
  (WEBGL_debug_renderer_info + tabela de modelos → VRAM estimada; o usuário confirma no seletor, guardado em ui_3d_maquina), a RAM, os
  núcleos e se é celular. Seis tipos de trabalho, com o exemplo do dono: LOGO 3D DO NEGÓCIO e PALCO/LED (sem IA, rodam em qualquer aparelho),
  PEÇA OU PRODUTO, AVATAR PARA ANIMAR (IA + esqueleto no Mixamo), PEÇAS PARA JOGO (2D sem placa; 3D abaixo de 30 mil polígonos) e TRABALHO
  PESADO. Para cada um: veredito DÁ AQUI / PARTE AQUI / NA NUVEM, o motivo, o caminho numerado, quais geradores abertos rodam na placa
  (TRELLIS.2 24 GB MIT · Hunyuan3D 2.1 10 GB forma / 29 GB completo · TripoSR 6 GB MIT — conferido em 20/11), o que se entrega e o atalho
  que abre a ferramenta certa. Honesto: os geradores pedem CUDA, então placa AMD/Intel/Apple vai para a nuvem mesmo com muita memória.
  Nada sai do aparelho (vigia). Novo docs/testes/teste_3d_plano.py (≈18 checagens × 1280/390, vereditos simulados em 0/8/12/24 GB, 0 falhas);
  teste_3d, teste_3d_foto, teste_telas e teste_motion 0 falhas; vigia ✅. App BW 1.9.4 (cartão do Estúdio 3D, cópia sem internet com o
  arquivo novo, novidades publicadas) e manual 53 → 54 p. (página "O que a sua máquina consegue fazer"). BW-Setup.exe continua o 1.9.1 —
  quem já tem o app atualiza sozinho. NÃO testado: placa de verdade (aqui o navegador do teste não tem GPU) nem iPhone/Android reais. sw v157.
- 20/11/2026 19:40 · Claude (dono: "MINHA PLACA É UMA RTX 3050 6G NOTEBOOK" + "DEIXEI ABERTO, PODE CONFERIR OS DADOS"): li a máquina dele
  pelo navegador e o WebGL devolveu "Intel(R) UHD Graphics" — o Chrome do notebook roda no vídeo INTEGRADO, então o plano o classificava
  como "sem placa → nuvem", errado (o painel NVIDIA dele mostra RTX 3050 6GB Laptop, 12 núcleos, 16 GB de RAM). Correções: (1) tabela com as
  placas de NOTEBOOK antes das de mesa (a mesma sigla tem menos memória no portátil: 3060 laptop 6 GB, 4070 laptop 8 GB, 4090 laptop 16 GB…);
  (2) quando a leitura dá vídeo integrado, a tela AVISA que em notebook isso é normal e pede MARCA + memória (ui_3d_maquina guarda as duas;
  o resumo diz "O navegador vê:" enquanto o usuário não confirmar); (3) gerador novo na lista: Hunyuan3D 2 mini (5–6 GB, só a FORMA — é o
  modelo que a documentação cita justamente para GTX 1060 6 GB e RTX 3050), e por isso peça/avatar/jogo passam a "DÁ AQUI" a partir de 5–6 GB,
  com o aviso de que a TEXTURA é que pede 16 GB ou nuvem; (4) aviso de RAM (placa pequena usa a RAM como apoio; 24 GB é o confortável) e preço
  de referência do aluguel de placa de 24 GB (US$ 0,34–0,89/h, conferido em 20/11/2026). teste_3d_plano.py +5 checagens (0 falhas).
  sw v158.
- 20/11/2026 19:50 · Claude (dono mandou pixabay.com/pt/3d-models: "isso ajuda em alguma coisa?"): SIM — e entrou no PLANO DO PROJETO como
  "MODELOS PRONTOS E GRÁTIS (pulam a IA)" em todo projeto menos o logo: Pixabay 3D (sem direitos de autor, atribuição não exigida, pode
  modificar — licença conferida em 20/11/2026), Mixamo (esqueleto e animações de graça) e Poly Haven/Sketchfab/Quaternius (licença por
  arquivo). O caminho de todo projeto que pedia IA agora começa por "atalho que pula a IA: começar de um modelo pronto". A REGRA DA LICENÇA
  aparece junto, em uma linha: o modelo entra no SEU trabalho; o que não pode é revender o arquivo como veio, nem usar modelo com marca
  registrada ou rosto de pessoa real em peça comercial. Vale para a máquina do dono: a 3050 6 GB não gera no nível do Tripo, mas ABRE e
  trabalha em cima de qualquer GLB/OBJ/STL pronto. Vigia: lista branca dos 3 endereços no bw3d-plano.js. teste_3d_plano.py +2 (0 falhas). sw v159.
- 20/11/2026 20:05 · Claude (dono conferiu o veredito da RTX 3050 6 GB: "ESTÁ CORRETO"): o app BW passa a responder a PLACA DE VERDADE.
  Nova ação `maquina` na ponte do app (motor/app.mjs, em DO_SITE e LIVRES): nvidia-smi → nome + memória; sem ele, PowerShell
  Get-CimInstance Win32_VideoController; no Mac, system_profiler; mais núcleos e RAM. Só leitura, nada é enviado. No site,
  BW3DPlano.doApp() pergunta ao app quando a página roda dentro dele, guarda em ui_3d_maquina e redesenha o plano — dentro do app o
  usuário não escolhe nada e o resumo diz "Placa (lida pelo app BW)". Fora do app continua a leitura do navegador + os dois seletores.
  teste_3d_plano.py +3 checagens (ponte simulada com a placa do dono) e teste-app +1 (0 falhas); vigia ✅. App BW 1.9.5 (pacote, cópia sem
  internet e novidades publicadas) e manual atualizado. BW-Setup.exe continua o 1.9.1 — quem já tem o app atualiza sozinho. sw v160.
- 20/11/2026 21:55 · Claude (dono: "FAÇA" — a decisão aberta era instalar o gerador 3D no PC): GERADOR 3D NO MEU PC (app BW 1.9.6,
  motor/gerador3d.mjs + app/gerador3d.html). Cartão novo na tela do app e botão no PLANO DO PROJETO do Estúdio 3D (só dentro do app).
  A tela mostra A SUA MÁQUINA (placa, VRAM, CUDA, RAM, disco, Python, Git) com o que falta em vermelho e os avisos em âmbar, a LICENÇA do
  modelo (Tencent Hunyuan Community — o autor não libera o uso na União Europeia) com aceite obrigatório, e instala em 9 ETAPAS com barra,
  lista e log de verdade: pastas → venv → PyTorch CUDA → código (git clone Tencent-Hunyuan/Hunyuan3D-2) → requirements → pip install -e . →
  modelo tencent/Hunyuan3D-2mini (subpasta hunyuan3d-dit-v2-mini) → gerar.py → teste de prova. Retoma de onde parou, REMOVER apaga tudo.
  Depois disso: foto → malha GLB na placa do usuário, sem internet, sem pagar por peça (só a FORMA; textura pede 16 GB ou nuvem). Tudo em
  ~/.bw-reels/3d; a ponte só deixa a plataforma pedir estado/gerar (instalar e remover só das telas do app) e abrirPasta recusa qualquer
  caminho fora do gerador. Novo motor/teste-gerador3d.mjs (18 checagens com comandos SIMULADOS: etapas em ordem, retomada, roteiro apontando
  para o modelo certo e sem rede, erro claro, remoção) 0 falhas; teste-app +4 e teste_3d_plano +3 (0 falhas); vigia ✅. Manual atualizado.
  NÃO testado de verdade: só roda em Windows/Linux com placa NVIDIA — o primeiro INSTALAR no PC do dono é o teste real. sw v161.
- 20/11/2026 22:40 · Claude (dono mandou print do Estúdio 3D no navegador: o modo O QUE VOU FAZER? estava escolhido mas o painel mostrava
  "O MODELO / CENA E CÂMERA / SALVAR E EXPORTAR"): o plano era desenhado DENTRO da primeira caixa dobrável do painel (data-seta="d3obj",
  título "O MODELO") — como ele já tinha fechado essa seta usando o MODELO 3D, o modo abria aparentemente vazio. Agora, no modo plano, a
  caixa não tem seta (não fecha) e o título é "O QUE VOU FAZER?". teste_3d_plano.py +3 checagens com is_visible() e com a seta fechada de
  propósito antes de recarregar (0 falhas). sw v162. PENTE FINO 131.
- 20/11/2026 23:05 · Claude (dono abriu o GERADOR 3D NO MEU PC e a tela acusou "Python: não achei / Git: não achei"; depois instalou e caiu no
  Python 3.15): app BW 1.9.7. (1) Cartão **FALTA INSTALAR NO WINDOWS** na tela do gerador, com **⬇ INSTALAR O QUE FALTA** → `winget install`
  do Python e do Git (ações g3dBasicos/g3dInstalarBasicos, só das telas do app; fora do Windows ou sem winget, mostra os sites). (2) O app
  acha o Python mesmo FORA do PATH (%LOCALAPPDATA%\Programs\Python, Program Files, C:\, py.exe do Windows) e o Git em Program Files\Git —
  usa o caminho inteiro no venv e no clone. (3) FAIXA de versão (PY_FAIXA 3.10–3.13, indicado 3.12): o 3.15 que o dono instalou é recusado
  ANTES de baixar, com o motivo (no Windows não há torch+torchvision com CUDA para ele — conferido nas notas do PyTorch 2.13/2.15 em 20/11)
  e dizendo que o 3.12 pode ficar junto; havendo várias, escolhe a mais nova dentro da faixa. (4) GERAR-INSTALADOR.bat ignora
  "IA ARQUIVOS EXE"/downloads-externos e *.exe/*.msi — o dono guardou os dois instaladores dentro da pasta do Studio e eles entrariam no
  BW-Setup.exe (+100 MB). Decidido: não hospedar Python/Git no site (versão velha, peso, licença de terceiros). teste-gerador3d.mjs +13 e
  teste-app.mjs +8 checagens (0 falhas; a tela é conferida com is_visible, regra 131); vigia ✅. Manual 54 p. (página do plano 3D).
  BW-Setup.exe continua o 1.9.2 — quem já tem o app atualiza sozinho. PENTE FINO 132–133.
  23:10 (mesma versão, pacote refeito): o dono não achou o arquivo certo no python.org (a página baixa a versão nova) e instalou o
  Python da MICROSOFT STORE. Agora o cartão mostra o LINK DIRETO do arquivo exato (python-3.12.10-amd64.exe, conferido na página oficial
  hoje) ao lado do botão automático, e o app RECUSA a versão da Store pelo caminho real do interpretador, dizendo como desinstalar.
  teste-gerador3d.mjs +6 checagens. PENTE FINO 132b.
- 20/11/2026 23:30 · Claude (dono, testando o Estúdio 3D no site: "fiz uma LOGO 3D e a parte traseira não fazia, ficava liso" + "o vídeo
  gerado fica só girando; como utilizar da maneira correta?"): os dois eram limitação do código. (1) LOGO — chip **ARTE DOS DOIS LADOS**
  (ligado por padrão): de trás a arte volta, espelhada no espaço do objeto para sair LEGÍVEL, um tom mais escura (letreiro de dois lados);
  desligado, traseira lisa como antes. Novo `sombrear()` com canvas próprio cacheado. (2) VÍDEO — o giro de 360° virou **MOVIMENTO**:
  VAI E VOLTA (±35°, recomendado para logo, fecha em loop), CHEGANDO, REVELAR, MEIA VOLTA, GIRO COMPLETO e PARADO, com entrada e saída
  suaves; seletor no painel CENA e na folha GERAR VÍDEO, cada um com uma linha dizendo para que serve e o aviso de que girar uma logo
  mostra a traseira metade do tempo. Bug achado pelo teste: nos movimentos de uma vez só o ÚLTIMO quadro voltava ao primeiro (`t % seg`
  zera quando t = seg) → campo `laco`. Outro: o medidor de pixel do teste usava as "4 cores mais comuns" e não distinguia relevo de face
  chapada (regra 126 de novo) → medidor que varre a tela inteira. teste_3d.py +9 checagens × 1280/390 (0 falhas); 3d_plano, 3d_foto,
  motion, telas 0 falhas; vigia ✅. bw3d-motor v4, bw3d.js v9, sw v163. PENTE FINO 134–136.
- 20/11/2026 23:45 · Claude (dono instalou de verdade: 8 das 9 etapas passaram em ~20 min e a última, o teste de prova, falhou):
  app BW **1.9.8**. O log mostrou "Missing key(s) … main_image_encoder.model.encoder.layer.39…" — não era placa nem memória: o
  `snapshot_download` trazia só `hunyuan3d-dit-v2-mini/*` e o repo tem SEIS pastas; faltou o **VAE** (`hunyuan3d-vae-v2-mini`), que é o que
  vira a malha. Correções: (1) o download traz DiT + VAE + os config.yaml; (2) o gerar.py tenta `use_safetensors=True` e, num erro de
  state_dict, repete com o `.ckpt`; (3) teste de prova que falha faz o ↻ TENTAR DE NOVO refazer modelo e roteiro (download incremental, não
  repete os 7,6 GB já baixados); (4) a tela do instalador mostra o motivo da falha em faixa vermelha acima do log, com o conserto conhecido e
  ⧉ COPIAR O LOG. Confirmado no PC do dono que o resto funciona: venv, PyTorch cu124 **cp312** (a faixa de versão do Python estava certa),
  git clone, requirements, `pip install -e .` e os 7,6 GB do modelo. teste-gerador3d.mjs +5 checagens (0 falhas), teste-app 0, vigia ✅.
  PENTE FINO 137–138.

- 20/11/2026 23:52 · Claude (dono mandou o log: ainda `Missing key(s) … main_image_encoder.model.encoder.layer.39…`; decisão dele: "AMANHÃ RESOLVEMOS. SÓ DEIXE REGISTRADO"):
  o conserto do VAE (1.9.8) FUNCIONOU — o download passou de 4 para 11 arquivos e o pipeline chegou a carregar
  (`Loading model from …\hunyuan3d-dit-v2-mini\model.fp16.safetensors`). O que falta agora é OUTRA coisa: a biblioteca
  **transformers 5.x**. Na versão 5 a atenção do DINOv2 foi reestruturada (q_proj/k_proj/v_proj) e o checkpoint do Hunyuan3D
  guarda os nomes antigos (attention.attention.query/key/value) → o `main_image_encoder` do conditioner não casa e o
  load_state_dict quebra. O repo do Tencent não fixa a versão, então o `pip install -e .` trouxe a 5.x. CONSERTO A FAZER
  (amanhã, com o dono): fixar `transformers<5` (e `tokenizers` compatível) na etapa dos requisitos do motor/gerador3d.mjs,
  refazer SÓ a etapa de requisitos + o teste de prova (o modelo de 7,6 GB já está no disco e não baixa de novo); plano B se
  ainda faltar chave: carregar o conditioner do `.ckpt` em vez do safetensors (o fallback já está no gerar.py mas o erro do
  transformers acontece ANTES, na montagem do modelo). Aprendido: versão de biblioteca de terceiros que o repo não fixa é
  armadilha — fixar no nosso venv, não confiar no `requirements.txt` do projeto.

- 21/11/2026 00:40 · Claude (dono: "TEM UM MONTE DE FERRAMENTAS DE MOTION, CRIAÇÕES 3D, LOGO, TELAS. SERIA POSSÍVEL UM AMBIENTE EM QUE PODEMOS TER
  TUDO ISSO NA MESMA FERRAMENTA E CADA CRIAÇÃO VOCE LEVA PARA A TIME LINE DE EDIÇÃO DE VÍDEO?" → escolheu TIMELINE NO CENTRO e TODAS AS
  FERRAMENTAS DE UMA VEZ): AMBIENTE ÚNICO. (1) Nova biblioteca `assets/bw-criacoes.js` (IndexedDB bw_criacoes): guarda a criação com capa
  feita no aparelho, a ferramenta de origem e o id do projeto; nada sai do aparelho (vigia 7.8f). (2) Botão ➜ MANDAR PARA A LINHA DO TEMPO
  ao lado de salvar no ESTÚDIO DE MOTION, TELAS EM MOVIMENTO, ESTÚDIO 3D (vídeo e PNG), CRIADOR IA, BW REELS PRO e ➜ LINHA DO TEMPO na aba
  SALVAR do EDITOR DE FOTOS — o botão é criado pelo próprio bw-criacoes.js ao lado do que já existia. (3) EDITOR DE VÍDEO virou o centro:
  caixa CRIAR PARA A LINHA DO TEMPO com os 7 atalhos (motion, telas, 3D, fotos, criador IA, reels, quadro), biblioteca mostrando de qual
  ferramenta cada criação veio e ✎ EDITAR que reabre o projeto na ferramenta de origem; o que volta TROCA NO LUGAR (clipe, cortes, efeitos e
  volume preservados). (4) As ferramentas abrem o projeto certo por ?p=ID e mostram sozinhas a barra "⟵ LINHA DO TEMPO". Bugs achados pelo
  teste: a criação entrava na linha do tempo mas não aparecia na biblioteca (faltava desenharLib); a barra de volta, injetada na .bw-shell
  (flex), virava coluna ao lado do menu e estourava a tela em 1280 px; o id "veFerr" que eu ia usar já era a barra de ferramentas do editor
  (regra 96 de novo) → veCriarLista. Teste novo docs/testes/teste_criacoes.py (24 checagens × 1280/390: guardar, entrar na linha do tempo,
  trocar no lugar sem perder efeito/volume, ✎ abrindo a ferramenta certa, barra de volta, nada para fora) 0 falhas; video, motion, telas, 3d,
  fotos e criador 0 falhas; vigia ✅. App BW 1.9.9 (cópia sem internet refeita com o site de hoje, novidades publicadas) e manual atualizado.
  NÃO testado: iPhone/Android reais e a conta do dono. BW-Setup.exe continua o 1.9.1 no site — quem já tem o app atualiza sozinho.
  bw-criacoes.js v1, video-editor.js v4, motion.js v5, telas.js v5, bw3d.js v10, fotos.js v15, criador.js v6, reels.js v17, sw v164. PENTE FINO 139-140.

- 21/11/2026 17:50 · Claude (dono: "vamos trabalhar no app?" — a pendência combinada era a última etapa do gerador 3D): APP BW 1.9.10.
  O teste de prova parava em `Missing key(s) … main_image_encoder…` por causa do **transformers 5.x** (a 5 reestruturou a atenção do DINOv2
  para q_proj/k_proj/v_proj e o checkpoint do Hunyuan3D guarda os nomes antigos). O repo do Tencent não fixa versão nenhuma, então o pip
  trouxe a mais nova. Correções em motor/gerador3d.mjs: (1) lista PINOS (hoje `transformers<5`, com o motivo escrito) aplicada no FIM da
  etapa `pacote`, depois do `pip install -e .`, que também pode subir a versão; (2) o TENTAR DE NOVO depois de um teste falho passa a refazer
  também o `pacote` (é onde os pinos moram) além de modelo e roteiro — sem rebaixar os 7,6 GB já no disco; (3) a tela do instalador reconhece
  esse erro na faixa vermelha e diz para tocar em ↻ TENTAR DE NOVO. teste-gerador3d.mjs +7 checagens (0 falhas; confere que o pino roda e que
  roda DEPOIS do -e .), teste-app 0 falhas, vigia ✅. Pacote e novidades publicados (aviso de atualização para quem está na 1.9.9); cópia sem
  internet refeita. NÃO testado de verdade: só roda em Windows com placa NVIDIA — o ↻ TENTAR DE NOVO no PC do dono é o teste. PENTE FINO 141.

- 21/11/2026 18:15 · Claude (dono tocou em TENTAR DE NOVO e o teste parou em `ImportError: cannot import name 'resolve_revision' from
  'huggingface_hub'`, com a faixa dizendo "a internet caiu"): APP BW 1.9.11. Dois erros meus. (1) Fixar só o transformers não basta:
  rebaixá-lo rebaixa o huggingface_hub, e o diffusers novo (que pede hub ≥ 1.23) deixa de importar — é o tropeço documentado para o
  Hunyuan3D, cuja receita é `transformers==4.46.3 diffusers==0.31.0`. PINOS agora é um GRUPO instalado NUM comando só (o pip resolve o
  conjunto), ainda no fim da etapa `pacote`. (2) A faixa vermelha anunciava erro de versão como falha de internet: o regex de rede tinha a
  palavra solta `resolve`, que casou com `resolve_revision`. Agora há regra própria para ImportError/cannot import name (diz que é versão e
  manda tocar em ↻ TENTAR DE NOVO) e a regra de rede só casa padrão de rede de verdade (ConnectionError, Max retries, Failed to resolve…).
  teste-gerador3d.mjs +6 checagens, inclusive uma que PEGA o regex da tela e prova que ele não classifica o erro de versão como internet
  (0 falhas); teste-app 0 falhas, vigia ✅. Pacote, novidades e cópia sem internet publicados. PENTE FINO 141 atualizada.

- 21/11/2026 · Claude (dono, analisando o CapCut instalado no PC dele e navegando nele como referência — nada do CapCut foi copiado: "faça como
  sugeriu", "faça tudo"): EDITOR DE VÍDEO no padrão de um editor profissional. (1) CHROMA KEY (assets/bw-chroma.js, WebGL + plano B 2D):
  liga e acha a cor do fundo sozinho pelas bordas; AUTOMÁTICO em 5 NÍVEIS (cada nível sobe intensidade, suavidade da borda, limpeza e sombra
  juntos; o app indica o nível pela variação do fundo) e MANUAL (intensidade, suavizar borda, limpar borda, sombra), 🎯 ESCOLHER NA TELA.
  (2) COR POR TAKE (assets/bw-cor.js): exposição, contraste, realces, sombras, brancos, pretos, brilho, temperatura, matiz, saturação, vibração,
  nitidez, desbotar e vinheta; 8 pontos de partida; ★ predefinições do aparelho; ⇉ APLICAR EM TODOS; dois toques zera a barra.
  (3) SOM: volume em dB, mudo, 🔊 NORMALIZAR (−16 dBFS sem passar de −1 dBFS), REDUZIR RUÍDO (leve/médio/forte), REALÇAR VOZ, 🎵 EXTRAIR ÁUDIO e
  FORMA DE ONDA nos takes. (4) MENU DO TAKE (botão direito / segurar): copiar e colar AJUSTES (Ctrl+Shift+C/V — só o que serve no outro take),
  cortar o começo/fim até a agulha (Q/W), desativar o take (Shift+E), cor, som. (5) Barra de corte compacta (desfazer, refazer, dividir, aparar,
  duplicar, apagar). (6) LAYOUT: prévia no centro (o layout antigo punha a prévia numa coluna de 290 px), camadas só com conteúdo, ✦ CRIAR
  guardado num botão, ▾ LINHA DO TEMPO recolhe, ⛶ tela grande, 🖥 PRÉVIA EM OUTRA TELA (janela para o 2º monitor). (7) MODO FOCO nas 8
  ferramentas de criação (sem menu nem topo, só ‹) e PAINÉIS LIVRES (esconder, esticar, descolar e mover) no vídeo, motion, telas, 3D e fotos.
  Testes novos: teste_chroma (40), teste_cor (66), teste_som (34), teste_video_layout (99), teste_paineis (43), teste_fotos_paineis (13) — 0 falhas;
  a bateria inteira rodada. NÃO testado: filmagem real de verde (calibrar os níveis), dois monitores de verdade, iPhone/Android reais.
  layout.js v65, bw-ferramentas v2, video-editor v6, fotos v16, motion v6, telas v6, bw3d v11, bw-chroma v1, bw-cor v1, sw v165. PENTE FINO 142–148.

- 21/11/2026 23:30 · Claude (dono: "máscara como a do CapCut/Evoto, texto atrás da pessoa, modelos prontos de aftermovie, duas telas"): EDITOR DE VÍDEO —
  (1) PESSOA E FUNDO (IA) por take (assets/bw-mascara.js, MediaPipe Selfie Multiclass no aparelho, CPU): 🧠 ANALISAR acha a pessoa quadro a quadro (a
  máscara segue a pessoa — é o "traquear"), guarda no IndexedDB bw_mascaras; PESSOA NA FRENTE (texto e camadas passam por TRÁS dela), fundo desfocado/
  P&B/escuro/claro/cor/sem fundo, contorno de luz. Textos ganharam MOVIMENTO (subir, descer, zoom, pulsar, letreiro, máquina de escrever e ANEL girando em
  volta da pessoa, metade atrás e metade na frente). (2) 🎬 MODELOS (assets/ve-modelos.js): 12 EDIÇÕES PRONTAS (aftermovie 30/60 s, corporativo, reels,
  casamento, show, contagem, antes/depois, depoimento, top 3, telão, abertura com o nome atrás da pessoa) com prévia animada, espaços TAKE N para trocar
  pelos takes, ⚡ PREENCHER SOZINHO, campos de texto e trilha da casa; 9 modelos COM A PESSOA; MEUS MODELOS (salvar o projeto, exportar/importar .json).
  (3) DUAS TELAS: 🖥 abre a prévia já no outro monitor (Window Management API, quando o navegador deixa) e as teclas lá comandam o editor; 📱 CONTROLE PELO
  CELULAR (assets/bw-controle.js + controle.html): QR/código de 6 letras, o celular toca/pausa/anda/corta/desfaz — vai só o comando e o tempo pelo canal de
  aviso do Supabase Realtime (nada gravado, vídeo não sai do PC; vigia 7.8g). Testes novos teste_mascara e teste_controle (0 falhas × 1280/390) + bateria
  do editor 0 falhas; vigia ✅. NÃO testado: o modelo real do MediaPipe (testar no ar), dois monitores e o celular de verdade. video-editor v7, sw v166.

- 22/11/2026 00:10 · Claude (dono testou no PC e pediu 4 ajustes): EDITOR DE VÍDEO — (1) take arrastado EM CIMA de outro cria uma CAMADA NOVA na hora
  (vídeo, texto e som; também arrastando da biblioteca); (2) RODINHA em cima da prévia = zoom só da vista (selo 🔍 volta a 100%; mão/botão do meio
  arrasta) e CLICAR na prévia abre as opções (zoom, desafixar, 2º monitor, tela cheia, salvar quadro, centralizar o take); (3) Alt + rodinha em cima
  da camada = mais alta/mais baixa até 22 px (Ctrl + rodinha segue no tempo); (4) abas ◧ TRANSIÇÕES e ✦ EFEITOS na mídia com prévia animada,
  aplicadas por ARRASTO até o take ou a emenda ◆, emenda marcada com o nome, tempo por arrasto no ◆ e na alça da própria camada, toque no ◆ abre
  a lista e os tempos. teste_video_arrastar.py (mouse e toque de verdade) 0 falhas + bateria do editor 0 falhas; vigia ✅. App BW 1.9.13 (pacote,
  cópia sem internet, tutorial, novidades) e manual 55 → 56 p. ("Pessoa, modelos e duas telas"). video-editor v8, sw v167. PENTE FINO 149–151.

- 22/11/2026 00:55 · Claude (dono, com 6 prints do CapCut do celular: "o nosso é muito grosseiro… cada ferramenta rolar para o lado… segurar abre as
  opções, clicar altera as ferramentas aplicadas ao vídeo/áudio… aprenda com este layout, mantendo as facilidades"): EDITOR DE VÍDEO com cara de APP
  no celular e no tablet (assets/ve-app.js + ve-app.css): topo fino (‹, formato, MODELOS, ⋯, Exportar), prévia grande, ▶ no meio, linha do tempo fina
  com a agulha parada no meio (o dedo arrasta o tempo, pinça aproxima, miniaturas nos takes, ＋ para mídia), faixa de ferramentas que rola para o lado
  e muda com o toque (projeto · vídeo/foto · texto · som; submenus Áudio e Texto; Trocar pelo meu take nos modelos), folhas que sobem de baixo com só
  o ajuste escolhido, segurar o dedo no take = opções. Tudo o que já existia continua (é o mesmo motor). PC sem mudança. 23:40: opção "layout clássico" tirada (dono: "deixe um só").
  Novo docs/testes/teste_video_app.py (toque de verdade, 390 e 820 px + PC) 0 falhas; bateria do editor 0 falhas; vigia ✅ (7.8h). App BW 1.9.14,
  manual 56 → 57 p. ("Editor de vídeo no celular"). video-editor v9, ve-app v1, sw v168. PENTE FINO 152–153.

- 22/11/2026 00:30 · Claude (dono: "tela principal do app tecnológica e moderna, com o vídeo de referência animado reagindo ao mouse, BRIGHTWAY SEU
  SOFTWARE INTELIGENTE"; "tire as opções que só fazem sentido na web"; "cara de software"; "tudo em tela cheia, sem o menu lateral igual web, o menu
  fica sempre omisso"; "preto e branco passa a ser o padrão"; "tire POR ONDE VOCÊ QUER ENTRAR e o Boa noite"; "na primeira página um botão ENTRAR
  que leva à página do robô em tela cheia"; referência = mãos humana e de robô se tocam, a luz surge e nasce o mundo em rede):
  APP BW 1.9.16 — abertura em tela cheia (canvas próprio: dois feixes quente/frio se encontram, clarão, nasce o globo de pontos com os continentes,
  nós dourados com arcos e sinais correndo, anéis, mostrador e as palavras IA/VÍDEO/GESTÃO/3D… em volta; reage ao mouse; clique repete o toque;
  ciclo de 14 s), letreiro discreto com a mesma textura, ENTRAR no centro → página do robô; ferramentas do PC em #pc com barra de título, menu em
  gaveta (☰/Ctrl+M), busca Ctrl+K, ⛶ tela cheia e barra de status com a placa; janela maximizada; app/abertura.mp4 (vídeo do dono) toca 1 vez e
  passa para o canvas. PLATAFORMA — dentro do app (html.bw-no-app) menu sempre escondido e sem APP DOWNLOAD/instalar no celular (classe so-web);
  Início: "Por onde você quer entrar?" → BRIGHTWAY · SEU SOFTWARE INTELIGENTE e "Boa noite. Seu caminho de hoje." → frases da marca que se
  revezam ("Seu caminho certo, com as ferramentas certas." e mais 7); PRETO E BRANCO é o modo padrão. teste-app.mjs 107 ✓, teste_modos/ambientes/
  layout/agenda/lancamentos 0 falhas, vigia ✅, manual 57 p. O vídeo do Pinterest NÃO foi usado (link não abre aqui e é de terceiros). brightway.css v33,
  layout.js v66, modos.js v6, portal.js v3, sw v170. PENTE FINO 154–157.

- 22/11/2026 00:40 · Claude (dono mandou o vídeo dele — mão humana toca mão de robô, a luz nasce e o mundo vira cérebro de luz — e pediu "duas opções
  para escolha": vídeo, ou foto com a animação no mundo): APP BW 1.9.17 — chave ABERTURA (VÍDEO | FOTO + MUNDO, ui_app_abertura, por PC).
  VÍDEO: app/abertura.mp4 (o vídeo do dono, sem som) toca 1 vez por sessão e passa para app/abertura-loop.mp4 (o fim indo e voltando, sem emenda);
  por cima, faíscas que seguem o mouse e clarão no toque dos dedos. FOTO + MUNDO: quadro do mesmo vídeo (app/abertura-foto.jpg) com a rede animada
  alinhada ao mundo da foto (conta do object-fit:cover) e faísca entre os dedos. Letreiro e ENTRAR no azul do vídeo. As fotos do Pinterest NÃO
  foram usadas (de terceiros). teste-app 107 ✓ (o Chromium do teste não toca H.264: o caminho de vídeo foi conferido com cópias VP9).
- 22/11/2026 00:50 · Claude (dono: "faça uma versão mais branco e cinza e as conexões passando amarelo e azul"): APP BW 1.9.18 — 3ª opção na chave
  ABERTURA: MUNDO (o mundo desenhado em canvas sobre fundo branco e cinza; arcos cinza e sinais com rastro em amarelo #F2B200 e azul #1880FF;
  feixes amarelo/azul no toque; letreiro cinza com brilho amarelo-azul; html .nucleo.claro). No fundo claro a soma de luz ('lighter') some:
  o modo claro desenha com 'source-over'. teste-app 107 ✓.
- 22/11/2026 00:40 · Claude (dono mandou uma imagem dele em alta — mãos humana e de robô, cérebro de luz no centro): APP BW 1.9.19 — app/abertura-foto.jpg
  trocada por ela (2730×1536) e FOTO + MUNDO virou a abertura padrão; a animação (anéis, rede com sinais, faísca no toque, partículas) se alinha
  ao cérebro pela conta do object-fit:cover usando o tamanho real da imagem. Paleta da animação ciano/lilás para combinar com a imagem.
- 22/11/2026 01:00 · Claude (dono: "aprenda com os cursos" da Adapta, conta dele): lidos os resumos em texto de ~240 aulas (157 com texto) dos
  cursos Maestro, Adapta ONE, Assistentes, Vídeo, Imagem, Automação, Marketing, Vendas, Conteúdo e Masterizando IA. Método e frameworks
  (tarefa → skill → automação; 4Is; expert de 8 partes; memória em 2 camadas; 2P2C; ordem do vídeo com IA) + lista de ideias para a Brightway
  em docs/APRENDIZADOS-ADAPTA.md (com palavras próprias). Nada foi alterado na conta do dono (só fechei pesquisa de nota e convite do WhatsApp).
- 22/11/2026 01:20 · Claude (dono: "FAÇA ISSO / COMECE O TRABALHO", com "pode tudo"): BW SMART + CAIXA ÚNICA DO TIO CLÁUDIO. (1) Edge Function bw-ia
  republicada pelo painel (SHA 5ff8e4f2…, conferido antes e depois): níveis RÁPIDO e INTELIGENTE, cada um com reserva automática; testada no ar logado (rápido
  20b 3,5 s; inteligente 120b 1,6 s). (2) Página do robô: caixa de pedido abaixo das telas — ＋ anexar (leitor, fotos, Prompt IA, planilha), ⚡ atalhos (gerar
  arte/reel/orçamento/personagem, lançar gasto/recebi/conta/lembrete, como está meu dia), chip BW Smart / Rápido / Inteligente (no aparelho), ✨ varinha
  (melhora o pedido pelos 4Is, sem inventar, com ↺), 🎙 falar e ➤ (Enter) para o Tio Cláudio, que continua só lançando com ✓ LANÇAR. A linha embaixo diz qual
  modelo respondeu e quando foi a reserva. Tio Cláudio manda o nível em todo pedido. (3) EDITOR DE VÍDEO (pedido do dono no meio): take arrastado em cima de
  outro mostra ⇄ TROCAR DE LUGAR / ⬆ PARA CIMA; subir cria a camada na hora. (4) APP BW 1.9.20: a abertura VÍDEO saiu (ficam FOTO + MUNDO e MUNDO).
  Testes: teste_pede (novo, 0 falhas × 1280/390), teste_video_arrastar (+7), ambientes, modos, layout, agente_leitor, video, video_app, video_layout, lancamentos,
  agenda 0 falhas; vigia ✅; manual 57 p. brightway.css v34, layout.js v67, bw-agente v24, bw-pede v1, sw v171. PENTE FINO 158–159.
- 22/11/2026 02:05 · Claude (dono, 01:14: "aplique as mesmas ferramentas e funcionalidades do editor de vídeo no estúdio de motion"): ESTÚDIO DE MOTION —
  galeria EFEITOS (prévia ao passar o mouse; arrastar até a barra: esquerda = entrada, direita = saída; ou até o item na tela; tocar aplica no escolhido),
  camadas com ⬆ PARA CIMA (na hora) / ⇄ TROCAR DE LUGAR, Alt + rodinha (altura), rodinha na prévia = zoom da vista + 🔍 % ✕ (F volta), clique na prévia =
  opções, COR por item (8 looks + 7 barras, ⇉ aplicar em todos; vale na prévia, no vídeo do aparelho e no render do PC), Q/W, Shift+E (desativar),
  Ctrl+Shift+C/V (ajustes), 🖥 prévia no 2º monitor e 📱 controle pelo celular. Varinha do Tio Cláudio escreve em frase natural (sem "Objetivo:").
  Testes: teste_motion_ferramentas (novo, 0 falhas × 1280/390), teste_motion, paineis, criacoes, pede 0 falhas; vigia ✅. App BW 1.9.21 (motor igual).
  motion.js v7, motion-motor v3, bw-agente v25, layout.js v68, sw v172. PENTE FINO 160. Fica para depois: layout de app no celular (como o do editor de vídeo).
- 22/11/2026 02:10 · Claude (dono, prints do celular): página do robô no celular sem o topo (título/selo/botões) e sem a frase/data — só o robô
  com as telas, a caixa do Tio Cláudio e as abas de baixo; menus da caixa (＋, ⚡, BW Smart) abrem PARA CIMA; saiu o botão ENTRAR EM … — um
  toque na tela já entra; o Tio Cláudio se arrasta (segurar e arrastar, lugar lembrado no aparelho). bw-agente v26, bw-pede v2, portal v4,
  layout.js v69, sw v173. Testes: teste_agente_arrastar (20), teste_pede, teste_ambientes, teste_layout 0 falhas; vigia ✅.
  App BW do PC: abre a plataforma pela rede, então já recebe; .exe/pacote novo NÃO gerado (fica em Pendências com a próxima versão do app).

- 22/11/2026 02:40 · Claude (dono: "bugs no editor de vídeo ao adicionar mídia; trocar o clique na prévia por três pontinhos discretos no alto; ao rolar as
  ferramentas a tela se mexe como bloco — deixe parada e só as ferramentas rolarem" + "faça tudo"): EDITOR DE VÍDEO — arquivo que o navegador não abre
  (HEVC/HEIC) fica com ⚠ NÃO ABRE AQUI e aviso explicando; importar vários mostra o progresso; no celular tocar num item ou som põe na linha do tempo,
  FECHA a folha e avisa onde entrou; cada ação de botão é um passo próprio do desfazer. PRÉVIA: ⋯ discretos no alto (vídeo e Motion), clique não abre menu.
  TELA PARADA: editores não deixam a rolagem das faixas vazar para a página. Testes: teste_video_midia (novo) + 14 da bateria 0 falhas; vigia ✅.
  App BW 1.9.22. video-editor v10, ve-app.css v2, motion.js v8, layout.js v70, sw v174. PENTE FINO 162–164. (Juntado com a sessão paralela das 02:10, que também tinha usado layout v69/sw v173.)
- 22/11/2026 07:40 · Claude (dono: "faça como for melhor, peça as permissões" — liberou publicar site + app e gerar o .exe no PC): ESTÚDIO DE MOTION com
  cara de APP no celular e no tablet (assets/mo-app.js + mo-app.css, igual ao editor de vídeo): topo fino, prévia grande, ▶ no meio, linha do tempo com
  a agulha parada no meio (rolar = andar; pinça = zoom), faixa de ferramentas que rola para o lado e muda com o item tocado, folhas com UMA seção,
  segurar o dedo = opções, "⟵ Linha do tempo" à vista. Bug achado: o DESFAZER do Motion e das Telas precisava de dois toques (o salvar mudava o
  carimbo do projeto) → corrigido. Teste novo docs/testes/teste_motion_app.py (toque real, 390/820/1280) 0 falhas; motion, motion_ferramentas,
  criacoes, paineis 0 falhas; vigia ✅ (7.8i). Manual 57 → 58 p. motion.js v9, telas.js v7, mo-app v1, sw v175. PENTE FINO 165–166.
- 22/11/2026 08:00 · Claude (parte 2 do mesmo pedido): TELAS EM MOVIMENTO e ESTÚDIO 3D com as ferramentas da prévia do editor de vídeo — novo
  BWFerr.previa (bw-ferramentas.js v3, comum): ⋯ discreto no alto da prévia (extras da ferramenta + vista + tocar + 2º monitor ao vivo por
  captureStream + tela cheia + salvar quadro PNG + controle pelo celular). Telas: rodinha = zoom só da vista (selo 🔍 volta a 100%), "Cena na agulha"
  com as opções da cena. 3D: a rodinha continua sendo o zoom da câmera; ⋯ com ângulos, girar, PNG e gerar vídeo. Teste novo
  docs/testes/teste_previa_ferramentas.py (popup, PNG baixado de verdade, celular anda o tempo) 0 falhas; telas, 3d, 3d_plano, 3d_foto 0 falhas.
  APP BW 1.9.23 (cópia sem internet de hoje, tutorial, novidades) publicado. Manual 58 p. telas.js v8, bw3d.js v12, sw v176.
- 22/11/2026 08:40 · Claude (dono: "a tela descola para o lado ao rolar as ferramentas — ache o porquê; setinhas ‹ ›"; "segurar abre opções e atrapalha
  o arraste"; "o menu da caixa do Tio Cláudio fica atrás"): causa do descolar = elástico da rolagem nativa nas pontas → faixa de ferramentas e linha do
  tempo do editor de vídeo e do Motion com rolagem própria presa nas pontas (BWFerr.faixaFirme) + setinhas ‹ › discretas; no toque, segurar não abre
  mais menu — segurar e arrastar pega o take/barra (opções no ⋯ MAIS); Telas também sem menu ao segurar. Menu da caixa do Tio Cláudio vai para a frente
  de tudo. Testes video_app, motion_app, pede 0 falhas. brightway.css v35, bw-pede v3, bw-ferramentas v4, video-editor v11, ve-app v3, motion v10,
  mo-app v2, telas v9, sw v177. PENTE FINO 167–169.
  08:55 (dono: "ao abrir o editor aparece a tela antiga por um instante"): decisão do layout no <head> + tela antiga escondida até o app montar (vídeo e
  Motion); Telas com ⋯ em cada cena/mídia. video, telas, video_app, motion_app 0 falhas. ve-app v4, mo-app v3, telas v10, sw v178. PENTE FINO 170.
## Pendências (dono)
- [x] (22/11 08:43) BW-Setup.exe 1.9.24 gerado pelo dono e publicado (8,3 MB, versão conferida dentro do .exe).
- [ ] (22/11) MOTION NO CELULAR + ⋯ NAS TELAS E NO 3D: dono testar o Motion no celular (tocar num item, folhas, segurar) e os ⋯ das Telas/3D no PC (2º monitor).
- [ ] (22/11) CAIXA DO TIO CLÁUDIO: dono testar no PC e no celular, logado — pedir algo pela caixa, trocar BW Smart / Rápido / Inteligente e usar a ✨ varinha.
- [ ] (22/11) ESTÚDIO DE MOTION: dono testar no PC — arrastar efeito até a barra, barra em cima de outra camada, COR, rodinha na prévia, 🖥 2º monitor e 📱 celular. Dizer se quer também o layout de app no celular.
- [ ] (22/11) ABERTURA DO APP: dono atualizar para 1.9.17 e escolher VÍDEO, FOTO + MUNDO ou MUNDO (chave no alto); conferir o ENTRAR e o menu escondido. BW-Setup.exe 1.9.16 depende do PC (o do site atualiza sozinho).
- [ ] (22/11) EDITOR NO CELULAR: dono abrir o editor de vídeo no celular e dizer o que ainda falta para ficar como o CapCut (tempo do "segurar"
      hoje é ~0,5 s — pediu 2 s: confirmar se quer mesmo mais longo). BW-Setup.exe 1.9.14 depende do PC (o 1.9.12 do site atualiza sozinho).
- [ ] (22/11) BW-Setup.exe 1.9.13: os arquivos novos já estão em Vídeos\bw-reels-studio, mas o gerador não abriu pelo clique remoto (3 tentativas,
      nenhuma janela). Dono: dois cliques em "5 - GERAR INSTALADOR EXE" e avisar o Claude, que traz o .exe. Quem já tem o app atualiza sozinho para a 1.9.13.
- [ ] (22/11) AJUSTES DO EDITOR: dono testar no PC — arrastar take em cima de outro, rodinha e clique na prévia, Alt + rodinha na camada e as abas
      ◧ TRANSIÇÕES / ✦ EFEITOS arrastando até a emenda ◆.
- [ ] (21/11) MÁSCARA E MODELOS: dono abrir o editor de vídeo no PC, pôr um take com uma pessoa, 🧠 ANALISAR e testar o texto atrás dela e o ANEL; abrir
      🎬 MODELOS, escolher um aftermovie e trocar os espaços pelos takes dele. DUAS TELAS: testar o 🖥 com o segundo monitor e o 📱 com o celular.
- [ ] (21/11) EDITOR DE VÍDEO NOVO: dono abrir no PC e no celular; testar o CHROMA com uma filmagem REAL de fundo verde (dizer em que nível
      ficou bom, para calibrar os níveis), a COR (um look + ajuste fino + APLICAR EM TODOS), o SOM (normalizar e reduzir ruído numa fala real),
      o botão direito no take, esconder/descolar os painéis e a 🖥 PRÉVIA EM OUTRA TELA no segundo monitor.
- [ ] (21/11) AMBIENTE ÚNICO: dono abrir o EDITOR DE VÍDEO (Marketing → Editor de vídeo), tocar num atalho da caixa CRIAR, fazer uma peça
      (ex.: um motion curto ou uma logo 3D), mandar para a linha do tempo, juntar com uma filmagem dele e exportar. Depois tocar no ✎ de uma
      criação, mudar algo na ferramenta e ver se trocou no lugar sem desfazer a edição. Dizer se falta alguma ferramenta nessa caixa.
- [ ] (21/11) GERADOR 3D — FALTA SÓ ISSO: dono abrir o BW, tocar em ATUALIZAR (1.9.11), abrir GERADOR 3D NO MEU PC e tocar em
      ↻ TENTAR DE NOVO. O conserto (transformers 4.46.3 + diffusers 0.31.0 juntos) já está no app; ele refaz pacote + modelo + roteiro + teste (minutos, sem rebaixar os
      7,6 GB). Depois tocar em 🧊 GERAR UMA PEÇA DE PROVA e mandar o resultado (ou o erro + ⧉ COPIAR O LOG). Aqui não há placa NVIDIA, então
      os comandos só foram testados simulados.
- [ ] (20/11) GERADOR 3D NO MEU PC — É O TESTE REAL: dono atualizar o BW (aviso de 1.9.6), abrir o cartão GERADOR 3D NO MEU PC, conferir a
      ficha da máquina, aceitar a licença e tocar em INSTALAR. Demora (baixa ~6 GB) e ele retoma se parar. No fim, tocar em GERAR UMA PEÇA DE
      PROVA e mandar o resultado (ou o erro e o log) — aqui não há placa NVIDIA, então os comandos só foram testados simulados. Se faltar Python
      ou Git, a própria tela diz onde baixar — e a partir da 1.9.7 há o botão ⬇ INSTALAR O QUE FALTA. ATENÇÃO: Python 3.12 (o 3.15 é
      recusado: no Windows ainda não há torch+torchvision com CUDA para ele).
- [ ] (20/11) ESTÚDIO 3D: dono abrir em Marketing → Estúdio 3D no PC e no celular; testar com um modelo 3D de verdade (GLB), com a logo da BW
      (LOGO 3D → fundo transparente → PNG) e montar a maquete de um evento real (painéis, pitch) → conferir se a RESOLUÇÃO EM PIXELS bate com
      a do fornecedor do telão, gerar a PLANTA EM PDF e um vídeo do giro. Dizer o que falta (mais itens de palco? medidas em pés? treliça por metro?).
- [ ] (20/11) BW-Setup.exe 1.9.3: o pacote e a atualização automática já estão no ar (quem tem o app a partir da 1.4 atualiza sozinho); só o
      instalador novo depende do PC do dono — dois cliques em "5 - GERAR INSTALADOR EXE" (Vídeos\\bw-reels-studio, com os arquivos da 1.9.3) e
      avisar o Claude, que traz o .exe e publica. Conferir no PC e no celular as letras novas dos modos de JOGOS.
- [ ] (20/11) APP BW 1.9: dono abrir o BW no PC, tocar em ATUALIZAR quando o aviso aparecer e conferir MINHA EMPRESA, MINHA CASA e APARÊNCIA; fechar as
      janelas pretas do gerador do instalador que ficaram abertas ("Pressione qualquer tecla").
- [ ] (20/11) MODOS: dono testar no PC e no celular (engrenagem → APARÊNCIA), dizer quais modos ficam, o que ajustar em cada um e mandar a logo/manual
      da marca para o teste do MINHA MARCA. (Decidido 20/11: a escolha fica por aparelho, não vai para a conta.) Claude: clarear as demais
      ferramentas página por página, ler manual em PDF, pôr a logo da marca no menu.
- [ ] (20/11) AMBIENTES: dono conferir na conta dele se cada lançamento antigo caiu no lugar certo (LANÇAMENTOS PJ × PF) e se as tarefas antigas da
      agenda foram para a agenda certa (Pessoal/Casa/Saúde = casa; o resto = empresa). Decidir: INVESTIMENTOS fica em MINHA CASA? o sino de AVISOS
      deve separar empresa e casa? (Manual e pacote 1.9 do app BW: FEITOS 20/11 14:20.)
- [ ] (20/11) FERRAMENTAS/ATALHOS e TELA FIXA: dono testar no PC (V, C, H, Z, T, Delete, botão direito) e no celular (segurar o dedo; prévia presa no topo) nos 4 editores; dizer se quer a tela fixa também no BW Reels Pro/Criador (já têm prévia presa) com o mesmo jeito.
- [ ] (20/11) TELAS: dono testar o arrastar no PC e no celular e gerar um vídeo 1450×2000 para o telão.
- [ ] (20/11) TELAS EM MOVIMENTO: dono abrir no ar com fotos e takes REAIS do celular + uma música, MONTAR SOZINHO e GERAR VÍDEO (no PC e no celular); dizer se os vídeos do iPhone abriram e quanto tempo levou.
- [ ] (20/11) ESTÚDIO DE MOTION: dono abrir no ar (Marketing → Estúdio de motion), montar algo, testar ✨ CRIAR EFEITO logado e GERAR NESTE APARELHO no celular; no PC, atualizar o BW para 1.6 e testar GERAR NO APP BW com fundo transparente.
- [ ] (20/11) RECORTE: dono atualizar para 1.5.2, tocar ATUALIZAR na skill ANIMAÇÃO POR CÓDIGO e testar o .mp4 verde no CapCut do celular (Chroma key) em cima de uma filmagem dele.
- [ ] (19/11) BW SKILL: dono atualizar o BW para a 1.5 (aviso no app), instalar o EDITOR DE VÍDEO pela BW SKILL apontando as pastas dele e dizer se ficou claro; validar a skill no Codex/Gemini quando quiser abrir para eles.
- [ ] (19/11) INSTALADOR 1.4: GERADO e publicado em 19/11 22:25 (com a preparação automática); dono instalar; a partir dela as atualizações chegam sozinhas. Antes: dono abrir Vídeos\\bw-reels-studio\\instalador\\BW-Setup.exe, avançar até o fim e abrir o ícone BW; dizer se instalou e abriu. Decidir sobre a licença comercial do Inno Setup.
- [ ] (19/11) PROMPT IA: dono cadastrar as primeiras trends (＋ NOVA TREND, com a imagem de exemplo) e testar ANALISAR com um print real.
- [ ] (19/11) PAINEL DA CASA: dono abrir Gestão de casa na conta dele e dizer se quer mais algum dado da casa ali (metas do orçamento, meta da reserva).
- [ ] (19/11) EVENTO DE VÁRIOS DIAS: dono editar um evento real, preencher "Termina em" e ver o risco na agenda (PC e celular).
- [ ] (19/11) CACHÊ nos LANÇAMENTOS: dono conferir se os cachês antigos aparecem com PAGO / NÃO PAGO certo e marcar um como pago (ver no dossiê do evento).
- [ ] (19/11) LANÇAMENTOS: dono conferir na conta dele se os lançamentos e os fixos antigos do Fluxo aparecem, e tocar em 📄 PDF DO MÊS (não deu para testar o PDF daqui).
- [ ] (18/11) LANÇAMENTOS: dono usar na conta dele (lançar um gasto, mudar de lugar, excluir um teste) e dizer se falta algum tipo de lançamento.
- [ ] (18/11) APLICATIVO 1.1: os arquivos novos foram para a pasta do PC; dono abrir pelo ícone BW Reels e conferir PERSONAGENS e EDITOR DE VÍDEO.
- [ ] (18/11) QUADRO: dono testar no ar, logado — arrastar bolinhas, ✨ PROMPT com 🎙 FALAR no PC e no celular (IA real e microfone de verdade).
- [ ] (18/11 09:02–09:07, pedidos do dono na fila) EDITOR DE FOTOS: FEITO 10:10 (dono testar no celular: pintar máscara com o dedo e segurar para
      ver o antes) · ÁREA DE PERSONAGENS: FEITA 10:50 (dono testar logado com a IA real) · EDITOR DE VÍDEO: FEITO 11:30 (dono testar com vídeos reais do celular e exportar) · CARA NOVA: FEITA 12:10 nas galerias e no aplicativo (dono dizer se quer a cor também em menus/topo).
- [ ] (18/11) IA DE VÍDEO: dono criar a chave na Runway ou na fal.ai, conectar em IA DE VÍDEO e gerar 1 clipe (é o primeiro teste real; custa
      ~US$ 0,25–0,42). Para funcionar também no celular/navegador a chave teria de ficar guardada no servidor (tabela + função novas) — só com o "sim" do dono.
- [ ] (18/11) SEM INTERNET: dono tocar em PREPARAR PARA USAR SEM INTERNET, desligar o Wi-Fi e abrir EDITOR DE FOTOS, PDF e ORÇAMENTOS.
- [ ] (18/11) INSTALADOR: dono rodar GERAR-INSTALADOR.bat e mandar o resultado (ou o erro). Layout: mandar os prints das referências do Pinterest.
- [ ] (18/11) APLICATIVO BW REELS: dono abrir o atalho "BW Reels" (rodar CRIAR-ATALHO.bat uma vez), ENTRAR com a conta, abrir o QUADRO,
      fazer um RENDERIZAR NO PC por dentro do app e testar LEGENDAS; dizer se o login pelo Google funcionou na janela.
- [x] (18/11, dono: "cada usuário escolhe a sua IA e conecta") IA DE VÍDEO CONECTADA: feita no aplicativo do PC com a chave do usuário guardada no PC dele.
- [x] (17/11 23:35, com o "sim" do dono) Função bw-ia-imagem publicada pelo painel (editor conferido por SHA-256: antes = versão antiga do repo,
      depois = versão nova). Teste no ar com 2 imagens de TESTE desenhadas (boneco de camisa verde + cenário roxo): 7,6 s, 576×1024,
      73% da imagem em tons do cenário de referência e 14% verde do personagem → a referência está sendo usada. Gastou 1 das 15 imagens do dia.
- [x] (17/11 23:25, dono colou chave nova; Claude testou no ar: bw-ia 200, Tio Cláudio v18 entendeu tarefa, gasto, pergunta e piada em ~1,5 s cada) IA BRIGHTWAY FORA DO AR: criar chave nova em console.groq.com → API Keys e colar em Supabase → Edge Functions →
      Secrets → GROQ_API_KEY (substituir). Depois avisar o Claude para testar o Tio Cláudio, o roteiro do Reels e a transcrição.
- [ ] (17/11) QUADRO DE HISTÓRIA: dono testar no ar, logado (EXEMPLO → foto → CRIAR IMAGENS → MONTAR O VÍDEO), no PC e no celular; decidir se
      vale ligar uma IA de vídeo paga (por chave do usuário) e mandar a imagem da referência junto (muda a função bw-ia-imagem).
- [ ] (17/11) LEGENDA OFFLINE: dono rodar INSTALAR-LEGENDAS.bat e arrastar um vídeo com fala para o LEGENDAR.bat; mandar o resultado (ou o erro).
- [ ] (17/11) BW REELS PRO: dono testar ENVIAR PARA O PC (celular logado → abrir o Reels no PC logado → "Chegou do celular").
- [ ] (17/11) BW REELS ASSISTENTE: dono abrir pelo BW-REELS-ASSISTENTE.bat no PC e fazer 1 vídeo em cada modo (ECONÔMICO com o Claude real).
- [ ] (17/11) BW IA: dono criar as chaves grátis (Groq, Gemini, OpenRouter) e colar em ⚙ Minhas IAs; testar INSTALAR IAS RECOMENDADAS no PC.
- [x] (17/11 16:46, dono: "perfeito, resolveu") MOBILE: GERAR VÍDEO NESTE APARELHO com som no iPhone e no Android.
- [ ] (17/11) MOBILE: conferir se o Instagram aceita o vídeo feito no celular; decidir sobre app de loja (App Store/Google Play).
- [ ] (17/11) Login obrigatório no Assistente/Studio: decidir quando ligar (precisa de Edge Function de ativação + botão ATIVAR NESTE PC no site).
- [ ] (17/11) BW REELS PRO › ANIMAR MEU PERSONAGEM: dono testar com a foto do avatar dele (recorte e cenas por IA, logado).
- [ ] (17/11) BW REELS PRO › 🎬 MODELOS: dono testar a galeria e um modelo de personagem no iPhone (vídeos de exemplo tocando) e mandar opinião.
- [ ] (17/11) BW REELS PRO: dono testar no ar — instalar o motor pelo ⚙ MOTOR NO PC, abrir o BW Reels Render e fazer um RENDERIZAR NO PC;
      conferir a IA real (ganchos/roteiro em JSON) logado.
- [x] (16/11 11:42) IA CRIATIVA ATIVA: conta Cloudflare do dono (Free, sem cartão), token "Brightway IA criativa 2" (Workers AI Read+Edit) em
      CF_API_TOKEN, CF_ACCOUNT_ID salvo. Teste no ar: "cabelo cacheado ruivo e óculos de sol" → nova versão em 6 s, mesma pessoa/roupa/fundo.
- [x] (16/11 15:51, dono: "vamos apagar") Cloudflare → API Tokens: token antigo "Brightway IA criativa (Workers AI)" (…8fe6) APAGADO; fica só o "…2" (…eed4).
- [x] (15/11 10:02, dono: "faça tudo") Autorizar a automação de NOTÍCIAS (publica noticias.json no site a cada 2 h) — ATIVA.
- [x] (16/11, Claude) Milhas: tela de ADM criada (Configuração → COTAÇÕES DE MILHAS) + automação de hora em hora. Falta o dono lançar as cotações atuais.
- [x] (16/11, dono: "lancei errado, ainda não recebi") EVENTO SICOOB: removido do Fluxo o lançamento antigo ev_1793873289922 (R$ 2.500
      "recebido"); o evento continua NÃO PAGO. Obs.: a sincronia só limpa ev_ antigo quando o evento está pago — com recebido = 0 ele ficava.
- [x] (15/11 09:20, dono) IA Brightway: criar conta grátis em console.groq.com → API Keys → Create; colar em Supabase → Edge Functions → Secrets como GROQ_API_KEY.
- [x] (14/11 20:03, dono) Google: gerar NOVO client secret no Google Cloud (Clients → cliente OAuth) e colar em Supabase → Authentication →
      Providers → Google → Client Secret (o atual está inválido).
- [x] (14/11 19:31, Claude com autorização do dono) Supabase → Authentication → URL Configuration: Site URL = https://audioevideobw-eng.github.io e Redirect URLs com
      https://audioevideobw-eng.github.io/** (sem isso, confirmação de e-mail e login Google voltam para "localhost").
- [x] (15/11, Claude) Testes de segurança 2A/2B/3 — simulados no banco (contas e visitante, tudo desfeito no fim) e com fetch cru de visitante:
      cadastro de colaborador só aparece para o dono do link; outra conta e visitante veem 0 em todas as tabelas e buckets; galeria com token
      falso = []; gravar na conta de outro = bloqueado. Nada de teste ficou no banco. Risco menor: equipe_cadastros/equipe_presenca aceitam
      inserção anônima (necessário para o link de colaborador) → RESOLVIDO 15/11: só por link registrado + limite por hora.
- [~] Ideias do dono (15/11): FEITO no app (sino AVISOS + notificação do aparelho + LEMBRAR EQUIPE por WhatsApp/e-mail/grupo, grátis).
      E-mail automático diário FEITO (15/11, grátis — bw-avisos). WhatsApp automático: só pela API da Meta (paga) — não feito, decisão do dono.
- [x] (16/11 20:05, dono: "funcionou perfeitamente") Teste real do 🔏 ASSINAR com o e-CNPJ da BW (A1, formato antigo 3DES/RC2) — OK.
- [~] (16/11 22:29, dono: "testei … por foto e está funcionando") LEITOR DE CONTAS por FOTO — OK. Ainda faltam (quando o dono quiser):
      conta em PDF, código colado e o TIO CLÁUDIO por voz (conversa, "como está meu dia", "muda para…").
      17/11 00:10: SOM confirmado pelo dono em PC, Android e iPhone (no iPhone só com o silencioso desligado). Voz masculina nos celulares:
      depende da voz do aparelho (iPhone: baixar "Felipe"; Android: voz padrão) ou da voz neural (não feita, aguarda o dono).
- [ ] Futuro (MAESTRO): galeria do cliente por link secreto (hoje as FOTOS ainda são listáveis por quem souber
      usar a API; documentos já estão protegidos).