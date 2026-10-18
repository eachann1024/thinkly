import { registerAssetMaintenanceIpc } from "./assetMaintenance";
import { app } from "electron";
import { registerPreviewWorkerIpc } from "./previewWorker";
import path from "node:path";
import { attachmentsRoot } from "./allowlist";
import { registerOpenMarkdownIpc } from "./openMarkdownFiles";
import { cleanupOldTrashUndoCopies } from "./trashUndo";
import { hookWindowVisibilityForWatch } from "./ipc/watchEvents";
import { registerDialogsIpc } from "./ipc/dialogs";
import { registerFilesystemIpc } from "./ipc/filesystem";
import { registerWatchIpc } from "./ipc/watch";
import { registerIntegrationIpc } from "./ipc/integration";
import { registerUpdatesIpc } from "./ipc/updates";
import { registerClipboardIpc } from "./ipc/clipboard";
import { registerWindowsIpc } from "./ipc/windows";
import { registerHotkeysIpc } from "./ipc/hotkeys";
import { registerWebIpc } from "./ipc/web";

export { closeAllWatchers } from "./ipc/watchEvents";

export function registerIpcHandlers(): void {
  registerAssetMaintenanceIpc();
  registerPreviewWorkerIpc();
  hookWindowVisibilityForWatch();
  registerOpenMarkdownIpc();
  const undoRoot = path.join(app.getPath("userData"), "trash-undo");
  void cleanupOldTrashUndoCopies(undoRoot).catch((error) =>
    console.warn("[trash-undo] cleanup failed", error),
  );
  registerDialogsIpc();
  registerFilesystemIpc(undoRoot);
  registerWatchIpc();
  registerIntegrationIpc();
  registerUpdatesIpc();
  registerClipboardIpc();
  registerWindowsIpc();
  registerHotkeysIpc();
  registerWebIpc();
  void attachmentsRoot;
}
