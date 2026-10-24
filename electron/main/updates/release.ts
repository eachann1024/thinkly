import { t } from "../i18n/updates";
import { app, net } from "electron";
import { PUBLIC_UPDATE_URL, PUBLIC_GITHUB_UPDATE_URL, PUBLIC_RELEASES_REPO,
  parseReleaseTag, isTrustedUpdateAsset,
  type GithubReleaseAsset } from "../../../src/lib/appUpdateRelease";
import type { AppReleaseDetails } from "../../../src/lib/appUpdateTypes";

export type ReleaseDetails = AppReleaseDetails & { releaseUrl?: string };
export type VerifiedUpdate = ReleaseDetails & { version: string; path: string; asset: GithubReleaseAsset };
async function requestRelease(url: string): Promise<ReleaseDetails & { version: string; assets: GithubReleaseAsset[] }> {
  const response = await net.fetch(`${url}?t=${Date.now()}`, {
    headers: { "User-Agent": `Thinkly/${app.getVersion()}`, "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15_000), credentials: "omit",
  });
  if (!response.ok) throw new Error(t("releaseHttp", { status: response.status }));
  const payload = await response.json() as {
    tag_name?: string; assets?: unknown[]; releaseNotes?: string; publishedAt?: string;
  };
  const parsed = parseReleaseTag(String(payload.tag_name ?? ""));
  if (!parsed || !Array.isArray(payload.assets)) throw new Error(t("invalidRelease"));
  const assets = payload.assets.filter((asset): asset is GithubReleaseAsset => Boolean(asset &&
    typeof asset === "object" && isTrustedUpdateAsset(asset as GithubReleaseAsset, parsed.tag)));
  if (!assets.length || assets.length !== payload.assets.length) throw new Error(t("invalidAssets"));
  const releaseNotes = typeof payload.releaseNotes === "string" ? payload.releaseNotes.slice(0, 100_000).trim() : "";
  const publishedAt = typeof payload.publishedAt === "string" && Number.isFinite(Date.parse(payload.publishedAt))
    ? new Date(payload.publishedAt).toISOString() : undefined;
  const releaseUrl = `https://github.com/${PUBLIC_RELEASES_REPO}/releases/tag/${encodeURIComponent(parsed.tag)}`;
  return { version: parsed.version, assets, releaseNotes, publishedAt, releaseUrl };
}

export async function fetchRelease(): ReturnType<typeof requestRelease> {
  const sources = [...new Set([PUBLIC_UPDATE_URL, PUBLIC_GITHUB_UPDATE_URL])];
  let failure: unknown;
  for (const source of sources) {
    try { return await requestRelease(source); }
    catch (error) { failure = error; }
  }
  throw failure instanceof Error ? failure : new Error(t("releaseFailed"));
}
