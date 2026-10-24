import { useState } from "react";
import { useLocale, i18nYaml, createTranslator } from "@/i18n";
import { usePages } from "@/stores/usePages";
import { useNotebooks } from "@/stores/useNotebooks";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { FolderOpen } from "@/components/ui/icons";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { buildAiFileReferenceAttrs, getLocationSnapshot } from "@/components/editor/ai/composer/referenceMetadata";
import type { AiFileReferenceAttrs, AiReferenceRole } from "@/components/editor/ai/composer/referenceTypes";
import type { AiComposerInputHandle } from "@/components/editor/ai/composer/composerInputTypes";
import { dedupeResourceSelections, ensureNotebookReferenceIndex, isPageWithinResource, toResourceReference } from "@/lib/notebook-ai/readResourceScope";
import { localizeNotebookAiDiagnostic } from "@/lib/notebook-ai/localizeDiagnostic";
import type { RefObject } from "react";
const messages = i18nYaml<"src/pages/workspace/components/notebook-ai/composer/ResourcePicker.tsx#messages:1">`
zh-Hans:
  choose: "选择笔记或文件夹"
  source: "参考"
  target: "写入位置"
  search: "搜索笔记本、文件夹或笔记"
  recursive: "包含子文件夹"
  add: "添加 {{count}} 项"
  root: "根目录"
  loading: "正在加载…"
  retry: "重新加载"
  empty: "没有匹配项"
  indexed: "{{count}} 项索引，正文按需读取"
en:
  choose: "Select notes or folders"
  source: "Reference"
  target: "Write destination"
  search: "Search notebooks, folders or notes"
  recursive: "Include subfolders"
  add: "Add {{count}} items"
  root: "Root"
  loading: "Loading…"
  retry: "Reload"
  empty: "No matches"
  indexed: "{{count}} indexed items; content read on demand"
ja:
  choose: "ノートやフォルダを選択"
  source: "参照"
  target: "保存先"
  search: "ノートブック、フォルダ、ノートを検索"
  recursive: "サブフォルダを含める"
  add: "{{count}} 件追加"
  root: "ルート"
  loading: "読み込み中…"
  retry: "再読み込み"
  empty: "一致する項目はありません"
  indexed: "{{count}} 件の索引、本文は必要に応じて読み込み"
`;
const t = createTranslator(messages);
const keyOf = (ref: AiFileReferenceAttrs) => `${ref.workspaceId}:${ref.pageId}`;
export function ResourcePicker({ inputRef, disabled }: { inputRef: RefObject<AiComposerInputHandle | null>; disabled?: boolean }) {
  useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<AiReferenceRole>("context");
  const [recursive, setRecursive] = useState(true);
  const [selected, setSelected] = useState<AiFileReferenceAttrs[]>([]);
  const [states, setStates] = useState<Record<string, "loading" | "ready" | string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pages = usePages((state) => state.pages);
  const notebooks = useNotebooks((state) => state.notebooks);
  async function load(id: string) {
    setStates((state) => ({ ...state, [id]: "loading" }));
    try { await ensureNotebookReferenceIndex(id); setStates((state) => ({ ...state, [id]: "ready" })); }
    catch (error) { setStates((state) => ({ ...state, [id]: localizeNotebookAiDiagnostic(error instanceof Error ? error.message : String(error)) })); }
  }
  function toggle(reference: AiFileReferenceAttrs) {
    const ref = { ...reference, role, recursive };
    setSelected((current) => {
      if (current.some((item) => keyOf(item) === keyOf(ref) && item.role === role)) return current.filter((item) => keyOf(item) !== keyOf(ref) || item.role !== role);
      const page = pages[ref.pageId];
      const ancestor = role === "context" && page ? current.find((item) => item.role === role && isPageWithinResource(page, toResourceReference(item, "source"), pages)) : undefined;
      if (ancestor) return current.map((item) => item === ancestor ? { ...item, excludedPageIds: [...(item.excludedPageIds ?? []), ref.pageId] } : item);
      // A child excluded by its parent can be restored without adding overlapping roots.
      const excludedAncestor = current.find((item) => item.role === role && item.excludedPageIds?.includes(ref.pageId));
      if (excludedAncestor) return current.map((item) => item === excludedAncestor ? { ...item, excludedPageIds: item.excludedPageIds?.filter((id) => id !== ref.pageId) } : item);
      return dedupeResourceSelections([...current, ref], pages);
    });
  }
  function checked(reference: AiFileReferenceAttrs) {
    return selected.some((item) => item.role === role && (keyOf(item) === keyOf(reference) || (role === "context" && pages[reference.pageId] && isPageWithinResource(pages[reference.pageId], toResourceReference(item, "source"), pages))));
  }
  const needle = query.trim().toLocaleLowerCase();
  const groups = Object.values(notebooks).sort((a, b) => a.name.localeCompare(b.name));
  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (next) { setSelected([]); setQuery(""); } }}>
    <PopoverTrigger asChild><IconButton type="button" size="sm" tone="muted" disabled={disabled} aria-label={t("choose")} title={t("choose")}><FolderOpen className="h-3.5 w-3.5" /></IconButton></PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-[min(420px,calc(100vw-24px))] p-2" onCloseAutoFocus={(event) => { event.preventDefault(); inputRef.current?.focus(); }}>
      <div className="mb-2 flex items-center gap-1" role="group" aria-label={t("choose")}>
        <Button type="button" size="sm" variant="ghost" aria-pressed={role === "context"} onClick={() => setRole("context")}>{t("source")}</Button>
        <Button type="button" size="sm" variant="ghost" aria-pressed={role === "target"} onClick={() => setRole("target")}>{t("target")}</Button>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t("search")} placeholder={t("search")} className="w-full" />
      {role === "context" && <label className="my-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={recursive} onChange={(event) => { setRecursive(event.target.checked); setSelected((items) => items.map((item) => item.role === "context" ? { ...item, recursive: event.target.checked } : item)); }} />{t("recursive")}</label>}
      <div className="my-2 max-h-[min(340px,50vh)] overflow-y-auto" role="group" aria-label={t("choose")}>
        {groups.map((notebook) => {
          const entries = Object.values(pages).filter((page) => page.workspaceId === notebook.id && !page.trashedAt)
            .map((page) => ({ page, attrs: buildAiFileReferenceAttrs(page, notebooks, pages) }))
            .filter(({ attrs }) => !needle || `${notebook.name}/${attrs.locationSnapshot}`.toLocaleLowerCase().includes(needle))
            .sort((a, b) => (a.attrs.locationSnapshot ?? "").localeCompare(b.attrs.locationSnapshot ?? ""));
          const root: AiFileReferenceAttrs = { pageId: notebook.id, workspaceId: notebook.id, refId: `${notebook.id}:notebook`, kind: "notebook", titleSnapshot: notebook.name, notebookNameSnapshot: notebook.name, locationSnapshot: "/", sourceType: notebook.source === "local-folder" ? "local-file" : "app-page" };
          const state = states[notebook.id];
          return <details key={notebook.id} open={expanded[notebook.id] ?? Boolean(needle)} onToggle={(event) => {
            const next = event.currentTarget.open; setExpanded((value) => value[notebook.id] === next ? value : { ...value, [notebook.id]: next });
            if (next && !state) void load(notebook.id);
          }}>
            <summary className="goose-menu-item cursor-pointer">{notebook.name}</summary>
            {state === "loading" ? <p role="status" className="px-2 py-1 text-sm">{t("loading")}</p> : state && state !== "ready" ? <div role="alert" className="px-2 py-1 text-sm"><span>{state}</span><Button type="button" variant="ghost" size="sm" onClick={() => void load(notebook.id)}>{t("retry")}</Button></div> : <>
              <label className="goose-menu-item flex cursor-pointer items-center gap-2"><input type="checkbox" checked={checked(root)} onChange={() => toggle(root)} /><span>{t("root")}</span></label>
              {entries.map(({ page, attrs }) => <label key={page.id} className="goose-menu-item flex cursor-pointer items-center gap-2" title={`${notebook.name}/${getLocationSnapshot(page, notebooks, pages)}`}>
                <input type="checkbox" checked={checked(attrs)} onChange={() => toggle(attrs)} />
                <span className="min-w-0 overflow-hidden whitespace-nowrap">{attrs.locationSnapshot}{page.isFolder ? "/" : ""}</span>
              </label>)}
              <p role="status" className="px-2 py-1 text-xs text-muted-foreground">{entries.length ? t("indexed", { count: entries.length }) : t("empty")}</p>
            </>}
          </details>;
        })}
      </div>
      <Button type="button" size="sm" className="w-full" disabled={!selected.length} onClick={() => {
        const existing = inputRef.current?.getPayload().references ?? [];
        for (const reference of dedupeResourceSelections(selected, pages)) {
          if (!existing.some((item) => keyOf(item) === keyOf(reference) && item.role === reference.role)) inputRef.current?.insertReference(reference);
        }
        setOpen(false);
      }}>{t("add", { count: selected.length })}</Button>
    </PopoverContent>
  </Popover>;
}
