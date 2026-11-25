-- Migration 4: Real-time Private Chat (conversations, messages, reports, RLS, triggers, RPCs, Realtime)

-- 1. Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  response_id uuid references public.volunteer_responses(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  last_message_preview text,
  last_message_at timestamptz,
  last_message_sender_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_status_check check (status in ('active', 'completed', 'cancelled', 'closed')),
  constraint conversations_distinct_participants check (requester_id <> volunteer_id),
  constraint conversations_unique_request_volunteer unique (request_id, volunteer_id),
  constraint conversations_unique_response unique (response_id)
);

-- 2. Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  content text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_content_len check (char_length(btrim(content)) between 1 and 2000)
);

-- 3. Create conversation_reports table (for reporting inappropriate users/chats)
create table if not exists public.conversation_reports (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  reporter_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint conversation_reports_reason_check check (
    reason in ('harassment', 'privacy_violation', 'spam', 'fraud', 'other')
  ),
  constraint conversation_reports_details_len check (
    details is null or char_length(btrim(details)) <= 1000
  ),
  constraint conversation_reports_status_check check (status in ('open', 'reviewed', 'resolved')),
  constraint conversation_reports_distinct_users check (reporter_id <> reported_user_id),
  constraint conversation_reports_unique_pair unique (conversation_id, reporter_id)
);

-- 4. Indexes for chat performance & pagination
create index if not exists idx_conversations_requester_sort
  on public.conversations (requester_id, last_message_at desc nulls last, created_at desc);

create index if not exists idx_conversations_volunteer_sort
  on public.conversations (volunteer_id, last_message_at desc nulls last, created_at desc);

create index if not exists idx_conversations_request_id
  on public.conversations (request_id);

create index if not exists idx_messages_conversation_created
  on public.messages (conversation_id, created_at desc, id desc);

create index if not exists idx_messages_unread_lookup
  on public.messages (conversation_id, sender_id)
  where read_at is null;

create index if not exists idx_conversation_reports_conv
  on public.conversation_reports (conversation_id);

-- 5. Timestamp & Guard Triggers
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create or replace function public.guard_conversation_update()
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

  raise exception 'تغییر مستقیم وضعیت یا شرکت‌کنندگان گفت‌وگو مجاز نیست.' using errcode = '42501';
end;
$$;

drop trigger if exists conversations_guard_update on public.conversations;
create trigger conversations_guard_update
  before update on public.conversations
  for each row execute function public.guard_conversation_update();

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

drop trigger if exists messages_before_insert on public.messages;
create trigger messages_before_insert
  before insert on public.messages
  for each row execute function public.validate_and_prepare_message_insert();

create or replace function public.sync_conversation_on_message_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview text;
begin
  v_preview := left(regexp_replace(new.content, E'[\\r\\n\\t]+', ' ', 'g'), 140);

  perform set_config('dast.trusted', 'on', true);

  update public.conversations
  set
    last_message_preview = v_preview,
    last_message_at = new.created_at,
    last_message_sender_id = new.sender_id,
    updated_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
  after insert on public.messages
  for each row execute function public.sync_conversation_on_message_insert();

create or replace function public.guard_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
begin
  if new.id is distinct from old.id
     or new.conversation_id is distinct from old.conversation_id
     or new.sender_id is distinct from old.sender_id
     or new.content is distinct from old.content
     or new.created_at is distinct from old.created_at then
    raise exception 'ویرایش متن یا اطلاعات فرستنده پیام مجاز نیست.' using errcode = '42501';
  end if;

  if v_uid is null then
    return new;
  end if;

  if coalesce(current_setting('dast.trusted', true), 'off') = 'on' then
    return new;
  end if;

  select * into v_conv
  from public.conversations
  where id = old.conversation_id;

  if not found or (v_conv.requester_id <> v_uid and v_conv.volunteer_id <> v_uid) then
    raise exception 'دسترسی به این گفت‌وگو مجاز نیست.' using errcode = '42501';
  end if;

  if old.sender_id = v_uid then
    raise exception 'شما نمی‌توانید وضعیت خوانده‌شدن پیام خودتان را تغییر دهید.' using errcode = '42501';
  end if;

  if old.read_at is not null and new.read_at is distinct from old.read_at then
    raise exception 'زمان خوانده‌شدن پیام قبلاً ثبت شده است.' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists messages_guard_update on public.messages;
create trigger messages_guard_update
  before update on public.messages
  for each row execute function public.guard_message_update();

create or replace function public.guard_message_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('dast.trusted', true), 'off') <> 'on' then
    raise exception 'حذف پیام‌ها مجاز نیست.' using errcode = '42501';
  end if;
  return old;
end;
$$;

drop trigger if exists messages_guard_delete on public.messages;
create trigger messages_guard_delete
  before delete on public.messages
  for each row execute function public.guard_message_delete();

-- 6. Row Level Security (RLS)
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reports enable row level security;

drop policy if exists conversations_select_participants on public.conversations;
create policy conversations_select_participants
  on public.conversations for select
  to authenticated
  using (requester_id = auth.uid() or volunteer_id = auth.uid());

drop policy if exists messages_select_participants on public.messages;
create policy messages_select_participants
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.requester_id = auth.uid() or c.volunteer_id = auth.uid())
    )
  );

drop policy if exists messages_insert_participants on public.messages;
create policy messages_insert_participants
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and read_at is null
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.requester_id = auth.uid() or c.volunteer_id = auth.uid())
        and c.status = 'active'
    )
  );

drop policy if exists messages_update_mark_read on public.messages;
create policy messages_update_mark_read
  on public.messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.requester_id = auth.uid() or c.volunteer_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (c.requester_id = auth.uid() or c.volunteer_id = auth.uid())
    )
  );

drop policy if exists conversation_reports_select_own on public.conversation_reports;
create policy conversation_reports_select_own
  on public.conversation_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists conversation_reports_insert_participant on public.conversation_reports;
create policy conversation_reports_insert_participant
  on public.conversation_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_reports.conversation_id
        and (
          (c.requester_id = auth.uid() and reported_user_id = c.volunteer_id)
          or (c.volunteer_id = auth.uid() and reported_user_id = c.requester_id)
        )
    )
  );

-- 7. Synchronize existing workflow RPCs with private conversations

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

  -- Create or reactivate private conversation for this exact (request, volunteer) pair
  perform set_config('dast.trusted', 'on', true);
  insert into public.conversations (request_id, response_id, requester_id, volunteer_id, status)
  values (p_request_id, v_result.id, v_req.user_id, v_uid, 'active')
  on conflict (request_id, volunteer_id) do update
    set
      response_id = excluded.response_id,
      status = 'active',
      updated_at = now()
  returning * into v_conv;

  -- If the volunteer included an initial note, also place it in the private conversation
  if v_clean_msg is not null then
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conv.id, v_uid, v_clean_msg);
  end if;

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

  update public.conversations
  set status = 'cancelled', updated_at = now()
  where (response_id = p_response_id or (request_id = v_vr.request_id and volunteer_id = v_vr.volunteer_id))
    and status = 'active';

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

  update public.conversations
  set status = 'closed', updated_at = now()
  where (response_id = p_response_id or (request_id = v_vr.request_id and volunteer_id = v_vr.volunteer_id))
    and status = 'active';

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

  -- Mark the completed volunteer's conversation completed and close other active conversations on this request
  update public.conversations
  set status = 'completed', updated_at = now()
  where response_id = p_response_id
     or (request_id = v_req.id and volunteer_id = v_vr.volunteer_id);

  update public.conversations
  set status = 'closed', updated_at = now()
  where request_id = v_req.id
    and volunteer_id <> v_vr.volunteer_id
    and status = 'active';

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

  update public.conversations
  set status = 'cancelled', updated_at = now()
  where request_id = p_request_id
    and status = 'active';

  return v_result;
end;
$$;

-- 8. Dedicated Chat RPCs

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

create or replace function public.send_chat_message(
  p_conversation_id uuid,
  p_content text
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.messages;
begin
  if v_uid is null then
    raise exception 'برای ارسال پیام وارد حساب کاربری شوید.' using errcode = '42501';
  end if;

  insert into public.messages (conversation_id, sender_id, content)
  values (p_conversation_id, v_uid, p_content)
  returning * into v_msg;

  return v_msg;
end;
$$;

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
  return v_updated;
end;
$$;

create or replace function public.get_my_conversations()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    return '[]'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(row_data order by sort_ts desc),
    '[]'::jsonb
  )
  into v_result
  from (
    select
      coalesce(c.last_message_at, c.created_at) as sort_ts,
      jsonb_build_object(
        'id', c.id,
        'request_id', c.request_id,
        'response_id', c.response_id,
        'requester_id', c.requester_id,
        'volunteer_id', c.volunteer_id,
        'status', c.status,
        'last_message_preview', c.last_message_preview,
        'last_message_at', c.last_message_at,
        'last_message_sender_id', c.last_message_sender_id,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'request_title', h.title,
        'request_status', h.status,
        'request_category', h.category,
        'request_city', h.city,
        'response_status', vr.status,
        'other_user_id', other_p.id,
        'other_user_name', other_p.display_name,
        'other_user_avatar', other_p.avatar_url,
        'other_user_city', other_p.city,
        'other_user_completed_helps', other_p.completed_helps_count,
        'unread_count', (
          select count(*)::integer
          from public.messages m
          where m.conversation_id = c.id
            and m.sender_id <> v_uid
            and m.read_at is null
        )
      ) as row_data
    from public.conversations c
    join public.help_requests h on h.id = c.request_id
    left join public.volunteer_responses vr on vr.id = c.response_id
    join public.profiles other_p
      on other_p.id = case when c.requester_id = v_uid then c.volunteer_id else c.requester_id end
    where c.requester_id = v_uid or c.volunteer_id = v_uid
  ) sub;

  return v_result;
end;
$$;

create or replace function public.get_conversation_details(p_conversation_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_result jsonb;
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
    raise exception 'شما اجازه مشاهده این گفت‌وگو را ندارید.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', c.id,
    'request_id', c.request_id,
    'response_id', c.response_id,
    'requester_id', c.requester_id,
    'volunteer_id', c.volunteer_id,
    'status', c.status,
    'last_message_preview', c.last_message_preview,
    'last_message_at', c.last_message_at,
    'last_message_sender_id', c.last_message_sender_id,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'request_title', h.title,
    'request_status', h.status,
    'request_category', h.category,
    'request_city', h.city,
    'response_status', vr.status,
    'other_user_id', other_p.id,
    'other_user_name', other_p.display_name,
    'other_user_avatar', other_p.avatar_url,
    'other_user_city', other_p.city,
    'other_user_completed_helps', other_p.completed_helps_count,
    'unread_count', (
      select count(*)::integer
      from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> v_uid
        and m.read_at is null
    )
  )
  into v_result
  from public.conversations c
  join public.help_requests h on h.id = c.request_id
  left join public.volunteer_responses vr on vr.id = c.response_id
  join public.profiles other_p
    on other_p.id = case when c.requester_id = v_uid then c.volunteer_id else c.requester_id end
  where c.id = p_conversation_id;

  return v_result;
end;
$$;

create or replace function public.get_total_unread_messages_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(count(*)::integer, 0)
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() is not null
    and (c.requester_id = auth.uid() or c.volunteer_id = auth.uid())
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;

create or replace function public.submit_conversation_report(
  p_conversation_id uuid,
  p_reason text,
  p_details text default null
)
returns public.conversation_reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_reported_id uuid;
  v_clean_details text;
  v_report public.conversation_reports;
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

  if v_conv.requester_id = v_uid then
    v_reported_id := v_conv.volunteer_id;
  elsif v_conv.volunteer_id = v_uid then
    v_reported_id := v_conv.requester_id;
  else
    raise exception 'فقط شرکت‌کنندگان گفت‌وگو مجاز به ثبت گزارش هستند.' using errcode = '42501';
  end if;

  v_clean_details := nullif(btrim(coalesce(p_details, '')), '');

  insert into public.conversation_reports (
    conversation_id,
    reporter_id,
    reported_user_id,
    reason,
    details
  )
  values (
    p_conversation_id,
    v_uid,
    v_reported_id,
    p_reason,
    v_clean_details
  )
  returning * into v_report;

  return v_report;
end;
$$;

-- 9. Grants (strictly authenticated only for chat RPCs)
revoke all on function public.ensure_conversation_for_response(uuid) from public, anon;
revoke all on function public.send_chat_message(uuid, text) from public, anon;
revoke all on function public.mark_conversation_messages_read(uuid) from public, anon;
revoke all on function public.get_my_conversations() from public, anon;
revoke all on function public.get_conversation_details(uuid) from public, anon;
revoke all on function public.get_total_unread_messages_count() from public, anon;
revoke all on function public.submit_conversation_report(uuid, text, text) from public, anon;

grant execute on function public.ensure_conversation_for_response(uuid) to authenticated;
grant execute on function public.send_chat_message(uuid, text) to authenticated;
grant execute on function public.mark_conversation_messages_read(uuid) to authenticated;
grant execute on function public.get_my_conversations() to authenticated;
grant execute on function public.get_conversation_details(uuid) to authenticated;
grant execute on function public.get_total_unread_messages_count() to authenticated;
grant execute on function public.submit_conversation_report(uuid, text, text) to authenticated;

-- 10. Backfill conversations for any pre-existing volunteer_responses
do $$
declare
  rec record;
  v_conv_id uuid;
  v_status text;
begin
  perform set_config('dast.trusted', 'on', true);

  for rec in
    select
      vr.id as response_id,
      vr.request_id,
      vr.volunteer_id,
      vr.message,
      vr.status as vr_status,
      vr.created_at,
      h.user_id as requester_id,
      h.status as req_status
    from public.volunteer_responses vr
    join public.help_requests h on h.id = vr.request_id
  loop
    v_status := case
      when rec.vr_status = 'completed' or rec.req_status = 'completed' then 'completed'
      when rec.vr_status = 'cancelled' or rec.req_status = 'cancelled' then 'cancelled'
      when rec.vr_status = 'rejected' then 'closed'
      else 'active'
    end;

    insert into public.conversations (request_id, response_id, requester_id, volunteer_id, status, created_at, updated_at)
    values (rec.request_id, rec.response_id, rec.requester_id, rec.volunteer_id, v_status, rec.created_at, rec.created_at)
    on conflict (request_id, volunteer_id) do nothing
    returning id into v_conv_id;

    if v_conv_id is not null and nullif(btrim(coalesce(rec.message, '')), '') is not null then
      insert into public.messages (conversation_id, sender_id, content, created_at)
      values (v_conv_id, rec.volunteer_id, btrim(rec.message), rec.created_at);
    end if;
  end loop;
end
$$;

-- 11. Enable Supabase Realtime for conversations and messages
alter table public.conversations replica identity full;
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;
