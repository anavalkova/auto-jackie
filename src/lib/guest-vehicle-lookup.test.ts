import { afterEach, describe, expect, it, vi } from "vitest";
import { handleVehicleLookup } from "@/routes/api/vehicles.lookup";
import { lookupSwedishPlate } from "./vehicles-data/regcheck.server";

vi.mock("./vehicles-data/regcheck.server", () => ({ lookupSwedishPlate: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("guest Swedish plate lookup", () => {
  it("provides vehicle context without registration or an authorization header", async () => {
    vi.stubEnv("REGCHECK_USERNAME", "test-registry-account");
    const hit = { make: "Volvo", model: "V60", year: "2020", engine: "2.0", fuel: "petrol", transmission: "automatic" };
    vi.mocked(lookupSwedishPlate).mockResolvedValue(hit);
    const response = await handleVehicleLookup(new Request("http://localhost/api/vehicles/lookup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plate: "abc 12a" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(hit);
    expect(lookupSwedishPlate).toHaveBeenCalledWith("ABC12A", "test-registry-account");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});