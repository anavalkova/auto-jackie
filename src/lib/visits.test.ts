import { describe, expect, it } from "vitest";
import { VISITS_PAGE_SIZE, isPast, isUpcoming, splitVisits, toVisit, type InquiryRow } from "./visits";

const NOW = new Date("2026-03-10T09:00:00Z");

const row = (over: Partial<InquiryRow>): InquiryRow => ({
  id: crypto.randomUUID(), issue: "Brake pads", service: "Brake pads, front", status: "new",
  booked_at: null, created_at: "2026-03-01T08:00:00Z", workshops: { name: "Demo Verkstad" }, ...over,
});

describe("driver visits", () => {
  it("splits a confirmed future drop-off from a finished one", () => {
    const upcoming = toVisit(row({ status: "booked", booked_at: "2026-03-20T07:00:00Z" }));
    const finished = toVisit(row({ status: "booked", booked_at: "2026-02-02T07:00:00Z" }));
    const waiting = toVisit(row({ status: "new" }));
    const closed = toVisit(row({ status: "closed" }));

    expect(isUpcoming(upcoming, NOW)).toBe(true);
    expect(isUpcoming(finished, NOW)).toBe(false);
    expect(isPast(finished, NOW)).toBe(true);
    expect(isPast(closed, NOW)).toBe(true);
    expect(isPast(waiting, NOW)).toBe(false);

    const split = splitVisits([waiting, finished, upcoming, closed], NOW);
    expect(split.upcoming.map(v => v.id)).toEqual([upcoming.id]);
    expect(split.past.map(v => v.id)).toEqual([finished.id, closed.id]);
    expect(split.waiting).toBe(1);
  });

  it("lists the next visit first and the most recent finished visit first", () => {
    const later = toVisit(row({ status: "booked", booked_at: "2026-04-01T07:00:00Z" }));
    const sooner = toVisit(row({ status: "booked", booked_at: "2026-03-15T07:00:00Z" }));
    const olderVisit = toVisit(row({ status: "booked", booked_at: "2026-01-05T07:00:00Z" }));
    const split = splitVisits([later, olderVisit, sooner], NOW);
    expect(split.upcoming.map(v => v.bookedAt)).toEqual(["2026-03-15T07:00:00Z", "2026-04-01T07:00:00Z"]);
    expect(split.past.map(v => v.bookedAt)).toEqual(["2026-01-05T07:00:00Z"]);
  });

  it("keeps a closed visit with a future time out of the upcoming list", () => {
    const cancelled = toVisit(row({ status: "closed", booked_at: "2026-03-20T07:00:00Z" }));
    const split = splitVisits([cancelled], NOW);
    expect(split.upcoming).toHaveLength(0);
    expect(split.past.map(v => v.id)).toEqual([cancelled.id]);
  });

  it("shows three visits per page", () => {
    expect(VISITS_PAGE_SIZE).toBe(3);
  });
});
