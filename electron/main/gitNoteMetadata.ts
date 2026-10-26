import { createHash, randomUUID } from "node:crypto";
import { readIdentity, renderFrontmatter, splitFrontmatter } from "../../src/lib/note-metadata/identity";
import { parseEnvelope } from "../../src/lib/note-metadata/validate";
import type { NoteMetadataEnvelope } from "../../src/lib/note-metadata/contract";

type Files = Record<string, string>;
const encode = (value: string) => Buffer.from(value).toString("base64");
const decode = (value: string) => Buffer.from(value, "base64").toString("utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const metadataName = (id: string) => `.goose/metadata/${hash(id)}.json`;
const visibleMarkdown = (name: string) => /\.(md|markdown)$/i.test(name) && !name.split("/").some(part => part.startsWith("."));
const sameText = (a: string, b: string) => a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");

export type NoteFileGroup = { id: string; names: Set<string>; base?: Files; local: Files; remote: Files };

export function groupNoteFiles(base: Files | undefined, local: Files, remote: Files): NoteFileGroup[] {
  const versions = [base ?? {}, local, remote];
  const identities = versions.map(files => {
    const ids = new Map<string, string>();
    for (const [name, bytes] of Object.entries(files)) {
      if (!visibleMarkdown(name)) continue;
      const markdown = decode(bytes);
      if (!/^\uFEFF?---[^\S\r\n]*\r?\n/.test(markdown)) continue;
      const id = readIdentity(markdown);
      if (!id) continue;
      if (ids.has(id)) throw new Error(`Duplicate note identity: ${name}`);
      ids.set(id, name);
    }
    return ids;
  });
  const groups: NoteFileGroup[] = [];
  for (const id of new Set(identities.flatMap(ids => [...ids.keys()]))) {
    const names = new Set(identities.map(ids => ids.get(id)).filter((name): name is string => Boolean(name)));
    names.add(metadataName(id));
    const snapshots = versions.map((files, index) => {
      const result: Files = Object.create(null);
      for (const name of names) {
        if (files[name] === undefined) continue;
        if (visibleMarkdown(name) && identities[index].get(id) !== name) {
          const otherId = readIdentity(decode(files[name]));
          if (otherId && otherId !== id) throw new Error(`Note identity changed at ${name}`);
        }
        result[name] = files[name];
      }
      validateNoteGroup(result, id);
      return result;
    });
    groups.push({ id, names, base: base ? snapshots[0] : undefined, local: snapshots[1], remote: snapshots[2] });
  }
  return groups;
}

function envelopeFor(files: Files, id: string): NoteMetadataEnvelope | undefined {
  const raw = files[metadataName(id)];
  if (!raw) return undefined;
  const envelope = parseEnvelope(decode(raw), id);
  for (const snapshot of [envelope.current, envelope.previous]) {
    if (snapshot && hash(snapshot.markdown) !== snapshot.digest) throw new Error("Note metadata checksum mismatch");
  }
  return envelope;
}

function validateNoteGroup(files: Files, id: string) {
  const envelope = envelopeFor(files, id);
  for (const [name, bytes] of Object.entries(files)) {
    if (!visibleMarkdown(name)) continue;
    const markdown = decode(bytes);
    if (!readIdentity(markdown)) continue;
    if (!envelope || ![envelope.current, envelope.previous].some(snapshot => snapshot && sameText(snapshot.markdown, markdown))) {
      throw new Error(`Note and hidden metadata do not match: ${name}`);
    }
  }
}

export function noteGroupSignature(files?: Files): string {
  return JSON.stringify(Object.entries(files ?? {}).sort(([a], [b]) => a.localeCompare(b)));
}

export function noteGroupPreview(files: Files): { name?: string; bytes?: string } {
  const entry = Object.entries(files).find(([name]) => visibleMarkdown(name));
  return entry ? { name: entry[0], bytes: entry[1] } : {};
}

export function forkNoteGroup(files: Files, id: string, targetName: string): Files {
  const preview = noteGroupPreview(files);
  if (!preview.bytes) throw new Error("Cannot copy a deleted note");
  const markdown = decode(preview.bytes);
  if (!readIdentity(markdown)) return { [targetName]: preview.bytes };
  const envelope = envelopeFor(files, id)!;
  const selected = [envelope.current, envelope.previous].find(snapshot => snapshot && sameText(snapshot.markdown, markdown));
  if (!selected) throw new Error("Cannot copy mismatched note metadata");
  const newId = randomUUID();
  const { document, tail, present } = splitFrontmatter(markdown);
  document.set("goose-id", newId);
  const next = renderFrontmatter(document, tail, present);
  const nextEnvelope: NoteMetadataEnvelope = {
    version: 1, noteId: newId, revision: randomUUID(),
    current: { ...selected, markdown: next, digest: hash(next) },
  };
  return { [targetName]: encode(next), [metadataName(newId)]: encode(JSON.stringify(nextEnvelope) + "\n") };
}
