-- PEDIR ORÇAMENTO — link público de cada conta (16/11/2026, Claude)
-- Cada conta gera um link (pedido.html?p=TOKEN). O cliente preenche e o pedido entra aqui, já com o DONO do link.
-- Ao abrir o FUNIL, o dono puxa os pedidos novos para mkt_leads (NOVO CONTATO) e marca importado = true.
-- Segurança (pente fino 10 e 26): RLS ligado; o visitante só INSERE (não lê nada); o dono vem do link registrado em bw_links
-- (link desconhecido = LINK_INVALIDO); limite de 20 pedidos/hora por link; tamanho máximo dos campos.

create table if not exists public.bw_pedidos (
  id uuid primary key default gen_random_uuid(),
  token text not null,
  dono uuid,
  criado_em timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 120),
  empresa text check (char_length(empresa) <= 120),
  whatsapp text check (char_length(whatsapp) <= 40),
  email text check (char_length(email) <= 160),
  servico text check (char_length(servico) <= 80),
  data_evento date,
  local text check (char_length(local) <= 160),
  convidados text check (char_length(convidados) <= 20),
  mensagem text check (char_length(mensagem) <= 2000),
  como_conheceu text check (char_length(como_conheceu) <= 40),
  importado boolean not null default false
);
create index if not exists bw_pedidos_dono_idx on public.bw_pedidos (dono, importado);

create or replace function public.bw_dono_pedido() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.dono := null; new.importado := false; new.criado_em := now();
  select l.dono into new.dono from public.bw_links l where l.token = new.token;
  if new.dono is null then
    raise exception 'LINK_INVALIDO: este link de orçamento não está ativo — peça um novo link';
  end if;
  if new.whatsapp is null and new.email is null then
    raise exception 'CONTATO: informe WhatsApp ou e-mail';
  end if;
  if (select count(*) from public.bw_pedidos where token = new.token and criado_em > now() - interval '1 hour') >= 20 then
    raise exception 'LIMITE: muitos pedidos por este link agora — tente mais tarde';
  end if;
  return new;
end $$;
drop trigger if exists bw_pedidos_dono on public.bw_pedidos;
create trigger bw_pedidos_dono before insert on public.bw_pedidos for each row execute function public.bw_dono_pedido();

alter table public.bw_pedidos enable row level security;
drop policy if exists "pedido: qualquer um envia" on public.bw_pedidos;
drop policy if exists "pedido: dono lê" on public.bw_pedidos;
drop policy if exists "pedido: dono marca" on public.bw_pedidos;
drop policy if exists "pedido: dono apaga" on public.bw_pedidos;
create policy "pedido: qualquer um envia" on public.bw_pedidos for insert to anon, authenticated with check (true);
create policy "pedido: dono lê" on public.bw_pedidos for select to authenticated using (dono = auth.uid());
create policy "pedido: dono marca" on public.bw_pedidos for update to authenticated using (dono = auth.uid()) with check (dono = auth.uid());
create policy "pedido: dono apaga" on public.bw_pedidos for delete to authenticated using (dono = auth.uid());
revoke all on public.bw_pedidos from anon;
grant insert on public.bw_pedidos to anon;
grant select, insert, update, delete on public.bw_pedidos to authenticated;

-- conferência: deve mostrar rls = true e 4 regras
select c.relrowsecurity as rls, (select count(*) from pg_policies p where p.tablename = 'bw_pedidos') as regras
from pg_class c where c.relname = 'bw_pedidos';
