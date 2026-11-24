"""Opções do editor de vídeo (23/11, dono): ⏱ DURAÇÃO em segundos sem mudar a velocidade (um take ou vários = sequência colada), 🎵 EXTRAIR O ÁUDIO
no menu do take, 🗑 EXCLUIR ESTA CAMADA no botão direito do vazio, 🔊 mudo por camada. PC 1280."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8917"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
CL = "__video.P().clips"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept("2,5") if d.type == "prompt" else d.accept())
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    for k in range(3): pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[%d].click()" % (k % 2)); pg.wait_for_timeout(300)
    cl = pg.evaluate(f"{CL}.map(c=>[c.trilha,c.ini,c.dur])"); ok(len(cl) == 3 and cl[1][1] == cl[0][2] and cl[2][1] == cl[1][1] + cl[1][2], f"tocar em 3 mídias seguidas forma uma sequência na agulha {cl}")
    vel0 = pg.evaluate(f"{CL}.map(c=>c.vel||1)")
    def menu_take(i):
        r = pg.evaluate(f"(()=>{{const e=document.querySelector('[data-clip=\"'+{CL}[{i}].id+'\"]'),r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
        pg.mouse.click(r[0], r[1], button="right"); pg.wait_for_timeout(250)
    def itens(): return pg.evaluate("[...document.querySelectorAll('.bwf-menu button')].map(b=>b.textContent.trim())")
    def clicar(t): pg.evaluate("(t)=>{const b=[...document.querySelectorAll('.bwf-menu button')].find(b=>b.textContent.includes(t)); b.click()}", t); pg.wait_for_timeout(350)
    menu_take(0); it = itens()
    ok(any("Extrair o áudio" in x for x in it), "menu do take de vídeo tem 🎵 Extrair o áudio")
    ok(any("Duração" in x for x in it), "menu do take tem ⏱ Duração")
    clicar("Duração"); clicar("1 s")
    cl = pg.evaluate(f"{CL}.map(c=>[c.ini,c.dur])"); ok(cl[0][1] == 1 and abs(cl[1][0] - 1) < 0.01, f"⏱ 1 s num take: ele fica com 1 s e o seguinte encosta {cl}")
    ok(pg.evaluate(f"{CL}.map(c=>c.vel||1)") == vel0, "a velocidade não muda")
    pg.keyboard.press("Control+a"); pg.wait_for_timeout(200); menu_take(1); clicar("Duração"); clicar("2 s")
    cl = pg.evaluate(f"{CL}.map(c=>[c.ini,c.dur])"); ok([round(x[1], 2) for x in cl] == [2, 2, 2] and [round(x[0], 2) for x in cl] == [0, 2, 4], f"⏱ 2 s com os 3 escolhidos: sequência de 2 s {cl}")
    menu_take(0); clicar("Duração"); clicar("Outra duração"); cl = pg.evaluate(f"{CL}.map(c=>[c.ini,c.dur])")
    ok(abs(cl[0][1] - 2.5) < 0.01, f"Outra duração… aceita 2,5 s {cl}")
    menu_take(0); clicar("Duração"); clicar("8 s"); d0 = pg.evaluate(f"{CL}[0].dur"); ok(d0 < 8 and d0 > 0, f"vídeo mais curto que 8 s usa o que tem ({d0} s)")
    pg.keyboard.press("Escape"); menu_take(0); clicar("Extrair o áudio")
    au = pg.evaluate(f"{CL}.filter(c=>c.tipo==='audio').map(c=>c.trilha)"); ok(len(au) == 1 and pg.evaluate(f"{CL}[0].vol") == 0, f"🎵 Extrair o áudio cria o take de som e deixa o vídeo mudo ({au})")
    tr = au[0]; pg.click(f'#veRot [data-mute="{tr}"]'); pg.wait_for_timeout(150); ok(pg.evaluate(f"!!__video.P().mudas['{tr}']"), "🔊 no nome da camada tira o som da camada")
    n_tr = pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-faixa')].filter(e=>e.getClientRects().length).length")
    r = pg.evaluate(f"(()=>{{const e=document.querySelector('.ve-faixa[data-trilha=\"{tr}\"] .ve-clip'),r=e.getBoundingClientRect();return [r.right+40,r.top+r.height/2]}})()")
    pg.mouse.click(r[0], r[1], button="right"); pg.wait_for_timeout(250); ok(any("Excluir esta camada" in x for x in itens()), "botão direito no vazio da camada mostra 🗑 Excluir esta camada")
    clicar("Excluir esta camada"); pg.wait_for_timeout(200)
    ok(pg.evaluate(f"{CL}.filter(c=>c.trilha==='{tr}').length") == 0 and not pg.evaluate(f"!!(__video.P().mudas||{{}})['{tr}']"), "excluir a camada tira ela e o take dela (depois de confirmar)")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(pg.evaluate(f"{CL}.filter(c=>c.tipo==='audio').length") == 1, "desfazer traz a camada de volta")
    ok(not er, "sem erro de JavaScript " + str(er[:2])); b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
