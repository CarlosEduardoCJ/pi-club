import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ATTEMPTS = 3;
const BLOCK_MINUTES = 15;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Constant-time-ish comparison
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const masterPassword = Deno.env.get("DEV_MASTER_PASSWORD");
    if (!masterPassword) {
      return json({ ok: false, error: "Master password não configurada" }, 500);
    }

    const { password } = await req.json().catch(() => ({ password: "" }));

    const clientKey =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data: record } = await supabase
      .from("dev_master_attempts")
      .select("id, attempts, blocked_until")
      .eq("client_key", clientKey)
      .maybeSingle();

    const now = Date.now();
    if (record?.blocked_until && new Date(record.blocked_until).getTime() > now) {
      const minutes = Math.max(
        1,
        Math.ceil((new Date(record.blocked_until).getTime() - now) / 60000)
      );
      return json(
        {
          ok: false,
          blocked: true,
          error: `Muitas tentativas incorretas. Tente novamente em ${minutes} minuto(s).`,
        },
        429
      );
    }

    if (typeof password === "string" && password.length > 0 && safeEqual(password, masterPassword)) {
      if (record) {
        await supabase
          .from("dev_master_attempts")
          .update({ attempts: 0, blocked_until: null, updated_at: new Date().toISOString() })
          .eq("id", record.id);
      }
      return json({ ok: true });
    }

    const attempts = (record?.attempts ?? 0) + 1;
    const blocked = attempts >= MAX_ATTEMPTS;
    const blockedUntil = blocked
      ? new Date(now + BLOCK_MINUTES * 60000).toISOString()
      : null;

    if (record) {
      await supabase
        .from("dev_master_attempts")
        .update({
          attempts: blocked ? 0 : attempts,
          blocked_until: blockedUntil,
          updated_at: new Date().toISOString(),
        })
        .eq("id", record.id);
    } else {
      await supabase.from("dev_master_attempts").insert({
        client_key: clientKey,
        attempts: blocked ? 0 : attempts,
        blocked_until: blockedUntil,
      });
    }

    if (blocked) {
      return json(
        {
          ok: false,
          blocked: true,
          error: `Muitas tentativas incorretas. Acesso bloqueado por ${BLOCK_MINUTES} minutos.`,
        },
        429
      );
    }

    return json(
      {
        ok: false,
        error: `Senha mestra incorreta. Tentativas restantes: ${MAX_ATTEMPTS - attempts}.`,
      },
      401
    );
  } catch (_err) {
    return json({ ok: false, error: "Erro ao validar a senha mestra." }, 500);
  }
});
