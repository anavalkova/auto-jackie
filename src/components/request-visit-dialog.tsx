import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import { ensureOther, matchService, OTHER, type ServiceItem } from "@/lib/services";
import { rulesFromRpc, upcomingDays } from "@/lib/booking";
import { useT } from "@/lib/i18n";

type Channel = "sms" | "whatsapp" | "email";
const CHANNELS: { id: Channel; label: string }[] = [{ id: "sms", label: "SMS" }, { id: "whatsapp", label: "WhatsApp" }, { id: "email", label: "Email" }];

export type VisitCard = { issue: string; service?: string | undefined; urgency?: string | undefined; priceLowSek?: number | undefined; priceHighSek?: number | undefined; note?: string | undefined };
export function Tip({ text }: { text: string }) {
  return <Popover><PopoverTrigger asChild><button type="button" className="ws-tip" aria-label="What is this?"><CircleHelp/></button></PopoverTrigger><PopoverContent className="ws-tip-body" side="top" align="start"><p>{text}</p></PopoverContent></Popover>;
}

type Shop = { id: string; name: string; city: string };

/** Inline booking flow shown in place of the chat (no pop-up): 1 what, 2 when (day strip then times), 3 contact. */
export function BookingPanel({ card, vehicleLabel, onClose, workshopId, onBooked, rescheduleId }: { card: VisitCard; vehicleLabel: string; onClose: () => void; workshopId?: string | undefined; onBooked?: (() => void) | undefined; rescheduleId?: string | undefined }) {
  const { t, lang } = useT(); const b = t.bk;
  const locale = lang === "en" ? "en-GB" : lang;
  const { user, ready } = useSessionUser();
  const direct = !card.issue;
  const [step, setStep] = useState(rescheduleId ? 2 : 1);
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState(workshopId ?? "");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [service, setService] = useState("");
  const [issue, setIssue] = useState("");
  const [days, setDays] = useState<{ key: string; slots: Date[] }[]>([]);
  const [day, setDay] = useState("");
  const [picks, setPicks] = useState<string[]>([]);
  const [name, setName] = useState(""); const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<Channel>("sms"); const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [signIn, setSignIn] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [step, state]);

  useEffect(() => { if (user?.email) setEmail(e => e || user.email || ""); }, [user?.email]);
  useEffect(() => {
    supabase.rpc("list_partner_workshops").then(({ data }) => { const list = (data ?? []).filter(w => !workshopId || w.id === workshopId); setShops(list); if (list[0]) setShopId(s => s || list[0]!.id); });
  }, [workshopId]);
  useEffect(() => {
    if (!shopId) return;
    setPicks([]);
    supabase.rpc("workshop_booking_rules", { _workshop: shopId }).then(({ data }) => {
      const d = upcomingDays(new Date(), 400, rulesFromRpc(data)); setDays(d); setDay(d[0]?.key ?? "");
    });
    supabase.rpc("workshop_jackie_profile", { _workshop: shopId }).then(({ data }) => {
      const list = ensureOther(((data as { price_list?: ServiceItem[] } | null)?.price_list ?? []));
      setServices(list);
      const pick = card.issue ? (card.service && list.some(x => x.task === card.service) ? card.service : matchService(card.issue, list)) : "";
      setService(sv => list.some(x => x.task === sv) ? sv : (pick || list[0]?.task || OTHER));
    });
  }, [shopId]);

  const slots = useMemo(() => days.find(d => d.key === day)?.slots ?? [], [days, day]);
  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const fromKey = (k: string) => { const [y, m, dd] = k.split("-").map(Number); return new Date(y!, m! - 1, dd!); };
  const dayKeys = useMemo(() => new Set(days.map(d => d.key)), [days]);
  const selDate = day ? fromKey(day) : undefined;
  const firstDate = days[0] ? fromKey(days[0].key) : undefined;
  const lastDate = days.length ? fromKey(days[days.length - 1]!.key) : undefined;
  const fmtTime = (d: Date) => d.toLocaleTimeString(locale, { timeZone: "Europe/Stockholm", hour: "2-digit", minute: "2-digit" });
  const job = (direct ? (service === OTHER ? issue : service) : card.issue).trim();
  const suggested = !direct && services.length ? (card.service && services.some(x => x.task === card.service) ? card.service : matchService(card.issue, services)) : "";
  const canNext = step === 1 ? !!shopId && job.length >= 3 : step === 2 ? picks.length > 0 : true;

  const send = async () => {
    if (rescheduleId) {
      if (!user || picks.length === 0) return;
      setState("sending");
      const { error } = await supabase.rpc("reschedule_my_visit", { _id: rescheduleId, _slot: picks[0]! });
      setState(error ? "error" : "sent");
      if (!error) onBooked?.();
      return;
    }
    const mapped = service;
    if (!user || !shopId || picks.length === 0 || !job) return;
    setState("sending");
    const { error } = await supabase.from("inquiries").insert({
      workshop_id: shopId, driver_id: user.id, issue: job.slice(0, 200), urgency: card.urgency ?? "soon",
      price_low_sek: card.priceLowSek ?? null, price_high_sek: card.priceHighSek ?? null, note: (card.note ?? "").slice(0, 1000),
      vehicle_label: vehicleLabel.slice(0, 120), message: message.trim(), contact_name: name.trim(), contact_phone: phone.trim(),
      preferred_slots: picks, service: mapped || OTHER, contact_channel: channel, contact_email: email.trim(),
    });
    setState(error ? "error" : "sent");
    if (!error) onBooked?.();
  };

  const steps = [b.s1, b.s2, b.s3];
  return <div className="booking-panel" ref={root}>
    <div className="booking-head">
      <Button variant="ghost" size="sm" onClick={onClose}><ArrowLeft/> {b.back}</Button>
      <h2>{rescheduleId ? (state === "sent" ? t.rescheduleSent : t.rescheduleTitle) : state === "sent" ? b.sentTitle : b.title}</h2>
    </div>
    {state === "sent" && rescheduleId ? <div className="booking-body"><p>{t.rescheduleNote}</p><Button onClick={onClose}>{b.done}</Button></div>
      : state === "sent" ? <div className="booking-body"><p>{b.sentBody.replace("%c", CHANNELS.find(c => c.id === channel)?.label ?? "")}</p><Button onClick={onClose}>{b.done}</Button></div>
      : !ready ? null
      : !user ? <div className="booking-body"><p>{b.signInNeeded}</p><p className="history-note">{b.chatTip}</p><Button onClick={() => setSignIn(true)}>{b.signIn}</Button></div>
      : shops.length === 0 ? <div className="booking-body"><p className="history-note">{b.noShops}</p></div>
      : <form className="booking-body" onSubmit={e => { e.preventDefault(); if (rescheduleId) void send(); else if (step < 3) { if (canNext) setStep(step + 1); } else void send(); }}>
        {rescheduleId ? <p className="eyebrow">{shops.find(x => x.id === shopId)?.name} · {card.issue}</p> : <ol className="booking-steps">{steps.map((s, i) => <li key={s} className={i + 1 === step ? "is-on" : i + 1 < step ? "is-done" : ""}><button type="button" disabled={i + 1 > step} onClick={() => setStep(i + 1)}><span>{i + 1 < step ? <Check/> : i + 1}</span>{s}</button></li>)}</ol>}

        {step === 1 && <div className="visit-form">
          <p className="eyebrow field-tip"><Tip text={b.hWorkshop}/>{b.workshop}: {shops.find(x => x.id === shopId)?.name}</p>
          {!direct && <div className="booking-job"><span className="eyebrow">{b.fromChat}</span><strong>{card.issue}</strong>{card.priceLowSek != null && card.priceHighSek != null && <span>{card.priceLowSek.toLocaleString("sv-SE")} to {card.priceHighSek.toLocaleString("sv-SE")} kr</span>}</div>}
          <div><Label htmlFor="v-service" className="field-tip">{!direct && <Tip text={b.hJob}/>}{b.job}{!direct && service === suggested && <span className="preview-badge">{b.jackiePick}</span>}</Label>
            <select id="v-service" className="native-select" value={service} onChange={e => setService(e.target.value)}>{services.map(x => <option key={x.task} value={x.task}>{x.task === OTHER ? b.other : x.task}</option>)}</select></div>
          {direct && service === OTHER && <div><Label htmlFor="v-issue">{b.describe}</Label><Input id="v-issue" required minLength={3} maxLength={200} placeholder={b.describePh} value={issue} onChange={e => setIssue(e.target.value)}/></div>}
          <p className="history-note field-tip"><Tip text={b.shared}/>{b.chatPrivate}</p>
        </div>}

        {step === 2 && <div className="visit-form">
          {days.length === 0 ? <p className="history-note">{b.noDays}</p> : <>
            <div className="when-grid"><div><Label className="field-tip"><Tip text={b.hTimes}/>{b.day}</Label>
              <Calendar mode="single" className="booking-cal" weekStartsOn={1} {...(selDate ? { selected: selDate, defaultMonth: selDate } : {})}
                {...(firstDate ? { startMonth: firstDate } : {})} {...(lastDate ? { endMonth: lastDate } : {})}
                disabled={d => !dayKeys.has(keyOf(d))}
                onSelect={d => { if (d) { setDay(keyOf(d)); setPicks([]); } }}/></div>
            <div><Label>{b.time}</Label>
              <div className="channel-row">{slots.map(sl => { const iso = sl.toISOString(); const on = picks.includes(iso); return <button key={iso} type="button" className={"slot" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => setPicks(on ? [] : [iso])}>{fmtTime(sl)}</button>; })}</div></div></div>
          </>}
        </div>}

        {step === 3 && <div className="visit-form booking-grid">
          <div><Label htmlFor="v-name">{b.name}</Label><Input id="v-name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} autoComplete="name"/></div>
          <div><Label htmlFor="v-phone">{b.phone}</Label><Input id="v-phone" required type="tel" minLength={5} maxLength={30} placeholder="070 123 45 67" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel"/></div>
          <div><Label className="field-tip"><Tip text={b.hConfirm}/>{b.confirmBy}</Label><div className="channel-row" role="radiogroup">{CHANNELS.map(c => <button key={c.id} type="button" role="radio" aria-checked={channel === c.id} className={"slot" + (channel === c.id ? " is-on" : "")} onClick={() => setChannel(c.id)}>{c.label}</button>)}</div></div>
          {channel === "email" && <div><Label htmlFor="v-email">{b.email}</Label><Input id="v-email" type="email" required maxLength={120} value={email} onChange={e => setEmail(e.target.value)}/></div>}
          <div className="ws-span"><Label htmlFor="v-msg">{b.msg}</Label><Textarea id="v-msg" rows={2} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} placeholder={b.msgPh}/></div>
          {state === "error" && <p className="chat-error ws-span" role="alert">{b.error}</p>}
        </div>}

        <div className="booking-actions">
          {rescheduleId && state === "error" && <p className="chat-error" role="alert">{t.rescheduleError}</p>}
          {step > 1 && !rescheduleId && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>{b.prev}</Button>}
          <Button type="submit" disabled={!canNext || state === "sending"}>{rescheduleId ? (state === "sending" ? b.sending : t.rescheduleSend) : step < 3 ? b.next : state === "sending" ? b.sending : b.send}</Button>
        </div>
      </form>}
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </div>;
}
