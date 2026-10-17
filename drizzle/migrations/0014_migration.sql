CREATE OR REPLACE FUNCTION public.workshop_add_member(_workshop uuid, _email text, _role public.workshop_role)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF public.workshop_role_of(_workshop, auth.uid()) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only the workshop owner can add members';
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'no AutoJackie account with that email yet';
  END IF;
  INSERT INTO public.workshop_members(workshop_id, user_id, role)
  VALUES (_workshop, _uid, _role)
  ON CONFLICT (workshop_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN _uid;
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_remove_member(_workshop uuid, _user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.workshop_role_of(_workshop, auth.uid()) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only the workshop owner can remove members';
  END IF;
  IF _user = auth.uid() THEN
    RAISE EXCEPTION 'you cannot remove yourself';
  END IF;
  DELETE FROM public.workshop_members WHERE workshop_id = _workshop AND user_id = _user;
END;
$$;

CREATE OR REPLACE FUNCTION public.workshop_team(_workshop uuid)
RETURNS TABLE(user_id uuid, email text, role public.workshop_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, u.email, m.role
  FROM public.workshop_members m JOIN auth.users u ON u.id = m.user_id
  WHERE m.workshop_id = _workshop
    AND public.workshop_role_of(_workshop, auth.uid()) IS NOT NULL
  ORDER BY m.role, u.email
$$;

REVOKE ALL ON FUNCTION public.workshop_add_member(uuid, text, public.workshop_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workshop_remove_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.workshop_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.workshop_add_member(uuid, text, public.workshop_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_remove_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.workshop_team(uuid) TO authenticated;