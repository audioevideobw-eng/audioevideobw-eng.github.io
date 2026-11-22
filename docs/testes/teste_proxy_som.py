"""PROXY — SOM DO TAKE (22/11, dono: "ao fazer o proxy avisou que não teria áudio porque não conseguiu ler").
Causa: o som era lido com decodeAudioData do ARQUIVO INTEIRO (take > 1,5 GB pulado; takes grandes de câmera estouravam a memória).
Agora o bw-proxy.js lê o ÍNDICE do MP4/MOV e só os pedaços de som (PCM de câmera Sony "twos", "sowt", "in24" com enda, "fl32", "ipcm" e AAC).
Confere: frequência certa nos dois lados (440/880 Hz), amostras iguais às do ffmpeg, AAC sem o atraso de aquecimento (elst) e que o leitor
lê só uma fração do arquivo num take com vídeo pesado. Usa o Google Chrome (tem AAC).  Uso (na raiz): python3 docs/testes/teste_proxy_som.py"""
import http.server, threading, functools, os, subprocess, json, struct, shutil
from playwright.sync_api import sync_playwright
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); T = "/tmp/teste_proxy_som"; os.makedirs(T, exist_ok=True)
shutil.copy(f"{RAIZ}/assets/bw-proxy.js", f"{T}/bw-proxy.js"); open(f"{T}/i.html", "w").write("<html><body></body></html>")
CASOS = {"twos.mp4": ["-f", "mp4", "-c:a", "pcm_s16be"], "sowt.mov": ["-f", "mov", "-c:a", "pcm_s16le"], "in24le.mov": ["-f", "mov", "-c:a", "pcm_s24le"],
         "fl32.mov": ["-f", "mov", "-c:a", "pcm_f32be"], "ipcm.mp4": ["-f", "mp4", "-c:a", "pcm_s16le"], "aac.mp4": ["-f", "mp4", "-c:a", "aac", "-b:a", "128k"],
         "aac44.mp4": ["-f", "mp4", "-c:a", "aac", "-ar", "44100"]}
for n, a in CASOS.items():
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=3", "-f", "lavfi", "-i", "sine=frequency=880:sample_rate=48000:duration=3",
                    "-f", "lavfi", "-i", "testsrc=size=320x180:rate=30:duration=3", "-filter_complex", "[0][1]amerge=inputs=2[a]", "-map", "2", "-map", "[a]", "-c:v", "libx264", "-preset", "ultrafast"] + a + [f"{T}/{n}"], check=True)
# take "de câmera": vídeo pesado (ruído 1080p a 60 Mbps) + PCM twos — o leitor não pode ler o arquivo inteiro
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000:duration=4", "-f", "lavfi", "-i", "nullsrc=size=1920x1080:rate=30:duration=4,geq=random(1)*255:128:128",
                "-c:v", "libx264", "-preset", "ultrafast", "-b:v", "60M", "-c:a", "pcm_s16be", "-ac", "2", "-f", "mp4", f"{T}/camera.mp4"], check=True)
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8877), functools.partial(http.server.SimpleHTTPRequestHandler, directory=T)); srv.RequestHandlerClass.log_message = lambda *a: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
def ffm(f):
    d = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-map", "0:a", "-f", "f32le", "-ac", "2", "-ar", "48000", "-"], capture_output=True).stdout
    return len(d) // 8, [struct.unpack_from("<f", d, (1000 + i) * 8)[0] for i in range(4)]
JS = """async(f)=>{const bl=await (await fetch(f)).blob();let lido=0;const s0=Blob.prototype.slice;Blob.prototype.slice=function(a,b){lido+=(Math.min(b??this.size,this.size)-(a||0));return s0.apply(this,arguments)};
 const av={};const s=await BWProxy._lerSom(bl,av);Blob.prototype.slice=s0;if(!s)return {erro:av.motivo||'?'};
 const zc=a=>{let n=0;for(let i=1;i<Math.min(a.length,48000);i++)if(a[i-1]<0&&a[i]>=0)n++;return n};
 return {de:s.de,sr:s.sr,n:s.L.length,zcL:zc(s.L),zcR:zc(s.R),lido:lido,tam:bl.size,L:Array.from(s.L.slice(1000,1004))}}"""
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    pg = b.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
    pg.goto("http://127.0.0.1:8877/i.html"); pg.add_script_tag(url="/bw-proxy.js")
    for n in CASOS:
        r = pg.evaluate(JS, n); nf, lf = ffm(f"{T}/{n}")
        ok("erro" not in r and r["sr"] == 48000 and abs(r["zcL"] - 440) <= 3 and abs(r["zcR"] - 880) <= 3, f"{n}: lê o som pelo índice ({r.get('de')}, {r.get('zcL')}/{r.get('zcR')} cruzamentos — 440/880 Hz) {r.get('erro','')}")
        if "erro" not in r and not n.startswith("aac44"):
            ok(abs(r["n"] - nf) <= 2 and all(abs(x - y) < 2e-3 for x, y in zip(r["L"], lf)), f"{n}: amostras iguais às do ffmpeg ({r['n']} × {nf})")
    r = pg.evaluate(JS, "camera.mp4")
    ok("erro" not in r and r["de"] in ("twos", "ipcm") and r["lido"] < r["tam"] * 0.1, f"take de câmera ({r.get('tam', 0)//1048576} MB, PCM twos): leu só {r.get('lido', 0)//1024} KB (o som), não o arquivo inteiro")
    ok(not erros, f"sem erro de JS {erros[:2]}")
    b.close()
srv.shutdown()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s): {falhas}"))
raise SystemExit(1 if falhas else 0)
