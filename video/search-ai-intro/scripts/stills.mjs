import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_FRAMES = [
  0, 209, 210, 449, 450, 689, 690, 989, 990, 1229, 1230, 1529, 1530, 1709, 1710, 1800, 1919,
];
const frames = process.argv.length > 2 ? process.argv.slice(2).map(Number) : DEFAULT_FRAMES;
const outDir = "qa/stills";
fs.mkdirSync(outDir, { recursive: true });

await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "GooseSearchAi" });

for (const frame of frames) {
  const output = `${outDir}/f${String(frame).padStart(4, "0")}.jpg`;
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 92 });
  console.log(output);
}
