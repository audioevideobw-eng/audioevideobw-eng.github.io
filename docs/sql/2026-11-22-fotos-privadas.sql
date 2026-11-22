-- =====================================================================
-- Brightway · FOTOS DOS EVENTOS EM PASTA PRIVADA (22/11/2026, Claude)
-- Rodar no Supabase → SQL Editor → New query → colar TUDO → Run.
-- Idempotente. Não apaga nenhum arquivo.
--
-- Antes: o bucket eventos-midia era PÚBLICO — quem soubesse o número do evento e o nome do
-- arquivo abria a foto sem o link da galeria.
-- Agora: o bucket fica PRIVADO.
--   • o DONO continua vendo/enviando/apagando (regras "dono … midias" de 13/11, por bw_evento_meu);
--     o site troca o endereço antigo por um link temporário (BWSync.urlSegura);
--   • o CLIENTE vê as fotos só pelo link secreto (cadastro.html?g=TOKEN), pela Edge Function
--     bw-galeria, que confere o token em bw_galerias e devolve links temporários de 1 h.
-- PUBLICAR A FUNÇÃO bw-galeria ANTES de rodar este SQL (senão a galeria fica vazia nesse meio-tempo).
-- =====================================================================

update storage.buckets set public = false where id = 'eventos-midia';

-- garantia: nenhuma regra de leitura pública sobrando nesse bucket
drop policy if exists "galeria publica: so fotos do evento" on storage.objects;
drop policy if exists "leitura publica das midias"          on storage.objects;

-- ---------- conferência ----------
select 'bucket eventos-midia privado' as item, (select not public from storage.buckets where id = 'eventos-midia')::text as ok
union all select 'dono ainda le as fotos', (exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'dono ve as midias dos seus eventos'))::text
union all select 'sem leitura publica', (not exists (select 1 from pg_policies where schemaname = 'storage' and roles::text like '%public%'
              and cmd = 'SELECT' and qual ilike '%eventos-midia%'))::text;
