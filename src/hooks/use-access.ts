import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";

/** Signed-in user plus admin flag. Claiming also links any workshop onboarded for this email. */
export function useAccess() {
  const { user, ready } = useSessionUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimed, setClaimed] = useState(false);
  useEffect(() => {
    if (!ready) return;
    if (!user) { setIsAdmin(false); setClaimed(true); return; }
    setClaimed(false);
    supabase.rpc("claim_my_access").then(({ data }) => {
      setIsAdmin(!!(data as { is_admin?: boolean } | null)?.is_admin);
      setClaimed(true);
    });
  }, [ready, user?.id]);
  return { user, ready: ready && claimed, isAdmin };
}
