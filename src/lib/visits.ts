/** The driver's own visits: booked drop-off times ahead, finished ones behind. */
export const VISITS_PAGE_SIZE = 3;

export type VisitRow = {
  id: string;
  issue: string;
  service: string | null;
  status: string;
  bookedAt: string | null;
  createdAt: string;
  workshopName: string;
};

/** A row as it comes back from the requests table. */
export type InquiryRow = {
  id: string;
  issue: string;
  service: string | null;
  status: string;
  booked_at: string | null;
  created_at: string;
  workshops: { name: string } | null;
};

export function toVisit(r: InquiryRow): VisitRow {
  return {
    id: r.id,
    issue: r.issue,
    service: r.service,
    status: r.status,
    bookedAt: r.booked_at,
    createdAt: r.created_at,
    workshopName: r.workshops?.name ?? "",
  };
}

/** A drop-off time the workshop has confirmed and that has not passed yet. */
export function isUpcoming(v: VisitRow, now: Date): boolean {
  return v.status !== "closed" && !!v.bookedAt && new Date(v.bookedAt).getTime() > now.getTime();
}

/** A visit that happened, or a request the workshop closed without a time. */
export function isPast(v: VisitRow, now: Date): boolean {
  return !isUpcoming(v, now) && (!!v.bookedAt || v.status === "closed");
}

export function splitVisits(rows: VisitRow[], now: Date): { upcoming: VisitRow[]; past: VisitRow[]; waiting: number } {
  const upcoming = rows.filter(v => isUpcoming(v, now)).sort((a, b) => new Date(a.bookedAt!).getTime() - new Date(b.bookedAt!).getTime());
  const past = rows.filter(v => isPast(v, now)).sort((a, b) => new Date(b.bookedAt ?? b.createdAt).getTime() - new Date(a.bookedAt ?? a.createdAt).getTime());
  return { upcoming, past, waiting: rows.length - upcoming.length - past.length };
}

/** How many pages of past visits are hidden behind "show more". */
export function pastPages(shown: number, total: number): number {
  return Math.max(1, Math.ceil(total / VISITS_PAGE_SIZE));
}
