#!/usr/bin/env python3
"""VARREDURA DE ROLAGEM E NAVEGAÇÃO (22/11, dono: "entro no editor de vídeo e a tela fica travada, não rola" + "revise todas as ferramentas").
Para TODAS as páginas, em 1280×720 (rodinha do mouse) e 390×844 (toque de verdade pelo CDP):
  1. erros de JavaScript ao abrir;
  2. CONTEÚDO INALCANÇÁVEL: algo visível abaixo da tela sem nenhuma rolagem que leve até ele (página travada + caixa sem rolagem);
  3. ROLAGEM PRESA: cada caixa que rola é rolada pela rodinha/dedo no MEIO dela — se nada andar (nem ela nem quem está em volta), é armadilha
     (ex.: lista com overscroll-behavior:contain dentro de outra lista que rola).
Uso (na raiz): python3 docs/testes/teste_rolagem.py [pagina.html ...]"""
import http.server, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8875
os.chdir(RAIZ)
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},neq(){return q},is(){return q},not(){return q},or(){return q},ilike(){return q},range(){return q},order(){return q},limit(){return q},in(){return q},gte(){return q},lte(){return q},single(){return q},maybeSingle(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null}),channel(){const c={on(){return c},subscribe(){return c},send(){}};return c},removeChannel(){},storage:{from(){return {list:async()=>({data:[]}),createSignedUrl:async()=>({data:null})}}},functions:{invoke:async()=>({data:null,error:null})}}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    return r.abort()
# páginas que só redirecionam ou são públicas de um uso só
PULAR = {"fluxo.html", "custos.html", "financeiro.html", "app.html"}
PAGS = sys.argv[1:] or sorted(f for f in os.listdir(RAIZ) if f.endswith(".html") and f not in PULAR)
INALC = r"""(()=>{const ih=innerHeight,se=document.scrollingElement||document.documentElement,cs=e=>getComputedStyle(e);
const raizRola=cs(document.documentElement).overflowY!=='hidden'&&cs(document.body).overflowY!=='hidden'&&se.scrollHeight>ih+4;
if(raizRola)return [];
const rola=e=>{const s=cs(e);return (s.overflowY==='auto'||s.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+2};
const out=[];
for(const e of document.body.querySelectorAll('*')){
  if(!e.getClientRects().length)continue; const s=cs(e); if(s.visibility==='hidden'||+s.opacity===0)continue;
  let r=e.getBoundingClientRect(); if(r.height<8||r.width<8)continue;
  let bot=r.bottom, top=r.top, ok=false, a=e.parentElement, fixo=s.position==='fixed';
  while(a&&a!==document.documentElement){const as=cs(a);
    if(rola(a)){ok=true;break}
    if(as.overflowY!=='visible'||as.overflowX==='hidden'||as.overflowX==='clip'){const ar=a.getBoundingClientRect();bot=Math.min(bot,ar.bottom);top=Math.max(top,ar.top)}
    if(as.position==='fixed')fixo=true; a=a.parentElement}
  if(ok||fixo&&r.bottom<=ih+4)continue;
  if(bot>ih+4&&bot>top+8&&!(e.parentElement&&out.some(o=>o.el===e.parentElement)))out.push({el:e,n:(e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,2).join('.')),fora:Math.round(bot-ih)});
}
return out.filter(o=>!out.some(p=>p!==o&&p.el.contains(o.el))).slice(0,6).map(o=>o.n+' (+'+o.fora+'px)')})()"""
CAIXAS = r"""(()=>{const cs=e=>getComputedStyle(e),o=[];
document.querySelectorAll('*').forEach(e=>{const s=cs(e);if((s.overflowY==='auto'||s.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+20&&e.clientHeight>60&&e.getClientRects().length&&s.visibility!=='hidden'){
 const r=e.getBoundingClientRect(),x=Math.round(r.left+r.width/2),y=Math.round(Math.max(r.top,0)+Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/2;
 const yy=Math.round(Math.max(r.top,0)+(Math.min(r.bottom,innerHeight)-Math.max(r.top,0))/2); if(yy<20||yy>innerHeight-20||x<5||x>innerWidth-5)return;
 const h=document.elementFromPoint(x,yy); if(!h||!e.contains(h))return; e.setAttribute('data-tr',o.length); o.push({i:o.length,n:e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,2).join('.'),x,y:yy,h:Math.round(Math.min(r.bottom,innerHeight)-Math.max(r.top,0))})}});return o.slice(0,8)})()"""
POS = "(()=>{const o={};document.querySelectorAll('[data-tr]').forEach(e=>{let s=0,a=e;while(a){s+=a.scrollTop||0;a=a.parentElement}o[e.dataset.tr]=s});let g=scrollY;document.querySelectorAll('*').forEach(e=>{g+=e.scrollTop||0});o.p=g;return o})()"
# rolagem com 'contain' DENTRO de outra rolagem: o dedo/rodinha prende na de dentro e a de fora (que tem mais conteúdo) não anda
ANINHADA = r"""(()=>{const cs=e=>getComputedStyle(e),rola=(e,m)=>{const s=cs(e);return (s.overflowY==='auto'||s.overflowY==='scroll')&&e.scrollHeight>e.clientHeight+m&&e.getClientRects().length&&s.visibility!=='hidden'};const o=[];
document.querySelectorAll('*').forEach(e=>{if(!rola(e,1))return;const ob=cs(e).overscrollBehaviorY;if(ob==='auto')return;let a=e.parentElement;while(a&&a!==document.body){if(rola(a,20)){o.push((e.id?'#'+e.id:e.tagName.toLowerCase()+'.'+[...e.classList].slice(0,2).join('.'))+' dentro de '+(a.id?'#'+a.id:a.tagName.toLowerCase()+'.'+[...a.classList].slice(0,2).join('.')));break}a=a.parentElement}});return o.slice(0,4)})()"""
falhas = []
def ok(c, m):
    if not c: print("  ✗ " + m); falhas.append(m)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for modo, vp, toque in (("PC 1280", (1280, 720), False), ("celular 390", (390, 844), True)):
        print(f"\n=== {modo} ===")
        ctx = b.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block", has_touch=toque, is_mobile=toque); ctx.route("**/*", rota)
        for pag in PAGS:
            pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)[:120])); pg.on("dialog", lambda d: d.dismiss())
            try: pg.goto(BASE + pag, wait_until="load", timeout=20000)
            except Exception as x: ok(False, f"{modo} {pag}: não abriu ({str(x)[:60]})"); pg.close(); continue
            pg.wait_for_timeout(1500)
            if not pg.url.endswith(pag) and pag not in pg.url: pg.close(); continue   # redirecionou
            ok(not erros, f"{modo} {pag}: erro de JS ao abrir — {erros[:1]}")
            inal = pg.evaluate(INALC); ok(not inal, f"{modo} {pag}: conteúdo FORA DA TELA sem rolagem que chegue nele: {', '.join(inal)}")
            ani = pg.evaluate(ANINHADA); ok(not ani, f"{modo} {pag}: rolagem PRESA (uma lista que rola dentro de outra, com 'contain'): {'; '.join(ani)}")
            cdp = ctx.new_cdp_session(pg) if toque else None
            for c in pg.evaluate(CAIXAS):
                a0 = pg.evaluate(POS)
                if toque:
                    d = min(220, c["h"] * 0.6); y0 = c["y"] + d / 2
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": c["x"], "y": y0}]})
                    for k in range(1, 11): cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": c["x"], "y": y0 - d * k / 10}]}); pg.wait_for_timeout(16)
                    cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                else:
                    pg.mouse.move(c["x"], c["y"]); pg.mouse.wheel(0, 250)
                pg.wait_for_timeout(450); a1 = pg.evaluate(POS)
                ok(a1.get(str(c["i"]), 0) != a0.get(str(c["i"]), 0) or a1["p"] != a0["p"], f"{modo} {pag}: caixa {c['n']} não rola com {'o dedo' if toque else 'a rodinha'} (rolagem presa)")
                pg.evaluate("window.scrollTo(0,0);document.querySelectorAll('[data-tr]').forEach(e=>e.scrollTop=0)")
            pg.close()
        ctx.close()
srv.shutdown()
print(f"\nFALHAS {len(falhas)}")
sys.exit(1 if falhas else 0)
