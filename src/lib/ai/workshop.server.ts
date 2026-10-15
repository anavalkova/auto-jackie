import { tool } from "ai";
import { z } from "zod";

export const suggestWorkshopVisit = tool({
  description: "Show the driver a card with what happens next: urgency, a rough indicative price range in SEK incl. 25% VAT, and a button to request a workshop visit. Call at most once per answer, only when the issue needs professional hands.",
  inputSchema: z.object({
    issue: z.string().max(80).describe("Short plain name of the job, e.g. 'Front brake pads'"),
    urgency: z.enum(["today", "this week", "soon", "next service"]),
    priceLowSek: z.number().int().min(0).max(200000),
    priceHighSek: z.number().int().min(0).max(200000),
    note: z.string().max(160).describe("One plain sentence on what the price usually covers"),
  }),
  execute: async (input) => ({ shown: true, ...input }),
});
