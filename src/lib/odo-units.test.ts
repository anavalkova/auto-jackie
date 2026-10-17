import { describe, expect, it } from "vitest";
import { kmToOdoUnit, odoInputToKm } from "@/lib/vehicles";
import { odoUnitFor } from "@/lib/i18n";

// Swedish drivers read odometers in mil (1 mil = 10 km); German drivers in km.
describe("odometer units", () => {
  it("treats entered mil as 10 km each", () => {
    expect(odoInputToKm(8400, "mil")).toBe(84000);
    expect(odoInputToKm(1, "mil")).toBe(10);
  });

  it("treats entered km as km", () => {
    expect(odoInputToKm(84000, "km")).toBe(84000);
  });

  it("displays km as mil rounded to whole mil", () => {
    expect(kmToOdoUnit(84000, "mil")).toBe(8400);
    expect(kmToOdoUnit(84005, "mil")).toBe(8401);
    expect(kmToOdoUnit(84005, "km")).toBe(84005);
  });

  it("round-trips a mil reading exactly", () => {
    const km = odoInputToKm(1234, "mil");
    expect(kmToOdoUnit(km, "mil")).toBe(1234);
  });

  it("uses mil for English and Swedish, km for German", () => {
    expect(odoUnitFor("en")).toBe("mil");
    expect(odoUnitFor("sv")).toBe("mil");
    expect(odoUnitFor("de")).toBe("km");
  });
});
