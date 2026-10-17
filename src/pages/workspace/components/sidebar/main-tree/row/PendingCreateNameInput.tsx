import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/main-tree/row/PendingCreateNameInput.tsx#localMessages:1">`
zh-Hans:
  newFolder_f3a4: "新建文件夹"
  couldNotCreateItemPleaseTry_db8e: "创建失败，请重试"
  folderName_a984: "文件夹名称"
  fileName_d2e2: "文件名称"
en:
  newFolder_f3a4: "New folder"
  couldNotCreateItemPleaseTry_db8e: "Could not create item. Please try again."
  folderName_a984: "Folder name"
  fileName_d2e2: "File name"
ja:
  newFolder_f3a4: "新規フォルダ"
  couldNotCreateItemPleaseTry_db8e: "作成に失敗しました。もう一度お試しください"
  folderName_a984: "フォルダ名"
  fileName_d2e2: "ファイル名"
`;
const uiText = createTranslator(localMessages);
import { Input } from "@/components/ui/input";
import { useLayoutEffect, useRef, useState } from "react";
import { useImeInput } from "@/hooks/useImeInput";
import { toast } from "@/components/ui/sonner";
import { normalizeNewFileName } from "@/lib/new-page-name";

export function PendingCreateNameInput({ id, kind, onCommit, onCancel }: {
  id: string;
  kind: "folder" | "file";
  onCommit?: (id: string, name: string) => Promise<boolean>;
  onCancel?: (id: string) => void;
}) {
  useLocale();
  const { value, valueRef, inputProps, isComposing } = useImeInput(kind === "folder" ? uiText("newFolder_f3a4") : "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
    inputRef.current?.scrollIntoView({ block: "nearest" });
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const cancel = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCancel?.(id);
  };
  const commit = async () => {
    if (finishedRef.current) return;
    try {
      const name = kind === "file" ? normalizeNewFileName(valueRef.current) : valueRef.current.trim();
      if (!name) { cancel(); return; }
      finishedRef.current = true;
      setBusy(true);
      if (await onCommit?.(id, name)) return;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : uiText("couldNotCreateItemPleaseTry_db8e"));
    }
    finishedRef.current = false;
    setBusy(false);
    inputRef.current?.focus();
  };

  return (
    <span className="relative z-20 flex min-w-0 flex-1 items-center leading-snug">
      <Input variant="inline" context="shell" ref={inputRef}
        className="min-w-0 flex-1 cursor-text select-text"
        value={value} {...inputProps} readOnly={busy} draggable={false}
        data-pending-create=""
        onBlur={() => { if (kind === "file") cancel(); else void commit(); }}
        onKeyDown={(event) => {
          if (isComposing(event)) { event.stopPropagation(); return; }
          if (event.key === "Enter") {
            event.preventDefault(); event.stopPropagation();
            if (!event.repeat) void commit();
          } else if (event.key === "Escape") {
            event.preventDefault(); event.stopPropagation(); cancel();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={kind === "folder" ? uiText("folderName_a984") : uiText("fileName_d2e2")} />
    </span>
  );
}
