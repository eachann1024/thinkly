import assert from "node:assert/strict";

export const RELEASE_NOTES_START = "<!-- goose-update-notes:start -->";
export const RELEASE_NOTES_END = "<!-- goose-update-notes:end -->";

export function versionReleaseNotes(changelog, version) {
  assert.match(version, /^\d+\.\d+\.\d+$/, "Expected a stable app version for release notes");
  const lines = changelog.replace(/\r\n?/g, "\n").split("\n");
  const sections = lines.flatMap((line, index) => {
    const heading = /^##[ \t]+(.+?)[ \t]*$/.exec(line);
    return heading?.[1] === version ? [index] : [];
  });
  assert.equal(sections.length, 1, `CHANGELOG.md must contain exactly one ## ${version} section`);
  const start = sections[0] + 1;
  const next = lines.findIndex((line, index) => index >= start && /^#{1,2}(?:[ \t]|$)/.test(line));
  const notes = lines.slice(start, next < 0 ? undefined : next).join("\n").trim();
  assert.ok(notes, `CHANGELOG.md has no release notes for ${version}`);
  assert.ok(!notes.includes(RELEASE_NOTES_START) && !notes.includes(RELEASE_NOTES_END),
    "CHANGELOG.md must not contain release-note markers");
  return notes;
}

export function markedReleaseNotes(notes) {
  return `${RELEASE_NOTES_START}\n${notes.trim()}\n${RELEASE_NOTES_END}`;
}

export function publishedReleaseNotes(body) {
  if (typeof body !== "string") return "";
  const start = body.indexOf(RELEASE_NOTES_START);
  if (start < 0) return "";
  const contentStart = start + RELEASE_NOTES_START.length;
  const end = body.indexOf(RELEASE_NOTES_END, contentStart);
  if (end < 0 || body.indexOf(RELEASE_NOTES_START, contentStart) >= 0
    || body.indexOf(RELEASE_NOTES_END, end + RELEASE_NOTES_END.length) >= 0) return "";
  return body.slice(contentStart, end).trim();
}
