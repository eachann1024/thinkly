import { createExtension } from "@blocknote/core";
import { InputRule, inputRules } from "@tiptap/pm/inputrules";
import { closeHistory } from "@tiptap/pm/history";
import { TextSelection, type EditorState } from "@tiptap/pm/state";

export const DIVIDER_INPUT_RULE_FIND = /^---+\s?$/;

export function createDividerTransaction(state: EditorState, start: number) {
  const { selection, schema } = state;
  const { $from } = selection;
  if (
    !selection.empty ||
    $from.parent.type.name !== "paragraph" ||
    $from.parentOffset !== $from.parent.content.size ||
    start !== $from.start() ||
    $from.depth < 2
  ) return null;

  const container = $from.node($from.depth - 1);
  const divider = schema.nodes.divider;
  if (container.type.name !== "blockContainer" || container.childCount !== 1 || !divider) {
    return null;
  }

  const tr = state.tr.replaceWith($from.before(), $from.after(), divider.create());
  const after = tr.mapping.map($from.after($from.depth - 1));
  const next = tr.doc.nodeAt(after);
  if (next?.type.name !== "blockContainer" || next.firstChild?.type.name !== "paragraph") {
    const paragraph = schema.nodes.blockContainer.createAndFill(
      { id: crypto.randomUUID() }, [schema.nodes.paragraph.create()],
    );
    if (!paragraph) return null;
    tr.insert(after, paragraph);
  }
  return closeHistory(tr.setSelection(TextSelection.create(tr.doc, after + 2))).scrollIntoView();
}

export const gooseDividerInputRuleExtension = createExtension(({ editor }) => {
  const rules = inputRules({
    rules: [new InputRule(
      DIVIDER_INPUT_RULE_FIND,
      (state, _match, start) => createDividerTransaction(state, start),
      { undoable: false, inCodeMark: false },
    )],
  });

  return {
    key: "goose-divider-input-rule",
    runsBefore: ["default"],
    prosemirrorPlugins: [rules],
    keyboardShortcuts: {
      Enter: () => {
        const view = editor.prosemirrorView;
        if (view.composing || !view.state.selection.empty) return false;
        const { from, to } = view.state.selection;
        return Boolean(rules.props.handleTextInput?.call(
          rules, view, from, to, "\n", () => view.state.tr.insertText("\n", from, to),
        ));
      },
    },
  };
});
