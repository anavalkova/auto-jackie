import { describe, expect, it } from "vitest";
import { demoInquiries, demoSettings, DEMO_TEAM } from "./workshop-demo";

describe("judging workshop examples", () => {
  const now = new Date("2026-10-17T16:01:00Z");
  it("covers every request status and both known and unoffered services", () => {
    const rows = demoInquiries("demo", "en", now);
    expect(new Set(rows.map(r => r.status))).toEqual(new Set(["new", "contacted", "quoted", "booked", "closed"]));
    expect(rows.filter(r => r.service === "Other").length).toBeGreaterThan(0);
    expect(rows.filter(r => r.service === "Annual service").length).toBeGreaterThan(0);
  });
  it("keeps all example contacts fictional without private vehicle details", () => {
    const rows = demoInquiries("demo", "en", now);
    expect(rows.every(r => r.contact_email.endsWith("@example.com") && r.vehicle_label === "")).toBe(true);
    expect(DEMO_TEAM.every(m => m.email.endsWith("@example.com"))).toBe(true);
  });
  it("shows future confirmed visits and historical visits as dates move", () => {
    for (const date of [now, new Date("2027-07-19T12:00:00Z")]) {
      const rows = demoInquiries("demo", "en", date);
      expect(rows.filter(r => r.status === "booked").every(r => r.booked_at && new Date(r.booked_at) > date)).toBe(true);
      expect(rows.filter(r => r.status === "closed").every(r => r.booked_at && new Date(r.booked_at) < date)).toBe(true);
      expect(demoSettings("demo", "en", date).closed_slots).toHaveLength(2);
    }
  });
  it("demonstrates team roles without creating access records", () => {
    expect(DEMO_TEAM.map(m => m.role)).toEqual(["owner", "staff"]);
  });
});