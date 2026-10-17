import { createTranslator, i18nYaml } from "@/i18n";

const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/SidebarInlineRename.tsx#localMessages:1">`
zh-Hans:
  namesCannotContainPathSeparatorsOr_26f3: "名称不能包含路径分隔符或非法字符"
  thisItemNoLongerExists_0117: "该项目已不存在"
  renameFailed_37ba: "重命名失败"
  renameEnterToConfirmEscapeTo_4d0a: "重命名，Enter 确认，Escape 取消"
  pressTabOrClickElsewhereTo_7735: "Tab 或点击其他位置保存；空名称保留原名"
en:
  namesCannotContainPathSeparatorsOr_26f3: "Names cannot contain path separators or invalid characters"
  thisItemNoLongerExists_0117: "This item no longer exists"
  renameFailed_37ba: "Rename failed"
  renameEnterToConfirmEscapeTo_4d0a: "Rename: Enter to confirm, Escape to cancel"
  pressTabOrClickElsewhereTo_7735: "Press Tab or click elsewhere to save. Leave empty to keep the current name."
`;
const uiText = createTranslator(localMessages);
import { Input } from "@/components/ui/input";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { getPageTitle, withInternalPageTitle } from "@/components/editor/utils/page-title";
import { toast } from "@/components/ui/sonner";
import { usePages } from "@/stores/usePages";
import type { Page } from "@/types";
import "./sidebar-inline-rename.css";

export const SidebarRenameContext = createContext<{
  page: Page;
  renaming: boolean;
  setRenaming: (value: boolean) => void;
  rowRef: RefObject<HTMLDivElement | null>;
} | null>(null);

export function SidebarInlineRename({ children }: { children: ReactNode }) {
  const context = useContext(SidebarRenameContext);
  return context?.renaming ? <RenameInput context={context} /> : children;
}

function RenameInput({ context }: { context: NonNullable<React.ContextType<typeof SidebarRenameContext>> }) {
  const { page, setRenaming, rowRef } = context;
  const original = page.isFolder && page.localFilePath
    ? page.localFilePath.split(/[\\/]/).pop() || ""
    : getPageTitle(page);
  const [value, setValue] = useState(original);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const committing = useRef(false);
  const finished = useRef(false);
  const composing = useRef(false);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    // 进入重命名后选中完整名称，直接输入即可替换；长名称仍从首部显示。
    input.select();
    input.scrollLeft = 0;
  }, []);

  const finish = (restoreFocus: boolean) => {
    finished.current = true;
    setRenaming(false);
    if (restoreFocus) {
      const row = rowRef.current;
      const target = row?.querySelector<HTMLElement>(".main-tree-row > [tabindex], .sidebar-tree-row[tabindex]");
      (target ?? row)?.focus({ preventScroll: true });
    }
  };

  const commit = async () => {
    if (committing.current || finished.current || composing.current) return;
    const next = value.trim();
    if (!next || next === original) {
      finish(document.activeElement === inputRef.current);
      return;
    }
    // eslint-disable-next-line no-control-regex -- 文件名校验需要明确拒绝控制字符。
    if (/[\\/:*?"<>|\x00-\x1f\x7f]/.test(next) || /^\.+$/.test(next)) {
      setError(uiText("namesCannotContainPathSeparatorsOr_26f3"));
      toast.error(uiText("namesCannotContainPathSeparatorsOr_26f3"));
      return;
    }
    committing.current = true;
    setBusy(true);
    try {
      const live = usePages.getState().pages[page.id];
      if (!live || live.trashedAt) throw new Error(uiText("thisItemNoLongerExists_0117"));
      if (live.localFilePath) {
        await usePages.getState().renameLocalPageFile(live.id, next);
      } else {
        usePages.getState().updatePage(live.id, {
          content: withInternalPageTitle(live.content, next),
        });
      }
      finish(document.activeElement === inputRef.current);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : uiText("renameFailed_37ba");
      setError(message);
      toast.error(message);
    } finally {
      committing.current = false;
      setBusy(false);
    }
  };

  return (
    <span className="relative z-20 flex min-w-0 flex-1 items-center leading-snug">
    <Input variant="inline" context="shell"
      ref={inputRef}
      data-sidebar-rename-field=""
      className="relative z-20 min-w-0 flex-1 cursor-text select-text"
      aria-label={uiText("renameEnterToConfirmEscapeTo_4d0a")}
      aria-invalid={!!error}
      aria-description={error || uiText("pressTabOrClickElsewhereTo_7735")}
      aria-busy={busy}
      value={value}
      readOnly={busy}
      spellCheck={false}
      autoComplete="off"
      draggable={false}
      onChange={(event) => { setValue(event.target.value); setError(""); }}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; }}
      onBlur={() => { void commit(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229 || composing.current) return;
        if (event.key === "Enter") {
          event.preventDefault();
          void commit();
        } else if (event.key === "Escape") {
          event.preventDefault();
          if (!committing.current) finish(true);
        }
      }}
      onKeyUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
      onDragStart={(event) => event.preventDefault()}
    />
    </span>
  );
}
