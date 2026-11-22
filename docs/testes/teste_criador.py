#!/usr/bin/env python3
"""Teste local do CRIADOR IA (16/11): 4 tipos × formatos, textos por cima (data por extenso), fundos prontos, IA de arte (nuvem simulada:
3 opções, foto só vai no modo "IA coloca a pessoa", com confirmação), textos/legenda com IA (simulada), QR, PNG/PDF de verdade e
"abrir no editor" (ponte IndexedDB). 1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_criador.py"""
import base64, http.server, io, os, socketserver, threading, json
from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8818; TMP = "/tmp/teste_criador"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},insert(){return q},delete(){return q},update(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};const ses={access_token:'t',user:{id:'u1',email:'teste@exemplo.com'}};
return {auth:{getSession:async()=>({data:{session:ses}}),getUser:async()=>({data:{user:ses.user}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),
storage:{from(){return {list:async()=>({data:[]})}}},functions:{invoke:async()=>({data:null})}};}};"""
STUB_QR = "window.qrcode=function(){return {addData(){},make(){},getModuleCount(){return 25},isDark(r,c){return (r*7+c*3)%5<2}}};"
PDFLIB = open("/opt/npm-tools/node_modules/pdf-lib/dist/pdf-lib.min.js").read()
def jpeg(cor, w=816, h=1440):
    b = io.BytesIO(); Image.new("RGB", (w, h), cor).save(b, "JPEG"); return base64.b64encode(b.getvalue()).decode()
FAKES = [jpeg((200, 60, 120)), jpeg((40, 90, 200)), jpeg((30, 160, 90))]
foto = Image.new("RGB", (900, 1200), (200, 160, 130)); foto.save(f"{TMP}/pessoa.jpg")
PEDIDOS = []

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "qrcode-generator" in u: return r.fulfill(body=STUB_QR, content_type="application/javascript")
    if "pdf-lib" in u: return r.fulfill(body=PDFLIB, content_type="application/javascript")
    if "functions/v1/bw-ia-imagem" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        if "application/json" in (r.request.headers.get("content-type") or ""): return r.fulfill(body='{"pronto":true}', content_type="application/json")
        PEDIDOS.append(r.request.post_data_buffer or b"")
        return r.fulfill(body='{"imagem":"' + FAKES[len(PEDIDOS) % 3] + '"}', content_type="application/json")
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        corpo = r.request.post_data or ""
        if "LEGENDA" in corpo or "MENSAGEM de WhatsApp" in corpo: return r.fulfill(body=json.dumps({"texto": "Oi! Você está convidado para o meu aniversário. Confirma? 🎉"}), content_type="application/json")
        return r.fulfill(body=json.dumps({"texto": '{"pre":"Bora festejar","titulo":"Niver da","mensagem":"Sua presença é tudo!"}'}), content_type="application/json")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

DIM = """async(b64)=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();return [im.naturalWidth,im.naturalHeight]}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "criador.html"); pg.wait_for_timeout(1500)
        ok(not erros, f"abre sem erro de JS {erros[:2]}")
        ok(pg.locator("#tipos .cr-tipo").count() == 4, "4 tipos: CONVITE, POST, FLYER, CARTÃO")
        ok(pg.locator("#subtipos .cr-chip").count() == 24, "convite tem 24 modelos")
        # dados do convite
        for k, v in (("nome", "Marina"), ("idade", "30"), ("data", "2026-12-20"), ("hora", "19:00"), ("local", "Espaço Jardim"), ("rsvp", "(31) 98888-7777")):
            pg.fill(f'#campos [data-c="{k}"]', v)
        pg.wait_for_timeout(300)
        bl = pg.evaluate("__criador.blocos().map(b=>b.t||'—')")
        ok("domingo, 20 de dezembro • 19h" in bl and "30 anos" in bl and "Marina" in bl, f"textos do convite certos {bl[:7]}")
        ok(pg.evaluate("__criador.urlQr('rsvp')").startswith("https://wa.me/5531988887777?text="), "QR de confirmação vai para o WhatsApp certo")
        # fundos prontos
        pg.click("#btnProntos"); pg.wait_for_timeout(600)
        ok(pg.locator("#ops .cr-op img").count() == 3, "FUNDOS PRONTOS: 3 opções sem IA")
        varia = pg.evaluate("""(()=>{const c=document.getElementById('cv'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;let s=new Set();for(let i=0;i<d.length;i+=4*997)s.add(d[i]>>4<<8|d[i+1]>>4<<4|d[i+2]>>4);return s.size})()""")
        ok(varia > 20, f"prévia desenhada (cores distintas: {varia})")
        # todos os tipos × formatos desenham sem erro
        res = pg.evaluate("""(()=>{const out=[],F={story:[1080,1920],post:[1080,1350],quadrado:[1080,1080],paisagem:[1920,1080],a5:[1748,2480],a4:[2480,3508],cartao:[1063,591]};
          for(const t of ['convite','post','flyer','cartao']){document.querySelector('[data-k=tipo][data-v='+t+']').click();
            for(const s of [...document.querySelectorAll('#subtipos .cr-chip')].map(b=>b.dataset.v)){document.querySelector('[data-k=sub][data-v="'+s+'"]').click();
              for(const f of Object.keys(F)){try{const c=__criador.render(F[f][0]/4|0,F[f][1]/4|0);out.push(c.width>0)}catch(e){out.push(t+'/'+s+'/'+f+': '+e.message)}}}}
          return out.filter(v=>v!==true)})()""")
        ok(not res, f"4 tipos × todos os modelos × 7 formatos desenham sem erro {res[:3]}")
        # cartão
        pg.click('[data-k=tipo][data-v=cartao]'); pg.wait_for_timeout(200)
        pg.fill('#campos [data-c="nome"]', "Marcos Bonfá"); pg.fill('#campos [data-c="telefone"]', "(31) 97777-6666"); pg.wait_for_timeout(200)
        pg.click('#ajustes [data-k=qr][data-v=zap]'); pg.wait_for_timeout(600)
        ok(pg.evaluate("__criador.E().formato") == "cartao" and pg.evaluate("__criador.urlQr('zap')") == "https://wa.me/5531977776666", "CARTÃO: formato 9×5 e QR do WhatsApp")
        # volta ao convite (dados lembrados)
        pg.click('[data-k=tipo][data-v=convite]'); pg.wait_for_timeout(300)
        pg.click('[data-k=sub][data-v=aniversario]'); pg.wait_for_timeout(200)
        ok(pg.input_value('#campos [data-c="nome"]') == "Marina", "dados de cada modelo ficam guardados ao trocar")
        # IA de arte sem foto
        n0 = len(PEDIDOS); pg.click("#btnCriarIA"); pg.wait_for_timeout(2500)
        ok(len(PEDIDOS) == n0 + 3, f"✨ CRIAR: 3 pedidos à IA ({len(PEDIDOS)-n0})")
        ok(all(b"modo" in x and b"arte" in x and b'name="imagem"' not in x for x in PEDIDOS[n0:]), "sem foto: modo arte e NENHUMA imagem enviada")
        ok(all(b"birthday" in x and b"party celebration" in x for x in PEDIDOS[n0:]), "pedido leva o tema e o estilo")
        ok(pg.locator("#ops .cr-op img").count() == 3 and pg.evaluate("__criador.sel()") >= 0, "3 opções da IA aparecem e uma já fica escolhida")
        pg.click("#ops .cr-op >> nth=2"); pg.wait_for_timeout(200); ok(pg.evaluate("__criador.sel()") == 2, "tocar numa opção troca a arte")
        # foto: moldura não envia; IA envia com confirmação
        pg.set_input_files("#arqFoto", f"{TMP}/pessoa.jpg"); pg.wait_for_timeout(700)
        pg.click('#fotoModo [data-v=moldura]'); pg.wait_for_timeout(200)
        n1 = len(PEDIDOS); pg.click("#btnCriarIA"); pg.wait_for_timeout(2200)
        ok(len(PEDIDOS) == n1 + 3 and all(b'name="imagem"' not in x for x in PEDIDOS[n1:]), "FOTO EM MOLDURA: a foto NÃO vai para a nuvem")
        pg.click('#fotoModo [data-v=ia]'); pg.wait_for_timeout(200); dlg.clear()
        n2 = len(PEDIDOS); pg.click("#btnCriarIA"); pg.wait_for_timeout(2500)
        ok(dlg and "nuvem" in dlg[0], "IA COLOCA A PESSOA: pede confirmação antes")
        ok(len(PEDIDOS) == n2 + 3 and all(b'name="imagem"' in x for x in PEDIDOS[n2:]), "…e só então manda a cópia pequena da foto")
        # textos e legenda com IA
        pg.click("#btnTextosIA"); pg.wait_for_timeout(800)
        ok(pg.input_value('#campos [data-c="pre"]') == "Bora festejar" and pg.input_value('#campos [data-c="nome"]') == "Marina", "✨ TEXTOS COM IA preenche frases e não mexe no nome")
        pg.click("#btnLegenda"); pg.wait_for_timeout(800)
        ok(not pg.locator("#legendaBox").is_hidden() and "convidado" in pg.inner_text("#legenda"), "✨ MENSAGEM PARA ENVIAR aparece")
        # ajustes
        for k, v in (("pos", "topo"), ("caixa", "vidro"), ("par", "elegante"), ("cor", "escuro"), ("alinh", "esquerda"), ("qr", "rsvp")):
            pg.click(f'#ajustes [data-k="{k}"][data-v="{v}"]'); pg.wait_for_timeout(150)
        ok(not erros, f"ajustes sem erro {erros[:2]}")
        # PNG e PDF de verdade
        b64 = pg.evaluate("""(async()=>{const b=await __criador.png(true);const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(s)})()""")
        dim = pg.evaluate(DIM, b64); ok(dim == [1080, 1920], f"PNG story em 1080×1920 ({dim})")
        pg.click('#formatos [data-v=a5]'); pg.wait_for_timeout(200)
        info = pg.evaluate("""(async()=>{const o=await __criador.pdf(true);const d=await PDFLib.PDFDocument.load(o);const p=d.getPage(0).getSize();return [String.fromCharCode(...o.slice(0,4)),Math.round(p.width),Math.round(p.height),d.getPageCount()]})()""")
        ok(info[0] == "%PDF" and info[1:3] == [420, 595], f"PDF A5 de impressão ({info})")
        pg.click('#formatos [data-v=story]'); pg.wait_for_timeout(200)
        # pacote redes (sem compartilhar no teste: baixa 3 arquivos)
        nomes = pg.evaluate("(async()=>{const a=await __criador.compartilhar(['story','post','quadrado']);return a.map(f=>f.name)})()")
        ok(len(nomes) == 3 and all(n.endswith(".png") for n in nomes), f"PACOTE REDES: 3 arquivos {nomes}")
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro horizontal")
        # PENTE FINO 39: rolando até os ajustes do fim, a prévia continua na tela
        pg.evaluate("document.querySelector('#ajustes [data-k=qr]').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        r = pg.evaluate("(()=>{const b=document.getElementById('cv').getBoundingClientRect();return [Math.round(b.top),Math.round(b.bottom),innerHeight,Math.round(b.height)]})()")
        ok(r[0] >= -2 and r[1] <= r[2] + 2 and r[3] > 120, f"prévia continua visível ao rolar até os ajustes {r}")
        pg.screenshot(path=f"{TMP}/criador_{largura}.png", full_page=False)
        # abrir no editor
        pg.click("#btnEditor"); pg.wait_for_url("**/fotos.html*"); pg.wait_for_timeout(2500)
        ok(pg.evaluate("__fotos.FOTOS.length") == 1 and pg.evaluate("location.hash") == "", "ABRIR NO EDITOR: a arte chega no editor de fotos")
        ok(not erros, f"sem erro de JS no fim {erros[:2]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
raise SystemExit(1 if falhas else 0)
