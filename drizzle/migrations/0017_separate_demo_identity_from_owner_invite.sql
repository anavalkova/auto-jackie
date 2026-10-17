CREATE OR REPLACE FUNCTION public.demo_workshop_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.workshops WHERE slug = 'demo-verkstad-7176' LIMIT 1
$$;
COMMENT ON FUNCTION public.demo_workshop_id() IS 'Public demo identity is independent of the owner invitation; demo login is a read-only visitor.';
