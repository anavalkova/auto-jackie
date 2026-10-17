import { createFileRoute, Link } from "@tanstack/react-router";
import { tr } from "@/lib/tr";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignInDialog } from "@/components/sign-in-dialog";
import { WhyNote } from "@/components/why-note";
import { useAccess } from "@/hooks/use-access";
import { supabase } from "@/integrations/supabase/client";
import { setUpDemoWorkshop } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Operations — AutoJackie" },
    { name: "description", content: "AutoJackie operations: onboard partner workshops." },
    { property: "og:title", content: "Operations — AutoJackie" },
    { property: "og:description", content: "Internal operations panel for onboarding AutoJackie workshops." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: AdminPage,
});

type Row = { id: string; name: string; city: string; created_at: string; email: string; claimed: boolean };

function AdminPage() {
  const { user, ready, isAdmin } = useAccess();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [city, setCity] = useState("");
  const [vat, setVat] = useState(""); const [phone, setPhone] = useState(""); const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const [demo, setDemo] = useState<{ email: string; password: string } | null>(null);
  const [signIn, setSignIn] = useState(false);
  const demoFn = useServerFn(setUpDemoWorkshop);

  const load = useCallback(async () => {
    const [{ data: ws }, { data: inv }] = await Promise.all([
      supabase.from("workshops").select("id,name,city,created_at").order("created_at", { ascending: false }),
      supabase.from("workshop_invites").select("workshop_id,email,claimed_at"),
    ]);
    setRows((ws ?? []).map(w => { const i = inv?.find(x => x.workshop_id === w.id); return { ...w, email: i?.email ?? "No invite", claimed: !!i?.claimed_at }; }));
  }, []);
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin, load]);

  const onboard = async () => {
    setBusy(true); setMsg("");
    const { data: id, error } = await supabase.rpc("admin_onboard_workshop", { _name: name, _email: email, _city: city });
    if (!error && id) await supabase.rpc("admin_set_workshop_profile", { _workshop: id as string, _vat: vat, _phone: phone, _address: address });
    setBusy(false);
    if (error) return setMsg("Couldn't onboard. Check the name and email.");
    setMsg(`${name} is ready. When ${email} signs in, they'll land in their dashboard.`);
    setName(""); setEmail(""); setCity(""); setVat(""); setPhone(""); setAddress(""); void load();
  };
  const makeDemo = async () => {
    setBusy(true); setMsg("");
    try { setDemo(await demoFn()); void load(); } catch { setMsg("Couldn't set up the demo workshop."); }
    setBusy(false);
  };

  return <div className="app-frame">
    <header className="site-header">
      <Link to="/" className="brand" aria-label={tr("AutoJackie home")}><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>{tr("Auto")}<span className="brand-orange">{tr("Jackie")}</span></span><span className="brand-sub">{tr("operations")}</span></Link>
      <nav><Button variant="ghost" asChild><Link to="/workshop">{tr("Workshop view")}</Link></Button>{user && <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); window.location.assign("/workshop"); }}>{tr("Sign out")}</Button>}</nav>
    </header>
    <main className="ws-main">
      {!ready ? <p className="history-note" role="status">{tr("Loading…")}</p>
        : !user ? <div className="ws-empty"><ShieldCheck/><h1>{tr("Operations team only")}</h1><Button onClick={() => setSignIn(true)}>{tr("Sign in")}</Button></div>
        : !isAdmin ? <div className="ws-empty"><ShieldCheck/><h1>{tr("Operations team only")}</h1><p>{tr("This account isn't an AutoJackie admin.")}</p></div>
        : <>
          <div className="ws-title"><div><span className="eyebrow">{tr("OPERATIONS")}</span><h1>{tr("Onboard a workshop")}</h1><p className="history-note">{tr("Each workshop gets its own space, started from the standard template (rates, opening hours, services).")}</p></div></div>
          <WhyNote id="admin" title={tr("The business case in one glance.")} stats={[
            { value: "36%", text: "of privately owned cars in Sweden are registered to women. A huge customer group the industry's jargon-heavy booking flow underserves.", source: { label: "Trafikanalys, 2022", url: "https://www.trafa.se/globalassets/statistik/vagtrafik/fordon/2023/fordon-i-lan-och-kommuner-2022.pdf" } },
            { value: "$108k", text: "estimated revenue a single auto service location loses per year to poor call handling. Jackie captures that demand in writing instead.", source: { label: "Marchex via Auto Service World", url: "https://www.autoserviceworld.com/phone-fails-lead-to-missed-automotive-service-revenue-report/" } },
            { value: "2 models", text: "a lightweight everyday model for chat, a stronger one only for price estimates. That keeps cost per conversation low enough for workshop monetization." },
          ]} footer="Onboarding stays manual on purpose: we verify each workshop before drivers can send them requests."/>
          <form className="admin-form" onSubmit={e => { e.preventDefault(); void onboard(); }}>
            <div><Label htmlFor="a-name">{tr("Workshop name")}</Label><Input id="a-name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)}/></div>
            <div><Label htmlFor="a-email">{tr("Owner's email")}</Label><Input id="a-email" required type="email" value={email} onChange={e => setEmail(e.target.value)}/></div>
            <div><Label htmlFor="a-city">{tr("City (optional)")}</Label><Input id="a-city" maxLength={60} value={city} onChange={e => setCity(e.target.value)}/></div>
            <div><Label htmlFor="a-vat">{tr("VAT number")}</Label><Input id="a-vat" maxLength={30} placeholder={tr("SE556677889901")} value={vat} onChange={e => setVat(e.target.value)}/></div>
            <div><Label htmlFor="a-phone">{tr("Workshop phone")}</Label><Input id="a-phone" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)}/></div>
            <div><Label htmlFor="a-addr">{tr("Address")}</Label><Input id="a-addr" maxLength={200} value={address} onChange={e => setAddress(e.target.value)}/></div>
            <Button type="submit" disabled={busy}>{tr("Onboard")}</Button>
          </form>
          {msg && <p className="history-note" role="status">{msg}</p>}

          <div className="ws-title admin-demo"><div><span className="eyebrow">{tr("DEMO")}</span><h2>{tr("Demo Verkstad for judges")}</h2><p className="history-note">{tr("Creates the demo workshop with sample requests the first time. Each click issues a new password.")}</p></div><Button variant="outline" onClick={() => void makeDemo()} disabled={busy}>{tr("Set up / reset demo login")}</Button></div>
          {demo && <div className="offer-card"><span className="eyebrow">{tr("DEMO LOGIN · COPY IT NOW")}</span><p>{tr("Email:")} <strong>{demo.email}</strong></p><p>{tr("Password:")} <strong>{demo.password}</strong></p></div>}

          <h2 className="admin-h2">Workshops ({rows.length})</h2>
          <p className="history-note"><span className="preview-badge">{tr("Coming soon")}</span> {tr("Multiple branches per owner: one account running several workshop locations, each with its own Jackie, prices and booking calendar.")}</p>
          <ul className="ws-list">{rows.map(r => <li key={r.id} className="admin-row"><strong>{r.name}</strong><span>{r.city}</span><span>{r.email}</span><span className={`ws-status ${r.claimed ? "s-booked" : ""}`}>{r.claimed ? "Signed in" : "Invited"}</span></li>)}</ul>
        </>}
    </main>
    <SignInDialog open={signIn} onOpenChange={setSignIn}/>
  </div>;
}
