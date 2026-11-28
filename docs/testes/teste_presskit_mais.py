#!/usr/bin/env python3
"""Teste local (28/11/2026): PRESS KIT — recursos novos.
  ✨ foto da IA: o pedido leva a trava de rosto/corpo (sem acessórios) e cabe em 700 letras; ⬇ BAIXAR FOTO DA IA baixa a foto nova;
  ✥ EFEITOS na capa: mistura + máscara + opacidade mudam o PIXEL da prévia e ↺ SEM EFEITO volta;
  VÁRIOS: seletor de press kits no editor e ⧉ DUPLICAR ESTE;
  🌐 IDIOMA: cópia em inglês com a IA SIMULADA (nome, números e links iguais; títulos das partes em inglês; o original intacto);
  🎬 VÍDEO: MP4 de verdade (ffprobe: H.264, 1080×1920 / 1080×1080, duração), quadros diferentes ao longo do tempo;
  🔗 LINK: com o Supabase SIMULADO — caixinha obrigatória, linha na tabela, fotos + PDF no balde, só partes ligadas, TIRAR DO AR apaga;
     depois kit.html abre a página pública com esses dados (textos por textContent: marcação vira texto), em 1280 e 390 px sem estouro.
Bibliotecas como em teste_presskit.py (/tmp/pm/node_modules).  Uso (na raiz):  python3 docs/testes/teste_presskit_mais.py"""
import base64, http.server, io, json, os, re, socketserver, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8843
PM = os.environ.get("PK_LIBS", "/tmp/pm") + "/node_modules/"
NM = "/opt/npm-tools/node_modules/"
SUPA = "https://zdtnetplvdonogmdvarx.supabase.co"
PUBLICO = SUPA + "/storage/v1/object/public/presskit/"
# Supabase simulado que GUARDA o que a página grava (tabela e balde) em window.__sb
STUB_SB = r"""window.__sb = { linhas: {}, arq: {}, log: [] };
window.supabase = { createClient: function () {
  const S = window.__sb, ses = { access_token: 'tok', user: { id: 'u-teste', email: 'teste@ex.com' } };
  function tabela(nome) {
    let op = null, val = null, filtro = null;
    const q = { select() { return q; }, eq(c, v) { filtro = [c, v]; return q; }, neq() { return q; }, in() { return q; }, is() { return q; }, order() { return q; }, limit() { return q; }, maybeSingle() { return q; },
      insert(v) { op = 'insert'; val = v; return q; }, upsert(v) { op = 'upsert'; val = v; return q; }, update(v) { op = 'update'; val = v; return q; }, delete() { op = 'delete'; return q; },
      then(r) { let res = { data: [], error: null };
        if (nome === 'bw_presskit_pub') { S.log.push(op + ':' + nome);
          if (op === 'insert' || op === 'upsert') S.linhas[val.token] = Object.assign({ dono: 'u-teste' }, val);
          else if (op === 'update' && filtro) Object.assign(S.linhas[filtro[1]] || {}, val);
          else if (op === 'delete' && filtro) delete S.linhas[filtro[1]]; }
        return Promise.resolve(res).then(r); } };
    return q; }
  function balde(b) { return {
    upload: async (cam, blob) => { const fr = new FileReader(); const d = await new Promise(ok => { fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); }); S.arq[cam] = d; S.log.push('up:' + cam); return { data: { path: cam }, error: null }; },
    getPublicUrl: (cam) => ({ data: { publicUrl: '""" + PUBLICO + r"""' + cam } }),
    list: async (pasta) => { const pre = pasta + '/', nomes = new Set(); Object.keys(S.arq).forEach(k => { if (k.indexOf(pre) === 0) nomes.add(k.slice(pre.length).split('/')[0]); }); return { data: [...nomes].map(n => ({ name: n })), error: null }; },
    remove: async (l) => { l.forEach(k => { delete S.arq[k]; S.log.push('rm:' + k); }); return { data: l, error: null }; } }; }
  return { auth: { getSession: async () => ({ data: { session: ses } }), getUser: async () => ({ data: { user: ses.user } }), onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; } },
    from: tabela, rpc: async () => ({ data: null, error: null }), storage: { from: balde } }; } };"""

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
CORS = {"Access-Control-Allow-Origin": "*"}
FORA, IMG_PEDIDOS, IA_PEDIDOS = [], [], []
PUB = {"dados": None, "arq": {}}   # o que o link "publicou" (para o kit.html)

def _png(cor, w=512, h=640, fmt="JPEG"):
    from PIL import Image
    b = io.BytesIO(); Image.new("RGB", (w, h), cor).save(b, fmt); return b.getvalue()
AZUL_B64 = base64.b64encode(_png((20, 60, 230))).decode()

def traduz(pd):
    """IA simulada de tradução: devolve as mesmas chaves com 'EN:' na frente (números iguais)."""
    try: corpo = json.loads(pd); pedido = json.loads(corpo.get("pedido") or corpo.get("texto") or "{}")
    except Exception: return None
    if not isinstance(pedido, dict) or not pedido: return None
    return {k: "EN: " + v for k, v in pedido.items()}

def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u: return r.fulfill(path=PM + "pdfmake/build/pdfmake.min.js", content_type="application/javascript")
    if "vfs_fonts" in u: return r.fulfill(path=PM + "pdfmake/build/vfs_fonts.js", content_type="application/javascript")
    if "pdfjs-dist@4.10.38/build/pdf.min.mjs" in u: return r.fulfill(path=PM + "pdfjs-dist/build/pdf.min.mjs", content_type="text/javascript", headers=CORS)
    if "pdfjs-dist@4.10.38/build/pdf.worker.min.mjs" in u: return r.fulfill(path=PM + "pdfjs-dist/build/pdf.worker.min.mjs", content_type="text/javascript", headers=CORS)
    if "docx@" in u: return r.fulfill(path=NM + "docx/dist/index.iife.js", content_type="application/javascript")
    if "qrcode-generator@1.4.4" in u: return r.fulfill(path=PM + "qrcode-generator/qrcode.js", content_type="application/javascript")
    if r.request.method == "OPTIONS": return r.fulfill(status=204, headers={**CORS, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "POST"})
    if "/functions/v1/bw-ia-imagem" in u:
        IMG_PEDIDOS.append(r.request.post_data_buffer or b""); return r.fulfill(body=json.dumps({"imagem": AZUL_B64}), content_type="application/json", headers=CORS)
    if "/functions/v1/bw-ia" in u:
        pd = r.request.post_data or ""; IA_PEDIDOS.append(pd); t = traduz(pd)
        return r.fulfill(body=json.dumps({"texto": json.dumps(t or {})}), content_type="application/json", headers=CORS)
    if "/rest/v1/rpc/bw_presskit_ver" in u:
        return r.fulfill(body=json.dumps(PUB["dados"]), content_type="application/json", headers=CORS)
    if u.startswith(PUBLICO):
        d = PUB["arq"].get(u[len(PUBLICO):])
        if not d: return r.fulfill(status=404, body="")
        m = re.match(r"data:([^;]+);base64,(.*)", d, re.S)
        return r.fulfill(body=base64.b64decode(m.group(2)), content_type=m.group(1), headers=CORS)
    if "fonts.googleapis" in u or "fonts.gstatic" in u: return r.abort()
    FORA.append(u); return r.abort()

falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
TMP = tempfile.mkdtemp()
FOTO = os.path.join(TMP, "capa.png")
from PIL import Image
im = Image.new("RGB", (1200, 900), (230, 230, 230))
for x in range(1200):
    for y in range(0, 900, 6): im.putpixel((x, y), (40, 40, 40))
im.save(FOTO)
def estouro(pg): return pg.evaluate("() => document.documentElement.scrollWidth - document.documentElement.clientWidth")
def pix(pg):
    pg.wait_for_function(PIX, timeout=40000); return pg.evaluate(PIX)
def esperar_previa(pg, t=40000):
    try: pg.wait_for_function("() => { const e = document.getElementById('prevEstado'); return e && /página/.test(e.textContent) && document.querySelector('#paginas canvas'); }", timeout=t); return True
    except Exception: return False
PIX = "() => { const c = document.querySelector('#paginas canvas'); if (!c) return null; const d = c.getContext('2d').getImageData(Math.round(c.width*0.5), Math.round(c.height*0.12), 1, 1).data; return [d[0], d[1], d[2]]; }"

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, accept_downloads=True, service_workers="block",
                              **({"is_mobile": True, "has_touch": True, "device_scale_factor": 2} if larg < 500 else {}))
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "presskit.html?modelo=ator"); esperar_previa(pg)
        ok(pg.locator("#vEd").is_visible() and pg.evaluate("() => !!window.BWPressKitMais"), "editor aberto e os recursos novos carregados")

        # PC: o formulário rola na própria coluna (barra ao lado das opções) e a tela não rola
        if larg >= 1100:
            r = pg.evaluate("""() => { const f = document.getElementById('form'), e = document.querySelector('.pk-ed').getBoundingClientRect();
              return { rola: getComputedStyle(f).overflowY, alto: f.scrollHeight > f.clientHeight + 50, cabe: e.bottom <= innerHeight + 1,
                       pag: document.documentElement.scrollHeight - innerHeight }; }""")
            ok(r["rola"] == "auto" and r["alto"] and r["cabe"], f"formulário com rolagem própria e o editor cabe na tela {r}")
            fb = pg.locator("#form").bounding_box(); pg.mouse.move(fb["x"] + fb["width"] / 2, fb["y"] + fb["height"] / 2); pg.mouse.wheel(0, 900); pg.wait_for_timeout(300)
            ok(pg.evaluate("() => document.getElementById('form').scrollTop") > 200 and pg.evaluate("() => scrollY") < 5, "rodinha rola o formulário, não a página")
            pg.evaluate("() => document.getElementById('form').scrollTop = 0")
        # toque na foto da prévia abre o ajuste
        if larg < 500: pg.click('[data-a="aba"][data-v="prev"]'); pg.wait_for_timeout(300)
        pg.locator(".pk-pag").nth(1).click(); pg.wait_for_timeout(400)
        it = pg.locator("#modal .pk-pf-i")
        ok(not pg.locator("#modal").is_hidden() and it.count() >= 2 and it.first.get_attribute("data-alvo") == "sobre", "tocar na página 2 lista as fotos, a da página 2 primeiro")
        it.first.click(); pg.wait_for_timeout(900)
        ok(pg.locator('#modal [data-a="enqAba"][data-v="tam"]').count() == 1, "tocar na foto abre o ajuste com TAMANHO")
        pg.evaluate("() => BWPressKit.fecharModal()")
        pg.locator(".pk-pag").first.click(); pg.wait_for_timeout(400)
        ok(pg.locator("#modal .pk-pf-i").first.get_attribute("data-alvo") == "capa", "na página 1 a capa vem primeiro")
        pg.evaluate("() => BWPressKit.fecharModal()")
        if larg < 500: pg.click('[data-a="aba"][data-v="ed"]'); pg.wait_for_timeout(300)

        # ✨ foto da IA: trava de rosto/corpo no pedido + ⬇ baixar
        pg.click('[data-a="fotoIA"][data-alvo="retrato"][data-p="corp"]')
        try: pg.wait_for_selector('[data-a="fotoIAbaixar"][data-alvo="retrato"]', timeout=12000); tem = True
        except Exception: tem = False
        mm = re.search(rb'name="pedido"\r\n\r\n(.*?)\r\n--', IMG_PEDIDOS[-1], re.S) if IMG_PEDIDOS else None
        ped = mm.group(1).decode("utf-8", "replace") if mm else ""
        ok(tem, "depois da IA aparece ⬇ BAIXAR FOTO DA IA")
        ok("identical face" in ped and "Add NO accessories" in ped and "identical body" in ped, "o pedido da IA trava rosto, corpo e acessórios")
        ok(0 < len(ped) <= 700, f"o pedido cabe nas 700 letras da função ({len(ped)})")
        with pg.expect_download() as dl: pg.click('[data-a="fotoIAbaixar"][data-alvo="retrato"]')
        cam = os.path.join(TMP, f"ia-{larg}" + os.path.splitext(dl.value.suggested_filename)[1]); dl.value.save_as(cam)
        try: cor = Image.open(cam).convert("RGB").getpixel((5, 5)); azul = cor[2] > 150 and cor[0] < 80
        except Exception: azul = False
        ok(azul and "foto-ia" in dl.value.suggested_filename, f"⬇ baixa a foto da IA ({dl.value.suggested_filename})")
        pg.click('[data-a="fotoIAvolta"][data-alvo="retrato"]'); pg.wait_for_timeout(300)
        # ⬇ BAIXAR sempre à vista na foto + ↗ EM OUTRA IA (levar e trazer de volta)
        ok(pg.locator('[data-a="fotoBaixar"][data-alvo="capa"]').count() == 1 and pg.locator('[data-a="fotoBaixar"][data-alvo="retrato"]').count() == 1, "⬇ BAIXAR aparece na capa e na foto recortada sem usar a IA")
        with pg.expect_download() as dl2: pg.click('[data-a="fotoBaixar"][data-alvo="capa"]')
        ok("-foto-capa" in dl2.value.suggested_filename, f"⬇ BAIXAR baixa a foto da capa ({dl2.value.suggested_filename})")
        pg.click('[data-a="fotoIAfora"][data-alvo="capa"]'); pg.wait_for_timeout(300)
        tx = pg.input_value("#iaForaTexto")
        ok("ATTACHED photo" in tx and "identical face" in tx and pg.locator('#modal a[href*="gemini.google.com"]').count() == 1, "↗ EM OUTRA IA mostra o pedido com a trava e o link do Gemini")
        cap0 = pg.evaluate("() => BWPressKit.imgsAtual().capa")
        arq = os.path.join(TMP, "volta.png"); Image.new("RGB", (400, 500), (200, 30, 30)).save(arq)
        pg.set_input_files('#modal input[data-up="ia:capa"]', arq); pg.wait_for_timeout(1200)
        im2 = pg.evaluate("() => BWPressKit.imgsAtual()")
        ok(im2.get("capa") != cap0 and (im2.get("origs") or {}).get("capa") == cap0 and pg.locator("#modal").is_hidden(), "＋ TRAZER A FOTO PRONTA entra no lugar e guarda a original")
        pg.click('[data-a="fotoIAvolta"][data-alvo="capa"]'); pg.wait_for_timeout(300)
        ok(pg.evaluate("() => BWPressKit.imgsAtual().capa") == cap0, "↺ ORIGINAL volta a foto de antes")

        # ✥ efeitos na capa
        pg.set_input_files('input[data-up="capa"]', FOTO); pg.wait_for_timeout(1200); esperar_previa(pg)
        antes = pix(pg)
        pg.click('[data-a="enquadrar"][data-alvo="capa"]'); pg.wait_for_selector("#enqCv", timeout=5000)
        ok(pg.locator('#modal [data-a="enqFx"][data-c="m"]').count() >= 8 and pg.locator('#modal [data-a="enqFx"][data-c="k"]').count() >= 4, "✥ ENQUADRAR mostra MISTURA e MÁSCARA")
        ok(pg.locator('#modal .pk-enq-aba').count() == 5 and pg.locator('#enqPalco').is_visible(), "✥ ENQUADRAR: abas POSIÇÃO/LUZ/LOOKS/MISTURA/MÁSCARA com a prévia fixa")
        pg.click('#modal [data-a="enqAba"][data-v="mix"]')
        _pc = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(), c = document.querySelector('.pk-enq-corpo'); c.scrollTop = 9999; const q = document.getElementById('enqPalco').getBoundingClientRect(); return [p.top, q.top, p.bottom <= innerHeight]; }")
        ok(_pc[0] == _pc[1] and _pc[2], f"a prévia não sai do lugar ao rolar as opções ({_pc})")
        pg.click('#modal [data-a="enqFx"][data-c="m"][data-v="mult"]'); pg.click('#modal [data-a="enqFx"][data-c="c"][data-v="destaque"]')
        pg.evaluate("() => { const r = document.querySelector('[data-enq=\"fo\"]'); r.value = 60; r.dispatchEvent(new Event('input', {bubbles: true})); }")
        pg.click('#modal [data-a="enqAba"][data-v="masc"]'); pg.click('#modal [data-a="enqFx"][data-c="k"] >> nth=1')
        pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(500); esperar_previa(pg); pg.wait_for_timeout(800)
        fx = pg.evaluate("() => (BWPressKit.imgsAtual().enq || {}).capa || {}")
        depois = pix(pg)
        ok((fx.get("fx") or {}).get("m") == "mult" and (fx.get("fx") or {}).get("o") == 60, "efeito guardado (mistura multiplicar, opacidade 60%)")
        ok(sum(abs(a - b) for a, b in zip(antes, depois)) > 25, f"a capa muda na prévia com o efeito ({antes} → {depois})")
        pg.click('[data-a="enquadrar"][data-alvo="capa"]'); pg.wait_for_selector("#enqCv", timeout=5000)
        pg.click('#modal [data-a="enqFx"][data-c="zero"]'); pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(500); esperar_previa(pg); pg.wait_for_timeout(800)
        ok(not ((pg.evaluate("() => (BWPressKit.imgsAtual().enq || {}).capa || {}") or {}).get("fx") or {}).get("m"), "↺ SEM EFEITO tira o efeito")

        # vários press kits: seletor + duplicar
        n0 = pg.evaluate("() => BWPressKit.lista().length"); id0 = pg.evaluate("() => BWPressKit.atual().id")
        pg.click('[data-a="duplicarEste"]'); pg.wait_for_timeout(1500)
        ok(pg.evaluate("() => BWPressKit.lista().length") == n0 + 1 and pg.evaluate("() => BWPressKit.atual().id") != id0, "⧉ DUPLICAR ESTE cria e abre a cópia")
        ok(pg.locator("#edTrocar option").count() >= n0 + 2, "o seletor no editor lista os press kits")
        pg.select_option("#edTrocar", id0); pg.wait_for_timeout(1200)
        ok(pg.evaluate("() => BWPressKit.atual().id") == id0, "trocar pelo seletor abre o outro press kit")

        # 🌐 idioma
        marca = pg.evaluate("() => BWPressKit.atual().d.marca")
        nums = pg.evaluate("() => JSON.stringify((BWPressKit.atual().d.numeros || []).map(x => x.v))")
        pg.click('[data-a="pkIdioma"]'); pg.wait_for_timeout(300)
        pg.click('#modal [data-a="pmTraduzir"][data-l="en"]')
        try: pg.wait_for_function("(a) => BWPressKit.atual().id !== a && BWPressKit.atual().idioma === 'en'", arg=id0, timeout=20000); tr = True
        except Exception: tr = False
        k_en = pg.evaluate("() => BWPressKit.atual()")
        ok(tr and k_en["nome"].endswith("(EN)"), "🌐 INGLÊS cria a cópia (EN) e abre")
        ok(k_en["d"].get("marca") == marca and json.dumps([x.get("v") for x in k_en["d"].get("numeros", [])], ensure_ascii=False) == nums, "nome e números não mudam")
        ok(str(k_en["d"].get("sobre", "")).startswith("EN: "), "o texto SOBRE vem traduzido (" + str(k_en["d"].get("sobre", ""))[:40] + ")")
        ok(any("NÃO traduza" in x for x in IA_PEDIDOS), "o pedido proíbe mudar nomes, números e links")
        ok(esperar_previa(pg) and pg.evaluate("() => JSON.stringify(window.__pkUltimoDef).includes('ABOUT')"), "títulos das partes em inglês no PDF")
        ok(pg.evaluate("(a) => !/^EN: /.test(BWPressKit.acharKit(a).d.sobre || '')", id0), "o original continua em português")

        # ✥ ENQUADRAR NA PÁGINA 2 (foto recortada do "quem sou eu": largura, proporção, posição)
        if pg.evaluate("() => !!BWPressKit.imgsAtual().retrato"):
            pg.click('[data-a="enquadrar"][data-alvo="sobre"]'); pg.wait_for_selector("#enqCv", timeout=6000); pg.wait_for_timeout(500)
            ok(pg.locator('#modal [data-a="enqAba"][data-v="tam"]').count() == 1, "✥ ENQUADRAR NA PÁGINA 2 abre com a aba ⤢ TAMANHO")
            pg.click('#modal [data-a="enqAba"][data-v="tam"]')
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"sw\"]'); r.value = 52; r.dispatchEvent(new Event('input', {bubbles: true})); }")
            pg.click('#modal [data-a="enqProp"][data-v="34"]'); pg.wait_for_timeout(300)
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"z\"]'); r.value = 160; r.dispatchEvent(new Event('input', {bubbles: true})); }")
            ar = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return p.height / p.width; }")
            ok(abs(ar - 4/3) < 0.08, f"a moldura da janela fica na proporção 3:4 ({ar:.2f})")
            pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(500)
            st = pg.evaluate("() => [BWPressKit.atual().est.sobW, BWPressKit.atual().est.sobR, (BWPressKit.imgsAtual().enq || {}).sobre]")
            ok(st[0] == 52 and st[1] == "34" and st[2] and abs(st[2].get("z", 1) - 1.6) < 0.01, f"PRONTO guarda largura 52%, proporção 3:4 e o zoom ({st})")
            so = pg.evaluate("async () => { const m = await BWPressKit.modelo(BWPressKit.atual(), BWPressKit.imgsAtual()); const s = m.secoes.find(x => x.id === 'sobre'); return s ? [!!s.corte, Math.round(s.fotoW), Math.round(s.fotoH)] : null; }")
            ok(so and so[0] and so[2] > so[1], f"a página 2 usa a foto reenquadrada, maior ({so})")
            pg.evaluate("() => { const k = BWPressKit.atual(); delete k.est.sobW; delete k.est.sobR; delete BWPressKit.imgsAtual().enq.sobre; }")
        # 📄 PÁGINAS INTERNAS e setas nas opções
        ok(pg.locator('[data-a="est"][data-c="pg"]').count() == 6 and pg.locator('[data-a="est"][data-c="sob"]').count() == 5, "🎛 ESTILO: miniaturas de PÁGINAS INTERNAS (6) e QUEM SOU EU (5)")
        ok(pg.locator('.pk-grupo .pk-sub-t[data-seta^="pks_"]').count() >= 8, "as opções dentro das partes ganham seta de abrir/fechar")
        for pgv, sob, lst in (("cabeca", "dir", "cartoes"), ("lateral", "topo", "tempo"), ("moldura", "destaque", "linhas"), ("rodape", "sem", "cartoes"), ("limpa", "esq", "linhas")):
            n_ = pg.evaluate("async (a) => { const k = BWPressKit.atual(); k.est = Object.assign({}, k.est, { pg: a[0], sob: a[1], lst: a[2], col: '2', alinh: 'centro', quebra: a[0] === 'moldura' ? 'pagina' : 'seguido' }); const b = await BWPressKit.gerarPdfBytes(); return b.length; }", [pgv, sob, lst])
            ok(n_ > 20000, f"PDF com páginas '{pgv}', quem sou eu '{sob}', lista '{lst}' ({n_} bytes)")
            if larg == 1280:
                b64 = pg.evaluate("async () => { const b = await BWPressKit.gerarPdfBytes(); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }")
                open(os.path.join(TMP, f"pg-{pgv}.pdf"), "wb").write(base64.b64decode(b64))
        pg.evaluate("() => { const k = BWPressKit.atual(); k.est = Object.assign({}, k.est, { pg: 'padrao', sob: 'esq', lst: 'linhas', col: 'auto', alinh: 'esq', quebra: 'seguido' }); }")
        if larg == 1280: print("PDFS:", TMP)
        # 🎬 vídeo
        pg.click('[data-a="pkVideo"]')
        try: pg.wait_for_function("() => /cenas/.test((document.getElementById('pmVinfo') || {}).textContent || '')", timeout=20000); pv = True
        except Exception: pv = False
        ok(pv, "🎬 VÍDEO monta a prévia animada (" + (pg.inner_text("#pmVinfo") if pv else "?") + ")")
        h = "() => { const c = document.getElementById('pmVcv'); const x = c.getContext('2d'); const d = x.getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 251) s = (s * 31 + d[i]) % 1000003; return s; }"
        h1 = pg.evaluate(h); pg.wait_for_timeout(1400); h2 = pg.evaluate(h)
        ok(h1 != h2, "a prévia anda (quadros diferentes)")
        ok(pg.evaluate("() => { const c = document.getElementById('pmVcv').getBoundingClientRect(); return c.right <= innerWidth + 1 && c.width > 100; }"), "prévia do vídeo dentro da tela")
        fmt = "9:16" if larg > 500 else "1:1"
        if fmt == "1:1": pg.click('#modal [data-a="pmVfmt"][data-v="1:1"]'); pg.wait_for_timeout(300)
        with pg.expect_download(timeout=240000) as dl:
            pg.click('#modal [data-a="pmVgerar"]')
        mp4 = os.path.join(TMP, f"v-{larg}.mp4"); dl.value.save_as(mp4)
        try:
            info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", mp4], capture_output=True, text=True).stdout)
            v = [s for s in info["streams"] if s["codec_type"] == "video"][0]; dur = float(info["format"]["duration"])
        except Exception: v, dur = {}, 0
        alvo = (1080, 1920) if fmt == "9:16" else (1080, 1080)
        ok(v.get("codec_name") == "h264" and (v.get("width"), v.get("height")) == alvo, f"MP4 H.264 {v.get('width')}×{v.get('height')} ({fmt})")
        ok(dur >= 10, f"vídeo com todas as cenas ({dur:.1f} s)")
        q = []
        for t in (1.0, dur * 0.5, dur - 0.5):
            out = os.path.join(TMP, f"q{len(q)}.png"); subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", mp4, "-frames:v", "1", out]); q.append(Image.open(out).convert("L").resize((40, 40)).tobytes())
        ok(len(set(q)) == 3, "começo, meio e fim do vídeo são cenas diferentes")
        pg.click("#modal .pk-mx"); pg.wait_for_timeout(300)

        # 🔗 link (Supabase simulado)
        pg.click('[data-a="pkLink"]'); pg.wait_for_timeout(300)
        pg.click('#modal [data-a="pmLpublicar"]'); pg.wait_for_timeout(500)
        ok("caixinha" in pg.inner_text("#pmLmsg") and not pg.evaluate("() => Object.keys(__sb.linhas).length"), "sem marcar a autorização, nada é publicado")
        pg.evaluate("() => BWPressKit.atual().ocultas = (BWPressKit.atual().ocultas || []).concat(['formacao'])")
        pg.check("#pmLok"); pg.click('#modal [data-a="pmLpublicar"]')
        try: pg.wait_for_selector("#pmLurl", timeout=240000); pub = True
        except Exception: pub = False
        sb = pg.evaluate("() => __sb")
        url = pg.input_value("#pmLurl") if pub else ""
        tok = (re.search(r"k=([a-z0-9]+)", url) or [None, ""])[1]
        if not pub: print("    msg:", pg.inner_text("#pmLmsg"), pg.evaluate("() => __sb.log.slice(-5)"))
        ok(pub and re.fullmatch(r"[a-z0-9]{16,40}", tok or "") is not None and url.startswith("https://audioevideobw-eng.github.io/kit.html?k="), f"link criado ({url})")
        linha = sb["linhas"].get(tok, {})
        d = linha.get("dados") or {}
        ok(d.get("v") == 1 and d.get("marca") == k_en["d"].get("marca") and d.get("idioma") == "en", "a linha guarda os dados (versão 1, nome, idioma)")
        ok("formacao" not in d.get("ordem", []) and "formacao" not in d.get("s", {}), "parte DESLIGADA não vai para a página")
        arqs = [k for k in sb["arq"] if k.startswith(tok + "/")]
        ok(any(k.endswith("press-kit.pdf") for k in arqs) and any("/capa." in k for k in arqs), f"fotos e PDF no balde, na pasta do token ({len(arqs)} arquivos)")
        ok(d.get("capa", "").startswith(PUBLICO + tok + "/") and d.get("pdf", "").endswith("press-kit.pdf"), "endereços públicos dentro da pasta do token")
        n_antes = len(arqs)
        pg.click('#modal [data-a="pmLpublicar"]')
        try: pg.wait_for_function("(a) => document.getElementById('pmLurl') && Object.keys(__sb.arq).filter(k => k.startsWith(a + '/')).length > 0 && __sb.log.filter(x => x.startsWith('rm:')).length > 0", arg=tok, timeout=240000); atu = True
        except Exception: atu = False
        sb = pg.evaluate("() => __sb"); arqs2 = [k for k in sb["arq"] if k.startswith(tok + "/")]
        ok(atu and len({k.split("/")[1] for k in arqs2}) == 1 and len(arqs2) == n_antes, "↻ ATUALIZAR troca os arquivos e apaga a versão antiga (mesmo link)")
        if tok not in sb["linhas"]: break
        PUB["dados"] = sb["linhas"][tok]["dados"]; PUB["arq"] = {k: v for k, v in sb["arq"].items()}
        ok(not FORA, "nada saiu para fora: " + ", ".join(FORA[:3]))
        ok(estouro(pg) <= 0, "editor sem estouro horizontal")

        # página pública (outra aba, sem login)
        PUB["dados"]["s"]["sobre"]["curto"] = "<img src=x onerror=window.__xss=1>Teste"
        pp = ctx.new_page(); errp = []; pp.on("pageerror", lambda e: errp.append(str(e)))
        pp.goto(BASE + "kit.html?k=" + tok); pp.wait_for_timeout(1500)
        ok(pp.locator("h1").inner_text() == PUB["dados"]["marca"], "kit.html mostra o nome")
        ok(pp.evaluate("() => !window.__xss") and "<img" in pp.inner_text("main"), "texto com marcação vira texto (não executa)")
        ok(pp.evaluate("() => { const i = document.querySelector('img.capa'); return i && i.complete && i.naturalWidth > 100; }"), "capa carrega do balde")
        ok(pp.locator(f'a[href="{PUB["dados"]["pdf"]}"]').count() >= 1, "botão de baixar o PDF")
        ok(pp.locator("h2").count() >= 3 and "ABOUT" in pp.inner_text("main").upper(), "partes com os títulos do idioma")
        ok(pp.evaluate("() => [...document.querySelectorAll('a[href]')].every(a => /^(https?:|mailto:|\\.\\/|$)/.test(a.getAttribute('href')))"), "todo link é http(s), mailto ou do site")
        ok(estouro(pp) <= 0, "página pública sem estouro horizontal")
        ok(not errp, "página pública sem erro de JS " + str(errp[:2]))
        PUB["dados"] = None; pp.reload(); pp.wait_for_timeout(1000)
        ok("não está mais no ar" in pp.inner_text("main") or "no longer" in pp.inner_text("main"), "link apagado mostra 'não está mais no ar'")
        pp.goto(BASE + "kit.html?k=xx"); pp.wait_for_timeout(400)
        ok("incompleto" in pp.inner_text("main"), "token inválido nem consulta")
        pp.close()

        # tirar do ar
        pg.bring_to_front(); pg.evaluate("() => BWPressKit.fecharModal()"); pg.click('[data-a="pkLink"]'); pg.wait_for_timeout(300)
        pg.click('#modal [data-a="pmLtirar"]'); pg.wait_for_timeout(1500)
        sb = pg.evaluate("() => __sb")
        ok(tok not in sb["linhas"] and not [k for k in sb["arq"] if k.startswith(tok + "/")] and not pg.evaluate("() => BWPressKit.atual().pub"), "✕ TIRAR DO AR apaga a linha e os arquivos")
        ok(not erros, "editor sem erro de JS " + str(erros[:2]))
        ctx.close()
    nav.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
sys.exit(1 if falhas else 0)
