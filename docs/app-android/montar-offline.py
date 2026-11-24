"""Monta a cópia SEM INTERNET do app Android (roda no GitHub Actions, antes do Gradle).
Copia o site (páginas, assets, icons, json) para android/app/src/main/assets/offline/site/ e baixa as bibliotecas
dos CDNs citadas nas páginas para .../offline/cdn/<host>/<caminho>. O app (BwClient.java) só usa essa cópia
quando o celular está SEM rede; com rede, tudo vem do site no ar. Criado por Claude em 24/11/2026."""
import os, re, shutil, sys, json, urllib.request
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "android", "app", "src", "main", "assets", "offline")
CDNS = ("cdn.jsdelivr.net", "cdn.sheetjs.com", "unpkg.com", "cdnjs.cloudflare.com")
RE = re.compile(r"https://(?:%s)/[^\s\"'`<>)\\]+" % "|".join(re.escape(h) for h in CDNS))
MAX_ARQ, MAX_TOTAL = 25 * 2**20, 120 * 2**20
shutil.rmtree(DEST, ignore_errors=True)
site = os.path.join(DEST, "site"); os.makedirs(site)
for n in os.listdir(RAIZ):
    p = os.path.join(RAIZ, n)
    if os.path.isfile(p) and (n.endswith((".html", ".json", ".js", ".txt")) and n != "sw.js"):
        shutil.copy2(p, os.path.join(site, n))
for d in ("assets", "icons"):
    shutil.copytree(os.path.join(RAIZ, d), os.path.join(site, d))
urls = set()
for base, _, arqs in os.walk(site):
    for a in arqs:
        if a.endswith((".html", ".js", ".css")):
            for u in RE.findall(open(os.path.join(base, a), encoding="utf-8", errors="ignore").read()):
                u = u.rstrip(".,;")
                if "${" in u or "{" in u or u.endswith("/"): continue
                urls.add(u)
import hashlib
total, ok, falhou, mapa = 0, 0, [], {}
for u in sorted(urls):
    try:
        req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 BW-Android-build"})
        dados = urllib.request.urlopen(req, timeout=60).read()
        if len(dados) > MAX_ARQ or total + len(dados) > MAX_TOTAL: falhou.append(u + " (grande)"); continue
        nome = hashlib.sha1(u.encode()).hexdigest()[:20]
        os.makedirs(os.path.join(DEST, "cdn"), exist_ok=True)
        open(os.path.join(DEST, "cdn", nome), "wb").write(dados); total += len(dados); ok += 1
        mapa[u.split("#", 1)[0]] = nome
    except Exception as e:
        falhou.append(f"{u} ({e.__class__.__name__})")
json.dump(mapa, open(os.path.join(DEST, "cdn.json"), "w"))
json.dump({"cdn": ok, "falhou": falhou}, open(os.path.join(DEST, "montagem.json"), "w"), ensure_ascii=False, indent=1)
tam = sum(os.path.getsize(os.path.join(b, a)) for b, _, aa in os.walk(DEST) for a in aa)
print(f"cópia sem internet: {tam/2**20:.1f} MB · {ok} bibliotecas de CDN · {len(falhou)} não baixadas")
for f in falhou[:40]: print("  -", f)
