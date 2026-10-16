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

const starters = ["He said it's “probably nothing” — it was the brakes", "The noise disappears whenever the mechanic gets in", "I named the warning light. We coexist now."];

export function JackieChat({ vehicle, pending, onPendingSent, chatId, initialMessages, onTurnFinished, onReset, saving }: {
  vehicle: Vehicle | null; pending: string | null; onPendingSent: () => void;
  chatId?: string | undefined; initialMessages?: UIMessage[] | undefined;
  onTurnFinished?: ((messages: UIMessage[]) => void) | undefined; onReset?: (() => void) | undefined; saving?: boolean | undefined;
}) {
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState<VisitCard | null>(null);
  const vehiclePayload = vehicle ? { confidential: vehicle.confidential, description: vehicle.confidential ? undefined : vehicle.description, mileageKm: vehicle.mileageKm } : null;
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", body: { vehicle: vehiclePayload } }), [JSON.stringify(vehiclePayload)]);
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ transport, ...(chatId ? { id: chatId } : {}), ...(initialMessages ? { messages: initialMessages } : {}) });
  const busy = status === "submitted" || status === "streaming";
  const wasBusy = useRef(false);
  useEffect(() => {
    if (busy) { wasBusy.current = true; return; }
    if (wasBusy.current && status === "ready") { wasBusy.current = false; onTurnFinished?.(messages); }
  }, [busy, status, messages, onTurnFinished]);

  const send = (text: string) => { if (!text.trim() || busy) return; clearError(); sendMessage({ text }); setInput(""); };
  useEffect(() => { if (pending) { send(pending); onPendingSent(); } }, [pending]);

  return <div className="chat-shell">
    {messages.length === 0 ? <div className="chat-empty">
      <h1>Confess your car's sins.</h1>
      <p>Jackie listens without judging — then explains it in plain words, with urgency and a rough price.</p>
      <div className="try-row"><span>Try:</span>{starters.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}</div>
      <p className="why-plain">Why this exists — 36% of privately owned cars in Sweden are registered to women, yet car talk still assumes everyone speaks “mechanic”. Jackie translates. <a href="https://www.trafa.se/globalassets/statistik/vagtrafik/fordon/2023/fordon-i-lan-och-kommuner-2022.pdf" target="_blank" rel="noreferrer">Trafikanalys, 2022</a></p>
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
                  <span className="eyebrow">WHAT'S NEXT</span>
                  <strong>{o.issue}</strong>
                  <span className="offer-urgency">Get it looked at: {o.urgency}</span>
                  {o.priceLowSek != null && o.priceHighSek != null && <p className="offer-price">About {o.priceLowSek.toLocaleString("sv-SE")}–{o.priceHighSek.toLocaleString("sv-SE")} kr <small>incl. VAT · rough estimate, not a quote</small></p>}
                  {o.note && <p className="offer-note">{o.note}</p>}
                  <Button onClick={() => setBooking({ issue: o.issue ?? "", urgency: o.urgency, priceLowSek: o.priceLowSek, priceHighSek: o.priceHighSek, note: o.note })}><CalendarCheck/> Request a workshop visit</Button>
                </div>;
              }
              if (isToolUIPart(part)) {
                const name = getToolName(part) === "searchWikidata" ? "Searching Wikidata" : getToolName(part) === "lookupFaultCode" ? "Looking up fault code" : getToolName(part).includes("Tesla") ? "Reading Tesla service manual" : "Reading Wikidata record";
                return <Tool key={i} defaultOpen={false}><ToolHeader type={part.type as `tool-${string}`} state={part.state} title={name}/><ToolContent><ToolInput input={part.input}/><ToolOutput output={part.output} errorText={part.errorText}/></ToolContent></Tool>;
              }
              return null;
            })}
          </MessageContent>
        </Message>)}
        {status === "submitted" && <Shimmer className="chat-wait">Jackie is checking her sources…</Shimmer>}
        {error && <p className="chat-error" role="alert">{error.message || "Something went wrong. Please try again."}</p>}
      </ConversationContent>
      <ConversationScrollButton/>
    </Conversation>}

    {messages.length === 0 && <div className="try-row"><span>Try:</span>{starters.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}</div>}
    <PromptInput className="chat-composer" onSubmit={({ text }) => send(text)}>
      <PromptInputTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Describe the noise, light or part you're wondering about…"/>
      <PromptInputFooter>
        <span className="composer-hint">{saving ? "Saved to My chats" : ""}</span>
        <div className="composer-actions">
          {messages.length > 0 && !busy && <Button variant="ghost" size="sm" type="button" onClick={() => { setMessages([]); clearError(); onReset?.(); }}><RotateCcw/> New chat</Button>}
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()}/>
        </div>
      </PromptInputFooter>
    </PromptInput>
    <RequestVisitDialog card={booking} vehicleLabel={vehicle && !vehicle.confidential ? vehicle.label : ""} onClose={() => setBooking(null)}/>
  </div>;
}
