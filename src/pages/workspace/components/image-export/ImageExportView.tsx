import type { Page } from "@/types";
import { OptionsRail } from "./OptionsRail";
import { PreviewStage } from "./PreviewStage";
import { ThemeRail } from "./ThemeRail";
import { useImageExportActions } from "./useImageExportActions";

export function ImageExportView({ page }: { page: Page }) {
  useImageExportActions(page.id);
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <ThemeRail page={page} />
      <PreviewStage page={page} />
      <OptionsRail page={page} />
    </div>
  );
}
