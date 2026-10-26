import JSZip from "jszip";
import { BACKUP_LIMITS, decodeText, fail, type BackupFiles } from "./contract";
import { assertDistinctPaths, safeRelativePath } from "./paths";

type Entry = { name: string; size: number; crc: number };
function checkExtras(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset < bytes.length;) {
    if (offset + 4 > bytes.length) fail("Invalid ZIP extra data");
    const id = view.getUint16(offset, true);
    const length = view.getUint16(offset + 2, true);
    if (![0x7075, 0x6375].includes(id) || offset + 4 + length > bytes.length) fail("Unsupported ZIP extra data");
    offset += 4 + length;
  }
}
const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function inspect(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  if (end < 0 || view.getUint32(end, true) !== 0x06054b50 || view.getUint16(end + 20, true)) fail("Invalid ZIP end record");
  const count = view.getUint16(end + 10, true);
  const offset = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true)
    || view.getUint16(end + 8, true) !== count || count > BACKUP_LIMITS.entries + 1
    || offset + view.getUint32(end + 12, true) !== end) fail("Unsupported ZIP layout");
  const entries: Entry[] = [];
  let cursor = offset;
  let localCursor = 0;
  let total = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) fail("Invalid ZIP directory");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressed = view.getUint32(cursor + 20, true);
    const size = view.getUint32(cursor + 24, true);
    const nameSize = view.getUint16(cursor + 28, true);
    const extraSize = view.getUint16(cursor + 30, true);
    const commentSize = view.getUint16(cursor + 32, true);
    const attributes = view.getUint32(cursor + 38, true);
    const local = view.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameSize + extraSize + commentSize;
    if (next > end || view.getUint16(cursor + 34, true) || flags & ~0x800
      || ![0, 8].includes(method) || size > BACKUP_LIMITS.fileBytes || local !== localCursor
      || attributes & 0x10 || ![0, 0x8000].includes((attributes >>> 16) & 0xf000)) fail("Unsupported ZIP entry");
    const name = decodeText(bytes.subarray(cursor + 46, cursor + 46 + nameSize));
    checkExtras(bytes.subarray(cursor + 46 + nameSize, cursor + 46 + nameSize + extraSize));
    if (!safeRelativePath(name) || name.endsWith("/") || !(flags & 0x800) && /[^\x00-\x7f]/.test(name)) fail("Unsafe ZIP path");
    total += size;
    if (total > BACKUP_LIMITS.totalBytes) fail("ZIP exceeds extraction budget");
    if (local + 30 > offset || view.getUint32(local, true) !== 0x04034b50
      || view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method
      || view.getUint32(local + 14, true) !== view.getUint32(cursor + 16, true)
      || view.getUint32(local + 18, true) !== compressed || view.getUint32(local + 22, true) !== size
      || view.getUint16(local + 26, true) !== nameSize) fail("Invalid ZIP local entry");
    const localExtra = view.getUint16(local + 28, true);
    if (local + 30 + nameSize + localExtra > offset) fail("Invalid ZIP local entry");
    checkExtras(bytes.subarray(local + 30 + nameSize, local + 30 + nameSize + localExtra));
    if (decodeText(bytes.subarray(local + 30, local + 30 + nameSize)) !== name) fail("ZIP paths disagree");
    localCursor = local + 30 + nameSize + localExtra + compressed;
    if (localCursor > offset) fail("Overlapping ZIP entries");
    entries.push({ name, size, crc: view.getUint32(cursor + 16, true) });
    cursor = next;
  }
  if (cursor !== end || localCursor !== offset) fail("Unaccounted ZIP data");
  assertDistinctPaths(entries.map((entry) => entry.name));
  return entries;
}

function extract(zip: JSZip, entry: Entry): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    let crc = 0xffffffff;
    const file = zip.file(entry.name)! as JSZip.JSZipObject & {
      internalStream(type: "uint8array"): JSZip.JSZipStreamHelper<Uint8Array>;
    };
    const stream = file.internalStream("uint8array");
    stream.on("data", (chunk: Uint8Array) => {
      size += chunk.length;
      if (size > entry.size || size > BACKUP_LIMITS.fileBytes) {
        stream.pause(); reject(new Error("Notebook backup: ZIP exceeds declared size")); return;
      }
      for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
      chunks.push(chunk);
    }).on("error", reject).on("end", () => {
      if (size !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) {
        reject(new Error("Notebook backup: ZIP checksum differs")); return;
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      resolve(bytes);
    }).resume();
  });
}

export async function readBackupArchive(blob: Blob): Promise<BackupFiles> {
  if (blob.size > BACKUP_LIMITS.archiveBytes) fail("Backup archive is too large");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = inspect(bytes);
  const zip = await JSZip.loadAsync(bytes, { createFolders: false });
  const files: BackupFiles = new Map();
  for (const entry of entries) {
    const file = zip.file(entry.name);
    if (!file || file.unsafeOriginalName !== entry.name) fail("ZIP decoded paths disagree");
    files.set(entry.name, await extract(zip, entry));
  }
  return files;
}
