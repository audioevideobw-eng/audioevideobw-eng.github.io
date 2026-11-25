#!/usr/bin/env python3
"""Teste local (25/11/2026): PRESS KIT (presskit.html + assets/presskit.js) com as bibliotecas DE VERDADE
(pdfMake 0.2.20 gera o PDF, pdf.js 4.10.38 desenha a prévia, docx 9.8.1 gera o Word, JSZip do próprio site).
Confere: galeria com as 6 capas, abrir um modelo (exemplo completo), editar e ver a prévia mudar, ligar/desligar e reordenar seções,
foto da capa, trocar de modelo sem perder o texto, PDF (pdfinfo/pdffonts/pdftotext), Word (document.xml), pacote .zip, IA simulada com ↺,
dados na conta sem imagens, recarregar, duplicar, excluir, 1280 e 390 px (abas EDITAR/PRÉVIA), nenhum estouro, nada saindo para fora.
Bibliotecas: npm i pdfmake@0.2.20 pdfjs-dist@4.10.38 em /tmp/pm (ou PK_LIBS=pasta com node_modules).
Uso (na raiz):  python3 docs/testes/teste_presskit.py"""
import http.server, io, json, os, socketserver, subprocess, sys, tempfile, threading, zipfile
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8841
PM = os.environ.get("PK_LIBS", "/tmp/pm") + "/node_modules/"
NM = "/opt/npm-tools/node_modules/"
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
const ses={access_token:'tok',user:{id:'u-teste',email:'teste@ex.com'}};
return {auth:{getSession:async()=>({data:{session:window.__semLogin?null:ses}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
IA_RESP = {"slogan": "Humorista e mestre de cerimônias", "curto": "Levo bom humor para eventos de empresas.",
           "longo": "Primeiro parágrafo escrito pela IA.\n\nSegundo parágrafo escrito pela IA.",
           "experiencia": [{"grupo": "Eventos", "titulo": "Convenção Teste Montada", "papel": "Apresentador", "onde": "São Paulo", "ano": "2025"}],
           "habilidades": ["Improviso", "Locução"]}
CORRIGIDO = "Sou humorista há dez anos."
FALA = "eu sou humorista né tipo assim há dez anos"
SR_FALSO = """window.SpeechRecognition = function(){ const r=this; r.start=function(){ setTimeout(()=>{ r.onresult && r.onresult({resultIndex:0, results:[Object.assign([{transcript:%s}],{isFinal:true})]}); setTimeout(()=>{ r.onend && r.onend(); }, 60); }, 80); }; r.stop=function(){ r.onend && r.onend(); }; };""" % json.dumps(FALA)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
FORA = []
IMG_PEDIDOS = []
def _azul():
    from PIL import Image
    b = io.BytesIO(); Image.new("RGB", (512, 640), (20, 60, 230)).save(b, "JPEG"); import base64; return base64.b64encode(b.getvalue()).decode()
AZUL_B64 = _azul()
IA_PEDIDOS = []
CORS = {"Access-Control-Allow-Origin": "*"}
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u: return r.fulfill(path=PM + "pdfmake/build/pdfmake.min.js", content_type="application/javascript")
    if "vfs_fonts" in u: return r.fulfill(path=PM + "pdfmake/build/vfs_fonts.js", content_type="application/javascript")
    if "pdfjs-dist@4.10.38/build/pdf.min.mjs" in u: return r.fulfill(path=PM + "pdfjs-dist/build/pdf.min.mjs", content_type="text/javascript", headers=CORS)
    if "pdfjs-dist@4.10.38/build/pdf.worker.min.mjs" in u: return r.fulfill(path=PM + "pdfjs-dist/build/pdf.worker.min.mjs", content_type="text/javascript", headers=CORS)
    if "docx@" in u: return r.fulfill(path=NM + "docx/dist/index.iife.js", content_type="application/javascript")
    if "qrcode-generator@1.4.4" in u: return r.fulfill(path=PM + "qrcode-generator/qrcode.js", content_type="application/javascript")
    if "/functions/v1/bw-ia-imagem" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=204, headers={**CORS, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST"})
        IMG_PEDIDOS.append(r.request.post_data_buffer or b"")
        return r.fulfill(body=json.dumps({"imagem": AZUL_B64}), content_type="application/json", headers=CORS)
    if "/functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=204, headers={**CORS, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST"})
        pd = r.request.post_data or ""; IA_PEDIDOS.append(pd)
        if "revisa textos" in pd: return r.fulfill(body=json.dumps({"texto": CORRIGIDO}), content_type="application/json", headers=CORS)
        return r.fulfill(body=json.dumps({"texto": json.dumps(IA_RESP)}), content_type="application/json", headers=CORS)
    if "fonts.googleapis" in u or "fonts.gstatic" in u: return r.abort()
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
def png_vermelho(caminho):
    from PIL import Image
    Image.new("RGB", (1200, 800), (220, 30, 40)).save(caminho)
TMP = tempfile.mkdtemp()
FOTO = os.path.join(TMP, "capa-vermelha.png"); png_vermelho(FOTO)

TODO_DEF = "(() => { const d = window.__pkUltimoDef; if (!d) return ''; let b = ''; try { b = JSON.stringify(d.background(1)); } catch (e) {} return JSON.stringify(d.content || []) + b; })()"
def def_txt(pg): return pg.evaluate("() => " + TODO_DEF)
def esperar_previa(pg, contem=None, falta=None, t=40000):
    js = """([c, f]) => { const s = """ + TODO_DEF + """;
      const e = document.getElementById('prevEstado'); return e && /página/.test(e.textContent) && (!c || s.includes(c)) && (!f || !s.includes(f)); }"""
    try: pg.wait_for_function(js, arg=[contem, falta], timeout=t); return True
    except Exception: return False
def estouro(pg): return pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, accept_downloads=True, service_workers="block",
                              **({"is_mobile": True, "has_touch": True, "device_scale_factor": 2} if larg < 500 else {}))
        ctx.route("**/*", rota); ctx.add_init_script(SR_FALSO)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "presskit.html"); pg.wait_for_timeout(1200)
        ok(pg.locator("#vLista").is_visible() and "Nenhuma apresentação" in pg.inner_text("#lista"), "lista vazia com a explicação")
        ok(estouro(pg) <= 0, "lista sem estouro horizontal")
        pg.click("text=＋ NOVA APRESENTAÇÃO")
        ok(pg.locator("#vModelos").is_visible(), "abre a galeria de modelos")
        ok(pg.locator(".pk-mod").count() == 8, "8 modelos de apresentação pessoal")
        try:
            pg.wait_for_function("() => [...document.querySelectorAll('[data-mcapa]')].filter(i => i.src && i.src.startsWith('data:image')).length === 8", timeout=120000)
            capas = True
        except Exception: capas = False
        ok(capas, "as 8 capas dos modelos são desenhadas pelo próprio PDF")
        ok(estouro(pg) <= 0, "galeria sem estouro horizontal")
        pg.click('[data-a="usarModelo"][data-m="vip"]')
        try: pg.wait_for_selector("#vEd:not([hidden])", timeout=10000)
        except Exception: pass
        ok(pg.locator("#vEd").is_visible(), "modelo HUMORISTA E PRESENÇA VIP abre o editor")
        ok(esperar_previa(pg, "ZECA PRADO"), "prévia desenhada com o exemplo completo")
        npag = pg.evaluate("() => BWPressKit.paginas()")
        ok(npag >= 3, f"o exemplo tem várias páginas ({npag})")
        ok(pg.evaluate("() => { const d = window.__pkUltimoDef.pageSize; return Math.round(d.width) === 595 && Math.round(d.height) === 744; }"), "formato vertical 4:5 (redes)")
        ok(pg.locator(".pk-exemplo").count() == 1 and pg.locator(".pk-falando").count() == 1, "aviso de EXEMPLO e o atalho MONTE FALANDO")
        if larg < 500:
            ok(pg.locator(".pk-abas").is_visible(), "celular: abas EDITAR / PRÉVIA")
            pg.click('.pk-aba[data-v="prev"]'); pg.wait_for_timeout(600)
            ok(pg.locator("#paginas canvas").first.is_visible() and not pg.locator("#form").is_visible(), "celular: PRÉVIA mostra as páginas e esconde o formulário")
            pg.click('.pk-aba[data-v="ed"]'); pg.wait_for_timeout(300)
        else:
            ok(pg.locator("#paginas canvas").first.is_visible() and pg.locator("#form").is_visible(), "PC: formulário e prévia lado a lado")
        escuro = pg.evaluate("""() => { const c = document.querySelector('#paginas canvas'); const d = c.getContext('2d').getImageData(Math.round(c.width*0.05), Math.round(c.height*0.06), 6, 6).data; let s=0; for (let i=0;i<d.length;i+=4) s += d[i]+d[i+1]+d[i+2]; return s/(d.length/4)/3; }""")
        ok(escuro < 60, f"capa do modelo VIP tem o fundo escuro (média {escuro:.0f})")
        amarelo = pg.evaluate("""() => { const c = document.querySelector('#paginas canvas'); const x = c.getContext('2d'); let n=0; for (let y=0.4; y<0.95; y+=0.05) for (let xx=0.55; xx<0.98; xx+=0.05) { const d=x.getImageData(Math.round(c.width*xx), Math.round(c.height*y),1,1).data; if (d[0]>200 && d[1]>150 && d[2]<100) n++; } return n; }""")
        ok(amarelo >= 3, f"capa VIP com o círculo amarelo atrás da foto recortada ({amarelo} pontos)")
        # editar o nome
        pg.fill('[data-k="d.marca"]', "Zé Ação Teste")
        ok(esperar_previa(pg, "ZÉ AÇÃO TESTE"), "nome editado aparece na prévia (acentos)")
        # trabalhos com link: botão VER clicável
        ok("Programa Domingo Leve" in def_txt(pg) and "VER  ↗" in def_txt(pg), "TV, publicidade e eventos com botão VER ↗")
        pg.click('[data-a="vis"][data-s="experiencia"]')
        ok(esperar_previa(pg, None, "Programa Domingo Leve"), "desligar uma parte tira ela do PDF")
        pg.click('[data-a="vis"][data-s="experiencia"]'); esperar_previa(pg, "Programa Domingo Leve")
        s = def_txt(pg); antes = s.index("QUEM SOU EU?") < s.index("O QUE EU FAÇO")
        pg.click('[data-a="sobe"][data-s="servicos"]')
        ok(antes and esperar_previa(pg) and def_txt(pg).index("O QUE EU FAÇO") < def_txt(pg).index("QUEM SOU EU?"), "▲ muda a ordem das partes no PDF")
        qrs = pg.evaluate("""async () => { const m = await BWPressKit.modelo(BWPressKit.atual(), {logo:'',capa:'',retrato:'',fotos:[]}); const s = m.secoes.filter(x => x.id === 'links')[0]; return s ? s.itens.filter(i => /^data:image\\/png/.test(i.qr || '')).length : 0; }""")
        ok("TOQUE PARA ABRIR" in def_txt(pg) and qrs >= 4, f"PORTFÓLIO: botões de link com QR code ({qrs})")
        # 🎙 ditado (reconhecimento simulado) → texto corrigido pela IA → ↺ como estava
        alvo = '#f_d_sobreCurto'
        antes_t = pg.input_value(alvo)
        pg.click('[data-a="falar"][data-alvo="f_d_sobreCurto"]')
        try: pg.wait_for_function("([s, t]) => document.querySelector(s).value === t", arg=[alvo, CORRIGIDO], timeout=8000); ditou = True
        except Exception: ditou = False
        ok(ditou, "🎙 FALAR: a fala entra no campo e volta CORRIGIDA")
        ok(any("revisa textos" in x and "né tipo assim" in x for x in IA_PEDIDOS), "a correção recebe só o texto ditado")
        ok(pg.locator('[data-a="voltarCampo"][data-alvo="f_d_sobreCurto"]').is_visible(), "aparece ↺ COMO ESTAVA")
        pg.click('[data-a="voltarCampo"][data-alvo="f_d_sobreCurto"]'); pg.wait_for_timeout(300)
        ok(pg.input_value(alvo) == antes_t, "↺ COMO ESTAVA devolve o texto de antes")
        # ✨ IA na foto: um toque no preset troca a foto NO LUGAR; ↺ ORIGINAL volta
        antes_r = pg.evaluate("() => (document.querySelector('.pk-img img[alt^=\"SUA FOTO\"]') || {}).src || ''")
        pg.click('[data-a="fotoIA"][data-alvo="retrato"][data-p="corp"]')
        try: pg.wait_for_selector('[data-a="fotoIAvolta"][data-alvo="retrato"]', timeout=10000); trocou = True
        except Exception: trocou = False
        depois_r = pg.evaluate("() => (document.querySelector('.pk-img img[alt^=\"SUA FOTO\"]') || {}).src || ''")
        ok(trocou and depois_r != antes_r, "✨ CORPORATIVO: um toque e a foto nova entra no lugar")
        ok(IMG_PEDIDOS and b"corporate headshot" in IMG_PEDIDOS[-1] and b"same person" in IMG_PEDIDOS[-1], "a IA recebe o prompt corporativo pronto (mesma pessoa)")
        ok(esperar_previa(pg), "a prévia redesenha com a foto da IA")
        pg.click('[data-a="fotoIAvolta"][data-alvo="retrato"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("() => (document.querySelector('.pk-img img[alt^=\"SUA FOTO\"]') || {}).src || ''") == antes_r, "↺ ORIGINAL devolve a foto de antes")
        g_antes = pg.evaluate("() => document.querySelector('.pk-foto img').src")
        pg.click('[data-a="fotoIAmenu"][data-i="0"]'); pg.wait_for_timeout(300)
        ok(pg.locator('#modal [data-a="fotoIA"]').count() == 6, "galeria: ✨ abre os 6 presets")
        pg.click('#modal [data-a="fotoIA"][data-p="luz"]')
        try: pg.wait_for_function("(a) => { const i = document.querySelector('.pk-foto img'); return i && i.src !== a && i.complete; }", arg=g_antes, timeout=10000); g_ok = True
        except Exception: g_ok = False
        ok(g_ok and pg.evaluate("() => { const i = document.querySelector('.pk-foto img'); const c = document.createElement('canvas'); c.width = c.height = 4; const x = c.getContext('2d'); x.drawImage(i, 0, 0, 4, 4); const d = x.getImageData(1, 1, 1, 1).data; return d[2] > 150 && d[0] < 80; }"), "galeria: a foto da IA entra no lugar da foto 1")
        # foto recortada (PNG) + foto da capa em outro modelo
        pg.set_input_files('input[data-up="capa"]', FOTO); pg.wait_for_timeout(1500)
        pg.click('h3[data-seta="pk_modelo"]'); pg.wait_for_timeout(300)
        pg.click('[data-a="trocarModelo"][data-m="ator"]')
        ok(esperar_previa(pg, "Zé Ação Teste"), "trocar para ATOR E ATRIZ mantém o nome e os textos")
        ok(pg.evaluate("() => Math.round(window.__pkUltimoDef.pageSize.height) === 842"), "ATOR E ATRIZ volta para A4")
        verm = pg.evaluate("""() => { const c = document.querySelector('#paginas canvas'); const d = c.getContext('2d').getImageData(Math.round(c.width/2), Math.round(c.height*0.15), 4, 4).data; return [d[0], d[2]]; }""")
        ok(verm[0] > verm[1] + 20, f"a foto nova aparece na capa (R {verm[0]} × B {verm[1]})")
        ok(pg.evaluate("() => JSON.stringify(window.__pkUltimoDef).includes('\"PF\"')"), "ATOR E ATRIZ usa a letra Playfair nos títulos")
        conta = pg.evaluate("() => localStorage.getItem('bw_mkt_presskit_v1') || ''")
        ok("Zé Ação Teste" in conta and "data:image" not in conta, "conta guarda só os textos (fotos ficam no aparelho)")
        # 🎙 MONTE FALANDO (IA simulada) + voltar
        if larg >= 500:
            pg.click('.pk-falando [data-a="iaSobre"]'); pg.fill("#iaTexto", "Sou humorista em BH há dez anos, apresentei a convenção tal.")
            pg.click('[data-a="iaSobreIr"]'); pg.wait_for_timeout(1500)
            ok(pg.input_value('[data-k="d.slogan"]') == IA_RESP["slogan"] and pg.locator("#btnDesfazerIA").is_visible(), "MONTE FALANDO preenche o que você faz e a apresentação")
            ok(esperar_previa(pg, "Convenção Teste Montada") and "Locução" in def_txt(pg), "a IA distribui trabalhos e habilidades nas partes certas")
            ok(IA_PEDIDOS and "Zé Ação Teste" in IA_PEDIDOS[-1] and "data:image" not in IA_PEDIDOS[-1], "a IA recebe só o texto (nome + o que a pessoa contou)")
            pg.click("#btnDesfazerIA"); pg.wait_for_timeout(500)
            ok(pg.input_value('[data-k="d.slogan"]') != IA_RESP["slogan"], "↺ VOLTAR AO MEU TEXTO desfaz a IA")
        # PDF de verdade
        with pg.expect_download(timeout=90000) as dl: pg.click('[data-a="pdf"]')
        arq = os.path.join(TMP, f"kit-{larg}.pdf"); dl.value.save_as(arq)
        info = subprocess.run(["pdfinfo", arq], capture_output=True, text=True).stdout
        pags = int([l for l in info.splitlines() if l.startswith("Pages:")][0].split()[-1])
        fontes = subprocess.run(["pdffonts", arq], capture_output=True, text=True).stdout
        texto = subprocess.run(["pdftotext", arq, "-"], capture_output=True, text=True).stdout
        ok(pags >= 3 and "595" in info, f"PDF A4 com {pags} páginas")
        ok("Playfair" in fontes and "Roboto" in fontes, "PDF com as letras embutidas (Playfair + Roboto)")
        ok("Zé Ação Teste" in texto and "TOQUE PARA ABRIR" in texto, "texto do PDF é selecionável (nome com acento e links)")
        ok(b"/URI" in open(arq, "rb").read(), "links do PDF são clicáveis")
        ok(dl.value.suggested_filename.startswith("presskit-ze-acao-teste"), "nome do arquivo sem acento: " + dl.value.suggested_filename)
        with pg.expect_download(timeout=60000) as dl2: pg.click('[data-a="word"]')
        z = zipfile.ZipFile(io.BytesIO(open(dl2.value.path(), "rb").read()))
        doc = z.read("word/document.xml").decode("utf-8")
        ok("Zé Ação Teste" in doc and "w:hyperlink" in doc and any(n.startswith("word/media/") for n in z.namelist()), "WORD (.docx) com texto, links e imagens, para editar")
        with pg.expect_download(timeout=90000) as dl3: pg.click('[data-a="zip"]')
        nomes = zipfile.ZipFile(io.BytesIO(open(dl3.value.path(), "rb").read())).namelist()
        ok(any(n.endswith(".pdf") for n in nomes) and "fotos/retrato.png" in nomes and "fotos/foto-01.jpg" in nomes and "textos/apresentacao.txt" in nomes, "PACOTE: PDF + fotos + textos")
        ok(estouro(pg) <= 0, "editor sem estouro horizontal")
        pg.reload(); pg.wait_for_timeout(1500)
        ok(pg.locator("#vEd").is_visible() and pg.input_value('[data-k="d.marca"]') == "Zé Ação Teste", "recarregar volta à mesma apresentação")
        ok(pg.locator(".pk-img img").count() >= 2, "fotos continuam depois de recarregar")
        ok(esperar_previa(pg, "Zé Ação Teste"), "prévia volta depois de recarregar")
        pg.click('#vEd [data-a="voltarLista"]'); pg.wait_for_timeout(800)
        ok(pg.locator(".pk-card").count() == 1, "lista mostra a apresentação")
        try: pg.wait_for_function("() => { const i = document.querySelector('.pk-card img'); return i && i.src.startsWith('data:image'); }", timeout=8000); mini = True
        except Exception: mini = False
        ok(mini, "cartão com a miniatura da capa")
        pg.click('.pk-card [data-a="duplicar"]'); pg.wait_for_timeout(800)
        ok(pg.locator(".pk-card").count() == 2, "⧉ DUPLICAR cria uma cópia")
        pg.click('.pk-card >> nth=0 >> [data-a="excluir"]'); pg.wait_for_timeout(800)
        ok(pg.locator(".pk-card").count() == 1, "✕ excluir (com confirmação) tira a apresentação")
        pg.click('.pk-card [data-a="abrir"] >> nth=0'); pg.wait_for_timeout(800)
        if pg.locator('[data-a="limparExemplo"]').count():
            pg.click('[data-a="limparExemplo"]'); pg.wait_for_timeout(800)
            ok(pg.input_value('[data-k="d.marca"]') == "" and pg.locator(".pk-exemplo").count() == 0, "🧹 APAGAR O EXEMPLO deixa tudo em branco")
        if larg >= 500:   # comp card A5
            pg.goto(BASE + "presskit.html?modelo=moda"); pg.wait_for_timeout(800)
            ok(esperar_previa(pg, "LUIZA FERRAZ"), "COMP CARD DE MODELO abre com o exemplo")
            ok(pg.evaluate("() => { const d = window.__pkUltimoDef.pageSize; return Math.round(d.width) === 420 && Math.round(d.height) === 595; }"), "comp card em A5")
            ok("Altura 1,77 m" in def_txt(pg) or "Altura 1,77 m" in pg.evaluate("() => JSON.stringify(window.__pkUltimoDef)"), "medidas na capa do comp card")
            pg.goto(BASE + "presskit.html?modelo=palestra"); pg.wait_for_timeout(800)
            ok(esperar_previa(pg, "Conversas que resolvem"), "PALESTRANTE abre com os temas das palestras")
        ok(not erros, "sem erro de JavaScript" + (": " + erros[0][:160] if erros else ""))
        ok(not FORA, "nada sai para fora" + (": " + FORA[0] if FORA else ""))
        ctx.close()
    nav.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
sys.exit(1 if falhas else 0)
