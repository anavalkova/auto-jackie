import { getLang } from "@/lib/i18n";
import { WS } from "@/lib/i18n-ws";

/** Translate an English UI string (workshop/admin/auth screens) into the current language. {name} placeholders are filled from vars. */
export function tr(s: string, vars?: Record<string, string | number>): string {
  const l = getLang();
  let out = l === "en" ? s : (WS[s]?.[l === "sv" ? 0 : 1] ?? s);
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}
