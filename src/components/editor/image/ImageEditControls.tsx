import { useState } from "react";
import type { BlockNoteEditor } from "@blocknote/core";
import { FilePanelExtension } from "@blocknote/core/extensions";
import { EditorAction, Button } from "@/components/editor/ui/button";
import { Input } from "@/components/editor/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/editor/ui/popover";
import { Image, Pencil } from "@/components/ui/icons";
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/image/ImageEditControls.tsx#messages:1">`
zh-Hans:
  replaceImage: "替换图片"
  captionAndAltText: "图片说明与替代文本"
  caption: "说明"
  imageCaption: "图片说明"
  altText: "替代文本"
  imageAltText: "图片替代文本"
  fileName: "文件名"
  imageFileName: "图片文件名"
  save: "保存"
en:
  replaceImage: "Replace image"
  captionAndAltText: "Caption and alt text"
  caption: "Caption"
  imageCaption: "Image caption"
  altText: "Alt text"
  imageAltText: "Image alt text"
  fileName: "File name"
  imageFileName: "Image file name"
  save: "Save"
`;
const t = createTranslator(messages);


export function ImageEditControls({ editor, blockId }: {
  editor: BlockNoteEditor<any, any, any>;
  blockId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [alt, setAlt] = useState("");
  const [name, setName] = useState("");
  if (!blockId || !editor.isEditable) return null;
  const changeOpen = (next: boolean) => {
    if (next) {
      const props = editor.getBlock(blockId)?.props;
      if (!props) return;
      setCaption(props.caption || "");
      setAlt(typeof props.alt === "string" ? props.alt : props.name || "");
      setName(props.name || "");
    }
    setOpen(next);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor.isEditable || editor.getBlock(blockId)?.type !== "image") return;
    editor.updateBlock(blockId, { props: { caption, alt, name, captionSource: "user" } });
    setOpen(false);
  };
  return <>
    <EditorAction type="button" className="goose-block-toolbar-control" aria-label={t("replaceImage")} title={t("replaceImage")}
      onClick={() => editor.getExtension(FilePanelExtension)?.showMenu(blockId)}><Image className="h-[15px] w-[15px]" /></EditorAction>
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <EditorAction type="button" className="goose-block-toolbar-control" aria-label={t("captionAndAltText")} title={t("captionAndAltText")}>
          <Pencil className="h-[15px] w-[15px]" />
        </EditorAction>
      </PopoverTrigger>
      <PopoverContent editorContext side="bottom" className="w-72 p-3" data-goose-image-toolbar
        onCloseAutoFocus={(event) => { event.preventDefault(); editor.focus(); }}
        onKeyDown={(event) => event.stopPropagation()}>
        <form onSubmit={save} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">{t("caption")}
            <Textarea context="editor" aria-label={t("imageCaption")} value={caption} onChange={(event) => setCaption(event.target.value)} autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-sm">{t("altText")}
            <Input aria-label={t("imageAltText")} value={alt} onChange={(event) => setAlt(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">{t("fileName")}
            <Input aria-label={t("imageFileName")} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <Button type="submit">{t("save")}</Button>
        </form>
      </PopoverContent>
    </Popover>
  </>;
}
