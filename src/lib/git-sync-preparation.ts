export interface GitSyncPreparationRequest {
  finished: boolean;
  addRelease: (release: () => void) => void;
}

const safeFailures = new Set([
  "同步文件夹无效", "同步文件夹重复或重叠",
  "同步笔记本未打开或路径已变化，请重新打开或关联此文件夹",
  "笔记本还有未保存的内容，请保存后再重试同步",
  "历史文件无法读取，未清除原文件", "历史文件标识不一致，未清除原文件",
  "历史迁移目标已有不同版本，双方记录已保留", "历史迁移写入失败，原文件已保留",
  "历史迁移校验失败，原文件已保留", "历史已迁移，旧副本尚未清理；下次备份将重试",
  "历史文件无法读取，已停止迁移", "历史文件格式无效，已停止迁移", "笔记历史路径无效",
  "历史路径映射无效，原历史文件已保留", "历史路径映射包含无效路径，原历史文件已保留",
]);

/** Only known application messages cross IPC; native paths and causes stay local. */
export function gitSyncPreparationFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (safeFailures.has(message)) return message;
  if (message.startsWith("无法创建历史目录：")) return "无法创建隐藏历史目录，请检查文件夹写入权限";
  if (message.startsWith("无法保存历史文件：")) return "无法保存隐藏历史记录，请检查文件夹写入权限";
  if (["无法创建隐藏历史目录，请检查文件夹写入权限", "无法保存隐藏历史记录，请检查文件夹写入权限"].includes(message)) return message;
  return "工作区未能保存全部笔记，已停止同步；请检查未保存内容后重试";
}

/** Tracks all roots in one window request; late acquisitions are released immediately. */
export class GitSyncPreparation {
  private requests = new Map<string, { request: GitSyncPreparationRequest; release: () => void }>();
  private finished = new Set<string>();

  finish(id: string) {
    this.finished.add(id);
    this.requests.get(id)?.release();
    this.requests.delete(id);
    // Request IDs are UUIDs; retain a bounded set to ignore delayed duplicate messages.
    if (this.finished.size > 1000) this.finished.delete(this.finished.values().next().value!);
  }

  async prepare(id: string, operation: (request: GitSyncPreparationRequest) => Promise<void>): Promise<boolean> {
    if (this.finished.has(id) || this.requests.has(id)) return false;
    const releases: (() => void)[] = [];
    const request: GitSyncPreparationRequest = {
      finished: false,
      addRelease: (release) => { if (request.finished) release(); else releases.push(release); },
    };
    this.requests.set(id, { request, release: () => { request.finished = true; releases.splice(0).reverse().forEach((release) => release()); } });
    try { await operation(request); return !request.finished; }
    catch (error) { this.finish(id); throw error; }
  }
}
