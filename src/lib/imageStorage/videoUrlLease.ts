import { getGooseDesktop } from "@/lib/electron/runtime";
import { videoStorage } from "@/lib/videoStorage";
import { isLocalFilePath, resolveToAbsolute } from "./strategies/file-system";

export interface ResolvedUrlLease {
  url: string;
  release: () => void;
}
interface Entry {
  users: number;
  promise: Promise<string>;
  url?: string;
}
const active = new Map<string, Entry>();

export async function acquireVideoRefToUrl(
  ref: string,
  pageLocalFilePath?: string | null,
): Promise<ResolvedUrlLease> {
  if (/^(https?:|data:|blob:)/.test(ref)) return { url: ref, release: () => {} };
  let path = ref;
  let version = "";
  if (isLocalFilePath(ref)) {
    const absolute = ref.startsWith("/") || /^[A-Za-z]:[\\/]/.test(ref);
    if (!absolute && !pageLocalFilePath) return { url: ref, release: () => {} };
    path = absolute ? ref : resolveToAbsolute(pageLocalFilePath!.replace(/[\\/][^\\/]+$/, ""), ref);
    try {
      const stat = await getGooseDesktop()?.fsStat(path);
      version = stat ? `${stat.size}:${stat.mtimeMs}` : crypto.randomUUID();
    } catch {
      version = crypto.randomUUID();
    }
  }
  const key = `${path}\n${version}`;
  let entry = active.get(key);
  if (!entry) {
    const created: Entry = { users: 0, promise: Promise.resolve(ref) };
    created.promise = videoStorage.load(path, pageLocalFilePath).then(blob => {
      if (!blob) {
        if (active.get(key) === created) active.delete(key);
        return ref;
      }
      const url = URL.createObjectURL(blob);
      if (created.users === 0) URL.revokeObjectURL(url);
      else created.url = url;
      return url;
    }).catch(error => {
      if (active.get(key) === created) active.delete(key);
      throw error;
    });
    entry = created;
    active.set(key, entry);
  }
  entry.users++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    entry.users--;
    if (entry.users === 0) {
      if (active.get(key) === entry) active.delete(key);
      if (entry.url) URL.revokeObjectURL(entry.url);
    }
  };
  try {
    return { url: await entry.promise, release };
  } catch (error) {
    release();
    throw error;
  }
}
