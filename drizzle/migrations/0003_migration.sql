CREATE TYPE public.contact_channel AS ENUM ('email','sms','whatsapp');
ALTER TABLE public.inquiries
  ADD COLUMN preferred_slots timestamptz[] NOT NULL DEFAULT '{}',
  ADD COLUMN contact_channel public.contact_channel NOT NULL DEFAULT 'sms',
  ADD COLUMN contact_email text NOT NULL DEFAULT '',
  ADD COLUMN booked_at timestamptz;