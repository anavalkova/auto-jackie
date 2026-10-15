import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/vehicles";

const starters = ["My brakes squeal and I've been ignoring it for weeks", "An orange light came on and I panicked", "My code reader says P0301 — is it bad?", "Someone told me my timing belt is due. Are they upselling?", "There's a noise I can't describe", "My Tesla Model 3 brakes squeak"];

export function JackieChat({ vehicle, pending, onPendingSent, chatId, initialMessages, onTurnFinished, onReset, saving }: {
  vehicle: Vehicle | null; pending: string | null; onPendingSent: () => void;
  chatId?: string | undefined; initialMessages?: UIMessage[] | undefined;
  onTurnFinished?: ((messages: UIMessage[]) => void) | undefined; onReset?: (() => void) | undefined; saving?: boolean | undefined;
}) {
  const [input, setInput] = useState("");
  const [booking, setBooking] = useState<string | null>(null);
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
      <span className="eyebrow">THE CAR CONFESSIONAL · NO JUDGEMENT</span>
      <h1>What's the car<br/>up to today?</h1>
      <p>Tell me everything — the weird noise, the light you've been ignoring, the quote that felt off. I'll explain it in plain words, tell you how urgent it is, give a rough price, and help you book a workshop.</p>
      <div className="starter-grid">{starters.map(s => <Button key={s} variant="outline" className="starter" onClick={() => send(s)}>{s}</Button>)}</div>
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
                  <Button onClick={() => setBooking(o.issue ?? "")}><CalendarCheck/> Request a workshop visit</Button>
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

    <PromptInput className="chat-composer" onSubmit={({ text }) => send(text)}>
      <PromptInputTextarea value={input} onChange={e => setInput(e.target.value)} placeholder="Describe the noise, light or part you're wondering about…"/>
      <PromptInputFooter>
        <span className="composer-hint">{saving ? "Saved to My chats" : vehicle ? `Using: ${vehicle.label}` : "Tip: tell Jackie about your car for more specific answers."}</span>
        <div className="composer-actions">
          {messages.length > 0 && !busy && <Button variant="ghost" size="sm" type="button" onClick={() => { setMessages([]); clearError(); onReset?.(); }}><RotateCcw/> New chat</Button>}
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()}/>
        </div>
      </PromptInputFooter>
    </PromptInput>
    <Dialog open={booking !== null} onOpenChange={o => { if (!o) setBooking(null); }}><DialogContent><DialogHeader><DialogTitle>Booking is almost here</DialogTitle><DialogDescription>Soon you'll pick a partner workshop and a time (Stockholm time) for “{booking}” right here. For now, show this chat to any workshop and ask them to confirm the price.</DialogDescription></DialogHeader><Button onClick={() => setBooking(null)}>Got it</Button></DialogContent></Dialog>
  </div>;
}
