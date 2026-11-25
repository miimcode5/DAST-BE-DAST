-- ============================================================================
-- Dast Be Dast - Non-Monetary Achievements & Participation Points System
-- Safe, non-destructive, server-authoritative migration:
--   1. Adds profiles.participation_points (guarded against direct client tampering)
--   2. Creates badge_definitions & user_achievements tables with strict RLS
--   3. Extends notifications.type with 'badge_earned'
--   4. Creates server-only evaluate_and_award_achievements() invoked on help completion
--   5. Adds get_my_achievements_summary() RPC + idempotent backfill for verified helps
-- ============================================================================

-- 1. Protected participation_points column on profiles
alter table public.profiles
  add column if not exists participation_points integer not null default 0
  check (participation_points >= 0);

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

  if new.participation_points is distinct from old.participation_points then
    raise exception 'تغییر مستقیم امتیازات مشارکت مجاز نیست.' using errcode = '42501';
  end if;

  return new;
end;
$$;

-- 2. Extend notifications.type constraint with 'badge_earned'
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'new_message',
    'new_offer',
    'offer_accepted',
    'offer_rejected',
    'help_started',
    'volunteer_done',
    'help_completed',
    'request_cancelled',
    'offer_withdrawn',
    'account_welcome',
    'account_security',
    'badge_earned'
  ));

-- 3. Badge Catalog Table
create table if not exists public.badge_definitions (
  code text primary key,
  title_fa text not null,
  description_fa text not null,
  criteria_fa text not null,
  category_filter text,
  points integer not null check (points > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.badge_definitions (code, title_fa, description_fa, criteria_fa, category_filter, points, sort_order)
values
  (
    'first_helping_hand',
    'اولین دست یاری',
    'تکمیل اولین کمک تأییدشده در دست‌به‌دست',
    'تکمیل و تأیید دست‌کم ۱ همیاری واقعی توسط درخواست‌کننده',
    null,
    30,
    1
  ),
  (
    'neighborhood_heart',
    'قلب محله',
    'مشارکت فعال در فعالیت‌های گروهی و محله‌محور',
    'تکمیل ۱ همیاری در دسته فعالیت‌های داوطلبانه یا نوع همیاری گروهی',
    'voluntary',
    50,
    2
  ),
  (
    'skill_mentor',
    'همراه دانایی',
    'آموزش داوطلبانه یک درس یا مهارت',
    'تکمیل ۱ همیاری در دسته آموزش و یادگیری',
    'education',
    40,
    3
  ),
  (
    'kind_giver',
    'گره‌گشای مهربان',
    'اهدای کالای قابل استفاده به نیازمندان',
    'تکمیل ۱ همیاری در دسته اهدای وسایل یا اهدای کالا',
    'donation',
    20,
    4
  ),
  (
    'elderly_friend',
    'همدل سالمندان',
    'همراهی و یاری‌رسانی به سالمندان و کم‌توانان',
    'تکمیل ۱ همیاری تأییدشده در دسته کمک به سالمندان',
    'elderly',
    35,
    5
  ),
  (
    'technical_helper',
    'دست توانا',
    'انجام داوطلبانه تعمیرات و خدمات فنی یا تخصصی',
    'تکمیل ۱ همیاری در دسته تعمیرات یا خدمات تخصصی و مهارتی',
    'repair',
    35,
    6
  ),
  (
    'chain_builder',
    'زنجیره‌ساز',
    'ایجاد پیوند مؤثر و واقعی در زنجیره مهربانی',
    'ایجاد پیوند زنجیره‌ساز (دریافت کمک و یاری به دیگری، یا کمک به کسی که پیش‌تر یاری رسانده)',
    null,
    40,
    7
  ),
  (
    'steady_supporter',
    'یاور همیشگی',
    'استمرار مهربانی با تکمیل ۳ همیاری معتبر',
    'رسیدن به ۳ کمک تأییدشده و تکمیل‌شده در پلتفرم',
    null,
    60,
    8
  )
on conflict (code) do update
set
  title_fa = excluded.title_fa,
  description_fa = excluded.description_fa,
  criteria_fa = excluded.criteria_fa,
  category_filter = excluded.category_filter,
  points = excluded.points,
  sort_order = excluded.sort_order,
  is_active = true;

alter table public.badge_definitions enable row level security;

drop policy if exists "badge_definitions_select_all" on public.badge_definitions;
create policy "badge_definitions_select_all"
  on public.badge_definitions
  for select
  using (true);

grant select on public.badge_definitions to anon, authenticated;

-- 4. User Earned Achievements Table
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_code text not null references public.badge_definitions(code) on delete cascade,
  points_awarded integer not null check (points_awarded > 0),
  source_request_id uuid references public.help_requests(id) on delete set null,
  source_response_id uuid references public.volunteer_responses(id) on delete set null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

create index if not exists idx_user_achievements_user_awarded
  on public.user_achievements (user_id, awarded_at desc);

alter table public.user_achievements enable row level security;

revoke all on table public.user_achievements from anon;

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own"
  on public.user_achievements
  for select
  using (auth.uid() = user_id);

grant select on public.user_achievements to authenticated;

-- 5. Server-Authoritative Evaluator & Points Calculator
-- Base points: 20 per verified completed help + badge bonus points (once per badge).
create or replace function public.evaluate_and_award_achievements(
  p_user_id uuid,
  p_request_id uuid default null,
  p_response_id uuid default null,
  p_notify boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_verified_helps integer := 0;
  v_has_edu boolean := false;
  v_has_donation boolean := false;
  v_has_group boolean := false;
  v_has_elderly boolean := false;
  v_has_technical boolean := false;
  v_has_chain boolean := false;
  v_badge record;
  v_should_award boolean;
  v_inserted_id uuid;
  v_badge_points integer := 0;
  v_total_points integer := 0;
begin
  if p_user_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(bool_or(hr.category = 'education' or hr.help_type = 'education'), false),
    coalesce(bool_or(hr.category = 'donation' or hr.help_type = 'donation'), false),
    coalesce(bool_or(hr.category = 'voluntary' or hr.help_type = 'group_activity'), false),
    coalesce(bool_or(hr.category = 'elderly'), false),
    coalesce(bool_or(hr.category in ('repair', 'specialized')), false)
  into
    v_verified_helps,
    v_has_edu,
    v_has_donation,
    v_has_group,
    v_has_elderly,
    v_has_technical
  from public.volunteer_responses vr
  join public.help_requests hr on hr.id = vr.request_id
  where vr.volunteer_id = p_user_id
    and vr.status = 'completed'
    and vr.requester_confirmed = true;

  -- Check real kindness-chain connection:
  -- Either user received a verified help and then helped someone,
  -- OR user helped a recipient who had also completed a help for someone else.
  select exists (
    select 1
    from public.volunteer_responses vr
    join public.help_requests hr on hr.id = vr.request_id
    where vr.volunteer_id = p_user_id
      and vr.status = 'completed'
      and vr.requester_confirmed = true
      and (
        exists (
          select 1
          from public.volunteer_responses prev_received
          join public.help_requests prev_req on prev_req.id = prev_received.request_id
          where prev_req.user_id = p_user_id
            and prev_received.status = 'completed'
            and prev_received.requester_confirmed = true
        )
        or exists (
          select 1
          from public.volunteer_responses recipient_helped
          where recipient_helped.volunteer_id = hr.user_id
            and recipient_helped.status = 'completed'
            and recipient_helped.requester_confirmed = true
        )
      )
  ) into v_has_chain;

  for v_badge in
    select code, title_fa, points
    from public.badge_definitions
    where is_active = true
    order by sort_order asc
  loop
    v_should_award := case v_badge.code
      when 'first_helping_hand' then v_verified_helps >= 1
      when 'neighborhood_heart' then v_has_group
      when 'skill_mentor' then v_has_edu
      when 'kind_giver' then v_has_donation
      when 'elderly_friend' then v_has_elderly
      when 'technical_helper' then v_has_technical
      when 'chain_builder' then v_has_chain
      when 'steady_supporter' then v_verified_helps >= 3
      else false
    end;

    if v_should_award then
      v_inserted_id := null;
      insert into public.user_achievements (
        user_id,
        badge_code,
        points_awarded,
        source_request_id,
        source_response_id
      )
      values (
        p_user_id,
        v_badge.code,
        v_badge.points,
        p_request_id,
        p_response_id
      )
      on conflict (user_id, badge_code) do nothing
      returning id into v_inserted_id;

      if v_inserted_id is not null and p_notify then
        perform public.create_app_notification(
          p_user_id,
          'badge_earned',
          'نشان افتخار جدید: ' || v_badge.title_fa,
          'به پاس همیاری تأییدشده، نشان «' || v_badge.title_fa || '» همراه با ' || v_badge.points::text || ' امتیاز مشارکت به پروفایل شما اضافه شد.',
          '/profile',
          p_request_id,
          null,
          p_response_id,
          p_user_id
        );
      end if;
    end if;
  end loop;

  select coalesce(sum(points_awarded), 0)::integer
  into v_badge_points
  from public.user_achievements
  where user_id = p_user_id;

  v_total_points := (v_verified_helps * 20) + v_badge_points;

  perform set_config('dast.trusted', 'on', true);
  update public.profiles
  set
    completed_helps_count = greatest(completed_helps_count, v_verified_helps),
    participation_points = v_total_points,
    updated_at = now()
  where id = p_user_id;
  perform set_config('dast.trusted', 'off', true);
end;
$$;

revoke all on function public.evaluate_and_award_achievements(uuid, uuid, uuid, boolean) from public, anon, authenticated;

-- 6. Trigger achievement evaluation inside confirm_help_completion
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

  update public.conversations
  set status = 'completed', updated_at = now()
  where response_id = p_response_id
     or (request_id = v_req.id and volunteer_id = v_vr.volunteer_id);

  update public.conversations
  set status = 'closed', updated_at = now()
  where request_id = v_req.id
    and volunteer_id <> v_vr.volunteer_id
    and status = 'active';

  perform set_config('dast.trusted', 'off', true);

  -- Evaluate & award volunteer achievements + also re-evaluate recipient if they had prior helps (chain_builder)
  perform public.evaluate_and_award_achievements(v_vr.volunteer_id, v_req.id, v_result.id, true);
  perform public.evaluate_and_award_achievements(v_req.user_id, v_req.id, v_result.id, true);

  return v_result;
end;
$$;

grant execute on function public.confirm_help_completion(uuid) to authenticated;

-- 7. Client RPC: Get Full Achievements & Level Summary for Authenticated User
create or replace function public.get_my_achievements_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_points integer := 0;
  v_helps integer := 0;
  v_level_title text;
  v_level_number integer;
  v_next_points integer;
  v_next_title text;
  v_earned_count integer := 0;
  v_total_badges integer := 0;
  v_badges jsonb;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select coalesce(participation_points, 0), coalesce(completed_helps_count, 0)
  into v_points, v_helps
  from public.profiles
  where id = v_uid;

  if v_points >= 250 then
    v_level_number := 4;
    v_level_title := 'ستون مهربانی';
    v_next_points := null;
    v_next_title := null;
  elsif v_points >= 130 then
    v_level_number := 3;
    v_level_title := 'یاور معتمد محله';
    v_next_points := 250;
    v_next_title := 'ستون مهربانی';
  elsif v_points >= 50 then
    v_level_number := 2;
    v_level_title := 'همیار فعال';
    v_next_points := 130;
    v_next_title := 'یاور معتمد محله';
  else
    v_level_number := 1;
    v_level_title := 'همیار نوپا';
    v_next_points := 50;
    v_next_title := 'همیار فعال';
  end if;

  select
    count(*)::integer,
    count(*) filter (where ua.id is not null)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'code', bd.code,
          'title_fa', bd.title_fa,
          'description_fa', bd.description_fa,
          'criteria_fa', bd.criteria_fa,
          'category_filter', bd.category_filter,
          'points', bd.points,
          'earned', (ua.id is not null),
          'points_awarded', coalesce(ua.points_awarded, 0),
          'awarded_at', ua.awarded_at
        )
        order by (ua.id is not null) desc, bd.sort_order asc
      ),
      '[]'::jsonb
    )
  into v_total_badges, v_earned_count, v_badges
  from public.badge_definitions bd
  left join public.user_achievements ua
    on ua.badge_code = bd.code
   and ua.user_id = v_uid
  where bd.is_active = true;

  return jsonb_build_object(
    'participation_points', v_points,
    'completed_helps_count', v_helps,
    'level_number', v_level_number,
    'level_title', v_level_title,
    'next_level_points', v_next_points,
    'next_level_title', v_next_title,
    'earned_count', v_earned_count,
    'total_badges', v_total_badges,
    'badges', v_badges
  );
end;
$$;

revoke all on function public.get_my_achievements_summary() from public, anon;
grant execute on function public.get_my_achievements_summary() to authenticated;

-- 8. Safe One-Time Backfill for Existing Verified Completed Helps (without sending historical notifications)
do $$
declare
  v_user record;
begin
  for v_user in
    select distinct vr.volunteer_id as uid
    from public.volunteer_responses vr
    where vr.status = 'completed'
      and vr.requester_confirmed = true
  loop
    perform public.evaluate_and_award_achievements(v_user.uid, null, null, false);
  end loop;
end $$;
