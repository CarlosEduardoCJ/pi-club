DROP POLICY "Authenticated can create reports" ON public.reports;
CREATE POLICY "Authenticated can create reports" ON public.reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY "Follows viewable by everyone" ON public.follows;
CREATE POLICY "Follows viewable by same school" ON public.follows FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id IN (follows.follower_id, follows.following_id) AND p.school = private.current_user_school()));

DROP POLICY "Likes viewable by everyone" ON public.post_likes;
CREATE POLICY "Likes viewable by same school" ON public.post_likes FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id AND p.school = private.current_user_school()));

DROP POLICY "Comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments viewable by same school" ON public.post_comments FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id AND p.school = private.current_user_school()));

DROP POLICY "Attendees viewable by everyone" ON public.event_attendees;
CREATE POLICY "Attendees viewable by same school" ON public.event_attendees FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.events e LEFT JOIN public.clubs c ON c.id = e.club_id
             WHERE e.id = event_attendees.event_id AND COALESCE(e.school, c.school) = private.current_user_school()));

DROP POLICY "Registrations viewable by everyone" ON public.competition_registrations;
CREATE POLICY "Registrations viewable by same school" ON public.competition_registrations FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = competition_registrations.profile_id AND p.school = private.current_user_school()));

DROP POLICY "Club members viewable by authenticated" ON public.club_members;
CREATE POLICY "Club members viewable by same school" ON public.club_members FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'developer'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_members.club_id AND c.school = private.current_user_school()));