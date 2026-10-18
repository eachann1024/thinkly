import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_FRAMES = [
  0, 130, 269, 270, 340, 629, 630, 700, 989, 990, 1060, 1319, 1320, 1380, 1440, 1679, 1680, 1770,
  2009, 2010, 2090, 2339, 2340, 2420, 2579, 2580, 2620, 2660, 2879,
];
const frames = process.argv.length > 2 ? process.argv.slice(2).map(Number) : DEFAULT_FRAMES;
const outDir = "qa/stills";
fs.mkdirSync(outDir, { recursive: true });

await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "GooseFeatures" });

for (const frame of frames) {
  const output = `${outDir}/f${String(frame).padStart(4, "0")}.jpg`;
  await renderStill({ serveUrl, composition, frame, output, imageFormat: "jpeg", jpegQuality: 92 });
  console.log(output);
}
