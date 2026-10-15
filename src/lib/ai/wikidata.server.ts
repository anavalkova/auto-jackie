import { tool } from "ai";
import { z } from "zod";

const BASE = "https://www.wikidata.org/w/rest.php/wikibase/v1";
const USER_AGENT = "AutoJackie/0.1 (car-service assistant; contact: hello@autojackie.se)";

// Properties worth surfacing for car parts and systems.
const PROPS: Record<string, string> = {
  P31: "instance of",
  P279: "subclass of",
  P361: "part of",
  P527: "has part(s)",
  P366: "has use",
  P1552: "has characteristic",
  P2283: "uses",
  P1269: "facet of",
  P186: "made from material",
};

async function wd(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Wikidata returned ${res.status}`);
  return res.json();
}

export const searchWikidata = tool({
  description: "Search Wikidata for an automotive concept (part, system, symptom-related component). Returns item IDs, labels and short descriptions.",
  inputSchema: z.object({ query: z.string().min(2).max(120).describe("English search term, e.g. 'timing belt'") }),
  execute: async ({ query }) => {
    const data = await wd(`/search/items?q=${encodeURIComponent(query)}&language=en&limit=6`);
    const results = (data.results ?? [])
      .filter((r: { description?: { value?: string } }) => !/disambiguation/i.test(r.description?.value ?? ""))
      .map((r: { id: string; "display-label"?: { value: string }; description?: { value: string } }) => ({
        id: r.id,
        label: r["display-label"]?.value ?? r.id,
        description: r.description?.value ?? "",
        url: `https://www.wikidata.org/wiki/${r.id}`,
      }));
    return { query, results };
  },
});

export const getWikidataItem = tool({
  description: "Fetch the factual record for one Wikidata item by ID (e.g. Q1132815): label, description, aliases, key relations and English Wikipedia title.",
  inputSchema: z.object({ id: z.string().regex(/^Q\d+$/).describe("Wikidata item ID") }),
  execute: async ({ id }) => {
    const item = await wd(`/entities/items/${id}`);
    const relations: Record<string, string[]> = {};
    const linkedIds = new Set<string>();
    for (const [pid, name] of Object.entries(PROPS)) {
      const statements = (item.statements?.[pid] ?? []) as { value?: { content?: unknown } }[];
      const ids = statements.map((s) => s.value?.content).filter((v): v is string => typeof v === "string" && /^Q\d+$/.test(v)).slice(0, 8);
      if (ids.length) { relations[name] = ids; ids.forEach((q) => linkedIds.add(q)); }
    }
    // Resolve labels of linked items so the model can read them.
    const labels: Record<string, string> = {};
    await Promise.all([...linkedIds].slice(0, 20).map(async (q) => {
      try {
        const l = await wd(`/entities/items/${q}/labels/en`);
        if (typeof l === "string") labels[q] = l;
      } catch { /* label missing — keep the ID */ }
    }));
    const named = Object.fromEntries(Object.entries(relations).map(([k, ids]) => [k, ids.map((q) => labels[q] ? `${labels[q]} (${q})` : q)]));
    return {
      id,
      label: item.labels?.en ?? id,
      description: item.descriptions?.en ?? "",
      aliases: (item.aliases?.en ?? []).slice(0, 8),
      relations: named,
      wikipedia: item.sitelinks?.enwiki?.url ?? null,
      url: `https://www.wikidata.org/wiki/${id}`,
    };
  },
});
