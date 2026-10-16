// Server function that reports how many chat questions are left this month.
// Reads the same chat_quota table /api/chat counts against; never consumes a question.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { quotaLimit } from "./chat-quota";

async function signedInUserId(): Promise<string | null> {
  const token = getRequestHeader("authorization")?.replace(/^Bearer /, "") ?? "";
  const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || token.split(".").length !== 3 || !url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json().catch(() => null)) as { id?: string } | null)?.id ?? null;
}

// Same key /api/chat uses, so an incognito window or new browser does not reset the count.
async function guestKey(): Promise<string> {
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`autojackie-guest:${ip}`));
  return "g:" + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export type ChatQuotaStatus = { signedIn: boolean; limit: number; remaining: number };

export const chatQuotaStatus = createServerFn({ method: "GET" }).handler(async (): Promise<ChatQuotaStatus> => {
  try {
    const userId = await signedInUserId();
    const limit = quotaLimit(!!userId);
    const key = userId ? `u:${userId}` : await guestKey();
    const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit" }).format(new Date());
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("chat_quota").select("used").eq("key", key).eq("month", month).maybeSingle();
    const used = data?.used ?? 0;
    return { signedIn: !!userId, limit, remaining: Math.max(0, limit - used) };
  } catch {
    // Never block the composer because the counter failed; the chat route still enforces limits.
    return { signedIn: false, limit: quotaLimit(false), remaining: quotaLimit(false) };
  }
});
