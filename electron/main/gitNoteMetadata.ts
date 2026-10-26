import { createHash, randomUUID } from "node:crypto";
import { readIdentity, withoutIdentity } from "../../src/lib/note-metadata/identity";
import { parseEnvelope } from "../../src/lib/note-metadata/validate";
import type { NoteMetadataEnvelope, NoteMetadataSnapshot } from "../../src/lib/note-metadata/contract";

type Files = Record<string, string>;
const encode = (value: string) => Buffer.from(value).toString("base64");
const decode = (value: string) => Buffer.from(value, "base64").toString("utf8");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const metadataName = (id: string) => `.goose/metadata/${hash(id)}.json`;
const visibleMarkdown = (name: string) => /\.(md|markdown)$/i.test(name) && !name.split("/").some(part => part.startsWith("."));
const sameText = (a: string, b: string) => a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");
const snapshots = (envelope: NoteMetadataEnvelope) => [envelope.current, envelope.previous, envelope.recovery, ...(envelope.recoveries ?? [])];

export type NoteFileGroup = { id: string; names: Set<string>; base?: Files; local: Files; remote: Files };

type Identities = { ids: Map<string, string | undefined>; owners: Map<string, string> };
function identify(files: Files): Identities {
  const ids = new Map<string, string | undefined>();
  const owners = new Map<string, string>();
  const envelopes: NoteMetadataEnvelope[] = [];
  const claim = (id: string, name: string) => {
    if (owners.has(name) && owners.get(name) !== id || ids.get(id) && ids.get(id) !== name) {
      throw new Error(`Duplicate note identity: ${name}`);
    }
    owners.set(name, id);
    ids.set(id, name);
  };
  for (const [name, bytes] of Object.entries(files)) {
    if (!/^\.goose\/metadata\/[a-f0-9]{64}\.json$/.test(name)) continue;
    const raw = JSON.parse(decode(bytes));
    if (typeof raw?.noteId !== "string" || metadataName(raw.noteId) !== name) throw new Error("Metadata filename identity differs");
    const envelope = envelopeFor(files, raw.noteId)!;
    envelopes.push(envelope);
    ids.set(envelope.noteId, undefined);
  }
  for (const envelope of [...envelopes].sort((a, b) => Number(Boolean(a.deleted)) - Number(Boolean(b.deleted)))) {
    const path = envelope.relativePath && files[envelope.relativePath] !== undefined ? envelope.relativePath
      : envelope.previousRelativePath && !files[envelope.relativePath ?? ""] ? envelope.previousRelativePath : undefined;
    if (path && visibleMarkdown(path) && files[path] !== undefined && (!envelope.deleted || !owners.has(path) &&
      snapshots(envelope).some(snapshot => snapshot && sameText(snapshot.markdown, decode(files[path]))))) claim(envelope.noteId, path);
  }
  for (const [name, bytes] of Object.entries(files)) {
    if (!visibleMarkdown(name)) continue;
    const markdown = decode(bytes);
    if (!/^\uFEFF?---[^\S\r\n]*\r?\n/.test(markdown)) continue;
    const id = readIdentity(markdown);
    if (id) claim(id, name);
  }
  const candidates = new Map<string, string[]>();
  for (const envelope of envelopes) {
    if (ids.get(envelope.noteId) || envelope.deleted) continue;
    const matches = Object.entries(files).filter(([name, bytes]) => visibleMarkdown(name) && !owners.has(name)
      && snapshots(envelope).some(snapshot => snapshot && sameText(withoutIdentity(snapshot.markdown), decode(bytes))))
      .map(([name]) => name);
    if (matches.length === 1) {
      const name = matches[0];
      candidates.set(name, [...(candidates.get(name) ?? []), envelope.noteId]);
    }
  }
  for (const [name, matches] of candidates) if (matches.length === 1) claim(matches[0], name);
  return { ids, owners };
}

export function groupNoteFiles(base: Files | undefined, local: Files, remote: Files): NoteFileGroup[] {
  const versions = [base ?? {}, local, remote];
  const identities = versions.map(identify);
  const groups: NoteFileGroup[] = [];
  for (const id of new Set(identities.flatMap(identity => [...identity.ids.keys()]))) {
    const names = new Set(identities.map(identity => identity.ids.get(id)).filter((name): name is string => Boolean(name)));
    names.add(metadataName(id));
    const versionsForId = versions.map((files, index) => {
      const result: Files = Object.create(null);
      for (const name of names) {
        if (files[name] === undefined) continue;
        if (visibleMarkdown(name) && identities[index].owners.get(name) !== id) continue;
        result[name] = files[name];
      }
      return result;
    });
    groups.push({ id, names, base: base ? versionsForId[0] : undefined, local: versionsForId[1], remote: versionsForId[2] });
  }
  return groups;
}

function envelopeFor(files: Files, id: string): NoteMetadataEnvelope | undefined {
  const raw = files[metadataName(id)];
  if (!raw) return undefined;
  const envelope = parseEnvelope(decode(raw), id);
  for (const snapshot of snapshots(envelope)) {
    if (snapshot && hash(snapshot.markdown) !== snapshot.digest) throw new Error("Note metadata checksum mismatch");
  }
  return envelope;
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
  const next = withoutIdentity(markdown);
  const envelope = envelopeFor(files, id);
  const selected = envelope && snapshots(envelope).find(snapshot => snapshot && sameText(withoutIdentity(snapshot.markdown), next));
  if (!envelope) return { [targetName]: encode(next) };
  const cleanSnapshot = (snapshot: NoteMetadataSnapshot): NoteMetadataSnapshot => {
    const clean = withoutIdentity(snapshot.markdown);
    return { ...snapshot, markdown: clean, digest: hash(clean) };
  };
  const newId = randomUUID();
  const nextEnvelope: NoteMetadataEnvelope = {
    version: 1, noteId: newId, revision: randomUUID(), relativePath: targetName,
    current: selected ? { ...selected, markdown: next, digest: hash(next) } : {
      markdown: next, digest: hash(next), meta: null,
      settings: { fontFamily: "default", isLocked: false, isPinned: false, isFavorite: false },
    },
    ...(envelope.recoveries?.length ? { recoveries: envelope.recoveries.map(cleanSnapshot) } : {}),
    ...(!selected ? { previous: cleanSnapshot(envelope.current), recovery: cleanSnapshot(envelope.recovery ?? envelope.previous ?? envelope.current) } : {}),
  };
  return { [targetName]: encode(next), [metadataName(newId)]: encode(JSON.stringify(nextEnvelope) + "\n") };
}
