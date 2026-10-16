import { slotLabel } from "@/lib/booking";
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
type Shop = { id: string; name: string; city: string; vat_number: string; role: string };
type Tab = "overview" | "booking" | "context" | "profile";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "booking", label: "Booking" }, { id: "context", label: "Jackie's context" }, { id: "profile", label: "Profile" },
];

const STATUSES: { id: Status; label: string }[] = [
  { id: "new", label: "New" }, { id: "contacted", label: "Contacted" }, { id: "quoted", label: "Quoted" }, { id: "booked", label: "Booked" }, { id: "closed", label: "Closed" },
];
const OPEN: Status[] = ["new", "contacted", "quoted", "booked"];
const kr = (n: number) => `${Math.round(n).toLocaleString("sv-SE")} kr`;
const when = (d: string) => new Date(d).toLocaleString("en-GB", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const mid = (i: Inquiry) => i.price_low_sek != null && i.price_high_sek != null ? (i.price_low_sek + i.price_high_sek) / 2 : 0;

export function WorkshopDashboard() {
  const { user, ready, isAdmin } = useAccess();
  const [tab, setTab] = useState<Tab>("overview");
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<Status | "open">("open");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [error, setError] = useState(false);

  const loadShop = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("workshop_members").select("role, workshops(id,name,city,vat_number)").eq("user_id", user.id).limit(1).maybeSingle();
    const w = data?.workshops as { id: string; name: string; city: string; vat_number: string } | null | undefined;
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
      afterHours: items.length ? `${Math.round(items.filter(isAfterHours).length / items.length * 100)}%` : "0%",
    };
  }, [items]);
  const shown = items.filter(i => filter === "open" ? OPEN.includes(i.status) : i.status === filter);

  const book = async (i: Inquiry, at: string | null) => {
    const { data, error } = await supabase.from("inquiries").update({ booked_at: at, status: at ? "booked" : "contacted" }).eq("id", i.id).select("*").single();
    if (error || !data) return;
    setItems(xs => xs.map(x => x.id === data.id ? data : x)); setSelected(data);
  };
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
    <div className="ws-title"><div><span className="eyebrow">WORKSHOP DASHBOARD</span><h1>{shop.name}</h1>{shop.city && <p className="history-note">{shop.city}</p>}</div></div>
    {(tab === "overview" || tab === "context") && <div className="ws-overview">
    {tab === "context" ? <WhyNote id="workshop-settings" title="71% of Swedish drivers choose on expertise, not price. Show them yours." summary="71% pick expertise over price. Your settings make that visible." stats={[
      { value: "3 800", text: "workshops in Sweden compete for the same customers.", source: { label: "Mekonomen", url: "https://www.mynewsdesk.com/se/mekonomen/pressreleases/var-tredje-bilaegare-har-kaent-sig-lurad-av-verkstaden-oekad-kunskap-om-godkaend-bilverkstad-kan-vara-en-loesning-3359302" } },
      { value: "71%", text: "of Swedish drivers pick a workshop for skilled staff, not low price.", source: { label: "OKQ8", url: "https://www.mynewsdesk.com/se/okq8/pressreleases/7-av-10-bilister-efterfraagar-kunnig-verkstadspersonal-visar-ny-undersoekning-922496" } },
      { value: "7x", text: "more likely to win a lead when you respond within an hour. Your hours tell Jackie when to promise that.", source: { label: "Harvard Business Review", url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" } },
    ]} footer="What you fill in here is what Jackie quotes back to drivers. Accurate settings mean no surprises on either side."/>
    : <WhyNote id="workshop-v2" title="63% of drivers don't trust workshops before they call. These are the ones who already do." summary="63% of drivers distrust workshops. Yours get context before they call." stats={[
      { value: "63%", text: "of drivers don't trust repair shops. Jackie's upfront price range changes that before you pick up the phone.", source: { label: "AAA", url: "https://newsroom.aaa.com/wp-content/uploads/2016/12/Auto-Repair-Survey-FINAL.pdf" } },
      { value: "72%", text: "feel anxious about repair costs. Drivers who used Jackie already have a number in mind.", source: { label: "RepairPal / Harris", url: "https://repairpal.com/consumer-survey-march-2013" } },
      { value: "1 in 4", text: "bookings end as no-shows. SMS confirmation, coming next, cuts that down.", source: { label: "Solera via Dealership Guy", url: "https://news.dealershipguy.com/p/broken-service-scheduling-is-costing-dealers-big-time-here-s-how-some-are-closing-the-gaps" } },
    ]} footer="Less convincing to do. Shorter calls. Higher close rate."/>}
    <div className="ws-kpis">
      <Kpi icon={<Inbox/>} label="New requests" value={String(kpis.fresh)}/>
      <Kpi icon={<CalendarClock/>} label="Need you this week" value={String(kpis.urgent)}/>
      <Kpi icon={<TrendingUp/>} label="Open pipeline (est.)" value={kr(kpis.pipeline)} hint="Midpoint of Jackie's rough ranges, incl. VAT"/>
      <Kpi icon={<Moon/>} label="After hours" value={kpis.afterHours} hint="Requests that came in evenings or weekends, when you were closed"/>
    </div>
    </div>}
    <div className="ws-tabs" role="tablist" aria-label="Dashboard sections">{TABS.map(t => <Button key={t.id} variant={tab === t.id ? "default" : "outline"} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Button>)}</div>
    {tab === "booking" ? <BookingSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "context" ? <ContextSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "profile" ? <ProfileView shop={shop} canEdit={shop.role === "owner"} onSaved={loadShop}/> : <>
    <InsightsView items={items}/>
    <h2 className="ws-h2">Requests</h2>
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
          <section><span className="eyebrow">{selected.booked_at ? "BOOKED" : "PREFERRED TIMES"}</span>
            {selected.booked_at ? <p><strong>{slotLabel(selected.booked_at)}</strong> <Button variant="link" size="sm" onClick={() => void book(selected, null)}>Change</Button></p>
              : selected.preferred_slots.length === 0 ? <p className="history-note">No times given. Call to agree one.</p>
              : <div className="ws-filters">{selected.preferred_slots.map(t => <Button key={t} size="sm" variant="outline" onClick={() => void book(selected, t)}>Book {slotLabel(t)}</Button>)}</div>}
            <p className="history-note">Wants confirmation by {selected.contact_channel === "email" ? `email (${selected.contact_email})` : selected.contact_channel === "whatsapp" ? "WhatsApp" : "SMS"}. Automatic messages come in phase 2.</p></section>
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

type Settings = Database["public"]["Tables"]["workshop_settings"]["Row"];
type Duration = { job: string; minutes: number };
type PriceItem = { task: string; price_sek: number };

function useSettings(workshopId: string) {
  const [s, setS] = useState<Settings | null>(null);
  const [state, setState] = useState("");
  useEffect(() => { void supabase.from("workshop_settings").select("*").eq("workshop_id", workshopId).maybeSingle().then(({ data }) => setS(data)); }, [workshopId]);
  const save = async (patch: Partial<Settings>) => {
    setState("Saving…");
    const { error } = await supabase.from("workshop_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("workshop_id", workshopId);
    setState(error ? "Couldn't save. Please try again." : "Saved.");
  };
  return { s, setS, save, state };
}

function SaveRow({ canEdit, state }: { canEdit: boolean; state: string }) {
  return <div className="ws-span">{canEdit ? <Button type="submit">Save</Button> : <p className="history-note">Only the workshop owner can change these.</p>}{state && <p className="history-note" role="status">{state}</p>}</div>;
}

function isAfterHours(i: Inquiry) {
  const d = new Date(i.created_at);
  const wd = d.toLocaleString("en-GB", { timeZone: "Europe/Stockholm", weekday: "short" });
  const h = Number(d.toLocaleString("en-GB", { timeZone: "Europe/Stockholm", hour: "2-digit", hour12: false }));
  return wd === "Sat" || wd === "Sun" || h < 8 || h >= 17;
}

function InsightsView({ items }: { items: Inquiry[] }) {
  const n = items.length;
  const reached = items.filter(i => i.status !== "new").length;
  const quoted = items.filter(i => ["quoted", "booked"].includes(i.status) || (i.status === "closed" && i.booked_at)).length;
  const booked = items.filter(i => i.booked_at || i.status === "booked").length;
  const top = Object.entries(items.reduce<Record<string, number>>((m, i) => { m[i.issue] = (m[i.issue] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const funnel = [{ label: "Received", v: n }, { label: "Contacted", v: reached }, { label: "Quoted", v: quoted }, { label: "Booked", v: booked }];
  return <div className="ws-section">
    <div className="ws-grid2">
      <section className="ws-card"><h2>From request to booking</h2><div className="ws-funnel">{funnel.map(f => <div key={f.label} className="ws-funnel-row"><span>{f.label}</span><span className="ws-bar"><span style={{ width: n ? `${(f.v / n) * 100}%` : 0 }}/></span><strong>{f.v}</strong></div>)}</div></section>
      <section className="ws-card"><h2>What drivers ask about</h2>{top.length === 0 ? <p className="history-note">No requests yet.</p> : <table className="ws-table"><tbody>{top.map(([k, v]) => <tr key={k}><td>{k}</td><td><strong>{v}</strong></td></tr>)}</tbody></table>}</section>
    </div>
  </div>;
}

const WEEKDAYS = [{ d: 1, l: "Mon" }, { d: 2, l: "Tue" }, { d: 3, l: "Wed" }, { d: 4, l: "Thu" }, { d: 5, l: "Fri" }, { d: 6, l: "Sat" }, { d: 0, l: "Sun" }];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);
const TYPICAL: Duration[] = [
  { job: "Annual service", minutes: 120 }, { job: "Brake pads & discs", minutes: 90 }, { job: "Tyre change", minutes: 30 },
  { job: "Diagnostics (engine light)", minutes: 60 }, { job: "Timing belt", minutes: 300 }, { job: "Battery replacement", minutes: 30 }, { job: "AC service", minutes: 60 },
];

function BookingSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const durations = s.job_durations as Duration[];
  const setDur = (d: Duration[]) => setS({ ...s, job_durations: d });
  const flip = (arr: number[], v: number) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort((a, b) => a - b);
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void save({ booking_days: s.booking_days, slot_hours: s.slot_hours, min_notice_days: s.min_notice_days, job_durations: durations.filter(d => d.job.trim()) }); }}>
    <p className="ws-section-intro">Decide when drivers can book you and how long each job takes. Drivers only see the times you open here.</p>
    <fieldset disabled={!canEdit} className="ws-grid2" style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2>When drivers can book</h2>
        <Label>Days</Label><div className="ws-chips">{WEEKDAYS.map(w => <Button key={w.d} type="button" size="sm" variant={s.booking_days.includes(w.d) ? "default" : "outline"} onClick={() => setS({ ...s, booking_days: flip(s.booking_days, w.d) })}>{w.l}</Button>)}</div>
        <Label>Drop-off times</Label><div className="ws-chips">{HOURS.map(h => <Button key={h} type="button" size="sm" variant={s.slot_hours.includes(h) ? "default" : "outline"} onClick={() => setS({ ...s, slot_hours: flip(s.slot_hours, h) })}>{String(h).padStart(2, "0")}:00</Button>)}</div>
        <Label htmlFor="b-notice">Earliest booking</Label>
        <select id="b-notice" className="native-select" value={s.min_notice_days} onChange={e => setS({ ...s, min_notice_days: Number(e.target.value) })}>{[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d === 1 ? "Next day" : `${d} days ahead`}</option>)}</select>
      </section>
      <section className="ws-card"><h2>How long jobs take</h2>
        <table className="ws-table"><thead><tr><th>Job</th><th>Minutes</th><th/></tr></thead><tbody>
          {durations.map((d, i) => <tr key={i}><td><Input aria-label="Job" maxLength={80} value={d.job} onChange={e => setDur(durations.map((x, j) => j === i ? { ...x, job: e.target.value } : x))}/></td><td><Input aria-label="Minutes" type="number" min={5} max={2880} step={5} value={d.minutes} onChange={e => setDur(durations.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) } : x))}/></td><td><Button type="button" size="sm" variant="ghost" aria-label="Remove" onClick={() => setDur(durations.filter((_, j) => j !== i))}>×</Button></td></tr>)}
        </tbody></table>
        <div className="ws-chips"><Button type="button" size="sm" variant="outline" onClick={() => setDur([...durations, { job: "", minutes: 60 }])}>Add job</Button><Button type="button" size="sm" variant="outline" onClick={() => setDur(TYPICAL)}>Not sure? Use typical times</Button></div>
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

function ContextSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const prices = s.price_list as PriceItem[];
  const setP = (p: PriceItem[]) => setS({ ...s, price_list: p });
  const services = (s.services as string[]).join("\n");
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void save({ hourly_rate_sek: s.hourly_rate_sek, price_list: prices.filter(p => p.task.trim()), services: (s.services as string[]).map(x => x.trim()).filter(Boolean), specialties: s.specialties, jackie_context: s.jackie_context }); }}>
    <p className="ws-section-intro">This is what makes Jackie sound like your workshop. Your prices, your strengths, the way you like to work.</p>
    <fieldset disabled={!canEdit} className="ws-grid2" style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2>Your prices (incl. VAT)</h2>
        <Label htmlFor="c-rate">Hourly labour rate (kr)</Label><Input id="c-rate" type="number" min={0} max={10000} value={s.hourly_rate_sek} onChange={e => setS({ ...s, hourly_rate_sek: Number(e.target.value) })}/>
        <table className="ws-table"><thead><tr><th>Standard job</th><th>Price (kr)</th><th/></tr></thead><tbody>
          {prices.map((p, i) => <tr key={i}><td><Input aria-label="Job" maxLength={80} value={p.task} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, task: e.target.value } : x))}/></td><td><Input aria-label="Price" type="number" min={0} max={200000} value={p.price_sek} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, price_sek: Number(e.target.value) } : x))}/></td><td><Button type="button" size="sm" variant="ghost" aria-label="Remove" onClick={() => setP(prices.filter((_, j) => j !== i))}>×</Button></td></tr>)}
        </tbody></table>
        <div><Button type="button" size="sm" variant="outline" onClick={() => setP([...prices, { task: "", price_sek: 0 }])}>Add price</Button></div>
      </section>
      <section className="ws-card"><h2>What you're good at</h2>
        <Label htmlFor="c-serv">Services you offer (one per line)</Label><textarea id="c-serv" className="native-select ws-textarea" value={services} onChange={e => setS({ ...s, services: e.target.value.split("\n") })}/>
        <Label htmlFor="c-spec">Specialties and brands</Label><textarea id="c-spec" className="native-select ws-textarea" maxLength={1000} placeholder="E.g. Volvo and VW specialists, EV certified, own tyre hotel" value={s.specialties} onChange={e => setS({ ...s, specialties: e.target.value })}/>
      </section>
      <section className="ws-card ws-span" style={{ gridColumn: "1 / -1" }}><h2>Notes for Jackie</h2>
        <Label htmlFor="c-ctx">How you work: preferred parts and materials, order of operations, what you always check</Label>
        <textarea id="c-ctx" className="native-select ws-textarea" maxLength={3000} placeholder="E.g. We use OEM brake parts only. We always replace pads and discs together. Diagnostics fee is deducted if you repair with us." value={s.jackie_context} onChange={e => setS({ ...s, jackie_context: e.target.value })}/>
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

function ProfileView({ shop, canEdit, onSaved }: { shop: Shop; canEdit: boolean; onSaved: () => void }) {
  const { s, setS, save, state } = useSettings(shop.id);
  const [city, setCity] = useState(shop.city);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const submit = async () => {
    if (city !== shop.city) { await supabase.from("workshops").update({ city }).eq("id", shop.id); onSaved(); }
    await save({ phone: s.phone, address: s.address, opening_hours: s.opening_hours, contact_email: s.contact_email, website: s.website });
  };
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <p className="ws-section-intro">How drivers find and reach you. Set up by AutoJackie at onboarding. Keep it up to date.</p>
    <fieldset disabled={!canEdit} className="ws-form" style={{ border: 0, padding: 0, margin: 0 }}>
      <div><Label>Company name</Label><div className="ws-readonly">{shop.name}</div></div>
      <div><Label>VAT number</Label><div className="ws-readonly">{shop.vat_number || "Not set"}</div></div>
      <div><Label htmlFor="p-phone">Phone</Label><Input id="p-phone" maxLength={30} value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })}/></div>
      <div><Label htmlFor="p-email">Contact email</Label><Input id="p-email" type="email" maxLength={120} value={s.contact_email} onChange={e => setS({ ...s, contact_email: e.target.value })}/></div>
      <div><Label htmlFor="p-addr">Address</Label><Input id="p-addr" maxLength={200} value={s.address} onChange={e => setS({ ...s, address: e.target.value })}/></div>
      <div><Label htmlFor="p-city">City</Label><Input id="p-city" maxLength={60} value={city} onChange={e => setCity(e.target.value)}/></div>
      <div><Label htmlFor="p-hours">Opening hours</Label><Input id="p-hours" maxLength={200} value={s.opening_hours} onChange={e => setS({ ...s, opening_hours: e.target.value })}/></div>
      <div><Label htmlFor="p-web">Website</Label><Input id="p-web" maxLength={200} value={s.website} onChange={e => setS({ ...s, website: e.target.value })}/></div>
      <p className="history-note ws-span">Company name and VAT number are managed by AutoJackie. Contact us to change them.</p>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
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
