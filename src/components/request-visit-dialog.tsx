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
import { ensureOther, matchService, OTHER, type ServiceItem } from "@/lib/services";
import { MAX_PICKS, slotLabel, upcomingDays } from "@/lib/booking";

type Channel = "sms" | "whatsapp" | "email";
const CHANNELS: { id: Channel; label: string }[] = [{ id: "sms", label: "SMS" }, { id: "whatsapp", label: "WhatsApp" }, { id: "email", label: "Email" }];

export type VisitCard = { issue: string; service?: string | undefined; urgency?: string | undefined; priceLowSek?: number | undefined; priceHighSek?: number | undefined; note?: string | undefined };
type Shop = { id: string; name: string; city: string };

/** Driver sends Jackie's "What's next" card to a workshop. Only the visible card and a non-confidential car label are shared. */
export function RequestVisitDialog({ card, vehicleLabel, onClose, workshopId }: { card: VisitCard | null; vehicleLabel: string; onClose: () => void; workshopId?: string | undefined }) {
  const { user, ready } = useSessionUser();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [issue, setIssue] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [service, setService] = useState("");
  const direct = card !== null && !card.issue;
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("sms");
  const [picks, setPicks] = useState<string[]>([]);
  const [days, setDays] = useState(() => upcomingDays(new Date(), 6));
  const toggle = (iso: string) => setPicks(p => p.includes(iso) ? p.filter(x => x !== iso) : p.length >= MAX_PICKS ? p : [...p, iso]);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signIn, setSignIn] = useState(false);

  useEffect(() => {
    if (!card) return;
    setState("idle"); setPicks([]); setIssue(""); setService("");
    if (user?.email) setEmail(e => e || user.email || "");
    supabase.from("workshops").select("id,name,city").order("name").then(({ data }) => { const list = (data ?? []).filter(w => !workshopId || w.id === workshopId); setShops(list); if (list[0]) { const first = list[0].id; setShopId(s => workshopId ?? (s || first)); }; });
  }, [card]);

  // Each workshop decides its own bookable days, times and notice
  useEffect(() => {
    if (!shopId) return;
    setPicks([]);
    supabase.rpc("workshop_booking_rules", { _workshop: shopId }).then(({ data }) => {
      const r = data as { days?: number[]; hours?: number[]; notice?: number } | null;
      setDays(upcomingDays(new Date(), 6, r ? { weekdays: r.days, hours: r.hours, noticeDays: r.notice } : undefined));
    });
    supabase.rpc("workshop_jackie_profile", { _workshop: shopId }).then(({ data }) => {
      const list = ensureOther(((data as { price_list?: ServiceItem[] } | null)?.price_list ?? []));
      setServices(list); setService(sv => list.some(x => x.task === sv) ? sv : (list[0]?.task ?? OTHER));
    });
  }, [shopId]);

  const send = async () => {
    const job = (direct ? (service === OTHER ? issue : service) : card?.issue ?? "").trim();
    const mapped = direct ? service : (card?.service && services.some(x => x.task === card.service) ? card.service : matchService(card?.issue ?? "", services));
    if (!card || !user || !shopId || picks.length === 0 || !job) return;
    setState("sending");
    const { error } = await supabase.from("inquiries").insert({
      workshop_id: shopId, driver_id: user.id, issue: job.slice(0, 200), urgency: card.urgency ?? "soon",
      price_low_sek: card.priceLowSek ?? null, price_high_sek: card.priceHighSek ?? null, note: (card.note ?? "").slice(0, 1000),
      vehicle_label: vehicleLabel.slice(0, 120), message: message.trim(), contact_name: name.trim(), contact_phone: phone.trim(),
      preferred_slots: [...picks].sort(), service: mapped || OTHER, contact_channel: channel, contact_email: email.trim(),
    });
    setState(error ? "error" : "sent");
  };

  return <>
    <Dialog open={card !== null} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state === "sent" ? "Request sent. You're in good hands" : "Book a workshop visit"}</DialogTitle>
          <DialogDescription>{state === "sent" ? `The workshop picks one of your times and confirms by ${CHANNELS.find(c => c.id === channel)?.label}.` : direct ? "Pick a workshop and a time. Sign in needed so the workshop can reach you." : `They'll see “${card?.issue ?? ""}”, Jackie's rough price and your contact details. Nothing else from your chat.`}</DialogDescription>
        </DialogHeader>
        {state === "sent" ? <Button onClick={onClose}>Done</Button>
          : !ready ? null
          : !user ? <Button onClick={() => setSignIn(true)}>Sign in to send your request</Button>
          : shops.length === 0 ? <p className="history-note">No partner workshops have joined yet.</p>
          : <form className="visit-form" onSubmit={e => { e.preventDefault(); void send(); }}>
            <div><Label htmlFor="v-shop">Workshop</Label>
              <select id="v-shop" className="native-select" value={shopId} onChange={e => setShopId(e.target.value)}>{shops.map(s => <option key={s.id} value={s.id}>{s.name}{s.city ? ` · ${s.city}` : ""}</option>)}</select></div>
            {direct && <div><Label htmlFor="v-service">What needs doing?</Label>
              <select id="v-service" className="native-select" value={service} onChange={e => setService(e.target.value)}>{services.map(x => <option key={x.task} value={x.task}>{x.task === OTHER ? "Something else" : x.task}</option>)}</select></div>}
            {direct && service === OTHER && <div><Label htmlFor="v-issue">Describe it briefly</Label><Input id="v-issue" required minLength={3} maxLength={200} placeholder="E.g. rattle from the boot" value={issue} onChange={e => setIssue(e.target.value)}/></div>}
            <div><Label htmlFor="v-name">Your name</Label><Input id="v-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)}/></div>
            <div><Label htmlFor="v-phone">Phone</Label><Input id="v-phone" required type="tel" minLength={5} maxLength={30} placeholder="070 123 45 67" value={phone} onChange={e => setPhone(e.target.value)}/></div>
            <div className="ws-span"><Label>When can you drop the car off? Pick up to {MAX_PICKS}</Label>
              <div className="slot-grid">{days.map(d => <div key={d.key} className="slot-day"><span className="slot-day-name">{slotLabel(d.slots[0]!).split(",")[0]}</span>{d.slots.map(sl => { const iso = sl.toISOString(); const on = picks.includes(iso); return <button key={iso} type="button" className={"slot" + (on ? " is-on" : "")} aria-pressed={on} disabled={!on && picks.length >= MAX_PICKS} onClick={() => toggle(iso)}>{sl.toLocaleTimeString("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" })}</button>; })}</div>)}</div></div>
            <div><Label>Confirm by</Label><div className="channel-row" role="radiogroup">{CHANNELS.map(c => <button key={c.id} type="button" role="radio" aria-checked={channel === c.id} className={"slot" + (channel === c.id ? " is-on" : "")} onClick={() => setChannel(c.id)}>{c.label}</button>)}</div></div>
            {channel === "email" && <div><Label htmlFor="v-email">Email</Label><Input id="v-email" type="email" required maxLength={120} value={email} onChange={e => setEmail(e.target.value)}/></div>}
            <div><Label htmlFor="v-msg">Anything else? (optional)</Label><Textarea id="v-msg" maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder="When suits you, how the car feels…"/></div>
            <WhyNote id="visit" title="No phone queue, no explaining the noise twice." stats={[
              { value: "1 in 5", text: "calls to auto service businesses go unanswered. Your request arrives in writing instead, with Jackie's diagnosis and rough price attached.", source: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
            ]}/>
            {state === "error" && <p className="chat-error" role="alert">Couldn't send it. Please try again.</p>}
            <Button type="submit" disabled={state === "sending" || picks.length === 0}>{state === "sending" ? "Sending…" : picks.length === 0 ? "Pick at least one time" : `Request ${picks.length === 1 ? "this time" : `these ${picks.length} times`}`}</Button>
          </form>}
      </DialogContent>
    </Dialog>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </>;
}
