#!/usr/bin/env python3
"""Teste do GERAR VÍDEO NESTE APARELHO (BW Reels Pro): gera um MP4 de verdade no navegador (WebCodecs) em 390 px e confere com ffprobe:
vídeo H.264 no tamanho pedido, duração certa, trilha de som, e quadros com conteúdo (não pretos). Também: cancelar, e filmagem → manda para o PC.
Uso (na raiz): python3 docs/testes/teste_reels_celular.py"""
import base64, json, os, subprocess, sys
__file__ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_reels.py")
exec(open(__file__).read().split("falhas = []")[0])
from playwright.sync_api import sync_playwright
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SAIDA = os.path.join(TMP, "celular.mp4")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
    pg.goto(BASE + "reels.html"); pg.wait_for_timeout(1500)
    pg.click('#glCats [data-cat="graf"]'); pg.wait_for_timeout(300); pg.click('#glGrade [data-usar="checklist"]'); pg.wait_for_timeout(1200)
    pg.evaluate("document.querySelector('[data-aba=\"exportar\"]').click()"); pg.wait_for_timeout(400)
    ok(pg.is_enabled("#btAqui") and pg.input_value("#fQualAqui") == "1280", "botão GERAR VÍDEO NESTE APARELHO ligado; qualidade Rápida marcada")
    dur = pg.evaluate("(() => { const M = window.BWReelsMotor; return M.criarPlano(JSON.parse(JSON.stringify(BWReels.projeto().roteiro))).duracao; })()")
    pg.click("#btAqui"); pg.wait_for_selector("#aquiBarra"); pg.wait_for_timeout(1500); pg.click("#btAqui")
    pg.wait_for_function("document.querySelector('#aquiEstado').textContent.includes('Cancelado')", timeout=30000)
    ok(True, "CANCELAR no meio para e avisa")
    pg.click("#btAqui"); pg.wait_for_selector("#aquiVideo", timeout=600000)
    txt = pg.inner_text("#aquiEstado"); print("   ", txt.split("\n")[0])
    dados = pg.evaluate("fetch(document.querySelector('#aquiVideo').src).then(r => r.arrayBuffer()).then(b => { let s = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); })")
    open(SAIDA, "wb").write(base64.b64decode(dados))
    info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", SAIDA], capture_output=True, text=True).stdout or "{}")
    v = next((s for s in info.get("streams", []) if s["codec_type"] == "video"), None); a = next((s for s in info.get("streams", []) if s["codec_type"] == "audio"), None)
    ok(v and v["codec_name"] == "h264" and v["width"] == 720 and v["height"] == 1280, f"MP4 com vídeo H.264 720 × 1280 ({v and v['codec_name']}, {v and v['width']}x{v and v['height']})")
    ok(v and abs(float(info["format"]["duration"]) - dur) < 0.3 and abs(int(v["nb_frames"]) - round(dur * 30)) <= 1, f"duração {info.get('format', {}).get('duration')} s para {dur:.1f} s de roteiro; {v and v['nb_frames']} quadros")
    ok(a is not None and float(a["duration"]) > dur - 1, f"trilha de som presente ({a and a['codec_name']}, {a and a['duration']} s)")
    dec = subprocess.run(["ffmpeg", "-v", "error", "-i", SAIDA, "-f", "null", "-"], capture_output=True, text=True)
    ok(dec.returncode == 0 and not dec.stderr.strip(), "o arquivo decodifica inteiro sem erro " + dec.stderr[:120])
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", SAIDA, "-vf", "fps=1/2.4,scale=180:-1,tile=6x1", "-frames:v", "1", os.path.join(TMP, "celular-folha.png")])
    vol = subprocess.run(["ffmpeg", "-v", "info", "-i", SAIDA, "-af", "volumedetect", "-vn", "-f", "null", "-"], capture_output=True, text=True).stderr
    ok("mean_volume" in vol and "mean_volume: -91" not in vol, "o som não é silêncio (" + (vol.split("mean_volume:")[1].split("\n")[0].strip() if "mean_volume" in vol else "?") + ")")
    ok(pg.locator("#aquiBaixar").get_attribute("download").endswith(".mp4"), "botão SALVAR VÍDEO com nome .mp4")
    ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0, "sem estouro horizontal em 390 px")
    ok(pg.is_visible("#btEnviarPC"), "no celular aparece ENVIAR PARA O PC")
    pg.click("#btEnviarPC"); pg.wait_for_timeout(1200)
    ok(pg.evaluate("!!BWReels.projeto().paraPC && BWReels.conta().some(p => p.id === BWReels.projeto().id && p.paraPC)") and "Na fila do computador" in pg.inner_text("#enviarPCEstado"), "ENVIAR PARA O PC põe o reel na fila da conta e avisa")
    pg.click("#btTirarFila"); pg.wait_for_timeout(400)
    ok(pg.evaluate("!BWReels.projeto().paraPC"), "TIRAR DA FILA desfaz")
    ok(not erros, f"nenhum erro de JS {erros}")
    ctx.close(); b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); sys.exit(1 if falhas else 0)
