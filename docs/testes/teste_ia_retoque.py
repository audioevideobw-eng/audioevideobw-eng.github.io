#!/usr/bin/env python3
"""Teste local do RETOQUE COM IA do editor de fotos (16/11): cor do cabelo, cor da roupa, pele suave e efeito no fundo.
Sem internet aqui: o MediaPipe não baixa, então o teste injeta MÁSCARAS FALSAS (cabelo = faixa de cima, roupa = faixa de baixo,
fundo = laterais) e confere a conta das cores pixel a pixel, o painel, desfazer, "usar em todas" e a exportação.
Uso (na raiz):  python3 docs/testes/teste_ia_retoque.py"""
import http.server, os, socketserver, threading
from PIL import Image
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8817; TMP = "/tmp/teste_ia"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),
onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
# foto: cabelo escuro em cima, pele no meio, roupa cinza embaixo, fundo verde nas laterais
im = Image.new("RGB", (800, 1000), (40, 140, 60))
for y in range(1000):
    for x in range(200, 600):
        im.putpixel((x, y), (25, 20, 18) if y < 300 else (205, 160, 130) if y < 600 else (120, 120, 125))
im.save(f"{TMP}/pessoa.jpg", quality=95); im.save(f"{TMP}/pessoa2.jpg", quality=95)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
import base64, io as _io
_b = _io.BytesIO(); Image.new("RGB", (640, 800), (230, 60, 160)).save(_b, "JPEG"); FAKE = base64.b64encode(_b.getvalue()).decode()
PEDIDOS = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "functions/v1/bw-ia-imagem" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        if "application/json" in (r.request.headers.get("content-type") or ""): return r.fulfill(body='{"pronto":true,"limite":10}', content_type="application/json")
        PEDIDOS.append(r.request.post_data_buffer or b"")
        return r.fulfill(body='{"imagem":"' + FAKE + '"}', content_type="application/json")
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

FALSA = """(i)=>{const f=__fotos.FOTOS[i],w=80,h=100;function mk(fn){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';
  for(let y=0;y<h;y++)for(let X=0;X<w;X++)if(fn(X,y)){x.fillRect(X,y,1,1)}return c}
  f.seg={cab:mk((x,y)=>x>=20&&x<60&&y<30),pele:mk((x,y)=>x>=20&&x<60&&y>=30&&y<60),roupa:mk((x,y)=>x>=20&&x<60&&y>=60),fundo:mk((x,y)=>x<20||x>=60),cabL:0.08,peleL:0.66,roupaL:0.47,fundoL:0.45,achou:{cab:.15,pele:.15,roupa:.2,fundo:.5}}}"""
PX = """(p)=>{const c=__fotos.montar(__fotos.FOTOS[0].prev,__fotos.FOTOS[0],{lado:400}),x=c.getContext('2d'),W=c.width,H=c.height,r=[];
  for(const [fx,fy] of p){const d=x.getImageData(Math.round(fx*W),Math.round(fy*H),1,1).data;r.push([d[0],d[1],d[2]])}return r}"""
PONTOS = [(0.5, 0.15), (0.5, 0.75), (0.1, 0.5), (0.5, 0.45)]   # cabelo, roupa, fundo, pele

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for largura, altura in ((1280, 860), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); dlg = []; pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(600)
        pg.set_input_files("#arquivos", [f"{TMP}/pessoa.jpg", f"{TMP}/pessoa2.jpg"]); pg.wait_for_timeout(1300)
        pg.click('#abas [data-aba="fundo"]'); pg.wait_for_timeout(300)
        txt = pg.inner_text("#abas"); ok("IA" in txt and "FUNDO IA" not in txt, "aba agora se chama ✨ IA")
        ok(pg.locator('#ctrl [data-k="iaAnalisar"]').count() >= 1, "sem análise: mostra ✨ ANALISAR ESTA FOTO")
        ok(pg.locator('#ctrl [data-k="recortar"]').count() >= 1, "REMOVER FUNDO continua na mesma aba")
        antes = pg.evaluate(PX, PONTOS)
        pg.evaluate(FALSA, 0); pg.evaluate("__fotos.aba('fundo')"); pg.wait_for_timeout(200)
        ok(pg.locator('#ctrl [data-k="iaCab"]').count() > 5, "depois da análise: aparecem as cores do cabelo/roupa, pele e fundo")
        pg.evaluate("__fotos.gravarHist()")
        pg.click('#ctrl .chip[data-k="iaCab"][data-v="#e2bd74"]'); pg.wait_for_timeout(350)
        pg.click('#ctrl .chip[data-k="iaRoupa"][data-v="#c22b2b"]'); pg.wait_for_timeout(350)
        pg.click('#ctrl .chip[data-k="iaFundo"][data-v="pb"]'); pg.wait_for_timeout(350)
        pg.evaluate("__fotos.gravarHist()")
        d = pg.evaluate(PX, PONTOS); c, r, f, pe = d
        ok(sum(c) > sum(antes[0]) + 250 and c[0] > c[2] + 40, f"cabelo escuro virou LOIRO {antes[0]} → {c}")
        ok(r[0] > r[1] + 60 and r[0] > r[2] + 60, f"roupa cinza virou VERMELHA {antes[1]} → {r}")
        ok(max(f) - min(f) < 12, f"fundo verde virou preto e branco {antes[2]} → {f}")
        ok(abs(pe[0] - antes[3][0]) < 6, f"pele não muda de cor {antes[3]} → {pe}")
        ok(pg.locator('#ctrl input[type=range][data-k="iaCabF"]').count() == 1, "slider de intensidade do cabelo aparece")
        pg.evaluate("__fotos.acao('iaPele','60')"); pg.wait_for_timeout(200)
        ok(pg.evaluate("__fotos.iaAtiva(__fotos.FOTOS[0])"), "retoque ativo na foto 1")
        # antes/depois: o lado ANTES fica sem retoque
        sem = pg.evaluate("""(()=>{const f=__fotos.FOTOS[0],c=__fotos.montar(f.prev,f,{lado:400,semAjustes:true}),d=c.getContext('2d').getImageData(c.width/2,c.height*.15,1,1).data;return [d[0],d[1],d[2]]})()""")
        ok(abs(sem[0] - antes[0][0]) < 8, f"ANTES/DEPOIS mostra o cabelo original no lado antes {sem}")
        # desfazer
        for _ in range(5):
            if pg.evaluate("__fotos.FOTOS[0].ia.cab") == "": break
            pg.click("#edDesfazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS[0].ia.cab") == "", "↶ desfazer volta o cabelo original")
        for _ in range(5):
            if pg.evaluate("__fotos.FOTOS[0].ia.cab") == "#e2bd74": break
            pg.click("#edRefazer"); pg.wait_for_timeout(300)
        ok(pg.evaluate("__fotos.FOTOS[0].ia.cab") == "#e2bd74", "↷ refazer volta o loiro")
        # usar em todas (foto 2 também precisa de análise: simulamos antes)
        pg.evaluate(FALSA, 1); pg.evaluate("__fotos.aba('fundo')"); pg.wait_for_timeout(150)
        pg.click('#ctrl [data-k="iaTodas"]'); pg.wait_for_timeout(500)
        ok(pg.evaluate("__fotos.FOTOS[1].ia.cab==='#e2bd74' && __fotos.FOTOS[1].ia.fundo==='pb'"), "✨ USAR EM TODAS copia o retoque para a foto 2")
        # exportar de verdade (blob) com retoque
        n = pg.evaluate("""(async()=>{const r=await __fotos.exportar('uma',true);return r&&r.size||(window.__ultimoBlob&&window.__ultimoBlob.size)||1})()""")
        ok(not erros, f"sem erro de JS {erros[:2]}")
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro horizontal")
        pg.screenshot(path=f"{TMP}/ia_{largura}.png")
        # IA CRIATIVA (nuvem simulada): pede confirmação, manda cópia pequena + pedido e põe a nova versão AO LADO da original
        pg.evaluate("BWSync.cliente=()=>({auth:{getSession:async()=>({data:{session:{access_token:'t'}}})}})")
        pg.evaluate("__fotos.aba('fundo')"); pg.wait_for_timeout(200)
        ok(pg.locator('#ctrl [data-k="iaCriar"]').count() == 1 and pg.locator('#ctrl textarea[data-k="iaPedido"]').count() == 1, "seção ✨ IA CRIATIVA aparece com campo e botão")
        pg.click('#ctrl .chip[data-k="iaSug"] >> nth=0'); pg.click('#ctrl .chip[data-k="iaSug"] >> nth=6')
        ok(pg.input_value('#ctrl textarea[data-k="iaPedido"]') == "cabelo cacheado, terno azul-marinho", "sugestões se somam no pedido")
        dlg.clear()
        n0 = pg.evaluate("__fotos.FOTOS.length"); antes_n = len(PEDIDOS)
        pg.click('#ctrl [data-k="iaCriar"]'); pg.wait_for_timeout(1500)
        ok(dlg and "nuvem" in dlg[0], "pede confirmação antes de enviar a foto")
        ok(len(PEDIDOS) == antes_n + 1 and b"cabelo cacheado" in PEDIDOS[-1], "enviou 1 pedido com o texto")
        ok(pg.evaluate("__fotos.FOTOS.length") == n0 + 1 and pg.evaluate("__fotos.FOTOS[1].nome").endswith("-ia"), "nova versão entrou logo depois da original")
        # sem retoque
        pg.evaluate("__fotos.FOTOS.splice(1,1)"); pg.evaluate("document.querySelector('#edFolha')&&document.querySelector('#edFolha').remove()"); pg.click('#edFotos [data-i="0"]'); pg.wait_for_timeout(300)
        pg.click('#ctrl [data-k="iaZerar"]'); pg.wait_for_timeout(300)
        ok(not pg.evaluate("__fotos.iaAtiva(__fotos.FOTOS[0])"), "↺ SEM RETOQUE desliga tudo")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
raise SystemExit(1 if falhas else 0)
