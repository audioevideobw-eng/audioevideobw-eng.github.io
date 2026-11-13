# Relatório técnico — revisão do Brightway (13/11/2026)

**Autor:** Claude (revisão, testes e correção de bugs)
**Para:** MAESTRO (Adapta) e quem mais mantiver o site
**Commits:** `391ffcb` (sincronia + ferramentas), `ed3be73` (AGENTS.md), `76c7031` (logo e ícones)

Este relatório explica **o que estava errado, por que estava errado, o que foi feito e a regra que fica**.
Leia antes de gerar ou publicar páginas de novo. As regras resumidas estão no `AGENTS.md`.

---

## Resumo

| # | Sintoma que o dono via | Causa | Gravidade |
|---|---|---|---|
| 1 | Evento/gasto lançado no celular "some" no PC (e vice-versa) | Service worker servia as leituras do Supabase **do cache** | Crítica |
| 2 | Lançamentos apagados ao salvar em outro aparelho | `enviarTudo()` **sobrescrevia a nuvem inteira** com o que o aparelho tinha | Crítica |
| 3 | Lançamento recém-feito some ao abrir/atualizar a página | `receberTudo()` **apagava do aparelho** o que não estava na nuvem | Crítica |
| 4 | Edições não chegam no outro aparelho | Recebimento só comparava ids (novo/removido), ignorava conteúdo | Alta |
| 5 | Login "cai" sozinho, sincronia para sem aviso | Dezenas de `createClient()` por página disputando o token | Alta |
| 6 | Ferramentas travadas em várias páginas | Módulos faltando nos bundles; `$` não importado | Alta |
| 7 | Botão "Sincronizar agora" (App) dava erro | Código esperava lista, função devolvia objeto | Média |
| 8 | Campos e botão "Adicionar" cortados no celular | Grade de 3 colunas fixas sem regra para tela pequena | Média |
| 9 | Logo quebrada no rodapé; ícones do app quebrados | PNGs enviados ao GitHub como **texto base64** | Média |

---

## 1. Service worker guardava as respostas do Supabase em cache

**Onde:** `sw.js`, handler `fetch`.

**O que acontecia:** só BCB e er-api eram excluídos do cache. Todo outro GET externo — inclusive
`https://zdtnetplvdonogmdvarx.supabase.co/rest/v1/user_data?...` — caía no ramo final
"cache primeiro, atualiza em 2º plano". Resultado: cada leitura da nuvem devolvia **a resposta anterior**.
O aparelho achava que a nuvem estava velha e, com o problema 2, ainda reenviava esses dados velhos por cima.

**Correção:**
```js
if (url.origin !== location.origin) {
  if (!/(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname)) return; // Supabase/APIs: direto na rede
  // ...só as bibliotecas do CDN usam cache
}
// páginas, .js, .css, .json do próprio site: REDE PRIMEIRO, cache só sem internet
```
`CACHE` subiu para `bw-mesa-v20`.

**Regra que fica:** service worker **nunca** cacheia API de dados (Supabase, qualquer `/rest/`, `/auth/`,
`/storage/`). Cache-first só para arquivo estático versionado. HTML/JS/CSS do próprio site em rede-primeiro,
senão o aparelho fica rodando versão velha do código.

---

## 2. `enviarTudo()` sobrescrevia a nuvem inteira

**Onde:** `core/nuvem` (repetido em ~28 páginas) e chamadas em `modules/sincronia`, `modules/equipe`,
`modules/eventos` e no botão ☰ Sincronizar.

**O que acontecia:**
```js
// ANTIGO — para cada uma das 18 chaves:
c.from("user_data").upsert({ chave: k, dados: load(k, 1, []), ... }, { onConflict: "user_id,chave" })
```
O aparelho mandava **a lista completa que ele tinha** e substituía a da nuvem. Se o PC não tinha visto o que
o celular lançou, o PC apagava. Pior: `modules/sincronia.sincronizarTudo()` roda **ao abrir** Eventos e
Financeiro e terminava com `nuvem.enviarTudo()` — bastava abrir a página num aparelho desatualizado.
E um aparelho com uma chave vazia mandava `[]` e zerava a lista na nuvem.

**Regra que fica:** **nunca** gravar "a lista inteira deste aparelho" por cima da nuvem. Sempre
ler → mesclar → gravar (ver solução no item 4).

---

## 3. `receberTudo()` apagava do aparelho o que não estava na nuvem

**O que acontecia:** ao abrir a página, o aparelho "adotava" a nuvem: itens que existiam só localmente eram
removidos. Como o envio e o recebimento rodavam **ao mesmo tempo** na abertura (corrida), o lançamento que
ainda não tinha subido era apagado. Se o login tivesse caído (item 5), nada subia e tudo novo sumia.

**Regra que fica:** receber também é **mesclar**, nunca substituir. O que só existe no aparelho fica e sobe.

---

## 4. Edições e exclusões não eram tratadas

**O que acontecia:** o recebimento só olhava ids (novo/removido); a edição de um item existente não era
detectada. Exclusões não eram registradas, então uma união simples "ressuscitaria" itens apagados — por isso
alguém trocou para "sobrescrever", o que causou os itens 2 e 3.

### Solução: `assets/bw-sync.js` (arquivo único, compartilhado por todas as páginas)

1. **Carimbo de edição automático.** `core/store.save` chama `BWSync.antesDeSalvar(key, versao, valor)`
   antes do `localStorage.setItem`. Ele compara com o valor anterior e, para cada item novo ou alterado,
   grava `_ed = Date.now()`. Itens sem `id` ganham um.
2. **Lápides (exclusões).** Ids que sumiram da lista viram `{id: horário}` numa linha separada
   `user_data.chave = "<chave>__del"`. Um item só é descartado se a lápide for **mais nova** que o `_ed` dele
   (permite apagar e recriar).
3. **Mescla item a item.** União por `id`; se existe nos dois lados, **vence o `_ed` maior**; empate (dados
   antigos sem carimbo) → vence a nuvem. Depois aplica as lápides. Listas de pessoas/empresas
   (`neg_clientes`, `neg_equipe_colaboradores`) ainda colapsam duplicados por nome + documento/telefone.
4. **Trava otimista.** Gravação com
   `update(...).eq("chave", k).eq("atualizado_em", <valor lido>)`. Se 0 linhas mudaram, outro aparelho
   gravou no meio → relê, mescla de novo e tenta (até 5x). Linha nova: `insert`; erro 23505 = conflito → repete.
5. **Envio automático.** Todo `save` marca a chave como "suja" e envia em ~0,7 s. Também envia ao esconder a
   aba (troca de app no celular) e ao voltar a internet; recebe ao abrir e ao voltar para a aba.
6. **Valores que não são lista** (ex.: `neg_eventos_checklist_modelos`, um objeto): o mais recente vence,
   pelo horário local da alteração × `atualizado_em` da linha.
7. **Status visível** em `#menuSync`: "Sincronizado hh:mm", "Salvando…", "Sem login · só neste aparelho",
   "Falha · tentando de novo". Sem login e com dados locais → aviso com link para Entrar.

**`core/nuvem` agora só delega** (mesmas funções e formatos de retorno de antes, mas todas mesclam):
```js
MOD['core/nuvem'] = (function() {
const S = window.BWSync || {};
const nada = async () => ({ ok: false, msg: "Sincronização indisponível (recarregue a página).", totalMudou: 0 });
return { CHAVES_SYNC: S.CHAVES || [], baixar: S.baixar || nada, disponivel: S.disponivel || (async () => false),
  enviarTudo: S.enviarTudo || nada, receberTudo: S.receberTudo || nada,
  sincronizarTudo: S.sincronizarTudo || nada, subir: S.subir || nada };
})();
```
**Ordem das tags:** `supabase-js` → `assets/bw-sync.js?v=...` → bundle da página.

**Chaves sincronizadas:** as 18 de antes + `neg_eventos_checklist_modelos`. Chave nova de dados do usuário
deve ser adicionada em `CHAVES` dentro do `bw-sync.js`.

---

## 5. Muitos clientes Supabase na mesma página

**O que acontecia:** `core/nuvem.sb()` fazia `window.supabase.createClient(...)` **a cada chamada** (dezenas
por sincronização), e vários módulos faziam o mesmo. Cada cliente tem seu próprio renovador de token
lendo/gravando a mesma sessão; eles disputam o refresh token, a sessão é invalidada e o usuário fica
"deslogado" sem perceber — a sincronia retornava "sem sessão" em silêncio.

**Correção:** `bw-sync.js` substitui `window.supabase` por uma cópia cujo `createClient` devolve **sempre a
mesma instância** para a mesma URL + chave. Nenhuma página precisou mudar.

**Regra que fica:** um cliente Supabase por página. Crie uma vez e reutilize.

---

## 6. Módulos faltando nos bundles e `$` não importado

As páginas são bundles gerados (`const MOD = {}` + `MOD['x'] = (function(){...})()`). Algumas usavam módulos
que **não foram incluídos**, quebrando a página inteira no carregamento:

| Página | Erro | Correção |
|---|---|---|
| casa.html | `exportar.resumoOrcamento` de `undefined` | incluído `modules/exportar` |
| preco.html | `MOD['modules/sincronia']` indefinido | incluídos `modules/exportar` e `modules/sincronia` |
| negocio.html | `ocr.init` de `undefined` | incluídos `modules/exportar` e `modules/ocr` |
| eventos.html | `modules/pagamento` ausente | incluído `modules/pagamento` |
| configadm.html | `MOD['core/nuvem']` indefinido | incluído `core/nuvem` |
| app, equipe, eventos, financeiro | `$ is not defined` no `boot()` | `const { $ } = MOD['core/format'];` no `*_main` |

**Regra que fica:** ao gerar cada página, para cada `MOD['nome']` usado, o bloco `MOD['nome'] = ...` tem que
estar **antes** no mesmo bundle. Teste simples: abrir a página e ver se o console tem erro.

---

## 7. Botão "Sincronizar agora" da página App

`app.html` fazia `rs.find(...)` no retorno de `sincronizarTudo()`, que é um **objeto**, não lista →
`rs.find is not a function`. Corrigido para usar `r.ok` / `r.msg` e recarregar se `r.totalMudou > 0`.

**Regra que fica:** ao chamar uma função de outro módulo, use o formato que ela realmente devolve.

---

## 8. Formulários cortados no celular

`.frow3 { grid-template-columns: 1fr 1fr 1fr }` sem media query: em 390 px os campos e o botão "Adicionar"
saíam da tela. Adicionado em `assets/brightway.css` (v=5): `min-width:0` nos itens, 2 colunas até 640 px e
1 coluna até 420 px.

**Regra que fica:** todo layout em grade precisa de regra para tela pequena. Teste em 390 px de largura.

---

## 9. Logo e ícones como texto base64

`icons/brightway-logo.png`, `brightway-icone.png`, `icon-192.png` e `icon-512.png` estavam no GitHub como
**texto** (o conteúdo começava com `iVBORw0KGgo…`, que é o PNG codificado em base64). O navegador não
reconhece como imagem → imagem quebrada no rodapé e nos ícones do app instalado.

**Correção:** decodificados para PNG real. Criado `icons/brightway-logo-web.png` (só o letreiro, fundo
transparente, 1201×120, 37 KB), usado nas páginas. Os originais continuam no lugar.

**Regra que fica:** ao enviar imagem pela API do GitHub, mande o conteúdo em base64 **no campo de envio**
(que o GitHub decodifica) — nunca grave o texto base64 como conteúdo do arquivo. Confira abrindo o arquivo no
GitHub: tem que aparecer a imagem.

---

## Como foi testado

- Navegador automatizado (Chrome) com um **Supabase simulado** e **dois aparelhos** (PC e celular, mesma conta).
- Cenários aprovados: lançar no PC → aparece no celular; celular adiciona gasto enquanto o PC desatualizado
  lança outro evento → nada se perde; exclusão não volta; mesmo item editado nos dois → vence a edição mais
  recente; dois aparelhos salvando ao mesmo tempo → nenhum lançamento perdido; nenhuma gravação no modo
  antigo; sem login → aviso aparece.
- Fluxo pela interface: evento cadastrado pelo formulário no celular aparece no PC; despesa lançada no
  orçamento do PC aparece no celular.
- As 31 páginas abrem sem erro de JavaScript; cliques em todos os botões de cada página sem erro novo.

## Pendências e observações

- Itens apagados **antes** desta correção podem reaparecer uma vez (não havia registro de exclusão). Basta apagar de novo.
- Gastos ficam dentro do evento (`e.gastos`). Se o MESMO evento for editado em dois aparelhos quase ao mesmo
  tempo, vence a versão mais recente do evento inteiro. Se isso incomodar, o próximo passo é mesclar também
  as sublistas por id.
- `neg_equipe_presencas_local` e configurações (tokens, URLs de planilha) continuam só no aparelho, de propósito.
