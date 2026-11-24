#!/usr/bin/env python3
"""Publica uma versão nova do aplicativo BW (o do PC) para a ATUALIZAÇÃO automática (19/11/2026, Claude).

Uso (na raiz do site):
  python3 docs/automacoes/publicar-app.py --pacote /home/claude/pacote/bw-reels-studio --novidades novidades.json

- A versão é lida de motor/app.mjs (export const VERSAO = 'x.y') — suba ela ANTES.
- novidades.json = [{"titulo": "…", "texto": "…", "abrir": "fotos"}]  (abrir = id de ferramenta do app, opcional)
- Gera downloads/BW-Reels-Studio.zip (o pacote; também é o .zip do ⚙ MOTOR NO PC) e downloads/app-versao.json com o sha256.
- O app só instala quando a pessoa toca em ATUALIZAR, confere o sha256 e nunca mexe em projetos/ nem node_modules/.
"""
import argparse, datetime, hashlib, json, os, re, sys, zipfile

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FORA = {"CHAVE-ANDROID", "node_modules", "programa", "instalador", "site-offline", ".git", "atualizacao"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pacote", required=True, help="pasta bw-reels-studio limpa")
    ap.add_argument("--novidades", required=True, help="arquivo JSON com a lista do que mudou")
    a = ap.parse_args()
    app = open(os.path.join(a.pacote, "motor", "app.mjs"), encoding="utf-8").read()
    m = re.search(r"export const VERSAO = '([\d.]+)'", app)
    if not m:
        sys.exit("não achei VERSAO em motor/app.mjs")
    versao = m.group(1)
    novidades = json.load(open(a.novidades, encoding="utf-8"))
    assert isinstance(novidades, list) and all(n.get("titulo") for n in novidades), "novidades: lista de {titulo, texto, abrir}"

    zp = os.path.join(RAIZ, "downloads", "BW-Reels-Studio.zip")
    nome_raiz = os.path.basename(os.path.abspath(a.pacote))
    with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
        for r, ds, fs in os.walk(a.pacote):
            rel = os.path.relpath(r, a.pacote)
            topo = rel.split(os.sep)[0]
            if topo in FORA:
                ds[:] = []
                continue
            if topo == "projetos" and rel != "projetos" and not rel.split(os.sep)[1].startswith("exemplo-"):
                ds[:] = []
                continue
            for f in sorted(fs):
                if f.endswith(".lnk") or f == ".mcp.json":
                    continue
                p = os.path.join(r, f)
                z.write(p, os.path.join(nome_raiz, os.path.relpath(p, a.pacote)))
    dados = open(zp, "rb").read()
    info = {
        "versao": versao,
        "data": datetime.date.today().strftime("%d/%m/%Y"),
        "pacote": "downloads/BW-Reels-Studio.zip",
        "sha256": hashlib.sha256(dados).hexdigest(),
        "bytes": len(dados),
        "novidades": novidades,
    }
    json.dump(info, open(os.path.join(RAIZ, "downloads", "app-versao.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"✓ versão {versao} · {len(dados) / 1e6:.1f} MB · sha256 {info['sha256'][:12]}… · {len(novidades)} novidade(s)")


if __name__ == "__main__":
    main()
