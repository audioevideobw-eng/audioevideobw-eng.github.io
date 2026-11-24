#!/usr/bin/env python3
"""Teste do TOQUE DUPLO = BOTÃO DIREITO (24/11, dono: "habilitar o botão direito no app do celular com dois cliques rápidos, como se fosse o mouse").
Toque de verdade (CDP), 390 px: editor de vídeo (take, vazio da camada, prévia) e Motion (barra): dois toques rápidos abrem o MESMO menu do
botão direito; um toque só não abre; dois toques lentos não abrem; o dedo do 2º toque não escolhe item do menu.
Uso (na raiz): python3 docs/testes/teste_toque_duplo.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8893; TMP = "/tmp/teste_video_app"
os.makedirs(TMP, exist_ok=True)
if not os.path.exists(f"{TMP}/azul.webm"):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x1e3cdc:size=360x640:rate=25:duration=6", "-f", "lavfi", "-i", "sine=f=440:d=6",
                    "-c:v", "libvpx", "-b:v", "300k", "-c:a", "libvorbis", "-shortest", f"{TMP}/azul.webm"], check=True)
STUB = [l for l in open(os.path.join(os.path.dirname(__file__), "teste_video_app.py")).read().split("\n") if l.startswith("STUB = ")][0][7:]
STUB = eval(STUB)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
MENU = "(()=>{const m=document.querySelector('.bwf-menu');return !!m&&m.getClientRects().length>0})()"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    def abrir(pagina):
        ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); cdp = ctx.new_cdp_session(pg)
        pg.goto(BASE + pagina); pg.wait_for_timeout(3000)
        def toque(x, y, ms=40):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(ms)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        def duplo(x, y, entre=120):
            toque(x, y); pg.wait_for_timeout(entre); toque(x, y); pg.wait_for_timeout(500)
        def fechar(): pg.keyboard.press("Escape"); pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())"); pg.wait_for_timeout(200)
        return ctx, pg, erros, toque, duplo, fechar
    print("\n=== editor de vídeo (app) ===")
    ctx, pg, erros, toque, duplo, fechar = abrir("video.html")
    pg.locator("#vaFaixa .va-f", has_text="Mídia").first.click(); pg.wait_for_timeout(300)
    pg.set_input_files("#veArq", [f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 1", timeout=15000); pg.wait_for_timeout(500)
    bx = pg.locator("#veLib [data-mid]").first.bounding_box(); toque(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2); pg.wait_for_timeout(800)
    pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(300)
    r = pg.locator("#veFaixas [data-clip]").first.bounding_box(); cx, cy = r["x"] + min(r["width"] / 2, 60), r["y"] + r["height"] / 2
    toque(cx, cy); pg.wait_for_timeout(600)
    ok(not pg.evaluate(MENU), "UM toque no take: não abre menu (só escolhe)")
    duplo(cx, cy)
    ok(pg.evaluate(MENU), "DOIS toques rápidos no take: abre o menu do botão direito")
    ok(pg.evaluate("document.querySelectorAll('.bwf-menu button[data-i]').length") >= 4, "… com as opções do take")
    ok(pg.evaluate("__video.P().clips.length") == 1, "… e o dedo do 2º toque não escolheu item nenhum (nada apagado/duplicado)")
    fechar()
    toque(cx, cy); pg.wait_for_timeout(500); toque(cx, cy); pg.wait_for_timeout(600)
    ok(not pg.evaluate(MENU), "dois toques LENTOS (0,5 s): não abre menu")
    fechar()
    cv = pg.locator("#veCv").bounding_box(); duplo(cv["x"] + cv["width"] / 2, cv["y"] + cv["height"] / 2)
    ok(pg.evaluate(MENU), "dois toques rápidos na PRÉVIA: abre as opções da prévia")
    fechar()
    ok(not erros, "nenhum erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
    ctx.close()
    print("\n=== Estúdio de motion (app) ===")
    ctx, pg, erros, toque, duplo, fechar = abrir("motion.html")
    pg.locator("#maFaixa .ma-f", has_text="Texto").first.click(); pg.wait_for_timeout(600)
    pg.evaluate("BWMotionEditor.selecionar(null)"); pg.wait_for_timeout(300)
    r = pg.locator("#moPistas [data-barra]").first.bounding_box(); x, y = r["x"] + min(r["width"] / 2, 60), r["y"] + r["height"] / 2
    duplo(x, y)
    ok(pg.evaluate(MENU), "dois toques rápidos na barra do item: abre o menu do botão direito")
    fechar()
    ok(not erros, "nenhum erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
    ctx.close(); b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
_s.exit(1 if falhas else 0)
