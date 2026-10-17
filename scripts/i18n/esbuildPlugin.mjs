import { readFile } from "node:fs/promises";
import { transformMessages } from "./compiler.mjs";

export function createI18nEsbuildPlugin() {
  return {
    name: "goose-i18n",
    setup(build) {
      build.onLoad({ filter: /\.(?:[cm]?[jt]sx?|ya?ml)$/ }, async ({ path }) => {
        if (path.includes("node_modules")) return undefined;
        const input = await readFile(path, "utf8");
        const result = transformMessages(input, path);
        if (!result) return undefined;
        const map = result.map ? `\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(result.map.toString()).toString("base64")}` : "";
        return { contents: result.code + map, loader: path.endsWith("tsx") ? "tsx" : /\.ya?ml$/.test(path) ? "js" : "ts" };
      });
    },
  };
}
