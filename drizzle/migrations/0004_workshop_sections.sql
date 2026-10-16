ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS vat_number text NOT NULL DEFAULT '';
ALTER TABLE public.workshop_settings
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS booking_days integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  ADD COLUMN IF NOT EXISTS slot_hours integer[] NOT NULL DEFAULT '{8,10,13,15}',
  ADD COLUMN IF NOT EXISTS min_notice_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS job_durations jsonb NOT NULL DEFAULT '[{"job":"Annual service","minutes":120},{"job":"Brake pads & discs","minutes":90},{"job":"Tyre change","minutes":30},{"job":"Diagnostics","minutes":60},{"job":"Timing belt","minutes":300}]',
  ADD COLUMN IF NOT EXISTS price_list jsonb NOT NULL DEFAULT '[{"task":"Annual service","price_sek":2900},{"task":"Brake pads, front","price_sek":1900},{"task":"Tyre change","price_sek":500},{"task":"Diagnostics","price_sek":750}]',
  ADD COLUMN IF NOT EXISTS jackie_context text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialties text NOT NULL DEFAULT '';

-- Name and VAT number are set by operations only
CREATE OR REPLACE FUNCTION public.workshop_identity_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.name IS DISTINCT FROM OLD.name OR NEW.vat_number IS DISTINCT FROM OLD.vat_number)
     AND auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Workshop name and VAT number are managed by AutoJackie operations';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workshop_identity_guard ON public.workshops;
CREATE TRIGGER workshop_identity_guard BEFORE UPDATE ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.workshop_identity_guard();

CREATE OR REPLACE FUNCTION public.admin_set_workshop_profile(_workshop uuid, _vat text, _phone text, _address text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admins only'; END IF;
  UPDATE public.workshops SET vat_number = left(coalesce(_vat,''), 30) WHERE id = _workshop;
  UPDATE public.workshop_settings SET phone = left(coalesce(_phone,''), 30), address = left(coalesce(_address,''), 200) WHERE workshop_id = _workshop;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_workshop_profile(uuid, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_workshop_profile(uuid, text, text, text) TO authenticated;