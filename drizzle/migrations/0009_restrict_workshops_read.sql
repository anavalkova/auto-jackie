DROP POLICY IF EXISTS "workshops public read" ON public.workshops;
CREATE POLICY "workshops read by members, admins and their drivers" ON public.workshops FOR SELECT TO authenticated
  USING (public.workshop_role_of(id, auth.uid()) IS NOT NULL
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.inquiries i WHERE i.workshop_id = workshops.id AND i.driver_id = auth.uid()));

-- Drivers picking a workshop only need its public listing fields.
CREATE OR REPLACE FUNCTION public.list_partner_workshops()
RETURNS TABLE (id uuid, name text, city text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.id, w.name, w.city FROM public.workshops w ORDER BY w.name
$$;
GRANT EXECUTE ON FUNCTION public.list_partner_workshops() TO anon, authenticated;