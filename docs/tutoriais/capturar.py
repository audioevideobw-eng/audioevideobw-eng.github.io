#!/usr/bin/env python3
"""TUTORIAIS com as TELAS DE VERDADE (25/11/2026, dono: "faça o tutorial fiel às páginas, tudo tem que ser como o real").
Abre cada página da Brightway no tamanho de celular (390 × 766, a tela do celular do tutorial), logada numa conta de EXEMPLO
("Produtora Exemplo", os mesmos dados do manual), faz o caminho de cada passo (tocar, rolar, digitar) e fotografa cada momento,
guardando onde fica o botão tocado. Sai em assets/tutoriais/*.webp + assets/tutoriais/quadros.js (window.BW_TUT_QUADROS).
Telas de sites de terceiros (Cloudflare, Google) NÃO são fotografadas: continuam desenhadas, com o aviso "tela ilustrativa".
Uso (na raiz): python3 docs/tutoriais/capturar.py [id-do-tutorial ...]"""
import io, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "manual"))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "testes"))
import _sem_sri  # noqa  (o supabase simulado não bate com o selo de integridade)
import telas as T                          # servidor, rota (stubs) e SEED da Produtora Exemplo
from playwright.sync_api import sync_playwright
from PIL import Image

RAIZ = T.RAIZ; SAI = os.path.join(RAIZ, "assets", "tutoriais"); T.PORTA = 8797
W, H = 390, 766
# sessão de EXEMPLO (só na captura): o stub do supabase devolve um usuário logado, para a tela mostrar LOGADO e as áreas de conta
STUB_LOGADO = T.STUB_SB.replace("getSession:async()=>({data:{session:null}})",
    "getSession:async()=>({data:{session:{access_token:'demo',user:{id:'demo',email:'exemplo@produtoraexemplo.com',user_metadata:{full_name:'Produtora Exemplo'},app_metadata:{provider:'email'},created_at:'2026-01-10'}}}})").replace(
    "getUser:async()=>({data:{user:null}})", "getUser:async()=>({data:{user:{id:'demo',email:'exemplo@produtoraexemplo.com'}}})")

# REGRA (dono, 25/11): o exemplo de cada tutorial mostra o RESULTADO REAL do que o passo pede.
# foto-ia: pessoa INVENTADA criada pela IA da plataforma (modo pers) + o resultado REAL da bw-ia-imagem para "cabelo cacheado ruivo"
# (gerados em 25/11 na conta ADM; docs/tutoriais/exemplos/). A captura entrega exatamente essa resposta da IA.
EXEMPLOS = os.path.join(RAIZ, "docs", "tutoriais", "exemplos")
FOTO_PESSOA = os.path.join(EXEMPLOS, "foto-ia-antes.webp")
def _ia_img():
    im = Image.open(os.path.join(EXEMPLOS, "foto-ia-depois.webp")).convert("RGB")
    bio = io.BytesIO(); im.save(bio, "JPEG", quality=90); import base64; return base64.b64encode(bio.getvalue()).decode()
# decupar: o que a IA devolve para CADA take de exemplo, descrevendo o que o take mostra de verdade (anúncio 13 s, depoimento 11 s)
DECUP_TAKE = {
  13: {"resumo": "Anúncio animado da festa de sábado", "modelo": "exemplo", "trechos": [
    {"ini": 0.3, "fim": 3.6, "tipo": "detalhe", "nota": 5, "desc": "chamada SÁBADO TEM! em neon", "fala": ""},
    {"ini": 3.8, "fim": 6.8, "tipo": "detalhe", "nota": 4, "desc": "data e local: 20/12 às 21h", "fala": ""},
    {"ini": 7.0, "fim": 11.2, "tipo": "detalhe", "nota": 4, "desc": "atrações: DJ, telão de LED e transmissão", "fala": ""},
    {"ini": 11.4, "fim": 13.0, "tipo": "detalhe", "nota": 5, "desc": "chamada final: garanta o seu ingresso", "fala": ""}]},
  11: {"resumo": "Depoimento de cliente com estrelas", "modelo": "exemplo", "trechos": [
    {"ini": 0.0, "fim": 1.6, "tipo": "ruim", "nota": 1, "desc": "estrelas ainda entrando, tela quase vazia", "fala": ""},
    {"ini": 1.8, "fim": 6.4, "tipo": "detalhe", "nota": 5, "desc": "depoimento com cinco estrelas", "fala": ""},
    {"ini": 6.6, "fim": 8.6, "tipo": "detalhe", "nota": 3, "desc": "nome e cargo do cliente", "fala": ""},
    {"ini": 8.8, "fim": 10.6, "tipo": "detalhe", "nota": 4, "desc": "chamada: peça um orçamento", "fala": ""}]}}
def _decup(u):
    import re as _re
    m = _re.search(r"dur=(\d+)", u); d = int(m.group(1)) if m else 13
    return DECUP_TAKE.get(d) or DECUP_TAKE[min(DECUP_TAKE, key=lambda k: abs(k - d))]
def rota(r):
    u = r.request.url
    cab = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*"}
    if "functions/v1/" in u and b'"testar"' in (r.request.post_data_buffer or b""):   # conferência da chave colada (simulada: conecta)
        return r.fulfill(status=200, body=json.dumps({"ok": True, "conta": "0123456789abcdef0123456789abcdef"}), content_type="application/json", headers=cab)
    if "functions/v1/bw-ia-video" in u: return r.fulfill(status=200, body=json.dumps(_decup(u)), content_type="application/json", headers=cab)
    if "functions/v1/" in u and b'"ping"' in (r.request.post_data_buffer or b""):   # a IA está ligada (senão a tela diz "sendo ativada")
        return r.fulfill(status=200, body=json.dumps({"pronto": True}), content_type="application/json", headers=cab)
    if "functions/v1/bw-ia?" in u or u.endswith("functions/v1/bw-ia"):   # IA de texto do assistente (resposta no formato real)
        import datetime as _dt
        ac = {"acoes": [{"tipo": "gasto_casa", "descricao": "Almoço", "valor": 50, "data": _dt.date.today().isoformat(), "categoria": "Alimentação"}], "resposta": "Anotei o almoço de 50 reais."}
        return r.fulfill(status=200, body=json.dumps({"texto": json.dumps(ac, ensure_ascii=False), "modelo": "openai/gpt-oss-20b", "nivel": "rapido"}), content_type="application/json", headers=cab)
    if "functions/v1/bw-ia-imagem" in u: return r.fulfill(status=200, body=json.dumps({"imagem": _ia_img()}), content_type="application/json", headers=cab)
    if "supabase-js" in u: return r.fulfill(body=STUB_LOGADO, content_type="application/javascript")
    return T.rota(r)

# ---------- O ROTEIRO DE CADA PASSO (o índice é o do passo em assets/tutoriais.js; passo sem roteiro = tela desenhada de terceiro) ----------
# FOTOGRAFAM: ("toque", sel) · ("rolar", sel) · ("digita", sel, texto) · ("foto",)
# SEM FOTO:   ("abrir", url) · ("clique", sel) · ("arquivo", sel, [caminhos]) · ("js", código) · ("espera", ms) · ("esperasel", sel)
MAIS = ".bw-abas >> text=Mais"
EX = os.path.join(RAIZ, "assets", "reels-exemplos")
TAKES = [os.path.join(EX, "anuncio.mp4"), os.path.join(EX, "depoimento.mp4")]
FOTO = os.path.join(EX, "depoimento.jpg")
CONFIG = [("abrir", "index.html"), ("toque", MAIS), ("rolar", "#bwMenu >> text=Configurações"), ("toque", "#bwMenu >> text=Configurações")]
TOPO = ("js", "scrollTo(0,0);document.scrollingElement.scrollTop=0")
VIDEO_COM_TAKES = [("abrir", "video.html"), ("clique", ".va-f >> text=Mídia"), ("arquivo", "#veArq", TAKES),
                   ("js", "new Promise(r=>{const t=setInterval(()=>{if(Object.values(__video.MID).filter(m=>m.dur>0).length>=2){clearInterval(t);r()}},200)})"), TOPO]
VIDEO_NA_LINHA = VIDEO_COM_TAKES + [("clique", "#veLib .ve-item >> nth=0"), ("espera", 600), ("clique", "#vaAdd"), ("clique", "#veLib .ve-item >> nth=1"),
                   ("espera", 800), ("espera", 800), ("js", "[...document.querySelectorAll('.va-f')].some(b=>b.innerText.trim()==='Dividir')&&document.querySelector('.va-f').click()"), ("espera", 600), TOPO, ("tecla", "Home"), ("tecla", "Shift+ArrowRight"), ("tecla", "Shift+ArrowRight")]
def boleto():                                  # boleto de ENERGIA válido (mesma conta do teste do leitor), vencendo em 10/12/2026
    def m10(x):
        s_, p_ = 0, 2
        for ch in reversed(x):
            n_ = int(ch) * p_; s_ += n_ // 10 + n_ % 10 if n_ > 9 else n_; p_ = 1 if p_ == 2 else 2
        r_ = s_ % 10; return 0 if r_ == 0 else 10 - r_
    corpo = "836" + "18990".zfill(11) + "0138" + "0006" + "20261210" + "1234567890123"
    bc = corpo[:3] + str(m10(corpo)) + corpo[3:]
    ln = "".join(bc[i*11:i*11+11] + str(m10(bc[i*11:i*11+11])) for i in range(4))
    return " ".join(ln[i*12:i*12+11] + "-" + ln[i*12+11] for i in range(4))

ROTEIROS = {
  "instalar-app": {
    0: [("abrir", "index.html"), ("toque", MAIS), ("rolar", "#bwMenu >> text=DOWNLOADS"), ("toque", "#bwMenu >> text=DOWNLOADS")],
    1: [("abrir", "downloads.html"), ("rolar", "text=BAIXAR PARA ANDROID"), ("toque", "text=BAIXAR PARA ANDROID")],
  },
  "tela-inicial": {
    0: [("abrir", "index.html"), ("toque", ".hub-tela >> nth=2")],
    1: [("abrir", "index.html"), ("digita", "#bpTexto", "gastei 50 no almoço"), ("toque", "#bpEnviar"), ("espera", 2500)],
    2: CONFIG,
  },
  "meu-assistente": {
    0: [("abrir", "index.html"), ("toque", MAIS), ("rolar", "#bwMenu >> text=Configurações"), ("toque", "#bwMenu >> text=Configurações"),
        ("rolar", "text=MEU ASSISTENTE"), ("toque", "text=MEU ASSISTENTE")],
    1: [("abrir", "meu-assistente.html"), ("digita", "#maNome", "Zé"), ("espera", 600)],
    2: [("abrir", "meu-assistente.html"), ("rolar", '[data-vis="ela"]'), ("toque", '[data-vis="ela"]'), ("toque", '[data-cor="#EC4899"]'), ("js", "scrollTo(0,0)")],
    3: [("abrir", "meu-assistente.html"), ("rolar", "#maVoz"), ("toque", '#maVoz [data-v="f"]'), ("toque", "#maOuvir2")],
  },
  "limites-ias": {
    0: CONFIG,
    1: [("abrir", "config.html"), ("rolar", "#cfgMinhasIas"), ("toque", '[data-mia="cf"] [data-a="abrir"]')],
    2: [("js", "localStorage.setItem('ui_minhas_ias', JSON.stringify({dono:'demo',cf:{conta:'0123456789abcdef0123456789abcdef',token:'exemplo-a1b2',usar:true,em:Date.now()}}))"),
        ("abrir", "config.html"), ("rolar", '[data-mia="cf"] [data-a="plat"]'), ("toque", '[data-mia="cf"] [data-a="plat"]')],
  },
  "conectar-cloudflare": {
    0: [("abrir", "config.html"), ("rolar", '[data-mia="cf"] [data-a="abrir"]'), ("toque", '[data-mia="cf"] [data-a="abrir"]')],
    5: [("abrir", "config.html"), ("clipboard", "chave-de-exemplo-0000-a1b2"), ("rolar", '[data-mia="cf"] [data-a="colar"]'), ("toque", '[data-mia="cf"] [data-a="colar"]')],
  },
  "conectar-gemini": {
    0: [("abrir", "config.html"), ("rolar", '[data-mia="gemini"] [data-a="abrir"]'), ("toque", '[data-mia="gemini"] [data-a="abrir"]')],
    4: [("abrir", "config.html"), ("clipboard", "chave-de-exemplo-0000-a1b2"), ("rolar", '[data-mia="gemini"] [data-a="colar"]'), ("toque", '[data-mia="gemini"] [data-a="colar"]')],
  },
  "decupar": {
    0: [("abrir", "video.html"), ("toque", ".va-f >> text=Mídia"), ("toque", "#veImportar"), ("arquivo", "#veArq", TAKES), ("espera", 2500), TOPO],
    1: VIDEO_COM_TAKES + [("rolar", "#veDecupBt"), ("toque", "#veDecupBt"), ("esperasel", "#veJanDecup"), ("digita", "#veDcCtx", "convenção de vendas"),
                          ("toque", "#veDcIr"), ("esperasel", "#veJanDecupVer")],
    2: VIDEO_COM_TAKES + [("clique", "#veDecupBt"), ("esperasel", "#veJanDecup"), ("clique", "#veDcIr"), ("esperasel", "#veJanDecupVer"),
                          ("rolar", "#veJanDecupVer [data-por] >> nth=5")],
    3: VIDEO_COM_TAKES + [("clique", "#veDecupBt"), ("esperasel", "#veJanDecup"), ("clique", "#veDcIr"), ("esperasel", "#veJanDecupVer"),
                          ("toque", "#veDcMontar"), ("clique", "#vaSheetOk"), ("espera", 800), TOPO, ("tecla", "Home"), ("tecla", "Shift+ArrowRight"), ("espera", 800)],
  },
  "exportar-redes": {
    0: VIDEO_COM_TAKES + [("rolar", "#veProxyBt"), ("toque", "#veProxyBt")],
    1: VIDEO_NA_LINHA + [("rolar", ".va-f >> text=Marcar entrada"), ("toque", ".va-f >> text=Marcar entrada"), TOPO],
    2: VIDEO_NA_LINHA + [("toque", "#vaExportar"), ("esperasel", '[data-pronto="insta"]'), ("toque", '[data-pronto="insta"]'), ("rolar", "#veExIr"), ("toque", "#veExIr"), ("espera", 2500)],
  },
  "foto-ia": {
    0: [("abrir", "fotos.html"), ("toque", "#solta"), ("arquivo", "#arquivos", [FOTO_PESSOA]), ("espera", 1500)],
    1: [("abrir", "fotos.html"), ("arquivo", "#arquivos", [FOTO_PESSOA]), ("espera", 1500), ("rolar", ".ed-abas >> text=IA"), ("toque", ".ed-abas >> text=IA")],
    2: [("abrir", "fotos.html"), ("arquivo", "#arquivos", [FOTO_PESSOA]), ("espera", 1500), ("clique", ".ed-abas >> text=IA"), ("espera", 600),
        ("digita", 'textarea[data-k="iaPedido"]', "cabelo cacheado ruivo"), ("rolar", '[data-k="iaCriar"]'), ("toque", '[data-k="iaCriar"]'), ("espera", 2000), TOPO],
    3: [("abrir", "fotos.html"), ("arquivo", "#arquivos", [FOTO_PESSOA]), ("espera", 1500), ("clique", ".ed-abas >> text=IA"), ("espera", 600),
        ("js", "var t=document.querySelector('textarea[data-k=iaPedido]');t.value='cabelo cacheado ruivo';t.dispatchEvent(new Event('input',{bubbles:true}))"),
        ("clique", '[data-k="iaCriar"]'), ("espera", 2000), TOPO,
        ("toque", '#edFotos button[data-i="0"]'), ("espera", 600), ("toque", '#edFotos button[data-i="1"]'), ("espera", 600), ("toque", "#edSalvar")],
  },
  "convite-animado": {
    0: [("abrir", "criador.html"), ("toque", ".cr-tipo >> text=CONVITE")],
    1: [("abrir", "criador.html"), ("clique", ".cr-tipo >> text=CONVITE"), ("rolar", "#bib .cr-mod >> nth=0"), ("toque", "#bib .cr-mod >> nth=0"), ("js", "scrollTo(0,0)")],
    2: [("abrir", "criador.html"), ("clique", ".cr-tipo >> text=CONVITE"), ("clique", "#bib .cr-mod >> nth=0"), ("rolar", '#animLiga [data-v="sim"]'), ("toque", '#animLiga [data-v="sim"]'),
        ("rolar", "[data-ait=\"borboleta\"]"), ("toque", "[data-ait=\"borboleta\"]"), ("js", "scrollTo(0,0)")],
    3: [("abrir", "criador.html"), ("clique", ".cr-tipo >> text=CONVITE"), ("clique", "#bib .cr-mod >> nth=0"), ("rolar", "#btnVideo"), ("toque", "#btnVideo"), ("espera", 1500)],
  },
  "lancamento": {
    0: [("abrir", "negocio.html"), ("toque", "a.amb-principal[href*=lancamentos]")],
    1: [("abrir", "lancamentos.html?a=pj"), ("toque", "#lcNovo"), ("toque", '[data-que="gasto"]'), ("toque", '[data-dest="neg_saida"]')],
    2: [("abrir", "lancamentos.html?a=pj"), ("clique", "#lcNovo"), ("clique", '[data-que="gasto"]'), ("clique", '[data-dest="neg_saida"]'),
        ("digita", "#fxValor", "150,00"), ("digita", "#fxDesc", "Almoço da equipe"), ("rolar", "#fxLancar"), ("toque", "#fxLancar"), ("rolar", "text=Almoço da equipe")],
    3: [("abrir", "lancamentos.html?a=pj"), ("rolar", "[data-ed] >> nth=0"), ("toque", "[data-ed] >> nth=0")],
  },
  "ler-conta": {
    0: [("abrir", "leitor.html"), ("rolar", "#ltDest"), ("toque", '#ltDest [data-d="conta"]'), ("rolar", '[data-a="colar"]'), ("toque", '[data-a="colar"]'),
        ("digita", "#ltCod", boleto()), ("toque", '[data-a="lerCod"]')],
    1: [("abrir", "leitor.html"), ("clique", '[data-a="colar"]'), ("js", "document.getElementById('ltCod').value=" + json.dumps(boleto())), ("clique", '[data-a="lerCod"]'),
        ("espera", 600), ("js", "document.getElementById('ltVenc').value='2026-12-10'"), ("rolar", "#ltRes")],
    2: [("abrir", "leitor.html"), ("clique", '[data-a="colar"]'), ("js", "document.getElementById('ltCod').value=" + json.dumps(boleto())), ("clique", '[data-a="lerCod"]'),
        ("espera", 600), ("js", "document.getElementById('ltVenc').value='2026-12-10'"), ("rolar", "#ltLancar"), ("toque", "#ltLancar"), ("rolar", "#ltRes")],
  },
}

def main(so):
    os.makedirs(SAI, exist_ok=True)
    T.servidor(); base = f"http://127.0.0.1:{T.PORTA}/"
    quadros = {}
    alvo_js = os.path.join(SAI, "quadros.js")
    if os.path.exists(alvo_js):
        try: quadros = json.loads(open(alvo_js, encoding="utf-8").read().split("=", 1)[1].rstrip().rstrip(";"))
        except Exception: quadros = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"], env=dict(os.environ, LANG="pt_BR.UTF-8", LANGUAGE="pt_BR"))
        for tid, passos in ROTEIROS.items():
            if so and tid not in so: continue
            quadros[tid] = {}
            for pi, acoes in passos.items():
                c = b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, is_mobile=True, has_touch=True, service_workers="block", locale="pt-BR",
                                  user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1")
                pg = c.new_page(); pg.route("**/*", rota)
                pg.goto(base + "termos.html")
                pg.evaluate("s=>{localStorage.clear();for(const k in s) localStorage.setItem('bw_'+k+'_v1', JSON.stringify(s[k]));"
                            "sessionStorage.setItem('bwsync_aviso','1')}", T.SEED)
                lista = []; n = 0
                def foto(acao, sel=None, texto=None):
                    nonlocal n
                    pg.wait_for_timeout(500)
                    nome = f"{tid}-{pi}-{n}.webp"; n += 1
                    png = pg.screenshot(type="png")
                    Image.open(io.BytesIO(png)).convert("RGB").save(os.path.join(SAI, nome), "WEBP", quality=72, method=6)
                    q = {"img": nome, "acao": acao}
                    if sel:
                        bb = pg.locator(sel).first.bounding_box(timeout=4000)
                        if bb: q["r"] = [round(bb["x"]), round(bb["y"]), round(bb["width"]), round(bb["height"])]
                    if texto: q["texto"] = texto
                    lista.append(q)
                pg.on("dialog", lambda d: d.accept())
                for a in acoes:
                    print("  ", a[:2], flush=True)
                    k = a[0]
                    if k == "abrir": pg.goto(base + a[1]); pg.wait_for_timeout(1800)
                    elif k == "espera": pg.wait_for_timeout(a[1])
                    elif k == "esperasel": pg.wait_for_selector(a[1], timeout=60000); pg.wait_for_timeout(500)
                    elif k == "js": pg.evaluate(a[1]); pg.wait_for_timeout(300)
                    elif k == "clipboard": c.grant_permissions(["clipboard-read", "clipboard-write"]); pg.evaluate("t=>navigator.clipboard.writeText(t)", a[1])
                    elif k == "clique": pg.locator(a[1]).first.click(force=True, timeout=8000); pg.wait_for_timeout(700)
                    elif k == "arquivo": pg.set_input_files(a[1], a[2]); pg.wait_for_timeout(800); pg.evaluate("scrollTo(0,0)")
                    elif k == "foto": foto("ver")
                    elif k == "talvez":
                        if pg.locator(a[1]).count() and pg.locator(a[1]).first.is_visible(): pg.locator(a[1]).first.click(force=True, timeout=4000); pg.wait_for_timeout(700)
                    elif k == "tecla": pg.keyboard.press(a[1]); pg.wait_for_timeout(500)
                    elif k == "toque":
                        el = pg.locator(a[1]).first
                        try: el.scroll_into_view_if_needed(timeout=3000)
                        except Exception: pass
                        foto("toque", a[1])
                        try:
                            with pg.expect_file_chooser(timeout=1500): el.click(force=True, timeout=5000)
                        except Exception: pass
                        pg.wait_for_timeout(900)
                    elif k == "rolar":
                        el = pg.locator(a[1]).first
                        antes = el.bounding_box(timeout=8000)
                        if antes and 70 < antes["y"] < H - 150: continue
                        foto("rolar"); el.evaluate("e=>e.scrollIntoView({block:'center'})"); pg.wait_for_timeout(600)
                    elif k == "digita":
                        el = pg.locator(a[1]).first; el.scroll_into_view_if_needed(); foto("digita", a[1], a[2]); el.fill(a[2]); el.dispatch_event("input"); pg.wait_for_timeout(300)
                foto("fim")
                quadros[tid][str(pi)] = lista
                c.close()
                print(tid, pi, len(lista), "quadros")
            open(alvo_js, "w", encoding="utf-8").write("window.BW_TUT_QUADROS = " + json.dumps(quadros, ensure_ascii=False, separators=(",", ":")) + ";\n")
        b.close()
    open(alvo_js, "w", encoding="utf-8").write("window.BW_TUT_QUADROS = " + json.dumps(quadros, ensure_ascii=False, separators=(",", ":")) + ";\n")

if __name__ == "__main__":
    main(set(sys.argv[1:]))
