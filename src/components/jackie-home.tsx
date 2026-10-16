import { useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import { ArrowUpRight, Car, ChevronDown, Gauge, Globe2, HelpCircle, LockKeyhole, LogOut, MessageSquare, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { GarageDialog } from "@/components/garage-dialog";
import { JackieChat } from "@/components/jackie-chat";
import { SignInDialog } from "@/components/sign-in-dialog";
import { useSessionUser } from "@/hooks/use-session-user";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { nextService, type Vehicle } from "@/lib/vehicles";
import jackie from "@/assets/jackie.jpg";

const fmt = (n: number) => n.toLocaleString("sv-SE");
type ChatRow = { id: string; title: string; updated_at: string };

function titleFrom(messages: UIMessage[]) {
  const first = messages.find(m => m.role === "user")?.parts.find(p => p.type === "text");
  const t = first && "text" in first ? first.text.trim() : "New chat";
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || "New chat";
}

export function JackieHome({ chatId }: { chatId?: string }) {
  const navigate = useNavigate();
  const { user, ready } = useSessionUser();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [garageOpen, setGarageOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState(false);
  const [newChatKey, setNewChatKey] = useState(0);
  const [info, setInfo] = useState<"workshop" | "about" | "privacy" | null>(null);
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
  };
  const forgetVehicle = async () => {
    setVehicle(null);
    if (user) await supabase.from("saved_vehicles").delete().eq("user_id", user.id);
  };

  const onTurnFinished = useCallback(async (messages: UIMessage[]) => {
    if (!user || messages.length === 0) return;
    const payload = { messages: messages as unknown as Json, title: titleFrom(messages), updated_at: new Date().toISOString() };
    if (chatId) { await supabase.from("chats").update(payload).eq("id", chatId); await loadChats(); return; }
    const { data, error } = await supabase.from("chats").insert({ ...payload, user_id: user.id }).select("id").single();
    if (error || !data) return console.error("Couldn't save chat", error);
    navigate({ to: "/c/$chatId", params: { chatId: data.id }, replace: true });
  }, [user?.id, chatId, loadChats]);

  const onReset = () => {
    if (!user) setVehicle(null);
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

  return <div className="app-frame">
    <header className="site-header">
      <Link to="/" className="brand" aria-label="AutoJackie home"><span className="brand-mark">J<span className="brand-mark-dot"/></span><span>Auto<span className="brand-orange">Jackie</span></span></Link>
      <nav aria-label="Main navigation">
        <span className="market-label"><span className="swedish-flag"/>Made for Sweden</span>
        <Button variant="ghost" asChild className="workshop-link"><Link to="/workshop">For workshops <ArrowUpRight/></Link></Button>
        {ready && (user ? <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Your account"><UserRound/></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="account-email">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onSelect={signOut}><LogOut/> Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </> : <Button variant="outline" onClick={() => setSignInOpen(true)}><UserRound/> Sign in to save</Button>)}
        <Button variant="outline" className="language-control" onClick={() => setInfo("about")} aria-label="Language: English"><Globe2/> EN <ChevronDown/></Button>
      </nav>
    </header>

    <main className="workspace">
      <aside className="jackie-panel">
        <div className="portrait-wrap compact"><img src={jackie} alt="Jackie, a mechanic in an orange work jacket" width={1024} height={1024}/><span className="portrait-label">Jackie is new. Go easy on her</span></div>

        <section className="vehicle-card" aria-label="Your car">
          <div className="vehicle-head"><span className="eyebrow">{user ? "YOUR SAVED CAR" : "CAR FOR THIS CHAT"}</span>{vehicle && <Button variant="ghost" size="sm" onClick={() => setGarageOpen(true)}><Pencil/> Change</Button>}</div>
          {!vehicle ? <div className="vehicle-empty"><Car/>
            <p>{user ? "No car saved yet. Add it once and Jackie remembers it." : "Share a plate, HSN/TSN or pick it by hand. Used for this chat only. Nothing is saved."}</p>
            <Button onClick={() => setGarageOpen(true)}><Plus/> {user ? "Add your car" : "Tell Jackie about your car"}</Button>
          </div> : <>
            <h2 className="vehicle-name">{vehicle.confidential ? <span className="plate-chip"><span className="plate-eu">S</span>{vehicle.label}</span> : vehicle.label}</h2>
            <p className="vehicle-spec">{vehicle.confidential ? <><LockKeyhole/> Registry details kept private</> : vehicle.description}</p>
            <div className="service-box"><Gauge/>{service ? <div><strong>Next service in about {fmt(service.remaining)} km</strong><span>Estimated at {fmt(service.dueAt)} km · every {fmt(vehicle.serviceKm)} km</span><div className="service-bar"><span style={{ width: `${Math.round(service.progress * 100)}%` }}/></div></div> : <div><strong>Add your odometer reading</strong><span>to estimate the next service.</span></div>}</div>
            <p className="estimate-note">{user ? "Saved to your account." : "Not saved. Gone when you start a new chat."} <button type="button" className="text-link" onClick={forgetVehicle}>Remove car</button></p>
          </>}
        </section>

        <section className="chat-history" aria-label="Chat history">
          <div className="history-heading"><h2>My chats</h2><Button variant="ghost" size="icon" onClick={onReset} aria-label="Start a new chat" title="Start a new chat"><Plus/></Button></div>
          {!ready || chatsLoading ? <p className="history-note" role="status">Loading chats…</p>
            : !user ? <div className="history-guest"><p className="history-note">Private chat · not saved</p><Button variant="outline" size="sm" onClick={() => setSignInOpen(true)}><UserRound/> Sign in to save chats</Button></div>
            : chatsError ? <div><p className="history-note" role="alert">Couldn't load or update your chats.</p><Button variant="ghost" size="sm" onClick={() => void loadChats()}>Try again</Button></div>
            : chats.length === 0 ? <p className="history-note">No saved chats yet.</p>
            : <ul className="history-list">{chats.map(c => <li key={c.id} className={c.id === chatId ? "active" : undefined}>
              <Link to="/c/$chatId" params={{ chatId: c.id }} className="history-item" aria-current={c.id === chatId ? "page" : undefined} title={c.title}><MessageSquare/><span className="history-item-copy"><span>{c.title}</span><time dateTime={c.updated_at}>{new Date(c.updated_at).toLocaleString("en-GB", { timeZone: "Europe/Stockholm", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time></span></Link>
              <Button variant="ghost" size="icon" className="history-delete" aria-label={`Delete chat: ${c.title}`} title="Delete chat" onClick={() => deleteChat(c.id)}><Trash2/></Button>
            </li>)}</ul>}
        </section>
      </aside>

      <section className="assistant-area" aria-label="Chat with Jackie">
        <div className="assistant-top"><span/><span className="preview-badge">{user ? "Chats saved" : "Private chat"}</span></div>
        {missing ? <div className="chat-empty"><h1>This chat isn't here.</h1><p>{user ? "It may have been deleted." : "Sign in with the account that saved it to see it."}</p><div className="starter-grid">{!user && <Button onClick={() => setSignInOpen(true)}>Sign in</Button>}<Button variant="outline" asChild><Link to="/">Start a new chat</Link></Button></div></div>
          : initial === null ? <div className="chat-empty"><p>Opening your chat…</p></div>
          : <JackieChat key={chatId ?? `new-${newChatKey}`} chatId={chatId} initialMessages={initial} vehicle={vehicle} pending={null} onPendingSent={() => {}} onTurnFinished={onTurnFinished} onReset={onReset} saving={!!user && !!chatId}/>}
        <div className="assistant-bottom"><span className="swedish-flag"/><span>Jackie helps you understand the problem. A real workshop confirms the fix before you pay for anything.</span><Button variant="ghost" size="icon" aria-label="About this preview" onClick={() => setInfo("about")}><HelpCircle/></Button></div>
      </section>
    </main>

    <footer className="site-footer"><span>© {new Date().getFullYear()} AutoJackie</span><div><Button variant="link" onClick={() => setInfo("privacy")}>Privacy</Button><Button variant="link" onClick={() => setInfo("about")}>About Jackie <ArrowUpRight/></Button></div></footer>

    <GarageDialog key={garageOpen ? "open" : "closed"} open={garageOpen} onOpenChange={setGarageOpen} vehicle={vehicle} onSave={saveVehicle} signedIn={!!user}/>
    <SignInDialog open={signInOpen} onOpenChange={setSignInOpen}/>
    <Dialog open={info !== null} onOpenChange={open => { if (!open) setInfo(null); }}><DialogContent><DialogHeader><DialogTitle>{info === "workshop" ? "A helping hand for your workshop" : info === "privacy" ? "Your details stay yours" : "Nice to meet you. I'm Jackie."}</DialogTitle><DialogDescription>{info === "workshop" ? "The workshop space comes in a later phase. Right now AutoJackie focuses on helping drivers understand their car." : info === "privacy" ? "Without signing in, nothing is saved: your car and chat disappear when you start over or close the tab. If you sign in, your car and chats are stored in your account, visible only to you, and you can delete them any time. Registry details from a plate are never shown on screen." : "I explain car problems in plain English, using facts from Wikidata and linking every source. German HSN/TSN codes are checked against the official KBA register; Swedish plates use sample data for now."}</DialogDescription></DialogHeader><Button onClick={() => setInfo(null)}>Got it</Button></DialogContent></Dialog>
  </div>;
}
