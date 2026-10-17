import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_FRAMES = [
  0, 120, 329, 330, 500, 689, 690, 760, 1049, 1050, 1120, 1469, 1470, 1540, 1829, 1830, 1900,
  2249, 2250, 2370, 2549, 2550, 2640, 2879,
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
