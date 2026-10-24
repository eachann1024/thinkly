import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(path.join(root, dir))) {
    if (name === "node_modules" || name === "generated") continue;
    const rel = `${dir}/${name}`;
    if (statSync(path.join(root, rel)).isDirectory()) walk(rel, out);
    else out.push(rel);
  }
  return out;
}

function renderedMarkup(source: string): string {
  const marker = "if (!showChrome || !page) return null;";
  const at = source.lastIndexOf(marker);
  return at >= 0 ? source.slice(at) : source;
}

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const bridgeFile = "src/pages/workspace/components/sidebar/SearchEditorBridge.tsx";
  const cssFile = "src/pages/workspace/components/sidebar/search-editor-bridge.css";
  const bridge = read(bridgeFile);
  const css = read(cssFile);
  const markup = renderedMarkup(bridge);

  console.log("· 路径标签");
  check("结果页不再画出 search-editor-path", !markup.includes("search-editor-path") && !bridge.includes("search-editor-path"));
  check("不再提供「查看笔记完整路径」", !bridge.includes("showFullNotePath") && !bridge.includes("查看笔记完整路径") && !bridge.includes("Show full note path"));
  check("不再拼笔记本名或文件夹名与页名", !markup.includes("crumbs") && !/join\(\s*["'] \/ ["']\s*\)/.test(bridge));
  check("样式不再把路径标签钉在笔记右上角", !css.includes("search-editor-path") && !/right:\s*1rem/.test(css) && !/top:\s*\.5rem/.test(css));

  const sources = walk("src").filter((file) => /\.(tsx?|css)$/.test(file));
  const leftovers = sources.filter((file) => /search-editor-path|showFullNotePath|查看笔记完整路径/.test(read(file)));
  check("界面源码里不再出现这条路径标签", leftovers.length === 0, leftovers);

  console.log("· 仍保留的界面");
  check("命中底栏仍渲染", markup.includes('className="search-editor-matchbar"') && css.includes(".search-editor-matchbar"));
  check("底栏仍有返回搜索结果和退出搜索", markup.includes("searchResults_098f") && markup.includes("exitSearch_3633"));
  const title = read("src/pages/workspace/components/page/titlebar/PageFileTitle.tsx");
  check("窗口标题栏页名仍在", title.includes("getPageTitle") && title.includes("truncate"));
  const sidebar = read("src/pages/workspace/components/sidebar/main-tree/row/renderItem.tsx");
  check("侧栏笔记名仍在", sidebar.includes("getPageTitle"));

  return checker.failed;
}
