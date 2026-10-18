import { captureLocalAssetTarget, isLocalAssetTargetCurrent } from "@/lib/local-file-assets";
import type { BlockNoteEditorOptions } from "@blocknote/core";
import { normalizeExternalUrl } from "@/lib/openExternalUrl";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { shouldArmLinkOpenHint } from "@/components/editor/extensions/linkKeyboardExtension";
import { pasteClipboardFilesFromClipboard } from "@/components/editor/utils/pasteClipboardFilesFromClipboard";
import {
  clipboardHasPasteableImage,
  clipboardHasPasteableMedia,
} from "@/components/editor/utils/pasteClipboardImage";
import { uploadEditorFile } from "@/components/editor/utils/uploadEditorFile";
import { fileStorage } from "@/lib/fileStorage";
import { getFileUploadAvailability } from "@/lib/fileUploadAvailability";
import { isQuickNoteEditorPage } from "@/pages/workspace/components/editor-host/editorContentMode";
import { isLinkworthyText } from "@/components/editor/utils/clipboard";
import { editorSchema } from "./schema";
import type { EditorSession } from "./useEditorSession";
import type { useEditorExtensions } from "./useEditorExtensions";
import { createLiveEditorDictionary } from "./editorLocale";

export function createEditorOptions(
  session: EditorSession,
  initialContent: unknown,
  extensions: ReturnType<typeof useEditorExtensions>,
  spellCheck: boolean,
) {
  const {
    page,
    platformRef,
    editorInstanceRef,
    getActivePageLocalFilePathRef,
    onOpenPageRef,
  } = session;
  return {
    initialContent: initialContent as any,
    schema: editorSchema,
    tables: { splitCells: true, cellBackgroundColor: true, cellTextColor: true },
    // 原生 quote-block-shortcuts 仍禁用；引用由 markdownInputRules 认 >／＞／|／｜ + 半角空格。
    // 同时禁用 toggle-list-item-shortcuts：Enter 对非空 toggleListItem 无条件分裂，
    // 顺序先于自定义扩展；行为在 collapsedToggleEnterExtension 中按收起态重实现。
    disableExtensions: [
      "quote-block-shortcuts",
      "toggle-list-item-shortcuts",
      "divider-block-shortcuts",
    ],
    dictionary: createLiveEditorDictionary(isQuickNoteEditorPage(page) ? "quicknote" : "note"),
    domAttributes: {
      editor: {
        class: "goose-blocknote-editor",
        // 关闭浏览器/系统拼写检查：行内代码里的 hash、标识符、类名会被标红点
        // 下划线，看起来像链接。链接下划线走 CSS，不依赖 spellcheck。
        spellcheck: spellCheck ? "true" : "false",
      },
    },
    uploadFile: async (file, blockId) => {
      const pageId = session.pageIdForUpdateRef.current;
      const target = pageId ? captureLocalAssetTarget(pageId) : null;
      return uploadEditorFile(file, blockId, {
        localAssetTarget: target,
        requireLocalAssetTarget: Boolean(session.pageRef.current?.localFilePath),
        isTargetCurrent: () => session.pageIdForUpdateRef.current === pageId &&
          session.inlineAiScopeRef.current().editable && (!target || isLocalAssetTargetCurrent(target)),
        getBlock: (id) => editorInstanceRef.current?.getBlock(id),
        imageStorage: platformRef.current.imageStorage,
        fileStorage,
        getFileUploadAvailability,
      });
    },
    pasteHandler: ({ event, editor: ed, defaultPasteHandler }) => {
      if (
        clipboardHasPasteableImage(event.clipboardData) ||
        (!__GOOSE_EDITOR_COMPACT__ &&
          clipboardHasPasteableMedia(event.clipboardData))
      ) {
        void pasteClipboardFilesFromClipboard(event, ed);
        return true;
      }
      return defaultPasteHandler();
    },
    resolveFileUrl: async (url) => {
      return platformRef.current.imageStorage.resolveRefToUrl(
        url,
        getActivePageLocalFilePathRef.current(),
      );
    },
    links: {
      onClick: (event) => {
        const target = event.target as HTMLElement | null;
        const mention = target?.closest<HTMLElement>(
          '[data-inline-content-type="pageMention"]',
        );
        const mentionPageId =
          mention?.getAttribute("data-page-id") ??
          mention?.dataset.pageId ??
          "";
        const mentionWikiTarget =
          mention?.getAttribute("data-wiki-target") ??
          mention?.dataset.wikiTarget ??
          "";
        if (mention && (mentionPageId || mentionWikiTarget)) {
          const newTab = isPlatformPrimaryModifierEvent(event);
          const handled = onOpenPageRef.current(
            mentionPageId,
            mentionWikiTarget,
            newTab ? { newTab: true } : undefined,
          );
          if (!newTab && handled === false) return false;
          return true;
        }
        if (!shouldArmLinkOpenHint(event)) {
          return false;
        }
        const link = target?.closest<HTMLAnchorElement>(
          'a[data-inline-content-type="link"]',
        );
        if (link) {
          const href = link.getAttribute("href");
          if (href) {
            const normalizedHref = normalizeExternalUrl(href);
            if (normalizedHref) {
              platformRef.current.shell.openUrl(
                normalizedHref,
              );
            }
          }
        }
        return true;
      },
      // autolink/粘贴/HTML 导入的统一闸口：linkifyjs 认全量 TLD 表，
      // `AppClient.java`(.java 是真实 gTLD)这类类名/文件名会被误转链接，
      // 这里收紧为「协议白名单 + 裸域名常用 TLD 白名单」，见 isLinkworthyText。
      isValidLink: isLinkworthyText,
    },

    extensions,
  } satisfies Partial<
    BlockNoteEditorOptions<
      typeof editorSchema.blockSchema,
      typeof editorSchema.inlineContentSchema,
      typeof editorSchema.styleSchema
    >
  >;
}
