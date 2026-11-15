-- IA Brightway na nuvem (Edge Function bw-ia) — 15/11/2026, Claude
-- Contador de uso por conta e por dia (limite contra abuso da cota grátis da Groq).
-- Ninguém do site lê ou grava esta tabela: só a Edge Function (service_role) pela função bw_ia_contar.
create table if not exists public.bw_ia_uso (
  dono uuid not null references auth.users(id) on delete cascade,
  dia  date not null default (now() at time zone 'America/Sao_Paulo')::date,
  n    integer not null default 0,
  primary key (dono, dia)
);
alter table public.bw_ia_uso enable row level security;   -- sem regras = fechado para anon/authenticated

create or replace function public.bw_ia_contar(p_dono uuid, p_limite integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  insert into public.bw_ia_uso (dono, dia, n) values (p_dono, (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (dono, dia) do update set n = bw_ia_uso.n + 1
  returning n into v;
  return v <= p_limite;
end $$;
revoke all on function public.bw_ia_contar(uuid, integer) from public, anon, authenticated;
grant execute on function public.bw_ia_contar(uuid, integer) to service_role;

-- conferência: deve mostrar rls = true e 0 regras
select c.relrowsecurity as rls, (select count(*) from pg_policies p where p.tablename = 'bw_ia_uso') as regras
from pg_class c where c.relname = 'bw_ia_uso';
