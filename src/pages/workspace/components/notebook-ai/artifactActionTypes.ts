import type { PreviewContent } from "@/lib/preview/previewAction";
import type { ArtifactInsertResult } from "./insertArtifact";
export interface ArtifactActionsProps {
  imageReady?: boolean;
  insertReady?: boolean;
  copySource?: string;
  downloadSource?: string;
  filename?: string;
  mimeType?: string;
  onCopyImage?: () => Promise<string | Blob>;
  onDownloadImage?: () => Promise<Blob>;
  downloadImageFilename?: string;
  onPreview?: () => Promise<PreviewContent | null>;
  onPreviewImage?: () => Promise<string | Blob>;
  previewFilename?: string;
  previewTitle?: string;
  previewContext?: string;
  previewIdentity?: string;
  onInsert?: () => Promise<ArtifactInsertResult> | ArtifactInsertResult;
}
