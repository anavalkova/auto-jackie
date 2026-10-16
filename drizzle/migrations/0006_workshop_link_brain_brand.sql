ALTER TABLE public.workshops ADD COLUMN IF NOT EXISTS slug text;
UPDATE public.workshops SET slug = trim(both '-' from regexp_replace(lower(translate(name, 'åäöéüß', 'aaoeus')), '[^a-z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 4) WHERE slug IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workshops_slug_key ON public.workshops(slug);

CREATE OR REPLACE FUNCTION public.workshop_set_slug() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := trim(both '-' from regexp_replace(lower(translate(NEW.name, 'åäöéüß', 'aaoeus')), '[^a-z0-9]+', '-', 'g')) || '-' || substr(NEW.id::text, 1, 4);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS workshop_set_slug ON public.workshops;
CREATE TRIGGER workshop_set_slug BEFORE INSERT ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.workshop_set_slug();

ALTER TABLE public.workshop_settings
  ADD COLUMN IF NOT EXISTS ai_chat_tier text NOT NULL DEFAULT 'economy' CHECK (ai_chat_tier IN ('economy','balanced','premium')),
  ADD COLUMN IF NOT EXISTS ai_quote_tier text NOT NULL DEFAULT 'balanced' CHECK (ai_quote_tier IN ('economy','balanced','premium')),
  ADD COLUMN IF NOT EXISTS brand_accent text NOT NULL DEFAULT '' CHECK (brand_accent = '' OR brand_accent ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN IF NOT EXISTS brand_logo_url text NOT NULL DEFAULT '' CHECK (char_length(brand_logo_url) <= 500),
  ADD COLUMN IF NOT EXISTS brand_greeting text NOT NULL DEFAULT '' CHECK (char_length(brand_greeting) <= 160);

-- Public, driver-facing profile of a workshop: only what drivers are meant to see.
CREATE OR REPLACE FUNCTION public.workshop_public_profile(_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('id', w.id, 'name', w.name, 'city', w.city, 'slug', w.slug,
    'accent', s.brand_accent, 'logo', s.brand_logo_url, 'greeting', s.brand_greeting)
  FROM public.workshops w LEFT JOIN public.workshop_settings s ON s.workshop_id = w.id
  WHERE w.slug = _slug
$$;
GRANT EXECUTE ON FUNCTION public.workshop_public_profile(text) TO anon, authenticated;

-- What Jackie knows about a workshop when a driver chats on its page.
CREATE OR REPLACE FUNCTION public.workshop_jackie_profile(_workshop uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('name', w.name, 'city', w.city, 'hourly_rate_sek', s.hourly_rate_sek,
    'price_list', s.price_list, 'services', s.services, 'specialties', s.specialties,
    'notes', s.jackie_context, 'opening_hours', s.opening_hours,
    'chat_tier', s.ai_chat_tier, 'quote_tier', s.ai_quote_tier)
  FROM public.workshops w JOIN public.workshop_settings s ON s.workshop_id = w.id
  WHERE w.id = _workshop
$$;
GRANT EXECUTE ON FUNCTION public.workshop_jackie_profile(uuid) TO anon, authenticated;