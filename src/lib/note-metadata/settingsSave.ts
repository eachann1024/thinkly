const settingsOnly = new Map<string, number>();
let revision = 0;
export function markSettingsOnlySave(id: string, only: boolean): void {
  if (only) settingsOnly.set(id, ++revision); else settingsOnly.delete(id);
}
export function settingsOnlySaveToken(id: string): number | undefined { return settingsOnly.get(id); }
export function finishSettingsOnlySave(id: string, token: number | undefined): void {
  if (token !== undefined && settingsOnly.get(id) === token) settingsOnly.delete(id);
}
