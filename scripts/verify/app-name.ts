import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parse } from "yaml";
import { localizedAppName } from "../../electron/main/i18n/appName";
import { createChecker } from "./lib/check";

export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;
  const read = (file: string) => readFileSync(file, "utf8");
  check("语言初始化前后均使用 thinkly", localizedAppName() === "thinkly");
  for (const locale of ["en", "zh-Hans"]) {
    const file = `electron/macos-l10n/${locale}.lproj/InfoPlist.strings`;
    const plist = JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", file], { encoding: "utf8" }));
    check(`${locale} 系统显示名一致`, plist.CFBundleDisplayName === "thinkly" && plist.CFBundleName === "thinkly");
  }
  const source = read("scripts/prepare-electron-pack.mjs");
  const template = source.slice(source.indexOf("`appId:"), source.lastIndexOf("`,") + 1);
  const config = parse(Function("pkg", "electronVersion", "linuxMaintainer", `return ${template}`)(
    JSON.parse(read("package.json")), "0.0.0", "thinkly",
  ));
  check("打包后显示 thinkly 且保留辅助进程的内部名称", config.mac.extendInfo.CFBundleDisplayName === "thinkly" && config.productName === "Thinkly" && !config.mac.extendInfo.CFBundleName);
  const keywords = config.mac.extendInfo.MDItemKeywords.split(",").map((word: string) => word.trim());
  check("系统搜索关键词包含中英文名称", keywords.includes("thinkly") && keywords.includes("思绪"));
  check("Windows 快捷方式和卸载名称一致", config.nsis.shortcutName === "thinkly" && config.nsis.uninstallDisplayName === "thinkly");
  const entry = config.linux.desktop.entry;
  check("Linux 中英文显示一致且保留中文搜索词", entry.Name === "thinkly" && entry["Name[zh_CN]"] === "thinkly" && entry.Keywords.split(";").includes("思绪"));
  const messages = parse(read("src/i18n/common.yaml"));
  check("应用内中英文名称一致", messages["zh-Hans"].productName === "thinkly" && messages.en.productName === "thinkly");
  return checker.failed;
}
