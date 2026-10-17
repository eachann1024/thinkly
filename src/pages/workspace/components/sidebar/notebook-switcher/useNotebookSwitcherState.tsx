import { createTranslator, i18nYaml } from "@/i18n";
const localMessages = i18nYaml<"src/pages/workspace/components/sidebar/notebook-switcher/useNotebookSwitcherState.tsx#localMessages:1">`
zh-Hans:
  folder: "文件夹"
  openFolder: "打开文件夹"
en:
  folder: "Folder"
  openFolder: "Open folder"
`;
const uiText = createTranslator(localMessages);
import { useWorkspaceViewport } from "@/stores/useWorkspaceViewport";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortNotebooksByOrder, useNotebooks } from "@/stores/useNotebooks";

export function useNotebookSwitcherState({
  onOpenSettings,
  variant = "default",
  active = true,
}: {
  onOpenSettings?: () => void;
  variant?: "default" | "rail" | "header";
  active?: boolean;
} = {}) {
  const {
    notebooks,
    activeNotebookId,
    createLocalFolderNotebook,
    updateNotebook,
    deleteNotebook,
    reorderNotebooks,
  } = useNotebooks();

  const forceCollapseLeft = useWorkspaceViewport((state) => state.forceCollapseLeft);
  const notebookDropdownHoverExpand = useSettings(
    (state) => state.notebookDropdownHoverExpand,
  );

  const [isOpen, setIsOpen] = useState(false);

  const isDraggingRef = useRef(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 整行按住再拖：短点选切换仓库，按住后才进入排序，避免再做拖拽把手
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  useEffect(() => {
    if (!isOpen) return;
    const close = () => {
      if (!isDraggingRef.current) setIsOpen(false);
    };
    window.addEventListener("blur", close);
    return () => window.removeEventListener("blur", close);
  }, [isOpen]);

  const [editDialog, setEditDialog] = useState({
    open: false,
    id: "",
    name: "",
    confirmName: "",
    icon: "",
    excludeFromGlobalSearch: false,
    openDeleteConfirm: false,
    isLocalFolder: false,
  });

  const activeNotebook = activeNotebookId ? notebooks[activeNotebookId] : null;

  const isRail = variant === "rail";
  const isHeader = variant === "header";

  const notebookKind = uiText("folder");

  const activeNotebookLabel =
    activeNotebook?.name || uiText("openFolder");

  const notebookList = sortNotebooksByOrder(notebooks);
  // Electron 仅本地文件夹模式：最后一个文件夹也允许移除（回到空态）
  const canDeleteNotebook = notebookList.length > 0;
  return {
    onOpenSettings,
    variant,
    active,
    notebooks,
    activeNotebookId,
    createLocalFolderNotebook,
    updateNotebook,
    deleteNotebook,
    reorderNotebooks,
    notebookDropdownHoverExpand: notebookDropdownHoverExpand && !forceCollapseLeft,
    isOpen,
    setIsOpen,
    isDraggingRef,
    menuRef,
    sensors,
    editDialog,
    setEditDialog,
    activeNotebook,
    isRail,
    isHeader,
    notebookKind,
    activeNotebookLabel,
    notebookList,
    canDeleteNotebook,
  };
}
