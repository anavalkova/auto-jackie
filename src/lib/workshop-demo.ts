import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n";
import { upcomingDays } from "@/lib/booking";

type Settings = Database["public"]["Tables"]["workshop_settings"]["Row"];
type Inquiry = Database["public"]["Tables"]["inquiries"]["Row"];
const DEMO_DRIVER = "00000000-0000-4000-8000-000000000001";
export const DEMO_TEAM = [
  { user_id: "demo-owner", email: "elin@example.com", role: "owner" as const },
  { user_id: "demo-desk", email: "sam@example.com", role: "staff" as const },
];
export const DEMO_PRICES = [
  { task: "Annual service", price_sek: 2900, minutes: 120 },
  { task: "Brake pads, front", price_sek: 1900, minutes: 60 },
  { task: "Tyre change", price_sek: 500, minutes: 30 },
  { task: "Diagnostics", price_sek: 750, minutes: 60 },
  { task: "Timing belt", price_sek: 6500, minutes: 300 },
  { task: "Battery replacement", price_sek: 1800, minutes: 30 },
  { task: "Wheel alignment", price_sek: 1000, minutes: 45 },
  { task: "AC service", price_sek: 1200, minutes: 60 },
  { task: "Other", price_sek: 0, minutes: 60 },
];
const COPY = {
  en: {
    services: "Routine servicing, brakes, seasonal tyre changes and storage, warning-light checks, batteries and air conditioning. Bodywork and paint repairs go to a partner.",
    specialties: "Example workshop: Volvo and Volkswagen experience, two EV-trained technicians, a tyre hotel and a courtesy car by arrangement.",
    context: "Prefer OEM or Bosch parts. Inspect first, explain the findings in plain words and ask for approval before extra work. Offer a lower-cost option where suitable. Estimates include 25% VAT, not a guaranteed repair price.",
    greeting: "Welcome to Demo Verkstad. Tell Jackie what feels off.",
    issues: ["Time for an annual service", "A squeak when I brake", "Swap to winter tyres", "The engine light is on", "Timing belt inspection", "The car is slow to start", "The car pulls to one side", "Air conditioning is not cold", "Tow bar fitting", "Seat heating repair"],
    messages: ["Can I leave the key before work?", "Please explain the cost before doing any extra work.", "I found Jackie after you closed. Booking online was much easier."],
    note: "Illustrative estimate including 25% VAT. The workshop checks the car and confirms any repair cost before extra work.",
  },
  sv: {
    services: "Service, bromsar, säsongsbyte och förvaring av däck, kontroll av varningslampor, batterier och AC. Kaross och lack hänvisas till en partner.",
    specialties: "Exempelverkstad: erfarenhet av Volvo och Volkswagen, två elbilsutbildade tekniker, däckhotell och lånebil efter överenskommelse.",
    context: "Välj originaldelar eller Bosch. Undersök först och förklara enkelt. Be om godkännande före extra arbete och erbjud billigare alternativ när det passar. Uppskattningar inkluderar 25% moms, inte ett garanterat reparationspris.",
    greeting: "Välkommen till Demo Verkstad. Berätta för Jackie vad som känns fel.",
    issues: ["Dags för årlig service", "Det gnisslar när jag bromsar", "Byt till vinterdäck", "Motorlampan lyser", "Kontroll av kamrem", "Bilen är svårstartad", "Bilen drar åt ena sidan", "AC ger ingen kyla", "Montering av dragkrok", "Reparation av sätesvärme"],
    messages: ["Kan jag lämna nyckeln före jobbet?", "Förklara kostnaden innan ni gör extra arbete.", "Jag hittade Jackie efter stängning. Det var enklare att boka online."],
    note: "Exempel på uppskattning inklusive 25% moms. Verkstaden undersöker bilen och bekräftar reparationskostnaden före extra arbete.",
  },
  de: {
    services: "Inspektionen, Bremsen, saisonaler Reifenwechsel und Einlagerung, Warnleuchtenprüfung, Batterien und Klimaanlagen. Karosserie und Lack übernimmt ein Partner.",
    specialties: "Beispielwerkstatt: Erfahrung mit Volvo und Volkswagen, zwei für E-Autos geschulte Techniker, Reifenlager und Leihwagen nach Absprache.",
    context: "Originalteile oder Bosch bevorzugen. Erst prüfen, verständlich erklären und vor Zusatzarbeiten Zustimmung einholen. Wenn geeignet eine günstigere Alternative anbieten. Schätzungen enthalten 25% MwSt., sind kein garantierter Reparaturpreis.",
    greeting: "Willkommen bei Demo Verkstad. Sag Jackie, was sich nicht richtig anfühlt.",
    issues: ["Zeit für die jährliche Inspektion", "Es quietscht beim Bremsen", "Auf Winterreifen wechseln", "Die Motorleuchte leuchtet", "Zahnriemen prüfen", "Das Auto startet schwer", "Das Auto zieht zur Seite", "Die Klimaanlage kühlt nicht", "Anhängerkupplung montieren", "Sitzheizung reparieren"],
    messages: ["Kann ich den Schlüssel vor der Arbeit abgeben?", "Bitte die Kosten vor Zusatzarbeiten erklären.", "Ich fand Jackie nach Feierabend. Online buchen war viel einfacher."],
    note: "Beispielschätzung inklusive 25% MwSt. Die Werkstatt prüft das Auto und bestätigt Reparaturkosten vor Zusatzarbeiten.",
  },
};

/** Fictional presentation data only. Never saved, sent as notifications or granted real access. */
export function demoSettings(workshopId: string, lang: Lang, now = new Date()): Settings {
  const copy = COPY[lang];
  const days = upcomingDays(now, 10, { closeHolidays: true });
  return {
    workshop_id: workshopId, hourly_rate_sek: 1100, opening_hours: "Mon-Fri 07:30-17:00",
    phone: "+46 (0)8 000 00 00", address: "Exempelgatan 12, Stockholm", contact_email: "hello@example.com",
    website: "https://example.com", services: [copy.services], specialties: copy.specialties, jackie_context: copy.context,
    booking_days: [1, 2, 3, 4, 5], slot_hours: [8, 10, 13, 15], min_notice_days: 1, max_ahead_days: 90,
    close_holidays: true, closed_slots: [days[8]?.key, days[9] ? `${days[9].key}T13` : undefined].filter((s): s is string => !!s),
    price_list: DEMO_PRICES.map(p => ({ ...p })), job_durations: DEMO_PRICES.map(p => ({ job: p.task, minutes: p.minutes })),
    ai_chat_tier: "economy", ai_quote_tier: "balanced", brand_accent: "#1cb587", brand_logo_url: "", brand_greeting: copy.greeting,
    updated_at: now.toISOString(),
  };
}

export function demoInquiries(workshopId: string, lang: Lang, now = new Date()): Inquiry[] {
  const copy = COPY[lang];
  const days = upcomingDays(now, 8, { closeHolidays: true });
  const names = ["Elin Andersson", "Sam Lind", "Maja Berg", "Alex Holm", "Nora Ek"];
  const statuses = ["new", "contacted", "quoted", "booked", "closed"] as const;
  return Array.from({ length: 20 }, (_, index) => {
    const scenario = index % 10;
    const status = statuses[Math.floor(index / 4)] ?? "new";
    const price = DEMO_PRICES[scenario < 8 ? scenario : 8];
    const amount = price?.price_sek ?? 0;
    const created = new Date(now.getTime() - (index + 1) * 18 * 3600000);
    const slot = days[index % 8]?.slots[index % 4]?.toISOString() ?? null;
    const bookedAt = status === "booked" ? slot : status === "closed" ? new Date(now.getTime() - (index - 14) * 86400000).toISOString() : null;
    return {
      id: `00000000-0000-4000-8000-${String(index + 100).padStart(12, "0")}`, workshop_id: workshopId, driver_id: DEMO_DRIVER,
      issue: copy.issues[scenario] ?? "", service: price?.task ?? "Other", status,
      urgency: index % 5 === 0 ? "today" : index % 3 === 0 ? "this week" : "soon",
      contact_name: names[index % 5] ?? "", contact_phone: "+46 (0)70 000 00 00", contact_email: `driver${index + 1}@example.com`, contact_channel: "email",
      vehicle_label: "", message: copy.messages[index % 3] ?? "", note: copy.note,
      price_low_sek: amount || 800, price_high_sek: amount ? Math.round(amount * 1.25) : 2500,
      quote_low_sek: status === "quoted" ? amount || 800 : null, quote_high_sek: status === "quoted" ? amount || 2500 : null,
      booked_at: bookedAt, preferred_slots: slot ? [slot] : [], created_at: created.toISOString(), updated_at: created.toISOString(),
    };
  });
}