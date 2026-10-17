import { describe, expect, it } from "vitest";
import { shouldExploreDemo } from "./workshop-access";

describe("demo workspace access", () => {
  it("opens read-only demo exploration for a signed-in visitor without workspace access", () => {
    expect(shouldExploreDemo(0)).toBe(true);
  });
  it("keeps the sole owner's two workspaces in the normal workspace flow", () => {
    expect(shouldExploreDemo(2)).toBe(false);
  });
});