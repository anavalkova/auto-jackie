import { useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, CalendarPlus, Car, ChevronDown, ChevronLeft, ChevronRight, Globe2, LockKeyhole, LogOut, MessageSquare, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GarageDialog } from "@/components/garage-dialog";
import { JackieChat } from "@/components/jackie-chat";
import { BookingPanel, Tip, type VisitCard } from "@/components/request-visit-dialog";
import { WhyNote } from "@/components/why-note";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { isPrivateVehicle, type Vehicle } from "@/lib/vehicles";
import { CHAT_HISTORY_PAGE_SIZE, chatHistoryRange } from "@/lib/chat-history";
import { tr } from "@/lib/tr";
import jackie from "@/assets/jackie.jpg";
import { LANGS, setLang, useT } from "@/lib/i18n";

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
  const [chatEmpty, setChatEmpty] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyCount, setHistoryCount] = useState(0);

  // Older versions kept the car in this browser; guests are now private by default.
  useEffect(() => { try { localStorage.removeItem("autojackie.vehicle"); } catch { /* ignore */ } }, []);

  // Right after sign-in, workshop members land on their own Jackie's page instead of the generic one.
  useEffect(() => {
    if (workshop) return;
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;
      const { data: m } = await supabase.from("workshop_members").select("workshops(slug)").eq("user_id", session.user.id).limit(1).maybeSingle();
      const slug = (m?.workshops as { slug?: string } | null)?.slug;
      if (slug) navigate({ to: "/w/$slug", params: { slug } });
    });
    return () => data.subscription.unsubscribe();
  }, [workshop, navigate]);

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
    const { from, to } = chatHistoryRange(historyPage);
    const { data, error, count } = await supabase.from("chats").select("id,title,updated_at", { count: "exact" }).order("updated_at", { ascending: false }).order("id").range(from, to);
    setChatsError(!!error);
    if (!error) {
      setChats(data ?? []);
      setHistoryCount(count ?? 0);
      const lastPage = Math.max(0, Math.ceil((count ?? 0) / CHAT_HISTORY_PAGE_SIZE) - 1);
      if (historyPage > lastPage) setHistoryPage(lastPage);
    }
    setChatsLoading(false);
  }, [user?.id, historyPage]);
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

  const isFreshChat = !chatId && chatEmpty;
  const onReset = () => {
    if (!user) setVehicle(null);
    shopChatId.current = null;
    if (chatId) navigate({ to: "/" });
    else setNewChatKey(k => k + 1);
  };

  const deleteChat = async (id: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", id);
    if (error) { setChatsError(true); return; }
    await loadChats();
    if (id === chatId) navigate({ to: "/" });
  };

  const signOut = async () => { await supabase.auth.signOut(); setVehicle(null); navigate({ to: "/", replace: true }); };
  const [directBooking, setDirectBooking] = useState<VisitCard | null>(null);

  return <div className="app-frame" style={workshop?.accent ? { ["--primary" as string]: workshop.accent } : undefined}>
    <header className="site-header">
      {workshop ? <div className="tenant-brand"><div className="tenant-brand-name">{/^data:image\/(webp|png|jpeg);base64,/.test(workshop.logo) && <img src={workshop.logo} alt=""/>}<strong>{workshop.name}</strong></div><Link to="/" className="tenant-brand-credit">AutoJackie</Link></div> : <Link to="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span></Link>}
      <nav aria-label="Main navigation">
        {(!workshop || user) && <Button variant="ghost" asChild className="workshop-link"><Link to="/workshop">{t.forWorkshops} <ArrowUpRight/></Link></Button>}
        <span className="nav-divider" aria-hidden="true"/>
        {ready && (user ? <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="nav-control nav-icon" aria-label={t.account}><UserRound/></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="account-email">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onSelect={signOut}><LogOut/> {t.signOut}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </> : <Button variant="outline" className="nav-control" onClick={() => setSignInOpen(true)}><UserRound/> {t.signInToSave}</Button>)}
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="nav-control language-control" aria-label="Language"><Globe2/> {LANGS.find(l => l.code === lang)?.short} <ChevronDown/></Button></DropdownMenuTrigger><DropdownMenuContent align="end">{LANGS.map(l => <DropdownMenuItem key={l.code} onSelect={() => setLang(l.code)} aria-current={l.code === lang ? "true" : undefined}>{l.short} · {l.label}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
        <Button className="nav-cta" onClick={() => setDirectBooking({ issue: "" })}><CalendarPlus/> {t.bookVisit}</Button>
      </nav>
    </header>

    <main className="workspace">
      <aside className="jackie-panel">
        <div className="portrait-wrap compact"><img src={jackie} alt="Jackie, a mechanic in an orange work jacket" width={1024} height={1024}/><span className="portrait-label field-tip"><Tip text={`${t.aboutTitle} ${t.aboutBody}`}/>{t.jackieNew}</span></div>

        <section className="vehicle-card" aria-label="Your car">
          {!vehicle ? <Button variant="ghost" className="vehicle-empty" title={user ? t.noCarSaved : t.noCarGuest} onClick={() => setGarageOpen(true)}><Car/>
            <span className="vehicle-empty-action">{user ? t.addCar : t.tellCar}</span><ChevronRight className="vehicle-empty-go"/>
          </Button> : <div className="vehicle-context-row"><Button variant="ghost" className="vehicle-context-button" onClick={() => setGarageOpen(true)}>{isPrivateVehicle(vehicle) ? <LockKeyhole/> : <Car/>}<span>{isPrivateVehicle(vehicle) ? tr("Car context added") : vehicle.label}</span><ChevronRight/></Button><Button variant="ghost" size="icon" title={t.removeCar} aria-label={t.removeCar} onClick={forgetVehicle}><Trash2/></Button></div>}
        </section>

        <section className="chat-history" aria-label="Chat history">
          <div className="history-heading"><h2 className="history-desktop-title">{t.myChats}</h2><Button variant="ghost" className="history-mobile-toggle" aria-expanded={historyOpen} aria-controls="driver-chat-history" onClick={() => setHistoryOpen(open => !open)}><MessageSquare/>{t.myChats}<ChevronDown className={historyOpen ? "history-chevron-open" : undefined}/></Button><Button variant="ghost" size="icon" onClick={onReset} disabled={isFreshChat} aria-label={t.newChat} title={t.newChat}><Plus/></Button></div>
          <div id="driver-chat-history" className={`history-content${historyOpen ? " is-open" : ""}`}>
          {!ready || chatsLoading ? <p className="history-note" role="status">{t.loadingChats}</p>
            : !user ? <div className="history-guest"><p className="history-note">{t.privateNotSaved}</p><Button variant="outline" size="sm" onClick={() => setSignInOpen(true)}><UserRound/> {t.signInChats}</Button></div>
            : chatsError ? <div><p className="history-note" role="alert">{t.chatsError}</p><Button variant="ghost" size="sm" onClick={() => void loadChats()}>{t.tryAgain}</Button></div>
            : chats.length === 0 ? <p className="history-note">{t.noChats}</p>
            : <ul className="history-list">{chats.map(c => <li key={c.id} className={c.id === chatId ? "active" : undefined}>
              <Link to="/c/$chatId" params={{ chatId: c.id }} className="history-item" aria-current={c.id === chatId ? "page" : undefined} title={c.title}><MessageSquare/><span className="history-item-copy"><span>{c.title}</span><time dateTime={c.updated_at}>{new Date(c.updated_at).toLocaleString(lang === "en" ? "en-GB" : lang, { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span></Link>
              <Button variant="ghost" size="icon" className="history-delete" aria-label={`${t.deleteChat}: ${c.title}`} title={t.deleteChat} onClick={() => deleteChat(c.id)}><Trash2/></Button>
            </li>)}</ul>}
          {user && <div className="history-pager"><Button variant="ghost" size="icon" aria-label={tr("Previous page")} disabled={historyPage === 0 || chatsLoading} onClick={() => setHistoryPage(p => p - 1)}><ChevronLeft/></Button><span>{historyPage + 1} / {Math.max(1, Math.ceil(historyCount / CHAT_HISTORY_PAGE_SIZE))}</span><Button variant="ghost" size="icon" aria-label={tr("Next page")} disabled={(historyPage + 1) * CHAT_HISTORY_PAGE_SIZE >= historyCount || chatsLoading} onClick={() => setHistoryPage(p => p + 1)}><ChevronRight/></Button></div>}
          </div>
        </section>
      </aside>

      <section className="assistant-area" aria-label="Chat with Jackie">
        <div className="assistant-top">{workshop?.greeting ? <span className="shop-greeting">{workshop.greeting}</span> : <span/>}<div className="assistant-top-right"><Button variant="ghost" size="icon" className="assistant-new-chat" onClick={onReset} disabled={isFreshChat} aria-label={t.newChat} title={t.newChat}><Plus/></Button><WhyNote id="driver" overlay autoOpen={false} label={t.whyChip} title={t.whyTitle} pitch={t.whyPitch} stats={[
          { value: "36%", text: t.why1, source: { label: "Trafikanalys, 2022", url: "https://www.trafa.se/globalassets/statistik/vagtrafik/fordon/2023/fordon-i-lan-och-kommuner-2022.pdf" } },
          { value: "P0301?", text: t.why2 },
        ]}/></div></div>
        {directBooking && <BookingPanel card={directBooking} vehicleLabel={vehicle && !isPrivateVehicle(vehicle) ? vehicle.label : ""} onClose={() => setDirectBooking(null)} workshopId={workshop?.id}/>}
        <div className="chat-slot" hidden={!!directBooking}>
        {missing ? <div className="chat-empty"><h1>{t.missingTitle}</h1><p>{user ? t.missingDeleted : t.missingSignIn}</p><div className="starter-grid">{!user && <Button onClick={() => setSignInOpen(true)}>{t.signIn}</Button>}<Button variant="outline" asChild><Link to="/">{t.startNew}</Link></Button></div></div>
          : initial === null ? <div className="chat-empty"><p>{t.opening}</p></div>
          : <JackieChat key={chatId ?? `new-${newChatKey}`} chatId={chatId} initialMessages={initial} vehicle={vehicle} pending={null} onPendingSent={() => {}} onTurnFinished={onTurnFinished} onReset={onReset} saving={!!user && !!chatId} workshopId={workshop?.id} onSignIn={() => setSignInOpen(true)} onBook={setDirectBooking} onEmptyChange={setChatEmpty}/>}
        </div>
        <div className="assistant-bottom"><span className="swedish-flag"/><span><strong>{t.madeForSweden}</strong> · {t.bottom}</span></div>
      </section>
    </main>

    <footer className="site-footer"><span>© {new Date().getFullYear()} AutoJackie</span><div><Button variant="link" onClick={() => setInfo("privacy")}>{t.privacy}</Button><Button variant="link" onClick={() => setInfo("about")}>{t.about} <ArrowUpRight/></Button></div></footer>

    <GarageDialog key={garageOpen ? "open" : "closed"} open={garageOpen} onOpenChange={setGarageOpen} vehicle={vehicle} onSave={saveVehicle} signedIn={!!user}/>
    <SignInDialog open={signInOpen} onOpenChange={setSignInOpen}/>
    <Dialog open={info !== null} onOpenChange={open => { if (!open) setInfo(null); }}><DialogContent><DialogHeader><DialogTitle>{info === "privacy" ? t.privacyTitle : t.aboutTitle}</DialogTitle><DialogDescription>{info === "privacy" ? t.privacyBody : t.aboutBody}</DialogDescription></DialogHeader><Button onClick={() => setInfo(null)}>{t.gotIt}</Button></DialogContent></Dialog>
  </div>;
}
