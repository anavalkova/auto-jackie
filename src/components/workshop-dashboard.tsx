import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Car, Inbox, Phone, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
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
  const { user, ready } = useSessionUser();
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
    <nav aria-label="Workshop navigation"><Button variant="ghost" asChild><Link to="/">Driver view</Link></Button></nav>
  </header>;

  let body;
  if (!ready || (user && shop === undefined)) body = <p className="history-note" role="status">Loading…</p>;
  else if (!user) body = <div className="ws-empty"><Wrench/><h1>Your workshop, with Jackie on the front desk.</h1><p>Drivers explain their trouble to Jackie. You get a clear summary, a rough price and their phone number — ready to call.</p><Button onClick={() => setSignIn(true)}>Sign in to open your workshop</Button></div>;
  else if (!shop) body = <CreateWorkshop onCreated={loadShop}/>;
  else body = <>
    <div className="ws-title"><div><span className="eyebrow">WORKSHOP DASHBOARD</span><h1>{shop.name}</h1>{shop.city && <p className="history-note">{shop.city}</p>}</div><Button variant="outline" onClick={() => void loadItems()}>Refresh</Button></div>
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
        <span className="ws-price">{i.price_low_sek != null && i.price_high_sek != null ? `${kr(i.price_low_sek)}–${kr(i.price_high_sek)}` : "—"}</span>
        <time dateTime={i.created_at}>{when(i.created_at)}</time>
      </button></li>)}</ul>}
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
          <section><span className="eyebrow">JACKIE'S ROUGH ESTIMATE</span><p>{selected.price_low_sek != null && selected.price_high_sek != null ? `${kr(selected.price_low_sek)}–${kr(selected.price_high_sek)} incl. VAT` : "No estimate"}</p>{selected.note && <p className="history-note">{selected.note}</p>}</section>
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

function CreateWorkshop({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState(""); const [city, setCity] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(false);
  const create = async () => {
    setBusy(true);
    const { error } = await supabase.from("workshops").insert({ name: name.trim(), city: city.trim() });
    setBusy(false); setErr(!!error); if (!error) onCreated();
  };
  return <form className="ws-empty" onSubmit={e => { e.preventDefault(); void create(); }}>
    <Wrench/><h1>Set up your workshop</h1><p>Two details to start. Prices, services and opening hours come next.</p>
    <div className="visit-form ws-create"><div><Label htmlFor="w-name">Workshop name</Label><Input id="w-name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Södermalm Bilservice"/></div>
      <div><Label htmlFor="w-city">City</Label><Input id="w-city" maxLength={60} value={city} onChange={e => setCity(e.target.value)} placeholder="Stockholm"/></div>
      {err && <p className="chat-error" role="alert">Couldn't create the workshop. Please try again.</p>}
      <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create workshop"}</Button></div>
  </form>;
}
