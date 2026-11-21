import { shell } from "electron";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const BLOCK_BUNDLE_ID = "dev.eachann.block";
const STAGE_PREFIX = ".goose-update-";

export const installedThinkly = () => path.resolve(process.execPath, "../../..");

async function plistValue(bundle: string, key: string): Promise<string> {
  const plist = path.join(bundle, "Contents", "Info.plist");
  return (await exec("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", plist])).stdout.trim();
}

async function validateBlock(bundle: string): Promise<void> {
  if (await plistValue(bundle, "CFBundleIdentifier") !== BLOCK_BUNDLE_ID) throw new Error("payload is not Block");
  const executable = path.join(bundle, "Contents", "MacOS", await plistValue(bundle, "CFBundleExecutable"));
  const archs = (await exec("/usr/bin/lipo", ["-archs", executable])).stdout.trim().split(/\s+/);
  if (!archs.includes(process.arch === "arm64" ? "arm64" : "x86_64")) throw new Error("Block architecture mismatch");
  await exec("/usr/bin/codesign", ["--verify", "--deep", "--strict", bundle]);
}

async function findBlockBundle(mount: string): Promise<string> {
  for (const name of await readdir(mount)) {
    if (!name.endsWith(".app")) continue;
    const bundle = path.join(mount, name);
    const identifier = await plistValue(bundle, "CFBundleIdentifier").catch(() => "");
    if (identifier === BLOCK_BUNDLE_ID) return bundle;
  }
  throw new Error("Block.app not found in payload");
}

async function stageBlock(payload: string, destination: string): Promise<string> {
  const mount = await mkdtemp(path.join(tmpdir(), "thinkly-block-"));
  const stage = await mkdtemp(path.join(path.dirname(destination), STAGE_PREFIX));
  let attached = false;
  try {
    await exec("/usr/bin/hdiutil", ["attach", "-nobrowse", "-readonly", "-noautoopen", "-noverify", "-mountpoint", mount, payload]);
    attached = true;
    const staged = path.join(stage, "Block.app");
    await exec("/usr/bin/ditto", [await findBlockBundle(mount), staged]);
    await validateBlock(staged);
    return stage;
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    throw error;
  } finally {
    if (attached) await exec("/usr/bin/hdiutil", ["detach", "-force", mount]).catch(() => undefined);
    await rm(mount, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function installBlockMac(payload: string, prepare: () => void): Promise<void> {
  const thinkly = installedThinkly();
  if (!thinkly.endsWith(".app") || thinkly.includes("/AppTranslocation/") || thinkly.startsWith("/Volumes/")) {
    throw new Error("Thinkly is not installed in an applications folder");
  }
  const destination = path.join(path.dirname(thinkly), "Block.app");
  if (existsSync(destination)) {
    if (await plistValue(destination, "CFBundleIdentifier") !== BLOCK_BUNDLE_ID) throw new Error("another app occupies Block.app");
  } else {
    const stage = await stageBlock(payload, destination);
    try {
      await rename(path.join(stage, "Block.app"), destination);
    } finally {
      await rm(stage, { recursive: true, force: true });
    }
  }
  prepare();
  await exec("/usr/bin/open", [destination]);
  await shell.trashItem(thinkly).catch((error: unknown) => console.error("[block-migration] could not trash Thinkly", error));
}
