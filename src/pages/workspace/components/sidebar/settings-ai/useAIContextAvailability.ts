import { useEffect, useMemo, useState } from "react";
import { createAIContextPagesRevision } from "./aiContextPagesRevision";
import {
  getLocalSkills,
  readGlobalAgentsPrompt,
} from "@/lib/notebook-ai/localContext";
import { useNotebooks } from "@/stores/useNotebooks";
import { usePages } from "@/stores/usePages";

export interface AIContextAvailability {
  hasGlobalPrompt: boolean;
  hasLocalSkills: boolean;
}
const EMPTY: AIContextAvailability = {
  hasGlobalPrompt: false,
  hasLocalSkills: false,
};

export function useAIContextAvailability(
  active: boolean,
): AIContextAvailability {
  const [availability, setAvailability] = useState(EMPTY);
  const notebookId = useNotebooks((state) => active ? state.activeNotebookId : null);
  const notebookConfig = useNotebooks((state) => {
    const notebook = notebookId ? state.notebooks[notebookId] : undefined;
    return JSON.stringify([notebook?.source, notebook?.localPath]);
  });
  const selectSkillRevision = useMemo(() => createAIContextPagesRevision(notebookId), [notebookId]);
  const skillRevision = usePages(selectSkillRevision);

  useEffect(() => {
    if (!active) {
      setAvailability(EMPTY);
      return;
    }
    const refresh = () => {
      let hasGlobalPrompt = false;
      let hasLocalSkills = false;
      try {
        hasGlobalPrompt = Boolean(readGlobalAgentsPrompt());
      } catch {
      }
      try {
        hasLocalSkills = getLocalSkills(undefined, true).some((skill) =>
          Boolean(skill.content.trim()),
        );
      } catch {
      }
      setAvailability({ hasGlobalPrompt, hasLocalSkills });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [active, notebookId, notebookConfig, skillRevision]);

  return active ? availability : EMPTY;
}
