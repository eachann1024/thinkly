import { Textarea } from "@/components/ui/textarea";
import { mergeCSSClasses } from "@blocknote/core";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { GoosePromptActions } from "./GoosePromptActions";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/GoosePromptSuggestionMenu.tsx#messages:1">`
zh-Hans:
  aiRewriteInstructions: "AI 改写要求"
  thinking: "思考中"
en:
  aiRewriteInstructions: "AI rewrite instructions"
  thinking: "Thinking"
ja:
  aiRewriteInstructions: "AI 書き換えの指示"
  thinking: "考え中"
`;
const t = createTranslator(messages);


export type GooseAiMenuTag = {
  key: string;
  label: string;
  onClick: () => void;
};

export type GoosePromptSuggestionMenuProps = {
  onManualPromptSubmit: (userPrompt: string) => void;
  promptText?: string;
  onPromptTextChange?: (userPrompt: string) => void;
  icon?: ReactNode;
  rightSection?: ReactNode;
  placeholder?: string;
  disabled?: boolean;
  busy?: boolean;
  busyTickerText?: string;
  tags?: GooseAiMenuTag[];
  actionMenus?: { label: string; actions: GooseAiMenuTag[] }[];
  showSubmit?: boolean;
  showPlus?: boolean;
  onOpenAiPanel?: () => void;
  maxAutoHeightPx?: number;
};

export function GoosePromptSuggestionMenu(
  props: GoosePromptSuggestionMenuProps,
) {
  useLocale();
  const {
    onManualPromptSubmit,
    promptText,
    onPromptTextChange,
    disabled,
    maxAutoHeightPx,
  } = props;

  const [internalPromptText, setInternalPromptText] = useState("");
  const promptTextToUse = promptText ?? internalPromptText;
  const isComposingRef = useRef(false);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.currentTarget.value;
      if (onPromptTextChange) {
        onPromptTextChange(newValue);
      }
      if (promptText === undefined) {
        setInternalPromptText(newValue);
      }
    },
    [onPromptTextChange, promptText],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (
        isComposingRef.current ||
        event.nativeEvent.isComposing ||
        event.nativeEvent.keyCode === 229
      ) {
        event.stopPropagation();
        return;
      }
      if (event.key !== "Enter") return;
      event.stopPropagation();
      if (event.shiftKey) return;
      event.preventDefault();
      if (disabled || event.repeat) return;
      const value = event.currentTarget.value;
      if (value.trim()) onManualPromptSubmit(value);
    },
    [disabled, onManualPromptSubmit],
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasDisabledRef = useRef(disabled);

  useLayoutEffect(() => {
    const input = textareaRef.current;
    const wasDisabled = wasDisabledRef.current;
    wasDisabledRef.current = disabled;
    if (!input || disabled) return;
    const active = document.activeElement;
    if (
      wasDisabled &&
      active !== document.body &&
      !input.closest(".goose-ai-prompt-menu")?.parentElement?.contains(active)
    )
      return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [disabled]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const resize = () => {
      const style = getComputedStyle(el);
      const minHeight = Number.parseFloat(style.minHeight) || 36;
      const maxHeight = Math.max(
        minHeight,
        maxAutoHeightPx ??
          (Number.parseFloat(style.maxHeight) || minHeight * 3),
      );
      el.style.height = "0px";
      const measured = props.busy ? minHeight : el.scrollHeight;
      el.style.height = `${Math.min(Math.max(measured, minHeight), maxHeight)}px`;
      el.style.overflowY = measured > maxHeight ? "auto" : "hidden";
    };
    resize();
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    promptTextToUse,
    disabled,
    maxAutoHeightPx,
    props.placeholder,
    props.busy,
    props.busyTickerText,
  ]);

  const tags = props.tags ?? [];
  const showTagRow =
    tags.length > 0 ||
    props.actionMenus?.length ||
    props.showSubmit ||
    props.rightSection ||
    (props.showPlus && props.onOpenAiPanel);

  return (
    <div className="bn-combobox goose-ai-prompt-menu">
      <div
        className={mergeCSSClasses(
          "goose-ai-prompt-field",
          disabled ? "goose-ai-prompt-field--disabled" : "",
          props.busy ? "goose-ai-prompt-field--busy" : "",
        )}
        aria-busy={props.busy ? true : undefined}
      >
        {props.icon != null && (
          <div className="goose-ai-prompt-field__icon" aria-hidden>
            {props.icon}
          </div>
        )}
        <Textarea
          context="editor"
          variant="inline"
          ref={textareaRef}
          className="goose-ai-prompt-field__textarea bn-combobox-input"
          name="ai-prompt"
          aria-label={t("aiRewriteInstructions")}
          rows={1}
          value={promptTextToUse || ""}
          placeholder={props.busy ? "" : props.placeholder}
          disabled={props.disabled}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onBlur={() => {
            isComposingRef.current = false;
          }}
          onChange={handleChange}
          autoComplete="off"
          aria-multiline="true"
          aria-hidden={props.busy ? true : undefined}
          spellCheck={false}
        />
        {props.busy ? (
          <div
            className="goose-ai-think-ticker"
            role="status"
            aria-live="polite"
            aria-atomic="false"
          >
            <div className="goose-ai-think-ticker__scroller">
              {props.busyTickerText?.trim() || props.placeholder || t("thinking")}
            </div>
          </div>
        ) : null}
      </div>
      {showTagRow && (
        <GoosePromptActions props={props} promptTextToUse={promptTextToUse} />
      )}
    </div>
  );
}
