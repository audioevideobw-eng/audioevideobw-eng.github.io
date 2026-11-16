#!/usr/bin/env python3
"""Junta os módulos CommonJS da biblioteca pública node-forge (github.com/digitalbazaar/forge, lib/*.js)
num único arquivo para o navegador, só para os testes locais sem internet (no site a biblioteca vem do CDN jsdelivr)."""
import json, os, sys

lib = sys.argv[1]
saida = sys.argv[2]
partes = ['(function(){var M={},C={};function R(n){n=n.replace(/^\\.\\//,"");if(n==="crypto")return null;'
          'if(C[n])return C[n].exports;var m={exports:{}};C[n]=m;M[n](m,m.exports,R);return m.exports;}']
for nome in sorted(os.listdir(lib)):
    if nome.endswith(".js"):
        codigo = open(os.path.join(lib, nome), encoding="utf-8").read()
        partes.append("M[%s]=function(module,exports,require){\n%s\n};" % (json.dumps(nome[:-3]), codigo))
partes.append('window.forge=R("index");})();')
open(saida, "w", encoding="utf-8").write("\n".join(partes))
print("ok", saida)
