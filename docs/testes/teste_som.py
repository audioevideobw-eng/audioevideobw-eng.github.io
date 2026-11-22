#!/usr/bin/env python3
"""Teste local do TRATAMENTO DE ÁUDIO do EDITOR DE VÍDEO (21/11, etapa 3).
Som de teste = zumbido de 50 Hz + tom de 1 kHz baixinho. Confere: volume em dB (−6 dB = 50%), forma de onda nos takes de som e de vídeo,
NORMALIZAR (ganho calculado no aparelho, sem estourar), REDUZIR RUÍDO e REALÇAR VOZ mudam o SOM DO ARQUIVO EXPORTADO (ffmpeg mede o
zumbido e o tom), EXTRAIR ÁUDIO (o vídeo fica mudo e nasce um take de som igual), menu do take, copiar/colar ajustes leva o som,
recarregar mantém, nada sai do aparelho. 1280 e 390 px.   Uso (na raiz): python3 docs/testes/teste_som.py"""
import base64, http.server, os, re, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_som"; PORTA = 8864
os.makedirs(TMP, exist_ok=True)
if not os.path.exists(f"{TMP}/zumbido.wav"):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "aevalsrc=0.03*sin(2*PI*50*t)+0.03*sin(2*PI*1000*t):s=48000:d=3", f"{TMP}/zumbido.wav"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=660:duration=3",
                    "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libvorbis", f"{TMP}/clipe.webm"], check=True)
    from PIL import Image; Image.new("RGB", (720, 1280), (40, 40, 60)).save(f"{TMP}/fundo.png")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
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
def nivel(arq, filtro):
    r = subprocess.run(["ffmpeg", "-i", arq, "-vn", "-af", filtro + ",volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"mean_volume: (-?[\d.]+)", r); return float(m.group(1)) if m else -99
def exportar(pg, nome):
    pg.click("#veExportar"); pg.wait_for_selector("#veSaida:not([hidden])", timeout=40000)
    d = pg.evaluate("(async()=>{const b=window.__veSaida.blob;const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return [btoa(s),window.__veSaida.nome]})()")
    arq = f"{TMP}/{nome}." + d[1].split(".")[-1]; open(arq, "wb").write(base64.b64decode(d[0]))
    pg.evaluate("document.getElementById('veSaida').hidden=true"); return arq
SOM = "__video.P().clips.find(c=>c.tipo==='audio'&&c.trilha==='a1')"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        pg.set_input_files("#veArq", [f"{TMP}/fundo.png", f"{TMP}/zumbido.wav", f"{TMP}/clipe.webm"]); pg.wait_for_function("Object.keys(__video.MID).length === 3", timeout=15000); pg.wait_for_timeout(300)
        for n in ("fundo", "zumbido"):
            pg.evaluate("document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.nome.indexOf('" + n + "')>=0).id + '\"]').click()"); pg.wait_for_timeout(250)
        pg.evaluate(f"(()=>{{const P=__video.P();P.clips.forEach(c=>{{c.ini=0;c.dur=1.6}});__video.sel({SOM}.id)}})()"); pg.wait_for_timeout(400)
        pg.wait_for_function("!!document.querySelector('#veFaixas .ve-clip .onda')", timeout=8000)
        ok(pg.evaluate("getComputedStyle(document.querySelector('#veFaixas .ve-clip .onda')).backgroundImage.indexOf('data:image/png')>=0"), "o take de som mostra a FORMA DE ONDA (desenhada no aparelho)")
        if not pg.locator('#vePropCorpo [data-p="volDb"]').is_visible(): pg.locator('#vePropCorpo h4[data-seta="ve-som"]').click(); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"volDb\"]');e.value=-6;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(200)
        ok(pg.evaluate(SOM + ".vol") == 50 and "-6 dB" in pg.inner_text('#vePropCorpo [data-p="volDb"] + output'), "VOLUME em dB: −6 dB = metade (50%)")
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"volDb\"]');e.value=-40;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(150)
        ok(pg.evaluate(SOM + ".vol") == 0 and "mudo" in pg.inner_text('#vePropCorpo [data-p="volDb"] + output'), "no fim da barra fica MUDO")
        pg.locator('#vePropCorpo [data-acao="mudo"]').click(); pg.wait_for_timeout(200); ok(pg.evaluate(SOM + ".vol") == 100, "🔈 DEVOLVER O SOM volta a 100%")
        pg.locator('#vePropCorpo [data-acao="normalizar"]').click(); pg.wait_for_function(SOM + ".normG > 0", timeout=10000)
        ng = pg.evaluate(SOM + ".normG"); esperado = (10 ** (-16 / 20)) / (0.03 * (2 ** 0.5) / (2 ** 0.5) * 1.0)  # rms do sinal = 0.03 (dois senos de 0.03)
        ok(abs(ng - esperado) / esperado < 0.15, f"🔊 NORMALIZAR calcula o ganho no aparelho ({ng:.2f}×, esperado ≈ {esperado:.2f}×)")
        ok("✓" in pg.inner_text('#vePropCorpo [data-acao="normalizar"]'), "o botão NORMALIZAR fica marcado")
        if largura > 500:
            pg.evaluate(f"(()=>{{const c={SOM};delete c.normG;c.ruido=0;c.voz=0;__video.sel(null)}})()"); pg.wait_for_timeout(300)
            a0 = exportar(pg, "cru"); z0, t0 = nivel(a0, "lowpass=f=120"), nivel(a0, "highpass=f=500")
            pg.evaluate(f"(()=>{{const c={SOM};c.ruido=3;c.normG={ng};__video.sel(null)}})()"); pg.wait_for_timeout(300)
            a1 = exportar(pg, "tratado"); z1, t1 = nivel(a1, "lowpass=f=120"), nivel(a1, "highpass=f=500")
            ok(t0 > -60 and (t1 - z1) - (t0 - z0) > 12, f"REDUZIR RUÍDO forte tira o zumbido no ARQUIVO exportado (tom − zumbido: {t0 - z0:.1f} → {t1 - z1:.1f} dB)")
            ok(t1 > t0 + 10, f"NORMALIZAR sobe o volume no arquivo exportado (tom {t0:.1f} → {t1:.1f} dB)")
            pk = re.search(r"max_volume: (-?[\d.]+)", subprocess.run(["ffmpeg", "-i", a1, "-vn", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr)
            ok(pk and float(pk.group(1)) <= 0.0, f"e não estoura (pico {pk.group(1) if pk else '?'} dBFS)")
        # REALÇAR VOZ
        pg.evaluate(f"__video.sel({SOM}.id)"); pg.wait_for_timeout(200)
        if not pg.locator('#vePropCorpo [data-voz="1"]').is_visible(): pg.locator('#vePropCorpo h4[data-seta="ve-som"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vePropCorpo [data-voz="1"]').click(); pg.wait_for_timeout(200); ok(pg.evaluate(SOM + ".voz") == 1, "REALÇAR VOZ liga")
        pg.locator('#vePropCorpo [data-ruido="2"]').click(); pg.wait_for_timeout(200); ok(pg.evaluate(SOM + ".ruido") == 2, "REDUZIR RUÍDO médio")
        # EXTRAIR ÁUDIO de um vídeo
        pg.evaluate("document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.tipo==='video').id + '\"]').click()"); pg.wait_for_timeout(300)
        vid = pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').id"); pg.evaluate(f"__video.sel('{vid}')"); pg.wait_for_timeout(300)
        pg.wait_for_function("!!document.querySelector('#veFaixas .ve-clip .onda.v')", timeout=8000); ok(True, "o take de vídeo também mostra a forma de onda (faixa embaixo)")
        if not pg.locator('#vePropCorpo [data-acao="extrair"]').is_visible(): pg.locator('#vePropCorpo h4[data-seta="ve-som"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vePropCorpo [data-acao="extrair"]').click(); pg.wait_for_timeout(300)
        ex = pg.evaluate(f"(()=>{{const P=__video.P(),v=P.clips.find(c=>c.id==='{vid}'),a=P.clips.filter(c=>c.tipo==='audio'&&c.mid===v.mid);return [v.vol,a.length,a[0]&&a[0].ini===v.ini&&a[0].dur===v.dur&&a[0].corte===(v.corte||0),a[0]&&a[0].trilha]}})()")
        ok(ex[0] == 0 and ex[1] == 1 and ex[2] and ex[3] in ("a1", "a2"), f"🎵 EXTRAIR ÁUDIO: o vídeo fica mudo e nasce um take de som no mesmo trecho (camada {ex[3]})")
        EXT = f"__video.P().clips.find(c=>c.tipo==='audio'&&c.mid===__video.P().clips.find(v=>v.id==='{vid}').mid)"
        # menu do take de som
        if largura > 500:
            sid = pg.evaluate(SOM + ".id"); pg.locator(f'[data-clip="{sid}"]').click(button="right", position={"x": 30, "y": 20}); pg.wait_for_timeout(300)
            pg.locator(".bwf-menu button", has_text="Som do take").click(); pg.wait_for_timeout(300); mt = pg.inner_text(".bwf-menu").lower()
            ok("normalizar" in mt and "reduzir ruído" in mt and "realçar voz" in mt, "botão direito › Som do take: normalizar, reduzir ruído, realçar voz"); pg.keyboard.press("Escape"); pg.keyboard.press("Escape")
        # copiar/colar ajustes leva o tratamento do som
        pg.evaluate(f"__video.sel({SOM}.id)"); pg.keyboard.press("Control+Shift+C")
        aid = pg.evaluate(EXT + ".id"); pg.evaluate(f"__video.sel('{aid}')"); pg.keyboard.press("Control+Shift+V"); pg.wait_for_timeout(250)
        cp = pg.evaluate("(()=>{const c=" + EXT + ";return [c.ruido,c.voz]})()"); ok(cp == [2, 1], f"copiar/colar ajustes leva o tratamento do som {cp}")
        pg.wait_for_timeout(600); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        ok(pg.evaluate("(()=>{const c=" + EXT + ";return c.ruido===2&&c.voz===1})()"), "recarregou: o tratamento do som continua no projeto")
        ok(not erros, f"0 erros de JS {erros[:2]}"); ok(not FORA, f"nada saiu do aparelho {FORA[:2]}")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem estouro na largura")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
