#!/usr/bin/env python3
"""Teste local do ÁLBUM 3D E EFEITOS (22/11): galeria com TODOS os modelos (miniaturas animadas desenhadas), categorias, escolher modelo,
importar fotos + vídeo (entram no lugar dos números — conferido no PIXEL), cada modelo desenha sem erro com as mídias, ajustes (tempo, moldura,
fundo de recorte, título), desfazer, projeto e mídias voltam ao recarregar, GERAR VÍDEO de verdade (MP4 conferido com ffprobe e a COR da foto
certa no tempo certo), botão ➜ LINHA DO TEMPO, nada sai do aparelho, abas do celular, link no Estúdio 3D. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_album.py"""
import http.server, os, socketserver, subprocess, threading, tempfile, json
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8873; TMP = "/tmp/teste_album"
if not os.path.exists(f"{TMP}/video.webm"):
    os.makedirs(TMP, exist_ok=True)
    from PIL import Image
    for nome, cor in (("vermelha", (230, 30, 40)), ("azul", (30, 70, 230)), ("amarela", (240, 210, 20))): Image.new("RGB", (900, 1200), cor).save(f"{TMP}/{nome}.png")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "color=c=0x00ff88:s=540x720:d=4:r=25", "-c:v", "libvpx", "-b:v", "400k", f"{TMP}/video.webm"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "aevalsrc='0.8*sin(2*PI*660*t)*exp(-30*mod(t\\,0.5))':s=44100:d=20", "-ac", "2", f"{TMP}/musica.wav"], check=True)
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
E = "BWAlbumEditor"
def pixel(arq, t, x, y):
    return list(subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", arq, "-frames:v", "1", "-vf", f"crop=6:6:{x}:{y},scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout)
def perto(c, alvo, tol=60): return len(c) == 3 and all(abs(a - b) <= tol for a, b in zip(c, alvo))
# cor do centro da prévia (média de 9x9)
CENTRO = "(()=>{const c=document.getElementById('alCv'),x=c.getContext('2d').getImageData((c.width>>1)-4,(c.height>>1)-4,9,9).data;let r=0,g=0,b=0;for(let i=0;i<x.length;i+=4){r+=x[i];g+=x[i+1];b+=x[i+2]}const n=x.length/4;return [r/n|0,g/n|0,b/n|0]})()"
CANTO = "(()=>{const c=document.getElementById('alCv'),x=c.getContext('2d').getImageData(2,2,1,1).data;return [x[0],x[1],x[2]]})()"
SAIDA = tempfile.mkdtemp(prefix="teste-album-")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); cel = largura < 500
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel, accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        def aba(a):
            if cel: pg.click(f'#alAbas [data-aba="{a}"]'); pg.wait_for_timeout(150)
        pg.goto(BASE + "album3d.html"); pg.wait_for_function("window.BWAlbumEditor", timeout=15000); pg.wait_for_timeout(700)
        ok(pg.evaluate(SEM) <= 0, "abre sem estouro")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label') || b.title)).length") == 0, "todo botão tem nome")
        ok(not pg.locator("header .bw-topo, .bw-topbar").first.is_visible() if pg.locator("header .bw-topo, .bw-topbar").count() else True, "modo foco (sem o topo do site)")
        n = pg.evaluate("BWAlbum.MODELOS.length"); nm = pg.locator("#alMods .al-md").count()
        ok(n >= 40 and nm == n, f"galeria com todos os modelos ({nm} de {n})")
        cats = pg.evaluate("BWAlbum.CATS.slice(1).map(c=>[c[0],BWAlbum.MODELOS.filter(m=>m.cat===c[0]).length])")
        ok(all(q >= 10 for _, q in cats), f"as 3 categorias com 10+ modelos cada ({cats})")
        aba("mod")
        pg.click('#alCats [data-cat="album"]'); pg.wait_for_timeout(200)
        ok(pg.locator("#alMods .al-md").count() == dict(cats)["album"], "filtro ÁLBUM DE FOTOS mostra só os de álbum")
        pg.click('#alCats [data-cat="todos"]'); pg.wait_for_timeout(500)
        cheias = pg.evaluate("[...document.querySelectorAll('#alMods .al-md canvas')].slice(0,6).filter(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let v=0;for(let i=0;i<d.length;i+=16){if(d[i]+d[i+1]+d[i+2]>200)v++}return v>20}).length")
        ok(cheias >= 5, f"miniaturas da galeria desenhadas e animadas ({cheias}/6)")
        ok(pg.locator("#alCv").is_visible(), "prévia à vista")
        pg.click('#alMods [data-mod="carrossel"]', force=True); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{E}.projeto().modelo") == "carrossel" and "Carrossel" in pg.inner_text("#alInfo"), "tocar no modelo escolhe e mostra o nome/descrição")
        # fotos e vídeo
        aba("fot")
        pg.set_input_files("#alArq", [f"{TMP}/vermelha.png", f"{TMP}/azul.png", f"{TMP}/amarela.png", f"{TMP}/video.webm"])
        pg.wait_for_function(f"{E}.ordem().length === 4", timeout=30000); pg.wait_for_timeout(600)
        tipos = pg.evaluate(f"{E}.ordem().map(id => {E}.midias()[id].tipo)")
        ok(tipos == ["foto", "foto", "foto", "video"] and pg.locator("#alMidias .al-mid img").count() == 4, f"importa 3 fotos e 1 vídeo com miniatura ({tipos})")
        # efeito de tela cheia: no começo a 1ª foto (vermelha) ocupa o centro
        pg.evaluate(f"{E}.escolher('fx-cubo', true)"); pg.wait_for_timeout(200)
        if pg.evaluate(f"{E}.tocando()"): pg.click("#alTocar")
        pg.evaluate(f"{E}.ver(0.3)"); pg.wait_for_timeout(500)
        c0 = pg.evaluate(CENTRO); ok(perto(c0, [230, 30, 40]), f"a 1ª foto entra no lugar do 01 (centro vermelho: {c0})")
        d = pg.evaluate(f"{E}.duracao()"); pg.evaluate(f"{E}.ver({E}.duracao()/4*1+0.3)"); pg.wait_for_timeout(500)
        c1 = pg.evaluate(CENTRO); ok(perto(c1, [30, 70, 230]), f"depois vem a 2ª (azul: {c1})")
        pg.evaluate(f"{E}.ver({E}.duracao()/4*3+0.4)"); pg.wait_for_timeout(1200)
        c3 = pg.evaluate(CENTRO); ok(perto(c3, [0, 255, 136], 70), f"o take de vídeo aparece no 4º (verde: {c3})")
        # todos os modelos desenham com as mídias, sem erro
        e0 = len(erros)
        pg.evaluate(f"""(()=>{{ const c=document.createElement('canvas'); c.width=180; c.height=320; const P=JSON.parse(JSON.stringify({E}.projeto())), m={E}.midias(), o={E}.ordem();
          const f=i=>{{const x=m[o[i]]; return x&&x.el&&x.w?{{el:x.el,w:x.w,h:x.h}}:null}};
          BWAlbum.MODELOS.forEach(md=>{{ P.modelo=md.id; const D=BWAlbum.duracao(P,o.length); [0.05,0.35,0.6,0.97].forEach(k=>BWAlbum.desenhar(c.getContext('2d'),P,D*k,180,320,f,{{nMidias:o.length,cache:{{}}}})); }}); }})()""")
        ok(len(erros) == e0, f"todos os {n} modelos desenham com fotos e vídeo, sem erro")
        # FOTOLIVRO (22/11): várias fotos por página e página virando
        ok(len(pg.evaluate("BWAlbum.MODELOS.filter(m=>m.id.indexOf('fotolivro')===0).map(m=>m.id)")) == 4, "4 modelos de FOTOLIVRO (aberto, capa, de cima, close)")
        CORES = """(()=>{const c=document.querySelector('#alCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let r=0,b=0,a=0;for(let i=0;i<d.length;i+=16){const R=d[i],G=d[i+1],B=d[i+2];if(R>180&&G<90&&B<90)r++;if(B>180&&R<90&&G<130)b++;if(R>200&&G>180&&B<90)a++}return [r,b,a]})()"""
        pg.evaluate(f"{E}.escolher('fotolivro-cima', true)"); pg.wait_for_timeout(200)
        if pg.evaluate(f"{E}.tocando()"): pg.click("#alTocar")
        pg.evaluate(f"{E}.ver(0.3)"); pg.wait_for_timeout(500)
        cs = pg.evaluate(CORES); ok(cs[0] > 30 and cs[1] > 30 and cs[2] > 30, f"fotolivro de cima: 4 fotos na 1ª página, juntas (vermelha/azul/amarela {cs})")
        e1 = len(erros); pg.evaluate(f"{E}.ver({E}.duracao()-0.2)"); pg.wait_for_timeout(500)
        ok(len(erros) == e1, "fotolivro chega ao fim sem erro")
        # ajustes
        aba("aju")
        pg.evaluate(f"{E}.escolher('polaroid', true)"); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{E}.projeto().borda") == "polaroid", "modelo de álbum já vem com moldura polaroid")
        d0 = pg.evaluate(f"{E}.duracao()"); pg.fill("#alTp", "2"); pg.dispatch_event("#alTp", "input"); pg.wait_for_timeout(200)
        d1 = pg.evaluate(f"{E}.duracao()"); ok(d1 > d0, f"tempo por foto muda a duração ({d0:.1f} → {d1:.1f} s)")
        pg.click('#alVisual [data-grupo="borda"] [data-v="neon"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate(f"{E}.projeto().borda") == "neon" and pg.locator("#alBordaCor").count() == 1, "moldura NEON com cor própria")
        pg.click('#alVisual [data-grupo="fundo"] [data-v="verde"]'); pg.wait_for_timeout(300)
        if pg.evaluate(f"{E}.tocando()"): pg.click("#alTocar")
        pg.evaluate(f"{E}.ver(1)"); pg.wait_for_timeout(300)
        ok(perto(pg.evaluate(CANTO), [0, 177, 64], 8), f"fundo VERDE para chroma key ({pg.evaluate(CANTO)})")
        pg.click('#alVisual [data-grupo="fundo"] [data-v="escuro"]')
        if pg.locator('#alTitulo').is_hidden(): pg.click('h4[data-seta="al_titulo"]')
        pg.fill("#alTit", "Casamento Ana & Léo"); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{E}.projeto().titulo") == "Casamento Ana & Léo", "título do álbum")
        pg.keyboard.press("Escape"); pg.evaluate("document.activeElement && document.activeElement.blur()")
        pg.wait_for_timeout(400); pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{E}.projeto().titulo") != "Casamento Ana & Léo", "Ctrl+Z desfaz")
        pg.keyboard.press("Control+y"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{E}.projeto().titulo") == "Casamento Ana & Léo", "Ctrl+Y refaz")
        # recarregar
        pg.evaluate(f"{E}.escolher('anel', true)"); pg.wait_for_timeout(900)
        pg.reload(); pg.wait_for_function(f"window.{E} && {E}.ordem().length === 4", timeout=20000); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{E}.projeto().modelo") == "anel" and pg.evaluate(f"{E}.projeto().titulo") == "Casamento Ana & Léo", "projeto e mídias voltam ao recarregar")
        ok(pg.evaluate(SEM) <= 0, "sem estouro com tudo preenchido")
        # gerar vídeo (efeito de tela cheia: cores conferidas no MP4)
        pg.evaluate(f"{E}.escolher('fx-virar', true)"); pg.wait_for_timeout(200)
        if pg.evaluate(f"{E}.tocando()"): pg.click("#alTocar")
        pg.evaluate(f"(()=>{{const P={E}.projeto(); P.titulo=''; P.tp=1.2}})()")
        pg.click("#alExportar"); pg.wait_for_timeout(300)
        ok(pg.locator("#alFolha").is_visible(), "folha GERAR VÍDEO abre")
        quals = pg.evaluate("[...document.querySelectorAll('#alQual option')].map(o=>o.textContent)")
        ok(any("4K" in q for q in quals), f"opção 4K no vídeo ({quals})")
        pg.click("#alFechar"); pg.wait_for_timeout(200)
        pg.select_option("#alFmt", "livre"); pg.wait_for_timeout(200)
        ok(pg.locator("#alLivre").is_visible(), "PERSONALIZADO mostra largura × altura")
        pg.fill("#alLarg", "1000"); pg.dispatch_event("#alLarg", "change"); pg.fill("#alAlt", "600"); pg.dispatch_event("#alAlt", "change"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"[{E}.projeto().w,{E}.projeto().h]") == [1000, 600], "tamanho personalizado 1000×600 aplicado")
        pg.select_option("#alFmt", "tela"); pg.wait_for_timeout(200)
        ok(pg.evaluate(f"{E}.projeto().w") > 0 and not pg.locator("#alLivre").is_visible(), f"TELA DESTE APARELHO ({pg.evaluate(E + '.projeto().w')}×{pg.evaluate(E + '.projeto().h')})")
        ok(pg.evaluate(SEM) <= 0, "sem estouro com o tamanho personalizado")
        pg.select_option("#alFmt", "9:16"); pg.wait_for_timeout(300)
        pg.click("#alExportar"); pg.wait_for_timeout(300)
        pg.select_option("#alQual", index=0); pg.click("#alGerar")
        pg.wait_for_function("!document.getElementById('alPronto').hidden || /Não deu/.test(document.getElementById('alProgTxt').textContent)", timeout=240000)
        txt = pg.inner_text("#alProgTxt"); ok("pronto" in txt, f"vídeo gerado ({txt})")
        href = pg.get_attribute("#alBaixar", "href")
        dados = pg.evaluate("async u => { const r = await fetch(u); const b = new Uint8Array(await r.arrayBuffer()); let s=''; for (let i=0;i<b.length;i+=32768) s+=String.fromCharCode.apply(null,b.subarray(i,i+32768)); return btoa(s); }", href)
        import base64
        arq = os.path.join(SAIDA, f"album-{largura}.mp4"); open(arq, "wb").write(base64.b64decode(dados))
        info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", arq], capture_output=True, text=True).stdout)
        dur = float(info["format"]["duration"]); dv = pg.evaluate(f"{E}.duracao()")
        ok(info["streams"][0]["codec_name"] == "h264" and abs(dur - dv) < 0.4, f"MP4 H.264 com a duração certa ({dur:.1f} s de {dv:.1f})")
        w, h = info["streams"][0]["width"], info["streams"][0]["height"]
        a = pixel(arq, 0.3, w // 2, h // 2); z = pixel(arq, dv * 3 / 4 + 0.4, w // 2, h // 2)
        ok(perto(a, [230, 30, 40]) and perto(z, [0, 255, 136], 80), f"no MP4 a foto certa no tempo certo (início {a}, take de vídeo {z})")
        ok(pg.locator("#alPronto .bwcr-bt, #alPronto [data-bwcr]").count() + pg.locator("text=LINHA DO TEMPO").count() >= 1, "botão ➜ MANDAR PARA A LINHA DO TEMPO ao lado do salvar")
        pg.click("#alFechar")
        if cel:
            aba("mod"); ok(pg.locator("#alMod").is_visible() and pg.locator("#alDir").is_hidden(), "celular: aba MODELOS mostra só a galeria")
            aba("fot"); ok(pg.locator("#alFot").is_visible() and pg.locator("#alAju").is_hidden(), "celular: aba FOTOS")
            pg.evaluate("window.scrollTo(0, 2000)"); pg.wait_for_timeout(200)
            r = pg.evaluate("document.getElementById('alCv').getBoundingClientRect().bottom")
            ok(r > 40, f"celular: a prévia fica presa no alto enquanto rola ({r:.0f})")
        ok(not erros, "sem erro de JavaScript" + (": " + erros[0] if erros else ""))
        ok(not FORA, "nada saiu do aparelho" + (": " + FORA[0] if FORA else ""))
        ctx.close()
    # Estúdio 3D: o modo novo leva ao Álbum
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page()
    pg.goto(BASE + "3d.html"); pg.wait_for_timeout(1500)
    ok(pg.locator('#d3Modos a[href="album3d.html"]').is_visible(), "ESTÚDIO 3D: modo ÁLBUM 3D E EFEITOS à vista")
    pg.click('#d3Modos [data-m="logo"]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("document.querySelector('#d3Modos [data-m=logo]').classList.contains('on')"), "ESTÚDIO 3D: os outros modos continuam funcionando")
    ctx.close(); b.close()
srv.shutdown()
print("\n" + ("✅ ÁLBUM 3D: tudo certo" if not falhas else f"❌ {len(falhas)} falha(s): " + "; ".join(falhas)))
