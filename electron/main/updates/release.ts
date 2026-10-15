import { app, net } from "electron";
import { PUBLIC_UPDATE_URL, PUBLIC_RELEASES_REPO, parseReleaseTag, isGithubDownloadUrl,
  type GithubReleaseAsset } from "../../../src/lib/appUpdateRelease";
import type { AppReleaseDetails } from "../../../src/lib/appUpdateTypes";

export type ReleaseDetails = AppReleaseDetails & { releaseUrl?: string };
export type VerifiedUpdate = ReleaseDetails & { version: string; path: string; asset: GithubReleaseAsset };
export async function fetchRelease(): Promise<ReleaseDetails & { version: string; assets: GithubReleaseAsset[] }> {
  const response = await net.fetch(`${PUBLIC_UPDATE_URL}?t=${Date.now()}`, {
    headers: { "User-Agent": `Goose-Note/${app.getVersion()}`, "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(30_000), credentials: "omit",
  });
  if (!response.ok) throw new Error(`无法读取更新信息（${response.status}）`);
  const payload = await response.json() as {
    tag_name?: string; assets?: GithubReleaseAsset[]; releaseNotes?: string; publishedAt?: string;
  };
  const parsed = parseReleaseTag(String(payload.tag_name ?? ""));
  if (!parsed || !Array.isArray(payload.assets)) throw new Error("更新信息无效");
  const prefix = `https://github.com/${PUBLIC_RELEASES_REPO}/releases/download/${encodeURIComponent(parsed.tag)}/`;
  const assets = payload.assets.filter((asset) => typeof asset.name === "string" &&
    asset.name.length > 0 && asset.name !== "." && asset.name !== ".." &&
    asset.name === asset.name.split(/[\\/]/).pop() && /^[a-f0-9]{64}$/i.test(asset.sha256 ?? "") &&
    isGithubDownloadUrl(asset.browser_download_url) && asset.browser_download_url.startsWith(prefix) &&
    decodeURIComponent(asset.browser_download_url.slice(prefix.length)) === asset.name);
  const releaseNotes = typeof payload.releaseNotes === "string" ? payload.releaseNotes.slice(0, 100_000).trim() : "";
  const publishedAt = typeof payload.publishedAt === "string" && Number.isFinite(Date.parse(payload.publishedAt))
    ? new Date(payload.publishedAt).toISOString() : undefined;
  const releaseUrl = `https://github.com/${PUBLIC_RELEASES_REPO}/releases/tag/${encodeURIComponent(parsed.tag)}`;
  return { version: parsed.version, assets, releaseNotes, publishedAt, releaseUrl };
}
