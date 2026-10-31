import { t } from "./i18n/gitErrors";
import path from "node:path";
import { createHash } from "node:crypto";
import { groupNoteFiles, noteGroupSignature, noteGroupPreview, forkNoteGroup } from "./gitNoteMetadata";
import type { GitRepositoryFolder } from "../../src/lib/git-sync-contract";
import { recordGitConflict, type GitSyncConflict } from "./gitSyncConflict";

type Files = Record<string, string>;
interface ConflictContext {
  repositoryId: string;
  identity: string;
  folder: GitRepositoryFolder;
  active: Set<string>;
  unresolved: GitSyncConflict[];
  // After an interruption, content equal to base may be an intentional user revert.
  recovering?: boolean;
}
const own = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const fold = (value: string) => value.normalize("NFC").toLowerCase();
type ReservedPaths = { files: Set<string>; directories: Set<string> };
const parents = (name: string) => name.split("/").slice(0, -1).map((_part, index, parts) => parts.slice(0, index + 1).join("/"));
function reservePath(paths: ReservedPaths, name: string) {
  const folded = fold(name);
  paths.files.add(folded);
  for (const parent of parents(folded)) paths.directories.add(parent);
}
function remoteCopy(name: string, reserved: ReservedPaths) {
  const extension = path.posix.extname(name), stem = name.slice(0, name.length - extension.length);
  for (let index = 1; index < 10000; index++) {
    const candidate = `${stem} (远端副本${index === 1 ? "" : ` ${index}`})${extension}`;
    const folded = fold(candidate);
    if (!reserved.files.has(folded) && !reserved.directories.has(folded) && !parents(folded).some(parent => reserved.files.has(parent))) {
      reservePath(reserved, candidate);
      return candidate;
    }
  }
  throw new Error(t("uniqueName"));
}

export function reconcileFiles(base: Files | undefined, local: Files, remote: Files, context?: ConflictContext): Files {
  const merged: Files = Object.create(null);
  const names = new Set([...Object.keys(base ?? {}), ...Object.keys(local), ...Object.keys(remote)]);
  const reserved: ReservedPaths = { files: new Set(), directories: new Set() };
  for (const name of names) reservePath(reserved, name);
  const remainingBase = base ? { ...base } : undefined;
  const remainingLocal = { ...local }, remainingRemote = { ...remote };
  for (const group of groupNoteFiles(base, local, remote)) {
    for (const name of Object.keys(group.base ?? {})) delete remainingBase?.[name];
    for (const name of Object.keys(group.local)) delete remainingLocal[name];
    for (const name of Object.keys(group.remote)) delete remainingRemote[name];
    const b = noteGroupSignature(group.base), l = noteGroupSignature(group.local), r = noteGroupSignature(group.remote);
    let selected: Files;
    if (l === r) selected = group.local;
    else if (l === b && !context?.recovering) selected = group.remote;
    else if (r === b) selected = group.local;
    else {
      if (!context) throw new Error(t("resolveFirst"));
      const lp = noteGroupPreview(group.local), rp = noteGroupPreview(group.remote);
      const fingerprint = createHash("sha256").update(l).update("\0").update(r).digest("hex");
      const conflict = recordGitConflict(context.repositoryId, `${context.identity}:${fingerprint}`, context.folder, lp.name ?? rp.name ?? [...group.names][0]!, lp.bytes, rp.bytes);
      context.active.add(conflict.info.id);
      selected = conflict.choice === "remote" ? group.remote : group.local;
      if (!conflict.choice) context.unresolved.push(conflict.info);
      else if (conflict.choice === "both") {
        if (!lp.bytes || !rp.bytes) throw new Error(t("oneDeleted"));
        Object.assign(merged, forkNoteGroup(group.remote, group.id, remoteCopy(rp.name!, reserved)));
      }
    }
    for (const [name, bytes] of Object.entries(selected)) {
      if (merged[name] !== undefined && merged[name] !== bytes) throw new Error(t("pathTypeConflict"));
      merged[name] = bytes;
    }
  }
  for (const name of names) {
    if (!own(remainingBase ?? {}, name) && !own(remainingLocal, name) && !own(remainingRemote, name)) continue;
    const b = remainingBase?.[name], l = remainingLocal[name], r = remainingRemote[name];
    let value: string | undefined;
    if (l === r) value = l;
    else if (remainingBase && r === b) value = l;
    else if (!context?.recovering && (!remainingBase || !own(remainingBase, name)) && (l === undefined || r === undefined)) value = l ?? r;
    else if (!context?.recovering && remainingBase && own(remainingBase, name) && l === b) value = r;
    else {
      if (!context) throw new Error(t("resolveFirst"));
      const conflict = recordGitConflict(context.repositoryId, context.identity, context.folder, name, l, r);
      context.active.add(conflict.info.id);
      if (!conflict.choice) {
        context.unresolved.push(conflict.info);
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
    if (value !== undefined && merged[name] !== undefined && merged[name] !== value) {
      if (!context) throw new Error(t("resolveFirst"));
      const conflict = recordGitConflict(context.repositoryId, `${context.identity}:overlap:${name}`, context.folder, name, merged[name], value);
      context.active.add(conflict.info.id);
      if (!conflict.choice) context.unresolved.push(conflict.info);
      else if (conflict.choice === "remote") merged[name] = value;
      else if (conflict.choice === "both") merged[remoteCopy(name, reserved)] = value;
    } else if (value !== undefined) merged[name] = value;
  }
  return merged;
}
