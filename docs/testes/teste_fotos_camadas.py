#!/usr/bin/env python3
"""Teste do EDITOR DE FOTOS (24/11): sem salvamento automático do visual, PRESETS à vista, REMOVER ATRIBUTOS no botão direito,
FORMATO e TAMANHO LIVRES (px/cm/mm/pol) e o PAINEL DE CAMADAS ao lado (como no Photoshop): arrastar pelo ⠿ e PASTAS.
Uso (na raiz):  python3 docs/testes/teste_fotos_camadas.py"""
import http.server, os, socketserver, threading, sys
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8826
TMP = "/tmp/teste_fotos_cam"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),
onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
im = Image.new("RGB", (1600, 1000), (60, 90, 140)); ImageDraw.Draw(im).ellipse([500, 200, 1100, 900], fill=(200, 150, 120)); im.save(os.path.join(TMP, "f.jpg"), quality=92)


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


MEIO = "(()=>{const c=document.getElementById('cv'),L=__fotos.lay();return [...c.getContext('2d').getImageData(Math.round(L.P.x+L.P.w/2),Math.round(L.P.y+L.P.h/2),1,1).data]})()"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura, altura in ((1280, 860), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", locale="pt-BR", has_touch=largura < 900)
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        nome_preset = ["Preset Evento"]
        pg.on("dialog", lambda d: d.accept(nome_preset[0]) if d.type == "prompt" else d.accept())
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(700)
        pg.set_input_files("#arquivos", [os.path.join(TMP, "f.jpg")]); pg.wait_for_timeout(1500)
        ok(pg.evaluate("!document.getElementById('ed').hidden"), "editor abre")

        # ---------- SEM SALVAMENTO AUTOMÁTICO ----------
        pg.evaluate("(()=>{const G=__fotos.G();G.borda.est='polaroid';G.overlay='bokeh';G.filtro='pb'})()"); pg.evaluate("__fotos.gravarHist()")
        pg.evaluate("__fotos.acao('sQual','80')"); pg.wait_for_timeout(500)
        salvo = pg.evaluate("JSON.parse(localStorage.getItem('ui_fotos_ultimo')||'{}')")
        ok("borda" not in salvo and "overlay" not in salvo and salvo.get("saida", {}).get("qual") == 80, f"o aparelho guarda só as escolhas de SALVAR, não borda/overlay {list(salvo)}")

        # ---------- PRESETS ----------
        ok(pg.is_visible("#ctrl .c-presets") and pg.is_visible('#ctrl [data-k="salvarPadrao"]'), "★ MEUS PRESETS à vista no alto da aba")
        pg.click('#ctrl [data-k="salvarPadrao"]'); pg.wait_for_timeout(600)
        ok(pg.locator('#ctrl .c-presets [data-k="padrao"]', has_text="Preset Evento").count() == 1, "＋ SALVAR PRESET cria o chip do preset")
        pg.evaluate("(()=>{const G=__fotos.G();G.borda.est='nenhuma';G.overlay='nenhum';G.filtro='original'})()"); pg.evaluate("__fotos.aba('ajustes')"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#ctrl .c-presets"), "a barra de PRESETS aparece também em outra aba")
        pg.click('#ctrl .c-presets [data-k="padrao"]'); pg.wait_for_timeout(500)
        g = pg.evaluate("(()=>{const G=__fotos.G();return [G.borda.est,G.overlay,G.filtro]})()")
        ok(g == ["polaroid", "bokeh", "pb"], f"tocar no preset aplica tudo de volta {g}")

        # ---------- REMOVER ATRIBUTOS ----------
        pg.evaluate("(()=>{const f=__fotos.FOTOS[0];f.aj={exp:40};f.rot=90;f.adesivos.push({id:'adX',e:'⭐',tam:20,cx:.3,cy:.3})})()"); pg.evaluate("__fotos.gravarHist()"); pg.wait_for_timeout(300)
        if largura >= 900:
            bb = pg.locator("#cv").bounding_box(); pg.mouse.click(bb["x"] + bb["width"] * .8, bb["y"] + bb["height"] * .8, button="right"); pg.wait_for_timeout(500)
        else:
            bb = pg.locator("#cv").bounding_box(); pg.mouse.move(bb["x"] + bb["width"] * .8, bb["y"] + bb["height"] * .8); pg.mouse.down(); pg.wait_for_timeout(700); pg.mouse.up(); pg.wait_for_timeout(500)
        mt = pg.evaluate("(document.querySelector('.bwf-menu')||{}).innerText||''")
        ok("Remover atributos" in mt, f"menu da foto tem REMOVER ATRIBUTOS {mt[:80]!r}")
        pg.wait_for_timeout(500)
        pg.locator(".bwf-menu button, .bwf-menu [role=menuitem]", has_text="Remover atributos").first.click(); pg.wait_for_timeout(500)
        st = pg.evaluate("(()=>{const G=__fotos.G(),f=__fotos.FOTOS[0];return {b:G.borda.est,o:G.overlay,fi:G.filtro,aj:Object.keys(f.aj).length,rot:f.rot,ad:f.adesivos.length,q:G.saida.qual}})()")
        ok(st == {"b": "nenhuma", "o": "nenhum", "fi": "original", "aj": 0, "rot": 0, "ad": 0, "q": 80}, f"REMOVER ATRIBUTOS volta tudo ao original (e mantém as escolhas de salvar) {st}")
        pg.evaluate("__fotos.desfazer()"); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.FOTOS[0].rot") == 90, "↶ desfaz o REMOVER ATRIBUTOS")
        pg.evaluate("(()=>{const f=__fotos.FOTOS[0];f.rot=0;f.adesivos=[];f.aj={}})()")

        # ---------- FORMATO e TAMANHO LIVRES ----------
        pg.evaluate("__fotos.aba('foto')"); pg.wait_for_timeout(300)
        pg.evaluate("(()=>{const G=__fotos.G();G.borda.est='nenhuma'})()")
        pg.click('#ctrl [data-k="formato"][data-v="livre"]'); pg.wait_for_timeout(300)
        ok(pg.is_visible('#ctrl [data-k="fLW"]') and pg.locator('#ctrl [data-k="fLUn"]').count() == 4, "FORMATO LIVRE mostra largura, altura e unidades (px, cm, mm, pol)")
        pg.fill('#ctrl [data-k="fLW"]', "10"); pg.fill('#ctrl [data-k="fLH"]', "15"); pg.wait_for_timeout(300)
        ok("1181 × 1772" in pg.inner_text("#fLNota"), f"10 × 15 cm a 300 DPI = 1181 × 1772 px ({pg.inner_text('#fLNota')})")
        sz = pg.evaluate("(()=>{const f=__fotos.FOTOS[0],c=__fotos.montar(f.prev,f,{tam:__fotos.G().saida.tam});const r=[c.width,c.height];c.width=1;return r})()")
        ok(sz == [1181, 1772], f"o arquivo sai com a medida digitada {sz}")
        pg.click('#ctrl [data-k="fLUn"][data-v="px"]'); pg.wait_for_timeout(300)
        pg.fill('#ctrl [data-k="fLW"]', "800"); pg.fill('#ctrl [data-k="fLH"]', "600"); pg.wait_for_timeout(300)
        sz = pg.evaluate("(()=>{const f=__fotos.FOTOS[0],c=__fotos.montar(f.prev,f,{tam:__fotos.G().saida.tam});const r=[c.width,c.height];c.width=1;return r})()")
        ok(sz == [800, 600], f"formato livre em PX: 800 × 600 {sz}")
        pg.click('#ctrl [data-k="formato"][data-v="original"]'); pg.wait_for_timeout(300)
        pg.evaluate("__fotos.aba('salvar')"); pg.wait_for_timeout(300)
        pg.click('#ctrl [data-k="sTam"][data-v="livre"]'); pg.wait_for_timeout(300)
        pg.fill('#ctrl [data-k="sLW"]', "2000"); pg.wait_for_timeout(300)
        sz = pg.evaluate("(()=>{const f=__fotos.FOTOS[0],c=__fotos.montar(f.prev,f,{tam:'livre'});const r=[c.width,c.height];c.width=1;return r})()")
        ok(sz == [2000, 1250], f"TAMANHO LIVRE só com a largura: a altura segue a foto {sz}")
        pg.click('#ctrl [data-k="sTam"][data-v="alta"]'); pg.wait_for_timeout(200)

        # ---------- EFEITOS ----------
        pg.evaluate("__fotos.aba('efeitos')"); pg.wait_for_timeout(400)
        nfx = pg.locator("#ctrl .fx-bt").count()
        ok(nfx >= 35 and pg.locator('#ctrl [data-k="fxAuto"]').count() >= 10, f"aba EFEITOS: {nfx} efeitos em grupos + automáticos")
        res = pg.evaluate("""(()=>{const L=BWFotoFx.LISTA,o=[];for(const z of L){const c=document.createElement('canvas');c.width=120;c.height=80;const x=c.getContext('2d');x.fillStyle='#3060a0';x.fillRect(0,0,120,80);x.fillStyle='#e0a070';x.fillRect(40,20,40,40);
          const a=c.getContext('2d').getImageData(0,0,120,80).data;let r;try{r=BWFotoFx.aplicar(c,[{t:z.id,f:80}])}catch(e){o.push(z.id+':ERRO '+e.message);continue}
          if(!r||r.width!==120||r.height!==80){o.push(z.id+':tamanho');continue}const b=r.getContext('2d').getImageData(0,0,120,80).data;let d=0;for(let i=0;i<a.length;i++)d+=Math.abs(a[i]-b[i]);if(d<200)o.push(z.id+':não mudou')}return o})()""")
        ok(not res, f"todo efeito roda, mantém o tamanho e muda a imagem {res}")
        a0 = pg.evaluate(MEIO)
        pg.click('#ctrl [data-k="fxAdd"][data-v="pb_drama"]'); pg.wait_for_timeout(600)
        a1 = pg.evaluate(MEIO); ok(abs(a1[0] - a1[1]) < 6 and abs(a1[1] - a1[2]) < 6 and pg.locator("#ctrl .fx-item").count() == 1, f"P&B DRAMÁTICO na foto deixa a foto cinza {a0}→{a1}")
        pg.fill('#ctrl input[data-k="fx:0"]', "20"); pg.locator('#ctrl input[data-k="fx:0"]').dispatch_event("input"); pg.wait_for_timeout(500)
        ok(pg.evaluate("__fotos.FOTOS[0].efs[0].f") == 20, "barra FORÇA muda o efeito")
        pg.click('#ctrl [data-k="fxAuto"][data-v="0"]'); pg.wait_for_timeout(700)
        ok([e["t"] for e in pg.evaluate("__fotos.FOTOS[0].efs")] == ["sonho", "brilho", "some_bordas"], "AUTOMÁTICO monta a combinação de efeitos")
        cant = pg.evaluate("(()=>{const c=document.getElementById('cv'),L=__fotos.lay();return [...c.getContext('2d').getImageData(Math.round(L.P.x+2),Math.round(L.P.y+2),1,1).data]})()")
        ok(cant[3] < 255 or sum(cant[:3]) < 60, f"SOME NAS BORDAS deixa o canto da foto sumindo {cant}")
        pg.evaluate("__fotos.desfazer()"); pg.wait_for_timeout(500)
        ok(len(pg.evaluate("__fotos.FOTOS[0].efs")) == 1, "↶ desfaz o automático")
        pg.click('#ctrl [data-k="fxLimpar"]'); pg.wait_for_timeout(400)
        # efeito numa CAMADA de imagem
        pg.evaluate("""(async()=>{const c=document.createElement('canvas');c.width=200;c.height=200;const x=c.getContext('2d');x.fillStyle='#ff0000';x.fillRect(0,0,200,200);await __fotos.addImagemCamada(c)})()"""); pg.wait_for_timeout(600)
        pg.evaluate("__fotos.aba('efeitos')"); pg.wait_for_timeout(300)
        ok(pg.locator('#ctrl [data-k="fxEm"][data-v="cam"]').count() == 1, "com a camada de imagem escolhida aparece EFEITOS EM: CAMADA")
        pg.click('#ctrl [data-k="fxEm"][data-v="cam"]'); pg.click('#ctrl [data-k="fxAdd"][data-v="inverter"]'); pg.wait_for_timeout(700)
        cm = pg.evaluate("(()=>{const c=document.getElementById('cv'),L=__fotos.lay(),a=L.ades[L.ades.length-1];return [...c.getContext('2d').getImageData(Math.round(a.x+a.w/2),Math.round(a.y+a.h/2),1,1).data]})()")
        ok(cm[0] < 120 and cm[1] > 120 and not pg.evaluate("__fotos.FOTOS[0].efs.length"), f"NEGATIVO só na camada: vermelho vira ciano e a foto fica sem efeito {cm}")
        pg.evaluate("(()=>{const f=__fotos.FOTOS[0];f.adesivos=[];f.ordem=[]})()")

        # ---------- PAINEL DE CAMADAS ----------
        pg.evaluate("""(()=>{const f=__fotos.FOTOS[0];f.adesivos=[{id:'v',forma:'ret',cor:'#00ff00',tam:60,cx:.5,cy:.5},{id:'r',forma:'ret',cor:'#ff0000',tam:60,cx:.5,cy:.5}];f.ordem=[];__fotos.aba('camadas')})()"""); pg.wait_for_timeout(500)
        if largura < 900:
            ok(not pg.is_visible("#camPainel"), "celular: o painel de camadas começa fechado")
            pg.click("#edCam"); pg.wait_for_timeout(400)
            ok(pg.is_visible("#camPainel"), "botão CAMADAS no alto abre o painel")
            pb = pg.locator("#camPainel").bounding_box(); cb = pg.locator("#ctrl").bounding_box()
            ok(pb["y"] + pb["height"] <= cb["y"] + 2, "a gaveta cobre só a foto: os controles continuam à mão")
        else:
            cv = pg.locator("#cv").bounding_box(); pb = pg.locator("#camPainel").bounding_box()
            ok(pg.is_visible("#camPainel") and pb["x"] >= cv["x"] + cv["width"] - 2, "computador: painel de CAMADAS sempre ao lado direito da foto")
        topo = pg.evaluate("[...document.querySelectorAll('#camLista .cam-l:not(.base)')].map(e=>e.dataset.cam)")
        ok(topo == ["a:r", "a:v"], f"lista de CIMA para BAIXO (a de cima cobre) {topo}")
        px = pg.evaluate(MEIO); ok(px[0] > 200 and px[1] < 60, f"vermelho (em cima) cobre o centro {px}")

        def arrastar(de, para, fr):
            a = pg.locator(f'#camLista .cam-l[data-cam="{de}"] .cam-pega').bounding_box()
            t = pg.locator(f'#camLista .cam-l[data-cam="{para}"]').bounding_box()
            ax, ay = a["x"] + a["width"] / 2, a["y"] + a["height"] / 2; tx, ty = t["x"] + t["width"] / 2, t["y"] + t["height"] * fr
            pg.mouse.move(ax, ay); pg.mouse.down()
            for k in range(1, 9): pg.mouse.move(ax + (tx - ax) * k / 8, ay + (ty - ay) * k / 8); pg.wait_for_timeout(30)
            pg.mouse.up(); pg.wait_for_timeout(500)
        arrastar("a:v", "a:r", 0.15)
        topo = pg.evaluate("[...document.querySelectorAll('#camLista .cam-l:not(.base)')].map(e=>e.dataset.cam)")
        px = pg.evaluate(MEIO)
        ok(topo == ["a:v", "a:r"] and px[1] > 200 and px[0] < 60, f"ARRASTAR o verde para cima: ele passa a cobrir {topo} {px}")
        # pasta
        pg.click('#camCorpo [data-k="grpNova"]'); pg.wait_for_timeout(400)
        gs = pg.evaluate("__fotos.FOTOS[0].grupos"); gid = gs[0]["id"] if gs else ""
        ok(len(gs) == 1 and pg.locator(f'#camLista .cam-g[data-cam="g:{gid}"]').count() == 1, "📁 NOVA PASTA aparece na lista")
        arrastar("a:v", f"g:{gid}", 0.5)
        dentro = pg.evaluate("__fotos.FOTOS[0].grupoDe")
        ok(dentro.get("a:v") == gid and pg.locator('#camLista .cam-l.dentro[data-cam="a:v"]').count() == 1, f"soltar em cima da pasta põe a camada DENTRO {dentro}")
        pg.click(f'#camLista [data-k="camVer"][data-v="g:{gid}"]'); pg.wait_for_timeout(400)
        px = pg.evaluate(MEIO); ok(px[0] > 200 and px[1] < 60, f"👁 da PASTA esconde o que tem dentro (volta o vermelho) {px}")
        pg.click(f'#camLista [data-k="camVer"][data-v="g:{gid}"]'); pg.wait_for_timeout(300)
        pg.click(f'#camLista [data-k="grpAbre"][data-v="{gid}"]'); pg.wait_for_timeout(300)
        ok(pg.locator('#camLista .cam-l[data-cam="a:v"]').count() == 0, "▸ fecha a pasta (esconde a lista de dentro)")
        pg.click(f'#camLista [data-k="grpAbre"][data-v="{gid}"]'); pg.wait_for_timeout(300)
        arrastar(f"g:{gid}", "a:r", 0.85)
        topo = pg.evaluate("[...document.querySelectorAll('#camLista .cam-l:not(.base)')].map(e=>e.dataset.cam)")
        px = pg.evaluate(MEIO)
        ok(topo == ["a:r", f"g:{gid}", "a:v"] and px[0] > 200 and px[1] < 60, f"arrastar a PASTA inteira para baixo leva o que tem dentro {topo} {px}")
        pg.evaluate("__fotos.desfazer()"); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.FOTOS[0].ordem.indexOf('g:'+__fotos.FOTOS[0].grupos[0].id) > __fotos.FOTOS[0].ordem.indexOf('a:r')"), "↶ desfaz o arraste da pasta")
        pg.click(f'#camLista [data-k="grpSel"][data-v="{gid}"]'); pg.wait_for_timeout(300)
        pg.click('#camCorpo [data-k="grpDesagrupar"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("__fotos.FOTOS[0].grupos.length") == 0 and pg.evaluate("__fotos.itens().length") == 2, "⇲ DESFAZER A PASTA tira a pasta e as camadas ficam")
        ok(not erros, f"sem erro de JS {erros[:2]}")
        sx = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(sx <= 0, f"sem estouro horizontal ({sx})")
        ctx.close()
    b.close()

print("\nFALHAS:", len(falhas))
sys.exit(1 if falhas else 0)
