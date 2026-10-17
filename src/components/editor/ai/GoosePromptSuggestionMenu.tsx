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
import { i18nYaml, createTranslator } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/GoosePromptSuggestionMenu.tsx#messages:1">`
zh-Hans:
  aiRewriteInstructions: "AI 改写要求"
  thinking: "思考中"
en:
  aiRewriteInstructions: "AI rewrite instructions"
  thinking: "Thinking"
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
  /** 忙态时在输入槽里展示思考/生成文本，不撑开高度。 */
  busyTickerText?: string;
  /** 可换行 tag 行；为空则不渲染。 */
  tags?: GooseAiMenuTag[];
  actionMenus?: { label: string; actions: GooseAiMenuTag[] }[];
  showSubmit?: boolean;
  /** 打开 AI 设置，仅 idle 传入。 */
  showPlus?: boolean;
  onOpenAiPanel?: () => void;
  /** 自动增高上限（px），超出后内部滚动。默认约 6 行。 */
  maxAutoHeightPx?: number;
};

/**
 * 行内 AI 提示菜单：多行 textarea + 高度随内容增长 + 可换行 tag 行。
 * 键盘：Enter 提交自由提示；Shift+Enter 换行。tag 是原生 button，Enter 由浏览器处理。
 */
export function GoosePromptSuggestionMenu(
  props: GoosePromptSuggestionMenuProps,
) {
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
        // 确认候选词的 Enter / Escape 不得发送或关闭浮层。
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
    // 首次打开立即输入；生成结束时不抢走用户已移到其他区域的焦点。
    if (
      wasDisabled &&
      active !== document.body &&
      !input.closest(".goose-ai-prompt-menu")?.parentElement?.contains(active)
    )
      return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [disabled]);

  // 从实际排版读取高度，跟随界面字号；窄窗换行后重新量高。
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
