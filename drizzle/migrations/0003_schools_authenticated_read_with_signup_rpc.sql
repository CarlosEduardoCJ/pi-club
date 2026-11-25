DROP POLICY IF EXISTS "Schools are viewable by everyone" ON public.schools;
CREATE POLICY "Signed-in users can view schools" ON public.schools
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.schools FROM anon;

CREATE OR REPLACE FUNCTION public.list_signup_schools()
RETURNS TABLE(id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT s.id, s.name FROM public.schools s ORDER BY s.name $$;
REVOKE ALL ON FUNCTION public.list_signup_schools() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_signup_schools() TO anon, authenticated;