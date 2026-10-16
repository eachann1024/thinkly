import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertPublishVersion, compareVersions, getReleases, gh, REPO, versionFromTag } from "../desktop-release-support.mjs";
import { publishedDownloadMetadata } from "../desktop-download-metadata.mjs";
import { distributionConfig, objectKey, publicAssetUrl } from "./config.mjs";
import { downloadPage } from "./page.mjs";

function assertLatestRelease(release) {
  const releases = getReleases().filter((item) => !item.draft);
  assertPublishVersion(versionFromTag(release.tag_name), release.tag_name, releases);
  const latest = JSON.parse(gh(["api", `repos/${REPO}/releases/latest`]));
  assert.equal(latest.tag_name, release.tag_name, "Only the latest stable GitHub release can become the domestic update");
}

async function publicResponse(url, method = "GET") {
  const target = new URL(url);
  target.searchParams.set("verify", String(Date.now()));
  const response = await fetch(target, {
    method, redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { "Cache-Control": "no-cache", "Accept-Encoding": "identity" },
  });
  assert.ok(response.ok, `Public download is unavailable (${response.status}): ${url}`);
  return response;
}

export async function publishDistribution(release, options = {}) {
  const config = distributionConfig();
  if (!config) {
    assert.ok(!options.required, "Set config/desktop-distribution.json baseUrl before enabling domestic distribution");
    return;
  }
  const { ossClient, readJson, uploadInstaller, uploadText } = await import("./oss.mjs");
  const metadata = publishedDownloadMetadata(release);
  const feed = JSON.parse(metadata["updates/latest.json"]);
  const version = versionFromTag(release.tag_name);
  const tag = release.tag_name;
  assertLatestRelease(release);
  const client = ossClient(config);
  const current = await readJson(client, objectKey(config, "updates/latest.json"));
  if (current) {
    const currentVersion = versionFromTag(current.tag_name ?? "");
    assert.ok(currentVersion, "The current OSS update manifest is invalid; inspect it before publishing");
    assert.ok(compareVersions(version, currentVersion) >= 0, "Refusing to downgrade the domestic update");
    assert.ok(version !== currentVersion || tag === current.tag_name, "A published version cannot be reused with another tag");
  }
  const temporary = !options.directory;
  const directory = options.directory || await mkdtemp(join(tmpdir(), "goose-distribution-"));
  try {
    if (temporary) gh(["release", "download", tag, "--repo", REPO, "--dir", directory,
      ...release.assets.flatMap((asset) => ["--pattern", asset.name])]);
    for (const asset of release.assets) {
      assert.match(asset.digest ?? "", /^sha256:[a-f0-9]{64}$/, `Missing GitHub checksum: ${asset.name}`);
      const file = join(directory, asset.name);
      const { size } = await stat(file);
      assert.equal(size, asset.size, `Installer size mismatch: ${asset.name}`);
      const digest = asset.digest.slice("sha256:".length);
      await uploadInstaller(client, config, tag, asset.name, file, digest);
      const response = await publicResponse(publicAssetUrl(config, tag, asset.name), "HEAD");
      assert.equal(Number(response.headers.get("content-length")), size, `Public download size mismatch: ${asset.name}`);
      assert.equal(response.headers.get("x-oss-meta-sha256"), digest, `Public download metadata mismatch: ${asset.name}`);
      console.log(`Verified domestic download: ${asset.name}`);
    }
    feed.html_url = `${config.baseUrl}/releases/${encodeURIComponent(tag)}/index.html`;
    feed.assets = feed.assets.map((asset) => ({ ...asset,
      browser_download_url: publicAssetUrl(config, tag, asset.name),
    }));
    const manifest = JSON.stringify(feed) + "\n";
    const page = downloadPage(version, feed, release);
    await uploadText(client, config, `releases/${tag}/update.json`, manifest, "application/json", true);
    await uploadText(client, config, `releases/${tag}/index.html`, page, "text/html", true);
    assertLatestRelease(release);
    await uploadText(client, config, "index.html", page, "text/html");
    // This is the commit point: every referenced installer is already publicly accessible.
    await uploadText(client, config, "updates/latest.json", manifest, "application/json");
    const published = await (await publicResponse(`${config.baseUrl}/updates/latest.json`)).json();
    assert.deepEqual(published, feed, "CDN still serves an old manifest; disable caching for updates/latest.json");
    const publicPage = await (await publicResponse(`${config.baseUrl}/index.html`)).text();
    assert.equal(publicPage, page, "CDN still serves an old download page; disable caching for index.html");
    console.log(`Published domestic downloads: ${config.baseUrl}/index.html (${tag})`);
  } finally {
    if (temporary) await rm(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2];
  assert.ok(!tag || versionFromTag(tag), "Expected a stable published release tag");
  const endpoint = tag ? `repos/${REPO}/releases/tags/${encodeURIComponent(tag)}` : `repos/${REPO}/releases/latest`;
  const release = JSON.parse(gh(["api", endpoint]));
  await publishDistribution(release, { required: true });
}
