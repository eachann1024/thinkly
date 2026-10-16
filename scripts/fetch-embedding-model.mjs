#!/usr/bin/env node
// 把本地语义检索所需的向量模型与 onnxruntime-web 运行时放进 public/，构建后随应用分发，运行时不访问网络。
import { copyFileSync, existsSync, mkdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const MODEL = "Xenova/bge-small-zh-v1.5";
const HOSTS = ["https://huggingface.co", "https://hf-mirror.com"];
const FILES = ["config.json", "tokenizer.json", "tokenizer_config.json", "special_tokens_map.json", "onnx/model_quantized.onnx"];
const ORT_FILES = ["ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

function present(path) {
  return existsSync(path) && statSync(path).size > 0;
}

async function download(file, target) {
  let lastError;
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}/${MODEL}/resolve/main/${file}`, { redirect: "follow", signal: AbortSignal.timeout(300_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      mkdirSync(dirname(target), { recursive: true });
      const temp = `${target}.part`;
      writeFileSync(temp, Buffer.from(await response.arrayBuffer()));
      renameSync(temp, target);
      return;
    } catch (error) {
      lastError = error;
      console.warn(`[embedding-model] ${host} ${file} 失败：${error.message}`);
    }
  }
  throw lastError;
}

async function main() {
  const modelDir = join(root, "public/models", MODEL);
  for (const file of FILES) {
    const target = join(modelDir, file);
    if (present(target)) continue;
    console.log(`[embedding-model] 下载 ${file}`);
    await download(file, target);
  }
  const ortSource = join(root, "node_modules/onnxruntime-web/dist");
  const ortTarget = join(root, "public/ort");
  mkdirSync(ortTarget, { recursive: true });
  for (const file of ORT_FILES) {
    const source = join(ortSource, file);
    const target = join(ortTarget, file);
    if (!present(source)) throw new Error(`缺少 ${source}，请先执行 bun install`);
    if (!present(target) || statSync(target).size !== statSync(source).size) copyFileSync(source, target);
  }
}

main().catch(error => {
  console.error(`[embedding-model] ${error.message}`);
  process.exit(1);
});
