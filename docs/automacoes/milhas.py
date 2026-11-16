#!/usr/bin/env python3
"""Publica milhas.json a partir das cotações lançadas pelo ADM (tabela public.bw_milhas_ref). 16/11/2026, Claude.
Uso: python3 docs/automacoes/milhas.py milhas.json   — só reescreve o arquivo se a tabela tiver dados mais novos."""
import datetime, json, sys, urllib.request, zoneinfo

SB = "https://zdtnetplvdonogmdvarx.supabase.co"
KEY = "sb_publishable_qJ2mIx1hcn_ZH75-yxJiDA_OI-EHyIU"   # chave pública (a mesma do site); a tabela é só leitura para o público
saida = sys.argv[1] if len(sys.argv) > 1 else "milhas.json"
req = urllib.request.Request(SB + "/rest/v1/bw_milhas_ref?id=eq.atual&select=dados,atualizado", headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
linhas = json.load(urllib.request.urlopen(req, timeout=30))
if not linhas:
    print("sem cotações lançadas pelo ADM — milhas.json fica como está"); sys.exit(0)
d, quando = linhas[0]["dados"], linhas[0]["atualizado"]
progs = d.get("programs") or []
if not progs or not all(p.get("buyers") for p in progs):
    print("dados incompletos — nada publicado"); sys.exit(0)
for p in progs:   # melhor preço e média calculados aqui (o ADM só lança os compradores)
    bs = [b for b in p["buyers"] if float(b.get("price") or 0) > 0]
    bs.sort(key=lambda b: -float(b["price"]))
    p["buyers"] = bs
    p["best"] = round(float(bs[0]["price"]), 2); p["bestBuyer"] = bs[0]["buyer"]
    p["avg"] = round(sum(float(b["price"]) for b in bs) / len(bs), 2)
hora = datetime.datetime.fromisoformat(quando.replace("Z", "+00:00")).astimezone(zoneinfo.ZoneInfo("America/Sao_Paulo"))
novo = {"updated": hora.strftime("%d/%m/%Y, %H:%M"), "programs": progs, "rotas": d.get("rotas") or []}
try:
    antigo = json.load(open(saida, encoding="utf-8"))
except Exception:
    antigo = {}
if antigo == novo:
    print("sem mudança"); sys.exit(0)
open(saida, "w", encoding="utf-8").write(json.dumps(novo, ensure_ascii=False, separators=(",", ":")))
print("milhas.json atualizado:", novo["updated"], len(progs), "programas")
