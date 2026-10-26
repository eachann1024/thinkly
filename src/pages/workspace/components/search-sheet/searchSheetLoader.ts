type SearchSheetModule = { default: typeof import("./SearchSheet").SearchSheet };
let loaded: SearchSheetModule | null = null;
let pending: Promise<SearchSheetModule> | null = null;

export function getLoadedSearchSheet() {
  return loaded;
}

export function loadSearchSheet() {
  pending ??= import("./SearchSheet")
    .then((module) => (loaded = { default: module.SearchSheet }))
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });
  return pending;
}

export function preloadSearchSheet(): void {
  void loadSearchSheet().catch((error: unknown) => {
    console.error("Search sheet preload failed", error);
  });
}
