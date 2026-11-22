#!/usr/bin/env python3
"""Teste local do CONTROLE PELO CELULAR e da PRÉVIA EM OUTRA TELA do EDITOR DE VÍDEO (21/11).
O Supabase Realtime é SIMULADO por um barramento falso dentro da página (window.__BWControleCliente) — o "celular" é o mesmo barramento.
Confere: 📱 abre o painel com código de 6 letras, sem QR quando a internet falta (diz para usar o código), comando do celular toca/pausa,
anda e corta; o PC devolve o tempo; ✕ DESLIGAR fecha; controle.html abre sem erro e ligada por ?c=; nada além do canal sai da página.
1280 e 390 px.   Uso (na raiz): python3 docs/testes/teste_controle.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8867
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
BUS = """window.__bus={};window.__BWControleCliente={channel(n){const ch={n,h:{},on(t,f,cb){ch.h[f.event]=cb;return ch},subscribe(cb){(__bus[n]=__bus[n]||[]).push(ch);cb&&cb('SUBSCRIBED');return ch},
 send(m){(__bus[n]||[]).forEach(o=>{if(o!==ch&&o.h[m.event])o.h[m.event]({payload:m.payload})})},unsubscribe(){__bus[n]=(__bus[n]||[]).filter(o=>o!==ch)}};return ch},removeChannel(){}};
window.__celular=(cod)=>{const ch=__BWControleCliente.channel('bwc-'+cod);ch.on('broadcast',{event:'estado'},m=>{window.__estado=m.payload});ch.subscribe();return {mandar:(c,x)=>ch.send({type:'broadcast',event:'cmd',payload:Object.assign({c},x||{})})}};"""
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
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota); ctx.add_init_script(BUS)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
        pg.evaluate("(()=>{const P=__video.P();P.clips.push({id:'tx1',trilha:'tx',tipo:'texto',ini:0,dur:20,txt:'OI',fonte:'Inter',tam:10,cor:'#ffffff',fundo:'',x:0,y:0,op:100,fin:0,fout:0});__video.tudo()})()")
        bt = pg.locator("#veCelular"); ok(bt.count() == 1, "botão 📱 CONTROLE PELO CELULAR no editor")
        pg.evaluate("document.getElementById('veCelular').click()"); pg.wait_for_selector("#bwcPainel", timeout=5000); pg.wait_for_timeout(600)
        cod = pg.inner_text("#bwcCodigo").strip(); ok(len(cod) == 6 and cod.isalnum(), f"painel com o código de 6 letras ({cod})")
        ok("Sem QR" in pg.inner_text("#bwcQr") or pg.locator("#bwcQr img").count() == 1, "sem internet para o QR, o painel manda usar o código")
        r = pg.evaluate("document.getElementById('bwcPainel').getBoundingClientRect().right") ; ok(r <= largura, "o painel cabe na tela")
        pg.evaluate(f"window.__cel=__celular('{cod}');__cel.mandar('alternar')"); pg.wait_for_timeout(500)
        ok(pg.evaluate("__video.tocando()"), "TOCAR pelo celular faz o editor tocar")
        ok("CELULAR LIGADO" in pg.inner_text("#bwcEstado"), "o painel mostra CELULAR LIGADO")
        pg.evaluate("__cel.mandar('pausar')"); pg.wait_for_timeout(300); ok(not pg.evaluate("__video.tocando()"), "PAUSAR pelo celular")
        pg.evaluate("__cel.mandar('ir',{t:5});__cel.mandar('passo',{d:1})"); pg.wait_for_timeout(700)
        ok(abs(pg.evaluate("__video.T()") - 6) < 0.05, "arrastar a agulha e +1 s pelo celular mexem no editor")
        est = pg.evaluate("window.__estado"); ok(est and abs(est["t"] - 6) < 0.05 and est["total"] >= 20, f"o editor devolve o tempo ao celular ({est})")
        n = pg.evaluate("__video.P().clips.length"); pg.evaluate("__video.sel('tx1');__cel.mandar('dividir')"); pg.wait_for_timeout(400)
        ok(pg.evaluate("__video.P().clips.length") == n + 1, "✂ CORTAR AQUI pelo celular divide o take na agulha")
        pg.evaluate("__cel.mandar('desfazer')"); pg.wait_for_timeout(400); ok(pg.evaluate("__video.P().clips.length") == n, "↶ DESFAZER pelo celular")
        pg.click("#bwcFechar"); pg.wait_for_timeout(300); ok(pg.locator("#bwcPainel").count() == 0 and pg.evaluate("Object.values(__bus).every(a=>a.length<=1)"), "✕ DESLIGAR fecha o painel e sai do canal")
        ok(not erros, "editor sem erro de JavaScript" + (": " + "; ".join(erros[:3]) if erros else ""))
        # página do celular
        pg2 = ctx.new_page(); e2 = []; pg2.on("pageerror", lambda e: e2.append(str(e)))
        pg2.goto(BASE + "controle.html"); pg2.wait_for_timeout(500)
        ok(pg2.locator("#codigo").is_visible() and not pg2.locator("#cxControle").is_visible(), "controle.html pede o código")
        pg2.fill("#codigo", "ab12"); pg2.click("#ligar"); ok(pg2.locator("#cxCodigo").is_visible(), "código curto é recusado")
        pg2.goto(BASE + "controle.html?c=XYZ234"); pg2.wait_for_timeout(500)
        ok(pg2.locator("#cxControle").is_visible() and "PROCURANDO" in pg2.inner_text("#estadoTxt").upper(), "aberta pelo link ?c= já liga e procura o editor")
        pg2.evaluate("__bus['bwc-XYZ234'][0].h.estado({payload:{t:3.5,total:10,tocando:true}})"); pg2.wait_for_timeout(200)
        ok("0:03,5" in pg2.inner_text("#tempo") and "PAUSAR" in pg2.inner_text("#tocar") and "LIGADO" in pg2.inner_text("#estadoTxt"), "recebe o tempo do editor e mostra ⏸ PAUSAR")
        sw = pg2.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(sw <= 0, f"controle.html sem estouro lateral ({sw})")
        ok(not e2, "controle.html sem erro de JavaScript" + (": " + "; ".join(e2[:3]) if e2 else ""))
        ok(all("qrcode-generator" in u or "supabase" in u for u in FORA), "nada sai da página além do QR e do canal" + (": " + ", ".join(FORA[:3]) if FORA else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
