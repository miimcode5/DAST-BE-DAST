-- Migration 2: RLS policies, security guards, public feed view, workflow RPCs, stats & kindness chain

-- 1. Timestamp trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists help_requests_set_updated_at on public.help_requests;
create trigger help_requests_set_updated_at
  before update on public.help_requests
  for each row execute function public.set_updated_at();

drop trigger if exists volunteer_responses_set_updated_at on public.volunteer_responses;
create trigger volunteer_responses_set_updated_at
  before update on public.volunteer_responses
  for each row execute function public.set_updated_at();

-- 2. Auth signup trigger: auto-create profile row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'کاربر دست‌به‌دست'
  );
  if char_length(v_name) < 2 then
    v_name := 'کاربر دست‌به‌دست';
  end if;
  v_name := left(v_name, 80);

  insert into public.profiles (id, display_name, province, city, neighborhood)
  values (
    new.id,
    v_name,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'province'), ''), 'خراسان جنوبی'),
    nullif(btrim(new.raw_user_meta_data ->> 'city'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'neighborhood'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Security guard triggers (prevent direct tampering with protected fields/statuses)
create or replace function public.guard_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'تغییر شناسه کاربر مجاز نیست.' using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    raise exception 'تغییر نقش کاربری مجاز نیست.' using errcode = '42501';
  end if;

  if new.completed_helps_count is distinct from old.completed_helps_count then
    raise exception 'تغییر مستقیم تعداد کمک‌های تأییدشده مجاز نیست.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_protected_fields on public.profiles;
create trigger profiles_guard_protected_fields
  before update on public.profiles
  for each row execute function public.guard_profile_protected_fields();

create or replace function public.guard_help_request_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  if old.user_id <> auth.uid() then
    raise exception 'شما اجازه ویرایش درخواست دیگران را ندارید.' using errcode = '42501';
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'تغییر مالک درخواست مجاز نیست.' using errcode = '42501';
  end if;

  if new.status is distinct from old.status or new.completed_at is distinct from old.completed_at then
    raise exception 'تغییر وضعیت درخواست فقط از طریق عملیات رسمی پلتفرم مجاز است.' using errcode = '42501';
  end if;

  if old.status in ('completed', 'cancelled') then
    raise exception 'درخواست تکمیل‌شده یا لغوشده قابل ویرایش نیست.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists help_requests_guard_update on public.help_requests;
create trigger help_requests_guard_update
  before update on public.help_requests
  for each row execute function public.guard_help_request_update();

create or replace function public.guard_volunteer_response_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  raise exception 'تغییر وضعیت اعلام آمادگی فقط از طریق عملیات مجاز سیستم انجام می‌شود.' using errcode = '42501';
end;
$$;

drop trigger if exists volunteer_responses_guard_update on public.volunteer_responses;
create trigger volunteer_responses_guard_update
  before update on public.volunteer_responses
  for each row execute function public.guard_volunteer_response_update();

-- 4. Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.help_requests enable row level security;
alter table public.volunteer_responses enable row level security;
alter table public.saved_requests enable row level security;

-- profiles policies
create policy profiles_select_public
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles for insert
  to authenticated
  with check (
    id = auth.uid()
    and role = 'member'
    and completed_helps_count = 0
  );

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- help_requests policies
create policy help_requests_select_public
  on public.help_requests for select
  to anon, authenticated
  using (true);

create policy help_requests_insert_own
  on public.help_requests for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'open'
    and completed_at is null
  );

create policy help_requests_update_own
  on public.help_requests for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy help_requests_delete_own
  on public.help_requests for delete
  to authenticated
  using (
    user_id = auth.uid()
    and status = 'open'
    and not exists (
      select 1
      from public.volunteer_responses vr
      where vr.request_id = help_requests.id
        and vr.status in ('accepted', 'in_progress', 'completed')
    )
  );

-- volunteer_responses policies
create policy volunteer_responses_select_involved
  on public.volunteer_responses for select
  to authenticated
  using (
    volunteer_id = auth.uid()
    or exists (
      select 1
      from public.help_requests h
      where h.id = volunteer_responses.request_id
        and h.user_id = auth.uid()
    )
  );

create policy volunteer_responses_insert_valid
  on public.volunteer_responses for insert
  to authenticated
  with check (
    volunteer_id = auth.uid()
    and status = 'pending'
    and volunteer_confirmed = false
    and requester_confirmed = false
    and exists (
      select 1
      from public.help_requests h
      where h.id = volunteer_responses.request_id
        and h.user_id <> auth.uid()
        and (
          h.status = 'open'
          or (h.status = 'in_progress' and h.help_type = 'group_activity')
        )
    )
  );

create policy volunteer_responses_update_involved
  on public.volunteer_responses for update
  to authenticated
  using (
    volunteer_id = auth.uid()
    or exists (
      select 1
      from public.help_requests h
      where h.id = volunteer_responses.request_id
        and h.user_id = auth.uid()
    )
  )
  with check (
    volunteer_id = auth.uid()
    or exists (
      select 1
      from public.help_requests h
      where h.id = volunteer_responses.request_id
        and h.user_id = auth.uid()
    )
  );

-- saved_requests policies
create policy saved_requests_select_own
  on public.saved_requests for select
  to authenticated
  using (user_id = auth.uid());

create policy saved_requests_insert_own
  on public.saved_requests for insert
  to authenticated
  with check (user_id = auth.uid());

create policy saved_requests_delete_own
  on public.saved_requests for delete
  to authenticated
  using (user_id = auth.uid());

-- 5. Safe public feed view (includes requester public info + anonymized response count)
create or replace view public.public_help_requests_feed as
select
  h.id,
  h.user_id,
  h.title,
  h.description,
  h.category,
  h.help_type,
  h.province,
  h.city,
  h.area,
  h.needed_at,
  h.image_url,
  h.status,
  h.completed_at,
  h.created_at,
  h.updated_at,
  p.display_name as requester_name,
  p.avatar_url as requester_avatar,
  p.completed_helps_count as requester_completed_helps,
  (
    select count(*)::integer
    from public.volunteer_responses vr
    where vr.request_id = h.id
      and vr.status in ('pending', 'accepted', 'in_progress', 'completed')
  ) as responses_count
from public.help_requests h
join public.profiles p on p.id = h.user_id;

grant select on public.public_help_requests_feed to anon, authenticated;

-- 6. Workflow RPCs

create or replace function public.submit_volunteer_response(
  p_request_id uuid,
  p_message text default null
)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.help_requests;
  v_existing public.volunteer_responses;
  v_clean_msg text;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'برای اعلام آمادگی ابتدا وارد حساب کاربری شوید.' using errcode = '42501';
  end if;

  select * into v_req
  from public.help_requests
  where id = p_request_id
  for share;

  if not found then
    raise exception 'درخواست موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  if v_req.user_id = v_uid then
    raise exception 'شما نمی‌توانید برای درخواست خودتان اعلام آمادگی کنید.' using errcode = '42501';
  end if;

  if not (v_req.status = 'open' or (v_req.status = 'in_progress' and v_req.help_type = 'group_activity')) then
    raise exception 'این درخواست در حال حاضر امکان ثبت اعلام آمادگی جدید ندارد.' using errcode = 'P0001';
  end if;

  v_clean_msg := nullif(btrim(coalesce(p_message, '')), '');
  if v_clean_msg is not null and char_length(v_clean_msg) > 1000 then
    raise exception 'پیام شما نباید بیش از ۱۰۰۰ کاراکتر باشد.' using errcode = '22001';
  end if;

  select * into v_existing
  from public.volunteer_responses
  where request_id = p_request_id
    and volunteer_id = v_uid
  for update;

  if found then
    if v_existing.status <> 'cancelled' then
      raise exception 'شما قبلاً برای این درخواست اعلام آمادگی کرده‌اید.' using errcode = '23505';
    end if;

    perform set_config('dast.trusted', 'on', true);
    update public.volunteer_responses
    set
      message = v_clean_msg,
      status = 'pending',
      volunteer_confirmed = false,
      requester_confirmed = false,
      updated_at = now()
    where id = v_existing.id
    returning * into v_result;

    return v_result;
  end if;

  insert into public.volunteer_responses (request_id, volunteer_id, message, status)
  values (p_request_id, v_uid, v_clean_msg, 'pending')
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.withdraw_volunteer_response(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_remaining integer;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  if v_vr.volunteer_id <> v_uid then
    raise exception 'فقط خود داوطلب می‌تواند اعلام آمادگی‌اش را لغو کند.' using errcode = '42501';
  end if;

  if v_vr.status not in ('pending', 'accepted') then
    raise exception 'در این وضعیت امکان لغو اعلام آمادگی وجود ندارد.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set status = 'cancelled', updated_at = now()
  where id = p_response_id
  returning * into v_result;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id
  for update;

  if found and v_req.status = 'in_progress' then
    select count(*)::integer into v_remaining
    from public.volunteer_responses
    where request_id = v_req.id
      and status in ('accepted', 'in_progress');

    if v_remaining = 0 then
      update public.help_requests
      set status = 'open', updated_at = now()
      where id = v_req.id;
    end if;
  end if;

  return v_result;
end;
$$;

create or replace function public.accept_volunteer_response(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی یافت نشد.' using errcode = 'P0002';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id
  for update;

  if v_req.user_id <> v_uid then
    raise exception 'فقط صاحب درخواست می‌تواند داوطلب را بپذیرد.' using errcode = '42501';
  end if;

  if v_req.status not in ('open', 'in_progress') then
    raise exception 'امکان پذیرش داوطلب برای درخواست بسته وجود ندارد.' using errcode = 'P0001';
  end if;

  if v_vr.status <> 'pending' then
    raise exception 'فقط اعلام آمادگی‌های در انتظار بررسی قابل پذیرش هستند.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set status = 'accepted', updated_at = now()
  where id = p_response_id
  returning * into v_result;

  if v_req.status = 'open' then
    update public.help_requests
    set status = 'in_progress', updated_at = now()
    where id = v_req.id;
  end if;

  return v_result;
end;
$$;

create or replace function public.reject_volunteer_response(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_remaining integer;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی یافت نشد.' using errcode = 'P0002';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id
  for update;

  if v_req.user_id <> v_uid then
    raise exception 'فقط صاحب درخواست می‌تواند اعلام آمادگی را رد کند.' using errcode = '42501';
  end if;

  if v_vr.status not in ('pending', 'accepted') then
    raise exception 'در این وضعیت امکان رد اعلام آمادگی وجود ندارد.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set status = 'rejected', updated_at = now()
  where id = p_response_id
  returning * into v_result;

  if v_req.status = 'in_progress' then
    select count(*)::integer into v_remaining
    from public.volunteer_responses
    where request_id = v_req.id
      and status in ('accepted', 'in_progress');

    if v_remaining = 0 then
      update public.help_requests
      set status = 'open', updated_at = now()
      where id = v_req.id;
    end if;
  end if;

  return v_result;
end;
$$;

create or replace function public.start_volunteer_response(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی یافت نشد.' using errcode = 'P0002';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id;

  if v_vr.volunteer_id <> v_uid and v_req.user_id <> v_uid then
    raise exception 'دسترسی غیرمجاز.' using errcode = '42501';
  end if;

  if v_vr.status <> 'accepted' then
    raise exception 'فقط همکاری پذیرفته‌شده قابل شروع است.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set status = 'in_progress', updated_at = now()
  where id = p_response_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.mark_volunteer_done(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی یافت نشد.' using errcode = 'P0002';
  end if;

  if v_vr.volunteer_id <> v_uid then
    raise exception 'فقط داوطلب مربوطه می‌تواند این اقدام را ثبت کند.' using errcode = '42501';
  end if;

  if v_vr.status not in ('accepted', 'in_progress') then
    raise exception 'در این وضعیت امکان ثبت اتمام کمک وجود ندارد.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set
    volunteer_confirmed = true,
    status = 'in_progress',
    updated_at = now()
  where id = p_response_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.confirm_help_completion(p_response_id uuid)
returns public.volunteer_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_result public.volunteer_responses;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id
  for update;

  if not found then
    raise exception 'اعلام آمادگی یافت نشد.' using errcode = 'P0002';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id
  for update;

  if v_req.user_id <> v_uid then
    raise exception 'فقط ثبت‌کننده درخواست می‌تواند تکمیل کمک را تأیید کند.' using errcode = '42501';
  end if;

  if v_vr.status not in ('accepted', 'in_progress') then
    raise exception 'فقط همکاری در جریان قابل تأیید نهایی است.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.volunteer_responses
  set
    status = 'completed',
    requester_confirmed = true,
    updated_at = now()
  where id = p_response_id
  returning * into v_result;

  update public.help_requests
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    updated_at = now()
  where id = v_req.id;

  update public.profiles
  set completed_helps_count = completed_helps_count + 1
  where id = v_vr.volunteer_id;

  return v_result;
end;
$$;

create or replace function public.cancel_help_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.help_requests;
  v_result public.help_requests;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_req
  from public.help_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'درخواست یافت نشد.' using errcode = 'P0002';
  end if;

  if v_req.user_id <> v_uid then
    raise exception 'فقط صاحب درخواست می‌تواند آن را لغو کند.' using errcode = '42501';
  end if;

  if v_req.status = 'completed' then
    raise exception 'درخواست تکمیل‌شده قابل لغو نیست.' using errcode = 'P0001';
  end if;

  if v_req.status = 'cancelled' then
    return v_req;
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.help_requests
  set status = 'cancelled', updated_at = now()
  where id = p_request_id
  returning * into v_result;

  update public.volunteer_responses
  set status = 'cancelled', updated_at = now()
  where request_id = p_request_id
    and status in ('pending', 'accepted', 'in_progress');

  return v_result;
end;
$$;

create or replace function public.reopen_help_request(p_request_id uuid)
returns public.help_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_req public.help_requests;
  v_result public.help_requests;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_req
  from public.help_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'درخواست یافت نشد.' using errcode = 'P0002';
  end if;

  if v_req.user_id <> v_uid then
    raise exception 'فقط صاحب درخواست می‌تواند آن را بازگشایی کند.' using errcode = '42501';
  end if;

  if v_req.status <> 'cancelled' then
    raise exception 'فقط درخواست لغوشده قابل بازگشایی است.' using errcode = 'P0001';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.help_requests
  set status = 'open', updated_at = now()
  where id = p_request_id
  returning * into v_result;

  return v_result;
end;
$$;

-- 7. Real-time stats & Kindness Chain RPCs
create or replace function public.get_platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total_requests', (select count(*)::integer from public.help_requests),
    'active_requests', (select count(*)::integer from public.help_requests where status in ('open', 'in_progress')),
    'completed_helps', (select count(*)::integer from public.help_requests where status = 'completed'),
    'active_volunteers', (
      select count(distinct volunteer_id)::integer
      from public.volunteer_responses
      where status in ('pending', 'accepted', 'in_progress', 'completed')
    ),
    'verified_participations', (
      select count(*)::integer
      from public.volunteer_responses
      where status = 'completed' and requester_confirmed = true
    ),
    'active_cities', (select count(distinct city)::integer from public.help_requests)
  );
$$;

create or replace function public.get_kindness_chain()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with verified as (
    select
      vr.id as response_id,
      vr.request_id,
      vr.volunteer_id as helper_id,
      hp.display_name as helper_name,
      hp.avatar_url as helper_avatar,
      h.user_id as recipient_id,
      rp.display_name as recipient_name,
      rp.avatar_url as recipient_avatar,
      h.title as request_title,
      h.category,
      h.help_type,
      h.city,
      coalesce(h.completed_at, vr.updated_at) as completed_at
    from public.volunteer_responses vr
    join public.help_requests h on h.id = vr.request_id
    join public.profiles hp on hp.id = vr.volunteer_id
    join public.profiles rp on rp.id = h.user_id
    where vr.status = 'completed'
      and vr.requester_confirmed = true
  ),
  helpers_set as (
    select distinct helper_id from verified
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'verified_helps', (select count(*)::integer from verified),
      'unique_helpers', (select count(distinct helper_id)::integer from verified),
      'unique_recipients', (select count(distinct recipient_id)::integer from verified),
      'connected_chains', (
        select count(*)::integer
        from verified v
        where exists (select 1 from helpers_set hs where hs.helper_id = v.recipient_id)
      ),
      'cities_count', (select count(distinct city)::integer from verified)
    ),
    'links', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'response_id', v.response_id,
            'request_id', v.request_id,
            'request_title', v.request_title,
            'category', v.category,
            'help_type', v.help_type,
            'city', v.city,
            'completed_at', v.completed_at,
            'helper_id', v.helper_id,
            'helper_name', v.helper_name,
            'helper_avatar', v.helper_avatar,
            'recipient_id', v.recipient_id,
            'recipient_name', v.recipient_name,
            'recipient_avatar', v.recipient_avatar,
            'chain_continued', exists (select 1 from helpers_set hs where hs.helper_id = v.recipient_id)
          )
          order by v.completed_at desc
        )
        from (select * from verified order by completed_at desc limit 30) v
      ),
      '[]'::jsonb
    )
  );
$$;

-- Grant RPC executions
grant execute on function public.submit_volunteer_response(uuid, text) to authenticated;
grant execute on function public.withdraw_volunteer_response(uuid) to authenticated;
grant execute on function public.accept_volunteer_response(uuid) to authenticated;
grant execute on function public.reject_volunteer_response(uuid) to authenticated;
grant execute on function public.start_volunteer_response(uuid) to authenticated;
grant execute on function public.mark_volunteer_done(uuid) to authenticated;
grant execute on function public.confirm_help_completion(uuid) to authenticated;
grant execute on function public.cancel_help_request(uuid) to authenticated;
grant execute on function public.reopen_help_request(uuid) to authenticated;
grant execute on function public.get_platform_stats() to anon, authenticated;
grant execute on function public.get_kindness_chain() to anon, authenticated;

-- 8. Ensure storage update policy exists on request-images
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'request_images_owner_update'
  ) then
    create policy request_images_owner_update
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'request-images'
        and (storage.foldername(name))[1] = (auth.uid())::text
      );
  end if;
end
$$;
