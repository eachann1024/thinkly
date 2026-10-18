import { existsSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { app } from "electron";

const NEXT_NAME = "Thinkly";
const PREVIOUS_NAME = "Goose Note";

function moveIfMissing(from: string, to: string): void {
  if (existsSync(to) || !existsSync(from)) return;
  try { renameSync(from, to); } catch { /* 目录被占用时继续用旧位置，避免笔记丢失。 */ }
}

/** 把「Goose Note」数据目录改名为 Thinkly。失败时仍指向已有目录。 */
export function pinUserDataDirectory(): string {
  // 性能测量（scripts/perf/startup.mjs）用独立配置目录启动，避免与正在运行
  // 的正式实例抢单实例锁，也不往用户真实数据里写窗口布局。不设变量时行为不变。
  const overridden = process.env.GOOSE_PERF_USERDATA;
  if (overridden) {
    mkdirSync(overridden, { recursive: true });
    app.setPath("userData", overridden);
    return overridden;
  }
  const next = path.join(app.getPath("appData"), NEXT_NAME);
  const previous = path.join(app.getPath("appData"), PREVIOUS_NAME);
  moveIfMissing(previous, next);
  if (process.platform === "darwin") {
    const logs = path.join(app.getPath("home"), "Library", "Logs");
    moveIfMissing(path.join(logs, PREVIOUS_NAME), path.join(logs, NEXT_NAME));
  }
  const chosen = existsSync(next) ? next : previous;
  mkdirSync(chosen, { recursive: true });
  app.setPath("userData", chosen);
  return chosen;
}
