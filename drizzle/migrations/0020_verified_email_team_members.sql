CREATE OR REPLACE FUNCTION public.workshop_add_member(_workshop uuid, _email text, _role workshop_role)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF public.workshop_role_of(_workshop, auth.uid()) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only the workshop owner can add members';
  END IF;
  SELECT id INTO _uid FROM auth.users
  WHERE lower(email) = lower(trim(_email)) AND email_confirmed_at IS NOT NULL;
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'no verified AutoJackie account with that email yet';
  END IF;
  INSERT INTO public.workshop_members(workshop_id, user_id, role)
  VALUES (_workshop, _uid, _role)
  ON CONFLICT (workshop_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN _uid;
END;
$function$;