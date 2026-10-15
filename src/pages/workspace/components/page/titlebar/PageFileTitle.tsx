import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
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
      fileName: current.localFilePath?.split(/[\\/]/).pop() || getPageTitle(current),
      isFolder: Boolean(current.isFolder),
    };
  }));
  const FileIcon = isFolder ? FolderOpen : FileText;
  const fileManager = /Mac/i.test(navigator.platform) ? "访达" : "文件管理器";
  const title = (
    <>
      <FileIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{fileName}</span>
    </>
  );

  if (!filePath) {
    return <span className="inline-flex min-w-0 items-center gap-2 px-2 text-sm font-medium">{title}</span>;
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
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={fileName}
            onClick={() => void copyPath()}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void revealFile();
            }}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {title}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span className="block max-w-[min(36rem,calc(100vw-2rem))] break-all">{filePath}</span>
          <span className="block">点击复制绝对路径到剪贴板 · 右键在{fileManager}中显示</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
