#!/usr/bin/env python3
"""Teste local dos 4 ajustes do EDITOR DE VÍDEO pedidos pelo dono em 21/11 (feitos em 22/11), com MOUSE de verdade do Playwright.
1) arrastar um take para CIMA de outro cria uma camada nova (e soltar mídia da biblioteca em cima de um take também);
2) rodinha em cima da prévia = zoom in/out (só a vista) + selo para voltar a 100%; clicar na prévia abre o menu de opções;
3) Alt + rodinha em cima de uma camada = mais alta/mais baixa até o mínimo; Ctrl + rodinha continua mudando o tempo na tela;
4) transições e efeitos por ARRASTO (abas ◧ TRANSIÇÕES / ✦ EFEITOS), emenda ◆ marcada com o nome, tempo da transição por arrasto na emenda
   e na alça da própria camada, toque na emenda abre a lista. Toque (390 px): segurar e arrastar da biblioteca.
Uso (na raiz): python3 docs/testes/teste_video_arrastar.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_arrastar"; PORTA = 8868
os.makedirs(TMP, exist_ok=True)
for nome, cor in (("azul", "0x1e3cdc"), ("verde", "0x18b43c")):
    if not os.path.exists(f"{TMP}/{nome}.webm"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={cor}:size=360x640:rate=25:duration=6", "-c:v", "libvpx", "-b:v", "300k", f"{TMP}/{nome}.webm"], check=True)
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
def centro(pg, sel):
    pg.locator(sel).first.scroll_into_view_if_needed(); b = pg.locator(sel).first.bounding_box(); return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2, b
def arrastar(pg, x0, y0, x1, y1, passos=12):
    pg.mouse.move(x0, y0); pg.mouse.down(); 
    for i in range(1, passos + 1): pg.mouse.move(x0 + (x1 - x0) * i / passos, y0 + (y1 - y0) * i / passos); pg.wait_for_timeout(15)
    pg.mouse.up(); pg.wait_for_timeout(350)
CL = "__video.P().clips"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        cel = largura < 500; print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
        pg.set_input_files("#veArq", [f"{TMP}/azul.webm", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 2", timeout=15000); pg.wait_for_timeout(400)
        ids = pg.evaluate("Object.values(__video.MID).filter(m=>m.tipo==='video').map(m=>m.id)")
        pg.evaluate(f"(()=>{{const M=__video.MID;__video.addClip(M['{ids[0]}']);__video.addClip(M['{ids[1]}']);const cs={CL};cs[0].dur=3;cs[1].ini=3;cs[1].dur=3;__video.tudo();}})()"); pg.wait_for_timeout(400)
        if not cel:
            # 1) arrastar o 2º take por cima do 1º (mesma camada) → camada nova
            c2 = pg.evaluate(f"{CL}[1].id"); x, y, bx = centro(pg, f'[data-clip="{c2}"]'); pr = pg.evaluate("__video.pps()")
            # 22/11 10:05 (dono): ENCOSTAR um take no outro (menos de 60% por cima) NÃO troca nem substitui — só encosta ao lado
            c1 = pg.evaluate(f"{CL}[0].id")
            def solto(dx, dy=2):
                x, y, _ = centro(pg, f'[data-clip="{c2}"]'); pg.mouse.move(x, y); pg.mouse.down()
                for i in range(1, 13): pg.mouse.move(x + dx * pr * i / 12, y + dy * i / 12); pg.wait_for_timeout(15)
                d = pg.inner_text("#veDicaArr") if pg.is_visible("#veDicaArr") else ""; pg.mouse.up(); pg.wait_for_timeout(350); return d
            dica = solto(-0.7)
            ok("ENCOSTAR" in dica, f"1) take um pouco por cima do outro (≈23%) mostra ⇤ ENCOSTAR ({dica.strip()})")
            st = pg.evaluate(f"(()=>{{const a={CL}.find(c=>c.id==='{c1}'),b={CL}.find(c=>c.id==='{c2}');return [a.ini,b.ini,a.trilha,b.trilha,{CL}.length]}})()")
            ok(st[0] == 0 and st[1] == 3 and st[2] == st[3] == "v1" and st[4] == 2, f"…ao soltar ele ENCOSTA no fim do outro, sem trocar, sem substituir e sem camada nova ({st})")
            ok(pg.locator("#veEscolha").count() == 0, "…e não aparece a pergunta (só aparece com 60% ou mais)")
            # ≥ 60% por cima: ao soltar aparece a ESCOLHA e nada muda até o toque
            def por_cima():
                d = solto(-2.2); return d
            dica = por_cima()
            ok("escolher" in dica.lower(), f"1c) take 73% por cima do outro avisa que ao soltar vai PERGUNTAR ({dica.strip()})")
            ok(pg.locator("#veEscolha").is_visible() and all(t in pg.inner_text("#veEscolha") for t in ("TROCAR DE LUGAR", "SUBSTITUIR", "PÔR POR CIMA", "CANCELAR")), "…ao soltar aparece a escolha: TROCAR / SUBSTITUIR / PÔR POR CIMA / CANCELAR")
            pg.wait_for_timeout(600)
            st = pg.evaluate(f"(()=>{{const a={CL}.find(c=>c.id==='{c1}');return [a.ini,a.trilha,{CL}.length]}})()")
            ok(st == [0, "v1", 2] and pg.locator("#veEscolha").is_visible(), f"…e NADA foi aplicado sozinho enquanto não toca ({st})")
            pg.click('#veEscolha [data-esc="trocar"]'); pg.wait_for_timeout(300)
            st = pg.evaluate(f"(()=>{{const a={CL}.find(c=>c.id==='{c1}'),b={CL}.find(c=>c.id==='{c2}');return [a.ini,b.ini,a.trilha,b.trilha]}})()")
            ok(st[1] == 0 and st[0] == 3 and st[2] == st[3] == "v1", f"⇄ TROCAR DE LUGAR (só depois do toque) troca os dois ({st})")
            pg.evaluate("__video.desfazer()"); pg.wait_for_timeout(300)
            ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').ini") == 3, "↶ desfazer volta como estava (um toque só)")
            por_cima(); pg.click('#veEscolha [data-esc="subst"]'); pg.wait_for_timeout(300)
            st = pg.evaluate(f"(()=>{{const b={CL}.find(c=>c.id==='{c2}');return [{CL}.length,!!{CL}.find(c=>c.id==='{c1}'),b.ini,b.trilha]}})()")
            ok(st == [1, False, 0, "v1"], f"⟳ SUBSTITUIR: o outro sai e este entra no lugar dele ({st})")
            pg.evaluate("__video.desfazer()"); pg.wait_for_timeout(300); ok(pg.evaluate(f"{CL}.length") == 2, "↶ desfazer traz o take substituído de volta")
            por_cima(); pg.click('#veEscolha [data-esc="cima"]'); pg.wait_for_timeout(300)
            tr = pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trilha"); ok(tr != "v1" and tr.startswith("v") and pg.locator(f'[data-rot="{tr}"]').is_visible(), f"⬆ PÔR POR CIMA cria a camada nova só depois do toque ({tr})")
            pg.evaluate("__video.desfazer()"); pg.wait_for_timeout(300); ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trilha") == "v1", "↶ desfazer volta o take para a camada de antes")
            por_cima(); pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            st = pg.evaluate(f"(()=>{{const b={CL}.find(c=>c.id==='{c2}');return [b.ini,b.trilha,{CL}.length]}})()")
            ok(st == [3, "v1", 2] and pg.locator("#veEscolha").count() == 0, f"Esc (ou tocar fora) = CANCELAR: o take volta para onde estava ({st})")
            por_cima(); pg.mouse.click(8, 8); pg.wait_for_timeout(300)
            ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').ini") == 3 and pg.locator("#veEscolha").count() == 0, "…tocar fora também cancela")
            # 1b) soltar mídia da biblioteca em cima de um take
            n0 = pg.evaluate(f"{CL}.length"); xi, yi, _ = centro(pg, f'#veLib [data-mid="{ids[1]}"]'); c1 = pg.evaluate(f"{CL}[0].id"); xc, yc, _ = centro(pg, f'[data-clip="{c1}"]')
            arrastar(pg, xi, yi, xc, yc, 18); n1 = pg.evaluate(f"{CL}.length"); nv = pg.evaluate(f"{CL}[{CL}.length-1].trilha")
            ok(n1 == n0 + 1 and nv != "v1", f"1b) vídeo arrastado da BIBLIOTECA em cima de um take entra numa camada nova ({nv})")
            ok(pg.evaluate(f"Math.abs({CL}[{CL}.length-1].ini - 1.5) < 1.2"), "…no tempo em que foi solto")
            pg.evaluate("__video.desfazer()"); pg.wait_for_timeout(300)
            # 3) Alt + rodinha na camada v1
            xc, yc, _ = centro(pg, '[data-trilha="v1"]'); h0 = pg.evaluate("document.querySelector('[data-trilha=\"v1\"]').getBoundingClientRect().height")
            pg.mouse.move(xc, yc); pg.keyboard.down("Alt")
            for _ in range(10): pg.mouse.wheel(0, 120); pg.wait_for_timeout(30)
            pg.keyboard.up("Alt"); pg.wait_for_timeout(200)
            h1 = pg.evaluate("document.querySelector('[data-trilha=\"v1\"]').getBoundingClientRect().height"); hr = pg.evaluate("document.querySelector('[data-rot=\"v1\"]').getBoundingClientRect().height")
            ok(h1 < h0 and h1 == 22 and abs(hr - h1) < 1, f"3) Alt + rodinha deixa a camada mais baixa até o mínimo ({h0:.0f} → {h1:.0f} px) e o nome acompanha")
            pg.keyboard.down("Alt"); pg.mouse.move(xc, pg.evaluate("document.querySelector('[data-trilha=\"v1\"]').getBoundingClientRect().top+10"))
            for _ in range(6): pg.mouse.wheel(0, -120); pg.wait_for_timeout(30)
            pg.keyboard.up("Alt"); pg.wait_for_timeout(200); h2 = pg.evaluate("document.querySelector('[data-trilha=\"v1\"]').getBoundingClientRect().height")
            ok(h2 > h1, f"…e mais alta ao rolar para cima ({h2:.0f} px); fica guardada no projeto ({pg.evaluate('JSON.stringify(__video.P().alt)')})")
            pp0 = pg.evaluate("__video.pps()"); pg.keyboard.down("Control"); pg.mouse.wheel(0, -120); pg.keyboard.up("Control"); pg.wait_for_timeout(200)
            ok(pg.evaluate("__video.pps()") > pp0, "Ctrl + rodinha continua aproximando o tempo (horizontal)")
            # 2) rodinha na prévia
            xv, yv, _ = centro(pg, "#veCv")
            pg.mouse.move(xv, yv)
            for _ in range(4): pg.mouse.wheel(0, -120); pg.wait_for_timeout(40)
            tf = pg.evaluate("getComputedStyle(document.getElementById('veCv')).transform"); ok("matrix" in tf and pg.locator("#veZoomP").is_visible(), f"2a) rodinha em cima da prévia aproxima ({pg.inner_text('#veZoomP').strip()})")
            ok(pg.evaluate("document.getElementById('veCv').width") in (720, 1080, 1280, 1920), "…só a VISTA muda (o tamanho do vídeo não)")
            for _ in range(8): pg.mouse.wheel(0, 120); pg.wait_for_timeout(40)
            ok(int(pg.inner_text("#veZoomP").split()[1].rstrip("%")) < 100, f"…e afasta ({pg.inner_text('#veZoomP').strip()})")
            pg.click("#veZoomP"); pg.wait_for_timeout(150); ok(not pg.locator("#veZoomP").is_visible() and pg.evaluate("document.getElementById('veCv').style.transform") == "", "o selo volta a 100%")
            pg.evaluate("__video.irPara(1)"); pg.mouse.click(xv, yv); pg.wait_for_timeout(300)
            ok(pg.locator(".bwf-menu").count() == 0, "2b) clicar na prévia NÃO abre mais o menu (pedido do dono, 22/11)")
            ok(pg.locator("#veOpcP").is_visible() and pg.inner_text("#veOpcP").strip() == "⋯", "…os ⋯ discretos ficam no alto da prévia")
            pg.click("#veOpcP"); pg.wait_for_timeout(300)
            menu = pg.locator(".bwf-menu"); ok(menu.count() == 1 and "Aproximar" in menu.inner_text() and "Desafixar" in menu.inner_text() and "segundo monitor" in menu.inner_text(), "…e os ⋯ abrem as OPÇÕES (zoom, desafixar, 2º monitor, tela cheia, quadro…)")
            pg.wait_for_timeout(500); pg.locator(".bwf-menu button", has_text="Aproximar").click(); pg.wait_for_timeout(200)
            ok(pg.locator("#veZoomP").is_visible(), "…e Aproximar pelo menu funciona"); pg.click("#veZoomP")
            sel0 = pg.evaluate(f"(()=>{{const c={CL}[0];return [c.x||0,c.y||0]}})()")
            pg.evaluate(f"__video.sel({CL}[0].id)"); arrastar(pg, xv, yv, xv + 40, yv + 30); ok(pg.locator(".bwf-menu").count() == 0 and pg.evaluate(f"({CL}[0].x||0)") != sel0[0], "arrastar na prévia continua movendo o take (sem abrir o menu)")
            pg.evaluate("__video.desfazer()")
            # 4) transições/efeitos por arrasto
            pg.click('#veAbas [data-aba="trans"]'); pg.wait_for_timeout(200); ok(pg.locator("#veLib [data-arr^='t:']").count() == 11, "4) aba ◧ TRANSIÇÕES com as 11 transições (prévia animada)")
            c2 = pg.evaluate(f"{CL}[1].id")
            # 22/11 10:05 (dono): a transição vai na EMENDA onde está a AGULHA
            pg.evaluate("__video.sel(null)"); pg.evaluate("__video.irPara(3)"); pg.wait_for_timeout(200)
            ok(pg.locator(f'[data-junta="{c2}"].agulha').count() == 1, "4a) agulha na emenda entre os dois takes: o ◆ acende")
            pg.click("#veLib [data-arr='t:girar']"); pg.wait_for_timeout(300)
            ok(pg.evaluate(f"({CL}.find(c=>c.id==='{c2}').trans||{{}}).tipo") == "girar", "…tocar numa transição aplica NA EMENDA da agulha (sem escolher take)")
            pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trans=null; __video.tudo(); __video.sel(null); __video.irPara(1.4)"); pg.wait_for_timeout(300)
            ok(pg.locator(".ve-junta.agulha").count() == 0, "…com a agulha no meio de um take, nenhum ◆ acende")
            pg.click("#veLib [data-arr='t:girar']"); pg.wait_for_timeout(300)
            ok(not pg.evaluate(f"!!{CL}.find(c=>c.id==='{c2}').trans"), "…e tocar na transição longe da emenda não aplica em lugar errado (avisa onde pôr a agulha)")
            xt, yt, _ = centro(pg, "#veLib [data-arr='t:zoom']"); xj, yj, _ = centro(pg, f'[data-junta="{c2}"]')
            arrastar(pg, xt, yt, xj, yj, 20)
            ok(pg.evaluate(f"({CL}.find(c=>c.id==='{c2}').trans||{{}}).tipo") == "zoom", "transição ZOOM arrastada até a emenda ◆ entrou no take")
            ok(pg.locator(f'[data-junta="{c2}"].com').count() == 1 and "Zoom" in pg.inner_text(f'[data-junta="{c2}"]'), "…a emenda fica MARCADA com o nome da transição")
            d0 = pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trans.dur"); xj, yj, _ = centro(pg, f'[data-junta="{c2}"]'); pps = pg.evaluate("__video.pps()")
            arrastar(pg, xj, yj, xj + 0.8 * pps, yj); d1 = pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trans.dur")
            ok(d1 > d0 + 0.5, f"arrastar a emenda para o lado aumenta o tempo da transição ({d0} → {d1} s)")
            xh, yh, _ = centro(pg, f'[data-trp="{c2}"]'); arrastar(pg, xh, yh, xh - 0.6 * pps, yh); d2 = pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').trans.dur")
            ok(d2 < d1 - 0.3, f"…e a alça na própria camada diminui ({d1} → {d2} s)")
            xj, yj, _ = centro(pg, f'[data-junta="{c2}"]'); pg.mouse.click(xj, yj); pg.wait_for_timeout(300)
            ok(pg.locator(".bwf-menu").count() == 1 and "Dissolver" in pg.inner_text(".bwf-menu") and "TEMPO" in pg.inner_text(".bwf-menu").upper(), "tocar na emenda abre a lista de transições e de tempos")
            pg.keyboard.press("Escape"); pg.mouse.click(5, 5); pg.wait_for_timeout(200)
            pg.click('#veAbas [data-aba="efe"]'); pg.wait_for_timeout(200); c1 = pg.evaluate(f"{CL}[0].id"); xe, ye, _ = centro(pg, "#veLib [data-arr='e:pb']"); xc, yc, _ = centro(pg, f'[data-clip="{c1}"]')
            arrastar(pg, xe, ye, xc, yc, 20); ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c1}').efeito") == "pb" and "Preto e branco" in pg.inner_text(f'[data-clip="{c1}"]'), "efeito PRETO E BRANCO arrastado até o take: aplicado e marcado no take")
            pg.evaluate(f"__video.sel('{c2}')"); pg.click("#veLib [data-arr='e:sepia']"); pg.wait_for_timeout(200); ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c2}').efeito") == "sepia", "tocar num efeito põe no take escolhido")
            sw = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(sw <= 0, f"sem estouro lateral ({sw})")
        else:
            # toque: segurar e arrastar da biblioteca
            pg.click('#veAbas [data-aba="trans"]'); pg.wait_for_timeout(200)
            c2 = pg.evaluate(f"{CL}[1].id"); pg.locator(f'[data-junta="{c2}"]').scroll_into_view_if_needed()
            cdp = ctx.new_cdp_session(pg)
            def toque(tipo, x, y): cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": ([{"x": x, "y": y}] if tipo != "touchEnd" else [])})
            xt, yt, _ = centro(pg, "#veLib [data-arr='t:branco']")
            toque("touchStart", xt, yt); pg.wait_for_timeout(320)
            for i in range(1, 11): toque("touchMove", xt, yt + (altura - 20 - yt) * i / 10); pg.wait_for_timeout(20)
            for _ in range(200):   # dedo parado na borda de baixo: a página rola sozinha até a emenda aparecer
                r = pg.evaluate(f"document.querySelector('[data-junta=\"{c2}\"]').getBoundingClientRect().top")
                if 120 < r < altura - 120: break
                toque("touchMove", xt, altura - 20); pg.wait_for_timeout(30)
            toque("touchMove", xt, altura / 2); pg.wait_for_timeout(150)   # tira o dedo da borda (para de rolar)
            b2 = pg.locator(f'[data-junta="{c2}"]').bounding_box(); xj, yj = b2["x"] + b2["width"] / 2, b2["y"] + b2["height"] / 2
            for i in range(1, 11): toque("touchMove", xt + (xj - xt) * i / 10, altura / 2 + (yj - altura / 2) * i / 10); pg.wait_for_timeout(25)
            toque("touchEnd", xj, yj); pg.wait_for_timeout(400)
            ok(pg.evaluate(f"({CL}.find(c=>c.id==='{c2}').trans||{{}}).tipo") == "branco", "TOQUE: segurar, levar o dedo até a borda (a página rola sozinha) e soltar a transição na emenda")
            pg.click('#veAbas [data-aba="tudo"]'); pg.wait_for_timeout(200)
            n0 = pg.evaluate(f"{CL}.length"); xi, yi, _ = centro(pg, f'#veLib [data-mid="{ids[0]}"]'); toque("touchStart", xi, yi); toque("touchMove", xi, yi + 60); toque("touchEnd", xi, yi + 60); pg.wait_for_timeout(300)
            ok(pg.evaluate(f"{CL}.length") == n0, "TOQUE: passar o dedo rápido na biblioteca rola, não arrasta")
            sw = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(sw <= 0, f"sem estouro lateral ({sw})")
        ok(not erros, "sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
