-- 28/11/2026 · PRESS KIT → 🔗 LINK PARA COMPARTILHAR (pedido do dono)
-- Página pública kit.html?k=TOKEN. Cada conta só mexe nas próprias páginas (RLS por auth.uid()); quem visita NÃO lista nada:
-- lê UMA página pela função bw_presskit_ver(token). Fotos e PDF ficam no balde PÚBLICO "presskit", dentro da pasta do token
-- (só o dono da página grava/apaga lá). Limite: 20 páginas por conta, 300 KB de texto por página.

create table if not exists public.bw_presskit_pub (
  token text primary key check (token ~ '^[a-z0-9]{16,40}$'),
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kit_id text,
  dados jsonb not null default '{}'::jsonb check (pg_column_size(dados) < 300000),
  criado timestamptz not null default now(),
  atualizado timestamptz not null default now()
);
alter table public.bw_presskit_pub enable row level security;

drop policy if exists pk_pub_ver on public.bw_presskit_pub;
drop policy if exists pk_pub_criar on public.bw_presskit_pub;
drop policy if exists pk_pub_mudar on public.bw_presskit_pub;
drop policy if exists pk_pub_apagar on public.bw_presskit_pub;
create policy pk_pub_ver on public.bw_presskit_pub for select to authenticated using (dono = auth.uid());
create policy pk_pub_criar on public.bw_presskit_pub for insert to authenticated with check (dono = auth.uid());
create policy pk_pub_mudar on public.bw_presskit_pub for update to authenticated using (dono = auth.uid()) with check (dono = auth.uid());
create policy pk_pub_apagar on public.bw_presskit_pub for delete to authenticated using (dono = auth.uid());
revoke all on public.bw_presskit_pub from anon;

-- o dono vem sempre da sessão (não dá para publicar em nome de outra conta) + limite de 20 páginas
create or replace function public.bw_presskit_pub_dono() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.dono := auth.uid();
    if (select count(*) from public.bw_presskit_pub where dono = auth.uid()) >= 20 then raise exception 'LIMITE_PAGINAS'; end if;
  else
    new.dono := old.dono;
  end if;
  new.atualizado := now();
  return new;
end $$;
drop trigger if exists bw_presskit_pub_dono on public.bw_presskit_pub;
create trigger bw_presskit_pub_dono before insert or update on public.bw_presskit_pub for each row execute function public.bw_presskit_pub_dono();

-- leitura pública de UMA página pelo token (nunca a lista)
create or replace function public.bw_presskit_ver(p_token text) returns jsonb language sql security definer set search_path = public stable as $$
  select dados from public.bw_presskit_pub where token = p_token and coalesce((dados->>'v')::int, 0) >= 1
$$;
revoke all on function public.bw_presskit_ver(text) from public;
grant execute on function public.bw_presskit_ver(text) to anon, authenticated;

-- balde público das fotos e do PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presskit', 'presskit', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists pk_arq_ver on storage.objects;
drop policy if exists pk_arq_criar on storage.objects;
drop policy if exists pk_arq_apagar on storage.objects;
-- listar/apagar: só o dono (a leitura das fotos pelo endereço público não precisa de regra)
create policy pk_arq_ver on storage.objects for select to authenticated
  using (bucket_id = 'presskit' and (storage.foldername(name))[1] in (select token from public.bw_presskit_pub where dono = auth.uid()));
create policy pk_arq_criar on storage.objects for insert to authenticated
  with check (bucket_id = 'presskit' and (storage.foldername(name))[1] in (select token from public.bw_presskit_pub where dono = auth.uid()));
create policy pk_arq_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'presskit' and (storage.foldername(name))[1] in (select token from public.bw_presskit_pub where dono = auth.uid()));

-- conferência (deve dar: rls = true · 4 regras na tabela · 3 no balde · balde público)
select (select relrowsecurity from pg_class where oid = 'public.bw_presskit_pub'::regclass) as rls,
  (select count(*) from pg_policies where tablename = 'bw_presskit_pub') as regras_tabela,
  (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'pk_arq_%') as regras_balde,
  (select public from storage.buckets where id = 'presskit') as balde_publico;
