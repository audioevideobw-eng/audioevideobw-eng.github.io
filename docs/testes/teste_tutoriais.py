#!/usr/bin/env python3
"""Teste da aba TUTORIAIS e de MINHAS IAS (25/11/2026; dono: "cada usuário pode usar a sua própria conta… pode usar com limites sem conectar
ou com conexão… uma aba só com tutoriais, passo a passo, com vídeos de demonstração"). 1280 e 390 px.
1) TUTORIAIS: lista por assunto, busca, chips, abrir pelo cartão e por ?t=, player (passo muda sozinho, cursor anda até o botão, ‹ ›),
   voltar pelo histórico, sem erro e sem estouro.
2) CONECTAR (funções SIMULADAS): colar o token da Cloudflare → conecta sozinho e o app descobre o ID da conta; chave guardada SÓ em
   ui_minhas_ias com o dono; a tela mostra só os 4 últimos; USAR A DA PLATAFORMA / USAR MINHA CONTA; outra conta no mesmo aparelho não usa;
   desconectar apaga. Gemini idem, com chave recusada mostrando o motivo.
3) As pontes: fotos-nuvem.js manda x-bw-cf-* só quando está em "minha conta"; bw-decupar.js manda x-bw-gemini igual.
Uso (na raiz): python3 docs/testes/teste_tutoriais.py"""
import os, json
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_arrastar.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8868", "PORTA = 8893"))

CF_TOKEN = "cfTOKENdeTESTE_1234567890abcdefWXYZ"; CF_CONTA = "0123456789abcdef0123456789abcdef"; GM = "AIzaTESTEchaveGoogle_0123456789abcdEFGH"
def sessao(uid): return ("window.BWSync={cliente:function(){return{auth:{getSession:async function(){return{data:{session:{access_token:'tok',user:{id:'%s',email:'t@t'}}}}}}}}};" % uid)
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for W, H in ((1280, 900), (390, 844)):
        print(f"\n=== {W}px ===")
        ctx = b.new_context(viewport={"width": W, "height": H}, service_workers="block", has_touch=W < 500)
        ped = []
        def rota2(r):
            u = r.request.url
            if "functions/v1/bw-ia-imagem" in u or "functions/v1/bw-ia-video" in u:
                h = r.request.headers; corpo = r.request.post_data or ""
                ped.append({"u": u, "h": dict(h)})
                if '"testar"' in corpo:
                    if "bw-ia-imagem" in u:
                        ok_ = h.get("x-bw-cf-token") == CF_TOKEN
                        j = {"ok": True, "conta": CF_CONTA} if ok_ else {"ok": False, "motivo": "a Cloudflare não aceitou esse token com essa conta"}
                    else:
                        j = {"ok": True} if h.get("x-bw-gemini") == GM else {"ok": False, "motivo": "o Google não aceitou essa chave (400)"}
                    return r.fulfill(status=200, body=json.dumps(j), content_type="application/json", headers={"Access-Control-Allow-Origin": "*"})
                if "bw-ia-imagem" in u: return r.fulfill(status=200, body=json.dumps({"imagem": "iVBORw0KGgo=", "sua": "x-bw-cf-token" in h}), content_type="application/json", headers={"Access-Control-Allow-Origin": "*"})
                return r.fulfill(status=200, body=json.dumps({"resumo": "", "trechos": [{"ini": 0, "fim": 2, "tipo": "fala", "nota": 5}], "sua": "x-bw-gemini" in h}), content_type="application/json", headers={"Access-Control-Allow-Origin": "*"})
            return rota(r)
        ctx.route("**/*", rota2)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e)))
        pg.add_init_script("if(!sessionStorage.getItem('_lmp')){sessionStorage.setItem('_lmp','1');localStorage.removeItem('ui_minhas_ias')}")
        pg.goto(BASE + "tutoriais.html"); pg.wait_for_selector(".tu-card", timeout=8000)
        n = pg.locator(".tu-card").count(); ok(n >= 10, f"lista com {n} tutoriais")
        ok(pg.locator(".tu-cat").count() == 5, "5 assuntos organizados (Começar, Conectar minhas IAs, Editor de vídeo, Fotos e artes, Gestão)")
        pg.fill("#tuBusca", "decupar"); pg.wait_for_timeout(150)
        ok(1 <= pg.locator(".tu-card").count() <= 3 and "Decupar" in pg.locator(".tu-card").first.inner_text(), "busca 'decupar' acha o tutorial certo")
        pg.fill("#tuBusca", "xyzabc"); pg.wait_for_timeout(100); ok(pg.locator(".tu-vazio").is_visible(), "busca sem resultado avisa")
        pg.fill("#tuBusca", ""); pg.click('.tu-chips [data-cat="ias"]'); pg.wait_for_timeout(100)
        ok(pg.locator(".tu-cat").count() == 1 and pg.locator(".tu-card").count() == 3, "chip CONECTAR MINHAS IAS filtra (3)")
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(sw <= 0, f"lista sem estouro lateral ({sw})")
        # abrir o tutorial pelo cartão
        pg.click('.tu-chips [data-cat=""]'); pg.click('.tu-card[data-t="tela-inicial"]'); pg.wait_for_selector("#tuDet:not([hidden])")
        ok("t=tela-inicial" in pg.url, "abrir muda o endereço (?t=) — dá para mandar o link")
        ok(pg.locator(".tu-passo").count() == 4 and pg.locator(".tu-passo.on").count() == 1, "passos numerados, o 1º aceso")
        pg.wait_for_timeout(1700)
        ok(pg.locator(".tu-item.toque").count() == 1, "demonstração: o cursor toca no botão certo")
        pg.wait_for_timeout(3200)
        ok(pg.evaluate("[...document.querySelectorAll('.tu-passo')].findIndex(e=>e.classList.contains('on'))") >= 1, "o player passa para o próximo passo sozinho")
        pg.click("#tuPlay"); pg.click("#tuAnt"); i0 = pg.evaluate("[...document.querySelectorAll('.tu-passo')].findIndex(e=>e.classList.contains('on'))")
        pg.click("#tuProx"); i1 = pg.evaluate("[...document.querySelectorAll('.tu-passo')].findIndex(e=>e.classList.contains('on'))")
        ok(i1 == i0 + 1, "‹ › andam um passo")
        pg.locator('.tu-passo[data-p="3"]').click(); ok("4 · " in pg.inner_text("#tuLegenda"), "tocar num passo da lista mostra esse passo")
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(sw <= 0, f"tutorial sem estouro lateral ({sw})")
        pg.go_back(); pg.wait_for_selector("#tuIndice:not([hidden])"); ok(pg.locator("#tuDet").is_hidden(), "voltar do navegador volta para a lista")

        # ---------- conectar a Cloudflare ----------
        ctx.add_init_script(sessao("dono-A")); pg.goto(BASE + "tutoriais.html?t=conectar-cloudflare"); pg.wait_for_selector('[data-mia="cf"] [data-c="seg"]', timeout=5000)
        ok("plataforma" in pg.inner_text('[data-mia="cf"] .mia-st').lower(), "sem conectar: diz que usa a da plataforma (com limite)")
        a = pg.locator('[data-mia="cf"] [data-a="abrir"]'); ok("dash.cloudflare.com" in (a.get_attribute("href") or "") and a.get_attribute("target") == "_blank", "botão abre a Cloudflare direto em Workers AI (nova aba)")
        ped.clear(); inp = pg.locator('[data-mia="cf"] [data-c="seg"]'); inp.focus()
        pg.evaluate("(t)=>{const i=document.querySelector('[data-mia=cf] [data-c=seg]'); i.value=t; i.dispatchEvent(new Event('paste'))}", CF_TOKEN)
        pg.wait_for_selector('[data-mia="cf"] .mia.ligado', timeout=4000)
        ok(True, "colar o token CONECTA SOZINHO (sem tocar em conectar)")
        m = json.loads(pg.evaluate("localStorage.getItem('ui_minhas_ias')"))
        ok(m["dono"] == "dono-A" and m["cf"]["token"] == CF_TOKEN and m["cf"]["conta"] == CF_CONTA, "ID da conta descoberto sozinho e guardado com o dono")
        ok(ped and ped[-1]["h"].get("x-bw-cf-token") == CF_TOKEN and "x-bw-cf-conta" not in ped[-1]["h"], "teste mandou só o token (a função acha a conta)")
        txt = pg.inner_text('[data-mia="cf"]'); ok(CF_TOKEN not in txt and CF_TOKEN[-4:] in txt, "a tela mostra só os 4 últimos da chave")
        ok(pg.evaluate("BWMinhasIAs.situacao('cf')") == "minha", "situação: usando a minha conta")
        others = [k for k in pg.evaluate("Object.keys(localStorage)") if CF_TOKEN in (pg.evaluate("k=>localStorage.getItem(k)", k) or "") and k != "ui_minhas_ias"]
        ok(not others, "a chave não está em nenhuma outra chave do aparelho")
        # pontes
        pg.add_script_tag(url=BASE + "assets/fotos-nuvem.js?v=4"); pg.add_script_tag(url=BASE + "assets/bw-decupar.js?v=2"); pg.wait_for_timeout(200)
        ped.clear(); r = pg.evaluate("BWFotosNuvem.arte(null,'teste',512,512,'baixo').then(x=>({e:x.erro||'',sua:x.sua}))")
        ok(ped and ped[-1]["h"].get("x-bw-cf-token") == CF_TOKEN and ped[-1]["h"].get("x-bw-cf-conta") == CF_CONTA and r["sua"], "imagem com IA vai com a MINHA conta")
        pg.click('[data-mia="cf"] [data-a="plat"]'); ok(pg.evaluate("BWMinhasIAs.situacao('cf')") == "conectada-plataforma", "USAR A DA PLATAFORMA sem desconectar")
        ped.clear(); pg.evaluate("BWFotosNuvem.arte(null,'teste',512,512,'baixo')")
        ok(ped and "x-bw-cf-token" not in ped[-1]["h"], "em 'da plataforma' a chave NÃO vai junto")
        pg.click('[data-mia="cf"] [data-a="minha"]')
        # outra conta no mesmo aparelho
        ctx.add_init_script(sessao("outra-B")); pg.reload(); pg.wait_for_selector('[data-mia="cf"] [data-c="seg"]', timeout=5000)
        ok(pg.evaluate("BWMinhasIAs.situacao('cf')") == "plataforma", "OUTRA conta no mesmo aparelho não usa a chave de quem conectou")
        pg.add_script_tag(url=BASE + "assets/fotos-nuvem.js?v=4"); ped.clear(); pg.evaluate("BWFotosNuvem.arte(null,'t',512,512,'baixo')")
        ok(ped and "x-bw-cf-token" not in ped[-1]["h"], "…e o pedido dela sai sem a chave")
        ctx.add_init_script(sessao("dono-A"))

        # ---------- Gemini ----------
        pg.goto(BASE + "tutoriais.html?t=conectar-gemini"); pg.wait_for_selector('[data-mia="gemini"] [data-c="seg"]', timeout=5000)
        ok(pg.locator(".tu-duvidas details").count() >= 3, "dúvidas comuns")
        ok("aistudio.google.com/apikey" in pg.get_attribute('[data-mia="gemini"] [data-a="abrir"]', "href"), "botão abre o Google AI Studio na página da chave")
        pg.fill('[data-mia="gemini"] [data-c="seg"]', "chave-errada-mas-com-formato-123456789"); pg.click('[data-mia="gemini"] [data-a="ligar"]')
        pg.wait_for_selector('[data-mia="gemini"] .mia-msg.erro', timeout=4000); ok("não aceitou" in pg.inner_text('[data-mia="gemini"] .mia-msg'), "chave recusada mostra o motivo e não salva")
        pg.fill('[data-mia="gemini"] [data-c="seg"]', GM); pg.click('[data-mia="gemini"] [data-a="ligar"]'); pg.wait_for_selector('[data-mia="gemini"] .mia.ligado', timeout=4000)
        m = json.loads(pg.evaluate("localStorage.getItem('ui_minhas_ias')")); ok(m["gemini"]["chave"] == GM and m["cf"]["token"] == CF_TOKEN, "Gemini conectado (Cloudflare continua)")
        pg.add_script_tag(url=BASE + "assets/bw-decupar.js?v=2")
        pg.evaluate("window.BWProxy={suporta:()=>true,fazer:async()=>({blob:new Blob([new Uint8Array(3000)],{type:'video/mp4'}),comSom:true})}")
        ped.clear(); r = pg.evaluate("BWDecupar.analisar(new Blob([1]),{dur:10}).then(x=>({e:x.erro||'',sua:x.sua}))")
        ok(ped and ped[-1]["h"].get("x-bw-gemini") == GM and r["sua"], "decupagem vai com a MINHA chave do Google")
        pg.once("dialog", lambda d: d.accept()); pg.click('[data-mia="gemini"] [data-a="sair"]'); pg.wait_for_timeout(200)
        m = json.loads(pg.evaluate("localStorage.getItem('ui_minhas_ias')") or "{}"); ok("gemini" not in m and "cf" in m, "DESCONECTAR apaga só aquela chave")
        ped.clear(); pg.evaluate("BWDecupar.analisar(new Blob([1]),{dur:10})"); ok(ped and "x-bw-gemini" not in ped[-1]["h"], "desconectado: volta para a da plataforma")
        # configurações
        pg.goto(BASE + "config.html"); pg.wait_for_selector('#cfgMinhasIas [data-mia="cf"] .mia.ligado', timeout=5000)
        ok(pg.locator('#cfgMinhasIas a[href*="tutoriais.html?t=conectar-cloudflare"]').count() == 1, "Configurações → MINHAS IAS com o painel e o link do tutorial")
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth"); ok(sw <= 0, f"configurações sem estouro lateral ({sw})")
        ok(not er, f"sem erro de JavaScript ({er[:2]})")
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s)"))
