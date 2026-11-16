// IA CRIATIVA do editor de fotos (Edge Function "bw-ia-imagem") — 16/11/2026, Claude
// Recebe (multipart) {imagem ≤ 504 px, pedido, w, h} de um usuário LOGADO e pede à Cloudflare Workers AI
// (FLUX.2 [klein] 4B — ~110 "neurônios" por foto; a conta grátis tem 10.000/dia) uma NOVA VERSÃO da foto.
// As chaves ficam nos Secrets CF_ACCOUNT_ID e CF_API_TOKEN (nunca no site). Nada é gravado: a foto e o pedido
// só passam por aqui. Limite: 15 imagens/dia por conta (tabela bw_ia_img_uso). {ping:true} diz se está pronta.
// modo=editar (padrão): muda só o pedido na foto. modo=arte (CRIADOR IA): cria uma arte de fundo SEM LETRAS para convite/post/flyer/
// cartão — com a pessoa da foto (opcional) — e deixa um espaço limpo onde o app escreve os textos com fontes de verdade.
import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMITE_DIA = 15;
const MODELO = "@cf/black-forest-labs/flux-2-klein-4b";
const CORS = {
  "Access-Control-Allow-Origin": "https://audioevideobw-eng.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
// pedidos que a ferramenta não faz (nudez/sexual) — o resto segue para a IA, que tem filtros próprios
const PROIBIDO = /\b(nu|nua|nus|nuas|pelad[oa]s?|sem roupa|despid[oa]|nudez|topless|seios?|sexy|sensual|er[oó]tic[oa]|lingerie)\b/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const conta = Deno.env.get("CF_ACCOUNT_ID"), token = Deno.env.get("CF_API_TOKEN");
  const tipo = req.headers.get("Content-Type") || "";

  if (tipo.includes("application/json")) {
    const j = await req.json().catch(() => ({}));
    if (j?.ping) return resp({ pronto: !!(conta && token), limite: LIMITE_DIA });
    return resp({ erro: "corpo" }, 400);
  }
  const usuario = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await usuario.auth.getUser();
  if (!u?.user) return resp({ erro: "sem_login" }, 401);
  if (!conta || !token) return resp({ erro: "sem_chave" }, 503);

  let fd: FormData;
  try { fd = await req.formData(); } catch { return resp({ erro: "corpo" }, 400); }
  const img = fd.get("imagem"), pedido = String(fd.get("pedido") || "").trim().slice(0, 700);
  const modo = fd.get("modo") === "arte" ? "arte" : "editar", temFoto = img instanceof File && img.size > 0;
  const espaco = ["topo", "centro", "baixo", "esquerda", "direita"].includes(String(fd.get("espaco"))) ? String(fd.get("espaco")) : "baixo";
  if (!pedido || (modo === "editar" && !temFoto)) return resp({ erro: "vazio" }, 400);
  if (temFoto && (img as File).size > 1.5 * 1024 * 1024) return resp({ erro: "grande" }, 413);
  if (PROIBIDO.test(pedido)) return resp({ erro: "proibido" }, 400);
  const lado = (v: unknown) => Math.max(256, Math.min(1440, Math.round((Number(v) || 1024) / 16) * 16));
  const w = lado(fd.get("w")), h = lado(fd.get("h"));

  const adm = createClient(url, service);
  const { data: ok, error: e1 } = await adm.rpc("bw_ia_img_contar", { p_dono: u.user.id, p_limite: LIMITE_DIA });
  if (e1) return resp({ erro: "contador" }, 500);
  if (!ok) return resp({ erro: "limite" }, 429);

  const cf = new FormData();
  const ESPACO: Record<string, string> = { topo: "the upper third", centro: "the center", baixo: "the lower third", esquerda: "the left half", direita: "the right half" };
  const SEM_TEXTO = " ABSOLUTELY NO text, no letters, no numbers, no words, no typography, no watermark, no logo, no signature anywhere in the image.";
  let prompt: string;
  if (modo === "editar") prompt = "Edit the photo in image 0. Change ONLY this: " + pedido +
    ". Keep the same person (face, identity, skin tone, age, expression), the same pose, framing, lighting and everything else exactly as in image 0. Photorealistic, natural, high detail.";
  else prompt = (temFoto
    ? "Create a polished design artwork featuring the person from image 0 — keep exactly the same face, identity, skin tone and age; the person must stay recognizable. "
    : "Create a polished design artwork background. ") + pedido +
    ". Professional graphic-design quality, harmonious colors, sharp details. Keep " + ESPACO[espaco] +
    " of the image calm and uncluttered (soft background, low detail) so text can be placed there later." + SEM_TEXTO;
  cf.append("prompt", prompt);
  if (temFoto) cf.append("input_image_0", img as File, "foto.jpg");
  const seed = Number(fd.get("seed")); if (Number.isFinite(seed) && seed > 0) cf.append("seed", String(Math.floor(seed) % 2147483647));
  cf.append("width", String(w)); cf.append("height", String(h));
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/${MODELO}`, {
    method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: cf,
  });
  const j = await r.json().catch(() => ({}));
  const b64 = j?.result?.image;
  if (!r.ok || !b64) {
    const msg = JSON.stringify(j?.errors || j).slice(0, 200);
    return resp({ erro: r.status === 429 || /capacity|neuron|limit/i.test(msg) ? "cota" : /nsfw|safety|flag/i.test(msg) ? "filtro" : "cloudflare", detalhe: msg }, r.ok ? 502 : r.status === 429 ? 429 : 502);
  }
  return resp({ imagem: b64 });
});
