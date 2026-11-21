#!/usr/bin/env python3
"""Teste local do LAYOUT do EDITOR DE VÍDEO (21/11): prévia no CENTRO e grande, painéis que recolhem (◧ ◨), TELA GRANDE (⛶ / Esc),
divisa arrastável entre prévia e linha do tempo, camadas vazias escondidas (☰ CAMADAS mostra todas), painel de ajustes que reabre ao
escolher um clipe, escolha guardada no aparelho; no celular nada disso aparece e não há estouro.
Telas: 1534×816 (a do dono: 1920×1020 a 125%), 1280×900 e 390×844.   Uso (na raiz): python3 docs/testes/teste_video_layout.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video"; PORTA = 8855
if not os.path.exists(f"{TMP}/clipe.webm"):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libvorbis", f"{TMP}/clipe.webm"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=2", f"{TMP}/musica.wav"], check=True)
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
R = "(s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})"
VIS = "[...document.querySelectorAll('.ve-faixa')].filter(e=>e.offsetParent).map(e=>e.dataset.trilha)"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1534, 816), (1280, 900), (390, 844)):
        print(f"\n=== {largura}×{altura} ==="); cel = largura < 1100
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate(VIS) == ["v1"], f"linha do tempo vazia mostra só a camada VÍDEO {pg.evaluate(VIS)}")
        pg.set_input_files("#veArq", [f"{TMP}/clipe.webm", f"{TMP}/musica.wav"]); pg.wait_for_function("Object.keys(__video.MID).length === 2", timeout=15000); pg.wait_for_timeout(300)
        for t in ("video", "audio"):
            pg.evaluate(f"document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.tipo === '{t}').id + '\"]').click()"); pg.wait_for_timeout(250)
        ok(pg.evaluate(VIS) == ["v1", "a1"], f"com um vídeo e uma música aparecem só as 2 camadas com conteúdo {pg.evaluate(VIS)}")
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        ok("O PROJETO" in pg.inner_text("#vePropCorpo") and "Clipes" in pg.inner_text("#vePropCorpo"), "sem clipe escolhido o painel mostra o PROJETO (tamanho, duração, clipes)")
        if cel:
            ok(pg.evaluate(R + "('#veTogEsq')") is None and pg.evaluate(R + "('#veDiv')") is None, "no celular não há botões de painel nem divisa (a prévia já fica presa no topo)")
            pal, mid = pg.evaluate(R + "('.ve-palco')"), pg.evaluate(R + "('#veMidia')")
            ok(pal and mid and pal[1] < mid[1], "no celular a prévia continua antes da mídia")
        else:
            esq, pal, dirr, cvr, tl = (pg.evaluate(R + f"('{s}')") for s in ("#veEsq", ".ve-palco", "#veProp", "#veCv", "#veTl"))
            ok(esq[0] < pal[0] < dirr[0] and abs(esq[1] - pal[1]) < 4 and abs(dirr[1] - pal[1]) < 4, f"mídia à esquerda, PRÉVIA NO CENTRO, ajustes à direita, na mesma linha (x = {esq[0]}, {pal[0]}, {dirr[0]})")
            ok(pal[2] > esq[2] and pal[2] > dirr[2] and cvr[3] >= 250, f"a prévia é a maior das três colunas ({pal[2]} px contra {esq[2]} e {dirr[2]}; vídeo com {cvr[3]} px de altura)")
            ok(tl[1] + tl[3] <= altura + 2 and cvr[1] + cvr[3] <= tl[1] + 2, "prévia e linha do tempo cabem na tela sem rolar a página")
            pg.click("#veTogEsq"); pg.wait_for_timeout(300); p2 = pg.evaluate(R + "('.ve-palco')")
            ok(pg.evaluate(R + "('#veEsq')") is None and p2[2] > pal[2] + 200, f"◧ esconde a mídia e a prévia cresce ({pal[2]} → {p2[2]} px)")
            pg.click("#veTogDir"); pg.wait_for_timeout(300); p3 = pg.evaluate(R + "('.ve-palco')")
            ok(pg.evaluate(R + "('#veProp')") is None and p3[2] > p2[2] + 200, f"◨ esconde os ajustes e a prévia cresce de novo ({p3[2]} px)")
            vc = pg.evaluate("__video.P().clips.find(c => c.tipo === 'video').id"); pg.evaluate(f"__video.sel('{vc}')"); pg.wait_for_timeout(300)
            ok(pg.evaluate(R + "('#veProp')") is not None, "escolher um clipe traz o painel de AJUSTES de volta sozinho")
            pg.click("#veTogEsq"); pg.wait_for_timeout(250)
            h0 = pg.evaluate(R + "('#veCv')")[3]; pg.click("#veCheia"); pg.wait_for_timeout(350); h1 = pg.evaluate(R + "('#veCv')")[3]
            ok(pg.evaluate(R + "('#veEsq')") is None and pg.evaluate(R + "('#veProp')") is None and h1 > h0 and pg.evaluate(R + "('#veTl')")[3] <= 100, f"⛶ TELA GRANDE: painéis somem, linha do tempo mínima, vídeo maior ({h0} → {h1} px)")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            ok(pg.evaluate(R + "('#veEsq')") is not None and pg.evaluate(R + "('#veProp')") is not None, "Esc volta ao layout de antes")
            d = pg.evaluate(R + "('#veDiv')"); t0 = pg.evaluate(R + "('#veTl')")[3]; c0 = pg.evaluate(R + "('#veCv')")[3]
            pg.mouse.move(d[0] + d[2] / 2, d[1] + 6); pg.mouse.down(); pg.mouse.move(d[0] + d[2] / 2, d[1] + 6 - 90, steps=5); pg.mouse.up(); pg.wait_for_timeout(350)
            t1 = pg.evaluate(R + "('#veTl')")[3]; c1 = pg.evaluate(R + "('#veCv')")[3]
            ok(t1 > t0 + 60 and c1 < c0, f"arrastar a divisa para cima dá mais linha do tempo ({t0} → {t1} px) e a prévia encolhe ({c0} → {c1} px)")
            pg.click("#veTodas"); pg.wait_for_timeout(200)
            ok(len(pg.evaluate(VIS)) == 5, "☰ CAMADAS mostra as 5 camadas, inclusive as vazias")
            pg.wait_for_timeout(300); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(700)
            est = pg.evaluate("__veVista.estado()")
            ok(est["todas"] is True and est["tl"] > 0 and abs(pg.evaluate(R + "('#veTl')")[3] - t1) < 6, f"recarregou: a escolha (camadas e altura da linha do tempo) ficou guardada {est}")
            pg.dblclick("#veDiv"); pg.wait_for_timeout(250); pg.click("#veTodas"); pg.wait_for_timeout(200)
            ok(pg.evaluate("__veVista.estado().tl") == 0 and len(pg.evaluate(VIS)) == 2, "dois toques na divisa volta ao tamanho padrão; ☰ CAMADAS de novo esconde as vazias")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem estouro na tela")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        ok(not erros, f"0 erros de JavaScript {erros[:2]}")
        if largura == 1534: pg.evaluate(f"__video.sel(__video.P().clips.find(c => c.tipo === 'video').id); __video.irPara(1)"); pg.wait_for_timeout(900); pg.screenshot(path="/tmp/ve_layout.png")
        pg.evaluate("indexedDB.deleteDatabase('bw_video'); localStorage.removeItem('ui_ve_vista')"); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
raise SystemExit(1 if falhas else 0)
