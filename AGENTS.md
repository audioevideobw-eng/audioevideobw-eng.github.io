# Regras para as IAs que mexem neste site (Brightway)

Este site é mantido por **duas IAs, em turnos**: o **MAESTRO (Adapta)** e o **Claude**.
O dono é a BW Audiovisual. Este arquivo é o combinado entre as duas. Leia **antes** de mexer.

## Antes de começar
1. Puxe a versão MAIS RECENTE do GitHub (branch main). Nunca publique a partir de uma cópia antiga.
2. Leia o "Diário de mudanças" no fim deste arquivo para ver o que a outra IA fez.
3. Relatórios técnicos detalhados ficam na pasta `docs/` (comece por `docs/RELATORIO-2026-11-13-claude.md`).

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

## Divisão de tarefas (combinada com o dono)
- MAESTRO: funcionalidades novas e visual.
- Claude: revisão, testes e correção de bugs.

## Diário de mudanças
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
