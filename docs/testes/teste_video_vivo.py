"""PRÉVIAS VIVAS no editor de vídeo (24/11, dono: "telas verdes rodando o efeito… em todas… dê vida… efeitos IA de textos com pessoas"):
cada cartão da biblioteca (Texto, Motions, Elementos, Telas, Efeitos, Transições) e dos ajustes (movimento do texto, PESSOA E FUNDO, modelos de efeito)
é um canvas que ANIMA, desenhado pelo mesmo código do vídeo. Confere: o canvas existe, muda entre dois instantes, só anima o que está na tela, 0 erros.
Fotos das abas em /tmp/vivo_*.png. PC 1280 e celular 390."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8936"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
ASSINA = """(sel)=>[...document.querySelectorAll(sel)].filter(c=>{const r=c.getBoundingClientRect();return r.width>0&&r.bottom>0&&r.top<innerHeight}).slice(0,6).map(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s=0;for(let i=0;i<d.length;i+=37)s=(s*31+d[i])%1000000007;return s})"""
def vivo(pg, sel, nome, foto):
    pg.wait_for_timeout(500); a = pg.evaluate(ASSINA, sel); pg.wait_for_timeout(700); b = pg.evaluate(ASSINA, sel)
    mud = sum(1 for x, y in zip(a, b) if x != y)
    ok(len(a) >= 1 and mud >= max(1, len(a) // 2), f"{nome}: {len(a)} prévias na tela, {mud} mudaram (animando)")
    if foto: pg.locator(foto).first.screenshot(path=f"/tmp/vivo_{nome.split()[0].lower()}.png")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"— {larg} px")
        ctx = b.new_context(viewport={"width": larg, "height": 800 if larg > 400 else 844}, service_workers="block", has_touch=larg < 400); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html" + ("" if larg > 400 else "?layout=classico")); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        for aba, nome, sel in [("trans", "Transições", "#veLib canvas[data-vivo^='tr:']"), ("efe", "Efeitos", "#veLib canvas[data-vivo^='ef:']"), ("telas", "Telas", "#veLib canvas[data-vivo^='tl:']"),
                               ("texto", "Texto", "#veLib canvas[data-vivo^='tx:']"), ("motion", "Motions", "#veLib canvas[data-vivo^='mo:']"), ("elem", "Elementos", "#veLib canvas[data-vivo^='el:']")]:
            pg.click(f'#veAbas [data-aba="{aba}"]'); pg.evaluate("document.getElementById('veLib').scrollTop=0")
            vivo(pg, sel, nome, "#veLib" if larg > 400 else None)
        n = pg.evaluate("__veVivo.ativos()"); tot = pg.locator("#veLib canvas[data-vivo]").count()
        ok(n < tot, f"leve: anima só o que está na tela ({n} de {tot} prévias)")
        pg.click('#veAbas [data-aba="telas"]'); pg.wait_for_timeout(300)
        ok(pg.locator("#veLib canvas[data-vivo^='dv:']").count() == 6 and pg.locator("#veLib canvas[data-vivo^='pk:']").count() >= 4, "Telas: divisões e pacotes também com prévia viva")
        # texto: movimento em cartões + relação com a pessoa
        pg.click('#veAbas [data-aba="texto"]'); pg.wait_for_timeout(200); pg.locator('#veLib [data-texto="titulo"]').click(); pg.wait_for_timeout(400)
        ok(pg.locator("#vePropCorpo [data-animapick]").count() == 8 and pg.locator("#vePropCorpo [data-frente] canvas").count() == 2, "texto: 8 movimentos e ATRÁS/NA FRENTE da pessoa em cartões vivos")
        pg.locator('#vePropCorpo [data-animapick="anel"]').scroll_into_view_if_needed(); pg.locator('#vePropCorpo [data-animapick="anel"]').click(); pg.wait_for_timeout(300)
        c = pg.evaluate("__video.P().clips.slice(-1)[0]"); ok(c["anima"] == "anel", "tocar no cartão ANEL troca o movimento do texto")
        pg.locator('#vePropCorpo [data-animapick]').first.scroll_into_view_if_needed(); vivo(pg, "#vePropCorpo canvas[data-vivo^='an:'],#vePropCorpo canvas[data-vivo^='ia:t=']", "Movimento", "#vePropCorpo [data-g='texto']" if larg > 400 else None)
        ok(not er, f"sem erros de JS {er[:2]}")
        ctx.close()
    # pessoa e fundo (IA) e modelos de efeito, com um take de imagem
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(400)
    if pg.locator("#vePropCorpo [data-g='ia'] h4").count():
        h4 = pg.locator("#vePropCorpo [data-g='ia'] h4"); h4.scroll_into_view_if_needed()
        if not pg.locator("#vePropCorpo canvas[data-vivo='ia:demo']").is_visible(): h4.click(); pg.wait_for_timeout(300)
        pg.locator("#vePropCorpo canvas[data-vivo='ia:demo']").scroll_into_view_if_needed()
        vivo(pg, "#vePropCorpo canvas[data-vivo='ia:demo']", "IA-pessoa", "#vePropCorpo [data-g='ia']")
    h4 = pg.locator("#vePropCorpo [data-g='efeito'] h4"); h4.scroll_into_view_if_needed()
    if not pg.locator("#vePropCorpo [data-fxmod] canvas").first.is_visible(): h4.click(); pg.wait_for_timeout(300)
    pg.locator("#vePropCorpo [data-fxmod] canvas").first.scroll_into_view_if_needed()
    vivo(pg, "#vePropCorpo canvas[data-vivo^='fm:']", "Modelos-de-efeito", "#vePropCorpo .ve-fxm")
    # ⟲ REMOVER ATRIBUTOS no menu do botão direito
    c0 = pg.evaluate("(()=>{const c=__video.P().clips[0]; c.efeito='pb'; c.efInt=90; c.x=20; c.esc=150; c.op=60; return c.id})()")
    pg.evaluate("__video.tudo()"); pg.wait_for_timeout(500)
    pg.locator(f'#veFaixas [data-clip="{c0}"]').click(button="right"); pg.wait_for_timeout(400)
    it = pg.locator(".bwf-menu button", has_text="Remover atributos"); ok(it.count() == 1, "menu do botão direito do take tem ⟲ REMOVER ATRIBUTOS")
    it.first.click(); pg.wait_for_timeout(400); c = pg.evaluate("__video.P().clips[0]")
    ok(not c.get("efeito") and c.get("esc") == 100 and c.get("op") == 100 and c.get("x") == 0 and c.get("mid"), f"o take voltou ao original e manteve o arquivo ({ {k: c.get(k) for k in ('efeito','esc','op','x')} })")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); c = pg.evaluate("__video.P().clips[0]"); ok(c.get("efeito") == "pb", "Ctrl+Z traz os atributos de volta")
    # transição JÁ APLICADA: o toque abre o que fazer com ela (não a lista)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    pg.evaluate("__video.irPara(999)"); pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[1].click()"); pg.wait_for_timeout(400)
    cl = pg.evaluate("__video.P().clips.filter(c=>c.tipo==='video'||c.tipo==='imagem').sort((a,b)=>a.ini-b.ini).map(c=>[c.id,c.ini,c.dur,c.trilha])")
    pg.evaluate(f"(()=>{{const c=__video.P().clips.find(x=>x.id==='{cl[-1][0]}'); c.trans={{tipo:'circulo',dur:0.6}}; __video.tudo();}})()"); pg.wait_for_timeout(400)
    j = pg.locator(f'#veFaixas [data-junta="{cl[-1][0]}"]')
    ok(j.count() == 1, "a emenda com a transição aparece")
    if j.count():
        j.click(); pg.wait_for_timeout(400); txt = pg.locator(".bwf-menu").first.inner_text() if pg.locator(".bwf-menu").count() else ""
        ok("Excluir a transição" in txt and "Tempo" in txt and "Persiana" not in txt, "tocar na transição aplicada abre EXCLUIR, TEMPO e afins (não a lista)")
        pg.locator(".bwf-menu button", has_text="Mais lenta").click(); pg.wait_for_timeout(300)
        ok(abs(pg.evaluate(f"__video.P().clips.find(x=>x.id==='{cl[-1][0]}').trans.dur") - 0.7) < 0.01, "MAIS LENTA soma 0,1 s")
        j = pg.locator(f'#veFaixas [data-junta="{cl[-1][0]}"]'); j.click(); pg.wait_for_timeout(400)
        pg.locator(".bwf-menu button", has_text="Excluir a transição").click(); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"__video.P().clips.find(x=>x.id==='{cl[-1][0]}').trans") is None, "EXCLUIR tira a transição")
        j = pg.locator(f'#veFaixas [data-junta="{cl[-1][0]}"]'); j.click(); pg.wait_for_timeout(400)
        txt = pg.locator(".bwf-menu").first.inner_text() if pg.locator(".bwf-menu").count() else ""
        ok("Persiana" in txt, "emenda sem transição abre a lista para escolher")
        pg.keyboard.press("Escape")
    ok(not er, f"sem erros de JS {er[:2]}")
    b.close()
print("FALHAS:", F[0]); sys.exit(1 if F[0] else 0)
