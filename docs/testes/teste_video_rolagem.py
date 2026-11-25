#!/usr/bin/env python3
"""Teste da ROLAGEM VERTICAL da linha do tempo (24/11, dono: "difícil subir e descer pelo meio da tela no app de edição"): com várias camadas, arrastar
na vertical pelo meio da linha do tempo E pela coluna dos nomes sobe/desce as camadas, com embalo ao soltar. Base copiada do teste da RÉGUA QUE ESTICA (24/11, dono: "ao puxar pela zona neutra da linha do tempo, a dos números, ela puxa a tela e diminui as camadas").
Toque de verdade (CDP), 390 px: arrastar a régua para cima = linha do tempo maior, prévia menor, camadas mais altas; para baixo = o contrário;
na horizontal a régua continua andando no tempo; a altura fica guardada ao recarregar; dois toques na régua voltam ao padrão.
Uso (na raiz): python3 docs/testes/teste_regua.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8938; TMP = "/tmp/teste_video_app"
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
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); cdp = ctx.new_cdp_session(pg)
    pg.goto(BASE + "video.html"); pg.wait_for_timeout(3000)
    def toque(x, y, ms=40):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(ms)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
    def arrastar(x, y, dx, dy, passos=8):
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(40)
        for k in range(1, passos + 1):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x + dx * k / passos, "y": y + dy * k / passos}]}); pg.wait_for_timeout(25)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(500)
    pg.locator("#vaFaixa .va-f", has_text="Mídia").first.click(); pg.wait_for_timeout(300)
    pg.set_input_files("#veArq", [f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 1", timeout=15000); pg.wait_for_timeout(500)
    bx = pg.locator("#veLib [data-mid]").first.bounding_box(); toque(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2); pg.wait_for_timeout(800)
    pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(400)
    def med():
        return pg.evaluate("""(()=>{const t=document.getElementById('vaTl').getBoundingClientRect(),c=document.querySelector('#veFaixas [data-clip]').getBoundingClientRect(),
          v=document.getElementById('veCv').getBoundingClientRect(),r=document.getElementById('veRegua').getBoundingClientRect();
          return {tl:t.height,clip:c.height,cv:v.height,rx:r.left+40,ry:r.top+r.height/2,sl:document.getElementById('veRolo').scrollLeft}})()""")
    for k in range(9): pg.evaluate(f"__video.P().clips.push(Object.assign({{}}, __video.P().clips[0], {{id:'tt{k}', trilha:'v{k+2}'}}))")
    pg.evaluate("__video.tudo()"); pg.wait_for_timeout(600)
    info = pg.evaluate("""(()=>{const c=document.querySelector('.va .ve-tl-corpo'),r=document.getElementById('veRolo').getBoundingClientRect(),n=document.getElementById('veRot').getBoundingClientRect();
      return {sh:c.scrollHeight,ch:c.clientHeight,rx:r.left+r.width/2,ry:r.top+Math.min(r.height-20,120),nx:n.left+n.width/2}})()""")
    ok(info["sh"] > info["ch"] + 100, f"10 camadas: a linha do tempo tem o que rolar ({info['ch']} de {info['sh']} px)")
    st = lambda: pg.evaluate("document.querySelector('.va .ve-tl-corpo').scrollTop")
    sl = lambda: pg.evaluate("document.getElementById('veRolo').scrollLeft")
    l0 = sl(); arrastar(info["rx"], info["ry"] + 60, 4, -90, passos=6); pg.wait_for_timeout(700); t1 = st()
    ok(t1 > 90, f"arrastar para CIMA pelo meio da linha do tempo desce as camadas, com embalo ({t1:.0f} px para 90 px de dedo)")
    ok(abs(sl() - l0) < 10, "… sem andar no tempo")
    arrastar(info["rx"], info["ry"], -3, 80, passos=6); pg.wait_for_timeout(700); t2 = st()
    ok(t2 < t1 - 60, f"arrastar para BAIXO volta ({t1:.0f} → {t2:.0f})")
    pg.evaluate("document.querySelector('.va .ve-tl-corpo').scrollTop=0"); pg.wait_for_timeout(100)
    arrastar(info["nx"], info["ry"] + 60, 0, -90, passos=6); pg.wait_for_timeout(700); t3 = st()
    ok(t3 > 60, f"pela coluna dos NOMES das camadas também rola ({t3:.0f} px)")
    ok(not erros, f"sem erro de JS {erros[:2]}")
    b.close()
print("falhas:", len(falhas)); import sys; sys.exit(1 if falhas else 0)
