#!/usr/bin/env python3
"""Teste local do EDITOR DE VÍDEO (18/11): importar vídeo/imagem/áudio, linha do tempo em camadas (clipes, texto, efeitos e trilhas
sintetizados), dividir, arrastar, aparar, ajustes, tocar (a prévia desenha o vídeo), exportar de verdade (arquivo conferido com ffprobe:
vídeo + áudio, duração e volume), projeto volta ao recarregar, nada sai do aparelho. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_video.py   (precisa dos arquivos de /tmp/teste_video: clipe.webm, musica.wav, foto.png)"""
import base64, http.server, json, os, re, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video"; PORTA = 8851
if not os.path.exists(f"{TMP}/clipe.webm"):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libvorbis", f"{TMP}/clipe.webm"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=2", f"{TMP}/musica.wav"], check=True)
    from PIL import Image; Image.new("RGB", (600, 900), (220, 40, 40)).save(f"{TMP}/foto.png")
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
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")   # fontes do visual da plataforma (brightway.css), não do editor
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        ok(pg.locator("#veRot div").count() == 6 and pg.locator(".ve-faixa").count() == 5 and pg.evaluate(SEM) <= 0, "abre com 5 camadas (sobreposição, vídeo, texto, trilha, efeitos), sem estouro")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        pg.set_input_files("#veArq", [f"{TMP}/clipe.webm", f"{TMP}/foto.png", f"{TMP}/musica.wav"]); pg.wait_for_function("Object.keys(__video.MID).length === 3", timeout=15000); pg.wait_for_timeout(300)
        tipos = pg.evaluate("Object.values(__video.MID).map(m => m.tipo + ':' + Math.round(m.dur)).sort()")
        ok(tipos == ["audio:2", "imagem:4", "video:3"], f"importa vídeo, imagem e áudio com a duração certa {tipos}")
        ok(pg.locator("#veLib .ve-item img").count() == 2, "biblioteca com miniatura do vídeo e da imagem")
        for t in ("video", "imagem", "audio"):
            pg.evaluate(f"document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.tipo === '{t}').id + '\"]').click()"); pg.wait_for_timeout(200)
        cl = pg.evaluate("__video.P().clips.map(c => [c.trilha, c.ini, c.dur])")
        ok(cl == [["v1", 0, 3], ["v1", 3, 4], ["a1", 0, 2]], f"tocar no item põe na camada certa, um depois do outro {cl}")
        pg.click("#veTexto"); pg.wait_for_timeout(200)
        pg.fill('#vePropCorpo [data-p="txt"]', "OLÁ BW"); pg.wait_for_timeout(200)
        ok(pg.locator('.ve-faixa[data-trilha="tx"] .ve-clip').count() == 1 and "OLÁ BW" in pg.inner_text('.ve-faixa[data-trilha="tx"]'), "T TEXTO cria o clipe de texto e o que digito aparece na linha do tempo")
        pg.click("#veSons"); pg.wait_for_timeout(200)
        ok(pg.locator("#veLib [data-som]").count() == 8, "EFEITOS E TRILHAS: 6 efeitos + 2 trilhas feitos no aparelho")
        pg.evaluate("__video.irPara(1)"); pg.evaluate("document.querySelector('#veLib [data-som=\"2\"]').click()"); pg.wait_for_function("__video.P().clips.some(c => c.trilha === 'a2')", timeout=10000)
        fx = pg.evaluate("__video.P().clips.find(c => c.trilha === 'a2')")
        ok(fx["ini"] == 1 and abs(fx["dur"] - 1.4) < 0.05, f"efeito sonoro entra na camada EFEITOS, na posição da agulha {fx['ini']} / {fx['dur']}")
        # prévia desenha o vídeo e a imagem
        pg.evaluate("__video.irPara(0.5)"); pg.wait_for_timeout(900)
        px = pg.evaluate("(()=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4000)if(d[i]+d[i+1]+d[i+2]>60)n++;return n})()")
        ok(px > 50, f"a prévia mostra o quadro do vídeo parado em 0,5 s ({px} pontos claros)")
        pg.evaluate("__video.irPara(4)"); pg.wait_for_timeout(300)
        pi = pg.evaluate("[...document.getElementById('veCv').getContext('2d').getImageData(20,20,1,1).data]")
        ok(pi[0] > 180 and pi[1] < 90, f"em 4 s a prévia mostra a imagem (vermelha) {pi}")
        # dividir, arrastar, aparar
        idv = pg.evaluate("__video.P().clips[0].id"); pg.evaluate(f"__video.sel('{idv}'); __video.irPara(1.5)"); pg.click("#veCortar"); pg.wait_for_timeout(200)
        cv2 = pg.evaluate("__video.P().clips.filter(c => c.tipo === 'video').map(c => [c.ini, c.dur, c.corte])")
        ok(cv2 == [[0, 1.5, 0], [1.5, 1.5, 1.5]], f"✂ DIVIDIR na agulha corta o vídeo em dois, o 2º começa do ponto certo {cv2}")
        ida = pg.evaluate("__video.P().clips.find(c => c.trilha === 'a1').id"); pg.locator(f'[data-clip="{ida}"]').scroll_into_view_if_needed(); pg.wait_for_timeout(200); bb = pg.locator(f'[data-clip="{ida}"]').bounding_box()
        livre = pg.evaluate("(()=>{const e=document.querySelector('[data-clip=\"%s\"]'),r=e.getBoundingClientRect(),t=document.elementFromPoint(r.left+r.width/2,r.top+20);return !!(t&&t.closest('[data-clip]'))})()" % ida)
        ok(livre, "o clipe rolado até a tela não fica escondido atrás da prévia presa nem das abas de baixo")
        pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + 20); pg.mouse.down(); pg.mouse.move(bb["x"] + bb["width"] / 2 + 60, bb["y"] + 20, steps=4); pg.mouse.up(); pg.wait_for_timeout(200)
        ok(abs(pg.evaluate(f"__video.P().clips.find(c => c.id === '{ida}').ini") - 1) < 0.11, "arrastar o clipe de áudio 60 px = 1 s mais tarde")
        bb = pg.locator(f'[data-clip="{ida}"] .al.d').bounding_box()
        pg.mouse.move(bb["x"] + 6, bb["y"] + 20); pg.mouse.down(); pg.mouse.move(bb["x"] + 6 - 30, bb["y"] + 20, steps=4); pg.mouse.up(); pg.wait_for_timeout(200)
        ok(abs(pg.evaluate(f"__video.P().clips.find(c => c.id === '{ida}').dur") - 1.5) < 0.11, "puxar a alça da direita apara o clipe (2 s → 1,5 s)")
        pg.evaluate(f"__video.sel('{ida}')"); pg.wait_for_timeout(100)
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=vol]');e.value=50;e.dispatchEvent(new Event('input',{bubbles:true}))})()")
        ok(pg.evaluate(f"__video.P().clips.find(c => c.id === '{ida}').vol") == 50 and pg.locator('#vePropCorpo [data-p="fin"]').count() == 1, "AJUSTES do clipe: volume, entra/sai suave")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"sem estouro e sem erro de JS {erros}")
        # exportar de verdade: encurta para ~3 s (tira a imagem), toca e grava
        idi = pg.evaluate("__video.P().clips.find(c => c.tipo === 'imagem').id"); pg.evaluate(f"__video.sel('{idi}')"); pg.click("#veApagar"); pg.wait_for_timeout(200)
        tot = pg.evaluate("__video.total()")
        pg.click("#veExportar"); pg.wait_for_timeout(600)
        ok(pg.is_visible("#veOcup"), "EXPORTAR mostra o progresso com CANCELAR")
        pg.wait_for_function("window.__veSaida && window.__veSaida.bytes > 0", timeout=40000)
        b64 = pg.evaluate("(async()=>{const a=new Uint8Array(await __veSaida.blob.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)})()")
        arq = f"{TMP}/saida-{largura}." + ("mp4" if "mp4" in pg.evaluate("__veSaida.tipo") else "webm"); open(arq, "wb").write(base64.b64decode(b64))
        pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", arq], capture_output=True, text=True).stdout or "{}")
        tp = sorted(s["codec_type"] for s in pr.get("streams", []))
        dec = subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", arq, "-f", "null", "-"], capture_output=True, text=True)
        vol = subprocess.run(["ffmpeg", "-i", arq, "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
        mv = re.search(r"mean_volume: (-?[\d.]+)", vol); nq = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,width,height", "-of", "csv=p=0", arq], capture_output=True, text=True).stdout.strip()
        ok(tp == ["audio", "video"], f"o arquivo exportado tem vídeo E áudio {tp} ({os.path.getsize(arq)} bytes)")
        ok(nq.startswith("720,1280") and int(nq.split(",")[2] or 0) > tot * 12, f"vídeo 720×1280 com quadros de verdade ({nq}) para {tot:.1f} s")
        ok(mv and float(mv.group(1)) > -45 and dec.returncode == 0, f"o som do vídeo não está mudo (volume médio {mv.group(1) if mv else '?'} dB) e o arquivo decodifica inteiro")
        ok(pg.is_visible("#veSaida") and pg.get_attribute("#veBaixar", "download").startswith("video-brightway."), "mostra o vídeo pronto com SALVAR e COMPARTILHAR")
        pg.click("#veFecharSaida"); pg.wait_for_timeout(700)
        # recarregar: projeto e biblioteca voltam
        n_cl = pg.evaluate("__video.P().clips.length"); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        ok(pg.evaluate("__video.P().clips.length") == n_cl and pg.evaluate("Object.keys(__video.MID).length") >= 4, "recarregar: a linha do tempo e a biblioteca voltam (guardadas no aparelho)")
        ok(not FORA, f"nada saiu para a internet {FORA[:2]}")
        ok(not erros, f"nenhum erro de JS {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
