#!/usr/bin/env python3
"""Capturas de tela do manual com a empresa fictícia "Produtora Exemplo".

Uso (na raiz do repositório):  python3 docs/manual/telas.py
Sobe um servidor local, bloqueia Supabase/CDNs (stubs), semeia dados fictícios e salva PNGs em docs/manual/telas/.
Método: docs/METODOS.md (T1).
"""
import datetime, http.server, os, socketserver, threading
from playwright.sync_api import sync_playwright

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SAIDA = os.path.join(RAIZ, "docs", "manual", "telas")
PORTA = 8799

STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},
order(){return q},limit(){return q},gte(){return q},lte(){return q},not(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]}),upload:async()=>({error:null}),remove:async()=>({}),createSignedUrl:async()=>({data:{signedUrl:"#"}})}}}};}};"""
STUB_PDF = "window.pdfMake={createPdf:d=>({download(){},getBuffer(cb){cb&&cb([])}})};"

hoje = datetime.date.today()
D = lambda n: (hoje + datetime.timedelta(days=n)).isoformat()
SEED = {
    "neg_equipe_colaboradores": [
        {"id": 1, "nome": "Ana Souza", "funcao": "Câmera", "tel": "(31) 90000-0001", "email": "ana@exemplo.com", "veiculo": "Fiat Toro", "placa": "ABC1D23", "cor": "prata"},
        {"id": 2, "nome": "Bruno Lima", "funcao": "Áudio", "tel": "(31) 90000-0002", "email": "bruno@exemplo.com", "veiculo": "VW Saveiro", "placa": "XYZ9A87", "cor": "branca"},
        {"id": 3, "nome": "Carla Dias", "funcao": "Fotografia", "tel": "(31) 90000-0003", "email": "carla@exemplo.com"}],
    "neg_equipe_equipes": [{"id": 10, "nome": "Equipe Convenção", "membros": ["1", "2", "3"],
        "docs": [{"nome": "roteiro-convencao.pdf", "url": "#", "caminho": "equipe_10/roteiro.pdf"}, {"nome": "mapa-do-palco.pdf", "url": "#", "caminho": "equipe_10/mapa.pdf"}]}],
    "neg_clientes": [{"id": 3, "nome": "Cliente Alfa", "cnpj": "00.000.000/0001-00", "tel": "(31) 3000-0000", "email": "contato@alfa.com", "cidade": "Belo Horizonte — MG"}],
    "neg_eventos": [
        {"id": 500, "nome": "Convenção Alfa", "data": D(3), "montagem": D(2), "local": "Centro de Convenções", "cliente": "Cliente Alfa", "tipo": "Corporativo",
         "status": "Confirmado", "equipeId": "10", "equipeNome": "Equipe Convenção", "orcado": 9000, "contratado": 8500, "recebido": 4250,
         "gastos": [{"id": "ct_1", "desc": "Alimentação", "valor": 180, "data": D(-1)}, {"id": "ct_2", "desc": "Combustível", "valor": 120, "data": D(-1)}],
         "checklist": [{"t": "Testar transmissão", "ok": True}, {"t": "Conferir microfones", "ok": False}]},
        {"id": 501, "nome": "Festival de Verão", "data": D(11), "local": "Parque Municipal", "cliente": "Cliente Beta", "tipo": "Show", "status": "Confirmado",
         "equipeId": "10", "equipeNome": "Equipe Convenção", "contratado": 6000, "recebido": 0}],
    "neg_equipe_pagamentos": [
        {"id": 5, "equipeId": 10, "colabId": 1, "colab": "Ana Souza", "eventoId": "500", "evento": "Convenção Alfa", "valor": 450, "data": D(3), "pago": True},
        {"id": 6, "equipeId": 10, "colabId": 2, "colab": "Bruno Lima", "eventoId": "500", "evento": "Convenção Alfa", "valor": 400, "data": D(3), "pago": False}],
    "neg_pag_equipe": "10",
    "casa_contas": [{"id": 1, "c0": "Energia", "c1": "180", "c2": D(1), "c3": "Não"}, {"id": 2, "c0": "Internet", "c1": "99,90", "c2": D(5), "c3": "Não"}],
    "neg_fluxo": [{"id": "fixo_a_1", "c0": D(6), "c1": "Saída", "c2": "1500", "c3": "Aluguel do estúdio (fixo)"},
                  {"id": "a1", "c0": D(-2), "c1": "Entrada", "c2": "4250", "c3": "Venda de serviço"}],
    "agenda_tarefas": [{"id": "tf_1", "titulo": "Editar aftermovie", "data": D(0), "hora": "14:00", "cat": "trabalho", "feitos": []},
                       {"id": "tf_2", "titulo": "Academia", "data": D(0), "hora": "07:00", "cat": "saude", "rep": "semanal", "feitos": [D(0)]},
                       {"id": "tf_3", "titulo": "Reunião com Cliente Alfa", "data": D(1), "hora": "10:00", "cat": "reuniao", "feitos": []}],
    # 15/11: CRM — contatos fictícios da Produtora Exemplo
    "mkt_leads": [
        {"id": "ld_1", "nome": "Paula Reis", "empresa": "Hotel Serra Azul", "tel": "(31) 90000-1001", "servico": "Corporativo", "origem": "Indicação", "indicadoPor": "Cliente Alfa",
         "etapa": "negociacao", "criadoEm": D(-12), "etapas": {"novo": D(-12), "conversa": D(-11), "proposta": D(-8), "negociacao": D(-4)}, "valor": 12000, "dataEvento": D(18),
         "prox": {"data": D(0), "oque": "Fechar o valor da transmissão"}, "hist": [{"em": D(-4) + "T15:00:00", "tipo": "reuniao", "txt": "Reunião: querem 3 câmeras e telão"}]},
        {"id": "ld_2", "nome": "Rafael Costa", "tel": "(31) 90000-1002", "servico": "Casamento", "origem": "Instagram", "etapa": "proposta", "criadoEm": D(-9),
         "etapas": {"novo": D(-9), "conversa": D(-8), "proposta": D(-6)}, "valor": 7800, "dataEvento": D(95), "hist": [{"em": D(-6) + "T10:00:00", "tipo": "whatsapp", "txt": "WhatsApp: envio da proposta"}]},
        {"id": "ld_3", "nome": "Júlia Martins", "empresa": "Colégio Horizonte", "tel": "(31) 90000-1003", "servico": "Formatura", "origem": "Site", "etapa": "novo", "criadoEm": D(-1), "etapas": {"novo": D(-1)}, "hist": []},
        {"id": "ld_4", "nome": "Marcelo Antunes", "tel": "(31) 90000-1004", "servico": "Show", "origem": "TikTok", "etapa": "conversa", "criadoEm": D(-3), "etapas": {"novo": D(-3), "conversa": D(-2)},
         "valor": 5500, "prox": {"data": D(2), "oque": "Mandar proposta"}, "hist": [{"em": D(-2) + "T09:00:00", "tipo": "ligacao", "txt": "Ligação: show em março, 600 pessoas"}]},
        {"id": "ld_5", "nome": "Cliente Alfa", "tel": "(31) 3000-0000", "servico": "Corporativo", "origem": "Cliente antigo", "etapa": "fechado", "criadoEm": D(-40), "fechadoEm": D(-30),
         "etapas": {"novo": D(-40), "proposta": D(-35), "fechado": D(-30)}, "valor": 8500, "dataEvento": D(-5), "eventoId": 500, "hist": []},
        {"id": "ld_6", "nome": "Sandra Lopes", "tel": "(31) 90000-1006", "servico": "Aniversário", "origem": "Instagram", "etapa": "perdido", "criadoEm": D(-25), "perdidoEm": D(-15),
         "motivoPerda": "Preço", "etapas": {"novo": D(-25), "proposta": D(-20), "perdido": D(-15)}, "valor": 2800, "hist": []}],
    "mkt_redes": [{"id": "rd_a", "mes": (hoje.replace(day=1) - datetime.timedelta(days=60)).strftime("%Y-%m"), "rede": "Instagram", "seguidores": 1840, "alcance": 9200},
                  {"id": "rd_b", "mes": (hoje.replace(day=1) - datetime.timedelta(days=30)).strftime("%Y-%m"), "rede": "Instagram", "seguidores": 1985, "alcance": 12400},
                  {"id": "rd_c", "mes": (hoje.replace(day=1) - datetime.timedelta(days=60)).strftime("%Y-%m"), "rede": "TikTok", "seguidores": 620, "alcance": 15800},
                  {"id": "rd_d", "mes": (hoje.replace(day=1) - datetime.timedelta(days=30)).strftime("%Y-%m"), "rede": "TikTok", "seguidores": 910, "alcance": 31000}],
    "mkt_config": [{"id": "cfg_assinatura", "valor": "Equipe da Produtora Exemplo"}],
}


class Quieto(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def servidor():
    os.chdir(RAIZ)
    socketserver.TCPServer.allow_reuse_address = True
    s = socketserver.TCPServer(("127.0.0.1", PORTA), Quieto)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    return s


def rota(r):
    u = r.request.url
    if "127.0.0.1" in u:
        return r.continue_()
    if "supabase-js" in u:
        return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u:
        return r.fulfill(body=STUB_PDF, content_type="application/javascript")
    return r.abort()


def main():
    os.makedirs(SAIDA, exist_ok=True)
    srv = servidor()
    base = f"http://127.0.0.1:{PORTA}/"
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox", "--lang=pt-BR"])

        def pagina(w=1280, h=860):
            c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, service_workers="block", locale="pt-BR")
            pg = c.new_page(); pg.route("**/*", rota)
            pg.goto(base + "termos.html")
            pg.evaluate("s=>{localStorage.clear();for(const k in s) localStorage.setItem('bw_'+k+'_v1', JSON.stringify(s[k]));"
                        "sessionStorage.setItem('bwsync_aviso','1');localStorage.setItem('ui_colap', JSON.stringify({equipes:true,colabs:true,pgs:true,custos_ev:true}))}", SEED)
            return c, pg

        def foto(pg, alvo, nome, pad=10):
            el = pg.locator(alvo).first; el.scroll_into_view_if_needed(); pg.wait_for_timeout(250)
            bb = el.bounding_box()
            pg.screenshot(path=os.path.join(SAIDA, nome), clip={"x": max(0, bb["x"] - pad), "y": max(0, bb["y"] - pad),
                          "width": bb["width"] + 2 * pad, "height": min(bb["height"] + 2 * pad, 1800)})

        # 1) Início com a agenda (tela inteira do computador)
        c, pg = pagina(); pg.goto(base + "index.html"); pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(SAIDA, "inicio-agenda.png"))
        foto(pg, ".bw-acoes", "inicio-atalhos.png")
        pg.click(f'[data-dia="{D(1)}"]'); pg.wait_for_timeout(500)
        pg.click('[data-tile="conta"]'); pg.wait_for_timeout(300)
        foto(pg, ".ag-folha", "agenda-folha.png", 4)
        pg.click("[data-fechar]"); pg.wait_for_timeout(300)
        pg.fill("#agMagica", "dentista sexta 15h"); pg.wait_for_timeout(200)
        foto(pg, ".ag-magica", "agenda-magica.png", 4)
        pg.screenshot(path=os.path.join(SAIDA, "agenda-magica-dica.png"), clip={**{k: v for k, v in pg.locator(".ag-magica").bounding_box().items()}, "height": 80})
        c.close()
        # 2) Início no celular
        c, pg = pagina(390, 844); pg.goto(base + "index.html"); pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(SAIDA, "inicio-celular.png"))
        c.close()
        # 3) Gestão de pessoas — equipes com ALTERAR, VEÍCULOS e PDFs
        c, pg = pagina(); pg.goto(base + "equipe.html"); pg.wait_for_timeout(1200)
        pg.click('[data-eqveic="10"]'); pg.wait_for_timeout(300)
        foto(pg, "#eqEquipesBox .card", "pessoas-equipes.png")
        c.close()
        # 4) Eventos — dossiê: equipe + PDF com opções
        c, pg = pagina(); pg.goto(base + "eventos.html"); pg.wait_for_timeout(1200)
        pg.evaluate("window.__evAbrir('500')"); pg.wait_for_timeout(500)
        pg.click("#dPDF"); pg.wait_for_timeout(300)
        pg.click('#dPdfOpcoes [data-atalho="1"]'); pg.wait_for_timeout(200)
        foto(pg, "#dPdfOpcoes", "evento-pdf-opcoes.png")
        foto(pg, "#evDossie div:has(> h3:text-is('Equipe (da Gestão de Pessoas) — Equipe Convenção'))", "evento-equipe.png")
        pg.goto(base + "eventos.html"); pg.wait_for_timeout(1200)
        pg.click("#evRelAnual"); pg.wait_for_timeout(300); pg.click('#relAnualMsg [data-atalho="2"]'); pg.wait_for_timeout(200)
        foto(pg, "#relAnualMsg", "relatorio-gestao.png")
        c.close()
        # 5) Fluxo de caixa — aba Cachês e custos
        c, pg = pagina(); pg.goto(base + "custos.html"); pg.wait_for_timeout(1200)
        foto(pg, ".bw-cambio-abas", "fluxo-abas.png", 6)
        foto(pg, "#pagBox", "custos-cache.png")
        pg.click('[data-rapido="Combustível"]'); pg.fill("#ctVal", "120"); pg.wait_for_timeout(150)
        foto(pg, "#custoBox .card", "custos-evento.png")
        foto(pg, "#finBox", "custos-pagamentos.png")
        c.close()
        # 6) CRM — painel, funil, ficha, agente, indicadores
        c, pg = pagina(); pg.goto(base + "crm.html"); pg.wait_for_timeout(1200)
        pg.screenshot(path=os.path.join(SAIDA, "crm-painel.png"))
        pg.goto(base + "captacao.html"); pg.wait_for_timeout(1200)
        foto(pg, "#agente", "crm-agente.png")
        foto(pg, "#funil", "crm-funil.png")
        pg.goto(base + "captacao.html?lead=ld_1"); pg.wait_for_timeout(900)
        foto(pg, ".crm-caixa", "crm-ficha.png", 4)
        pg.goto(base + "captacao.html#colar"); pg.wait_for_timeout(800)
        pg.fill("#cTxt", "Oi! Aqui é a Ana, da Construtora Alfa. Queria orçamento de transmissão ao vivo da convenção dia 12/12 no Hotel Ouro Minas, umas 300 pessoas. Meu zap é (31) 98888-7777")
        foto(pg, ".crm-caixa", "crm-colar.png", 4)
        pg.goto(base + "resultados.html"); pg.wait_for_timeout(1200)
        foto(pg, ".tf-card", "crm-indicadores.png")
        foto(pg, ".r-duas", "crm-funil-perda.png")
        foto(pg, "#redes", "crm-redes.png")
        c.close()
        # 7) Editor de fotos (foto gerada na hora: gradiente + texto)
        c, pg = pagina(); pg.goto(base + "fotos.html"); pg.wait_for_timeout(800)
        pg.evaluate("""(async()=>{const c=document.createElement('canvas');c.width=3000;c.height=2000;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,3000,2000);
          g.addColorStop(0,'#3a2a5a');g.addColorStop(.5,'#c0623a');g.addColorStop(1,'#f2c063');x.fillStyle=g;x.fillRect(0,0,3000,2000);
          x.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<14;i++){x.beginPath();x.arc(200+i*210,1500+Math.sin(i)*120,90,0,7);x.fill();}
          x.fillStyle='#fff';x.font='bold 160px sans-serif';x.fillText('PALCO',1100,900);
          const f=await new Promise(r=>c.toBlob(b=>r(new File([b],'palco.jpg',{type:'image/jpeg'})),'image/jpeg',.9));
          const l=document.createElement('canvas');l.width=500;l.height=120;const lx=l.getContext('2d');lx.fillStyle='#fff';lx.font='bold 84px sans-serif';lx.fillText('EXEMPLO',10,95);
          const lb=await new Promise(r=>l.toBlob(r,'image/png'));const dt=new DataTransfer();dt.items.add(new File([lb],'logo.png',{type:'image/png'}));
          const i=document.getElementById('logoArq');i.files=dt.files;i.dispatchEvent(new Event('change'));
          await window.__fotos.adicionar([f,f]);window.__ok=1;})()""")
        pg.wait_for_function("window.__ok===1", timeout=20000)
        pg.click('#fmtChips [data-v="4:5"]'); pg.click('[data-aba="borda"]'); pg.click('#bordaEst [data-v="faixa"]'); pg.fill("#bordaTxt", "@produtoraexemplo")
        pg.click('[data-aba="filtros"]'); pg.wait_for_timeout(400); pg.click('[data-filtro="dourado"]'); pg.wait_for_timeout(600)
        foto(pg, ".fx-grade", "fotos-editor.png")
        c.close()
        b.close()
    srv.shutdown()
    print("Telas salvas em", SAIDA, sorted(os.listdir(SAIDA)))


if __name__ == "__main__":
    main()
