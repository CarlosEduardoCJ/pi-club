DROP POLICY "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events viewable by same school" ON public.events
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  COALESCE(school, (SELECT c.school FROM public.clubs c WHERE c.id = events.club_id)) = private.current_user_school()
  OR private.has_role(auth.uid(), 'developer'::public.app_role)
);

DROP POLICY "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs viewable by same school" ON public.clubs
AS PERMISSIVE FOR SELECT TO authenticated
USING (school = private.current_user_school() OR private.has_role(auth.uid(), 'developer'::public.app_role));

DROP POLICY "Competitions viewable by everyone" ON public.competitions;
CREATE POLICY "Competitions viewable by school or statewide" ON public.competitions
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  scope <> 'local'
  OR club_id IS NULL
  OR (SELECT c.school FROM public.clubs c WHERE c.id = competitions.club_id) = private.current_user_school()
  OR private.has_role(auth.uid(), 'developer'::public.app_role)
);

DROP POLICY "Anyone reads announcements" ON public.global_announcements;
CREATE POLICY "Signed-in users read active announcements" ON public.global_announcements
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  expires_at IS NULL OR expires_at > now()
  OR private.has_role(auth.uid(), 'developer'::public.app_role)
);