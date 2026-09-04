-- Área interna, não exposta à API
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- Move os helpers de RLS para fora do schema exposto (policies seguem pelo OID)
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.current_user_school() SET SCHEMA private;
ALTER FUNCTION public.profile_belongs_to_auth(uuid) SET SCHEMA private;
ALTER FUNCTION public.is_admin_of_user_school(uuid) SET SCHEMA private;

-- RLS precisa de EXECUTE (sem USAGE no schema, não são chamáveis via API)
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION private.current_user_school() FROM anon;
REVOKE ALL ON FUNCTION private.profile_belongs_to_auth(uuid) FROM anon;
REVOKE ALL ON FUNCTION private.is_admin_of_user_school(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_school() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.profile_belongs_to_auth(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin_of_user_school(uuid) TO authenticated, service_role;

-- Recria as funções que referenciam os helpers por nome
CREATE OR REPLACE FUNCTION private.is_admin_of_user_school(_target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT private.has_role(auth.uid(), 'admin'::app_role)
     AND EXISTS (
       SELECT 1
       FROM public.profiles a
       JOIN public.profiles t ON t.user_id = _target_user_id
       WHERE a.user_id = auth.uid()
         AND a.school = t.school
     );
$function$;

CREATE OR REPLACE FUNCTION public.set_club_school()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _school text;
BEGIN
  _school := private.current_user_school();
  IF _school IS NOT NULL THEN
    NEW.school := _school;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_event_school()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.school IS NULL THEN
    IF NEW.club_id IS NOT NULL THEN
      SELECT school INTO NEW.school FROM public.clubs WHERE id = NEW.club_id;
    ELSE
      NEW.school := private.current_user_school();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_manual_developer_profile_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.developer IS TRUE
       AND auth.uid() IS NOT NULL
       AND NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
      RAISE EXCEPTION 'Apenas o fluxo protegido de desenvolvedor pode criar perfis de desenvolvedor.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  IF COALESCE(OLD.developer, false) IS DISTINCT FROM COALESCE(NEW.developer, false)
     AND auth.uid() IS NOT NULL
     AND NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Você não pode alterar o marcador de desenvolvedor.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ban_user_by_admin(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _admin_school text;
  _target_school text;
  _is_dev boolean;
BEGIN
  _is_dev := private.has_role(auth.uid(), 'developer'::app_role);

  IF NOT _is_dev AND NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem suspender usuários.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode suspender sua própria conta.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT _is_dev THEN
    SELECT school INTO _admin_school FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
    SELECT school INTO _target_school FROM public.profiles WHERE user_id = target_user_id LIMIT 1;
    IF _admin_school IS NULL OR _target_school IS NULL OR _admin_school <> _target_school THEN
      RAISE EXCEPTION 'Você só pode gerenciar usuários da sua própria escola.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  UPDATE auth.users
  SET banned_until = now() + interval '100 years',
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('banned', true)
  WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unban_user_by_admin(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role)
     AND NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem reativar usuários.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE auth.users
  SET banned_until = NULL,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'banned'
  WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _admin_school text;
  _target_school text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem excluir usuários.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT school INTO _admin_school FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT school INTO _target_school FROM public.profiles WHERE user_id = target_user_id LIMIT 1;
  IF _admin_school IS NULL OR _target_school IS NULL OR _admin_school <> _target_school THEN
    RAISE EXCEPTION 'Você só pode gerenciar usuários da sua própria escola.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.profiles
    SET deleted_at = now(), deleted_by = auth.uid()
  WHERE user_id = target_user_id AND deleted_at IS NULL;

  UPDATE auth.users
  SET banned_until = now() + interval '100 years',
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('banned', true, 'soft_deleted', true)
  WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ban_user_temp_by_dev(target_user_id uuid, days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas desenvolvedores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode banir sua própria conta.' USING ERRCODE = 'check_violation';
  END IF;
  IF days IS NULL OR days < 1 THEN
    RAISE EXCEPTION 'Quantidade de dias inválida.' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE auth.users
  SET banned_until = now() + make_interval(days => days),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('banned', true)
  WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hard_delete_user_by_dev(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas desenvolvedores.' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode excluir sua própria conta.' USING ERRCODE = 'check_violation';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE user_id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.restore_user_by_dev(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas desenvolvedores.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE public.profiles
    SET deleted_at = NULL, deleted_by = NULL
  WHERE user_id = target_user_id;

  UPDATE auth.users
  SET banned_until = NULL,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) - 'banned' - 'soft_deleted'
  WHERE id = target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_admin_role_by_dev(target_user_id uuid, make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT private.has_role(auth.uid(), 'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas desenvolvedores.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF make_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = target_user_id AND role = 'admin'::app_role;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.broadcast_global_announcement(_title text, _message text, _expires_at timestamp with time zone)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
BEGIN
  IF NOT private.has_role(auth.uid(),'developer'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas desenvolvedores.' USING ERRCODE='insufficient_privilege';
  END IF;

  INSERT INTO public.global_announcements (title, message, expires_at, created_by)
  VALUES (_title, _message, _expires_at, auth.uid())
  RETURNING id INTO _id;

  INSERT INTO public.notifications (profile_id, type, message, from_user, from_avatar, is_read)
  SELECT p.id, 'announcement', _title || ' — ' || _message, 'Pi Club', '', false
  FROM public.profiles p
  WHERE p.deleted_at IS NULL;

  RETURN _id;
END;
$function$;