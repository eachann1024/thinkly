const notebookCreationTails = new Map<string, Promise<void>>();

export async function queueLocalPageCreation<T>(
  workspaceId: string,
  create: () => Promise<T>,
): Promise<T> {
  const previous = notebookCreationTails.get(workspaceId) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => { release = resolve; });
  notebookCreationTails.set(workspaceId, current);
  await previous;
  try {
    return await create();
  } finally {
    if (notebookCreationTails.get(workspaceId) === current) {
      notebookCreationTails.delete(workspaceId);
    }
    release();
  }
}
