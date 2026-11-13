-- =====================================================================
-- Brightway · ISOLAMENTO ENTRE USUÁRIOS (13/11/2026, Claude)
-- Rodar no Supabase → SQL Editor → New query → colar TUDO → Run.
-- Pode rodar mais de uma vez (idempotente). Não apaga dados.
--
-- O que corrige:
--  1. equipe_cadastros  (colaboradores/clientes: nome, telefone, e-mail, CPF/CNPJ)
--     antes: QUALQUER usuário logado lia e apagava os cadastros de TODOS.
--  2. equipe_presenca   (confirmações de presença) — mesmo problema.
--  3. bucket eventos-midia (fotos, comprovantes, contratos, NF-e)
--     antes: QUALQUER PESSOA (sem login) listava as pastas de qualquer evento e
--     qualquer usuário logado podia apagar/enviar arquivos em eventos de outros.
--  4. orcamentos (pedidos do site BW Produções) — qualquer usuário logado do
--     Brightway lia e alterava os pedidos de orçamento. Agora só administradores BW.
--
-- Como a posse é descoberta (sem mudar os links já enviados):
--  - bw_eventos: cada evento (id) pertence a quem o criou. O site registra
--    sozinho os eventos de quem está logado (assets/bw-sync.js → bw_registrar).
--  - bw_links: cada link de cadastro (?t=TOKEN / ?cliente=TOKEN) pertence ao
--    dono que o gerou — também registrado sozinho pelo site.
-- =====================================================================

-- ---------- tabelas de posse ----------
create table if not exists public.bw_eventos (
  evento_id text primary key,
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
create table if not exists public.bw_links (
  token text primary key,
  dono uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);
alter table public.bw_eventos enable row level security;
alter table public.bw_links  enable row level security;
drop policy if exists "dono ve seus eventos" on public.bw_eventos;
create policy "dono ve seus eventos" on public.bw_eventos for select to authenticated using (dono = auth.uid());
drop policy if exists "dono ve seus links" on public.bw_links;
create policy "dono ve seus links" on public.bw_links for select to authenticated using (dono = auth.uid());

-- ---------- coluna dono ----------
alter table public.equipe_cadastros add column if not exists dono uuid;
alter table public.equipe_presenca  add column if not exists dono uuid;
create index if not exists equipe_cadastros_dono_idx on public.equipe_cadastros (dono);
create index if not exists equipe_presenca_dono_idx  on public.equipe_presenca (dono);
create index if not exists equipe_presenca_evento_idx on public.equipe_presenca (evento_id);

-- quem envia o formulário NUNCA escolhe o dono: ele vem do link (token) ou do evento
create or replace function public.bw_dono_cadastro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.dono := null;
  if new.token is not null and new.token <> '' then
    select l.dono into new.dono from public.bw_links l where l.token = new.token;
  end if;
  if new.dono is null then new.dono := auth.uid(); end if;   -- cadastro feito pelo próprio dono, logado
  return new;   -- token ainda não registrado: fica sem dono até o dono abrir o site (bw_registrar)
end $$;
drop trigger if exists bw_dono_cadastro on public.equipe_cadastros;
create trigger bw_dono_cadastro before insert on public.equipe_cadastros
  for each row execute function public.bw_dono_cadastro();

create or replace function public.bw_dono_presenca() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select e.dono into new.dono from public.bw_eventos e where e.evento_id = new.evento_id::text;
  return new;
end $$;
drop trigger if exists bw_dono_presenca on public.equipe_presenca;
create trigger bw_dono_presenca before insert on public.equipe_presenca
  for each row execute function public.bw_dono_presenca();

-- ---------- registro automático (chamado pelo site de quem está logado) ----------
create or replace function public.bw_registrar(p_eventos text[] default '{}', p_tokens text[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then return; end if;
  insert into public.bw_eventos (evento_id, dono)
    select distinct x, u from unnest(coalesce(p_eventos, '{}')) x where x is not null and x <> ''
    on conflict (evento_id) do nothing;                         -- o primeiro dono registrado vale
  insert into public.bw_links (token, dono)
    select distinct x, u from unnest(coalesce(p_tokens, '{}')) x where x is not null and length(x) >= 6
    on conflict (token) do nothing;
  -- dados antigos (de antes desta correção) passam para o dono certo
  update public.equipe_presenca p set dono = u
    where p.dono is null and p.evento_id::text in (select evento_id from public.bw_eventos where dono = u);
  update public.equipe_cadastros c set dono = u
    where c.dono is null and c.token in (select token from public.bw_links where dono = u);
end $$;
revoke all on function public.bw_registrar(text[], text[]) from public, anon;
grant execute on function public.bw_registrar(text[], text[]) to authenticated;

-- cadastros antigos SEM link (token vazio) ficam com o administrador BW
do $$ begin
  update public.equipe_cadastros c set dono = a.uid
    from (select u.id as uid from auth.users u
          join public.bw_admins b on lower(b.email) = lower(u.email) limit 1) a
    where c.dono is null and (c.token is null or c.token = '');
exception when others then raise notice 'cadastros sem link: atribuicao ao admin pulada (%)', sqlerrm;
end $$;

-- ---------- regras: cada um só vê e apaga o que é seu ----------
drop policy if exists "dono le os cadastros"  on public.equipe_cadastros;
drop policy if exists "dono apaga cadastros"  on public.equipe_cadastros;
drop policy if exists "dono altera cadastros" on public.equipe_cadastros;
create policy "dono le os cadastros"  on public.equipe_cadastros for select to authenticated using (dono = auth.uid());
create policy "dono apaga cadastros"  on public.equipe_cadastros for delete to authenticated using (dono = auth.uid());
create policy "dono altera cadastros" on public.equipe_cadastros for update to authenticated using (dono = auth.uid()) with check (dono = auth.uid());

drop policy if exists "dono le as presencas"  on public.equipe_presenca;
drop policy if exists "dono apaga presencas"  on public.equipe_presenca;
create policy "dono le as presencas" on public.equipe_presenca for select to authenticated using (dono = auth.uid());
create policy "dono apaga presencas" on public.equipe_presenca for delete to authenticated using (dono = auth.uid());
-- (as regras de ENVIO público — "qualquer pessoa envia cadastro" / "colaborador confirma presenca" — continuam)

-- ---------- arquivos (bucket eventos-midia) ----------
-- pasta = id do evento: <evento>/foto.jpg · <evento>/comprovantes/… · <evento>/contratos/… · <evento>/nfe/…
create or replace function public.bw_evento_meu(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bw_eventos where evento_id = p and dono = auth.uid())
$$;
create or replace function public.bw_evento_livre_ou_meu(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not exists (select 1 from public.bw_eventos where evento_id = p and dono <> auth.uid())
$$;
grant execute on function public.bw_evento_meu(text), public.bw_evento_livre_ou_meu(text) to anon, authenticated;

drop policy if exists "leitura publica das midias" on storage.objects;
drop policy if exists "dono remove midias"         on storage.objects;
drop policy if exists "upload autenticado"         on storage.objects;
drop policy if exists "galeria publica: so fotos do evento" on storage.objects;
drop policy if exists "dono ve as midias dos seus eventos"  on storage.objects;
drop policy if exists "dono envia midias"  on storage.objects;
drop policy if exists "dono altera midias" on storage.objects;
-- galeria do cliente (sem login): lista SÓ as fotos da pasta do evento — subpastas
-- (comprovantes, contratos, nfe) deixam de aparecer para quem não é o dono
create policy "galeria publica: so fotos do evento" on storage.objects for select to public
  using (bucket_id = 'eventos-midia' and coalesce(array_length(storage.foldername(name), 1), 0) = 1);
create policy "dono ve as midias dos seus eventos" on storage.objects for select to authenticated
  using (bucket_id = 'eventos-midia' and public.bw_evento_meu((storage.foldername(name))[1]));
create policy "dono envia midias" on storage.objects for insert to authenticated
  with check (bucket_id = 'eventos-midia' and public.bw_evento_livre_ou_meu((storage.foldername(name))[1]));
create policy "dono altera midias" on storage.objects for update to authenticated
  using (bucket_id = 'eventos-midia' and public.bw_evento_meu((storage.foldername(name))[1]));
create policy "dono remove midias" on storage.objects for delete to authenticated
  using (bucket_id = 'eventos-midia' and public.bw_evento_meu((storage.foldername(name))[1]));

-- ---------- pedidos de orçamento do site BW Produções ----------
drop policy if exists "equipe le orcamentos"      on public.orcamentos;
drop policy if exists "equipe atualiza orcamentos" on public.orcamentos;
create policy "equipe le orcamentos" on public.orcamentos for select to authenticated using (public.is_bw_admin());
create policy "equipe atualiza orcamentos" on public.orcamentos for update to authenticated
  using (public.is_bw_admin()) with check (public.is_bw_admin());

-- ---------- conferência: deve listar as regras novas ----------
select tablename, policyname, cmd from pg_policies
where (schemaname = 'public' and tablename in ('equipe_cadastros','equipe_presenca','bw_eventos','bw_links','orcamentos'))
   or (schemaname = 'storage' and (qual ilike '%eventos-midia%' or with_check ilike '%eventos-midia%'))
order by 1, 2;
