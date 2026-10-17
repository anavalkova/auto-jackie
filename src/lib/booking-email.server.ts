type Lang = "en" | "sv" | "de";
export type BookingEmail = { workshopId?: string | undefined; to: string; name: string; workshop: string; job: string; vehicle: string; at: string; lang: Lang; rescheduled?: boolean };

const T = {
  en: { s: "Your visit at %w is booked", rs: "Your new time at %w is booked", hi: "Hi %n,", body: "Your drop-off time is booked.", rbody: "Your visit has been moved to a new drop-off time.", when: "Drop-off", job: "Job", car: "Car", bye: "See you soon! Sent by Jackie on behalf of %w.", tag: "Jackie booked you in", tip: "Bring your car, your key and nothing to worry about. Need another time? Reschedule under My visits.", cta: "Open My visits" },
  sv: { s: "Ditt besök hos %w är bokat", rs: "Din nya tid hos %w är bokad", hi: "Hej %n,", body: "Din lämningstid är bokad.", rbody: "Ditt besök har flyttats till en ny lämningstid.", when: "Lämning", job: "Jobb", car: "Bil", bye: "Vi ses! Skickat av Jackie för %w.", tag: "Jackie har bokat in dig", tip: "Ta med bilen, nyckeln och inga bekymmer. Behöver du en annan tid? Boka om under Mina besök.", cta: "Öppna Mina besök" },
  de: { s: "Dein Termin bei %w ist gebucht", rs: "Deine neue Zeit bei %w ist gebucht", hi: "Hallo %n,", body: "Deine Abgabezeit ist gebucht.", rbody: "Dein Termin wurde auf eine neue Abgabezeit verschoben.", when: "Abgabe", job: "Auftrag", car: "Auto", bye: "Bis bald! Gesendet von Jackie für %w.", tag: "Jackie hat dich eingetragen", tip: "Bring dein Auto, den Schlüssel und keine Sorgen mit. Andere Zeit nötig? Umbuchen unter Meine Besuche.", cta: "Meine Besuche öffnen" },
};
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

/** Sends the booking confirmation through Resend. Never throws: a failed email must not undo a saved booking. */
export async function sendBookingEmail(b: BookingEmail): Promise<boolean> {
  const lk = process.env["LOVABLE_API_KEY"], rk = process.env["RESEND_API_KEY"];
  if (!lk || !rk || !b.to) return false;
  const t = T[b.lang] ?? T.en;
  const locale = b.lang === "en" ? "en-GB" : b.lang;
  const when = new Date(b.at).toLocaleString(locale, { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const w = esc(b.workshop);
  const brand = await brandOf(b.workshopId);
  const c = brand.accent;
  const row = (k: string, v: string) => v ? `<tr><td style="padding:10px 0;color:#8a8580;font-size:13px;text-transform:uppercase;letter-spacing:.06em;width:110px">${k}</td><td style="padding:10px 0;font-size:16px;color:#1f1d1b"><strong>${esc(v)}</strong></td></tr>` : "";
  const link = brand.slug ? `https://auto-jackie.lovable.app/w/${brand.slug}` : "https://auto-jackie.lovable.app";
  const html = `<div style="background:#f6f3ef;padding:32px 12px;font-family:Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ebe5de">
<div style="background:${c};padding:24px 28px;color:#ffffff">
<table role="presentation"><tr><td style="width:40px;height:40px;background:#ffffff;border-radius:11px;text-align:center;vertical-align:middle;color:${c};font-weight:800;font-size:22px">J</td>
<td style="padding-left:12px;font-size:18px;font-weight:700">${w}</td></tr></table>
<p style="margin:18px 0 0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85">${t.tag}</p>
<p style="margin:4px 0 0;font-size:24px;font-weight:700;line-height:1.25">${b.rescheduled ? t.rbody : t.body}</p></div>
<div style="padding:24px 28px">
<p style="margin:0 0 12px;font-size:16px;color:#1f1d1b">${t.hi.replace("%n", esc(b.name || ""))}</p>
<table role="presentation" style="width:100%;border-top:1px solid #f0ebe5;border-bottom:1px solid #f0ebe5">${row(t.when, when)}${row(t.job, b.job)}${row(t.car, b.vehicle)}</table>
<p style="margin:18px 0;font-size:15px;color:#4a4642;line-height:1.5">${t.tip}</p>
<a href="${link}" style="display:inline-block;background:${c};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px">${t.cta}</a></div>
<div style="padding:16px 28px;background:#faf8f5;color:#8a8580;font-size:12px">${t.bye.replace("%w", w)} · <span style="color:#f26b1d;font-weight:700">AutoJackie</span></div>
</div></div>`;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": rk },
      body: JSON.stringify({ from: `${b.workshop.replace(/[<>"]/g, "")} via AutoJackie <onboarding@resend.dev>`, to: [b.to], subject: (b.rescheduled ? t.rs : t.s).replace("%w", b.workshop), html }),
    });
    if (!res.ok) console.error(`Resend failed [${res.status}]: ${await res.text()}`);
    return res.ok;
  } catch (e) { console.error("Resend error", e); return false; }
}

async function brandOf(id?: string): Promise<{ accent: string; slug: string }> {
  const fallback = { accent: "#f26b1d", slug: "" };
  if (!id) return fallback;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("workshops").select("slug, workshop_settings(brand_accent)").eq("id", id).maybeSingle();
    const s = data?.workshop_settings as { brand_accent?: string | null } | { brand_accent?: string | null }[] | null;
    const accent = (Array.isArray(s) ? s[0] : s)?.brand_accent ?? "";
    return { accent: /^#[0-9a-f]{3,8}$/i.test(accent) ? accent : fallback.accent, slug: data?.slug ?? "" };
  } catch { return fallback; }
}
