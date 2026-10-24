import type { PageContent } from "@/components/editor/utils/blocknote-content";
export type JSONContent = PageContent | any;

export type SyncProvider = "local" | "jianguoyun" | "icloud";
export type FontFamily = "default" | "serif" | "mono";
export type PageLayout = "full" | "standard";
export type FontSize = "default" | "small";
export type LocalFileReadState = "ready" | "error";

export interface FileAttachmentAttrs {
  storageRef: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  syncProvider: SyncProvider;
  createdAt: number;
  updatedAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  source?: "default" | "local-folder";
  localPath?: string;
}

export interface Page {
  id: string;
  workspaceId: string;
  parentId?: string;
  icon?: string;
  cover?: string;
  content: JSONContent;

  isFolder?: boolean;
  isFavorite?: boolean;
  isLocked: boolean;
  fontSize: FontSize;
  fontFamily: FontFamily;
  pageLayout?: PageLayout;

  createdAt: number;
  updatedAt: number;
  order?: number;
  favoriteOrder?: number;
  isPinned?: boolean;
  pinnedAt?: number;
  trashedAt?: number;
  trashBatchId?: string;
  editorDraft?: boolean;

  localFilePath?: string;
  localUnsaved?: boolean;
  localPendingCreate?: "folder" | "file";
  localReadState?: LocalFileReadState;
  localReadError?: string;
  localFrontmatter?: string;

  outgoingLinks?: string[];
  incomingLinks?: string[];
}
