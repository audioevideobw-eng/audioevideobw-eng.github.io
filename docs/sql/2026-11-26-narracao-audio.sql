-- 26/11/2026 · narração dos tutoriais com a voz do dono (ElevenLabs, voz clonada "MARCOS BONFÁ"):
-- o bucket público "trends" (só ADM envia) passa a aceitar MP3, guardado em trends/narracao/<tutorial>-<passo>.mp3.
update storage.buckets set allowed_mime_types = array['image/jpeg','image/png','image/webp','audio/mpeg']
where id = 'trends';
select id, public, allowed_mime_types, file_size_limit from storage.buckets where id = 'trends';
