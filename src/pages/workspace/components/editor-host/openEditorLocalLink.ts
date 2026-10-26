import { editorPlatform } from "@/lib/editor-platform/resolve";
import { openAssociatedMarkdownFile } from "@/lib/openAssociatedMarkdown";
import { comparisonLocalPath, localPathsAreCaseInsensitive } from "@/lib/canonicalLocalPath";
import { requestEditorLinkAnchor } from "@/components/editor/utils/editorLinkAnchor";
import { usePages } from "@/stores/usePages";

export async function openEditorLocalLink(path: string, fragment: string): Promise<boolean> {
  const { fs, shell } = editorPlatform;
  if (!fs.isAvailable()) return false;
  let target = path;
  let stat = await fs.readFileStatAsync(target);
  if (!stat && !/\.[^/\\]+$/.test(target)) {
    target = `${path}.md`;
    stat = await fs.readFileStatAsync(target);
  }
  if (!stat) return false;
  if (stat.isDirectory) {
    for (const name of ["README.md", "index.md"]) {
      const candidate = `${target.replace(/\/$/, "")}/${name}`;
      if ((await fs.readFileStatAsync(candidate))?.isFile) {
        target = candidate;
        stat = { isFile: true, isDirectory: false };
        break;
      }
    }
  }
  if (!stat.isFile || !/\.(?:md|markdown)$/i.test(target)) return shell.openPath(target);
  const opened = await openAssociatedMarkdownFile(target);
  if (opened && fragment) {
    const key = comparisonLocalPath(target, localPathsAreCaseInsensitive());
    const page = Object.values(usePages.getState().pages).find((candidate) =>
      !candidate.trashedAt && candidate.localFilePath &&
      comparisonLocalPath(candidate.localFilePath, localPathsAreCaseInsensitive()) === key);
    if (page) requestEditorLinkAnchor(page.id, fragment);
  }
  return opened;
}
