-- ============================================================
-- xxx-family-tree — Storage Policies (avatars bucket)
-- ============================================================
-- Execute after schema.sql.
-- Avatar path convention: {tree_id}/{member_id}/{timestamp}.{ext}
-- The first path segment (tree_id) is used to verify ownership.
-- ============================================================

-- Create bucket if it doesn't exist (public=true: direct URL access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop any stale policies from previous iterations
DROP POLICY IF EXISTS "avatars_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_delete"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_insert"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_update"  ON storage.objects;
DROP POLICY IF EXISTS "avatars_auth_delete"  ON storage.objects;

-- Public read (anon + authenticated can view any avatar URL)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- Upload: authenticated users may only write to their own tree's folder
CREATE POLICY "avatars_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.trees WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "avatars_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.trees WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.trees WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "avatars_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] IN (
      SELECT id FROM public.trees WHERE owner_id = auth.uid()
    )
  );
