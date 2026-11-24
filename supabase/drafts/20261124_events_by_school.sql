-- DRAFT ONLY: not applied. Restrict event reads to the user's own school (developers see all).
DROP POLICY "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events viewable by same school" ON public.events
AS PERMISSIVE FOR SELECT TO authenticated
USING (
  COALESCE(school, (SELECT c.school FROM public.clubs c WHERE c.id = events.club_id)) = private.current_user_school()
  OR private.has_role(auth.uid(), 'developer'::public.app_role)
);
