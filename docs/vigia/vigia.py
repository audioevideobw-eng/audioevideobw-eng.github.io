#!/usr/bin/env python3
"""Vigia do Brightway — confere o site a cada publicação (GitHub Actions).

Mantido pelo Claude (pasta docs/ é só dele — ver AGENTS.md).
Uso local:  python3 docs/vigia/vigia.py   (na raiz do repositório)
Sai com código 1 e lista os problemas se algo essencial sumiu.
"""
import glob, json, os, re, subprocess, sys, tempfile

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(RAIZ)
problemas, avisos = [], []

def ler(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()

PAGINAS = sorted(glob.glob("*.html"))
SBJS = "supabase-js@2"

# 1) imagens precisam ser binárias de verdade (não texto base64)
ASSINATURAS = {".png": b"\x89PNG", ".jpg": b"\xff\xd8", ".jpeg": b"\xff\xd8", ".webp": b"RIFF", ".gif": b"GIF8"}
for p in glob.glob("**/*", recursive=True):
    ext = os.path.splitext(p)[1].lower()
    if ext in ASSINATURAS and os.path.isfile(p) and not p.startswith(".git"):
        with open(p, "rb") as f:
            cab = f.read(8)
        if not cab.startswith(ASSINATURAS[ext]):
            problemas.append(f"Imagem quebrada (salva como texto, não como imagem): {p}")

# 2) bw-sync.js inteiro (as proteções do Claude)
sync = ler("assets/bw-sync.js") if os.path.exists("assets/bw-sync.js") else ""
for marca, oque in [("function blindar", "desvio de upsert antigo"),
                    ("Storage.prototype.setItem", "gancho no localStorage"),
                    ("function garantirDono", "dados do aparelho separados por conta"),
                    ("function registrarPosse", "registro de posse (isolamento entre usuários)"),
                    ("function mesclarLista", "mescla item a item")]:
    if marca not in sync:
        problemas.append(f"assets/bw-sync.js sem '{oque}' — arquivo velho ou sobrescrito")

# 3) cada página
for p in PAGINAS:
    s = ler(p)
    if SBJS in s:
        i_sb = s.find(SBJS)
        i_sync = s.find("assets/bw-sync.js")
        i_mod = s.find("const MOD = {}")
        if i_sync < 0:
            problemas.append(f"{p}: não carrega assets/bw-sync.js (sincronização segura desligada)")
        elif i_sync < i_sb or (i_mod >= 0 and i_sync > i_mod):
            problemas.append(f"{p}: assets/bw-sync.js fora de ordem (tem que vir DEPOIS do supabase-js e ANTES do bundle)")
    if "const MOD = {}" not in s:
        continue
    # módulos usados x definidos
    definidos = set(re.findall(r"^MOD\['([^']+)'\] = \(function", s, re.M))
    usados = set(re.findall(r"MOD\['([^']+)'\](?! = )", s))
    for m in sorted(usados - definidos):
        problemas.append(f"{p}: usa o módulo '{m}' mas ele não está no bundle (a página trava)")
    # store com 3 argumentos
    if "MOD['core/store'] = (function" in s and "antesDeSalvar(key, versao, valor)" not in s:
        avisos.append(f"{p}: core/store não chama BWSync.antesDeSalvar(key, versao, valor) (o bw-sync cobre, mas corrija o gerador)")
    # nuvem só delegação
    for m in re.finditer(r"^MOD\['core/nuvem'\] = \(function", s, re.M):
        fim = s.find("/* ===== ", m.end())
        bloco = s[m.start(): fim if fim > 0 else len(s)]
        if ".upsert(" in bloco:
            avisos.append(f"{p}: core/nuvem ainda tem upsert (o bw-sync desvia, mas o gerador deveria só delegar)")
    # sintaxe do JavaScript embutido
    for k, sc in enumerate(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", s, re.S)):
        if not sc.strip() or sc.lstrip().startswith("{"):
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            t.write(sc)
        r = subprocess.run(["node", "--check", t.name], capture_output=True, text=True)
        os.unlink(t.name)
        if r.returncode != 0:
            linha = (r.stderr.strip().splitlines() or ["?"])
            problemas.append(f"{p}: erro de sintaxe no JavaScript (script {k+1}): {linha[-1][:160]}")

# 4) pedidos do dono
neg = ler("negocio.html") if os.path.exists("negocio.html") else ""
for h in ["eventos.html", "equipe.html", "fluxo.html", "preco.html", "leitor.html", "financeiro-painel.html"]:
    if not re.search(r'class="menu-card[^"]*" href="' + re.escape(h) + '"', neg):
        problemas.append(f"negocio.html: falta o card da ferramenta {h} (o dono pediu TODAS as ferramentas do negócio)")
if os.path.exists("app.html") and "rs.find(" in ler("app.html"):
    problemas.append("app.html: botão 'Sincronizar agora' voltou com o erro rs.find")

# 5) service worker
sw = ler("sw.js") if os.path.exists("sw.js") else ""
if "url.origin !== location.origin" not in sw or "jsdelivr" not in sw:
    problemas.append("sw.js: o Supabase pode estar passando pelo cache (dados velhos entre aparelhos)")

# 6) manifest e JSON válidos
for j in ["manifest.json", "milhas.json", "noticias.json"]:
    if os.path.exists(j):
        try:
            json.loads(ler(j))
        except Exception as e:
            problemas.append(f"{j}: JSON inválido ({e})")

# 7) PENTE FINO — bugs já encontrados não podem voltar (14/11/2026). Ver AGENTS.md › "Pente fino".
todos = {p: ler(p) for p in PAGINAS}
css = ler("assets/brightway.css") if os.path.exists("assets/brightway.css") else ""
lay = ler("assets/layout.js") if os.path.exists("assets/layout.js") else ""
# 7.1 nenhum segredo no site
for arq in PAGINAS + ["assets/bw-sync.js", "assets/layout.js", "sw.js"]:
    if os.path.exists(arq):
        t = ler(arq)
        for seg, nome in [(r"sb_secret_[A-Za-z0-9_-]{12,}", "chave secreta do Supabase"), (r"GOCSPX-[A-Za-z0-9_-]{12,}", "client secret do Google"),
                          (r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl", "chave service_role (JWT)")]:
            if re.search(seg, t):
                problemas.append(f"{arq}: contém {nome} — NUNCA publique segredos")
# 7.2 login: nada apontando para localhost; cadastro com emailRedirectTo; PKCE ligado
for p, t in todos.items():
    if re.search(r"https?://localhost|127\.0\.0\.1", t):
        problemas.append(f"{p}: aponta para localhost (links de e-mail/login quebram no celular)")
lg = todos.get("login.html", "")
if lg and "signUp(" in lg and "emailRedirectTo" not in lg:
    problemas.append("login.html: signUp sem emailRedirectTo (confirmação de e-mail volta para o Site URL/localhost)")
if lg and "?google=1" not in lg:
    problemas.append("login.html: volta do Google sem ?google=1 (não vai direto ao painel)")
if 'flowType: "pkce"' not in sync:
    problemas.append("assets/bw-sync.js: login PKCE desligado (flowType pkce)")
# 7.3 ícones do app: quadrados e do tamanho declarado
try:
    man = json.loads(ler("manifest.json"))
    for ic in man.get("icons", []):
        src = ic.get("src", "")
        if not os.path.exists(src):
            problemas.append(f"manifest.json: ícone {src} não existe"); continue
        with open(src, "rb") as f:
            cab = f.read(24)
        w, h = int.from_bytes(cab[16:20], "big"), int.from_bytes(cab[20:24], "big")
        dec = ic.get("sizes", "")
        if w != h or dec != f"{w}x{h}":
            problemas.append(f"manifest.json: ícone {src} é {w}x{h} mas declara '{dec}' (precisa ser quadrado e do tamanho certo)")
except Exception as e:
    problemas.append(f"manifest.json: não deu para conferir ícones ({e})")
# 7.4 mesma versão de CSS/JS em todas as páginas (cache velho = 'site bugado')
for nome in ["assets/brightway.css", "assets/layout.js"]:
    vs = {v for t in todos.values() for v in re.findall(re.escape(nome) + r"\?v=(\w+)", t)}
    if len(vs) > 1:
        problemas.append(f"{nome} com versões diferentes entre páginas: {sorted(vs)} (suba o ?v= em TODAS)")
# 7.5 ids duplicados no HTML fixo (o JS pega o primeiro e ignora o segundo)
for p, t in todos.items():
    corpo = re.sub(r"<script.*?</script>", "", t, flags=re.S)
    ids = re.findall(r'\bid="([^"$`{}]+)"', corpo)
    rep = sorted({i for i in ids if ids.count(i) > 1})
    if rep:
        problemas.append(f"{p}: id repetido no HTML: {', '.join(rep[:5])}")
# 7.6 listas que escondem o que acabou de ser salvo / mensagem que some
for p, t in todos.items():
    if "function ligarColapsaveis" in t and "ui_colap" not in t:
        problemas.append(f"{p}: core/colap antigo (lista fecha e esconde o item recém-salvo)")
    if "Fixo criado —" in t:
        problemas.append(f"{p}: mensagem de fixo antes do re-render (some da tela — parece que não salvou)")
    if "window.__delFixo" in t and "apaga também" not in t:
        problemas.append(f"{p}: apagar fixo deixa contas/lançamentos futuros órfãos")
# 7.7 layout: celular, selo LOGADO, galeria
if "min-width:0" not in css:
    problemas.append("assets/brightway.css: sem min-width:0 nas grades (estoura a tela no celular)")
if lay and "slot.innerHTML = orig.innerHTML" not in lay:
    problemas.append("assets/layout.js: não copia o #userBox (selo LOGADO some)")
if lay and "APP DOWNLOAD" not in lay:
    problemas.append("assets/layout.js: sumiu o botão APP DOWNLOAD do menu")
for p in ["index.html", "negocio.html"]:
    t = todos.get(p, "")
    if re.search(r'class="(menu-card|bw-tool-card)"[^>]*>(?!<span class="ico">)', t):
        problemas.append(f"{p}: botão de acesso fora do padrão (galeria: ícone + PALAVRA-CHAVE, sem texto pequeno)")
    if '<span class="desc">' in t:
        problemas.append(f"{p}: botão de acesso com descrição (texto pequeno) — o dono pediu só a palavra-chave")
# 7.7b segurança para o público (14/11): documentos privados, galeria por token, itens de admin escondidos
for p, t in todos.items():
    if re.search(r'from\("eventos-midia"\)\.upload\([^)]*', t) and re.search(r'/(comprovantes|contratos|nfe)/', t):
        for m in re.finditer(r'const cp = [^\n]*/(comprovantes|contratos|nfe)/[^\n]*\n[^\n]*from\("([a-z-]+)"\)\.upload', t):
            if m.group(2) != "eventos-docs":
                problemas.append(f"{p}: {m.group(1)} enviado para bucket público ({m.group(2)}) — documentos vão para eventos-docs (privado)")
    if "?galeria=\" + e.id" in t or '"?galeria=" + e.id' in t:
        problemas.append(f"{p}: galeria por número do evento (adivinhável) — use o link secreto bw_galerias (?g=TOKEN)")
    for m in re.finditer(r'<a [^>]*href="financeiro-painel\.html"[^>]*>', t):
        if "so-admin" in m.group(0):
            problemas.append(f"{p}: PAINEL FINANCEIRO escondido com so-admin — ele é de todas as contas desde 14/11")
    for alvo in ["configadm.html"]:
        for m in re.finditer(r'<a [^>]*href="' + re.escape(alvo) + r'"[^>]*>', t):
            if "so-admin" not in m.group(0):
                problemas.append(f"{p}: link para {alvo} sem 'so-admin' (aparece para usuários comuns)")
if "urlSegura" not in sync:
    problemas.append("assets/bw-sync.js: sem urlSegura (documentos privados não abrem)")
if "html:not(.bw-admin) .so-admin" not in css:
    problemas.append("assets/brightway.css: sem a regra que esconde itens de admin")
# 7.7c planilha só entra pelo PAINEL FINANCEIRO (regra do dono, 14/11); recs.html = carteira de investimentos (decisão pendente)
for p, t in todos.items():
    if p in ("financeiro-painel.html", "recs.html"):
        continue
    tela = re.sub(r"<script[\s\S]*?</script>", "", t)   # só o que aparece na tela (o código embutido sem caixa não aparece)
    if re.search(r'type="file"[^>]*accept="[^"]*(csv|xlsx|xls)', tela) or re.search(r'accept="[^"]*(csv|xlsx)[^"]*"[^>]*type="file"', tela) or "Importar CSV" in t:
        problemas.append(f"{p}: envio de planilha fora do PAINEL FINANCEIRO (regra: só o painel recebe planilha)")
    for caixa in ("orcPlanilha", "negPlanilha", "eqPlanilhaBox", "orcSync", "ctSync", "rsSync", "negSync"):
        if f'id="{caixa}"' in t:
            problemas.append(f"{p}: caixa #{caixa} voltou (planilha/sincronizar manual — removida em 14/11)")

fp = todos.get("financeiro-painel.html", "")
if fp:
    for trecho, msg in [('ler("neg_fluxo")', "não lê os lançamentos da plataforma (neg_fluxo)"),
                        ('data-acao="baixar"', "sem BAIXAR PLANILHA"), ('data-acao="enviar"', "sem ENVIAR PLANILHA"),
                        ("BWSync.antesDeSalvar(\"neg_fluxo\", 1, lista)", "ENVIAR PLANILHA grava sem avisar o BWSync (3 argumentos)"),
                        ('o.fonte !== "pendente"', "conta cachês ainda não pagos como gasto realizado")]:
        if trecho not in fp:
            problemas.append("financeiro-painel.html: " + msg)
lgx = todos.get("login.html", "")
if lgx and ("bw_excluir_minha_conta" not in lgx or "lExportar" not in lgx):
    problemas.append("login.html: sem 'Baixar meus dados' / 'Excluir minha conta' (LGPD)")

# 7.8 páginas públicas obrigatórias
for p in ["baixar.html", "privacidade.html", "termos.html", "financeiro-painel.html"]:
    if p not in todos:
        problemas.append(f"{p} sumiu (link de instalação / política exigida pelo Google / painel financeiro)")
# 7.9 páginas com o visual novo (menu lateral) — exceto as de propósito
SEM_MENU = {"login.html", "cadastro.html", "baixar.html", "privacidade.html", "termos.html", "financeiro-painel.html", "casa.html", "app.html", "financeiro.html"}
for p, t in todos.items():
    if p not in SEM_MENU and "assets/layout.js" not in t:
        problemas.append(f"{p}: sem o visual novo (não carrega assets/layout.js)")

# relatório
print("VIGIA DO BRIGHTWAY")
print(f"{len(PAGINAS)} páginas conferidas.")
for a in avisos:
    print("⚠️  " + a)
if problemas:
    print(f"\n❌ {len(problemas)} problema(s):")
    for x in problemas:
        print(" - " + x)
    with open(os.environ.get("VIGIA_SAIDA", "/tmp/vigia.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join("- " + x for x in problemas))
    sys.exit(1)
print("✅ Tudo certo.")
