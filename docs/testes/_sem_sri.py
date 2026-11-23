"""Testes locais: tira o selo de integridade (integrity="sha384-…") das páginas servidas pelo servidor de TESTE.

Por quê (23/11/2026): as bibliotecas do CDN ganharam selo de integridade (SRI) nas páginas. Os testes trocam algumas delas
por versões de mentira (Supabase simulado, pdfMake que devolve um PDF pronto…) e o navegador RECUSA arquivo cujo conteúdo
não bate com o selo. Este módulo é importado no começo de cada teste e só mexe no que o servidor LOCAL (127.0.0.1) entrega;
o site no ar continua com o selo. Uso: `import _sem_sri  # noqa` antes de criar o servidor.
"""
import http.server
import io
import os
import re

_SELO = re.compile(rb'\s+integrity="sha(?:256|384|512)-[^"]+"')
_original = http.server.SimpleHTTPRequestHandler.send_head


def _send_head(self):
    caminho = self.translate_path(self.path)
    if os.path.isdir(caminho) and self.path.split("?")[0].endswith("/") and os.path.isfile(os.path.join(caminho, "index.html")):
        caminho = os.path.join(caminho, "index.html")
    if os.path.isdir(caminho) or not caminho.endswith(".html") or not os.path.isfile(caminho):
        return _original(self)
    with open(caminho, "rb") as f:
        corpo = _SELO.sub(b"", f.read())
    self.send_response(200)
    self.send_header("Content-type", "text/html; charset=utf-8")
    self.send_header("Content-Length", str(len(corpo)))
    self.end_headers()
    return io.BytesIO(corpo)


http.server.SimpleHTTPRequestHandler.send_head = _send_head
