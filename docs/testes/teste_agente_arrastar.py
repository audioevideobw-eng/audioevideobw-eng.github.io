#!/usr/bin/env python3
"""Teste local (22/11): Tio Cláudio — segurar e arrastar para outro lugar (toque pelo CDP e mouse), lugar lembrado no aparelho,
toque rápido continua abrindo, deslizar sem segurar não move. Página do robô no celular sem topo/frase e menu da caixa abrindo para cima.
Uso (na raiz): python3 docs/testes/teste_agente_arrastar.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
src = open(os.path.join(os.path.dirname(__file__), "teste_pede.py")).read()
exec(src.split("F = []")[0].replace("8831", "8832"))
F = []
def ok(c, m): print(("  ✓ " if c else "  ✗ ") + m); (None if c else F.append(m))
B = "http://127.0.0.1:8832/"
def centro(pg): return pg.evaluate("(()=>{const r=document.getElementById('bwAgente').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    print("=== 390px toque ===")
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(B + "index.html"); pg.wait_for_selector("#bwAgente", timeout=8000); pg.wait_for_timeout(800)
    ok(not pg.is_visible(".bw-topo") and not pg.is_visible("#bwSauda"), "celular: sem topo e sem a frase na página do robô")
    ok(pg.is_visible("#ambPortal") and pg.is_visible("#bpTexto") and pg.is_visible(".bw-abas"), "celular: robô, caixa e abas de baixo continuam")
    cdp = ctx.new_cdp_session(pg)
    def toque(t, x, y): cdp.send("Input.dispatchTouchEvent", {"type": t, "touchPoints": [] if t == "touchEnd" else [{"x": x, "y": y}]})
    x0, y0 = centro(pg)
    # deslizar sem segurar: não move
    toque("touchStart", x0, y0); toque("touchMove", x0 - 60, y0 - 60); toque("touchEnd", 0, 0); pg.wait_for_timeout(300)
    x1, y1 = centro(pg); ok(abs(x1 - x0) < 2 and abs(y1 - y0) < 2, "deslizar sem segurar não mexe no robô")
    pg.evaluate("document.querySelector('.bwg-p') && (document.querySelector('.bwg-p').hidden=true)")
    # segurar e arrastar
    toque("touchStart", x0, y0); pg.wait_for_timeout(450)
    ok(pg.evaluate("document.getElementById('bwAgente').classList.contains('bwg-arr')"), "segurar ~0,35 s pega o robô")
    for i in range(1, 11): toque("touchMove", x0 - 25 * i, y0 - 45 * i); pg.wait_for_timeout(16)
    toque("touchEnd", 0, 0); pg.wait_for_timeout(300)
    x2, y2 = centro(pg); ok(abs(x2 - (x0 - 250)) < 4 and abs(y2 - (y0 - 450)) < 4, f"robô foi para onde o dedo soltou ({x2:.0f},{y2:.0f})")
    ok(pg.evaluate("document.querySelector('.bwg-p') ? document.querySelector('.bwg-p').hidden : true"), "soltar não abre o painel")
    ok(pg.evaluate("JSON.parse(localStorage.getItem('ui_agente_pos'))") is not None, "lugar guardado no aparelho (ui_agente_pos)")
    pg.reload(); pg.wait_for_selector("#bwAgente"); pg.wait_for_timeout(800)
    x3, y3 = centro(pg); ok(abs(x3 - x2) < 3 and abs(y3 - y2) < 3, "continua no lugar depois de recarregar")
    pg.tap("#bwAgente"); pg.wait_for_timeout(300); ok(pg.is_visible(".bwg-p"), "toque rápido continua abrindo o Tio Cláudio")
    pr = pg.evaluate("(()=>{const r=document.querySelector('.bwg-p').getBoundingClientRect();return [r.top,r.bottom,innerHeight]})()")
    ok(pr[0] >= 0 and pr[1] <= pr[2], f"painel inteiro na tela ({pr})")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    # arrastar para cima das abas: fica acima delas
    x0, y0 = centro(pg); toque("touchStart", x0, y0); pg.wait_for_timeout(450); toque("touchMove", x0, 840); toque("touchEnd", 0, 0); pg.wait_for_timeout(200)
    ab = pg.evaluate("document.querySelector('.bw-abas').getBoundingClientRect().top"); fb = pg.evaluate("document.getElementById('bwAgente').getBoundingClientRect().bottom")
    ok(fb <= ab, f"não fica atrás das abas ({fb:.0f} ≤ {ab:.0f})")
    # caixa: menu abre para cima e cabe na tela
    pg.locator("#bwPede").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
    for bt in ("#bpModelo", "#bpRaio", "#bpMais"):
        pg.tap(bt); pg.wait_for_timeout(250)
        m = pg.evaluate("(()=>{const m=document.getElementById('bpMenu').getBoundingClientRect(),b=document.querySelector('" + bt + "').getBoundingClientRect();return [m.top,m.bottom,b.top]})()")
        ok(m[1] <= m[2] and m[0] >= 0, f"menu {bt} abre para cima e cabe na tela ({m[0]:.0f}–{m[1]:.0f}, botão {m[2]:.0f})")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
    ok(not er, f"0 erros de JS {er[:2]}")
    ctx.close()
    print("=== 1280px mouse ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(B + "index.html"); pg.wait_for_selector("#bwAgente"); pg.wait_for_timeout(800)
    ok(pg.is_visible(".bw-topo"), "PC: topo continua")
    x0, y0 = centro(pg); pg.mouse.move(x0, y0); pg.mouse.down(); pg.wait_for_timeout(450)
    for i in range(1, 11): pg.mouse.move(x0 - 60 * i, y0 - 30 * i)
    pg.mouse.up(); pg.wait_for_timeout(300)
    x2, y2 = centro(pg); ok(abs(x2 - (x0 - 600)) < 4 and abs(y2 - (y0 - 300)) < 4, "mouse: segurar e arrastar muda o lugar")
    ok(pg.evaluate("document.querySelector('.bwg-p') ? document.querySelector('.bwg-p').hidden : true"), "soltar não abre o painel")
    pg.click("#bwAgente"); pg.wait_for_timeout(300); ok(pg.is_visible(".bwg-p"), "clique abre o Tio Cláudio")
    ok(not er, f"0 erros de JS {er[:2]}")
    b.close()
print("FALHAS:", len(F)); sys.exit(1 if F else 0)
