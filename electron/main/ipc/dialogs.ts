import { createTranslator, i18nYaml } from "../../../src/i18n/core";
import { dialog, ipcMain } from "electron";
import path from "node:path";
import type { DirectoryDialogOptions, OpenFileDialogOptions, SaveFileDialogOptions } from "../../../src/lib/native-dialog-contract";
import { addSessionAllowed, addVaultRoot } from "../allowlist";
import { getMainWindow } from "../windows";
import { dialogDirectory, rememberDialogDirectory, saveDialogPath } from "../dialogHistory";
import { withWindowDialog } from "../dialogSession";
import { senderWindow } from "./common";

const t = createTranslator(i18nYaml<"electron/main/ipc/dialogs.ts#block1:1">`
zh-Hans:
  markdownFolder: 选择 Markdown 文件夹
en:
  markdownFolder: Choose a Markdown folder
ja:
  markdownFolder: "Markdown フォルダを選択"
`);

export function registerDialogsIpc(): void {
  ipcMain.handle("desktop:selectDirectory", async (event, opts: DirectoryDialogOptions = {}) => {
    return withWindowDialog<string | null>(senderWindow(event) ?? getMainWindow(), null, async (win) => {
      const purpose = opts.purpose === "recovery" ? "recovery" : "notebook";
      const defaultPath = await dialogDirectory(purpose, opts.defaultPath, opts.fallbackPath);
      if (win?.isDestroyed()) return null;
      const result = win
        ? await dialog.showOpenDialog(win, {
            properties: ["openDirectory"],
            title: t("markdownFolder"),
            defaultPath,
          })
        : await dialog.showOpenDialog({
            properties: ["openDirectory"],
            title: t("markdownFolder"),
            defaultPath,
          });
      if (result.canceled || result.filePaths.length === 0) return null;
      const selected = addVaultRoot(result.filePaths[0]);
      await rememberDialogDirectory(purpose, selected);
      return selected;
    });
  });

  ipcMain.handle(
    "desktop:showOpenDialog",
    async (
      event,
      opts: OpenFileDialogOptions = {},
    ) => {
      return withWindowDialog<string[] | null>(senderWindow(event) ?? getMainWindow(), null, async (win) => {
        const defaultPath = await dialogDirectory("import", opts.defaultPath);
        if (win?.isDestroyed()) return null;
        const properties: Array<"openFile" | "multiSelections"> = ["openFile"];
        if (opts.multiple) properties.push("multiSelections");
        const dialogOptions = { properties, filters: opts.filters, defaultPath };
        const result = win
          ? await dialog.showOpenDialog(win, dialogOptions)
          : await dialog.showOpenDialog(dialogOptions);
        if (result.canceled || result.filePaths.length === 0) return null;
        const selected = result.filePaths.map((p) => addSessionAllowed(p));
        await rememberDialogDirectory("import", path.dirname(selected[0]));
        return selected;
      });
    },
  );

  ipcMain.handle(
    "desktop:showSaveDialog",
    async (
      event,
      opts: SaveFileDialogOptions = {},
    ) => {
      return withWindowDialog<string | null>(senderWindow(event) ?? getMainWindow(), null, async (win) => {
        const defaultPath = await saveDialogPath(opts.defaultPath);
        if (win?.isDestroyed()) return null;
        const result = win
          ? await dialog.showSaveDialog(win, { defaultPath, filters: opts.filters })
          : await dialog.showSaveDialog({ defaultPath, filters: opts.filters });
        if (result.canceled || !result.filePath) return null;
        const selected = addSessionAllowed(result.filePath);
        await rememberDialogDirectory("export", path.dirname(selected));
        return selected;
      });
    },
  );
}
