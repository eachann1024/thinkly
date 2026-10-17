import { useCallback, useEffect, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { Tooltip, TooltipTrigger } from "@/components/editor/ui/tooltip";
import { Toggle } from "@/components/editor/ui/toggle";
import { Button } from "@/components/editor/ui/button";
import { Input } from "@/components/editor/ui/input";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/editor/ui/popover";
import { useBlockNoteEditor } from "@blocknote/react";
import { ToolbarTooltip, type BindTooltip } from "../ToolbarTooltip";
import {
  useSelectionMenu,
  type SelectionMenuChange,
} from "../useSelectionMenu";

import { useSettings } from "@/stores/useSettings";
import { isLinkShortcutClaimedByApp } from "@/components/editor/extensions/linkKeyboardExtension";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/formatting/groups/LinkButton.tsx#messages:1">`
zh-Hans:
  removeLink: "移除链接"
  addLink: "添加链接"
  linkUrl: "链接地址"
  cancel: "取消"
  confirm: "确认"
en:
  removeLink: "Remove link"
  addLink: "Add link"
  linkUrl: "Link URL"
  cancel: "Cancel"
  confirm: "Confirm"
ja:
  removeLink: "リンクを削除"
  addLink: "リンクを追加"
  linkUrl: "リンク URL"
  cancel: "キャンセル"
  confirm: "OK"
`;
const t = createTranslator(messages);


const ITEM_CLASS = "goose-formatting-toolbar-control";

export function LinkButton({
  isLinkActive,
  linkUrl,
  bindTooltip,
  onOpenChange,
}: {
  isLinkActive: boolean;
  linkUrl: string | undefined;
  bindTooltip: BindTooltip;
  onOpenChange?: SelectionMenuChange;
}) {
  useLocale();
  const editor = useBlockNoteEditor();
  const linkShortcutClaimed = useSettings((settings) =>
    isLinkShortcutClaimedByApp([
      ...Object.values(settings.appShortcuts),
      settings.closeTabShortcut,
      settings.searchPanelCloseShortcut,
    ]),
  );
  const shortcut = linkShortcutClaimed ? undefined : "Mod+K";
  const { open, setOpen, runAction } = useSelectionMenu(
    editor,
    "link",
    onOpenChange,
  );
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleSubmit = useCallback(() => {
    const trimmed = url.trim();
    if (trimmed) {
      runAction(() => editor.createLink(trimmed));
    }
    setOpen(false);
    setUrl("");
  }, [url, editor, runAction, setOpen]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [handleSubmit, setOpen],
  );

  if (isLinkActive) {
    return (
      <Tooltip {...bindTooltip("link")}>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={true}
            onPressedChange={() => runAction(() => editor.deleteLink())}
            aria-label={t("removeLink")}
            className={ITEM_CLASS}
          >
            <GooseIcons.Link className="h-[15px] w-[15px]" />
          </Toggle>
        </TooltipTrigger>
        <ToolbarTooltip label={t("removeLink")} shortcut={shortcut} />
      </Tooltip>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setUrl(linkUrl || "");
        setOpen(next);
      }}
    >
      <Tooltip {...bindTooltip("link")}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Toggle
              size="sm"
              pressed={false}
              aria-label={t("addLink")}
              className={ITEM_CLASS}
            >
              <GooseIcons.Link className="h-[15px] w-[15px]" />
            </Toggle>
          </PopoverTrigger>
        </TooltipTrigger>
        <ToolbarTooltip label={t("addLink")} shortcut={shortcut} />
      </Tooltip>
      <PopoverContent
        align="center"
        side="top"
        editorContext
        className="w-72 p-2"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2">
          <Input
            ref={inputRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://..."
            aria-label={t("linkUrl")}
            className="h-8 text-sm"
          />
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSubmit}
            >
              {t("confirm")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
