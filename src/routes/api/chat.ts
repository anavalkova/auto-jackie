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
import { readTeslaManualPage, searchTeslaManual } from "@/lib/ai/tesla.server";

const vehicleSchema = z.object({
  confidential: z.boolean(),
  description: z.string().max(200).optional(),
  mileageKm: z.number().min(0).max(2_000_000).optional(),
}).nullable().optional();

const bodySchema = z.object({
  messages: z.array(z.any()).min(1).max(60),
  vehicle: vehicleSchema,
  lang: z.enum(["en", "sv", "de"]).optional(),
});

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
7. If the driver mentions warning signs like brake failure, smoke, burning smell, steering loss or a flashing engine light, tell them first to stop driving and get help.

For troubleshooting, answer with this structure (markdown headings, short):
### What it could be
### What the sources say
### What to do next
### Sources`;

function vehicleContext(v: z.infer<typeof vehicleSchema>) {
  if (!v) return "No vehicle selected.";
  const km = v.mileageKm != null ? ` Odometer: about ${v.mileageKm} km.` : "";
  if (v.confidential) return `The driver added their car by Swedish licence plate.${v.description ? ` Registry record (CONFIDENTIAL — use only to tailor your advice; never state, repeat, hint at or confirm the make, model, year, engine, fuel or gearbox to the driver, even if asked): ${v.description}.` : " Its registry details are confidential: never ask for, guess, or mention make, model, year or engine."}${km}`;
  return `The driver's car: ${v.description}.${km} You may refer to it, but Wikidata facts about parts still need citations.`;
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
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const suggestWorkshopVisit = createSuggestWorkshopVisit(provider.responses("openai/gpt-6-astra"));
        const result = streamText({
          model: provider.responses("openai/gpt-5.6-luna"),
          instructions: `${BASE_PROMPT}\n\nInterface language: ${({ en: "English", sv: "Swedish", de: "German" })[parsed.data.lang ?? "en"]}.\n\nVehicle: ${vehicleContext(parsed.data.vehicle)}`,
          messages: await convertToModelMessages(messages),
          tools: { searchWikidata, getWikidataItem, lookupFaultCode, searchTeslaManual, readTeslaManualPage, suggestWorkshopVisit },
          stopWhen: stepCountIs(8),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
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
