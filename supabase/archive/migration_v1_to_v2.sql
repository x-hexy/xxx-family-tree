-- Migration: v1(person-person relationships) -> v2(family-unit relationships)
-- Prerequisite: run `schema_v2.sql` first.
-- This script is idempotent (uses upsert/on conflict where possible).

begin;

-- Optional cleanup for a full rebuild.
delete from public.unit_relations;
delete from public.family_unit_members;
delete from public.family_units;

-- Ensure legacy auto-generated relation ids are removed if script is rerun partially.
delete from public.unit_relations where id like 'ur_pc_%' or id like 'ur_sb_%';

-- 1) Build spouse pairs (canonical ordering)
with spouse_pairs as (
  select distinct
    least(r.from_member_id, r.to_member_id) as a,
    greatest(r.from_member_id, r.to_member_id) as b
  from public.relationships r
  where r.relation_type = 'spouse'
)
insert into public.family_units (id, name, generation)
select
  'u_sp_' || sp.a || '__' || sp.b as id,
  coalesce(m1.name, sp.a) || ' / ' || coalesce(m2.name, sp.b) as name,
  least(coalesce(m1.generation, 999), coalesce(m2.generation, 999)) as generation
from spouse_pairs sp
left join public.members m1 on m1.id = sp.a
left join public.members m2 on m2.id = sp.b
on conflict (id) do update
set
  name = excluded.name,
  generation = excluded.generation;

with spouse_pairs as (
  select distinct
    least(r.from_member_id, r.to_member_id) as a,
    greatest(r.from_member_id, r.to_member_id) as b
  from public.relationships r
  where r.relation_type = 'spouse'
)
insert into public.family_unit_members (unit_id, member_id, role)
select
  'u_sp_' || sp.a || '__' || sp.b as unit_id,
  sp.a as member_id,
  'partner1' as role
from spouse_pairs sp
on conflict (member_id) do update set unit_id = excluded.unit_id, role = excluded.role;

with spouse_pairs as (
  select distinct
    least(r.from_member_id, r.to_member_id) as a,
    greatest(r.from_member_id, r.to_member_id) as b
  from public.relationships r
  where r.relation_type = 'spouse'
)
insert into public.family_unit_members (unit_id, member_id, role)
select
  'u_sp_' || sp.a || '__' || sp.b as unit_id,
  sp.b as member_id,
  'partner2' as role
from spouse_pairs sp
on conflict (member_id) do update set unit_id = excluded.unit_id, role = excluded.role;

-- 2) Create single-member units for people not in any spouse pair
insert into public.family_units (id, name, generation)
select
  'u_single_' || m.id as id,
  m.name as name,
  m.generation
from public.members m
where not exists (
  select 1
  from public.family_unit_members fum
  where fum.member_id = m.id
)
on conflict (id) do update
set
  name = excluded.name,
  generation = excluded.generation;

insert into public.family_unit_members (unit_id, member_id, role)
select
  'u_single_' || m.id as unit_id,
  m.id as member_id,
  'single' as role
from public.members m
where not exists (
  select 1
  from public.family_unit_members fum
  where fum.member_id = m.id
)
on conflict (member_id) do update set unit_id = excluded.unit_id, role = excluded.role;

-- This migration intentionally does NOT generate any unit_relations.
-- Users build unit-to-unit links manually in the editor.

commit;

-- Verification helpers:
-- select count(*) as members_count from public.members;
-- select count(*) as units_count from public.family_units;
-- select count(*) as unit_members_count from public.family_unit_members;
-- select relation_type, count(*) from public.unit_relations group by relation_type order by relation_type;
