import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/ImageExportChrome.tsx#localMessages:1">`
zh-Hans:
  generateImage: "生成图片"
  backToNote: "返回笔记"
  scope: "导出范围"
  page: "整页"
  selection: "选中内容"
  copy: "复制"
  saveImage: "保存图片"
  generating: "正在生成…"
en:
  generateImage: "Generate image"
  backToNote: "Back to note"
  scope: "Export range"
  page: "Whole page"
  selection: "Selection"
  copy: "Copy"
  saveImage: "Save image"
  generating: "Generating…"
ja:
  generateImage: "画像を生成"
  backToNote: "ノートに戻る"
  scope: "書き出し範囲"
  page: "ページ全体"
  selection: "選択範囲"
  copy: "コピー"
  saveImage: "画像を保存"
  generating: "生成しています…"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Download, LoaderCircle } from "@/components/ui/icons";
import { getPageTitle } from "@/components/editor/utils/page-title";
import { useImageExportView } from "@/stores/useImageExportView";
import type { Page } from "@/types";
import { DesktopWindowNavigation } from "../page/titlebar/DesktopWindowNavigation";
import { SegmentedTrack } from "./SegmentedTrack";

export function ImageExportElectronChrome({
  page,
  onBeforeActivateTab,
  onToggleSidebar,
  toggleSidebarCollapsed,
  sidebarCollapsed,
  toggleSidebarShortcutLabel,
}: {
  page?: Page;
  onBeforeActivateTab?: () => void;
  onToggleSidebar?: () => void;
  toggleSidebarCollapsed: () => void;
  sidebarCollapsed: boolean;
  toggleSidebarShortcutLabel: string;
}) {
  return (
    <>
      <DesktopWindowNavigation
        canGoBack
        canGoForward={false}
        onBack={() => useImageExportView.getState().exit()}
        backLabel={uiText("backToNote")}
        onBeforeActivateTab={onBeforeActivateTab}
        onToggleSidebar={onToggleSidebar}
        toggleSidebarCollapsed={toggleSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        toggleSidebarShortcutLabel={toggleSidebarShortcutLabel}
      />
      <div className="electron-document-header relative flex min-w-0 w-full flex-1 items-center justify-between gap-3">
        <ImageExportHeading page={page} />
        <ImageExportActions />
      </div>
    </>
  );
}

export function ImageExportToolbar({ page }: { page: Page }) {
  useLocale();
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        aria-label={uiText("backToNote")}
        onClick={() => useImageExportView.getState().exit()}
      >
        <ArrowLeft className="size-3.5" />
        {uiText("backToNote")}
      </Button>
      <ImageExportHeading page={page} />
      <div className="ml-auto">
        <ImageExportActions />
      </div>
    </div>
  );
}

function ImageExportHeading({ page }: { page?: Page }) {
  useLocale();
  const title = page ? getPageTitle(page) : "";
  return (
    <div className="flex min-w-0 items-baseline gap-2">
      <span className="shrink-0 text-sm font-medium">{uiText("generateImage")}</span>
      {title ? <span className="truncate text-sm text-muted-foreground">{title}</span> : null}
    </div>
  );
}

function ImageExportActions() {
  useLocale();
  const scope = useImageExportView((s) => s.scope);
  const busy = useImageExportView((s) => s.busy);
  const ratio = useImageExportView((s) => s.ratio);
  const blocks = useImageExportView((s) => s.blocks);
  const run = useImageExportView((s) => s.run);
  const blocked = (scope === "selection" && blocks.length === 0) || ratio === 0 || busy;
  return (
    <div className="flex shrink-0 items-center gap-2">
      <SegmentedTrack
        className="w-[168px]"
        label={uiText("scope")}
        value={scope}
        options={[
          { value: "page", label: uiText("page") },
          { value: "selection", label: uiText("selection") },
        ]}
        onChange={(next) => useImageExportView.getState().setScope(next)}
      />
      <Button type="button" variant="secondary" size="sm" className="gap-1.5" disabled={blocked} onClick={() => run?.("copy")}>
        <Copy className="size-3.5" />
        {uiText("copy")}
      </Button>
      <Button type="button" size="sm" className="min-w-[104px] gap-1.5" disabled={blocked} busy={busy} onClick={() => run?.("save")}>
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin motion-reduce:animate-none" />
        ) : (
          <Download className="size-3.5" />
        )}
        {busy ? uiText("generating") : uiText("saveImage")}
      </Button>
    </div>
  );
}
