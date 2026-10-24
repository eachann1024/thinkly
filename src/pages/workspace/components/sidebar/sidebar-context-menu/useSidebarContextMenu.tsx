import { restorePageWithToast } from "@/lib/page-delete-actions";
import { useNotebooks } from "@/stores/useNotebooks";
import { useSettings } from "@/stores/useSettings";
import { effectiveSingleTabMode } from "@/lib/tabMode";
import { getNotebookMoveTargets } from "@/lib/notebook-move-targets";
import { movePageToNotebook } from "@/lib/move-page-to-notebook";
import { openPageFromSidebar } from "@/lib/sidebarPageNavigation";
import { useLocalFolderManualOrder } from "@/stores/localFolderOrder";
import { type SidebarContextMenuProps } from "./shared";

export function useSidebarContextMenu({
  page,
  children,
  onCreateLocalFile,
  onCreateLocalFolder,
}: SidebarContextMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const duplicatePage = usePages((s) => s.duplicatePage);

  const notebooks = useNotebooks((state) => state.notebooks);

  const notebook = notebooks[page.workspaceId];

  const isLocalFolder = notebook?.source === "local-folder";

  const isTrashed = !!page.trashedAt;

  const folderHasManualOrder = useLocalFolderManualOrder(
    page.workspaceId,
    page.isFolder ? page.id : undefined,
  );

  const movableNotebooks = getNotebookMoveTargets(page, notebooks);

  const handleDuplicatePage = async () => {
    const newId = await duplicatePage(page.id);
    if (!newId || newId === page.id) return;
    openPageFromSidebar(newId, "permanent");
  };

  const handleRestore = () => restorePageWithToast(page.id);

  const handleMoveToNotebook = (targetNotebookId: string) => {
    void movePageToNotebook(page.id, targetNotebookId);
  };

  const localFolderFileManager = useSettings((s) => s.localFolderFileManager);

  const localFolderExternalEditor = useSettings(
    (s) => s.localFolderExternalEditor,
  );

  const localFolderTerminal = useSettings((s) => s.localFolderTerminal);

  const singleTabMode = effectiveSingleTabMode(
    useSettings((s) => s.singleTabMode),
  );

  const [renaming, setRenaming] = useState(false);

  const rowRef = useRef<HTMLDivElement>(null);

  const canRename =
    !isTrashed && !page.localPendingCreate && !page.localUnsaved;

  const createParentId = page.isFolder ? page.id : page.parentId;
  return {
    page,
    children,
    onCreateLocalFile,
    onCreateLocalFolder,
    menuOpen,
    setMenuOpen,
    duplicatePage,
    notebooks,
    notebook,
    isLocalFolder,
    isTrashed,
    folderHasManualOrder,
    movableNotebooks,
    handleDuplicatePage,
    handleRestore,
    handleMoveToNotebook,
    localFolderFileManager,
    localFolderExternalEditor,
    localFolderTerminal,
    singleTabMode,
    renaming,
    setRenaming,
    rowRef,
    canRename,
    createParentId,
  };
}
