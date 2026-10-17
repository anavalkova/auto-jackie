import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tr } from "@/lib/tr";

export type TourTab = "overview" | "booking" | "context" | "pricing";

export const TOUR_STEPS: { tab: TourTab; title: string; body: string }[] = [
  {
    tab: "overview",
    title: "Your business at a glance",
    body: "New requests, this week's urgent jobs, estimated pipeline and after-hours demand — the numbers that usually live in your head, in one place. Try collapsing a panel.",
  },
  {
    tab: "booking",
    title: "Requests arrive pre-triaged",
    body: "No phone tag. Drivers talk to Jackie first, so every request comes with the car, the symptoms and an indicative quote. Click a request to see what Jackie told the driver.",
  },
  {
    tab: "context",
    title: "Jackie speaks with your know-how",
    body: "Your services, expertise and working preferences shape every answer she gives. This is your competitive edge — a generic chatbot can't sell what makes you good.",
  },
  {
    tab: "pricing",
    title: "Quotes come from your prices",
    body: "Indicative quotes are calculated from your services, rates and job times — so drivers arrive knowing roughly what to expect, and you keep control of every number.",
  },
  {
    tab: "overview",
    title: "Now see it as a driver",
    body: "Click “Driver view” in the top bar to open the live page your customers see: they describe the problem, Jackie triages it with your context, and the booking lands here.",
  },
];

const DONE_KEY = "autojackie_tour_done";

export function tourDone() {
  try { return localStorage.getItem(DONE_KEY) === "1"; } catch { return true; }
}
function markDone() {
  try { localStorage.setItem(DONE_KEY, "1"); } catch { /* private mode */ }
}

export function DemoTour({ step, onStep, onClose }: { step: number; onStep: (s: number) => void; onClose: () => void }) {
  const s = TOUR_STEPS[step];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!s) return null;
  const last = step === TOUR_STEPS.length - 1;
  return (
    <div className="tour-backdrop" role="presentation" onClick={onClose}>
      <div className="tour-card" role="dialog" aria-modal="true" aria-label={tr("Guided tour")} onClick={e => e.stopPropagation()}>
        <div className="tour-card-top">
          <span className="history-note">{tr("Step {a} of {b}", { a: step + 1, b: TOUR_STEPS.length })}</span>
          <Button variant="ghost" size="icon" className="tour-close" aria-label={tr("Close")} onClick={onClose}><X /></Button>
        </div>
        <h3>{tr(s.title)}</h3>
        <p>{tr(s.body)}</p>
        <div className="tour-card-actions">
          <Button variant="outline" size="sm" disabled={step === 0} onClick={() => onStep(step - 1)}>{tr("Back")}</Button>
          <Button size="sm" onClick={() => (last ? onClose() : onStep(step + 1))}>{last ? tr("Finish tour") : tr("Next")}</Button>
        </div>
      </div>
    </div>
  );
}
