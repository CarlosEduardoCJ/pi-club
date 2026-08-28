CREATE TABLE IF NOT EXISTS public.dev_master_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key text NOT NULL UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.dev_master_attempts TO service_role;
ALTER TABLE public.dev_master_attempts ENABLE ROW LEVEL SECURITY;