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

**Como testar no navegador (rotina)**
- Abrir as páginas com captura de erros (iframe sandbox + window.onerror) → 0 erros de JS.
- Medir `scrollWidth - clientWidth` em 390 px → 0.
- Teste de VISITANTE (sem login): use fetch cru só com a chave publishable, numa página SEM bw-sync (ex.: termos.html).
  Um createClient "anônimo" dentro de uma página logada herda o login e dá falso alarme (aconteceu em 14/11).
- Arquivo de teste no Storage só sai pela API (o SQL é bloqueado): registre o evento de teste, apague pela API, depois apague o registro no SQL.
- Criar um item de TESTE, recarregar, conferir na nuvem, apagar o item de teste. Nunca mexer em dados reais do dono sem pedir.

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

## Pendências (dono)
- [x] (15/11 10:02, dono: "faça tudo") Autorizar a automação de NOTÍCIAS (publica noticias.json no site a cada 2 h) — ATIVA.
- [ ] Milhas: não existe fonte pública automática; atualizar a referência à mão ou criar tela de ADM para lançar as cotações.
- [ ] Conferir EVENTO SICOOB: o fluxo tem "Evento: EVENTO SICOOB" R$ 2.500 como RECEBIDO, mas o evento está marcado como NÃO PAGO.
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
- [ ] Futuro (MAESTRO): galeria do cliente por link secreto (hoje as FOTOS ainda são listáveis por quem souber
      usar a API; documentos já estão protegidos).
