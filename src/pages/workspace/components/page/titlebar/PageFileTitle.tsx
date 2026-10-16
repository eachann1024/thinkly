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
  const fileManager = /Mac/i.test(navigator.platform) ? "访达" : "文件管理器";
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
      toast.success("已复制绝对路径");
    } catch {
      toast.error("复制路径失败");
    }
  };
  const revealFile = async () => {
    try {
      const desktop = getGooseDesktop();
      if (!desktop) throw new Error("桌面接口不可用");
      await desktop.showItemInFolder(filePath);
    } catch {
      toast.error(`无法在${fileManager}中显示`);
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
              aria-label={`${fileName}：复制绝对路径`}
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
            <span className="block">点击复制绝对路径</span>
            <span className="block">右键在{fileManager}中显示</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {name}
    </span>
  );
}
