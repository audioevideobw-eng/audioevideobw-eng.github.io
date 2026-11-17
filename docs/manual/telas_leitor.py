#!/usr/bin/env python3
"""Telas do manual (16/11): LEITOR DE CONTAS + AGENTE, com a empresa fictícia e uma conta de energia de exemplo.
Uso (na raiz): python3 docs/manual/telas_leitor.py  — usa as mesmas simulações do docs/testes/teste_agente_leitor.py."""
import os, sys
sys.argv = [sys.argv[0]]
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "docs", "testes"))
import importlib.util
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location("t", os.path.join(RAIZ, "docs", "testes", "teste_agente_leitor.py"))
src = open(spec.origin, encoding="utf-8").read().split("with sync_playwright() as p:")[0]
G = {"__file__": spec.origin}; exec(compile(src, spec.origin, "exec"), G)
SAIDA = os.path.join(RAIZ, "docs", "manual", "telas")
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    c = b.new_context(viewport={"width": 1280, "height": 900}, device_scale_factor=2, service_workers="block", locale="pt-BR")
    c.add_init_script(G["VOZ"]); c.route("**/*", G["rota"]); pg = c.new_page()
    pg.goto(G["BASE"] + "leitor.html"); pg.wait_for_timeout(1200)
    pg.evaluate("localStorage.setItem('bw_casa_contas_v1','[]')")
    pg.set_input_files("#ltArq", G["TMP"] + "/conta.pdf"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000); pg.wait_for_timeout(400)
    el = pg.locator("#ocrBox"); el.scroll_into_view_if_needed(); bb = el.bounding_box()
    pg.screenshot(path=os.path.join(SAIDA, "leitor-conta.png"), clip={"x": bb["x"] - 8, "y": max(0, bb["y"] - 8), "width": bb["width"] + 16, "height": min(bb["height"] + 16, 1500)}, full_page=True)
    pg.evaluate("window.__fala = 'lance o gasto de 30 reais nos gastos como lanche'")
    pg.click("#bwAgente"); pg.wait_for_selector(".bwg-ac [data-g=lancar]", timeout=8000); pg.wait_for_timeout(300)
    bb = pg.locator(".bwg-p").bounding_box(); fb = pg.locator("#bwAgente").bounding_box()
    pg.screenshot(path=os.path.join(SAIDA, "agente.png"), clip={"x": bb["x"] - 8, "y": bb["y"] - 8, "width": bb["width"] + 16, "height": fb["y"] + fb["height"] - bb["y"] + 16})
    b.close()
print("ok")
