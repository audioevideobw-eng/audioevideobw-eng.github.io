#!/usr/bin/env python3
"""Teste da PROTEÇÃO ANTI-MOLDURA (clickjacking) e do REFERRER (25/11/2026 — guia "100 pontos de segurança", pontos 48/55/57).

No GitHub Pages não existe cabeçalho X-Frame-Options nem frame-ancestors (no <meta> o navegador ignora). A defesa é o bloco
#bwAntiMoldura posto por docs/automacoes/seguranca-paginas.py: a página nasce escondida e só aparece sozinha na aba ou dentro
de um quadro do PRÓPRIO site. Este teste prova isso no navegador:
  1. página sozinha na aba → aparece;
  2. dentro de um quadro do mesmo site (como o TESTES E SOLUÇÕES faz) → aparece;
  3. dentro de um "site de fora" (outra origem: localhost × 127.0.0.1) → fica em branco OU a aba inteira vai para o site certo;
  4. quadro com sandbox (sem allow-same-origin) → fica em branco;
  5. referrer: um link para fora leva só a origem, nunca ?g=TOKEN.
Uso (na raiz): python3 docs/testes/teste_moldura.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
P_SITE, P_FORA = 8893, 8894
SITE = f"http://127.0.0.1:{P_SITE}/"
FORA = f"http://localhost:{P_FORA}/"
REF = {}


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


class Fora(http.server.BaseHTTPRequestHandler):
    """O "site do golpista": embute uma página da Brightway num quadro e registra o Referer que recebe."""
    def log_message(self, *a): pass

    def do_GET(self):
        REF[self.path] = self.headers.get("Referer")
        alvo = self.path.split("alvo=")[-1] if "alvo=" in self.path else "termos.html"
        sb = ' sandbox="allow-scripts allow-forms"' if "sandbox" in self.path else ""
        corpo = (f'<!doctype html><title>fora</title><h1>site de fora</h1>'
                 f'<iframe id="f" src="{SITE}{alvo}"{sb} width="800" height="600"></iframe>').encode()
        self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(corpo))); self.end_headers(); self.wfile.write(corpo)


os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
for porta, h in ((P_SITE, Q), (P_FORA, Fora)):
    s = socketserver.TCPServer(("127.0.0.1", porta), h); threading.Thread(target=s.serve_forever, daemon=True).start()

falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

VISIVEL = "getComputedStyle(document.documentElement).display !== 'none'"
PAGINAS = ["termos.html", "seguranca.html", "login.html", "cadastro.html", "pedido.html", "index.html", "video.html"]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    ctx = b.new_context(service_workers="block")
    pg = ctx.new_page()

    print("\n== 1. sozinha na aba: aparece ==")
    for n in PAGINAS:
        pg.goto(SITE + n, wait_until="domcontentloaded")
        ok(pg.evaluate(VISIVEL), f"{n} aparece sozinha na aba")

    print("\n== 2. quadro do PRÓPRIO site (TESTES E SOLUÇÕES): aparece ==")
    pg.goto(SITE + "termos.html", wait_until="domcontentloaded")
    pg.evaluate("() => { const f = document.createElement('iframe'); f.id = 'q'; f.src = 'video.html'; document.body.appendChild(f); }")
    pg.wait_for_timeout(1500)
    fr = next((f for f in pg.frames if f.url.endswith("video.html")), None)
    ok(fr is not None and fr.evaluate(VISIVEL), "video.html aparece dentro de um quadro do mesmo site")

    print("\n== 3. dentro de um site DE FORA: em branco ou a aba vai para o site certo ==")
    for n in ["termos.html", "login.html", "cadastro.html", "pedido.html"]:
        pg2 = ctx.new_page()
        pg2.goto(FORA + "?alvo=" + n, wait_until="load"); pg2.wait_for_timeout(800)
        if pg2.url.startswith(SITE):
            ok(True, f"{n}: a aba inteira foi para o site certo ({pg2.url[len(SITE):]})")
        else:
            fr = next((f for f in pg2.frames if f.url.startswith(SITE)), None)
            ok(fr is not None and not fr.evaluate(VISIVEL), f"{n}: dentro do site de fora fica EM BRANCO")
        pg2.close()

    print("\n== 4. quadro com sandbox (sem allow-same-origin): em branco ==")
    pg3 = ctx.new_page()
    pg3.goto(FORA + "?sandbox&alvo=login.html", wait_until="load"); pg3.wait_for_timeout(800)
    fr = next((f for f in pg3.frames if f.url.startswith(SITE)), None)
    ok(fr is not None and not fr.evaluate(VISIVEL), "login.html em quadro com sandbox fica em branco")

    print("\n== 5. referrer: link para fora não leva o caminho nem o ?g=TOKEN ==")
    pg.goto(SITE + "termos.html?g=TOKEN_SECRETO_TESTE", wait_until="domcontentloaded")
    pg.evaluate(f"() => {{ const a = document.createElement('a'); a.href = '{FORA}ref'; a.id = 'sai'; a.textContent = 'x'; document.body.appendChild(a); }}")
    pg.click("#sai"); pg.wait_for_timeout(800)
    r = REF.get("/ref") or ""
    ok(r == SITE, f"o site de fora recebeu só a origem como Referer ({r!r})")
    ok("TOKEN" not in r, "o token da galeria não vazou no Referer")
    b.close()

print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + "; ".join(falhas)))
raise SystemExit(1 if falhas else 0)
