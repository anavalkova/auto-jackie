type WorkshopChoice = { id: string; slug?: string | null };

// This is a navigation preference, never an authorization source.
export function selectWorkshop<T extends WorkshopChoice>(workshops: T[], rememberedId: string | null): T | null {
  return workshops.find(workshop => workshop.id === rememberedId) ?? workshops[0] ?? null;
}

export function readWorkshopSelection(userId: string): string | null {
  try { return localStorage.getItem(`autojackie.workshop.${userId}`); } catch { return null; }
}

export function rememberWorkshopSelection(userId: string, workshopId: string): void {
  try { localStorage.setItem(`autojackie.workshop.${userId}`, workshopId); } catch { /* private mode */ }
}