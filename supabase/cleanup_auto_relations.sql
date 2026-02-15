-- Remove migration-generated unit relations.
-- Safe to run repeatedly.

delete from public.unit_relations
where id like 'ur_pc_%' or id like 'ur_sb_%';

