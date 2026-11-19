#!/usr/bin/env python3
"""Gera casa.html (PAINEL DA GESTÃO DE CASA) a partir de lancamentos.html — mesma aparência e o mesmo assets/lancamentos.js,
ligado em modo casa (<body data-lc-modo="casa">: só casa, contas a pagar e reserva).
Mudou o lancamentos.html? Rode na raiz:  python3 docs/automacoes/gerar-casa.py   (nunca edite o casa.html na mão)."""
import os, re
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
s = open(os.path.join(RAIZ, "lancamentos.html"), encoding="utf8").read()


def troca(a, b):
    global s
    assert s.count(a) == 1, (a[:70], s.count(a)); s = s.replace(a, b)


def corta(ini, fim, novo=""):
    global s
    i = s.index(ini); j = s.index(fim, i) + len(fim); s = s[:i] + novo + s[j:]


troca("<title>Lançamentos — Brightway</title>", "<title>Gestão de casa — Brightway</title>")
troca("<body>", '<body data-lc-modo="casa">')
troca("<h1><b>LANÇAMENTOS</b> · tudo num lugar só</h1>", "<h1><b>GESTÃO DE CASA</b> · o dinheiro da família num lugar só</h1>")
corta('  <div class="lc-cx" id="lcFerr"', "\n  </div>\n", '''  <div class="lc-cx" id="lcFerr" style="margin-bottom:14px">
    <h3 data-seta="casa-atalhos">🏠 PÁGINAS DA CASA E FERRAMENTAS</h3>
    <div class="lc-linha" style="margin-top:0">
      <a class="lc-bt" href="orcamento.html" title="Receitas e despesas da família por categoria, com metas">📒 ORÇAMENTO FAMILIAR</a>
      <a class="lc-bt" href="contas.html" title="Contas com vencimento: luz, água, cartão…">🧾 CONTAS A PAGAR</a>
      <a class="lc-bt" href="reserva.html" title="Quanto já guardou e quanto falta para a meta">🏦 RESERVA DE EMERGÊNCIA</a>
      <a class="lc-bt" href="leitor.html?d=conta" title="PDF, foto ou código de barras da conta: lê e lança">📷 LER CONTA</a>
      <button class="lc-bt" type="button" id="lcFalar" title="Fale ou escreva: gastei 50 no mercado, pagar luz 180 dia 20…">🎙 FALAR COM O TIO CLÁUDIO</button>
      <a class="lc-bt" href="lancamentos.html" title="Casa, negócio, eventos e investimentos juntos">▤ TODOS OS LANÇAMENTOS</a>
    </div>
  </div>
''')
troca("SAÍDAS DO MÊS POR NICHO", "GASTOS DA CASA POR CATEGORIA")
troca("O QUE ESTES LANÇAMENTOS ALIMENTAM", "O QUE ESTES LANÇAMENTOS ALIMENTAM NA CASA")
troca("<h3>TODOS OS LANÇAMENTOS</h3>", "<h3>LANÇAMENTOS DA CASA</h3>")
s = re.sub(r'<p class="lc-nota">Cachê da equipe:.*?</p>', '<p class="lc-nota">Aqui entram só os lançamentos da casa (gastos e receitas da família, contas a pagar e reserva). Toque em ✓ MARCAR PAGA quando pagar uma conta; ✎ ALTERAR muda valor, data e para onde foi.</p>', s, count=1, flags=re.S)
corta('  <div class="lc-cx" id="lcFixos"', "\n  </div>\n")      # os fixos do negócio não são da casa
troca('placeholder="Procurar (nome, evento, categoria…)"', 'placeholder="Procurar (nome, categoria…)"')
assert "lcFixos" not in s and "fzAdd" not in s
open(os.path.join(RAIZ, "casa.html"), "w", encoding="utf8").write(s)
print("✓ casa.html gerado de lancamentos.html")
