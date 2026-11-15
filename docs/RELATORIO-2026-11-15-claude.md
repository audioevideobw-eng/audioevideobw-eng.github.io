# Relatório — 14 e 15/11/2026 (Claude)

Brightway · https://audioevideobw-eng.github.io · app aberto para os primeiros testadores (7 contas em 15/11).

## 1. O que entrou de novo

| Novidade | Onde | Como funciona |
|---|---|---|
| **Categoria MARKETING** | menu lateral, Início (seção 04), `marketing.html` | Galeria: legenda de post, ideias, e-mail ao cliente, revisar, traduzir, resumir, transcrição, legendas de vídeo |
| **ASSISTENTE DE TEXTO** | `assistente.html` | Motores, nesta ordem: IA Brightway (nuvem) → IA do Chrome → IA no aparelho (só computador) → modelos prontos |
| **IA BRIGHTWAY** | Supabase → Edge Function `bw-ia` (código em `docs/supabase/functions/bw-ia/index.ts`) | Chama a Groq (`openai/gpt-oss-120b`, reserva `gpt-oss-20b`; áudio `whisper-large-v3-turbo`). Chave só no Secret `GROQ_API_KEY`. Só usuário logado. Limite por conta: 60 textos/dia e 200 pedaços de áudio de 3 min/dia (tabela `bw_ia_uso`, função `bw_ia_contar`, só service_role — `docs/sql/2026-11-15-ia-nuvem.sql`) |
| **TRANSCRIÇÃO E LEGENDAS** | `transcricao.html` | IA Brightway (padrão) ou "No aparelho" (Whisper local). Texto + .srt/.vtt, gravar do microfone, SALVAR / ENVIAR (menu de compartilhar do celular), última transcrição guardada no aparelho |
| **FERRAMENTAS DE PDF** | `pdf.html` | Juntar, separar, assinar desenhando, fotos → PDF, marca d'água — tudo no aparelho (pdf-lib / pdf.js) |
| **NOTÍCIAS automáticas** | `.github/workflows/noticias.yml` + `docs/automacoes/noticias.py` | A cada 2 h lê RSS (Valor, g1, InfoMoney, Agência Brasil) e publica `noticias.json` (autorizado pelo dono em 15/11). 1ª execução: 30 manchetes de 5 fontes |

## 2. Defeitos encontrados no teste geral e corrigidos (15/11)

| # | Defeito | Correção |
|---|---|---|
| 1 | **Eventos:** "Marcar recebido" lançava a receita **2×** no fluxo (`ev_` + `receita_`) | Fica só `receita_`; a sincronia apaga o `ev_` antigo (nas 7 páginas que têm `modules/sincronia`) |
| 2 | **Eventos:** excluir não pedia confirmação e deixava a receita no fluxo | Confirmação + limpeza do fluxo |
| 3 | **Recomendações:** dólar embutido (R$ 5,49) em vez do do dia (R$ 5,65) | Busca a cotação ao abrir |
| 4 | **Fluxo de caixa:** ✕ dos lançamentos automáticos dava erro (id sem aspas); valores crus | "auto" nos automáticos, R$ 1.200,00, datas dd/mm/aaaa, confirmação ao apagar |
| 5 | **Comprovante IA:** `$ is not defined` no boot | Import do `$` |
| 6 | Selo LOGADO faltando em Recomendações e Configuração | Incluído (Recomendações agora também sincroniza) |
| 7 | IA no aparelho no **celular Android** gerava texto embaralhado | Detector de texto quebrado → modelo pronto; IA local só no computador |
| 8 | Tradutor do Chrome travava em alguns navegadores | Prazo de 3 s; tradução vai pela IA Brightway |
| 9 | Transcrição no celular: arquivo "não se concretizava" | SALVAR / ENVIAR + link de reserva + resultado guardado |
| 10 | Conversor de viagem "R$R$"; Ferramentas com título duplicado; Milhas dizia "lidas agora" | Corrigidos; Milhas mostra a data e avisa quando a referência está velha |

## 3. O que foi testado e passou

- **41 páginas** em 390 px (celular): 0 estouro de tela, 0 página vazia, 0 erro de JavaScript após as correções. Vigia: ✅.
- **Sincronia (itens de TESTE, todos apagados):** lançamento no fluxo → nuvem → Painel Financeiro; fixo mensal → 6 lançamentos → apagados junto; investimento USD → Painel de Investimentos (cotação ao vivo) → Recomendações; evento → registro de posse no banco → marcar/desmarcar recebido → excluir.
- **Comprovante IA:** recibo de teste lido certo (POSTO TESTE LTDA · R$ 185,70 · 12/11/2026).
- **IA Brightway:** legenda (800 pessoas certo), e-mail (R$ 8.500 e 50% na assinatura certos), tradução, ideias, revisão, resumo em tarefas. Transcrição: 3 min 40 s em 5 s, 49 legendas, emenda entre as partes certa.
- **PDF:** juntar (2+3 = 5 págs), separar (1-2, 5), marca d'água, fotos → PDF, assinatura.
- **Segurança:** visitante sem login recusado na IA; tabela `bw_ia_uso` fechada para o site; login sem erros em 24 h; `bw-ia` 34 pedidos OK.

## 4. Pendências

- [ ] **Dono — EVENTO SICOOB:** o fluxo tem "Evento: EVENTO SICOOB" R$ 2.500 como RECEBIDO, mas o evento está NÃO PAGO. Se recebeu: no evento, toque em **Marcar recebido** (o fluxo continua com R$ 2.500, agora como "Receita de evento"). Se não recebeu: apague a linha no fluxo… ela aparece como "auto"; nesse caso me avise que eu removo. (Não alterei dado financeiro real sem confirmação.)
- [ ] **Milhas:** não existe fonte pública e automática do preço do milheiro (as compradoras só dão cotação individual). Hoje a referência é de 02/11 e a página avisa a idade. Opções: atualizar à mão de tempos em tempos, ou criar uma tela de ADM para lançar as cotações.
- [ ] Testes de segurança 2A/2B/3 com conta de teste (ver AGENTS.md).

## 5. Manual do usuário

`Brightway-Guia-do-usuario.pdf` (28 páginas, cópia em `docs/`): capítulo novo **09 · Marketing** (Assistente de texto, Transcrição e legendas), **Ferramentas de PDF**, Ferramentas atualizado, Fluxo ("auto"), Milhas (referência com data), Notícias (a cada 2 h), Segurança (IA Brightway e PDF no aparelho) e novas perguntas rápidas.
