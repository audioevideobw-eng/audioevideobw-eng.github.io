#!/usr/bin/env python3
"""Teste local da ÁREA DE PERSONAGENS (18/11): agente (IA simulada, resposta EMBRULHADA em {"ficha":{…}}), ficha editável, criar imagem
(IA de imagem simulada, com confirmação e sem foto no pedido), salvar na biblioteca, enviar imagem, usar no QUADRO DE HISTÓRIA (reels.html)
e aparecer no BW Reels; sem conta = perguntas guiadas. 1280 e 390 px. Uso (na raiz): python3 docs/testes/teste_personagens.py"""
import base64, http.server, io, json, os, socketserver, threading
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8841; TMP = "/tmp/teste_pers"; os.makedirs(TMP, exist_ok=True)
STUB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},insert(){return q},delete(){return q},update(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};const ses=window.__semConta?null:{access_token:'t',user:{id:'u1',email:'teste@exemplo.com'}};
return {auth:{getSession:async()=>({data:{session:ses}}),getUser:async()=>({data:{user:ses&&ses.user}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),
storage:{from(){return {list:async()=>({data:[]})}}},functions:{invoke:async()=>({data:null})}};}};"""
FICHA = {"ficha": {"nome": "Bia", "papel": "fotógrafa de casamentos", "aparencia": "mulher de 30 anos, cabelo cacheado castanho", "roupa": "jaqueta jeans e câmera no pescoço",
                   "personalidade": "simpática", "estilo": "3D de animação", "prompt": "**full body 3D animated character**, woman with curly brown hair, denim jacket, plain light background"},
         "resposta": "Montei a Bia.", "pergunta": "Quer que ela use óculos?"}
def png_personagem():
    im = Image.new("RGB", (576, 1024), (255, 255, 255)); d = ImageDraw.Draw(im); d.ellipse((200, 120, 380, 300), fill=(230, 180, 140)); d.rectangle((190, 300, 390, 900), fill=(30, 90, 200))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()
IMG = png_personagem(); open(f"{TMP}/mascote.png", "wb").write(IMG)
PED = []; PED_IMG = []
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "functions/v1/bw-ia-imagem" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        PED_IMG.append(r.request.post_data_buffer or b""); return r.fulfill(body=json.dumps({"imagem": base64.b64encode(IMG).decode()}), content_type="application/json")
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        PED.append(r.request.post_data or ""); return r.fulfill(body=json.dumps({"texto": "```json\n" + json.dumps(FICHA) + "\n```"}), content_type="application/json")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
SEM = "document.documentElement.scrollWidth - document.documentElement.clientWidth"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        PED.clear(); PED_IMG.clear()
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        ctx.grant_permissions(["clipboard-read", "clipboard-write"])
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "personagens.html"); pg.wait_for_timeout(1200)
        ok(pg.locator(".pg-vazio").count() == 1 and pg.evaluate(SEM) <= 0, "abre vazia, com o convite para criar, sem estouro")
        ok(pg.locator(".bw-shell, .bw-menu, nav").count() > 0, "página com o menu da plataforma (layout.js)")
        # AGENTE com a IA (resposta embrulhada em {"ficha":{…}})
        pg.click("#pgNovo"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#folhaAgente") and pg.locator("#agChat .pg-msg.a").count() == 1 and not pg.is_visible("#agFicha"), "CRIAR COM O AGENTE abre a conversa")
        ok(pg.evaluate("parseFloat(getComputedStyle(document.getElementById('agTexto')).fontSize)") >= 16, "campo de digitar com letra de 16 px")
        pg.fill("#agTexto", "uma fotógrafa de casamento simpática, cabelo cacheado, jaqueta jeans"); pg.click("#agEnviar"); pg.wait_for_timeout(700)
        ok(len(PED) == 1 and "fotógrafa de casamento" in PED[0] and "base64" not in PED[0], "UMA chamada à IA, só com o texto da conversa")
        ok(pg.is_visible("#agFicha") and pg.input_value("#fxNome") == "Bia" and "jaqueta" in pg.input_value("#fxRoupa"), "a ficha é preenchida mesmo com a resposta embrulhada")
        ok(pg.input_value("#fxPrompt").startswith("full body") and "**" not in pg.input_value("#fxPrompt"), "o prompt mestre chega limpo, sem marcação")
        ok("óculos" in pg.inner_text("#agChat .pg-msg.a:last-child"), "o agente responde e faz UMA pergunta para melhorar")
        pg.fill("#fxPersonalidade", "simpática e animada")
        pg.fill("#agTexto", "sim, óculos redondos"); pg.click("#agEnviar"); pg.wait_for_timeout(700)
        ok(len(PED) == 2 and "simpática e animada" in PED[1] and "Ficha atual" in PED[1], "a 2ª mensagem leva a ficha atual, com o que a pessoa mexeu à mão")
        pg.click("#fxCopiar"); pg.wait_for_timeout(200)
        ok("Copiado" in pg.inner_text("#agAviso") and pg.evaluate("navigator.clipboard.readText()").startswith("full body"), "COPIAR PROMPT copia o prompt mestre")
        # imagem com IA: confirma, não manda foto, tira o fundo liso
        dlg.clear(); pg.click("#fxImagem"); pg.wait_for_timeout(1500)
        ok(len(dlg) == 1 and "15 imagens" in dlg[0] and len(PED_IMG) == 1 and b'filename="' not in PED_IMG[0] and b"full body" in PED_IMG[0], "CRIAR IMAGEM pede confirmação e manda só o texto (nenhuma foto)")
        ok(pg.locator("#fxImg img").count() == 1 and pg.evaluate("__pers.ag().blob.type") == "image/png", "a imagem aparece na ficha, já recortada em PNG")
        pg.click("#fxSalvar"); pg.wait_for_timeout(900)
        ok(not pg.is_visible("#folhaAgente") and pg.is_visible("#folhaPers") and "BIA" in pg.inner_text("#psTitulo") and "Salvo" in pg.inner_text("#psAviso"), "SALVAR guarda e abre a ficha do personagem")
        ok(pg.locator('#psCorpo a[href*="quadro=1"]').count() == 1 and pg.locator('#psCorpo [data-ps="baixar"]').count() == 1, "ficha com USAR NO QUADRO, BW REELS e BAIXAR PNG")
        pid = pg.evaluate("__pers.lib()[0].id")
        pg.click("#psFechar"); pg.wait_for_timeout(200)
        ok(pg.locator(".pg-card").count() == 1 and pg.locator(".pg-card img").count() == 1 and pg.evaluate(SEM) <= 0, "cartão colorido na galeria com a imagem, sem estouro")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        # enviar imagem pronta
        pg.set_input_files("#pgArq", f"{TMP}/mascote.png"); pg.wait_for_timeout(1200)
        ok(pg.is_visible("#folhaPers") and "MASCOTE" in pg.inner_text("#psTitulo") and pg.evaluate("__pers.lib().length") == 2, "ENVIAR IMAGEM cria o personagem com a imagem recortada")
        pg.click('#psCorpo [data-ps="editar"]'); pg.wait_for_timeout(300)
        ok(pg.is_visible("#folhaAgente") and pg.is_visible("#agFicha") and pg.input_value("#fxNome") == "mascote", "MUDAR COM O AGENTE abre a ficha dele na conversa")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        # sem conta: perguntas guiadas, com as palavras da pessoa
        pg.evaluate("window.__c = BWSync.cliente; BWSync.cliente = function () { return null; }")
        pg.click("#pgNovo"); pg.fill("#agTexto", "um técnico de som barbudo"); pg.click("#agEnviar"); pg.wait_for_timeout(400)
        ok("sem a IA" in pg.inner_text("#agAviso") and pg.input_value("#fxAparencia") == "um técnico de som barbudo" and "chama" in pg.inner_text("#agChat .pg-msg.a:last-child"), "sem conta: avisa o motivo, guarda o texto da pessoa e pergunta o nome")
        pg.fill("#agTexto", "Rui"); pg.click("#agEnviar"); pg.wait_for_timeout(300)
        ok(pg.input_value("#fxNome") == "Rui" and "técnico de som barbudo" in pg.input_value("#fxPrompt") and "papel" in pg.inner_text("#agChat .pg-msg.a:last-child"), "as respostas vão para os campos certos e o prompt é montado no aparelho")
        pg.click("#fxSalvar"); pg.wait_for_timeout(700)
        ok(pg.evaluate("__pers.lib().filter(x => x.tipo === 'ficha').length") == 1, "personagem sem imagem fica guardado como ficha")
        pg.evaluate("BWSync.cliente = window.__c")
        ok(not erros, f"sem erro de JS na área de personagens {erros}")
        # QUADRO DE HISTÓRIA recebe o personagem pelo link
        pg.goto(BASE + f"reels.html?quadro=1&pers={pid}"); pg.wait_for_timeout(2600)
        est = pg.evaluate("BWQuadro.estado().blocos.find(b => b.tipo === 'pers')")
        ok(pg.is_visible("#folhaQuadro") and est["nome"] == "Bia" and "cacheado" in est["texto"] and pg.locator(".qd-bloco.t-pers .qd-foto img").count() == 1, "USAR NO QUADRO abre o quadro com nome, descrição e imagem do personagem")
        ok("quadro=1" not in pg.url, "o endereço é limpo depois de aplicar (recarregar não repete)")
        pg.evaluate("document.querySelector('.qd-bloco.t-pers [data-lib]').click()"); pg.wait_for_timeout(500)
        ok(pg.is_visible("#qdLib") and pg.locator("#qdLibLista [data-usar]").count() == 3, "👤 MEUS PERSONAGENS no bloco lista a biblioteca (3)")
        pg.evaluate("document.querySelectorAll('#qdLibLista [data-usar]')[1].click()"); pg.wait_for_timeout(600)
        ok(not pg.is_visible("#qdLib") and pg.evaluate("BWQuadro.estado().blocos.find(b => b.tipo === 'pers').nome") != "", "escolher na lista troca o personagem da história")
        pg.evaluate("document.getElementById('qdFechar').click()"); pg.wait_for_timeout(300)
        n_lib = pg.evaluate("(async () => { await BWReels.abrirPers(); return BWReels.lib().length; })()")
        ok(n_lib == 2 and pg.evaluate("BWReels.lib().every(x => x.tipo !== 'ficha')"), f"no BW Reels aparecem os 2 com imagem (a ficha sem imagem não entra): {n_lib}")
        ok(not erros, f"sem erro de JS no Reels {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
