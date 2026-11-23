#!/usr/bin/env python3
"""Teste local da AGENDA da tela inicial (16/11): abas PENDENTES / AGENDA, botão de concluir e seta de abrir/fechar.
Uso (na raiz):  python3 docs/testes/teste_agenda.py   — servidor local + stubs (METODOS T1); sai com erro se algo falhar."""
import datetime, http.server, json, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8812
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},gte(){return q},lte(){return q},not(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
hoje = datetime.date.today()
D = lambda n: (hoje + datetime.timedelta(days=n)).isoformat()
SEED = {
    "agenda_tarefas": [{"id": "tf_a", "titulo": "Tarefa atrasada", "data": D(-3), "cat": "tarefa", "feitos": []},
                       {"id": "tf_b", "titulo": "Tarefa futura", "data": D(2), "cat": "trabalho", "feitos": []}],
    "casa_contas": [{"id": 11, "c0": "Luz", "c1": "180", "c2": D(-1), "c3": "Não"}],
    "neg_eventos": [{"id": 500, "nome": "EVENTO TESTE", "data": D(3), "montagem": D(-2), "local": "Resort", "status": "Confirmado"}],
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
    if u.endswith("/agenda-tudo.html"):   # 20/11: a agenda saiu do Início e vive em cada ambiente; aqui a página da empresa com a agenda em modo "tudo" (motor inteiro)
        return r.fulfill(body=open("negocio.html", encoding="utf8").read().replace('id="bwAgenda" data-amb="pj"', 'id="bwAgenda" data-amb=""'), content_type="text/html; charset=utf-8")
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.abort()


falhas = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: falhas.append(msg)


semente = "".join(f"localStorage.setItem('bw_{k}_v1', {json.dumps(json.dumps(v))});" for k, v in SEED.items()) + "localStorage.setItem('ui_agenda_vista','\"lista\"');"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura in (1280, 390):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": 900}, service_workers="block", locale="pt-BR")
        ctx.route("**/*", rota); ctx.add_init_script("if(!sessionStorage.getItem('sem')){" + semente + "sessionStorage.setItem('sem','1')}")
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "agenda-tudo.html"); pg.wait_for_timeout(900)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(not erros and ov <= 0, f"index: erros={erros[:2]} estouro={ov}")
        pend = pg.inner_text(".ag-aba-box.ab-pend"); ag = pg.inner_text(".ag-aba-box.ab-ag")
        ok("Tarefa atrasada" in pend and "Luz" in pend and "Montagem — EVENTO TESTE" in pend and "Retornar — Ana" in pend, "PENDENTES: tarefa, conta, montagem e retorno")
        ok("Tarefa futura" in ag and "EVENTO TESTE" in ag and "Tarefa atrasada" not in ag, "AGENDA: só futuros")
        ok(pg.inner_text(".ag-aba.ab-pend .cont") == "4", "contagem de pendentes = 4")
        if largura == 1280: pg.screenshot(path="/tmp/agenda_antes.png", full_page=False, clip={"x": 0, "y": 0, "width": 1280, "height": 900})
        # concluir a montagem do evento
        pg.click(".ag-aba-box.ab-pend .ag-item:has-text('Montagem') [data-ok]"); pg.wait_for_timeout(300)
        ok("Montagem" not in pg.inner_text(".ag-aba-box.ab-pend") and pg.locator(".ag-aba-box.ab-ag .ag-item.feito:has-text('Montagem')").count() == 1, "concluir: sai de PENDENTES e entra na AGENDA em verde")
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bw_agenda_feitos_v1')).some(f=>f.id==='ev|500|mont')"), "concluído gravado em agenda_feitos")
        # conta → paga; tarefa → feitos; CRM → prox.feito
        pg.click(".ag-aba-box.ab-pend .ag-item:has-text('Luz') [data-ok]"); pg.wait_for_timeout(200)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bw_casa_contas_v1'))[0].c3") == "Sim", "conta marcada como paga")
        pg.click(".ag-aba-box.ab-pend .ag-item:has-text('Tarefa atrasada') [data-ok]"); pg.wait_for_timeout(200)
        ok(D(-3) in pg.evaluate("JSON.parse(localStorage.getItem('bw_agenda_tarefas_v1'))[0].feitos"), "tarefa: dia marcado em feitos")
        pg.click(".ag-aba-box.ab-pend .ag-item:has-text('Ana') [data-ok]"); pg.wait_for_timeout(200)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))[0].prox.feito") == D(0), "retorno do CRM concluído")
        ok(pg.inner_text(".ag-aba.ab-pend .cont") == "0" and "Nada pendente" in pg.inner_text(".ag-aba-box.ab-pend"), "PENDENTES zerado")
        # desfazer
        pg.click(".ag-aba-box.ab-ag .ag-item.feito:has-text('Luz') [data-ok]"); pg.wait_for_timeout(200)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('bw_casa_contas_v1'))[0].c3") == "Não" and "Luz" in pg.inner_text(".ag-aba-box.ab-pend"), "desfazer volta para PENDENTES")
        # seta: fechar e abrir (e lembrar)
        pg.click('.ag-aba[data-aba="ag"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate("document.querySelector('.ag-aba-box.ab-ag .ag-aba-corpo').hidden") is True, "seta fecha a AGENDA")
        pg.reload(); pg.wait_for_timeout(800)
        ok(pg.evaluate("document.querySelector('.ag-aba-box.ab-ag .ag-aba-corpo').hidden") is True, "fechada continua fechada ao recarregar")
        pg.click('.ag-aba[data-aba="ag"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate("document.querySelector('.ag-aba-box.ab-ag .ag-aba-corpo').hidden") is False, "seta abre de novo")
        # sino: montagem concluída e retorno concluído não contam
        sino = pg.evaluate("(document.getElementById('bwSinoN')||{}).textContent")
        ok(sino == "2", f"sino conta só o que falta (conta vencida + evento em 3 dias): {sino}")
        # calendário: coluna ao lado com as mesmas abas
        pg.click('[data-vista="mes"]'); pg.wait_for_timeout(300)
        ok(pg.locator("#agLado .ag-aba-box.ab-pend").count() == 1 and pg.locator("#agLado .ag-aba-box.ab-ag").count() == 1, "calendário: abas na coluna ao lado")
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(ov <= 0 and not erros, f"sem estouro/erros: {ov} {erros[:1]}")
        pg.click('[data-vista="lista"]'); pg.wait_for_timeout(300)
        pg.screenshot(path=f"/tmp/agenda_{largura}.png", full_page=True)
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
