import type { Page } from "@/types";
import type { OperationTarget, RunWriteScope } from "../resourceScope";

interface BatchOperationBinding {
  target?: OperationTarget;
  sourceRefIds?: string[];
  dependsOn?: string[];
}

export type BatchPlanOperationInput = BatchOperationBinding & (
  | {
      type: "create";
      operationId: string;
      title: string;
      markdown: string;
      parentId?: string | null;
    }
  | {
      type: "edit";
      operationId: string;
      pageId: string;
      markdown: string;
      title?: string;
    }
  | {
      type: "delete";
      operationId: string;
      pageIds: string[];
    }
  | {
      type: "search_replace";
      operationId: string;
      pageId: string;
      oldString: string;
      newString: string;
      replaceAll?: boolean;
    });

export interface BatchPlanInput {
  title: string;
  summary: string;
  operations: BatchPlanOperationInput[];
}

export type BatchPlanStatus =
  | "prepared"
  | "invalid"
  | "executing"
  | "completed"
  | "failed"
  | "undone"
  | "undo-conflicted";

export interface PageRevision {
  updatedAt: number;
  contentSignature: string;
}

export interface FrozenPageSnapshot {
  pageId: string;
  page: Page;
  revision: PageRevision;
}

export interface BatchOperationResult {
  operationId: string;
  type: BatchPlanOperationInput["type"];
  ok: boolean;
  pageIds: string[];
  error?: string;
  notebookId?: string;
  target?: OperationTarget;
  skipped?: boolean;
}

export interface FrozenOperationTarget extends OperationTarget {
  notebookRoot?: string;
  locationSignature: string;
}

export interface BatchPlanJournal {
  version: 1 | 2;
  writeScope?: RunWriteScope;
  operationTargets?: Record<string, FrozenOperationTarget>;
  requestedInputSignature?: string;
  recoveryConflicts?: Record<string, string>;
  operationBefore?: Record<string, FrozenPageSnapshot>;
  toolCallId: string;
  runId: string;
  notebookId: string;
  input: BatchPlanInput;
  selectedOperationIds: string[];
  status: BatchPlanStatus;
  executingOperationId?: string;
  executingStartedAt?: number;
  before: Record<string, FrozenPageSnapshot>;
  affectedPageIdsByOperationId: Record<string, string[]>;
  deleteBatchIdsByOperationId: Record<string, string>;
  plannedPageIds: Record<string, string>;
  plannedLocalPaths: Record<string, string>;
  localPathAfterByPageId: Record<string, string>;
  localTrashPathsByPageId: Record<string, string>;
  after: Record<string, PageRevision>;
  createdPageIds: Record<string, string>;
  results: BatchOperationResult[];
  rollbackStatus?: "complete" | "incomplete";
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type BatchPlanPrepareResult =
  | { ok: true; journal: BatchPlanJournal }
  | { ok: false; error: string; journal?: BatchPlanJournal };

export type BatchPlanExecuteResult =
  | { ok: true; journal: BatchPlanJournal; results: BatchOperationResult[] }
  | {
      ok: false;
      journal: BatchPlanJournal;
      error: string;
      results: BatchOperationResult[];
    };
