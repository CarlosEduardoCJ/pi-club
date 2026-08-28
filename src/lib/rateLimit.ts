import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RateLimitEndpoint = "auth" | "post" | "direct_message" | "club_chat";

type RateLimitResponse = {
  ok: boolean;
  remaining: number;
  retry_after?: number;
  error?: string;
};

const formatWait = (seconds: number) => {
  if (seconds <= 90) return `${seconds} segundos`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto(s)`;
};

/**
 * Checks the server-side rate limit for an action.
 * Returns true when the action may proceed. Shows a toast when blocked.
 * Fails open when the limiter is unreachable.
 */
export const checkRateLimit = async (
  endpoint: RateLimitEndpoint,
  userId?: string | null
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke<RateLimitResponse>("check-rate-limit", {
      body: { endpoint, user_id: userId ?? null },
    });

    if (error || !data) return true;
    if (data.ok) return true;

    if (data.error) {
      toast.error(data.error);
      return false;
    }

    toast.error(`Muitas tentativas. Tente novamente em ${formatWait(data.retry_after || 60)}.`);
    return false;
  } catch {
    return true;
  }
};
