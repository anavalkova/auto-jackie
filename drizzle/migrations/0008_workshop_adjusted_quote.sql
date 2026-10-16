ALTER TABLE public.inquiries
  ADD COLUMN IF NOT EXISTS quote_low_sek integer CHECK (quote_low_sek IS NULL OR quote_low_sek BETWEEN 0 AND 500000),
  ADD COLUMN IF NOT EXISTS quote_high_sek integer CHECK (quote_high_sek IS NULL OR quote_high_sek BETWEEN 0 AND 500000);