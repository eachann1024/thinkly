import { closeHistory, history } from "@tiptap/pm/history";
import { EditorState, Plugin } from "@tiptap/pm/state";
import { Step } from "@tiptap/pm/transform";
import type { Schema } from "@tiptap/pm/model";

import { getCachedContentSignature } from "./editorContentPolicy";

const historyKey = history().spec.key!;

function migrateHistory(value: any, schema: Schema): any {
  const clone = (source: any, fields: object) =>
    Object.assign(Object.create(Object.getPrototypeOf(source)), source, fields);
  const branch = (source: any) => clone(source, {
    items: source.items.slice(0, 0).append(source.items.map((item: any) =>
      clone(item, {
        step: item.step ? Step.fromJSON(schema, item.step.toJSON()) : undefined,
      }),
    )),
  });
  return clone(value, { done: branch(value.done), undone: branch(value.undone) });
}

type Source = { content: unknown; mode: "raw" | "normalized"; syncedSignature: string | null };

type Snapshot = {
  signature: string;
  state: EditorState;
  source?: Source & { signature: string };
};

export class PageUndoHistory {
  private entries = new Map<string, Snapshot | null>();

  private readonly capacity: number;

  constructor(capacity = 10) { this.capacity = capacity; }

  visit(pageId: string) {
    const snapshot = this.entries.get(pageId) ?? null;
    this.entries.delete(pageId);
    this.entries.set(pageId, snapshot);
    while (this.entries.size > this.capacity) {
      this.entries.delete(this.entries.keys().next().value!);
    }
  }

  save(pageId: string, state: EditorState, signature: string, source?: Source) {
    if (!this.entries.has(pageId)) return;
    const plugin = historyKey.get(state);
    if (!plugin) return;
    this.entries.set(pageId, {
      signature,
      state: state.reconfigure({ plugins: [plugin] }),
      source: source ? { ...source, signature: getCachedContentSignature(source.content) } : undefined,
    });
  }

  restoreCached(pageId: string, current: EditorState, content: unknown, mode: Source["mode"]) {
    const snapshot = this.entries.get(pageId);
    const source = snapshot?.source;
    if (!snapshot || !source || source.mode !== mode ||
        source.signature !== getCachedContentSignature(content)) return null;
    const state = this.restore(pageId, current, snapshot.signature);
    return state === current ? null : { state, syncedSignature: source.syncedSignature };
  }

  restore(pageId: string, current: EditorState, signature: string): EditorState {
    const snapshot = this.entries.get(pageId);
    this.visit(pageId);
    if (!snapshot) return current;
    if (snapshot.signature !== signature) {
      this.entries.set(pageId, null);
      return current;
    }
    const plugin = historyKey.get(current);
    if (!plugin?.spec.state) return current;
    try {
      const sameSchema = snapshot.state.schema === current.schema;
      const historyState = sameSchema
        ? historyKey.getState(snapshot.state)
        : migrateHistory(historyKey.getState(snapshot.state), current.schema);
      const doc = sameSchema
        ? snapshot.state.doc
        : current.schema.nodeFromJSON(snapshot.state.doc.toJSON());
      const restoredPlugin = new Plugin({
        ...plugin.spec,
        state: { ...plugin.spec.state, init: () => historyState },
      });
      const state = EditorState.create({
        doc,
        selection: snapshot.state.selection.getBookmark().resolve(doc),
        plugins: current.plugins.map((entry) => entry === plugin ? restoredPlugin : entry),
      }).reconfigure({ plugins: current.plugins });
      return state.apply(closeHistory(state.tr));
    } catch (error) {
      console.error("[goose-note] Could not restore page undo history", error);
      this.entries.set(pageId, null);
      return current;
    }
  }
}

export const pageUndoHistory = new PageUndoHistory();
