-- COTAÇÕES DE MILHAS lançadas pelo ADM (16/11/2026, Claude)
-- Não existe fonte pública automática de cotação de milhas. O ADM lança em Configuração → COTAÇÕES DE MILHAS;
-- a automação .github/workflows/milhas.yml (a cada hora) lê esta tabela e publica milhas.json, que as páginas já usam.
-- Leitura pública (as cotações são públicas no site); gravação só do administrador (is_bw_admin).
create table if not exists public.bw_milhas_ref (
  id text primary key default 'atual' check (id = 'atual'),
  dados jsonb not null,
  atualizado timestamptz not null default now(),
  por text
);
alter table public.bw_milhas_ref enable row level security;
drop policy if exists "milhas: todos leem" on public.bw_milhas_ref;
drop policy if exists "milhas: adm grava" on public.bw_milhas_ref;
drop policy if exists "milhas: adm altera" on public.bw_milhas_ref;
create policy "milhas: todos leem" on public.bw_milhas_ref for select to anon, authenticated using (true);
create policy "milhas: adm grava" on public.bw_milhas_ref for insert to authenticated with check (public.is_bw_admin());
create policy "milhas: adm altera" on public.bw_milhas_ref for update to authenticated using (public.is_bw_admin()) with check (public.is_bw_admin());
revoke all on public.bw_milhas_ref from anon;
grant select on public.bw_milhas_ref to anon;
grant select, insert, update on public.bw_milhas_ref to authenticated;
select c.relrowsecurity as rls, (select count(*) from pg_policies p where p.tablename = 'bw_milhas_ref') as regras
from pg_class c where c.relname = 'bw_milhas_ref';
