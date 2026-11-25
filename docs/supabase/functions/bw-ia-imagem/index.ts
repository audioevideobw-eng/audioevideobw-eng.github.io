// IA CRIATIVA do editor de fotos (Edge Function "bw-ia-imagem") — 16/11/2026, Claude
// Recebe (multipart) {imagem ≤ 504 px, pedido, w, h} de um usuário LOGADO e pede à Cloudflare Workers AI
// (FLUX.2 [klein] 4B — ~110 "neurônios" por foto; a conta grátis tem 10.000/dia) uma NOVA VERSÃO da foto.
// As chaves ficam nos Secrets CF_ACCOUNT_ID e CF_API_TOKEN (nunca no site). Nada é gravado: a foto e o pedido
// só passam por aqui. Limite: 15 imagens/dia por conta (tabela bw_ia_img_uso). {ping:true} diz se está pronta.
// modo=editar (padrão): muda só o pedido na foto. modo=arte (CRIADOR IA): cria uma arte de fundo SEM LETRAS para convite/post/flyer/
// cartão — com a pessoa da foto (opcional) — e deixa um espaço limpo onde o app escreve os textos com fontes de verdade.
// 25/11 (MINHAS IAS, decisão do dono): quem conectou a PRÓPRIA conta da Cloudflare manda nos cabeçalhos x-bw-cf-conta + x-bw-cf-token;
// a função usa essa chave SÓ neste pedido (não grava, não devolve, não registra) e o pedido NÃO conta no limite da plataforma.
// {ping:true, testar:true} + os cabeçalhos (logado) confere se a chave da pessoa vale.
import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMITE_DIA = 15;
const LIMITE_ADM = 100;   // 19/11 (decisão do dono): só a conta ADM (is_bw_admin) pode mais por dia, para montar as bibliotecas oficiais
const MODELO = "@cf/black-forest-labs/flux-2-klein-4b";
const CORS = {
  "Access-Control-Allow-Origin": "https://audioevideobw-eng.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-bw-cf-conta, x-bw-cf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
// pedidos que a ferramenta não faz (nudez/sexual) — o resto segue para a IA, que tem filtros próprios
// chave da própria pessoa (só formato; quem diz se vale é a Cloudflare)
function chaveSua(req: Request): { conta: string; token: string } | null {
  const c = (req.headers.get("x-bw-cf-conta") || "").trim(), t = (req.headers.get("x-bw-cf-token") || "").trim();
  return /^[a-f0-9]{32}$/i.test(c) && /^[\x21-\x7e]{20,400}$/.test(t) ? { conta: c, token: t } : null;
}
// conectar mais fácil: a pessoa cola só o TOKEN e, se ele enxerga uma conta só, o app descobre o ID sozinho
async function acharConta(token: string): Promise<string | null> {
  const r = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=5", { headers: { "Authorization": `Bearer ${token}` } }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  const l = Array.isArray(j?.result) ? j.result : [];
  return l.length === 1 && /^[a-f0-9]{32}$/i.test(l[0]?.id || "") ? l[0].id : null;
}
async function conferirCF(conta: string, token: string): Promise<{ ok: boolean; motivo?: string }> {
  const h = { "Authorization": `Bearer ${token}` };
  for (const u of [`https://api.cloudflare.com/client/v4/accounts/${conta}/tokens/verify`, "https://api.cloudflare.com/client/v4/user/tokens/verify"]) {
    const r = await fetch(u, { headers: h }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok && j?.result?.status === "active") return { ok: true };
  }
  return { ok: false, motivo: "a Cloudflare não aceitou esse token com essa conta" };
}
const PROIBIDO = /\b(nu|nua|nus|nuas|pelad[oa]s?|sem roupa|despid[oa]|nudez|topless|seios?|sexy|sensual|er[oó]tic[oa]|lingerie)\b/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const conta = Deno.env.get("CF_ACCOUNT_ID"), token = Deno.env.get("CF_API_TOKEN");
  const tipo = req.headers.get("Content-Type") || "";

  if (tipo.includes("application/json")) {
    const j = await req.json().catch(() => ({}));
    if (j?.ping && j?.testar) {
      const us = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
      const { data: uu } = await us.auth.getUser();
      if (!uu?.user) return resp({ erro: "sem_login" }, 401);
      let sua = chaveSua(req);
      const tk = (req.headers.get("x-bw-cf-token") || "").trim();
      if (!sua && /^[\x21-\x7e]{20,400}$/.test(tk) && !(req.headers.get("x-bw-cf-conta") || "").trim()) {
        const achada = await acharConta(tk);
        if (!achada) return resp({ ok: false, motivo: "sem_conta" });
        sua = { conta: achada, token: tk };
      }
      if (!sua) return resp({ ok: false, motivo: "formato" });
      const v = await conferirCF(sua.conta, sua.token);
      return resp(v.ok ? { ok: true, conta: sua.conta } : v);
    }
    if (j?.ping) return resp({ pronto: !!(conta && token), limite: LIMITE_DIA });
    return resp({ erro: "corpo" }, 400);
  }
  const usuario = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await usuario.auth.getUser();
  if (!u?.user) return resp({ erro: "sem_login" }, 401);
  const sua = chaveSua(req);
  if (!sua && (!conta || !token)) return resp({ erro: "sem_chave" }, 503);

  let fd: FormData;
  try { fd = await req.formData(); } catch { return resp({ erro: "corpo" }, 400); }
  const img = fd.get("imagem"), pedido = String(fd.get("pedido") || "").trim().slice(0, 700);
  const modoPedido = String(fd.get("modo") || "");
  const modo = modoPedido === "arte" ? "arte" : modoPedido === "pers" ? "pers" : "editar", temFoto = img instanceof File && img.size > 0;
  const espaco = ["topo", "centro", "baixo", "esquerda", "direita"].includes(String(fd.get("espaco"))) ? String(fd.get("espaco")) : "baixo";
  if (!pedido || (modo === "editar" && !temFoto)) return resp({ erro: "vazio" }, 400);
  if (temFoto && (img as File).size > 1.5 * 1024 * 1024) return resp({ erro: "grande" }, 413);
  // 17/11 (QUADRO DE HISTÓRIA): segunda imagem opcional = REFERÊNCIA de lugar/objeto/estilo (só no modo arte, junto com a foto do personagem)
  const img2 = fd.get("imagem2"), temRef = modo === "arte" && temFoto && img2 instanceof File && img2.size > 0;
  if (temRef && (img2 as File).size > 1.5 * 1024 * 1024) return resp({ erro: "grande" }, 413);
  if (PROIBIDO.test(pedido)) return resp({ erro: "proibido" }, 400);
  const lado = (v: unknown) => Math.max(256, Math.min(1440, Math.round((Number(v) || 1024) / 16) * 16));
  const w = lado(fd.get("w")), h = lado(fd.get("h"));

  if (!sua) {   // com a chave da própria pessoa, a conta dela paga — não conta no limite da plataforma
    const adm = createClient(url, service);
    const { data: ehAdm } = await usuario.rpc("is_bw_admin");
    const { data: ok, error: e1 } = await adm.rpc("bw_ia_img_contar", { p_dono: u.user.id, p_limite: ehAdm === true ? LIMITE_ADM : LIMITE_DIA });
    if (e1) return resp({ erro: "contador" }, 500);
    if (!ok) return resp({ erro: "limite" }, 429);
  }

  const cf = new FormData();
  const ESPACO: Record<string, string> = { topo: "the upper third", centro: "the center", baixo: "the lower third", esquerda: "the left half", direita: "the right half" };
  const SEM_TEXTO = " ABSOLUTELY NO text, no letters, no numbers, no words, no typography, no watermark, no logo, no signature anywhere in the image.";
  let prompt: string;
  if (modo === "editar") prompt = "Edit the photo in image 0. Change ONLY this: " + pedido +
    ". Keep the same person (face, identity, skin tone, age, expression), the same pose, framing, lighting and everything else exactly as in image 0. Photorealistic, natural, high detail.";
  // 19/11 modo=pers (PERSONAGENS): personagem limpo, sem a regra de "espaço para texto"; com foto = o MESMO personagem em outro ângulo/pose
  else if (modo === "pers") prompt = (temFoto
    ? "Show exactly the same character as in image 0: identical face, hair, body proportions, outfit, colors, materials and art style. "
    : "") + pedido + ". High quality, sharp details, consistent character design." + SEM_TEXTO;
  else prompt = (temFoto
    ? "Create a polished design artwork featuring the person from image 0 — keep exactly the same face, identity, skin tone and age; the person must stay recognizable. "
    : "Create a polished design artwork background. ") + pedido +
    ". Professional graphic-design quality, harmonious colors, sharp details. Keep " + ESPACO[espaco] +
    " of the image calm and uncluttered (soft background, low detail) so text can be placed there later." +
    (temRef ? " Use image 1 ONLY as the reference for the place, objects, colors and visual style of the scene; do not copy any person from image 1." : "") + SEM_TEXTO;
  cf.append("prompt", prompt);
  if (temFoto) cf.append("input_image_0", img as File, "foto.jpg");
  if (temRef) cf.append("input_image_1", img2 as File, "referencia.jpg");
  const seed = Number(fd.get("seed")); if (Number.isFinite(seed) && seed > 0) cf.append("seed", String(Math.floor(seed) % 2147483647));
  cf.append("width", String(w)); cf.append("height", String(h));
  const usaConta = sua ? sua.conta : conta, usaToken = sua ? sua.token : token;
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${usaConta}/ai/run/${MODELO}`, {
    method: "POST", headers: { "Authorization": `Bearer ${usaToken}` }, body: cf,
  });
  const j = await r.json().catch(() => ({}));
  const b64 = j?.result?.image;
  if (!r.ok || !b64) {
    const msg = JSON.stringify(j?.errors || j).slice(0, 200);
    const cota = r.status === 429 || /capacity|neuron|limit/i.test(msg);
    const erro = sua && (r.status === 401 || r.status === 403 || /auth|permission|token/i.test(msg)) ? "chave_sua"
      : cota ? (sua ? "cota_sua" : "cota") : /nsfw|safety|flag/i.test(msg) ? "filtro" : "cloudflare";
    return resp({ erro, detalhe: msg }, r.ok ? 502 : r.status === 429 ? 429 : 502);
  }
  return resp({ imagem: b64, sua: !!sua });
});
