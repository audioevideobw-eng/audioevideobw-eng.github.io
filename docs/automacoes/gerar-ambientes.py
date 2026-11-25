#!/usr/bin/env python3
"""Gera as páginas dos dois ECOSSISTEMAS (decisão do dono, 20/11/2026): negocio.html = MINHA EMPRESA (PJ, azul) e casa.html = MINHA CASA (PF, verde).
As duas saem do MESMO molde: números do mês (assets/ambiente.js), os botões LANÇAMENTOS e PAINEL FINANCEIRO do ambiente, a AGENDA própria
(assets/agenda.js, <div id="bwAgenda" data-amb="pj|pf">) e as ferramentas que fazem sentido ali. Os cartões (ícone + nome) vêm de cartoes.json.
Mudou ferramenta ou molde? Rode na raiz:  python3 docs/automacoes/gerar-ambientes.py   (nunca edite negocio.html / casa.html na mão)."""
import html, json, os
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
CART = json.load(open(os.path.join(AQUI, "cartoes.json"), encoding="utf8"))
V_CSS, V_LAYOUT, V_AGENDA, V_AMB = 40, 83, 3, 1   # 23/11: estavam velhos (36, 75, 1) — conferir com o index.html antes de gerar

I_EMP = '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'
I_CASA = '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>'
I_LANC = '<path d="M4 8h13l-3-3M20 16H7l3 3"/>'
I_PAINEL = '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>'


def cartao(href, nome=None, de=None, adm=False):
    c = CART[de or href]
    return ('      <a class="bw-tool-card%s" href="%s" title="%s">%s<span class="nome">%s</span></a>'
            % (" so-admin" if adm else "", href, html.escape(c["title"], quote=True), c["ico"], nome or c["nome"]))


def secao(chave, titulo, cartoes, fechada=False):
    return ('  <section class="amb-sec">\n    <h3 data-seta="%s"%s>%s</h3>\n    <div class="bw-grid">\n%s\n    </div>\n  </section>'
            % (chave, ' data-seta-padrao="fechada"' if fechada else "", titulo, "\n".join(cartoes)))


AMBIENTES = {
    "pj": dict(arquivo="negocio.html", titulo="Minha empresa — Brightway", h1="MINHA <b>EMPRESA</b>", selo="PJ · PESSOA JURÍDICA", outro="pf", outro_href="casa.html",
               outro_nome="IR PARA MINHA CASA", outro_ico=I_CASA, lanc="LANÇAMENTOS PJ",
               lanc_title="Tudo o que entra e sai da empresa: negócio, eventos, cachês da equipe e fixos.",
               painel_title="Receita, lucro, clientes e pagamentos de eventos da empresa.",
               secoes=[("emp-gestao", "GESTÃO DA EMPRESA", [cartao("eventos.html"), cartao("equipe.html"), cartao("propostas.html"), cartao("preco.html"),
                                                             cartao("leitor.html"), cartao("eventos.html#cliBox")], False),
                       ("emp-crm", "CRM · CLIENTES", [cartao("captacao.html"), cartao("captacao.html#agente"), cartao("captacao.html#colar"),
                                                     cartao("captacao.html#link"), cartao("resultados.html")], False),
                       ("emp-mkt", "MARKETING", [cartao(h) for h in ["reels.html", "promptia.html", "personagens.html", "video.html", "motion.html", "telas.html", "album3d.html", "3d.html", "criador.html",
                                                                  "fotos.html", "transcricao.html", "assistente.html#legenda", "assistente.html#ideias", "assistente.html#email"]], False),
                       ("emp-ferr", "FERRAMENTAS DA EMPRESA", [cartao("pdf.html"), cartao("assistente.html"), cartao("dados.html"), cartao("configadm.html", adm=True)], True)]),
    "pf": dict(arquivo="casa.html", titulo="Minha casa — Brightway", h1="MINHA <b>CASA</b>", selo="PF · PESSOA FÍSICA", outro="pj", outro_href="negocio.html",
               outro_nome="IR PARA MINHA EMPRESA", outro_ico=I_EMP, lanc="LANÇAMENTOS PF",
               lanc_title="Tudo o que entra e sai da casa: gastos e receitas da família, contas a pagar, reserva e investimentos.",
               painel_title="Receitas, contas, gastos e o que sobrou no mês da casa.",
               secoes=[("casa-gestao", "GESTÃO DA CASA", [cartao("orcamento.html"), cartao("contas.html"), cartao("reserva.html"),
                                                        cartao("leitor.html?d=conta", "LER CONTA", de="leitor.html")], False),
                       ("casa-invest", "INVESTIMENTOS", [cartao(h) for h in ["investimentos-painel.html", "invest.html", "cambio.html", "milhas.html", "meta.html",
                                                                          "comparador.html", "alertas.html", "recs.html", "noticias.html"]], False),
                       ("casa-ferr", "FERRAMENTAS DA CASA", [cartao("viagem.html"), cartao("calc.html"), cartao("pdf.html"), cartao("dados.html")], True)]),
}

MOLDE = '''<!DOCTYPE html>
<html lang="pt-BR" data-amb="{amb}">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://cdn.sheetjs.com; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self' data: blob: https://zdtnetplvdonogmdvarx.supabase.co wss://zdtnetplvdonogmdvarx.supabase.co https://cdn.jsdelivr.net https://cdn.sheetjs.com https://open.er-api.com https://olinda.bcb.gov.br https://raw.githubusercontent.com https://storage.googleapis.com https://huggingface.co https://*.huggingface.co https://*.hf.co https://tessdata.projectnaptha.com https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net; frame-src 'self' blob: data: https://docs.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; manifest-src 'self'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style id="bwAntiMoldura">html{{display:none!important}}</style><script>(function(){{var ok=self===top;if(!ok){{try{{ok=top.location.origin===location.origin}}catch(e){{ok=false}}}}if(ok){{var s=document.getElementById("bwAntiMoldura");if(s)s.parentNode.removeChild(s)}}else{{try{{top.location.href=location.href}}catch(e){{}}}}}})();</script>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{titulo}</title>
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#06080D">
<link rel="icon" type="image/png" href="icons/favicon-64.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="Brightway">
<link rel="stylesheet" href="assets/brightway.css?v={v_css}">
<style>
.wrap{{max-width:1320px;margin:0 auto;padding:0 16px 120px}}
</style>
<script src="assets/modos.js?v=11"></script>
</head>
<body>
<header><div class="hd"><button id="btnVoltar" type="button" title="Voltar ao Início">‹</button><div id="userBox"></div></div></header>
<div class="wrap">
  <div class="amb-topo">
    <h1>{h1}</h1>
    <span class="amb-selo">{selo}</span>
    <a class="amb-troca" data-amb-cor="{outro}" href="{outro_href}"><svg viewBox="0 0 24 24" aria-hidden="true">{outro_ico}</svg>{outro_nome}</a>
  </div>
  <div class="amb-kpis" id="ambKpis" aria-live="polite"></div>
  <nav class="amb-principais" aria-label="Lançamentos e painel">
    <a class="amb-principal" href="lancamentos.html?a={amb}" title="{lanc_title}"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">{i_lanc}</svg></span><span class="nome">{lanc}</span></a>
    <a class="amb-principal" href="financeiro-painel.html?a={amb}" title="{painel_title}"><span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">{i_painel}</svg></span><span class="nome">PAINEL FINANCEIRO</span></a>
  </nav>
  <div id="bwAgenda" data-amb="{amb}"></div>
{secoes}
</div>
<script src="assets/layout.js?v={v_layout}"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.2/dist/umd/supabase.js" integrity="sha384-A97u3Qnt9GZHURO9YJZRe7VQgGUeFzcv6I1oIGnUTxQrCxnpQMwR0/G8F2zt9abZ" crossorigin="anonymous"></script>
<script src="assets/bw-sync.js?v=20261122"></script>
<script src="assets/agenda.js?v={v_agenda}"></script>
<script src="assets/ambiente.js?v={v_amb}"></script>
</body>
</html>
'''

for amb, a in AMBIENTES.items():
    pagina = MOLDE.format(amb=amb, v_css=V_CSS, v_layout=V_LAYOUT, v_agenda=V_AGENDA, v_amb=V_AMB, i_lanc=I_LANC, i_painel=I_PAINEL,
                          secoes="\n".join(secao(*s) for s in a["secoes"]), **{k: v for k, v in a.items() if k not in ("secoes", "arquivo")})
    open(os.path.join(RAIZ, a["arquivo"]), "w", encoding="utf8").write(pagina)
    print("✓", a["arquivo"], "gerado")
