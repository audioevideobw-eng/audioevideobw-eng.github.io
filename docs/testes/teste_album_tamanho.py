"""ÁLBUM 3D — QUANTIDADE de fotos por modelo, cartão LIVRE e TAMANHO/ESTICAR X, Y, Z do modelo (24/11, dono). Pixel e contas. 1280 e 390."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_album.py")).read().split("SAIDA = tempfile")[0].replace("PORTA = 8873", "PORTA = 8932"))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ==="); cel = largura < 500
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + "album3d.html"); pg.wait_for_function("window.BWAlbumEditor", timeout=15000); pg.wait_for_timeout(700)
        if cel: pg.click('#alAbas [data-aba="aju"]'); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelectorAll('[data-seta].fechada').forEach(t=>t.click())"); pg.wait_for_timeout(200)
        P = "BWAlbumEditor.projeto()"
        n0 = pg.evaluate("BWAlbum.quantos(%s,0)" % P)
        ok(pg.locator("#alFotosN").count() == 1 and pg.locator("#alQtdAuto").count() == 1, f"AJUSTES DO MODELO: Quantidade de fotos ({n0} no modelo)")
        pg.evaluate("(()=>{const r=document.getElementById('alFotosN');r.value=r.min*1+2;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(300)
        q = pg.evaluate("BWAlbum.quantos(%s,0)" % P); mn = pg.evaluate("+document.getElementById('alFotosN').min")
        ok(q == mn + 2, f"fixar a quantidade muda os espaços do modelo ({q})")
        ok(pg.evaluate("BWAlbum.quantos(%s,1)" % P) == q, "com 1 foto e quantidade fixa, a foto se repete nos espaços")
        pg.locator("#alQtdAuto").click(); pg.wait_for_timeout(300)
        ok(pg.evaluate("BWAlbum.quantos(%s,0)" % P) == n0, "AUTOMÁTICO volta ao padrão do modelo")
        # cartão livre
        pg.locator('#alVisual [data-grupo="cartao"] [data-v="livre"]').click(); pg.wait_for_timeout(300)
        ok(pg.locator("#alCw").count() == 1, "cartão ✎ LIVRE mostra largura × altura")
        pg.fill("#alCw", "16"); pg.fill("#alCh", "4"); pg.wait_for_timeout(300)
        ok(pg.evaluate("[%s.cartaoW,%s.cartaoH]" % (P, P)) == [16, 4], "medida livre gravada (16 × 4)")
        # tamanho e esticar
        def area():
            return pg.evaluate("(()=>{const c=document.getElementById('alCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,f=[d[0],d[1],d[2]];let n=0;for(let i=0;i<d.length;i+=32){if(Math.abs(d[i]-f[0])+Math.abs(d[i+1]-f[1])+Math.abs(d[i+2]-f[2])>40)n++}return n})()")
        pg.evaluate("BWAlbumEditor.ver ? BWAlbumEditor.ver(1) : 0"); pg.wait_for_timeout(400); a1 = area()
        pg.evaluate("(()=>{const r=document.getElementById('alEscT');r.value=1.8;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(500); a2 = area()
        ok(a2 > a1 * 1.3, f"TAMANHO 180% aumenta o modelo na tela ({a1} → {a2})")
        ok(pg.locator("#alEscX").count() == 0, "proporcional ligado: sem barras X/Y/Z")
        pg.locator("#alEscProp").click(); pg.wait_for_timeout(300)
        ok(pg.locator("#alEscX").count() == 1 and pg.locator("#alEscY").count() == 1 and pg.locator("#alEscZ").count() == 1, "proporcional desligado: esticar X, Y e Z")
        pg.evaluate("(()=>{const r=document.getElementById('alEscY');r.value=0.4;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(500)
        e = pg.evaluate("BWAlbum.escala(%s)" % P); ok(abs(e["y"] - 0.72) < 0.01 and abs(e["x"] - 1.8) < 0.01, f"esticar só a altura (X {e['x']:.2f}, Y {e['y']:.2f})")
        pg.locator("#alEscZero").click(); pg.wait_for_timeout(300)
        e = pg.evaluate("BWAlbum.escala(%s)" % P); ok(e["x"] == 1 and e["y"] == 1 and e["z"] == 1, "↺ TAMANHO ORIGINAL")
        ok(not erros, "sem erro de JavaScript " + str(erros[:2])); ok(pg.evaluate(SEM) <= 0, "sem estouro")
        ctx.close()
    b.close()
print("✅ 0 falhas" if not falhas else "❌ %d falha(s)" % len(falhas)); sys.exit(1 if falhas else 0)
