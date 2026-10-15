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
  const { value, valueRef, inputProps, isComposing } = useImeInput(kind === "folder" ? "新建文件夹" : "");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const finishedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  useLayoutEffect(() => {
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
      toast.error(error instanceof Error ? error.message : "创建失败，请重试");
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
        onBlur={() => { if (kind === "file") cancel(); else void commit(); }}
        onKeyDown={(event) => {
          if (isComposing(event)) return;
          if (event.key === "Enter") {
            event.preventDefault(); event.stopPropagation(); void commit();
          } else if (event.key === "Escape") {
            event.preventDefault(); event.stopPropagation(); cancel();
          }
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={kind === "folder" ? "文件夹名称" : "文件名称"} />
    </span>
  );
}
