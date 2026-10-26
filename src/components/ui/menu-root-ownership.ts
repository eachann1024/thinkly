type MenuOwner = { id: string; close: () => void };
let current: MenuOwner | undefined;

export function claimMenuRoot(id: string, close: () => void) {
  const previous = current;
  current = { id, close };
  if (previous?.id !== id) previous?.close();
}

export function releaseMenuRoot(id: string) {
  if (current?.id === id) current = undefined;
}
