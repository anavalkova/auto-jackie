import { useCallback, useEffect, useRef, useState } from "react";
import { chatQuotaStatus, type ChatQuotaStatus } from "@/lib/chat-quota.functions";

/** Read the current identity's quota without allowing older requests to replace it. */
export function useChatQuota(userId: string | null, ready: boolean) {
  const [snapshot, setSnapshot] = useState<{ userId: string | null; quota: ChatQuotaStatus } | null>(null);
  const requestVersion = useRef(0);
  const refreshQuota = useCallback(() => {
    const version = ++requestVersion.current;
    if (!ready) return;
    void chatQuotaStatus().then(quota => {
      if (version !== requestVersion.current || quota.signedIn !== (userId !== null)) return;
      setSnapshot({ userId, quota });
    }).catch(() => { /* The server still enforces the quota if the counter cannot load. */ });
  }, [userId, ready]);

  useEffect(() => {
    setSnapshot(null);
    refreshQuota();
    return () => { requestVersion.current += 1; };
  }, [refreshQuota]);

  const quota = ready && snapshot?.userId === userId ? snapshot.quota : null;
  return { quota, refreshQuota };
}