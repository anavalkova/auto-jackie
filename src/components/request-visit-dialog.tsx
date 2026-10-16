import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
import { WhyNote } from "@/components/why-note";
import { supabase } from "@/integrations/supabase/client";

export type VisitCard = { issue: string; urgency?: string | undefined; priceLowSek?: number | undefined; priceHighSek?: number | undefined; note?: string | undefined };
type Shop = { id: string; name: string; city: string };

/** Driver sends Jackie's "What's next" card to a workshop. Only the visible card and a non-confidential car label are shared. */
export function RequestVisitDialog({ card, vehicleLabel, onClose }: { card: VisitCard | null; vehicleLabel: string; onClose: () => void }) {
  const { user, ready } = useSessionUser();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    if (!card) return;
    setState("idle");
    supabase.from("workshops").select("id,name,city").order("name").then(({ data }) => { setShops(data ?? []); if (data?.[0]) { const first = data[0].id; setShopId(s => s || first); }; });
  }, [card]);

  const send = async () => {
    if (!card || !user || !shopId) return;
    setState("sending");
    const { error } = await supabase.from("inquiries").insert({
      workshop_id: shopId, driver_id: user.id, issue: card.issue.slice(0, 200), urgency: card.urgency ?? "soon",
      price_low_sek: card.priceLowSek ?? null, price_high_sek: card.priceHighSek ?? null, note: (card.note ?? "").slice(0, 1000),
      vehicle_label: vehicleLabel.slice(0, 120), message: message.trim(), contact_name: name.trim(), contact_phone: phone.trim(),
    });
    setState(error ? "error" : "sent");
  };

  return <>
    <Dialog open={card !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state === "sent" ? "Sent. You're in good hands" : "Ask a workshop to take a look"}</DialogTitle>
          <DialogDescription>{state === "sent" ? "The workshop sees Jackie's summary and will contact you to agree a time and confirm the price." : `They'll see “${card?.issue ?? ""}”, Jackie's rough price and your contact details. Nothing else from your chat.`}</DialogDescription>
        </DialogHeader>
        {state === "sent" ? <Button onClick={onClose}>Done</Button>
          : !ready ? null
          : !user ? <Button onClick={() => setSignIn(true)}>Sign in to send your request</Button>
          : shops.length === 0 ? <p className="history-note">No partner workshops have joined yet.</p>
          : <form className="visit-form" onSubmit={e => { e.preventDefault(); void send(); }}>
            <div><Label htmlFor="v-shop">Workshop</Label>
              <select id="v-shop" className="native-select" value={shopId} onChange={e => setShopId(e.target.value)}>{shops.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ""}</option>)}</select></div>
            <div><Label htmlFor="v-name">Your name</Label><Input id="v-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></div>
            <div><Label htmlFor="v-phone">Phone</Label><Input id="v-phone" required type="tel" minLength={5} maxLength={30} placeholder="070 123 45 67" value={phone} onChange={e => setPhone(e.target.value)}/></div>
            <div><Label htmlFor="v-msg">Anything else? (optional)</Label><Textarea id="v-msg" maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="When suits you, how the car feels…"/></div>
            <WhyNote id="visit" title="No phone queue, no explaining the noise twice." stats={[
              { value: "1 in 5", text: "calls to auto service businesses go unanswered. Your request arrives in writing instead, with Jackie's diagnosis and rough price attached.", source: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
            ]}/>
            {state === "error" && <p className="chat-error" role="alert">Couldn't send it. Please try again.</p>}
            <Button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send request"}</Button>
          </form>}
      </DialogContent>
    </Dialog>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </>;
}
