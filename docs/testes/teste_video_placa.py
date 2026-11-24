"""PLACA DE VÍDEO (23/11, dono: "deu amarelo… o app pode fazer isso apertando um botão?"): dentro do app BW o painel tem ⚡ USAR A NVIDIA (1 TOQUE),
que pede ao app gravar a preferência do Windows; o painel diz QUAL placa faz cada coisa (a integrada não aparece como "pela placa" verde)."""
import sys, os
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8931"))
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
FALSO = {"nome": "Intel(R) UHD Graphics", "curto": "Intel(R) UHD Graphics", "soft": False, "integ": True, "webgl": True, "dec": "placa", "k4": "placa", "hevc": "nao", "enc": "placa",
         "app": {"nome": "NVIDIA GeForce RTX 3050 6GB Laptop GPU", "vram": 6}, "pref": {"suportado": True, "todosAlta": False, "navegadores": [{"nome": "Edge", "alta": False}]}}
PONTE = """window.__pedidos=[];window.bwNode=async(a)=>{__pedidos.push(a);if(a==='gpuAlta')return{ok:true,valor:{suportado:true,todosAlta:true,navegadores:[{nome:'Edge',alta:true}]}};return{ok:true,valor:{}}};"""
import json
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"]); ctx = b.new_context(viewport={"width": 1280, "height": 800}, service_workers="block", user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131"); ctx.route("**/*", rota)
    pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); dlg = []; pg.on("dialog", lambda d: (dlg.append(d.message), d.accept()))
    pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
    def painel(r, ponte=True):
        pg.evaluate("(r)=>{%s if(!%s) delete window.bwNode; __video.GPU.r=r; let d=document.getElementById('veGpu'); if(!d){d=document.createElement('div');d.id='veGpu';d.style.cssText='position:fixed;left:10px;top:10px;width:360px;background:#111;z-index:99999';document.body.appendChild(d)} d.innerHTML=__video.gpuHtml()}" % (PONTE, "true" if ponte else "false"), r)
        return pg.inner_text("#veGpu")
    t = painel(FALSO)
    ok("DÁ PARA FICAR MAIS RÁPIDO" in t.upper(), "status âmbar diz que dá para ficar mais rápido")
    ok("pela Intel UHD (integrada)" in t and "pela placa" not in t, "cada linha diz QUAL placa faz o trabalho (Intel integrada), sem o 'pela placa' enganoso")
    ok(pg.locator("#veGpu li.ok").count() == 0, "com a dedicada parada, nenhuma linha fica verde")
    ok(pg.locator("#veGpuAlta").count() == 1 and "NVIDIA" in pg.inner_text("#veGpuAlta"), "dentro do app aparece ⚡ USAR A NVIDIA (1 TOQUE)")
    ok(pg.locator("#veGpuAbrir").count() == 0, "dentro do app não precisa mandar para a tela do Windows")
    pg.click("#veGpuAlta"); pg.wait_for_timeout(500)
    ok(dlg and "NVIDIA" in dlg[0], "pede confirmação antes de mexer no Windows")
    ok(pg.evaluate("__pedidos").count("gpuAlta") == 1, "o toque pede ao app gravar a placa (gpuAlta)")
    t2 = pg.inner_text("#veGpu"); ok("Feche o app BW e abra de novo" in t2 and "MARCAR DE NOVO" in t2.upper(), "depois do toque diz para reabrir o app")
    sem = dict(FALSO); sem.pop("pref")
    t3 = painel(sem, ponte=False)
    ok(pg.locator("#veGpuAlta").count() == 0 and pg.locator("#veGpuAbrir").count() == 1 and "No app BW isso é um botão só" in t3, "fora do app: link da tela do Windows + aviso de que no app é 1 toque")
    nv = dict(FALSO, nome="NVIDIA GeForce RTX 3050", curto="NVIDIA GeForce RTX 3050", integ=False)
    t4 = painel(nv)
    ok("TUDO OK" in t4.upper() and pg.locator("#veGpuAlta").count() == 0, "na NVIDIA: TUDO OK e o botão some")
    ok(not er, "sem erro de JavaScript " + str(er[:2]))
    b.close()
print("\n" + ("✅ 0 falhas" if not F[0] else f"❌ {F[0]} falha(s)")); sys.exit(1 if F[0] else 0)
