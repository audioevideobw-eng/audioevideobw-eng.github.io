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

- **Teste de toque (iPhone) sem WebKit:** `dev = dict(p.devices["iPhone 13"]); dev.pop("default_browser_type")` → `b.new_context(**dev)` no Chrome;
  `pg.tap()` em cada botão, `elementFromPoint` no centro de cada botão (nada cobrindo) e `window.scrollY` = 0 depois de tentar rolar.

- **Rosto na foto (sem nuvem):** `import(MP + "/vision_bundle.mjs")` (@mediapipe/tasks-vision@0.10.14), `FaceDetector` em modo IMAGE
  com blaze_face_short_range (storage.googleapis.com/mediapipe-models/...). boundingBox em pixels da imagem passada, keypoints
  normalizados (os 2 primeiros = olhos; ordene por x). Passe a camada da foto JÁ cortada (camadaFoto) para as frações valerem direto na
  área da foto.

## Padrões de interface que o dono aprovou
- Toque num anexo (foto, logo, moldura) abre uma FOLHA de opções embaixo (estilo app): ações + Cancelar; destrutivo em vermelho no fim.
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


## Retoque com IA no aparelho (MediaPipe ImageSegmenter) — 16/11/2026
- Modelo: `selfie_multiclass_256x256` (0 fundo, 1 cabelo, 2 pele do corpo, 3 pele do rosto, 4 roupa, 5 acessórios), `outputCategoryMask: true`,
  `delegate: "CPU"` (iPhone + GPU embaralha as categorias). Carregador único `mpVision()` compartilhado com o detector de rostos.
- Guardar por foto 4 máscaras pequenas (≤768 px, borda suavizada) + a luminância média de cada região; desenhar a máscara com a MESMA
  geometria da foto (desenharFonte) na hora de montar.
- Trocar cor sem perder textura: HSL da cor alvo, luminância nova = L_alvo + (L_pixel − L_média) — cabelo preto vira loiro com fios.
- Desfoque portátil: reduzir a imagem e ampliar de volta (ctx.filter não é garantido no Safari).
- Teste local sem internet: injetar `f.seg` com máscaras falsas em faixas e conferir pixels (docs/testes/teste_ia_retoque.py);
  no ar: foto de selfie pública do Hugging Face (datasets/Xenova/transformers.js-docs/…/selfie_segmentation_landscape.png).

## IA criativa (imagem) na nuvem grátis — 16/11/2026
- Cloudflare Workers AI `@cf/black-forest-labs/flux-2-klein-4b`: REST multipart (`prompt`, `input_image_0` < 512×512, `width`/`height` 256–1920),
  resposta `{result:{image: base64}}`. Custo ≈ 5 neurônios por imagem de entrada + 26 por bloco 512×512 de saída (1024×1280 ≈ 160).
- Sempre por Edge Function (chave em Secrets); a função confere login (getUser) e conta o uso (bw_ia_img_contar) ANTES de chamar a Cloudflare.
- Prompt em inglês envolvendo o pedido: "Change ONLY this: … Keep the same person, pose, framing, lighting" (mantém o rosto).
- Teste local: rota do Playwright responde o ping e devolve um JPEG falso em base64; conferir confirm(), o corpo enviado e a foto nova na posição i+1.
- Publicar função pelo painel: functions/new → monaco.editor.getModels()[0].setValue(código) + nome → Deploy; SQL: sql/new → setValue → Run.

## CRIADOR IA — arte por IA + texto de verdade — 16/11/2026
- Arte: `BWFotosNuvem.arte(blobOuNull, prompt, w, h, espaco, seed)` → Edge Function bw-ia-imagem (modo=arte) acrescenta "ABSOLUTELY NO text…"
  e "keep {espaço} calm" ao prompt. 3 opções = 3 chamadas em paralelo com seeds diferentes (cada uma conta 1 no limite diário).
- Tamanho da arte: proporção do formato com o lado maior 1440 e múltiplos de 16 (story → 816×1440); o desenho final cobre a área (capa).
- Texto: blocos com papel (pre/script/nome/destaque/info/peq/cta/contato) × tamanho relativo a uma base (min(W, H×0,62)); encolhe 8% por
  volta até caber na área; cor automática pela luminância da área; fundo do texto degradê/vidro (desfoque por reduzir-ampliar)/faixa.
- Data por extenso sem fuso: `new Date(ano, mês-1, dia)` a partir de "aaaa-mm-dd" (nunca `new Date("aaaa-mm-dd")`, que é UTC).
- QR: biblioteca qrcode-generator (CDN, carregada só quando o QR é ligado) → `qrcode(0,"M")`, `isDark(l,c)` desenhado no canvas.
- PDF de impressão: pdf-lib, página A5/A4/cartão em pontos e a imagem JPEG cobrindo a página.
- Entre páginas sem nuvem: IndexedDB `bw_ponte` (put no criador → fotos.html#criador lê, apaga e abre).
- Teste: rotas simulando bw-ia-imagem (JPEG falso), bw-ia (JSON) e o QR; `service_workers="block"`; conferir corpo do pedido
  (sem `name="imagem"` quando a foto não deve sair), PNG decodificado no tamanho certo, PDF relido com PDFLib.


## Gerador de orçamento — um modelo, três saídas (16/11)
- `modelo(doc)` monta seções neutras (lista, check, duas colunas, chave-valor, investimento); `folhaHTML` (prévia), `defPdf` (pdfMake) e
  `gerarWord` (docx 9 IIFE, global `docx`, `Packer.toBlob`) só desenham. Prévia: folha de 794 px com `transform:scale` no contêiner.
- Pix com valor: campos EMV id+tamanho+valor; 26 = GUI `br.gov.bcb.pix` + chave (CNPJ/CPF só dígitos, telefone +55…); 54 valor com ponto;
  59 nome ≤25 sem acento; 60 cidade ≤15; 62/05 txid; termina "6304" + CRC16-CCITT (0x1021, início 0xFFFF). O teste confere o CRC em Python.
- Ler .docx no navegador: JSZip → `word/document.xml` → DOMParser com namespace w → um texto por `w:p` (juntar os `w:t`). Logo = maior
  imagem de `word/media/`. Rodapé em `word/footer*.xml`.
- Teste sem rede: pdfMake simulado guardando a definição (`window.__defs`), docx e JSZip das cópias locais em /opt/npm-tools/node_modules,
  `expect_download` para pegar o .docx e abrir o XML com zipfile.


## Animação de CONCLUIR em botões de condição (16/11)
- Comum a todas as páginas: `assets/layout.js` → `BWConcluir` (ouvinte de clique em fase de CAPTURA + `setTimeout(0)` para agir depois
  do handler do botão; confete `.ag-confete`, aviso `.ag-toast`, cartão `.bw-vira-verde`). Cartão marcado com `data-bw-card="ID"`.
- Fluxo com janela (ex.: FECHAR NEGÓCIO): chamar `BWConcluir.festa(elemento, "mensagem")` no fim.
- Teste: espiar com MutationObserver em `document` (no init script ainda não existe documentElement) — docs/testes/teste_concluir.py.


## Tirar o fundo de uma logo no navegador (16/11)
- Cor do fundo = média das bordas opacas (amostra ~64 pontos por lado); só age se ≥ 85% das amostras estão perto dessa cor (fundo liso).
- Fundo: busca em largura a partir das bordas com distância RGB < 40 (TIRAR FUNDO) ou todo pixel perto da cor (+ DENTRO DAS LETRAS).
- Borda sem halo: em até 2 px do que saiu, pega o vizinho (raio 3) mais longe da cor do fundo = cor da letra; alfa = dist(pixel)/dist(letra)
  e a cor vira a da letra. Depois corta as sobras transparentes (margem 4 px) e salva PNG (encolhe 20% por volta até ≤ 450 KB).
- Teste: desenhar a logo num canvas e exportar como JPEG (fundo "sujo" de verdade); conferir alfa dos cantos, miolo do "O", pixels
  semitransparentes claros (halo) e que logo transparente/sobre foto não é mexida — docs/testes/teste_logo_fundo.py.


## Assinar PDF com certificado A1 no navegador (16/11)
- Abrir o .pfx: `forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(binString), false, senha)`; chave em pkcs8ShroudedKeyBag, certificado
  = o certBag cuja chave pública tem o mesmo `n`; CN da ICP-Brasil = "NOME:CNPJ/CPF". Senha errada → erro com "MAC"/"password".
- PDF: pdf-lib cria o dicionário /Sig (Filter Adobe.PPKLite, SubFilter adbe.pkcs7.detached, ByteRange [0 /********** ×3],
  Contents <0…0> com 24 576 bytes), o widget /FT /Sig na última página e o /AcroForm /SigFlags 3; salvar com useObjectStreams:false.
  Depois: achar o texto do ByteRange e o "/Contents <", calcular [0, início, fim, resto], escrever com espaços até o mesmo tamanho,
  assinar os bytes FORA do Contents (forge.pkcs7 detached, SHA-256, atributos contentType/messageDigest/signingTime) e escrever o hex.
- Teste: certificados criados na hora (python cryptography + `openssl pkcs12 -export -legacy -keypbe PBE-SHA1-3DES -certpbe PBE-SHA1-RC2-40`
  para imitar os A1 reais); validar com `pdfsig` (poppler) — "Signature is Valid", "Total document signed"; alterar 1 byte → inválido.
- Sem internet nos testes: `git clone --depth 1 https://github.com/digitalbazaar/forge` + `python3 docs/testes/empacotar_forge.py forge/lib /tmp/forge.js`
  e rodar com `FORGE=/tmp/forge.js`.


## Leitor de contas e Agente (16/11)
- Boleto: 47 dígitos (bancário) → barras = l[0:4]+l[32]+l[33:47]+l[4:9]+l[10:20]+l[21:31]; DV geral mod 11 (0/10/11→1); valor = barras[9:19]/100;
  fator = barras[5:9] → 22/02/2025 + (fator−1000) dias (se der > hoje+3 anos, base antiga 07/10/1997 + fator). 48 dígitos (arrecadação, começa
  com 8) → tira o 12º de cada bloco; id 6/7 = mod 10, 8/9 = mod 11; valor = barras[4:15]/100; segmento 2 água, 3 energia, 4 telecom.
- PDF: pdf.js getTextContent agrupando por y (Math.round(y/3)) e ordenando por x reconstrói as linhas; texto < 40 letras = escaneado → OCR.
- Teste offline: pdf.js 6 local em /opt/npm-tools (rota do CDN → pdf.min.mjs com Access-Control-Allow-Origin), ZXing e Tesseract simulados,
  voz simulada (window.SpeechRecognition falso com __fala/__falaErro; speechSynthesis via Object.defineProperty — atribuir não funciona).
- Agente: testar frases com hora ("às 10"), número por extenso ("trinta e cinco"), evento pelo nome parcial ("mina vale"), sem valor.
- IA de ações (16/11 noite): SEMPRE conferir a saída REAL da bw-ia no ar antes de dar como pronto — no console logado:
  `await BWAgente.entender("me lembra de ligar pro cliente amanhã às 10")` (não grava nada). O teste simulado devolvia o formato ideal e
  escondeu que o gpt-oss respondia {"acoes":[{"tarefa":{…}}]}.


## BW Reels Pro (17/11) — editor de vídeo no site + motor no PC
- Motor do site = gerado do Studio: `python3 <bw-reels-studio>/motor/gerar-motor-web.py assets/reels-motor.js` (inclui o validador).
- Teste local: `python3 docs/testes/teste_reels.py` — IA simulada (resposta em ```json``` para testar o extrair), vídeo de teste gerado no
  próprio navegador (canvas + MediaRecorder → webm), JSZip servido do /opt/npm-tools, pacote baixado e aberto com zipfile.
- Ponte site → PC sem localhost: o site baixa `<nome>.bwreels.zip` (roteiro.json + bwreels.json + midia/ + post.md); no PC
  `node motor/vigia-downloads.mjs` olha Downloads (pasta real lida do registro do Windows), espera o tamanho parar de mudar, descompacta
  (tar → python zipfile → unzip), renderiza e abre o MP4. Teste do vigia: `--pasta /tmp/dl --uma-vez --rascunho` com BWREELS_NAO_ABRIR=1.
- Prévia: iframe com srcdoc do motor + `window.__PREVIEW=true` (vídeo toca e só corrige se desviar > 0,35 s); parado mostra 1,5 s.

## Personagens animados e galeria de modelos (17/11)
- Personagem por código = SVG com partes marcadas (`data-p`: tudo, cabeca, bracoE/bracoD com ponto de giro, pupila, palpebra, boca)
  e UMA função `animarPersonagem(raiz, rig, t)` usada nos 3 motores (nativo, HyperFrames, Remotion) e na prévia do site
  (bw-reels-studio/motor/personagens.mjs → gerar-motor-web.py). Boca = path refeito por tempo; piscar em tempos fixos pela semente.
- Testar determinismo de qualquer animação HTML: `node motor/animar.mjs arquivo.html --checar` (mesmo t em ordens diferentes
  = mesma imagem) e `--folha` (12 quadros numa imagem para revisar sem assistir). A composição do motor já define __DUR/__seek.
- Vídeos de exemplo da galeria: `node motor/exemplos-web.mjs <site>` (escala 1/3, 24 qps, crf 31 ≈ 100–200 KB cada; ~3–5 min cada
  numa máquina de 2 núcleos — rode em segundo plano). Capa .jpg tirada aos 2,2 s.
- Teste: docs/testes/teste_reels.py cobre galeria (abre na 1ª vez, 3 categorias, vídeo toca, todo modelo tem mp4+jpg), USAR modelo,
  editor de personagem (trocar, falas, ação, cenário, tirar o 2º), normalização da resposta da IA e os prompts de IA externa.

## Animar o personagem do usuário (17/11)
- Recorte no aparelho: `BWReelsAvatar.jaRecortado` (bordas transparentes) → `recortarLiso` (bordas parecidas entre si = fundo liso;
  flood pelas bordas, borda suave, `aparar`) → senão `recortarIA` (MODNet em worker, mesmo modelo do editor de fotos).
- Motor: `{"personagem":"foto","imagem":"midia/avatar-x.png"}` vira `.ator.foto` com `img` animada por `animarRecorte` (só transform).
  Cena só com imagem: `elenco: []` + `midia`. Prévia do site troca `elenco[].imagem` pela URL blob; o pacote leva as imagens do elenco.
- Teste: docs/testes/teste_reels.py simula bw-ia (história) e bw-ia-imagem (devolve JPG) — confere confirmação, tamanho do envio,
  1 imagem por cena, prompts de vídeo, editor ("Só imagem", VIRAR).

## Som automático e personagens montados (17/11)
- motor/sons.mjs: `sintetizarSons(plano,{sr})` → {trilha, efeitos} (Float32 L/R); `misturar` + `wavDe` → WAV. Eventos em plano.sfx
  (pop, fala, boing, confete, susto, clique, contador, brilho, whoosh, impacto) só quando efeitos.sfx; trilha em plano.trilha.
  Conferir sem ouvir: `ffmpeg -i video.mp4 -lavfi showspectrumpic=s=1200x400 espectro.png` (trilha embaixo, blips/efeitos como riscos).
- Personagem montado: `svgPersonagem({cabelo, barba, oculos, roupa, acessorio, bone, bicho, cores})`; prévia ao vivo no montador com
  `animarPersonagem(div, rig, t)` num requestAnimationFrame. Para mandar à IA de imagem: SVG → Image → canvas (rasterLook).

## Motions e gráficos por código (17/11)
- Tipo de cena novo = 4 lugares no Studio: plano.mjs (o `case` com os nós e tweens; prop `p` → CSS `--p` para barras/anéis/riscos),
  html.mjs (CSS da classe), validar.mjs (TIPOS + regras do tipo) e schema/roteiro.schema.json; depois `gerar-motor-web.py` para o site
  e, no site, reels.js (GRUPOS de campos, ROTULOS, PADRAO_TIPO, lerCena) + reels.html (opção no select).
- Revisar sem assistir: `node motor/animar.mjs t.html --folha` com um roteiro de teste que tenha uma cena de cada tipo (projetos/teste-motions,
  apagar antes de empacotar). Texto grande: medir a palavra mais longa; enfeite que divide espaço com texto sai antes do texto.

## Vídeo MP4 feito no navegador (17/11)
- assets/reels-celular.js: `BWReelsCelular.suporta()` e `gerar({html, largura, altura, fps, duracao, som, alturaSaida, aoProgredir, cancelar})`.
  Iframe escondido com o HTML do motor → `__seek(t)` → XMLSerializer → SVG foreignObject (data:) → canvas → VideoEncoder (avc1.420028,
  sem quadros B) → MP4 próprio (ftyp + moov + mdat, um "chunk" por amostra; avcC vem de meta.decoderConfig.description).
- Som: sintetizarSons(plano, {sr: 48000}) → AudioEncoder (mp4a.40.2 → esds; ou opus → dOps com o pre-skip do OpusHead).
- Conferir: `ffprobe -show_streams`, `ffmpeg -i x.mp4 -f null -` (0 erros), `-af volumedetect`, folha com `fps=1/2.4,tile=6x1`.

## Dados de uma ferramenta "só do aparelho" passando a acompanhar a conta (BW REELS PRO, 17/11)
- O IndexedDB continua sendo a fonte da tela; a conta recebe um espelho leve (lista em `bw_<chave>_v1` com `antesDeSalvar`), sem arquivos.
- Ao abrir e a cada `bw-sync-recebido` com a chave: juntar por id, vence o `atualizado` maior; exclusão remota só vale para itens marcados `naConta`.
- Fila entre aparelhos = um campo com hora no próprio item (`paraPC`), mostrado só no outro tipo de aparelho.
- Teste: escrever a lista no localStorage como se viesse de outro aparelho e chamar `BWReels.puxarDaConta()`.

## Quadro de nós (blocos + setas) sem biblioteca (QUADRO DE HISTÓRIA, 17/11)
- Área com overflow escondido e touch-action:none; "mundo" com transform translate+scale; SVG grande por baixo para as setas (curvas C) e
  um segundo path transparente e largo (stroke 22) só para o toque. Blocos são divs absolutas; arrasta pelo cabeçalho (pointer capture na área).
- Ligar no celular: botão ➜ no bloco de origem → próximo toque num bloco é o destino (sem arrastar linha). A ordem da história segue as setas.
- Teste: IA de texto e de imagem simuladas pela rota; confere envio pequeno da foto, confirmação, persistência depois de recarregar e o reel montado.

## Rodar SQL no painel do Supabase sem errar o texto (19/11)
- SQL Editor → nova consulta → `monaco.editor.getModels()[n].setValue(sql)` com o texto do arquivo do repositório em JSON; conferir o SHA-256 do
  editor (crypto.subtle) contra `sha256sum` do arquivo ANTES de rodar. O aviso "destructive operations" aparece por causa de `drop policy if exists`.
- O SQL termina com uma consulta de CONFERÊNCIA (rls, nº de regras, bucket) — ler o resultado antes de seguir.

## Cartão que flutua (animação infinita) no teste
- Playwright espera o elemento "parar" para clicar: com `animation: … infinite` o clique dá timeout. No teste use `locator.click(force=True)`
  (o usuário real clica normal). Conferir a galeria pelo `style.transform` dos cartões e pela classe do cartão do meio.

## Publicar uma Edge Function pelo painel do Supabase sem errar o texto (17/11)
- Abrir .../functions/<nome>/code no navegador do app (logado). O editor é Monaco: `monaco.editor.getModels()[0].getValue()`.
- Conferir que o publicado é igual à versão anterior do repositório por SHA-256 (crypto.subtle) — se não for, parar e comparar.
- A página do Supabase não deixa buscar arquivos de fora (CSP): aplicar a mudança como TROCAS de trechos (cada âncora tem de aparecer 1 vez)
  e conferir o SHA-256 do resultado contra o arquivo novo do repositório (`sha256sum`). Só então `executeEdits` + "Deploy updates" + confirmar.
- Recarregar a página e conferir o SHA-256 de novo; depois testar a função no ar com dados de TESTE.

## Aplicativo de janela (Studio) que abre o site e fala com o PC — 18/11/2026
- Playwright `launchPersistentContext` com `--app=URL` (canal msedge → chrome → Chromium do motor; `ignoreDefaultArgs: ['--enable-automation']`).
- Ponte: `context.exposeBinding(nome, (origem, ...))` e NÃO `exposeFunction` — o binding recebe `origem.frame.url()`; libere por origem
  (telas locais = tudo; plataforma = lista curta; resto = recusa) e só o quadro principal. Botão/aviso nas páginas por `addInitScript`
  que confere `location` antes de fazer qualquer coisa.
- Conta: quem confere é a página da plataforma (`BWSync.cliente().auth.getUser()` dentro do `page.evaluate`); para o programa volta só
  id/e-mail/nome. O token nunca sai da página.
- Render sem mexer no site: `page.on('download')` pega o `*.bwreels.zip`, `saveAs` em projetos/, descompacta e chama o render; outros
  downloads vão para a pasta Downloads com aviso.
- Teste: plataforma simulada por um servidor só do teste (env BWREELS_SITE_TESTE) + um segundo servidor "de fora" para provar a recusa.

## Aplicativo: uso sem internet e conectores de IA do usuário — 18/11/2026
- Offline sem servidor local: `context.route('**/*')` → `route.fetch()` (rede primeiro, grava no disco) e, se falhar, `route.fulfill` com a
  cópia (`~/.bw-reels/offline` ou a cópia do pacote). Só GET; só a plataforma + lista de CDNs; pedidos com Range passam direto.
  Chave do arquivo: plataforma = caminho (o ?v= novo substitui o velho); CDN = hash da URL inteira. Janela com `serviceWorkers:'block'`.
  Teste: visitar online, `server.close()` + `closeAllConnections()`, abrir de novo; e uma página que só existe na cópia do pacote.
- Conector com chave do usuário: arquivo local só de chaves; `status()` devolve final da chave, nunca a chave; provedor simulado por env
  (BWREELS_VIDEO_TESTE) guarda o corpo do pedido para conferir o formato; resultado grande volta pela ponte em base64.
- Instalador: Inno Setup em pasta de usuário (`{localappdata}`, `PrivilegesRequired=lowest`) porque o app grava projetos e node_modules
  na própria pasta; `robocopy /XD node_modules` monta a pasta limpa antes de compilar.

## Atualização automática do app BW (19/11/2026)
- Site publica `downloads/app-versao.json` {versao, data, pacote, sha256, bytes, novidades[{titulo, texto, abrir}]} com
  `python3 docs/automacoes/publicar-app.py --pacote <pasta limpa> --novidades <json>` (zip e json saem juntos — sha sempre bate).
- App: `checar` (fetch no-store, 9 s) → aviso; `atualizar` recusa pacote fora do site e sha diferente, extrai, acha a pasta com motor/app.mjs,
  copia sem projetos/node_modules/instalador/site-offline, roda npm install se o package.json mudou, grava novidades-pendentes.json e reabre.
- Teste: servidor simulado servindo json + zip; pasta "instalada" falsa por BWREELS_RAIZ_ATU_TESTE e HOME de teste; conferir projeto do usuário intacto,
  pacote adulterado recusado, tutorial uma vez só.

## BW SKILL — publicar uma skill para os usuários (19/11/2026)
1. Copie a skill validada para `bw-reels-studio/bw-skills/bw-<nome>/SKILL.md` com `name: bw-<nome>`.
2. Troque por {{CAMPOS}} tudo o que é do dono (pastas, clientes, câmeras, LUTs, presets, marca) e ponha no topo a seção "Configuração deste usuário".
   Script de substituição + `grep` dos nomes do dono; o teste recusa os conhecidos.
3. Escreva `TUTORIAL.md` (o que pedir, como ela trabalha, limites) e a entrada em `bw-skills/catalogo.json` (campos por etapa: pastas | trabalho | marca;
   tipos pasta, texto, cor, escolha; `obrigatorio`, `padrao`, `vazio`, `padraoPC`).
4. `node motor/teste-app.mjs` → copiar para o pacote → subir VERSAO → `publicar-app.py` (a skill chega pela atualização do app).


## Animação por código com fundo de recorte (20/11/2026)
- `node motor/animar.mjs x.html --chroma verde` → página com `html,body{background:transparent}` + `[data-fundo]{display:none}`, print PNG com
  omitBackground, e o ffmpeg põe sobre `color=c=0x00B140` (overlay format=auto → yuv420p). `--alfa` = mesmo PNG → prores_ks 4444 yuva444p10le.
- Verde de broadcast 00B140 (não 00FF00 puro: menos "vazamento" na pele). Azul 0047BB, magenta FF00FF para animações que usam verde.
- Sombra grande e desfoque semitransparente viram mancha esverdeada no recorte: no modo recorte use contorno fino (`html.bw-recorte .card{…}`).
- Conferir: recortar de verdade (`chromakey=0x00B140:0.13:0.06,despill=type=green` sobre cor escura) e medir o pixel do fundo (deve sumir) e do
  cartão (deve continuar branco). Colisão de cor: matiz a menos de 28° da cor do fundo em pixels opacos de 4 quadros (> 0,5% = aviso).


## Estúdio de motion (20/11/2026)
- Motor (assets/motion-motor.js): `montar(palco, projeto, {recorte})` cria um div por item uma vez; `seek(t)` só muda transform/opacity/filter
  (e as partes vivas: contador, chat digitando, gráfico, régua, lupa, piso). Valor = keyframes (curva do ponto de chegada) ∘ entrada (p 0→1) ∘
  saída (mesmo efeito invertido) ∘ loop. Efeito próprio = {chaves:{dx,dy,s,r,o,b,rx,ry:[[p,v,curva]]}}; em p=1 tudo neutro (o editor força).
- Mesma saída em 3 lugares: prévia (montar no editor), aparelho (BWMotion.html → BWReelsCelular.gerar) e PC (o app monta o HTML com o motor local).
- Teste de exportar no aparelho: buscar o blob do link de baixar com fetch dentro da página → base64 → ffprobe + pixel do canto (fundo de recorte).


## Telas em movimento (20/11/2026)
- Transição "com a mídia dentro": para cada peça, `ctx.save(); transformar(peça); clip(polígono no lugar final); desenharCenaNova(); ctx.restore()` —
  a imagem anda junto com a peça (cacos, mosaico, tiras). Clip sem transformação = a peça só "revela" (persiana, cata-vento, círculo).
- Aleatório das peças com semente pelo id da cena (mulberry32) → o mesmo quadro sempre igual.
- Batida: energia RMS em blocos de 10 ms → diferença positiva (início de nota) → autocorrelação entre 60/180 e 60/70 s; cenas = 1, 2 ou 4 batidas.
- Exportar com filmagem: BWReelsCelular.gerar({desenhar: async (t, ctx, w, h) => { await videosNoTempo(t); BWTelas.desenhar(ctx, P, t, w, h, fonte) }}).
- Teste: imagens de cor lisa por cena → pixel do MP4 no meio de cada cena e no meio da transição (duas cores); WebM no Chromium de teste.


## Ferramentas no estilo Adobe + tela fixa (20/11/2026)
- `assets/bw-ferramentas.js`: `BWFerr.barra({el, alvos, ferramentas:[{id,tecla,nome,icone,dica}], aoTrocar})`, `BWFerr.atalhos({"ctrl+k": fn, "delete": fn})`
  (a função devolve `false` quando não fez nada, para a tecla seguir), `BWFerr.contexto(raiz, seletor, el => ({titulo, itens}))`,
  `BWFerr.menu(x, y, itens, titulo, porToque)`, `BWFerr.ajuda(titulo, linhas)`, `BWFerr.telaFixa({wrap, grade, palco, rola, some, aviso, aoMedir})`.
- Num editor novo: (1) carregar o arquivo antes do JS do editor; (2) no pointerdown da área de trabalho, olhar `BWFerr.atual()` antes de tudo
  (h = arrastar a rolagem, z = zoom no ponto, c = cortar no ponto, t = criar texto no ponto); (3) tirar o keydown antigo do editor.
- Onde já existe arrastar por "segurar o dedo" (Telas), o menu do celular é "segurar e SOLTAR sem mexer" tratado pelo próprio arrastar.
- Teste: teclas com `pg.keyboard.press` depois de `document.activeElement.blur()`; botão direito = `pg.mouse.click(x, y, button="right")`;
  segurar o dedo = CDP `Input.dispatchTouchEvent` touchStart → esperar → touchEnd; item de menu por texto exato/regex (um rótulo continha o outro).
- Tela fixa no PC: conferir com a tela do dono (1534×816) que a prévia não fica minúscula — título da página some, aviso vira toast, nome da
  ferramenta some abaixo de 1700 px; painel de baixo com no máximo 36vh.

## Ambientes PJ × PF (20/11/2026)
- **Provar que dois ambientes não se misturam:** antes de lançar no ambiente A, guardar o TEXTO de todas as chaves do ambiente B
  (`ks.map(k => localStorage.getItem('bw_' + k + '_v1') || '').join('§')`); lançar; comparar o texto de novo. Igual = nada cruzou.
  Vale para tela, agenda e função chamada direto (`__lanc.criar('casa_gasto', …)` na aba PJ tem de RECUSAR).
- **Testar página que exige login sem conta de verdade:** rota do Playwright devolve um supabase-js falso COM sessão e troca o bw-sync.js por um
  arquivo vazio só nessa página (senão a sincronia mexe nos dados locais do teste). Chart.js também é simulado (`window.Chart = function(){…}`).
- **Tirar um módulo de dentro de uma página gerada (pacote MOD):** recortar o trecho por texto num script, com `assert s.count(a) == 1` em cada
  troca; trocar as dependências (`MOD['core/…']`) por funções pequenas iguais; rodar `node --check`; depois os testes antigos do módulo.
- **Teste antigo de um motor que mudou de página:** servir pela rota do teste a página nova com um atributo trocado (agenda em modo "tudo")
  em vez de reescrever 34 checagens.

## App BW junto com o site (regra de 20/11/2026)
1. `unzip downloads/BW-Reels-Studio.zip` numa pasta de trabalho → mexer em motor/app.mjs (VERSAO, DESTINOS), app/index.html (cartões),
   motor/offline.mjs (PAGINAS), instalador.iss (AppVersion, UTF-8 com BOM), TUTORIAL.md.
2. site-offline.zip = todos os .html da raiz + assets/ (sem .mp4) + icons/ + manifest.json, milhas.json, noticias.json, vfs_fonts.js + versao.txt.
3. Teste: `ln -s /opt/npm-tools/node_modules/playwright-core node_modules/playwright-core` e `node motor/teste-app.mjs`; apagar node_modules e
   projetos/motion-* antes de empacotar. O teste conta as ferramentas (.fer) e usa a versão atual em 3 linhas.
4. `python3 docs/automacoes/publicar-app.py --pacote <pasta> --novidades docs/automacoes/novidades-app-X.json`.
5. PC do dono: device_request_folder_access em ~/Videos/bw-reels-studio; device_commit_files em 2 chamadas (≤ 50 arquivos; .claude é recusado, tudo bem);
   computer use no Explorador (modo clique): Vídeos → bw-reels-studio → dois cliques em "5 - GERAR INSTALADOR EXE"; ~60 s depois o
   instalador\BW-Setup.exe muda de data (device_list_dir); device_stage_files traz o arquivo; `strings -el` mostra a versão.
6. Tutorial em PDF: markdown → HTML → Chromium (page.pdf A4).

## Editor de vídeo estilo CapCut (21/11/2026)
- **Estudar um app de referência sem copiar:** ler a pasta instalada (DLLs, pastas de efeitos, modelos) para entender a ARQUITETURA, navegar
  nele por computer use para ver o COMPORTAMENTO (painel que muda com a seleção, camadas que nascem com o conteúdo, níveis de chroma) e
  escrever tudo de novo do nosso jeito. Nada de arquivo, ícone ou texto deles no site.
- **Efeito de imagem que precisa valer no celular:** shader WebGL + plano B em 2D com a MESMA conta (getImageData já vem sem pré-multiplicar);
  o teste desenha uma imagem de faixas, roda os dois e compara pixel a pixel (`BWCor._2d`, `BWChroma._2d`). Medir na prévia com
  `getImageData` num ponto de cada faixa; ponto em fração da tela (fx, fy), nunca em pixel.
- **Provar o tratamento de som:** sinal de teste no ffmpeg (`aevalsrc=0.03*sin(2*PI*50*t)+0.03*sin(2*PI*1000*t)`) → exportar duas vezes
  (cru e tratado) → `ffmpeg -af lowpass=f=120,volumedetect` (zumbido) e `highpass=f=500,volumedetect` (tom) → comparar a diferença tom−zumbido
  e o `max_volume`. O que o WebAudio faz na prévia sai igual no arquivo porque a gravação lê o mesmo nó MESTRE.
- **Painéis livres num editor novo:** passar o editor para `BWFerr.telaFixa({…, painelLer, painelGravar})` (opcional: `soltos`, `nomeRola`,
  `alturaPropria`); dar `data-bwf-nome` a cada painel; nunca apagar o painel inteiro com innerHTML (desenhar num corpo dentro dele).
  Teste: docs/testes/teste_paineis.py (esconder, ＋, descolar, arrastar, recarregar, encaixar, esticar pela beirada, altura de baixo, celular).
- **Janela para o 2º monitor:** `window.open` + `<video>` com `canvas.captureStream(30)` e botão de tela cheia na própria janela; o Playwright
  pega a janela com `ctx.expect_page()` e confere `video.srcObject.getVideoTracks().length`.


## Editor de vídeo: arrastar, camadas dinâmicas e prévia (22/11/2026)
- Teste com mouse REAL (docs/testes/teste_video_arrastar.py): `mouse.move/down` + vários `move` com 15 ms + `up`; Alt/Ctrl + rodinha com
  `keyboard.down("Alt")` + `mouse.wheel`. Toque pelo CDP (`Input.dispatchTouchEvent`): segurar 320 ms antes de mexer; para chegar a um alvo fora
  da tela, deixar o dedo parado na borda (vários touchMove no mesmo ponto) até o alvo aparecer, tirar o dedo da borda e só então medir o alvo.
- Coordenadas: pegar a caixa do alvo DEPOIS de qualquer scroll_into_view de outro elemento (no celular a biblioteca e a linha do tempo não cabem juntas).
- Arraste próprio na biblioteca: bloquear `dragstart` (imagens), engolir o clique logo depois de soltar, fantasma com pointer-events:none e
  escondido durante o elementFromPoint.
- Zoom da prévia só por CSS (`transform` com origem 0 0 no canvas, `overflow:hidden` no pai): getBoundingClientRect já devolve o tamanho com zoom,
  então as contas de arrastar o take na prévia continuam certas; o vídeo exportado e o captureStream não mudam.


## Layout de app por cima de um editor que já existe (22/11/2026)
- Não reescrever o editor: um módulo à parte (assets/ve-app.js) liga uma classe no <html> ANTES do editor carregar, espera o editor ficar pronto
  (__veProntoOk) e MOVE os elementos que ele já desenha para a casca nova (os ouvintes continuam valendo, porque o elemento é o mesmo); os botões
  da casca só fazem `document.getElementById(id).click()` nos botões antigos. Painel de ajustes em grupos: cada grupo com data-g e a folha esconde
  os outros por classe; MutationObserver no corpo dos ajustes refaz o filtro e a faixa de ferramentas quando a seleção muda.
- Agulha parada no meio: `#veRolo{padding:0 var(--meio)}` (o padding da direita conta na rolagem), laço de rAF que põe scrollLeft = T × PPS quando
  ninguém está rolando, e o scroll do dedo chama irPara(scrollLeft / PPS) (marcar a rolagem feita pelo código para não virar "dedo").
- Teste com toque de verdade (CDP Input.dispatchTouchEvent): tocar em parte VISÍVEL do elemento (botões fixos por cima), segurar 0,9 s para o menu,
  e checar com getClientRects + visibility que a folha mostra SÓ o grupo pedido.


## App BW com cara de software (22/11)
- Detectar o app nas páginas do site: o app injeta `window.BW_APP` antes de tudo (addInitScript); `modos.js` (no <head> de toda página) põe
  `html.bw-no-app` e o CSS some com `.so-web`. Teste local: `pg.add_init_script("window.BW_APP={versao:'x'}")`.
- Abertura sobre a tela: `.nucleo.cheia{position:fixed;inset:0}`; tirar a classe mostra o conteúdo por baixo (mesmo canvas, ResizeObserver refaz a medida).
- Globo de pontos sem biblioteca: `npm i world-atlas topojson-client d3-geo` numa pasta temporária, `geoContains(land,[lon,lat])` para cada ponto
  de uma esfera de Fibonacci de 7000, guardar só os índices em base36 com diferença (~4 KB) e refazer os pontos no navegador.
- Testes do app com a abertura: `goto(URL + '?r=' + Date.now() + '#pc')`.


## IA em níveis com reserva (bw-ia, 22/11)
- Cliente manda `nivel`; servidor percorre `CADEIAS[nivel]`; 401 = para na hora (chave); outro erro = próximo modelo; junta os motivos de TODOS no `detalhe`.
- Resposta traz `{texto, modelo, nivel, reserva}` → a tela mostra quem respondeu (evento `bw-ia-modelo`, BWIA.ultimo()).
- Publicar pelo painel do Supabase: ler o texto do editor (Monaco), comparar SHA-256 com o repositório, executeEdits com o texto todo, conferir SHA, Deploy updates, confirmar
  o aviso (às vezes o primeiro clique não pega: recarregar e conferir o SHA de novo).
- Teste com Playwright: `evaluate` de uma expressão que termina em função EXECUTA a função — use sempre `() => { … }`.


## Sonda antes de consertar "bug sem descrição" (22/11)
- O dono disse só "bugs ao adicionar mídia": escrever uma SONDA (docs/testes/_sonda.py, apagar depois) que faz todos os caminhos — importar vários tipos
  (vídeo bom, imagem, som, arquivo quebrado, .heic falso), tocar em cada item, PC e celular — e imprime o estado (MID, clipes, folha aberta, erros).
  O que pareceu "funcionar" no código (o clipe entrava) era bug de uso (a folha continuava aberta) e silêncio (arquivo que não abre).
- Testar um arquivo que o navegador não abre: 20 KB de bytes aleatórios com extensão .mp4/.heic.

## Layout de app no celular para um editor que já existe (22/11 — Motion, mesmo jeito do editor de vídeo)
1. Um arquivo `assets/<x>-app.js` que vem ANTES do editor: liga `html.<x>-app` (≤ 900 px ou toque ≤ 1180 px; `?layout=app|classico` para testes).
2. O editor expõe uma API (seleção, tocar, tempo, px por segundo, cortar/duplicar/apagar…) e dispara um evento quando a seleção ou o painel mudam.
3. A casca (grade com `grid-template-columns:minmax(0,1fr)`) EMPRESTA a prévia e a linha do tempo; as folhas emprestam o painel e filtram UMA seção
   (só as de cima: `:scope > .grupo`), devolvendo tudo ao lugar ao fechar.
4. Agulha parada no meio: `padding: 0 50%` na pista, `scrollLeft = T × pps` num rAF quando ninguém está rolando, e rolar = `ver(scrollLeft/pps)`;
   no editor, toda conta de ponteiro usa o início do tempo zero (borda + padding).
5. Toque: dedo em barra não escolhida ROLA (o editor sai cedo do pointerdown para toque); click escolhe; segurar = menu (BWFerr.contexto).
6. Teste com toque real (CDP Input.dispatchTouchEvent) a 390 e 820 px + PC; os testes de função antigos abrem com `?layout=classico`.

## Álbum 3D: cartões com foto/vídeo em 3D no canvas 2D (22/11)
- Motor = `assets/album-motor.js`. Cada MODELO é só `quadro(t, n, D, A, o)` → `{cam, pecas}`; modelo novo = um `mod({...})` na lista.
  Peça: `m` (índice da mídia; −1 = peça lisa com `cor`), posição/giro, `w/h` em unidades (lado MENOR da tela = 2), `curva`/`curvaY`
  (dobra), `tras` + `trasEixo` (verso com outra mídia), `uv` (pedaço da imagem — base dos efeitos em peças), `uvZoom`, `op`, `sombra`, `escuro`.
- Projeção normalizada: em z = 0 a escala é sempre 1, então `dist` só muda a FORÇA da perspectiva — para afastar/aproximar use `cam.zoom`
  (helper `A.fit(raio, o, k)`). Erro de 22/11: a colagem "abria" mudando dist e não mudava nada.
- Textura afim em células (2×2 plano, 10 colunas com curva) por TRIÂNGULOS; para não aparecer risco na diagonal, o recorte de cada triângulo
  é ALARGADO pela distância centro→lado (não raio do vértice). Sombra/luz NÃO vai triângulo por triângulo (dobra nas emendas = listras):
  cada peça é montada numa CAMADA do tamanho da tela, escurecida com `source-atop` célula a célula e colada com a opacidade dela.
- Conferir no olho: folha com 7 quadros por modelo (página com o motor + Playwright → JPG). 45 modelos revisados assim antes do teste.
- Teste `docs/testes/teste_album.py`: pixel da 1ª foto no centro do efeito de tela cheia, take de vídeo no 4º, todos os modelos desenhando com
  mídia, fundo de chroma no canto, MP4 gerado com a cor certa no tempo certo (ffprobe/ffmpeg).

## Arrastar com escolha (22/11 — editor de vídeo e Motion)
- Durante o arraste só MOSTRE (aviso com pointer-events:none). Ao soltar, guarde o estado do arraste (`a.ini`, `a.trOrig`, `a.keys`) e abra um
  painel com botões; só o clique aplica. Cancelar (Esc, toque fora depois de 250 ms) restaura o estado guardado.
- "Em cima" = sobreposição ≥ 60% do MENOR dos dois takes E o ponteiro dentro do outro take; abaixo disso, encostar (fim do vizinho ou antes dele, o mais perto que estiver livre).
- Ação escolhida → `tudo()` + `gravarHist()` na hora (um passo do desfazer).
- Transição pela agulha: procurar o take com `anteriorDe(c)` cujo `c.ini` está a ≤ max(0,12 s, 14 px) de T; marcar o ◆ no relógio (`marcarEmenda` só parado).
- Teste: `pg.mouse.down` + passos + `pg.mouse.up`, ler `#veDicaArr` ANTES do up, conferir que nada mudou, clicar `[data-esc=…]`, desfazer.

## Arquivos do usuário em bucket privado + página pública sem login (22/11)
- Bucket privado; o dono assina pelo SDK (`createSignedUrl`) — a regra de leitura dele precisa casar (bw_evento_meu).
- Visitante com link secreto: Edge Function com `SUPABASE_SERVICE_ROLE_KEY` (o próprio Supabase põe na função) confere o token na tabela,
  lista SÓ a pasta certa e devolve `createSignedUrls` de 1 h. Verify JWT desligado (a chave publishable não é JWT) — quem vale é o token.
- Criar função nova pelo painel: Edge Functions → Deploy a new function → Via Editor → `monaco.editor.getModels()[0].setValue(texto)` +
  conferir SHA-256 → nome → Deploy → Settings: desligar "Verify JWT" e Save.
- Endereços públicos antigos guardados nos dados: não migrar; o leitor (`urlSegura`) reconhece o formato e troca por link temporário.
- Teste no ar: subir arquivo de TESTE numa pasta registrada, conferir público=400, assinado=200, função com token=200 e token falso=404, e apagar tudo.


## Modelos de Reels a partir de referências (22/11)
- Assistir as referências em FOLHAS DE QUADROS (`ffmpeg -vf "fps=20/D,scale=144:-1,tile=10x2"`) e listar os FORMATOS que se repetem
  (terminal digitando, passo com ícone, painel, catálogo, Comenta PALAVRA) — o modelo é o formato, não o vídeo.
- Tipo novo de cena = um `case` no plano.mjs (Studio) + CSS no html.mjs + regra no validar.mjs + campos na aba CENA (reels.js/reels.html,
  inclusive na lista de ouvintes) → `python3 motor/gerar-motor-web.py assets/reels-motor.js` → `node motor/exemplos-web.mjs <site> ids…`.
- Digitação determinística: span monoespaçado com `max-width: calc(var(--p) * var(--n) * 1ch)` e tween de `p` (nada de setInterval).
- Revisar cada exemplo numa folha de quadros ANTES de publicar (pegou o feixe por cima do título e o pico falso do gráfico).
- Álbum com peças coplanares (livro): `sobre`/`nivel` na peça para a ordem de pintura não depender da média de profundidade.


## Instalar IA de terceiros no PC do usuário (receita que funcionou — gerador 3D, 22/11)
1. Etapas gravadas em disco (estado.json) que RETOMAM; log real de cada comando na tela; faixa vermelha com o motivo + COPIAR O LOG.
2. Achar programas fora do PATH (pastas padrão) e usar o caminho real; FAIXA de versão (não só mínimo); recusar a versão da loja (WindowsApps).
3. Ler a ÁRVORE do repositório do modelo antes de restringir o download (o pipeline carrega mais pastas que o checkpoint principal).
4. Biblioteca que o projeto não fixa = PINOS em GRUPO num comando só, aplicados depois do `pip install -e .`; o TENTAR DE NOVO refaz a etapa dos pinos.
5. Diagnóstico separa erro de VERSÃO (ImportError/cannot import name) de erro de REDE (ConnectionError, Max retries, Failed to resolve).
6. Aviso de dependência do pip não é falha: o teste de prova no fim é quem decide.


## Biblioteca de modelos + animação em canvas (convites, 22/11)
- Modelo pronto = combinação de opções da própria ferramenta (sub, estilo, paleta, par de fontes, caixa, animação). Miniatura: trocar o estado global
  por um instante, chamar o MESMO render com dados de exemplo e devolver no `finally`; pintar as miniaturas aos poucos (setTimeout entre uma e outra).
- Animação: tudo depende só de t (pseudoaleatório por índice `h(i)`, nunca Math.random); camadas "fundo" (atrás do texto) e "frente".
- Laço da prévia em requestAnimationFrame, pausado com a aba escondida e durante a geração do vídeo; nada de gravar() por quadro.
- Vídeo: `BWReelsCelular.gerar({desenhar(t, ctx, w, h){ ctx.drawImage(render(w,h,t),0,0) }})`; teste confere ffprobe + 2 quadros diferentes.
- Revisão no olho: folha com TODOS os itens/efeitos e TODAS as miniaturas antes de publicar (achou a lua com contorno de círculo inteiro e o rodapé escuro nos modelos claros).


## Biblioteca integrada entre ferramentas (22/11)
- Uma ferramenta que reaproveita o acervo das outras (personagens, objetos, desenhos) lê pelas APIs já existentes (BWPersonagensProntos,
  BWConviteAnim, BWPersonagens, BWCriacoes) e copia a imagem para data: no aparelho (canvas; crossOrigin "anonymous" nas do Supabase).
  Assim o projeto não depende de endereço de fora (vídeo no aparelho e app do PC sem internet).
- A aba inicial não pode carregar nada de fora; teste com as imagens do Supabase SIMULADAS (PNG local com Access-Control-Allow-Origin).
- Item animado novo: teste que monta, vai a t=0,05 e t=1,6 e compara o innerHTML (parado = erro) + folha de quadros para conferir o desenho.


## Mídia pesada no navegador sem travar (22/11)
- Elemento de mídia só para ler (duração/capa): criar → ler → `pause(); removeAttribute("src"); load()` SEMPRE (sucesso, erro e prazo).
- Contar players vivos no teste: gancho no setter `HTMLMediaElement.prototype.src` + `removeAttribute` (init script do Playwright).
- Linha do tempo: criar o <video> do clipe só perto da agulha e soltar quando fica longe; exportação anda no tempo e o pool acompanha.
- Codec pelo arquivo: ler 4 MB do começo e do fim (Blob.slice) e procurar hvc1/hev1/avc1/av01/apcn.
- Próximo nível (para arquivos de qualquer câmera): PROXY 720p H.264 gerado pelo ffmpeg no app BW do PC (NVENC), edição com o proxy e
  exportação com o original.

## Prévia leve no editor de vídeo (22/11/2026)
- Canvas da prévia em tamanho reduzido (≤ 1280 px no lado maior) enquanto se edita; tudo desenhado em % de W/H, então só a nitidez muda.
- Antes de exportar/salvar quadro: `tamanhoReal(true)` (redimensiona e redesenha na hora); no fim (e em todo retorno de erro) `tamanhoReal(false)`.
- Tamanho do projeto = `tamReal()`; `cv.width` é o da prévia. Teste: projeto 1450×2000 → prévia ≤ 1280 e tamanhoReal(true) = 1450×2000.
- Mais leve ainda = PROXY (cópia 720p feita fora do navegador, ex.: `ffmpeg -hwaccel cuda -i in.mp4 -vf scale=-2:720 -c:v h264_nvenc -preset p1 -c:a copy proxy.mp4`).

## Proxy, exportação profissional e "a tela é o assunto" (22/11/2026)
- PROXY no navegador: `<video>` escondido tocando a 1,5–2× + `requestVideoFrameCallback` → canvas → `VideoFrame` → `VideoEncoder` (H.264, quadro-chave a cada 0,5 s,
  esperar `encodeQueueSize` baixar) → mux MP4 do reels-celular; som por `decodeAudioData` (≤ 1,5 GB) → `AudioEncoder` AAC, com Opus de reserva. Editar = proxy;
  exportar = original (soltar os `<video>` e reabrir com o arquivo), no tamanho do preset, e voltar. Teste: ffprobe do proxy + do arquivo exportado.
- Janela de exportar: presets em tabela (resolução pelo lado curto, fps, Mbps, AAC); codecs pelo `MediaRecorder.isTypeSupported`; WAV pelo MESTRE (ScriptProcessor,
  RIFF 24 bits); sequência de imagens = andar T, esperar os `seeked`, `toBlob`, gravar na pasta (File System Access) ou num .zip com JSZip de CÓPIA LOCAL carregado só ali.
- Seções com seta numa ferramenta nova: `BWDobras.agrupar(coluna, ".titulo", "prefixo_", ["seções_fechadas"])` + `BWDobras.todas(coluna, true|false)` nos botões
  ABRIR/FECHAR TUDO; caixa redesenhada por innerHTML → `data-seta-livre` e `BWDobras.aplicar(caixa)` depois de desenhar.
- Tela fixa + painéis: `BWFerr.telaFixa({wrap, grade, palco, rola:[], painelLer, painelGravar, aoMedir})`; dar `data-bwf-nome` ao painel; aoMedir ajusta o canvas pela
  altura do palco. O painel escondido já vira BORDA e há ⛶ SÓ A TELA (Tab).

## Ler o som de um vídeo grande sem carregar o arquivo (22/11/2026)
- MP4/MOV: achar o `moov` pulando caixas pelo cabeçalho (16 bytes por blob.slice), ler só o moov; na trak com hdlr "soun": stsd (formato, canais,
  bits, taxa; v1 +16 bytes, v2 com taxa float64 e flags), stsz/stsc/stco|co64 → lista de pedaços (início, bytes); elst → pular o aquecimento.
- PCM: DataView com a ordem certa (twos/in24/in32/fl32 = big-endian salvo caixa enda; sowt = little; ipcm = pcmC). QuickTime v0 com stsz=1 → bytes =
  quadros × bytes por quadro. AAC: AudioDecoder com description = ASC do esds (tag 5), um EncodedAudioChunk por amostra.
- Ler em blocos juntando só pedaços quase colados (< 64 KB); conferir contra `ffmpeg -f f32le` (mesmas amostras) e medir quanto do arquivo foi lido.


## Rolagem presa e conteúdo inalcançável (22/11)
- `python3 docs/testes/teste_rolagem.py [paginas...]` — todas as páginas em 1280 (rodinha) e 390 (dedo pelo CDP). Acusa: erro ao abrir, elemento visível
  abaixo da tela sem rolagem que chegue nele, lista com overscroll 'contain' dentro de outra que rola, caixa que não anda com o gesto no MEIO dela.
- Conta se o gesto funcionou somando o scrollTop de TODOS os elementos + scrollY (uma folha/modal por cima da página também conta como "rolou").
- Validar o detector: rodar com o arquivo ANTIGO (`git show HEAD:arquivo > zz_antigo.html`) e ver a falha aparecer; apagar o zz_ depois.
- Folhas/menus que só abrem com toque não aparecem na varredura: o teste da ferramenta abre a folha e arrasta o dedo EM CIMA das miniaturas.
- Bateria inteira: um teste por vez (vários usam a mesma PORTA); o app BW precisa de `ln -s /opt/npm-tools/node_modules/playwright-core node_modules/`
  no pacote (teste_motion usa o motor do pacote) e, no fim, apagar node_modules e projetos/motion-*.

## Testar no aparelho de verdade (22/11)
- Mandar o dono abrir **Configurações → 🩺 TESTES E SOLUÇÕES** e tocar em ▶ TESTAR TUDO; ele copia o relatório (ou ENVIAR → aparece em bw_feedback, tipo
  Problema, texto começando com "[TESTES E SOLUÇÕES]"). Para checar uma página nova lá dentro: entrar na lista FERR do assets/testes.js.
- Gancho de erro: modos.js (1º script de toda página) avisa window.parent.__bwDiag quando a página está num iframe da teste.html.
- Validar a própria página: docs/testes/teste_testes.py cria uma página com defeito de propósito (zz_diag_ruim.html) e confere que tudo é acusado.

## Um componente só para o ecossistema (23/11/2026)

Quando o dono diz "padroniza isto em tudo", a receita que funcionou:

1. **Contar quantos existem hoje.** `grep -oh "\.[a-z0-9-]*aviso[a-z0-9-]*\|\.[a-z0-9-]*toast[a-z0-9-]*" *.html assets/*.css | sort -u`
   achou 18 classes; depois, um script que lê o CSS e marca quais são `position:fixed` separou os 8 **flutuantes**
   (aviso de ação) das 10 **mensagens de formulário** (ficam ao lado do campo). São coisas diferentes: só os flutuantes
   viram componente único; as mensagens ganham uma classe padrão (`.bw-msg`) para quem for escrever campo novo.
2. **Escrever o componente num arquivo que TODA página já carrega** (layout.js + brightway.css), com API curta
   (`BWAviso(t)`, `.erro(t)`, `.fechar()`, `ms = 0` para ficar). Cores pelas variáveis dos modos (`--m-card`, `--m-txt`,
   `--m-ok`, `--m-erro`) — senão o componente não acompanha os 28 modos de aparência.
3. **Não apagar a função local da ferramenta: fazê-la delegar.** `function aviso(t, erro) { BWAviso(t, erro ? "erro" : ""); }`
   em uma linha. Nenhuma chamada muda de lugar, o risco é mínimo e o teste confere que o corpo chama o BWAviso.
4. **Caçar o conteúdo ruim junto com a forma.** O print do dono mostrava o texto cortado: 21 avisos passavam de 85 letras
   (um tinha 150). `re.finditer(r'(?:aviso|toast)\("([^"]{86,})"', s)` acha todos; cada um virou frase curta.
5. **Travar com o vigia E com teste.** Vigia: recusa `function aviso/toast` que crie elemento ou se esconda por setTimeout
   sem passar pelo BWAviso, e recusa aviso com mais de 85 letras — e a prova de que o vigia pega: estragar o arquivo de
   propósito, rodar, conferir a reclamação e restaurar. Teste (`docs/testes/teste_aviso.py`): mede no navegador que a caixa
   fica a menos de 40 px do centro, que `elementFromPoint` no meio dela NÃO devolve o aviso (não bloqueia o toque),
   que some sozinho, que o `⏳` fica, e que nenhuma ferramenta mostra o aviso antigo.
6. **Consertar os testes que liam o elemento antigo**: `grep -l "ve-aviso\|ag-toast\|…" docs/testes/*.py` — quatro testes
   apontavam para o id/classe velhos; trocar por `#bwAviso` no mesmo commit (regra 193).

Armadilha: classe de ESTADO não serve para destacar botão. `＋ IMPORTAR` usava `.on` (verde de "ligado") e `NOVO` usava
`.perigo` (vermelho) só para chamar atenção — no meio dos botões grafite pareciam outro aplicativo. O destaque é `.pri`.

## Análise de segurança — CSP, selo de integridade e bibliotecas (23/11/2026)
1. **Achar bibliotecas com falha**: listar todo `cdn.jsdelivr.net/npm/<pacote>@<versão>` do site; para cada uma, procurar o CVE da versão (pdf.js,
   node-forge, xlsx eram os pontos fracos). `npm i` das versões novas numa pasta de trabalho + `npm audit` = 0.
2. **Selo (SRI)**: sha384 do arquivo do TARBALL do npm (`base64(sha384)`); no navegador do dono, `fetch` do endereço do CDN + `crypto.subtle.digest`
   para provar que é o MESMO arquivo e que vem com `access-control-allow-origin: *`. Arquivo `.min.js` que não existe no pacote é gerado pelo jsDelivr
   (bytes podem mudar) → usar o que existe. Fixar `@2` numa versão exata: comparar o hash de `@2` com o da versão exata (iguais = nada muda hoje).
3. **CSP**: levantar os hosts de fetch/import/worker/modelos (grep de `https://` em fetch/import/src + modelAssetPath/langPath + o que as bibliotecas
   buscam sozinhas: Transformers.js → huggingface.co e *.hf.co; Tesseract 5 → tessdata.projectnaptha.com; MediaPipe → storage.googleapis.com).
   Testar com `document.addEventListener('securitypolicyviolation', …)` no add_init_script em TODAS as páginas (o bloqueio acontece antes da rota
   do Playwright, então dá para ver mesmo com a rede abortada) + a varredura + os testes das ferramentas com mais recursos de fora.
4. **Banco ao vivo (dono logado no navegador do app)**: SQL Editor do Supabase → `setValue` no monaco + Run; conferência de RLS de todas as
   tabelas (pg_class.relrowsecurity + pg_policies). Teste de visitante: fetch cru só com a chave publishable em página SEM sessão.
5. Pacote do app: só os arquivos que mudaram + site-offline.zip; o teste do motor do PC precisa de BW_STUDIO apontando para a cópia com
   node_modules (symlink do playwright de /opt/npm-tools — o npm baixa uma versão cujo navegador não está instalado aqui).

## Editor de vídeo de mesa: efeitos, cor em nós, qualidade parado, placa, trecho (23/11/2026)
1. **Efeito com movimento**: guardar a força como função do tempo do take (fixo/entra/sai/pulsa/chaves) e desenhar a curva com a agulha em cima.
   Teste = PIXEL no começo e no fim do take (sem cor no começo, mais vivo no fim), não "o botão respondeu" (teste_video_efeitos.py).
2. **Cor em nós (WebGL)**: um passe por nó, alvo de 16 bits quando `EXT_color_buffer_float` existe; a cadeia vai de "in" até "out" seguindo as
   ligações (nó solto não entra). Testar a CONTA de cada nó no pixel (teste_cor_nos.py). CRIAR LUT = passar a tabela neutra (N·N × N) pelos
   mesmos nós e ler de volta — `readPixels` vem de baixo para cima. Conta-gotas lê a imagem ANTES do nó de balanço.
3. **Qualidade total parado**: ~0,5 s sem mexer → canvas no tamanho real + player à parte com o ORIGINAL (solto ao sair). Teste com um proxy FALSO
   de outra cor: parado mostra a cor do original, tocando mostra a do proxy (teste_video_nitido.py). Variável usada no 1º desenho vai no topo do arquivo.
4. **Placa de vídeo**: navegador = WebGL `WEBGL_debug_renderer_info` (nome), `mediaCapabilities.decodingInfo().powerEfficient` (leitura),
   `VideoEncoder.isConfigSupported({hardwareAcceleration:"prefer-hardware"})` (gravação); placa REAL = app BW (`nvidia-smi`). Se o navegador
   está na integrada e o PC tem dedicada: no app, gravar `HKCU\Software\Microsoft\DirectX\UserGpuPreferences` (valor = caminho do .exe do Edge/
   Chrome, dado `GpuPreference=2;`) — é a mesma chave da tela "Elementos gráficos", sem administrador; achar o .exe por `App Paths` no registro +
   pastas padrão. Fora do app: link `ms-settings:display-advancedgraphics`. A janela do app nasce com `--force_high_performance_gpu`.
   Conferido no PC do dono (RTX 3050 Laptop): depois do toque e de reabrir, o painel disse TUDO OK com a NVIDIA.
5. **Trecho I/O na exportação**: uma função só (`trecho()`) devolve [entrada, saída] ou null e TODA saída (vídeo, áudio, imagens) usa ela.
   Teste confere o ARQUIVO no ffprobe (duração do trecho, cor certa no 1º e no último quadro).
6. **Atalhos**: a lista do BWFerr.atalhos é separada por vírgula → vírgula e ponto se escrevem "virgula" e "ponto".

## iPhone: travar o gesto de voltar pela borda (24/11/2026)
- Sintoma: "clicando um pouco mais forte, a tela vai para o lado". É o gesto de voltar/avançar do Safari, que começa na borda. overscroll-behavior,
  corpo fixo e touch-action não pegam esse gesto.
- Receita: `BWFerr.travarBorda({so: "classe-do-html"})` na casca de app. touchstart em capture com passive:false; dedo a ≤ 24 px da borda →
  preventDefault. Toque curto (≤ 12 px, ≤ 700 ms) volta como `new MouseEvent("click", {clientX, clientY, bubbles})` no alvo original (não use .click():
  ele chega com 0,0 e quebra quem compara a posição). Deixe de fora input/textarea/select (o iPhone só abre o seletor de arquivo com o dedo direto).
- Teste: toque CDP (Input.dispatchTouchEvent) a 6 px da borda e espiar `defaultPrevented` num ouvinte de window em bolha; botão de teste na borda
  conta cliques (1 só); arrasto a partir da borda = 0 cliques; meio da tela e campo na borda = não cancelados (docs/testes/teste_borda.py).
- Limite: a barra de baixo (ir para a tela de início) é do sistema. Para travar tudo durante uma gravação: Acesso Guiado do iOS.

## Arrastar algo que redesenha o próprio alvo (24/11/2026)
- Sintoma: arraste de toque que para depois do 1º movimento (régua que estica a linha do tempo). Causa: o handler muda a altura das camadas, o editor
  redesenha a régua com innerHTML, e os touchmove seguintes ficam presos ao nó removido — não sobem nem para o document.
- Receita: pointer events no contêiner estável (#veRolo) com setPointerCapture assim que a direção é decidida; um touchmove em capture no mesmo contêiner
  só para impedir a rolagem própria (faixaFirme). Teste: toque CDP com 8 movimentos e conferir a altura FINAL, não só a primeira mudança (docs/testes/teste_regua.py).
- Toque duplo como botão direito: contextmenu sintético 30 ms depois do 2º toque (docs/testes/teste_toque_duplo.py confere que o menu abre e nada foi escolhido).

## App do PC como programa (Electron) sem jogar fora o app antigo (24/11/2026)
- Separe o NÚCLEO (ações, downloads, avisos, atualização) da janela: `criarNucleo(o)` recebe `paginas()`, `fechar()`, `relancar()` e trabalha com
  um "pg" que tem evaluate/goto/url/waitForSelector/waitForTimeout. A Page do Playwright já serve; no Electron, um adaptador do webContents
  (`executeJavaScript('(' + fn + ')(' + JSON.stringify(arg) + ')', true)`, `loadURL` engolindo ERR_ABORTED).
- Download no Electron: `item.setSavePath(temp)` na hora; o `saveAs(alvo)` espera o `done` e copia.
- Testar aqui: `npm i electron` (o postinstall baixa do GitHub; se não vier, `node node_modules/electron/install.js`), `xvfb-run -a node motor/teste-electron.mjs`
  com Playwright `_electron.launch`. Navegação dentro de `evaluate` derruba o contexto: dispare com `.catch(() => {})` e espere o `waitForURL`.
- Python que recorta texto com `s.index(a):s.index(b)`: confira que `b` vem DEPOIS de `a` (o "ligado = true" do topo veio antes e o replace de ''
  encheu o arquivo inteiro). Recorte sempre com `s.index(b, ia)`.

## App Android com Capacitor sem copiar o site (24/11/2026)
- Projeto em `docs/app-android` (Capacitor 8.6): `server.url` aponta para o site no ar; `appendUserAgent "BW-Android/1.0"` deixa o site saber que está no app
  (modos.js carrega `assets/bw-android.js`: some `.so-web` e o login Google; `<a download>` com blob:/data: vira arquivo no cache + COMPARTILHAR).
- O .apk é montado no GitHub Actions (`.github/workflows/android.yml`) — aqui a rede recusa SDK/Gradle/Maven. Push de workflow funciona; a API de Actions
  (segredos, execuções) é recusada pelo proxy: segredos são cadastrados pelo dono no navegador.
- Sem internet: `montar-offline.py` copia o site + bibliotecas de CDN (`cdn.json`, nomes por hash: URL sem extensão colidia com pasta) para `assets/offline`;
  `BwClient` (subclasse de BridgeWebViewClient) só entrega a cópia quando o ConnectivityManager diz "sem rede" e injeta o Capacitor por reflexão (`jsInjector`).
- Assinatura: sem `BW_KEYSTORE_B64`/`BW_KEYSTORE_SENHA` cada build usa a chave de teste da máquina → atualizar exige desinstalar. Chave gerada com keytool
  (RSA 4096, alias bw, 100 anos); a cópia do dono fica em `Vídeos\bw-reels-studio\CHAVE-ANDROID` (fora do instalador: /XD no GERAR-INSTALADOR e FORA no publicar-app).
- Teste: `docs/testes/teste_android.py` (Capacitor simulado: classe bw-android, Google escondido, blob de 7 MB gravado em 3 pedaços iguais, Share chamado).

## Programa BW (Electron) vira o principal (24/11/2026)
- O npm pode trazer `node_modules/electron` SEM `dist/` (download do postinstall falhou calado): rodar `node node_modules/electron/install.js` direto.
- Troca de principal sem quebrar ninguém: o atalho de sempre (BW-REELS.bat) abre `programa\BW.exe` quando existe; senão abre o antigo e monta o programa por trás.
  `--classico` abre o antigo. Ao conferir no PC do dono, procure o BW.exe pelo `computer_list_apps`/`resolve_access` (dá o caminho real) — ele estava em
  `Vídeos\bw-reels-studio\programa`, não na cópia instalada em AppData.


## Integrar ferramentas no editor de vídeo de forma LEVE (24/11)
- Regra: dentro da linha do tempo, tudo é DESENHO DIRETO NO CANVAS do editor, cada quadro só de t. Nunca montar HTML por quadro (foreignObject do
  BW Reels é pesado) — o motion foi refeito em canvas (assets/ve-motions.js, ~0,5–0,8 ms por quadro em 540×960, medido no teste).
- Item novo = tipo "elemento" com prefixo no `el` ("mo:", "cv:", "cvfx:", "emo:") → um ramo em desenharElemento + um cartão na biblioteca (data-arr "l:<el>").
  Transição de outra ferramenta = chave nova em TRANS ("tl:<id>") que renderiza A e B em buffers trocando o `cx` por um instante.
- Miniaturas: desenhadas UMA vez (cache em memória) — a biblioteca não anima à toa.
- Folha de quadros de todos os modelos antes de publicar (pegou "1.500" virando "2" e etiquetas cortadas nas bordas).
- Antes de criar id novo, grep no HTML da página (regra 96): alQtd já existia no Álbum 3D.

## Segurança de site estático no GitHub Pages (25/11/2026)
1. **Sem cabeçalhos**: GitHub Pages não deixa mandar X-Frame-Options, HSTS nem CSP por cabeçalho; no <meta> o navegador ignora frame-ancestors,
   sandbox e report-uri. Clickjacking = bloco anti-moldura no <head> (style que esconde o html + script que só mostra se `self===top` ou se
   `top.location.origin===location.origin`; senão tenta `top.location.href = location.href`). Vem logo depois da CSP, antes de tudo.
2. **Teste de verdade**: dois servidores (127.0.0.1 = o site, localhost = "o golpista" com um <iframe> do site) → a página fica `display:none` no quadro
   de fora e no quadro com sandbox; aparece sozinha e num quadro do mesmo site; o servidor de fora registra o Referer (deve ser só a origem). O Chrome
   bloqueia o pulo da aba de quadro de fora sem gesto do usuário — por isso o que protege é a página ficar EM BRANCO (docs/testes/teste_moldura.py).
3. **security.txt**: `.well-known/security.txt` com Contact, Expires (≤ 1 ano), Preferred-Languages, Canonical, Policy; o Jekyll do Pages pula pasta com
   ponto → `_config.yml` com `include: [.well-known]`. Vigia confere o Expires.
4. **Mesma origem**: tudo em `usuario.github.io/<repo>/` é o MESMO site para o navegador (localStorage e sessão juntos). Antes de pôr script de fora
   (analytics, chat) em qualquer repositório desse usuário, lembrar que ele lê a sessão da plataforma.
5. **App BW depois de outra sessão**: partir SEMPRE do pacote publicado (`unzip downloads/BW-Reels-Studio.zip`), nunca da cópia local — conferir
   `downloads/app-versao.json` antes de subir a versão.

