-- =====================================================================
-- Brightway · PAINEL FINANCEIRO PARA TODOS (14/11/2026, Claude)
-- Cada conta tem o próprio painel, alimentado pela própria planilha Google.
--  • fin_lancamentos / fin_eventos / fin_sync_meta ganham a coluna "dono"
--    (os dados que já existem continuam do dono da plataforma).
--  • Cada conta gera a própria chave do robô (fin_gerar_chave) — só o hash fica guardado.
--  • fin_sync troca SÓ os dados da conta dona da chave.
--  • Cada conta lê só os próprios dados (RLS por auth.uid()).
-- Idempotente. Não apaga dados de ninguém.
-- =====================================================================

-- ---------- 1. coluna dono ----------
alter table public.fin_lancamentos add column if not exists dono uuid references auth.users(id) on delete cascade;
alter table public.fin_eventos     add column if not exists dono uuid references auth.users(id) on delete cascade;
update public.fin_lancamentos set dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542' where dono is null;
update public.fin_eventos     set dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542' where dono is null;
alter table public.fin_lancamentos alter column dono set not null;
alter table public.fin_eventos     alter column dono set not null;
create index if not exists fin_lancamentos_dono on public.fin_lancamentos (dono);
create index if not exists fin_eventos_dono     on public.fin_eventos (dono);

-- meta: uma linha por conta
alter table public.fin_sync_meta add column if not exists dono uuid references auth.users(id) on delete cascade;
update public.fin_sync_meta set dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542' where dono is null;
alter table public.fin_sync_meta drop constraint if exists fin_sync_meta_uma_linha;
alter table public.fin_sync_meta drop constraint if exists fin_sync_meta_pkey;
alter table public.fin_sync_meta alter column id drop not null;
alter table public.fin_sync_meta alter column dono set not null;
do $$ begin
  alter table public.fin_sync_meta add constraint fin_sync_meta_pkey primary key (dono);
exception when others then null; end $$;

-- chave: uma por conta
alter table public.fin_sync_chave add column if not exists dono uuid references auth.users(id) on delete cascade;
update public.fin_sync_chave set dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542' where dono is null;
alter table public.fin_sync_chave drop constraint if exists fin_sync_chave_uma_linha;
alter table public.fin_sync_chave drop constraint if exists fin_sync_chave_pkey;
alter table public.fin_sync_chave alter column id drop not null;
alter table public.fin_sync_chave alter column dono set not null;
do $$ begin
  alter table public.fin_sync_chave add constraint fin_sync_chave_pkey primary key (dono);
exception when others then null; end $$;
create unique index if not exists fin_sync_chave_hash on public.fin_sync_chave (hash);

-- ---------- 2. cada conta lê só o que é dela ----------
drop policy if exists fin_lanc_dono    on public.fin_lancamentos;
drop policy if exists fin_eventos_dono on public.fin_eventos;
drop policy if exists fin_meta_dono    on public.fin_sync_meta;
create policy fin_lanc_dono    on public.fin_lancamentos for select to authenticated using (dono = auth.uid());
create policy fin_eventos_dono on public.fin_eventos     for select to authenticated using (dono = auth.uid());
create policy fin_meta_dono    on public.fin_sync_meta   for select to authenticated using (dono = auth.uid());
revoke all on public.fin_sync_chave from anon, authenticated;   -- ninguém lê as chaves

-- ---------- 3. gerar a chave da minha planilha ----------
-- Devolve a chave UMA vez (só o hash fica guardado). Gerar de novo invalida a anterior.
create or replace function public.fin_gerar_chave()
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid := auth.uid(); k text;
begin
  if uid is null then raise exception 'sem login'; end if;
  if not public.is_bw_admin() then raise exception 'planilha Google: só o administrador'; end if;
  k := 'bwfin_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.fin_sync_chave (dono, hash)
  values (uid, encode(extensions.digest(k, 'sha256'), 'hex'))
  on conflict (dono) do update set hash = excluded.hash;
  return k;
end $$;
revoke all on function public.fin_gerar_chave() from public;
grant execute on function public.fin_gerar_chave() to authenticated;

-- a minha planilha está conectada?
create or replace function public.fin_minha_conexao()
returns json
language sql stable security definer set search_path = public as $$
  select json_build_object(
    'tem_chave', exists (select 1 from public.fin_sync_chave where dono = auth.uid()),
    'atualizado_em', (select atualizado_em from public.fin_sync_meta where dono = auth.uid()))
$$;
revoke all on function public.fin_minha_conexao() from public;
grant execute on function public.fin_minha_conexao() to authenticated;

-- ---------- 4. o robô da planilha troca SÓ os dados do dono da chave ----------
create or replace function public.fin_sync(p_chave text, p_lanc jsonb, p_eventos jsonb)
returns json
language plpgsql security definer set search_path = public, extensions as $$
declare v_dono uuid; v_l int; v_e int;
begin
  select dono into v_dono from public.fin_sync_chave
   where hash = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex');
  if v_dono is null then raise exception 'chave invalida' using errcode = '28000'; end if;
  if jsonb_array_length(coalesce(p_lanc, '[]'::jsonb)) > 20000
     or jsonb_array_length(coalesce(p_eventos, '[]'::jsonb)) > 5000 then
    raise exception 'planilha grande demais (limite: 20 mil lançamentos e 5 mil eventos)';
  end if;

  delete from public.fin_lancamentos where dono = v_dono;
  insert into public.fin_lancamentos (dono, data, mes, categoria, grupo, quem, descricao, valor)
  select v_dono, nullif(x.data, '')::date, x.mes, x.categoria, x.grupo, x.quem, x.descricao, coalesce(x.valor, 0)
  from jsonb_to_recordset(coalesce(p_lanc, '[]'::jsonb))
       as x(data text, mes text, categoria text, grupo text, quem text, descricao text, valor numeric);
  get diagnostics v_l = row_count;

  delete from public.fin_eventos where dono = v_dono;
  insert into public.fin_eventos (dono, data_pagamento, valor, cliente, descricao, data_evento)
  select v_dono, nullif(x.data_pagamento, '')::date, coalesce(x.valor, 0), x.cliente, x.descricao, x.data_evento
  from jsonb_to_recordset(coalesce(p_eventos, '[]'::jsonb))
       as x(data_pagamento text, valor numeric, cliente text, descricao text, data_evento text);
  get diagnostics v_e = row_count;

  insert into public.fin_sync_meta (dono, atualizado_em, linhas_lanc, linhas_eventos)
  values (v_dono, now(), v_l, v_e)
  on conflict (dono) do update set atualizado_em = now(), linhas_lanc = v_l, linhas_eventos = v_e;

  return json_build_object('ok', true, 'lancamentos', v_l, 'eventos', v_e, 'em', now());
end $$;
revoke all on function public.fin_sync(text, jsonb, jsonb) from public;
grant execute on function public.fin_sync(text, jsonb, jsonb) to anon, authenticated;

-- ---------- 5. "Excluir minha conta" também apaga o financeiro ----------
create or replace function public.bw_excluir_minha_conta()
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'sem login'; end if;
  delete from public.user_data        where user_id = uid;
  delete from public.equipe_cadastros where dono = uid;
  delete from public.equipe_presenca  where dono = uid;
  delete from public.bw_galerias      where dono = uid;
  delete from public.bw_links         where dono = uid;
  delete from public.bw_eventos       where dono = uid;
  delete from public.fin_lancamentos  where dono = uid;
  delete from public.fin_eventos      where dono = uid;
  delete from public.fin_sync_meta    where dono = uid;
  delete from public.fin_sync_chave   where dono = uid;
  delete from auth.users              where id = uid;
end $$;
revoke all on function public.bw_excluir_minha_conta() from public;
grant execute on function public.bw_excluir_minha_conta() to authenticated;

-- ---------- conferência ----------
select 'lançamentos do dono preservados' as item, count(*)::text as valor from public.fin_lancamentos where dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542'
union all select 'eventos do dono preservados', count(*)::text from public.fin_eventos where dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542'
union all select 'linhas sem dono (deve ser 0)', ((select count(*) from public.fin_lancamentos where dono is null) + (select count(*) from public.fin_eventos where dono is null))::text
union all select 'chave atual do dono mantida', (exists (select 1 from public.fin_sync_chave where dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542'))::text
union all select 'função gerar chave', (exists (select 1 from pg_proc where proname = 'fin_gerar_chave'))::text;
