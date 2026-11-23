#!/usr/bin/env python3
"""Teste local (16/11): colaboradores e clientes com ✎ ALTERAR + CPF e CNH, PDF DA EQUIPE com os PDFs anexados juntos,
dossiê com anexos, cadastro público com CNH e MEUS DADOS (cartões, repetidos, alterar, excluir coleção).
Uso (na raiz):  python3 docs/testes/teste_cadastros.py   — servidor local + stubs (METODOS T1). pdfMake é simulado com pdf-lib
local (gera 1 página por relatório) para conferir que as páginas dos anexos entram no fim."""
import http.server, io, json, os, socketserver, sys, threading
from PIL import Image
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8816
PDFLIB = "/opt/npm-tools/node_modules/pdf-lib/dist/pdf-lib.min.js"
STUB_SB = """window.__ins=[];window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(o){window.__ins.push(o);return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]}),createSignedUrl:async()=>({data:{signedUrl:null}})}}}};}};"""
# pdfMake simulado: 1 página com o texto do relatório (guarda a definição para conferir)
STUB_PDFMAKE = """window.__defs=[];window.pdfMake={createPdf:function(d){window.__defs.push(d);return {download(){window.__baixouSimples=(window.__baixouSimples||0)+1},
getBuffer(cb){(async()=>{const L=window.PDFLib||await new Promise(r=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';s.onload=()=>r(window.PDFLib);document.head.appendChild(s)});
const doc=await L.PDFDocument.create();doc.addPage();cb(await doc.save());})()}}}};"""
def pdf_bytes(paginas):
    ims = [Image.new("RGB", (300, 400), (200, 200, 200 - i * 40)) for i in range(paginas)]
    b = io.BytesIO(); ims[0].save(b, "PDF", save_all=True, append_images=ims[1:]); return b.getvalue()
ANEXO = pdf_bytes(3)
SEED = {
    "neg_equipe_colaboradores": [{"id": 1, "nome": "Ana Teste", "funcao": "Câmera", "tel": "(31) 90000-0001", "email": "ana@ex.com"},
                                 {"id": 2, "nome": "Bruno Teste", "funcao": "Som", "tel": "(31) 90000-0002"}],
    "neg_equipe_equipes": [{"id": 10, "nome": "Equipe Teste", "membros": ["1", "2"],
                            "docs": [{"nome": "roteiro.pdf", "url": "https://anexos.test/roteiro.pdf"}, {"nome": "sumiu.pdf", "url": "https://anexos.test/404.pdf"}]}],
    "neg_eventos": [{"id": 500, "nome": "Evento Teste", "data": "2099-01-10", "equipeId": "10", "status": "Confirmado",
                     "contratoArq": {"nome": "contrato.pdf", "url": "https://anexos.test/contrato.pdf"}}],
    "neg_clientes": [{"id": 3, "nome": "Cliente Alfa", "cnpj": "00.000.000/0001-00", "tel": "(31) 3000-0000"}],
    "dd_colecoes": [{"id": 77, "nome": "EQUIPE DA BW", "campos": ["Nome", "Função", "Telefone"]}],
    "dd_registros": [{"id": 1001, "col": 77, "campos": {"Nome": "Ana Teste", "Função": "Câmera", "Telefone": "1"}, "criado": "2026-11-11T10:00"},
                     {"id": 1002, "col": 77, "campos": {"Nome": "Ana  teste", "Função": "câmera", "Telefone": "1"}, "criado": "2026-11-13T10:00"},
                     {"id": 1003, "col": 77, "campos": {"Nome": "Bruno Teste", "Função": "Som", "Telefone": "2"}, "criado": "2026-11-13T10:00"}],
}

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
    if "pdf-lib" in u: return r.fulfill(path=PDFLIB, content_type="application/javascript")
    if "anexos.test/404" in u: return r.fulfill(status=404, body="")
    if "anexos.test" in u: return r.fulfill(body=ANEXO, content_type="application/pdf")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
semente = "".join(f"localStorage.setItem('bw_{k}_v1', {json.dumps(json.dumps(v))});" for k, v in SEED.items()) + "localStorage.setItem('ui_colap', JSON.stringify({colabs:true,equipes:true,clientes:true}));"
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])
    for larg in (1280, 390):
        print(f"\n=== {larg}px ===")
        ctx = b.new_context(viewport={"width": larg, "height": 900}, service_workers="block", locale="pt-BR", accept_downloads=True)
        ctx.route("**/*", rota); ctx.add_init_script("if(!sessionStorage.getItem('sem')){" + semente + "sessionStorage.setItem('sem','1')}")
        pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept("CPF"))
        L = lambda k: pg.evaluate(f"JSON.parse(localStorage.getItem('bw_{k}_v1'))")
        # ---------- GESTÃO DE PESSOAS ----------
        pg.goto(BASE + "equipe.html"); pg.wait_for_timeout(1800)
        ok(not erros, f"equipe.html sem erro {erros[:2]}")
        btn = pg.locator('[data-colab-ed="2"]')
        ok(btn.is_visible() and btn.bounding_box()["x"] + btn.bounding_box()["width"] <= larg, "✎ ALTERAR visível junto do nome (sem rolar a tabela)")
        btn.click(); pg.wait_for_timeout(300)
        ok(pg.input_value("#cbNome") == "Bruno Teste" and "ALTERANDO" in pg.inner_text("#cbForm"), "ALTERAR preenche o formulário")
        pg.fill("#cbCPF", "12345678901"); pg.fill("#cbCNH", "98765432100"); pg.select_option("#cbCNHCat", "AB"); pg.fill("#cbCNHVal", "2030-05-20")
        pg.click("#cbAdd"); pg.wait_for_timeout(300)
        c2 = [c for c in L("neg_equipe_colaboradores") if c["id"] == 2][0]
        ok(c2["cpf"] == "123.456.789-01" and c2["cnh"] == "98765432100" and c2["cnhCat"] == "AB" and c2["cnhVal"] == "2030-05-20" and len(L("neg_equipe_colaboradores")) == 2,
           f"colaborador alterado (sem duplicar): CPF {c2.get('cpf')} CNH {c2.get('cnh')} {c2.get('cnhCat')}")
        ok("98765432100 (AB)" in pg.inner_text("#eqColabBox"), "CNH aparece na lista")
        pg.fill("#cbNome", "Carla Nova"); pg.fill("#cbCNH", "123"); pg.click("#cbAdd"); pg.wait_for_timeout(200)
        ok("CNH incompleta" in pg.inner_text("#cbMsg"), "CNH incompleta é recusada")
        pg.fill("#cbCNH", ""); pg.click("#cbAdd"); pg.wait_for_timeout(200)
        ok(len(L("neg_equipe_colaboradores")) == 3, "novo colaborador continua funcionando")
        pg.click('[data-colab-del="' + str([c for c in L("neg_equipe_colaboradores") if c["nome"] == "Carla Nova"][0]["id"]) + '"]'); pg.wait_for_timeout(200)
        ok(len(L("neg_equipe_colaboradores")) == 2, "excluir (com confirmação)")
        # PDF DA EQUIPE com anexos
        pg.click('[data-eqpdf="10"]'); pg.wait_for_function("window.__ultimoPDF", timeout=15000); pg.wait_for_timeout(300)
        u = pg.evaluate("window.__ultimoPDF")
        ok(u["paginas"] == 4 and u["anexados"] == 1 and len(u["falhas"]) == 1, f"PDF DA EQUIPE: 1 página do relatório + 3 do anexo; anexo quebrado avisado {u}")
        d = pg.evaluate("JSON.stringify(window.__defs[window.__defs.length-1])")
        ok("98765432100 (AB)" in d and "123.456.789-01" in d and "roteiro.pdf" in d, "PDF da equipe traz CPF, CNH e a lista de anexos")
        ok("sumiu.pdf" in pg.inner_text("#eqMsg"), f"aviso do anexo que não entrou: {pg.inner_text('#eqMsg')[:90]}")
        ok(not erros, f"sem erros {erros[:2]}")
        # ---------- EVENTOS: clientes + dossiê ----------
        pg.goto(BASE + "eventos.html"); pg.wait_for_timeout(1800)
        pg.click('[data-cli-edit="3"]'); pg.wait_for_timeout(300)
        ok(pg.input_value("#cNome") == "Cliente Alfa", "cliente: ALTERAR preenche o formulário")
        pg.fill("#cCPF", "11122233344"); pg.fill("#cCNH", "55566677788"); pg.select_option("#cCNHCat", "B"); pg.click("#cAdd"); pg.wait_for_timeout(300)
        cl = L("neg_clientes")
        ok(len(cl) == 1 and cl[0]["cpf"] == "111.222.333-44" and cl[0]["cnh"] == "55566677788" and cl[0]["cnhCat"] == "B", f"cliente alterado com CPF e CNH: {cl[0]}")
        pg.evaluate("window.__ultimoPDF=null; localStorage.setItem('ui_pdf_dossie', JSON.stringify(['equipe','documentos']))")
        pg.evaluate("document.querySelector('[data-ev=\"500\"], [onclick*=\"500\"]') && 0")
        pg.evaluate("window.__evPDF && 0")
        r = pg.evaluate("""(async()=>{ const S=new Set(['equipe','anexos']); const gid=500;
            const box=document.createElement('div'); box.id='dPdfOpcoes'; document.body.appendChild(box); return 1;})()""")
        pg.goto(BASE + "eventos.html?ev=500"); pg.wait_for_timeout(1200)
        has = pg.locator("#dPdfOpcoes").count()
        if has:
            pg.evaluate("document.querySelectorAll('button').forEach(b=>{if(/Dossi/i.test(b.textContent)&&/PDF/.test(b.textContent))b.click()})"); pg.wait_for_timeout(400)
        marcado = pg.evaluate("(document.querySelector('[data-sec=\"anexos\"]')||{}).checked")
        ok(marcado is True, "dossiê: item ANEXOS aparece e já vem marcado para quem usava 'documentos'")
        pg.evaluate("document.querySelector('#dPdfOpcoes [data-gerar]').click()")
        pg.wait_for_function("window.__ultimoPDF", timeout=15000); pg.wait_for_timeout(400)
        u = pg.evaluate("window.__ultimoPDF")
        ok(u["anexados"] == 2 and u["paginas"] == 7, f"dossiê: relatório + contrato + PDF da equipe juntos no fim {u}")
        ok("anexo" in pg.inner_text("#dPdfOpcoes") and not erros, f"mensagem final: {pg.inner_text('#dPdfOpcoes [data-msg]')[:100]} {erros[:2]}")
        # ---------- cadastro público ----------
        pg.goto(BASE + "cadastro.html?t=bwteste"); pg.wait_for_timeout(500)
        pg.fill("#fNome", "Davi Teste"); pg.fill("#fCPF", "12345678901"); pg.fill("#fCNH", "11111111111"); pg.select_option("#fCNHCat", "B"); pg.fill("#fCNHVal", "2031-01-01")
        pg.click("#fEnviar"); pg.wait_for_timeout(500)
        ins = pg.evaluate("window.__ins")
        ok(ins and json.loads(ins[0]["observacao"])["cnh"] == "11111111111" and ins[0]["cpf"] == "123.456.789-01", f"cadastro público envia CPF e CNH: {ins[:1]}")
        pg.goto(BASE + "cadastro.html?cliente=clteste"); pg.wait_for_timeout(500)
        pg.fill("#cNome", "Pessoa Física"); pg.fill("#cCPF", "98765432100"); pg.fill("#cCNH", "22222222222"); pg.click("#cEnviar"); pg.wait_for_timeout(500)
        ins = pg.evaluate("window.__ins"); o = json.loads(ins[0]["observacao"])
        ok(o["cpf"] == "987.654.321-00" and o["cnh"] == "22222222222", "cadastro de cliente envia CPF e CNH")
        # ---------- MEUS DADOS ----------
        pg.goto(BASE + "dados.html"); pg.wait_for_timeout(900)
        ok(not erros and "Mesa de Câmbio" not in pg.inner_text("body"), f"dados.html sem erro e sem o rodapé antigo {erros[:2]}")
        t = pg.inner_text("#ddLista")
        ok("1 registro(s) repetido(s)" in t, "avisa o registro repetido (mesmos dados, maiúsculas/espaços diferentes)")
        pg.click('[data-ddabrir="77"]'); pg.wait_for_timeout(200)
        ok(pg.locator(".dd-reg").count() == 3 and pg.locator(".dd-dup").count() == 1, "cartões, com o repetido marcado")
        ok("cópia" in pg.inner_text("#ddLista"), "explica que a coleção é cópia da equipe oficial")
        pg.click('[data-ddjuntar=""]'); pg.wait_for_timeout(300)
        regs = L("dd_registros")
        ok(len(regs) == 2 and 1002 in [r["id"] for r in regs] and pg.evaluate("!!localStorage.getItem('ui_dd_backup')"), "JUNTAR: fica o mais recente + cópia de segurança")
        pg.click('[data-ddedit="1003"]'); pg.wait_for_timeout(200)
        pg.fill("#ed_1003_2", "(31) 98888-7777"); pg.click('[data-ddsalvar="1003"]'); pg.wait_for_timeout(200)
        ok([r for r in L("dd_registros") if r["id"] == 1003][0]["campos"]["Telefone"] == "(31) 98888-7777", "✎ ALTERAR no próprio cartão")
        pg.click('[data-ddcampo="77"]'); pg.wait_for_timeout(200)
        ok("CPF" in L("dd_colecoes")[0]["campos"], "+ CAMPO (CPF)")
        pg.click('[data-ddabrir="plat"]'); pg.wait_for_timeout(200)
        ok("98765432100 (AB)" in pg.inner_text("#ddLista") and "111.222.333-44" in pg.inner_text("#ddLista"), "CADASTROS DA PLATAFORMA mostram CPF/CNH")
        ov = pg.evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth"); ok(ov <= 0, f"sem estouro horizontal ({ov})")
        pg.screenshot(path=f"/tmp/dados_{larg}.png", full_page=True)
        pg.click('[data-ddexcluir="77"]'); pg.wait_for_timeout(300)
        ok(L("dd_colecoes") == [] and L("dd_registros") == [] and len(L("neg_equipe_colaboradores")) == 2, "EXCLUIR COLEÇÃO apaga só a cópia (a equipe oficial fica)")
        ok(not erros, f"nenhum erro de JS {erros[:3]}")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
