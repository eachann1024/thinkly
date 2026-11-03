import { appendFileSync } from "node:fs";
import { hasChangelogSection } from "../desktop-auto-release.mjs";
import { fallbackNotice, polishChangelog } from "./polish-changelog.mjs";

function report(line) {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
}

// 决定自动升版用哪份日志：CHANGELOG.md 已有该版本（发版前在本机润色写入）就沿用；
// 否则尝试 gemini 3.8 润色；润色结果为空/「无」时返回 skip（不发版）；拿不到网关或润色不合格就退回逐条提交标题，并在日志和 Summary 里标注。
export async function chooseReleaseBullets({ version, auto, changelog }) {
  if (hasChangelogSection(changelog, version)) {
    report(`更新日志：CHANGELOG.md 已有 ## ${version}，沿用发版前写好的内容`);
    return { bullets: auto.bullets, notesSource: "changelog" };
  }
  const result = await polishChangelog({ version, commits: auto.commits ?? [] });
  if (result.status === "polished") {
    report(`更新日志：已由 ${result.model} 润色为三类日志（${result.lines.filter((l) => l.startsWith("- ")).length} 条）`);
    return { bullets: result.lines, notesSource: "polished", notesModel: result.model };
  }
  if (result.status === "empty") {
    // 润色成功但模型判断没有用户可感知的改动：本次不发版，也不退回逐条标题。
    const reason = `${result.model} 判断自上一版以来没有用户可感知的改动，跳过本次自动发版`;
    report(`更新日志：${reason}`);
    return { skip: true, reason, notesSource: "empty", notesModel: result.model };
  }
  const reason = result.reason;
  report(fallbackNotice(reason));
  return { bullets: auto.bullets, notesSource: "fallback", notesFallbackReason: reason };
}
