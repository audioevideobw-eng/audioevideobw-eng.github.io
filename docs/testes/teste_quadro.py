#!/usr/bin/env python3
"""Teste local do QUADRO DE HISTÓRIA (BW REELS PRO, 17/11) — cabeçalho igual ao do teste_reels.py.
Original: Teste local do BW REELS PRO (17/11): abre sem erro, prévia ao vivo (iframe com o motor), IA simulada (ganchos + cenas + fatos +
legenda numa chamada), escolher gancho, fontes (tirar o que não tem fonte), estilo/formato, editor de cena (texto, duração, mover,
duplicar, excluir), importar mídia (IndexedDB, sobrevive ao recarregar), validação, pacote .bwreels.zip (roteiro + mídia usada) e
MEUS REELS. 1280 e 390 px (estouro horizontal = 0). Uso (na raiz): python3 docs/testes/teste_reels.py"""
import http.server, io, json, os, socketserver, threading, zipfile
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8829; TMP = "/tmp/teste_quadro"; os.makedirs(TMP, exist_ok=True)
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},order(){return q},limit(){return q},
upsert(){return q},insert(){return q},delete(){return q},update(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};const ses={access_token:'t',user:{id:'u1',email:'teste@exemplo.com'}};
return {auth:{getSession:async()=>({data:{session:ses}}),getUser:async()=>({data:{user:ses.user}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){return q},rpc:async()=>({data:null,error:null}),
storage:{from(){return {list:async()=>({data:[]})}}},functions:{invoke:async()=>({data:null})}};}};"""
JSZIP = open("/opt/npm-tools/node_modules/jszip/dist/jszip.min.js").read()
RESPOSTA_IA = {"ganchos": [
    {"padrao": "Perda", "texto": "Seu evento termina às 22h. O alcance, não.", "quadro": "plateia lotada", "nota": 4.6},
    {"padrao": "Pergunta", "texto": "Sua live trava quando mais gente entra?", "quadro": "tela congelando", "nota": 4.3},
    {"padrao": "Bastidor", "texto": "O que acontece antes do palco acender", "quadro": "mesa de corte", "nota": 4.1}],
  "cenas": [
    {"tipo": "texto", "duracao": 3.5, "titulo": "Quem não estava lá também pode assistir", "enfase": ["assistir"], "fala": "quem não foi assiste ao vivo"},
    {"tipo": "dado", "duracao": 3.2, "valor": 30, "prefixo": "até", "rotulo": "eventos por ano", "fonte": "interno: informado pelo usuário"},
    {"tipo": "dado", "duracao": 3.2, "valor": 87, "sufixo": "%", "rotulo": "das empresas preferem lives", "fonte": ""},
    {"tipo": "lista", "duracao": 5, "titulo": "Do palco para todas as telas", "itens": ["Transmissão ao vivo", "Aftermovie", "Fotos"]},
    {"tipo": "cta", "duracao": 3, "texto": "Seu próximo evento merece ir mais longe", "acao": "@bw"}],
  "fatos": ["87% das empresas preferem lives", "A BW faz até 30 eventos por ano"], "legenda": "Seu evento não precisa acabar às 22h. #eventoscorporativos #transmissaoaovivo"}
PEDIDOS = []; PEDIDOS_IMG = []; CORPOS_IMG = []
RESPOSTA_QD = {"gancho": "Duas horas antes do sim", "cenas": [
    {"prompt": "arriving at an empty elegant ballroom, looking around excited, wide shot", "fala": "IA TROCOU A FALA"},
    {"prompt": "photographing the couple dancing, close shot", "fala": "É aqui que a mágica acontece"},
    {"prompt": "showing the photo on the camera screen, smiling", "fala": "E o resultado fica para sempre"},
    {"prompt": "handing the leather album to the emotional couple", "fala": "O álbum chega nas mãos certas"}], "legenda": "Bastidores de um casamento. #fotografia"}
RESPOSTA_AV = {"gancho": "O dia em que o som caiu", "cenas": [
    {"fala": "Cheguei no evento todo animado!", "acao": "acena", "cenario": "palco", "pose": "arriving at a corporate event", "duracao": 3.2},
    {"fala": "Opa, o som caiu no meio da palestra", "acao": "surpresa", "cenario": "palco", "pose": "on stage, surprised", "duracao": 3.5},
    {"fala": "A equipe da BW resolveu em segundos", "acao": "aponta", "cenario": "raios", "pose": "pointing to the tech desk", "duracao": 3.5},
    {"fala": "Transmissão ao vivo salva!", "acao": "voar", "cenario": "lua", "pose": "celebrating", "duracao": 3}],
  "cta": "Chama a BW", "legenda": "Evento sem susto. #eventos #aovivo"}
import base64
from PIL import Image as _Img
_b = io.BytesIO(); _Img.new("RGB", (576, 1024), (40, 90, 140)).save(_b, "JPEG"); IMG_IA = base64.b64encode(_b.getvalue()).decode()
_a = _Img.new("RGB", (400, 600), (255, 255, 255)); from PIL import ImageDraw as _D; _d = _D.Draw(_a); _d.ellipse((100, 60, 300, 260), fill=(230, 180, 140)); _d.rectangle((110, 250, 290, 560), fill=(30, 90, 200))
AVATAR = f"{TMP}/avatar-branco.png"; _a.save(AVATAR)

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith("blob:") or u.startswith("data:") or u.startswith("about:"): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "jszip" in u: return r.fulfill(body=JSZIP, content_type="application/javascript")
    if "functions/v1/bw-ia-imagem" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        PEDIDOS_IMG.append(len(r.request.post_data_buffer or b""))
        CORPOS_IMG.append((r.request.post_data_buffer or b"").count(b'filename="'))
        return r.fulfill(body=json.dumps({"imagem": IMG_IA}), content_type="application/json")
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        PEDIDOS.append(r.request.post_data or "")
        resp = RESPOSTA_QD if "diretor de arte de Reels" in (r.request.post_data or "") else RESPOSTA_AV if "roteirista de Reels com um personagem" in (r.request.post_data or "") else RESPOSTA_IA
        return r.fulfill(body=json.dumps({"texto": "```json\n" + json.dumps(resp) + "\n```"}), content_type="application/json")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()

falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        PEDIDOS.clear(); PEDIDOS_IMG.clear()
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", accept_downloads=True, has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "reels.html"); pg.wait_for_timeout(1800)
        if pg.is_visible("#folhaModelos"): pg.evaluate("document.getElementById('folhaModelos').hidden = true")
        pg.click("#btQuadro"); pg.wait_for_timeout(500)
        ok(pg.is_visible("#folhaQuadro") and pg.locator(".qd-bloco").count() == 3, "abre o quadro com PERSONAGEM → CENA → FINAL")
        ok(pg.locator("#qdLinhas .qd-linha").count() == 2, "os blocos já vêm ligados por setas")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") == 0, "sem estouro horizontal")
        ok(pg.evaluate("[...document.querySelectorAll('#folhaQuadro button')].filter(b => b.offsetParent && !(b.textContent.trim() || b.getAttribute('aria-label'))).length") == 0, "todo botão do quadro tem nome")
        # exemplo: 3 cenas + referência ligada a 2
        pg.click("#qdExemplo"); pg.wait_for_timeout(400)
        ok(pg.locator(".qd-bloco.t-cena").count() == 3 and pg.locator("#qdLinhas .qd-linha.ref").count() == 2 and pg.evaluate("BWQuadro.historia().cenas.length") == 3, "EXEMPLO: 3 cenas em ordem e a referência ligada a 2 delas")
        # + CENA entra no fim da história; + REFERÊNCIA fica solta até ligar
        pg.click("#qdMaisCena"); pg.wait_for_timeout(300)
        ok(pg.evaluate("BWQuadro.historia().cenas.length") == 4 and pg.evaluate("BWQuadro.historia().soltas") == 0, "+ CENA entra sozinha no fim da história (antes do FINAL)")
        nova = pg.evaluate("BWQuadro.historia().cenas[3]")
        pg.fill(f'.qd-bloco[data-id="{nova}"] [data-campo="texto"]', "entrega o álbum para os noivos emocionados")
        # ligar pelo botão ➜ e depois tocar no destino
        pg.click("#qdMaisRef"); pg.wait_for_timeout(300)
        ref = pg.evaluate("BWQuadro.estado().blocos.slice(-1)[0].id")
        pg.fill(f'.qd-bloco[data-id="{ref}"] [data-campo="texto"]', "álbum de capa de couro")
        pg.evaluate("document.querySelector('#qdCentro').click()"); pg.wait_for_timeout(200)
        pg.evaluate(f"document.querySelector('.qd-bloco[data-id=\"{ref}\"] [data-ligar]').click()"); pg.wait_for_timeout(200)
        ok("DEPOIS" in pg.inner_text("#qdDica") and pg.locator(".qd-bloco.ligando").count() == 1, "➜ entra no modo de ligar e explica o próximo toque")
        pg.evaluate(f"document.querySelector('.qd-bloco[data-id=\"{nova}\"] .qd-cab b').click()"); pg.wait_for_timeout(300)
        ok(pg.locator("#qdLinhas .qd-linha.ref").count() == 3, "tocar no destino cria a seta da referência para a cena")
        # arrastar um bloco pelo cabeçalho move o bloco e a seta acompanha
        antes = pg.evaluate(f"(() => {{ const b = BWQuadro.estado().blocos.find(x => x.id === '{ref}'); return [b.x, b.y]; }})()")
        cx = pg.locator(f'.qd-bloco[data-id="{ref}"] .qd-cab b').bounding_box()
        pg.mouse.move(cx["x"] + 5, cx["y"] + 5); pg.mouse.down(); pg.mouse.move(cx["x"] + 45, cx["y"] + 35, steps=4); pg.mouse.up(); pg.wait_for_timeout(500)
        dep = pg.evaluate(f"(() => {{ const b = BWQuadro.estado().blocos.find(x => x.id === '{ref}'); return [b.x, b.y]; }})()")
        ok(dep[0] > antes[0] and dep[1] > antes[1], f"arrastar o bloco muda a posição {antes} → {dep}")
        # foto do personagem (fundo branco sai sozinho)
        pg.set_input_files("#qdArquivo", AVATAR) if False else None
        pers = pg.evaluate("BWQuadro.estado().blocos.find(b => b.tipo === 'pers').id")
        pg.evaluate(f"document.getElementById('qdArquivo').dataset.para = '{pers}'"); pg.set_input_files("#qdArquivo", AVATAR); pg.wait_for_timeout(900)
        ok(pg.locator(".qd-bloco.t-pers .qd-foto img").count() == 1, "foto do personagem entra no bloco")
        ref0 = pg.evaluate("BWQuadro.estado().blocos.find(b => b.tipo === 'ref').id")
        pg.evaluate(f"document.getElementById('qdArquivo').dataset.para = '{ref0}'"); pg.set_input_files("#qdArquivo", AVATAR); pg.wait_for_timeout(700); CORPOS_IMG.clear()
        # criar imagens: precisa da autorização; depois 1 chamada de texto + 4 imagens, foto pequena
        pg.click("#qdImagens"); pg.wait_for_timeout(1500)
        ok("autorização" in pg.inner_text("#qdAviso") and len(PEDIDOS_IMG) == 0, "sem marcar a autorização nada é enviado")
        pg.check("#qdAutor"); dlg.clear(); pg.click("#qdImagens"); pg.wait_for_timeout(4500)
        ok(any("4 imagem" in d and "15 por dia" in d for d in dlg), "pede confirmação dizendo quantas imagens e o limite do dia")
        ok(len(PEDIDOS_IMG) == 4 and max(PEDIDOS_IMG) < 400000 and pg.locator(".qd-foto.ia img").count() == 4, f"4 imagens criadas com cópia pequena da foto (maior envio {max(PEDIDOS_IMG or [0])//1024} KB)")
        qd = [x for x in PEDIDOS if "diretor de arte" in x]
        ok(len(qd) == 2 and "álbum de capa de couro" in qd[-1] and "salão de festa" in qd[-1], "os textos saem numa chamada só por ação, com as referências ligadas a cada cena")
        ok(sorted(CORPOS_IMG) == [1, 1, 2, 2], f"cenas ligadas à referência com imagem mandam o personagem E a referência; as outras só o personagem {CORPOS_IMG}")
        ok(pg.is_visible("#qdBaixar"), "aparece BAIXAR IMAGENS (só as fotos)")
        with pg.expect_download() as d1: pg.click("#qdBaixar")
        ok(d1.value.suggested_filename == "cena-1.jpg", "BAIXAR IMAGENS baixa as fotos das cenas")
        pg.wait_for_timeout(1500)
        # fechar, reabrir: quadro e imagens continuam
        pg.click("#qdFechar"); pg.reload(); pg.wait_for_timeout(1800)
        if pg.is_visible("#folhaModelos"): pg.evaluate("document.getElementById('folhaModelos').hidden = true")
        pg.click("#btQuadro"); pg.wait_for_timeout(900)
        ok(pg.locator(".qd-bloco.t-cena").count() == 4 and pg.locator(".qd-foto.ia img").count() == 4 and pg.is_checked("#qdAutor"), "depois de recarregar o quadro e as imagens continuam no aparelho")
        # montar o vídeo animado pelo app
        dlg.clear(); pg.click("#qdMontar"); pg.wait_for_timeout(200)
        ok(pg.is_visible("#qdMontarAuto") and pg.is_visible("#qdMontarVideo") and pg.is_visible("#qdMontarMotor"), "MONTAR O VÍDEO oferece AUTOMÁTICO, PRO e SÓ O APP")
        ta, tp = pg.inner_text("#qdMontarAuto"), pg.inner_text("#qdMontarVideo")
        ok("3 em IA de vídeo ≈ US$ 0,90" in ta and "1 cena(s) no app" in ta, "AUTOMÁTICO: só as cenas com movimento vão para IA de vídeo econômica, com o custo estimado: " + ta.replace("\n", " | "))
        ok("4 em IA de vídeo ≈ US$ 10,16" in tp, "PRO: todas as cenas em IA de vídeo de melhor qualidade, com o custo: " + tp.replace("\n", " | "))
        ok(pg.evaluate("JSON.stringify(BWQuadro.planoVideo([{contexto:'ela dança no salão',fala:''},{contexto:'olha para a câmera',fala:'Oi'},{contexto:'detalhe das flores',fala:''}], true, 'auto').map(x => x.via))") == '["video","app","app"]', "o plano entende o tipo de cada cena (dança = vídeo; fala parada e detalhe = app)")
        pg.click("#qdMontarMotor"); pg.wait_for_timeout(4000)
        r = pg.evaluate("BWReels.projeto().roteiro.cenas")
        ok(not pg.is_visible("#folhaQuadro") and [c["tipo"] for c in r] == ["gancho", "personagem", "personagem", "personagem", "personagem", "cta"], "vira um reel: gancho + 4 cenas + final: " + ",".join(c["tipo"] for c in r))
        ok(all(c.get("midia") for c in r[1:5]) and r[1]["falas"][0]["texto"] == "Cheguei duas horas antes do evento" and r[5]["texto"] == "Peça o seu orçamento", "cada cena usa a imagem criada, a fala que a pessoa escreveu (a IA não troca) e a chamada final")
        v = pg.evaluate("BWReels.validar(true)")
        ok(len(v["erros"]) == 0, f"o reel montado passa na validação do motor {v['erros']}")
        ok(pg.evaluate("!!document.querySelector('#quadro').contentWindow.__seek"), "a prévia do reel toca no motor")
        # vídeo com IA de fora: prompts por cena
        pg.click("#btQuadro"); pg.wait_for_timeout(700); dlg.clear(); pg.click("#qdMontar"); pg.click("#qdMontarAuto"); pg.wait_for_timeout(3800)
        ra = pg.evaluate("BWReels.projeto().roteiro.cenas"); pa = pg.evaluate("BWReels.projeto().promptsCenas")
        ok([c["tipo"] for c in ra] == ["gancho", "midia", "midia", "personagem", "midia", "cta"] and len(pa) == 3 and "Veo 3.1 Lite" in pa[0]["prompt"] and all(c.get("midia") for c in ra[1:5]), "AUTOMÁTICO monta misto: 3 cenas com movimento em IA de vídeo (imagem de espera + IA indicada no prompt) e a cena parada no app")
        ok(any("Plano: 1 cena(s) no app (grátis) · 3 em IA de vídeo" in d for d in dlg) and len(pg.evaluate("BWReels.validar(true)")["erros"]) == 0, "avisa o plano com o custo e o reel misto passa na validação")
        pg.click("#btQuadro"); pg.wait_for_timeout(700); pg.click("#qdMontar"); pg.click("#qdMontarVideo"); pg.wait_for_timeout(3500)
        pc = pg.evaluate("BWReels.projeto().promptsCenas")
        ok(len(pc) == 4 and "9:16" in pc[0]["prompt"] and "reference image" in pc[0]["prompt"] and "salão de festa" in pc[0]["prompt"], "PRO: um prompt por cena, com o personagem e as referências")
        ok("CENA 2" in pg.inner_text("#promptsCenas"), "os prompts aparecem na aba MÍDIA para copiar")
        # sem personagem e sem imagens: cenas viram texto
        pg.click("#btQuadro"); pg.wait_for_timeout(600); dlg.clear(); pg.click("#qdLimpar"); pg.wait_for_timeout(500)
        ok(pg.locator(".qd-bloco").count() == 3 and pg.locator(".qd-foto img").count() == 0, "LIMPAR volta ao quadro inicial e apaga as imagens")
        pg.click("#qdMontar"); pg.click("#qdMontarMotor"); pg.wait_for_timeout(1200)
        ok("em branco" in pg.inner_text("#qdAviso") and pg.is_visible("#folhaQuadro"), "cena em branco: avisa e não monta")
        pg.fill('.qd-bloco.t-cena [data-campo="texto"]', "a equipe monta o palco de madrugada"); pg.click("#qdMontar"); pg.click("#qdMontarMotor"); pg.wait_for_timeout(3000)
        r = pg.evaluate("BWReels.projeto().roteiro.cenas")
        ok([c["tipo"] for c in r][-2:] == ["texto", "cta"] and len(pg.evaluate("BWReels.validar(true)")["erros"]) == 0, "sem personagem nem imagem a cena vira texto e o reel continua válido")
        ok(not erros, f"nenhum erro de JS {erros}")
        ctx.close()
    b.close()
print("\nFALHAS:", len(falhas))
for f in falhas: print("  -", f)
