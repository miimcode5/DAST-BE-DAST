-- Migration 3: Tighten view grants on public_help_requests_feed strictly to SELECT
revoke all on public.public_help_requests_feed from public, anon, authenticated;
grant select on public.public_help_requests_feed to anon, authenticated;
