import { useState } from "react";
import "@lovable.dev/cloud-auth-js/styles.css";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [error, setError] = useState("");
  const go = async (provider: "google" | "lovable") => {
    setError("");
    const r = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (r.error) return setError("Sign-in didn't go through. Please try again.");
    if (!r.redirected) onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="signin-dialog">
      <DialogHeader>
        <DialogTitle>Save your car and chats</DialogTitle>
        <DialogDescription>Signing in is optional. Without it, Jackie forgets your car and the conversation when you start over or close the tab.</DialogDescription>
      </DialogHeader>
      <ul className="signin-perks">
        <li>Your car is remembered next time</li>
        <li>Past chats stay in "My chats"</li>
        <li>Only you can see them — delete any time</li>
      </ul>
      <Button className="signin-google" variant="outline" onClick={() => go("google")}>
        <svg viewBox="0 0 24 24" aria-hidden width="18" height="18"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>
        Continue with Google
      </Button>
      <button type="button" className="lovable-auth-button" onClick={() => go("lovable")}>Continue with Lovable</button>
      {error && <p className="garage-error" role="alert">{error}</p>}
    </DialogContent>
  </Dialog>;
}
