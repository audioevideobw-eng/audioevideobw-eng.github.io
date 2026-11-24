#!/usr/bin/env python3
"""Teste da página TESTES E SOLUÇÕES (teste.html + assets/testes.js, 22/11).
Confere, em 1280 (mouse) e 390 (toque pelo CDP): a página abre sem erro; ⚡ SÓ O APARELHO lista os itens do aparelho e de vídeo/som;
▶ TESTAR TUDO abre as ferramentas escondidas e ACUSA uma página de propósito ruim (zz_diag_ruim.html, criada e apagada aqui:
erro de JS, estouro para o lado e lista com 'contain' dentro de outra que rola) com a SOLUÇÃO certa, e dá ✓ numa página boa;
os testes com a pessoa (arrastar a lista, segurar 0,5 s, bip SIM/NÃO) entram no relatório; COPIAR monta o texto; nada é apagado da conta.
Uso (na raiz): python3 docs/testes/teste_testes.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8877
os.chdir(RAIZ)
RUIM = "zz_diag_ruim.html"
open(RUIM, "w").write("""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="assets/modos.js?v=9"></script><style>html,body{margin:0;height:100%;overflow:hidden}.fora{height:100%;overflow:auto}
.dentro{height:200px;overflow:auto;overscroll-behavior:contain}</style></head><body><div style="width:2000px;height:20px;background:red"></div><div class="fora"><h1>Página com defeito de propósito</h1><div class="dentro"><div style="height:205px">lista</div></div><div style="height:2000px">fim</div></div>
<script>naoExiste();</script></body></html>""")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},neq(){return q},order(){return q},limit(){return q},in(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),channel(){const c={on(){return c},subscribe(){return c},send(){}};return c},storage:{from(){return {}}}}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
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
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox"])
        for nome, vp, toque in (("PC 1280", (1280, 720), False), ("celular 390", (390, 844), True)):
            print(f"\n=== {nome} ===")
            ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=toque, is_mobile=toque); ctx.route("**/*", rota)
            pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
            pg.goto(BASE + "teste.html"); pg.wait_for_timeout(1200)
            ok(not erros, f"a página abre sem erro de JS {erros[:1]}")
            sw = pg.evaluate("document.documentElement.scrollWidth-innerWidth"); ok(sw <= 0, f"nada passa para o lado ({sw})")
            ok(pg.locator("#tsFerr input").count() >= 15, f"lista das ferramentas a abrir ({pg.locator('#tsFerr input').count()})")
            pg.click("#tsRapido"); pg.wait_for_function("!document.getElementById('tsRapido').disabled", timeout=30000)
            itens = pg.evaluate("BWTestes.R().map(r=>r.nome)")
            ok(any("Versão" in i or "versão" in i for i in itens) and any("MP4" in i for i in itens) and any("HEVC" in i for i in itens) and any("IndexedDB" in i for i in itens),
               f"⚡ SÓ O APARELHO lista versão, MP4, HEVC e IndexedDB ({len(itens)} itens)")
            # só a página boa + a ruim, para ser rápido
            pg.evaluate(f"""(()=>{{document.querySelectorAll('#tsFerr input').forEach(i=>i.checked=i.value==='lancamentos.html');
              const l=document.createElement('label');l.innerHTML='<input type=checkbox value="{RUIM}" data-n="RUIM DE PROPÓSITO" checked> ruim';document.getElementById('tsFerr').appendChild(l)}})()""")
            pg.click("#tsTudo"); pg.wait_for_function("!document.getElementById('tsTudo').disabled", timeout=90000)
            R = pg.evaluate("BWTestes.R()")
            ruim = [r for r in R if r["nome"] == "RUIM DE PROPÓSITO"]
            ok(any(r["st"] == "er" and "naoExiste" in r["det"] and r["sol"] == "erro" for r in ruim), "acusa o ERRO DE JS da página ruim, com a solução")
            ok(any(r["sol"] == "estouro" for r in ruim), "acusa o ESTOURO para o lado")
            ok(any(r["sol"] == "presa" and "dentro" in r["det"] for r in ruim), "acusa a ROLAGEM PRESA (lista com contain dentro de outra)")
            boa = [r for r in R if r["nome"] == "Lançamentos"]
            ok(boa and all(r["st"] == "ok" for r in boa), f"a página boa (Lançamentos) passa ✓ {[r['det'] for r in boa]}")
            ok(pg.locator("#tsQuadro").count() == 0, "o quadro escondido é removido no fim (memória)")
            ok(pg.locator(".ts-it.er .ts-sol").count() >= 2 and pg.locator("[data-atualizar]").count() >= 1, "cada problema mostra a SOLUÇÃO e o botão ↻ ATUALIZAR AGORA")
            # testes com a pessoa
            pg.locator("#tsRola").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
            rb = pg.locator("#tsRola").bounding_box(); x = rb["x"] + rb["width"] / 2; y = rb["y"] + rb["height"] * 0.8
            if toque:
                cdp = ctx.new_cdp_session(pg)
                cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
                for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y - 100 * k / 10}]}); pg.wait_for_timeout(16)
                cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
            else:
                pg.mouse.move(x, y); pg.mouse.wheel(0, 200)
            pg.wait_for_timeout(500)
            pg.locator("#tsSegura").scroll_into_view_if_needed(); pg.wait_for_timeout(300)
            sb = pg.locator("#tsSegura").bounding_box(); pg.mouse.move(sb["x"] + 40, sb["y"] + 40); pg.mouse.down(); pg.wait_for_timeout(700); pg.mouse.up()
            pg.click("#tsBip"); pg.click('[data-r="bip:nao"]'); pg.wait_for_timeout(200)
            R = pg.evaluate("BWTestes.R()"); pes = {r["nome"]: r["st"] for r in R if r["grupo"] == "TESTES COM VOCÊ"}
            ok(pes.get("Dedo rola a lista") == "ok", f"arrastar a lista entra como ✓ ({pes})")
            ok(pes.get("Segurar o dedo") == "ok", "segurar 0,5 s entra como ✓")
            ok(pes.get("Som do bip") == "er" and pg.locator(".ts-it.er", has_text="Som do bip").locator(".ts-sol").count() == 1, "bip NÃO OUVI vira problema com solução (modo silencioso)")
            pg.click("#tsCopiar"); rel = pg.input_value("#tsRel")
            ok("TESTES E SOLUÇÕES" in rel and "RUIM DE PROPÓSITO" in rel and "Som do bip" in rel, "o RELATÓRIO junta tudo para copiar/enviar")
            pg.click("#tsEnviar"); pg.wait_for_timeout(500)
            ok("Entre na sua conta" in pg.inner_text("#tsMsg"), "sem login, ENVIAR pede para entrar (ou copiar)")
            ctx.close()
finally:
    srv.shutdown(); os.remove(RUIM)
print(f"\nFALHAS: {len(falhas)}")
raise SystemExit(1 if falhas else 0)
