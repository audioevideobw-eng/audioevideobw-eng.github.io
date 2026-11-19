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
    if "/object/public/trends/pers/" in u: return r.fulfill(body=IMG, content_type="image/png")
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
        # PERSONAGENS PRONTOS em carrossel com aproximação
        ok(pg.locator("#ppCar .pc-card").count() == 12 and pg.locator("#ppCar .pc-card.meio").count() == 1, "12 personagens prontos em carrossel, um em destaque no meio")
        t0 = pg.evaluate("[...document.querySelectorAll('#ppCar .pc-card')].map(c => c.style.transform)")
        ok(len(set(t0)) > 1 and pg.evaluate("getComputedStyle(document.getElementById('ppCar')).scrollSnapType").startswith("x"), "os dos lados encolhem e inclinam; passa para o lado com encaixe")
        pg.evaluate("document.getElementById('ppCar').scrollBy({left: 330})"); pg.wait_for_timeout(700)
        ok(pg.evaluate("document.querySelector('#ppCar .pc-card.meio').dataset.pp") != "futebol", "ao passar para o lado o destaque muda")
        pg.evaluate("document.getElementById('ppCar').scrollTo({left: 0})"); pg.wait_for_timeout(500)
        ok(pg.locator('#ppCar [data-pp="futebol"] .pc-ang').count() == 5, "cada pronto tem 5 ângulos (frente, perfil, costas, rosto, ação)")
        pg.locator('#ppCar [data-pp="futebol"] [data-ppang="costas"]').click(force=True); pg.wait_for_timeout(200)
        ok("futebol-costas.jpg" in pg.get_attribute('#ppCar [data-pp="futebol"] .pc-hero img:not(.pc-fundo)', "src"), "tocar num ângulo troca a imagem grande")
        pg.locator('#ppCats [data-ppcat="Profissões"]').click(); pg.wait_for_timeout(300)
        ok(pg.locator("#ppCar .pc-card").count() == 4, "filtro por tipo (Profissões)")
        pg.locator('#ppCats [data-ppcat=""]').click(); pg.wait_for_timeout(300)
        pg.locator('#ppCar [data-ppusar="futebol"]').click(force=True); pg.wait_for_timeout(1200)
        n = pg.evaluate("__pers.lib().filter(r => r.pronto === 'futebol').map(r => Object.keys(r.planos).length)")
        ok(n == [5] and pg.is_visible("#folhaPers") and "5 ângulos" in pg.inner_text("#psAviso"), f"＋ USAR copia o pronto com os 5 ângulos para a biblioteca ({n})")
        pg.click("#psFechar"); pg.wait_for_timeout(200)
        pg.locator('#ppCar [data-ppusar="futebol"]').click(force=True); pg.wait_for_timeout(500)
        ok(pg.evaluate("__pers.lib().filter(r => r.pronto === 'futebol').length") == 1, "usar de novo não duplica (abre o que já está na biblioteca)")
        pg.click("#psFechar"); pg.wait_for_timeout(200)
        ok(pg.evaluate(SEM) <= 0, "carrosséis sem estouro na largura da tela")
        pg.evaluate("(async () => { for (const r of await BWPersonagens.listar()) await BWPersonagens.excluir(r.id); await __pers.carregar(); })()"); pg.wait_for_timeout(400)
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
        ok(pg.locator("#pgGrade .pc-card").count() == 1 and pg.locator("#pgGrade .pc-card img").count() == 2 and pg.evaluate(SEM) <= 0, "cartão colorido na galeria com a imagem, sem estouro")
        ok(pg.evaluate("[...document.querySelectorAll('button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão tem nome")
        # enviar imagem pronta
        pg.set_input_files("#pgArq", f"{TMP}/mascote.png"); pg.wait_for_timeout(1200)
        ok(pg.is_visible("#folhaPers") and "MASCOTE" in pg.inner_text("#psTitulo") and pg.evaluate("__pers.lib().length") == 2, "ENVIAR IMAGEM cria o personagem com a imagem recortada")
        # VÁRIOS PLANOS: várias fotos de uma vez, plano escolhido, tirar, folha de referência
        ok(pg.locator(".pg-plano").count() == 7 and pg.locator(".pg-plano.tem").count() == 1 and "1 DE 7" in pg.inner_text("#psCorpo"), "a ficha mostra os 7 planos (com AÇÃO); a 1ª foto entrou como FRENTE")
        pg.evaluate("document.querySelector('#psCorpo [data-ps=varias]').click()"); pg.set_input_files("#pgArq", [f"{TMP}/mascote.png", f"{TMP}/mascote.png"]); pg.wait_for_timeout(1500)
        ok(pg.locator(".pg-plano.tem").count() == 3 and "2 foto(s)" in pg.inner_text("#psAviso"), "ENVIAR VÁRIAS preenche os próximos planos livres (americano e rosto)")
        pg.evaluate("document.querySelector('#psCorpo [data-plano=costas]').click()"); pg.set_input_files("#pgArq", f"{TMP}/mascote.png"); pg.wait_for_timeout(1200)
        pl = pg.evaluate("Object.keys(__pers.lib().find(x => x.nome === 'mascote').planos).sort()")
        ok(pl == ["americano", "costas", "frente", "rosto"], f"tocar num plano manda a foto para ELE {pl}")
        pg.evaluate("document.querySelector('#psCorpo [data-plano-x=americano]').click()"); pg.wait_for_timeout(700)
        ok(pg.locator(".pg-plano.tem").count() == 3, "✕ tira só a foto daquele plano")
        pg.evaluate("document.querySelector('#psCorpo [data-ps=folha]').click()"); pg.wait_for_timeout(1200)
        fo = pg.evaluate("(async()=>{const b=window.__persFolha;if(!b)return null;const i=await createImageBitmap(b);return [b.type,i.width,i.height]})()")
        ok(fo and fo[0] == "image/png" and fo[1] == 1536 and fo[2] > 500, f"FOLHA DE REFERÊNCIA junta os planos numa imagem PNG {fo}")
        # VARIAÇÕES de roupa
        ok(not pg.is_visible("#vrNome") and pg.get_attribute('[data-seta="pers-variacoes"]', "aria-expanded") == "false", "VARIAÇÕES começa fechada (seta ▸), para a ficha caber na tela")
        pg.evaluate("document.querySelector('[data-seta=\"pers-variacoes\"]').click()"); pg.wait_for_timeout(200)
        ok(pg.is_visible("#vrNome") and pg.evaluate("JSON.parse(localStorage.getItem('ui_dobras'))['pers-variacoes']") == 1, "tocar na seta abre a seção e a escolha fica guardada")
        pg.fill("#vrNome", "Terno de gala"); pg.fill("#vrDesc", "terno preto e gravata borboleta"); pg.evaluate("document.querySelector('#psCorpo [data-ps=novaVar]').click()"); pg.wait_for_timeout(700)
        ok(pg.locator(".pg-var").count() == 1 and "Terno de gala" in pg.inner_text(".pg-var"), "GUARDAR VARIAÇÃO cria a roupa nova no mesmo personagem")
        pid2 = pg.evaluate("__pers.lib().find(x => x.nome === 'mascote').id"); vid = pg.evaluate("__pers.lib().find(x => x.nome === 'mascote').variacoes[0].id")
        ok(pg.evaluate("[BWPersonagens.planoPara('close no rosto sorrindo'), BWPersonagens.planoPara('sai andando de costas'), BWPersonagens.planoPara('chega ao salão'), BWPersonagens.planoPara('vista de cima da pista')]") == ["rosto", "costas", "frente", "cima"], "o app escolhe o plano pela descrição da cena")
        ok(pg.evaluate("(async()=>{const r=await BWPersonagens.obter('%s');return BWPersonagens.descricao(r,'%s')})()" % (pid2, vid)).startswith("terno preto"), "com a variação, a descrição leva a roupa dela")
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
        ok(pg.is_visible("#qdLib") and pg.locator("#qdLibLista [data-usar]").count() == 4 and pg.locator("#qdLibLista [data-var]").count() == 1, "👤 MEUS PERSONAGENS lista a biblioteca (3) + a variação de roupa")
        pg.evaluate("document.querySelector('#qdLibLista [data-var]').click()"); pg.wait_for_timeout(700)
        est = pg.evaluate("BWQuadro.estado().blocos.find(b => b.tipo === 'pers')")
        ok(not pg.is_visible("#qdLib") and est["nome"] == "mascote" and "terno preto" in est["texto"] and est.get("persVar"), "escolher a variação troca o personagem e a roupa da história")
        # cada cena manda o PLANO parecido com ela
        c1 = pg.evaluate("BWQuadro.historia().cenas[0]"); pg.fill(f'.qd-bloco[data-id="{c1}"] [data-campo="texto"]', "close no rosto dela sorrindo")
        pg.evaluate("document.getElementById('qdMaisCena').click()"); pg.wait_for_timeout(300); c2 = pg.evaluate("BWQuadro.historia().cenas[1]"); pg.fill(f'.qd-bloco[data-id="{c2}"] [data-campo="texto"]', "vai embora de costas pelo corredor")
        pg.check("#qdAutor"); n0 = len(PED_IMG); pg.evaluate("document.getElementById('qdImagens').click()"); pg.wait_for_function("window.__qdPlanos && window.__qdPlanos.length >= 2", timeout=20000); pg.wait_for_timeout(800)
        ok(pg.evaluate("window.__qdPlanos") == ["rosto", "costas"] and len(PED_IMG) == n0 + 2 and all(b'filename="' in x for x in PED_IMG[n0:]), f"CRIAR IMAGENS manda o plano ROSTO no close e COSTAS na cena de costas {pg.evaluate('window.__qdPlanos')}")
        pg.evaluate("document.getElementById('qdFechar').click()"); pg.wait_for_timeout(300)
        n_lib = pg.evaluate("(async () => { await BWReels.abrirPers(); return BWReels.lib().length; })()")
        ok(n_lib == 2 and pg.evaluate("BWReels.lib().every(x => x.tipo !== 'ficha')"), f"no BW Reels aparecem os 2 com imagem (a ficha sem imagem não entra): {n_lib}")
        ok(not erros, f"sem erro de JS no Reels {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
