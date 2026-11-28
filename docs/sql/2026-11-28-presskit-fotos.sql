-- PRESS KIT — fotos na conta (28/11/2026, dono: "o que eu faço de inserção de imagem em um dispositivo não salva na nuvem")
-- Balde PRIVADO presskit-fotos: cada conta só lê, grava e apaga dentro da própria pasta (<id da conta>/...).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presskit-fotos', 'presskit-fotos', false, 15728640, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pkfotos ler o seu" on storage.objects;
drop policy if exists "pkfotos gravar o seu" on storage.objects;
drop policy if exists "pkfotos mudar o seu" on storage.objects;
drop policy if exists "pkfotos apagar o seu" on storage.objects;
create policy "pkfotos ler o seu" on storage.objects for select to authenticated
  using (bucket_id = 'presskit-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pkfotos gravar o seu" on storage.objects for insert to authenticated
  with check (bucket_id = 'presskit-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pkfotos mudar o seu" on storage.objects for update to authenticated
  using (bucket_id = 'presskit-fotos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'presskit-fotos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "pkfotos apagar o seu" on storage.objects for delete to authenticated
  using (bucket_id = 'presskit-fotos' and (storage.foldername(name))[1] = auth.uid()::text);

-- conferência
select id, public from storage.buckets where id = 'presskit-fotos';
select policyname from pg_policies where tablename = 'objects' and policyname like 'pkfotos%';
