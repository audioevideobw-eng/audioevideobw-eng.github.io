import random, math, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
OUT = "docs/tutoriais/exemplos"
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"; FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"; FM = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"
def fnt(p, s): return ImageFont.truetype(p, s)
recibos = [
 ("RESTAURANTE SABOR DE MINAS", "Almoço da equipe — 6 pessoas", [("Prato executivo x6", "174,00"), ("Bebidas", "42,00")], "216,00", "18/11/2026"),
 ("POSTO BOA VIAGEM", "Combustível — montagem do evento", [("Gasolina comum 38,2 L", "236,84")], "236,84", "19/11/2026"),
 ("LOCADORA LUZ & SOM", "Aluguel de 2 refletores LED", [("Refletor LED 200W x2", "320,00"), ("Frete", "40,00")], "360,00", "20/11/2026"),
]
random.seed(7)
for i, (loja, desc, itens, total, data) in enumerate(recibos, 1):
    W, H = 900, 1200
    # fundo da MARCA (regra 237): azul-marinho escuro em degradê, limpo — nada de "mesa de madeira"
    fundo = Image.new("RGB", (W, H)); d = ImageDraw.Draw(fundo)
    for y in range(H):
        k = y / H; d.line([(0, y), (W, y)], fill=(int(11 + 9 * k), int(18 + 14 * k), int(34 + 30 * k)))
    pw, ph = 560, 860
    pap = Image.new("RGBA", (pw, ph), (255, 255, 255, 255)); p = ImageDraw.Draw(pap)
    y = 40
    p.text((pw/2, y), loja, font=fnt(FB, 28), fill=(30, 30, 30), anchor="mm"); y += 40
    p.text((pw/2, y), "CNPJ 12.345.678/0001-90 · Belo Horizonte", font=fnt(F, 16), fill=(70, 70, 70), anchor="mm"); y += 34
    p.line([(30, y), (pw-30, y)], fill=(120, 120, 120), width=2); y += 24
    p.text((pw/2, y), "RECIBO", font=fnt(FB, 30), fill=(20, 20, 20), anchor="mm"); y += 46
    p.text((40, y), "Cliente: Produtora Exemplo", font=fnt(F, 20), fill=(40, 40, 40)); y += 34
    p.text((40, y), desc, font=fnt(F, 18), fill=(60, 60, 60)); y += 50
    for nome, v in itens:
        p.text((40, y), nome, font=fnt(FM, 20), fill=(30, 30, 30)); p.text((pw-40, y), "R$ " + v, font=fnt(FM, 20), fill=(30, 30, 30), anchor="ra"); y += 36
    y += 10; p.line([(30, y), (pw-30, y)], fill=(120, 120, 120), width=2); y += 22
    p.text((40, y), "TOTAL", font=fnt(FB, 26), fill=(10, 10, 10)); p.text((pw-40, y), "R$ " + total, font=fnt(FB, 26), fill=(10, 10, 10), anchor="ra"); y += 60
    p.text((40, y), "Pago em " + data + " · PIX", font=fnt(F, 18), fill=(60, 60, 60)); y += 120
    p.line([(120, y), (pw-120, y)], fill=(80, 80, 80), width=2); y += 10
    p.text((pw/2, y + 14), "Assinatura do emitente", font=fnt(F, 16), fill=(90, 90, 90), anchor="mm")
    sh = Image.new("RGBA", (pw + 40, ph + 40), (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle([20, 30, pw + 20, ph + 30], fill=(0, 0, 0, 170)); sh = sh.filter(ImageFilter.GaussianBlur(18))
    ang = random.uniform(-2.2, 2.2)
    sh = sh.rotate(ang, expand=True, resample=Image.BICUBIC); pr = pap.rotate(ang, expand=True, resample=Image.BICUBIC)
    fundo.paste(sh, ((W - sh.width)//2 + 6, (H - sh.height)//2 + 10), sh); fundo.paste(pr, ((W - pr.width)//2, (H - pr.height)//2), pr)
    fundo.save(f"{OUT}/recibo-{i}.jpg", quality=82)
def cab(c, titulo, sub):
    w, h = A4
    c.setFillColor(HexColor("#0E1B33")); c.rect(0, h - 90, w, 90, fill=1, stroke=0)
    c.setFillColor(HexColor("#E8B54A")); c.setFont("Helvetica-Bold", 22); c.drawString(40, h - 50, "PRODUTORA EXEMPLO")
    c.setFillColor(HexColor("#FFFFFF")); c.setFont("Helvetica", 10); c.drawString(40, h - 70, "Audiovisual para eventos · Belo Horizonte · (31) 90000-0000")
    c.setFillColor(HexColor("#111111")); c.setFont("Helvetica-Bold", 20); c.drawString(40, h - 135, titulo)
    c.setFont("Helvetica", 11); c.setFillColor(HexColor("#555555")); c.drawString(40, h - 155, sub)
def linhas(c, y, txts, size=11):
    c.setFont("Helvetica", size); c.setFillColor(HexColor("#222222"))
    for t in txts: c.drawString(40, y, t); y -= size + 7
    return y
c = canvas.Canvas(f"{OUT}/orcamento.pdf", pagesize=A4)
cab(c, "ORÇAMENTO ORC-2026-014", "Cliente: Construtora Horizonte · Convenção de vendas · 12/12/2026")
y = linhas(c, A4[1] - 200, ["Transmissão ao vivo com 3 câmeras e diretor de corte", "Telão de LED 4 x 2,5 m com operador", "Gravação na íntegra e entrega em 48 h"])
c.setFont("Helvetica-Bold", 16); c.drawString(40, y - 30, "Total: R$ 8.500,00"); c.setFont("Helvetica", 11); c.drawString(40, y - 52, "50% na assinatura do contrato e 50% no dia do evento.")
c.showPage(); c.save()
c = canvas.Canvas(f"{OUT}/contrato.pdf", pagesize=A4)
cab(c, "CONTRATO DE PRESTAÇÃO DE SERVIÇOS", "Contratante: Construtora Horizonte · Contratada: Produtora Exemplo")
linhas(c, A4[1] - 200, ["1. OBJETO: transmissão ao vivo e telão de LED da convenção de vendas em 12/12/2026.", "2. VALOR: R$ 8.500,00, conforme o orçamento ORC-2026-014.",
  "3. PAGAMENTO: 50% na assinatura e 50% no dia do evento.", "4. MONTAGEM: no dia 11/12/2026, a partir das 14h.", "5. ENTREGA: gravação na íntegra em até 48 horas."])
c.showPage()
cab(c, "CONTRATO DE PRESTAÇÃO DE SERVIÇOS", "Página 2 — assinaturas")
linhas(c, A4[1] - 200, ["6. As partes concordam com as condições acima.", "Belo Horizonte, 25 de novembro de 2026."])
w, h = A4
c.setStrokeColor(HexColor("#333333")); c.line(w/2 - 150, h/2 - 52, w/2 + 150, h/2 - 52)
c.setFont("Helvetica", 10); c.setFillColor(HexColor("#555555")); c.drawCentredString(w/2, h/2 - 68, "Construtora Horizonte — contratante")
c.line(w/2 - 150, h/2 - 190, w/2 + 150, h/2 - 190); c.drawCentredString(w/2, h/2 - 206, "Produtora Exemplo — contratada")
c.showPage(); c.save()
