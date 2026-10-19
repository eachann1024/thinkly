export type GenerationQueueMetrics = {
  requests: number; runs: number; maxActive: number; maxQueuedBatches: number;
};
export function createGenerationQueue<T>(run: (paths: string[] | null) => Promise<T>): {
  metrics: GenerationQueueMetrics;
  request(paths?: string[] | null): Promise<T>;
  close(): Promise<void>;
};
