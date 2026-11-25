#!/usr/bin/env python3
"""Teste local do 🎬 MODO DIRETOR do Quadro de História (BW REELS PRO, 25/11/2026).
Abre o diretor, escolhe um INÍCIO RÁPIDO, conta a ideia, a IA (simulada) escreve o roteiro, edita/reordena/tira cena, monta o quadro
(blocos ligados em ordem + referência ligada às cenas do lugar), PEDIR MUDANÇA refaz só a cena pedida (selo MUDOU, imagem dela sai,
as outras ficam), STORYBOARD 3×3 baixa um PNG 1104×1944 com o texto pronto, sem conta cai no roteiro base, Esc fecha só o painel.
1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_diretor.py"""
import http.server, json, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import _sem_sri  # noqa
from PIL import Image

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8831; TMP = "/tmp/teste_diretor"; os.makedirs(TMP, exist_ok=True)
STUB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},insert(){return q},delete(){return q},update(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};const ses=window.__semConta?null:{access_token:'t',user:{id:'u1',email:'teste@exemplo.com'}};
return {auth:{getSession:async()=>({data:{session:ses}}),getUser:async()=>({data:{user:ses&&ses.user}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),
storage:{from(){return {list:async()=>({data:[]})}}},functions:{invoke:async()=>({data:null})}};}};"""
ROT = {"titulo": "Congresso Tech 2026", "personagem": {"nome": "Lia", "descricao": "apresentadora de 30 anos, blazer azul, crachá do evento"},
       "lugares": ["auditório com telão de LED e luz azul", "foyer com estandes"],
       "cenas": [{"texto": "montagem do palco, luzes acendendo, plano aberto", "fala": "Começa hoje", "lugar": 0},
                 {"texto": "público entrando no foyer, câmera na mão", "fala": "800 pessoas", "lugar": 1},
                 {"texto": "Lia no palco apresentando, contraluz", "fala": "", "lugar": 0},
                 {"texto": "detalhes dos estandes e sorrisos em close", "fala": "", "lugar": 1},
                 {"texto": "todo mundo aplaudindo no auditório", "fala": "Que noite!", "lugar": 0},
                 {"texto": "luzes apagando no fim", "fala": "", "lugar": -1}], "final": "Nos vemos no próximo"}
MUD = {"cenas": [{"n": 3, "texto": "Lia no palco à noite, chuva lá fora pela janela", "fala": "Mesmo com chuva"}], "final": None, "personagem": None}
PEDIDOS = []
class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        d = r.request.post_data or ""; PEDIDOS.append(d)
        resp = MUD if "pedido de mudança" in d else ROT
        return r.fulfill(body=json.dumps({"texto": "```json\n" + json.dumps(resp) + "\n```"}), content_type="application/json")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()

falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for larg, alt in ((1280, 900), (390, 844)):
        print(f"\n=== {larg}px ===")
        PEDIDOS.clear()
        ctx = b.new_context(viewport={"width": larg, "height": alt}, service_workers="block", accept_downloads=True, has_touch=larg < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "reels.html"); pg.wait_for_timeout(1800)
        if pg.is_visible("#folhaModelos"): pg.evaluate("document.getElementById('folhaModelos').hidden = true")
        pg.click("#btQuadro"); pg.wait_for_timeout(500)
        ok(pg.is_visible("#qdBtDir"), "botão 🎬 DIRETOR no trilho do quadro")
        pg.click("#qdBtDir"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#qdDir") and pg.locator("[data-ini]").count() == 9, "painel do diretor abre com 9 INÍCIOS RÁPIDOS")
        ok(pg.locator(".qd-dir-passos li").count() == 5 and pg.locator(".qd-dir-passos li.agora").count() == 1, "etapas 1 IDEIA … 5 VÍDEO, a atual marcada")
        pg.click('[data-ini="evento"]'); pg.wait_for_timeout(150)
        ok(pg.locator('[data-n="6"].on').count() == 1, "Aftermovie já sugere 6 cenas")
        pg.fill("#qdDirIdeia", "aftermovie do congresso de tecnologia, 800 pessoas, telão de LED")
        pg.click('[data-tom="profissional"]'); pg.wait_for_timeout(100)
        pg.click('[data-dir="escrever"]'); pg.wait_for_timeout(700)
        ped = PEDIDOS[-1] if PEDIDOS else ""
        ok("diretor de vídeos curtos" in ped and "Aftermovie de evento" in ped and "Profissional" in ped and "800 pessoas" in ped and "6" in ped, "pedido à IA leva tipo, tom, número de cenas e a ideia (só texto)")
        ok(pg.locator(".qd-dir-cena").count() == 6 and "Congresso Tech 2026" in pg.input_value('[data-rot="titulo"]'), "roteiro editável com 6 cenas e título")
        # editar, reordenar, tirar
        pg.fill('[data-cena="1"][data-c="fala"]', "800 pessoas no foyer")
        pg.click('[data-desce="0"]'); pg.wait_for_timeout(100)
        ok(pg.evaluate("BWDiretor.estado().rot.cenas[1].texto").startswith("montagem do palco"), "↓ troca a cena de lugar")
        pg.click('[data-sobe="1"]'); pg.wait_for_timeout(100)
        pg.click('[data-tira="5"]'); pg.wait_for_timeout(100)
        ok(pg.locator(".qd-dir-cena").count() == 5 and pg.evaluate("BWDiretor.estado().rot.cenas[1].fala") == "800 pessoas no foyer", "✕ tira a cena e o texto editado fica guardado")
        pg.click('[data-dir="montar"]'); pg.wait_for_timeout(600)
        h = pg.evaluate("(() => { const q = BWQuadroDir.estado(), h = BWQuadroDir.historia(); return {cenas: h.cenas.map(c => c.texto), pers: h.pers && h.pers.nome, fim: h.fim && h.fim.texto, refs: q.blocos.filter(b => b.tipo === 'ref').length, setasRef: q.setas.filter(s => (q.blocos.find(b => b.id === s.de) || {}).tipo === 'ref').length, soltas: h.soltas.length}; })()")
        ok(len(h["cenas"]) == 5 and h["cenas"][0].startswith("montagem") and h["soltas"] == 0, "MONTAR O QUADRO: 5 cenas ligadas na ordem do roteiro")
        ok(h["pers"] == "Lia" and h["fim"] == "Nos vemos no próximo" and h["refs"] == 2 and h["setasRef"] == 5, "personagem, final e 2 referências ligadas só às cenas daquele lugar")
        ok(pg.locator(".qd-dir-passos li.feito").count() == 2 and pg.is_visible('[data-dir="storyboard"]'), "etapa 3: CRIAR IMAGENS, STORYBOARD, MONTAR VÍDEO e PEDIR MUDANÇA")
        # imagem falsa em todas as cenas para provar que a mudança só tira a da cena pedida
        pg.evaluate("""(async () => { const h = BWQuadroDir.historia(); const c = document.createElement('canvas'); c.width = 60; c.height = 100; const x = c.getContext('2d');
          for (const [i, cn] of h.cenas.entries()) { x.fillStyle = ['#c33','#3c3','#33c','#cc3','#3cc'][i]; x.fillRect(0,0,60,100); const bl = await new Promise(o => c.toBlob(o)); window.__fakeImg = window.__fakeImg || {}; }
        })()""")
        pg.evaluate("""(() => { const h = BWQuadroDir.historia(); const c = document.createElement('canvas'); c.width = 60; c.height = 100; c.getContext('2d').fillStyle = '#3c3'; c.getContext('2d').fillRect(0,0,60,100);
          const u = c.toDataURL(); window.__ids = h.cenas.map(x => x.id); })()""")
        ids = pg.evaluate("window.__ids")
        cena2_antes = pg.evaluate(f"BWQuadroDir.estado().blocos.find(b => b.id === '{ids[1]}').texto")
        pg.fill("#qdDirMud", "a cena 3 acontece à noite, com chuva")
        pg.click('[data-dir="mudar"]'); pg.wait_for_timeout(600)
        ped = PEDIDOS[-1]
        ok("pedido de mudança" in ped and "Cena 3:" in ped and "chuva" in ped, "PEDIR MUDANÇA manda o roteiro numerado + o pedido")
        b3 = pg.evaluate(f"BWQuadroDir.estado().blocos.find(b => b.id === '{ids[2]}')")
        ok("chuva" in b3["texto"] and b3.get("mudou") and b3["fala"] == "Mesmo com chuva", "só a cena 3 mudou (texto + fala) e ficou marcada")
        ok(pg.evaluate(f"BWQuadroDir.estado().blocos.find(b => b.id === '{ids[1]}').texto") == cena2_antes and pg.locator(".qd-mudou").count() == 1, "as outras cenas ficaram iguais; 1 selo ✎ MUDOU no quadro")
        ok("cena 3" in pg.inner_text("#qdDirAviso").lower(), "aviso diz qual cena mudou")
        # editar o bloco à mão tira o selo
        pg.click("#qdDirFechar"); pg.wait_for_timeout(200)
        pg.fill(f'.qd-bloco[data-id="{ids[2]}"] [data-campo="texto"]', "Lia no palco à noite, chuva forte")
        pg.wait_for_timeout(200)
        ok(pg.locator(".qd-mudou").count() == 0 and not pg.evaluate(f"BWQuadroDir.estado().blocos.find(b => b.id === '{ids[2]}').mudou"), "mexer na cena à mão tira o selo MUDOU")
        # storyboard
        pg.click("#qdBtDir"); pg.wait_for_timeout(200)
        with pg.expect_download() as dl: pg.click('[data-dir="storyboard"]')
        arq = f"{TMP}/sb-{larg}.png"; dl.value.save_as(arq); pg.wait_for_timeout(200)
        im = Image.open(arq)
        ok(im.size == (1104, 1944), f"STORYBOARD 3×3 baixado ({im.size[0]}×{im.size[1]})")
        px = im.convert("RGB").getpixel((6 + 16, 6 + 34)); vazio = im.convert("RGB").getpixel((6 + 2 * 366 + 180, 6 + 2 * 646 + 600))
        ok(px[0] > 200 and px[1] > 150 and px[2] < 120, "cada painel numerado com o selo âmbar da marca")
        ok(vazio[2] > vazio[0] and vazio[0] < 40, "painel sem cena fica no azul-marinho da marca")
        t = pg.input_value("#qdDirSb")
        ok(pg.is_visible("#qdDirSb") and "3x3 grid" in t and "5 numbered panels" in t and "blazer azul" in t, "texto pronto para a IA de vídeo (inglês) com o personagem")
        # Esc fecha só o painel
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        ok(not pg.is_visible("#qdDir") and pg.is_visible("#folhaQuadro"), "Esc fecha só o diretor, o quadro continua")
        # recarregar mantém a etapa
        pg.reload(); pg.wait_for_timeout(1500)
        if pg.is_visible("#folhaModelos"): pg.evaluate("document.getElementById('folhaModelos').hidden = true")
        pg.click("#btQuadro"); pg.wait_for_timeout(300); pg.click("#qdBtDir"); pg.wait_for_timeout(300)
        ok(pg.is_visible('[data-dir="mudar"]') and pg.evaluate("BWQuadroDir.historia().cenas.length") == 5, "recarregar: quadro e etapa continuam")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0, "sem estouro horizontal")
        ok(pg.evaluate("[...document.querySelectorAll('#qdDir button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão do diretor tem nome")
        caixa = pg.evaluate("(() => { const r = document.querySelector('#qdDir .qd-pp-caixa').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1; })()")
        ok(caixa, "painel cabe na largura da tela")
        # sem conta: roteiro base pelo tipo de vídeo
        pg.click('[data-dir="novo"]'); pg.wait_for_timeout(150)
        pg.evaluate("BWQuadroDir.sessao = async () => null; BWQuadroDir.ia = async () => ({erro: 'login'})")
        pg.click('[data-ini="produto"]'); pg.click('[data-dir="escrever"]'); pg.wait_for_timeout(400)
        ok(pg.locator(".qd-dir-cena").count() == 5 and "entre na sua conta" in pg.inner_text("#qdDirAviso").lower(), "sem conta: roteiro base de 5 cenas e o motivo na tela")
        ok(not erros, "sem erro de JavaScript" + (f": {erros[:2]}" if erros else ""))
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
sys.exit(1 if falhas else 0)
