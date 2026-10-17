import { describe, expect, it } from "vitest";
import { selectWorkshop } from "./workshop-selection";

const workshops = [{ id: "demo", slug: "demo-verkstad" }, { id: "dev", slug: "dev-verkstad" }];
describe("latest workshop selection", () => {
  it("uses the last selected tenant when the user has more than one", () => {
    expect(selectWorkshop(workshops, "dev")?.slug).toBe("dev-verkstad");
  });
  it("ignores a remembered tenant outside the user's memberships", () => {
    expect(selectWorkshop(workshops, "another-tenant")?.id).toBe("demo");
  });
  it("selects the only membership", () => {
    expect(selectWorkshop([workshops[1]], "demo")?.id).toBe("dev");
  });
  it("does not select a tenant without a membership", () => {
    expect(selectWorkshop([], "dev")).toBeNull();
  });
});