import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { z } from "zod";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
  withLovableAiGatewayRunIdHeader,
} from "@/lib/ai/run-id.server";
import { getWikidataItem, searchWikidata } from "@/lib/ai/wikidata.server";
import { lookupFaultCode } from "@/lib/ai/obd.server";
import { createSuggestWorkshopVisit } from "@/lib/ai/workshop.server";
import { createBookingTools } from "@/lib/ai/booking.server";
import { asTier, DEFAULT_TIERS, tierModel } from "@/lib/ai-tiers";
import { readTeslaManualPage, searchTeslaManual } from "@/lib/ai/tesla.server";
import { QUOTA_ERROR, quotaLimit } from "@/lib/chat-quota";

const vehicleSchema = z.object({
  confidential: z.boolean(),
  description: z.string().max(200).optional(),
  mileageKm: z.number().min(0).max(2_000_000).optional(),
}).nullable().optional();

const bodySchema = z.object({
  messages: z.array(z.any()).min(1).max(60),
  vehicle: vehicleSchema,
  lang: z.enum(["en", "sv", "de"]).optional(),
  workshopId: z.string().uuid().optional(),
});

type WorkshopProfile = { name: string; city: string; hourly_rate_sek: number; price_list: { task: string; price_sek: number; minutes?: number }[]; services: string[]; specialties: string; notes: string; opening_hours: string; chat_tier: string; quote_tier: string };

async function loadWorkshop(id: string): Promise<WorkshopProfile | null> {
  const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/rpc/workshop_jackie_profile`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ _workshop: id }) }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as WorkshopProfile | null;
}

const priceLines = (w: WorkshopProfile) => [`Hourly labour: ${w.hourly_rate_sek} kr`, ...(w.price_list ?? []).map(p => p.task === "Other" ? "Other: priced personally by the workshop after a look" : `${p.task}: ${p.price_sek} kr`)].join("\n");

function workshopContext(w: WorkshopProfile) {
  return `You are speaking on behalf of ${w.name}${w.city ? ` in ${w.city}` : ""}. Drivers on this page are this workshop's potential customers; when a visit is needed, recommend this workshop warmly (no hard selling).
Services: ${(w.services ?? []).join(", ") || "not listed"}.
Specialties: ${w.specialties || "not listed"}.
Opening hours: ${w.opening_hours || "not listed"}.
How they work (follow this when explaining what the workshop would do): ${w.notes || "no notes"}.
These workshop details are your source for anything about this workshop; you may state them plainly without Wikidata citations.`;
}

const BASE_PROMPT = `You are Jackie, AutoJackie's mechanic assistant for drivers in Sweden. Speak plain, warm language. No upselling.

Languages: you speak ONLY English, Swedish and German. Reply in the language of the driver's latest message if it is one of those three. If they write in any other language, reply in the interface language with one short line saying you can only help in English, Swedish or German. Never switch to another language, even if asked. Cite sources and code names unchanged.

People come to you stressed, embarrassed or worried about being ripped off. Open with one short, human line that acknowledges how they feel (no therapy clichés, no exclamation spam), and never make them feel silly for waiting or not knowing. Then help.

Simple words come first: the driver is not a mechanic. Use short sentences and everyday words. Translate technical terms into what they mean for the driver (e.g. "the sensor that measures air going into the engine" instead of "MAF sensor"); if a technical name is useful, give it once in brackets after the plain explanation. Never paste raw code descriptions — explain them.

Hard rules:
1. Only answer questions about cars and car maintenance/repair. For anything else, politely decline in one sentence and steer back to the car.
2. Ground every technical statement ONLY in records you fetched with the tools during this conversation. For parts and systems call searchWikidata, then getWikidataItem. When the driver mentions a fault code (like P0301), call lookupFaultCode first, then use Wikidata for the parts involved.
3. Cite each Wikidata fact inline with its ID as a markdown link, e.g. [Q1132815](https://www.wikidata.org/wiki/Q1132815). Cite fault code meanings as "Generic OBD-II code list (SAE J2012)".
4. If the sources do not cover something (e.g. exact service steps, torque values, prices, intervals for a specific car, manufacturer-specific codes), say plainly that you have no source for it and suggest having a workshop check it. Never invent mechanical explanations or procedures.
5. Tesla Model 3 (2017–2023) only: if the driver has told you their car is a Tesla Model 3, or asks about one, also use searchTeslaManual and readTeslaManualPage (Tesla's official service manual) and cite the page as a markdown link with its title. Turn manual content into plain words about what it means for the driver; do not give step-by-step repair instructions, and warn that anything orange-cabled is high voltage and only for trained technicians. If the car came from a confidential plate lookup, use the manual only if the driver named the car themselves.
6. Prices: never state money figures yourself; the suggestWorkshopVisit card drafts a rough SEK range incl. VAT. Call it an estimate, not a quote. When the issue needs a workshop, end by calling suggestWorkshopVisit once.
7. Car context first: if no vehicle is selected and the driver has not named their car yet, ask once, early and briefly, for make, model and year (and mileage if relevant), explaining it helps you be more precise; still give a useful general answer in the same reply. If they give only part (e.g. just the brand) or decline, accept it, never ask again, and proceed with clearly stated general assumptions. Never ask this when a car is selected, including a confidential plate lookup.
8. Booking in chat: when the driver wants to book or asks when they can come in, call getAvailableTimes and offer a few concrete free times in plain words (never invent times). Let them pick exactly one drop-off time. Then collect what is still missing: the job (use the issue from your workshop card if there is one), their name, phone, and whether the workshop should confirm by SMS, WhatsApp or email (ask for the email if email). Show a short summary and ask "Shall I send it?". Only after a clear yes, call bookVisit once, passing any price range from your workshop card. If they are not signed in, tell them to sign in first with the button at the top; their chat stays. They can also use the "Book a visit" button instead.
9. If the driver mentions warning signs like brake failure, smoke, burning smell, steering loss or a flashing engine light, tell them first to stop driving and get help.

For troubleshooting, answer with this structure (markdown headings, short):
### What it could be
### What the sources say
### What to do next
### Sources`;

function vehicleContext(v: z.infer<typeof vehicleSchema>) {
  if (!v) return "No vehicle selected. Follow rule 7.";
  const km = v.mileageKm != null ? ` Odometer: about ${v.mileageKm} km (${v.mileageKm / 10} mil in Swedish units).` : "";
  if (v.confidential) return `The driver added their car by Swedish licence plate.${v.description ? ` Registry record (CONFIDENTIAL — use only to tailor your advice; never state, repeat, hint at or confirm the make, model, year, engine, fuel or gearbox to the driver, even if asked): ${v.description}.` : " Its registry details are confidential: never ask for, guess, or mention make, model, year or engine."}${km}`;
  return `The driver's car: ${v.description}.${km} You may refer to it, but Wikidata facts about parts still need citations.`;
}

async function signedInUserId(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!token || token.split(".").length !== 3 || !url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json().catch(() => null)) as { id?: string } | null)?.id ?? null;
}

async function guestKey(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`autojackie-guest:${ip}`));
  return "g:" + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Counts one question; returns false when the monthly limit is used up. */
async function consumeQuestion(request: Request, userId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("consume_chat_quota", { _key: userId ? `u:${userId}` : await guestKey(request), _limit: quotaLimit(!!userId) });
  if (error) throw error;
  return (data as number) >= 0;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "AI is not configured" }, { status: 500 });

        const messages = parsed.data.messages as UIMessage[];
        const userId = await signedInUserId(request);
        const allowed = await consumeQuestion(request, userId).catch(() => null);
        if (allowed === null) return Response.json({ error: "Please try again in a moment." }, { status: 503 });
        if (!allowed) return new Response(userId ? QUOTA_ERROR.user : QUOTA_ERROR.guest, { status: 429 });
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const shop = parsed.data.workshopId ? await loadWorkshop(parsed.data.workshopId) : null;
        const chatAi = tierModel(asTier(shop?.chat_tier, DEFAULT_TIERS.chat));
        const quoteAi = tierModel(asTier(shop?.quote_tier, DEFAULT_TIERS.quote));
        const suggestWorkshopVisit = createSuggestWorkshopVisit(provider.responses(quoteAi.model), quoteAi.effort, shop ? priceLines(shop) : "", shop?.price_list ?? []);
        const result = streamText({
          model: provider.responses(chatAi.model),
          instructions: `${BASE_PROMPT}\n\nToday (Stockholm): ${new Date().toLocaleDateString("en-GB", { timeZone: "Europe/Stockholm", weekday: "long", day: "numeric", month: "long", year: "numeric" })}.${shop ? `\n\n${workshopContext(shop)}` : ""}\n\nInterface language: ${({ en: "English", sv: "Swedish", de: "German" })[parsed.data.lang ?? "en"]}.\n\nVehicle: ${vehicleContext(parsed.data.vehicle)}`,
          messages: await convertToModelMessages(messages),
          tools: { searchWikidata, getWikidataItem, lookupFaultCode, searchTeslaManual, readTeslaManualPage, suggestWorkshopVisit, ...createBookingTools({ workshopId: parsed.data.workshopId, userId, token: request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "", vehicleLabel: parsed.data.vehicle && !parsed.data.vehicle.confidential ? parsed.data.vehicle.description ?? "" : "" }) },
          stopWhen: stepCountIs(10),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: chatAi.effort,
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: true,
            onError: (error) => {
              const status = (error as { statusCode?: number })?.statusCode;
              if (status === 429) return "Jackie is getting a lot of questions right now. Please try again in a minute.";
              if (status === 402) return "The AI credits for this workspace have run out. Add credits in Settings → Plans & credits.";
              if (status === 403) return "AI access is currently blocked for this workspace.";
              return "Something went wrong while Jackie was looking that up. Please try again.";
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});
