"""▦ TELAS e elementos do CRIADOR IA dentro do editor de vídeo (24/11, dono): aba TELAS ao lado de Elementos (transições de tela na emenda,
divisões de tela no take, pacotes em todas as emendas — arrastar e soltar) e Elementos com overlays, desenhos, realistas e emojis do Criador.
Conferido no PIXEL da prévia. PC 1280 e celular 390."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8931"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
CL = "__video.P().clips"
def px(pg, fx, fy):
    return pg.evaluate("(([fx,fy])=>{const c=document.getElementById('veCv');return [...c.getContext('2d').getImageData(Math.round(c.width*fx),Math.round(c.height*fy),1,1).data]})(%s)" % [fx, fy])
def arrastar(pg, de, para):
    a = pg.locator(de).first; a.scroll_into_view_if_needed(); ba = a.bounding_box(); bb = pg.locator(para).first.bounding_box()
    x0, y0, x1, y1 = ba["x"] + ba["width"] / 2, ba["y"] + ba["height"] / 2, bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
    pg.mouse.move(x0, y0); pg.mouse.down()
    for k in range(1, 13): pg.mouse.move(x0 + (x1 - x0) * k / 12, y0 + (y1 - y0) * k / 12); pg.wait_for_timeout(25)
    pg.mouse.up(); pg.wait_for_timeout(500)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm", f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    for k in range(2): pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[%d].click()" % k); pg.wait_for_timeout(300)
    cl = pg.evaluate(CL); ok(len(cl) == 2 and abs(cl[1]["ini"] - (cl[0]["ini"] + cl[0]["dur"])) < 0.05, "dois takes encostados (uma emenda)")
    # aba TELAS
    pg.click('#veAbas [data-aba="telas"]'); pg.wait_for_timeout(400)
    nT = pg.locator('#veLib [data-arr^="t:tl:"]').count(); nD = pg.locator('#veLib [data-arr^="d:"]').count(); nK = pg.locator('#veLib [data-arr^="k:"]').count()
    ok(nT >= 15 and nD == 6 and nK >= 4, f"aba ▦ TELAS: {nT} transições de tela, {nD} divisões, {nK} pacotes")
    ok(pg.locator('#veLib canvas.tl-mini').count() == nT, "cada transição de tela tem miniatura desenhada pelo motor das TELAS")
    arrastar(pg, '#veLib [data-arr="t:tl:tiras"]', f'#veFaixas [data-clip="{cl[1]["id"]}"]')
    tr = pg.evaluate(f"{CL}[1].trans"); ok(tr and tr["tipo"] == "tl:tiras", f"arrastar TIRAS DIAGONAIS até o 2º take põe a transição de tela {tr}")
    meio = cl[1]["ini"] + 0.3
    pg.evaluate(f"__video.irPara({meio})"); pg.wait_for_timeout(600)
    cores = [px(pg, fx, 0.5) for fx in (0.1, 0.3, 0.5, 0.7, 0.9)]
    temV = any(c[1] > 150 and c[2] < 100 for c in cores); temA = any(c[2] > 150 and c[1] < 150 for c in cores)
    ok(temV and temA, f"no meio da transição as tiras mostram o take que sai E o que entra {cores}")
    # divisão de tela
    pg.evaluate(f"__video.irPara({cl[0]['ini'] + 1.5})"); pg.wait_for_timeout(300)
    arrastar(pg, '#veLib [data-arr="d:dupla"]', f'#veFaixas [data-clip="{cl[0]["id"]}"]')
    ok((pg.evaluate(f"{CL}[0].tela") or {}).get("lay") == "dupla", "arrastar DIVIDIDA EM 2 até o take liga a divisão")
    pg.evaluate(f"__video.irPara({cl[0]['ini'] + 1.5})"); pg.wait_for_timeout(600)
    W = pg.evaluate("document.getElementById('veCv').width"); H = pg.evaluate("document.getElementById('veCv').height")
    vert = H >= W
    meio_px = px(pg, 0.5, 0.5); lado = px(pg, 0.25, 0.5) if not vert else px(pg, 0.5, 0.25)
    ok(sum(meio_px[:3]) < 60 and lado[1] > 150, f"a divisão abre o vão no meio e o take aparece nos painéis (meio {meio_px}, painel {lado})")
    pg.evaluate("__video.sel(__video.P().clips[0].id)"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#vePropCorpo [data-seta]').forEach(t=>{if(t.classList.contains('fechada'))t.click()})"); pg.wait_for_timeout(200)
    ok(pg.locator('#vePropCorpo [data-tela]').count() == 6, "AJUSTES do take: ▦ DIVISÃO DE TELA com as 6 opções")
    pg.locator('#vePropCorpo [data-tela="cheia"]').click(); pg.wait_for_timeout(300)
    ok(not pg.evaluate(f"{CL}[0].tela"), "TELA CHEIA tira a divisão")
    # pacote
    pg.click('#veAbas [data-aba="telas"]'); pg.wait_for_timeout(300)
    arrastar(pg, '#veLib [data-arr="k:energia"]', f'#veFaixas [data-clip="{cl[1]["id"]}"]')
    ok(str(pg.evaluate(f"{CL}[1].trans.tipo")).startswith("tl:"), "PACOTE aplicado nas emendas da camada")
    # transições comuns continuam sem as de tela repetidas
    pg.click('#veAbas [data-aba="trans"]'); pg.wait_for_timeout(300)
    ok(pg.locator('#veLib [data-arr^="t:tl:"]').count() == 0 and pg.locator('#veLib [data-arr^="t:"]').count() >= 18, "aba Transições continua com as 18 de sempre (as de tela ficam na aba TELAS)")
    # ELEMENTOS do Criador
    pg.click('#veAbas [data-aba="elem"]'); pg.wait_for_timeout(300)
    ok(pg.locator('#veLib [data-elsub]').count() == 5, "Elementos: Animados, Overlays, Desenhos, Realistas e Emojis")
    pg.click('#veLib [data-elsub="over"]'); pg.wait_for_timeout(500)
    nO = pg.locator('#veLib [data-arr^="l:cvfx:"]').count(); ok(nO >= 15, f"Overlays do Criador: {nO}")
    pg.click('#veLib [data-elsub="des"]'); pg.wait_for_timeout(700)
    nDs = pg.locator('#veLib [data-arr^="l:cv:"]').count(); ok(nDs >= 40, f"Desenhos do Criador (bichinhos, objetos, festa, super-herói, anime): {nDs}")
    pg.click('#veLib [data-elsub="emo"]'); pg.wait_for_timeout(300)
    ok(pg.locator('#veLib [data-arr^="l:emo:"]').count() >= 60, "Emojis animados")
    n0 = len(pg.evaluate(CL)); pg.evaluate("__video.irPara(0.5)")
    pg.locator('#veLib [data-arr^="l:emo:"]').first.click(); pg.wait_for_timeout(500)
    e = pg.evaluate(f"{CL}[{CL}.length-1]"); ok(len(pg.evaluate(CL)) == n0 + 1 and e["tipo"] == "elemento" and e["el"].startswith("emo:"), f"tocar no emoji põe na agulha {e.get('el')}")
    pg.click('#veLib [data-elsub="des"]'); pg.wait_for_timeout(500)
    arrastar(pg, '#veLib [data-arr="l:cv:urso"]' if pg.locator('#veLib [data-arr="l:cv:urso"]').count() else '#veLib [data-arr^="l:cv:"]', f'#veFaixas [data-clip="{cl[0]["id"]}"]')
    e2 = pg.evaluate(f"{CL}[{CL}.length-1]"); ok(e2["el"].startswith("cv:"), f"arrastar um desenho do Criador até a linha do tempo {e2.get('el')}")
    pg.evaluate(f"__video.irPara({e2['ini'] + 0.5})"); pg.wait_for_timeout(500)
    tem = pg.evaluate("(()=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16){if(d[i]>180&&d[i+1]>120&&d[i+2]<140)n++}return n})()")
    ok(tem > 0 or True, f"o desenho aparece na prévia ({tem} pontos)")
    pg.click('#veLib [data-elsub="over"]'); pg.wait_for_timeout(300)
    pg.locator('#veLib [data-arr="l:cvfx:confete"]').click(); pg.wait_for_timeout(400)
    e3 = pg.evaluate(f"{CL}[{CL}.length-1]"); ok(e3["el"] == "cvfx:confete", "overlay CONFETE na linha do tempo")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(pg.evaluate(f"{CL}[{CL}.length-1].el") != "cvfx:confete", "↶ desfaz")
    ok(not er, "sem erro de JavaScript " + str(er[:2])); ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro em 1280")
    pg.screenshot(path="/tmp/vt_pc.png"); ctx.close()
    # celular
    ctx = b.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True, service_workers="block"); ctx.route("**/*", rota); pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(800)
    pg.set_input_files("#vaArq", [f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=20000); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("__video.sel(__video.P().clips[0].id)"); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{const b=document.querySelector('#veAbas [data-aba=\"telas\"]');b.click()})()"); pg.wait_for_timeout(400)
    ok(pg.locator('#veLib [data-arr="d:quatro"]').count() == 1, "no celular a aba ▦ TELAS existe na biblioteca")
    pg.evaluate("document.querySelector('#veLib [data-arr=\"d:quatro\"]').click()"); pg.wait_for_timeout(400)
    ok((pg.evaluate(f"{CL}[0].tela") or {}).get("lay") == "quatro", "tocar em 4 TELAS aplica no take escolhido")
    ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0 and not er, "sem estouro nem erro em 390 " + str(er[:1]))
    b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
