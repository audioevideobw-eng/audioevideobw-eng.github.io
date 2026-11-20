#!/usr/bin/env python3
"""Teste dos dois ECOSSISTEMAS (20/11/2026, decisão do dono): MINHA EMPRESA (PJ) e MINHA CASA (PF) NÃO se misturam.
Confere, em 1280 e 390 px: Início com o robô e as 4 telas (tocar traz para a frente; tocar de novo entra); página de cada ambiente (números, botões LANÇAMENTOS e PAINEL, agenda própria,
cor própria); LANÇAMENTOS com abas PJ | PF (lista, novo, alterar e números só do ambiente; nada cruza); PAINEL PJ | PF; download do .exe.
A prova de independência: lançar num ambiente NÃO muda nenhuma chave do outro (comparação do texto guardado, antes e depois).
Uso (na raiz): python3 docs/testes/teste_ambientes.py"""
import http.server, json, os, socketserver, threading, datetime
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8893
Q = "from(){const q={select(){return q},eq(){return q},order(){return q},range(){return q},maybeSingle(){return Promise.resolve({data:null,error:null})},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),channel(){const c={on(){return c},subscribe(){return c}};return c}"
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}}," + Q + "}}};"
LOGADO = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:{user:{id:'u1',email:'teste@exemplo.com'}}}}),getUser:async()=>({data:{user:{id:'u1'}}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}}," + Q + "}}};"
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; MODO = {"logado": False}
def rota(r):
    u = r.request.url
    if "supabase-js" in u: return r.fulfill(body=LOGADO if MODO["logado"] else STUB, content_type="application/javascript")
    if MODO["logado"] and u.endswith("assets/bw-sync.js"): return r.fulfill(body="/* fora do teste do painel */", content_type="application/javascript")
    if "chart.js" in u or "chart.umd" in u: return r.fulfill(body="window.Chart=function(){this.destroy=function(){}};", content_type="application/javascript")
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
HOJE = datetime.date.today().isoformat(); MES = HOJE[:7]
SEMENTE = {
    "neg_fluxo": [{"id": "n1", "c0": HOJE, "c1": "Entrada", "c2": "1000", "c3": "Venda de serviço EMPRESA"}],
    "neg_eventos": [{"id": "ev1", "nome": "Evento Corporativo Teste", "data": HOJE, "valor": 5000, "recebido": 0, "gastos": []}],
    "casa_orcamento": [{"id": "o1", "c0": "Salário CASA", "c1": "Salário", "c2": "Receita", "c3": "3000", "c4": MES, "data": HOJE},
                       {"id": "o2", "c0": "Mercado CASA", "c1": "Alimentação", "c2": "Despesa", "c3": "200", "c4": MES, "data": HOJE}],
    "casa_contas": [{"id": "c1", "c0": "Luz CASA", "c1": "150", "c2": HOJE, "c3": "Sim"}, {"id": "c2", "c0": "Internet CASA", "c1": "100", "c2": HOJE, "c3": "Não"}],
    "casa_reserva": [{"id": "r1", "c0": MES, "c1": "400"}],
    "agenda_tarefas": [{"id": "t1", "titulo": "Reunião com cliente EMPRESA", "data": HOJE, "cat": "trabalho", "feitos": []},
                       {"id": "t2", "titulo": "Dentista CASA", "data": HOJE, "cat": "saude", "feitos": []},
                       {"id": "t3", "titulo": "Feira CASA", "data": HOJE, "cat": "tarefa", "amb": "pf", "feitos": []}]}
PJ = ["neg_fluxo", "neg_eventos", "neg_equipe_pagamentos", "neg_fixos"]; PF = ["casa_orcamento", "casa_contas", "casa_reserva", "inv_lancamentos"]
L = lambda k: f"JSON.parse(localStorage.getItem('bw_{k}_v1')||'[]')"
FOTO = "ks => ks.map(k => localStorage.getItem('bw_' + k + '_v1') || '').join('§')"
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
COR = "getComputedStyle(document.documentElement).getPropertyValue('--amb').trim().toUpperCase()"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        MODO["logado"] = False
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "termos.html"); pg.evaluate("s => { localStorage.clear(); for (const k in s) localStorage.setItem('bw_' + k + '_v1', JSON.stringify(s[k])); }", SEMENTE)

        # ---------- INÍCIO: robô no centro e as 4 telas ----------
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(1200)
        hr = pg.eval_on_selector_all(".hub-tela", "ts => ts.map(t => t.getAttribute('href') + '|' + t.querySelector('b').textContent)")
        ok(sorted(hr) == sorted(["negocio.html|MEU NEGÓCIO", "casa.html|GESTÃO DE CASA", "marketing.html|MARKETING", "ferramentas.html|FERRAMENTAS"]), f"Início: o robô e as 4 telas do desenho {hr}")
        ok(pg.evaluate("(() => { const r = document.querySelector('#hubRobo img'); return r.complete && r.naturalWidth > 100; })()") and pg.locator("#hubEntrar").is_hidden(), "o robô novo aparece no centro; parado, nenhuma tela está escolhida")
        ok(pg.locator("#bwAgenda").count() == 0 and pg.locator("[data-dobra]").count() == 0, "a agenda e as seções saíram do Início (estão dentro de cada ambiente)")
        ok(pg.evaluate("typeof window.BWAgendaItens") == "function", "Início mantém o cálculo da agenda para o Tio Cláudio")
        pos = lambda sel: pg.evaluate("s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; }", sel)
        neg = '.hub-tela[href="negocio.html"]'; a0 = pos(neg)
        pg.click(neg, force=True, position={"x": 22, "y": 12}); pg.wait_for_timeout(1500); a1 = pos(neg); rb = pos("#hubRobo")   # parada, a tela de trás fica meio coberta pela da frente: toca no canto que aparece
        ok(pg.url.endswith("index.html") and pg.evaluate("BWPortal.foco()") == 0 and abs(a1[0] - rb[0]) < 12 and a1[2] > a0[2] * 1.2 and "na-frente" in pg.get_attribute(neg, "class"), "tocar numa tela traz a tela para a frente do robô e ela cresce (ainda não entra)")
        ok(pg.locator("#hubEntrar").is_visible() and "MEU NEGÓCIO" in pg.inner_text("#hubEntrar") and pg.get_attribute("#hubEntrar", "href") == "negocio.html" and "MEU NEGÓCIO" in pg.inner_text("#hubNome"), "aparece o nome da tela e o botão ENTRAR")
        pg.click("#hubProx"); pg.wait_for_timeout(1300); f1 = pg.evaluate("BWPortal.foco()"); pg.keyboard.press("ArrowLeft"); pg.wait_for_timeout(1300)
        ok(f1 != 0 and pg.evaluate("BWPortal.foco()") == 0, "as setas (botão e teclado) passam as telas para o lado")
        ok(pg.evaluate("!!document.querySelector('#bwAgente img.bwg-robo') && document.querySelector('#bwAgente img.bwg-robo').naturalWidth > 0"), "o botão do Tio Cláudio usa o robô novo")
        ok(pg.evaluate(SEM) <= 0, "Início sem estouro")
        pg.click(neg, force=True); pg.wait_for_timeout(1700)

        # ---------- MINHA EMPRESA ----------
        ok(pg.url.endswith("negocio.html") and pg.evaluate("document.documentElement.dataset.amb") == "pj" and pg.evaluate(COR) == "#4C8DFF", "tocar de novo na tela da frente entra em MINHA EMPRESA (ambiente pj, azul)")
        ok(pg.locator("#ambKpis .amb-kpi").count() == 5 and "1.000,00" in pg.inner_text("#ambKpis .amb-kpi >> nth=0") and "3.000" not in pg.inner_text("#ambKpis"), "números da empresa: entradas R$ 1.000,00 (o salário da casa não entra)")
        ok(pg.locator('.amb-principal[href="lancamentos.html?a=pj"]').inner_text().strip() == "LANÇAMENTOS PJ" and pg.locator('.amb-principal[href="financeiro-painel.html?a=pj"]').inner_text().strip() == "PAINEL FINANCEIRO", "botões LANÇAMENTOS PJ e PAINEL FINANCEIRO")
        ag = pg.inner_text("#bwAgenda")
        ok("AGENDA DA EMPRESA" in ag and "Reunião com cliente EMPRESA" in ag and "Evento Corporativo Teste" in ag, "agenda da empresa: tarefa de trabalho e evento")
        ok("CASA" not in ag.replace("AGENDA DA EMPRESA", ""), "agenda da empresa NÃO mostra nada da casa (dentista, feira, luz, internet)")
        ok(pg.locator('.amb-sec a[href="eventos.html"]').count() == 1 and pg.locator('.amb-sec a[href="captacao.html"]').count() == 1 and pg.locator('.amb-sec a[href="reels.html"]').count() == 1 and pg.locator('.amb-sec a[href="orcamento.html"]').count() == 0, "ferramentas da empresa: eventos, CRM, marketing (sem as da casa)")
        antes = pg.evaluate(FOTO, PF)
        pg.fill("#agMagica", "pagar boleto fornecedor 300 hoje"); pg.click("#agMagicaBtn"); pg.wait_for_timeout(400)
        pg.fill("#agMagica", "ligar fornecedor amanhã"); pg.click("#agMagicaBtn"); pg.wait_for_timeout(400)
        fx = pg.evaluate(L("neg_fluxo")); tf = pg.evaluate(L("agenda_tarefas"))
        ok(any(x["c1"] == "Saída" and x["c2"] == "300" for x in fx) and pg.evaluate(FOTO, PF) == antes, "conta escrita na agenda da EMPRESA vira saída da empresa; nenhuma chave da casa mudou")
        ok(any(t.get("amb") == "pj" and "fornecedor" in t["titulo"].lower() for t in tf), "tarefa criada na empresa fica marcada como da empresa")
        ok(pg.evaluate(SEM) <= 0, "MINHA EMPRESA sem estouro")
        pg.click(".amb-troca"); pg.wait_for_timeout(1500)

        # ---------- MINHA CASA ----------
        ok(pg.url.endswith("casa.html") and pg.evaluate("document.documentElement.dataset.amb") == "pf" and pg.evaluate(COR) == "#2FD08A", "o botão IR PARA MINHA CASA troca de ambiente (pf, verde)")
        kp = pg.inner_text("#ambKpis")
        ok("3.000,00" in pg.inner_text("#ambKpis .amb-kpi >> nth=0") and "350,00" in pg.inner_text("#ambKpis .amb-kpi >> nth=1") and "400,00" in kp and "1.000,00" not in kp, "números da casa: entradas 3.000, saídas 350 (mercado + luz paga), reserva 400 — nada da empresa")
        ok(pg.locator('.amb-principal[href="lancamentos.html?a=pf"]').inner_text().strip() == "LANÇAMENTOS PF" and pg.locator('.amb-principal[href="financeiro-painel.html?a=pf"]').inner_text().strip() == "PAINEL FINANCEIRO", "botões LANÇAMENTOS PF e PAINEL FINANCEIRO")
        ag = pg.inner_text("#bwAgenda")
        ok("AGENDA DA CASA" in ag and "Dentista CASA" in ag and "Feira CASA" in ag and "Internet CASA" in ag, "agenda da casa: tarefas pessoais e contas da casa")
        ok("EMPRESA" not in ag and "Evento Corporativo" not in ag and "fornecedor" not in ag.lower(), "agenda da casa NÃO mostra nada da empresa (reunião, evento, tarefa criada lá)")
        ok(pg.locator('.amb-sec a[href="orcamento.html"]').count() == 1 and pg.locator('.amb-sec a[href="investimentos-painel.html"]').count() == 1 and pg.locator('.amb-sec a[href="eventos.html"]').count() == 0, "ferramentas da casa: orçamento, contas, reserva, investimentos (sem as da empresa)")
        antes = pg.evaluate(FOTO, PJ)
        pg.fill("#agMagica", "pagar gás 180 hoje"); pg.click("#agMagicaBtn"); pg.wait_for_timeout(400)
        pg.fill("#agMagica", "recebi R$ 500 hoje"); pg.click("#agMagicaBtn"); pg.wait_for_timeout(400)
        ct = pg.evaluate(L("casa_contas")); oc = pg.evaluate(L("casa_orcamento"))
        ok(any(x["c1"] == "180" for x in ct) and any(x["c2"] == "Receita" and x["c3"] == "500" for x in oc) and pg.evaluate(FOTO, PJ) == antes, "conta e recebimento escritos na agenda da CASA ficam na casa; nenhuma chave da empresa mudou")
        ok(pg.evaluate(SEM) <= 0, "MINHA CASA sem estouro")

        # ---------- LANÇAMENTOS: abas PJ | PF ----------
        pg.click('.amb-principal[href="lancamentos.html?a=pf"]'); pg.wait_for_timeout(1500)
        ok("a=pf" in pg.url and pg.locator('#lcAbas .on[data-amb="pf"]').count() == 1 and pg.evaluate(COR) == "#2FD08A" and "LANÇAMENTOS PF" in pg.inner_text("#lcTitulo"), "LANÇAMENTOS PF abre na aba da casa, em verde")
        ok(pg.locator("#lcAbas .amb-aba").count() == 2 and "LANÇAMENTOS PJ" in pg.inner_text("#lcAbas") and "LANÇAMENTOS PF" in pg.inner_text("#lcAbas"), "duas abas: LANÇAMENTOS PJ e LANÇAMENTOS PF")
        li = pg.inner_text("#lcLista")
        ok("Salário CASA" in li and "Mercado CASA" in li and "Luz CASA" in li and "Guardado na reserva" in li, "aba PF lista os lançamentos da casa")
        ok("EMPRESA" not in li and "fornecedor" not in li.lower() and pg.locator('#lcNichos [data-n="negocio"], #lcNichos [data-n="evento"]').count() == 0, "aba PF NÃO lista nada da empresa nem tem filtro de negócio/evento")
        ok("3.500,00" in pg.inner_text("#lcKpis .lc-kpi >> nth=0") and pg.locator("#lcFixos").is_hidden(), "números da aba PF = só a casa (entradas 3.500); FIXOS DO NEGÓCIO não aparece")
        pg.click("#lcNovo"); pg.wait_for_timeout(200)
        ok(pg.locator('[data-que="cache"]').count() == 0 and pg.locator('[data-que="reserva"]').count() == 1 and "MINHA CASA (PF)" in pg.inner_text("#lcFxTit"), "NOVO na casa: sem cachê de equipe; com reserva")
        antes = pg.evaluate(FOTO, PJ)
        pg.click('[data-que="gasto"]'); pg.wait_for_timeout(200)
        ok(pg.locator("[data-dest]").count() == 0 and pg.locator("#fxValor").count() == 1 and "Casa › Gasto" in pg.inner_text("#fxResumo"), "GASTEI na casa vai direto para a casa (não oferece negócio nem evento)")
        pg.fill("#fxValor", "80"); pg.fill("#fxDesc", "Padaria CASA"); pg.click("#fxLancar"); pg.wait_for_timeout(400)
        ok(any(x["c0"] == "Padaria CASA" and x["c3"] == "80" for x in pg.evaluate(L("casa_orcamento"))) and pg.evaluate(FOTO, PJ) == antes, "lançar na aba PF grava só na casa; as chaves da empresa ficam idênticas")
        pg.click('#lcLista .lc-item:has-text("Padaria CASA") [data-ed]'); pg.wait_for_timeout(200)
        ops = pg.eval_on_selector_all("#fxDest option", "os => os.map(o => o.value)")
        ok(ops and all(o.startswith("casa_") for o in ops), f"ALTERAR na casa só deixa mudar de lugar dentro da casa {ops}")
        pg.click("#lcFxFechar")
        ok(pg.evaluate("(() => { try { __lanc.criar('neg_saida', {valor: '10', desc: 'x'}); return 'gravou'; } catch (e) { return 'recusou'; } })()") == "recusou" and pg.evaluate(FOTO, PJ) == antes, "trava: a aba PF RECUSA criar lançamento da empresa")
        # troca de aba
        pg.click('#lcAbas [data-amb="pj"]'); pg.wait_for_timeout(500)
        li = pg.inner_text("#lcLista")
        ok("a=pj" in pg.url and pg.evaluate(COR) == "#4C8DFF" and pg.locator('#lcAbas .on[data-amb="pj"]').count() == 1 and "LANÇAMENTOS PJ" in pg.inner_text("#lcTitulo"), "tocar em LANÇAMENTOS PJ troca a aba e a cor (azul)")
        ok("Venda de serviço EMPRESA" in li and "CASA" not in li and pg.locator('#lcNichos [data-n="casa"], #lcNichos [data-n="conta"], #lcNichos [data-n="reserva"], #lcNichos [data-n="invest"]').count() == 0, "aba PJ lista só a empresa (nada da casa)")
        ok("1.000,00" in pg.inner_text("#lcKpis .lc-kpi >> nth=0") and "300,00" in pg.inner_text("#lcKpis .lc-kpi >> nth=1") and pg.locator("#lcFixos").is_visible(), "números da aba PJ = só a empresa (entradas 1.000, saídas 300); FIXOS aparece")
        pg.click("#lcNovo"); pg.wait_for_timeout(200)
        ok(pg.locator('[data-que="cache"]').count() == 1 and pg.locator('[data-que="reserva"]').count() == 0 and pg.locator('[data-que="invest"]').count() == 0, "NOVO na empresa: com cachê; sem reserva nem investimento pessoal")
        antes = pg.evaluate(FOTO, PF)
        pg.click('[data-que="gasto"]'); pg.wait_for_timeout(200)
        ds = pg.eval_on_selector_all("[data-dest]", "os => os.map(o => o.dataset.dest)")
        ok(ds == ["neg_saida", "ev_custo"], f"GASTEI na empresa oferece só negócio e evento {ds}")
        pg.click('[data-dest="neg_saida"]'); pg.fill("#fxValor", "50"); pg.fill("#fxDesc", "Cabo HDMI EMPRESA"); pg.click("#fxLancar"); pg.wait_for_timeout(400)
        ok(any(x["c3"] == "Cabo HDMI EMPRESA" for x in pg.evaluate(L("neg_fluxo"))) and pg.evaluate(FOTO, PF) == antes, "lançar na aba PJ grava só na empresa; as chaves da casa ficam idênticas")
        pg.click('#lcLista .lc-item:has-text("Cabo HDMI EMPRESA") [data-ed]'); pg.wait_for_timeout(200)
        ops = pg.eval_on_selector_all("#fxDest option", "os => os.map(o => o.value)")
        ok(ops and not any(o.startswith("casa_") for o in ops), f"ALTERAR na empresa não oferece destino da casa {ops}")
        pg.click("#lcFxFechar")
        ok(pg.evaluate("(() => { try { __lanc.criar('casa_gasto', {valor: '10', desc: 'x'}); return 'gravou'; } catch (e) { return 'recusou'; } })()") == "recusou" and pg.evaluate(FOTO, PF) == antes, "trava: a aba PJ RECUSA criar lançamento da casa")
        ok(pg.evaluate(SEM) <= 0, "LANÇAMENTOS sem estouro")
        pg.goto(BASE + "lancamentos.html?nicho=evento&periodo=tudo"); pg.wait_for_timeout(1000)
        ok(pg.evaluate("__lanc.amb()") == "pj", "atalho antigo com nicho de evento abre na aba PJ")
        pg.goto(BASE + "lancamentos.html?nicho=conta"); pg.wait_for_timeout(1000)
        ok(pg.evaluate("__lanc.amb()") == "pf", "atalho com nicho de conta da casa abre na aba PF")
        ok(not erros, f"sem erro de JS até aqui {erros}")

        # ---------- PAINEL FINANCEIRO: abas PJ | PF (com sessão simulada) ----------
        MODO["logado"] = True
        pg.goto(BASE + "financeiro-painel.html?a=pj"); pg.wait_for_timeout(1500)
        ok(pg.locator('#fpAbas .on[data-amb="pj"]').count() == 1 and pg.inner_text("#tituloAmb") == "PJ" and pg.evaluate(COR) == "#4C8DFF" and pg.locator("#painel").is_visible(), "PAINEL PJ abre na aba da empresa, em azul")
        lin = pg.evaluate("__painel.linhas().map(r => r.descricao + '|' + r.valor)")
        ok(pg.inner_text("#kReceita").replace("\xa0", " ") == "R$ 1.000" and not any("CASA" in x or "Padaria" in x for x in lin), f"PAINEL PJ: receita R$ 1.000 e nenhuma linha da casa ({len(lin)} linhas)")
        ok(pg.locator('[data-acao="enviar"] >> visible=true').count() == 1 and pg.locator("#eQtd").is_visible(), "PAINEL PJ mantém ENVIAR PLANILHA e os pagamentos de eventos")
        pg.click('#fpAbas [data-amb="pf"]'); pg.wait_for_timeout(1200)
        lin = pg.evaluate("__painel.linhas().map(r => r.descricao + '|' + r.valor)")
        ok("a=pf" in pg.url and pg.inner_text("#tituloAmb") == "PF" and pg.evaluate(COR) == "#2FD08A" and pg.locator('#fpAbas .on[data-amb="pf"]').count() == 1, "tocar em PAINEL PF troca a aba e a cor (verde)")
        ok(pg.inner_text("#kReceita").replace("\xa0", " ") == "R$ 3.500" and pg.inner_text("#kCustos").replace("\xa0", " ") == "R$ 150" and pg.inner_text("#kDespesas").replace("\xa0", " ") == "R$ 280" and pg.inner_text("#kSocio").replace("\xa0", " ") == "R$ 400", "PAINEL PF: receitas 3.500, contas pagas 150, gastos 280, reserva 400")
        ok(not any("EMPRESA" in x for x in lin) and "receitas da casa" in pg.inner_text("#kpis").lower() and "lucro da empresa" not in pg.inner_text("#kpis").lower(), "PAINEL PF: nenhuma linha da empresa e rótulos da casa")
        ok(pg.locator('[data-acao="enviar"] >> visible=true').count() == 0 and pg.locator("#eQtd").is_hidden() and pg.locator("#fonteSeg").is_hidden(), "PAINEL PF: sem ENVIAR PLANILHA, sem pagamentos de eventos e sem planilha Google")
        ok(pg.locator('#irLanc[href="lancamentos.html?a=pf"]').count() == 1, "PAINEL PF leva aos LANÇAMENTOS PF")
        ok(pg.evaluate(SEM) <= 0, "PAINEL sem estouro")
        pg.click('#fpAbas [data-amb="pj"]'); pg.wait_for_timeout(1200)
        ok(pg.inner_text("#kReceita").replace("\xa0", " ") == "R$ 1.000" and "lucro da empresa" in pg.inner_text("#kpis").lower(), "voltar para PAINEL PJ traz de novo só a empresa")
        MODO["logado"] = False

        # ---------- DOWNLOAD DO APP (.exe) ----------
        pg.goto(BASE + "baixar.html"); pg.wait_for_timeout(600)
        if largura > 500:
            ok(pg.locator("#cxExe").is_visible() and pg.get_attribute("#btExe", "href") == "downloads/BW-Setup.exe" and pg.get_attribute("#btExe", "download") == "BW-Setup.exe", "no computador o botão principal baixa o instalador BW-Setup.exe")
            r = pg.request.get(BASE + "downloads/BW-Setup.exe"); corpo = r.body()
            ok(r.status == 200 and len(corpo) > 1000000 and corpo[:2] == b"MZ", f"o arquivo existe e é um programa do Windows ({len(corpo) // 1024} KB)")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"baixar.html sem estouro; nenhum erro de JS no teste todo {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
raise SystemExit(1 if falhas else 0)
