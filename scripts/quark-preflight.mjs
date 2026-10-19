import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { releaseInstallers } from "./desktop-download-metadata.mjs";
import { QuarkFailure, listChildren, readCookie, redactSecrets } from "./quark-api.mjs";

export const INSTALL_FOLDER = "Thinkly 安装包";
export const LEGACY_INSTALL_FOLDER = "鹅的笔记安装包";

export function expectedInstallers(version) {
  return releaseInstallers(version).filter((name) => !name.endsWith(".zip"));
}

function isDirectory(item) {
  return item?.file === false || item?.dir === true || item?.file_type === 0;
}

function listedFile(item) {
  if (!item?.fid || !item.file_name) return false;
  if (item.dir === true || item.file === false) return false;
  if (item.file_type === 0 && item.file !== true) return false;
  return true;
}

function fileSize(item) {
  const size = Number(item?.size);
  return Number.isInteger(size) && size >= 0 ? size : -1;
}

export function versionFromReleaseTag(tag) {
  return /^v(\d+\.\d+\.\d+)(?:-|$)/.exec(String(tag ?? ""))?.[1] ?? "";
}

export function assertRelease(release, version, requireStable) {
  if (versionFromReleaseTag(release?.tagName) !== version) {
    throw Object.assign(new QuarkFailure("版本号与 Release 不一致"), { reason: "bad_version" });
  }
  if (requireStable && (release.isDraft !== false || release.isPrerelease !== false)) {
    throw Object.assign(new QuarkFailure("需要正式 Release"), { reason: "release_not_stable" });
  }
}

export function sizesFromRelease(release, version) {
  const assets = new Map((Array.isArray(release?.assets) ? release.assets : []).map((asset) => [asset?.name, Number(asset?.size)]));
  const sizes = new Map();
  const missing = [];
  for (const name of expectedInstallers(version)) {
    const size = assets.get(name);
    if (!Number.isInteger(size) || size < 0) missing.push(name);
    else sizes.set(name, size);
  }
  if (missing.length) {
    throw Object.assign(new QuarkFailure(`缺少安装包：${missing.join("、")}`), { reason: "missing_installers" });
  }
  return sizes;
}

export function releaseAlreadyPresent(entries, version, sizes) {
  const names = expectedInstallers(version);
  if (!names.length || !(sizes instanceof Map)) return false;
  return names.every((name) => {
    const expected = sizes.get(name);
    if (!Number.isInteger(expected) || expected < 0) return false;
    return (entries ?? []).some((item) => listedFile(item) && item.file_name === name && fileSize(item) === expected);
  });
}

export async function listInstallFolder(listChildren, cookie) {
  const root = await listChildren(cookie, "0");
  if (!Array.isArray(root)) throw new QuarkFailure("夸克目录列表无效");
  const next = root.find((item) => item?.file_name === INSTALL_FOLDER && isDirectory(item) && item.fid);
  const legacy = root.find((item) => item?.file_name === LEGACY_INSTALL_FOLDER && isDirectory(item) && item.fid);
  const folder = next ?? legacy;
  if (!folder) return [];
  const entries = await listChildren(cookie, String(folder.fid));
  if (!Array.isArray(entries)) throw new QuarkFailure("夸克目录列表无效");
  return entries;
}

function emit(line, error = false) {
  const safe = redactSecrets(line);
  if (error) console.error(safe);
  else console.log(safe);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${safe}\n`);
}

function failureReason(error) {
  if (typeof error?.reason === "string" && error.reason) return error.reason;
  const message = String(error?.message ?? "");
  if (message.includes("未配置")) return "not_configured";
  if (message.includes("Cookie 失效")) return "cookie_invalid";
  if (message.includes("超时")) return "timeout";
  if (message.includes("缺少安装包")) return "missing_installers";
  if (message.includes("版本号")) return "bad_version";
  if (message.includes("网络")) return "network";
  const status = /HTTP (\d+)/.exec(message)?.[1];
  if (status) return `list_http_${status}`;
  return "upload_failed";
}

export function reportFailure(version, error) {
  const safeVersion = /^\d+\.\d+\.\d+$/.test(version) ? version : "unknown";
  const reason = redactSecrets(failureReason(error)).replace(/\s+/g, "_");
  emit(`QUARK_UPLOAD_FAILED version=${safeVersion} reason=${reason}`, true);
  const message = redactSecrets(error instanceof Error ? error.message : "夸克上传失败");
  if (message && message !== `QUARK_UPLOAD_FAILED version=${safeVersion} reason=${reason}`) console.error(message);
}

export async function finishPreflight(deps) {
  const version = String(deps.version ?? "").replace(/^v/, "");
  try {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
      throw Object.assign(new QuarkFailure("版本号无效"), { reason: "bad_version" });
    }
    let sizes = deps.sizes;
    if (deps.release) {
      assertRelease(deps.release, version, deps.requireStable);
      sizes = sizesFromRelease(deps.release, version);
    }
    const cookie = deps.cookie ?? readCookie();
    const entries = await listInstallFolder(deps.listChildren, cookie);
    if (releaseAlreadyPresent(entries, version, sizes)) {
      emit(`QUARK_UPLOAD_SKIPPED: v${version} already present`);
      return 0;
    }
    emit(`QUARK_UPLOAD_NEEDED version=${version}`);
    return 10;
  } catch (error) {
    reportFailure(version, error);
    return 1;
  }
}

function readRelease(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw Object.assign(new QuarkFailure("无法读取 Release 元数据"), { reason: "release_lookup_failed" });
  }
}

async function cli() {
  const version = String(process.argv[3] ?? "").replace(/^v/, "");
  try {
    process.exitCode = await finishPreflight({
      version,
      release: readRelease(process.argv[2] ?? ""),
      requireStable: process.argv[4] === "1",
      listChildren,
    });
  } catch (error) {
    reportFailure(version, error);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await cli();
}
