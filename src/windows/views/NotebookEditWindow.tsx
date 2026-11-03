import { useEffect, useState } from "react";
import { useLocale } from "@/i18n";
import { createTranslator, i18nYaml } from "@/i18n/core";
import { useAuxiliaryWindow } from "@/windows/AuxiliaryWindowContext";
import { StandaloneWindowShell } from "@/windows/shell/StandaloneWindowShell";
import { NotebookEditConfirm } from "./NotebookEditConfirm";
import { NotebookEditForm } from "./NotebookEditForm";
import { readNotebookEditPayload, type NotebookEditPayload } from "./notebookEditPayload";

const text = createTranslator(i18nYaml<"src/windows/views/NotebookEditWindow.tsx#block1:1">`
zh-Hans:
  editTitle: "编辑笔记本"
  removeTitle: "移除本地文件夹"
  deleteTitle: "永久删除笔记本"
  intro: "修改笔记本的名称、图标与搜索设置"
  nameLabel: "笔记本名称"
  namePlaceholder: "输入笔记本名称"
  changeIcon: "更换图标"
  excludeTitle: "不在全局搜索中展示"
  excludeBody: "开启后，从其他笔记本搜索「所有笔记本」时排除该笔记本；当前笔记本内搜索不受影响。"
  dangerTitle: "危险操作"
  dangerHint: "本地文件夹只移除挂载，不删除磁盘文件"
  remove: "移除此笔记本"
  delete: "删除此笔记本"
  cancel: "取消"
  save: "保存"
  askRemove: "移除「{{name}}」？"
  askDelete: "永久删除「{{name}}」？"
  removeBody: "仅移除挂载，不会删除磁盘上的文件。之后可以重新添加这个文件夹。"
  deleteBody: "笔记本和其中的所有笔记都会被删除。此操作无法撤销，请谨慎操作。"
  pageCount: "{{count}} 篇笔记"
  back: "返回"
  confirmRemove: "确认移除"
  confirmDelete: "确认删除"
en:
  editTitle: "Edit notebook"
  removeTitle: "Remove local folder"
  deleteTitle: "Permanently delete notebook"
  intro: "Change the notebook name, icon, and search settings"
  nameLabel: "Notebook name"
  namePlaceholder: "Enter a notebook name"
  changeIcon: "Change icon"
  excludeTitle: "Exclude from global search"
  excludeBody: "Exclude this notebook when searching all notebooks from another notebook. Searching within this notebook is unaffected."
  dangerTitle: "Danger zone"
  dangerHint: "A local folder is unmounted only. Files on disk stay."
  remove: "Remove this notebook"
  delete: "Delete this notebook"
  cancel: "Cancel"
  save: "Save"
  askRemove: "Remove “{{name}}”?"
  askDelete: "Permanently delete “{{name}}”?"
  removeBody: "This only removes the mount. Files on disk stay, and the folder can be added again."
  deleteBody: "The notebook and every note in it will be deleted. This cannot be undone."
  pageCount: "{{count}} notes"
  back: "Back"
  confirmRemove: "Remove"
  confirmDelete: "Delete"
ja:
  editTitle: "ノートブックを編集"
  removeTitle: "ローカルフォルダを外す"
  deleteTitle: "ノートブックを完全に削除"
  intro: "ノートブックの名前、アイコン、検索設定を変更します"
  nameLabel: "ノートブック名"
  namePlaceholder: "ノートブック名を入力"
  changeIcon: "アイコンを変更"
  excludeTitle: "全体検索に表示しない"
  excludeBody: "オンにすると、他のノートブックから「すべてのノートブック」を検索する際にこのノートブックが除外されます。このノートブック内の検索には影響しません。"
  dangerTitle: "危険な操作"
  dangerHint: "ローカルフォルダはマウントを外すだけで、ディスク上のファイルは削除しません"
  remove: "このノートブックを外す"
  delete: "このノートブックを削除"
  cancel: "キャンセル"
  save: "保存"
  askRemove: "「{{name}}」を外しますか？"
  askDelete: "「{{name}}」を完全に削除しますか？"
  removeBody: "マウントを外すだけで、ディスク上のファイルは削除しません。あとからこのフォルダを追加し直せます。"
  deleteBody: "ノートブックと中のすべてのノートが削除されます。この操作は元に戻せません。"
  pageCount: "{{count}} 件のノート"
  back: "戻る"
  confirmRemove: "外す"
  confirmDelete: "削除する"
`);

export function NotebookEditWindow() {
  useLocale();
  const { payload, requestId, resizable } = useAuxiliaryWindow();
  const [draft, setDraft] = useState<NotebookEditPayload | null>(null);
  const [view, setView] = useState<"edit" | "remove" | "delete">("edit");

  useEffect(() => {
    setDraft(readNotebookEditPayload(payload));
    setView("edit");
  }, [requestId, payload]);

  if (!draft) return null;
  const title = view === "edit" ? text("editTitle") : view === "remove" ? text("removeTitle") : text("deleteTitle");
  return (
    <StandaloneWindowShell title={title} context={draft.name} maximizable={resizable}>
      {view === "edit" ? (
        <NotebookEditForm
          draft={draft}
          copy={{
            intro: text("intro"),
            nameLabel: text("nameLabel"),
            namePlaceholder: text("namePlaceholder"),
            excludeTitle: text("excludeTitle"),
            excludeBody: text("excludeBody"),
            dangerTitle: text("dangerTitle"),
            dangerHint: text("dangerHint"),
            remove: text("remove"),
            delete: text("delete"),
            cancel: text("cancel"),
            save: text("save"),
            changeIcon: text("changeIcon"),
          }}
          onChange={(patch) => setDraft((current) => (current ? { ...current, ...patch } : current))}
          onAsk={setView}
        />
      ) : (
        <NotebookEditConfirm
          draft={draft}
          view={view}
          copy={{
            removeTitle: text("askRemove", { name: draft.name }),
            deleteTitle: text("askDelete", { name: draft.name }),
            removeBody: text("removeBody"),
            deleteBody: text("deleteBody"),
            pageCount: text("pageCount", { count: draft.pageCount }),
            back: text("back"),
            confirmRemove: text("confirmRemove"),
            confirmDelete: text("confirmDelete"),
          }}
          onBack={() => setView("edit")}
        />
      )}
    </StandaloneWindowShell>
  );
}
