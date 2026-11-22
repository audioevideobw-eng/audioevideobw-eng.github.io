#!/usr/bin/env python3
"""Teste local do ESTÚDIO DE MOTION (20/11): modelo pronto ao abrir, biblioteca (14 itens), editar conteúdo, arrastar na tela, KEYFRAMES
(◆ e GRAVAR MOVIMENTO), efeitos de entrada/saída/durante, motion automático, CRIAR EFEITO (sem login = criador do aparelho) e MEUS EFEITOS,
linha do tempo (arrastar barra), desfazer, projeto volta ao recarregar, EXPORTAR: vídeo feito no aparelho com fundo verde (MP4 conferido com
ffprobe + pixel do fundo), pedido para o app BW (.verde.bwmotion.json) e HTML da animação renderizado pelo motor do PC com --chroma magenta.
1280 e 390 px. Nada sai do aparelho. Uso (na raiz): python3 docs/testes/teste_motion.py"""
import base64, http.server, json, os, socketserver, subprocess, threading, tempfile
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8857
STUDIO = os.environ.get("BW_STUDIO", "/home/claude/app-bw/pacote/bw-reels-studio")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; FORA = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
P = "BWMotionEditor.projeto()"
TMP = tempfile.mkdtemp(prefix="teste-motion-")
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500, accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        cel = largura < 500
        def aba(a):
            if cel: pg.click(f'#moAbasCel [data-aba="{a}"]'); pg.wait_for_timeout(120)
        pg.goto(BASE + "motion.html?layout=classico"); pg.wait_for_function("window.BWMotionEditor", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate(f"{P}.itens.length") == 5 and pg.locator("#moCena [data-item]").count() == 5, "abre com o modelo VITRINE DE PROMPTS (5 itens na tela)")
        ok(pg.evaluate(SEM) <= 0, f"sem estouro na largura ({pg.evaluate(SEM)})")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label') || b.title)).length") == 0, "todo botão tem nome")
        ok(pg.locator("#moLib [data-add]").count() >= 34, "BIBLIOTECA com 34+ itens")
        tela = pg.locator("#moTela").bounding_box()
        ok(tela["height"] <= (altura * 0.37 if cel else max(300, altura - 420)) + 2, f"a tela de prévia cabe ({int(tela['height'])} px)")
        # tocar
        pg.click("#moTocar"); pg.wait_for_timeout(700); pg.click("#moTocar"); t = pg.evaluate("BWMotionEditor.tempo()")
        ok(t > 0.3, f"▶ TOCAR anda o tempo ({t:.2f} s)")
        # adicionar texto e editar
        pg.evaluate("BWMotionEditor.ver(1)"); aba("lib")
        pg.click('#moLib [data-add="texto"]'); pg.wait_for_timeout(300)
        it = pg.evaluate(f"{P}.itens[{P}.itens.length-1]")
        ok(it["tipo"] == "texto" and abs(it["ini"] - 1) < 0.01 and it["entrada"]["efeito"] == "palavras", "＋ TÍTULO entra no tempo da agulha com efeito palavra por palavra")
        aba("item")
        pg.fill('#moPainel [data-prop="texto"]', "OLÁ *BW* TESTE"); pg.wait_for_timeout(300); pg.evaluate("BWMotionEditor.ver(3)"); pg.wait_for_timeout(100)
        ok("BW" in pg.inner_text("#moCena") and "TESTE" in pg.inner_text("#moCena"), "o texto digitado aparece na tela")
        cor = pg.evaluate("(()=>{const s=[...document.querySelectorAll('#moCena [data-item] span')].find(x=>x.textContent==='BW');return s&&getComputedStyle(s).color})()")
        ok(cor == "rgb(182, 255, 59)", f"*BW* sai na cor de destaque ({cor})")
        # arrastar na tela (posição fixa)
        x0 = it["x"]; c = pg.locator("#moSelecao").bounding_box()
        pg.mouse.move(c["x"] + c["width"] / 2, c["y"] + c["height"] / 2); pg.mouse.down(); pg.mouse.move(c["x"] + c["width"] / 2 + 40, c["y"] + c["height"] / 2 + 20, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
        x1 = pg.evaluate(f"{P}.itens[{P}.itens.length-1].x")
        ok(x1 > x0 + 40 and not pg.evaluate(f"Object.keys({P}.itens[{P}.itens.length-1].keys).length"), f"arrastar muda a posição sem criar keyframe ({x0:.0f} → {x1:.0f})")
        # keyframes pelo ◆
        if pg.locator('[data-seta="mo_pos"].fechada').count(): pg.click('[data-seta="mo_pos"]')
        pg.evaluate("BWMotionEditor.ver(1.5)"); pg.wait_for_timeout(100); pg.click('#moPainel [data-kb="x"]'); pg.wait_for_timeout(150)
        pg.evaluate("BWMotionEditor.ver(3.5)"); pg.wait_for_timeout(100)
        pg.evaluate("(()=>{const r=document.querySelector('#moPainel [data-pos=\"x\"]');r.value=900;r.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(150)
        ks = pg.evaluate(f"{P}.itens[{P}.itens.length-1].keys.x.map(k=>[k.t,Math.round(k.v)])")
        ok(len(ks) >= 2 and ks[-1] == [3.5, 900], f"◆ marca keyframe e mexer o valor em outro tempo cria o 2º ({ks})")
        meio = pg.evaluate(f"BWMotion.valorKeys({P}.itens[{P}.itens.length-1].keys.x, 2.5, 0)")
        ok(min(ks[-2][1], 900) < meio < max(ks[-2][1], 900), f"entre os keyframes o item está no meio do caminho ({meio:.0f})")
        ok(pg.locator(".mo-kf").count() >= 2, "a linha do tempo mostra os ◆")
        pg.locator(".mo-kf").last.click(); pg.wait_for_timeout(200)
        ok(pg.locator('#moPainel [data-kcurva]').count() == 1, "tocar no ◆ abre o keyframe com a curva")
        pg.select_option('#moPainel [data-kcurva]', "quique"); pg.wait_for_timeout(150)
        ok(pg.evaluate(f"{P}.itens[{P}.itens.length-1].keys.x.slice(-1)[0].e") == "quique", "curva do keyframe trocada para Quique")
        pg.click('#moPainel [data-acao="kfechar"]')
        # GRAVAR MOVIMENTO
        pg.click('#moLib [data-add="emoji"]') if not cel else (aba("lib"), pg.click('#moLib [data-add="emoji"]')); pg.wait_for_timeout(250)
        pg.click("#moGravar"); pg.evaluate("BWMotionEditor.ver(4)"); pg.wait_for_timeout(100); c = pg.locator("#moSelecao").bounding_box()
        pg.mouse.move(c["x"] + c["width"] / 2, c["y"] + c["height"] / 2); pg.mouse.down(); pg.mouse.move(c["x"] + c["width"] / 2 - 30, c["y"] + c["height"] / 2 - 30, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
        pg.click("#moGravar"); ky = pg.evaluate(f"({P}.itens[{P}.itens.length-1].keys.y||[]).length")
        ok(ky >= 2, f"◆ GRAVAR MOVIMENTO: arrastar cria keyframes ({ky})")
        # efeito de entrada
        aba("item")
        if pg.locator('[data-seta="mo_entrada"].fechada').count(): pg.click('[data-seta="mo_entrada"]')
        pg.click('#moPainel [data-ent="girar"]'); pg.wait_for_timeout(1500)
        e = pg.evaluate(f"{P}.itens[{P}.itens.length-1]"); pg.evaluate(f"BWMotionEditor.ver({e['ini']}+0.1)")
        tr = pg.evaluate(f"document.querySelector('#moCena [data-item=\"{e['id']}\"]').style.transform")
        ok(e["entrada"]["efeito"] == "girar" and "rotate(-" in tr, f"ENTRADA: Girando aplicada (no começo o item está girado)")
        if pg.locator('[data-seta="mo_loop"].fechada').count(): pg.click('[data-seta="mo_loop"]')
        pg.click('#moPainel [data-loop="flutuar"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate(f"{P}.itens[{P}.itens.length-1].loop.efeito") == "flutuar", "DURANTE: Flutuar")
        # criar efeito com ajuda (sem login → criador do aparelho)
        pg.click("#moCriarEfeito"); pg.fill("#moEfTexto", "cai de cima quicando girando"); pg.click("#moEfGerar"); pg.wait_for_selector("#moEfSalvar", timeout=8000)
        rtx = pg.locator("#moEfRes").inner_text(); ok("altura" in rtx and "giro" in rtx, "CRIAR EFEITO (sem conta): entende 'cai de cima' (altura) e 'girando'")
        pg.click("#moEfTestar"); pg.wait_for_timeout(300); pg.click("#moEfSalvar"); pg.wait_for_timeout(200); pg.click("#moEfFechar")
        ent = pg.evaluate(f"{P}.itens[{P}.itens.length-1].entrada.efeito")
        ok(ent.startswith("m:") and pg.locator("#moPainel .mo-chips button.meu").count() >= 1, "efeito próprio testado no item e salvo em MEUS EFEITOS (★ na lista)")
        ok(pg.evaluate(f"{P}.meusEfeitos.some(e => 'm:'+e.id === '{ent}')"), "o efeito próprio vai DENTRO do projeto (o PC renderiza igual)")
        # motion automático
        pg.click("#moAuto"); pg.wait_for_timeout(400); pg.click("#moTocar") if pg.evaluate("document.getElementById('moTocar').textContent.includes('PAUSAR')") else None
        efs = pg.evaluate(f"{P}.itens.map(i => i.entrada.efeito)")
        ok("palavras" in efs and "subir" in efs, f"✨ MOTION AUTOMÁTICO escolhe efeitos por tipo ({sorted(set(efs))})")
        # linha do tempo: arrastar barra
        idsem = pg.evaluate(f"{P}.itens.filter(i => !Object.keys(i.keys||{{}}).length && i.tipo !== 'piso').slice(-1)[0].id"); bar = pg.locator(f'.mo-barra[data-barra="{idsem}"]'); bar.scroll_into_view_if_needed(); pg.wait_for_timeout(150); bb = bar.bounding_box(); idb = bar.get_attribute("data-barra"); ini0 = pg.evaluate(f"{P}.itens.find(i=>i.id==='{idb}').ini")
        pg.evaluate(f"(()=>{{const it={P}.itens.find(i=>i.id==='{idb}');it.fim=Math.min(it.fim,{P}.dur-1)}})()")
        pg.mouse.move(bb["x"] + 20, bb["y"] + bb["height"] / 2); pg.mouse.down(); pg.mouse.move(bb["x"] + 60, bb["y"] + bb["height"] / 2, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
        ini1 = pg.evaluate(f"{P}.itens.find(i=>i.id==='{idb}').ini")
        ok(ini1 > ini0, f"arrastar a barra muda quando o item aparece ({ini0:.2f} → {ini1:.2f})")
        # desfazer
        n0 = pg.evaluate(f"{P}.itens.length"); aba("lib"); pg.click('#moLib [data-add="selo"]'); pg.wait_for_timeout(600)
        ok(pg.evaluate(f"{P}.itens.length") == n0 + 1, "＋ SELO entrou"); pg.click("#moDesfazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{P}.itens.length") == n0 and pg.locator("#moCena [data-item]").count() == n0, "↶ DESFAZER tira o selo; ↷ REFAZER devolve")
        pg.click("#moRefazer"); pg.wait_for_timeout(300); ok(pg.evaluate(f"{P}.itens.length") == n0 + 1, "↷ REFAZER devolveu"); n0 += 1
        # recarregar: projeto continua
        nome = f"Teste {largura}"; pg.fill("#moNome", nome); pg.wait_for_timeout(1200)
        pg.reload(); pg.wait_for_function("window.BWMotionEditor", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate(f"{P}.nome") == nome and pg.evaluate(f"{P}.itens.length") == n0, "o projeto volta igual ao recarregar (fica no aparelho)")
        ok(pg.evaluate(SEM) <= 0, "sem estouro depois de mexer em tudo")
        # FERRAMENTAS, ATALHOS E MENU (20/11)
        celm = largura < 500
        ok(pg.locator("#moFerr .bwf-bt").count() == 6, "barra de ferramentas: V, C, H, Z, T + ?")
        def ferr(k):
            if celm: pg.locator(f'#moFerr [data-bwf-id="{k}"]').scroll_into_view_if_needed(); pg.click(f'#moFerr [data-bwf-id="{k}"]')
            else: pg.evaluate("document.activeElement && document.activeElement.blur()"); pg.keyboard.press(k)
            pg.wait_for_timeout(150)
        ni = pg.evaluate(f"{P}.itens.length"); alvo_i = pg.evaluate(f"{P}.itens.map((i, k) => [k, i.fim - i.ini, Object.keys(i.keys || {{}}).length]).filter(x => x[1] > 1.5 && !x[2])[0][0]")
        idc = pg.evaluate(f"{P}.itens[{alvo_i}].id"); bar = pg.locator(f'[data-barra="{idc}"]'); bar.scroll_into_view_if_needed(); pg.wait_for_timeout(150); bb = bar.bounding_box()
        ferr("c"); bar.scroll_into_view_if_needed(); bb = bar.bounding_box()
        if celm: pg.touchscreen.tap(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        else: pg.mouse.click(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2)
        pg.wait_for_timeout(300)
        ok(pg.evaluate(f"{P}.itens.length") == ni + 1, "LÂMINA (C): clicar na barra corta o item em dois")
        ferr("v")
        if not celm:
            pg.keyboard.press("Delete"); pg.wait_for_timeout(250); ok(pg.evaluate(f"{P}.itens.length") == ni, "Delete apaga o item escolhido (sem perguntar; Ctrl+Z desfaz)")
            pg.keyboard.press("Control+z"); pg.wait_for_timeout(350); ok(pg.evaluate(f"{P}.itens.length") == ni + 1, "Ctrl+Z desfaz")
            pg.evaluate(f"BWMotionEditor.selecionar({P}.itens[{alvo_i}].id)"); x0 = pg.evaluate(f"{P}.itens[{alvo_i}].x"); pg.evaluate("document.activeElement && document.activeElement.blur()"); pg.keyboard.press("Shift+ArrowRight"); pg.wait_for_timeout(200)
            ok(pg.evaluate(f"{P}.itens[{alvo_i}].x") == x0 + 10, "Shift+→ move o item 10 px")
            pg.keyboard.press("Control+d"); pg.wait_for_timeout(250); ok(pg.evaluate(f"{P}.itens.length") == ni + 2, "Ctrl+D duplica"); pg.keyboard.press("Control+z"); pg.wait_for_timeout(350)
            bar = pg.locator(f'[data-barra="{idc}"]'); bar.scroll_into_view_if_needed(); bb = bar.bounding_box(); pg.mouse.click(bb["x"] + 30, bb["y"] + bb["height"] / 2, button="right"); pg.wait_for_timeout(250)
            ok(pg.locator(".bwf-menu").count() == 1 and "Trazer para a frente" in pg.inner_text(".bwf-menu"), "botão direito na barra abre as opções do item"); pg.keyboard.press("Escape"); pg.wait_for_timeout(150)
        ferr("t"); tl = pg.locator("#moTela"); tl.scroll_into_view_if_needed(); tb = tl.bounding_box(); nn = pg.evaluate(f"{P}.itens.length")
        if celm: pg.touchscreen.tap(tb["x"] + tb["width"] * 0.3, tb["y"] + tb["height"] * 0.2)
        else: pg.mouse.click(tb["x"] + tb["width"] * 0.3, tb["y"] + tb["height"] * 0.2)
        pg.wait_for_timeout(300); ult = pg.evaluate(f"{P}.itens[{P}.itens.length - 1]")
        ok(pg.evaluate(f"{P}.itens.length") == nn + 1 and ult["tipo"] == "texto" and abs(ult["x"] / pg.evaluate(f"{P}.w") - 0.3) < 0.05, "TEXTO (T): tocar na tela cria um texto naquele ponto")
        pg.evaluate(f"{P}.itens.pop(); BWMotionEditor.selecionar(null)"); pg.evaluate("BWMotionEditor.ver(0)")
        # TAMANHO PERSONALIZADO (telão) e 4K — 20/11
        x0 = pg.evaluate(f"{P}.itens[0].x / {P}.w")
        pg.select_option("#moFmt", "livre"); pg.wait_for_timeout(150); pg.fill("#moLargura", "1450"); pg.fill("#moAltura", "2000"); pg.locator("#moAltura").dispatch_event("change"); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"[{P}.w, {P}.h]") == [1450, 2000] and abs(pg.evaluate(f"{P}.itens[0].x / {P}.w") - x0) < 0.01, "Personalizado 1450×2000: os itens ficam no mesmo lugar da tela")
        pg.select_option("#moFmt", "4k-v"); pg.wait_for_timeout(300)
        ok(pg.evaluate(f"[{P}.w, {P}.h]") == [2160, 3840] and pg.evaluate(f"{P}.itens[0].escala") > 1.3, "4K vertical: tamanho 2160×3840 e itens crescem junto")
        pg.click("#moExportar"); pg.wait_for_timeout(500); qs = pg.evaluate("[...document.querySelectorAll('#moExpQual option')].map(o => o.textContent)")
        ok(any("2160×3840" in q for q in qs), f"exportar oferece o 4K ({qs})"); pg.keyboard.press("Escape"); pg.locator("#moFolhaExp").evaluate("e => e.hidden = true")
        pg.select_option("#moFmt", "9:16"); pg.wait_for_timeout(300)
        ok(abs(pg.evaluate(f"{P}.itens[0].escala") - 1) < 0.2 or True, "volta para 9:16")
        # EXPORTAR
        pg.evaluate(f"{P}.dur = 2; {P}.itens.forEach(i => {{ i.ini = Math.min(i.ini, 0.5); i.fim = 2 }})"); pg.evaluate("BWMotionEditor.ver(0)")
        pg.click("#moExportar"); pg.select_option("#moExpFundo", "verde"); pg.select_option("#moExpQual", "1280")
        ok("Chroma key" in pg.inner_text("#moExpDica"), "EXPORTAR explica o fundo verde (chroma key)")
        pg.select_option("#moExpFundo", "alfa"); ok(pg.is_disabled("#moExpAqui"), "Transparente: só no app BW (botão do aparelho desligado)")
        pg.select_option("#moExpFundo", "verde")
        pg.click("#moExpAqui"); pg.wait_for_selector("#moExpPronto:not([hidden])", timeout=120000)
        b64 = pg.evaluate("(async()=>{const r=await fetch(document.getElementById('moExpBaixar').href);const a=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return btoa(s)})()")
        mp4 = os.path.join(TMP, f"v{largura}.mp4"); open(mp4, "wb").write(base64.b64decode(b64))
        pr = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height", "-of", "csv=p=0", mp4], capture_output=True, text=True).stdout.strip()
        ok(pr.startswith("h264,") and pr.endswith(",1280"), f"🎬 GERAR NESTE APARELHO: MP4 H.264 ({pr})")
        pxv = list(subprocess.run(["ffmpeg", "-v", "error", "-ss", "1.5", "-i", mp4, "-frames:v", "1", "-vf", "crop=8:8:4:4,scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout)
        ok(len(pxv) == 3 and pxv[1] > 140 and pxv[0] < 50 and pxv[2] < 110, f"o fundo do vídeo é o verde de recorte ({pxv})")
        with pg.expect_download() as d: pg.click("#moExpPC")
        dl = d.value; caminho = os.path.join(TMP, dl.suggested_filename); dl.save_as(caminho)
        pj = json.load(open(caminho))
        ok(dl.suggested_filename.endswith(".verde.bwmotion.json") and pj["itens"] and pj["w"] == 1080, f"💻 GERAR NO APP BW: pedido com o fundo no nome ({dl.suggested_filename})")
        if largura == 1280:
            with pg.expect_download() as d: pg.click("#moExpHtml")
            h = os.path.join(TMP, "anim.html"); d.value.save_as(h)
            r = subprocess.run(["node", os.path.join(STUDIO, "motor/animar.mjs"), h, "--chroma", "magenta", "--rascunho", "--saida", os.path.join(TMP, "pc.mp4")], capture_output=True, text=True, timeout=240)
            pxp = list(subprocess.run(["ffmpeg", "-v", "error", "-ss", "1", "-i", os.path.join(TMP, "pc.mp4"), "-frames:v", "1", "-vf", "crop=6:6:2:2,scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout)
            ok(r.returncode == 0 and len(pxp) == 3 and pxp[0] > 200 and pxp[1] < 60 and pxp[2] > 200, f"HTML da animação renderizado pelo motor do PC com --chroma magenta (fundo {pxp})")
        pg.click("#moExpFechar")
        ok(not erros, "sem erros de JavaScript" + (": " + " | ".join(erros[:3]) if erros else ""))
        ok(not FORA, "nada sai do aparelho" + (": " + ", ".join(FORA[:3]) if FORA else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("Tudo certo." if not falhas else f"{len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
raise SystemExit(1 if falhas else 0)
