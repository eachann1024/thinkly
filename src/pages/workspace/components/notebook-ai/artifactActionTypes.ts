import type { PreviewContent } from "@/lib/preview/previewAction";
import type { ArtifactInsertResult } from "./insertArtifact";
export interface ArtifactActionsProps {
  copySource?: string;
  downloadSource?: string;
  filename?: string;
  mimeType?: string;
  onCopyImage?: () => Promise<string | Blob>;
  onDownloadImage?: () => Promise<Blob>;
  downloadImageFilename?: string;
  onPreview?: () => Promise<PreviewContent>;
  onPreviewImage?: () => Promise<string | Blob>;
  previewFilename?: string;
  previewIdentity?: string;
  onInsert?: () => Promise<ArtifactInsertResult> | ArtifactInsertResult;
}
