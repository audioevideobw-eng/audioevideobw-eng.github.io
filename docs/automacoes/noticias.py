#!/usr/bin/env python3
"""Notícias de economia/mercado para a página NOTÍCIAS (15/11/2026, Claude).
Roda no GitHub Actions a cada 2 h (.github/workflows/noticias.yml). Lê vários RSS; os que falharem são
ignorados. Só grava noticias.json se conseguir pelo menos 5 manchetes (senão mantém o arquivo anterior)."""
import html, json, re, sys, urllib.request
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
import xml.etree.ElementTree as ET

FEEDS = [
    ("InfoMoney", "https://www.infomoney.com.br/feed/"),
    ("InfoMoney Mercados", "https://www.infomoney.com.br/mercados/feed/"),
    ("Agência Brasil", "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml"),
    ("g1 Economia", "https://g1.globo.com/rss/g1/economia/"),
    ("Valor Finanças", "https://pox.globo.com/rss/valor/financas"),
    ("Valor Economia", "https://pox.globo.com/rss/valor/brasil"),
    ("Poder360 Economia", "https://www.poder360.com.br/economia/feed/"),
]
SP = timezone(timedelta(hours=-3))
UA = {"User-Agent": "Mozilla/5.0 (Brightway noticias; +https://audioevideobw-eng.github.io)"}

def limpar(t):
    t = re.sub(r"<[^>]+>", " ", html.unescape(t or ""))
    return re.sub(r"\s+", " ", t).strip()

def ler(nome, url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=25) as r:
        raiz = ET.fromstring(r.read())
    itens = []
    for it in raiz.iter("item"):
        t = limpar(it.findtext("title")); l = (it.findtext("link") or "").strip()
        d = limpar(it.findtext("description"))[:240]; dt = (it.findtext("pubDate") or "").strip()
        if not t or not l.startswith("http"):
            continue
        try:
            quando = parsedate_to_datetime(dt)
            if quando.tzinfo is None:
                quando = quando.replace(tzinfo=timezone.utc)
        except Exception:
            quando = None
        itens.append({"t": t, "l": l, "d": d, "dt": dt, "f": nome, "_q": quando})
    return itens

def main(saida):
    todas, fontes = [], []
    for nome, url in FEEDS:
        try:
            itens = ler(nome, url)
            if itens:
                todas += itens; fontes.append(nome)
            print(f"ok   {nome}: {len(itens)}")
        except Exception as e:
            print(f"falha {nome}: {e}")
    agora = datetime.now(timezone.utc)
    recentes = [n for n in todas if n["_q"] and agora - n["_q"] < timedelta(days=3)]
    vistos, final = set(), []
    for n in sorted(recentes, key=lambda n: n["_q"], reverse=True):
        k = re.sub(r"\W+", "", n["t"].lower())[:60]
        if k in vistos:
            continue
        vistos.add(k)
        n["dt"] = n["_q"].astimezone(SP).strftime("%d/%m %H:%M")
        n.pop("_q"); final.append(n)
        if len(final) >= 30:
            break
    if len(final) < 5:
        print("Poucas notícias — mantendo o arquivo anterior."); return 0
    dados = {"atualizado": datetime.now(SP).strftime("%d/%m/%Y %H:%M"), "fontes": sorted(set(n["f"] for n in final)), "noticias": final}
    with open(saida, "w", encoding="utf-8") as f:
        json.dump(dados, f, ensure_ascii=False, separators=(",", ":"))
    print(f"gravadas {len(final)} notícias de {dados['fontes']}")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "noticias.json"))
