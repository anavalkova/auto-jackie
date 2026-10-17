CREATE OR REPLACE FUNCTION public.reschedule_my_visit(_id uuid, _slot timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not signed in'; END IF;
  IF _slot <= now() THEN RAISE EXCEPTION 'time must be in the future'; END IF;
  UPDATE public.inquiries
     SET preferred_slots = ARRAY[_slot], booked_at = NULL, status = 'new'
   WHERE id = _id AND driver_id = auth.uid() AND status <> 'closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'visit not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.reschedule_my_visit(uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_my_visit(uuid, timestamptz) TO authenticated;