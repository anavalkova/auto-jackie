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

export const getLang = (): Lang => current;
/** Swedish drivers read odometers in mil (1 mil = 10 km); German drivers in km. */
export const odoUnitFor = (lang: Lang): "mil" | "km" => (lang === "de" ? "km" : "mil");

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
    bk: { chatPrivate: "Your chat stays private.", title: "Book a workshop visit", back: "Back to chat", s1: "What", s2: "When", s3: "You", next: "Next", prev: "Back", workshop: "Workshop", job: "What needs doing?", other: "Something else", describe: "Describe it briefly", describePh: "E.g. rattle from the boot", fromChat: "From your chat with Jackie", day: "Pick a day", time: "Drop-off time", picked: "Your times (up to %n)", noPick: "Tap a time. You can pick up to %n so the workshop can choose.", remove: "Remove", noDays: "No free times right now. Try another workshop.", name: "Your name", phone: "Phone", confirmBy: "Confirm by", email: "Email", msg: "Anything else? (optional)", msgPh: "How the car feels, when suits you…", send: "Send request", sending: "Sending…", error: "Couldn't send it. Please try again.", signInNeeded: "Sign in so the workshop can reach you.", signIn: "Sign in to book", noShops: "No partner workshops have joined yet.", sentTitle: "Request sent. You're in good hands", sentBody: "The workshop picks one of your times and confirms by %c.", done: "Back to chat", shared: "The workshop gets the job, Jackie's rough price and your contact details. It sees trends across requests (like which jobs are asked for), never your chat itself.", hJob: "Jackie picked this from what you talked about. Not right? Choose another one.", jackiePick: "Suggested by Jackie", hTimes: "Pick the day and time you want to drop the car off. The workshop confirms it.", hConfirm: "How the workshop confirms your time. You only hear from them, never from us.", hWorkshop: "This is the workshop whose Jackie you are talking to.", chatTip: "Tip: you can also just ask Jackie in the chat to book for you." },
    bookedTitle: "Visit requested", bookedBody: "%w will pick one of your times and confirm.",
    forWorkshops: "For workshops", account: "Your account", signOut: "Sign out", signInToSave: "Sign in to save",
    madeForSweden: "Made for Sweden", jackieNew: "Jackie is new. Go easy on her",
    yourSavedCar: "YOUR SAVED CAR", carForChat: "CAR FOR THIS CHAT", change: "Change",
    noCarSaved: "No car saved yet. Add it once and Jackie remembers it.",
    noCarGuest: "Share a plate, HSN/TSN or pick it by hand. Used for this chat only. Nothing is saved.",
    addCar: "Add your car", tellCar: "Tell Jackie about your car", privateDetails: "Registry details kept private",
    nextService: (dist: string) => `Next service in about ${dist} mil`, estimatedAt: (a: string, b: string) => `Estimated at ${a} mil · every ${b} mil`,
    addOdo: "Add your odometer reading (mil)", toEstimate: "to estimate the next service.",
    savedToAccount: "Saved to your account.", notSaved: "Not saved. Gone when you start a new chat.", removeCar: "Remove car",
    bookVisit: "Book a visit", myChats: "My chats", newChat: "Start a new chat", loadingChats: "Loading chats…", privateNotSaved: "Private chat · not saved",
    signInChats: "Sign in to save chats", chatsError: "Couldn't load or update your chats.", tryAgain: "Try again",
    noChats: "No saved chats yet.", deleteChat: "Delete chat",
    missingTitle: "This chat isn't here.", missingDeleted: "It may have been deleted.", missingSignIn: "Sign in with the account that saved it to see it.",
    signIn: "Sign in", startNew: "Start a new chat", opening: "Opening your chat…",
    bottom: "Jackie helps you understand the problem. A real workshop confirms the fix before you pay for anything.",
    about: "About Jackie", privacy: "Privacy", gotIt: "Got it",
    privacyTitle: "Your details stay yours",
    privacyBody: "Without signing in, nothing is saved: your car and chat disappear when you start over or close the tab. If you sign in, your car and chats are stored in your account, visible only to you, and you can delete them any time. Registry details from a plate are never shown on screen.",
    aboutTitle: "Nice to meet you. I'm Jackie.",
    aboutBody: "I explain car problems in plain words and link every source. I use Wikidata, the official OBD-II fault code list, Tesla's Model 3 service manual, the German KBA register for HSN/TSN and live Swedish plate lookups. I speak English, Swedish and German.",
    heroTitle: "Confess your car's sins.", heroSub: "Jackie listens without judging, explains in plain words and gives an indicative quote for your booking.",
    whyTitle: "Car talk assumes everyone speaks 'mechanic'. Most drivers don't, and shouldn't have to.",
    whyPitch: "Jackie listens first, then explains the problem in plain words, with a rough price and what to do next. No jargon, no judgment. In English, Swedish and German.",
    whyChip: "Why this exists",
    why1: "of privately owned cars in Sweden are registered to women, yet most workshop communication still assumes deep technical knowledge.",
    why2: "Warning lights, HSN/TSN codes, service intervals. The industry speaks in codes. Jackie translates them into plain words, with sources.",
    starters: ["P0301 just appeared. Should I panic?", "The noise disappears whenever the mechanic gets in", "I named the warning light. We coexist now."],
    tryLabel: "Try:", placeholder: "Describe the noise, light or part you're wondering about…",
    savedToChats: "Saved to My chats", whatsNext: "WHAT'S NEXT", getLooked: "Get it looked at:", about_: "About", to: "to",
    vatNote: "incl. VAT · rough estimate, not a quote", requestVisit: "Request a workshop visit",
    toolSearch: "Searching Wikidata", toolCode: "Looking up fault code", toolTesla: "Reading Tesla service manual", toolItem: "Reading Wikidata record", sourcesUsed: "Checked %n sources", sourcesUsing: "Checking sources…",
    checking: "Jackie is checking her sources…", genericError: "Something went wrong. Please try again.", quotaGuest: "You have used your 5 free questions this month. Sign in to keep talking to Jackie, with 50 questions a month.", quotaUser: "You have used your 50 questions this month. Jackie will be back for you next month.",
    quotaHintGuest: "%n of %m free questions left this month. Sign in for 50 a month.", quotaHintUser: "%n of %m questions left this month.",
    pitch: {
      eyebrow: "FOR WORKSHOPS",
      title: "Your phone can keep ringing. Jackie already answered.",
      sub: "Jackie chats with drivers around the clock, in plain words, in three languages. You wake up to booked jobs instead of missed calls.",
      cta: "Sign in to your workshop", ctaNote: "Invite only. We set you up personally.",
      demoCta: "Explore the demo workshop", demoNote: "Signed in? Open Demo Verkstad in read-only mode and click around freely.",
      demoBanner: "You're viewing Demo Verkstad, a sample workshop with made-up requests so you can explore every tab. It's read-only: nothing you click can change or break it, and it always stays in this pristine state for the next visitor.",
      jackieCaption: "Jackie. Never sleeps, never judges.",
      steps: [
        { t: "A driver vents", d: "2 a.m., strange noise, mild panic." },
        { t: "Jackie sorts it", d: "Likely cause, urgency, a rough price from your own list." },
        { t: "It lands in your inbox", d: "Car, summary, phone number. You both know what to expect." },
        { t: "The booking comes", d: " You just fix the car." },
      ],
      gains: ["Drivers don't speak car. Jackie explains with your know-how.", "Instant answers and easy booking, like drivers now expect.", "Rough quotes from your own price list, so no sticker shock.", "Your parts, methods and strengths shape every answer.", "Every request, booking and value in one place.", "Your brand, in English, Swedish and German."],
      stats: [
        { value: "21%", text: "of calls to workshops go unanswered.", src: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
        { value: "68%", text: "of missed callers never call back.", src: { label: "Auto Service World", url: "https://www.autoserviceworld.com/phone-fails-lead-to-missed-automotive-service-revenue-report/" } },
        { value: "36%", text: "of Swedish private cars belong to women. Few shops speak to them.", src: { label: "Trafikanalys", url: "https://www.trafa.se/vagtrafik/fordon/" } },
      ],
    },
  },
  sv: {
    bk: { chatPrivate: "Din chatt förblir privat.", title: "Boka verkstadsbesök", back: "Tillbaka till chatten", s1: "Vad", s2: "När", s3: "Du", next: "Nästa", prev: "Tillbaka", workshop: "Verkstad", job: "Vad behöver göras?", other: "Något annat", describe: "Beskriv kort", describePh: "T.ex. skrammel från bagageluckan", fromChat: "Från din chatt med Jackie", day: "Välj dag", time: "Lämningstid", picked: "Dina tider (upp till %n)", noPick: "Tryck på en tid. Välj upp till %n så kan verkstaden välja.", remove: "Ta bort", noDays: "Inga lediga tider just nu. Prova en annan verkstad.", name: "Ditt namn", phone: "Telefon", confirmBy: "Bekräfta via", email: "E-post", msg: "Något mer? (valfritt)", msgPh: "Hur bilen känns, när det passar dig…", send: "Skicka förfrågan", sending: "Skickar…", error: "Det gick inte att skicka. Försök igen.", signInNeeded: "Logga in så att verkstaden kan nå dig.", signIn: "Logga in för att boka", noShops: "Inga partnerverkstäder har anslutit än.", sentTitle: "Förfrågan skickad. Du är i goda händer", sentBody: "Verkstaden väljer en av dina tider och bekräftar via %c.", done: "Tillbaka till chatten", shared: "Verkstaden får jobbet, Jackies ungefärliga pris och dina kontaktuppgifter. Den ser trender över förfrågningar (t.ex. vilka jobb som efterfrågas), aldrig själva chatten.", hJob: "Jackie valde detta utifrån det ni pratade om. Stämmer det inte? Välj ett annat.", jackiePick: "Förslag från Jackie", hTimes: "Välj dag och tid när du vill lämna bilen. Verkstaden bekräftar.", hConfirm: "Hur verkstaden bekräftar din tid. Du hör bara från dem, aldrig från oss.", hWorkshop: "Det här är verkstaden vars Jackie du pratar med.", chatTip: "Tips: du kan också be Jackie i chatten att boka åt dig." },
    bookedTitle: "Besök begärt", bookedBody: "%w väljer en av dina tider och bekräftar.",
    forWorkshops: "För verkstäder", account: "Ditt konto", signOut: "Logga ut", signInToSave: "Logga in för att spara",
    madeForSweden: "Gjord för Sverige", jackieNew: "Jackie är ny. Var snäll mot henne",
    yourSavedCar: "DIN SPARADE BIL", carForChat: "BIL FÖR DEN HÄR CHATTEN", change: "Ändra",
    noCarSaved: "Ingen bil sparad än. Lägg till den en gång så minns Jackie den.",
    noCarGuest: "Ange regnummer, HSN/TSN eller välj själv. Används bara i den här chatten. Inget sparas.",
    addCar: "Lägg till din bil", tellCar: "Berätta om din bil", privateDetails: "Registeruppgifter hålls privata",
    nextService: (dist: string) => `Nästa service om cirka ${dist} mil`, estimatedAt: (a: string, b: string) => `Beräknad vid ${a} mil · var ${b} mil`,
    addOdo: "Ange mätarställning (mil)", toEstimate: "för att beräkna nästa service.",
    savedToAccount: "Sparad på ditt konto.", notSaved: "Sparas inte. Försvinner när du startar en ny chatt.", removeCar: "Ta bort bil",
    bookVisit: "Boka besök", myChats: "Mina chattar", newChat: "Starta en ny chatt", loadingChats: "Laddar chattar…", privateNotSaved: "Privat chatt · sparas inte",
    signInChats: "Logga in för att spara chattar", chatsError: "Kunde inte ladda eller uppdatera dina chattar.", tryAgain: "Försök igen",
    noChats: "Inga sparade chattar än.", deleteChat: "Radera chatt",
    missingTitle: "Den här chatten finns inte.", missingDeleted: "Den kan ha raderats.", missingSignIn: "Logga in med kontot som sparade den.",
    signIn: "Logga in", startNew: "Starta en ny chatt", opening: "Öppnar din chatt…",
    bottom: "Jackie hjälper dig förstå problemet. En riktig verkstad bekräftar lagningen innan du betalar något.",
    about: "Om Jackie", privacy: "Integritet", gotIt: "Uppfattat",
    privacyTitle: "Dina uppgifter är dina",
    privacyBody: "Utan inloggning sparas ingenting: bil och chatt försvinner när du börjar om eller stänger fliken. Loggar du in sparas bil och chattar på ditt konto, synliga bara för dig, och du kan radera dem när som helst. Registeruppgifter från regnummer visas aldrig på skärmen.",
    aboutTitle: "Trevligt att träffas. Jag heter Jackie.",
    aboutBody: "Jag förklarar bilproblem med enkla ord och länkar varje källa. Jag använder Wikidata, den officiella OBD-II-listan med felkoder, Teslas servicemanual för Model 3, tyska KBA-registret för HSN/TSN och direktsökning av svenska regnummer. Jag pratar engelska, svenska och tyska.",
    heroTitle: "Bikta din bils synder.", heroSub: "Jackie lyssnar utan att döma, förklarar med enkla ord och ger en ungefärlig offert för din bokning.",
    whyTitle: "Bilprat förutsätter att alla kan 'mekaniska'. De flesta förare kan inte det, och ska inte behöva.",
    whyPitch: "Jackie lyssnar först och förklarar sedan problemet med enkla ord, ett ungefärligt pris och vad du gör härnäst. Utan fackspråk, utan dömande. På engelska, svenska och tyska.",
    whyChip: "Varför finns detta",
    why1: "av privatägda bilar i Sverige är registrerade på kvinnor, ändå förutsätter de flesta verkstäder djup teknisk kunskap.",
    why2: "Varningslampor, HSN/TSN-koder, serviceintervall. Branschen pratar i koder. Jackie översätter till enkla ord, med källor.",
    starters: ["P0301 dök precis upp. Ska jag få panik?", "Ljudet försvinner så fort mekanikern sätter sig i bilen", "Jag har döpt varningslampan. Vi samexisterar nu."],
    tryLabel: "Testa:", placeholder: "Beskriv ljudet, lampan eller delen du undrar över…",
    savedToChats: "Sparad i Mina chattar", whatsNext: "NÄSTA STEG", getLooked: "Låt kolla det:", about_: "Cirka", to: "till",
    vatNote: "inkl. moms · grov uppskattning, ingen offert", requestVisit: "Begär verkstadsbesök",
    toolSearch: "Söker i Wikidata", toolCode: "Slår upp felkod", toolTesla: "Läser Teslas servicemanual", toolItem: "Läser Wikidata-post", sourcesUsed: "Kollade %n källor", sourcesUsing: "Kollar källor…",
    checking: "Jackie kollar sina källor…", genericError: "Något gick fel. Försök igen.", quotaGuest: "Du har använt dina 5 gratisfrågor den här månaden. Logga in för att fortsätta prata med Jackie, med 50 frågor i månaden.", quotaUser: "Du har använt dina 50 frågor den här månaden. Jackie finns här igen nästa månad.",
    quotaHintGuest: "%n av %m gratisfrågor kvar den här månaden. Logga in för 50 i månaden.", quotaHintUser: "%n av %m frågor kvar den här månaden.",
    pitch: {
      eyebrow: "FÖR VERKSTÄDER",
      title: "Din telefon får gärna ringa. Jackie har redan svarat.",
      sub: "Jackie pratar med förare dygnet runt, med enkla ord, på tre språk. Du vaknar till bokade jobb istället för missade samtal.",
      cta: "Logga in på din verkstad", ctaNote: "Endast inbjudan. Vi sätter upp dig personligen.",
      demoCta: "Utforska demoverkstaden", demoNote: "Inloggad? Öppna Demo Verkstad i skrivskyddat läge och klicka runt fritt.",
      demoBanner: "Du tittar på Demo Verkstad, en exempelverkstad med påhittade förfrågningar så att du kan utforska alla flikar. Den är skrivskyddad: inget du klickar på kan ändra eller förstöra den, och den ligger alltid kvar i sitt ursprungsskick för nästa besökare.",
      jackieCaption: "Jackie. Sover aldrig, dömer aldrig.",
      steps: [
        { t: "En förare bikt sig", d: "Klockan två på natten, konstigt ljud, lätt panik." },
        { t: "Jackie redor ut det", d: "Trolig orsak, hur bråttom det är och ett ungefärligt pris från din egen lista." },
        { t: "Det landar i din inkorg", d: "Bil, sammanfattning, telefonnummer. Ingen telefonjakt." },
        { t: "Du ringer, de bokar", d: "De känner redan till priset. Du lagar bara bilen." },
      ],
      gains: ["Bilister kan inte bilspråk. Jackie förklarar, med din kunskap.", "Direkta svar och enkel bokning, som bilister förväntar sig idag.", "Ungefärliga priser från din egen prislista, inga chockbesked.", "Dina delar, metoder och styrkor formar varje svar.", "Alla förfrågningar, bokningar och värden på ett ställe.", "Ditt varumärke, på engelska, svenska och tyska."],
      stats: [
        { value: "21%", text: "av samtalen till verkstäder besvaras aldrig.", src: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
        { value: "68%", text: "av missade samtal ringer aldrig tillbaka.", src: { label: "Auto Service World", url: "https://www.autoserviceworld.com/phone-fails-lead-to-missed-automotive-service-revenue-report/" } },
        { value: "36%", text: "av svenska privatbilar ägs av kvinnor. Få verkstäder pratar med dem.", src: { label: "Trafikanalys", url: "https://www.trafa.se/vagtrafik/fordon/" } },
      ],
    },
  },
  de: {
    bk: { chatPrivate: "Dein Chat bleibt privat.", title: "Werkstatttermin buchen", back: "Zurück zum Chat", s1: "Was", s2: "Wann", s3: "Du", next: "Weiter", prev: "Zurück", workshop: "Werkstatt", job: "Was muss gemacht werden?", other: "Etwas anderes", describe: "Kurz beschreiben", describePh: "Z. B. Klappern im Kofferraum", fromChat: "Aus deinem Chat mit Jackie", day: "Tag wählen", time: "Abgabezeit", picked: "Deine Zeiten (bis zu %n)", noPick: "Tippe auf eine Zeit. Bis zu %n, damit die Werkstatt wählen kann.", remove: "Entfernen", noDays: "Gerade keine freien Zeiten. Versuch eine andere Werkstatt.", name: "Dein Name", phone: "Telefon", confirmBy: "Bestätigung per", email: "E-Mail", msg: "Noch etwas? (optional)", msgPh: "Wie sich das Auto anfühlt, wann es dir passt…", send: "Anfrage senden", sending: "Wird gesendet…", error: "Senden fehlgeschlagen. Bitte versuch es noch einmal.", signInNeeded: "Melde dich an, damit die Werkstatt dich erreicht.", signIn: "Anmelden zum Buchen", noShops: "Noch keine Partnerwerkstätten.", sentTitle: "Anfrage gesendet. Du bist in guten Händen", sentBody: "Die Werkstatt wählt eine deiner Zeiten und bestätigt per %c.", done: "Zurück zum Chat", shared: "Die Werkstatt bekommt den Auftrag, Jackies grobe Preisschätzung und deine Kontaktdaten. Sie sieht Trends über Anfragen (z. B. welche Arbeiten gefragt sind), nie deinen Chat selbst.", hJob: "Jackie hat das aus eurem Gespräch ausgewählt. Passt es nicht? Wähle etwas anderes.", jackiePick: "Vorschlag von Jackie", hTimes: "Wähle Tag und Uhrzeit für die Abgabe. Die Werkstatt bestätigt sie.", hConfirm: "So bestätigt die Werkstatt deinen Termin. Du hörst nur von ihr, nie von uns.", hWorkshop: "Das ist die Werkstatt, mit deren Jackie du sprichst.", chatTip: "Tipp: Du kannst Jackie auch im Chat bitten, für dich zu buchen." },
    bookedTitle: "Termin angefragt", bookedBody: "%w wählt eine deiner Zeiten und bestätigt.",
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
    noChats: "Noch keine gespeicherten Chats.", deleteChat: "Chat löschen",
    missingTitle: "Diesen Chat gibt es nicht.", missingDeleted: "Er wurde vielleicht gelöscht.", missingSignIn: "Melde dich mit dem Konto an, das ihn gespeichert hat.",
    signIn: "Anmelden", startNew: "Neuen Chat starten", opening: "Chat wird geöffnet…",
    bottom: "Jackie hilft dir, das Problem zu verstehen. Eine echte Werkstatt bestätigt die Reparatur, bevor du etwas zahlst.",
    about: "Über Jackie", privacy: "Datenschutz", gotIt: "Verstanden",
    privacyTitle: "Deine Daten gehören dir",
    privacyBody: "Ohne Anmeldung wird nichts gespeichert: Auto und Chat verschwinden, wenn du neu startest oder den Tab schließt. Mit Anmeldung liegen Auto und Chats in deinem Konto, nur für dich sichtbar, und du kannst sie jederzeit löschen. Registerdaten aus dem Kennzeichen werden nie angezeigt.",
    aboutTitle: "Schön dich kennenzulernen. Ich bin Jackie.",
    aboutBody: "Ich erkläre Autoprobleme in einfachen Worten und verlinke jede Quelle. Ich nutze Wikidata, die offizielle OBD-II-Fehlercodeliste, Teslas Model 3 Servicehandbuch, das KBA-Register für HSN/TSN und Live-Abfragen schwedischer Kennzeichen. Ich spreche Englisch, Schwedisch und Deutsch.",
    heroTitle: "Beichte die Sünden deines Autos.", heroSub: "Jackie hört zu, ohne zu urteilen, erklärt es in einfachen Worten und gibt dir ein unverbindliches Angebot für deine Buchung.",
    whyTitle: "Autogespräche setzen voraus, dass alle 'Mechanisch' sprechen. Die meisten tun das nicht und sollten es auch nicht müssen.",
    whyPitch: "Jackie hört erst zu und erklärt das Problem dann in einfachen Worten, mit grobem Preis und dem nächsten Schritt. Ohne Fachjargon, ohne Bewertung. Auf Englisch, Schwedisch und Deutsch.",
    whyChip: "Warum gibt es das",
    why1: "der privaten Autos in Schweden sind auf Frauen zugelassen, trotzdem setzt die Werkstattkommunikation meist tiefes Technikwissen voraus.",
    why2: "Warnleuchten, HSN/TSN-Codes, Serviceintervalle. Die Branche spricht in Codes. Jackie übersetzt sie in einfache Worte, mit Quellen.",
    starters: ["P0301 ist gerade aufgetaucht. Soll ich in Panik geraten?", "Das Geräusch verschwindet, sobald der Mechaniker einsteigt", "Ich habe der Warnleuchte einen Namen gegeben. Wir leben jetzt zusammen."],
    tryLabel: "Probier:", placeholder: "Beschreib das Geräusch, die Leuchte oder das Teil…",
    savedToChats: "In Meine Chats gespeichert", whatsNext: "WIE ES WEITERGEHT", getLooked: "Prüfen lassen:", about_: "Etwa", to: "bis",
    vatNote: "inkl. MwSt. · grobe Schätzung, kein Angebot", requestVisit: "Werkstatttermin anfragen",
    toolSearch: "Suche in Wikidata", toolCode: "Fehlercode wird nachgeschlagen", toolTesla: "Lese Tesla-Servicehandbuch", toolItem: "Lese Wikidata-Eintrag", sourcesUsed: "%n Quellen geprüft", sourcesUsing: "Prüfe Quellen…",
    checking: "Jackie prüft ihre Quellen…", genericError: "Etwas ist schiefgelaufen. Bitte versuch es erneut.", quotaGuest: "Du hast deine 5 kostenlosen Fragen diesen Monat genutzt. Melde dich an, um mit Jackie weiterzusprechen, mit 50 Fragen pro Monat.", quotaUser: "Du hast deine 50 Fragen diesen Monat genutzt. Jackie ist nächsten Monat wieder für dich da.",
    quotaHintGuest: "%n von %m kostenlosen Fragen diesen Monat übrig. Melde dich an für 50 pro Monat.", quotaHintUser: "%n von %m Fragen diesen Monat übrig.",
    pitch: {
      eyebrow: "FÜR WERKSTÄTTEN",
      title: "Dein Telefon darf weiter klingeln. Jackie hat schon abgenommen.",
      sub: "Jackie spricht rund um die Uhr mit Fahrern, in einfachen Worten, in drei Sprachen. Du wachst mit gebuchten Aufträgen auf statt mit verpassten Anrufen.",
      cta: "In deine Werkstatt einloggen", ctaNote: "Nur auf Einladung. Wir richten alles persönlich ein.",
      demoCta: "Demo-Werkstatt entdecken", demoNote: "Eingeloggt? Öffne die Demo Verkstad im schreibgeschützten Modus und klick dich durch.",
      demoBanner: "Du siehst die Demo Verkstad, eine Beispielwerkstatt mit erfundenen Anfragen, damit du alle Bereiche erkunden kannst. Sie ist schreibgeschützt: Nichts, was du anklickst, kann sie verändern, und sie bleibt immer im Originalzustand für den nächsten Besucher.",
      jackieCaption: "Jackie. Schläft nie, urteilt nie.",
      steps: [
        { t: "Ein Fahrer beichtet", d: "2 Uhr nachts, komisches Geräusch, leichte Panik." },
        { t: "Jackie sortiert es", d: "Wahrscheinliche Ursache, Dringlichkeit, grober Preis aus deiner eigenen Liste." },
        { t: "Es landet in deinem Posteingang", d: "Auto, Zusammenfassung, Telefonnummer. Kein Telefon-Ping-Pong." },
        { t: "Du rufst an, sie buchen", d: "Sie kennen den Preis schon. Du reparierst nur das Auto." },
      ],
      gains: ["Fahrer sprechen kein Auto. Jackie erklärt es, mit deinem Know-how.", "Sofortige Antworten und einfache Buchung, wie Fahrer es heute erwarten.", "Grobe Preise aus deiner eigenen Preisliste, keine bösen Überraschungen.", "Deine Teile, Methoden und Stärken prägen jede Antwort.", "Alle Anfragen, Buchungen und Werte an einem Ort.", "Deine Marke, auf Englisch, Schwedisch und Deutsch."],
      stats: [
        { value: "21%", text: "der Anrufe bei Werkstätten bleiben unbeantwortet.", src: { label: "Marchex", url: "https://www.marchex.com/up-to-21-percent-of-automotive-service-customer-calls-go-unanswered-creating-significant-revenue-leakage/" } },
        { value: "68%", text: "der verpassten Anrufer rufen nie zurück.", src: { label: "Auto Service World", url: "https://www.autoserviceworld.com/phone-fails-lead-to-missed-automotive-service-revenue-report/" } },
        { value: "36%", text: "der schwedischen Privatautos gehören Frauen. Wenige Werkstätten sprechen sie an.", src: { label: "Trafikanalys", url: "https://www.trafa.se/vagtrafik/fordon/" } },
      ],
    },
  },
};

export function useT() {
  const lang = useLang();
  return { lang, t: dict[lang] };
}
