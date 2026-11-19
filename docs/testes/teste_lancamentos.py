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
           "neg_equipe_colaboradores": [{"id": "c1", "nome": "Ana Souza"}, {"id": "c2", "nome": "Beto Lima"}], "neg_equipe_equipes": [{"id": "eq1", "nome": "Equipe A", "membros": ["c1", "c2"]}],
           "neg_equipe_pagamentos": [{"id": "p1", "equipeId": "eq1", "colabId": "c1", "colab": "Ana", "eventoId": "ev1", "evento": "Casamento Teste", "valor": 300, "data": HOJE, "pago": False}],
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
        ok(pg.locator(".lc-kpi").count() == 5 and pg.locator("#lcLista .lc-item").count() == 2 and pg.locator("#lcLista .lc-tag.cz").count() == 1, "abre com os 5 números, o cachê da equipe e o fixo (automático) na lista")
        ok(pg.locator('#lcLista .lc-item:has(.lc-tag.cz) [data-ed]').count() == 0 and pg.locator('#lcLista .lc-item:has-text("Cachê — Ana") [data-cg]').inner_text() == "NÃO PAGO" and pg.locator('#lcLista .lc-item:has-text("Cachê — Ana") [data-ed]').count() == 1, "o fixo é automático (sem ALTERAR); o cachê tem NÃO PAGO e ALTERAR")
        # CACHÊ DA EQUIPE (veio de Cachês e custos, que saiu)
        cz = '#lcLista .lc-item:has-text("Cachê — Ana")'
        pg.click(cz + " [data-cg]"); pg.wait_for_timeout(500)
        pp = pg.evaluate(L("neg_equipe_pagamentos"))[0]; ev = pg.evaluate(L("neg_eventos") + "[0]"); fx = [x for x in pg.evaluate(L("neg_fluxo")) if x["id"] == "cache_p1"][0]
        ok(pp["pago"] is True and any(g["id"] == "pag_p1" and g["valor"] == 300 for g in ev["gastos"]) and fx["fonte"] == "pago" and fx["c3"].startswith("Custos variáveis — cachê de Ana"), "tocar em NÃO PAGO marca PAGO: vira custo do evento e o fluxo deixa de ser pendente")
        ok(pg.locator(cz + " [data-cg]").inner_text() == "PAGO ✓" and "PAGO" in pg.inner_text(cz) and "22, 163, 74" in pg.evaluate("getComputedStyle(document.querySelector('#lcLista [data-cg]')).backgroundColor"), "o botão fica verde PAGO ✓")
        ok(pg.locator('#lcLista .lc-item:has-text("Cachê — Ana")').count() == 1 and pg.locator('#lcLista .lc-item:has-text("Custos variáveis")').count() == 0, "o cachê pago aparece uma vez só (não duplica com o custo do evento)")
        pg.click(cz + " [data-cg]"); pg.wait_for_timeout(500)
        ev = pg.evaluate(L("neg_eventos") + "[0]"); fx = [x for x in pg.evaluate(L("neg_fluxo")) if x["id"] == "cache_p1"][0]
        ok(pg.evaluate(L("neg_equipe_pagamentos"))[0]["pago"] is False and not ev["gastos"] and fx["fonte"] == "pendente", "tocar de novo volta para NÃO PAGO e tira o custo do evento")
        pg.click("#lcNovo"); pg.click('[data-que="cache"]'); pg.wait_for_timeout(200)
        ok(pg.locator("#fxEv").count() == 1 and pg.locator("#fxColabs option").count() == 2 and pg.locator("#fxPago").count() == 1, "NOVO › CACHÊ DA EQUIPE pede quem recebe (lista da equipe), o evento e a situação")
        pg.fill("#fxValor", "450"); pg.click("#fxLancar"); pg.wait_for_timeout(200)
        ok("evento" in pg.inner_text("#lcFxAviso").lower(), "sem evento não lança")
        pg.select_option("#fxEv", "ev2"); pg.click("#fxLancar"); pg.wait_for_timeout(200)
        ok("quem recebe" in pg.inner_text("#lcFxAviso").lower(), "sem o nome não lança")
        pg.fill("#fxDesc", "Beto Lima"); pg.click("#fxLancar"); pg.wait_for_timeout(500)
        pn = [x for x in pg.evaluate(L("neg_equipe_pagamentos")) if x["colab"] == "Beto Lima"]
        ok(len(pn) == 1 and pn[0]["valor"] == 450 and pn[0]["eventoId"] == "ev2" and pn[0]["evento"] == "Formatura Teste" and pn[0]["colabId"] == "c2" and pn[0]["equipeId"] == "eq1" and pn[0]["pago"] is False, f"grava no formato de neg_equipe_pagamentos, ligado ao evento e ao colaborador ({pn[:1]})")
        ok(any(x["id"] == "cache_%s" % pn[0]["id"] and x["fonte"] == "pendente" and "Beto Lima (Formatura Teste)" in x["c3"] for x in pg.evaluate(L("neg_fluxo"))), "o cachê a pagar entra no fluxo como pendente (agenda e sino enxergam)")
        cb = '#lcLista .lc-item:has-text("Cachê — Beto Lima")'
        ok("Formatura Teste" in pg.inner_text(cb) and "NÃO PAGO" in pg.inner_text(cb), "a linha mostra o evento e NÃO PAGO")
        pg.click(cb + " [data-ed]"); pg.wait_for_timeout(200); pg.fill("#fxValor", "500"); pg.select_option("#fxPago", "sim"); pg.select_option("#fxEv", "ev1"); pg.click("#fxSalvar"); pg.wait_for_timeout(500)
        pn = [x for x in pg.evaluate(L("neg_equipe_pagamentos")) if x["colab"] == "Beto Lima"]; e1 = pg.evaluate(L("neg_eventos") + "[0]"); e2 = pg.evaluate(L("neg_eventos") + "[1]")
        ok(len(pn) == 1 and pn[0]["valor"] == 500 and pn[0]["pago"] is True and pn[0]["eventoId"] == "ev1" and any(g["id"] == "pag_%s" % pn[0]["id"] and g["valor"] == 500 for g in e1["gastos"]) and not e2["gastos"], "ALTERAR muda valor, evento e situação sem duplicar (custo vai para o evento certo)")
        dlg.clear(); pg.click('#lcLista .lc-item:has-text("Cachê — Beto Lima") [data-del]'); pg.wait_for_timeout(500)
        ok(len(dlg) == 1 and not [x for x in pg.evaluate(L("neg_equipe_pagamentos")) if x["colab"] == "Beto Lima"] and not pg.evaluate(L("neg_eventos") + "[0].gastos") and not any("Beto" in x.get("c3", "") for x in pg.evaluate(L("neg_fluxo"))), "excluir o cachê pede confirmação e tira do evento e do fluxo")
        pg.goto(BASE + "custos.html"); pg.wait_for_timeout(1500); ok(pg.url.endswith("lancamentos.html"), "custos.html (endereço antigo) leva para os LANÇAMENTOS")
        pg.goto(BASE + "lancamentos.html"); pg.wait_for_timeout(1200)
        pg.evaluate("window.BWSync && (window.__orig = BWSync.antesDeSalvar, BWSync.antesDeSalvar = function (k, v, val) { window.__env.push(k + ':' + v); return window.__orig ? window.__orig.apply(BWSync, arguments) : undefined; })")
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
        ok(pg.locator("#lcFxCorpo [data-que]").count() == 6 and pg.locator("#fxValor").count() == 0, "NOVO LANÇAMENTO começa perguntando O QUE É (6 botões), sem formulário")
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
        ok("alimenta: Dossiê do evento, Painel Financeiro" in pg.inner_text('#lcLista .lc-item:has-text("Uber da equipe")'), "cada linha diz o que ela alimenta")
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
        ok(pg.input_value("#fxValor") == "52" and "Painel Financeiro" in pg.inner_text("#fxResumo"), "trocar PARA ONDE FOI mantém o valor e mostra o que passa a alimentar")
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
        dlg.clear(); pg.click('#lcLista .lc-item:has-text("Pagamento do evento") [data-del]'); pg.wait_for_timeout(250)
        ok("NÃO RECEBIDO" in dlg[0] and pg.evaluate(L("neg_eventos") + "[0].recebido") == 0 and not any(x["id"] == "receita_ev1" for x in pg.evaluate(L("neg_fluxo"))), "excluir o recebido volta o evento para não recebido e tira a receita do fluxo")
        ok(any(x["id"] == "cache_p1" for x in pg.evaluate(L("neg_fluxo"))) and any(x["id"].startswith("fixo_") for x in pg.evaluate(L("neg_fluxo"))), "as linhas automáticas (cachê e fixo) não foram tocadas")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"sem estouro e sem erro de JS {erros}")
        # PAINEL DA GESTÃO DE CASA (casa.html = mesma tela em modo casa)
        pg.evaluate("__lanc.criar('casa_gasto', {valor: '90', desc: 'Farmácia', cat: 'Saúde'}); __lanc.criar('casa_receita', {valor: '3000', desc: 'Salário', cat: 'Salário'}); __lanc.criar('casa_conta', {valor: '180', desc: 'Luz'}); __lanc.criar('reserva', {valor: '200'}); __lanc.criar('neg_saida', {valor: '77', desc: 'Cabo HDMI'})")
        pg.goto(BASE + "casa.html"); pg.wait_for_timeout(1500)
        txt = pg.inner_text("#lcLista")
        ok("GESTÃO DE CASA" in pg.inner_text(".lc-topo h1") and pg.locator(".lc-kpi").count() == 5 and "GUARDADO" in pg.inner_text("#lcKpis") and pg.locator(".lc-kpi").first.is_visible() and pg.locator("#lcLista").is_visible(), "casa.html abre como painel (5 números, com GUARDADO na reserva)")
        ok("Farmácia" in txt and "Salário" in txt and "Luz" in txt and "Cabo HDMI" not in txt and "Cachê" not in txt and "fixo" not in txt.lower(), "a lista da casa só tem casa, contas e reserva (nada do negócio nem de evento)")
        ok(pg.locator("#lcNichos [data-n]").count() == 4 and pg.locator("#lcFixos").count() == 0, "filtros só da casa (TODOS, CASA, CONTAS, RESERVA) e sem os fixos do negócio")
        ok("SAÚDE" in pg.inner_text("#lcRosca").upper(), "a rosca mostra os gastos por categoria")
        ok(pg.locator('#lcFerr a[href="orcamento.html"]').count() == 1 and pg.locator('#lcFerr a[href="contas.html"]').count() == 1 and pg.locator('#lcFerr a[href="reserva.html"]').count() == 1, "atalhos para Orçamento, Contas a pagar e Reserva")
        pg.click("#lcNovo"); pg.wait_for_timeout(200)
        ok(pg.locator("#lcFxCorpo [data-que]").count() == 4, "NOVO na casa pergunta só GASTEI, RECEBI, CONTA A PAGAR e GUARDEI")
        pg.click('[data-que="gasto"]'); pg.wait_for_timeout(200)
        ok(pg.locator("#lcFxCorpo [data-dest]").count() == 0 and pg.locator("#fxValor").count() == 1 and pg.locator("#fxCat").count() == 1, "GASTEI já vai direto para a casa (não pergunta de onde)")
        pg.fill("#fxValor", "45"); pg.fill("#fxDesc", "Padaria"); pg.click("#fxLancar"); pg.wait_for_timeout(400)
        ok(any(x["c0"] == "Padaria" and x["c3"] == "45" and x["c2"] == "Despesa" for x in pg.evaluate(L("casa_orcamento"))) and "Padaria" in pg.inner_text("#lcLista"), "lança no orçamento da casa e aparece na lista")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"casa: sem estouro e sem erro de JS {erros}")
        pg.goto(BASE + "lancamentos.html"); pg.wait_for_timeout(1200)
        ok("Cabo HDMI" in pg.inner_text("#lcLista") and pg.locator(".lc-kpi").count() == 5 and "GUARDADO" not in pg.inner_text("#lcKpis"), "a página LANÇAMENTOS continua com tudo")
        # FERRAMENTAS (leitor, Tio Cláudio, planilha) na própria página
        pg.goto(BASE + "lancamentos.html"); pg.wait_for_timeout(1500)
        ok(pg.locator('#lcFerr a[href="leitor.html"]').count() == 1 and pg.locator('#lcFerr a[href="financeiro-painel.html"]').count() == 1 and pg.locator("#lcFalar").count() == 1, "FERRAMENTAS: leitor de contas, Tio Cláudio e planilha estão nos LANÇAMENTOS")
        pg.click("#lcFalar"); pg.wait_for_timeout(700)
        ok(pg.evaluate("!!window.BWAgente && [...document.querySelectorAll('[class*=ag], [id*=ag]')].some(e => e.offsetParent && /Tio Cl/i.test(e.textContent))"), "FALAR COM O TIO CLÁUDIO abre o agente")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
        # FIXOS DO NEGÓCIO (vieram da página Fluxo de caixa, que saiu)
        pg.goto(BASE + "lancamentos.html"); pg.wait_for_timeout(1200)
        ok(pg.locator("#lcFixos").count() == 1 and pg.locator("#lcFixosLista .lc-item").count() == 0, "a seção FIXOS DO NEGÓCIO existe nos LANÇAMENTOS")
        pg.fill("#fzNome", "Internet do estúdio"); pg.fill("#fzValor", "129,90"); pg.fill("#fzDia", "28"); pg.click("#fzAdd"); pg.wait_for_timeout(500)
        fx = pg.evaluate(L("neg_fixos")); fl = [x for x in pg.evaluate(L("neg_fluxo")) if str(x["id"]).startswith("fixo_%s_" % fx[-1]["id"])]
        ok(fx[-1]["c0"] == "Internet do estúdio" and fx[-1]["c1"] == "129.9" and fx[-1]["c5"] == "Saída" and len(fl) == 6 and all(x["c1"] == "Saída" and x["c3"] == "Internet do estúdio (fixo)" for x in fl), f"CRIAR FIXO grava em neg_fixos e gera 6 lançamentos futuros ({len(fl)})")
        ok("salvo" in pg.inner_text("#lcFixoAviso") and pg.locator('#lcFixosLista .lc-item:has-text("Internet do estúdio")').count() == 1, "o fixo aparece na lista e o aviso vem depois do re-render")
        pg.evaluate("__lanc.expandirFixos()"); ok(len([x for x in pg.evaluate(L("neg_fluxo")) if str(x["id"]).startswith("fixo_%s_" % fx[-1]["id"])]) == 6, "abrir de novo não duplica os lançamentos do fixo")
        dlg.clear(); pg.click('#lcFixosLista .lc-item:has-text("Internet do estúdio") [data-delfixo]'); pg.wait_for_timeout(400)
        ok(len(dlg) == 1 and not [x for x in pg.evaluate(L("neg_fixos")) if x["c0"] == "Internet do estúdio"] and not [x for x in pg.evaluate(L("neg_fluxo")) if "Internet do estúdio" in x.get("c3", "")], "excluir o fixo pede confirmação e tira os lançamentos futuros dele")
        r = pg.evaluate("__lanc.pdfMes().then(async r => ({n: r.linhas, tam: r.blob.size, ini: new TextDecoder().decode((await r.blob.arrayBuffer()).slice(0, 5))})).catch(e => ({erro: String(e)}))")
        if r.get("erro"): print("  (PDF DO MÊS não conferido: sem a biblioteca aqui —", r["erro"], ")")
        else: ok(r["ini"] == "%PDF-" and r["tam"] > 3000 and r["n"] > 0, f"PDF DO MÊS gera um PDF de verdade com os lançamentos do mês ({r})")
        ok(pg.locator("#lcPdf").count() == 1, "botão PDF DO MÊS existe")
        pg.goto(BASE + "fluxo.html"); pg.wait_for_timeout(1500)
        ok(pg.url.endswith("lancamentos.html"), "fluxo.html (endereço antigo) leva para os LANÇAMENTOS")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"sem estouro e sem erro de JS {erros}")
        # atalho do PAINEL FINANCEIRO: pagamentos de eventos (a lista saiu de lá)
        pg.evaluate("__lanc.criar('ev_receita', {valor: '1800', evId: 'ev2'})"); pg.goto(BASE + "lancamentos.html?nicho=evento&tipo=e&periodo=tudo"); pg.wait_for_timeout(1200)
        ok(pg.locator("#lcLista .lc-item").count() == 1 and "Pagamento do evento Formatura Teste" in pg.inner_text("#lcLista .lc-item") and pg.locator('#lcNichos .on[data-n="evento"]').count() == 1, "o atalho abre os LANÇAMENTOS já filtrados nos pagamentos de eventos")
        pg.goto(BASE + "financeiro-painel.html"); pg.wait_for_timeout(1500)
        ok(pg.locator("#tEventos").count() == 0 and pg.locator("#busca").count() == 0 and pg.locator('#verLancamentos[href*="lancamentos.html"]').count() == 1 and pg.locator("#eQtd").count() == 1, "PAINEL FINANCEIRO: a lista de pagamentos saiu; ficam os 3 números e o botão para os LANÇAMENTOS")
        ok(not erros, f"painel sem erro de JS {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
