"""Teste do ajuste do app Android (assets/bw-android.js): só liga com o user agent do app; esconde .so-web e o login Google;
download de blob vira arquivo gravado em pedaços no cache + COMPARTILHAR. Capacitor SIMULADO."""
import os, sys, threading, http.server, functools, base64
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, "docs/testes")
try: import _sem_sri  # noqa
except Exception: pass
from playwright.sync_api import sync_playwright
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=".")
H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_port}/"
FALSO = """window.__fs={};window.__share=[];window.Capacitor={Plugins:{
 Filesystem:{writeFile:async o=>{__fs[o.path]=o.data}, appendFile:async o=>{__fs[o.path]+='|'+o.data}, getUri:async o=>({uri:'file:///cache/'+o.path})},
 Share:{share:async o=>{__share.push(o)}}}};"""
falhas = 0
def ok(c, m):
    global falhas
    print(("✓ " if c else "✗ ") + m)
    if not c: falhas += 1
with sync_playwright() as p:
    b = p.chromium.launch()
    for ua, dentro in [("Mozilla/5.0 (Linux; Android 14; wv) Chrome/140 Mobile BW-Android/1.0", True), ("Mozilla/5.0 (Linux; Android 14) Chrome/140 Mobile", False)]:
        c = b.new_context(user_agent=ua, viewport={"width": 390, "height": 800}, service_workers="block")
        pg = c.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.add_init_script(FALSO)
        pg.goto(URL + "login.html"); pg.wait_for_timeout(1500)
        cls = pg.evaluate("document.documentElement.classList.contains('bw-android')")
        ok(cls == dentro, f"{'app' if dentro else 'navegador'}: classe bw-android = {cls}")
        g = pg.evaluate("(()=>{var e=document.getElementById('lGoogle');return e?getComputedStyle(e).display:'sem'})()")
        ok((g == "none") == dentro, f"botão Google: {g}")
        if dentro:
            pg.evaluate("""(()=>{var u=new Uint8Array(7*1024*1024);for(var i=0;i<u.length;i++)u[i]=i%251;
              var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([u],{type:'video/mp4'}));a.download='meu vídeo:1.mp4';a.click();})()""")
            pg.wait_for_function("window.__share.length>0", timeout=15000)
            fs = pg.evaluate("window.__fs"); sh = pg.evaluate("window.__share")
            nome = list(fs)[0]
            partes = fs[nome].split("|")
            dados = b"".join(base64.b64decode(x) for x in partes)
            ok(nome == "meu vídeo-1.mp4", f"nome limpo: {nome}")
            ok(len(partes) == 3 and len(dados) == 7*1024*1024 and dados[251] == 0 and dados[1000] == 1000 % 251, f"gravado em {len(partes)} pedaços, {len(dados)} bytes, conteúdo igual")
            ok(sh[0]["files"] == ["file:///cache/meu vídeo-1.mp4"], "COMPARTILHAR com o arquivo")
        ok(not erros, f"sem erro de JS {erros[:2]}")
        c.close()
    b.close()
print("falhas:", falhas); sys.exit(1 if falhas else 0)
