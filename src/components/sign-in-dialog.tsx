import { useState } from "react";
import { tr } from "@/lib/tr";
import { useLang } from "@/lib/i18n";
import "@lovable.dev/cloud-auth-js/styles.css";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { oauthReturnPath } from "@/lib/oauth-return-path";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** returnTo: same-origin path to come back to after sign-in (e.g. an assistant connection request). */
export function SignInDialog({ open, onOpenChange, returnTo }: { open: boolean; onOpenChange: (o: boolean) => void; returnTo?: string }) {
  useLang();
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const go = async (provider: "google" | "lovable") => {
    setError("");
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: returnTo ? new URL(oauthReturnPath(returnTo), window.location.origin).href : window.location.origin });
    if (r.error) return setError(tr("Sign-in didn't go through. Please try again."));
    if (!r.redirected) onOpenChange(false);
  };
  const passwordSignIn = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return setError(tr("That email and password didn't match."));
    onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="app-sheet signin-dialog">
      <DialogHeader>
        <DialogTitle>{tr("Sign in to AutoJackie")}</DialogTitle>
        <DialogDescription>{tr("Drivers: optional. It saves your car and chats. Workshops: use the email we set you up with.")}</DialogDescription>
      </DialogHeader>
      <ul className="signin-perks">
        <li>{tr("Your car is remembered next time")}</li>
        <li>{tr("Past chats stay in \"My chats\"")}</li>
        <li>{tr("Only you can see them. Delete any time")}</li>
      </ul>
      <Button className="signin-google" variant="outline" onClick={() => go("google")}>
        <svg viewBox="0 0 24 24" aria-hidden width="18" height="18"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>
        Continue with Google
      </Button>
      <button type="button" className="lovable-auth-button" onClick={() => go("lovable")}>{tr("Continue with Lovable")}</button>
      <p className="signin-divider">{tr("Workshop or demo login")}</p>
      <form className="visit-form" onSubmit={e => { e.preventDefault(); void passwordSignIn(); }}>
          <Input type="email" required aria-label={tr("Email")} placeholder={tr("Email")} value={email} onChange={e => setEmail(e.target.value)}/>
          <Input type="password" required aria-label={tr("Password")} placeholder={tr("Password")} value={password} onChange={e => setPassword(e.target.value)}/>
          <Button type="submit">{tr("Sign in with password")}</Button>
        </form>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </DialogContent>
  </Dialog>;
}
