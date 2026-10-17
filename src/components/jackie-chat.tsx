import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, RotateCcw } from "lucide-react";
import type { VisitCard } from "@/components/request-visit-dialog";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from "@/components/ai-elements/prompt-input";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { vehicleForJackie, type Vehicle } from "@/lib/vehicles";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { QUOTA_ERROR } from "@/lib/chat-quota";
import { chatQuotaStatus, type ChatQuotaStatus } from "@/lib/chat-quota.functions";


export function JackieChat({ vehicle, pending, onPendingSent, chatId, initialMessages, onTurnFinished, onReset, saving, workshopId, onSignIn, onBook, onEmptyChange }: {
  workshopId?: string | undefined; onSignIn?: (() => void) | undefined; onBook: (card: VisitCard) => void;
  onEmptyChange?: ((empty: boolean) => void) | undefined;
  vehicle: Vehicle | null; pending: string | null; onPendingSent: () => void;
  chatId?: string | undefined; initialMessages?: UIMessage[] | undefined;
  onTurnFinished?: ((messages: UIMessage[]) => void) | undefined; onReset?: (() => void) | undefined; saving?: boolean | undefined;
}) {
  const { t, lang } = useT();
  const [input, setInput] = useState("");
  const vehiclePayload = vehicleForJackie(vehicle);
  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: { vehicle: vehiclePayload, lang, ...(workshopId ? { workshopId } : {}) },
    headers: async (): Promise<Record<string, string>> => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    },
  }), [JSON.stringify(vehiclePayload), lang, workshopId]);
  const { messages, sendMessage, status, stop, error, setMessages, clearError } = useChat({ transport, ...(chatId ? { id: chatId } : {}), ...(initialMessages ? { messages: initialMessages } : {}) });
  const busy = status === "submitted" || status === "streaming";
  const wasBusy = useRef(false);
  const [quota, setQuota] = useState<ChatQuotaStatus | null>(null);
  const refreshQuota = useCallback(() => { chatQuotaStatus().then(setQuota).catch(() => {}); }, []);
  useEffect(() => { refreshQuota(); }, [refreshQuota]);
  useEffect(() => {
    if (busy) { wasBusy.current = true; return; }
    if (wasBusy.current && status === "ready") { wasBusy.current = false; onTurnFinished?.(messages); refreshQuota(); }
  }, [busy, status, messages, onTurnFinished, refreshQuota]);

  const send = (text: string) => { if (!text.trim() || busy) return; clearError(); sendMessage({ text }); setInput(""); };
  useEffect(() => { if (pending) { send(pending); onPendingSent(); } }, [pending]);
  useEffect(() => { onEmptyChange?.(messages.length === 0); }, [messages.length, onEmptyChange]);

  // Guests keep their chat only in memory; stash it so a sign-in redirect doesn't wipe it.
  useEffect(() => {
    if (chatId) return;
    try {
      if (messages.length === 0) sessionStorage.removeItem("autojackie.guestChat");
      else sessionStorage.setItem("autojackie.guestChat", JSON.stringify(messages));
    } catch { /* ignore */ }
  }, [messages, chatId]);

  const quotaHint = quota ? (quota.signedIn ? t.quotaHintUser : t.quotaHintGuest).replace("%n", String(quota.remaining)).replace("%m", String(quota.limit)) : "";
  return <div className="chat-shell">
    {messages.length === 0 ? <div className="chat-empty">
      <p>{t.heroSub}</p>
    </div> : <Conversation className="chat-log">
      <ConversationContent>
        {messages.map(m => <Message from={m.role} key={m.id}>
          <MessageContent className={m.role === "user" ? "user-bubble" : "jackie-text"}>
            {m.parts.map((part, i) => {
              if (part.type === "text") return m.role === "user" ? <p key={i}>{part.text}</p> : <MessageResponse key={i}>{part.text}</MessageResponse>;
              if (isToolUIPart(part) && getToolName(part) === "suggestWorkshopVisit") {
                const o = (part.state === "output-available" ? part.output : part.input) as { issue?: string; service?: string; urgency?: string; priceLowSek?: number; priceHighSek?: number; note?: string } | undefined;
                if (!o?.issue) return null;
                return <div key={i} className="offer-card">
                  <span className="eyebrow">{t.whatsNext}</span>
                  <strong>{o.issue}</strong>
                  <span className="offer-urgency">{t.getLooked} {o.urgency}</span>
                  {o.priceLowSek != null && o.priceHighSek != null && <p className="offer-price">{t.about_} {o.priceLowSek.toLocaleString("sv-SE")} {t.to} {o.priceHighSek.toLocaleString("sv-SE")} kr <small>{t.vatNote}</small></p>}
                  {o.note && <p className="offer-note">{o.note}</p>}
                  <Button onClick={() => onBook({ issue: o.issue ?? "", service: o.service, urgency: o.urgency, priceLowSek: o.priceLowSek, priceHighSek: o.priceHighSek, note: o.note })}><CalendarCheck/> {t.requestVisit}</Button>
                </div>;
              }
              if (isToolUIPart(part) && getToolName(part) === "bookVisit") {
                const o = part.state === "output-available" ? part.output as { ok?: boolean; workshop?: string; times?: string[] } : null;
                if (!o?.ok) return null;
                return <div key={i} className="booking-done"><strong><CalendarCheck/> {t.bookedTitle}</strong><span>{t.bookedBody.replace("%w", o.workshop ?? "")}</span><span className="history-note">{(o.times ?? []).join(" · ")}</span></div>;
              }
              if (isToolUIPart(part)) {
                const tools = m.parts.filter(p => isToolUIPart(p) && getToolName(p) !== "suggestWorkshopVisit" && getToolName(p) !== "bookVisit");
                if (tools[0] !== part) return null;
                const running = tools.some(p => isToolUIPart(p) && (p.state === "input-streaming" || p.state === "input-available"));
                const label = (n: string) => n === "getAvailableTimes" ? t.bk.time : n === "searchWikidata" ? t.toolSearch : n === "lookupFaultCode" ? t.toolCode : n.includes("Tesla") ? t.toolTesla : t.toolItem;
                return <details key={i} className="sources-used">
                  <summary>{running ? t.sourcesUsing : t.sourcesUsed.replace("%n", String(tools.length))}</summary>
                  {tools.map((p, j) => isToolUIPart(p) && <Tool key={j} defaultOpen={false}><ToolHeader type={p.type as `tool-${string}`} state={p.state} title={label(getToolName(p))}/><ToolContent><ToolInput input={p.input}/><ToolOutput output={p.output} errorText={p.errorText}/></ToolContent></Tool>)}
                </details>;
              }
              return null;
            })}
          </MessageContent>
        </Message>)}
        {status === "submitted" && <Shimmer className="chat-wait">{t.checking}</Shimmer>}
        {error && (error.message.includes(QUOTA_ERROR.guest)
          ? <div className="chat-error" role="alert"><p>{t.quotaGuest}</p>{onSignIn && <Button size="sm" onClick={onSignIn}>{t.signIn}</Button>}</div>
          : <p className="chat-error" role="alert">{error.message.includes(QUOTA_ERROR.user) ? t.quotaUser : error.message || t.genericError}</p>)}
      </ConversationContent>
      <ConversationScrollButton/>
    </Conversation>}

    {messages.length === 0 && <div className="try-row"><span>{t.tryLabel}</span>{t.starters.map(s => <button key={s} type="button" onClick={() => send(s)}>{s}</button>)}</div>}
    <PromptInput className="chat-composer" onSubmit={({ text }) => send(text)}>
      <PromptInputTextarea value={input} onChange={e => setInput(e.target.value)} placeholder={t.placeholder}/>
      <PromptInputFooter>
        <span className="composer-hint">{quotaHint}{saving ? ` · ${t.savedToChats}` : ""}</span>
        {!quota?.signedIn && quota != null && quota.remaining <= 2 && onSignIn && <Button variant="ghost" size="sm" type="button" onClick={onSignIn}>{t.signIn}</Button>}
        <div className="composer-actions">
          {messages.length > 0 && !busy && <Button variant="ghost" size="sm" type="button" onClick={() => { setMessages([]); clearError(); onReset?.(); }}><RotateCcw/> New chat</Button>}
          <PromptInputSubmit status={status} onStop={stop} disabled={!busy && !input.trim()}/>
        </div>
      </PromptInputFooter>
    </PromptInput>
  </div>;
}
