import { describe, expect, it } from "vitest";
import { quotaLimit } from "./chat-quota";

describe("chat quota", () => {
  it("guests get 5 questions a month", () => expect(quotaLimit(false)).toBe(5));
  it("signed-in drivers get 50 questions a month", () => expect(quotaLimit(true)).toBe(50));
});
