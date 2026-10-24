import path from "node:path";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from "node:fs";
import type { Plugin } from "vite";

function stripLegacyKatexFonts(dir: string) {
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    if (!current) continue;
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (
        entry.name.startsWith("KaTeX_") &&
        path.basename(current) !== "fonts" &&
        (entry.name.endsWith(".ttf") || entry.name.endsWith(".woff") || entry.name.endsWith(".woff2"))
      ) {
        rmSync(full, { force: true });
      }
    }
  }
}

export function createAssetPlugin(root: string): Plugin {
  return {
    name: "exclude-guide-assets-from-electron",
    closeBundle() {
      const outDir = "dist-electron/renderer";
      rmSync(path.resolve(root, outDir, "guide"), {
        recursive: true,
        force: true,
      });
      for (const name of ["NotoSansSC-Regular.ttf", "NotoSansSC-Regular.otf"]) {
        rmSync(path.resolve(root, outDir, "fonts", name), { force: true });
      }
      const katexFontSrc = path.resolve(root, "node_modules/katex/dist/fonts");
      const katexFontDest = path.resolve(root, outDir, "assets/fonts");
      if (existsSync(katexFontSrc)) {
        mkdirSync(katexFontDest, { recursive: true });
        for (const name of readdirSync(katexFontSrc)) {
          if (!name.endsWith(".woff2")) continue;
          copyFileSync(
            path.join(katexFontSrc, name),
            path.join(katexFontDest, name),
          );
        }
      }
      stripLegacyKatexFonts(path.resolve(root, outDir));
    },
  };
}
