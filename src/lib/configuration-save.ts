/** Demo edits are local only, even when the visitor owns the demo workshop. */
export async function saveWorkshopConfiguration(canEdit: boolean, demo: boolean, persist: () => Promise<void>) {
  if (!canEdit || demo) return;
  await persist();
}