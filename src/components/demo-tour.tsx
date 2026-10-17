import { useEffect, useRef, useState } from "react";
import { Check, Lightbulb, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { tr } from "@/lib/tr";

export type TourTab = "overview" | "booking" | "context" | "pricing" | "profile";
type L3 = [string, string, string]; // EN, SV, DE
export type TourStep = { tab: TourTab; sub?: number; area: L3; title: L3; body: L3; can: L3[] };

export const TOUR_STEPS: TourStep[] = [
  { tab: "overview", area: ["Overview", "Översikt", "Übersicht"],
    title: ["Your business at a glance", "Din verkstad i ett ögonkast", "Ihre Werkstatt auf einen Blick"],
    body: ["The numbers that usually live in your head, in one place.", "Siffrorna du brukar ha i huvudet, på ett ställe.", "Die Zahlen, die sonst nur in Ihrem Kopf sind, an einem Ort."],
    can: [
      ["See new requests and jobs that need you this week", "Se nya förfrågningar och jobb som behöver dig i veckan", "Neue Anfragen und Aufträge dieser Woche sehen"],
      ["Track the estimated open pipeline in kr", "Följ den uppskattade öppna orderstocken i kr", "Die geschätzte offene Pipeline in kr verfolgen"],
      ["Spot demand that came in after hours", "Se efterfrågan som kom in efter stängning", "Nachfrage außerhalb der Öffnungszeiten erkennen"],
      ["Compare demand per service and what you don't offer yet", "Jämför efterfrågan per tjänst och det du inte erbjuder än", "Nachfrage pro Leistung vergleichen, auch was Sie noch nicht anbieten"],
    ] },
  { tab: "booking", sub: 0, area: ["Booking · Requests", "Bokning · Förfrågningar", "Buchung · Anfragen"],
    title: ["Requests arrive pre-triaged", "Förfrågningar kommer färdigsorterade", "Anfragen kommen vorsortiert"],
    body: ["Drivers talk to Jackie first, so every request comes with the car, the symptoms and a rough quote.", "Förare pratar med Jackie först, så varje förfrågan har bil, symptom och ett ungefärligt pris.", "Fahrer sprechen zuerst mit Jackie, daher kommt jede Anfrage mit Auto, Symptomen und grobem Preis."],
    can: [
      ["Filter by status: new, contacted, quoted, booked, closed", "Filtrera på status: ny, kontaktad, offererad, bokad, stängd", "Nach Status filtern: neu, kontaktiert, Angebot, gebucht, geschlossen"],
      ["Open a request to see the drop-off time, urgency and Jackie's quote", "Öppna en förfrågan för lämningstid, brådska och Jackies pris", "Anfrage öffnen: Abgabezeit, Dringlichkeit und Jackies Preis"],
      ["Call or email the driver and move the status along", "Ring eller mejla föraren och flytta statusen framåt", "Fahrer anrufen oder mailen und den Status weiterführen"],
    ] },
  { tab: "booking", sub: 1, area: ["Booking · Booking settings", "Bokning · Bokningsinställningar", "Buchung · Buchungseinstellungen"],
    title: ["You decide when drivers can book", "Du bestämmer när förare kan boka", "Sie bestimmen, wann Fahrer buchen"],
    body: ["Drivers only see the days and drop-off times you open.", "Förare ser bara de dagar och lämningstider du öppnar.", "Fahrer sehen nur die Tage und Abgabezeiten, die Sie freigeben."],
    can: [
      ["Pick working days and drop-off times", "Välj arbetsdagar och lämningstider", "Arbeitstage und Abgabezeiten wählen"],
      ["Set the earliest and latest booking", "Ställ in tidigaste och senaste bokning", "Früheste und späteste Buchung festlegen"],
      ["Close Swedish holidays with one tick", "Stäng svenska helgdagar med en bock", "Schwedische Feiertage mit einem Haken schließen"],
      ["Close a whole day or single times", "Stäng en hel dag eller enstaka tider", "Einen ganzen Tag oder einzelne Zeiten schließen"],
    ] },
  { tab: "context", sub: 0, area: ["Jackie context · Know-how", "Jackies kontext · Kunnande", "Jackie-Kontext · Know-how"],
    title: ["Jackie speaks with your know-how", "Jackie pratar med ditt kunnande", "Jackie spricht mit Ihrem Know-how"],
    body: ["What you write here shapes every answer Jackie gives your drivers.", "Det du skriver här formar varje svar Jackie ger dina förare.", "Was Sie hier schreiben, prägt jede Antwort von Jackie."],
    can: [
      ["Describe the services you offer, in your own words", "Beskriv dina tjänster med egna ord", "Ihre Leistungen in eigenen Worten beschreiben"],
      ["Add brands and specialties you're good at", "Lägg till märken och specialiteter du är bra på", "Marken und Spezialgebiete ergänzen"],
      ["Tell Jackie how you like to work with customers", "Berätta hur du vill jobba med kunder", "Sagen, wie Sie mit Kunden arbeiten"],
    ] },
  { tab: "context", sub: 1, area: ["Jackie context · Jackie's brain", "Jackies kontext · Jackies hjärna", "Jackie-Kontext · Jackies Gehirn"],
    title: ["Pick the quality you pay for", "Välj kvaliteten du betalar för", "Wählen Sie die Qualität, die Sie bezahlen"],
    body: ["Choose a level, not a model. We keep the models up to date for you.", "Välj en nivå, inte en modell. Vi håller modellerna uppdaterade.", "Wählen Sie eine Stufe, kein Modell. Wir halten die Modelle aktuell."],
    can: [
      ["Set the level for chat answers: economy, balanced or premium", "Välj nivå för chattsvar: ekonomi, balanserad eller premium", "Stufe für Chat-Antworten: Economy, Balanced oder Premium"],
      ["Set a separate level for rough quotes", "Välj en separat nivå för ungefärliga priser", "Eigene Stufe für grobe Preise wählen"],
    ] },
  { tab: "pricing", area: ["Pricing engine", "Prismotor", "Preis-Engine"],
    title: ["Quotes come from your prices", "Priserna kommer från dina priser", "Preise kommen aus Ihrer Preisliste"],
    body: ["Rough quotes use your rates and job times, so you keep control of every number.", "Ungefärliga priser bygger på dina priser och tider, så du styr varje siffra.", "Grobe Preise nutzen Ihre Sätze und Zeiten, Sie behalten jede Zahl im Griff."],
    can: [
      ["Set your hourly labour rate", "Ställ in ditt timpris", "Ihren Stundensatz festlegen"],
      ["Add ready-made or custom services with price and time", "Lägg till färdiga eller egna tjänster med pris och tid", "Fertige oder eigene Leistungen mit Preis und Zeit"],
      ["Job times decide how long a booking blocks your calendar", "Tiden avgör hur länge en bokning blockerar kalendern", "Die Zeit bestimmt, wie lange eine Buchung den Kalender belegt"],
      ["“Other” catches anything not on your list", "”Övrigt” fångar allt som inte finns på listan", "„Sonstiges“ fängt alles ab, was nicht auf der Liste steht"],
    ] },
  { tab: "profile", sub: 0, area: ["Profile · Contact details", "Profil · Kontaktuppgifter", "Profil · Kontaktdaten"],
    title: ["How drivers reach you", "Hur förare når dig", "Wie Fahrer Sie erreichen"],
    body: ["Shown to drivers mostly after they book.", "Visas för förare mest efter bokning.", "Wird Fahrern meist nach der Buchung gezeigt."],
    can: [
      ["Add phone, email, address and website", "Lägg till telefon, mejl, adress och webbplats", "Telefon, E-Mail, Adresse und Website eintragen"],
      ["Opening hours are what Jackie tells drivers", "Öppettiderna är det Jackie berättar för förare", "Öffnungszeiten sagt Jackie den Fahrern"],
      ["Your city decides which drivers find you", "Din stad avgör vilka förare som hittar dig", "Ihre Stadt bestimmt, welche Fahrer Sie finden"],
    ] },
  { tab: "profile", sub: 1, area: ["Profile · Your brand", "Profil · Ditt varumärke", "Profil · Ihre Marke"],
    title: ["Your own Jackie page", "Din egen Jackie-sida", "Ihre eigene Jackie-Seite"],
    body: ["One link to share on your website, Google profile or by SMS.", "En länk att dela på hemsidan, Google-profilen eller via sms.", "Ein Link für Website, Google-Profil oder SMS."],
    can: [
      ["Copy your page link", "Kopiera länken till din sida", "Ihren Seitenlink kopieren"],
      ["Choose your accent color", "Välj din accentfärg", "Ihre Akzentfarbe wählen"],
      ["Write the greeting drivers see first", "Skriv hälsningen förare ser först", "Die Begrüßung schreiben, die Fahrer zuerst sehen"],
    ] },
  { tab: "profile", sub: 2, area: ["Profile · Team", "Profil · Team", "Profil · Team"],
    title: ["Bring your team in", "Ta med ditt team", "Holen Sie Ihr Team dazu"],
    body: ["Invite people by their AutoJackie email.", "Bjud in med deras AutoJackie-mejl.", "Laden Sie Personen per AutoJackie-E-Mail ein."],
    can: [
      ["Admins can change every setting", "Admins kan ändra alla inställningar", "Admins können alles ändern"],
      ["Front desk sees Overview and requests only", "Reception ser bara översikt och förfrågningar", "Empfang sieht nur Übersicht und Anfragen"],
      ["Remove access any time", "Ta bort åtkomst när som helst", "Zugriff jederzeit entfernen"],
    ] },
];

const IDX = { en: 0, sv: 1, de: 2 } as const;

/**
 * Inline demo guide: shows what each dashboard section can do, right above
 * the section itself — no pop-up, nothing hidden behind a blur.
 */
export function DemoGuide({ tab }: { tab: TourTab }) {
  const { lang } = useT();
  const i = IDX[lang as keyof typeof IDX] ?? 0;
  const steps = TOUR_STEPS.filter(s => s.tab === tab);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  if (steps.length === 0) return null;
  const label = tr("What can I do here?");
  return <div className="why-overlay demo-guide-toggle" ref={ref}>
    <button type="button" className="why-chip" aria-expanded={open} onClick={() => setOpen(o => !o)}><Lightbulb aria-hidden/> {label}</button>
    {open && <aside className="why-note why-pop demo-guide-pop" aria-label={label}>
      <div className="why-pop-head"><strong className="why-title">{steps[0]!.area[i]}</strong><button type="button" className="why-close" aria-label={tr("Close")} onClick={() => setOpen(false)}><X/></button></div>
      {steps.map(s => <section key={s.area[0]} className="demo-guide-step">
        <p className="demo-guide-title"><strong>{s.title[i]}</strong></p>
        <p className="demo-guide-body">{s.body[i]}</p>
        <ul className="tour-can">{s.can.map(c => <li key={c[0]}><Check aria-hidden/>{c[i]}</li>)}</ul>
      </section>)}
    </aside>}
  </div>;
}
