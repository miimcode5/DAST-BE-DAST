import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present
if (fs.existsSync('.env.local')) {
  const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

assert(SUPABASE_URL && SUPABASE_ANON_KEY, 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');

function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const ts = Date.now();
const user1Email = `e2e.requester.${ts}@example.com`;
const user2Email = `e2e.volunteer.${ts}@example.com`;
const user3Email = `e2e.outsider.${ts}@example.com`;
const password = `DastTest#${ts}`;

async function run() {
  console.log('1. Checking anonymous guest access...');
  const anon = makeClient();
  const { data: statsBefore, error: statsErr } = await anon.rpc('get_platform_stats');
  assert.ifError(statsErr);
  assert(typeof statsBefore.total_requests === 'number');

  const { data: anonVr } = await anon.from('volunteer_responses').select('*');
  assert.equal((anonVr ?? []).length, 0, 'Anon must not read volunteer_responses');

  const { error: anonProfErr } = await anon.from('profiles').select('id').limit(1);
  assert(anonProfErr, 'Anon must NOT directly read profiles table');

  const { error: anonNotifErr } = await anon.from('notifications').select('id').limit(1);
  assert(anonNotifErr, 'Anon must NOT read notifications table');

  console.log('2. Signing up User 1 (Requester)...');
  const u1 = makeClient();
  const { data: s1, error: e1 } = await u1.auth.signUp({
    email: user1Email,
    password,
    options: {
      data: {
        display_name: 'کاربر تست اول',
        province: 'خراسان جنوبی',
        city: 'بیرجند',
        neighborhood: 'خیابان مدرس',
      },
    },
  });
  assert.ifError(e1);
  assert(s1.user && s1.session, 'User 1 signup should return active session');
  const u1Id = s1.user.id;

  console.log('3. Completing User 1 profile & verifying security guard against tampering...');
  const { data: p1, error: p1Err } = await u1
    .from('profiles')
    .update({ bio: 'تست درخواست‌کننده در بیرجند', skills: ['کارهای اداری'] })
    .eq('id', u1Id)
    .select()
    .single();
  assert.ifError(p1Err);
  assert.equal(p1.display_name, 'کاربر تست اول');

  const { error: tamperRoleErr } = await u1
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', u1Id);
  assert(tamperRoleErr, 'User 1 must NOT be able to promote self to admin');

  const { error: tamperCountErr } = await u1
    .from('profiles')
    .update({ completed_helps_count: 50 })
    .eq('id', u1Id);
  assert(tamperCountErr, 'User 1 must NOT be able to forge completed_helps_count');

  console.log('4. User 1 creates a help request...');
  const { data: req1, error: req1Err } = await u1
    .from('help_requests')
    .insert({
      user_id: u1Id,
      title: 'تست E2E: نیاز به همراهی برای خرید مایحتاج',
      description: 'این یک درخواست آزمایشی دو کاربره برای بررسی عملکرد واقعی دیتابیس است.',
      category: 'elderly',
      help_type: 'companionship',
      province: 'خراسان جنوبی',
      city: 'بیرجند',
      area: 'محدوده خیابان مدرس',
      needed_at: 'امروز عصر',
    })
    .select()
    .single();
  assert.ifError(req1Err);
  assert.equal(req1.status, 'open');

  console.log('5. Verifying User 1 cannot volunteer for own request...');
  const { error: selfOfferErr } = await u1.rpc('submit_volunteer_response', {
    p_request_id: req1.id,
    p_message: 'خودم',
  });
  assert(selfOfferErr, 'Owner must NOT be allowed to volunteer on own request');

  console.log('6. Signing up User 2 (Volunteer on second device)...');
  const u2 = makeClient();
  const { data: s2, error: e2 } = await u2.auth.signUp({
    email: user2Email,
    password,
    options: {
      data: {
        display_name: 'داوطلب تست دوم',
        province: 'خراسان جنوبی',
        city: 'بیرجند',
        neighborhood: 'شهرک بعثت',
      },
    },
  });
  assert.ifError(e2);
  assert(s2.user && s2.session, 'User 2 signup should return active session');
  const u2Id = s2.user.id;

  console.log('7. User 2 discovers User 1 request in public feed & saves it...');
  const { data: feedItems, error: feedErr } = await u2
    .from('public_help_requests_feed')
    .select('*')
    .eq('id', req1.id);
  assert.ifError(feedErr);
  assert.equal(feedItems.length, 1);
  assert.equal(feedItems[0].requester_name, 'کاربر تست اول');

  const { error: saveErr } = await u2
    .from('saved_requests')
    .insert({ user_id: u2Id, request_id: req1.id });
  assert.ifError(saveErr);

  const { error: dupSaveErr } = await u2
    .from('saved_requests')
    .insert({ user_id: u2Id, request_id: req1.id });
  assert(dupSaveErr, 'Duplicate saved_request must be rejected');

  console.log('8. Verifying User 2 CANNOT edit User 1 request...');
  const { data: hijackRows, error: hijackErr } = await u2
    .from('help_requests')
    .update({ title: 'هک شده' })
    .eq('id', req1.id)
    .select();
  assert(!hijackErr && (!hijackRows || hijackRows.length === 0), 'Non-owner must not update request');

  console.log('9. User 2 clicks "I can help" -> auto-creates private chat & blocks duplicate...');
  const { data: offer1, error: offer1Err } = await u2.rpc('submit_volunteer_response', {
    p_request_id: req1.id,
    p_message: 'سلام، عصر در محدوده مدرس هستم و می‌توانم همراهی کنم.',
  });
  assert.ifError(offer1Err);
  assert.equal(offer1.status, 'pending');

  const { data: u2Convs, error: u2ConvsErr } = await u2.rpc('get_my_conversations');
  assert.ifError(u2ConvsErr);
  const convAB = u2Convs.find((c) => c.request_id === req1.id && c.volunteer_id === u2Id);
  assert(convAB, 'Private conversation between A and B must be auto-created');

  console.log('9b. Testing Real-time Private Chat messaging, read receipts, and User C isolation...');
  const { data: msgB, error: msgBErr } = await u2.rpc('send_chat_message', {
    p_conversation_id: convAB.id,
    p_content: 'سلام کاربر اول، ساعت ۱۷ مناسب است؟',
  });
  assert.ifError(msgBErr);
  assert.equal(msgB.sender_id, u2Id);

  const { data: u1Unread } = await u1.rpc('get_total_unread_messages_count');
  assert(u1Unread >= 2, 'User A must see unread messages from User B');

  const { data: readCount } = await u1.rpc('mark_conversation_messages_read', {
    p_conversation_id: convAB.id,
  });
  assert(readCount >= 2, 'User A marking messages read must update read_at');

  const { data: msgA, error: msgAErr } = await u1.rpc('send_chat_message', {
    p_conversation_id: convAB.id,
    p_content: 'بله ساعت ۱۷ عالی است، سپاسگزارم.',
  });
  assert.ifError(msgAErr);
  assert.equal(msgA.sender_id, u1Id);

  // User C (unrelated third party) must see ZERO conversations/messages and be blocked from sending
  const u3 = makeClient();
  const { data: s3, error: e3 } = await u3.auth.signUp({
    email: user3Email,
    password,
    options: { data: { display_name: 'کاربر سوم غیرمرتبط' } },
  });
  assert.ifError(e3);
  assert(s3.user && s3.session);

  const { data: u3Msgs } = await u3.from('messages').select('*').eq('conversation_id', convAB.id);
  assert.equal((u3Msgs ?? []).length, 0, 'User C must NOT read private messages');
  const { error: u3SendErr } = await u3.rpc('send_chat_message', {
    p_conversation_id: convAB.id,
    p_content: 'پیام غیرمجاز',
  });
  assert(u3SendErr, 'User C must NOT send messages in A-B conversation');

  // Second volunteer (User C volunteering on req1) must get a completely separate conversation!
  const { data: offerC, error: offerCErr } = await u3.rpc('submit_volunteer_response', {
    p_request_id: req1.id,
    p_message: 'من هم می‌توانم کمک کنم',
  });
  assert.ifError(offerCErr);
  const { data: convACId } = await u3.rpc('ensure_conversation_for_response', {
    p_response_id: offerC.id,
  });
  assert.notEqual(convACId.id ?? convACId, convAB.id, 'Multiple volunteers must have separate private chats');

  const { error: dupOfferErr } = await u2.rpc('submit_volunteer_response', {
    p_request_id: req1.id,
    p_message: 'دوباره',
  });
  assert(dupOfferErr, 'Duplicate volunteer offer must be rejected');

  console.log('10. Verifying User 2 cannot forge completion directly...');
  const { error: directUpdateVrErr } = await u2
    .from('volunteer_responses')
    .update({ status: 'completed', requester_confirmed: true })
    .eq('id', offer1.id);
  assert(directUpdateVrErr, 'Direct table update on volunteer_responses must be blocked');

  console.log('11. Back to User 1: seeing both volunteers, accepting User B, completing help...');
  const { data: ownerOffers, error: ownerOffersErr } = await u1
    .from('volunteer_responses')
    .select('*, profiles(display_name)')
    .eq('request_id', req1.id);
  assert.ifError(ownerOffersErr);
  assert.equal(ownerOffers.length, 2);
  assert(ownerOffers.some((o) => o.volunteer_id === u2Id));

  const { data: acceptedOffer, error: acceptErr } = await u1.rpc('accept_volunteer_response', {
    p_response_id: offer1.id,
  });
  assert.ifError(acceptErr);
  assert.equal(acceptedOffer.status, 'accepted');

  const { data: markedDone, error: doneErr } = await u2.rpc('mark_volunteer_done', {
    p_response_id: offer1.id,
  });
  assert.ifError(doneErr);
  assert.equal(markedDone.volunteer_confirmed, true);
  assert.equal(markedDone.status, 'in_progress');

  const { data: completedOffer, error: confirmErr } = await u1.rpc('confirm_help_completion', {
    p_response_id: offer1.id,
  });
  assert.ifError(confirmErr);
  assert.equal(completedOffer.status, 'completed');
  assert.equal(completedOffer.requester_confirmed, true);

  const { error: sendAfterCompleteErr } = await u2.rpc('send_chat_message', {
    p_conversation_id: convAB.id,
    p_content: 'پیام بعد از تکمیل',
  });
  assert(sendAfterCompleteErr, 'New messages must be blocked after completion while history remains');

  console.log('12. Checking User 2 completed_helps_count, platform stats, and kindness chain...');
  const { data: p2After } = await u2.from('profiles').select('*').eq('id', u2Id).single();
  assert.equal(p2After.completed_helps_count, 1);

  const { data: statsAfter } = await anon.rpc('get_platform_stats');
  assert.equal(statsAfter.total_requests, statsBefore.total_requests + 1);
  assert.equal(statsAfter.completed_helps, statsBefore.completed_helps + 1);
  assert.equal(statsAfter.verified_participations, statsBefore.verified_participations + 1);

  const { data: chain } = await anon.rpc('get_kindness_chain');
  assert(chain.links.some((l) => l.request_id === req1.id));

  console.log('13. Testing Withdraw / Cancel / Reopen flow on second request...');
  const { data: req2, error: req2Err } = await u1
    .from('help_requests')
    .insert({
      user_id: u1Id,
      title: 'تست دوم: تدریس فیزیک دهم',
      description: 'برای بررسی جریان لغو اعلام آمادگی و لغو و بازگشایی درخواست.',
      category: 'education',
      help_type: 'education',
      province: 'خراسان جنوبی',
      city: 'قاین',
      area: 'بلوار امام خمینی',
      needed_at: 'این هفته',
    })
    .select()
    .single();
  assert.ifError(req2Err);

  const { data: offer2 } = await u2.rpc('submit_volunteer_response', {
    p_request_id: req2.id,
    p_message: 'می‌توانم کمک کنم',
  });
  const { data: withdrawn } = await u2.rpc('withdraw_volunteer_response', {
    p_response_id: offer2.id,
  });
  assert.equal(withdrawn.status, 'cancelled');

  // Re-offering after withdraw should work cleanly without duplicate row
  const { data: reoffered } = await u2.rpc('submit_volunteer_response', {
    p_request_id: req2.id,
    p_message: 'دوباره آماده شدم',
  });
  assert.equal(reoffered.id, offer2.id);
  assert.equal(reoffered.status, 'pending');

  const { data: cancelledReq } = await u1.rpc('cancel_help_request', { p_request_id: req2.id });
  assert.equal(cancelledReq.status, 'cancelled');

  const { data: reopenedReq } = await u1.rpc('reopen_help_request', { p_request_id: req2.id });
  assert.equal(reopenedReq.status, 'open');

  console.log('14. Testing V1.0 notifications, blocking, content report & moderation guard...');
  const { data: u1Notifs, error: u1NotifsErr } = await u1.from('notifications').select('*');
  assert.ifError(u1NotifsErr);
  assert(u1Notifs.some((n) => n.type === 'account_welcome'), 'Welcome notification must exist');
  assert(u1Notifs.some((n) => n.type === 'new_offer'), 'New offer notification must exist');
  assert(u1Notifs.some((n) => n.type === 'help_completed'), 'Completion notification must exist');

  const { data: u2Ach, error: u2AchErr } = await u2.rpc('get_my_achievements_summary');
  assert.ifError(u2AchErr);
  assert(u2Ach.participation_points >= 50, 'Volunteer must earn base + first_helping_hand points');
  assert(u2Ach.earned_count >= 1, 'Volunteer must earn at least first_helping_hand badge');

  const { error: tamperPointsErr } = await u2
    .from('profiles')
    .update({ participation_points: 9999 })
    .eq('id', u2Id);
  assert(tamperPointsErr, 'User must NOT be able to forge participation_points directly');

  const { error: u1ModErr } = await u1.rpc('get_moderation_reports');
  assert(u1ModErr, 'Regular member must NOT access moderation reports');

  const { error: repErr } = await u2.rpc('submit_content_report', {
    p_target_type: 'request',
    p_target_id: req2.id,
    p_reason: 'other',
    p_details: 'تست گزارش E2E',
  });
  assert.ifError(repErr);

  const { error: blkErr } = await u1.rpc('block_user', {
    p_blocked_user_id: s3.user.id,
    p_reason: 'تست مسدودسازی E2E',
  });
  assert.ifError(blkErr);

  const { error: u3BlockedOfferErr } = await u3.rpc('submit_volunteer_response', {
    p_request_id: req2.id,
    p_message: 'نباید ثبت شود',
  });
  assert(u3BlockedOfferErr, 'Blocked user must NOT volunteer on blocker request');

  await u1.rpc('unblock_user', { p_blocked_user_id: s3.user.id });

  console.log('\nALL LIVE MULTI-USER E2E ASSERTIONS PASSED SUCCESSFULLY!');
  console.log(JSON.stringify({ user1Email, user2Email, req1Id: req1.id, req2Id: req2.id }));
}

run().catch((err) => {
  console.error('E2E FAILED:', err);
  process.exit(1);
});
