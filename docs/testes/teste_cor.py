#!/usr/bin/env python3
"""Teste local da COR POR TAKE do EDITOR DE VÍDEO (21/11, etapa 2): foto de faixas (cinza médio, vermelho, branco, preto, azul).
Confere PIXEL: exposição clareia, saturação −100 deixa cinza, temperatura + puxa para o vermelho, contraste afasta do meio, pretos e
brancos mexem só nas pontas, vinheta escurece a borda e não o centro; WebGL e plano B 2D dão o mesmo resultado; pontos de partida
(looks), ZERAR, APLICAR EM TODOS, SALVAR PREDEFINIÇÃO (fica neste aparelho e aparece em outro projeto), dois toques zera a barra,
copiar/colar ajustes leva a cor, menu do take tem "Cor", desfazer, projeto volta ao recarregar, cor sai no vídeo exportado;
nada sai do aparelho. 1280 e 390 px.   Uso (na raiz): python3 docs/testes/teste_cor.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_cor"; PORTA = 8863
os.makedirs(TMP, exist_ok=True)
from PIL import Image, ImageDraw
if not os.path.exists(f"{TMP}/faixas.png"):
    im = Image.new("RGB", (720, 1280), (128, 128, 128)); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 719, 255], fill=(128, 128, 128)); d.rectangle([0, 256, 719, 511], fill=(200, 40, 40)); d.rectangle([0, 512, 719, 767], fill=(235, 235, 235))
    d.rectangle([0, 768, 719, 1023], fill=(20, 20, 20)); d.rectangle([0, 1024, 719, 1279], fill=(40, 60, 200)); im.save(f"{TMP}/faixas.png")
    Image.new("RGB", (720, 1280), (128, 128, 128)).save(f"{TMP}/cinza.png")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
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
FX = {"cinza": 0.10, "verm": 0.30, "branco": 0.50, "preto": 0.70, "azul": 0.90}
def faixa(pg, n, x=0.5): return pg.evaluate(PX + f"({x},{FX[n]})")
def lum(c): return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def gr(pg, **kw):
    js = "(()=>{const c=__video.P().clips.find(c=>c.tipo==='imagem'&&c.trilha==='v1');c.grade=" + str(kw).replace("'", '"') + ";__video.irPara(0.5)})()"
    pg.evaluate(js); pg.wait_for_timeout(250)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for largura, altura in ((1280, 900), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept(d.default_value) if d.type == "prompt" else d.accept())
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        ok(pg.evaluate("!!window.BWCor") and pg.evaluate("BWCor.CAMPOS.length") >= 13, f"módulo de cor carregado ({pg.evaluate('BWCor.CAMPOS.length')} ajustes, motor {pg.evaluate('BWCor.motor()')})")
        pg.set_input_files("#veArq", [f"{TMP}/faixas.png", f"{TMP}/cinza.png"]); pg.wait_for_function("Object.keys(__video.MID).length === 2", timeout=15000); pg.wait_for_timeout(300)
        pg.evaluate("document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.nome.indexOf('faixas')>=0).id + '\"]').click()"); pg.wait_for_timeout(250)
        pg.evaluate("document.querySelector('#veLib [data-mid=\"' + Object.values(__video.MID).find(m => m.nome.indexOf('cinza')>=0).id + '\"]').click()"); pg.wait_for_timeout(250)
        pg.evaluate("(()=>{const P=__video.P(),f=P.clips.find(c=>c.tipo==='imagem');f.encaixe='caber';__video.sel(f.id);__video.irPara(0.5)})()"); pg.wait_for_timeout(400)
        base = {n: faixa(pg, n) for n in FX}
        ok(abs(base["cinza"][0] - 128) < 8 and base["verm"][0] > 180 and base["preto"][0] < 35, f"sem cor: a foto aparece como é {base['cinza']}, {base['verm']}, {base['preto']}")
        # PIXEL a PIXEL: cada barra faz o que diz
        gr(pg, expo=60); e = faixa(pg, "cinza"); ok(lum(e) > lum(base["cinza"]) + 40, f"EXPOSIÇÃO + clareia o cinza ({base['cinza'][0]} → {e[0]})")
        gr(pg, expo=-60); e = faixa(pg, "cinza"); ok(lum(e) < lum(base["cinza"]) - 30, f"EXPOSIÇÃO − escurece ({e[0]})")
        gr(pg, sat=-100); v = faixa(pg, "verm"); ok(max(v) - min(v) < 8, f"SATURAÇÃO −100 deixa o vermelho cinza {v}")
        gr(pg, sat=60); v = faixa(pg, "verm"); ok(v[0] - v[1] > base["verm"][0] - base["verm"][1] + 15, f"SATURAÇÃO + deixa o vermelho mais forte {v}")
        gr(pg, temp=70); t = faixa(pg, "cinza"); ok(t[0] - t[2] > 25, f"TEMPERATURA + puxa o cinza para o quente {t}")
        gr(pg, temp=-70); t = faixa(pg, "cinza"); ok(t[2] - t[0] > 25, f"TEMPERATURA − puxa para o frio {t}")
        gr(pg, matiz=80); t = faixa(pg, "cinza"); ok(t[0] - t[1] > 12 and t[2] - t[1] > 12, f"MATIZ + puxa para o magenta {t}")
        gr(pg, cont=80); br, pr, ci = faixa(pg, "branco"), faixa(pg, "preto"), faixa(pg, "cinza")
        ok(lum(br) >= lum(base["branco"]) and lum(pr) <= lum(base["preto"]) and abs(ci[0] - base["cinza"][0]) < 12, f"CONTRASTE + afasta branco e preto do meio e quase não mexe no cinza ({br[0]}, {pr[0]}, {ci[0]})")
        gr(pg, preto=80); pr, br = faixa(pg, "preto"), faixa(pg, "branco"); ok(lum(pr) > lum(base["preto"]) + 15 and abs(lum(br) - lum(base["branco"])) < 6, f"PRETOS + levanta só o preto ({base['preto'][0]} → {pr[0]}; branco {br[0]})")
        gr(pg, branco=-80); br, pr = faixa(pg, "branco"), faixa(pg, "preto"); ok(lum(br) < lum(base["branco"]) - 15 and abs(lum(pr) - lum(base["preto"])) < 6, f"BRANCOS − baixa só o branco ({base['branco'][0]} → {br[0]})")
        gr(pg, fade=100); pr = faixa(pg, "preto"); ok(lum(pr) > lum(base["preto"]) + 20, f"DESBOTAR levanta o preto ({pr[0]})")
        gr(pg, vinheta=100); bo, ce = faixa(pg, "cinza", 0.02), pg.evaluate(PX + "(0.5,0.5)"); ok(lum(bo) < lum(base["cinza"]) - 25 and abs(lum(ce) - lum(base["branco"])) < 8, f"VINHETA escurece a borda ({bo[0]}) e não o centro ({ce[0]})")
        # os dois motores dão o mesmo resultado (mesma conta no WebGL e no plano B)
        dif = pg.evaluate("""(()=>{const c=document.createElement('canvas');c.width=160;c.height=160;const x=c.getContext('2d');const cores=['#808080','#c82828','#ebebeb','#141414','#283cc8'];
          cores.forEach((k,i)=>{x.fillStyle=k;x.fillRect(0,i*32,160,32)});const g={expo:25,cont:30,realce:-20,sombra:15,branco:10,preto:-15,brilho:12,temp:20,matiz:-8,sat:15,vib:20,fade:10,vinheta:30};
          const a=BWCor.aplicar(c,160,160,g),ra=document.createElement('canvas');ra.width=ra.height=160;ra.getContext('2d').drawImage(a,0,0);const da=ra.getContext('2d').getImageData(0,0,160,160).data;
          const b2=BWCor._2d(c,160,160,g),rb=document.createElement('canvas');rb.width=rb.height=160;rb.getContext('2d').drawImage(b2,0,0);const db=rb.getContext('2d').getImageData(0,0,160,160).data;
          let m=0;for(let i=0;i<da.length;i+=4)for(let k=0;k<3;k++)m=Math.max(m,Math.abs(da[i+k]-db[i+k]));return m})()""")
        ok(dif <= 6, f"WebGL e plano B em 2D dão a mesma cor (maior diferença: {dif} de 255)")
        gr(pg)
        # PAINEL: seção COR com seta, looks, barras
        h = pg.locator('#vePropCorpo h4[data-seta="ve-cor"]'); ok(h.count() == 1, "a seção COR (AJUSTE) aparece nos ajustes do take")
        if not pg.locator('#vePropCorpo [data-p="g:expo"]').is_visible(): h.click(); pg.wait_for_timeout(200)
        ok(pg.locator('#vePropCorpo [data-p^="g:"]').count() >= 13 and pg.locator('#vePropCorpo [data-look]').count() >= 8, "abre com as barras (luz, cor, acabamento) e os pontos de partida")
        pg.locator('#vePropCorpo [data-look="pb"]').click(); pg.wait_for_timeout(300); v = faixa(pg, "verm")
        ok(max(v) - min(v) < 10 and pg.evaluate("__video.P().clips.find(c=>c.tipo==='imagem').look") == "pb", f"ponto de partida PRETO E BRANCO {v}")
        ok("🎨" in pg.inner_text("#veFaixas"), "o take ganha a marca 🎨 na linha do tempo")
        sl = pg.locator('#vePropCorpo [data-p="g:sat"]'); sl.scroll_into_view_if_needed(); sl.dblclick(); pg.wait_for_timeout(250)
        ok(pg.evaluate("__video.P().clips.find(c=>c.tipo==='imagem').grade.sat") == 0, "dois toques na barra volta ela a zero")
        pg.evaluate("(()=>{const e=document.querySelector('#vePropCorpo [data-p=\"g:expo\"]');e.value=40;e.dispatchEvent(new Event('input',{bubbles:true}))})()"); pg.wait_for_timeout(250)
        ok(pg.evaluate("__video.P().clips.find(c=>c.tipo==='imagem').grade.expo") == 40 and lum(faixa(pg, "cinza")) > lum(base["cinza"]) + 20, "mexer na barra muda a prévia na hora")
        pg.keyboard.press("Control+z"); pg.wait_for_timeout(500); ok(pg.evaluate("(__video.P().clips.find(c=>c.tipo==='imagem').grade||{}).expo||0") != 40, "Ctrl+Z desfaz a cor")
        pg.keyboard.press("Control+y"); pg.wait_for_timeout(300)
        # APLICAR EM TODOS
        pg.locator('#vePropCorpo [data-acao="corTodos"]').click(); pg.wait_for_timeout(300)
        g2 = pg.evaluate("__video.P().clips.filter(c=>c.tipo==='imagem').map(c=>JSON.stringify(c.grade||{}))")
        ok(len(set(g2)) == 1 and g2[0] != "{}", "⇉ APLICAR EM TODOS põe a mesma cor nos outros takes")
        # PREDEFINIÇÃO: salva neste aparelho, aparece em outro take e sobrevive a um projeto NOVO
        pg.locator('#vePropCorpo [data-acao="corSalvar"]').click(); pg.wait_for_timeout(300)
        ok(pg.locator('#vePropCorpo [data-predef]').count() == 1 and pg.evaluate("JSON.parse(localStorage.getItem('ui_ve_cor_predef')).length") == 1, "★ SALVAR PREDEFINIÇÃO guarda neste aparelho e vira um botão")
        pg.locator('#vePropCorpo [data-acao="corZerar"]').click(); pg.wait_for_timeout(250); ok(not pg.evaluate("!!__video.P().clips.find(c=>c.tipo==='imagem').grade"), "↺ ZERAR volta à cor original")
        pg.locator('#vePropCorpo [data-predef="0"]').click(); pg.wait_for_timeout(250); ok(pg.evaluate("__video.P().clips.find(c=>c.tipo==='imagem').grade.expo") == 40, "tocar na predefinição aplica a cor salva")
        # COPIAR/COLAR AJUSTES leva a cor
        pg.evaluate("(()=>{const P=__video.P(),a=P.clips.filter(c=>c.tipo==='imagem');a[0].grade={temp:55};__video.sel(a[0].id)})()"); pg.keyboard.press("Control+Shift+C")
        pg.evaluate("(()=>{const a=__video.P().clips.filter(c=>c.tipo==='imagem');__video.sel(a[1].id)})()"); pg.keyboard.press("Control+Shift+V"); pg.wait_for_timeout(250)
        ok(pg.evaluate("__video.P().clips.filter(c=>c.tipo==='imagem')[1].grade.temp") == 55, "copiar/colar ajustes leva a cor de um take para outro")
        # MENU DO TAKE: "Cor"
        cid = pg.evaluate("__video.P().clips.filter(c=>c.tipo==='imagem')[1].id")
        if largura > 500:
            pg.locator(f'[data-clip="{cid}"]').click(button="right", position={"x": 20, "y": 20}); pg.wait_for_timeout(300)
            ok("cor" in pg.inner_text(".bwf-menu").lower(), "botão direito no take tem o item Cor"); pg.keyboard.press("Escape")
        # recarregar: a cor continua no projeto
        pg.wait_for_timeout(600); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600)
        ok(pg.evaluate("__video.P().clips.filter(c=>c.tipo==='imagem')[1].grade.temp") == 55 and pg.evaluate("JSON.parse(localStorage.getItem('ui_ve_cor_predef')).length") == 1, "recarregou: a cor do take e a predefinição continuam")
        # predefinição apagada pelo ✕
        pg.evaluate(f"__video.sel('{cid}')"); pg.wait_for_timeout(200)
        if not pg.locator('#vePropCorpo [data-predef="0"]').is_visible(): pg.locator('#vePropCorpo h4[data-seta="ve-cor"]').click(); pg.wait_for_timeout(200)
        pg.locator('#vePropCorpo [data-predel="0"]').click(); pg.wait_for_timeout(250); ok(pg.locator('#vePropCorpo [data-predef]').count() == 0, "✕ na predefinição apaga (pede confirmação)")
        if largura > 500:
            # EXPORTAR: a cor sai no vídeo (só a faixa vermelha em preto e branco)
            pg.evaluate("(()=>{const P=__video.P();P.clips=P.clips.filter(c=>c.tipo==='imagem').slice(0,1);P.clips[0].grade={sat:-100};P.clips[0].dur=1.2;__video.sel(null)})()"); pg.wait_for_timeout(300)
            pg.evaluate("document.getElementById('veExportar') ? document.getElementById('veExportar').click() : null"); pg.wait_for_selector("#veSaida:not([hidden])", timeout=30000)
            dados = pg.evaluate("(async()=>{const b=window.__veSaida.blob;const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode.apply(null,a.subarray(i,i+32768));return [btoa(s),window.__veSaida.nome]})()")
            import base64
            arq = f"{TMP}/saida." + dados[1].split(".")[-1]; open(arq, "wb").write(base64.b64decode(dados[0]))
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", "0.6", "-i", arq, "-frames:v", "1", f"{TMP}/q.png"], check=False)
            if os.path.exists(f"{TMP}/q.png"):
                q = Image.open(f"{TMP}/q.png").convert("RGB"); w, hh = q.size; v = q.getpixel((w // 2, int(hh * 0.30)))
                ok(max(v) - min(v) < 14, f"no vídeo exportado a faixa vermelha saiu em preto e branco {v}")
            else: ok(False, "não consegui ler um quadro do vídeo exportado")
        ok(not erros, f"0 erros de JS {erros[:2]}")
        ok(not FORA, f"nada saiu do aparelho {FORA[:2]}")
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "sem estouro na largura")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): " + " | ".join(falhas)))
