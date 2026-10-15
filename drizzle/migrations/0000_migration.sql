CREATE TABLE public.saved_vehicles (
  user_id uuid PRIMARY KEY,
  vehicle jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_vehicles TO authenticated;
GRANT ALL ON public.saved_vehicles TO service_role;
ALTER TABLE public.saved_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vehicle select" ON public.saved_vehicles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own vehicle insert" ON public.saved_vehicles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vehicle update" ON public.saved_vehicles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own vehicle delete" ON public.saved_vehicles FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chats_user_updated ON public.chats (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT ALL ON public.chats TO service_role;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chats select" ON public.chats FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own chats insert" ON public.chats FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own chats update" ON public.chats FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own chats delete" ON public.chats FOR DELETE TO authenticated USING (auth.uid() = user_id);