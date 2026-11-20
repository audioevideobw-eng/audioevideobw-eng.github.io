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
