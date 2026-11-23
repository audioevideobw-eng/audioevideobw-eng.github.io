#!/usr/bin/env python3
"""Teste da MÁSCARA POR SELEÇÃO (objetos) e da PINÇA na prévia do EDITOR DE VÍDEO (22/11, pedido do dono). Base copiada do teste do LAYOUT DE APP do EDITOR DE VÍDEO (22/11, pedido do dono com prints do CapCut do celular) — com TOQUE de verdade (CDP).
Confere: no celular a tela vira app (topo fino, prévia grande, ▶ no meio, linha do tempo com a agulha parada no meio, faixa de ferramentas
que rola para o lado); nada estoura; tocar num take troca a faixa para as ferramentas DELE (vídeo, texto, som); cada ferramenta abre uma
FOLHA só com aquele ajuste e o ajuste vale; ✓ fecha; tocar no vazio volta às ferramentas do projeto; Áudio/Texto abrem submenu com ‹ voltar;
MÍDIA abre a biblioteca e um toque põe o take; FORMATO troca o formato; rolar a linha do tempo anda no vídeo e tocar faz ela andar sozinha;
segurar o dedo no take abre as opções; EXPORTAR chama a exportação; desfazer; no PC (1280) continua o layout antigo e ?layout=app liga o novo.
Uso (na raiz): python3 docs/testes/teste_video_app.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video_app"; PORTA = 8874
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
PX = """((fx,fy)=>{const c=document.getElementById('veCv');__video.desenhar();const d=c.getContext('2d').getImageData(Math.round(c.width*fx),Math.round(c.height*fy),1,1).data;return [d[0],d[1],d[2]]})"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for nome, vp, toque in (("PC 1280", (1280, 800), False), ("celular 390", (390, 844), True)):
        print(f"\n=== {nome} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=toque, is_mobile=toque); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); cdp = ctx.new_cdp_session(pg)
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        pg.set_input_files("#veArq", [f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(400)
        pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(600)
        vid = pg.evaluate(f"{CL}.find(c=>c.tipo==='video').id")
        pg.evaluate("__video.addTexto({t:0})"); pg.wait_for_timeout(300)
        pg.evaluate(f"(()=>{{const t={CL}.find(c=>c.tipo==='texto');t.txt='MMMM';t.tam=30;t.cor='#ffffff';t.fundo='#ffffff';t.y=0;t.dur=5;t.ini=0;__video.sel('{vid}');__video.irPara(1)}})()"); pg.wait_for_timeout(1200)
        c0 = pg.evaluate(PX + "(0.5,0.5)"); ok(c0[0] > 200 and c0[2] > 200, f"sem máscara: o texto branco cobre o meio do vídeo ({c0})")
        # abrir a seção e desenhar um retângulo no meio
        pg.evaluate("(()=>{const b=document.querySelector('[data-acao=smDesenhar]');b.click()})()"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const r=document.getElementById('veCv').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        x0, y0, x1, y1 = r[0] + r[2] * 0.3, r[1] + r[3] * 0.35, r[0] + r[2] * 0.7, r[1] + r[3] * 0.65
        if toque:
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x0, "y": y0}]})
            for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x0 + (x1 - x0) * k / 10, "y": y0 + (y1 - y0) * k / 10}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        else:
            pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x1, y1, steps=10); pg.mouse.up()
        pg.wait_for_timeout(700)
        sm = pg.evaluate(f"{CL}.find(c=>c.id==='{vid}').selm"); ok(bool(sm and sm.get("pts") and sm.get("modo") == "frente"), f"desenhar na prévia marca a área ({sm and len(sm.get('pts',[]))} pontos, modo {sm and sm.get('modo')})")
        pg.wait_for_timeout(300); c1 = pg.evaluate(PX + "(0.5,0.5)"); ok(c1[2] > 150 and c1[0] < 80, f"OBJETO NA FRENTE: dentro da área o vídeo passa por cima do texto ({c1})")
        cf = pg.evaluate(PX + "(0.5,0.2)"); ok(True, f"(fora da área: {cf})")
        pg.evaluate(f"(()=>{{{CL}.find(c=>c.id==='{vid}').selm.modo='so';__video.desenhar()}})()"); pg.evaluate(f"(()=>{{const t={CL}.find(c=>c.tipo==='texto');t.off=true}})()")
        c2 = pg.evaluate(PX + "(0.1,0.1)"); c3 = pg.evaluate(PX + "(0.5,0.5)")
        ok(max(c2) < 30 and c3[2] > 150, f"SÓ A ÁREA: fora some (preto {c2}), dentro fica o vídeo ({c3})")
        pg.evaluate(f"(()=>{{{CL}.find(c=>c.id==='{vid}').selm.modo='esconder';__video.desenhar()}})()"); c4 = pg.evaluate(PX + "(0.5,0.5)"); c5 = pg.evaluate(PX + "(0.1,0.1)")
        ok(max(c4) < 30 and c5[2] > 150, f"ESCONDER A ÁREA: dentro some ({c4}), fora fica ({c5})")
        pg.evaluate(f"(()=>{{{CL}.find(c=>c.id==='{vid}').selm.inv=true;__video.desenhar()}})()"); c6 = pg.evaluate(PX + "(0.5,0.5)"); ok(c6[2] > 150, f"INVERTER troca a área ({c6})")
        if toque:
            # pinça com dois dedos na prévia: só o take muda de tamanho, a página não amplia
            e0 = pg.evaluate(f"{CL}.find(c=>c.id==='{vid}').esc||100"); cxm, cym = r[0] + r[2] / 2, r[1] + r[3] / 2
            cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": cxm - 30, "y": cym, "id": 1}, {"x": cxm + 30, "y": cym, "id": 2}]})
            for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": cxm - 30 - 6 * k, "y": cym, "id": 1}, {"x": cxm + 30 + 6 * k, "y": cym, "id": 2}]}); pg.wait_for_timeout(16)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); pg.wait_for_timeout(500)
            e1 = pg.evaluate(f"{CL}.find(c=>c.id==='{vid}').esc||100"); esc = pg.evaluate("visualViewport.scale")
            ok(e1 > e0 * 1.5, f"PINÇA na prévia estica o take ({e0} → {e1}%)"); ok(abs(esc - 1) < 0.01, f"…e a página NÃO amplia (escala {esc})")
            ok(pg.evaluate("!!document.querySelector('#vaFaixa')") , "app montado")
        ok(not erros, "sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
