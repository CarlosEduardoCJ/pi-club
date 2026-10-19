-- DRAFT ROLLBACK ONLY: restores the eight original PUBLIC SELECT policies.
-- This reopens their previous anonymous read access. Review before execution.
BEGIN;

DROP TRIGGER prevent_profile_school_change ON public.profiles;
DROP FUNCTION public.prevent_profile_school_change();

DROP POLICY "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by everyone" ON public.follows
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Attendees viewable by everyone" ON public.event_attendees;
CREATE POLICY "Attendees viewable by everyone" ON public.event_attendees
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments viewable by everyone" ON public.post_comments
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Likes viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes viewable by everyone" ON public.post_likes
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Registrations viewable by everyone" ON public.competition_registrations;
CREATE POLICY "Registrations viewable by everyone" ON public.competition_registrations
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Clubs are viewable by everyone" ON public.clubs;
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Competitions viewable by everyone" ON public.competitions;
CREATE POLICY "Competitions viewable by everyone" ON public.competitions
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

DROP POLICY "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" ON public.events
AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);

COMMIT;