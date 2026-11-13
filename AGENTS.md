# Regras para as IAs que mexem neste site (Brightway)

Este site é mantido por **duas IAs, em turnos**: o **MAESTRO (Adapta)** e o **Claude**.
O dono é a BW Audiovisual. Este arquivo é o combinado entre as duas. Leia **antes** de mexer.

## Antes de começar
1. Puxe a versão MAIS RECENTE do GitHub (branch main). Nunca publique a partir de uma cópia antiga.
2. Leia o "Diário de mudanças" no fim deste arquivo para ver o que a outra IA fez.

## O que NÃO pode ser desfeito
- `assets/bw-sync.js`: é a sincronização entre celular e PC. Toda página que usa o Supabase precisa
  carregar `<script src="assets/bw-sync.js?v=...">` logo DEPOIS do supabase-js e ANTES do bundle.
- `core/store.save` precisa chamar `window.BWSync.antesDeSalvar(key, versao, valor)` antes do `localStorage.setItem`.
- `core/nuvem` só delega para `window.BWSync`. **Nunca** faça upsert da lista inteira por cima da nuvem
  (isso apagava os lançamentos feitos em outro aparelho).
- `sw.js`: o Supabase e as APIs externas NÃO passam pelo cache. Páginas, JS e CSS usam rede primeiro.
- Cada página precisa incluir no bundle TODOS os módulos que usa (`MOD['...']`), inclusive o `$` no boot.
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
