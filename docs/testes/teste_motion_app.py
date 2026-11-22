#!/usr/bin/env python3
"""Teste local do LAYOUT DE APP do ESTÚDIO DE MOTION (22/11, "o Motion com cara de app no celular, igual ao editor de vídeo") — mesmo método do teste_video_app.py.
Antes: Teste local do LAYOUT DE APP do EDITOR DE VÍDEO (22/11, pedido do dono com prints do CapCut do celular) — com TOQUE de verdade (CDP).
Confere: no celular a tela vira app (topo fino, prévia grande, ▶ no meio, linha do tempo com a agulha parada no meio, faixa de ferramentas
que rola para o lado); nada estoura; tocar num take troca a faixa para as ferramentas DELE (vídeo, texto, som); cada ferramenta abre uma
FOLHA só com aquele ajuste e o ajuste vale; ✓ fecha; tocar no vazio volta às ferramentas do projeto; Áudio/Texto abrem submenu com ‹ voltar;
MÍDIA abre a biblioteca e um toque põe o take; FORMATO troca o formato; rolar a linha do tempo anda no vídeo e tocar faz ela andar sozinha;
segurar o dedo no take abre as opções; EXPORTAR chama a exportação; desfazer; no PC (1280) continua o layout antigo e ?layout=app liga o novo.
Uso (na raiz): python3 docs/testes/teste_video_app.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_motion_app"; PORTA = 8873
os.makedirs(TMP, exist_ok=True)
for nome, cor in (("azul", "0x1e3cdc"), ("verde", "0x18b43c")):
    if not os.path.exists(f"{TMP}/{nome}.webm"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={cor}:size=360x640:rate=25:duration=6", "-f", "lavfi", "-i", "sine=f=440:d=6",
                        "-c:v", "libvpx", "-b:v", "300k", "-c:a", "libvorbis", "-shortest", f"{TMP}/{nome}.webm"], check=True)
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
IT = "BWMotionEditor.projeto().itens"; E = "BWMotionEditor"
def visivel(pg, sel): return pg.evaluate(f"(()=>{{const e=document.querySelector({sel!r});if(!e)return false;const r=e.getBoundingClientRect();return e.getClientRects().length>0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden'}})()")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for nomeT, vp in (("celular 390", (390, 844)), ("tablet 820", (820, 1180))):
        print(f"\n=== {nomeT} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept(d.default_value) if d.type == "prompt" else d.accept())
        cdp = ctx.new_cdp_session(pg)
        def toque(x, y, segurar=0):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(int(segurar * 1000) or 40)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(250)
        def tocar_el(sel, segurar=0):
            bx = pg.locator(sel).first.bounding_box(); x = bx["x"] + bx["width"] / 2
            if "data-barra" in sel: x = max(bx["x"] + 8, min(x, vp[0] - 70))
            toque(x, bx["y"] + bx["height"] / 2, segurar)
        def ferr(rot): return pg.locator("#maFaixa .ma-f", has_text=rot).first
        pg.goto(BASE + "motion.html"); pg.wait_for_function("window.BWMotionEditor && !!document.getElementById('moApp')", timeout=15000); pg.wait_for_timeout(700)
        ok(pg.evaluate("document.documentElement.classList.contains('mo-app')") and visivel(pg, "#moApp"), "a tela vira APP (layout novo ligado sozinho)")
        ok(not visivel(pg, ".bw-foco-barra") and not visivel(pg, ".wrap"), "o layout antigo e a barra de foco somem")
        tl = pg.evaluate("(()=>{const r=document.getElementById('moTela').getBoundingClientRect();return [r.top,r.bottom,r.height]})()")
        ok(tl[2] > vp[1] * 0.35 and tl[0] > 40, f"a PRÉVIA é grande e fica logo abaixo do topo ({tl[2]:.0f} px)")
        ok(visivel(pg, "#maPlay") and visivel(pg, "#maExportar") and visivel(pg, "#maDesf") and visivel(pg, "#moOpcP"), "▶ no meio, Exportar no topo, desfazer e ⋯ da prévia")
        sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"nada estoura para o lado ({sw})")
        sh = pg.evaluate("document.documentElement.scrollHeight-innerHeight"); ok(sh <= 2, f"a página não rola: tudo cabe numa tela ({sh})")
        raiz = pg.evaluate("[...document.querySelectorAll('#maFaixa .ma-f span')].map(s=>s.textContent)")
        ok(all(x in raiz for x in ("Itens", "Texto", "Efeitos", "Fundo", "Modelos", "Automático", "Formato", "Projeto")), f"faixa do projeto: {', '.join(raiz[:8])}…")
        ok(pg.evaluate("getComputedStyle(document.getElementById('maFaixa')).overflowX") == "auto", "a faixa de ferramentas rola para o lado")
        # ITENS
        n0 = pg.evaluate(f"{IT}.length")
        ferr("Itens").click(); pg.wait_for_timeout(300); ok(visivel(pg, "#maSheet") and visivel(pg, "#moLib"), "ITENS abre a folha com a biblioteca")
        vis = pg.evaluate("[...document.querySelectorAll('#maSheetCorpo .mo-cx > .mo-g, #maSheetCorpo #moPainel > .mo-g')].filter(g=>g.getClientRects().length).length"); ok(vis == 1, f"a folha mostra SÓ a biblioteca ({vis} seção)")
        tocar_el('#moLib [data-add="titulo"], #moLib [data-add="chip"], #moLib [data-add]'); pg.wait_for_timeout(500)
        ok(pg.evaluate(f"{IT}.length") == n0 + 1 and not visivel(pg, "#maSheet"), "um toque põe o item na tela e FECHA a folha")
        ok("Editar" in pg.inner_text("#maFaixa"), "o item novo já fica escolhido (a faixa mostra as ferramentas dele)")
        pg.evaluate(f"{E}.selecionar(null)"); pg.wait_for_timeout(200)
        ferr("Texto").click(); pg.wait_for_timeout(500); ok(pg.evaluate(f"{IT}.some(i=>i.tipo==='texto')"), "TEXTO põe um texto direto")
        pg.evaluate(f"{E}.selecionar(null)"); pg.wait_for_timeout(200)
        # agulha parada no meio + rolar = andar
        ag = pg.evaluate("(()=>{const a=document.querySelector('.ma-agulha').getBoundingClientRect(),r=document.getElementById('moPistas').getBoundingClientRect();return [a.left+a.width/2,r.left+r.width/2]})()")
        ok(abs(ag[0] - ag[1]) < 3, "a AGULHA fica parada no meio da linha do tempo")
        pg.evaluate(f"(()=>{{const r=document.getElementById('moPistas');r.dispatchEvent(new Event('touchstart'));r.scrollLeft={E}.pxs()*3.5;}})()"); pg.wait_for_timeout(500)
        t = pg.evaluate(f"{E}.tempo()"); ok(abs(t - 3.5) < 0.15, f"rolar a linha do tempo anda no vídeo ({t:.2f} s)")
        pg.wait_for_timeout(500); pg.evaluate(f"{E}.ver(1)"); pg.wait_for_timeout(300)
        sl = pg.evaluate(f"document.getElementById('moPistas').scrollLeft/{E}.pxs()"); ok(abs(sl - 1) < 0.1, f"mudar a agulha por fora faz a linha do tempo seguir ({sl:.2f} s)")
        x0 = pg.evaluate(f"(()=>{{const p=document.getElementById('moPistas');return p.getBoundingClientRect().left+parseFloat(getComputedStyle(p).paddingLeft)-p.scrollLeft+{E}.tempo()*{E}.pxs()}})()")
        ok(abs(x0 - ag[1]) < 3, "o tempo da agulha cai exatamente embaixo dela (conta com a folga do meio)")
        tocar_el("#maPlay"); pg.wait_for_timeout(900); t1 = pg.evaluate(f"{E}.tempo()"); sl1 = pg.evaluate(f"document.getElementById('moPistas').scrollLeft/{E}.pxs()")
        ok(pg.evaluate(f"{E}.tocando()") and t1 > 1.3 and abs(sl1 - t1) < 0.25, f"▶ toca e a linha do tempo anda sozinha ({t1:.2f} s)")
        tocar_el("#maPlay"); pg.wait_for_timeout(200); ok(not pg.evaluate(f"{E}.tocando()"), "▶ de novo pausa")
        # tocar na barra → ferramentas do item
        pg.evaluate(f"{E}.ver(0.8)"); pg.wait_for_timeout(300)
        it1 = pg.evaluate(f"{IT}[0].id"); pg.evaluate(f"(()=>{{const b=document.querySelector('[data-barra=\"{it1}\"]'),c=b.closest('.mo-tl-corpo');c.scrollTop+=b.getBoundingClientRect().top-c.getBoundingClientRect().top-30}})()"); pg.wait_for_timeout(200)
        tocar_el(f'[data-barra="{it1}"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{E}.sel()") == it1, "tocar numa barra ESCOLHE o item")
        fx = pg.evaluate("[...document.querySelectorAll('#maFaixa .ma-f span')].map(s=>s.textContent)")
        ok(all(x in fx for x in ("Editar", "Posição", "Keyframe", "Entrada", "Saída", "Durante", "Cor", "Tempo", "Dividir", "Duplicar", "Excluir")), f"a faixa vira a do ITEM: {', '.join(fx[:9])}…")
        ferr("Cor").click(); pg.wait_for_timeout(300)
        ok(visivel(pg, "#maSheet") and "COR" in pg.inner_text("#maSheetTit"), "COR abre a folha da cor")
        vis = pg.evaluate("[...document.querySelectorAll('#maSheetCorpo .mo-cx > .mo-g, #maSheetCorpo #moPainel > .mo-g')].filter(g=>g.getClientRects().length).map(g=>(g.querySelector('h4')||{}).getAttribute&&g.querySelector('h4').getAttribute('data-seta'))")
        ok(vis == ["mo_cor"], f"a folha mostra SÓ a cor ({vis})")
        pg.evaluate("(()=>{const r=document.querySelector('#maSheetCorpo input[data-cor=\"sat\"]');r.value=40;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"({IT}.find(i=>i.id==='{it1}').cor||{{}}).sat") == 40, "mexer na barra da folha muda a cor do item")
        sp = pg.evaluate("(()=>{const s=document.getElementById('maSheet').getBoundingClientRect(),c=document.getElementById('moTela').getBoundingClientRect();return [s.top,c.top+c.height*0.4]})()")
        ok(sp[0] > sp[1], "com a folha aberta a prévia continua à vista em cima")
        tocar_el("#maSheetOk"); pg.wait_for_timeout(200)
        ferr("Entrada").click(); pg.wait_for_timeout(300); ok("ENTRADA" in pg.inner_text("#maSheetTit") and pg.locator("#maSheetCorpo [data-ent]").count() > 3, "ENTRADA abre os efeitos de entrada")
        pg.locator("#maSheetCorpo [data-ent]").nth(2).click(); pg.wait_for_timeout(300)
        ef = pg.evaluate(f"{IT}.find(i=>i.id==='{it1}').entrada.efeito"); ok(ef and ef != "nenhum", f"tocar num efeito muda a entrada do item ({ef})")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok(not visivel(pg, "#maSheet"), "Esc fecha a folha")
        ok(pg.evaluate("!!document.querySelector('.wrap #moDir')"), "o painel volta para o lugar dele quando a folha fecha")
        ferr("Editar").click(); pg.wait_for_timeout(300); ok(pg.locator("#maSheetCorpo [data-prop]").count() > 0 and "EDITAR" in pg.inner_text("#maSheetTit"), "EDITAR abre o conteúdo do item")
        tocar_el("#maSheetOk"); pg.wait_for_timeout(200)
        n1 = pg.evaluate(f"{IT}.length"); pg.evaluate(f"{E}.ver(1.2)"); pg.wait_for_timeout(200); ferr("Dividir").click(); pg.wait_for_timeout(500)
        ok(pg.evaluate(f"{IT}.length") == n1 + 1, "DIVIDIR corta o item na agulha")
        pg.wait_for_timeout(500); tocar_el("#maDesf"); pg.wait_for_timeout(400); ok(pg.evaluate(f"{IT}.length") == n1, "↶ desfaz com UM toque")
        pg.evaluate(f"{E}.selecionar('{it1}')"); pg.wait_for_timeout(200)
        ferr("Keyframe").click(); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"(({IT}.find(i=>i.id==='{it1}').keys||{{}}).x||[]).length") >= 1, "KEYFRAME marca a posição na agulha")
        pg.evaluate(f"(()=>{{const b=document.querySelector('[data-barra=\"{it1}\"]'),c=b.closest('.mo-tl-corpo');c.scrollTop+=b.getBoundingClientRect().top-c.getBoundingClientRect().top-30}})()"); pg.wait_for_timeout(200)
        tocar_el(f'[data-barra="{it1}"]', segurar=0.9); pg.wait_for_timeout(300)
        ok(pg.locator(".bwf-menu").count() == 1 and "Duplicar" in pg.inner_text(".bwf-menu"), "SEGURAR o dedo na barra abre as opções")
        pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())")
        ferr("Mais").click(); pg.wait_for_timeout(300); ok(pg.locator(".bwf-menu").count() == 1, "⋯ MAIS também abre todas as opções do item")
        pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())")
        tocar_el("#maFaixa .ma-f.volta"); pg.wait_for_timeout(250); ok(pg.evaluate(f"!{E}.sel()") and "Itens" in pg.inner_text("#maFaixa"), "‹ volta para as ferramentas do projeto")
        # formato
        tocar_el("#maFmt"); pg.wait_for_timeout(250); ok(pg.locator(".ma-fmt").count() >= 3, "o botão do formato abre os formatos")
        pg.locator(".ma-fmt[data-v='16:9']").first.click(); pg.wait_for_timeout(500)
        tw = pg.evaluate("(()=>{const r=document.getElementById('moTela').getBoundingClientRect();return r.width>r.height})()")
        ok(pg.evaluate("document.getElementById('moFmt').value") == "16:9" and tw and "16:9" in pg.inner_text("#maFmt"), "trocar para 16:9 muda a prévia e o botão do topo")
        fw = pg.evaluate("document.getElementById('maFaixa').getBoundingClientRect().width"); ok(fw <= vp[0] + 1, f"no 16:9 a faixa continua do tamanho da tela ({fw:.0f} px)")
        tocar_el("#maSheetOk"); pg.wait_for_timeout(200)
        # projeto: nome
        ferr("Projeto").click(); pg.wait_for_timeout(300); ok(pg.locator("#maSheetCorpo #moNome").is_visible() and pg.locator("#maSheetCorpo #moDur").is_visible(), "PROJETO mostra nome, duração e meus projetos")
        tocar_el("#maSheetOk"); pg.wait_for_timeout(200); ok(pg.evaluate("!!document.querySelector('.wrap #moNome')"), "nome e duração voltam ao lugar")
        # modelos
        tocar_el("#maModelos"); pg.wait_for_timeout(300); ok(pg.locator("#maSheetCorpo [data-modelo]").count() >= 3, "🎬 MODELOS abre os modelos prontos")
        pg.locator("#maSheetCorpo [data-modelo]").first.click(); pg.wait_for_timeout(700); ok(not visivel(pg, "#maSheet") and pg.evaluate(f"{IT}.length") > 0, "escolher um modelo aplica e fecha a folha")
        # tocar no vazio larga o item
        pg.evaluate(f"{E}.selecionar({IT}[0].id)"); pg.wait_for_timeout(200)
        reg = pg.locator("#moRegua").bounding_box(); pis = pg.locator("#moPistas").bounding_box()
        toque(pis["x"] + 12, pis["y"] + pis["height"] - 6); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"!{E}.sel()"), "tocar no vazio da linha do tempo LARGA o item")
        # exportar
        tocar_el("#maExportar"); pg.wait_for_timeout(500); ok(visivel(pg, "#moFolhaExp"), "EXPORTAR do topo abre a exportação por cima")
        pg.evaluate("document.getElementById('moExpFechar').click()"); pg.wait_for_timeout(200)
        sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"no fim, nada estoura ({sw})")
        ok(not erros, "sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    print("\n=== PC 1280 ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "motion.html"); pg.wait_for_function("window.BWMotionEditor", timeout=15000); pg.wait_for_timeout(500)
    ok(not pg.evaluate("document.documentElement.classList.contains('mo-app')") and visivel(pg, ".mo-grade"), "no PC continua o layout com os painéis")
    pg.goto(BASE + "motion.html?layout=app"); pg.wait_for_function("window.BWMotionEditor && !!document.getElementById('moApp')", timeout=15000); pg.wait_for_timeout(400)
    ok(visivel(pg, "#moApp") and visivel(pg, "#maFaixa"), "?layout=app liga o layout de app também no PC")
    ok(not erros, "sem erro de JavaScript no PC" + (": " + "; ".join(erros[:3]) if erros else "")); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
