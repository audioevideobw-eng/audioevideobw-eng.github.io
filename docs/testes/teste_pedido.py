#!/usr/bin/env python3
"""Teste local do link PEDIR ORÇAMENTO (pedido.html), do cartão do link no funil e das COTAÇÕES DE MILHAS (configadm). 16/11/2026.
Uso (na raiz): python3 docs/testes/teste_pedido.py"""
import http.server, socketserver, threading, os, json
from playwright.sync_api import sync_playwright
os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
socketserver.TCPServer.allow_reuse_address=True
srv=socketserver.TCPServer(("127.0.0.1",8813),Q); threading.Thread(target=srv.serve_forever,daemon=True).start()
STUB="""window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},maybeSingle(){return q},update(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null})};}};"""
corpos=[]; modo={"st":201}
def rota(r):
    u=r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB,content_type="application/javascript")
    if "/rest/v1/bw_pedidos" in u:
        corpos.append(json.loads(r.request.post_data))
        return r.fulfill(status=modo["st"], body=('' if modo["st"]==201 else '{"message":"LINK_INVALIDO: x"}'), content_type="application/json")
    return r.abort()
F=[]
def ok(c,m): print(("✓ " if c else "✗ ")+m); (None if c else F.append(m))
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome",args=["--no-sandbox"])
    for w in (1280,390):
        ctx=b.new_context(viewport={"width":w,"height":900},service_workers="block"); ctx.route("**/*",rota); pg=ctx.new_page(); er=[]; pg.on("pageerror",lambda e:er.append(str(e)))
        pg.goto("http://127.0.0.1:8813/pedido.html?p=pdteste123&n=BW%20Produ%C3%A7%C3%B5es&w=5531996983721&s=Transmiss%C3%A3o%20ao%20vivo|Fotografia|Outro"); pg.wait_for_timeout(500)
        ok(pg.inner_text("#tNome")=="BW Produções" and pg.locator("#servico option").count()==4, "título e serviços do link")
        pg.click("#enviar"); ok("nome" in pg.inner_text("#aviso"), "valida nome")
        pg.fill("#nome","Teste Cliente"); pg.click("#enviar"); ok("WhatsApp ou o e-mail" in pg.inner_text("#aviso"), "exige contato")
        pg.fill("#whats","31988887777"); pg.select_option("#servico","Fotografia"); pg.fill("#data","2027-01-10"); pg.select_option("#como","Instagram")
        modo["st"]=400; pg.click("#enviar"); pg.wait_for_timeout(300); ok("não está mais ativo" in pg.inner_text("#aviso"), "link inválido → mensagem amigável")
        modo["st"]=201; pg.click("#enviar"); pg.wait_for_timeout(400)
        c=corpos[-1]; ok(c["token"]=="pdteste123" and c["whatsapp"]=="(31) 98888-7777" and c["servico"]=="Fotografia" and c["como_conheceu"]=="Instagram" and c["email"] is None, f"corpo enviado {c}")
        ok("Pedido enviado" in pg.inner_text("body") and pg.locator("a.bt.wa").count()==1, "tela de sucesso + WhatsApp")
        ov=pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(ov<=0 and not er, f"sem estouro/erro {ov} {er}")
        if w==390: pg.goto("http://127.0.0.1:8813/pedido.html?p=pdteste123&n=BW%20Produ%C3%A7%C3%B5es"); pg.wait_for_timeout(400); pg.screenshot(path="/tmp/pedido390.png",full_page=True)
        pg.goto("http://127.0.0.1:8813/pedido.html"); pg.wait_for_timeout(300); ok("Link incompleto" in pg.inner_text("body"), "sem token → aviso")
        # captacao: card do link
        pg.goto("http://127.0.0.1:8813/captacao.html"); pg.evaluate("""localStorage.setItem('bw_mkt_config_v1',JSON.stringify([{id:'cfg_link_pedido',valor:{token:'pdabc123',nome:'BW Produções',whats:'(31) 99698-3721'}}]))"""); pg.reload(); pg.wait_for_timeout(700)
        lk=pg.inner_text("#lkBox"); ok("pedido.html?p=pdabc123&n=BW%20Produ%C3%A7%C3%B5es&w=5531996983721&s=" in lk, "link montado no funil")
        ok(not er, f"captacao sem erro {er}")
        pg.goto("http://127.0.0.1:8813/crm.html"); pg.wait_for_timeout(500); ok("PEDIR ORÇAMENTO" in pg.inner_text("body") and not er, "card no CRM")
        pg.goto("http://127.0.0.1:8813/configadm.html"); pg.wait_for_timeout(4000); ok(not er and pg.locator("#mlProgs input").count()>5, f"milhas ADM carrega {pg.locator('#mlProgs input').count()} campos {er[:1]}")
        ctx.close()
    b.close()
srv.shutdown(); print("FALHAS",len(F),F)
