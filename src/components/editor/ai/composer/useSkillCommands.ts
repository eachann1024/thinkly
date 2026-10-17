import { useLocale } from "@/i18n";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useReducer,
  type RefObject,
} from "react";
import type { LocalSkill } from "@/lib/notebook-ai/localContext";
import {
  searchComposerSlashItems,
  type ComposerSlashBuiltinId,
  type ComposerSlashItem,
} from "@/lib/notebook-ai/composerSlashCommands";
import { isSuggestionMenuAcceptKey } from "@/components/editor/utils/slashMenuPolicy";
import type { AiSkillCommandAttrs } from "./referenceLookup";

import {
  detectCommandAtCaret,
  type DetectedCommand,
} from "./composerCommandDetection";
import { createSkillChipElement } from "./composerSkillChip";
import {
  pruneEmptyComposerTextNodes,
  ensureComposerCaretAnchors,
  placeCaretAfterNode,
} from "./composerCaret";
export * from "./composerCaret";
export {
  parseSlashCommandBeforeCaret,
  getComposerCaretTextContext,
} from "./composerCommandDetection";
export { createSkillChipElement } from "./composerSkillChip";

import { composerSuggestionReducer, inactiveSuggestion } from "./composerSuggestionState";

function toSkillAttrs(skill: LocalSkill): AiSkillCommandAttrs {
  return {
    name: skill.name,
    path: skill.path,
    description: skill.description,
  };
}

export function useSkillCommands(options: {
  editorRef: RefObject<HTMLDivElement | null>;
  isComposingRef: RefObject<boolean>;
  notebookId?: string;
  enabled: boolean;
  includeSkills: boolean;
  onContentMutation: () => void;
  onBuiltinCommand?: (id: ComposerSlashBuiltinId) => void;
}) {
  const locale = useLocale();
  const {
    editorRef,
    isComposingRef,
    notebookId,
    enabled,
    includeSkills,
    onContentMutation,
    onBuiltinCommand,
  } = options;
  const lastDetectedRef = useRef<DetectedCommand | null>(null);
  const [command, dispatch] = useReducer(composerSuggestionReducer, inactiveSuggestion);
  const commandQuery = command.phase === "active" ? command.query : "";
  const items = useMemo(
    () =>
      enabled && command.phase === "active"
        ? searchComposerSlashItems(command.query, {
            notebookId,
            includeSkills,
          })
        : [],
    [command.phase, commandQuery, enabled, includeSkills, notebookId, locale],
  );
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const clearCommandState = useCallback(() => {
    lastDetectedRef.current = null;
    dispatch({ type: "cleared" });
  }, []);

  const detectCommand = useCallback(() => {
    if (!enabled) return clearCommandState();
    const editor = editorRef.current;
    if (!editor || isComposingRef.current) return;
    const detected = detectCommandAtCaret(editor);
    if (!detected) return clearCommandState();
    lastDetectedRef.current = detected;
    const rect = detected.range.getBoundingClientRect();
    dispatch({ type: "detected", query: detected.query,
      anchorRect: rect.width || rect.height ? rect : editor.getBoundingClientRect() });
  }, [clearCommandState, editorRef, enabled, isComposingRef]);

  const insertCommand = useCallback(
    (item: ComposerSlashItem) => {
      const editor = editorRef.current;
      const detected =
        lastDetectedRef.current ??
        (editor ? detectCommandAtCaret(editor) : null);
      clearCommandState();

      if (item.kind === "builtin") {
        if (editor && detected) {
          try {
            detected.range.deleteContents();
            if (item.id === "new") {
              editor.replaceChildren();
            }
            pruneEmptyComposerTextNodes(editor);
            ensureComposerCaretAnchors(editor);
            editor.focus({ preventScroll: true });
          } catch {
            // 清掉 /query 失败也不阻断指令执行
          }
          onContentMutation();
        }
        onBuiltinCommand?.(item.id);
        return;
      }

      if (!editor || !detected) return;

      try {
        detected.range.deleteContents();
        // 间距靠 CSS；插入后用 ZWSP 锚点保证旧 Chromium 光标可见。
        const chip = createSkillChipElement(toSkillAttrs(item.skill));
        detected.range.insertNode(chip);
        pruneEmptyComposerTextNodes(editor);
        ensureComposerCaretAnchors(editor);
        editor.focus({ preventScroll: true });
        placeCaretAfterNode(chip);
      } catch {
        return;
      }

      onContentMutation();
    },
    [clearCommandState, editorRef, onBuiltinCommand, onContentMutation],
  );

  const handleCommandKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (command.phase !== "active") return false;
      const currentItems = itemsRef.current;
      const count = Math.max(1, currentItems.length);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        dispatch({ type: "navigated", delta, count });
        return true;
      }
      if (isSuggestionMenuAcceptKey(event)) {
        const item = currentItems[command.activeIndex];
        if (!item) {
          if (event.key === "Tab") {
            event.preventDefault();
            return true;
          }
          clearCommandState();
          return false;
        }
        event.preventDefault();
        insertCommand(item);
        return true;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        clearCommandState();
        return true;
      }
      return false;
    },
    [clearCommandState, command, insertCommand],
  );

  return {
    command,
    items,
    detectCommand,
    insertCommand,
    handleCommandKeyDown,
    clearCommandState,
  };
}
