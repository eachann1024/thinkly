import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/page/titlebar/PageFileTitle.tsx#localMessages:1">`
zh-Hans:
  revealHint: "右键在{{app}}中显示"
  finder: "访达"
  fileManager: "文件管理器"
  pathCopied: "已复制绝对路径"
  copyPathFailed: "复制路径失败"
  desktopUnavailable: "桌面接口不可用"
  revealFailed: "无法在{{app}}中显示"
  copyFilePath: "{{name}}：复制绝对路径"
  copyPathHint: "点击复制绝对路径"
en:
  revealHint: "Right-click to reveal in {{app}}"
  finder: "Finder"
  fileManager: "file manager"
  pathCopied: "Full path copied"
  copyPathFailed: "Couldn’t copy the path"
  desktopUnavailable: "Desktop integration is unavailable"
  revealFailed: "Couldn’t reveal this file in {{app}}"
  copyFilePath: "{{name}}: copy full path"
  copyPathHint: "Click to copy the full path"
`;
const uiText = createTranslator(localMessages);
import { useShallow } from "zustand/react/shallow";
import { IconButton } from "@/components/ui/icon-button";
import { FileText, FolderOpen } from "@/components/ui/icons";
import { toast } from "@/components/ui/sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";

export function PageFileTitle({ page }: { page: Page }) {
  useLocale();
  const { filePath, fileName, isFolder } = usePages(useShallow((state) => {
    const current = state.pages[page.id] ?? page;
    return {
      filePath: current.localUnsaved || ("editorDraft" in current && current.editorDraft) || current.trashedAt
        ? undefined : current.localFilePath,
      fileName: getPageTitle(current),
      isFolder: Boolean(current.isFolder),
    };
  }));
  const FileIcon = isFolder ? FolderOpen : FileText;
  const fileManager = /Mac/i.test(navigator.platform) ? uiText("finder") : uiText("fileManager");
  const titleClassName = "page-file-title inline-flex min-w-0 max-w-full items-center gap-1 px-1 text-sm font-medium";
  const icon = <FileIcon className="h-4 w-4" aria-hidden="true" />;
  const name = <span className="truncate">{fileName}</span>;

  if (!filePath) {
    return (
      <span className={titleClassName}>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center">{icon}</span>
        {name}
      </span>
    );
  }

  const copyPath = async () => {
    try {
      const desktop = getGooseDesktop();
      if (desktop) await desktop.writeText(filePath);
      else await navigator.clipboard.writeText(filePath);
      toast.success(uiText("pathCopied"));
    } catch {
      toast.error(uiText("copyPathFailed"));
    }
  };
  const revealFile = async () => {
    try {
      const desktop = getGooseDesktop();
      if (!desktop) throw new Error(uiText("desktopUnavailable"));
      await desktop.showItemInFolder(filePath);
    } catch {
      toast.error(uiText("revealFailed", {app: fileManager}));
    }
  };

  return (
    <span className={titleClassName}>
      <TooltipProvider delayDuration={600}>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton
              size="sm"
              type="button"
              aria-label={uiText("copyFilePath", {name: fileName})}
              onClick={() => void copyPath()}
              onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void revealFile();
              }}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              {icon}
            </IconButton>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start">
            <span className="block">{uiText("copyPathHint")}</span>
            <span className="block">{uiText("revealHint", {app: fileManager})}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {name}
    </span>
  );
}
