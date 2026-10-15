import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUp, ArrowUpRight, Check, ChevronDown, Droplets, Globe2, HelpCircle, LockKeyhole, MessageCircle, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import jackie from "@/assets/jackie.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "AutoJackie — Your friendly car-service assistant" },
    { name: "description", content: "Meet Jackie, your friendly car-service assistant in Sweden. Tell her what's going on with your car — in your own words." },
    { property: "og:title", content: "AutoJackie — Your friendly car-service assistant" },
    { property: "og:description", content: "Tell Jackie what's going on with your car, in your own words. No account, no jargon." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Index,
});

const services = [
  { label: "Oil & filter change", prompt: "I'd like an oil and filter change.", icon: Droplets },
  { label: "Tyres & wheels", prompt: "I'd like help with my tyres and wheels.", icon: CircleTyre },
  { label: "Something feels off", prompt: "Something feels off with my car.", icon: Wrench },
];

function CircleTyre({ className }: { className?: string }) {
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m8 8 2 2m4 4 2 2m0-8-2 2m-4 4-2 2M12 3v2m9 7h-2M12 21v-2M3 12h2"/></svg>;
}

function Index() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hasPlate, setHasPlate] = useState(false);
  const [info, setInfo] = useState<"workshop" | "about" | "privacy" | null>(null);
  const reset = () => { setInput(""); setSubmitted(false); setHasPlate(false); };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    setHasPlate(/\b[a-z]{3}\s?\d{2}[a-z0-9]\b/i.test(input));
    setSubmitted(true);
  };

  return <div className="app-frame">
    <header className="site-header">
      <a href="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span></a>
      <nav aria-label="Main navigation"><span className="market-label"><span className="swedish-flag"/>Made for Sweden</span><Button variant="ghost" onClick={() => setInfo("workshop")} className="workshop-link">For workshops <ArrowUpRight/></Button><Button variant="outline" className="language-control" onClick={() => setInfo("about")} aria-label="Language: English"><Globe2/> EN <ChevronDown/></Button></nav>
    </header>

    <main className="workspace">
      <aside className="jackie-panel">
        <div className="portrait-wrap"><img src={jackie} alt="Jackie, a mechanic in an orange work jacket" width={1024} height={1024}/><span className="portrait-label"><span className="status-dot"/> This is Jackie</span></div>
        <div className="jackie-intro"><span className="eyebrow">CAR HELP IN PLAIN WORDS</span><h2>Car trouble,<br/>translated.</h2><p>Jackie tells you what your car needs and helps you get it sorted — no jargon, no upselling, no guessing.</p><div className="signature">Jackie <span>— your friendly mechanic</span></div></div>
        <div className="panel-bottom"><ShieldCheck/><span>You decide what happens to your car.</span></div>
      </aside>

      <section className="assistant-area" aria-label="Car-service assistant">
        <div className="assistant-top"><span><span className="status-dot"/> YOUR CAR-SERVICE ASSISTANT</span><span className="preview-badge">Early preview</span></div>
        <div className="assistant-content">
          <span className="greeting-icon"><MessageCircle strokeWidth={1.6}/><span className="greeting-mini">J</span></span>
          <div className="greeting"><span className="eyebrow">HEY THERE, I'M JACKIE</span><h1>What's the car<br/>up to today?</h1><p>Tell me what's going on — your own words are fine.</p></div>
          {!submitted ? <>
            <div className="service-grid">{services.map(({ label, prompt, icon: Icon }) => <Button variant="outline" key={label} className={`service-option ${input === prompt ? "selected" : ""}`} onClick={() => setInput(prompt)}><Icon className="service-icon"/><span>{label}</span><ArrowUpRight className="service-arrow"/></Button>)}</div>
            <form className="composer" onSubmit={submit}><label className="sr-only" htmlFor="request">Your car question or service request</label><textarea id="request" placeholder="Ask a question, or tell me what your car needs…" value={input} onChange={event => setInput(event.target.value)} rows={2}/><div className="composer-bottom"><span>Swedish licence plate? You can add it here.</span><Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send request"><ArrowUp/></Button></div></form>
            <div className="example">Try: <Button variant="link" onClick={() => setInput("Hi Jackie, I need an oil change for NHA 780.")}>“I need an oil change for NHA 780”</Button></div>
          </> : <div className="demo-result" role="status"><span className="demo-check"><Check/></span><span className="eyebrow">DEMO REQUEST RECEIVED</span><h3>{hasPlate ? "I got the information." : "You're in the right place."}</h3><p>This is an early preview. Live advice, price estimates, vehicle lookups and workshop bookings aren't connected yet.</p><Button variant="outline" onClick={reset}><RotateCcw/> Start again</Button></div>}
          <div className="trust-row"><span><ShieldCheck/> No account needed</span><span><LockKeyhole/> Your details stay private</span><span><Check/> Free for drivers</span></div>
        </div>
        <div className="assistant-bottom"><span className="swedish-flag"/><span>Made for Swedish roads.</span><Button variant="ghost" size="icon" aria-label="About this preview" onClick={() => setInfo("about")}><HelpCircle/></Button></div>
      </section>
    </main>

    <footer className="site-footer"><span>© {new Date().getFullYear()} AutoJackie</span><span className="footer-tagline">Jackie is new — go easy on her.</span><div><Button variant="link" onClick={() => setInfo("privacy")}>Privacy</Button><Button variant="link" onClick={() => setInfo("about")}>About Jackie <ArrowUpRight/></Button></div></footer>
    <Dialog open={info !== null} onOpenChange={open => { if (!open) setInfo(null); }}><DialogContent><DialogHeader><DialogTitle>{info === "workshop" ? "A helping hand for your workshop" : info === "privacy" ? "Your details stay yours" : "Nice to meet you. I'm Jackie."}</DialogTitle><DialogDescription>{info === "workshop" ? "The workshop space is coming in a later phase. This first preview focuses on the driver's starting screen — no workshop accounts or bookings yet." : info === "privacy" ? "This preview doesn't save your request or look up your vehicle. Your text stays on this page and disappears when you refresh. Vehicle details will never be shown to drivers." : "AutoJackie is starting with English-language support for drivers in Sweden. This is a simple early preview; live car advice, prices and bookings will come in later phases."}</DialogDescription></DialogHeader><Button onClick={() => setInfo(null)}>Got it</Button></DialogContent></Dialog>
  </div>;
}
