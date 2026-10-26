import { normalizeLocalPathSlashes } from "../canonicalLocalPath";
import { NoteMetadataError, type NoteMetadataFs } from "./contract";

function pathRoot(path: string): string | null {
  const network = path.match(/^\/\/[^/]+\/[^/]+(?:\/|$)/);
  if (network) return network[0].replace(/\/$/, "");
  const drive = path.match(/^[a-z]:\//i);
  if (drive) return drive[0];
  return path.startsWith("/") && !path.startsWith("//") ? "/" : null;
}

export async function resolveStandaloneMetadataRoot(fs: NoteMetadataFs, filePath: string): Promise<string> {
  const normalized = normalizeLocalPathSlashes(filePath);
  const root = pathRoot(normalized);
  if (!root || normalized === root || normalized.endsWith("/") ||
    normalized.split("/").some(part => part === "." || part === "..")) {
    throw new NoteMetadataError("unsafe-path", "Standalone Markdown path must be an absolute file path");
  }
  const separator = normalized.lastIndexOf("/");
  const parent = normalized.slice(0, Math.max(separator, root.length));
  if (!fs.existsAsync) return parent;
  let directory = parent;
  while (true) {
    if (await fs.existsAsync(`${directory.replace(/\/$/, "")}/.goose`)) return directory;
    if (directory === root) return parent;
    directory = directory.slice(0, Math.max(directory.lastIndexOf("/"), root.length));
  }
}
