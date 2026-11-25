-- Defense-in-depth: revoke direct write table privileges on achievement tables
-- from authenticated and anon roles; mutations only occur via trusted SECURITY DEFINER functions.

revoke insert, update, delete on table public.user_achievements, public.badge_definitions from authenticated, anon;
