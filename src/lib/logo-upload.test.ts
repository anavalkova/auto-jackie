import { describe, expect, it } from "vitest";
import { logoError } from "@/components/workshop-dashboard";

describe("logo upload rules", () => {
  it("rejects SVG", () => expect(logoError({ type: "image/svg+xml", size: 100 })).not.toBeNull());
  it("rejects files over 2 MB", () => expect(logoError({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).not.toBeNull());
  it("accepts a small PNG", () => expect(logoError({ type: "image/png", size: 50_000 })).toBeNull());
});
