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
5. **PUBLICAR** — vigia ✅, diário, commit/push na main, conferir no site no ar e mandar ao dono o resumo do que mudou.

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

## Pendências (dono)
- [ ] (17/11) URGENTE — IA BRIGHTWAY FORA DO AR: criar chave nova em console.groq.com → API Keys e colar em Supabase → Edge Functions →
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
