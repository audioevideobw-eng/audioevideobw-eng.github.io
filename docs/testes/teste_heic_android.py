#!/usr/bin/env python3
"""Teste local (28/11/2026, dono, app Android: "não abre a foto HEIC" + "o Assistente, quando clicado, fecha o app").
1) foto HEIC DE VERDADE (feita aqui com pillow-heif) no editor de vídeo: o Chromium não abre HEIC → vira JPEG no aparelho (biblioteca heic-to
   servida de cópia local, com o MESMO selo de integridade), entra sem ⚠, com o tamanho certo, e a cor certa aparece na prévia;
   ↻ reabrir a página traz a foto já convertida (não converte de novo). Também: editor de fotos, Telas e Álbum 3D abrem a mesma foto.
2) app Android (user agent BW-Android): o reconhecimento de voz do navegador some ANTES do assistente olhar; tocar no robô abre o painel e
   usa a gravação (não o webkitSpeechRecognition); a voz do Android (BWFalaNativa SIMULADA) vira speechSynthesis e o assistente fala por ela.
Uso (na raiz): python3 docs/testes/teste_heic_android.py"""
import json, os, subprocess
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8875"))
LIB = "/tmp/heic/package/dist/iife/heic-to.js"
if not os.path.exists(LIB):
    os.makedirs("/tmp/heic", exist_ok=True)
    subprocess.run("cd /tmp/heic && npm pack heic-to@1.6.7 >/dev/null && tar xzf heic-to-1.6.7.tgz", shell=True, check=True)
HEIC = "/tmp/heic/IMG_3685.HEIC"
if not os.path.exists(HEIC):
    subprocess.run(["python3", "-c", """
import pillow_heif; from PIL import Image
pillow_heif.register_heif_opener()
im = Image.new('RGB', (640, 480), (20, 200, 60))
for x in range(160, 480):
    for y in range(120, 360): im.putpixel((x, y), (230, 40, 40))
im.save('%s', format='HEIF', quality=92)""" % HEIC], check=True)
pedidos = []
def rota2(r):
    u = r.request.url
    if "heic-to@1.6.7" in u: pedidos.append(u); return r.fulfill(path=LIB, content_type="application/javascript", headers={"Access-Control-Allow-Origin": "*"})
    return rota(r)
FALA = """Object.defineProperty(window,"speechSynthesis",{value:undefined,configurable:true,writable:true});window.__falou=[];window.BWFalaNativa={pronto:()=>true,
 vozes:()=>JSON.stringify([{n:'pt-br-x-afs-local',l:'pt-BR',r:false},{n:'pt-br-x-ptd-local',l:'pt-BR',r:false}]),
 falar:(id,t,v,tom,voz)=>{__falou.push([t,voz]);setTimeout(()=>__bwFala('i',id),20);setTimeout(()=>__bwFala('e',id),80)},
 parar:()=>{}, falando:()=>false};"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required", "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px · editor de vídeo ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.route("**/*", rota2)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        ok(pg.evaluate("window.BWHeic && typeof BWHeic.converterSePreciso") == "function", "BWHeic carregado na página")
        ok(not pg.evaluate("window.HeicTo"), "…a biblioteca NÃO é baixada antes de aparecer uma foto HEIC")
        pg.set_input_files("#veArq", [HEIC]); pg.wait_for_function("Object.values(__video.MID).some(m=>/IMG_3685/.test(m.nome))", timeout=60000); pg.wait_for_timeout(800)
        m = pg.evaluate("(()=>{var m=Object.values(__video.MID).find(m=>/IMG_3685/.test(m.nome));return {nome:m.nome,ruim:!!m.ruim,w:m.img&&m.img.naturalWidth,h:m.img&&m.img.naturalHeight,tipo:m.blob.type,tam:m.blob.size}})()")
        ok(not m["ruim"] and m["w"] == 640 and m["h"] == 480, f"1) a foto HEIC abriu (convertida no aparelho): {m}")
        ok(m["tipo"] == "image/jpeg" and m["nome"].lower().endswith(".jpg"), "…virou JPEG (o nome acompanha)")
        ok(len(pedidos) >= 1 and all("dist/iife/heic-to.js" in u for u in pedidos), f"…biblioteca baixada só agora, do endereço fixo ({len(pedidos)} pedido)")
        pg.locator('#veLib [data-mid]', has_text="IMG_3685").first.click() if not cel else None
        if cel:
            pg.locator("#vaAdd").tap(); pg.wait_for_timeout(500); pg.locator('#veLib [data-mid]', has_text="IMG_3685").first.tap()
        pg.wait_for_timeout(600)
        ok(pg.evaluate(f"{CL}.length") == 1, "…tocar na foto põe na linha do tempo")
        av = pg.evaluate("document.querySelector('#bwAviso') ? document.querySelector('#bwAviso').innerText : ''")
        ok("não abre" not in av, f"…sem o aviso de 'não abre' ({av[:60]})")
        pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(900)
        cor = pg.evaluate("""(()=>{var c=document.querySelector('#veCv');var x=c.getContext('2d');var d=x.getImageData(c.width/2|0,c.height/2|0,1,1).data;return [d[0],d[1],d[2]]})()""")
        ok(cor[0] > 170 and cor[1] < 110, f"…e a prévia mostra a foto (vermelho no centro: {cor})")
        n0 = len(pedidos)
        pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(1500)
        m2 = pg.evaluate("(()=>{var m=Object.values(__video.MID).find(m=>/IMG_3685/.test(m.nome));return m?{ruim:!!m.ruim,tipo:m.blob.type}:null})()")
        ok(m2 and not m2["ruim"] and m2["tipo"] == "image/jpeg" and len(pedidos) == n0, f"…reabrir: guardada já convertida, sem converter de novo ({m2})")
        ok(not er, f"0 erros de JS {er[:2]}")
        ctx.close()
    # outras ferramentas
    print("\n=== editor de fotos, Telas e Álbum 3D (1280) ===")
    for pag, inp, cond in (("fotos.html", "#arquivos", "document.querySelectorAll('.f-mini,.fi-mini,[data-foto],.ft-mini').length>0 || (window.__fotos && __fotos.fotos && __fotos.fotos.length>0)"),
                           ("telas.html", "#tlArq", "document.querySelector('#tlArq') && document.body.innerText.indexOf('IMG_3685')>=0"),
                           ("album3d.html", "#alArq", "document.body.innerText.indexOf('IMG_3685')>=0")):
        ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); ctx.route("**/*", rota2)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.goto(BASE + pag); pg.wait_for_timeout(2000)
        pg.set_input_files(inp, [HEIC]); pg.wait_for_timeout(6000)
        txt = pg.inner_text("body")
        falhou = "Não deu para abrir" in txt or "não abr" in txt.lower() and "IMG_3685" in txt
        ruim = pg.evaluate("document.querySelectorAll('.ruim').length")
        img = pg.evaluate("[...document.images].filter(i=>i.naturalWidth>0&&/^blob:|^data:/.test(i.src)).length")
        ok(not falhou and ruim == 0 and (img > 0 or pg.evaluate("document.querySelectorAll('canvas').length") > 0), f"{pag}: a foto HEIC entrou (miniaturas {img}, marcadas ruins {ruim})")
        ok(not er, f"{pag}: 0 erros de JS {er[:2]}")
        ctx.close()
    # app Android
    print("\n=== app Android (BW-Android) · assistente ===")
    ctx = b.new_context(user_agent="Mozilla/5.0 (Linux; Android 14; wv) Chrome/140 Mobile BW-Android/1.0", viewport={"width": 390, "height": 844}, service_workers="block", has_touch=True)
    ctx.route("**/*", rota2); ctx.grant_permissions(["microphone"], origin=BASE.rstrip("/"))
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.add_init_script(FALA)
    pg.goto(BASE + "negocio.html"); pg.wait_for_timeout(2500)
    ok(pg.evaluate("!window.SpeechRecognition && !window.webkitSpeechRecognition"), "2) no app, o reconhecimento de voz do navegador sumiu antes das ferramentas")
    ok(pg.evaluate("!!window.speechSynthesis && speechSynthesis.getVoices().length===2 && typeof SpeechSynthesisUtterance==='function'"), "…a voz do Android virou speechSynthesis (2 vozes pt)")
    fab = pg.locator(".bwg-fab, #bwgFab, [data-bwg-fab]").first
    if not fab.count(): fab = pg.locator("button[aria-label*='ssistente']").first
    fab.tap(); pg.wait_for_timeout(1500)
    ok(pg.evaluate("!!document.querySelector('.bwg-p:not([hidden])')"), "…tocar no robô abre o painel do assistente (sem derrubar a página)")
    st = pg.evaluate("(document.querySelector('.bwg-st')||{}).innerText||''")
    ok("Gravando" in st or "entre na sua conta" in st or "Ouvindo" in st or "microfone" in st, f"…e vai pela gravação, não pelo reconhecimento do WebView ({st[:70]})")
    pg.evaluate("BWAgente.processar('me conta uma piada')"); pg.wait_for_timeout(4000)
    falou = pg.evaluate("window.__falou")
    ok(len(falou) >= 1 and falou[0][0], f"…e o assistente FALA pela voz do Android ({falou[:1]})")
    ok(any("ptd" in (v or "") for _, v in falou), f"…com a voz masculina do Android (x-ptd) quando é o robô ({[v for _, v in falou][:2]})")
    ok(not er, f"0 erros de JS {er[:2]}")
    ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
