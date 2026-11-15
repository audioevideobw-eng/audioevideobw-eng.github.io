// bw-avisos — e-mail automático diário da Brightway (15/11/2026, Claude)
// Roda todo dia às 7h (Brasília) pelo pg_cron (ver docs/sql/2026-11-15-avisos-email.sql) e, para cada conta que LIGOU no painel AVISOS:
//   • "Resumo por e-mail": manda ao DONO da conta as contas vencidas/vencendo em até 3 dias e os eventos dos próximos 7 dias;
//   • "Lembrar a equipe na véspera": manda a cada membro (com e-mail) da equipe do evento um lembrete no dia anterior
//     (data, montagem, local e link de confirmar presença).
// Envio pelo Gmail da BW (Secrets GMAIL_USER / GMAIL_APP_PASSWORD — os mesmos do site de orçamentos). Grátis (limite do Gmail: 500/dia).
// Nunca manda o mesmo aviso duas vezes (tabela bw_avisos_envio). Segurança: chamada sem login = rotina diária (idempotente);
// se o Secret opcional BW_CRON_SECRET existir, a rotina exige o cabeçalho x-bw-cron igual a ele. Uma conta logada pode chamar {"modo":"teste"} — recebe o próprio resumo agora e vê (sem enviar) o que a equipe receberia.
// Deploy: Supabase → Edge Functions → bw-avisos (Verify JWT DESLIGADO — a função confere o login/cron ela mesma).
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SITE = "https://audioevideobw-eng.github.io/";
const env = (k: string) => Deno.env.get(k) ?? "";
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", ...cors } });
const cors = { "Access-Control-Allow-Origin": "https://audioevideobw-eng.github.io", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

// "hoje" no fuso de Brasília
function hojeBR(): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()); }
function dias(iso: string, hoje: string): number | null {
  if (!/^\d{4}-\d\d-\d\d/.test(iso || "")) return null;
  return Math.round((Date.parse(iso.slice(0, 10) + "T12:00:00Z") - Date.parse(hoje + "T12:00:00Z")) / 86400000);
}
function dataBR(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.slice(0, 10) + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "UTC" });
}
function moeda(v: unknown): string {
  const n = parseFloat(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return isFinite(n) && n ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";
}
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const quando = (n: number) => n < 0 ? `venceu há ${-n} dia${n === -1 ? "" : "s"}` : n === 0 ? "vence HOJE" : n === 1 ? "vence amanhã" : `vence em ${n} dias`;
const quandoEv = (n: number) => n === 0 ? "hoje" : n === 1 ? "amanhã" : `em ${n} dias`;

type Linha = Record<string, any>;
function lista(rows: Linha[], chave: string): Linha[] {
  const l = rows.find((r) => r.chave === chave)?.dados;
  const lap = rows.find((r) => r.chave === chave + "__del")?.dados || {};
  if (!Array.isArray(l)) return [];
  return l.filter((o: Linha) => o && typeof o === "object" && !(lap[String(o.id)] && lap[String(o.id)] >= (o._ed || 0)));
}

function moldura(titulo: string, corpo: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#06080D;padding:24px"><div style="max-width:560px;margin:auto;background:#0E121A;border:1px solid #3a2f1a;border-radius:16px;padding:24px;color:#F5F1EA">
  <div style="font-size:13px;letter-spacing:.2em;color:#FFB547;font-weight:bold">BRIGHTWAY</div>
  <h2 style="margin:10px 0 16px;font-size:20px;color:#F5F1EA">${titulo}</h2>${corpo}
  <p style="margin-top:22px;font-size:12px;color:#9aa0aa">Aviso automático da Brightway. Para parar, abra o app → sino AVISOS → desligue o e-mail.</p></div></div>`;
}
const cartao = (cor: string, a: string, b: string, c = "") =>
  `<div style="border:1px solid ${cor};border-radius:12px;padding:12px 14px;margin:0 0 8px"><b style="font-size:15px">${a}</b><div style="font-size:13px;color:#b9bec7;margin-top:3px">${b}</div>${c}</div>`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  let corpo: Linha = {};
  try { corpo = await req.json(); } catch { /* vazio */ }
  // Rotina diária: chamada SEM login (pelo pg_cron). É segura mesmo se alguém de fora chamar: só manda o que já está devido
  // e cada aviso sai UMA vez (bw_avisos_envio). Se o Secret BW_CRON_SECRET existir, ele passa a ser exigido.
  const segredo = env("BW_CRON_SECRET");
  const temLogin = /^Bearer\s+ey/i.test(req.headers.get("authorization") || "");
  const ehCron = segredo ? req.headers.get("x-bw-cron") === segredo : !temLogin;
  let soConta: string | null = null;
  if (!ehCron) {
    const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const { data } = await admin.auth.getUser(tok);
    if (!data?.user) return json({ erro: "entre na sua conta" }, 401);
    soConta = data.user.id;
  }
  const teste = !ehCron;
  const hoje = hojeBR();

  // quem ligou os avisos
  let q = admin.from("bw_avisos_pref").select("dono,email_diario,equipe_vespera");
  if (soConta) q = q.eq("dono", soConta);
  const { data: prefs, error: ePref } = await q;
  if (ePref) return json({ erro: ePref.message }, 500);
  const lista_prefs = (prefs || []).filter((p) => teste || p.email_diario || p.equipe_vespera);
  if (teste && !lista_prefs.length) lista_prefs.push({ dono: soConta, email_diario: true, equipe_vespera: false });

  const gUser = env("GMAIL_USER"), gPass = env("GMAIL_APP_PASSWORD").replace(/\s/g, "");
  const smtp = new SMTPClient({ connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: gUser, password: gPass } } });
  const relatorio: Linha[] = [];
  let enviados = 0;
  const LIMITE = 300;

  async function jaFoi(dono: string, chave: string) {
    const { data } = await admin.from("bw_avisos_envio").select("id").eq("dono", dono).eq("chave", chave).maybeSingle();
    return !!data;
  }
  async function marcar(dono: string, chave: string) { await admin.from("bw_avisos_envio").insert({ dono, chave }); }
  async function mandar(para: string, assunto: string, html: string, responder?: string) {
    if (enviados >= LIMITE) throw new Error("limite diário de envios atingido");
    await smtp.send({ from: `Brightway <${gUser}>`, to: para, subject: assunto, html, content: "auto", ...(responder ? { replyTo: responder } : {}) });
    enviados++;
  }

  try {
    for (const p of lista_prefs) {
      const r: Linha = { conta: p.dono.slice(0, 8) };
      const { data: u } = await admin.auth.admin.getUserById(p.dono);
      const emailDono = u?.user?.email || "";
      const { data: rows } = await admin.from("user_data").select("chave,dados").eq("user_id", p.dono)
        .in("chave", ["casa_contas", "casa_contas__del", "neg_fluxo", "neg_fluxo__del", "neg_eventos", "neg_eventos__del", "neg_equipe_eventos",
          "neg_equipe_equipes", "neg_equipe_colaboradores", "neg_equipe_colaboradores__del"]);
      const R = rows || [];

      // contas
      const contas: Linha[] = [];
      for (const c of lista(R, "casa_contas")) {
        if (String(c.c3 || "").toLowerCase() === "sim") continue;
        const n = dias(c.c2, hoje); if (n === null || n > 3 || n < -60) continue;
        contas.push({ nome: c.c0 || "Conta", valor: c.c1, venc: c.c2, n });
      }
      for (const f of lista(R, "neg_fluxo")) {
        if (!/^fixo_/.test(String(f.id)) || f.c1 !== "Saída") continue;
        const n = dias(f.c0, hoje); if (n === null || n < 0 || n > 3) continue;
        contas.push({ nome: String(f.c3 || "Custo fixo").replace(/ \(fixo\)$/, "") + " (negócio)", valor: f.c2, venc: f.c0, n });
      }
      contas.sort((a, b) => a.n - b.n);
      // eventos
      const vistos = new Set<string>(); const eventos: Linha[] = [];
      for (const e of [...lista(R, "neg_eventos"), ...lista(R, "neg_equipe_eventos")]) {
        if (!e || vistos.has(String(e.id))) continue; vistos.add(String(e.id));
        if (/cancel/i.test(e.status || "")) continue;
        const n = dias(e.data, hoje), nm = dias(e.montagem, hoje);
        const prox = [n, nm].filter((x) => x !== null && x >= 0 && x <= 7) as number[];
        if (!prox.length) continue;
        eventos.push({ ev: e, n, nm, min: Math.min(...prox) });
      }
      eventos.sort((a, b) => a.min - b.min);

      // 1) resumo para o dono
      if ((p.email_diario || teste) && emailDono) {
        const chave = "resumo:" + hoje;
        if (contas.length || eventos.length || teste) {
          if (teste || !(await jaFoi(p.dono, chave))) {
            const html = moldura("Seus avisos de hoje",
              `<div style="font-size:12px;letter-spacing:.12em;color:#9aa0aa;margin:4px 0 8px">CONTAS A VENCER</div>` +
              (contas.length ? contas.map((c) => cartao(c.n < 0 ? "#f2686b" : c.n <= 1 ? "#FFB547" : "#2a2f3a", esc(c.nome) + (moeda(c.valor) ? " — " + moeda(c.valor) : ""), esc(dataBR(c.venc)) + " · " + quando(c.n))).join("")
                : `<p style="color:#b9bec7;font-size:14px">Nenhuma conta vencida ou vencendo nos próximos 3 dias. ✓</p>`) +
              `<div style="font-size:12px;letter-spacing:.12em;color:#9aa0aa;margin:16px 0 8px">EVENTOS NOS PRÓXIMOS 7 DIAS</div>` +
              (eventos.length ? eventos.map((x) => cartao(x.min <= 1 ? "#FFB547" : "#2a2f3a", esc(x.ev.nome || "Evento"),
                esc(dataBR(x.ev.data)) + (x.n !== null && x.n >= 0 ? " · " + quandoEv(x.n) : "") + (x.ev.montagem && x.ev.montagem !== x.ev.data ? " · montagem " + esc(dataBR(x.ev.montagem)) : "") + " · " + esc(x.ev.local || "local a definir"))).join("")
                : `<p style="color:#b9bec7;font-size:14px">Nenhum evento nos próximos 7 dias.</p>`) +
              `<p style="margin-top:18px"><a href="${SITE}" style="display:inline-block;background:#FFB547;color:#1a1205;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">ABRIR A BRIGHTWAY</a></p>`);
            const assunto = (teste ? "[TESTE] " : "") + "Brightway — " + (contas.length ? contas.length + " conta(s) a vencer" : "") + (contas.length && eventos.length ? " · " : "") + (eventos.length ? eventos.length + " evento(s) chegando" : "") + (!contas.length && !eventos.length ? "nada para os próximos dias" : "");
            await mandar(emailDono, assunto, html);
            if (!teste) await marcar(p.dono, chave);
            r.resumo = "enviado para " + emailDono.replace(/^(.).*@/, "$1•••@");
          } else r.resumo = "já enviado hoje";
        } else r.resumo = "nada para avisar";
      }

      // 2) lembrete da equipe na véspera
      if (p.equipe_vespera || teste) {
        const equipes = lista(R, "neg_equipe_equipes"), colabs = lista(R, "neg_equipe_colaboradores");
        const previstos: string[] = [];
        for (const x of eventos) {
          const e = x.ev;
          // o dia em que a equipe precisa aparecer: montagem (se houver) senão o evento
          const primeiro = [x.nm, x.n].filter((v) => v !== null && v >= 0) as number[];
          if (!primeiro.length || Math.min(...primeiro) !== 1) continue;
          const eq = equipes.find((q) => String(q.id) === String(e.equipeId));
          const membros = ((eq && eq.membros) || []).map((mid: unknown) => colabs.find((c) => String(c.id) === String(mid))).filter((m: Linha) => m && /@/.test(m.email || ""));
          const { data: reg } = await admin.from("bw_eventos").select("evento_id").eq("evento_id", String(e.id)).eq("dono", p.dono).maybeSingle();
          const link = reg ? `${SITE}cadastro.html?ev=${encodeURIComponent(e.id)}&nome=${encodeURIComponent(e.nome || "")}` : "";
          for (const m of membros) {
            const chave = `equipe:${e.id}:${hoje}:${String(m.email).toLowerCase()}`;
            if (teste) { previstos.push(`${m.nome} <${String(m.email).replace(/^(.).*@/, "$1•••@")}> — ${e.nome}`); continue; }
            if (await jaFoi(p.dono, chave)) continue;
            const html = moldura(`Lembrete: ${esc(e.nome || "evento")} é amanhã`,
              `<p style="font-size:15px">Olá, ${esc(String(m.nome || "").split(" ")[0])}!</p>` +
              cartao("#FFB547", esc(e.nome || "Evento"), "📅 " + esc(dataBR(e.data)) + (e.montagem && e.montagem !== e.data ? "<br>🔧 Montagem: " + esc(dataBR(e.montagem)) : "") + "<br>📍 " + esc(e.local || "local a confirmar")) +
              (link ? `<p style="margin-top:16px"><a href="${link}" style="display:inline-block;background:#FFB547;color:#1a1205;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:999px">CONFIRMAR PRESENÇA</a></p>`
                : `<p style="font-size:14px;color:#b9bec7">Confirme sua presença respondendo este e-mail.</p>`));
            await mandar(m.email, `Lembrete: ${e.nome || "evento"} amanhã (${dataBR(e.montagem && x.nm === 1 ? e.montagem : e.data)})`, html, emailDono || undefined);
            await marcar(p.dono, chave);
            previstos.push(m.nome);
          }
        }
        r.equipe = teste ? (previstos.length ? "receberiam amanhã: " + previstos.join("; ") : "nenhum evento amanhã com equipe com e-mail") : previstos.length + " lembrete(s)";
      }
      relatorio.push(r);
    }
  } catch (e) {
    relatorio.push({ erro: String((e as Error).message || e) });
  } finally {
    try { await smtp.close(); } catch { /* */ }
  }
  return json({ ok: true, hoje, enviados, relatorio });
});
