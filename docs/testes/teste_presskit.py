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
        ok(pg.locator(".pk-mod").count() == 14, "14 modelos de apresentação pessoal")
        try:
            pg.wait_for_function("() => [...document.querySelectorAll('[data-mcapa]')].filter(i => i.src && i.src.startsWith('data:image')).length === 14", timeout=180000)
            capas = True
        except Exception: capas = False
        ok(capas, "as 14 capas dos modelos são desenhadas pelo próprio PDF")
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
        # 🎛 ESTILO AO VIVO: capa, paleta, títulos e tamanho mudam a prévia na hora
        h_pag = "() => { const c = document.querySelector('#paginas canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, Math.round(c.height * 0.5)).data; let s = 0; for (let i = 0; i < d.length; i += 97) s = (s * 31 + d[i]) % 1000003; return s; }"
        ok(pg.locator('.pk-capa').count() == 11 and pg.locator('.pk-paleta').count() == 12, "ESTILO AO VIVO: 11 capas e 12 paletas para escolher")
        h0 = pg.evaluate(h_pag)
        pg.click('.pk-capa[data-v="circulo"]'); esperar_previa(pg)
        ok(pg.evaluate("() => BWPressKit.atual().est.capa") == "circulo" and pg.evaluate(h_pag) != h0, "trocar a CAPA (retrato redondo) refaz a prévia na hora")
        ok("ellipse" in def_txt(pg), "capa redonda desenhada no PDF (anel em volta da foto)")
        pg.click('.pk-paleta[data-i="2"]'); esperar_previa(pg)
        claro = pg.evaluate("() => { const c = document.querySelectorAll('#paginas canvas')[1]; const d = c.getContext('2d').getImageData(4, Math.round(c.height * 0.5), 1, 1).data; return d[0] + d[1] + d[2]; }")
        ok(claro > 690, f"PALETA Rosé deixa as páginas claras ({claro})")
        pg.click('[data-a="est"][data-c="tit"][data-v="pilula"]'); esperar_previa(pg)
        import re as _re
        ok(_re.search(r'"text":"QUEM SOU EU\?","bold":true,"fontSize":[0-9.]+,"color":"#[0-9A-Fa-f]{6}","fillColor"', def_txt(pg)) is not None, "TÍTULOS em etiqueta colorida")
        pg.evaluate("() => { const r = document.querySelector('[data-k=\"est.nome\"]'); r.value = 140; r.dispatchEvent(new Event('input', {bubbles: true})); }")
        ok(pg.evaluate("() => BWPressKit.atual().est.nome") == "140" and esperar_previa(pg), "barra do TAMANHO DO NOME muda ao vivo")
        for cp in ["revista", "diagonal", "faixa", "arco", "duotom"]:
            pg.click(f'.pk-capa[data-v="{cp}"]')
            ok(esperar_previa(pg) and "teste" in def_txt(pg).lower(), f"capa {cp.upper()} desenha sem erro")
        pg.click('[data-a="estZerar"]'); esperar_previa(pg)
        ok(pg.evaluate("() => JSON.stringify(BWPressKit.atual().est)") == "{}" and pg.locator('.pk-capa.on[data-v="recorte"]').count() == 1, "↺ VOLTAR AO ESTILO DO MODELO")
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
        # ✥ ENQUADRAR E AJUSTAR: arrastar move a foto dentro da moldura, a barra aproxima e a luz muda o pixel
        pg.click('[data-a="enquadrar"][data-alvo="capa"]'); pg.wait_for_selector("#enqCv", timeout=5000); pg.wait_for_timeout(600)
        ok(pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return p.width > 50 && p.height > 50 && p.right <= innerWidth + 1; }"), "ENQUADRAR abre a moldura no formato da capa, dentro da tela")
        pg.evaluate("() => { const r = document.querySelector('[data-enq=\"z\"]'); r.value = 200; r.dispatchEvent(new Event('input', {bubbles: true})); }")
        bx = pg.locator("#enqPalco").bounding_box()
        pg.mouse.move(bx["x"] + bx["width"] / 2, bx["y"] + bx["height"] / 2); pg.mouse.down()
        pg.mouse.move(bx["x"] + bx["width"] / 2 + 40, bx["y"] + bx["height"] / 2 + 60, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        lum_cv = "() => { const c = document.getElementById('enqCv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 40) s += d[i] + d[i+1] + d[i+2]; return s / (d.length / 40); }"
        l0 = pg.evaluate(lum_cv)
        pg.evaluate("() => { const r = document.querySelector('[data-enq=\"ex\"]'); r.value = 80; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(700)
        l1 = pg.evaluate(lum_cv)
        ok(l1 > l0 + 15, f"☀ EXPOSIÇÃO clareia a prévia da janela ({l0:.0f} → {l1:.0f})")
        pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(400)
        eq = pg.evaluate("() => window.BWPressKit.imgsAtual().enq || {}")
        c = eq.get("capa") or {}
        ok(abs(c.get("z", 1) - 2) < 0.01 and (c.get("x", .5) < 0.5 and c.get("y", .5) < 0.5) and c.get("aj", {}).get("ex") == 80, f"PRONTO grava posição, tamanho e luz da capa: {c}")
        ok(esperar_previa(pg), "a prévia redesenha com a capa enquadrada")
        ok(pg.evaluate("""async () => { const k = window.BWPressKit, g = document.createElement('canvas'); g.width = 80; g.height = 160; const gx = g.getContext('2d'), gr = gx.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#ff2020'); gr.addColorStop(1, '#2020ff'); gx.fillStyle = gr; gx.fillRect(0, 0, 80, 160); const src = g.toDataURL('image/png'); const med = async (op) => { const u = await k.recortar(src, 60, 60, op); const im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = c.height = 60; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, 60, 60).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i+1] + d[i+2]; return s; }; return (await med({aj: {sa: -100}, q: 0.99})) !== (await med({q: 0.99})) && (await med({fy: 0, z: 2})) !== (await med({fy: 1, z: 2})); }"""), "a conta do PDF muda com a posição (topo × base) e com a cor")
        pg.click('.pk-foto [data-a="enquadrar"][data-alvo="0"]'); pg.wait_for_selector("#enqCv", timeout=5000)
        ok(pg.locator('#modal [data-enq="z"]').count() == 1 and pg.locator('#modal [data-a="enqLook"]').count() == 6, "galeria: ✥ abre o enquadrar com tamanho e os looks prontos")
        pg.click('#modal [data-a="enqLook"][data-v="pb"]'); pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(300)
        ok((pg.evaluate("() => (window.BWPressKit.imgsAtual().enq || {}).f0 || {}").get("aj") or {}).get("sa") == -100, "look P&B grava na foto 1 da galeria")
        if pg.locator('.pk-foto').count() > 1:
            pg.click('.pk-foto [data-a="fotoDir"][data-i="0"]'); pg.wait_for_timeout(300)
            ok("f1" in pg.evaluate("() => window.BWPressKit.imgsAtual().enq || {}") and "f0" not in pg.evaluate("() => window.BWPressKit.imgsAtual().enq || {}"), "mover a foto leva o ajuste junto")
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
        # ☰ OPÇÕES PRONTAS em todo campo + tirar uma parte
        n_opc = pg.locator('[data-a="opcoes"]').count()
        ok(n_opc >= 15, f"☰ OPÇÕES PRONTAS nos campos ({n_opc} botões)")
        pg.evaluate("() => document.querySelector('[data-a=\"opcoes\"][data-alvo=\"f_d_slogan\"]').click()"); pg.wait_for_timeout(300)
        ok(pg.locator('#modal [data-a="opcTocar"]').count() >= 40 and "IMAGEM E CRIAÇÃO" in pg.inner_text("#modal"), "profissões em grupos para escolher")
        pg.click('#modal [data-a="opcTocar"][data-v="Fotógrafo de eventos"]'); pg.wait_for_timeout(500)
        ok(pg.input_value('[data-k="d.slogan"]') == "Fotógrafo de eventos" and pg.locator("#modal").is_hidden(), "tocar numa profissão preenche o campo e fecha")
        ok(esperar_previa(pg, "Fotógrafo de eventos"), "a profissão escolhida vai para a prévia")
        if pg.locator('[data-a="opcoes"][data-alvo="f_d_habilidades"]').count():
            pg.evaluate("() => document.querySelector('[data-a=\"opcoes\"][data-alvo=\"f_d_habilidades\"]').click()"); pg.wait_for_timeout(300)
            pg.click('#modal [data-v="Libras"]'); pg.click('#modal [data-v="Drone"]'); pg.wait_for_timeout(200)
            v = pg.input_value('[data-k="d.habilidades"]')
            ok("Libras" in v and "Drone" in v and pg.locator("#modal").is_visible(), "lista \"uma por linha\": várias opções de uma vez (folha continua aberta)")
            pg.click('#modal [data-v="Drone"]'); pg.wait_for_timeout(200)
            ok("Drone" not in pg.input_value('[data-k="d.habilidades"]'), "tocar de novo tira a opção")
            pg.click('#modal [data-a="fecharModal"] >> nth=0'); pg.wait_for_timeout(200)
        n_tira = pg.locator('[data-a="tirarParte"]').count()
        ok(n_tira >= 5, f"✕ TIRAR ESTA PARTE em cada parte ({n_tira})")
        sp = pg.evaluate("() => { const b = [...document.querySelectorAll('[data-a=tirarParte]')].pop(); b.click(); return b.dataset.s; }"); pg.wait_for_timeout(500)
        ok(sp in pg.evaluate("() => BWPressKit.atual().ocultas || []") and pg.locator(f'[data-a="tirarParte"][data-s="{sp}"]').count() == 0 and pg.locator('[data-a="devolverParte"]').count() == 1, f"✕ tirar a parte ({sp}) some do formulário e oferece ↺ DEVOLVER")
        pg.click('[data-a="devolverParte"]'); pg.wait_for_timeout(500)
        ok(sp not in pg.evaluate("() => BWPressKit.atual().ocultas || []"), "↺ DEVOLVER traz a parte de volta")
        # 📷 FOTO DE CADA CARTÃO (serviço, trabalho, link) + contatos clicáveis
        ok(pg.locator('input[data-up="card:servicos:0"]').count() == 1 and pg.locator('input[data-up="card:experiencia:0"]').count() == 1 and pg.locator('input[data-up="card:links:0"]').count() == 1, "cada cartão (serviço, trabalho, link) tem o seu ＋ FOTO")
        ok(pg.evaluate("() => { const i = document.querySelector('input[data-up=\"card:servicos:0\"]'); return i && i.closest('label') && getComputedStyle(i).display !== 'none'; }"), "＋ FOTO é o próprio campo de arquivo (toque direto, iPhone)")
        pg.set_input_files('input[data-up="card:servicos:0"]', FOTO); pg.wait_for_timeout(1200)
        ok(pg.evaluate("() => !!((window.BWPressKit.imgsAtual().cards || {}).servicos || [])[0]"), "foto do serviço 1 guardada no aparelho")
        ok(pg.locator('.pk-cf img[alt="foto do serviço 1"]').count() == 1, "a miniatura aparece no cartão do formulário")
        n_serv = pg.evaluate("async () => { const m = await BWPressKit.modelo(BWPressKit.atual(), BWPressKit.imgsAtual()); const s = m.secoes.filter(x => x.id === 'servicos')[0]; return s && s.fotos ? s.fotos.filter(Boolean).length : 0; }")
        ok(n_serv >= 1, f"o cartão do serviço leva a foto dele no PDF ({n_serv})")
        pg.set_input_files('input[data-up="card:experiencia:0"]', FOTO); pg.wait_for_timeout(1200)
        ok(pg.evaluate("async () => { const m = await BWPressKit.modelo(BWPressKit.atual(), BWPressKit.imgsAtual()); const s = m.secoes.filter(x => x.id === 'experiencia')[0]; return !!(s && s.grupos[0].itens[0].foto); }"), "o trabalho 1 ganha a foto no PDF")
        tem_gal = pg.evaluate("() => (window.BWPressKit.imgsAtual().fotos || []).length")
        if tem_gal:
            pg.evaluate("() => document.querySelector('[data-a=\"cardGal\"][data-l=\"links\"][data-i=\"0\"]').click()"); pg.wait_for_timeout(300)
            ok(pg.locator('#modal [data-a="cardDaGal"]').count() == tem_gal, "🖼 GALERIA mostra as fotos para escolher")
            pg.click('#modal [data-a="cardDaGal"] >> nth=0'); pg.wait_for_timeout(1000)
            ok(pg.evaluate("async () => { const m = await BWPressKit.modelo(BWPressKit.atual(), BWPressKit.imgsAtual()); const s = m.secoes.filter(x => x.id === 'links')[0]; return !!(s && s.itens[0].foto); }"), "link do portfólio ganha a capa escolhida da galeria")
        pg.evaluate("() => document.querySelector('[data-a=\"enquadrar\"][data-alvo=\"c:servicos:0\"]').click()"); pg.wait_for_timeout(500)
        ok(pg.locator("#enqPalco").count() == 1 and "cartão" in pg.inner_text("#modal h3"), "✥ enquadrar a foto do cartão")
        pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(300)
        n_it = pg.evaluate("() => (BWPressKit.atual().d.servicos || []).length")
        pg.evaluate("() => { const b = document.querySelector('[data-a=\"tirarItem\"][data-l=\"servicos\"][data-i=\"0\"]'); b.click(); }"); pg.wait_for_timeout(600)
        ok(pg.evaluate("() => (BWPressKit.atual().d.servicos || []).length") == n_it - 1 and not pg.evaluate("() => ((window.BWPressKit.imgsAtual().cards || {}).servicos || [])[0]"), "tirar o serviço leva a foto dele junto (a de baixo não herda)")
        for k, v in (("d.contato.youtube", "@canalteste"), ("d.contato.site", "zeacao.com.br"), ("d.contato.tiktok", "@zeacao")):
            pg.evaluate("([k, v]) => { const i = document.querySelector('[data-k=\"' + k + '\"]'); i.value = v; i.dispatchEvent(new Event('input', {bubbles: true})); }", [k, v])
        pg.wait_for_timeout(600)
        ok(esperar_previa(pg) and "YOUTUBE  ↗" in def_txt(pg) and "WHATSAPP  ↗" in def_txt(pg), "CONTATO com botões WHATSAPP, E-MAIL, SITE, INSTAGRAM, TIKTOK, YOUTUBE")
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
        import re as _r2
        uris = set(u.decode("latin-1") for u in _r2.findall(rb"/URI\s*\(([^)]*)\)", open(arq, "rb").read()))
        precisa = {"WhatsApp": "wa.me/55", "e-mail": "mailto:", "Instagram": "instagram.com/", "YouTube": "youtube.com/@canalteste", "TikTok": "tiktok.com/@zeacao", "site": "zeacao.com.br"}
        faltam = [n for n, p in precisa.items() if not any(p in u for u in uris)]
        ok(not faltam, f"PDF INTERATIVO: cada contato abre o lugar certo ({len(uris)} links)" + (" — faltam: " + ", ".join(faltam) if faltam else ""))
        n_rod = subprocess.run(["python3", "-c", "import sys,re;d=open(sys.argv[1],'rb').read();print(len(re.findall(rb'/Subtype\\s*/Link',d)))", arq], capture_output=True, text=True).stdout.strip()
        ok(int(n_rod or 0) >= pags * 2, f"rodapé e cabeçalho clicáveis em todas as páginas ({n_rod} áreas de link)")
        ok(dl.value.suggested_filename.startswith("presskit-ze-acao-teste"), "nome do arquivo sem acento: " + dl.value.suggested_filename)
        with pg.expect_download(timeout=60000) as dl2: pg.click('[data-a="word"]')
        z = zipfile.ZipFile(io.BytesIO(open(dl2.value.path(), "rb").read()))
        doc = z.read("word/document.xml").decode("utf-8")
        ok("Zé Ação Teste" in doc and "w:hyperlink" in doc and any(n.startswith("word/media/") for n in z.namelist()), "WORD (.docx) com texto, links e imagens, para editar")
        with pg.expect_download(timeout=90000) as dl3: pg.click('[data-a="zip"]')
        nomes = zipfile.ZipFile(io.BytesIO(open(dl3.value.path(), "rb").read())).namelist()
        ok(any(n.endswith(".pdf") for n in nomes) and "fotos/retrato.png" in nomes and "fotos/foto-01.jpg" in nomes and "textos/apresentacao.txt" in nomes, "PACOTE: PDF + fotos + textos")
        ok(any(n.startswith("fotos/cartoes/") for n in nomes), "PACOTE leva também as fotos dos cartões")
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
