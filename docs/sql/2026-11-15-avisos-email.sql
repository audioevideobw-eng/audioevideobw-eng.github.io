-- E-MAIL AUTOMÁTICO DE AVISOS — 15/11/2026, Claude (função docs/supabase/functions/bw-avisos/index.ts)
-- Preferência por conta (ligada no sino AVISOS do app) + registro anti-duplicado + agendamento diário às 7h (10:00 UTC).
create table if not exists public.bw_avisos_pref (
  dono           uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email_diario   boolean not null default false,   -- resumo diário para o dono da conta
  equipe_vespera boolean not null default false,   -- lembrete por e-mail para a equipe na véspera do evento
  atualizado     timestamptz not null default now()
);
alter table public.bw_avisos_pref enable row level security;
drop policy if exists "avisos pref le o proprio" on public.bw_avisos_pref;
drop policy if exists "avisos pref grava o proprio" on public.bw_avisos_pref;
drop policy if exists "avisos pref muda o proprio" on public.bw_avisos_pref;
create policy "avisos pref le o proprio"    on public.bw_avisos_pref for select to authenticated using (dono = auth.uid());
create policy "avisos pref grava o proprio" on public.bw_avisos_pref for insert to authenticated with check (dono = auth.uid());
create policy "avisos pref muda o proprio"  on public.bw_avisos_pref for update to authenticated using (dono = auth.uid()) with check (dono = auth.uid());

create table if not exists public.bw_avisos_envio (       -- só a função (service_role) usa; RLS ligado e sem regras = ninguém de fora
  id bigint generated always as identity primary key,
  dono uuid not null references auth.users(id) on delete cascade,
  chave text not null,
  enviado_em timestamptz not null default now(),
  unique (dono, chave)
);
alter table public.bw_avisos_envio enable row level security;

create extension if not exists pg_cron;
create extension if not exists pg_net;
-- A rotina é chamada sem login (a função é idempotente: cada aviso sai uma vez). Se um dia criar o Secret opcional
-- BW_CRON_SECRET, acrescente o cabeçalho 'x-bw-cron' com o mesmo valor aqui.
select cron.unschedule('bw-avisos-diario') where exists (select 1 from cron.job where jobname = 'bw-avisos-diario');
select cron.schedule('bw-avisos-diario', '0 10 * * *', $job$
  select net.http_post(
    url := 'https://zdtnetplvdonogmdvarx.supabase.co/functions/v1/bw-avisos',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{"modo":"cron"}'::jsonb,
    timeout_milliseconds := 120000);
$job$);
