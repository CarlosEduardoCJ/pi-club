CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  ip text,
  attempts integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limit_buckets TO service_role;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS rate_limit_buckets_user_endpoint_reset_idx
  ON public.rate_limit_buckets (user_id, endpoint, reset_at);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_ip_endpoint_reset_idx
  ON public.rate_limit_buckets (ip, endpoint, reset_at);
CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_buckets_scope_key_idx
  ON public.rate_limit_buckets (endpoint, COALESCE(user_id::text, ''), COALESCE(ip, ''));