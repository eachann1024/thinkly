import path from "node:path";

export function createBuildInput(root: string) {
  return {
    index: path.resolve(root, "index.html"),
    assetMaintenance: path.resolve(root, "asset-maintenance.html"),
    previewRenderer: path.resolve(root, "preview-renderer.html"),
    quicknote: path.resolve(root, "quicknote.html"),
    search: path.resolve(root, "search.html"),
  };
}
