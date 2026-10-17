import { describe, expect, it, vi } from "vitest";
import { saveWorkshopConfiguration } from "./configuration-save";

describe("workshop configuration saving", () => {
  it("never persists demo edits, including for an owner", async () => {
    const persist = vi.fn(async () => {});
    await saveWorkshopConfiguration(true, true, persist);
    expect(persist).not.toHaveBeenCalled();
  });
  it("keeps non-owner configuration read-only", async () => {
    const persist = vi.fn(async () => {});
    await saveWorkshopConfiguration(false, false, persist);
    expect(persist).not.toHaveBeenCalled();
  });
  it("saves a real owner's configuration once", async () => {
    const persist = vi.fn(async () => {});
    await saveWorkshopConfiguration(true, false, persist);
    expect(persist).toHaveBeenCalledTimes(1);
  });
});