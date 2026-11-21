#!/usr/bin/env python3
"""Teste do AMBIENTE ÚNICO (20/11): a LINHA DO TEMPO é o centro e as ferramentas criam para ela.
Confere: a caixa CRIAR PARA A LINHA DO TEMPO com os atalhos VISÍVEIS (regra 131), a biblioteca única
(assets/bw-criacoes.js) guardando no aparelho, a criação entrando na linha do tempo por video.html?criacao=ID,
a TROCA NO LUGAR (nova versão mantém o clipe, o corte e os efeitos), o ✎ EDITAR abrindo a ferramenta de origem
com ?p=&voltar=video&criacao=, a barra de volta nas ferramentas e que nada sai do aparelho. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_criacoes.py"""
import http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8863
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; FORA = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"

# faz uma imagem (ou um "vídeo" falso) no próprio navegador e guarda como criação da ferramenta pedida
GUARDAR = """async ([ferr, cor, nome, id, proj]) => {
  const c = document.createElement('canvas'); c.width = 400; c.height = 711;
  const x = c.getContext('2d'); x.fillStyle = cor; x.fillRect(0, 0, c.width, c.height);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const reg = await BWCriacoes.guardar({ id: id || null, blob, nome, tipo: 'imagem', ferramenta: ferr, projeto: proj || '' });
  return reg.id;
}"""

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))

        # ---- 1) o centro: a caixa CRIAR com os atalhos VISÍVEIS ----
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=20000)
        atalhos = pg.locator("#veCriarLista a")
        ok(atalhos.count() == 7, f"7 ferramentas na caixa CRIAR (achei {atalhos.count()})")
        ok(pg.locator("#veCriar").is_visible() and atalhos.first.is_visible(), "a caixa CRIAR e os atalhos aparecem na tela (não só existem)")
        hrefs = pg.eval_on_selector_all("#veCriarLista a", "a => a.map(x => x.getAttribute('href'))")
        ok(all("voltar=video" in h for h in hrefs), "todo atalho leva voltar=video (a criação sabe para onde voltar)")
        ok(any("motion.html" in h for h in hrefs) and any("3d.html" in h for h in hrefs) and any("fotos.html" in h for h in hrefs)
           and any("telas.html" in h for h in hrefs) and any("criador.html" in h for h in hrefs) and any("quadro=1" in h for h in hrefs),
           "atalhos para motion, telas, 3D, fotos, criador e quadro")
        ok(pg.evaluate(SEM) <= 0, "sem estouro horizontal")

        # ---- 2) a biblioteca guarda no aparelho ----
        cid = pg.evaluate(GUARDAR, ["motion", "#4C8DFF", "Abertura azul", None, "proj-1"])
        lista = pg.evaluate("async () => (await BWCriacoes.listar()).map(c => ({id:c.id,nome:c.nome,ferr:c.ferramenta,capa:!!c.capa,proj:c.projeto}))")
        ok(len(lista) == 1 and lista[0]["id"] == cid and lista[0]["ferr"] == "motion" and lista[0]["proj"] == "proj-1", "criação guardada com ferramenta e projeto de origem")
        ok(lista[0]["capa"] is True, "capa feita no aparelho (sem enviar nada)")

        # ---- 3) ?criacao=ID põe na linha do tempo ----
        pg.goto(BASE + "video.html?criacao=" + cid); pg.wait_for_function("window.__veProntoOk === true", timeout=20000)
        pg.wait_for_function("window.__video && window.__video.P().clips.length > 0", timeout=10000)
        clips = pg.evaluate("window.__video.P().clips")
        ok(len(clips) == 1 and clips[0]["mid"] == "bc-" + cid, "a criação entrou na linha do tempo")
        ok(pg.evaluate("!location.search.includes('criacao=')"), "o endereço é limpo depois (não repete ao recarregar)")
        ok(pg.locator("#veLib .ve-item .selo").first.is_visible(), "a biblioteca mostra de qual ferramenta a criação veio")
        ok(pg.locator("#veLib .ve-item .ed").first.is_visible(), "cada criação tem o ✎ para editar na origem")
        # dá ao clipe um corte e um efeito, para provar que a troca não desfaz a edição
        pg.evaluate("""() => { const c = window.__video.P().clips[0]; c.efeito = 'pb'; c.vol = 42; c.dur = 2.5; window.__video.sel(c.id); }""")
        clipId = pg.evaluate("window.__video.P().clips[0].id")
        pg.wait_for_timeout(900)   # guardar() espera 400 ms antes de gravar no aparelho

        # ---- 4) TROCA NO LUGAR: mesma criação, arquivo novo ----
        cid2 = pg.evaluate(GUARDAR, ["motion", "#12B76A", "Abertura verde", cid, "proj-1"])
        ok(cid2 == cid, "a nova versão fica com o MESMO id de criação")
        pg.goto(BASE + "video.html?criacao=" + cid); pg.wait_for_function("window.__veProntoOk === true", timeout=20000)
        pg.wait_for_timeout(600)
        depois = pg.evaluate("window.__video.P().clips")
        ok(len(depois) == 1, "não duplicou o clipe (trocou no lugar)")
        ok(depois[0]["id"] == clipId and depois[0]["efeito"] == "pb" and depois[0]["vol"] == 42, "o clipe guardou id, efeito e volume")
        ok(pg.evaluate("async () => { const c = await BWCriacoes.pegar(window.__video.P().clips[0].mid.slice(3)); return c.nome; }") == "Abertura verde", "o arquivo é a versão nova")

        # ---- 5) ✎ EDITAR abre a ferramenta de origem no projeto certo ----
        pg.locator("#veLib .ve-item .ed").first.click()
        pg.wait_for_url("**/motion.html*", timeout=15000)
        u = pg.url
        ok("p=proj-1" in u and "voltar=video" in u and "criacao=" + cid in u, f"abriu o Motion no projeto da criação ({u.split('?')[-1][:60]})")
        pg.wait_for_timeout(1200)
        ok(pg.locator("#bwcrVolta").is_visible(), "a ferramenta mostra a barra de volta para a linha do tempo")
        ok(pg.locator("#bwcrVolta a").first.get_attribute("href") == "video.html", "a barra volta para o editor de vídeo")
        ok(pg.evaluate(SEM) <= 0, "ferramenta sem estouro com a barra de volta")

        # ---- 6) o botão da ferramenta diz ATUALIZAR quando veio da linha do tempo ----
        rot = pg.evaluate("""() => { const b = BWCriacoes.aoLado('moExpQual', { ferramenta: 'motion', arquivo: () => null }); return b ? b.textContent : ''; }""")
        ok("ATUALIZAR NA LINHA DO TEMPO" in rot, "na volta o botão diz ATUALIZAR NA LINHA DO TEMPO")
        pg.goto(BASE + "motion.html"); pg.wait_for_timeout(1500)
        rot2 = pg.evaluate("""() => { const b = BWCriacoes.aoLado('moExpQual', { ferramenta: 'motion', arquivo: () => null }); return b ? b.textContent : ''; }""")
        ok("MANDAR PARA A LINHA DO TEMPO" in rot2 and not pg.locator("#bwcrVolta").count(), "aberta sozinha, a ferramenta diz MANDAR e não mostra barra de volta")

        # ---- 7) nada sai do aparelho ----
        ok(not FORA, f"nenhum pedido para fora ({FORA[:2]})")
        ok(not erros, f"0 erros de JavaScript ({erros[:2]})")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
raise SystemExit(1 if falhas else 0)
