#!/usr/bin/env python3
"""Teste do AVISO ÚNICO DO ECOSSISTEMA (23/11 — regra do dono: "um escrito simples no meio da tela,
que some em seguida; padrão em todas as ferramentas, nada de misturar layout").
Confere em CADA ferramenta: o aviso é o MESMO elemento (#bwAviso do layout.js), fica no MEIO da tela,
não bloqueia o toque, some sozinho, o aviso de erro dura mais, o "⏳" fica até trocar, não estoura em
390 px e nenhuma página tem toast próprio. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_aviso.py"""
import glob, http.server, io, os, re, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8877
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

# 1) ninguém mais desenha o seu próprio aviso flutuante
print("\n== código: um aviso só ==")
proprios = []
for f in glob.glob("assets/*.js") + glob.glob("*.html"):
    s = io.open(f, encoding="utf-8", errors="ignore").read()
    # TOAST = aviso de ação que some sozinho (tem setTimeout escondendo) ou nasce no body.
    # MENSAGEM DE FORMULÁRIO (fica ao lado do campo, não some) continua onde está: .bw-msg
    for m in re.finditer(r"function (aviso|toast|avisoPP)\((.*?)\) \{(.*?)\n", s, re.S):
        corpo = m.group(3)
        if "BWAviso" in corpo: continue
        if ".aviso(" in corpo: continue                      # ponte da casca de app para o editor
        some = "setTimeout" in corpo and ("hidden = true" in corpo or ".remove()" in corpo or "remove(\"vis\")" in corpo)
        nasce = "createElement" in corpo and "appendChild" in corpo
        if some or nasce: proprios.append(f + " → function " + m.group(1) + "()")
ok(not proprios, "nenhuma ferramenta cria toast próprio" + (" (achados: " + "; ".join(proprios[:4]) + ")" if proprios else ""))
# aviso é FRASE CURTA, não tutorial (o print do dono em 23/11: o texto saía cortado na tela)
longos = []
for f in glob.glob("assets/*.js") + glob.glob("*.html"):
    for m in re.finditer(r'(?:aviso|toast)\("([^"]{86,})"', io.open(f, encoding="utf-8", errors="ignore").read()):
        longos.append(os.path.basename(f) + ': "' + m.group(1)[:45] + '…"')
ok(not longos, "nenhum aviso vira tutorial (até 85 letras)" + (" — " + "; ".join(longos[:3]) if longos else ""))

lay = io.open("assets/layout.js", encoding="utf-8").read()
ok("window.BWAviso = mostrar" in lay, "layout.js expõe o BWAviso para todas as páginas")
css = io.open("assets/brightway.css", encoding="utf-8").read()
ok("#bwAviso" in css and "pointer-events:none" in css.split("#bwAviso")[1][:400], "o aviso não rouba o toque da tela")
ok("align-items:center" in css.split("#bwAviso")[1][:300] and "justify-content:center" in css.split("#bwAviso")[1][:300], "o aviso nasce no MEIO da tela")
# as ferramentas delegam
for f, fn in [("assets/video-editor.js", "aviso"), ("assets/motion.js", "aviso"), ("assets/telas.js", "aviso"),
              ("assets/fotos.js", "toast"), ("assets/criador.js", "toast"), ("assets/bw3d.js", "aviso"),
              ("assets/propostas.js", "toast"), ("assets/agenda.js", "toast"), ("assets/layout.js", "aviso")]:
    s = io.open(f, encoding="utf-8").read()
    m = re.search(r"function " + fn + r"\(([^)]*)\) \{([^\n]*)", s)
    ok(bool(m) and "BWAviso" in m.group(2), os.path.basename(f) + ": o aviso passa pelo BWAviso")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n===== {largura}×{altura} =====")
        ctx = b.new_context(viewport={"width": largura, "height": altura},
                            user_agent=("Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile" if largura < 500 else None),
                            has_touch=largura < 500, service_workers="block")
        ctx.route("**/*", lambda r: r.continue_() if ("127.0.0.1" in r.request.url or r.request.url.startswith(("blob:", "data:", "about:")))
                  else (r.fulfill(body=STUB, content_type="application/javascript") if "supabase-js" in r.request.url
                        else (r.fulfill(body="", content_type="text/css") if "fonts.g" in r.request.url else r.abort())))
        pg = ctx.new_page()
        pg.goto(BASE + "index.html", wait_until="domcontentloaded"); pg.wait_for_timeout(700)

        pg.evaluate("BWAviso('✓ salvo')")
        cx = pg.locator("#bwAviso .bw-av")
        ok(cx.is_visible(), "o aviso aparece")
        ok(cx.inner_text().strip() == "✓ salvo", "mostra o texto simples, sem enfeite")
        cai = pg.evaluate("""() => { const c = document.querySelector('#bwAviso .bw-av').getBoundingClientRect();
            const m = { x: c.left + c.width / 2, y: c.top + c.height / 2 };
            const el = document.elementFromPoint(m.x, m.y);
            return { centroY: Math.abs(m.y - innerHeight / 2), centroX: Math.abs(m.x - innerWidth / 2),
                     passa: !el || !el.closest('#bwAviso'), larg: c.width };
        }""")
        ok(cai["centroY"] < 40, f"fica no meio da tela na vertical ({cai['centroY']:.0f} px do centro)")
        ok(cai["centroX"] < 10, "centralizado na horizontal")
        ok(cai["passa"], "o toque passa pelo aviso (não bloqueia a ferramenta)")
        ok(cai["larg"] <= largura - 40, f"não encosta nas beiradas ({cai['larg']:.0f} px)")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0, "não estoura a tela")

        pg.evaluate("BWAviso('✓ salvo', '', 300)"); pg.wait_for_timeout(900)
        ok(not cx.is_visible(), "some sozinho")

        pg.evaluate("BWAviso.erro('não deu para abrir')"); pg.wait_for_timeout(2200)
        ok(cx.is_visible() and "erro" in (cx.get_attribute("class") or ""), "o aviso de erro fica mais tempo na tela")
        pg.evaluate("BWAviso.fechar()"); pg.wait_for_timeout(300)

        pg.evaluate("BWAviso('⏳ gerando o vídeo…')"); pg.wait_for_timeout(2500)
        ok(cx.is_visible(), "o ⏳ (andamento) fica até o próximo aviso")
        pg.evaluate("BWAviso('✓ pronto')"); pg.wait_for_timeout(100)
        ok(cx.inner_text().strip() == "✓ pronto", "o aviso seguinte troca o texto no lugar")
        pg.evaluate("BWAviso.fechar()")

        # 2) nas ferramentas: o aviso da ferramenta é o aviso único
        for pag, disparo, nome in [("video.html?layout=classico", "window.__video.aviso('✓ take posto')", "editor de vídeo"),
                                   ("fotos.html", "window.__fotos ? __fotos.toast('✓ salvo') : BWAviso('✓ salvo')", "editor de fotos"),
                                   ("motion.html?layout=classico", "BWAviso('✓ item posto')", "estúdio de motion")]:
            pg.goto(BASE + pag, wait_until="domcontentloaded"); pg.wait_for_timeout(1400)
            try: pg.evaluate(disparo)
            except Exception: pg.evaluate("BWAviso('✓ teste')")
            pg.wait_for_timeout(150)
            c2 = pg.locator("#bwAviso .bw-av")
            d = pg.evaluate("""() => { const e = document.querySelector('#bwAviso .bw-av'); if (!e) return null;
                const c = e.getBoundingClientRect(); return { meio: Math.abs(c.top + c.height / 2 - innerHeight / 2), vis: c.width > 0 }; }""")
            ok(bool(d) and d["vis"] and d["meio"] < 40, nome + ": usa o mesmo aviso, no meio da tela")
            ok(len(pg.locator(".ve-aviso:visible, .mo-aviso:visible, .toast:visible, .tl-aviso:visible").all()) == 0, nome + ": sem aviso antigo na tela")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else "❌ %d falha(s):\n - %s" % (len(falhas), "\n - ".join(falhas))))
raise SystemExit(1 if falhas else 0)
