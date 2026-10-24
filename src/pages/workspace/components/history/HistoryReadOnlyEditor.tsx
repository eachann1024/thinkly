import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote, BlockNoteViewRaw as BlockNoteView } from "@blocknote/react";
import { createLiveEditorDictionary } from "@/components/editor/core/editorLocale";
import { useEditorLocale } from "@/components/editor/core/useEditorLocale";
import * as GooseIcons from "@/components/ui/icons";
import "@blocknote/react/style.css";
import { useSettings } from "@/stores/useSettings";
import { usePages } from "@/stores/usePages";
import {
  createEditorSafeContent,
  normalizePageContent,
  type BlockNoteContent,
} from "@/components/editor/utils/blocknote-content";
import { editorSchema } from "@/components/editor/core/EditorComposer";
import { cn } from "@/lib/utils";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import type { Page } from "@/types";
import { EditorHostBridge } from "../editor-host/EditorHostBridge";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/pages/workspace/components/history/HistoryReadOnlyEditor.tsx#messages:1">`
zh-Hans:
  thisNoteCannotBePreviewed: "此笔记无法预览"
  thisVersionCannotBeDisplayed: "此历史版本无法显示"
  theContentMayUseAnOlderFormatOr: "内容可能来自旧版格式或包含无法解析的数据。"
  thisNoteCouldNotBeFoundSoIts: "找不到此笔记，无法预览历史版本。"
en:
  thisNoteCannotBePreviewed: "This note cannot be previewed"
  thisVersionCannotBeDisplayed: "This version cannot be displayed"
  theContentMayUseAnOlderFormatOr: "The content may use an older format or contain data that cannot be read."
  thisNoteCouldNotBeFoundSoIts: "This note could not be found, so its history cannot be previewed."
ja:
  thisNoteCannotBePreviewed: "このノートはプレビューできません"
  thisVersionCannotBeDisplayed: "この履歴バージョンは表示できません"
  theContentMayUseAnOlderFormatOr: "内容が古い形式であるか、解析できないデータを含んでいる可能性があります。"
  thisNoteCouldNotBeFoundSoIts: "このノートが見つからないため、履歴バージョンをプレビューできません。"
`;
const t = createTranslator(messages);


const ignoreReadOnlyContentChange = () => {};

interface HistoryReadOnlyEditorProps {
  content: BlockNoteContent;
  versionKey: string;
  sourcePage?: Page;
}

export function HistoryReadOnlyEditor({
  content,
  versionKey,
  sourcePage,
}: HistoryReadOnlyEditorProps) {
  const theme = useSettings((s) => s.theme);
  const activePage = usePages((s) =>
    sourcePage ?? (s.activePageId ? s.pages[s.activePageId] : null),
  );
  const previewPage = useMemo(
    () => activePage ? { ...activePage, content, isLocked: true } : null,
    [activePage, content],
  );
  const sourcePageRef = useRef(sourcePage);
  sourcePageRef.current = sourcePage;
  const effectiveTheme = useResolvedTheme(theme);
  const [renderError, setRenderError] = useState(false);

  const normalized = useMemo(
    () => createEditorSafeContent(normalizePageContent(content as any), editorSchema),
    [content],
  );

  const editor = useCreateBlockNote({
    initialContent: normalized as any,
    schema: editorSchema,
    dictionary: createLiveEditorDictionary("history"),
    domAttributes: {
      editor: {
        class: "goose-blocknote-editor",
        spellcheck: "false",
      },
    },
    resolveFileUrl: async (url) => {
      const { resolveImageRefToUrl } = await import("@/lib/imageStorage/resolveUrl");
      const { usePages } = await import("@/stores/usePages");
      const activePageId = usePages.getState().activePageId;
      const activePage = sourcePageRef.current ?? (activePageId ? usePages.getState().pages[activePageId] : null);
      return resolveImageRefToUrl(url, activePage?.localFilePath ?? null);
    },
  });

  useEditorLocale(editor, "history");

  useEffect(() => {
    editor.isEditable = false;
  }, [editor]);

  const renderedContentRef = useRef(normalized);
  useEffect(() => {
    if (renderedContentRef.current === normalized) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      renderedContentRef.current = normalized;
      setRenderError(false);
      try {
        editor.replaceBlocks(editor.document, normalized as any);
      } catch (error) {
        console.error("[history] replace read-only blocks failed", { versionKey, error });
        setRenderError(true);
      }
    });
    return () => { cancelled = true; };
  }, [editor, normalized, versionKey]);

  if (renderError) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--goose-interactive-hover)] text-muted-foreground">
          <GooseIcons.FileWarning className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{sourcePage ? t("thisNoteCannotBePreviewed") : t("thisVersionCannotBeDisplayed")}</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            {t("theContentMayUseAnOlderFormatOr")}
          </p>
        </div>
      </div>
    );
  }

  if (!previewPage) {
    return <p className="px-6 py-12 text-center text-sm text-muted-foreground">{t("thisNoteCouldNotBeFoundSoIts")}</p>;
  }

  return (
    <EditorHostBridge
      page={previewPage}
      isEditorFullWidth
      onContentChangeOverride={ignoreReadOnlyContentChange}
    >
    <div
      data-font-family={activePage?.fontFamily ?? "default"}
      className={cn(
        "workspace-editor-surface mt-1 flex min-h-0 w-full flex-1 flex-col pt-1 pb-12",
        "max-w-full",
      )}
    >
      <BlockNoteView
        editor={editor}
        editable={false}
        theme={effectiveTheme}
        slashMenu={false}
        formattingToolbar={false}
        sideMenu={false}
        tableHandles={false}
        filePanel={false}
      />
    </div>
    </EditorHostBridge>
  );
}
