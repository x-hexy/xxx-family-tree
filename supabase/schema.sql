-- XY Family Tree - Supabase schema
-- Run this in Supabase SQL editor.

create table if not exists public.members (
  id text primary key,
  name text not null,
  title text,
  birth_year integer,
  generation integer,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.relationships (
  id text primary key,
  from_member_id text not null references public.members(id) on delete cascade,
  to_member_id text not null references public.members(id) on delete cascade,
  relation_type text not null check (relation_type in ('parent', 'child', 'spouse', 'sibling')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_settings (
  id integer primary key,
  token text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

insert into public.share_settings (id, token, enabled)
values (1, substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), true)
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_members_updated_at on public.members;
create trigger trg_members_updated_at
before update on public.members
for each row execute function public.set_updated_at();

drop trigger if exists trg_relationships_updated_at on public.relationships;
create trigger trg_relationships_updated_at
before update on public.relationships
for each row execute function public.set_updated_at();

drop trigger if exists trg_share_settings_updated_at on public.share_settings;
create trigger trg_share_settings_updated_at
before update on public.share_settings
for each row execute function public.set_updated_at();

-- Create avatar storage bucket (public read, authenticated write)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

