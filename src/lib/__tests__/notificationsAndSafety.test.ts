import { describe, expect, it } from 'vitest';
import {
  CONTENT_REPORT_REASONS,
  CONVERSATION_REPORT_REASONS,
  NOTIFICATION_TYPE_META,
} from '../../constants/categories';
import type { NotificationType } from '../../types/database';

const ALL_NOTIFICATION_TYPES: NotificationType[] = [
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
  'badge_earned',
];

describe('V1.0 notification and report metadata', () => {
  it('defines readable Persian metadata for every notification type using brand tokens', () => {
    for (const type of ALL_NOTIFICATION_TYPES) {
      const meta = NOTIFICATION_TYPE_META[type];
      expect(meta).toBeDefined();
      expect(meta.badgeLabel.length).toBeGreaterThan(2);
      expect(meta.badgeClass).toContain('brand-');
    }
  });

  it('provides non-empty content and conversation report reason lists', () => {
    expect(CONTENT_REPORT_REASONS.length).toBeGreaterThanOrEqual(5);
    expect(CONVERSATION_REPORT_REASONS.length).toBeGreaterThanOrEqual(5);
    for (const r of CONTENT_REPORT_REASONS) {
      expect(r.label.trim().length).toBeGreaterThan(3);
    }
  });
});
