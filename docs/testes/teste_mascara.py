#!/usr/bin/env python3
"""Teste local da MÁSCARA COM IA e dos MODELOS do EDITOR DE VÍDEO (21/11).
A IA é SIMULADA (window.__BWMascaraTeste: "pessoa" = pixel vermelho) — regra 49: máscara falsa conferida pixel a pixel; o modelo real é
testado no ar. Vídeo de teste: fundo azul com um retângulo vermelho (a "pessoa") no meio.
Confere: ANALISAR acha a pessoa em todos os quadros e guarda (volta ao recarregar); TEXTO ATRÁS da pessoa (pixel do meio continua vermelho,
o texto aparece fora dela); texto "Na frente" fica por cima; FUNDO preto e branco / sem fundo / desfocado; CONTORNO DE LUZ; ANEL girando sem erro;
o vídeo EXPORTADO sai com o texto atrás da pessoa; MODELOS: galeria com prévias, ▶ VER abre e toca, espaços TAKE N, faixa "faltam N",
tocar no espaço e depois num vídeo troca, ⚡ PREENCHER SOZINHO, campos de texto, ✎ TEXTOS, ★ salvar como modelo, ⬇/⬆ .json, ↺ projeto anterior,
modelo COM A PESSOA aplicado no take; nada sai do aparelho. 1280 e 390 px.   Uso (na raiz): python3 docs/testes/teste_mascara.py"""
import base64, http.server, json, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_mascara"; PORTA = 8866
os.makedirs(TMP, exist_ok=True)
if not os.path.exists(f"{TMP}/pessoa.webm"):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=0x1e3cdc:size=360x640:rate=25:duration=3", "-vf", "drawbox=x=120:y=180:w=120:h=420:color=0xd21e1e:t=fill",
                    "-c:v", "libvpx", "-b:v", "900k", f"{TMP}/pessoa.webm"], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x568:rate=25:duration=12", "-c:v", "libvpx", "-b:v", "300k", f"{TMP}/longo.webm"], check=True)
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
FALSA = """window.__BWMascaraTeste=function(c){const x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,o=new Uint8Array(c.width*c.height);
  for(let i=0;i<o.length;i++){const r=d[i*4],g=d[i*4+1],b=d[i*4+2];o[i]=(r>140&&g<90&&b<90)?255:0;}window.__mascChamadas=(window.__mascChamadas||0)+1;return {w:c.width,h:c.height,dados:o};};"""
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
PX = "((fx,fy)=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(Math.round(fx*c.width),Math.round(fy*c.height),1,1).data;return [d[0],d[1],d[2]]})"
def perto(a, b, t=45): return all(abs(x - y) <= t for x, y in zip(a, b))
CONTA = "((x0,x1,y0,y1)=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(Math.round(x0*c.width),Math.round(y0*c.height),Math.max(1,Math.round((x1-x0)*c.width)),Math.max(1,Math.round((y1-y0)*c.height))).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]>220&&d[i+1]>220&&d[i+2]>220)n++;return n})"
VID = "__video.P().clips.find(c=>c.tipo==='video')"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ==="); cel = largura < 500
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=cel, accept_downloads=True); ctx.route("**/*", rota); ctx.add_init_script(FALSA)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept(d.default_value) if d.type == "prompt" else d.accept())
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(500)
        ok(pg.evaluate("!!window.BWMascara && !!window.VEModelos") and pg.locator("#veModelos").count() == 1, "módulos de máscara e de modelos carregados; botão 🎬 MODELOS no topo")
        pg.set_input_files("#veArq", [f"{TMP}/pessoa.webm"]); pg.wait_for_function("Object.keys(__video.MID).length >= 1", timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(300)
        pg.evaluate(f"(()=>{{const c={VID};c.dur=1.6;__video.sel(c.id);__video.irPara(0.8)}})()"); pg.wait_for_timeout(700)
        h = pg.locator('#vePropCorpo h4[data-seta="ve-ia"]'); ok(h.count() == 1, "o take ganha a seção PESSOA E FUNDO (IA)")
        if not pg.locator('#vePropCorpo [data-acao="iaAnalisar"]').is_visible(): h.click(); pg.wait_for_timeout(200)
        pg.locator('#vePropCorpo [data-acao="iaAnalisar"]').click(); pg.wait_for_function(f"BWMascara.tem({VID}.mid)", timeout=30000); pg.wait_for_timeout(500)
        inf = pg.evaluate(f"BWMascara.info({VID}.mid)"); ok(inf and inf["quadros"] >= 30 and pg.evaluate(f"{VID}.ia.frente") is True, f"🧠 ANALISAR acha a pessoa em cada quadro ({inf['quadros'] if inf else 0} quadros, {inf['fps'] if inf else 0}/s) e já liga PESSOA NA FRENTE")
        # TEXTO ATRÁS: texto grande branco em cima de onde está a pessoa
        pg.evaluate("(()=>{const P=__video.P();P.clips.push({id:'tx1',trilha:'tx',tipo:'texto',ini:0,dur:1.6,txt:'MMMMMM',fonte:'Inter',tam:14,cor:'#ffffff',fundo:'',x:0,y:0,op:100,fin:0,fout:0});__video.tudo();__video.irPara(0.8)})()"); pg.wait_for_timeout(500)
        dentro, fora = pg.evaluate(CONTA + "(0.36,0.64,0.4,0.6)"), pg.evaluate(CONTA + "(0.02,0.33,0.4,0.6)")
        ok(dentro == 0, f"TEXTO ATRÁS DA PESSOA: em cima da pessoa nenhum pixel do texto aparece ({dentro})")
        ok(fora > 200, f"…e fora da pessoa o texto branco aparece ({fora} pixels)")
        pg.evaluate("(()=>{const t=__video.P().clips.find(c=>c.id==='tx1');t.frente=true;__video.tudo();__video.irPara(0.8)})()"); pg.wait_for_timeout(400)
        ok(pg.evaluate(CONTA + "(0.36,0.64,0.4,0.6)") > 200, "texto marcado NA FRENTE fica por cima da pessoa")
        pg.evaluate("(()=>{const t=__video.P().clips.find(c=>c.id==='tx1');t.frente=false;__video.tudo()})()")
        # FUNDOS
        def fundo(f):
            pg.evaluate(f"(()=>{{const c={VID};c.ia.fundo='{f}';__video.P().clips=__video.P().clips.filter(x=>x.id!=='tx1'||'{f}'==='');__video.tudo();__video.irPara(0.8)}})()"); pg.wait_for_timeout(400)
            return pg.evaluate(PX + "(0.12,0.12)"), pg.evaluate(PX + "(0.5,0.6)")
        pbf, pbp = fundo("pb"); ok(max(pbf) - min(pbf) < 18 and perto(pbp, [210, 30, 30], 60), f"FUNDO 'cor só na pessoa': fundo cinza {pbf}, pessoa vermelha {pbp}")
        sf, sp = fundo("sem"); ok(sum(sf) < 40 and perto(sp, [210, 30, 30], 60), f"SEM FUNDO: o fundo some (fica o que está embaixo, aqui o preto) {sf}")
        df, dp = fundo("escuro"); ok(sum(df) < sum([30, 60, 220]) * 0.65 and perto(dp, [210, 30, 30], 60), f"FUNDO ESCURECIDO {df}")
        fundo("")
        pg.evaluate(f"(()=>{{const c={VID};c.ia.contorno=true;c.ia.contornoCor='#00ff00';c.ia.suave=0;__video.tudo();__video.irPara(0.8)}})()"); pg.wait_for_timeout(400)
        borda = pg.evaluate("(()=>{const c=document.getElementById('veCv'),x=c.getContext('2d');let mx=0;for(let k=0;k<30;k++){const d=x.getImageData(Math.round(c.width*(0.32+k*0.002)),Math.round(c.height*0.6),1,1).data;mx=Math.max(mx,d[1]-Math.max(d[0],d[2]));}return mx})()")
        ok(borda > 40, f"CONTORNO DE LUZ verde aparece em volta da pessoa (verde a mais: {borda})")
        pg.evaluate(f"(()=>{{const c={VID};c.ia.contorno=false;const P=__video.P();P.clips.push({{id:'an1',trilha:'tx',tipo:'texto',ini:0,dur:1.6,txt:'ANEL',fonte:'Inter',tam:6,cor:'#ffff00',fundo:'',x:0,y:0,op:100,fin:0,fout:0,anima:'anel',raio:40}});__video.tudo();__video.irPara(0.5)}})()"); pg.wait_for_timeout(400)
        am = pg.evaluate("(()=>{const c=document.getElementById('veCv'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=16)if(d[i]>200&&d[i+1]>200&&d[i+2]<90)n++;return n})()")
        ok(am > 20 and not erros, f"ANEL DE TEXTO GIRANDO desenha as letras em volta ({am} pontos amarelos) sem erro")
        pg.evaluate("__video.P().clips=__video.P().clips.filter(c=>c.id!=='an1')")
        # painel do texto: movimento + frente/atrás
        pg.evaluate("(()=>{const P=__video.P();P.clips.push({id:'tx2',trilha:'tx',tipo:'texto',ini:0,dur:1.6,txt:'TÍTULO',fonte:'Inter',tam:10,cor:'#ffffff',fundo:'',x:0,y:0,op:100,fin:0,fout:0});__video.sel('tx2')})()"); pg.wait_for_timeout(300)
        ok(pg.locator('#vePropCorpo [data-p="anima"]').count() == 1 and pg.locator('#vePropCorpo [data-frente]').count() == 2, "texto: escolha de MOVIMENTO (8) e ATRÁS / NA FRENTE da pessoa")
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"anima\"]');e.value='anel';e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(300)
        ok(pg.locator('#vePropCorpo [data-p="raio"]').count() == 1, "movimento ANEL mostra tamanho e velocidade do giro")
        # EXPORTAR com texto atrás
        if not cel:
            pg.evaluate("(()=>{const P=__video.P();P.clips=P.clips.filter(c=>c.id!=='tx2');P.clips.push({id:'tx3',trilha:'tx',tipo:'texto',ini:0,dur:1.6,txt:'MMMMMM',fonte:'Inter',tam:14,cor:'#ffffff',fundo:'',x:0,y:0,op:100,fin:0,fout:0});__video.sel(null)})()"); pg.wait_for_timeout(300)
            pg.click("#veExportar"); pg.wait_for_selector("#veJanExp", timeout=3000); pg.click('[data-exaba="prontos"]'); pg.click('[data-pronto="master"]'); pg.click("#veExIr"); pg.wait_for_selector("#veSaida:not([hidden])", timeout=40000)
            d = pg.evaluate("(async()=>{const b=window.__veSaida.blob;const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return [btoa(s),window.__veSaida.nome]})()")
            arq = f"{TMP}/saida." + d[1].split(".")[-1]; open(arq, "wb").write(base64.b64decode(d[0])); pg.evaluate("document.getElementById('veSaida').hidden=true")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.8", "-i", arq, "-frames:v", "1", f"{TMP}/q.png"])
            from PIL import Image
            q = Image.open(f"{TMP}/q.png").convert("RGB"); w, hh = q.size
            def br(x0, x1): return sum(1 for x in range(int(w * x0), int(w * x1)) for y in range(int(hh * 0.4), int(hh * 0.6), 2) if min(q.getpixel((x, y))) > 200)
            ok(br(0.38, 0.62) < 15 and br(0.02, 0.33) > 100, f"no VÍDEO EXPORTADO o texto passa atrás da pessoa (texto em cima dela: {br(0.38, 0.62)}, fora dela: {br(0.02, 0.33)})")
        # recarregar: máscara guardada no aparelho
        pg.wait_for_timeout(600); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(1200)
        ok(pg.evaluate(f"BWMascara.tem({VID}.mid)") and pg.evaluate("window.__mascChamadas||0") == 0, "recarregou: a análise volta do aparelho, sem rodar a IA de novo")
        # MODELO COM A PESSOA no take
        pg.evaluate(f"__video.sel({VID}.id)"); pg.click("#veModelos"); pg.wait_for_timeout(300); pg.locator('#vmAbas [data-aba="mascara"]').click(); pg.wait_for_timeout(300)
        ok(pg.locator("#vmCorpo .vm-card").count() >= 8 and pg.locator("#vmCorpo canvas[data-prev]").count() >= 8, f"MODELOS COM A PESSOA: {pg.locator('#vmCorpo .vm-card').count()} modelos com prévia animada")
        n0 = pg.evaluate("__video.P().clips.filter(c=>c.tipo==='texto').length")
        pg.locator('#vmCorpo [data-usarmasc="1"]').click(); pg.wait_for_timeout(200); pg.locator('#vmCorpo [data-campo="TEXTO"]').fill("BW EVENTOS"); pg.locator('#vmCorpo [data-confirmar]').click(); pg.wait_for_timeout(500)
        an = pg.evaluate("__video.P().clips.filter(c=>c.tipo==='texto'&&c.anima==='anel')")
        ok(len(an) >= 1 and an[-1]["txt"] == "BW EVENTOS" and pg.locator("#vmFolha").is_hidden(), "USAR NESTE TAKE: o ANEL com o texto digitado entra no take")
        # EDIÇÕES PRONTAS
        pg.click("#veModelos"); pg.locator('#vmAbas [data-aba="edicao"]').click(); pg.wait_for_timeout(500)
        nc = pg.locator("#vmCorpo .vm-card").count(); ok(nc >= 12, f"EDIÇÕES PRONTAS: {nc} modelos (aftermovie, reels, corporativo, casamento, show, telão…)")
        cv0 = pg.evaluate("(()=>{const c=document.querySelector('#vmCorpo canvas[data-prev]');return c.toDataURL().length})()"); pg.wait_for_timeout(700)
        cv1 = pg.evaluate("(()=>{const c=document.querySelector('#vmCorpo canvas[data-prev]');return c.toDataURL().length})()")
        ok(cv0 != cv1, "a prévia de cada modelo se mexe (dá para assistir na galeria)")
        pg.locator('#vmCorpo .vm-chips [data-filtro="casamento"]').click(); pg.wait_for_timeout(200); ok(pg.locator("#vmCorpo .vm-card").count() == 1, "filtro por tipo (CASAMENTO = 1)")
        pg.locator('#vmCorpo .vm-chips [data-filtro="tudo"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vmCorpo [data-ver="after30"]').click(); pg.wait_for_timeout(2500)
        tot = pg.evaluate("__video.total()"); nph = pg.evaluate("__video.P().clips.filter(c=>c.ph).length")
        ok(nph == 51 and 27 < tot < 31 and pg.evaluate("__video.P().clips.some(c=>c.phMusica)"), f"▶ VER abre o AFTERMOVIE 30 s: {nph} espaços TAKE N, {tot:.1f} s, música da casa")
        ok(pg.locator("#vmFaixa").is_visible() and "faltam 51" in pg.inner_text("#vmFaixa"), "faixa do modelo: faltam 51 takes")
        ok(pg.evaluate("__video.P().clips.filter(c=>c.ph).every(c=>!document.querySelector('#veLib [data-mid=\"'+c.mid+'\"]'))"), "os espaços não enchem a biblioteca de mídia")
        # trocar um espaço tocando nele e depois num vídeo
        pg.set_input_files("#veArq", [f"{TMP}/longo.webm"]); pg.wait_for_function("Object.values(__video.MID).some(m=>m.nome.indexOf('longo')>=0)", timeout=15000); pg.wait_for_timeout(300)
        sid = pg.evaluate("__video.P().clips.filter(c=>c.ph).sort((a,b)=>a.ini-b.ini)[4].id"); pg.evaluate(f"__video.sel('{sid}')"); pg.wait_for_timeout(200)
        lid = pg.evaluate("Object.values(__video.MID).find(m=>m.nome.indexOf('longo')>=0).id"); pg.evaluate(f"document.querySelector('#veLib [data-mid=\"{lid}\"]').click()"); pg.wait_for_timeout(400)
        tc = pg.evaluate(f"__video.P().clips.find(c=>c.id==='{sid}')"); ok(tc["mid"] == lid and not tc.get("ph") and tc["corte"] >= 4 - 0.01 and tc["vol"] == 0, f"tocar no TAKE e depois num vídeo troca o espaço (corte a partir do 4º segundo: {tc['corte']}, som do take 0 = só a música)")
        ok(pg.evaluate("__video.selAtual() && __video.selAtual().ph") is not None, "…e já escolhe o próximo espaço vazio")
        pg.locator('#vmFaixa [data-f="auto"]').click(); pg.wait_for_timeout(600)
        ok(pg.evaluate("__video.P().clips.filter(c=>c.ph).length") == 0 and "todos os takes" in pg.inner_text("#vmFaixa"), "⚡ PREENCHER SOZINHO coloca os vídeos em todos os espaços")
        # ↺ projeto anterior (o projeto com a pessoa)
        pg.locator('#vmFaixa [data-f="volta"]').click(); pg.wait_for_timeout(800)
        ok(pg.evaluate("__video.P().clips.some(c=>c.tipo==='video'&&c.ia)") and not pg.evaluate("__video.P().modelo"), "↺ PROJETO ANTERIOR devolve o projeto que estava aberto")
        # USAR com campos
        pg.click("#veModelos"); pg.locator('#vmCorpo [data-usar="casamento40"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vmCorpo [data-campo="NOIVOS"]').fill("MARIA & JOÃO"); pg.locator('#vmCorpo [data-confirmar]').click(); pg.wait_for_timeout(2000)
        ok(pg.evaluate("__video.P().clips.some(c=>c.txt==='MARIA & JOÃO')"), "USAR pede os textos (nome do casal) e já põe no vídeo")
        pg.locator('#vmFaixa [data-f="textos"]').click(); pg.wait_for_timeout(300); pg.locator('#vmCorpo [data-campo="NOIVOS"]').fill("ANA & PEDRO"); pg.click("#vmTextosOk"); pg.wait_for_timeout(300)
        ok(pg.evaluate("__video.P().clips.some(c=>c.txt==='ANA & PEDRO')") and not pg.evaluate("__video.P().clips.some(c=>c.txt==='MARIA & JOÃO')"), "✎ TEXTOS troca o texto em todo o modelo")
        # recarregar com espaços vazios: eles são refeitos (não viram "arquivo que falta")
        pg.wait_for_timeout(600); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(2500)
        ok(pg.evaluate("__video.P().clips.filter(c=>c.ph).length") == 12 and pg.evaluate("__video.P().clips.filter(c=>c.ph).every(c=>!!__video.MID[c.mid])") and pg.locator("#vmFaixa").is_visible(), "recarregou: os espaços do modelo são refeitos e a faixa volta")
        # MEUS MODELOS
        pg.click("#veModelos"); pg.locator('#vmAbas [data-aba="meus"]').click(); pg.wait_for_timeout(200); pg.locator('#vmCorpo [data-acao="salvarMeu"]').click(); pg.wait_for_timeout(400)
        meus = pg.evaluate("VEModelos.meus()"); ok(len(meus) == 1 and len(meus[0]["espacos"]) == 12 and any("{NOIVOS}" in t["txt"] for t in meus[0]["textos"]), "★ SALVAR COMO MODELO: os takes viram espaços e os textos guardam os campos")
        with pg.expect_download() as dl: pg.locator("#vmCorpo [data-baixar]").first.click()
        caminho = dl.value.path(); dados = json.load(open(caminho, encoding="utf-8")); ok(dados["nome"] and len(dados["espacos"]) == 12, "⬇ baixa o modelo em .json (para mandar à BW incluir na biblioteca)")
        pg.set_input_files("#vmArq", caminho); pg.wait_for_timeout(400); ok(len(pg.evaluate("VEModelos.meus()")) == 2, "⬆ IMPORTAR MODELO traz o .json de volta")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "galeria sem estouro na largura")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200); ok(pg.locator("#vmFolha").is_hidden(), "Esc fecha a galeria")
        ok(not erros, f"0 erros de JS {erros[:2]}"); ok(not FORA, f"nada saiu do aparelho {FORA[:2]}")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
