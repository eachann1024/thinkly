const preparations = new Map<string, Promise<unknown>>();

export async function withBatchPreparationLock<T>(key: string, prepare: () => Promise<T>): Promise<T> {
  const previous = preparations.get(key);
  const current = (previous ? previous.catch(() => undefined) : Promise.resolve()).then(prepare);
  preparations.set(key, current);
  try {
    return await current;
  } finally {
    if (preparations.get(key) === current) preparations.delete(key);
  }
}
