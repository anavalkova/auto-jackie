// Workshop-selectable AI quality tiers. The UI shows tiers; only the server maps them to models.
export type Tier = "economy" | "balanced" | "premium";
export const TIERS: Tier[] = ["economy", "balanced", "premium"];

export const TIER_INFO: Record<Tier, { label: string; cost: string; costFactor: number; text: string }> = {
  economy: { label: "Economy", cost: "1×", costFactor: 1, text: "Fast and light. Great for everyday questions." },
  balanced: { label: "Balanced", cost: "about 3×", costFactor: 3, text: "Smarter model, careful answers. Slightly slower." },
  premium: { label: "Premium", cost: "about 6×", costFactor: 6, text: "Smartest model with deeper thinking. Slowest and most expensive." },
};

export const DEFAULT_TIERS = { chat: "economy" as Tier, quote: "balanced" as Tier };

export function tierModel(tier: Tier | undefined | null): { model: string; effort: "low" | "medium" } {
  switch (tier) {
    case "premium": return { model: "openai/gpt-6-astra", effort: "medium" };
    case "balanced": return { model: "openai/gpt-6-astra", effort: "low" };
    default: return { model: "openai/gpt-5.6-luna", effort: "low" };
  }
}

export const asTier = (v: unknown, fallback: Tier): Tier => (TIERS as string[]).includes(String(v)) ? (v as Tier) : fallback;
