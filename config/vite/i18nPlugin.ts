import type { Plugin } from "vite";
import { transformMessages } from "../../scripts/i18n/compiler.mjs";
import { collectCatalog } from "../../scripts/i18n/catalog.mjs";

type I18nCatalog = Awaited<ReturnType<typeof collectCatalog>>;

export function createI18nPlugin(): Plugin {
  let root = process.cwd();
  // 队列只用来串行等待；Rolldown 的 buildStart 声明为 void，完成值不会被读取。
  let generation: Promise<I18nCatalog | void> = Promise.resolve();
  const refresh = () => {
    generation = generation.catch(() => undefined).then(() => collectCatalog(root, true));
    return generation;
  };
  return {
    name: "goose-i18n",
    enforce: "pre",
    configResolved(config) { root = config.root; },
    buildStart: refresh as Plugin["buildStart"],
    async handleHotUpdate(context) {
      if (/\.(?:[jt]sx?|ya?ml)$/.test(context.file) && !context.file.endsWith(".d.ts")) await refresh();
    },
    transform(code, id) {
      const filename = id.split("?")[0];
      if (filename.includes("node_modules") || !/\.(?:[cm]?[jt]sx?|ya?ml)$/.test(filename)) return null;
      const result = transformMessages(code, filename);
      return result ? { code: result.code, map: result.map } : null;
    },
  };
}
