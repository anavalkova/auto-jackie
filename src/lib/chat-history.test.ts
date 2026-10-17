import { expect, it } from "vitest";
import { chatHistoryRange } from "./chat-history";
it("pages history without gaps or overlapping chats", () => {
  expect(chatHistoryRange(0)).toEqual({ from: 0, to: 4 });
  expect(chatHistoryRange(1)).toEqual({ from: 5, to: 9 });
  expect(chatHistoryRange(10)).toEqual({ from: 50, to: 54 });
});