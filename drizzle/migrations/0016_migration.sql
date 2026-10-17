CREATE OR REPLACE FUNCTION public.inquiry_autobook()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.preferred_slots IS NOT NULL AND array_length(NEW.preferred_slots, 1) > 0 AND NEW.booked_at IS NULL THEN
    NEW.booked_at := NEW.preferred_slots[1];
    NEW.status := 'booked';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS inquiries_autobook ON public.inquiries;
CREATE TRIGGER inquiries_autobook BEFORE INSERT ON public.inquiries FOR EACH ROW EXECUTE FUNCTION public.inquiry_autobook();

CREATE OR REPLACE FUNCTION public.reschedule_my_visit(_id uuid, _slot timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _slot <= now() THEN RAISE EXCEPTION 'slot must be in the future'; END IF;
  UPDATE public.inquiries SET preferred_slots = ARRAY[_slot], booked_at = _slot, status = 'booked'
  WHERE id = _id AND driver_id = auth.uid() AND status <> 'closed';
  IF NOT FOUND THEN RAISE EXCEPTION 'visit not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.reschedule_my_visit(uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reschedule_my_visit(uuid, timestamptz) TO authenticated;

UPDATE public.inquiries SET booked_at = preferred_slots[1], status = 'booked'
WHERE booked_at IS NULL AND status IN ('new','contacted','quoted') AND array_length(preferred_slots,1) > 0 AND preferred_slots[1] > now();