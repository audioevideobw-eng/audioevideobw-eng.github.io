#!/usr/bin/env python3
"""Teste local (22/11): CAIXA ÚNICA do Tio Cláudio na página do robô + BW Smart (nível da IA) + varinha. IA simulada.
Uso (na raiz): python3 docs/testes/teste_pede.py"""
import http.server, json, os, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
os.chdir(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", 8831), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
STUB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},maybeSingle(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
const ses={access_token:'t',user:{id:'u1',email:'teste@exemplo.com',user_metadata:{}}};
return {auth:{getSession:async()=>({data:{session:ses}}),getUser:async()=>({data:{user:ses.user}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),channel(){const c={on(){return c},subscribe(){return c}};return c},removeChannel(){}};}};"""
PEDIDOS = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "/functions/v1/bw-ia" in u:
        try: c = json.loads(r.request.post_data or "{}")
        except Exception: c = {}
        PEDIDOS.append(c)
        if "melhora PEDIDOS" in (c.get("sistema") or ""):
            return r.fulfill(status=200, content_type="application/json", body=json.dumps({"texto": "**Lançar** um gasto de R$ 80 no mercado, hoje. [qual a categoria?]", "modelo": "openai/gpt-oss-120b", "nivel": "inteligente", "reserva": False}))
        return r.fulfill(status=200, content_type="application/json", body=json.dumps({"texto": json.dumps({"acoes": [], "resposta": "Oi!"}), "modelo": "llama-3.1-8b-instant", "nivel": "rapido", "reserva": True}))
    return r.abort()
F = []
def ok(c, m): print(("  ✓ " if c else "  ✗ ") + m); (None if c else F.append(m))
B = "http://127.0.0.1:8831/"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for w in (1280, 390):
        print(f"=== {w}px ===")
        ctx = b.new_context(viewport={"width": w, "height": 900}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(B + "index.html"); pg.wait_for_function("window.BWAgente && window.BWIA", timeout=8000); pg.wait_for_timeout(500)
        ok(pg.is_visible("#bpTexto") and pg.is_visible("#bpEnviar") and pg.is_visible("#bpModelo"), "caixa visível com campo, enviar e modelo")
        ov = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(ov <= 0, f"sem estouro ({ov})")
        r = pg.evaluate("(()=>{const a=document.getElementById('bwPede').getBoundingClientRect(),h=document.getElementById('ambPortal').getBoundingClientRect();return a.top>=h.bottom-2})()"); ok(r, "caixa abaixo do robô, sem cobrir as telas")
        ok(pg.inner_text("#bpModeloNome") == "BW Smart", "padrão = BW Smart")
        # modelo
        pg.click("#bpModelo"); pg.wait_for_timeout(150); ok(pg.locator("#bpMenu [data-nivel]").count() == 3, "menu do modelo com 3 níveis")
        frente = pg.evaluate("""() => { const m = document.getElementById('bpMenu'), r = m.getBoundingClientRect(); const pts = [[.2,.15],[.5,.15],[.8,.15],[.2,.5],[.5,.5],[.8,.5],[.5,.85]];
          return pts.every(([fx,fy]) => { const e = document.elementFromPoint(r.left + r.width*fx, r.top + r.height*fy); return e && m.contains(e); }) && r.top >= 0 && r.bottom <= innerHeight; }""")
        ok(frente, "o menu fica NA FRENTE de tudo (roda do robô e Tio Cláudio) e inteiro na tela")
        pg.click('#bpMenu [data-nivel="rapido"]'); pg.wait_for_timeout(100)
        ok(pg.inner_text("#bpModeloNome") == "Rápido" and pg.evaluate("localStorage.getItem('ui_agente_nivel')") == '"rapido"' and not pg.is_visible("#bpMenu"), "escolher Rápido grava no aparelho e fecha")
        pg.reload(); pg.wait_for_function("window.BWIA", timeout=8000); ok(pg.inner_text("#bpModeloNome") == "Rápido", "escolha continua ao recarregar")
        pg.evaluate("BWIA.escolher('smart')")
        ok(pg.evaluate("BWIA.para('gastei 80 no mercado','comando')") == "rapido" and pg.evaluate("BWIA.para('monte um roteiro de reels para o evento da Vale','comando')") == "inteligente" and pg.evaluate("BWIA.para('oi','papo')") == "rapido", "BW Smart escolhe rápido/inteligente pelo pedido")
        # atalhos
        pg.click("#bpRaio"); pg.wait_for_timeout(150); ok(pg.locator('#bpMenu a[href="propostas.html"]').count() == 1 and pg.locator("#bpMenu [data-por]").count() == 4, "atalhos: gerar e lançar")
        pg.click('#bpMenu [data-por^="Gastei"]'); pg.wait_for_timeout(100)
        ok(pg.input_value("#bpTexto").startswith("Gastei R$") and pg.evaluate("document.activeElement.id") == "bpTexto", "atalho de lançar preenche a caixa e põe o cursor")
        pg.click("#bpMais"); pg.wait_for_timeout(150); ok(pg.locator('#bpMenu a[href="leitor.html"]').count() == 1, "＋ anexar leva ao leitor de contas")
        pg.mouse.click(5, 5); pg.wait_for_timeout(100); ok(not pg.is_visible("#bpMenu"), "toque fora fecha o menu")
        # varinha
        PEDIDOS.clear(); pg.fill("#bpTexto", "gastei 80 mercado"); pg.click("#bpVarinha"); pg.wait_for_timeout(700)
        ok(pg.input_value("#bpTexto").startswith("Lançar um gasto de R$ 80") and "**" not in pg.input_value("#bpTexto"), "varinha reescreve (sem marcação)")
        ok(PEDIDOS and PEDIDOS[-1].get("nivel") == "inteligente", "varinha usa o nível inteligente")
        ok("Respondido por" in pg.inner_text("#bpVia") and "gpt-oss-120b" in pg.inner_text("#bpVia"), "mostra qual modelo respondeu")
        pg.click("#bpDesfaz"); pg.wait_for_timeout(100); ok(pg.input_value("#bpTexto") == "gastei 80 mercado", "↺ volta ao texto da pessoa")
        # enviar
        pg.evaluate("() => { window.__env=[]; BWAgente.processar=function(t){window.__env.push(t)} }")
        pg.fill("#bpTexto", "como está meu dia?"); pg.press("#bpTexto", "Enter"); pg.wait_for_timeout(200)
        ok(pg.evaluate("window.__env") == ["como está meu dia?"] and pg.input_value("#bpTexto") == "", "Enter manda para o Tio Cláudio e limpa")
        pg.fill("#bpTexto", "linha 1"); pg.press("#bpTexto", "Shift+Enter"); ok(pg.evaluate("window.__env.length") == 1, "Shift+Enter não envia")
        pg.fill("#bpTexto", ""); pg.click("#bpEnviar"); ok(pg.evaluate("window.__env.length") == 1, "vazio não envia")
        # papo com reserva
        PEDIDOS.clear(); pg.evaluate("BWIA.escolher('smart')")
        pg.goto(B + "index.html"); pg.wait_for_function("window.BWAgente", timeout=8000); pg.wait_for_timeout(300)
        pg.evaluate("BWAgente.entender && BWAgente.entender('me conta uma piada')"); pg.wait_for_timeout(900)
        ok(any(c.get("nivel") in ("rapido", "inteligente") for c in PEDIDOS), "Tio Cláudio manda o nível para a IA")
        ok("reserva" in pg.inner_text("#bpVia"), "aviso quando a reserva respondeu")
        ok(not er, f"0 erros de JS {er[:2]}")
        # modo claro / pb
        for modo in ("pb", "clean"):
            pg.evaluate(f"localStorage.setItem('ui_modo','{modo}')"); pg.reload(); pg.wait_for_timeout(500)
            cor = pg.evaluate("getComputedStyle(document.getElementById('bpTexto')).color"); fundo = pg.evaluate("getComputedStyle(document.querySelector('.bp-caixa')).backgroundColor")
            ok(cor != fundo, f"modo {modo}: texto legível ({cor} sobre {fundo})")
        pg.screenshot(path=f"/tmp/pede_{w}.png")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not F else f"❌ {len(F)} falhas: {F}"))
