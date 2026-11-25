// DECUPAGEM COM IA (Edge Function "bw-ia-video") — 25/11/2026, Claude, pedido do dono ("Gemini assistindo os takes").
// O editor de vídeo manda uma CÓPIA LEVE de um take (MP4 360p, 2 quadros/s, som — feita no aparelho por assets/bw-decupar.js, só depois
// de a pessoa confirmar) e recebe a decupagem: {resumo, trechos:[{ini,fim,tipo,nota,desc,fala}], modelo}. A chave do Google fica SÓ
// aqui (Secret GEMINI_API_KEY). Nada é gravado: o vídeo não vai para o Storage e o pedido ao Google sai com store:false.
// Só usuário LOGADO; conta no mesmo limite diário dos pedaços de áudio da bw-ia (bw_ia_contar, 200/dia) — sem tabela nova.
// {ping:true} diz se está pronta. Os modelos mudam de nome: lista MODELOS (ou o Secret GEMINI_MODELOS, separado por vírgula), tenta em
// ordem e, se todos falharem, devolve o motivo de CADA um. Endereço novo (interactions) primeiro; se não existir, generateContent.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding/base64";

const LIMITE_DIA = 200;
const MAX_BYTES = 19 * 1024 * 1024;
// conferidos em ai.google.dev (docs de vídeo usam gemini-3.8-flash; a página de preços lista gemini-3.5-flash e gemini-2.5-flash-lite) — 25/11/2026
const MODELOS = ["gemini-3.8-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
const API = "https://generativelanguage.googleapis.com/v1beta";
const CORS = {
  "Access-Control-Allow-Origin": "https://audioevideobw-eng.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resp = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// ===== AJUDANTES (testados em docs/testes/teste_decupar.py: o teste recorta daqui até FIM-AJUDANTES e roda no Node) =====
const TIPOS = ["fala", "plateia", "palco", "detalhe", "movimento", "ruim"];
function pedido(dur: number, ctx: string): string {
  return [
    "Você ajuda a editar vídeos de EVENTOS (aftermovie, institucional, palestra, show). Assista a este take inteiro, com o som, e faça a DECUPAGEM:",
    "divida em trechos úteis com início e fim no formato MM:SS (o take tem " + Math.round(dur) + " segundos).",
    "Tipos: fala (alguém fala para a câmera ou no palco — escreva em \"fala\" a frase principal, exatamente como foi dita),",
    "plateia (público, aplauso, reação), palco (palestrante, banda, telão, plano geral do palco), detalhe (decoração, produto, logo, comida),",
    "movimento (câmera andando, drone, plano aberto bonito) e ruim (tremido, fora de foco, escuro, câmera apontada para o chão).",
    "nota de 1 a 5 = o quanto o trecho serve num aftermovie. Trechos de 2 a 15 segundos, no máximo 20, em ordem de tempo.",
    ctx ? "Sobre o evento: " + ctx.slice(0, 200) + "." : "",
    "NÃO invente: se não entender a fala, deixe \"fala\" vazia. Escreva em português do Brasil.",
    "Responda SÓ com JSON, sem texto antes ou depois:",
    '{"resumo":"uma frase sobre o take","trechos":[{"ini":"00:03","fim":"00:09","tipo":"fala","nota":5,"desc":"palestrante agradece a equipe","fala":"Obrigado a todos"}]}',
  ].filter(Boolean).join("\n");
}
function seg(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v;
  const m = String(v ?? "").trim().match(/^(?:(\d+):)?(\d+):(\d+(?:[.,]\d+)?)$/);
  if (m) return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + parseFloat(m[3].replace(",", "."));
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return isFinite(n) ? n : NaN;
}
function textoDe(j: any): string {
  if (!j || typeof j !== "object") return "";
  if (typeof j.output_text === "string") return j.output_text;
  const c = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
  if (Array.isArray(c)) return c.map((p: any) => p && p.text || "").join("");
  const achados: string[] = [];
  const andar = (o: any, saida: boolean) => {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach((x) => andar(x, saida)); return; }
    const ehSaida = saida || /output|model/i.test(String(o.type || o.role || ""));
    if (ehSaida && typeof o.text === "string") achados.push(o.text);
    for (const k of Object.keys(o)) if (k !== "input") andar(o[k], ehSaida || /output/i.test(k));
  };
  andar(j, false);
  return achados.join("");
}
function decupagem(texto: string, dur: number) {
  let t = String(texto || "").replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  let j: any; try { j = JSON.parse(t.slice(a, b + 1)); } catch { return null; }
  const lista = Array.isArray(j.trechos) ? j.trechos : Array.isArray(j) ? j : [];
  const D = dur > 0 ? dur : 1e9;
  const trechos = lista.map((x: any) => {
    let ini = seg(x && (x.ini ?? x.inicio ?? x.start)), fim = seg(x && (x.fim ?? x.end));
    if (!isFinite(ini)) return null; if (!isFinite(fim) || fim <= ini) fim = ini + 4;
    ini = Math.max(0, Math.min(ini, D - 0.5)); fim = Math.max(ini + 0.5, Math.min(fim, D));
    const tipo = TIPOS.indexOf(String(x.tipo || "").toLowerCase()) >= 0 ? String(x.tipo).toLowerCase() : "palco";
    const nn = Number(x.nota), nota = isFinite(nn) ? Math.max(1, Math.min(5, Math.round(nn))) : 3;
    const limpa = (s: unknown, n: number) => String(s ?? "").replace(/[*#`<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
    return { ini: Math.round(ini * 10) / 10, fim: Math.round(fim * 10) / 10, tipo, nota, desc: limpa(x.desc ?? x.descricao, 140), fala: limpa(x.fala, 160) };
  }).filter(Boolean).sort((p: any, q: any) => p.ini - q.ini).slice(0, 30);
  return { resumo: String(j.resumo || "").replace(/[*#`<>]/g, "").trim().slice(0, 200), trechos };
}
// ===== FIM-AJUDANTES =====

async function perguntar(chave: string, modelo: string, b64: string, texto: string): Promise<{ ok: boolean; texto?: string; motivo?: string; fim?: boolean }> {
  const h = { "x-goog-api-key": chave, "Content-Type": "application/json" };
  let r = await fetch(API + "/interactions", { method: "POST", headers: h, body: JSON.stringify({
    model: modelo, store: false, input: [{ type: "text", text: texto }, { type: "video", data: b64, mime_type: "video/mp4" }] }) });
  if (r.status === 404 || r.status === 400 && /interactions|unknown name|not found/i.test(await r.clone().text())) {
    r = await fetch(API + "/models/" + encodeURIComponent(modelo) + ":generateContent", { method: "POST", headers: h, body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: "video/mp4", data: b64 } }, { text: texto }] }],
      generationConfig: { responseMimeType: "application/json" } }) });
  }
  const corpo = await r.text();
  if (!r.ok) return { ok: false, motivo: r.status + " " + corpo.slice(0, 180), fim: r.status === 401 || r.status === 403 };
  let j: any = null; try { j = JSON.parse(corpo); } catch { return { ok: false, motivo: "resposta não é JSON" }; }
  const t = textoDe(j);
  return t ? { ok: true, texto: t } : { ok: false, motivo: "resposta sem texto" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resp({ erro: "metodo" }, 405);
  const url = Deno.env.get("SUPABASE_URL")!, anon = Deno.env.get("SUPABASE_ANON_KEY")!, service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const chave = Deno.env.get("GEMINI_API_KEY");
  const tipo = req.headers.get("Content-Type") || "";
  if (tipo.startsWith("application/json")) {
    const b = await req.json().catch(() => ({}));
    if (b && b.ping) return resp({ pronta: !!chave });
    return resp({ erro: "pedido" }, 400);
  }
  const usuario = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await usuario.auth.getUser();
  if (!u?.user) return resp({ erro: "sem_login" }, 401);
  if (!chave) return resp({ erro: "sem_chave" }, 503);
  if (!tipo.startsWith("video/mp4")) return resp({ erro: "formato" }, 415);
  const video = new Uint8Array(await req.arrayBuffer());
  if (video.byteLength > MAX_BYTES) return resp({ erro: "grande" }, 413);
  if (video.byteLength < 1000) return resp({ erro: "vazio" }, 400);
  const adm = createClient(url, service);
  const { data: ok, error: e1 } = await adm.rpc("bw_ia_contar", { p_dono: u.user.id, p_limite: LIMITE_DIA });
  if (e1) return resp({ erro: "contador" }, 500);
  if (!ok) return resp({ erro: "limite" }, 429);
  const q = new URL(req.url).searchParams;
  const dur = Math.max(0, Math.min(3600, Number(q.get("dur")) || 0));
  const texto = pedido(dur, (q.get("ctx") || "").replace(/[\r\n]+/g, " "));
  const b64 = encodeBase64(video);
  const lista = (Deno.env.get("GEMINI_MODELOS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const motivos: string[] = [];
  for (const modelo of lista.length ? lista : MODELOS) {
    try {
      const r = await perguntar(chave, modelo, b64, texto);
      if (r.ok) {
        const d = decupagem(r.texto!, dur);
        if (d && d.trechos.length) return resp({ ...d, modelo });
        motivos.push(modelo + ": resposta sem trechos");
      } else { motivos.push(modelo + ": " + r.motivo); if (r.fim) break; }
    } catch (e) { motivos.push(modelo + ": " + String(e).slice(0, 120)); }
  }
  return resp({ erro: "gemini", detalhe: motivos }, 502);
});
