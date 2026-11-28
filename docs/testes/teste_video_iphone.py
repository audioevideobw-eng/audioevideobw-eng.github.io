#!/usr/bin/env python3
"""Teste local (28/11/2026, dono: "faça para takes de vídeo realizados de iPhone, todos os formatos").
Arquivos DE VERDADE feitos aqui com o FFmpeg: H.264 girado (±90°, como o iPhone grava em pé), HEVC 10 bits HLG (o HDR do iPhone) girado e ProRes.
1) BWVideoIphone.info lê o índice: codec, giro, HDR, quadros, som, codec string do HEVC.
2) Conversão NO APARELHO (VideoDecoder → canvas → VideoEncoder) com o take H.264 girado: o MP4 sai em pé (180×320), com som AAC, e a imagem
   bate com a do FFmpeg (o quadradinho verde no MESMO canto) — os dois sentidos de giro.
3) Editor de vídeo com o take HEVC: sem decodificador aqui e sem app → fica ⚠ com o motivo; com o app BW SIMULADO (a ponte devolve o MP4 feito
   pelo motor/converter-video.mjs de verdade) → converte, entra sem ⚠, prévia com imagem, reabrir NÃO converte de novo. Telas e Álbum também.
Uso (na raiz): python3 docs/testes/teste_video_iphone.py"""
import json, os, subprocess, base64
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8876"))
D = "/tmp/conv_teste"; os.makedirs(D, exist_ok=True)
STUDIO = os.environ.get("BW_STUDIO", "/home/claude/pac157/bw-reels-studio")
def sh(c): subprocess.run(c, shell=True, check=True)
SRC = "-f lavfi -i color=red:s=320x180:d=3:r=30 -f lavfi -i color=blue:s=160x180:d=3:r=30 -f lavfi -i color=lime:s=60x40:d=3:r=30 -f lavfi -i sine=f=440:d=3:sample_rate=48000"
FC = "[0][1]overlay=160:0[a];[a][2]overlay=10:10,format=%s[v]"
if not os.path.exists(D + "/hevc.mov"):
    sh(f"ffmpeg -hide_banner -loglevel error -y {SRC} -filter_complex '{FC % 'yuv420p'}' -map '[v]' -map 3 -c:v libx264 -bf 2 -g 30 -c:a aac {D}/h264.mov")
    sh(f"ffmpeg -hide_banner -loglevel error -y {SRC} -filter_complex '{FC % 'yuv420p10le'}' -map '[v]' -map 3 -c:v libx265 -x265-params log-level=error:colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -tag:v hvc1 -c:a aac {D}/hevc0.mov")
    sh(f"ffmpeg -hide_banner -loglevel error -y {SRC} -filter_complex '{FC % 'yuv422p10le'}' -map '[v]' -map 3 -c:v prores_ks -profile:v 2 -c:a pcm_s16le {D}/prores.mov")
    for g, n in (("90", "rot90"), ("-90", "rotm90")): sh(f"ffmpeg -hide_banner -loglevel error -y -display_rotation {g} -i {D}/h264.mov -c copy -tag:v avc1 {D}/{n}.mov")
    sh(f"ffmpeg -hide_banner -loglevel error -y -display_rotation -90 -i {D}/hevc0.mov -c copy -tag:v hvc1 {D}/hevc.mov")
# o MP4 que o app BW devolveria (feito pelo conversor de verdade do app)
CONV = D + "/hevc.convertido.mp4"
sh(f"""cd {STUDIO} && node --input-type=module -e "
import * as C from './motor/converter-video.mjs'; import {{readFileSync, writeFileSync}} from 'node:fs';
const b = readFileSync('{D}/hevc.mov'), {{ id }} = C.ini({{ nome: 'IMG_7001.MOV', bytes: b.length }}); C.pedaco({{ id, b64: b.toString('base64') }});
const r = await C.fazer({{ id, curto: 2160 }}); writeFileSync('{CONV}', Buffer.from(C.ler({{ id, de: 0, ate: r.bytes }}), 'base64')); C.fim({{ id }}); console.log(JSON.stringify(r));" """)
def sonda(f): return json.loads(subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_streams", "-show_format", f], capture_output=True, text=True).stdout)
s = sonda(CONV); vs = [x for x in s["streams"] if x["codec_type"] == "video"][0]
ok(vs["codec_name"] == "h264" and (vs["width"], vs["height"]) == (180, 320) and any(x["codec_type"] == "audio" for x in s["streams"]), f"0) app BW (FFmpeg): HEVC HLG girado → H.264 em pé {vs['width']}×{vs['height']} com som, cor {vs.get('color_transfer')}")
def px(f, t, w, h):   # quadro do arquivo (já girado pelo FFmpeg) em RGB
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(t), "-i", f, "-frames:v", "1", "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
    return lambda x, y: tuple(r[(y * w + x) * 3:(y * w + x) * 3 + 3])
def verde(c): return c[1] > 150 and c[0] < 120 and c[2] < 120
def ondeVerde(f):
    p = px(f, 1.5, 90, 160); return [(x, y) for x in range(0, 90, 6) for y in range(0, 160, 6) if verde(p(x, y))]
APP = """window.BW_APP={versao:'teste'};window.__conv={pedacos:0,feitos:0,fim:0};window.bwNode=async function(a,d){
  var C=window.__conv; if(!C.saida){var r=await fetch('/__conv.mp4');C.saida=new Uint8Array(await r.arrayBuffer());}
  function b64(u){var s='';for(var o=0;o<u.length;o+=32768)s+=String.fromCharCode.apply(null,u.subarray(o,o+32768));return btoa(s);}
  if(a==='videoConvPode')return{ok:true,valor:{ffmpeg:true,nvenc:true}};
  if(a==='videoConvIni')return{ok:true,valor:{id:'0123456789abcdef'}};
  if(a==='videoConvPedaco'){C.pedacos++;return{ok:true,valor:{}};}
  if(a==='videoConvFazer'){C.feitos++;window.bwConv&&window.bwConv({id:d.id,pct:50,placa:'NVIDIA'});return{ok:true,valor:{bytes:C.saida.length,w:180,h:320,placa:'NVIDIA',comSom:true}};}
  if(a==='videoConvLer')return{ok:true,valor:b64(C.saida.subarray(d.de,d.ate))};
  if(a==='videoConvFim'){C.fim++;return{ok:true,valor:true};}
  return{ok:false,erro:'ação simulada desconhecida'};};"""
# navegador que NÃO abre o .mov (como o Chrome do Android/Windows sem a peça de HEVC): blob de tipo video/quicktime falha no <video>
SEM_MOV = """(function(){var cu=URL.createObjectURL,mov=new Set();URL.createObjectURL=function(b){var u=cu.call(URL,b);if(b&&b.type==='video/quicktime')mov.add(u);return u;};
 var d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,'src');Object.defineProperty(HTMLMediaElement.prototype,'src',{get:function(){return d.get.call(this)},set:function(v){d.set.call(this,mov.has(v)?'blob:nao-abre':v)},configurable:true});})();"""
def rota3(r):
    if r.request.url.endswith("/__conv.mp4"): return r.fulfill(path=CONV, content_type="video/mp4")
    return rota(r)
LER = "async (u)=>{var r=await fetch(u);return new Blob([await r.arrayBuffer()],{type:'video/quicktime'});}"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel, user_agent=None if not cel else "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/153 Mobile Safari/537.36")
        ctx.add_init_script(SEM_MOV); ctx.route("**/*", rota3); ctx.route("**/__t/*", lambda r: r.fulfill(path=D + "/" + r.request.url.split("/__t/")[1], content_type="video/quicktime"))
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
        ok(pg.evaluate("typeof BWVideoIphone.converter") == "function", "BWVideoIphone carregado")
        i = pg.evaluate(f"(async()=>{{var b=await ({LER})('/__t/hevc.mov');var i=await BWVideoIphone.info(b);return {{codec:i.codec,hdr:i.hdr,rot:i.rot,w:i.w,h:i.h,q:i.quadros,som:i.temSom,str:i.codecStr,fps:i.fps,desc:BWVideoIphone.descricao(i)}}}})()")
        ok(i["codec"] == "hevc" and i["hdr"] == "HLG" and i["rot"] in (90, 270) and (i["w"], i["h"]) == (320, 180) and i["q"] == 90 and i["som"] and i["str"].startswith("hvc1.2."), f"1) info do HEVC: {i}")
        i2 = pg.evaluate(f"(async()=>{{var i=await BWVideoIphone.info(await ({LER})('/__t/prores.mov'));return [i.codec,i.nomeCodec]}})()")
        ok(i2[0] == "prores", f"…ProRes reconhecido: {i2}")
        for nome in ("rot90", "rotm90"):
            r = pg.evaluate(f"""(async()=>{{var b=await ({LER})('/__t/{nome}.mov');var i=await BWVideoIphone.info(b);var ps=[];
              var r=await BWVideoIphone.converter(b,{{nome:'IMG_{nome}.MOV',aoProgredir:function(p){{ps.push(Math.round(p.pct))}}}});
              var u=new Uint8Array(await r.blob.arrayBuffer());var s='';for(var o=0;o<u.length;o+=32768)s+=String.fromCharCode.apply(null,u.subarray(o,o+32768));
              return {{rot:i.rot,via:r.via,w:r.w,h:r.h,som:r.comSom,nome:r.nome,ps:ps.slice(-2),b64:btoa(s)}}}})()""")
            open(f"{D}/{nome}.aparelho.mp4", "wb").write(base64.b64decode(r.pop("b64")))
            s = sonda(f"{D}/{nome}.aparelho.mp4"); vs = [x for x in s["streams"] if x["codec_type"] == "video"][0]; aud = [x for x in s["streams"] if x["codec_type"] == "audio"]
            ok(r["via"] == "aparelho" and (vs["width"], vs["height"]) == (180, 320) and vs["codec_name"] == "h264", f"2) {nome} convertido NO APARELHO em pé: {r} · {vs['width']}×{vs['height']} {vs['codec_name']}")
            ok(aud and abs(float(s["format"]["duration"]) - 3) < 0.25 and r["nome"].endswith(".mp4") and r["ps"][-1] == 100, f"…com som ({aud[0]['codec_name'] if aud else '-'}), {float(s['format']['duration']):.2f} s, progresso até 100")
            ref, meu = ondeVerde(f"{D}/{nome}.mov"), ondeVerde(f"{D}/{nome}.aparelho.mp4")
            mr = (sum(x for x, y in ref) / max(1, len(ref)), sum(y for x, y in ref) / max(1, len(ref))); mm = (sum(x for x, y in meu) / max(1, len(meu)), sum(y for x, y in meu) / max(1, len(meu)))
            ok(ref and meu and abs(mr[0] - mm[0]) < 12 and abs(mr[1] - mm[1]) < 12, f"…o giro bate com o do FFmpeg (verde em {tuple(round(v) for v in mm)} × {tuple(round(v) for v in mr)})")
        # editor com o HEVC
        dec = pg.evaluate("(async()=>{try{return (await VideoDecoder.isConfigSupported({codec:'hvc1.2.4.L93.B0',codedWidth:320,codedHeight:180})).supported}catch(e){return 'erro'}})()")
        print(f"   (este Chrome decodifica HEVC? {dec})")
        pg.set_input_files("#veArq", [f"{D}/hevc.mov"]); pg.wait_for_function("Object.values(__video.MID).some(m=>/hevc/i.test(m.nome)||/IMG|hevc/.test(m.nome))", timeout=90000); pg.wait_for_timeout(1500)
        m = pg.evaluate("(()=>{var m=Object.values(__video.MID).find(m=>/hevc/i.test(m.nome));return m?{ruim:!!m.ruim,motivo:m.motivoConv||'',codec:m.codec,nome:m.nome}:null})()")
        if dec is True: ok(m and not m["ruim"], f"3) este navegador decodifica HEVC: entrou convertido no aparelho {m}")
        else: ok(m and m["ruim"] and m["codec"] == "hevc" and "app BW" in m["motivo"], f"3) sem decodificador e sem app: fica ⚠ com o motivo ({m})")
        ctx.close()
        # com o app BW simulado
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel); ctx.add_init_script(SEM_MOV); ctx.add_init_script(APP); ctx.route("**/*", rota3)
        pg = ctx.new_page(); er2 = []; pg.on("pageerror", lambda e: er2.append(str(e)))
        pg.goto(BASE + "video.html"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
        if dec is not True:
            pg.set_input_files("#veArq", [f"{D}/hevc.mov"]); pg.wait_for_function("Object.values(__video.MID).length>0 && window.__conv.fim>0", timeout=90000); pg.wait_for_timeout(1800)
            m = pg.evaluate("(()=>{var m=Object.values(__video.MID)[0];return {ruim:!!m.ruim,nome:m.nome,tipo:m.blob.type,via:m.convertido&&m.convertido.via,capa:!!m.capa,w:m.w,h:m.h}})()")
            C = pg.evaluate("({p:__conv.pedacos,f:__conv.feitos,fim:__conv.fim})")
            ok(not m["ruim"] and m["via"] == "pc" and m["nome"].endswith(".mp4") and m["capa"], f"4) com o app BW: convertido no PC e entrou sem ⚠ {m} · ponte {C}")
            ok(C["f"] == 1 and C["fim"] == 1, "…um pedido de conversão e a limpeza no fim (arquivo temporário apagado)")
            pg.evaluate("__video.addClip && 0"); pg.locator('#veLib [data-mid]').first.click() if not cel else (pg.locator("#vaAdd").tap(), pg.wait_for_timeout(500), pg.locator('#veLib [data-mid]').first.tap())
            pg.wait_for_timeout(700); pg.evaluate("__video.irPara(1.5)"); pg.wait_for_timeout(1500)
            cor = pg.evaluate("(()=>{var c=document.querySelector('#veCv'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data,n=0;for(var i=0;i<d.length;i+=64)if(d[i]+d[i+1]+d[i+2]>120)n++;return n})()")
            ok(cor > 50, f"…a prévia mostra o take convertido ({cor} pontos com imagem)")
            pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(1500)
            m2 = pg.evaluate("(()=>{var m=Object.values(__video.MID)[0];return m?{ruim:!!m.ruim,tipo:m.blob.type,nome:m.nome}:null})()")
            ok(m2 and not m2["ruim"] and m2["nome"].endswith(".mp4") and pg.evaluate("__conv.feitos") == 0, f"…reabrir: guardado já convertido, sem converter de novo {m2}")
        ok(not er and not er2, f"0 erros de JS {(er + er2)[:2]}")
        ctx.close()
    if True:
        print("\n=== Telas e Álbum 3D com o app BW simulado (1280) ===")
        for pag, inp in (("telas.html", "#tlArq"), ("album3d.html", "#alArq")):
            ctx = b.new_context(viewport={"width": 1280, "height": 900}, service_workers="block"); ctx.add_init_script(SEM_MOV); ctx.add_init_script(APP); ctx.route("**/*", rota3)
            pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.goto(BASE + pag); pg.wait_for_timeout(2000)
            pg.set_input_files(inp, [f"{D}/hevc.mov"]); pg.wait_for_function("window.__conv && __conv.fim>0", timeout=60000); pg.wait_for_timeout(2500)
            txt = pg.inner_text("body").lower(); av = pg.evaluate("(document.querySelector('#bwAviso')||{}).innerText||''")
            nm = pg.evaluate("(async()=>{var d=await new Promise(function(ok){var r=indexedDB.open('" + ("bw_telas" if pag == "telas.html" else "bw_album") + "');r.onsuccess=function(){ok(r.result)}});var t=d.transaction('midias').objectStore('midias').getAll();return await new Promise(function(ok){t.onsuccess=function(){ok(t.result.map(function(x){return [x.nome,x.tipo,x.blob&&x.blob.type,x.w,x.h]}))}})})()")
            ok(any(n[0].endswith(".mp4") and n[2] == "video/mp4" and (n[3], n[4]) == (180, 320) for n in nm) and "não abre" not in txt, f"{pag}: o take HEVC entrou convertido {nm} · aviso: {av[:60]}")
            ok(not er, f"{pag}: 0 erros de JS {er[:2]}")
            ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
raise SystemExit(1 if falhas else 0)
