-- Defense-in-depth: explicitly revoke table privileges from anonymous role on private/member-only tables.
-- Public read-only access for unauthenticated visitors flows strictly through:
--   - public.help_requests (open/in_progress/completed only)
--   - public.public_help_requests_feed (view exposing requester display_name & avatar only)
--   - get_platform_stats(), get_kindness_chain()

revoke all on table
  public.notifications,
  public.user_blocks,
  public.content_reports,
  public.messages,
  public.conversations,
  public.conversation_reports,
  public.volunteer_responses,
  public.saved_requests
from anon;
