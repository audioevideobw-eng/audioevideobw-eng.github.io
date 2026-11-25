#!/usr/bin/env python3
"""Teste da DECUPAGEM COM IA (25/11/2026; dono: "Gemini fazendo a decupagem dos takes no editor de vídeo"). 1280 e 390 px.
1) Os ajudantes da Edge Function bw-ia-video (recortados do index.ts e rodados no Node): tempo MM:SS, texto da resposta nos dois formatos
   (interactions e generateContent), JSON com cercas ```, trechos fora do take presos ao fim, tipo desconhecido, nota fora da faixa.
2) No editor: 🎬 DECUPAR COM IA → janela com os takes → confirm() (recusar = nada sai) → a cópia LEVE que vai para a função é conferida no
   ffprobe (MP4, lado curto ≤ 360, ~2 quadros/s, com som, < 18 MB, ?dur= e ?ctx=) → resposta SIMULADA → lista com filtros, ＋ PÔR (clipe já
   aparado no trecho), MONTAR COM OS MELHORES (fila sem os ruins), selo 🎬 na biblioteca, guardado no aparelho (sobrevive ao recarregar).
3) Erros: sem login, limite do dia e IA fora do ar mostram o motivo. Nada vai para outro endereço além da bw-ia-video.
Uso (na raiz): python3 docs/testes/teste_decupar.py"""
import os, subprocess, json, re, urllib.parse
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8891"))

# ---------- 1) ajudantes da função, no Node ----------
ts = open(os.path.join(RAIZ, "docs/supabase/functions/bw-ia-video/index.ts"), encoding="utf-8").read()
aj = ts[ts.index("// ===== AJUDANTES"):ts.index("// ===== FIM-AJUDANTES")]
js = aj  # o Node 22 roda TypeScript direto (tira os tipos sozinho)
cod = js + """
const r = {};
r.seg = [seg("01:15"), seg("00:03.5"), seg("1:02:03"), seg(7), seg("x")];
r.t1 = textoDe({output_text: "OI"}); r.t2 = textoDe({candidates: [{content: {parts: [{text: "A"}, {text: "B"}]}}]});
r.t3 = textoDe({input: [{type: "text", text: "PEDIDO"}], steps: [{type: "model_output", content: [{type: "text", text: "{\\"resumo\\":1}"}]}]});
r.d = decupagem("```json\\n{\\"resumo\\":\\"Palestra **boa**\\",\\"trechos\\":[{\\"ini\\":\\"00:20\\",\\"fim\\":\\"00:25\\",\\"tipo\\":\\"plateia\\",\\"nota\\":9,\\"desc\\":\\"aplausos\\"},{\\"ini\\":\\"00:02\\",\\"fim\\":\\"00:06\\",\\"tipo\\":\\"FALA\\",\\"nota\\":5,\\"desc\\":\\"abertura\\",\\"fala\\":\\"Bom dia a todos\\"},{\\"ini\\":\\"00:28\\",\\"fim\\":\\"01:40\\",\\"tipo\\":\\"drone\\",\\"nota\\":0}]}\\n```", 30);
r.nulo = decupagem("não sei", 30);
r.pedido = pedido(30, "convenção da Vale");
console.log(JSON.stringify(r));
"""
open("/tmp/teste_decupar_aj.mts", "w").write(cod)
sai = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "/tmp/teste_decupar_aj.mts"], capture_output=True, text=True)
print("Ajudantes da Edge Function (Node):")
try: R = json.loads(sai.stdout.strip().splitlines()[-1])
except Exception: R = {}; print(sai.stderr[:800])
ok(R.get("seg", [None])[:4] == [75, 3.5, 3723, 7] and R["seg"][4] is None, f"tempo MM:SS / HH:MM:SS / número ({R.get('seg')})")
ok(R.get("t1") == "OI" and R.get("t2") == "AB", "texto da resposta: output_text e generateContent (candidates)")
ok(R.get("t3") == '{"resumo":1}', f"texto da resposta: passo model_output da interactions, sem pegar o PEDIDO ({R.get('t3')!r})")
d = R.get("d") or {}; tr = d.get("trechos") or []
ok(d.get("resumo") == "Palestra boa", "resumo sem a marcação ** da IA")
ok(len(tr) == 3 and tr[0]["ini"] == 2 and tr[0]["tipo"] == "fala" and tr[0]["fala"] == "Bom dia a todos", "trechos em ordem de tempo, tipo em minúsculas, fala mantida")
ok(tr and tr[1]["nota"] == 5 and tr[2]["nota"] == 1, "nota presa entre 1 e 5")
ok(tr and tr[2]["fim"] == 30 and tr[2]["tipo"] == "palco", "trecho que passa do fim do take é cortado; tipo desconhecido vira 'palco'")
ok(R.get("nulo") is None, "resposta sem JSON = nada (a função tenta o próximo modelo)")
ok("convenção da Vale" in (R.get("pedido") or "") and "MM:SS" in (R.get("pedido") or "") and "NÃO invente" in (R.get("pedido") or ""), "pedido à IA: contexto do evento, formato MM:SS e 'não invente'")

# ---------- 2) no editor ----------
S = "/tmp/teste_decupar"; os.makedirs(S, exist_ok=True)
F = f"{S}/palestra.webm"
if not os.path.exists(F): subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=30:d=12", "-f", "lavfi", "-i", "sine=f=330:d=12", "-c:v", "libvpx-vp9", "-b:v", "2M", "-deadline", "realtime", "-c:a", "libopus", "-shortest", F], check=True)
RESP = {"resumo": "Palestrante no palco e plateia aplaudindo", "modelo": "gemini-teste", "trechos": [
    {"ini": 1, "fim": 4, "tipo": "fala", "nota": 5, "desc": "abertura", "fala": "Sejam bem-vindos"},
    {"ini": 4.5, "fim": 6, "tipo": "ruim", "nota": 1, "desc": "câmera tremida", "fala": ""},
    {"ini": 7, "fim": 9.5, "tipo": "plateia", "nota": 4, "desc": "aplausos", "fala": ""},
    {"ini": 10, "fim": 11.5, "tipo": "detalhe", "nota": 3, "desc": "logo no telão", "fala": ""}]}
SESSAO = "window.BWSync={cliente:function(){return{auth:{getSession:async function(){return{data:{session:{access_token:'tok-teste'}}}}}}}};"
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"])
    for W, H in ((1280, 900), (390, 844)):
        cel = W < 500; print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=cel)
        pedidos = []; resposta = {"st": 200, "j": RESP}
        def rota2(r):
            u = r.request.url
            if "functions/v1/bw-ia-video" in u:
                pedidos.append({"url": u, "corpo": r.request.post_data_buffer, "h": r.request.headers})
                return r.fulfill(status=resposta["st"], body=json.dumps(resposta["j"]), content_type="application/json", headers={"Access-Control-Allow-Origin": "*"})
            if "127.0.0.1" not in u and not u.startswith(("blob:", "data:", "about:")) and "supabase-js" not in u and "fonts.g" not in u: pedidos.append({"url": u, "fora": True})
            return rota(r)
        ctx.route("**/*", rota2)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(400)
        pg.evaluate("localStorage.removeItem('ui_ve_decup')"); pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
        pg.evaluate(SESSAO)
        ok(pg.evaluate("typeof BWDecupar === 'object' && typeof BWDecupar.analisar === 'function'"), "bw-decupar.js carregado")
        pg.set_input_files("#veArq", [F]); pg.wait_for_function("Object.values(__video.MID).some(m=>m.nome==='palestra.webm' && m.dur>0)", timeout=30000); pg.wait_for_timeout(400)
        bt = pg.locator("#veDecupBt"); bt.scroll_into_view_if_needed(); ok(bt.is_visible(), "botão 🎬 DECUPAR COM IA embaixo da mídia")
        bt.click(); pg.wait_for_selector("#veJanDecup", timeout=3000)
        ok(pg.locator("#veJanDecup .ve-pxit input:checked").count() == 1, "janela lista o take, já marcado")
        pg.fill("#veDcCtx", "convenção de vendas")
        # recusar o confirm = nada sai
        pg.once("dialog", lambda d: d.dismiss()); pg.click("#veDcIr"); pg.wait_for_timeout(800)
        ok(not pedidos, "recusou o aviso de envio → NADA foi enviado")
        msgs = []
        def aceita(d): msgs.append(d.message); d.accept()
        pg.once("dialog", aceita); pg.click("#veDcIr")
        pg.wait_for_selector("#veJanDecupVer", timeout=90000)
        ok(msgs and "Google" in msgs[0] and "não fica guardada" in msgs[0], "o aviso diz para onde vai (Google/Gemini) e que não fica guardada")
        ped = [x for x in pedidos if not x.get("fora")]
        ok(len(ped) == 1, f"1 envio para a bw-ia-video ({len(ped)})")
        ok(not [x for x in pedidos if x.get("fora")], "nada foi para outro endereço")
        if ped:
            q = urllib.parse.parse_qs(urllib.parse.urlparse(ped[0]["url"]).query)
            ok(q.get("dur") == ["12"] and q.get("ctx") == ["convenção de vendas"], f"?dur e ?ctx ({q})")
            ok(ped[0]["h"].get("authorization") == "Bearer tok-teste" and ped[0]["h"].get("content-type") == "video/mp4", "com o login (Bearer) e Content-Type video/mp4")
            open(f"{S}/copia{W}.mp4", "wb").write(ped[0]["corpo"])
            pr = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", f"{S}/copia{W}.mp4"], capture_output=True, text=True).stdout or "{}")
            vs = [s for s in pr.get("streams", []) if s["codec_type"] == "video"]; aus = [s for s in pr.get("streams", []) if s["codec_type"] == "audio"]
            n = int(subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0", "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", f"{S}/copia{W}.mp4"], capture_output=True, text=True).stdout.strip() or 0)
            tam = len(ped[0]["corpo"])
            ok(vs and min(vs[0]["width"], vs[0]["height"]) == 360, f"cópia LEVE: lado curto 360 ({vs and (vs[0]['width'], vs[0]['height'])})")
            ok(15 <= n <= 30, f"…~2 quadros por segundo ({n} quadros em 12 s)")
            ok(aus, f"…com som ({aus and aus[0]['codec_name']})"); ok(tam < 1_500_000, f"…pequena ({tam // 1024} KB para 12 s)")
            dur = float(pr.get("format", {}).get("duration", 0)); ok(11 < dur < 13.5, f"…com a duração do take ({dur:.1f} s)")
        dec = pg.evaluate("__video.DEC()"); ok(len(list(dec.values())) == 1 and len(list(dec.values())[0]["trechos"]) == 4, "resultado guardado (4 trechos)")
        txt = pg.inner_text("#veJanDecupVer")
        ok("Sejam bem-vindos" in txt and "aplausos" in txt and "câmera tremida" not in txt and "logo no telão" not in txt, "lista padrão: nota 4+ e sem os ruins (fala e plateia)")
        pg.click('#veDcFiltro [data-nota="1"]'); txt = pg.inner_text("#veJanDecupVer"); ok("logo no telão" in txt and "câmera tremida" not in txt, "TODAS AS NOTAS mostra o detalhe, ainda sem o ruim")
        pg.check("#veDcRuins"); ok("câmera tremida" in pg.inner_text("#veJanDecupVer"), "'mostrar os ruins' mostra o tremido")
        pg.uncheck("#veDcRuins"); pg.click('#veDcFiltro [data-tipo="plateia"]'); txt = pg.inner_text("#veJanDecupVer"); ok("aplausos" in txt and "Sejam" not in txt, "filtro por tipo (PLATEIA)")
        pg.click('#veDcFiltro [data-tipo=""]'); pg.click('#veDcFiltro [data-nota="4"]')
        antes = pg.evaluate("__video.P().clips.length"); pg.evaluate("__video.irPara(0)")
        pg.locator('#veJanDecupVer [data-por]').first.click(); pg.wait_for_timeout(300)
        c = pg.evaluate("__video.P().clips[__video.P().clips.length-1]")
        ok(pg.evaluate("__video.P().clips.length") == antes + 1 and abs(c["corte"] - 1) < 0.01 and abs(c["dur"] - 3) < 0.01, f"＋ PÔR: clipe JÁ APARADO no trecho (corte {c['corte']} s, {c['dur']} s)")
        pg.click("#veDcMontar"); pg.wait_for_timeout(400)
        cl = pg.evaluate("__video.P().clips.filter(c=>c.decup)")[1:]   # o 1º é o do ＋ PÔR
        tipos = [x["decup"] for x in cl]
        ok(tipos == ["fala", "plateia"], f"MONTAR COM OS MELHORES: fila com fala + plateia, sem o ruim nem o de nota 3 ({tipos})")
        v1 = sorted([x for x in cl if x["trilha"] == "v1"], key=lambda x: x["ini"])
        ok(all(abs(v1[i]["ini"] + v1[i]["dur"] - v1[i + 1]["ini"]) < 0.06 for i in range(len(v1) - 1)), "…colados um depois do outro na camada de vídeo")
        pg.wait_for_timeout(300); ok("🎬 4" in pg.inner_text("#veLib"), "selo 🎬 4 na biblioteca")
        pg.reload(); pg.wait_for_function("window.__veProntoOk === true", timeout=15000); pg.wait_for_timeout(600)
        ok(len(pg.evaluate("__video.DEC()")) == 1 and "🎬 4" in pg.inner_text("#veLib"), "recarregou: a decupagem continua (guardada no aparelho)")
        # erros
        pg.evaluate(SESSAO)
        for st, corpo, esperado in ((429, {"erro": "limite"}, "limite"), (502, {"erro": "gemini", "detalhe": ["x"]}, "não respondeu")):
            resposta["st"], resposta["j"] = st, corpo
            r = pg.evaluate("(async()=>{const m=Object.values(__video.MID)[0];const r=await BWDecupar.analisar(m.blob,{dur:m.dur});return BWDecupar.msg(r.erro)})()")
            ok(esperado in r, f"erro {st} mostra o motivo ({r})")
        pg.evaluate("window.BWSync=undefined")
        r = pg.evaluate("(async()=>{const m=Object.values(__video.MID)[0];const r=await BWDecupar.analisar(m.blob,{dur:m.dur});return r.erro})()")
        ok(r == "sem_login", "sem login: pede para entrar e não envia nada")
        ok(not er, f"sem erros de JavaScript ({er[:2]})")
        ctx.close()
    b.close()
print("\n✓ Tudo certo." if not falhas else f"\n✗ {len(falhas)} falha(s)")
os._exit(1 if falhas else 0)
