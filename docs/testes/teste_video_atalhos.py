"""ATALHOS DE EDITOR DE MESA e Alt + arrastar (23/11, lista do dono): Ctrl+Shift+K, A / Shift+A, I / O, M, vírgula e ponto, G, Ctrl+L, L 2×, J para trás."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8929"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
CL = "__video.P().clips"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"]); ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept("-6"))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm", f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    for k in range(2): pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[%d].click()" % k); pg.wait_for_timeout(300)
    d0 = pg.evaluate(f"{CL}[0].dur"); n0 = pg.evaluate(f"{CL}.length")
    foco = lambda: pg.evaluate("document.activeElement&&document.activeElement.blur()")
    # Alt + arrastar duplica
    c1 = pg.locator(f'[data-clip]').nth(1).bounding_box(); pg.keyboard.down("Alt"); pg.mouse.move(c1["x"] + c1["width"] / 2, c1["y"] + c1["height"] / 2); pg.mouse.down(); pg.mouse.move(c1["x"] + c1["width"] / 2 + 400, c1["y"] + c1["height"] / 2, steps=8); pg.mouse.up(); pg.keyboard.up("Alt"); pg.wait_for_timeout(400)
    ok(pg.evaluate(f"{CL}.length") == n0 + 1, f"Alt + arrastar deixa o take no lugar e leva uma cópia ({n0} → {pg.evaluate(f'{CL}.length')})")
    pg.keyboard.down("Alt"); pg.mouse.move(c1["x"] + 20, c1["y"] + c1["height"] / 2); pg.mouse.down(); pg.mouse.up(); pg.keyboard.up("Alt"); pg.wait_for_timeout(300)
    ok(pg.evaluate(f"{CL}.length") == n0 + 1, "Alt + clique sem arrastar não cria cópia")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(pg.evaluate(f"{CL}.length") == n0, "desfazer tira a cópia")
    # Ctrl+Shift+K corta todas as camadas
    pg.evaluate("__video.sel(null); __video.addTexto && 0"); pg.evaluate(f"(()=>{{const c=JSON.parse(JSON.stringify({CL}[0]));c.id='dupx';c.trilha='v2';__video.P().clips.push(c);__video.tudo()}})()"); pg.evaluate("__video.irPara(2)"); foco()
    pg.keyboard.press("Control+Shift+K"); pg.wait_for_timeout(300); ok(pg.evaluate(f"{CL}.filter(c=>Math.abs(c.ini-2)<0.01).length") == 2, "Ctrl+Shift+K corta as duas camadas na agulha")
    pg.keyboard.press("a"); pg.wait_for_timeout(200); na = pg.evaluate("document.querySelectorAll('.ve-clip.multi, .ve-clip.on').length"); ok(na >= 3, f"A escolhe tudo da agulha para a frente ({na})")
    pg.keyboard.press("Escape"); pg.keyboard.press("Shift+A"); pg.wait_for_timeout(200); nb = pg.evaluate("document.querySelectorAll('.ve-clip.multi, .ve-clip.on').length"); ok(nb == 2, f"Shift+A escolhe o que está antes da agulha ({nb})")
    pg.keyboard.press("Escape"); pg.evaluate("__video.irPara(1)"); pg.keyboard.press("i"); pg.evaluate("__video.irPara(3)"); pg.keyboard.press("o"); pg.wait_for_timeout(200)
    ok(pg.evaluate("__video.P().entra") == 1 and pg.evaluate("__video.P().sai") == 3 and pg.locator("#veRegua .ve-es").count() == 2 and pg.locator("#veRegua .ve-faixa-es").count() == 1, "I e O marcam entrada e saída na régua")
    pg.keyboard.press("Shift+I"); pg.wait_for_timeout(150); ok(abs(pg.evaluate("__video.T()") - 1) < 0.02, "Shift+I leva a agulha até a entrada")
    pg.evaluate("__video.irPara(4.5)"); pg.keyboard.press("m"); pg.wait_for_timeout(200); ok(pg.evaluate("__video.P().marcas") == [4.5] and pg.locator("#veRegua .ve-marca").count() == 1, "M põe um marcador na agulha")
    pg.evaluate("__video.irPara(0)"); pg.keyboard.press("Shift+M"); pg.wait_for_timeout(150); ok(abs(pg.evaluate("__video.T()") - 1) < 0.02, "Shift+M pula para a próxima marca"); pg.evaluate("__video.irPara(4.5)"); pg.keyboard.press("m"); pg.wait_for_timeout(150); ok(pg.evaluate("__video.P().marcas.length") == 0, "M em cima do marcador tira")
    # vírgula (inserir) e ponto (sobrepor) — a última mídia usada, com a duração de I→O (2 s)
    fim0 = pg.evaluate(f"Math.max(...{CL}.filter(c=>c.trilha==='v1').map(c=>c.ini+c.dur))"); nv = pg.evaluate(f"{CL}.filter(c=>c.trilha==='v1').length"); pg.evaluate("__video.irPara(2)"); foco(); pg.keyboard.press(","); pg.wait_for_timeout(300)
    fim1 = pg.evaluate(f"Math.max(...{CL}.filter(c=>c.trilha==='v1').map(c=>c.ini+c.dur))"); novo = pg.evaluate(f"{CL}.filter(c=>c.trilha==='v1'&&Math.abs(c.ini-2)<0.01)[0]")
    ok(abs(fim1 - fim0 - 2) < 0.06 and novo and abs(novo["dur"] - 2) < 0.06, f"vírgula INSERE 2 s na agulha e empurra o resto ({fim0} → {fim1})")
    pg.evaluate("__video.irPara(5)"); foco(); pg.keyboard.press("."); pg.wait_for_timeout(300); fim2 = pg.evaluate(f"Math.max(...{CL}.filter(c=>c.trilha==='v1').map(c=>c.ini+c.dur))")
    ok(abs(fim2 - fim1) < 0.06 and pg.evaluate(f"{CL}.filter(c=>c.trilha==='v1'&&Math.abs(c.ini-5)<0.01).length") == 1, "ponto SOBREPÕE: o total não muda e o take novo cobre o trecho")
    sob = pg.evaluate(f"(()=>{{const l={CL}.filter(c=>c.trilha==='v1').sort((a,b)=>a.ini-b.ini);for(let i=1;i<l.length;i++)if(l[i].ini<l[i-1].ini+l[i-1].dur-0.02)return true;return false}})()"); ok(not sob, "nenhum take em cima de outro na camada depois de inserir/sobrepor")
    # G = ganho, Ctrl+L = separar o som
    pg.locator('[data-clip]').first.click(); foco(); pg.keyboard.press("g"); pg.wait_for_timeout(300); v = pg.evaluate(f"__video.P().clips.find(c=>c.id===document.querySelector('.ve-clip.on').dataset.clip).vol"); ok(v == 50, f"G: −6 dB = volume 50% ({v})")
    na0 = pg.evaluate(f"{CL}.filter(c=>c.tipo==='audio').length"); pg.keyboard.press("Control+l"); pg.wait_for_timeout(400); ok(pg.evaluate(f"{CL}.filter(c=>c.tipo==='audio').length") == na0 + 1, "Ctrl+L separa o som do vídeo numa camada de áudio")
    # L repetido e J
    pg.evaluate("__video.irPara(0)"); foco(); pg.keyboard.press("l"); pg.wait_for_timeout(250); pg.keyboard.press("l"); pg.wait_for_timeout(200); ta = pg.evaluate("__video.T()"); pg.wait_for_timeout(1000); tb = pg.evaluate("__video.T()")
    ok(1.5 < tb - ta < 2.6, f"L duas vezes toca a 2× ({round(tb - ta, 2)} s de vídeo em 1 s)")
    pg.keyboard.press("j"); pg.wait_for_timeout(700); tc = pg.evaluate("__video.T()"); ok(tc < tb - 0.3, f"J toca para trás ({round(tb, 2)} → {round(tc, 2)})"); pg.keyboard.press("k"); pg.wait_for_timeout(200)
    ok(not pg.evaluate("__video.tocando ? __video.tocando() : false"), "K pausa"); ok(not er, "sem erro de JavaScript " + str(er[:2])); b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
