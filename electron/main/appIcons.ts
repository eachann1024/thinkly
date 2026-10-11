import { app, nativeImage } from "electron";
import { stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { OpenApp } from "./apps";
const execFileAsync = promisify(execFile);
const icons = new Map<string, { icon?: string; expires: number }>();
const pending = new Map<string, Promise<OpenApp>>();

async function identity(appPath: string): Promise<string | null> {
  try {
    const targets =
      process.platform === "darwin"
        ? [
            appPath,
            path.join(appPath, "Contents", "Info.plist"),
            path.join(appPath, "Contents", "Resources"),
          ]
        : [appPath];
    const states = await Promise.all(targets.map((target) => stat(target)));
    return JSON.stringify([
      appPath,
      ...states.map((state) => [state.mtimeMs, state.size]),
    ]);
  } catch {
    return null;
  }
}

async function loadIcons(found: OpenApp[]): Promise<OpenApp[]> {
  if (process.platform === "darwin" && found.length) {
    try {
      const script =
        'function run(paths) { ObjC.import("AppKit"); return JSON.stringify(paths.map(p => { try { const image = $.NSWorkspace.sharedWorkspace.iconForFile($(p)); const bitmap = $.NSBitmapImageRep.alloc.initWithData(image.TIFFRepresentation); const png = bitmap.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({})); return ObjC.unwrap(png.base64EncodedStringWithOptions(0)); } catch (_) { return null; } })); }';
      const { stdout } = await execFileAsync(
        "/usr/bin/osascript",
        ["-l", "JavaScript", "-e", script, ...found.map((item) => item.path)],
        {
          encoding: "utf8",
          maxBuffer: 32 * 1024 * 1024,
          timeout: 15000,
        },
      );
      const encoded = JSON.parse(stdout) as (string | null)[];
      return found.map((item, index) => {
        const image = encoded[index]
          ? nativeImage.createFromBuffer(Buffer.from(encoded[index], "base64"))
          : null;
        return image && !image.isEmpty()
          ? {
              ...item,
              icon: image.resize({ width: 32, height: 32 }).toDataURL(),
            }
          : item;
      });
    } catch (error) {
      console.warn("[apps] macOS 应用图标读取失败", error);
      return found;
    }
  }
  return Promise.all(
    found.map(async (item) => {
      try {
        const icon = await app.getFileIcon(item.path, { size: "small" });
        return { ...item, icon: icon.toDataURL() };
      } catch {
        return item;
      }
    }),
  );
}

/** Only extracted display assets are cached; launch and permission checks stay live. */
export async function withAppIcons(found: OpenApp[]): Promise<OpenApp[]> {
  const keys = await Promise.all(found.map((item) => identity(item.path)));
  const output = new Map<number, Promise<OpenApp>>();
  const missing: Array<{ item: OpenApp; key: string | null; index: number }> =
    [];
  found.forEach((item, index) => {
    const key = keys[index];
    const cached = key ? icons.get(key) : undefined;
    if (cached && Date.now() < cached.expires) {
      icons.delete(key!);
      icons.set(key!, cached);
      output.set(index, Promise.resolve({ ...item, icon: cached.icon }));
    } else if (key && pending.has(key)) {
      output.set(
        index,
        pending.get(key)!.then((result) => ({ ...item, icon: result.icon })),
      );
    } else missing.push({ item, key, index });
  });
  if (missing.length) {
    const batch = loadIcons(missing.map(({ item }) => item));
    missing.forEach(({ item, key, index }, batchIndex) => {
      const result = batch
        .then((items) => {
          const loaded = items[batchIndex] ?? item;
          if (key) {
            icons.delete(key);
            icons.set(key, {
              icon: loaded.icon,
              expires: Date.now() + (loaded.icon ? 300_000 : 3_000),
            });
            while (icons.size > 128) icons.delete(icons.keys().next().value!);
          }
          return loaded;
        })
        .finally(() => {
          if (key) pending.delete(key);
        });
      if (key) pending.set(key, result);
      output.set(index, result);
    });
  }
  return Promise.all(found.map((_, index) => output.get(index)!));
}
