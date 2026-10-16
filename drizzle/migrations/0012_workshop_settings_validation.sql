CREATE OR REPLACE FUNCTION public.workshop_settings_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.brand_logo_url <> '' AND (length(NEW.brand_logo_url) > 200000
     OR NEW.brand_logo_url !~ '^data:image/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$') THEN
    RAISE EXCEPTION 'Logo must be an uploaded PNG, JPEG or WebP under the size limit';
  END IF;
  IF NEW.brand_accent <> '' AND NEW.brand_accent !~ '^#[0-9a-fA-F]{6}$' THEN
    RAISE EXCEPTION 'Accent must be a hex color';
  END IF;
  IF NEW.website <> '' AND (NEW.website !~ '^https?://[^\s<>"]+$' OR length(NEW.website) > 200) THEN
    RAISE EXCEPTION 'Website must be an http(s) link';
  END IF;
  IF length(NEW.brand_greeting) > 160 OR length(NEW.phone) > 30 OR length(NEW.address) > 200
     OR length(NEW.opening_hours) > 200 OR length(NEW.contact_email) > 120
     OR length(NEW.jackie_context) > 4000 OR length(NEW.specialties) > 2000
     OR length(NEW.services::text) > 20000 OR length(NEW.price_list::text) > 40000
     OR length(NEW.job_durations::text) > 20000 OR coalesce(array_length(NEW.closed_slots,1),0) > 2000 THEN
    RAISE EXCEPTION 'A setting is too long';
  END IF;
  IF NEW.ai_chat_tier NOT IN ('economy','balanced','premium') OR NEW.ai_quote_tier NOT IN ('economy','balanced','premium') THEN
    RAISE EXCEPTION 'Unknown AI tier';
  END IF;
  IF NEW.max_ahead_days NOT BETWEEN 1 AND 365 OR NEW.min_notice_days NOT BETWEEN 0 AND 60 THEN
    RAISE EXCEPTION 'Booking window out of range';
  END IF;
  RETURN NEW;
END $$;

UPDATE public.workshop_settings SET brand_logo_url = '' WHERE brand_logo_url <> '' AND brand_logo_url !~ '^data:image/(webp|png|jpeg);base64,';

DROP TRIGGER IF EXISTS workshop_settings_guard ON public.workshop_settings;
CREATE TRIGGER workshop_settings_guard BEFORE INSERT OR UPDATE ON public.workshop_settings
FOR EACH ROW EXECUTE FUNCTION public.workshop_settings_guard();