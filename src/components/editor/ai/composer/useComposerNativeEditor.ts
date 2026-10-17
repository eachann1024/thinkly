/**
 * 命令式挂载 contenteditable：生命周期内不销毁，避免 React 改属性。
 * 被 AiComposerInput 在原生 handler 赋值之后调用。
 * 依赖 composerTokens、图片 preview portal、宿主空壳 ref。
 */
import {
  useEffect,
  useLayoutEffect,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { JSONContent } from "@/types";
import {
  createImagePreviewPortal,
  refreshComposerImageLabels,
  IMAGE_PREVIEW_HIDE_MS,
  type ComposerImageRegistry,
} from "./composerImageChip";
import {
  buildPayloadFromTokens,
  isComposerPayloadEmpty,
  readTokensFromDom,
  setDomFromJsonContent,
} from "./composerTokens";
import { refreshSelectionQuoteLabels } from "./selectionQuoteDom";
import type { ComposerNativeHandlers } from "./composerInputTypes";
import { i18nYaml, createTranslator, useLocale } from "@/i18n";
const messages = i18nYaml<"src/components/editor/ai/composer/useComposerNativeEditor.ts#messages:1">`
zh-Hans:
  aiInput: "AI 输入"
en:
  aiInput: "AI input"
ja:
  aiInput: "AI 入力"
`;
const t = createTranslator(messages);


export function useComposerEditor(options: {
  editorHostRef: RefObject<HTMLDivElement | null>;
  editorRef: RefObject<HTMLDivElement | null>;
  variant: "compact" | "panel";
  disabled?: boolean;
  lastEmittedContentRef: RefObject<JSONContent | null | undefined>;
  imageRegistryRef: RefObject<ComposerImageRegistry>;
  nativeHandlersRef: RefObject<ComposerNativeHandlers | null>;
  imagePreviewElRef: RefObject<HTMLDivElement | null>;
  imagePreviewHideTimerRef: RefObject<ReturnType<typeof setTimeout> | null>;
  activePreviewImageIdRef: RefObject<string | null>;
  activePreviewChipRef: RefObject<HTMLElement | null>;
  setPlaceholderVisible: (visible: boolean) => void;
  isEmptyRef: RefObject<boolean>;
  setIsEmpty: Dispatch<SetStateAction<boolean>>;
  onIsEmptyChange?: (isEmpty: boolean) => void;
}) {
  const locale = useLocale();
  const {
    editorHostRef,
    editorRef,
    variant,
    disabled,
    lastEmittedContentRef,
    imageRegistryRef,
    nativeHandlersRef,
    imagePreviewElRef,
    imagePreviewHideTimerRef,
    activePreviewImageIdRef,
    activePreviewChipRef,
    setPlaceholderVisible,
    isEmptyRef,
    setIsEmpty,
    onIsEmptyChange,
  } = options;

  useLayoutEffect(() => {
    const host = editorHostRef.current;
    if (!host || editorRef.current) return;

    const el = document.createElement("div");
    el.setAttribute("role", "textbox");
    el.setAttribute("aria-label", t("aiInput"));
    el.setAttribute("aria-multiline", "true");
    el.dataset.aiComposerEditor = "true";
    el.dataset.aiComposerVariant = variant;
    el.spellcheck = false;
    // 类名只写一次；之后禁用态用 classList 改，不整段替换
    el.className = [
      "block w-full bg-transparent p-0 text-foreground outline-none",
      "overflow-y-auto break-words whitespace-pre-wrap",
      variant === "panel"
        ? "min-h-[20px] max-h-[80px]"
        : "min-h-[20px] max-h-[88px] text-[12px] leading-[20px]",
    ].join(" ");
    el.contentEditable = "true";
    // 编辑宿主默认可聚焦但不在 Tab 序（tabIndex=-1）；显式 0 才能从工具栏 Tab 进来。
    el.tabIndex = 0;

    const onBeforeInput = (event: Event) =>
      nativeHandlersRef.current?.onBeforeInput(event);
    const onInput = (event: Event) =>
      nativeHandlersRef.current?.onInput(event);
    const onKeyDown = (event: KeyboardEvent) =>
      nativeHandlersRef.current?.onKeyDown(event);
    const onClick = (event: MouseEvent) =>
      nativeHandlersRef.current?.onClick(event);
    const onMouseOver = (event: MouseEvent) =>
      nativeHandlersRef.current?.onMouseOver(event);
    const onMouseOut = (event: MouseEvent) =>
      nativeHandlersRef.current?.onMouseOut(event);
    const onBlur = () => nativeHandlersRef.current?.onBlur();
    const onPaste = (event: ClipboardEvent) =>
      nativeHandlersRef.current?.onPaste(event);
    const onCompositionStart = () =>
      nativeHandlersRef.current?.onCompositionStart();
    const onCompositionEnd = () =>
      nativeHandlersRef.current?.onCompositionEnd();

    // 预览浮层：进入时取消关闭，离开时延迟关闭（每实例独立 portal）
    const previewEl = createImagePreviewPortal();
    imagePreviewElRef.current = previewEl;
    const onPreviewEnter = () => {
      if (imagePreviewHideTimerRef.current != null) {
        clearTimeout(imagePreviewHideTimerRef.current);
        imagePreviewHideTimerRef.current = null;
      }
    };
    const onPreviewLeave = () => {
      if (imagePreviewHideTimerRef.current != null) {
        clearTimeout(imagePreviewHideTimerRef.current);
      }
      imagePreviewHideTimerRef.current = setTimeout(() => {
        imagePreviewHideTimerRef.current = null;
        const preview = imagePreviewElRef.current;
        if (!preview) return;
        preview.style.display = "none";
        preview.replaceChildren();
        preview.setAttribute("aria-hidden", "true");
        activePreviewImageIdRef.current = null;
        activePreviewChipRef.current = null;
      }, IMAGE_PREVIEW_HIDE_MS);
    };

    el.addEventListener("beforeinput", onBeforeInput);
    el.addEventListener("input", onInput);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("click", onClick);
    el.addEventListener("mouseover", onMouseOver);
    el.addEventListener("mouseout", onMouseOut);
    el.addEventListener("paste", onPaste);
    el.addEventListener("blur", onBlur);
    el.addEventListener("compositionstart", onCompositionStart);
    el.addEventListener("compositionend", onCompositionEnd);
    previewEl.addEventListener("mouseenter", onPreviewEnter);
    previewEl.addEventListener("mouseleave", onPreviewLeave);

    host.appendChild(el);
    editorRef.current = el;

    // 首次种子（若有）：同步空态给发送按钮，避免切回面板时草稿已在但按钮仍灰
    const seed = lastEmittedContentRef.current;
    if (seed) {
      setDomFromJsonContent(el, seed, imageRegistryRef.current);
    }
    const tokens = readTokensFromDom(el);
    const payload = buildPayloadFromTokens(tokens);
    const empty = isComposerPayloadEmpty(payload);
    setPlaceholderVisible(empty);
    isEmptyRef.current = empty;
    setIsEmpty(empty);
    onIsEmptyChange?.(empty);

    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
      el.removeEventListener("input", onInput);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("click", onClick);
      el.removeEventListener("mouseover", onMouseOver);
      el.removeEventListener("mouseout", onMouseOut);
      el.removeEventListener("paste", onPaste);
      el.removeEventListener("blur", onBlur);
      el.removeEventListener("compositionstart", onCompositionStart);
      el.removeEventListener("compositionend", onCompositionEnd);
      previewEl.removeEventListener("mouseenter", onPreviewEnter);
      previewEl.removeEventListener("mouseleave", onPreviewLeave);
      if (imagePreviewHideTimerRef.current != null) {
        clearTimeout(imagePreviewHideTimerRef.current);
        imagePreviewHideTimerRef.current = null;
      }
      // 仅当本实例持有该 portal 时移除，避免多 composer 互相拆掉
      if (imagePreviewElRef.current === previewEl) {
        previewEl.remove();
        imagePreviewElRef.current = null;
      }
      activePreviewImageIdRef.current = null;
      activePreviewChipRef.current = null;
      el.remove();
      editorRef.current = null;
    };
    // variant 固定按实例；禁止依赖变化重建节点
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.setAttribute("aria-label", t("aiInput"));
    refreshComposerImageLabels(el);
    refreshSelectionQuoteLabels(el);
  }, [editorRef, locale]);

  // disabled 只改属性，不重建节点、不碰 className 整串
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.contentEditable = disabled ? "false" : "true";
    el.tabIndex = disabled ? -1 : 0;
    el.setAttribute("aria-disabled", disabled ? "true" : "false");
    el.classList.toggle("cursor-not-allowed", Boolean(disabled));
    el.classList.toggle("text-disabled", Boolean(disabled));
  }, [disabled, editorRef]);
}
