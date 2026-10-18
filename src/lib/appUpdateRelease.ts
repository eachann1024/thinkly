export const PUBLIC_RELEASES_REPO = "eachann1024/thinkly";
export const LEGACY_RELEASES_REPO = "eachann1024/goose-notes";
const PREVIOUS_RELEASES_REPO = "eachann1024/goose-note";
export const PUBLIC_RELEASES_LATEST_URL = `https://github.com/${PUBLIC_RELEASES_REPO}/releases/latest`;
export const PUBLIC_RELEASES_API_URL = `https://api.github.com/repos/${PUBLIC_RELEASES_REPO}/releases/latest`;
export const PUBLIC_GITHUB_UPDATE_URL = `https://raw.githubusercontent.com/${PUBLIC_RELEASES_REPO}/main/updates/latest.json`;
export const PUBLIC_UPDATE_URL = PUBLIC_GITHUB_UPDATE_URL;

export type GithubReleaseAsset = {
  name: string;
  browser_download_url: string;
  sha256?: string;
};

export type ParsedReleaseVersion = {
  version: string;
  tag: string;
};

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-[a-f0-9]{7,40})?$/i;

export function parseReleaseTag(tag: string): ParsedReleaseVersion | null {
  const trimmed = tag.trim();
  if (!trimmed) return null;
  const match = SEMVER_RE.exec(trimmed);
  if (!match) return null;
  return { version: `${match[1]}.${match[2]}.${match[3]}`, tag: trimmed };
}

export function compareSemver(a: string, b: string): number {
  const parse = (value: string) => {
    const parsed = parseReleaseTag(value);
    if (!parsed) return [0, 0, 0];
    return parsed.version.split(".").map((part) => Number(part) || 0);
  };
  const left = parse(a);
  const right = parse(b);
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

export function pickUpdateAsset(
  assets: GithubReleaseAsset[],
  platform: string,
  arch: string,
): GithubReleaseAsset | null {
  const names = assets.filter((asset) => asset.name && asset.browser_download_url);
  if (names.length === 0) return null;

  const isArm = arch === "arm64";
  if (platform === "darwin") {
    if (arch !== "arm64" && arch !== "x64") return null;
    const native = names.filter((asset) => asset.name.toLowerCase().includes("arm64") === isArm);
    return native.find((asset) => asset.name.toLowerCase().endsWith("-mac.zip")) ??
      native.find((asset) => asset.name.toLowerCase().endsWith(".dmg")) ?? null;
  }

  if (platform === "win32") {
    const exes = names.filter((asset) => asset.name.toLowerCase().endsWith(".exe"));
    const native = exes.find((asset) => asset.name.toLowerCase().includes("arm64") === isArm);
    // Windows on ARM can run the x64 installer under emulation if a release has no arm64 build.
    return native ?? (isArm ? exes[0] : null) ?? null;
  }

  if (platform !== "linux" || arch !== "x64") return null;
  const linux = names.filter((asset) => {
    const lower = asset.name.toLowerCase();
    return (
      lower.endsWith(".appimage") ||
      lower.endsWith(".deb") ||
      lower.endsWith(".pacman")
    );
  });
  const archHint = isArm ? "arm64" : "amd64";
  return (
    linux.find((asset) => asset.name.toLowerCase().endsWith(".appimage") && asset.name.toLowerCase().includes(archHint)) ??
    linux.find((asset) => asset.name.toLowerCase().endsWith(".appimage")) ??
    linux.find((asset) => asset.name.toLowerCase().includes(archHint)) ??
    linux[0] ??
    null
  );
}

export function isGithubDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "github.com" ||
      host === "objects.githubusercontent.com" ||
      host.endsWith(".githubusercontent.com")
    );
  } catch {
    return false;
  }
}

export function isTrustedUpdateAsset(asset: GithubReleaseAsset, tag: string): boolean {
  if (typeof asset.name !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(asset.name) ||
    !/^[a-f0-9]{64}$/i.test(asset.sha256 ?? "")) return false;
  const suffix = `${encodeURIComponent(tag)}/${encodeURIComponent(asset.name)}`;
  return [PUBLIC_RELEASES_REPO, PREVIOUS_RELEASES_REPO, LEGACY_RELEASES_REPO].some((repo) =>
    asset.browser_download_url === `https://github.com/${repo}/releases/download/${suffix}`);
}
