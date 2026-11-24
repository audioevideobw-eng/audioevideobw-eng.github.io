"""◆ MOTIONS do BW REELS PRO no editor de vídeo (24/11): aba com as 5 categorias, cada motion desenha sem erro no canvas, tocar põe na agulha,
textos mudam em AJUSTES e a prévia muda, desenho leve (tempo por quadro medido). 1280 e 390."""
import sys, os, time
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8934"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
CL = "__video.P().clips"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for larg, alt in ((1280, 800), (390, 844)):
        print(f"\n=== {larg}px ==="); cel = larg < 500
        ctx = b.new_context(viewport={"width": larg, "height": alt}, has_touch=cel, is_mobile=cel, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html" + ("" if cel else "")); pg.wait_for_function("window.__veProntoOk === true && window.BWMotionsVE", timeout=15000); pg.wait_for_timeout(600)
        n = pg.evaluate("BWMotionsVE.LISTA.length"); cats = pg.evaluate("BWMotionsVE.CATS.map(c=>BWMotionsVE.LISTA.filter(m=>m.cat===c[0]).length)")
        ok(n >= 25 and all(q >= 3 for q in cats), f"{n} motions em 5 categorias {cats}")
        res = pg.evaluate("""(()=>{const c=document.createElement('canvas');c.width=540;c.height=960;const x=c.getContext('2d'),r=[];let ms=0,q=0;
          BWMotionsVE.LISTA.forEach(m=>{let errou='';const ori=console.error;[0.3,1,2,m.dur-0.1].forEach(t=>{x.fillStyle='#000';x.fillRect(0,0,540,960);const t0=performance.now();BWMotionsVE.desenhar(x,m.id,540,960,270,480,1,t,m.dur,null,'#FFC24A');ms+=performance.now()-t0;q++;});
            const d=x.getImageData(0,0,540,960).data;let px=0;for(let i=0;i<d.length;i+=64)if(d[i]+d[i+1]+d[i+2]>60)px++;if(px<20)r.push(m.id)});return {vazios:r,ms:ms/q}})()""")
        ok(not res["vazios"], f"todos desenham algo na tela (vazios: {res['vazios']})")
        ok(res["ms"] < 12, f"leve: {res['ms']:.2f} ms por quadro em média (540×960)")
        if cel: pg.evaluate("VEApp && VEApp.abrirFolha ? 0 : 0")
        pg.evaluate("document.querySelector('#veAbas [data-aba=\"motion\"]').click()"); pg.wait_for_timeout(500)
        ok(pg.locator('#veLib [data-arr^="l:mo:"]').count() == n, "aba ◆ MOTIONS lista todos com miniatura")
        pg.evaluate("__video.irPara(1)"); pg.evaluate("document.querySelector('#veLib [data-arr=\"l:mo:numero\"]').click()"); pg.wait_for_timeout(500)
        c = pg.evaluate(f"{CL}[{CL}.length-1]"); ok(c["el"] == "mo:numero" and abs(c["ini"] - pg.evaluate("0")) < 0.05 and c["mo"]["v"] == "1.500", f"NÚMERO CONTANDO na agulha (projeto vazio = 0 s: {c['ini']})")
        pg.evaluate(f"__video.sel('{c['id']}')"); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelectorAll('#vePropCorpo [data-seta].fechada').forEach(t=>t.click())")
        ok(pg.locator('#vePropCorpo [data-mo="v"]').count() == 1 and pg.locator('#vePropCorpo [data-mo="rot"]').count() == 1, "AJUSTES mostra os campos do motion")
        pg.evaluate("__video.irPara(2.2)"); pg.wait_for_timeout(400)
        def soma(): return pg.evaluate("(()=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=16)s+=d[i]*3+d[i+1]*7+d[i+2]*11;return s})()")
        s1 = soma()
        pg.evaluate("(()=>{const i=document.querySelector('#vePropCorpo [data-mo=\"v\"]');i.value='987.654';i.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{CL}[{CL}.length-1].mo.v") == "987.654" and soma() != s1, "trocar o número muda a prévia")
        pg.evaluate("__video.irPara(0.2)"); pg.evaluate("document.querySelector('#veLib [data-arr=\"l:mo:nomecargo\"]') ? 0 : 0")
        pg.evaluate("document.querySelector('#veAbas [data-aba=\"motion\"]').click()"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelector('#veLib [data-arr=\"l:mo:nomecargo\"]').click()"); pg.wait_for_timeout(400)
        c2 = pg.evaluate(f"{CL}[{CL}.length-1]"); ok(c2["el"] == "mo:nomecargo" and c2["y"] > 10, "NOME E CARGO nasce no terço de baixo")
        ok(not er, "sem erro de JavaScript " + str(er[:2])); ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro")
        if not cel: pg.screenshot(path="/tmp/vmo.png")
        ctx.close()
    b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
