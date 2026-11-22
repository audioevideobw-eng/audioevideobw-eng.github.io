#!/usr/bin/env python3
"""Teste local (22/11, dono: "26 takes não abriram; leia arquivos diversos sem travar"): importar 36 takes de uma vez não pode deixar nenhum
"não abre" (antes o 21º em diante falhava porque cada arquivo deixava um <video> aberto), nenhum <video> fica aberto depois de importar,
na linha do tempo só existem os <video> perto da agulha, o codec HEVC é reconhecido pelo arquivo e o ↻ tenta de novo. 1280 px.
Uso (na raiz): python3 docs/testes/teste_video_takes.py"""
import os, subprocess
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8872"))
S = "/tmp/takes"; os.makedirs(S, exist_ok=True); N = 36
for i in range(N):
    f = f"{S}/take{i:02d}.webm"
    if not os.path.exists(f): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc2=size=640x360:rate=25:d=2", "-vf", f"hue=h={i*10}", "-c:v", "libvpx-vp9", "-b:v", "300k", "-deadline", "realtime", f], check=True)
open(f"{S}/hevc.mp4", "wb").write(b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64 + b"moov....trak....stsd....hvc1" + os.urandom(3000))
CONTA = """(()=>{window.__vivos=new Set();const o=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');
Object.defineProperty(HTMLMediaElement.prototype,'src',{set(v){if(v)window.__vivos.add(this);o.set.call(this,v)},get(){return o.get.call(this)}});
const ra=Element.prototype.removeAttribute;Element.prototype.removeAttribute=function(n){if(n==='src'&&this instanceof HTMLMediaElement)window.__vivos.delete(this);return ra.call(this,n)};})()"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); ctx.route("**/*", rota); ctx.add_init_script(CONTA)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
    pg.goto(BASE + "video.html?novo=1"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
    pg.evaluate("indexedDB.deleteDatabase('bw_video')") if False else None
    arqs = [f"{S}/take{i:02d}.webm" for i in range(N)] + [f"{S}/hevc.mp4"]
    pg.set_input_files("#veArq", arqs); pg.wait_for_function(f"Object.values(__video.MID).filter(m=>/take|hevc/.test(m.nome)).length >= {N + 1}", timeout=300000); pg.wait_for_timeout(800)
    ms = pg.evaluate("Object.values(__video.MID).filter(m=>/take|hevc/.test(m.nome)).map(m=>[m.nome,!!m.ruim,!!m.capa,m.codec||''])")
    ruins = [m[0] for m in ms if m[1] and m[0] != "hevc.mp4"]
    ok(not ruins, f"{N} takes importados de uma vez, nenhum marcado como 'não abre' ({ruins[:4]})")
    ok(all(m[2] for m in ms if m[0] != "hevc.mp4"), "todos com miniatura")
    h = [m for m in ms if m[0] == "hevc.mp4"][0]; ok(h[1] and h[3] == "hevc", f"HEVC reconhecido pelo arquivo ({h})")
    ok("HEVC" in pg.inner_text("#veLib"), "selo diz HEVC na biblioteca")
    vivos = pg.evaluate("[...__vivos].filter(e=>e.getAttribute('src')).length"); ok(vivos <= 2, f"nenhum <video> esquecido aberto depois de importar ({vivos})")
    # todos na linha do tempo; andar pela linha do tempo não pode abrir todos
    pg.evaluate("""(()=>{const ids=Object.values(__video.MID).filter(m=>/take/.test(m.nome)).map(m=>m.id);ids.forEach(id=>document.querySelector('#veLib [data-mid="'+id+'"]')&&document.querySelector('#veLib [data-mid="'+id+'"]').click())})()""")
    pg.wait_for_timeout(1500)
    nc = pg.evaluate(f"{CL}.length"); ok(nc >= N, f"{nc} clipes na linha do tempo")
    maxEl = 0
    for t in range(0, int(nc * 2), 6):
        pg.evaluate(f"__video.irPara({t})"); pg.wait_for_timeout(120)
        maxEl = max(maxEl, pg.evaluate("Object.keys(__video.EL).length"))
    ok(maxEl <= 8, f"andando pela linha do tempo, no máximo {maxEl} vídeos abertos ao mesmo tempo (antes: todos)")
    # ↻ tentar de novo
    pg.locator('#veLib [data-retry]').first.click(); pg.wait_for_timeout(2500)
    ok("continua sem abrir" in pg.inner_text("#veAviso") or "abriu" in pg.inner_text("#veAviso"), f"↻ tenta de novo e diz o resultado ({pg.inner_text('#veAviso')[:60]})")
    ok(not er, f"sem erro de JS {er[:2]}")
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
