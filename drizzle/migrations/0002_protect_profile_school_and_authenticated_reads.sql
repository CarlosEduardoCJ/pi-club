-- Aprovado para aplicação em produção em 2026-11-25; sem publicação do app.
-- Preserva as policies por escola já existentes: cada policy pública antiga só é
-- substituída pela versão authenticated quando a policy antiga ainda existir.
CREATE FUNCTION public.prevent_profile_school_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.school IS DISTINCT FROM NEW.school
     AND NULLIF(btrim(OLD.school), '') IS NOT NULL
     AND NOT COALESCE(private.has_role(auth.uid(), 'developer'::public.app_role), false) THEN
    RAISE EXCEPTION 'Você não tem permissão para alterar a escola do perfil.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_profile_school_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER prevent_profile_school_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_school_change();

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows' AND policyname = 'Follows viewable by everyone') THEN
    DROP POLICY "Follows viewable by everyone" ON public.follows;
    CREATE POLICY "Follows viewable by everyone" ON public.follows
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'event_attendees' AND policyname = 'Attendees viewable by everyone') THEN
    DROP POLICY "Attendees viewable by everyone" ON public.event_attendees;
    CREATE POLICY "Attendees viewable by everyone" ON public.event_attendees
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_comments' AND policyname = 'Comments viewable by everyone') THEN
    DROP POLICY "Comments viewable by everyone" ON public.post_comments;
    CREATE POLICY "Comments viewable by everyone" ON public.post_comments
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes' AND policyname = 'Likes viewable by everyone') THEN
    DROP POLICY "Likes viewable by everyone" ON public.post_likes;
    CREATE POLICY "Likes viewable by everyone" ON public.post_likes
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competition_registrations' AND policyname = 'Registrations viewable by everyone') THEN
    DROP POLICY "Registrations viewable by everyone" ON public.competition_registrations;
    CREATE POLICY "Registrations viewable by everyone" ON public.competition_registrations
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clubs' AND policyname = 'Clubs are viewable by everyone') THEN
    DROP POLICY "Clubs are viewable by everyone" ON public.clubs;
    CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'competitions' AND policyname = 'Competitions viewable by everyone') THEN
    DROP POLICY "Competitions viewable by everyone" ON public.competitions;
    CREATE POLICY "Competitions viewable by everyone" ON public.competitions
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Events are viewable by everyone') THEN
    DROP POLICY "Events are viewable by everyone" ON public.events;
    CREATE POLICY "Events are viewable by everyone" ON public.events
    AS PERMISSIVE FOR SELECT TO authenticated USING (true);
  END IF;
END;
$migration$;
