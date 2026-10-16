import { create } from "zustand";

export type LocalFolderTargetPickerMode = "move" | "import";
export type LocalFolderTargetPickerState =
  | { phase: "closed" }
  | { phase: "move"; workspaceId: string; pageId: string }
  | { phase: "import"; workspaceId: string; files: File[] };
type PickerEvent =
  | { type: "move-requested"; workspaceId: string; pageId: string }
  | { type: "import-requested"; workspaceId: string; files: File[] }
  | { type: "closed" };

export function transitionLocalFolderTargetPicker(
  _state: LocalFolderTargetPickerState,
  event: PickerEvent,
): LocalFolderTargetPickerState {
  switch (event.type) {
    case "move-requested":
      return { phase: "move", workspaceId: event.workspaceId, pageId: event.pageId };
    case "import-requested":
      return { phase: "import", workspaceId: event.workspaceId, files: event.files };
    case "closed":
      return { phase: "closed" };
  }
}

type PickerStore = {
  picker: LocalFolderTargetPickerState;
  openMovePicker: (workspaceId: string, pageId: string) => void;
  openImportPicker: (workspaceId: string, files: File[]) => void;
  closePicker: () => void;
};
export const useLocalFolderTargetPicker = create<PickerStore>((set) => {
  const send = (event: PickerEvent) => set(s => ({
    picker: transitionLocalFolderTargetPicker(s.picker, event),
  }));
  return {
    picker: { phase: "closed" },
    openMovePicker: (workspaceId, pageId) => send({ type: "move-requested", workspaceId, pageId }),
    openImportPicker: (workspaceId, files) => send({ type: "import-requested", workspaceId, files }),
    closePicker: () => send({ type: "closed" }),
  };
});
