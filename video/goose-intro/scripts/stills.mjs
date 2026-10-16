import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FRAMES = [0, 100, 210, 330, 450, 560, 680, 800, 925, 1040, 1170, 1290, 1417, 1560, 1680, 1790];
const frames = process.argv.length > 2 ? process.argv.slice(2).map(Number) : DEFAULT_FRAMES;
const browserExecutable = process.env.BROWSER_EXECUTABLE ?? '/usr/local/bin/google-chrome';
const outDir = 'qa/stills';
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const common = { serveUrl, browserExecutable, chromiumOptions: { gl: 'angle' } };
const composition = await selectComposition({ ...common, id: 'GooseIntro' });
for (const frame of frames) {
  const output = `${outDir}/f${String(frame).padStart(4, '0')}.jpg`;
  await renderStill({ ...common, composition, frame, output, imageFormat: 'jpeg', jpegQuality: 92 });
  console.log(output);
}
