#!/usr/bin/env python3
"""Teste local (método T1) das páginas novas: CRM, funil, indicadores e editor de fotos.
Uso (na raiz):  python3 docs/testes/teste_crm.py   — servidor local + stubs (METODOS T1); sai com erro se algo falhar."""
import datetime, http.server, json, os, socketserver, threading, sys
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8811
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},gte(){return q},lte(){return q},not(){return q},upsert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]}),upload:async()=>({error:null}),remove:async()=>({}),createSignedUrl:async()=>({data:{signedUrl:"#"}})}}}};}};"""
STUB_PDF = "window.pdfMake={createPdf:d=>({download(){},getBuffer(cb){cb&&cb([])}})};"
hoje = datetime.date.today()
D = lambda n: (hoje + datetime.timedelta(days=n)).isoformat()


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q)
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"


def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake" in u: return r.fulfill(body=STUB_PDF, content_type="application/javascript")
    return r.abort()


falhas = []
def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond: falhas.append(msg)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for largura in (1280, 390):
        ctx = b.new_context(viewport={"width": largura, "height": 900}, service_workers="block", accept_downloads=True)
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        print(f"\n=== {largura}px ===")
        for pag in ["crm.html", "captacao.html", "resultados.html", "fotos.html", "index.html", "marketing.html", "ferramentas.html", "assistente.html"]:
            erros.clear(); pg.goto(BASE + pag); pg.wait_for_timeout(700)
            ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
            ok(not erros and ov <= 0, f"{pag}: erros={erros[:2]} estouro={ov}")
        if largura != 1280:
            continue
        # ---------- funil: novo contato ----------
        pg.goto(BASE + "captacao.html"); pg.wait_for_timeout(500)
        pg.click("#btNovo"); pg.fill("#fNome", "Teste Silva"); pg.fill("#fTel", "31988887777"); pg.select_option("#fOrigem2", "Instagram")
        pg.fill("#fValor", "5000"); pg.fill("#fData", D(40)); pg.click("#fSalvar"); pg.wait_for_timeout(300)
        ls = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1')||'[]')")
        ok(len(ls) == 1 and ls[0]["nome"] == "Teste Silva" and ls[0]["tel"] == "(31) 98888-7777", f"novo contato salvo: {ls[:1]}")
        ok(pg.locator(".crm-cartao").count() == 1, "cartão aparece no funil")
        lid = ls[0]["id"]
        # duplicado
        pg.click("#btNovo"); pg.fill("#fNome", "Outro"); pg.fill("#fTel", "(31) 98888-7777"); pg.click("#fSalvar"); pg.wait_for_timeout(200)
        pg.goto(BASE + "captacao.html?lead=" + [x["id"] for x in pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))") if x["nome"] == "Outro"][0]); pg.wait_for_timeout(500)
        ok(pg.locator(".crm-aviso").count() == 1, "aviso de duplicado aparece na ficha")
        pg.click("#fApagar"); pg.wait_for_timeout(200)
        # etapa e conversa
        pg.goto(BASE + "captacao.html?lead=" + lid); pg.wait_for_timeout(500)
        pg.fill("#fHTxt", "pediu proposta"); pg.click("#fHAdd"); pg.wait_for_timeout(200)
        l = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))[0]")
        ok(l["etapa"] == "conversa" and any(h["txt"] == "pediu proposta" for h in l["hist"]), "registrar conversa → CONVERSANDO")
        pg.click('[data-et="proposta"]'); pg.wait_for_timeout(300)
        l = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))[0]")
        ok(l["etapa"] == "proposta" and l["etapas"].get("proposta") == D(0), "mudar etapa → PROPOSTA (data local)")
        # próximo passo atrasado → agente + sino
        pg.evaluate(f"""(()=>{{const k='bw_mkt_leads_v1',v=JSON.parse(localStorage.getItem(k));v[0].prox={{data:'{D(-2)}',oque:'Ligar'}};localStorage.setItem(k,JSON.stringify(v));}})()""")
        pg.goto(BASE + "captacao.html"); pg.wait_for_timeout(600)
        ok(pg.locator(".crm-acao").count() >= 1 and "atrasado" in pg.inner_text("#fila"), "agente mostra retorno atrasado")
        ok(pg.evaluate("document.getElementById('bwSinoN') && document.getElementById('bwSinoN').textContent") not in (None, "", "0"), "sino conta o retorno")
        pg.click("[data-ffeito='0']"); pg.wait_for_timeout(200)
        l = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))[0]")
        ok(not l.get("prox") and "Agente" in l["hist"][-1]["txt"], "FEITO limpa o retorno e registra")
        # fechar negócio
        pg.goto(BASE + "captacao.html?lead=" + lid); pg.wait_for_timeout(500)
        pg.click("#fFechar"); pg.wait_for_timeout(200); pg.click("#xOk"); pg.wait_for_timeout(300)
        evs = pg.evaluate("JSON.parse(localStorage.getItem('bw_neg_eventos_v1')||'[]')"); cls = pg.evaluate("JSON.parse(localStorage.getItem('bw_neg_clientes_v1')||'[]')")
        l = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_leads_v1'))[0]")
        ok(len(evs) == 1 and evs[0]["data"] == D(40) and evs[0]["contratado"] == "5000" and evs[0]["status"] == "Confirmado", f"FECHAR cria evento: {evs[:1]}")
        ok(len(cls) == 1 and cls[0]["nome"] == "Teste Silva", "FECHAR cadastra cliente")
        ok(l["etapa"] == "fechado" and l["fechadoEm"] == D(0) and l["eventoId"] == evs[0]["id"], "lead fechado ligado ao evento")
        # colar mensagem (sem login → regras)
        pg.goto(BASE + "captacao.html#colar"); pg.wait_for_timeout(500)
        pg.fill("#cTxt", "Oi! Aqui é a Ana Paula, da empresa Construtora Alfa. Queria orçamento de transmissão ao vivo da convenção dia 12/12 no Hotel Ouro Minas. Meu zap é (31) 97777-6666 e email ana@alfa.com.br")
        pg.click("#cLer"); pg.wait_for_timeout(500)
        v = pg.evaluate("({n:fNome.value,e:fEmpresa.value,t:fTel.value,m:fEmail.value,s:fServico.value,d:fData.value,l:fLocal.value})")
        ok(v["n"] == "Ana Paula" and v["t"] == "(31) 97777-6666" and v["m"] == "ana@alfa.com.br" and v["s"] == "Transmissão ao vivo" and v["d"].endswith("-12-12") and "Hotel" in v["l"], f"captura por regras: {v}")
        ok(v["e"] == "Construtora Alfa", f"empresa capturada: {v['e']}")
        pg.click("#fSalvar"); pg.wait_for_timeout(200)
        # mensagens prontas: editar e salvar
        pg.goto(BASE + "captacao.html#mensagens"); pg.wait_for_timeout(400); pg.evaluate("document.getElementById('mdlCaixa').open=true")
        pg.fill("#cfgAssin", "Marcos, da BW"); pg.dispatch_event("#cfgAssin", "change")
        pg.locator(".crm-mdl-ed .mdlTxt").first.fill("Olá {nome}! Teste {assinatura}."); pg.locator("[data-msalvar]").first.click(); pg.wait_for_timeout(200)
        m = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_modelos_v1')||'[]')")
        ok(len(m) == 8 and m[0]["texto"].startswith("Olá {nome}"), "mensagem editada salva (lista completa)")
        txt = pg.evaluate("BWCRM.preencher(BWCRM.modelos()[0].texto,{nome:'Ana Paula'})")
        ok(txt == "Olá Ana! Teste Marcos, da BW.", f"preencher modelo: {txt}")
        # ajustes
        pg.fill("#cfgServ", "Transmissão ao vivo\nFotografia\nFotografia\nAftermovie"); pg.fill("#cfgMeta", "4"); pg.click("#cfgSalvar"); pg.wait_for_timeout(200)
        ok(pg.evaluate("BWCRM.servicos().join('|')") == "Transmissão ao vivo|Fotografia|Aftermovie", "serviços sem duplicado")
        # lista
        pg.click('[data-vista="lista"]'); pg.wait_for_timeout(200); ok(pg.locator(".crm-tab tbody tr").count() == 2, "vista LISTA")
        pg.click('[data-vista="funil"]')
        # ---------- indicadores ----------
        pg.goto(BASE + "resultados.html"); pg.wait_for_timeout(500)
        ok("EXEMPLO" not in pg.inner_text("#faixaEx"), "com dados, sem faixa EXEMPLO")
        k = pg.inner_text("#kpis"); ok("Contatos novos\n2" in k and "Fechados\n1" in k, f"KPIs: {k[:120]!r}")
        pg.click("#btIA"); pg.wait_for_timeout(400); ok("regras" in pg.inner_text("#iaSaida"), "analista sem login cai nas regras")
        pg.fill("#rdSeg", "1200"); pg.fill("#rdAlc", "8000"); pg.click("#rdSalvar"); pg.wait_for_timeout(200)
        mes2 = (hoje.replace(day=1) - datetime.timedelta(days=40)).strftime("%Y-%m")
        pg.fill("#rdMes", mes2); pg.fill("#rdSeg", "1000"); pg.click("#rdSalvar"); pg.wait_for_timeout(200)
        r = pg.evaluate("JSON.parse(localStorage.getItem('bw_mkt_redes_v1')||'[]')")
        ok(len(r) == 2 and pg.locator("#gRedes svg path").count() >= 1 and "+20,0%" in pg.inner_text("#tRedes"), f"redes: {len(r)} meses, crescimento")
        pg.screenshot(path="/tmp/shot_resultados.png", full_page=True)
        # exemplo
        pg.evaluate("localStorage.removeItem('bw_mkt_leads_v1')"); pg.reload(); pg.wait_for_timeout(500)
        ok("EXEMPLO" in pg.inner_text("#faixaEx") and pg.evaluate("localStorage.getItem('bw_mkt_leads_v1')") is None, "conta vazia: EXEMPLO só na tela")
        pg.screenshot(path="/tmp/shot_resultados_ex.png", full_page=True)
        # ---------- index: agenda com retorno ----------
        pg.evaluate(f"""localStorage.setItem('bw_mkt_leads_v1',JSON.stringify([{{id:'ld_t',nome:'Retorno Teste',etapa:'proposta',criadoEm:'{D(-3)}',prox:{{data:'{D(0)}',oque:'Mandar proposta'}},hist:[]}}]))""")
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(800)
        ok("Retornar — Retorno Teste" in pg.inner_text("body"), "agenda mostra retorno do CRM")
        # ---------- crm hub ----------
        pg.goto(BASE + "crm.html"); pg.wait_for_timeout(500)
        ok("Retorno Teste" in pg.inner_text("#agLista") and "1" in pg.inner_text("#kpis"), "CRM: agente e KPIs")
        pg.screenshot(path="/tmp/shot_crm.png", full_page=True)
        pg.goto(BASE + "captacao.html"); pg.wait_for_timeout(500); pg.screenshot(path="/tmp/shot_funil.png", full_page=True)
        # ---------- fotos ----------
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(500)
        pg.evaluate("""(async()=>{
          function img(w,h,cor){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,w,h);g.addColorStop(0,cor);g.addColorStop(1,'#223');x.fillStyle=g;x.fillRect(0,0,w,h);x.fillStyle='#fff';x.font='bold 200px sans-serif';x.fillText('BW',w/3,h/2);return new Promise(r=>c.toBlob(b=>r(new File([b],'foto'+w+'.jpg',{type:'image/jpeg'})),'image/jpeg',.9));}
          const fs=[await img(4000,3000,'#c84'),await img(3000,4000,'#48c'),await img(2400,1600,'#8c4')];
          await window.__fotos.adicionar(fs); window.__ok=1; })()""")
        pg.wait_for_function("window.__ok===1", timeout=20000)
        ok(pg.locator("#thumbs [data-i]").count() == 3 and pg.locator("#palco canvas").count() == 1, "3 fotos carregadas + prévia")
        # logo
        pg.evaluate("""(()=>{const c=document.createElement('canvas');c.width=400;c.height=120;const x=c.getContext('2d');x.fillStyle='#FFB547';x.font='bold 90px sans-serif';x.fillText('LOGO',10,95);
          c.toBlob(b=>{const dt=new DataTransfer();dt.items.add(new File([b],'logo.png',{type:'image/png'}));const i=document.getElementById('logoArq');i.files=dt.files;i.dispatchEvent(new Event('change'));},'image/png');})()""")
        pg.wait_for_timeout(800)
        ok(pg.evaluate("window.__fotos.O().logo.on") is True and pg.evaluate("!!localStorage.getItem('ui_fotos_logo')"), "logo enviada, ligada e guardada")
        pg.click('[data-aba="formato"]'); pg.click('#fmtChips [data-v="4:5"]')
        pg.click('[data-aba="filtros"]'); pg.wait_for_timeout(300); pg.click('[data-filtro="cinema"]')
        pg.click('[data-aba="borda"]'); pg.click('#bordaEst [data-v="polaroid"]'); pg.fill("#bordaTxt", "@bwproducoes")
        pg.click('[data-aba="ajustes"]'); pg.fill("#aj_nitidez", "40"); pg.dispatch_event("#aj_nitidez", "input")
        pg.wait_for_timeout(500)
        pg.screenshot(path="/tmp/shot_fotos.png", full_page=True)
        # tamanho final de uma foto 4:5 polaroid em ALTA
        dims = pg.evaluate("""(async()=>{const f=window.__fotos.FOTOS[0];const im=await new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=URL.createObjectURL(f.file);});
          const c=window.__fotos.montar(im,f,{tam:'alta'});return [c.width,c.height];})()""")
        ok(dims[0] > 1600 and dims[1] > dims[0], f"foto final 4:5 + polaroid: {dims}")
        pg.click('[data-aba="salvar"]'); pg.fill("#nomeArq", "Evento Teste")
        with pg.expect_download(timeout=60000) as dl:
            pg.click("#bxTodas")
        d = dl.value; caminho = "/tmp/teste_fotos.zip"; d.save_as(caminho)
        import zipfile
        z = zipfile.ZipFile(caminho); nomes = z.namelist(); bad = z.testzip()
        ok(nomes == ["evento-teste-01.jpg", "evento-teste-02.jpg", "evento-teste-03.jpg"] and bad is None, f"ZIP válido: {nomes}")
        from io import BytesIO
        try:
            from PIL import Image
            im = Image.open(BytesIO(z.read(nomes[0]))); ok(im.format == "JPEG", f"JPEG {im.size}")
        except ImportError:
            ok(z.read(nomes[0])[:2] == b"\xff\xd8", "JPEG válido")
        pg.click('[data-aba="salvar"]'); pg.fill("#padNome", "Insta BW"); pg.click("#padSalvar")
        ok("Insta BW" in pg.inner_text("#padLista"), "MEU PADRÃO salvo")
        ctx.close()
    b.close()
srv.shutdown()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
