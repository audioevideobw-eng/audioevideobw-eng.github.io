"""PARADO = QUALIDADE TOTAL (23/11, dono): parado, a prévia vai para o tamanho real e lê o ORIGINAL; no play volta para a prévia leve + proxy.
Proxy FALSO de outra cor (original verde, "proxy" azul) para provar no pixel qual arquivo está na tela."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8921"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
COR = "(()=>{const c=document.getElementById('veCv'),x=c.getContext('2d'),d=x.getImageData(Math.round(c.width/2),Math.round(c.height/2),4,4).data;return [d[0],d[1],d[2]]})()"
TAM = "[document.getElementById('veCv').width,document.getElementById('veCv').height]"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm", f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[0].click()"); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{const P=__video.P();P.fmt='livre';P.w=2160;P.h=3840;__video.tamanhoReal(false)})()"); pg.wait_for_timeout(100)
    real = pg.evaluate("__video.tamReal()")
    pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(60); leve = pg.evaluate(TAM)
    ok(max(leve) <= 1280 and max(real) > 1280, f"mexendo, a prévia é leve ({leve} de {real})")
    pg.wait_for_timeout(1200)
    ok(pg.evaluate(TAM) == real and pg.evaluate("__video.NIT.on") and pg.locator("#veNit").is_visible(), f"parado ~0,5 s → tamanho real {pg.evaluate(TAM)} e selo QUALIDADE TOTAL")
    # proxy falso azul para o take verde
    pg.evaluate("""(()=>{const P=__video.P(),c=P.clips[0],ms=Object.values(__video.MID),az=ms.find(m=>m.id!==c.mid);__video.PX[c.mid]={url:az.url,w:320,h:180,bytes:1};
      Object.keys(__video.EL).forEach(k=>{try{__video.EL[k].e.pause();__video.EL[k].e.removeAttribute('src');__video.EL[k].e.load()}catch(e){};delete __video.EL[k]});__video.irPara(1.5)})()""")
    pg.wait_for_timeout(300); c1 = pg.evaluate(COR); ok(c1[2] > 150 and c1[1] < 120 and pg.evaluate(TAM) == leve, f"logo depois de mexer: proxy na tela (azul {c1}) e prévia leve")
    pg.wait_for_timeout(1500); c2 = pg.evaluate(COR); ok(c2[1] > 150 and c2[2] < 120 and pg.evaluate(TAM) == real, f"parado: ORIGINAL na tela (verde {c2}) no tamanho real")
    ok(pg.evaluate("Object.keys(__video.NIT.els).length") == 1, "um player do original aberto, só para o take da agulha")
    pg.evaluate("document.getElementById('vePlay').click()"); pg.wait_for_timeout(700); c3 = pg.evaluate(COR)
    ok(c3[2] > 150 and pg.evaluate(TAM) == leve and not pg.evaluate("__video.NIT.on") and pg.evaluate("Object.keys(__video.NIT.els).length") == 0 and not pg.locator("#veNit").is_visible(), f"play: volta o proxy e a prévia leve, player do original solto ({c3})")
    pg.evaluate("document.getElementById('vePlay').click()"); pg.wait_for_timeout(1600); c4 = pg.evaluate(COR)
    ok(c4[1] > 150 and pg.evaluate(TAM) == real, f"pausou de novo: qualidade total de volta ({c4})")
    # desligar a opção
    pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(300)
    if pg.locator("#veNitido").count():
        pg.locator("#veNitido").uncheck(); pg.wait_for_timeout(1300)
        ok(pg.evaluate(TAM) == leve and not pg.evaluate("__video.NIT.on"), "opção desligada: prévia sempre leve")
    else: ok(False, "opção 'Parado em qualidade total' no painel do projeto")
    ok(not er, "sem erro de JavaScript " + str(er[:2])); b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
