-- ============================================================
-- 启用 RLS 并为 anon 角色创建读写策略
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================================

-- 1. members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_members" ON public.members FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_members" ON public.members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_members" ON public.members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_members" ON public.members FOR DELETE TO anon USING (true);

-- 2. relationships (legacy, 保留兼容)
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_relationships" ON public.relationships FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_relationships" ON public.relationships FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_relationships" ON public.relationships FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_relationships" ON public.relationships FOR DELETE TO anon USING (true);

-- 3. share_settings
ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_share_settings" ON public.share_settings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_share_settings" ON public.share_settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_share_settings" ON public.share_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_share_settings" ON public.share_settings FOR DELETE TO anon USING (true);

-- 4. family_units
ALTER TABLE public.family_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_family_units" ON public.family_units FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_family_units" ON public.family_units FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_family_units" ON public.family_units FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_family_units" ON public.family_units FOR DELETE TO anon USING (true);

-- 5. family_unit_members
ALTER TABLE public.family_unit_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_family_unit_members" ON public.family_unit_members FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_family_unit_members" ON public.family_unit_members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_family_unit_members" ON public.family_unit_members FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_family_unit_members" ON public.family_unit_members FOR DELETE TO anon USING (true);

-- 6. unit_relations
ALTER TABLE public.unit_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_unit_relations" ON public.unit_relations FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_unit_relations" ON public.unit_relations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_unit_relations" ON public.unit_relations FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_unit_relations" ON public.unit_relations FOR DELETE TO anon USING (true);
