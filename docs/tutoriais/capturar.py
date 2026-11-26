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
# assistente de texto: resposta REAL da bw-ia (25/11, conta ADM, assistente.html#legenda, Instagram, descontraído) para o tema do exemplo
LEGENDA = ("🚀 A convenção de vendas da Produtora Exemplo bombou em BH!  \nMais de 800 pessoas conectadas ao vivo 🎉  \n"
           "Capturamos tudo com 3 câmeras e telão de LED 📺  \nEnergia, networking e resultados em tempo real 🎥  \n"
           "Quer a mesma experiência no seu evento? Peça orçamento no direct ou WhatsApp.  \n\n"
           "#TransmissãoAoVivo #EventosCorporativos #BH #ProdutoraExemplo #LiveStreaming")
TEMA_LEGENDA = "Transmissão ao vivo da convenção de vendas da Produtora Exemplo em BH: 800 pessoas, 3 câmeras e telão de LED"
LIBS = os.environ.get("BW_LIBS_PDF", "/tmp/libs")   # pdf-lib 1.17.1 e pdfjs-dist 4.10.38 (npm), servidos no lugar do CDN só na captura
RECIBOS = [os.path.join(EXEMPLOS, f"recibo-{i}.jpg") for i in (1, 2, 3)]
ORCAMENTO = os.path.join(EXEMPLOS, "orcamento.pdf"); CONTRATO = os.path.join(EXEMPLOS, "contrato.pdf")

# MODO DIRETOR: respostas REAIS da IA da plataforma (26/11, conta do dono, bw-ia nível inteligente + bw-ia-imagem) para a ideia do exemplo,
# na ordem em que vieram: roteiro → textos das imagens → 4 imagens → pedido de mudança → textos de novo → imagem nova da cena 2.
DIR_IDEIA = ("Aftermovie da convenção anual de vendas de uma cooperativa: 600 pessoas num centro de convenções, palco com telão de LED, "
             "premiação dos melhores vendedores e show no encerramento.")
DIR_MUD = "A cena 2 acontece à noite, com o hall iluminado em azul"
DIR_ROT = {"titulo": "Aftermovie Convenção de Vendas", "personagem": None, "lugares": ["Centro de convenções vazio, estrutura de montagem e luzes", "Hall de entrada com público animado", "Palco com telão LED e bancada de premiação", "Área de catering com comida, decoração e sorrisos"],
  "cenas": [{"texto": "Montagem finalizada, luzes se acendem, plano aberto mostrando o centro de convenções.", "fala": "Bem-vindos à Convenção!", "lugar": 0},
            {"texto": "Público de 600 pessoas entra animado, câmera na mão captura a energia contagiante.", "fala": "A energia está alta!", "lugar": 1},
            {"texto": "Premiação dos melhores vendedores no palco, telão LED ilumina, contraluz destaca os vencedores.", "fala": "Parabéns aos campeões!", "lugar": 2},
            {"texto": "Close em sorrisos, pratos gourmet e decoração vibrante, celebrando o sucesso.", "fala": "", "lugar": 3}], "final": "Junte-se ao próximo sucesso!"}
DIR_ARTE1 = {"gancho": "A magia da convenção começa!", "cenas": [{"prompt": "Wide angle of empty convention center, lights turning on, bright ambient lighting", "fala": "Bem-vindos à Convenção!"},
  {"prompt": "Handheld camera follows enthusiastic crowd of 600 entering hall, dynamic movement, warm lighting", "fala": "A energia está alta!"},
  {"prompt": "Backlit stage with LED screen glowing, award podium, winners highlighted, dramatic lighting", "fala": "Parabéns aos campeões!"},
  {"prompt": "Close-up of smiling faces, gourmet dishes, vibrant décor, soft colorful lighting", "fala": "Brindamos ao sucesso e à boa comida!"}],
  "legenda": "Confira os momentos inesquecíveis da nossa convenção: energia, celebração e sucesso dos melhores vendedores."}
DIR_MUDOU = {"cenas": [{"n": 2, "texto": "À noite, o hall iluminado em azul recebe o público de 600 pessoas animado, câmera na mão captura a energia contagiante.", "fala": "A energia está alta!"}], "final": None, "personagem": None}
DIR_ARTE2 = {"gancho": "A magia da convenção começa", "cenas": [{"prompt": "Wide shot of empty convention center interior as assembly lights flare on", "fala": "Bem-vindos à Convenção!"},
  {"prompt": "Handheld camera moves through blue-lit hall filled with lively crowd", "fala": "A energia está alta!"},
  {"prompt": "Stage with LED screen glowing, backlit winners receiving awards", "fala": "Parabéns aos campeões!"},
  {"prompt": "Close-up of smiling faces, gourmet plates and vibrant decorations", "fala": "Sorrisos e sabores celebram nosso sucesso!"}],
  "legenda": "Confira os melhores momentos da nossa convenção: luzes, energia, premiações e celebrações gastronômicas."}
def _dir_ia(corpo):
    """Qual resposta real da bw-ia o MODO DIRETOR recebe, pelo pedido que a página mandou."""
    if "diretor de vídeos curtos" in corpo: return DIR_ROT
    if "Recebe o roteiro atual" in corpo: return DIR_MUDOU
    if "diretor de arte de Reels" in corpo and "convenç" in corpo.lower(): return DIR_ARTE2 if "azul" in corpo else DIR_ARTE1
    return None
def _dir_img(corpo):
    """A imagem REAL que a IA criou para cada cena, achada pelo prompt em inglês que a página manda."""
    c = corpo.lower()
    for chave, nome in (("blue-lit", "diretor-c2-noite"), ("empty convention", "diretor-c1"), ("crowd", "diretor-c2-dia"), ("led screen", "diretor-c3"), ("close-up", "diretor-c4")):
        if chave in c:
            im = Image.open(os.path.join(EXEMPLOS, nome + ".webp")).convert("RGB").resize((576, 1024), Image.LANCZOS)
            bio = io.BytesIO(); im.save(bio, "JPEG", quality=90); import base64; return base64.b64encode(bio.getvalue()).decode()
    return None

def quadro_arquivo(caminho, nome, destino, ultimas=0):
    """O ÚLTIMO quadro de um passo que baixa um arquivo: o ARQUIVO DE VERDADE aberto (páginas do PDF), regra 236."""
    import subprocess, tempfile, glob as _g
    tmp = tempfile.mkdtemp()
    subprocess.run(["pdftoppm", "-r", "110", "-png", caminho, os.path.join(tmp, "p")], check=True)
    pags = [Image.open(f).convert("RGB") for f in sorted(_g.glob(os.path.join(tmp, "p*.png")))]
    total = len(pags)
    if ultimas > 0: pags = pags[-ultimas:]
    elif ultimas < 0: pags = pags[:-ultimas]
    from PIL import ImageDraw, ImageFont, ImageFilter
    E = 2; Wc, Hc = W * E, H * E
    im = Image.new("RGB", (Wc, Hc), (11, 18, 34)); d = ImageDraw.Draw(im)   # azul-marinho da marca (regra 237)
    fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15 * E); fn = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12 * E)
    d.rectangle([0, 0, Wc, 58 * E], fill=(14, 27, 51)); d.rectangle([0, 58 * E, Wc, 58 * E + 3], fill=(232, 181, 74))
    d.text((16 * E, 12 * E), "📄 " + nome if False else nome, font=fb, fill=(240, 240, 240))
    d.text((16 * E, 33 * E), f"PDF pronto · {total} página" + ("s" if total > 1 else "") + (f" · mostrando a página {total}" if ultimas == 1 and total > 1 else "") + (f" · as {len(pags)} primeiras" if ultimas < 0 and total > len(pags) else ""), font=fn, fill=(62, 207, 142))
    topo = 70 * E; esp = 12 * E; area_h = Hc - topo - 16 * E
    n = len(pags); larg = Wc - 60 * E
    alt_tot = sum(p.height * larg / p.width for p in pags) + esp * (n - 1)
    k = min(1, area_h / alt_tot); larg = int(larg * k)
    y = topo
    for p in pags:
        h = int(p.height * larg / p.width); x = (Wc - larg) // 2
        sombra = Image.new("RGBA", (larg + 40, h + 40), (0, 0, 0, 0)); ImageDraw.Draw(sombra).rectangle([20, 24, larg + 20, h + 24], fill=(0, 0, 0, 150))
        sombra = sombra.filter(ImageFilter.GaussianBlur(10)); im.paste(sombra, (x - 20, y - 20), sombra)
        im.paste(p.resize((larg, h), Image.LANCZOS), (x, y)); y += h + esp
    im.save(destino, "WEBP", quality=80, method=6)

def quadro_imagem(caminho, nome, destino):
    """O ÚLTIMO quadro de um passo que baixa uma IMAGEM: a imagem de verdade, inteira, na moldura da marca (regra 236/237)."""
    from PIL import ImageDraw, ImageFont, ImageFilter
    E = 2; Wc, Hc = W * E, H * E
    im = Image.new("RGB", (Wc, Hc), (11, 18, 34)); d = ImageDraw.Draw(im)
    fb = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15 * E); fn = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12 * E)
    d.rectangle([0, 0, Wc, 58 * E], fill=(14, 27, 51)); d.rectangle([0, 58 * E, Wc, 58 * E + 3], fill=(232, 181, 74))
    p = Image.open(caminho).convert("RGB")
    d.text((16 * E, 12 * E), nome, font=fb, fill=(240, 240, 240))
    d.text((16 * E, 33 * E), f"Imagem pronta · {p.width} × {p.height} px", font=fn, fill=(62, 207, 142))
    topo = 70 * E; area_w, area_h = Wc - 40 * E, Hc - topo - 16 * E
    k = min(area_w / p.width, area_h / p.height); w, h = int(p.width * k), int(p.height * k); x = (Wc - w) // 2
    sombra = Image.new("RGBA", (w + 40, h + 40), (0, 0, 0, 0)); ImageDraw.Draw(sombra).rectangle([20, 24, w + 20, h + 24], fill=(0, 0, 0, 150))
    sombra = sombra.filter(ImageFilter.GaussianBlur(10)); im.paste(sombra, (x - 20, topo - 20), sombra)
    im.paste(p.resize((w, h), Image.LANCZOS), (x, topo))
    im.save(destino, "WEBP", quality=82, method=6)

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
    PMK = os.environ.get("PK_LIBS", "/tmp/pm") + "/node_modules/"   # pdfMake 0.2.20 + qrcode (npm), só na captura do press kit
    if "pdfmake.min.js" in u: return r.fulfill(path=PMK + "pdfmake/build/pdfmake.min.js", content_type="application/javascript", headers=cab)
    if "vfs_fonts" in u: return r.fulfill(path=PMK + "pdfmake/build/vfs_fonts.js", content_type="application/javascript", headers=cab)
    if "qrcode-generator@1.4.4" in u: return r.fulfill(path=PMK + "qrcode-generator/qrcode.js", content_type="application/javascript", headers=cab)
    if "pdf-lib@1.17.1/dist/pdf-lib.min.js" in u: return r.fulfill(path=os.path.join(LIBS, "pdf-lib.min.js"), content_type="application/javascript", headers=cab)
    if "pdfjs-dist@4.10.38/build/" in u:
        n = u.rsplit("/", 1)[1]; return r.fulfill(path=os.path.join(LIBS, n), content_type="text/javascript", headers=cab)
    corpo = (r.request.post_data_buffer or b"").decode("utf-8", "ignore")
    if ("functions/v1/bw-ia?" in u or u.endswith("functions/v1/bw-ia")) and _dir_ia(corpo):
        return r.fulfill(status=200, body=json.dumps({"texto": json.dumps(_dir_ia(corpo), ensure_ascii=False), "modelo": "openai/gpt-oss-120b", "nivel": "inteligente"}), content_type="application/json", headers=cab)
    if "functions/v1/bw-ia-imagem" in u and _dir_img(corpo): return r.fulfill(status=200, body=json.dumps({"imagem": _dir_img(corpo)}), content_type="application/json", headers=cab)
    if ("functions/v1/bw-ia?" in u or u.endswith("functions/v1/bw-ia")) and "Produtora Exemplo em BH" in (r.request.post_data_buffer or b"").decode("utf-8", "ignore"):
        return r.fulfill(status=200, body=json.dumps({"texto": LEGENDA, "modelo": "openai/gpt-oss-20b", "nivel": "rapido"}), content_type="application/json", headers=cab)
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

# press kit: ATOR PROFISSIONAL inventado (foto criada pela IA da plataforma em 25/11, conta ADM: docs/tutoriais/exemplos/presskit-ator.webp)
FOTO_ATOR = os.path.join(EXEMPLOS, "presskit-ator.webp")
ATOR = {"marca": "Rafael Duarte", "slogan": "", "cidade": "Belo Horizonte · MG",
  "sobreCurto": "Ator com 12 anos de palco e câmera, do drama à comédia.",
  "sobre": "Rafael começou no teatro de grupo e hoje divide o tempo entre peças, séries e campanhas publicitárias. Gosta de personagens que misturam humor e emoção na mesma cena.\n\nEstudou interpretação para câmera e tem experiência com comerciais, dublagem e apresentação de eventos.",
  "perfil": [{"k": "Registro profissional", "v": "DRT 00000/MG (exemplo)"}, {"k": "Altura", "v": "1,80 m"}, {"k": "Idiomas", "v": "Português, inglês e espanhol"}, {"k": "Disponível para", "v": "Viagens e gravações noturnas"}],
  "experiencia": [{"grupo": "TV e streaming", "titulo": "Série Caminhos de Minas", "papel": "Personagem fixo (Tomás)", "onde": "Canal Exemplo", "ano": "2025", "link": "youtube.com/exemplo"},
    {"grupo": "Publicidade", "titulo": "Campanha de verão", "papel": "Protagonista", "onde": "Banco Aurora", "ano": "2026", "link": "youtube.com/exemplo"},
    {"grupo": "Teatro", "titulo": "A Casa das Janelas", "papel": "Otávio", "onde": "Teatro Municipal", "ano": "2023", "link": ""}],
  "contato": {"resp": "Agência Talento Exemplo", "cargo": "Agenciamento", "tel": "(31) 90000-0010", "email": "rafael@exemplo.com.br", "site": "", "insta": "@rafaelduarte.ator", "tiktok": "", "youtube": "", "cidade": "Belo Horizonte · MG"}}
PK_ATOR = [("abrir", "presskit.html?modelo=ator"), ("esperasel", "#form [data-k='d.marca']"),
  ("js", "var K=BWPressKit.atual();Object.assign(K.d," + json.dumps(ATOR, ensure_ascii=False) + ");K.nome='Apresentação — Rafael Duarte';K.exemplo=false;BWPressKit.imgsAtual().retrato='';document.querySelector('[data-a=trocarModelo][data-m=ator]').click()"),
  ("espera", 900), TOPO]
PK_FOTO = PK_ATOR + [("arquivo", "input[data-up='capa']", [FOTO_ATOR]), ("espera", 1200),
  ("js", "var e=document.getElementById('f_d_slogan');e.value='Ator profissional';e.dispatchEvent(new Event('input',{bubbles:true}))"), ("espera", 600), TOPO]
PK_PRONTO = PK_FOTO + [("clique", "[data-a=tirarParte][data-s=galeria]"), ("espera", 900), TOPO]

# MODO DIRETOR (aftermovie da convenção de vendas, 4 cenas, tom emocionante): cada passo refaz o caminho até ali na página de verdade
ESPERA_AVISO = lambda txt: ("js", "new Promise((ok,no)=>{const t0=Date.now(),t=setInterval(()=>{const x=['qdDirAviso','qdAviso','qdDica'].map(i=>(document.getElementById(i)||{}).textContent||'').join(' ');"
    "if(x.indexOf(" + json.dumps(txt) + ")>=0){clearInterval(t);ok()}else if(Date.now()-t0>150000){clearInterval(t);no('sem aviso '+x+' | ocup='+((document.getElementById('qdOcupTxt')||{}).innerText||''))}},250)})")
DIR_0 = [("abrir", "reels.html?quadro=1"), ("esperasel", "#folhaQuadro:not([hidden])"), ("espera", 600), ("clique", "#qdBtDir"), ("esperasel", "#qdDirIdeia")]
DIR_1 = DIR_0 + [("clique", "[data-ini=evento]"), ("js", "var t=document.getElementById('qdDirIdeia');t.value=" + json.dumps(DIR_IDEIA) + ";t.dispatchEvent(new Event('input',{bubbles:true}))"),
                 ("clique", "[data-tom=emocionante]"), ("clique", "[data-n='4']")]
DIR_2 = DIR_1 + [("clique", "[data-dir=escrever]"), ("esperasel", "[data-dir=montar]")]
DIR_3 = DIR_2 + [("clique", "[data-dir=montar]"), ("esperasel", "[data-dir=imagens]")]
DIR_4 = DIR_3 + [("clique", "[data-dir=imagens]"), ESPERA_AVISO("criada"), ("js", "BWDiretor.abrir()"), ("espera", 500)]
DIR_5 = DIR_4 + [("js", "var t=document.getElementById('qdDirMud');t.value=" + json.dumps(DIR_MUD) + ";t.dispatchEvent(new Event('input',{bubbles:true}))"),
                 ("clique", "[data-dir=mudar]"), ESPERA_AVISO("Mudei só"), ("clique", "[data-dir=imagens]"), ESPERA_AVISO("1 imagem(ns) criada"), ("js", "BWDiretor.abrir()"), ("espera", 500)]
VER_QUADRO = [("js", "BWDiretor.fechar()"), ("espera", 500), ("js", "document.getElementById('qdOrganizar').click()"), ("espera", 900)]

ROTEIROS = {
  "diretor": {
    0: [("abrir", "index.html"), ("toque", ".bw-abas >> text=Marketing"), ("rolar", 'a.menu-card[href="reels.html"]'), ("toque", 'a.menu-card[href="reels.html"]')],
    1: [("abrir", "reels.html"), ("espera", 1200), ("talvez", "#btFecharModelos"), TOPO, ("toque", "#btQuadro"), ("espera", 900), ("toque", "#qdBtDir"), ("esperasel", "#qdDirIdeia")],
    2: DIR_0 + [("toque", "[data-ini=evento]"), ("digita", "#qdDirIdeia", DIR_IDEIA), ("rolar", "[data-tom=emocionante]"), ("toque", "[data-tom=emocionante]"), ("toque", "[data-n='4']")],
    3: DIR_1 + [("rolar", "[data-dir=escrever]"), ("toque", "[data-dir=escrever]"), ("esperasel", "[data-dir=montar]"), ("js", "document.querySelector('#qdDirCorpo h4').scrollIntoView({block:'start'})"),
        ("foto",), ("rolar", "[data-dir=montar]")],
    4: DIR_2 + [("rolar", "[data-dir=montar]"), ("toque", "[data-dir=montar]"), ("esperasel", "[data-dir=imagens]"), ("foto",)] + VER_QUADRO,
    5: DIR_3 + [("toque", "[data-dir=imagens]"), ESPERA_AVISO("criada"), ("foto",)] + VER_QUADRO,
    6: DIR_4 + [("rolar", "#qdDirMud"), ("digita", "#qdDirMud", DIR_MUD), ("toque", "[data-dir=mudar]"), ESPERA_AVISO("Mudei só"), ("foto",),
        ("toque", "[data-dir=imagens]"), ESPERA_AVISO("1 imagem(ns) criada")] + VER_QUADRO,
    7: DIR_5 + [("rolar", "[data-dir=storyboard]"), ("baixaimg", "[data-dir=storyboard]")],
  },
  "presskit": {
    0: [("abrir", "index.html"), ("toque", ".bw-abas >> text=Marketing"), ("rolar", 'a.menu-card[href="presskit.html"]'), ("toque", 'a.menu-card[href="presskit.html"]')],
    1: [("abrir", "presskit.html"), ("toque", "[data-a=novo]"), ("rolar", "[data-a=usarModelo][data-m=ator]"), ("toque", "[data-a=usarModelo][data-m=ator]"), ("espera", 1500), TOPO],
    2: PK_ATOR + [("rolar", "#f_d_marca"), ("digita", "#f_d_marca", "Rafael Duarte"), ("toque", "[data-a=opcoes][data-alvo=f_d_slogan]"),
        ("toque", "#modal [data-a=opcTocar][data-v='Ator profissional']"), ("espera", 600), ("js", "document.getElementById('f_d_slogan').scrollIntoView({block:'center'})")],
    3: PK_ATOR + [("rolar", "label.pk-up:has(input[data-up='capa'])"), ("toque", "label.pk-up:has(input[data-up='capa'])"), ("arquivo", "input[data-up='capa']", [FOTO_ATOR]), ("espera", 1200),
        ("js", "document.querySelector('input[data-up=capa]').closest('.pk-img').scrollIntoView({block:'center'})")],
    4: PK_FOTO + [("rolar", "[data-a=tirarParte][data-s=galeria]"), ("toque", "[data-a=tirarParte][data-s=galeria]"), ("espera", 900),
        ("js", "document.querySelector('[data-a=devolverParte]').scrollIntoView({block:'center'})")],
    5: PK_PRONTO + [("toque", "#abaPrev"), ("esperasel", "#paginas canvas, #paginas img"), ("espera", 2500), ("foto",), ("rolar", "[data-a=pdf]"), ("baixa", "[data-a=pdf]", -2)],
  },
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
  "fotos-pdf": {
    0: [("abrir", "negocio.html"), ("rolar", 'h3[data-seta="emp-ferr"]'), ("toque", 'h3[data-seta="emp-ferr"]'), ("rolar", 'a.bw-tool-card[href="pdf.html"]'), ("toque", 'a.bw-tool-card[href="pdf.html"]')],
    1: [("abrir", "pdf.html"), ("toque", '#abas [data-aba="fotos"]'), ("toque", '.tf-soltar[data-alvo="fArq"]'), ("arquivo", "#fArq", RECIBOS), ("js", "document.getElementById('fLista').scrollIntoView({block:'center'})")],
    2: [("abrir", "pdf.html#fotos"), ("arquivo", "#fArq", RECIBOS), ("rolar", "#fGo"), ("baixa", "#fGo")],
  },
  "juntar-pdf": {
    0: [("abrir", "pdf.html"), ("toque", '#abas [data-aba="juntar"]'), ("toque", '.tf-soltar[data-alvo="jArq"]'), ("arquivo", "#jArq", [ORCAMENTO, CONTRATO]), ("js", "document.getElementById('jLista').scrollIntoView({block:'center'})")],
    1: [("abrir", "pdf.html#juntar"), ("arquivo", "#jArq", [ORCAMENTO, CONTRATO]), ("rolar", "#jGo"), ("baixa", "#jGo")],
  },
  "assinar-pdf": {
    0: [("abrir", "pdf.html"), ("toque", '#abas [data-aba="assinar"]'), ("toque", '.tf-soltar[data-alvo="aArq"]'), ("arquivo", "#aArq", [CONTRATO]), ("espera", 1500), ("js", "document.getElementById('aVer').scrollIntoView({block:'center'})")],
    1: [("abrir", "pdf.html#assinar"), ("arquivo", "#aArq", [CONTRATO]), ("espera", 1500), ("desenha", "#aPad"), ("js", "var t=document.getElementById('aTam');t.value=40;t.dispatchEvent(new Event('input'))"), ("rolar", "#aCanvas"), ("toque", "#aCanvas")],
    2: [("abrir", "pdf.html#assinar"), ("arquivo", "#aArq", [CONTRATO]), ("espera", 1500), ("desenha", "#aPad"), ("js", "var t=document.getElementById('aTam');t.value=40;t.dispatchEvent(new Event('input'))"), ("clique", "#aCanvas"), ("rolar", "#aGo"), ("baixa", "#aGo", 1)],
  },
  "assistente-texto": {
    0: [("abrir", "negocio.html"), ("rolar", 'a.bw-tool-card[href="assistente.html#legenda"]'), ("toque", 'a.bw-tool-card[href="assistente.html#legenda"]')],
    1: [("abrir", "assistente.html#legenda"), ("espera", 1500), ("digita", "#lgTema", TEMA_LEGENDA), ("rolar", "#btnGerar"), ("toque", "#btnGerar"), ("espera", 2500), ("rolar", "#saida")],
    2: [("abrir", "assistente.html#legenda"), ("espera", 1500), ("js", "var t=document.getElementById('lgTema');t.value=" + json.dumps(TEMA_LEGENDA) + ";t.dispatchEvent(new Event('input',{bubbles:true}))"),
        ("clique", "#btnGerar"), ("espera", 2500), ("rolar", "#btnCopiar"), ("toque", "#btnCopiar")],
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
                lista = []; n = 0; sem_fim = False
                def foto(acao, sel=None, texto=None):
                    nonlocal n, sem_fim
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
                    elif k == "baixa":
                        el = pg.locator(a[1]).first
                        try: el.scroll_into_view_if_needed(timeout=3000)
                        except Exception: pass
                        foto("toque", a[1])
                        with pg.expect_download(timeout=60000) as dl: el.click(force=True, timeout=5000)
                        arq = os.path.join(SAI, "_baixado.pdf"); dl.value.save_as(arq); pg.wait_for_timeout(900)
                        foto("ver")   # a página com o aviso "✓ …"
                        nome = f"{tid}-{pi}-{n}.webp"; n += 1
                        quadro_arquivo(arq, dl.value.suggested_filename, os.path.join(SAI, nome), a[2] if len(a) > 2 else 0); os.remove(arq)
                        lista.append({"img": nome, "acao": "fim"}); sem_fim = True
                    elif k == "baixaimg":
                        el = pg.locator(a[1]).first
                        try: el.scroll_into_view_if_needed(timeout=3000)
                        except Exception: pass
                        foto("toque", a[1])
                        with pg.expect_download(timeout=60000) as dl: el.click(force=True, timeout=5000)
                        arq = os.path.join(SAI, "_baixado.png"); dl.value.save_as(arq); pg.wait_for_timeout(900)
                        try: pg.locator("#qdDirSbCx").evaluate("e=>e.scrollIntoView({block:'center'})")
                        except Exception: pass
                        foto("ver")
                        nome = f"{tid}-{pi}-{n}.webp"; n += 1
                        quadro_imagem(arq, dl.value.suggested_filename, os.path.join(SAI, nome)); os.remove(arq)
                        lista.append({"img": nome, "acao": "fim"}); sem_fim = True
                    elif k == "desenha":
                        el = pg.locator(a[1]).first; el.scroll_into_view_if_needed(); foto("toque", a[1])
                        bb = el.bounding_box(); x0, y0, w0, h0 = bb["x"], bb["y"], bb["width"], bb["height"]
                        import math as _m
                        # assinatura cursiva: laços que andam para a direita (curva de laçadas) + um traço embaixo
                        pts = []
                        for t in range(0, 241):
                            u = t / 240; ang = u * 2 * _m.pi * 6.5; amp = 0.30 * (0.55 + 0.45 * _m.sin(u * 7.3)) * (1 - 0.35 * u)
                            pts.append((0.10 + 0.74 * u + 0.045 * _m.cos(ang), 0.48 - amp * _m.sin(ang) - 0.10 * _m.sin(u * 3.2)))
                        pg.mouse.move(x0 + w0 * pts[0][0], y0 + h0 * pts[0][1]); pg.mouse.down()
                        for px, py in pts[1:]: pg.mouse.move(x0 + w0 * px, y0 + h0 * py)
                        pg.mouse.up()
                        pg.mouse.move(x0 + w0 * 0.14, y0 + h0 * 0.84); pg.mouse.down(); pg.mouse.move(x0 + w0 * 0.86, y0 + h0 * 0.76, steps=16); pg.mouse.up()
                        pg.wait_for_timeout(400)
                    elif k == "digita":
                        el = pg.locator(a[1]).first; el.scroll_into_view_if_needed(); foto("digita", a[1], a[2]); el.fill(a[2]); el.dispatch_event("input"); pg.wait_for_timeout(300)
                if not sem_fim: foto("fim")
                quadros[tid][str(pi)] = lista
                c.close()
                print(tid, pi, len(lista), "quadros")
            open(alvo_js, "w", encoding="utf-8").write("window.BW_TUT_QUADROS = " + json.dumps(quadros, ensure_ascii=False, separators=(",", ":")) + ";\n")
        b.close()
    open(alvo_js, "w", encoding="utf-8").write("window.BW_TUT_QUADROS = " + json.dumps(quadros, ensure_ascii=False, separators=(",", ":")) + ";\n")

if __name__ == "__main__":
    main(set(sys.argv[1:]))
