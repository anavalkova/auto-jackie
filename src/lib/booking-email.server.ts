type Lang = "en" | "sv" | "de";
export type BookingEmail = { workshopId?: string | undefined; to: string; name: string; workshop: string; job: string; vehicle: string; at: string; lang: Lang; rescheduled?: boolean };

const T = {
  en: { s: "Your visit at %w is booked", rs: "Your new time at %w is booked", hi: "Hi %n,", body: "Your drop-off time is booked.", rbody: "Your visit has been moved to a new drop-off time.", when: "Drop-off", job: "Job", car: "Car", bye: "See you soon! Sent by Jackie on behalf of %w.", tag: "Jackie booked you in", tip: "Bring your car, your key and nothing to worry about. Need another time? Reschedule under My visits.", cta: "Open My visits" },
  sv: { s: "Ditt besök hos %w är bokat", rs: "Din nya tid hos %w är bokad", hi: "Hej %n,", body: "Din lämningstid är bokad.", rbody: "Ditt besök har flyttats till en ny lämningstid.", when: "Lämning", job: "Jobb", car: "Bil", bye: "Vi ses! Skickat av Jackie för %w.", tag: "Jackie har bokat in dig", tip: "Ta med bilen, nyckeln och inga bekymmer. Behöver du en annan tid? Boka om under Mina besök.", cta: "Öppna Mina besök" },
  de: { s: "Dein Termin bei %w ist gebucht", rs: "Deine neue Zeit bei %w ist gebucht", hi: "Hallo %n,", body: "Deine Abgabezeit ist gebucht.", rbody: "Dein Termin wurde auf eine neue Abgabezeit verschoben.", when: "Abgabe", job: "Auftrag", car: "Auto", bye: "Bis bald! Gesendet von Jackie für %w.", tag: "Jackie hat dich eingetragen", tip: "Bring dein Auto, den Schlüssel und keine Sorgen mit. Andere Zeit nötig? Umbuchen unter Meine Besuche.", cta: "Meine Besuche öffnen" },
};

/** Sends the booking confirmation through the app's email sender. Never throws: a failed email must not undo a saved booking. */
export async function sendBookingEmail(b: BookingEmail): Promise<boolean> {
  if (!b.to) return false;
  const t = T[b.lang] ?? T.en;
  const locale = b.lang === "en" ? "en-GB" : b.lang;
  const when = new Date(b.at).toLocaleString(locale, { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const brand = await brandOf(b.workshopId);
  const link = brand.slug ? `https://auto-jackie.lovable.app/w/${brand.slug}` : "https://auto-jackie.lovable.app";
  try {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const r = await sendTemplateEmail("booking-confirmation", b.to, {
      idempotencyKey: `booking-confirmation-${b.workshopId ?? "x"}-${b.to.toLowerCase()}-${b.at}-${b.rescheduled ? "r" : "n"}`,
      templateData: {
        subject: (b.rescheduled ? t.rs : t.s).replace("%w", b.workshop), lang: b.lang, accent: brand.accent, workshop: b.workshop || "AutoJackie",
        tag: t.tag, headline: b.rescheduled ? t.rbody : t.body, hi: t.hi.replace("%n", b.name || ""),
        rows: [{ k: t.when, v: when }, { k: t.job, v: b.job }, { k: t.car, v: b.vehicle }], tip: t.tip, cta: t.cta, link, bye: t.bye.replace("%w", b.workshop),
      },
    });
    return r.sent;
  } catch (e) { console.error("Booking email failed", e); return false; }
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
