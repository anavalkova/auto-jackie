import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Car, ChevronDown, Gauge, Globe2, HelpCircle, LockKeyhole, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GarageDialog } from "@/components/garage-dialog";
import { JackieChat } from "@/components/jackie-chat";
import { nextService, symptomChips, type Vehicle } from "@/lib/vehicles";
import jackie from "@/assets/jackie.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AutoJackie — Car trouble, translated" },
    { name: "description", content: "Ask Jackie about noises, warning lights and parts. Plain-English car answers for drivers in Sweden, with sources linked." },
    { property: "og:title", content: "AutoJackie — Car trouble, translated" },
    { property: "og:description", content: "Plain-English car answers with linked sources. Add your car by Swedish plate, German HSN/TSN or by hand." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const STORAGE = "autojackie.vehicle";
const fmt = (n: number) => n.toLocaleString("sv-SE");

function Index() {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [garageOpen, setGarageOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [info, setInfo] = useState<"workshop" | "about" | "privacy" | null>(null);

  useEffect(() => { try { const s = localStorage.getItem(STORAGE); if (s) setVehicle(JSON.parse(s)); } catch { /* ignore */ } }, []);
  const save = (v: Vehicle) => { setVehicle(v); localStorage.setItem(STORAGE, JSON.stringify(v)); };
  const service = vehicle ? nextService(vehicle) : null;

  return <div className="app-frame">
    <header className="site-header">
      <a href="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span></a>
      <nav aria-label="Main navigation"><span className="market-label"><span className="swedish-flag"/>Made for Sweden</span><Button variant="ghost" onClick={() => setInfo("workshop")} className="workshop-link">For workshops <ArrowUpRight/></Button><Button variant="outline" className="language-control" onClick={() => setInfo("about")} aria-label="Language: English"><Globe2/> EN <ChevronDown/></Button></nav>
    </header>

    <main className="workspace">
      <aside className="jackie-panel">
        <div className="portrait-wrap compact"><img src={jackie} alt="Jackie, a mechanic in an orange work jacket" width={1024} height={1024}/><span className="portrait-label"><span className="status-dot"/> Jackie is in</span></div>

        <section className="vehicle-card" aria-label="Your car">
          <div className="vehicle-head"><span className="eyebrow">YOUR CAR</span>{vehicle && <Button variant="ghost" size="sm" onClick={() => setGarageOpen(true)}><Pencil/> Change</Button>}</div>
          {!vehicle ? <div className="vehicle-empty"><Car/><p>No car added yet. Add it by plate, HSN/TSN or by hand.</p><Button onClick={() => setGarageOpen(true)}><Plus/> Add your car</Button></div> : <>
            <h2 className="vehicle-name">{vehicle.confidential ? <span className="plate-chip"><span className="plate-eu">S</span>{vehicle.label}</span> : vehicle.label}</h2>
            <p className="vehicle-spec">{vehicle.confidential ? <><LockKeyhole/> Registry details kept private</> : vehicle.description}</p>
            <div className="service-box"><Gauge/>{service ? <div><strong>Next service in about {fmt(service.remaining)} km</strong><span>Estimated at {fmt(service.dueAt)} km · every {fmt(vehicle.serviceKm)} km</span><div className="service-bar"><span style={{ width: `${Math.round(service.progress * 100)}%` }}/></div></div> : <div><strong>Add your odometer reading</strong><span>to estimate the next service.</span></div>}</div>
            <p className="estimate-note">Rough estimate from typical intervals — your service book wins.</p>
          </>}
          <span className="eyebrow chips-title">QUICK QUESTIONS</span>
          <div className="symptom-chips">{symptomChips.map(c => <Button key={c} variant="outline" size="sm" className="symptom-chip" onClick={() => setPending(c)}>{c}</Button>)}</div>
        </section>
      </aside>

      <section className="assistant-area" aria-label="Chat with Jackie">
        <div className="assistant-top"><span><span className="status-dot"/> AI MECHANIC · ANSWERS FROM WIKIDATA</span><span className="preview-badge">Early preview</span></div>
        <JackieChat vehicle={vehicle} pending={pending} onPendingSent={() => setPending(null)}/>
        <div className="assistant-bottom"><span className="swedish-flag"/><span>Jackie explains — a workshop should confirm before any repair.</span><Button variant="ghost" size="icon" aria-label="About this preview" onClick={() => setInfo("about")}><HelpCircle/></Button></div>
      </section>
    </main>

    <footer className="site-footer"><span>© {new Date().getFullYear()} AutoJackie</span><span className="footer-tagline">Jackie is new — go easy on her.</span><div><Button variant="link" onClick={() => setInfo("privacy")}>Privacy</Button><Button variant="link" onClick={() => setInfo("about")}>About Jackie <ArrowUpRight/></Button></div></footer>
    <GarageDialog key={garageOpen ? "open" : "closed"} open={garageOpen} onOpenChange={setGarageOpen} vehicle={vehicle} onSave={save}/>
    <Dialog open={info !== null} onOpenChange={open => { if (!open) setInfo(null); }}><DialogContent><DialogHeader><DialogTitle>{info === "workshop" ? "A helping hand for your workshop" : info === "privacy" ? "Your details stay yours" : "Nice to meet you. I'm Jackie."}</DialogTitle><DialogDescription>{info === "workshop" ? "The workshop space comes in a later phase. Right now AutoJackie focuses on helping drivers understand their car." : info === "privacy" ? "Your car is saved only in this browser. Chats aren't stored. Registry details from a plate are never shown on screen." : "I explain car problems in plain English, using facts from Wikidata and linking every source. Plate lookups use a sample catalog in this preview; prices and bookings come later."}</DialogDescription></DialogHeader><Button onClick={() => setInfo(null)}>Got it</Button></DialogContent></Dialog>
  </div>;
}
