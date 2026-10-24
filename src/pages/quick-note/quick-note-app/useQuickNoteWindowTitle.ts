import { useEffect, useState } from "react";
import { createTranslator, i18nYaml, useLocale } from "@/i18n";
import { resolveNotebookWindowTitle } from "@/lib/duplicateName";
import { readOtherWindowTitles } from "@/lib/electron/otherWindowTitles";
import { getGooseDesktop } from "@/lib/electron/runtime";
import { useNotebooks } from "@/stores/useNotebooks";

const localMessages = i18nYaml<"src/pages/quick-note/quick-note-app/useQuickNoteWindowTitle.ts#localMessages:1">`
zh-Hans:
  fallback: "速记"
en:
  fallback: "Quick Note"
ja:
  fallback: "クイックノート"
`;
const uiText = createTranslator(localMessages);

function activeNotebookName(): string {
  const state = useNotebooks.getState();
  const name = state.activeNotebookId
    ? state.notebooks[state.activeNotebookId]?.name
    : "";
  return typeof name === "string" ? name.trim() : "";
}

/** 速记小窗的显示名和系统窗口标题：当前笔记本名，重名时加现有的 ` (1)` 后缀。 */
export function useQuickNoteWindowTitle(): string {
  const locale = useLocale();
  const notebookName = useNotebooks((state) => {
    const name = state.activeNotebookId
      ? state.notebooks[state.activeNotebookId]?.name
      : "";
    return typeof name === "string" ? name.trim() : "";
  });
  const fallback = uiText("fallback");
  const [title, setTitle] = useState(() => notebookName || fallback);

  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      try {
        await useNotebooks.persist.rehydrate();
      } catch {
        // 笔记本清单读不到时，继续用内存里已经水合的名称。
      }
      if (cancelled) return;
      const base = activeNotebookName();
      const next = resolveNotebookWindowTitle(base, await readOtherWindowTitles(), uiText("fallback"));
      if (cancelled) return;
      setTitle(next);
      document.title = next;
      try {
        await getGooseDesktop()?.setTitle(next);
      } catch {
        // 浏览器预览没有系统窗口标题。
      }
    };
    void apply();
    window.addEventListener("focus", apply);
    window.addEventListener("goose-note:quicknote-enter", apply);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", apply);
      window.removeEventListener("goose-note:quicknote-enter", apply);
    };
  }, [notebookName, locale, fallback]);

  return title;
}
