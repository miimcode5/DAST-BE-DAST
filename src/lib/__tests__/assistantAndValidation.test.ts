import { describe, expect, it } from 'vitest';
import { mergeSortedMessages, sortConversationsByRecent } from '../../services/chatService';
import { analyzeRequestDraft, scoreRequestForVolunteer } from '../smartAssistant';
import {
  detectSensitivePrivacyText,
  MAX_CHAT_MESSAGE_LENGTH,
  validateChatMessage,
  validateRequestFields,
} from '../validation';
import type { ChatMessage, ConversationItem, HelpRequestFeedItem, Profile } from '../../types/database';

describe('validation helpers', () => {
  it('validates valid request fields cleanly', () => {
    const errors = validateRequestFields({
      title: 'نیاز به تعمیر بخاری گازی',
      description: 'بخاری منزل روشن نمی‌شود و برای فرد سالمند نیاز به بررسی فنی دارد.',
      category: 'repair',
      help_type: 'service',
      province: 'خراسان جنوبی',
      city: 'بیرجند',
      area: 'خیابان مدرس',
      needed_at: 'امروز عصر',
    });
    expect(errors).toEqual({});
  });

  it('rejects short title and short description', () => {
    const errors = validateRequestFields({
      title: 'کمک',
      description: 'کوتاه',
      category: 'daily',
      help_type: 'service',
      province: 'خراسان جنوبی',
      city: 'بیرجند',
      area: 'م',
      needed_at: '',
    });
    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.area).toBeDefined();
    expect(errors.needed_at).toBeDefined();
  });

  it('detects Iranian phone numbers and exact address hints in text', () => {
    const res1 = detectSensitivePrivacyText('شماره من 09151234567 است پلاک ۱۲');
    expect(res1.hasPhoneNumber).toBe(true);
    expect(res1.hasExactAddressHint).toBe(true);

    const res2 = detectSensitivePrivacyText('محدوده بلوار معلم بیرجند برای عصر پنج‌شنبه');
    expect(res2.hasPhoneNumber).toBe(false);
    expect(res2.hasExactAddressHint).toBe(false);
  });
});

describe('local rule-based smart assistant', () => {
  it('suggests education category and skills for tutoring draft', () => {
    const analysis = analyzeRequestDraft({
      title: 'تدریس ریاضی پایه هشتم',
      description: 'دانش‌آموز نیاز به مرور فصل جبر و آمادگی امتحان نهایی دارد.',
      category: 'daily',
      helpType: 'service',
      area: 'خیابان طالقانی',
      neededAt: 'این هفته',
    });
    expect(analysis.suggestedCategory).toBe('education');
    expect(analysis.suggestedHelpType).toBe('education');
    expect(analysis.suggestedSkills.length).toBeGreaterThan(0);
  });

  it('flags privacy warning if phone number appears in draft', () => {
    const analysis = analyzeRequestDraft({
      title: 'نیاز به خرید روزانه سالمند',
      description: 'لطفاً با شماره ۰۹۱۵۱۲۳۴۵۶۷ تماس بگیرید تا آدرس را بگویم.',
      category: 'elderly',
      helpType: 'companionship',
      area: 'مهرشهر',
      neededAt: 'فردا صبح',
    });
    expect(analysis.privacyWarnings.length).toBeGreaterThan(0);
  });

  it('scores request higher when matching volunteer city and skill', () => {
    const volunteer: Profile = {
      id: 'vol-1',
      display_name: 'سارا',
      avatar_url: null,
      bio: null,
      province: 'خراسان جنوبی',
      city: 'بیرجند',
      neighborhood: 'مدرس',
      skills: ['تعمیر لوازم خانگی'],
      role: 'member',
      completed_helps_count: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const req: HelpRequestFeedItem = {
      id: 'req-1',
      user_id: 'owner-1',
      title: 'نیاز به تعمیر لوازم خانگی و یخچال',
      description: 'یخچال منزل خنک نمی‌کند و نیاز به بررسی فنی داریم.',
      category: 'repair',
      help_type: 'service',
      province: 'خراسان جنوبی',
      city: 'بیرجند',
      area: 'خیابان مدرس',
      needed_at: 'امروز',
      image_url: null,
      status: 'open',
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      requester_name: 'حسین',
      requester_avatar: null,
      requester_completed_helps: 0,
      responses_count: 0,
    };

    const match = scoreRequestForVolunteer(req, volunteer);
    expect(match.score).toBeGreaterThanOrEqual(7);
    expect(match.reasons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('private chat validation, deduplication and sorting', () => {
  it('validates empty, valid, and oversized chat messages', () => {
    expect(validateChatMessage('   ')).toBeTruthy();
    expect(validateChatMessage('سلام، چه ساعتی هماهنگ کنیم؟')).toBeNull();
    expect(validateChatMessage('الف'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1))).toBeTruthy();
  });

  it('deduplicates messages across RPC/Realtime/reconnect and merges read_at', () => {
    const base: ChatMessage[] = [
      {
        id: 'm2',
        conversation_id: 'c1',
        sender_id: 'u1',
        content: 'پیام دوم',
        read_at: null,
        created_at: '2026-11-25T10:02:00.000Z',
      },
      {
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'u2',
        content: 'پیام اول',
        read_at: null,
        created_at: '2026-11-25T10:01:00.000Z',
      },
    ];

    const incoming: ChatMessage[] = [
      {
        id: 'm1',
        conversation_id: 'c1',
        sender_id: 'u2',
        content: 'پیام اول',
        read_at: '2026-11-25T10:03:00.000Z',
        created_at: '2026-11-25T10:01:00.000Z',
      },
      {
        id: 'm3',
        conversation_id: 'c1',
        sender_id: 'u2',
        content: 'پیام سوم',
        read_at: null,
        created_at: '2026-11-25T10:04:00.000Z',
      },
    ];

    const merged = mergeSortedMessages(base, incoming);
    expect(merged.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(merged[0].read_at).toBe('2026-11-25T10:03:00.000Z');
  });

  it('sorts conversations by newest last_message_at descending', () => {
    const older: ConversationItem = {
      id: 'c-old',
      request_id: 'r1',
      response_id: 'vr1',
      requester_id: 'a',
      volunteer_id: 'b',
      status: 'active',
      last_message_preview: 'قدیمی',
      last_message_at: '2026-11-25T09:00:00.000Z',
      last_message_sender_id: 'b',
      created_at: '2026-11-25T08:00:00.000Z',
      updated_at: '2026-11-25T09:00:00.000Z',
      request_title: 'کمک اول',
      request_status: 'open',
      request_category: 'daily',
      request_city: 'بیرجند',
      response_status: 'pending',
      other_user_id: 'b',
      other_user_name: 'کاربر یک',
      other_user_avatar: null,
      other_user_city: 'بیرجند',
      other_user_completed_helps: 0,
      unread_count: 0,
    };

    const newer: ConversationItem = {
      ...older,
      id: 'c-new',
      last_message_preview: 'جدید',
      last_message_at: '2026-11-25T12:00:00.000Z',
    };

    const sorted = sortConversationsByRecent([older, newer]);
    expect(sorted.map((c) => c.id)).toEqual(['c-new', 'c-old']);
  });
});
