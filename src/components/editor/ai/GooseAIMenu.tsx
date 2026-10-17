import { EditorAction } from "@/components/editor/ui/button";
import { useExtension, useExtensionState } from "@blocknote/react";
import { Sparkles, Square, X } from "@/components/ui/icons";
import "./inlineAiSurface.css";
import { SelectionActions } from "@/pages/workspace/components/notebook-ai/beautiful-ui/SelectionActions";
import { GooseAIExtension } from "./GooseAIExtension";
import {
  GoosePromptSuggestionMenu,
  type GooseAiMenuTag,
} from "./GoosePromptSuggestionMenu";
import { formatAiMenuError } from "./formatAiMenuError";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/GooseAIMenu.tsx#messages:1">`
zh-Hans:
  polish: "润色"
  corporateJargon: "工作黑话"
  shorten: "精简"
  translateToEnglish: "翻译成英文"
  translateToChinese: "翻译成中文"
  makeConversational: "口语化"
  turnIntoAList: "整理为列表"
  checklist: "待办事项"
  applyChanges: "应用修改"
  discard: "放弃"
  regenerate: "重新生成"
  retry: "重试"
  rewriting: "正在改写"
  reviewChanges: "审阅修改"
  rewriteIncomplete: "改写未完成"
  editSelection: "编辑所选内容"
  closeAiEditing: "关闭 AI 编辑"
  close: "关闭"
  delete: "删除"
  added: "新增"
  generationInterruptedTheBodyTextWasNotChanged: "生成中断，未对正文进行修改"
  thinkingAndGenerating: "正在思考并生成…"
  enterFollowUpInstructionsEGMakeIt: "输入进一步修改要求（如：再简短一些）…"
  tellAiWhatToDoWithThisText: "告诉 AI 如何处理这段内容（如：润色、精简、翻译）…"
  translate: "翻译"
  more: "更多"
  stop: "停止"
en:
  polish: "Polish"
  corporateJargon: "Corporate jargon"
  shorten: "Shorten"
  translateToEnglish: "Translate to English"
  translateToChinese: "Translate to Chinese"
  makeConversational: "Make conversational"
  turnIntoAList: "Turn into a list"
  checklist: "Checklist"
  applyChanges: "Apply changes"
  discard: "Discard"
  regenerate: "Regenerate"
  retry: "Retry"
  rewriting: "Rewriting"
  reviewChanges: "Review changes"
  rewriteIncomplete: "Rewrite incomplete"
  editSelection: "Edit selection"
  closeAiEditing: "Close AI editing"
  close: "Close"
  delete: "Delete"
  added: "Added"
  generationInterruptedTheBodyTextWasNotChanged: "Generation interrupted. The body text was not changed."
  thinkingAndGenerating: "Thinking and generating…"
  enterFollowUpInstructionsEGMakeIt: "Enter follow-up instructions (e.g., make it shorter)…"
  tellAiWhatToDoWithThisText: "Tell AI what to do with this text (e.g., polish, shorten, translate)…"
  translate: "Translate"
  more: "More"
  stop: "Stop"
`;
const t = createTranslator(messages);


const ACTIONS = [
  { key: "polish", get label() { return t("polish"); }, prompt: "润色给定片段，保留原意。" },
  {
    key: "jargon",
    get label() { return t("corporateJargon"); },
    prompt: "把给定片段改写成工作黑话，保留原意。",
  },
  {
    key: "simplify",
    get label() { return t("shorten"); },
    prompt: "精简给定片段，保留关键信息。",
  },
  { key: "english", get label() { return t("translateToEnglish"); }, prompt: "将给定片段翻译成英文。" },
  { key: "chinese", get label() { return t("translateToChinese"); }, prompt: "将给定片段翻译成中文。" },
  {
    key: "colloquial",
    get label() { return t("makeConversational"); },
    prompt: "把给定片段改得更口语、自然。",
  },
  {
    key: "list",
    get label() { return t("turnIntoAList"); },
    prompt: "将给定片段整理成无序列表，每个要点独立一行。",
  },
  {
    key: "tasks",
    get label() { return t("checklist"); },
    prompt: "将给定片段整理成 Markdown 待办列表，每项使用 - [ ] 独立一行。",
  },
];

export function GooseAIMenu() {
  useLocale();
  const ai = useExtension(GooseAIExtension);
  const state = useExtensionState(GooseAIExtension, {
    selector: (value) => value.aiMenuState,
  });
  if (state === "closed") return null;
  const busy = state.status === "thinking";
  const tags: GooseAiMenuTag[] = busy
    ? []
    : state.status === "user-reviewing"
      ? [
          { key: "accept", get label() { return t("applyChanges"); }, onClick: ai.acceptChanges },
          { key: "reject", get label() { return t("discard"); }, onClick: ai.rejectChanges },
          { key: "retry", get label() { return t("regenerate"); }, onClick: () => void ai.retry() },
        ]
      : state.status === "error"
        ? [
            ...(state.prompt
              ? [
                  {
                    key: "retry",
                    get label() { return t("retry"); },
                    onClick: () => void ai.retry(),
                  },
                ]
              : []),
          ]
        : [
            ...ACTIONS.filter((action) =>
              ["polish", "simplify"].includes(action.key),
            ).map((action) => ({
              ...action,
              onClick: () => void ai.submit(action.prompt),
            })),
          ];

  return (
    <SelectionActions
      busy={busy}
      className="goose-ai-menu-selection goose-inline-ai-surface"
    >
      <div className="goose-inline-ai-header">
        <span>
          <Sparkles className="h-4 w-4" aria-hidden />
          {busy
            ? t("rewriting")
            : state.status === "user-reviewing"
              ? t("reviewChanges")
              : state.status === "error"
                ? t("rewriteIncomplete")
                : t("editSelection")}
        </span>
        <EditorAction
          type="button"
          className="goose-inline-ai-close"
          aria-label={t("closeAiEditing")}
          title={t("close")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={ai.closeAIMenu}
        >
          <X className="h-4 w-4" aria-hidden />
        </EditorAction>
      </div>
      {state.status === "user-reviewing" && (
        <p className="goose-ai-preview-summary" role="status">
          <del>{t("delete")}</del> <ins>{t("added")}</ins>
        </p>
      )}
      {state.status === "error" && (
        <p role="alert" className="goose-inline-ai-error">
          {formatAiMenuError(state.error) || t("generationInterruptedTheBodyTextWasNotChanged")}
        </p>
      )}
      <GoosePromptSuggestionMenu
        onManualPromptSubmit={(value) => void ai.submit(value)}
        promptText={state.input ?? ""}
        onPromptTextChange={ai.setInput}
        placeholder={
          busy
            ? t("thinkingAndGenerating")
            : state.status === "user-reviewing"
              ? t("enterFollowUpInstructionsEGMakeIt")
              : t("tellAiWhatToDoWithThisText")
        }
        disabled={busy}
        busy={busy}
        busyTickerText={state.ticker}
        tags={tags}
        showSubmit={!busy}
        actionMenus={
          state.status === "user-input"
            ? [
                {
                  get label() { return t("translate"); },
                  actions: ACTIONS.filter((action) =>
                    ["english", "chinese"].includes(action.key),
                  ).map((action) => ({
                    ...action,
                    onClick: () => void ai.submit(action.prompt),
                  })),
                },
                {
                  get label() { return t("more"); },
                  actions: ACTIONS.filter((action) =>
                    ["jargon", "colloquial", "list", "tasks"].includes(
                      action.key,
                    ),
                  ).map((action) => ({
                    ...action,
                    onClick: () => void ai.submit(action.prompt),
                  })),
                },
              ]
            : undefined
        }
        showPlus={state.status === "user-input"}
        onOpenAiPanel={() => {
          ai.closeAIMenu();
          window.dispatchEvent(
            new CustomEvent("goose-note:open-settings", {
              detail: { tab: "ai" },
            }),
          );
        }}
        rightSection={
          busy ? (
            <div className="goose-ai-menu-busy-actions bn-combobox-right-section">
              <EditorAction
                type="button"
                className="goose-ai-menu-stop"
                aria-label={t("stop")}
                title={t("stop")}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  ai.abort();
                }}
              >
                <Square className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                {t("stop")}
              </EditorAction>
            </div>
          ) : undefined
        }
      />
    </SelectionActions>
  );
}
