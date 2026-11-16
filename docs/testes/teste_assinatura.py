#!/usr/bin/env python3
"""Teste local (16/11): ASSINAR COM CERTIFICADO A1 (assets/bw-assinar.js) no GERADOR DE ORÇAMENTO.
Usa SÓ certificados de TESTE criados aqui (AC de teste própria) — nunca o certificado do dono.
Confere: certificado no formato antigo (chave 3DES + certificados RC2-40, igual aos A1 da ICP-Brasil) e no moderno (AES);
PDF assinado validado pelo pdfsig (poppler) — "Signature is Valid", SHA-256, nome do signatário; ByteRange cobre o arquivo todo
menos a assinatura; carimbo visível na última página; senha errada / arquivo errado / certificado vencido → mensagens claras;
janela: escolher arquivo, senha, LEMBRAR NESTE APARELHO (IndexedDB) → 2ª assinatura só com a senha → ESQUECER;
nada sai do aparelho (nenhum POST/PUT; o arquivo do certificado não aparece em nenhum pedido); a senha não fica em lugar nenhum
(campo limpo, nada no localStorage/IndexedDB); 1280 e 390 px sem estouro, 0 erros de JS.
Pré-requisitos: openssl, pdfsig, python3-cryptography, Playwright/Chrome; node-forge em arquivo único (FORGE=…; para montar:
  git clone --depth 1 https://github.com/digitalbazaar/forge && python3 docs/testes/empacotar_forge.py forge/lib /tmp/forge.js).
Uso (na raiz):  FORGE=/tmp/libs/out/forge.js python3 docs/testes/teste_assinatura.py"""
import base64, datetime, http.server, json, os, re, socketserver, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PORTA = 8833
FORGE = os.environ.get("FORGE", "/tmp/libs/out/forge.js")
PDFLIB = "/opt/npm-tools/node_modules/pdf-lib/dist/pdf-lib.min.js"
TMP = tempfile.mkdtemp(prefix="bwassin_")
SENHA = "teste123"

def run(*a):
    return subprocess.run(a, capture_output=True, text=True)

# ---------- certificados de TESTE ----------
def certificados():
    agora = datetime.datetime.now(datetime.timezone.utc)
    ca_k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_n = x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME, "BR"), x509.NameAttribute(NameOID.ORGANIZATION_NAME, "AC TESTE BRIGHTWAY"), x509.NameAttribute(NameOID.COMMON_NAME, "AC TESTE (nao vale)")])
    ca = (x509.CertificateBuilder().subject_name(ca_n).issuer_name(ca_n).public_key(ca_k.public_key()).serial_number(1)
          .not_valid_before(agora - datetime.timedelta(days=400)).not_valid_after(agora + datetime.timedelta(days=400))
          .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True).sign(ca_k, hashes.SHA256()))
    def folha(nome, ini, fim, serie):
        k = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        n = x509.Name([x509.NameAttribute(NameOID.COUNTRY_NAME, "BR"), x509.NameAttribute(NameOID.ORGANIZATION_NAME, "ICP-Brasil"), x509.NameAttribute(NameOID.COMMON_NAME, nome)])
        c = (x509.CertificateBuilder().subject_name(n).issuer_name(ca_n).public_key(k.public_key()).serial_number(serie)
             .not_valid_before(ini).not_valid_after(fim)
             .add_extension(x509.KeyUsage(True, True, False, False, False, False, False, False, False), critical=True).sign(ca_k, hashes.SHA256()))
        return k, c
    k1, c1 = folha("PRODUTORA EXEMPLO LTDA:00000000000191", agora - datetime.timedelta(days=10), agora + datetime.timedelta(days=355), 2)
    k2, c2 = folha("PRODUTORA VENCIDA LTDA:11222333000181", agora - datetime.timedelta(days=500), agora - datetime.timedelta(days=5), 3)
    for arq, k, c in (("ok", k1, c1), ("vencido", k2, c2)):
        open(f"{TMP}/{arq}.key", "wb").write(k.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        open(f"{TMP}/{arq}.crt", "wb").write(c.public_bytes(serialization.Encoding.PEM))
    open(f"{TMP}/ca.crt", "wb").write(ca.public_bytes(serialization.Encoding.PEM))
    # formato ANTIGO (como os A1 da ICP-Brasil): chave 3DES, certificados RC2-40, MAC SHA-1
    r = run("openssl", "pkcs12", "-export", "-legacy", "-inkey", f"{TMP}/ok.key", "-in", f"{TMP}/ok.crt", "-certfile", f"{TMP}/ca.crt",
            "-keypbe", "PBE-SHA1-3DES", "-certpbe", "PBE-SHA1-RC2-40", "-macalg", "sha1", "-passout", f"pass:{SENHA}", "-out", f"{TMP}/legado.pfx")
    assert r.returncode == 0, r.stderr
    info = run("openssl", "pkcs12", "-in", f"{TMP}/legado.pfx", "-info", "-noout", "-legacy", "-passin", f"pass:{SENHA}").stderr
    assert "RC2" in info and "3-KeyTripleDES" in info, info
    # formato MODERNO (AES-256 + PBKDF2)
    open(f"{TMP}/moderno.pfx", "wb").write(pkcs12.serialize_key_and_certificates(b"teste", k1, c1, [ca], serialization.BestAvailableEncryption(SENHA.encode())))
    open(f"{TMP}/vencido.pfx", "wb").write(pkcs12.serialize_key_and_certificates(b"teste", k2, c2, [ca], serialization.BestAvailableEncryption(SENHA.encode())))
    open(f"{TMP}/nao-e-cert.pfx", "wb").write(b"isto nao e um certificado" * 20)

def pdf_base():
    out = f"{TMP}/base.pdf"
    js = ("const {PDFDocument,StandardFonts}=require('/opt/npm-tools/node_modules/pdf-lib');(async()=>{const d=await PDFDocument.create();"
          "const f=await d.embedFont(StandardFonts.Helvetica);for(let i=0;i<2;i++){const p=d.addPage([595,842]);p.drawText('Proposta de teste '+(i+1),{x:50,y:780,size:18,font:f});}"
          "require('fs').writeFileSync(%s,await d.save());})()" % json.dumps(out))
    r = run("node", "-e", js); assert r.returncode == 0, r.stderr
    return open(out, "rb").read()

def pdfsig(caminho):
    return run("pdfsig", caminho).stdout + run("pdfsig", caminho).stderr

falhas = []
def ok(c, m):
    print(("  ✓ " if c else "  ✗ ") + m)
    if not c: falhas.append(m)

certificados()
BASE_PDF = pdf_base()
STUB_SB = """window.supabase={createClient:function(){const q={select(){return q},eq(){return q},neq(){return q},in(){return q},is(){return q},maybeSingle(){return q},
order(){return q},limit(){return q},delete(){return q},upsert(){return q},insert(){return q},then(r){return Promise.resolve({data:[],error:null}).then(r)}};
return {auth:{getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}}},
from(){return q},rpc:async()=>({data:null,error:null}),storage:{from(){return {list:async()=>({data:[]})}}}};}};"""
# pdfMake de mentira que devolve um PDF DE VERDADE (para o PDF poder ser assinado)
STUB_PDFMAKE = "window.__pdfBase=Uint8Array.from(atob(%s),c=>c.charCodeAt(0));window.pdfMake={vfs:{},createPdf:function(d){return {getBuffer(cb){cb(window.__pdfBase)}}}};" % json.dumps(base64.b64encode(BASE_PDF).decode())

class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
os.chdir(RAIZ)
socketserver.TCPServer.allow_reuse_address = True
srv = socketserver.TCPServer(("127.0.0.1", PORTA), Q); threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{PORTA}/"
PEDIDOS = []
def rota(r):
    u = r.request.url
    PEDIDOS.append((r.request.method, u, r.request.post_data_buffer or b""))
    if "127.0.0.1" in u: return r.continue_()
    if "supabase-js" in u: return r.fulfill(body=STUB_SB, content_type="application/javascript")
    if "pdfmake.min.js" in u: return r.fulfill(body=STUB_PDFMAKE, content_type="application/javascript")
    if "vfs_fonts" in u: return r.fulfill(body="", content_type="application/javascript")
    if "node-forge" in u: return r.fulfill(path=FORGE, content_type="application/javascript")
    if "pdf-lib" in u: return r.fulfill(path=PDFLIB, content_type="application/javascript")
    return r.abort()

def b64(p): return base64.b64encode(open(p, "rb").read()).decode()
ASSINAR_JS = """async ([pfx, senha, op]) => { try { const r = await BWAssinar.assinarPdf(window.__pdfBase || Uint8Array.from(atob(%s), c => c.charCodeAt(0)),
  Uint8Array.from(atob(pfx), c => c.charCodeAt(0)), senha, op || {}); let s = ''; for (let i = 0; i < r.pdf.length; i += 8192) s += String.fromCharCode.apply(null, r.pdf.subarray(i, i + 8192));
  return { ok: true, pdf: btoa(s), info: r.info }; } catch (e) { return { ok: false, erro: String(e && e.message || e) }; } }""" % json.dumps(base64.b64encode(BASE_PDF).decode())

with sync_playwright() as p:
    nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
    for larg in (1280, 390):
        print(f"\n== {larg} px ==")
        PEDIDOS.clear()
        ctx = nav.new_context(viewport={"width": larg, "height": 900}, service_workers="block", accept_downloads=True)
        ctx.route("**/*", rota)
        pg = ctx.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept())
        pg.goto(BASE + "propostas.html"); pg.wait_for_timeout(700)
        ok(pg.evaluate("typeof BWAssinar") == "object", "módulo de assinatura carregado")

        # --- núcleo: formato antigo e moderno, validados pelo pdfsig ---
        for nome in ("legado", "moderno"):
            r = pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/{nome}.pfx"), SENHA, {"carimbo": "direita", "motivo": "Proposta comercial"}])
            ok(r["ok"], f"{nome}: assinou" + ("" if r["ok"] else " — " + r["erro"]))
            if not r["ok"]: continue
            caminho = f"{TMP}/assinado-{nome}-{larg}.pdf"; open(caminho, "wb").write(base64.b64decode(r["pdf"]))
            sig = pdfsig(caminho)
            ok("Signature is Valid" in sig, f"{nome}: pdfsig 'Signature is Valid'")
            ok("PRODUTORA EXEMPLO LTDA" in sig, f"{nome}: nome do signatário na assinatura")
            ok("SHA-256" in sig or "SHA256" in sig, f"{nome}: resumo SHA-256")
            ok("adbe.pkcs7.detached" in sig, f"{nome}: formato adbe.pkcs7.detached (Acrobat)")
            ok("Total document signed" in sig or "Signed Ranges: [0 -" in sig, f"{nome}: assinatura cobre o documento")
            ok(r["info"]["doc"] == "00.000.000/0001-91" and r["info"]["tipo"] == "e-CNPJ", f"{nome}: CNPJ lido do certificado ({r['info']['doc']})")
            txt = run("pdftotext", "-f", "2", "-l", "2", caminho, "-").stdout
            ok("Assinado digitalmente por" in txt and "PRODUTORA EXEMPLO LTDA" in txt, f"{nome}: carimbo visível na última página")
            ok(int(run("pdfinfo", caminho).stdout.split("Pages:")[1].split()[0]) == 2, f"{nome}: continua com 2 páginas")
        # PDF assinado alterado → inválido
        dados = bytearray(open(f"{TMP}/assinado-legado-{larg}.pdf", "rb").read()); i = dados.find(b"(Assinatura1)")
        ok(i > 0, "achou um texto para alterar no PDF assinado")
        dados[i:i + 13] = b"(Assinatura9)"
        open(f"{TMP}/alterado.pdf", "wb").write(bytes(dados))
        ok("Signature is Valid" not in pdfsig(f"{TMP}/alterado.pdf"), "PDF alterado depois de assinado: assinatura deixa de valer")
        r = pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/legado.pfx"), SENHA, {"carimbo": "nao"}])
        open(f"{TMP}/semcarimbo.pdf", "wb").write(base64.b64decode(r["pdf"]))
        ok(r["ok"] and "Signature is Valid" in pdfsig(f"{TMP}/semcarimbo.pdf") and "Assinado digitalmente" not in run("pdftotext", f"{TMP}/semcarimbo.pdf", "-").stdout, "SEM CARIMBO: assinatura válida, sem carimbo na página")
        r = pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/legado.pfx"), SENHA, {"carimbo": "pagina"}])
        open(f"{TMP}/pagnova.pdf", "wb").write(base64.b64decode(r["pdf"]))
        ok(r["ok"] and "Signature is Valid" in pdfsig(f"{TMP}/pagnova.pdf") and int(run("pdfinfo", f"{TMP}/pagnova.pdf").stdout.split("Pages:")[1].split()[0]) == 3
           and "PAGINA DE ASSINATURA" in run("pdftotext", "-f", "3", "-l", "3", f"{TMP}/pagnova.pdf", "-").stdout, "PÁGINA NOVA NO FIM: 3 páginas, carimbo na nova, assinatura válida")
        # assinar de novo um PDF já assinado (2ª assinatura) — a 1ª continua valendo
        r2 = pg.evaluate("""async ([pdf, pfx, s]) => { try { const a = Uint8Array.from(atob(pdf), c => c.charCodeAt(0)); const r = await BWAssinar.assinarPdf(a, Uint8Array.from(atob(pfx), c => c.charCodeAt(0)), s, { carimbo: 'esquerda' });
          let t = ''; for (let i = 0; i < r.pdf.length; i += 8192) t += String.fromCharCode.apply(null, r.pdf.subarray(i, i + 8192)); return { ok: true, pdf: btoa(t) }; } catch (e) { return { ok: false, erro: String(e.message || e) }; } }""",
                         [b64(f"{TMP}/assinado-moderno-{larg}.pdf"), b64(f"{TMP}/legado.pfx"), SENHA])
        if r2["ok"]:
            open(f"{TMP}/duas.pdf", "wb").write(base64.b64decode(r2["pdf"])); s2 = pdfsig(f"{TMP}/duas.pdf")
            ok(s2.count("Signature is Valid") >= 1 and "Signature #2" in s2, "2ª assinatura no mesmo PDF (a última vale; pdf-lib regrava o arquivo)")
        else:
            ok(False, "2ª assinatura: " + r2["erro"])

        # --- erros claros ---
        ok(pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/legado.pfx"), "errada", {}])["erro"] == "SENHA", "senha errada → SENHA")
        ok(pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/nao-e-cert.pfx"), SENHA, {}])["erro"] in ("ARQUIVO", "SENHA"), "arquivo que não é certificado → recusado")
        ok(pg.evaluate(ASSINAR_JS, [b64(f"{TMP}/vencido.pfx"), SENHA, {}])["erro"] == "VENCIDO", "certificado vencido → VENCIDO")

        # --- janela no gerador de orçamento ---
        pg.evaluate("(() => { const b = [...document.querySelectorAll('[data-a]')].find(x => /NOVO ORÇAMENTO|\\+ NOVO/.test(x.textContent)); b && b.click(); })()"); pg.wait_for_timeout(500)
        if not pg.evaluate("!!__prop.DOC()"): pg.evaluate("__prop.abrir(__prop.novoDoc('orcamento'))"); pg.wait_for_timeout(500)
        ok(pg.locator("[data-a=assinarCert]").count() == 1, "botão 🔏 ASSINAR no orçamento")
        pg.click("[data-a=assinarCert]"); pg.wait_for_timeout(500)
        ok(pg.locator(".bwa-cx").is_visible(), "janela ASSINAR COM CERTIFICADO abre")
        cx = pg.eval_on_selector(".bwa-cx", "e => { const r = e.getBoundingClientRect(); return [r.left, r.right]; }")
        ok(cx[0] >= 0 and cx[1] <= larg, f"janela cabe na tela ({cx})")
        ok(pg.eval_on_selector("#bwaSenha", "e => e.type") == "password" and float(pg.eval_on_selector("#bwaSenha", "e => getComputedStyle(e).fontSize").replace("px", "")) >= 16, "senha escondida e letra ≥ 16 px (iPhone não amplia)")
        pg.click("[data-w=assinar]"); ok("Escolha o arquivo" in pg.inner_text("#bwaMsg"), "sem arquivo → pede o certificado")
        pg.set_input_files("#bwaArq", f"{TMP}/legado.pfx"); pg.wait_for_timeout(300)
        ok("legado.pfx" in pg.inner_text(".bwa-cx"), "arquivo escolhido aparece")
        pg.fill("#bwaSenha", "errada"); pg.click("[data-w=assinar]"); pg.wait_for_timeout(1500)
        ok("Senha incorreta" in pg.inner_text("#bwaMsg") and pg.input_value("#bwaSenha") == "", "senha errada na janela: aviso e campo limpo")
        pg.check("#bwaLembrar"); pg.fill("#bwaSenha", SENHA)
        pg.click("[data-w=assinar]"); pg.wait_for_selector("text=PDF assinado", timeout=20000)
        ok("PRODUTORA EXEMPLO LTDA" in pg.inner_text(".bwa-cx"), "resultado mostra quem assinou")
        with pg.expect_download() as dl: pg.click("[data-w=baixar]")
        d = dl.value; caminho = f"{TMP}/janela-{larg}.pdf"; d.save_as(caminho)
        ok(d.suggested_filename.endswith("-assinado.pdf"), f"arquivo baixado: {d.suggested_filename}")
        ok("Signature is Valid" in pdfsig(caminho), "PDF baixado da janela: assinatura válida (pdfsig)")
        pg.click(".bwa-cx [data-w=fechar]"); pg.wait_for_timeout(200)
        # 2ª vez: certificado lembrado, só a senha
        pg.click("[data-a=assinarCert]"); pg.wait_for_timeout(600)
        ok("lembrado neste aparelho" in pg.inner_text(".bwa-cx"), "certificado lembrado neste aparelho")
        pg.fill("#bwaSenha", SENHA); pg.click("[data-w=assinar]"); pg.wait_for_selector("text=PDF assinado", timeout=20000)
        ok(True, "2ª assinatura só com a senha")
        pg.click(".bwa-cx [data-w=fechar]"); pg.click("[data-a=assinarCert]"); pg.wait_for_timeout(500)
        pg.click("[data-w=esquecer]"); pg.wait_for_timeout(300)
        ok("ESCOLHER ARQUIVO" in pg.inner_text(".bwa-cx") and pg.evaluate("BWAssinar && new Promise(ok => { const r = indexedDB.open('bw_cert', 1); r.onsuccess = () => { const q = r.result.transaction('c').objectStore('c').get('pfx'); q.onsuccess = () => ok(!q.result); }; })"), "ESQUECER apaga o certificado do aparelho")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(200)
        ok(pg.locator(".bwa-fundo").count() == 0, "Esc fecha a janela")

        # --- PDF → aba 🔏 Certificado (qualquer PDF) ---
        open(f"{TMP}/qualquer.pdf", "wb").write(BASE_PDF)
        pg.goto(BASE + "pdf.html#certificado"); pg.wait_for_timeout(700)
        ok(pg.locator('[data-painel="certificado"]').is_visible(), "PDF: aba 🔏 Certificado")
        pg.set_input_files("#cArq", f"{TMP}/qualquer.pdf"); pg.wait_for_timeout(300)
        pg.click("#cGo"); pg.wait_for_timeout(500)
        pg.set_input_files("#bwaArq", f"{TMP}/legado.pfx"); pg.fill("#bwaSenha", SENHA); pg.click("[data-w=assinar]")
        pg.wait_for_selector("text=PDF assinado", timeout=20000)
        with pg.expect_download() as dl: pg.click("[data-w=baixar]")
        dl.value.save_as(f"{TMP}/pdfpage-{larg}.pdf")
        ok(dl.value.suggested_filename == "qualquer-assinado.pdf" and "Signature is Valid" in pdfsig(f"{TMP}/pdfpage-{larg}.pdf"), "PDF: qualquer PDF assinado com certificado (válido)")
        pg.keyboard.press("Escape")
        # --- nada sai do aparelho; senha em lugar nenhum ---
        pfx_bytes = open(f"{TMP}/legado.pfx", "rb").read()
        saiu = [u for (m, u, b) in PEDIDOS if m not in ("GET", "HEAD") or (b and (pfx_bytes[:64] in b or SENHA.encode() in b))]
        ok(not saiu, "nenhum envio para a internet (sem POST/PUT; certificado e senha não aparecem em pedidos)" + ("" if not saiu else f": {saiu[:3]}"))
        ok(not any(SENHA in u for (m, u, b) in PEDIDOS), "senha não aparece em nenhum endereço")
        ls = pg.evaluate("JSON.stringify(Object.assign({}, localStorage))")
        ok(SENHA not in ls, "senha não está no localStorage")
        sw = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        ok(sw <= 0, f"sem estouro horizontal ({sw})")
        ok(not erros, "0 erros de JavaScript" + ("" if not erros else ": " + erros[0][:200]))
        ctx.close()
    nav.close()
print("\nFALHAS:", len(falhas)); [print(" -", f) for f in falhas]
sys.exit(1 if falhas else 0)
