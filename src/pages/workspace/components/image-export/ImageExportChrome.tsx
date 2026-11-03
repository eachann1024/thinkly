import { useLocale, createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/image-export/ImageExportChrome.tsx#localMessages:1">`
zh-Hans:
  scope: "导出范围"
  page: "整页"
  selection: "选中内容"
  copy: "复制"
  saveImage: "保存图片"
  generating: "正在生成…"
en:
  scope: "Export range"
  page: "Whole page"
  selection: "Selection"
  copy: "Copy"
  saveImage: "Save image"
  generating: "Generating…"
ja:
  scope: "書き出し範囲"
  page: "ページ全体"
  selection: "選択範囲"
  copy: "コピー"
  saveImage: "画像を保存"
  generating: "生成しています…"
`;
const uiText = createTranslator(localMessages);
import { Button } from "@/components/ui/button";
import { Copy, Download, LoaderCircle } from "@/components/ui/icons";
import {
  sessionBlocks,
  useImageExportSession,
} from "@/windows/views/image-export/imageExportSession";
import { SegmentedTrack } from "./SegmentedTrack";

export function ImageExportActions() {
  useLocale();
  const scope = useImageExportSession((s) => s.scope);
  const busy = useImageExportSession((s) => s.busy);
  const ratio = useImageExportSession((s) => s.ratio);
  const blocks = useImageExportSession(sessionBlocks);
  const run = useImageExportSession((s) => s.run);
  const blocked = (scope === "selection" && blocks.length === 0) || ratio === 0 || busy;
  return (
    <div className="flex shrink-0 items-center gap-2" data-electron-no-drag>
      <SegmentedTrack
        className="w-[168px]"
        label={uiText("scope")}
        value={scope}
        options={[
          { value: "page", label: uiText("page") },
          { value: "selection", label: uiText("selection") },
        ]}
        onChange={(next) => useImageExportSession.getState().setScope(next)}
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
