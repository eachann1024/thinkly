import { EditorAction } from "@/components/editor/ui/button";
import type { LinkToolbarProps } from "@blocknote/react";
import { useBlockNoteEditor } from "@blocknote/react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as GooseIcons from "@/components/ui/icons";
import { Input } from "@/components/editor/ui/input";
import { Button } from "@/components/editor/ui/button";
import { useEditorPlatform } from "@/components/editor/platform/context";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/toolbars/link/EditorLinkToolbar.tsx#messages:1">`
zh-Hans:
  linkText: "链接文字"
  save: "保存"
  cancel: "取消"
  edit: "编辑"
  open: "打开"
  remove: "移除"
en:
  linkText: "Link text"
  save: "Save"
  cancel: "Cancel"
  edit: "Edit"
  open: "Open"
  remove: "Remove"
ja:
  linkText: "リンクのテキスト"
  save: "保存"
  cancel: "キャンセル"
  edit: "編集"
  open: "開く"
  remove: "削除"
`;
const t = createTranslator(messages);


function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

export function EditorLinkToolbar({
  url,
  text,
  range,
  setToolbarOpen,
  setToolbarPositionFrozen,
}: LinkToolbarProps) {
  useLocale();
  const editor = useBlockNoteEditor();
  const platform = useEditorPlatform();
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(url);
  const [editText, setEditText] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditUrl(url);
    setEditText(text);
  }, [url, text]);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  const handleSave = useCallback(() => {
    const trimmedUrl = editUrl.trim();
    if (trimmedUrl) {
      editor.editLink(trimmedUrl, editText.trim() || text, range.from);
    }
    setEditing(false);
    setToolbarPositionFrozen?.(false);
  }, [editUrl, editText, text, range, editor, setToolbarPositionFrozen]);

  const handleDelete = useCallback(() => {
    editor.deleteLink(range.from);
    setToolbarOpen?.(false);
  }, [editor, range, setToolbarOpen]);

  const handleOpen = useCallback(() => {
    const target = normalizeExternalUrl(url);
    if (target) {
      void platform.shell.openUrl(target);
    }
  }, [url, platform]);

  const startEditing = useCallback(() => {
    if (!editor.isEditable) return;
    setEditing(true);
    setToolbarPositionFrozen?.(true);
  }, [editor.isEditable, setToolbarPositionFrozen]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditUrl(url);
    setEditText(text);
    setToolbarPositionFrozen?.(false);
  }, [url, text, setToolbarPositionFrozen]);

  if (editing) {
    return (
      <div
        data-goose-link-toolbar
        data-goose-link-toolbar-editing=""
        className="flex w-[480px] max-w-[min(480px,80vw)] items-center gap-1.5"
        onMouseDown={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input, textarea")) return;
          e.preventDefault();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Input
            ref={inputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            placeholder={t("linkText")}
            className="goose-link-toolbar-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                inputRef.current?.blur();
                handleSave();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
          />
          <Input
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="https://..."
            className="goose-link-toolbar-input"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                cancelEditing();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Button size="sm" className="goose-link-toolbar-form-button" onClick={handleSave}>
            {t("save")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="goose-link-toolbar-form-button"
            onClick={cancelEditing}
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-goose-link-toolbar
      className="flex items-center"
      onMouseDown={(e) => e.preventDefault()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {editor.isEditable ? (
        <EditorAction
          type="button"
          onClick={startEditing}
          className="goose-link-toolbar-control"
        >
          <GooseIcons.Pencil />
          {t("edit")}
        </EditorAction>
      ) : null}
      <EditorAction
        type="button"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          handleOpen();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          event.stopPropagation();
          handleOpen();
        }}
        className="goose-link-toolbar-control"
      >
        <GooseIcons.ExternalLink />
        {t("open")}
      </EditorAction>
      {editor.isEditable ? (
        <EditorAction
          type="button"
          onClick={handleDelete}
          variant="destructive"
          className="goose-link-toolbar-control goose-link-toolbar-control-danger"
        >
          <GooseIcons.Unlink />
          {t("remove")}
        </EditorAction>
      ) : null}
    </div>
  );
}
