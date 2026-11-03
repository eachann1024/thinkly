import { writeFile } from "node:fs/promises";
import { compareAndSwapText } from "./compareAndSwapText";

export async function writeNotebookText(
  filePath: string, content: string, exclusive = false, beforeCommit: () => void = () => {},
): Promise<void> {
  if (!exclusive) {
    await writeFile(filePath, content, { encoding: "utf8", flag: "w" });
    return;
  }
  if (!await compareAndSwapText(filePath, null, content, beforeCommit)) {
    throw Object.assign(new Error(`EEXIST: file already exists, open '${filePath}'`), {
      code: "EEXIST", syscall: "open", path: filePath,
    });
  }
}
