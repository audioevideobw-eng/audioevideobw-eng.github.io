#!/usr/bin/env python3
"""Teste do FOTO → 3D e da EXPORTAÇÃO PARA O BLENDER (ESTÚDIO 3D, 20/11):
planos PNG com alfa (frente + lado) → malha escavada pelas silhuetas no aparelho → prévia → GLB e OBJ+MTL.
Confere o ARQUIVO: o .glb é lido de volta pelo próprio motor (contagem de vértices, altura em metros, pés no chão)
e o .obj/.mtl pelo texto. 1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_3d_foto.py"""
import os, re, zipfile, http.server, socketserver, tempfile, threading
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8866; TMP = "/tmp/teste_3d"
if not os.path.exists(f"{TMP}/av-frente.png"):
    from PIL import Image, ImageDraw
    os.makedirs(TMP, exist_ok=True); W, H = 600, 1200
    def pessoa(frente=True):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        pele = (232, 180, 140, 255); camisa = (43, 108, 176, 255); calca = (38, 48, 63, 255); sapato = (21, 24, 31, 255); cabelo = (60, 42, 34, 255)
        cx = W // 2; lx = 120 if frente else 74
        d.ellipse((cx - 78, 70, cx + 78, 240), fill=pele); d.chord((cx - 80, 60, cx + 80, 200), 180, 360, fill=cabelo)
        if not frente: d.polygon([(cx + 70, 150), (cx + 96, 168), (cx + 70, 180)], fill=pele)
        d.rectangle((cx - 34, 230, cx + 34, 290), fill=pele); d.rounded_rectangle((cx - lx, 275, cx + lx, 640), 44, fill=camisa)
        for s in ((-1, 1) if frente else (1,)):
            d.rounded_rectangle((cx + s * lx - 46, 290, cx + s * lx + 46, 620), 40, fill=camisa); d.ellipse((cx + s * lx - 40, 600, cx + s * lx + 40, 680), fill=pele)
        for s in ((-1, 1) if frente else (0,)):
            px = cx + s * 56 if frente else cx
            d.rounded_rectangle((px - 56, 620, px + 56, 1060), 40, fill=calca)
            d.rounded_rectangle((px - 60, 1040, px + (92 if not frente else 60), 1115), 24, fill=sapato)
        return im
    pessoa(True).save(f"{TMP}/av-frente.png"); pessoa(False).save(f"{TMP}/av-lado.png")

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
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")   # letra do modo de aparência
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SAIDA = tempfile.mkdtemp(prefix="teste-3d-foto-")

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block",
                                          has_touch=largura < 500, accept_downloads=True)
        ctx.route("**/*", rota); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        cel = largura < 500
        def aba(a):
            if cel: pg.click(f'#d3AbasCel [data-aba="{a}"]'); pg.wait_for_timeout(150)
        pg.goto(BASE + "3d.html"); pg.wait_for_function("window.BW3DEditor && window.BW3DFoto", timeout=15000); pg.wait_for_timeout(400)
        ok(pg.locator("#d3Modos .d3-modo").count() == 5, "os 5 modos aparecem (com FOTO → 3D)")
        pg.click('#d3Modos [data-m="foto"]'); pg.wait_for_timeout(300); aba("objeto")
        ok(pg.locator("#d3Fr").count() == 1 and pg.locator("#d3La").count() == 1 and pg.locator("#d3Co").count() == 1, "pede os planos frente, lado e costas")
        # manda os dois planos
        pg.evaluate("document.getElementById('d3Img').setAttribute('data-alvo','frente')")
        pg.set_input_files("#d3Img", f"{TMP}/av-frente.png"); pg.wait_for_timeout(700)
        pg.evaluate("document.getElementById('d3Img').setAttribute('data-alvo','lado')")
        pg.set_input_files("#d3Img", f"{TMP}/av-lado.png"); pg.wait_for_timeout(700)
        ok(pg.evaluate("(()=>{const P=BW3DEditor.projeto();return !!P.foto.frenteId && !!P.foto.ladoId})()"), "guardou os dois planos no aparelho")
        pg.fill('[data-k="foto.alturaM"]', "1.78"); pg.dispatch_event('[data-k="foto.alturaM"]', "input")
        pg.select_option('[data-k="foto.res"]', "128"); pg.wait_for_timeout(250)
        pg.click("#d3Montar")
        pg.wait_for_function("BW3DEditor.malha() && BW3DEditor.malha().info", timeout=120000)
        info = pg.evaluate("BW3DEditor.malha().info")
        ok(info["faces"] > 3000 and info["vertices"] > 3000, f"malha escavada ({info['faces']} polígonos, {info['vertices']} vértices em {info['ms']/1000:.1f} s)")
        ok(info["vistas"] == ["frente", "lado"], f"usou as duas vistas ({info['vistas']})")
        cx = pg.evaluate("""(()=>{const m=BW3DEditor.malha();let mi=[9,9,9],ma=[-9,-9,-9];
          m.verts.forEach(v=>{for(let k=0;k<3;k++){if(v[k]<mi[k])mi[k]=v[k];if(v[k]>ma[k])ma[k]=v[k];}});
          return {alt: ma[1]-mi[1], base: mi[1], larg: ma[0]-mi[0], prof: ma[2]-mi[2]};})()""")
        ok(abs(cx["alt"] - 1.78) < 0.06, f"altura de verdade: {cx['alt']:.2f} m (pedido 1,78)")
        ok(abs(cx["base"]) < 0.02, f"pés no chão (y mínimo = {cx['base']:.3f})")
        ok(0.3 < cx["larg"] < 1.3 and 0.15 < cx["prof"] < 0.9, f"proporção de gente: {cx['larg']:.2f} m de largura × {cx['prof']:.2f} m de profundidade")
        cores = pg.evaluate("""(()=>{const m=BW3DEditor.malha(), c={}; m.vcor.forEach(x=>c[x]=(c[x]||0)+1);
          return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,5).map(e=>e[0]);})()""")
        ok(len(set(cores)) >= 3, f"cores vindas das suas imagens ({cores[:4]})")
        pix = pg.evaluate("""(()=>{const c=document.getElementById('d3Cv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let n=0,azul=0; for(let i=0;i<d.length;i+=4){ if(d[i+3]>10){n++; if(d[i+2]>d[i]+20) azul++;} } return {n:n,azul:azul};})()""")
        ok(pix["n"] > 1000 and pix["azul"] > 200, f"aparece na prévia com a cor da camisa ({pix['azul']} pixels azuis)")

        # ---------- exportar GLB ----------
        aba("exportar")
        pg.evaluate("""(()=>{const t=document.querySelector('[data-seta="d3exp3d"]'); if(t&&t.classList.contains('fechada'))t.click();})()""")
        with pg.expect_download(timeout=60000) as dl:
            pg.click("#d3Glb")
        glb = os.path.join(SAIDA, f"av-{largura}.glb"); dl.value.save_as(glb)
        tam = os.path.getsize(glb)
        ok(tam > 50000, f"GLB salvo ({tam/1048576:.2f} MB)")
        lido = pg.evaluate("""async (nada) => { const r = await fetch(window.__glbURL || ''); return null; }""") if False else None
        # lê o GLB de volta com o próprio motor (prova que é glTF válido)
        dados = list(open(glb, "rb").read())
        volta = pg.evaluate("""(bytes) => { const b = new Uint8Array(bytes).buffer; const m = BW3D.lerGLB(b);
            let mi=[9,9,9],ma=[-9,-9,-9]; m.verts.forEach(v=>{for(let k=0;k<3;k++){if(v[k]<mi[k])mi[k]=v[k];if(v[k]>ma[k])ma[k]=v[k];}});
            return {v: m.verts.length, f: m.faces.length, alt: ma[1]-mi[1], base: mi[1]}; }""", dados)
        ok(volta["f"] > 3000, f"o .glb abre de volta: {volta['v']} vértices, {volta['f']} triângulos")
        ok(abs(volta["alt"] - 1.78) < 0.06 and abs(volta["base"]) < 0.02, f"o .glb está em metros e de pé ({volta['alt']:.2f} m, base {volta['base']:.3f})")

        # ---------- exportar OBJ + MTL ----------
        with pg.expect_download(timeout=60000) as dl2:
            pg.click("#d3Obj")
        zp = os.path.join(SAIDA, f"av-{largura}.zip"); dl2.value.save_as(zp)
        with zipfile.ZipFile(zp) as z:
            nomes = z.namelist()
            obj = z.read([n for n in nomes if n.endswith(".obj")][0]).decode("utf-8", "ignore")
        vs = len(re.findall(r"^v ", obj, re.M)); fs = len(re.findall(r"^f ", obj, re.M)); vns = len(re.findall(r"^vn ", obj, re.M))
        ok(vs > 3000 and fs > 3000 and vns == vs, f"OBJ com {vs} vértices, {vns} normais e {fs} faces")
        comCor = sum(1 for l in obj.split("\n") if l.startswith("v ") and len(l.split()) == 7)
        ok(comCor > 3000, f"OBJ leva a cor em cada vértice ({comCor} vértices com cor)")
        ok(not erros, f"0 erros de JavaScript ({erros[:2]})")
        ok(not FORA, f"nada sai do aparelho ({FORA[:3]})")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ FOTO → 3D: 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
print("arquivos do teste em", SAIDA)
raise SystemExit(1 if falhas else 0)
