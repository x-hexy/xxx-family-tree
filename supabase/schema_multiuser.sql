-- ============================================================
-- schema_multiuser.sql
-- 多用户架构迁移：新增 trees 表、改造 share_settings、重写 RLS
-- ============================================================
-- 前提：schema.sql + schema_v2.sql + enable_rls.sql 已执行完毕
-- 执行顺序：先执行本文件，再注册账号，再执行 migration_to_multiuser.sql
-- ============================================================

BEGIN;

-- ============================================================
-- 1. 创建 trees 表（每用户一棵树）
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trees (
  id         text PRIMARY KEY,
  owner_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT '我的家谱',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. members / family_units 新增 tree_id 列（暂设可空，迁移后改 NOT NULL）
-- ============================================================
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS tree_id text REFERENCES public.trees(id) ON DELETE CASCADE;

ALTER TABLE public.family_units
  ADD COLUMN IF NOT EXISTS tree_id text REFERENCES public.trees(id) ON DELETE CASCADE;

-- ============================================================
-- 3. 改造 share_settings：重命名旧表保留 token，新建 per-tree 结构
-- ============================================================
DO $$
BEGIN
  -- 只有当旧格式（integer id 列）存在且尚未重命名时才执行重命名
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'share_settings'
      AND column_name  = 'id'
      AND data_type    = 'integer'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_settings_legacy'
  ) THEN
    ALTER TABLE public.share_settings RENAME TO share_settings_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.share_settings (
  tree_id    text PRIMARY KEY REFERENCES public.trees(id) ON DELETE CASCADE,
  token      text NOT NULL UNIQUE,
  enabled    boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_share_settings_updated_at ON public.share_settings;
CREATE TRIGGER trg_share_settings_updated_at
  BEFORE UPDATE ON public.share_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. 清理旧 anon 全开策略
-- ============================================================
-- members
DROP POLICY IF EXISTS "anon_select_members"  ON public.members;
DROP POLICY IF EXISTS "anon_insert_members"  ON public.members;
DROP POLICY IF EXISTS "anon_update_members"  ON public.members;
DROP POLICY IF EXISTS "anon_delete_members"  ON public.members;

-- family_units
DROP POLICY IF EXISTS "anon_select_family_units" ON public.family_units;
DROP POLICY IF EXISTS "anon_insert_family_units" ON public.family_units;
DROP POLICY IF EXISTS "anon_update_family_units" ON public.family_units;
DROP POLICY IF EXISTS "anon_delete_family_units" ON public.family_units;

-- family_unit_members
DROP POLICY IF EXISTS "anon_select_family_unit_members" ON public.family_unit_members;
DROP POLICY IF EXISTS "anon_insert_family_unit_members" ON public.family_unit_members;
DROP POLICY IF EXISTS "anon_update_family_unit_members" ON public.family_unit_members;
DROP POLICY IF EXISTS "anon_delete_family_unit_members" ON public.family_unit_members;

-- unit_relations
DROP POLICY IF EXISTS "anon_select_unit_relations" ON public.unit_relations;
DROP POLICY IF EXISTS "anon_insert_unit_relations" ON public.unit_relations;
DROP POLICY IF EXISTS "anon_update_unit_relations" ON public.unit_relations;
DROP POLICY IF EXISTS "anon_delete_unit_relations" ON public.unit_relations;

-- share_settings_legacy（如存在）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'share_settings_legacy'
  ) THEN
    DROP POLICY IF EXISTS "anon_select_share_settings" ON public.share_settings_legacy;
    DROP POLICY IF EXISTS "anon_insert_share_settings" ON public.share_settings_legacy;
    DROP POLICY IF EXISTS "anon_update_share_settings" ON public.share_settings_legacy;
    DROP POLICY IF EXISTS "anon_delete_share_settings" ON public.share_settings_legacy;
  END IF;
END $$;

-- ============================================================
-- 5. 新 RLS 策略
-- ============================================================

-- 5.1 trees：只有 owner 可以操作自己的树
CREATE POLICY "trees_owner_all" ON public.trees
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 5.2 members：owner 全权；anon/authenticated 均可读已开放分享的树数据
-- （authenticated 读共享树：应对已登录用户访问他人分享链接的场景）
CREATE POLICY "members_owner_all" ON public.members
  FOR ALL TO authenticated
  USING (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ))
  WITH CHECK (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ));

CREATE POLICY "members_shared_read" ON public.members
  FOR SELECT TO anon, authenticated
  USING (tree_id IN (
    SELECT tree_id FROM public.share_settings WHERE enabled = true
  ));

-- 5.3 family_units：同 members
CREATE POLICY "family_units_owner_all" ON public.family_units
  FOR ALL TO authenticated
  USING (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ))
  WITH CHECK (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ));

CREATE POLICY "family_units_shared_read" ON public.family_units
  FOR SELECT TO anon, authenticated
  USING (tree_id IN (
    SELECT tree_id FROM public.share_settings WHERE enabled = true
  ));

-- 5.4 family_unit_members：通过 family_units 关联 tree_id（无直接列）
CREATE POLICY "family_unit_members_owner_all" ON public.family_unit_members
  FOR ALL TO authenticated
  USING (unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ))
  WITH CHECK (unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ));

CREATE POLICY "family_unit_members_shared_read" ON public.family_unit_members
  FOR SELECT TO anon, authenticated
  USING (unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT tree_id FROM public.share_settings WHERE enabled = true)
  ));

-- 5.5 unit_relations：通过 from_unit_id → family_units 关联 tree_id
CREATE POLICY "unit_relations_owner_all" ON public.unit_relations
  FOR ALL TO authenticated
  USING (from_unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ))
  WITH CHECK (from_unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ));

CREATE POLICY "unit_relations_shared_read" ON public.unit_relations
  FOR SELECT TO anon, authenticated
  USING (from_unit_id IN (
    SELECT id FROM public.family_units
    WHERE tree_id IN (SELECT tree_id FROM public.share_settings WHERE enabled = true)
  ));

-- 5.6 share_settings：owner 全权；anon 只读（用于 token 查询）
CREATE POLICY "share_settings_owner_all" ON public.share_settings
  FOR ALL TO authenticated
  USING (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ))
  WITH CHECK (tree_id IN (
    SELECT id FROM public.trees WHERE owner_id = auth.uid()
  ));

-- anon 可读全部 share_settings 行（无敏感数据，仅含 tree_id/token/enabled）
CREATE POLICY "share_settings_anon_read" ON public.share_settings
  FOR SELECT TO anon
  USING (true);

-- ============================================================
-- 6. Postgres Function：通过 share token 查询 tree_id（供只读页使用）
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_tree_by_token(p_token text)
RETURNS TABLE (tree_id text, enabled boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT ss.tree_id, ss.enabled
    FROM public.share_settings ss
    WHERE ss.token = p_token
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tree_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tree_by_token(text) TO authenticated;

COMMIT;
