#!/usr/bin/env python3
"""SEGURANÇA DAS PÁGINAS (23/11/2026, Claude — análise de segurança pedida pelo dono).

Um lugar só para duas proteções que valem em TODA página do site:
  1. CSP (Content-Security-Policy, <meta> logo depois do charset): diz ao navegador de onde a página pode carregar
     script e para onde pode mandar dados. Mesmo se um dia entrar código malicioso (PDF preparado, texto injetado),
     ele não consegue mandar a sessão/dados para um servidor de fora (connect-src), não carrega script de outro
     domínio (script-src), não usa plugin (object-src) nem troca a base dos links (base-uri).
  2. SRI (integrity="sha384-…") nas bibliotecas do CDN com VERSÃO FIXA: se o arquivo do CDN mudar, o navegador recusa.

Endereço NOVO que o site passe a usar (API, CDN, modelo de IA) → entra na lista ORIGENS abaixo e roda de novo:
    python3 docs/automacoes/seguranca-paginas.py
Biblioteca nova do CDN → versão exata (nunca @2, @latest) + selo em SRI (sha384 do arquivo do npm; conferir que o CDN
entrega o MESMO arquivo). O vigia (7.9) recusa página sem CSP e <script> do CDN sem selo.
Testes locais: docs/testes/_sem_sri.py tira o selo SÓ no servidor de teste (as bibliotecas lá são simuladas).
"""
import os
import re
import sys

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SUPA = "zdtnetplvdonogmdvarx.supabase.co"

# de onde vêm os dados que as ferramentas buscam (fetch / WebSocket / modelos de IA no aparelho)
ORIGENS_DADOS = [
    f"https://{SUPA}", f"wss://{SUPA}",                    # banco, login, arquivos, Edge Functions (IA)
    "https://cdn.jsdelivr.net", "https://cdn.sheetjs.com",   # bibliotecas e os .wasm delas
    "https://open.er-api.com", "https://olinda.bcb.gov.br",  # câmbio (cotação e PTAX)
    "https://raw.githubusercontent.com",                     # milhas.json do repositório de câmbio
    "https://storage.googleapis.com",                        # modelos MediaPipe (rosto, mão, corpo, recorte)
    "https://huggingface.co", "https://*.huggingface.co", "https://*.hf.co",  # modelos do Transformers.js
    "https://tessdata.projectnaptha.com",                    # idioma do Tesseract (leitor de contas)
    "https://fonts.googleapis.com", "https://fonts.gstatic.com",
]

CSP = "; ".join([
    "default-src 'self'",
    # 'unsafe-inline': páginas usam onclick= e <script> no próprio HTML; 'unsafe-eval': TESTES E SOLUÇÕES (iframe.eval)
    # e bibliotecas antigas; 'wasm-unsafe-eval': IA no aparelho (MediaPipe, ONNX, Tesseract, ZXing)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://cdn.sheetjs.com",
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "connect-src 'self' data: blob: " + " ".join(ORIGENS_DADOS),
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "frame-src 'self' blob: data: https://docs.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
])
META = f'<meta http-equiv="Content-Security-Policy" content="{CSP}">'
RE_META = re.compile(r'<meta http-equiv="Content-Security-Policy"[^>]*>\n?')

# 3. REFERRER (25/11/2026, guia "100 pontos de segurança", ponto 57): link para fora leva só o endereço do site, nunca o
#    caminho com ?id=, ?g=TOKEN (galeria do cliente) ou ?t= (link de cadastro).
REF = '<meta name="referrer" content="strict-origin-when-cross-origin">'
RE_REF = re.compile(r'<meta name="referrer"[^>]*>\n?')

# 4. ANTI-MOLDURA (clickjacking, pontos 48/55): no GitHub Pages não dá para mandar o cabeçalho X-Frame-Options nem o
#    frame-ancestors (no <meta> o navegador IGNORA). Então: a página nasce escondida e só aparece se estiver sozinha na
#    aba OU dentro de um quadro do PRÓPRIO site (TESTES E SOLUÇÕES, prévias). Dentro de um site de fora fica em branco e
#    tenta abrir a aba inteira no endereço certo. Quadro com sandbox sem allow-same-origin também fica em branco.
ANTI = ('<style id="bwAntiMoldura">html{display:none!important}</style>'
        '<script>(function(){var ok=self===top;if(!ok){try{ok=top.location.origin===location.origin}catch(e){ok=false}}'
        'if(ok){var s=document.getElementById("bwAntiMoldura");if(s)s.parentNode.removeChild(s)}'
        'else{try{top.location.href=location.href}catch(e){}}})();</script>')
RE_ANTI = re.compile(r'<style id="bwAntiMoldura">.*?</script>\n?', re.S)


def aplicar(texto, anti=True):
    texto = RE_META.sub("", texto)
    texto = RE_REF.sub("", texto)
    texto = RE_ANTI.sub("", texto)
    bloco = META + "\n" + REF + "\n" + (ANTI + "\n" if anti else "")
    return re.sub(r'(<meta charset="utf-8">\n?)', lambda m: m.group(1).rstrip("\n") + "\n" + bloco, texto, count=1, flags=re.I)


def main():
    mudou = 0
    for nome in sorted(os.listdir(RAIZ)):
        if not nome.endswith(".html"):
            continue
        p = os.path.join(RAIZ, nome)
        t = open(p, encoding="utf8").read()
        n = aplicar(t)
        if META not in n:
            print("⚠ sem <meta charset=\"utf-8\">:", nome); continue
        if n != t:
            open(p, "w", encoding="utf8").write(n); mudou += 1
    # molde das páginas geradas (negocio.html / casa.html — regra 101)
    g = os.path.join(RAIZ, "docs", "automacoes", "gerar-ambientes.py")
    t = open(g, encoding="utf8").read(); n = aplicar(t)
    n = n.replace(ANTI, ANTI.replace("{", "{{").replace("}", "}}"))  # o molde usa .format(): chaves dobradas
    if n != t:
        open(g, "w", encoding="utf8").write(n); mudou += 1
    print(f"CSP, referrer e anti-moldura aplicados/atualizados em {mudou} arquivo(s).")


if __name__ == "__main__":
    sys.exit(main())
