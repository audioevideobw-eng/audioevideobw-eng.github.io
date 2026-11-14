-- =====================================================================
-- Brightway · SEGURANÇA PARA ABRIR AO PÚBLICO (14/11/2026, Claude)
-- Rodar no Supabase → SQL Editor → New query → colar TUDO → Run.
-- Idempotente (pode rodar de novo). Não apaga dados de ninguém.
--
--  1. Documentos dos eventos (contratos, NF-e, comprovantes) em pasta PRIVADA
--     (bucket eventos-docs). Antes ficavam no bucket público eventos-midia:
--     não listáveis, mas abríveis por quem tivesse o endereço.
--  2. Galeria do cliente por LINK SECRETO (bw_galerias). Antes qualquer pessoa
--     listava as fotos de um evento sabendo só o número do evento.
--  3. "Excluir minha conta" (LGPD): função que apaga os dados da própria conta.
-- =====================================================================

-- ---------- 1. bucket privado para documentos ----------
insert into storage.buckets (id, name, public)
values ('eventos-docs', 'eventos-docs', false)
on conflict (id) do update set public = false;

drop policy if exists "docs: dono le"     on storage.objects;
drop policy if exists "docs: dono envia"  on storage.objects;
drop policy if exists "docs: dono altera" on storage.objects;
drop policy if exists "docs: dono remove" on storage.objects;
create policy "docs: dono le" on storage.objects for select to authenticated
  using (bucket_id = 'eventos-docs' and public.bw_evento_meu((storage.foldername(name))[1]));
create policy "docs: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'eventos-docs' and public.bw_evento_livre_ou_meu((storage.foldername(name))[1]));
create policy "docs: dono altera" on storage.objects for update to authenticated
  using (bucket_id = 'eventos-docs' and public.bw_evento_meu((storage.foldername(name))[1]));
create policy "docs: dono remove" on storage.objects for delete to authenticated
  using (bucket_id = 'eventos-docs' and public.bw_evento_meu((storage.foldername(name))[1]));

-- ---------- 2. galeria do cliente por link secreto ----------
create table if not exists public.bw_galerias (
  token text primary key default encode(extensions.gen_random_bytes(18), 'hex'),
  evento_id text not null,
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.bw_galerias enable row level security;
drop policy if exists "galeria: dono ve"    on public.bw_galerias;
drop policy if exists "galeria: dono cria"  on public.bw_galerias;
drop policy if exists "galeria: dono apaga" on public.bw_galerias;
create policy "galeria: dono ve"    on public.bw_galerias for select to authenticated using (dono = auth.uid());
create policy "galeria: dono cria"  on public.bw_galerias for insert to authenticated
  with check (dono = auth.uid() and public.bw_evento_livre_ou_meu(evento_id));
create policy "galeria: dono apaga" on public.bw_galerias for delete to authenticated using (dono = auth.uid());

-- quem tem o link (token) recebe só os NOMES das fotos daquele evento — nada mais
create or replace function public.bw_galeria_fotos(p_token text)
returns table (evento_id text, nome text)
language sql stable security definer set search_path = public, storage as $$
  select g.evento_id, (storage.filename(o.name))::text
  from public.bw_galerias g
  join storage.objects o
    on o.bucket_id = 'eventos-midia'
   and (storage.foldername(o.name))[1] = g.evento_id
   and coalesce(array_length(storage.foldername(o.name), 1), 0) = 1
  where g.token = p_token and length(p_token) >= 24
  order by o.created_at
  limit 300
$$;
revoke all on function public.bw_galeria_fotos(text) from public;
grant execute on function public.bw_galeria_fotos(text) to anon, authenticated;

-- sem login, ninguém mais LISTA as pastas de fotos (a galeria usa o token acima)
drop policy if exists "galeria publica: so fotos do evento" on storage.objects;

-- ---------- 3. excluir minha conta (LGPD) ----------
-- O app apaga antes os ARQUIVOS da pessoa (pela API de Storage) e depois chama esta função.
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
  delete from auth.users              where id = uid;   -- por último: a conta
end $$;
revoke all on function public.bw_excluir_minha_conta() from public;
grant execute on function public.bw_excluir_minha_conta() to authenticated;

-- ---------- conferência ----------
select 'bucket eventos-docs privado' as item, (select not public from storage.buckets where id = 'eventos-docs')::text as ok
union all select 'tabela bw_galerias com RLS', (select relrowsecurity from pg_class where relname = 'bw_galerias')::text
union all select 'listagem publica removida', (not exists (select 1 from pg_policies where policyname = 'galeria publica: so fotos do evento'))::text
union all select 'funcao excluir conta', (exists (select 1 from pg_proc where proname = 'bw_excluir_minha_conta'))::text;
