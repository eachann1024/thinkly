import path from "node:path";
import fs from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const frames = process.argv.slice(2).map(Number);
const entry = path.resolve("src/index.ts");
const serveUrl = await bundle({ entryPoint: entry });
const composition = await selectComposition({ serveUrl, id: "ThinklyFeatures" });
fs.mkdirSync("qa", { recursive: true });
for (const frame of frames) {
  const output = path.resolve(`qa/f${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 88, scale: 0.75 });
  console.log(output);
}
