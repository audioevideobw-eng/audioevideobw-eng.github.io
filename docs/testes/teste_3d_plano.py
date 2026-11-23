#!/usr/bin/env python3
"""Teste do PLANO DO PROJETO 3D (ESTÚDIO 3D, 20/11): o sistema lê a placa de vídeo do usuário e,
para cada tipo de projeto (logo, palco, peça, avatar, jogo, pesado), diz o que dá para fazer no
aparelho, o que precisa de IA e de quanta VRAM, e o que só sai na nuvem. 1280 e 390 px.
Uso (na raiz): python3 docs/testes/teste_3d_plano.py"""
import os, http.server, socketserver, threading
from playwright.sync_api import sync_playwright
import os as _o, sys as _s; _s.path.insert(0, _o.path.dirname(_o.path.abspath(__file__))); import _sem_sri  # noqa: selo SRI fora só no servidor de teste (23/11)
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")); PORTA = 8867
STUB = "window.supabase={createClient:function(){return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},from(){const q={select(){return q},eq(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};return q},rpc:async()=>({data:null,error:null})}}};"
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ); socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"; FORA = []
def rota(r):
    u = r.request.url
    if "127.0.0.1" in u or u.startswith(("blob:", "data:", "about:")): return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB, content_type="application/javascript")
    if "fonts.g" in u: return r.fulfill(body="", content_type="text/css")
    FORA.append(u); return r.abort()
falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)
VER = """(vram) => { const m = BW3DPlano.maquina(); m.placa.vram = vram; m.placa.marca = 'nvidia'; m.placa.integrada = vram === 0;
  const o = {}; BW3DPlano.PROJETOS.forEach(p => { const r = BW3DPlano.avaliar(p.id, m); o[p.id] = [r.nivel, r.geradores.map(g => g.id)]; }); return o; }"""
with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for largura, altura in ((1280, 950), (390, 844)):
        print(f"\n=== {largura}px ===")
        FORA.clear(); ctx = b.new_context(viewport={"width": largura, "height": altura}, service_workers="block", has_touch=largura < 500)
        ctx.route("**/*", rota); pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "3d.html"); pg.wait_for_function("window.BW3DEditor && window.BW3DPlano"); pg.wait_for_timeout(500)
        ok(pg.evaluate("BW3DEditor.projeto().modo") == "plano", "quem chega pela primeira vez cai no PLANO DO PROJETO")
        ok(pg.evaluate(SEM := "document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 0, "abre sem estouro")
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        ok(pg.locator("[data-pj]").count() == 6, "mostra os 6 tipos de projeto")
        ok(pg.locator('[data-pj="logo"]').is_visible(), "os tipos de projeto estão VISÍVEIS (não atrás de uma seta fechada)")
        ok(pg.locator("#d3Painel h4").first.inner_text().strip().upper().startswith("O QUE VOU FAZER"), "o título da seção é O QUE VOU FAZER?, não O MODELO")
        # mesmo com a seta do MODELO 3D fechada antes, o plano continua aberto
        pg.evaluate("""() => { const d = JSON.parse(localStorage.getItem('ui_dobras') || '{}'); d.d3obj = 'f'; localStorage.setItem('ui_dobras', JSON.stringify(d)); }""")
        pg.reload(); pg.wait_for_function("window.BW3DEditor && window.BW3DPlano"); pg.wait_for_timeout(600)
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        ok(pg.locator('[data-pj="logo"]').is_visible(), "com a seta de O MODELO fechada, o plano continua à vista")
        ok("Placa" in pg.inner_text("#d3Painel") or "placa" in pg.inner_text("#d3Painel").lower(), "diz qual placa de vídeo leu")
        # vereditos por tamanho de placa
        v0 = pg.evaluate(VER, 0); v8 = pg.evaluate(VER, 8); v12 = pg.evaluate(VER, 12); v24 = pg.evaluate(VER, 24)
        ok(v0["logo"][0] == "ok" and v0["evento"][0] == "ok", "logo 3D e maquete de palco: dá no aparelho mesmo sem placa")
        ok(v0["avatar"][0] == "nuvem" and v0["hard"][0] == "nuvem", "sem placa, avatar e trabalho pesado vão para a nuvem")
        ok(v8["avatar"][0] == "ok" and "hunyuan-mini" in v8["avatar"][1], "8 GB: a forma já sai no aparelho (modelo pequeno do Hunyuan3D)")
        ok(v8["hard"][0] == "quase", "8 GB: trabalho pesado é parte aqui, parte na nuvem")
        ok(v12["avatar"][0] == "ok" and "hunyuan-forma" in v12["avatar"][1], "12 GB: roda o Hunyuan3D 2.1 (forma)")
        ok(v24["hard"][0] == "ok" and "trellis2" in v24["hard"][1], "24 GB: roda o TRELLIS.2 e encara o trabalho pesado")
        amd = pg.evaluate("""(()=>{const m=BW3DPlano.maquina(); m.placa.vram=24; m.placa.marca='amd'; m.placa.talvezOutra=false; m.placa.integrada=false;
          const r=BW3DPlano.avaliar('avatar',m); return [r.nivel, r.porque];})()""")
        ok(amd[0] == "nuvem" and "CUDA" in amd[1], f"placa AMD de 24 GB: avisa que os geradores pedem CUDA ({amd[1][:40]}…)")
        # escolher um projeto mostra o caminho e o atalho
        pg.click('[data-pj="logo"]'); pg.wait_for_timeout(400)
        txt = pg.inner_text("#d3Painel")
        ok("O CAMINHO" in txt and "O QUE VOCÊ ENTREGA" in txt, "ao escolher o projeto, mostra o caminho e o que se entrega")
        pg.click('[data-pj="avatar"]'); pg.wait_for_timeout(400)
        t_av = pg.inner_text("#d3Painel")
        ok("MODELOS PRONTOS" in t_av and "Pixabay" in t_av and "Mixamo" in t_av, "oferece as bibliotecas de modelos prontos e grátis")
        ok("revender o arquivo" in t_av, "diz a regra da licença: usar no trabalho sim, revender o arquivo não")
        pg.click('[data-pj="logo"]'); pg.wait_for_timeout(400)
        ok(pg.locator('[data-ir="logo"]').count() == 1, "tem o atalho que abre a ferramenta certa")
        pg.click('[data-ir="logo"]'); pg.wait_for_timeout(400)
        ok(pg.evaluate("BW3DEditor.projeto().modo") == "logo", "o atalho leva para o LOGO 3D")
        # notebook: o navegador vê o vídeo integrado — a tela avisa e deixa dizer a placa de verdade
        pg.click('#d3Modos [data-m="plano"]'); pg.wait_for_timeout(300)
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        intg = pg.evaluate("""(()=>{const m=BW3DPlano.maquina(); m.placa.talvezOutra=true; m.placa.soNavegador='Intel(R) UHD Graphics';
          const r=BW3DPlano.avaliar('avatar',m); return r.porque;})()""")
        ok("integrado" in intg.lower() and "NVIDIA" in intg, "placa integrada: avisa que em notebook o navegador mostra o vídeo integrado")
        ok(pg.locator("#d3PlacaMarca").count() == 1, "dá para dizer a MARCA da placa, não só a memória")
        pg.select_option("#d3PlacaMarca", "nvidia"); pg.wait_for_timeout(300)
        pg.select_option("#d3Vram", "6"); pg.wait_for_timeout(400)
        pg.click('[data-pj="avatar"]'); pg.wait_for_timeout(400)
        t6 = pg.inner_text("#d3Painel")
        ok("mini" in t6.lower(), "RTX de 6 GB: oferece o modelo pequeno do Hunyuan3D (só a forma)")
        ok(pg.evaluate("JSON.parse(localStorage.getItem('ui_3d_maquina')||'{}').marca") == "nvidia", "guarda a marca informada")
        # dentro do app BW aparece o GERADOR 3D do próprio PC
        pg.evaluate("""() => { window.bwNode = async (acao) => acao === 'g3dEstado'
          ? { ok: true, valor: { instalado: false, feitas: 0, total: 9, modelo: '', raiz: '/x/.bw-reels/3d', licenca: { url: 'https://huggingface.co/tencent/x', nome: 'Tencent', resumo: 'x' }, etapas: {}, log: [] } }
          : acao === 'maquina' ? { ok: true, valor: { nome: 'NVIDIA GeForce RTX 3050 6GB Laptop GPU', vram: 6, marca: 'nvidia', ram: 16, nucleos: 12, via: 'app' } }
          : { ok: true, valor: true }; }""")
        pg.click('#d3Modos [data-m="plano"]'); pg.wait_for_timeout(300)
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        pg.click('[data-pj="avatar"]'); pg.wait_for_timeout(700)
        t_g3 = pg.inner_text("#d3Painel")
        ok("INSTALAR O GERADOR 3D" in t_g3.upper(), "no app BW, oferece instalar a IA de 3D no próprio PC")
        ok(pg.locator("#d3G3dAbrir").count() == 1, "o botão do gerador 3D aparece")
        pg.click('[data-pj="logo"]'); pg.wait_for_timeout(500)
        ok(pg.locator("#d3G3d").count() == 0, "projeto que não usa IA (logo) não mostra o gerador")
        # dentro do app BW, o PC responde com a placa de verdade
        pg.evaluate("""() => { localStorage.removeItem('ui_3d_maquina');
          window.bwNode = async (acao) => acao === 'maquina'
            ? { ok: true, valor: { nome: 'NVIDIA GeForce RTX 3050 6GB Laptop GPU', vram: 6, marca: 'nvidia', nucleos: 12, ram: 16, via: 'app' } }
            : { ok: false, erro: 'recusado' }; }""")
        app = pg.evaluate("async () => { const g = await BW3DPlano.doApp(); const m = BW3DPlano.maquina(); return [g && g.nome, m.placa.vram, m.placa.marca, m.placa.doApp === true, BW3DPlano.resumo(m)]; }")
        ok(app[1] == 6 and app[2] == "nvidia" and app[3], f"no app BW a placa vem do PC, não do navegador ({app[0]})")
        ok("app BW" in app[4], "o resumo diz que a placa foi lida pelo app BW")
        appv = pg.evaluate("""() => { const m = BW3DPlano.maquina(); const r = BW3DPlano.avaliar('avatar', m); return [r.nivel, r.geradores.map(g=>g.id)]; }""")
        ok(appv[0] == "ok" and "hunyuan-mini" in appv[1], "com a placa do PC o veredito sai certo sem o usuário escolher nada")
        pg.evaluate("() => { delete window.bwNode; localStorage.removeItem('ui_3d_maquina'); }")
        # a memória informada pelo usuário manda e fica guardada
        pg.click('#d3Modos [data-m="plano"]'); pg.wait_for_timeout(300)
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        pg.select_option("#d3Vram", "24"); pg.wait_for_timeout(400)
        ok(pg.evaluate("JSON.parse(localStorage.getItem('ui_3d_maquina')||'{}').vram") == 24, "guarda a memória de vídeo que o usuário informou")
        pg.reload(); pg.wait_for_function("window.BW3DEditor && window.BW3DPlano"); pg.wait_for_timeout(600)
        if largura < 500: pg.click('#d3AbasCel [data-aba="objeto"]'); pg.wait_for_timeout(150)
        ok(pg.evaluate("BW3DPlano.maquina().placa.vram") == 24, "depois de recarregar, o plano continua com a placa informada")
        ok(not erros, f"0 erros de JavaScript ({erros[:2]})")
        ok(not FORA, f"nada sai do aparelho ({FORA[:3]})")
        ctx.close()
    b.close()
srv.shutdown()
print("\n" + ("✅ PLANO DO PROJETO: 0 falhas" if not falhas else f"❌ {len(falhas)} falha(s):\n - " + "\n - ".join(falhas)))
raise SystemExit(1 if falhas else 0)
