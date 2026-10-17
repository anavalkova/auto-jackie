import { holidayName, slotLabel, swedishHolidays } from "@/lib/booking";
import { tr } from "@/lib/tr";
import { getLang } from "@/lib/i18n";
const loc = () => ({ en: "en-GB", sv: "sv-SE", de: "de-DE" } as const)[getLang()];
import { Link } from "@tanstack/react-router";
import { useWebMCP } from "use-webmcp-tool";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { ensureOther, OTHER } from "@/lib/services";
import { TIERS, TIER_INFO, DEFAULT_TIERS, type Tier } from "@/lib/ai-tiers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LogOut, Settings2, UserRound, CircleHelp, CalendarCheck, CalendarClock, Car, ChevronDown, Globe2, Inbox, MessageCircle, Moon, Sparkles, TrendingUp, Wrench } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGS, setLang, useT } from "@/lib/i18n";
import jackieImg from "@/assets/jackie.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  { id: "overview", label: "Overview" }, { id: "booking", label: "Booking" }, { id: "context", label: "Jackie's context" }, { id: "pricing", label: "Pricing engine" }, { id: "profile", label: "Settings" },
];
const STAFF_TABS: Tab[] = ["overview", "booking"];

const STATUSES: { id: Status; label: string }[] = [
  { id: "new", label: "New" }, { id: "contacted", label: "Contacted" }, { id: "quoted", label: "Quoted" }, { id: "booked", label: "Booked" }, { id: "closed", label: "Closed" },
];
const WHY: Record<Tab, { id: string; title: string; pitch: string; stats: WhyStat[]; points?: string[]; footer?: string }> = {
  overview: { id: "ws-overview", title: "See how your business performs. Then adapt.", pitch: "Every request, booking and estimated value in one place, not scattered across calendar, phone and accounting. Spot what drivers need and adjust your offer before the competition does.", stats: [
    { value: "63%", text: "of drivers don't trust repair shops. Requests here arrive with an upfront price range already explained.", source: { label: "AAA", url: "https://newsroom.aaa.com/wp-content/uploads/2016/12/Auto-Repair-Survey-FINAL.pdf" } },
    { value: "72%", text: "feel anxious about repair costs. Drivers who used Jackie already have a number in mind.", source: { label: "RepairPal / Harris", url: "https://repairpal.com/consumer-survey-march-2013" } },
  ] },
  booking: { id: "ws-booking", title: "Bookings that don't depend on your phone.", pitch: "Drivers book online in your open times and get confirmed by email, SMS or WhatsApp, whatever they prefer. No lost booking because nobody picked up or it was after hours.", points: ["Drivers are used to AI and instant answers. Booking has to feel just as fast.", "A few taps, no calls, no forms to decode."], stats: [
    { value: "7x", text: "more likely to win a lead when you respond within an hour.", source: { label: "Harvard Business Review", url: "https://hbr.org/2011/03/the-short-life-of-online-sales-leads" } },
    { value: "1 in 4", text: "service bookings end as no-shows. Confirmations in the driver's own channel cut that down.", source: { label: "Solera via Dealership Guy", url: "https://news.dealershipguy.com/p/broken-service-scheduling-is-costing-dealers-big-time-here-s-how-some-are-closing-the-gaps" } },
  ] },
  context: { id: "ws-context", title: "Your expertise is your advantage. Teach it to Jackie.", pitch: "Your strengths and way of working shape every answer Jackie gives. You also choose how smart she is per job, so you only pay for quality where it wins customers.", points: ["Drivers don't speak car. Jackie translates for them, using your know-how.", "Your preferred parts, methods and order of work, in every answer.", "She explains, calms and triages. You decide and repair.", "Fair use is built in: guests get 5 questions a month, signed-in drivers 50. Your page can't be overused and your AI costs stay predictable."], stats: [
    { value: "71%", text: "of Swedish drivers pick a workshop for skilled staff, not low price.", source: { label: "OKQ8", url: "https://www.mynewsdesk.com/se/okq8/pressreleases/7-av-10-bilister-efterfraagar-kunnig-verkstadspersonal-visar-ny-undersoekning-922496" } },
    { value: "3 800", text: "workshops in Sweden compete for the same customers.", source: { label: "Mekonomen", url: "https://www.mynewsdesk.com/se/mekonomen/pressreleases/var-tredje-bilaegare-har-kaent-sig-lurad-av-verkstaden-oekad-kunskap-om-godkaend-bilverkstad-kan-vara-en-loesning-3359302" } },
  ] },
  pricing: { id: "ws-pricing", title: "Your prices, in every quote.", pitch: "Jackie's rough quotes start from your own price list, not a market average. Drivers arrive expecting your number, so fewer surprises at the counter.", points: ["Unclear prices scare drivers away. A range in your prices builds trust.", "Unusual jobs go to Other, priced by you after a look."], stats: [
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
const when = (d: string) => new Date(d).toLocaleString(loc(), { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const mid = (i: Inquiry) => i.price_low_sek != null && i.price_high_sek != null ? (i.price_low_sek + i.price_high_sek) / 2 : 0;

export function WorkshopDashboard() {
  const { lang, t } = useT();
  const { user, ready, isAdmin } = useAccess();
  const [tab, setTab] = useState<Tab>("overview");
  const [shop, setShop] = useState<Shop | null | undefined>(undefined);
  const [items, setItems] = useState<Inquiry[]>([]);
  const [filter, setFilter] = useState<Status | "open">("open");
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [signIn, setSignIn] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(false);

  const [demo, setDemo] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const loadShop = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("workshop_members").select("role, workshops(id,name,city,vat_number,slug)").eq("user_id", user.id);
    const list = (data ?? []).flatMap(m => m.workshops ? [{ ...(m.workshops as Omit<Shop, "role">), role: m.role }] : []);
    setShops(list);
    setShop(cur => (cur && list.some(w => w.id === cur.id)) ? cur : (list[0] ?? null));
  }, [user?.id]);
  const openDemo = useCallback(async () => {
    const { data: id } = await supabase.rpc("demo_workshop_id");
    if (!id) return;
    const { data: w } = await supabase.from("workshops").select("id,name,city,vat_number,slug").eq("id", id).single();
    if (w) { setDemo(true); setShop({ ...w, role: "demo" }); }
  }, []);
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
    if (demo) return;
    const { data, error } = await supabase.from("inquiries").update({ booked_at: at, status: at ? "booked" : "contacted" }).eq("id", i.id).select("*").single();
    if (error || !data) return;
    setItems(xs => xs.map(x => x.id === data.id ? data : x)); setSelected(data);
  };
  const header = <header className="site-header">
    <Link to="/" className="brand" aria-label={tr("AutoJackie home")}><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span><span className="brand-sub">{tr("for workshops")}</span></Link>
    <nav aria-label={tr("Workshop navigation")}>
      <Button variant="ghost" asChild className="workshop-link">{!demo && shop?.slug
        ? <Link to="/w/$slug" params={{ slug: shop.slug }}>{tr("Driver view")} <ArrowUpRight/></Link>
        : <Link to="/">{tr("Driver view")} <ArrowUpRight/></Link>}</Button>
      <span className="nav-divider" aria-hidden="true"/>
      {user && <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="nav-control nav-icon" aria-label={tr("Account")}><UserRound/></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="account-email">{user.email}</DropdownMenuLabel>
          <DropdownMenuSeparator/>
          {isAdmin && <DropdownMenuItem asChild><Link to="/admin"><Settings2/> {tr("Operations")}</Link></DropdownMenuItem>}
          <DropdownMenuItem onSelect={async () => { await supabase.auth.signOut(); window.location.assign("/workshop"); }}><LogOut/> {tr("Sign out")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>}
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="nav-control language-control" aria-label={tr("Language")}><Globe2/> {LANGS.find(l => l.code === lang)?.short} <ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{LANGS.map(l => <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} aria-current={l.code === lang ? "true" : undefined}>{l.short} · {l.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
    </nav>
  </header>;

  let body;
  if (!ready || (user && shop === undefined)) body = <p className="history-note" role="status">{tr("Loading…")}</p>;
  else if (!user) body = <WorkshopPitch onSignIn={() => setSignIn(true)}/>;
  else if (!shop) body = <WorkshopPitch onSignIn={() => setSignIn(true)} signedIn onOpenDemo={() => void openDemo()}/>;
  else body = <>
    {demo && <p className="demo-banner" role="note"><Sparkles aria-hidden/> {t.pitch.demoBanner}</p>}
    <div className="ws-title"><div><span className="eyebrow">{tr("WORKSHOP DASHBOARD")}</span><h1>{shop.name}</h1>{shop.city && <p className="history-note">{shop.city}</p>}</div>
      {!demo && shops.length > 1 && <div className="ws-field" style={{ margin: 0 }}><Label htmlFor="ws-switch">{tr("Your workshops")}</Label>
        <select id="ws-switch" className="native-select" value={shop.id} onChange={e => { const w = shops.find(x => x.id === e.target.value); if (w) { setShop(w); setTab("overview"); setSelected(null); setPage(0); } }}>
          {shops.map(w => <option key={w.id} value={w.id}>{w.name}{w.city ? ` · ${w.city}` : ""}</option>)}
        </select></div>}
    </div>
    <div className="ws-tabs" role="tablist" aria-label={tr("Dashboard sections")}>{TABS.filter(tb => shop.role !== "staff" || STAFF_TABS.includes(tb.id)).map(t => <Button key={t.id} variant={tab === t.id ? "default" : "outline"} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{tr(t.label)}</Button>)}<WhyNote key={tab} overlay {...WHY[tab]}/></div>
    {tab === "booking" ? <BookingTab requests={<>
    <div className="ws-filters" role="tablist" aria-label={tr("Filter requests")}>
      {([{ id: "open", label: "All open" }, ...STATUSES] as { id: Status | "open"; label: string }[]).map(s => <Button key={s.id} size="sm" variant={filter === s.id ? "default" : "outline"} role="tab" aria-selected={filter === s.id} onClick={() => changeFilter(s.id)}>{tr(s.label)}</Button>)}
    </div>
    {error && <p className="chat-error" role="alert">{tr("Couldn't load or update requests.")}</p>}
    {shown.length === 0 ? <div className="ws-list-empty"><p>{tr("No requests here yet.")}</p><p className="history-note">{tr("When a driver books {w}, directly or from one of Jackie's cards, it lands here.", { w: shop.name })}</p></div>
      : <ul className="ws-list">{shown.slice(page * PAGE, (page + 1) * PAGE).map(i => <li key={i.id}><button type="button" className="ws-row" onClick={() => setSelected(i)}>
        <span className={`ws-status s-${i.status}`}>{tr(STATUSES.find(s => s.id === i.status)?.label ?? "")}</span>
        <span className="ws-row-main"><strong>{i.issue}</strong><span>{i.contact_name}{i.vehicle_label ? ` · ${i.vehicle_label}` : ""}</span></span>
        <span className={`ws-urgency u-${i.urgency.replace(" ", "-")}`}>{tr(i.urgency)}</span>
        <span className="ws-price">{i.price_low_sek != null && i.price_high_sek != null ? `${kr(i.price_low_sek)} ${tr("to")} ${kr(i.price_high_sek)}` : tr("No price")}</span>
        <time dateTime={i.created_at}>{when(i.created_at)}</time>
      </button></li>)}</ul>}
    {shown.length > 0 && <Pager page={page} pages={Math.max(1, Math.ceil(shown.length / PAGE))} onPage={setPage}/>}
    </>} settings={shop.role === "staff" ? null : <BookingSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>}/>
    : tab === "context" ? <ContextSettings workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "pricing" ? <PricingView workshopId={shop.id} canEdit={shop.role === "owner"}/>
    : tab === "profile" ? <ProfileView shop={shop} canEdit={shop.role === "owner"} onSaved={loadShop}/> : <>
    <div className="ws-kpis">
      <Kpi icon={<Inbox/>} label={tr("New requests")} value={String(kpis.fresh)}/>
      <Kpi icon={<CalendarClock/>} label={tr("Need you this week")} value={String(kpis.urgent)}/>
      <Kpi icon={<TrendingUp/>} label={tr("Open pipeline (est.)")} value={kr(kpis.pipeline)} hint={tr("Midpoint of Jackie's rough ranges, incl. VAT")}/>
      <Kpi icon={<Moon/>} label={tr("After hours")} value={kpis.afterHours} hint={tr("Requests that came in evenings or weekends, when you were closed")}/>
    </div>
    <InsightsView items={items} workshopId={shop.id} canEdit={shop.role === "owner"}/>
    </>}
  </>;

  return <div className="app-frame">
    {header}
    <main className="ws-main">{body}</main>
    <Sheet open={selected !== null} onOpenChange={o => { if (!o) setSelected(null); }}>
      <SheetContent className="ws-sheet">{selected && <>
        <SheetHeader><SheetTitle>{selected.issue}</SheetTitle><SheetDescription>{tr("Received {d} · get it looked at: {u}", { d: when(selected.created_at), u: tr(selected.urgency) })}</SheetDescription></SheetHeader>
        <div className="ws-detail">
          <section><span className="eyebrow">{tr("THE VISIT")}</span>
            <dl className="ws-dl">
              {selected.vehicle_label && <><dt>{tr("Car")}</dt><dd>{selected.vehicle_label}</dd></>}
              <dt>{tr("Service")}</dt><dd>{selected.service ?? OTHER}</dd>
              <dt>{tr("Time")}</dt><dd>{selected.booked_at ? <><strong>{slotLabel(selected.booked_at, loc())}</strong> <Button variant="link" size="sm" onClick={() => void book(selected, null)}>{tr("Change")}</Button></>
                : selected.preferred_slots.length === 0 ? tr("No time chosen yet")
                : <div className="ws-filters">{selected.preferred_slots.map(t => <Button key={t} size="sm" variant="outline" onClick={() => void book(selected, t)}>{tr("Book {t}", { t: slotLabel(t, loc()) })}</Button>)}</div>}</dd>
            </dl>
            {selected.message && <p className="ws-quote-note">“{selected.message}”</p>}
          </section>
          <QuoteSection item={selected}/>
          <section><span className="eyebrow">{tr("CUSTOMER")}</span>
            <dl className="ws-dl">
              <dt>{tr("Name")}</dt><dd>{selected.contact_name}</dd>
              <dt>{tr("Phone")}</dt><dd>{selected.contact_phone}</dd>
              {selected.contact_email && <><dt>{tr("Email")}</dt><dd>{selected.contact_email}</dd></>}
              <dt>{tr("Prefers")}</dt><dd>{selected.contact_channel === "email" ? tr("Email") : selected.contact_channel === "whatsapp" ? "WhatsApp" : "SMS"}</dd>
            </dl>
          </section>
        </div>
      </>}</SheetContent>
    </Sheet>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </div>;
}

const PAGE = 10;
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  return <div className="ws-pager"><Button type="button" size="sm" variant="outline" disabled={page === 0} onClick={() => onPage(page - 1)}>{tr("Previous")}</Button><span className="history-note">{tr("Page {a} of {b}", { a: page + 1, b: pages })}</span><Button type="button" size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>{tr("Next")}</Button></div>;
}

const BOOKING_STEPS = [{ title: "Requests" }, { title: "Booking settings" }];
function BookingTab({ requests, settings }: { requests: React.ReactNode; settings: React.ReactNode }) {
  const [step, setStep] = useState(0);
  const list = <Collapsible title={tr("Requests")} tip={tr("Everything drivers sent you, newest first. Click a request to see the visit, the quote Jackie sent and how to reach the driver. Filter with the buttons above.")}><div className="ws-section">{requests}</div></Collapsible>;
  if (!settings) return <div className="ws-section">{list}</div>;
  return <div className="ws-section"><Stepper steps={BOOKING_STEPS} step={step} setStep={setStep}/>{step === 0 ? list : settings}</div>;
}

function Collapsible({ title, tip, children, defaultOpen = true }: { title: string; tip?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return <details className="ws-card ws-collapsible" open={defaultOpen}><summary>{tip && <span onClick={e => e.preventDefault()}><Tip><p>{tip}</p></Tip></span>}<h2>{title}</h2></summary>{children}</details>;
}

function QuoteSection({ item }: { item: Inquiry }) {
  const jackie = item.price_low_sek != null && item.price_high_sek != null ? `${kr(item.price_low_sek)} ${tr("to")} ${kr(item.price_high_sek)}` : null;
  return <section><span className="eyebrow">{tr("WHAT JACKIE TOLD THE DRIVER")}</span>
    {jackie ? <div className="ws-quote">
      <strong className="ws-quote-price">{jackie}</strong><span className="history-note">{tr("Rough estimate incl. VAT")}</span>
      {item.note && <p className="ws-quote-note">“{item.note}”</p>}
    </div> : <p className="history-note">{tr("No estimate. The driver booked directly.")}</p>}
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
    setState(tr("Saving…"));
    const { error } = await supabase.from("workshop_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("workshop_id", workshopId);
    setState(error ? tr("Couldn't save. Please try again.") : tr("Saved."));
  };
  return { s, setS, save, state };
}

function SaveRow({ canEdit, state }: { canEdit: boolean; state: string }) {
  return <div className="ws-span">{canEdit ? <Button type="submit">{tr("Save")}</Button> : <p className="history-note">{tr("Only the workshop owner can change these.")}</p>}{state && <p className="history-note" role="status">{state}</p>}</div>;
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
    label: c === "sms" ? "SMS" : c === "whatsapp" ? "WhatsApp" : tr("Email"),
    v: items.filter(i => i.contact_channel === c).length,
  }));
  return <div className="ws-section ws-tight">
    <h2 className="ws-h2">{tr("Insights")}</h2>
    <div className="ws-insights">
      <Collapsible title={tr("From request to booking")} tip={tr("How many requests moved from new to quoted to booked.")}><div className="ws-funnel">{funnel.map(f => <div key={f.label} className="ws-funnel-row"><span>{tr(f.label)}</span><span className="ws-bar"><span style={{ width: n ? `${(f.v / n) * 100}%` : 0 }}/></span><strong>{f.v}</strong></div>)}</div></Collapsible>
      <Collapsible title={tr("How drivers want to be reached")} tip={tr("The channel each driver picked for confirmation. Automatic messages come in phase 2.")}>
        <div className="ws-funnel">{channels.map(c => <div key={c.label} className="ws-funnel-row"><span>{c.label}</span><span className="ws-bar"><span style={{ width: n ? `${(c.v / n) * 100}%` : 0 }}/></span><strong>{c.v}</strong></div>)}</div>
      </Collapsible>
      <Collapsible title={tr("Your services")} tip={tr("Requests matched to your Pricing engine. Value = bookings × your price.")}>
        <table className="ws-table"><thead><tr><th>{tr("Service")}</th><th>{tr("Requests")}</th><th>{tr("Booked")}</th><th>{tr("Value")}</th></tr></thead><tbody>
          {rows.slice(sp * PAGE, (sp + 1) * PAGE).map(r => <tr key={r.task}><td>{r.task}</td><td><strong>{r.req}</strong></td><td>{r.booked}</td><td>{r.value ? kr(r.value) : "–"}</td></tr>)}
          <tr><td>{tr("Other")} <small className="history-note">{tr("(you price these)")}</small></td><td><strong>{otherCount}</strong></td><td>{items.filter(i => (!i.service || i.service === OTHER) && isBooked(i)).length}</td><td>–</td></tr>
        </tbody></table>
        {rows.length > 0 && <Pager page={sp} pages={Math.max(1, Math.ceil(rows.length / PAGE))} onPage={setSp}/>}
      </Collapsible>
      <Collapsible title={tr("Drivers asked, you don't offer yet")} tip={tr("Requests that landed in Other. Add the common ones to your Pricing engine so Jackie can quote them next time.")}>
        {missing.length === 0 ? <p className="history-note">{tr("Nothing yet. Every request matched one of your services.")}</p>
          : <table className="ws-table"><tbody>{missing.slice(mp * PAGE, (mp + 1) * PAGE).map(([k, v]) => <tr key={k}><td>{k}</td><td><strong>{v}</strong></td><td style={{ textAlign: "right" }}>{added.includes(k) ? <span className="history-note">{tr("Added. Set its price in Pricing engine.")}</span> : canEdit && <Button type="button" size="sm" variant="outline" onClick={() => void addService(k)}>{tr("Add to Pricing engine")}</Button>}</td></tr>)}</tbody></table>}
        {missing.length > 0 && <Pager page={mp} pages={Math.max(1, Math.ceil(missing.length / PAGE))} onPage={setMp}/>}
      </Collapsible>
    </div>
  </div>;
}

const WEEKDAYS = [{ d: 1, l: "Mon" }, { d: 2, l: "Tue" }, { d: 3, l: "Wed" }, { d: 4, l: "Thu" }, { d: 5, l: "Fri" }, { d: 6, l: "Sat" }, { d: 0, l: "Sun" }];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 7);

const AHEAD = [{ d: 30, l: "1 month" }, { d: 60, l: "2 months" }, { d: 90, l: "3 months" }, { d: 180, l: "6 months" }, { d: 365, l: "1 year" }];


function dayLabel(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString(loc(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
const OFF_PAGE = 5;

function BookingSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  const [date, setDate] = useState("");
  const [offPage, setOffPage] = useState(0);
  if (!s) return <p className="history-note" role="status">{tr("Loading…")}</p>;
  const flip = (arr: number[], v: number) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v].sort((a, b) => a - b);
  const today = new Date().toISOString().slice(0, 10);
  const closed = (s.closed_slots as string[]).filter(k => k.slice(0, 10) >= today);
  const setClosed = (next: string[]) => setS({ ...s, closed_slots: [...new Set(next)].sort() });
  const hourKey = (d: string, h: number) => `${d}T${String(h).padStart(2, "0")}`;
  const dayClosed = (d: string) => closed.includes(d);
  const toggleDay = (d: string) => setClosed(dayClosed(d) ? closed.filter(k => k !== d) : [...closed.filter(k => k.slice(0, 10) !== d), d]);
  const toggleHour = (d: string, h: number) => {
    const k = hourKey(d, h);
    setClosed(closed.includes(k) ? closed.filter(x => x !== k) : [...closed.filter(x => x !== d), k]);
  };
  const byDay = new Map<string, string[]>();
  for (const k of closed) { const d = k.slice(0, 10); byDay.set(d, [...(byDay.get(d) ?? []), ...(k.length > 10 ? [`${k.slice(11)}:00`] : [])]); }
  const days = [...byDay.entries()];
  const pages = Math.max(1, Math.ceil(days.length / OFF_PAGE));
  const pg = Math.min(offPage, pages - 1);
  const y = new Date().getFullYear();
  const holidays = [...swedishHolidays(y), ...swedishHolidays(y + 1)].filter(([k]) => k >= today).slice(0, 6);
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void save({ booking_days: s.booking_days, slot_hours: s.slot_hours, min_notice_days: s.min_notice_days, max_ahead_days: s.max_ahead_days, close_holidays: s.close_holidays, closed_slots: closed }); }}>
    <fieldset disabled={!canEdit} className="ws-grid2" style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2 className="ws-label-row"><Tip><p>{tr("The days and drop-off times drivers can pick. How long each job takes is set in Pricing engine.")}</p></Tip>{tr("Your normal week")}</h2>
        <div className="ws-field"><Label>{tr("Days")}</Label><div className="ws-chips">{WEEKDAYS.map(w => <Button key={w.d} type="button" size="sm" variant={s.booking_days.includes(w.d) ? "default" : "outline"} onClick={() => setS({ ...s, booking_days: flip(s.booking_days, w.d) })}>{tr(w.l)}</Button>)}</div></div>
        <div className="ws-field"><Label>{tr("Drop-off times")}</Label><div className="ws-chips">{HOURS.map(h => <Button key={h} type="button" size="sm" variant={s.slot_hours.includes(h) ? "default" : "outline"} onClick={() => setS({ ...s, slot_hours: flip(s.slot_hours, h) })}>{String(h).padStart(2, "0")}:00</Button>)}</div></div>
        <div className="ws-grid2">
          <div className="ws-field"><Label htmlFor="b-notice">{tr("Earliest booking")}</Label>
            <select id="b-notice" className="native-select" value={s.min_notice_days} onChange={e => setS({ ...s, min_notice_days: Number(e.target.value) })}>{[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d === 1 ? tr("Next day") : tr("{n} days ahead", { n: d })}</option>)}</select></div>
          <div className="ws-field"><Label htmlFor="b-ahead">{tr("Latest booking")}</Label>
            <select id="b-ahead" className="native-select" value={s.max_ahead_days} onChange={e => setS({ ...s, max_ahead_days: Number(e.target.value) })}>{AHEAD.map(a => <option key={a.d} value={a.d}>{tr("Up to {x} ahead", { x: tr(a.l) })}</option>)}</select></div>
        </div>
      </section>
      <section className="ws-card"><h2 className="ws-label-row"><Tip><p>{tr("Pick a date, then close the whole day or cross out single drop-off times. Drivers simply won't see them.")}</p></Tip>{tr("Days off")}</h2>
        <label className="ws-label-row"><input type="checkbox" checked={s.close_holidays} onChange={e => setS({ ...s, close_holidays: e.target.checked })}/><Tip><p>{tr("Built into AutoJackie, no calendar needed. Includes Midsummer Eve, Christmas Eve and New Year's Eve.")} {tr("Next up:")} {holidays.map(([k, n]) => `${tr(n)} (${k.slice(5)})`).join(", ")}.</p></Tip><span>{tr("Closed on Swedish public holidays")}</span></label>
        <div className="ws-field"><Label htmlFor="b-off">{tr("Date")}</Label>
          <Input id="b-off" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} style={{ width: 180 }}/></div>
        {date && (s.close_holidays && holidayName(date)
          ? <p className="history-note">{tr("That's {h}, already closed.", { h: tr(holidayName(date) ?? "") })}</p>
          : <div className="ws-chips">
              <Button type="button" size="sm" variant={dayClosed(date) ? "default" : "outline"} onClick={() => toggleDay(date)}>{tr("Whole day")}</Button>
              {s.slot_hours.map(h => { const off = dayClosed(date) || closed.includes(hourKey(date, h)); return <Button key={h} type="button" size="sm" variant="outline" aria-pressed={off} className={off ? "ws-crossed" : undefined} disabled={dayClosed(date)} onClick={() => toggleHour(date, h)}>{String(h).padStart(2, "0")}:00</Button>; })}
            </div>)}
        {days.length === 0 ? <p className="history-note">{tr("No days off planned.")}</p>
          : <><ul className="ws-off-list">{days.slice(pg * OFF_PAGE, (pg + 1) * OFF_PAGE).map(([d, hrs]) => <li key={d}>
              <button type="button" className="ws-off-day" onClick={() => setDate(d)}>{dayLabel(d)}</button>
              <span className="history-note">{hrs.length ? hrs.join(", ") : tr("All day")}</span>
              <button type="button" className="ws-off-x" aria-label={`${tr("Reopen")} ${dayLabel(d)}`} onClick={() => setClosed(closed.filter(k => k.slice(0, 10) !== d))}>×</button>
            </li>)}</ul>
            {<Pager page={pg} pages={pages} onPage={setOffPage}/>}</>}
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

const CONTEXT_STEPS = [
  { title: "Your workshop's know-how", sees: "Jackie uses your services, expertise and working preferences to guide drivers. Set prices and job times in Pricing engine." },
  { title: "Jackie's brain", sees: "Nothing visible. It controls answer quality, speed and running cost." },
];

const PROFILE_STEPS = [
  { title: "Contact details", sees: "How to reach and find you, mostly after they book." },
  { title: "Your brand", sees: "Your page link, colors, logo and greeting on your Jackie page." },
];

function Stepper({ steps, step, setStep }: { steps: { title: string }[]; step: number; setStep: (n: number) => void }) {
  return <ol className="ws-stepper">{steps.map((st, i) => <li key={st.title}><button type="button" aria-current={i === step ? "step" : undefined} data-done={i < step || undefined} onClick={() => setStep(i)}><span className="ws-step-num">{i + 1}</span>{tr(st.title)}</button></li>)}</ol>;
}

function WizardActions({ canEdit, last, next }: { canEdit: boolean; last: boolean; next: () => void }) {
  return <div className="ws-chips">{canEdit ? <Button type="submit" variant={last ? "default" : "outline"}>{tr("Save this step")}</Button> : <span className="history-note">{tr("Only the workshop owner can change these.")}</span>}{!last && <Button type="button" onClick={next}>{tr("Next")}</Button>}</div>;
}

function Tip({ children, label }: { children: React.ReactNode; label?: string }) {
  return <Popover><PopoverTrigger asChild><button type="button" className="ws-tip" aria-label={label ?? tr("What is this?")}><CircleHelp/></button></PopoverTrigger>
    <PopoverContent className="ws-tip-body" side="top" align="start">{children}</PopoverContent></Popover>;
}

function Hint({ controls, shows }: { controls: string; shows: string }) {
  return <Tip><p><b>{tr("Controls:")}</b> {controls}</p><p><b>{tr("Shows:")}</b> {shows}</p></Tip>;
}

function ContextSettings({ workshopId, canEdit }: { workshopId: string; canEdit: boolean }) {
  const { s, setS, save, state } = useSettings(workshopId);
  const [step, setStep] = useState(0);
  if (!s) return <p className="history-note" role="status">{tr("Loading…")}</p>;
  const storedServices = s.services as string[];
  const templateServices = ["Annual service", "Brake pads & discs", "Tyre change & storage", "Diagnostics (engine light)", "Timing belt", "Battery & electrics"];
  const isTemplate = storedServices.length === templateServices.length && storedServices.every((value, i) => value === templateServices[i]);
  const services = isTemplate ? "" : storedServices.join(", ");
  const last = step === CONTEXT_STEPS.length - 1;
  const cur = CONTEXT_STEPS[step];
  if (!cur) return null;
  return <form className="ws-section ws-wizard" onSubmit={e => { e.preventDefault(); void save(step === 0 ? { services: isTemplate ? [] : storedServices.map(x => x.trim()).filter(Boolean), specialties: s.specialties, jackie_context: s.jackie_context } : { ai_chat_tier: s.ai_chat_tier, ai_quote_tier: s.ai_quote_tier }); }}>
    <Stepper steps={CONTEXT_STEPS} step={step} setStep={setStep}/>
    <section className="ws-card">
      <div className="ws-step-head"><h2 className="ws-label-row"><Tip><p><b>{tr("Drivers see:")}</b> {tr(cur.sees)}</p></Tip>{step + 1}. {tr(cur.title)}</h2></div>
      <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 10 }}>
        {step === 0 && <>
          <div className="ws-grid2">
            <div className="ws-field">
              <Label htmlFor="c-serv" className="ws-label-row"><Tip><p>{tr("Describe your scope in ordinary words, including jobs you don't take on. This guides Jackie; prices and durations stay in Pricing engine.")}</p></Tip>{tr("What you help with")}</Label>
              <textarea id="c-serv" className="native-select ws-textarea" placeholder={tr("For example: We handle routine servicing, brakes and seasonal tyre changes, including tyre storage. We diagnose warning lights, but refer bodywork and paint repairs to a partner.")} value={services} onChange={e => setS({ ...s, services: e.target.value ? [e.target.value] : [] })}/>
            </div>
            <div className="ws-field">
              <Label htmlFor="c-spec" className="ws-label-row"><Tip><p>{tr("Add the brands, qualifications and facilities that make you a good fit. Only include things your workshop actually offers.")}</p></Tip>{tr("Expertise and facilities")}</Label>
              <textarea id="c-spec" className="native-select ws-textarea" maxLength={1000} placeholder={tr("For example: Our team specialises in Volvo and Volkswagen. Two technicians are EV-certified. We have an on-site tyre hotel and a courtesy car available by arrangement.")} value={s.specialties} onChange={e => setS({ ...s, specialties: e.target.value })}/>
            </div>
          </div>
          <div className="ws-field">
            <Label htmlFor="c-ctx" className="ws-label-row"><Tip><p>{tr("Tell Jackie your preferred parts, checks and approval process. These are your working preferences, not another price list.")}</p></Tip>{tr("Parts, checks and customer approval")}</Label>
            <textarea id="c-ctx" className="native-select ws-textarea" maxLength={3000} placeholder={tr("For example: We prefer OEM or Bosch brake parts. First inspect the brakes and explain what needs replacing. Ask the customer before any extra work. Offer a lower-cost alternative where suitable, and explain any trade-offs in plain words.")} value={s.jackie_context} onChange={e => setS({ ...s, jackie_context: e.target.value })}/>
          </div>
        </>}
        {step === 1 && <>
          <p className="history-note" style={{ margin: 0 }}>{tr("How smart should Jackie be? Pick a level per job. Smarter means better answers but higher running costs. ★ is our recommendation.")}</p>
          <div className="ws-tiers">
            <TierRow title={tr("Everyday chat")} hint={tr("Listening, explaining, fault codes and manual lookups. Most of the volume, so cost adds up here.")} value={s.ai_chat_tier as Tier} recommended={DEFAULT_TIERS.chat} onChange={v => setS({ ...s, ai_chat_tier: v })}/>
            <TierRow title={tr("Rough quotes")} hint={tr("Drafting the price range a driver sees, using your price list. Rare, but accuracy builds trust.")} value={s.ai_quote_tier as Tier} recommended={DEFAULT_TIERS.quote} onChange={v => setS({ ...s, ai_quote_tier: v })}/>
          </div>
          <div><Button type="button" size="sm" variant="outline" onClick={() => setS({ ...s, ai_chat_tier: DEFAULT_TIERS.chat, ai_quote_tier: DEFAULT_TIERS.quote })}>{tr("Reset to recommended")}</Button></div>
        </>}
      </fieldset>
      <div className="ws-wizard-nav">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>{tr("Back")}</Button>
        <WizardActions canEdit={canEdit} last={last} next={() => setStep(step + 1)}/>
      </div>
      {state && <p className="history-note" role="status">{state}</p>}
    </section>
  </form>;
}

function TierRow({ title, hint, value, recommended, onChange }: { title: string; hint: string; value: Tier; recommended: Tier; onChange: (t: Tier) => void }) {
  const diff = TIER_INFO[value].costFactor / TIER_INFO[recommended].costFactor;
  return <div className="ws-tier-row">
    <div><h3 className="ws-label-row"><Tip><p>{hint}</p></Tip>{title}</h3></div>
    <div>
      <div className="ws-tier-options" role="group" aria-label={title}>{TIERS.map(t => <button key={t} type="button" className="ws-tier-opt" aria-pressed={value === t} onClick={() => onChange(t)}>
        <strong><span>{tr(TIER_INFO[t].label)}{t === recommended ? " ★" : ""}</span><span>{tr(TIER_INFO[t].cost)}</span></strong>{tr(TIER_INFO[t].text)}</button>)}</div>
      {value !== recommended && <p className="ws-tier-warn">{diff > 1 ? tr("About {n}× the running cost of the recommended setting. This may raise your monthly price.", { n: Math.round(diff) }) : tr("Cheaper, but answers may be less careful. Recommended (★) is the best balance.")}</p>}
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
  const [pp, setPp] = useState(0);
  if (!s) return <p className="history-note" role="status">{tr("Loading…")}</p>;
  const durations = s.job_durations as Duration[];
  const prices = ensureOther(s.price_list as PriceItem[]).map(p => ({ ...p, minutes: p.minutes ?? durations.find(d => d.job === p.task)?.minutes ?? 60 }));
  const pPages = Math.max(1, Math.ceil(prices.length / PAGE));
  const pPg = Math.min(pp, pPages - 1);
  const setP = (p: PriceItem[]) => setS({ ...s, price_list: p });
  const available = PREDEFINED_SERVICES.filter(x => !prices.some(p => p.task === x.task));
  const submit = () => {
    const clean = ensureOther(prices.filter(p => p.task.trim() && (p.task !== OTHER || true)));
    void save({ hourly_rate_sek: s.hourly_rate_sek, price_list: clean, job_durations: clean.map(p => ({ job: p.task, minutes: p.minutes ?? 60 })) });
  };
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); submit(); }}>
    <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
      <section className="ws-card"><h2 className="ws-label-row"><Hint controls={tr("every rough quote Jackie gives (the “What's next” card) and how long a booking blocks your calendar.")} shows={tr("prices to drivers on your Jackie page, labelled as an estimate. Times only to you.")}/>{tr("Services, prices and times (incl. VAT)")}</h2>
        <Label htmlFor="c-rate">{tr("Hourly labour rate (kr)")}</Label><Input id="c-rate" type="number" min={0} max={10000} value={s.hourly_rate_sek} onChange={e => setS({ ...s, hourly_rate_sek: Number(e.target.value) })}/>
        <table className="ws-table"><thead><tr><th>{tr("Service")}</th><th>{tr("Price (kr)")}</th><th>{tr("Time (min)")}</th><th/></tr></thead><tbody>
          {prices.map((p, i) => ({ p, i })).slice(pPg * PAGE, (pPg + 1) * PAGE).map(({ p, i }) => p.task === OTHER ? <tr key={i} className="ws-other-row"><td><strong>{tr("Other")}</strong><small className="history-note"> {tr("Anything Jackie can't match. You price it after a look.")}</small></td><td><Input aria-label={tr("Price")} type="number" min={0} max={200000} value={p.price_sek} title={tr("0 = evaluated by you")} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, price_sek: Number(e.target.value) } : x))}/></td><td><Input aria-label={tr("Minutes")} type="number" min={5} max={2880} step={5} value={p.minutes} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) } : x))}/></td><td/></tr> : <tr key={i}><td><Input aria-label={tr("Service")} maxLength={80} value={p.task} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, task: e.target.value } : x))}/></td><td><Input aria-label={tr("Price")} type="number" min={0} max={200000} value={p.price_sek} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, price_sek: Number(e.target.value) } : x))}/></td><td><Input aria-label={tr("Minutes")} type="number" min={5} max={2880} step={5} value={p.minutes} onChange={e => setP(prices.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) } : x))}/></td><td><Button type="button" size="sm" variant="ghost" aria-label={tr("Remove")} onClick={() => setP(prices.filter((_, j) => j !== i))}>×</Button></td></tr>)}
        </tbody></table>
        <Pager page={pPg} pages={pPages} onPage={setPp}/>
        <div className="ws-chips">
          <select aria-label={tr("Add a service")} className="native-select" value="" onChange={e => { const v = e.target.value; const idx = prices.filter(p => p.task !== OTHER).length; if (v === "__custom") { setP([...prices.filter(p => p.task !== OTHER), { task: "", price_sek: 0, minutes: 60 }, ...prices.filter(p => p.task === OTHER)]); setPp(Math.floor(idx / PAGE)); } else { const x = PREDEFINED_SERVICES.find(o => o.task === v); if (x) { setP([...prices.filter(p => p.task !== OTHER), { ...x }, ...prices.filter(p => p.task === OTHER)]); setPp(Math.floor(idx / PAGE)); } } }}>
            <option value="">{tr("Add a service…")}</option>
            {available.map(o => <option key={o.task} value={o.task}>{o.task}</option>)}
            <option value="__custom">{tr("Custom service…")}</option>
          </select>
        </div>
      </section>
    </fieldset>
    <SaveRow canEdit={canEdit} state={state}/>
  </form>;
}

export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export function logoError(f: { type: string; size: number }): string | null {
  if (!LOGO_TYPES.includes(f.type)) return tr("Please use a PNG, JPEG or WebP image (SVG isn't allowed).");
  if (f.size > LOGO_MAX_BYTES) return tr("That image is over 2 MB. Please pick a smaller one.");
  return null;
}
// Re-draw on a canvas: drops metadata/embedded payloads and caps size at 256px.
async function shrinkLogo(f: File): Promise<string> {
  const bmp = await createImageBitmap(f);
  const k = Math.min(1, 256 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/webp", 0.85);
  return url.startsWith("data:image/webp") ? url : c.toDataURL("image/png");
}

type Member = { user_id: string; email: string; role: "owner" | "staff" };

function TeamSection({ workshopId }: { workshopId: string }) {
  const [team, setTeam] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "staff">("staff");
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const { data } = await supabase.rpc("workshop_team", { _workshop: workshopId });
    setTeam((data ?? []) as Member[]);
  }, [workshopId]);
  useEffect(() => { void load(); }, [load]);
  const add = async () => {
    setMsg("");
    const { error } = await supabase.rpc("workshop_add_member", { _workshop: workshopId, _email: email, _role: role });
    if (error) setMsg(error.message.includes("no AutoJackie account") ? tr("No AutoJackie account with that email yet. Ask them to sign in once, then add them.") : tr("Couldn't add that person. Please try again."));
    else { setEmail(""); setMsg(tr("Added.")); }
    void load();
  };
  const remove = async (m: Member) => {
    setMsg("");
    const { error } = await supabase.rpc("workshop_remove_member", { _workshop: workshopId, _user: m.user_id });
    if (error) setMsg(tr("Couldn't remove that person. Please try again."));
    void load();
  };
  if (!team) return <p className="history-note" role="status">{tr("Loading…")}</p>;
  return <div className="ws-form-card">
    <div className="ws-label-row"><Hint controls={tr("who can open this workshop's dashboard. Admins see and change everything; front desk sees Overview and Bookings only.")} shows={tr("only to you, here in Settings.")}/></div>
    <table className="ws-table"><thead><tr><th>{tr("Email")}</th><th>{tr("Role")}</th><th/></tr></thead><tbody>
      {team.map(m => <tr key={m.user_id}><td>{m.email}</td><td><strong>{m.role === "owner" ? tr("Admin") : tr("Front desk")}</strong></td>
        <td>{m.role !== "owner" && <Button type="button" size="sm" variant="ghost" aria-label={tr("Remove")} onClick={() => void remove(m)}>×</Button>}</td></tr>)}
      <tr>
        <td><Input type="email" maxLength={120} placeholder={tr("Their AutoJackie email")} value={email} onChange={e => setEmail(e.target.value)} aria-label={tr("Their AutoJackie email")}/></td>
        <td><select className="native-select" value={role} onChange={e => setRole(e.target.value as "owner" | "staff")} aria-label={tr("Role")}>
          <option value="staff">{tr("Front desk")}</option><option value="owner">{tr("Admin")}</option>
        </select></td>
        <td><Button type="button" size="sm" variant="outline" disabled={!email.includes("@")} onClick={() => void add()}>{tr("Add")}</Button></td>
      </tr>
    </tbody></table>
    {msg && <p className="history-note" role="status">{msg}</p>}
  </div>;
}

function ProfileView({ shop, canEdit, onSaved }: { shop: Shop; canEdit: boolean; onSaved: () => void }) {
  const { s, setS, save, state } = useSettings(shop.id);
  const [city, setCity] = useState(shop.city);
  const [step, setStep] = useState(0);
  if (!s) return <p className="history-note" role="status">{tr("Loading…")}</p>;
  const steps = canEdit ? [...PROFILE_STEPS, { title: "Team", sees: "Who can open this dashboard and what they can change." }] : PROFILE_STEPS;
  const link = shop.slug && typeof window !== "undefined" ? `${window.location.origin}/w/${shop.slug}` : "";
  const submit = async () => {
    if (city !== shop.city) { await supabase.from("workshops").update({ city }).eq("id", shop.id); onSaved(); }
    await save({ phone: s.phone, address: s.address, opening_hours: s.opening_hours, contact_email: s.contact_email,
      brand_accent: /^#[0-9a-fA-F]{6}$/.test(s.brand_accent) ? s.brand_accent : "", brand_logo_url: s.brand_logo_url.startsWith("data:image/") ? s.brand_logo_url : "", brand_greeting: s.brand_greeting,
      website: /^https?:\/\//i.test(s.website) ? s.website : "" });
  };
  return <form className="ws-section" onSubmit={e => { e.preventDefault(); void submit(); }}>
    <Stepper steps={steps} step={step} setStep={setStep}/>
    <section className="ws-card">
    <div className="ws-step-head"><h2 className="ws-label-row"><Tip><p><b>{tr("Drivers see:")}</b> {tr(steps[step]!.sees)}</p></Tip>{step + 1}. {tr(steps[step]!.title)}</h2></div>
    <fieldset disabled={!canEdit} style={{ border: 0, padding: 0, margin: 0 }}>
      {step === 0 && <div className="ws-form-card ws-grid2">
        <div><div className="ws-label-row"><Label>{tr("Company name")}</Label><Hint controls={tr("your name in the booking list and on your Jackie page.")} shows={tr("to drivers. Managed by AutoJackie.")}/></div><div className="ws-readonly">{shop.name}</div></div>
        <div><div className="ws-label-row"><Label>{tr("VAT number")}</Label><Hint controls={tr("invoicing between you and AutoJackie.")} shows={tr("nowhere to drivers. Managed by AutoJackie.")}/></div><div className="ws-readonly">{shop.vat_number || tr("Not set")}</div></div>
        <div><div className="ws-label-row"><Label htmlFor="p-phone">{tr("Phone")}</Label><Hint controls={tr("how drivers can call you.")} shows={tr("to drivers after they book.")}/></div><Input id="p-phone" maxLength={30} value={s.phone} onChange={e => setS({ ...s, phone: e.target.value })}/></div>
        <div><div className="ws-label-row"><Label htmlFor="p-email">{tr("Contact email")}</Label><Hint controls={tr("where booking updates are sent.")} shows={tr("only to AutoJackie and you.")}/></div><Input id="p-email" type="email" maxLength={120} value={s.contact_email} onChange={e => setS({ ...s, contact_email: e.target.value })}/></div>
        <div><div className="ws-label-row"><Label htmlFor="p-addr">{tr("Address")}</Label><Hint controls={tr("where drivers drop off their car.")} shows={tr("to drivers after they book.")}/></div><Input id="p-addr" maxLength={200} value={s.address} onChange={e => setS({ ...s, address: e.target.value })}/></div>
        <div><div className="ws-label-row"><Label htmlFor="p-city">{tr("City")}</Label><Hint controls={tr("which drivers see you when picking a workshop.")} shows={tr("in the workshop list when booking.")}/></div><Input id="p-city" maxLength={60} value={city} onChange={e => setCity(e.target.value)}/></div>
        <div><div className="ws-label-row"><Label htmlFor="p-hours">{tr("Opening hours")}</Label><Hint controls={tr("what Jackie says when drivers ask when you're open.")} shows={tr("in Jackie's answers on your page.")}/></div><Input id="p-hours" maxLength={200} value={s.opening_hours} onChange={e => setS({ ...s, opening_hours: e.target.value })}/></div>
        <div><div className="ws-label-row"><Label htmlFor="p-web">{tr("Website")}</Label><Hint controls={tr("a link back to your own site.")} shows={tr("to drivers after they book.")}/></div><Input id="p-web" maxLength={200} value={s.website} onChange={e => setS({ ...s, website: e.target.value })}/></div>
      </div>}
      {step === 1 && <div className="ws-form-card">
        <div><div className="ws-label-row"><Label>{tr("Your Jackie page")}</Label><Hint controls={tr("the page where drivers chat with Jackie as your workshop.")} shows={tr("wherever you share it: website, Google profile, SMS.")}/></div>{link && <div className="ws-chips"><a href={link} target="_blank" rel="noreferrer" className="text-link">{link}</a><Button type="button" size="sm" variant="outline" onClick={() => void navigator.clipboard?.writeText(link)}>{tr("Copy")}</Button></div>}</div>
        <div><div className="ws-label-row"><Label htmlFor="b-accent">{tr("Accent color")}</Label><Hint controls={tr("buttons, highlights and links.")} shows={tr("on your Jackie page.")}/></div><div className="ws-chips"><input id="b-accent" type="color" value={s.brand_accent || "#f2711c"} onChange={e => setS({ ...s, brand_accent: e.target.value })}/>{s.brand_accent && <Button type="button" size="sm" variant="ghost" onClick={() => setS({ ...s, brand_accent: "" })}>{tr("Use AutoJackie orange")}</Button>}</div></div>
        <div><div className="ws-label-row"><Label htmlFor="b-logo">{tr("Logo")}</Label><Hint controls={tr("the small logo next to your name. PNG, JPEG or WebP, max 2 MB. We shrink it to 256 px and re-save it, so nothing hidden in the file survives.")} shows={tr("in the top bar of your Jackie page.")}/></div>
          <div className="ws-chips">
            <span className="shop-badge">{s.brand_logo_url && <img src={s.brand_logo_url} alt={tr("Logo preview")} className="shop-logo"/>}<span>{shop.name}</span></span>
            <Input id="b-logo" type="file" accept="image/png,image/jpeg,image/webp" style={{ maxWidth: 240 }} onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = "";
              if (!f) return;
              const err = logoError(f); if (err) return alert(err);
              try { setS({ ...s, brand_logo_url: await shrinkLogo(f) }); } catch { alert(tr("That image couldn't be read. Try another PNG, JPEG or WebP.")); }
            }}/>
            {s.brand_logo_url && <Button type="button" size="sm" variant="ghost" onClick={() => setS({ ...s, brand_logo_url: "" })}>{tr("Remove logo")}</Button>}
          </div></div>
        <div><div className="ws-label-row"><Label htmlFor="b-greet">{tr("Greeting line")}</Label><Hint controls={tr("the welcome line above the chat.")} shows={tr("on your Jackie page, before drivers type.")}/></div><Input id="b-greet" maxLength={160} placeholder={tr("Welcome to Demo Verkstad. Tell Jackie what's up.")} value={s.brand_greeting} onChange={e => setS({ ...s, brand_greeting: e.target.value })}/></div>
      </div>}
    </fieldset>
    {step === 2 && canEdit && <TeamSection workshopId={shop.id}/>}
    <div className="ws-wizard-nav"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>{tr("Back")}</Button>{step < 2 && <WizardActions canEdit={canEdit} last={false} next={() => setStep(step + 1)}/>}</div>
    {state && <p className="history-note" role="status">{state}</p>}
    </section>
  </form>;
}

function WorkshopPitch({ onSignIn, signedIn, onOpenDemo }: { onSignIn: () => void; signedIn?: boolean; onOpenDemo?: () => void }) {
  const { t } = useT();
  const p = t.pitch;
  const icons = [<MessageCircle key="m"/>, <Sparkles key="s"/>, <Inbox key="i"/>, <CalendarCheck key="p"/>];
  return <div className="pitch">
    <section className="pitch-hero">
      <div>
        <span className="eyebrow">{p.eyebrow}</span>
        <h1>{p.title}</h1>
        <p>{p.sub}</p>
        <div className="pitch-cta">
          {signedIn && onOpenDemo
            ? <><Button onClick={onOpenDemo}>{p.demoCta}</Button><span className="history-note">{p.demoNote}</span></>
            : <><Button onClick={onSignIn}>{p.cta}</Button><span className="history-note">{p.ctaNote}</span></>}
        </div>
      </div>
      <figure className="pitch-jackie"><img src={jackieImg} alt="Jackie, AutoJackie's assistant"/><figcaption>{p.jackieCaption}</figcaption></figure>
    </section>
    <ol className="pitch-flow" aria-label={tr("How it works")}>
      {p.steps.map((s, i) => <li key={s.t}><span className="pitch-step">{i + 1}</span>{icons[i]}<strong>{s.t}</strong><span>{s.d}</span></li>)}
    </ol>
    <ul className="pitch-gains-list" aria-label={tr("What you get")}>
      {p.gains.map(g => <li key={g}>{g}</li>)}
    </ul>
    <section className="pitch-stats" aria-label={tr("The problem in numbers")}>
      {p.stats.map(s => <div key={s.value}><strong>{s.value}</strong><span>{s.text}</span><a href={s.src.url} target="_blank" rel="noreferrer">{s.src.label}</a></div>)}
    </section>
  </div>;
}
