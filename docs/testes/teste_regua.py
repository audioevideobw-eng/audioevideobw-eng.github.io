#!/usr/bin/env python3
"""Teste da RÉGUA QUE ESTICA (24/11, dono: "ao puxar pela zona neutra da linha do tempo, a dos números, ela puxa a tela e diminui as camadas").
Toque de verdade (CDP), 390 px: arrastar a régua para cima = linha do tempo maior, prévia menor, camadas mais altas; para baixo = o contrário;
na horizontal a régua continua andando no tempo; a altura fica guardada ao recarregar; dois toques na régua voltam ao padrão.
Uso (na raiz): python3 docs/testes/teste_regua.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8894; TMP = "/tmp/teste_video_app"
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
    a = med()
    arrastar(195, a["ry"], 0, -160); m = med()
    ok(m["tl"] > a["tl"] + 100, f"régua puxada para CIMA: linha do tempo maior ({a['tl']:.0f} → {m['tl']:.0f} px)")
    ok(m["cv"] < a["cv"] - 30, f"… a prévia encolhe ({a['cv']:.0f} → {m['cv']:.0f} px)")
    ok(m["clip"] > a["clip"] + 8, f"… e as camadas ficam mais altas sozinhas ({a['clip']:.0f} → {m['clip']:.0f} px)")
    ok(abs(m["sl"] - a["sl"]) < 6, "… sem andar no tempo")
    arrastar(195, m["ry"], 0, 260); d = med()
    ok(d["tl"] < a["tl"] and d["clip"] <= a["clip"] + 1, f"régua puxada para BAIXO: linha do tempo menor e camada não cresce ({d['tl']:.0f} px, camada {d['clip']:.0f} px)")
    for k in range(3): pg.evaluate("__video.P().clips.push(Object.assign({}, __video.P().clips[0], {id:'tt'+Math.random(), trilha:'v'+(__video.P().clips.length+1)}))")
    pg.evaluate("__video.tudo()"); pg.wait_for_timeout(300); pg.evaluate("__vaRegua.aplicar(document.getElementById('vaTl').getBoundingClientRect().height,false)"); pg.wait_for_timeout(400)
    n = pg.evaluate("[...document.querySelectorAll('#veFaixas [data-clip]')].map(c=>c.getBoundingClientRect().height)")
    ok(len(n) >= 4 and max(n) < a["clip"] - 5, f"com 4 camadas na linha do tempo baixa, elas DIMINUEM sozinhas para caber ({[round(x) for x in n]})")
    pg.evaluate("__video.P().clips.splice(1); __video.tudo(); __video.irPara(1)"); pg.wait_for_timeout(300)
    ok(d["clip"] >= 22, "… a camada nunca fica menor que 22 px")
    sl0 = d["sl"]; arrastar(250, d["ry"], -120, 0); h = med()
    ok(abs(h["sl"] - sl0) > 30 and abs(h["tl"] - d["tl"]) < 3, f"régua arrastada na HORIZONTAL: anda no tempo e não muda a altura ({sl0:.0f} → {h['sl']:.0f})")
    pg.reload(); pg.wait_for_timeout(3500); r = med()
    ok(abs(r["tl"] - d["tl"]) < 4, f"ao recarregar, a altura escolhida continua ({r['tl']:.0f} px)")
    toque(195, r["ry"]); pg.wait_for_timeout(120); toque(195, r["ry"]); pg.wait_for_timeout(600); z = med()
    ok(abs(z["tl"] - a["tl"]) < 6 and abs(z["clip"] - a["clip"]) < 3, f"dois toques na régua: volta ao tamanho padrão ({z['tl']:.0f} px)")
    ok(not pg.evaluate("(()=>{const m=document.querySelector('.bwf-menu');return !!m&&m.getClientRects().length>0})()"), "… sem abrir menu")
    ok(not erros, "nenhum erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
    ctx.close(); b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
_s.exit(1 if falhas else 0)
