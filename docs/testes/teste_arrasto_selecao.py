"""Arrastar para aplicar NÃO seleciona textos (24/11, dono: "trave as seleções quando estiver em movimento de arrasto… em todas as ferramentas").
layout.js trava a seleção (html.bw-arrastando) quando o arrasto começa num item arrastável; selecionar texto comum e digitar continuam normais."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8937"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
SELTXT = "String(getSelection())"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    for pag, item in [("video.html", "#veLib [data-arr]"), ("motion.html", "button:visible"), ("telas.html", "button:visible"), ("fotos.html", "button:visible")]:
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + pag); pg.wait_for_timeout(1800)
        if pag == "video.html": pg.click('#veAbas [data-aba="texto"]'); pg.wait_for_timeout(300); item = "#veLib [data-texto]"
        el = pg.locator(item).first
        try: el.scroll_into_view_if_needed(timeout=2000)
        except Exception: pass
        bb = el.bounding_box()
        if not bb: ok(False, f"{pag}: item para arrastar"); pg.close(); continue
        x0, y0 = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        pg.mouse.move(x0, y0); pg.mouse.down()
        for k in range(1, 16): pg.mouse.move(x0 + 25 * k, y0 + 18 * k); pg.wait_for_timeout(20)
        durante = pg.evaluate("document.documentElement.classList.contains('bw-arrastando')"); sel = pg.evaluate(SELTXT)
        pg.mouse.up(); pg.wait_for_timeout(200)
        ok(durante and sel.strip() == "", f"{pag}: arrastando, a seleção fica travada e nenhum texto é selecionado ({sel[:30]!r})")
        ok(not pg.evaluate("document.documentElement.classList.contains('bw-arrastando')"), f"{pag}: ao soltar, a trava sai")
        ok(not er, f"{pag}: sem erros {er[:1]}"); pg.close()
    pg = ctx.new_page(); pg.goto(BASE + "politica.html"); pg.wait_for_timeout(800)
    bb = pg.locator("p").first.bounding_box(); pg.mouse.move(bb["x"] + 2, bb["y"] + 5); pg.mouse.down(); pg.mouse.move(bb["x"] + 200, bb["y"] + 5, steps=8); pg.mouse.up()
    ok(len(pg.evaluate(SELTXT).strip()) > 3, "texto comum continua podendo ser selecionado com o mouse")
    b.close()
print("FALHAS:", F[0]); sys.exit(1 if F[0] else 0)
