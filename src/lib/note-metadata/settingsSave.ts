const settingsOnly = new Map<string, { token: number; blockMetadata: boolean }>();
let revision = 0;
export function markSettingsOnlySave(id: string, only: boolean, blockMetadata?: boolean): void {
  if (only) settingsOnly.set(id, { token: ++revision, blockMetadata: blockMetadata ?? settingsOnly.get(id)?.blockMetadata ?? false });
  else settingsOnly.delete(id);
}
export function settingsOnlySaveToken(id: string): number | undefined { return settingsOnly.get(id)?.token; }
export function isBlockMetadataOnlySave(id: string, token: number | undefined): boolean {
  const pending = settingsOnly.get(id);
  return pending?.token === token && pending?.blockMetadata === true;
}
export function finishSettingsOnlySave(id: string, token: number | undefined): void {
  if (token !== undefined && settingsOnly.get(id)?.token === token) settingsOnly.delete(id);
}

const fingerprints = new WeakMap<object, { raw: string | undefined; normalized?: string }>();
function fingerprint(value: unknown): { raw: string | undefined; normalized?: string } {
  if (!value || typeof value !== "object") return { raw: JSON.stringify(value) };
  let cached = fingerprints.get(value);
  if (!cached) {
    cached = { raw: JSON.stringify(value) };
    fingerprints.set(value, cached);
  }
  return cached;
}

function normalizedFingerprint(value: unknown, cached: { normalized?: string }): string {
  if (cached.normalized !== undefined) return cached.normalized;
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(item => normalize(item));
    if (!value || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    const omitted = new Set(["textColor", "backgroundColor", "textAlignment", "sequenceColumn"]);
    if (record.type === "codeBlock") ["summary", "collapsed", "wrap"].forEach(key => omitted.add(key));
    if (["image", "imageResize", "video"].includes(String(record.type))) {
      ["previewWidth", "showPreview"].forEach(key => omitted.add(key));
      if (record.type !== "video") omitted.add("width");
    }
    return Object.fromEntries(Object.entries(record).filter(([key]) => key !== "id").map(([key, item]) => [key,
      key === "props" && item && typeof item === "object"
        ? Object.fromEntries(Object.entries(item).filter(([prop]) => !omitted.has(prop)))
        : normalize(item)]).filter(([key, item]) => !["props", "styles", "children", "content"].includes(String(key)) ||
          !item || typeof item !== "object" || Object.keys(item).length > 0));
  };
  return cached.normalized = JSON.stringify(normalize(value));
}

export function isSidecarOnlyBlockChange(previous: unknown, next: unknown): boolean {
  if (previous === next) return false;
  const before = fingerprint(previous);
  const after = fingerprint(next);
  if (before.raw === after.raw) return false;
  return normalizedFingerprint(previous, before) === normalizedFingerprint(next, after);
}
