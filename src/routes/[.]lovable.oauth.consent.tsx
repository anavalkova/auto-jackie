import { createFileRoute, redirect } from "@tanstack/react-router";
import { tr } from "@/lib/tr";
import { useLang } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/sign-in-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSessionUser } from "@/hooks/use-session-user";

type Details = { client?: { name?: string; uri?: string; client_name?: string } | null; redirect_uri?: string; scope?: string; redirect_url?: string; redirect_to?: string };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: Details | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "" }),
  head: () => ({ meta: [{ title: "Connect an assistant · AutoJackie" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: ({ search }) => { if (!search.authorization_id) throw new Error("This connection link is missing its request ID. Start again from your assistant."); },
  component: Consent,
  errorComponent: ({ error }) => <main className="consent-page"><div className="ws-card consent-card"><h1>{tr("Couldn't open this connection request")}</h1><p className="history-note">{error instanceof Error ? error.message : String(error)}</p></div></main>,
});

const SCOPE_LABEL: Record<string, string> = { openid: "Confirm it's you", email: "Share your email address", profile: "Share your basic profile" };

function Consent() {
  useLang();
  const { authorization_id } = Route.useSearch();
  const { user, ready } = useSessionUser();
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signIn, setSignIn] = useState(false);
  const here = `/.lovable/oauth/consent?authorization_id=${encodeURIComponent(authorization_id)}`;

  useEffect(() => {
    if (!ready || !user) return;
    void oauth().getAuthorizationDetails(authorization_id).then(({ data, error }) => {
      if (error) return setError(error.message || "This request has expired. Start again from your assistant.");
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) { window.location.href = immediate; return; }
      setDetails(data);
    }).catch(() => setError("Couldn't reach sign-in right now. Please try again."));
  }, [ready, user?.id, authorization_id]);

  const decide = async (approve: boolean) => {
    setBusy(true); setError(null);
    try {
      const { data, error } = approve ? await oauth().approveAuthorization(authorization_id) : await oauth().denyAuthorization(authorization_id);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("No way back to your assistant was returned.");
      window.location.href = target;
    } catch (e) { setBusy(false); setError(e instanceof Error ? e.message : "Something went wrong. Please try again."); }
  };

  const name = details?.client?.name ?? details?.client?.client_name ?? tr("An assistant");
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);
  return <main className="consent-page"><div className="ws-card consent-card">
    {!ready ? <p className="history-note">{tr("Loading…")}</p>
    : !user ? <>
      <h1>{tr("Sign in to connect your assistant")}</h1>
      <p className="history-note">{tr("An assistant wants to connect to your AutoJackie account. Sign in first, then you can approve or cancel.")}</p>
      <Button onClick={() => setSignIn(true)}>{tr("Sign in")}</Button>
      <SignInDialog open={signIn} onOpenChange={setSignIn} returnTo={here}/>
    </>
    : error && !details ? <><h1>{tr("Couldn't load this request")}</h1><p className="history-note" role="alert">{error}</p></>
    : !details ? <p className="history-note">{tr("Loading…")}</p>
    : <>
      <h1>{tr("Connect {n} to AutoJackie", { n: name })}</h1>
      <p>{tr("{n} will be able to use AutoJackie's tools as you: read your saved chats, car and visit requests, or your workshop's requests if you're workshop staff.", { n: name })}</p>
      <p className="history-note">{tr("Signed in as")} <strong>{user.email}</strong>{details.redirect_uri ? <> · {tr("returns to")} {new URL(details.redirect_uri).host}</> : null}</p>
      {scopes.length > 0 && <ul className="signin-perks">{scopes.map(s => <li key={s}>{SCOPE_LABEL[s] ? tr(SCOPE_LABEL[s]) : `${tr("Additional permission requested:")} ${s}`}</li>)}</ul>}
      <p className="history-note">{tr("This does not bypass AutoJackie's permissions. Confidential car registry details are never shared.")}</p>
      {error && <p className="chat-error" role="alert">{error}</p>}
      <div className="ws-chips"><Button disabled={busy} onClick={() => void decide(true)}>{tr("Approve")}</Button><Button variant="outline" disabled={busy} onClick={() => void decide(false)}>{tr("Cancel connection")}</Button></div>
    </>}
  </div></main>;
}
