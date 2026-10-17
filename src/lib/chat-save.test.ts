import { expect, it, vi } from "vitest";
import { createChatSaver } from "./chat-save";

it("saves a draft and its completed answer as one history record", async () => {
  const saver = createChatSaver();
  const records = new Map<string, string[]>();
  const write = vi.fn(async (id: string | null, messages: string[]) => {
    await Promise.resolve();
    const savedId = id ?? `chat-${records.size + 1}`;
    records.set(savedId, messages);
    return savedId;
  });
  const draft = saver.save(["one question"], write);
  const completed = saver.save(["one question", "Jackie's answer"], write);
  expect(await draft).toBe(await completed);
  expect(records.size).toBe(1);
  expect(records.get("chat-1")).toEqual(["one question", "Jackie's answer"]);
  expect(write.mock.calls.map(call => call[0])).toEqual([null, "chat-1"]);
});

it("updates the same workshop conversation for overlapping turns", async () => {
  const saver = createChatSaver();
  const write = vi.fn(async (id: string | null, turn: number) => id ?? `workshop-chat-${turn}`);
  expect(await Promise.all([saver.save(1, write), saver.save(2, write)])).toEqual(["workshop-chat-1", "workshop-chat-1"]);
  expect(write.mock.calls[1]?.[0]).toBe("workshop-chat-1");
});

it("never inserts a new record for a saved conversation", async () => {
  const saver = createChatSaver("existing-chat");
  const write = vi.fn(async (id: string | null) => id ?? "duplicate");
  expect(await saver.save("follow-up", write)).toBe("existing-chat");
  expect(write).toHaveBeenCalledWith("existing-chat", "follow-up");
});

it("allows retrying a failed save without blocking the conversation", async () => {
  const saver = createChatSaver();
  await expect(saver.save("draft", async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  expect(await saver.save("retry", async id => id ?? "saved-chat")).toBe("saved-chat");
});