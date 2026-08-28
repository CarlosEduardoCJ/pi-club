import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Rule = { limit: number; windowSeconds: number; scope: "ip" | "user" };

const RULES: Record<string, Rule> = {
  auth: { limit: 5, windowSeconds: 15 * 60, scope: "ip" },
  post: { limit: 10, windowSeconds: 60 * 60, scope: "user" },
  direct_message: { limit: 30, windowSeconds: 60 * 60, scope: "user" },
  club_chat: { limit: 50, windowSeconds: 60 * 60, scope: "user" },
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const rule = RULES[endpoint];
    if (!rule) {
      return json({ ok: false, remaining: 0, retry_after: 0, error: "Endpoint inválido." });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const userId =
      typeof body.user_id === "string" && /^[0-9a-f-]{36}$/i.test(body.user_id)
        ? body.user_id
        : null;

    // Never trust a client-supplied IP; user scope requires an identified user.
    if (rule.scope === "user" && !userId) {
      return json({ ok: false, remaining: 0, retry_after: 0, error: "Usuário não identificado." });
    }

    const keyUser = rule.scope === "user" ? userId : null;
    const keyIp = rule.scope === "ip" ? ip : null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let query = supabase
      .from("rate_limit_buckets")
      .select("id, attempts, reset_at")
      .eq("endpoint", endpoint);
    query = keyUser ? query.eq("user_id", keyUser) : query.is("user_id", null);
    query = keyIp ? query.eq("ip", keyIp) : query.is("ip", null);

    const { data: bucket } = await query.maybeSingle();

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const newResetAt = new Date(now + rule.windowSeconds * 1000).toISOString();

    // Expired or missing bucket: start a fresh window with this attempt counted.
    if (!bucket || new Date(bucket.reset_at).getTime() <= now) {
      if (bucket) {
        await supabase
          .from("rate_limit_buckets")
          .update({ attempts: 1, reset_at: newResetAt, updated_at: nowIso })
          .eq("id", bucket.id);
      } else {
        await supabase.from("rate_limit_buckets").insert({
          user_id: keyUser,
          ip: keyIp,
          endpoint,
          attempts: 1,
          reset_at: newResetAt,
        });
      }
      return json({ ok: true, remaining: rule.limit - 1, retry_after: 0 });
    }

    const retryAfter = Math.max(1, Math.ceil((new Date(bucket.reset_at).getTime() - now) / 1000));

    if (bucket.attempts >= rule.limit) {
      return json({ ok: false, remaining: 0, retry_after: retryAfter });
    }

    const attempts = bucket.attempts + 1;
    await supabase
      .from("rate_limit_buckets")
      .update({ attempts, updated_at: nowIso })
      .eq("id", bucket.id);

    return json({ ok: true, remaining: Math.max(0, rule.limit - attempts), retry_after: retryAfter });
  } catch (_err) {
    // Fail open so a limiter outage never blocks legitimate usage.
    return json({ ok: true, remaining: 0, retry_after: 0 });
  }
});
