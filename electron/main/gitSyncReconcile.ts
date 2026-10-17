import { t } from "./i18n/gitErrors";
import path from "node:path";
import type { GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { recordGitConflict, type GitSyncConflict } from "./gitSyncConflict";

type Files = Record<string, string>;
interface ConflictContext {
  repositoryId: string;
  identity: string;
  folder: GitRepositoryFolder;
  active: Set<string>;
  unresolved: GitSyncConflict[];
}
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const fold = (value: string) => value.normalize("NFC").toLowerCase();
function remoteCopy(name: string, reserved: Set<string>) {
  const extension = path.posix.extname(name), stem = name.slice(0, name.length - extension.length);
  for (let index = 1; index < 10000; index++) {
    const candidate = `${stem} (远端副本${index === 1 ? "" : ` ${index}`})${extension}`;
    const folded = fold(candidate);
    if (![...reserved].some((existing) => existing === folded || existing.startsWith(`${folded}/`) || folded.startsWith(`${existing}/`))) {
      reserved.add(folded);
      return candidate;
    }
  }
  throw new Error(t("uniqueName"));
}

/** A missing baseline means first attach: absence locally must not delete remote files. */
export function reconcileFiles(base: Files | undefined, local: Files, remote: Files, context?: ConflictContext): Files {
  const merged: Files = Object.create(null);
  const names = new Set([...Object.keys(base ?? {}), ...Object.keys(local), ...Object.keys(remote)]);
  const reserved = new Set([...names].map(fold));
  for (const name of names) {
    const b = base?.[name], l = local[name], r = remote[name];
    let value: string | undefined;
    if (l === r) value = l;
    else if ((!base || !own(base, name)) && (l === undefined || r === undefined)) value = l ?? r;
    else if (base && own(base, name) && l === b) value = r;
    else if (base && own(base, name) && r === b) value = l;
    else {
      if (!context) throw new Error(t("resolveFirst"));
      const conflict = recordGitConflict(context.repositoryId, context.identity, context.folder, name, l, r);
      context.active.add(conflict.info.id);
      if (!conflict.choice) {
        context.unresolved.push(conflict.info);
        // Placeholder never reaches the write transaction while conflicts remain.
        value = l;
      } else if (conflict.choice === "remote") value = r;
      else {
        value = l;
        if (conflict.choice === "both") {
          if (l === undefined || r === undefined) throw new Error(t("oneDeleted"));
          merged[remoteCopy(name, reserved)] = r;
        }
      }
    }
    if (value !== undefined) merged[name] = value;
  }
  return merged;
}
