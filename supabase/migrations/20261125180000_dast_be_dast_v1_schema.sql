-- Migration 1: Clean v1 core schema for Dast Be Dast (دست‌به‌دست)
-- Preserves existing auth.users and profiles while aligning schema to MVP specification

-- 1. Drop legacy views and obsolete experiment tables
drop view if exists public.public_stats cascade;
drop view if exists public.public_requests cascade;
drop view if exists public.public_events cascade;

drop table if exists public.request_events cascade;
drop table if exists public.help_requests cascade;

-- 2. Drop legacy unused functions
drop function if exists public.accept_offer cascade;
drop function if exists public.accept_request cascade;
drop function if exists public.apply_points cascade;
drop function if exists public.assert_geo_chain cascade;
drop function if exists public.award_badge cascade;
drop function if exists public.block_user cascade;
drop function if exists public.confirm_completion cascade;
drop function if exists public.decide_request cascade;
drop function if exists public.expire_stale_requests cascade;
drop function if exists public.get_kindness_chain cascade;
drop function if exists public.get_public_stats cascade;
drop function if exists public.guard_profile_role cascade;
drop function if exists public.guard_request_change cascade;
drop function if exists public.is_admin cascade;
drop function if exists public.is_moderator cascade;
drop function if exists public.log_request_event cascade;
drop function if exists public.mark_help_done cascade;
drop function if exists public.normalize_fa cascade;
drop function if exists public.recompute_badges cascade;
drop function if exists public.record_request_view cascade;
drop function if exists public.refresh_request_counters cascade;
drop function if exists public.reject_offer cascade;
drop function if exists public.release_request cascade;
drop function if exists public.resolve_request cascade;
drop function if exists public.submit_report cascade;
drop function if exists public.unblock_user cascade;
drop function if exists public.withdraw_offer cascade;

-- 3. Drop legacy policies and triggers on profiles
drop trigger if exists profiles_guard_role on public.profiles;
drop trigger if exists profiles_set_updated_at on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
drop policy if exists profiles_update_own_or_admin on public.profiles;

-- 4. Upgrade profiles table in-place to preserve existing user(s)
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists province text not null default 'خراسان جنوبی',
  add column if not exists city text,
  add column if not exists neighborhood text,
  add column if not exists skills text[] not null default '{}'::text[],
  add column if not exists completed_helps_count integer not null default 0;

update public.profiles
set
  display_name = coalesce(nullif(btrim(display_name), ''), nullif(btrim(full_name), ''), 'کاربر دست‌به‌دست'),
  city = coalesce(city, nullif(btrim(county), ''))
where display_name is null or city is null;

alter table public.profiles
  drop column if exists full_name,
  drop column if exists phone,
  drop column if exists county;

alter table public.profiles
  alter column role drop default;

alter table public.profiles
  alter column role type text using (
    case
      when role::text = 'admin' then 'admin'
      else 'member'
    end
  ),
  alter column role set default 'member',
  alter column role set not null,
  alter column display_name set not null;

-- Drop obsolete enum types
drop type if exists public.account_status cascade;
drop type if exists public.help_category cascade;
drop type if exists public.notification_type cascade;
drop type if exists public.offer_status cascade;
drop type if exists public.point_reason cascade;
drop type if exists public.report_reason cascade;
drop type if exists public.report_status cascade;
drop type if exists public.report_target cascade;
drop type if exists public.request_category cascade;
drop type if exists public.request_status cascade;
drop type if exists public.urgency_level cascade;
drop type if exists public.user_role cascade;

-- Add constraints to profiles
alter table public.profiles
  drop constraint if exists profiles_display_name_len,
  drop constraint if exists profiles_bio_len,
  drop constraint if exists profiles_city_len,
  drop constraint if exists profiles_neighborhood_len,
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_completed_helps_nonneg;

alter table public.profiles
  add constraint profiles_display_name_len check (char_length(btrim(display_name)) between 2 and 80),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 500),
  add constraint profiles_city_len check (city is null or char_length(btrim(city)) <= 80),
  add constraint profiles_neighborhood_len check (neighborhood is null or char_length(btrim(neighborhood)) <= 120),
  add constraint profiles_role_check check (role in ('member', 'moderator', 'admin')),
  add constraint profiles_completed_helps_nonneg check (completed_helps_count >= 0);

-- 5. Create help_requests table
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title text not null,
  description text not null,
  category text not null,
  help_type text not null,
  province text not null default 'خراسان جنوبی',
  city text not null,
  area text not null,
  needed_at text not null,
  image_url text,
  status text not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint help_requests_title_len check (char_length(btrim(title)) between 5 and 140),
  constraint help_requests_description_len check (char_length(btrim(description)) between 15 and 3000),
  constraint help_requests_category_check check (
    category in ('daily', 'education', 'repair', 'donation', 'elderly', 'voluntary', 'urgent', 'specialized')
  ),
  constraint help_requests_type_check check (
    help_type in ('service', 'education', 'donation', 'companionship', 'group_activity')
  ),
  constraint help_requests_province_len check (char_length(btrim(province)) between 2 and 80),
  constraint help_requests_city_len check (char_length(btrim(city)) between 2 and 80),
  constraint help_requests_area_len check (char_length(btrim(area)) between 2 and 120),
  constraint help_requests_needed_at_len check (char_length(btrim(needed_at)) between 2 and 120),
  constraint help_requests_status_check check (status in ('open', 'in_progress', 'completed', 'cancelled'))
);

-- 6. Create volunteer_responses table
create table public.volunteer_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  volunteer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending',
  volunteer_confirmed boolean not null default false,
  requester_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_responses_message_len check (message is null or char_length(message) <= 1000),
  constraint volunteer_responses_status_check check (
    status in ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled')
  ),
  constraint volunteer_responses_unique_pair unique (request_id, volunteer_id)
);

-- 7. Create saved_requests table
create table public.saved_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  request_id uuid not null references public.help_requests(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_requests_unique_pair unique (user_id, request_id)
);

-- 8. Create indexes for search & performance
create index idx_help_requests_status_created on public.help_requests (status, created_at desc);
create index idx_help_requests_category on public.help_requests (category);
create index idx_help_requests_help_type on public.help_requests (help_type);
create index idx_help_requests_city on public.help_requests (city);
create index idx_help_requests_user_id on public.help_requests (user_id);
create index idx_help_requests_search on public.help_requests using gin (
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, '') || ' ' || coalesce(area, ''))
);

create index idx_volunteer_responses_request_id on public.volunteer_responses (request_id);
create index idx_volunteer_responses_volunteer_id on public.volunteer_responses (volunteer_id);
create index idx_volunteer_responses_status on public.volunteer_responses (status);

create index idx_saved_requests_user_id on public.saved_requests (user_id);
create index idx_saved_requests_request_id on public.saved_requests (request_id);
