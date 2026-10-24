
export const INTERNAL_ASSET_REF_PREFIXES = [
  "att:",
  "att-file:",
  "att-video:",
  "uuid:",
] as const;

export function isInternalAssetRef(ref: string): boolean {
  return INTERNAL_ASSET_REF_PREFIXES.some((prefix) => ref.startsWith(prefix));
}
