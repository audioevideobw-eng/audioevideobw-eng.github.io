#!/usr/bin/env python3
"""24/11 (dono: "no álbum 3D difícil rolar para cima, só pelas laterais"): no celular, os painéis das ferramentas com tela fixa (Álbum 3D, Telas,
Motion, 3D, Criador) não podem prender o dedo — arrastar em cima do painel de modelos/ajustes rola a PÁGINA para baixo E para cima.
Causa achada: painel com overflow:auto + overscroll contain pegava o gesto mesmo sem ter o que rolar. Toque de verdade (CDP), 390 px.
Uso (na raiz): python3 docs/testes/teste_rolagem_paineis.py"""
import os, sys, threading, http.server, functools
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")); sys.path.insert(0, "docs/testes")
import _sem_sri  # noqa
from playwright.sync_api import sync_playwright
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory="."); H.log_message = lambda *a: None
s = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H); threading.Thread(target=s.serve_forever, daemon=True).start()
B = f"http://127.0.0.1:{s.server_port}/"
falhas = 0
def ok(c, m):
    global falhas
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas += 1
with sync_playwright() as p:
    b = p.chromium.launch()
    for pag, painel in [("album3d.html", "#alMod"), ("telas.html", "#tlEsq")]:
        c = b.new_context(viewport={"width": 390, "height": 800}, has_touch=True, is_mobile=True, service_workers="block")
        pg = c.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.goto(B + pag); pg.wait_for_timeout(2500)
        cdp = c.new_cdp_session(pg)
        def arrasta(x, y0, y1):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y0}]})
            for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y0 + (y1 - y0) * k / 10}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(600)
        top = pg.evaluate(f"document.querySelector('{painel}').getBoundingClientRect().top")
        y = min(760, top + 60)
        arrasta(195, y, y - 250); d = pg.evaluate("scrollY")
        ok(d > 150, f"{pag}: arrastar em cima do painel {painel} rola a página para BAIXO ({d:.0f} px)")
        y2 = 650
        arrasta(195, y2 - 150, y2 + 100); u = pg.evaluate("scrollY")
        ok(u < d - 150, f"{pag}: … e para CIMA ({d:.0f} → {u:.0f})")
        ok(not erros, f"{pag}: sem erro de JS {erros[:2]}")
        c.close()
    b.close()
print("falhas:", falhas); sys.exit(1 if falhas else 0)
