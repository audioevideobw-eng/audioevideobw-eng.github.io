#!/usr/bin/env python3
"""Teste local do LAYOUT do EDITOR DE VÍDEO (21/11): prévia no CENTRO e grande, painéis que recolhem (◧ ◨), TELA GRANDE (⛶ / Esc),
divisa arrastável entre prévia e linha do tempo, camadas vazias escondidas (☰ CAMADAS mostra todas), painel de ajustes que reabre ao
escolher um clipe, escolha guardada no aparelho; no celular nada disso aparece e não há estouro.
Telas: 1534×816 (a do dono: 1920×1020 a 125%), 1280×900 e 390×844.   Uso (na raiz): python3 docs/testes/teste_video_layout.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video"; PORTA = 8855
if not os.path.exists(f"{TMP}/clipe.webm"):
    os.makedirs(TMP, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=3", "-f", "lavfi", "-i", "sine=frequency=440:duration=3", "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libvorbis", f"{TMP}/clipe.webm"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=880:duration=2", f"{TMP}/musica.wav"], check=True)
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
R = "(s=>{const e=document.querySelector(s);if(!e||!e.offsetParent)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})"
VIS = "[...document.querySelectorAll('.ve-faixa')].filter(e=>e.offsetParent).map(e=>e.dataset.trilha)"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1534, 816), (1280, 900), (390, 844)):
        print(f"\n=== {largura}×{altura} ==="); cel = largura < 1100
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate(VIS) == ["v1"], f"linha do tempo vazia mostra só a camada VÍDEO {pg.evaluate(VIS)}")
        pg.set_input_files("#veArq", [f"{TMP}/clipe.webm", f"{TMP}/musica.wav"]); pg.wait_for_function("Object.keys(__video.MID).length === 2", timeout=15000); pg.wait_for_timeout(300)
        for t in ("video", "audio"):
            pg.evaluate(f"document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.tipo === '{t}').id + '\"]').click()"); pg.wait_for_timeout(250)
        ok(pg.evaluate(VIS) == ["v1", "a1"], f"com um vídeo e uma música aparecem só as 2 camadas com conteúdo {pg.evaluate(VIS)}")
        pg.evaluate("__video.sel(null)"); pg.wait_for_timeout(200)
        ok("O PROJETO" in pg.inner_text("#vePropCorpo") and "Clipes" in pg.inner_text("#vePropCorpo"), "sem clipe escolhido o painel mostra o PROJETO (tamanho, duração, clipes)")
        if cel:
            ok(pg.evaluate(R + "('.bw-abas')") is None and pg.evaluate(R + "('.bw-topo')") is None and pg.evaluate(R + "('#bwFocoVoltar')") is not None, "MODO FOCO no celular: sem topo e sem abas de baixo, só a setinha")
            ok(pg.evaluate(R + "('#veTogEsq')") is None and pg.evaluate(R + "('#veDiv')") is None, "no celular não há botões de painel nem divisa (a prévia já fica presa no topo)")
            pal, mid = pg.evaluate(R + "('.ve-palco')"), pg.evaluate(R + "('#veMidia')")
            ok(pal and mid and pal[1] < mid[1], "no celular a prévia continua antes da mídia")
        else:
            esq, pal, dirr, cvr, tl = (pg.evaluate(R + f"('{s}')") for s in ("#veEsq", ".ve-palco", "#veProp", "#veCv", "#veTl"))
            ok(esq[0] < pal[0] < dirr[0] and abs(esq[1] - pal[1]) < 4 and abs(dirr[1] - pal[1]) < 4, f"mídia à esquerda, PRÉVIA NO CENTRO, ajustes à direita, na mesma linha (x = {esq[0]}, {pal[0]}, {dirr[0]})")
            ok(pal[2] > esq[2] and pal[2] > dirr[2] and cvr[3] >= 250, f"a prévia é a maior das três colunas ({pal[2]} px contra {esq[2]} e {dirr[2]}; vídeo com {cvr[3]} px de altura)")
            ok(tl[1] + tl[3] <= altura + 2 and cvr[1] + cvr[3] <= tl[1] + 2, "prévia e linha do tempo cabem na tela sem rolar a página")
            pb = pg.evaluate(R + "('#vePlay')"); ok(pb and pb[1] + pb[3] <= pal[1] + pal[3] + 1 and pg.evaluate(R + "('#veCv')")[1] >= pal[1], f"os botões da prévia ficam inteiros dentro do palco mesmo depois de nascer uma camada nova (botão até {pb[1] + pb[3]}, palco até {pal[1] + pal[3]})")
            # MODO FOCO: sem menu lateral, sem topo; só a setinha de voltar
            ok(pg.evaluate(R + "('.bw-menu')") is None and pg.evaluate(R + "('.bw-topo')") is None and pg.evaluate(R + "('#bwFocoVoltar')") is not None and pal[0] < 420, f"MODO FOCO: menu lateral e topo somem, fica a setinha de voltar (prévia começa em x = {pal[0]})")
            # CRIAR não ocupa lugar: abre pelo botão e fecha de novo
            ok(pg.evaluate(R + "('#veCriar')") is None, "a caixa CRIAR não ocupa lugar: fica guardada no botão ✦ CRIAR")
            pg.click("#veCriarBt"); pg.wait_for_timeout(250); ok(pg.locator("#veCriarLista a").first.is_visible() and pg.locator("#veCriarLista a").count() >= 6, "✦ CRIAR abre os atalhos das ferramentas de criação")
            pg.click("#veCriarBt"); pg.wait_for_timeout(200); ok(pg.evaluate(R + "('#veCriar')") is None, "tocar de novo guarda")
            # largura das colunas por arraste; puxar até o fim esconde (sem ocupar lugar)
            pe = pg.evaluate(R + "('#vePuxaE')"); w0 = pg.evaluate(R + "('#veEsq')")[2]
            pg.mouse.move(pe[0] + 5, pe[1] + pe[3] / 2); pg.mouse.down(); pg.mouse.move(pe[0] + 5 + 80, pe[1] + pe[3] / 2, steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
            w1 = pg.evaluate(R + "('#veEsq')")[2]; ok(abs(w1 - (w0 + 80)) <= 6, f"arrastar a beirada da prévia alarga a MÍDIA ({w0} → {w1} px)")
            pe = pg.evaluate(R + "('#vePuxaE')"); pg.mouse.move(pe[0] + 5, pe[1] + pe[3] / 2); pg.mouse.down(); pg.mouse.move(pe[0] + 5 - w1 + 40, pe[1] + pe[3] / 2, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
            pz = pg.evaluate(R + "('.ve-palco')"); ok(pg.evaluate(R + "('#veEsq')") is None and pz[2] > pal[2] + 150, f"puxar até o fim ESCONDE a mídia e o lugar vai todo para a prévia ({pal[2]} → {pz[2]} px)")
            pg.dblclick("#vePuxaE"); pg.wait_for_timeout(300); ok(abs(pg.evaluate(R + "('#veEsq')")[2] - w0) <= 4, "dois toques na beirada volta à largura padrão")
            RF = "(()=>{const e=document.getElementById('veProp');if(!e.getClientRects().length)return null;const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]})()"
            # DESCOLAR: o painel vira janela solta (arrasta, estica), a prévia ganha o lugar dele; ⇲ encaixa de novo
            pp0 = pg.evaluate(R + "('.ve-palco')"); pg.click('#veProp [data-solta="dir"]'); pg.wait_for_timeout(300)
            fl = pg.evaluate(RF); pp1 = pg.evaluate(R + "('.ve-palco')")
            ok(pg.evaluate("getComputedStyle(document.getElementById('veProp')).position") == "fixed" and pp1[2] > pp0[2] + 150, f"⇱ descola os AJUSTES: viram janela solta e a prévia ocupa o lugar ({pp0[2]} → {pp1[2]} px)")
            pg.mouse.move(fl[0] + 60, fl[1] + 16); pg.mouse.down(); pg.mouse.move(fl[0] + 60 - 300, fl[1] + 16 + 120, steps=6); pg.mouse.up(); pg.wait_for_timeout(250)
            fl2 = pg.evaluate(RF); ok(abs(fl2[0] - (fl[0] - 300)) <= 6 and abs(fl2[1] - (fl[1] + 120)) <= 6, f"a janela solta vai para onde eu arrasto ({fl[0]},{fl[1]} → {fl2[0]},{fl2[1]})")
            pg.evaluate("(()=>{const e=document.getElementById('veProp');e.style.width='420px';e.style.height='300px'})()"); pg.wait_for_timeout(400)
            ok(abs(pg.evaluate("__veVista.estado().solto.dir.w") - 420) <= 4 and pg.evaluate("getComputedStyle(document.getElementById('veProp')).resize") == "both", "a janela solta estica pelo canto e o tamanho fica guardado")
            pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600)
            fl3 = pg.evaluate(RF); ok(fl3 and abs(fl3[0] - fl2[0]) <= 6 and abs(fl3[2] - 420) <= 6, "recarregou: a janela solta volta no mesmo lugar e tamanho")
            pg.click('#veProp [data-solta="dir"]'); pg.wait_for_timeout(300)
            ok(pg.evaluate("getComputedStyle(document.getElementById('veProp')).position") != "fixed" and abs(pg.evaluate(R + "('.ve-palco')")[2] - pp0[2]) <= 6, "⇲ encaixa de novo no lugar")
            pg.click('#veEsq [data-some="esq"]'); pg.wait_for_timeout(250); ok(pg.evaluate(R + "('#veEsq')") is None, "✕ do painel esconde (não ocupa lugar)"); pg.click("#veTogEsq"); pg.wait_for_timeout(250)
            pg.click("#veTlMin"); pg.wait_for_timeout(300); tm = pg.evaluate(R + "('#veTl')")
            ok(pg.evaluate(R + "('.ve-tl-corpo')") is None and tm[3] < 112 and pg.evaluate(R + "('#veCv')")[3] > cvr[3], f"▾ LINHA DO TEMPO guarda as camadas (fica só a barra, {tm[3]} px) e a prévia cresce")
            pg.click("#veTlMin"); pg.wait_for_timeout(300)
            # LINHA DO TEMPO também descola e some (painéis livres do bw-ferramentas)
            pg.click('#veTl .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(300)
            ok(pg.evaluate("getComputedStyle(document.getElementById('veTl')).position") == "fixed" and pg.evaluate(R + "('#veCv')")[3] > cvr[3], "⇱ na LINHA DO TEMPO: ela vira janela solta e a prévia cresce")
            pg.click('#veTl .bwf-pega [data-bwf-p="solta"]'); pg.wait_for_timeout(300); pg.click('#veTl .bwf-pega [data-bwf-p="some"]'); pg.wait_for_timeout(300)
            ok(pg.evaluate("document.getElementById('veTl').getBoundingClientRect().height") <= 20 and pg.locator('#veTl > .bwf-borda-bt').is_visible(), "✕ esconde a linha do tempo: fica só uma BORDA embaixo")
            pg.click('#veTl > .bwf-borda-bt'); pg.wait_for_timeout(300); ok(pg.evaluate("getComputedStyle(document.getElementById('veTl')).position") != "fixed" and pg.evaluate("document.getElementById('veTl').getClientRects().length") > 0, "＋ traz de volta, encaixada")
            # BARRA DE CORTE e MENU DO TAKE: aparar até a agulha, copiar/colar ajustes, desativar
            vid = pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').id"); pg.evaluate(f"__video.sel('{vid}'); __video.irPara(1)"); pg.click("#veApFim"); pg.wait_for_timeout(250)
            ok(abs(pg.evaluate(f"__video.P().clips.find(c=>c.id==='{vid}').dur") - 1) < 0.06 and pg.evaluate("__video.P().clips.filter(c=>c.tipo==='video').length") == 1, "[⇥ corta o fim do take na agulha (sobra 1 s, sem pedaço solto)")
            pg.evaluate("__video.irPara(0.4)"); pg.click("#veApIni"); pg.wait_for_timeout(250); cc = pg.evaluate("__video.P().clips.find(c=>c.tipo==='video')")
            ok(abs(cc["dur"] - 0.6) < 0.06 and cc["ini"] == 0 and abs(cc["corte"] - 0.4) < 0.06, f"⇤] corta o começo até a agulha e puxa o take para o lugar (ini {cc['ini']}, dur {cc['dur']}, corte {cc['corte']})")
            pg.click("#veDesf"); pg.wait_for_timeout(250); ok(abs(pg.evaluate("__video.P().clips.find(c=>c.tipo==='video').dur") - 1) < 0.06, "↶ da barra desfaz")
            pg.evaluate("(()=>{const P=__video.P(),v=P.clips.find(c=>c.tipo==='video');v.vol=40;v.fout=0.5;v.efeito=Object.keys({pb:1})[0];v.esc=70;__video.sel(v.id)})()"); pg.keyboard.press("Control+Shift+C")
            aud = pg.evaluate("__video.P().clips.find(c=>c.tipo==='audio').id"); pg.evaluate(f"__video.sel('{aud}')"); pg.keyboard.press("Control+Shift+V"); pg.wait_for_timeout(250); ca = pg.evaluate("__video.P().clips.find(c=>c.tipo==='audio')")
            ok(ca["vol"] == 40 and ca["fout"] == 0.5 and ca.get("esc") != 70 and not ca.get("efeito"), "Ctrl+Shift+C / Ctrl+Shift+V: o som e a saída suave do vídeo vão para a música; tamanho e efeito (de imagem) não")
            pg.locator(f'[data-clip="{aud}"]').click(button="right", position={"x": 30, "y": 20}); pg.wait_for_timeout(300); mt = pg.inner_text(".bwf-menu").lower()
            ok("copiar ajustes" in mt and "colar ajustes" in mt and "som do take" in mt and "desativar" in mt and "cortar o fim" in mt, "botão direito no take: copiar/colar ajustes, som do take, desativar, cortar até a agulha")
            pg.keyboard.press("Escape"); pg.keyboard.press("Shift+E"); pg.wait_for_timeout(200); ok(pg.evaluate("__video.P().clips.find(c=>c.tipo==='audio').off") == 1, "Shift+E desativa o take (fica na linha do tempo, apagado)"); pg.keyboard.press("Shift+E")
            with ctx.expect_page() as jan: pg.click("#veSegunda")
            j = jan.value; j.wait_for_timeout(900)
            ok(j.evaluate("(()=>{const v=document.querySelector('video');return !!(v&&v.srcObject&&v.srcObject.getVideoTracks().length)})()") and pg.get_attribute("#veSegunda", "aria-pressed") == "true", "🖥 PRÉVIA EM OUTRA TELA abre uma janela com a prévia ao vivo")
            pg.click("#veSegunda"); pg.wait_for_timeout(1200); ok(j.is_closed() and pg.get_attribute("#veSegunda", "aria-pressed") == "false", "tocar de novo fecha a janela")
            pg.click("#bwFocoMenu"); pg.wait_for_timeout(300); ok(pg.evaluate(R + "('.bw-topo')") is not None, "☰ traz os menus de volta nesta visita")
            pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600); pal = pg.evaluate(R + "('.ve-palco')")
            pg.click("#veTogEsq"); pg.wait_for_timeout(300); p2 = pg.evaluate(R + "('.ve-palco')")
            ok(pg.evaluate(R + "('#veEsq')") is None and p2[2] > pal[2] + 200, f"◧ esconde a mídia e a prévia cresce ({pal[2]} → {p2[2]} px)")
            pg.click("#veTogDir"); pg.wait_for_timeout(300); p3 = pg.evaluate(R + "('.ve-palco')")
            ok(pg.evaluate(R + "('#veProp')") is None and p3[2] > p2[2] + 200, f"◨ esconde os ajustes e a prévia cresce de novo ({p3[2]} px)")
            vc = pg.evaluate("__video.P().clips.find(c => c.tipo === 'video').id"); pg.evaluate(f"__video.sel('{vc}')"); pg.wait_for_timeout(300)
            ok(pg.evaluate(R + "('#veProp')") is not None, "escolher um clipe traz o painel de AJUSTES de volta sozinho")
            pg.click("#veTogEsq"); pg.wait_for_timeout(250)
            h0 = pg.evaluate(R + "('#veCv')")[3]; pg.click("#veCheia"); pg.wait_for_timeout(350); h1 = pg.evaluate(R + "('#veCv')")[3]
            ok(pg.evaluate(R + "('#veEsq')") is None and pg.evaluate(R + "('#veProp')") is None and h1 > h0 and pg.evaluate(R + "('#veTl')")[3] <= 100, f"⛶ TELA GRANDE: painéis somem, linha do tempo mínima, vídeo maior ({h0} → {h1} px)")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            ok(pg.evaluate(R + "('#veEsq')") is not None and pg.evaluate(R + "('#veProp')") is not None, "Esc volta ao layout de antes")
            d = pg.evaluate(R + "('#veDiv')"); t0 = pg.evaluate(R + "('#veTl')")[3]; c0 = pg.evaluate(R + "('#veCv')")[3]
            pg.mouse.move(d[0] + d[2] / 2, d[1] + 6); pg.mouse.down(); pg.mouse.move(d[0] + d[2] / 2, d[1] + 6 - 90, steps=5); pg.mouse.up(); pg.wait_for_timeout(350)
            t1 = pg.evaluate(R + "('#veTl')")[3]; c1 = pg.evaluate(R + "('#veCv')")[3]
            ok(t1 > t0 + 60 and c1 < c0, f"arrastar a divisa para cima dá mais linha do tempo ({t0} → {t1} px) e a prévia encolhe ({c0} → {c1} px)")
            pg.click("#veTodas"); pg.wait_for_timeout(200)
            ok(len(pg.evaluate(VIS)) == 5, "☰ CAMADAS mostra as 5 camadas, inclusive as vazias")
            pg.wait_for_timeout(300); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(700)
            est = pg.evaluate("__veVista.estado()")
            ok(est["todas"] is True and est["tl"] > 0 and abs(pg.evaluate(R + "('#veTl')")[3] - t1) < 6, f"recarregou: a escolha (camadas e altura da linha do tempo) ficou guardada {est}")
            pg.dblclick("#veDiv"); pg.wait_for_timeout(250); pg.click("#veTodas"); pg.wait_for_timeout(200)
            ok(pg.evaluate("__veVista.estado().tl") == 0 and len(pg.evaluate(VIS)) == 2, "dois toques na divisa volta ao tamanho padrão; ☰ CAMADAS de novo esconde as vazias")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem estouro na tela")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        ok(not erros, f"0 erros de JavaScript {erros[:2]}")
        if largura == 1534: pg.evaluate(f"__video.sel(__video.P().clips.find(c => c.tipo === 'video').id); __video.irPara(1)"); pg.wait_for_timeout(900); pg.screenshot(path="/tmp/ve_layout.png")
        pg.evaluate("indexedDB.deleteDatabase('bw_video'); localStorage.removeItem('ui_ve_vista')"); ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
raise SystemExit(1 if falhas else 0)
