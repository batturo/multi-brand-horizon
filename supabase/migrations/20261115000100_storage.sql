-- Product photos live in a public storage bucket. Anyone can view them (they
-- are on public product pages); only admins can upload, replace or delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB; the admin compresses photos before upload
  array['image/jpeg', 'image/webp', 'image/png', 'image/avif']
)
on conflict (id) do nothing;

create policy "admins upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

-- Admins need to list objects to manage them. Public viewing uses the public
-- bucket URL and needs no policy.
create policy "admins list product images" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
