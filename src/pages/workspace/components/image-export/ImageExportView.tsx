import type { NotebookCardThemeContext } from "@/lib/imageExport";
import type { Page } from "@/types";
import { useImageExportActions } from "./useImageExportActions";
import { OptionsRail } from "./OptionsRail";
import { PreviewStage } from "./PreviewStage";
import { ThemeRail } from "./ThemeRail";

export function ImageExportView({
  page,
  themeContext,
}: {
  page: Page;
  themeContext: NotebookCardThemeContext;
}) {
  useImageExportActions(page);
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <ThemeRail themeContext={themeContext} />
      <PreviewStage page={page} themeContext={themeContext} />
      <OptionsRail themeContext={themeContext} />
    </div>
  );
}
