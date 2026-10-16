import { env, pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = "Xenova/bge-small-zh-v1.5";
type InitMessage = { type: "init"; modelBase: string; ortBase: string };
type EmbedMessage = { type: "embed"; id: number; texts: string[] };

let extractor: Promise<FeatureExtractionPipeline> | null = null;
let paths: InitMessage | null = null;

function configure({ modelBase, ortBase }: InitMessage) {
  // 只读本地随包模型，任何情况下都不访问网络。
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = modelBase;
  env.useBrowserCache = false;
  env.useWasmCache = false;
  const wasm = (env.backends.onnx as { wasm?: Record<string, unknown> }).wasm;
  if (wasm) {
    wasm.numThreads = 1;
    wasm.proxy = false;
    wasm.wasmPaths = { mjs: `${ortBase}ort-wasm-simd-threaded.mjs`, wasm: `${ortBase}ort-wasm-simd-threaded.wasm` };
  }
}

function load() {
  if (!paths) throw new Error("embedding worker 未初始化");
  configure(paths);
  extractor ??= pipeline("feature-extraction", MODEL, { dtype: "q8", device: "wasm" }) as Promise<FeatureExtractionPipeline>;
  extractor.catch(() => { extractor = null; });
  return extractor;
}

self.onmessage = async ({ data }: MessageEvent<InitMessage | EmbedMessage>) => {
  if (data.type === "init") { paths = data; return; }
  try {
    const model = await load();
    const output = await model(data.texts, { pooling: "mean", normalize: true });
    const vectors = new Float32Array(output.data as Float32Array);
    (self as unknown as Worker).postMessage({ id: data.id, vectors, dim: output.dims[1] }, [vectors.buffer]);
  } catch (error) {
    (self as unknown as Worker).postMessage({ id: data.id, error: error instanceof Error ? error.message : String(error) });
  }
};
