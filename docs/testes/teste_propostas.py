#!/usr/bin/env python3
"""Teste local (16/11): GERADOR DE ORÇAMENTO (propostas.html + assets/propostas.js).
Botões, soma, valor detalhado, salvar automático, prévia, PDF (definição do pdfMake), Word (docx de verdade), Pix (CRC conferido),
situação → evento → recibo → recebido no evento, importar os .docx reais (logo + empresa), salvar como botão, excluir, ?lead=, 1280 e 390 px.
Uso (na raiz):  python3 docs/testes/teste_propostas.py   [pasta com .docx, padrão /mnt/user-data/uploads]"""
import glob, http.server, json, os, socketserver, sys, threading, zipfile, io
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8824
DOCX_DIR = sys.argv[1] if len(sys.argv) > 1 else "/mnt/user-data/uploads"
NM = "/opt/npm-tools/node_modules/"
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
STUB_PDFMAKE = """window.__defs=[];window.pdfMake={vfs:{},createPdf:function(d){window.__defs.push(d);return {getBuffer(cb){cb(new Uint8Array([37,80,68,70,45,49,46,55]))}}}};"""
STUB_QR = """window.qrcode=function(){let t='';return {addData(x){t=x},make(){},getModuleCount(){return 33},isDark(r,c){return (r*c+t.length)%3===0}}};"""

def crc16(s):
    c = 0xFFFF
    for ch in s.encode():
        c ^= ch << 8
        for _ in range(8): c = ((c << 1) ^ 0x1021) if c & 0x8000 else (c << 1)
        c &= 0xFFFF
    return f"{c:04X}"
def tlv(s):
    out, i = {}, 0
    while i < len(s): k, n = s[i:i+2], int(s[i+2:i+4]); out[k] = s[i+4:i+4+n]; i += 4 + n
    return out

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u: return r.fulfill(body=STUB_PDFMAKE, content_type="application/javascript")
    if "vfs_fonts" in u: return r.fulfill(body="", content_type="application/javascript")
    if "qrcode" in u: return r.fulfill(body=STUB_QR, content_type="application/javascript")
    if "jszip" in u: return r.fulfill(path=NM + "jszip/dist/jszip.min.js", content_type="application/javascript")
    if "docx@" in u: return r.fulfill(path=NM + "docx/dist/index.iife.js", content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
LEAD = [{"id": 9001, "nome": "Carla Teste", "empresa": "Empresa Teste", "tel": "(31) 98888-0000", "email": "carla@ex.com", "etapa": "conversa",
         "servico": "Videomaker", "dataEvento": "2099-03-10", "local": "Teatro Teste", "valor": ""}]
semente = "localStorage.setItem('bw_mkt_leads_v1', %s);" % json.dumps(json.dumps(LEAD))
docxs = sorted(glob.glob(os.path.join(DOCX_DIR, "*.docx")))

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, service_workers="block", accept_downloads=True)
        ctx.route("**/*", rota); ctx.add_init_script("if(!sessionStorage.getItem('sem')){" + semente + "sessionStorage.setItem('sem','1')}")
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        respostas = []
        def dlg(d):
            respostas.append(d.message)
            if d.type == "prompt": d.accept("TESTE BOTAO")
            else: d.accept()
        pg.on("dialog", dlg)
        L = lambda k: pg.evaluate(f"JSON.parse(localStorage.getItem('bw_{k}_v1')||'[]')")
        pg.goto(BASE + "propostas.html"); pg.wait_for_timeout(700)
        ok(pg.is_visible("#lista") and "Nenhum orçamento" in pg.inner_text("#lista"), "lista vazia com explicação")
        ok("MINHA EMPRESA" in pg.inner_text("#avisoEmpresa"), "aviso de primeiro passo (empresa)")
        ok(pg.locator("#kpis .pr-kpi").count() == 0 and not pg.is_visible("#kpis"), "sem valores financeiros no topo (decisão do dono 16/11)")
        # novo + botões
        pg.click("#btnNovo"); pg.wait_for_timeout(200)
        ok(pg.locator(".pr-bt").count() == 7, "7 botões padrão")
        pg.click(".pr-bt >> text=VIDEOMAKER / AFTERMOVIE"); pg.wait_for_timeout(250)
        d = pg.evaluate("__prop.DOC()")
        ok(len(d["escopo"]) == 3 and len(d["equip"]) == 5 and pg.evaluate("__prop.total(__prop.DOC())") == 1950, "botão VIDEOMAKER preenche escopo, equipamentos e R$ 1.950")
        pg.click(".pr-bt >> text=FOTOGRAFIA CORPORATIVA"); pg.wait_for_timeout(250)
        ok(pg.evaluate("__prop.total(__prop.DOC())") == 2820 and "01 fotógrafo" in pg.evaluate("__prop.DOC().equipe"), "segundo botão SOMA (R$ 2.820, fotógrafo na equipe)")
        pg.fill('[data-k="cliente.nome"]', "André Teste"); pg.fill('[data-k="cliente.empresa"]', "Arte Teste")
        pg.fill('[data-k="datas.ini"]', "2099-11-18"); pg.fill('[data-k="datas.fim"]', "2099-11-20"); pg.fill('[data-k="datas.local"]', "Expominas Teste")
        pg.wait_for_timeout(900)
        l = L("neg_propostas")
        ok(len(l) == 1 and l[0]["numero"].startswith("ORC-") and l[0]["numero"].endswith("-001"), "salvou sozinho com número ORC-AAAA-001")
        ok(l and l[0]["cliente"]["empresa"] == "Arte Teste", "cliente salvo")
        if larg >= 1100:
            prev = pg.inner_text("#folhaEsc").replace("\xa0", " ")
            ok("Ao, André Teste" not in prev and "A, André Teste (Arte Teste)" in prev and "18 a 20/11/2099" in prev and "R$ 2.820,00" in prev, "prévia ao vivo: cliente, período e valor")
        else:
            ok(not pg.is_visible("#folhaCx"), "celular: prévia lateral escondida")
            pg.click('[data-a="verPrevia"]'); pg.wait_for_timeout(200)
            ok("R$ 2.820,00" in pg.inner_text("#modalCx").replace("\xa0", " "), "celular: 👁 PRÉVIA abre a folha")
            pg.click('#modalCx [data-a="fecharModal"]')
        # sugestões, itens
        n0 = len(pg.evaluate("__prop.DOC().obs")); pg.click('[data-a="opcoes"][data-l="obs"]'); pg.wait_for_timeout(200); pg.click('#modal .pr-opc-it:not(.on) >> nth=0'); pg.wait_for_timeout(150); pg.click('#modal .bw-btn[data-a="fecharModal"]'); pg.wait_for_timeout(150)
        ok(len(pg.evaluate("__prop.DOC().obs")) == n0 + 1, "chip de sugestão adiciona observação")
        pg.click('[data-a="modo"][data-v="itens"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate("__prop.total(__prop.DOC())") == 2820, "modo DETALHADO mantém o total")
        pg.click('[data-a="addItem"]'); pg.wait_for_timeout(100)
        pg.fill('[data-it="desc"][data-i="1"]', "Diária extra"); pg.fill('[data-it="qtd"][data-i="1"]', "2"); pg.fill('[data-it="unit"][data-i="1"]', "500")
        pg.fill('[data-k="valor.desc"]', "10%"); pg.wait_for_timeout(200)
        ok(abs(pg.evaluate("__prop.total(__prop.DOC())") - (2820 + 1000) * 0.9) < 0.01, "itens + desconto 10% = R$ 3.438")
        ok("3.438,00" in pg.inner_text("#totalTxt"), "TOTAL na tela atualizado")
        # empresa + pix
        pg.click('[data-a="voltar"]'); pg.wait_for_timeout(200)
        pg.click("#btnEmpresa"); pg.wait_for_timeout(150)
        for k, v in {"fantasia": "Produtora Exemplo", "razao": "Produtora Exemplo Ltda", "cnpj": "12.345.678/0001-90", "resp": "Fulano Teste", "tel": "(31) 90000-0000", "cidade": "Belo Horizonte", "pix": "12.345.678/0001-90"}.items():
            pg.fill(f'[data-emp="{k}"]', v)
        ok(all(pg.evaluate("getComputedStyle(document.querySelector('[data-emp=fantasia]')).fontSize") == "16px" for _ in [0]), "campos com letra 16 px (iPhone não amplia)")
        pg.click('[data-a="fecharEmpresa"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate("__prop.empresa().cnpj") == "12.345.678/0001-90" and pg.inner_text("#avisoEmpresa").strip() == "", "MINHA EMPRESA salva e aviso some")
        pg.click('#lista [data-a="abrir"]'); pg.wait_for_timeout(250)
        pg.check('[data-k="pix"]'); pg.wait_for_timeout(200)
        pix = pg.evaluate("__prop.modelo(__prop.DOC()).pix")
        t = tlv(pix[:-4] + "0000") if pix else {}
        ok(bool(pix) and crc16(pix[:-4]) == pix[-4:], "Pix: CRC16 confere")
        ok(t.get("54") == "3438.00" and "12345678000190" in t.get("26", "") and t.get("53") == "986" and t.get("59") == "PRODUTORA EXEMPLO LTDA", "Pix: valor, chave CNPJ, moeda e nome certos")
        # PDF e Word
        pg.click('[data-a="pdfEd"]'); pg.wait_for_timeout(600)
        defs = pg.evaluate("JSON.stringify(window.__defs||[])").replace("\xa0", " ")
        ok("ANDRÉ TESTE" not in defs and "André Teste" in defs and "R$ 3.438,00" in defs and "PAGUE COM PIX" in defs and "De acordo" in defs, "PDF: cliente, valor, Pix e aceite na definição")
        ok("Produtora Exemplo" in defs and "12.345.678/0001-90" in defs, "PDF: cabeçalho e rodapé com a empresa")
        with pg.expect_download() as dw: pg.click('[data-a="word"]')
        caminho = dw.value.path(); nomeW = dw.value.suggested_filename
        zx = zipfile.ZipFile(caminho).read("word/document.xml").decode()
        ok(nomeW.endswith(".docx") and "André Teste" in zx and "3.438,00" in zx and "Expominas Teste" in zx, "Word (.docx) de verdade com cliente, valor e local")
        # situação → evento → recibo
        pg.click('[data-a="stEd"][data-v="enviado"]'); pg.wait_for_timeout(200)
        pg.click('[data-a="stEd"][data-v="aprovado"]'); pg.wait_for_timeout(300)
        ok(pg.is_visible("#modal") and "aprovado" in pg.inner_text("#modalCx"), "aprovado → oferece próximos passos")
        pg.click('#modalCx [data-a="evento"]'); pg.wait_for_timeout(200)
        evs = L("neg_eventos")
        ok(len(evs) == 1 and evs[0]["data"] == "2099-11-18" and evs[0]["contratado"] == "3438" and evs[0]["status"] == "Confirmado", "CRIAR EVENTO: data, valor contratado e Confirmado")
        ok(any(c["nome"] == "Arte Teste" for c in L("neg_clientes")), "cliente criado em Clientes")
        pg.click('[data-a="reciboEd"]'); pg.wait_for_timeout(300)
        r = pg.evaluate("__prop.DOC()")
        ok(r["tipo"] == "recibo" and r["numero"].startswith("REC-") and float(r["recibo"]["valor"]) == 3438, "RECIBO com número REC- e o valor")
        ok("três mil quatrocentos e trinta e oito reais" in pg.inner_text("#form"), "valor por extenso")
        ok(pg.is_visible('[data-k="lancarEvento"]'), "opção lançar como recebido no evento")
        pg.click('[data-a="voltar"]'); pg.wait_for_timeout(250)
        ok(L("neg_eventos")[0].get("recebido") == "3438", "recibo lançou R$ 3.438 como recebido no evento")
        ok("R$" not in pg.inner_text("#kpis"), "topo continua sem valores")
        # salvar como botão, duplicar, excluir
        pg.click('#lista .pr-card:has(.st-aprovado) [data-a="abrir"]'); pg.wait_for_timeout(200)
        pg.click('[data-a="comoBotao"]'); pg.wait_for_timeout(200)
        bts = pg.evaluate("__prop.botoes().map(b=>b.nome)")
        ok("TESTE BOTAO" in bts and len(bts) == 8, "★ SALVAR COMO BOTÃO cria o 8º botão")
        pg.click('[data-a="voltar"]'); pg.wait_for_timeout(200)
        pg.click('#lista .pr-card:has(.st-aprovado) [data-a="duplicar"]'); pg.wait_for_timeout(300)
        dp = pg.evaluate("__prop.DOC()")
        ok(dp["status"] == "rascunho" and dp["numero"].endswith("-002") and not dp["eventoId"], "DUPLICAR vira rascunho novo (sem evento)")
        pg.click('[data-a="excluirEd"]'); pg.wait_for_timeout(200)
        ok(any("Excluir" in m for m in respostas) and len([x for x in L("neg_propostas") if x["tipo"] == "proposta"]) == 1, "EXCLUIR pede confirmação e apaga")
        # importar .docx reais
        if docxs:
            pg.evaluate("__prop.salvarCfg('empresa', {}); __prop.salvarCfg('logo','')")
            pg.set_input_files("#arqDocx", docxs); pg.wait_for_timeout(2500)
            imp = [x for x in L("neg_propostas") if x.get("importado")]
            ok(len(imp) == len(docxs), f"importou {len(imp)}/{len(docxs)} orçamentos .docx")
            ok(pg.evaluate("__prop.empresa().cnpj") == "48.606.212/0001-43" and pg.evaluate("__prop.cfg('logo','').slice(0,11)") == "data:image/", "logo e CNPJ copiados do arquivo")
            mm = [x for x in imp if "MART" in x["importado"]]
            ok(mm and mm[0]["valor"]["total"] == 8500 and mm[0]["datas"]["ini"] == "2026-11-18" and mm[0]["cliente"]["empresa"] == "ARTE EVENTOS", "Mart Minas: R$ 8.500, 18/11, Arte Eventos")
        # ?lead= vindo do FUNIL
        pg.goto(BASE + "propostas.html?lead=9001"); pg.wait_for_timeout(600)
        dl = pg.evaluate("__prop.DOC()")
        ok(dl and dl["cliente"]["nome"] == "Carla Teste" and dl["datas"]["ini"] == "2099-03-10" and len(dl["escopo"]) >= 3, "?lead= abre orçamento com o contato e o botão do serviço")
        pg.fill('[data-k="datas.local"]', "Teatro Teste 2"); pg.wait_for_timeout(900)
        pg.click('[data-a="stEd"][data-v="enviado"]'); pg.wait_for_timeout(200)
        ok(L("mkt_leads")[0]["etapa"] == "proposta", "enviado → contato do FUNIL vai para Proposta")
        # estouro lateral
        larguras = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(larguras <= 0, f"editor sem estouro lateral ({larguras})")
        pg.click('[data-a="voltar"]'); pg.wait_for_timeout(200)
        ok(pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "lista sem estouro lateral")
        ids = pg.evaluate("(()=>{const a=[...document.querySelectorAll('[id]')].map(e=>e.id);return a.filter((x,i)=>a.indexOf(x)!==i)})()")
        ok(not ids, f"sem id repetido {ids}")
        ok(not erros, f"0 erros de JS {erros[:2]}")
        ctx.close()
    nav.close()
srv.shutdown()
ok("propostas.html?lead=" in open(os.path.join(RAIZ, "captacao.html")).read(), "FUNIL: botão 📄 ORÇAMENTO na ficha")
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
sys.exit(1 if falhas else 0)
