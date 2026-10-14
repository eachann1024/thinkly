import { app } from "electron";
import { constants } from "node:fs";
import { access, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { durableAtomicWrite } from "./gitSyncDisk";

type DialogPurpose = "notebook" | "recovery" | "import" | "export";
type DialogHistory = Partial<Record<DialogPurpose, string>>;
const purposes: DialogPurpose[] = ["notebook", "recovery", "import", "export"];
let loaded: Promise<DialogHistory> | undefined;
let writes: Promise<void> = Promise.resolve();
const historyFile = () => path.join(app.getPath("userData"), "dialog-locations.json");

function absolutePath(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length < 32_768
    && !value.includes("\0") && path.isAbsolute(value);
}

function readHistory() {
  loaded ??= (async () => {
    try {
      const value: unknown = JSON.parse(await readFile(historyFile(), "utf8"));
      if (!value || typeof value !== "object" || !("directories" in value)) return {};
      const directories = value.directories;
      if (!directories || typeof directories !== "object") return {};
      return Object.fromEntries(purposes.flatMap((purpose) => {
        const candidate = (directories as DialogHistory)[purpose];
        return absolutePath(candidate) ? [[purpose, candidate]] : [];
      })) as DialogHistory;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn("[dialogs] 无法读取目录记忆，将使用默认位置", error);
      }
      return {};
    }
  })();
  return loaded;
}

/** Invalid hints never create directories or grant access to their contents. */
async function nearestDirectory(candidate: unknown): Promise<string | undefined> {
  if (!absolutePath(candidate)) return;
  let current = path.normalize(candidate);
  while (true) {
    try {
      if ((await stat(current)).isDirectory()) {
        await access(current, constants.R_OK | (process.platform === "win32" ? 0 : constants.X_OK));
        return current;
      }
    } catch {
      // A missing/offline/unreadable location can still have a usable parent.
    }
    const parent = path.dirname(current);
    // Do not drop the user at a drive/filesystem root after losing a location.
    if (parent === current || parent === path.parse(parent).root) return;
    current = parent;
  }
}

export async function dialogDirectory(
  purpose: DialogPurpose,
  preferredPath?: string,
  fallbackPath?: string,
) {
  const history = await readHistory();
  const candidate = absolutePath(preferredPath) ? preferredPath : history[purpose] ?? fallbackPath;
  const rememberedDirectory = await nearestDirectory(candidate);
  if (rememberedDirectory) return rememberedDirectory;
  for (const location of ["documents", "home"] as const) {
    const directory = await nearestDirectory(app.getPath(location));
    if (directory) return directory;
  }
  return undefined;
}

export async function saveDialogPath(defaultPath?: string) {
  const suggested = typeof defaultPath === "string" && !defaultPath.includes("\0") ? defaultPath : "";
  const absolute = absolutePath(suggested);
  const directory = await dialogDirectory("export", absolute ? path.dirname(suggested) : undefined);
  const filename = path.basename(suggested);
  return filename && filename !== "." ? path.join(directory ?? app.getPath("documents"), filename) : directory;
}

/** Serialize different windows' confirmations, and persist before the picker is released. */
export async function rememberDialogDirectory(purpose: DialogPurpose, directory: string) {
  if (!absolutePath(directory)) return;
  const operation = writes.then(async () => {
    const history = await readHistory();
    history[purpose] = path.normalize(directory);
    await mkdir(app.getPath("userData"), { recursive: true });
    await durableAtomicWrite(historyFile(), JSON.stringify({ version: 1, directories: history }, null, 2));
  });
  writes = operation.catch((error) => {
    // A preferences write must not turn a confirmed file operation into a failure.
    console.warn("[dialogs] 无法保存目录记忆", error);
  });
  await writes;
}
