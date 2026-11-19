-- PROMPT IA (19/11/2026, com o "sim" do dono): BIBLIOTECA de trends que o ADM alimenta pela plataforma.
-- Leitura pública (é conteúdo de ensino, igual às cotações de milhas); gravação SÓ do administrador (is_bw_admin).
-- Imagens de exemplo no bucket público "trends" (só o ADM envia/apaga; ninguém lista a pasta).
-- Rodar uma vez no Supabase → SQL Editor. Pode rodar de novo sem estragar nada.

create table if not exists public.bw_trends (
  id            uuid primary key default gen_random_uuid(),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por    uuid default auth.uid(),
  titulo        text not null check (char_length(titulo) between 1 and 120),
  categoria     text not null default 'Outros' check (char_length(categoria) <= 40),
  onde          text not null default '' check (char_length(onde) <= 300),      -- IAs onde fazer, separadas por vírgula
  prompt        text not null check (char_length(prompt) between 1 and 6000),
  passos        text not null default '' check (char_length(passos) <= 4000),   -- um passo por linha
  dicas         text not null default '' check (char_length(dicas) <= 2000),    -- uma dica por linha
  imagem        text not null default '' check (char_length(imagem) <= 500),    -- endereço público no bucket "trends"
  ordem         int  not null default 0,
  ativo         boolean not null default true
);

alter table public.bw_trends enable row level security;

drop policy if exists "trends: todos leem"  on public.bw_trends;
drop policy if exists "trends: adm grava"   on public.bw_trends;
drop policy if exists "trends: adm altera"  on public.bw_trends;
drop policy if exists "trends: adm apaga"   on public.bw_trends;
create policy "trends: todos leem" on public.bw_trends for select to anon, authenticated using (ativo or public.is_bw_admin());
create policy "trends: adm grava"  on public.bw_trends for insert to authenticated with check (public.is_bw_admin());
create policy "trends: adm altera" on public.bw_trends for update to authenticated using (public.is_bw_admin()) with check (public.is_bw_admin());
create policy "trends: adm apaga"  on public.bw_trends for delete to authenticated using (public.is_bw_admin());

grant select on public.bw_trends to anon, authenticated;
grant insert, update, delete on public.bw_trends to authenticated;

-- bucket público só para as imagens de exemplo (até 2 MB, só imagem)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trends', 'trends', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "trends: adm envia imagem"  on storage.objects;
drop policy if exists "trends: adm troca imagem"  on storage.objects;
drop policy if exists "trends: adm apaga imagem"  on storage.objects;
create policy "trends: adm envia imagem" on storage.objects for insert to authenticated with check (bucket_id = 'trends' and public.is_bw_admin());
create policy "trends: adm troca imagem" on storage.objects for update to authenticated using (bucket_id = 'trends' and public.is_bw_admin()) with check (bucket_id = 'trends' and public.is_bw_admin());
create policy "trends: adm apaga imagem" on storage.objects for delete to authenticated using (bucket_id = 'trends' and public.is_bw_admin());

-- conferência: deve mostrar rls = true, 4 regras na tabela e 3 no bucket
select (select relrowsecurity from pg_class where oid = 'public.bw_trends'::regclass) as rls,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'bw_trends') as regras_tabela,
       (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'trends:%') as regras_bucket,
       (select public from storage.buckets where id = 'trends') as bucket_publico;
