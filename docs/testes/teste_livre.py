#!/usr/bin/env python3
"""BW LIVRE (28/11, dono: "salve e implemente esse modelo de mexer nas imagens e eixos de forma livre, assim como as janelas, em todas as
ferramentas — fluido e livre"). Confere:
  JANELAS — em Motion, Telas, Álbum 3D, Estúdio 3D e editor de vídeo a janela ganha a barra ⠿ e o canto ◢, se arrasta pela barra E pela
            área livre (nunca a partir de botão), muda de tamanho, lembra o lugar (ui_janelas) e volta lá ao abrir de novo.
  FOTOS   — alças na camada escolhida: sem tecla estica LIVRE (só a largura muda a altura relativa), com Shift mantém a proporção.
  VÍDEO   — alças no take escolhido na prévia: puxar o lado direito muda só ↔ X (c.ex), Shift muda os dois juntos; ↔/↕ no painel.
Uso (na raiz): python3 docs/testes/teste_livre.py"""
import os, sys
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "teste_video_fluidez.py")).read().split("with sync_playwright() as p:")[0].replace("PORTA = 8897", "PORTA = 8931"))
from PIL import Image, ImageDraw
F = [0]
def ok(c, t):
    print(("  ✓ " if c else "  ✗ ") + t)
    if not c: F[0] += 1
im = Image.new("RGB", (1600, 1000), (60, 90, 140)); ImageDraw.Draw(im).ellipse([500, 200, 1100, 900], fill=(200, 150, 120)); im.save(f"{TMP}/f.jpg", quality=92)
Image.new("RGB", (400, 300), (230, 60, 60)).save(f"{TMP}/camada.png")

JANELAS = [("motion.html?layout=classico", "#moFolhaExp"), ("telas.html", "#tlFolha"), ("album3d.html", "#alFolha"), ("3d.html", "#d3Folha")]

with sync_playwright() as p:
    b = p.chromium.launch(args=["--no-sandbox"])
    for larg, alt in ((1280, 820), (390, 844)):
        print(f"\n== {larg} px ==")
        ctx = b.new_context(viewport={"width": larg, "height": alt}, service_workers="block", has_touch=larg < 900); ctx.route("**/*", rota)
        pg = ctx.new_page(); er = []; pg.on("pageerror", lambda e: er.append(str(e))); pg.on("dialog", lambda d: d.accept())
        # ---------- JANELAS ----------
        for pag, sel in JANELAS:
            pg.goto(BASE + pag); pg.wait_for_timeout(1400)
            if sel == ".ve-jan": pg.wait_for_timeout(1200); pg.click("#veExportar"); pg.wait_for_timeout(500)
            if pg.locator(sel).count() == 0: ok(False, f"{pag}: janela {sel} existe"); continue
            pg.evaluate("(s) => { const f = document.querySelector(s); f.hidden = false; f.style.display = ''; }", sel); pg.wait_for_timeout(250)
            cx = pg.evaluate("(s) => { const f = document.querySelector(s), c = f.querySelector('.bwl-jan'); return !!c && !!c.querySelector(':scope > .bwl-arr') && !!c.querySelector(':scope > .bwl-tam'); }", sel)
            ok(cx, f"{pag}: a janela ganha a barra ⠿ e o canto ◢")
            if not cx: continue
            loc = pg.locator(f"{sel} .bwl-jan").first; r0 = loc.bounding_box(); a = pg.locator(f"{sel} .bwl-jan > .bwl-arr").bounding_box()
            pg.mouse.move(a["x"] + 20, a["y"] + a["height"] / 2); pg.mouse.down(); pg.mouse.move(a["x"] + 50, a["y"] + a["height"] / 2 - 30, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            r1 = loc.bounding_box()
            ok(abs(r1["x"] - r0["x"] - 30) < 6 and abs(r1["y"] - r0["y"] + 30) < 6, f"{pag}: arrasta pela barra ({r0['x']:.0f},{r0['y']:.0f} → {r1['x']:.0f},{r1['y']:.0f})")
            lx, ly = r1["x"] + 4, r1["y"] + r1["height"] * 0.55
            livre = pg.evaluate("(q) => { const e = document.elementFromPoint(q[0], q[1]); return !!e && !e.closest('button,input,a,canvas,label,select,textarea,[data-a]'); }", [lx, ly])
            pg.mouse.move(lx, ly); pg.mouse.down(); pg.mouse.move(lx - 20, ly - 15, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            r2 = loc.bounding_box()
            ok(livre and abs(r2["x"] - r1["x"] + 20) < 6, f"{pag}: arrasta pela área livre ({r1['x']:.0f} → {r2['x']:.0f})")
            t = pg.locator(f"{sel} .bwl-jan > .bwl-tam").bounding_box()
            pg.mouse.move(t["x"] + 6, t["y"] + 6); pg.mouse.down(); pg.mouse.move(t["x"] - 40, t["y"] - 40, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            r3 = loc.bounding_box()
            ok(r3["width"] < r2["width"] - 25, f"{pag}: o ◢ muda o tamanho ({r2['width']:.0f} → {r3['width']:.0f})")
            bt = pg.locator(f"{sel} .bwl-jan button:visible")
            if bt.count():
                bb = bt.first.bounding_box(); pg.evaluate("(s) => document.querySelector(s).addEventListener('click', e => e.preventDefault(), true)", sel)
                pg.mouse.move(bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2); pg.mouse.down(); pg.mouse.move(bb["x"] + bb["width"] / 2 + 30, bb["y"] + bb["height"] / 2, steps=4); pg.mouse.up(); pg.wait_for_timeout(150)
                r4 = loc.bounding_box() if loc.is_visible() else r3
                ok(abs(r4["x"] - r3["x"]) < 2, f"{pag}: a partir de um botão a janela NÃO se move")
            guard = pg.evaluate("() => Object.keys(JSON.parse(localStorage.getItem('ui_janelas') || '{}'))")
            ok(any((sel.lstrip("#") if sel[0] == "#" else "veExport") in k or sel.lstrip(".") in k for k in guard), f"{pag}: o lugar fica guardado no aparelho")
            pg.reload(); pg.wait_for_timeout(1300)
            if sel == ".ve-jan": pg.wait_for_timeout(1200); pg.click("#veExportar"); pg.wait_for_timeout(500)
            pg.evaluate("(s) => { const f = document.querySelector(s); f.hidden = false; }", sel); pg.wait_for_timeout(300)
            r5 = pg.locator(f"{sel} .bwl-jan").first.bounding_box()
            ok(r5 and abs(r5["x"] - r3["x"]) < 4 and abs(r5["width"] - r3["width"]) < 4, f"{pag}: ao abrir de novo volta no mesmo lugar e tamanho")
        # ---------- FOTOS: alças livres ----------
        pg.goto(BASE + "fotos.html"); pg.wait_for_timeout(800)
        pg.set_input_files("#arquivos", [f"{TMP}/f.jpg"]); pg.wait_for_timeout(1500)
        pg.evaluate("async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#e33'; x.fillRect(0, 0, 400, 300); const b = await new Promise(r => c.toBlob(r)); await __fotos.addImagemCamada(new File([b], 'c.png', { type: 'image/png' })); }")
        pg.wait_for_timeout(900)
        tem = pg.evaluate("() => (__fotos.FOTOS[0].adesivos || []).length")
        ok(tem >= 1, "editor de fotos: camada de imagem criada")
        if larg >= 900 and tem:
            pg.evaluate("__fotos.aba('camadas')"); pg.wait_for_timeout(600)
            vis = pg.evaluate("() => { const b = __fotosAlcas.el; return !b.hidden && b.getBoundingClientRect().width > 10; }")
            ok(vis, "editor de fotos: a camada escolhida mostra as 8 alças")
            a0 = pg.evaluate("() => { const a = __fotos.FOTOS[0].adesivos[0]; return [a.tam, a.alt == null ? 100 : a.alt]; }")
            e = pg.locator(".bwl-caixa .bwl-alca[data-q=e]").bounding_box()
            pg.mouse.move(e["x"] + e["width"] / 2, e["y"] + e["height"] / 2); pg.mouse.down(); pg.mouse.move(e["x"] + 60, e["y"] + e["height"] / 2, steps=8); pg.mouse.up(); pg.wait_for_timeout(600)
            a1 = pg.evaluate("() => { const a = __fotos.FOTOS[0].adesivos[0]; return [a.tam, a.alt == null ? 100 : a.alt]; }")
            ok(a1[0] > a0[0] and a1[1] < a0[1], f"editor de fotos: o lado direito estica LIVRE — mais largo, altura igual ({a0} → {a1})")
            s = pg.locator(".bwl-caixa .bwl-alca[data-q=se]").bounding_box()
            pg.keyboard.down("Shift"); pg.mouse.move(s["x"] + s["width"] / 2, s["y"] + s["height"] / 2); pg.mouse.down(); pg.mouse.move(s["x"] + 50, s["y"] + 90, steps=8); pg.mouse.up(); pg.keyboard.up("Shift"); pg.wait_for_timeout(600)
            a2 = pg.evaluate("() => { const a = __fotos.FOTOS[0].adesivos[0]; return [a.tam, a.alt == null ? 100 : a.alt]; }")
            ok(a2[0] > a1[0] and abs(a2[1] - a1[1]) <= 2, f"editor de fotos: com Shift fica proporcional ({a1} → {a2})")
        # ---------- VÍDEO: alças e eixos livres ----------
        if larg >= 900:
            pg.goto(BASE + "video.html?layout=classico"); pg.wait_for_function("window.__veProntoOk === true", timeout=15000)
            with pg.expect_file_chooser(timeout=5000) as fc: pg.click("#veImportar")
            fc.value.set_files([f"{TMP}/azul.webm"]); pg.wait_for_function("Object.keys(__video.MID).length>=1", timeout=15000); pg.wait_for_timeout(300)
            pg.evaluate("document.querySelector('#veLib [data-mid]').click()"); pg.wait_for_timeout(500)
            pg.evaluate("() => { const c = __video.P().clips[0]; c.encaixe = 'caber'; c.esc = 60; __video.irPara(1); __video.sel(c.id); }"); pg.wait_for_timeout(700)
            pg.click("#veExportar"); pg.wait_for_timeout(500)
            ok(pg.evaluate("() => { const c = document.querySelector('.ve-jan .bwl-jan'); return !!c && !!c.querySelector('.bwl-tam'); }"), "editor de vídeo: a janela de exportar também é livre (canto ◢)")
            tb = pg.locator(".ve-jan .ve-jan-t b").bounding_box(); j0 = pg.locator(".ve-jan .bwl-jan").bounding_box()
            pg.mouse.move(tb["x"] + 5, tb["y"] + 5); pg.mouse.down(); pg.mouse.move(tb["x"] + 45, tb["y"] + 35, steps=6); pg.mouse.up(); pg.wait_for_timeout(200)
            j1 = pg.locator(".ve-jan .bwl-jan").bounding_box()
            ok(abs(j1["x"] - j0["x"] - 40) < 6, f"editor de vídeo: a janela se arrasta pela barra de título ({j0['x']:.0f} → {j1['x']:.0f})")
            pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
            if pg.locator(".ve-jan").count(): pg.evaluate("document.querySelectorAll('.ve-jan').forEach(j => j.remove())")
            pg.evaluate("() => { const c = __video.P().clips[0]; __video.sel(c.id); }"); pg.wait_for_timeout(400)
            ok(pg.evaluate("() => !__veAlcas.el.hidden"), "editor de vídeo: o take escolhido mostra as alças na prévia")
            ok(pg.locator('#vePropCorpo [data-p="ex"]').count() == 1 and pg.locator('#vePropCorpo [data-p="ey"]').count() == 1, "editor de vídeo: ↔ Largura (X) e ↕ Altura (Y) no painel")
            e = pg.locator(".bwl-caixa .bwl-alca[data-q=e]").bounding_box()
            pg.mouse.move(e["x"] + e["width"] / 2, e["y"] + e["height"] / 2); pg.mouse.down(); pg.mouse.move(e["x"] + 40, e["y"] + e["height"] / 2, steps=8); pg.mouse.up(); pg.wait_for_timeout(500)
            v1 = pg.evaluate("() => { const c = __video.P().clips[0]; return [c.ex || 100, c.ey || 100]; }")
            ok(v1[0] > 102 and abs(v1[1] - 100) < 0.5, f"editor de vídeo: o lado direito muda só o X ({v1})")
            s = pg.locator(".bwl-caixa .bwl-alca[data-q=se]").bounding_box()
            pg.keyboard.down("Shift"); pg.mouse.move(s["x"] + s["width"] / 2, s["y"] + s["height"] / 2); pg.mouse.down(); pg.mouse.move(s["x"] + 30, s["y"] + 30, steps=8); pg.mouse.up(); pg.keyboard.up("Shift"); pg.wait_for_timeout(500)
            v2 = pg.evaluate("() => { const c = __video.P().clips[0]; return [c.ex || 100, c.ey || 100]; }")
            ok(abs(v2[0] / v1[0] - v2[1] / v1[1]) < 0.03 and v2[0] > v1[0], f"editor de vídeo: com Shift X e Y crescem juntos ({v1} → {v2})")
            pg.evaluate("__video.desfazer()"); pg.wait_for_timeout(500)
            v3 = pg.evaluate("() => { const c = __video.P().clips[0]; return [c.ex || 100, c.ey || 100]; }")
            ok(abs(v3[0] - v1[0]) < 0.5, f"editor de vídeo: desfazer volta o último esticar ({v3})")
            if os.environ.get("FOTO"): pg.screenshot(path=f"/tmp/livre-video-{larg}.png")
        # ---------- ALÇAS no Motion, Criador, Telas e Álbum 3D (PC) ----------
        if larg >= 900:
            def alcas(nome, ler):
                box = pg.locator(".bwl-caixa:visible")
                if box.count() == 0: ok(False, f"{nome}: aparecem as alças"); return
                ok(True, f"{nome}: aparecem as alças")
                v0 = pg.evaluate(ler); e = pg.locator(".bwl-caixa:visible .bwl-alca[data-q=e]").bounding_box()
                pg.mouse.move(e["x"] + e["width"] / 2, e["y"] + e["height"] / 2); pg.mouse.down(); pg.mouse.move(e["x"] + 50, e["y"] + e["height"] / 2, steps=8); pg.mouse.up(); pg.wait_for_timeout(700)
                v1 = pg.evaluate(ler)
                ok(v1[0] > v0[0] * 1.03 and abs(v1[1] - v0[1]) < 0.02 * max(1, v0[1]), f"{nome}: o lado direito estica só o X ({v0} → {v1})")
                s_ = pg.locator(".bwl-caixa:visible .bwl-alca[data-q=se]").bounding_box()
                pg.keyboard.down("Shift"); pg.mouse.move(s_["x"] + s_["width"] / 2, s_["y"] + s_["height"] / 2); pg.mouse.down(); pg.mouse.move(s_["x"] + 30, s_["y"] + 60, steps=8); pg.mouse.up(); pg.keyboard.up("Shift"); pg.wait_for_timeout(700)
                v2 = pg.evaluate(ler)
                ok(abs((v2[0] / v1[0]) - (v2[1] / v1[1])) < 0.04 and v2[0] > v1[0], f"{nome}: com Shift fica proporcional ({v1} → {v2})")
            # Motion
            pg.goto(BASE + "motion.html?layout=classico"); pg.wait_for_timeout(1500)
            idm = pg.evaluate("() => { const P = BWMotionEditor.projeto(), it = P.itens.find(i => !i.fundo && i.tipo !== 'fundo') || P.itens[0]; BWMotionEditor.ver((it.ini + it.fim) / 2); BWMotionEditor.selecionar(it.id); return it.id; }"); pg.wait_for_timeout(600)
            alcas("Motion", "() => { const it = BWMotionEditor.projeto().itens.find(i => i.id === '%s'); return [it.ex == null ? 1 : it.ex, it.ey == null ? 1 : it.ey]; }" % idm)
            ok(pg.locator('[data-exy="ex"]').count() == 1 and pg.locator('[data-exy="ey"]').count() == 1, "Motion: ↔ Largura (X) e ↕ Altura (Y) no painel")
            # Criador
            pg.goto(BASE + "criador.html"); pg.wait_for_timeout(1500)
            pg.evaluate("() => { const an = __criador.anim(); an.ligado = true; an.itens = [{ id: Object.keys(BWConviteAnim.ITENS)[0], x: 0.5, y: 0.5, s: 0.3 }]; __criador.tudo ? __criador.tudo() : __criador.render(); }"); pg.wait_for_timeout(800)
            cr = pg.locator("#cv").bounding_box(); pg.mouse.click(cr["x"] + cr["width"] / 2, cr["y"] + cr["height"] / 2); pg.wait_for_timeout(400)
            alcas("Criador (objeto animado)", "() => { const it = __criador.anim().itens[0]; return [it.ex == null ? 1 : it.ex, it.ey == null ? 1 : it.ey]; }")
            # Telas
            pg.goto(BASE + "telas.html"); pg.wait_for_timeout(1300)
            pg.set_input_files("#tlArq", [f"{TMP}/f.jpg"]); pg.wait_for_timeout(1500)
            if not pg.evaluate("() => BWTelasEditor.projeto().cenas.length"): pg.click("#tlNovaCena"); pg.wait_for_timeout(500)
            pg.evaluate("() => BWTelasEditor.ver(0.4)"); pg.wait_for_timeout(600)
            tc = pg.locator("#tlCv").bounding_box(); pg.mouse.move(tc["x"] + tc["width"] / 2, tc["y"] + tc["height"] / 2); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(500)
            alcas("Telas (mídia na tela)", "() => { const c = BWTelasEditor.projeto().cenas[0], a = (c.enq || [])[0] || {}; return [a.ex == null ? 1 : a.ex, a.ey == null ? 1 : a.ey]; }")
            # Álbum 3D
            pg.goto(BASE + "album3d.html"); pg.wait_for_timeout(1500)
            if pg.evaluate("() => BWAlbumEditor.tocando()"): pg.click("#alTocar"); pg.wait_for_timeout(400)
            ac = pg.locator("#alCv").bounding_box(); pg.mouse.move(ac["x"] + ac["width"] / 2, ac["y"] + ac["height"] / 2); pg.mouse.down(); pg.mouse.up(); pg.wait_for_timeout(600)
            alcas("Álbum 3D (modelo)", "() => { const e = BWAlbumEditor.projeto().esc || {}, t = e.t == null ? 1 : e.t; return [t * (e.x == null ? 1 : e.x), t * (e.y == null ? 1 : e.y)]; }")
        ok(not er, "nenhum erro de JavaScript" + (": " + "; ".join(er[:3]) if er else ""))
        ctx.close()
    b.close()
print("\n" + ("✅ 0 falhas" if not F[0] else f"❌ {F[0]} falha(s)")); sys.exit(1 if F[0] else 0)
