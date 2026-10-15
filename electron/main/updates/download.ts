import { app, net } from "electron";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { GithubReleaseAsset } from "../../../src/lib/appUpdateRelease";
import { setUpdateState } from "./state";
import type { ReleaseDetails, VerifiedUpdate } from "./release";
import { addSessionAllowed } from "../allowlist";

export async function verifyUpdateFile(update: VerifiedUpdate): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(update.asset.sha256 ?? "")) throw new Error("安装包缺少校验信息");
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(update.path)) digest.update(chunk);
  if (digest.digest("hex") !== update.asset.sha256!.toLowerCase()) throw new Error("安装包校验失败，请重新下载");
}

export async function downloadVerifiedUpdate(version: string, asset: GithubReleaseAsset, details: ReleaseDetails): Promise<VerifiedUpdate> {
  const directory = path.join(app.getPath("userData"), "app-updates", version);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const target = path.join(directory, asset.name);
  const partial = `${target}.part`;
  const response = await net.fetch(asset.browser_download_url, { signal: AbortSignal.timeout(30 * 60_000), credentials: "omit" });
  if (!response.ok || !response.body) throw new Error(`下载失败（${response.status}）`);
  const total = Number(response.headers.get("content-length"));
  let received = 0, lastPercent = -1;
  const progress = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    received += chunk.length;
    const percent = total > 0 ? Math.min(99, Math.floor(received * 100 / total)) : 0;
    if (percent !== lastPercent) {
      lastPercent = percent;
      setUpdateState({ ...details, status: "downloading", version, percent });
    }
    callback(null, chunk);
  } });
  const file = await open(partial, "w", 0o600);
  try {
    await pipeline(Readable.fromWeb(response.body as never), progress, file.createWriteStream());
    const update = { ...details, version, path: partial, asset };
    await verifyUpdateFile(update);
    await rename(partial, target);
    addSessionAllowed(target);
    setUpdateState({ ...details, status: "downloading", version, percent: 100, message: "正在准备安装" });
    return { ...update, path: target };
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  } finally { await file.close().catch(() => {}); }
}
