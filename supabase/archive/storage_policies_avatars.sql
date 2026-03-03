-- ============================================================
-- storage_policies_avatars.sql
-- avatars bucket 存储策略（多用户版本）
-- ============================================================
-- 执行前提：schema_multiuser.sql 已执行
--
-- 头像路径约定：{tree_id}/{member_id}/{timestamp}.{ext}
-- INSERT/UPDATE/DELETE 策略通过路径第一段验证 tree 归属
-- ============================================================

-- 确保 bucket 存在（public=true 使所有文件可直接通过 URL 读取）
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 清理旧 anon 策略
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_anon_delete" ON storage.objects;

-- 公开读（anon + authenticated 均可，bucket public=true 已保障）
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

-- 上传：authenticated 用户只能写入自己树路径下（路径第一段 = tree_id）
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

