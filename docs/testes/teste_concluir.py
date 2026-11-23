#!/usr/bin/env python3
"""Teste local do CONCLUIR (16/11): animação verde + confete ao mudar a condição (eventos, cachê, conta, orçamento) e cores das condições.
Uso (na raiz):  python3 docs/testes/teste_concluir.py   — servidor local + stubs (METODOS T1); sai com erro se algo falhar."""
import datetime, http.server, json, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8813
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},gte(){return q},lte(){return q},not(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
hoje = datetime.date.today()
D = lambda n: (hoje + datetime.timedelta(days=n)).isoformat()
SEED = {
    "neg_equipe_equipes": [], "neg_propostas": [],
    "agenda_tarefas": [{"id": "tf_a", "titulo": "Tarefa atrasada", "data": D(-3), "cat": "tarefa", "feitos": []},
                       {"id": "tf_b", "titulo": "Tarefa futura", "data": D(2), "cat": "trabalho", "feitos": []}],
    "casa_contas": [{"id": 11, "c0": "Luz", "c1": "180", "c2": D(-1), "c3": "Não"}],
    "neg_eventos": [{"id": 500, "nome": "EVENTO TESTE", "data": D(3), "montagem": D(-2), "local": "Resort", "status": "Confirmado", "contratado": 2000, "recebido": 0}],
    "mkt_leads": [{"id": "ld_1", "nome": "Ana", "etapa": "proposta", "criadoEm": D(-5), "prox": {"data": D(0), "oque": "Retornar"}, "hist": []}],
}


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



semente = "".join(f"localStorage.setItem('bw_{k}_v1', {json.dumps(json.dumps(v))});" for k, v in SEED.items()) + "localStorage.setItem('bw_neg_eventos_aba_v1','\"agenda\"');"
ESPIA = """window.__fx=[];new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.classList&&n.classList.contains('ag-confete'))window.__fx.push('confete')}))).observe(document,{childList:true,subtree:true});
new MutationObserver(ms=>ms.forEach(m=>{const t=m.target;if(t.classList&&t.classList.contains('bw-vira-verde'))window.__fx.push('verde');if(t.classList&&t.classList.contains('bw-vira-volta'))window.__fx.push('volta')})).observe(document,{attributes:true,subtree:true,attributeFilter:['class']});"""
def fx(pg): return pg.evaluate("window.__fx.splice(0)")
def cor(pg, sel): return pg.evaluate(f"getComputedStyle(document.querySelector({json.dumps(sel)})).color")
VERDE, VERM, AZUL = "rgb(62, 207, 142)", "rgb(255, 122, 122)", "rgb(138, 180, 255)"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura in (1280, 390):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": 900}, service_workers="block", locale="pt-BR")
        ctx.route("**/*", rota); ctx.add_init_script("if(!sessionStorage.getItem('sem')){" + semente + "sessionStorage.setItem('sem','1')}"); ctx.add_init_script(ESPIA)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "eventos.html"); pg.wait_for_timeout(1200)
        card = '[data-bw-card="500"]'
        ok(pg.locator(card).count() == 1, "cartão do evento marcado (data-bw-card)")
        ok(cor(pg, card + " .tag") == AZUL, "Confirmado = azul")
        ok("NÃO RECEBIDO" in pg.inner_text(card) and cor(pg, card + " .tag.dn") == VERM, "NÃO RECEBIDO avermelhado")
        fx(pg); pg.locator(card + " [data-pago]").click(); pg.wait_for_timeout(250)
        f = fx(pg); ok("confete" in f and "verde" in f, f"Marcar recebido → confete + verde ({sorted(set(f))})")
        ok("RECEBIDO ✓" in pg.inner_text(card) and cor(pg, card + " .tag.up") == VERDE, "RECEBIDO verde")
        ok("Recebido" in pg.inner_text("#bwAviso"), "aviso ✓ Recebido")
        pg.locator(card + " [data-fin]").click(); pg.wait_for_timeout(300)
        f = fx(pg); ok("confete" in f and "verde" in f, f"Finalizado → confete + verde ({sorted(set(f))})")
        ok("EVENTOS REALIZADOS" in pg.inner_text("#bwAviso") and cor(pg, card + " .tag") == VERDE, "Realizado = verde + aviso")
        pg.locator(card + " [data-pago]").click(); pg.wait_for_timeout(250)
        f = fx(pg); ok("confete" not in f and "volta" in f, f"Marcar não pago → sem confete, aviso discreto ({sorted(set(f))})")
        pg.locator(card + " [data-agd]").click(); pg.wait_for_timeout(250)
        f = fx(pg); ok("confete" not in f, "Agendar (voltar) → sem confete")
        ok(not erros, f"eventos: 0 erros JS {erros[:2]}")
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(ov <= 0, f"sem estouro ({ov})")
        # conta da casa
        pg.goto(BASE + "contas.html"); pg.wait_for_timeout(1200); fx(pg)
        bt = pg.locator('[onclick*="__togglePago"]').first
        ok(bt.count() == 1 and cor(pg, '[onclick*="__togglePago"]') == VERM, "conta não paga = vermelho")
        pg.evaluate("""(()=>{const a=document.querySelector('[onclick*="__togglePago"]');const p=a.closest('[data-painel]');if(p){p.classList.add('aberto');p.style.display='block'}a.scrollIntoView();a.click()})()"""); pg.wait_for_timeout(300); f = fx(pg)
        ok("confete" in f and "verde" in f, f"Marcar pago → confete + verde ({sorted(set(f))})")
        ok(not erros, f"contas: 0 erros JS {erros[:2]}")
        # home: a agenda continua só com a festa dela (sem dobrar)
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(1200); ok(not erros, f"index: 0 erros {erros[:2]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas))
sys.exit(1 if falhas else 0)
