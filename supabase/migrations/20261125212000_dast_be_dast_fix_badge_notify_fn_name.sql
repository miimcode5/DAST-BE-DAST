-- Fix internal notification helper call name inside evaluate_and_award_achievements()
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
