#!/usr/bin/env python3
"""Teste da BIBLIOTECA DE CONVITES e do CONVITE ANIMADO (22/11): miniaturas de todos os modelos, aplicar modelo, ligar a animação,
bichinhos/efeitos (todos desenham sem erro), arrastar na prévia (fração), a prévia se mexe, PNG parado continua funcionando e o
VÍDEO MP4 é gerado de verdade no aparelho (ffprobe: H.264, duração, tamanho; quadros diferentes entre t=0,5 s e t=3 s).
1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_convites.py"""
import http.server, os, socketserver, threading, subprocess, json, hashlib
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8823; TMP = "/tmp/teste_convites"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},insert(){return q},delete(){return q},update(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),
storage:{from(){return {list:async()=>({data:[]})}}},functions:{invoke:async()=>({data:null})}};}};"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.fulfill(status=404, body="")
FALHAS = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: FALHAS.append(m)

with sync_playwright() as p:
    b = p.chromium.launch()
    for W, H in ((1280, 900), (390, 844)):
        print(f"\n== {W} px ==")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + "criador.html"); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_timeout(1500)
        n = pg.evaluate("window.__criador.modelos.length")
        ok(n >= 45, f"biblioteca com {n} modelos")
        pg.wait_for_function("document.querySelectorAll('#bib canvas').length >= " + str(n), timeout=30000)
        ok(pg.locator("#bib canvas").count() == n, "todas as miniaturas desenhadas")
        # miniaturas diferentes entre si (não é tudo o mesmo desenho)
        hs = pg.evaluate("[...document.querySelectorAll('#bib canvas')].slice(0,12).map(c=>c.toDataURL().length+':'+c.toDataURL().slice(-40))")
        ok(len(set(hs)) >= 11, f"miniaturas diferentes ({len(set(hs))}/12)")
        pg.locator(".cr-chip[data-k=bibcat][data-v=anim]").click(); pg.wait_for_timeout(300)
        nA = pg.locator("#bib .cr-mod").count(); ok(0 < nA < n, f"filtro ✨ Animados ({nA})")
        # aplicar o modelo do ursinho
        pg.locator(".cr-chip[data-k=bibcat][data-v='']").click(); pg.wait_for_timeout(200)
        pg.locator("[data-mod=in-ursinho]").scroll_into_view_if_needed(); pg.locator("[data-mod=in-ursinho]").click(); pg.wait_for_timeout(500)
        st = pg.evaluate("(()=>{const E=window.__criador.E();return {sub:E.sub,estilo:E.estilo,lig:E.anim.ligado,it:E.anim.itens.map(i=>i.id),ov:E.anim.over}})()")
        ok(st["sub"] == "infantil" and st["estilo"] == "bebe" and st["lig"] and "ursinho" in st["it"] and "estrelas" in st["ov"], f"modelo Ursinho aplicado {st}")
        ok(pg.locator("#animCorpo").is_visible(), "painel do convite animado aberto")
        ok(pg.locator("#animItens .cr-it").count() == 82, "82 objetos (37 realistas + 45 desenhados)")
        ok(pg.locator("#animOver .cr-it").count() == 23, "23 efeitos de tela")
        # a prévia se mexe
        a1 = pg.evaluate("document.getElementById('cv').toDataURL().length"); pg.wait_for_timeout(450)
        a2 = pg.evaluate("document.getElementById('cv').toDataURL().length")
        ok(a1 != a2, "prévia animada muda com o tempo")
        # todos os bichinhos e efeitos desenham sem erro
        r = pg.evaluate("""(()=>{const A=BWConviteAnim,c=document.createElement('canvas');c.width=c.height=300;const x=c.getContext('2d');let e=[];
          for(const id in A.ITENS)for(const t of [0,1.1,3.3,7.9]){try{x.save();A.desenharItem(x,{id,x:.5,y:.5,s:.5},300,300,t);x.restore()}catch(err){e.push(id+':'+err)}}
          for(const id in A.EFEITOS)for(const t of [0,2.2,7.7]){try{x.save();A.EFEITOS[id].f(x,300,300,t,['#000','#111','#ffd23f']);x.restore()}catch(err){e.push(id+':'+err)}}return e})()""")
        ok(r == [], f"todos desenham sem erro {r[:3]}")
        # pôr um bichinho e arrastar na prévia
        pg.locator("[data-ait=borboleta]").scroll_into_view_if_needed(); pg.locator("[data-ait=borboleta]").click(); pg.wait_for_timeout(300)
        ok(pg.locator("#animSel").is_visible(), "barra do item escolhido aparece")
        it = pg.evaluate("(()=>{const a=window.__criador.anim();return a.itens[a.itens.length-1]})()")
        cv = pg.locator("#cv"); cv.scroll_into_view_if_needed(); bb = cv.bounding_box()
        sx, sy = bb["x"] + it["x"] * bb["width"], bb["y"] + it["y"] * bb["height"]
        pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.move(bb["x"] + 0.5 * bb["width"], bb["y"] + 0.55 * bb["height"], steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
        it2 = pg.evaluate("(()=>{const a=window.__criador.anim();return a.itens[a.itens.length-1]})()")
        ok(abs(it2["x"] - 0.5) < 0.04 and abs(it2["y"] - 0.55) < 0.04, f"arrastou a borboleta para o meio ({it2['x']:.2f},{it2['y']:.2f})")
        pg.locator("[data-asel=maior]").click(); it3 = pg.evaluate("(()=>{const a=window.__criador.anim();return a.itens[a.itens.length-1].s})()")
        ok(it3 > it2["s"], "＋ MAIOR aumenta")
        pg.locator("[data-asel=tirar]").click(); nI = pg.evaluate("window.__criador.anim().itens.length")
        ok(nI == len(st["it"]), "✕ TIRAR remove")
        # texto entra animado: em t pequeno o texto ainda não está todo
        pg.locator("[data-k=animtx][data-v=digitar]").click()
        cheio = pg.evaluate("(()=>{const c=window.__criador.render(270,480);return c.toDataURL()})()")
        comeco = pg.evaluate("(()=>{const c=window.__criador.render(270,480,0.1);return c.toDataURL()})()")
        fim = pg.evaluate("(()=>{const c=window.__criador.render(270,480,7.5);return c.toDataURL()})()")
        ok(cheio != comeco, "DIGITANDO: no começo o texto ainda não apareceu")
        # PNG parado continua funcionando
        with pg.expect_download() as d: pg.locator("#btnPng").click()
        dl = d.value; dl.save_as(f"{TMP}/c{W}.png"); ok(os.path.getsize(f"{TMP}/c{W}.png") > 50000, "PNG do convite baixado")
        # VÍDEO (curto e rápido no teste)
        pg.locator("[data-k=animdur][data-v='6']").click(); pg.locator("[data-k=animqual][data-v='1280']").click()
        pg.locator("#animGerar").scroll_into_view_if_needed(); pg.locator("#animGerar").click()
        pg.wait_for_selector("#animPronto:not([hidden])", timeout=240000)
        txt = pg.locator("#animProgTxt").inner_text(); ok("pronto" in txt.lower(), "vídeo pronto: " + txt)
        mp4 = pg.evaluate("""(async()=>{const b=await (await fetch(document.getElementById('animBaixar').href)).arrayBuffer();return Array.from(new Uint8Array(b))})()""")
        open(f"{TMP}/v{W}.mp4", "wb").write(bytes(mp4))
        pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", f"{TMP}/v{W}.mp4"], capture_output=True, text=True).stdout or "{}")
        vs = [s for s in pr.get("streams", []) if s.get("codec_type") == "video"]
        ok(vs and vs[0]["codec_name"] == "h264" and abs(float(pr["format"]["duration"]) - 6) < 0.3, f"MP4 H.264 de 6 s ({vs[0]['width'] if vs else 0}×{vs[0]['height'] if vs else 0})")
        q = []
        for tt in ("0.4", "3.0"):
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", tt, "-i", f"{TMP}/v{W}.mp4", "-frames:v", "1", f"{TMP}/q{tt}.png"])
            q.append(hashlib.md5(open(f"{TMP}/q{tt}.png", "rb").read()).hexdigest())
        ok(q[0] != q[1], "quadros diferentes (animado de verdade)")
        ok(pg.locator("[data-bwcr-bt]").count() >= 1, "botão ➜ LINHA DO TEMPO ao lado do vídeo")
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(sw <= 0, f"sem estouro horizontal ({sw})")
        # recarregar mantém a animação escolhida
        pg.wait_for_timeout(500); pg.reload(); pg.wait_for_timeout(1200)
        ok(pg.evaluate("window.__criador.anim().ligado && window.__criador.anim().itens.length>0"), "recarregar mantém a animação")
        ok(not erros, f"sem erro de JS {erros[:2]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not FALHAS else f"❌ {len(FALHAS)} falha(s): {FALHAS}"))
