#!/usr/bin/env python3
"""Teste local (22/11, dono: "FAZER PROXY com barra e tempo esperado; LIMPAR CACHE; tamanho em GB e memória; ⚙ pastas; janela de EXPORTAR
com ultra qualidade, YouTube 4K/Full HD, Instagram, só o áudio, sequência JPEG/PNG e outros codecs"). 1280 e 390 px.
1) FAZER PROXY de um take 1920×1080 com som → proxy 1280×720 H.264 + AAC conferido no ffprobe, barra de cópia com "faltam", selo na biblioteca;
2) a prévia usa o proxy e a exportação volta para o ORIGINAL; 3) barra mostra GB e memória; 4) LIMPAR CACHE apaga os proxies;
5) EXPORTAR: presets (YouTube Full HD = 1920×1080 a partir de um projeto 1080p), arquivo de verdade no ffprobe, WAV (RIFF 24 bits), sequência JPEG em .zip.
Uso (na raiz): python3 docs/testes/teste_video_proxy.py"""
import os, subprocess, base64, json, zipfile, io
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8874"))
JSZIP = open("/opt/npm-tools/node_modules/jszip/dist/jszip.min.js").read()
rota0 = rota
def rota(r):
    if "jszip" in r.request.url: return r.fulfill(body=JSZIP, content_type="application/javascript")
    return rota0(r)
S = "/tmp/teste_proxy"; os.makedirs(S, exist_ok=True)
F = f"{S}/take1080.webm"
if not os.path.exists(F): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:d=4", "-f", "lavfi", "-i", "sine=f=440:d=4", "-c:v", "libvpx-vp9", "-b:v", "2M", "-deadline", "realtime", "-c:a", "libopus", "-shortest", F], check=True)
def baixar(pg, expr, nome):
    b64 = pg.evaluate("(async()=>{const b=" + expr + ";const r=new FileReader();return await new Promise(ok=>{r.onload=()=>ok(r.result.split(',')[1]);r.readAsDataURL(b)})})()")
    open(nome, "wb").write(base64.b64decode(b64)); return nome
def probe(f): return json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", f], capture_output=True, text=True).stdout or "{}")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html" + ("?layout=classico" if cel else "")); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        pg.select_option("#veFmt", "16:9"); pg.wait_for_timeout(200)
        pg.set_input_files("#veArq", [F]); pg.wait_for_function("Object.values(__video.MID).some(m=>m.nome==='take1080.webm')", timeout=30000); pg.wait_for_timeout(500)
        pg.locator('#veLib [data-mid]', has_text="take1080").first.click(); pg.wait_for_timeout(500)
        ok(pg.locator("#veCache").count() == 1 and pg.locator("#veProxyBt").is_visible(), "1) barra embaixo da mídia com ⚡ FAZER PROXY, 🧹 LIMPAR CACHE e ⚙")
        ok(pg.locator("#veLimparBt").is_visible() and pg.locator("#veCfgBt").is_visible(), "…os três botões à vista")
        pg.wait_for_function("document.getElementById('veUso').textContent.indexOf('💾')>=0", timeout=8000)
        u = pg.inner_text("#veUso"); ok("GB" in u or "MB" in u, f"3) mostra o espaço usado em GB/MB ({u.splitlines()[0][:70]})"); ok("memória" in u, "…e a memória")
        pg.click("#veProxyBt"); pg.wait_for_selector("#veJanProxy", timeout=3000)
        ok(pg.locator("#veJanProxy .ve-pxit").count() == 1 and pg.locator("#veJanProxy input[type=checkbox]:checked").count() == 1, "janela de escolha: o vídeo vem marcado")
        ok("leva uns" in pg.inner_text("#vePxResumo"), "…mostra o tempo estimado antes de começar")
        pg.click("#vePxIr"); pg.wait_for_selector("#veCopia", timeout=5000)
        vistos = set(); txt = ""
        for _ in range(120):
            if not pg.locator("#veCopia").count(): break
            try: txt = pg.inner_text("#veCopia"); w = pg.evaluate("document.getElementById('veCpB1').style.width"); vistos.add(w)
            except Exception: pass
            pg.wait_for_timeout(250)
        ok(len(vistos) >= 3, f"barra de cópia se enchendo ({len(vistos)} posições: {sorted(vistos)[:5]})")
        ok("tempo esperado" in txt or "faltam" in txt, f"…com o tempo que falta ({txt[:90]!r})")
        pg.wait_for_function("Object.keys(__video.PX).length===1", timeout=60000)
        px = pg.evaluate("Object.values(__video.PX)[0]"); ok(px["w"] == 1280 and px["h"] == 720, f"proxy 1280×720 ({px['w']}×{px['h']}, {px['bytes']} bytes)")
        f = baixar(pg, "await (await fetch(Object.values(__video.PX)[0].url)).blob()", f"{S}/proxy{W}.mp4"); pr = probe(f)
        vs = [s for s in pr.get("streams", []) if s["codec_type"] == "video"]; aus = [s for s in pr.get("streams", []) if s["codec_type"] == "audio"]
        ok(vs and vs[0]["codec_name"] == "h264" and vs[0]["width"] == 1280, f"ffprobe: H.264 1280×720 ({vs and vs[0]['codec_name']})")
        ok(aus and aus[0]["codec_name"] in ("aac", "opus"), f"ffprobe: com som (AAC; Opus onde o navegador não tem AAC) ({aus and aus[0]['codec_name']})")
        d = float(pr.get("format", {}).get("duration", 0)); ok(3.5 < d < 4.6, f"duração igual ao original ({d:.2f} s)")
        dec = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-f", "null", "-"], capture_output=True, text=True); ok(not dec.stderr.strip(), "o proxy decodifica inteiro sem erro")
        ok("PROXY" in pg.inner_text("#veLib"), "selo ⚡ PROXY na biblioteca")
        pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(600)
        src = pg.evaluate("(()=>{const k=Object.keys(__video.EL)[0];return k?__video.EL[k].e.src:''})()"); purl = pg.evaluate("Object.values(__video.PX)[0].url")
        ok(src == purl, "2) a prévia usa o proxy")
        # export window
        pg.click("#veExportar"); pg.wait_for_selector("#veJanExp", timeout=3000)
        ok(pg.locator("#veJanExp .ve-exp-card[data-pronto]").count() >= 8, "5) janela EXPORTAR com os prontos (máxima, YouTube 4K/4K60/Full HD/60, Instagram, WhatsApp, telão)")
        pg.click('[data-pronto="yt4k"]'); o = pg.evaluate("__video.opDe()"); ok(o["saida"] == [3840, 2160] and o["vbps"] == 45e6 and o["abps"] == 384000, f"YouTube 4K: 3840×2160, 45 Mbps, AAC 384 ({o['saida']}, {o['mime']})")
        pg.click('[data-pronto="ytfhd"]'); o = pg.evaluate("__video.opDe()"); ok(o["saida"] == [1920, 1080] and o["fps"] == 30 and "avc1" in o["mime"], f"YouTube Full HD: 1920×1080 H.264 ({o['mime']})")
        pg.click('[data-pronto="insta"]'); ok("não está em 9:16" in pg.inner_text("#veExRes2"), "Instagram avisa que o projeto não está em 9:16")
        pg.click('[data-exaba="pro"]'); ok(pg.locator('[data-pn="pro"] .ve-exp-card.off').count() == 4 and pg.locator("#veExIr").is_disabled(), "PROFISSIONAL (ProRes/DNxHR) aparece como 'em breve', sem botão que falha")
        pg.click('[data-exaba="perso"]'); n_ok = pg.evaluate("[...document.querySelectorAll('#veExCod option:not([disabled])')].length"); ok(n_ok >= 1, f"PERSONALIZADO: {n_ok} codec(s) que este navegador grava")
        pg.click('[data-exaba="prontos"]'); pg.click('[data-pronto="whats"]'); pg.click("#veExIr")
        pg.wait_for_timeout(700); src2 = pg.evaluate("(()=>{const k=Object.keys(__video.EL)[0];return k?__video.EL[k].e.src:''})()"); orig = pg.evaluate("Object.values(__video.MID).find(m=>m.nome==='take1080.webm').url")
        ok(src2 == orig, "2) na exportação o take volta para o ARQUIVO ORIGINAL")
        pg.wait_for_function("window.__veSaida && window.__veSaida.bytes>0", timeout=40000)
        f2 = baixar(pg, "window.__veSaida.blob", f"{S}/export{W}." + pg.evaluate("window.__veSaida.nome.split('.').pop()")); pr2 = probe(f2); v2 = [s for s in pr2.get("streams", []) if s["codec_type"] == "video"]
        ok(v2 and v2[0]["width"] == 1280 and v2[0]["height"] == 720, f"arquivo exportado no tamanho do preset (WhatsApp 1280×720: {v2 and (v2[0]['width'], v2[0]['height'])})")
        ok(any(s["codec_type"] == "audio" for s in pr2.get("streams", [])), "…com som")
        pg.click("#veFecharSaida"); pg.wait_for_timeout(300)
        src3 = pg.evaluate("(()=>{__video.irPara(1.5);const k=Object.keys(__video.EL)[0];return k?__video.EL[k].e.src:''})()"); pg.wait_for_timeout(300)
        ok(pg.evaluate("(()=>{const k=Object.keys(__video.EL)[0];return k?__video.EL[k].e.src:''})()") == purl, "…e depois a prévia volta para o proxy")
        # WAV
        pg.evaluate("window.__veSaida=null"); pg.click("#veExportar"); pg.click('[data-exaba="audio"]'); pg.click('[data-audio="wav"]'); pg.click("#veExIr")
        pg.wait_for_function("window.__veSaida && window.__veSaida.bytes>0", timeout=40000)
        f3 = baixar(pg, "window.__veSaida.blob", f"{S}/audio{W}.wav"); hd = open(f3, "rb").read(44)
        ok(hd[:4] == b"RIFF" and hd[8:12] == b"WAVE" and int.from_bytes(hd[34:36], "little") == 24, "SÓ O ÁUDIO: WAV de verdade, 24 bits")
        vd = subprocess.run(["ffmpeg", "-i", f3, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
        mv = [l for l in vd.splitlines() if "mean_volume" in l]; ok(mv and float(mv[0].split(":")[1].split()[0]) > -60, f"…com som ({mv[0].split(']')[-1].strip() if mv else '?'})")
        pg.click("#veFecharSaida"); pg.wait_for_timeout(200)
        # sequência JPEG 0–1 s a 12 fps → zip
        pg.evaluate("window.__veSaida=null"); pg.click("#veExportar"); pg.click('[data-exaba="seq"]'); pg.click('[data-seq="jpg"]')
        pg.select_option("#veExSFps", "12"); pg.fill("#veExDe", "0"); pg.fill("#veExAte", "1"); pg.locator("#veExAte").dispatch_event("change"); pg.click("#veExIr")
        pg.wait_for_function("window.__veSaida && window.__veSaida.quadros", timeout=60000)
        f4 = baixar(pg, "window.__veSaida.blob", f"{S}/seq{W}.zip"); z = zipfile.ZipFile(f4); nomes = z.namelist()
        ok(len(nomes) == 12 and all(n.endswith(".jpg") for n in nomes), f"SEQUÊNCIA: 12 JPEG no .zip ({len(nomes)})")
        from PIL import Image
        im = Image.open(io.BytesIO(z.read(nomes[5]))); tr = tuple(pg.evaluate("__video.tamReal()")); ok(im.size == tr, f"…no tamanho do projeto ({im.size} = {tr})")
        # limpar cache
        pg.click("#veLimparBt"); pg.wait_for_selector("#veJanLimpar"); pg.check('#veJanLimpar input[value="px"]'); pg.click("#veLpIr"); pg.wait_for_timeout(800)
        ok(pg.evaluate("Object.keys(__video.PX).length") == 0 and "PROXY" not in pg.inner_text("#veLib"), "4) LIMPAR CACHE apagou os proxies")
        pg.click("#veCfgBt"); pg.wait_for_selector("#veJanCfg"); ok(pg.locator("#veJanCfg .ve-cfgl").count() == 4, "⚙ ONDE SALVAR: projeto, cache, exportação e proxy"); pg.keyboard.press("Escape")
        ok(not pg.locator("#veJanCfg").count(), "Esc fecha a janela")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem rolagem lateral")
        ok(not er, f"0 erros de JS {er[:2]}")
        pg.evaluate("indexedDB.deleteDatabase('bw_video')"); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"FALHAS: {len(falhas)}\n  - " + "\n  - ".join(falhas)))
