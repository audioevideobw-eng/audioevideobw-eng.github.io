#!/usr/bin/env python3
"""Teste local do PROMPT IA (19/11): biblioteca em carrossel (passa para o lado, galeria flutuante), abas do cartão, copiar,
ADM (nova trend com imagem, alterar, excluir), ANALISAR com a IA SIMULADA (imagem só sai depois do confirm; resposta embrulhada) e
visitante sem login. Supabase e bw-ia são SIMULADOS (nada vai para a internet).
Uso (na raiz):  python3 docs/testes/teste_promptia.py   — sai com erro se algo falhar."""
import base64, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8834
TRENDS = [{"id": "t1", "titulo": "Boneco 3D de teste", "categoria": "Avatar 3D", "onde": "Gemini (Nano Banana), ChatGPT", "prompt": "Transform the person into a 3D character wearing [ROUPA].", "passos": "Envie a foto\nCole o prompt", "dicas": "Use foto nítida", "imagem": "", "ordem": 0, "ativo": True},
          {"id": "t2", "titulo": "Quadrinho de teste", "categoria": "Ilustração", "onde": "Midjourney", "prompt": "Comic illustration of [PESSOA].", "passos": "", "dicas": "", "imagem": "", "ordem": 1, "ativo": True},
          {"id": "t3", "titulo": "Vídeo de teste", "categoria": "Vídeo", "onde": "Kling", "prompt": "Slow dolly-in on [CENA].", "passos": "Gere a imagem\nAnime", "dicas": "", "imagem": "", "ordem": 2, "ativo": True},
          {"id": "t4", "titulo": "Miniatura de teste", "categoria": "Brinquedo", "onde": "ChatGPT", "prompt": "Toy minifigure of [PESSOA].", "passos": "", "dicas": "", "imagem": "", "ordem": 3, "ativo": True}]
# supabase-js simulado: tabela bw_trends em window.__db, storage "trends", sessão conforme window.__logado, is_bw_admin conforme window.__adm
STUB = """(function(){ var db = window.__db = JSON.parse(localStorage.getItem('__db') || 'null') || %s; var grava = function(){ localStorage.setItem('__db', JSON.stringify(db)); };
window.__up = []; var logado = localStorage.getItem('__logado') === '1', adm = localStorage.getItem('__adm') === '1';
function Q(t){ var q = {_op:'select', _f:[], select(){ return q; }, order(){ return q; }, limit(){ return q; }, neq(){ return q; }, in(){ return q; }, is(){ return q; }, gte(){ return q; }, lte(){ return q; }, not(){ return q; }, maybeSingle(){ return q; }, upsert(){ return q; },
  eq(c, v){ q._f.push([c, v]); return q; }, insert(r){ q._op = 'insert'; q._r = r; return q; }, update(r){ q._op = 'update'; q._r = r; return q; }, delete(){ q._op = 'delete'; return q; },
  then(ok){ var res; if (t !== 'bw_trends') res = {data: [], error: null};
    else if (q._op === 'select') res = {data: db.slice(), error: null};
    else if (!adm) res = {data: [], error: {message: 'new row violates row-level security policy'}};
    else if (q._op === 'insert') { var n = Object.assign({id: 'n' + Date.now(), ordem: 0, ativo: true, imagem: ''}, q._r); db.push(n); grava(); res = {data: [n], error: null}; }
    else { var alvo = db.filter(function (x) { return q._f.every(function (f) { return String(x[f[0]]) === String(f[1]); }); });
      if (q._op === 'update') alvo.forEach(function (x) { Object.assign(x, q._r); }); else alvo.forEach(function (x) { db.splice(db.indexOf(x), 1); }); grava(); res = {data: alvo, error: null}; }
    return Promise.resolve(res).then(ok); } }; return q; }
window.supabase = {createClient: function(){ return {
  auth: {getSession: async function(){ return {data: {session: logado ? {access_token: 'tok', user: {id: 'u1', email: 'teste@exemplo.com'}} : null}}; }, getUser: async function(){ return {data: {user: logado ? {id: 'u1'} : null}}; }, onAuthStateChange: function(){ return {data: {subscription: {unsubscribe: function(){}}}}; }},
  from: function(t){ return Q(t); }, rpc: async function(n){ return {data: n === 'is_bw_admin' ? adm : null, error: null}; },
  storage: {from: function(b){ return {upload: async function(nome, blob, o){ window.__up.push({b: b, nome: nome, tam: blob.size, tipo: o && o.contentType}); return adm ? {data: {path: nome}, error: null} : {data: null, error: {message: 'policy'}}; },
    getPublicUrl: function(nome){ return {data: {publicUrl: 'https://exemplo.invalid/storage/v1/object/public/trends/' + nome}}; }, remove: async function(){ return {data: [], error: null}; }, list: async function(){ return {data: []}; }}; }}}; }}; })();""" % json.dumps(TRENDS)
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAT0lEQVR42u3PQQ0AAAgEoNO/9DL4cIMGNE2+qggICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAh8WTGvAgHl9nUTAAAAAElFTkSuQmCC")
RESPOSTA = {"trend": {"nome": "Boneco 3D de cabeça grande", "categoria": "Avatar 3D", "resumo": "Sua foto vira um boneco 3D.", "precisa_foto": True, "prompt": "**Use the reference photo** and turn the person into a 3D toy character wearing [ROUPA].", "onde": ["Gemini (Nano Banana)", "ChatGPT"], "passos": ["Envie a foto", "Cole o prompt", "Baixe"], "dicas": ["Foto de frente"]}}
pedidos = []


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
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"})
        pedidos.append(json.loads(r.request.post_data or "{}"))
        return r.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*"}, content_type="application/json", body=json.dumps({"texto": "Aqui está:\n```json\n" + json.dumps(RESPOSTA) + "\n```"}))
    return r.abort()


falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
def clk(pg, sel):
    l = pg.locator(sel).first; l.evaluate("e => e.scrollIntoView({block: 'center'})"); pg.wait_for_timeout(150); l.click(force=True)   # centro da tela: no celular a barra de abas fixa cobre o rodapé   # o cartão do meio flutua sem parar (animação): clicar sem esperar "parado"
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for largura in (1280, 390):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": 900}, service_workers="block", locale="pt-BR", has_touch=largura < 500, permissions=["clipboard-read", "clipboard-write"])
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []; pedidos.clear()
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        # ---- visitante (sem login): vê a biblioteca, não vê botões do ADM, não analisa
        pg.goto(BASE + "promptia.html"); pg.wait_for_timeout(1300)
        ok(pg.locator("#piCar .pi-card").count() == 4 and pg.locator("#piCar .pi-card").first.is_visible(), "biblioteca mostra as 4 trends do banco em cartões")
        ok(not pg.locator("#piNova").is_visible() and pg.locator("#piCar [data-ed]").first.is_hidden(), "visitante não vê NOVA TREND nem ALTERAR/EXCLUIR")
        car = pg.evaluate("(() => { const c = document.getElementById('piCar'); return [c.scrollWidth > c.clientWidth, getComputedStyle(c).scrollSnapType]; })()")
        ok(car[0] and "x" in car[1], f"carrossel passa para o lado com encaixe ({car})")
        t0 = pg.evaluate("[...document.querySelectorAll('#piCar .pi-card')].map(c => c.style.transform)")
        ok(pg.locator("#piCar .pi-card.meio").count() == 1 and len(set(t0)) > 1, "galeria flutuante: um cartão no meio em destaque e os outros encolhidos")
        pg.evaluate("document.getElementById('piCar').scrollBy({left: 360})"); pg.wait_for_timeout(700)
        ok(pg.evaluate("document.querySelector('#piCar .pi-card.meio').dataset.id") != "t1" and pg.evaluate("[...document.querySelectorAll('#piCar .pi-card')].map(c => c.style.transform)") != t0, "ao passar para o lado, o destaque muda de cartão")
        if largura == 1280:
            x0 = pg.evaluate("document.getElementById('piCar').scrollLeft"); pg.click("#piProx"); pg.wait_for_timeout(700)
            ok(pg.evaluate("document.getElementById('piCar').scrollLeft") > x0, "seta › avança o carrossel")
        pg.evaluate("document.getElementById('piCar').scrollTo({left: 0})"); pg.wait_for_timeout(500)
        c1 = '#piCar .pi-card[data-id="t1"]'
        ok("[ROUPA]" in pg.inner_text(c1 + " .pi-corpo"), "aba PROMPT mostra o prompt")
        clk(pg, c1 + ' [data-aba="como"]'); pg.wait_for_timeout(200)
        ok(pg.locator(c1 + " .pi-passos li").count() == 2 and "Use foto nítida" in pg.inner_text(c1 + " .pi-corpo"), "aba COMO FAZER mostra os passos e as dicas")
        clk(pg, c1 + ' [data-aba="onde"]'); pg.wait_for_timeout(200)
        ok(pg.locator(c1 + ' .pi-onde a[href^="https://gemini.google.com"]').count() == 1 and pg.locator(c1 + " .pi-onde a").count() == 2, "aba ONDE FAZER traz o link de cada IA")
        clk(pg, c1 + " [data-copiar]"); pg.wait_for_timeout(300)
        ok("COPIADO" in pg.inner_text(c1 + " [data-copiar]") and "[ROUPA]" in pg.evaluate("navigator.clipboard.readText()"), "COPIAR PROMPT copia o texto")
        clk(pg, '#piCats [data-cat="Vídeo"]'); pg.wait_for_timeout(300)
        ok(pg.locator("#piCar .pi-card").count() == 1 and "Vídeo de teste" in pg.inner_text("#piCar"), "filtro por tipo")
        pg.click('[data-vista="an"]'); pg.wait_for_timeout(200)
        pg.fill("#anTexto", "boneco 3D de cabeça grande"); pg.click("#anBt"); pg.wait_for_timeout(500)
        ok("Entre na sua conta" in pg.inner_text("#anAviso") and not pedidos, "sem login a análise não sai do aparelho e pede para entrar")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"visitante: sem estouro e sem erro de JS {erros}")
        # ---- logado (usuário comum): analisa pela imagem, só depois do confirm
        pg.evaluate("localStorage.setItem('__logado', '1')"); pg.goto(BASE + "promptia.html?analisar=1"); pg.wait_for_timeout(1300)
        ok(pg.locator("#piAn").is_visible() and pg.locator("#piBib").is_hidden(), "?analisar=1 abre direto no analisador")
        pg.set_input_files("#anArq", {"name": "trend.png", "mimeType": "image/png", "buffer": PNG}); pg.wait_for_timeout(600)
        ok(pg.locator("#anPrev img").count() == 1 and pg.evaluate("__promptia.estado.blob && __promptia.estado.blob.type") == "image/jpeg", "o print aparece na prévia e vira uma cópia JPEG pequena")
        dlg.clear(); pg.click("#anBt"); pg.wait_for_timeout(1200)
        ok(len(dlg) == 1 and "cópia pequena" in dlg[0] and len(pedidos) == 1 and str(pedidos[0].get("imagem", "")).startswith("data:image/jpeg;base64,"), "a imagem só vai para a bw-ia depois do confirm, como data URL JPEG")
        res = pg.inner_text("#anRes")
        ok("Boneco 3D de cabeça grande" in res and "Use the reference photo" in res and "**" not in res and "SUA foto" in res, "resultado (resposta embrulhada da IA) vira o cartão com o prompt limpo")
        clk(pg, '#anRes [data-aba="onde"]'); pg.wait_for_timeout(200)
        ok(pg.locator('#anRes .pi-onde a').count() == 2, "resultado tem ONDE FAZER com links")
        clk(pg, '#anRes [data-aba="como"]'); pg.wait_for_timeout(200)
        ok(pg.locator("#anRes .pi-passos li").count() == 3, "resultado tem o passo a passo")
        ok(pg.locator("#anSalvar").is_hidden(), "usuário comum não vê SALVAR NA BIBLIOTECA")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"analisar: sem estouro e sem erro de JS {erros}")
        # ---- ADM: salva a análise na biblioteca (com a imagem), altera e exclui
        pg.evaluate("localStorage.setItem('__adm', '1'); localStorage.setItem('ui_admin', '1')"); pg.goto(BASE + "promptia.html?analisar=1"); pg.wait_for_timeout(1300)
        pg.set_input_files("#anArq", {"name": "trend.png", "mimeType": "image/png", "buffer": PNG}); pg.wait_for_timeout(600); pg.click("#anBt"); pg.wait_for_timeout(1200)
        ok(pg.locator("#anSalvar").is_visible(), "ADM vê SALVAR NA BIBLIOTECA no resultado")
        pg.click("#anSalvar"); pg.wait_for_timeout(300)
        ok(pg.locator("#piFolha").is_visible() and pg.input_value("#fmTitulo") == "Boneco 3D de cabeça grande" and "reference photo" in pg.input_value("#fmPrompt") and pg.input_value("#fmCat") == "Avatar 3D" and pg.locator("#fmPrev img").count() == 1, "o formulário já vem preenchido com a análise e a imagem")
        pg.click("#fmSalvar"); pg.wait_for_timeout(1500)
        db = pg.evaluate("__db"); novo = [x for x in db if x["titulo"] == "Boneco 3D de cabeça grande"]; up = pg.evaluate("__up")
        ok(len(novo) == 1 and "/trends/" in novo[0]["imagem"] and len(up) == 1 and up[0]["b"] == "trends" and up[0]["tipo"] == "image/jpeg", f"salvou a trend em bw_trends com a imagem no bucket trends ({up})")
        ok(pg.locator("#piBib").is_visible() and pg.locator("#piCar .pi-card").count() == 5 and "salva" in pg.inner_text("#piAviso"), "volta para a biblioteca com a trend nova e o aviso depois do re-render")
        pg.evaluate(f"document.querySelector('#piCar [data-ed=\"{novo[0]['id']}\"]').click()"); pg.wait_for_timeout(300)
        pg.fill("#fmTitulo", "Boneco 3D alterado"); pg.click("#fmSalvar"); pg.wait_for_timeout(1300)
        ok(any(x["titulo"] == "Boneco 3D alterado" for x in pg.evaluate("__db")) and len(pg.evaluate("__db")) == 5, "ALTERAR muda a trend sem duplicar")
        pg.click("#piNova"); pg.wait_for_timeout(300); pg.click("#fmSalvar"); pg.wait_for_timeout(300)
        ok("Preencha" in pg.inner_text("#fmAviso"), "NOVA TREND sem nome/prompt não salva")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok(pg.locator("#piFolha").is_hidden(), "Esc fecha o formulário")
        dlg.clear(); pg.evaluate(f"document.querySelector('#piCar [data-del=\"{novo[0]['id']}\"]').click()"); pg.wait_for_timeout(1200)
        ok(len(dlg) == 1 and "Excluir" in dlg[0] and len(pg.evaluate("__db")) == 4 and pg.locator("#piCar .pi-card").count() == 4, "EXCLUIR pede confirmação e tira da biblioteca")
        ok(pg.evaluate(SEM) <= 0 and not erros, f"ADM: sem estouro e sem erro de JS {erros}")
        # ---- banco vazio: mostra os exemplos
        pg.evaluate("localStorage.setItem('__db', '[]'); localStorage.removeItem('ui_promptia_cache')"); pg.goto(BASE + "promptia.html"); pg.wait_for_timeout(1300)
        ok(pg.locator("#piCar .pi-card").count() == 3 and pg.locator("#piCar .pi-ex").count() == 3 and pg.locator("#piCar [data-ed]").count() == 0, "biblioteca vazia mostra 3 EXEMPLOS (sem alterar/excluir)")
        if largura == 1280: pg.screenshot(path="/tmp/promptia_1280.png")
        else: pg.screenshot(path="/tmp/promptia_390.png")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas), falhas)
sys.exit(1 if falhas else 0)
