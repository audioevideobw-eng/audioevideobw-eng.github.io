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
        b = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])

        def pagina(w=1280, h=860):
            c = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, service_workers="block")
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
        b.close()
    srv.shutdown()
    print("Telas salvas em", SAIDA, sorted(os.listdir(SAIDA)))


if __name__ == "__main__":
    main()
