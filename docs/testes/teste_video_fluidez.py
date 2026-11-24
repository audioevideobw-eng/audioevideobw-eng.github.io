#!/usr/bin/env python3
"""Teste da FLUIDEZ do editor de vídeo (23/11, dono: "no iPhone a linha do tempo trava, fica bugada e ainda tem rebote"; "botão direito no vazio:
puxar o take para encostar e nova camada abaixo"; "névoa branca no topo do iPhone"; "otimizar como CapCut/Premiere"; "teste de memória RAM").
Confere:
  PC 1280  — botão direito no VAZIO da camada abre o menu; "Puxar o take para encostar" fecha o espaço; "Fechar o espaço e puxar todos" leva os
             seguintes juntos; "Nova camada abaixo" cria uma camada vazia VISÍVEL embaixo da clicada; desfazer volta cada passo.
  CELULAR  — arrastar a linha do tempo com o dedo (CDP) não passa do FIM do vídeo (sem rebote), a prévia anda junto, ao soltar a agulha fica onde
             o dedo largou (nada puxa de volta), os pulos são juntados por quadro (no máx. 1 irPara por quadro), e o play anda.
  PROXY    — vídeo PESADO (acima de Full HD) ganha cópia leve sozinho ao importar; vídeo leve não.
  iPHONE   — app instalado (?iosapp=1): faixa fixa, opaca, ≥ 90% da largura e > 10 px no topo (o que tira o desfoque do iOS 26).
  COR      — ✦ CORREÇÃO AUTOMÁTICA acerta branco e exposição (pixel da prévia) sem mexer em saturação/estilo; REALCE DE COR só liga o realce;
             trocar de ESTILO não apaga a correção; corrigir de novo não acumula.
  MEMÓRIA  — importar 24 takes e rolar/tocar: players de vídeo vivos ≤ 6 e a memória do JS volta perto do começo depois de soltar.
Uso (na raiz): python3 docs/testes/teste_video_fluidez.py"""
import http.server, os, socketserver, subprocess, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); TMP = "/tmp/teste_video_fluidez"; PORTA = 8897
os.makedirs(TMP, exist_ok=True)
def gerar(nome, cor, tam, dur, kb="300k"):
    if not os.path.exists(f"{TMP}/{nome}.webm"):
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"color=c={cor}:size={tam}:rate=25:duration={dur}", "-f", "lavfi", "-i", f"sine=f=440:d={dur}",
                        "-c:v", "libvpx", "-b:v", kb, "-c:a", "libvorbis", "-shortest", f"{TMP}/{nome}.webm"], check=True)
if not os.path.exists(f"{TMP}/escura.png"):   # foto escura e azulada: degradê de cinza × (0,45 · 0,50 · 0,70)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "gradients=s=320x240:c0=0x101010:c1=0xd0d0d0:x0=0:y0=0:x1=320:y1=240:d=1", "-vf", "colorchannelmixer=rr=0.45:gg=0.50:bb=0.70", "-frames:v", "1", f"{TMP}/escura.png"], check=True)
gerar("azul", "0x1e3cdc", "360x640", 6); gerar("verde", "0x18b43c", "360x640", 6); gerar("grande", "0xc83c1e", "2560x1440", 2, "800k")
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {}}}}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
CL = "__video.P().clips"
def menu_itens(pg):
    return pg.evaluate("[...document.querySelectorAll('.bwf-menu button')].map(b=>[b.textContent.trim(), b.disabled])")
def clicar_menu(pg, texto):
    pg.evaluate("(t)=>{const b=[...document.querySelectorAll('.bwf-menu button')].find(b=>b.textContent.includes(t)); b.click()}", texto); pg.wait_for_timeout(350)

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])

    print("\n=== PC 1280: botão direito no vazio ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(300)
    for k in range(3): pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(300)
    pg.evaluate(f"(()=>{{const v={CL}.filter(c=>c.tipo==='video');const ini=[0,3,5];v.forEach((c,i)=>{{c.dur=2;c.ini=ini[i];c.trilha='v1'}});__video.tudo()}})()"); pg.wait_for_timeout(700)
    r = pg.evaluate("(()=>{const f=document.querySelector('#veFaixas [data-trilha=\"v1\"]').getBoundingClientRect();const x=document.querySelector('#veFaixas').getBoundingClientRect().left;return [x,f.top+f.height/2]})()")
    pps = pg.evaluate("__video.pps()")
    pg.mouse.click(r[0] + 2.5 * pps, r[1], button="right"); pg.wait_for_timeout(300)
    its = menu_itens(pg); txt = " | ".join(i[0] for i in its)
    ok(any("encostar" in i[0] and not i[1] for i in its), f"botão direito no vazio (2,0–3,0 s) mostra 'Puxar o take para encostar no anterior' ({txt})")
    ok(any("Nova camada de vídeo (acima de tudo)" in i[0] for i in its), "o menu tem 'Nova camada de vídeo (acima de tudo)'")
    clicar_menu(pg, "encostar")
    inis = pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').map(c=>c.ini).sort((a,b)=>a-b)"); ok(inis == [0, 2, 5], f"o take seguinte encostou no anterior, o terceiro ficou ({inis})")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
    inis = pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').map(c=>c.ini).sort((a,b)=>a-b)"); ok(inis == [0, 3, 5], f"desfazer devolve o espaço ({inis})")
    pg.mouse.click(r[0] + 2.5 * pps, r[1], button="right"); pg.wait_for_timeout(300); clicar_menu(pg, "puxar todos")
    inis = pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').map(c=>c.ini).sort((a,b)=>a-b)"); ok(inis == [0, 2, 4], f"'Fechar o espaço e puxar todos' leva os seguintes juntos ({inis})")
    vis0 = pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-faixa')].filter(e=>e.getClientRects().length).map(e=>e.dataset.trilha)")
    pg.mouse.click(r[0] + 8 * pps, r[1], button="right"); pg.wait_for_timeout(300); clicar_menu(pg, "Nova camada de vídeo")
    vis = pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-faixa')].filter(e=>e.getClientRects().length).map(e=>e.dataset.trilha)")
    trs = pg.evaluate(f"[...new Set({CL}.filter(c=>c.tipo==='video').map(c=>c.trilha))]")
    ok(len(vis) == len(vis0) + 1 and vis[0] not in vis0 and vis[0].startswith("v"), f"a camada nova de vídeo aparece ACIMA de tudo ({vis0} → {vis})")
    ok(trs == ["v1"], f"os takes continuam na camada deles ({trs})")
    pg.keyboard.press("Control+z"); pg.wait_for_timeout(300)
    vis2 = pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-faixa')].filter(e=>e.getClientRects().length).map(e=>e.dataset.trilha)"); ok(vis2 == vis0, f"desfazer tira a camada nova ({vis2})")
    # PILHA ÚNICA (padrão Premiere/DaVinci): texto novo e mídia por cima nascem ACIMA de tudo; o som fica embaixo
    def ordem(): return pg.evaluate("[...document.querySelectorAll('#veFaixas .ve-faixa')].filter(e=>e.getClientRects().length).map(e=>e.dataset.trilha)")
    pg.evaluate("__video.addTexto({t:0.5})"); pg.wait_for_timeout(300); o1 = ordem(); t1 = pg.evaluate(f"{CL}.filter(c=>c.tipo==='texto')[0].trilha")
    ok(o1[0] == t1, f"texto novo: a camada dele fica acima de tudo ({o1})")
    pg.evaluate("__video.addTexto({t:1})"); pg.wait_for_timeout(300); o2 = ordem(); t2 = pg.evaluate(f"{CL}.filter(c=>c.tipo==='texto')[1].trilha")
    ok(t2 != t1 and o2[0] == t2 and o2.index(t1) == 1, f"segundo texto no mesmo trecho: camada nova acima do primeiro ({o2})")
    pg.evaluate("(()=>{const M=__video.MID,k=Object.keys(M)[0];__video.addClip(M[k],'v1',0.2)})()"); pg.wait_for_timeout(400); o3 = ordem()
    tv = pg.evaluate(f"{CL}[{CL}.length-1].trilha")
    ok(o3[0] == tv and tv.startswith("v") and tv != "v1", f"mídia posta por cima de outra: camada nova acima de tudo, inclusive dos textos ({o3})")
    ok(all(x.startswith("a") for x in o3[o3.index("v1") + 1:]) , f"abaixo do vídeo principal só fica o som ({o3})")
    ordP = pg.evaluate("__video.P().pilha"); ok(ordP[-1] == tv and ordP[0] == "v1", f"a ordem de desenho segue a pilha: de baixo ({ordP[0]}) para cima ({ordP[-1]})")
    ok(not erros, f"sem erro de JavaScript no PC ({erros[:2]})")
    ctx.close()

    print("\n=== COR no padrão do colorista: correção → realce → estilo ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/escura.png"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(700); pg.evaluate("__video.irPara(1)"); pg.wait_for_timeout(300)   # a agulha anda para o fim do take ao pôr (23/11)
    def media():   # média de R, G, B do meio da prévia
        return pg.evaluate("(()=>{const c=document.getElementById('veCv'),x=c.getContext('2d'),w=c.width,h=c.height,d=x.getImageData(Math.round(w*0.3),Math.round(h*0.4),Math.round(w*0.4),Math.round(h*0.2)).data;let r=0,g=0,b=0,n=d.length/4;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2]}return [r/n,g/n,b/n]})()")
    m0 = media(); pg.evaluate("document.querySelectorAll('[data-seta]').forEach(t=>{if(t.classList.contains('fechada'))t.click()})"); pg.wait_for_timeout(300)
    ok(pg.evaluate("!!document.querySelector('#vePropCorpo [data-acao=\"corAuto\"]') && document.querySelectorAll('#vePropCorpo [data-realce]').length===4"), "o painel de cor tem ✦ CORREÇÃO AUTOMÁTICA e os 4 níveis do REALCE DE COR")
    pg.evaluate("document.querySelector('#vePropCorpo [data-acao=\"corAuto\"]').click()"); pg.wait_for_timeout(900)
    g1 = pg.evaluate(f"{CL}[0].grade"); m1 = media()
    ok(g1.get("temp", 0) > 5 and g1.get("expo", 0) > 5 and not any(k in g1 for k in ("sat", "vib", "vinheta", "fade")), f"a correção acerta branco e exposição e NÃO mexe em saturação/estilo ({g1})")
    ok((m0[2] - m0[0]) > 12 and abs(m1[2] - m1[0]) < (m0[2] - m0[0]) * 0.55 and sum(m1) > sum(m0) * 1.15, f"na prévia: o azulado some e a foto clareia (R,G,B {[round(x) for x in m0]} → {[round(x) for x in m1]})")
    pg.evaluate("document.querySelector('#vePropCorpo [data-realce=\"2\"]').click()"); pg.wait_for_timeout(500); g2 = pg.evaluate(f"{CL}[0].grade")
    ok(g2.get("vib") == 42 and all(g2.get(k) == g1.get(k) for k in g1), f"REALCE Médio só liga o realce (vib 42) e mantém a correção ({g2})")
    pg.evaluate("document.querySelector('#vePropCorpo [data-look=\"cinema\"]').click()"); pg.wait_for_timeout(500); g3 = pg.evaluate(f"{CL}[0].grade")
    ok(g3.get("expo") == g1.get("expo") and g3.get("temp", 0) == min(100, g1.get("temp", 0) + 8) and g3.get("vinheta") == 25, f"trocar de ESTILO não apaga a correção — ela soma com o estilo ({g3})")
    pg.evaluate("document.querySelector('#vePropCorpo [data-acao=\"corAuto\"]').click()"); pg.wait_for_timeout(900); g4 = pg.evaluate(f"{CL}[0].grade")
    ok(g4.get("expo") == g3.get("expo") and g4.get("temp") == g3.get("temp"), f"correção de novo não acumula (mesmos valores: {g4.get('expo')}, {g4.get('temp')})")
    ok(not erros, f"sem erro de JavaScript ({erros[:2]})")
    ctx.close()

    print("\n=== CELULAR 390 (toque de verdade): arrastar a linha do tempo ===")
    ctx = b.new_context(**p.devices["iPhone 13"], service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.add_init_script("window.__irs=0;window.__pulos=0;(function(){const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return d.get.call(this)},set(v){window.__pulos++;return d.set.call(this,v)}})})()")
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true && document.getElementById('veApp')", timeout=20000); pg.wait_for_timeout(500)
    pg.set_input_files("#vaArq", [f"{TMP}/azul.webm", f"{TMP}/verde.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=20000); pg.wait_for_timeout(600)
    pg.evaluate("VEApp.fechar()")
    pg.evaluate("(()=>{const ids=Object.keys(__video.MID);__video.addClip(__video.MID[ids[0]]);__video.addClip(__video.MID[ids[1]]);__video.tudo();})()"); pg.wait_for_timeout(800)
    tot = pg.evaluate("__video.total()"); ok(tot > 10, f"dois takes na linha do tempo ({tot:.1f} s)")
    pg.evaluate("(()=>{const v=window.__video;const o=v.irPara;v.irPara=function(t){window.__irs++;return o(t)};})()")
    cdp = ctx.new_cdp_session(pg)
    ro = pg.evaluate("(()=>{const r=document.getElementById('veRolo').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
    y = ro[1] + ro[3] - 14   # embaixo do ＋ (que fica no canto de cima à direita)
    def toque(tipo, x): cdp.send("Input.dispatchTouchEvent", {"type": tipo, "touchPoints": [] if tipo == "touchEnd" else [{"x": x, "y": y}]})
    # arrasta da direita para a esquerda bem além do fim (o vídeo tem ~12 s)
    pg.evaluate("window.__irs=0;window.__pulos=0")
    quadros = 0
    for vez in range(3):   # três arrastes de ~300 px (5 s cada) = passa bem do fim (12 s)
        if vez: toque("touchEnd", 0); pg.wait_for_timeout(60)
        x = 330; toque("touchStart", x)
        for k in range(20): x -= 16; toque("touchMove", x); quadros += 1; pg.wait_for_timeout(16)
    for k in range(30): toque("touchMove", x); pg.wait_for_timeout(16)
    sl = pg.evaluate("document.getElementById('veRolo').scrollLeft"); fim = pg.evaluate("__video.total()*__video.pps()")
    ok(sl <= fim + 1.5, f"a linha do tempo não passa do fim do vídeo durante o arraste (scroll {sl:.0f} ≤ fim {fim:.0f})")
    irs = pg.evaluate("window.__irs"); ok(irs <= 95, f"no máx. um pulo por quadro durante o arraste ({irs} irPara em ~90 quadros)")
    toque("touchEnd", 0); pg.wait_for_timeout(900)
    t1 = pg.evaluate("__video.T()"); sl1 = pg.evaluate("document.getElementById('veRolo').scrollLeft")
    ok(abs(t1 - tot) < 0.06, f"ao soltar no fim, o tempo fica no fim ({t1:.2f} de {tot:.2f})")
    pg.wait_for_timeout(700); sl2 = pg.evaluate("document.getElementById('veRolo').scrollLeft")
    ok(abs(sl2 - sl1) < 1.5, f"nada puxa a linha do tempo de volta depois de soltar — sem rebote ({sl1:.0f} → {sl2:.0f})")
    ok(not pg.evaluate("window.__veRaspa"), "o modo de arraste rápido desliga ao soltar (quadro exato no fim)")
    # arrasta para o meio e confere que a prévia acompanha
    x = ro[0] + 40; toque("touchStart", x)
    for k in range(10): x += 25; toque("touchMove", x); pg.wait_for_timeout(20)
    toque("touchEnd", 0); pg.wait_for_timeout(700)
    t2 = pg.evaluate("__video.T()"); sl3 = pg.evaluate("document.getElementById('veRolo').scrollLeft"); pps = pg.evaluate("__video.pps()")
    ok(t2 < t1 - 1 and abs(sl3 / pps - t2) < 0.1, f"arrastar de volta anda no vídeo e a agulha bate com o tempo ({t2:.2f} s)")
    # play anda
    pg.evaluate("__video.irPara(0)"); pg.click("#vaPlay"); pg.wait_for_timeout(1500); tp = pg.evaluate("__video.T()"); pg.click("#vaPlay")
    ok(0.4 < tp < 2.2, f"o play anda (1,5 s → {tp:.2f} s)")
    ok(not erros, f"sem erro de JavaScript no celular ({erros[:2]})")
    ctx.close()

    print("\n=== PROXY automático (vídeo pesado) ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
    sup = pg.evaluate("!!(window.BWProxy && BWProxy.suporta())")
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm", f"{TMP}/grande.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=2", timeout=20000)
    if sup:
        pg.wait_for_timeout(600)
        ok(pg.evaluate("!!document.getElementById('veCopia') && document.getElementById('veCopia').classList.contains('min')"), "vídeo pesado: a cópia leve começa sozinha, com a janelinha minimizada")
        try:
            pg.wait_for_function("!document.getElementById('veCopia')", timeout=90000); ok(True, "a cópia leve terminou")
        except Exception: ok(False, "a cópia leve não terminou em 90 s")
        nomes = pg.evaluate("(()=>{const M=__video.MID;return Object.keys(M).filter(k=>M[k].tipo==='video').map(k=>[M[k].nome, !!(document.querySelector('#veLib [data-mid=\"'+k+'\"]')||{}).innerHTML && /⚡|proxy/i.test(document.querySelector('#veLib [data-mid=\"'+k+'\"]').outerHTML)])})()")
        ok(pg.evaluate("(()=>{const t=document.getElementById('vePxConta');return t?t.textContent:''})()").startswith("· 1 de 2"), "só o vídeo pesado ganhou proxy (1 de 2)")
    else:
        ok(True, "este Chromium não faz proxy (sem VideoEncoder) — pulado")
    ok(not erros, f"sem erro de JavaScript ({erros[:2]})")
    ctx.close()

    print("\n=== iPHONE instalado: faixa do topo (tira a névoa do iOS 26) ===")
    for pagina in ("video.html?iosapp=1", "index.html?iosapp=1", "lancamentos.html?iosapp=1"):
        ctx = b.new_context(**p.devices["iPhone 13"], service_workers="block"); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.goto(BASE + pagina); pg.wait_for_timeout(2200)
        f = pg.evaluate("""(()=>{const e=document.getElementById('bwTopoIos');if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);
            const meio=(+s.zIndex>=2147483000&&e.parentNode===document.body)?0:-1;return {w:r.width/innerWidth,h:r.height,top:r.top,pos:s.position,bg:s.backgroundColor,bf:s.backdropFilter||'none',pe:s.pointerEvents,camada:meio}})()""")
        ok(bool(f) and f["pos"] == "fixed" and f["top"] == 0 and f["w"] >= 0.9 and f["h"] > 10 and f["bf"] in ("none", "") and f["pe"] == "none" and f["camada"] == 0
           and f["bg"].startswith("rgb(") , f"{pagina.split('?')[0]}: faixa fixa, opaca, {f and round(f['w']*100)}% da largura, {f and f['h']} px, por cima de tudo e sem pegar o toque ({f and f['bg']})")
        ctx.close()

    print("\n=== MEMÓRIA: 24 takes, rolar e tocar ===")
    ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block"); ctx.route("**/*", rota)
    pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.add_init_script("window.__vivos=new Set();(function(){const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');Object.defineProperty(HTMLMediaElement.prototype,'src',{get(){return d.get.call(this)},set(v){if(v)window.__vivos.add(this);return d.set.call(this,v)}});const ra=Element.prototype.removeAttribute;Element.prototype.removeAttribute=function(n){if(n==='src')window.__vivos.delete(this);return ra.call(this,n)}})()")
    pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
    cdp = ctx.new_cdp_session(pg); cdp.send("Performance.enable")
    def heap():
        cdp.send("HeapProfiler.collectGarbage"); m = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}; return m["JSHeapUsedSize"] / 1048576
    h0 = heap()
    with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
    fc.value.set_files([f"{TMP}/azul.webm"] * 12 + [f"{TMP}/verde.webm"] * 12); pg.wait_for_function("Object.keys(__video.MID).length>=24", timeout=120000); pg.wait_for_timeout(800)
    pg.evaluate("Object.keys(__video.MID).forEach(k=>__video.addClip(__video.MID[k]));__video.tudo()"); pg.wait_for_timeout(1500)
    h1 = heap(); vivos1 = pg.evaluate("[...window.__vivos].filter(e=>e.getAttribute('src')).length")
    print(f"    memória do JS: começo {h0:.1f} MB · com 24 takes na linha do tempo {h1:.1f} MB · players vivos {vivos1}")
    tot = pg.evaluate("__video.total()")
    for k in range(60): pg.evaluate(f"__video.irPara({tot}*{k}/60)"); pg.wait_for_timeout(25)
    pg.evaluate("__video.irPara(0)"); pg.evaluate("__video.tocar()"); pg.wait_for_timeout(3000); pg.evaluate("__video.parar()"); pg.wait_for_timeout(800)
    h2 = heap(); vivos2 = pg.evaluate("[...window.__vivos].filter(e=>e.getAttribute('src')).length")
    print(f"    depois de rolar o vídeo inteiro e tocar 3 s: {h2:.1f} MB · players vivos {vivos2}")
    ok(vivos2 <= 6, f"só os takes perto da agulha ficam abertos ({vivos2} players de 24 takes)")
    ok(h2 - h1 < 40, f"a memória do JS não cresce ao rolar/tocar ({h1:.1f} → {h2:.1f} MB)")
    ok(not erros, f"sem erro de JavaScript ({erros[:2]})")
    ctx.close(); b.close()
print(f"\n{'✅ 0 falhas' if not falhas else '❌ ' + str(len(falhas)) + ' falha(s)'}")
srv.shutdown()
