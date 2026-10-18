import { readFileSync } from "node:fs";
import path from "node:path";
import { createChecker } from "./lib/check";
import {
  developerGitPath,
  gitLookupCandidates,
  gitVersionAcceptable,
  inferGitModuleEnabled,
} from "../../src/lib/git-module";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

/** Git 大模块：三端候选路径、macOS 安装框、旧仓库默认开启、读不到就不显示。 */
export default async function run(): Promise<number> {
  const checker = createChecker();
  const { check } = checker;

  console.log("· 版本输出");
  check("标准版本", gitVersionAcceptable("git version 2.39.2\n"));
  check("Apple Git 后缀", gitVersionAcceptable("git version 2.39.2 (Apple Git-143)"));
  check("前一行提示仍可识别", gitVersionAcceptable("hint\ngit version 2.1.0"));
  check("安装提示不是 Git", !gitVersionAcceptable("xcode-select: note: install requested for command line developer tools"));
  check("空输出", !gitVersionAcceptable(""));
  check("夹在句中的版本号不算", !gitVersionAcceptable("<html>git version 2.0</html>"));

  console.log("· 模块开关");
  check("已有仓库且未写过开关时保持开启", inferGitModuleEnabled({ configs: [] }, 2));
  check("没有仓库时默认关闭", !inferGitModuleEnabled({}, 0));
  check("显式关闭盖过已有仓库", !inferGitModuleEnabled({ moduleEnabled: false }, 3));
  check("显式开启允许还没有仓库", inferGitModuleEnabled({ moduleEnabled: true }, 0));
  check("非法开关按仓库数量回退", inferGitModuleEnabled({ moduleEnabled: "yes" }, 1) && !inferGitModuleEnabled({ moduleEnabled: 1 }, 0));
  check("空配置按仓库数量", !inferGitModuleEnabled(null, 0) && inferGitModuleEnabled([], 1));

  console.log("· macOS");
  const mac = gitLookupCandidates({
    platform: "darwin",
    pathEnv: "/usr/bin:/opt/homebrew/bin:/usr/bin/../bin:.",
    home: "/Users/me",
    developerDir: "/Library/Developer/CommandLineTools/",
  });
  check("不返回会弹出安装框的 /usr/bin/git", !mac.includes("/usr/bin/git"));
  check("保留 Homebrew", mac.includes("/opt/homebrew/bin/git"));
  check("命令行工具目录指向真实 git", mac.includes("/Library/Developer/CommandLineTools/usr/bin/git"));
  check("用户目录", mac.includes("/Users/me/bin/git"));
  check("候选没有 .. 段", mac.every((file) => !file.split("/").includes("..")));
  check("相对 PATH 被丢掉", mac.every((file) => file.startsWith("/")));
  const escaped = gitLookupCandidates({
    platform: "darwin",
    pathEnv: "/usr/bin",
    home: "/Users/me/../me",
    developerDir: "/Library/Developer/CommandLineTools/../../usr",
  });
  check("含 .. 的家目录和开发者目录不采用", escaped.every((file) => file !== "/usr/bin/git") && !escaped.some((file) => file.includes("..")));
  check("根目录开发者路径被拒绝", developerGitPath("/") === null && developerGitPath("/usr/bin/git") !== "/usr/bin/git");
  check("尾部斜杠的命令行工具路径", developerGitPath("/Library/Developer/CommandLineTools/") === "/Library/Developer/CommandLineTools/usr/bin/git");

  console.log("· Windows");
  const windows = gitLookupCandidates({
    platform: "win32",
    pathEnv: "C:\\Program Files\\Git\\cmd;.;relative\\git",
    programFiles: "C:\\Program Files",
    programFilesX86: "C:\\Program Files (x86)",
    localAppData: "C:\\Users\\me\\AppData\\Local",
    home: "C:\\Users\\me",
  });
  const programGit = "C:\\Program Files\\Git\\cmd\\git.exe";
  check("PATH 与 Program Files 都落到 git.exe", windows.includes(programGit) && windows.includes("C:\\Program Files\\Git\\bin\\git.exe"));
  check("同一 git.exe 只出现一次", windows.filter((file) => file.toLowerCase() === programGit.toLowerCase()).length === 1);
  check("32 位安装位置", windows.includes("C:\\Program Files (x86)\\Git\\cmd\\git.exe"));
  check("Scoop", windows.includes("C:\\Users\\me\\scoop\\shims\\git.exe"));
  check("不执行 git.cmd", windows.every((file) => file.toLowerCase().endsWith("git.exe")));
  check("相对路径不进入候选", !windows.some((file) => file.toLowerCase().includes("relative")) && windows.every((file) => /^[A-Za-z]:\\/.test(file)));

  console.log("· Linux");
  const linux = gitLookupCandidates({
    platform: "linux",
    pathEnv: ".:/usr/bin:/home/me/bin",
    home: "/home/me",
  });
  check("系统 git 可见", linux.includes("/usr/bin/git"));
  check("家目录 bin", linux.includes("/home/me/bin/git") && linux.includes("/home/me/.local/bin/git"));
  check("相对目录被丢掉", linux.every((file) => file.startsWith("/")));
  const longPath = Array.from({ length: 70 }, (_, index) => `/opt/git-${index}`).join(":");
  const capped = gitLookupCandidates({ platform: "linux", pathEnv: longPath });
  check("PATH 最多取 64 段", capped.includes("/opt/git-0/git") && !capped.includes("/opt/git-64/git") && capped.includes("/usr/bin/git"));
  const dirty = gitLookupCandidates({ platform: "linux", pathEnv: "/tmp/bad\0name:/usr/bin" });
  check("空字节路径被丢掉", dirty.every((file) => !file.includes("\0")) && dirty.includes("/usr/bin/git"));

  console.log("· 界面边界");
  const engine = read("electron/main/gitSyncEngine.ts");
  const sync = read("electron/main/gitSync.ts");
  const scaffold = read("src/pages/workspace/components/sidebar/settings-dialog/renderSettingsScaffold.tsx");
  const dialog = read("src/pages/workspace/components/sidebar/SettingsDialog.tsx");
  const ai = read("src/pages/workspace/components/sidebar/settings-ai/renderAIEnabledSection.tsx");
  const gitGate = read("src/pages/workspace/components/sidebar/settings/git-sync/GitModuleGate.tsx");
  check("Git 命令使用解析到的可执行文件", engine.includes("gitExecutable()") && !/execFile\(\s*["']git["']/.test(engine));
  check("未安装或模块关闭时不跑定时同步", sync.includes("if (!moduleEnabled || !gitExecutable()) return;"));
  check("读不到 Git 时不挂同步页", scaffold.includes('gitAvailability === "ready"') && dialog.includes('gitAvailability === "missing"'));
  check("AI 与 Git 共用启用页和开关行", ai.includes("ModuleActivation") && gitGate.includes("ModuleActivation") && ai.includes("ModuleEnabledRow") && gitGate.includes("ModuleEnabledRow"));

  return checker.failed;
}
