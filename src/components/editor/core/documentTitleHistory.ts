import type { Node, Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Step, StepResult } from "@tiptap/pm/transform";
import { saveDocumentTitle, UPDATE_DOCUMENT_TITLE_EVENT } from "@/lib/document-title-keyboard";

/** 标题虽在正文外，回车搬移文字仍须和正文共享可逆事务。 */
export class DocumentTitleStep extends Step {
  readonly documentTitleChange = true;
  readonly pageId: string;
  readonly before: string;
  readonly after: string;
  constructor(pageId: string, before: string, after: string) {
    super();
    this.pageId = pageId;
    this.before = before;
    this.after = after;
  }
  apply(doc: Node) { return StepResult.ok(doc); }
  invert() { return new DocumentTitleStep(this.pageId, this.after, this.before); }
  map() { return this; }
  toJSON() { return { stepType: "goose-document-title", pageId: this.pageId, before: this.before, after: this.after }; }
  static fromJSON(_schema: Schema, json: { pageId: string; before: string; after: string }) {
    return new DocumentTitleStep(json.pageId, json.before, json.after);
  }
}

// 页面撤销缓存会跨 editor/schema 重建 Step；开发热更新保留已经注册的解码器。
if (!import.meta.hot?.data.documentTitleStepRegistered) {
  Step.jsonID("goose-document-title", DocumentTitleStep);
  if (import.meta.hot) import.meta.hot.data.documentTitleStepRegistered = true;
}

const titleHistoryKey = new PluginKey<DocumentTitleStep | null>("goose-document-title-history");

export function createDocumentTitleHistoryPlugin(title: HTMLTextAreaElement) {
  let viewRef: import("@tiptap/pm/view").EditorView | undefined;
  let saving = false;
  return new Plugin<DocumentTitleStep | null>({
    filterTransaction(tr, state) {
      if (tr.getMeta("document-title-persisted")) return true;
      const move = tr.steps.find((step) => step instanceof DocumentTitleStep &&
        step.after.length > step.before.length) as DocumentTitleStep | undefined;
      // 撤销拆分/重做合并也可能把正文搬回文件名，必须先保存再删正文。
      if (!move || !tr.docChanged || tr.doc.eq(state.doc)) return true;
      if (!saving) {
        saving = true;
        void saveDocumentTitle(title, move.pageId, move.after).then((saved) => {
          saving = false;
          const view = viewRef;
          if (saved && view && !view.isDestroyed && view.state === state) {
            view.dispatch(tr.setMeta("document-title-persisted", true));
          }
        });
      }
      return false;
    },
    key: titleHistoryKey,
    state: {
      init: () => null,
      apply: (tr, previous) => {
        let next = previous;
        for (const step of tr.steps) {
          if ("documentTitleChange" in step && step.documentTitleChange === true) next = step as DocumentTitleStep;
        }
        return next;
      },
    },
    view: (view) => {
      viewRef = view;
      return ({
      destroy() { viewRef = undefined; },
      update(view, previousState) {
        const step = titleHistoryKey.getState(view.state);
        if (!step || step === titleHistoryKey.getState(previousState)) return;
        title.dispatchEvent(new CustomEvent(UPDATE_DOCUMENT_TITLE_EVENT, {
          detail: { pageId: step.pageId, title: step.after },
        }));
      },
    }); },
  });
}
