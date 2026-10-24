import { getLocalMdSnapshot, isDiskContentMatchingSnapshot } from "@/lib/local-md-snapshot";

export async function hasExternalDiskChange(
  filePath: string,
  pageId: string,
  source: "pre-save" | "pre-write",
): Promise<boolean> {
  const hadSnapshot = getLocalMdSnapshot(filePath) !== undefined;
  try {
    let diskCurrentContent: string | null = null;
    if (window.gooseFs?.readFileStatAsync) {
      const r = await window.gooseFs.readFileStatAsync(filePath);
      if (!r.ok && hadSnapshot) throw new Error(r.error || "EIO: cannot verify original file before saving");
      diskCurrentContent = r.ok ? (r.content ?? "") : null;
    } else if (window.gooseFs?.readFileStat) {
      const r = window.gooseFs.readFileStat(filePath);
      if (!r.ok && hadSnapshot) throw new Error(r.error || "EIO: cannot verify original file before saving");
      diskCurrentContent = r.ok ? (r.content ?? "") : null;
    } else if (window.gooseFs?.readFileAsync) {
      diskCurrentContent = await window.gooseFs.readFileAsync(filePath);
    } else if (window.gooseFs?.readFile) {
      diskCurrentContent = window.gooseFs.readFile(filePath);
    }

    if (diskCurrentContent === null && hadSnapshot) {
      throw new Error("EIO: cannot verify original file before saving");
    }
    if (
      diskCurrentContent !== null &&
      !isDiskContentMatchingSnapshot(filePath, diskCurrentContent)
    ) {
      window.dispatchEvent(
        new CustomEvent("goose-note:local-file-conflict", {
          detail: { pageId, filePath, source },
        }),
      );
      return true;
    }
  } catch (error) {
    if (hadSnapshot) throw error;
  }
  return false;
}
