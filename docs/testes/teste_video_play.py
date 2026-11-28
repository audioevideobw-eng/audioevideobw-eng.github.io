#!/usr/bin/env python3
"""Teste local (28/11, dono: "no iPhone o editor trava e o PLAY fica engasgando; a importação fica carregando e demora"):
mede o PLAY com o processador DESACELERADO 4× (como um celular) no layout de app (390 px) e no PC (1280 px).
- 4 takes Full HD H.264 em sequência; play de 9 s:
  * pulos (seek) feitos pelo editor DURANTE o play no take que está tocando (cada pulo = um engasgo); só o 1º de cada take vale;
  * quadros da tela que demoraram mais de 100 ms;
  * o tempo do play anda junto com o relógio (não fica preso esperando);
  * o próximo take já está pronto (pré-carregado) ANTES da emenda.
- importação de 6 arquivos: cada um aparece na biblioteca rápido (sem esperar a miniatura) e a miniatura chega depois.
- prévia leve no play do celular (canvas menor enquanto toca) e de volta ao parar.
Uso (na raiz): python3 docs/testes/teste_video_play.py"""
import os, subprocess
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8877"))
S = "/tmp/teste_play"; os.makedirs(S, exist_ok=True)
for i in range(6):
    f = f"{S}/c{i}.mp4"
    if not os.path.exists(f): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:d=3", "-vf", f"hue=h={i*60}", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-g", "60", "-b:v", "8M", f], check=True)
GANCHO = """(()=>{window.__seeks=[];const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'currentTime');
Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{get(){return d.get.call(this)},set(v){try{if(window.__video&&__video.tocando&&__video.tocando())__seeks.push({el:this,src:this.src,de:d.get.call(this),para:v,t:performance.now()})}catch(e){}d.set.call(this,v)}});
window.__gaps=[];let u=0;(function q(a){if(u&&window.__medindo)__gaps.push(a-u);u=a;requestAnimationFrame(q)})(0);})()"""
def montar(pg):
    pg.goto(BASE + "video.html?novo=1"); pg.wait_for_function("window.__veProntoOk === true", timeout=20000); pg.wait_for_timeout(600)
    t0 = pg.evaluate("performance.now()")
    pg.set_input_files("#veArq", [f"{S}/c{i}.mp4" for i in range(6)])
    pg.wait_for_function("Object.values(__video.MID).filter(m=>/^c\\d/.test(m.nome)).length >= 1", timeout=60000); t1 = pg.evaluate("performance.now()")
    pg.wait_for_function("Object.values(__video.MID).filter(m=>/^c\\d/.test(m.nome)).length >= 6", timeout=120000); t6 = pg.evaluate("performance.now()")
    pg.wait_for_function("Object.values(__video.MID).filter(m=>/^c\\d/.test(m.nome)&&m.capa).length >= 6", timeout=120000); tc = pg.evaluate("performance.now()")
    ok((t1 - t0) < 2500, f"1º arquivo aparece na biblioteca em {(t1-t0)/1000:.1f} s")
    ok((t6 - t0) < 9000, f"6 arquivos na biblioteca em {(t6-t0)/1000:.1f} s; miniaturas em {(tc-t0)/1000:.1f} s")
    ids = pg.evaluate("Object.values(__video.MID).filter(m=>/^c[0-3]/.test(m.nome)).sort((a,b)=>a.nome<b.nome?-1:1).map(m=>m.id)")
    for mid in ids: pg.evaluate(f"__video.addClip(__video.MID['{mid}'])")
    pg.wait_for_timeout(1500)
    return pg.evaluate(f"{CL}.filter(c=>c.tipo==='video').length")
def medir(pg, nome):
    pg.evaluate("__video.parar(); __video.irPara(0)"); pg.wait_for_timeout(1500)
    pg.evaluate("__seeks.length=0; __gaps.length=0; window.__medindo=true; window.__w0=performance.now(); window.__cvw0=__video.cv().width; __video.tocar()")
    pre = []
    for k in range(18):
        pg.wait_for_timeout(500)
        pre.append(pg.evaluate("""(()=>{const T=__video.T();const cs=__video.P().clips.filter(c=>c.tipo==='video').sort((a,b)=>a.ini-b.ini);const prox=cs.find(c=>c.ini>T&&c.ini-T<0.9);
          if(!prox)return null;const o=__video.EL[prox.id];return o?{pronto:o.e.readyState>=2&&Math.abs(o.e.currentTime-(prox.corte||0))<0.15}:{pronto:false}})()"""))
    r = pg.evaluate("""(()=>{window.__medindo=false;const w=(performance.now()-__w0)/1000,T=__video.T(),cvp=__video.cv().width;__video.parar();
      const vistos={},extra=[];__seeks.forEach(s=>{if(vistos[s.src])extra.push(s);else vistos[s.src]=1});
      return {w,T,extra:extra.length,ex:extra.slice(0,4).map(s=>[+s.de.toFixed(2),+s.para.toFixed(2)]),g100:__gaps.filter(g=>g>100).length,gmax:Math.max(...__gaps),n:__gaps.length,cvp,cv0:__cvw0,cvf:__video.cv().width}})()""")
    prontos = [x["pronto"] for x in pre if x]
    print(f"   [{nome}] tocou {r['w']:.1f} s, T={r['T']:.1f}; pulos extras={r['extra']} {r['ex']}; quadros >100 ms={r['g100']}/{r['n']} (máx {r['gmax']:.0f} ms); próximo pronto {prontos}")
    ok(r["extra"] <= 1, f"{nome}: sem pulos no meio do take tocando ({r['extra']})")
    ok(r["T"] > r["w"] * 0.85, f"{nome}: o play anda junto com o relógio (T {r['T']:.1f} de {r['w']:.1f} s)")
    ok(prontos and all(prontos), f"{nome}: o próximo take já está pronto antes da emenda ({prontos})")
    return r
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for nome, vp, mob in (("celular 390", {"width": 390, "height": 844}, True), ("PC 1280", {"width": 1280, "height": 900}, False)):
        ctx = b.new_context(viewport=vp, service_workers="block", is_mobile=mob, has_touch=mob, user_agent=("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36" if mob else None))
        ctx.route("**/*", rota); ctx.add_init_script(GANCHO); pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        cdp = ctx.new_cdp_session(pg); cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
        n = montar(pg); ok(n >= 4, f"{nome}: {n} takes na linha do tempo")
        r = medir(pg, nome)
        if mob: ok(r["cvp"] < r["cv0"] or r["cv0"] <= 720, f"{nome}: prévia mais leve enquanto toca ({r['cv0']} → {r['cvp']}) e volta ao parar ({r['cvf']})")
        ok(not er, f"{nome}: sem erro de JS {er[:2]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
