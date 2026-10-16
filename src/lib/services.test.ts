import { describe, expect, it } from "vitest";
import { ensureOther, matchService, OTHER } from "./services";

const list = [{ task: "Brake pads, front", price_sek: 1900 }, { task: "Tyre change", price_sek: 500 }, { task: OTHER, price_sek: 0 }];

describe("workshop services", () => {
  it("always keeps an Other service with 0 price", () => {
    expect(ensureOther([{ task: "Tyre change", price_sek: 500 }]).at(-1)).toEqual({ task: "Other", price_sek: 0, minutes: 60 });
    expect(ensureOther(list).filter(s => s.task === OTHER)).toHaveLength(1);
  });
  it("maps a reworded request to the configured service", () => {
    expect(matchService("Front brake pads", list)).toBe("Brake pads, front");
  });
  it("falls back to Other when nothing matches", () => {
    expect(matchService("Strange rattle in the boot", list)).toBe("Other");
  });
});
