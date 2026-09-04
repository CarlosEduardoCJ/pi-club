-- helper: admin da mesma escola do usuário alvo
CREATE OR REPLACE FUNCTION public.is_admin_of_user_school(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
     AND EXISTS (
       SELECT 1
       FROM public.profiles a
       JOIN public.profiles t ON t.user_id = _target_user_id
       WHERE a.user_id = auth.uid()
         AND a.school = t.school
     );
$$;

REVOKE ALL ON FUNCTION public.is_admin_of_user_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of_user_school(uuid) TO authenticated;

-- POSTS: leitura só da própria escola e não excluídos
DROP POLICY IF EXISTS "Posts are viewable by authenticated" ON public.posts;
CREATE POLICY "Posts viewable within own school"
ON public.posts FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND (
    school = public.current_user_school()
    OR EXISTS (
      SELECT 1 FROM public.clubs c
      WHERE c.id = posts.club_id AND c.school = public.current_user_school()
    )
  )
);

DROP POLICY IF EXISTS "Developers view all posts" ON public.posts;
CREATE POLICY "Developers view all posts"
ON public.posts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'developer'::app_role));

-- PROFILES: só mesma escola (+ próprio + developer)
DROP POLICY IF EXISTS "Active profiles viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable within own school"
ON public.profiles FOR SELECT TO authenticated
USING (deleted_at IS NULL AND school = public.current_user_school());

DROP POLICY IF EXISTS "Users view own profile always" ON public.profiles;
CREATE POLICY "Users view own profile always"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- USER_ROLES: admin só da própria escola
DROP POLICY IF EXISTS "Users see their own role" ON public.user_roles;
CREATE POLICY "Users see their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'developer'::app_role)
  OR public.is_admin_of_user_school(user_id)
);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_admin_of_user_school(user_id));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_admin_of_user_school(user_id));

-- POSTS admin/dev policies: restringir a authenticated (eram public)
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;
CREATE POLICY "Admins can delete posts"
ON public.posts FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND (
    (club_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = posts.club_id AND c.school = public.current_user_school()))
    OR (club_id IS NULL AND school = public.current_user_school())
  )
);

DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
CREATE POLICY "Admins can update posts"
ON public.posts FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND (
    (club_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = posts.club_id AND c.school = public.current_user_school()))
    OR (club_id IS NULL AND school = public.current_user_school())
  )
);

-- POSTS: autor pode atualizar (soft delete) e apagar o próprio post
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
CREATE POLICY "Authors can update own posts"
ON public.posts FOR UPDATE TO authenticated
USING (public.profile_belongs_to_auth(author_id))
WITH CHECK (public.profile_belongs_to_auth(author_id));

DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
CREATE POLICY "Authors can delete own posts"
ON public.posts FOR DELETE TO authenticated
USING (public.profile_belongs_to_auth(author_id));