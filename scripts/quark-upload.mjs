import { appendFileSync, mkdtempSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QuarkFailure, assertCookie, deleteFiles, ensureFolder, listChildren, readCookie, renameFile } from "./quark-api.mjs";
import { uploadFile } from "./quark-oss.mjs";

const FOLDER_NAME = "鹅的笔记安装包";
const NOTE_NAME = "说明.txt";
const INSTALLERS = [
  /^Goose\.Note-(\d+\.\d+\.\d+)-arm64\.dmg$/,
  /^Goose\.Note-(\d+\.\d+\.\d+)\.dmg$/,
  /^Goose\.Note-(\d+\.\d+\.\d+)-(?:x64|arm64)-setup\.exe$/,
  /^Goose\.Note-(\d+\.\d+\.\d+)\.AppImage$/,
  /^goose-note-app_(\d+\.\d+\.\d+)_amd64\.deb$/,
  /^goose-note-app-(\d+\.\d+\.\d+)\.pacman$/,
];

function expectedInstallers(version) {
  return [
    `Goose.Note-${version}-arm64.dmg`, `Goose.Note-${version}.dmg`,
    `Goose.Note-${version}-x64-setup.exe`, `Goose.Note-${version}-arm64-setup.exe`,
    `Goose.Note-${version}.AppImage`, `goose-note-app_${version}_amd64.deb`,
    `goose-note-app-${version}.pacman`,
  ];
}

function installerVersion(name) {
  for (const pattern of INSTALLERS) {
    const match = pattern.exec(name);
    if (match) return match[1];
  }
  return "";
}

function compareSemver(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

function noteText(version) {
  return `思绪 · Thinkly 桌面版安装包。当前版本 v${version}。macOS 选 .dmg（Apple 芯片 arm64 / Intel x64），Windows 选 .exe（x64 / arm64），Linux 选 AppImage / deb / pacman。macOS 首次打开请看 https://github.com/eachann1024/thinkly/blob/main/docs/macos-installation.md 。源码与全部版本：https://github.com/eachann1024/thinkly/releases\n`;
}

function isFile(item, name) {
  return listed(item) && item.file_name === name;
}

function listed(item) {
  if (!item?.fid || !item.file_name) return false;
  if (item.dir === true || item.file === false) return false;
  if (item.file_type === 0 && item.file !== true) return false;
  return true;
}

function knownFiles(entries) {
  return entries.filter((item) => isFile(item, item.file_name) && (item.file_name === NOTE_NAME || installerVersion(item.file_name)));
}

function fileSize(item) {
  const size = Number(item?.size);
  return Number.isInteger(size) && size >= 0 ? size : -1;
}

function folderFiles(entries) {
  return entries.filter((item) => listed(item));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fileRole(canonical, fileName) {
  const suffix = "(?:\\(\\d+\\))?";
  const status = "(?:\\.(uploading|previous))?";
  const direct = new RegExp(`^${escapeRegExp(canonical)}${suffix}${status}${suffix}$`).exec(fileName);
  if (direct) return direct[1] ?? "final";
  const dot = canonical.lastIndexOf(".");
  if (dot <= 0) return "";
  const stem = escapeRegExp(canonical.slice(0, dot));
  const ext = escapeRegExp(canonical.slice(dot));
  const split = new RegExp(`^${stem}${suffix}${ext}${status}${suffix}$`).exec(fileName);
  return split ? (split[1] ?? "final") : "";
}

function related(entries, name) {
  return entries.filter((item) => listed(item) && fileRole(name, item.file_name));
}

function newest(items) {
  return [...items].sort((left, right) => Number(right.l_updated_at ?? right.updated_at ?? 0) - Number(left.l_updated_at ?? left.updated_at ?? 0))[0];
}

function withReason(error, reason) {
  if (error && !error.reason) error.reason = reason;
  return error;
}

async function pause(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUploaded(cookie, folderId, name, localSize, existingFids) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const found = newest(related(await listChildren(cookie, folderId), name)
      .filter((item) => fileSize(item) === localSize && !existingFids.has(item.fid)));
    if (found?.fid) return String(found.fid);
    if (attempt < 6) await pause(2000);
  }
  return "";
}

async function commitReplacement(cookie, folderId, name, fid) {
  const files = related(await listChildren(cookie, folderId), name).filter((item) => item.fid !== fid);
  const kept = files.find((item) => item.file_name === name);
  if (kept) await renameFile(cookie, kept.fid, `${name}.previous`);
  try {
    const extras = files.filter((item) => item.fid !== kept?.fid && item.file_name === name);
    if (extras.length) await deleteFiles(cookie, extras.map((item) => item.fid));
    await renameFile(cookie, fid, name);
  } catch (error) {
    if (kept) await renameFile(cookie, kept.fid, name);
    throw withReason(error, "rename_failed");
  }
  const after = related(await listChildren(cookie, folderId), name);
  await deleteFiles(cookie, [kept?.fid, ...after.filter((item) => item.fid !== fid).map((item) => item.fid)]);
}

function logFolder(entries) {
  const lines = folderFiles(entries)
    .map((item) => `QUARK_FILE name=${item.file_name} size=${fileSize(item)}`)
    .sort();
  console.log(["QUARK_FOLDER_FINAL", ...lines].join("\n"));
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${["QUARK_FOLDER_FINAL", ...lines].join("\n")}\n`);
}

async function uploadReplacing(cookie, folderId, source, name) {
  const localSize = statSync(source).size;
  const files = related(await listChildren(cookie, folderId), name);
  const exact = files.find((item) => item.file_name === name && fileSize(item) === localSize);
  const alias = newest(files.filter((item) => fileRole(name, item.file_name) === "final" && item.file_name !== name && fileSize(item) === localSize));
  const reusable = newest(files.filter((item) => fileRole(name, item.file_name) === "uploading" && fileSize(item) === localSize));
  const restored = files.some((item) => fileRole(name, item.file_name) === "final")
    ? undefined
    : newest(files.filter((item) => fileRole(name, item.file_name) === "previous" && fileSize(item) === localSize));
  const chosen = exact ?? alias ?? restored;
  if (chosen) {
    if (chosen.file_name !== name) await commitReplacement(cookie, folderId, name, chosen.fid);
    else await deleteFiles(cookie, files.filter((item) => item.fid !== chosen.fid).map((item) => item.fid));
    console.log(`跳过同名同大小 ${name} ${localSize}`);
    return;
  }
  if (reusable && !files.some((item) => item.file_name === name)) {
    await commitReplacement(cookie, folderId, name, reusable.fid);
    console.log(`沿用已上传文件 ${name} ${localSize}`);
    return;
  }
  const orphan = files.find((item) => fileRole(name, item.file_name) === "previous" && !files.some((entry) => fileRole(name, entry.file_name) === "final"));
  if (orphan) await renameFile(cookie, orphan.fid, name);
  await deleteFiles(cookie, files.filter((item) => fileRole(name, item.file_name) === "uploading").map((item) => item.fid));
  const current = orphan ? [] : files.filter((item) => item.file_name === name);
  if (current.length > 1) await deleteFiles(cookie, current.slice(1).map((item) => item.fid));
  console.log(orphan || current.length ? `覆盖已有文件 ${name}` : `上传 ${name}`);
  let fid = "";
  let pending;
  const existingFids = new Set(files.map((item) => item.fid));
  try {
    fid = (await uploadFile(cookie, folderId, source, `${name}.uploading`)).fid ?? "";
  } catch (error) {
    if (error?.reason !== "rename_target_missing") throw error;
    pending = error;
    console.log(`完成确认没有文件编号，改为轮询列表 ${name}`);
  }
  if (!fid) fid = await pollUploaded(cookie, folderId, name, localSize, existingFids);
  if (!fid) throw pending ?? withReason(new QuarkFailure(`上传后没有文件编号：${name}`), "rename_target_missing");
  console.log(`按文件编号重命名 ${name}`);
  await commitReplacement(cookie, folderId, name, fid);
}

async function retainLatest(cookie, folderId, version) {
  const entries = knownFiles(await listChildren(cookie, folderId)).filter((item) => installerVersion(item.file_name));
  const versions = [...new Set(entries.map((item) => installerVersion(item.file_name)))].sort(compareSemver).reverse();
  const keep = new Set(versions.slice(0, 1));
  const remove = entries.filter((item) => !keep.has(installerVersion(item.file_name)));
  await deleteFiles(cookie, remove.map((item) => item.fid));
  for (const item of remove) console.log(`删除旧版本 ${item.file_name}`);
  console.log(`保留版本 ${[...keep].join("、") || version}`);
}

async function main() {
  const cookie = readCookie();
  await assertCookie(cookie);
  const directory = resolve(process.argv[2] ?? "");
  const version = String(process.argv[3] ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new QuarkFailure("需要安装包目录和版本号，例如 1.2.3");
  const present = new Set(readdirSync(directory));
  const names = expectedInstallers(version);
  const missing = names.filter((name) => !present.has(name));
  if (missing.length) throw new QuarkFailure(`缺少安装包：${missing.join("、")}`);
  const folderId = await ensureFolder(cookie, FOLDER_NAME);
  for (const name of names) await uploadReplacing(cookie, folderId, join(directory, name), name);
  const noteDir = mkdtempSync(join(tmpdir(), "goose-quark-"));
  const note = join(noteDir, NOTE_NAME);
  writeFileSync(note, noteText(version));
  await uploadReplacing(cookie, folderId, note, NOTE_NAME);
  await retainLatest(cookie, folderId, version);
  logFolder(await listChildren(cookie, folderId));
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `夸克网盘已处理 ${names.length} 个安装包，当前版本 v${version}。\n`);
  console.log(`夸克网盘已处理 ${names.length} 个安装包，当前版本 v${version}。`);
}

function failureReason(error) {
  if (typeof error?.reason === "string" && error.reason) return error.reason;
  const message = String(error?.message ?? "");
  if (message.includes("未配置")) return "not_configured";
  if (message.includes("Cookie 失效")) return "cookie_invalid";
  const status = /HTTP (\d+)/.exec(message)?.[1];
  if (message.includes("分片") && status) return `part_upload_http_${status}`;
  if (message.includes("完成分片") && status) return `complete_upload_http_${status}`;
  if (message.includes("超时")) return "timeout";
  if (message.includes("没有文件编号") || message.includes("未找到临时文件")) return "rename_target_missing";
  if (message.includes("未确认")) return "finish_not_ready";
  if (message.includes("重命名")) return "rename_failed";
  if (message.includes("缺少安装包")) return "missing_installers";
  if (message.includes("版本号")) return "bad_version";
  if (message.includes("网络")) return "network";
  return "upload_failed";
}

function reportFailure(version, error) {
  const safeVersion = /^\d+\.\d+\.\d+$/.test(version) ? version : "unknown";
  const reason = failureReason(error).replace(/\s+/g, "_");
  const line = `QUARK_UPLOAD_FAILED version=${safeVersion} reason=${reason}`;
  console.error(line);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `${line}\n`);
  const message = error instanceof Error ? error.message : "夸克上传失败";
  if (message !== line) console.error(message);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let version = String(process.argv[3] ?? "").replace(/^v/, "");
  if (!/^\d+\.\d+\.\d+$/.test(version)) version = "unknown";
  try {
    await main();
  } catch (error) {
    reportFailure(version, error);
    process.exit(1);
  }
}
