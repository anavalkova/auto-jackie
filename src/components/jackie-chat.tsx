import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import type { Vehicle } from "@/lib/vehicles";

const starters = ["Why do my brakes squeal?", "What does a timing belt do?", "What are spark plugs for?", "My engine light came on — what now?"];

export function JackieChat({ vehicle, pending, onPendingSent, chatId, initialMessages, onTurnFinished, onReset, saving }: {
  vehicle: Vehicle | null; pending: string | null; onPendingSent: () => void;
  chatId?: string | undefined; initialMessages?: UIMessage[] | undefined;
  onTurnFinished?: ((messages: UIMessage[]) => void) | undefined; onReset?: (() => void) | undefined; saving?: boolean | undefined;
}) {
  const [input, setInput] = useState("");
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
      <span className="eyebrow">HEY THERE, I'M JACKIE</span>
      <h1>What's the car<br/>up to today?</h1>
      <p>Ask about a noise, a warning light or a part. I only explain what I can back up with a source, and I'll link it.</p>
      <div className="starter-grid">{starters.map(s => <Button key={s} variant="outline" className="starter" onClick={() => send(s)}>{s}</Button>)}</div>
    </div> : <Conversation className="chat-log">
      <ConversationContent>
        {messages.map(m => <Message from={m.role} key={m.id}>
          <MessageContent className={m.role === "user" ? "user-bubble" : "jackie-text"}>
            {m.parts.map((part, i) => {
              if (part.type === "text") return m.role === "user" ? <p key={i}>{part.text}</p> : <MessageResponse key={i}>{part.text}</MessageResponse>;
              if (isToolUIPart(part)) {
                const name = getToolName(part) === "searchWikidata" ? "Searching Wikidata" : "Reading Wikidata record";
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
  </div>;
}
