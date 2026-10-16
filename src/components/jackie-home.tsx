import { useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, CalendarPlus, Car, ChevronDown, Gauge, Globe2, HelpCircle, LockKeyhole, LogOut, MessageSquare, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GarageDialog } from "@/components/garage-dialog";
import { JackieChat } from "@/components/jackie-chat";
import { BookingPanel, type VisitCard } from "@/components/request-visit-dialog";
import { WhyNote } from "@/components/why-note";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { nextService, type Vehicle } from "@/lib/vehicles";
import jackie from "@/assets/jackie.jpg";
import { LANGS, setLang, useT } from "@/lib/i18n";

const fmt = (n: number) => n.toLocaleString("sv-SE");
export type WorkshopBrand = { id: string; name: string; city: string; slug: string; accent: string; logo: string; greeting: string };
type ChatRow = { id: string; title: string; updated_at: string };

function readGuestChat(): UIMessage[] {
  try {
    const raw = sessionStorage.getItem("autojackie.guestChat");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function readGuestVehicle(): Vehicle | null {
  try {
    const raw = sessionStorage.getItem("autojackie.guestVehicle");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function titleFrom(messages: UIMessage[]) {
  const first = messages.find(m => m.role === "user")?.parts.find(p => p.type === "text");
  const t = first && "text" in first ? first.text.trim() : "New chat";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || "New chat";
}

export function JackieHome({ chatId, workshop }: { chatId?: string; workshop?: WorkshopBrand }) {
  const navigate = useNavigate();
  const { user, ready } = useSessionUser();
  const { t, lang } = useT();
  const [vehicle, setVehicle] = useState<Vehicle | null>(() => (chatId ? null : readGuestVehicle()));
  const [garageOpen, setGarageOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState(false);
  const [newChatKey, setNewChatKey] = useState(0);
  const [info, setInfo] = useState<"about" | "privacy" | null>(null);
  const [initial, setInitial] = useState<UIMessage[] | null>(chatId ? null : readGuestChat());
  const [missing, setMissing] = useState(false);

  // Older versions kept the car in this browser; guests are now private by default.
  useEffect(() => { try { localStorage.removeItem("autojackie.vehicle"); } catch { /* ignore */ } }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) { setVehicle(null); return; }
    supabase.from("saved_vehicles").select("vehicle").maybeSingle().then(({ data }) => { if (data) setVehicle(data.vehicle as unknown as Vehicle); });
  }, [ready, user?.id]);

  useEffect(() => {
    if (!chatId || !ready) return;
    if (!user) { setMissing(true); return; }
    supabase.from("chats").select("messages").eq("id", chatId).maybeSingle().then(({ data }) => {
      if (!data) return setMissing(true);
      setInitial(data.messages as unknown as UIMessage[]);
    });
  }, [chatId, ready, user?.id]);

  // After a guest signs in, keep their conversation: save it to the account and open it.
  useEffect(() => {
    if (!ready || !user || chatId) return;
    const draft = readGuestChat();
    if (draft.length === 0) return;
    void (async () => {
      const payload = { messages: draft as unknown as Json, title: titleFrom(draft), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("chats").insert({ ...payload, user_id: user.id }).select("id").single();
      if (error || !data) return console.error("Couldn't save chat", error);
      try { sessionStorage.removeItem("autojackie.guestChat"); } catch { /* ignore */ }
      navigate({ to: "/c/$chatId", params: { chatId: data.id }, replace: true });
    })();
  }, [ready, user?.id, chatId]);

  const loadChats = useCallback(async () => {
    if (!user) return;
    setChatsLoading(true);
    const { data, error } = await supabase.from("chats").select("id,title,updated_at").order("updated_at", { ascending: false }).limit(50);
    setChatsError(!!error);
    if (!error) setChats(data ?? []);
    setChatsLoading(false);
  }, [user?.id]);
  useEffect(() => {
    if (!ready) return;
    if (user) { void loadChats(); }
    else { setChats([]); setChatsLoading(false); setChatsError(false); }
  }, [ready, loadChats]);

  const saveVehicle = async (v: Vehicle) => {
    setVehicle(v);
    if (user) await supabase.from("saved_vehicles").upsert({ user_id: user.id, vehicle: v as unknown as Json, updated_at: new Date().toISOString() });
    else try { sessionStorage.setItem("autojackie.guestVehicle", JSON.stringify(v)); } catch { /* ignore */ }
  };
  const forgetVehicle = async () => {
    setVehicle(null);
    try { sessionStorage.removeItem("autojackie.guestVehicle"); } catch { /* ignore */ }
    if (user) await supabase.from("saved_vehicles").delete().eq("user_id", user.id);
  };

  const shopChatId = useRef<string | null>(null);
  const onTurnFinished = useCallback(async (messages: UIMessage[]) => {
    if (!user || messages.length === 0) return;
    const payload = { messages: messages as unknown as Json, title: titleFrom(messages), updated_at: new Date().toISOString() };
    if (chatId) { await supabase.from("chats").update(payload).eq("id", chatId); await loadChats(); return; }
    if (workshop && shopChatId.current) { await supabase.from("chats").update(payload).eq("id", shopChatId.current); await loadChats(); return; }
    const { data, error } = await supabase.from("chats").insert({ ...payload, user_id: user.id }).select("id").single();
    if (error || !data) return console.error("Couldn't save chat", error);
    if (workshop) { shopChatId.current = data.id; await loadChats(); return; }
    navigate({ to: "/c/$chatId", params: { chatId: data.id }, replace: true });
  }, [user?.id, chatId, loadChats, workshop?.id]);

  const onReset = () => {
    if (!user) setVehicle(null);
    shopChatId.current = null;
    if (chatId) navigate({ to: "/" });
    else setNewChatKey(k => k + 1);
  };

  const deleteChat = async (id: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) { setChatsError(true); return; }
    setChats(c => c.filter(x => x.id !== id));
    if (id === chatId) navigate({ to: "/" });
  };

  const signOut = async () => { await supabase.auth.signOut(); setVehicle(null); navigate({ to: "/", replace: true }); };
  const service = vehicle ? nextService(vehicle) : null;
  const [directBooking, setDirectBooking] = useState<VisitCard | null>(null);

  return <div className="app-frame" style={workshop?.accent ? { ["--primary" as string]: workshop.accent } : undefined}>
    <header className="site-header">
      <Link to="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span></Link>
      <nav aria-label="Main navigation">
        {workshop ? <span className="shop-badge">{workshop.logo && <img src={workshop.logo} alt="" className="shop-logo"/>}<span>{workshop.name}</span></span> : <span className="market-label"><span className="swedish-flag"/>{t.madeForSweden}</span>}
        <Button onClick={() => setDirectBooking({ issue: "" })}><CalendarPlus/> {t.bookVisit}</Button>
        {!workshop && <Button variant="ghost" asChild className="workshop-link"><Link to="/workshop">{t.forWorkshops} <ArrowUpRight/></Link></Button>}
        {ready && (user ? <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t.account}><UserRound/></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="account-email">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onSelect={signOut}><LogOut/> {t.signOut}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </> : <Button variant="outline" onClick={() => setSignInOpen(true)}><UserRound/> {t.signInToSave}</Button>)}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="language-control" aria-label="Language"><Globe2/> {LANGS.find(l => l.code === lang)?.short} <ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{LANGS.map(l => <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} aria-current={l.code === lang ? "true" : undefined}>{l.short} · {l.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
      </nav>
    </header>

    <main className="workspace">
      <aside className="jackie-panel">
        <div className="portrait-wrap compact"><img src={jackie} alt="Jackie, a mechanic in an orange work jacket" width={1024} height={1024}/><span className="portrait-label">{t.jackieNew}</span></div>

        <section className="vehicle-card" aria-label="Your car">
          <div className="vehicle-head"><span className="eyebrow">{user ? t.yourSavedCar : t.carForChat}</span>{vehicle && <Button variant="ghost" size="sm" onClick={() => setGarageOpen(true)}><Pencil/> {t.change}</Button>}</div>
          {!vehicle ? <div className="vehicle-empty" title={user ? t.noCarSaved : t.noCarGuest}><Car/>
            <Button variant="ghost" size="sm" onClick={() => setGarageOpen(true)}><Plus/> {user ? t.addCar : t.tellCar}</Button>
          </div> : <>
            <h2 className="vehicle-name">{vehicle.confidential ? <span className="plate-chip"><span className="plate-eu">S</span>{vehicle.label}</span> : vehicle.label}</h2>
            <p className="vehicle-spec">{vehicle.confidential ? <><LockKeyhole/> {t.privateDetails}</> : vehicle.description}</p>
            <div className="service-box"><Gauge/>{service ? <div><strong>{t.nextService(fmt(service.remaining))}</strong><span>{t.estimatedAt(fmt(service.dueAt), fmt(vehicle.serviceKm))}</span><div className="service-bar"><span style={{ width: `${Math.round(service.progress * 100)}%` }}/></div></div> : <div><strong>{t.addOdo}</strong><span>{t.toEstimate}</span></div>}</div>
            <p className="estimate-note">{user ? t.savedToAccount : t.notSaved} <button type="button" className="text-link" onClick={forgetVehicle}>{t.removeCar}</button></p>
          </>}
        </section>

        <section className="chat-history" aria-label="Chat history">
          <div className="history-heading"><h2>{t.myChats}</h2><Button variant="ghost" size="icon" onClick={onReset} aria-label={t.newChat} title={t.newChat}><Plus/></Button></div>
          {!ready || chatsLoading ? <p className="history-note" role="status">{t.loadingChats}</p>
            : !user ? <div className="history-guest"><p className="history-note">{t.privateNotSaved}</p><Button variant="outline" size="sm" onClick={() => setSignInOpen(true)}><UserRound/> {t.signInChats}</Button></div>
            : chatsError ? <div><p className="history-note" role="alert">{t.chatsError}</p><Button variant="ghost" size="sm" onClick={() => void loadChats()}>{t.tryAgain}</Button></div>
            : chats.length === 0 ? <p className="history-note">{t.noChats}</p>
            : <ul className="history-list">{chats.map(c => <li key={c.id} className={c.id === chatId ? "active" : undefined}>
              <Link to="/c/$chatId" params={{ chatId: c.id }} className="history-item" aria-current={c.id === chatId ? "page" : undefined} title={c.title}><MessageSquare/><span className="history-item-copy"><span>{c.title}</span><time dateTime={c.updated_at}>{new Date(c.updated_at).toLocaleString(lang === "en" ? "en-GB" : lang, { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span></Link>
              <Button variant="ghost" size="icon" className="history-delete" aria-label={`${t.deleteChat}: ${c.title}`} title={t.deleteChat} onClick={() => deleteChat(c.id)}><Trash2/></Button>
            </li>)}</ul>}
        </section>
      </aside>

      <section className="assistant-area" aria-label="Chat with Jackie">
        <div className="assistant-top">{workshop?.greeting ? <span className="shop-greeting">{workshop.greeting}</span> : <span/>}<div className="assistant-top-right"><span className="preview-badge">{user ? t.chatsSaved : t.privateChat}</span><WhyNote id="driver" overlay autoOpen={false} label={t.whyChip} title={t.whyTitle} pitch={t.whyPitch} stats={[
          { value: "36%", text: t.why1, source: { label: "Trafikanalys, 2022", url: "https://www.trafa.se/globalassets/statistik/vagtrafik/fordon/2023/fordon-i-lan-och-kommuner-2022.pdf" } },
          { value: "P0301?", text: t.why2 },
        ]}/></div></div>
        {directBooking && <BookingPanel card={directBooking} vehicleLabel={vehicle && !vehicle.confidential ? vehicle.label : ""} onClose={() => setDirectBooking(null)} workshopId={workshop?.id}/>}
        <div className="chat-slot" hidden={!!directBooking}>
        {missing ? <div className="chat-empty"><h1>{t.missingTitle}</h1><p>{user ? t.missingDeleted : t.missingSignIn}</p><div className="starter-grid">{!user && <Button onClick={() => setSignInOpen(true)}>{t.signIn}</Button>}<Button variant="outline" asChild><Link to="/">{t.startNew}</Link></Button></div></div>
          : initial === null ? <div className="chat-empty"><p>{t.opening}</p></div>
          : <JackieChat key={chatId ?? `new-${newChatKey}`} chatId={chatId} initialMessages={initial} vehicle={vehicle} pending={null} onPendingSent={() => {}} onTurnFinished={onTurnFinished} onReset={onReset} saving={!!user && !!chatId} workshopId={workshop?.id} onSignIn={() => setSignInOpen(true)} onBook={setDirectBooking}/>}
        </div>
        <div className="assistant-bottom"><span className="swedish-flag"/><span>{t.bottom}</span><Button variant="ghost" size="icon" aria-label={t.about} onClick={() => setInfo("about")}><HelpCircle/></Button></div>
      </section>
    </main>

    <footer className="site-footer"><span>© {new Date().getFullYear()} AutoJackie</span><div><Button variant="link" onClick={() => setInfo("privacy")}>{t.privacy}</Button><Button variant="link" onClick={() => setInfo("about")}>{t.about} <ArrowUpRight/></Button></div></footer>

    <GarageDialog key={garageOpen ? "open" : "closed"} open={garageOpen} onOpenChange={setGarageOpen} vehicle={vehicle} onSave={saveVehicle} signedIn={!!user}/>
    <SignInDialog open={signInOpen} onOpenChange={setSignInOpen}/>
    <Dialog open={info !== null} onOpenChange={open => { if (!open) setInfo(null); }}><DialogContent><DialogHeader><DialogTitle>{info === "privacy" ? t.privacyTitle : t.aboutTitle}</DialogTitle><DialogDescription>{info === "privacy" ? t.privacyBody : t.aboutBody}</DialogDescription></DialogHeader><Button onClick={() => setInfo(null)}>{t.gotIt}</Button></DialogContent></Dialog>
  </div>;
}
