/** Serialize draft imports and completed turns through one conversation identity. */
export function createChatSaver(initialId: string | null = null) {
  let id = initialId;
  let pending: Promise<unknown> = Promise.resolve();
  return {
    save<T>(snapshot: T, write: (id: string | null, snapshot: T) => Promise<string>): Promise<string> {
      const next = pending.then(async () => {
        id = await write(id, snapshot);
        return id;
      });
      pending = next.catch(() => {});
      return next;
    },
  };
}