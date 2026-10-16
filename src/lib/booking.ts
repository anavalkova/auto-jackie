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

export type BookingRules = {
  weekdays?: number[] | undefined; hours?: number[] | undefined; noticeDays?: number | undefined;
  /** Last bookable day, counted from today. */
  maxAheadDays?: number | undefined;
  /** Skip Swedish public holidays (röda dagar). */
  closeHolidays?: boolean | undefined;
  /** "YYYY-MM-DD" closes a whole day, "YYYY-MM-DDTHH" closes one drop-off time. */
  closed?: string[] | undefined;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const plus = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Easter Sunday (Gregorian, anonymous algorithm). */
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month - 1, day);
}
/** First given weekday (0=Sun) on or after a date. */
const onOrAfter = (d: Date, wd: number) => plus(d, (wd - d.getUTCDay() + 7) % 7);

/** Swedish public holidays plus the eves workshops normally close (midsommarafton, julafton, nyårsafton). */
export function swedishHolidays(y: number): Map<string, string> {
  const e = easter(y);
  const list: [Date, string][] = [
    [utc(y, 0, 1), "New Year's Day"], [utc(y, 0, 6), "Epiphany"],
    [plus(e, -2), "Good Friday"], [plus(e, 1), "Easter Monday"], [utc(y, 4, 1), "May Day"],
    [plus(e, 39), "Ascension Day"], [utc(y, 5, 6), "National Day"],
    [plus(onOrAfter(utc(y, 5, 19), 6), -1), "Midsummer Eve"], [onOrAfter(utc(y, 5, 20), 6), "Midsummer Day"],
    [onOrAfter(utc(y, 9, 31), 6), "All Saints' Day"],
    [utc(y, 11, 24), "Christmas Eve"], [utc(y, 11, 25), "Christmas Day"], [utc(y, 11, 26), "Boxing Day"], [utc(y, 11, 31), "New Year's Eve"],
  ];
  return new Map(list.map(([d, n]) => [iso(d), n]));
}
export function holidayName(key: string): string | undefined {
  return swedishHolidays(Number(key.slice(0, 4))).get(key);
}

/** weekdays use 0=Sun..6=Sat; noticeDays is at least 1 (never same day). */
export function upcomingDays(from: Date, count = 7, rules: BookingRules = {}): { key: string; slots: Date[] }[] {
  const weekdays = rules.weekdays?.length ? rules.weekdays : [1, 2, 3, 4, 5];
  const hours = rules.hours?.length ? [...rules.hours].sort((a, b) => a - b) : SLOT_HOURS;
  const notice = Math.max(1, rules.noticeDays ?? 1);
  const maxAhead = rules.maxAheadDays ?? 365;
  const closed = new Set(rules.closed ?? []);
  const out: { key: string; slots: Date[] }[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + notice - 1);
  for (let ahead = notice; out.length < count && ahead <= maxAhead; ahead++) {
    d.setUTCDate(d.getUTCDate() + 1);
    const key = iso(d);
    if (!weekdays.includes(d.getUTCDay()) || closed.has(key) || (rules.closeHolidays && holidayName(key))) continue;
    const open = hours.filter(h => !closed.has(`${key}T${String(h).padStart(2, "0")}`));
    if (!open.length) continue;
    out.push({ key, slots: open.map(h => stockholmTime(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h)) });
  }
  return out;
}

export const slotLabel = (iso: string | Date, locale = "en-GB") =>
  new Date(iso).toLocaleString(locale, { timeZone: "Europe/Stockholm", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
