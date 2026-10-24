import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/local-file-icon.tsx#localMessages:1">`
zh-Hans:
  couldNotReadMarkdownFile_6724: "Markdown 文件读取失败"
en:
  couldNotReadMarkdownFile_6724: "Could not read Markdown file"
ja:
  couldNotReadMarkdownFile_6724: "Markdown ファイルを読み込めませんでした"
`;
const uiText = createTranslator(localMessages);
import * as GooseIcons from "@/components/ui/icons";
import { resolvePageIcon } from "@/lib/resolvePageIcon";
import type { Page } from "@/types";
import type { LocalFolderLoadStatus } from "@/stores/useNotebooks";

interface LocalFileIconProps {
  page: Page;
  iconName?: string;
  isLocalFolder: boolean;
  className?: string;
  hasChildren?: boolean;
  isExpanded?: boolean;
}

export function isSidebarFolderRow({
  isFolder,
  hasChildren,
  isLocalNotebook,
}: {
  isFolder: boolean;
  hasChildren: boolean;
  isLocalNotebook: boolean;
}): boolean {
  return isLocalNotebook ? isFolder : hasChildren;
}

export function shouldShowFolderExpandArrow(args: {
  isFolder: boolean;
  hasChildren: boolean;
  isLocalNotebook: boolean;
}): boolean {
  return isSidebarFolderRow(args);
}

export function shouldShowEmptyFolderPlaceholder({
  isFolderRow,
  isExpanded,
  hasChildren,
  isLocalNotebook,
  localLoadStatus,
}: {
  isFolderRow: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  isLocalNotebook: boolean;
  localLoadStatus?: LocalFolderLoadStatus;
}): boolean {
  if (!isFolderRow || !isExpanded || hasChildren) return false;
  if (isLocalNotebook && (localLoadStatus === "loading" || localLoadStatus === "error")) {
    return false;
  }
  return true;
}

function nodeHasVisibleContent(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const value = node as {
    text?: unknown;
    content?: unknown;
    type?: unknown;
  };

  if (typeof value.text === "string" && value.text.trim().length > 0) {
    return true;
  }

  const children = Array.isArray(value.content) ? value.content : [];
  if (children.some((child: unknown) => nodeHasVisibleContent(child))) {
    return true;
  }

  if (
    value.type === "doc" ||
    value.type === "paragraph" ||
    value.type === "heading" ||
    value.type === "text" ||
    value.type === "hardBreak"
  ) {
    return false;
  }

  return typeof value.type === "string" && value.type.length > 0;
}

const visibleContentCache = new WeakMap<object, boolean>();

function pageHasVisibleContent(page: Page): boolean {
  const content = page.content;
  if (!content || typeof content !== "object") return false;
  const cached = visibleContentCache.get(content);
  if (cached !== undefined) return cached;
  const result = nodeHasVisibleContent(content);
  visibleContentCache.set(content, result);
  return result;
}

export function LocalFileIcon({
  page,
  iconName,
  isLocalFolder,
  className,
  hasChildren,
  isExpanded,
}: LocalFileIconProps) {
  useLocale();
  const SelectedIcon = resolvePageIcon(iconName);

  if (page.localReadState === "error") {
    return (
      <GooseIcons.CircleX
        size={16}
        className={cn("h-4 w-4 text-danger", className)}
        aria-label={page.localReadError || uiText("couldNotReadMarkdownFile_6724")}
      />
    );
  }

  if (isLocalFolder && page.isFolder) {
    const Icon =
      SelectedIcon ?? (isExpanded ? GooseIcons.FolderOpen : GooseIcons.Folder);
    return (
      <Icon
        size={16}
        className={cn(
          "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
          className,
        )}
      />
    );
  }

  if (SelectedIcon) {
    return (
      <SelectedIcon
        size={16}
        className={cn(
          "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
          className,
        )}
      />
    );
  }

  const DefaultPageIcon = isLocalFolder
    ? GooseIcons.FileMd
    : pageHasVisibleContent(page) ? GooseIcons.FileText : GooseIcons.File;

  if (isLocalFolder) {
    return (
      <DefaultPageIcon
        size={16}
        className={cn(
          "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
          className,
        )}
      />
    );
  }

  if (hasChildren) {
    const FolderStateIcon = isExpanded ? GooseIcons.FolderOpen : GooseIcons.Folder;
    return (
      <FolderStateIcon
        size={16}
        className={cn(
          "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
          className,
        )}
      />
    );
  }

  if (page.isFolder) {
    const FolderIcon = isExpanded ? GooseIcons.FolderOpen : GooseIcons.Folder;
    return (
      <FolderIcon
        size={16}
        className={cn(
          "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
          className,
        )}
      />
    );
  }

  return (
    <DefaultPageIcon
      size={16}
      className={cn(
        "h-4 w-4 text-muted-foreground dark:text-muted-foreground",
        className,
      )}
    />
  );
}
