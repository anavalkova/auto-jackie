import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppSheet } from "@/components/app-sheet";
import { tr } from "@/lib/tr";
import { useT } from "@/lib/i18n";

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
  { tab: "overview", area: ["Driver view", "Förarvy", "Fahreransicht"],
    title: ["Now see it as a driver", "Se det nu som förare", "Jetzt aus Fahrersicht"],
    body: ["Open “Driver view” in the top bar to see the page your customers use.", "Öppna ”Förarvy” i toppen för att se sidan dina kunder använder.", "Öffnen Sie oben „Fahreransicht“, um die Seite Ihrer Kunden zu sehen."],
    can: [
      ["Describe a problem like a driver would", "Beskriv ett problem som en förare", "Ein Problem wie ein Fahrer beschreiben"],
      ["Watch Jackie triage it with your context and prices", "Se Jackie sortera det med din kontext och dina priser", "Sehen, wie Jackie mit Ihrem Kontext und Ihren Preisen sortiert"],
      ["Book a time and watch it land in Requests", "Boka en tid och se den hamna i Förfrågningar", "Einen Termin buchen und in Anfragen sehen"],
    ] },
];

const DONE_KEY = "autojackie_tour_done";

export function tourDone() {
  try { return localStorage.getItem(DONE_KEY) === "1"; } catch { return true; }
}

const IDX = { en: 0, sv: 1, de: 2 } as const;

export function DemoTour({ step, onStep, onClose }: { step: number; onStep: (s: number) => void; onClose: () => void }) {
  const { lang } = useT();
  const s = TOUR_STEPS[step];
  if (!s) return null;
  const i = IDX[lang as keyof typeof IDX] ?? 0;
  const last = step === TOUR_STEPS.length - 1;
  return <AppSheet open onOpenChange={o => { if (!o) onClose(); }} className="tour-sheet"
    eyebrow={<>{s.area[i]} · {tr("Step {a} of {b}", { a: step + 1, b: TOUR_STEPS.length })}</>}
    title={s.title[i]} description={s.body[i]}
    footer={<>
      <Button variant="outline" size="sm" disabled={step === 0} onClick={() => onStep(step - 1)}>{tr("Back")}</Button>
      <Button size="sm" onClick={() => (last ? onClose() : onStep(step + 1))}>{last ? tr("Finish tour") : tr("Next")}</Button>
    </>}>
    <ul className="tour-can" aria-label={tr("What you can do here")}>
      {s.can.map(c => <li key={c[0]}><Check aria-hidden/>{c[i]}</li>)}
    </ul>
    <div className="tour-dots" aria-hidden>{TOUR_STEPS.map((_, n) => <span key={n} className={n === step ? "on" : undefined}/>)}</div>
  </AppSheet>;
}
