# O que dá para aproveitar do Tripo Studio (tripo3d.ai) no app BW
**20/11/2026 · Claude · pedido do dono: "analise esta página e faça um relatório do que podemos extrair de ferramentas e ideias"**

> A página do estúdio (studio.tripo3d.ai) não abre para leitura automática — é um app que exige login.
> O levantamento abaixo saiu da documentação oficial (tripo3d.ai/product-doc, blog e página de preços) e de
> análises do produto de set–nov/2026. **Nada foi copiado**: o que vale aqui é a IDEIA, não o código nem o visual.

## 1. O que o Tripo é
Um espaço de trabalho no navegador que transforma **texto, uma foto ou 2–4 fotos de ângulos diferentes em um
modelo 3D texturizado**, e continua no mesmo lugar com segmentação em partes, retopologia, texturização,
rigging (esqueleto) e animação — sem pular entre quatro programas. Exporta GLB, USD, FBX, OBJ, STL e 3MF.
É o mesmo tipo de produto que a BW está montando (uma esteira inteira numa página só), só que para 3D.

## 2. Ideias que dão para aplicar JÁ no BW (sem nada de 3D)

| Ideia do Tripo | Como fica no BW | Tamanho |
|---|---|---|
| **Esteira no topo** (Gerar → Textura → Retopo → Segmentar → Rig → Exportar), sempre visível | Nossos editores já têm as etapas, mas espalhadas. Uma faixa no topo mostrando em que passo a pessoa está e o que falta | pequeno |
| **"Make Image Better"** — melhora a foto de referência ANTES de gerar | O editor de fotos já tem ✦ AUTO. Plugar o mesmo tratamento no Criador IA, no Quadro e nos Personagens antes de mandar a imagem para a IA (resultado melhor pelo mesmo preço) | pequeno |
| **Magic Brush** — pinta na área e a IA muda só ali | Já temos máscara pintada (editor de fotos) e IA criativa. Juntar os dois: pinta a mancha → descreve → só aquele pedaço volta trocado. *Conferir antes se o FLUX da Cloudflare aceita máscara; se não aceitar, recortar a área, mandar e colar de volta* | médio |
| **Segmentação inteligente em 1 clique** (modelo vira partes editáveis, com nível de detalhe) | O editor de fotos já carrega o segmentador do MediaPipe. Virar **CAMADAS AUTOMÁTICAS**: 1 toque separa pessoa / cabelo / roupa / fundo, cada um já como camada com máscara própria | médio |
| **Biblioteca de +100 animações** aplicáveis a QUALQUER personagem com esqueleto | No Estúdio de motion, os efeitos são por item. A ideia é uma biblioteca grande com prévia animada, e a MESMA animação aplicável a qualquer item ou personagem (inclusive os do BW Reels) | médio |
| **Lock Frame** — congela a pose para exportar parado | Exportar um quadro da animação como JPG/PNG (capa do reel, thumbnail do YouTube, arte para post) direto do Estúdio de motion e das Telas | pequeno |
| **DCC Bridge** — manda o modelo para o Blender com os materiais | A ponte que faria diferença aqui: exportar o corte do editor de vídeo como **.edl / .xml para o Premiere** (e o .srt que já existe). O trabalho pesado continua no Premiere, mas a decupagem sai pronta do app | grande |
| **Assets** — tudo num lugar, com coleções e histórico de edição | Já existe "✨ MINHAS CRIAÇÕES" no editor de vídeo, mas cada ferramenta guarda o seu. Uma biblioteca única da conta (imagens, personagens, artes, vídeos) com pastas | médio |
| **Re-roll grátis / rollback grátis** quando o resultado sai ruim | **Bug nosso achado nesta análise:** em `bw-ia-imagem` o contador (`bw_ia_img_contar`) roda ANTES de chamar a Cloudflare. Se o filtro recusa a imagem ou a rede falha, a pessoa **perdeu 1 das 15 do dia sem receber nada**. Devolver o crédito quando não vem imagem | pequeno |
| **Tabela de custo por operação** bem à vista (gerar 15, rigging 20, animação 20, segmentar 30…) | Mostrar "restam N imagens de IA hoje" antes de a pessoa pedir, e quanto custa cada ação | pequeno |
| **Modos Standard / Ultra** | Já temos (Rápida / Alta / Tamanho real) | feito |
| **Geração em lote** | Já temos no Criador IA (3 opções de uma vez); falta no Quadro de História | pequeno |

## 3. O que o Tripo faz e o BW não faz: 3D de verdade
Para o nicho da BW (evento corporativo, transmissão, reels), o 3D serve em 4 coisas concretas:

1. **Personagem consistente.** Hoje a área PERSONAGENS gera os 5–6 ângulos com IA 2D e **reza para sair a mesma
   pessoa** (o diário já registra isso como limitação). Com um modelo 3D, o personagem é o mesmo objeto girando:
   acabou o problema de consistência. É o maior ganho técnico da lista.
2. **Maquete do palco / estrutura de LED** para mostrar ao cliente antes do evento — e um giro de 10 s vira post.
3. **Produto do cliente girando** no reel (o que hoje só dá para fazer filmando).
4. **Logo em 3D** para abertura. (Para logo, extrusão feita no próprio app tende a sair melhor que IA — é um
   desenho chapado, não uma foto.)

**Como ligaríamos, se o dono quiser:** o Tripo tem API por uso (1 crédito = US$ 0,01, sem assinatura; um modelo
texturizado sai por ~US$ 0,20–0,30; rigging 20 créditos, animação 20, segmentação 30). Dois caminhos, ambos já
usados aqui:
- **chave do usuário no PC** (padrão Runway/fal.ai do app BW) — ninguém paga pelos outros; ou
- **Edge Function com a chave da BW** (padrão bw-ia-imagem) — mais simples para o usuário, mas a BW paga a conta.

**Trabalho de verdade:** mostrar 3D no site precisa de um visualizador (three.js / model-viewer) e de o sw.js
liberar a CDN. É uma ferramenta nova, não um ajuste.

## 4. Cuidados
- **O plano grátis do Tripo não serve para trabalho de cliente:** os modelos ficam **públicos, sob CC BY 4.0 e
  não comerciais**; uso comercial e modelo privado só nos planos pagos (Pro US$ 20/mês, 3.000 créditos).
- Não copiar a tela, os textos nem a marca deles — só a ideia de ferramenta.
- 3D gerado por IA sai bom para post e maquete, não para cinema: sempre cabe uma limpeza.

## 5. O que eu faria primeiro (ordem sugerida)
1. **Devolver o crédito quando a IA não entrega imagem** (hoje perde-se 1 das 15) — 30 min, conserta um prejuízo real.
2. **Melhorar a foto antes de mandar para a IA** nas 4 ferramentas que enviam imagem — resultado melhor, mesmo custo.
3. **Pincel mágico** (pintar a área → IA muda só ali) no editor de fotos.
4. **Camadas automáticas** (1 toque separa pessoa/fundo/roupa em camadas com máscara).
5. **Biblioteca única de criações da conta**, com pastas.
6. Decidir sobre 3D: se sim, começa pelo personagem 3D consistente, com chave do usuário no app BW.

## Fontes
- Documentação oficial: tripo3d.ai/product-doc (preços e créditos por operação), blog "Introducing Tripo Studio",
  "How to use Magic Brush", tutorial "Workflow Demo: Tripo Quick Start Guide", página de preços.
- Análises: Tooliverse (21/10/2026), AIToolsReview (set/2026), Voyager (19/11/2026), DEV Community (out/2026),
  media.io (11/09/2026), northpennnow (abr/2026, matéria patrocinada — dados do próprio fabricante).
