import { useLayoutEffect, type RefObject } from "react";
import type { AiComposerInputHandle } from "@/components/editor/ai/composer/composerInputTypes";

const LINE_SLACK_PX = 8;
const SLOT_SPARE_PX = 8;
const ONE_LINE_INSET_PX = 12;
const ONE_LINE_GAP_PX = 8;

type LineMode = "1" | "n";

function lineHeightOf(editor: HTMLElement) {
  const value = Number.parseFloat(getComputedStyle(editor).lineHeight);
  return Number.isFinite(value) && value > 0 ? value : 20;
}

function contentHeight(editor: HTMLElement) {
  const style = getComputedStyle(editor);
  const pad =
    (Number.parseFloat(style.paddingTop) || 0) +
    (Number.parseFloat(style.paddingBottom) || 0);
  return editor.scrollHeight - pad;
}

function cssPerViewport(editor: HTMLElement) {
  const local = editor.offsetWidth;
  const viewport = editor.getBoundingClientRect().width;
  if (local <= 0 || viewport <= 0) return 1;
  return local / viewport;
}

function inkWidth(editor: HTMLElement) {
  if (editor.childNodes.length === 0) return 0;
  const range = document.createRange();
  range.selectNodeContents(editor);
  return range.getBoundingClientRect().width * cssPerViewport(editor);
}

function oneLineSlot(shell: HTMLElement) {
  const lead = shell.querySelector<HTMLElement>(".notebook-ai-composer-lead");
  const trail = shell.querySelector<HTMLElement>(".notebook-ai-composer-trail");
  return (
    shell.clientWidth -
    ONE_LINE_INSET_PX -
    ONE_LINE_GAP_PX -
    (lead?.offsetWidth ?? 0) -
    (trail?.offsetWidth ?? 0)
  );
}

function modeOf(shell: HTMLElement): LineMode {
  return shell.dataset.lines === "n" ? "n" : "1";
}

// Stay on one row while the text fits beside the tools. After it wraps,
// keep the toolbar down until the text is shorter than that narrower slot.
function chooseLines(shell: HTMLElement, editor: HTMLElement): LineMode {
  if (contentHeight(editor) > lineHeightOf(editor) + LINE_SLACK_PX) return "n";
  if (modeOf(shell) !== "n") return "1";
  const slot = oneLineSlot(shell);
  if (slot <= SLOT_SPARE_PX) return "n";
  return inkWidth(editor) <= slot - SLOT_SPARE_PX ? "1" : "n";
}

function settle(shell: HTMLElement, editor: HTMLElement) {
  if (shell.clientWidth <= 0 || editor.offsetWidth <= 0) return;
  const next = chooseLines(shell, editor);
  if (next === modeOf(shell)) return;
  shell.dataset.lines = next;
  if (chooseLines(shell, editor) !== next) shell.dataset.lines = "n";
}

export function useComposerAutoGrow(
  shellRef: RefObject<HTMLElement | null>,
  inputRef: RefObject<AiComposerInputHandle | null>,
) {
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    let editor: HTMLElement | null = null;
    let baseline = "";
    let mutation: MutationObserver | null = null;

    const syncScroll = () => {
      if (!editor) return;
      const scrolled = editor.scrollTop > 0 ? "true" : "false";
      if (shell.dataset.scrolled !== scrolled) shell.dataset.scrolled = scrolled;
    };
    const onScroll = () => syncScroll();
    const bind = (next: HTMLElement | null) => {
      if (next === editor) return;
      editor?.removeEventListener("scroll", onScroll);
      editor?.removeEventListener("input", measure);
      editor = next;
      if (!editor) return;
      editor.addEventListener("scroll", onScroll, { passive: true });
      editor.addEventListener("input", measure);
      mutation?.observe(editor, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    };
    const measure = () => {
      bind(
        inputRef.current?.getEditorEl() ??
          shell.querySelector<HTMLElement>("[data-ai-composer-editor='true']"),
      );
      if (!editor || shell.clientWidth <= 0 || editor.offsetWidth <= 0) return;
      settle(shell, editor);
      syncScroll();
      const lines = modeOf(shell);
      if (baseline === "") {
        baseline = lines;
        return;
      }
      if (lines !== baseline) shell.dataset.motion = "on";
    };

    mutation = new MutationObserver(measure);
    const resize = new ResizeObserver(measure);
    resize.observe(shell);
    const trail = shell.querySelector<HTMLElement>(".notebook-ai-composer-trail");
    if (trail) resize.observe(trail);
    measure();

    return () => {
      editor?.removeEventListener("scroll", onScroll);
      editor?.removeEventListener("input", measure);
      mutation?.disconnect();
      resize.disconnect();
    };
  }, [inputRef, shellRef]);
}
