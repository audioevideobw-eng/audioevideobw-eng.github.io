#!/usr/bin/env python3
"""Teste do RASTREIO (seguir um ponto) e dos ELEMENTOS ANIMADOS do EDITOR DE VÍDEO (22/11, pedido do dono: fogo seguindo a mão). Vídeo sintético: um quadradinho com desenho andando da esquerda para a direita. MÃO = detector FALSO (acha o quadradinho); PONTO ESCOLHIDO = rastreador de verdade. Base copiada do teste do LAYOUT DE APP do EDITOR DE VÍDEO (22/11, pedido do dono com prints do CapCut do celular) — com TOQUE de verdade (CDP).
Confere: no celular a tela vira app (topo fino, prévia grande, ▶ no meio, linha do tempo com a agulha parada no meio, faixa de ferramentas
que rola para o lado); nada estoura; tocar num take troca a faixa para as ferramentas DELE (vídeo, texto, som); cada ferramenta abre uma
FOLHA só com aquele ajuste e o ajuste vale; ✓ fecha; tocar no vazio volta às ferramentas do projeto; Áudio/Texto abrem submenu com ‹ voltar;
MÍDIA abre a biblioteca e um toque põe o take; FORMATO troca o formato; rolar a linha do tempo anda no vídeo e tocar faz ela andar sozinha;
segurar o dedo no take abre as opções; EXPORTAR chama a exportação; desfazer; no PC (1280) continua o layout antigo e ?layout=app liga o novo.
Uso (na raiz): python3 docs/testes/teste_video_app.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video_app"; PORTA = 8876
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
FALSO = """window.__BWRastreioTeste=function(img){const x=img.getContext('2d').getImageData(0,0,img.width,img.height).data;let sx=0,sy=0,n=0;
 for(let i=0;i<img.width*img.height;i++){const r=x[i*4],g=x[i*4+1],b=x[i*4+2];if(Math.abs(r-30)+Math.abs(g-60)+Math.abs(b-220)>90){sx+=i%img.width;sy+=Math.floor(i/img.width);n++}}
 if(!n)return [];const p={x:sx/n/img.width,y:sy/n/img.height,visibility:1};return [{l:Array.from({length:33},()=>p),lado:'Right'}]};"""
def esperado(t): return (40 + 60 * t + 24) / 360
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for nome, vp, toque in (("PC 1280", (1280, 800), False), ("celular 390", (390, 844), True)):
        print(f"\n=== {nome} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=toque, is_mobile=toque); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.add_init_script(FALSO)
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        pg.set_input_files("#veArq", ["/tmp/teste_rastreio/move.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(400)
        pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(600)
        vid = pg.evaluate(f"{CL}.find(c=>c.tipo==='video').id")
        el = pg.evaluate("__video.addElemento('fogo').id"); pg.wait_for_timeout(300)
        c = pg.evaluate(f"{CL}.find(c=>c.id==='{el}')"); ok(c["tipo"] == "elemento" and c["trilha"] != "v1", f"🔥 ELEMENTO entra numa camada por cima ({c['trilha']})")
        pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(500)
        cor = pg.evaluate("(()=>{const c=document.getElementById('veCv');__video.desenhar();const d=c.getContext('2d').getImageData(c.width/2,c.height/2-c.height*0.05,1,1).data;return [d[0],d[1],d[2]]})()")
        ok(cor[0] > 200 and cor[0] > cor[2], f"o fogo aparece na prévia (pixel {cor})")
        ok(pg.locator("[data-acao=rsRastrear]").count() == 1, "o elemento tem SEGUIR UM PONTO (há um take embaixo)")
        # MÃO (detector falso)
        pg.evaluate("document.querySelector('[data-rsmodo=mao]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-acao=rsRastrear]').click()")
        pg.wait_for_function(f"!!({CL}.find(c=>c.id==='{el}').rastro||{{}}).pts", timeout=60000); pg.wait_for_timeout(300)
        r = pg.evaluate(f"(()=>{{const c={CL}.find(c=>c.id==='{el}');return {{n:c.rastro.pts.length,fps:c.rastro.fps,p05:c.rastro.pts[Math.round(0.5*c.rastro.fps)],p3:c.rastro.pts[Math.round(3*c.rastro.fps)]}}}})()")
        ok(r["n"] >= 50, f"rastreou o take inteiro ({r['n']} quadros a {r['fps']} por segundo)")
        ok(abs(r["p05"][0] - esperado(0.5)) < 0.03 and abs(r["p3"][0] - esperado(3)) < 0.03, f"o caminho acompanha o objeto (0,5 s: {r['p05'][0]:.3f}≈{esperado(0.5):.3f}; 3 s: {r['p3'][0]:.3f}≈{esperado(3):.3f})")
        x1 = pg.evaluate(f"__video.rastroEm('{el}',0.5).x"); x2 = pg.evaluate(f"__video.rastroEm('{el}',3).x")
        ok(x2 - x1 > 20, f"na prévia o elemento ANDA junto (x {x1:.1f}% → {x2:.1f}%)")
        # ajustar o deslocamento arrastando: c.x vira offset
        pg.evaluate(f"(()=>{{const c={CL}.find(c=>c.id==='{el}');c.x=5;}})()"); x3 = pg.evaluate(f"__video.rastroEm('{el}',3).x"); ok(abs(x3 - x2) < 0.5, "o deslocamento (arrastar o item) fica por cima do caminho")
        pg.evaluate(f"(()=>{{const c={CL}.find(c=>c.id==='{el}');c.x=0;}})()")
        # PONTO ESCOLHIDO (rastreador de verdade): escolher o ponto tocando na prévia em t=0
        pg.evaluate(f"__video.sel('{el}')"); pg.wait_for_timeout(300); pg.evaluate("__video.irPara(0)"); pg.wait_for_timeout(600)
        pg.evaluate("document.querySelector('[data-rsmodo=manual]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('[data-acao=rsRastrear]').click()"); pg.wait_for_timeout(400)
        bx = pg.evaluate(f"(()=>{{const c=document.getElementById('veCv'),r=c.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}})()")
        # o take (360x640) cobre o quadro 9:16 inteiro: o objeto em t=0 está em x=(40+24)/360, y=324/640
        tx, ty = bx[0] + bx[2] * 64 / 360, bx[1] + bx[3] * 324 / 640
        if toque:
            cdp = ctx.new_cdp_session(pg); cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": tx, "y": ty}]}); cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        else: pg.mouse.click(tx, ty)
        pg.wait_for_function(f"(({CL}.find(c=>c.id==='{el}').rastro||{{}}).modo==='manual') && !!{CL}.find(c=>c.id==='{el}').rastro.pts && !document.getElementById('veRsProg')", timeout=90000); pg.wait_for_timeout(400)
        r2 = pg.evaluate(f"(()=>{{const c={CL}.find(c=>c.id==='{el}');return [c.rastro.pts[Math.round(1*c.rastro.fps)], c.rastro.pts[Math.round(3.5*c.rastro.fps)], c.rastro.achou]}})()")
        ok(abs(r2[0][0] - esperado(1)) < 0.03 and abs(r2[1][0] - esperado(3.5)) < 0.035, f"🎯 PONTO ESCOLHIDO: o rastreador acompanha o objeto (1 s: {r2[0][0]:.3f}≈{esperado(1):.3f}; 3,5 s: {r2[1][0]:.3f}≈{esperado(3.5):.3f}; achado {r2[2]*100:.0f}%)")
        pg.evaluate("document.querySelector('[data-acao=rsParar]').click()"); pg.wait_for_timeout(300)
        ok(not pg.evaluate(f"!!{CL}.find(c=>c.id==='{el}').rastro"), "PARAR DE SEGUIR tira o rastreio (o item fica onde estava)")
        ok(not erros, "sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
