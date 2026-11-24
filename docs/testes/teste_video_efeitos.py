"""✦ CONTROLE DE EFEITOS do editor de vídeo (23/11, dono): modelos dinâmicos, várias camadas de efeito, força que muda no tempo
(entra, sai, cresce, pulsa) e ◆ chaves; conferido no PIXEL da prévia em pontos diferentes do take. PC 1280 e celular 390 (folha)."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8919"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
CL = "__video.P().clips"
COR = "(()=>{const c=document.getElementById('veCv'),x=c.getContext('2d'),w=c.width,h=c.height,d=x.getImageData(Math.round(w*0.4),Math.round(h*0.4),Math.round(w*0.2),Math.round(h*0.2)).data;let r=0,g=0,b=0,n=d.length/4;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2]}return [r/n,g/n,b/n]})()"
def sat(c): return max(c) - min(c)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm", f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    for k in range(2): pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[%d].click()" % k); pg.wait_for_timeout(300)
    pg.evaluate(f"__video.irPara(0.2)"); pg.locator(f'[data-clip]').first.click(); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#vePropCorpo [data-seta]').forEach(t=>{if(t.classList.contains('fechada'))t.click()})"); pg.wait_for_timeout(200)
    ok(pg.locator('#vePropCorpo [data-g="efeito"] h4').inner_text().strip().upper().endswith("CONTROLE DE EFEITOS") and pg.locator("#vePropCorpo [data-fxmod]").count() >= 12, "aba ✦ CONTROLE DE EFEITOS com os modelos dinâmicos")
    m0 = pg.evaluate(COR)
    pg.locator('#vePropCorpo [data-fxmod]', has_text="Do P&B ao vivo").click(); pg.wait_for_timeout(300)
    L = pg.evaluate(f"{CL}[0].efs"); ok(pg.evaluate(f"{CL}[0].efeito") == "pb" and len(L) == 2 and L[1]["k"] == "vivido", f"modelo 'Do P&B ao vivo' cria 2 camadas (P&B e vívido) {L}")
    ok(pg.locator("#vePropCorpo .ve-fxl").count() == 2 and pg.locator("#vePropCorpo .ve-fxc polyline").count() == 2, "cada camada mostra a curva da força no take")
    pg.evaluate("__video.irPara(0.1)"); pg.wait_for_timeout(500); c1 = pg.evaluate(COR)
    pg.evaluate(f"__video.irPara({CL}[0].dur-0.1)"); pg.wait_for_timeout(500); c2 = pg.evaluate(COR)
    ok(sat(c1) < 20 and sat(m0) > 60, f"no começo do take a imagem está sem cor ({[round(x) for x in c1]} × original {[round(x) for x in m0]})")
    ok(sat(c2) > sat(m0) * 1.05, f"no fim a cor está mais forte que a original ({[round(x) for x in c2]})")
    # movimento de uma camada
    pg.locator("#vePropCorpo .ve-fxl").nth(1).locator('[data-fxp="modo"]').select_option("pulsar"); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"{CL}[0].efs[1].modo") == "pulsar" and pg.locator("#vePropCorpo .ve-fxl").nth(1).locator('[data-fxp="dur"]').count() == 1, "trocar o movimento para Pulsa mostra o Ritmo")
    pg.locator("#vePropCorpo .ve-fxl").nth(0).locator('[data-fxa="tirar"]').click(); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"{CL}[0].efeito") == "vivido" and len(pg.evaluate(f"{CL}[0].efs")) == 1, "tirar a 1ª camada deixa a outra no lugar")
    # chaves
    pg.locator("#vePropCorpo .ve-fxl").nth(0).locator('[data-fxp="modo"]').select_option("chaves"); pg.wait_for_timeout(250)
    ok(len(pg.evaluate(f"{CL}[0].efs[0].chaves")) == 2, "◆ Chaves já nasce com duas chaves (começo e fim)")
    pg.evaluate("__video.irPara(2)"); pg.wait_for_timeout(200)
    fl = pg.locator("#vePropCorpo .ve-fxl").nth(0); fl.locator('[data-fxp="int"]').fill("30"); pg.wait_for_timeout(150); fl.locator('[data-fxa="chave"]').click(); pg.wait_for_timeout(250)
    ch = pg.evaluate(f"{CL}[0].efs[0].chaves"); ok(any(abs(q["t"] - 2) < 0.06 and q["v"] == 30 for q in ch), f"◆ CHAVE NA AGULHA grava 30% em 2 s {ch}")
    pg.locator('#vePropCorpo [data-fxk]').first.fill("55"); pg.locator('#vePropCorpo [data-fxk]').first.dispatch_event("change"); pg.wait_for_timeout(250)
    ok(sorted(pg.evaluate(f"{CL}[0].efs[0].chaves"), key=lambda q: q["t"])[0]["v"] == 55, "mudar o número de uma chave muda a força dela")
    pg.locator('#vePropCorpo [data-fxa="somar"]').click(); pg.wait_for_timeout(250); ok(len(pg.evaluate(f"{CL}[0].efs")) == 2, "＋ SOMAR UM EFEITO cria outra camada")
    pg.locator('#vePropCorpo [data-fxa="todos"]').click(); pg.wait_for_timeout(250)
    ok(pg.evaluate(f"{CL}[1].efeito") == pg.evaluate(f"{CL}[0].efeito") and len(pg.evaluate(f"{CL}[1].efs")) == 2, "⇉ EM TODOS OS TAKES copia as camadas")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(not pg.evaluate(f"{CL}[1].efs"), "desfazer volta o outro take ao que era")
    ok(not er, "sem erro de JavaScript " + str(er[:2])); ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro em 1280")
    pg.screenshot(path="/tmp/fx_pc.png", clip={"x": 900, "y": 60, "width": 380, "height": 740}); ctx.close()
    # celular: a folha Efeitos
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(800)
    pg.set_input_files("#vaArq", [f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=20000); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(500); pg.evaluate("__video.sel(__video.P().clips[0].id)"); pg.wait_for_timeout(400)
    pg.evaluate("[...document.querySelectorAll('#vaFaixa button')].find(b=>/Efeitos/.test(b.textContent)).click()"); pg.wait_for_timeout(500)
    ok(pg.locator("#vaSheet [data-fxmod]").first.is_visible(), "no celular a folha Efeitos mostra o controle de efeitos")
    pg.locator("#vaSheet [data-fxmod]").first.tap(); pg.wait_for_timeout(300); ok(pg.evaluate(f"{CL}[0].efeito") == "pb", "tocar num modelo aplica no celular")
    ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0 and not er, "sem estouro nem erro em 390 " + str(er[:1]))
    pg.screenshot(path="/tmp/fx_cel.png"); b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
