"""★ MINHA PASTA no editor de vídeo (23/11): a biblioteca que a pessoa já tem no PC aparece por subpastas, só leitura, nada sai do aparelho.
O seletor de pasta do sistema não abre no teste: usa-se uma pasta de verdade do navegador (OPFS) no lugar de showDirectoryPicker."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8911"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
MONTA = """async () => { const r = await navigator.storage.getDirectory(); try { await r.removeEntry('BIB', {recursive:true}); } catch(e){}
  const b = await r.getDirectoryHandle('BIB', {create:true}), s = await b.getDirectoryHandle('02 SFX', {create:true}), o = await b.getDirectoryHandle('05 OVERLAYS', {create:true});
  const grava = async (d, n, blob) => { const f = await d.getFileHandle(n, {create:true}), w = await f.createWritable(); await w.write(blob); await w.close(); };
  const sr = 8000, n = sr/2, buf = new ArrayBuffer(44+n*2), v = new DataView(buf); const t=(p,x)=>{for(let i=0;i<x.length;i++)v.setUint8(p+i,x.charCodeAt(i))};
  t(0,'RIFF'); v.setUint32(4,36+n*2,true); t(8,'WAVEfmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); t(36,'data'); v.setUint32(40,n*2,true);
  for (let i=0;i<n;i++) v.setInt16(44+i*2, Math.sin(i/6)*9000, true);
  for (const nm of ['whoosh 01.wav','whoosh 02.wav','impacto.wav']) await grava(s, nm, new Blob([buf], {type:'audio/wav'}));
  const c = document.createElement('canvas'); c.width = 64; c.height = 36; const x = c.getContext('2d'); x.fillStyle = '#e02020'; x.fillRect(0,0,64,36);
  await grava(o, 'leak vermelho.png', await new Promise(k => c.toBlob(k, 'image/png')));
  await grava(b, 'titulo.mogrt', new Blob(['x'])); await grava(b, 'projeto.prproj', new Blob(['x']));
  window.__saidas = []; const of = window.fetch; window.fetch = function (u) { window.__saidas.push(String(u)); return of.apply(this, arguments); };
  window.showDirectoryPicker = async () => b; return true; }"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for larg, alt in ((1534, 816),):
        ctx = b.new_context(viewport={"width": larg, "height": alt}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.evaluate(MONTA)
        ok(pg.locator('#veAbas [data-aba="pasta"]').count() == 1, "a aba Mídia tem ★ Minha pasta")
        pg.click('#veAbas [data-aba="pasta"]'); pg.wait_for_timeout(200)
        ok(pg.locator('#veLib [data-pfa="escolher"]').is_visible(), "sem pasta: botão ESCOLHER MINHA PASTA")
        pg.click('#veLib [data-pfa="escolher"]'); pg.wait_for_selector("#veLib [data-pfd]", timeout=5000)
        ok(pg.locator("#veLib [data-pfd]").count() == 2 and pg.locator("#veLib [data-pf]").count() == 0, "mostra as 2 subpastas")
        ok("2 arquivo" in pg.inner_text("#veLib"), "avisa que arquivos de outros programas (.mogrt, .prproj) não aparecem")
        pg.click("#veLib [data-pfd] >> nth=0"); pg.wait_for_selector("#veLib [data-pf]", timeout=5000)
        ok(pg.locator("#veLib [data-pf]").count() == 3, "abre 02 SFX com os 3 sons")
        pg.fill("#vePfBusca", "whoosh"); pg.wait_for_timeout(150)
        ok(pg.locator("#veLib [data-pf]").count() == 2 and pg.evaluate("document.activeElement.id") == "vePfBusca", "procurar filtra pelo nome sem perder o campo")
        pg.click("#veLib [data-pfouvir] >> nth=0"); pg.wait_for_timeout(250)
        ok(pg.locator("#veLib .ve-pfo.on").count() == 1, "▶ toca a prévia do som")
        n0 = pg.evaluate("__video.P().clips.length"); pg.click("#veLib [data-pf] >> nth=0"); pg.wait_for_function(f"__video.P().clips.length === {n0 + 1}", timeout=15000)
        c = pg.evaluate("(()=>{const c=__video.P().clips.slice(-1)[0];return [c.tipo||__video.MID[c.mid].tipo, c.trilha]})()")
        ok(c[0] == "audio" and c[1].startswith("a"), f"tocar no som põe na linha do tempo, numa camada de som ({c})")
        ok(pg.locator('#veAbas [data-aba="pasta"].on').count() == 1 and pg.locator("#veLib [data-pf]").count() >= 2, "continua na pasta depois de pôr o som")
        pg.click('#veLib [data-pfa="voltar"]'); pg.wait_for_selector("#veLib [data-pfd]"); pg.click("#veLib [data-pfd] >> nth=1"); pg.wait_for_selector("#veLib [data-pf]")
        pg.wait_for_selector("#veLib [data-pfimg] img", timeout=5000); ok(True, "imagem ganha miniatura só quando aparece")
        n0 = pg.evaluate("__video.P().clips.length"); pg.click("#veLib [data-pf] >> nth=0"); pg.wait_for_function(f"__video.P().clips.length === {n0 + 1}", timeout=15000)
        ok(pg.evaluate("__video.P().clips.slice(-1)[0].trilha").startswith("v"), "tocar na imagem põe numa camada de vídeo")
        ok(pg.evaluate("window.__saidas.filter(u => !/^(blob:|data:)/.test(u)).length") == 0, "nada saiu do aparelho")
        pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.click('#veAbas [data-aba="pasta"]'); pg.wait_for_timeout(600)
        ok(pg.locator("#veLib [data-pfd], #veLib [data-pfa='liberar']").count() >= 1, "ao reabrir, a pasta escolhida é lembrada")
        ok(not er, "sem erro de JavaScript " + str(er[:2]))
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro")
        pg.screenshot(path="/tmp/pasta.png"); ctx.close()
    b.close()
print("✅ 0 falhas" if not F[0] else "❌ %d falha(s)" % F[0]); sys.exit(1 if F[0] else 0)
