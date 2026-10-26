import type {
  GitConflictResolution,
  GitSyncConflict,
} from "@/lib/git-sync-contract";

export type GitConflictChoices = Record<
  string,
  GitConflictResolution["choice"]
>;
const drafts = new Map<string, GitConflictChoices>();
const storageKey = (repositoryId: string) =>
  `thinkly:git-conflict-choices:${repositoryId}`;

export function readGitConflictChoices(
  repositoryId: string,
): GitConflictChoices {
  if (drafts.has(repositoryId)) return drafts.get(repositoryId)!;
  let choices: GitConflictChoices = {};
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(storageKey(repositoryId)) ?? "{}",
    );
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      choices = Object.fromEntries(
        Object.entries(saved).filter(([, choice]) =>
          ["local", "remote", "both"].includes(choice),
        ),
      );
    }
  } catch {}
  drafts.set(repositoryId, choices);
  return choices;
}

export function writeGitConflictChoices(
  repositoryId: string,
  choices: GitConflictChoices,
) {
  drafts.set(repositoryId, choices);
  try {
    sessionStorage.setItem(storageKey(repositoryId), JSON.stringify(choices));
  } catch {}
}

export function selectedGitConflictChoices(
  conflicts: GitSyncConflict[],
  choices: GitConflictChoices,
) {
  return conflicts.flatMap((conflict) => {
    const choice = choices[conflict.id];
    if (
      !choice ||
      (choice === "both" && (!conflict.localExists || !conflict.remoteExists))
    )
      return [];
    return [{ conflictId: conflict.id, choice }];
  });
}
