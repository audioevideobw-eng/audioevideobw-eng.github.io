#!/usr/bin/env python3
"""Telas do manual: página principal do robô, MINHA EMPRESA, MINHA CASA, Lançamentos PJ/PF, Painel PJ/PF e MODOS (20/11/2026).
Uso (na raiz): python3 docs/manual/telas_ambientes.py — usa o servidor, os stubs e a "Produtora Exemplo" do telas.py."""
import os, sys
AQUI = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, AQUI)
import telas as T
from playwright.sync_api import sync_playwright

CASA = {"casa_orcamento": [{"id": 1, "c0": "Salário", "c1": "Receita", "c2": "6500", "c3": T.D(-10), "c4": "Fixo"}, {"id": 2, "c0": "Mercado", "c1": "Despesa", "c2": "820", "c3": T.D(-4), "c4": "Alimentação"},
                           {"id": 3, "c0": "Farmácia", "c1": "Despesa", "c2": "140", "c3": T.D(-2), "c4": "Saúde"}],
        "casa_reserva": [{"id": 1, "c0": T.D(-8), "c1": "500", "c2": "Reserva do mês"}]}
ALVOS = [  # (arquivo, página, largura, altura, modo, recorte css)
    ("inicio-portal.png", "index.html", 1280, 860, "dark", "#ambPortal"),
    ("inicio-portal-celular.png", "index.html", 390, 844, "dark", None),
    ("amb-empresa.png", "negocio.html", 1280, 900, "dark", None),
    ("amb-casa.png", "casa.html", 1280, 900, "dark", None),
    ("lancamentos-pj.png", "lancamentos.html?a=pj", 1280, 900, "dark", None),
    ("painel-pf.png", "financeiro-painel.html?a=pf", 1280, 900, "dark", None),
    ("config-modos.png", "config.html", 1280, 1500, "dark", "#cfgAparencia"),
    ("modo-pretodourado.png", "negocio.html", 1280, 800, "pretodourado", None),
    ("modo-verdebranco.png", "negocio.html", 1280, 800, "verdebranco", None),
    ("modo-futurista.png", "index.html", 1280, 800, "futurista", None),
]

def main():
    srv = T.servidor()
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--no-sandbox", "--lang=pt-BR"])
        for nome, pagina, w, h, modo, recorte in ALVOS:
            c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 500 else 1.5, service_workers="block")
            pg = c.new_page(); pg.route("**/*", T.rota)
            pg.goto(f"http://127.0.0.1:{T.PORTA}/termos.html")
            pg.evaluate("([s, m]) => { localStorage.clear(); for (const k in s) localStorage.setItem('bw_' + k + '_v1', JSON.stringify(s[k])); localStorage.setItem('ui_modo', JSON.stringify(m)); sessionStorage.setItem('bwsync_aviso','1'); }", [dict(T.SEED, **CASA), modo])
            pg.goto(f"http://127.0.0.1:{T.PORTA}/{pagina}"); pg.wait_for_timeout(2400)
            alvo = os.path.join(T.SAIDA, nome)
            if recorte: pg.locator(recorte).screenshot(path=alvo)
            else: pg.screenshot(path=alvo)
            print("✓", nome); c.close()
        b.close()
    srv.shutdown()

if __name__ == "__main__":
    main()
