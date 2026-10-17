import { createTranslator } from "../../i18n/core";
import messages from "./messages.yaml";
export const historyText = createTranslator(messages);
export const historyMessages = messages;
export class HistoryWriteError extends Error {
  readonly kind: "directory" | "file";
  constructor(kind: "directory" | "file", path: string) {
    super(historyText(kind === "directory" ? "createHistoryDirectory" : "saveHistoryFile", { path }));
    this.kind = kind;
    this.name = "HistoryWriteError";
  }
}
