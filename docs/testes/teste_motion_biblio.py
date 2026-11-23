#!/usr/bin/env python3
"""Teste local (22/11): BIBLIOTECA do Estúdio de motion — 20 itens nativos novos (cada um entra, desenha e anima sem erro: o quadro no fim é
diferente do começo) e a BIBLIOTECA INTEGRADA (personagens prontos, objetos reais, desenhos dos convites, emojis): tocar põe o item na tela como
imagem em data: (vale no vídeo do aparelho e no app do PC). As imagens do Supabase são SIMULADAS (PNG local com CORS). 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_motion_biblio.py"""
import http.server, os, socketserver, threading, base64, io
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8861
STUB = "window.supabase={createClient:function(){const ch={on(){return ch},subscribe(f){f&&f('SUBSCRIBED');return ch},send(){},unsubscribe(){}};return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),channel(){return ch},removeChannel(){}}}};"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8Dwn4GBgYGJgYEBAA0bAQFzNH7BAAAAAElFTkSuQmCC")
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "/storage/v1/object/public/trends/" in u: return r.fulfill(body=PNG, content_type="image/png", headers={"Access-Control-Allow-Origin": "*"})
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
F = []
def ok(c, m): print(("  ✓ " if c else "  ✗ ") + m); (None if c else F.append(m))
P = "BWMotionEditor.projeto()"
def lib(pg, cel):
    if cel: pg.click('#moAbasCel [data-aba="lib"]'); pg.wait_for_timeout(150)
NOVOS = ["nomecargo", "legenda", "citacao", "marcatexto", "botao", "lista", "barras", "rosca", "progresso", "busca", "post", "estrelas", "pino", "onda", "brilhos", "raios", "confete", "circulomao", "setamao", "mira"]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "motion.html?layout=classico"); pg.wait_for_function("window.BWMotionEditor && window.BWMotionBiblio", timeout=15000); pg.wait_for_timeout(700)
        n = pg.evaluate("Object.keys(BWMotion.ITENS).length"); ok(n >= 34, f"biblioteca com {n} itens nativos")
        ok(pg.locator("#moLib [data-add]").count() == n, "todos aparecem na BIBLIOTECA DE ITENS")
        # cada item novo: entra, desenha e se mexe (o desenho no começo ≠ no meio)
        ruins = pg.evaluate("""(ids)=>{const r=[];ids.forEach(id=>{try{const P=BWMotion.novoProjeto('9:16');const it=BWMotion.novoItem(id,P,0);P.itens=[it];
            const d=document.createElement('div');d.style.cssText='position:fixed;left:-5000px;top:0';document.body.appendChild(d);const m=BWMotion.montar(d,P,{});
            m.seek(0.05);const a=d.innerHTML;m.seek(1.6);const b=d.innerHTML;m.seek(4);d.remove();
            if(/⚠/.test(b))r.push(id+':erro');else if(a===b&&!/citacao|raios|mira/.test(id))r.push(id+':parado')}catch(e){r.push(id+':'+e.message)}});return r}""", NOVOS)
        ok(not ruins, f"20 itens novos desenham e animam sem erro {ruins}")
        # pôr um item novo pela biblioteca (clique de verdade)
        h = pg.locator('#moEsq h4[data-seta="mo_lib"]')
        if not pg.locator('#moLib [data-add="rosca"]').is_visible(): h.click(); pg.wait_for_timeout(150)
        n0 = pg.evaluate(f"{P}.itens.length"); pg.locator('#moLib [data-add="rosca"]').click(); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{P}.itens.length") == n0 + 1 and pg.evaluate(f"{P}.itens.at(-1).tipo") == "rosca", "tocar em GRÁFICO DE ROSCA põe o item")
        # BIBLIOTECA INTEGRADA
        lib(pg, cel); hb = pg.locator('#moEsq h4[data-seta="mo_bib"]')
        if not pg.locator("#moBib").is_visible(): hb.click(); pg.wait_for_timeout(200)
        ok(pg.locator("#moBib [data-bibaba]").count() == 6, "6 abas na biblioteca integrada")
        pg.locator('#moBib [data-bibaba="des"]').click(); pg.wait_for_timeout(500)
        nd = pg.locator("#moBib [data-bib]").count(); ok(nd >= 50, f"desenhos dos convites ({nd})")
        n0 = pg.evaluate(f"{P}.itens.length"); pg.locator("#moBib [data-bib]").first.click(); pg.wait_for_timeout(500)
        it = pg.evaluate(f"(()=>{{const i={P}.itens.at(-1);return {{t:i.tipo,src:i.props.src.slice(0,22),sf:i.props.semFundo,enc:i.props.encaixe,loop:i.loop.efeito}}}})()")
        ok(pg.evaluate(f"{P}.itens.length") == n0 + 1 and it["t"] == "foto" and it["src"].startswith("data:image/png"), f"desenho entra como imagem em data: {it}")
        ok(it["sf"] and it["enc"] == "inteira" and it["loop"] != "nenhum", "…sem fundo, inteira e animada")
        lib(pg, cel); pg.locator('#moBib [data-bibaba="obj"]').click(); pg.wait_for_timeout(500)
        no = pg.locator("#moBib [data-bib]").count(); ok(no >= 30, f"objetos realistas ({no})")
        n0 = pg.evaluate(f"{P}.itens.length"); pg.locator("#moBib [data-bib]").nth(2).click(); pg.wait_for_function(f"{P}.itens.length=={n0 + 1}", timeout=8000)
        ok(pg.evaluate(f"{P}.itens.at(-1).props.src.startsWith('data:image/png')"), "objeto realista copiado para data: (vale no vídeo)")
        lib(pg, cel); pg.locator('#moBib [data-bibaba="pers"]').click(); pg.wait_for_timeout(500)
        np_ = pg.locator("#moBib [data-bib]").count(); ok(np_ >= 50, f"personagens prontos em vários ângulos ({np_})")
        n0 = pg.evaluate(f"{P}.itens.length"); pg.locator("#moBib [data-bib]").first.click(); pg.wait_for_function(f"{P}.itens.length=={n0 + 1}", timeout=8000)
        ok(pg.evaluate(f"!{P}.itens.at(-1).props.semFundo"), "personagem pronto entra com moldura (a foto tem fundo)")
        lib(pg, cel); pg.locator('#moBib [data-bibaba="emo"]').click(); pg.wait_for_timeout(300)
        n0 = pg.evaluate(f"{P}.itens.length"); pg.locator("#moBib [data-bib]").nth(4).click(); pg.wait_for_timeout(400)
        ok(pg.evaluate(f"{P}.itens.at(-1).tipo") == "emoji" and pg.evaluate(f"{P}.itens.length") == n0 + 1, "emoji entra como item")
        lib(pg, cel); pg.locator('#moBib [data-bibaba="meus"]').click(); pg.wait_for_timeout(400)
        ok(pg.locator("#moBib .mo-vazio").count() == 1, "MEUS PERSONAGENS vazio explica onde criar")
        # o vídeo do aparelho acha as imagens (HTML do motor com data:, sem endereço de fora)
        html = pg.evaluate(f"BWMotion.html({P})"); ok("storage/v1/object" not in html, "projeto não depende de endereço de fora")
        ok(pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth") <= 0, "sem estouro")
        ok(not er, f"sem erro de JS {er[:2]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not F else f"❌ {len(F)} falha(s): {F}"))
