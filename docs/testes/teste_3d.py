#!/usr/bin/env python3
"""Teste local do ESTÚDIO 3D (20/11): os 4 modos (MODELO 3D, LOGO 3D, MAQUETE DE PALCO E LED, IA 3D),
abrir GLB/OBJ/STL de verdade (lidos pelo motor próprio, sem biblioteca de fora), render conferido no PIXEL,
logo em relevo, ficha do telão (7×4 painéis P3.9 → 896×512 px) com o link que leva o tamanho ao Estúdio de motion e às Telas,
PNG com fundo transparente, GERAR VÍDEO de verdade no tamanho do telão (MP4 conferido com ffprobe), TELA FIXA e
nada sai do aparelho. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_3d.py   (arquivos de teste em /tmp/teste_3d — o script cria se faltar)"""
import json, os, re, struct, subprocess, http.server, socketserver, tempfile, threading
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8864; TMP = "/tmp/teste_3d"
def criar_arquivos():
    os.makedirs(TMP, exist_ok=True)
    from PIL import Image, ImageDraw
    V = [(-.5, 0, -.5), (.5, 0, -.5), (.5, 1, -.5), (-.5, 1, -.5), (-.5, 0, .5), (.5, 0, .5), (.5, 1, .5), (-.5, 1, .5)]
    F = [(1, 4, 3, 2), (5, 6, 7, 8), (1, 2, 6, 5), (4, 8, 7, 3), (2, 3, 7, 6), (1, 5, 8, 4)]
    open(f"{TMP}/cubo.obj", "w").write("\n".join(["# cubo de teste"] + ["v %g %g %g" % v for v in V] + ["f " + " ".join(map(str, f)) for f in F]) + "\n")
    tris = [((0, 0, 1), (-1, 0, 0), (1, 0, 0), (1, 2, 0)), ((0, 0, 1), (-1, 0, 0), (1, 2, 0), (-1, 2, 0))]
    b = b"BW teste".ljust(80, b"\0") + struct.pack("<I", len(tris))
    for n, a, c, d in tris: b += struct.pack("<12fH", *n, *a, *c, *d, 0)
    open(f"{TMP}/placa.stl", "wb").write(b)
    pos = [(-1, 0, -1), (1, 0, -1), (1, 0, 1), (-1, 0, 1), (0, 1.8, 0)]
    idx = [0, 1, 2, 0, 2, 3, 0, 4, 1, 1, 4, 2, 2, 4, 3, 3, 4, 0]
    bufP = b"".join(struct.pack("<3f", *p) for p in pos); bufI = b"".join(struct.pack("<H", i) for i in idx)
    pad = lambda x, c=b"\0": x + c * ((4 - len(x) % 4) % 4)
    bin_ = pad(bufP) + pad(bufI)
    js = {"asset": {"version": "2.0"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
          "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1, "material": 0, "mode": 4}]}],
          "materials": [{"pbrMetallicRoughness": {"baseColorFactor": [0.9, 0.2, 0.1, 1]}}],
          "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(pos), "type": "VEC3", "min": [-1, 0, -1], "max": [1, 1.8, 1]},
                        {"bufferView": 1, "componentType": 5123, "count": len(idx), "type": "SCALAR"}],
          "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(bufP)}, {"buffer": 0, "byteOffset": len(pad(bufP)), "byteLength": len(bufI)}],
          "buffers": [{"byteLength": len(bin_)}]}
    jb = pad(json.dumps(js).encode(), b" ")
    glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bin_)) + struct.pack("<II", len(jb), 0x4E4F534A) + jb + struct.pack("<II", len(bin_), 0x004E4942) + bin_
    open(f"{TMP}/piramide.glb", "wb").write(glb)
    im = Image.new("RGBA", (800, 400), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle((60, 90, 740, 310), 40, fill=(255, 255, 255, 255)); d.rounded_rectangle((140, 150, 340, 250), 20, fill=(0, 0, 0, 0))
    im.save(f"{TMP}/logo.png"); Image.new("RGB", (640, 360), (255, 80, 0)).save(f"{TMP}/arte.png")
if not os.path.exists(f"{TMP}/piramide.glb"): criar_arquivos()

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
SAIDA = tempfile.mkdtemp(prefix="teste-3d-")
PIX = """(() => { const c = document.getElementById('d3Cv'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
  let n = 0, cores = {}; for (let i = 0; i < d.length; i += 4 * 97) { if (d[i+3] > 10) { n++; const k = [d[i]>>5, d[i+1]>>5, d[i+2]>>5].join(','); cores[k] = (cores[k]||0)+1; } }
  return { pintados: n, cores: Object.entries(cores).sort((a,b)=>b[1]-a[1]).slice(0,4) }; })()"""

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500)
        ctx.route("**/*", rota); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        cel = largura < 500
        def aba(a):
            if cel: pg.click(f'#d3AbasCel [data-aba="{a}"]'); pg.wait_for_timeout(150)
        def parar():
            pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.giro.liga=false;BW3DEditor.ver(0);})()"); pg.wait_for_timeout(180)
        def abrir(seta):
            pg.evaluate(f"""(()=>{{ const t=document.querySelector('[data-seta="{seta}"]'); if (t && t.classList.contains('fechada')) t.click(); }})()""")
            pg.wait_for_timeout(120)
        pg.goto(BASE + "3d.html"); pg.wait_for_function("window.BW3DEditor && BW3DEditor.projeto()", timeout=15000); pg.wait_for_timeout(500)
        ok(pg.evaluate(SEM) <= 0, "abre sem estouro")
        ok(pg.locator("#d3Modos .d3-modo[data-m]").count() == 6 and pg.locator("#d3Modos a.d3-modo[href*=album3d]").count() == 1, "os 6 modos aparecem (plano, modelo, logo, palco, foto, IA)")
        pg.click('#d3Modos [data-m="modelo"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label') || b.title)).length") == 0, "todo botão tem nome")
        ok(pg.evaluate("document.querySelector('#d3Cv').width > 200"), "a prévia 3D tem tamanho")
        parar(); r = pg.evaluate(PIX)
        ok(r["pintados"] > 20, f"desenha a forma pronta na prévia ({r['pintados']} amostras pintadas)")

        # ---------- MODELO 3D: GLB, OBJ e STL ----------
        aba("objeto")
        pg.set_input_files("#d3Arq", f"{TMP}/piramide.glb"); pg.wait_for_timeout(900)
        a = pg.evaluate("(()=>{const A=BW3DEditor.arquivos(),P=BW3DEditor.projeto(),x=A[P.modelo.arqId];return x?{n:x.nome,f:x.faces.length,v:x.verts.length}:null})()")
        ok(a and a["f"] == 6 and a["v"] == 5, f"abre .glb com o motor próprio ({a})")
        parar(); r = pg.evaluate(PIX)
        vermelho = [c for c in r["cores"] if int(c[0].split(",")[0]) > int(c[0].split(",")[1]) + 1 and int(c[0].split(",")[0]) > 2]
        ok(r["pintados"] > 20 and len(vermelho) > 0, f"usa a cor do material do .glb (vermelho) — {r['cores'][:3]}")
        pg.set_input_files("#d3Arq", f"{TMP}/cubo.obj"); pg.wait_for_timeout(700)
        a = pg.evaluate("(()=>{const A=BW3DEditor.arquivos(),P=BW3DEditor.projeto();const x=A[P.modelo.arqId];return {f:x.faces.length,alt:x.medida.tam[1]}})()")
        ok(a["f"] == 12 and abs(a["alt"] - 1.6) < 0.01, f"abre .obj e põe na altura pedida ({a['f']} triângulos, {a['alt']:.2f} m)")
        pg.set_input_files("#d3Arq", f"{TMP}/placa.stl"); pg.wait_for_timeout(700)
        a = pg.evaluate("(()=>{const A=BW3DEditor.arquivos(),P=BW3DEditor.projeto();return A[P.modelo.arqId].faces.length})()")
        ok(a == 2, f"abre .stl binário ({a} triângulos)")
        pg.fill('[data-k="modelo.alturaM"]', "3"); pg.dispatch_event('[data-k="modelo.alturaM"]', "input"); pg.wait_for_timeout(400)
        a = pg.evaluate("(()=>{const A=BW3DEditor.arquivos(),P=BW3DEditor.projeto();return A[P.modelo.arqId].medida.tam[1]})()")
        ok(abs(a - 3) < 0.02, f"mudar a altura em metros refaz o modelo ({a:.2f} m)")
        erro_fmt = pg.evaluate("""(async()=>{ try { BW3D.lerArquivo('bicho.fbx', new ArrayBuffer(8)); return 'passou'; } catch(e){ return e.message; } })()""")
        ok("FBX" in erro_fmt, f"formato que não dá avisa direito ({erro_fmt[:46]})")

        # ---------- LOGO 3D ----------
        pg.click('#d3Modos [data-m="logo"]'); pg.wait_for_timeout(300); aba("objeto")
        pg.set_input_files("#d3Img", f"{TMP}/logo.png"); pg.wait_for_timeout(900)
        parar(); r = pg.evaluate(PIX)
        dourado = [c for c in r["cores"] if int(c[0].split(",")[0]) >= int(c[0].split(",")[1]) >= int(c[0].split(",")[2]) and int(c[0].split(",")[0]) > 2]
        ok(r["pintados"] > 20 and len(dourado) > 0, f"logo em relevo dourada na tela ({r['cores'][:3]})")
        pg.select_option('[data-k="logo.acabamento"]', "cor"); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.logo.cor='#2fd08a';P.cam.yaw=0.9;P.giro.liga=false;BW3DEditor.ver(0);})()"); pg.wait_for_timeout(300)
        r = pg.evaluate(PIX)
        verde = [c for c in r["cores"] if int(c[0].split(",")[1]) > int(c[0].split(",")[0]) + 1]
        ok(len(verde) > 0, f"troca o acabamento para cor sólida ({r['cores'][:3]})")

        # ---------- a TRASEIRA da logo (20/11: "ficava lisa") ----------
        TONS = """(() => { const c=document.getElementById('d3Cv'), x=c.getContext('2d'),
          d=x.getImageData(0,0,c.width,c.height).data; const s=new Set(); let n=0;
          for (let i=0;i<d.length;i+=4) if (d[i+3]>10) { n++; s.add((d[i]>>3)+','+(d[i+1]>>3)+','+(d[i+2]>>3)); }
          return { pintados:n, tons:s.size }; })()"""
        pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.logo.acabamento='dourado';P.logo.doisLados=true;"
                    "P.cam.yaw=Math.PI;P.giro.liga=false;BW3DEditor.ver(0);})()"); pg.wait_for_timeout(400)
        atras_dois = pg.evaluate(TONS)
        pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.logo.doisLados=false;BW3DEditor.ver(0);})()"); pg.wait_for_timeout(400)
        atras_liso = pg.evaluate(TONS)
        ok(atras_dois["pintados"] > 500, f"de trás a logo continua desenhada na tela ({atras_dois['pintados']} px)")
        ok(atras_dois["tons"] > atras_liso["tons"] + 3,
           f"ARTE DOS DOIS LADOS dá relevo atrás ({atras_dois['tons']} tons) e desligado fica liso ({atras_liso['tons']})")
        pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.logo.doisLados=true;P.cam.yaw=0.9;BW3DEditor.ver(0);})()")

        # ---------- MOVIMENTOS do vídeo ----------
        def cam_em(mov, t):
            return pg.evaluate("([m,t])=>{const P=BW3DEditor.projeto();P.giro.liga=(m!=='parado');P.giro.mov=m;P.giro.seg=8;"
                               "const c=BW3DEditor.montar(t,1080,1920).cam;return [c.yaw,c.pitch,c.dist];}", [mov, t])
        a0, a1 = cam_em("vaivem", 0), cam_em("vaivem", 8)
        ok(abs(a0[0] - a1[0]) < 0.01, "VAI E VOLTA fecha o loop: termina onde começou")
        meio = cam_em("vaivem", 2)
        ok(abs(meio[0] - a0[0]) > 0.3, "VAI E VOLTA se mexe de verdade no meio do caminho")
        g0, gm = cam_em("giro", 0), cam_em("giro", 4)
        ok(abs(abs(gm[0] - g0[0]) - 3.1416) < 0.05, "GIRO COMPLETO está na metade da volta na metade do tempo")
        p0, pm = cam_em("parado", 0), cam_em("parado", 4)
        ok(p0 == pm, "PARADO não mexe a câmera")
        c0, c1 = cam_em("chegando", 0), cam_em("chegando", 8)
        ok(c0[2] > c1[2] * 1.3, f"CHEGANDO começa longe e termina perto ({c0[2]:.1f} → {c1[2]:.1f})")
        r0, r1 = cam_em("revelar", 0), cam_em("revelar", 8)
        ok(r0[1] > r1[1] + 0.3, "REVELAR começa de cima e desce")
        pg.evaluate("(()=>{const P=BW3DEditor.projeto();P.giro.mov='giro';BW3DEditor.ver(0);})()")

        # ---------- MAQUETE DE PALCO E LED ----------
        pg.click('#d3Modos [data-m="palco"]'); pg.wait_for_timeout(350); aba("objeto")
        pg.fill('[data-k="palco.cols"]', "7"); pg.dispatch_event('[data-k="palco.cols"]', "input")
        pg.fill('[data-k="palco.rows"]', "4"); pg.dispatch_event('[data-k="palco.rows"]', "input")
        pg.select_option('[data-k="palco.pitch"]', "3.906"); pg.wait_for_timeout(350)
        f = pg.evaluate("BW3DEditor.ficha()")
        ok(f["paineis"] == 28 and f["px"] == [896, 512], f"ficha do telão: 7×4 painéis P3.9 → {f['px'][0]}×{f['px'][1]} px, {f['paineis']} painéis")
        ok(abs(f["L"] - 3.5) < 0.01 and abs(f["A"] - 2) < 0.01, f"medida do painel: {f['L']} × {f['A']} m")
        txt = pg.inner_text("#d3Ficha")
        ok("896 × 512" in txt, f"a resolução aparece na tela ({txt.splitlines()[1][:40] if len(txt.splitlines())>1 else txt[:40]})")
        hrefs = pg.evaluate("[...document.querySelectorAll('#d3Ficha a')].map(a=>a.getAttribute('href'))")
        ok(any("motion.html?w=896&h=512" in h for h in hrefs) and any("telas.html?w=896&h=512" in h for h in hrefs), f"leva o tamanho do telão para as outras ferramentas ({hrefs})")
        med = pg.evaluate("BW3DEditor.montar(0, 900, 600).cena.medidas.map(m=>m.txt)")
        ok(len(med) == 3 and any("3,5 m" in m for m in med), f"medidas em metros na maquete ({med})")
        objs = pg.evaluate("BW3DEditor.montar(0, 900, 600).cena.objs.map(o=>o.nome||o.forma||o.tipo)")
        ok(sum(1 for o in objs if "Pessoa" in o) == 4 and "Painel de LED" in objs and "Treliça" in objs and "Câmera" in objs, f"palco montado: {objs}")
        pg.set_input_files("#d3Img", f"{TMP}/arte.png"); pg.wait_for_timeout(900)
        ok(pg.evaluate("!!BW3DEditor.montar(0,900,600).cena.objs.filter(o=>o.conteudo)[0]"), "a arte entra no painel de LED")
        parar()
        laranja = pg.evaluate("""(()=>{const c=document.getElementById('d3Cv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
          let n=0; for(let i=0;i<d.length;i+=4) if(d[i]>180&&d[i+1]<140&&d[i+2]<90) n++; return n;})()""")
        ok(laranja > 300, f"a arte aparece acesa no painel ({laranja} pixels da arte na tela)")

        # ---------- fundo transparente e PNG ----------
        aba("cena")
        pg.select_option('[data-k="fundo.tipo"]', "nenhum"); pg.wait_for_timeout(350); parar()
        alfa = pg.evaluate("(()=>{const c=document.getElementById('d3Cv'),d=c.getContext('2d').getImageData(2,2,1,1).data;return d[3];})()")
        ok(alfa == 0, f"fundo transparente de verdade (alfa do canto = {alfa})")
        pg.select_option('[data-k="fundo.tipo"]', "verde"); pg.wait_for_timeout(300); parar()
        verdechroma = pg.evaluate("(()=>{const c=document.getElementById('d3Cv'),d=c.getContext('2d').getImageData(2,2,1,1).data;return [d[0],d[1],d[2]];})()")
        ok(verdechroma[1] > 120 and verdechroma[0] < 60, f"fundo verde de chroma key ({verdechroma})")

        # ---------- TELA FIXA ----------
        if cel:
            pos = pg.evaluate("getComputedStyle(document.querySelector('.d3-palco')).position")
            ok(pos == "sticky", f"no celular a prévia fica presa no topo ({pos})")
            ok(pg.evaluate("parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) > 100"), "a página reserva a altura da prévia na rolagem")
        else:
            ok(pg.evaluate("document.querySelector('.wrap').classList.contains('bwf-fixo')"), "no computador a tela fica fixa e os painéis rolam")
            ok(pg.evaluate("document.querySelector('#d3Painel').scrollHeight >= document.querySelector('#d3Painel').clientHeight"), "o painel rola por dentro")
            ok(pg.locator("#d3Ferr .bwf-bt").count() >= 3, "barra de ferramentas (girar, mover, zoom)")

        ok(pg.evaluate(SEM) <= 0, "sem estouro depois de mexer em tudo")

        # ---------- GERAR VÍDEO (só no computador, para o teste não demorar) ----------
        if not cel:
            pg.select_option('[data-k="fundo.tipo"]', "estudio"); pg.wait_for_timeout(200)
            aba("exportar"); pg.click("#d3Exportar"); pg.wait_for_timeout(400)
            ok(pg.locator("#d3Fmt option[value='telao']").count() == 1, "na maquete dá para exportar no tamanho do telão")
            pg.select_option("#d3Fmt", "telao"); pg.wait_for_timeout(300)
            pg.fill("#d3Dur", "2"); pg.dispatch_event("#d3Dur", "change")
            qual = pg.inner_text("#d3Qual")
            ok("896×512" in qual.replace(" ", ""), f"qualidade no tamanho real do telão ({qual.strip()[:40]})")
            pg.click("#d3Gerar")
            pg.wait_for_function("document.getElementById('d3Pronto') && !document.getElementById('d3Pronto').hidden", timeout=120000)
            dados = pg.evaluate("""(async () => { const r = await fetch(document.getElementById('d3Baixar').href); const b = await r.arrayBuffer();
              return Array.from(new Uint8Array(b)); })()""")
            arq = os.path.join(SAIDA, "telao.mp4"); open(arq, "wb").write(bytes(dados))
            info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name,width,height,nb_read_packets", "-count_packets", "-select_streams", "v", "-of", "json", arq], capture_output=True, text=True).stdout
            st = (json.loads(info).get("streams") or [{}])[0]
            ok(st.get("codec_name") == "h264" and st.get("width") == 896 and st.get("height") == 512, f"MP4 do telão: {st.get('codec_name')} {st.get('width')}×{st.get('height')}")
            ok(int(st.get("nb_read_packets", 0)) >= 55, f"vídeo com os quadros do giro ({st.get('nb_read_packets')} quadros em 2 s)")
            cores = subprocess.run(["ffmpeg", "-v", "error", "-i", arq, "-vf", "scale=1:1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
            ok(len(cores) >= 60 and len(set(cores)) > 3, "o vídeo não é um quadro parado (a imagem muda com o giro)")
            pg.click("#d3Fechar")

        ok(not erros, f"0 erros de JavaScript ({erros[:2]})")
        ok(not FORA, f"nada sai do aparelho ({FORA[:3]})")
        ctx.close()

    # ---------- o tamanho do telão chega nas outras ferramentas ----------
    print("\n=== o tamanho do telão nas outras ferramentas ===")
    for pagina, hook in (("motion.html", "BWMotionEditor"), ("telas.html", "BWTelasEditor")):
        ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + pagina + "?w=896&h=512")
        try:
            pg.wait_for_function(f"window.{hook} && {hook}.projeto && {hook}.projeto()", timeout=20000); pg.wait_for_timeout(900)
            pr = pg.evaluate(f"(()=>{{const P={hook}.projeto();return [P.formato,P.w,P.h];}})()")
            ok(pr == ["livre", 896, 512], f"{pagina} abre no tamanho do telão ({pr})")
        except Exception as e:
            ok(False, f"{pagina} não abriu no tamanho do telão ({str(e)[:60]})")
        ok(not erros, f"{pagina}: 0 erros de JavaScript ({erros[:1]})")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ Estúdio 3D: 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
print("vídeos do teste em", SAIDA)
raise SystemExit(1 if falhas else 0)
