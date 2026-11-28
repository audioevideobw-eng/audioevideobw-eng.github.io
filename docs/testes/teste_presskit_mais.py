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
    download: async (cam) => { const u = S.arq[cam]; if (!u) return { data: null, error: { message: 'not found' } }; const r = await fetch(u); return { data: await r.blob(), error: null }; },
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
        # toque na foto da prévia abre O AJUSTE DAQUELA FOTO e o PDF se refaz ao vivo
        if larg < 500: pg.click('[data-a="aba"][data-v="prev"]'); pg.wait_for_timeout(300)
        CENTRO = """(k) => { const cs = [...document.querySelectorAll('#paginas .pk-pag')]; for (const c of cs) { const f = (c._fotos||[]).find(f => !k || f.k === k);
            if (f) { c.scrollIntoView({block:'center'}); const r = c.getBoundingClientRect(); return {x: r.left + (f.x0+f.x1)/2*r.width, y: r.top + (f.y0+f.y1)/2*r.height, k: f.k, pg: +c.dataset.pg}; } } return null; }"""
        alvo = pg.evaluate(CENTRO, "capa")
        ok(alvo is not None, f"a prévia sabe onde está cada foto {alvo}")
        if alvo:
            alvo = pg.evaluate(CENTRO, "capa"); pg.mouse.click(alvo["x"], alvo["y"]); pg.wait_for_timeout(900)
            ok(pg.locator('#modal [data-a="enqAba"]').count() >= 2 and pg.locator("#modal .pk-pf-i").count() == 0, "tocar na foto da capa abre direto o ajuste dela (sem lista)")
            ok(pg.evaluate("() => document.getElementById('modal').classList.contains('lado')"), "o ajuste fica ao lado/embaixo, com a prévia à vista")
            if larg >= 1100:
                pb = pg.locator(".pk-prev").bounding_box(); cb = pg.locator("#modalCx").bounding_box()
                ok(cb["x"] + cb["width"] <= pb["x"] + 5, f"o painel não cobre a prévia ({cb['x']+cb['width']:.0f} ≤ {pb['x']:.0f})")
            ok(pg.locator("#paginas .pk-hl.on").count() >= 1, "a foto que está sendo ajustada fica marcada na prévia")
            pg.evaluate("() => { const r = document.querySelector('#modalCx [data-enq=\"z\"]'); r.value = 180; r.dispatchEvent(new Event('input', {bubbles:true})); }")
            pg.wait_for_timeout(500); esperar_previa(pg)
            ok(pg.evaluate("() => { const e = (BWPressKit.imgsAtual().enq||{}).capa; return !!e && e.z > 1.7; }"), "mexer no tamanho já muda o PDF ao vivo (antes do PRONTO)")
            pg.click('#modalCx [data-a="enqVoltar"]'); pg.wait_for_timeout(700)
            ok(pg.evaluate("() => !(BWPressKit.imgsAtual().enq||{}).capa || (BWPressKit.imgsAtual().enq.capa.z||1) < 1.05"), "↺ COMO ESTAVA desfaz")
            pg.evaluate("() => BWPressKit.fecharModal()"); esperar_previa(pg)
        # ✚ INSERIR elementos direto na prévia
        n0 = pg.evaluate("() => (BWPressKit.atual().livres||[]).length")
        pg.click('[data-a="ins"][data-ins="texto"]'); pg.wait_for_timeout(300)
        c2 = pg.locator(".pk-pag").nth(1); c2.scroll_into_view_if_needed(); bb = c2.bounding_box()
        pg.mouse.click(bb["x"] + bb["width"] * 0.5, bb["y"] + bb["height"] * 0.85); pg.wait_for_timeout(700)
        L = pg.evaluate("() => BWPressKit.atual().livres||[]")
        ok(len(L) == n0 + 1 and L[-1]["t"] == "texto" and L[-1]["pg"] == 2, f"＋ TEXTO e tocar na página põe o texto lá ({L[-1] if L else None})")
        ok(pg.locator('#modalCx [data-el="txt"]').count() == 1, "abre o painel do texto")
        pg.fill('#modalCx [data-el="txt"]', "TEXTO LIVRE TESTE"); pg.wait_for_timeout(400); esperar_previa(pg); pg.wait_for_timeout(600)
        tem = pg.evaluate("async () => { const m = await BWPressKit.pdfTexto(); return m.replace(/\s+/g,'').includes('TEXTOLIVRETESTE'); }")
        ok(tem, "o texto novo sai no PDF")
        pg.click('#modalCx [data-a="fecharModal"]'); pg.wait_for_timeout(300)
        pg.click('[data-a="ins"][data-ins="icone"]'); pg.wait_for_timeout(200)
        c2.scroll_into_view_if_needed(); bb = c2.bounding_box(); pg.mouse.click(bb["x"] + bb["width"] * 0.2, bb["y"] + bb["height"] * 0.9); pg.wait_for_timeout(600)
        ok(pg.locator("#modalCx .pk-ico").count() > 20, "＋ ÍCONE abre a grade de ícones")
        pg.click('#modalCx .pk-ico[data-v="🎬"]'); pg.wait_for_timeout(500)
        ok(pg.evaluate("() => (BWPressKit.atual().livres||[]).slice(-1)[0].ic") == "🎬", "trocar o ícone")
        pg.click('#modalCx [data-a="fecharModal"]'); pg.wait_for_timeout(300)
        with pg.expect_file_chooser() as fcI: pg.click(".pk-ins-img")
        imgT = os.path.join(TMP, "livre.png"); open(imgT, "wb").write(_png((230, 40, 120), 300, 200, "PNG")); fcI.value.set_files(imgT); pg.wait_for_timeout(900)
        c2.scroll_into_view_if_needed(); bb = c2.bounding_box(); pg.mouse.click(bb["x"] + bb["width"] * 0.7, bb["y"] + bb["height"] * 0.6); pg.wait_for_timeout(900)
        ok(pg.evaluate("() => { const e = (BWPressKit.atual().livres||[]).slice(-1)[0]; return e.t === 'imagem' && !!(BWPressKit.imgsAtual().livres||{})[e.id]; }"), "＋ IMAGEM: escolher o arquivo e tocar na página")
        pg.click('#modalCx [data-a="fecharModal"]'); pg.wait_for_timeout(300); esperar_previa(pg); pg.wait_for_timeout(500)
        # arrastar o texto na prévia
        ini = pg.evaluate("() => { const e = BWPressKit.atual().livres.find(x => x.t==='texto'); return [e.x, e.y]; }")
        at = pg.evaluate(CENTRO, "e:" + L[-1]["id"])
        if at and larg >= 1100:
            pg.mouse.move(at["x"], at["y"]); pg.mouse.down(); pg.mouse.move(at["x"] - 60, at["y"] - 80, steps=8); pg.mouse.up(); pg.wait_for_timeout(600)
            fimP = pg.evaluate("() => { const e = BWPressKit.atual().livres.find(x => x.t==='texto'); return [e.x, e.y]; }")
            ok(fimP[0] < ini[0] - 0.02 and fimP[1] < ini[1] - 0.02 and pg.locator("#modal").is_hidden(), f"arrastar o texto na prévia muda o lugar ({ini} → {fimP})")
        elif at:
            pg.mouse.click(at["x"], at["y"]); pg.wait_for_timeout(500)
            ok(pg.locator('#modalCx [data-el="txt"]').count() == 1, "tocar no texto da prévia abre o painel dele")
            pg.click('#modalCx [data-a="elSet"][data-c="pos"][data-v="meio"]'); pg.wait_for_timeout(300)
            e2 = pg.evaluate("() => BWPressKit.atual().livres.find(x => x.t==='texto')")
            ok(abs(e2["x"] - (1 - e2["w"]) / 2) < 0.01, "↔ CENTRALIZAR o elemento")
            pg.evaluate("() => BWPressKit.fecharModal()")
        # ⤢ ALÇAS nas pontas (SHIFT = proporcional), ☰ OPÇÕES (botão direito / dois toques) e 🪟 janela flutuante
        pg.evaluate("() => BWPressKit.fecharModal()"); esperar_previa(pg); pg.wait_for_timeout(400)
        img0 = pg.evaluate("() => BWPressKit.atual().livres.find(x => x.t==='imagem')")
        at = pg.evaluate(CENTRO, "e:" + img0["id"])
        if larg < 500:
            pg.touchscreen.tap(at["x"], at["y"]); pg.wait_for_timeout(900)
        else:
            pg.mouse.click(at["x"], at["y"]); pg.wait_for_timeout(700)
        ok(pg.locator("#paginas .pk-hl.on .pk-alca").count() == 8, "o item escolhido ganha 8 alças nas pontas e nos lados")
        if os.environ.get("FOTO"): pg.screenshot(path=f"/tmp/alcas-{larg}.png")
        def puxar(q, dx, dy, shift=False):
            hb = pg.locator("#paginas .pk-hl.on .pk-alca." + q).first; hb.scroll_into_view_if_needed(); b = hb.bounding_box()
            x, y = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
            if shift: pg.keyboard.down("Shift")
            pg.mouse.move(x, y); pg.mouse.down(); pg.mouse.move(x + dx, y + dy, steps=8); pg.mouse.up()
            if shift: pg.keyboard.up("Shift")
            pg.wait_for_timeout(500); esperar_previa(pg); pg.wait_for_timeout(500)
            return pg.evaluate("(i) => BWPressKit.atual().livres.find(x => x.id === i)", img0["id"])
        e1 = puxar("e", 50, 0)
        ok(e1["w"] > img0["w"] + 0.02 and abs((e1.get("prop") or 0) - img0["prop"]) > 0.05, f"puxar o lado SEM tecla estica livre (w {img0['w']:.2f}→{e1['w']:.2f}, prop {img0['prop']:.2f}→{e1.get('prop')})")
        e2 = puxar("se", 40, 10, True)
        ok(e2["w"] > e1["w"] + 0.02 and abs(e2["prop"] - e1["prop"]) < 0.03, f"com SHIFT o canto mantém a proporção ({e1['prop']:.2f} → {e2['prop']:.2f})")
        nL = pg.evaluate("() => BWPressKit.atual().livres.length")
        pg.evaluate("() => BWPressKit.fecharModal()"); esperar_previa(pg); pg.wait_for_timeout(400)
        at = pg.evaluate(CENTRO, "e:" + img0["id"])
        if larg < 500:
            pg.touchscreen.tap(at["x"], at["y"]); pg.wait_for_timeout(120); pg.touchscreen.tap(at["x"], at["y"]); pg.wait_for_timeout(500)
        else:
            pg.mouse.click(at["x"], at["y"], button="right"); pg.wait_for_timeout(300)
        ok(pg.locator(".bwf-menu").is_visible() and "Duplicar" in pg.locator(".bwf-menu").inner_text(), ("dois toques" if larg < 500 else "botão direito") + " no elemento abre as opções")
        if pg.locator(".bwf-menu").is_visible():
            pg.locator(".bwf-menu button", has_text="Duplicar").click(); pg.wait_for_timeout(500)
            ok(pg.evaluate("() => BWPressKit.atual().livres.length") == nL + 1, "☰ Duplicar pelo menu")
            if larg >= 1100:
                pg.wait_for_timeout(600); pg.keyboard.press("Control+z"); pg.wait_for_timeout(700)
                ok(pg.evaluate("() => BWPressKit.atual().livres.length") == nL, "Ctrl+Z desfaz a duplicação")
                pg.keyboard.press("Control+Shift+z"); pg.wait_for_timeout(700)
                ok(pg.evaluate("() => BWPressKit.atual().livres.length") == nL + 1, "Ctrl+Shift+Z refaz")
                pg.locator('.pk-ins [data-a="desfazer"]').click(); pg.wait_for_timeout(700)
                ok(pg.evaluate("() => BWPressKit.atual().livres.length") == nL, "a seta ↶ desfaz")
                pg.locator('.pk-ins [data-a="refazer"]').click(); pg.wait_for_timeout(700)
                ok(pg.evaluate("() => BWPressKit.atual().livres.length") == nL + 1, "a seta ↷ refaz")
                pg.evaluate("() => BWPressKit.fecharModal()"); esperar_previa(pg); pg.wait_for_timeout(400)
                at = pg.evaluate(CENTRO, "e:" + img0["id"]); x0e = pg.evaluate("(i) => BWPressKit.atual().livres.find(x => x.id === i).x", img0["id"])
                pg.keyboard.down("Alt"); pg.mouse.move(at["x"], at["y"]); pg.mouse.down(); pg.mouse.move(at["x"] - 70, at["y"], steps=8); pg.mouse.up(); pg.keyboard.up("Alt"); pg.wait_for_timeout(600)
                st2 = pg.evaluate("(i) => [BWPressKit.atual().livres.length, BWPressKit.atual().livres.find(x => x.id === i).x]", img0["id"])
                ok(st2[0] == nL + 2 and abs(st2[1] - x0e) < 0.001, f"ALT + arrastar duplica e o original fica no lugar ({st2})")
        if larg >= 1100:
            pg.evaluate("() => BWPressKit.fecharModal()"); pg.wait_for_timeout(300); esperar_previa(pg); pg.wait_for_timeout(500)
            c3 = pg.locator(".pk-pag").nth(1); c3.scroll_into_view_if_needed(); bb = c3.bounding_box()
            pg.mouse.click(bb["x"] + bb["width"] * 0.85, bb["y"] + bb["height"] * 0.08, button="right"); pg.wait_for_timeout(300)
            txt = pg.locator(".bwf-menu").inner_text() if pg.locator(".bwf-menu").is_visible() else ""
            ok("INSERIR AQUI" in txt.upper(), "botão direito no vazio da página: inserir aqui")
            if txt: pg.locator(".bwf-menu button", has_text="Texto").click(); pg.wait_for_timeout(600)
            ok(pg.evaluate("() => BWPressKit.atual().livres.slice(-1)[0].t") == "texto", "☰ Inserir texto no ponto clicado")
        # janela flutuante: arrastar pelo ⠿ e mudar o tamanho pelo canto
        pg.wait_for_selector("#modalCx .pk-jan-arr", timeout=5000)
        r1 = pg.locator("#modalCx").bounding_box(); t = pg.locator("#modalCx .pk-jan-tam").bounding_box()
        pg.mouse.move(t["x"] + 8, t["y"] + 8); pg.mouse.down(); pg.mouse.move(t["x"] - 50, t["y"] - 60, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        r2 = pg.locator("#modalCx").bounding_box()
        ok(r2["width"] < r1["width"] - 30 and r2["height"] < r1["height"] - 30, f"o ◢ muda o tamanho ({r1['width']:.0f}×{r1['height']:.0f} → {r2['width']:.0f}×{r2['height']:.0f})")
        g = pg.locator("#modalCx .pk-jan-arr").bounding_box(); dyj = 40 if larg >= 1100 else -120
        pg.mouse.move(g["x"] + g["width"] / 2, g["y"] + g["height"] / 2); pg.mouse.down(); pg.mouse.move(g["x"] + g["width"] / 2 + 30, g["y"] + g["height"] / 2 + dyj, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        r3 = pg.locator("#modalCx").bounding_box()
        ok(r3 and abs(r3["x"] - r2["x"] - 30) < 6 and abs(r3["y"] - r2["y"] - dyj) < 6, f"a janela se arrasta pelo ⠿ ({r2['x']:.0f},{r2['y']:.0f} → {r3 and r3['x']:.0f},{r3 and r3['y']:.0f})")
        ok(bool(pg.evaluate("() => JSON.parse(localStorage.getItem('ui_pk_janela')||'{}')")), "o lugar e o tamanho ficam guardados no aparelho")
        gh = pg.locator("#modalCx .pk-jan-arr").bounding_box()
        ok(gh["width"] > r3["width"] * 0.6 and gh["height"] >= 22, f"a barra de arrastar ocupa o alto da janela ({gh['width']:.0f}×{gh['height']:.0f})")
        # arrastar pela ÁREA LIVRE (margem da janela, sem botão nem campo)
        lx, ly = r3["x"] + 5, r3["y"] + r3["height"] * 0.6
        livre = pg.evaluate("(p) => { const e = document.elementFromPoint(p[0], p[1]); return !!e && !e.closest('button,input,a,canvas,label,[data-a]'); }", [lx, ly])
        pg.mouse.move(lx, ly); pg.mouse.down(); pg.mouse.move(lx + 25, ly - 20, steps=6); pg.mouse.up(); pg.wait_for_timeout(300)
        r4 = pg.locator("#modalCx").bounding_box()
        ok(livre and abs(r4["x"] - r3["x"] - 25) < 6 and abs(r4["y"] - r3["y"] + 20) < 6, f"a janela também se arrasta pela área livre ({r3['x']:.0f},{r3['y']:.0f} → {r4['x']:.0f},{r4['y']:.0f})")
        bt = pg.locator("#modalCx button:visible").last.bounding_box()
        pg.mouse.move(bt["x"] + bt["width"] / 2, bt["y"] + bt["height"] / 2); pg.mouse.down(); pg.mouse.move(bt["x"] + bt["width"] / 2 + 30, bt["y"] + bt["height"] / 2 + 10, steps=5); pg.mouse.up(); pg.wait_for_timeout(200)
        r5 = pg.locator("#modalCx").bounding_box() if pg.locator("#modalCx").is_visible() else r4
        ok(abs(r5["x"] - r4["x"]) < 2, "arrastar a partir de um botão NÃO move a janela")
        if os.environ.get("FOTO"): pg.screenshot(path=f"/tmp/janela-{larg}.png")
        pg.evaluate("() => BWPressKit.fecharModal()")
        # ☁ fotos na conta: sobem para a pasta privada e voltam em "outro aparelho"
        kid = pg.evaluate("() => BWPressKit.atual().id")
        try: pg.wait_for_function("(k) => Object.keys(__sb.arq).some(c => c.startsWith('u-teste/' + k + '/')) && BWPressKit.atual().nuvem && Object.keys(BWPressKit.atual().nuvem.v).some(x => x.startsWith('e:'))", arg=kid, timeout=30000); sub = True
        except Exception: sub = False
        nv = pg.evaluate("(k) => ({ arq: Object.keys(__sb.arq).filter(c => c.startsWith('u-teste/' + k + '/')).length, vagas: Object.keys(BWPressKit.atual().nuvem ? BWPressKit.atual().nuvem.v : {}) })", kid)
        ok(sub and nv["arq"] >= 2 and "retrato" in nv["vagas"], f"as fotos sobem para a pasta da conta ({nv['arq']} arquivos, vagas {nv['vagas'][:6]})")
        pg.evaluate("async (k) => { await BWPressKit.idbPut('imgs', k, { logo: '', capa: '', retrato: '', fotos: [], cards: {}, _t: 1 }); await BWPressKit.abrirKit(k); }", kid)
        try: pg.wait_for_function("() => { const i = BWPressKit.imgsAtual(); return i.retrato && i.livres && Object.keys(i.livres).length; }", timeout=30000); volta = True
        except Exception: volta = False
        ok(volta, "em outro aparelho (sem as fotos) o press kit traz as fotos da conta, inclusive a imagem inserida")
        esperar_previa(pg)
        # apagar os elementos de teste
        pg.evaluate("() => { const k = BWPressKit.atual(); k.livres = []; }"); pg.evaluate("() => BWPressKit.fecharModal()")
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
            # ✎ LIVRE: largura (X) e altura (Y) soltas
            pg.click('[data-a="enquadrar"][data-alvo="sobre"]'); pg.wait_for_selector("#enqCv", timeout=6000); pg.wait_for_timeout(400)
            pg.click('#modal [data-a="enqAba"][data-v="tam"]'); pg.click('#modal [data-a="enqProp"][data-v="livre"]'); pg.wait_for_timeout(200)
            ok(pg.locator("#enqAltLivre").is_visible(), "✎ LIVRE mostra a barra ↕ ALTURA (Y)")
            pg.evaluate("() => { for (const [n, v] of [['sw', 30], ['sh', 70]]) { const r = document.querySelector('[data-enq=\"' + n + '\"]'); r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); } }")
            pg.wait_for_timeout(200)
            d1 = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return [p.width, p.height]; }")
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"sh\"]'); r.value = 40; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(150)
            d2 = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return [p.width, p.height]; }")
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"sw\"]'); r.value = 50; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(150)
            d3 = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return [p.width, p.height]; }")
            ok(abs(d2[0] - d1[0]) < 2 and d2[1] < d1[1] - 10 and d3[0] > d2[0] + 10 and abs(d3[1] - d2[1]) < 2, f"Y muda só a altura e X só a largura da moldura ({d1} → {d2} → {d3})")
            pg.evaluate("() => { for (const [n, v] of [['sw', 30], ['sh', 70]]) { const r = document.querySelector('[data-enq=\"' + n + '\"]'); r.value = v; r.dispatchEvent(new Event('input', {bubbles: true})); } }"); pg.wait_for_timeout(150)
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"sh\"]'); r.value = 40; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(100)
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"z\"]'); r.value = 200; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(100)
            pg.evaluate("() => { const r = document.querySelector('[data-enq=\"sh\"]'); r.value = 70; r.dispatchEvent(new Event('input', {bubbles: true})); }"); pg.wait_for_timeout(150)
            zr = pg.evaluate("() => +document.querySelector('[data-enq=\"z\"]').value")
            ok(100 <= zr < 195, f"aumentar a moldura REVELA mais da foto (o zoom cai de 200% para {zr}%, a foto fica na mesma escala)")
            ar2 = pg.evaluate("() => { const p = document.getElementById('enqPalco').getBoundingClientRect(); return p.height / p.width; }")
            ok(abs(ar2 - 70/30) < 0.12, f"a moldura acompanha X e Y soltos ({ar2:.2f})")
            pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(400)
            so2 = pg.evaluate("async () => { const e = BWPressKit.atual().est; const m = await BWPressKit.modelo(BWPressKit.atual(), BWPressKit.imgsAtual()); const s = m.secoes.find(x => x.id === 'sobre'); return [e.sobR, e.sobH, s.fotoH / s.fotoW]; }")
            ok(so2[0] == "livre" and so2[1] == 70 and abs(so2[2] - 70/30) < 0.05, f"PRONTO guarda o LIVRE e o PDF usa a mesma medida ({so2})")
            # ◑ MISTURA e ◌ MÁSCARA também na foto da página 2 e na foto recortada
            for alvo, nome in (("sobre", "página 2"), ("retrato", "foto recortada")):
                if pg.locator(f'[data-a="enquadrar"][data-alvo="{alvo}"]').count() == 0:
                    ok(False, f"botão de ajustar a {nome} existe"); continue
                pg.locator(f'[data-a="enquadrar"][data-alvo="{alvo}"]').first.click(); pg.wait_for_selector("#enqCv", timeout=6000); pg.wait_for_timeout(500)
                ok(pg.locator('#modal [data-a="enqAba"][data-v="mix"]').count() == 1 and pg.locator('#modal [data-a="enqAba"][data-v="masc"]').count() == 1, f"a {nome} tem as abas ◑ MISTURA e ◌ MÁSCARA")
                px0 = pg.evaluate("() => { const c = document.getElementById('enqCv'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 3 && v > 10)).length; }")
                pg.click('#modal [data-a="enqAba"][data-v="mix"]'); pg.click('#modal [data-a="enqFx"][data-c="m"][data-v="mult"]'); pg.click('#modal [data-a="enqFx"][data-c="c"][data-v="destaque"]')
                pg.click('#modal [data-a="enqAba"][data-v="masc"]'); pg.click('#modal [data-a="enqFx"][data-c="k"][data-v="baixo"]'); pg.wait_for_timeout(900)
                px1 = pg.evaluate("() => { const c = document.getElementById('enqCv'); return Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 === 3 && v > 10)).length; }")
                ok(px1 < px0, f"a máscara some a {nome} embaixo e o fundo fica transparente ({px0} → {px1} pontos visíveis)")
                pg.click('[data-a="enqPronto"]'); pg.wait_for_timeout(500)
                fx = pg.evaluate("(k) => ((BWPressKit.imgsAtual().enq || {})[k] || {}).fx", alvo)
                ok(fx and fx.get("m") == "mult" and fx.get("k") == "baixo", f"PRONTO guarda a mistura e a máscara da {nome} ({fx})")
                ok(esperar_previa(pg), f"a prévia se refaz com o efeito na {nome}")
                pg.evaluate("(k) => { delete BWPressKit.imgsAtual().enq[k]; }", alvo)
            pg.evaluate("() => { const k = BWPressKit.atual(); delete k.est.sobW; delete k.est.sobR; delete k.est.sobH; delete BWPressKit.imgsAtual().enq.sobre; }")
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
        try: pg.wait_for_function("(a) => document.getElementById('pmLurl') && Object.keys(__sb.arq).filter(k => k.startsWith(a + '/')).length > 0 && __sb.log.filter(x => x.startsWith('rm:' + a + '/')).length > 0", arg=tok, timeout=240000); atu = True
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
