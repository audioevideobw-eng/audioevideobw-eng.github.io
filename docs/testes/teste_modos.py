#!/usr/bin/env python3
"""Teste dos MODOS DE APARÊNCIA e da página CONFIGURAÇÕES (20/11/2026): engrenagem no topo e no menu; lista de modos em grupos; trocar de modo
muda as cores na hora e continua depois de recarregar e em outras páginas; modo claro deixa o miolo claro nas páginas ajustadas e escuro nos
editores; efeitos (canvas de neve/fogos) só nos modos animados e desligáveis; modo com a MINHA MARCA (cores lidas de uma imagem no aparelho);
DARK não muda nada; nenhuma chave de dados da conta é tocada. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_modos.py"""
import base64, http.server, io, json, os, socketserver, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8899
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
def imagem_marca():   # "manual da marca" de teste: fundo branco, um bloco vermelho grande, um verde menor e um quase preto
    from PIL import Image, ImageDraw
    im = Image.new("RGB", (300, 200), "#FFFFFF"); d = ImageDraw.Draw(im); d.rectangle([20, 20, 180, 120], fill="#D0102A"); d.rectangle([200, 20, 280, 80], fill="#12A150"); d.rectangle([20, 140, 120, 180], fill="#101418")
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
BG = "getComputedStyle(document.body).backgroundColor"
VAR = "n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()"
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
DADOS = "Object.keys(localStorage).filter(k => k.indexOf('bw_') === 0).sort().map(k => k + '=' + localStorage.getItem(k)).join('§')"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "termos.html"); pg.evaluate("localStorage.clear(); localStorage.setItem('bw_neg_fluxo_v1', JSON.stringify([{id:'n1',c0:'2026-01-01',c1:'Entrada',c2:'10',c3:'x'}]))")
        pg.goto(BASE + "negocio.html"); pg.wait_for_timeout(1200); antes = pg.evaluate(DADOS)
        ok(pg.evaluate("document.documentElement.hasAttribute('data-modo')") is False and pg.evaluate(BG) == "rgb(6, 8, 13)" and pg.evaluate("BWModos.atual()") == "dark", "sem escolha = modo DARK: a página fica exatamente como sempre (sem data-modo)")
        ok(pg.locator('.bw-topo a.bw-cfg-topo[href="config.html"]').count() == 1 and pg.locator('#bwMenu a.bw-cfg[href="config.html"]').count() == 1, "engrenagem de CONFIGURAÇÕES no topo e no menu")
        pg.click(".bw-topo a.bw-cfg-topo"); pg.wait_for_timeout(1200)
        ok(pg.url.endswith("config.html") and pg.locator("#cfgEu").is_visible() and "Visitante" in pg.inner_text("#cfgNome"), "a engrenagem abre CONFIGURAÇÕES com MEUS DADOS")
        ids = pg.eval_on_selector_all("[data-modo-id]", "bs => bs.map(b => b.dataset.modoId)"); grupos = pg.locator(".cfg-grupo").all_inner_texts()
        ok(all(m in ids for m in ["dark", "pb", "azul", "clean", "futurista", "aconchego", "natal", "anonovo", "festa"]) and grupos[:4] == ["SIMPLES", "VIDRO E LUZ", "OUSADOS", "DATAS ESPECIAIS"], f"modos em grupos: simples, vidro e luz, ousados e datas especiais ({len(ids)} modos)")
        ok(all(m in ids for m in ["brancodourado", "verdebranco", "vermelhobranco", "laranjabranco", "vidrociano", "pretodourado", "verdepreto", "azulpreto", "vermelhopreto", "laranjapreto", "roxopreto", "rosapreto", "pratapreto"]) and pg.locator('[data-modo-id="pretodourado"] .cfg-mini.vidro').count() == 1, "modos de cor para a marca: 4 claros novos + 9 de vidro (preto e dourado, verde e preto…)")
        pg.click('[data-modo-id="pretodourado"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("document.documentElement.getAttribute('data-estilo')") == "vidro" and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--m-dest').trim().toLowerCase()") == "#d9b24c" and "217, 178, 76" in pg.evaluate("getComputedStyle(document.querySelector('.cfg-cx')).borderTopColor"), "PRETO E DOURADO: estilo vidro ligado e os cartões ganham a borda dourada")
        pg.click('[data-modo-id="dark"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("document.documentElement.hasAttribute('data-estilo')") is False and pg.evaluate("document.documentElement.hasAttribute('data-modo')") is False, "voltar ao DARK tira o estilo vidro")
        ok(pg.locator(".cfg-modo .cfg-mini").count() == len(ids) and pg.locator('[data-modo-id="natal"] .selo').inner_text() == "ANIMADO" and pg.locator('[data-modo-id="clean"] .selo').count() == 0, "cada modo tem a miniatura com as suas cores; os animados têm o selo")
        pg.fill("#cfgChamo", "Marcos"); pg.wait_for_timeout(150)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('ui_agente_nome'))") == "Marcos" and pg.inner_text("#cfgNome") == "Marcos" and pg.inner_text("#cfgFoto") == "M", "'Como te chamo?' guarda o nome que o Tio Cláudio usa")
        # CLEAN
        pg.click('[data-modo-id="clean"]', force=True); pg.wait_for_timeout(500)
        ok(pg.evaluate("document.documentElement.dataset.modo") == "clean" and pg.evaluate("document.documentElement.dataset.conteudo") == "claro" and pg.evaluate(VAR, "--m-dest") == "#6C4DF6" and "ligado" in pg.inner_text("#cfgAviso"), "tocar em CLEAN troca na hora (fundo claro, roxo nos destaques)")
        ok(pg.locator('[data-modo-id="clean"].on').count() == 1 and pg.evaluate("JSON.parse(localStorage.getItem('ui_modo'))") == "clean", "o modo escolhido fica marcado e guardado no aparelho")
        pg.goto(BASE + "lancamentos.html?a=pf"); pg.wait_for_timeout(1300)
        cor = pg.evaluate("getComputedStyle(document.querySelector('.lc-cx')).backgroundColor"); txt = pg.evaluate("getComputedStyle(document.querySelector('.lc-kpi b')).color")
        ok(pg.evaluate("document.documentElement.dataset.conteudo") == "claro" and cor == "rgb(255, 255, 255)" and txt == "rgb(23, 26, 44)" and pg.evaluate("document.documentElement.dataset.amb") == "pf", "o modo vale nas outras páginas: LANÇAMENTOS com cartões brancos e letra escura (e a cor do ambiente continua)")
        if largura > 900: ok(pg.evaluate("getComputedStyle(document.querySelector('.bw-menu')).backgroundColor") == "rgb(20, 22, 58)", "menu lateral na cor do modo")
        ok(pg.evaluate(SEM) <= 0, "sem estouro no modo claro")
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(1200)
        ok(pg.evaluate("document.documentElement.dataset.modo") == "clean" and pg.evaluate("document.documentElement.dataset.conteudo") == "escuro" and pg.evaluate(BG) == "rgb(6, 8, 13)", "num editor (fotos) o miolo continua escuro mesmo em modo claro")
        # FUTURISTA e efeitos
        pg.goto(BASE + "config.html"); pg.wait_for_timeout(900); pg.click('[data-modo-id="futurista"]', force=True); pg.wait_for_timeout(700)
        fx = pg.evaluate("document.documentElement.dataset.fx")
        ok("neon" in fx and "aurora" in fx and pg.locator("#bwFx").count() == 1 and pg.evaluate(VAR, "--m-dest") == "#3FE0FF", f"FUTURISTA liga neon, luzes de fundo e estrelas ({fx})")
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(1500)
        ok(pg.evaluate("document.documentElement.dataset.modo") == "futurista" and pg.locator("#hubRobo .olho").count() == 2 and pg.evaluate("getComputedStyle(document.querySelector('#hubRobo .olho')).animationName") == "hubPisca", "Início no modo futurista; o robô pisca")
        if largura > 900:
            pg.mouse.move(1100, 300); pg.wait_for_timeout(250); rx = pg.evaluate("document.getElementById('hubRobo').style.getPropertyValue('--rx')")
            ok(float(rx or 0) > 0.2, f"o robô acompanha o mouse (inclina para o lado do ponteiro: {rx})")
        pg.goto(BASE + "config.html"); pg.wait_for_timeout(900); pg.click('[data-modo-id="natal"]', force=True); pg.wait_for_timeout(900)
        pint = pg.evaluate("(() => { const c = document.getElementById('bwFx'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return n; })()")
        ok("neve" in pg.evaluate("document.documentElement.dataset.fx") and pint > 20, f"NATAL: a neve é desenhada na tela ({pint} pontos)")
        pg.uncheck("#cfgFx"); pg.wait_for_timeout(400)
        ok(pg.evaluate("document.documentElement.dataset.fx") == "" and pg.locator("#bwFx").count() == 0 and pg.evaluate("document.documentElement.dataset.modo") == "natal", "desligar ANIMAÇÕES tira os efeitos e mantém as cores do modo")
        pg.check("#cfgFx"); pg.wait_for_timeout(300)
        # MINHA MARCA
        pg.set_input_files("#mkArq", {"name": "produtora-exemplo.png", "mimeType": "image/png", "buffer": imagem_marca()}); pg.wait_for_timeout(700)
        ok(pg.input_value("#mkDest").lower() in ("#d0102a", "#cf102a", "#d0102b") and pg.input_value("#mkBase") == "claro" and pg.locator("#mkAchadas [data-cor]").count() >= 3 and pg.input_value("#mkNome") == "PRODUTORA EXEMPLO", f"LER A MARCA: achou a cor principal da imagem ({pg.input_value('#mkDest')}) e o fundo claro")
        pg.click("#mkSalvar"); pg.wait_for_timeout(500)
        meu = pg.evaluate("JSON.parse(localStorage.getItem('ui_modos_meus'))")
        ok(len(meu) == 1 and meu[0]["nome"] == "PRODUTORA EXEMPLO" and pg.evaluate("document.documentElement.dataset.modo") == meu[0]["id"] and pg.evaluate(VAR, "--m-dest").lower() == pg.input_value("#mkDest").lower() and "MINHA MARCA" in pg.locator(".cfg-grupo").all_inner_texts(), "SALVAR cria o modo com a marca, liga na hora e ele aparece no grupo MINHA MARCA")
        pg.reload(); pg.wait_for_timeout(900)
        ok(pg.evaluate("document.documentElement.dataset.modo") == meu[0]["id"], "o modo da marca continua depois de recarregar")
        pg.click("[data-apagar]", force=True); pg.wait_for_timeout(400)
        ok(pg.evaluate("localStorage.getItem('ui_modos_meus')") == "[]" and pg.evaluate("document.documentElement.hasAttribute('data-modo')") is False, "excluir o modo da marca volta para o DARK")
        ok(pg.evaluate(DADOS) == antes, "trocar de modo NÃO mexe em nenhum dado da conta (chaves bw_ idênticas)")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"sem estouro e sem erro de JS {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
raise SystemExit(1 if falhas else 0)
