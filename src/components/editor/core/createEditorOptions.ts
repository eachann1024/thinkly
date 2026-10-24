import { captureLocalAssetTarget, isLocalAssetTargetCurrent } from "@/lib/local-file-assets";
import type { BlockNoteEditorOptions } from "@blocknote/core";
import { normalizeExternalUrl } from "@/lib/openExternalUrl";
import { isPlatformPrimaryModifierEvent } from "@/lib/shortcut-platform";
import { shouldArmLinkOpenHint } from "@/components/editor/extensions/linkKeyboardExtension";
import { pasteClipboardFilesFromClipboard, pasteNativeClipboardImage } from "@/components/editor/utils/pasteClipboardFilesFromClipboard";
import { resolveClipboardPasteRoute, shouldReadNativeClipboardImage } from "@/components/editor/utils/pasteClipboardImage";
import { withoutBlockNoteClipboardIds } from "@/components/editor/hooks/editorPasteBlocks";
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
    disableExtensions: [
      "quote-block-shortcuts",
      "toggle-list-item-shortcuts",
      "divider-block-shortcuts",
    ],
    dictionary: createLiveEditorDictionary(isQuickNoteEditorPage(page) ? "quicknote" : "note"),
    domAttributes: {
      editor: {
        class: "goose-blocknote-editor",
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
      const route = resolveClipboardPasteRoute(
        event.clipboardData,
        !__GOOSE_EDITOR_COMPACT__,
      );
      if (route === "media-files") {
        void pasteClipboardFilesFromClipboard(event, ed);
        return true;
      }
      if (route === "blocks" && !event.clipboardData?.getData("blocknote/html")) {
        const html = event.clipboardData?.getData("text/html") ?? "";
        if (html) {
          ed.pasteHTML(withoutBlockNoteClipboardIds(html), true);
          return true;
        }
      }
      if (route === "default" && shouldReadNativeClipboardImage(event.clipboardData)) {
        void pasteNativeClipboardImage(ed, () => platformRef.current.clipboard.readImage());
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
