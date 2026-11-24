#!/usr/bin/env python3
"""Teste do TRAVA-BORDA (24/11, dono no iPhone: "quando clica um pouco mais forte, ele puxa a tela para o lado, parece a função de fechar").
O gesto de voltar do Safari nasce na borda da tela; BWFerr.travarBorda cancela o touchstart que começa na borda (até 24 px) nos layouts de app
do editor de vídeo e do Motion. Confere com toque de verdade (CDP): toque na borda = cancelado; no meio = livre; toque curto na borda num botão
ainda CLICA (uma vez só); arrastar a partir da borda não clica; campo de digitar na borda fica livre; fora do layout de app nada muda.
Uso (na raiz): python3 docs/testes/teste_borda.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8891
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
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
ESPIA = """(()=>{window.__prev=[];window.addEventListener('touchstart',e=>{window.__prev.push(e.defaultPrevented)},false);
const b=document.createElement('button');b.id='tbBt';b.textContent='x';b.style.cssText='position:fixed;left:0;top:300px;width:60px;height:60px;z-index:99999';
window.__cliques=0;b.onclick=()=>{window.__cliques++};(document.querySelector('.va,.ma,#veApp,#moApp')||document.body).appendChild(b);
const i=document.createElement('input');i.id='tbIn';i.style.cssText='position:fixed;right:0;top:420px;width:80px;height:40px;z-index:99999;font-size:16px';document.body.appendChild(i);})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for pagina, classe in (("video.html", "ve-app"), ("motion.html", "mo-app"), ("video.html?layout=classico", None)):
        print(f"\n=== {pagina} ===")
        ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        cdp = ctx.new_cdp_session(pg)
        pg.goto(BASE + pagina); pg.wait_for_timeout(3500)
        if classe: ok(pg.evaluate(f"document.documentElement.classList.contains('{classe}')"), f"layout de app ligado ({classe})")
        pg.evaluate(ESPIA)
        def toque(x, y, ate=None):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(40)
            if ate:
                for k in range(1, 6):
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x + (ate[0] - x) * k / 5, "y": y + (ate[1] - y) * k / 5}]}); pg.wait_for_timeout(20)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(300)
        def ultimo(): return pg.evaluate("window.__prev[window.__prev.length-1]")
        toque(6, 330)
        if classe:
            ok(ultimo() is True, "dedo na BORDA ESQUERDA: toque cancelado (o Safari não puxa a tela para voltar)")
            ok(pg.evaluate("window.__cliques") == 1, "… e o toque curto ainda CLICA o botão da borda (uma vez só)")
        else:
            ok(ultimo() is False, "página fora do layout de app: borda livre como sempre")
        toque(385, 600)
        if classe: ok(ultimo() is True, "dedo na BORDA DIREITA: toque cancelado")
        n = pg.evaluate("window.__cliques")
        toque(6, 330, ate=(200, 330))
        if classe: ok(ultimo() is True and pg.evaluate("window.__cliques") == n, "arrastar a partir da borda: cancelado e NÃO vira clique")
        toque(200, 700)
        ok(ultimo() is False, "dedo no MEIO da tela: livre (rolagem e toques normais)")
        toque(380, 440)
        ok(ultimo() is False, "campo de digitar encostado na borda: livre (teclado abre)")
        ok(not erros, "nenhum erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
_s.exit(1 if falhas else 0)
