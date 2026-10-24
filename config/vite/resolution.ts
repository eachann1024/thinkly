import path from "node:path";
import { existsSync } from "node:fs";
export function createResolveOptions(root: string) {
  const nodeFsStubModule = path.resolve(
    root,
    "./src/lib/vite-stubs/node-fs-stub.ts",
  );
  const pdfFontEmptyModule = path.resolve(
    root,
    "./src/lib/vite-stubs/pdf-font-empty.ts",
  );
  if (!existsSync(nodeFsStubModule) || !existsSync(pdfFontEmptyModule)) {
    throw new Error(
      `[vite] 缺少构建 stub（${path.relative(root, nodeFsStubModule)} / ${path.relative(root, pdfFontEmptyModule)}）。` +
        "不要把这些文件放在名为 build 的目录里：全局 gitignore 的 build/ 会让 electron publish 漏传，商店 Linux CI 会挂。",
    );
  }
  const pdfFontAliases: { find: RegExp; replacement: string }[] = [
    {
      find: /(?:^|.*\/)Inter_18pt-[^/]+$/,
      replacement: pdfFontEmptyModule,
    },
    {
      find: /(?:^|.*\/)GeistMono-Regular[^/]*$/,
      replacement: pdfFontEmptyModule,
    },
  ];

  return {
    dedupe: [
      "react",
      "react-dom",
      "@blocknote/core",
      "@blocknote/react",
      "@blocknote/mantine",
      "prosemirror-model",
      "prosemirror-state",
      "prosemirror-transform",
      "prosemirror-view",
      "prosemirror-tables",
    ],
    alias: [
      ...pdfFontAliases,
      { find: /^node:fs$/, replacement: nodeFsStubModule },
      {
        find: "@host-runtime",
        replacement: path.resolve(root, "./src/lib/host/runtime.electron.ts"),
      },

      { find: "@", replacement: path.resolve(root, "./src") },
    ],
  };
}
