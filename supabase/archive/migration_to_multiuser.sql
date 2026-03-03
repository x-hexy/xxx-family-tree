-- ============================================================
-- migration_to_multiuser.sql
-- 将现有数据（无 tree_id）挂载到第一个注册账号的树
-- ============================================================
-- 前提：
--   1. 已执行 schema_multiuser.sql
--   2. 已有至少一个用户在 Supabase Auth 注册完成
--      （即 trees 表中已存在至少一条记录）
-- 执行一次即可，幂等设计（重复执行不会破坏数据）
-- ============================================================

DO $$
DECLARE
  v_tree_id   text;
  v_old_token text;
  v_members_updated   integer;
  v_units_updated     integer;
BEGIN

  -- --------------------------------------------------------
  -- Step 1: 找到第一棵树
  -- --------------------------------------------------------
  SELECT id INTO v_tree_id
  FROM public.trees
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION
      '未找到任何树记录。请先完成一次用户注册（注册成功后会自动创建 trees 记录），再执行此迁移脚本。';
  END IF;

  RAISE NOTICE '目标树 ID: %', v_tree_id;

  -- --------------------------------------------------------
  -- Step 2: 将无 tree_id 的 members 挂载到该树
  -- --------------------------------------------------------
  UPDATE public.members
  SET tree_id = v_tree_id
  WHERE tree_id IS NULL;

  GET DIAGNOSTICS v_members_updated = ROW_COUNT;
  RAISE NOTICE '已更新 members: % 条', v_members_updated;

  -- --------------------------------------------------------
  -- Step 3: 将无 tree_id 的 family_units 挂载到该树
  -- --------------------------------------------------------
  UPDATE public.family_units
  SET tree_id = v_tree_id
  WHERE tree_id IS NULL;

  GET DIAGNOSTICS v_units_updated = ROW_COUNT;
  RAISE NOTICE '已更新 family_units: % 条', v_units_updated;

  -- --------------------------------------------------------
  -- Step 4: 迁移分享 token（从 share_settings_legacy 读取）
  -- --------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM public.share_settings WHERE tree_id = v_tree_id
  ) THEN
    -- 尝试从旧表读取 token
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'share_settings_legacy'
    ) THEN
      SELECT token INTO v_old_token
      FROM public.share_settings_legacy
      WHERE id = 1;
    END IF;

    -- 复用旧 token；如无旧 token 则生成新的
    INSERT INTO public.share_settings (tree_id, token, enabled)
    VALUES (
      v_tree_id,
      COALESCE(v_old_token, substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)),
      true
    );

    IF v_old_token IS NOT NULL THEN
      RAISE NOTICE '已复用旧分享 token: %', v_old_token;
    ELSE
      RAISE NOTICE '已生成新分享 token';
    END IF;
  ELSE
    RAISE NOTICE 'share_settings 已存在，跳过 token 迁移';
  END IF;

  -- --------------------------------------------------------
  -- Step 5: tree_id 改为 NOT NULL（确保数据完整性）
  -- --------------------------------------------------------
  -- 检查是否仍有 NULL 值，若有则迁移可能不完整
  IF EXISTS (SELECT 1 FROM public.members WHERE tree_id IS NULL LIMIT 1) THEN
    RAISE EXCEPTION 'members 表仍有 tree_id 为 NULL 的记录，迁移未完成';
  END IF;

  IF EXISTS (SELECT 1 FROM public.family_units WHERE tree_id IS NULL LIMIT 1) THEN
    RAISE EXCEPTION 'family_units 表仍有 tree_id 为 NULL 的记录，迁移未完成';
  END IF;

  BEGIN
    ALTER TABLE public.members ALTER COLUMN tree_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'members.tree_id 已经是 NOT NULL，跳过';
  END;

  BEGIN
    ALTER TABLE public.family_units ALTER COLUMN tree_id SET NOT NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'family_units.tree_id 已经是 NOT NULL，跳过';
  END;

  RAISE NOTICE '========================================';
  RAISE NOTICE '迁移完成！';
  RAISE NOTICE '  树 ID: %', v_tree_id;
  RAISE NOTICE '  已迁移 members: % 条', v_members_updated;
  RAISE NOTICE '  已迁移 family_units: % 条', v_units_updated;
  RAISE NOTICE '========================================';

END $$;
