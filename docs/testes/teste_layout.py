#!/usr/bin/env python3
"""Teste local (16/11): botão MENU no topo, título único da página e seções da tela inicial com seta. Uso (na raiz): python3 docs/testes/teste_layout.py"""
import http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", 8814), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},maybeSingle(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null})};}};"""
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    return r.abort()
F = []
def ok(c, m): print(("  ✓ " if c else "  ✗ ") + m); (None if c else F.append(m))
B = "http://127.0.0.1:8814/"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w in (1280, 390):
        print(f"=== {w}px ===")
        ctx = b.new_context(viewport={"width": w, "height": 900}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        for pag in ["index.html", "configadm.html", "captacao.html", "eventos.html", "custos.html", "fotos.html"]:
            er.clear(); pg.goto(B + pag); pg.wait_for_timeout(600)
            ov = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth")
            ok(not er and ov <= 0 and pg.locator(".bw-topo .trilha").count() == 0 and pg.locator(".bw-topo .bw-titulo-pagina").count() == 1 and pg.locator("#bwMenuBtn").count() == 1,
               f"{pag}: título único + botão MENU, erros={er[:1]} estouro={ov}")
        pg.goto(B + "configadm.html"); pg.wait_for_timeout(500)
        ok(pg.inner_text(".bw-topo .bw-titulo-pagina").strip() == "Configuração", "configadm: só 'Configuração'")
        if w == 1280:
            ok(pg.is_visible("#bwMenu"), "menu lateral visível")
            pg.click("#bwMenuBtn"); pg.wait_for_timeout(200); ok(not pg.is_visible("#bwMenu"), "MENU recolhe o menu lateral")
            pg.reload(); pg.wait_for_timeout(500); ok(not pg.is_visible("#bwMenu"), "continua recolhido ao recarregar")
            pg.click("#bwMenuBtn"); pg.wait_for_timeout(200); ok(pg.is_visible("#bwMenu"), "MENU mostra de novo")
        else:
            ok(not pg.is_visible("#bwMenu"), "celular: menu escondido")
            pg.click("#bwMenuBtn"); pg.wait_for_timeout(200); ok(pg.is_visible("#bwMenu") and pg.locator(".bw-menu-fechar").count() == 1, "MENU abre o menu em tela cheia")
            pg.click(".bw-menu-fechar"); pg.wait_for_timeout(200); ok(not pg.is_visible("#bwMenu"), "✕ Fechar fecha")
            pg.click('[data-aba="mais"]'); pg.wait_for_timeout(200); ok(pg.is_visible("#bwMenu"), "aba Mais continua abrindo"); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
            ok(not pg.is_visible("#bwMenu"), "Esc fecha")
        pg.goto(B + "index.html"); pg.wait_for_timeout(800)
        ok(pg.locator(".bw-dobra").count() == 7, f"7 seções com seta: {pg.locator('.bw-dobra').count()}")
        pg.click('[data-dobra="resumo"] .bw-dobra'); pg.wait_for_timeout(150)
        ok(pg.evaluate("document.getElementById('dobra_resumo').hidden") is True and not pg.is_visible("#bwKpis"), "seta fecha o RESUMO FINANCEIRO")
        pg.click('[data-dobra="s3"] .bw-dobra'); pg.reload(); pg.wait_for_timeout(800)
        ok(pg.evaluate("document.getElementById('dobra_resumo').hidden && document.getElementById('dobra_s3').hidden && !document.getElementById('dobra_s1').hidden"), "fechadas continuam fechadas; as outras abertas")
        ok(pg.locator("#bwKpis .bw-kpi").count() == 4, "KPIs continuam na página (só escondidos)")
        pg.screenshot(path=f"/tmp/layout_{w}.png", full_page=False)
        ctx.close()
    b.close()
srv.shutdown(); print("FALHAS:", len(F), F); sys.exit(1 if F else 0)
