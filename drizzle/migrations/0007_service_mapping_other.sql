ALTER TABLE public.workshop_settings ALTER COLUMN price_list SET DEFAULT '[{"task":"Annual service","price_sek":2900,"minutes":120},{"task":"Brake pads, front","price_sek":1900,"minutes":60},{"task":"Tyre change","price_sek":500,"minutes":30},{"task":"Diagnostics (engine light)","price_sek":750,"minutes":60},{"task":"Other","price_sek":0,"minutes":60}]';
UPDATE public.workshop_settings SET price_list = coalesce(price_list, '[]'::jsonb) || '[{"task":"Other","price_sek":0,"minutes":60}]'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(price_list,'[]'::jsonb)) e WHERE e->>'task' = 'Other');
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS service text CHECK (service IS NULL OR char_length(service) <= 80);
UPDATE public.inquiries i SET service = e->>'task'
  FROM public.workshop_settings s, jsonb_array_elements(s.price_list) e
  WHERE s.workshop_id = i.workshop_id AND i.service IS NULL AND lower(trim(e->>'task')) = lower(trim(i.issue));
UPDATE public.inquiries SET service = 'Other' WHERE service IS NULL;