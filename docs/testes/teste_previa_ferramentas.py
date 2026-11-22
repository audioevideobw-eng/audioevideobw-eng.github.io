#!/usr/bin/env python3
"""Teste local (22/11): TELAS EM MOVIMENTO e ESTÚDIO 3D com as ferramentas da prévia do editor de vídeo (BWFerr.previa): ⋯ discreto no canto
de cima da prévia com o menu (vista, tocar, 2º monitor, tela cheia, salvar quadro, celular + extras da ferramenta), rodinha = zoom só da vista nas Telas
(selo 🔍 volta a 100%), 2º monitor com a MESMA imagem ao vivo (captureStream), salvar o quadro em PNG e controle pelo celular andando o tempo. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_previa_ferramentas.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8874
STUB = "window.supabase={createClient:function(){const ch={on(){return ch},subscribe(f){f&&f('SUBSCRIBED');return ch},send(){},unsubscribe(){}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),channel(){return ch},removeChannel(){}}}};"
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
F = []
def ok(c, m): print(("  ✓ " if c else "  ✗ ") + m); (None if c else F.append(m))
def centro(pg, sel):
    b = pg.locator(sel).first.bounding_box(); return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, b
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        for pag, ed, cvs, palco in (("telas.html", "BWTelasEditor", "#tlCv", ".tl-palco"), ("3d.html", "BW3DEditor", "#d3Cv", ".d3-palco")):
            print(f"  -- {pag}")
            ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel, accept_downloads=True); ctx.route("**/*", rota)
            pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept())
            pg.goto(BASE + pag); pg.wait_for_function(f"window.{ed} && {ed}.previa && {ed}.previa()", timeout=20000); pg.wait_for_timeout(900)
            if pag == "3d.html": pg.evaluate("BW3DEditor.modo('logo')"); pg.wait_for_timeout(500)
            else:
                for _ in range(3): pg.evaluate("document.getElementById('tlNovaCena').click()"); pg.wait_for_timeout(150)
            op = pg.locator(f"{palco} .bwf-opcp"); ok(op.count() == 1 and op.is_visible(), "⋯ discreto na prévia")
            ob = op.bounding_box(); tb = pg.locator(cvs).bounding_box()
            ok(ob["y"] < tb["y"] + 34 and ob["x"] + ob["width"] <= tb["x"] + tb["width"] + 2 and ob["x"] > tb["x"] + tb["width"] / 2, "…no canto de cima, à direita, dentro da prévia")
            op.click(); pg.wait_for_timeout(250); txt = pg.inner_text(".bwf-menu")
            ok("segundo monitor" in txt and "Tela cheia" in txt and "Salvar este quadro" in txt and "Controle pelo celular" in txt, "…e abre as OPÇÕES (2º monitor, tela cheia, salvar quadro, celular)")
            if pag == "telas.html": ok("Aproximar" in txt and "Tocar" in txt, "…com a VISTA (zoom) e tocar")
            else: ok("Ângulo" in txt and "Gerar vídeo" in txt and "Salvar PNG" in txt, "…com os extras do 3D (ângulo, girar, PNG, vídeo)")
            pg.keyboard.press("Escape"); pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())"); pg.wait_for_timeout(150)
            if pag == "telas.html":
                pg.mouse.move(tb["x"] + tb["width"] / 2, tb["y"] + tb["height"] / 2); pg.mouse.wheel(0, -300); pg.wait_for_timeout(200)
                z = pg.evaluate(f"{ed}.previa().vista()"); ok(z > 1 and "scale" in pg.evaluate("document.getElementById('tlCv').style.transform"), f"rodinha na prévia = zoom só da vista ({z:.2f}×)")
                sel = pg.locator(f"{palco} .bwf-vz"); ok(sel.is_visible(), "selo 🔍 % aparece"); sel.click(); pg.wait_for_timeout(150)
                ok(pg.evaluate(f"{ed}.previa().vista()") == 1 and not pg.evaluate("document.getElementById('tlCv').style.transform"), "…e volta para 100%")
            # 2º monitor
            with pg.expect_popup() as pop: pg.evaluate(f"{ed}.previa().segunda()")
            jan = pop.value; jan.wait_for_function("document.querySelector('video') && document.querySelector('video').srcObject", timeout=8000)
            ok(jan.evaluate("document.querySelector('video').srcObject.getVideoTracks().length") == 1, "🖥 o 2º monitor recebe a imagem ao vivo da prévia")
            jan.close()
            # salvar quadro
            with pg.expect_download() as dl: pg.evaluate(f"{ed}.previa().salvarQuadro()")
            d = dl.value; caminho = d.path(); ok(d.suggested_filename.endswith(".png") and open(caminho, "rb").read(4) == b"\x89PNG", f"💾 salvar quadro baixa um PNG de verdade ({d.suggested_filename})")
            # celular
            pg.evaluate("window.__ctl=null; const o=BWControle.painel; BWControle.painel=function(api){window.__ctl=api; return o.apply(this, arguments)}")
            pg.evaluate(f"{ed}.previa().celular()"); pg.wait_for_timeout(300)
            ok(pg.evaluate("!!(window.__ctl && __ctl.total()>0 && typeof __ctl.irPara==='function')"), "📱 abre o controle pelo celular com o tempo")
            alvo = pg.evaluate("Math.min(__ctl.total()*0.5, 1.2)"); pg.evaluate(f"__ctl.irPara({alvo})"); pg.wait_for_timeout(300)
            ok(abs(pg.evaluate("__ctl.T()") - alvo) < 0.02, f"…e o comando do celular anda o tempo ({alvo:.2f} s)")
            pg.evaluate("__ctl.tocar()"); pg.wait_for_timeout(500); toc = pg.evaluate("__ctl.tocando()"); pg.evaluate("__ctl.parar()"); pg.wait_for_timeout(200)
            ok(toc and not pg.evaluate("__ctl.tocando()"), "…tocar e parar pelo celular")
            sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"nada estoura ({sw})")
            ok(not er, f"0 erros de JS {er[:2]}")
            ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not F else f"❌ {len(F)} falha(s)"))
raise SystemExit(1 if F else 0)
