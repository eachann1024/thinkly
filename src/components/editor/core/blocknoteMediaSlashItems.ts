import type { BlockNoteEditor } from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { SLASH_ICONS, type SlashMenuItem } from "./blocknoteSlashModel";
import { Volume2 } from "@/components/ui/icons";
import { createElement } from "react";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/core/blocknoteMediaSlashItems.ts#messages:1">`
zh-Hans:
  image: "图片"
  video: "视频"
  audio: "音频"
  file: "文件"
en:
  image: "Image"
  video: "Video"
  audio: "Audio"
  file: "File"
ja:
  image: "画像"
  video: "ビデオ"
  audio: "オーディオ"
  file: "ファイル"
`;
const t = createTranslator(messages);


export function getMediaSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  insert: (block: any) => any,
): SlashMenuItem[] {
  return ([
    ["image", t("image"), SLASH_ICONS.image, ["image", "photo", "tupian", "img"]],
    ["video", t("video"), SLASH_ICONS.video, ["video", "movie", "shipin", "luping"]],
    ["audio", t("audio"), createElement(Volume2, { size: 18 }), ["audio", "sound", "music", "yinpin", "yinyue"]],
    ["file", t("file"), SLASH_ICONS.file, ["file", "attachment", "pdf", "wenjian", "fujian"]],
  ] as const).map(([type, title, icon, aliases]) => ({
    title, icon, aliases: [...aliases],
    onItemClick: () => {
      const block = insert({ type });
      if (!block?.id) return;
      if (["audio", "video"].includes(type) && editor.document.at(-1)?.id === block.id) {
        editor.insertBlocks([{ type: "paragraph", content: "" }], block, "after");
      }
      editor.getExtension(FilePanelExtension)?.showMenu(block.id);
    },
  }));
}
