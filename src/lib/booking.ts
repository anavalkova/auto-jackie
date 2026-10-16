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

export type BookingRules = { weekdays?: number[] | undefined; hours?: number[] | undefined; noticeDays?: number | undefined };

/** weekdays use 0=Sun..6=Sat; noticeDays is at least 1 (never same day). */
export function upcomingDays(from: Date, count = 7, rules: BookingRules = {}): { key: string; slots: Date[] }[] {
  const weekdays = rules.weekdays?.length ? rules.weekdays : [1, 2, 3, 4, 5];
  const hours = rules.hours?.length ? [...rules.hours].sort((a, b) => a - b) : SLOT_HOURS;
  const notice = Math.max(1, rules.noticeDays ?? 1);
  const out: { key: string; slots: Date[] }[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + notice - 1);
  for (let guard = 0; out.length < count && guard < 60; guard++) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!weekdays.includes(d.getUTCDay())) continue;
    out.push({ key: d.toISOString().slice(0, 10), slots: hours.map(h => stockholmTime(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h)) });
  }
  return out;
}

export const slotLabel = (iso: string | Date, locale = "en-GB") =>
  new Date(iso).toLocaleString(locale, { timeZone: "Europe/Stockholm", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
