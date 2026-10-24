import { readFileSync } from "node:fs";
import { createChecker } from "./lib/check";

export default async function run(): Promise<number> {
  const checker = createChecker();
  const composer = readFileSync("src/pages/workspace/components/notebook-ai/Composer.tsx", "utf8");
  const promptBar = readFileSync("src/pages/workspace/components/notebook-ai/beautiful-ui/PromptBar.tsx", "utf8");
  const css = readFileSync("src/pages/workspace/styles/notebook-ai/composer.css", "utf8");
  const upload = composer.match(/\{!isStreaming && <span\b[\s\S]*?<\/span>\}/)?.[0];
  checker.check("生成时移除整个上传按钮及其占位，结束后恢复", upload?.includes('aria-label={t("uploadImage")}') && upload.includes("<Plus "));
  checker.check("上传按钮不再通过 invisible 留下空槽", !composer.includes("invisible pointer-events-none"));
  checker.check("生成状态从输入条传入边框容器", composer.includes("<PromptBar streaming={isStreaming}>") && promptBar.includes('data-streaming={streaming ? "true" : undefined}'));
  checker.check("工具栏始终使用左侧工具组和右侧发送停止按钮两列", css.includes("grid-template-columns: minmax(0, 1fr) var(--ai-composer-action-size);") && !css.includes('[data-streaming="true"] > .notebook-ai-composer-shell'));
  checker.check("上传与资源模型放在同一个可收缩工具组", /notebook-ai-composer-tools[\s\S]*?!isStreaming[\s\S]*?<ResourcePicker[\s\S]*?<ModelSelectorPopover[\s\S]*?<\/div>/.test(composer));
  checker.check("空输入只保留一行高度，长输入仍有滚动上限", css.includes("min-height: calc(var(--ai-composer-line-height) + 1rem);") && css.includes("max-height: min(14rem, 30dvh);"));
  checker.check("输入区跨满整行，资源模型和停止入口保留", composer.includes("order-first col-span-full w-full") && composer.includes("<ResourcePicker ") && composer.includes("<ModelSelectorPopover ") && composer.includes("<ComposerPrimitive.Cancel "));
  return checker.failed;
}
