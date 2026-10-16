import { tool, streamText, Output, type LanguageModel } from "ai";
import { z } from "zod";

const quoteSchema = z.object({
  priceLowSek: z.number().int().min(0).max(200000),
  priceHighSek: z.number().int().min(0).max(200000),
  note: z.string().describe("One plain sentence (max 160 chars) on what the price usually covers"),
});

// Chat runs on a cheap model; the price estimate is drafted by a stronger model only when this tool fires.
export function createSuggestWorkshopVisit(quoteModel: LanguageModel) {
  return tool({
    description: "Show the driver a card with what happens next: urgency, a rough indicative price range in SEK incl. 25% VAT (drafted by a pricing specialist), and a button to request a workshop visit. Call at most once per answer, only when the issue needs professional hands.",
    inputSchema: z.object({
      issue: z.string().max(80).describe("Short plain name of the job, e.g. 'Front brake pads'"),
      urgency: z.enum(["today", "this week", "soon", "next service"]),
      context: z.string().max(400).describe("What is known: symptoms, likely parts, mileage, car type if the driver named it"),
    }),
    execute: async ({ issue, urgency, context }, { abortSignal }) => {
      const result = streamText({
        model: quoteModel,
        instructions: "You estimate typical Swedish independent-workshop prices. Give a realistic SEK range including 25% VAT (parts + labour) for the job. Never mention confidential vehicle details. The note is one plain, friendly sentence on what the price usually covers.",
        prompt: `Job: ${issue}\nContext: ${context}`,
        output: Output.object({ schema: quoteSchema }),
        ...(abortSignal ? { abortSignal } : {}),
        providerOptions: { openai: { forceReasoning: true, reasoningEffort: "low", store: false } },
      });
      const q = await result.output;
      const low = Math.min(q.priceLowSek, q.priceHighSek), high = Math.max(q.priceLowSek, q.priceHighSek);
      return { shown: true, issue, urgency, priceLowSek: low, priceHighSek: high, note: q.note.slice(0, 160) };
    },
  });
}
