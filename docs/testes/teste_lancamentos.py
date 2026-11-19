#!/usr/bin/env python3
"""Teste local da página LANÇAMENTOS (18/11): passos O QUE É → ONDE → VALOR; cada destino grava no formato da página dona (orçamento da casa,
contas a pagar, reserva, fluxo do negócio, custo/recebido do evento com espelho no fluxo, investimentos); lista única com filtros; alterar valor;
MUDAR DE LUGAR (casa → negócio → evento); excluir; automáticos só com atalho; números do mês. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_lancamentos.py"""
import http.server, json, os, socketserver, threading, datetime
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8871
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
HOJE = datetime.date.today().isoformat(); MES = HOJE[:7]
SEMENTE = {"neg_eventos": [{"id": "ev1", "nome": "Casamento Teste", "data": HOJE, "valor": 5000, "recebido": 0, "gastos": []}, {"id": "ev2", "nome": "Formatura Teste", "data": HOJE, "valor": 3000, "recebido": 0, "gastos": []}],
           "neg_fluxo": [{"id": "cache_p1", "c0": HOJE, "c1": "Saída", "c2": "300", "c3": "A pagar — cachê de Ana (Casamento Teste)", "fonte": "pendente"}, {"id": "fixo_1_" + MES, "c0": HOJE, "c1": "Saída", "c2": "120", "c3": "Internet (fixo)"}]}
L = lambda k: f"JSON.parse(localStorage.getItem('bw_{k}_v1')||'[]')"
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "termos.html"); pg.evaluate("s => { for (const k in s) localStorage.setItem('bw_' + k + '_v1', JSON.stringify(s[k])); window.__env = []; }", SEMENTE)
        pg.add_init_script("window.__env = []; Object.defineProperty(window, '__gancho', {value: 1});")
        pg.goto(BASE + "lancamentos.html"); pg.wait_for_timeout(1200)
        pg.evaluate("window.BWSync && (window.__orig = BWSync.antesDeSalvar, BWSync.antesDeSalvar = function (k, v, val) { window.__env.push(k + ':' + v); return window.__orig ? window.__orig.apply(BWSync, arguments) : undefined; })")
        ok(pg.locator(".lc-kpi").count() == 5 and pg.locator("#lcLista .lc-item").count() == 2 and pg.locator("#lcLista .lc-tag.cz").count() == 2, "abre com os 5 números e os 2 automáticos (cachê e fixo) na lista")
        ok(pg.locator('#lcLista .lc-item [data-ed]').count() == 0 and pg.locator('#lcLista a[href="custos.html"]').count() == 1, "automático não tem ALTERAR: só o atalho para onde nasceu")
        ok(pg.evaluate(SEM) <= 0, "sem estouro na tela")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        ok(pg.locator('.bw-menu a[href="lancamentos.html"], nav a[href="lancamentos.html"]').count() >= 1, "Lançamentos está no menu da plataforma")
        def lancar(que, dest, valor, desc=None, ev=None, outro=False, extra=None):
            if not pg.is_visible("#lcFolha"): pg.click("#lcNovo")
            pg.click(f'#lcFxCorpo [data-que="{que}"]')
            if dest: pg.click(f'#lcFxCorpo [data-dest="{dest}"]')
            pg.fill("#fxValor", valor)
            if desc is not None: pg.fill("#fxDesc", desc)
            if ev: pg.select_option("#fxEv", ev)
            if extra: extra()
            pg.click("#fxLancarOutro" if outro else "#fxLancar"); pg.wait_for_timeout(250)
        pg.click("#lcNovo"); pg.wait_for_timeout(200)
        ok(pg.locator("#lcFxCorpo [data-que]").count() == 5 and pg.locator("#fxValor").count() == 0, "NOVO LANÇAMENTO começa perguntando O QUE É (5 botões), sem formulário")
        pg.click('#lcFxCorpo [data-que="gasto"]')
        ok(pg.locator("#lcFxCorpo [data-dest]").count() == 3 and pg.locator("#fxValor").count() == 0, "depois pergunta DE ONDE (casa, negócio, evento)")
        pg.click('#lcFxCorpo [data-dest="casa_gasto"]'); pg.click("#fxLancar"); pg.wait_for_timeout(150)
        ok("valor" in pg.inner_text("#lcFxAviso").lower() and pg.evaluate(L("casa_orcamento") + ".length") == 0, "sem valor não lança e avisa")
        ok(pg.evaluate("parseFloat(getComputedStyle(document.getElementById('fxValor')).fontSize)") >= 16, "campo com letra de 16 px")
        lancar("gasto", "casa_gasto", "45,90", "Mercado", outro=True)
        o = pg.evaluate(L("casa_orcamento") + "[0]")
        ok(o["c0"] == "Mercado" and o["c2"] == "Despesa" and o["c3"] == "45.9" and o["c4"] == MES and o["data"] == HOJE, f"GASTEI › DA CASA grava no orçamento da casa no formato dele {o['c2']} {o['c3']} {o['c4']}")
        ok(pg.is_visible("#lcFolha") and "Lançado" in pg.inner_text("#lcFxAviso"), "LANÇAR E FAZER OUTRO deixa a folha aberta para o próximo")
        lancar("entrada", "neg_entrada", "1.200,00", "Edição avulsa", outro=True)
        lancar("gasto", "ev_custo", "80", "Uber da equipe", ev="ev1", outro=True)
        lancar("entrada", "ev_receita", "2500", ev="ev1", outro=True)
        lancar("conta", "casa_conta", "210,55", "Conta de luz", outro=True)
        lancar("reserva", None, "300", outro=True)
        lancar("invest", None, "1000", "CDB Banco X", extra=lambda: pg.select_option("#fxClasse", "Renda fixa"))
        fl = pg.evaluate(L("neg_fluxo")); ev = pg.evaluate(L("neg_eventos") + "[0]")
        man = [x for x in fl if x["id"].startswith("lc_")]
        ok(len(man) == 1 and man[0]["c1"] == "Entrada" and man[0]["c2"] == "1200" and man[0]["c3"] == "Edição avulsa", "RECEBI › DO NEGÓCIO grava a entrada no fluxo de caixa")
        g = ev["gastos"][0]
        ok(len(ev["gastos"]) == 1 and g["valor"] == 80 and g["id"].startswith("ct_") and any(x["id"] == "gasto_" + g["id"] and x["c2"] == "80" and "Casamento Teste" in x["c3"] for x in fl), "GASTEI › DE UM EVENTO grava o custo no evento E espelha no fluxo (igual à sincronia)")
        ok(ev["recebido"] == 2500 and any(x["id"] == "receita_ev1" and x["c2"] == "2500" and x["c1"] == "Entrada" for x in fl), "RECEBI › DE UM EVENTO marca o recebido do evento e espelha a receita no fluxo")
        c = pg.evaluate(L("casa_contas") + "[0]"); r = pg.evaluate(L("casa_reserva") + "[0]"); iv = pg.evaluate(L("inv_lancamentos") + "[0]")
        ok(c["c0"] == "Conta de luz" and c["c1"] == "210.55" and c["c3"] == "Não" and r["c0"] == MES and r["c1"] == "300" and iv["classe"] == "Renda fixa" and iv["op"] == "Aplicação" and iv["valor"] == 1000 and iv["ativo"] == "CDB Banco X", "CONTA A PAGAR, GUARDEI e INVESTI gravam em contas, reserva e investimentos")
        env = pg.evaluate("window.__env")
        ok(all(any(e == k + ":1" for e in env) for k in ("casa_orcamento", "neg_fluxo", "neg_eventos", "casa_contas", "casa_reserva", "inv_lancamentos")), "todo lançamento passa pelo antesDeSalvar (sobe para a conta)")
        # lista e números
        ok(not pg.is_visible("#lcFolha") and pg.locator("#lcLista .lc-item").count() == 9, f"a lista mostra os 9 lançamentos (2 automáticos + 7): {pg.locator('#lcLista .lc-item').count()}")
        k = [t.replace("\xa0", " ") for t in pg.locator(".lc-kpi b").all_inner_texts()]
        ok(k[0] == "R$ 3.700,00" and k[1] == "R$ 245,90" and k[2] == "R$ 3.454,10" and k[3] == "R$ 510,55" and k[4] == "9", f"números do mês: entradas, saídas pagas, resultado, a pagar (conta em aberto + cachê pendente) e quantidade {k}")
        ok("alimenta: Dossiê do evento, Fluxo de caixa, Painel Financeiro" in pg.inner_text('#lcLista .lc-item:has-text("Uber da equipe")'), "cada linha diz o que ela alimenta")
        ok(pg.locator("#lcRosca svg circle").count() >= 3 and pg.locator("#lcBarras .par").count() == 6, "gráficos: saídas por nicho e 6 meses")
        pg.click('#lcNichos [data-n="evento"]'); pg.wait_for_timeout(150)
        ok(pg.locator("#lcLista .lc-item").count() == 3, "filtro por nicho EVENTOS mostra o custo, o recebido e o cachê")
        pg.click('#lcNichos [data-n=""]'); pg.fill("#lcBusca", "luz"); pg.wait_for_timeout(150)
        ok(pg.locator("#lcLista .lc-item").count() == 1, "busca acha pelo nome")
        # marcar conta paga
        pg.click("#lcLista [data-pg]"); pg.wait_for_timeout(500)
        ok(pg.evaluate(L("casa_contas") + "[0].c3") == "Sim" and "NÃO PAGA" in pg.inner_text("#lcLista [data-pg]"), "✓ MARCAR PAGA muda a conta para paga")
        pg.fill("#lcBusca", ""); pg.wait_for_timeout(150)
        # alterar valor
        pg.click('#lcLista .lc-item:has-text("Mercado") [data-ed]'); pg.wait_for_timeout(200)
        ok(pg.input_value("#fxValor") == "45,9" and pg.input_value("#fxDesc") == "Mercado" and pg.locator("#fxDest option").count() == 4, "✎ ALTERAR abre com os dados e as 4 opções de lugar para uma saída")
        pg.fill("#fxValor", "52,00"); pg.click("#fxSalvar"); pg.wait_for_timeout(250)
        ok(pg.evaluate(L("casa_orcamento") + "[0].c3") == "52" and pg.evaluate(L("casa_orcamento") + ".length") == 1, "alterar o valor muda o mesmo lançamento (não duplica)")
        # mudar de lugar: casa → negócio → evento
        pg.click('#lcLista .lc-item:has-text("Mercado") [data-ed]'); pg.select_option("#fxDest", "neg_saida"); pg.wait_for_timeout(150)
        ok(pg.input_value("#fxValor") == "52" and "Fluxo de caixa" in pg.inner_text("#fxResumo"), "trocar PARA ONDE FOI mantém o valor e mostra o que passa a alimentar")
        pg.click("#fxSalvar"); pg.wait_for_timeout(250)
        fl = pg.evaluate(L("neg_fluxo")); mv = [x for x in fl if x.get("c3") == "Mercado"]
        ok(pg.evaluate(L("casa_orcamento") + ".length") == 0 and len(mv) == 1 and mv[0]["c1"] == "Saída" and mv[0]["c2"] == "52" and "Mudou de lugar" in pg.inner_text("#lcAviso"), "casa → negócio: saiu do orçamento da casa e entrou no fluxo")
        pg.click('#lcLista .lc-item:has-text("Mercado") [data-ed]'); pg.select_option("#fxDest", "ev_custo"); pg.click("#fxSalvar"); pg.wait_for_timeout(150)
        ok("evento" in pg.inner_text("#lcFxAviso").lower(), "mudar para evento sem escolher o evento: avisa e não mexe em nada")
        pg.select_option("#fxEv", "ev2"); pg.click("#fxSalvar"); pg.wait_for_timeout(250)
        e2 = pg.evaluate(L("neg_eventos") + "[1]"); fl = pg.evaluate(L("neg_fluxo"))
        ok(len(e2["gastos"]) == 1 and e2["gastos"][0]["valor"] == 52 and not [x for x in fl if x["id"].startswith("lc_") and x.get("c3") == "Mercado"] and any("Formatura Teste" in x["c3"] and x["id"].startswith("gasto_") for x in fl), "negócio → evento: vira custo do evento escolhido, com espelho no fluxo")
        # excluir
        n0 = pg.locator("#lcLista .lc-item").count(); dlg.clear()
        pg.click('#lcLista .lc-item:has-text("Uber da equipe") [data-del]'); pg.wait_for_timeout(250)
        fl = pg.evaluate(L("neg_fluxo"))
        ok(len(dlg) == 1 and "Excluir" in dlg[0] and pg.locator("#lcLista .lc-item").count() == n0 - 1 and pg.evaluate(L("neg_eventos") + "[0].gastos.length") == 0 and not any(x["id"].startswith("gasto_ct_") and "Casamento" in x["c3"] for x in fl), "✕ pede confirmação, apaga o custo do evento e tira o espelho do fluxo")
        dlg.clear(); pg.click('#lcLista .lc-item:has-text("Recebido do evento") [data-del]'); pg.wait_for_timeout(250)
        ok("NÃO RECEBIDO" in dlg[0] and pg.evaluate(L("neg_eventos") + "[0].recebido") == 0 and not any(x["id"] == "receita_ev1" for x in pg.evaluate(L("neg_fluxo"))), "excluir o recebido volta o evento para não recebido e tira a receita do fluxo")
        ok(any(x["id"] == "cache_p1" for x in pg.evaluate(L("neg_fluxo"))) and any(x["id"].startswith("fixo_") for x in pg.evaluate(L("neg_fluxo"))), "as linhas automáticas (cachê e fixo) não foram tocadas")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"sem estouro e sem erro de JS {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
