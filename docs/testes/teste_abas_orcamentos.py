#!/usr/bin/env python3
"""Teste local (16/11): GERADOR DE ORÇAMENTO — abas PENDENTES / APROVADOS (+ RECUSADOS) com setas, como a AGENDA e os EVENTOS.
Confere: cada orçamento na aba certa (rascunho/enviado → PENDENTES; aprovado/recibo → APROVADOS; recusado → RECUSADOS, que só
aparece quando há); números nas abas; seta abre/fecha e fica lembrado ao recarregar (ui_prop_abas); ✓ APROVADO leva o orçamento
para APROVADOS sozinho (abre a aba e acende o cartão); ↺ REABRIR traz de volta para PENDENTES; RECUSADO vai para RECUSADOS;
busca vale dentro das abas; sem os chips antigos de situação; 1280 e 390 px sem estouro; 0 erros de JS.
Uso (na raiz):  python3 docs/testes/teste_abas_orcamentos.py"""
import http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8834
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

SEMEAR = """() => { const L = [];
  const mk = (st, nome, n) => { const d = __prop.novoDoc('proposta'); d.status = st; d.numero = 'ORC-2026-0' + n; d.cliente.nome = nome; d.atualizado = '2026-11-1' + n + 'T10:00:00Z'; L.push(d); };
  mk('rascunho', 'Cliente Rascunho', 1); mk('enviado', 'Cliente Enviado', 2); mk('enviado', 'Cliente Enviado Dois', 3); mk('aprovado', 'Cliente Aprovado', 4);
  const r = __prop.novoDoc('recibo'); r.numero = 'REC-2026-001'; r.cliente.nome = 'Cliente Recibo'; L.push(r);
  localStorage.setItem('bw_neg_propostas_v1', JSON.stringify(L)); localStorage.removeItem('ui_prop_abas'); }"""
CONT = "id => { const b = document.querySelector('.ag-aba.ab-' + id); return b ? +b.querySelector('.cont').textContent : null; }"
NA_ABA = "([id, nome]) => [...document.querySelectorAll('[data-corpo=\"' + id + '\"] .pr-card h4')].some(h => h.textContent.includes(nome))"

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, service_workers="block")
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "propostas.html"); pg.wait_for_timeout(600)
        pg.evaluate(SEMEAR); pg.reload(); pg.wait_for_timeout(700)
        ok(pg.evaluate(CONT, "pend") == 3 and pg.evaluate(CONT, "apr") == 2, f"PENDENTES 3 (rascunho + 2 enviados) e APROVADOS 2 (aprovado + recibo) — {pg.evaluate(CONT, 'pend')}/{pg.evaluate(CONT, 'apr')}")
        ok(pg.locator(".ag-aba.ab-rec").count() == 0, "RECUSADOS só aparece quando há recusado")
        ok(pg.evaluate(NA_ABA, ["apr", "Cliente Recibo"]) and pg.evaluate(NA_ABA, ["pend", "Cliente Rascunho"]), "cada um na aba certa")
        ok(pg.locator('#filtros [data-a="filtro"]').count() == 0 and pg.locator("#busca").count() == 1, "chips antigos de situação saíram; busca fica")
        ok(pg.get_attribute(".ag-aba.ab-pend", "aria-expanded") == "true" and pg.is_visible('[data-corpo="pend"]'), "PENDENTES aberta por padrão")
        # seta fecha e lembra
        pg.click(".ag-aba.ab-apr"); pg.wait_for_timeout(200)
        ok(pg.get_attribute(".ag-aba.ab-apr", "aria-expanded") == "false" and not pg.is_visible('[data-corpo="apr"]'), "seta fecha APROVADOS")
        pg.reload(); pg.wait_for_timeout(700)
        ok(not pg.is_visible('[data-corpo="apr"]'), "fechado continua fechado depois de recarregar")
        # ✓ APROVADO → vai sozinho para APROVADOS (que abre)
        card = pg.locator('[data-corpo="pend"] .pr-card', has_text="Cliente Enviado Dois")
        card.locator('[data-a="st"][data-v="aprovado"]').click(); pg.wait_for_timeout(700)
        if pg.locator("#modal").is_visible(): pg.click('#modal [data-a="fecharModal"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate(NA_ABA, ["apr", "Cliente Enviado Dois"]) and not pg.evaluate(NA_ABA, ["pend", "Cliente Enviado Dois"]), "✓ APROVADO move para APROVADOS")
        ok(pg.is_visible('[data-corpo="apr"]'), "APROVADOS abre sozinha para mostrar o orçamento")
        ok(pg.evaluate(CONT, "pend") == 2 and pg.evaluate(CONT, "apr") == 3, "números das abas atualizados")
        # ↺ REABRIR → volta para PENDENTES
        pg.locator('[data-corpo="apr"] .pr-card', has_text="Cliente Enviado Dois").locator('[data-a="st"][data-v="enviado"]').click(); pg.wait_for_timeout(500)
        ok(pg.evaluate(NA_ABA, ["pend", "Cliente Enviado Dois"]), "↺ REABRIR traz de volta para PENDENTES")
        # RECUSADO → aba RECUSADOS aparece
        pg.locator('[data-corpo="pend"] .pr-card', has_text="Cliente Enviado Dois").locator('[data-a="st"][data-v="recusado"]').click(); pg.wait_for_timeout(500)
        ok(pg.locator(".ag-aba.ab-rec").count() == 1 and pg.evaluate(CONT, "rec") == 1, "RECUSADO vai para RECUSADOS (aba aparece)")
        ok(pg.is_visible('[data-corpo="rec"]') and pg.evaluate(NA_ABA, ["rec", "Cliente Enviado Dois"]), "RECUSADOS abre mostrando o orçamento")
        # busca dentro das abas
        pg.fill("#busca", "Rascunho"); pg.wait_for_timeout(500)
        ok(pg.evaluate(CONT, "pend") == 1 and pg.evaluate(CONT, "apr") == 0, "busca filtra dentro das abas")
        pg.fill("#busca", ""); pg.wait_for_timeout(400)
        # --- editor: opções prontas guardadas em BOTÕES (sem chips soltos) e sem valores nos botões de serviço ---
        ok(not pg.is_visible("#kpis") and "R$" not in pg.inner_text("#vLista .tf-card").split("PENDENTES")[0], "lista: sem valores financeiros no topo")
        pg.locator('[data-corpo="pend"] .pr-card', has_text="Cliente Rascunho").locator('[data-a="abrir"]').click(); pg.wait_for_timeout(600)
        ok(pg.locator('[data-a="sug"]').count() == 0 and pg.locator('#form .pr-chip[data-a="poe"]:not([data-k="estilo"])').count() == 0, "editor: sem chips soltos de sugestão")
        ok(pg.locator("#form .pr-opc").count() >= 7, f"editor: botões ☰ OPÇÕES PRONTAS ({pg.locator('#form .pr-opc').count()})")
        ok("R$" not in pg.inner_text("#form .pr-botoes"), "botões de serviço sem valor em R$")
        antes = pg.evaluate("__prop.DOC().escopo.length")
        pg.click('#form [data-a="opcoes"][data-l="escopo"]'); pg.wait_for_timeout(300)
        ok(pg.is_visible("#modal .pr-opc-lista"), "OPÇÕES de 'O que será feito' abre a lista")
        mb = pg.eval_on_selector("#modalCx", "e => { const r = e.getBoundingClientRect(); return [r.left, r.right]; }")
        ok(mb[0] >= 0 and mb[1] <= larg, f"lista cabe na tela ({mb})")
        primeiro = pg.locator("#modal .pr-opc-it").first; txt = primeiro.inner_text().split("\n")[-1].strip()
        primeiro.click(); pg.wait_for_timeout(300)
        ok(pg.evaluate("__prop.DOC().escopo.length") == antes + 1 and pg.locator("#modal .pr-opc-it.on").count() >= 1, f"tocar põe no orçamento e marca ✓ ({txt[:30]})")
        pg.locator("#modal .pr-opc-it", has_text=txt).first.click(); pg.wait_for_timeout(300)
        ok(pg.evaluate("__prop.DOC().escopo.length") == antes, "tocar de novo tira")
        pg.locator("#modal .pr-opc-it").nth(1).click(); pg.wait_for_timeout(200); pg.locator("#modal .pr-opc-it").nth(2).click(); pg.wait_for_timeout(200)
        ok(pg.evaluate("__prop.DOC().escopo.length") == antes + 2, "dá para escolher várias de uma vez")
        pg.click('#modal [data-a="fecharModal"].bw-btn'); pg.wait_for_timeout(300)
        ok(not pg.is_visible("#modal") and pg.locator('#form input[data-l="escopo"]').count() == antes + 2, "✓ PRONTO fecha e os itens aparecem no formulário")
        pg.click('#form [data-a="opcoesCampo"][data-k="datas.montagem"]'); pg.wait_for_timeout(300)
        escolha = pg.locator("#modal .pr-opc-it").first.inner_text().split("\n")[-1].strip()
        pg.locator("#modal .pr-opc-it").first.click(); pg.wait_for_timeout(300)
        ok(not pg.is_visible("#modal") and pg.evaluate("__prop.DOC().datas.montagem") == escolha, f"opção de campo único preenche e fecha ({escolha[:30]})")
        pg.click('#form [data-a="voltar"]'); pg.wait_for_timeout(400)
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(sw <= 0, f"sem estouro horizontal ({sw})")
        ok(not erros, "0 erros de JavaScript" + ("" if not erros else ": " + erros[0][:160]))
        ctx.close()
    nav.close()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
