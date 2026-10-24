export function releaseHeldWorkspace<T extends object>(
  held: { delete(win: T): unknown },
  win: T,
): void {
  held.delete(win);
}
