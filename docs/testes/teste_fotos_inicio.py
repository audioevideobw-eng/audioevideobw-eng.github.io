"""EDITOR DE FOTOS — TELA DE ENTRADA com BIBLIOTECA (22/11): palco grande para soltar/escolher fotos + BIBLIOTECA (RECENTES deste aparelho,
CRIAÇÕES das outras ferramentas, ★ MARCA). A foto aberta fica nas RECENTES depois de recarregar e abre de novo de lá; nada sai do aparelho.
Uso (na raiz): python3 docs/testes/teste_fotos_inicio.py"""
import http.server, os, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8866; TMP = "/tmp/teste_fotos_i"; os.makedirs(TMP, exist_ok=True)
Image.new("RGB", (1600, 1067), (60, 90, 140)).save(f"{TMP}/a.jpg"); Image.new("RGB", (900, 1200), (200, 80, 60)).save(f"{TMP}/b.jpg")
STUB = "window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},maybeSingle(){return q},order(){return q},limit(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; FORA = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" not in u: FORA.append(u)
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for W, H in ((1280, 800), (390, 844)):
        print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(900)
        ok(pg.locator("#fiCasca").is_visible() and pg.locator("#fiLib").is_visible() and pg.locator("#solta").is_visible(), "entrada nova: palco para soltar as fotos + BIBLIOTECA")
        ok(pg.locator("#fiLib [data-fiaba]").count() == 3, "biblioteca com RECENTES, CRIAÇÕES e ★ MARCA")
        if W > 900:
            pl = pg.evaluate("document.getElementById('fiPalco').getBoundingClientRect().width"); lb = pg.evaluate("document.getElementById('fiLib').getBoundingClientRect().width")
            ok(pl > lb * 1.6, f"a foto é o assunto: o palco é bem maior que a biblioteca ({pl:.0f} × {lb:.0f})")
        pg.set_input_files("#arquivos", [f"{TMP}/a.jpg", f"{TMP}/b.jpg"]); pg.wait_for_timeout(1800)
        ok(pg.evaluate("__fotos.FOTOS.length") == 2 and not pg.locator("#ed").is_hidden(), "ESCOLHER FOTOS abre o editor com as 2 fotos")
        pg.evaluate("__fotos.fechar()"); pg.wait_for_timeout(500)
        ok(pg.locator("#fiGrade .fi-item").count() == 2, "as fotos abertas entram nas RECENTES")
        pg.reload(); pg.wait_for_timeout(1200)
        ok(pg.locator("#fiGrade .fi-item").count() == 2, "recarregou: as RECENTES continuam (guardadas só no aparelho)")
        pg.locator("#fiGrade .fi-item").first.click(); pg.wait_for_timeout(200)
        ok("EDITAR 1 FOTO" in pg.inner_text("#fiAbrirSel"), "tocar marca a foto (✓) e o botão diz EDITAR 1 FOTO")
        pg.click("#fiAbrirSel"); pg.wait_for_timeout(1500)
        ok(pg.evaluate("__fotos.FOTOS.length") == 1 and not pg.locator("#ed").is_hidden(), "EDITAR abre a foto da biblioteca no editor")
        pg.evaluate("__fotos.fechar()"); pg.wait_for_timeout(500)
        ok(pg.locator("#fiGrade .fi-item").count() == 2, "reabrir da biblioteca não duplica as RECENTES")
        pg.locator("#fiGrade .fi-item").first.click(); pg.wait_for_timeout(200); pg.click("#fiApagar"); pg.wait_for_timeout(600)
        ok(pg.locator("#fiGrade .fi-item").count() == 1, "🗑 TIRAR tira da biblioteca (com confirmação)")
        pg.click('[data-fiaba="marca"]'); pg.wait_for_timeout(200); pg.click("#fiMarca"); pg.wait_for_timeout(400)
        ok(not pg.locator("#mk").is_hidden(), "★ MARCA abre MINHA MARCA")
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro horizontal")
        ok(not erros, f"sem erro de JS {erros[:2]}")
        pg.screenshot(path=f"{TMP}/entrada_{W}.png"); ctx.close()
    b.close()
ok(not FORA, f"nada saiu para a internet {FORA[:3]}")
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
raise SystemExit(1 if falhas else 0)
