#!/usr/bin/env python3
"""Teste local do EVENTO DE VÁRIOS DIAS (19/11): campo "Termina em" (dataFim) em EVENTOS, todos os dias + risco na AGENDA, sino e pendentes.
Uso (na raiz):  python3 docs/testes/teste_evento_dias.py   — servidor local + stubs (METODOS T1); sai com erro se algo falhar."""
import datetime, http.server, json, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8829
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},gte(){return q},lte(){return q},not(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
hoje = datetime.date.today()
D = lambda n: (hoje + datetime.timedelta(days=n)).isoformat()
BR = lambda n: (hoje + datetime.timedelta(days=n)).strftime("%d/%m/%Y")
SEED = {"neg_eventos": [{"id": 700, "nome": "FEIRA TRES DIAS", "data": D(-1), "dataFim": D(1), "local": "Expominas", "status": "Confirmado"},
                        {"id": 701, "nome": "EVENTO UM DIA", "data": D(2), "local": "Hotel", "status": "Confirmado"}]}


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


semente = "".join(f"localStorage.setItem('bw_{k}_v1', {json.dumps(json.dumps(v))});" for k, v in SEED.items()) + "localStorage.setItem('ui_agenda_vista','\"mes\"');"
EV = "JSON.parse(localStorage.getItem('bw_neg_eventos_v1')||'[]')"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura in (1280, 390):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": 900}, service_workers="block", locale="pt-BR")
        ctx.route("**/*", rota); ctx.add_init_script("if(!sessionStorage.getItem('sem')){" + semente + "sessionStorage.setItem('sem','1')}")
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(1000)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(not erros and ov <= 0, f"index: erros={erros[:2]} estouro={ov}")
        its = pg.evaluate(f"BWAgendaItens('{D(-1)}','{D(2)}').filter(i => i.tipo === 'evento').map(i => [i.data, i.titulo, i.sub, i.faixa || '', i.chave])")
        feira = [i for i in its if i[1] == "FEIRA TRES DIAS"]
        ok([i[0] for i in feira] == [D(-1), D(0), D(1)] and [i[3] for i in feira] == ["ini", "meio", "fim"] and feira[1][2].startswith("Dia 2 de 3"), f"o evento de 3 dias aparece nos 3 dias (início, meio e fim) {[(i[0], i[3]) for i in feira]}")
        ok(len(set(i[4] for i in feira)) == 1 and [i[3] for i in its if i[1] == "EVENTO UM DIA"] == [""], "mesma chave nos 3 dias; evento de um dia continua sem risco")
        if pg.locator(".ag-grade").count() == 0: pg.evaluate("localStorage.setItem('ui_agenda_vista','\"mes\"')")
        ok(pg.locator(f'.ag-dia[data-dia="{D(0)}"] .ag-risco.meio').count() == 1, "o quadrado de hoje (dia do meio) tem o risco")
        n = pg.locator(".ag-grade .ag-risco").count(); ok(1 <= n <= 3, f"risco só nos dias do evento ({n} quadrados na grade deste mês)")
        r = pg.evaluate(f"(() => {{ const a = document.querySelector('.ag-dia[data-dia=\"{D(0)}\"] .ag-risco'), c = a.parentElement.getBoundingClientRect(), x = a.getBoundingClientRect(); return [x.left < c.left, x.right > c.right, x.height]; }})()")
        ok(r[0] and r[1] and r[2] >= 3, f"o risco do meio passa das bordas do quadrado (liga com os vizinhos) {r}")
        pend = pg.inner_text(".ag-aba-box.ab-pend")
        ok(pend.count("FEIRA TRES DIAS") == 1, "PENDENTES mostra o evento em andamento uma vez só (não uma linha por dia)")
        if largura == 1280: pg.screenshot(path="/tmp/evento_dias.png", clip={"x": 0, "y": 0, "width": 1280, "height": 900})
        pg.click(".ag-aba-box.ab-pend .ag-item:has-text('FEIRA TRES DIAS') [data-ok]"); pg.wait_for_timeout(400)
        ok("FEIRA TRES DIAS" not in pg.inner_text(".ag-aba-box.ab-pend") and pg.locator(".ag-grade .ag-risco.feito").count() == n, "concluir uma vez conclui o evento inteiro (risco fica verde em todos os dias)")
        pg.click(".ag-aba-box.ab-ag .ag-item.feito:has-text('FEIRA TRES DIAS') [data-ok]") if pg.locator(".ag-aba-box.ab-ag .ag-item.feito:has-text('FEIRA TRES DIAS') [data-ok]").count() else None
        # EVENTOS: cartão, novo e alterar
        pg.goto(BASE + "eventos.html"); pg.wait_for_timeout(1500)
        cartao = pg.inner_text('[data-bw-card="700"]')
        ok(f"{BR(-1)} a {BR(1)} (3 dias)" in cartao and "EM ANDAMENTO · DIA 2 DE 3" in cartao.upper(), "EVENTOS: o cartão mostra o período e EM ANDAMENTO · dia 2 de 3")
        ok(BR(2) in pg.inner_text('[data-bw-card="701"]') and "dias)" not in pg.inner_text('[data-bw-card="701"]'), "evento de um dia continua igual")
        nr = pg.locator("#agCal .ev-risco").count(); ok(1 <= nr <= 3 and pg.locator('#agCal .ev-risco[data-faixa="meio"]').count() == 1, f"a agenda da página EVENTOS também marca todos os dias com o risco ({nr})")
        pg.fill("#evFNome", "CONGRESSO TESTE"); pg.fill("#evFData", D(10)); pg.fill("#evFFim", D(12)); pg.click("#evFAdd"); pg.wait_for_timeout(700)
        novo = [e for e in pg.evaluate(EV) if e["nome"] == "CONGRESSO TESTE"]
        ok(len(novo) == 1 and novo[0]["data"] == D(10) and novo[0]["dataFim"] == D(12), f"novo evento grava o último dia (dataFim) {[(e['data'], e.get('dataFim')) for e in novo]}")
        ok(f"{BR(10)} a {BR(12)} (3 dias)" in pg.inner_text(f'[data-bw-card="{novo[0]["id"]}"]'), "o cartão do novo mostra 3 dias")
        pg.evaluate(f"window.__evEditar('{novo[0]['id']}')"); pg.wait_for_timeout(500)
        ok(pg.input_value("#edFim") == D(12), "ALTERAR abre com o último dia preenchido")
        pg.fill("#edFim", D(9)); pg.click("#edSalvar"); pg.wait_for_timeout(700)
        ok([e for e in pg.evaluate(EV) if e["nome"] == "CONGRESSO TESTE"][0]["dataFim"] == "", "último dia antes do primeiro é ignorado (vira evento de um dia)")
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(not erros and ov <= 0, f"eventos: erros={erros[:2]} estouro={ov}")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas), falhas)
sys.exit(1 if falhas else 0)
