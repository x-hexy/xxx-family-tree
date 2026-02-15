-- Ensure avatars bucket exists and can be used without auth login (anon key).
-- WARNING: this allows anyone with your anon key to read/write in `avatars`.
-- Use only for no-login apps.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Read policy
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
to anon
using (bucket_id = 'avatars');

-- Upload policy
drop policy if exists "avatars_anon_insert" on storage.objects;
create policy "avatars_anon_insert"
on storage.objects
for insert
to anon
with check (bucket_id = 'avatars');

-- Update policy
drop policy if exists "avatars_anon_update" on storage.objects;
create policy "avatars_anon_update"
on storage.objects
for update
to anon
using (bucket_id = 'avatars')
with check (bucket_id = 'avatars');

-- Delete policy
drop policy if exists "avatars_anon_delete" on storage.objects;
create policy "avatars_anon_delete"
on storage.objects
for delete
to anon
using (bucket_id = 'avatars');

