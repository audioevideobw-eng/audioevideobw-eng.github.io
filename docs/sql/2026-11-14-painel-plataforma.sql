-- =====================================================================
-- Brightway · PAINEL FINANCEIRO lê também os lançamentos da PLATAFORMA (14/11/2026, Claude)
-- O Fluxo de caixa do app (user_data, chave neg_fluxo) já reúne: recebimentos de eventos
-- (receita_*), gastos dos eventos (gasto_*), cachês da equipe (cache_*), fixos (fixo_*) e
-- lançamentos manuais. Esta função traduz cada um para as categorias/grupos do painel.
-- Uma tradução só: o painel (fin_minha_plataforma) e a planilha (fin_plataforma) usam a mesma.
-- Só entra o que já aconteceu (data até hoje) e não está pendente (cachê "a pagar").
-- Idempotente. Só leitura.
-- =====================================================================

create or replace function public.fin_lanc_plataforma_de(p_uid uuid)
returns table (data date, mes text, categoria text, grupo text, quem text, descricao text, valor numeric, origem text)
language sql stable security definer set search_path = public as $$
  with fluxo as (
    select x
    from public.user_data u, jsonb_array_elements(
      case when jsonb_typeof(u.dados::jsonb) = 'array' then u.dados::jsonb else '[]'::jsonb end) x
    where u.user_id = p_uid and u.chave = 'neg_fluxo'
  ),
  eventos as (
    select x
    from public.user_data u, jsonb_array_elements(
      case when jsonb_typeof(u.dados::jsonb) = 'array' then u.dados::jsonb else '[]'::jsonb end) x
    where u.user_id = p_uid and u.chave = 'neg_eventos'
  ),
  base as (
    select
      case when (f.x->>'c0') ~ '^\d{4}-\d{2}-\d{2}' then left(f.x->>'c0', 10)::date end as d,
      coalesce(f.x->>'c1', '') as tipo,
      abs(coalesce(nullif(regexp_replace(replace(coalesce(f.x->>'c2', ''), ',', '.'), '[^0-9.]', '', 'g'), '')::numeric, 0)) as v,
      coalesce(f.x->>'c3', '') as cat,
      coalesce(f.x->>'id', '') as id,
      coalesce(f.x->>'fonte', '') as fonte
    from fluxo f
  ),
  trad as (
    select b.*,
      case
        when b.id like 'receita_%'                                   then 'Receita de cliente'
        when b.id like 'cache_%'                                     then 'Repasse a pessoa física (equipe)'
        when b.id like 'gasto_%'                                     then 'Custos variáveis do evento'
        when b.tipo = 'Entrada' and b.cat in ('Venda de produto','Venda de serviço','Recebimento de cliente') then 'Receita de cliente'
        when b.tipo = 'Entrada' and b.cat = 'Empréstimo/Financiamento' then 'Empréstimo recebido'
        when b.tipo = 'Entrada'                                      then 'Outras entradas'
        when b.cat = 'Fornecedor'                                    then 'Pagamento a empresa (fornecedor)'
        when b.cat = 'Equipamento'                                   then 'Compra de equipamento'
        when b.cat = 'Salários e pró-labore'                         then 'Pró-labore e salários'
        when b.cat = 'Impostos e taxas'                              then 'Impostos e taxas'
        when b.cat = 'Energia/Água/Internet'                         then 'Energia/água/internet'
        when b.cat = 'Aluguel'                                       then 'Aluguel'
        when b.cat = 'Marketing/Publicidade'                         then 'Marketing'
        when b.cat = 'Transporte/Combustível'                        then 'Transporte/combustível'
        when b.cat = 'Material de trabalho'                          then 'Material de trabalho'
        when b.cat = 'Empréstimo/Financiamento'                      then 'Parcela de empréstimo'
        when b.id like 'fixo_%'                                      then 'Contas fixas'
        else 'Outras saídas'
      end as categoria
    from base b
    where b.d is not null and b.d <= current_date and b.v > 0 and b.fonte <> 'pendente'
  )
  select
    t.d,
    (array['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'])[extract(month from t.d)::int],
    t.categoria,
    case
      when t.categoria in ('Receita de cliente','Outras entradas')                                  then 'Receita'
      when t.categoria = 'Empréstimo recebido'                                                      then 'Terceiros'
      when t.categoria in ('Repasse a pessoa física (equipe)','Custos variáveis do evento','Pagamento a empresa (fornecedor)') then 'Custos dos eventos'
      when t.categoria = 'Pró-labore e salários'                                                    then 'Sócio'
      else 'Despesas e contas'
    end,
    case when t.id like 'receita_%'
         then coalesce((select e.x->>'cliente' from eventos e where 'receita_' || (e.x->>'id') = t.id limit 1), t.cat)
         else t.cat end,
    t.cat,
    case when t.tipo = 'Entrada' then t.v else -t.v end,
    'plataforma'
  from trad t
  order by t.d
$$;
revoke all on function public.fin_lanc_plataforma_de(uuid) from public, anon, authenticated;

-- para o PAINEL (conta logada)
create or replace function public.fin_minha_plataforma()
returns table (data date, mes text, categoria text, grupo text, quem text, descricao text, valor numeric, origem text)
language sql stable security definer set search_path = public as $$
  select * from public.fin_lanc_plataforma_de(auth.uid()) where auth.uid() is not null
$$;
revoke all on function public.fin_minha_plataforma() from public;
grant execute on function public.fin_minha_plataforma() to authenticated;

-- para o ROBÔ DA PLANILHA (aba "Da plataforma"), pela chave da própria planilha
create or replace function public.fin_plataforma(p_chave text)
returns table (data date, mes text, categoria text, grupo text, quem text, descricao text, valor numeric, origem text)
language plpgsql stable security definer set search_path = public, extensions as $$
declare v_dono uuid;
begin
  select dono into v_dono from public.fin_sync_chave
   where hash = encode(extensions.digest(coalesce(p_chave, ''), 'sha256'), 'hex');
  if v_dono is null then raise exception 'chave invalida' using errcode = '28000'; end if;
  return query select * from public.fin_lanc_plataforma_de(v_dono);
end $$;
revoke all on function public.fin_plataforma(text) from public;
grant execute on function public.fin_plataforma(text) to anon, authenticated;

-- conferência (contagem dos lançamentos da plataforma do dono)
select categoria, grupo, count(*), sum(valor) from public.fin_lanc_plataforma_de('e3593b5b-9d2a-4eac-b9d6-1e8d00482542') group by 1, 2 order by 2, 1;
