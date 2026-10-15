import { app, net } from "electron";
import { PUBLIC_UPDATE_URL, PUBLIC_RELEASES_REPO, parseReleaseTag, isGithubDownloadUrl,
  type GithubReleaseAsset } from "../../../src/lib/appUpdateRelease";

export type VerifiedUpdate = { version: string; path: string; asset: GithubReleaseAsset; installStage?: string };
export async function fetchRelease(): Promise<{ version: string; assets: GithubReleaseAsset[] }> {
  const response = await net.fetch(`${PUBLIC_UPDATE_URL}?t=${Date.now()}`, {
    headers: { "User-Agent": `Goose-Note/${app.getVersion()}`, "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000), credentials: "omit",
  });
  if (!response.ok) throw new Error(`无法读取更新信息（${response.status}）`);
  const payload = await response.json() as { tag_name?: string; assets?: GithubReleaseAsset[] };
  const parsed = parseReleaseTag(String(payload.tag_name ?? ""));
  if (!parsed || !Array.isArray(payload.assets)) throw new Error("更新信息无效");
  const prefix = `https://github.com/${PUBLIC_RELEASES_REPO}/releases/download/${encodeURIComponent(parsed.tag)}/`;
  const assets = payload.assets.filter((asset) => typeof asset.name === "string" &&
    asset.name.length > 0 && asset.name !== "." && asset.name !== ".." &&
    asset.name === asset.name.split(/[\\/]/).pop() && /^[a-f0-9]{64}$/i.test(asset.sha256 ?? "") &&
    isGithubDownloadUrl(asset.browser_download_url) && asset.browser_download_url.startsWith(prefix) &&
    decodeURIComponent(asset.browser_download_url.slice(prefix.length)) === asset.name);
  return { version: parsed.version, assets };
}
