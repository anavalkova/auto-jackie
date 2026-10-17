type Lang = "en" | "sv" | "de";
export type BookingEmail = { to: string; name: string; workshop: string; job: string; vehicle: string; at: string; lang: Lang; rescheduled?: boolean };

const T = {
  en: { s: "Your visit at %w is booked", rs: "Your new time at %w is booked", hi: "Hi %n,", body: "Your drop-off time is booked.", rbody: "Your visit has been moved to a new drop-off time.", when: "Drop-off", job: "Job", car: "Car", bye: "See you soon! Sent by Jackie on behalf of %w." },
  sv: { s: "Ditt besök hos %w är bokat", rs: "Din nya tid hos %w är bokad", hi: "Hej %n,", body: "Din lämningstid är bokad.", rbody: "Ditt besök har flyttats till en ny lämningstid.", when: "Lämning", job: "Jobb", car: "Bil", bye: "Vi ses! Skickat av Jackie för %w." },
  de: { s: "Dein Termin bei %w ist gebucht", rs: "Deine neue Zeit bei %w ist gebucht", hi: "Hallo %n,", body: "Deine Abgabezeit ist gebucht.", rbody: "Dein Termin wurde auf eine neue Abgabezeit verschoben.", when: "Abgabe", job: "Auftrag", car: "Auto", bye: "Bis bald! Gesendet von Jackie für %w." },
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
  const row = (k: string, v: string) => v ? `<tr><td style="color:#777;padding:4px 16px 4px 0">${k}</td><td><strong>${esc(v)}</strong></td></tr>` : "";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:520px">
<p>${t.hi.replace("%n", esc(b.name || ""))}</p><p>${b.rescheduled ? t.rbody : t.body}</p>
<table>${row(t.when, when)}${row(t.job, b.job)}${row(t.car, b.vehicle)}</table>
<p style="color:#777;font-size:13px">${t.bye.replace("%w", w)}</p></div>`;
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
