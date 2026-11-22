// bw-galeria — fotos do evento para o CLIENTE, só com o link secreto (22/11/2026, Claude)
// Antes as fotos ficavam no bucket PÚBLICO eventos-midia: quem soubesse o número do evento e o nome do arquivo abria a foto sem o link.
// Agora o bucket é PRIVADO e esta função é o único caminho do cliente: recebe o token do link (tabela bw_galerias), confere,
// e devolve LINKS TEMPORÁRIOS (1 h) só das fotos da pasta daquele evento (nada de subpastas: comprovantes/contratos/nfe ficam de fora).
// Usa a chave de serviço que o próprio Supabase põe na função (SUPABASE_SERVICE_ROLE_KEY) — ela nunca sai daqui.
// Deploy: Supabase → Edge Functions → bw-galeria (Verify JWT DESLIGADO — o cliente não tem conta; o que vale é o token).
import { createClient } from "jsr:@supabase/supabase-js@2";

const env = (k: string) => Deno.env.get(k) ?? "";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...cors } });
const FOTO = /\.(jpe?g|png|webp|gif|heic|heif|mp4|mov|webm)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "metodo" }, 405);
  let token = "";
  try { token = String((await req.json())?.token || ""); } catch { /* corpo vazio */ }
  if (!/^[0-9a-f]{24,80}$/i.test(token)) return json({ erro: "link" }, 400);

  const sb = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const { data: g, error: eg } = await sb.from("bw_galerias").select("evento_id").eq("token", token).maybeSingle();
  if (eg) return json({ erro: "banco" }, 500);
  if (!g || !g.evento_id) return json({ erro: "link" }, 404);

  const pasta = String(g.evento_id);
  const { data: lista, error: el } = await sb.storage.from("eventos-midia").list(pasta, { limit: 300, sortBy: { column: "created_at", order: "asc" } });
  if (el) return json({ erro: "lista" }, 500);
  const nomes = (lista || []).filter((a) => a && a.id && a.name && FOTO.test(a.name)).map((a) => a.name);
  if (!nomes.length) return json({ fotos: [] });

  const { data: assin, error: ea } = await sb.storage.from("eventos-midia").createSignedUrls(nomes.map((n) => pasta + "/" + n), 3600);
  if (ea) return json({ erro: "assinar" }, 500);
  const fotos = (assin || []).map((s, i) => ({ s, nome: nomes[i] })).filter((x) => x.s && x.s.signedUrl && !x.s.error)
    .map((x) => ({ nome: x.nome, url: x.s.signedUrl, video: /\.(mp4|mov|webm)$/i.test(x.nome) }));
  return json({ fotos, validade: 3600 });
});
