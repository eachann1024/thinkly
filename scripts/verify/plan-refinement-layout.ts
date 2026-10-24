import { readFileSync } from "node:fs";
import { createChecker } from "./lib/check";
import { setLanguageSnapshot } from "../../src/i18n/runtime";
import { planRefinementText, planReviewReason } from "../../src/pages/workspace/components/notebook-ai/approval/planRefinementText";

export default async function run(): Promise<number> {
  const checker = createChecker();
  setLanguageSnapshot({ preference: "zh-Hans", effectiveLocale: "zh-Hans", formatLocale: "zh-CN", revision: 1 });
  const prompt = planRefinementText("润色 easyShop 分析段落");
  const raw = JSON.stringify([{ origin: "string", code: "too_small", minimum: 1,
    inclusive: true, path: ["operations", 0, "target", "parentId"], message: "Invalid input" }], null, 2);
  const reason = planReviewReason(raw);
  checker.check("重试文案包含方案名称和重新读取要求", prompt.includes("润色 easyShop 分析段落") && prompt.includes("重新读取"));
  checker.check("重试保留核对已完成变更和重新确认的约束", prompt.includes("核对已完成") && prompt.includes("待确认") && prompt.includes("避免重复"));
  checker.check("重试不携带空补充标签或原始错误 JSON", !prompt.includes("我的补充要求") && !prompt.includes('"path"') && prompt.length < 120);
  checker.check("截图中的参数校验错误显示为短提示", reason.length > 0 && reason.length < 80 && !reason.includes("too_small") && !reason.includes("parentId"));
  checker.check("空错误不产生提示，业务错误保留内容", planReviewReason("") === "" && planReviewReason("目标位置不存在或归属发生变化") === "目标位置不存在或归属发生变化");
  const actions = readFileSync("src/pages/workspace/components/notebook-ai/approval/ReviewActions.tsx", "utf8");
  checker.check("调整按钮和错误展示使用统一文案入口", actions.includes('text: planRefinementText(input?.title ?? t("noteChangePlan"))') && actions.includes("const reason = planReviewReason("));
  const css = readFileSync("src/pages/workspace/styles/notebook-ai/messages.css", "utf8");
  for (const selector of [".notebook-ai-message-inline", ".notebook-ai-message-inline-text"]) {
    const body = css.slice(css.indexOf(`${selector} {`)).split("}")[0];
    checker.check(`${selector} 随正文行高排版并保留长文本换行`, body.includes("line-height: inherit") && body.includes("overflow-wrap: anywhere"));
  }
  return checker.failed;
}
