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

const vehicleSchema = z.object({
  confidential: z.boolean(),
  description: z.string().max(200).optional(),
  mileageKm: z.number().min(0).max(2_000_000).optional(),
}).nullable().optional();

const bodySchema = z.object({
  messages: z.array(z.any()).min(1).max(60),
  vehicle: vehicleSchema,
});

const BASE_PROMPT = `You are Jackie, AutoJackie's mechanic assistant for drivers in Sweden. Speak plain, friendly English. No jargon without explaining it, no upselling.

Hard rules:
1. Only answer questions about cars and car maintenance/repair. For anything else, politely decline in one sentence and steer back to the car.
2. Ground every technical statement ONLY in Wikidata records you fetched with the tools during this conversation. Always call searchWikidata, then getWikidataItem for the relevant item(s), before explaining.
3. Cite each fact inline with its Wikidata ID as a markdown link, e.g. [Q1132815](https://www.wikidata.org/wiki/Q1132815).
4. If Wikidata does not cover something (e.g. exact service steps, torque values, prices, intervals for a specific car), say plainly that you have no source for it and suggest having a workshop check it. Never invent mechanical explanations or procedures.
5. If the driver mentions warning signs like brake failure, smoke, burning smell, or steering loss, tell them first to stop driving and get help.

For troubleshooting, answer with this structure (markdown headings, short):
### What it could be
### What the sources say
### What to do next
### Sources`;

function vehicleContext(v: z.infer<typeof vehicleSchema>) {
  if (!v) return "No vehicle selected.";
  const km = v.mileageKm != null ? ` Odometer: about ${v.mileageKm} km.` : "";
  if (v.confidential) return `The driver added their car by Swedish licence plate. Its registry details are confidential: never ask for, guess, or mention make, model, year or engine.${km}`;
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

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: `${BASE_PROMPT}\n\nVehicle: ${vehicleContext(parsed.data.vehicle)}`,
          messages: await convertToModelMessages(messages),
          tools: { searchWikidata, getWikidataItem },
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
