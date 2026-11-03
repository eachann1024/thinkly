import { compareSemver, parseReleaseTag } from "@/lib/appUpdateRelease";
import type { AppUpdateState } from "@/lib/appUpdateTypes";

const bundledChangelogs = import.meta.glob<string>("../../../CHANGELOG.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const bundledChangelog = bundledChangelogs["../../../CHANGELOG.md"] ?? "";

function versionNotes(markdown: string, version: string): string {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const start = lines.findIndex((line) => {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    return heading && parseReleaseTag(heading[1])?.version === version;
  });
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

const NOTES_START = "<!-- goose-update-notes:start -->";
const NOTES_END = "<!-- goose-update-notes:end -->";

// Older feeds may carry the whole Release body; keep only the changelog between the markers.
function markedNotes(body: string): string {
  const start = body.indexOf(NOTES_START);
  if (start < 0) return body;
  const end = body.indexOf(NOTES_END, start);
  return (end < 0 ? body.slice(start + NOTES_START.length) : body.slice(start + NOTES_START.length, end)).trim();
}

export function selectUpdateNotes(currentVersion: string, state: AppUpdateState) {
  const current = parseReleaseTag(currentVersion)?.version ?? currentVersion;
  const remote = state.version ? parseReleaseTag(state.version)?.version : undefined;
  if (remote && compareSemver(remote, current) >= 0) {
    const remoteNotes = markedNotes(state.releaseNotes?.trim() || "");
    return {
      version: remote,
      notes: remoteNotes
        ? versionNotes(remoteNotes, remote) || remoteNotes
        : remote === current ? versionNotes(bundledChangelog, current) : "",
      publishedAt: state.publishedAt,
    };
  }
  return { version: current, notes: versionNotes(bundledChangelog, current), publishedAt: undefined };
}
