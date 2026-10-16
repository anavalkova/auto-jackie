CREATE OR REPLACE FUNCTION public.workshop_booking_rules(_workshop uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('days', booking_days, 'hours', slot_hours, 'notice', min_notice_days)
  FROM public.workshop_settings WHERE workshop_id = _workshop
$$;
GRANT EXECUTE ON FUNCTION public.workshop_booking_rules(uuid) TO anon, authenticated;