import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatQuota } from "./use-chat-quota";

const { readQuota } = vi.hoisted(() => ({ readQuota: vi.fn() }));
vi.mock("@/lib/chat-quota.functions", () => ({ chatQuotaStatus: readQuota }));

describe("session-aware question counter", () => {
  beforeEach(() => readQuota.mockReset());

  it("replaces 28 of 50 with the guest's quota on sign-out, without remounting", async () => {
    readQuota.mockResolvedValueOnce({ signedIn: true, limit: 50, remaining: 28 });
    const { result, rerender } = renderHook(({ userId }) => useChatQuota(userId, true), { initialProps: { userId: "driver" as string | null } });
    await waitFor(() => expect(result.current.quota?.remaining).toBe(28));
    readQuota.mockResolvedValueOnce({ signedIn: false, limit: 5, remaining: 3 });
    rerender({ userId: null });
    expect(result.current.quota).toBeNull();
    await waitFor(() => expect(result.current.quota).toEqual({ signedIn: false, limit: 5, remaining: 3 }));
    expect(readQuota).toHaveBeenCalledTimes(2);
  });

  it("loads the account quota on sign-in and ignores an older guest response", async () => {
    let finishGuest: ((value: { signedIn: boolean; limit: number; remaining: number }) => void) | undefined;
    readQuota.mockImplementationOnce(() => new Promise(resolve => { finishGuest = resolve; }));
    const { result, rerender } = renderHook(({ userId }) => useChatQuota(userId, true), { initialProps: { userId: null as string | null } });
    readQuota.mockResolvedValueOnce({ signedIn: true, limit: 50, remaining: 28 });
    rerender({ userId: "driver" });
    await waitFor(() => expect(result.current.quota?.limit).toBe(50));
    await act(async () => { finishGuest?.({ signedIn: false, limit: 5, remaining: 5 }); });
    expect(result.current.quota).toEqual({ signedIn: true, limit: 50, remaining: 28 });
  });

  it("waits for session readiness before reading quota", async () => {
    readQuota.mockResolvedValue({ signedIn: false, limit: 5, remaining: 5 });
    const { result, rerender } = renderHook(({ ready }) => useChatQuota(null, ready), { initialProps: { ready: false } });
    expect(readQuota).not.toHaveBeenCalled();
    expect(result.current.quota).toBeNull();
    rerender({ ready: true });
    await waitFor(() => expect(result.current.quota?.remaining).toBe(5));
  });
});