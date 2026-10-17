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
  return `鹅的笔记桌面版安装包。当前版本 v${version}（及上一版）。macOS 选 .dmg（Apple 芯片 arm64 / Intel x64），Windows 选 .exe（x64 / arm64），Linux 选 AppImage / deb / pacman。macOS 首次打开请看 https://github.com/eachann1024/goose-note/blob/main/docs/macos-installation.md 。源码与全部版本：https://github.com/eachann1024/goose-note/releases\n`;
}

function isFile(item, name) {
  return item?.fid && item.file_name === name && item.file !== false && item.dir !== true && item.file_type !== 0;
}

function knownFiles(entries) {
  return entries.filter((item) => isFile(item, item.file_name) && (item.file_name === NOTE_NAME || installerVersion(item.file_name)));
}

function fileSize(item) {
  const size = Number(item?.size);
  return Number.isInteger(size) && size >= 0 ? size : -1;
}

function folderFiles(entries) {
  return entries.filter((item) => item?.fid && item.file_name && item.file !== false && item.dir !== true && item.file_type !== 0);
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
  const tempName = `${name}.uploading`;
  const backupName = `${name}.previous`;
  let entries = await listChildren(cookie, folderId);
  const existing = entries.filter((item) => isFile(item, name));
  if (existing.some((item) => fileSize(item) === localSize)) {
    console.log(`跳过同名同大小 ${name} ${localSize}`);
    return;
  }
  const orphan = entries.find((item) => isFile(item, backupName) && !entries.some((entry) => isFile(entry, name)));
  if (orphan) await renameFile(cookie, orphan.fid, name);
  entries = await listChildren(cookie, folderId);
  const temps = entries.filter((item) => isFile(item, tempName) || (isFile(item, backupName) && entries.some((entry) => isFile(entry, name))));
  if (temps.length) await deleteFiles(cookie, temps.map((item) => item.fid));
  const current = (await listChildren(cookie, folderId)).filter((item) => isFile(item, name));
  console.log(current.length ? `覆盖已有文件 ${name}` : `上传 ${name}`);
  if (current.length > 1) await deleteFiles(cookie, current.slice(1).map((item) => item.fid));
  await uploadFile(cookie, folderId, source, tempName);
  const uploaded = (await listChildren(cookie, folderId)).find((item) => isFile(item, tempName));
  if (!uploaded) throw new QuarkFailure(`上传后未找到临时文件：${name}`);
  const kept = current[0];
  if (kept) await renameFile(cookie, kept.fid, backupName);
  try {
    await renameFile(cookie, uploaded.fid, name);
  } catch (error) {
    if (kept) await renameFile(cookie, kept.fid, name);
    throw error;
  }
  if (kept) await deleteFiles(cookie, [kept.fid]);
}

async function retainLatest(cookie, folderId, version) {
  const entries = knownFiles(await listChildren(cookie, folderId)).filter((item) => installerVersion(item.file_name));
  const versions = [...new Set(entries.map((item) => installerVersion(item.file_name)))].sort(compareSemver).reverse();
  const keep = new Set(versions.slice(0, 2));
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
