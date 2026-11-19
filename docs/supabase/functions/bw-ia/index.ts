// IA Brightway (Edge Function "bw-ia") — 15/11/2026, Claude
// Recebe {sistema, pedido, max} de um usuário LOGADO, chama a Groq com a chave guardada no Supabase
// (Secret GROQ_API_KEY) e devolve {texto}. Também transcreve áudio (Content-Type audio/*) com whisper-large-v3-turbo. A chave nunca vai para o site. Limite: 60 pedidos/dia por conta.
// {ping:true} só diz se está pronta (tem chave). Nada do texto é gravado.
// 19/11/2026 (PROMPT IA, com o "sim" do dono): {imagem:"data:image/jpeg;base64,…", sistema, pedido} → modelo com VISÃO da Groq lê a imagem
// (cópia pequena feita no site, só depois de a pessoa confirmar) e devolve {texto}. A imagem não é gravada. Conta no mesmo limite diário.
import { createClient } from "jsr:@supabase/supabase-js@2";

const LIMITE_DIA = 60;          // textos por dia (conta junto com os pedaços de áudio)
const LIMITE_AUDIO_DIA = 200;   // pedaços de ~3 min de áudio por dia (~10 h)
const MODELOS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
// modelos com visão, na ordem de tentativa (a Groq troca os nomes de tempos em tempos — conferir em console.groq.com/docs/vision)
const MODELOS_VISAO = ["qwen/qwen3.8-27b", "qwen/qwen3.6-27b", "meta-llama/llama-4-scout-17b-16e-instruct"];
const CORS = {
  "Access-Control-Allow-Origin": "https://audioevideobw-eng.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const chave = Deno.env.get("GROQ_API_KEY");

  const auth = req.headers.get("Authorization") || "";
  const usuario = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: u } = await usuario.auth.getUser();
  if (!u?.user) return resp({ erro: "sem_login" }, 401);

  // TRANSCRIÇÃO: o site manda um pedaço de áudio (WAV 16 kHz, até ~3 min) e recebe o texto com os tempos.
  const tipo = req.headers.get("Content-Type") || "";
  if (tipo.startsWith("audio/")) {
    if (!chave) return resp({ erro: "sem_chave" }, 503);
    const audio = await req.arrayBuffer();
    if (audio.byteLength > 20 * 1024 * 1024) return resp({ erro: "grande" }, 413);
    const admA = createClient(url, service);
    const { data: okA, error: eA } = await admA.rpc("bw_ia_contar", { p_dono: u.user.id, p_limite: LIMITE_AUDIO_DIA });
    if (eA) return resp({ erro: "contador" }, 500);
    if (!okA) return resp({ erro: "limite" }, 429);
    const lang = (new URL(req.url).searchParams.get("lang") || "").slice(0, 2);
    const fd = new FormData();
    fd.append("file", new Blob([audio], { type: tipo }), "audio.wav");
    fd.append("model", "whisper-large-v3-turbo");
    fd.append("response_format", "verbose_json");
    fd.append("timestamp_granularities[]", "segment");
    fd.append("temperature", "0");
    if (lang) fd.append("language", lang);
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { "Authorization": `Bearer ${chave}` }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return resp({ erro: r.status === 429 ? "ocupada" : "groq", detalhe: j?.error?.message?.slice(0, 200) }, r.status === 429 ? 429 : 502);
    return resp({ texto: j.text || "", trechos: (j.segments || []).map((s: { start: number; end: number; text: string }) => ({ i: s.start, f: s.end, t: s.text })) });
  }

  let corpo: { ping?: boolean; sistema?: string; pedido?: string; max?: number; imagem?: string } = {};
  try { corpo = await req.json(); } catch { return resp({ erro: "corpo" }, 400); }
  if (corpo.ping) return resp({ pronto: !!chave });
  if (!chave) return resp({ erro: "sem_chave" }, 503);

  const pedido = String(corpo.pedido || "").slice(0, 14000);
  const sistema = String(corpo.sistema || "").slice(0, 2000);
  const max = Math.min(Math.max(Number(corpo.max) || 600, 100), 1200);
  if (!pedido.trim()) return resp({ erro: "vazio" }, 400);

  const adm = createClient(url, service);
  const { data: ok, error: e1 } = await adm.rpc("bw_ia_contar", { p_dono: u.user.id, p_limite: LIMITE_DIA });
  if (e1) return resp({ erro: "contador" }, 500);
  if (!ok) return resp({ erro: "limite" }, 429);

  // VISÃO: imagem em data URL (JPEG/PNG/WEBP, até ~1,5 MB de texto base64)
  const imagem = String(corpo.imagem || "");
  if (imagem) {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imagem) || imagem.length > 2_000_000) return resp({ erro: "imagem" }, 400);
    let detalhe = "";
    for (const modelo of MODELOS_VISAO) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${chave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelo,
          messages: [{ role: "system", content: sistema }, { role: "user", content: [{ type: "text", text: pedido }, { type: "image_url", image_url: { url: imagem } }] }],
          temperature: 0.4,
          max_completion_tokens: max + 600,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { detalhe = String(j?.error?.message || r.status).slice(0, 200); continue; }   // modelo trocado/ocupado: tenta o próximo
      const texto = j?.choices?.[0]?.message?.content || "";
      if (texto.trim()) return resp({ texto, modelo });
    }
    return resp({ erro: "visao", detalhe }, 502);
  }

  for (const modelo of MODELOS) {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: "system", content: sistema }, { role: "user", content: pedido }],
        temperature: 0.5,
        max_completion_tokens: max + 1500,   // gpt-oss "pensa" antes de responder; o texto final cabe em `max`
        reasoning_effort: "low",
        include_reasoning: false,
      }),
    });
    if (r.status === 429 || r.status >= 500) continue;   // cota/instabilidade: tenta o modelo menor
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return resp({ erro: "groq", detalhe: j?.error?.message?.slice(0, 200) }, 502);
    const texto = j?.choices?.[0]?.message?.content || "";
    if (texto.trim()) return resp({ texto, modelo });
  }
  return resp({ erro: "ocupada" }, 503);
});
