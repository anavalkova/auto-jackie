import { slotLabel } from "@/lib/booking";
import { Link } from "@tanstack/react-router";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { ensureOther, OTHER } from "@/lib/services";
import { TIERS, TIER_INFO, DEFAULT_TIERS, type Tier } from "@/lib/ai-tiers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, Car, Clock, Inbox, MessageCircle, Moon, Phone, ShieldCheck, Sparkles, TrendingUp, Wrench } from "lucide-react";
import jackieImg from "@/assets/jackie.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SignInDialog } from "@/components/sign-in-dialog";
import { WhyNote, type WhyStat } from "@/components/why-note";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
type Status = Database["public"]["Enums"]["inquiry_status"];
type Shop = { id: string; name: string; city: string; vat_number: string; slug: string | null; role: string };
type Tab = "overview" | "booking" | "context" | "pricing" | "profile";
const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" }, { id: "booking", label: "Booking" }, { id: "context", label: "Jackie's context" }, { id: "pricing", label: "Pricing engine" }, { id: "profile", label: "Profile" },
];

const STATUSES: { id: Status; label: string }[] = [
  { id: "new", label: "New" }, { id: "contacted", label: "Contacted" }, { id: "quoted", label: "Quoted" }, { id: "booked", label: "Booked" }, { id: "closed", label: "Closed" },
];
const WHY: Record<Tab, { id: string; title: string; pitch: string; stats: WhyStat[]; points?: string[]; footer?: string }> = {
  overview: { id: "ws-overview", title: "See how your business performs. Then adapt.", pitch: "Every request, booking and estimated value in one place, not scattered across calendar, phone and accounting. Spot what drivers need and adjust your offer before the competition does.", stats: [
    { value: "63%", text: "of drivers don't trust repair shops. Requests here arrive with an upfront price range already explained.", source: { label: "AAA", url: "https://newsroom.aaa.com/wp-content/uploads/2016/12/Auto-Repair-Survey-FINAL.pdf" } },
    { value: "72%", text: "feel anxious about repair costs. Drivers who used Jackie already have a number in mind.", source: { label: "RepairPal / Harris", url: "https://repairpal.com/consumer-survey-march-2013" } },
  ] },
  booking: { id: "ws-booking", title: "Bookings that don't depend on your phone.", pitch: "Drivers book online in your open times and get confirmed by email, SMS or WhatsApp, whatever they prefer. No lost booking because nobody picked up or it was after hours.", stats: [
    { value: "7x", text: "more likely to win a lead when you respond within an hour.", source: { label: "Harvard Business Review", url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" } },
    { value: "1 in 4", text: "service bookings end as no-shows. Confirmations in the driver's own channel cut that down.", source: { label: "Solera via Dealership Guy", url: "https://news.dealershipguy.com/p/broken-service-scheduling-is-costing-dealers-big-time-here-s-how-some-are-closing-the-gaps" } },
  ] },
  context: { id: "ws-context", title: "Your expertise is your advantage. Teach it to Jackie.", pitch: "Your strengths and way of working shape every answer Jackie gives. You also choose how smart she is per job, so you only pay for quality where it wins customers.", stats: [
    { value: "71%", text: "of Swedish drivers pick a workshop for skilled staff, not low price.", source: { label: "OKQ8", url: "https://www.mynewsdesk.com/se/okq8/pressreleases/7-av-10-bilister-efterfraagar-kunnig-verkstadspersonal-visar-ny-undersoekning-922496" } },
    { value: "3 800", text: "workshops in Sweden compete for the same customers.", source: { label: "Mekonomen", url: "https://www.mynewsdesk.com/se/mekonomen/pressreleases/var-tredje-bilaegare-har-kaent-sig-lurad-av-verkstaden-oekad-kunskap-om-godkaend-bilverkstad-kan-vara-en-loesning-3359302" } },
  ] },
  pricing: { id: "ws-pricing", title: "Your prices, in every quote.", pitch: "Jackie's rough quotes start from your own price list, not a market average. Drivers arrive expecting your number, so fewer surprises at the counter.", stats: [
    { value: "72%", text: "of drivers feel anxious about what a repair will cost.", source: { label: "RepairPal / Harris", url: "https://repairpal.com/consumer-survey-march-2013" } },
    { value: "1 in 3", text: "Swedish car owners have felt cheated by a workshop.", source: { label: "Mekonomen", url: "https://www.mynewsdesk.com/se/mekonomen/pressreleases/var-tredje-bilaegare-har-kaent-sig-lurad-av-verkstaden-oekad-kunskap-om-godkaend-bilverkstad-kan-vara-en-loesning-3359302" } },
  ] },
  profile: { id: "ws-profile", title: "Your workshop, your brand.", pitch: "Jackie is your friendly front desk on your own page, in your colors and with your logo. Drivers talk to her first and arrive feeling helped, not sold to.", stats: [], points: [
    "Your own Jackie link to share on your website, Google profile or SMS.",
    "Your logo, accent color and greeting, so drivers see your workshop, not ours.",
    "Made for drivers without deep car knowledge. No jargon, no judging.",
    "Service in English, Swedish and German, so you don't miss foreign customers.",
  ] },
};
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
  const [page, setPage] = useState(0);
  const [error, setError] = useState(false);

  const loadShop = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("workshop_members").select("role, workshops(id,name,city,vat_number,slug)").eq("user_id", user.id).limit(1).maybeSingle();
    const w = data?.workshops as { id: string; name: string; city: string; vat_number: string; slug: string | null } | null | undefined;
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
  const FILTERS = ["open", ...STATUSES.map(x => x.id)] as const;
  const changeFilter = (f: string) => { if (!(FILTERS as readonly string[]).includes(f)) throw new Error("Unknown filter."); setFilter(f as Status | "open"); setPage(0); };
  useWebMCP({
    name: "list_requests",
    description: "List the driver requests shown in the workshop's request list for the active status filter.",
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    enabled: !!shop,
    execute: () => runWebMCPTool("list_requests", () => shown.length === 0 ? "No requests shown." : shown.slice(0, 50).map(i => `${i.id}: ${i.issue} · ${i.contact_name} · ${i.status}`).join("\n")),
  });
  useWebMCP({
    name: "filter_requests",
    description: "Change which requests the workshop request list shows: open, new, contacted, quoted, booked or closed.",
    inputSchema: { type: "object", properties: { filter: { type: "string", enum: [...FILTERS], description: "Status filter to apply." } }, required: ["filter"] },
    enabled: !!shop,
    execute: ({ filter: f }: { filter: string }) => runWebMCPTool("filter_requests", () => { changeFilter(f); return `Showing ${f} requests.`; }),
  });

  const book = async (i: Inquiry, at: string | null) => {
    const { data, error } = await supabase.from("inquiries").update({ booked_at: at, status: at ? "booked" : "contacted" }).eq("id", i.id).select("*").single();
    if (error || !data) return;
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
    <div className="ws-tabs" role="tablist" aria-label="Dashboard sections">{TABS.map(t => <Button key={t.id} variant={tab === t.id ? "default" : "outline"} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Button>)}<WhyNote key={tab} overlay {...WHY[tab]}/></div>
    {tab === "booking" ? <BookingTab requests={<>
    <div className="ws-filters" role="tablist" aria-label="Filter requests">
      {([{ id: "open", label: "All open" }, ...STATUSES] as { id: Status | "open"; label: string }[]).map(s => <Button key={s.id} size="sm" variant={filter === s.id ? "default" : "outline"} role="tab" aria-selected={filter === s.id} onClick={() => changeFilter(s.id)}>{s.label}</Button>)}
    </div>
    {error && <p className="chat-error" role="alert">Couldn't load or update requests.</p>}
    {shown.length === 0 ? <div className="ws-list-empty"><p>No requests here yet.</p><p className="history-note">When a driver books {shop.name}, directly or from one of Jackie's cards, it lands here.</p></div>
      : <ul className="ws-list">{shown.slice(page * PAGE, (page + 1) * PAGE).map(i => <li key={i.id}><button type="button" className="ws-row" onClick={() => setSelected(i)}>
        <span className={`ws-status s-${i.status}`}>{STATUSES.find(s => s.id === i.status)?.label}</span>
        <span className="ws-row-main"><strong>{i.issue}</strong><span>{i.contact_name}{i.vehicle_label ? ` · ${i.vehicle_label}` : ""}</span></span>
        <span className={`ws-urgency u-${i.urgency.replace(" ", "-")}`}>{i.urgency}</span>
        <span className="ws-price">{i.price_low_sek != null && i.price_high_sek != null ? `${kr(i.price_low_sek)} to ${kr(i.price_high_sek)}` : "No price"}</span>
        <time dateTime={i.created_at}>{when(i.created_at)}</time>
      </button></li>)}</ul>}
    {shown.length > PAGE && <Pager page={page} pages={Math.ceil(shown.length / PAGE)} onPage={setPage}/>}
    </>} settings={<BookingSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>}/>
    : tab === "context" ? <ContextSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "pricing" ? <PricingView workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "profile" ? <ProfileView shop={shop} canEdit={shop.role === "owner"} onSaved={loadShop}/> : <>
    <div className="ws-kpis">
      <Kpi icon={<Inbox/>} label="New requests" value={String(kpis.fresh)}/>
      <Kpi icon={<CalendarClock/>} label="Need you this week" value={String(kpis.urgent)}/>
      <Kpi icon={<TrendingUp/>} label="Open pipeline (est.)" value={kr(kpis.pipeline)} hint="Midpoint of Jackie's rough ranges, incl. VAT"/>
      <Kpi icon={<Moon/>} label="After hours" value={kpis.afterHours} hint="Requests that came in evenings or weekends, when you were closed"/>
    </div>
    <InsightsView items={items} workshopId={shop.id} canEdit={shop.role === "owner"}/>
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
          <QuoteSection key={selected.id} item={selected} shopName={shop?.name ?? ""} onSaved={d => { setItems(xs => xs.map(x => x.id === d.id ? d : x)); setSelected(d); }}/>
          <section><span className="eyebrow">{selected.booked_at ? "BOOKED" : "PREFERRED TIMES"}</span>
            {selected.booked_at ? <p><strong>{slotLabel(selected.booked_at)}</strong> <Button variant="link" size="sm" onClick={() => void book(selected, null)}>Change</Button></p>
              : selected.preferred_slots.length === 0 ? <p className="history-note">No times given. Call to agree one.</p>
              : <div className="ws-filters">{selected.preferred_slots.map(t => <Button key={t} size="sm" variant="outline" onClick={() => void book(selected, t)}>Book {slotLabel(t)}</Button>)}</div>}
            <p className="history-note">Wants confirmation by {selected.contact_channel === "email" ? `email (${selected.contact_email})` : selected.contact_channel === "whatsapp" ? "WhatsApp" : "SMS"}. Automatic messages come in phase 2.</p></section>
          {selected.message && <section><span className="eyebrow">MESSAGE FROM THE DRIVER</span><p>{selected.message}</p></section>}
          <section><span className="eyebrow">STATUS</span><div className="ws-filters">{STATUSES.map(s => <Button key={s.id} size="sm" variant={selected.status === s.id ? "default" : "outline"} onClick={() => void setStatus(selected, s.id)}>{s.label}</Button>)}</div></section>
        </div>
      </>}</SheetContent>
    </Sheet>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </div>;
}

const PAGE = 10;
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return <div className="ws-pager"><Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</Button><span className="history-note">Page {page + 1} of {pages}</span><Button type="button" size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</Button></div>;
}

const BOOKING_STEPS = [{ title: "Requests" }, { title: "Booking settings" }];
function BookingTab({ requests, settings }: { requests: React.ReactNode; settings: React.ReactNode }) {
  const [step, setStep] = useState(0);
  return <div className="ws-section"><Stepper steps={BOOKING_STEPS} step={step} setStep={setStep}/>{step === 0 ? <Collapsible title="Requests"><div className="ws-section">{requests}</div></Collapsible> : settings}</div>;
}

function Collapsible({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="ws-card ws-collapsible" open={defaultOpen}><summary><h2>{title}</h2></summary>{children}</details>;
}

function QuoteSection({ item, shopName, onSaved }: { item: Inquiry; shopName: string; onSaved: (d: Inquiry) => void }) {
  const [low, setLow] = useState(item.quote_low_sek ?? item.price_low_sek ?? 0);
  const [high, setHigh] = useState(item.quote_high_sek ?? item.price_high_sek ?? 0);
  const [msg, setMsg] = useState("");
  const jackie = item.price_low_sek != null && item.price_high_sek != null ? `${kr(item.price_low_sek)} to ${kr(item.price_high_sek)}` : null;
  const yours = item.quote_low_sek != null && item.quote_high_sek != null ? `${kr(item.quote_low_sek)} to ${kr(item.quote_high_sek)}` : null;
  const saveQuote = async () => {
    const lo = Math.min(low, high), hi = Math.max(low, high);
    const { data, error } = await supabase.from("inquiries").update({ quote_low_sek: lo, quote_high_sek: hi, status: item.status === "new" || item.status === "contacted" ? "quoted" : item.status }).eq("id", item.id).select("*").single();
    setMsg(error || !data ? "Couldn't save. Please try again." : "Saved. Now let the driver know.");
    if (data) onSaved(data);
  };
  const price = yours ?? jackie;
  const text = `Hi ${item.contact_name}, this is ${shopName} about your request "${item.issue}". ${price ? `${yours ? "Our price" : "Jackie's rough estimate"} is ${price} incl. VAT.` : ""}${yours && jackie && yours !== jackie ? ` (Jackie estimated ${jackie}.)` : ""} Does that work for you?`;
  const phone = item.contact_phone.replace(/[^\d+]/g, "");
  const intl = phone.startsWith("+") ? phone.slice(1) : phone.startsWith("0") ? `46${phone.slice(1)}` : phone;
  return <section><span className="eyebrow">INDICATIVE QUOTE</span>
    <table className="ws-table"><tbody>
      <tr><td>Service</td><td><strong>{item.service ?? OTHER}</strong></td></tr>
      <tr><td>Jackie quoted the driver</td><td><strong>{jackie ? `${jackie} incl. VAT` : "No estimate (direct booking)"}</strong></td></tr>
      {yours && <tr><td>Your adjusted price</td><td><strong>{yours} incl. VAT</strong></td></tr>}
    </tbody></table>
    {item.note && <p className="history-note">Jackie told the driver: “{item.note}”</p>}
    <Label>Adjust the price (kr, incl. VAT)</Label>
    <div className="ws-chips"><Input aria-label="From" type="number" min={0} max={500000} value={low} onChange={e => setLow(Number(e.target.value))} style={{ width: 110 }}/><span>to</span><Input aria-label="To" type="number" min={0} max={500000} value={high} onChange={e => setHigh(Number(e.target.value))} style={{ width: 110 }}/><Button type="button" size="sm" onClick={() => void saveQuote()}>Save price</Button></div>
    {msg && <p className="history-note" role="status">{msg}</p>}
    <Label>Contact the driver about the quote</Label>
    <div className="ws-chips">
      <Button size="sm" variant="outline" asChild><a href={`sms:${phone}?body=${encodeURIComponent(text)}`}>SMS</a></Button>
      <Button size="sm" variant="outline" asChild><a href={`https://wa.me/${intl}?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>
      {item.contact_email && <Button size="sm" variant="outline" asChild><a href={`mailto:${item.contact_email}?subject=${encodeURIComponent(`Your quote: ${item.issue}`)}&body=${encodeURIComponent(text)}`}>Email</a></Button>}
      <Button size="sm" variant="outline" asChild><a href={`tel:${phone}`}><Phone/> Call</a></Button>
    </div>
    <p className="history-note">Opens your phone or email with a ready message. The driver prefers {item.contact_channel === "email" ? "email" : item.contact_channel === "whatsapp" ? "WhatsApp" : "SMS"}.</p>
  </section>;
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return <div className="ws-kpi" title={hint}>{icon}<span className="eyebrow">{label.toUpperCase()}</span><strong>{value}</strong>{hint && <small>{hint}</small>}</div>;
}

type Settings = Database["public"]["Tables"]["workshop_settings"]["Row"];
type Duration = { job: string; minutes: number };
type PriceItem = { task: string; price_sek: number; minutes?: number };

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

function InsightsView({ items, workshopId, canEdit }: { items: Inquiry[]; workshopId: string; canEdit: boolean }) {
  const { s, setS, save } = useSettings(workshopId);
  const n = items.length;
  const reached = items.filter(i => i.status !== "new").length;
  const quoted = items.filter(i => ["quoted", "booked"].includes(i.status) || (i.status === "closed" && i.booked_at)).length;
  const isBooked = (i: Inquiry) => !!i.booked_at || i.status === "booked";
  const booked = items.filter(isBooked).length;
  const funnel = [{ label: "Received", v: n }, { label: "Contacted", v: reached }, { label: "Quoted", v: quoted }, { label: "Booked", v: booked }];
  const services = ensureOther((s?.price_list as PriceItem[] | undefined) ?? []);
  const rows = services.filter(x => x.task !== OTHER).map(x => {
    const its = items.filter(i => i.service === x.task);
    const b = its.filter(isBooked).length;
    return { task: x.task, req: its.length, booked: b, value: b * x.price_sek };
  }).sort((a, b) => b.req - a.req);
  const otherCount = items.filter(i => !i.service || i.service === OTHER).length;
  const known = new Set(services.map(x => x.task.toLowerCase()));
  const missing = Object.entries(items.filter(i => !i.service || i.service === OTHER).reduce<Record<string, number>>((m, i) => { const k = i.issue.trim(); if (!known.has(k.toLowerCase())) m[k] = (m[k] ?? 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const [added, setAdded] = useState<string[]>([]);
  const [sp, setSp] = useState(0);
  const [mp, setMp] = useState(0);
  const addService = async (task: string) => {
    if (!s) return;
    const list = ensureOther(s.price_list as PriceItem[]);
    const next = [...list.filter(x => x.task !== OTHER), { task: task.slice(0, 80), price_sek: 0, minutes: 60 }, ...list.filter(x => x.task === OTHER)];
    setS({ ...s, price_list: next }); setAdded(a => [...a, task]);
    await save({ price_list: next, job_durations: next.map(x => ({ job: x.task, minutes: x.minutes ?? 60 })) });
  };
  const channels = (["sms", "whatsapp", "email"] as const).map(c => ({
    label: c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : "Email",
    v: items.filter(i => i.contact_channel === c).length,
  }));
  return <div className="ws-section">
    <h2 className="ws-h2">Insights</h2>
    <div className="ws-insights">
      <Collapsible title="From request to booking"><div className="ws-funnel">{funnel.map(f => <div key={f.label} className="ws-funnel-row"><span>{f.label}</span><span className="ws-bar"><span style={{ width: n ? `${(f.v / n) * 100}%` : 0 }}/></span><strong>{f.v}</strong></div>)}</div></Collapsible>
      <Collapsible title="How drivers want to be reached">
        <p className="ws-hint"><span>The channel each driver picked for confirmation. Automatic messages come in phase 2.</span></p>
        <div className="ws-funnel">{channels.map(c => <div key={c.label} className="ws-funnel-row"><span>{c.label}</span><span className="ws-bar"><span style={{ width: n ? `${(c.v / n) * 100}%` : 0 }}/></span><strong>{c.v}</strong></div>)}</div>
      </Collapsible>
      <Collapsible title="Your services">
        <p className="ws-hint"><span>Requests matched to your Pricing engine. Value = bookings × your price.</span></p>
        <table className="ws-table"><thead><tr><th>Service</th><th>Requests</th><th>Booked</th><th>Value</th></tr></thead><tbody>
          {rows.slice(sp * PAGE, (sp + 1) * PAGE).map(r => <tr key={r.task}><td>{r.task}</td><td><strong>{r.req}</strong></td><td>{r.booked}</td><td>{r.value ? kr(r.value) : "–"}</td></tr>)}
          <tr><td>Other <small className="history-note">(you price these)</small></td><td><strong>{otherCount}</strong></td><td>{items.filter(i => (!i.service || i.service === OTHER) && isBooked(i)).length}</td><td>–</td></tr>
        </tbody></table>
        {rows.length > PAGE && <Pager page={sp} pages={Math.ceil(rows.length / PAGE)} onPage={setSp}/>}
      </Collapsible>
      <Collapsible title="Drivers asked, you don't offer yet">
        <p className="ws-hint"><span>Requests that landed in Other. Add the common ones to your Pricing engine so Jackie can quote them next time.</span></p>
        {missing.length === 0 ? <p className="history-note">Nothing yet. Every request matched one of your services.</p>
          : <table className="ws-table"><tbody>{missing.slice(mp * PAGE, (mp + 1) * PAGE).map(([k, v]) => <tr key={k}><td>{k}</td><td><strong>{v}</strong></td><td style={{ textAlign: "right" }}>{added.includes(k) ? <span className="history-note">Added. Set its price in Pricing engine.</span> : canEdit && <Button type="button" size="sm" variant="outline" onClick={() => void addService(k)}>Add to Pricing engine</Button>}</td></tr>)}</tbody></table>}
        {missing.length > PAGE && <Pager page={mp} pages={Math.ceil(missing.length / PAGE)} onPage={setMp}/>}
      </Collapsible>
    </div>
  </div>;
}

const WEEKDAYS = [{ d: 1, l: "Mon" }, { d: 2, l: "Tue" }, { d: 3, l: "Wed" }, { d: 4, l: "Thu" }, { d: 5, l: "Fri" }, { d: 6, l: "Sat" }, { d: 0, l: "Sun" }];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

function BookingSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const durations = s.job_durations as Duration[];
  const flip = (arr: number[], v: number) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort((a, b) => a - b);
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void save({ booking_days: s.booking_days, slot_hours: s.slot_hours, min_notice_days: s.min_notice_days }); }}>
    <p className="ws-section-intro">Decide when drivers can book you and how long each job takes. Drivers only see the times you open here.</p>
    <fieldset disabled={!canEdit} className="ws-grid2" style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2>When drivers can book</h2>
        <Label>Days</Label><div className="ws-chips">{WEEKDAYS.map(w => <Button key={w.d} type="button" size="sm" variant={s.booking_days.includes(w.d) ? "default" : "outline"} onClick={() => setS({ ...s, booking_days: flip(s.booking_days, w.d) })}>{w.l}</Button>)}</div>
        <Label>Drop-off times</Label><div className="ws-chips">{HOURS.map(h => <Button key={h} type="button" size="sm" variant={s.slot_hours.includes(h) ? "default" : "outline"} onClick={() => setS({ ...s, slot_hours: flip(s.slot_hours, h) })}>{String(h).padStart(2, "0")}:00</Button>)}</div>
        <Label htmlFor="b-notice">Earliest booking</Label>
        <select id="b-notice" className="native-select" value={s.min_notice_days} onChange={e => setS({ ...s, min_notice_days: Number(e.target.value) })}>{[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d === 1 ? "Next day" : `${d} days ahead`}</option>)}</select>
      </section>
      <section className="ws-card"><h2>How long jobs take</h2>
        <table className="ws-table"><tbody>{durations.map((d, i) => <tr key={i}><td>{d.job}</td><td><strong>{d.minutes} min</strong></td></tr>)}</tbody></table>
        <p className="history-note">Job times are set per service in the Pricing engine tab.</p>
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

const CONTEXT_STEPS = [
  { title: "Your strengths", sees: "Drivers on your Jackie page hear why your workshop fits their problem." },
  { title: "How you work", sees: "Jackie explains what you would do, in your order and with your parts." },
  { title: "Jackie's brain", sees: "Nothing visible. It controls answer quality, speed and running cost." },
];

const PROFILE_STEPS = [
  { title: "Contact details", sees: "How to reach and find you, mostly after they book." },
  { title: "Your brand", sees: "Your page link, colors, logo and greeting on your Jackie page." },
];

function Stepper({ steps, step, setStep }: { steps: { title: string }[]; step: number; setStep: (n: number) => void }) {
  return <ol className="ws-stepper">{steps.map((st, i) => <li key={st.title}><button type="button" aria-current={i === step ? "step" : undefined} data-done={i < step || undefined} onClick={() => setStep(i)}><span className="ws-step-num">{i + 1}</span>{st.title}</button></li>)}</ol>;
}

function WizardActions({ canEdit, last, next }: { canEdit: boolean; last: boolean; next: () => void }) {
  return <div className="ws-chips">{canEdit ? <Button type="submit" variant={last ? "default" : "outline"}>Save this step</Button> : <span className="history-note">Only the workshop owner can change these.</span>}{!last && <Button type="button" onClick={next}>Next</Button>}</div>;
}

function Hint({ controls, shows }: { controls: string; shows: string }) {
  return <p className="ws-hint"><span><b>Controls:</b> {controls}</span><span><b>Shows:</b> {shows}</span></p>;
}

function ContextSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  const [step, setStep] = useState(0);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const services = (s.services as string[]).join("\n");
  const last = step === CONTEXT_STEPS.length - 1;
  const cur = CONTEXT_STEPS[step]!;
  return <form className="ws-section ws-wizard" onSubmit={e => { e.preventDefault(); void save({ ai_chat_tier: s.ai_chat_tier, ai_quote_tier: s.ai_quote_tier, services: (s.services as string[]).map(x => x.trim()).filter(Boolean), specialties: s.specialties, jackie_context: s.jackie_context }); }}>
    <Stepper steps={CONTEXT_STEPS} step={step} setStep={setStep}/>
    <section className="ws-card">
      <div className="ws-step-head"><h2>{step + 1}. {cur.title}</h2><p className="ws-hint"><span><b>Drivers see:</b> {cur.sees}</span></p></div>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {step === 0 && <>
          <Label htmlFor="c-serv">Services you offer (one per line)</Label><textarea id="c-serv" className="native-select ws-textarea" value={services} onChange={e => setS({ ...s, services: e.target.value.split("\n") })}/>
          <Label htmlFor="c-spec">Specialties and brands</Label><textarea id="c-spec" className="native-select ws-textarea" maxLength={1000} placeholder="E.g. Volvo and VW specialists, EV certified, own tyre hotel" value={s.specialties} onChange={e => setS({ ...s, specialties: e.target.value })}/>
        </>}
        {step === 1 && <>
          <Label htmlFor="c-ctx">Preferred parts and materials, order of operations, what you always check</Label>
          <textarea id="c-ctx" className="native-select ws-textarea ws-textarea-tall" maxLength={3000} placeholder="E.g. We use OEM brake parts only. We always replace pads and discs together. Diagnostics fee is deducted if you repair with us." value={s.jackie_context} onChange={e => setS({ ...s, jackie_context: e.target.value })}/>
        </>}
        {step === 2 && <>
          <p className="history-note">Pick a level for each group of jobs Jackie does. Smarter means better answers but higher running costs, which may change your AutoJackie price. ★ is our recommendation.</p>
          <div className="ws-tiers">
            <TierRow title="Everyday chat" hint="Listening, explaining, fault codes and manual lookups. Most of the volume, so cost adds up here." value={s.ai_chat_tier as Tier} recommended={DEFAULT_TIERS.chat} onChange={v => setS({ ...s, ai_chat_tier: v })}/>
            <TierRow title="Rough quotes" hint="Drafting the price range a driver sees, using your price list. Rare, but accuracy builds trust." value={s.ai_quote_tier as Tier} recommended={DEFAULT_TIERS.quote} onChange={v => setS({ ...s, ai_quote_tier: v })}/>
          </div>
          <div><Button type="button" size="sm" variant="outline" onClick={() => setS({ ...s, ai_chat_tier: DEFAULT_TIERS.chat, ai_quote_tier: DEFAULT_TIERS.quote })}>Reset to recommended</Button></div>
        </>}
      </fieldset>
      <div className="ws-wizard-nav">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        <WizardActions canEdit={canEdit} last={last} next={() => setStep(step + 1)}/>
      </div>
      {state && <p className="history-note" role="status">{state}</p>}
    </section>
  </form>;
}

function TierRow({ title, hint, value, recommended, onChange }: { title: string; hint: string; value: Tier; recommended: Tier; onChange: (t: Tier) => void }) {
  const diff = TIER_INFO[value].costFactor / TIER_INFO[recommended].costFactor;
  return <div className="ws-tier-row">
    <div><h3>{title}</h3><p className="history-note">{hint}</p></div>
    <div>
      <div className="ws-tier-options" role="group" aria-label={title}>{TIERS.map(t => <button key={t} type="button" className="ws-tier-opt" aria-pressed={value === t} onClick={() => onChange(t)}>
        <strong><span>{TIER_INFO[t].label}{t === recommended ? " ★" : ""}</span><span>{TIER_INFO[t].cost}</span></strong>{TIER_INFO[t].text}</button>)}</div>
      {value !== recommended && <p className="ws-tier-warn">{diff > 1 ? `About ${Math.round(diff)}× the running cost of the recommended setting. This may raise your monthly price.` : "Cheaper, but answers may be less careful. Recommended (★) is the best balance."}</p>}
    </div>
  </div>;
}

const PREDEFINED_SERVICES: { task: string; price_sek: number; minutes: number }[] = [
  { task: "Annual service", price_sek: 2900, minutes: 120 }, { task: "Small service (oil & filter)", price_sek: 1500, minutes: 60 },
  { task: "Brake pads, front", price_sek: 1900, minutes: 60 }, { task: "Brake pads & discs, front", price_sek: 3900, minutes: 90 },
  { task: "Tyre change", price_sek: 500, minutes: 30 }, { task: "Tyre hotel (per season)", price_sek: 900, minutes: 15 },
  { task: "Wheel alignment", price_sek: 1000, minutes: 45 }, { task: "Diagnostics (engine light)", price_sek: 750, minutes: 60 },
  { task: "Battery replacement", price_sek: 1800, minutes: 30 }, { task: "AC service", price_sek: 1200, minutes: 60 },
  { task: "Timing belt", price_sek: 6500, minutes: 300 }, { task: "Clutch replacement", price_sek: 9000, minutes: 360 },
  { task: "Inspection prep (besiktning)", price_sek: 800, minutes: 45 }, { task: "Wiper blades", price_sek: 400, minutes: 15 },
];

function PricingView({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const durations = s.job_durations as Duration[];
  const prices = ensureOther(s.price_list as PriceItem[]).map(p => ({ ...p, minutes: p.minutes ?? durations.find(d => d.job === p.task)?.minutes ?? 60 }));
  const setP = (p: PriceItem[]) => setS({ ...s, price_list: p });
  const available = PREDEFINED_SERVICES.filter(x => !prices.some(p => p.task === x.task));
  const submit = () => {
    const clean = ensureOther(prices.filter(p => p.task.trim() && (p.task !== OTHER || true)));
    void save({ hourly_rate_sek: s.hourly_rate_sek, price_list: clean, job_durations: clean.map(p => ({ job: p.task, minutes: p.minutes ?? 60 })) });
  };
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); submit(); }}>
    <p className="ws-section-intro">Your services, prices and job times drive every rough quote Jackie gives and how long a booking blocks your calendar.</p>
    <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2>Services, prices and times (incl. VAT)</h2>
        <Hint controls="the price range in Jackie's “What's next” card and how long each booking takes." shows="prices to drivers on your Jackie page, labelled as an estimate. Times only to you."/>
        <Label htmlFor="c-rate">Hourly labour rate (kr)</Label><Input id="c-rate" type="number" min={0} max={10000} value={s.hourly_rate_sek} onChange={e => setS({ ...s, hourly_rate_sek: Number(e.target.value) })}/>
        <table className="ws-table"><thead><tr><th>Service</th><th>Price (kr)</th><th>Time (min)</th><th/></tr></thead><tbody>
          {prices.map((p, i) => p.task === OTHER ? <tr key={i} className="ws-other-row"><td><strong>Other</strong><small className="history-note"> Anything Jackie can't match. You price it after a look.</small></td><td><Input aria-label="Price" type="number" min={0} max={200000} value={p.price_sek} title="0 = evaluated by you" onChange={e => setP(prices.map((x, j) => j === i ? { ...x, price_sek: Number(e.target.value) } : x))}/></td><td><Input aria-label="Minutes" type="number" min={5} max={2880} step={5} value={p.minutes} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) } : x))}/></td><td/></tr> : <tr key={i}><td><Input aria-label="Service" maxLength={80} value={p.task} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, task: e.target.value } : x))}/></td><td><Input aria-label="Price" type="number" min={0} max={200000} value={p.price_sek} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, price_sek: Number(e.target.value) } : x))}/></td><td><Input aria-label="Minutes" type="number" min={5} max={2880} step={5} value={p.minutes} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) } : x))}/></td><td><Button type="button" size="sm" variant="ghost" aria-label="Remove" onClick={() => setP(prices.filter((_, j) => j !== i))}>×</Button></td></tr>)}
        </tbody></table>
        <div className="ws-chips">
          <select aria-label="Add a service" className="native-select" value="" onChange={e => { const v = e.target.value; if (v === "__custom") setP([...prices.filter(p => p.task !== OTHER), { task: "", price_sek: 0, minutes: 60 }, ...prices.filter(p => p.task === OTHER)]); else { const x = PREDEFINED_SERVICES.find(o => o.task === v); if (x) setP([...prices.filter(p => p.task !== OTHER), { ...x }, ...prices.filter(p => p.task === OTHER)]); } }}>
            <option value="">Add a service…</option>
            {available.map(o => <option key={o.task} value={o.task}>{o.task}</option>)}
            <option value="__custom">Custom service…</option>
          </select>
        </div>
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

function ProfileView({ shop, canEdit, onSaved }: { shop: Shop; canEdit: boolean; onSaved: () => void }) {
  const { s, setS, save, state } = useSettings(shop.id);
  const [city, setCity] = useState(shop.city);
  const [step, setStep] = useState(0);
  if (!s) return <p className="history-note" role="status">Loading…</p>;
  const link = shop.slug && typeof window !== "undefined" ? `${window.location.origin}/w/${shop.slug}` : "";
  const submit = async () => {
    if (city !== shop.city) { await supabase.from("workshops").update({ city }).eq("id", shop.id); onSaved(); }
    await save({ phone: s.phone, address: s.address, opening_hours: s.opening_hours, contact_email: s.contact_email, website: s.website,
      brand_accent: /^#[0-9a-fA-F]{6}$/.test(s.brand_accent) ? s.brand_accent : "", brand_logo_url: /^https:\/\//.test(s.brand_logo_url) ? s.brand_logo_url : "", brand_greeting: s.brand_greeting });
  };
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <Stepper steps={PROFILE_STEPS} step={step} setStep={setStep}/>
    <section className="ws-card">
    <div className="ws-step-head"><h2>{step + 1}. {PROFILE_STEPS[step]!.title}</h2><p className="ws-hint"><span><b>Drivers see:</b> {PROFILE_STEPS[step]!.sees}</span></p></div>
    <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
      {step === 0 && <div className="ws-form-card ws-grid2">
        <div><Label>Company name</Label><div className="ws-readonly">{shop.name}</div><Hint controls="your name in the booking list and on your Jackie page." shows="to drivers. Managed by AutoJackie."/></div>
        <div><Label>VAT number</Label><div className="ws-readonly">{shop.vat_number || "Not set"}</div><Hint controls="invoicing between you and AutoJackie." shows="nowhere to drivers. Managed by AutoJackie."/></div>
        <div><Label htmlFor="p-phone">Phone</Label><Input id="p-phone" maxLength={30} value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })}/><Hint controls="how drivers can call you." shows="to drivers after they book."/></div>
        <div><Label htmlFor="p-email">Contact email</Label><Input id="p-email" type="email" maxLength={120} value={s.contact_email} onChange={e => setS({ ...s, contact_email: e.target.value })}/><Hint controls="where booking updates are sent." shows="only to AutoJackie and you."/></div>
        <div><Label htmlFor="p-addr">Address</Label><Input id="p-addr" maxLength={200} value={s.address} onChange={e => setS({ ...s, address: e.target.value })}/><Hint controls="where drivers drop off their car." shows="to drivers after they book."/></div>
        <div><Label htmlFor="p-city">City</Label><Input id="p-city" maxLength={60} value={city} onChange={e => setCity(e.target.value)}/><Hint controls="which drivers see you when picking a workshop." shows="in the workshop list when booking."/></div>
        <div><Label htmlFor="p-hours">Opening hours</Label><Input id="p-hours" maxLength={200} value={s.opening_hours} onChange={e => setS({ ...s, opening_hours: e.target.value })}/><Hint controls="what Jackie says when drivers ask when you're open." shows="in Jackie's answers on your page."/></div>
        <div><Label htmlFor="p-web">Website</Label><Input id="p-web" maxLength={200} value={s.website} onChange={e => setS({ ...s, website: e.target.value })}/><Hint controls="a link back to your own site." shows="to drivers after they book."/></div>
      </div>}
      {step === 1 && <div className="ws-form-card">
        <div><Label>Your Jackie page</Label>{link && <div className="ws-chips"><a href={link} target="_blank" rel="noreferrer" className="text-link">{link}</a><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard?.writeText(link)}>Copy</Button></div>}<Hint controls="the page where drivers chat with Jackie as your workshop." shows="wherever you share it: website, Google profile, SMS."/></div>
        <div><Label htmlFor="b-accent">Accent color</Label><div className="ws-chips"><input id="b-accent" type="color" value={s.brand_accent || "#f2711c"} onChange={e => setS({ ...s, brand_accent: e.target.value })}/>{s.brand_accent && <Button type="button" size="sm" variant="ghost" onClick={() => setS({ ...s, brand_accent: "" })}>Use AutoJackie orange</Button>}</div><Hint controls="buttons, highlights and links." shows="on your Jackie page."/></div>
        <div><Label htmlFor="b-logo">Logo link (https)</Label><Input id="b-logo" maxLength={500} placeholder="https://yourworkshop.se/logo.png" value={s.brand_logo_url} onChange={e => setS({ ...s, brand_logo_url: e.target.value })}/><Hint controls="the small logo next to your name." shows="in the top bar of your Jackie page."/></div>
        <div><Label htmlFor="b-greet">Greeting line</Label><Input id="b-greet" maxLength={160} placeholder="Welcome to Demo Verkstad. Tell Jackie what's up." value={s.brand_greeting} onChange={e => setS({ ...s, brand_greeting: e.target.value })}/><Hint controls="the welcome line above the chat." shows="on your Jackie page, before drivers type."/></div>
      </div>}
    </fieldset>
    <div className="ws-wizard-nav"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button><WizardActions canEdit={canEdit} last={step === PROFILE_STEPS.length - 1} next={() => setStep(step + 1)}/></div>
    {state && <p className="history-note" role="status">{state}</p>}
    </section>
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
