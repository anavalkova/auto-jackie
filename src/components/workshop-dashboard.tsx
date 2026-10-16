import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, Car, Clock, Inbox, MessageCircle, Moon, Phone, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import jackieImg from "@/assets/jackie.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SignInDialog } from "@/components/sign-in-dialog";
import { WhyNote } from "@/components/why-note";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Status = Database["public"]["Enums"]["inquiry_status"];
type Shop = { id: string; name: string; city: string; role: string };

const STATUSES: { id: Status; label: string }[] = [
  { id: "new", label: "New" }, { id: "contacted", label: "Contacted" }, { id: "quoted", label: "Quoted" }, { id: "booked", label: "Booked" }, { id: "closed", label: "Closed" },
];
const OPEN: Status[] = ["new", "contacted", "quoted", "booked"];
const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const mid = (i: Inquiry) => i.price_low_sek != null && i.price_high_sek != null ? (i.price_low_sek + i.price_high_sek) / 2 : 0;

export function WorkshopDashboard() {
  const { user, ready, isAdmin } = useAccess();
  const [tab, setTab] = useState<"requests" | "settings">("requests");
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<Status | "open">("open");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [error, setError] = useState(false);

  const loadShop = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("workshop_members").select("role, workshops(id,name,city)").eq("user_id", user.id).limit(1).maybeSingle();
    const w = data?.workshops as { id: string; name: string; city: string } | null | undefined;
    setShop(w ? { ...w, role: data!.role } : null);
  }, [user?.id]);
  useEffect(() => { if (ready && user) void loadShop(); }, [ready, loadShop]);

  const loadItems = useCallback(async () => {
    if (!shop) return;
    const { data, error } = await supabase.from("inquiries").select("*").eq("workshop_id", shop.id).order("created_at", { ascending: false }).limit(200);
    setError(!!error); setItems(data ?? []);
  }, [shop?.id]);
  useEffect(() => { void loadItems(); }, [loadItems]);

  const kpis = useMemo(() => {
    const open = items.filter(i => OPEN.includes(i.status));
    return {
      fresh: items.filter(i => i.status === "new").length,
      urgent: open.filter(i => i.urgency === "today" || i.urgency === "this week").length,
      pipeline: open.reduce((s, i) => s + mid(i), 0),
      booked: items.filter(i => i.status === "booked").length,
    };
  }, [items]);
  const shown = items.filter(i => filter === "open" ? OPEN.includes(i.status) : i.status === filter);

  const setStatus = async (i: Inquiry, status: Status) => {
    const { data, error } = await supabase.from("inquiries").update({ status }).eq("id", i.id).select("*").single();
    if (error || !data) { setError(true); return; }
    setItems(xs => xs.map(x => x.id === data.id ? data : x)); setSelected(data);
  };

  const header = <header className="site-header">
    <Link to="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span><span className="brand-sub">for workshops</span></Link>
    <nav aria-label="Workshop navigation">{isAdmin && <Button variant="outline" asChild><Link to="/admin">Operations</Link></Button>}<Button variant="ghost" asChild><Link to="/">Driver view</Link></Button>{user && <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/workshop"); }}>Sign out</Button>}</nav>
  </header>;

  let body;
  if (!ready || (user && shop === undefined)) body = <p className="history-note" role="status">Loading…</p>;
  else if (!user) body = <WorkshopPitch onSignIn={() => setSignIn(true)}/>;
  else if (!shop) body = <div className="ws-empty"><Wrench/><h1>Your workshop isn't set up yet</h1><p>AutoJackie's team sets up each workshop personally. If we've onboarded you, sign in with the email you gave us{user.email ? ` (you're signed in as ${user.email})` : ""}.</p>{isAdmin && <Button asChild><Link to="/admin">Go to operations</Link></Button>}</div>;
  else body = <>
    <div className="ws-title"><div><span className="eyebrow">WORKSHOP DASHBOARD</span><h1>{shop.name}</h1>{shop.city && <p className="history-note">{shop.city}</p>}</div><div className="ws-filters"><Button variant={tab === "requests" ? "default" : "outline"} onClick={() => setTab("requests")}>Requests</Button><Button variant={tab === "settings" ? "default" : "outline"} onClick={() => setTab("settings")}>Settings</Button></div></div>
    {tab === "settings" ? <WhyNote id="workshop-settings" title="71% of Swedish drivers choose on expertise, not price. Show them yours." summary="71% pick expertise over price. Your settings make that visible." stats={[
      { value: "3 800", text: "workshops in Sweden compete for the same customers.", source: { label: "Mekonomen", url: "https://www.mynewsdesk.com/se/mekonomen/pressreleases/var-tredje-bilaegare-har-kaent-sig-lurad-av-verkstaden-oekad-kunskap-om-godkaend-bilverkstad-kan-vara-en-loesning-3359302" } },
      { value: "71%", text: "of Swedish drivers pick a workshop for skilled staff, not low price.", source: { label: "OKQ8", url: "https://www.mynewsdesk.com/se/okq8/pressreleases/7-av-10-bilister-efterfraagar-kunnig-verkstadspersonal-visar-ny-undersoekning-922496" } },
      { value: "7x", text: "more likely to win a lead when you respond within an hour. Your hours tell Jackie when to promise that.", source: { label: "Harvard Business Review", url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" } },
    ]} footer="What you fill in here is what Jackie quotes back to drivers. Accurate settings mean no surprises on either side."/>
    : <WhyNote id="workshop-v2" title="63% of drivers don't trust workshops before they call. These are the ones who already do." summary="63% of drivers distrust workshops. Yours get context before they call." stats={[
      { value: "63%", text: "of drivers don't trust repair shops. Jackie's upfront price range changes that before you pick up the phone.", source: { label: "AAA", url: "https://newsroom.aaa.com/wp-content/uploads/2016/12/Auto-Repair-Survey-FINAL.pdf" } },
      { value: "72%", text: "feel anxious about repair costs. Drivers who used Jackie already have a number in mind.", source: { label: "RepairPal / Harris", url: "https://repairpal.com/consumer-survey-march-2013" } },
      { value: "1 in 4", text: "bookings end as no-shows. SMS confirmation, coming next, cuts that down.", source: { label: "Solera via Dealership Guy", url: "https://news.dealershipguy.com/p/broken-service-scheduling-is-costing-dealers-big-time-here-s-how-some-are-closing-the-gaps" } },
    ]} footer="Less convincing to do. Shorter calls. Higher close rate."/>}
    {tab === "settings" ? <WorkshopSettings workshopId={shop.id} canEdit={shop.role === "owner"}/> : <>
    <div className="ws-kpis">
      <Kpi icon={<Inbox/>} label="New requests" value={String(kpis.fresh)}/>
      <Kpi icon={<CalendarClock/>} label="Need you this week" value={String(kpis.urgent)}/>
      <Kpi icon={<TrendingUp/>} label="Open pipeline (est.)" value={kr(kpis.pipeline)} hint="Midpoint of Jackie's rough ranges, incl. VAT"/>
      <Kpi icon={<Car/>} label="Booked" value={String(kpis.booked)}/>
    </div>
    <div className="ws-filters" role="tablist" aria-label="Filter requests">
      {([{ id: "open", label: "All open" }, ...STATUSES] as { id: Status | "open"; label: string }[]).map(s => <Button key={s.id} size="sm" variant={filter === s.id ? "default" : "outline"} role="tab" aria-selected={filter === s.id} onClick={() => setFilter(s.id)}>{s.label}</Button>)}
    </div>
    {error && <p className="chat-error" role="alert">Couldn't load or update requests.</p>}
    {shown.length === 0 ? <div className="ws-list-empty"><p>No requests here yet.</p><p className="history-note">When a driver taps “Request a workshop visit” on one of Jackie's cards and picks {shop.name}, it lands here.</p></div>
      : <ul className="ws-list">{shown.map(i => <li key={i.id}><button type="button" className="ws-row" onClick={() => setSelected(i)}>
        <span className={`ws-status s-${i.status}`}>{STATUSES.find(s => s.id === i.status)?.label}</span>
        <span className="ws-row-main"><strong>{i.issue}</strong><span>{i.contact_name}{i.vehicle_label ? ` · ${i.vehicle_label}` : ""}</span></span>
        <span className={`ws-urgency u-${i.urgency.replace(" ", "-")}`}>{i.urgency}</span>
        <span className="ws-price">{i.price_low_sek != null && i.price_high_sek != null ? `${kr(i.price_low_sek)} to ${kr(i.price_high_sek)}` : "No price"}</span>
        <time dateTime={i.created_at}>{when(i.created_at)}</time>
      </button></li>)}</ul>}
    </>}
  </>;

  return <div className="app-frame">
    {header}
    <main className="ws-main">{body}</main>
    <Sheet open={selected !== null} onOpenChange={o => { if (!o) setSelected(null); }}>
      <SheetContent className="ws-sheet">{selected && <>
        <SheetHeader><SheetTitle>{selected.issue}</SheetTitle><SheetDescription>Received {when(selected.created_at)} · get it looked at: {selected.urgency}</SheetDescription></SheetHeader>
        <div className="ws-detail">
          <section><span className="eyebrow">CUSTOMER</span><p><strong>{selected.contact_name}</strong></p><Button variant="outline" asChild><a href={`tel:${selected.contact_phone.replace(/\s/g, "")}`}><Phone/> {selected.contact_phone}</a></Button></section>
          {selected.vehicle_label && <section><span className="eyebrow">CAR</span><p>{selected.vehicle_label}</p></section>}
          <section><span className="eyebrow">JACKIE'S ROUGH ESTIMATE</span><p>{selected.price_low_sek != null && selected.price_high_sek != null ? `${kr(selected.price_low_sek)} to ${kr(selected.price_high_sek)} incl. VAT` : "No estimate"}</p>{selected.note && <p className="history-note">{selected.note}</p>}</section>
          {selected.message && <section><span className="eyebrow">MESSAGE FROM THE DRIVER</span><p>{selected.message}</p></section>}
          <section><span className="eyebrow">STATUS</span><div className="ws-filters">{STATUSES.map(s => <Button key={s.id} size="sm" variant={selected.status === s.id ? "default" : "outline"} onClick={() => void setStatus(selected, s.id)}>{s.label}</Button>)}</div></section>
          <Button disabled title="Coming with the quoting engine">Draft a quote · coming soon</Button>
        </div>
      </>}</SheetContent>
    </Sheet>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </div>;
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return <div className="ws-kpi" title={hint}>{icon}<span className="eyebrow">{label.toUpperCase()}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

function WorkshopSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const [f, setF] = useState<{ hourly_rate_sek: number; opening_hours: string; phone: string; address: string; services: string } | null>(null);
  const [state, setState] = useState("");
  useEffect(() => {
    supabase.from("workshop_settings").select("*").eq("workshop_id", workshopId).maybeSingle().then(({ data }) => {
      if (data) setF({ hourly_rate_sek: data.hourly_rate_sek, opening_hours: data.opening_hours, phone: data.phone, address: data.address, services: (data.services as string[]).join("\n") });
    });
  }, [workshopId]);
  if (!f) return <p className="history-note" role="status">Loading settings…</p>;
  const save = async () => {
    setState("Saving…");
    const { error } = await supabase.from("workshop_settings").update({ hourly_rate_sek: f.hourly_rate_sek, opening_hours: f.opening_hours, phone: f.phone, address: f.address, services: f.services.split("\n").map(x => x.trim()).filter(Boolean), updated_at: new Date().toISOString() }).eq("workshop_id", workshopId);
    setState(error ? "Couldn't save. Please try again." : "Saved.");
  };
  return <form className="visit-form ws-settings" onSubmit={e => { e.preventDefault(); void save(); }}>
    <fieldset disabled={!canEdit} className="visit-form">
      <div><Label htmlFor="s-rate">Hourly labour rate (kr, incl. VAT)</Label><Input id="s-rate" type="number" min={0} max={10000} value={f.hourly_rate_sek} onChange={e => setF({ ...f, hourly_rate_sek: Number(e.target.value) })}/></div>
      <div><Label htmlFor="s-hours">Opening hours</Label><Input id="s-hours" maxLength={200} value={f.opening_hours} onChange={e => setF({ ...f, opening_hours: e.target.value })}/></div>
      <div><Label htmlFor="s-phone">Phone</Label><Input id="s-phone" maxLength={30} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })}/></div>
      <div><Label htmlFor="s-addr">Address</Label><Input id="s-addr" maxLength={200} value={f.address} onChange={e => setF({ ...f, address: e.target.value })}/></div>
      <div><Label htmlFor="s-serv">Services you offer (one per line)</Label><textarea id="s-serv" className="native-select ws-textarea" value={f.services} onChange={e => setF({ ...f, services: e.target.value })}/></div>
      {canEdit && <Button type="submit">Save settings</Button>}
    </fieldset>
    {!canEdit && <p className="history-note">Only the workshop owner can change these.</p>}
    {state && <p className="history-note" role="status">{state}</p>}
  </form>;
}

function WorkshopPitch({ onSignIn }: { onSignIn: () => void }) {
  const steps = [
    { icon: <MessageCircle/>, title: "Driver talks to Jackie", text: "Any hour. In plain words." },
    { icon: <Sparkles/>, title: "Jackie sorts it out", text: "Likely issue, urgency, rough price." },
    { icon: <Inbox/>, title: "You get a ready lead", text: "Summary, car and phone number." },
    { icon: <Phone/>, title: "You call. They book.", text: "Warm customer, no phone tag." },
  ];
  const stats = [
    { value: "21%", text: "of calls to workshops go unanswered.", src: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
    { value: "68%", text: "of missed callers never call back.", src: { label: "Auto Service World", url: "https://www.autoserviceworld.com/phone-fails-lead-to-missed-automotive-service-revenue-report/" } },
    { value: "36%", text: "of Swedish private cars belong to women. Few shops speak to them.", src: { label: "Trafikanalys", url: "https://www.trafa.se/vagtrafik/fordon/" } },
  ];
  return <div className="pitch">
    <section className="pitch-hero">
      <div>
        <span className="eyebrow">FOR WORKSHOPS</span>
        <h1>Never miss a customer again.</h1>
        <p>Jackie answers every driver, 24/7. You get booked jobs, not missed calls.</p>
        <div className="pitch-cta"><Button onClick={onSignIn}>Sign in to your workshop</Button><span className="history-note">Invite only. Set up by our team.</span></div>
      </div>
      <figure className="pitch-jackie"><img src={jackieImg} alt="Jackie, AutoJackie's assistant"/><figcaption>Jackie, your new front desk</figcaption></figure>
    </section>
    <ol className="pitch-flow" aria-label="How it works">
      {steps.map((s, i) => <li key={s.title}><span className="pitch-step">{i + 1}</span>{s.icon}<strong>{s.title}</strong><span>{s.text}</span></li>)}
    </ol>
    <section className="pitch-gains" aria-label="What's in it for you">
      <span className="eyebrow">WHAT'S IN IT FOR YOU</span>
      <ul>
        <li><Clock/><strong>Less phone time</strong><span>Jackie triages first.</span></li>
        <li><Moon/><strong>After-hours leads</strong><span>Caught while you sleep.</span></li>
        <li><BadgeCheck/><strong>Trusting customers</strong><span>They know the price range upfront.</span></li>
        <li><ShieldCheck/><strong>Your data stays yours</strong><span>Isolated per workshop.</span></li>
      </ul>
    </section>
    <section className="pitch-stats" aria-label="The problem in numbers">
      {stats.map(s => <div key={s.value}><strong>{s.value}</strong><span>{s.text}</span><a href={s.src.url} target="_blank" rel="noreferrer">{s.src.label}</a></div>)}
    </section>
  </div>;
}
