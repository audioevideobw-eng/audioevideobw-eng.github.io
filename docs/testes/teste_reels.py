#!/usr/bin/env python3
"""Teste local do BW REELS PRO (17/11): abre sem erro, prévia ao vivo (iframe com o motor), IA simulada (ganchos + cenas + fatos +
legenda numa chamada), escolher gancho, fontes (tirar o que não tem fonte), estilo/formato, editor de cena (texto, duração, mover,
duplicar, excluir), importar mídia (IndexedDB, sobrevive ao recarregar), validação, pacote .bwreels.zip (roteiro + mídia usada) e
MEUS REELS. 1280 e 390 px (estouro horizontal = 0). Uso (na raiz): python3 docs/testes/teste_reels.py"""
import http.server, io, json, os, socketserver, threading, zipfile
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8823; TMP = "/tmp/teste_reels"; os.makedirs(TMP, exist_ok=True)
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
PEDIDOS = []

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
    if "functions/v1/bw-ia" in u:
        if r.request.method == "OPTIONS": return r.fulfill(status=200, body="ok")
        PEDIDOS.append(r.request.post_data or "")
        return r.fulfill(body=json.dumps({"texto": "```json\n" + json.dumps(RESPOSTA_IA) + "\n```"}), content_type="application/json")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()

# vídeo de teste (2 s) para importar
VID = f"{TMP}/palco.webm"
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    # gera um webm curto no próprio navegador (canvas + MediaRecorder)
    if not os.path.exists(VID):
        g = b.new_page(); g.goto("about:blank")
        dados = g.evaluate("""async()=>{const c=document.createElement('canvas');c.width=320;c.height=180;const x=c.getContext('2d');const s=c.captureStream(15);
          const r=new MediaRecorder(s,{mimeType:'video/webm'});const ch=[];r.ondataavailable=e=>ch.push(e.data);r.start();
          for(let i=0;i<30;i++){x.fillStyle='hsl('+i*12+',70%,50%)';x.fillRect(0,0,320,180);await new Promise(o=>setTimeout(o,66))}
          r.stop();await new Promise(o=>r.onstop=o);const bl=new Blob(ch);const a=new Uint8Array(await bl.arrayBuffer());return Array.from(a)}""")
        open(VID, "wb").write(bytes(dados)); g.close()
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", accept_downloads=True); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; dlg = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
        pg.goto(BASE + "reels.html"); pg.wait_for_timeout(1800)
        ok(not erros, f"abre sem erro de JS {erros[:2]}")
        ok(not pg.locator("#folhaModelos").is_hidden(), "1ª vez: a galeria O QUE VAMOS CRIAR? abre sozinha")
        ok(pg.locator("#glCats .gl-cat").count() == 3, "3 categorias: motion de texto, personagens, personagem com IA")
        larg = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(larg <= 0, f"galeria sem estouro horizontal ({larg}px)")
        pg.click("#btFecharModelos"); pg.wait_for_timeout(200)
        ok(pg.evaluate("!!document.querySelector('#quadro').contentWindow.__seek"), "prévia ao vivo carregou o motor (iframe com __seek)")
        ok(pg.locator("#cenas .rl-cena").count() == 4, "projeto novo vem com 4 cenas de exemplo")
        larg = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(larg <= 0, f"sem estouro horizontal ({larg}px)")
        # IA
        pg.fill("#fAssunto", "Por que transmitir ao vivo o seu evento corporativo"); pg.fill("#fCta", "Chama no direct"); pg.fill("#fFatos", "até 30 eventos por ano")
        n0 = len(PEDIDOS); pg.click("#btGerar"); pg.wait_for_timeout(1500)
        ok(len(PEDIDOS) == n0 + 1, "IA chamada UMA vez (ganchos + roteiro + fatos + legenda)")
        ok("até 30 eventos por ano" in PEDIDOS[-1] and "Por que transmitir" in PEDIDOS[-1], "a IA recebe o assunto e os fatos do usuário")
        ok(pg.locator("#ganchos .rl-gancho").count() == 3, "3 ganchos com nota na tela")
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas[0].texto").startswith("Seu evento termina"), "1º gancho já aplicado na cena 1")
        pg.click('#ganchos .rl-gancho[data-g="1"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas[0].texto") == "Sua live trava quando mais gente entra?", "trocar de gancho atualiza a cena 1")
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas.length") == 6, "gancho + 5 cenas da IA")
        ok(pg.input_value("#fLegenda").startswith("Seu evento não precisa"), "legenda do post preenchida")
        f30 = pg.evaluate("BWReels.projeto().fatos.filter(f=>f.afirmacao.indexOf('30')>=0).map(f=>f.fonte)")
        ok(f30 and all(x.startswith("interno") for x in f30), f"número informado pelo usuário já entra com fonte 'dados próprios' {f30}")
        # fontes
        pg.click("#btGanchoOk"); pg.wait_for_timeout(300)
        ok(pg.locator("#fatos .rl-fato").count() >= 2, "fatos listados para fonte (da IA + número do usuário)")
        v = pg.evaluate("BWReels.validar(false)")
        ok(any("fonte" in e for e in v["erros"]), "dado sem fonte BLOQUEIA o vídeo")
        pg.click("#btSemFonte"); pg.wait_for_timeout(400)
        cs = pg.evaluate("BWReels.projeto().roteiro.cenas.map(c=>c.tipo+':'+(c.valor||''))")
        ok("dado:87" not in cs and "dado:30" in cs, f"TIRAR O QUE NÃO TEM FONTE remove só o dado sem fonte {cs}")
        ok(not pg.evaluate("BWReels.validar(false)")["erros"], "depois disso o roteiro passa na validação")
        pg.click("#btFontesOk"); pg.wait_for_timeout(300)
        # estilo e formato
        pg.click('#estilos [data-e="neon"]'); pg.click('#formatos [data-f="4:5"]'); pg.wait_for_timeout(900)
        r = pg.evaluate("[BWReels.projeto().roteiro.estilo, BWReels.projeto().roteiro.formato]")
        ok(r == ["neon", "4:5"], f"estilo e formato trocados {r}")
        ok(pg.evaluate("document.querySelector('#quadro').style.width") == "1080px" and pg.evaluate("document.querySelector('#quadro').style.height") == "1350px", "prévia em 4:5 (1080x1350)")
        # editor de cena
        pg.click('#cenas .rl-cena[data-i="1"]'); pg.wait_for_timeout(300)
        ok(not pg.locator("#cenaForm").is_hidden(), "tocar na cena abre o editor (aba CENA)")
        pg.fill("#cTexto", "Texto editado na cena dois"); pg.fill("#cDur", "4"); pg.wait_for_timeout(500)
        c1 = pg.evaluate("BWReels.projeto().roteiro.cenas[1]")
        ok(c1.get("titulo") == "Texto editado na cena dois" and c1["duracao"] == 4, "texto e duração editados")
        n = pg.evaluate("BWReels.projeto().roteiro.cenas.length")
        pg.click("#cDup"); pg.wait_for_timeout(200); ok(pg.evaluate("BWReels.projeto().roteiro.cenas.length") == n + 1, "DUPLICAR")
        pg.click("#cDel"); pg.wait_for_timeout(200); ok(pg.evaluate("BWReels.projeto().roteiro.cenas.length") == n, "EXCLUIR (com confirmação)")
        pg.click('#cenas .rl-cena[data-i="1"]'); pg.click("#cDir"); pg.wait_for_timeout(200)
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas[2].titulo") == "Texto editado na cena dois", "MOVER ▶")
        # mídia
        pg.click('.rl-abas [data-aba="midia"]'); pg.set_input_files("#arquivos", VID); pg.wait_for_timeout(1800)
        ok(pg.locator("#midias .rl-midia").count() == 1, "mídia importada aparece na lista")
        pg.click('#midias [data-m="nova"]'); pg.wait_for_timeout(1200)
        cm = pg.evaluate("BWReels.projeto().roteiro.cenas.filter(c=>c.tipo==='midia').length")
        ok(cm == 1, "+ CENA cria cena com a filmagem")
        ok(pg.evaluate("!!document.querySelector('#quadro').contentDocument.querySelector('video')"), "a prévia mostra o vídeo importado")
        # tocar
        pg.evaluate("BWReels.posicionar(0)"); pg.click("#btPlay"); pg.wait_for_timeout(1300); pg.click("#btPlay")
        t = pg.evaluate("parseFloat(document.getElementById('tempo').textContent.replace(',','.'))")
        ok(t > 0.6, f"▶ toca a prévia (andou {t}s)")
        # recarregar mantém projeto e mídia
        pg.wait_for_timeout(800); pg.reload(); pg.wait_for_timeout(2200)
        ok(pg.evaluate("BWReels.projeto().roteiro.estilo") == "neon" and pg.locator("#cenas .rl-cena").count() >= 6, "recarregar: o projeto continua (salvo no aparelho)")
        pg.click('.rl-abas [data-aba="midia"]'); pg.wait_for_timeout(300)
        ok(pg.locator("#midias .rl-midia").count() == 1, "recarregar: a mídia continua (IndexedDB)")
        # exportar
        pg.click('.rl-abas [data-aba="exportar"]'); pg.wait_for_timeout(300)
        ok("Pronto para gerar" in pg.inner_text("#validacao"), "EXPORTAR: validação mostra pronto")
        with pg.expect_download() as dl: pg.click("#btPacote")
        caminho = f"{TMP}/pacote-{largura}.zip"; dl.value.save_as(caminho); pg.wait_for_timeout(500)
        ok(dl.value.suggested_filename.endswith(".bwreels.zip"), f"pacote baixado: {dl.value.suggested_filename}")
        z = zipfile.ZipFile(caminho); nomes = z.namelist(); rot = json.loads(z.read("roteiro.json"))
        ok("roteiro.json" in nomes and "bwreels.json" in nomes and any(n.startswith("midia/") for n in nomes), f"pacote tem roteiro + manifesto + mídia {nomes}")
        ok(all((c.get("midia") in nomes) for c in rot["cenas"] if c.get("midia")), "toda mídia citada no roteiro está no pacote")
        ok(rot["fontes"] and rot["fontes"][0]["url"].startswith("interno"), "fontes vão no roteiro")
        open(f"{TMP}/roteiro-{largura}.json", "w").write(json.dumps(rot))
        # GALERIA DE MODELOS (exemplos visuais) e PERSONAGENS
        pg.click("#btModelos"); pg.wait_for_timeout(500)
        ok(pg.locator("#glGrade .gl-mod").count() == 6, "MOTION DE TEXTO: 5 modelos + A IA CRIA PARA MIM")
        pg.wait_for_timeout(1200)
        ok(pg.evaluate("[...document.querySelectorAll('#glGrade video')].some(v=>v.src && !v.paused)"), "o vídeo de exemplo toca sozinho (mudo, em loop) quando aparece")
        faltam = pg.evaluate("""(async()=>{const m=window.BWReelsModelos;const ids=m.modelos.map(x=>x.id).concat(['demo-ia']);const r=[];for(const id of ids){for(const e of ['mp4','jpg']){const x=await fetch('assets/reels-exemplos/'+id+'.'+e,{method:'HEAD'});if(!x.ok)r.push(id+'.'+e)}}return r})()""")
        ok(not faltam, f"todo modelo tem vídeo e capa de exemplo {faltam}")
        pg.click('#glCats [data-cat="personagem"]'); pg.wait_for_timeout(400)
        ok(pg.locator("#glGrade .gl-mod").count() == 4, "HISTÓRIAS COM PERSONAGENS: 4 modelos")
        pg.click('#glGrade [data-usar="dialogo"]'); pg.wait_for_timeout(1600)
        r = pg.evaluate("BWReels.projeto().roteiro")
        ok(pg.locator("#folhaModelos").is_hidden() and r["cenas"][1]["tipo"] == "personagem" and len(r["cenas"][1]["elenco"]) == 2, "USAR abre um reel novo com o modelo (diálogo de 2 personagens)")
        ok(pg.evaluate("document.querySelector('#quadro').contentDocument.querySelectorAll('.ator svg').length") >= 1, "a prévia desenha o personagem (motor)")
        ok(not pg.evaluate("BWReels.validar(false)")["erros"], "modelo de personagem passa na validação")
        pg.click('#cenas .rl-cena[data-i="1"]'); pg.wait_for_timeout(400)
        ok(not pg.locator("#gPers").is_hidden() and pg.locator("#psA .ps-bt").count() == 6, "editor da cena: 6 personagens para escolher, com desenho")
        pg.click('#psB [data-id="robo"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas[1].elenco[1].personagem") == "robo", "trocar o personagem 2 (Robô)")
        pg.fill("#psFala1", "Robô também fala!"); pg.select_option("#psAcaoA", "comemora"); pg.select_option("#psCenario", "bolinhas"); pg.wait_for_timeout(500)
        c = pg.evaluate("BWReels.projeto().roteiro.cenas[1]")
        ok(c["falas"][1]["texto"] == "Robô também fala!" and c["elenco"][0].get("acao") == "comemora" and c["cenario"] == "bolinhas", f"falas, ação e cenário editados {c.get('falas')}")
        pg.click('#psB [data-id=""]'); pg.wait_for_timeout(300)
        c = pg.evaluate("BWReels.projeto().roteiro.cenas[1]")
        ok(len(c["elenco"]) == 1 and all(f["quem"] == 0 for f in c.get("falas", [])), "tirar o personagem 2: as falas passam para o 1")
        pg.click('#cenas .rl-cena[data-i="3"]'); pg.select_option("#cTipo", "personagem"); pg.wait_for_timeout(400)
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas[3].tipo") == "personagem" and pg.evaluate("BWReels.projeto().roteiro.cenas[3].balao"), "trocar o tipo de uma cena para Personagem já vem com o Bê e um balão")
        norm = pg.evaluate("""BWReels.normalizarCenas([{tipo:'personagem',duracao:3,elenco:[{personagem:'xuxa',acao:'voa'},{personagem:'ana',acao:'pensa'},{personagem:'leo'}],falas:[{quem:1,texto:'oi tudo bem'},{quem:5,texto:''}],cenario:'lua'},{tipo:'cta',duracao:3,texto:'x',acao:'y'}])""")
        ok(norm[0]["elenco"] == [{"personagem": "be"}, {"personagem": "ana", "acao": "pensa"}] and norm[0]["falas"] == [{"quem": 1, "texto": "oi tudo bem"}] and norm[0]["cenario"] == "raios",
           f"resposta da IA com personagem/ação/cenário inexistente é corrigida {norm[0]}")
        # personagem com IA (fontes externas)
        pg.click("#btModelos"); pg.wait_for_timeout(300); pg.click('#glCats [data-cat="ia"]'); pg.wait_for_timeout(400)
        ok(not pg.locator("#glIA").is_hidden() and pg.locator("#glFerr li").count() == 4, "PERSONAGEM COM IA: passo a passo + 4 ferramentas")
        pg.fill("#iaNome", "Duda"); pg.fill("#iaAparencia", "mascote câmera de olhos grandes"); pg.fill("#iaAcao", "acena para a câmera"); pg.fill("#iaFala", "Bora pro ao vivo!")
        pi, pv = pg.input_value("#iaPImg"), pg.input_value("#iaPVid")
        ok("Duda" in pi and "Character sheet" in pi and "original" in pi, "prompt da IMAGEM montado (ficha original do personagem)")
        ok("same character" in pv and "9:16" in pv and '"Bora pro ao vivo!"' in pv, "prompt do VÍDEO com referência, 9:16 e a fala")
        pg.click('#glGrade [data-usar="ia-montagem"]'); pg.wait_for_timeout(1500)
        ok(pg.evaluate("BWReels.projeto().roteiro.cenas.filter(c=>c.tipo==='midia').length") == 3 and not pg.locator("#pnMidia").is_hidden(), "modelo de IA abre na aba MÍDIA, com 3 cenas para os clipes")
        # motor e meus reels
        pg.click("#btMotor"); pg.wait_for_timeout(200)
        ok(pg.locator('#folhaMotor a[href="downloads/BW-Reels-Studio.zip"]').count() == 1 and pg.locator('#folhaMotor a[href="downloads/BW-Reels-Studio-Tutorial.pdf"]').count() == 1, "⚙ MOTOR NO PC: baixar motor + tutorial")
        pg.keyboard.press("Escape")
        pg.click("#btMeus"); pg.wait_for_timeout(400)
        ok(pg.locator("#listaMeus li").count() >= 1, "MEUS REELS lista o projeto")
        pg.click("#btFecharMeus")
        larg = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(larg <= 0, f"sem estouro horizontal no fim ({larg}px)")
        ok(not erros, f"nenhum erro de JS no caminho {erros[:3]}")
        pg.screenshot(path=f"{TMP}/reels-{largura}.png")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
