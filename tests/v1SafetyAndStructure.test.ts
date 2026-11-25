import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

describe('V1.0 safety, privacy & architectural invariants', () => {
  it('does not globally disable text selection or right-click inside Layout.tsx', () => {
    const layoutSource = fs.readFileSync(
      path.join(ROOT, 'src/components/Layout.tsx'),
      'utf8'
    );
    expect(layoutSource).not.toContain('useContentProtection');
    expect(layoutSource).not.toContain('content-protected');
    expect(layoutSource).toContain('/notifications');
  });

  it('defaults ProtectedImage shield to false', () => {
    const protectedImageSource = fs.readFileSync(
      path.join(ROOT, 'src/components/ProtectedImage.tsx'),
      'utf8'
    );
    expect(protectedImageSource).toContain('shield = false');
  });

  it('includes notifications_cache in IndexedDB offline storage and clearOfflineCache', () => {
    const offlineDbSource = fs.readFileSync(
      path.join(ROOT, 'src/lib/offlineDb.ts'),
      'utf8'
    );
    expect(offlineDbSource).toContain('notifications_cache');
    expect(offlineDbSource).toContain("clear('notifications_cache')");
  });

  it('wires /notifications and /moderation routes in App.tsx inside NotificationsProvider', () => {
    const appSource = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf8');
    expect(appSource).toContain('<NotificationsProvider>');
    expect(appSource).toContain('path="/notifications"');
    expect(appSource).toContain('path="/moderation"');
  });

  it('includes security & privacy hardening migrations on top of schema', () => {
    const notifSql = fs.readFileSync(
      path.join(
        ROOT,
        'supabase/migrations/20261125200000_dast_be_dast_notifications_and_safety.sql'
      ),
      'utf8'
    );
    expect(notifSql).toContain('create table if not exists public.notifications');
    expect(notifSql).toContain('create table if not exists public.user_blocks');
    expect(notifSql).toContain('create table if not exists public.content_reports');
    expect(notifSql).toContain('revoke select on public.profiles from anon');
    expect(notifSql).toContain('is_moderator_or_admin()');
  });

  it('wires live achievements & participation points in ProfilePage and DB migrations', () => {
    const profileSource = fs.readFileSync(
      path.join(ROOT, 'src/pages/ProfilePage.tsx'),
      'utf8'
    );
    expect(profileSource).not.toContain('فعال‌سازی در نسخه تکمیلی');
    expect(profileSource).toContain('getMyAchievementsSummary');

    const achSql = fs.readFileSync(
      path.join(
        ROOT,
        'supabase/migrations/20261125210000_dast_be_dast_achievements_and_points.sql'
      ),
      'utf8'
    );
    expect(achSql).toContain('create table if not exists public.badge_definitions');
    expect(achSql).toContain('create table if not exists public.user_achievements');
    expect(achSql).toContain('participation_points');
    expect(achSql).toContain('get_my_achievements_summary');
    expect(achSql).toContain("'voluntary'");
    expect(achSql).toContain("'specialized'");
  });
});
