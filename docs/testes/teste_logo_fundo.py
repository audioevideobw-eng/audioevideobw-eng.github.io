#!/usr/bin/env python3
"""Teste local (16/11): LOGO SEM FUNDO no GERADOR DE ORÇAMENTO (propostas.js).
Logo de teste = letreiro escuro com "O" (buraco) sobre fundo BRANCO, como vem de JPG/Word.
Confere: ao enviar, o fundo some sozinho (cantos alfa 0), o miolo do "O" continua branco (só TIRAR FUNDO + DENTRO DAS LETRAS tira),
borda sem halo branco, sobras cortadas, PNG (não JPEG), original guardada (VOLTAR AO ORIGINAL), botões no MINHA EMPRESA,
logo já transparente não é mexida, logo colorida em fundo de foto (não lisa) não é mexida sozinha; PDF e Word saem com a logo. 1280 e 390 px.
Uso (na raiz):  python3 docs/testes/teste_logo_fundo.py"""
import http.server, os, socketserver, threading, sys
sys.path.insert(0, os.path.dirname(__file__))
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8831
NM = "/opt/npm-tools/node_modules/"
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
STUB_PDFMAKE = """window.__defs=[];window.pdfMake={vfs:{},createPdf:function(d){window.__defs.push(d);return {getBuffer(cb){cb(new Uint8Array([37,80,68,70]))},download(){},getBlob(cb){cb(new Blob(['%PDF']))},open(){}}}};"""
STUB_QR = """window.qrcode=function(){return {addData(){},make(){},getModuleCount(){return 21},isDark(r,c){return (r+c)%2===0}}};"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u: return r.fulfill(body=STUB_PDFMAKE, content_type="application/javascript")
    if "vfs_fonts" in u: return r.fulfill(body="", content_type="application/javascript")
    if "qrcode" in u: return r.fulfill(body=STUB_QR, content_type="application/javascript")
    if "jszip" in u: return r.fulfill(path=NM + "jszip/dist/jszip.min.js", content_type="application/javascript")
    if "docx@" in u: return r.fulfill(path=NM + "docx/dist/index.iife.js", content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

# desenha a logo de teste no navegador e devolve como Blob (JPEG = fundo branco "sujo", como na vida real)
LOGO_JS = """async (tipo) => {
  const c = document.createElement('canvas'); c.width = 480; c.height = 200; const x = c.getContext('2d');
  if (tipo === 'foto') { const g = x.createLinearGradient(0,0,480,200); g.addColorStop(0,'#3a7bd5'); g.addColorStop(1,'#f9d423'); x.fillStyle = g; x.fillRect(0,0,480,200); }
  else if (tipo !== 'transp') { x.fillStyle = '#fff'; x.fillRect(0,0,480,200); }
  x.fillStyle = '#1a1a1a'; x.font = 'bold 96px Arial'; x.textBaseline = 'middle'; x.fillText('BOW', 60, 104);
  const b = await new Promise(ok => c.toBlob(ok, tipo === 'transp' ? 'image/png' : 'image/jpeg', 0.85));
  return b; }"""
PIX = """async (url) => { const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = url; });
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im,0,0);
  const d = x.getImageData(0,0,c.width,c.height).data; const a = (px,py) => d[(py*c.width+px)*4+3];
  let halo = 0, borda = 0;
  for (let i = 0; i < d.length; i += 4) { const al = d[i+3]; if (al > 20 && al < 235) { borda++; if (d[i] > 150 && d[i+1] > 150 && d[i+2] > 150) halo++; } }
  /* miolo do O: procura o pixel opaco mais claro no centro da logo */
  let clarosOpacos = 0; for (let i = 0; i < d.length; i += 4) if (d[i+3] > 240 && d[i] > 230 && d[i+1] > 230 && d[i+2] > 230) clarosOpacos++;
  return { w: c.width, h: c.height, cantos: [a(0,0), a(c.width-1,0), a(0,c.height-1), a(c.width-1,c.height-1)], halo, borda, clarosOpacos, png: url.slice(0,15) === 'data:image/png;' }; }"""

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, service_workers="block")
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "propostas.html"); pg.wait_for_timeout(700)
        pg.evaluate("__prop.salvarCfg('logo',''); __prop.salvarCfg('logoOrig','')")

        # 1) logo JPG com fundo branco → entra sem fundo sozinha
        pg.evaluate("async () => { const b = await (" + LOGO_JS + ")('branco'); await __prop.receberLogo(b); }")
        url = pg.evaluate("__prop.cfg('logo','')"); orig = pg.evaluate("__prop.cfg('logoOrig','')")
        r = pg.evaluate(PIX, url)
        ok(r["png"], "logo salva em PNG (transparência não se perde)")
        ok(all(a == 0 for a in r["cantos"]), f"cantos transparentes (alfa {r['cantos']})")
        ok(r["w"] < 480 and r["h"] < 200, f"sobras cortadas ({r['w']}×{r['h']} de 480×200)")
        ok(r["borda"] > 0 and r["halo"] <= r["borda"] * 0.05, f"borda das letras sem halo branco ({r['halo']} claros em {r['borda']} de borda)")
        ok(r["clarosOpacos"] > 50, "miolo do 'O' continua (TIRAR FUNDO simples só tira o fundo de fora)")
        ok(orig.startswith("data:image/png") and orig != url, "original guardada para VOLTAR AO ORIGINAL")
        ok(any("Logo sem fundo" in t for t in pg.locator(".pr-toast").all_inner_texts()), "aviso '✓ Logo sem fundo' na tela")

        # 2) MINHA EMPRESA: botões e quadriculado
        pg.click("#btnEmpresa")
        pg.wait_for_timeout(300)
        ok(pg.locator("[data-a=logoFundo][data-v=borda]").count() == 1 and pg.locator("[data-a=logoFundo][data-v=tudo]").count() == 1, "botões ✂ TIRAR FUNDO e ✂ + DENTRO DAS LETRAS")
        ok(pg.locator("[data-a=logoOriginal]").count() == 1, "botão ↺ VOLTAR AO ORIGINAL")
        ok("conic-gradient" in pg.eval_on_selector(".pr-logo-mini", "e => getComputedStyle(e).backgroundImage"), "miniatura com quadriculado (mostra a transparência)")
        ok(pg.eval_on_selector(".pr-logo-mini", "e => e.getBoundingClientRect().right") <= larg, "miniatura cabe na tela")

        # 3) + DENTRO DAS LETRAS
        pg.click("[data-a=logoFundo][data-v=tudo]"); pg.wait_for_timeout(600)
        r2 = pg.evaluate(PIX, pg.evaluate("__prop.cfg('logo','')"))
        ok(r2["clarosOpacos"] < 20 and all(a == 0 for a in r2["cantos"]), f"+ DENTRO DAS LETRAS tira o miolo do 'O' ({r2['clarosOpacos']} claros opacos)")
        ok(pg.evaluate("__prop.cfg('logoOrig','')") == orig, "original continua guardada")

        # 4) VOLTAR AO ORIGINAL
        pg.click("[data-a=logoOriginal]"); pg.wait_for_timeout(400)
        ok(pg.evaluate("__prop.cfg('logo','')") == orig and pg.evaluate("__prop.cfg('logoOrig','')") == "", "VOLTAR AO ORIGINAL devolve a logo com fundo")
        r3 = pg.evaluate(PIX, orig); ok(all(a == 255 for a in r3["cantos"]), "original tem o fundo branco")
        pg.click("[data-a=logoFundo][data-v=borda]"); pg.wait_for_timeout(500)
        ok(all(a == 0 for a in pg.evaluate(PIX, pg.evaluate("__prop.cfg('logo','')"))["cantos"]), "TIRAR FUNDO de novo a partir da original")
        pg.click("[data-a=fecharEmpresa]"); pg.wait_for_timeout(200)

        # 5) logo que já é transparente e logo sobre foto (fundo não liso) ficam como estão
        pg.evaluate("async () => { const b = await (" + LOGO_JS + ")('transp'); await __prop.receberLogo(b); }")
        ok(pg.evaluate("__prop.cfg('logoOrig','')") == "", "logo já transparente: não mexe")
        pg.evaluate("async () => { const b = await (" + LOGO_JS + ")('foto'); await __prop.receberLogo(b); }")
        ok(pg.evaluate("__prop.cfg('logoOrig','')") == "" and all(a == 255 for a in pg.evaluate(PIX, pg.evaluate("__prop.cfg('logo','')"))["cantos"]), "logo em fundo de foto (degradê): não tira sozinho")

        # 5b) logo como a do dono: fora transparente, EMBLEMA num QUADRADO BRANCO + letreiro BRANCO numa faixa semitransparente
        pg.evaluate("__prop.salvarCfg('logo',''); __prop.salvarCfg('logoOrig','')")
        pg.evaluate("""async () => { const c = document.createElement('canvas'); c.width = 600; c.height = 200; const x = c.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(250, 10, 100, 100); x.fillStyle = '#c9a227'; x.beginPath(); x.arc(300, 60, 44, 0, 7); x.fill();
          x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, 130, 600, 60); x.fillStyle = '#fff'; x.font = 'bold 44px Arial'; x.textBaseline = 'middle'; x.fillText('BW PRODUCOES', 140, 160);
          const b = await new Promise(ok => c.toBlob(ok, 'image/png')); await __prop.receberLogo(b); }""")
        ok(pg.evaluate("__prop.cfg('logoOrig','')") == "", "fora transparente: não mexe sozinho (só pelo botão)")
        quad = pg.evaluate("""async () => { const u = await __prop.logoSemFundo(__prop.cfg('logo',''), false); if (!u) return null;
          const im = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.src = u; }); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let cima = 0, baixo = 0; for (let i = 0; i < d.length; i += 4) if (d[i+3] > 240 && d[i] > 235 && d[i+1] > 235 && d[i+2] > 235) { if ((i / 4 / c.width | 0) < c.height * 0.55) cima++; else baixo++; }
          return { quadrado: cima, letreiro: baixo, h: c.height }; }""")
        ok(quad is not None and quad["quadrado"] < 60 and quad["letreiro"] > 1500, f"quadrado branco do emblema sai e o letreiro branco fica ({quad})")

        # 6) orçamento com a logo sem fundo → prévia, PDF e Word
        pg.evaluate("async () => { const b = await (" + LOGO_JS + ")('branco'); await __prop.receberLogo(b); }")
        pg.evaluate("__prop.novoDoc && __prop.abrir(__prop.novoDoc('orcamento'))"); pg.wait_for_timeout(500)
        if not pg.evaluate("!!__prop.DOC()"):
            pg.evaluate("(() => { const b = [...document.querySelectorAll('[data-a]')].find(x => /NOVO ORÇAMENTO/.test(x.textContent)); b && b.click(); })()"); pg.wait_for_timeout(500)
        ok(pg.evaluate("!!__prop.DOC()"), "orçamento aberto")
        ok(pg.evaluate("(() => { const m = __prop.modelo(__prop.DOC()); return m.logo === __prop.cfg('logo','') && __prop.folhaHTML(m).includes(m.logo.slice(0, 60)); })()"), "prévia (mesmo modelo do PDF) usa a logo PNG sem fundo")
        dpdf = pg.evaluate("JSON.stringify(__prop.defPdf(__prop.modelo(__prop.DOC())).content).includes('data:image/png')")
        ok(dpdf, "PDF leva a logo PNG")
        try:
            pg.evaluate("__prop.gerarWord()"); pg.wait_for_timeout(1500); ok(True, "Word gerado sem erro")
        except Exception as e:
            ok(False, "Word: " + str(e)[:120])
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(sw <= 0, f"sem estouro horizontal ({sw})")
        ok(not erros, "0 erros de JavaScript" + ("" if not erros else ": " + erros[0][:160]))
        ctx.close()
    nav.close()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
