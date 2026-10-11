import type { MermaidInitOptions } from "../imageExport/mermaidTheme";

export interface MermaidPreviewRequest {
  source: string;
  options: MermaidInitOptions;
  context: "editor" | "export";
  fontIdentity?: string;
  requestId?: string;
}
export interface MermaidPreviewJob extends MermaidPreviewRequest { id: number }
export interface MermaidPreviewReply { id: number; svg?: string; error?: string }
export interface PreviewWorkerBridge {
  onRequest: (callback: (job: MermaidPreviewJob) => void) => void;
  onCancel: (callback: (id: number) => void) => void;
  reply: (result: MermaidPreviewReply) => void;
  ready: () => void;
}
