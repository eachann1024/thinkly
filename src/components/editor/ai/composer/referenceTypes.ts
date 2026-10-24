import type { AiSelectionQuoteAttrs } from "./selectionQuote";

export type { AiSelectionQuoteAttrs };

export type AiFileReferenceSourceType = "app-page" | "local-file";
export type AiReferenceRole = "context" | "target";

export interface AiFileReferenceAttrs {
  pageId: string;
  workspaceId: string;
  refId?: string;
  kind?: "notebook" | "folder" | "page";
  parentId?: string;
  recursive?: boolean;
  excludedPageIds?: string[];
  titleSnapshot: string;
  sourceType: AiFileReferenceSourceType;
  localFilePath?: string;
  notebookNameSnapshot?: string;
  locationSnapshot?: string;
  role?: AiReferenceRole;
}

export interface AiReferenceSuggestionItem extends AiFileReferenceAttrs {
  title: string;
  description: string;
  isFolder?: boolean;
}

export interface AiImageAttachmentAttrs {
  imageId: string;
  fileName: string;
  mediaType: string;
  size: number;
}

export interface AiSkillCommandAttrs {
  name: string;
  path?: string;
  description?: string;
}

export type AiComposerToken =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "reference";
      reference: AiFileReferenceAttrs;
      role?: AiReferenceRole;
    }
  | {
      type: "image";
      image: AiImageAttachmentAttrs;
    }
  | {
      type: "skill";
      skill: AiSkillCommandAttrs;
    }
  | {
      type: "selectionQuote";
      quote: AiSelectionQuoteAttrs;
    };

export interface AiComposerPayload {
  promptText: string;
  freeformText: string;
  references: AiFileReferenceAttrs[];
  images: AiImageAttachmentAttrs[];
  skills: AiSkillCommandAttrs[];
  selectionQuotes?: AiSelectionQuoteAttrs[];
  tokens: AiComposerToken[];
}

export interface AiReferenceOccurrence {
  occurrenceId: string;
  tokenIndex: number;
  pageId: string;
  workspaceId: string;
  role: AiReferenceRole;
  roleSource: "explicit" | "inferred" | "default";
}

export interface NormalizedAiComposerPayload {
  payload: AiComposerPayload;
  resources: AiFileReferenceAttrs[];
  occurrences: AiReferenceOccurrence[];
  contextReferences: AiFileReferenceAttrs[];
  targetReferences: AiFileReferenceAttrs[];
  hasRoleConflict: boolean;
}

export interface ResolvedAiReferenceContext {
  reference: AiFileReferenceAttrs;
  title: string;
  sourceType: AiFileReferenceSourceType;
  notebookName: string;
  location: string;
  contentText: string;
  structureSummary: string;
  readStatus: "ready" | "error";
  coverage?: { enumerated: number; loaded: number; omitted: number; recursive: boolean };
  errorMessage?: string;
}
