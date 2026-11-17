#!/usr/bin/env python3
"""Teste local (16/11): AGENTE (assets/bw-agente.js) + LEITOR DE CONTAS (assets/bw-leitor.js).
AGENTE: robô em todas as páginas (menos as públicas), acima das abas do celular; tocar = ouve (reconhecimento de voz simulado);
frase → cartão para conferir → ✓ LANÇAR grava no lugar certo (gasto da casa, conta a pagar, tarefa, entrada/saída do negócio,
custo de evento); pergunta "quanto gastei" calculada no aparelho; "abrir fluxo" navega; IA Brightway simulada (várias ações numa
frase) recebe só a frase; microfone bloqueado → aviso; ajustes lembrados; sem login entende no aparelho.
LEITOR: PDF de conta com texto (pdf.js de verdade) → valor/vencimento/empresa + boleto de arrecadação decodificado (valor do código
vence o do texto); foto (OCR simulado) de cupom → GASTO DA CASA com categoria; código colado; aviso de conta repetida; CUSTO DE EVENTO;
IA simulada recebe só texto tapado (sem CPF/CEP/imagem). 1280 e 390 px sem estouro, 0 erros de JS.
Uso (na raiz):  python3 docs/testes/teste_agente_leitor.py"""
import http.server, json, os, socketserver, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8836
NM = "/opt/npm-tools/node_modules/"
TMP = tempfile.mkdtemp(prefix="bwagente_")
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]}),upload:async()=>({error:{message:'sem login'}})}}}};}};"""
# voz simulada: o que estiver em window.__fala é "ouvido"; window.__falaErro simula microfone bloqueado
VOZ = """window.__fala='';window.__falaErro='';window.SpeechRecognition=function(){var s=this;s.start=function(){setTimeout(function(){
  if(window.__falaErro){s.onerror&&s.onerror({error:window.__falaErro});s.onend&&s.onend();return;}
  var tx=(window.__falas&&window.__falas.length)?window.__falas.shift():window.__fala;var r=[{0:{transcript:tx},isFinal:true,length:1}];r.length=1;s.onresult&&s.onresult({resultIndex:0,results:r});setTimeout(function(){s.onend&&s.onend();},30);},120);};s.stop=function(){s.onend&&s.onend();};};
Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speak:function(u){window.__falou=(window.__falou||[]).concat([u.text]);setTimeout(function(){u.onend&&u.onend();},20);},cancel:function(){},getVoices:function(){return[];}}});window.SpeechSynthesisUtterance=function(t){this.text=t;};"""
STUB_ZX = "window.ZXingWASM={readBarcodes:async function(){return window.__codigos||[];}};"
STUB_TESS = "window.Tesseract={recognize:async function(c,l,o){o&&o.logger&&o.logger({status:'recognizing text',progress:1});return {data:{text:window.__ocr||''}};}};"

def mod10(s):
    soma, p = 0, 2
    for ch in reversed(s):
        n = int(ch) * p; soma += n // 10 + n % 10 if n > 9 else n; p = 1 if p == 2 else 2
    r = soma % 10; return 0 if r == 0 else 10 - r
def arrec(valor_centavos):   # boleto de arrecadação de ENERGIA (segmento 3, id 6) válido
    corpo = "836" + str(valor_centavos).zfill(11) + "0138" + "0006" + "20261120" + "1234567890123"
    bc = corpo[:3] + str(mod10(corpo)) + corpo[3:]
    linha = "".join(bc[i*11:i*11+11] + str(mod10(bc[i*11:i*11+11])) for i in range(4))
    return bc, linha
BC, LINHA = arrec(25147)
LINHA_FMT = " ".join(LINHA[i*12:i*12+11] + "-" + LINHA[i*12+11] for i in range(4))
TEXTO_PDF = ["CEMIG DISTRIBUICAO S.A.", "Nota Fiscal / Conta de Energia Eletrica", "Cliente: FULANO DE TAL  CPF 123.456.789-00", "Rua Exemplo 100 CEP 30140-000",
             "Referente a NOV/2026", "Vencimento 20/11/2026", "Consumo 230 kWh", "ICMS 45,30", "TOTAL A PAGAR R$ 299,99", LINHA_FMT]
def pdf():
    js = ("const {PDFDocument,StandardFonts}=require('/opt/npm-tools/node_modules/pdf-lib');(async()=>{const d=await PDFDocument.create();const f=await d.embedFont(StandardFonts.Helvetica);"
          "const p=d.addPage([595,842]);let y=780;for(const t of %s){p.drawText(t,{x:40,y,size:12,font:f});y-=24;}require('fs').writeFileSync(%s,await d.save());})()") % (json.dumps(TEXTO_PDF), json.dumps(TMP + "/conta.pdf"))
    r = subprocess.run(["node", "-e", js], capture_output=True, text=True); assert r.returncode == 0, r.stderr
    js2 = ("const {PDFDocument}=require('/opt/npm-tools/node_modules/pdf-lib');(async()=>{const d=await PDFDocument.create();d.addPage([200,200]);"
           "require('fs').writeFileSync(%s,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==','base64'));})()") % json.dumps(TMP + "/cupom.png")
    subprocess.run(["node", "-e", js2], check=True)
pdf()

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
IA = {"resposta": None, "pedidos": []}
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "functions/v1/bw-ia" in u:
        IA["pedidos"].append(r.request.post_data or "")
        if IA["resposta"] is None: return r.fulfill(status=503, body='{"erro":"ocupada"}', content_type="application/json")
        return r.fulfill(body=json.dumps({"texto": json.dumps(IA["resposta"])}), content_type="application/json")
    if "pdf.worker" in u: return r.fulfill(path=NM + "pdfjs-dist/build/pdf.worker.min.mjs", content_type="text/javascript")
    if "pdfjs-dist" in u: return r.fulfill(path=NM + "pdfjs-dist/build/pdf.min.mjs", content_type="text/javascript", headers={"Access-Control-Allow-Origin": "*"})
    if "zxing-wasm" in u: return r.fulfill(body=STUB_ZX, content_type="application/javascript")
    if "tesseract" in u: return r.fulfill(body=STUB_TESS, content_type="application/javascript")
    return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
L = lambda pg, k: pg.evaluate(f"JSON.parse(localStorage.getItem('bw_{k}_v1')||'[]')")
LOGAR = """() => { window.BWSync.cliente = () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tk' } } }) }, storage: { from: () => ({ upload: async () => ({ error: null }) }) } }); }"""

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        ctx = nav.new_context(viewport={"width": larg, "height": 860}, service_workers="block")
        ctx.add_init_script(VOZ); ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "index.html"); pg.wait_for_timeout(900)
        pg.evaluate("""() => { ['casa_orcamento','casa_contas','neg_fluxo','agenda_tarefas'].forEach(k => localStorage.removeItem('bw_'+k+'_v1'));
          localStorage.setItem('bw_neg_eventos_v1', JSON.stringify([{id:'e1',nome:'Mina Vale 17/11',data:'2026-11-17',gastos:[]},{id:'e2',nome:'MART MINAS',data:'2026-11-18'}]));
          Object.keys(localStorage).filter(k => k.startsWith('ui_agente_')).forEach(k => localStorage.removeItem(k)); }""")
        pg.reload(); pg.wait_for_timeout(900)

        # ---------- AGENTE ----------
        ok(pg.locator("#bwAgente").count() == 1, "robô do agente na página (carregado pelo layout.js)")
        fb = pg.eval_on_selector("#bwAgente", "e => e.getBoundingClientRect().toJSON()")
        if larg <= 760:
            abas = pg.eval_on_selector(".bw-abas", "e => e.getBoundingClientRect().top")
            ok(fb["bottom"] <= abas, f"robô acima das abas do celular ({fb['bottom']:.0f} ≤ {abas:.0f})")
        ok(fb["right"] <= larg and fb["width"] >= 56, "robô inteiro na tela e fácil de tocar")
        pg.evaluate("window.__fala = 'lance o gasto de 30 reais nos gastos como lanche'")
        pg.click("#bwAgente"); pg.wait_for_selector(".bwg-ac [data-g=lancar]", timeout=8000)
        ok(pg.is_visible(".bwg-p") and "lanche" in pg.inner_text(".bwg-fala").lower(), "tocar no robô já ouve e mostra o que foi dito")
        ok("GASTO DA CASA" in pg.inner_text("#bwgAc") and pg.input_value('.bwg-ac [data-k="valor"]') in ("30", "30.00"), "entendeu: GASTO DA CASA, R$ 30")
        ok(pg.input_value('.bwg-ac [data-k="categoria"]') == "Alimentação", "categoria Alimentação (lanche)")
        ok(len(L(pg, "casa_orcamento")) == 0, "nada gravado antes de confirmar")
        pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(300)
        o = L(pg, "casa_orcamento")
        ok(len(o) == 1 and o[0]["c3"] == "30" and o[0]["c2"] == "Despesa" and o[0]["c1"] == "Alimentação" and o[0]["c0"] == "Lanche", f"✓ LANÇAR grava no Orçamento da casa ({o[:1]})")
        ok("LANÇADO" in pg.inner_text("#bwgAc"), "cartão vira ✓ LANÇADO com link")
        ok(any("Confirma" in t for t in pg.evaluate("window.__falou || []")), "responde falando (pergunta se confirma)")
        # escrever: conta, tarefa, entrada, custo de evento
        def diz(frase):
            pg.fill("#bwgTxt", frase); pg.press("#bwgTxt", "Enter"); pg.wait_for_timeout(500)
        diz("conta de luz de 250 reais que vence dia 20"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(200)
        c = L(pg, "casa_contas"); ok(len(c) == 1 and c[0]["c0"] == "Energia" and c[0]["c1"] == "250" and c[0]["c3"] == "Não", f"conta de luz → Contas a pagar ({c[:1]})")
        diz("me lembra de ligar para o cliente amanhã às 10"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(200)
        t = L(pg, "agenda_tarefas"); ok(len(t) == 1 and t[0]["hora"] == "10:00", f"lembrete → Agenda às 10:00 ({t[:1]})")
        diz("recebi 2.500 reais da Arte Eventos"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(200)
        f = L(pg, "neg_fluxo"); ok(len(f) == 1 and f[0]["c1"] == "Entrada" and f[0]["c2"] == "2500", f"recebi → Fluxo (entrada) ({f[:1]})")
        diz("paguei 120 de uber no evento mina vale"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(300)
        ev = [e for e in L(pg, "neg_eventos") if e["id"] == "e1"][0]; ok(len(ev.get("gastos", [])) == 1 and ev["gastos"][0]["valor"] == 120, "custo de evento → gastos do evento certo")
        # trocar o tipo antes de lançar
        diz("gastei 80 de cabo"); pg.select_option('.bwg-ac [data-k="tipo"]', "gasto_negocio"); pg.wait_for_timeout(150)
        ok("GASTO DO NEGÓCIO" in pg.inner_text("#bwgAc"), "dá para trocar o tipo antes de lançar"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(200)
        ok(len(L(pg, "neg_fluxo")) == 2 and L(pg, "neg_fluxo")[1]["c1"] == "Saída", "lançado como saída do negócio")
        # pergunta: calculada no aparelho
        n_ia = len(IA["pedidos"]); diz("quanto gastei este mês com lanche?")
        ok("R$ 30,00" in pg.inner_text("#bwgAc").replace("\xa0", " "), "pergunta: 'quanto gastei com lanche' = R$ 30,00 (calculado aqui)")
        # sem valor → não lança
        diz("gastei com padaria"); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(200)
        ok("falta o valor" in pg.inner_text(".bwg-st") and len(L(pg, "casa_orcamento")) == 1, "sem valor: avisa e não grava")
        # IA Brightway (logado): várias ações numa frase; recebe só a frase
        pg.evaluate(LOGAR)
        IA["resposta"] = {"acoes": [{"tipo": "gasto_casa", "descricao": "Mercado", "valor": 152.4, "categoria": "Alimentação", "data": "2026-11-16"},
                                    {"tipo": "tarefa", "titulo": "Buscar equipamento", "data": "2026-11-18", "hora": "14:00", "categoria": "trabalho"}], "resposta": "Anotado!"}
        IA["pedidos"].clear(); diz("gastei 152,40 no mercado e quarta às 14h buscar equipamento"); pg.wait_for_timeout(500)
        ok(pg.locator(".bwg-ac [data-g=lancar]").count() == 2 and "LANÇAR TODOS (2)" in pg.inner_text("#bwgAc"), "IA: duas ações numa frase + LANÇAR TODOS")
        corpo = IA["pedidos"][0] if IA["pedidos"] else ""
        ok("mercado" in corpo and "Mina Vale" in corpo and "casa_orcamento" not in corpo and "Lanche" not in corpo, "IA recebe só a frase + data + nomes dos eventos (nenhum lançamento seu)")
        pg.click("[data-g=todas]"); pg.wait_for_timeout(300)
        ok(len(L(pg, "casa_orcamento")) == 2 and len(L(pg, "agenda_tarefas")) == 2, "LANÇAR TODOS grava as duas")
        # 16/11 noite (dono: "fala certo mas não lança nada na agenda"): a IA de verdade devolvia {"tarefa":{...}} sem "tipo"
        IA["resposta"] = {"acoes": [{"tarefa": {"titulo": "Revisar orçamento da Golden", "data": pg.evaluate("BWLanca.hoje()"), "hora": "23:30", "categoria": "trabalho"}}], "resposta": "Lembrete criado"}
        diz("me lembra de revisar o orçamento da Golden hoje às 23h30"); pg.wait_for_timeout(400)
        ok("TAREFA" in pg.inner_text("#bwgAc") and pg.input_value('.bwg-ac [data-k="titulo"]') == "Revisar orçamento da Golden", "IA no formato {\"tarefa\":{…}} → cartão TAREFA (antes virava 'não entendi')")
        ok("Lembrete criado" not in pg.inner_text("#bwgAc"), "não diz 'lembrete criado' antes de lançar")
        n = len(L(pg, "agenda_tarefas")); pg.click(".bwg-ac [data-g=lancar]"); pg.wait_for_timeout(400)
        ok(len(L(pg, "agenda_tarefas")) == n + 1, "✓ LANÇAR grava a tarefa da IA na agenda")
        ok("Revisar orçamento da Golden" in pg.inner_text("body"), "a AGENDA da tela inicial mostra na hora (sem recarregar)")
        IA["resposta"] = {"acoes": [{"acao": "gasto_casa", "descricao": "Pizza", "valor": 64, "data": "2026-11-16"}], "resposta": ""}
        diz("gastei 64 de pizza"); ok("GASTO DA CASA" in pg.inner_text("#bwgAc"), "IA com campo 'acao' também é entendida")
        IA["resposta"] = {"acoes": [{"foo": 1}], "resposta": "Feito"}
        diz("tenho que levar o carro na oficina sexta de manhã")
        ok("TAREFA" in pg.inner_text("#bwgAc") and pg.input_value('.bwg-ac [data-k="hora"]') == "09:00", "IA inútil → entende no aparelho: 'tenho que…' = tarefa, de manhã = 09:00")
        ok("levar carro oficina" in pg.input_value('.bwg-ac [data-k="titulo"]').lower(), f"título limpo ({pg.input_value('.bwg-ac [data-k=titulo]')})")
        IA["resposta"] = {"acoes": [{"tipo": "responder", "texto": "Um drone pode voar até 120 metros no Brasil, segundo a ANAC."}], "resposta": ""}
        diz("qual a altura máxima para voar de drone?"); ok("120 metros" in pg.inner_text("#bwgAc") and pg.locator(".bwg-ac [data-g=lancar]").count() == 0, "pergunta geral → responde (sem lançar nada)")
        IA["resposta"] = None
        diz("o que eu tenho amanhã?")
        ok("Ligar" in pg.inner_text("#bwgAc") and "10h" in pg.inner_text("#bwgAc"), f"'o que tenho amanhã' → lê a agenda ({pg.inner_text('#bwgAc')[:120]})")
        # voz mãos livres: fala → "sim" lança; "não" cancela
        pg.evaluate("window.__falas = ['me lembra de pagar o IPVA sexta', 'sim']"); n = len(L(pg, "agenda_tarefas"))
        pg.click("[data-g=ouvir]"); pg.wait_for_timeout(1500)
        t = L(pg, "agenda_tarefas"); ok(len(t) == n + 1 and "IPVA" in t[-1]["titulo"], f"voz: '…Confirma?' → 'sim' → lançado sem tocar ({t[-1:]})")
        pg.evaluate("window.__falas = ['anotar comprar fita crepe amanhã', 'não']"); n = len(L(pg, "agenda_tarefas"))
        pg.click("[data-g=ouvir]"); pg.wait_for_timeout(1500)
        ok(len(L(pg, "agenda_tarefas")) == n and "Cancelado" in pg.inner_text(".bwg-st"), "voz: 'não' → cancela, nada gravado")
        pg.evaluate("window.__falas = []")
        # ajustes + lançar sem perguntar
        pg.click("[data-g=ajustes]"); pg.check('[data-u="auto"]'); pg.uncheck('[data-u="voz"]')
        ok(pg.evaluate("localStorage.getItem('ui_agente_auto')") == "true", "ajustes lembrados")
        diz("gastei 12 reais de café"); pg.wait_for_timeout(300)
        ok(len(L(pg, "casa_orcamento")) == 3 and "LANÇADO" in pg.inner_text("#bwgAc"), "lançar sem perguntar (ligado nos ajustes)")
        pg.uncheck('[data-u="auto"]')
        # microfone bloqueado
        pg.evaluate("window.__falaErro = 'not-allowed'"); pg.click("[data-g=ouvir]"); pg.wait_for_timeout(500)
        ok("microfone está bloqueado" in pg.inner_text(".bwg-st"), "microfone bloqueado → aviso para liberar")
        pg.evaluate("window.__falaErro = ''")
        pc = pg.eval_on_selector(".bwg-p", "e => e.getBoundingClientRect().toJSON()")
        ok(pc["left"] >= 0 and pc["right"] <= larg and pc["top"] >= 0, f"painel do agente cabe na tela ({pc['left']:.0f}–{pc['right']:.0f})")
        pg.keyboard.press("Escape"); ok(not pg.is_visible(".bwg-p"), "Esc fecha o agente")
        # abrir página
        pg.click("#bwAgente"); pg.wait_for_timeout(300); pg.evaluate("window.__fala=''")
        with pg.expect_navigation(timeout=8000): diz("abrir fluxo de caixa"); pg.wait_for_timeout(900)
        ok(pg.url.endswith("fluxo.html"), "'abrir fluxo de caixa' abre a página")
        pg.goto(BASE + "login.html"); pg.wait_for_timeout(700)
        ok(pg.locator("#bwAgente").count() == 0, "sem robô nas páginas públicas (login)")

        # ---------- LEITOR ----------
        pg.goto(BASE + "leitor.html"); pg.wait_for_timeout(1200)
        ok(pg.locator("#ltDest [data-d]").count() == 4 and pg.locator("#ltZona").count() == 1, "leitor novo: 4 destinos + área do arquivo")
        ok(pg.locator("#bwAgente").count() == 1, "robô também no leitor")
        pg.set_input_files("#ltArq", TMP + "/conta.pdf"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000)
        ok(pg.get_attribute('#ltDest [data-d="conta"]', "aria-checked") == "true", "PDF de conta → CONTA A PAGAR escolhida sozinha")
        ok(pg.input_value("#ltVal") == "251.47", f"valor do código de barras ({pg.input_value('#ltVal')}) vence o do texto (299,99)")
        ok(pg.input_value("#ltVenc") == "2026-11-20", "vencimento lido do texto")
        ok("Energia" in pg.input_value("#ltDesc") and "CEMIG" in pg.input_value("#ltDesc"), f"descrição: {pg.input_value('#ltDesc')}")
        conf = pg.inner_text(".lt-conf"); ok("PDF" in conf and "código de barras" in conf, "selos: lido do PDF + conferido pelo código")
        ok(LINHA_FMT.split()[0][:11] in pg.inner_text("#ltLinha").replace("-", ""), "linha digitável mostrada")
        pg.click("#ltLancar"); pg.wait_for_timeout(300)
        c = [x for x in L(pg, "casa_contas") if x.get("origem") == "leitor"]; ok(len(c) == 1 and c[0]["cod"] == BC and c[0]["c1"] == "251.47" and c[0]["c2"] == "2026-11-20", "lançado em Contas a pagar com o código de barras")
        pg.click("[data-a=outro]"); pg.set_input_files("#ltArq", TMP + "/conta.pdf"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000)
        ok("já está em Contas a pagar" in pg.inner_text("#ltRes"), "mesma conta de novo → aviso de repetida")
        # código colado
        pg.click("[data-a=outro]"); pg.click("[data-a=colar]"); pg.fill("#ltCod", LINHA_FMT); pg.click("[data-a=lerCod]"); pg.wait_for_timeout(300)
        ok(pg.is_visible("#ltRes") and pg.input_value("#ltVal") == "251.47" and "Código lido" in pg.inner_text("#ltSt"), "código colado (com traços e espaços) → valor")
        pg.fill("#ltCod", "123"); pg.click("[data-a=lerCod]"); pg.wait_for_timeout(200)
        ok("não reconhecido" in pg.inner_text("#ltSt"), "código errado → aviso")
        # foto de cupom (OCR simulado) → GASTO DA CASA
        pg.click("[data-a=outro]")
        pg.evaluate("""window.__ocr = 'SUPERMERCADO BH LTDA\\nCNPJ 12.345.678/0001-90\\nDOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRONICA\\nARROZ 5KG 24,90\\nFEIJAO 8,49\\nTOTAL R$ 33,39\\nDinheiro 50,00\\nTroco 16,61\\n15/11/2026 18:22'""")
        pg.set_input_files("#ltArq", TMP + "/cupom.png"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000)
        ok(pg.get_attribute('#ltDest [data-d="casa"]', "aria-checked") == "true", "cupom → GASTO DA CASA escolhido sozinho")
        ok(pg.input_value("#ltVal") == "33.39" and pg.input_value("#ltData") == "2026-11-15", "cupom: total 33,39 (não o troco/dinheiro) e data")
        ok(pg.input_value("#ltCat") == "Alimentação", f"categoria pela loja ({pg.input_value('#ltCat')})")
        ok("foto" in pg.inner_text(".lt-conf"), "selo: lido da foto — confira")
        pg.click("#ltLancar"); pg.wait_for_timeout(300)
        o = L(pg, "casa_orcamento"); ok(o and o[-1]["c3"] == "33.39" and o[-1]["c1"] == "Alimentação", "lançado no Orçamento da casa")
        # custo de evento
        pg.click("[data-a=outro]"); pg.click('#ltDest [data-d="evento"]'); pg.select_option("#ltEvento", "e2")
        pg.set_input_files("#ltArq", TMP + "/cupom.png"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000)
        ok(pg.get_attribute('#ltDest [data-d="evento"]', "aria-checked") == "true", "destino escolhido pela pessoa é respeitado")
        pg.click("#ltLancar"); pg.wait_for_timeout(600)
        e2 = [e for e in L(pg, "neg_eventos") if e["id"] == "e2"][0]; ok(len(e2.get("gastos", [])) == 1 and e2["gastos"][0]["valor"] == 33.39, "lançado nos custos do evento escolhido")
        # IA (logado): recebe só texto tapado
        pg.evaluate(LOGAR); IA["pedidos"].clear()
        IA["resposta"] = {"tipo": "conta", "empresa": "CEMIG", "descricao": "Energia — CEMIG", "valor": 299.99, "vencimento": "2026-11-20", "referencia": "NOV/2026", "categoria": "Contas (luz/água/net)"}
        pg.click("[data-a=outro]"); pg.click('#ltDest [data-d="conta"]'); pg.set_input_files("#ltArq", TMP + "/conta.pdf"); pg.wait_for_selector("#ltRes:not([hidden]) #ltVal", timeout=30000)
        corpo = IA["pedidos"][0] if IA["pedidos"] else ""
        ok(corpo and "123.456.789-00" not in corpo and "30140-000" not in corpo and "[CPF]" in corpo and "data:image" not in corpo, "IA recebe só o texto, com CPF/CEP tapados e sem imagem")
        ok(pg.input_value("#ltVal") == "251.47" and "IA Brightway" in pg.inner_text(".lt-conf"), "IA confere, mas o valor do código de barras continua valendo")
        IA["resposta"] = None
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(sw <= 0, f"leitor sem estouro horizontal ({sw})")
        ok(not erros, "0 erros de JavaScript" + ("" if not erros else ": " + erros[0][:200]))
        ctx.close()
    nav.close()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
