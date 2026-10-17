CREATE OR REPLACE FUNCTION public.workshop_set_slug()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE base text; cand text; n int := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base := trim(both '-' from regexp_replace(lower(translate(NEW.name, 'åäöéüß', 'aaoeus')), '[^a-z0-9]+', '-', 'g'));
    IF base = '' THEN base := 'workshop'; END IF;
    cand := base;
    WHILE EXISTS (SELECT 1 FROM public.workshops WHERE slug = cand AND id <> NEW.id) LOOP
      n := n + 1; cand := base || '-' || n;
    END LOOP;
    NEW.slug := cand;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.demo_workshop_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT '7176603b-6e96-4f04-9e94-a468d955fcfd'::uuid
$$;

UPDATE public.workshops SET slug = 'demo-verkstad' WHERE id = '7176603b-6e96-4f04-9e94-a468d955fcfd';
UPDATE public.workshops SET slug = 'dev-verkstad' WHERE id = '3a553c67-d363-4917-809d-a1802e0768e7';