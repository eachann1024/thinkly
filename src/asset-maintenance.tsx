import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml, getFormatLocale, subscribeLanguage } from "@/i18n/core";
const assetText = createTranslator(i18nYaml<"src/asset-maintenance.tsx#block1:1">`
zh-Hans:
  previewUnavailable: "无法预览此格式，文件仍保留"
  title: "清理未引用图片与视频"
  intro: "选择本地文件夹笔记本，扫描并清理 assets 目录下未被任何笔记引用的图片与视频。"
  safety: "全面检索本地所有 Markdown 文件及未保存草稿，确保引用的媒体资源不被误删。"
  notebookLabel: "本地文件夹笔记本"
  loading: "正在读取笔记本…"
  selectNotebook: "选择笔记本"
  refresh: "刷新列表"
  busy: "正在处理…"
  scan: "扫描资源"
  list: "未引用资源列表"
  selectAllResources: "全选资源"
  selectAll: "全选"
  notScanned: "尚未扫描"
  checking: "正在检查引用，请稍候…"
  scanPrompt: "请选择笔记本后点击「扫描资源」。"
  noFiles: "没有发现未引用的图片或视频。"
  video: "视频"
  image: "图片"
  previewLabel: "资源预览"
  preview: "预览"
  previewPrompt: "点击资源查看图片或播放视频"
  trash: "移入废纸篓"
  recycle: "移入回收站"
  select: "选择 {{name}}"
  selectPreview: "选择并预览 {{name}}"
  summary_other: "{{count}} 个 · {{size}}"
  selected_other: "已选择 {{count}} 个。删除前再次检查引用；扫描结果 10 分钟内有效。"
  initFailed: "资源清理窗口初始化失败：{{reason}}"
  windowTitle: "资源清理 · 思绪 · Thinkly"
en:
  previewUnavailable: "This format can’t be previewed. The file is still available."
  title: "Clean up unreferenced images and videos"
  intro: "Select a local folder notebook to scan its assets folder for images and videos that aren’t referenced by any note."
  safety: "All local Markdown files and unsaved drafts are checked to protect referenced media from deletion."
  notebookLabel: "Local folder notebook"
  loading: "Loading notebooks…"
  selectNotebook: "Select a notebook"
  refresh: "Refresh list"
  busy: "Processing…"
  scan: "Scan attachments"
  list: "Unreferenced attachments"
  selectAllResources: "Select all attachments"
  selectAll: "Select all"
  notScanned: "Not scanned yet"
  checking: "Checking references. Please wait…"
  scanPrompt: "Select a notebook, then click Scan attachments."
  noFiles: "No unreferenced images or videos were found."
  video: "Video"
  image: "Image"
  previewLabel: "Attachment preview"
  preview: "Preview"
  previewPrompt: "Click an attachment to view an image or play a video"
  trash: "Move to Trash"
  recycle: "Move to Recycle Bin"
  select: "Select {{name}}"
  selectPreview: "Select and preview {{name}}"
  summary_other: "{{count}} items · {{size}}"
  summary_one: "{{count}} item · {{size}}"
  selected_other: "{{count}} items selected. References are checked again before removal. Scan results expire after 10 minutes."
  selected_one: "{{count}} item selected. References are checked again before removal. Scan results expire after 10 minutes."
  initFailed: "Couldn’t initialize attachment cleanup: {{reason}}"
  windowTitle: "Attachment Cleanup · Thinkly"
ja:
  previewUnavailable: "この形式はプレビューできません。ファイルは保持されています"
  title: "未参照の画像と動画をクリーンアップ"
  intro: "ローカルフォルダのノートブックを選択し、assets ディレクトリ内でどのノートからも参照されていない画像と動画をスキャンして整理します。"
  safety: "ローカルのすべての Markdown ファイルと未保存の下書きを徹底的に検索し、参照中のメディアリソースが誤って削除されないようにします。"
  notebookLabel: "ローカルフォルダのノートブック"
  loading: "ノートブックを読み込み中…"
  selectNotebook: "ノートブックを選択"
  refresh: "リストを更新"
  busy: "処理中…"
  scan: "リソースをスキャン"
  list: "未参照リソースのリスト"
  selectAllResources: "リソースをすべて選択"
  selectAll: "すべて選択"
  notScanned: "未スキャン"
  checking: "参照を確認しています。しばらくお待ちください…"
  scanPrompt: "ノートブックを選択して、「リソースをスキャン」をクリックしてください。"
  noFiles: "未参照の画像や動画は見つかりませんでした。"
  video: "動画"
  image: "画像"
  previewLabel: "リソースのプレビュー"
  preview: "プレビュー"
  previewPrompt: "リソースをクリックすると、画像の表示や動画の再生ができます"
  trash: "ゴミ箱に移動"
  recycle: "ごみ箱に移動"
  select: "{{name}} を選択"
  selectPreview: "{{name}} を選択してプレビュー"
  summary_other: "{{count}} 個 · {{size}}"
  selected_other: "{{count}} 個を選択中。削除前にもう一度参照を確認します。スキャン結果は 10 分間有効です。"
  initFailed: "リソースのクリーンアップウィンドウの初期化に失敗しました：{{reason}}"
  windowTitle: "リソースのクリーンアップ · Thinkly"
`);
const updateTitle = () => { document.title = assetText("windowTitle"); };
updateTitle();
subscribeLanguage(updateTitle);
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ChevronDown, Film, Image as ImageIcon, ScanSearch, Trash2 } from "@/components/ui/icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/stores/useSettings";
import { applyAppearanceSnapshot } from "@/lib/appearanceSync";
import { getLocalAssetKind } from "@/lib/local-folder-asset-maintenance";
import type { AssetScan } from "@/lib/asset-maintenance-contract";
import { useAssetMaintenanceState } from "@/hooks/useAssetMaintenanceState";
import "./index.css";
import "./fonts.css";

const bridge = window.gooseDesktop!.assetMaintenance;
type Asset = AssetScan["assets"][number];
function formatSize(bytes: number) {
  if (bytes < 1024) return `${new Intl.NumberFormat(getFormatLocale()).format(bytes)} B`;
  if (bytes < 1024 * 1024) return `${new Intl.NumberFormat(getFormatLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat(getFormatLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}
function AssetIcon({ asset }: { asset: Asset }) {
  return getLocalAssetKind(asset.name) === "video" ? <Film className="h-6 w-6" aria-hidden="true" /> : <ImageIcon className="h-6 w-6" aria-hidden="true" />;
}
function Preview({ asset, thumbnail = false }: { asset: Asset; thumbnail?: boolean }) {
  useLocale();
  const [failed, setFailed] = useState(false);
  const video = getLocalAssetKind(asset.name) === "video";
  if (failed || (thumbnail && video)) return <span className="flex flex-col items-center gap-2 text-muted-foreground"><AssetIcon asset={asset} />{!thumbnail && <span className="text-sm">{assetText("previewUnavailable")}</span>}</span>;
  if (video) return <video src={asset.previewUrl} controls preload="metadata" aria-label={asset.name} className="max-h-full max-w-full rounded-lg" onError={() => setFailed(true)} />;
  return <img src={asset.previewUrl} alt={thumbnail ? "" : asset.name} loading={thumbnail ? "lazy" : "eager"} className="max-h-full max-w-full rounded-lg object-contain" onError={() => setFailed(true)} />;
}

function AssetMaintenanceApp() {
  useLocale();
  const { notebooks, notebookId, scan, selected, previewPath, busy, loading, message, error,
    loadNotebooks, runScan, trash, toggle, selectNotebook, selectAll } = useAssetMaintenanceState(bridge);
  const preview = scan?.assets.find((asset) => asset.path === previewPath);
  const selectedNotebook = notebooks.find((notebook) => notebook.id === notebookId);
  const allSelected = !!scan?.assets.length && selected.size === scan.assets.length;
  const partiallySelected = selected.size > 0 && !allSelected;
  return <main className="flex h-screen flex-col gap-4 bg-background p-6 text-foreground">
    <header className="space-y-2">
      <h1 className="text-xl font-semibold">{assetText("title")}</h1>
      <p className="text-sm text-muted-foreground">{assetText("intro")}</p>
      <p className="text-xs text-muted-foreground">{assetText("safety")}</p>
    </header>
    <div className="flex items-end gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <Label id="asset-notebook-label" htmlFor="asset-notebook">{assetText("notebookLabel")}</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id="asset-notebook"
              type="button"
              variant="outline"
              disabled={busy || loading}
              aria-labelledby="asset-notebook-label asset-notebook-value"
              className="w-full justify-between text-left font-normal"
            >
              <span id="asset-notebook-value" className="truncate" title={selectedNotebook?.localPath}>
                {selectedNotebook ? `${selectedNotebook.name} — ${selectedNotebook.localPath}` : loading ? assetText("loading") : assetText("selectNotebook")}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96 max-w-full">
            <DropdownMenuRadioGroup
              value={notebookId}
              onValueChange={selectNotebook}
            >
              <DropdownMenuRadioItem value="" textValue={assetText("selectNotebook")}>{assetText("selectNotebook")}</DropdownMenuRadioItem>
              {notebooks.map((notebook) => (
                <DropdownMenuRadioItem key={notebook.id} value={notebook.id} textValue={`${notebook.name} — ${notebook.localPath}`}>
                  <span className="min-w-0" title={notebook.localPath}>
                    <span className="block truncate">{notebook.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{notebook.localPath}</span>
                  </span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button variant="secondary" disabled={busy || loading} onClick={() => void loadNotebooks()}>{assetText("refresh")}</Button>
      <Button disabled={!notebookId || busy || loading} onClick={() => void runScan()}><ScanSearch />{busy ? assetText("busy") : assetText("scan")}</Button>
    </div>
    {error && <p role="alert" className="rounded-lg bg-muted p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <div className="flex min-h-0 flex-1 gap-4">
      <section aria-label={assetText("list")} className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex items-center justify-between gap-3 border-b border-border p-3 text-sm">
          <Checkbox
            aria-label={assetText("selectAllResources")}
            isDisabled={busy || !scan?.assets.length}
            isSelected={allSelected}
            isIndeterminate={partiallySelected}
            onChange={selectAll}
            className="min-h-6 gap-2"
          >
            <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
            <span className="text-sm font-medium">{assetText("selectAll")}</span>
          </Checkbox>
          <span className="text-muted-foreground">{scan ? assetText("summary", { count: scan.assets.length, size: formatSize(scan.assets.reduce((sum, asset) => sum + asset.size, 0)) }) : assetText("notScanned")}</span>
        </div>
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-2">
            {!scan && <p className="p-6 text-sm text-muted-foreground">{busy ? assetText("checking") : assetText("scanPrompt")}</p>}
            {scan?.assets.length === 0 && <p className="p-6 text-sm text-muted-foreground">{assetText("noFiles")}</p>}
            {scan?.assets.map((asset) => <div key={asset.path} data-goose-slot="list-row" data-selected={previewPath === asset.path || undefined} className="goose-interactive mb-2 flex items-center gap-3 rounded-lg p-2">
              <Checkbox aria-label={assetText("select", { name: asset.name })} isSelected={selected.has(asset.path)} isDisabled={busy} onChange={() => toggle(asset.path)} className="min-h-6 min-w-6 shrink-0 justify-center">
                <Checkbox.Control><Checkbox.Indicator /></Checkbox.Control>
              </Checkbox>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => toggle(asset.path, true)} aria-label={assetText("selectPreview", { name: asset.name })} aria-pressed={selected.has(asset.path)} className="h-auto min-w-0 flex-1 justify-start gap-3 p-2 text-left">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted"><Preview key={`${scan.token}:${asset.path}`} asset={asset} thumbnail /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{asset.name}</span><span className="block truncate text-xs text-muted-foreground" title={asset.path}>{asset.relativePath}</span><span className="text-xs text-muted-foreground">{getLocalAssetKind(asset.name) === "video" ? assetText("video") : assetText("image")} · {formatSize(asset.size)}</span></span>
                <AssetIcon asset={asset} />
              </Button>
            </div>)}
          </div>
        </ScrollArea>
      </section>
      <section aria-label={assetText("previewLabel")} className="flex w-1/3 min-w-0 flex-col gap-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">{assetText("preview")}</h2>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted">{preview ? <Preview key={`${scan?.token}:${preview.path}`} asset={preview} /> : <p className="p-4 text-sm text-muted-foreground">{assetText("previewPrompt")}</p>}</div>
        {preview && <div className="space-y-2 text-sm"><p className="break-all font-medium">{preview.name}</p><p className="break-all text-xs text-muted-foreground">{preview.path}</p><p className="text-muted-foreground">{formatSize(preview.size)}</p></div>}
      </section>
    </div>
    <footer className="flex items-center justify-between gap-4"><p className="text-xs text-muted-foreground">{assetText("selected", { count: selected.size })}</p><Button variant="destructive" disabled={busy || !selected.size} onClick={() => void trash()}><Trash2 />{assetText(/Win/i.test(navigator.platform) ? "recycle" : "trash")}</Button></footer>
  </main>;
}

async function start() {
  await useSettings.persist.rehydrate();
  const appearance = await bridge.appearance();
  applyAppearanceSnapshot(appearance);
  createRoot(document.getElementById("root")!).render(<AssetMaintenanceApp />);
}
void start().catch((error) => { document.getElementById("root")!.textContent = assetText("initFailed", { reason: String(error) }); });
