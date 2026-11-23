"""PAINÉIS LIVRES do EDITOR DE FOTOS (21/11): no computador o painel de ferramentas some (✕ / ＋), descola (janela solta que se arrasta e
estica), estica pela beirada da foto e os filtros recolhem; tudo volta depois de recarregar. No celular nada disso aparece.
Uso (na raiz): python3 docs/testes/teste_fotos_paineis.py"""
import http.server, os, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8865; TMP = "/tmp/teste_fotos_p"; os.makedirs(TMP, exist_ok=True)
Image.new("RGB", (1600, 1067), (60, 90, 140)).save(f"{TMP}/a.jpg")
STUB = "window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},maybeSingle(){return q},order(){return q},limit(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
RX = "(s=>{const e=document.querySelector(s);if(!e||!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})"
def abrir(pg):
    pg.set_input_files("#arquivos", [f"{TMP}/a.jpg"]); pg.wait_for_timeout(1200); pg.evaluate("__fotos.abrir(0)"); pg.wait_for_timeout(900)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    print("\n=== 1534×816 ===")
    ctx = b.new_context(viewport={"width": 1534, "height": 816}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(800); abrir(pg)
    q = lambda s: pg.evaluate(RX + "('" + s + "')")
    p0, n0 = q("#palco"), q(".ed-painel")
    ok(q(".ed-pega") is not None and "FERRAMENTAS" in pg.inner_text(".ed-pega"), "o painel tem a barrinha ⠿ FERRAMENTAS com ⇱ e ✕")
    pg.click('.ed-pega [data-ep="some"]'); pg.wait_for_timeout(400); p1 = q("#palco")
    ok(q(".ed-painel") is None and p1[2] > p0[2] + 300 and q(".ed-volta") is not None, f"✕ esconde o painel e a foto fica com a tela toda ({p0[2]} → {p1[2]} px)")
    pg.click(".ed-volta button"); pg.wait_for_timeout(400); ok(q(".ed-painel") is not None and abs(q("#palco")[2] - p0[2]) <= 4, "＋ FERRAMENTAS traz o painel de volta")
    pg.click('.ed-pega [data-ep="solta"]'); pg.wait_for_timeout(400); f0 = q(".ed-painel")
    ok(pg.evaluate("getComputedStyle(document.querySelector('.ed-painel')).position") == "fixed" and q("#palco")[2] > p0[2] + 300, "⇱ descola: o painel vira janela solta e a foto ganha o lugar")
    pg.mouse.move(f0[0] + 60, f0[1] + 12); pg.mouse.down(); pg.mouse.move(f0[0] + 560, f0[1] + 92, steps=6); pg.mouse.up(); pg.wait_for_timeout(300); f1 = q(".ed-painel")
    ok(abs(f1[0] - (f0[0] + 500)) <= 8 and abs(f1[1] - (f0[1] + 80)) <= 8, f"a janela solta vai para onde eu arrasto ({f0[0]},{f0[1]} → {f1[0]},{f1[1]})")
    pg.evaluate("(()=>{const e=document.querySelector('.ed-painel');e.style.width='460px';e.style.height='420px'})()"); pg.wait_for_timeout(400)
    ok(abs(pg.evaluate("__fotosPaineis.estado().solto.w") - 460) <= 4, "estica pelo canto e o tamanho fica guardado")
    pg.reload(); pg.wait_for_timeout(800); abrir(pg); f2 = q(".ed-painel")
    ok(f2 and abs(f2[0] - f1[0]) <= 8 and abs(f2[2] - 460) <= 6, "recarregou: a janela solta volta no mesmo lugar e tamanho")
    pg.dblclick(".ed-pega span"); pg.wait_for_timeout(400); ok(pg.evaluate("getComputedStyle(document.querySelector('.ed-painel')).position") != "fixed" and abs(q("#palco")[2] - p0[2]) <= 4, "dois toques na barrinha encaixa de novo")
    pu = q(".ed-puxa"); pg.mouse.move(pu[0] + 5, pu[1] + pu[3] / 2); pg.mouse.down(); pg.mouse.move(pu[0] + 5 + 100, pu[1] + pu[3] / 2, steps=5); pg.mouse.up(); pg.wait_for_timeout(400)
    ok(abs(q(".ed-painel")[2] - (n0[2] + 100)) <= 8, f"arrastar a beirada da foto alarga o painel ({n0[2]} → {q('.ed-painel')[2]} px)")
    pg.dblclick(".ed-puxa"); pg.wait_for_timeout(400); ok(abs(q(".ed-painel")[2] - n0[2]) <= 4, "dois toques na beirada volta à largura padrão")
    pg.evaluate("document.querySelector('#abas [data-aba=\"filtros\"]') && document.querySelector('#abas [data-aba=\"filtros\"]').click()"); pg.wait_for_timeout(500)
    if q(".ed-faixa-bt"):
        h0 = q("#faixa")[3]; pg.click(".ed-faixa-bt"); pg.wait_for_timeout(400); h1 = q("#faixa")[3]
        ok(h1 < h0 - 30 and q("#palco")[3] > p0[3], f"▾ recolhe a faixa de filtros e a foto cresce ({h0} → {h1} px)"); pg.click(".ed-faixa-bt"); pg.wait_for_timeout(300)
    else: ok(False, "a faixa de filtros tem o botão ▾")
    ok(not erros, f"0 erros de JS {erros[:2]}"); ctx.close()
    print("\n=== 390×844 ===")
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True); ctx.route("**/*", rota)
    pg = ctx.new_page(); pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(800); abrir(pg)
    ok(not pg.locator(".ed-pega").is_visible() and not pg.locator(".ed-puxa").is_visible() and not pg.locator(".ed-volta").is_visible(), "celular: nada disso aparece (as abas continuam como antes)")
    ctx.close(); b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
