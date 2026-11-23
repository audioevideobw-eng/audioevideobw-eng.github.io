#!/usr/bin/env python3
"""Teste do LAÇO (escolher vários takes arrastando no vazio da linha do tempo, PC) e do ＋ IMPORTAR por toque direto (iPhone) — 23/11. Base: teste da MÁSCARA POR SELEÇÃO (objetos) e da PINÇA na prévia do EDITOR DE VÍDEO (22/11, pedido do dono). Base copiada do teste do LAYOUT DE APP do EDITOR DE VÍDEO (22/11, pedido do dono com prints do CapCut do celular) — com TOQUE de verdade (CDP).
Confere: no celular a tela vira app (topo fino, prévia grande, ▶ no meio, linha do tempo com a agulha parada no meio, faixa de ferramentas
que rola para o lado); nada estoura; tocar num take troca a faixa para as ferramentas DELE (vídeo, texto, som); cada ferramenta abre uma
FOLHA só com aquele ajuste e o ajuste vale; ✓ fecha; tocar no vazio volta às ferramentas do projeto; Áudio/Texto abrem submenu com ‹ voltar;
MÍDIA abre a biblioteca e um toque põe o take; FORMATO troca o formato; rolar a linha do tempo anda no vídeo e tocar faz ela andar sozinha;
segurar o dedo no take abre as opções; EXPORTAR chama a exportação; desfazer; no PC (1280) continua o layout antigo e ?layout=app liga o novo.
Uso (na raiz): python3 docs/testes/teste_video_app.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video_app"; PORTA = 8891
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
def caixa(pg, sel):
    return pg.evaluate("(s)=>{const r=document.querySelector(s).getBoundingClientRect();return [r.left,r.top,r.width,r.height]}", sel)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    print("\n=== PC 1280: laço ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(400)
    ok(True, "PC: clicar no ＋ IMPORTAR abre o seletor de arquivos e o arquivo entra")
    for k in range(3): pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(350)
    pg.evaluate(f"(()=>{{const v={CL}.filter(c=>c.tipo==='video');v.forEach((c,i)=>{{c.dur=2;c.ini=i*2.5;c.trilha='v1'}});__video.addTexto({{t:0.5}});__video.tudo()}})()"); pg.wait_for_timeout(500)
    n = pg.evaluate(f"{CL}.length"); ok(n == 4, f"4 takes na linha do tempo ({n})")
    fx = caixa(pg, "#veFaixas"); cs = pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-clip')].map(e=>{const r=e.getBoundingClientRect();return [e.dataset.clip,r.left,r.top,r.right,r.bottom]})")
    topo = min(c[2] for c in cs); base = max(c[4] for c in cs); dir_ = max(c[3] for c in cs)
    # começa no VAZIO à direita do último take e arrasta até antes do primeiro, cobrindo todas as camadas
    pg.mouse.move(dir_ + 40, base - 4); pg.mouse.down(); pg.mouse.move(dir_ - 100, base - 30, steps=5); pg.wait_for_timeout(100)
    ok(pg.evaluate("!!document.querySelector('.ve-laco')"), "arrastar a partir do vazio desenha o LAÇO")
    pg.mouse.move(min(c[1] for c in cs) + 5, topo + 4, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
    m = pg.evaluate("document.querySelectorAll('#veFaixas .ve-clip.multi').length"); ok(m == 4, f"o laço escolhe os 4 takes, de todas as camadas ({m})")
    ok(not pg.evaluate("!!document.querySelector('.ve-laco')"), "o laço some ao soltar")
    # mover o grupo
    antes = pg.evaluate(f"{CL}.map(c=>c.ini)"); c0 = pg.evaluate("(()=>{const r=document.querySelector('#veFaixas .ve-clip.multi').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
    pps = pg.evaluate("(()=>{const e=document.querySelector('#veFaixas .ve-clip');const c=__video.P().clips.find(x=>x.id===e.dataset.clip);return e.getBoundingClientRect().width/c.dur})()")
    pg.mouse.move(c0[0], c0[1]); pg.mouse.down(); pg.mouse.move(c0[0] + pps * 1.0, c0[1], steps=6); pg.mouse.up(); pg.wait_for_timeout(400)
    dep = pg.evaluate(f"{CL}.map(c=>c.ini)"); dif = [round(d - a, 1) for a, d in zip(antes, dep)]; ok(all(abs(x - 1.0) < 0.15 for x in dif), f"arrastar um take do grupo move TODOS juntos (+1 s cada: {dif})")
    ok(pg.evaluate("document.querySelectorAll('#veFaixas .ve-clip.multi').length") == 4, "depois de mover, o grupo continua escolhido")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok([round(x, 1) for x in pg.evaluate(f"{CL}.map(c=>c.ini)")] == [round(x, 1) for x in antes], "Ctrl+Z desfaz o movimento do grupo num passo só")
    # Ctrl + clique tira um; Delete apaga o resto
    pg.keyboard.press("Control+a"); pg.wait_for_timeout(200); ok(pg.evaluate("document.querySelectorAll('#veFaixas .ve-clip.multi').length") == 4, "Ctrl+A escolhe todos")
    tx = pg.evaluate(f"{CL}.find(c=>c.tipo==='texto').id"); r = caixa(pg, f'#veFaixas [data-clip="{tx}"]')
    pg.keyboard.down("Control"); pg.mouse.click(r[0] + r[2] / 2, r[1] + r[3] / 2); pg.keyboard.up("Control"); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelectorAll('#veFaixas .ve-clip.multi').length") == 3, "Ctrl + clique tira um take do grupo")
    pg.keyboard.press("Control+c"); pg.keyboard.press("Delete"); pg.wait_for_timeout(400); r2 = pg.evaluate(f"{CL}.map(c=>c.tipo)"); ok(r2 == ["texto"], f"Delete apaga os 3 escolhidos e deixa o texto ({r2})")
    pg.evaluate("__video.irPara(1)"); pg.keyboard.press("Control+v"); pg.wait_for_timeout(400); ini = sorted(pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').map(c=>c.ini)")); ok(len(ini) == 3 and abs(ini[0] - 1) < 0.1 and abs(ini[2] - 6) < 0.1, f"Ctrl+V cola o grupo na agulha mantendo os espaços ({ini})")
    # clique simples no vazio solta tudo
    ult = pg.evaluate("Math.max(...[...document.querySelectorAll('#veFaixas .ve-clip')].map(e=>e.getBoundingClientRect().right))"); pg.mouse.click(ult + 40, base - 6); pg.wait_for_timeout(250)
    ok(pg.evaluate("document.querySelectorAll('#veFaixas .ve-clip.multi,#veFaixas .ve-clip.on').length") == 0, "clique simples no vazio solta a seleção")
    ok(not erros, f"sem erro de JavaScript ({erros[:2]})"); ctx.close()
    print("\n=== iPhone 13: ＋ IMPORTAR por toque ===")
    ctx = b.new_context(**{k: v for k, v in p.devices["iPhone 13"].items() if k != "default_browser_type"}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("document.documentElement.classList.contains('ve-app') && !document.documentElement.classList.contains('app-cedo')", timeout=15000); pg.wait_for_timeout(900)
    alvo0 = pg.evaluate("(()=>{const r=document.getElementById('vaAdd').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e&&e.id})()")
    ok(alvo0 == "vaArq", f"biblioteca vazia: o ＋ da linha do tempo É o seletor de arquivos ({alvo0})")
    with pg.expect_file_chooser(timeout=5000) as fc0: pg.tap("#vaArq")
    fc0.value.set_files([f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(900)
    ok(pg.evaluate("!document.getElementById('vaSheet').hidden && document.getElementById('veLib').getBoundingClientRect().height>40"), "depois de escolher, a folha MÍDIA abre com o arquivo na biblioteca")
    pg.evaluate("document.getElementById('vaSheetOk')&&document.getElementById('vaSheetOk').click()"); pg.wait_for_timeout(300); pg.evaluate("document.getElementById('vaSheet').hidden||document.querySelector('#vaSheet button').click()"); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.getElementById('vaArq').hidden"), "com mídia na biblioteca o ＋ volta a abrir a folha")
    ok(pg.evaluate("getComputedStyle(document.body).position") == "fixed", "corpo preso (sem rebote da página)")
    pg.tap("#vaAdd"); pg.wait_for_timeout(500)
    r = caixa(pg, "#veImportar"); ok(r[2] > 40 and r[3] > 24, f"o ＋ IMPORTAR está na folha ({[round(x) for x in r]})")
    alvo = pg.evaluate("(()=>{const r=document.getElementById('veImportar').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e&&e.tagName+'#'+e.id+':'+e.type})()")
    ok(alvo == "INPUT#veArq:file", f"o dedo cai DIRETO no seletor de arquivos (sem click por código): {alvo}")
    with pg.expect_file_chooser(timeout=5000) as fc: pg.touchscreen.tap(r[0] + r[2] / 2, r[1] + r[3] / 2)
    fc.value.set_files([f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000)
    ok(True, "tocar no ＋ IMPORTAR abre o seletor e o arquivo entra na biblioteca")
    ok(not erros, f"sem erro de JavaScript ({erros[:2]})"); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("FALHAS: %d" % len(falhas) if falhas else "0 falhas")); raise SystemExit(1 if falhas else 0)
