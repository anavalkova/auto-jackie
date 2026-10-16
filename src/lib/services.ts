// Workshop service list helpers. "Other" is the always-present escape hatch for jobs the owner prices personally.
export const OTHER = "Other";
export type ServiceItem = { task: string; price_sek: number; minutes?: number };

export function ensureOther<T extends ServiceItem>(list: T[]): T[] {
  return list.some(s => s.task === OTHER) ? list : [...list, { task: OTHER, price_sek: 0, minutes: 60 } as T];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9åäöü]+/g, " ").trim();

/** Best matching service name from the workshop's list, or "Other". */
export function matchService(issue: string, list: ServiceItem[]): string {
  const q = norm(issue);
  if (!q) return OTHER;
  const named = list.filter(s => s.task !== OTHER);
  const exact = named.find(s => norm(s.task) === q);
  if (exact) return exact.task;
  const qWords = new Set(q.split(" ").filter(w => w.length > 2));
  let best = { task: OTHER, score: 0 };
  for (const s of named) {
    const words = norm(s.task).split(" ").filter(w => w.length > 2);
    const hits = words.filter(w => [...qWords].some(x => x.startsWith(w.slice(0, 5)) || w.startsWith(x.slice(0, 5)))).length;
    const score = words.length ? hits / words.length : 0;
    if (score > best.score) best = { task: s.task, score };
  }
  return best.score >= 0.5 ? best.task : OTHER;
}
