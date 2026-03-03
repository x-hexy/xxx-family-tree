-- ============================================================
-- xxx-family-tree — Canonical Schema (Multi-User V2)
-- ============================================================
-- Fresh deployment: execute this file THEN storage.sql.
-- No migrations needed for new databases.
-- ============================================================

BEGIN;

-- ============================================================
-- 0. Utility: auto-update updated_at on every row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. trees — one tree per registered user
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trees (
  id         text        PRIMARY KEY,
  owner_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL DEFAULT '我的家谱',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trees_owner_all" ON public.trees
  FOR ALL TO authenticated
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ============================================================
-- 2. share_settings — per-tree share token
--    Defined early so later policies can reference it.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.share_settings (
  tree_id    text        PRIMARY KEY REFERENCES public.trees(id) ON DELETE CASCADE,
  token      text        NOT NULL UNIQUE,
  enabled    boolean     NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_share_settings_updated_at ON public.share_settings;
CREATE TRIGGER trg_share_settings_updated_at
  BEFORE UPDATE ON public.share_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "share_settings_owner_all" ON public.share_settings
  FOR ALL TO authenticated
  USING  (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()))
  WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()));

-- anon can read share_settings to look up tokens (no sensitive data)
CREATE POLICY "share_settings_anon_read" ON public.share_settings
  FOR SELECT TO anon
  USING (true);

-- ============================================================
-- 3. members — individual person profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.members (
  id         text        PRIMARY KEY,
  tree_id    text        NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  title      text,
  birth_year integer,
  generation integer,
  bio        text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- owner: full CRUD on their own tree's members
CREATE POLICY "members_owner_all" ON public.members
  FOR ALL TO authenticated
  USING  (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()))
  WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()));

-- anon + logged-in visitor: read-only when share is enabled
CREATE POLICY "members_shared_read" ON public.members
  FOR SELECT TO anon, authenticated
  USING (tree_id IN (
    SELECT tree_id FROM public.share_settings WHERE enabled = true
  ));

-- ============================================================
-- 4. family_units — unit nodes (couple card or single card)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_units (
  id         text             PRIMARY KEY,
  tree_id    text             NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  name       text             NOT NULL,
  generation integer,
  layout_x   double precision,
  layout_y   double precision,
  created_at timestamptz      NOT NULL DEFAULT now(),
  updated_at timestamptz      NOT NULL DEFAULT now()
);

ALTER TABLE public.family_units ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_family_units_updated_at ON public.family_units;
CREATE TRIGGER trg_family_units_updated_at
  BEFORE UPDATE ON public.family_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "family_units_owner_all" ON public.family_units
  FOR ALL TO authenticated
  USING  (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()))
  WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid()));

CREATE POLICY "family_units_shared_read" ON public.family_units
  FOR SELECT TO anon, authenticated
  USING (tree_id IN (
    SELECT tree_id FROM public.share_settings WHERE enabled = true
  ));

-- ============================================================
-- 5. family_unit_members — links members to units (with role)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.family_unit_members (
  unit_id    text        NOT NULL REFERENCES public.family_units(id) ON DELETE CASCADE,
  member_id  text        NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('single', 'partner1', 'partner2')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (unit_id, member_id)
);

ALTER TABLE public.family_unit_members ENABLE ROW LEVEL SECURITY;

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
    WHERE tree_id IN (
      SELECT tree_id FROM public.share_settings WHERE enabled = true
    )
  ));

-- ============================================================
-- 6. unit_relations — directed edges between units
-- ============================================================
CREATE TABLE IF NOT EXISTS public.unit_relations (
  id            text        PRIMARY KEY,
  from_unit_id  text        NOT NULL REFERENCES public.family_units(id) ON DELETE CASCADE,
  to_unit_id    text        NOT NULL REFERENCES public.family_units(id) ON DELETE CASCADE,
  relation_type text        NOT NULL CHECK (relation_type IN ('parent_child', 'sibling')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (from_unit_id <> to_unit_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_unit_relations_unique
  ON public.unit_relations (from_unit_id, to_unit_id, relation_type);

ALTER TABLE public.unit_relations ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_unit_relations_updated_at ON public.unit_relations;
CREATE TRIGGER trg_unit_relations_updated_at
  BEFORE UPDATE ON public.unit_relations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    WHERE tree_id IN (
      SELECT tree_id FROM public.share_settings WHERE enabled = true
    )
  ));

-- ============================================================
-- 7. relationships — legacy V1 member-level edges
--    Still written by the store; not rendered in V2 UI.
--    Kept to avoid write errors until store cleanup is done.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.relationships (
  id             text        PRIMARY KEY,
  from_member_id text        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  to_member_id   text        NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  relation_type  text        NOT NULL CHECK (relation_type IN ('parent', 'child', 'spouse', 'sibling')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_relationships_updated_at ON public.relationships;
CREATE TRIGGER trg_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "relationships_owner_all" ON public.relationships
  FOR ALL TO authenticated
  USING (from_member_id IN (
    SELECT id FROM public.members
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ))
  WITH CHECK (from_member_id IN (
    SELECT id FROM public.members
    WHERE tree_id IN (SELECT id FROM public.trees WHERE owner_id = auth.uid())
  ));

-- ============================================================
-- 8. get_tree_by_token — SECURITY DEFINER RPC
--    Used by the read-only page (anon) to resolve a share token
--    to a tree_id without bypassing RLS on other tables.
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
    FROM   public.share_settings ss
    WHERE  ss.token = p_token
    LIMIT  1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tree_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tree_by_token(text) TO authenticated;

COMMIT;
