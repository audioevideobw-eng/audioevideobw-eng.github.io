#!/usr/bin/env python3
"""Vigia do Brightway — confere o site a cada publicação (GitHub Actions).

Mantido pelo Claude (pasta docs/ é só dele — ver AGENTS.md).
Uso local:  python3 docs/vigia/vigia.py   (na raiz do repositório)
Sai com código 1 e lista os problemas se algo essencial sumiu.
"""
import glob, json, os, re, subprocess, sys, tempfile

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(RAIZ)
problemas, avisos = [], []

def ler(p):
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()

PAGINAS = sorted(glob.glob("*.html"))
SBJS = "supabase-js@2"

# 1) imagens precisam ser binárias de verdade (não texto base64)
ASSINATURAS = {".png": b"\x89PNG", ".jpg": b"\xff\xd8", ".jpeg": b"\xff\xd8", ".webp": b"RIFF", ".gif": b"GIF8"}
for p in glob.glob("**/*", recursive=True):
    ext = os.path.splitext(p)[1].lower()
    if ext in ASSINATURAS and os.path.isfile(p) and not p.startswith(".git"):
        with open(p, "rb") as f:
            cab = f.read(8)
        if not cab.startswith(ASSINATURAS[ext]):
            problemas.append(f"Imagem quebrada (salva como texto, não como imagem): {p}")

# 2) bw-sync.js inteiro (as proteções do Claude)
sync = ler("assets/bw-sync.js") if os.path.exists("assets/bw-sync.js") else ""
for marca, oque in [("function blindar", "desvio de upsert antigo"),
                    ("Storage.prototype.setItem", "gancho no localStorage"),
                    ("function garantirDono", "dados do aparelho separados por conta"),
                    ("function registrarPosse", "registro de posse (isolamento entre usuários)"),
                    ("function mesclarLista", "mescla item a item")]:
    if marca not in sync:
        problemas.append(f"assets/bw-sync.js sem '{oque}' — arquivo velho ou sobrescrito")

# 3) cada página
for p in PAGINAS:
    s = ler(p)
    if SBJS in s:
        i_sb = s.find(SBJS)
        i_sync = s.find("assets/bw-sync.js")
        i_mod = s.find("const MOD = {}")
        if i_sync < 0:
            problemas.append(f"{p}: não carrega assets/bw-sync.js (sincronização segura desligada)")
        elif i_sync < i_sb or (i_mod >= 0 and i_sync > i_mod):
            problemas.append(f"{p}: assets/bw-sync.js fora de ordem (tem que vir DEPOIS do supabase-js e ANTES do bundle)")
    if "const MOD = {}" not in s:
        continue
    # módulos usados x definidos
    definidos = set(re.findall(r"^MOD\['([^']+)'\] = \(function", s, re.M))
    usados = set(re.findall(r"MOD\['([^']+)'\](?! = )", s))
    for m in sorted(usados - definidos):
        problemas.append(f"{p}: usa o módulo '{m}' mas ele não está no bundle (a página trava)")
    # store com 3 argumentos
    if "MOD['core/store'] = (function" in s and "antesDeSalvar(key, versao, valor)" not in s:
        avisos.append(f"{p}: core/store não chama BWSync.antesDeSalvar(key, versao, valor) (o bw-sync cobre, mas corrija o gerador)")
    # nuvem só delegação
    for m in re.finditer(r"^MOD\['core/nuvem'\] = \(function", s, re.M):
        fim = s.find("/* ===== ", m.end())
        bloco = s[m.start(): fim if fim > 0 else len(s)]
        if ".upsert(" in bloco:
            avisos.append(f"{p}: core/nuvem ainda tem upsert (o bw-sync desvia, mas o gerador deveria só delegar)")
    # sintaxe do JavaScript embutido
    for k, sc in enumerate(re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", s, re.S)):
        if not sc.strip() or sc.lstrip().startswith("{"):
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            t.write(sc)
        r = subprocess.run(["node", "--check", t.name], capture_output=True, text=True)
        os.unlink(t.name)
        if r.returncode != 0:
            linha = (r.stderr.strip().splitlines() or ["?"])
            problemas.append(f"{p}: erro de sintaxe no JavaScript (script {k+1}): {linha[-1][:160]}")

# 4) pedidos do dono
neg = ler("negocio.html") if os.path.exists("negocio.html") else ""
for h in ["eventos.html", "equipe.html", "lancamentos.html", "preco.html", "leitor.html", "financeiro-painel.html", "propostas.html"]:
    if not re.search(r'class="(menu-card|bw-tool-card|amb-principal)[^"]*" href="' + re.escape(h) + r'(\?a=pj)?"', neg):
        problemas.append(f"negocio.html: falta o card da ferramenta {h} (o dono pediu TODAS as ferramentas do negócio)")
if os.path.exists("app.html") and "rs.find(" in ler("app.html"):
    problemas.append("app.html: botão 'Sincronizar agora' voltou com o erro rs.find")

# 5) service worker
sw = ler("sw.js") if os.path.exists("sw.js") else ""
if "url.origin !== location.origin" not in sw or "jsdelivr" not in sw:
    problemas.append("sw.js: o Supabase pode estar passando pelo cache (dados velhos entre aparelhos)")

# 6) manifest e JSON válidos
for j in ["manifest.json", "milhas.json", "noticias.json"]:
    if os.path.exists(j):
        try:
            json.loads(ler(j))
        except Exception as e:
            problemas.append(f"{j}: JSON inválido ({e})")

# 7) PENTE FINO — bugs já encontrados não podem voltar (14/11/2026). Ver AGENTS.md › "Pente fino".
todos = {p: ler(p) for p in PAGINAS}
css = ler("assets/brightway.css") if os.path.exists("assets/brightway.css") else ""
lay = ler("assets/layout.js") if os.path.exists("assets/layout.js") else ""
# 7.1 nenhum segredo no site
for arq in PAGINAS + ["assets/bw-sync.js", "assets/layout.js", "sw.js"]:
    if os.path.exists(arq):
        t = ler(arq)
        for seg, nome in [(r"sb_secret_[A-Za-z0-9_-]{12,}", "chave secreta do Supabase"), (r"GOCSPX-[A-Za-z0-9_-]{12,}", "client secret do Google"),
                          (r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]*c2VydmljZV9yb2xl", "chave service_role (JWT)")]:
            if re.search(seg, t):
                problemas.append(f"{arq}: contém {nome} — NUNCA publique segredos")
# 7.2 login: nada apontando para localhost; cadastro com emailRedirectTo; PKCE ligado
for p, t in todos.items():
    if re.search(r"https?://localhost|127\.0\.0\.1", t):
        problemas.append(f"{p}: aponta para localhost (links de e-mail/login quebram no celular)")
lg = todos.get("login.html", "")
if lg and "signUp(" in lg and "emailRedirectTo" not in lg:
    problemas.append("login.html: signUp sem emailRedirectTo (confirmação de e-mail volta para o Site URL/localhost)")
if lg and "?google=1" not in lg:
    problemas.append("login.html: volta do Google sem ?google=1 (não vai direto ao painel)")
if 'flowType: "pkce"' not in sync:
    problemas.append("assets/bw-sync.js: login PKCE desligado (flowType pkce)")
# 7.3 ícones do app: quadrados e do tamanho declarado
try:
    man = json.loads(ler("manifest.json"))
    for ic in man.get("icons", []):
        src = ic.get("src", "")
        if not os.path.exists(src):
            problemas.append(f"manifest.json: ícone {src} não existe"); continue
        with open(src, "rb") as f:
            cab = f.read(24)
        w, h = int.from_bytes(cab[16:20], "big"), int.from_bytes(cab[20:24], "big")
        dec = ic.get("sizes", "")
        if w != h or dec != f"{w}x{h}":
            problemas.append(f"manifest.json: ícone {src} é {w}x{h} mas declara '{dec}' (precisa ser quadrado e do tamanho certo)")
except Exception as e:
    problemas.append(f"manifest.json: não deu para conferir ícones ({e})")
# 7.4 mesma versão de CSS/JS em todas as páginas (cache velho = 'site bugado')
for nome in ["assets/brightway.css", "assets/layout.js"]:
    vs = {v for t in todos.values() for v in re.findall(re.escape(nome) + r"\?v=(\w+)", t)}
    if len(vs) > 1:
        problemas.append(f"{nome} com versões diferentes entre páginas: {sorted(vs)} (suba o ?v= em TODAS)")
# 7.5 ids duplicados no HTML fixo (o JS pega o primeiro e ignora o segundo)
for p, t in todos.items():
    corpo = re.sub(r"<script.*?</script>", "", t, flags=re.S)
    ids = re.findall(r'\bid="([^"$`{}]+)"', corpo)
    rep = sorted({i for i in ids if ids.count(i) > 1})
    if rep:
        problemas.append(f"{p}: id repetido no HTML: {', '.join(rep[:5])}")
# 7.6 listas que escondem o que acabou de ser salvo / mensagem que some
for p, t in todos.items():
    if "function ligarColapsaveis" in t and "ui_colap" not in t:
        problemas.append(f"{p}: core/colap antigo (lista fecha e esconde o item recém-salvo)")
    if "Fixo criado —" in t:
        problemas.append(f"{p}: mensagem de fixo antes do re-render (some da tela — parece que não salvou)")
    if "window.__delFixo" in t and "apaga também" not in t:
        problemas.append(f"{p}: apagar fixo deixa contas/lançamentos futuros órfãos")
# 7.7 layout: celular, selo LOGADO, galeria
if "min-width:0" not in css:
    problemas.append("assets/brightway.css: sem min-width:0 nas grades (estoura a tela no celular)")
if lay and "slot.innerHTML = orig.innerHTML" not in lay:
    problemas.append("assets/layout.js: não copia o #userBox (selo LOGADO some)")
if lay and 'href="downloads.html"' not in lay:
    problemas.append("assets/layout.js: sumiu o item DOWNLOADS do menu (é por ele que se baixam os apps)")
for p in ["index.html", "negocio.html"]:
    t = todos.get(p, "")
    if re.search(r'class="(menu-card|bw-tool-card)"[^>]*>(?!<span class="ico">)', t):
        problemas.append(f"{p}: botão de acesso fora do padrão (galeria: ícone + PALAVRA-CHAVE, sem texto pequeno)")
    if '<span class="desc">' in t:
        problemas.append(f"{p}: botão de acesso com descrição (texto pequeno) — o dono pediu só a palavra-chave")
# 7.7b segurança para o público (14/11): documentos privados, galeria por token, itens de admin escondidos
for p, t in todos.items():
    if re.search(r'from\("eventos-midia"\)\.upload\([^)]*', t) and re.search(r'/(comprovantes|contratos|nfe)/', t):
        for m in re.finditer(r'const cp = [^\n]*/(comprovantes|contratos|nfe)/[^\n]*\n[^\n]*from\("([a-z-]+)"\)\.upload', t):
            if m.group(2) != "eventos-docs":
                problemas.append(f"{p}: {m.group(1)} enviado para bucket público ({m.group(2)}) — documentos vão para eventos-docs (privado)")
    # 22/11: fotos dos eventos em pasta PRIVADA — a galeria do cliente só pela função bw-galeria (token), nunca pelo endereço público
    if p == "cadastro.html" and ("object/public/eventos-midia" in t or "functions/v1/bw-galeria" not in t):
        problemas.append(f"{p}: galeria do cliente tem de usar a função bw-galeria (links temporários) — o bucket eventos-midia é privado")
    if "?galeria=\" + e.id" in t or '"?galeria=" + e.id' in t:
        problemas.append(f"{p}: galeria por número do evento (adivinhável) — use o link secreto bw_galerias (?g=TOKEN)")
    for m in re.finditer(r'<a [^>]*href="financeiro-painel\.html"[^>]*>', t):
        if "so-admin" in m.group(0):
            problemas.append(f"{p}: PAINEL FINANCEIRO escondido com so-admin — ele é de todas as contas desde 14/11")
    for alvo in ["configadm.html"]:
        for m in re.finditer(r'<a [^>]*href="' + re.escape(alvo) + r'"[^>]*>', t):
            if "so-admin" not in m.group(0):
                problemas.append(f"{p}: link para {alvo} sem 'so-admin' (aparece para usuários comuns)")
if "urlSegura" not in sync:
    problemas.append("assets/bw-sync.js: sem urlSegura (documentos privados não abrem)")
if "html:not(.bw-admin) .so-admin" not in css:
    problemas.append("assets/brightway.css: sem a regra que esconde itens de admin")
# 7.7c planilha só entra pelo PAINEL FINANCEIRO (regra do dono, 14/11); recs.html = carteira de investimentos (decisão pendente)
for p, t in todos.items():
    if p in ("financeiro-painel.html", "investimentos-painel.html"):
        continue
    tela = re.sub(r"<script[\s\S]*?</script>", "", t)   # só o que aparece na tela (o código embutido sem caixa não aparece)
    if re.search(r'type="file"[^>]*accept="[^"]*(csv|xlsx|xls)', tela) or re.search(r'accept="[^"]*(csv|xlsx)[^"]*"[^>]*type="file"', tela) or "Importar CSV" in t:
        problemas.append(f"{p}: envio de planilha fora do PAINEL FINANCEIRO (regra: só o painel recebe planilha)")
    for caixa in ("orcPlanilha", "negPlanilha", "eqPlanilhaBox", "orcSync", "ctSync", "rsSync", "negSync"):
        if f'id="{caixa}"' in t:
            problemas.append(f"{p}: caixa #{caixa} voltou (planilha/sincronizar manual — removida em 14/11)")

# 7.7d página que carrega dados de câmbio precisa entregar o pacote embutido (leitor.html mostrava "Não foi possível carregar os dados de câmbio")
for p, t in todos.items():
    if "async function iniciarDados" in t and "avisoSemDados()" in t.split("async function boot")[-1] and not re.search(r"window\.__DATA\s*=", t):
        problemas.append(f"{p}: carrega câmbio sem window.__DATA (aparece o aviso 'Não foi possível carregar os dados de câmbio')")

fp = todos.get("financeiro-painel.html", "")
if fp:
    for trecho, msg in [('ler("neg_fluxo")', "não lê os lançamentos da plataforma (neg_fluxo)"),
                        ('data-acao="baixar"', "sem BAIXAR PLANILHA"), ('data-acao="enviar"', "sem ENVIAR PLANILHA"),
                        ("BWSync.antesDeSalvar(\"neg_fluxo\", 1, lista)", "ENVIAR PLANILHA grava sem avisar o BWSync (3 argumentos)"),
                        ('o.fonte !== "pendente"', "conta cachês ainda não pagos como gasto realizado")]:
        if trecho not in fp:
            problemas.append("financeiro-painel.html: " + msg)
lgx = todos.get("login.html", "")
if lgx and ("bw_excluir_minha_conta" not in lgx or "lExportar" not in lgx):
    problemas.append("login.html: sem 'Baixar meus dados' / 'Excluir minha conta' (LGPD)")

# 7.8 páginas públicas obrigatórias
for p in ["baixar.html", "downloads.html", "privacidade.html", "termos.html", "politica.html", "seguranca.html", "financeiro-painel.html", "investimentos-painel.html", "marketing.html", "assistente.html", "transcricao.html", "pdf.html",
          "crm.html", "captacao.html", "resultados.html", "fotos.html", "pedido.html"]:
    if p not in todos:
        problemas.append(f"{p} sumiu (link de instalação / política exigida pelo Google / painel financeiro)")
# 7.8a CRM (15/11): dados do CRM sincronizam (CHAVES) e as páginas carregam assets/crm.js; nada é enviado sozinho
for ch in ["mkt_leads", "mkt_modelos", "mkt_redes", "mkt_config", "agenda_feitos", "neg_propostas", "neg_prop_config", "reels_projetos"]:
    if f'"{ch}"' not in sync:
        problemas.append(f"assets/bw-sync.js: chave {ch} fora de CHAVES (o CRM não chega nos outros aparelhos)")
for p in ["crm.html", "captacao.html", "resultados.html"]:
    if p in todos and "assets/crm.js" not in todos[p]:
        problemas.append(f"{p}: não carrega assets/crm.js")
crmjs = ler("assets/crm.js") if os.path.exists("assets/crm.js") else ""
if crmjs and ("toISOString().slice(0, 10)" in crmjs or "BWSync.antesDeSalvar(k, 1, v)" not in crmjs):
    problemas.append("assets/crm.js: data em UTC (use data local) ou gravação sem antesDeSalvar")
fotosjs = ler("assets/fotos.js") if os.path.exists("assets/fotos.js") else ""
fotosjs += ler("assets/fotos-inicio.js") if os.path.exists("assets/fotos-inicio.js") else ""   # 22/11: tela de entrada com biblioteca (só IndexedDB)
if "fotos.html" in todos and re.search(r"\.upload\(|from\(\"user_data\"\)|fetch\(|BWSync\.(antesDeSalvar|registrarAgora)", todos["fotos.html"] + fotosjs):
    problemas.append("fotos.html/assets/fotos.js: o editor não pode enviar fotos para a nuvem (regra 24)")
# 16/11: AGENTE (assets/bw-agente.js) e LEITOR DE CONTAS (assets/bw-leitor.js) — só falam com a IA Brightway (bw-ia);
# o leitor manda à IA só o TEXTO tapado (tapar), nunca a imagem; o layout.js carrega o agente em todas as páginas
for arq in ["assets/bw-agente.js", "assets/bw-leitor.js"]:
    if not os.path.exists(arq):
        problemas.append(f"{arq} sumiu (agente/leitor de contas)"); continue
    js = ler(arq)
    for u in re.findall(r"https://[\w.-]+\.supabase\.co/functions/v1/[\w-]+", js):
        if not u.endswith("/bw-ia"):
            problemas.append(f"{arq}: chama {u} — o agente/leitor só pode usar a bw-ia")
    if "bw-ia-imagem" in js or "toDataURL" in js and "conferirIA" in js and "tapar(" not in js:
        problemas.append(f"{arq}: a IA do leitor recebe só texto tapado")
if os.path.exists("assets/bw-leitor.js") and "tapar(texto)" not in ler("assets/bw-leitor.js"):
    problemas.append("assets/bw-leitor.js: conferirIA precisa mandar tapar(texto) (sem CPF/CNPJ/CEP/telefone/e-mail)")
if "bw-agente.js" not in ler("assets/layout.js"):
    problemas.append("assets/layout.js: não carrega o agente (assets/bw-agente.js)")
if "leitor.html" in todos and "assets/bw-leitor.js" not in todos["leitor.html"]:
    problemas.append("leitor.html: não carrega assets/bw-leitor.js")
# 16/11: ASSINAR COM CERTIFICADO (assets/bw-assinar.js) — o certificado e a senha nunca saem do aparelho: sem fetch/XHR/upload/
# supabase/BWSync/localStorage no módulo; senha em campo type=password; páginas que assinam carregam o módulo
assinjs = ler("assets/bw-assinar.js") if os.path.exists("assets/bw-assinar.js") else ""
if assinjs:
    if re.search(r"fetch\(|XMLHttpRequest|sendBeacon|\.upload\(|supabase|BWSync\.|localStorage|sessionStorage|WebSocket", assinjs):
        problemas.append("assets/bw-assinar.js: o certificado/senha não podem sair do aparelho nem ir para o localStorage (só IndexedDB bw_cert, opcional)")
    if 'type="password"' not in assinjs:
        problemas.append("assets/bw-assinar.js: o campo da senha precisa ser type=password")
    for p in ["propostas.html", "pdf.html"]:
        if p in todos and "assets/bw-assinar.js" not in todos[p]:
            problemas.append(f"{p}: não carrega assets/bw-assinar.js (botão de assinar com certificado)")
# 16/11: a IA CRIATIVA é a única saída para a internet do editor — só em assets/fotos-nuvem.js, só para a Edge Function bw-ia-imagem,
# sem Storage/user_data/BWSync e com confirmação da pessoa antes de enviar (fotos.js)
fnuv = ler("assets/fotos-nuvem.js") if os.path.exists("assets/fotos-nuvem.js") else ""
if fnuv:
    urls = set(re.findall(r"https://[^\"']+", fnuv))
    if urls - {"https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia-imagem"}:
        problemas.append(f"assets/fotos-nuvem.js: só pode falar com a Edge Function bw-ia-imagem ({urls})")
    if re.search(r"\.upload\(|user_data|antesDeSalvar|registrarAgora|storage", fnuv):
        problemas.append("assets/fotos-nuvem.js: não pode guardar nada na nuvem (Storage/user_data/BWSync)")
    if "confirm(" not in fotosjs.split("async function iaCriar")[1][:900] if "async function iaCriar" in fotosjs else True:
        problemas.append("assets/fotos.js: a IA criativa precisa pedir confirmação antes de enviar a foto")
# 16/11: CRIADOR IA — só fala com as Edge Functions bw-ia (textos) e, pelo fotos-nuvem.js, bw-ia-imagem; nada gravado na nuvem;
# foto só sai no modo "IA coloca a pessoa", com confirmação
pia = ler("assets/promptia.js") if os.path.exists("assets/promptia.js") else ""
if pia:
    # PROMPT IA (19/11): a imagem da trend só vai para a IA Brightway (bw-ia) e só depois de confirm(); a biblioteca grava em bw_trends (só ADM, RLS)
    if "confirm(" not in pia or "functions/v1/bw-ia" not in pia: problemas.append("assets/promptia.js: a imagem só pode ir para a bw-ia e depois de confirm()")
    if re.search(r"fetch\((?!FN_IA)", pia): problemas.append("assets/promptia.js: só pode chamar a Edge Function bw-ia (fetch(FN_IA…))")
    if "antesDeSalvar" in pia or "user_data" in pia: problemas.append("assets/promptia.js: o PROMPT IA não grava nada na conta do usuário")
pjs = ler("assets/personagens.js") if os.path.exists("assets/personagens.js") else ""
if pjs:
    if [u for u in re.findall(r"https?://[^\s\"']+", pjs) if "functions/v1/bw-ia" not in u]: problemas.append("assets/personagens.js: só pode chamar a Edge Function bw-ia")
    if "confirm(" not in pjs or "antesDeSalvar" in pjs or ".upload(" in pjs: problemas.append("assets/personagens.js: imagem com IA só com confirmação; nada vai para a conta")
if os.path.exists("assets/personagens-prontos.js") and re.search(r"fetch\(|XMLHttpRequest|localStorage|indexedDB", ler("assets/personagens-prontos.js")): problemas.append("assets/personagens-prontos.js: só lista os prontos (não busca nem grava nada)")
if os.path.exists("assets/bw-personagens.js") and re.search(r"fetch\(|XMLHttpRequest|supabase", ler("assets/bw-personagens.js")): problemas.append("assets/bw-personagens.js: a biblioteca de personagens não fala com a internet")
if os.path.exists("assets/video-editor.js") and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync\.(?!cliente)|\.upload\(|https?://", ler("assets/video-editor.js")): problemas.append("assets/video-editor.js: o editor de vídeo não envia nada (sem fetch, upload, conta nem endereço de fora)")
if os.path.exists("assets/bw-proxy.js") and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync\.|\.upload\(|https?://", ler("assets/bw-proxy.js")): problemas.append("assets/bw-proxy.js: o proxy é feito no aparelho e não pode enviar nada (PENTE FINO 182)")
if os.path.exists("video.html") and "assets/bw-proxy.js" not in ler("video.html"): problemas.append("video.html: precisa carregar assets/bw-proxy.js (FAZER PROXY, PENTE FINO 182)")
# TELAS EM MOVIMENTO (20/11): fotos, vídeos e música ficam no aparelho — motor e editor sem rede, conta ou envio
for _f in ("assets/telas-motor.js", "assets/telas.js", "assets/album-motor.js", "assets/album.js"):
    if os.path.exists(_f) and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync\.(?!cliente)|\.upload\(|https?://", ler(_f)): problemas.append(_f + ": Telas em movimento não envia nada (sem fetch, upload, conta nem endereço de fora)")
# ESTÚDIO DE MOTION (20/11): o motor só desenha (nada de rede); o editor só fala com a IA Brightway (bw-ia) e nunca grava na conta
# 20/11: ferramentas/atalhos comuns dos editores — só interface; nada de rede, conta ou armazenamento
# 7.8g CONTROLE PELO CELULAR (21/11): só comando e tempo pelo canal de aviso (broadcast) — nada de banco, upload nem mídia
_bc = _arq("assets/bw-controle.js") if "_arq" in dir() else (open("assets/bw-controle.js",encoding="utf-8").read() if os.path.exists("assets/bw-controle.js") else "")
if _bc and re.search(r"fetch\(|XMLHttpRequest|\.from\(|\.upload\(|\.rpc\(|localStorage|indexedDB|captureStream|toDataURL\(\)|getImageData", _bc): problemas.append("assets/bw-controle.js: o controle pelo celular só pode mandar comando e tempo pelo canal (nada de banco, arquivo, imagem ou mídia)")
# 7.8h LAYOUT DE APP do editor de vídeo (22/11): só arruma a tela — nada de rede, conta, arquivo ou dado novo (só a preferência ui_ve_layout)
if os.path.exists("assets/ve-app.js") and re.search(r"fetch\(|XMLHttpRequest|supabase|BWSync|\.upload\(|indexedDB|https?://", open("assets/ve-app.js", encoding="utf-8").read()): problemas.append("assets/ve-app.js: o layout de app do editor só pode arrumar a tela (nada de rede, conta ou banco)")
if os.path.exists("video.html") and "assets/ve-app.js" in open("video.html", encoding="utf-8").read() and open("video.html", encoding="utf-8").read().find("assets/ve-app.js") > open("video.html", encoding="utf-8").read().find("assets/video-editor.js"): problemas.append("video.html: assets/ve-app.js precisa vir ANTES do video-editor.js (liga a classe ve-app antes do editor montar)")
# 7.8k (22/11) BIBLIOTECA INTEGRADA do motion: só LÊ o que existe nas outras ferramentas (nada de rede, conta, gravação)
if os.path.exists("assets/motion-biblio.js") and re.search(r"fetch\(|XMLHttpRequest|supabase|BWSync|localStorage|\.upload\(|\.salvar\(|\.guardar\(|indexedDB", ler("assets/motion-biblio.js")): problemas.append("assets/motion-biblio.js: a biblioteca integrada só lê (sem rede, conta nem gravação)")
if os.path.exists("motion.html") and "assets/motion-biblio.js" not in open("motion.html", encoding="utf-8").read(): problemas.append("motion.html: falta a biblioteca integrada (assets/motion-biblio.js)")
# 7.8i (22/11) Motion com cara de app no celular: mo-app.js só arruma a tela (nada de rede/conta) e vem ANTES do motion.js
if os.path.exists("assets/mo-app.js") and re.search(r"fetch\(|XMLHttpRequest|supabase|BWSync|\.upload\(|indexedDB|https?://", open("assets/mo-app.js", encoding="utf-8").read()): problemas.append("assets/mo-app.js: o layout de app do Motion não pode falar com a internet nem guardar dados")
_mh = open("motion.html", encoding="utf-8").read() if os.path.exists("motion.html") else ""
if _mh and ("assets/mo-app.js" not in _mh or _mh.find("assets/mo-app.js") > _mh.find("assets/motion.js")): problemas.append("motion.html: assets/mo-app.js precisa vir ANTES do assets/motion.js")
if os.path.exists("assets/bw-ferramentas.js") and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync|localStorage|indexedDB|\.upload\(", ler("assets/bw-ferramentas.js")): problemas.append("assets/bw-ferramentas.js: as ferramentas dos editores não podem usar rede, conta nem armazenamento")
# 7.8j CONVITE ANIMADO (22/11): bichinhos e efeitos só desenham (sem rede, conta nem armazenamento); a música e o vídeo ficam no aparelho
if os.path.exists("assets/convite-anim.js"):
    _ca = ler("assets/convite-anim.js")
    if re.search(r"fetch\(|XMLHttpRequest|createClient|BWSync|localStorage|indexedDB|\.upload\(", _ca) or [u for u in re.findall(r"https?://[^\"' ]+", _ca) if not u.startswith("https://zdtnetplvdonogmdvarx.supabase.co/storage/v1/object/public/trends/objetos/")]:
        problemas.append("assets/convite-anim.js: os bichinhos e efeitos do convite só podem desenhar e LER as imagens da biblioteca oficial (trends/objetos) — sem enviar nada")
if os.path.exists("criador.html") and "assets/convite-anim.js" not in ler("criador.html"): problemas.append("criador.html: falta assets/convite-anim.js (convite animado)")
# ESTÚDIO 3D (20/11): modelo, logo e foto ficam no aparelho; o site não chama nenhuma IA de 3D
if os.path.exists("assets/bw3d-motor.js") and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync|localStorage|indexedDB|\.upload\(|https?://", ler("assets/bw3d-motor.js")):
    problemas.append("assets/bw3d-motor.js: o motor 3D só desenha (sem rede, conta nem armazenamento)")
if os.path.exists("assets/bw3d.js"):
    _t3 = ler("assets/bw3d.js")
    if re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync\.(?!cliente)|\.upload\(|antesDeSalvar", _t3):
        problemas.append("assets/bw3d.js: o Estúdio 3D não envia nada (modelo, logo e foto ficam no aparelho)")
    _ok3d = {"https://www.tripo3d.ai/", "https://www.meshy.ai/", "https://hyper3d.ai/", "https://3d.hunyuan.tencent.com/"}
    _fora3d = {u for u in re.findall(r"https?://[^\"'\s)]+", _t3) if not u.startswith("https://cdn.jsdelivr.net/npm/pdfmake@")} - _ok3d
    if _fora3d: problemas.append("assets/bw3d.js: endereco de fora nao permitido (" + ", ".join(sorted(_fora3d)) + ")")
# PLANO DO PROJETO (20/11): só lê a placa do próprio navegador — não manda nada para lugar nenhum
if os.path.exists("assets/bw3d-plano.js"):
    _pl = ler("assets/bw3d-plano.js")
    if re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync|indexedDB|\.upload\(", _pl):
        problemas.append("assets/bw3d-plano.js: o plano do projeto só lê a máquina do usuário (sem rede nem envio)")
    _okbib = {"https://pixabay.com/pt/3d-models/", "https://www.mixamo.com/", "https://polyhaven.com/models"}
    _forabib = set(re.findall(r"https?://[^\"'\s)]+", _pl)) - _okbib
    if _forabib: problemas.append("assets/bw3d-plano.js: endereco de fora nao permitido (" + ", ".join(sorted(_forabib)) + ")")
    if "WEBGL_debug_renderer_info" not in _pl:
        problemas.append("assets/bw3d-plano.js: sem a leitura da placa de vídeo")
if os.path.exists("3d.html"):
    _h3 = ler("3d.html")
    for _n3 in ("assets/bw3d-motor.js", "assets/bw3d.js", "assets/bw3d-plano.js", "assets/reels-celular.js", "assets/bw-ferramentas.js", "assets/modos.js"):
        if _n3 not in _h3: problemas.append("3d.html: falta " + _n3)
for _p in ("video.html", "telas.html", "album3d.html", "motion.html", "fotos.html", "3d.html"):
    if os.path.exists(_p) and "assets/bw-ferramentas.js" not in ler(_p): problemas.append(_p + ": editor sem as ferramentas/atalhos comuns (assets/bw-ferramentas.js) e sem a TELA FIXA")
if os.path.exists("assets/motion-motor.js") and re.search(r"fetch\(|XMLHttpRequest|supabase\.|BWSync|localStorage|indexedDB|\.upload\(", ler("assets/motion-motor.js")): problemas.append("assets/motion-motor.js: o motor de motion só desenha (sem rede, conta nem armazenamento)")
if os.path.exists("assets/motion.js"):
    _mo = ler("assets/motion.js")
    if re.search(r"XMLHttpRequest|supabase\.from|\.upload\(|antesDeSalvar|BWSync\.(?!cliente)", _mo) or len(re.findall(r"fetch\(", _mo)) != 1 or "functions/v1/bw-ia\"" not in _mo:
        problemas.append("assets/motion.js: o Estúdio de motion só chama a bw-ia (efeito por frase); nada vai para a conta")
crjs = ler("assets/criador.js") if os.path.exists("assets/criador.js") else ""
if crjs:
    urls = {u for u in re.findall(r"https://[^\"'\s)]+", crjs) if "supabase.co" in u}
    if urls - {"https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-ia"}:
        problemas.append(f"assets/criador.js: só pode chamar a Edge Function bw-ia ({urls})")
    if re.search(r"\.upload\(|user_data|antesDeSalvar|registrarAgora|\.storage", crjs):
        problemas.append("assets/criador.js: o Criador IA não pode guardar nada na nuvem")
    if "confirm(" not in crjs.split("async function criarIA")[1][:900] if "async function criarIA" in crjs else True:
        problemas.append("assets/criador.js: precisa pedir confirmação antes de mandar a foto para a IA")
    if "criador.html" in todos and "assets/fotos-nuvem.js" not in todos["criador.html"]:
        problemas.append("criador.html: não carrega assets/fotos-nuvem.js")
for p in ["equipe.html", "eventos.html"]:   # 16/11: PDF da equipe / dossiê juntam os anexos (pente fino 43)
    if p in todos and "assets/bw-anexos.js" not in todos[p]:
        problemas.append(f"{p}: não carrega assets/bw-anexos.js (os PDFs anexados não entram no relatório)")
for p in ["equipe.html", "eventos.html"]:   # 16/11: ALTERAR + CPF/CNH de colaboradores e clientes (pente fino 41)
    if p in todos and not all(x in todos[p] for x in ["data-colab-ed", "cbCNH", "data-cli-edit", "cCNH"]):
        problemas.append(f"{p}: colaboradores/clientes sem ✎ ALTERAR ou sem CNH")
if "fotos.html" in todos and "assets/fotos.js" not in todos["fotos.html"]:
    problemas.append("fotos.html: não carrega assets/fotos.js (o editor)")
# 7.8b IA no site: nenhuma chave de API de IA no código (Groq/OpenAI/Gemini/Anthropic) — IA na nuvem só por Edge Function
for p, t2 in todos.items():
    if re.search(r"(?<![\w-])(gsk_[A-Za-z0-9]{20,}|sk-(ant-|proj-)?[A-Za-z0-9_-]*\d[A-Za-z0-9_-]{18,}|AIza[0-9A-Za-z_-]{30,})", t2):
        problemas.append(f"{p}: chave de API de IA no código (vaza para qualquer visitante) — use Edge Function do Supabase")
# 7.8c AMBIENTES (20/11/2026, decisão do dono): MINHA EMPRESA (PJ) e MINHA CASA (PF) não se misturam
def _arq(n):
    return ler(n) if os.path.exists(n) else ""
_lj, _ag, _pn, _ix = _arq("assets/lancamentos.js"), _arq("assets/agenda.js"), todos.get("financeiro-painel.html", ""), todos.get("index.html", "")
if "DEST[dest].amb !== AMB" not in _lj or "NICHOS_AMB[AMB][n]" not in _lj or "DEST[k].amb === DEST[o.dest].amb" not in _lj:
    problemas.append("assets/lancamentos.js: sem a trava PJ × PF (lista, criar e mudar de lugar só dentro do ambiente)")
if "function montarCasa" not in _pn or 'id="fpAbas"' not in _pn or "if (PF) {" not in _pn:
    problemas.append("financeiro-painel.html: sem as abas PAINEL PJ | PAINEL PF com dados separados")
if "if (amb && ambDe(t) !== amb) return;" not in _ag or 'if (PF) ler("casa_contas")' not in _ag or 'if (PJ) ler("neg_eventos")' not in _ag:
    problemas.append("assets/agenda.js: a agenda não separa empresa e casa")
if 'id="ambPortal"' not in _ix or 'id="bwAgenda"' in _ix or "MOD['modules/agenda']" in _ix:
    problemas.append("index.html: o Início é o robô com as telas dos ecossistemas; a agenda fica em cada ambiente")
if _ix.count('class="hub-tela"') != 4 or "assets/portal.js" not in _ix or not all(('href="%s"' % h) in _ix for h in ("negocio.html", "casa.html", "marketing.html", "ferramentas.html")):
    problemas.append("index.html: faltam as 4 telas do Início (MEU NEGÓCIO, GESTÃO DE CASA, MARKETING, FERRAMENTAS) ou o assets/portal.js")
_pt = _arq("assets/portal.js")
if re.search(r"\b(fetch|XMLHttpRequest|localStorage|BWSync|supabase)\b", _pt):
    problemas.append("assets/portal.js: a página principal não lê nem grava dados (só gira as telas e abre o ecossistema)")
for _img in ("icons/robo-bw.webp", "icons/robo-bw-128.png"):
    if not os.path.exists(_img) or open(_img, "rb").read(4) not in (b"RIFF", b"\x89PNG"):
        problemas.append(f"{_img}: a imagem do robô sumiu ou não é binária")
for _p, _a in (("negocio.html", "pj"), ("casa.html", "pf")):
    _t = todos.get(_p, "")
    if '<html lang="pt-BR" data-amb="%s">' % _a not in _t or 'id="bwAgenda" data-amb="%s"' % _a not in _t or 'href="lancamentos.html?a=%s"' % _a not in _t \
            or 'href="financeiro-painel.html?a=%s"' % _a not in _t or "assets/agenda.js" not in _t or "assets/ambiente.js" not in _t:
        problemas.append(f"{_p}: página do ambiente incompleta (gere de novo: python3 docs/automacoes/gerar-ambientes.py)")
if 'href="downloads/BW-Setup.exe"' not in todos.get("baixar.html", "") or not os.path.exists("downloads/BW-Setup.exe") or open("downloads/BW-Setup.exe", "rb").read(2) != b"MZ":
    problemas.append("baixar.html: o botão de download do app BW (.exe) sumiu ou o instalador não está em downloads/")
# 7.8d MODOS DE APARÊNCIA (20/11/2026): modos.js no <head> de toda página; só preferências locais (ui_*); nada de rede
_mj, _cj = _arq("assets/modos.js"), _arq("assets/config.js")
for _p, _t in todos.items():
    if "</head>" in _t and "assets/modos.js" not in _t.split("</head>")[0]:
        problemas.append(f"{_p}: sem assets/modos.js no <head> (a página não acompanha o modo de aparência escolhido)")
if re.search(r"fetch\(|XMLHttpRequest|supabase|BWSync|indexedDB|\.upload\(", _mj) or re.search(r"(get|set)Item\(\s*[\"']bw_", _mj + _cj):
    problemas.append("assets/modos.js / config.js: os modos só guardam preferências locais (ui_*); não usam rede nem mexem nos dados da conta")
if re.search(r"fetch\(|XMLHttpRequest|\.upload\(|\.from\(", _cj):
    problemas.append("assets/config.js: a imagem da marca é lida no aparelho — a página não envia nem grava nada na conta")
if 'href="config.html"' not in lay or not os.path.exists("assets/modos.css") or 'id="cfgModos"' not in todos.get("config.html", ""):
    problemas.append("CONFIGURAÇÕES: falta a engrenagem no layout.js, o assets/modos.css ou a lista de modos em config.html")
# 7.8g AVISO ÚNICO DO ECOSSISTEMA (23/11/2026, regra do dono): "um escrito simples no meio da tela,
# que some em seguida" — a MESMA caixa em todas as ferramentas (BWAviso do layout.js). Aviso de ação
# nunca é desenhado pela própria ferramenta, e nunca vira tutorial.
_lay = _arq("assets/layout.js")
if "window.BWAviso = mostrar" not in _lay:
    problemas.append("assets/layout.js: sem o BWAviso (o aviso único que todas as ferramentas usam)")
_bcss = _arq("assets/brightway.css")
if "#bwAviso" not in _bcss or ".bw-msg" not in _bcss:
    problemas.append("assets/brightway.css: sem o estilo do aviso único (#bwAviso) ou da mensagem de formulário (.bw-msg)")
for _f in sorted(glob.glob(os.path.join(RAIZ, "assets", "*.js")) + glob.glob(os.path.join(RAIZ, "*.html"))):
    _rel = os.path.relpath(_f, RAIZ); _s = _arq(_rel)
    for _m in re.finditer(r"function (aviso|toast|avisoPP)\((.*?)\) \{(.*?)\n", _s, re.S):
        _c = _m.group(3)
        if "BWAviso" in _c or ".aviso(" in _c: continue
        _some = "setTimeout" in _c and ("hidden = true" in _c or ".remove()" in _c or 'remove("vis")' in _c)
        if _some or ("createElement" in _c and "appendChild" in _c):
            problemas.append(f"{_rel}: aviso próprio em function {_m.group(1)}() — todo aviso de ação passa pelo BWAviso (regra 207)")
    for _m in re.finditer(r'(?:aviso|toast)\("([^"]{86,})"', _s):
        problemas.append(f'{_rel}: aviso comprido demais ("{_m.group(1)[:40]}…") — o aviso é uma frase curta, não um tutorial')

# 7.8f AMBIENTE ÚNICO (20/11/2026): a LINHA DO TEMPO é o centro; a biblioteca de criações nunca sai do aparelho
_bc = _arq("assets/bw-criacoes.js")
if re.search(r"fetch\(|XMLHttpRequest|supabase|BWSync|\.upload\(|\.from\(", _bc):
    problemas.append("assets/bw-criacoes.js: as criações ficam no aparelho (IndexedDB bw_criacoes) — nada de rede, upload nem conta")
if re.search(r"(get|set)Item\(\s*[\"']bw_", _bc):
    problemas.append("assets/bw-criacoes.js: só preferências locais (ui_*) — não mexe nos dados da conta")
_FERR_CRIA = {"motion.html": "motion", "telas.html": "telas", "album3d.html": "album", "3d.html": "d3", "fotos.html": "fotos", "criador.html": "criador", "reels.html": "reels", "video.html": "video"}
for _pg in _FERR_CRIA:
    if "assets/bw-criacoes.js" not in todos.get(_pg, ""):
        problemas.append(f"{_pg}: sem assets/bw-criacoes.js (a criação não chega na linha do tempo)")
_ve = _arq("assets/video-editor.js")
if 'id="veCriarLista"' not in todos.get("video.html", "") or "desenharFerramentas" not in _ve or "trazerCriacao" not in _ve:
    problemas.append("EDITOR DE VÍDEO: falta a caixa CRIAR PARA A LINHA DO TEMPO (veCriarLista) ou a entrada das criações")
if "data-editar" not in _ve or "editarNaOrigem" not in _ve:
    problemas.append("EDITOR DE VÍDEO: toda criação precisa do ✎ que reabre a ferramenta de origem e troca no lugar")
for _a, _id in (("assets/motion.js", "moExpBaixar"), ("assets/telas.js", "tlBaixar"), ("assets/album.js", "alBaixar"), ("assets/bw3d.js", "d3Baixar"), ("assets/criador.js", "btnPng"), ("assets/reels.js", "aquiBaixar")):
    if "BWCriacoes.aoLado(\"" + _id + "\"" not in _arq(_a):
        problemas.append(f"{_a}: sem o botão ➜ MANDAR PARA A LINHA DO TEMPO ao lado de #{_id}")
if 'data-k="linha"' not in _arq("assets/fotos.js"):
    problemas.append("assets/fotos.js: sem o ➜ LINHA DO TEMPO na aba SALVAR")

# 7.10 SEGURANÇA DAS PÁGINAS (23/11/2026, análise de segurança pedida pelo dono — docs/automacoes/seguranca-paginas.py)
#   a) toda página com a CSP (meta logo depois do charset); b) <script> de CDN com versão EXATA e selo integrity;
#   c) nenhuma biblioteca com falha conhecida (pdf.js < 4.2.67 → CVE-2024-4367; node-forge < 1.3.2; xlsx 0.18.x);
#   d) POLÍTICA DE USO no menu (layout.js) e a página existe.
for p, t in todos.items():
    if 'http-equiv="Content-Security-Policy"' not in t:
        problemas.append(f"{p}: sem CSP (rode python3 docs/automacoes/seguranca-paginas.py)")
    for tag in re.findall(r'<script\b[^>]*\bsrc="https://[^"]+"[^>]*>', t):
        if "integrity=" not in tag:
            problemas.append(f"{p}: biblioteca do CDN sem selo integrity: {tag[:90]}")
_codigo = {p: t for p, t in todos.items()}
for raiz, _, arqs in os.walk("assets"):
    for a in arqs:
        if a.endswith(".js"):
            _codigo[os.path.join(raiz, a)] = open(os.path.join(raiz, a), encoding="utf8", errors="replace").read()
for p, t in _codigo.items():
    for m in re.findall(r'cdn\.jsdelivr\.net/npm/((?:@[\w.-]+/)?[\w.-]+)@(\d+)/', t):
        problemas.append(f"{p}: biblioteca sem versão exata ({m[0]}@{m[1]}) — fixe a versão (x.y.z)")
    for v in re.findall(r'pdfjs-dist@(\d+)\.(\d+)\.(\d+)', t):
        if tuple(map(int, v)) < (4, 2, 67): problemas.append(f"{p}: pdf.js {'.'.join(v)} tem a falha CVE-2024-4367 (use ≥ 4.2.67)")
    for v in re.findall(r'node-forge@(\d+)\.(\d+)\.(\d+)', t):
        if tuple(map(int, v)) < (1, 3, 2): problemas.append(f"{p}: node-forge {'.'.join(v)} tem falhas conhecidas (use ≥ 1.3.2)")
    if "xlsx@0.18" in t: problemas.append(f"{p}: xlsx 0.18 tem falhas conhecidas (use o CDN do SheetJS 0.20.3+)")
if "politica.html" not in ler("assets/layout.js") or "POLÍTICA DE USO" not in ler("assets/layout.js"):
    problemas.append("layout.js: POLÍTICA DE USO sumiu do menu")
if "seguranca.html" not in ler("assets/layout.js") or "SEGURANÇA E DADOS" not in ler("assets/layout.js"):
    problemas.append("layout.js: SEGURANÇA E DADOS sumiu do menu (página dedicada aos dados, compartilhamentos e testes)")
if "bw-escudo--topo" not in ler("assets/layout.js") or "bw-escudo--menu" not in ler("assets/layout.js"):
    problemas.append("layout.js: o ESCUDO de segurança ao lado do LOGADO (topo e menu) sumiu")

# 7.9 páginas com o visual novo (menu lateral) — exceto as de propósito
SEM_MENU = {"controle.html", "login.html", "cadastro.html", "pedido.html", "baixar.html", "downloads.html", "privacidade.html", "termos.html", "politica.html", "financeiro-painel.html", "investimentos-painel.html", "app.html", "financeiro.html", "fluxo.html", "custos.html"}
for p, t in todos.items():
    if p not in SEM_MENU and "assets/layout.js" not in t:
        problemas.append(f"{p}: sem o visual novo (não carrega assets/layout.js)")

# relatório
print("VIGIA DO BRIGHTWAY")
print(f"{len(PAGINAS)} páginas conferidas.")
for a in avisos:
    print("⚠️  " + a)
if problemas:
    print(f"\n❌ {len(problemas)} problema(s):")
    for x in problemas:
        print(" - " + x)
    with open(os.environ.get("VIGIA_SAIDA", "/tmp/vigia.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join("- " + x for x in problemas))
    sys.exit(1)
print("✅ Tudo certo.")
