#!/usr/bin/env python3
"""Teste local (22/11): ESTÚDIO DE MOTION com as ferramentas do editor de vídeo — barra arrastada em cima de outra camada (⬆ PARA CIMA na hora /
⇄ TROCAR DE LUGAR), Alt + rodinha (altura das camadas), rodinha na prévia (zoom da vista) e clique = opções, EFEITOS em galeria arrastados até
a barra (esquerda = entrada, direita = saída) e tocados, COR por item (filtro no motor), Q/W, Shift+E, copiar/colar ajustes, prévia em outra
janela com o mesmo motor e controle pelo celular. 1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_motion_ferramentas.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8858
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
P = "BWMotionEditor.projeto()"
def centro(pg, sel):
    b = pg.locator(sel).first.bounding_box(); return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, b
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "motion.html"); pg.wait_for_function("window.BWMotionEditor", timeout=15000); pg.wait_for_timeout(700)
        n = pg.evaluate(f"{P}.itens.length"); ids = pg.evaluate(f"{P}.itens.map(i=>i.id)")
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro")
        ok(pg.locator("#moEfs .mo-ef").count() > 15, f"galeria de EFEITOS ({pg.locator('#moEfs .mo-ef').count()})")
        # COR (filtro no motor)
        alvo = ids[-1]; pg.evaluate(f"BWMotionEditor.selecionar('{alvo}')"); pg.wait_for_timeout(200)
        if cel: pg.click('#moAbasCel [data-aba="item"]'); pg.wait_for_timeout(150)
        h4 = pg.locator('#moPainel h4[data-seta="mo_cor"]')
        if h4.count() and not pg.locator('#moPainel [data-look="pb"]').is_visible(): h4.click(); pg.wait_for_timeout(150)
        pg.locator('#moPainel [data-look="pb"]').click(); pg.wait_for_timeout(600)
        ver = pg.evaluate(f"(()=>{{const it={P}.itens.find(i=>i.id==='{alvo}');BWMotionEditor.ver((it.ini+it.fim)/2);return getComputedStyle(document.querySelector('#moCena [data-item=\"{alvo}\"]')).filter}})()")
        ok("grayscale(1)" in ver, f"COR: look P&B vira filtro no motor ({ver})")
        ok(pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').cor.pb") == 100, "…e fica guardado no item")
        # Shift+E, Q/W, copiar/colar ajustes (atalhos)
        if not cel:
            pg.mouse.click(5, H - 5); pg.evaluate(f"BWMotionEditor.selecionar('{alvo}')")
            pg.keyboard.press("Shift+E"); pg.wait_for_timeout(150); ok(pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').oculto") is True, "Shift+E desativa o item (sem apagar)")
            pg.keyboard.press("Shift+E"); pg.wait_for_timeout(150); ok(not pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').oculto"), "…e ativa de novo")
            it = pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}')"); meio = round((it["ini"] + it["fim"]) / 2, 2); pg.evaluate(f"BWMotionEditor.ver({meio})")
            pg.keyboard.press("q"); pg.wait_for_timeout(150); ok(abs(pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').ini") - meio) < 0.02, "Q corta o começo até a agulha")
            pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
            pg.evaluate(f"BWMotionEditor.selecionar('{alvo}')"); pg.keyboard.press("Control+Shift+c"); outro = ids[-2]
            pg.evaluate(f"BWMotionEditor.selecionar('{outro}')"); pg.keyboard.press("Control+Shift+v"); pg.wait_for_timeout(200)
            ok(pg.evaluate(f"({P}.itens.find(i=>i.id==='{outro}').cor||{{}}).pb") == 100, "Ctrl+Shift+C / V copia e cola os ajustes (cor e efeitos)")
        # EFEITO tocado = aplica no escolhido
        if cel: pg.click('#moAbasCel [data-aba="lib"]'); pg.wait_for_timeout(150)
        pg.evaluate(f"BWMotionEditor.selecionar('{alvo}')"); pg.locator('#moEfs [data-ef="loop:pulsar"], #moEfs [data-ef^="loop:"]').first.click(); pg.wait_for_timeout(250)
        ok(pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').loop.efeito") not in (None, "nenhum"), "tocar num efeito DURANTE aplica no item escolhido")
        if not cel:
            # EFEITO arrastado até a barra: esquerda = entrada, direita = saída
            ef = pg.evaluate("[...document.querySelectorAll('#moEfs [data-ef^=\"ent:\"]')].map(b=>b.dataset.ef).find(e=>!/palavras|maquina/.test(e))").split(":")[1]
            pg.locator(f'#moEfs [data-ef="ent:{ef}"]').scroll_into_view_if_needed(); x0, y0, _ = centro(pg, f'#moEfs [data-ef="ent:{ef}"]')
            pg.locator(f'[data-barra="{alvo}"]').scroll_into_view_if_needed(); bb = pg.locator(f'[data-barra="{alvo}"]').bounding_box()
            x0, y0, _ = centro(pg, f'#moEfs [data-ef="ent:{ef}"]')
            for lado, xb in (("saida", bb["x"] + bb["width"] * 0.85), ("entrada", bb["x"] + bb["width"] * 0.15)):
                pg.mouse.move(x0, y0); pg.mouse.down()
                for i in range(1, 15): pg.mouse.move(x0 + (xb - x0) * i / 14, y0 + (bb["y"] + bb["height"] / 2 - y0) * i / 14); pg.wait_for_timeout(12)
                vis = pg.locator(".mo-fantasma").count() == 1; pg.mouse.up(); pg.wait_for_timeout(300)
                ok(vis and pg.evaluate(f"{P}.itens.find(i=>i.id==='{alvo}').{lado}.efeito") == ef, f"efeito arrastado até a barra vira {lado.upper()} ({ef})")
            # CAMADAS: arrastar a barra para cima de outra camada
            pg.evaluate("BWMotionEditor.ver(0)"); ordem0 = pg.evaluate(f"{P}.itens.map(i=>i.id)")
            a_id = ordem0[0]; c_id = ordem0[1]   # a (mais atrás) passa a ficar por cima de c
            pg.locator(f'[data-barra="{a_id}"]').scroll_into_view_if_needed()
            xa, ya, ba = centro(pg, f'[data-barra="{a_id}"]'); pc = pg.locator(f'[data-barra="{c_id}"]').locator("xpath=..").bounding_box()
            pg.mouse.move(xa, ya); pg.mouse.down()
            for i in range(1, 13): pg.mouse.move(xa + 6 * i / 12, ya + (pc["y"] + pc["height"] * 0.2 - ya) * i / 12); pg.wait_for_timeout(15)
            ordem1 = pg.evaluate(f"{P}.itens.map(i=>i.id)")
            ok(ordem1.index(a_id) == ordem1.index(c_id) + 1, "⬆ PARA CIMA: a camada passa por cima da outra NA HORA (antes de soltar)")
            ok(pg.is_visible("#moDicaArr") and "PARA CIMA" in pg.inner_text("#moDicaArr"), "…com o aviso ⬆ PARA CIMA")
            pg.mouse.up(); pg.wait_for_timeout(300); ok(not pg.is_visible("#moDicaArr") and pg.evaluate(f"{P}.itens.length") == n, "…o aviso some e nenhum item some")
            pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
            ordem0 = pg.evaluate(f"{P}.itens.map(i=>i.id)"); a_id = ordem0[0]; c_id = ordem0[1]
            xa, ya, ba = centro(pg, f'[data-barra="{a_id}"]'); pc = pg.locator(f'[data-barra="{c_id}"]').locator("xpath=..").bounding_box()
            pg.mouse.move(xa, ya); pg.mouse.down()
            for i in range(1, 13): pg.mouse.move(xa + 6 * i / 12, ya + (pc["y"] + pc["height"] * 0.75 - ya) * i / 12); pg.wait_for_timeout(15)
            ok(pg.is_visible("#moDicaArr") and "TROCAR DE LUGAR" in pg.inner_text("#moDicaArr"), "⇄ em cima da camada aparece TROCAR DE LUGAR")
            pg.mouse.up(); pg.wait_for_timeout(300); ordem1 = pg.evaluate(f"{P}.itens.map(i=>i.id)")
            ok(ordem1[0] == c_id and ordem1[1] == a_id, "…soltar troca as duas camadas de lugar")
            # Alt + rodinha = altura
            xr, yr, _ = centro(pg, "#moPistas .mo-pista"); h0 = pg.locator("#moPistas .mo-pista").first.bounding_box()["height"]
            pg.mouse.move(xr, yr); pg.keyboard.down("Alt"); pg.mouse.wheel(0, -100); pg.mouse.wheel(0, -100); pg.keyboard.up("Alt"); pg.wait_for_timeout(200)
            h1 = pg.locator("#moPistas .mo-pista").first.bounding_box()["height"]; ok(h1 > h0 + 6 and pg.locator("#moRot div").nth(1).bounding_box()["height"] == h1, f"Alt + rodinha deixa as camadas mais altas ({h0:.0f} → {h1:.0f} px), nome e faixa juntos")
            # rodinha na prévia = zoom da vista; clique = opções
            pg.evaluate(f"BWMotionEditor.selecionar(null)"); xt, yt, bt = centro(pg, "#moTela"); w0 = bt["width"]
            pg.mouse.move(xt, yt); pg.mouse.wheel(0, -120); pg.mouse.wheel(0, -120); pg.wait_for_timeout(200)
            ok(pg.locator("#moTela").bounding_box()["width"] > w0 * 1.15 and pg.is_visible("#moVZ") and pg.evaluate(f"{P}.w") in (1080, 1920), "rodinha na prévia aproxima SÓ a vista (o tamanho do vídeo não muda) e mostra 🔍 %")
            pg.click("#moVZ"); pg.wait_for_timeout(150); ok(abs(pg.locator("#moTela").bounding_box()["width"] - w0) < 2, "🔍 % ✕ volta a vista para 100%")
            vazio = pg.evaluate("(()=>{const t=document.getElementById('moTela').getBoundingClientRect();for(let y=t.top+4;y<t.bottom;y+=9)for(let x=t.left+4;x<t.right;x+=9){const e=document.elementFromPoint(x,y);if(e&&!e.closest('[data-item]')&&e.closest('#moTela'))return [x,y]}return null})()")
            if vazio:
                pg.mouse.click(vazio[0], vazio[1]); pg.wait_for_timeout(250)
                ok(pg.locator(".bwf-menu").count() == 0, "clicar na prévia NÃO abre mais o menu (pedido do dono, 22/11)")
                ok(pg.locator("#moOpcP").is_visible(), "…os ⋯ discretos ficam no alto da prévia")
                ob = pg.locator("#moOpcP").bounding_box(); tb = pg.locator("#moTela").bounding_box()
                ok(ob["y"] < tb["y"] + 30 and ob["x"] + ob["width"] <= tb["x"] + tb["width"] + 2 and ob["x"] > tb["x"] + tb["width"] / 2, "…no canto de cima, à direita, dentro da prévia")
                pg.click("#moOpcP"); pg.wait_for_timeout(250)
                ok("Aproximar" in pg.inner_text("body") and "segundo monitor" in pg.inner_text("body"), "…e os ⋯ abrem as OPÇÕES (zoom, 2º monitor, tela cheia, celular)")
                pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
            # prévia em outra janela
            with pg.expect_popup() as pop: pg.click("#moJanela")
            jan = pop.value; jan.wait_for_function("document.querySelectorAll('[data-item]').length > 0", timeout=8000); pg.wait_for_timeout(300)
            ok(jan.locator("[data-item]").count() == pg.locator("#moCena [data-item]").count(), "🖥 a janela solta mostra a mesma animação (mesmo motor)")
            pg.evaluate("BWMotionEditor.ver(2.5)"); pg.wait_for_timeout(100)
            ok(jan.evaluate("[...document.querySelectorAll('[data-item]')].map(e=>e.style.display+e.style.transform).join('|')") == pg.evaluate("[...document.querySelectorAll('#moCena [data-item]')].map(e=>e.style.display+e.style.transform).join('|')"), "…e acompanha a agulha do editor")
            jan.close()
            # controle pelo celular
            pg.evaluate("window.__ctl=null; const o=BWControle.painel; BWControle.painel=function(api){window.__ctl=api; return o.apply(this, arguments)}")
            pg.click("#moCelular"); pg.wait_for_timeout(300)
            ok(pg.evaluate("!!(window.__ctl && __ctl.total()>0 && typeof __ctl.irPara==='function')"), "📱 abre o controle pelo celular com o tempo do motion")
            pg.evaluate("__ctl.irPara(1.5)"); ok(abs(pg.evaluate("BWMotionEditor.tempo()") - 1.5) < 0.01, "…e o comando do celular anda o tempo")
        ok(not er, f"0 erros de JS {er[:2]}")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not F else f"❌ {len(F)} falhas: {F}"))
