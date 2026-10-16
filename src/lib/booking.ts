/** Bookable drop-off times offered to drivers: next N weekdays (Mon to Fri), fixed Stockholm times. */
export const SLOT_HOURS = [8, 10, 13, 15];
export const MAX_PICKS = 3;

/** Stockholm wall-clock time to a UTC Date (handles summer/winter time). */
export function stockholmTime(y: number, m: number, d: number, h: number): Date {
  const guess = new Date(Date.UTC(y, m, d, h));
  const shown = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (shown.getTime() - asUtc.getTime()));
}

export function upcomingDays(from: Date, count = 7): { key: string; slots: Date[] }[] {
  const out: { key: string; slots: Date[] }[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() + 1); // never same day
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    out.push({ key: d.toISOString().slice(0, 10), slots: SLOT_HOURS.map(h => stockholmTime(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h)) });
  }
  return out;
}

export const slotLabel = (iso: string | Date, locale = "en-GB") =>
  new Date(iso).toLocaleString(locale, { timeZone: "Europe/Stockholm", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
