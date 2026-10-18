import type { ReactNode } from "react";
import type { CornerPosition } from "./corners";

export type DotDecorPreset =
  | "page"
  | "folder"
  | "outline"
  | "aiChat"
  | "aiOff"
  | "aiGate"
  | "gitGate"
  | "search"
  | "history"
  | "splitMissing"
  | "splitError"
  | "bootstrap"
  | "webdav"
  | "gitRepos"
  | "noFolder"
  | "character";

export type DecorItem = { at: CornerPosition; minor?: boolean; node: ReactNode };
