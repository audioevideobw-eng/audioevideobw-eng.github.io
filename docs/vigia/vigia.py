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
for h in ["eventos.html", "evento.html", "equipe.html", "financeiro.html", "fluxo.html", "preco.html", "leitor.html", "financeiro-painel.html"]:
    if f'class="menu-card" href="{h}"' not in neg:
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
