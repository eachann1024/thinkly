import type { Node, Schema } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Step, StepResult } from "@tiptap/pm/transform";
import { UPDATE_DOCUMENT_TITLE_EVENT } from "@/lib/document-title-keyboard";

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
  return new Plugin<DocumentTitleStep | null>({
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
    view: () => ({
      update(view, previousState) {
        const step = titleHistoryKey.getState(view.state);
        if (!step || step === titleHistoryKey.getState(previousState)) return;
        title.dispatchEvent(new CustomEvent(UPDATE_DOCUMENT_TITLE_EVENT, {
          detail: { pageId: step.pageId, title: step.after },
        }));
      },
    }),
  });
}
