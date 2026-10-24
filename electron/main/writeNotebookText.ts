import { writeFile } from "node:fs/promises";

export function writeNotebookText(filePath: string, content: string, exclusive = false) {
  return writeFile(filePath, content, { encoding: "utf8", flag: exclusive ? "wx" : "w" });
}
