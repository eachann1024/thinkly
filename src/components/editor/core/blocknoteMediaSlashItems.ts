import type { BlockNoteEditor } from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { SLASH_ICONS, type SlashMenuItem } from "./blocknoteSlashModel";
import { Volume2 } from "@/components/ui/icons";
import { createElement } from "react";

export function getMediaSlashMenuItems(
  editor: BlockNoteEditor<any, any, any>,
  insert: (block: any) => any,
): SlashMenuItem[] {
  return ([
    ["image", "图片", SLASH_ICONS.image, ["image", "photo", "tupian", "img"]],
    ["video", "视频", SLASH_ICONS.video, ["video", "movie", "shipin", "luping"]],
    ["audio", "音频", createElement(Volume2, { size: 18 }), ["audio", "sound", "music", "yinpin", "yinyue"]],
    ["file", "文件", SLASH_ICONS.file, ["file", "attachment", "pdf", "wenjian", "fujian"]],
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
