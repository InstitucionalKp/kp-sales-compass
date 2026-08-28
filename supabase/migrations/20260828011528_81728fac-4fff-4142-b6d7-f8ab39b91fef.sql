CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_config readable by everyone" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_config insertable by everyone" ON public.app_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app_config updatable by everyone" ON public.app_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_app_config() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER app_config_touch BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.touch_app_config();