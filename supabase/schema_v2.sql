-- XY Family Tree - Schema V2 (family-unit model)
-- Goal: graph relationships are unit-to-unit, not person-to-person.
-- Execute after backup. Keep old `members` table for person profiles/avatar.

begin;

create table if not exists public.family_units (
  id text primary key,
  name text not null,
  generation integer,
  layout_x double precision,
  layout_y double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_unit_members (
  unit_id text not null references public.family_units(id) on delete cascade,
  member_id text not null unique references public.members(id) on delete cascade,
  role text not null check (role in ('single', 'partner1', 'partner2')),
  created_at timestamptz not null default now(),
  primary key (unit_id, member_id)
);

create table if not exists public.unit_relations (
  id text primary key,
  from_unit_id text not null references public.family_units(id) on delete cascade,
  to_unit_id text not null references public.family_units(id) on delete cascade,
  relation_type text not null check (relation_type in ('parent_child', 'sibling')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (from_unit_id <> to_unit_id)
);

create unique index if not exists ux_unit_relations_unique
  on public.unit_relations (from_unit_id, to_unit_id, relation_type);

-- updated_at trigger (reuse existing function)
drop trigger if exists trg_family_units_updated_at on public.family_units;
create trigger trg_family_units_updated_at
before update on public.family_units
for each row execute function public.set_updated_at();

drop trigger if exists trg_unit_relations_updated_at on public.unit_relations;
create trigger trg_unit_relations_updated_at
before update on public.unit_relations
for each row execute function public.set_updated_at();

commit;

