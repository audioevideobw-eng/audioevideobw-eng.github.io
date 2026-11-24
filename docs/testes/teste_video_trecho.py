"""TRECHO MARCADO (I / O) limita a EXPORTAÇÃO (23/11, dono): botões ⟦ ENTRADA / SAÍDA ⟧ / ✕ e o arquivo exportado tem só o trecho, com a cor certa."""
import sys, os, json, subprocess
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8931"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
def dur(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames,r_frame_rate", "-of", "json", f], capture_output=True, text=True).stdout
    return json.loads(r)["streams"][0]
def cor(f, t):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", f, "-frames:v", "1", "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return list(r[:3])
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"]); ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block", accept_downloads=True); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/verde.webm", f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=15000); pg.wait_for_timeout(300)
    for k in range(2): pg.evaluate("document.querySelectorAll('#veLib [data-mid]')[%d].click()" % k); pg.wait_for_timeout(300)
    d0 = pg.evaluate("__video.P().clips[0].dur"); tot = pg.evaluate("__video.P().clips.reduce((m,c)=>Math.max(m,c.ini+c.dur),0)")
    rot0 = pg.inner_text("#veExportar")
    ok(pg.locator("#veMarcaE").is_visible() and pg.locator("#veMarcaS").is_visible() and not pg.locator("#veMarcaX").is_visible(), "botões ⟦ ENTRADA e SAÍDA ⟧ na barra; ✕ só aparece com trecho")
    e, s = d0 - 1, d0 + 1.5   # 1 s do 1º take + 1,5 s do 2º
    pg.evaluate(f"__video.irPara({e})"); pg.click("#veMarcaE"); pg.evaluate(f"__video.irPara({s})"); pg.click("#veMarcaS"); pg.wait_for_timeout(250)
    tr = pg.evaluate("__video.trecho()"); ok(tr and abs(tr[0] - e) < 0.02 and abs(tr[1] - s) < 0.02 and pg.locator("#veMarcaX").is_visible() and "on" in pg.get_attribute("#veMarcaE", "class"), f"os botões marcam o trecho na agulha {tr}")
    ok("TRECHO" in pg.inner_text("#veExportar"), "o botão EXPORTAR avisa que vai sair só o trecho (%s)" % pg.inner_text("#veExportar"))
    pg.click("#veExportar"); pg.wait_for_timeout(400); res = pg.inner_text("#veExRes2")
    ok("trecho marcado" in res.lower() and pg.locator("#veExInteiro").count() == 1, "a janela de exportar mostra o trecho e a opção do vídeo inteiro")
    pg.click("#veExIr")
    arq = f"{TMP}/trecho.bin"
    try:
        pg.wait_for_function("!document.getElementById('veSaida').hidden", timeout=40000)
    except Exception: pass
    blob = pg.evaluate("(async()=>{const b=document.getElementById('veSaida')._blob;if(!b)return null;const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)})()") if True else None
    if blob:
        import base64; open(arq, "wb").write(base64.b64decode(blob)); st = dur(arq); n = int(st["nb_read_frames"]); fr = eval(st["r_frame_rate"]) if "/" in st["r_frame_rate"] else float(st["r_frame_rate"])
        seg = pg.evaluate("(()=>{const v=document.querySelector('#veSaida video');return v&&isFinite(v.duration)?v.duration:0})()")
        ok(n > 20 and n < 30 * 2.5 * 1.6, f"o arquivo exportado tem só o trecho de 2,5 s ({n} quadros; o vídeo inteiro tem {tot} s)")
        c1 = cor(arq, 0.3); c2 = cor(arq, 2.0)
        ok(c1 and c1[1] > c1[2] + 40, f"começa no fim do 1º take (verde {c1})"); ok(c2 and c2[2] > c2[1] + 40, f"e passa para o 2º take (azul {c2})")
    else: ok(False, "exportou o arquivo")
    ok(abs(pg.evaluate("__video.T()") - s) < 0.3, "a gravação parou na saída marcada")
    pg.evaluate("document.querySelectorAll('.ve-exp,[id=veExJan]').forEach(x=>0)"); pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
    pg.evaluate("document.getElementById('veMarcaX').click()"); pg.wait_for_timeout(250)
    ok(pg.evaluate("__video.trecho()") is None and pg.inner_text("#veExportar") == rot0 and not pg.locator("#veMarcaX").is_visible(), "✕ limpa o trecho: volta a exportar o vídeo inteiro")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(pg.evaluate("__video.trecho()") is not None, "desfazer traz o trecho de volta")
    ok(not er, "sem erro de JavaScript " + str(er[:2])); b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
