import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { assertAllowed, findVaultRootContaining } from "./allowlist";
import { withSelfWriteMark } from "./ipc/watchEvents";
import { isCanonicalPathInside } from "../../src/lib/canonicalLocalPath";
import {
  MAX_LOCAL_ASSET_BYTES,
  type SaveLocalAssetRequest,
  type SavedLocalAssetPath,
} from "../../src/lib/local-file-asset-contract";

/** Only creates a fresh file in a registered notebook; never follows assets symlinks. */
export async function saveNotebookAsset(input: SaveLocalAssetRequest): Promise<SavedLocalAssetPath> {
  if (!input || typeof input.name !== "string" || typeof input.notebookRoot !== "string" ||
      typeof input.pageLocalFilePath !== "string" || !(input.data instanceof Uint8Array)) {
    throw new Error("Invalid attachment request");
  }
  if (!input.data.byteLength || input.data.byteLength > MAX_LOCAL_ASSET_BYTES) {
    throw new Error("Attachment must be between 1 byte and 256 MiB");
  }
  const root = assertAllowed(input.notebookRoot);
  const page = assertAllowed(input.pageLocalFilePath);
  if (!findVaultRootContaining(root) || !isCanonicalPathInside(page, root)) {
    throw new Error("Attachment target is outside the notebook");
  }
  const realRoot = await realpath(root);
  const parent = path.dirname(page);
  const realParent = await realpath(parent);
  if (!isCanonicalPathInside(realParent, realRoot)) {
    throw new Error("Attachment directory is outside the notebook");
  }
  const assets = path.join(parent, "assets");
  await withSelfWriteMark([assets], () => mkdir(assets, { recursive: true }).then(() => {}));
  const assetsInfo = await lstat(assets);
  if (!assetsInfo.isDirectory() || assetsInfo.isSymbolicLink()) {
    throw new Error("Attachment directory must be a regular directory");
  }
  const realAssets = await realpath(assets);
  if (!isCanonicalPathInside(realAssets, realRoot) || path.dirname(realAssets) !== realParent) {
    throw new Error("Attachment directory is outside the notebook");
  }
  const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
  const suffix = /^[a-z0-9]{1,12}$/.test(extension) && input.name.includes(".") ? extension : "bin";
  const filename = `asset_${randomUUID()}.${suffix}`;
  const absolutePath = path.join(realAssets, filename);
  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
  let created = false;
  try {
    await withSelfWriteMark([absolutePath], async () => {
      const handle = await open(absolutePath, flags, 0o600);
      created = true;
      try {
        if (!isCanonicalPathInside(await realpath(absolutePath), realRoot)) {
          throw new Error("Attachment directory changed while saving");
        }
        await handle.writeFile(input.data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    });
  } catch (error) {
    if (created) await unlink(absolutePath).catch(() => {});
    throw error;
  }
  return { url: `./assets/${filename}`, absolutePath: path.join(assets, filename) };
}
