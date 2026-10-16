ALTER TABLE public.workshop_settings
  ADD COLUMN IF NOT EXISTS max_ahead_days integer NOT NULL DEFAULT 90 CHECK (max_ahead_days BETWEEN 7 AND 365),
  ADD COLUMN IF NOT EXISTS close_holidays boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS closed_slots text[] NOT NULL DEFAULT '{}' CHECK (cardinality(closed_slots) <= 500);
COMMENT ON COLUMN public.workshop_settings.closed_slots IS 'Closed days (YYYY-MM-DD) or single slots (YYYY-MM-DDTHH, Stockholm time)';
COMMENT ON COLUMN public.workshop_settings.job_durations IS 'Mirror of price_list minutes, written by Pricing engine';
CREATE OR REPLACE FUNCTION public.workshop_booking_rules(_workshop uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('days', booking_days, 'hours', slot_hours, 'notice', min_notice_days,
    'maxAhead', max_ahead_days, 'holidays', close_holidays, 'closed', closed_slots)
  FROM public.workshop_settings WHERE workshop_id = _workshop
$$;
GRANT EXECUTE ON FUNCTION public.workshop_booking_rules(uuid) TO anon, authenticated;