CREATE TABLE public.chat_quota (
  key text NOT NULL,
  month text NOT NULL,
  used int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, month)
);
GRANT ALL ON public.chat_quota TO service_role;
ALTER TABLE public.chat_quota ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_chat_quota(_key text, _limit int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text := to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM'); n int;
BEGIN
  INSERT INTO public.chat_quota(key, month, used) VALUES (_key, m, 1)
  ON CONFLICT (key, month) DO UPDATE SET used = chat_quota.used + 1
  WHERE chat_quota.used < _limit
  RETURNING used INTO n;
  IF n IS NULL THEN RETURN -1; END IF;
  RETURN _limit - n;
END $$;
REVOKE ALL ON FUNCTION public.consume_chat_quota(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota(text, int) TO service_role;