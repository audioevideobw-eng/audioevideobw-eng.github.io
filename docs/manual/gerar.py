#!/usr/bin/env python3
"""Gera docs/Brightway-Guia-do-usuario.pdf.

Uso (na raiz do repositório):  python3 docs/manual/gerar.py
- Páginas que não mudaram vêm de docs/manual/base.pdf (manual de 15/11/2026, 28 páginas; 15/11 noite: + CRM e editor de fotos).
- Páginas novas/alteradas são HTML em docs/manual/paginas/ (estilo em docs/manual/estilo.css; telas em docs/manual/telas/,
  geradas por docs/manual/telas.py).
- O número do rodapé é a posição da página menos 1 (a capa não tem número). Nas páginas antigas o número é trocado por cima.
Para mudar o manual: edite/crie o HTML, ajuste a lista PLANO abaixo e rode este script (regra FECHAMENTO, etapa 4).
"""
import io, os, tempfile
from pypdf import PdfReader, PdfWriter
from playwright.sync_api import sync_playwright
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

AQUI = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(AQUI, "base.pdf")
SAIDA = os.path.abspath(os.path.join(AQUI, "..", "Brightway-Guia-do-usuario.pdf"))

# ("base", n) = página n (1 = capa) do base.pdf  ·  "arquivo.html" = página de docs/manual/paginas/
PLANO = [("base", 1), ("base", 2), ("base", 3), ("base", 4), ("base", 5),
         "04a-conhecendo-a-tela.html", "04b-agenda.html",
         "05a-meu-negocio.html", "05b-eventos.html", "05c-relatorios-pdf.html", "05d-gestao-de-pessoas.html", "05d2-equipes.html",
         ("base", 10),
         "05e-fluxo-de-caixa.html", "05f-caches-e-custos.html", ("base", 12),
         "06a-painel-financeiro.html"] + [("base", n) for n in range(14, 24)] + \
        ["09a-crm.html", "09b-funil.html", "09b2-pedido.html", "09c-indicadores.html", "09d-fotos.html", "09d2-fotos-marca.html", "09d3-criador.html"] + [("base", n) for n in range(24, 29)]

MODELO = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="../estilo.css"></head>
<body><div class="pagina">{corpo}<div class="rodape"><span>BRIGHTWAY · Guia do usuário</span><span>{n}</span></div></div></body></html>"""


def fonte():
    for c in ["/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
        if os.path.exists(c):
            pdfmetrics.registerFont(TTFont("Rodape", c)); return "Rodape"
    return "Helvetica"


def numero_por_cima(pagina, n, nome_fonte):
    """Cobre o número antigo do rodapé (canto inferior direito) e escreve o novo."""
    w, h = float(pagina.mediabox.width), float(pagina.mediabox.height)
    buf = io.BytesIO(); c = canvas.Canvas(buf, pagesize=(w, h))
    c.setFillColorRGB(1, 1, 1); c.rect(w - 75, 9, 50, 20, stroke=0, fill=1)
    c.setFillColorRGB(0.33, 0.34, 0.36); c.setFont(nome_fonte, 8.4)
    c.drawRightString(553.5, h - 826.4, str(n)); c.save(); buf.seek(0)
    pagina.merge_page(PdfReader(buf).pages[0])


def main():
    base = PdfReader(BASE)
    nome_fonte = fonte()
    tmp = tempfile.mkdtemp()
    pdfs_html = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = b.new_page()
        for pos, item in enumerate(PLANO, start=1):
            if isinstance(item, tuple):
                continue
            corpo = open(os.path.join(AQUI, "paginas", item), encoding="utf-8").read()
            html = os.path.join(AQUI, "paginas", "_tmp_" + item)
            open(html, "w", encoding="utf-8").write(MODELO.format(corpo=corpo, n=pos - 1))
            pg.goto("file://" + html); pg.wait_for_timeout(300)
            sobra = pg.evaluate("(()=>{const p=document.querySelector('.pagina');return p.scrollHeight-p.clientHeight})()")
            if sobra > 2:
                os.remove(html); raise SystemExit(f"{item}: o conteúdo passa da página em {sobra}px — encurte o texto ou as imagens")
            destino = os.path.join(tmp, item + ".pdf")
            pg.pdf(path=destino, format="A4", print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
            os.remove(html)
            r = PdfReader(destino)
            if len(r.pages) != 1:
                raise SystemExit(f"{item}: passou de 1 página ({len(r.pages)}) — encurte o texto ou as imagens")
            pdfs_html[item] = r.pages[0]
        b.close()
    w = PdfWriter()
    for pos, item in enumerate(PLANO, start=1):
        if isinstance(item, tuple):
            pag = base.pages[item[1] - 1]
            if pos > 1 and pos != item[1]:
                numero_por_cima(pag, pos - 1, nome_fonte)
            w.add_page(pag)
        else:
            w.add_page(pdfs_html[item])
    w.add_metadata({"/Title": "Brightway — Guia do usuário", "/Author": "BW Audiovisual"})
    with open(SAIDA, "wb") as f:
        w.write(f)
    print(f"✓ {SAIDA} — {len(PLANO)} páginas")


if __name__ == "__main__":
    main()
