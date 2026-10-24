import { writeFile } from "node:fs/promises";

/** Frozen AI creates must fail atomically if any file already occupies the path. */
export function writeNotebookText(filePath: string, content: string, exclusive = false) {
  return writeFile(filePath, content, { encoding: "utf8", flag: exclusive ? "wx" : "w" });
}
