#!/usr/bin/env python3
"""Teste local do CHROMA KEY do EDITOR DE VÍDEO (21/11): vídeo de fundo verde com um quadrado vermelho por cima de uma foto azul.
Confere PIXEL: com o chroma ligado o fundo verde vira a foto de baixo e o quadrado continua vermelho; ACHAR SOZINHO e ESCOLHER NA TELA
acham o verde; sombra, limpar borda e os dois motores (WebGL e 2D) dão o mesmo resultado; desfazer; projeto volta ao recarregar;
nada sai do aparelho. 1280 e 390 px.   Uso (na raiz): python3 docs/testes/teste_chroma.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_chroma"; PORTA = 8853
os.makedirs(TMP, exist_ok=True)
if not os.path.exists(f"{TMP}/verde.webm"):
    # fundo verde de estúdio (não é verde puro) + quadrado vermelho no centro + faixa verde-escura (sombra) embaixo
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x2fc05a:size=360x640:rate=25:duration=3",
                    "-vf", "drawbox=x=110:y=220:w=140:h=200:color=0xd02020:t=fill,drawbox=x=110:y=430:w=140:h=40:color=0x145a28:t=fill", "-c:v", "libvpx", "-b:v", "900k", f"{TMP}/verde.webm"], check=True)
    from PIL import Image; Image.new("RGB", (720, 1280), (30, 60, 220)).save(f"{TMP}/azul.png")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; FORA = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
PX = "((fx,fy)=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(Math.round(fx*c.width),Math.round(fy*c.height),1,1).data;return [d[0],d[1],d[2]]})"
def perto(a, b, t=40): return all(abs(x - y) <= t for x, y in zip(a, b))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        ok(pg.evaluate("!!window.BWChroma"), f"módulo do chroma carregado (motor: {pg.evaluate('BWChroma.motor()')})")
        pg.set_input_files("#veArq", [f"{TMP}/azul.png", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length === 2", timeout=15000); pg.wait_for_timeout(300)
        for t in ("imagem", "video"):
            pg.evaluate(f"document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.tipo === '{t}').id + '\"]').click()"); pg.wait_for_timeout(250)
        # o vídeo verde vai para a SOBREPOSIÇÃO, por cima da foto azul, no mesmo trecho
        pg.evaluate("(()=>{const P=__video.P(),v=P.clips.find(c=>c.tipo==='video');v.trilha='v2';v.ini=0;__video.sel(v.id)})()")
        pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(1200)
        antes = [pg.evaluate(PX + "(0.15,0.15)"), pg.evaluate(PX + "(0.5,0.5)")]
        ok(antes[0][1] > 140 and antes[0][0] < 110 and perto(antes[1], [208, 32, 32], 60), f"sem chroma: fundo verde e quadrado vermelho na prévia {antes}")
        # seta da seção (começa fechada) e LIGAR
        pg.locator('#vePropCorpo h4[data-seta="ve-chroma"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vePropCorpo [data-ck="1"]').click(); pg.wait_for_timeout(700)
        cor = pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').ckCor")
        r, g, bl = int(cor[1:3], 16), int(cor[3:5], 16), int(cor[5:7], 16)
        ok(g > 150 and g - max(r, bl) > 60, f"LIGAR já acha a cor do fundo sozinho pelas bordas ({cor})")
        fundo, meio = pg.evaluate(PX + "(0.15,0.15)"), pg.evaluate(PX + "(0.5,0.5)")
        ok(perto(fundo, [30, 60, 220]), f"com chroma: onde era verde aparece a foto azul de baixo {fundo}")
        ok(perto(meio, [208, 32, 32], 60), f"o quadrado vermelho continua vermelho {meio}")
        # AUTOMÁTICO por níveis: abre no automático, com o nível indicado para a imagem; cada nível sobe os 3 ajustes juntos
        c0 = pg.evaluate("(()=>{const c=__video.P().clips.find(c=>c.tipo==='video');return [c.ckModo,c.ckNivel,c.ckInt,c.ckSuave,c.ckSombra]})()")
        ok(c0[0] == "auto" and 1 <= c0[1] <= 5 and pg.locator('#vePropCorpo [data-cknivel]').count() == 5 and pg.locator('#vePropCorpo [data-p="ckInt"]').count() == 0, f"abre no AUTOMÁTICO com 5 níveis e sem controles soltos (nível indicado: {c0[1]})")
        vals = []
        for n in range(1, 6):
            pg.locator(f'#vePropCorpo [data-cknivel="{n}"]').click(); pg.wait_for_timeout(150)
            vals.append(pg.evaluate("(()=>{const c=__video.P().clips.find(c=>c.tipo==='video');return [c.ckInt,c.ckSuave,c.ckSombra,c.ckNivel]})()"))
        ok(all(vals[i][k] < vals[i + 1][k] or (k == 2 and vals[i][k] <= vals[i + 1][k]) for i in range(4) for k in range(3)) and [v[3] for v in vals] == [1, 2, 3, 4, 5], f"cada nível sobe intensidade, suavidade e sombra juntas {[v[:3] for v in vals]}")
        ok(perto(pg.evaluate(PX + "(0.15,0.15)"), [30, 60, 220]) and perto(pg.evaluate(PX + "(0.5,0.5)"), [208, 32, 32], 60), "no nível 5 o fundo continua fora e o quadrado continua vermelho")
        pg.locator('#vePropCorpo [data-cknivel="4"]').click(); pg.wait_for_timeout(150)
        pg.locator('#vePropCorpo [data-ckmodo="manual"]').click(); pg.wait_for_timeout(250)
        ok(pg.evaluate("document.querySelector('#vePropCorpo [data-p=\"ckInt\"]').value") == str(vals[3][0]) and pg.locator('#vePropCorpo [data-cknivel]').count() == 0, f"MANUAL abre os controles já nos valores do nível escolhido (intensidade {vals[3][0]})")
        pg.evaluate("(()=>{for(const [k,v] of [['ckInt',35],['ckSombra',0]]){const e=document.querySelector('#vePropCorpo [data-p=\"'+k+'\"]');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}))}})()"); pg.wait_for_timeout(300)
        ok(pg.locator('#vePropCorpo [data-p="ckInt"]').count() == 1 and pg.locator('#vePropCorpo [data-p="ckSuave"]').count() == 1 and pg.locator('#vePropCorpo [data-p="ckLimpa"]').count() == 1 and pg.locator('#vePropCorpo [data-p="ckSombra"]').count() == 1, "4 controles: intensidade, suavizar borda, limpar borda, sombra")
        # SOMBRA: a faixa verde-escura some com sombra 0 e fica ESCURA (mais escura que a foto) com sombra 100
        s0 = pg.evaluate(PX + "(0.5,0.70)")
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"ckSombra\"]');e.value=100;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(400)
        s1 = pg.evaluate(PX + "(0.5,0.70)")
        ok(perto(s0, [30, 60, 220], 55) and sum(s1) < sum(s0) - 60, f"SOMBRA: a parte escura do fundo some em 0 e vira sombra em 100 ({s0} → {s1})")
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"ckSombra\"]');e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(300)
        # INTENSIDADE 0 = fundo volta a aparecer (quase todo)
        pg.evaluate("(()=>{const c=__video.P().clips.find(c=>c.tipo==='video');c.ckCor='#ff00ff'})()"); pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(500)
        ok(pg.evaluate(PX + "(0.15,0.15)")[1] > 140, "cor errada (magenta) não tira o verde")
        # ESCOLHER NA TELA: toque no fundo da prévia
        pg.locator('#vePropCorpo [data-acao="ckPegar"]').click(); pg.wait_for_timeout(150)
        cx = pg.locator("#veCv").bounding_box(); pg.mouse.click(cx["x"] + cx["width"] * 0.15, cx["y"] + cx["height"] * 0.15); pg.wait_for_timeout(600)
        cor2 = pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').ckCor"); g2 = int(cor2[3:5], 16)
        ok(g2 > 150 and int(cor2[1:3], 16) < 110 and perto(pg.evaluate(PX + "(0.15,0.15)"), [30, 60, 220]), f"ESCOLHER NA TELA pega o verde do ponto tocado ({cor2}) e o fundo some")
        pg.evaluate("(()=>{const c=__video.P().clips.find(c=>c.tipo==='video');c.ckCor='#000000'})()")
        pg.locator('#vePropCorpo [data-acao="ckAuto"]').click(); pg.wait_for_timeout(500)
        ok(int(pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').ckCor")[3:5], 16) > 150, "✦ ACHAR SOZINHO acha o verde de novo")
        # os dois motores dão o mesmo resultado (WebGL × 2D)
        dif = pg.evaluate("""(()=>{const c=__video.P().clips.find(c=>c.tipo==='video'),f=document.createElement('canvas');f.width=360;f.height=640;const g=f.getContext('2d');
          g.fillStyle='#2fc05a';g.fillRect(0,0,360,640);g.fillStyle='#d02020';g.fillRect(110,220,140,200);const gr=g.createLinearGradient(0,0,360,0);gr.addColorStop(0,'#2fc05a');gr.addColorStop(1,'#e0c8a0');g.fillStyle=gr;g.fillRect(0,500,360,80);
          const le=(k)=>{const t=document.createElement('canvas');t.width=k.width;t.height=k.height;const x=t.getContext('2d');x.drawImage(k,0,0);return x.getImageData(0,0,t.width,t.height).data};
          const a=le(BWChroma.aplicar(f,360,640,c)),b=le(BWChroma._2d(f,360,640,c));let m=0,n=0;for(let i=3;i<a.length;i+=4){if(Math.abs(a[i]-b[i])>40||Math.abs(a[i-2]-b[i-2])>40)n++;m++}return n/m})()""")
        ok(isinstance(dif, (int, float)) and dif < 0.01, f"WebGL e 2D (plano B) recortam igual ({dif if isinstance(dif, str) else round(dif * 100, 2)}% de pixels diferentes)")
        # desfazer e voltar ao recarregar
        pg.locator('#vePropCorpo [data-ck="0"]').click(); pg.wait_for_timeout(500)
        ok(pg.evaluate(PX + "(0.15,0.15)")[1] > 140, "DESLIGADO: o fundo verde volta")
        pg.locator('#vePropCorpo [data-ck="1"]').click(); pg.wait_for_timeout(900)
        pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(1500)
        ok(pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').ck === true") and perto(pg.evaluate(PX + "(0.15,0.15)"), [30, 60, 220]), "recarregou: o chroma continua ligado e o fundo continua fora")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem estouro na tela")
        ok(not erros, f"0 erros de JavaScript {erros[:2]}"); ok(not FORA, f"nada saiu do aparelho {FORA[:2]}")
        pg.evaluate("indexedDB.deleteDatabase('bw_video')"); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
raise SystemExit(1 if falhas else 0)
