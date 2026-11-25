-- =====================================================================
-- DAST BE DAST V1.0 - Real Notifications, User Blocking, Content Moderation & RLS Privacy Hardening
-- Non-destructive, additive, and reversible migration preserving all live user data.
-- =====================================================================

-- 1) Persistent User Notifications Table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
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
    'account_security'
  )),
  title text not null check (char_length(btrim(title)) between 2 and 160),
  body text not null check (char_length(btrim(body)) between 2 and 500),
  link_path text null,
  request_id uuid null references public.help_requests(id) on delete cascade,
  conversation_id uuid null references public.conversations(id) on delete cascade,
  response_id uuid null references public.volunteer_responses(id) on delete cascade,
  actor_id uuid null references public.profiles(id) on delete set null,
  read_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, read_at)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Lock direct client changes to any field on notifications except read_at
create or replace function public.guard_notification_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.link_path is distinct from old.link_path
     or new.request_id is distinct from old.request_id
     or new.conversation_id is distinct from old.conversation_id
     or new.response_id is distinct from old.response_id
     or new.actor_id is distinct from old.actor_id
     or new.created_at is distinct from old.created_at then
    raise exception 'فقط وضعیت خوانده‌شدن اعلان قابل تغییر است.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_notification_update on public.notifications;
create trigger trg_guard_notification_update
  before update on public.notifications
  for each row
  execute function public.guard_notification_update();

-- 2) User Blocking Table (database-enforced safety boundary)
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  reason text null check (reason is null or char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_id <> blocked_id),
  constraint user_blocks_unique_pair unique (blocker_id, blocked_id)
);

create index if not exists idx_user_blocks_blocker on public.user_blocks(blocker_id);
create index if not exists idx_user_blocks_blocked on public.user_blocks(blocked_id);

alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select_own on public.user_blocks;
create policy user_blocks_select_own
  on public.user_blocks
  for select
  to authenticated
  using (blocker_id = auth.uid());

drop policy if exists user_blocks_insert_own on public.user_blocks;
create policy user_blocks_insert_own
  on public.user_blocks
  for insert
  to authenticated
  with check (blocker_id = auth.uid() and blocker_id <> blocked_id);

drop policy if exists user_blocks_delete_own on public.user_blocks;
create policy user_blocks_delete_own
  on public.user_blocks
  for delete
  to authenticated
  using (blocker_id = auth.uid());

-- 3) General Content / User Violation Reports Table
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('request', 'profile', 'response')),
  target_id uuid not null,
  reported_user_id uuid null references public.profiles(id) on delete set null,
  reason text not null check (reason in (
    'privacy_violation',
    'spam_or_commercial',
    'inappropriate_content',
    'suspicious_or_fraud',
    'wrong_category',
    'other'
  )),
  details text null check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  constraint content_reports_unique_per_target unique (reporter_id, target_type, target_id)
);

create index if not exists idx_content_reports_status on public.content_reports(status, created_at desc);

alter table public.content_reports enable row level security;

-- Helper function: true only for genuine database-assigned moderators/admins
create or replace function public.is_moderator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('moderator', 'admin')
  );
$$;

drop policy if exists content_reports_select_own_or_mod on public.content_reports;
create policy content_reports_select_own_or_mod
  on public.content_reports
  for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_moderator_or_admin());

drop policy if exists content_reports_update_mod on public.content_reports;
create policy content_reports_update_mod
  on public.content_reports
  for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- Also allow verified database admins/moderators to review conversation_reports securely
drop policy if exists conversation_reports_select_mod on public.conversation_reports;
create policy conversation_reports_select_mod
  on public.conversation_reports
  for select
  to authenticated
  using (public.is_moderator_or_admin());

drop policy if exists conversation_reports_update_mod on public.conversation_reports;
create policy conversation_reports_update_mod
  on public.conversation_reports
  for update
  to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- 4) Privacy hardening on public.profiles: prevent unauthenticated (anon) scraping of neighborhoods/skills
revoke select on public.profiles from anon;
grant select on public.profiles to authenticated;

drop policy if exists profiles_select_public on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

-- 5) Helper functions for user blocking & notification creation
create or replace function public.is_user_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create or replace function public.create_app_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_link_path text default null,
  p_request_id uuid default null,
  p_conversation_id uuid default null,
  p_response_id uuid default null,
  p_actor_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link_path,
    request_id,
    conversation_id,
    response_id,
    actor_id
  )
  values (
    p_user_id,
    p_type,
    left(btrim(p_title), 160),
    left(btrim(p_body), 500),
    p_link_path,
    p_request_id,
    p_conversation_id,
    p_response_id,
    p_actor_id
  );
end;
$$;

-- 6) Automatic Notification Triggers (Server-side, tamper-proof)

-- 6a) New user welcome notification
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

  perform public.create_app_notification(
    new.id,
    'account_welcome',
    'به شبکه همیاری دست‌به‌دست خوش آمدید',
    'برای یافتن همیاری‌های نزدیک‌تر، شهر، محدوده و مهارت‌های خود را در پروفایل تکمیل کنید.',
    '/profile/edit',
    null,
    null,
    null,
    null
  );

  return new;
end;
$$;

-- 6b) New volunteer offer notification
create or replace function public.notify_on_volunteer_response_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.help_requests;
  v_vol_name text;
begin
  select * into v_req from public.help_requests where id = new.request_id;
  if not found then
    return new;
  end if;

  select display_name into v_vol_name from public.profiles where id = new.volunteer_id;
  v_vol_name := coalesce(v_vol_name, 'یک داوطلب');

  perform public.create_app_notification(
    v_req.user_id,
    'new_offer',
    'اعلام آمادگی جدید برای درخواست شما',
    v_vol_name || ' برای «' || left(v_req.title, 70) || '» اعلام آمادگی کرد.',
    '/requests/' || v_req.id::text,
    v_req.id,
    null,
    new.id,
    new.volunteer_id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_volunteer_response_insert on public.volunteer_responses;
create trigger trg_notify_volunteer_response_insert
  after insert on public.volunteer_responses
  for each row
  execute function public.notify_on_volunteer_response_insert();

-- 6c) Status transition notifications on volunteer_responses
create or replace function public.notify_on_volunteer_response_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req public.help_requests;
  v_vol_name text;
  v_req_name text;
  v_conv_id uuid;
begin
  select * into v_req from public.help_requests where id = new.request_id;
  if not found then
    return new;
  end if;

  select display_name into v_vol_name from public.profiles where id = new.volunteer_id;
  select display_name into v_req_name from public.profiles where id = v_req.user_id;
  v_vol_name := coalesce(v_vol_name, 'داوطلب');
  v_req_name := coalesce(v_req_name, 'درخواست‌کننده');

  select id into v_conv_id
  from public.conversations
  where request_id = v_req.id and volunteer_id = new.volunteer_id
  limit 1;

  -- Re-submitted offer after previous withdrawal
  if old.status = 'cancelled' and new.status = 'pending' then
    perform public.create_app_notification(
      v_req.user_id,
      'new_offer',
      'اعلام آمادگی جدید برای درخواست شما',
      v_vol_name || ' دوباره برای «' || left(v_req.title, 70) || '» اعلام آمادگی کرد.',
      '/requests/' || v_req.id::text,
      v_req.id,
      v_conv_id,
      new.id,
      new.volunteer_id
    );
    return new;
  end if;

  -- Accepted by requester
  if old.status = 'pending' and new.status = 'accepted' then
    perform public.create_app_notification(
      new.volunteer_id,
      'offer_accepted',
      'اعلام آمادگی شما پذیرفته شد',
      v_req_name || ' اعلام آمادگی شما را برای «' || left(v_req.title, 70) || '» پذیرفت.',
      case when v_conv_id is not null then '/messages/' || v_conv_id::text else '/requests/' || v_req.id::text end,
      v_req.id,
      v_conv_id,
      new.id,
      v_req.user_id
    );
    return new;
  end if;

  -- Rejected by requester
  if old.status = 'pending' and new.status = 'rejected' then
    perform public.create_app_notification(
      new.volunteer_id,
      'offer_rejected',
      'به‌روزرسانی وضعیت اعلام آمادگی',
      'درخواست «' || left(v_req.title, 70) || '» توسط ثبت‌کننده با داوطلب دیگری پیش رفت یا بسته شد.',
      '/my-activities',
      v_req.id,
      v_conv_id,
      new.id,
      v_req.user_id
    );
    return new;
  end if;

  -- Volunteer marked done (waiting for requester confirmation)
  if new.volunteer_confirmed = true and old.volunteer_confirmed = false and new.status <> 'completed' then
    perform public.create_app_notification(
      v_req.user_id,
      'volunteer_done',
      'داوطلب پایان کمک را اعلام کرد',
      v_vol_name || ' اعلام کرد همکاری برای «' || left(v_req.title, 65) || '» انجام شده است؛ لطفاً تأیید نهایی کنید.',
      '/requests/' || v_req.id::text,
      v_req.id,
      v_conv_id,
      new.id,
      new.volunteer_id
    );
    return new;
  end if;

  -- Started in_progress
  if old.status = 'accepted' and new.status = 'in_progress' then
    perform public.create_app_notification(
      v_req.user_id,
      'help_started',
      'فرآیند همکاری آغاز شد',
      v_vol_name || ' انجام درخواست «' || left(v_req.title, 70) || '» را در حال انجام ثبت کرد.',
      '/requests/' || v_req.id::text,
      v_req.id,
      v_conv_id,
      new.id,
      new.volunteer_id
    );
    return new;
  end if;

  -- Completed & verified
  if old.status <> 'completed' and new.status = 'completed' then
    perform public.create_app_notification(
      new.volunteer_id,
      'help_completed',
      'همیاری شما تأیید و در زنجیره مهربانی ثبت شد',
      'کمک شما برای «' || left(v_req.title, 70) || '» توسط ' || v_req_name || ' تأیید نهایی شد.',
      '/kindness-chain',
      v_req.id,
      v_conv_id,
      new.id,
      v_req.user_id
    );

    perform public.create_app_notification(
      v_req.user_id,
      'help_completed',
      'تکمیل همیاری ثبت شد',
      'کمک برای «' || left(v_req.title, 70) || '» با موفقیت به پایان رسید و در زنجیره مهربانی ثبت شد.',
      '/kindness-chain',
      v_req.id,
      v_conv_id,
      new.id,
      new.volunteer_id
    );
    return new;
  end if;

  -- Cancelled: distinguish request cancellation vs volunteer withdrawal
  if old.status in ('pending', 'accepted', 'in_progress') and new.status = 'cancelled' then
    if v_req.status = 'cancelled' then
      perform public.create_app_notification(
        new.volunteer_id,
        'request_cancelled',
        'درخواست کمک لغو شد',
        'درخواست «' || left(v_req.title, 75) || '» توسط ثبت‌کننده لغو شد.',
        '/requests/' || v_req.id::text,
        v_req.id,
        v_conv_id,
        new.id,
        v_req.user_id
      );
    else
      perform public.create_app_notification(
        v_req.user_id,
        'offer_withdrawn',
        'انصراف داوطلب از اعلام آمادگی',
        v_vol_name || ' اعلام آمادگی خود را برای «' || left(v_req.title, 70) || '» لغو کرد.',
        '/requests/' || v_req.id::text,
        v_req.id,
        v_conv_id,
        new.id,
        new.volunteer_id
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_volunteer_response_update on public.volunteer_responses;
create trigger trg_notify_volunteer_response_update
  after update on public.volunteer_responses
  for each row
  execute function public.notify_on_volunteer_response_update();

-- 6d) Smart chat message notification (merges unread notification per conversation to avoid spam)
create or replace function public.notify_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_recipient_id uuid;
  v_sender_name text;
  v_req_title text;
  v_existing_id uuid;
begin
  if coalesce(current_setting('dast.skip_message_notify', true), 'off') = 'on' then
    return new;
  end if;

  select * into v_conv from public.conversations where id = new.conversation_id;
  if not found then
    return new;
  end if;

  v_recipient_id := case
    when new.sender_id = v_conv.requester_id then v_conv.volunteer_id
    else v_conv.requester_id
  end;

  select display_name into v_sender_name from public.profiles where id = new.sender_id;
  select title into v_req_title from public.help_requests where id = v_conv.request_id;
  v_sender_name := coalesce(v_sender_name, 'کاربر');
  v_req_title := coalesce(v_req_title, 'درخواست کمک');

  select id into v_existing_id
  from public.notifications
  where user_id = v_recipient_id
    and type = 'new_message'
    and conversation_id = v_conv.id
    and read_at is null
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    perform set_config('dast.trusted', 'on', true);
    update public.notifications
    set
      title = 'پیام جدید از ' || left(v_sender_name, 60),
      body = left(v_req_title, 45) || ': ' || left(new.content, 120),
      actor_id = new.sender_id,
      created_at = now()
    where id = v_existing_id;
    perform set_config('dast.trusted', 'off', true);
  else
    perform public.create_app_notification(
      v_recipient_id,
      'new_message',
      'پیام جدید از ' || left(v_sender_name, 60),
      left(v_req_title, 45) || ': ' || left(new.content, 120),
      '/messages/' || v_conv.id::text,
      v_conv.request_id,
      v_conv.id,
      v_conv.response_id,
      new.sender_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_message_insert on public.messages;
create trigger trg_notify_message_insert
  after insert on public.messages
  for each row
  execute function public.notify_on_message_insert();

-- 7) Upgrade chat & volunteer functions to enforce user_blocks + auto-clear message notifications on read

create or replace function public.mark_conversation_messages_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_updated integer;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_conv
  from public.conversations
  where id = p_conversation_id;

  if not found then
    raise exception 'گفت‌وگو یافت نشد.' using errcode = 'P0002';
  end if;

  if v_conv.requester_id <> v_uid and v_conv.volunteer_id <> v_uid then
    raise exception 'شما اجازه دسترسی به این گفت‌وگو را ندارید.' using errcode = '42501';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> v_uid
    and read_at is null;

  get diagnostics v_updated = row_count;

  -- Mark unread chat notification for this conversation as read automatically
  update public.notifications
  set read_at = now()
  where user_id = v_uid
    and type = 'new_message'
    and conversation_id = p_conversation_id
    and read_at is null;

  return v_updated;
end;
$$;

create or replace function public.validate_and_prepare_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conv public.conversations;
  v_req public.help_requests;
  v_resp public.volunteer_responses;
  v_uid uuid := auth.uid();
  v_trimmed text;
begin
  v_trimmed := btrim(coalesce(new.content, ''));
  if char_length(v_trimmed) < 1 then
    raise exception 'متن پیام نمی‌تواند خالی باشد.' using errcode = '23514';
  end if;
  if char_length(v_trimmed) > 2000 then
    raise exception 'طول پیام نباید بیش از ۲۰۰۰ کاراکتر باشد.' using errcode = '22001';
  end if;

  new.content := v_trimmed;
  new.read_at := null;

  select * into v_conv
  from public.conversations
  where id = new.conversation_id;

  if not found then
    raise exception 'گفت‌وگوی موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  if v_uid is not null and coalesce(current_setting('dast.trusted', true), 'off') <> 'on' then
    if new.sender_id <> v_uid then
      raise exception 'امکان ارسال پیام به نام کاربر دیگر وجود ندارد.' using errcode = '42501';
    end if;
  end if;

  if new.sender_id <> v_conv.requester_id and new.sender_id <> v_conv.volunteer_id then
    raise exception 'فقط درخواست‌کننده و داوطلب این گفت‌وگو اجازه ارسال پیام دارند.' using errcode = '42501';
  end if;

  if public.is_user_blocked_between(v_conv.requester_id, v_conv.volunteer_id) then
    raise exception 'به دلیل مسدودسازی کاربری، امکان ارسال پیام در این گفت‌وگو وجود ندارد.' using errcode = '42501';
  end if;

  if v_uid is null and coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  if v_conv.status <> 'active' then
    raise exception 'این گفت‌وگو بسته یا تکمیل شده است و امکان ارسال پیام جدید وجود ندارد.' using errcode = 'P0001';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_conv.request_id;

  if not found or v_req.status not in ('open', 'in_progress') then
    raise exception 'به دلیل تکمیل یا لغو شدن درخواست، امکان ارسال پیام جدید وجود ندارد.' using errcode = 'P0001';
  end if;

  if v_conv.response_id is not null then
    select * into v_resp
    from public.volunteer_responses
    where id = v_conv.response_id;

    if not found or v_resp.status not in ('pending', 'accepted', 'in_progress') then
      raise exception 'به دلیل وضعیت فعلی اعلام آمادگی، ارسال پیام در این گفت‌وگو مجاز نیست.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.submit_volunteer_response(p_request_id uuid, p_message text default null)
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
  v_conv public.conversations;
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

  if public.is_user_blocked_between(v_uid, v_req.user_id) then
    raise exception 'امکان ثبت اعلام آمادگی برای این کاربر به دلیل محدودیت ارتباطی وجود ندارد.' using errcode = '42501';
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
  else
    insert into public.volunteer_responses (request_id, volunteer_id, message, status)
    values (p_request_id, v_uid, v_clean_msg, 'pending')
    returning * into v_result;
  end if;

  perform set_config('dast.trusted', 'on', true);
  insert into public.conversations (request_id, response_id, requester_id, volunteer_id, status)
  values (p_request_id, v_result.id, v_req.user_id, v_uid, 'active')
  on conflict (request_id, volunteer_id) do update
    set
      response_id = excluded.response_id,
      status = 'active',
      updated_at = now()
  returning * into v_conv;

  if v_clean_msg is not null then
    perform set_config('dast.skip_message_notify', 'on', true);
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conv.id, v_uid, v_clean_msg);
  end if;

  return v_result;
end;
$$;

create or replace function public.ensure_conversation_for_response(p_response_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_vr public.volunteer_responses;
  v_req public.help_requests;
  v_status text;
  v_conv public.conversations;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  select * into v_vr
  from public.volunteer_responses
  where id = p_response_id;

  if not found then
    raise exception 'اعلام آمادگی موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  select * into v_req
  from public.help_requests
  where id = v_vr.request_id;

  if not found then
    raise exception 'درخواست مرتبط یافت نشد.' using errcode = 'P0002';
  end if;

  if v_uid <> v_req.user_id and v_uid <> v_vr.volunteer_id then
    raise exception 'شما اجازه دسترسی به این گفت‌وگو را ندارید.' using errcode = '42501';
  end if;

  select * into v_conv
  from public.conversations
  where request_id = v_req.id
    and volunteer_id = v_vr.volunteer_id;

  if found then
    return v_conv;
  end if;

  if public.is_user_blocked_between(v_req.user_id, v_vr.volunteer_id) then
    raise exception 'به دلیل مسدودسازی کاربری امکان ایجاد گفت‌وگو وجود ندارد.' using errcode = '42501';
  end if;

  v_status := case
    when v_vr.status = 'completed' or v_req.status = 'completed' then 'completed'
    when v_vr.status = 'cancelled' or v_req.status = 'cancelled' then 'cancelled'
    when v_vr.status = 'rejected' then 'closed'
    else 'active'
  end;

  perform set_config('dast.trusted', 'on', true);

  insert into public.conversations (request_id, response_id, requester_id, volunteer_id, status)
  values (v_req.id, v_vr.id, v_req.user_id, v_vr.volunteer_id, v_status)
  on conflict (request_id, volunteer_id) do update
    set updated_at = public.conversations.updated_at
  returning * into v_conv;

  return v_conv;
end;
$$;

-- 8) Public RPCs for Notifications, Blocking, Content Reporting & Moderation

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notifications
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notifications;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id
    and user_id = v_uid
  returning * into v_row;

  if not found then
    raise exception 'اعلان موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  perform set_config('dast.trusted', 'on', true);

  update public.notifications
  set read_at = now()
  where user_id = v_uid
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.get_unread_notifications_count()
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return 0;
  end if;

  return (
    select count(*)::integer
    from public.notifications
    where user_id = v_uid
      and read_at is null
  );
end;
$$;

create or replace function public.record_password_changed_notification()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.notifications
    where user_id = v_uid
      and type = 'account_security'
      and created_at > now() - interval '2 minutes'
  ) then
    return;
  end if;

  perform public.create_app_notification(
    v_uid,
    'account_security',
    'رمز عبور حساب کاربری تغییر یافت',
    'رمز عبور حساب دست‌به‌دست شما با موفقیت به‌روزرسانی شد.',
    '/settings',
    null,
    null,
    null,
    v_uid
  );
end;
$$;

create or replace function public.block_user(p_blocked_user_id uuid, p_reason text default null)
returns public.user_blocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clean_reason text;
  v_block public.user_blocks;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  if p_blocked_user_id is null or p_blocked_user_id = v_uid then
    raise exception 'امکان مسدود کردن این شناسه کاربری وجود ندارد.' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = p_blocked_user_id) then
    raise exception 'کاربر موردنظر یافت نشد.' using errcode = 'P0002';
  end if;

  v_clean_reason := nullif(btrim(coalesce(p_reason, '')), '');
  if v_clean_reason is not null and char_length(v_clean_reason) > 300 then
    v_clean_reason := left(v_clean_reason, 300);
  end if;

  insert into public.user_blocks (blocker_id, blocked_id, reason)
  values (v_uid, p_blocked_user_id, v_clean_reason)
  on conflict (blocker_id, blocked_id) do update
    set reason = coalesce(excluded.reason, public.user_blocks.reason)
  returning * into v_block;

  -- Close any active conversations between blocker and blocked user
  perform set_config('dast.trusted', 'on', true);
  update public.conversations
  set status = 'closed', updated_at = now()
  where status = 'active'
    and (
      (requester_id = v_uid and volunteer_id = p_blocked_user_id)
      or (requester_id = p_blocked_user_id and volunteer_id = v_uid)
    );

  return v_block;
end;
$$;

create or replace function public.unblock_user(p_blocked_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted integer;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  delete from public.user_blocks
  where blocker_id = v_uid
    and blocked_id = p_blocked_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.get_block_status_with(p_other_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_blocked_by_me boolean := false;
  v_blocked_by_other boolean := false;
begin
  if v_uid is null or p_other_user_id is null then
    return jsonb_build_object('blocked_by_me', false, 'blocked_by_other', false, 'any_block', false);
  end if;

  select exists (
    select 1 from public.user_blocks
    where blocker_id = v_uid and blocked_id = p_other_user_id
  ) into v_blocked_by_me;

  select exists (
    select 1 from public.user_blocks
    where blocker_id = p_other_user_id and blocked_id = v_uid
  ) into v_blocked_by_other;

  return jsonb_build_object(
    'blocked_by_me', v_blocked_by_me,
    'blocked_by_other', v_blocked_by_other,
    'any_block', (v_blocked_by_me or v_blocked_by_other)
  );
end;
$$;

create or replace function public.get_my_blocked_users()
returns table (
  id uuid,
  blocked_id uuid,
  display_name text,
  avatar_url text,
  city text,
  reason text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  return query
  select
    b.id,
    b.blocked_id,
    p.display_name,
    p.avatar_url,
    p.city,
    b.reason,
    b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = v_uid
  order by b.created_at desc;
end;
$$;

create or replace function public.submit_content_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text,
  p_details text default null
)
returns public.content_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_reported_user_id uuid;
  v_clean_details text;
  v_row public.content_reports;
begin
  if v_uid is null then
    raise exception 'احراز هویت الزامی است.' using errcode = '42501';
  end if;

  if p_target_type not in ('request', 'profile', 'response') then
    raise exception 'نوع هدف گزارش معتبر نیست.' using errcode = '22023';
  end if;

  if p_target_type = 'request' then
    select user_id into v_reported_user_id
    from public.help_requests
    where id = p_target_id;
    if not found then
      raise exception 'درخواست موردنظر یافت نشد.' using errcode = 'P0002';
    end if;
  elsif p_target_type = 'profile' then
    select id into v_reported_user_id
    from public.profiles
    where id = p_target_id;
    if not found then
      raise exception 'پروفایل موردنظر یافت نشد.' using errcode = 'P0002';
    end if;
  else
    select volunteer_id into v_reported_user_id
    from public.volunteer_responses
    where id = p_target_id;
    if not found then
      raise exception 'اعلام آمادگی موردنظر یافت نشد.' using errcode = 'P0002';
    end if;
  end if;

  if v_reported_user_id = v_uid then
    raise exception 'امکان ثبت گزارش علیه مورد متعلق به خودتان وجود ندارد.' using errcode = '42501';
  end if;

  v_clean_details := nullif(btrim(coalesce(p_details, '')), '');
  if v_clean_details is not null and char_length(v_clean_details) > 1000 then
    raise exception 'توضیحات گزارش نباید بیش از ۱۰۰۰ کاراکتر باشد.' using errcode = '22001';
  end if;

  insert into public.content_reports (
    reporter_id,
    target_type,
    target_id,
    reported_user_id,
    reason,
    details
  )
  values (
    v_uid,
    p_target_type,
    p_target_id,
    v_reported_user_id,
    p_reason,
    v_clean_details
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.get_moderation_reports()
returns table (
  report_kind text,
  report_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reporter_name text,
  reported_user_name text,
  target_type text,
  target_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_moderator_or_admin() then
    raise exception 'شما مجوز دسترسی به پنل نظارت و گزارش‌ها را ندارید.' using errcode = '42501';
  end if;

  return query
  select
    'conversation'::text as report_kind,
    cr.id as report_id,
    cr.reason,
    cr.details,
    cr.status,
    cr.created_at,
    coalesce(rep.display_name, 'کاربر') as reporter_name,
    coalesce(tgt.display_name, 'کاربر') as reported_user_name,
    'conversation'::text as target_type,
    cr.conversation_id as target_id
  from public.conversation_reports cr
  left join public.profiles rep on rep.id = cr.reporter_id
  left join public.profiles tgt on tgt.id = cr.reported_user_id

  union all

  select
    'content'::text as report_kind,
    ct.id as report_id,
    ct.reason,
    ct.details,
    ct.status,
    ct.created_at,
    coalesce(rep.display_name, 'کاربر') as reporter_name,
    coalesce(tgt.display_name, 'کاربر') as reported_user_name,
    ct.target_type,
    ct.target_id
  from public.content_reports ct
  left join public.profiles rep on rep.id = ct.reporter_id
  left join public.profiles tgt on tgt.id = ct.reported_user_id

  order by created_at desc;
end;
$$;

create or replace function public.update_moderation_report_status(
  p_report_kind text,
  p_report_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer := 0;
begin
  if auth.uid() is null or not public.is_moderator_or_admin() then
    raise exception 'شما مجوز تغییر وضعیت گزارش‌ها را ندارید.' using errcode = '42501';
  end if;

  if p_report_kind = 'conversation' then
    if p_status not in ('open', 'reviewed', 'resolved') then
      raise exception 'وضعیت معتبر نیست.' using errcode = '22023';
    end if;
    update public.conversation_reports
    set status = p_status
    where id = p_report_id;
    get diagnostics v_updated = row_count;
  elsif p_report_kind = 'content' then
    if p_status not in ('open', 'reviewed', 'resolved', 'dismissed') then
      raise exception 'وضعیت معتبر نیست.' using errcode = '22023';
    end if;
    update public.content_reports
    set status = p_status
    where id = p_report_id;
    get diagnostics v_updated = row_count;
  else
    raise exception 'نوع گزارش معتبر نیست.' using errcode = '22023';
  end if;

  return v_updated > 0;
end;
$$;

-- 9) Grants & Realtime Publication
grant select, update, delete on public.notifications to authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select on public.content_reports to authenticated;

revoke all on function public.create_app_notification(uuid, text, text, text, text, uuid, uuid, uuid, uuid) from public;
grant execute on function public.is_moderator_or_admin() to authenticated;
grant execute on function public.is_user_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_unread_notifications_count() to authenticated;
grant execute on function public.record_password_changed_notification() to authenticated;
grant execute on function public.block_user(uuid, text) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.get_block_status_with(uuid) to authenticated;
grant execute on function public.get_my_blocked_users() to authenticated;
grant execute on function public.submit_content_report(text, uuid, text, text) to authenticated;
grant execute on function public.get_moderation_reports() to authenticated;
grant execute on function public.update_moderation_report_status(text, uuid, text) to authenticated;

alter table public.notifications replica identity full;
alter table public.user_blocks replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_blocks'
  ) then
    alter publication supabase_realtime add table public.user_blocks;
  end if;
end;
$$;
