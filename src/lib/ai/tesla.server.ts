import { tool } from "ai";
import { z } from "zod";
import index from "@/lib/vehicles-data/tesla-model3-manual.json";

// Table of contents of Tesla's public Model 3 (2017–2023) service manual.
const BASE = "https://service.tesla.com/docs/Model3/ServiceManual/en-us/";
const pages = (index as [string, string][]).map(([id, title]) => ({ id, title, lower: title.toLowerCase() }));
const url = (id: string) => `${BASE}GUID-${id}.html`;

export const searchTeslaManual = tool({
  description: "Search the official Tesla Model 3 (2017–2023) service manual table of contents. Use only when the driver says their car is a Tesla Model 3 or asks about one.",
  inputSchema: z.object({ query: z.string().min(2).max(80).describe("English keywords, e.g. 'brake caliper' or '12V battery'") }),
  execute: async ({ query }) => {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const results = pages
      .map((p) => ({ p, score: words.filter((w) => p.lower.includes(w)).length }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ p }) => ({ id: p.id, title: p.title, url: url(p.id) }));
    return { query, results };
  },
});

export const readTeslaManualPage = tool({
  description: "Read one page of the official Tesla Model 3 service manual by its id from searchTeslaManual.",
  inputSchema: z.object({ id: z.string().regex(/^[0-9A-F-]{36}$/i) }),
  execute: async ({ id }) => {
    const page = pages.find((p) => p.id.toLowerCase() === id.toLowerCase());
    if (!page) return { error: "Unknown page id" };
    const res = await fetch(url(page.id), { headers: { "User-Agent": "Mozilla/5.0 (AutoJackie)" } });
    if (!res.ok) return { error: `Tesla manual returned ${res.status}` };
    const html = await res.text();
    const body = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
    const text = body.replace(/<(script|style)[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    return { title: page.title, url: url(page.id), text: text.slice(0, 6000) };
  },
});
