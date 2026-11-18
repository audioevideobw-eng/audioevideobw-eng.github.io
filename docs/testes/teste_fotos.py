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
          return {cTop:c.top,cBot:c.bottom,cH:c.height,cR:c.right,kTop:k.top,kL:k.left,kR:k.right,cL:c.left,aBot:a.bottom,vh:innerHeight,vw:innerWidth,sx:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()""")
        ok(geo["cH"] > 150 and geo["cTop"] >= 0, f"foto aparece ({round(geo['cH'])} px de altura)")
        if largura < 900:
            ok(geo["cBot"] <= geo["kTop"] + 1 and geo["aBot"] <= geo["vh"] + 1, f"celular: foto EM CIMA dos controles, abas no rodapé, tudo na tela (foto até {round(geo['cBot'])}, controles de {round(geo['kTop'])}, abas até {round(geo['aBot'])}/{geo['vh']})")
        else:
            ok(geo["kR"] <= geo["cL"] + 1 and pg.locator("#faixa .flt").count() >= 20, "computador: controles à ESQUERDA, foto grande à direita e faixa de filtros embaixo")
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
        pg.click('#abas [data-aba="filtros"]'); pg.wait_for_timeout(400)
        ok(pg.locator("#ctrl .flt").count() >= 24, f"{pg.locator('#ctrl .flt').count()} filtros")
        pg.click('#ctrl .flt[data-v="praia"]'); pg.wait_for_timeout(200); pg.click('#ctrl .flt[data-v="original"]'); pg.wait_for_timeout(200)
        pg.click('#abas [data-aba="ajustes"]'); pg.wait_for_timeout(200)
        # ANTES / DEPOIS
        pg.click("#edComparar"); pg.wait_for_timeout(500)
        ok(not erros and "comparar" in pg.inner_text("#dica"), "antes/depois com divisor")
        # LADO A LADO: antes e depois inteiros
        ok(pg.is_visible("#compModo"), "com ANTES ligado aparece DIVISOR | LADO A LADO")
        w1 = pg.evaluate("document.getElementById('cv').width")
        pg.click('#compModo [data-comp="lado"]'); pg.wait_for_timeout(500)
        d = pg.evaluate("(()=>{const c=document.getElementById('cv'),r=c.getBoundingClientRect(),p=document.getElementById('palco').getBoundingClientRect();return {m:c.dataset.modo,w:c.width,h:c.height,cabe:r.left>=p.left-1&&r.right<=p.right+1&&r.bottom<=p.bottom+1}})()")
        ok(d["m"] == "lado" and (d["w"] > w1 * 1.9 or d["h"] > d["w"]) and d["cabe"], f"LADO A LADO mostra as duas versões inteiras dentro do palco {d}")
        pg.click('#compModo [data-comp="div"]'); pg.wait_for_timeout(300)
        pg.click("#edComparar"); pg.wait_for_timeout(200)
        ok(not pg.is_visible("#compModo") and pg.evaluate("document.getElementById('cv').dataset.modo") == "", "desligar ANTES volta ao normal")
        # SEGURAR a foto mostra o antes; soltar volta
        pg.click('#abas [data-aba="ajustes"]'); pg.wait_for_timeout(300)
        bb = pg.locator("#cv").bounding_box(); cxm, cym = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
        px_edit = pg.evaluate("(()=>{const c=document.getElementById('cv');return [...c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data]})()")
        pg.mouse.move(cxm, cym); pg.mouse.down(); pg.wait_for_timeout(600)
        seg = pg.evaluate("(()=>{const c=document.getElementById('cv');return {m:c.dataset.modo,px:[...c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data]}})()")
        pg.mouse.up(); pg.wait_for_timeout(400)
        volta = pg.evaluate("(()=>{const c=document.getElementById('cv');return {m:c.dataset.modo,px:[...c.getContext('2d').getImageData(c.width>>1,c.height>>1,1,1).data]}})()")
        ok(seg["m"] == "antes" and seg["px"] != px_edit and volta["m"] == "" and volta["px"] == px_edit, f"segurar a foto mostra o ANTES (sem edição) e soltar volta ao editado {px_edit} → {seg['px']} → {volta['px']}")
        # CAMADAS: forma + imagem, ordem, esconder, máscara pronta e pintada
        pg.click('#abas [data-aba="camadas"]'); pg.wait_for_timeout(300)
        ok(pg.locator("#camLista .cam-l.base").count() == 1 and pg.locator('#ctrl [data-k="camImg"]').count() == 1, "aba CAMADAS: lista com a Foto (base) e botões de acrescentar")
        pg.click('#ctrl [data-k="camForma"][data-v="elipse"]'); pg.wait_for_timeout(300)
        pg.evaluate("""(async()=>{const c=document.createElement('canvas');c.width=200;c.height=100;const x=c.getContext('2d');x.fillStyle='#00ff00';x.fillRect(0,0,200,100);await __fotos.addImagemCamada(c)})()"""); pg.wait_for_timeout(500)
        its = pg.evaluate("__fotos.itens()")
        ok(len(its) >= 2 and pg.locator("#camLista .cam-l:not(.base)").count() == len(its), f"forma e imagem viram camadas: {len(its)}")
        meio = "(()=>{const c=document.getElementById('cv'),L=__fotos.lay();return [...c.getContext('2d').getImageData(Math.round(L.P.x+L.P.w/2),Math.round(L.P.y+L.P.h/2),1,1).data]})()"
        px = pg.evaluate(meio); ok(px[1] > 200 and px[0] < 60, f"a imagem (verde) fica por cima da forma no centro {px}")
        pg.click(f'#camLista [data-k="camBaixo"][data-v="{its[-1]}"]'); pg.wait_for_timeout(400)
        its2 = pg.evaluate("__fotos.itens()"); px = pg.evaluate(meio)
        ok(its2[-1] != its[-1] and not (px[1] > 200 and px[0] < 60), f"▼ desce a imagem: agora a forma cobre o centro {px}")
        pg.click(f'#camLista [data-k="camVer"][data-v="{its2[-1]}"]'); pg.wait_for_timeout(400)
        px = pg.evaluate(meio); ok(px[1] > 200 and px[0] < 60 and pg.locator("#camLista .cam-l.oculta").count() == 1, f"👁 esconde a forma sem apagar (volta o verde) {px}")
        pg.click(f'#camLista [data-k="camVer"][data-v="{its2[-1]}"]'); pg.click(f'#camLista [data-k="camCima"][data-v="{its[-1]}"]'); pg.wait_for_timeout(300)
        pg.click(f'#camLista [data-k="camSel"][data-v="{its[-1]}"]'); pg.wait_for_timeout(300)
        ok(pg.locator('#ctrl [data-k="mForma"]').count() >= 8 and pg.locator('#ctrl [data-k="aMix"]').count() >= 6, "imagem selecionada: máscaras prontas e modos de mistura")
        canto = "(()=>{const c=document.getElementById('cv'),L=__fotos.lay(),a=L.ades.filter(t=>'a:'+t.id==='%s')[0];return [...c.getContext('2d').getImageData(Math.round(a.x+3),Math.round(a.y+3),1,1).data]})()" % its[-1]
        c0 = pg.evaluate(canto); pg.click('#ctrl [data-k="mForma"][data-v="elipse"]'); pg.wait_for_timeout(400); c1 = pg.evaluate(canto); m1 = pg.evaluate(meio)
        ok(c0[1] > 200 and c0[0] < 60 and not (c1[1] > 200 and c1[0] < 60) and m1[1] > 200, f"máscara CÍRCULO corta os cantos da imagem e mantém o meio {c0} → {c1}")
        pg.click('#ctrl [data-k="mPinta"]'); pg.wait_for_timeout(300)
        ok(pg.locator('#ctrl [data-k="mModo"]').count() == 2 and "ESCONDER" in pg.inner_text("#dica"), "PINTAR MÁSCARA liga o pincel (esconder / trazer de volta)")
        bb = pg.locator("#cv").bounding_box(); L = pg.evaluate("(()=>{const L=__fotos.lay(),c=document.getElementById('cv');return {x:(L.P.x+L.P.w/2)/c.width,y:(L.P.y+L.P.h/2)/c.height}})()")
        mx, my = bb["x"] + bb["width"] * L["x"], bb["y"] + bb["height"] * L["y"]
        pg.mouse.move(mx - 12, my); pg.mouse.down(); pg.mouse.move(mx + 12, my, steps=5); pg.mouse.up(); pg.wait_for_timeout(600)
        m2 = pg.evaluate(meio); ntr = pg.evaluate("(__fotos.adsSel().masc.tracos||[]).length")
        ok(ntr == 1 and not (m2[1] > 200 and m2[0] < 60), f"pintar no meio ESCONDE aquele pedaço da imagem {m2}")
        pg.click('#ctrl [data-k="mModo"][data-v="volta"]'); pg.mouse.move(mx - 12, my); pg.mouse.down(); pg.mouse.move(mx + 12, my, steps=5); pg.mouse.up(); pg.wait_for_timeout(600)
        m3 = pg.evaluate(meio); ok(m3[1] > 200 and m3[0] < 60, f"TRAZER DE VOLTA devolve o pedaço {m3}")
        pg.click('#ctrl [data-k="mPinta"]'); pg.wait_for_timeout(200)
        # máscara na FOTO (base) + exporta PNG transparente
        pg.click('#camLista [data-k="camSel"][data-v="foto"]'); pg.wait_for_timeout(300)
        pg.click('#ctrl [data-k="mForma"][data-v="coracao"]'); pg.wait_for_timeout(400)
        cf = pg.evaluate("(()=>{const c=document.getElementById('cv'),L=__fotos.lay();return [...c.getContext('2d').getImageData(Math.round(L.P.x+2),Math.round(L.P.y+L.P.h-3),1,1).data]})()")
        ok(cf[0] + cf[1] + cf[2] < 12, f"máscara CORAÇÃO na foto: o canto fica com o fundo preto {cf}")
        pg.click('#ctrl [data-k="mFundo"][data-v="transp"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.nomeArquivo(0).endsWith('.png')"), "fundo TRANSPARENTE na máscara → salva em PNG")
        pg.evaluate("__fotos.gravarHist()"); pg.click('#ctrl [data-k="mZerar"]'); pg.wait_for_timeout(300); pg.evaluate("__fotos.gravarHist()")
        ok(pg.evaluate("__fotos.FOTOS[0].masc") is None, "SEM MÁSCARA tira a máscara da foto")
        pg.click("#edDesfazer"); pg.wait_for_timeout(400)
        ok(pg.evaluate("(__fotos.FOTOS[0].masc||{}).forma") == "coracao", "desfazer devolve a máscara (camadas e máscaras entram no histórico)")
        pg.click('#ctrl [data-k="mZerar"]') if pg.locator('#ctrl [data-k="mZerar"]').count() else None
        pg.evaluate("__fotos.FOTOS[0].masc = null; __fotos.FOTOS[0].adesivos = []; __fotos.FOTOS[0].ordem = []; __fotos.FOTOS[0].ocultos = {}; __fotos.aba('foto')"); pg.wait_for_timeout(300)
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0 and not erros, f"sem estouro e sem erro de JS depois das camadas {erros}")
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
        ok(pg.locator('#ctrl [data-k="fonte"]').count() >= 18, f"{pg.locator('#ctrl [data-k=fonte]').count()} fontes de texto")
        pg.click('#ctrl [data-k="fonte"][data-v="Great Vibes"]'); pg.wait_for_timeout(150)
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
        pg.click('#ctrl [data-k="logoSel"]'); pg.wait_for_timeout(250)
        ok(pg.locator("#edFolha").count() == 1 and "RENOMEAR" in pg.inner_text("#edFolha") and "SUBSTITUIR" in pg.inner_text("#edFolha"), "tocar na logo em uso abre as opções")
        pg.click('#edFolha button:has-text("Cancelar")'); pg.wait_for_timeout(150)
        # BORDAS (todas) + moldura PNG
        pg.click('#abas [data-aba="borda"]'); pg.wait_for_timeout(200)
        for est in ("solida", "dupla", "polaroid", "faixa", "cinema", "cantos", "sombra"):
            pg.click(f'#ctrl [data-k="bEst"][data-v="{est}"]'); pg.wait_for_timeout(180)
        ok(not erros, "8 estilos de borda sem erro")
        for est in ("praia", "amor", "festa", "aniversario", "casamento", "formatura", "natal", "noite", "tropical", "neon", "filme", "rasgado"):
            pg.click(f'#ctrl [data-k="bEst"][data-v="{est}"]'); pg.wait_for_timeout(150)
        ok(not erros and pg.evaluate("__fotos.G().borda.esp") >= 7, "12 bordas temáticas (praia, amor, festa…) sem erro")
        pg.click('#ctrl [data-k="bEst"][data-v="praia"]'); pg.wait_for_timeout(300)
        pg.screenshot(path=f"/tmp/fotos_praia_{largura}.png")
        # setas de abrir/fechar: fecha TEMAS, recarrega o painel e continua fechada
        tit = pg.locator('#ctrl .c-tit.dobra:has-text("TEMAS")')
        tit.click(); pg.wait_for_timeout(150)
        ok(pg.evaluate("document.querySelector('#ctrl .c-tit.dobra[aria-expanded=false]') && document.querySelector('#ctrl .c-tit.dobra[aria-expanded=false]').nextElementSibling.hidden"), "seta fecha a seção TEMAS")
        pg.evaluate("__fotos.aba('foto')"); pg.evaluate("__fotos.aba('borda')"); pg.wait_for_timeout(200)
        ok(pg.evaluate("[...document.querySelectorAll('#ctrl .c-tit.dobra')].find(e=>/TEMAS/.test(e.textContent)).getAttribute('aria-expanded')") == "false", "seção fechada continua fechada (lembrada)")
        pg.locator('#ctrl .c-tit.dobra:has-text("TEMAS")').click(); pg.wait_for_timeout(150)
        pg.evaluate("document.getElementById('arqImg').dataset.para='moldura'"); pg.set_input_files("#arqImg", os.path.join(TMP, "moldura.png")); pg.wait_for_timeout(900)
        ok(pg.evaluate("__fotos.kit().molduras.length") == 1 and pg.evaluate("!!__fotos.G().borda.png"), "moldura PNG própria aplicada")
        pg.click('#ctrl [data-k="salvarBorda"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.kit().bordas.length") == 1, "GUARDAR ESTA BORDA → MINHAS BORDAS")
        pg.click('#ctrl [data-k="mold"][data-v=""]'); pg.click('#ctrl [data-k="bEst"][data-v="nenhuma"]'); pg.wait_for_timeout(200)
        # ADESIVOS: acessório, selo, arrastar, apagar; overlays
        pg.click('#abas [data-aba="adesivos"]'); pg.wait_for_timeout(250)
        pg.click('#ctrl [data-k="aAdd"][data-v="🕶️"]'); pg.wait_for_timeout(250)
        ok(len(pg.evaluate("__fotos.FOTOS[__fotos.FOTOS.length?0:0].adesivos")) >= 1 and pg.evaluate("__fotos.lay().ades.length") >= 1, "adesivo (óculos) colocado na foto")
        ab = pg.evaluate("(()=>{const t=__fotos.lay().ades[0],c=document.getElementById('cv'),r=c.getBoundingClientRect(),k=r.width/c.width;return [r.x+(t.x+t.w/2)*k,r.y+(t.y+t.h/2)*k]})()")
        cx0 = pg.evaluate("__fotos.FOTOS[0].adesivos[0].cx")

        pg.mouse.move(ab[0], ab[1]); pg.mouse.down(); pg.mouse.move(ab[0] + 50, ab[1], steps=4); pg.mouse.up(); pg.wait_for_timeout(250)
        ok(pg.evaluate("__fotos.FOTOS[0].adesivos[0].cx") > cx0 + 0.03, "arrastar o adesivo")
        pg.fill('#ctrl input[data-k="aTam"]', "30"); pg.dispatch_event('#ctrl input[data-k="aTam"]', "input"); pg.wait_for_timeout(150)
        ok(pg.evaluate("__fotos.FOTOS[0].adesivos[0].tam") == 30, "tamanho do adesivo")
        pg.click('#ctrl [data-k="aSelo"][data-v="0"]'); pg.wait_for_timeout(200)
        ok(any(a.get("selo") == "AO VIVO" for a in pg.evaluate("__fotos.FOTOS[0].adesivos")), "selo AO VIVO")
        pg.click('#ctrl [data-k="aDel"]'); pg.wait_for_timeout(200)
        ok(len(pg.evaluate("__fotos.FOTOS[0].adesivos")) == 1, "apagar adesivo")
        for ov in ("luz", "luzfria", "bokeh", "grao", "poeira", "arco", "gradiente", "sol", "vidro"):
            pg.click(f'#ctrl [data-k="overlay"][data-v="{ov}"]'); pg.wait_for_timeout(120)
        ok(not erros, "9 overlays sem erro")
        pg.click('#ctrl [data-k="overlay"][data-v="nenhum"]'); pg.wait_for_timeout(120)
        # OPÇÕES DA FOTO (toque no anexo já aberto)
        n0 = pg.evaluate("__fotos.FOTOS.length")
        pg.click('#edFotos [data-i="0"]'); pg.wait_for_timeout(250)
        ok(pg.locator("#edFolha").count() == 1 and "SUBSTITUIR" in pg.inner_text("#edFolha") and "EXCLUIR" in pg.inner_text("#edFolha"), "tocar na foto aberta abre as opções")
        pg.click('#edFolha button:has-text("DUPLICAR")'); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS.length") == n0 + 1, "DUPLICAR")
        pg.evaluate("__fotos.opcoesFoto(1)"); pg.wait_for_timeout(200); pg.click('#edFolha button:has-text("EXCLUIR")'); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS.length") == n0, "EXCLUIR (com confirmação)")
        pg.evaluate("__fotos.opcoesFoto(0)"); pg.wait_for_timeout(200); pg.click('#edFolha button:has-text("Cancelar")'); pg.wait_for_timeout(200)
        ok(pg.locator("#edFolha").count() == 0, "Cancelar fecha as opções")
        pg.evaluate("document.querySelector('#edFotos [data-i=\"0\"]').classList.contains('on') || document.querySelector('#edFotos [data-i=\"0\"]').click()"); pg.wait_for_timeout(200)
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
        # arquivo original "sumiu" (iPhone): salvar mesmo assim, com aviso, em vez de "Não deu para gerar: decod"
        pg.evaluate("__fotos.FOTOS[1].file = new Blob(['lixo'], {type:'image/jpeg'}); __fotos.FOTOS[1].__x=1")
        pg.evaluate("__fotos.FOTOS.length > 1 && 0")
        # ZIP de todas
        pg.click('#ctrl [data-k="sFmt"][data-v="jpg"]'); pg.wait_for_timeout(100)
        with pg.expect_download() as dl: pg.click('#ctrl [data-k="baixarTodas"]')
        z = zipfile.ZipFile(dl.value.path()); nomes = z.namelist()
        ok("qualidade da prévia" in pg.inner_text("#prog") and "decod" not in pg.inner_text("#prog"), f"arquivo ilegível → salva com a prévia e avisa: {pg.inner_text('#prog')[:90]}")
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
        pg.click('#mkCx [data-m="moldOp"]'); pg.wait_for_timeout(250)
        ok(pg.locator("#edFolha").count() == 1 and "MOLDURA" in pg.inner_text("#edFolha").upper(), "MINHA MARCA: tocar na moldura abre as opções")
        pg.click('#edFolha button:has-text("Cancelar")'); pg.wait_for_timeout(150)
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

    # ===== iPhone (toque): menu de cima e todas as abas, com a página de trás travada =====
    print("\n=== iPhone 13 (toque) ===")
    dev = dict(p.devices["iPhone 13"]); dev.pop("default_browser_type", None)
    ctx = b.new_context(**dev, service_workers="block", locale="pt-BR", accept_downloads=True)
    ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept("Teste"))
    pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(800)
    pg.set_input_files("#arquivos", FOTOS); pg.wait_for_timeout(1500)
    ok(pg.evaluate("document.documentElement.classList.contains('ed-aberto') && getComputedStyle(document.querySelector('.bw-shell')).display==='none' && getComputedStyle(document.querySelector('.bw-abas')||document.body).display!=='flex'"),
       "editor aberto: página de trás escondida e travada")
    cob = pg.evaluate("""(()=>{const r=[];['edFechar','edDesfazer','edRefazer','edAuto','edComparar','edSalvar'].forEach(id=>{const e=document.getElementById(id),b=e.getBoundingClientRect();
      if(b.top<0||b.bottom>innerHeight)r.push(id+' fora da tela');const el=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);if(!el||!e.contains(el))r.push(id+' coberto por '+(el&&(el.className||el.tagName)))});return r})()""")
    ok(not cob, f"botões do topo visíveis e livres {cob}")
    # toque em cada botão do topo
    pg.tap("#edAuto"); pg.wait_for_timeout(500)
    ok(len(pg.evaluate("Object.keys(__fotos.FOTOS[0].aj)")) > 0, "toque em AUTO funciona")
    pg.evaluate("__fotos.gravarHist()"); pg.tap("#edDesfazer"); pg.wait_for_timeout(400)
    ok(len(pg.evaluate("Object.keys(__fotos.FOTOS[0].aj)")) == 0, "toque em DESFAZER funciona")
    pg.tap("#edRefazer"); pg.wait_for_timeout(400)
    ok(len(pg.evaluate("Object.keys(__fotos.FOTOS[0].aj)")) > 0, "toque em REFAZER funciona")
    pg.tap("#edComparar"); pg.wait_for_timeout(400); ok(pg.evaluate("document.getElementById('edComparar').classList.contains('on')"), "toque em ANTES liga a comparação")
    pg.tap("#edComparar"); pg.wait_for_timeout(300)
    pg.tap("#edSalvar"); pg.wait_for_timeout(300); ok(pg.locator('#abas [data-aba="salvar"].on').count() == 1, "toque em SALVAR abre a aba SALVAR")
    # tentar rolar a página (arrastar no topo e nos controles): nada sai do lugar
    top0 = pg.evaluate("document.getElementById('edFechar').getBoundingClientRect().top")
    pg.evaluate("window.scrollTo(0,400)"); pg.mouse.wheel(0, 600); pg.wait_for_timeout(300)
    top1 = pg.evaluate("document.getElementById('edFechar').getBoundingClientRect().top")
    ok(abs(top1 - top0) < 1 and pg.evaluate("window.scrollY") == 0, f"página não rola por trás ({top0}→{top1}, scrollY={pg.evaluate('window.scrollY')})")
    # cada aba por toque: o painel muda e a foto continua no mesmo lugar
    cvtop = pg.evaluate("document.getElementById('cv').getBoundingClientRect().top")
    esperado = {"foto": "FORMATO", "ajustes": "Exposição", "filtros": "Intensidade", "texto": "ADICIONAR", "logo": "SUAS LOGOS", "borda": "ESTILO", "adesivos": "ACESSÓRIOS", "fundo": "REMOVER FUNDO", "salvar": "TAMANHO"}
    for aba, palavra in esperado.items():
        pg.locator(f'#abas [data-aba="{aba}"]').scroll_into_view_if_needed(); pg.tap(f'#abas [data-aba="{aba}"]'); pg.wait_for_timeout(350)
        txt = pg.inner_text("#ctrl")
        ok(palavra.lower() in txt.lower() and abs(pg.evaluate("document.getElementById('cv').getBoundingClientRect().top") - cvtop) < 2, f"aba {aba.upper()} por toque (foto parada)")
    # campo de texto não dá zoom no iPhone (letra ≥ 16 px)
    pg.tap('#abas [data-aba="texto"]'); pg.wait_for_timeout(300)
    ok(pg.evaluate("parseFloat(getComputedStyle(document.getElementById('vEvento')).fontSize)") >= 16, "campos com letra ≥ 16 px (o iPhone não amplia a tela)")
    pg.tap('#ctrl [data-k="novoTxt"][data-v=""]'); pg.wait_for_timeout(400)
    ok(pg.evaluate("parseFloat(getComputedStyle(document.querySelector('#ctrl textarea')).fontSize)") >= 16, "caixa do texto com letra ≥ 16 px")
    # slider por toque
    pg.tap('#abas [data-aba="ajustes"]'); pg.wait_for_timeout(300)
    sl = pg.locator('#ctrl input[data-k="aj:saturacao"]').bounding_box()
    pg.tap('#ctrl input[data-k="aj:saturacao"]', position={"x": sl["width"] * 0.85, "y": sl["height"] / 2}); pg.wait_for_timeout(300)
    ok(pg.evaluate("(__fotos.G().aj.saturacao||0)+(__fotos.FOTOS[0].aj.saturacao||0)") > 30, "slider responde ao toque")
    # MINHA MARCA abre e fecha por toque; o editor continua
    pg.tap('#abas [data-aba="logo"]'); pg.wait_for_timeout(300); pg.tap('#ctrl [data-k="marca"]'); pg.wait_for_timeout(300)
    ok(pg.locator("#mk:not([hidden])").count() == 1, "MINHA MARCA abre por cima do editor")
    pg.tap('#mkCx [data-m="fechar"]'); pg.wait_for_timeout(300)
    ok(pg.locator("#mk[hidden]").count() == 1 and pg.locator("#ed:not([hidden])").count() == 1, "fecha e volta ao editor")
    # fechar o editor devolve a página
    pg.tap("#edFechar"); pg.wait_for_timeout(400)
    ok(not pg.evaluate("document.documentElement.classList.contains('ed-aberto')") and pg.evaluate("getComputedStyle(document.querySelector('.bw-shell')).display") != "none", "✕ fecha e a página volta ao normal")
    pg.tap("#abrirEd"); pg.wait_for_timeout(600)
    ok(pg.locator("#ed:not([hidden])").count() == 1, "ABRIR O EDITOR de novo")
    pg.screenshot(path="/tmp/fotos_iphone.png")
    ok(not erros, f"nenhum erro de JS {erros[:3]}")
    ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
