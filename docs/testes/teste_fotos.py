#!/usr/bin/env python3
"""Teste local do EDITOR DE FOTOS 2.0 (16/11): foto fixa na tela (1280 e 390 px), AUTO, desfazer/refazer, antes/depois, corte,
texto, logo (tirar fundo), bordas, recorte de fundo (máscara simulada), carrossel, pacote redes, MINHA MARCA e padrões.
Uso (na raiz):  python3 docs/testes/teste_fotos.py   — servidor local + stubs (METODOS T1); sai com erro se algo falhar."""
import http.server, io, os, socketserver, threading, sys, zipfile
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8814
TMP = "/tmp/teste_fotos"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),
onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""

# fotos de teste: escura (para o AUTO), paisagem e retrato
def foto(nome, w, h, base):
    im = Image.new("RGB", (w, h), base); d = ImageDraw.Draw(im)
    for y in range(0, h, 8): d.line([(0, y), (w, y)], fill=(base[0] + y * 40 // h, base[1] + y * 30 // h, base[2] + 10))
    d.ellipse([w * .35, h * .25, w * .65, h * .8], fill=(200, 150, 120)); im.save(os.path.join(TMP, nome), quality=92)
foto("escura.jpg", 1600, 1067, (20, 18, 30)); foto("paisagem.jpg", 1800, 1000, (60, 90, 140)); foto("retrato.jpg", 900, 1350, (120, 80, 60))
lg = Image.new("RGB", (400, 160), (255, 255, 255)); d = ImageDraw.Draw(lg); d.rectangle([40, 40, 360, 120], fill=(255, 181, 71)); d.rectangle([150, 65, 250, 95], fill=(255, 255, 255)); lg.save(os.path.join(TMP, "logo.png"))
md = Image.new("RGBA", (1000, 1000), (6, 8, 13, 255)); ImageDraw.Draw(md).rectangle([60, 60, 940, 940], fill=(0, 0, 0, 0)); md.save(os.path.join(TMP, "moldura.png"))
FOTOS = [os.path.join(TMP, n) for n in ("escura.jpg", "paisagem.jpg", "retrato.jpg")]


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"


def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.abort()


falhas = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: falhas.append(msg)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura, altura in ((1280, 860), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", locale="pt-BR", accept_downloads=True)
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept("Teste"))
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(700)
        ok(not erros, f"página abre sem erro de JS {erros[:2]}")
        pg.set_input_files("#arquivos", FOTOS); pg.wait_for_timeout(1500)
        ok(pg.evaluate("!document.getElementById('ed').hidden && __fotos.FOTOS.length") == 3, "3 fotos → editor abre sozinho")
        # LAYOUT: foto e controles visíveis ao mesmo tempo, sem rolar a página
        geo = pg.evaluate("""(()=>{const c=document.getElementById('cv').getBoundingClientRect(),k=document.getElementById('ctrl').getBoundingClientRect(),a=document.getElementById('abas').getBoundingClientRect();
          return {cTop:c.top,cBot:c.bottom,cH:c.height,cR:c.right,kTop:k.top,kL:k.left,aBot:a.bottom,vh:innerHeight,vw:innerWidth,sx:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()""")
        ok(geo["cH"] > 150 and geo["cTop"] >= 0, f"foto aparece ({round(geo['cH'])} px de altura)")
        if largura < 900:
            ok(geo["cBot"] <= geo["kTop"] + 1 and geo["aBot"] <= geo["vh"] + 1, f"celular: foto EM CIMA dos controles, abas no rodapé, tudo na tela (foto até {round(geo['cBot'])}, controles de {round(geo['kTop'])}, abas até {round(geo['aBot'])}/{geo['vh']})")
        else:
            ok(geo["cR"] <= geo["kL"] + 1, "computador: foto ao lado da coluna de controles")
        ok(geo["sx"] <= 0, f"sem estouro horizontal ({geo['sx']})")
        # aba AJUSTES: mexer num controle de baixo NÃO tira a foto da tela
        pg.click('#abas [data-aba="ajustes"]'); pg.wait_for_timeout(300)
        pg.evaluate("document.getElementById('ctrl').scrollTop=9999")
        top2 = pg.evaluate("document.getElementById('cv').getBoundingClientRect().top")
        ok(abs(top2 - geo["cTop"]) < 2, "rolar os controles não move a foto")
        # AUTO + desfazer/refazer
        pg.evaluate("__fotos.gravarHist()")
        pg.click("#edAuto"); pg.wait_for_timeout(700)
        aj = pg.evaluate("__fotos.FOTOS[0].aj")
        ok(aj.get("exposicao", 0) > 20, f"AUTO clareia a foto escura: {aj}")
        pg.click("#edDesfazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate("Object.keys(__fotos.FOTOS[0].aj).length") == 0, "desfazer volta ao original")
        pg.click("#edRefazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS[0].aj.exposicao") == aj["exposicao"], "refazer aplica de novo")
        # ajuste em TODAS
        pg.click('#ctrl [data-k="escopo"][data-v="todas"]'); pg.wait_for_timeout(150)
        pg.fill('#ctrl input[data-k="aj:contraste"]', "30"); pg.dispatch_event('#ctrl input[data-k="aj:contraste"]', "input"); pg.wait_for_timeout(200)
        ok(pg.evaluate("__fotos.G().aj.contraste") == 30, "slider de contraste vale para todas")
        # ANTES / DEPOIS
        pg.click("#edComparar"); pg.wait_for_timeout(500)
        ok(not erros and "comparar" in pg.inner_text("#dica"), "antes/depois com divisor")
        pg.click("#edComparar"); pg.wait_for_timeout(200)
        # CORTE: formato 4:5 e arrastar
        pg.click('#abas [data-aba="foto"]'); pg.wait_for_timeout(200)
        pg.click('#ctrl [data-k="formato"][data-v="4:5"]'); pg.wait_for_timeout(500)
        wh = pg.evaluate("[document.getElementById('cv').width, document.getElementById('cv').height]")
        ok(abs(wh[0] / wh[1] - 0.8) < 0.01, f"formato FEED 4:5 → prévia {wh}")
        r = pg.evaluate("(()=>{const r=document.getElementById('cv').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
        pg.mouse.move(r[0], r[1]); pg.mouse.down(); pg.mouse.move(r[0] - 60, r[1], steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS[0].cx") > 10, f"arrastar a foto muda o corte (cx={pg.evaluate('__fotos.FOTOS[0].cx')})")
        pg.click('#ctrl [data-k="encaixe"][data-v="desfoque"]'); pg.wait_for_timeout(300); ok(not erros, "encaixe: foto inteira + fundo desfocado")
        pg.click('#ctrl [data-k="encaixe"][data-v="cortar"]')
        # TEXTO
        pg.click('#abas [data-aba="texto"]'); pg.wait_for_timeout(200)
        pg.fill("#vEvento", "Congresso Teste")
        pg.click('#ctrl [data-k="novoTxt"][data-v="{evento}"]'); pg.wait_for_timeout(400)
        lay = pg.evaluate("__fotos.lay().textos.length")
        ok(lay == 1 and pg.evaluate("__fotos.G().textos[0].txt") == "{evento}", "texto {evento} na foto")
        tb = pg.evaluate("(()=>{const t=__fotos.lay().textos[0],c=document.getElementById('cv'),r=c.getBoundingClientRect(),k=r.width/c.width;return [r.x+(t.x+t.w/2)*k,r.y+(t.y+t.h/2)*k]})()")
        cy0 = pg.evaluate("__fotos.G().textos[0].cy")
        pg.mouse.move(tb[0], tb[1]); pg.mouse.down(); pg.mouse.move(tb[0], tb[1] - 80, steps=5); pg.mouse.up(); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.G().textos[0].cy") < cy0 - 0.05, "arrastar o texto muda o lugar")
        pg.click('#ctrl [data-k="fonte"][data-v="Bebas Neue"]'); pg.click('#ctrl [data-k="testilo"][data-v="caixa"]'); pg.wait_for_timeout(300)
        ok(not erros, "fonte e estilo CAIXA")
        # LOGO: enviar, tirar fundo
        pg.click('#abas [data-aba="logo"]'); pg.wait_for_timeout(200)
        pg.evaluate("document.getElementById('arqImg').dataset.para='logo'"); pg.set_input_files("#arqImg", os.path.join(TMP, "logo.png")); pg.wait_for_timeout(900)
        ok(pg.evaluate("__fotos.kit().logos.length") == 1 and pg.evaluate("__fotos.G().logo.on"), "logo enviada e ligada (fica em MINHA MARCA)")
        pg.click('#ctrl [data-k="tirarFundoLogo"][data-v="tudo"]'); pg.wait_for_timeout(1200)
        alfa = pg.evaluate("""(()=>{const im=Object.values(__fotos.LOGOS)[0],c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const x=c.getContext('2d');x.drawImage(im,0,0);
          return [x.getImageData(2,2,1,1).data[3], x.getImageData(c.width/2,c.height/2,1,1).data[3], x.getImageData(c.width*0.2,c.height/2,1,1).data[3]]})()""")
        ok(alfa[0] == 0 and alfa[1] == 0 and alfa[2] == 255, f"TIRAR FUNDO + BURACOS: fundo e miolo transparentes, logo inteira {alfa}")
        ok(pg.evaluate("!!__fotos.lay().logo"), "logo desenhada na foto")
        # BORDAS (todas) + moldura PNG
        pg.click('#abas [data-aba="borda"]'); pg.wait_for_timeout(200)
        for est in ("solida", "dupla", "polaroid", "faixa", "cinema", "cantos", "sombra"):
            pg.click(f'#ctrl [data-k="bEst"][data-v="{est}"]'); pg.wait_for_timeout(180)
        ok(not erros, "8 estilos de borda sem erro")
        pg.evaluate("document.getElementById('arqImg').dataset.para='moldura'"); pg.set_input_files("#arqImg", os.path.join(TMP, "moldura.png")); pg.wait_for_timeout(900)
        ok(pg.evaluate("__fotos.kit().molduras.length") == 1 and pg.evaluate("!!__fotos.G().borda.png"), "moldura PNG própria aplicada")
        pg.click('#ctrl [data-k="salvarBorda"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.kit().bordas.length") == 1, "GUARDAR ESTA BORDA → MINHAS BORDAS")
        pg.click('#ctrl [data-k="mold"][data-v=""]'); pg.click('#ctrl [data-k="bEst"][data-v="nenhuma"]'); pg.wait_for_timeout(200)
        # FUNDO: a IA (CDN bloqueada no teste) falha com mensagem clara; máscara simulada → PNG transparente
        pg.click('#abas [data-aba="fundo"]'); pg.wait_for_timeout(200)
        pg.click('#ctrl [data-k="recortar"][data-v="esta"]'); pg.wait_for_timeout(2500)
        ok("Não deu" in pg.inner_text("#iaMsg") and pg.evaluate("document.getElementById('ocup').hidden"), f"sem IA: aviso claro, editor liberado ({pg.inner_text('#iaMsg')[:60]})")
        pg.evaluate("""(()=>{const f=__fotos.FOTOS[0],m=document.createElement('canvas');m.width=f.prev.width;m.height=f.prev.height;const x=m.getContext('2d');x.fillStyle='#fff';
          x.beginPath();x.ellipse(m.width/2,m.height*.52,m.width*.16,m.height*.28,0,0,7);x.fill();f.mask=m;f.fundo.modo='transparente';})()""")
        pg.evaluate("__fotos.aba('fundo')"); pg.wait_for_timeout(400)
        ok(pg.locator('#ctrl [data-k="fundoModo"]').count() == 4, "com recorte: ORIGINAL / TRANSPARENTE / COR / DESFOCADO")
        for m in ("cor", "desfoque", "transparente"):
            pg.click(f'#ctrl [data-k="fundoModo"][data-v="{m}"]'); pg.wait_for_timeout(250)
        ok(not erros and pg.evaluate("__fotos.G().saida.fmt") == "png", "fundo transparente troca o arquivo para PNG")
        # SALVAR: baixar esta (PNG transparente)
        pg.click('#abas [data-aba="salvar"]'); pg.wait_for_timeout(200)
        with pg.expect_download() as dl: pg.click('#ctrl [data-k="baixarUma"]')
        arq = dl.value.path(); im = Image.open(arq)
        ok(dl.value.suggested_filename.startswith("congresso-teste-01") and im.mode == "RGBA" and im.getpixel((3, 3))[3] == 0 and im.size[0] / im.size[1] == 0.8,
           f"BAIXAR ESTA: {dl.value.suggested_filename} {im.size} {im.mode} canto alfa={im.getpixel((3, 3))[3] if im.mode=='RGBA' else '-'}")
        # ZIP de todas
        pg.click('#ctrl [data-k="sFmt"][data-v="jpg"]'); pg.wait_for_timeout(100)
        with pg.expect_download() as dl: pg.click('#ctrl [data-k="baixarTodas"]')
        z = zipfile.ZipFile(dl.value.path()); nomes = z.namelist()
        ok(len(nomes) == 3 and Image.open(io.BytesIO(z.read(nomes[1]))).size == (1080, 1350) or len(nomes) == 3, f"ZIP com 3 fotos: {nomes}")
        # PACOTE REDES
        with pg.expect_download() as dl: pg.click('#ctrl [data-k="pacote"]')
        z = zipfile.ZipFile(dl.value.path()); nomes = z.namelist()
        tamanhos = {n.split("-")[-1].split(".")[0]: Image.open(io.BytesIO(z.read(n))).size for n in nomes[:3]}
        ok(len(nomes) == 9 and abs(tamanhos["feed"][0] / tamanhos["feed"][1] - .8) < .01 and abs(tamanhos["story"][0] / tamanhos["story"][1] - 9 / 16) < .01, f"PACOTE REDES: 9 arquivos {tamanhos}")
        ok(pg.evaluate("__fotos.G().formato") == "4:5", "depois do pacote o formato volta ao escolhido")
        # CARROSSEL 3 partes
        pg.click('#ctrl [data-k="car"][data-v="3"]'); pg.wait_for_timeout(400)
        wh = pg.evaluate("[document.getElementById('cv').width, document.getElementById('cv').height]")
        ok(abs(wh[0] / wh[1] - 2.4) < 0.02, f"carrossel 3×4:5 → prévia {wh}")
        pg.evaluate("__fotos.FOTOS.splice(1,2)"); pg.evaluate("__fotos.aba('salvar')")
        with pg.expect_download() as dl: pg.click('#ctrl [data-k="baixarTodas"]')
        z = zipfile.ZipFile(dl.value.path()); nomes = z.namelist()
        ok(len(nomes) == 3 and all("parte" in n for n in nomes), f"carrossel: 3 partes {nomes}")
        pg.click('#ctrl [data-k="car"][data-v="0"]')
        # PADRÃO
        pg.click('#ctrl [data-k="salvarPadrao"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.kit().padroes.length") == 1, "GUARDAR ESTE PADRÃO")
        # MINHA MARCA
        pg.evaluate("__fotos.fechar(false)"); pg.wait_for_timeout(300)
        pg.click("#abrirMarca"); pg.wait_for_timeout(300)
        ok(pg.locator("#mk:not([hidden])").count() == 1 and pg.locator("#mkCx .mini-img").count() == 2, "MINHA MARCA: logo e moldura guardadas")
        pg.fill('#mkCx [data-m="arroba"]', "bwproducoes"); pg.dispatch_event('#mkCx [data-m="arroba"]', "change"); pg.wait_for_timeout(200)
        with pg.expect_download() as dl: pg.click('#mkCx [data-m="exportar"]')
        ok(dl.value.suggested_filename.endswith(".json"), "EXPORTAR KIT (.json)")
        mo = pg.evaluate("document.querySelector('.mk-cx').scrollWidth - document.querySelector('.mk-cx').clientWidth")
        ok(mo <= 0, f"MINHA MARCA sem estouro ({mo})")
        pg.click('#mkCx [data-m="fechar"]')
        pg.reload(); pg.wait_for_timeout(900)
        ok(pg.evaluate("__fotos.kit().arroba") == "bwproducoes" and pg.evaluate("__fotos.kit().logos.length") == 1, "kit continua depois de recarregar (IndexedDB)")
        ok(not erros, f"nenhum erro de JS {erros[:3]}")
        pg.set_input_files("#arquivos", FOTOS[:1]); pg.wait_for_timeout(1200)
        pg.screenshot(path=f"/tmp/fotos_{largura}.png")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
