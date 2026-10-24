export async function restoreImportedHistory(history: Record<string, any>, importedPageIdMap: Map<string, string>) {
    if (history) {
      const { resolveHistoryBackend } = await import("@/lib/history/backend");
      const { selectEvictedVersionIds } = await import(
        "@/lib/history/retention"
      );

      for (const [sourcePageId, historyItem] of Object.entries(
        history,
      ) as [string, any][]) {
        try {
          const pageId = importedPageIdMap.get(sourcePageId) ?? sourcePageId;
          const backend = resolveHistoryBackend(pageId);
          const localIndex = await backend.loadIndex(pageId);
          const importedIndex = historyItem.index;
          const importedVersions = historyItem.versions || [];

          if (!importedIndex) continue;

          const versionMap = new Map<string, any>();

          if (localIndex && Array.isArray(localIndex.versions)) {
            for (const v of localIndex.versions) {
              versionMap.set(v.versionId, v);
            }
          }
          if (Array.isArray(importedIndex.versions)) {
            for (const v of importedIndex.versions) {
              versionMap.set(v.versionId, v);
            }
          }

          let mergedVersions = Array.from(versionMap.values()).sort(
            (a, b) => a.createdAt - b.createdAt,
          );

          const evictedVersionIds = selectEvictedVersionIds(mergedVersions);
          if (evictedVersionIds.length > 0) {
            const evictedSet = new Set(evictedVersionIds);
            mergedVersions = mergedVersions.filter(
              (v) => !evictedSet.has(v.versionId),
            );
          }

          const lastVersionCharCount =
            mergedVersions.length > 0
              ? mergedVersions[mergedVersions.length - 1].charCount
              : 0;

          await backend.saveIndex({
            pageId,
            versions: mergedVersions,
            lastVersionCharCount,
          });

          if (Array.isArray(importedVersions)) {
            const activeVersionIds = new Set(
              mergedVersions.map((v) => v.versionId),
            );
            for (const version of importedVersions) {
              if (activeVersionIds.has(version.versionId)) {
                await backend.saveVersion({ ...version, pageId });
              }
            }
          }

          for (const evictedId of evictedVersionIds) {
            await backend.removeVersion(pageId, evictedId);
          }
        } catch (err) {
          console.error(
            `Failed to restore and merge history for page ${sourcePageId}:`,
            err,
          );
        }
      }
    }

}
