# Métodos que funcionaram (Brightway)

Receitas reaproveitáveis, anotadas no fechamento de cada entrega (regra do dono, 15/11/2026 — ver AGENTS.md, "FECHAMENTO").
Cada item: **quando usar → como fazer → armadilha**.

---

## Testes

### T1. Testar as páginas localmente sem internet (Supabase e CDNs bloqueados)
- **Quando:** antes de publicar qualquer mudança de tela.
- **Como:** `python3 -m http.server 8765` na raiz + Playwright (`/usr/bin/google-chrome`). Interceptar as requisições:
  `supabase-js` → devolver um *stub* (`window.supabase = { createClient(){…} }` com `auth.getSession`, `from().select().eq().in().neq()…`,
  `rpc`, `storage.from().upload/remove/createSignedUrl`); `pdfmake.min.js` → stub que guarda o `docDefinition` em `window.__docs`;
  o resto → `abort()`. Semear os dados com `localStorage.setItem("bw_<chave>_v1", JSON.stringify(...))` e recarregar.
- **Armadilha:** abrir o contexto com `service_workers="block"` — o SW do site intercepta as requisições e o stub não entra
  (erro falso "createClient de undefined").
- **Conferir sempre:** `pageerror` = 0 e `scrollWidth - clientWidth` = 0 em 1280 e 390 px.

### T2. Testar no site no ar com a conta do dono (navegador embutido)
- `javascript_tool` na página logada. Para criar/apagar item de teste use o próprio `MOD['core/store'].save(...)` (passa pelo
  `antesDeSalvar`) e confira na nuvem com `BWSync.cliente().from("user_data").select("*").eq("chave", "...")`.
- **Armadilha:** a página pode recarregar sozinha depois do login/sincronia → espere ~3 s e rode de novo se o script for cortado.
- **Armadilha:** se você trocar uma função global (ex.: `pdfMake.createPdf`) e o script falhar no meio, ela fica trocada →
  recarregue a página antes de testar de novo.

### T3. Testar PDF de verdade sem baixar arquivo
```js
const orig = pdfMake.createPdf, res = [];
pdfMake.createPdf = d => { const p = orig(d); return { download: n => p.getBuffer(b => res.push([n, b.length])) }; };
// … chamar o gerador …   depois: pdfMake.createPdf = orig;
```
Tamanho > 0 e sem erro = o pdfmake montou o arquivo. Localmente (T1) confira o `docDefinition` sem "undefined"/"NaN".

### T4. Arquivo no Storage privado (eventos-docs)
- A pasta (1º nível do caminho) precisa estar registrada como DA CONTA antes do envio: `await BWSync.registrarAgora({ eventos: [pasta] })`.
  Serve para qualquer pasta nova (ex.: `equipe_<id>`), não só evento.
- Teste: enviar um PDF mínimo (`new Blob(["%PDF-1.4…"])`), abrir com `BWSync.urlSegura(...)`, apagar com `storage.remove`.
- A exclusão de conta (login.html) só apaga subpastas conhecidas (`""`, `/comprovantes`, `/contratos`, `/nfe`) → arquivo novo
  deve ficar na raiz da pasta ou numa dessas.

### T5. Teste automático de uma área inteira (modelo: docs/testes/teste_crm.py)
- **Quando:** página nova com muitos botões (CRM, editor de fotos).
- **Como:** T1 + `ok(cond, msg)` acumulando falhas; usar o próprio botão da tela (`pg.click`) e conferir o `localStorage` (`bw_<chave>_v1`).
  Arquivo baixado: `with pg.expect_download() as d: pg.click(...)` → `zipfile.ZipFile(...).testzip()`; imagem de teste gerada no canvas e
  passada como `File` (sem depender de arquivos no disco); `input[type=file]` recebe arquivos por `DataTransfer` + `dispatchEvent("change")`.
- **Armadilha:** `<details>` fechado esconde o campo → abrir com `el.open = true` antes de `fill`. Capturas do manual com `--lang=pt-BR`
  (senão o campo de data sai como 12/03/2026 no formato americano).

- Modelo menor: `docs/testes/teste_agenda.py` semeia o localStorage com `ctx.add_init_script` (só na 1ª carga, marcado em sessionStorage)
  e clica nos botões por texto (`.ag-item:has-text('Luz') [data-ok]`).

### T6. Gráficos (SVG à mão)
- Paleta validada com o validador da skill dataviz (modo escuro, fundo #0d1017): ciano #1C97A6, âmbar #C98322, lilás #9F78E6, rosa #D05D72.
  As cores claras da marca (#3FD0E0, #FFB547) ficam claras demais para barras/linhas no fundo escuro (falham a faixa de luminosidade).
- Um eixo só; legenda quando há 2+ séries; dica (`data-dica`) ao passar o mouse/tocar; barras com ponta arredondada de 4px.

## IA e agentes (CRM)
- IA na nuvem = Edge Function `bw-ia` ({sistema, pedido, max} → {texto}); pedir **JSON** e ler com `BWCRM.jsonDe` (aceita texto em volta).
- Limite de 60 pedidos/dia por conta: o agente manda a fila inteira (até 8 ações) numa chamada só e guarda o resultado do dia em `ui_crm_agente_msgs`.
- Sempre ter plano B sem IA: captura por regras (`lerTextoRegras`: telefone, e-mail, data "12/12" ou "12 de dezembro", serviço, local),
  análise por regras no ANALISTA, mensagens prontas no agente.

## Armadilhas de código já pagas

- **Carimbo com hora:** `toISOString()` em histórico é UTC → para mostrar o dia use `BWCRM.diaLocal(iso)` (pente fino 32).

- **Datas:** `new Date().toISOString().slice(0,10)` é UTC → no Brasil, depois das 21h vira o dia seguinte. Para "hoje" use
  data local (`getFullYear()/getMonth()/getDate()`), como no `modules/agenda`.
- **Regex com acento:** `\b` do JavaScript não reconhece letras acentuadas (`amanhã`, `terça`, `reunião`). Use limite por
  espaço/pontuação: `new RegExp("(\\s)(?:" + palavra + ")(?=[\\s.,!?;:])", "i")` com o texto cercado de espaços.
- **Campos de `casa_contas`:** c0 nome · c1 valor · c2 vencimento · c3 pago ("Sim"/"Não"). `neg_fluxo`: c0 data · c1 "Entrada"/"Saída"
  · c2 valor · c3 descrição/categoria; ids automáticos `fixo_`, `cache_` (fonte "pendente"/"pago"), `gasto_`, `receita_`.
- **Botão que não faz nada:** conferir se o `init…()` do módulo é chamado no boot da página (ex.: `initExportar` do fluxo nunca era).
- **Mesmo módulo em várias páginas:** o bundle é copiado em cada HTML. Ao mudar um módulo compartilhado (ex.: `modules/equipe`
  em equipe.html e eventos.html), copie o MESMO texto para todas as páginas que o têm.
- **Lista que existe em dois lugares:** antes de criar dado novo, procurar se já existe chave parecida (`neg_eventos` ×
  `neg_equipe_eventos`). Unificar com migração única: casar por (data + equipe), guardar o id antigo (`idsAntigos`) e esvaziar a lista velha.
- **Esconder parte da página:** nunca `display:none` num contêiner que tem dentro o que deve aparecer (o `?ev=` escondia o `.wrap`
  com o dossiê dentro) — esconda os irmãos.
- **Painel de opções que redesenha:** desenhe uma vez o cabeçalho (atalhos, ano/mês) e redesenhe só a lista; senão as escolhas
  dos campos se perdem a cada clique.

- **Editor em tela cheia (fotos.html):** o painel de controles no celular tem ALTURA FIXA (`height:31vh`), não `max-height` —
  com max-height a área da foto mudava de tamanho a cada aba e a foto "pulava". Teste: medir `#cv.getBoundingClientRect().top`
  antes e depois de trocar de aba (`docs/testes/teste_fotos.py`).
- **IA no aparelho para imagem:** transformers.js `pipeline("background-removal","Xenova/modnet")` num Worker module criado de Blob
  (igual ao assistente); entrada = `new RawImage(rgba, w, h, 4)` reduzida a 1024 px; a saída RGBA traz a máscara no alfa. Use
  device "wasm": no WebGPU o MODNet devolveu máscara com buracos (testado no ar 16/11, 37% × 53% de pixels sólidos). No teste local a CDN é bloqueada → conferir que o erro vira aviso e o editor não trava.
- **Logo sem fundo sem IA:** amostrar a cor das bordas, preencher (flood) a partir das bordas com tolerância; opção "buracos" = chave
  de cor global (miolo de O, A, B).
- **Downloads no teste:** `with pg.expect_download() as dl:` + abrir com PIL/zipfile para conferir tamanho, alfa e nomes.

- **Juntar anexos num relatório pdfMake:** `BWAnexos.baixar(def, [{nome,url}], arquivo)` (assets/bw-anexos.js). No teste local o pdfMake
  é simulado com pdf-lib (`/opt/npm-tools/node_modules/pdf-lib`) e os anexos vêm de rota falsa (`anexos.test`) — confere-se o nº de
  páginas em `window.__ultimoPDF` (relatório 1 + anexo 3 = 4) e o anexo 404 aparece em `falhas`. Ver docs/testes/teste_cadastros.py.
- **Campo novo sem mudar o banco:** cadastro público grava extras (CNH) em JSON na coluna `observacao` de equipe_cadastros; quem aprova lê com `extraCad()`.

## Padrões de interface que o dono aprovou
- Ação da linha (✎ ALTERAR / ✕) junto do nome; editar abre o formulário com os dados e borda dourada "✎ ALTERANDO: nome".
- Ferramenta visual (editor): o resultado fica SEMPRE visível — controles embaixo (celular) ou ao lado (PC), nunca rolar a página
  para ver o efeito (pedido do dono 16/11, modelo Lightroom/Snapseed/VSCO).
- Títulos de acesso = palavra-chave em MAIÚSCULAS; galeria com ícone; sem texto pequeno.
- "Toque e abre": tocar no item (ex.: dia da agenda) abre uma folha com o que já existe + blocos grandes do que dá para lançar.
- Relatório com escolha: atalhos prontos (EVENTO + EQUIPE, FINANCEIRO, COMPLETO) + itens marcáveis; lembrar a escolha (`ui_*`).
- Organização: dinheiro fica no FLUXO DE CAIXA (aba Cachês e custos); pessoas na GESTÃO DE PESSOAS; eventos e clientes em EVENTOS.

## Manual do usuário
- Gerador: `python3 docs/manual/gerar.py` (precisa de Playwright + Chrome e pypdf). Monta o PDF a partir de `docs/manual/base.pdf`
  (páginas antigas que não mudaram) + páginas HTML de `docs/manual/paginas/` e renumera os rodapés.
- Telas: `python3 docs/manual/telas.py` sobe o site local, semeia a "Produtora Exemplo" e salva as capturas em `docs/manual/telas/`.
