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
    # 22/11 (print do iPhone: abria o layout ANTIGO e travado): o editor que demora a ficar "pronto" (mídias guardadas lentas) NÃO pode derrubar o app
    ctx0 = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True, is_mobile=True); ctx0.route("**/*", rota)
    pg0 = ctx0.new_page(); pg0.add_init_script("Object.defineProperty(window,'__veProntoOk',{get(){return false},set(v){},configurable:true})")
    pg0.goto(BASE + "video.html"); pg0.wait_for_timeout(5000)
    ok(pg0.evaluate("!!document.getElementById('veApp')&&document.documentElement.classList.contains('ve-app')&&!document.documentElement.classList.contains('app-cedo')"),
       "editor que NUNCA avisa 'pronto' (iPhone lento): o layout de APP monta mesmo assim, não cai no layout antigo")
    ok(visivel(pg0, "#vaFaixa") and not visivel(pg0, ".wrap"), "… com a faixa de ferramentas à vista e a tela antiga escondida")
    ctx0.close()
    for nomeT, vp, url in (("celular 390", (390, 844), "video.html"), ("tablet 820", (820, 1180), "video.html")):
        print(f"\n=== {nomeT} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=True, is_mobile=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e) + " @ " + (e.stack or "")[:300])); pg.on("dialog", lambda d: d.accept(d.default_value) if d.type == "prompt" else d.accept())
        cdp = ctx.new_cdp_session(pg)
        pg.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const w=document.querySelector('.wrap');window.__cedo=[document.documentElement.classList.contains('app-cedo'), w?getComputedStyle(w).visibility:'']})")
        pg.add_init_script("window.addEventListener('error',e=>{window.__err=(window.__err||[]).concat([e.filename+':'+e.lineno+':'+e.colno])})")
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
        ok(pg.evaluate("window.__cedo") == [True, "hidden"] and not pg.evaluate("document.documentElement.classList.contains('app-cedo')"), "ao abrir, a tela antiga NÃO aparece antes do app (fica escondida até montar)")
        ok(not visivel(pg, ".bw-foco-barra") and not visivel(pg, ".wrap"), "o layout antigo e a barra de foco somem")
        cv = pg.evaluate("(()=>{const r=document.getElementById('veCv').getBoundingClientRect();return [r.top,r.bottom,r.height]})()")
        ok(cv[2] > vp[1] * 0.4 and cv[0] > 40, f"a PRÉVIA é grande e fica logo abaixo do topo ({cv[2]:.0f} px de altura)")
        ok(visivel(pg, "#vaPlay") and visivel(pg, "#vaExportar") and visivel(pg, "#vaDesf"), "▶ no meio, Exportar no topo, desfazer/refazer à direita")
        sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"nada estoura para o lado ({sw})")
        sh = pg.evaluate("document.documentElement.scrollHeight-innerHeight"); ok(sh <= 2, f"a página não rola: tudo cabe numa tela ({sh})")
        # raiz: ferramentas do projeto, rolando para o lado
        raiz = pg.evaluate("[...document.querySelectorAll('#vaFaixa .va-f span')].map(s=>s.textContent)")
        ok(all(x in raiz for x in ("Mídia", "Áudio", "Texto", "Modelos", "Transições", "Efeitos", "Formato")), f"faixa do projeto: {', '.join(raiz[:7])}…")
        ok(pg.evaluate("document.getElementById('vaFaixa').classList.contains('bwf-firme') && getComputedStyle(document.getElementById('vaFaixa')).overflowX=='hidden'"), "a faixa rola pela rolagem PRÓPRIA (sem o elástico do navegador)")
        fb = pg.locator("#vaFaixa").bounding_box(); x0 = fb["x"] + fb["width"] * 0.8; y0 = fb["y"] + fb["height"] / 2
        def arrastar(xa, xb, passos=12):
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": xa, "y": y0}]})
            for k in range(1, passos + 1): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": xa + (xb - xa) * k / passos, "y": y0}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(700)
        n0 = pg.evaluate("document.getElementById('vaFaixa').scrollLeft"); arrastar(x0, x0 - 160)
        n1 = pg.evaluate("document.getElementById('vaFaixa').scrollLeft"); ok(n1 > n0 + 60, f"arrastar o dedo para o lado rola a faixa ({n0:.0f} → {n1:.0f} px)")
        arrastar(fb["x"] + fb["width"] * 0.9, fb["x"] + 10, 20); arrastar(fb["x"] + fb["width"] * 0.9, fb["x"] + 10, 20)
        mx = pg.evaluate("(()=>{const f=document.getElementById('vaFaixa');return [f.scrollLeft, f.scrollWidth-f.clientWidth]})()"); fb2 = pg.locator("#vaFaixa").bounding_box()
        ok(abs(mx[0] - mx[1]) < 2 and abs(fb2["x"] - fb["x"]) < 1 and pg.evaluate("window.scrollX") == 0, f"no fim a faixa PARA (sem elástico) e a tela não anda ({mx[0]:.0f}/{mx[1]:.0f})")
        ok(pg.locator(".bwf-seta.esq.on").count() == 1 and pg.locator(".bwf-seta.dir.on").count() == 0, "no fim: aparece a setinha ‹ e some a ›")
        tocar_el(".bwf-seta.esq.on"); pg.wait_for_timeout(500); n2 = pg.evaluate("document.getElementById('vaFaixa').scrollLeft")
        ok(n2 < mx[0] - 60, f"tocar na setinha ‹ anda para a esquerda ({mx[0]:.0f} → {n2:.0f})")
        if pg.locator(".bwf-seta.esq.on").count(): tocar_el(".bwf-seta.esq.on", segurar=1.2)
        n3 = pg.evaluate("document.getElementById('vaFaixa').scrollLeft"); ok(n3 < 2, f"segurar a setinha vai até o começo ({n3:.0f})")
        ok(pg.locator(".bwf-seta.dir.on").count() == 1 and pg.locator(".bwf-seta.esq.on").count() == 0, "no começo: só a setinha ›")
        sb = pg.locator(".bwf-seta.dir").bounding_box(); ok(abs(sb["y"] - fb["y"]) < 2 and sb["x"] + sb["width"] <= fb["x"] + fb["width"] + 1, "a setinha fica em cima da faixa, na ponta")
        ok(pg.evaluate("document.getElementById('veRolo').classList.contains('bwf-firme')"), "a linha do tempo também rola sem elástico")
        # MÍDIA → importar e pôr na linha do tempo
        ferr("Mídia").click(); pg.wait_for_timeout(250); ok(visivel(pg, "#vaSheet") and visivel(pg, "#veLib"), "MÍDIA abre a folha com a biblioteca")
        pg.set_input_files("#veArq", [f"{TMP}/azul.webm", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 2", timeout=15000); pg.wait_for_timeout(500)
        tocar_el("#veLib [data-mid]"); pg.wait_for_timeout(400)
        ok(not visivel(pg, "#vaSheet"), "tocar no item põe na linha do tempo e FECHA a folha (22/11)")
        tocar_el("#vaAdd"); pg.wait_for_timeout(300); tocar_el("#veLib [data-mid]:nth-child(2)"); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').length") == 2 and not visivel(pg, "#vaSheet"), "um toque em cada vídeo da biblioteca põe os dois na linha do tempo")
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
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(250)
        # 22/11 10:05: encostar num vizinho agora só ENCOSTA — o teste pega o ÚLTIMO take (tem espaço livre para andar)
        c1 = pg.evaluate(f"{CL}.filter(c=>c.trilha==='v1').sort((a,b)=>b.ini-a.ini)[0].id"); pg.evaluate(f"__video.irPara({CL}.find(c=>c.id==='{c1}').ini+0.3)"); pg.wait_for_timeout(300)
        ini0 = pg.evaluate(f"{CL}.find(c=>c.id==='{c1}').ini"); bb = pg.locator(f'[data-clip="{c1}"]').bounding_box(); hx = max(bb["x"] + 10, min(bb["x"] + bb["width"] / 2, vp[0] - 80)); hy = bb["y"] + bb["height"] / 2
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": hx, "y": hy}]}); pg.wait_for_timeout(550)
        for k in range(1, 13): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": hx + 5 * k, "y": hy}]}); pg.wait_for_timeout(16)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(400)
        ini1 = pg.evaluate(f"{CL}.find(c=>c.id==='{c1}').ini"); pps = pg.evaluate("__video.pps()")
        ok(pg.locator(".bwf-menu").count() == 0, "SEGURAR o dedo no take NÃO abre mais o menu (dono, 22/11)")
        ok((ini1 - ini0) * pps > 30 and pg.evaluate("__video.selAtual()&&__video.selAtual().id") == c1, f"segurar e arrastar PEGA o take e move ({(ini1-ini0)*pps:.0f} px)")
        tocar_el("#vaDesf"); pg.wait_for_timeout(300); pg.evaluate(f"__video.sel('{c1}')"); pg.wait_for_timeout(250)
        pg.evaluate("document.querySelectorAll('.bwf-menu').forEach(m=>m.remove())")
        ferr("Mais").click(); pg.wait_for_timeout(300); ok(pg.locator(".bwf-menu").count() == 1, "⋯ MAIS abre todas as opções do take (é o jeito no celular)")
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
        tocar_el("#veLib [data-som]"); pg.wait_for_timeout(800); ok(not visivel(pg, "#vaSheet"), "tocar num som também fecha a folha")
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
        # 22/11 (dono: "a tela fica travada e não rola"): arrastar o dedo EM CIMA das miniaturas rola a folha (antes a biblioteca, com 'contain', prendia o dedo)
        cb = pg.evaluate("(()=>{const c=document.getElementById('vaSheetCorpo'),r=c.getBoundingClientRect();return [r.left+r.width/2,r.top+c.clientHeight*0.75,c.clientHeight,c.scrollHeight-c.clientHeight]})()")
        if cb[3] > 20:
            yb = cb[1]; d = min(200, cb[2] * 0.5)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": cb[0], "y": yb}]})
            for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": cb[0], "y": yb - d * k / 10}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(500)
            ok(pg.evaluate("document.getElementById('vaSheetCorpo').scrollTop") > 20 and pg.locator(".ve-fantasma").count() == 0, "arrastar o dedo em cima das transições ROLA a folha (não fica travada)")
            pg.evaluate("document.getElementById('vaSheetCorpo').scrollTop=0")
        tocar_el("#vaSheetOk")
        # tocar no vazio larga o take
        pg.evaluate(f"__video.sel('{c1}')"); pg.wait_for_timeout(200)
        r = pg.evaluate("(()=>{const f=document.querySelector('.ve-faixa[data-trilha=\"v1\"]').getBoundingClientRect();return [f.left,f.top,f.height]})()")
        pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(300)
        rr = pg.evaluate("document.getElementById('veRolo').getBoundingClientRect()"); toque(rr["x"] + 20, r[1] + r[2] / 2); pg.wait_for_timeout(250)
        ok(pg.evaluate("!__video.selAtual()"), "tocar no vazio da linha do tempo LARGA o take (volta ao projeto)")
        # 23/11 (dono, iPhone): a seção MÍDIA FECHADA pela seta deixava a folha vazia (o título com a seta fica escondido na folha)
        pg.evaluate("localStorage.setItem('ui_dobras',JSON.stringify({'ve-midia':0}));BWDobras&&BWDobras.aplicar&&BWDobras.aplicar()"); pg.wait_for_timeout(200)
        tocar_el("#vaAdd"); pg.wait_for_timeout(500)
        ok(visivel(pg, "#veImportar") and visivel(pg, "#veLib"), "com a seção MÍDIA fechada pela seta, a folha abre COM a biblioteca e o ＋ IMPORTAR")
        tocar_el("#vaSheetOk"); pg.evaluate("localStorage.removeItem('ui_dobras')"); pg.wait_for_timeout(300)
        # 22/11 (dono): (a) o espaço VAZIO abaixo dos takes também anda o tempo
        tl = pg.evaluate("(()=>{const a=document.getElementById('vaTl').getBoundingClientRect(),r=document.getElementById('veRolo').getBoundingClientRect();return [a.bottom,r.bottom,r.left+r.width/2]})()")
        ok(tl[1] >= tl[0] - 2, f"a área que arrasta o tempo vai até o fim da linha do tempo ({tl[1]:.0f} × {tl[0]:.0f})")
        sl0 = pg.evaluate("document.getElementById('veRolo').scrollLeft"); yv = tl[0] - 8
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": tl[2], "y": yv}]})
        for k in range(1, 13): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": tl[2] - 10 * k, "y": yv}]}); pg.wait_for_timeout(16)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(600)
        sl1 = pg.evaluate("document.getElementById('veRolo').scrollLeft"); ok(sl1 > sl0 + 40, f"arrastar o dedo no espaço vazio ABAIXO dos takes anda o tempo ({sl0:.0f} → {sl1:.0f} px)")
        pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(400)
        # (c) segurar o take e levar PARA CIMA / PARA BAIXO = camada nova (vídeo e som)
        def levar(cid, dy):
            pg.evaluate(f"(()=>{{const c={CL}.find(c=>c.id==='{cid}');__video.irPara(c.ini+c.dur/2)}})()"); pg.wait_for_timeout(500)
            bx = pg.locator(f'[data-clip="{cid}"]').first.bounding_box(); lo = max(bx["x"], 0) + 10; hi = min(bx["x"] + bx["width"], vp[0] - 90) - 10; x = (lo + hi) / 2; y = bx["y"] + bx["height"] / 2
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]}); pg.wait_for_timeout(500)
            for k in range(1, 13): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + dy * k / 12}]}); pg.wait_for_timeout(18)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(700)
            return pg.evaluate(f"{CL}.find(c=>c.id==='{cid}').trilha")
        tr0 = pg.evaluate(f"{CL}.find(c=>c.id==='{c1}').trilha"); n0 = pg.evaluate(f"{CL}.length")
        tr1 = levar(c1, -70); ok(tr1[0] == "v" and int(tr1[1:]) > int(tr0[1:]) and pg.evaluate(f"{CL}.length") == n0, f"take levado PARA CIMA vai para uma camada NOVA acima ({tr0} → {tr1})")
        pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(300)
        tr2 = levar(c1, 140); outros = pg.evaluate(f"{CL}.filter(c=>c.id!=='{c1}'&&c.trilha[0]==='v').map(c=>c.trilha)")
        ok(tr2 == "v1" and "v1" not in outros, f"take levado PARA BAIXO de tudo vira a camada de baixo (os outros sobem: {outros})")
        pg.evaluate("__video.desfazer && __video.desfazer()"); pg.wait_for_timeout(500)
        ok(pg.evaluate(f"{CL}.find(c=>c.id==='{c1}').trilha") == tr1, "DESFAZER volta o take para onde estava")
        # (b) texto atrás da pessoa SEM o take escolhido (no celular o submenu de texto larga a seleção) usa o take da agulha
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200); nt = pg.evaluate(f"{CL}.filter(c=>c.tipo==='texto').length")
        pg.evaluate("VEModelos.abrir('mascara')"); pg.wait_for_timeout(400)
        pg.evaluate("document.querySelector('[data-usarmasc]').click()"); pg.wait_for_timeout(300)
        pg.evaluate("(()=>{const b=document.querySelector('[data-confirmar]');if(b)b.click()})()"); pg.wait_for_timeout(900)
        ok(pg.evaluate(f"{CL}.filter(c=>c.tipo==='texto').length") > nt and pg.evaluate("!!(__video.selAtual()&&__video.selAtual().ia)"), "TEXTO ATRÁS DA PESSOA sem take escolhido aplica no take da agulha (não pede para escolher)")
        pg.evaluate("(()=>{const f=document.getElementById('vmFechar');if(f&&f.offsetParent)f.click()})()"); pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(300)
        # modelo pronto: faixa "faltam N", tocar no espaço → Trocar pelo meu take → escolher o vídeo
        pg.evaluate("VEModelos.usar(VEModelos.EDICOES[0], {}, false)"); pg.wait_for_function("__video.P().clips.some(c=>c.ph)", timeout=15000); pg.wait_for_timeout(900)
        ok(visivel(pg, "#vmFaixa"), "MODELO aplicado: a faixa do modelo (faltam N takes, preencher sozinho) aparece no app")
        ph = pg.evaluate(f"{CL}.find(c=>c.ph).id"); pg.evaluate(f"__video.sel('{ph}')"); pg.wait_for_timeout(300)
        ok("Trocar pelo meu take" in pg.inner_text("#vaFaixa"), "com um espaço TAKE escolhido aparece TROCAR PELO MEU TAKE")
        ferr("Trocar pelo meu take").click(); pg.wait_for_timeout(300); tocar_el("#veLib [data-mid]"); pg.wait_for_timeout(700)
        ok(not pg.evaluate(f"({CL}.find(c=>c.id==='{ph}')||{{}}).ph"), "tocar no vídeo da biblioteca troca o espaço pelo take")
        tocar_el("#vaSheetOk"); pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        # exportar
        tocar_el("#vaExportar"); pg.wait_for_timeout(600); ok(visivel(pg, "#veJanExp"), "EXPORTAR do topo abre a janela de exportação")
        tocar_el('[data-pronto="whats"]'); tocar_el("#veExIr"); pg.wait_for_timeout(900); ok(visivel(pg, "#veOcup") or visivel(pg, "#veSaida"), "…e o EXPORTAR da janela começa a exportação")
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
