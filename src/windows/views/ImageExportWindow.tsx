import { useEffect, useMemo } from "react";
import { useLocale, createTranslator, i18nYaml } from "@/i18n";
import { Toaster } from "@/components/ui/sonner";
import { parseImageExportWindowPayload } from "@/lib/imageExport/imageExportWindow";
import type { NotebookCardThemeContext } from "@/lib/imageExport";
import { ImageExportActions } from "@/pages/workspace/components/image-export/ImageExportChrome";
import { ImageExportView } from "@/pages/workspace/components/image-export/ImageExportView";
import type { Page } from "@/types";
import { applyImageExportSettingsInMain, useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { useImageExportSession } from "./image-export/imageExportSession";

const messages = i18nYaml<"src/windows/views/ImageExportWindow.tsx#messages:1">`
zh-Hans:
  title: "生成图片"
  unavailable: "无法打开这份笔记的图片导出。"
en:
  title: "Generate image"
  unavailable: "This note can’t be opened for image export."
ja:
  title: "画像を生成"
  unavailable: "このノートの画像書き出しを開けません。"
`;
const t = createTranslator(messages);

export function ImageExportWindow() {
  useLocale();
  const { payload, resizable } = useAuxiliaryWindow();
  const source = useMemo(() => parseImageExportWindowPayload(payload), [payload]);
  const loaded = useImageExportSession((state) => state.source);
  const themeId = useImageExportSession((state) => state.themeId);
  const watermark = useImageExportSession((state) => state.watermark);

  useEffect(() => {
    if (source) useImageExportSession.getState().load(source);
  }, [source]);

  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      void applyImageExportSettingsInMain({ themeId, watermark });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loaded, themeId, watermark]);

  const page = useMemo(() => (source ? snapshotPage(source) : null), [source]);
  const themeContext = useMemo<NotebookCardThemeContext | null>(
    () =>
      source
        ? {
            fontFamily: source.fontFamily,
            editorFontSize: source.editorFontSize,
            resolvedTheme: source.isDark ? "dark" : "light",
          }
        : null,
    [source],
  );

  return (
    <StandaloneWindowShell
      title={t("title")}
      context={source?.title}
      inset={false}
      maximizable={resizable}
      actions={source && page ? <ImageExportActions /> : null}
    >
      {source && page && themeContext ? (
        <ImageExportView page={page} themeContext={themeContext} />
      ) : (
        <p className="p-6 text-sm text-muted-foreground">{t("unavailable")}</p>
      )}
      <Toaster />
    </StandaloneWindowShell>
  );
}

function snapshotPage(source: NonNullable<ReturnType<typeof parseImageExportWindowPayload>>): Page {
  return {
    id: source.pageId,
    workspaceId: "",
    content: source.pageContent,
    isLocked: false,
    fontSize: "default",
    fontFamily: source.fontFamily,
    localFilePath: source.localFilePath,
    createdAt: 0,
    updatedAt: 0,
  };
}
