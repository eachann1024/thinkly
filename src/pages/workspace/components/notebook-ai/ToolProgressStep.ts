import { toInfoCard, type WebResultsCardData } from "@/lib/notebook-ai/cards/types";
import { getToolProgressStepText } from "./toolProgressText";
import type { ProgressStep, ToolProgressPart } from "./toolProgressModel";

type ResolvedStep = {
  text?: { label: string; detail: string };
  webResolved?: boolean;
  webResults?: WebResultsCardData;
};
const resolvedSteps = new WeakMap<ToolProgressStep, ResolvedStep>();

// Shared accessors keep histories small; only accessed rows allocate display data.
export class ToolProgressStep implements ProgressStep {
  #part: ToolProgressPart;
  #status: ProgressStep["status"];

  constructor(part: ToolProgressPart, status: ProgressStep["status"]) {
    this.#part = part;
    this.#status = status;
  }

  get id() { return this.#part.toolCallId; }
  get status() { return this.#status; }

  #resolved() {
    let value = resolvedSteps.get(this);
    if (!value) { value = {}; resolvedSteps.set(this, value); }
    return value;
  }

  #text() {
    const value = this.#resolved();
    if (!value.text) {
      const text = getToolProgressStepText(this.#part);
      value.text = { label: text.label, detail: text.detail };
    }
    return value.text;
  }

  get label() { return this.#text().label; }
  get detail() { return this.#text().detail; }

  get webResults() {
    if (this.#part.type !== "tool-searchWeb" || this.#part.state !== "output-available") return undefined;
    const value = this.#resolved();
    if (!value.webResolved) {
      const card = toInfoCard("searchWeb", this.#part.output);
      if (card?.kind === "webResults") value.webResults = card;
      value.webResolved = true;
    }
    return value.webResults;
  }
}
