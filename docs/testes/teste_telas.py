#!/usr/bin/env python3
"""Teste local do TELAS EM MOVIMENTO (20/11): importar fotos + vídeo + música, batida achada na música (120 BPM → 0,5 s), ✨ MONTAR SOZINHO
(cenas na batida, transições do pacote, divisões), escolher cena → divisão/mídia/transição (16 prévias animadas), tocar, desfazer, projeto e
mídias voltam ao recarregar, GERAR VÍDEO de verdade (MP4 conferido com ffprobe: vídeo H.264 + som, duração, e a COR de cada cena no quadro
certo — prova de que a mídia certa está na tela certa) e nada sai do aparelho. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_telas.py   (arquivos de teste em /tmp/teste_telas — o script cria se faltar)"""
import base64, http.server, os, socketserver, subprocess, threading, tempfile
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8861; TMP = "/tmp/teste_telas"
if not os.path.exists(f"{TMP}/musica.wav"):
    os.makedirs(TMP, exist_ok=True)
    from PIL import Image
    for nome, cor in (("vermelha", (230, 30, 40)), ("azul", (30, 70, 230)), ("amarela", (240, 210, 20))): Image.new("RGB", (900, 1600), cor).save(f"{TMP}/{nome}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x00ff88:s=540x960:d=4:r=25", "-c:v", "libvpx", "-b:v", "400k", f"{TMP}/video.webm"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "aevalsrc='0.8*sin(2*PI*880*t)*exp(-40*mod(t\\,0.5))':s=44100:d=12", "-ac", "2", f"{TMP}/musica.wav"], check=True)
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
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
P = "BWTelasEditor.projeto()"
def pixel(arq, t, x, y):
    return list(subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", arq, "-frames:v", "1", "-vf", f"crop=6:6:{x}:{y},scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout)
SAIDA = tempfile.mkdtemp(prefix="teste-telas-")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        cel = largura < 500
        def aba(a):
            if cel: pg.click(f'#tlAbasCel [data-aba="{a}"]'); pg.wait_for_timeout(120)
        pg.goto(BASE + "telas.html"); pg.wait_for_function("window.BWTelasEditor", timeout=15000); pg.wait_for_timeout(400)
        ok(pg.evaluate(SEM) <= 0, "abre sem estouro")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label') || b.title)).length") == 0, "todo botão tem nome")
        aba("mid")
        pg.set_input_files("#tlArq", [f"{TMP}/vermelha.png", f"{TMP}/azul.png", f"{TMP}/amarela.png", f"{TMP}/video.webm"])
        pg.wait_for_function("BWTelasEditor.ordem().length === 4", timeout=30000); pg.wait_for_timeout(500)
        tipos = pg.evaluate("BWTelasEditor.ordem().map(id => BWTelasEditor.midias()[id].tipo)")
        ok(tipos == ["foto", "foto", "foto", "video"] and pg.locator("#tlMidias .tl-mid img").count() == 4, f"importa 3 fotos e 1 vídeo com miniatura ({tipos})")
        dv = pg.evaluate("BWTelasEditor.midias()[BWTelasEditor.ordem()[3]].dur")
        ok(abs(dv - 4) < 0.2, f"duração do vídeo lida ({dv:.2f} s)")
        pg.click('#tlMidias [data-mover]:nth-of-type(1)') if False else None
        pg.set_input_files("#tlArqSom", f"{TMP}/musica.wav"); pg.wait_for_function("BWTelasEditor.batida() > 0", timeout=20000)
        bt = pg.evaluate("BWTelasEditor.batida()")
        ok(abs(bt - 0.5) < 0.03, f"acha a batida da música (120 BPM → {bt:.3f} s)")
        pg.click("#tlMontar"); pg.wait_for_timeout(600)
        if pg.evaluate("document.getElementById('tlTocar').textContent.includes('PAUSAR')"): pg.click("#tlTocar")
        cenas = pg.evaluate(f"{P}.cenas.map(c => [c.layout, c.dur, c.trans])")
        ok(len(cenas) == 4 and all(abs(c[1] - 1.0) < 0.01 for c in cenas), f"✨ MONTAR SOZINHO: 4 cenas de 2 batidas (1,0 s) cada ({[c[1] for c in cenas]})")
        ok(cenas[0][2] == "corte" and cenas[1][2] == "tiras" and cenas[2][2] == "cacos", f"transições do pacote Geométrico em ordem ({[c[2] for c in cenas]})")
        ok(pg.locator("#tlFila .tl-cena").count() == 4 and pg.locator("#tlFila .tl-tr").count() == 3, "SEQUÊNCIA mostra as 4 cenas e as 3 transições")
        # cena 2: transição com prévia animada, divisão em 2
        pg.click('#tlFila [data-cena="1"]'); pg.wait_for_timeout(300); aba("cena")
        ok(pg.locator("#tlPainel .tl-trans canvas").count() == 16, "16 transições com prévia animada")
        # a prévia mexe: dois quadros diferentes
        a1 = pg.evaluate("document.querySelector('[data-mini=\"cacos\"]').toDataURL()"); pg.wait_for_timeout(350); a2 = pg.evaluate("document.querySelector('[data-mini=\"cacos\"]').toDataURL()")
        ok(a1 != a2, "a prévia da transição anima (peças verdes entrando)")
        pg.click('#tlPainel [data-trans="mosaico"]'); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{P}.cenas[1].trans") == "mosaico", "trocar a transição da cena")
        pg.click('#tlPainel [data-lay="dupla"]'); pg.wait_for_timeout(300)
        c1 = pg.evaluate(f"{P}.cenas[1]")
        ok(c1["layout"] == "dupla" and len(c1["midias"]) == 2 and pg.locator('#tlPainel [data-mid]').count() == 2, "DIVIDIDA EM 2: escolhe uma mídia por tela")
        idv = pg.evaluate("BWTelasEditor.ordem()[3]")
        pg.select_option('#tlPainel [data-mid="1"]', idv); pg.wait_for_timeout(300)
        ok(pg.locator('#tlPainel [data-desde="1"]').count() == 1, "vídeo na tela 2 → aparece 'Começa no (s)' para escolher o trecho")
        pg.click('#tlPainel [data-acao="transtodas"]'); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{P}.cenas.slice(1).every(c => c.trans === 'mosaico')"), "USAR EM TODAS aplica a transição em todas as cenas")
        pg.click("#tlDesfazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{P}.cenas[2].trans") == "cacos", "↶ DESFAZER volta (a cena 3 volta a ter Cacos)")
        pg.click("#tlRefazer"); pg.wait_for_timeout(300)
        # prévia desenha
        pg.evaluate("BWTelasEditor.ver(0.5)"); pg.wait_for_timeout(500)
        cor = pg.evaluate("(()=>{const c=document.getElementById('tlCv'),d=c.getContext('2d').getImageData(c.width/2,c.height/2,1,1).data;return [d[0],d[1],d[2]]})()")
        ok(cor[0] > 180 and cor[2] < 90, f"a prévia mostra a 1ª foto (vermelha) em 0,5 s ({cor})")
        pg.click("#tlTocar"); pg.wait_for_timeout(700); pg.click("#tlTocar")
        ok(pg.evaluate("BWTelasEditor.tempo()") > 0.3, "▶ TOCAR anda")
        # recarregar
        pg.fill("#tlNome", f"Teste {largura}"); pg.wait_for_timeout(1000)
        pg.reload(); pg.wait_for_function("window.BWTelasEditor", timeout=15000); pg.wait_for_function(f"{P} && {P}.cenas.length === 4", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate(f"{P}.nome") == f"Teste {largura}" and pg.evaluate("BWTelasEditor.ordem().length") == 4 and pg.evaluate("BWTelasEditor.batida()") > 0, "projeto, mídias e música voltam ao recarregar (ficam no aparelho)")
        ok(pg.evaluate(SEM) <= 0, "sem estouro depois de mexer")
        # GERAR VÍDEO
        pg.evaluate(f"{P}.cenas[1].layout='cheia'; {P}.cenas[1].midias=[BWTelasEditor.ordem()[1]]")  # cena 2 = azul inteira, para conferir a cor
        pg.click("#tlExportar"); pg.select_option("#tlQual", "1280"); pg.click("#tlGerar")
        pg.wait_for_selector("#tlPronto:not([hidden])", timeout=180000)
        b64 = pg.evaluate("(async()=>{const r=await fetch(document.getElementById('tlBaixar').href);const a=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)})()")
        mp4 = os.path.join(SAIDA, f"telas{largura}.mp4"); open(mp4, "wb").write(base64.b64decode(b64))
        pr = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name:format=duration", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout.split()
        ok(any(x.startswith("video,h264") or x.startswith("h264,video") for x in pr) and any("audio" in x for x in pr), f"🎬 MP4 com vídeo H.264 e o som da música ({pr})")
        dur = float([x for x in pr if x.replace('.', '', 1).isdigit()][0]) if any(x.replace('.', '', 1).isdigit() for x in pr) else 0
        ok(abs(dur - 4) < 0.25, f"duração = soma das cenas (4,0 s → {dur:.2f})")
        v = pixel(mp4, 0.5, 360, 640); a = pixel(mp4, 1.85, 360, 640); g = pixel(mp4, 3.85, 360, 640)
        ok(v[0] > 180 and v[2] < 90, f"cena 1 = foto vermelha no vídeo ({v})")
        ok(a[2] > 170 and a[0] < 90, f"cena 2 = foto azul no vídeo, depois da transição ({a})")
        ok(g[1] > 170 and g[0] < 90, f"cena 4 = o TAKE de vídeo (verde) aparece dentro da tela ({g})")
        meio = pixel(mp4, 1.25, 30, 30) + pixel(mp4, 1.25, 690, 1250)
        ok(len(set(tuple(meio[i:i + 3]) for i in (0, 3))) == 2, f"no meio da transição aparecem as duas fotos ao mesmo tempo ({meio})")
        vol = subprocess.run(["ffmpeg", "-hide_banner", "-i", mp4, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mv = [float(x.split("mean_volume:")[1].split("dB")[0]) for x in vol.splitlines() if "mean_volume:" in x]
        ok(mv and mv[0] > -45, f"o som não está mudo (volume médio {mv[0] if mv else '?'} dB)")
        pg.click("#tlFechar")
        # ARRASTAR (20/11): mídia → sequência / cena, efeito → cena / etiqueta, reordenar, tocar para aplicar
        cdp = ctx.new_cdp_session(pg) if cel else None
        def caixa(sel):
            l = pg.locator(sel).first; l.evaluate("e => e.scrollIntoView({block:'center'})"); pg.wait_for_timeout(120); return l.bounding_box()
        def arrastar(de, para, fx=0.5, fy=0.5):
            pg.locator(para).first.evaluate("e => { const f = e.closest('.tl-fila'); if (f) { const r = e.getBoundingClientRect(), fr = f.getBoundingClientRect(); f.scrollLeft += (r.left + r.width / 2) - (fr.left + fr.width / 2); } }")
            a = caixa(de); x0, y0 = a["x"] + a["width"] / 2, a["y"] + a["height"] / 2; H = pg.viewport_size["height"]
            tp = lambda tipo, x, y: cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": ([] if tipo == "touchEnd" else [{"x": x, "y": y}])})
            mv = (lambda x, y: tp("touchMove", x, y)) if cel else (lambda x, y: pg.mouse.move(x, y))
            if cel: tp("touchStart", x0, y0); pg.wait_for_timeout(320)
            else: pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0 + 8, y0 + 8, steps=2)
            x, y = x0, y0
            for _ in range(200):  # leva até a borda para a página rolar sozinha, até o destino aparecer
                bx = pg.locator(para).first.bounding_box()
                if bx and bx["y"] >= 50 and bx["y"] + bx["height"] <= H - 50: break
                y = H - 15 if (not bx or bx["y"] > 50) else 15; mv(x, y); pg.wait_for_timeout(16)
            if y != y0: mv(x, H / 2); pg.wait_for_timeout(120); x, y = x, H / 2
            bx = pg.locator(para).first.bounding_box(); x1, y1 = bx["x"] + bx["width"] * fx, bx["y"] + bx["height"] * fy
            for k in range(1, 11): mv(x + (x1 - x) * k / 10, y + (y1 - y) * k / 10); pg.wait_for_timeout(16)
            pg.wait_for_timeout(80)
            if cel: tp("touchEnd", x1, y1)
            else: pg.mouse.up()
            pg.wait_for_timeout(350)
        aba("mid")
        n0 = pg.evaluate(f"{P}.cenas.length"); ordem = pg.evaluate("BWTelasEditor.ordem()")
        arrastar('#tlMidias .tl-mid >> nth=2', '#tlFila .tl-cena >> nth=-1', fx=0.95)
        ok(pg.evaluate(f"{P}.cenas.length") == n0 + 1 and pg.evaluate(f"{P}.cenas[{n0}].midias[0]") == ordem[2], "arrastar foto para o fim da SEQUÊNCIA cria uma cena com ela")
        aba("mid")
        arrastar('#tlMidias .tl-mid >> nth=0', '#tlFila .tl-cena >> nth=0', fx=0.05)
        ok(pg.evaluate(f"{P}.cenas.length") == n0 + 2 and pg.evaluate(f"{P}.cenas[0].midias[0]") == ordem[0] and pg.evaluate(f"{P}.cenas[0].trans") == "corte" and pg.evaluate(f"{P}.cenas[1].trans") != "corte", "soltar antes da 1ª cena cria a cena no início (a antiga 1ª ganha transição)")
        arrastar('#tlEfx [data-arr="t:circulo"]', '#tlFila .tl-cena >> nth=2')
        ok(pg.evaluate(f"{P}.cenas[2].trans") == "circulo", "arrastar a transição Círculo para a cena 3 aplica")
        arrastar('#tlEfx [data-arr="t:xis"]', '#tlFila .tl-tr[data-tr="1"]')
        ok(pg.evaluate(f"{P}.cenas[1].trans") == "xis", "soltar a transição na etiqueta entre duas cenas troca aquela transição")
        t0 = pg.evaluate(f"{P}.cenas[0].trans"); arrastar('#tlEfx [data-arr="t:zoom"]', '#tlFila .tl-cena >> nth=0')
        ok(pg.evaluate(f"{P}.cenas[0].trans") == t0 and "1ª cena" in pg.inner_text("#tlAviso"), "a 1ª cena recusa transição e explica")
        pg.click('[data-efxaba="div"]'); pg.wait_for_timeout(150)
        ok(pg.locator("#tlEfx [data-arr^='l:']").count() == 6, "aba DIVISÕES mostra as 6 divisões")
        arrastar('#tlEfx [data-arr="l:quatro"]', '#tlFila .tl-cena >> nth=1')
        ok(pg.evaluate(f"{P}.cenas[1].layout") == "quatro" and pg.evaluate(f"{P}.cenas[1].midias.length") == 4, "arrastar a divisão 4 TELAS para a cena 2 aplica e preenche as 4 telas")
        aba("mid")
        arrastar('#tlMidias .tl-mid >> nth=3', '#tlFila .tl-cena >> nth=1', fx=0.78, fy=0.62)
        ok(pg.evaluate(f"{P}.cenas[1].midias[3]") == ordem[3], "soltar o take no canto de baixo à direita da cena troca só a TELA 4")
        ida = pg.evaluate(f"{P}.cenas[{n0 + 1}].id")
        arrastar(f'#tlFila .tl-cena >> nth={n0 + 1}', f'#tlFila .tl-cena >> nth={n0}', fx=0.1)
        ok(pg.evaluate(f"{P}.cenas[{n0}].id") == ida, "arrastar uma cena para antes da outra muda a ordem")
        pg.click('[data-efxaba="trans"]'); pg.wait_for_timeout(150)
        pg.locator('#tlFila .tl-cena >> nth=2').click(); pg.wait_for_timeout(200); pg.locator('#tlEfx [data-arr="t:persiana"]').click(); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{P}.cenas[2].trans") == "persiana", "tocar num efeito aplica na cena escolhida")
        ok(pg.locator(".tl-fantasma").count() == 0 and not pg.evaluate("document.documentElement.classList.contains('tl-arrastando')"), "nada fica preso na tela depois de soltar")
        ok(pg.evaluate(SEM) <= 0, "sem estouro com a faixa de efeitos")
        # TAMANHO PERSONALIZADO / 4K (20/11)
        pg.select_option("#tlFmt", "livre"); pg.wait_for_timeout(150)
        ok(pg.is_visible("#tlLargura"), "Personalizado mostra largura × altura")
        pg.fill("#tlLargura", "1450"); pg.fill("#tlAltura", "2000"); pg.locator("#tlAltura").dispatch_event("change"); pg.wait_for_timeout(300)
        wh = pg.evaluate(f"[{P}.w, {P}.h]"); cv = pg.evaluate("(()=>{const c=document.getElementById('tlCv');return c.width/c.height})()")
        ok(wh == [1450, 2000] and abs(cv - 1450 / 2000) < 0.01, f"telão 1450×2000: projeto e prévia na proporção certa ({wh}, {cv:.3f})")
        pg.click("#tlExportar"); pg.wait_for_timeout(600)
        qs = pg.evaluate("[...document.querySelectorAll('#tlQual option')].map(o => o.textContent)")
        ok(any("1450×2000" in q for q in qs), f"GERAR VÍDEO oferece o tamanho real ({qs})")
        pg.click("#tlFechar")
        if not cel:
            b64 = pg.evaluate("""(async()=>{const P=BWTelasEditor.projeto(); const r=await BWReelsCelular.gerar({largura:1450,altura:2000,fps:30,duracao:0.4,alturaSaida:2000,desenhar:async(t,ctx,w,h)=>{ctx.fillStyle='#2266ff';ctx.fillRect(0,0,w,h)}});
              const a=new Uint8Array(await r.blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)})()""")
            arq = os.path.join(SAIDA, "telao.mp4"); open(arq, "wb").write(base64.b64decode(b64))
            dims = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries", "stream=width,height,profile,level", "-of", "csv=p=0", arq], capture_output=True, text=True).stdout.strip()
            ok("1450,2000" in dims, f"MP4 do telão sai em 1450×2000 de verdade ({dims})")
            k4 = pg.evaluate("BWReelsCelular.cabe(3840, 2160)"); print(f"  · 4K neste navegador de teste: {'gera' if k4 else 'não gera (o aviso aparece)'}")
        pg.select_option("#tlFmt", "9:16"); pg.wait_for_timeout(200)
        ok(not erros, "sem erros de JavaScript" + (": " + " | ".join(erros[:3]) if erros else ""))
        ok(not FORA, "nada sai do aparelho" + (": " + ", ".join(FORA[:3]) if FORA else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("Tudo certo." if not falhas else f"{len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
raise SystemExit(1 if falhas else 0)
