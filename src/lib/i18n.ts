import { useEffect, useSyncExternalStore } from "react";

export const LANGS = [
  { code: "en", label: "English", short: "EN" },
  { code: "sv", label: "Svenska", short: "SV" },
  { code: "de", label: "Deutsch", short: "DE" },
] as const;
export type Lang = (typeof LANGS)[number]["code"];

const KEY = "autojackie.lang";
let current: Lang = "en";
const subs = new Set<() => void>();

export function setLang(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); document.documentElement.lang = l; } catch { /* ignore */ }
  subs.forEach(f => f());
}

/** Current UI language. Server render is always English; stored choice applies after hydration. */
export function useLang(): Lang {
  const lang = useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb); }, () => current, () => "en" as Lang);
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if ((s === "sv" || s === "de" || s === "en") && s !== current) setLang(s);
    } catch { /* ignore */ }
  }, []);
  return lang;
}

const dict = {
  en: {
    forWorkshops: "For workshops", account: "Your account", signOut: "Sign out", signInToSave: "Sign in to save",
    madeForSweden: "Made for Sweden", jackieNew: "Jackie is new. Go easy on her",
    yourSavedCar: "YOUR SAVED CAR", carForChat: "CAR FOR THIS CHAT", change: "Change",
    noCarSaved: "No car saved yet. Add it once and Jackie remembers it.",
    noCarGuest: "Share a plate, HSN/TSN or pick it by hand. Used for this chat only. Nothing is saved.",
    addCar: "Add your car", tellCar: "Tell Jackie about your car", privateDetails: "Registry details kept private",
    nextService: (km: string) => `Next service in about ${km} km`, estimatedAt: (a: string, b: string) => `Estimated at ${a} km · every ${b} km`,
    addOdo: "Add your odometer reading", toEstimate: "to estimate the next service.",
    savedToAccount: "Saved to your account.", notSaved: "Not saved. Gone when you start a new chat.", removeCar: "Remove car",
    bookVisit: "Book a visit", myChats: "My chats", newChat: "Start a new chat", loadingChats: "Loading chats…", privateNotSaved: "Private chat · not saved",
    signInChats: "Sign in to save chats", chatsError: "Couldn't load or update your chats.", tryAgain: "Try again",
    noChats: "No saved chats yet.", deleteChat: "Delete chat", chatsSaved: "Chats saved", privateChat: "Private chat",
    missingTitle: "This chat isn't here.", missingDeleted: "It may have been deleted.", missingSignIn: "Sign in with the account that saved it to see it.",
    signIn: "Sign in", startNew: "Start a new chat", opening: "Opening your chat…",
    bottom: "Jackie helps you understand the problem. A real workshop confirms the fix before you pay for anything.",
    about: "About Jackie", privacy: "Privacy", gotIt: "Got it",
    privacyTitle: "Your details stay yours",
    privacyBody: "Without signing in, nothing is saved: your car and chat disappear when you start over or close the tab. If you sign in, your car and chats are stored in your account, visible only to you, and you can delete them any time. Registry details from a plate are never shown on screen.",
    aboutTitle: "Nice to meet you. I'm Jackie.",
    aboutBody: "I explain car problems in plain words and link every source. I use Wikidata, the official OBD-II fault code list, Tesla's Model 3 service manual, the German KBA register for HSN/TSN and live Swedish plate lookups. I speak English, Swedish and German.",
    heroTitle: "Confess your car's sins.", heroSub: "Jackie listens without judging, then explains it in plain words, with urgency and a rough price.",
    whyTitle: "Car talk assumes everyone speaks 'mechanic'. Most drivers don't, and shouldn't have to.",
    why1: "of privately owned cars in Sweden are registered to women, yet most workshop communication still assumes deep technical knowledge.",
    why2: "Warning lights, HSN/TSN codes, service intervals. The industry speaks in codes. Jackie translates them into plain words, with sources.",
    starters: ["P0301 just appeared. Should I panic?", "The noise disappears whenever the mechanic gets in", "I named the warning light. We coexist now."],
    tryLabel: "Try:", placeholder: "Describe the noise, light or part you're wondering about…",
    savedToChats: "Saved to My chats", whatsNext: "WHAT'S NEXT", getLooked: "Get it looked at:", about_: "About", to: "to",
    vatNote: "incl. VAT · rough estimate, not a quote", requestVisit: "Request a workshop visit",
    toolSearch: "Searching Wikidata", toolCode: "Looking up fault code", toolTesla: "Reading Tesla service manual", toolItem: "Reading Wikidata record",
    checking: "Jackie is checking her sources…", genericError: "Something went wrong. Please try again.", quotaGuest: "You have used your 5 free questions this month. Sign in to keep talking to Jackie, with 50 questions a month.", quotaUser: "You have used your 50 questions this month. Jackie will be back for you next month.",
  },
  sv: {
    forWorkshops: "För verkstäder", account: "Ditt konto", signOut: "Logga ut", signInToSave: "Logga in för att spara",
    madeForSweden: "Gjord för Sverige", jackieNew: "Jackie är ny. Var snäll mot henne",
    yourSavedCar: "DIN SPARADE BIL", carForChat: "BIL FÖR DEN HÄR CHATTEN", change: "Ändra",
    noCarSaved: "Ingen bil sparad än. Lägg till den en gång så minns Jackie den.",
    noCarGuest: "Ange regnummer, HSN/TSN eller välj själv. Används bara i den här chatten. Inget sparas.",
    addCar: "Lägg till din bil", tellCar: "Berätta om din bil", privateDetails: "Registeruppgifter hålls privata",
    nextService: (km: string) => `Nästa service om cirka ${km} km`, estimatedAt: (a: string, b: string) => `Beräknad vid ${a} km · var ${b} km`,
    addOdo: "Ange mätarställning", toEstimate: "för att beräkna nästa service.",
    savedToAccount: "Sparad på ditt konto.", notSaved: "Sparas inte. Försvinner när du startar en ny chatt.", removeCar: "Ta bort bil",
    bookVisit: "Boka besök", myChats: "Mina chattar", newChat: "Starta en ny chatt", loadingChats: "Laddar chattar…", privateNotSaved: "Privat chatt · sparas inte",
    signInChats: "Logga in för att spara chattar", chatsError: "Kunde inte ladda eller uppdatera dina chattar.", tryAgain: "Försök igen",
    noChats: "Inga sparade chattar än.", deleteChat: "Radera chatt", chatsSaved: "Chattar sparas", privateChat: "Privat chatt",
    missingTitle: "Den här chatten finns inte.", missingDeleted: "Den kan ha raderats.", missingSignIn: "Logga in med kontot som sparade den.",
    signIn: "Logga in", startNew: "Starta en ny chatt", opening: "Öppnar din chatt…",
    bottom: "Jackie hjälper dig förstå problemet. En riktig verkstad bekräftar lagningen innan du betalar något.",
    about: "Om Jackie", privacy: "Integritet", gotIt: "Uppfattat",
    privacyTitle: "Dina uppgifter är dina",
    privacyBody: "Utan inloggning sparas ingenting: bil och chatt försvinner när du börjar om eller stänger fliken. Loggar du in sparas bil och chattar på ditt konto, synliga bara för dig, och du kan radera dem när som helst. Registeruppgifter från regnummer visas aldrig på skärmen.",
    aboutTitle: "Trevligt att träffas. Jag heter Jackie.",
    aboutBody: "Jag förklarar bilproblem med enkla ord och länkar varje källa. Jag använder Wikidata, den officiella OBD-II-listan med felkoder, Teslas servicemanual för Model 3, tyska KBA-registret för HSN/TSN och direktsökning av svenska regnummer. Jag pratar engelska, svenska och tyska.",
    heroTitle: "Bikta din bils synder.", heroSub: "Jackie lyssnar utan att döma och förklarar sedan med enkla ord, hur bråttom det är och ett ungefärligt pris.",
    whyTitle: "Bilprat förutsätter att alla kan 'mekaniska'. De flesta förare kan inte det, och ska inte behöva.",
    why1: "av privatägda bilar i Sverige är registrerade på kvinnor, ändå förutsätter de flesta verkstäder djup teknisk kunskap.",
    why2: "Varningslampor, HSN/TSN-koder, serviceintervall. Branschen pratar i koder. Jackie översätter till enkla ord, med källor.",
    starters: ["P0301 dök precis upp. Ska jag få panik?", "Ljudet försvinner så fort mekanikern sätter sig i bilen", "Jag har döpt varningslampan. Vi samexisterar nu."],
    tryLabel: "Testa:", placeholder: "Beskriv ljudet, lampan eller delen du undrar över…",
    savedToChats: "Sparad i Mina chattar", whatsNext: "NÄSTA STEG", getLooked: "Låt kolla det:", about_: "Cirka", to: "till",
    vatNote: "inkl. moms · grov uppskattning, ingen offert", requestVisit: "Begär verkstadsbesök",
    toolSearch: "Söker i Wikidata", toolCode: "Slår upp felkod", toolTesla: "Läser Teslas servicemanual", toolItem: "Läser Wikidata-post",
    checking: "Jackie kollar sina källor…", genericError: "Något gick fel. Försök igen.", quotaGuest: "Du har använt dina 5 gratisfrågor den här månaden. Logga in för att fortsätta prata med Jackie, med 50 frågor i månaden.", quotaUser: "Du har använt dina 50 frågor den här månaden. Jackie finns här igen nästa månad.",
  },
  de: {
    forWorkshops: "Für Werkstätten", account: "Dein Konto", signOut: "Abmelden", signInToSave: "Anmelden zum Speichern",
    madeForSweden: "Gemacht für Schweden", jackieNew: "Jackie ist neu. Sei nett zu ihr",
    yourSavedCar: "DEIN GESPEICHERTES AUTO", carForChat: "AUTO FÜR DIESEN CHAT", change: "Ändern",
    noCarSaved: "Noch kein Auto gespeichert. Einmal hinzufügen, Jackie merkt es sich.",
    noCarGuest: "Kennzeichen, HSN/TSN angeben oder selbst wählen. Nur für diesen Chat. Nichts wird gespeichert.",
    addCar: "Auto hinzufügen", tellCar: "Erzähl Jackie von deinem Auto", privateDetails: "Registerdaten bleiben privat",
    nextService: (km: string) => `Nächster Service in etwa ${km} km`, estimatedAt: (a: string, b: string) => `Geschätzt bei ${a} km · alle ${b} km`,
    addOdo: "Kilometerstand eingeben", toEstimate: "um den nächsten Service zu schätzen.",
    savedToAccount: "In deinem Konto gespeichert.", notSaved: "Nicht gespeichert. Weg, sobald du einen neuen Chat startest.", removeCar: "Auto entfernen",
    bookVisit: "Termin buchen", myChats: "Meine Chats", newChat: "Neuen Chat starten", loadingChats: "Chats werden geladen…", privateNotSaved: "Privater Chat · nicht gespeichert",
    signInChats: "Anmelden, um Chats zu speichern", chatsError: "Chats konnten nicht geladen oder aktualisiert werden.", tryAgain: "Erneut versuchen",
    noChats: "Noch keine gespeicherten Chats.", deleteChat: "Chat löschen", chatsSaved: "Chats gespeichert", privateChat: "Privater Chat",
    missingTitle: "Diesen Chat gibt es nicht.", missingDeleted: "Er wurde vielleicht gelöscht.", missingSignIn: "Melde dich mit dem Konto an, das ihn gespeichert hat.",
    signIn: "Anmelden", startNew: "Neuen Chat starten", opening: "Chat wird geöffnet…",
    bottom: "Jackie hilft dir, das Problem zu verstehen. Eine echte Werkstatt bestätigt die Reparatur, bevor du etwas zahlst.",
    about: "Über Jackie", privacy: "Datenschutz", gotIt: "Verstanden",
    privacyTitle: "Deine Daten gehören dir",
    privacyBody: "Ohne Anmeldung wird nichts gespeichert: Auto und Chat verschwinden, wenn du neu startest oder den Tab schließt. Mit Anmeldung liegen Auto und Chats in deinem Konto, nur für dich sichtbar, und du kannst sie jederzeit löschen. Registerdaten aus dem Kennzeichen werden nie angezeigt.",
    aboutTitle: "Schön dich kennenzulernen. Ich bin Jackie.",
    aboutBody: "Ich erkläre Autoprobleme in einfachen Worten und verlinke jede Quelle. Ich nutze Wikidata, die offizielle OBD-II-Fehlercodeliste, Teslas Model 3 Servicehandbuch, das KBA-Register für HSN/TSN und Live-Abfragen schwedischer Kennzeichen. Ich spreche Englisch, Schwedisch und Deutsch.",
    heroTitle: "Beichte die Sünden deines Autos.", heroSub: "Jackie hört zu, ohne zu urteilen, und erklärt es dann einfach, mit Dringlichkeit und grobem Preis.",
    whyTitle: "Autogespräche setzen voraus, dass alle 'Mechanisch' sprechen. Die meisten tun das nicht und sollten es auch nicht müssen.",
    why1: "der privaten Autos in Schweden sind auf Frauen zugelassen, trotzdem setzt die Werkstattkommunikation meist tiefes Technikwissen voraus.",
    why2: "Warnleuchten, HSN/TSN-Codes, Serviceintervalle. Die Branche spricht in Codes. Jackie übersetzt sie in einfache Worte, mit Quellen.",
    starters: ["P0301 ist gerade aufgetaucht. Soll ich in Panik geraten?", "Das Geräusch verschwindet, sobald der Mechaniker einsteigt", "Ich habe der Warnleuchte einen Namen gegeben. Wir leben jetzt zusammen."],
    tryLabel: "Probier:", placeholder: "Beschreib das Geräusch, die Leuchte oder das Teil…",
    savedToChats: "In Meine Chats gespeichert", whatsNext: "WIE ES WEITERGEHT", getLooked: "Prüfen lassen:", about_: "Etwa", to: "bis",
    vatNote: "inkl. MwSt. · grobe Schätzung, kein Angebot", requestVisit: "Werkstatttermin anfragen",
    toolSearch: "Suche in Wikidata", toolCode: "Fehlercode wird nachgeschlagen", toolTesla: "Lese Tesla-Servicehandbuch", toolItem: "Lese Wikidata-Eintrag",
    checking: "Jackie prüft ihre Quellen…", genericError: "Etwas ist schiefgelaufen. Bitte versuch es erneut.", quotaGuest: "Du hast deine 5 kostenlosen Fragen diesen Monat genutzt. Melde dich an, um mit Jackie weiterzusprechen, mit 50 Fragen pro Monat.", quotaUser: "Du hast deine 50 Fragen diesen Monat genutzt. Jackie ist nächsten Monat wieder für dich da.",
  },
};

export function useT() {
  const lang = useLang();
  return { lang, t: dict[lang] };
}
