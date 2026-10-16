CREATE TYPE public.workshop_role AS ENUM ('owner','staff');
CREATE TYPE public.inquiry_status AS ENUM ('new','contacted','quoted','booked','closed');

CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  city text NOT NULL DEFAULT '' CHECK (char_length(city) <= 60),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workshop_members (
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.workshop_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, user_id)
);
CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL DEFAULT auth.uid(),
  issue text NOT NULL CHECK (char_length(issue) BETWEEN 1 AND 200),
  urgency text NOT NULL DEFAULT 'soon',
  price_low_sek integer,
  price_high_sek integer,
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 1000),
  vehicle_label text NOT NULL DEFAULT '' CHECK (char_length(vehicle_label) <= 120),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 1000),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 1 AND 80),
  contact_phone text NOT NULL CHECK (char_length(contact_phone) BETWEEN 5 AND 30),
  status public.inquiry_status NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inquiries_workshop_idx ON public.inquiries(workshop_id, created_at DESC);

GRANT SELECT ON public.workshops TO anon;
GRANT SELECT, INSERT, UPDATE ON public.workshops TO authenticated;
GRANT ALL ON public.workshops TO service_role;
GRANT SELECT ON public.workshop_members TO authenticated;
GRANT ALL ON public.workshop_members TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workshop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.workshop_role_of(_workshop uuid, _user uuid)
RETURNS public.workshop_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workshop_members WHERE workshop_id = _workshop AND user_id = _user
$$;

CREATE OR REPLACE FUNCTION public.add_workshop_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workshop_members(workshop_id, user_id, role) VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END $$;
CREATE TRIGGER workshops_add_owner AFTER INSERT ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.add_workshop_owner();

CREATE OR REPLACE FUNCTION public.inquiry_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- staff may only change status; everything the driver sent stays as sent
  IF NEW.workshop_id <> OLD.workshop_id OR NEW.driver_id <> OLD.driver_id OR NEW.issue <> OLD.issue
     OR NEW.contact_phone <> OLD.contact_phone OR NEW.contact_name <> OLD.contact_name OR NEW.message <> OLD.message THEN
    RAISE EXCEPTION 'Only the status of an inquiry can be changed';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER inquiries_guard BEFORE UPDATE ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.inquiry_guard();

CREATE POLICY "workshops public read" ON public.workshops FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "workshops create own" ON public.workshops FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "workshops owner update" ON public.workshops FOR UPDATE TO authenticated
  USING (public.workshop_role_of(id, auth.uid()) = 'owner') WITH CHECK (public.workshop_role_of(id, auth.uid()) = 'owner');

CREATE POLICY "members see own team" ON public.workshop_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.workshop_role_of(workshop_id, auth.uid()) IS NOT NULL);

CREATE POLICY "drivers send inquiries" ON public.inquiries FOR INSERT TO authenticated WITH CHECK (driver_id = auth.uid() AND status = 'new');
CREATE POLICY "driver or workshop reads" ON public.inquiries FOR SELECT TO authenticated
  USING (driver_id = auth.uid() OR public.workshop_role_of(workshop_id, auth.uid()) IS NOT NULL);
CREATE POLICY "workshop updates status" ON public.inquiries FOR UPDATE TO authenticated
  USING (public.workshop_role_of(workshop_id, auth.uid()) IS NOT NULL)
  WITH CHECK (public.workshop_role_of(workshop_id, auth.uid()) IS NOT NULL);