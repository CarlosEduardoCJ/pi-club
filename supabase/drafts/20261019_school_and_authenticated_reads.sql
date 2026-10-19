-- DRAFT ONLY: not applied. Preview and published app share the current database.
-- Run only on a verified isolated database after review.
BEGIN;

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

DROP POLICY "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone" ON public.follows
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Attendees viewable by everyone" ON public.event_attendees;
CREATE POLICY "Attendees viewable by everyone" ON public.event_attendees
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments viewable by everyone" ON public.post_comments
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Likes viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes viewable by everyone" ON public.post_likes
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Registrations viewable by everyone" ON public.competition_registrations;
CREATE POLICY "Registrations viewable by everyone" ON public.competition_registrations
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Competitions viewable by everyone" ON public.competitions;
CREATE POLICY "Competitions viewable by everyone" ON public.competitions
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

DROP POLICY "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events
AS PERMISSIVE FOR SELECT TO authenticated USING (true);

COMMIT;