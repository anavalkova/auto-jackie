import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, RotateCcw } from "lucide-react";
import { RequestVisitDialog, type VisitCard } from "@/components/request-visit-dialog";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { WhyNote } from "@/components/why-note";
import type { Vehicle } from "@/lib/vehicles";
import { useT } from "@/lib/i18n";


export function JackieChat({ vehicle, pending, onPendingSent, chatId, initialMessages, onTurnFinished, onReset, saving, workshopId }: {
  workshopId?: string | undefined;
  vehicle: Vehicle | null; pending: string | null; onPendingSent: () => void;
  chatId?: string | undefined; initialMessages?: UIMessage[] | undefined;
  onTurnFinished?: ((messages: UIMessage[]) => void) | undefined; onReset?: (() => void) | undefined; saving?: boolean | undefined;
}) {
  const { t, lang } = useT();
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState<VisitCard | null>(null);
  const vehiclePayload = vehicle ? { confidential: vehicle.confidential, description: vehicle.confidential ? undefined : vehicle.description, mileageKm: vehicle.mileageKm } : null;
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { vehicle: vehiclePayload, lang, ...(workshopId ? { workshopId } : {}) } }), [JSON.stringify(vehiclePayload), lang, workshopId]);
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ transport, ...(chatId ? { id: chatId } : {}), ...(initialMessages ? { messages: initialMessages } : {}) });
  const busy = status === "submitted" || status === "streaming";
  const wasBusy = useRef(false);
  useEffect(() => {
    if (busy) { wasBusy.current = true; return; }
    if (wasBusy.current && status === "ready") { wasBusy.current = false; onTurnFinished?.(messages); }
  }, [busy, status, messages, onTurnFinished]);

  const send = (text: string) => { if (!text.trim() || busy) return; clearError(); sendMessage({ text }); setInput(""); };
  useEffect(() => { if (pending) { send(pending); onPendingSent(); } }, [pending]);

  // Guests keep their chat only in memory; stash it so a sign-in redirect doesn't wipe it.
  useEffect(() => {
    if (chatId) return;
    try {
      if (messages.length === 0) sessionStorage.removeItem("autojackie.guestChat");
      else sessionStorage.setItem("autojackie.guestChat", JSON.stringify(messages));
    } catch { /* ignore */ }
  }, [messages, chatId]);

  return <div className="chat-shell">
    {messages.length === 0 ? <div className="chat-empty">
      <h1>{t.heroTitle}</h1>
      <p>{t.heroSub}</p>
      <WhyNote id="driver" title={t.whyTitle} stats={[
        { value: "36%", text: t.why1, source: { label: "Trafikanalys, 2022", url: "https://www.trafa.se/globalassets/statistik/vagtrafik/fordon/2023/fordon-i-lan-och-kommuner-2022.pdf" } },
        { value: "P0301?", text: t.why2 },
      ]}/>
    </div> : <Conversation className="chat-log">
      <ConversationContent>
        {messages.map(m => <Message from={m.role} key={m.id}>
          <MessageContent className={m.role === "user" ? "user-bubble" : "jackie-text"}>
            {m.parts.map((part, i) => {
              if (part.type === "text") return m.role === "user" ? <p key={i}>{part.text}</p> : <MessageResponse key={i}>{part.text}</MessageResponse>;
              if (isToolUIPart(part) && getToolName(part) === "suggestWorkshopVisit") {
                const o = (part.state === "output-available" ? part.output : part.input) as { issue?: string; urgency?: string; priceLowSek?: number; priceHighSek?: number; note?: string } | undefined;
                if (!o?.issue) return null;
                return <div key={i} className="offer-card">
                  <span className="eyebrow">{t.whatsNext}</span>
                  <strong>{o.issue}</strong>
                  <span className="offer-urgency">{t.getLooked} {o.urgency}</span>
                  {o.priceLowSek != null && o.priceHighSek != null && <p className="offer-price">{t.about_} {o.priceLowSek.toLocaleString("sv-SE")} {t.to} {o.priceHighSek.toLocaleString("sv-SE")} kr <small>{t.vatNote}</small></p>}
                  {o.note && <p className="offer-note">{o.note}</p>}
                  <Button onClick={() => setBooking({ issue: o.issue ?? "", urgency: o.urgency, priceLowSek: o.priceLowSek, priceHighSek: o.priceHighSek, note: o.note })}><CalendarCheck/> {t.requestVisit}</Button>
                </div>;
              }
              if (isToolUIPart(part)) {
                const name = getToolName(part) === "searchWikidata" ? t.toolSearch : getToolName(part) === "lookupFaultCode" ? t.toolCode : getToolName(part).includes("Tesla") ? t.toolTesla : t.toolItem;
                return <Tool key={i} defaultOpen={false}><ToolHeader type={part.type as `tool-${string}`} state={part.state} title={name}/><ToolContent><ToolInput input={part.input}/><ToolOutput output={part.output} errorText={part.errorText}/></ToolContent></Tool>;
              }
              return null;
            })}
          </MessageContent>
        </Message>)}
        {status === "submitted" && <Shimmer className="chat-wait">{t.checking}</Shimmer>}
        {error && <p className="chat-error" role="alert">{error.message || t.genericError}</p>}
      </ConversationContent>
      <ConversationScrollButton/>
    </Conversation>}

    {messages.length === 0 && <div className="try-row"><span>{t.tryLabel}</span>{t.starters.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}</div>}
    <PromptInput className="chat-composer" onSubmit={({ text }) => send(text)}>
      <PromptInputTextarea value={input} onChange={e => setInput(e.target.value)} placeholder={t.placeholder}/>
      <PromptInputFooter>
        <span className="composer-hint">{saving ? t.savedToChats : ""}</span>
        <div className="composer-actions">
          {messages.length > 0 && !busy && <Button variant="ghost" size="sm" type="button" onClick={() => { setMessages([]); clearError(); onReset?.(); }}><RotateCcw/> New chat</Button>}
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()}/>
        </div>
      </PromptInputFooter>
    </PromptInput>
    <RequestVisitDialog card={booking} vehicleLabel={vehicle && !vehicle.confidential ? vehicle.label : ""} onClose={() => setBooking(null)}/>
  </div>;
}
