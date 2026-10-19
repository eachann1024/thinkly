import type { GenerationQueueMetrics } from "./catalogQueue.mjs";
export function createCatalogSession(root: string): {
  metrics: { sourceReads: number; parsedFiles: number; typePrograms: number; writes: number; cacheHits: number; directoryReads: number; publications: number };
  queueMetrics: GenerationQueueMetrics;
  refresh(paths?: string[] | null): Promise<void>;
  close(): Promise<void>;
};
