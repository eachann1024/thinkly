import { execFileSync } from "node:child_process";
import path from "node:path";

// 需要已启动的 dev server 和同一 ego TaskSpace；不截图，不接触桌面或真实笔记。
export default function run() {
  const space = Number(process.env.CARET_SPACE);
  if (!space) throw new Error("请设置 CARET_SPACE 为本次验收的 ego TaskSpace ID");
  const phase = process.env.CARET_PHASE ?? "inline";
  if (!["inline", "placeholder", "structures", "boundaries", "interactions", "layout"].includes(phase))
    throw new Error("未知验收阶段");
  const options = {
    space,
    url: process.env.CARET_URL ?? "http://127.0.0.1:6001/?caret-gallery=1",
    start: Number(process.env.CARET_START ?? 0),
    end: Number(process.env.CARET_END ?? 99),
    inlineOnly: process.env.CARET_INLINE_ONLY === "1",
    quicknoteOnly: process.env.CARET_LAYOUT_QUICKNOTE_ONLY === "1",
    output: process.env.CARET_OUTPUT ?? `/tmp/goose-caret-${phase}.json`,
  };
  const file = path.join(process.cwd(), `scripts/verify/browser/caret-${phase}.mjs`);
  try {
    const output = execFileSync("ego-browser", ["nodejs"], {
      input: `globalThis.options=${JSON.stringify(options)}; await import(${JSON.stringify(`file://${file}`)});`,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    });
    process.stdout.write(output);
    return /✗/.test(output) ? 1 : 0;
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    process.stdout.write(failure.stdout ?? "");
    process.stderr.write(failure.stderr ?? "");
    return 1;
  }
}
