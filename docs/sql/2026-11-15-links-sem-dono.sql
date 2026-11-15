-- LINKS DE CADASTRO / PRESENÇA SEM DONO — 15/11/2026, Claude
-- Achado: o cadastro do colaborador "Fabio Batista" (link bwq1qfoen7) entrou no banco SEM DONO: o link foi criado num aparelho
-- e nunca foi registrado no servidor (o registro só acontecia no fim de uma sincronia completa; depois um link novo o substituiu).
-- Sem dono, ninguém via o cadastro — e o colaborador recebia "✓ enviado". Correções:
--   1) recupera o cadastro perdido;  2) o site agora registra o link NA HORA em que é criado (BWSync.registrarAgora);
--   3) o banco RECUSA cadastro/presença por link desconhecido (o colaborador vê o erro em vez de sumir em silêncio);
--   4) limite contra spam por link (30 cadastros/hora por link; 200 respostas/hora por evento).

-- 1) recuperação (link enviado pelo dono ao colaborador)
insert into public.bw_links (token, dono) values ('bwq1qfoen7', 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542') on conflict (token) do nothing;
update public.equipe_cadastros set dono = 'e3593b5b-9d2a-4eac-b9d6-1e8d00482542' where token = 'bwq1qfoen7' and dono is null;

-- 3+4) cadastro: precisa de link registrado (ou o próprio dono logado)
create or replace function public.bw_dono_cadastro() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.dono := null;
  if new.token is not null and new.token <> '' then
    select l.dono into new.dono from public.bw_links l where l.token = new.token;
  end if;
  if new.dono is null then new.dono := auth.uid(); end if;          -- cadastro feito pelo próprio dono, logado
  if new.dono is null then
    raise exception 'LINK_INVALIDO: este link de cadastro não está ativo — peça um novo link';
  end if;
  if (select count(*) from public.equipe_cadastros where token = new.token and criado_em > now() - interval '1 hour') >= 30 then
    raise exception 'LIMITE: muitos cadastros por este link agora — tente mais tarde';
  end if;
  return new;
end $$;

-- 3+4) presença: o evento precisa estar registrado
create or replace function public.bw_dono_presenca() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select e.dono into new.dono from public.bw_eventos e where e.evento_id = new.evento_id::text;
  if new.dono is null then
    raise exception 'LINK_INVALIDO: este link de presença não está ativo — peça um novo link';
  end if;
  if (select count(*) from public.equipe_presenca where evento_id = new.evento_id and criado_em > now() - interval '1 hour') >= 200 then
    raise exception 'LIMITE: muitas respostas agora — tente mais tarde';
  end if;
  return new;
end $$;
