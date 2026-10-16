import { describe, expect, it } from "vitest";
import { upcomingDays } from "@/lib/booking";

describe("booking slots", () => {
  it("skips today and weekends", () => {
    const days = upcomingDays(new Date("2026-10-16T10:00:00Z"), 3); // Friday
    expect(days.map(d => d.key)).toEqual(["2026-10-19", "2026-10-20", "2026-10-21"]);
  });
  it("uses Stockholm time (08:00 CEST = 06:00 UTC)", () => {
    expect(upcomingDays(new Date("2026-10-16T10:00:00Z"), 1)[0]!.slots[0]!.toISOString()).toBe("2026-10-19T06:00:00.000Z");
  });
});

describe("workshop booking rules", () => {
  it("only offers the workshop's chosen weekdays", () => {
    const days = upcomingDays(new Date("2026-10-16T10:00:00Z"), 2, { weekdays: [2, 4] });
    expect(days.map(d => d.key)).toEqual(["2026-10-20", "2026-10-22"]);
  });
  it("respects minimum notice days", () => {
    expect(upcomingDays(new Date("2026-10-19T10:00:00Z"), 1, { noticeDays: 3 })[0]!.key).toBe("2026-10-22");
  });
  it("uses the workshop's own times", () => {
    expect(upcomingDays(new Date("2026-10-16T10:00:00Z"), 1, { hours: [9] })[0]!.slots).toHaveLength(1);
  });
});

import { swedishHolidays } from "@/lib/booking";
describe("closures", () => {
  it("knows Swedish holidays for 2026", () => {
    const h = swedishHolidays(2026);
    expect(h.get("2026-04-03")).toBe("Good Friday");
    expect(h.get("2026-06-19")).toBe("Midsummer Eve");
    expect(h.get("2026-10-31")).toBe("All Saints' Day");
  });
  it("skips holidays when asked", () => {
    expect(upcomingDays(new Date("2026-12-23T10:00:00Z"), 1, { closeHolidays: true })[0]!.key).toBe("2026-12-28");
  });
  it("skips a closed day and a closed slot", () => {
    const d = upcomingDays(new Date("2026-10-16T10:00:00Z"), 2, { closed: ["2026-10-19", "2026-10-20T08"] });
    expect(d[0]!.key).toBe("2026-10-20");
    expect(d[0]!.slots).toHaveLength(3);
  });
  it("stops at the booking horizon", () => {
    expect(upcomingDays(new Date("2026-10-16T10:00:00Z"), 30, { maxAheadDays: 7 })).toHaveLength(5);
  });
});
