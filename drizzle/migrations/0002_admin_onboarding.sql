CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- emails that become admins on first sign-in; never readable by app users
CREATE TABLE public.admin_emails (email text PRIMARY KEY CHECK (email = lower(email)));
GRANT ALL ON public.admin_emails TO service_role;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- who should own an onboarded workshop; admins only
CREATE TABLE public.workshop_invites (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops(id) ON DELETE CASCADE,
  email text NOT NULL CHECK (email = lower(email) AND char_length(email) BETWEEN 3 AND 254),
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workshop_invites TO authenticated;
GRANT ALL ON public.workshop_invites TO service_role;
ALTER TABLE public.workshop_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read invites" ON public.workshop_invites FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- each workshop's own configuration, initialised from the template defaults
CREATE TABLE public.workshop_settings (
  workshop_id uuid PRIMARY KEY REFERENCES public.workshops(id) ON DELETE CASCADE,
  hourly_rate_sek integer NOT NULL DEFAULT 950 CHECK (hourly_rate_sek BETWEEN 0 AND 10000),
  opening_hours text NOT NULL DEFAULT 'Mon–Fri 07:30–17:00' CHECK (char_length(opening_hours) <= 200),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 30),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 200),
  services jsonb NOT NULL DEFAULT '["Annual service","Brake pads & discs","Tyre change & storage","Diagnostics (engine light)","Timing belt","Battery & electrics"]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.workshop_settings TO authenticated;
GRANT ALL ON public.workshop_settings TO service_role;
ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read settings" ON public.workshop_settings FOR SELECT TO authenticated
  USING (public.workshop_role_of(workshop_id, auth.uid()) IS NOT NULL OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "owner updates settings" ON public.workshop_settings FOR UPDATE TO authenticated
  USING (public.workshop_role_of(workshop_id, auth.uid()) = 'owner') WITH CHECK (public.workshop_role_of(workshop_id, auth.uid()) = 'owner');

-- workshops are no longer self-service
DROP POLICY "workshops create own" ON public.workshops;
REVOKE INSERT ON public.workshops FROM authenticated;
DROP TRIGGER workshops_add_owner ON public.workshops;
CREATE POLICY "admins see all members" ON public.workshop_members FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.admin_onboard_workshop(_name text, _email text, _city text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE wid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only AutoJackie admins can onboard workshops'; END IF;
  INSERT INTO public.workshops(name, city, created_by) VALUES (trim(_name), trim(coalesce(_city,'')), auth.uid()) RETURNING id INTO wid;
  INSERT INTO public.workshop_settings(workshop_id) VALUES (wid);
  INSERT INTO public.workshop_invites(workshop_id, email) VALUES (wid, lower(trim(_email)));
  RETURN wid;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_onboard_workshop(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_onboard_workshop(text, text, text) TO authenticated;

-- called after sign-in: turns the signed-in email into admin rights / workshop ownership
CREATE OR REPLACE FUNCTION public.claim_my_access()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); em text;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('is_admin', false); END IF;
  SELECT lower(email) INTO em FROM auth.users WHERE id = uid AND (email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL);
  IF em IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.admin_emails WHERE email = em) THEN
      INSERT INTO public.user_roles(user_id, role) VALUES (uid, 'admin') ON CONFLICT DO NOTHING;
    END IF;
    INSERT INTO public.workshop_members(workshop_id, user_id, role)
      SELECT workshop_id, uid, 'owner' FROM public.workshop_invites WHERE email = em ON CONFLICT DO NOTHING;
    UPDATE public.workshop_invites SET claimed_at = now() WHERE email = em AND claimed_at IS NULL;
  END IF;
  RETURN jsonb_build_object('is_admin', public.has_role(uid, 'admin'));
END $$;
REVOKE EXECUTE ON FUNCTION public.claim_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_my_access() TO authenticated;