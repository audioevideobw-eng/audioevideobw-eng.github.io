-- FEEDBACK dos usuários (botão no menu do app) — 15/11/2026, Claude
-- Cada conta grava e vê só os próprios envios; o ADM (is_bw_admin) vê todos e marca como lido/resolvido.
create table if not exists public.bw_feedback (
  id         bigint generated always as identity primary key,
  criado_em  timestamptz not null default now(),
  dono       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email      text,
  tipo       text not null default 'Sugestão' check (tipo in ('Problema','Sugestão','Elogio','Dúvida')),
  pagina     text,
  texto      text not null check (char_length(texto) between 3 and 4000),
  aparelho   text,
  status     text not null default 'novo' check (status in ('novo','lido','resolvido'))
);
alter table public.bw_feedback enable row level security;

drop policy if exists "feedback envia o proprio" on public.bw_feedback;
drop policy if exists "feedback le o proprio ou adm" on public.bw_feedback;
drop policy if exists "feedback adm atualiza" on public.bw_feedback;
drop policy if exists "feedback adm apaga" on public.bw_feedback;
create policy "feedback envia o proprio" on public.bw_feedback for insert to authenticated with check (dono = auth.uid() and status = 'novo');
create policy "feedback le o proprio ou adm" on public.bw_feedback for select to authenticated using (dono = auth.uid() or public.is_bw_admin());
create policy "feedback adm atualiza" on public.bw_feedback for update to authenticated using (public.is_bw_admin()) with check (public.is_bw_admin());
create policy "feedback adm apaga" on public.bw_feedback for delete to authenticated using (public.is_bw_admin());

-- contra abuso: no máximo 20 envios por conta por dia
create or replace function public.bw_feedback_limite() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.bw_feedback where dono = new.dono and criado_em > now() - interval '1 day') >= 20 then
    raise exception 'limite de feedback de hoje atingido';
  end if;
  new.email := (select email from auth.users where id = new.dono);   -- e-mail real da conta (não o que o app mandar)
  return new;
end $$;
drop trigger if exists bw_feedback_limite on public.bw_feedback;
create trigger bw_feedback_limite before insert on public.bw_feedback for each row execute function public.bw_feedback_limite();

-- conferência: rls = true, regras = 4
select c.relrowsecurity as rls, (select count(*) from pg_policies p where p.tablename = 'bw_feedback') as regras
from pg_class c where c.relname = 'bw_feedback';
