#!/usr/bin/env python3
"""VARREDURA de todas as páginas (16/11): abre cada .html em 1280 e 390 px com stubs (METODOS T1) e procura:
erros de JS, console.error, arquivos do site que não carregam (404), links internos quebrados, estouro horizontal,
ids repetidos, botões sem texto/rótulo e imagens quebradas. Depois clica em cada aba/galeria visível sem sair da página.
Uso (na raiz): python3 docs/testes/varredura.py  → relatório em /tmp/varredura.txt"""
import glob, http.server, json, os, re, socketserver, sys, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(RAIZ); PORTA = 8820
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},gte(){return q},lte(){return q},lt(){return q},gt(){return q},not(){return q},or(){return q},ilike(){return q},match(){return q},
maybeSingle(){return q},single(){return q},order(){return q},limit(){return q},range(){return q},delete(){return q},update(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},signOut:async()=>({})},
from(){return q},rpc:async()=>({data:null,error:null}),functions:{invoke:async()=>({data:null,error:null})},channel(){return {on(){return this},subscribe(){return this}}},removeChannel(){},
storage:{from(){return {list:async()=>({data:[]}),upload:async()=>({error:null}),remove:async()=>({}),createSignedUrl:async()=>({data:{signedUrl:null}}),getPublicUrl:()=>({data:{publicUrl:''}})}}}};}};"""
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
falt = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    return r.abort()
paginas = sorted(os.path.basename(p) for p in glob.glob("*.html"))
rel = []
def achou(pag, larg, tipo, txt): rel.append(f"[{pag} {larg}] {tipo}: {txt}")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for larg in (1280, 390, 360):
        ctx = b.new_context(viewport={"width": larg, "height": 900}, service_workers="block", locale="pt-BR")
        ctx.route("**/*", rota)
        for pag in paginas:
            pg = ctx.new_page(); erros = []; cons = []; f404 = []
            pg.on("pageerror", lambda e: erros.append(str(e)[:160]))
            pg.on("console", lambda m: cons.append(m.text[:160]) if m.type == "error" and "net::ERR" not in m.text and "Failed to load resource" not in m.text else None)
            pg.on("response", lambda r: f404.append(r.url.replace(BASE, "")) if r.status >= 400 and "127.0.0.1" in r.url else None)
            pg.on("dialog", lambda d: d.dismiss())
            try: pg.goto(BASE + pag, wait_until="load", timeout=20000)
            except Exception as e: achou(pag, larg, "NÃO ABRE", str(e)[:100]); pg.close(); continue
            pg.wait_for_timeout(1200)
            if pg.url.split("/")[-1].split("?")[0] != pag:   # página que redireciona
                pg.close(); continue
            # simula o topo LOGADO (selo verde) — foi o que estourava no celular
            pg.evaluate("""(()=>{const s=document.querySelector('.bw-topo-logado');if(s&&!s.innerHTML)s.innerHTML='<a href="login.html" class="bw-logado"><i></i>LOGADO</a>';})()""")
            pg.wait_for_timeout(100)
            info = pg.evaluate("""(()=>{const r={};const d=document.documentElement;r.ov=d.scrollWidth-d.clientWidth;
              const ids={};document.querySelectorAll('[id]').forEach(e=>{ids[e.id]=(ids[e.id]||0)+1});r.dup=Object.keys(ids).filter(k=>ids[k]>1);
              r.semTexto=[...document.querySelectorAll('button,a.btn,a.bw-btn')].filter(e=>e.offsetParent&&!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.title).map(e=>e.outerHTML.slice(0,80));
              r.imgs=[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src&&!i.src.startsWith('data:')).map(i=>i.getAttribute('src'));
              r.links=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')).filter(h=>h&&!/^(https?:|mailto:|tel:|#|javascript:|data:|blob:)/.test(h)).map(h=>h.split('#')[0].split('?')[0].replace(/^\\.\\//,'').replace(/^\\//,''));
              r.largos=[...document.querySelectorAll('.wrap *, .bw-pagina *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>innerWidth+2&&!e.closest('.tb-scroll,.c-rolar,[style*=overflow]')&&getComputedStyle(e).position!=='fixed'}).slice(0,3).map(e=>e.tagName+'.'+(e.className||'').toString().slice(0,30));
              return r})()""")
            for l in set(info["links"]):
                if l and not os.path.exists(l) and not os.path.exists(l + ".html") and not os.path.isdir(l) and l not in ("", "./"):
                    achou(pag, larg, "LINK QUEBRADO", l)
            if info["ov"] > 0: achou(pag, larg, "ESTOURO", f"{info['ov']}px {info['largos']}")
            if info["dup"]: achou(pag, larg, "ID REPETIDO", info["dup"][:5])
            if info["semTexto"]: achou(pag, larg, "BOTÃO SEM NOME", info["semTexto"][:2])
            if info["imgs"]: achou(pag, larg, "IMAGEM QUEBRADA", info["imgs"][:3])
            # clicar nas abas/chips de navegação interna da página (sem links que saem)
            try:
                n = pg.evaluate("""(()=>{let n=0;document.querySelectorAll('[data-aba]:not(a),[role=tab],.colap-titulo,[data-colap]').forEach(e=>{if(e.offsetParent&&n<25){try{e.click();n++}catch(x){}}});return n})()""")
                pg.wait_for_timeout(400)
            except Exception as e: achou(pag, larg, "CLIQUE", str(e)[:100])
            for e in erros: achou(pag, larg, "ERRO JS", e)
            for e in cons: achou(pag, larg, "CONSOLE", e)
            for e in set(f404): achou(pag, larg, "404", e)
            pg.close()
        ctx.close()
    b.close()
srv.shutdown()
open("/tmp/varredura.txt", "w").write("\n".join(rel))
print(f"{len(paginas)} páginas × 3 larguras (1280, 390, 360) · {len(rel)} achado(s)"); print("\n".join(rel))
