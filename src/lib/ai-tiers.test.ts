import { describe, expect, it } from "vitest";
import { asTier, DEFAULT_TIERS, tierModel } from "./ai-tiers";

describe("AI tiers", () => {
  it("defaults keep chat cheap and quotes on the stronger model", () => {
    expect(tierModel(DEFAULT_TIERS.chat).model).toBe("openai/gpt-5.6-luna");
    expect(tierModel(DEFAULT_TIERS.quote).model).toBe("openai/gpt-6-astra");
  });
  it("unknown tier values fall back instead of picking an arbitrary model", () => {
    expect(asTier("gpt-9-anything", "economy")).toBe("economy");
  });
  it("premium thinks harder than balanced", () => {
    expect(tierModel("premium").effort).toBe("medium");
    expect(tierModel("balanced").effort).toBe("low");
  });
});
