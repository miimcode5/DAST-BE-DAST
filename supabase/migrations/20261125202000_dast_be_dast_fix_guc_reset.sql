-- Reset local session flags immediately after trusted internal operations
-- so subsequent calls within the same transaction never inherit stale settings.

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
    perform set_config('dast.trusted', 'off', true);
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
  perform set_config('dast.trusted', 'off', true);

  if v_clean_msg is not null then
    perform set_config('dast.skip_message_notify', 'on', true);
    insert into public.messages (conversation_id, sender_id, content)
    values (v_conv.id, v_uid, v_clean_msg);
    perform set_config('dast.skip_message_notify', 'off', true);
  end if;

  return v_result;
end;
$$;
