"""PAINÉIS LIVRES (bw-ferramentas.js paineis): em todo editor de TELA FIXA os painéis somem, esticam, descolam e voltam.
Roda: python3 docs/testes/teste_paineis.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video"; PORTA = 8861
if not os.path.exists(f"{TMP}/clipe.webm"):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libvorbis", f"{TMP}/clipe.webm"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=2", f"{TMP}/musica.wav"], check=True)
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
R = "(s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})"
RX = "(e=>{if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})"
PAGS = (("motion.html", ".mo-palco", "#moEsq", "#moDir", ".mo-tl"), ("telas.html", ".tl-palco", "#tlEsq", "#tlDir", ".tl-seq"), ("3d.html", ".d3-palco", None, "#d3Painel", None))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for pag, palco, esq, dirr, rola in PAGS:
        print(f"\n=== {pag} (1534×816) ===")
        ctx = b.new_context(viewport={"width": 1534, "height": 816}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + pag); pg.wait_for_selector(dirr + " > .bwf-pega", state="visible", timeout=20000); pg.wait_for_timeout(900)
        q = lambda sel: pg.evaluate(RX + "(document.querySelector('" + sel + "'))")
        p0 = q(palco); d0 = q(dirr)
        ok(q(".bw-topo") is None and q("#bwFocoVoltar") is not None, "modo foco: sem topo nem menu, só a setinha")
        pg.click(dirr + ' > .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(350); p1 = q(palco)
        ok(pg.evaluate("getComputedStyle(document.querySelector('" + dirr + "')).position") == "fixed" and p1[2] > p0[2] + 150, f"⇱ descola o painel da direita e a prévia ganha o lugar ({p0[2]} → {p1[2]} px)")
        f0 = q(dirr); pg.mouse.move(f0[0] + 60, f0[1] + 14); pg.mouse.down(); pg.mouse.move(f0[0] - 200, f0[1] + 110, steps=6); pg.mouse.up(); pg.wait_for_timeout(250); f1 = q(dirr)
        ok(abs(f1[0] - (f0[0] - 260)) <= 8 and abs(f1[1] - (f0[1] + 96)) <= 8, f"a janela solta vai para onde eu arrasto ({f0[0]},{f0[1]} → {f1[0]},{f1[1]})")
        pg.reload(); pg.wait_for_selector(dirr + " > .bwf-pega", state="visible", timeout=20000); pg.wait_for_timeout(900); f2 = q(dirr)
        ok(f2 and abs(f2[0] - f1[0]) <= 8 and pg.evaluate("getComputedStyle(document.querySelector('" + dirr + "')).position") == "fixed", "recarregou: continua solta no mesmo lugar")
        pg.click(dirr + ' > .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(350); ok(abs(q(palco)[2] - p0[2]) <= 6 and abs(q(dirr)[2] - d0[2]) <= 6, "⇲ encaixa de novo, do tamanho de antes")
        pg.click(dirr + ' > .bwf-pega [data-bwf-p="some"]'); pg.wait_for_timeout(350)
        ok(q(dirr) and q(dirr)[2] <= 20 and q(palco)[2] > p0[2] + 150 and pg.locator(dirr + " > .bwf-borda-bt").is_visible(), "✕ esconde: o painel vira só uma BORDA fina e a prévia cresce")
        pg.click(dirr + " > .bwf-borda-bt"); pg.wait_for_timeout(350); ok(q(dirr) is not None and abs(q(palco)[2] - p0[2]) <= 6, "＋ traz o painel de volta")
        pu = q(palco + " > .bwf-puxa.d"); pg.mouse.move(pu[0] + 5, pu[1] + pu[3] / 2); pg.mouse.down(); pg.mouse.move(pu[0] + 5 - 90, pu[1] + pu[3] / 2, steps=5); pg.mouse.up(); pg.wait_for_timeout(350)
        ok(abs(q(dirr)[2] - (d0[2] + 90)) <= 8, f"arrastar a beirada da prévia estica o painel ({d0[2]} → {q(dirr)[2]} px)")
        pg.dblclick(palco + " > .bwf-puxa.d"); pg.wait_for_timeout(350); ok(abs(q(dirr)[2] - d0[2]) <= 6, "dois toques na beirada volta à largura padrão")
        if esq:
            pg.click(esq + ' > .bwf-pega [data-bwf-p="some"]'); pg.wait_for_timeout(300); ok(q(esq)[2] <= 20 and q(palco)[0] < p0[0] - 100, "o painel da esquerda também vira borda e a prévia vai até a beirada"); pg.click(esq + " > .bwf-borda-bt"); pg.wait_for_timeout(300)
        if rola:
            r0 = q(rola); pe = q(rola + " > .bwf-pega"); pg.mouse.move(pe[0] + 80, pe[1] + 8); pg.mouse.down(); pg.mouse.move(pe[0] + 80, pe[1] + 8 - 70, steps=5); pg.mouse.up(); pg.wait_for_timeout(350)
            ok(q(rola)[3] > r0[3] + 40, f"arrastar a barrinha da parte de baixo estica a altura ({r0[3]} → {q(rola)[3]} px)")
            pg.dblclick(rola + " > .bwf-pega span"); pg.wait_for_timeout(300)
            pg.click(rola + ' > .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(350); ok(pg.evaluate("getComputedStyle(document.querySelector('" + rola + "')).position") == "fixed" and q(palco)[3] > p0[3] + 60, "a parte de baixo também descola e a prévia cresce para baixo")
            pg.click(rola + ' > .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(300)
        if pag == "3d.html":
            pg.locator("#d3Modos > *").nth(1).click(); pg.wait_for_timeout(500); ok(pg.locator("#d3Painel > .bwf-pega").is_visible() and pg.inner_text("#d3Painel > .bwf-pega span").strip().endswith("FERRAMENTAS"), "trocar de modo redesenha o painel sem apagar a barrinha ⠿ FERRAMENTAS")
        pb = q(palco); ok(pb[1] + pb[3] <= 816 and pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "no fim tudo cabe na tela, sem estouro")
        ok(not erros, f"0 erros de JS {erros[:2]}"); ctx.close()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True); ctx.route("**/*", rota); pg = ctx.new_page(); pg.goto(BASE + pag); pg.wait_for_timeout(2500)
        ok(pg.locator(".bwf-pega:visible").count() == 0 and pg.locator(".bwf-puxa:visible").count() == 0 and pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "celular (390 px): nada disso aparece e não há estouro"); ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
