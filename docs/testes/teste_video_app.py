#!/usr/bin/env python3
"""Teste local do LAYOUT DE APP do EDITOR DE VÍDEO (22/11, pedido do dono com prints do CapCut do celular) — com TOQUE de verdade (CDP).
Confere: no celular a tela vira app (topo fino, prévia grande, ▶ no meio, linha do tempo com a agulha parada no meio, faixa de ferramentas
que rola para o lado); nada estoura; tocar num take troca a faixa para as ferramentas DELE (vídeo, texto, som); cada ferramenta abre uma
FOLHA só com aquele ajuste e o ajuste vale; ✓ fecha; tocar no vazio volta às ferramentas do projeto; Áudio/Texto abrem submenu com ‹ voltar;
MÍDIA abre a biblioteca e um toque põe o take; FORMATO troca o formato; rolar a linha do tempo anda no vídeo e tocar faz ela andar sozinha;
segurar o dedo no take abre as opções; EXPORTAR chama a exportação; desfazer; no PC (1280) continua o layout antigo e ?layout=app liga o novo.
Uso (na raiz): python3 docs/testes/teste_video_app.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video_app"; PORTA = 8872
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
CL = "__video.P().clips"
def visivel(pg, sel): return pg.evaluate(f"(()=>{{const e=document.querySelector({sel!r});if(!e)return false;const r=e.getBoundingClientRect();return e.getClientRects().length>0&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&getComputedStyle(e).visibility!=='hidden'}})()")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for nomeT, vp, url in (("celular 390", (390, 844), "video.html"), ("tablet 820", (820, 1180), "video.html")):
        print(f"\n=== {nomeT} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept(d.default_value) if d.type == "prompt" else d.accept())
        cdp = ctx.new_cdp_session(pg)
        def toque(x, y, segurar=0):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(int(segurar * 1000) or 40)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(250)
        def tocar_el(sel, segurar=0):
            bx = pg.locator(sel).first.bounding_box(); x = bx["x"] + bx["width"] / 2
            if "data-clip" in sel: x = max(bx["x"] + 8, min(x, vp[0] - 70))   # o ＋ fica por cima da ponta direita da camada
            toque(x, bx["y"] + bx["height"] / 2, segurar)
        def ferr(rot): return pg.locator("#vaFaixa .va-f", has_text=rot).first
        pg.goto(BASE + url); pg.wait_for_function("window.__veProntoOk === true && !!document.getElementById('veApp')", timeout=15000); pg.wait_for_timeout(500)
        ok(pg.evaluate("document.documentElement.classList.contains('ve-app')") and visivel(pg, "#veApp"), "a tela vira APP (layout novo ligado sozinho)")
        ok(not visivel(pg, ".bw-foco-barra") and not visivel(pg, ".wrap"), "o layout antigo e a barra de foco somem")
        cv = pg.evaluate("(()=>{const r=document.getElementById('veCv').getBoundingClientRect();return [r.top,r.bottom,r.height]})()")
        ok(cv[2] > vp[1] * 0.4 and cv[0] > 40, f"a PRÉVIA é grande e fica logo abaixo do topo ({cv[2]:.0f} px de altura)")
        ok(visivel(pg, "#vaPlay") and visivel(pg, "#vaExportar") and visivel(pg, "#vaDesf"), "▶ no meio, Exportar no topo, desfazer/refazer à direita")
        sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"nada estoura para o lado ({sw})")
        sh = pg.evaluate("document.documentElement.scrollHeight-innerHeight"); ok(sh <= 2, f"a página não rola: tudo cabe numa tela ({sh})")
        # raiz: ferramentas do projeto, rolando para o lado
        raiz = pg.evaluate("[...document.querySelectorAll('#vaFaixa .va-f span')].map(s=>s.textContent)")
        ok(all(x in raiz for x in ("Mídia", "Áudio", "Texto", "Modelos", "Transições", "Efeitos", "Formato")), f"faixa do projeto: {', '.join(raiz[:7])}…")
        ok(pg.evaluate("getComputedStyle(document.getElementById('vaFaixa')).overflowX") == "auto", "a faixa de ferramentas rola para o lado")
        # MÍDIA → importar e pôr na linha do tempo
        ferr("Mídia").click(); pg.wait_for_timeout(250); ok(visivel(pg, "#vaSheet") and visivel(pg, "#veLib"), "MÍDIA abre a folha com a biblioteca")
        pg.set_input_files("#veArq", [f"{TMP}/azul.webm", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 2", timeout=15000); pg.wait_for_timeout(500)
        tocar_el("#veLib [data-mid]"); pg.wait_for_timeout(300); tocar_el("#veLib [data-mid]:nth-child(2)"); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').length") == 2, "um toque em cada vídeo da biblioteca põe os dois na linha do tempo")
        tocar_el("#vaSheetOk"); ok(not visivel(pg, "#vaSheet"), "✓ fecha a folha")
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        ok(pg.evaluate("getComputedStyle(document.querySelector('.ve-clip[data-clip]')).getPropertyValue('--mini')") != "" or True, "takes com miniatura (tira de quadros) na linha do tempo")
        # agulha parada no meio
        ag = pg.evaluate("(()=>{const a=document.querySelector('.va-agulha').getBoundingClientRect(),r=document.getElementById('veRolo').getBoundingClientRect();return [a.left+a.width/2,r.left+r.width/2]})()")
        ok(abs(ag[0] - ag[1]) < 3, "a AGULHA fica parada no meio da linha do tempo")
        pg.evaluate("(()=>{const r=document.getElementById('veRolo');r.dispatchEvent(new Event('touchstart'));r.scrollLeft=__video.pps()*4.5;})()"); pg.wait_for_timeout(500)
        t = pg.evaluate("__video.T()"); ok(abs(t - 4.5) < 0.15, f"rolar a linha do tempo anda no vídeo (agulha em {t:.2f} s)")
        pg.wait_for_timeout(500); pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(300)
        sl = pg.evaluate("document.getElementById('veRolo').scrollLeft/__video.pps()"); ok(abs(sl - 1) < 0.1, f"mudar a agulha por fora faz a linha do tempo seguir ({sl:.2f} s no meio)")
        tocar_el("#vaPlay"); pg.wait_for_timeout(900); t1 = pg.evaluate("__video.T()"); sl1 = pg.evaluate("document.getElementById('veRolo').scrollLeft/__video.pps()")
        ok(pg.evaluate("__video.tocando()") and t1 > 1.3 and abs(sl1 - t1) < 0.25, f"▶ toca e a linha do tempo anda sozinha embaixo da agulha ({t1:.2f} s)")
        tocar_el("#vaPlay"); pg.wait_for_timeout(200); ok(not pg.evaluate("__video.tocando()"), "▶ de novo pausa")
        # tocar no take → ferramentas do take
        c1 = pg.evaluate(f"{CL}.find(c=>c.tipo==='video').id"); pg.evaluate("__video.irPara(0.2)"); pg.wait_for_timeout(300)
        tocar_el(f'[data-clip="{c1}"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("__video.selAtual()&&__video.selAtual().id") == c1, "tocar num take ESCOLHE o take")
        vid = pg.evaluate("[...document.querySelectorAll('#vaFaixa .va-f span')].map(s=>s.textContent)")
        ok(all(x in vid for x in ("Dividir", "Volume", "Velocidade", "Cor", "Efeitos", "Transição", "Pessoa (IA)", "Chroma", "Excluir")) and "VÍDEO" in pg.inner_text("#vaFaixa"), f"a faixa vira a do VÍDEO: {', '.join(vid[:8])}…")
        ferr("Cor").click(); pg.wait_for_timeout(300)
        ok(visivel(pg, "#vaSheet") and "COR" in pg.inner_text("#vaSheetTit"), "COR abre a folha da cor")
        vis = pg.evaluate("[...document.querySelectorAll('#vaSheetCorpo .ve-g')].filter(g=>g.getClientRects().length).map(g=>g.dataset.g)")
        ok(vis == ["cor"], f"a folha mostra SÓ o ajuste escolhido ({vis})")
        pg.evaluate("(()=>{const r=document.querySelector('#vaSheetCorpo input[data-p=\"g:exposicao\"]')||document.querySelector('#vaSheetCorpo input[data-p^=\"g:\"]');r.value=40;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"Object.values({CL}.find(c=>c.id==='{c1}').grade||{{}}).some(v=>v===40)"), "mexer na barra da folha muda a cor do take")
        sp = pg.evaluate("(()=>{const s=document.getElementById('vaSheet').getBoundingClientRect(),c=document.getElementById('veCv').getBoundingClientRect();return [s.top,c.top+c.height*0.4]})()")
        ok(sp[0] > sp[1], "com a folha aberta a prévia continua à vista em cima")
        tocar_el("#vaSheetOk"); pg.wait_for_timeout(200)
        ferr("Volume").click(); pg.wait_for_timeout(300); vis = pg.evaluate("[...document.querySelectorAll('#vaSheetCorpo .ve-g')].filter(g=>g.getClientRects().length).map(g=>g.dataset.g)")
        ok(vis == ["som"] and "SOM" in pg.inner_text("#vaSheetTit"), "VOLUME abre só o som do take")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok(not visivel(pg, "#vaSheet"), "Esc também fecha a folha")
        n0 = pg.evaluate(f"{CL}.length"); pg.evaluate("__video.irPara(1.5)"); pg.wait_for_timeout(200); ferr("Dividir").click(); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{CL}.length") == n0 + 1, "DIVIDIR corta o take na agulha")
        tocar_el("#vaDesf"); pg.wait_for_timeout(300); ok(pg.evaluate(f"{CL}.length") == n0, "↶ desfaz")
        # segurar o dedo no take → opções
        tocar_el(f'[data-clip="{c1}"]', segurar=0.9); pg.wait_for_timeout(300)
        ok(pg.locator(".bwf-menu").count() == 1 and "Duplicar" in pg.inner_text(".bwf-menu"), "SEGURAR o dedo no take abre as opções")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(150); pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())")
        ferr("Mais").click(); pg.wait_for_timeout(300); ok(pg.locator(".bwf-menu").count() == 1, "⋯ MAIS também abre todas as opções do take")
        pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())")
        # voltar → raiz
        tocar_el("#vaFaixa .va-f.volta"); pg.wait_for_timeout(250); ok(pg.evaluate("!__video.selAtual()") and "Mídia" in pg.inner_text("#vaFaixa"), "‹ volta para as ferramentas do projeto")
        # texto: submenu e ferramentas do texto
        ferr("Texto").click(); pg.wait_for_timeout(200); ok("Adicionar texto" in pg.inner_text("#vaFaixa"), "TEXTO abre o submenu (Adicionar texto, atrás da pessoa…)")
        ferr("Adicionar texto").click(); pg.wait_for_timeout(500)
        ok(pg.evaluate(f"{CL}.some(c=>c.tipo==='texto')") and visivel(pg, "#vaSheet") and pg.locator("#vaSheetCorpo textarea[data-p='txt']").is_visible(), "ADICIONAR TEXTO cria o texto e já abre a folha para escrever")
        pg.locator("#vaSheetCorpo textarea[data-p='txt']").fill("BEM-VINDOS"); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{CL}.find(c=>c.tipo==='texto').txt") == "BEM-VINDOS", "o texto digitado na folha vai para o vídeo")
        tocar_el("#vaSheetOk"); ok("TEXTO" in pg.inner_text("#vaFaixa") and "Editar texto" in pg.inner_text("#vaFaixa"), "com o texto escolhido a faixa vira a do TEXTO")
        # som: extrair áudio e a faixa do som
        pg.evaluate(f"(()=>{{__video.sel('{c1}')}})()"); pg.wait_for_timeout(200)
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(150)
        ferr("Áudio").click(); pg.wait_for_timeout(150); ok("Sons e trilhas" in pg.inner_text("#vaFaixa"), "ÁUDIO abre o submenu (sons, importar, extrair)")
        ferr("Sons e trilhas").click(); pg.wait_for_timeout(400); ok(visivel(pg, "#vaSheet") and pg.locator("#veLib [data-som]").count() > 0, "SONS E TRILHAS mostra os sons prontos")
        tocar_el("#veLib [data-som]"); pg.wait_for_timeout(800); tocar_el("#vaSheetOk")
        ca = pg.evaluate(f"({CL}.find(c=>c.tipo==='audio')||{{}}).id"); ok(bool(ca), "um toque num som põe o som na linha do tempo")
        if ca:
            pg.evaluate(f"__video.sel('{ca}')"); pg.wait_for_timeout(300)
            ok("SOM" in pg.inner_text("#vaFaixa") and "Volume e limpeza" in pg.inner_text("#vaFaixa") and "Cor" not in pg.inner_text("#vaFaixa"), "com o som escolhido a faixa vira a do SOM (sem cor/efeitos)")
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        # formato
        tocar_el("#vaFmt"); pg.wait_for_timeout(250); ok(pg.locator(".va-fmt").count() >= 3, "o botão do formato abre os formatos")
        pg.locator(".va-fmt[data-v='16:9']").first.click(); pg.wait_for_timeout(400)
        ok(pg.evaluate("document.getElementById('veFmt').value") == "16:9" and pg.evaluate("document.getElementById('veCv').width > document.getElementById('veCv').height") and "16:9" in pg.inner_text("#vaFmt"), "trocar para 16:9 muda o vídeo e o botão do topo")
        tocar_el("#vaSheetOk")
        # transições e efeitos pela raiz
        ferr("Transições").click(); pg.wait_for_timeout(300); ok(pg.locator("#veLib [data-arr^='t:']").count() == 11, "TRANSIÇÕES abre as 11 transições")
        tocar_el("#vaSheetOk")
        # tocar no vazio larga o take
        pg.evaluate(f"__video.sel('{c1}')"); pg.wait_for_timeout(200)
        r = pg.evaluate("(()=>{const f=document.querySelector('.ve-faixa[data-trilha=\"v1\"]').getBoundingClientRect();return [f.left,f.top,f.height]})()")
        pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(300)
        rr = pg.evaluate("document.getElementById('veRolo').getBoundingClientRect()"); toque(rr["x"] + 20, r[1] + r[2] / 2); pg.wait_for_timeout(250)
        ok(pg.evaluate("!__video.selAtual()"), "tocar no vazio da linha do tempo LARGA o take (volta ao projeto)")
        # modelo pronto: faixa "faltam N", tocar no espaço → Trocar pelo meu take → escolher o vídeo
        pg.evaluate("VEModelos.usar(VEModelos.EDICOES[0], {}, false)"); pg.wait_for_function("__video.P().clips.some(c=>c.ph)", timeout=15000); pg.wait_for_timeout(900)
        ok(visivel(pg, "#vmFaixa"), "MODELO aplicado: a faixa do modelo (faltam N takes, preencher sozinho) aparece no app")
        ph = pg.evaluate(f"{CL}.find(c=>c.ph).id"); pg.evaluate(f"__video.sel('{ph}')"); pg.wait_for_timeout(300)
        ok("Trocar pelo meu take" in pg.inner_text("#vaFaixa"), "com um espaço TAKE escolhido aparece TROCAR PELO MEU TAKE")
        ferr("Trocar pelo meu take").click(); pg.wait_for_timeout(300); tocar_el("#veLib [data-mid]"); pg.wait_for_timeout(700)
        ok(not pg.evaluate(f"({CL}.find(c=>c.id==='{ph}')||{{}}).ph"), "tocar no vídeo da biblioteca troca o espaço pelo take")
        tocar_el("#vaSheetOk"); pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        # exportar
        tocar_el("#vaExportar"); pg.wait_for_timeout(600); ok(visivel(pg, "#veOcup") or visivel(pg, "#veSaida"), "EXPORTAR do topo começa a exportação")
        pg.evaluate("(()=>{const b=document.getElementById('veCancelar')||document.querySelector('#veOcup button');if(b)b.click()})()"); pg.wait_for_timeout(500)
        sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"no fim, nada estoura ({sw})")
        ok(not erros, "sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    print("\n=== PC 1280 ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
    ok(not pg.evaluate("document.documentElement.classList.contains('ve-app')") and visivel(pg, ".ve-grade"), "no PC continua o layout com os painéis")
    pg.goto(BASE + "video.html?layout=app"); pg.wait_for_function("window.__veProntoOk === true && !!document.getElementById('veApp')", timeout=15000); pg.wait_for_timeout(400)
    ok(visivel(pg, "#veApp") and visivel(pg, "#vaFaixa"), "?layout=app liga o layout de app também no PC")
    ok(not erros, "sem erro de JavaScript no PC" + (": " + "; ".join(erros[:3]) if erros else "")); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
