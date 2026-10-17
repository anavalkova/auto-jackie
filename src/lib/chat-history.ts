export const CHAT_HISTORY_PAGE_SIZE = 3;
export function chatHistoryRange(page: number) {
  const from = Math.max(0, page) * CHAT_HISTORY_PAGE_SIZE;
  return { from, to: from + CHAT_HISTORY_PAGE_SIZE - 1 };
}