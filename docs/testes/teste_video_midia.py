#!/usr/bin/env python3
"""Teste local (22/11, dono: "bugs ao adicionar mídia", "três pontinhos no lugar do clique na prévia", "a tela anda junto ao rolar as ferramentas"):
1) arquivo que o navegador não abre (vídeo quebrado/HEVC, foto HEIC) entra marcado com ⚠ e o aviso explica; os bons entram normais;
2) no celular, tocar num item da folha de mídia PÕE na linha do tempo, FECHA a folha e avisa onde entrou;
3) a página de edição fica PARADA: nada de rolagem lateral da página nem a rolagem das faixas vazar para ela (overscroll none);
4) clicar na prévia não abre menu; os ⋯ abrem. 1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_video_midia.py"""
import json, os, subprocess
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8869"))
S = "/tmp/sonda"; os.makedirs(S, exist_ok=True)
if not os.path.exists(f"{S}/foto.png"): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0xdd3355:size=800x600", "-frames:v", "1", f"{S}/foto.png"], check=True)
if not os.path.exists(f"{S}/som.wav"): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=440:d=4", f"{S}/som.wav"], check=True)
for n in ("quebrado.mp4", "foto.heic"):
    if not os.path.exists(f"{S}/{n}"): open(f"{S}/{n}", "wb").write(os.urandom(20000))
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        pg.set_input_files("#veArq", [f"{TMP}/azul.webm", f"{S}/foto.png", f"{S}/som.wav", f"{S}/quebrado.mp4", f"{S}/foto.heic"]); pg.wait_for_function("Object.keys(__video.MID).length >= 5", timeout=30000); pg.wait_for_timeout(600)
        mids = pg.evaluate("Object.values(__video.MID).map(m=>[m.nome,!!m.ruim])"); d = dict(mids)
        ok(d.get("quebrado.mp4") and d.get("foto.heic") and not d.get("azul.webm") and not d.get("foto.png") and not d.get("som.wav"), f"1) arquivo que não abre fica marcado (os bons não): {mids}")
        av = pg.inner_text("#bwAviso"); ok("não abr" in av or "HEIC" in av or "⚠" in av, f"…e o aviso explica o que fazer ({av[:70]}…)")
        if cel:
            pg.locator("#vaAdd").tap(); pg.wait_for_timeout(500)
            ok(pg.locator("#veLib .ve-item.ruim").count() == 2 and "NÃO ABRE" in pg.inner_text("#veLib"), "…com o selo ⚠ NÃO ABRE AQUI na biblioteca")
            boa = pg.locator('#veLib [data-mid]', has_text="azul.webm").first; boa.tap(); pg.wait_for_timeout(500)
            ok(pg.evaluate("VEApp.aberta()") == "", "2) tocar no item FECHA a folha de mídia")
            ok(pg.evaluate(f"{CL}.length") == 1 and "na linha do tempo" in pg.inner_text("#bwAviso"), f"…o take entrou e o aviso diz onde ({pg.inner_text('#bwAviso')[:60]})")
        else:
            ok(pg.locator("#veLib .ve-item.ruim").count() == 2, "…com o selo ⚠ NÃO ABRE AQUI na biblioteca")
            pg.locator('#veLib [data-mid]', has_text="azul.webm").first.click(); pg.wait_for_timeout(400)
            ok(pg.evaluate(f"{CL}.length") == 1 and "✓" in pg.inner_text("#bwAviso"), "2) clicar no item põe o take e avisa onde entrou")
        # 2b) o aviso FLUTUA (não empurra a linha do tempo) e some sozinho (dono, 22/11: "o aviso de importação fica estático")
        ok(pg.evaluate("getComputedStyle(document.querySelector('#bwAviso')).position") == "fixed", "2b) o aviso flutua por cima, sem ocupar lugar na página")
        pg.wait_for_timeout(4200); ok(pg.locator("#bwAviso").is_hidden(), "…e some sozinho depois de alguns segundos")
        # 3) página parada
        ok(pg.evaluate("getComputedStyle(document.documentElement).overscrollBehaviorX") == "none" and pg.evaluate("getComputedStyle(document.body).overscrollBehaviorX") == "none", "3) a página não deixa a rolagem vazar (overscroll none)")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "…sem rolagem lateral da página")
        alvo = "#vaFaixa, .va-faixa" if cel else "#veRolo"
        el = pg.locator(alvo).first
        if el.count():
            ok(pg.evaluate(f"getComputedStyle(document.querySelector('{alvo.split(',')[0] if not cel else '.va-faixa'}')).overscrollBehaviorX") == "none", "…e a faixa que rola não empurra a página")
            bb = el.bounding_box(); pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
            for _ in range(6): pg.mouse.wheel(900, 0); pg.wait_for_timeout(30)
            for _ in range(6): pg.mouse.wheel(-900, 0); pg.wait_for_timeout(30)
            ok(pg.evaluate("[scrollX, document.documentElement.scrollLeft, document.body.scrollLeft]") == [0, 0, 0], "…rolar a faixa até o fim para os dois lados não mexe a página")
        # 4) ⋯ na prévia
        ok(pg.locator("#veOpcP").count() == 1 and pg.locator("#veOpcP").is_visible(), "4) ⋯ visíveis no alto da prévia")
        ok(not er, f"0 erros de JS {er[:2]}")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
