import { useEffect, useState } from "react";
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
  const pages = usePages((state) => state.pages);
  const notebooks = useNotebooks((state) => state.notebooks);
  const notebookId = useNotebooks((state) => state.activeNotebookId);

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
        // An unavailable host reader must not prevent opening settings.
      }
      try {
        hasLocalSkills = getLocalSkills(undefined, true).some((skill) =>
          Boolean(skill.content.trim()),
        );
      } catch {
        // Only offer controls for content the assistant can actually read.
      }
      setAvailability({ hasGlobalPrompt, hasLocalSkills });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [active, notebookId, notebooks, pages]);

  return active ? availability : EMPTY;
}
